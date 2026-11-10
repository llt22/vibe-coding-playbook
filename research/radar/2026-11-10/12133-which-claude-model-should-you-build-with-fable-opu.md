# Which Claude model should you build with? Fable, Opus, Sonnet, or Haiku

- 结论：**值得一试**。把原文的“按任务定起始模型 + 先调 effort 再换模型 + 用自有任务测成本/通过率”流程小范围试用，不要直接照搬型号和价格；它给出了可执行的选型表、子代理配置和测量步骤，但依据主要是厂商基准与演示，需在自己的任务上验证。
- 原文：https://claude.dev/blog/which-claude-model-should-you-build-with/
- 来源：rss:claude.dev，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-10T02:33:29.439Z

## 是什么
这是一篇 Claude 模型选型 playbook，面向 Claude Platform 和 Claude Code 使用者。原文给出四个 GA 模型（Haiku 5.5、Sonnet 5.5、Opus 5.5、Fable 5.2）的任务起点、effort 档位、价格/延迟/上下文取舍，以及子代理、advisor、多代理、迁移兼容和自有任务测量方法。核心建议不是“永远用最大模型”，而是“按任务先选起点，再先调 effort、再换模型，最后用自己的任务测成本与通过率”。

## 具体做法
1. 按任务选起始模型和 effort。原文给的起点如下（不确定时用 Opus 5.5 medium）：

| 任务 | 起始模型 | 起始 effort | 依据 |
|---|---|---|---|
| 日常工程与调试、多 PR 功能 | Opus 5.5 | medium（默认），再 high | 日常任务成本/能力平衡 |
| 分类、路由、打标、高量抽取 | Haiku 5.5 | medium（默认） | 家族中最低成本/延迟 |
| 搜索文件、读日志、总结的子代理 | Haiku 5.5 或 Sonnet 5.5 | 模型默认 | 错误便宜可发现，主模型做判断 |
| 聊天和交互会话 | Sonnet 5.5（简单高量聊天可 Haiku 5.5） | low 或 medium | Sonnet 5.5 在 low/medium 快 |
| 范围明确的编码：bug 修复、功能迭代、按 spec 开发 | Sonnet 5.5 | medium，难任务再 high | 处理 scoped task，token 价为 Opus 一半 |
| 日常文档、幻灯片、表格 | Sonnet 5.5 | high（默认；Claude Code 中 medium） | 迭代快、设计感强；复杂财务模型或大量素材文档从 Opus 5.5 开始 |
| 重复运行的 agent 任务：调查、评审、起草 | Sonnet 5.5 | medium | 定义良好的重复任务很少需要更大模型 |
| 计算机使用和重视觉工作流 | Opus 5.5 | medium | 长 agentic loop，多截图/图像 |
| 大重构/迁移、架构规划、领导多个子代理 | Fable 5.2 | medium，再 high（API 默认 high） | 技术领域最强 GA 模型 |
| 深度研究、科学或定量分析 | Fable 5.2 | medium，再 high（API 默认 high） | 为最难技术项目构建 |
| 不确定 | Opus 5.5 | medium（默认） | Claude Code 默认/平台文档推荐起点 |

前提：你使用 Claude API 或 Claude Code；Claude Code 的默认 effort 可能与 API 不同，原文提示用 `/effort status` 查看当前设置。表里的“默认”指该模型在 API 的默认 effort。

2. 换模型前先调 effort，按这个顺序排查：
   1. 先确认模型能否自验：给它测试、构建或调用端点的脚本。
   2. 把 effort 提高一档。
   3. 再换到上一级模型，并从比小模型更低的 effort 开始。
   4. 如果结果能自动检查，全部先用低 effort 跑，只把失败项用高 effort 重跑。
   原文补充：超过 `high` 后，再高一档的成本可能等于换更大模型；如果你已经在 `high` 以上，优先试“更大模型 + 更低 effort”。反过来，降一档也可能以更低价格得到需要的结果。提高 effort 只帮助模型想更久、调用更多工具、更多自检，不会给它新知识或新技能。

3. 把搜索文件、读日志、跑测试、总结这类旁路工作放到 Haiku/Sonnet 子代理。原文给的子代理配置可直接保存为 `.claude/agents/log-reader.md`：
```
---
name: log-reader
description: Reads test output and logs, and reports each failing case. Use after a test run.
tools: Read, Grep, Glob, Bash
model: haiku
---

Read the logs you're given. For each failure, report the file, the test name and the first error line. Don't edit any files.
```
前提：在 Claude Code 中使用；子代理有自己的上下文窗口，按它运行的模型计费。`CLAUDE_CODE_SUBAGENT_MODEL` 可设置未指定模型的子代理默认模型；`ANTHROPIC_DEFAULT_HAIKU_MODEL` 可固定 `haiku` 别名指向的模型。原文提醒：当前 Claude Code 内置 Explore 子代理跑在会话模型上，不一定自动用 Haiku；要便宜就自己定义一个名为 `Explore`、`model: haiku` 的子代理。`haiku` 别名在 Anthropic API 上解析到 Haiku 5.5 需要 Claude Code v2.1.293 或更高；在 Amazon Bedrock、Google Cloud、Microsoft Foundry 和 Claude Platform on AWS 上仍解析到 Haiku 4.5。原则：小模型只做“错了容易发现”的工作（找文件、跑测试、读日志），代码编辑和判断留给主模型。

   原文还提到 Claude Code 的 `opusplan` 别名：plan mode 用 Opus 规划，执行用 Sonnet。但它把代码编辑放到 Sonnet，和上面“代码编辑留给主模型”的建议相反；原文要求先在自己任务上测 `opusplan`，再决定是否设为默认。

4. 切换模型时在自然断点切，别让新模型从零吞完整历史。原文机制：prompt cache 属于写它的模型，新模型第一轮会对整段对话付 cache-write 价格。Claude Code 里先跑 `/compact`，或开新会话并给一份简短书面计划；API 里用“到目前为止的工作摘要”开新模型对话，而不是完整历史。还要注意 thinking block 兼容：Opus 5.5 可读 Sonnet 5.5/Haiku 5.5 的 thinking，Sonnet 5.5 可读 Haiku 5.5 的，Fable 5.2 可读 Opus/Sonnet/Haiku 的；向下换层通常会丢失先前推理，新模型读不到时 API 会丢弃这些 block，请求仍成功。原文说 Fable 5.2 切到其他 GA 模型通常会丢推理。

5. 如果任务大部分轮次是常规操作，可试 advisor；但先测 consult rate。原文的 advisor tool（beta）用一个更快更便宜的 executor 跑任务，中途可向更强的 advisor 求助；大部分 token 按 executor 价格计费，只有 executor 真的询问时才用到 advisor，低 effort 时询问更少。前提：确认 executor 接受哪些 advisor。例如 Sonnet 5.5 executor 接受 Fable 5.2、Opus 5.5、Opus 5、Sonnet 5.5；Fable 5.2 executor 只接受 Fable 5.2 或 Mythos 5.2。原文的平台成本指南偏谨慎：四个配对里没有一个明显胜过单用 executor；给出的内部编码基准例子是 Opus 5.5 high + Fable 5.1 advisor 得 90.1%、每次尝试 $2.92，比单用 Opus 5.5 high 高 1.7 分但贵约 2.1 倍，已在运行波动边缘，约等于提高 effort 能买到的提升。所以不要把 advisor 当默认。

6. 比一个上下文窗口更大的工作，用“强模型带队 + 便宜 worker 并行”的多代理模式。原文做法：顶层模型拆任务，把片段交给多个更便宜的 worker 并行做，再合并结果。它在约 2200 万 token 源码的内部缺陷搜索基准上，Opus 5.5 带队、最多 25 个 Sonnet 5.5 worker，比单用 Opus 5.5 默认 effort 便宜约三分之一，得分大致相同。Claude Platform 的 Claude Managed Agents 提供 coordinator + worker roster。前提/边界：只有一条依赖链、或工作能放进一个上下文窗口时不要用，规划和合并的成本会超过节省。

7. 迁移模型前做兼容性检查。原文列出的可执行检查：
   - Fable 5.2 的 preserved thinking 对所有 API 账号生效；如果 thinking block 之前的内容（system prompt、tools、更早消息）变了，API 会返回 400，除非你选择丢弃受影响的 thinking。用 Claude Code、Claude Agent SDK 或 Claude Managed Agents 不需要改；自己改历史就保持 append-only，并在切换前测试。
   - Thinking：Opus 5.5 和 Fable 5.2 总是思考，请求关闭 thinking 会报错；Sonnet 5.5 默认思考，`between_tools` 只让它在工具调用间隙思考；Haiku 5.5 默认思考，在 `high` effort 或以下可关闭。所有模型都应按 content block 的 type 读取响应。
   - 强制工具使用：在 Sonnet 5.5、Opus 5.5、Fable 5.2 上，`tool_choice` 设为 `any` 或 `tool` 会返回 400。改用 `auto`，给工具标 `strict: true`，并在 prompt 里说明何时使用。
   - Computer use：Opus 5.5、Sonnet 5.5、Haiku 5.5、Fable 5.2 只支持 Claude API 和 Google Cloud 上的 Claude Models（Google managed）的 `computer_toolset_20260801` 工具集。
   - Haiku 4.5 迁到 Haiku 5.5：用 effort level 替代 `budget_tokens`；去掉非默认的 `temperature`、`top_p`、`top_k`（会 400）；消息以 user turn 结尾，最后给 assistant turn 让它续写也会 400。
   - 安全回退：Opus 5.5、Sonnet 5.5、Fable 5.2 会跑安全分类器，最常标记网络安全和生物内容；Claude Code 中被标记的请求可在旧模型上重跑，transcript 会提示。Fable 5.2 保留 Fable 5.1 的回退模型：网络安全请求回退到 Opus 4.8，生物请求回退到 Opus 5。
   - 如果一个系统跑多个模型，所有请求按最严格的那个模型来写：历史 append-only、`tool_choice: auto` + strict tools、按 type 读 content block、prompt 和工具描述精确到最字面的模型也能懂。这样上下换层不用改代码。路由规则简单（例如每类步骤一个模型）时，让代码选模型，不要让模型自己选。

8. 用自有任务测量，别只看公开基准。原文步骤：
   1. 抽一批真实任务，为每个任务写结果检查，例如测试通过、ticket 关闭、行数正确。
   2. 每个候选模型跑两到三个 effort 档，每次单独开 session，避免共享 cache。
   3. 从每个响应的 `usage` 字段记录每个已完成任务的成本。
   4. 画“得分 vs 花费”图；只有多模型组合击败图上每一个单模型点时，才保留多模型方案。
   5. 在切流量前，让获胜方案在真实流量的一小片上 shadow 运行。
   Claude Code 快速检查：用 `/model` 在 backlog 里挑一个任务跑两个模型，比较 `/usage` 报告。

## 对应的研究问题
- 能力发现：原文列出可交给 AI 的具体工作：分类/路由/打标/高量抽取、子代理找文件/读日志/总结、重复的调查/评审/起草、计算机使用和重视觉工作流、日常文档/幻灯片/表格、深度研究/科学或定量分析、大重构/迁移/架构规划、多代理缺陷搜索。它不是“发现新能力”的清单，但这些任务颗粒度可直接拿去对照自己的工作。
- 任务匹配：这是原文核心。给出任务→起始模型→effort 表、价格/延迟/上下文取舍、先调 effort 再换模型的顺序、子代理/advisor/多代理的适用边界。
- 条件供给：要提供工具权限（子代理的 `Read, Grep, Glob, Bash`、computer use 工具集）、自验手段（测试/构建/调用端点脚本）、结果检查、`usage` 字段、兼容的 API 请求方式（append-only、`tool_choice: auto`、strict tools、按 type 读 block），以及 Claude Code 版本前提。
- 主动推进：原文只部分涉及：Fable 5.2 用于长期无人值守运行；重复运行的 agent 任务（调查、评审、起草）适合 Sonnet 5.5 medium；子代理可在测试后读日志。它没有给出时间/事件/状态触发的具体设计，不能据此写自动触发流程。
- 效果验证：直接给出测量流程：真实任务样本、结果检查、2–3 个 effort、独立 session、`usage` 成本、score-spend 图、shadow 流量。也给了多个基准数字作为起点，但明确要求在自有任务上验证。

## 与已有做法的关系
清单中有 Claude Code（tool，adopt）和 Claude Code Mods（tool，study）。本文与 Claude Code 直接相关：默认模型、`/model`、`/usage`、`/compact`、`.claude/agents/` 子代理、`CLAUDE_CODE_SUBAGENT_MODEL` 都是 Claude Code 使用层面的选型/成本控制补充，可作为已有 Claude Code 条目的模型选择与测量附录。与 Claude Code Mods 无直接关系；清单中没有其他相关条目。

## 证据与局限
原文给出的数据/案例：
- Terminal-Bench 3.0：上一代 Fable 5.1 在 max 得 58.0%，Opus 5.5 在 high 得 58.9%，token 约一半。
- FrontierCode 2.0：Fable 5.2 high 约 45.3%，Opus 5.5 max 约 45.5%，Fable 每个任务成本约一半。
- 一个 20 题搜索基准：两道题占了 43% 花费。
- SWE-bench Pro：Opus 5.5 medium 比 high 低约 2.5 分、成本约 70%；low 低约 8 分、成本约三分之一；xhigh 高约 1.4 分、成本是 high 的 2.5 倍。
- 同一 SWE-bench Pro 子集：Opus 5.5 low 跑、失败项用 high 重跑，约 97% 通过、每个约 $0.17；全部 high 为 95.3%、每个 $0.29。
- 内部缺陷搜索基准（约 2200 万 token 源码）：Opus 5.5 带队 + 最多 25 个 Sonnet 5.5 worker，比单用 Opus 5.5 默认 effort 便宜约三分之一，得分大致相同。
- Advisor 例子：Opus 5.5 high + Fable 5.1 advisor 90.1%、$2.92/次，比单用 Opus 5.5 high 高 1.7 分、贵约 2.1 倍，原文说在运行波动边缘。
- 速度：Fable 5.2 比 Fable 5.1 输出快至多 30%；Sonnet 5.5 比 Sonnet 5 快 30%。
- 缓存/上下文成本：Opus 5.5 cache read $0.20/M，Sonnet 5.5 $0.10，Fable 5.2 $0.20；150K 上下文一轮 cache read 约 $0.03，20K 约 $0.004。Haiku 5.5 是唯一按 prompt 长度变价的模型：≤100K 为 $0.10/$0.50，>100K 为 $0.50/$2.50；长 prompt 档仍是 Sonnet 5.5 单 token 价的四分之一。
- 四张 demo 图（代码渲染同一张巷子图、同一作品集网站、游戏引擎世界、四模型分工项目、Opus 规划 + 并行 Haiku 子代理画地图）展示能力差异，但不是受控评测。

局限：这是 claude.dev 上的厂商/平台博客，基准多为 Anthropic 自己的运行结果，不是独立复现；模型名、价格、别名和默认 effort 会随版本变化，原文本身也要求“在自己的任务上测”；演示图只能说明可行性，不能证明稳定优势。适用条件：使用 Claude API/Claude Code、任务可定义结果检查、愿意按成本/通过率做小规模评测。若任务无法自动验证、或对延迟极敏感，文中的成本结论不能直接套用。

## 怎么试、怎么验证
最小试用：
1. 从真实 backlog 抽一批任务，必须包含你最难/最贵的任务（原文说最难任务占大部分花费）；为每个任务写一个可自动判断的结果检查（测试通过、ticket 关闭、行数正确等）。
2. 选当前主力和一个候选模型（例如 Opus 5.5 medium vs Sonnet 5.5 medium，或同一模型 low/medium/high），每个组合单独开 session，避免共享 cache。
3. 记录每个任务的得分、是否通过、从响应 `usage` 取的成本、延迟；画 score vs spend。
4. 若候选在同等得分下更便宜，或得分更高且成本可接受，再进入 shadow：在真实流量一小片上并行跑，不切主流量。
5. 只有多模型/子代理方案在 score-spend 图上压过所有单模型点，才保留；否则回到单模型 + 调 effort。
判断指标：结果检查通过率/得分、每个完成任务成本、延迟、cache read/input/output token 数、子代理或 advisor 的 consult rate（若用 advisor）、shadow 期间与主流程的结果差异。改善标准：同分更低成本，或同成本更高分；且 shadow 无回归。
