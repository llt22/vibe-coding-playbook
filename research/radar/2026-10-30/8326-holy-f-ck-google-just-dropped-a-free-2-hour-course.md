# @ryouxbt: Holy f*ck, Google just dropped a free 2-hour course on Harness, Loop and Graph engineering

- 结论：**值得研读**。建议把这条线索作为“Harness Engineering”的课程资源去研读，而不是直接照做；原文只是课程宣传和时间戳，没有给出可复制的步骤、配置或流程。
- 原文：https://x.com/ryouxbt/status/2115798337324494872
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T18:56:07.294Z

## 是什么
这是一条推文，宣称 Google 发布了一门免费 2 小时课程，主题覆盖 Harness engineering、Loop engineering 和 Graph engineering，并称内容从“一个 prompt”扩展到“100+ agents 测试、评判并修复自己的工作”。推文只列出几个时间节点（0:00–0:29 Harness engineering from scratch；11:08 Build your first agent the right way；28:03 之后未显示），没有提供课程链接、讲义、代码或具体操作说明。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
原文没有给出可照做的具体步骤、命令、配置或提示词。若后续能找到课程本体，可参考以下研读路径，但这些不是原文提供的操作步骤：
1. 先找到课程原始发布页（原文未附课程地址，需另行检索确认）。
2. 按推文列出的时间点定位章节：0:00–0:29 看 Harness engineering 入门；11:08 看“Build your first agent the right way”。
3. 记录课程中出现的可复用模式（如 agent 自测、评判、修复循环），再判断是否值得小范围试。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
- **能力发现**：原文宣称课程涉及“100+ agents that test, judge and fix their own work”，即让多个智能体测试、评判并修复自身工作。但这只是宣传语，没有展开具体能做什么。
- **任务匹配**：原文没有说明什么任务适合 Harness/Loop/Graph 工程，也没有对比不同模型或工具。
- **条件供给**：原文没有说明需要提供哪些信息、工具、权限或反馈。
- **主动推进**：标题和正文出现“Loop”“Graph” engineering，暗示有循环推进和结构化编排的意图，但未给出触发条件或持续完成机制。
- **效果验证**：原文提到 agents “test, judge and fix”，可理解为内置验证与修复环节，但没有说明指标、判断标准或验证方法。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
清单中有“Harness Engineering”（概念，状态 study），本条同主题，可作为该概念的一项课程资源线索；清单中没有其他直接相关的条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
原文只给出一句感叹式推荐和几个课程时间戳，没有课程内容、代码、案例、数据或效果证据。作者称“Google just dropped a free 2-hour course”，但推文本身未附课程链接，无法核实课程是否存在、是否免费、质量如何。因此只能作为线索，不能作为可执行手册素材。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
建议先研读而非试用：找到课程后，选其中一个最小示例（如“Build your first agent”章节），记录其 harness/loop/graph 的具体配置。若后续要试，最小方式是拿一个已有小任务，按课程思路给 agent 加上“自测—评判—修复”循环；观察指标可包括：任务一次通过率、人工干预次数、修复轮次与最终质量。但当前原文不足以支撑任何验证结论。
