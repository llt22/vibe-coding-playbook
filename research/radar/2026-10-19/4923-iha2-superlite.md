# iha2/superlite

- 结论：**值得一试**。可以在 Claude Code 中装上 superlite，先在一个 spec 清晰的中小型功能上采用“人工审批计划”模式跑一轮，同时用 metrics.jsonl 和测试通过率自行复核它的速度与质量，再决定是否推广。它把规划、并行分发、按任务难度路由到 Haiku、Sonnet、Opus 以及审查修复做成了一套可执行的插件流程；但 3.9 倍和 52% 的数据是作者用自建 harness 单次或少量运行自测得出的，鲁棒性探针还低于对照组，因此不宜直接当成定论采纳。
- 原文：https://github.com/iha2/superlite
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T10:30:05.839Z

## 是什么

superlite 是 Claude Code 的一个插件（也提供 Cursor、Codex、Gemini CLI 等多个 harness 的安装方式），用来实现“把 spec 交给 agent，回来时拿到已完成、已测试的代码”的自主构建工作流。它的核心流程是：先用 `brainstorming` 一次性问清需求，再由 `writing-plans` 写成含任务图、接口、示例和上下文预估的计划，然后按任务图并行分发给实现 agent，最后做包级审查加一次全新的最终审查。作者明确说明它的插件布局、session-start hook 和生命周期 skills 都借鉴自 superpowers，但定位不同：superpowers 强调人贴近每一步，superlite 强调无人驾驶与速度，二者技能名冲突，不能在同一会话同时启用。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：已安装 Claude Code、git、Python 3.10 或更高版本、`bash`（Windows 上为 Git Bash）；`uv` 可选。被构建的项目可以是任何语言，superlite 自身工具是 Python。

1. **安装插件（Claude Code）**：

```
/plugin marketplace add iha2/superlite
/plugin install superlite@superlite-dev
```

本地 checkout 单会话加载：

```
claude --plugin-dir <path-to-superlite>
```

2. **验证安装是否生效**：开一个全新会话，发一句：

```
Let's make a react todo list
```

判断标准：工作正常时，会在写任何代码之前先触发 `brainstorming`。其他 harness 同理，统一以“是否先触发 brainstorming”作为安装自检。

3. **选择编排模式**：被问到编排模式时，需要二选一。
   - 人工编排（谨慎采用）：你说 “Build X. I will approve the plan”。它会先产出 `.review.md`（约两页、带图、附粗略时间与成本），在你回 approve 之前不做任何 lint、分发或写文件；你批准后，协调者才把它改写成 agent 格式（任务图、接口、示例、规模）并执行。
   - AI 编排（无人驾驶）：你说 “Build X. I am away, decide yourself”。计划、lint、分发全都自动，需要决策的事项记录为 rulings 而不会打断你询问。

4. **描述任务并让它跑完**：一段话或一个 spec 文件即可。典型请求范式（原文示例）：
   - 新项目 MVP：`Build me a static site generator from this spec`
   - 既有代码加功能：`Add CSV export with column widths to the existing app`（会做新代码与旧代码之间的接缝检查；大代码库上会**先询问**是否安装 Graphify，未经你同意不装）
   - 调试：`This test fails on leap days: find the root cause and fix it`（先由 `systematic-debugging` 定位根因，修复交给 fix-only agent 按层级分派，每个留记录，两轮失败后升级）
   - 小改动：`Rename build to render everywhere`（小活留在主线程内联，但仍配 reviewer）
   - 收尾合并：`We are done: finish the branch`（先验证，再给 merge 或 PR 选项，永不在你未确认时 push）

5. **盯运行痕迹**：项目下的 `.superlite/` 目录里，`progress.md` 含 rulings 与日志，`test-summary.json` 是最新测试结果，`metrics.jsonl` 与运行历史记录每个 agent 的耗时与成本。这是判断“跑得好不好”的第一手材料。

6. **按需调计划粒度**：`writing-plans` 会在计划头部写 `**Detail:** contracts | tests | full`，单个任务可覆盖。`contracts` 只给文件、签名、具名测试与精确值；`tests`（默认）额外给出逐字测试代码，实现留给 implementer；`full` 连实现代码一起给，用于刁钻算法。无人值守时由 `brainstorming` 自己选默认。

7. **理解上下文预算切分规则**（决定并行与拆合）：计划中每个任务带一行 `Est. context`，依据它写多少行、读多少行、拿到哪些文档，再加上 implementer 固定约 18k 前缀来预测；预测超过 80k 的任务被拆分，可变部分小于前缀的任务与邻居合并；任何任务预计不超过约 3 分钟；没有固定波次大小，并行宽度由任务图决定（最多 18 个 agent）；整份计划控制在 15k 字符以内，因为它同时充当共享上下文。作者提醒系数只在一个项目上拟合过，只能当参考。

8. **配置实现者缓存**：implementer 的 frontmatter 设了 1 小时 prompt cache TTL，让几波之后的修复轮仍能命中历史；等价做法是设环境变量：

```
CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h
```

9. **审查链路**：协调者以 medium effort 运行；最终审查是一个全新的 Opus `final-reviewer` 以 high effort 跑单轮，只报发现不改代码，读由日志拼成的 review packet，目标 30 秒内完成。因为它不是 fork，所以不需要 `CLAUDE_CODE_FORK_SUBAGENT`。

10. **不要与 superpowers 同时启用**：二者共享 skill 名且都注入会话上下文，会冲突。

11. **非 Claude Code 环境的安装**（原文给出的命令，注意其中 Codex 与 Grok 作者自标 Unverified）：

```bash
# Antigravity
agy plugin install https://github.com/iha2/superlite

# Codex（未验证）
codex plugin marketplace add iha2/superlite
# 并在 ~/.codex/config.toml 加 [features] multi_agent = true

# Factory Droid
droid plugin marketplace add https://github.com/iha2/superlite
droid plugin install superlite@superlite-dev

# Gemini CLI
gemini extensions install https://github.com/iha2/superlite

# GitHub Copilot CLI
copilot plugin marketplace add iha2/superlite
copilot plugin install superlite@superlite-dev

# Grok（未验证）
grok plugin marketplace add iha2/superlite
grok plugin install superlite@superlite-dev --trust

# Qwen Code
qwen extensions install iha2/superlite

# Hermes
hermes plugins install iha2/superlite --enable

# Pi
pi install git:github.com/iha2/superlite
```

Cursor 在 Agent 聊天里 `/add-plugin superlite` 或市场搜索；OpenCode 走 `Fetch and follow instructions from https://raw.githubusercontent.com/iha2/superlite/refs/heads/main/.opencode/INSTALL.md`；Kimi Code 用 `/plugins install https://github.com/iha2/superlite` 后 `/new`。每个 harness 需单独安装，都在 `skills/using-superlite/references/` 下有工具映射文件。

12. **复现或自建对比评测**：仓库自带 head-to-head harness，两个插件在 Opus 上 headless 跑同一 9 模块项目（`bench/task/SPEC.md`），用隐藏的 89 测试打分：

```bash
uv run --no-project python bench/harness.py run <arm> <rep> [--smoke]
uv run --no-project python bench/harness.py score <arm> <rep>
uv run --no-project python bench/harness.py rescore-tasks <arm> <rep>
uv run --no-project python bench/harness.py report
```

arm 取 `superpowers` 或 `superlite`；环境变量 `SUPERLITE_PLUGIN_DIR` 可把 superlite 臂指向别的插件目录（例如旧 commit 的 worktree 当冻结基线），`BENCH_PROMPT_SUFFIX` 追加提示词，`BENCH_TASK` 从 `bench/tasks/` 选任务。辅助分析脚本：

```bash
python bench/report_mechanical.py bench/results/*.json
python bench/report_mechanical.py --history ~/.superlite/history.jsonl [--focus opus,haiku] [--baseline sonnet]
python bench/mechanical_ab.py RUN_DIR [--tasks T8,T5] [--n 3] [--cost-cap 2.0]
python bench/routing_evidence.py [--write]
python bench/build_shape_audit.py [--runs DIR] [--write]
python bench/predict_calibration.py [--write]
```

`mechanical_ab` 把 `Kind: mechanical` 的任务在 Haiku 与 Sonnet implementer 上各跑一遍，这是验证“模型路由是否划算”最直接的实验入口。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 能做哪些还没想到交给它的工作）**
- 从一句话/spec 交付“已完成且测试通过的整个构建”，而不是只让 AI 写片段。
- 调试：先系统性找根因再分派修复，两轮失败自动升级，而不是让 AI 反复试错。
- 分支收尾：先验证，再给 merge/PR 选项，且不擅自 push。
- 审查并修复：package reviewer 修自己发现的问题，final reviewer 只报不改，形成“发现与修改分离”的分工。
- 无人值守长跑：把需要拍板的事项写成 rulings 而非提问，这在“人不在场”的场景里是可迁移的做法。

**2. 任务匹配（什么工作适合怎样的模型、工具、协作方式）**
- 模型分层有明确规则：机械性工作走 Haiku（`implementer-haiku`），实现走 Sonnet，最终审查用全新 Opus high effort 单轮报发现。
- 计划粒度分三档（contracts/tests/full），按任务难度选，刁钻算法才给实现代码。
- 任务规模有量化判据：`Est. context` > 80k 拆分，可变部分小于固定前缀则合并，单任务预计不超过约 3 分钟，并行宽度由任务图而非固定波次决定。
- 提供了验证路由是否值得的实验工具（`mechanical_ab`、`routing_evidence`），把“该用哪个模型”变成可测量的选择。

**3. 条件供给（需要哪些信息、工具、权限和反馈）**
- 输入：一段话或 spec 文件；`brainstorming` 一次性批量提问而非反复追问。
- 环境：Claude Code、git、Python 3.10+、bash；uv 可选。
- 权限：人工编排模式下，approve 之前不 lint、不分发、不写文件；装 Graphify 必须经你同意；push 必须经你确认。
- 反馈回路：`.superlite/progress.md`（rulings 与日志）、`test-summary.json`、`metrics.jsonl`、运行历史，加上实现者 1 小时 prompt cache TTL 让后续修复轮复用上下文。

**4. 主动推进（可由时间、事件或状态触发并持续完成）**
- AI 编排模式可全程不打断地计划、lint、分发并裁决开放问题。
- 每个集成在会话开始时由 session-start hook 注入 `using-superlite`，即“会话开始”这一事件自动激活工作流；Pi 还会在 compaction 后重新注入。
- 波次由任务图依赖关系驱动，修复轮按失败轮数（两轮）触发升级。

**5. 效果验证（怎么判断确实改善了结果）**
- 双重计分：隐藏测试通过数与 wall-clock/成本同时看。177/177 与 89/89 打平的前提下比时间，避免“变快是因为做少了”。
- 除均值还报离散度（3 次运行最快到最慢差 9.1 分钟 vs 26.4 分钟）。
- 除速度还报鲁棒性探针（4/7 对约 5.7/7）和成本（$3.28 对 $8.15），把“更快”的代价显式化。
- 有可复现的 harness 与打分命令，以及 `predict_calibration` 专门检查时间预测为何失准。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（清单状态 adopt）**：superlite 就是 Claude Code 插件，通过 `/plugin marketplace add` 安装，属于在该工具上叠加的一层工作流。
- **obra/superpowers（study）**：直接相关。原文明确 superlite 不是 superpowers 的竞品，而是沿用其插件布局、session-start hook、生命周期 skills 的思路，并把目标从“人盯每一步的协作”改为“自主高速开发”。二者技能名冲突，同一次会话只能二选一。基准测试也是以 superpowers 为对照组。
- **Cursor（watch）**：给出 `/add-plugin superlite` 或市场搜索、或用 `.cursor-plugin/plugin.json` 本地加载的路径。
- **GitHub Copilot（drop）**：原文给出 `copilot plugin marketplace add` 与 `copilot plugin install superlite@superlite-dev` 的安装命令，与清单中“drop”的判断存在张力；若清单的 drop 是基于效果而非可用性，可把这条作为重新评估的线索，但本材料未提供 Copilot 环境下的任何实测。
- **Graphify（watch）**：作为大型代码库的可选依赖出现，只在既有代码库场景下**征求同意后**安装，用于接缝检查；原文未给出其独立用法。
- **Hermes（watch）**：`hermes plugins install iha2/superlite --enable`，但明确其无 post-compaction hook，超长会话压缩后会丢失引导，需开新会话。
- **OpenCode（watch）**：通过 `.opencode/INSTALL.md` 指引安装，需要单独装一份。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**给出的数据**
- 同机同任务（`sitegen` + `minisheet`，177 个隐藏测试，Opus headless）：superlite 16.1 分钟，superpowers 原版 33.6 分钟（3 次：21.2/31.9/47.6）、编排版 23.5 分钟（3 次）；177/177 对 177/177。
- 最早 9 模块基准（各 1 次）：34.4 分钟 vs 8.8 分钟（3.9×），成本 $8.15 vs $3.28。
- TypeScript 站点生成器：spec 到 132/132 隐藏测试，8.5 分钟。
- 离散度：3 次运行最快到最慢差 9.1 分钟 vs 26.4 分钟。

**作者自己承认的局限（原文脚注）**
- 16.1 分钟只是当前版本**一次**运行；superpowers 的数字、离散度那一行（各 3 次、早期 superlite 构建）、9 模块那一行（第一版、各 1 次）都来自更早的运行，因此“应视为指示而非统计证明”。
- superlite **可能比 superpowers 更贵**，且鲁棒性探针得分更低（7 项中 4 项 对 约 5.7 项）。
- 早期版本的成本数字曾因计分 bug 高估，报告中有更正说明。
- 上下文预算的系数只在一个项目上拟合，只能当参考。
- Codex 与 Grok 的安装命令标注为 Unverified（未加入官方市场，未测试）。

**需要额外打折扣的地方（本报告判断）**
- 基准 harness 由 superlite 作者自己编写并用于评测自己，存在利益冲突；对照组版本（superpowers 6.4.1）与评测任务集均由作者选定。
- 评测任务集中在“从 spec 生成中小型项目”（Python 站点生成器、电子表格引擎、TS 工具），对大型遗留系统、需要频繁人工决策的模糊需求、非代码产出类工作的外推性未验证。
- 78 stars 的小型项目，多 harness 集成面铺得很宽，其中若干未验证，稳定性风险不可忽略。

**适用条件**
需求可由 spec 表达、能以测试判定成败、规模在中小的从零构建或既有代码加功能；能接受一定额外成本换取时间；愿意用人工编排模式先设一道审批门。反之，若项目缺少可自动判定的测试，或每步都需要人判断取舍，则“速度”优势无法安全兑现。

## 怎么试、怎么验证

**最小试用（半天内可完成）**
1. 选一个**有测试套件**的中小仓库，切一个功能分支，挑一个中等复杂度的需求（不是一行改动，也不是重构全库），写成一页 spec 存盘。
2. 安装插件并自检（见步骤 1–2），确认先触发 `brainstorming`。
3. 以**人工编排**模式跑：“Build X from spec.md. I will approve the plan”，记录 `.review.md` 里它给的时间与成本预估，approve 后计时到分支完成。
4. 对照组：同一 spec 在你现有工作流（手写或原有 agent 用法）下做一次，或用 `superslite` 之外的现有流程的历史同类任务做参照。
5. 如要复现作者结论，直接跑 harness 的 smoke 与一次完整 run：

```bash
uv run --no-project python bench/harness.py run superlite 1 --smoke
uv run --no-project python bench/harness.py run superlite 1
uv run --no-project python bench/harness.py score superlite 1
```

至少 3 次重复，并同时跑 `superpowers` 臂作为对照，看均值与离散度而不是单次最好成绩。

**判断是否改善的指标（按优先级）**
- 硬闸门：项目测试与隐藏测试通过率**不低于**基线（原文也是以 177/177、89/89 打平为前提再比速度）。任何通过率下降都直接判负。
- 时间：从 approve 到分支可交付的 wall-clock，取 3 次中位数，目标 ≤ 基线的一半才谈得上“明显改善”。
- 成本：`.superlite/metrics.jsonl` 与运行历史里每 agent 的耗时与花费，与基线对比；作者自己承认可能更贵，所以必须单独看这一项。
- 返工：修复轮数、两轮失败升级的次数、final reviewer 报出的发现条数与严重度分层。
- 质量探针：除现有测试外，另准备 5–7 条**未告知 agent** 的鲁棒性检查（边界输入、异常路径、错误处理），这正是原作者承认落后的一项（4/7 vs 5.7/7），必须自己测。
- 事后：合并后 2 周内的回归缺陷数与返工工时。

**放弃条件**：通过率下降、成本涨幅超过时间收益、或 robust 探针明显低于基线，则降级为 study（只借鉴其任务图切分、模型分层、审批门与 metrics 记录方式，不继续用该插件）。
