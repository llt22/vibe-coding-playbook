# @0xCodila: Google just released the greatest 1-hour course on building agent teams with Harness & Loops & Graph

- 结论：**继续观察**。建议先保留为线索，找到原课程并核验后再决定是否试用；当前推文只有课程时间轴，没有可照做的步骤、配置或提示词。
- 原文：https://x.com/0xCodila/status/2118421468874731841
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T11:56:24.368Z

## 是什么

这条推文称 Google 发布了一门 1 小时课程，主题是用 Harness、Loops、Graphs 从零构建智能体团队。原文只给出了课程时间轴：0:29 讲 Harness engineering（1 prompt → team of agents），11:19 讲 Graph engineering（让智能体互相通信），47:18 讲 Loop engineering，但正文在“build”处被截断。推文互动数据为 67 点赞、5 转发、13 回复。

## 具体做法

原文没有提供可直接照做的步骤、命令、配置或提示词，因此不能从中提炼操作流程。只能确认其课程结构如下（这不是操作步骤）：

1. 0:29 → Harness engineering：从 1 个提示词到智能体团队。
2. 11:19 → Graph engineering：让智能体之间互相通信。
3. 47:18 → Loop engineering：构建……（原文截断，无法确认后续内容）。

在拿到完整课程前，无法复现其方法。

## 对应的研究问题

1. 能力发现：原文提到“1 prompt → team of agents”、智能体互相通信和循环机制，属于可能的能力方向，但没有展开具体能力边界或案例。
2. 任务匹配：原文没有说明什么任务适合什么模型、工具或协作方式。
3. 条件供给：原文没有说明需要提供哪些信息、工具、权限和反馈。
4. 主动推进：原文只出现“Loop engineering”标签，未说明触发条件、状态或持续完成机制，且内容被截断。
5. 效果验证：原文没有给出任何效果指标、验证方法或对比数据。

## 与已有做法的关系

清单中有“Harness Engineering”（概念，状态为 study），本条推文直接提到 Harness engineering，并给出“1 prompt → team of agents”的简短描述，但没有展开，无法据此升级该条目的状态。Graph engineering 和 Loop engineering 未出现在清单中。

## 证据与局限

证据仅来自一条推文正文：它声称这是“greatest 1-hour course”，并列出三个时间点。原文没有课程链接、课程全名、讲师信息、案例或数据，且在 47:18 处截断。点赞和转发只能说明有一定关注度，不能证明课程质量或方法有效。适用条件是先找到并核验完整课程；当前材料不足以判断其步骤是否可靠。

## 怎么试、怎么验证

当前无法直接试。建议先找到原课程，提取其中关于 Harness、Graph、Loop 的具体提示词、图结构和循环配置，再在一个低风险任务上复现最小流程，并与单提示词基线对比。可观察指标包括：任务完成率、人工介入次数、耗时与调用成本、错误率、结果可复现性。若找不到完整课程或无法提取可执行步骤，则维持 watch，不进入手册。
