# How Anthropic’s Dynamic Workflows Coordinate Claude Agents

- 结论：**值得研读**。建议把它的多智能体编排思路（由 lead agent 自建拓扑、隔离上下文并行扫描 + 集中复核两阶段、session budget 上限、Console graph 逐跳检查 payload）作为设计参考研读，但原文只是会议报道，没有可直接照做的命令、配置或提示词，且功能刚发布、dreaming 仍是 research preview，暂不建议直接采用或小范围试。
- 原文：https://www.latent.space/p/claude-dynamic-workflows
- 来源：rss:src-latent-space，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-12T21:13:18.322Z

## 是什么

Anthropic 的 CJ Avilla 和 Harrison Stall 在 AI Engineer New York 2026 上介绍 Claude Managed Agents 的新功能 **dynamic workflows（简称 flows）**，官方定义是“一种新的多智能体编排，为最有野心的负载而建”。

- 之前的 Claude Managed Agents 需要开发者自己配一个 coordinator 和一组 subagents；flows 让 **Claude 自己决定如何拆分和编排工作**。
- 机制：lead agent 先做计划，然后 **Claude 写出一个编排程序**，由该程序启动 agent、收集结果、管理信息流。
- 原文称其为 Claude Code 里 “a harness for every task” 概念的延伸，但 flows 能比单个 agent 或一个 roster 跑得更久。
- 这些都在 **Claude Console**（Managed Agents 所在处，开发者通过 API 使用 Claude 的界面）中提供。

## 具体做法

原文**没有给出任何可复制的命令、配置片段或提示词**，以下只是它描述的操作形态，作为设计参考，不能照抄执行。

1. **前提**：需要能访问 Claude Console / Claude Managed Agents（API 方式）。原文未给出具体入口路径、开通方式或配置样例。
2. **让 lead agent 自己定拓扑**：不要预先手工指定 coordinator 与子智能体清单；由 lead agent 产出计划，再由 Claude 生成编排程序来启动 agent、收集结果、管理信息流。
3. **可选：传入预配置的专门子智能体**：Avilla 说在 agent config 中可以传入 pre-configured sub-agents，需要专才时用。原文未给出 config 字段或示例。
4. **用“隔离上下文的分发扫描 + 集中复核”两阶段模式**：演示的 stock watchlist scanner 中，scan 阶段把各个股票代码分给各自隔离上下文的 agent，之后的 review 阶段检查这些发现再产出报告。
5. **开发者侧设置 session budget**：Stall 明确说模型运行时**不知道**自己的预算，但开发者可以设会话预算（原文配图标题即“Setting a budget is key!”）。
6. **子智能体数量靠 evals + 低默认值控制**：当被问“简单扫描会不会触发上百个子智能体”，Stall 的回答是“evals 和更低的默认值”；并指出有野心的任务通常需要**显式鼓励更强的并行化**，否则默认不会大量并行。
7. **用 Console 的 graph 功能做可见性检查**：可以看 lead agent 到底把什么 payload 传给了 sub-agent，从而理解整张图里每一次 transition 的实际内容。
8. **子智能体之间共享文件系统交换信息**：Stall 说 agent 共享一个 filesystem，可以用它交换信息；但开发者**不能**通过 API 直接指示一个 workflow 子智能体给另一个发消息。
9. **用 dreaming 整理记忆库以降本增效**（research preview）：文档中 dreaming 会读取现有 memory store 和历史 session transcript，产出一个重新组织的 memory store——合并重复项、替换掉过时或矛盾的条目、浮现新的洞见；Avilla 在 flow 语境下把它描述为“结晶化并改进与这些 session 相关的 memory store”。

## 对应的研究问题

- **能力发现**：原文提示了一件容易被忽略的事——把“如何组织智能体”这件事本身交给模型（lead agent 写编排程序决定拓扑）；另外 dreaming 可以把“整理自己的记忆库”交给模型自动做（去重、替换过时条目、浮现新洞见）。
- **任务匹配**：flows 面向大而需要并行的任务；对照演示，单智能体更便宜，flows 成本“much more（高得多）”但“much more effective at finding all of the details（更能找全细节）”。需要信息在子智能体之间流转时，走共享文件系统，而不是 API 直连消息。
- **条件供给**：需要 Console/API 访问；需要开发者设 session budget（模型自身不知道预算）；可选提供预配置子智能体；需要 evals 与较低默认值来控制 agent 数量；需要 graph 可见性来做人工核查；子智能体间需要共享文件系统作为信息通道。
- **主动推进**：原文提到 watchlist flow 的“next scheduled run”，说明存在按计划重复运行的形态；但被问到 flow 能否自我改进（例如发现扫描模型不合适就改下一次运行）时，Stall 说**没有内置**，他和 Avilla 建议用 hill-climbing 加 dreaming 自己搭这个循环。
- **效果验证**：evals（用来决定任务需要多少 agent）；Console 的 graph 功能逐跳检查 payload；以及 flows 与单智能体在成本、细节覆盖度上的对比。原文没有给出任何具体指标数值或评测方法。

## 与已有做法的关系

清单中相关条目：**Claude Code（tool，已 adopt）**。原文明确说 dynamic workflows 起源于 Claude Code 的 “a harness for every task” 概念，但 flows 是面向 Claude Managed Agents / Claude Console 的另一层能力，能跑得比单 agent 或一个 roster 更久。清单中没有其他相关条目。

## 证据与局限

- **材料性质**：Latent.Space 的会议报道（作者 Richard MacManus，2026-10-12），依据两位 Anthropic 技术员工的现场演讲与 Q&A，**不是官方文档**，也没有链接到 flows 的文档。
- **有依据的案例**：stock watchlist scanner 演示——scan 阶段把各个 ticker 分给隔离上下文的 agent，review 阶段复核后出报告。
- **只是主张、没有数据**：flows 比单智能体“贵得多”“更有效”；人类正在成为审批 PR 的瓶颈；flows 是“把 test-time compute 砸向难题”的方式；以及“让通用公众也能做科学发现”的目标。原文没有给任何数字、benchmark 或对比实验。
- **明确的功能边界**：模型运行时不知道自己的预算；子智能体之间不能通过 API 直接互发消息；flow 的自我改进没有内置；dreaming 是 research preview。
- **最大的局限**：全文没有任何可复制的命令、配置或提示词，也没有说明如何创建、调用一个 flow，因此无法照做。

## 怎么试、怎么验证

由于原文没有可执行细节，只能做**概念级的最小验证**，且应先确认你确实能用 Claude Managed Agents/Console。

1. 挑一个天然分成“并行扫描 + 集中复核”两阶段的任务（例如监控一批信息源或标的），先跑一个单智能体版本作为基线。
2. 设置一个 **session budget 上限**，避免成本失控（原文提示模型自己不知道预算，必须由开发者设）。
3. 用 flow 形态重跑同一任务，把子智能体数量从低默认值起步，只有在结果明显不全时才显式要求更强并行。
4. 用 Console 的 graph 功能逐跳检查 lead→sub-agent 的 payload，确认分发和汇总的内容符合预期。

判断有没有改善的指标：

- **细节覆盖度**：发现的有效条目/细节数量（原文称 flows 更能找全细节）。
- **成本倍数**：相对单智能体的 token/花费增幅（原文只定性说“much more”，需要自己量出来）。
- **人工介入次数**：需要人工审批或修正的输出数量——这正是原文点出的人类瓶颈问题。
- **可解释性**：能否通过 graph 说清每一次 transition 传了什么；说不清就是编排设计有问题。
- **重复运行的成本趋势**：如果在多轮运行中使用 dreaming 整理 memory store，观察后续同样任务的成本是否下降。
