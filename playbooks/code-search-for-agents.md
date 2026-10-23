# 在陌生代码库里定位实现：把逐文件摸索换成一次查询或图谱探索

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 在陌生代码库里定位行为、调用链和改动影响时，常靠 grep/Read 逐文件试错；本手册给出七种检索与图谱做法，帮你按隐私边界、平台和问题类型选一种并做小范围对照。
> 先试这一步：先选一个你熟悉的中等仓库和一个“知道行为不知道位置”的问题，只接一种做法，跑 3–5 次对照再决定是否推广。
> 最近修订：2026-10-24

## 解决什么问题
编码 agent 在陌生代码库里定位实现位置时，常靠 grep/glob/Read 逐文件重建调用链和依赖。当你知道要理解什么行为、但不知道代码在哪（认证检查在哪、数据库连接怎么建/池化/关闭、哪个测试覆盖超时重试、扩展宿主怎么和主进程通信、改动会影响哪些调用者），逐文件摸索是试错式探索。本手册合并七种把定位变成一次查询、检索或图谱探索的做法；它们都不替代编码 agent 的实现与测试，只提供上下文和证据。差别主要在外发范围、平台和产物形态。
- A jg：语义检索，命令 `jg '描述行为的问题' .`，返回文件路径、阅读线索和逐字源码；会把符合条件的源码发给认证时选择的 provider。
- B CodeGraph：本地预索引代码知识图谱，Rust 内核 + SQLite，通过 MCP 暴露；主要工具 `codegraph_explore`，一次拿源码、调用路径和改动波及范围；README 称 100% 本地、无 API key、无外部服务。
- C Understand Anything：Tree-sitter 结构抽取 + LLM 语义层，产物 `.ua/knowledge-graph.json`（老项目 `.understand-anything/`），可提交、可 git-lfs、可无 LLM viewer 只读打开；支持 Claude Code 及十余个平台。
- D Pensieve：本地语义检索层，索引文件、文件夹、git 仓库和 agent 会话到 `~/.pensieve`；人和 agent 共用，MCP 侧有 scope、谁懂这块、知识缺口、未探索区域；嵌入用 `Qwen3-Embedding-0.6B`，SQLite trigram + turbovec。
- E Graphicle：本地代码图谱 + 项目记忆 MCP；Rust 单程序，tree-sitter 解析代码，同时记住项目文档/决策/流程和历史 Claude Code/Codex 会话，提供带文件和行号的引用摘录；本地、无 API key、无账号、无遥测。
- F XERJ：本地搜索引擎，对外说 Elasticsearch REST API，默认 `localhost:9200`；`xerj autoindex` 建 AST 感知索引，一次查询拿 file:line；也能索引文档、日志、PDF、SQLite、CSV、Office/EPUB/Jupyter/man page/mail，并做 `/_memory`；默认本地，只有开 rerank 才外发。
- G Vesalius：Apple silicon Mac 上的本地代码库索引与代码图谱 MCP；Swift 用 SwiftSyntax 全语法树，TypeScript/JavaScript、Python 用 tree-sitter，其余语言词法级；向 Claude Code/Codex 暴露 5 个只读工具 `usages`、`feature_map`、`outline`、`architecture`、`dependency_cycles`，另有 29 个 CLI 命令、Mac app、VS Code 扩展。

## 适用与不适用
适用：
- 跨不熟悉文件的问题；你知道要理解什么行为但不知道它在哪里；大仓库、多语言、原本要 20–40 次工具调用才能找到入口的问题。
- 代码理解 + 改动前评估：架构问答、符号影响面、框架路由到 handler、静态 grep 跟不上的动态分发。
- A jg 对 Python、TypeScript/JavaScript、Go、Rust 声明解析，其他文本 fallback；适合可以把源码发外部 provider 的仓库。
- B CodeGraph 解析 20 门语言，声称支持 17 个框架路由、React Native/Expo/Swift-ObjC 桥接；适合查询时给本地调用路径和影响面。
- C 适合整库结构、按架构层分组、依赖顺序导览、业务域映射、当前改动影响、onboarding、Karpathy 式 LLM wiki。
- D 适合本地语义检索代码/文档/邮件/过去 agent 会话；人和 agent 共用索引；按 scope 限制来源；想把谁懂这块、知识缺口、未探索区域交给 agent。
- E 适合代码图谱 + 项目文档/决策/流程 + 历史会话一起供给；一次 `graphicle setup` 接入多个客户端；要带行号引用、符号影响面、HTML 图谱、跨仓库 `--workspace`；记忆智能体提出、人工批准后生效。
- F 适合模型没见过的私有/内部/小众/训练截止后代码；README 说收益按模型是否见过分档，流行公开库中性甚至有害；想用一次查询拿 file:line 替代读文件；同一个原语索引代码之外语料；参考编码循环（clone 相似开源项目、索引、写码前检索、引用、遵守许可证）。
- G 适合 Apple silicon macOS 团队想把项目结构预计算后以只读工具供给 agent：谁调用/使用/导入/依赖某个符号、重命名/改签名/删除前的影响面、循环导入、项目架构、功能在哪、文件里有什么；`usages` 支持 `change: rename | signature | remove` 并给出要改文件和要跑测试；能抓 grep 抓不到的引用；也适合代码体检（`health` 8 类评分、`dependency_cycles`、`hotspots`、`unused`）。

不适用或应避免：
- 已知精确符号或路径：直接读或 `rg`；A、G 最有价值的是结构/陌生文件问题。
- 不允许源码外发：A 会外发；B 本地；C 默认平台模型，隐私/企业可指向本地模型（原文只给 Ollama 指南）；D 本机 `~/.pensieve`，但先确认默认 `~/Documents`、`~/Desktop`、`~/Downloads` 和 `sweep_roots`（默认 `~`、深度 4）是否愿意进索引；E 本地，但不带 `--code-only` 的 `graphicle graph extract` 会把文档和图片发给配置的 LLM；F 默认本地，开 rerank 才外发，`POST /v1/systemone`、`POST /_decide` 是本地替代但需标注样本；G 本地。
- Windows：A 未提 Windows；B、C、F 有 PowerShell 安装脚本；D 完整功能仅 Apple Silicon Mac，Linux/Intel Mac 只有后端，原文未提 Windows；E 明确 Windows 无原生构建，WSL2 未测试；G 仅 Apple silicon macOS 15+，Windows/Linux 目前无法使用。
- 没有 provider key：A 必须先 `jg auth`，不支持环境变量凭证；B 不需要；D 不需外部 API key 但要下载本地嵌入模型；E 无需 API key/账号/遥测；F `--insecure` 开发节点不需要 key，开启认证必须把 key 交给 autoindex（`--api-key` 或 `XERJ_API_KEY`，不读 `xerj.toml`），rerank 才要 provider key；G 本地，无 API key。
- B 只在被直接查询时有收益；代理把探索委派给会读文件的子代理就成纯开销。B 上下文占用更贵：同一批 7 个仓库多轮会话，会话结束残留检索上下文比读文件式代理多约 80%，VS Code 67k token 对 18k token。
- C 全库首跑消耗大量 token；大 monorepo 先限定子目录；原文没有成功率/成本/速度数据。
- D setup 不做完索引为空；首次下载约 1.2 GB 嵌入模型；HTTP 连接看不到 agent 工作目录，必须显式 scope；未索引仓库会告诉 agent 改用 grep；默认索引范围很宽。
- E 版本仅 0.1.0、团队版私有预览、仅 macOS/Linux；`setup` 改仓库内和家目录多个配置（先备份，可 `graphicle disconnect` 撤销）；`graphicle ask` 未配置模型只显示证据。
- F `--insecure` 关闭 TLS 和 API key，任何能访问端口的人都是超级用户，可读删所有索引（含 `/_memory`）；收益与模型是否见过强相关；原文没有定时/事件触发编排，只给增量重索引；收益数字全部自报。
- G 仅 Apple silicon macOS 15+，构建 CLI 要 Xcode 26 和 git；解析深度差别大：Swift 全语法树，TS/JS/Python tree-sitter，其余词法级；作者自测说典型问题省约一半 token、质量基本持平，但“功能在哪”类问题质量反而下降；先在有测试的中等仓库做 A/B，看每题 token、工具调用次数和清单漏项率。
- 样本都小、多为作者自测，不能直接外推到你的仓库和语言。

## 前置条件
公共：
- 一个真实仓库，最好熟悉、敏感度可控、中等规模。
- 一组“知道要理解什么行为、但不知道代码在哪”的真实问题，准备装/不装对照。
- 同一模型、同一任务描述，重复跑 3–5 次取中位数，不拿单次下结论。

做法 A：Node.js 22+；macOS 或 Linux（未提 Windows）；Vercel AI Gateway、TypeSafe、OpenRouter、OpenCode Zen 或自定义 TypeSafe 兼容 endpoint 之一的 key；凭证必须 `jg auth` 保存；provider 选择需 0.3.0+。
做法 B：待索引项目；CLI 自带运行时；接入后仅本地，无 API key；安装器改 PATH 但不改当前 shell，必须新开终端；逐项目初始化，自动同步默认开启。
做法 C：已装 Claude Code 或受支持 CLI/IDE；有 token 预算或订阅；非 Claude Code 一行脚本需 macOS/Linux，克隆到 `~/.understand-anything/repo` 并创建符号链接，装完重启；Windows 用 PowerShell；大项目先限定子目录。
做法 D：完整功能（macOS 搜索面板）需 Apple Silicon Mac；Linux/Intel Mac 只装后端；首次下载约 1.2 GB 嵌入模型；数据在 `~/.pensieve`；HTTP 连接必须显式 scope。
做法 E：macOS 或 Linux；Windows 原生无构建，WSL2 未测试；准备可回滚仓库或新分支，因为 `setup` 会改仓库内文件（先备份）；`graphicle graph extract . --code-only` 不需要模型，完整提取会外发文档和图片。
做法 F：Linux/macOS/Windows 的 x86-64 或 arm64；本地数据目录和端口（默认 9200）；认证开启时 API key 用 `--api-key` 或 `XERJ_API_KEY`，autoindex 不读 `xerj.toml`；MCP 用绝对路径二进制、`XERJ_URL`，认证加 `XERJ_AUTH`；rerank 需 provider key。
做法 G：Apple silicon Mac、macOS 15+；构建 CLI 需 Xcode 26、git；智能体侧需 Claude Code；编辑器侧需 VS Code 1.95+ 与 Node 22+（可选）；Windows/Linux 目前无法使用；索引和查询本机完成，不上传代码、不写仓库，唯一例外是 app 里以“允许编辑”模式启动的 agent run。

## 操作步骤
先选一种，不要一次接满所有代理。A 外发源码给 provider；B 本地索引；C 默认平台模型、可指向本地模型；D 索引留 `~/.pensieve`；E 本地但完整 graph extract 会外发；F 默认本地、开 rerank 才外发；G 本地且仅 Apple silicon macOS。

### 做法 A：jg 语义检索（外发 provider）
1. 前提检查：Node.js 22+、macOS/Linux、provider key；选愿意发送的搜索根。预期：不满足就不要外发。
2. 安装 CLI：
```sh
npm install -g @dzhng/jevgrep
```
3. 认证：
```sh
jg auth
```
预期：询问 provider，把 key 存进仅属主可读配置；重复运行会替换；搜索总用已保存 provider；环境变量凭证/endpoint 覆盖不生效。可用 `jg doctor` 检查。
4. 安装 agent skill（README 称 agent 场景必需）：
```sh
jg skill
```
也可 `npx skills add dzhng/jevgrep --skill jevgrep`；两者都不配置凭证。
5. 先确认搜索会读到哪些文件（不需 provider key、不发网络请求）：
```sh
jg files [root]
```
预期：按顶层目录分组统计可能读取的文件数；确认外发范围可接受。
6. 提问检索（描述行为，不报文件名）：
```sh
jg 'Where is authentication checked before a request reaches a handler?' .
jg 'How are database connections created, pooled, and closed?' ./src
jg 'Which tests cover retry behavior when a request times out?' .
```
预期：摘要和紧凑文件列表 → 带行号引用的选中源码 → 声明与调用位置细节；交给 agent 作为起点。
7. 按次排除路径：
```sh
jg --exclude '**/*.test.ts' --exclude 'src/generated/' '...' .
```
8. 升级 CLI 与 skill 分开：
```sh
npm install -g @dzhng/jevgrep@latest
jg --version
```
升级 npm 包不会覆盖项目 skill，要单独重跑 `jg skill`。已知道精确符号或路径时不要用；把第 6 步限定在“知道行为不知道位置”。

### 做法 B：CodeGraph 本地代码知识图谱
1. 安装 CLI（macOS/Linux）：
```bash
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
```
Windows PowerShell：
```powershell
irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
```
已装 Node 可用 npm：
```bash
npm i -g @colbymchenry/codegraph
```
安装器改 PATH 但不改当前 shell，必须新开终端。
2. 接进代理（新终端）：
```bash
codegraph install
```
自动检测并配置 Claude Code、Cursor、Codex CLI、opencode、Hermes Agent、Gemini CLI、Antigravity IDE、Kiro、GitHub Copilot。预期：只接线，不建索引；建议先在一个代理上接线。
3. 逐项目初始化：
```bash
cd your-project
codegraph init
codegraph status
```
预期：创建 `.codegraph/` 并完成整图谱构建；`status` 有待同步会看到 `### Pending sync:`。
4. 自动同步默认开启：原生 watcher + 防抖默认 `2000ms`（`CODEGRAPH_WATCH_DEBOUNCE_MS` 可调，范围 `[100ms, 60s]`）；watcher 被禁用（沙箱或 `CODEGRAPH_NO_DAEMON=1`）或脚本预检才手动：
```bash
codegraph sync
```
5. 升级/卸载：
```bash
codegraph upgrade
codegraph uninstall
codegraph uninit
```
可选 `--check`、`--keep-cli`、`--target`、`--yes`。使用要点：CodeGraph 只有被直接查询才有收益；它的指令会引导代理直接回答，不把探索委派给会读文件的子代理；否则子代理照样读文件，CodeGraph 成纯开销。能确认的 MCP 工具是 `codegraph_explore`；更细配置在现有材料中截断。

### 做法 C：Understand Anything 知识图谱插件
1. Claude Code 原生安装：
```bash
/plugin marketplace add Egonex-AI/Understand-Anything
/plugin install understand-anything
```
2. 非 Claude Code 平台一行脚本（macOS/Linux；克隆到 `~/.understand-anything/repo` 并创建符号链接；装完重启）：
```bash
curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash
curl -fsSL https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.sh | bash -s codex
```
Windows PowerShell：
```powershell
iwr -useb https://raw.githubusercontent.com/Egonex-AI/Understand-Anything/main/install.ps1 | iex
```
支持平台值：`gemini`、`codex`、`opencode`、`pi`、`openclaw`、`antigravity`、`vibe`、`vscode`、`hermes`、`cline`、`kimi`、`trae`、`nanobot`、`kiro`。
3. 确认调用前缀：多数平台 `/understand`，Codex 用 `$understand`；不认前缀就直接说 `Use the understand skill to analyze this project.`
4. 首次分析：
```bash
/understand
```
预期：写入 `.ua/knowledge-graph.json`（老项目用 `.understand-anything/`）；流水线 5 个智能体：`project-scanner`、`file-analyzer`、`architecture-analyzer`、`tour-builder`、`graph-reviewer`；后续默认增量。
5. 控制规模和语言：
```bash
/understand src/frontend
/understand --language zh
```
支持 `en`、`zh`、`zh-TW`、`ja`、`ko`、`ru`；大 monorepo 先限定子目录。
6. 每提交自动更新与 Dashboard：
```bash
/understand --auto-update
/understand-dashboard
```
7. 其余命令：
```bash
/understand-chat How does the payment flow work?
/understand-diff
/understand-explain src/auth/login.ts
/understand-onboard
/understand-domain
/understand-knowledge ~/path/to/wiki
```
8. 把图提交进仓库（排除本地草稿；10 MB+ 用 git-lfs）：
```gitignore
.ua/intermediate/
.ua/diff-overlay.json
```
```bash
git lfs install
git lfs track '.ua/*.json'
git add .gitattributes .ua/
```
9. 无 Claude Code 的同事看图（只要求 Node.js >= 18、已提交数据目录；只读本地、不调用 LLM）：
```bash
npx https://github.com/Egonex-AI/Understand-Anything/releases/latest/download/understand-anything-viewer.tgz /path/to/analyzed/project
```
10. 升级/卸载：
```bash
./install.sh --update
./install.sh --uninstall <platform>
```
注意：原文没有效果数据；全库首跑消耗大量 token；大 monorepo 先限定子目录。

### 做法 D：Pensieve 本地语义检索层
1. 安装（Apple Silicon Mac 才有完整搜索面板；Linux/Intel Mac 只装后端）：
```bash
curl -fsSL https://tedhaley.ca/pensieve/install.sh | sh
```
预期：下载 `Pensieve.dmg`、拷到 Applications、用 app 内安装器装 `pensieve` 后端；首次运行下载约 1.2 GB 嵌入模型，随后后台索引。
2. 连接 agent：
```bash
pensieve integrate recommended
```
预期：扫描 Claude Code、Codex、Cursor、Gemini CLI、Qwen Code、Windsurf、Claude Desktop、VS Code 并登记 MCP server。只接 Claude Code：
```bash
claude mcp add --scope user pensieve -- pensieve mcp
claude mcp add pensieve -- pensieve mcp --scope payments
```
3. 完成 setup（不做完索引为空，MCP 会额外拿 setup 工具）：
```bash
pensieve setup
pensieve setup recommended
```
4. 让 agent 真正改用搜索而不是 grep（可选 add-on）：
```bash
pensieve integrate
pensieve integrate recommended
pensieve integrate pensieve-teammates pensieve-plan
pensieve integrate claude --remove
```
`claude-hook` 每次 Edit/Write 约 50 ms；`claude-repo-check` 在未索引仓库只问一次是否索引；未索引仓库会告诉 agent 改用 grep。
5. 用 scope 控制可见范围：`auto` 用 agent 工作目录；HTTP 必须显式 `?scope`，不写=全部；命名 scope 是一组来源列表，可在 Settings → Scopes 或 `save_scope` 建；search、read、similar、who_knows、list_repos、team、unexplored 都受 scope 约束。
6. 默认 11 个工具：`search`、`read`、`similar`、`who_knows`、`knowledge_gaps`、`list_repos`、`team`、`unexplored`、`open`、`current_scope`、`index_path`；需要 agent 管理 Pensieve 时用 HTTP `?tools=all` 或 `pensieve mcp --all-tools`。
7. 用仓库自带 bench 自测：
```bash
uv run python bench/agent_search.py gen --repo ~/code/myrepo -n 40 --tasks tasks-v2.jsonl
uv run python bench/agent_search.py run --repo ~/code/myrepo --tasks tasks-v2.jsonl --arms grep,guided
```
预期：用你自己的代码生成任务，Claude Sonnet 无头运行，比较开/关 Pensieve 能否答出正确文件。

### 做法 E：Graphicle 本地代码图谱 + 项目记忆 MCP
1. 前提检查：macOS/Linux；Windows 原生无构建，WSL2 未测试；准备可回滚仓库或新分支。
2. 安装：
```sh
brew install graphicle-ai/tap/graphicle
```
没有 Homebrew：
```sh
curl -fsSL https://github.com/graphicle-ai/graphicle/releases/latest/download/install.sh | sh
```
3. 仓库内初始化：
```sh
cd your-repo
graphicle setup
```
它会索引仓库、建代码图谱、连接编码智能体、打开会话捕获、把 Claude Code 搜索优先指向代码图谱、往 `AGENTS.md` 加一节、安装 Git hooks；列出每个改动文件并先备份；`graphicle disconnect` 全部撤销；`--yes` 非交互。记录每次文件改动与备份位置。
4. 让智能体用起来：说 `use graphicle to find where failed requests are retried`，或：
```sh
graphicle ask 'where is tax added to prices?'
```
未配置模型只显示证据；成文答案：
```sh
graphicle config set model anthropic
```
5. 影响面分析：
```sh
graphicle graph extract . --code-only
graphicle graph affected 'retry()'
```
`--code-only` 不需要模型；完整提取会外发文档和图片。预期：符号级影响面、调用路径和可交互 HTML 图谱。
6. 浏览与批准记忆：
```sh
graphicle open
graphicle doctor
graphicle context --workspace
graphicle disconnect
```
记忆由智能体提出、人工批准后生效；`disconnect` 后用 `git status` 确认干净。客户端接入位置：Claude Code → 仓库 `.mcp.json`，hooks 在 `.claude/settings.local.json`；Codex → `~/.codex/config.toml`，hooks 在 `~/.codex/hooks.json`（需信任）；Cursor → `~/.cursor/mcp.json`（无会话捕获）；VS Code → 仓库 `.vscode/mcp.json`；Claude Desktop → `claude_desktop_config.json`。

### 做法 F：XERJ 本地搜索引擎（重排默认关闭，开了才外发）
1. 安装：
```sh
curl -fsSL https://xerj.org/get | sh
```
Windows PowerShell：
```powershell
irm https://xerj.org/get.ps1 | iex
```
2. 起本地开发节点（单用户开发机）：
```sh
xerj --insecure --data-dir ./data &
```
注意 `--insecure` 关闭 TLS 和 API key，任何能访问端口的人都是超级用户，可读删所有索引（含 `/_memory`）；新节点只绑 127.0.0.1。
3. 开启认证的节点必须把同一个 key 交给 autoindex（它不读 `xerj.toml`）：
```sh
xerj --data-dir ./data &
export XERJ_API_KEY=$(cat ./data/admin.key)
xerj autoindex ~/my-project
```
4. 索引任意文件夹：
```sh
xerj autoindex ~/my-project
```
预期输出形如：
```
phase A: 593 datasets inferred, 1955 junk/skipped files
phase B: indexing 25329 files with 8 workers
done in 158.1s, 593 datasets, 83103 records live, 790 junk records
```
5. 接进 Claude Code / Cursor（MCP + skill）：
```sh
xerj init
```
6. 命令行查询：
```sh
xerj search 'how do we rotate the WAL segment'
xerj def 'euler_to_rotationmatrix'
```
预期：`search` 返回排序段落与 file:line；`def` 返回定义位置与签名；逐个核对行号。
7. 给不能执行 shell 的 host 接 MCP：先跑第 2 步节点；`xerj mcp` 自己不起节点，用 stdio 跟客户端说话、用 HTTP 连 `XERJ_URL`（默认 `http://localhost:9200`）；从桌面图标启动的 MCP host 不继承 PATH，`command` 用绝对路径；认证加 `XERJ_AUTH`。暴露 13 个工具：`xerj_search`、`xerj_semantic_search`、`xerj_vector_search`、`xerj_hybrid_search`、`xerj_memory_store`/`xerj_memory_recall`、`xerj_brain_overview`/`xerj_brain_ego`/`xerj_brain_link`/`xerj_brain_unlink`、`xerj_plan`、`xerj_map`、`xerj_code_search`；schema 在 `xerj.org/docs/agents/schemas/mcp-tools.json`。
8. 参考编码循环：安装 → 起服务 → `xerj autoindex .` → 用任意 ES 客户端查询 → clone 相似开源项目、索引它、写码前先检索它怎么解决、引用出处、遵守许可证。前提：对模型没见过的代码才有正收益。
9. 核对收益：
```sh
xerj gain
```
输出工具自报收益，不是独立评测。可选重排：`_search` 里开 rerank 会把 top 结果发给 TypeSafe 的 Jev，需要 operator 配 provider key；关闭可完全禁止。本地替代 `POST /v1/systemone`、`POST /_decide` 需标注样本。模型已熟知的流行公开库不要指望提速；原文没有定时/事件触发编排。

### 做法 G：Vesalius 本地代码库索引与代码图谱 MCP
1. 构建并安装 `vesalius`（前提：Apple silicon Mac、macOS 15+、Xcode 26、git）：
```bash
git clone https://github.com/haplollc/Vesalius.git
cd Vesalius
scripts/install-cli.sh
vesalius --version
```
预期：release 二进制装到 `~/.local/bin`，版本 2.0.0；首次构建下载 SwiftSyntax 和 ArgumentParser（约 47 MB）并以 release 编译 SwiftSyntax，耗时数分钟（作者在 M2 上约 6 分钟）。若 `~/.local/bin` 不在 PATH，按脚本打印的行加进 shell profile。安装到别处：`scripts/install-cli.sh ~/bin`。
2. 给项目建索引：
```bash
cd ~/code/your-app
vesalius index
```
预期样例：
```
Indexed ~/code/Vesalius
  files: 248 scanned · +248 added · ~0 changed · -0 removed · 0 unchanged
  graph: 9,157 symbols · 79,037 references · 2,611 dependency edges
  time:  5.97s · index ~/Library/Application Support/Vesalius/Indexes/vesalius-…/index.v4.sqlite
```
可跳过：Claude Code 第一次提问会自动建索引；之后每次查询只重读变化文件（作者测得无变更刷新 0.1–0.25 秒）。
3. 把 MCP server 接到 Claude Code：
```bash
claude mcp add --scope user vesalius -- vesalius mcp
claude mcp list
```
预期看到：
```
vesalius: vesalius mcp - ✔ Connected
```
按需替换注册方式（每种都会替换上一条，需先 `claude mcp remove --scope user vesalius`）：
```bash
claude mcp add --scope project vesalius -- vesalius mcp
claude mcp add --scope user vesalius -- ~/.local/bin/vesalius mcp
claude mcp add --scope user vesalius -- vesalius mcp --repo ~/code/your-app
claude mcp add --scope user vesalius -e VESALIUS_MCP_PROFILE=lean -- vesalius mcp
```
任何支持 stdio 的 MCP 客户端都可运行 `vesalius mcp --repo /path/to/repo`。
4. 照常提问，必要时点名一次：
```text
Who calls SessionStore.save, and what would I have to update if I renamed it?
Where are in-app purchases handled?
Are there any circular imports under src/?
What's in PaymentService.swift?
```
如果已连接但没被使用，点名：`use vesalius to find who calls X`。
5. 自己用 CLI 核对（不经过智能体也能验证）：
```bash
vesalius usages <target>
vesalius feature-map '<question>'
vesalius outline <target>
vesalius architecture --v2
vesalius dependency-cycles
vesalius ask '<question>'
vesalius impact <file or symbol>
vesalius health
vesalius diagnostics
vesalius hotspots
vesalius unused
vesalius map
vesalius query '<sql>'
vesalius watch
```
`--json` 供脚本消费，`--repo <path>` 指向别的仓库，`--no-refresh` 关闭查询前自动刷新（未索引仓库会报 `has not been indexed yet`）；每条查询默认先刷新索引。
6. 配置：`VESALIUS_HOME` 索引存放位置（默认 `~/Library/Application Support/Vesalius`）；`VESALIUS_REPO` 未传 `--repo` 时 `vesalius mcp` 服务的仓库；`VESALIUS_MCP_PROFILE` 取 `default`（`usages`、`feature_map` 前置加载）、`lean`（全部按需）、`full`（额外加 `repo_report`：health、diagnostics、hotspots、unused）；`VESALIUS_TRACE` 把耗时 trace 打到 stderr。忽略规则：读各级 `.gitignore`、`.git/info/exclude`、git 全局 ignore，默认跳过构建产物、依赖和 vendored 第三方代码；长期排除写 `.vesaliusignore`，`vesalius index --exclude` 只对当次有效。
仓库选择顺序（容易踩坑）：`--repo` → `$VESALIUS_REPO` → Claude Code 工作目录（`$CLAUDE_PROJECT_DIR`）→ 当前目录；后两者取最近的已有索引上级目录，再退到 git root，再退到该目录本身。所以在 home 目录启动 Claude Code 会把整个 home 建成索引，并在这个索引下的所有未建索引项目里胜出；出问题去 `Indexes` 删掉或用 `--repo` 固定。server 写到 stderr 的第一行就是实际服务的仓库。
7. （可选）VS Code 扩展（前提：已装 CLI；`code` 命令可用；VS Code 1.95+、Node 22+）：
```bash
cd vscode-extension
npm ci
npm run package
code --install-extension vesalius-1.0.0.vsix
```
8. （可选）Mac app 的“改完再看分”回路：选中 finding 点 Improve with Claude Code or Codex…，它用证据写 prompt、以 plan-only 或 edit 模式跑 agent、流式显示，然后重新索引并显示改动前后 health 分数。想让 app 与命令行共用索引，用 app 的 Settings › Agents › Install for My User 把 `~/.local/bin/vesalius` 链接到 app 自带二进制。
9. 用它做结构性问题：重命名/改签名/删除前先 `usages` 影响面（支持 `change: rename | signature | remove`，给出要改文件和要跑测试）；抓 grep 抓不到的引用（README 例子：`SettingsView.swift` 从不出现 `IndexLocation`，通过 `RepositorySettings.model → AppModel.workspace → Workspace.engine → RepositoryEngine.location` 四层属性到达，Vesalius 仍标为 type-inferred 使用）；代码体检用 `health`、`dependency_cycles`、`hotspots`、`unused`。作者按问题类型给的自测收益差别很大：谁依赖此文件 −71%、循环导入 −74%、谁调用此函数 −56%、变更影响 −42%、功能在哪 −38%、架构 −33%、符号在哪被用 −8%；“功能在哪”类质量反而下降。

### 做法 A / B / C / D / E / F / G 怎么选
- 代码不能出机器：B、D、E（注意完整 graph extract）、F（默认本地，重排关闭）、G；C 默认平台模型，隐私/企业可指向本地模型（原文只给 Ollama 指南）；A 会外发。
- 可以把符合条件的源码发外部 provider，想要一次语义检索回文件路径、阅读线索和逐字源码：A。
- 想把“读文件”整体换成“查索引”，一次查询拿 file:line，目标代码是模型没见过的私有/内部/小众代码：F；同一原语还能索引文档/日志/PDF 等，也有 Windows 安装脚本。
- 大仓库、多语言、调用链、框架路由、改动影响面：B 的预索引图谱可能更匹配，但效果数据是作者自测，且作者承认多轮会话上下文占用更高；C 也面向整库理解/架构导览/业务域/onboarding，图谱可提交共享、无 LLM viewer，但无效果数据、首跑 token 贵。
- 想在本地用自然语言同时检索代码、文档和过去 agent 会话，人和 agent 共用索引：D；完整功能仅 Apple Silicon Mac。
- 想把代码图谱、项目文档/决策/流程、历史 Claude Code/Codex 会话一起供给 agent，一次 `setup` 接入多个客户端，要带行号引用和符号影响面：E；仅 macOS/Linux、0.1.0，先开分支并记录备份。
- Apple silicon macOS 团队想要预计算结构图 + 5 个只读工具，尤其是 `usages` 重命名/签名影响面、`dependency_cycles`、`architecture`、`feature_map`，且能接受只用 Claude Code/VS Code/Mac app：G。先在有测试的中等仓库做 A/B，看每题 token、工具调用次数和清单漏项率；作者自测说典型问题省约一半 token、质量基本持平，但“功能在哪”类下降。
- 问题很窄、无图谱臂只用 7 次工具调用就能答出：CodeGraph README 对照显示成本收益接近持平（Gin、Django），不一定值得上图谱。
- 目标代码是模型已熟知的流行公开库：XERJ README 说中性甚至有害，优先模型没见过的语料。
- Windows 且不想折腾：B、C、F 有 PowerShell 安装脚本；E 无原生构建；G 仅 Apple silicon macOS；A 未提 Windows；D 未提 Windows。
- 七者可以分别试，不建议一次接满所有代理；先一个仓库、一个代理做对照。

### 共同的最小试用
1. 选一个中等规模、你熟悉、几百到几千文件、最好跨语言或多模块的仓库，并挑一个你已知正确答案的架构问题，如“某模块的请求怎么经过中间件链路”。
2. 安装并接入一种：A 按 A 第 2–4 步，`jg auth`、项目内 `jg skill`，先 `jg files <root>` 核查外发范围；B 按 B 第 1–3 步，`codegraph install`、`codegraph init`、`codegraph status` 确认无 pending；C 按 C 第 1–4 步，先跑 `/understand src/frontend` 这类子目录，再用 `/understand-chat` 和 `/understand-diff`；D 按 D 第 1–3 步，`pensieve integrate recommended`、`pensieve setup recommended`，再装 instructions block 和钩子；E 开新分支，按 E 第 2–3 步 `graphicle setup`，记录每次文件改动与备份，跑 `graphicle doctor`，再 `graphicle ask 'where is tax added to prices?'`；F 按 F 第 1–4 步装、起节点、`xerj autoindex ~/my-project`，再 `xerj init`，用 `xerj search` 和 `xerj gain` 核对；G 按 G 第 1–3 步构建、`vesalius index`、`claude mcp add --scope user vesalius -- vesalius mcp`，`claude mcp list` 看到 Connected，再用 `vesalius usages` 和 `vesalius dependency-cycles` 核对一个你已知的调用者/循环导入。
3. 挑 5–10 个“知道要理解什么行为、但不知道代码在哪”的真实问题，写成自然语言。A 示例 `jg 'Where is authentication checked before a request reaches a handler?' .`；C 示例 `/understand-chat How does the payment flow work?`；D 示例让 agent 用 `search` 找代码片段，或用 `index_path` 索引新目录；E 示例 `graphicle ask 'where is tax added to prices?'` 并核对文件与行号；F 示例 `xerj search 'how do we rotate the WAL segment'` 或 `xerj def '<已知函数名>'` 并核对 file:line；G 示例 `vesalius ask '<question>'`、`vesalius usages <target>`、`vesalius impact <file or symbol>`，核对返回文件和行区间是否真的包含答案。
4. 对同一批任务做 A/B（或七臂）：A 组不装 skill/空 MCP，B 组装 skill/开 CodeGraph/装 Understand Anything/开 Pensieve/开 Graphicle/开 XERJ/开 Vesalius，同模型同任务描述，各跑 3–5 次取中位数。CodeGraph README 做法是每臂 4 次取中位数，并在两臂都屏蔽 `codegraph` CLI，防止对照组从 PATH 摸到 CLI；D 可用 `--arms grep,guided`；E 可先 `graphicle graph extract . --code-only` 与 `graphicle graph affected '<已知核心函数>()'` 再比回答；F 注意对照臂别让 agent 从 PATH 摸到 `xerj`；G 对照臂不要注册 Vesalius MCP，记录每题 token、工具调用次数、清单漏项率。
5. 长会话另做一次：连续问 5–10 个问题，记录会话结束上下文占用，观察 CodeGraph 的残留上下文放大；C 另记首次分析成本；D 另记首次索引（含约 1.2 GB 模型下载）和钩子约 50 ms；E 另记 setup 改动文件、doctor 通过/警告、ask 行号准确性和 disconnect 后 `git status`；F 另记 autoindex 耗时（原文示例 25329 文件 158.1s）、`xerj gain` 自报数字、重排是否开启；G 另记构建耗时、索引耗时、`vesalius index` 样例规模、`usages`/`impact` 是否漏掉已知调用者、`feature-map` 答案质量是否下降。

## 怎么判断变好了
可观察指标：
- 工具调用数、wall-clock 时间、处理 token 数、`total_cost_usd`、文件读取数。
- 任务成功率（jg README 核心指标是 solved 题数）；含检索成本的总成本，不只 agent 的 Sol-only 成本。
- 定位所需检索步数 / 首次命中正确文件前读了多少文件；需要人工指路次数、agent 中途放弃或改方向次数；长会话结束残留检索上下文。
- C 额外：首次分析 token、图谱生成/更新时间、`/understand-chat` 是否引用图节点、`/understand-diff` 是否列出波及范围、队友 viewer 打开是否需重跑。
- D 额外：bench 解决率、工具调用数、token 消耗；首次索引耗时与嵌入模型下载；agent 是否真的调用 `search` 而不是回落 grep。
- E 额外：`graphicle doctor` 通过/警告；`graphicle ask` 行号是否包含答案、是否漏掉已知相关文件；`graphicle graph affected '<已知核心函数>()'` 是否列出已知调用者；接入前后回答是否变好；`disconnect` 后 `git status` 是否干净。
- F 额外：受控口径三列（output tokens/花费/解决率）、`xerj gain` 自报数字；`xerj search`/`xerj def` 的 file:line 是否包含答案、是否漏掉已知文件；autoindex 耗时与 records；重排是否开启。
- G 额外：每题 token、工具调用次数、清单漏项率；`vesalius usages <target>` 的文件清单是否覆盖你已知的调用者，`change: rename | signature | remove` 给出的文件和测试是否完整；`dependency-cycles` 是否找到已知循环；`feature-map`/`ask` 的答案质量是否下降；`outline`/`architecture` 是否可用于结构问答；`health`/`hotspots`/`unused` 的发现是否可解释；构建与索引耗时、无变更刷新是否在 0.1–0.25 秒量级。

参考基线（除 XERJ 外都来自作者自测，未独立复核；XERJ 同样自报）：
- jg：十个调优过的 Python SWE-bench 任务、一个冻结的已安装包、仓库内公开 skill 对比；Jevgrep 与无 Jev 基线同样 8/10；Sol 成本 $7.62→$5.44，降 28.6%（约 30%），含失败尝试、不含 Jev 成本；0.4.3 总成本重跑（含 Jev）降 25.8%，仍 8/10；0.5.0 保持 8/10，原生 Jev 成本比 0.4.3 那次降约 59%，合并 Sol+Jev 成本高 2–3%，作者接受为小折衷。
- CodeGraph：7 个真实开源仓库、7 种语言对照（VS Code/Excalidraw/Django/Tokio/OkHttp/Gin/Alamofire），每臂 4 次取中位数，模型标注 `claude-opus-4-8`，复测日期 2026-08-05；汇总工具调用减少 88%、快 53%、token 少 62%、成本低 44%，七个仓库文件读取都降到 0；逐仓库如 Excalidraw 2 vs 43 次工具调用、45s vs 2m42s、token 少 84%、便宜 78%；Django 只便宜 13%、Gin 成本基本持平。索引性能：Swift 编译器仓库 27k 文件约 100 秒全量、单文件改动约 4 秒重同步。反向事实：同一批 7 个仓库多轮会话，CodeGraph 会话结束残留检索上下文比读文件式代理多约 80%，VS Code 67k token 对 18k token。
- Understand Anything：全篇没有效果数据，不能给成功率/成本/速度基线；只有安装、运行、增量更新、团队共享步骤和“全库首跑消耗大量 token、大 monorepo 先限定子目录”的警告。把“补上编码智能体缺失的代码上下文”当待验证主张。
- Pensieve：该调研没有成功率/成本/速度基线；README 提供自测工具而非完成评测；作者建议小范围试用后再决定。
- Graphicle：真实终端输出 `graphicle ask` 返回 4 条摘录、598/3000 tokens，第一条 `shop/pricing.py:1-7` 的 `price_with_tax()`；setup 演示 GIF 描述（同步、建图、发现 5 个客户端、连接并列出改动文件；`doctor` 18 通过 + 1 警告）；Kubernetes（31k 文件）代码提取 3 分 18 秒 vs Graphify 0.9.88 的 26 分 38 秒（各一次探索性运行、同一台 16 CPU Linux、8 workers，同一张图 256,329 节点、1,400,392 边）；Django 上预发布版 7.5 秒 vs Graphify 0.9.77 的 72.8 秒（五次交替取中位数）；记忆侧与七个记忆系统对比，注册先于评分、同一开源模型作 reader/judge，预发布版在三个开发集“不落后”。这些主要是作者主张；速度对比是各一次探索性运行，0.1.0 引擎用 release 源码的 Linux 测试构建，与 Graphify 0.9.88 不是同一构建路径；记忆对比正文没有具体分数、数据集名称和 reader/judge 模型。
- XERJ：受控研究 8 个任务、4 种语言、每臂 16 次运行、真实 `claude -p` token 计数：纯记忆 260,916 output tokens / $11.18 / 11/16；grep agent 26,477 / $3.27 / 16/16；XERJ 9,982 / $1.58 / 16/16，即比 grep 少 2.7x output token、比纯记忆少 26x、便宜 2.1x，解决率相同；单个 Java 任务最多少 278x。另一组：模型没见过的 Rust 库，带检索 9/9、纯记忆 0/9。另有重排 FiQA nDCG@10、总花费、本地决策 AG News（12 万标注样本）准确率。全部出自 README 自身表格/案例/链接，README 自己声明“任何你无法复现的数字，包括我们的，都该存疑”，未独立复核；输入侧小节在现有材料中截断。
- Vesalius：作者自测称典型问题省约一半 token、质量基本持平；按问题类型：谁依赖此文件 −71%、循环导入 −74%、谁调用此函数 −56%、变更影响 −42%、功能在哪 −38%、架构 −33%、符号在哪被用 −8%；“功能在哪”类质量反而下降。样例索引 248 文件、9,157 符号、79,037 引用、2,611 依赖边、5.97 秒；无变更刷新 0.1–0.25 秒；首次构建下载约 47 MB、M2 上约 6 分钟。仅 Apple silicon macOS 15+，Swift 用 SwiftSyntax、TS/JS/Python 用 tree-sitter、其余词法级；只有作者自测，没有独立复核，不能直接外推。

试多久：最小试用半天内可完成。记录基线；原有六份材料和新加的 Vesalius 都强调样本小、单次运行不足以说明等价或提速；你的样本也要多次运行。C 无效果数据、D 只有自测脚本、E 速度/记忆基准多为探索性运行或细节不足、F 收益全部自报、G 仅作者自测且平台受限，先小范围验证。

## 常见坑
- jg 环境变量凭证不被采用；搜索总用 `jg auth` 保存的 provider；升级 npm 包不覆盖项目 skill，要单独重跑 `jg skill`；provider 选择需 0.3.0+；默认过滤不保证移除所有敏感信息，先用 `jg files` 核查；已知道精确符号/路径时不要用；输出是证据不是答案，不保证找全；没有 `jg upgrade`。
- CodeGraph 安装器不改当前 shell；安装后新开终端；接线不等于建索引，每项目还要 `codegraph init`；只在被直接查询时有收益，让子代理读文件就成纯开销；多轮会话残留上下文比读文件式多约 80%；watcher 被禁用要手动 `codegraph sync`；卸载会从所有已配置代理移除并卸载 CLI；数据是作者自测；文档截断，能确认只有 `codegraph_explore` 和 `codegraph serve --mcp`。
- Understand Anything 全库首跑消耗大量 token；大 monorepo 先限定子目录；原文无效果数据；多数平台 `/understand`，Codex `$understand`；非 Claude Code 脚本克隆到 `~/.understand-anything/repo` 并创建符号链接，装完重启；提交 `.ua/` 排除 `intermediate/` 和 `diff-overlay.json`；图谱 10 MB+ 用 git-lfs；viewer 只读本地、不调用 LLM、不需 API key，不等于重新生成图谱；老项目目录 `.understand-anything/` 不用迁移；本地模型配置原文只给 Ollama 指南，未给全。
- Pensieve 完整功能仅 Apple Silicon Mac；Linux/Intel Mac 只装后端、无搜索面板；原文未提 Windows；setup 不做完索引为空；首次下载约 1.2 GB；HTTP 必须显式 scope，不写=全部；stdio 的 `auto` 才按 agent 工作目录收窄；未索引仓库会告诉 agent 改用 grep，不返回别的仓库代码；默认索引范围宽，先确认愿意进索引；所有数据在 `~/.pensieve`，删掉即重来；默认只暴露 11 个工具，但工具描述每轮发给 agent；`claude-hook` 每次 Edit/Write 约 50 ms，不需要时 `pensieve integrate claude --remove`；没有效果数据。
- Graphicle 平台仅 macOS/Linux；Windows 原生无构建，WSL2 未测试；版本仅 0.1.0，团队版私有预览；速度/记忆基准证据弱；`setup` 会改 `.mcp.json`、`.claude/settings.local.json`、`AGENTS.md`、Git hooks、`~/.codex/config.toml` 等，先备份；`disconnect` 撤销后用 `git status` 核对；`graphicle graph extract` 不带 `--code-only` 会外发文档和图片；`ask` 未配模型只显示证据；记忆要人工批准，且与函数绑定会过期；代码图谱引擎是 Graphify 的 Rust 移植，`setup` 会问是否切换某个仓库，逐文件备份，从不删除 `graphify-out/`。
- XERJ `--insecure` 是明确信任边界：关闭 TLS 和 API key，任何能访问端口的人都是超级用户，可读删所有索引（含 `/_memory`）；只在单用户开发机用；新节点只绑 127.0.0.1；autoindex 不读 `xerj.toml` 的 key，开启认证必须 `--api-key` 或 `XERJ_API_KEY`，否则 401；rerank 默认关闭，开了才外发；本地替代 `systemone`/`_decide` 需标注样本；`xerj mcp` 自己不起节点；桌面图标启动的 MCP host 不继承 PATH，`command` 用绝对路径；没有内置定时/事件触发编排；收益数字全部自报；收益与模型是否见过强相关；神经嵌入要预置约 90 MB 模型文件；工具 schema 在仓库外，输入侧小节截断。
- Vesalius 仅 Apple silicon macOS 15+，Windows/Linux 目前无法使用；构建 CLI 需 Xcode 26，首次构建下载约 47 MB、M2 约 6 分钟；在 home 目录启动 Claude Code 会把整个 home 建成索引，并在该索引下所有未建索引项目里胜出，出问题去 `Indexes` 删掉或用 `--repo` 固定；查询默认先刷新索引，`--no-refresh` 关闭，未索引仓库会报 `has not been indexed yet`；长期排除用 `.vesaliusignore`，`vesalius index --exclude` 只对当次有效；`VESALIUS_MCP_PROFILE` 决定工具暴露，`default` 前置 `usages`/`feature_map`（每会话常驻约 900 tokens，已计入 benchmark 总量），`lean` 全部按需，`full` 加 `repo_report`；解析深度按语言不同；别把词法级结果当完整调用图；“功能在哪”类问题质量反而下降，先做 A/B；作者自测省约一半 token、质量基本持平，没有独立复核。
- 样本小：jg 只覆盖 10 个 Python SWE-bench 任务、一个冻结安装包和仓库自带 skill；CodeGraph 7 个仓库作者自测；Understand Anything 无效果数据；Pensieve 无效果数据；Graphicle 速度/记忆基准证据弱；XERJ 受控研究和收益统计自报；Vesalius 仅作者自测且平台受限。都不能直接外推。
- 不要一次接满所有代理；先一个代理试，便于回退和判断污染。

## 证据与来源
本篇合并七份调研报告：《dzhng/jevgrep》、《colbymchenry/codegraph》、《Egonex-AI/Understand-Anything》、《TedHaley/pensieve》、《Graphicle-AI/graphicle》、《xerj-org/xerj》与《haplollc/Vesalius》。

jg 部分：安装、认证、`jg skill`、`jg files`、提问检索、`--exclude`、升级步骤来自《dzhng/jevgrep》正文中 README 的可复制命令与说明。成功率与成本数据来自 README 自报，未独立复核：十个调优过的 Python SWE-bench 任务、一个冻结安装包、仓库内公开 skill 对比；Jevgrep 与无 Jev 基线同样 8/10；Sol 成本 $7.62→$5.44，降 28.6%（约 30%），含失败尝试、不含 Jev 成本；0.4.3 总成本重跑（含 Jev）降 25.8%，仍 8/10；0.5.0 保持 8/10，原生 Jev 成本比 0.4.3 那次降约 59%，合并 Sol+Jev 成本高 2–3%，作者接受为小折衷。作者限定：单次运行观察，不构成统计等价或速度改善证明；封面“~30% lower cost”是较旧 Sol-only 口径，README 后修正为总成本 25.8%；“Same intelligence”只是这 10 题两边 8/10。可复现方法学文件：`evals/results/relevance-threshold-2026-09-27.md`、`total-cost-2026-09-28.md`、`combined-cost-research-2026-09-28.md`、`speed-2026-09-28.md`。隐私/平台/凭证/版本/输出是证据不是答案等风险见上。哪些只是作者主张：把陌生代码库定位从试错探索变成一次语义检索、减少定位步数，是 README 定位与主张；可复现的只有方法学文件与对比口径。

CodeGraph 部分：安装、接线、`codegraph init`、`status`、自动同步、手动 `sync`、`upgrade`、`uninstall`、`uninit` 来自《colbymchenry/codegraph》正文中 README 的可复制命令。效果数据全部作者自测：7 个真实开源仓库、7 种语言对照（VS Code/Excalidraw/Django/Tokio/OkHttp/Gin/Alamofire），每臂 4 次取中位数，模型 `claude-opus-4-8`，复测 2026-08-05；汇总工具调用减少 88%、快 53%、token 少 62%、成本低 44%，七个仓库文件读取都降到 0；逐仓库如 Excalidraw 2 vs 43 次、45s vs 2m42s、token 少 84%、便宜 78%；Django 只便宜 13%、Gin 成本基本持平。方法学：同仓库、同问题、同模型，WITH vs WITHOUT 空 MCP，每臂 4 次取中位数，两臂都屏蔽 `codegraph` CLI，28 次 WITHOUT 全部拦截、0 污染；此前未屏蔽时 28 次有 26 次通过 Bash 摸到 CLI。索引性能：Swift 编译器 27k 文件约 100 秒全量、单文件改动约 4 秒重同步；2 核 6GB VPS 上 Linux 内核 70k 文件、200 万符号、640 万关系 12 分钟索引完成。作者披露反向事实：降低吞吐，但上下文占用更贵；同一批 7 个仓库多轮会话残留检索上下文比读文件式多约 80%，VS Code 67k token 对 18k token。只是作者主张：所有性能/成本数字无第三方复现；复测日期和模型版本是 README 标注；Rust 内核“逐字节一致”“比最快竞品快 2–7 倍”只有作者陈述；README 有产品推广成分。文档截断：CLI Reference、Configuration、MCP Tools、Library Usage 无法照抄。

Understand Anything 部分：安装插件、非 Claude Code 一行脚本、各平台安装、`/understand`、`--language`、`--auto-update`、Dashboard、chat/diff/explain/onboard/domain/knowledge、`.ua/` 提交与 git-lfs、viewer、升级卸载来自《Egonex-AI/Understand-Anything》正文。技术路线：Tree-sitter 确定性结构抽取 + LLM 语义层，多智能体流水线，file-analyzer 最多 5 并发、每批 20–30 文件；产物 `.ua/knowledge-graph.json`，老项目 `.understand-anything/`。平台值、Copilot CLI、Cursor/VS Code 自动发现、Kiro 用法来自该报告。全篇没有效果数据，不能给成功率/成本/速度基线；只有“补上编码智能体缺失的代码上下文”这一待验证主张，以及“全库首跑消耗大量 token、大 monorepo 先限定子目录”警告。隐私：可指向本地模型但原文只给 Ollama 集成指南，未给具体配置；viewer 只从本地磁盘只读服务、不调用 LLM。哪些只是作者主张：整库知识图谱、架构导览、业务域映射、onboarding 能改善上下文供给，来自定位与主张；可复现的只有命令、产物路径和 viewer 行为。

Pensieve 部分：安装脚本、手动安装、`pensieve integrate` 系列、`claude mcp add` 系列、`pensieve setup` 系列、scope、默认 11 工具与扩展工具、`~/.pensieve/settings.json` 设置表、bench 四条命令来自《TedHaley/pensieve》正文。技术栈：`Qwen3-Embedding-0.6B` 做嵌入，SQLite trigram 全文 + turbovec 向量；文本/Markdown/Office/PDF/邮件/代码按内容索引，图片/音视频只按文件名索引且不上图。安全：密钥类文件永不索引，由 `exclude_files` 控制；数据在 `~/.pensieve`，删掉即重来。平台：完整能力仅 Apple Silicon Mac，Linux/Intel Mac 只能装后端、无搜索面板；原文未提 Windows。成本：首次下载约 1.2 GB 嵌入模型；`claude-hook` 每次 Edit/Write 约 50 ms。该报告没有成功率/成本/速度基线；bench 是自测工具，不是已完成第三方评测。哪些只是作者主张：把满盘 grep 换成先语义搜索能改善定位，是 README 定位与主张；可复现的只有命令、配置、产物路径和 bench 脚本。正文在“对应的研究问题”一节截断，更细结论无法照抄。

Graphicle 部分：安装、`graphicle setup`、`doctor`、`ask`、`config set model`、`graph extract . --code-only`、`graph affected`、`open`、`context --workspace`、`disconnect`、各客户端接入位置、数据位置与边界来自《Graphicle-AI/graphicle》正文。技术路线：Rust 单程序、tree-sitter 解析代码图谱、不调用模型；项目记忆和会话捕获；一个 MCP server 返回带引用摘录（精确到文件和行号，受 token 预算限制）。效果证据：`graphicle ask` 真实终端输出 4 条摘录、598/3000 tokens，第一条 `shop/pricing.py:1-7` 的 `price_with_tax()`；setup 演示 GIF 描述（同步、建图、发现 5 个客户端、连接并列出改动文件；`doctor` 18 通过 + 1 警告）；Kubernetes 31k 文件代码提取 3 分 18 秒 vs Graphify 0.9.88 的 26 分 38 秒（各一次探索性运行、同一台 16 CPU Linux、8 workers，同一张图 256,329 节点、1,400,392 边）；Django 预发布版 7.5 秒 vs Graphify 0.9.77 的 72.8 秒（五次交替取中位数）；记忆侧与七个记忆系统对比，注册先于评分、同一开源模型作 reader/judge，预发布版在三个开发集“不落后”。只是作者主张：速度对比各一次探索性运行，0.1.0 引擎用 release 源码的 Linux 测试构建，与 Graphify 0.9.88 不是同一构建路径；记忆对比正文没有具体分数、数据集名称和 reader/judge 模型，细节推到 docs/benchmarks.md；“记忆绑定到代码符号、其他地方编辑通常不影响”给了规则链接但正文未展开。平台/版本/上限/setup 改动/ask 配置/完整 extract 外发等风险见上。与已有做法关系：Claude Code `setup` 接仓库 `.mcp.json`，`.claude/settings.local.json` 装 hooks 做会话捕获，并把 Claude Code 搜索优先指向代码图谱；Cursor 接 `~/.cursor/mcp.json`，不做会话捕获；代码图谱引擎是 Graphify 的 Rust 移植，随 Graphify 版本同步并在文件头与 NOTICE 署名，`setup` 会问是否切换某个仓库，逐文件备份，从不删除 `graphify-out/`。

XERJ 部分：安装、起节点、`xerj autoindex`、`xerj init`、`xerj search`/`def`、ES DSL、`xerj mcp` 与 MCP 配置、13 工具清单、提示词、参考编码循环、`xerj gain`、基准复现、源码构建、rerank 与 `systemone`/`_decide`、`xerj feedback` 来自《xerj-org/xerj》正文。技术路线：单静态二进制、本地部署（Apache-2.0、Rust），对外说 Elasticsearch REST API，默认 `localhost:9200`；`xerj autoindex` 用 tree-sitter 做 AST 感知解析，产出带符号和行号记录，也按类型索引文档、日志、PDF、SQLite、CSV、Office/EPUB/Jupyter/man page/mail。效果证据全部 README 自报：受控研究 8 任务、4 语言、每臂 16 次、真实 `claude -p` token 计数——纯记忆 260,916 output tokens / $11.18 / 11/16；grep agent 26,477 / $3.27 / 16/16；XERJ 9,982 / $1.58 / 16/16（比 grep 少 2.7x output token、比纯记忆少 26x、便宜 2.1x，解决率相同；单个 Java 任务最多少 278x）；另一组模型没见过的 Rust 库带检索 9/9、纯记忆 0/9；另有重排 FiQA nDCG@10、总花费、本地决策 AG News（12 万标注样本）准确率。索引示例 593 datasets、25329 files、158.1s、83103 records live、790 junk records。README 自己声明“任何你无法复现的数字，包括我们的，都该存疑”，未独立复核；输入侧小节截断。可复现的只有安装/启动/索引/MCP 配置/提示词/基准命令，以及 `xerj gain` 自统计口径；工具 schema 在 `xerj.org/docs/agents/schemas/mcp-tools.json`。哪些只是作者主张：把读文件换成先查索引能减少 output token、让小模型+检索超过靠记忆的贵模型，来自 README 定位与主张，收益数字全部自报。风险：`--insecure` 关闭 TLS 与 API key，任何能访问端口的人都是超级用户，可读删所有索引（含 `/_memory`）；新节点只绑 127.0.0.1；rerank 默认关闭，开了外发；原文没有定时/事件触发编排，只有增量重索引（内容字节级未变跳过，常见编辑-重跑/CI >95% 文件未变）。平台：Linux/macOS/Windows x86-64 或 arm64。与已有做法关系：`xerj init` 是 wire XERJ into Claude Code / Cursor (MCP + skill)，给 host 补外部语料检索后端，与文件读取/grep 是替代关系。

Vesalius 部分：安装、`vesalius index`、`claude mcp add --scope user vesalius -- vesalius mcp`、`vesalius mcp --repo`、5 个只读工具、29 个 CLI 命令、`VESALIUS_HOME`/`VESALIUS_REPO`/`VESALIUS_MCP_PROFILE`/`VESALIUS_TRACE`、忽略规则、仓库选择顺序、VS Code 扩展、Mac app 回路来自《haplollc/Vesalius》正文。技术路线：扫描仓库，Swift 用 SwiftSyntax 全语法树，TypeScript/JavaScript、Python 用 tree-sitter，其余语言词法级；解析声明、调用、引用，按置信度链接成本地 SQLite 图；5 个只读工具 `usages`、`feature_map`、`outline`、`architecture`、`dependency_cycles`。效果证据：作者自测称典型问题省约一半 token、质量基本持平；按问题类型谁依赖此文件 −71%、循环导入 −74%、谁调用此函数 −56%、变更影响 −42%、功能在哪 −38%、架构 −33%、符号在哪被用 −8%；“功能在哪”类质量反而下降。样例索引 248 文件、9,157 符号、79,037 引用、2,611 依赖边、5.97 秒；无变更刷新 0.1–0.25 秒；首次构建下载约 47 MB、M2 约 6 分钟；`ask` 等 CLI 输出 file:line。限制：仅 Apple silicon macOS 15+，构建 CLI 需 Xcode 26 和 git，Windows/Linux 无法使用；解析深度按语言不同；只在 Apple silicon Mac 上验证。哪些只是作者主张：预计算结构图并以工具供给 agent 能改善结构性问题，来自 README 定位与主张；所有 token/质量/耗时数据都是作者自测，没有独立复核；正文在研究问题第 2 点“工具暴露策略”处截断，更细的 benchmark 总量与工具检索细节无法照抄。

## 依据的调研

- [dzhng/jevgrep](../research/radar/2026-10-01/31-dzhng-jevgrep.md)：值得一试，在编码智能体所在的仓库里装 jevgrep CLI 与配套 skill（npm install -g @dzhng/jevgrep → jg auth → jg skill），把"知道要理解什么行为但不知道代码在哪"这类定位工作交给 jg，已知精确符号或路径时仍用直接读/rg；理由是它给出了可复制的安装、认证、排除与调用步骤，并有单次 SWE-bench 对比数据（10 题中同样解决 8 题、成本下降约 25%–29%），但证据是单次运行且会把源码发往外部 provider，所以先小范围试。
- [colbymchenry/codegraph](../research/radar/2026-10-02/78-colbymchenry-codegraph.md)：值得一试，可以在一到两个真实代码仓库上小范围试装 CodeGraph，用同一个架构问题做「装/不装」对照来验证它是否真的减少工具调用与成本；它的安装、接线、建索引三步都是可照抄的命令，但效果数据全部来自作者自测，且作者自己承认多轮会话的上下文占用反而更高，所以先试不直接采用。
- [Egonex-AI/Understand-Anything](../research/radar/2026-10-02/524-egonex-ai-understand-anything.md)：值得一试，在一个中等规模、你已有正确答案可对照的代码库上小范围试装这个 Claude Code 插件：先用子目录范围跑一次 `/understand`，再用 `/understand-chat` 和 `/understand-diff` 验证它是否真的补上了编码智能体缺失的代码上下文；理由是原文给出了完整可复制的安装、运行、增量更新和团队共享步骤，但全篇没有效果数据，且明确警告全库首跑会消耗大量 token，所以要控制规模再决定是否铺开。
- [TedHaley/pensieve](../research/radar/2026-10-12/2730-tedhaley-pensieve.md)：值得一试，建议小范围试用：在 1–2 个中型以上代码库上装 Pensieve，把 Claude Code/Cursor 等通过 MCP 接上并加上 instructions block 与两个 hook，再用仓库自带的 bench 对比 grep 与 guided 两臂的任务解决率、工具调用数和 token 消耗；原因是 README 给出了完整的安装、MCP 连接、作用域、钩子和评测命令，可照做，但全部效果数据都是作者自测，且完整能力（搜索面板）仅限 Apple Silicon Mac。
- [Graphicle-AI/graphicle](../research/radar/2026-10-15/3434-graphicle-ai-graphicle.md)：值得一试，先在一个可回滚的真实仓库里照 README 跑通 brew 安装、`graphicle setup`、`graphicle doctor` 和 `graphicle ask`，人工核对返回摘录的文件行号是否准确，再决定是否常驻；理由是它把代码图谱与项目记忆用标准 MCP 一次性接进 Claude Code/Codex/Cursor 等现有智能体，安装、接入、自检、撤销的步骤在原文中完整可照做，但项目仅 0.1.0、只支持 macOS/Linux，速度与记忆的基准多为单次探索性运行。
- [xerj-org/xerj](../research/radar/2026-10-16/3898-xerj-org-xerj.md)：值得一试，建议在一台单人开发机上小范围试：装单二进制、起本地节点、对模型没见过的私有/内部代码库 autoindex 后接入 Claude Code 的 MCP，用“先检索同类解法再写码”的流程和 grep 对照跑 3-5 个任务；之所以给 try 而不是 adopt，是因为原文确实给了可直接复制的安装、启动、索引、MCP 配置和提示词，但全部收益数字都来自项目自报的案例研究与用户反馈，无法独立复核，且 --insecure 有明确信任边界。
- [haplollc/Vesalius](../research/radar/2026-10-24/6415-haplollc-vesalius.md)：值得一试，在 Apple silicon Mac 上按 README 的四步走（scripts/install-cli.sh → vesalius index → claude mcp add --scope user vesalius -- vesalius mcp → 照常提问）先挑一个有测试的中等仓库做 A/B 小范围试用，用每题 token 数、工具调用次数和清单漏项率判断是否值得推广；作者自测显示典型问题省约一半 token、质量基本持平，但仅支持 Apple silicon macOS、各语言解析深度差别很大、且“功能在哪”类问题质量反而下降，所以先试再定。
