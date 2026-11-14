# @Asteri_eth: Claude Code runs Fable 5.2 at medium by default. Anthropic's own prompting guide says start at high

- 结论：**值得一试**。建议在 Claude Code 的小范围编码任务中试用：先把 effort 调到 high，再逐条加入所有权、进度播报、精确审批和谨慎删除等提示，并清理过时记忆。原因是原推给出了多条可直接粘贴的提示和配置，但它只是对完整指南的二手摘要，缺少完整收尾块和实验方法，必须自行 A/B 验证收益与 token 成本。
- 原文：https://x.com/Asteri_eth/status/2121202801946558743
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-14T03:53:00.631Z

## 是什么
这条线索是 X 用户对 Claude Code / Fable 5.2 提示与配置调整的摘要，列出 12 项“粘贴或删除”式修正。核心是把默认 effort 从 medium 调到 high，并用代码库所有权、收尾要求、进度播报、精确审批和谨慎删除等提示，改变编码 agent 的续跑与收尾行为。它不是完整指南，但给出了多条可直接复制的提示和一条明确命令。

## 具体做法
前提：使用 Claude Code + Fable 5.2；能修改项目或用户记忆、skill/agent 文件；一次只加一项并记录效果。以下只列原文明确给出的内容；第 3 项原文只给了链接和效果，未给完整文本，不能照抄。

1. 调整 effort。在 Claude Code 输入：
```
/effort high
```
原文称 Enter 会按模型保存。适用复杂编码和长任务；原文警告低 effort 更容易中途停止。

2. 加入代码库所有权提示：
```
You are the owner and long-term maintainer of this codebase, and its design is up to you.
```
原文称这能把重复代码合并率从不足 10% 提高到约 75% 的运行比例。

3. 使用 “Finishing work” 块。原文未给出块文本，只给了指南链接和效果：工作未完成就结束的会话约减半。必须先打开原文链接取得完整文本再粘贴，不要自行编造。

4. 加入进度播报：
```
Every few tool calls, give the user a one-line update on where things stand.
```
原文称可避免长时间静默。

5. 审批时明确批准内容，不用笼统的 “go”：
```
yes, run the migration on staging
```
原文要求说清楚你到底在批准什么。

6. 把删除类禁令改成先询问：
```
ask before deleting files
```
不要写 “never delete files” 这类绝对禁令；原文称模型会把每个 never 读成绝对规则。

7. 清理旧记忆里的 “never retry” 等过时谨慎指令；原文称模型会在这些指令失效后继续遵守。

8. 删除 “answer directly without deliberating” 类提示；原文称 medium 及以上仍会思考，应通过 effort 调节，而不是靠这句话。

9. 删除提示里的大 token 预算；原文称 Anthropic 测试中成本下降、结果不变。

10. 重读 skills 和 agent 文件里所有 “delegate this” 行；原文称提示一旦邀请委派，模型会快速启动子代理，需要重新设定子代理预期。

11. 删除 Opus 5.5 时代 “treat that answer as done” 类行；原文称保留这类行会让模型几乎不再标记自己的错误。

12. 最终报告加读者提示：
```
Write for an intelligent but low-context reader.
```
原文称这样最终报告可以不打开文件也能读懂。

建议顺序：/effort high → ownership line → 清理旧记忆，然后一次一项增加。原文承认几乎每项都增加 token，ownership line 单独增加 70–80%，部分套餐会计入 usage credits。

## 对应的研究问题
- 能力发现：原文显示可让编码 agent 承担更强的代码库长期维护角色、完成整项工作、在长回合中主动播报状态，并产出低上下文读者可读的报告。
- 任务匹配：主要匹配 Claude Code 中的编码、重构、迁移和长任务；原文特别提到复杂任务更适合 high effort，重复代码合并适合所有权提示。
- 条件供给：需要提供 effort 档位、所有权角色说明、收尾要求、进度播报规则、明确的审批语句、删除确认规则，并清理旧记忆和过时提示。
- 主动推进：进度播报和收尾块让 agent 在一次会话内持续汇报并尽量做完；原文没有给出时间、事件或外部状态触发的自动推进机制。
- 效果验证：原文给出若干结果指标，但没有实验设计；需要自己记录完成率、未完成会话数、人工干预次数、重复代码处理、token 成本和报告可读性。

## 与已有做法的关系
清单中已有 Claude Code（adopt）和 Claude Code Mods（study）。这条线索属于 Claude Code 的配置与提示词层 mods，补充 /effort、所有权、进度、审批和记忆清理做法，可作为 Claude Code Mods 的候选清单；它不替代 Claude Code 的基本采用。清单中没有其他相关条目。

## 证据与局限
原文给出的数据包括：所有权提示下重复代码合并约 75% 对不足 10%；收尾块使未完成会话约减半；进度播报消除长静默；大 token 预算在 Anthropic 测试中成本下降而结果不变；所有权提示增加 70–80% token。这些都是推文转述，未给样本量、任务类型、评分方法和原始数据，且第 3 项完整提示词缺失。原文声称来自 Anthropic 指南，但材料本身只是二手摘要，不能当作已验证结论。适用条件限于 Claude Code / Fable 5.2 及类似编码 agent；成本、套餐计费和模型版本差异需要另行确认。

## 怎么试、怎么验证
选 5–10 个相似的编码任务做基线，记录当前设置下的完成率、未完成会话数、人工干预次数、token 成本、审批错误和最终报告是否需要打开文件才能理解。然后一次只加一项：先对复杂任务用 /effort high，再加 ownership line，再加进度播报和 “ask before deleting files”。第 3 项先从原文链接取得完整 “Finishing work” 块后再试。每轮用同一组任务对比前后指标；若完成率或返工率改善不足以抵消 token 成本，就回退该项。最终判断标准是：任务更少中途停、人工接管更少、审批更准确、报告更自包含，同时成本在可接受范围内。
