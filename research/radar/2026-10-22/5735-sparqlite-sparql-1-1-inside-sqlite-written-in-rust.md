# sparqlite: SPARQL 1.1 inside SQLite, written in Rust

- 结论：**值得研读**。把这篇当作“长时编排式智能体 + 客观验收标准”的案例研读：可借鉴的是一句话目标加明确产物清单的委派方式，以及用标准符合性测试和差分模糊测试验收的做法；不必照搬这次的具体提示词，因为原文没有给出 Ultracode/dynamic workflows 的配置步骤，作者本人也坦言无法审阅产出。
- 原文：https://simonwillison.net/2026/Oct/16/sqlite-sparql-rust/
- 来源：rss:src-simon-willison-blog，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-22T05:49:50.253Z

## 是什么

原文是 Simon Willison 的一篇实验记录，主体不是 sparqlite 这个项目本身，而是**用 Claude Code for web 的 “Ultracode” 模式 + dynamic workflows 跑一次长时研究任务**的过程。按原文说法，Ultracode 打开后 Claude Code 会“生成 JavaScript，定义一个由子智能体组成的网络并协调它们”来处理复杂问题，具体机制原文只指向 Claude Code 文档，未在本文展开。

被生产的产物是 sparqlite：一个 Rust 写的 SQLite 可加载扩展，把 RDF quads 存进普通 SQLite 表，在 SQLite 进程内原生执行 SPARQL 1.1 查询与更新；采用整数编码词项、覆盖索引、基于代价的查询规划器、批量 join，可选直接读 SQLite B-tree。原文声称其在 count 模式下比“SQL 翻译”方案快 3.5×，返回完整结果时快 2.8×，通过 639 项适用 W3C 评测中的 636 项，并做了“数百万次差分模糊测试”（原文此处被截断）。

作者的核心态度是存疑：项目由一时兴起产生，代码量已不可能逐行审阅，连读文档都是不小的投入，他自己也“不确定该拿它怎么办”。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 前提说明：原文只提供了“发单”和“追加要求”两个提示词，以及验收侧的结果指标；**没有**给出 Ultracode 的开启方法、dynamic workflows 的 JavaScript 写法、模型与预算配置。以下步骤中标注了哪些是原文明确给出、哪些是原文缺失。

1. **确认任务有客观验收标准**（原文隐含前提，非明写）。本例的验收物是 W3C SPARQL 1.1 评测套件，没有这类“可通过/不通过”的外部标准时，本做法的主要收益（无人值守长跑）会变成主要风险（无法判断产出对错）。
2. **开启 Ultracode / dynamic workflows**（原文只给结论与文档指引，未给步骤）。原文表述为“With Ultracode turned on, Claude Code makes aggressive use of dynamic workflows”，并链接到 Claude Code 文档《Orchestrate subagents at scale with dynamic workflows》。此步需自行查阅该文档，原文不足以照做。
3. **用一句话给出目标，不做详细规格**。原文初始提示词（含作者自己说明的手机输入笔误 “delete”，本意是 “hit the rows directly”）：

```
Write a SQLite extension in Rust that implants SPARQL and runs really fast because it can hit the delete rows directly
```

4. **让它长时间自行推进，只在检查点时介入一次**。原文：这次运行“churn for over 12 hours”，作者第二天查看进度后只发了一条追加提示。
5. **追加提示的内容是“产物完整性”要求，而不是功能要求**。原文提示词：

```
Every folder in the crates/ directory needs a README

Include a tutorial.md teaching users how to install the extension and how to run it in the SQLite CLI and then teaching them SPARQL in addition to how to use the SQLite extension

Include a script with the tutorial for populating a SQLite database with useful and realistic example data for that tutorial
```

6. **验收：标准符合性测试 + 差分模糊测试 + 性能对比**（原文只给结果数字，未给命令）。原文给出的判据是 W3C 评测通过 636/639、数百万次差分模糊测试、以及相对“SQL 翻译”实现的 3.5×/2.8× 加速。差分模糊测试的对照实现、测试脚本原文未给。
7. **评估可维护性成本再决定是否采用**。原文的结论性动作是作者承认“不可能审阅产出的代码”，并把“是否值得投入时间去理解它能做什么”作为开放问题。这一步应作为流程的固定环节，而不是事后感想。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现（Q1）**：有依据。原文展示了此前不太会交给 AI 的一类工作——从零实现一个跨多个 crate 的数据库扩展（含查询规划器、索引、编码方案），并附带 README、tutorial.md 和示例数据脚本。这说明“完整的小型系统 + 配套文档与教学材料”可以一次性外包。
- **任务匹配（Q2）**：部分有依据。原文的正例是“目标可用外部测试套件判定”的重型实现任务，且适合拆成子智能体并行推进；反例是任何需要人逐行审阅才能放心使用的场景——作者明确说这次产出“not remotely feasible to review”。模型/工具面：Claude Code for web + Ultracode + dynamic workflows。
- **条件供给（Q3）**：有依据但很薄。原文实际供给的是：一句目标描述、一次追加的产物清单（README / tutorial.md / 示例数据脚本）、以及可用的参考标准（W3C 测试）。权限、工具链、反馈机制原文未描述。
- **主动推进（Q4）**：有依据。任务由一次发单触发后连续运行 12 小时以上，期间无需人工干预，属于典型的“时间/状态驱动、持续完成”模式；人工只在中间设一个检查点。
- **效果验证（Q5）**：有依据，且是本篇最有价值的部分。三个可操作的验证手段：外部标准符合性测试（636/639）、与另一实现的差分模糊测试、与基线实现的性能对比（3.5×/2.8×）。这三者都不依赖“读代码判断对不对”。

## 与已有做法的关系

清单中有 **Claude Code（工具，状态 adopt）**。本篇正是 Claude Code 的一个高阶用法记录：不是单轮对话式使用，而是开 Ultracode、由 dynamic workflows 生成 JS 来编排子智能体网络，跑长任务。可作为现有 Claude Code 条目下“重型任务 / 长时无人值守”子场景的补充材料。

清单中没有关于“用外部标准测试套件验收 AI 产出”或“差分模糊测试作为 AI 代码验收手段”的条目；若手册要写 Q5，这两点是新的可补充项。

## 证据与局限

**原文给出的数据/事实**：运行时长“over 12 hours”；产出为多 crate 的 Rust 项目；W3C 评测通过 636/639；count 模式 3.5×、返回完整结果 2.8×（对比对象是“SQL translation”方案）；“millions of differential-fuzz…”（原文在此截断）；两个提示词原文；作者自述无法审阅代码。

**只是作者主张或未经验证的**：加速比与测试通过率均无第三方复核，原文未给 benchmark 方法、数据集规模、硬件；“next-level vibe coding”是评价性表述；Ultracode 会“aggressive use of dynamic workflows”只给了文档链接，本文无独立证据。

**适用条件与风险**：
- 必须有可自动判定的验收标准；否则长跑产出无法评估。
- 作者的经历说明**提示词精度不是瓶颈**（目标句里带一个笔误仍产出了可运行实现），但**结果可控性差**是真实代价。
- 单一案例、无对照组、无重复实验，不能据此推断一般成功率。
- 原文为博客正文且有截断（`metrics` 为空，摘要段以省略号结束），部分细节（差分模糊测试的对象、Ultracode 配置）只能依据摘要判断，无法展开。
- 若团队需要在产出上继续开发和维护，本案例的性价比存疑——作者本人的犹豫正是这一点。

## 怎么试、怎么验证

**最小试用方式**（建议 1 人 1 天）：
1. 选一个**自带官方测试套件**的中小型任务（如某个格式解析器、某个协议的子集实现），不要选没有对错标准的任务。
2. 按原文方式发单：一句话目标 + 明确“要跑得快/要正确”的取向，不给详细设计。
3. 时间盒设为数小时量级，中途只查看一次进度，并用一条追加提示要求产物完整性（每个模块的 README、tutorial、可复现的示例数据脚本），直接复用原文第 5 步的三段式提示词结构。
4. 验收只跑三类检查：官方测试套件通过率、与一个已有实现做随机输入的差分对比、与朴素实现的性能对比。

**判断有没有改善的指标**：
- 官方测试套件通过率（对照：手工实现或普通单轮 AI 辅助的基线）。
- 从发单到“可运行且能通过测试”的墙钟时间。
- **人工理解成本**：让一名未参与的工程师按 tutorial.md 跑通并解释核心设计所需的时间——这是本案例真正的瓶颈指标，若超过总节省时间，则判定为未改善。
- 差分模糊测试发现的不一致数量及收敛速度。
- 性能比（对照基线实现），需自行固定数据集与硬件，原文数字不可直接引用。

**止损条件**：若在时间盒内无法形成可自动判定的验收结果，或人工理解成本高于重写成本，则退回普通 AI 辅助开发，不采用长时编排模式。
