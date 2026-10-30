# chutingyean/Agent-Cockpit

- 结论：**值得一试**。建议在一个已有 git 的小型计算型研究仓库上小范围试用 Agent-Cockpit：先跑 demo 观察“改一行 grader→相关结论变红→回滚后恢复”，再用 `cockpit init` 接入自有仓库、用 `cockpit run` 记录实验并通过 MCP 的 `cockpit_claim` 登记结论；理由是它把“结论—运行—代码”的失效检测做成确定性哈希规则（零 token、无 LLM 调用），并挂进 Claude Code/Cursor 等 MCP agent 的 Stop hook 与 pre-commit，直接作用于效果验证，但项目很年轻（36 stars、仅有 README 与自述的一次会话录像佐证），误报率与流程摩擦需自行验证。
- 原文：https://github.com/chutingyean/Agent-Cockpit
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T06:52:57.509Z

## 是什么

Agent Cockpit 是一个本地白板 + MCP server，面向“用 AI agent 做研究”的场景。任何支持 MCP 的 agent（Claude Code、Codex、Cursor、Gemini CLI 等）把工作画到同一块板上：计划、任务、每次实验运行、每条结论（claim）、以及每次运行所依赖的代码。

核心机制是**证据链 + 确定性失效检测**：

- 一条 claim 必须引用某次被记录的 run 实际写出的一个文件字段（README 原话：down to a JSON field）。
- 每次 run 记录其脚本的哈希、脚本依赖的每个文件的哈希、以及它触达的每个函数的哈希。
- 任一环变化 → 该 run 变 stale → 建立在它之上的 claim 全部标红待复核；把文件改回去，哈希重新一致，claim 自动恢复。
- 用内容哈希而非时间戳判定时效性，所以“回滚即恢复”是精确的。
- Python 依赖做到函数级：改动 run 未触达的函数不会使 run 失效；改动可达函数、import 或模块级代码一定失效。
- 所有写入（MCP、CLI、白板）过同一道 gate（`src/gate.mjs`），不合规写入被拒并给出可执行理由，拒绝也记日志。
- 未上报的文件变更会被检出：阻断 `git commit`，且 Claude Code 在上报前无法结束回合。
- 事件溯源：`.cockpit/events.jsonl` 是唯一事实来源，白板只是 `reduce` → `derive` 的投影，因此可回放。
- 本地确定性：白板绑定 127.0.0.1，所有检查是普通规则，无 LLM 调用、零 token。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 先跑 demo，确认机制真的成立（约 10 分钟）

**前提**：Node.js ≥ 22.13（用到内置 `node:sqlite`）、git、python3（仅 demo 项目需要）。

1. 克隆并安装：

```bash
git clone https://github.com/chutingyean/Agent-Cockpit.git
cd Agent-Cockpit
npm install
```

2. 构建 demo 研究仓库（6 次真实运行、6 条 claim）并开白板：

```bash
npm run demo                                       # build a demo research repo: 6 real runs, 6 claims
node bin/cockpit.mjs serve --repo demo/research    # open http://127.0.0.1:4180
```

3. 在第二个终端里制造一次“未上报的改动”，观察传播：

```bash
node bin/cockpit.mjs demo --break      # quietly loosens the grader's answer matching, unreported
node bin/cockpit.mjs demo --restore    # put it back: hashes match, claims recover
```

**观察点**：执行 `--break` 后，依赖该 grader 的 claim 应在白板上变红，并且系统自己抛出一个待人类决策项、生成一页证据简报（brief）；执行 `--restore` 后哈希重新一致，claim 恢复。若你看到的现象不是这样，后面的试用就不必做。

### B. 接入自己的研究仓库

**前提**：目标目录必须是一个 git 仓库；`init` 只在该仓库内写文件。

4. 初始化（写入 MCP 配置、`AGENTS.md`、Stop hook、pre-commit）：

```bash
cd /path/to/your-research                                  # must be a git repo
node /path/to/Agent-Cockpit/bin/cockpit.mjs init           # MCP configs, AGENTS.md, Stop hook, pre-commit
node /path/to/Agent-Cockpit/bin/cockpit.mjs serve          # the board
```

5. 在该仓库里打开你的 agent，让它读 `AGENTS.md` 与 MCP 配置（原文说明：`init` 会为 Claude Code、Cursor、VS Code、Gemini CLI 写好配置，并为 Codex 打印命令；agent 身份来自 MCP 握手）。

6. **所有实验都用 `cockpit run` 执行**，不要直接 `python xxx.py`——只有被记录下来的 run 才能作为 claim 的证据来源：

```bash
node /path/to/Agent-Cockpit/bin/cockpit.mjs run -- python3 train.py --lr 1e-3   # run experiments through the cockpit
```

7. 可选：执行一次 `npm link` 以获得全局 `cockpit` 命令，之后可简写为 `cockpit serve` / `cockpit run -- ...`：

```bash
npm link
```

8. 每跑完一次实验，让 agent 通过 MCP 的 `cockpit_claim` 登记结论。**硬约束**：证据必须是某次被记录 run 实际写出的文件 + 字段（例如 metrics.json 里的某个 key），不能是“我觉得”“日志看起来”。具体调用参数原文未列出，以仓库 `docs/tutorial.md` 为准。

9. 按原文的 MCP 工具表给 agent 立规矩（这些是可直接照搬的工具名与用途）：

| 环节 | 工具 | 用途 |
|---|---|---|
| 开场 | `cockpit_overview` | 先调用：待决策、需要复核的 claim 及原因、未上报变更 |
| 计划 | `cockpit_plan` / `cockpit_stage` | 研究路径；stage 在必需工具被调用前不能关闭 |
| 执行 | `cockpit_task` | agent 自己的任务卡，每轮更新（做什么、为什么、下一步） |
| 执行 | `cockpit_run` | 跑实验并记录 |
| 结论 | `cockpit_claim` | 登记 claim，证据须来自被记录 run |
| 假设 | `cockpit_hypothesis` / `cockpit_premise` | 假设与尚未验证的前提 |
| 人工 | `cockpit_decide` / `cockpit_decisions` | 向人提问并等回答；读回答案 |
| 上报 | `cockpit_report` | 上报改了哪些文件 |
| 复核 | `cockpit_review` | 代码审查：装了 ocr 用 ocr，否则内置规则；也可上报自己的发现 |

10. 可选增强：装上 [graphify](https://github.com/Graphify-Labs/graphify) 或 [open-code-review](https://github.com/alibaba/open-code-review)，cockpit 会自动改用它们；不装就用内置的 graphify 兼容代码图与规则式 review。手动重建代码图：

```bash
cockpit graph
cockpit review [--all]
```

11. 提交前自查，并把事件日志纳入版本管理：

```bash
cockpit status      # print the cockpit summary
cockpit check       # list unreported changes
```

把 `.cockpit/events.jsonl` 提交进仓库（原文：它是单一事实来源，同时兼作 agent 的工作日志）。

12. 需要回看时用回放：白板可拖到任意时刻重放；问题修好后 brief 仍然保留。

所有命令都接受 `--repo <path>`，默认当前目录。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

### 1. 能力发现（AI 已能做但还没想到交给它的工作）

原文明确交给机器做的、通常人肉在做的活：

- **结论时效性维护**：agent 改了 grader / 数据管道 / 统计辅助函数后，自动判定哪些“已验证”结论不再成立——原文把这列为第一个痛点（claims lose their footing silently）。
- **变更上报的强制化**：文件真实变化无论 agent 报没报都能检出，并阻断 commit、阻断 Claude Code 结束回合。
- **决策排队与升级**：当改动破坏 claim 时，cockpit 自己发起一个决策项并写一页证据简报，人只需选“恢复 / 接受”，再由 agent 执行。
- **代码图与影响面分析、变更行审查**：内置，无需额外安装。

### 2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）

- **适合**：以“跑代码/跑实验 → 写结论”为主线的研究流程，且 agent 说 MCP（Claude Code、Codex、Cursor、Gemini CLI 等）。
- **工具形态**：确定性规则引擎负责校验（哈希比对、可达性分析、写入 gate），**不做 LLM 调用、零 token**；判断类工作（要不要接受这次改动）交给人，通过 `cockpit_decide` 阻塞等待。这是“规则做校验、模型做执行、人做裁决”的分工。
- **代码图**：内置 graphify-style 调用图，提供依赖闭包、社区、核心节点、影响分析；可无缝替换为真 graphify。代码审查可替换为 open-code-review。
- **语言覆盖**：原文只声明 Python 依赖做到函数级精度；其他语言的处理方式未说明，不要外推。

### 3. 条件供给（需要提供哪些信息、工具、权限和反馈）

- **环境**：Node ≥ 22.13、git；demo 额外要 python3。
- **仓库条件**：必须是 git 仓库；`init` 只往仓库内写。
- **init 落地的四样东西**：MCP 配置、`AGENTS.md`（规则文件）、Stop hook、pre-commit hook。这四样是让 agent“按规矩干活”的前提。
- **身份**：agent 身份来自 MCP 握手，不需要手填。
- **纪律性前提**：实验必须经 `cockpit run` 执行；变更必须 `cockpit_report` 上报；claim 证据必须是记录 run 写出的文件字段。这三条不满足，整套证据链就空转。
- **反馈通道**：不合规写入被 gate 拒绝并给出 agent 可据此改正的理由，拒绝本身也入日志——这是给 agent 的机器可读反馈。
- **持久化**：`.cockpit/events.jsonl` 需提交进仓库。

### 4. 主动推进（时间/事件/状态触发并持续完成）

原文给出的触发点都是事件或状态型，不是定时型：

- **文件变更事件** → 重算哈希、标记 stale、把依赖它的卡变红、必要时自动发起决策并生成 brief。
- **状态：存在未上报变更** → pre-commit 阻断提交；Claude Code 无法结束回合。
- **状态：stage 的必需工具未调用** → stage 不能关闭（`cockpit_plan`/`cockpit_stage`）。
- **状态：agent 等待人类回答** → `cockpit_decide` 挂起等待，人答后继续。
- **每轮** → `cockpit_task` 更新（做什么、为什么、下一步）。

原文未描述任何基于时间间隔的调度或长期后台轮询。

### 5. 效果验证（怎样判断确实改善了结果）

这是该工具最直接对应的问题，原文给的是机制而非指标：

- **判定依据是内容哈希，不是时间戳**：回滚文件即精确恢复有效性（revert the change and the hashes match again）。
- **函数级精度**降低误报：改动 run 未触达的函数不会使 run stale；改动可达函数、import、模块级代码一定 stale。
- **单一写入 gate** 保证 MCP / CLI / 白板三条入口的一致性，拒绝有理由、有日志。
- **事件溯源 + 回放**：`.cockpit/events.jsonl` → `reduce` → `derive` → 白板投影，可回放到任意时刻；brief 修复后仍保留，便于复盘。
- **demo 自带可验证剧本**：6 runs / 6 claims，`--break` 制造一次未上报改动，观察哪些 claim 变红。

## 与已有做法的关系（对照给出的清单条目）

- **alibaba/open-code-review（tool，try）**：Agent Cockpit 的 `cockpit_review` 在检测到已安装 ocr 时优先使用 ocr，否则退回内置规则式审查（默认只看变更行，`--all` 看全部）。也就是说，清单里这条 try 的条目可以作为本工具的可替换插件，两者不冲突。
- **Claude Code（tool，adopt）**：`cockpit init` 会为 Claude Code 写 MCP 配置，并安装 Stop hook——Claude Code 在未上报文件变更前无法结束回合。这是本工具与清单中已采纳条目最紧密的耦合点。
- **Cursor（tool，watch）**：`init` 同样会为 Cursor 写 MCP 配置，属于“接入即用”的 agent 之一。
- **Graphify（tool，watch）**：本工具内置了一个 graphify-style 的轻量调用图（依赖闭包、社区、核心节点、影响分析，输出与 graphify 兼容）；装了真 graphify 则自动改用。清单中处于 watch 的 Graphify，在这里被当作可选增强而非依赖。

原文还致谢了 research-cockpit、Understand-Anything、md²、answer-me-with-html 四个项目（分别贡献 claims/hypotheses/premises/decisions、摘要/分层/tour/persona、架构图格式、一页式 brief），这四个不在给出的清单中。

## 证据与局限

### 原文给出的可核验内容

- 可直接执行的命令序列（clone / install / demo / serve / init / run / graph / review / status / check / demo --break / demo --restore）与端口 4180。
- 明确的环境门槛：Node ≥ 22.13、git、python3（demo）。
- 项目结构与职责划分：`src/engine.mjs`（reduce/derive、证据链、传播规则、tour、brief 草稿）、`src/gate.mjs`（单一写入 gate）、`src/store.mjs`（node:sqlite 事件存储 + 画布投影）、`src/run.mjs`、`src/graph.mjs`、`src/review.mjs`、`src/mcp.mjs`、`src/server.mjs`（SSE、决策、brief、回放）、`web/board.html`（无框架、无构建步骤）、`test/`（node:test 套件）。
- CI 徽章（GitHub Actions test 工作流）与 AGPL-3.0-or-later 许可证。
- 附有一次真实会话的录像/记录（`docs/live-run/`：Claude Code 与 Codex 从空仓库完成一个小研究；一次未上报的编辑打破一条 claim；cockpit 发起决策并写 brief；人选择 restore，agent 执行）。

### 哪些只是作者主张

- “能抓到未上报的变更”“函数级精度足以避免误报”“内置 review 够用”——均为 README 自述，未给出误报率、漏报率、在大型仓库上的性能数据。
- “任意 MCP agent 都能用”——README 列举了四个客户端的配置写入，但只有 Claude Code + Codex 的一次会话被演示。
- 痛点清单（claim 失据、变更不报、决策堆积、代码读不过来）是作者的归纳，没有量化调研支撑。
- 仓库仅 36 stars，成熟度、社区验证、长期维护都未知。

### 适用条件与风险

- **偏计算型研究**：口号是 “every research claim, traceable to the code that produced it”，claim 必须绑定到一次写文件的 run。纯文献调研、访谈、问卷设计等不产出“运行结果”的工作，套不进来。
- **强制流程成本**：必须走 `cockpit run`、必须 `cockpit_report`、stage 未完成必需工具不能关闭、commit 会被阻断——对习惯自由操作的 agent 是明显摩擦，需要先确认团队接受。
- **语言假设**：函数级精度只对 Python 依赖作了说明。
- **许可证**：AGPL-3.0-or-later，若修改后通过网络提供服务，须向使用者提供修改后的源码。商用/闭源分发前需评估。
- **原文未覆盖**：MCP 各工具的具体参数与返回格式、内置规则式 review 的规则清单、大仓库下的哈希计算开销、`events.jsonl` 长期增长的治理方式。这些需读 `docs/tutorial.md` 与源码，本报告不作推断。

## 怎么试、怎么验证

### 最小试用（建议 1 天内完成，范围限定一个仓库、一个脚本、一条 claim）

1. **先验机制，不碰自己的代码**：按 A 节跑 demo，确认 `--break` 后相关 claim 变红 + 自动生成决策与 brief，`--restore` 后恢复。这一步不通过就停。
2. **选一个已有 git 的研究小仓库**，最好已有可重复运行的脚本（训练/评测/数据处理皆可）。
3. `cockpit init`，然后**用 `cockpit run -- <你原来的命令>` 跑一次**，确认事件进了 `.cockpit/events.jsonl`、白板上出现这次 run。
4. **只登记 1 条 claim**，证据严格指向这次 run 写出的某个具体字段（如 `metrics.json` 的 `accuracy`）。验证：故意把该字段名写错，看是否被 gate 拒绝——被拒且给出理由，说明 gate 生效。
5. **做一次“静默破坏”实验**：手改 grader/评测逻辑中的一行且不 `cockpit_report`，观察 (a) 白板是否在下次刷新时变红，(b) `cockpit check` 是否列出未上报变更，(c) `git commit` 是否被阻断。然后改回去，确认 claim 恢复。
6. **做一次“无关改动”对照**：改一个这次 run 未触达的函数，确认 **不应** 变红（检验函数级精度带来的误报抑制）。
7. 让 agent 走一遍 `cockpit_decide`：提一个问题，确认它挂起等待，人答后 agent 继续。

### 判断有没有改善的指标

| 指标 | 定义 | 期望方向 |
|---|---|---|
| 失效检出延迟 | 从“静默改动落盘”到“相关 claim 变红”的分钟数 | 应在下一次 check/刷新内，且无需人主动想起 |
| 失效检出率 | 故意注入 N 次会推翻结论的改动，被抓到几次 | 目标全部抓到 |
| 误报率 | 注入 N 次**不影响结论**的改动（如未触达函数、注释、无关脚本），被误标的比例 | 越低越好；这是函数级哈希的核心卖点，必须实测 |
| 未上报变更拦截次数 | pre-commit / Stop hook 实际拦下几次 | 大于 0 说明确实在起作用；若长期为 0，要确认 hook 是否真的装上并生效 |
| 结论可追溯率 | 现有 claim 中，能一键点到“哪次 run、哪个字段、哪段代码”的比例 | 从低到接近 100%（新 claim 应强制 100%） |
| 决策周转时间 | 从 cockpit 发起决策到人给出答案的时长 | 应缩短，且决策项不积压 |
| 流程摩擦 | 一次正常实验被 gate/hook 阻断或需返工的次数 | 应可接受；若每次都要绕路，说明与现有工作流不合 |
| 复现成本 | 新人拿到仓库 + `events.jsonl`，能否靠回放理解某个结论怎么来的 | 从“要读代码问人”变成“拖时间轴” |

### 止损条件

出现下列任一情况建议降级为 study（只借鉴“哈希级联失效 + 单一写入 gate + 事件溯源回放”的设计思路，不引入工具）：误报率在实际仓库上高到需要频繁人工消音；agent 因 Stop hook / pre-commit 频繁卡死；你的研究结论大多无法绑定到“某次运行写出的字段”；或 AGPL 许可证与分发方式冲突。
