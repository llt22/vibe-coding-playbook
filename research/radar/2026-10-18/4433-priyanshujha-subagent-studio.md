# priyanshujha/subagent-studio

- 结论：**值得一试**。建议小范围试：在中大型代码库上按 README 的 quickstart 安装 studio-core，并用 plan-then-build 跑一个中等以上变更，验证第二遍 review、guard/audit 是否真的带来质量收益；理由是原文给出了可直接复制的安装命令、七步落地流程、landing trailers 和审查守卫，具体到可以照做，但证据只有作者单项目自述、仓库仅 30 星，且关键证据细节在未包含的 docs/evidence.md 中。
- 原文：https://github.com/priyanshujha/subagent-studio
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-17T16:58:49.319Z

## 是什么

subagent-studio 是一组 Claude Code 插件，把一个会话变成协调者（orchestrator），调度一组精简、单职责子代理完成编码变更：先计划、在 worktree 里构建、两轮 review、受守卫的 landing。作者称它来自一个真实项目，该项目主要靠定时 Claude Code 会话跑了约五周。

仓库包含四个插件模块：

| 插件 | 增加内容 | 依赖 | 配置段 |
|---|---|---|---|
| `studio-core` | agents：`builder`、`builder-sonnet`、`reviewer`、`reviewer-pass-one`、`planner`、`planner-max`、`searcher`；skills：`plan-then-build`、`self-review`、`orchestrator-rules`、`studio-init`、`effort-low/medium/high/xhigh`；scripts：`review_guard.sh`、`review_path.py`、`worktree_sweep.sh`；可选 push hook | 无 | `core`、`roles` |
| `studio-context` | skill `context-budget`；scripts `context_budget.py`、`check_moved_text.py`、`token_usage.py`、`effort_check.py`、`my_context.py` | 无 | `context` |
| `studio-unattended` | skills `wake-up`、`task-queue`、`journal`、`usage-guard`、`notify`；scripts `wake_lock.sh`、`notify.sh`；权限 gate 和 prompt alarm hook | `studio-core` | `unattended` |
| `studio-research` | agents `research-lead`、`gatherer`、`gatherer-browser`；skill `research-run` | `studio-core` | `research` |

核心是六条主张：一个角色一个 agent 类型；orchestrator 不碰代码；大工作先计划；两轮 review 后强制 landing；便宜模型只读取不判断；上下文是预算。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **判断是否适用（前提）**。适用于中大型代码库、复杂变更：每次改多个文件、有真实用户、代码要维护多年，或无人值守的定时运行。跳过小而明确的工作：单个 Claude Code 会话处理小脚本或小代码库里描述精确的功能更便宜；本套件每个变更要加 planner、builders、step checks 和两个 reviewer，token 是单会话的数倍，而小变更收益低（原文图中低于 50 行的严重 bug 发现率为 9%）。

2. **安装插件（前提：Claude Code 构建支持 plugin 和 marketplace）**。复制执行：

```
/plugin marketplace add priyanshujha/subagent-studio
/plugin install studio-core@subagent-studio
/studio-core:studio-init
```

`studio-init` 会检测你的 check commands、提议 reviewed paths、询问 review passes、landing 和 push hook，写 `.claude/studio.json`，并向 `CLAUDE.md` 加一个短块。

3. **可选安装其他模块**。同样方式添加 `studio-context@subagent-studio`、`studio-unattended@subagent-studio`、`studio-research@subagent-studio`。

4. **无插件支持或想放进自己仓库时用 copy-in（前提：能运行 shell 脚本，目标项目路径可用）**。复制执行：

```bash
git clone https://github.com/priyanshujha/subagent-studio && cd subagent-studio
./install.sh --modules core --target /path/to/project
```

`install.sh` 会把 agents 和 skills 复制进 `.claude/`，scripts 进 `scripts/studio/`，hooks 合并进 `.claude/settings.json`（合并，不覆盖）。它会重写命名空间名称（`studio-core:builder` 变成 `builder`）。选项：`--modules core[,context,unattended,research]`、`--dry-run`、`--force`、`--uninstall`。然后在项目里运行 `studio-init` skill。

5. **发起第一个任务**。前提：已装 `studio-core` 并跑过 `studio-init`。复制执行：

```
Plan and build X with studio-core:plan-then-build
```

6. **按需要配置**。每个 key 可选且有默认值。schema 是 `config/studio.schema.json`，示例是 `config/studio.example.json`，各模块页面在 `docs/modules/` 下列出 key。至少关注：
   - `core.review.reviewed_paths`：把 scratch 目录和一次性脚本排除在 reviewed paths 外，避免多付 review 成本。
   - `core.review.land`：默认 `merge-no-ff`，由会话自己把已审工作落进 main，适合单人跑 Claude Code；团队让人类合并则设 `core.review.land: pr`，会话开 pull request，PR body 带同样 trailers，合并时必须用保留 trailers 的 merge commit，这样 audit 仍有效。
   - `roles.<role>`：设置某角色的 model 或 effort level 时，会话在对应角色的 Agent 调用上传递。前提是 Claude Code v2.1.292 或更新；老版本把 `roles` 留空，由各 agent 文件 frontmatter 决定。

7. **按七步流程跑一个变更**（以“add CSV export”为例，前提：已有计划、分支和工作区，已配置 check commands）。原文流程：

```
1. Agent { subagent_type: "studio-core:planner", description: "Plan T-12",
           prompt: <task, constraints, files to read, the plan shape> }
   -> saves plans/t-12-csv-export.md, commits and pushes it

2. git worktree add -b review/2026-10-13-t-12-csv ../project-review/t-12-csv origin/main

3. Agent { subagent_type: "studio-core:builder", description: "Build T-12 step 1",
           prompt: <step 1 verbatim, goal, worktree path, ci_commands> }
   Agent { subagent_type: "studio-core:reviewer", description: "Check T-12 step 1",
           prompt: <acceptance line, builder report, the five checks> }
   ... one fresh builder and one fresh check per step

4. commit by path, push the branch, write down BASE and HEAD

5. Agent { subagent_type: "studio-core:reviewer-pass-one", description: "Pass one T-12",
           prompt: <branch, BASE..HEAD, paths, the author's checklist> }
   -> a fresh builder fixes what it found; new HEAD

6. Agent { subagent_type: "studio-core:reviewer", description: "Review T-12 before main",
           prompt: <reviewer-prompt.md, every placeholder filled> }
   -> a fresh builder fixes blockers and majors, each with a test; tip FIX

7. git merge --no-ff from a detached origin/main in the worktree, push HEAD:main,
   remove the worktree, delete the branch on both sides
```

原文未给出 plan 的固定 shape、`reviewer-prompt.md` 的具体检查项，也未给出 `<...>` 占位符的完整内容，需要自己补。

8. **写 landing commit message 的 trailers**。原文示例：

```
Reviewed-by: fresh reviewer agent, 3f1c2a9..8be04d1, 1 round (0 blocker, 1 major, 2 minor; 2 fixed, 1 queued)
Fixed-after-review: author, 8be04d1..c47e9f0, 2 fixes (major: empty file gave a header-only CSV; minor: column order)
```

9. **用守卫和审计兜底**。`review_guard.sh audit` 读取这两个 range，检查 merge 是否恰好带入了它们覆盖的内容。guard script 拒绝把未审查工作 push 到 main；可选 hook 自动运行该 guard；audit 遍历 main 历史找漏掉的 landing。`examples/` 会构建一个 toy repo，带一个可离线审计的 landing。

10. **控制审查范围和成本**。原文明确提示：每个变更的 agent 调用更多。小变更需要一个 builder、一个 pass-one reviewer 和一个 fresh reviewer；有计划的变更再加 planner 和每步 check。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**

- 把原本一个会话做完的编码工作拆成 orchestrator + planner + builder + reviewer-pass-one + reviewer + searcher 的单职责子代理流水线。
- 两轮 review：第一轮是作者自己的 checklist，由新的 `reviewer-pass-one` 跑；第二轮是没写这次变更的 fresh `reviewer`，读固定 `BASE..HEAD` commits。
- 用 Haiku agent 在仓库里查资料、读网页做研究。但原文明确它们不 build、不 review、不 plan、不判断发现，且它们带回来的数字在结论依赖之前会被更强模型复核。
- skills 按需加载：原文称一次 run 约 31 个 skill 中加载约 6 个，其余留在上下文之外。
- 上下文预算：`CLAUDE.md`、state file、task index、每个 skill、每个 agent 文件都有 byte budget；文件超预算时把文本逐字移到 stub 后面，从不删除，并有脚本证明移动中没有丢内容。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**

- 适合：中大型代码库、复杂变更（每次多个文件、真实用户、要维护多年），以及没人看着时改变事物的定时运行。
- 不适合：小而明确的工作。原文说单会话处理小脚本或小代码库里精确描述的功能很好，且成本只是零头；套件在小变更上很少买到东西。
- 角色匹配：`planner-max` 用于难逆的工作，或既复杂又关键的工作；其余计划用 `planner`。每个计划步骤交给各自全新的 builder。
- 工具边界：reviewer 不给 Edit 或 Write；searcher 只有四个读工具。
- 模型/effort：每个 agent 文件在 frontmatter 里固定 model、effort level 和短工具列表；配置 `roles.<role>` 时由会话在 Agent 调用上传 model 和 effort。
- 协作方式：单人用默认 `merge-no-ff` 自己落地；团队用 `land: pr` 让人类合并。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**

- 工具与版本：Claude Code 需支持 plugin 和 marketplace；按 Agent 调用传 `model` 和 `effort` 需要 v2.1.292 或更新；老版本用 `install.sh` 并把 `roles` 留空。
- 配置：`studio-init` 需要知道 check commands、reviewed paths、review passes、landing 方式、push hook；写入 `.claude/studio.json` 和 `CLAUDE.md`。
- 流程输入：任务、约束、要读的文件、计划 shape；每个 builder 需要步骤原文、目标、worktree 路径、`ci_commands`；reviewer 需要 acceptance line、builder 报告、五项检查；pass-one 需要 branch、`BASE..HEAD`、paths、作者 checklist；最终 reviewer 需要填好占位符的 `reviewer-prompt.md`。
- git 条件：review 分支和独立 worktree、按路径 commit、push 分支、记录 BASE 和 HEAD、`--no-ff` merge、push `HEAD:main`、清理 worktree 和两边分支。
- 权限/守卫：可选 push hook、权限 gate、prompt alarm hook、`wake_lock.sh` 等，用于无人值守运行。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**

- `studio-unattended` 面向定时 Claude Code 会话，提供 `wake-up`、`task-queue`、`journal`、`usage-guard`、`notify` skills，以及 `wake_lock.sh`、`notify.sh`、权限 gate 和 prompt alarm hook。原文称原项目主要靠定时会话跑了约五周。
- 状态触发：计划提交后才让 builder 开始；每个计划步骤配 fresh builder 和 fresh check；review pass one 后 fresh builder 修发现的问题并产生新 HEAD；最终 reviewer 发现 blocker 和 major 后，fresh builder 每个修复都带测试。
- 事件守卫：push 到 main 若带未审查工作会被 guard script 拒绝；audit 遍历 main 历史找漏掉的 landing。

**5. 效果验证：怎样判断确实改善了结果**

- 独立第二轮 review 本身是验证机制：原文称在原项目中，第一轮 review 已跑过之后，新的最终 reviewer 仍在约每三个变更中的一个里发现 blocker 或 major bug。
- 按变更规模分层：低于 50 行 9%，50–199 行 33%，200–799 行 35%，800 行以上 38% 的变更中最终 review 发现严重 bug。
- 质量指标：每变更的严重问题数从 0.64 降到 0.27，clean changes 从 57% 升到 77%，0 个 merge 被 revert。
- 成本指标：同一 plan-build-review 循环在每个角色用对模型和 effort、上下文精简后，每完成任务的成本约便宜 5 倍，从 $30 和 $33 降到 $6.90；整个 run 从 $58.90 降到 $19.10；按角色，builders $26.44→$5.68，lead $16.20→$5.08，reviewers $7.19→$3.94，specialists $6.32→$3.61，planners $2.73→$0.79。
- 上下文指标：skills 保持约 1000 万 token 不进入每次 run 的上下文，按最便宜 token 价格一个月至少省 $503。
- 审计验证：`review_guard.sh audit` 用 `Reviewed-by:` 和 `Fixed-after-review:` trailers 的 range 检查 merge 是否恰好带入被覆盖的工作。

## 与已有做法的关系（对照给出的清单条目）

清单中相关条目：**Claude Code**（tool，状态 adopt）。

subagent-studio 是构建在 Claude Code 之上的插件/子代理套件，不替代 Claude Code，而是改变在 Claude Code 里组织会话、子代理、审查和落地的方式。它明确依赖 Claude Code 的 plugin 和 marketplace 支持，并按 Claude Code 版本决定能否在 Agent 调用上传 model/effort。

清单中没有其他相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的数据/案例**

- 一个项目、一个月定时运行，数据来自其自己的 session transcripts 和 git history。原文要求引用前先读 `docs/evidence.md` 的 caveats。
- 成本：每完成任务从 $30/$33 降到 $6.90；整 run $58.90→$19.10；分角色成本下降表。
- 质量：每变更严重问题 0.64→0.27，clean changes 57%→77%，0 merges reverted；最终 reviewer 在 pass one 之后仍发现问题的比例，以及按变更行数分档的 9%/33%/35%/38%。
- 上下文：31 个 skill 中约 6 个每次运行加载；约 1000 万 token 不进入上下文，至少省 $503/月。
- 一个具体 landing 示例的 trailers 文本，以及 `examples/` toy repo 可离线审计。
- 一个流程示例“add CSV export”的七步伪代码。

**只是作者主张、原文未独立验证的部分**

- 上述成本和质量的绝对值都来自作者自述的单项目测量，且 caveats 在未包含的 `docs/evidence.md`，无法评估统计口径和混杂因素。
- “两轮 review 值得”“便宜模型只读不判断”等是作者结论，不是对照实验。
- 图表以图片形式给出，文字来自 README 的图片说明；图表原始数据未包含。
- 原文未给出 planner plan 的固定 shape、`reviewer-prompt.md` 的检查项、`plan-then-build` 的完整 prompt、`studio.json` 的完整示例内容。
- 仓库仅有 30 stars，未见第三方复现或 issue 佐证。

**适用条件**

- 中大型、复杂变更、长期维护、有真实用户的代码库；无人值守定时运行时收益更明显。
- 使用 Claude Code，且插件安装需要支持 plugin/marketplace 的构建；传 model/effort 需要 v2.1.292 或更新。
- 能承担每个变更多出 planner、builders、两次 review 的 token 成本；小变更不适合。
- 需要 git worktree、分支、CI commands、可写 `.claude/settings.json` 来合并 hooks。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式**

1. 先用 `examples/` 的 toy repo 离线跑通：确认 `review_guard.sh audit` 能读取 `Reviewed-by:` 和 `Fixed-after-review:` 两个 range，并检查 merge 覆盖范围。
2. 在真实项目的非 main 分支上按 quickstart 安装 `studio-core`，运行 `studio-init`，把 `core.review.reviewed_paths` 限定到真正要长期维护的路径，先不装其他模块。
3. 选一个中等以上、多文件的变更（对照原文 50–199 行以上档），用 `Plan and build X with studio-core:plan-then-build` 跑完整七步：计划提交 → worktree → 每步 fresh builder + check → pass-one → fresh final reviewer → blocker/major 每个带测试修复 → `--no-ff` landing。
4. 单人先用默认 `land: merge-no-ff`；团队试 `land: pr`，并确认 PR 用保留 trailers 的 merge commit 合并。
5. 对比基线：同类变更在单个 Claude Code 会话里的成本、返工和漏 bug 情况。

**判断改善的指标**

- 第二遍 review 在 pass one 之后是否仍发现 blocker 或 major；若长期为 0，说明要么变更太小，要么第一遍质量已够，套件不划算。
- 每变更的严重问题数和 clean change 比例是否向 0.27、77% 方向移动，而不是变差。
- 每完成任务的成本/整 run 成本是否可接受；若没有随角色模型和 effort 用对而下降，说明配置或上下文没调好。
- merge revert 数是否保持为 0。
- `review_guard.sh audit` 是否能发现或确认没有漏审 landing；可选 push hook 是否按预期拒绝未审查 push 到 main。
- 小变更若成本成倍上升而第二遍 review 基本抓不到东西，就把 `reviewed_paths` 收窄或对小任务不用套件。
