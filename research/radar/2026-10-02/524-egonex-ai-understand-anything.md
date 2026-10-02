# Egonex-AI/Understand-Anything

- 结论：**值得一试**。在一个中等规模、你已有正确答案可对照的代码库上小范围试装这个 Claude Code 插件：先用子目录范围跑一次 `/understand`，再用 `/understand-chat` 和 `/understand-diff` 验证它是否真的补上了编码智能体缺失的代码上下文；理由是原文给出了完整可复制的安装、运行、增量更新和团队共享步骤，但全篇没有效果数据，且明确警告全库首跑会消耗大量 token，所以要控制规模再决定是否铺开。
- 原文：https://github.com/Egonex-AI/Understand-Anything
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T05:27:26.345Z

## 是什么

Understand Anything 是一个 Claude Code 插件（同时可装到 Codex、Cursor、Copilot、Gemini CLI、OpenCode、Trae、Kiro 等十余个 AI 编码平台），用多智能体流水线把代码库解析成可交互知识图谱：每个文件、函数、类、依赖都是图上的节点，可在 Dashboard 里点选、搜索、提问，并获得英文/中文的白话摘要、关系说明和按依赖顺序生成的导览。

除代码外还有两条支线：`/understand-domain` 把代码映射到业务域、流程和步骤；`/understand-knowledge` 把 Karpathy 式 LLM wiki 解析成带社区聚类的力导向知识图（从 `index.md` 抽 wikilinks 和分类，再由 LLM 智能体发现隐式关系、抽取实体与主张）。

技术路线是 Tree-sitter（确定性结构抽取：imports、exports、函数/类定义、调用点、继承，预解析成 `importMap`）+ LLM（语义层：白话摘要、标签、架构层归属、业务域映射、导览、语言概念提示）的混合分工，产物落在 `.ua/knowledge-graph.json`（老项目沿用 `.understand-anything/`）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：已装 Claude Code（原生路径）或某个受支持的 CLI/IDE；有 token 预算或订阅（大项目首跑消耗显著）；需要离线/私有化时可把平台指向本地模型（原文只指向 Ollama 集成指南，未给具体配置）。

1. 安装插件（Claude Code 原生方式）：

```bash
/plugin marketplace add Egonex-AI/Understand-Anything
/plugin install understand-anything
```

2. 非 Claude Code 平台用一行安装脚本。前提：macOS / Linux，脚本会把仓库克隆到 `~/.understand-anything/repo` 并创建对应平台的符号链接；装完要重启 CLI/IDE。

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

3. 调用前缀要先确认。多数平台用斜杠命令 `/understand`，但 **Codex 用 `$`**（`$understand`）。如果平台不认任何前缀，直接说白话：*"Use the understand skill to analyze this project."*

4. 首次分析代码库。前提：大项目建议在 token 套餐/订阅下跑，或先用本地模型做初始化；后续跑默认是增量的，只重分析改动文件。

```bash
/understand
```

结果写入 `.ua/knowledge-graph.json`（项目里若已有 `.understand-anything/` 目录则继续用它，无需迁移）。流水线会编排 5 个智能体：`project-scanner`（发现文件、识别语言与框架）、`file-analyzer`（抽函数/类/import，产节点和边）、`architecture-analyzer`（识别架构层）、`tour-builder`（生成导览）、`graph-reviewer`（校验图完整性与引用完整性，默认内联运行，加 `--review` 走完整 LLM 审查）。file-analyzer 并行执行，最多 5 个并发 worker、每批 20–30 个文件。

5. 控制规模与语言。大 monorepo 先限定子目录；需要中文产物时加 `--language`：

```bash
# Scope to a subdirectory (for huge monorepos)
/understand src/frontend

# Generate Chinese content（知识图节点描述和 Dashboard UI）
/understand --language zh

# Supported languages: en (default), zh, zh-TW, ja, ko, ru
```

`--language` 影响知识图节点摘要与描述、Dashboard UI 标签按钮提示、导览说明。项目首次运行且未传 `--language`、也无已存语言时，`/understand` 会检测你对话所用的语言；非英语会先请你确认或覆盖，选择存到 `.ua/config.json` 并在后续复用。

6. 开启每提交自动更新（事件触发）。

```bash
# Auto-update on every commit via a post-commit hook
/understand --auto-update
```

7. 打开 Dashboard 可视化探索。

```bash
/understand-dashboard
```

8. 按需使用其余命令：

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

`/understand-domain` 额外增加第 6 个智能体 `domain-analyzer`（抽业务域、流程、步骤）；`/understand-knowledge` 增加第 7 个 `article-analyzer`（从 wiki 文章抽实体、主张、隐式关系）。

9. 把图提交进仓库，让队友跳过流水线（适合 onboarding、PR review、docs-as-code）。**提交除 `intermediate/` 和 `diff-overlay.json` 之外的 `.ua/` 全部内容**（这两个是本地草稿），老项目把目录名换成 `.understand-anything/`：

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

10. 让没装 Claude Code 的同事也能看图。前提：只要求 Node.js >= 18，不需要 Claude Code、不需要 LLM、不需要 API key；项目目录里要有已提交的数据目录（`.ua/` 或老的 `.understand-anything/`）。全程只从本地磁盘只读服务，不调用 LLM，数据不出本机。

```bash
npx https://github.com/Egonex-AI/Understand-Anything/releases/latest/download/understand-anything-viewer.tgz /path/to/analyzed/project
```

终端会打印带 token 的 URL（`http://127.0.0.1:5173/?token=…`）并在浏览器打开完整交互 Dashboard。从 clone 起的等价做法：

```bash
pnpm install && pnpm --filter @understand-anything/core build
GRAPH_DIR=/path/to/analyzed/project pnpm dev:dashboard
```

11. 升级与卸载：

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

12. 自己改代码时：fork 仓库 → `git checkout -b feature/my-feature` → `pnpm --filter @understand-anything/core test` → 提 PR；大改动先开 issue 讨论。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：原文给出一批通常不会被想到交给 AI 的编码相关任务——把整库解析成可点选的知识图（而非只做补全）、按依赖顺序自动生成架构导览、把代码映射到业务域/流程/步骤、对当前改动做 diff 影响分析（提交前看涟漪效应）、为新成员自动生成 onboarding 指南、把 Karpathy 式 LLM wiki 变成带社区聚类的知识图并抽取实体与主张。另有细节能力：按架构层（API / Service / Data / UI / Utility）自动分组并配色图例、在上下文中解释 12 种编程模式（泛型、闭包、装饰器等）、按角色（初级开发 / PM / 高级用户）自适应调整 Dashboard 细节层级。

**2. 任务匹配**：原文明确的分工原则是「静态分析做确定性的、LLM 做语义的」——Tree-sitter 保证同一份代码每次产出相同的边，LLM 补上「这个文件是干什么用的」；增量更新也靠 Tree-sitter 指纹做变更检测。协作方式是多智能体流水线（5/6/7 个专用 agent），file-analyzer 并行最多 5 并发、20–30 文件一批。模型侧：默认走平台自带模型，隐私或企业场景可把平台指向 Ollama 等本地模型提供方。工具形态上，图谱被当作纯 JSON 产物，可提交、可 git-lfs 跟踪、可用无 LLM 的只读 viewer 打开——即「生成一次、多方消费」。

**3. 条件供给**：需要给到的是——项目目录（可只给子目录以控制范围）；token 预算（原文明确警告首跑在大项目上会消耗大量 token，建议用套餐/订阅或本地模型做初始化）；语言偏好（首次非英语对话会请求确认，结果落到 `.ua/config.json` 复用）；Node.js >= 18（viewer 前提）；把 `.ua/` 提交到仓库以供团队复用；10 MB+ 图谱配 git-lfs。反馈环节由 `graph-reviewer` 承担（校验图完整性与引用完整性，`--review` 触发完整 LLM 审查）。

**4. 主动推进**：明确的事件驱动机制是 `/understand --auto-update`——post-commit hook 在每次提交后增量修补图谱，「每次提交都带着匹配的图落地」；不装 hook 也可在发版前手动重跑 `/understand`。持续性是靠增量做的：默认只重分析自上次运行以来变化的文件，因而后续 token 消耗远低于首跑。

**5. 效果验证**：原文没有给出任何量化效果数据或对照实验，只有一句情感化表述「knowing this saves people time is what made it worth building」。可用的内在质量信号只有 `graph-reviewer` 的完整性与引用完整性校验（默认内联，`--review` 走完整 LLM 审查）。因此这一项需要试用者自建指标，原文不提供。

## 与已有做法的关系

- **Claude Code（adopt）**：本项是 Claude Code 原生插件，直接挂在已有工作流上，作用是给编码智能体补代码上下文，而非替换它。若手册里已把 Claude Code 列为采用项，这是它的一个可插拔增强层。
- **Cline / Cursor / OpenCode / Hermes / OpenClaw（均为 watch）**：原文列出这些平台均受支持（`install.sh <platform>`，Cursor 与 VS Code Copilot 走自动发现），可作为给这些尚在观察中的平台补上下文的现成手段。
- **GitHub Copilot（drop）**：注意与清单状态不一致——原文声称支持 VS Code + GitHub Copilot（v1.108+，自动发现）与 Copilot CLI（`copilot plugin install ...`）。若清单把 Copilot 判为 drop 是基于「补不了上下文」之类理由，此处可能需要复核。
- **Trendshift（watch）**：README 顶部嵌了 Trendshift 仓库徽章，属于同源渠道的曝光，不构成采用依据。

除以上外，清单中没有与本项直接对应的做法条目。

## 证据与局限

**原文给出的具体内容**：完整的安装命令（Claude Code 原生、一行脚本、Windows PowerShell、Copilot CLI、Kiro）、可复制的全部斜杠命令及参数（`--language`、`--auto-update`、`--review`、子目录限定）、数据目录与配置文件路径（`.ua/knowledge-graph.json`、`.ua/config.json`、legacy `.understand-anything/`）、.gitignore 与 git-lfs 的具体写法、无 LLM viewer 的 npx 命令、多智能体分工表与并发参数（5 worker、20–30 文件/批）、支持语言列表（en/zh/zh-TW/ja/ko/ru）、一个社区案例（Better Stack 在 YouTube 的 walkthrough）和一个示例仓库（GoogleCloudPlatform/microservices-demo 已提交图谱）。

**只属作者主张、无独立证据**：把图谱提交后「队友跳过流水线」的实际节省、导览「按正确顺序学习代码库」的效果、Dashboard 按角色自适应的实用性、「Stop reading code blind」这类宣传语。初筛数据给的 star 数（84883）来自外部指标，README 本身未提供，也未经本报告核实，不能当作质量证据。

**明确的适用条件与风险**：
- 首跑 `/understand` 在大项目上 token 消耗显著，原文自己建议用套餐或本地模型做初始化；
- 本地模型只是「指向 Ollama 集成指南」的方向性说法，原文未给可照抄的配置；
- 大 monorepo 必须靠子目录限定或分次跑，否则可能一次吃掉大量预算；
- 10 MB+ 图谱需要 git-lfs，否则仓库会变重；
- 项目里同时存在 `.ua/` 与 legacy `.understand-anything/` 两套目录语义，接入老项目时要先确认用哪个；
- 生成物会写进仓库（含 LLM 产出的语义描述），团队需要就「提交哪些、是否含敏感代码摘要」先达成一致。

**证据类型**：全部来自仓库 README 这一份自述材料。没有第三方评测、没有前后对比数据、没有失败案例，也没有关于图谱准确率的任何数字。

## 怎么试、怎么验证

**最小试用方式**（目标：两小时内能判断值不值得继续）：
1. 挑一个你本人已熟悉、且能自己判断答案对错的仓库，规模控制在中等；**首次不要跑全库**，先限定子目录：`/understand src/<你熟悉的模块>`。
2. 用一次真实任务做对照：拿 3 个你已知答案的问题问它，例如 `/understand-chat How does the payment flow work?`，逐条判断回答是「对」「部分对」还是「编造」。
3. 拿一次真实改动跑 `/understand-diff`，看它指出的受影响模块与你自己判断的重合度。
4. 跑一次 `/understand-explain <你最熟的那个文件>`，看摘要是否达到能交给新人的水平。
5. 让一位没装 Claude Code 的同事用 `npx .../understand-anything-viewer.tgz <项目路径>` 打开图，问他能否在不问你的情况下说出这个系统的三个主要模块。
6. 只有前 5 步都过得去，再决定是否上 `/understand --auto-update` 和把 `.ua/` 提交进仓库。

**判断有没有改善的指标**（原文没给，需自测；每条都建议留下基线对照）：
- 首跑成本：耗时 + token 消耗（这是决定能否铺开的关键约束）。
- 增量成本：改动一个文件后重跑的成本，以及 `--auto-update` 挂钩后每次提交的附加开销。
- 问答正确率：上面的 3 道已知答案题里，正确/部分正确/错误的比例。
- 图质量：`graph-reviewer` 报告的完整性与引用完整性校验结果（加 `--review` 看完整 LLM 审查意见）。
- 影响面召回：`/understand-diff` 对真实改动的受影响模块清单，漏报与误报各几个。
- 人的时间：新人上手到能独立改第一个 bug 的天数、PR review 中定位受影响文件的时间，前后对比。

**止损信号**：首跑成本超出预算上限、问答正确率明显低于你自己读代码的准确度、`/understand-diff` 对熟悉模块频繁漏报——出现任一条就先停在 study 阶段，不要写进手册推广。
