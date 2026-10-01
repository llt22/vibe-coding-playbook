# colbymchenry/codegraph

- 结论：**值得一试**。可以在一到两个真实代码仓库上小范围试装 CodeGraph，用同一个架构问题做「装/不装」对照来验证它是否真的减少工具调用与成本；它的安装、接线、建索引三步都是可照抄的命令，但效果数据全部来自作者自测，且作者自己承认多轮会话的上下文占用反而更高，所以先试不直接采用。
- 原文：https://github.com/colbymchenry/codegraph
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T17:27:46.785Z

## 是什么

CodeGraph 是一个本地运行的代码知识图谱工具（MIT，npm 包 `@colbymchenry/codegraph`）。它用 Rust 内核解析 20 门语言，把符号、调用边、依赖关系和框架路由预先索引进本地 SQLite，再通过 MCP server 暴露给编码代理（Claude Code、Cursor、Codex CLI、opencode、Hermes Agent、Gemini CLI、Antigravity、Kiro、GitHub Copilot）。

它针对的问题是代理理解代码时的「慢发现」：原本靠 grep / glob / Read 一个文件一个文件地重建调用链和依赖，现在改成一次 `codegraph_explore` 调用拿回相关源码、符号间调用路径（含 grep 跟不了的动态分发跳转）以及改动的波及范围。README 称索引 100% 本地、无 API key、无外部服务，只有本地 SQLite。

## 具体做法

前提：需要一个待索引的项目仓库；CLI 自带运行时，**不需要预装 Node.js**；接入代理后 CodeGraph 仅本地运行，代码不出机器。

1. 安装 CLI（macOS / Linux）：

```bash
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
```

   Windows（PowerShell）：

```powershell
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
```

   已经装了 Node 的话可以改用 npm（任意版本可用）：

```bash
npm i -g @colbymchenry/codegraph
```

   注意：安装器把 `codegraph` 放进 PATH 但**不会修改当前 shell**，必须新开一个终端再执行后续命令。

2. 把 CodeGraph 接进你用的代理——**新终端**里运行：

```bash
codegraph install
```

   它会自动检测并配置 Claude Code、Cursor、Codex CLI、opencode、Hermes Agent、Gemini CLI、Antigravity IDE、Kiro、GitHub Copilot（VS Code / Copilot CLI / JetBrains），把 CodeGraph 的 MCP server 写进每个代理。快捷方式：

```bash
npx @colbymchenry/codegraph
```

   这一步只做「接线」，**不建索引**；索引是下一步每项目单独做的。

3. 逐个项目初始化（前提：已 `cd` 到项目根目录）：

```bash
cd your-project
codegraph init
```

   这一步创建本地 `.codegraph/` 目录并同一次完成整图谱构建。

4. 之后不需要手动同步。自动同步默认开启：文件 watcher 监听项目的每次文件变更并更新图谱。三层机制：
   - 原生 watcher（FSEvents / inotify / ReadDirectoryChangesW）+ 防抖，默认 `2000ms`，可用环境变量 `CODEGRAPH_WATCH_DEBOUNCE_MS` 调整，范围被限制在 `[100ms, 60s]`，连续编辑会合并成一次同步；
   - 防抖窗口内若 MCP 响应引用了尚未同步的文件，会在响应前面加 `⚠️` 横幅并让代理直接 `Read` 该文件（未被引用的待同步文件以小字脚注形式出现）；
   - MCP server 重连时，先用 `(size, mtime)` + 内容哈希和工作区对账，再回答第一个查询，把服务没运行时发生的改动（`git pull`、别的编辑器改的、上一个会话退出后的改动）吸收进来。

5. 随时核对索引状态：

```bash
codegraph status
```

   如果有待同步内容，会看到 `### Pending sync:` 小节，列出文件名和编辑时间。

6. 只有这几种情况才需要手动同步——watcher 被禁用（沙箱环境，或设了 `CODEGRAPH_NO_DAEMON=1`），或者你在代理会话之外写脚本、想在脚本开头做一次预检：

```bash
codegraph sync
```

7. 升级与回退：

```bash
codegraph upgrade            # 自动识别安装方式并就地升级
codegraph upgrade --check    # 只看有没有新版本
codegraph upgrade <version>  # 固定到某个版本
```

8. 卸载：

```bash
codegraph uninstall          # 从所有已配置代理移除，并卸载 CLI
codegraph uninit             # 逐项目删除索引（.codegraph/）
```

   可选参数：`--keep-cli` 只删代理配置保留 CLI；`--target` 只从指定代理移除；`--yes` 非交互执行。卸载会先展示将要删除的内容。

9. 一条影响成败的使用要点（README 明确写出）：CodeGraph **只有在被直接查询时才有收益**，它的指令会引导代理直接回答，而不是把探索任务委派给会读文件的子代理；否则子代理照样读文件，CodeGraph 就变成纯开销。

补充：README 的目录里还列了 CLI Reference、MCP Tools、Library Usage、Configuration 等章节，但输入中这些章节的正文被截断，能确认的只有 `codegraph_explore` 这个 MCP 工具和 `codegraph serve --mcp`（代理启动 MCP server 的方式）。具体配置项和库调用方式无法从现有材料照抄。

## 对应的研究问题

1. **能力发现**：把「读懂一个大仓库」从人工/代理逐文件摸索，变成一次查询——可用来做跨文件架构问答（如「扩展宿主怎么和主进程通信」）、符号的影响面分析（改之前先看调用者和被调用者）、框架路由到 handler 的追溯、以及静态 grep 跟不上的调用链（动态分发）。README 还提到框架感知路由（17 个框架）和 React Native / Expo / Swift-ObjC 的跨语言桥接流。

2. **任务匹配**：适合「代码理解 + 改动前评估」类任务，尤其是大仓库、多语言、代理原本要花 20–40 次工具调用才能找到入口的问题。反过来说，README 的对照数据显示：当问题本身很窄、无图谱臂只用 7 次工具调用就能答出时，成本收益接近持平（Gin、Django），所以并非所有任务都值得上图谱。协作方式上有一条硬性要求：必须让代理直接查询图谱，而不是派子代理去读文件。

3. **条件供给**：需要提供的是「预索引好的代码结构 + 一个本地 MCP server」。具体动作：装 CLI → `codegraph install` 写入各代理的 MCP 配置 → 每个项目 `codegraph init`。不需要 API key、不需要外部服务、不需要联网。同时提供索引新鲜度反馈：自动 watcher、`⚠️` 待同步横幅、`codegraph status` 的 pending 列表、连接时对账。

4. **主动推进**：属于「事件触发 + 状态触发」的持续机制。事件：文件创建/修改/删除触发防抖重索引（作者称单独一次保存后 300ms 触发、约 0.3s 完成，27k 文件的 Swift 编译器仓库约 0.4s）。状态：MCP 重连时做一次对账补齐离线期间的改动；回答前若发现引用的是待同步文件，主动提示代理去读原文件而不是给出可能过期的答案。README 也说明哪些情况这套机制不生效（watcher 被禁用），那时需要脚本开头手动 `codegraph sync`。

5. **效果验证**：README 给出了一套可以直接照搬的对照方法学——同一仓库、同一问题、同一模型，WITH（启用 CodeGraph MCP）vs WITHOUT（空 MCP 配置），每臂跑 4 次取中位数，并且**在两臂都屏蔽 `codegraph` CLI**，防止对照组从 PATH 上找到 CLI 绕过 MCP 导致污染。可观测指标：工具调用数、wall-clock 时间、处理的 token 数、`total_cost_usd`、文件读取数。它还额外报告了一个反向指标：会话结束时的残留检索上下文占用（详见下节）。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）**：README 的支持列表第一位，`codegraph install` 会自动配置它的 MCP server；benchmark 本身就是用 Claude Code headless 跑的。属于对现有 adopt 工具的增强型上下文供给。
- **Cursor（watch）**：在自动配置列表内，`codegraph install` 会一并接线；README 未给出 Cursor 专属的验证数据。
- **GitHub Copilot（drop）**：README 声称支持 VS Code、Copilot CLI、JetBrains 中的 Copilot 并会自动配置。这与清单中已 drop 的状态不一致，但仅凭 README 的一句宣称不足以改变既有判断，只能作为后续复核的线索。
- **Hermes（watch）／OpenCode（watch）**：都在自动配置列表内，属于这两个 watch 条目的一个可试配件。
- 除此之外，清单中没有「预索引代码知识图谱 / 上下文供给」这一类的做法条目，CodeGraph 可以视为该类做法的一个具体候选。

## 证据与局限

**给出的数据**：README 报告了 7 个真实开源仓库、7 种语言的对照测试（VS Code / Excalidraw / Django / Tokio / OkHttp / Gin / Alamofire），口径为每臂 4 次取中位数，模型标注为 `claude-opus-4-8`，复测日期标注 2026-08-05。汇总数字：工具调用减少 88%、快 53%、token 少 62%、成本低 44%，七个仓库的文件读取都降到 0。逐仓库数据在 README 的表格里（例如 Excalidraw 2 vs 43 次工具调用、45s vs 2m42s、token 少 84%、便宜 78%；Django 只便宜 13%、Gin 成本基本持平）。方法学部分写得比较细，包括「两臂都屏蔽 CLI、28 次 WITHOUT 运行全部被拦截、0 污染」，以及此前未屏蔽时 WITHOUT 臂在 28 次里有 26 次通过 Bash 摸到 CLI 的说明。索引性能方面给出：Swift 编译器仓库 27k 文件约 100 秒全量索引、单文件改动约 4 秒重同步；2 核 6GB VPS 上 Linux 内核（70k 文件、200 万符号、640 万关系）12 分钟内索引完成。

**只是作者主张、未独立核实的部分**：上述所有性能与成本数字均出自仓库作者自测，输入中没有第三方复现；复测日期（2026-08-05）和使用的模型版本也是 README 标注，无法据现有材料核对。Rust 内核「图谱与参考引擎逐字节一致」「比最快的竞品索引器快 2–7 倍」等说法同样只有作者陈述。整个 README 还带有明显的产品推广成分（CodeGraph 托管平台 waitlist、X 账号引流）。

**作者自己披露的反向事实（很重要）**：CodeGraph 降低的是「吞吐」——处理掉的 token、用掉的工具和钱；但在上下文占用这一轴上它更贵。同一批 7 个仓库的多轮会话里，CodeGraph 在会话结束时留下的检索上下文比读文件式代理多约 80%，VS Code 上是 67k token 对 18k token。机制是它一次返回一大块密集的原文，答完还留在窗口里；而 grep-read 代理是一堆小结果陆续被换出。README 明确建议：在窗口不大的环境里跑长会话要为此留预算。

**适用范围与前提**：只对「代码理解 / 改动前评估」类任务；只有在代理被引导直接查询图谱时才有收益，委派给读文件的子代理就失效；watcher 在沙箱或设了 `CODEGRAPH_NO_DAEMON=1` 时不可用，需要手动同步；README 的 CLI Reference、Configuration、MCP Tools、Library Usage 正文在输入中被截断，因此本报告无法给出更细的配置项与提示词。

## 怎么试、怎么验证

**最小试用（建议半天内完成）**

1. 选一个中等规模、你自己熟悉的仓库（几百到几千文件，最好跨语言或多模块），并挑一个你已知正确答案的架构问题，例如「某模块的请求是怎么经过中间件链路的」。
2. 按上面步骤 1–3 装好并 `codegraph init`，用 `codegraph status` 确认索引完成、无 pending。
3. 只在一个代理上接线（用 `codegraph install --target` 或交互选择），别一次接满所有代理，便于回退。
4. 做 A/B：同一问题、同一模型，WITH（CodeGraph MCP 开启）与 WITHOUT（空 MCP 配置）各跑 3–5 次，取中位数。若条件允许，最好按 README 的做法在两组都屏蔽 `codegraph` CLI，防止对照组绕过 MCP 直接调 CLI 污染结果。
5. 长会话另做一次：连续问 5–10 个问题，会话结束时记录上下文占用，观察是否出现 README 提到的残留上下文放大。

**看哪些指标判断有没有改善**

- 工具调用次数、文件读取次数：目标是把 discovery 类调用压下来；对照 README，理想情况是文件读取趋近 0。
- 单个问题的 wall-clock 时间、处理 token 数、总成本（Claude Code 的 `total_cost_usd`）。
- 答案正确性：这是最不能省的一项，用你预先知道的标准答案人工判分；成本降了但答错等于没改善。
- 会话结束时残留的上下文占用：如果这个数字明显升高而你的窗口不大，就要限制会话轮数或把 CodeGraph 只用在短问答上。
- 索引新鲜度：改一个文件后立刻查该符号，看是否命中新内容；若出现 `⚠️` 待同步提示，说明防抖机制在按预期工作而不是静默给旧答案。`codegraph status` 里不应长期堆积 pending 文件。

**什么情况应该放弃**：问题面很窄（对照臂几次工具调用就能答）、仓库很小、或团队主要跑长会话且窗口紧张时，投入产出可能不成立。回退很简单：`codegraph uninstall --keep-cli` 或 `codegraph uninit`。
