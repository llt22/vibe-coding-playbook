# @Mr_Buzzoni: I'm sharing with you one of the best papers I've read on Harness Engineering

- 结论：**值得研读**。建议按 study 处理：把 `agent = model + harness` 当作拆解框架，先读原论文，不要直接采用；推文正文截断，只给概念和产品名单，没有可复制步骤或配置。
- 原文：https://x.com/Mr_Buzzoni/status/2119730968437432423
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T14:59:49.841Z

## 是什么
推文推荐一篇 Harness Engineering 论文，称其拆解 Claude Code（Opus 5.5）、Codex、Gemini CLI 等，并把它们归纳为 `agent = model + harness`。推文正文在“what a harness is / how modern...”处截断，未给出论文标题、链接或具体拆解内容。

## 具体做法
原文没有给出可直接照做的命令、配置、提示词或流程，因此不能整理成操作步骤。可复述的只有一句分析框架：
```text
agent = model + harness
```
在拿到论文全文前，不建议据此改动现有工具配置。若要继续，只能先追溯原帖或作者主页找到论文全文，再按论文中的 harness 拆解逐项记录；本报告不把推文未展示的内容写成步骤。

## 对应研究问题
- 能力发现：推文暗示论文拆解了 Claude Code、Codex、Gemini CLI 等智能体，可能帮助发现不同 harness 下的能力差异；但未列出具体能力项。
- 任务匹配：`agent = model + harness` 提示同一模型在不同 harness 中可能表现不同，可作为“模型+工具+协作方式”匹配的分析框架；推文未给出匹配规则或案例。
- 条件供给：只能确认 harness 是模型之外需要被研究的部分；具体需要哪些信息、工具、权限和反馈，原文截断，无法提取。
- 主动推进：无依据。
- 效果验证：无依据。

## 与已有做法的关系
清单中已有“Claude Code”（tool，adopt）和“Harness Engineering”（concept，study）。推文把 Claude Code 作为被拆解案例之一，并与 Harness Engineering 概念直接对应；但没有提供超出“值得研读”的新可执行做法，也未改变清单中 Harness Engineering 的 study 状态。

## 证据与局限
证据仅为采集时保存的推文正文及互动数据（66 likes、5 reposts、8 replies）。推文正文截断，未给出论文标题、链接、数据、案例或步骤；“one of the best papers”是作者主观评价。适用条件是先取得论文全文并核对原始拆解，不能把这条推文当作操作手册。

## 怎么试、怎么验证
最小试用不是直接改生产配置，而是拿到论文全文后选一个现有任务做对照：同一模型分别在两个 harness（如 Claude Code 与 Codex 或 Gemini CLI）执行同一任务，记录任务成功率、人工干预次数、耗时、成本和返工率。判断改善的标准可设为：任务成功率上升且人工干预次数下降；若拿不到全文或无法复现对照，则仅保留为阅读线索。
