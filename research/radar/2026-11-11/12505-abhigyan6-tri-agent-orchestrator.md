# abhigyan6/tri-agent-orchestrator

- 结论：**值得一试**。先照 README 把 `HANDOFF.md` 交接契约和 relay 流水线在一个中等规模任务上跑通（初期可只用 Claude Code + Codex 两个 agent，把 Antigravity 换成人工架构评审），跑通后再决定是否接入第三个 CLI；理由是原文给出了可直接照抄的命令、交接模板、分阶段提示词和目录结构，属于可执行的东西，但完全没有效果数据，且核心依赖之一（Antigravity）在清单里仍处于 watch 状态。
- 原文：https://github.com/abhigyan6/tri-agent-orchestrator
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-11T08:29:25.096Z

## 是什么

`tri-agent-orchestrator` 是一个多编程智能体编排框架兼"通用 agent skill"，把三个 CLI 串成一条三阶段流水线：

- **`agy`（Google Antigravity）** —— 首席架构师与审计员：代码库侦察、依赖图分析、架构/RFC 起草、对抗性边界用例发现。
- **`claude`（Anthropic Claude Code）** —— 主力实现者：领域逻辑与 API 实现、重构、抽象与文档。
- **`codex`（OpenAI Codex CLI）** —— 可靠性与运维工程师：单测/集成测试生成、lint 与类型修复、git 提交与 PR 准备。

编排的关键机制不是模型调用本身，而是 **`HANDOFF.md` 交接契约**：每个 agent 结束自己阶段时更新仓库根目录的这个文件，写清「做了什么 / 关键文件 / 硬约束与决策 / 交给下一个 agent 的验证清单」，下一阶段 agent 读它继续。仓库还带 CLI（`bin/tri-agent`）、三个预置 workflow（relay 接力、parallel-debate 架构共识、redteam-audit 红队审计）、以及 skill 安装脚本。

## 具体做法（编号步骤）

**前提**：macOS 或 Linux；本机已安装并登录三个 CLI——`agy`（Antigravity）、`claude`（Claude Code）、`codex`（Codex CLI）；有 git 与 GitHub 推送权限。

1. 克隆并进入仓库：
```bash
git clone https://github.com/abhigyan6/tri-agent-orchestrator.git
cd tri-agent-orchestrator
```

2. 体检环境，确认三个 CLI 都在 PATH 上且可调用：
```bash
./bin/tri-agent doctor
```
正常输出应逐行列出三个 agent 的版本号并以 "All 3 agent CLIs ... are active and ready!" 结尾。任一行不是 ✅ 就先解决该 CLI 的安装问题，不要往下走。

3. 全局注册 skill，让三个 CLI 都能原生识别这套工作流：
```bash
./scripts/install-skill.sh
```
（README 说明它会安装/软链到 `~/.agents/skills`、`~/.claude/skills`、`~/.codex/skills`；等价命令为 `tri-agent install-skill`。）

4. 在目标项目里创建第一份交接契约：
```bash
tri-agent handoff create --feature "rate-limiter" --completed agy --next claude
```
把 `--feature` / `--completed` / `--next` 换成自己的功能名和实际的上下游 agent。

5. 先干跑一次，看清它准备下达哪些命令，再真跑：
```bash
tri-agent run --workflow relay --prompt "Build file upload component" --dry-run
```
确认无误后去掉 `--dry-run`：
```bash
tri-agent run --workflow relay --prompt "Build modern auth middleware with JWT rotation"
```

6. 在每个 agent 里用原样的提示词推进阶段（README 给的三个入口）：
```text
# 在 Antigravity 里
"Run the tri-agent workflow to research and build a modern auth middleware for my app."

# 在 Claude Code 里
"Read HANDOFF.md and implement the components outlined in docs/tri-agent/SPEC.md."

# 在 Codex 里
"Check HANDOFF.md, write unit and edge-case tests for the new auth middleware, and verify they all pass."
```

7. 每个阶段收尾时，把 `HANDOFF.md` 按下面的结构更新（这是整个方法最值得抄走的部分，模板可直接照用）：
```markdown
# Tri-Agent Handoff Contract

## Metadata
- **Workflow ID:** `wf-20261110-a9f3b1`
- **Active Feature:** `auth-middleware`
- **Current Phase:** `Phase 1: Architecture & Specification`
- **Completed By:** `agy`
- **Next Agent:** `claude`
- **Timestamp:** `2026-11-10T16:00:00Z`

## What Was Done
- Designed RS256 token rotation architecture.
- Outlined CSRF defense and SameSite=Strict cookie invariants.

## Key Files & Artifacts
- Specification: `docs/tri-agent/SPEC-auth.md`

## Critical Constraints & Decisions
- Token expiration: 15 minutes access, 7 days refresh.
- No third-party heavy dependencies; use native Web Crypto or jose.

## Verification Checklist for Next Agent
- [ ] Implement `src/middleware/auth.ts` matching `SPEC-auth.md`.
- [ ] Export `AuthRequest` and `TokenPayload` types.
- [ ] Update `HANDOFF.md` and set Next Agent to `codex`.
```

8. 随时检查交接状态，避免某个阶段没交接就换 agent：
```bash
tri-agent handoff status
```

9. 需要别的协作形态时换 workflow：`workflows/01-relay-pipeline.md`（研究→构建→验证接力）、`02-parallel-debate.md`（多 agent 架构共识）、`03-redteam-audit.md`（实现 + 对抗式红队审计）。

> 说明：原文只给了 `lib/agents.py`、`lib/orchestrator.py`、`workflows/*.md` 的文件名与用途，没有贴出内部实现或 workflow 的具体步骤文本，因此第 9 步之后的内容无法从材料中还原。

## 对应的研究问题

- **能力发现**：原文主张按「认知强项」分工——agy 做代码库侦察、依赖/安全建模与对抗性边界审计；claude 做领域建模、语义重构；codex 做测试生成、lint/typecheck 修复、git/PR。这提示了一类容易被忽略的分工：把"找漏洞、想边界条件"单独交给一个 agent 并对它的产出做审计，而不是让实现者自查。但这些都是作者主张，无实测支撑。
- **任务匹配**：给出了明确的「阶段 → 模型/工具」映射，以及三种协作方式（接力 relay、并行辩论 parallel-debate、红队审计 redteam-audit），是原文最有价值的可操作部分。
- **条件供给**：需要的供给写得很具体——三个 CLI 及其登录态、skill 安装目录（`~/.agents/skills`、`~/.claude/skills`、`~/.codex/skills`）、仓库根目录的 `HANDOFF.md` 与 `docs/tri-agent/SPEC*.md`、以及写入/提交/推 PR 的权限。反馈机制就是 `HANDOFF.md` 里的 "Verification Checklist for Next Agent" 与 `tri-agent handoff status`。
- **主动推进**：只有状态检查和按 workflow 串接（`tri-agent run --workflow relay`），属于「流程推进」而非「时间/事件/状态触发的持续运行」。原文没有提到定时、hook、CI 触发或长时间无人值守运行，这一维度证据不足。
- **效果验证**：仅有 "Verified Tests + GitHub PR" 这一终点描述和交接清单里的勾选项，没有指标定义、没有对比基线、没有结果数据。

## 与已有做法的关系

- **Claude Code（adopt）**：本框架把 Claude Code 定位为第 2 阶段的实现者，是对已有工具的复用与编排，不替代它。
- **OpenAI Codex（adopt）**：定位为第 3 阶段的测试/构建/PR 执行者。
- **Google Antigravity（watch）**：作为第 1 阶段架构师与审计员被强依赖。这意味着整套三阶段流水线建立在一个清单中尚属 watch 的组件上；若该 CLI 不可用，需要退化为「用 Claude Code 做架构 + Codex 做测试」的两段式，`HANDOFF.md` 契约本身与 agent 数量无关，可以照常使用。
- 除此之外，清单中没有相关条目（没有其他多 agent 编排类条目可供对照）。

## 证据与局限

- **给了什么**：完整的安装/体检/注册命令、`HANDOFF.md` 模板全文、三阶段角色矩阵、三个 workflow 的名称与定位、一段 `doctor` 的示例输出、一条 auth middleware 的走查示例文件名。
- **没给什么**：零基准数据、零对比实验、零真实项目结果。README 中 "preventing hallucination cascades"、"delivering production-ready, verified code" 均为作者主张，无证据。示例输出中的版本号（1.5.4 / 2.1.322 / 0.167.0）是示例，不是承诺。
- **成熟度**：仓库仅 30 stars，属于早期个人项目；`workflows/*.md` 的具体内容、`lib/` 的实现质量均无法从材料判断。
- **适用条件**：仅适合已经同时拥有并可调用三个 CLI、且任务复杂度足以覆盖多阶段交接成本的场景。对小改动或单文件任务，写 `HANDOFF.md` 的开销可能大于收益。

## 怎么试、怎么验证

**最小试用（1～2 天）**：
1. 选一个中等规模、有明确验收标准的任务（例如「给现有服务加 JWT 轮换中间件」），不要选玩具 demo，也不要选核心生产系统。
2. 先做**两段式降级试点**：只装 `claude` + `codex`，第 1 阶段的架构与边界条件由你自己（或 Claude Code 的一个独立会话）完成，但**必须照样产出 `SPEC.md` 和 `HANDOFF.md`**，第二阶段照抄 README 的提示词让 Codex 写测试并验证。这样可以在不引入 watch 状态组件的前提下验证契约本身是否有效。
3. 跑通后再接 `agy`，对比两段式与三段式的差异。

**判断有没有改善的指标（同一个人、同类任务，与「单 agent 一路做到底」的基线对比）**：
- 交接后下一阶段**首次即通过**的验证清单项比例（`HANDOFF.md` 里的勾选项）；
- 需要人工介入纠偏的次数与总返工轮次；
- 交接过程中**约束被遗漏**的次数（如 token 过期时间、禁用重依赖等被下一阶段违反）；
- 最终 PR 的评审意见数量与严重级别分布；
- 从开始到 PR 就绪的总耗时（用来判断交接开销是否被收益覆盖）。

**放弃信号**：如果两段式试点里 `HANDOFF.md` 的约束遗漏次数并不低于单 agent 基线，说明瓶颈不在模型分工而在任务描述质量，此时应退回到优化提示词与 SPEC，而不是继续加 agent。
