# 让编码 agent 在陌生代码库里少试错地定位实现

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 在陌生代码库里找实现位置时容易陷入逐文件试错；本手册给出两种可照做的上下文供给做法——jg 语义检索与 CodeGraph 本地代码图谱——并说明如何选、如何做装/不装对照。
> 先试这一步：选一个你熟悉、敏感度可控的仓库，先跑 `jg files <root>` 核查外发范围，或直接 `codegraph init` 建本地索引，然后拿同一个架构问题做装/不装对照并记录工具调用数、成本和上下文占用。
> 最近修订：2026-10-02

## 解决什么问题
编码 agent 在陌生代码库里定位实现位置时，常常要靠 grep/glob/Read 一个文件一个文件地重建调用链和依赖。当你知道要理解什么行为、但不知道代码在哪（认证检查在哪、数据库连接怎么建/池化/关闭、哪个测试覆盖超时重试、扩展宿主怎么和主进程通信、改动会影响哪些调用者），逐文件摸索是试错式探索。本手册合并两种把这类定位变成一次查询或检索的做法：

- 做法 A：jg（命令 `jg`）语义检索。把“描述行为”的问题发给检索，输出相关文件路径、阅读线索和逐字源码片段，stdout 一次性返回，作为 agent 的起点。检索会通过认证时选择的 provider 把符合条件的源码内容发给 Jev；输出是证据，不是答案，也不保证找全。
- 做法 B：CodeGraph 本地代码知识图谱。用 Rust 内核预索引符号、调用边、依赖关系和框架路由到本地 SQLite，通过 MCP server 暴露给编码代理；用一次 `codegraph_explore` 拿回相关源码、调用路径和改动波及范围。README 称索引 100% 本地、无 API key、无外部服务。

两者都不替代编码 agent 的实现与测试，只提供上下文和证据。

## 适用与不适用
适用：
- 跨不熟悉文件的问题；你知道要理解什么行为但不知道它在哪里。
- 大仓库、多语言、代理原本要花 20–40 次工具调用才能找到入口的问题（CodeGraph README 的定位）。
- 代码理解 + 改动前评估：架构问答、符号影响面分析、框架路由到 handler 追溯、静态 grep 跟不上的动态分发调用链。
- jg 对 Python、TypeScript/JavaScript、Go、Rust 支持声明解析，其他文本走 fallback。
- CodeGraph 用 Rust 内核解析 20 门语言，并声称支持 17 个框架路由、React Native / Expo / Swift-ObjC 跨语言桥接流。

不适用或应避免：
- 已经知道精确符号或路径时，直接读文件或用 `rg` 就够了；jg 最有价值的是“跨不熟悉文件”的问题。
- 不允许把源码发往外部 provider 的仓库：jg 会把符合条件的源码内容通过认证时选择的 provider 发给 Jev。CodeGraph 仅本地运行，代码不出机器。
- Windows：jg README 提的是 macOS 或 Linux，未提 Windows 支持。CodeGraph 提供 macOS / Linux 安装脚本和 Windows PowerShell 安装脚本。
- 没有可用 provider key 的团队：jg 的环境变量凭证不被支持，必须先跑 `jg auth`；CodeGraph 不需要 API key。
- CodeGraph 只有在被直接查询时才有收益；如果代理把探索任务委派给会读文件的子代理，CodeGraph 会变成纯开销。
- CodeGraph 在上下文占用这一轴上更贵：同一批 7 个仓库的多轮会话里，会话结束时残留检索上下文比读文件式代理多约 80%，VS Code 上是 67k token 对 18k token。窗口不大的环境跑长会话要为此留预算。
- 样本都小且来自作者自测，不能直接外推到你的仓库和语言。

## 前置条件
公共：
- 一个真实仓库，最好是你熟悉、敏感度可控、中等规模。
- 一组“知道要理解什么行为、但不知道代码在哪”的真实问题，准备做装/不装对照。
- 同一模型、同一任务描述，愿意重复跑 3–5 次取中位数，而不是拿单次结果下结论。

做法 A（jg）：
- Node.js 22+；macOS 或 Linux（未提 Windows 支持）。
- 下列之一的 key：Vercel AI Gateway、TypeSafe、OpenRouter、OpenCode Zen，或自定义的 TypeSafe 兼容 endpoint。使用 `jg` 不需要另外装 Python、Bun 或 ripgrep。
- 选一个你愿意发送给 provider 的搜索根。默认文件系统过滤会尊重 ignore 文件并排除隐藏、依赖/构建、二进制和明显的凭证文件，但 README 明确这些过滤不保证所有敏感信息都已被移除。
- 凭证必须通过 `jg auth` 保存；搜索总是使用已保存的 provider；基于环境变量的凭证和 endpoint 覆盖不会被使用。
- `jg skill` 委托给 skills CLI，需要 npm/npx 和网络访问；skill 安装器本身不配置凭证。
- provider 选择功能需要 0.3.0 或更新版本；0.1.0 的 `jg skill` 只打印内置 skill 文本，那个版本要用 `npx skills`。

做法 B（CodeGraph）：
- 一个待索引的项目仓库；CLI 自带运行时，不需要预装 Node.js。
- 接入代理后 CodeGraph 仅本地运行，代码不出机器；无 API key、无外部服务，只有本地 SQLite。
- 安装器把 `codegraph` 放进 PATH 但不会修改当前 shell，必须新开一个终端再执行后续命令。
- 支持自动检测并配置 Claude Code、Cursor、Codex CLI、opencode、Hermes Agent、Gemini CLI、Antigravity IDE、Kiro、GitHub Copilot（VS Code / Copilot CLI / JetBrains）。
- 逐项目初始化；自动同步默认开启。如果 watcher 被禁用（沙箱环境，或设了 `CODEGRAPH_NO_DAEMON=1`），需要手动同步。
- README 的 CLI Reference、Configuration、MCP Tools、Library Usage 正文在现有材料中被截断；能确认的 MCP 工具是 `codegraph_explore`，代理启动 MCP server 的方式是 `codegraph serve --mcp`，更细配置项和库调用方式无法从现有材料照抄。

## 操作步骤
下面把两种做法分开写。做法 A 会外发源码给 provider；做法 B 本地索引。先选一种，不要一次接满所有代理。

### 做法 A：jg 语义检索（外发 provider）
1. **前提检查。** 确认 Node.js 22+、macOS 或 Linux，并准备好所选 provider 的 key。选一个你愿意发送给 provider 的搜索根。预期：满足前置条件后才继续；不满足就不要把源码发出去。

2. **安装 CLI。**
```sh
npm install -g @dzhng/jevgrep
```
预期：全局安装 `jg` 命令。前提：Node.js 22+。

3. **认证。**
```sh
jg auth
```
预期：`jg auth` 会询问 provider，然后把 key 存进仅属主可读的配置文件。前提：你有对应 provider 的 key。
注意：重复运行 auth 会替换该配置；搜索总是使用已保存的 provider；基于环境变量的凭证和 endpoint 覆盖不会被使用，此前依赖环境变量的要重新跑 `jg auth`；没有 provider 的旧 key 仍按 Vercel key 处理。可以用 `jg doctor` 以合成输入检查配置。

4. **安装 agent skill（README 称 agent 场景下必需）。** 只装 CLI 不会让编码 agent 知道怎么用它，要在 agent 工作的项目里执行：
```sh
jg skill
```
预期：安装器会检测你的编码 agent（Claude Code、Codex、OpenCode 等）并询问安装位置。可选参数：`--global` 用户级安装，`--yes` 无人值守安装。skill 只负责说明安装、调用方式和返回上下文的含义，研究与实现决策留给调用它的 agent。
也可以直接跑上游安装器：
```sh
npx skills add dzhng/jevgrep --skill jevgrep
```
做法 A / 做法 B 怎么选：做法 A 用 `jg skill`，适合已经装了 CLI、想让安装器检测并询问安装位置；做法 B 用 `npx skills add ...`，适合不想经过 `jg skill` 委托，或处在 0.1.0 版本（该版本的 `jg skill` 只打印内置 skill 文本）。两者都不配置凭证，认证仍需第 3 步。

5. **（建议先做）确认搜索会读到哪些文件。** 这条命令不需要 provider key、不发网络请求，按顶层目录分组统计某个根下检索可能读取的文件数，接受与检索相同的过滤参数：
```sh
jg files [root]
```
预期：看清它可能读取哪些文件，确认外发范围可以接受。这是决定是否继续试的关键一步。

6. **提问检索。** 用“描述行为”而不是“报文件名”的方式提问：
```sh
jg "Where is authentication checked before a request reaches a handler?" .
jg "How are database connections created, pooled, and closed?" ./src
jg "Which tests cover retry behavior when a request times out?" .
```
前提：选一个你愿意发送给 provider 的搜索根。预期：输出顺序为摘要和紧凑文件列表 → 带行号引用的选中源码 → 声明与调用位置的细节。把这些证据交给编码 agent 作为起点，由 agent 实现与测试。

7. **按次排除路径。** 传入相对根的 gitignore 模式：
```sh
jg --exclude '**/*.test.ts' --exclude 'src/generated/' "..." .
```
预期：收窄检索范围，减少不相关文件或敏感文件被读取。

8. **升级 CLI 与 skill（两件事分开做）。** 目前没有 `jg upgrade`：
```sh
npm install -g @dzhng/jevgrep@latest
jg --version
```
预期：升级 npm 包不会覆盖你项目里的 skill 文件，要单独重跑 `jg skill` 更新 skill。缓存控制、搜索覆盖项和不完整结果行为见 `jg --help`。

9. **判断什么时候不要用它。** README 明确：已经知道精确符号或路径时，直接读文件或用 `rg` 就够了；jevgrep 最有价值的是“跨不熟悉文件”的问题。所以把第 6 步限定在“知道行为不知道位置”的问题上。

### 做法 B：CodeGraph 本地代码知识图谱
1. **安装 CLI（macOS / Linux）：**
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
注意：安装器把 `codegraph` 放进 PATH 但不会修改当前 shell，必须新开一个终端再执行后续命令。预期：`codegraph` 命令可用。

2. **把 CodeGraph 接进你用的代理——新终端里运行：**
```bash
codegraph install
```
它会自动检测并配置 Claude Code、Cursor、Codex CLI、opencode、Hermes Agent、Gemini CLI、Antigravity IDE、Kiro、GitHub Copilot（VS Code / Copilot CLI / JetBrains），把 CodeGraph 的 MCP server 写进每个代理。快捷方式：
```bash
npx @colbymchenry/codegraph
```
预期：这一步只做“接线”，不建索引；索引是下一步每项目单独做的。建议只在一个代理上接线，便于回退。

3. **逐个项目初始化（前提：已 `cd` 到项目根目录）：**
```bash
cd your-project
codegraph init
```
预期：创建本地 `.codegraph/` 目录并同一次完成整图谱构建。

4. **随时核对索引状态：**
```bash
codegraph status
```
预期：如果有待同步内容，会看到 `### Pending sync:` 小节，列出文件名和编辑时间。

5. **依赖自动同步。** 之后不需要手动同步。自动同步默认开启：文件 watcher 监听项目的每次文件变更并更新图谱。三层机制：原生 watcher（FSEvents / inotify / ReadDirectoryChangesW）+ 防抖，默认 `2000ms`，可用环境变量 `CODEGRAPH_WATCH_DEBOUNCE_MS` 调整，范围被限制在 `[100ms, 60s]`，连续编辑会合并成一次同步；防抖窗口内若 MCP 响应引用了尚未同步的文件，会在响应前面加 `⚠️` 横幅并让代理直接 `Read` 该文件；MCP server 重连时，先用 `(size, mtime)` + 内容哈希和工作区对账，再回答第一个查询，把服务没运行时发生的改动吸收进来。预期：正常编辑不需要手动同步。

6. **只有这几种情况才需要手动同步——watcher 被禁用（沙箱环境，或设了 `CODEGRAPH_NO_DAEMON=1`），或者你在代理会话之外写脚本、想在脚本开头做一次预检：**
```bash
codegraph sync
```
预期：补上自动同步没覆盖的改动。

7. **升级与回退：**
```bash
codegraph upgrade            # 自动识别安装方式并就地升级
codegraph upgrade --check    # 只看有没有新版本
codegraph upgrade <version>  # 固定到某个版本
```
预期：按需升级或固定版本。

8. **卸载：**
```bash
codegraph uninstall          # 从所有已配置代理移除，并卸载 CLI
codegraph uninit             # 逐项目删除索引（.codegraph/）
```
可选参数：`--keep-cli` 只删代理配置保留 CLI；`--target` 只从指定代理移除；`--yes` 非交互执行。卸载会先展示将要删除的内容。预期：按需清理，避免残留配置。

9. **一条影响成败的使用要点（README 明确写出）：** CodeGraph 只有在被直接查询时才有收益，它的指令会引导代理直接回答，而不是把探索任务委派给会读文件的子代理；否则子代理照样读文件，CodeGraph 就变成纯开销。README 能确认的 MCP 工具是 `codegraph_explore`；更细的配置项和提示词在现有材料中被截断，无法照抄。

### 做法 A / 做法 B 怎么选
- 代码不能出机器：选做法 B（CodeGraph）。索引 100% 本地、无 API key、无外部服务。
- 可以把符合条件的源码发往外部 provider，并且想要一次性语义检索回文件路径、阅读线索和逐字源码片段：选做法 A（jg）。
- 大仓库、多语言、调用链、框架路由、改动影响面：做法 B 的预索引图谱可能更匹配，但效果数据全部来自作者自测，且作者自己承认多轮会话的上下文占用反而更高。
- 问题很窄、无图谱臂只用 7 次工具调用就能答出：CodeGraph README 的对照数据显示成本收益接近持平（Gin、Django），不一定值得上图谱。
- Windows 且不想折腾 jg 的 macOS/Linux 限制：做法 B 提供 Windows PowerShell 安装脚本。
- 两者可以分别试，不建议一次接满所有代理。先在一个仓库、一个代理上做对照。

### 共同的最小试用
1. 选一个中等规模、你自己熟悉的仓库（几百到几千文件，最好跨语言或多模块），并挑一个你已知正确答案的架构问题，例如“某模块的请求是怎么经过中间件链路的”。
2. 做法 A：按 A 第 2–4 步安装、`jg auth`、项目内 `jg skill`；先 `jg files <root>` 核查外发范围。做法 B：按 B 第 1–3 步安装、`codegraph install`、`codegraph init`，用 `codegraph status` 确认索引完成、无 pending。
3. 挑 5–10 个“知道要理解什么行为、但不知道代码在哪”的真实问题，写成自然语言。jg 示例：`jg "Where is authentication checked before a request reaches a handler?" .`。
4. 对同一批任务做 A/B：A 组 agent 不装 skill / 空 MCP 配置，B 组装 skill / 开启 CodeGraph MCP，两组用同样的模型和同样的任务描述，各跑 3–5 次取中位数。CodeGraph README 的做法是每臂 4 次取中位数，并在两臂都屏蔽 `codegraph` CLI，防止对照组从 PATH 上找到 CLI 绕过 MCP 导致污染。
5. 长会话另做一次：连续问 5–10 个问题，会话结束时记录上下文占用，观察是否出现 CodeGraph 提到的残留上下文放大。

## 怎么判断变好了
可观察的指标：
- 工具调用数。
- wall-clock 时间。
- 处理的 token 数。
- `total_cost_usd`。
- 文件读取数。
- 任务成功率（jg README 的核心指标是 solved 题数）。
- 含检索成本的总成本，而不是只看到 agent 的 Sol-only 成本。
- 定位所需的检索步数 / 首次命中正确文件前读了多少文件。
- 需要人工指路的次数、agent 中途放弃或改方向的次数。
- 长会话结束时的残留检索上下文占用。

参考基线（都来自作者自测，未独立复核）：
- jg：十个调优过的 Python SWE-bench 任务、一个冻结的已安装包、仓库内的公开 skill 做对比。Jevgrep 与无 Jev 基线同样解决 8/10 题；Sol 成本从 $7.62 降到 $5.44，降幅 28.6%（四舍五入 ~30%），该口径包含失败尝试、不含 Jev 成本；0.4.3 的总成本重跑（含 Jev）总成本降低 25.8%，同样解决 8/10 题；0.5.0 评估保持 8/10 解决，原生 Jev 成本相比 0.4.3 那次下降约 59%，合并 Sol+Jev 成本高出 2–3%，作者接受为小折衷。
- CodeGraph：7 个真实开源仓库、7 种语言的对照测试（VS Code / Excalidraw / Django / Tokio / OkHttp / Gin / Alamofire），口径为每臂 4 次取中位数，模型标注为 `claude-opus-4-8`，复测日期标注 2026-08-05。汇总数字：工具调用减少 88%、快 53%、token 少 62%、成本低 44%，七个仓库的文件读取都降到 0。逐仓库数据在 README 的表格里（例如 Excalidraw 2 vs 43 次工具调用、45s vs 2m42s、token 少 84%、便宜 78%；Django 只便宜 13%、Gin 成本基本持平）。
- CodeGraph 反向事实：同一批 7 个仓库的多轮会话里，CodeGraph 在会话结束时留下的检索上下文比读文件式代理多约 80%，VS Code 上是 67k token 对 18k token。

试多久：最小试用半天内可完成。记录基线，并注意两篇材料都强调样本小、单次运行不足以说明等价或提速；你的样本也要多次运行，避免拿一次结果下结论。

## 常见坑
- **jg 环境变量凭证不被采用。** 搜索始终使用 `jg auth` 保存的 provider；此前依赖环境变量的要重新跑 `jg auth`；没有 provider 的旧 key 仍按 Vercel key 处理。
- **jg 只装 CLI 没装 skill。** agent 不知道该怎么用；要在 agent 工作的项目里执行 `jg skill`。
- **jg 升级 npm 包不会覆盖项目里的 skill 文件。** 要单独重跑 `jg skill` 更新 skill。
- **jg 版本坑。** provider 选择需要 0.3.0+；0.1.0 的 `jg skill` 只打印 skill 文本，那个版本要用 `npx skills`。
- **jg 隐私。** 检索会把符合条件的源码内容通过认证时选择的 provider 发给 Jev；默认过滤不保证所有敏感信息都已被移除；要用你愿意发送的搜索根，可先用 `jg files` 核查。
- **jg 平台限制。** Node.js 22+、macOS 或 Linux，未提 Windows 支持。
- **jg 已知精确符号或路径时不要用它。** 直接读或 `rg`。
- **jg 输出是证据而非答案。** 不保证找全所有相关文件；需要 agent 侧自己判断。
- **jg 没有 `jg upgrade`。** 升级 CLI 与 skill 要分两步。
- **CodeGraph 安装器不修改当前 shell。** 安装后必须新开终端再执行 `codegraph install` 等命令。
- **CodeGraph 接线不等于建索引。** `codegraph install` 只写代理 MCP 配置；每个项目还要 `codegraph init`。
- **CodeGraph 只在被直接查询时有收益。** 如果让子代理去读文件，CodeGraph 变成纯开销。
- **CodeGraph 上下文占用更贵。** 它一次返回一大块密集原文，答完还留在窗口里；多轮会话残留检索上下文比读文件式代理多约 80%。窗口不大的环境跑长会话要留预算。
- **CodeGraph 自动同步不覆盖所有环境。** watcher 被禁用（沙箱或 `CODEGRAPH_NO_DAEMON=1`）时要手动 `codegraph sync`。
- **CodeGraph 卸载会从所有已配置代理移除并卸载 CLI。** 用 `codegraph uninit` 逐项目删除索引；可选 `--keep-cli`、`--target`、`--yes`。卸载会先展示将要删除的内容。
- **CodeGraph 数据是作者自测。** 性能与成本数字没有第三方复现，README 还有产品推广成分；Rust 内核“逐字节一致”“比最快竞品快 2–7 倍”等说法只有作者陈述。
- **CodeGraph 文档截断。** CLI Reference、Configuration、MCP Tools、Library Usage 正文在现有材料中被截断；能确认的只有 `codegraph_explore` 和 `codegraph serve --mcp`，更细配置无法照抄。
- **样本小。** jg 只覆盖 10 个 Python SWE-bench 任务、一个冻结安装包和该仓库自带 skill，样本极小、单一语言、单次运行；CodeGraph 是 7 个仓库的作者自测。都不能直接外推。
- **不要一次接满所有代理。** 先在一个代理上试，便于回退和判断污染。

## 证据与来源
本篇合并两份调研报告：《dzhng/jevgrep》与《colbymchenry/codegraph》。

jg 部分：安装、认证、`jg skill`、`jg files`、提问检索、`--exclude`、升级步骤来自《dzhng/jevgrep》正文中 README 给出的可复制命令与说明。成功率与成本数据来自 README 的 self-report，未独立复核：十个调优过的 Python SWE-bench 任务、一个冻结的已安装包、仓库内的公开 skill 做对比，Jevgrep 与无 Jev 基线同样解决 8/10 题；Sol 成本从 $7.62 降到 $5.44，降幅 28.6%（四舍五入 ~30%），该口径包含失败尝试、不含 Jev 成本；0.4.3 的总成本重跑（含 Jev）总成本降低 25.8%，同样解决 8/10 题；0.5.0 评估保持 8/10 解决，原生 Jev 成本相比 0.4.3 那次下降约 59%，合并 Sol+Jev 成本高出 2–3%，作者接受为小折衷。另有独立的速度研究文件（`speed-2026-09-28.md`），衡量后续本地优化配合 Jev 原生 TypeSafe endpoint。作者自己的限定：这是单次运行观察，不构成统计等价，也不构成速度改善的证明；它衡量的是任务成功率和成本，不保证在每个仓库上都省钱；封面图的“~30% lower cost”是较旧的 Sol-only 口径，README 后面已修正为总成本 25.8%，并说明未来基准统计会包含 Jev；“Same intelligence”是营销式表述，实际含义只是这 10 题里两边都是 8/10。适用条件与风险：评测只覆盖 10 个 Python SWE-bench 任务、一个冻结安装包和该仓库自带 skill，样本极小、单一语言、单次运行，不能外推到你的仓库和语言。隐私：检索会把符合条件的源码内容通过认证时选择的 provider 发给 Jev；默认文件系统过滤会尊重 ignore 文件并排除隐藏、依赖/构建、二进制和明显的凭证文件，但 README 明确这些过滤不保证所有敏感信息都已被移除。平台限制：Node.js 22+、macOS 或 Linux。凭证限制：搜索始终使用 `jg auth` 保存的 provider；环境变量凭证和 endpoint 覆盖不被使用。版本坑：provider 选择需要 0.3.0+；0.1.0 的 `jg skill` 只打印 skill 文本。输出是证据而非答案，也不保证找全所有相关文件。可复现的方法学文件路径：README 公开了 `evals/results/relevance-threshold-2026-09-27.md`、`total-cost-2026-09-28.md`、`combined-cost-research-2026-09-28.md`、`speed-2026-09-28.md`，可据此复现或改造成自己的任务集对比。哪些只是作者主张：把“在陌生代码库里定位实现位置”从 agent 的试错式探索变成一次语义检索、能减少定位步数，是调研报告/README 的定位与主张；可复现的只有上述方法学文件与对比口径。

CodeGraph 部分：安装、接线、`codegraph init`、`codegraph status`、自动同步、手动 `codegraph sync`、`codegraph upgrade`、`codegraph uninstall`、`codegraph uninit` 命令来自《colbymchenry/codegraph》正文中 README 给出的可复制命令与说明。效果数据全部来自作者自测，未独立复核：README 报告 7 个真实开源仓库、7 种语言的对照测试（VS Code / Excalidraw / Django / Tokio / OkHttp / Gin / Alamofire），口径为每臂 4 次取中位数，模型标注为 `claude-opus-4-8`，复测日期标注 2026-08-05；汇总数字为工具调用减少 88%、快 53%、token 少 62%、成本低 44%，七个仓库的文件读取都降到 0。逐仓库数据在 README 表格里（例如 Excalidraw 2 vs 43 次工具调用、45s vs 2m42s、token 少 84%、便宜 78%；Django 只便宜 13%、Gin 成本基本持平）。方法学：同一仓库、同一问题、同一模型，WITH（启用 CodeGraph MCP）vs WITHOUT（空 MCP 配置），每臂跑 4 次取中位数，并且两臂都屏蔽 `codegraph` CLI，防止对照组从 PATH 上找到 CLI 绕过 MCP 导致污染；28 次 WITHOUT 运行全部被拦截、0 污染；此前未屏蔽时 WITHOUT 臂在 28 次里有 26 次通过 Bash 摸到 CLI。索引性能：Swift 编译器仓库 27k 文件约 100 秒全量索引、单文件改动约 4 秒重同步；2 核 6GB VPS 上 Linux 内核（70k 文件、200 万符号、640 万关系）12 分钟内索引完成。只是作者主张、未独立核实的部分：上述所有性能与成本数字均出自仓库作者自测，没有第三方复现；复测日期和模型版本是 README 标注；Rust 内核“图谱与参考引擎逐字节一致”“比最快的竞品索引器快 2–7 倍”等说法同样只有作者陈述；整个 README 还带有明显的产品推广成分（CodeGraph 托管平台 waitlist、X 账号引流）。作者自己披露的反向事实：CodeGraph 降低的是“吞吐”——处理掉的 token、用掉的工具和钱；但在上下文占用这一轴上它更贵。同一批 7 个仓库的多轮会话里，CodeGraph 在会话结束时留下的检索上下文比读文件式代理多约 80%，VS Code 上是 67k token 对 18k token。机制是它一次返回一大块密集的原文，答完还留在窗口里；而 grep-read 代理是一堆小结果陆续被换出。README 明确建议：在窗口不大的环境里跑长会话要为此留预算。适用范围与前提：只对“代码理解 / 改动前评估”类任务；只有在代理被引导直接查询图谱时才有收益，委派给读文件的子代理就失效；watcher 在沙箱或设了 `CODEGRAPH_NO_DAEMON=1` 时不可用，需要手动同步；CLI Reference、Configuration、MCP Tools、Library Usage 正文在输入中被截断，因此无法给出更细的配置项与提示词。与已有清单的关系：Claude Code（adopt）是 CodeGraph 自动配置列表第一位，属于增强型上下文供给；Cursor（watch）在自动配置列表内，README 未给出 Cursor 专属验证数据；GitHub Copilot（drop）与 README 声称支持不一致，仅凭 README 一句宣称不足以改变既有判断，只作为后续复核线索；Hermes（watch）／OpenCode（watch）都在自动配置列表内，可视为这两个 watch 条目的可试配件；清单中没有“预索引代码知识图谱 / 上下文供给”这一类的做法条目，CodeGraph 可视为该类做法的一个具体候选。

## 依据的调研

- [dzhng/jevgrep](../research/radar/2026-10-01/31-dzhng-jevgrep.md)：值得一试，在编码智能体所在的仓库里装 jevgrep CLI 与配套 skill（npm install -g @dzhng/jevgrep → jg auth → jg skill），把"知道要理解什么行为但不知道代码在哪"这类定位工作交给 jg，已知精确符号或路径时仍用直接读/rg；理由是它给出了可复制的安装、认证、排除与调用步骤，并有单次 SWE-bench 对比数据（10 题中同样解决 8 题、成本下降约 25%–29%），但证据是单次运行且会把源码发往外部 provider，所以先小范围试。
- [colbymchenry/codegraph](../research/radar/2026-10-02/78-colbymchenry-codegraph.md)：值得一试，可以在一到两个真实代码仓库上小范围试装 CodeGraph，用同一个架构问题做「装/不装」对照来验证它是否真的减少工具调用与成本；它的安装、接线、建索引三步都是可照抄的命令，但效果数据全部来自作者自测，且作者自己承认多轮会话的上下文占用反而更高，所以先试不直接采用。
