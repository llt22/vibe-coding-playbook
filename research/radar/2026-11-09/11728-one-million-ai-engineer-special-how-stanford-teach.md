# [One Million AI Engineer Special] How Stanford Teaches AI-Native Engineering — Mihail Eric, Monaco

- 结论：**值得研读**。先把它作为课程与团队训练设计来研读：用陌生开源仓库完成一次可评审改动，并由可能合并的人评审；原文只有访谈页、提纲和时间戳，缺少可复制步骤，暂不直接采用。
- 原文：https://latent.space/p/one_million_ai_engineer_special_how_stanford_teaches_ai-native_engineering_mihail_eric_monaco/
- 来源：rss:src-latent-space，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T02:00:31.750Z

## 是什么
这是 Latent Space 对 Mihail Eric 的访谈页，主题是 Stanford CS146S《The Modern Software Developer》第二轮课程，以及 Monaco 工程团队如何使用编码智能体。原文提出的核心问题是：当编码智能体能在一个提示内完成去年的作业时，作业应该改成什么。课程给出的方向是让学生进入一个不熟悉的开源仓库，提出改动，并向可能合并补丁的维护者解释。抓取到的内容主要是节目页、摘要、show notes 和时间戳，不是完整 transcript。

## 具体做法
原文没有给出可直接复制的命令、配置或提示词；只能提炼出课程任务骨架：
1. 前提：选择一个真实、维护者愿意评审的开源仓库，参与者此前不熟悉它。
2. 让参与者借助编码智能体完成仓库理解、定位改动点，并提出和实现一个可提交的改动。原文未指定具体模型、工具或提示词。
3. 形成 patch 或 PR，并向“可能合并它的人”（维护者或资深评审者）解释：改了什么、为什么改、风险是什么、如何验证。
4. 由维护者按真实合并标准评审，而不是只由任课老师按作业标准打分。原文提到课程把开源维护者带入评审，但没有给出评分 rubric 或完整流程。

原文还提到但未展开的团队做法包括：Monaco 为每个 agent 建 workspace，购买代码评审工具，给 on-call agent 接入 Datadog 和 GitHub，让仓库变得 agent-ready，并关闭 on-call 闭环。这些只能作为线索，不足以照做。

## 对应的研究问题
- 能力发现：原文的核心前提是编码智能体已经能一个提示完成旧作业；课程因此把任务上移为“陌生仓库 + 可合并改动 + 解释补丁”。这提示可把 AI 用于仓库学习和补丁生成，但原文没有展开还有哪些未想到的工作。
- 任务匹配：原文提到 coding agent 的 loop、tools 和 harness，面向大代码库的 context engineering，理解 diff 的技能，以及 background agents 和 MCP。可支持的判断是：这类任务适合仓库级编码智能体，并需要上下文工程配套；具体模型和工具选择没有依据。
- 条件供给：需要真实仓库、agent workspace、代码评审工具、Datadog/GitHub 等系统访问、仓库的 agent-ready 改造，以及安全、依赖和权限控制。原文只列出主题，没有给出配置。
- 主动推进：原文提到 on-call agent 接入 Datadog 和 GitHub、关闭 on-call 闭环，以及后台编码智能体（Stripe Minions）。这说明可由告警或事件触发并持续处理；实现细节缺失。
- 效果验证：用真实维护者评审，以及“向可能合并者解释补丁”作为检验；还提到代码评审成为瓶颈、理解 diff 的能力。原文没有给出量化指标。

## 与已有做法的关系
清单中有 Claude Code（adopt）、OpenClaw（watch）、Context engineering（study）、Latent Space（adopt）。本文是 Latent Space 访谈，show notes 提到 Demystifying Claude Code 和 agent harness，但没有给出 Claude Code 的具体用法；与 Context engineering 相关，因为讨论了大代码库上下文工程，但只有主题；与 OpenClaw 无直接依据。清单中没有“CS146S 课程作业”或“Monaco agent workspace”条目。

## 证据与局限
可抓取内容为节目页、摘要、show notes 和时间戳，不是完整 transcript。可确认的案例是：CS146S 第二轮把开源维护者带入课程；学生需学习陌生仓库、提出改动、向维护者解释补丁；Monaco 建了 agent workspaces、买了代码评审工具、给 on-call agent 接入 Datadog 和 GitHub。作者主张包括“coding agent 一个提示完成去年作业”“buy to learn, build to keep”“code review 成为瓶颈”等，未给数据。适用条件是有真实仓库和维护者评审；否则任务会退化为普通 PR 练习。不能据此复现完整课程或 Monaco 配置。

## 怎么试、怎么验证
最小试用：在一个团队内选 1 个非核心但真实的仓库，安排 1 到 2 名工程师用编码智能体完成一次“陌生仓库改动”：读仓库、提改动、开 PR，并向维护者或资深评审者解释。时间盒 1 天。验证指标：是否产出可评审 PR；维护者评审意见的数量和严重度；从开始到首次有意义提交的时间；参与者能否不看 diff 说清改动和风险；合并或拒绝的原因。可对照不用智能体的同规模任务。若目标是团队落地，再记录权限申请、上下文准备和评审耗时。暂不扩展到生产 on-call，除非能补齐原文未给的权限和安全方案。
