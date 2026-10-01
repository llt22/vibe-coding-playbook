# cursor/plugins

- 结论：**值得研读**。把 cursor/plugins 当作“编码智能体可接入哪些外部系统、插件应长成什么样”的结构参考来读，而不是当作可照做的教程——README 只给了目录与 manifest 约定和一张插件清单，没有任何安装命令、配置样例或提示词，照抄不了具体操作。
- 原文：https://github.com/cursor/plugins
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T17:26:53.819Z

## 是什么

Cursor 官方插件市场仓库（github.com/cursor/plugins，MIT，9,277 stars / 今日 157）。README 说明这是一个**多插件市场仓库**：每个插件是根目录下的独立目录，各自带 `.cursor-plugin/plugin.json` 清单；根目录的 `.cursor-plugin/marketplace.json` 列出全部插件。

内容主体是一张插件表，约 80+ 条，按 Category 分四类：Utilities、Developer Tools、Productivity、Integrations。Integrations 覆盖 SaaS 与业务系统（GitHub、Playwright、Gmail、Google Drive/Calendar/Docs/Sheets/Slides、Salesforce、HubSpot、Zoom、X、Notion 类笔记工具、财务/交易类、招聘类、营销类等）。Developer Tools 里有若干工作流插件：`thermos`（分支安全/正确性审计 + 并行 subagent）、`orchestrate`（大任务 fan-out 到并行云 agent，含 planner/worker/verifier）、`ralph-loop`、`pstack`、`advisor`、`agent-compatibility`、`cli-for-agent`、`continual-learning`。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提说明：原文只给出仓库结构与清单约定，没有给安装命令、manifest 字段样例、SKILL.md frontmatter 字段或任何提示词。以下第 1–3 步是原文明确写出的结构事实，第 4 步是需要自行到 Cursor 官方文档补齐的部分，原文未提供。**

1. 按原文给的目录布局组织一个插件（原文“Repository structure”一节）：

```
plugins/
├── .cursor-plugin/
│   └── marketplace.json       # Marketplace manifest (lists all plugins)
├── plugin-name/
│   ├── .cursor-plugin/
│   │   └── plugin.json        # Per-plugin manifest
│   ├── skills/                # Agent skills (SKILL.md with frontmatter)
│   ├── rules/                 # Cursor rules (.mdc files)
│   ├── mcp.json               # MCP server definitions
│   ├── README.md
│   ├── CHANGELOG.md
│   └── LICENSE
└── ...
```

2. 每个插件写自己的 `.cursor-plugin/plugin.json` 清单；仓库根的 `marketplace.json` 负责把全部插件列出来（多插件市场形态）。
3. 插件内部四类内容各就各位：`skills/` 放 SKILL.md（带 frontmatter）；`rules/` 放 `.mdc` 规则文件；`mcp.json` 放 MCP server 定义；README/CHANGELOG/LICENSE 配套。
4. 署名规则（原文明确）：作者名要与每个插件 `plugin.json` 里的 `author.name` 一致；Cursor 自己在清单中写的是 `plugins@cursor.com`。
5. 安装与启用具体某个插件的操作步骤：**原文未给出，只能另行查阅 Cursor 官方文档**，不要凭本 README 推断。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：插件表本身就是一份“AI 可代劳的任务—系统”对照表。按原文描述可直接读出的能力包括：搜索/阅读/起草/管理邮件（Gmail）、搜索事件与安排会议（Google Calendar）、读写与追加表格数据（Google Sheets）、创建/编辑/渲染演示文稿（Google Slides）、搜索与更新 CRM 记录（Salesforce、HubSpot、Attio）、在真实浏览器里导航/点击/截图/测试（Playwright）、管理仓库 issue/PR/Actions（GitHub）、搜索会议记录与转录（Zoom、Otter、Fireflies、Fathom、Circleback）、查询费用与差旅（Brex、Navan）、跑 SQL 查数据集（BigQuery）、管理功能开关与实验（Statsig）。

**2. 任务匹配**：仓库用 Category 把插件分为 Utilities / Developer Tools / Productivity / Integrations，可作为“任务类型 → 工具类型”的粗分类依据。开发类插件里出现明确的分工模式：`orchestrate` 描述为把大任务 fan-out 到并行云 agent，配 planner、worker、verifier 和结构化交接；`thermos` 描述为并行 subagent + 编排。这指向“大任务 → 多角色并行”的匹配思路，但 README 未给具体触发或配置方式。

**3. 条件供给**：仓库结构直接回答了“要给智能体提供什么”——`mcp.json`（MCP server 定义，即工具与权限入口）、`skills/`（SKILL.md，技能说明）、`rules/`（.mdc，约束条件）。这三类正是要供给智能体的工具、知识和边界。

**4. 主动推进**：有三个插件名/描述与持续性或触发式工作相关：`continual-learning`（用高信号要点对 AGENTS.md 做增量、transcript 驱动的记忆更新）、`ralph-loop`（Iterative self-referential AI loops using the Ralph Wiggum technique）、`orchestrate`（并行云 agent 编排）。README 未说明它们由时间、事件还是状态触发，也未给运行方式。

**5. 效果验证**：`agent-compatibility`（CLI 支持的仓库兼容性扫描 + 审计 startup、validation、docs 是否与现实一致）、`thermos`（深度安全/正确性审计、严格代码质量评分表、可选 merge-ready PR 流程）、`advisor`（在重大决策前、卡住时、宣布完成前咨询更强的模型）都是把“检查”做成独立环节的形态。README 没有给出任何可量化的验证指标。

## 与已有做法的关系（对照给出的清单条目）

- **Cursor（tool，watch）**：本仓库就是 Cursor 官方的插件生态入口，补充了 Cursor 这一条目在“可扩展性 / 可接入系统”维度上的信息，但不提供安装或用法的操作细节。
- **Ralph loop（method，watch）**：仓库中存在 `ralph-loop` 插件，描述为“Iterative self-referential AI loops using the Ralph Wiggum technique”，说明该做法已被产品化打包成插件。这是把它从 watch 往 try 推进的信号，但要判定是否真能试，仍需读该插件目录内容（本次材料没有）。
- **Agent skills（concept，adopt）**：仓库把 `skills/` 与 `SKILL.md`（带 frontmatter）定为插件标准目录之一，可视为 Agent skills 在 Cursor 生态中的具体打包形态，能作为 adopt 条目的落地载体参考。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的证据**：仓库定位与多插件市场结构；`.cursor-plugin/plugin.json`、`.cursor-plugin/marketplace.json` 的路径与作用；插件目录下 skills/rules/mcp.json/README/CHANGELOG/LICENSE 的构成；完整的插件表（名称、作者、Category、市场简介）；作者署名与 `author.name` 一致的规则；MIT 许可。metrics 显示 9,277 stars、今日 +157。

**只是主张、没有原文支撑的**：初筛理由说“可直接改变日常配置 coding agent 的方式”——这是判断，不是 README 提供的步骤。各插件简介是市场文案（一句话），能力边界、依赖、权限范围均未说明；“官方插件”与第三方集成插件在 README 中并未给出质量差异证据。

**关键局限**：README 本质是索引，不含安装命令、`plugin.json` 字段示例、`SKILL.md` frontmatter 字段、`mcp.json` 格式、任何提示词或规则内容，也没有使用流程与效果数据。因此无法据此产出一份可照做的手册条目。

**适用条件**：面向使用 Cursor 的编码工作；第三方集成插件需要相应服务的账号与授权；并行/云 agent 类插件（orchestrate、thermos）需要相应额度与团队配置。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（先补前置信息）**：原文未给安装步骤，所以第一步是去 Cursor 官方文档确认插件安装/启用方式。然后挑 **1 个**与你当前工作直接相关的插件（例如 `github` 管 PR、`google-calendar` 排会、`playwright` 跑浏览器测试），读它目录下的 `plugin.json`、`skills/`、`rules/`、`mcp.json`，确认它实际能调用什么、需要什么授权，再在 1–2 个真实任务上使用。不要一次装多个。

**验证指标（可前后对比）**：
- 同一任务完成所需的**手工步骤数 / 往返次数**是否下降；
- 同一任务**耗时**前后对比；
- 产出的**返工率**（是否需要人工修正、修正次数）；
- **工具调用是否符合预期权限范围**（有没有越权或调用失败）；
- 对开发类插件，可用 `agent-compatibility` 的思路做自检：文档、启动命令、验证流程是否与实际仓库状态一致。

**判定“确实改善”的最低标准**：在同一个真实任务上，接入插件后步骤数或耗时出现可复现的下降，且产出无需额外返工，才认为有效；仅“感觉更顺手”不构成证据。
