# Uber’s AI infra, from the inside

- 结论：**值得一试**。建议小范围试其中能脱离 Uber 基础设施复现的流程性做法——给 PR 按类型（feature/bugfix/maintenance/testing/docs）打标以替代速度指标、把 lint/build 等简单检查前移到 agent 开 PR 之前、对 AI 花费设额度加经理例外审批；理由是原文只给出 Uber 内部系统的一句话级描述，没有可复制的配置、命令或提示词，但这几条流程本身可以照做，且有方向性结果（token 成本近几个月降约 50%、feature PR 占比上升、maintenance 占比下降）。
- 原文：https://newsletter.pragmaticengineer.com/p/ubers-ai-infra-from-the-inside
- 来源：rss:src-pragmatic-engineer，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-14T21:06:01.051Z

## 是什么

这是 The Pragmatic Engineer 播客一期的节目页，嘉宾是 Uber Distinguished Engineer Uday Kiran Medisetty（负责 agentic AI 方向），主题是 Uber 内部的开发者工具如何为 AI agent 做准备、如何把 agent 嵌进工程流程、以及如何度量对生产力的影响。

需要注意素材形态：本页是节目说明 + 11 条要点 + 时间戳清单，**不是完整文字稿**。因此系统名和结论都有，但实现细节（配置、提示词、命令）基本没有。文中提到的内部工具包括 DevPods、Code Inbox、Slate、Wisdom、Minion、Cortana、Capri、Shepherd、Edge Gateway，以及平台层组件 Model Gateway、AI Guard、AIFX、MCP Gateway、Agent Skills repo、context graph、CostCheck。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

以下是从原文能提炼出的、可迁移的做法。原文未给出任何可复制的配置或提示词，唯一出现的具体命令是 Uber 内部命令 `afx validate`，不能直接照抄，只能作为“形态参考”。

1. **把所有 AI 能力收敛到一个模型网关后面。**
   前提：有平台/基础设施团队；上层有多个 AI 功能要接不同模型。
   做法：2023 年 Uber 平台团队定下原则——所有 AI 功能必须与模型和 harness 解耦，于是建了 Model Gateway，支持在 Anthropic、OpenAI、其他厂商模型以及自托管开源模型之间切换。
   挂在上面的中间件（可分别落地）：
   - AI Guard：安全团队运行的中间件，检查所有请求与响应，度量延迟，标记过慢的模型或查询
   - Spend tracking：花费按用户追踪
   - Visibility：审计日志与会话追踪

2. **在多个 CLI agent 之上做一层统一封装（AIFX 模式）。**
   前提：团队里同时有人用 Claude Code、Codex、OpenCode 等多个 harness。
   Uber 的做法：AIFX（AI Foundations）是这些 harness 之上的一层 wrapper，工程师切换 harness 时，settings、skills、plugins 跟着一起迁移，不会丢配置。

3. **AI 花费走“额度 + 例外审批”的混合策略。**
   前提：能按用户统计 token 花费。
   做法：给工程师分配 spend tier；达到上限后，经理可以签批当月追加。对合适类型的工作不设上限，但避免无意识烧 token。配套一个跨会话的插件（Uber 叫 CostCheck）提示工程师如何改善自己的成本画像。

4. **把机器能做的评审前置，再让人评审。**
   前提：有 AI 代码评审能力，能对 diff 打风险分，能在适用时附功能截图/录屏。
   Uber 的做法：所有 PR 仍由工程师评审，但工程师开始评审时，AI 代码评审已经跑完、功能截图/视频已附上（适用时）、风险分已给出，人据此决定花多少时间。Uday 承认代码评审已成公司内部的大瓶颈。

5. **把简单 CI 任务搬到 agent 的 inner loop。**
   前提：agent 能执行这些校验命令并且能读到工程配置。
   背景：Uber 今年为 CI 系统内部宣布过“code red”，因为 12 个月内 CI 任务量翻倍以上。
   做法：把 linting、build、模板规则这类简单 CI 任务移到 inner loop，让 agent 在开 PR 之前先跑校验，命令形态是：
   ```
   afx validate
   ```
   （Uber 内部命令，仅示意“开 PR 前先本地校验”这一形态。）

6. **PR 按工作类型打标签，用结构占比替代速度指标。**
   前提：PR 系统支持标签，能按标签做统计。
   做法：Uber 过去度量 “PR velocity”（一个 diff 到生产要多久）；有 agent 之后这个指标失效，因为可以轻易造出几十上百个 PR，其中很多对产品没有业务影响。现在给所有 PR 按类型打标：`feature`、`bugfix`、`maintenance`、`testing`、`docs`。
   观察结果：feature PR 占比上升，maintenance PR 占比下降。

7. **认知：AI 工具速度来自长期基础设施积累。**
   原文的说法是，Uber 的 AI 工具看起来像一年建成，实际建在十年开发者工具投入之上：2025 年建的 Minion 跑在 2017 年建的 DevPods 上；MCP Gateway 能快速建成，是因为已有 Thrift 和 Protobuf registry；Jaeger tracing 让 Slate 的路由和 context graph 更容易做。落地含义：先确认你有哪些既有注册表、追踪、环境隔离能力可复用，不要指望从零搭出同等 agent 工具链。

原文提到的其他内部系统（DevPods、Code Inbox、Slate、Wisdom、Cortana、Capri、Shepherd、Edge Gateway、MCP Gateway、Agent Skills repo、context graph）只有名字和时间戳，没有可照做的细节，此处不臆造。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：Uber 已在用后台 agent、Slate（做开发，也包括修 bug）、Minion（2025 年建的 agent，底座是 2017 年的 DevPods）、context graph 与 Cortana、PRD/ERD 工具、Capri、Wisdom、Shepherd、Edge Gateway。原文只给名字，没给能力边界和用法细节，这一项的可用证据很薄。
2. **任务匹配**：原文体现的匹配原则是“可替换”——harness 层支持 Claude Code、Codex、OpenCode 并存且可切换，模型层由 Model Gateway 屏蔽厂商差异。也就是说，他们把“用哪个模型/哪个 agent 工具”当成可随时更换的配置项，而不是绑死的架构决策。
3. **条件供给**：Model Gateway、MCP Gateway、context graph、Agent Skills repo、既有的 Thrift/Protobuf registry 与 Jaeger tracing，都是为了让 agent 能接上代码、内部服务和工程知识。Uday 的总结是“我们为工程师建的所有东西，也让我们的 agent 更好用”。
4. **主动推进**：文中明确提到后台 agent（background agents）；另一条是状态触发式的前移——lint/build/模板规则由 agent 在开 PR 前执行，而不是等 CI 排队。
5. **效果验证**：按用户追踪 token 花费；近几个月 token 成本降低约 50%；PR 按类型打标并观察占比（feature 升、maintenance 降），弃用 PR velocity；评审侧引入 AI 预评审 + 风险分 + 截图/录屏辅助人判断时间投入。注意：原文只说“how it measures productivity”，并未给出生产力提升的量化数字。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）**：Uber 当前支持的三个 harness 之一，另见 OpenCode。
- **OpenCode（watch）**：同为 Uber 支持的 harness 之一。它的存在正好解释了为什么 Uber 要做 AIFX 这层 wrapper——多 harness 并存时，settings、skills、plugins 需要跟着人走。
- **Agent skills（adopt）**：对应 AIFX 里“切换 harness 时 skills 一起迁移”的设计，以及独立的 Agent Skills repo。
- **Context engineering（study）**：Uday 直接使用这个词，并把它抬到工程师的核心技能位置（“You need to get really good at context engineering”，工程师的工作变成“为 agent 构建正确的上下文以产出可靠输出”）。
- **Context graph（watch）**：Uber 内部有 context graph 与 Cortana，节目时间戳里单独有一段（38:46）。
- **Pragmatic Engineer（try）**：本文即来自该来源，是播客形式的访谈，不是操作手册。

## 证据与局限

**原文给出的数字（均为嘉宾口述，非可复核的公开数据）**：
- 服务数量：2015 年共 2 个；2019 年数千个；2026 年与 2019 年大致相当，而业务规模约为当时的 10 倍。
- M3DB：Uber 每秒发出约 5 亿个指标，没有厂商扛得住，因此自建。
- Token 成本：近几个月降低约 50%。
- CI：12 个月内任务量翻倍以上，触发内部 “code red”。
- 内部工具数量：工程师日常使用 20 多个，文中点名 DevPods、Code Inbox、Slate、Wisdom 四个。

**只是作者/嘉宾主张的部分**：
- “多任务能力、context engineering、审查与验证输出的能力变得更重要”，因为可并行的事情变多了。
- “为工程师建的工具也让 agent 更好用”——这是因果判断，没有对照实验。
- 代码评审成为大瓶颈——是 Uday 的承认，但没有给出量化。

**适用条件与局限**：
- 素材是节目页的 11 条要点，**不是完整文字稿**；正文中大量工具只有名字和时间戳。
- 没有任何可复制的配置、提示词或命令；唯一出现的 `afx validate` 是 Uber 内部命令。
- 所有系统（Model Gateway、AIFX、MCP Gateway、Code Review、CostCheck、Minion、Slate）都是 Uber 内部实现，未给出开源地址或架构细节。
- Uber 的“城市作为一等原语”“按城市分片数据库”“每城市绑定云区域并可随时故障转移”等前提，一般组织不具备，直接照搬会失真。
- 度量口径不完整：知道他们按用户算 token 花费、按类型算 PR 占比，但不知道具体阈值、基线、以及“改善”的判定标准。

## 怎么试、怎么验证

**最小试用（不依赖 Uber 基础设施，5–15 人团队两周可做）**

1. **PR 类型打标 + 占比基线。** 在代码托管平台上给 PR 加五个标签：`feature`、`bugfix`、`maintenance`、`testing`、`docs`；先跑两周收集基线，再做趋势对比。这一步完全对应原文第 9 条，且不需要任何 AI 组件。
2. **把简单检查前移。** 在仓库里提供一条本地校验命令（lint + build + 格式/模板检查的聚合脚本），并在 agent 的工作约定里要求“开 PR 前先跑这条命令”——这是 `afx validate` 在无内部工具时的等价形态。前提是这些检查能在本地几分钟内跑完。
3. **（可选）AI 花费额度 + 例外审批。** 按人统计 AI 编码工具的 token 花费，设月度额度，超限需负责人签批；对明确类型的任务不设上限。
4. **（可选）评审前信息打包。** 让 AI 评审先跑、把结果作为评论附在 PR 上，再让人评审。

**判断有没有改善的指标**
- 各类型 PR 占比变化：feature 占比是否上升、maintenance 占比是否下降（对应原文观察到的方向）。
- CI 侧：CI 排队时长、CI 任务量、失败率是否下降（对应“简单任务移入 inner loop”）。
- 评审侧：每个 PR 的人工评审时长、评审意见条数、从开 PR 到合并的时长。
- 成本侧：按人 token 花费、单位功能 PR 的平均花费（而不是总花费——避免只靠少做事来降成本）。
- 质量侧（必测，防止只涨速度）：回归缺陷数、线上事故数、回滚次数。原文没有给出这些指标的目标值或基线，需要自己先建基线再判断。
