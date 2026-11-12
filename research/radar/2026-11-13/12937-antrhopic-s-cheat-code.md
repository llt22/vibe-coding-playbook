# @0xCodila: Antrhopic's cheat code:

- 结论：**值得一试**。把这条 prompt 当作模板，而不是逐字照抄的脚本：先到 Anthropic 官方 advisor / sub-agents / model-config 三页核对字段与当前可用模型名，把四个角色（构建、顾问、检查、检索）替换成你账号里真实存在的模型，再在一个非关键项目里按同一条 prompt 的流程装配一遍。理由是它给出了可直接复制的三件套（settings.json 字段、~/.claude/agents/*.md、CLAUDE.md 触发规则）和验收方式，但模型名与版本号无法从材料核实，且作者没有给出任何效果数据。
- 原文：https://x.com/0xCodila/status/2120316345279553693
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T19:11:56.829Z

## 是什么

一条可直接粘进 Claude Code 的完整配置 prompt，目标是把 Claude Code 从“单主模型 + 内置子代理”改成“用户级（user level，对每个项目都生效）的四模型分工团队”：

- 主会话：负责写代码、跑测试（构建者）
- advisor：只出主意、不写代码（决策顾问）
- checker 子代理：只测试和挑错、不编辑（审查者）
- Explore 子代理：检索与查文档，并顶替内置 Explore，同时作为其它子代理的默认模型

它的价值不只在“分工”，而在于把分工落到三个具体文件上：`~/.claude/settings.json`（模型与环境变量）、`~/.claude/agents/*.md`（子代理定义与工具白名单）、`~/.claude/CLAUDE.md`（何时调用谁的行为规则），并给出重启后的验收判据。执行方式是让 Claude Code 自己按这份 prompt 改配置（prompt 内含“先备份、先给我看 diff、我说 yes 才应用”的约束）。注意：这是用户级改动，会影响你所有项目。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：已安装 Claude Code 并能正常登录；准备好随时回滚（下面前两步就是为此）。

**第 0 步：先核对官方文档（不可跳过）**
原文自带“以文档为准”的硬约束，且它引用的模型名与版本号在本材料中无法核实，务必先读这三页，确认 `advisorModel`、`CLAUDE_CODE_SUBAGENT_MODEL`、agents 文件格式、子代理 `model`/`tools` 字段当前是否存在、模型标识符怎么写：

```
https://code.claude.com/docs/en/advisor
https://code.claude.com/docs/en/sub-agents
https://code.claude.com/docs/en/model-config
```

（原文里这两个 URL 被换行断成 `https://` + `code.claude.com/...` 和 `https: //code.claude.com/...`，粘用前需还原。）文档与下面任何内容冲突时，按文档改，并记录改了什么。

**第 1 步：备份所有将被修改的文件**

```
~/.claude/settings.json
~/.claude/CLAUDE.md
（以及 ~/.claude/agents/ 下已有的 checker.md / Explore.md，若存在）
```

原文要求：编辑前备份每个文件，所有改动合并成一个 diff 展示，得到确认后才应用；`settings.json` 只许合并、不许删除已有配置。

**第 2 步：检查版本**
原文称 advisor 所用模型需要 v2.1.321 或更高；低于此版本执行 `claude update` 或让对方提示你更新。实际版本门槛以第 0 步文档为准。

**第 3 步：改 `~/.claude/settings.json`（合并写入）**
按原文，要落实的是三件事：主模型设为 sonnet、顾问模型设为 fable（字段名 `advisorModel`）、环境变量 `CLAUDE_CODE_SUBAGENT_MODEL` 设为 haiku。并做一条诊断：如果发现你现有配置把主模型 effort 调到默认值以下，要提示你——原文的说法是“effort 更低时，主模型咨询顾问的次数会少得多”。

**第 4 步：创建 `~/.claude/agents/checker.md`**
模型设为 opus（按文档替换为实际标识符）；职责：跑测试、读 diff、试边界用例；**永不编辑代码**；每个真实问题都要报告文件名、行号或命令、以及实际观察到的现象。

**第 5 步：创建 `~/.claude/agents/Explore.md`**
字段 `name: Explore`、模型 haiku（按文档替换）、工具只给只读（不得有 Write、Edit）。原文给出的关键机制：用户级同名 `Explore` 子代理会顶替内置 Explore；否则内置 Explore 跑在主模型上、且忽略 `CLAUDE_CODE_SUBAGENT_MODEL`。职责：找文件、grep、读文档、返回简短结构化结果。

**第 6 步：往 `~/.claude/CLAUDE.md` 追加行为规则**（原文逐字，可直接放入）：

```
Consult the advisor before you commit to an approach, when the same error comes back twice, and before you say a task is done. Run the checker before you call any task done. Send search and docs lookup to Explore. If a subagent must write code, give it model sonnet, never haiku. For a small task that fits in this session, skip subagents and do it yourself.
```

要点：顾问在“定方案前 / 同一错误第二次出现 / 宣布完成前”触发；checker 在“宣布任何任务完成前”必跑；检索交给 Explore；需要写代码的子代理给 sonnet、绝不给 haiku；小任务不用子代理。

**第 7 步：advisor 的一次性授权**
某些套餐下，顾问模型需要一次性同意使用额度。若你的账号属于这种，原文要求停下来告知你：先 `/model fable` 接受一次，再 `/model sonnet` 切回。

**第 8 步：完整 prompt 原文（作为交给 Claude Code 执行的整段指令）**

```
Set up my Claude Code as a 4-model team, at user level so it works in every project:
- Sonnet 5.5 = main session. It builds: writes code, runs tests.
- Fable 5.2 = advisor, the brain. It only advises, never writes code.
- Opus 5.5 = checker subagent. It tests finished work and tries to break it, never edits.
- Haiku 5.5 = search and research. It replaces the built-in Explore agent and is the default for other subagents.

Before you change anything, read Anthropic's official docs:
https://code.claude.com/docs/en/advisor
https://code.claude.com/docs/en/sub-agents
https://code.claude.com/docs/en/model-config
Use only the settings, fields and file formats those pages describe. If something below doesn't match the docs, follow the docs and tell me what you changed.

Steps:
1. Check my Claude Code version. Fable 5.2 needs v2.1.321 or later. If it's older, run claude update, or tell me to.
2. In ~/.claude/settings.json: main model sonnet, advisorModel fable, env CLAUDE_CODE_SUBAGENT_MODEL haiku. Merge, never delete my settings. If my settings lower the main model's effort below its default, tell me: at lower effort the main model consults the advisor far less.
3. Create ~/.claude/agents/checker.md with model opus. It runs the tests, reads the diff and tries edge cases. It never edits code. It reports each real problem with the file, the line or command, and what it saw.
4. Create ~/.claude/agents/Explore.md with name Explore, model haiku and read-only tools (no Write, no Edit). A user subagent named Explore replaces the built-in one, which otherwise runs on my main model and ignores CLAUDE_CODE_SUBAGENT_MODEL. It finds files, greps, reads docs and returns short structured results.
5. Add to ~/.claude/CLAUDE.md:
"Consult the advisor before you commit to an approach, when the same error comes back twice, and before you say a task is done. Run the checker before you call any task done. Send search and docs lookup to Explore. If a subagent must write code, give it model sonnet, never haiku. For a small task that fits in this session, skip subagents and do it yourself."
6. Fable as advisor needs a one-time usage-credit consent on some plans. If mine needs it, stop and tell me: run /model fable once, accept, then switch back with /model sonnet.

Back up every file before you edit it. Show me all changes as one diff and apply them only after my yes.

Done means: after a restart, Claude Code starts on Sonnet, /advisor shows fable, and /agents lists checker (opus) and Explore (haiku).
End with three headings: Changed, Needs me, How to check it works. Under the last one tell me: an "Advising" line appears when Fable is consulted, Ctrl+O shows its advice, and /usage shows what it cost.
```

（原文模型名为 Sonnet 5.5 / Fable 5.2 / Opus 5.5 / Haiku 5.5，版本号 v2.1.321。这些标识在本次材料中无法核实，替换成文档里真实存在的模型名再执行。）

**第 9 步：重启并验收**
重启后应满足：Claude Code 以 Sonnet 启动；`/advisor` 显示 fable；`/agents` 列出 checker（opus）与 Explore（haiku）。运行时观察：顾问被调用时出现 `Advising` 行；`Ctrl+O` 能看到顾问的建议内容；`/usage` 能看到成本。

## 对应的研究问题

**能力发现**：把三件原本“自己顺手做掉”的事显式交出去——方案评审（advisor）、完工前的破坏性测试（checker）、文件定位与文档检索（Explore）。原文还给出了该交给谁的反例约束：需要写代码的子代理不能给最弱的模型，小任务不该拆给子代理——这是“什么不该分派”的边界，比“能分派什么”更少见。

**任务匹配**：给了一套按角色选模型的对照：构建用中档模型、顾问用更强模型、审查用另一个强模型（与构建者不同，避免同一模型自证正确）、检索用轻量模型。落到配置上是三个旋钮：主模型、`advisorModel`、`CLAUDE_CODE_SUBAGENT_MODEL`，外加单个子代理文件里的 `model` 覆盖。原文还指出一个耦合点：主模型 effort 调低会显著减少对顾问的咨询，即“分工配置”和“推理预算配置”互相影响。

**条件供给**：需要的供给很具体——写权限（settings.json、agents 目录、CLAUDE.md）、只读工具白名单（Explore 显式禁用 Write/Edit）、顾问的额度授权（一次性 consent）、以及版本前提。此外是行为供给：把“何时调用谁”写进 CLAUDE.md 而不是指望临场判断。

**主动推进**：有触发点设计，但只是“规则触发”不是“自动持续触发”：定方案前、同一错误第二次出现时、宣布完成前、宣布任务完成前跑 checker。这些依赖主模型自觉遵守 CLAUDE.md，没有外部钩子或状态机保证执行；原文的成功判据也只到“能观察到 Advising 行”，不校验触发是否真的按条件发生。

**效果验证**：给的是配置层与可观测层的判据：重启后默认模型、`/advisor`、`/agents` 三处状态；运行中的 `Advising` 行、`Ctrl+O` 展开顾问建议、`/usage` 看成本。这些能验证“装上了、被调用了、花了多少钱”，但不能验证“结果变好了”——后者原文没有指标。

## 与已有做法的关系

清单中相关条目：**Claude Code（tool，adopt）**。这条线索不是新工具，而是对 Claude Code 现有能力的配置化用法，改变三个默认行为：一是引入 advisor 作为“只说不做”的第二意见；二是用用户级同名 `Explore` 顶替内置 Explore（原文明确说内置 Explore 跑在主模型上且忽略 `CLAUDE_CODE_SUBAGENT_MODEL`，所以不覆盖就等于没配）；三是用 `CLAUDE_CODE_SUBAGENT_MODEL` 统一压低子代理成本，再用单个 agent 文件的 `model` 字段把 checker 抬回去。因此它适合作为 Claude Code 条目下的“多模型分工 + 完工前审查”配置样例。清单中没有其它相关条目。

## 证据与局限

证据只有一条推文正文（采集时保存），互动量 89 赞 / 4 转发 / 5 回复，属低热度个人分享；配有一张指向 Claude Code 官方 advisor 文档的链接卡片（“Escalate hard decisions with the advisor tool”），说明 advisor 功能本身有官方文档支撑。

属于作者主张、无数据支撑的部分：“cheat code”的定位、四模型分工一定更好、顾问能提升方案质量、checker 能更多抓出缺陷——原文没有给出任何基准、任务样本、缺陷检出率或成本对比。

无法核实、执行前必须替换的部分：模型名（Sonnet 5.5 / Fable 5.2 / Opus 5.5 / Haiku 5.5）与版本门槛（v2.1.321）。本次材料无法确认这些是真实模型还是占位写法；若照抄可能直接报错或被文档判定不符。

适用条件与风险：改动在用户级，会影响所有项目，回滚需先备份；`settings.json` 若用覆盖而非合并，会丢掉你已有的权限/环境配置；把子代理默认模型降到 haiku 会波及所有子代理，原文自己就加了“要写代码的子代理给 sonnet”的补救条款，说明这是已知风险点；顾问按次计费（原文提到 `/usage` 看成本、部分套餐需额度授权），高频触发的任务成本可能上升；CLAUDE.md 规则是软约束，模型可能不遵守；小任务上这套分工是净开销，原文也承认应跳过。

## 怎么试、怎么验证

最小试用（建议分两档，先小后大）：

1. 档 A（半天，风险最低，单项目）：只做第 4、6 步——在一个仓库里加 `checker.md`（只读、只报告、不改代码）+ 在项目级 CLAUDE.md 里加“宣布完成前跑 checker”一条。不动用户级 settings。
2. 档 B（一天，全量）：在档 A 有效后，再按第 1–9 步做用户级配置，或先只改 `~/.claude/settings.json` 的 `advisorModel` 与 `CLAUDE_CODE_SUBAGENT_MODEL`，观察一周。
3. 全程保留备份；应用前看一次性 diff；任何一步报“字段不存在/模型不存在”就按官方文档改，把改动记下来。

验证指标（先取一周基线再对比，同一类任务各取 5–10 个）：

- 返工率：同一任务被用户打回“不对/没做完”的次数；
- 重复错误：同一错误在会话里第二次出现的次数（这是原文自己的触发条件，可直接计数）；
- 完工前缺陷：checker 在“宣布完成”之前报出的真实问题数，以及其中被确认有效的比例（排除噪音报告）；
- 顾问命中率：`Advising` 出现后，建议是否改变了最终方案（人工记录“有用/无用”）；
- 成本与时长：`/usage` 的单任务花费、端到端耗时，与基线比；
- 装配正确性（一次性）：重启后默认模型、`/advisor` 输出、`/agents` 列表三项是否符合预期。

判定：返工率与重复错误下降、且 checker 有效报告数明显大于噪音、同时单任务成本涨幅可接受，才算“改善”；若只有成本上升而没有前两项改善，说明这套分工对该类任务不成立，退回只保留 checker 或只保留 advisor。
