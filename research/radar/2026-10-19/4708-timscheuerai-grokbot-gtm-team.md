# timscheuerai/grokbot-gtm-team

- 结论：**值得一试**。可以小范围试：照 README 的四步（建 Chief of Staff → 粘贴 setup-prompt.md → 回答 5 个问题 → 连工具）搭起「一个 Bot 一件事 + 部门负责人路由守门 + 具体执行交给 Claude Code/Codex」的分工。理由是原文给出了完整的角色表、汇报关系、工作流和四要素交接格式，但真正的提示词正文在 setup-prompt.md/agents/*.md 里没有随材料给出，需自行取用并把 OXYGEN 等专有名词替换掉。
- 原文：https://github.com/timscheuerai/grokbot-gtm-team
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T16:09:30.468Z

## 是什么

一个可直接导入的多智能体（Grok Bot）团队配置，作者 Tim Scheuer（OXYGEN 联合创始人）把自己搭的 13 个 Grok Bot agent、它们遵守的规则、以及如何把真正要干的活交给 Claude Code / Codex 的全套结构开源出来（MIT）。核心主张是一句话：**不要让 Grok Bot 去做那件活，让它去带队做那件活**。

组织结构（README 原表）：

| Bot | Job | Reports to |
|---|---|---|
| Chief of Staff | 带队，把所有工作单元发给 Claude Code 或 Codex | Me |
| Outbound Lead | 规划、路由、守门外呼；工作日 08:20 rollup | Chief of Staff |
| Lead Sourcer | 冷名单 + 来自帖子互动者/注册的暖线索 | Outbound Lead |
| Outbound Copywriter | 冷邮件与 LinkedIn 序列文案 | Outbound Lead |
| Sequences & Deliverability | 装载已批准的序列，维护 campaign 健康 | Outbound Lead |
| Social Engagement | 创作者观察名单、互动队列、评论草稿 | Outbound Lead |
| Reply Manager | LinkedIn 收件箱分诊、起草回复 | Me |
| Deal Reactivation | 找最热的旧对话、起草跟进 | Me |
| Head of Content | 排一周内容并路由给写手 | Chief of Staff |
| LinkedIn Writer / X Writer / YouTube Writer / Graphic Designer | 各平台内容与视觉 | Head of Content |
| Content Room | 内容 Bot 协同用的群聊 | — |

工作流（README 原样）：

```text
Me            goals and approvals
  ↓
Grok Bot      13 Bots and 1 group chat; the Chief of Staff routes the work
  ↓
Claude Code   any Bot can send it a unit of work: outcome, inputs, skill, limits
+ Codex
  ↓
Your files    second brain, skills and GTM platform; every result comes back for review
```

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 前提说明：以下第 1–4 步是 README 里逐字给出的导入流程；真正的提示词正文存放在 `setup-prompt.md`，本材料未抓到，需要打开 https://github.com/timscheuerai/grokbot-gtm-team 的 `setup-prompt.md` 取用。第 5 步的交接格式来自 README 的流程图与 `guides/claude-code-and-codex.md` 的描述。

**步骤 1：建一个 Bot。** 前提：有 Grok Bot 账号（README 明确说"That is enough to start: the team works without the rest"）。
在 Grok Bot 里新建一个 Bot，命名为 **Chief of Staff**。

**步骤 2：粘贴导入提示词。** 前提：拿到 `setup-prompt.md` 的内容。
把 `setup-prompt.md` 里的 prompt 粘贴进它的对话。

**步骤 3：回答它的 5 个问题。** 前提：事先想清楚下面五项（README 列出的问题清单）：
- 你的公司
- 你的 ICP
- 你的 GTM 工具
- 你的第二大脑（second brain）
- Claude Code 和 Codex 跑在哪里

回答后，它会自动创建其余 Bot、Content Room（群聊）和那 1 个 routine，然后告诉你 App 里还剩什么要手动做。README 强调：**搭建过程中不会发送或花费任何东西**。

**步骤 4：连工具与权限。** 前提：各 Bot 的 instructions 里已写明它可以/不可以调哪些连接器。
去 Grok Bot 的 settings 里连接对应工具。若不想用自动导入，改手工：打开 `agents/` 下每个文件，里面都有可直接粘贴的 instructions block。

**步骤 5：把执行层接上（可选）。** 前提：有 Claude Code 或 Codex。任何 Bot 都可以往执行层发一个"工作单元"，格式固定为四要素：

```text
outcome / inputs / skill / limits
```

配套约定（来自 `guides/claude-code-and-codex.md` 的说明）：持久终端会话、**每个任务一个 worktree**、内容类任务跑在你自己的 Mac 上而代码类任务跑在 dev server 上。如果不接 Claude Code/Codex：把某个 Bot instructions 里的 handoff 那一行删掉，它就自己干。

**步骤 6：准备底料（可选但影响效果）。**
- 一个第二大脑（含你的语气、素材证据、受众画像）+ 写手们用的内容技能；README 指向作者的另一个仓库 LinkedIn Funnel kit。
- 一个 GTM 平台（表、富化、序列、收件箱）。外呼那几个 Bot 是按 **OXYGEN 及其 CLI** 写的，用别的平台就把名字换掉。

**作者的删减经验（可直接照抄的取舍原则）：**
- 定时例程从 10 个砍到 1 个，只留 Outbound Lead 每工作日 08:20 的 rollup；Head of Content 的晨报被暂停（作者评价：slop）。
- 不再用"一个 Bot 干所有事"：Outbound 从 1 个 Bot 拆成 1 个 lead 路由 + 4 个专才。
- 文案、图形、视频不再在 Grok Bot 里做，因为质量达不到作者要求，改交 Claude Code/Codex + 已有 skills。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：原文把"编排/路由/守门"与"真正产出"切开——Bot 负责规划、分流、把门、rollup；具体文案、图形、视频、代码则交给 Claude Code/Codex 的 skills。也就是说，过去默认丢给单一聊天机器人去写的东西，这里被重新分配给"一个 Bot 一件事 + 外部执行层"。
2. **任务匹配**：给出了明确的角色—任务对应表和汇报链（Chief of Staff → 部门负责人 → 专才；Reply Manager 与 Deal Reactivation 直接向"我"汇报）。原则是"每个 Bot 只做 1 件事"，部门负责人只做路由和 gate。另一个可迁移的判断：质量不达标的工种（作者点名文案、图形、视频）不在编排层做，换执行层。
3. **条件供给**：需要提供——Grok Bot 账号；公司/ICP/GTM 工具/第二大脑/执行层位置这 5 项答案；连接器的工具与权限（按 Bot 的 instructions 逐一授予）；一个含语气、证据、受众的第二大脑与内容 skills；一个 GTM 平台（原文按 OXYGEN 及其 CLI 写）。交接给执行层时必须给全四要素：outcome、inputs、skill、limits。反馈机制是"每个结果回来都要 review"以及部门负责人的 gate。
4. **主动推进**：原文只给了一类触发——**时间**：Outbound Lead 每工作日 08:20 的 rollup，全队仅此 1 个例程（作者从 10 个减到 1 个）。事件触发、状态触发原文未涉及，不能替它补。
5. **效果验证**：原文给的是流程内的把关，不是指标：结果一律回传 review、部门负责人 gate 已批准的内容才装载、任何 Bot 都可以把工作单元派出去。作者唯一的"验证"式陈述是主观质量判断（晨报是 slop 所以暂停；文案/图形/视频质量不达标所以外迁）。没有量化验收标准。

## 与已有做法的关系

- 清单中的 **Claude Code（tool，状态 adopt）** 与本条是**互补而非替代**关系：本方案把 Claude Code（以及 Codex）当作执行层，Grok Bot 团队当作其上游的编排/路由/审批层。README 的工作流图把这条依赖画得很直白（Grok Bot → Claude Code + Codex → 你的文件）。如果清单里已有 Claude Code 的采用经验，本条可以作为"谁来给 Claude Code 派活"的上一层补充。
- 清单中其余条目：无相关条目。

## 证据与局限

**属于原文给出的事实（可核对）：** 仓库里是 13 个 Bot + 1 个群聊 + 1 个例程；`agents/` 下每个文件含可粘贴的 instructions block；`guides/rules.md`、`guides/claude-code-and-codex.md` 存在；导入流程为 4 步；setup 会问 5 个问题；交接格式为 outcome/inputs/skill/limits；每个任务 1 个 worktree、持久终端会话、内容跑本机 / 代码跑 dev server；MIT 许可；stars 30（来源 github-search 指标）。

**只是作者主张、无数据支撑：** "让 Bot 带队而不是让它干活"更有效；"文案、图形、视频在 Grok Bot 里质量不够"；"晨报是 slop"；routine 从 10 个减到 1 个更好。这些都是个人经验判断，没有给出对照数据、耗时或产出的量化结果。

**关键局限（直接影响可复用度）：**
1. 本材料只抓到 README，`setup-prompt.md` 和 `agents/*.md` 的实际提示词正文**没有出现在输入里**，所以第 2 步和第 4 步的核心内容无法照抄，必须自行去仓库取。
2. README 明确依赖 **OXYGEN 及其 CLI**（外呼 Bot 是按它写的），且 README 里带 OXYGEN 的推广链接，作者是 OXYGEN 联合创始人——存在商业动机，选型时把它当参考而不是标准答案。
3. 适用条件偏具体：B2B/GTM 外呼 + 内容营销场景；单人（"Me"直接收两个 Bot 汇报）的团队规模；英文平台（LinkedIn / X / YouTube / 冷邮件）。中文场景或非 GTM 团队的迁移成本未讨论。
4. 没有任何关于成本（token、订阅）与安全/权限边界的说明，只说了"搭建过程不发送不花费"。

## 怎么试、怎么验证

**最小试用（建议 2 周，先不接执行层）**
1. 只建 3 个 Bot，不要一次上 13 个：Chief of Staff + 一个部门负责人（选 Outbound Lead）+ 一个专才（选 Lead Sourcer）。用 `agents/` 里对应文件的 instructions block 手工粘贴，避免自动导入一次建太多。
2. 先不接 Claude Code/Codex：按 README 的说法，把 handoff 那行从 instructions 里删掉，让 Bot 自己干，这样能测出"编排层本身值不值"。
3. 只保留 1 个例程：部门负责人的工作日早上 rollup。**不要**一开始就铺开多个定时任务——这正是作者踩过并砍掉的坑。
4. 第二周再把一个真实工作单元用四要素（outcome / inputs / skill / limits）派给 Claude Code，观察"给全四要素"是否比平时随口下指令产出更好。

**判断有没有改善的指标（下列指标是本次调研建议的，原文未给）：**
- 你每天亲自处理 GTM/内容事务的时间（对比使用前两周）。
- rollup 里"需要你自己动手改"的条目占比——若持续偏高，说明守门/gate 没起作用，或该工种本就该交给执行层。
- 派给 Claude Code 的工作单元中，一次通过 review 的比例；失败案例里有多少是因为四要素没给全（可定位到 outcome/inputs/skill/limits 哪一项缺失）。
- 专才 Bot 与负责人 Bot 之间的往返轮次（轮次高说明路由规则没写清）。
- 反向信号：如果你发现自己在给 Bot 打补丁式地加规则，或某个 Bot 的产出你从不采用，按作者的取舍原则直接删掉它，而不是继续调。

**明确的证伪点：** 如果删掉 handoff、只靠 Grok Bot 自己干，产出质量就让你无法接受（作者对文案/图形/视频的判断），那这个方案对你只剩"编排层"的价值，必须配套执行层才成立；反之如果你根本没有 Claude Code/Codex，那先评估是否要引入。
