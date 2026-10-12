# 让编码 agent 在陌生代码库里按行为定位实现，而不是逐文件 grep

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 在陌生仓库里定位实现位置时只能靠 grep/glob/Read 逐文件重建调用链，本手册合并四种把这类定位变成一次语义检索或本地图谱查询的做法，并写清各自的隐私边界、成本与试法。
> 先试这一步：选一个你熟悉的中等规模仓库和 5–10 个「知道要理解什么行为、但不知道代码在哪」的真实问题，在同一模型下做装/不装对照，先只接一个工具，别一次接满所有代理。
> 最近修订：2026-10-12

## 解决什么问题
编码 agent 在陌生代码库里定位实现位置时，常常要靠 grep/glob/Read 一个文件一个文件地重建调用链和依赖。当你知道要理解什么行为、但不知道代码在哪（认证检查在哪、数据库连接怎么建/池化/关闭、哪个测试覆盖超时重试、扩展宿主怎么和主进程通信、改动会影响哪些调用者），逐文件摸索是试错式探索。本手册合并四种把这类定位变成一次查询、检索或图谱探索的做法：

- 做法 A：jg（命令 `jg`）语义检索。把“描述行为”的问题发给检索，输出相关文件路径、阅读线索和逐字源码片段，stdout 一次性返回，作为 agent 的起点。检索会通过认证时选择的 provider 把符合条件的源码内容发给 Jev；输出是证据，不是答案，也不保证找全。
- 做法 B：CodeGraph 本地代码知识图谱。用 Rust 内核预索引符号、调用边、依赖关系和框架路由到本地 SQLite，通过 MCP server 暴露给编码代理；用一次 `codegraph_explore` 拿回相关源码、调用路径和改动波及范围。README 称索引 100% 本地、无 API key、无外部服务。
- 做法 C：Understand Anything 多智能体知识图谱插件。用 Tree-sitter 做确定性结构抽取、LLM 做语义层，把整库解析成可交互知识图谱，产物落在 `.ua/knowledge-graph.json`（老项目沿用 `.understand-anything/`）。支持 Claude Code 及十余个 AI 编码平台，图谱可提交、可 git-lfs 跟踪，也可用无 LLM 的只读 viewer 打开。
- 做法 D：Pensieve 本地语义检索层。把本机文件、文件夹、git 仓库和 AI agent 会话记录（Claude Code / Codex / Qwen Code 的 transcripts）统一索引到 `~/.pensieve`，向人和 agent 提供「按语义找文件/代码片段」而不是让 agent 满盘 grep。人类侧是 macOS 搜索面板（`Control+Shift` 呼出，支持 `"精确词组"`、`-排除`、`kind:file|doc|code|session|folder|repo|person`、`by:某人`、`ext:pdf`、`in:路径` 等查询语法）；agent 侧以 MCP server 形式接入，每个连接有一个 scope（索引切片，默认是 agent 所在仓库），并附带一组「谁懂这块」「知识缺口」「未被探索区域」的工具。索引用 `Qwen3-Embedding-0.6B` 做嵌入，SQLite（trigram 全文索引做精确匹配）加 turbovec 做向量索引；文本/Markdown/Office/PDF/邮件/代码按内容索引，图片、音视频只按文件名索引且不上图。

四者都不替代编码 agent 的实现与测试，只提供上下文和证据。

## 适用与不适用
适用：
- 跨不熟悉文件的问题；你知道要理解什么行为但不知道它在哪里。
- 大仓库、多语言、代理原本要花 20–40 次工具调用才能找到入口的问题（CodeGraph README 的定位）。
- 代码理解 + 改动前评估：架构问答、符号影响面分析、框架路由到 handler 追溯、静态 grep 跟不上的动态分发调用链。
- jg 对 Python、TypeScript/JavaScript、Go、Rust 支持声明解析，其他文本走 fallback。
- CodeGraph 用 Rust 内核解析 20 门语言，并声称支持 17 个框架路由、React Native / Expo / Swift-ObjC 跨语言桥接流。
- Understand Anything 适合：需要整库结构、按架构层分组、依赖顺序导览、业务域映射、当前改动影响分析、新成员 onboarding 指南，或把 Karpathy 式 LLM wiki 解析成带社区聚类的知识图时。
- Pensieve 适合：本地（数据存 `~/.pensieve`）语义检索代码、文档、邮件和过去的 agent 会话；人和 agent 复用同一份索引；需要按 scope 限制某个 agent 能看到哪些来源；想把「谁懂这块」「知识缺口」「未被探索区域」这类团队知识查询也交给 agent 时。`pensieve integrate recommended` 能自动登记 Claude Code、Codex、Cursor、Gemini CLI、Qwen Code、Windsurf、Claude Desktop、VS Code 为 MCP server。

不适用或应避免：
- 已经知道精确符号或路径时，直接读文件或用 `rg` 就够了；jg 最有价值的是“跨不熟悉文件”的问题。
- 不允许把源码发往外部 provider 的仓库：jg 会把符合条件的源码内容通过认证时选择的 provider 发给 Jev。CodeGraph 仅本地运行，代码不出机器。Understand Anything 默认走平台自带模型，隐私或企业场景可把平台指向本地模型（原文只指向 Ollama 集成指南，未给具体配置）；其 viewer 只从本地磁盘只读服务，不调用 LLM，数据不出本机。Pensieve 把索引存在本机 `~/.pensieve`，但要先确认你愿意让默认的 `~/Documents`、`~/Desktop`、`~/Downloads` 以及 `sweep_roots`（默认 `~`、深度 4）进入索引。
- Windows：jg README 提的是 macOS 或 Linux，未提 Windows 支持。CodeGraph 提供 macOS / Linux 安装脚本和 Windows PowerShell 安装脚本。Understand Anything 也提供 Windows PowerShell 安装脚本。Pensieve 的完整功能仅限 Apple Silicon Mac，Linux / Intel Mac 只能装后端、没有搜索面板，原文未给出 Windows 支持。
- 没有可用 provider key 的团队：jg 的环境变量凭证不被支持，必须先跑 `jg auth`；CodeGraph 不需要 API key；Pensieve 不需要外部 API key，但要下载本地嵌入模型。
- CodeGraph 只有在被直接查询时才有收益；如果代理把探索任务委派给会读文件的子代理，CodeGraph 会变成纯开销。
- CodeGraph 在上下文占用这一轴上更贵：同一批 7 个仓库的多轮会话里，会话结束时残留检索上下文比读文件式代理多约 80%，VS Code 上是 67k token 对 18k token。窗口不大的环境跑长会话要为此留预算。
- Understand Anything 全库首跑会消耗大量 token；大 monorepo 应先限定子目录。原文全篇没有成功率、成本或速度效果数据，不能把“补上编码智能体缺失的代码上下文”当作已证结论。
- Pensieve 的 setup 不做完索引为空，此时 MCP 连接会额外拿到 setup 工具；首次运行还要下载约 1.2 GB 嵌入模型，搜索和 Map 随索引进度逐步可用。
- Pensieve 的 HTTP 连接看不到 agent 工作目录，必须显式指定 scope（不写 `?scope` = 全部）；在 Pensieve 未索引的仓库里，搜索会告诉 agent 改用 grep，不会把别的仓库代码返回给它。
- 样本都小且来自作者自测，不能直接外推到你的仓库和语言。Pensieve 同样只有命令、配置和 bench 脚本，没有效果数据。

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

做法 C（Understand Anything）：
- 已装 Claude Code（原生路径）或某个受支持的 CLI/IDE；有 token 预算或订阅（大项目首跑消耗显著）；需要离线/私有化时可把平台指向本地模型（原文只指向 Ollama 集成指南，未给具体配置）。
- 非 Claude Code 平台一行脚本前提：macOS / Linux，脚本会把仓库克隆到 `~/.understand-anything/repo` 并创建对应平台的符号链接；装完要重启 CLI/IDE。Windows 用 PowerShell 脚本。
- 受支持的 `<platform>` 值：`gemini`、`codex`、`opencode`、`pi`、`openclaw`、`antigravity`、`vibe`、`vscode`、`hermes`、`cline`、`kimi`、`trae`、`nanobot`、`kiro`。
- 图谱数据写入 `.ua/knowledge-graph.json`；老项目沿用 `.understand-anything/`，无需迁移。大项目先限定子目录；中文用 `--language zh`。
- viewer 前提：只要求 Node.js >= 18，不需要 Claude Code、不需要 LLM、不需要 API key；项目目录里要有已提交的数据目录（`.ua/` 或老的 `.understand-anything/`）。
- 原文明确警告：全库首跑会消耗大量 token；大 monorepo 先限定子目录。没有效果数据。

做法 D（Pensieve）：
- 完整功能（macOS 搜索面板）前提：Apple Silicon Mac；Linux / Intel Mac 上脚本会装 uv 并从源码装后端，然后启动后端并在浏览器打开 Map，没有搜索面板。
- 安装脚本不需要 git、Xcode tools 或 Python；手动安装需要 Xcode tools（`uv tool install` + `pensieve/mac/build.sh --install`）。
- 首次运行会下载嵌入模型（约 1.2 GB），随后后台索引，搜索和 Map 随索引进度逐步可用。
- 所有数据存在 `~/.pensieve`，删掉该目录即重来。索引内容默认来自 `folders` = `~/Documents`、`~/Desktop`、`~/Downloads`，扫描由 `sweep_roots` = `~`、`sweep_depth` = 4 控制；扫描发现的仓库受 `max_repo_files` = 5000 限制。
- 安全相关：看起来像密钥的文件（密码管理器应急包、keys、`.env`、凭据）永不索引，由 `exclude_files` 控制；`exclude` 是永不进入的目录名（`node_modules`、`Library` 等）。
- 需要后端已安装（`pensieve` 命令）；`pensieve mcp` 在后端未运行时会自动拉起后端。
- HTTP 连接（`http://127.0.0.1:8765/mcp`）看不到 agent 目录，必须显式指定 scope。

## 操作步骤
下面把四种做法分开写。做法 A 会外发源码给 provider；做法 B 本地索引；做法 C 默认走平台自带模型并生成可提交图谱，隐私/企业可指向本地模型（原文只指向 Ollama 集成指南，未给具体配置）；做法 D 把索引留在本机 `~/.pensieve`。先选一种，不要一次接满所有代理。

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

### 做法 C：Understand Anything 知识图谱插件
1. **安装插件（Claude Code 原生方式）：**
```bash
/plugin marketplace add Egonex-AI/Understand-Anything
/plugin install understand-anything
```
预期：插件安装到 Claude Code。前提：已装 Claude Code。

2. **非 Claude Code 平台用一行安装脚本。** 前提：macOS / Linux，脚本会把仓库克隆到 `~/.understand-anything/repo` 并创建对应平台的符号链接；装完要重启 CLI/IDE。
```bash
curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash
# or skip the prompt by passing the platform:
curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash -s codex
```
Windows（PowerShell）：
```powershell
iwr -useb https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.ps1 | iex
```
受支持的 `<platform>` 值：`gemini`、`codex`、`opencode`、`pi`、`openclaw`、`antigravity`、`vibe`、`vscode`、`hermes`、`cline`、`kimi`、`trae`、`nanobot`、`kiro`。
Copilot CLI 另走一条：
```bash
copilot plugin install Egonex-AI/Understand-Anything:understand-anything-plugin
```
Cursor 与 VS Code + GitHub Copilot（v1.108+）在该仓库被克隆后通过 `.cursor-plugin/plugin.json` / `.copilot-plugin/plugin.json` 自动发现，无需手动安装；自动发现失败时在 Cursor Settings → Plugins 里粘贴仓库地址手动添加。
Kiro：
```bash
curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash -s kiro
```
装完后 Kiro CLI 用 `kiro-cli chat --agent understand "Analyze this project"`；Kiro IDE 的 skills 会符号链接到 `~/.kiro/skills/`，`understand` agent 写到 `~/.kiro/agents/understand.json`，重启 IDE 后可用。
预期：对应平台出现 understand skill/命令。

3. **调用前缀要先确认。** 多数平台用斜杠命令 `/understand`，但 Codex 用 `$`（`$understand`）。如果平台不认任何前缀，直接说白话："Use the understand skill to analyze this project."

4. **首次分析代码库。** 前提：大项目建议在 token 套餐/订阅下跑，或先用本地模型做初始化；后续跑默认是增量的，只重分析改动文件。
```bash
/understand
```
预期：结果写入 `.ua/knowledge-graph.json`（项目里若已有 `.understand-anything/` 目录则继续用它，无需迁移）。流水线会编排 5 个智能体：`project-scanner`（发现文件、识别语言与框架）、`file-analyzer`（抽函数/类/import，产节点和边）、`architecture-analyzer`（识别架构层）、`tour-builder`（生成导览）、`graph-reviewer`（校验图完整性与引用完整性，默认内联运行，加 `--review` 走完整 LLM 审查）。file-analyzer 并行执行，最多 5 个并发 worker、每批 20–30 个文件。

5. **控制规模与语言。** 大 monorepo 先限定子目录；需要中文产物时加 `--language`：
```bash
# Scope to a subdirectory (for huge monorepos)
/understand src/frontend

# Generate Chinese content（知识图节点描述和 Dashboard UI）
/understand --language zh

# Supported languages: en (default), zh, zh-TW, ja, ko, ru
```
预期：`--language` 影响知识图节点摘要与描述、Dashboard UI 标签按钮提示、导览说明。项目首次运行且未传 `--language`、也无已存语言时，`/understand` 会检测你对话所用的语言；非英语会先请你确认或覆盖，选择存到 `.ua/config.json` 并在后续复用。

6. **开启每提交自动更新（事件触发）。**
```bash
# Auto-update on every commit via a post-commit hook
/understand --auto-update
```
预期：提交后自动增量更新。

7. **打开 Dashboard 可视化探索。**
```bash
/understand-dashboard
```
预期：打开可点选、搜索、提问的 Dashboard。

8. **按需使用其余命令：**
```bash
# Ask anything about the codebase
/understand-chat How does the payment flow work?

# Analyze impact of your current changes
/understand-diff

# Deep-dive into a specific file or function
/understand-explain src/auth/login.ts

# Generate an onboarding guide for new team members
/understand-onboard

# Extract business domain knowledge (domains, flows, steps)
/understand-domain

# Analyze a Karpathy-pattern LLM wiki knowledge base
/understand-knowledge ~/path/to/wiki
```
预期：`/understand-domain` 额外增加第 6 个智能体 `domain-analyzer`（抽业务域、流程、步骤）；`/understand-knowledge` 增加第 7 个 `article-analyzer`（从 wiki 文章抽实体、主张、隐式关系）。

9. **把图提交进仓库，让队友跳过流水线（适合 onboarding、PR review、docs-as-code）。** 提交除 `intermediate/` 和 `diff-overlay.json` 之外的 `.ua/` 全部内容（这两个是本地草稿），老项目把目录名换成 `.understand-anything/`：
```gitignore
.ua/intermediate/
.ua/diff-overlay.json
```
图谱是 10 MB+ 时用 git-lfs 跟踪：
```bash
git lfs install
git lfs track ".ua/*.json"
git add .gitattributes .ua/
```
预期：队友拿到图谱，不需要重跑流水线。

10. **让没装 Claude Code 的同事也能看图。** 前提：只要求 Node.js >= 18，不需要 Claude Code、不需要 LLM、不需要 API key；项目目录里要有已提交的数据目录（`.ua/` 或老的 `.understand-anything/`）。全程只从本地磁盘只读服务，不调用 LLM，数据不出本机。
```bash
npx https://github.com/Egonex-AI/Understand-Anything/releases/latest/download/understand-anything-viewer.tgz /path/to/analyzed/project
```
预期：终端会打印带 token 的 URL（`http://127.0.0.1:5173/?token=…`）并在浏览器打开完整交互 Dashboard。从 clone 起的等价做法：
```bash
pnpm install && pnpm --filter @understand-anything/core build
GRAPH_DIR=/path/to/analyzed/project pnpm dev:dashboard
```

11. **升级与卸载：**
```bash
# macOS / Linux
./install.sh --update
./install.sh --uninstall <platform>
```
```powershell
# Windows
& "$HOME/.understand-anything/repo/install.ps1" -Update
& "$HOME/.understand-anything/repo/install.ps1" -Uninstall <platform>
```

12. **自己改代码时：** fork 仓库 → `git checkout -b feature/my-feature` → `pnpm --filter @understand-anything/core test` → 提 PR；大改动先开 issue 讨论。

注意：原文全篇没有效果数据；全库首跑消耗大量 token；大 monorepo 先限定子目录。

### 做法 D：Pensieve 本地语义检索层
1. **安装（前提：Apple Silicon Mac 才有完整搜索面板；Linux / Intel Mac 只装后端）。**
```bash
curl -fsSL https://tedhaley.ca/pensieve/install.sh | sh
```
预期：脚本下载最新 `Pensieve.dmg` 并把 app 拷到 Applications，再用 app 内安装器装 `pensieve` 后端。脚本不需要 git、Xcode tools 或 Python。在终端里由 agent 运行这个脚本时只安装、不启动 app。
首次运行会下载嵌入模型（约 1.2 GB），随后后台索引，搜索和 Map 随索引进度逐步可用。
手动安装（需 Xcode tools）：
```bash
uv tool install git+https://github.com/TedHaley/pensieve   # 后端: `pensieve`
git clone https://github.com/TedHaley/pensieve && pensieve/mac/build.sh --install   # Mac app
```
Linux / Intel Mac 上脚本会装 uv 并从源码装后端，然后启动后端并在浏览器打开 Map。

2. **连接 agent（前提：后端已安装）。**
```bash
pensieve integrate recommended
```
预期：扫描本机的 Claude Code、Codex、Cursor、Gemini CLI、Qwen Code、Windsurf、Claude Desktop、VS Code，逐一登记为 MCP server。
只接 Claude Code 时：
```bash
claude mcp add --scope user pensieve -- pensieve mcp   # stdio；scope "auto" = agent 启动时所在仓库
claude mcp add pensieve -- pensieve mcp --scope payments
claude mcp add --transport http pensieve "http://127.0.0.1:8765/mcp?scope=payments"
```
只支持 stdio 的 agent 用 JSON 配置：
```json
{"mcpServers": {"pensieve": {"command": "pensieve", "args": ["mcp"]}}}
```
注意：`--scope user` 让 Pensieve 在所有项目可用；不加则只对运行命令时的目录生效。`pensieve mcp` 在后端未运行时会自动拉起后端。预期：对应 agent 的 MCP 配置里出现 pensieve server。

3. **完成 setup（不做完，索引为空，MCP 连接会额外拿到 setup 工具）。** App 打开后按向导走：了解功能 → 选择使用方式（软件开发 / AI coding agents / 文档办公 / 研究笔记）→ 让 Pensieve 在相应文件夹里找来源（macOS 会弹权限）→ 勾选要索引的内容、补充没找到的文件夹或仓库 → 选洞察引擎或稍后再说 → 开始索引。
终端等价操作：
```bash
pensieve setup                  # 列出发现的 agent 会话、文件夹、仓库、应用及其大小
pensieve setup recommended      # 索引被标记为 [x] 的
pensieve setup agents/claude repos//Users/me/code/app   # 或精确指定
```
预期：agent 也能在对话里完成同样的 setup，它会拿到 `setup_guide`、`setup_scan`、`setup_add_source`、`setup_start` 四个工具，按 `setup_guide` 给出的顺序提问。

4. **让 agent 真正改用搜索而不是 grep（可选 add-on，README 标为 recommended）。**
```bash
pensieve integrate                    # 查看有哪些 add-on、已装哪些
pensieve integrate recommended        # 每台机器上每个 agent 的 MCP server + instructions block；
                                      # Claude Code 还会装 pensieve-search skill 和两个 hook
pensieve integrate cursor-mcp codex   # 只装指定项
pensieve integrate pensieve-teammates pensieve-plan
pensieve integrate claude --remove    # 精确移除已装内容
```
- **instructions block**：往 `~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md`、`~/.gemini/GEMINI.md` 或 `~/.qwen/QWEN.md` 里插一段「先搜索再 grep」的说明，包在 `<!-- pensieve:start -->` 标记之间。其他 agent（Cursor、Windsurf）需手动贴进规则文件。
- **`claude-hook`**：`~/.claude/settings.json` 里的 `PostToolUse` 钩子，每次 Edit/Write 后把改动路径发给 Pensieve，使下一次搜索一定能搜到新代码（即使文件系统事件延迟）。每次编辑增加约 50 ms。
- **`claude-repo-check`**：`SessionStart` 钩子。在未索引的仓库开会话时，Claude 只问一次是否索引：是则跑 `pensieve repo index`，否则跑 `pensieve repo skip` 并在该仓库改用 grep；答案会存成 Settings → Sources 里的开关，不再重复询问。
- **`pensieve-search` skill**：查询写法、什么时候回落 grep、写新代码前找相似代码、回忆历史会话。
- **`pensieve-teammates`**：根据 git blame 建议该问谁，并替你起草问题（不会真的发消息）。
- **`pensieve-plan`**：规划新代码时列出可复用的先例、早先的尝试、要拉进来的人和知识风险。
预期：agent 的规则文件里出现 pensieve 段落；`claude-hook` 后编辑不再需要等文件系统事件。

5. **用 scope 控制 agent 能看到什么。**
- `auto`（`pensieve mcp` 默认）：用 agent 的工作目录——命中第一个包含该仓库的命名 scope，否则就限定为该仓库及其 worktree 和其中的 agent 会话；不在任何仓库内 = 全部。在 Pensieve 未索引的仓库里，搜索会告诉 agent 改用 grep，不会把别的仓库代码返回给它。HTTP 连接看不到 agent 目录，必须显式指定 scope（不写 `?scope` = 全部）。
- 命名 scope 是一组来源的列表，例如 `payments = repos/~/code/billing + repos/~/code/ledger + files/~/Documents/specs`，可在 Settings → Scopes 或 `save_scope` 工具里建。只有一个索引，scope 只做过滤，不会重复嵌入。
- search、read、similar、who_knows、list_repos、team、unexplored 全部受 scope 约束，scope 外的条目会被拒绝。
- 搜索面板和 Map 使用 `default_scope`（空 = 全部）。
预期：给不同 agent 配不同 scope，避免把别的仓库或别的来源返回给它。

6. **了解 agent 默认能调哪些工具。** 默认 11 个：`search`、`read`、`similar`、`who_knows`、`knowledge_gaps`、`list_repos`、`team`、`unexplored`、`open`、`current_scope`、`index_path`。工具描述每轮都会发给 agent，所以默认只暴露这些。需要让 agent 管理 Pensieve 自己时，用 HTTP 的 `?tools=all` 或 `pensieve mcp --all-tools`，额外获得 `show_search`、`show_visualizer`、`status`、`list_scopes`、`save_scope`、`delete_scope`、`list_sources`、`set_source`、`add_folder`、`remove_folder`、`get_settings`、`update_settings`、`reindex`。
`index_path` 允许你在对话里让 agent 索引一个文件夹（git 仓库、仓库目录、agent 会话目录或文档），Pensieve 自行判断类型。

7. **按需改关键配置（`~/.pensieve/settings.json`，或 Map → Settings，或 `update_settings`）。**

| 设置 | 默认值 |
|---|---|
| `folders` | `~/Documents`、`~/Desktop`、`~/Downloads` |
| `chunk_chars`, `max_chunks` | 1500、2000（0 = 不限） |
| `sweep_roots`, `sweep_depth` | `~`、4 |
| `max_repo_files` | 5000（只对扫描发现的仓库生效） |
| `exclude` | 永不进入的目录名（`node_modules`、`Library` 等） |
| `exclude_files` | 永不索引的文件名 glob（密钥类） |
| `scopes`, `default_scope` | agent 的命名索引切片 |
| `ai`, `builtin_model`, `agent_model` | `auto`、`mlx-community/Qwen3.5-9B-MLX-4bit`、`haiku` |
| `hotkey` | `ctrl+shift` |
| `editor` | `default`/`vscode`/`cursor`/`zed`（设为后代码结果直接跳到匹配行） |
| `llm_url`, `llm_model` | `http://localhost:1234/v1`、`qwen/qwen3.5-9b` |

预期：索引范围、向量切块、洞察引擎和编辑器跳转按你的仓库调整；密钥类文件由 `exclude_files` 控制，永不索引。

8. **用仓库自带的 bench 自测效果。**
```bash
uv run python bench/agent_search.py gen --repo ~/code/myrepo -n 40 --tasks tasks-v2.jsonl
uv run python bench/exact_tasks.py                      # 追加 name / error-string / mixed 查询
uv run python bench/agent_search.py find --repo all --tasks tasks-v2.jsonl --styles query,desc,mixed,ident,literal
uv run python bench/agent_search.py run --repo ~/code/myrepo --tasks tasks-v2.jsonl --arms grep,guided
```
预期：任务由你自己的代码生成（把一段代码用白话描述，或用它定义的名字、它里面的错误字符串、或混合方式），Claude Sonnet 无头运行，比较开/关 Pensieve 时能否答出正确的文件。

### 做法 A / 做法 B / 做法 C / 做法 D 怎么选
- 代码不能出机器：选做法 B（CodeGraph）或做法 C 的本地 viewer，或做法 D（Pensieve，索引存本机 `~/.pensieve`）；做法 C 默认走平台自带模型，隐私/企业可把平台指向 Ollama 等本地模型提供方（原文只指向 Ollama 集成指南，未给具体配置）。jg 会把符合条件的源码内容通过认证时选择的 provider 发给 Jev。
- 可以把符合条件的源码发往外部 provider，并且想要一次性语义检索回文件路径、阅读线索和逐字源码片段：选做法 A（jg）。
- 大仓库、多语言、调用链、框架路由、改动影响面：做法 B 的预索引图谱可能更匹配，但效果数据全部来自作者自测，且作者自己承认多轮会话的上下文占用反而更高；做法 C 也面向整库理解/架构导览/业务域/onboarding，且图谱 JSON 可提交共享、可用无 LLM viewer 打开，但全篇没有效果数据，首跑 token 贵。
- 想在本地用自然语言同时检索代码、文档和过去的 agent 会话，并且希望人和 agent 共用同一份索引：试做法 D。但它完整功能（搜索面板）仅 Apple Silicon Mac，Linux / Intel Mac 只有后端。
- 想给团队复用一张可点选、可提交的图谱，或需要 onboarding 导览、业务域映射、当前 diff 影响分析：试做法 C。想给编码代理在查询时提供本地调用路径和影响面：试做法 B。想用自然语言一次性检索陌生文件：试做法 A。想让人和 agent 都能按语义找文件、并顺带回答「谁懂这块」「知识缺口在哪」：试做法 D。
- 问题很窄、无图谱臂只用 7 次工具调用就能答出：CodeGraph README 的对照数据显示成本收益接近持平（Gin、Django），不一定值得上图谱。
- Windows 且不想折腾 jg 的 macOS/Linux 限制：做法 B 提供 Windows PowerShell 安装脚本；做法 C 提供 PowerShell 安装脚本。
- 三者可以分别试，不建议一次接满所有代理。先在一个仓库、一个代理上做对照。

### 共同的最小试用
1. 选一个中等规模、你自己熟悉的仓库（几百到几千文件，最好跨语言或多模块），并挑一个你已知正确答案的架构问题，例如“某模块的请求是怎么经过中间件链路的”。
2. 做法 A：按 A 第 2–4 步安装、`jg auth`、项目内 `jg skill`；先 `jg files <root>` 核查外发范围。做法 B：按 B 第 1–3 步安装、`codegraph install`、`codegraph init`，用 `codegraph status` 确认索引完成、无 pending。做法 C：按 C 第 1–4 步安装插件，先跑 `/understand src/frontend` 这类子目录范围，再用 `/understand-chat` 和 `/understand-diff` 验证上下文是否补齐。做法 D：按 D 第 1–3 步安装、`pensieve integrate recommended`、`pensieve setup recommended`，再用 `pensieve integrate recommended` 装上 instructions block 和钩子；用 `pensieve integrate` 确认已装项。
3. 挑 5–10 个“知道要理解什么行为、但不知道代码在哪”的真实问题，写成自然语言。jg 示例：`jg "Where is authentication checked before a request reaches a handler?" .`。做法 C 示例：`/understand-chat How does the payment flow work?`。做法 D 示例：直接让 agent 用 Pensieve 的 `search` 找代码片段，或让它在对话里用 `index_path` 索引新目录。
4. 对同一批任务做 A/B（或四臂）：A 组 agent 不装 skill / 空 MCP 配置，B 组装 skill / 开启 CodeGraph MCP / 装 Understand Anything / 开 Pensieve MCP，各组用同样的模型和同样的任务描述，各跑 3–5 次取中位数。CodeGraph README 的做法是每臂 4 次取中位数，并在两臂都屏蔽 `codegraph` CLI，防止对照组从 PATH 上找到 CLI 绕过 MCP 导致污染。做法 D 可直接用仓库自带 bench 的 `--arms grep,guided` 两臂。
5. 长会话另做一次：连续问 5–10 个问题，会话结束时记录上下文占用，观察是否出现 CodeGraph 提到的残留上下文放大；做法 C 由于首跑和 Dashboard 交互的 token 消耗，另记首次分析成本；做法 D 另记首次索引（含约 1.2 GB 模型下载）和每次编辑钩子带来的约 50 ms 开销。

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
- 做法 C 额外记录：首次分析 token 消耗、图谱生成/更新时间、`/understand-chat` 答案是否引用图节点、`/understand-diff` 是否列出改动波及范围、队友用 viewer 打开是否需要重跑流水线。
- 做法 D 额外记录：bench（`bench/agent_search.py run --arms grep,guided`）里能否答出正确文件的解决率、工具调用数、token 消耗；首次索引耗时与嵌入模型下载时间；agent 是否真的调用了 Pensieve 的 `search` 而不是回落 grep。

参考基线（都来自作者自测，未独立复核）：
- jg：十个调优过的 Python SWE-bench 任务、一个冻结的已安装包、仓库内的公开 skill 做对比。Jevgrep 与无 Jev 基线同样解决 8/10 题；Sol 成本从 $7.62 降到 $5.44，降幅 28.6%（四舍五入 ~30%），该口径包含失败尝试、不含 Jev 成本；0.4.3 的总成本重跑（含 Jev）总成本降低 25.8%，同样解决 8/10 题；0.5.0 评估保持 8/10 解决，原生 Jev 成本相比 0.4.3 那次下降约 59%，合并 Sol+Jev 成本高出 2–3%，作者接受为小折衷。
- CodeGraph：7 个真实开源仓库、7 种语言的对照测试（VS Code / Excalidraw / Django / Tokio / OkHttp / Gin / Alamofire），口径为每臂 4 次取中位数，模型标注为 `claude-opus-4-8`，复测日期标注 2026-08-05。汇总数字：工具调用减少 88%、快 53%、token 少 62%、成本低 44%，七个仓库的文件读取都降到 0。逐仓库数据在 README 的表格里（例如 Excalidraw 2 vs 43 次工具调用、45s vs 2m42s、token 少 84%、便宜 78%；Django 只便宜 13%、Gin 成本基本持平）。
- CodeGraph 反向事实：同一批 7 个仓库的多轮会话里，CodeGraph 在会话结束时留下的检索上下文比读文件式代理多约 80%，VS Code 上是 67k token 对 18k token。
- Understand Anything：原文全篇没有效果数据，不能给出成功率、成本或速度基线；只有安装、运行、增量更新和团队共享步骤，以及“全库首跑会消耗大量 token、大 monorepo 先限定子目录”的警告。把“补上编码智能体缺失的代码上下文”当作待验证主张。
- Pensieve：该调研没有给出任何成功率、成本或速度基线；README 提供的是自测工具而不是已完成的评测——用自己的仓库生成任务、Claude Sonnet 无头运行、比开/关 Pensieve 能否答出正确文件。作者自己的建议也是小范围试用后再决定。

试多久：最小试用半天内可完成。记录基线，并注意四份材料都强调样本小、单次运行不足以说明等价或提速；你的样本也要多次运行，避免拿一次结果下结论。做法 C 无效果数据，做法 D 只有自测脚本，更要先限定子目录或子范围、小范围验证。

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
- **Understand Anything 全库首跑会消耗大量 token。** 大 monorepo 先用 `/understand src/frontend` 这类子目录范围。
- **Understand Anything 原文没有效果数据。** 不能把“补上上下文”当作已证结论；先小范围试装再决定是否铺开。
- **Understand Anything 调用前缀。** 多数平台 `/understand`，Codex 用 `$understand`；不认前缀时直接说白话："Use the understand skill to analyze this project."
- **Understand Anything 非 Claude Code 平台脚本会克隆到 `~/.understand-anything/repo` 并创建符号链接。** 装完要重启 CLI/IDE。
- **Understand Anything 提交 `.ua/` 要排除本地草稿。** 排除 `intermediate/` 和 `diff-overlay.json`；图谱 10 MB+ 用 git-lfs 跟踪。
- **Understand Anything viewer 只读本地磁盘、不调用 LLM、不需要 API key。** 前提是 Node.js >= 18 和已提交数据目录；它不等于重新生成了图谱。
- **Understand Anything 本地模型配置未给全。** 原文只指向 Ollama 集成指南，未给具体配置；隐私/企业场景需要自己补齐。
- **Understand Anything 老项目目录名是 `.understand-anything/`。** 不用迁移，继续用即可。
- **Pensieve 完整功能仅 Apple Silicon Mac。** Linux / Intel Mac 只装后端、没有搜索面板；原文未提 Windows 支持。
- **Pensieve setup 不做完索引为空。** MCP 连接此时会额外拿到 `setup_guide`、`setup_scan`、`setup_add_source`、`setup_start` 工具；先跑 `pensieve setup recommended` 或走完 App 向导。
- **Pensieve 首次运行要下载约 1.2 GB 嵌入模型。** 之后后台索引，搜索和 Map 随索引进度逐步可用；别在索引没跑完时就下结论。
- **Pensieve 的 HTTP 连接必须显式指定 scope。** 它看不到 agent 工作目录，不写 `?scope` 等于全部；stdio 的 `auto` 才会按 agent 工作目录收窄。
- **Pensieve 在未索引的仓库里会告诉 agent 改用 grep。** 不会把别的仓库代码返回给它；`claude-repo-check` 钩子只会问一次是否索引。
- **Pensieve 的默认索引范围很宽。** `folders` 默认含 `~/Documents`、`~/Desktop`、`~/Downloads`，`sweep_roots` 默认 `~`、深度 4；密钥类文件由 `exclude_files` 控制永不索引，但要先确认你愿意把这些来源进索引。所有数据在 `~/.pensieve`，删掉该目录即重来。
- **Pensieve 默认只暴露 11 个工具，但工具描述每轮都发给 agent。** 需要 agent 管理 Pensieve 自己时才用 `?tools=all` 或 `pensieve mcp --all-tools`。
- **Pensieve 的编辑钩子有成本。** `claude-hook` 每次 Edit/Write 增加约 50 ms；不需要时用 `pensieve integrate claude --remove` 精确移除。
- **Pensieve 没有效果数据。** 只有安装、scope、配置和 bench 脚本；把「先搜索再 grep」当作待验证主张，别当已证结论。
- **样本小。** jg 只覆盖 10 个 Python SWE-bench 任务、一个冻结安装包和该仓库自带 skill，样本极小、单一语言、单次运行；CodeGraph 是 7 个仓库的作者自测；Understand Anything 没有效果数据；Pensieve 没有效果数据。都不能直接外推。
- **不要一次接满所有代理。** 先在一个代理上试，便于回退和判断污染。

## 证据与来源
本篇合并三份调研报告：《dzhng/jevgrep》、《colbymchenry/codegraph》与《Egonex-AI/Understand-Anything》。

jg 部分：安装、认证、`jg skill`、`jg files`、提问检索、`--exclude`、升级步骤来自《dzhng/jevgrep》正文中 README 给出的可复制命令与说明。成功率与成本数据来自 README 的 self-report，未独立复核：十个调优过的 Python SWE-bench 任务、一个冻结的已安装包、仓库内的公开 skill 做对比，Jevgrep 与无 Jev 基线同样解决 8/10 题；Sol 成本从 $7.62 降到 $5.44，降幅 28.6%（四舍五入 ~30%），该口径包含失败尝试、不含 Jev 成本；0.4.3 的总成本重跑（含 Jev）总成本降低 25.8%，同样解决 8/10 题；0.5.0 评估保持 8/10 解决，原生 Jev 成本相比 0.4.3 那次下降约 59%，合并 Sol+Jev 成本高出 2–3%，作者接受为小折衷。另有独立的速度研究文件（`speed-2026-09-28.md`），衡量后续本地优化配合 Jev 原生 TypeSafe endpoint。作者自己的限定：这是单次运行观察，不构成统计等价，也不构成速度改善的证明；它衡量的是任务成功率和成本，不保证在每个仓库上都省钱；封面图的“~30% lower cost”是较旧的 Sol-only 口径，README 后面已修正为总成本 25.8%，并说明未来基准统计会包含 Jev；“Same intelligence”是营销式表述，实际含义只是这 10 题里两边都是 8/10。适用条件与风险：评测只覆盖 10 个 Python SWE-bench 任务、一个冻结安装包和该仓库自带 skill，样本极小、单一语言、单次运行，不能外推到你的仓库和语言。隐私：检索会把符合条件的源码内容通过认证时选择的 provider 发给 Jev；默认文件系统过滤会尊重 ignore 文件并排除隐藏、依赖/构建、二进制和明显的凭证文件，但 README 明确这些过滤不保证所有敏感信息都已被移除。平台限制：Node.js 22+、macOS 或 Linux。凭证限制：搜索始终使用 `jg auth` 保存的 provider；环境变量凭证和 endpoint 覆盖不被使用。版本坑：provider 选择需要 0.3.0+；0.1.0 的 `jg skill` 只打印 skill 文本。输出是证据而非答案，也不保证找全所有相关文件。可复现的方法学文件路径：README 公开了 `evals/results/relevance-threshold-2026-09-27.md`、`total-cost-2026-09-28.md`、`combined-cost-research-2026-09-28.md`、`speed-2026-09-28.md`，可据此复现或改造成自己的任务集对比。哪些只是作者主张：把“在陌生代码库里定位实现位置”从 agent 的试错式探索变成一次语义检索、能减少定位步数，是调研报告/README 的定位与主张；可复现的只有上述方法学文件与对比口径。

CodeGraph 部分：安装、接线、`codegraph init`、`codegraph status`、自动同步、手动 `codegraph sync`、`codegraph upgrade`、`codegraph uninstall`、`codegraph uninit` 命令来自《colbymchenry/codegraph》正文中 README 给出的可复制命令与说明。效果数据全部来自作者自测，未独立复核：README 报告 7 个真实开源仓库、7 种语言的对照测试（VS Code / Excalidraw / Django / Tokio / OkHttp / Gin / Alamofire），口径为每臂 4 次取中位数，模型标注为 `claude-opus-4-8`，复测日期标注 2026-08-05；汇总数字为工具调用减少 88%、快 53%、token 少 62%、成本低 44%，七个仓库的文件读取都降到 0。逐仓库数据在 README 表格里（例如 Excalidraw 2 vs 43 次工具调用、45s vs 2m42s、token 少 84%、便宜 78%；Django 只便宜 13%、Gin 成本基本持平）。方法学：同一仓库、同一问题、同一模型，WITH（启用 CodeGraph MCP）vs WITHOUT（空 MCP 配置），每臂跑 4 次取中位数，并且两臂都屏蔽 `codegraph` CLI，防止对照组从 PATH 上找到 CLI 绕过 MCP 导致污染；28 次 WITHOUT 运行全部被拦截、0 污染；此前未屏蔽时 WITHOUT 臂在 28 次里有 26 次通过 Bash 摸到 CLI。索引性能：Swift 编译器仓库 27k 文件约 100 秒全量索引、单文件改动约 4 秒重同步；2 核 6GB VPS 上 Linux 内核（70k 文件、200 万符号、640 万关系）12 分钟内索引完成。只是作者主张、未独立核实的部分：上述所有性能与成本数字均出自仓库作者自测，没有第三方复现；复测日期和模型版本是 README 标注；Rust 内核“图谱与参考引擎逐字节一致”“比最快的竞品索引器快 2–7 倍”等说法同样只有作者陈述；整个 README 还带有明显的产品推广成分（CodeGraph 托管平台 waitlist、X 账号引流）。作者自己披露的反向事实：CodeGraph 降低的是“吞吐”——处理掉的 token、用掉的工具和钱；但在上下文占用这一轴上它更贵。同一批 7 个仓库的多轮会话里，CodeGraph 在会话结束时留下的检索上下文比读文件式代理多约 80%，VS Code 上是 67k token 对 18k token。机制是它一次返回一大块密集的原文，答完还留在窗口里；而 grep-read 代理是一堆小结果陆续被换出。README 明确建议：在窗口不大的环境里跑长会话要为此留预算。适用范围与前提：只对“代码理解 / 改动前评估”类任务；只有在代理被引导直接查询图谱时才有收益，委派给读文件的子代理就失效；watcher 在沙箱或设了 `CODEGRAPH_NO_DAEMON=1` 时不可用，需要手动同步；CLI Reference、Configuration、MCP Tools、Library Usage 正文在输入中被截断，因此无法给出更细的配置项与提示词。与已有清单的关系：Claude Code（adopt）是 CodeGraph 自动配置列表第一位，属于增强型上下文供给；Cursor（watch）在自动配置列表内，README 未给出 Cursor 专属验证数据；GitHub Copilot（drop）与 README 声称支持不一致，仅凭 README 一句宣称不足以改变既有判断，只作为后续复核线索；Hermes（watch）／OpenCode（watch）都在自动配置列表内，可视为这两个 watch 条目的可试配件；清单中没有“预索引代码知识图谱 / 上下文供给”这一类的做法条目，CodeGraph 可视为该类做法的一个具体候选。

Understand Anything 部分：安装插件、非 Claude Code 一行脚本、各平台安装方式、`/understand`、`--language`、`--auto-update`、`/understand-dashboard`、`/understand-chat`、`/understand-diff`、`/understand-explain`、`/understand-onboard`、`/understand-domain`、`/understand-knowledge`、`.ua/` 提交与 git-lfs、viewer 命令、升级卸载命令，均来自《Egonex-AI/Understand-Anything》正文。技术路线（Tree-sitter 确定性结构抽取 + LLM 语义层，多智能体流水线，file-analyzer 最多 5 并发、每批 20–30 文件）和产物路径（`.ua/knowledge-graph.json`，老项目 `.understand-anything/`）来自该报告。受支持平台值、Copilot CLI、Cursor / VS Code + GitHub Copilot 自动发现、Kiro 用法来自该报告。该报告全篇没有效果数据，不能给出成功率、成本或速度基线；只有“补上编码智能体缺失的代码上下文”这一待验证主张，以及“全库首跑会消耗大量 token、大 monorepo 先限定子目录”的警告。隐私与本地模型：报告提到可把平台指向本地模型，但只指向 Ollama 集成指南，未给具体配置；viewer 全程只从本地磁盘只读服务，不调用 LLM，数据不出本机。哪些只是作者主张：整库知识图谱、架构导览、业务域映射、onboarding 指南能改善编码 agent 的上下文供给，来自该报告/README 的定位与主张；可复现的只有命令、产物路径和 viewer 行为，效果没有数据支撑。

Pensieve 部分：安装脚本、手动安装、`pensieve integrate` 系列、`claude mcp add` 系列、stdio JSON 配置、`pensieve setup` 系列、scope 说明、默认 11 个工具与 `?tools=all` / `pensieve mcp --all-tools` 的扩展工具、`~/.pensieve/settings.json` 设置表、bench 四条命令，均来自《TedHaley/pensieve》正文给出的可复制命令与说明。技术栈（`Qwen3-Embedding-0.6B` 做嵌入，SQLite trigram 全文索引 + turbovec 向量索引）和索引内容规则（文本/Markdown/Office/PDF/邮件/代码按内容索引；图片、音视频只按文件名索引且不上图）来自该报告。安全与数据边界：看起来像密钥的文件（密码管理器应急包、keys、`.env`、凭据）永不索引，由 `exclude_files` 控制；所有数据存在 `~/.pensieve`，删掉该目录即重来。平台限制：完整能力（搜索面板）仅 Apple Silicon Mac，Linux / Intel Mac 只能装后端、无搜索面板；原文未提 Windows 支持。成本提示：首次运行会下载约 1.2 GB 嵌入模型，随后后台索引；每次 Edit/Write 的 `claude-hook` 增加约 50 ms。该报告没有给出成功率、成本或速度基线；bench 命令是让读者用自己的仓库生成任务、Claude Sonnet 无头运行、比较开/关 Pensieve 时能否答出正确文件的工具，不是已完成的第三方评测。哪些只是作者主张：把「满盘 grep」换成「先语义搜索」能改善 agent 定位，是 README 的定位与主张；可复现的只有命令、配置项、产物路径（`~/.pensieve`）和 bench 脚本。该报告正文在「对应的研究问题」一节被截断（能力发现等小节只到 Claude Code、Codex 处），更细的研究结论无法从现有材料照抄。

## 依据的调研

- [dzhng/jevgrep](../research/radar/2026-10-01/31-dzhng-jevgrep.md)：值得一试，在编码智能体所在的仓库里装 jevgrep CLI 与配套 skill（npm install -g @dzhng/jevgrep → jg auth → jg skill），把"知道要理解什么行为但不知道代码在哪"这类定位工作交给 jg，已知精确符号或路径时仍用直接读/rg；理由是它给出了可复制的安装、认证、排除与调用步骤，并有单次 SWE-bench 对比数据（10 题中同样解决 8 题、成本下降约 25%–29%），但证据是单次运行且会把源码发往外部 provider，所以先小范围试。
- [colbymchenry/codegraph](../research/radar/2026-10-02/78-colbymchenry-codegraph.md)：值得一试，可以在一到两个真实代码仓库上小范围试装 CodeGraph，用同一个架构问题做「装/不装」对照来验证它是否真的减少工具调用与成本；它的安装、接线、建索引三步都是可照抄的命令，但效果数据全部来自作者自测，且作者自己承认多轮会话的上下文占用反而更高，所以先试不直接采用。
- [Egonex-AI/Understand-Anything](../research/radar/2026-10-02/524-egonex-ai-understand-anything.md)：值得一试，在一个中等规模、你已有正确答案可对照的代码库上小范围试装这个 Claude Code 插件：先用子目录范围跑一次 `/understand`，再用 `/understand-chat` 和 `/understand-diff` 验证它是否真的补上了编码智能体缺失的代码上下文；理由是原文给出了完整可复制的安装、运行、增量更新和团队共享步骤，但全篇没有效果数据，且明确警告全库首跑会消耗大量 token，所以要控制规模再决定是否铺开。
- [TedHaley/pensieve](../research/radar/2026-10-12/2730-tedhaley-pensieve.md)：值得一试，建议小范围试用：在 1–2 个中型以上代码库上装 Pensieve，把 Claude Code/Cursor 等通过 MCP 接上并加上 instructions block 与两个 hook，再用仓库自带的 bench 对比 grep 与 guided 两臂的任务解决率、工具调用数和 token 消耗；原因是 README 给出了完整的安装、MCP 连接、作用域、钩子和评测命令，可照做，但全部效果数据都是作者自测，且完整能力（搜索面板）仅限 Apple Silicon Mac。
