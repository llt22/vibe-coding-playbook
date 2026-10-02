# leonvanzyl/cubefarm

- 结论：**值得一试**。用 npx cubefarm 在低风险仓库上小范围试跑 issue→PR→QA→合并 这条自动链路，重点验证 QA 环节的真实拦截能力；因为它把多 agent 分工、浏览器实测和 auto-merge 门禁写成了可执行流程，但只有 README 级证据（53 stars、无基准与案例数据），不足以直接采用。
- 原文：https://github.com/leonvanzyl/cubefarm
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T12:27:05.655Z

## 是什么

cubefarm 是一个用 `npx` 一键启动的多智能体编程协作工具：它在一台机器上跑一队编码 agent（默认 Claude Code），每个项目占一层「楼」，配开发者、至少一名 QA 测试员、一名 CEO 和一名经理。协作媒介是 GitHub——工作以 issue 表达、以 pull request 交付。

README 描述的完整链路是：CEO 研究项目 → 写 QA 检查清单 → 把工作拆成 GitHub issues → 提议招聘（由你批准）→ 开发者领 issue 并开 PR → QA 在真实浏览器里审查和测试，贴出带截图的报告 → 开启 auto-merge 后，QA 通过且 GitHub checks 全绿，PR 自行合并。

界面是卡通 3D 办公室（可走动、坐电梯、走到 agent 工位后打开其真实终端直接输入），Kanban 白板展示从 backlog 到 merged 的状态。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提（README 明确列出，缺一不可）**
- Node.js 22 或更新版本
- `git`
- GitHub CLI 并已登录：`gh auth login`
- 一个编码 agent 的订阅：cubefarm 自带 Claude Code（默认 agent，CEO 也用这个），无需另行安装，登录一次即可；若你本机已装并登录 Codex 或 OpenCode，agent 也可以跑它们
- Google Chrome（用于 QA agent 在浏览器里测你的应用）
- 支持 Windows / macOS / Linux

1. **先体检环境**，确认上面几项都齐：
```bash
npx cubefarm doctor
```

2. **登录内置编码 agent**（前提：有 Claude Code 订阅）：
```bash
npx cubefarm login
```

3. **想先不花钱、不改动任何东西地看看**，用 demo 模式（伪造 GitHub 和 agent）：
```bash
npx cubefarm --demo
```

4. **正式启动办公室**，它会在浏览器中打开：
```bash
npx cubefarm
```
首次 `npx` 会问是否安装 cubefarm，回答 yes。可选参数：
```bash
npx cubefarm --port 4400   # 换端口（默认 4317）
npx cubefarm --no-open     # 不自动打开浏览器
```

5. **建公司**：按向导输入你的名字、给公司命名、认识 CEO。

6. **搬入一个项目**（前提：该项目必须在 GitHub 上，因为 issue 和 PR 是团队的工作方式）：选一个本地项目文件夹、一个 GitHub 仓库，或新建一个；每个项目获得自己的楼层。

7. **让 CEO 做规划**：CEO 会研究项目、写 QA 检查清单、把工作规划成 GitHub issues，并提议招谁。按 `P` 打开手机与 CEO 对话、批准招聘。

8. **观察与介入**：开发者领 issue、开 PR；走到某 agent 工位后面可打开它的真实终端，直接输入干预。按团队整体或按单个 agent 选择编码 agent、模型和 effort。

9. **控制并发额度**：所有 agent 共用同一个编码 agent 订阅的用量限额，在经理控制台里设置 session limit 来限制同时工作的 agent 数量。

10. **更新**（`npx` 会一直用第一次下载的版本，启动时会提示有新版）：
```bash
npx cubefarm@latest
# 或永久安装
npm install -g cubefarm
cubefarm
```

**关键配置位置与安全边界（照做时须知）**
- 办公室数据在 `~/.cubefarm`：设置、仓库克隆，以及每个 agent 一份独立的工作副本；可设 `SWARM_HOME` 换目录。
- agent 在你机器上、以你自己的编码 agent 方式工作，沿用你的 skills、MCP servers 和 settings，各自在仓库的独立副本里：它们不能 push 到主分支，也不能合并——合并由办公室在 QA 之后执行。

**操作键（界面内）**：`W A S D`/方向键走动，`Shift` 跑，鼠标环视（需先点击画面），`E` 使用当前看着的东西（工位/白板/电梯/经理电脑），`P` 手机，`H` 帮助，`Esc` 松开鼠标或关闭面板。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：README 展示的是把一整条「读 issue → 开 PR → 浏览器实测 → 合并」的链条交给 agent 队，而不只是让 AI 写代码。其中浏览器内的 UI 测试由 QA agent 执行并出带截图的报告，属于容易被忽略、但这里已经交给 AI 的环节。

2. **任务匹配**：编码 agent 可选 Claude Code（默认，CEO 也用它）、Codex、OpenCode（后两者需你已安装并登录）；可按整队或按单个 agent 选择编码 agent、模型和 effort（README 未给出具体可选模型清单）；UI 测试依赖 Google Chrome。

3. **条件供给**：需要 Node 22+、git、已登录的 `gh`、一个编码 agent 订阅、Chrome；项目必须托管在 GitHub；agent 继承你本机的 skills、MCP servers 和 settings；数据目录 `~/.cubefarm`，可用 `SWARM_HOME` 改写；并发受 session limit 约束。

4. **主动推进**：开发者 agent 从 issue 队列中领活并推进到 PR；CEO 主动研究项目、写 QA 检查清单、拆解为 issue 并提议招聘；auto-merge 由「QA 通过 + GitHub checks 全绿」这一状态触发，PR 自动合并。

5. **效果验证**：QA tester 在真实浏览器里审查和测试每个 PR，并发布带截图的报告；合并的门禁是 QA 通过且 GitHub checks 全绿；白板 Kanban 呈现从 backlog 到 merged 的状态。README 未给出验证有效性的量化数据。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：是 cubefarm 的内置默认编码 agent，CEO 也跑在它上面。cubefarm 相当于在 Claude Code 之上加了一层多 agent 编排、任务分配和 QA/合并门禁，复用同一份订阅与登录。
- **OpenCode（watch）**：README 明确说 agent 也可以跑 OpenCode（前提是你已自行安装并登录），属于它支持的备选运行时。
- 除此以外，清单中没有其它直接相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的可核对内容**：可执行命令（`npx cubefarm`、`login`、`doctor`、`--demo`、`--port`、`--no-open`、`npx cubefarm@latest`、`npm install -g cubefarm`）、明确的前提清单、五步上手流程、界面操作键、并发上限设置方式、数据目录与 `SWARM_HOME`、以及安全模型的要点（agent 各持独立仓库副本、不能 push 主分支、不能合并，由办公室在 QA 后合并）。

**只是主张、无可验证数据**：办公室「看起来在工作」、CEO 会写出 QA 检查清单、QA 报告能起到把关作用、auto-merge 安全——这些都只有 README 的描述，没有成功率、误合并率、成本或周期时间的数字。唯一的量化指标是 53 stars。

**材料本身的局限**：本次输入只有 README，README 指向的 `docs/how-it-works.md`（issue 生命周期、QA、auto-merge、模型与用量、安全模型）和 `CONTRIBUTING.md` 均未包含在材料中，因此 QA 具体如何测、auto-merge 的判定细节、模型与额度策略都无法核实。

**适用条件**：项目必须已在 GitHub 上（issue/PR 是唯一的协作媒介，纯本地项目不适用）；必须持有编码 agent 的付费订阅，且所有 agent 共享同一份用量限额，成本随并发线性上升；QA 依赖 Chrome，对非 Web 类项目的 QA 能力未在 README 中说明；游戏化 3D 界面是外壳，长期使用是否顺手未验证。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式**
1. 跑 `npx cubefarm doctor` 确认环境齐全。
2. 先 `npx cubefarm --demo` 走一遍界面，搞清工位、白板、手机、经理控制台的位置。
3. 选一个**低风险、已有测试基础**的小仓库接入，把 session limit 设为 1–2，控制用量。
4. **先关闭 auto-merge**，让人工确认每一份 QA 报告和 PR 差异，跑 3–5 个真实 issue。
5. 熟悉后再考虑对低风险改动开启 auto-merge，并保留人工抽查。

**判断有没有改善的指标**
- QA 报告的**真阳性率**：它标出的问题里，有多少经人工复核确认是真问题（决定 QA 环节是否有价值）。
- QA 通过的 PR 中，人工复核后**确实可用**的比例（漏检率）。
- **周期时间**：同一类 issue 从开单到合并的耗时，与你自己动手的基线对比。
- **成本**：每个 issue 消耗的订阅用量（同订阅共享额度，这是最容易被低估的一项）。
- **人工介入次数**：每个 PR 你需要动手改多少、终端里介入多少次。
- **回归/误合并次数**：开启 auto-merge 后是否出现被合入但需要回滚的改动。

只要 QA 真阳性率接近零、或人工介入次数没有下降，就说明当前形态的价值主要在演示而非产出，应考虑退回 watch。
