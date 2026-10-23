# How Anthropic’s Dynamic Workflows Coordinate Claude Agents (Updated with video!)

- 结论：**值得研读**。把“由主控 agent 出计划并写编排程序、按隔离上下文并行分发子任务、最后统一 review 出报告、同时设 session budget 并用 graph 逐跳检查 payload”这套编排模式，搬到你自己的多 agent 流程里，先跟单 agent 做小范围对比；原文只是 5 分钟的会议报道，没有任何配置、命令或提示词，具体实现要自己补，所以只值得研读思路、不必照搬这个具体产品。
- 原文：https://latent.space/p/claude-dynamic-workflows/
- 来源：rss:src-latent-space，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T12:50:21.791Z

## 是什么
Anthropic 在 AI Engineer New York 2026 的 workshop 上介绍的 dynamic workflows（现场简称 flows），是 Claude Managed Agents 里的一种新多智能体编排方式，定位是“为最有野心的负载而建”。

机制（按原文描述）：主控 agent（lead agent）先为任务做计划，然后**自己写一段编排程序（orchestration program）**，由这段程序去启动 agent、收集结果、管理信息流。相比之前的 Claude Managed Agents 需要开发者自己配一个 coordinator 加一组 subagents，flows 把“怎么拆分、怎么编排”的决定权交给了 Claude。原文的说法是“让 Claude 完全编排它自己的多智能体拓扑”。

演示例子是一个简单的股票自选股扫描：scan 阶段把每个 ticker 分发给**上下文隔离**的 agent，之后的 review 阶段检查这些发现，再产出报告。入口在 Claude Console（通过 API 使用 Claude 的开发者界面），也就是 Managed Agents 所在处。

## 具体做法
**前提说明：原文没有给出任何命令、配置、提示词或 API 参数，以下每一步都是把原文描述的机制落到自建编排时需要自己补齐的动作，不是原文照抄。**

1. **前提**：需要能跑多 agent / 子任务编排的运行时。原文的形态是 Claude Console 里的 Managed Agents（需 API 访问）。如果没有该功能，用任何“让模型产出一段编排脚本、再由宿主执行”的框架替代。
2. **让 lead agent 先出计划**：把任务拆成原文所说的“discrete, verifiable units of work”（离散、可验证的工作单元）。验收标准是每个单元能独立判断对错。
3. **让 lead agent 写编排程序**：这段程序负责启动 agent、回收结果、管理信息流。原文未说明用什么语言或格式写，需自行约定。
4. **并行阶段给每个子 agent 隔离上下文**：原文示例把每个 ticker 交给独立 context 的 agent，避免互相污染，也避免主上下文被撑爆。
5. **设一个汇总/复核阶段**：所有 scan 结果回到 review 阶段统一检查后再产出报告。这是原文示例的两段式结构（scan → review）。
6. **需要专家角色时**：原文提到可以在 agent config 里传入预配置的 sub-agents，用来插入 specialists。
7. **设 session budget**：原文明确开发者可以设置会话预算，而模型在运行时**并不知道**自己的预算（作者调侃告知预算会让 agent“有点焦虑”）。
8. **子 agent 之间要交换信息，走共享文件系统**：原文说 agents 共享一个 filesystem 可以借此交换信息，但开发者**不能**通过 API 直接指示某个 workflow subagent 去给另一个发消息。
9. **用 graph 做可观测性**：在 Claude Console 的 graphing 功能里逐跳查看“lead agent 到底给 subagent 传了什么 payload”，理解整张图每一次转移。
10. **控制并行规模**：原文的回答是“evals 和更低的默认值”——模型不会自动为简单任务开几百个子 agent；复杂任务通常需要**显式鼓励**更大并行。
11. **降低重复运行成本 + 维护记忆**：可用 dreaming（research preview）——它读取既有 memory store 和历史 session transcripts，产出一个重新组织的 memory store：合并重复项、替换过期或被推翻的条目、浮现新洞察。原文把它描述为“把相关 session 的记忆 crystallize 并改进”。

## 对应的研究问题
1. **能力发现**：最明确的一条是——**“该拆成几个 agent、怎么拆、怎么连”本身可以交给模型**，而不是由人预先配置 coordinator 和 roster。次要一条：记忆库的重组（去重、清过期、浮现洞察）也能交给模型做（dreaming）。
2. **任务匹配**：原文把 flows 定位给“most ambitious workloads”和大项目；成本上明确“much more”贵于单 agent，但“much more effective at finding all of the details”。作者的说法是“把 test-time compute 砸到难题上、更快从模型里榨出能力”。简单任务（如一次 ticker 扫描）用它属于杀鸡用牛刀，且原文承认这类演示“离 Anthropic 鼓励的大项目很远”。
3. **条件供给**：需要 API/Console 访问权限；需要设 session budget；可在 agent config 预置 sub-agents；子 agent 间共享文件系统；需要 graph 这类可观测性来检查每次转移的 payload；若要跨 session 复用则需要 memory store（配合 dreaming）。反馈来源是 review 阶段与 graph 检查。
4. **主动推进**：原文示例本身是**周期性扫描**（Q&A 里提到“next scheduled run”），说明可由时间触发持续跑。但“flow 自己发现扫描模型不行、就改下一次运行”这种自我改进原文明确说**没有内建**，建议用 hill-climbing 和 dreaming 来改进这个循环。
5. **效果验证**：原文只给了定性对比（更贵、找细节更全），**没有给任何指标或数字**。可用的验证手段有两个：一是用 evals 来决定 agent 数量的默认值；二是用 Console 的 graph 逐跳检查 lead→subagent 的 payload，确认信息传对了。

## 与已有做法的关系
- **Claude Code（adopt）**：原文明确说 dynamic workflows 起源于 Claude Code 里的“a harness for every task”概念，flows 只是能跑得比单个 agent 或一个 roster 更久。也就是说它是 Claude Code 这条线的延伸，不是另起炉灶；已在用 Claude Code 的人可以把它理解为“把编排权上移一层”。
- **Latent Space（source，adopt）**：本条就是 Latent Space 对一场 conference workshop 的现场报道，属二手报道，不是 Anthropic 官方文档，细节需回官方文档核对。
- 清单中没有其他相关条目。

## 证据与局限
**给出的证据**：AI Engineer NY 现场 workshop（两位 Anthropic 技术员工 CJ Avilla、Harrison Stall 主讲）、现场 Q&A 的具体问答、股票自选股扫描的流程图截图、Claude Console 与 Managed Agents 的界面截图。

**只是主张的部分**：“flows 是多 agent 编排的下一版”“把 test-time compute 砸向难题、让普通大众也能做科学发现”都是厂商愿景，没有 benchmark 或案例数据支撑。

**可确认为机制描述的部分**：lead agent 写编排程序、隔离上下文的并行子 agent、共享文件系统、可设 session budget、graph 可观测、dreaming 为 research preview。

**关键局限**：
- 全文约 5 分钟阅读量，**没有任何配置、命令、提示词、价格数字**，无法照抄实施。
- flows 是刚发布的新功能（文中说周五宣布），dreaming 仍是 research preview，成熟度不足。
- 模型运行时不知道自己的预算，成本控制只能靠外部设上限。
- 子 agent 之间不能通过 API 直接互发消息，只能借共享文件系统间接协作。
- 自我改进“not built in”，需要外挂 hill-climbing / dreaming。
- 适用条件：你有 Claude Console / Managed Agents 的访问权限，或者愿意在别的框架里复刻同样的编排模式。

## 怎么试、怎么验证
**最小试用**：挑一个天然可并行拆分的中等任务，照原文示例的结构搭：N 个独立条目 → 每个条目一个隔离上下文的子 agent → 统一 review 阶段 → 出一份报告。先用单 agent 跑同一任务做基线，再用“lead agent 出计划 + 写编排脚本”的方式跑一遍，固定同一个 session budget。

**判断改善的指标**：
- **细节召回/覆盖率**：报告里被检查到的条目数、核实的事实条数（对应原文“更能找全细节”）。
- **成本**：实际 token 花费与 session budget 的比值；原文已预警 flows 会“much more”贵，所以必须和召回提升一起看。
- **人工介入次数**：需要人手工审批/纠错的环节数（对应原文开头的痛点——人变成 bottleneck、在 GitHub 里逐個批 PR）。
- **子 agent 数量 vs 任务复杂度**：用 evals 找到合理默认值，避免简单任务触发大量子 agent。
- **可核查性**：能否在 graph 里逐跳看到 lead → subagent 的 payload，出问题时能否定位到具体某次转移。

**改善判据**：细节召回明显上升、成本仍在预算内、人工介入次数下降，三者同时成立才算改善；若只是更贵而细节没变多，说明这个任务不适合用 flows 式编排。
