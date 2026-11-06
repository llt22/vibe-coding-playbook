# @vulnix0x4: Copy everything below into a fresh Hermes Agent session:

- 结论：**值得研读**。这条线索可提炼的只有一个提示词骨架——要求 agent 交付可运行产物而非计划——思路值得借鉴，但原文在列举交付物处即被截断，没有可照做的完整步骤，只能作为提示设计参考。
- 原文：https://x.com/vulnix0x4/status/2118502357332054281
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T06:44:56.683Z

## 是什么

一条 X 推文。正文只有一句引导语“Copy everything below into a fresh Hermes Agent session:”，随后是一个代码块中的提示词开头：

```text
Build me a working, durable, authorized HackerOne bug-bounty automation system. Do not give me a plan, a stub, or only documentation. Actually create the profiles, workspace, validators, Kanban board, scheduler
```

原文在此处被截断，后续内容（各 profile 的定义、workspace 结构、校验器规则、看板字段、调度配置、授权边界）均不可见。因此可用的信息只有“这段提示要求 agent 做什么、禁止它做什么”，没有它具体怎么做。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 说明：原文只给出了提示词的第一句，以下是把已见部分还原为可操作骨架，**不是**原文给出的完整流程。第 4 步之后的内容原文缺失，无法提供。

1. 前提：有一个支持长任务、可写文件、可维持状态的 agent 会话环境（原文指定为 Hermes Agent，且要求 “fresh session”，即干净上下文）。
2. 前提：任务必须**已获授权**。原文把 “authorized” 写进提示词本身；bug bounty 场景下只能在明确授权的目标上运行，否则不要执行此类提示。
3. 把提示词原文粘贴进新会话（可原样复制的部分）：

```text
Build me a working, durable, authorized HackerOne bug-bounty automation system. Do not give me a plan, a stub, or only documentation. Actually create the profiles, workspace, validators, Kanban board, scheduler
```

4. 从这句可提取的三条可复用约束（这是本条线索真正的价值）：
   - **否定式输出约束**：“Do not give me a plan, a stub, or only documentation”——把 agent 的默认交付物从方案/骨架/文档改为可运行实体。
   - **交付物逐项枚举**：profiles、workspace、validators、Kanban board、scheduler——用清单把“系统”拆成必须存在的具体构件，便于事后逐项验收。
   - **属性前置**：working（能跑）、durable（可持久、重启不丢）、authorized（合规边界）三个形容词直接写进目标句。
5. 后续步骤（原文被截断，缺失）：各 profile 如何定义、validator 校验什么、看板字段与状态机、scheduler 的触发条件与频率、验收方式——均无原文依据，不要臆造。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文体现的用法是把 AI 从“给方案”推到“一次会话内建出多构件系统”。这是能力边界上的一个方向性主张，但原文没有展示任何实际产出，无法确认它真的能做到。
- **任务匹配**：明确指定由 agent 类工具（Hermes Agent）承担多步骤构建任务，而非对话式问答。原文未涉及模型或工具的对比选择，无法据此判断匹配规则。
- **条件供给**：原文点名的 workspace、profiles、validators、board、scheduler 本质上就是提供给 agent 的运行环境与反馈装置（validator 相当于自动反馈回路）。但具体要给什么信息、什么权限，原文未展开。
- **主动推进**：scheduler 与 Kanban board 同时出现，说明设计意图包含按时间触发和按任务状态流转的持续运行。这是原文唯一明确指向“可持续自主推进”的证据，但只有名词，没有机制。
- **效果验证**：仅有 “validators” 一词暗示内建校验，原文没有给出任何指标、验收标准或成功判定方法。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Hermes（tool，status: watch）**：本条线索正是给 Hermes Agent 的一段提示词开头，可作为“如何向 Hermes 下构建类指令”的一个样本。但由于原文截断，无法判断它与清单中已有的 Hermes 用法有何差异，也不足以据此把 Hermes 的状态从 watch 上调。
- 其余清单条目：无相关内容。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- **数据**：仅互动量（50 赞、0 转发、0 回复）。没有任何效果数据、案例、成品截图或运行记录。
- **作者主张**：全部内容都是提示词本身，属于“这样要求 agent 就能得到可运行系统”的主张，未经任何验证。
- **截断**：原文在列举交付物处中止，最关键的实施细节（profile 设计、校验规则、看板结构、调度配置）全部缺失。
- **适用条件**：需要支持长任务、文件写入与状态持久化的 agent 运行时；任务本身必须已获授权（原文把 authorized 写进目标，说明作者也认为这是前提而非可选项）。
- **风险**：bug bounty 自动化直接涉及对第三方系统的探测，授权边界不清时具有法律与合规风险，不可在未授权目标上照搬。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用**（在拿到完整提示词之前，只验证可提取的那三条约束是否有效）：

1. 选一个无害的替代任务（例如为自有代码库搭一套 lint + 测试 + 任务看板 + 定时跑的流水线），不要用真实 bounty 目标。
2. 在干净会话中，用与原文同构的提示词下指令：目标句写清 working / durable 属性 + “不要给计划、桩或文档” + 枚举必须存在的构件清单。
3. 会话结束后，逐项对照构件清单验收：哪些真的存在且能跑，哪些需要人工补。

**判断有没有改善的指标**：

- 一次会话内实际产出且可运行的构件数 / 清单总项数（对照“只给计划”的基线提示）。
- 需人工补全或重写的比例。
- 持久性：会话重启或进程重启后，状态与调度是否仍然生效。
- 校验器通过率与首次运行失败原因分布。
- 达到可用状态所需的总耗时与返工轮次，与人工搭建或普通提示词方式对比。

若后续能取得完整原文，应重新评估是否上调为 try——关键看它是否给出了可复制的 profile 定义、validator 规则与 scheduler 配置。
