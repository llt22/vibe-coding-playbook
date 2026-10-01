# OthmanAdi/planning-with-files

- 结论：**值得一试**。先用一条安装命令把 planning-with-files 装进 Claude Code 或 Codex 这类支持 hook 的宿主，在同一个长时编码任务上做 A/B：让智能体把 phases 写进 task_plan.md 并靠 hook 每轮重注入，观察 /clear 或 compaction 后的重新定位轮数是否下降。理由是原文给出了可照做的安装命令、三文件模式与 hook 生命周期，但这些效果数字全部来自项目自测，需要自己复现验证。
- 原文：https://github.com/OthmanAdi/planning-with-files
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T13:27:19.671Z

## 是什么

planning-with-files 是一个面向长时运行编码智能体的「基于文件的持久计划」skill。核心做法是把计划状态从上下文窗口搬到磁盘上，用三个 Markdown 文件承载任务执行状态：

- `task_plan.md`：阶段（phases）+ 复选框，是 `/clear` 之后的恢复点
- `findings.md`：研究笔记与决策，边做边追加
- `progress.md`：会话日志与测试结果

它靠宿主的生命周期 hook 在每个回合重新注入选中的计划上下文，因此计划能挺过上下文丢失、`/clear`、崩溃和 compaction。自动恢复只读项目文件；要读取同一项目下的本地 agent 会话记录（做聚合计数或有界重放）必须显式进入 catchup 模式。安装走 Agent Skills 标准，覆盖 60+ 智能体，并为 Claude Code、Codex CLI、Pi、Hermes Agent、OpenCode、DeepSeek Harness 提供原生插件。

原文给出的核心类比：

```
Context Window = RAM (volatile, limited)
Filesystem = Disk (persistent, unlimited)

→ Anything important gets written to disk.
```

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **确认前提**：你的编码宿主属于受支持列表——Claude Code、OpenAI Codex CLI、Cursor、GitHub Copilot、Kiro、OpenCode、Continue、Pi、Hermes Agent、CodeBuddy、Factory、Mastra 等；本机有 Node/npx（安装走 `npx skills`）。若宿主只支持旧的 Rules 系统，原文指向 `legacy-rules-support` 分支。

2. **一条命令安装（全局）**：

```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g
```

中文版（另有 ar/de/es/zht 变体，命令形如）：

```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-zh -g
```

注意：状态标记必须保持英文字面量，例如 `**Status:** complete`——`check-complete.sh` 用 `grep -F` 匹配它，翻译后会直接导致完成门槛失效。

3. **在项目里建立三文件结构**（原文原样）：

```
your-project/
├── task_plan.md   ← phases + checkboxes; the resume point after /clear
├── findings.md    ← research notes and decisions, appended as you go
└── progress.md    ← session log and test results
```

并行任务不要抢同一套文件，改用隔离目录 `.planning/YYYY-MM-DD-slug/`（同样这三个文件），通过 `.active_plan` 指针选择（v2.36.0+）。这些文件默认被 gitignore，且不存放在其他运行时状态里。

4. **与 Claude Code plan mode 衔接**：两者是互补阶段。plan mode 里设计并批准方案；接受方案后，让智能体把方案写成 `task_plan.md` 的 phases（或调用 `/plan` 让 skill 依方案生成文件），然后在普通模式执行。此后 hook 负责把 phases 留在注意力窗口。

5. **依赖 hook 获得持续注入**：每回合开始时 `UserPromptSubmit` hook 重新注入选中的 active-plan 上下文；`/clear` 或新会话后 skill 从磁盘重读项目文件。原生插件宿主（Claude Code 等）自带「每回合计划注入、写入后提醒、完成门槛、`/pwf` 命令、模型可调用工具」，无需手写 shell hook；其他平台走 Agent Skills 标准，按各 IDE 的 hooks/配置指南注册。

6. **启用完成门槛**：在 gated 模式下，完成门槛会持有智能体的停止动作，直到计划报告完成。OpenCode 通过 `session.idle` 重新提示会话（Tier 2），DeepSeek Harness 通过 `agent/turn-stopping` 闸门。

7. **命名计划与选择器**：同一项目存在两个命名计划时必须显式给 `PLAN_ID`（v3.17.1 起，即便没有 `.planning/sessions/` 也如此）；歧义时 hook 不注入计划，Stop 也不会对着猜出来的计划设闸。可用 `PWF_PLAN_ROOT` 固定计划根、`PLANNING_DISABLED` 关闭；`PWF_FAST_PATH=0` 可强制回到 shell 链（v3.17.0 起默认走单个 Python 进程 `scripts/inject-plan.py`）。

8. **查看与选择计划**：`--list`（或 PowerShell `-List`）列出已保存的计划与阶段数（v3.18.0）。

9. **任务结束后处理计划文件**：它们是工作记忆，不是交付物——默认 gitignore、不自动归档，下一个任务会覆盖根计划，slug 目录只是不再 active。值得保留的内容应显式提升到代码、提交或文档里。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文把「跨会话/跨压缩维持长任务执行状态」这件事明确交给 AI——阶段状态、依赖、完成校验放在磁盘并由 hook 每轮回灌。这属于容易被忽略、但可交给智能体自动承担的元任务，而不是让模型「记住」。
- **任务匹配**：适合长时运行的 agent 任务与多 agent 编排（orchestrator/worker/subagent）；宿主能力分层——原生插件宿主（Claude Code、Hermes、OpenCode、DeepSeek Harness）拿到每回合注入、提醒与闸门，标准 skill 宿主只拿到 skill 本体。原文明确区分「harness 自带的 to-do list 活在上下文里」与「计划活在磁盘上」。
- **条件供给**：需要项目目录写权限、hook/插件注册（原生插件或 per-IDE hooks 配置），并持续供给三类信息——`task_plan.md` 的 phases 与复选框、`findings.md` 的笔记与决策、`progress.md` 的会话日志与测试结果。选择器是 `PLAN_ID` / `PWF_PLAN_ROOT` / `.active_plan`；反馈依赖写入后的进度提醒（PostToolUse 每条消息一次，`Bash` 已从该匹配器中移除）与完成门槛。
- **主动推进**：由事件和时间触发——`UserPromptSubmit` 每回合注入、`PreToolUse`/`PostToolUse` 写入提醒、compaction 后恢复、`session.idle`（OpenCode）与 `agent/turn-stopping`（DeepSeek Harness）执行闸门、Stop gate 持有停止直到计划报完成。
- **效果验证**：原文给出项目自测数据——基准 96.7% 断言通过（29/30）、3/3 盲测 A/B 获胜、磁盘计划把重新定位从 13.3 回合降到 5.0 回合、hook 单次触发优化后 289ms（此前 2.0–2.4 秒）、优化后每提示与每工具调用约 0.3s。这些可作为自建验证时的对照指标，但需要自行复现（见末节）。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：本项目的一等宿主，走插件 + SKILL.md + Hooks 路线，与 Claude Code plan mode 明确互补衔接。
- **OpenAI Codex（adopt）**：列为受支持宿主，走 Skills + Hooks；v3.16.1、v3.17.2 等版本专门修过 Codex 适配与清单迁移问题。
- **Cursor（watch）**：有独立 Cursor Setup，走 Skills + hooks.json；v3.20.8 起 Cursor hooks 迁到新 schema 并用 `sessionStart` 注入，阶段全完成后 stop hook 保持静默。
- **DeepSeek（try）/ DeepSeek Harness（watch）**：v3.20.0 起 DeepSeek Harness 成为一等宿主，原生 Cordis 插件 `dsh-planning-with-files` 支持每提示注入、compaction 后恢复、写入提醒、turn-stopping 闸门与 `pwf_*` 工具。
- **GitHub Copilot（drop）**：原文仍列 Copilot Setup 与 Hooks（含 `errorOccurred`），v3.11.1 修过其 error hook 的 POSIX 兼容问题——若清单里 Copilot 因「无实质协作接口」被 drop，此条提供了可复核的反证。
- **Hermes（watch）**：v3.13.0 起 Hermes Agent（CLI 与 Desktop）为一等宿主，原生插件支持 `.planning/<slug>/`、`PLAN_ID`、`PWF_PLAN_ROOT`、`pre_verify` 完成闸门。
- **Mastra（drop）**：列为受支持宿主，走 Skills + Hooks。
- **OpenClaw（watch）**：列为标准 Agent Skills 宿主，发现路径 `.openclaw/skills/`。
- **OpenCode（watch）**：v3.14.0 起为一等宿主，npm 插件 `opencode-planning-with-files`，含 `chat.message` 注入、compaction flush、`session.idle` 闸门与 `/pwf` 命令。
- **Agent skills（adopt）**：本项目正是 Agent Skills 标准的一个实例；`npx skills` 安装器单独就覆盖 71 个 agent，仓库内还带跨工具 `.agents/skills/planning-with-files/` 布局，支持 `git clone` 直用。
- **Context engineering（study）**：原文自述这是 Anthropic 所称 structured note-taking 的一种实现——把持久状态写到窗口之外，需要时再读回来；并明确与「agent memory 工具」（向量库、知识图谱）区分：后者解决检索回忆，本项目解决当前任务的执行状态连续性，二者互补。
- **skills.sh（try）/ Trendshift（watch）**：均作为徽章/安装来源出现在原文，属分发渠道，不构成本项目的方法论。

## 证据与局限

**原文给出的数据**：基准 96.7% 通过（29/30）、盲测 A/B 3/3 获胜、重新定位 13.3 → 5.0 回合、hook 单次触发 289ms（优化前 2.0–2.4 秒）、优化后约 0.3s/提示与工具调用、GitHub stars 27216、Trendshift 2026-01-06 全语言日榜第 1。

**只是作者主张的部分**：以上效果数字全部来自项目自述（指向 `docs/evals.md`，但该文件未在本次材料中给出，无法核对测试方法、样本量与对照设置）；「The planning skill your agent cannot ignore」「3 out of 3 blind A/B wins」等属宣传性表述；关于 Manus 被 Meta 以 20 亿美元收购、以及 Manus 那段 Markdown 工作记忆引述，均为原文引用，未经本次材料验证。原文大量篇幅是版本发布日志（v3.11.0–v3.21.0 的逐条修复），其中相当比例是路径、指针竞态、Windows/PowerShell 兼容等工程细节，不构成方法论证据，反而说明该方案在跨平台与并发场景上有持续维护负担。

**适用条件**：

- 需要宿主支持 hook/插件，或至少支持 Agent Skills 标准的发现路径；没有 hook 的宿主拿不到「每回合注入」这个关键机制。
- 完成门槛依赖英文状态标记（`grep -F` 匹配 `**Status:** complete`），本地化或改写标记会静默失效。
- 自动恢复只读项目文件，不读 agent transcript；跨项目记录被隔离，会话重放需要显式 CLI 模式。
- 计划文件默认 gitignore、不自动归档，任务结束会被下一个任务覆盖——需要人工把有价值内容提升为交付物。

**本次材料的局限**：提供的是仓库 README，且文本在 v3.11.0 那行发布日志处被截断，未能读到 benchmark 章节、命令参考与 docs/evals.md 的具体内容。因此所有性能数字与实现细节只能按原文转述，无法进一步核验；下文的最小试用方式正是为了补上这一步。

## 怎么试、怎么验证

**最小试用（建议半天内完成）**：

1. 选一个跨多会话的真实长任务（例如给现有仓库加一个需要改 5+ 文件、要跑测试的功能），在支持 hook 的宿主上执行第 2 步的安装命令。
2. 让智能体把任务拆成 phases 写入 `task_plan.md`，正常执行到一半，故意 `/clear`（或在另一台会话重开），记录「重新讲清背景 + 找回当前进度」所花的回合数。
3. 对照组：同一任务、同一宿主，不装 skill，同样中途 `/clear`，记录同样的回合数。
4. 再跑一次带 compaction 的场景，检查智能体是否能从 `task_plan.md` 的当前 phase 继续，而不是从头重做。

**判断有没有改善的指标**：

- 中断后重新定位所需回合数（原文自报基线 13.3 → 5.0，可作参照，但以自己实测为准）。
- 中断后是否从正确 phase 续做：统计「重做已完成步骤」与「遗漏未完成步骤」的次数。
- 人工干预次数：每个任务里你不得不重复说明目标/进度的次数。
- 完成门槛正确性：计划未完成时智能体是否被拦住；全部完成后是否不再误报（对照 v3.18.3、v3.20.8 的静默行为）。
- 每次 hook 注入的延迟：确认没有出现「UserPromptSubmit hook timed out after 10s」，与 289ms 的自报值比对，尤其留意 Git Bash on Windows 这类原文点名的慢路径。
- 成本与副作用：每轮注入带来的额外 token、写入后提醒是否造成噪声（原文已把提醒压到每回合一次并移除了 `Bash` 匹配器，可据此判断是否退回到旧行为）。

若以上指标没有稳定改善，或宿主缺少 hook、脚本在本地反复出问题，则降级为「只借三文件模式、不装 hook」的轻量用法。
