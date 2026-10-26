# Supabase’s Plan for a Billion AI-Built Apps

- 结论：**值得研读**。建议列为研读材料，先获取完整访谈，重点提炼面向 AI agent 的后端 schema 与长时任务运行方式；当前原文 404、仅有摘要，无法给出可照做步骤，不能采用或小范围试。
- 原文：https://latent.space/p/supabase_s_plan_for_a_billion_ai-built_apps/
- 来源：rss:src-latent-space，初筛相关度 2，原文获取失败（404 https://latent.space/p/supabase_s_plan_for_a_billion_ai-built_apps/: <!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><），只依据摘要
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T19:56:48.056Z

## 是什么
这是 Latent Space 的一期访谈/讨论，Supabase 联合创始人与 swyx 讨论：AI agent 正在生成更多软件，后端需要随之变化；摘要提到在数据库旁运行长生命周期工作负载，以及让 schema 更容易被 agent 理解。原文抓取失败（404 https://latent.space/p/supabase_s_plan_for_a_billion_ai-built_apps/），以下只能依据摘要判断，无法确认具体方案、命令或配置。

## 具体做法
原文抓取失败，摘要未给出可照做的步骤、配置或提示词，因此不能提炼编号步骤。可确认的调研关注点只有：

1. 面向 AI agent 生成应用的后端，需要考虑长生命周期工作负载如何与数据库协同运行（摘要提及，但无实现细节）。
2. schema 设计需要更容易被 agent 理解（摘要提及，但无字段规范、示例或验证方法）。

若后续获取全文，应优先提取：Supabase 对长时任务的具体承载方式、agent 友好 schema 的规则与示例、权限与反馈机制。

## 对应的研究问题
- 能力发现：摘要暗示 AI agent 正在生成更多软件，但未说明哪些此前未交给 AI 的工作可以交给 AI。
- 任务匹配：提到后端需支持长生命周期工作负载，以及 agent 更易理解的 schema；未给出何种模型、工具或协作方式匹配。
- 条件供给：schema 可理解性是信息供给的一个方向；没有权限、工具、反馈细节。
- 主动推进：长生命周期工作负载可能与持续运行有关，但摘要未说明触发条件或持续完成机制。
- 效果验证：无数据或验证方法。

## 与已有做法的关系
清单中没有相关条目。

## 证据与局限
证据仅为标题和一段摘要；原文 404，无全文、无案例、无数据。摘要中的观点来自 Supabase 创始人访谈，属于方向性主张，不能据此推断具体效果。适用条件应限于“AI agent 参与生成或维护应用且需要后端”的场景；对一般工作流没有可直接迁移的步骤。

## 怎么试、怎么验证
不建议按当前材料直接试用。若研读完整访谈后要小范围验证，可选一个由 agent 生成或修改后端 schema 的小项目，记录 agent 首次理解 schema 所需的澄清轮次、生成迁移或查询的错误率、人工修正次数；再与现有 schema 写法对照。只有出现可重复的 schema 规则或长时任务配置后，才进入 try 评估。
