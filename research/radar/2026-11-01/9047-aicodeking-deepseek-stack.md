# aicodeking/deepseek-stack

- 结论：**值得一试**。建议小范围试：在支持 SKILL.md 的编码 agent 里安装 ds-mode、ds-plan-loop、ds-verify-loop 三件套，用一批小任务对比裸跑 DeepSeek 时的验证执行率、返工次数和人工干预。仓库给出了可直接复制的安装命令和清楚的技能分工，但只有 README 级描述、没有效果数据和技能内部提示词，暂不宜直接 adopt。
- 原文：https://github.com/aicodeking/deepseek-stack
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-31T18:12:21.073Z

## 是什么

deepseek-stack 是一个 MIT 许可的 `SKILL.md` 技能包仓库，目标是让 DeepSeek V4.1 Flash、V4 Pro 等便宜模型按“先复述、先读、分小步验证、有证据才算完成”的方式工作。README 把便宜模型的常见失败归为四类：跳过计划、没运行就声称修好、反复重试同一个坏思路、长任务漂移；每个技能用“短循环 + 硬停止条件 + 要求真实证据”来补一个缺口。技能可在任何读取 `SKILL.md` 的 harness 中使用：Claude Code、Codex、Cline、OpenCode、PandaCode 等。仓库分 Core、Loops、Build、Ship、Understand 五组，约 30 个技能，并给出 DeepSeek 使用提示和依赖要求。

## 具体做法

1. **前提**：使用支持 `SKILL.md` 的编码 agent harness（README 列出 Claude Code、Codex、Cline、OpenCode、PandaCode 等）；机器上有可用的 `npx`。如果要用 Ship 组技能，需安装并登录 `gh`；`ds-watch-pr` 需要 `python3`；`ds-jury`、`ds-best-of-n`、`ds-swarm` 需要子代理或第二模型，没有时技能会在新上下文中串行跑多次尝试。

2. **安装全部技能**（在项目目录或全局）：

```bash
npx skills add aicodeking/deepseek-stack
```

全局安装加 `-g`：

```bash
npx skills add aicodeking/deepseek-stack -g
```

3. **只装一个技能**（先小范围试时推荐）：

```bash
npx skills add aicodeking/deepseek-stack --skill ds-verify-loop
```

4. **手动安装**：把 `skills/*` 复制到 `~/.claude/skills/`、`~/.codex/skills/` 或所用 harness 的 skills 文件夹。

5. **不确定从哪开始**：运行：

```text
/ds-help
```

6. **按任务选技能**（依据 README 的技能表）：日常默认用 `ds-mode`（复述、先读、小步验证、有证据才说完成）加 `ds-principles`（21 条带触发条件的工程规则）；新任务用 `ds-sharpen` 把目标复述并加深、重写提示词，再用 `ds-plan-loop` 做“每步带检查”的计划、在新一轮里自我批评一次、然后一步一实现；实现阶段用 `ds-verify-loop` 反复“改—跑真实检查—读真实错误—修根因”，最多 5 轮；同一失败出现两次用 `ds-unstick` 命名共同假设、验证它、换路线；长任务用 `ds-context-reset` 维护 `PROGRESS.md` 并在新上下文继续，或用 `ds-ledger` 一行一个决策、每步前重读；评审用 `ds-review-loop`（作者加新上下文评审，最多 4 轮）或 `ds-jury`（两三个不同模型直到一致）；要质量时用 `ds-best-of-n`（N 个并行尝试选最佳并嫁接其余优点）或 `ds-swarm`（并行 worker 合并成一份报告）。

7. **构建与交付**：先 `ds-blueprint` 定类型、签名、模块布局再实现；需要测试驱动时用 `ds-tdd`（先失败测试再最小修复）；改完用 `ds-blast-radius` 找 diff 之外的破坏面并证明安全；前端用 `ds-design` / `ds-design-audit`。交付用 `ds-pr` 写以问题开头的短 PR，`ds-watch-pr` 盯 CI 和 review bot 并修真实问题，`ds-ship` 无人值守从变更走到合并，`ds-ready` 同样流程但停在合并前；接手别人的 PR 用 `ds-adopt`，旧 PR 用 `ds-revive`。

8. **DeepSeek 配置建议**（README 原文）：

```text
Use thinking mode at max effort for planning and review. It matters more than any skill.
Run big jobs at off-peak hours, when the API price is lower.
DeepSeek is cheap, so spend tokens on quality: ds-best-of-n, ds-review-loop and ds-jury cost little and catch a lot.
Pair a stronger planner with DeepSeek as the implementer if your harness supports separate plan and act models.
```

9. **注意技能内容来源**：README 只给技能名和一句话功能，没有展开每个 `SKILL.md` 的提示词全文；安装后应先打开对应 `SKILL.md` 审阅，再决定是否用于无人值守或自动合并场景。

## 对应的研究问题

- **能力发现**：README 把一批通常不交给便宜模型的工作显式技能化，包括规划、逐步验证、卡住恢复、长任务上下文重置、决策台账、作者/评审双循环、多模型陪审、best-of-n、并行 swarm、PR 交付与 CI 盯守、接手/复活旧 PR、代码解释、回归总结、把重复错误转成类型/lint/测试、去 AI 味。这直接回答了“还有哪些工作可以交给 AI”。
- **任务匹配**：给出了明确的匹配原则：便宜模型配短循环和硬停止条件；规划与评审用 thinking mode max effort；harness 支持分离 plan/act 模型时用更强规划模型配 DeepSeek 实现；多评审类技能需要子代理或第二模型，否则退化为串行新上下文尝试。
- **条件供给**：需要提供支持 `SKILL.md` 的 harness、技能安装目录/命令、`gh` 登录、`python3`、子代理或第二模型；长任务需要 `PROGRESS.md` 和 ledger 作为外部状态；无人值守交付需要仓库权限和 CI 访问。
- **主动推进**：`ds-ship` 明确是无人值守从变更到合并 PR，`ds-ready` 到合并前停，`ds-watch-pr` 持续盯 CI 和 review bot 并修真实发现，`ds-context-reset` 和 `ds-ledger` 支撑长跑和无人值守运行。
- **效果验证**：`ds-verify-loop` 要求跑真实检查、读真实错误、修根因、最多 5 轮；`ds-review-loop` 作者加新上下文评审直到一致、最多 4 轮；`ds-jury` 多模型直到一致；`ds-best-of-n` 多尝试选最佳；`ds-blast-radius` 证明 diff 外安全；`ds-design-audit` 评分后修 top 问题再复检；`ds-mode` 要求证据先于“完成”。

## 与已有做法的关系

- **Claude Code（adopt）**：README 明确支持 Claude Code，手动安装路径就是 `~/.claude/skills/`；可作为 Claude Code 现有技能体系的补充，尤其验证循环和评审循环。
- **DeepSeek（try）**：本仓库就是为 DeepSeek V4.1 Flash / V4 Pro 设计的技能包，属于该条目的具体做法：用流程和验证补模型能力。
- **Cline（watch）**：README 把 Cline 列为支持的 harness 之一，但没有 Cline 专门配置或案例；目前只能按通用 `SKILL.md` 方式试。
- **OpenCode（watch）**：同上，README 列为支持 harness，无专门说明。
- **Graft（watch）**：原文未提及，清单中这条没有对应依据。

## 证据与局限

- **原文给出的可核实内容**：安装命令、手动安装路径、约 30 个技能的名称与一句话功能、DeepSeek 使用提示、依赖要求、支持的 harness 列表。这些足以让人照着装和选技能。
- **只是作者主张**：README 称这些技能能让 DeepSeek “work like a much more expensive model”，称便宜模型总在同样几处失败，称 thinking mode “比任何技能都重要”，称错峰更便宜、多花 token 很划算。原文没有给出 benchmark、成功率、成本对比、用户案例或技能内部提示词，无法验证这些主张。
- **成熟度**：仓库 58 stars，属于低关注度项目；技能质量、维护频率、与各 harness 的兼容性都未在材料中证明。
- **适用条件**：任务以代码/PR 为主；harness 能读 `SKILL.md` 并执行命令；愿意让 agent 跑真实检查和 CI；使用 `ds-jury`、`ds-best-of-n`、`ds-swarm` 时要有子代理或第二模型；`ds-ship` 这类无人值守合并技能需要可靠的仓库权限和回滚机制。
- **风险**：自动合并、自动修 CI、自动接手他人 PR 都可能造成误改；README 没有给权限边界、失败回滚或人工审批点的细节。

## 怎么试、怎么验证

**最小试用**：选 10 个同类型的小任务（例如修小 bug 或加小功能），同一 harness、同一仓库快照、同一提示词模板，分两组：A 组便宜模型裸跑；B 组只安装 `ds-mode`、`ds-plan-loop`、`ds-verify-loop`（遇到重复失败再加 `ds-unstick`）。先不要上 `ds-ship` 自动合并。

**记录指标**：
- 是否先给出计划，计划每一步是否带检查；
- 是否实际执行验证命令（而不是只声称通过）；
- 是否读取并引用真实错误；
- 首次通过率、平均修复轮数、同一失败重复次数；
- 人工干预次数和人工返工时间；
- token 消耗/费用和总耗时。

**判断改善**：B 组验证命令执行率应接近 100%，重复失败次数和人工干预次数应下降，首次通过率或总耗时不差于 A 组；如果成本增加但返工明显减少，可继续加 `ds-review-loop` 或 `ds-best-of-n` 做第二轮对比。长任务另测 `ds-context-reset` + `ds-ledger`，看跨上下文是否丢状态；Ship 类先在非关键仓库用 `ds-ready`（不自动合并）观察 CI 修复和评审处理质量。
