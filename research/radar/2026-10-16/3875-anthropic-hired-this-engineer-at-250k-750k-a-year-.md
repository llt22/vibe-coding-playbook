# @shikamarutsai: Anthropic hired this engineer at $250K–$750K a year because he knows how to build harnesses for mult

- 结论：**值得研读**。把这条线索当作概念框架存档：agent 之上还有一层 harness（循环、图、编排），对应研究里的工具选型与自动推进，但原文在“step 1 → start with the Claude Agent SDK —”处截断，没有任何可照做的步骤、配置或提示词，暂不采用，等拿到完整 workshop 内容再评估。
- 原文：https://x.com/shikamarutsai/status/2110817965658571181
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-15T23:24:00.945Z

## 是什么

这是一条 X 推文（@shikamarutsai），内容为转发/介绍一位据称被 Anthropic 以 $250K–$750K 年薪聘用的工程师的 15 分钟 workshop，主题是「如何从零构建多代理系统（multi-agent systems）的 harness」。

原文极短且被截断，实际给出的信息只有两块：

- 一条抽象链：`AI → Agents → Harness → Loops → Graphs`
- 一句未写完的起点：`step 1 → start with the Claude Agent SDK —`

采集到的正文在第一步之后即中断，没有后续步骤、代码、配置或提示词。因此本报告只能依据这条推文本身判断，不能还原 workshop 的实际做法。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

原文没有给出可照做的完整步骤，无法提炼编号流程。以下仅为原文明确写出的唯一一步及其前提，其余内容原文缺失：

1. **从 Claude Agent SDK 起步**
   - 原文表述：`step 1 → start with the Claude Agent SDK —`（句子在此截断）
   - 前提：需要能够使用 Anthropic 的 Claude Agent SDK（原文未给安装方式、版本、API key 配置、最小代码示例）。

原文只给了名词层级 `AI → Agents → Harness → Loops → Graphs`，但没有对 harness、loops、graphs 各自给出定义、结构或实现方式，因此无法据此写出任何可复制的配置或代码。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文未提供。没有说明 AI 已被用来做哪些原先没人交给它的工作。
- **任务匹配**：有间接依据。原文把 harness 放在 agents 之上、并引出 loops/graphs，暗示「多代理任务」需要额外一层编排，而不是单个模型直接作答；但没有说明什么任务该配什么模型或协作方式。
- **条件供给**：几乎无依据。仅提到起点是 Claude Agent SDK，未涉及需要提供哪些信息、工具、权限或反馈。
- **主动推进**：有间接依据。`Loops`（循环）与 `Graphs`（图）两个词指向用循环/图结构组织持续执行，但原文没有给出任何触发条件、状态机或持续运行的具体做法。
- **效果验证**：原文未提及。没有任何关于如何判断改善的说明或指标。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中没有相关条目（输入中 `catalog_related` 为空）。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文提供的信息：**

- 一条推文正文（互动数据：likes 30、reposts 3、replies 7）。
- 一个名词层级：`AI → Agents → Harness → Loops → Graphs`。
- 一个起点指令：从 Claude Agent SDK 开始。

**只是作者主张、无法核实的内容：**

- 「Anthropic hired this engineer at $250K–$750K a year」——薪资数字与雇佣关系均无来源。
- 「In a 15-minute workshop, he shows exactly how to build one from scratch」——workshop 的存在与内容无法核实，属于推广话术。
- 「exactly how to build one」这一说法在采集到的正文中没有兑现：正文没有出现任何步骤、代码或配置。

**局限：**

- 正文被截断，关键部分（step 1 之后的内容）缺失，无法判断 workshop 的实际深度。
- 「harness」这个概念在原文中仅有名字，没有定义；无法确认它指编排框架、工具循环、还是评测脚手架。
- 适用条件：只有当能拿到完整 workshop 内容（原始视频、完整线程或配套代码）时，这条线索才可能转化为可照做的做法；仅凭当前正文不具备实操价值。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

由于原文没有给步骤，不建议现在按这条推文去搭系统。如果确实想验证「harness」这一思路，可以做一次不依赖本推文的最小实验：

1. 用 Claude Agent SDK（或你已在用的等价 agent SDK）搭一个最小结构：**一个 agent + 一个循环 + 一个明确的终止条件**。
2. 选一个需要多步工具调用的真实小任务（例如「查资料 → 汇总 → 生成一页记录」），分别用两种方式跑同一批（建议 ≥5 个）任务：
   - A：单轮直接调用模型
   - B：带循环与终止条件的 harness
3. 记录指标：
   - 任务完成率（成功产出可用结果的比例）
   - 人工接管/修正次数
   - 每个任务的耗时与 token 成本
   - 失败模式分类（提前停止、死循环、工具调用错误等）
4. 判定改善：相对单轮调用，若多步任务的成功率上升、人工接管次数下降，且成本增幅可接受，则说明「加一层循环编排」这一方向对你的场景成立。

注意：这个实验验证的是「harness 这一概念」，不是「这条推文的具体做法」——原文并未给出可复现的做法。若后续拿到完整 workshop 内容，应重新评估 verdict，再决定是否升级为 try 或 adopt。
