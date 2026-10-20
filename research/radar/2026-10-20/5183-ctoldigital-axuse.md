# ctoldigital/axuse

- 结论：**值得一试**。建议先小范围试用：按 README 的步骤把 axuse 以 MCP 方式接入 Claude Code 或 Codex，只用于表单填写、滚动查找、批量打开 URL 这类浏览器任务，与现有做法做同任务对照。理由是安装、配置、错误处理约定和自测命令都可以直接复制，但它仅在非商业许可下免费使用，基准数据由作者自行报告且统计口径有疑点，桌面控制也只有 Windows 经过验证。
- 原文：https://github.com/ctoldigital/axuse
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T06:12:22.971Z

## 是什么

axuse 是一个零 npm 依赖（Node ≥ 22）的 MCP 服务器，把浏览器与桌面操作能力提供给 Codex、Claude Code、OpenCode、Antigravity 等任何支持 MCP 的宿主。它的核心主张是不要在截图上循环、猜坐标再点击，而应通过 CDP 采集无障碍（AX）树，默认只返回相对上次观测的差异（diff），元素用与元素身份绑定的稳定引用（如 `[ref=e7]`）来定位，输入则走 CDP `Input.dispatch*`，产生 `isTrusted` 事件。它还提供 bridge 模式（MV3 扩展加 native messaging），可以驱动你自己已登录的 Chrome/Edge。设计上它明确参考了 OpenAI Codex 的 Chrome 扩展和 ZCode harness 两套实现。

## 具体做法

1. **准备环境并自检**（前提：Node.js 22+，机器上装有 Chrome、Edge、Chromium 或 Chrome for Testing 之一）

```bash
git clone https://github.com/ctoldigital/axuse.git
cd axuse
node src/cli.js doctor        # 找到浏览器、启动、做一次快照
```

浏览器不在默认位置时设 `AXUSE_BROWSER=/path/to/chrome`。

2. **接入宿主**（前提：有对应宿主的 CLI；把 `<path>` 换成 `src/cli.js` 的绝对路径）

```bash
# Codex
codex mcp add axuse -- node /abs/path/axuse/src/cli.js mcp

# Claude Code
claude mcp add --scope user axuse -- node /abs/path/axuse/src/cli.js mcp
```

其他宿主先打印配置块再粘贴：

```bash
node src/cli.js print-config --harness opencode   # 或 agy | generic
```

按 README：Codex 可把打印出的 `[mcp_servers.axuse]` 追加到 `~/.codex/config.toml`，OpenCode 把 `mcp` 块并入 `opencode.json`，Antigravity 或任何 MCP 宿主用打印出的 `mcpServers` 块。

3. **把使用约定交给模型**（前提：宿主有 skill 或系统提示机制）

仓库根目录的 `SKILL.md` 是面向模型的使用约定，把它指向宿主的 skill 系统或系统提示。

4. **首次验证**（前提：步骤 2 已完成）

用一句自然语言任务触发：

```
Open https://example.com, find the "More information" link and tell me where it goes.
```

模型会调 `ax_open` 拿全量快照，之后每个动作只返回 diff。

5. **要登录态或真实浏览器时用 bridge**（前提：能手动在 Chrome/Edge 开发者模式 Load unpacked）

```bash
node src/cli.js setup --browser chrome --harness codex   # 注册 native host、开扩展页、打印要加载的目录和 harness 配置
node src/cli.js bridge verify
```

或分步：

```bash
axuse bridge install        # 注册 native messaging host（Chrome + Edge）
axuse bridge                # 启动 hub（也会随 MCP server 按需拉起）
```

在扩展页 Load unpacked 指向 `bridge/extension`，然后用 `ax_open { url, backend: "extension" }`。`ax_close` 只关 axuse 自己开的标签页。

6. **可选环境变量**（写进 MCP server 配置）

| 变量 | 作用 |
|---|---|
| `AXUSE_HEADLESS=1` | 无窗口启动（服务器、CI） |
| `AXUSE_BROWSER` | 浏览器可执行文件路径 |
| `AXUSE_PROFILE_DIR` | 临时浏览器 profile 目录（默认系统临时目录，退出时删除） |
| `AXUSE_BRIDGE_DIR` | bridge 本地状态目录（macOS 默认 `~/Library/Application Support/axuse`） |
| `AXUSE_ENABLE_MACOS_CUA=1` | 开启 macOS 桌面工具（仍需授予 Accessibility 与 Screen Recording） |
| `AXUSE_BRIDGE_DEBUG=1` | 追踪扩展 bridge 消息 |

7. **非 MCP 的批量抓取**（前提：有一份 URL 列表或含链接的 Markdown）

```bash
node src/cli.js open-urls sources.md --backend extension --output report.md
```

报告只含页面标题、访问状态和有界的 AX 文本摘录，不做语义编造。

8. **自测与回归**（前提：想验证环境或改代码）

```bash
node --test test/diff.test.js test/browser.test.js test/mcp.test.js test/desktop.test.js test/oopif.test.js test/bridge.test.js test/plugin.test.js
```

macOS 桌面能力需显式开启：`AXUSE_ENABLE_MACOS_CUA=1 AXUSE_TEST_MACOS_DESKTOP=1 npm test`，并在系统设置授予 Accessibility 与 Screen Recording。跳过项用 `node tools/skip-audit.mjs` 审计，缺登记即失败，CI 强制执行。

9. **把错误处理写进提示词**（可直接抄这段结构）

```json
{ "code": "REF_NOT_FOUND",
  "hint": "Refs are per-observation. Call ax_observe, then act on fresh refs.",
  "retry": "reobserve" }
```

按 `retry` 字段决定 reobserve / retry / never，`action_sent` 表示动作是否已经发出（是否需要清理副作用）。

10. **优先用省步骤的工具**（来自 README 的工具面）

- `ax_fill`：一次调用设完整个表单（文本、下拉、复选、单选、开关、自定义下拉、自动补全），可顺带点提交。
- `ax_observe {find:"text"}`：大页面只回匹配行。
- `ax_scroll {until:"text"}`：在页面或滚动面板里滚到目标文本出现。
- `ax_upload`：给文件输入设文件；点到会弹文件选择框时报出来而不是挂住。
- `ax_open_many`：有界 URL 列表顺序打开，回紧凑标题和 AX 摘录，默认关掉临时标签页。

## 对应的研究问题

**1. 能力发现**：原本容易被认为“必须人点”的网页操作可以整体交给 agent——整表填写加提交、无限/虚拟列表滚动到目标文本、批量打开 URL 并回摘录、文件上传、跨域 iframe 内操作（快照里以 `--- frame f1 (url) ---` 分段、引用为 `f1:eN`）、动作触发的 JS 对话框与新标签页汇报。

**2. 任务匹配**：浏览器任务用 AX 树 + diff，截图只留给视觉或 canvas 校验（有字节预算与质量降级、单次一张图）；桌面任务在 Windows 已验证，macOS 需 `AXUSE_ENABLE_MACOS_CUA=1` + TCC 授权，Linux 无桌面驱动（浏览器工具仍可用）；批量非交互任务用 CLI `open-urls` 而不是在会话里逐个开；宿主侧覆盖 Codex / Claude Code / OpenCode / 通用 MCP。

**3. 条件供给**：运行时——Node 22+、Chromium 系浏览器、可选 `AXUSE_BROWSER`；信息——`SKILL.md` 面向模型的使用约定、类型化错误码 + `retry` 提示、`ax_observe {find}` 控制上下文体积、`ax_element_info`；权限——macOS 的 Accessibility 与 Screen Recording、bridge 需要的 native messaging host 注册（Edge 还要求 host manifest 里有 `allowed_origins`）、商业 solver 需另装插件（`AXUSE_PLUGINS`）；反馈——diff、`action_sent`/`side_effect`、带序列游标的事件环形缓冲。

**4. 主动推进**：`ax_wait_for`、`ax_scroll {until:"text"}`、`ax_events`（序列游标 + 方法过滤）是“等状态、等事件”的推进原语；bridge hub 可随 MCP server 按需启动；批量 `open-urls` 是有界的一次性批处理。原文没有给出定时或事件触发的常驻调度方案，这一条只有原语级依据。

**5. 效果验证**：自带 `bench/suite`（16 个服务端评分任务 + 7 个更难扩展任务），指标为通过数、中位耗时、总 token、中位工具调用数，并公开方法与反作弊规则；`node --test` 多套件回归 + skip 审计可用于改配置后自检。

## 与已有做法的关系

- **Claude Code（adopt）**：README 直接给出 `claude mcp add --scope user axuse -- node <path>/src/cli.js mcp`，是清单里最可直接落地的一条接入路径。
- **OpenCode（watch）**：`print-config --harness opencode` 打印 `mcp` 块并入 `opencode.json`；原文给了路径但未给使用案例。
- **ZCode（avoid）**：axuse 把 ZCode harness 列为设计来源之一（diff-first 观测、`STALE_STATE`/`sideEffect`/`actionSent` 等错误字段），是借鉴其模式而非依赖 ZCode，不改变清单对 ZCode 的判断。
- **Cursor（watch）**：清单未给对应配置；README 只说“任何 MCP-capable host”可粘贴 `generic` 配置，未验证。
- 与截图循环式 computer use 是替代关系：README 明确以 AX 树 + diff + 稳定引用替换“拍照—猜坐标”。

## 证据与局限

- **给出的数据**：16 个服务端评分浏览器任务，同一 harness（Codex CLI）、同一模型下：axuse 28/28、Codex + Chrome 扩展 27/27、browser-use 0.13 27/27；中位每任务 17s / 26s / 56s；token 总量 4.7M / 9.8M / 8.8M；中位工具调用 5 / 7 / 12。7 任务扩展（结账流程、虚拟化网格、日期选择器、注册错误、嵌套 iframe、文件上传、本地开发应用）：axuse 7/7，Codex+Chrome 有 2 个因停下等确认而失败，browser-use 失败 1 个。
- **数据疑点**：称 16 个任务却给出 28/28、27/27、27/27 的通过数，统计口径未解释；7 任务扩展“目前只跑过一次”；全部为作者自建自评，没有第三方复现。这些只算作者主张 + 自报数据，不能当作定论。
- **作者明确承认的边界**：extension backend 没有 Target domain，OOPIF 帧只能列出、不能进入（CDP backend 可以）；不实现流量标注和反爬交接，用指纹识别自动化的站点仍可能拦；macOS 桌面控制需 opt-in 且受 TCC 保护；Linux 无桌面驱动；商业版 CAPTCHA solver 是另外计费的插件。
- **许可与维护**：PolyForm Noncommercial 1.0.0，免费仅限非商业（个人、研究、教育、慈善、公共机构），商业使用需向 CTOL Digital Solutions 单独授权；单一公司维护、47 stars，长期维护风险需自行评估。
- **适用条件**：浏览器为主、需要可信输入与稳定元素寻址的重复性网页任务；不适合以纯视觉判断（canvas、图表）为主的场景，也不适合需要绕过反爬的采集。

## 怎么试、怎么验证

**最小试用（半天内）**：
1. 一台机器 clone 并跑通 `node src/cli.js doctor`；
2. 接到 Claude Code（或 Codex）的一个会话，`SKILL.md` 指给 skill 系统；
3. 用 3–5 个手上真实的浏览任务跑一遍，覆盖一个整表填写加提交、一个滚动查找、一个多 URL 批量（`ax_open_many` 或 `open-urls`）；
4. 同一批任务用现有做法（截图式 agent 或人工）做对照。

**指标**：任务完成率、中位工具调用数、总 token、单任务耗时、失败时的错误码分布（能否靠 `retry: reobserve` 自恢复）、误点击或误提交次数、需要人工介入的次数。

**改善判据**：完成率不低于现有做法，且 token 或工具调用数明显下降（README 声称约减半，只作预期设定，不作结论）。在 macOS 上若还要试桌面控制，单独记录 TCC 授权后的失败率与坐标偏移情况（README 称桌面截图为全局显示点坐标、JPEG 已缩放到同一点尺寸以直接映射点击）。商业使用前先确认许可。
