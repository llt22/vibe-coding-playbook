# google/elephant-goldfish-model

- 结论：**值得一试**。建议在需要先做设计决策的功能开发中，小范围试用 EGM 的“大象起草规格、金鱼零上下文评审”流程，按 README 的安装命令和 /egm 技能命令落地，并用评审发现与返工情况验证效果。它给出了可直接执行的安装、技能和评审步骤，但效果证据主要来自项目自述，尚未提供可量化的改善数据。
- 原文：https://github.com/google/elephant-goldfish-model
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T10:53:12.058Z

## 是什么

Elephant-Goldfish Model（EGM）是 Google 开源的一个编码代理插件，用“大象 / 金鱼”分工来辅助软件设计：**Elephant** 持有项目上下文，负责探索问题并起草规格；**Goldfish** 在不带先前对话上下文的情况下，只根据文档及其引用的源材料做评审，用来暴露未言明的假设和盲点；**你**负责架构取舍并批准规格，之后才进入实现。

README 将其定位为：当一个功能需要先做设计决策时使用；小型、明确的 bug 修复仍走普通编码流程。

## 具体做法

1. **确认前提**：需要一个支持插件的编码代理，并且该会话能够创建新的子代理（fresh subagents）。README 明确说金鱼评审需要全新的子代理上下文；如果代理无法创建，EGM 会停止评审。

2. **安装完整插件**（以便技能读取评审提示和文档标准）。按所用代理选择命令：

   Antigravity：
   ```sh
   agy plugin install https://github.com/google/elephant-goldfish-model
   ```

   Claude Code：
   ```sh
   claude plugin marketplace add google/elephant-goldfish-model
   claude plugin install egm@egm
   ```

   Codex：
   ```sh
   codex plugin marketplace add google/elephant-goldfish-model
   codex plugin add egm@egm
   ```

   安装后**开始一个新会话**。Claude Cowork 和 ChatGPT Work 需按 README 指向的 setup guide 配置。

3. **选择一个需要设计决策的功能**。README 的例子是给项目增加 webhook 投递，并明确要讨论“投递失败怎么办”“同一事件到达两次怎么办”这类设计问题。

4. **探索想法并形成概念简报**。命令前缀规则：Antigravity（agy CLI）和 Claude Code 加 `/egm:` 前缀；Codex 从技能选择器中选择对应 EGM 技能。示例：
   ```text
   /egm-brainstorm Add webhook delivery to this project.
   ```
   与代理讨论需求和取舍；新评审者会挑战提案；代理把达成的一致方向保存到 `concepts_brief.md`。

5. **起草规格文档**：
   ```text
   /egm-draft
   ```
   代理把简报转成 `design_draft.md`，每写完一节暂停，等待你在对话中反馈。

6. **用零上下文评审者评审草稿**：
   ```text
   /egm-review design_draft.md
   ```
   使用代理返回的草稿路径。新评审者检查设计本身、清晰度、与代码的契合度以及实现计划；你选择要处理哪些发现。

7. **处理发现并定稿**：可使用 `egm-resolve` 技能逐条处理评审发现并商定修改。README 还提到完整流程会把批准的规格保存在 `docs/designs/` 下。

8. **人工批准后再实现**：你负责解决取舍、批准设计，然后让编码代理按批准的设计实现。

9. **可按需单独使用技能**，不必严格走完整序列：
   - `egm-brainstorm`：测试想法并写概念简报。
   - `egm-draft`：把简报或已有笔记转成设计文档。
   - `egm-resolve`：处理评审发现并商定修改。
   - `egm-bootstrap`：为已有代码库创建或更新文档。
   - `egm-review`：用新代理分五阶段评审设计。
   - `egm-review-loop`：为特定评审任务运行一组配置好的评审者。
   - `egm-drift-report`：把已检入文档与当前源代码对比。

## 对应的研究问题

- **能力发现**：EGM 展示了可交给 AI 的几类工作：带项目上下文起草规格、用零上下文子代理做设计评审、从已有笔记生成设计文档、为已有代码库补文档，以及对比文档与源代码的漂移。
- **任务匹配**：README 给出了明确分工：深度上下文代理负责探索和起草，零上下文新代理负责评审，人类负责架构取舍和批准。适用任务是“实现前需要设计决策的功能”；小型明确 bug 修复不适合套用该流程。具体模型选择未展开。
- **条件供给**：需要提供项目上下文、需求、先前决策、被评审文档及其引用的源材料；工具上需要支持插件和 fresh subagent 的编码代理；流程上需要在每节草稿后给反馈、对评审发现做取舍并最终批准规格。
- **主动推进**：流程由“需要设计决策”触发，并按 brainstorm → draft → review → resolve → implement 推进；`egm-review-loop` 可对特定评审任务运行配置好的评审者组，`egm-drift-report` 可检查文档与当前代码是否一致。README 未说明定时或事件自动触发机制。
- **效果验证**：README 要求评审发现由人选择处理、设计由人批准，并明确评审不能替代测试或人类判断；`drift-report` 可用于检查文档与代码的一致性。但没有给出量化指标或对照实验结果。

## 与已有做法的关系

清单中有 **Claude Code（tool，adopt）**。EGM 明确支持 Claude Code，并通过插件市场安装、使用 `/egm:` 技能命令，因此可作为 Claude Code 之上的设计评审工作流插件使用。清单中没有其他直接相关条目。

## 证据与局限

- 原文是 GitHub 仓库 README，不是完整文档；`docs/getting_started.md`、`docs/harnesses.md` 等链接内容未提供。
- README 声称“数千名 Google 工程师使用 EGM”，仓库显示 5242 stars，但材料没有使用效果、缺陷率、返工率或评审命中率等数据。
- “金鱼评审能暴露未言明假设和盲点”是项目主张，不是本材料中的对照实验结论。
- 关键适用条件：编码代理必须能创建 fresh subagent；设计评审不替代测试和人工判断；该项目不是 Google 官方支持产品。
- 只适合需要设计决策的功能；小型明确修复不应强行套流程。

## 怎么试、怎么验证

**最小试用**：选一个中等复杂度、确实需要设计取舍的功能（如新增 webhook 投递），在 Claude Code 中安装 EGM，按 `/egm-brainstorm` → `/egm-draft` → `/egm-review` 走一遍，保留 `concepts_brief.md`、`design_draft.md` 和评审发现记录，人工决定采纳哪些发现后再实现。

**判断是否改善**：
- 对比使用前后，设计评审中发现的“未言明假设 / 遗漏需求 / 实现风险”数量与质量；
- 记录评审发现中被采纳的比例，以及是否在编码前发现会导致返工的问题；
- 记录从设计到实现的返工次数、规格变更次数、实现后缺陷数；
- 检查批准后的设计文档是否可用于后续实现和交接；
- 用 `egm-drift-report` 检查文档与代码是否保持一致。

若试用中评审只能产生泛泛意见、无法创建 fresh subagent，或发现的问题在编码前没有实际减少返工，则应降级为 study 或停止使用。
