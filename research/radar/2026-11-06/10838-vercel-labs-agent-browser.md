# vercel-labs/agent-browser

- 结论：**值得一试**。照着 README 的 quick start 五步（open → snapshot -i → 对 ref 执行动作 → get/is 复查 → close）挑一个真实浏览器任务小范围试，并把 `agent-browser skills get core` 或对应的 AGENTS.md 指令装进 agent；理由是原文给出了可直接复制的安装命令、命令循环、失败语义和给 agent 的指令文本，但除 star 数外没有任何效果数据，且属 Vercel Labs 实验产品。
- 原文：https://github.com/vercel-labs/agent-browser
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T06:45:39.920Z

## 是什么

agent-browser 是一个用 Rust 写的原生 CLI，给 AI agent 一个“一次一条命令”驱动的浏览器。核心机制是 `snapshot`：把当前页面转成紧凑文本，每个可交互元素带一个 ref（如 `@e1`），agent 对 ref 执行动作，再重新读页面确认结果，如此循环。

实现上，每条命令发给首次调用时启动的后台 daemon，daemon 通过 Chrome DevTools Protocol 控制浏览器；浏览器在命令之间保持打开，所以每一步只是一次很短的 shell 调用。默认浏览器是 Chrome for Testing，也可以 `--cdp` / `--auto-connect` 挂到已运行的 Chrome，用 `--engine` 换 Lightpanda / Obscura 引擎，驱动 iOS 模拟器里的 Mobile Safari，或接 Browserbase / Browserless / Browser Use / Kernel / AgentCore 等云浏览器。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. 安装（前提：本机有 Node/npm 环境；首次需要联网下载浏览器）

```bash
npm install -g agent-browser
agent-browser install           # download Chrome for Testing (first time only)
```

替代路径：Homebrew 用 `brew install agent-browser` 后再 `agent-browser install`；Linux 用 `agent-browser install --with-deps` 一并装系统库；不想装可用 `npx agent-browser open example.com`。

2. 跑通核心循环（前提：执行者——人或 agent——有 shell 命令权限）

```bash
agent-browser open example.com
agent-browser snapshot -i       # interactive elements, each with a ref
agent-browser click @e1         # act on a ref from that snapshot
agent-browser get url           # check the result
agent-browser close
```

配套的三条硬规则，要写进给 agent 的指令里：

- ref 只描述快照那一刻的页面，导航或 DOM 变化后必须重新 `snapshot` 再用 ref。
- 除 ref 外也支持 CSS selector、文本、XPath 和语义定位器，例如 `agent-browser find role button click --name "Submit"`。
- 目标隐藏、禁用、在视口外、或被 cookie 横幅之类的元素遮挡时，click 会失败报错而不是谎报成功；处理办法是关掉遮挡元素、重新 snapshot、再重试。

3. 给 agent 装载与已安装 CLI 版本匹配的 skill（前提：agent harness 支持 skill 机制，或你能改它的 AGENTS.md）

```bash
agent-browser skills get core                 # the core loop, refs, waiting, and common workflows
agent-browser skills get core --ref commands  # one reference, such as the full command list
agent-browser skills get core --full          # adds the full command reference and templates
agent-browser skills list                     # specialized skills: electron, slack, dogfood, and more
```

把 discovery skill 装进 agent harness：

```bash
npx skills add vercel-labs/agent-browser
```

或在 `AGENTS.md` 里加：

```markdown
Use `agent-browser` for browser automation. Before the first use, run
`agent-browser skills get core` and follow it.
```

原文说明：装进去的 skill 只是一个薄壳，让 agent 去加载 `agent-browser skills get core`，因此指令始终与已安装的 CLI 版本对齐。

4. MCP 客户端接入（前提：客户端支持 stdio MCP）

```bash
agent-browser mcp
```

5. 会话隔离与生命周期（前提：需要多任务并发或需要保留登录态）

每个 `--session` 有自己的 daemon 和浏览器。默认情况下，daemon 在 1 小时无命令后关闭 headless 浏览器并退出；配置了 session persistence 时会先保存状态。

6. 从源码构建（可选，前提：Node.js 24+、pnpm 11+、Rust）

```bash
pnpm install
pnpm build:source               # builds the dashboard and the native CLI
pnpm link --global
agent-browser install
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：把“打开网页、读页面结构、点击/填表/按键/悬停/选择/勾选/滚动/拖拽/上传、截图/导出 PDF/录制/下载/页面 diff、读写 cookie/storage/网络状态、管标签页与 iframe 与弹窗”这一类原本由人做的浏览器操作交给 agent。关键设计是页面以 accessibility tree 的紧凑文本形式喂给模型，而不是整页 HTML。
- **任务匹配**：适合“一步一命令、每步后复查”的短循环任务；对已经有 shell 权限的 agent，CLI 形态比专用 SDK 更省接入成本；MCP 客户端走 `agent-browser mcp`；需要固定步骤复用的场景走 skills。
- **条件供给**：需要给出四类条件——shell 执行权限；首次安装浏览器（`agent-browser install`，Linux 还要 `--with-deps`）；给 agent 的 skill 或 AGENTS.md 指令，让它知道先 `skills get core`；以及按 `--session` 隔离的浏览器实例与登录态（`state`/`auth`/`profiles`/`confirm`/`deny` 等命令）。原文把 auth vault、domain allowlists、action policies、content boundaries 列在 Security 文档里，但 README 没有给出具体配置内容。
- **主动推进**：daemon 后台常驻、浏览器跨命令保持打开、会话可持久化，所以“同一会话内连续多步、无需每次重启浏览器”是被支持的。README 没有提到时间/事件/状态触发的调度能力，超时后默认 1 小时关闭，长任务要注意。
- **效果验证**：可用 `get` / `is` / 重新 `snapshot` 复查结果；点击无效会失败报错而非假成功，这本身就是一种内建校验；诊断有 `console`、`errors`、`trace`、`profiler`、`vitals`、`a11y`、`diff`、`screenshot`。但原文没有给出任何成功率、耗时或对照数据。

## 与已有做法的关系（对照给出的清单条目）

- **Vercel Sandbox（watch）**：README 指向 agent-browser.dev/next 的“Next.js and Vercel”文档，说明可以在 Vercel Sandbox 里运行 agent-browser。两者是互补关系：Sandbox 提供隔离执行环境，agent-browser 提供浏览器操作能力。
- **skills.sh（try）**：README 直接给出 `npx skills add vercel-labs/agent-browser`，把 discovery skill 装进 agent harness，并且这个 skill 是薄壳、运行时才去拉 `skills get core`，从而保证 agent 的指令与已安装 CLI 版本一致。这是一个“技能随工具版本同步”的可照做样板，可以直接搬进手册的“条件供给”部分。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- 给出的可执行事实：安装命令、quick start 五步、`example.com` 的快照输出样例（`- link "Learn more" [ref=e1]`）、点击失败会报错的行为约定、skills / MCP / 源码构建命令、平台支持（macOS ARM64/x64、Linux ARM64/x64 glibc 与 musl、Windows x64）、Apache-2.0 许可。
- 数据方面只有关注度指标：46,053 stars、当日 +150；README 有 npm 月下载徽章但文本中没给具体数值。这些都不是效果证据。
- 属于作者主张、没有数据支撑的部分：“快照紧凑因而更适合 agent”“daemon + 每条命令一次短调用更好用”，没有基准测试、任务成功率或对照实验。
- 适用条件：需要 shell 执行权限；默认 headless Chrome，且 1 小时无命令后 daemon 关浏览器退出，长时任务或需要保活的任务要显式处理会话持久化；Vercel Labs 产品，实验性质，接口可能变。
- 安全相关内容（auth vault、域名允许列表、动作策略、内容边界）README 只给了链接，具体字段与默认值无法从本次材料中提炼，手册里若要用必须另读 agent-browser.dev/security。
- 本次材料只有 README，安装细节、配置项、环境变量、`agent-browser.json` 都在官网文档里，未纳入判断。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用：选一个高频、步骤固定的浏览器任务（例如每周从某站点取几个固定数字，或反复填写同一张内部表单）。装完 CLI 后按 quick start 五步手工跑一遍确认可用，再把那段 AGENTS.md 指令加进 agent，让它自己按“snapshot → 动作 → 复查”跑同一任务 5～10 次。

判断指标：

- 任务成功率：首次即成功的比例，以及需要人工接管的次数。
- 输入成本：同一页面下 `snapshot -i` 的文本体积 vs 直接取整页 HTML 的体积，以及每次任务的总命令数/token 数。
- 完成耗时：含失败重试的端到端时间。
- 假成功次数：是否存在“点了但页面没变”却报成功的实例（README 声称不会，正好实测）。
- 可诊断性：失败时能否只靠 `console` / `errors` / `screenshot` 定位原因。

对照方式：同任务用现有做法（人工操作、一次性 Playwright 脚本、或其它浏览器工具）跑同样次数比较。

改善的判定：成功率不低于现状且人工介入次数下降，或同等成功率下搭建与维护成本更低，才继续扩大使用；仅仅 star 多、安装顺不代表有效果。
