# @CFchangelog: Run the Codex agent loop on Cloudflare Workers using Durable Objects. Agents can now persist convers

- 结论：**值得研读**。建议把“用 Durable Objects 持久化会话与文件，让 Codex agent 循环在 Workers 上重启后续跑”作为长时任务架构思路研读；但材料只有推文和链接卡片，缺少代码、配置与验证数据，暂不能直接照做。
- 原文：https://x.com/CFchangelog/status/2120116950349295798
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-11T01:25:00.367Z

## 是什么

推文称可以在 Cloudflare Workers 上使用 Durable Objects 运行 Codex agent loop，并将会话和文件持久化，从而在重启后继续。链接卡片指向 Changelog 文章，但给定材料未包含该文章正文，因此只能确认这是一个架构方向，无法确认具体实现。

## 具体做法

原文没有给出可照做的步骤、命令、配置或提示词，也没有给出 Workers 项目结构、Durable Object 绑定方式、Codex 调用方式或文件持久化方案。

可做的下一步不是直接复现，而是补齐材料：

1. 获取链接卡片所指的 Changelog 原文，确认是否包含完整示例代码、配置和部署步骤。前提：链接可访问。
2. 若原文没有可运行示例，仅记录架构模式：agent loop 运行在 Worker，会话与文件状态放入 Durable Objects。
3. 若原文有示例，再按其步骤做最小复现；在拿到原文前，不应把本推文当作操作手册。

验证性试用设计（非原文步骤）：让 agent 执行一个需要多轮工具调用的任务，在任务中途重启 Worker/DO，观察会话与文件是否恢复。前提是具备 Cloudflare Workers、Durable Objects、Codex 凭据等条件；原文未提供这些配置。

## 对应的研究问题

- 能力发现：提示 AI agent 可以部署在边缘运行时，并跨重启保留会话与文件；但只有标题级信息，无法确认能力边界。
- 任务匹配：指向需要长会话、长任务、重启后延续的 Codex agent 循环；原文未说明适合哪些具体模型、工具或协作方式。
- 条件供给：需要 Cloudflare Workers、Durable Objects，以及持久化会话和文件的能力；原文未给出权限、密钥、配置和反馈机制。
- 主动推进：只提到重启后存活，没有说明时间、事件或状态触发机制，不能推断可自动推进。
- 效果验证：没有数据、指标或案例，无法判断是否改善结果。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

原文只有一条推文正文和链接卡片，没有文章正文、代码、架构图、性能数据或案例。互动量不是技术有效性的证据。“Agents can now persist conversations and files to survive restarts”属于账号主张，适用条件、限制和失败模式均未说明。需读到 Changelog 原文后才能判断是否值得采用。

## 怎么试、怎么验证

最小试用方式：先取得原文；若原文给出可运行示例，按其部署一个最小 agent loop，执行一个多步任务并在中途重启，检查会话和文件是否恢复。

判断指标：重启后任务继续成功率、状态丢失次数、重复工具调用次数、端到端任务完成率、恢复耗时与额外成本。对照组为同一任务不持久化状态。若恢复成功率和完成率提升且没有明显重复副作用，才值得进入小范围试用；若拿不到原文，仅保留为研读材料，不写入手册。
