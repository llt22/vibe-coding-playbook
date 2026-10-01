# shanraisshan/claude-code-best-practice

- 结论：**值得研读**。建议把这份 README 当作 Claude Code 智能体工程实践的索引图来研读，顺着它列出的 orchestration-workflow、tips 和 implementation 文件去提取可照做步骤；原因是原文本身只有链接、模式概述和少量命令，缺少可直接执行的完整步骤，不足以 adopt 或 try。
- 原文：https://github.com/shanraisshan/claude-code-best-practice
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T11:26:34.701Z

## 是什么
- 仓库 `shanraisshan/claude-code-best-practice` 是一个 Claude Code 实践索引/聚合页，标题为 from vibe coding to agentic engineering。
- 内容按 CONCEPTS、Hot、DEVELOPMENT WORKFLOWS、CROSS-MODEL WORKFLOWS、SKILL COLLECTIONS、AGENT COLLECTIONS、TIPS AND TRICKS 等板块组织，大量指向官方文档、子仓库、实现文件和推文。
- 核心模式是 Command → Agent → Skill 的编排工作流（orchestration-workflow），以及 Research → Plan → Execute → Review → Ship 的开发工作流收敛模式。
- 因原文在 TIPS AND TRICKS (83) 的 Skills 处被截断，具体提示词、配置细节和 83 条技巧的正文未提供。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
前提：已安装并可使用 Claude Code；拥有该仓库的 `.claude` 目录配置。以下只能依据 README 可见内容整理，不是完整可执行手册。
1. 克隆或获取该仓库，使 `.claude/commands/weather-orchestrator.md` 等文件位于当前项目目录中。
2. 启动 Claude Code：
```bash
claude
```
3. 运行仓库给出的编排示例命令：
```bash
/weather-orchestrator
```
该命令用于演示 Command → Agent → Skill 模式；README 只给出命令名和流程图，未给出命令实现内容。
4. 若要深入某类能力，按 README 列出的文件路径打开对应 best-practice 或 implementation 文档。例如：
   - `.claude/agents/<name>.md`（Subagents）
   - `.claude/commands/<name>.md`（Commands）
   - `.claude/skills/<name>/SKILL.md`（Skills）
   - `.claude/settings.json`、`.mcp.json`（MCP、Settings）
   - `CLAUDE.md`、`.claude/rules/`（Memory）
   - `orchestration-workflow/orchestration-workflow.md`（编排工作流实现细节）
5. 若采用开发工作流，README 推荐所有主要工作流收敛到同一架构模式：Research → Plan → Execute → Review → Ship；可任选一个列出的工作流（Superpowers、Matt Pocock Skills、Spec Kit、OpenSpec 等）按其命令序列执行，但完整步骤需查阅对应仓库。

注意：以上第 4、5 步是导航到外部文件，不是 README 自身给出的可直接照抄步骤。

## 对应的研究问题
1. 能力发现：README 列出大量 Claude Code 功能（Subagents、Commands、Skills、Hooks、MCP、Plugins、Scheduled Tasks、Goal、Agent Teams、Computer Use、Agent SDK、Ralph Wiggum Loop 等），提示 AI 可承担编排、定时任务、代码审查、跨模型调用等此前可能没想到交给 AI 的工作；但未展开具体适用边界。
2. 任务匹配：给出跨模型工作流的三种机制（Plugin、MCP、Router）及可桥接的模型（Codex、Gemini、GPT、Kimi、DeepSeek、本地模型等），并对比多个开发工作流的命令序列；可据此判断不同任务可选不同模型与协作方式，但 README 未给出任务与模型的匹配规则。
3. 条件供给：明确列出需要提供的信息/工具/权限载体，如 `.claude/agents/`、`.claude/commands/`、`.claude/skills/`、`.claude/settings.json`、`.mcp.json`、`CLAUDE.md`、`.claude/rules/`；并链接 Permissions、Model Config、Sandboxing、Output Styles 等配置文档。可据此知道要供给哪些文件、工具和权限。
4. 主动推进：列出 Scheduled Tasks（`/loop`、`/schedule`、cron tools）、Routines、Goal（`/goal <condition>`）、Ralph Wiggum Loop、GitHub Actions、GitLab CI/CD、Agent Teams 等，表明可由时间、事件或状态触发并持续完成。
5. 效果验证：提到 Checkpointing（自动文件编辑追踪）、Code Review（GitHub App 管理式、本地 `/code-review`）、Ultrareview（`/code-review ultra`、`claude ultrareview [target]`），以及多个工作流中的 verify/verify-change/verify-work 步骤；但 README 未给出判断确实改善结果的具体指标或对照方法。

## 与已有做法的关系
- 清单中已有 Claude Code（adopt）：本仓库完全围绕 Claude Code，可视为对 Claude Code 用法的上层索引。
- 清单中已有 addyosmani/agent-skills（try）、gstack（study）、mattpocock/skills（study）、obra/superpowers（study）、Spec Kit（study）、Fission-AI/OpenSpec（watch）：本仓库把这些工作流并列在同一页，并给出各自的命令序列和 agent/command/skill 数量，便于横向对照。
- 清单中已有 GitHub Trending（source）：本仓库在 README 中标注为 GitHub Trending #1，但该徽章不能作为质量证据。
- 总体关系：它不是替代这些已有做法，而是把已有做法和官方文档组织成导航层；若已采用其中某个工作流，可用本仓库检查是否遗漏相关功能或配置。

## 证据与局限
- 证据：README 给出大量官方文档链接、实现文件路径、命令名、配置目录、跨模型方案对比表；编排示例给出可复制命令 `claude` 和 `/weather-orchestrator`；开发工作流对比表包含各仓库的星标、agent/command/skill 数量。
- 作者主张：标题宣称 from vibe coding to agentic engineering，但未提供效果数据或对照实验。
- 数据可疑：表中部分仓库星标数异常（如 Superpowers 294k、Matt Pocock Skills 273k、Everything Claude Code 270k），远超或不符合常见 GitHub 星标量级，不宜直接作为选型依据。
- 内容截断：原文在 TIPS AND TRICKS (83) 的 Skills 处中断，83 条技巧的正文、具体提示词、配置示例大部分未给出。
- 适用条件：需要已使用 Claude Code，并能访问链接的官方文档和子仓库；功能带 beta 标记，版本可能快速变化；具体步骤需以官方文档和链接文件为准。

## 怎么试、怎么验证
- 最小试用：获取该仓库的 `.claude` 目录配置，在项目根目录启动 `claude`，运行 `/weather-orchestrator`，观察 Command → Agent → Skill 是否按预期串联执行，产物是否符合预期。
- 验证指标：
  - 编排示例是否成功触发子 agent 和 skill；
  - 完成同一任务所需手动步骤数是否减少；
  - 是否产出可检查的中间文档（研究、计划、审查记录）；
  - 代码审查或 Ultrareview 是否发现真实问题；
  - 与不使用该编排的基线相比，返工次数、任务完成时间、审查通过率是否改善。
- 对照试用：从 README 列出的工作流中选一个与已有清单条目重叠的（如 Spec Kit 或 OpenSpec），按同样任务跑一次，比较流程步骤数、人工干预次数和最终质量。
- 注意：由于 README 未给出完整步骤，验证前应先打开其链接的 best-practice/implementation 文件，确认可执行内容后再小范围试。
