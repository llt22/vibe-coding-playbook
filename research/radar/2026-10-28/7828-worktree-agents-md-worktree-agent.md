# @dotey: 避免 worktree 残留的最佳策略是在 AGENTS.md 里面添加规则，要求 worktree 不遗留，让 Agent 自己去清理。

- 结论：**值得一试**。建议小范围试用：在 AGENTS.md 中明确要求智能体完成任务后删除 worktree 及分支；原文给出了可照抄的规则雏形，但内容被截断且无验证数据，不宜直接 adopt。
- 原文：https://x.com/dotey/status/2115314783503196605
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-28T07:58:54.093Z

## 是什么
这条线索建议把「worktree 不遗留」写成 AGENTS.md 中的智能体规则：凡是在 worktree（包括 subagent 的 `.claude/worktrees/agent-*`）中完成的任务，完成时必须删除该 worktree 及其分支，让 Agent 自行清理，避免残留。原文附了 JimLiu/baocut 仓库 AGENTS.md 链接作为示例；给出的正文在「它专用的 cargo target」处被截断，因此只能确认规则方向和部分措辞，无法确认完整的收尾条件。

## 具体做法
1. 前提：项目已有 `AGENTS.md`，且智能体会读取并遵守其中规则；项目工作流确实创建 git worktree，尤其是 subagent 使用 `.claude/worktrees/agent-*` 的情况。
2. 在 `AGENTS.md` 中新增「worktree 不遗留」条目，明确任务完成时删除该 worktree 及其分支。原文可见的规则文本如下（末尾被截断，不能当作完整规则直接照抄）：
```
worktree 不遗留：在 worktree（含 subagent 的 .claude/worktrees/agent-*）里做的任务，完成时必须删除该 worktree 及其分支。它专用的 cargo target
```
3. 按原文所附的 `https://github.com/JimLiu/baocut/blob/main/AGENTS.md` 示例核对并补全被截断部分，特别是「它专用的 cargo target」之后的条件和处理方式；给出的材料没有提供删除命令、分支命名规则或 cargo target 处理细节，不能据材料编造。
4. 前提：智能体具备删除 worktree 和分支的权限；若没有，需要人工执行同样规则，或先调整权限与安全边界。
5. 规则必须写明触发点是「任务完成时」，让清理动作由完成状态触发，而不是只写在文档里不执行。

## 对应的研究问题
- 能力发现：原文表明可把「完成任务后清理 worktree」交给 Agent 自行执行，属于容易遗漏的收尾工作。
- 任务匹配：适合用 AGENTS.md 约束的编码智能体，尤其会创建 worktree 和 subagent `.claude/worktrees/agent-*` 的工作流；原文未说明具体模型或工具。
- 条件供给：需要项目提供 AGENTS.md、让智能体读取规则，并给予删除 worktree 与分支的权限；还需要知道 worktree 路径，原文提到 subagent 目录和专用 cargo target。
- 主动推进：清理动作由「任务完成」这一状态触发；原文没有给出更完整的自动持续机制。
- 效果验证：原文没有给出指标；只能依据材料建议检查残留 worktree、分支和 cargo target，但这属于试用设计而非原文证据。

## 与已有做法关系
清单中没有相关条目（给出的 `catalog_related` 为空）。原文指向一个 AGENTS.md 示例，但未与清单中的其他做法建立对照。

## 证据与局限
- 原文给出的证据是一条推文、一个 AGENTS.md 示例链接和一条规则片段；推文互动数据（38 点赞、7 转发、40 回复）只能说明有讨论，不能证明清理效果。
- 「最佳策略」是作者主张，原文没有给出前后对比、残留数量、清理耗时或失败案例。
- 正文被截断在「它专用的 cargo target」，完整规则和可能的命令不可见；也没有说明如何处理未合并分支、如何避免误删。
- 适用条件：使用 AGENTS.md 的编码智能体、任务会创建 git worktree、智能体有删除权限。不符合这些条件时，需要先改造工作流。

## 怎么试、怎么验证
最小试用：选一个会产生 worktree 的代码仓库，按上述方式把规则写入 AGENTS.md，先跑 3–5 个真实任务，覆盖普通任务和 subagent 任务。每个任务完成后检查 `git worktree list`、相关分支和原文提到的 cargo target 目录是否残留；与试用前同样数量的任务做对比。
判断指标：每 N 个任务后的残留 worktree 数、残留分支数、人工清理耗时、误删或破坏未合并工作的次数；同时确认任务完成质量没有下降。若残留明显减少且无误删，再扩大范围；若出现误删或规则未被遵守，先补充权限、保护规则和验收检查。
