# @swadeshkumar_: Most people think using Claude Code is about writing better prompts.

- 结论：**值得一试**。建议小范围试：按原文的五层结构改造一个 Claude Code 仓库，先用短 CLAUDE.md 固定目的、地图和规则，再把重复流程做成 skills、把必须自动执行的动作做成 hooks，并为高风险模块加局部 CLAUDE.md。理由是它把临时提示转成持久上下文和护栏，但原文只有结构建议，没有可直接复制的配置和数据，需要自行验证。
- 原文：https://x.com/swadeshkumar_/status/2120087011348685123
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T21:42:51.718Z

## 是什么
这条推文提出：用好 Claude Code 的关键不是写更好的提示词，而是把仓库组织成 Claude 能像工程师一样工作的结构。作者称为“Anatomy of a Claude Code Project”：项目只需要四类信息——why（系统做什么）、map（东西在哪里）、rules（允许/禁止什么）、workflows（工作如何完成），并落到五个位置：根 CLAUDE.md、.claude/skills/、.claude/hooks/、docs/、关键模块局部 CLAUDE.md。核心主张是“提示是临时的，结构是永久的”。

## 具体做法
前提：使用 Claude Code，且仓库可版本控制；团队能约定目录、敏感目录和必须自动执行的动作。原文没有给出可直接复制的命令、hook 配置或提示词模板，以下按原文结构整理为落地清单，具体配置需按 Claude Code 文档补齐。

1. 写根 CLAUDE.md，并保持短。原文要求只放三块：Purpose（系统为何存在）、Repo map（项目如何组织）、Rules + commands（Claude 应如何操作）。作者主张文件太长会让模型错过关键信号，清晰比篇幅重要。
2. 建 .claude/skills/，把重复工作流做成可复用技能。原文示例：代码审查清单、重构 playbook、调试流程、发布流程。目标是让 Claude 快速切换专家模式，并让不同会话、不同成员得到更一致输出。
3. 建 .claude/hooks/，把“必须总是自动发生”的动作固化为 hooks。原文示例：编辑后运行 formatter；核心改动后触发测试；阻止敏感目录（auth、billing、migrations）。原文未给具体 hook 配置。
4. 建 docs/ 存放渐进式上下文：架构概览、ADR（工程决策）、运维 runbook。不要把全部信息塞进提示，让 Claude 知道真相在哪里、按需导航。
5. 在隐藏复杂度高的关键模块加局部 CLAUDE.md。原文示例：
```text
src/auth/CLAUDE.md
src/persistence/CLAUDE.md
infra/CLAUDE.md
```
让 Claude 进入这些危险区域时获得局部上下文，从而减少错误。
6. 维护原则：CLAUDE.md 保持短；skills 只放稳定、可复用的流程；hooks 只放必须自动执行的动作；docs 作为可导航的事实源；局部文件只覆盖模块特有风险。

## 对应的研究问题
- 能力发现：原文明确可交给 Claude Code 的工作包括代码审查、重构、调试、发布流程，以及编辑后格式化、核心改动后测试、敏感目录拦截等自动动作。原文没有声称这些是全新能力，只强调通过结构让 Claude 更稳定地承担。
- 任务匹配：适合有明确仓库结构、重复工程流程和危险区的编码工作。匹配方式是：CLAUDE.md 给总图和规则，skills 给可复用专家模式，hooks 给确定性自动动作，docs 给按需上下文，局部 CLAUDE.md 处理模块复杂度。原文没有比较不同模型或工具。
- 条件供给：需要提供目的、仓库地图、规则与命令、可复用流程、架构/ADR/runbook 文档、敏感目录边界，以及 hooks 所需的自动执行条件。反馈方面，hooks 可在编辑后或核心改动后触发 formatter 和测试。
- 主动推进：hooks 是事件触发的自动执行（如编辑后、核心改动后），属于原文中最明确的“主动推进”机制。其它部分是静态上下文和可复用流程，不是时间、事件或状态驱动的持续工作；原文未说明时间触发或长期状态跟踪。
- 效果验证：原文只声称能带来更一致输出、减少错误、让 Claude 更像项目原生工程师，没有给出测量方法、数据或案例。验证方式需要自行设计，见下节。

## 与已有做法的关系
清单中有 Claude Code（tool，adopt）。这条线索不是新工具，而是 Claude Code 的仓库配置方法，补充的是上下文供给（CLAUDE.md、docs、局部 CLAUDE.md）、可复用流程（skills）和自动护栏（hooks）。清单中没有 skills、hooks、CLAUDE.md 等单独条目。

## 证据与局限
- 原文给出的证据是五类文件/目录及其示例用途：skills 四例（代码审查、重构、调试、发布），hooks 三例（formatter、测试、敏感目录拦截），局部 CLAUDE.md 三例（auth、persistence、infra）。没有代码、配置、提示词模板、数据、案例或对照实验。
- 属于作者主张的内容包括：仓库乱则 Claude 像聊天机器人、结构化则像开发者；CLAUDE.md 太长会漏关键信号；hooks 不会忘记；局部上下文能显著减少错误。这些均未给出量化证据。
- 适用条件：Claude Code 用户；仓库可改造；团队接受把流程写成文件；敏感目录和自动动作需要实际配置 hooks 才能生效。对非编码工作、无法结构化仓库的场景，原文没有证据。

## 怎么试、怎么验证
最小试用：选一个中等规模、已有测试和 formatter 的仓库，试用一到两周。先写根 CLAUDE.md（只放目的、仓库地图、规则与命令，控制长度），选一个高频流程做成 skill，选一个必须自动执行的动作做成 hook（例如编辑后运行 formatter），再给一个高风险模块加局部 CLAUDE.md。用试用前后相同类型的任务做对照。

观察指标：任务完成率和返工次数；代码审查意见数和重复问题；formatter/测试是否按预期自动触发；敏感目录误改次数；跨会话、跨成员的输出一致性；是否仍需反复在提示里重复同一规则；CLAUDE.md 是否过长。原文没有给基线，需要自行记录。判断改善的标准可以是：相同任务的人工干预减少、重复错误下降、hook 触发可靠且不误伤。若没有改善或 hooks 不稳定，应降级为 study。
