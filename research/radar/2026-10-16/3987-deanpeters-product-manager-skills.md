# deanpeters/Product-Manager-Skills

- 结论：**值得一试**。按 README 给出的安装命令装入 1-2 个技能，用你自己手上的真实 PM 任务跑一遍并与裸提示做对照——仓库给出了可直接复制的安装命令、技能文件结构和按情境的可粘贴起始提示词，具备小范围试的条件；但材料只到 README，77 个技能正文的实际质量无从验证，所以先试不宜直接采用。
- 原文：https://github.com/deanpeters/Product-Manager-Skills
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T10:38:04.920Z

## 是什么

deanpeters/Product-Manager-Skills 是一个开源仓库，把产品管理方法论封装成**面向 AI 代理的 Skills 框架**：截至 v0.84（标注日期 2026-08-10）共 77 个技能 + 6 个命令式工作流，可被 Claude Code、Claude Desktop/Web、OpenAI Codex、ChatGPT、Cursor、Windsurf、n8n、LangFlow、CrewAI、Gemini 等能读结构化 Markdown 的代理使用。许可 CC BY-NC-SA 4.0，GitHub star 数 7421。

- 每个技能是一个 `SKILL.md`，固定结构：Frontmatter（`name`/`description`/`type`/`intent`/`best_for`/`scenarios`）、Purpose、Input、Key Concepts、Application、Examples、Common Pitfalls、References。
- 技能分三层：**Workflow（19，端到端流程，天到周）→ Interactive（27，3-5 个问题后给编号推荐）→ Component（24，具体交付物模板，30-90 分钟）**。层间是“调度 / 使用”的关系，但作者强调每个技能可独立运行，路线只是建议顺序而非流水线。
- 技能覆盖：问题框定与战略、干系人对齐、客户发现与研究、优先级与路线图、PM 交付物写作（PRD/用户故事）、验证与实验、财务与增长、市场与竞争情报、老龄化产品的 extend/replace/retire 与 EOL、职业与领导力转型、AI 产品工作。

## 具体做法

### 1. 选平台并安装（前提：已确定你在哪个代理运行时上工作）

| 你的环境 | 安装方式 |
|---|---|
| Claude Code | 插件市场 |
| Claude Desktop / Web | 下载 starter pack，解压后逐个上传 skill ZIP |
| Codex | 下载 codex 包，安装 `.agents/skills` 和 `AGENTS.md` |
| 不确定 | 先用 starter pack |

Claude Code 两条命令原样照抄：

```bash
/plugin marketplace add deanpeters/Product-Manager-Skills
/plugin install product-manager-skills@pm-skills
```

（README 说明也可以只装单个技能，而不是全量。）

下载入口（GitHub Releases / 仓库 `dist/` 目录）：

- `pm-skills-starter-pack.zip` —— 跨类别的核心技能
- `pm-skills-codex.zip` —— 面向 Codex
- `99-all-skills-pack.zip` —— 全部 77 个技能
- 主题包：`02-discovery-pack` / `03-strategy-pack` / `04-delivery-pack` / `05-ai-pm-pack` / `06-market-intel-pack` / `07-lifecycle-eol-pack`

### 2. 不想动代理配置时，先跑本地 playground

前提：本机有 Python 环境；API key **只通过环境变量**提供，应用内不支持填 key。

```bash
pip install -r app/requirements.txt
streamlit run app/main.py
```

三个功能：Learn（看集成路径）、Find My Skill（用自然语言描述你的处境，得到技能推荐）、Run Skills（用自己的场景跑某个技能）。多 provider：Anthropic、OpenAI、Ollama。

### 3. 按“你这周像哪一句”选路线，第一句提示词可直接粘贴后替换细节

README 给了 8 条路线，每条标注了预计耗时和“先粘贴这句”。直接可用的原文提示词：

```text
Frame this problem: field sales reps 'don't use the CRM' and leadership wants gamification.
```

```text
My VP DM'd me: "Any chance the dashboard redesign lands next sprint? Board's asking." Analyze this before I reply.
```

```text
Run a market landscape scan on [your market], and tell me the decision it should support.
```

```text
Run a positioning workshop for our API monitoring tool — we keep getting compared to Datadog and losing.
```

```text
Build a PRD for self-serve workspace provisioning — here are my discovery notes and the OKR it ladders to.
```

```text
Help me decide what to do with [product]. Here's what makes me think it's fading: [signals].
```

```text
I'm 60 days into a Director role and my old peers now report to me — it's awkward and I'm still doing PM work. Coach me.
```

技能路线的顺序逻辑（作者给的，明确说可以故意打破）：

- 想法 → 问题 → 人 → 探针：先命名问题再问人，先问人再做原型，探针最后因为最贵。
- 请求 → 解码 → 铺人 → 决策：先搞清真正被要求什么，再知道屋里还有谁，**最后**才问它排在哪。
- 市场 → 对手 → SWOT：证据先行，框架最后；“没有调研的 SWOT 只是带 2×2 的意见”。
- 定位 → 路线图：先定你为谁服务、为什么赢，再选做什么。
- PRD → epic → story：先 why，再切片，再最小可写单元。
- 老化产品 → play → readiness → process：第一个技能可能回答 **“nothing yet”**，从这里开始不等于承诺下线。

启动时也可以直接问：`Which of these skills fits what's on my desk this week?`

### 4. 理解交互技能的行为（决定你怎么用它们）

Interactive 技能走 **Adaptive Decision Ladder**：不直接甩框架给你，而是先问 3-5 个与你具体处境相关的问题，然后给出**编号推荐**，每条带一个“use this when”的理由，你选一条，它执行并在过程中解释 *为什么*。你也可以只要学框架不干活——技能两种模式都教练你。

### 5. 往库里加自己的技能时遵守的约定

- 每个技能必须有 `## Input` 段落，说明可以带什么、带进来的上下文会被使用而不会被重复询问、以及空手而来也没关系。
- **不要用 `$ARGUMENTS` 模板**：它只在 Claude Code 展开，在 Claude Desktop/Web、Codex、Streamlit playground 里会原样显示，而且不教人任何东西。校验器会强制这一约定：缺 Input 段落或正文里有裸 `$ARGUMENTS` 的技能会失败。

## 对应的研究问题

**1. 能力发现（AI 已能做哪些没想到交给它的工作）**
README 把一批原本不被认为“该交给 AI”的 PM 工作显式封装成了技能：问题框定、干系人识别与映射、优先级框架选型、PRD/用户故事写作、市场与竞争情报、产品生命周期与 EOL 流程、甚至 PM→Director/VP/CPO 的职业转型教练。作者给出的判断是：不给共享语境的“写个 PRD”只会产出没人信、工程师没法执行的通用文档，所以要连“为什么、要避开的失败模式、判断力”一起交出去。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 按粒度分三层：Workflow（天到周，端到端）、Interactive（3-5 问后给编号推荐）、Component（30-90 分钟出交付物）。
- 按运行时给不同安装路径：Claude Code 走插件市场单命令；Desktop/Web 走 ZIP 上传；Codex 走 `.agents/skills` + `AGENTS.md`；还有一份给非技术 PM 的平台选择指南。
- 作者明确说不用 `$ARGUMENTS`，因为跨运行时不可移植——这是一个可迁移到其他技能库的设计取舍。

**3. 条件供给（需要提供什么信息、工具、权限、反馈）**
- 信息：可以空手进入（技能会引导），也可以带完整上下文；已提供的上下文会被复用而不重复询问。
- 工具/权限：代理运行时本身；Streamlit 路线需要 Python 环境和 provider API key（仅环境变量）。
- 作者反复强调的是“共享语境”——技能同时写给代理和人，缺了它输出就会泛。

**4. 主动推进（时间/事件/状态触发并持续完成）**
- `autonomous-investigation`（v0.83 引入）：明确是“不依赖你而继续推进”的研究协议，包含问题预算、搜索计划 gate、每条断言标 Fact / Inference / Assumption、do-not-invent 列表、可稳定 diff 的 schema——目的是让调研按计划跑，并且能拿这一季和上一季做 diff。
- 监控类技能：`competitive-intel-watch`、`pestel-delta-monitor`、`pricing-packaging-tracker`、`voice-of-customer-miner`；`company-intel` 的 Executive Signal Refresh 复用模式（Then/Now 差异 + 领导者**不再说**什么）。
- 情报链 `market-landscape-scan → competitive-research-snapshot → competitive-intel-watch → battle-card-builder` 明确说“每个消费前一个的 schema，使调研变成一种节奏而不是一次性 deck”。
- `eol-checklist` 是 phase-gated、每一项都有 owner。

**5. 效果验证（怎样判断确实改善了结果）**
README **没有**给出效果验证的方法或数据。可用的只有间接信号：7421 star、两个月内从 v0.80 到 v0.84 的连续发版、每个技能标注的时长区间（PRD 2-4 天、discovery 3-4 周等）。这些都是作者主张，不是结果证据。这一条要靠使用者自己设计对照（见下节）。

## 与已有做法的关系

清单中已有条目：Claude Code（adopt）、OpenAI Codex（adopt）、Cursor（watch）、OpenClaw（watch）、Context engineering（study）。

- **Claude Code（adopt）**：仓库给了第一方安装路径（插件市场两条命令），可视为该工具在“内容层”的补充——清单里已有工具本身，这里补的是能装进去的 PM 技能包。
- **OpenAI Codex（adopt）**：同样给出专门入口，`pm-skills-codex.zip` 安装 `.agents/skills` 与 `AGENTS.md`。
- **Cursor（watch）**：出现在 README 的 Works With 列表里，但**没有**给出对应安装步骤——与清单里“watch”的状态一致。
- **OpenClaw（watch）**：同样只出现在 Works With 列表，无安装说明。
- **Context engineering（study）**：仓库内含 `context-engineering-advisor` 技能，声称“诊断 context stuffing 还是 context engineering，并引导 AI 产品的记忆架构”。这是清单中该概念的一个实践入口，但同样只到 README 层面。

## 证据与局限

**原文给出的可核查内容**：完整的安装命令与下载链接、技能文件的标准结构表、技能的三层分类与各自数量、按情境的 8 条路线与对应可粘贴提示词、版本发布记录（v0.80 2026-06-19 → v0.81 07-04 → v0.82 07-08 → v0.83 07-17 → v0.84 08-10，含每次新增了什么）、license、star 数 7421。

**只是作者主张的部分**：“77 battle-tested skills”“do PM work at a professional level”“双目标 functional 与 pedagogic 同等重要”“Adaptive Decision Ladder 的效果”“各技能 1-1.5 小时 / 2-4 天 / 3-4 周”的时长估计——全部没有对照实验、案例数据或用户结果指标支撑。

**局限**：
- 材料只有 README 本身（且末尾被截断在 “worth a bookmark if you work in disc”），**没有读到任何一个 SKILL.md 正文**，因此无法验证技能的实际产出质量、是否能真的按描述执行。
- star 数和发版频率只能说明关注度和维护活跃度，不能说明使用后工作方式被改善。
- 时长估计没有说明测量口径。
- 适用条件是产品管理及相邻角色，且需要一个能读结构化 Markdown 的代理运行时；不做 PM 类工作的人收益有限。
- CC BY-NC-SA 4.0 意味着商业使用受限，落地前要确认合规。

## 怎么试、怎么验证

**最小试用（建议 30-60 分钟）**

1. 只装 **1 个**技能，不要装全套。选一条最贴近你本周真实工作的路线，例如手上有 PRD 要写就装 `prd-development`，手上有模糊需求就装 `problem-framing-canvas`。
2. 不想改代理配置就先跑 playground：

```bash
pip install -r app/requirements.txt
streamlit run app/main.py
```

先用 Find My Skill 用自然语言描述你的处境，看它推荐什么，再 Run Skills 跑一遍。
3. 把你**真实**的在手任务贴进去（不要用 README 的示例场景），走完整流程。
4. 同一个任务，另开一个会话用**不带技能**的裸提示跑一次做对照。

**判断有没有改善的指标**

- **澄清轮次**：交互技能应该 3-5 个问题后给编号选项。如果需要来回澄清 3 次以上还没拿到可选项，说明它没接住你的语境。
- **上下文复用**：产出里有没有出现你提供的人名、指标、OKR 等具体信息。如果全是通用模板话术，等于没生效。
- **下游可用性**：把产出直接给工程师或 stakeholde r 时，需不需要重写。需要大改 = 没有改善。
- **对照差异**：与裸提示的产出并排比，看是否多出了失败模式、反模式、判断依据这类内容——这正是作者声称技能相对裸提示的价值所在。
- **时间对照**：README 给的时长区间可当参考锚点（如 PRD 2-4 天），但要清楚这是作者主张，不能当基准；用你自己的历史耗时做基线更可靠。
- **自主调研类技能**：如果试 `autonomous-investigation`，检查它是否给出 Fact / Inference / Assumption 标签、do-not-invent 列表，以及两次运行能否按稳定 schema 做 diff——这三样是它自己声明的验收点。

**什么情况下升级为 adopt**：装 1-2 个技能、跑过 2-3 个真实任务后，产出无需重写即可交付，且相对裸提示有可复现的增量（至少在你的记录里）。否则保持 try 或退回 study。
