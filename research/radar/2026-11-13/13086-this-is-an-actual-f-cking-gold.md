# @lez99999: THIS IS AN ACTUAL F*CKING GOLD

- 结论：**值得研读**。把它当索引用而不是当手册用：先顺着链接核实 anthropics/skills 是否真给出可复制的技能文件、ccusage 是否给出可照做的统计口径，再决定是否小范围试；推文本身只有仓库名加一句话定位，没有任何命令、配置、提示词或案例，不足以支撑 adopt/try。
- 原文：https://x.com/lez99999/status/2120966948641026223
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T03:37:10.082Z

## 是什么

一条 X 推文，把 7 个与 AI 编程智能体相关的开源仓库汇总成一张“今天就能 clone”的清单，核心主张是：不要每次都从零开始写提示词去驱动 Claude Code，而应先装入别人已经在真实交付中验证过的 setup。

原文对 7 个仓库只给了一句话定位：

- `anthropics/skills` —— 官方 skills，以及自己写 skill 的规范
- `obra/superpowers` —— 让 agent 先头脑风暴、计划、测试、评审，然后才写代码
- `garrytan/gstack` —— 23+ 个斜杠命令，覆盖从规划一直到发布
- `addyosmani/agent-skills` —— 覆盖 define → plan → build → verify → review → ship 各阶段的 skills
- `mattpocock/skills` —— 作者个人的约 20 个 skill 包，可复制并适配到自己的技术栈
- `rohitg00/agentmemory` —— 跨 Claude Code、Cursor、Gemini CLI、Codex 的持久记忆
- `ryoppippi/ccusage` —— 从本地 Claude Code 日志中看清 token 和钱花在哪里

结尾一句主张：“Your agent is only as good as the setup you give it.”

## 具体做法

**原文没有给出任何可照做的步骤。** 没有安装命令、没有目录结构、没有 skill 文件内容、没有配置片段、没有提示词模板。所有链接在推文中被换行截断（如 `github.com/anthropics/ski` / `lls`），即使想照抄也需要先自行拼接还原。

因此这里不提供“照着做”的步骤，只提供基于本线索的取证动作（下面每一条都是对素材的下一步核实，不是推文原文内容）：

1. 前提：本地能访问 GitHub，并已在使用 Claude Code 或同类 CLI agent。
2. 先只取与清单中已有 adopt 条目（Claude Code）直接对应的一个仓库：`anthropics/skills`。读它的 README，确认三件事：skill 文件的目录结构与命名约定、是否有可直接复制的最小示例、是否说明了作用范围与触发方式。
3. 若第 2 步确认存在可复制的 skill 文件与规范，再取 `ryoppippi/ccusage`，确认它输出哪些字段（按会话/按项目/按模型的 token 与费用口径），作为后续度量基线。
4. 其余 5 个仓库（superpowers、gstack、agent-skills、mattpocock/skills、agentmemory）暂不引入，等第 2、3 步得出可用性结论后再逐个评估，避免一次性引入多套互相冲突的流程约定。
5. 每引入一个仓库，记录：它改动了 agent 的哪些输入（技能文件、命令入口、记忆、日志），以及是否可无痛回滚。

## 对应的研究问题

**1. 能力发现**：只到类别层面。原文透露出 agent 可以被赋予的能力类型包括：先规划再编码的强制流程（superpowers）、覆盖全生命周期的阶段化技能（agent-skills）、跨会话与跨工具的持久记忆（agentmemory）、成本可观测性（ccusage）。但没有任何一条具体能力条目、触发条件或产出示例。

**2. 任务匹配**：有隐约但未论证的映射——规划到发布的全流程用命令集（gstack）、跨多个 agent 工具协作用统一记忆层（agentmemory）、成本核算用日志统计（ccusage）。原文没有说明为什么这样配、也没有对比其他配法。

**3. 条件供给**：这是全文最有信息量的一条。原文的核心论点就是“供给决定产出”——需要给 agent 提供技能包、斜杠命令入口、跨会话记忆、以及让花费可见的日志。但只停留在“应该给”，没有说明这些供给物的具体形态、安装方式与权限要求。

**4. 主动推进**：只有弱依据。superpowers 的“先 brainstorm/plan/test/review 再写代码”属于流程内的阶段性触发，不是时间/事件/状态驱动的持续任务。原文未涉及定时或事件触发。

**5. 效果验证**：只有工具层面的依据——ccusage 提供 token 与花费的度量，agent-skills 含 verify 与 review 阶段。原文没有给出任何“怎样判断结果确实变好”的判据、指标或前后对比。

## 与已有做法的关系

- **Claude Code（adopt）**：`anthropics/skills` 是官方技能包与自写规范，属于对该条目的直接补强，是这份清单里最值得优先核实的一项。
- **gstack（study）**：推文只重复了“23+ 斜杠命令、从规划到发布”这一定位，与清单中已有的 study 状态信息重合，未提供新的可执行细节，不改变其评级。
- **Cursor（watch）**：`agentmemory` 明确声明支持 Cursor，属于跨工具记忆这一方向的候选材料，但原文未给出任何实现或兼容性证据。
- 其余 4 个（superpowers、agent-skills、mattpocock/skills、ccusage）清单中没有相关条目。

## 证据与局限

- **证据强度很低**：全部内容是一份 7 条链接清单加一句口号，没有任何使用案例、前后对比、数据或复现记录。
- **互动量小**：50 赞、3 转发、16 回复，属于小范围传播，不能作为质量背书。
- **全部为作者主张**：“THIS IS AN ACTUAL F*CKING GOLD”“Bookmark this before it disappears”“agent 只和你给的 setup 一样好”——都是判断句，不是论证。
- **链接被截断**：推文中的 URL 全部断行，无法确认仓库真实存在、是否公开、内容是否与一句话描述一致。本报告未访问这些仓库，不核实任何一项。
- **适用条件**：面向使用 Claude Code 或同类 CLI 编程 agent 的开发者；对非编程类工作的迁移性，原文没有任何依据。

## 怎么试、怎么验证

**最小试用方式**：不要按推文整体照搬。只挑一个仓库（建议 `anthropics/skills`）在单一代码库上试一周，同时用 `ccusage`（或现有日志统计）记录基线。

**判断有没有改善的指标**：

- 任务一次通过率：同一类任务无需人工返工的占比
- 返工轮次：单个任务的平均来回次数
- 每任务 token 与费用：用试用前一周的同一口径做对照
- 人工介入次数：需要人手动纠正或补充上下文的频次

**停止条件**：若一周内上述指标相对基线没有可测量的差异，或引入技能包后需要频繁修改才能跑通，就停在 study，不进入手册。

**关键前提**：在未核实任何一个仓库的实际内容之前，这份素材只能作为调研线索清单使用，不能作为可执行手册的条目。
