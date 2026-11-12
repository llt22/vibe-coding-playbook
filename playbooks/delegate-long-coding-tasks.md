# 让编码 agent 从任务定义到合并都留下可核查的证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：任务没定义清楚、长任务跑偏、完成靠自报、大代码库无法整体理解时，把任务缩小、澄清需求、隔离执行并让人能核查。
> 先试这一步：先选一个真实任务，把「完成」写成可核查的验收标准；大代码库场景先拆 3–5 张工单，让不参与编写的同事只看工单判断能否核查。
> 最近修订：2026-11-13

## 解决什么问题

开工前任务没成型、需求没想清，直接让 agent 写代码容易「页面出来了才发现理解错」。长任务需要一次交底、明确完成线、停走规则、清单、子代理和合并前审查；需要人持续验收时，还要把编码、独立验证、审查、集成拆开，完成判定绑定 SHA，失败回滚。仓库积压多时，要先判断每条能放手到哪一级；有现成交互或动画可参考时，要把全局规范、本地参考实现和精确落点写进提示词。大代码库场景还有一条独立路径：不要指望 agent 理解整个系统，而是把任务缩到一张可核查工单、每张工单一个用完即弃的沙箱、上下文只给依赖图和本工单相关切片，最后人审 PR。

本文给一套开工规程：0-D 先升维任务；0-A/0-C/0-B 先澄清或设批准闸门；F 下发移植类任务；A 自主长任务；B 成对编程；C 有人验收的状态机；E 积压任务自主度分级；G 大代码库按工单缩小、隔离、检索。各做法的收益多数是作者主张，先小范围试。

## 适用与不适用

适用：

- 任务未成型、边界窄，想先看能不能做得更大：用做法 0-D。仅 Claude Code。
- 需求模糊、怕做错：用做法 0-A（原文指定 Codex 6.1）或做法 0-C（模型无关，能落成需求文档）。
- 在 Claude Code 里想用流程挡住「没批准就写码」：用做法 0-B。
- 移植现成交互或动画，目标项目有 mod 或插件扩展点、能读本地参考源码：用做法 F。
- 长、多步骤、有明确完成线：用做法 A。
- 有验收人、需要独立验证、SHA 门禁、集成回滚：用做法 C。
- 仓库有一批较清晰 issue 或 TODO，有可跑测试、能分支回滚，想无人值守批量推进：用做法 E，第一轮只分级。
- 大代码库、单个 agent 无法理解全貌，但 epic 能拆成带可核查验收标准的工单，环境可复制成干净沙箱，有依赖图，有人审 PR：用做法 G。第一轮 1 个 epic 拆 3–5 张工单。
- 只想判断交出去能放手到哪一步：用做法 E 的只分级模式。
- 大库审计、迁移、跨服务评审可拆子代理：用做法 A；做法 C 也可按服务或文件拆任务。
- 信息在图表、截图里：在 Claude 应用里附图片问具体问题。
- 要成品文件而不是大纲：在 Claude 应用里直接要表格或文档。

不适用或需谨慎：

- 任务已界定清楚、边界窄的机械任务，做法 0-D 未必有升维空间。
- 做法 0-D 仅 Claude Code，需写 `~/.claude/skills/`；本次只有 README，`SKILL.md` 正文不可见，收益是作者主张。
- 需求已明确的小改动，先澄清可能白增轮次；做法 0-C 需要你愿意逐轮回答，追问质量依赖模型，原文未指定模型和文档模板。
- 做法 0-A 原文只保留 6 条技巧第 1 条，无效果数据。
- 做法 0-B 主要适用 Claude Code，删掉 TDD、子代理、逐任务审查；高风险库要补做法 A 的第 6、8 步。仓库仅 31 stars，未审代码。
- 做法 C 不是无人监督自动编程，需要人验收；没有可独立运行验证命令会停在 `needs-review`；强依赖 Claude Code、Codex CLI、bash、git、python3 或 jq；README 未提 Windows，行为随 Codex CLI 版本变化。
- 做法 E 只有 agent 自评等级，没有独立验证、SHA 绑定、回滚；原文在 L1 截断，等级表是调研自拟；涉及外部权限、密钥、需求歧义不该自动执行；没有测试或版本控制只停在只分级。
- 做法 F 需要能读本机文件、参考仓库可克隆、目标项目有扩展点；原文路径是作者本机，必须替换；只有一条提示词，作者说效果看模型需微调。
- 做法 G 只给流程骨架，没有工具、命令、提示词、沙箱类型、依赖图工具、上下文切片方式、PR 审查深度；工单不能核查就不适用；没有可复制预配置环境、没有依赖映射、没有评审人力不要用；十张并行只是作者断言，受环境和评审吞吐限制；G 不能替代 C 的独立验证和 SHA 门禁。
- 长链分析类项目不要加「已答过的问题视为定稿」；需要逐步参与用做法 B，不用做法 A 的停走规则。各做法按 try 用，不要按 adopt 全面铺开。

## 前置条件

- 做法 0-D：Claude Code 可运行，有写 `~/.claude/skills/` 权限，手上有待改写任务，愿意在 brief 后给出选或不选。本次只有 README，`SKILL.md` 与 `references/essay-notes.md` 正文不可见。
- 做法 0-A：使用 Codex 6.1；有一个产品或功能想法但需求没想清；愿意先多一轮澄清。原文未说明文件或权限要求。
- 做法 0-C：支持多轮对话的模型（原文未指定）；一句产品或功能描述；你逐轮回答用户、场景、边界、验收标准。原文第 2 条起截断，未规定文档模板。
- 做法 0-B：Claude Code；若已在用 Superpowers，先禁用或卸载；可选视觉伴侣需 Node.js；仓库仅 31 stars，未审代码实现。
- 做法 F：智能体能读本机文件并执行命令；有一份全局规范文件（原文是 `~/.config/herdr-app/AGENTS.md`，内容未给，需要自己写）；参考实现能克隆到本地；目标项目有 mod 或插件扩展点；提示词里的占位符和作者本机路径要替换。
- 做法 A、B：Claude Code；项目根目录有或可新建 CLAUDE.md；你自己清楚验收标准；破坏性命令权限提示保持开启；fast mode 是研究预览功能，需要额外用量，每 token 成本更高。
- 做法 C：Claude Code、Codex CLI、git ≥ 2.31、bash、python3 或 jq；仓库内有 `AGENTS.md`、`CLAUDE.md`、`TASKS.md`、`DECISIONS.md`、共用规则、任务说明模板、报告 JSON Schema；设置 `AGENT_VERIFY_CMD`、`AGENT_SHIP_CMD`；按项目配网络权限、可写目录、超时、熔断、预算、并发。README 建议 macOS 或 Linux，未提 Windows。
- 做法 E：git 仓库里有可枚举 open issue 或 TODO；在仓库根目录用 Claude Code 或 Codex；工作区干净、能开分支、能回滚（后三条是调研补充）；原文在 L1 截断，L2 及以上需自补。
- 做法 G：一个 epic 或较大需求；有人能写并判断可核查验收标准；项目环境可预配置并复制成一次性沙箱；有依赖图或代码地图；有 PR 评审人力；原文未给工具、命令、指标，需自行选型；试用规模 1 个 epic 拆 3–5 张工单（调研建议）。
- Claude 应用：先确认模型选择器显示 Opus 5.5；图片信息用附件；fast mode 前提同上。

## 操作步骤

先选做法：

- 做法 0-D：任务没成型，先升维再派发；只读 brief，不执行；仅 Claude Code。
- 做法 0：需求没想清，先澄清。0-A 是一条提示词，原文指定 Codex 6.1；0-C 模型无关并落成需求文档；0-B 是 Claude Code 批准闸门。
- 做法 F：有本地参考实现、目标有扩展点，用全局规范、参考源码、精确落点下发。
- 做法 A：自主长任务，默认先试。
- 做法 B：你每一步都参与，反向配置 CLAUDE.md。
- 做法 C：有人验收、任务可拆成可验证小任务、仓库有独立测试命令，用状态机、独立验证、SHA 门禁。
- 做法 E：仓库积压多，先只分级，再按等级放手。
- 做法 G：大代码库，先把 epic 拆成可核查工单，每单独立沙箱，按依赖取上下文，最后人审 PR。

分工与顺序：0-D 管任务该是什么；0 管需求澄清；F 管下发写法；A、C 管执行；E 管授权边界；G 管大库任务、环境、上下文三重缩小。可以串起来：先 0-D 升维，再用 0-A 或 0-C 澄清，然后进 A 或 C；移植类任务在 0-D 或 0 之后用 F 下发，再进 A；E 的分级结果可写进 C 的任务说明或 A 的交底；G 的工单可交给 A 或 C 执行，但 G 的沙箱隔离和依赖切片是额外约束，原文未讨论组合，需自行验证。C 靠外部脚本把完成判定、验证、审查、集成从 agent 自报里拆出来；E 只有自评分级，不能替代 C 的门禁；G 最后人审 PR，也不替代 C 的 SHA 门禁。

### 做法 0-D：动手前先把任务升维，再由你选择（ambition skill）

它把任务重写成「更有野心」的版本，依据 altitude（高度）、depth（深度）、range（范围）。关键交互：只先展示简短 brief，然后等你选择，确认前不做实际工作。

1. 安装：

```bash
git clone https://github.com/wanderingspirit03/ambition-skill ~/.claude/skills/ambition
```

2. 在会话里触发：

```text
/ambition
```

或直接说：

```text
make this more ambitious
```

预期：先给出改写后的 brief，不是开始干活。

3. 只读 brief，先不执行。你看到的是任务该怎么做的重新表述，不是代码或执行结果。

4. 由你选择采用还是不采用。不采用按原任务走；采用就作为后续派发的输入。

5. 想看方法依据或示例，读 `references/essay-notes.md`；想改行为，编辑 `SKILL.md`。本次材料没有这两个文件的正文，无法核实具体写法。

成本与证据：一行 clone、一个斜杠命令，成本极低；仓库 49 stars，只有 README，没有效果数据或案例。「升维后更好」「先出 brief 再确认能避免跑偏」只是作者主张。

和 0-A、0-C 的差异：0-D 改的是任务该是什么，作用在任务定义与委派；0-A、0-C 改的是需求里的用户、场景、边界、验收标准，作用在需求澄清。可以连用：先 0-D 升维，再用 0-A 或 0-C 把需求问清，然后进 A 或 C。

### 做法 0-A：写代码前先让模型澄清需求（Codex 6.1）

1. 先不要要求写代码，发送澄清提示词：

```text
先问清楚目标用户、使用场景和验收标准。指出需求里的矛盾，整理方案后再实现。
```

预期：它先反问，而不是直接产出页面或代码。

2. 按反问补齐目标用户、使用场景和验收标准。

3. 读它指出的需求矛盾和整理出的方案，先确认或修正。

4. 方案确认后，再让它进入实现。

局限：原文只给了这一条提示词，没有给后续操作、配置或其余 5 条技巧；上面第 2–4 步是按提示词语义推导的最小流程。

### 做法 0-C：用苏格拉底式追问把需求问清楚（模型无关）

与原 0-A 的差异：0-C 要求逐步追问、把边界也列为靶子、最后整理成需求文档；0-A 额外要求指出需求矛盾并给方案。要模型先挑矛盾、给方案，用 0-A；要一份逐轮问出来、能交给下一个会话的需求文档，用 0-C。也可以两条都发，先追问后让它指出矛盾。

1. 准备一句话描述，例如「一个给团队内部用的周报汇总工具」。

2. 原样输入下面的提示词，把【产品或功能】替换成你的描述：

```text
我要做【产品或功能】。先别写代码，像苏格拉底一样逐步追问，帮我明确用户、场景、边界和验收标准。需求明确后，再整理成文档。
```

预期：它先反问，不直接写代码。

3. 进入追问，按提问逐轮回答。不要第一条消息就把所有背景倒完；它一次问太多，就要求它一次只问一个问题。

4. 盯住四个靶子：用户、场景、边界、验收标准。没问到就主动补一句。

5. 四类信息基本清楚后，明确指令它整理成文档。

6. 把文档作为后续写代码、生成方案或用其他 AI 工具的输入，然后进入做法 A、B 或 C。

0-A、0-C、0-B、0-D 怎么选：任务没定义清楚先用 0-D；用 Codex 6.1 并想顺带指出矛盾给方案用 0-A；用别的模型、想要成文需求文档或想把边界问全用 0-C；已在 Claude Code 并想让流程挡住没批准就写码用 0-B。四条都先在一个真实任务上试，不要一次铺开。

### 做法 0-B：在 Claude Code 里装一道批准闸门（superbrainstorming）

流程：你提出需求 → 智能体先提问并给出设计 → 你批准？未批准回去改设计；批准后它在同一个会话里开始构建。作者立论是：编码智能体会把错误的东西建得很好。

1. 如果已在用 Superpowers，先通过 `/plugin` 禁用它或卸载它，避免两个 `brainstorming` skill 和 session-start hook 冲突。

2. 安装：

```bash
/plugin marketplace add harrymunro/superbrainstorming
/plugin install superbrainstorming@superbrainstorming
```

然后新开一个会话。

3. 冒烟验证，在全新会话发送：

```text
Let's make a react todo list
```

预期：加载 `superbrainstorming:brainstorming` skill、声明按 architectural 工作处理、写代码前先问这个应用是做什么用的。没有这些行为说明 hook 或 skill 没生效。

4. 确认三选一路径，你有否决权：Spike 用于「这事可行吗」，产出可丢弃；Bounded 用于小范围清晰改动，对话里给简短设计；Architectural 用于新项目、新子系统、大改动，一次问一个问题，给两三个方案，spec 写到 `docs/specs/`。智能体会告诉你选了哪条，你可以推翻。

5. 批准前要求它复述三件事：想达成什么、给谁用、done 长什么样，并让你纠正。这是最便宜的纠错点。

6. 只有你批准后才动工。批准后它立刻在同一会话里开始，自己做步骤跟踪，遵循项目测试和提交约定，宣布完成前自检。

7. 中途发现问题时，它应该停下来问你，而不是悄悄改道。没停就是流程失效信号。

8. 想跳过设计就直接说，直接构建是被支持的逃生口。

9. 换其他智能体：skill 是 `skills/brainstorming/` 下的标准 `SKILL.md`，支持 Agent Skills 的智能体都能加载；没有 session-start hook 时需要按名字显式要求它。

10. 可选视觉伴侣：对布局、mockup、示意图，可在浏览器开标签页展示选项；opt-in、需要 Node.js、本机运行、不从互联网加载；生成物在 `.superbrainstorming/`，记得加进 `.gitignore`。

11. 改插件本身时跑测试：

```bash
cd tests/brainstorm-server && npm ci && npm test
bash tests/hooks/test-session-start.sh
```

改动 `skills/brainstorming/SKILL.md` 或 `hooks/bootstrap.md` 会改变智能体行为，合并前要在真实会话里试过。

0-B 与上游 Superpowers 怎么选：Claude Code、当前前沿模型、只想要一次快速设计确认，用 0-B；用较小或较旧模型，或需要强制 TDD、逐任务代码审查、git worktree 管理，用上游 Superpowers。0-B 删掉了 writing-plans、executing-plans、subagent-driven-development、test-driven-development、systematic-debugging、verification-before-completion、代码评审类、git worktree 类等技能。「当前模型能把设计保持在上下文里并自己走完，所以删掉 TDD、子代理、逐任务审查是安全的」只是本 fork 存在的理由，没有对照数据。按 try 对待。

### 做法 F：用「全局规范 + 本地参考实现 + 精确落点」下发移植类任务

本质是任务下发写法：规范先行、给可读的参考实现、把交付物钉到具体位置和交互，用「照抄现成实现」替代「用文字描述想要的效果」。

1. 准备全局规范文件。原文使用 `~/.config/herdr-app/AGENTS.md`，内容未给出，只能确定它是动手前必须先读的约定文件（项目结构、代码风格、禁忌等）。你需要自己写一份，哪怕只有 10 行。

2. 把参考实现拉到本地。原文用占位符 `{本地 git 仓库地址}`，关键是给本地路径而不是截图或在线链接，智能体才能直接读源码。

3. 下发提示词，替换花括号部分：

```text
读 ~/.config/herdr-app/AGENTS.md，然后再读 magpie 的本地源码 {本地 git 仓库地址}，照抄 Routing 界面的动画，实现实时展示路由的 herdr mod，在 Files 和 Changes 按钮右边放一个 Routing 按钮用来开关
```

4. 确认四个要素齐备：读哪份规范、读哪份参考实现、抄什么（指名到具体界面元素）、交付到什么位置和怎么用。

5. 按模型微调措辞。作者明确说实现效果看模型可能需要微调，这不是跨模型通用的定稿。

6. 人工验收：运行目标项目，检查按钮是否在指定位置、开关是否生效、动画与参考界面是否一致、路由是否实时刷新。原文没有自动化验收方式。

7. 可选对照：同一任务分两组，A 组给本地参考源码，B 组只用文字描述同一效果。记录一次通过率、人工返工量、保真度、是否遵循 AGENTS.md。若 A 组明显更好，保留模板；若差异不大，收益可能主要来自 AGENTS.md，应拆分评估。

### 做法 A：让长任务自主跑（Opus 5.5）

1. 一次性交底整个任务，并写明完成长什么样：

```text
Migrate the payment endpoints from the old client to the new one.
Done means: every endpoint uses the new client, the old client is deleted, and the test suite passes.
Stop and ask me only if a test fails for a reason you can't explain.
```

2. 删掉「think carefully」「think step by step」这类话，包括提示词和已保存指令。要快速回答简单问题直接写 `Answer directly.`；在 Claude Code 里调整思考量改 effort 设置，不要写 think hard。

3. 任务跑到一半想起补充要求，直接打字追加，不用重启。例如：

```text
Also keep the old endpoint names as aliases.
```

4. 在 CLAUDE.md 里写清楚什么时候停、什么时候继续：

```text
When a step doesn't need my input, keep going. Put status notes in the same message as your next action.
Stop and ask only when you can't continue without me, or before anything destructive: deleting data, force-pushing, or changing anything outside this repository.
```

破坏性命令的权限提示保持开启。

5. 把任务清单放进文件：

```text
Keep a checklist in TASKS.md. Tick each item when it's done, and add anything new you find.
```

长任务会填满上下文窗口，Claude Code 会摘要较早回合；读 TASKS.md，不要读滚动回放。

6. 大范围工作拆给子代理，并逐个核对证据：

```text
Audit every service in services/ for the retry bug in the linked issue.
Give each service to its own subagent. When a subagent reports back, check its evidence before you accept it.
Finish with one table: service, affected yes or no, and the evidence.
```

7. 长任务结束后先读「它需要你做什么」的部分，再读其余总结。要改总结格式就在 CLAUDE.md 里写：

```text
End every run with three headings: Blocked on me, Changed, Found.
```

8. 人工评审前先让它做一轮代码审查：

```text
Review the diff on this branch against main.
List only problems you'd block the merge for. For each one, give the file and line, why it's wrong, and how to show it fails.
```

9. 要求它标注自己无法确认的东西：

```text
Mark anything you couldn't confirm, and say where you looked
```

如果你走的是做法 0-B，第 8 步尤其不能省：插件本身不做独立代码审查，只有批准后的一次自检。

### 做法 B：成对编程

1. 反过来配置 CLAUDE.md：开始前先给一行计划，结束时给一段简短回顾。原文说 Opus 5.5 对两种方式都遵守。

### 做法 C：有验收人的长任务，用状态机 + 独立验证 + SHA 门禁跑（hitl-dev-loop）

它把角色拆开：Claude 作为主 Agent 理解需求、调研、拆解任务；编码 Agent（默认 Codex CLI）在独立 git worktree 中改代码；调度脚本负责任务状态、反馈送达、独立验证、审查、集成门禁和构建提醒；人负责体验产品、用大白话或截图反馈、决定方向和发布。README 明确说这不是无人监督的自动编程。

1. 安装插件或复制技能：

```bash
/plugin marketplace add mu-zi-lee/hitl-dev-loop
/plugin install hitl-dev-loop@hitl-dev-loop
```

或：

```bash
git clone https://github.com/mu-zi-lee/hitl-dev-loop
cp -r hitl-dev-loop/skills/hitl-dev-loop ~/.claude/skills/
cp hitl-dev-loop/PROTOCOL.md ~/.claude/skills/hitl-dev-loop/
cp hitl-dev-loop/agents/repo-maintainer.md ~/.claude/agents/
```

2. 在项目里启动 Claude Code，用启动话术让它先检查状态并只做最小改动：

```text
用 hitl-dev-loop 的方式开发这个项目。先检查项目状态，告诉我需要做哪些最小改动。
```

3. 初始化仓库并配置验证命令。`init.sh` 每个仓库运行一次、可重复运行；把验证命令写进 `.agent-loop/config.sh`：

```bash
S=~/.claude/skills/hitl-dev-loop/scripts
$S/init.sh
# 然后把下面一行写进 .agent-loop/config.sh
AGENT_VERIFY_CMD='make test'
```

不设置 `AGENT_VERIFY_CMD` 时任务会停在 `needs-review`。把 `make test` 换成你项目真实可跑的测试命令。

4. 创建任务 worktree、分支、任务状态和任务说明，默认不开网络，可用 `--scope` 限定范围：

```bash
$S/new-task.sh reader-fonts --scope 'src/reader/*'
$EDITOR .agent-loop/briefs/reader-fonts.md
```

任务说明要写清目标、边界和验收标准。

5. 派发并后台运行调度循环：

```bash
$S/dispatch.sh reader-fonts --detach
```

6. 给任务追加反馈。调度器只在一轮成功后才确认送达，失败会重发：

```bash
$S/feedback.sh reader-fonts '正文在 1280px 宽度下溢出'
```

7. 查看状态和单任务报告：

```bash
$S/status.sh
$S/report.sh reader-fonts
```

8. Claude 审查 diff 后记录审查结论，绑定当前 commit SHA。不要只看 agent 自报：

```bash
$S/review.sh reader-fonts approve
```

9. 集成：门禁检查后在集成 worktree 合并、再验证，失败自动回滚；冲突时停下并说明：

```bash
$S/integrate.sh reader-fonts
```

10. 只构建已验证的集成 SHA，并提醒人验收：

```bash
$S/ship.sh && $S/alert.sh '可以验收了'
```

`alert.sh` 要在 macOS 沙箱外运行才有声音。

11. 按需配置 `.agent-loop/config.sh`。关键项包括：`AGENT_SHIP_CMD` 构建并安装产品以便验收；`AGENT_COMMITS` 默认 `scheduler`，可改为 `agent`；`DEFAULT_NETWORK` 默认 `0`，单任务用 `--network` 开启；`MAX_PARALLEL` 和 `MAX_ROUNDS` 默认 3 和 15；`MAX_FAILS` 和 `MAX_VERIFY_FAILS` 默认 3 和 3；`ROUND_TIMEOUT` 和 `VERIFY_TIMEOUT` 默认 3600 秒；`TASK_TIME_BUDGET` 和 `TOKEN_BUDGET` 默认 0；`INTEGRATION_BRANCH` 默认 `codex/integration`。按项目实际命令和风险偏好填写。

做法 C 与 A 怎么选：需求清楚、主要靠提示词和 CLAUDE.md 约束、希望模型在一个会话里自主跑完，用 A；需要人持续验收、独立验证命令、审查和验证绑定 SHA、集成失败自动回滚、编码 agent 隔离在独立 worktree，用 C。可以连用：先用 0-A 或 0-C 澄清，再用 A 或 C 执行；C 的任务说明仍要写完成长什么样，否则调度器只能按测试结果判完成，判不了产品意图。

### 做法 E：给仓库积压任务定自主度等级，再按等级放手（/goal 分级）

它解决无人值守批量推进的授权问题：先让编码 agent 遍历 open issue 和 TODO，逐条评估不用你介入能推进到哪一步并给出等级；你确认分级合理后，再放开对应等级的实际执行。原文入口是一条 `/goal` 提示词，在 Claude Code 或 Codex 里使用。

与 A 的差异：A 是一个大任务一次交底、写死完成线，在一个会话里跑完；E 面向一批已存在的积压条目，先自我评估再分级授权。与 C 的差异：C 用外部脚本和状态机独立判定完成、绑定 SHA、集成门禁；E 只有 agent 自评等级，没有独立验证。与 0-D 的差异：0-D 改单个任务的定义，E 改这条任务允许 agent 自己走多远，不要混用。

1. 前提确认：一个 git 仓库，有可枚举 open issue 或 TODO 注释；在仓库根目录用 Claude Code 或 Codex；工作区干净、能开分支、能回滚。后三条是调研补充。

2. 先跑只分级、不执行的第一轮。原文提示词在 L1 处截断，可复制的只有：

```text
/goal Go through every open issue and TODO in this repo. Grade each one like self-driving levels, by how far you can take it without me, then take it that far:

→ L1: get the
```

第一轮不要原样发。去掉末尾的 then take it that far，明确写只分级、不执行、不改代码。先把 open issue 或 TODO 清单导出存档作为基线（导出是调研建议，不是原文）。预期：拿到一张条目、等级、理由的表，仓库没有任何改动。

3. 自己补齐分级定义。L1 定义在截断处中断，L2 及以上完全没有。不要假设原文怎么定义，把等级表显式写进提示词。下面是调研自拟示例：

```text
L1: 只做定位与复现——指出文件、行号、最小复现步骤，不改代码
L2: 提出方案与改动清单，等我确认
L3: 在独立分支完成实现并跑通现有测试
L4: 完成实现 + 新增或更新测试 + 自检通过，提交 PR 说明，不合并
L5: 全自动到可合并状态（仅在任务无外部依赖、无歧义时使用）
```

4. 加执行边界（调研补充）：每个条目单独分支、不推主干、不改 CI 与密钥、无法判断时降级而不是猜；最后输出条目、等级、实际完成、卡点的清单。

5. 人工对同一条目独立分一次级，比对一致率。同一条 issue 你先判一个等级，再看它给的等级；差异大的逐条读理由。预期：得到一致率和它偏乐观的具体模式。

6. 确认分级可靠后，再放开低等级执行。第二轮只允许 L1–L2 实际执行；稳定后再试 L3。不要一上来放开 L4 或 L5。

7. 收工后核对产出，而不是核对已完成标记。看开了几个分支、每个分支有没有通过测试、哪些提交你愿意接受、哪些要丢掉或大改。原文卖点是睡前发出、早上收结果，但没有验收方式或人工复核规则，这一步必须由你补。

做法 E 与 A 或 C 怎么选：只想把一批积压条目分诊、判断哪些能放手，先用 E 的只分级模式；已经知道要做什么、有明确完成线，用 A；需要独立验证、SHA 门禁、集成回滚，用 C。可以把 E 的分级结果写进 C 的任务说明，或把这条只准到 L2 写进 A 的交底。

### 做法 G：大代码库上，把任务缩到一张可核查的工单再交给 agent

原文的答案不是让智能体理解整个系统，而是三件事同时变小：任务粒度（epic → 可验收工单）、执行环境（每张工单一个用完即弃的沙箱）、上下文（不给整个仓库，只给依赖图和与本工单相关的那一小片）。作者明确说没有魔法：代码库规模不再重要，是因为任务规模变小了。最后仍由人审 PR。作者还提出：真正的难点在上游，即把工单写成智能体能真正做完的形式。

1. 拆解。选一个 epic 或较大需求，拆成多张工单，每张写清别人可以核查的验收标准。关键判据：如果一张工单没法被别人核查，它就不适合交给智能体，由工程师自己做。试用时先拆 3–5 张（调研建议）。

2. 做可核查性评审。让不参与编写的同事只看工单、不看作者解释，判断能否核查。记录不能核查的比例，以及哪些工单需要退回给工程师。

3. 隔离。每张工单在各自全新的、项目已配好的沙箱里运行，任务结束后沙箱直接丢弃。目标是多张工单并行而互不干扰。前提是项目环境能预先配置并复制；原文未指定技术栈或沙箱类型。并行数量受限于你有多少可丢弃的干净环境，以及 PR 的评审吞吐。

4. 检索。不要把整个仓库塞进上下文。让智能体先向代码地图询问依赖关系，再只拉取与本工单相关的那一片。前提是代码库有一份什么依赖什么的映射；原文未指定索引或工具。期望效果是大仓库退化成少量文件，这是作者表述，不是实测。

5. 一次有边界的运行。每张工单只做这一张工单的范围，结束后丢弃沙箱或隔离环境，产出走 PR。

6. 人审 PR。记录评审意见类型，区分实现错误与工单描述不清。若后者占主导，说明瓶颈在上游拆解，回去改工单，不要只让 agent 硬跑。

7. 小范围试点。选 1 个 epic 拆 3–5 张工单，每张写清验收标准；为每张准备全新预配置沙箱，同批并行运行；让智能体先查依赖、只拉相关文件，记录读取文件数和 token 量，与直接给仓库或大范围检索做基线对比；所有产出走人工审 PR。

做法 G 与 A、C、E 的差异：G 面向大代码库的局部改动，核心是任务、环境、上下文三重缩小，最后人审 PR；A 是一个会话里的自主长任务；C 是外部状态机、独立验证、SHA 门禁和回滚；E 是授权分级。G 的工单可以交给 A 或 C 执行，但原文没有讨论这种组合，需要自行验证。G 不能替代 C 的独立验证和 SHA 门禁。

### Claude 应用里的补充做法

1. 先确认模型选择器显示 Opus 5.5。

2. 直接附上图表或截图本身，不要手打数字。附上并问具体问题，例如：

```text
Which of these services call the billing API directly?
```

3. 让它检查长文档的自相矛盾之处：

```text
Check this deck for anything that contradicts itself: numbers, dates and names. Quote each problem and say where it is.
```

4. 直接要成品文件，不要大纲：

```text
Make this a spreadsheet I can share: one row per vendor, with columns for cost, contract end date and owner.
```

5. 在项目里声明「已答过的问题视为定稿」，用于长对话中追加短问题变慢的情况：

```text
Once you have answered something, treat that answer as done. Focus on what I'm asking now, and don't go back over an earlier answer unless I ask about it or point out a problem with it.
```

长链分析类项目不要加这条，后面的步骤可能暴露前面答案的错误。

6. 设计类任务点名你不想要的风格。不要只说别做得太平庸。示例：

```text
Build a personal website with placeholder content.
Don't use a cream or off-white background, italic accent words in headings, numbered 01 / 02 / 03 section labels, monospace labels, or pill-shaped buttons.
```

做完先看它改用了什么；不满意就把新风格加进清单再要一次。

7. 来回式工作可以开 fast mode，在 Claude Code 里输入 `/fast`。它是随 Opus 5.5 发布的研究预览功能，需要开启额外用量，每 token 成本高于标准模式；适合逐条等回复，不适合长任务自主跑。

### 消息被安全策略拦截时

1. 知道怎么切回、怎么先被询问。Claude 应用里会看到以 Switched to 开头的提示和较老模型名，对话留在该模型上；要回到 Opus 5.5，在模型选择器里选它；如果那条消息还在对话里，可能再次被标记，开新对话可以避免。想先被询问，去 Settings → Capabilities，关掉 Switch models when a message is flagged，会看到带选项的 paused 卡片。检查覆盖对话里的全部内容，包括文件和搜索结果，标记可能来自更早内容。Claude Code 里提示会点名较老模型，会话继续在该模型上；要切回运行 `/model`；按两次 Esc 编辑上一条消息重试；想先被询问运行 `/config` 修改开关；误判运行 `/feedback`。

2. 不要在回复里要求它复现内部推理。改为要你需要的东西，例如：

```text
Explain why you chose this approach in three sentences.
```

## 怎么判断变好了

通用收尾清单（出自 Opus 5.5 指南原文）：任务写清完成长什么样；提示词和保存指令里没有 think hard 类句子；设计请求列出要排除的风格；图表和截图是附件；CLAUDE.md 写明何时停何时继续、破坏性操作前必停；破坏性命令权限提示仍开启；大型审计和迁移拆给子代理；任务清单保存在 TASKS.md；先读报告里需要你的部分；人工评审前先跑一轮审查；研究类回答标注无法确认的内容；知道怎么切回模型；按意愿设置拦截后是否先询问。

做法 0-D 侧（原文没有指标，下面四条是调研自设）：任务是否真的改了，而不是只换说法；brief 是否命中你原本想要但没写出来的东西；同一类任务用 `/ambition` 先改写与直接派发相比，返工次数或返工耗时是否下降；它是否真的在给出 brief 后停住、没有抢跑执行。最小试用：挑 2–3 个本来就要派出去的真实任务，只读 brief，不执行。若只是把话说得更花哨、实际产出没差别，就降为思路参考。

做法 0-A 侧（原文未提供指标）：实现前是否发现至少一个需求矛盾或遗漏；代码或页面与验收标准的偏差次数；因理解错需求导致的返工次数和返工时间；从提出想法到首次可验收版本的交互轮次。

做法 0-C 侧（原文没有效果指标，下面几条是调研建议）：需求文档覆盖用户、场景、边界、验收标准中的几类，从 0–2 类提升到 3–4 类视为改善；开工后因需求和当初想的不一样导致的返工次数是否下降；从想法到可以动手的时间是否可接受；产出的文档能否让第三方不问背景就看懂。最小试用：1 周内跑 2–3 个真实小需求，并留一个复杂度相近、不做澄清的对照。若模型只复述你说过的话、追问空洞、或文档条目后续无法引用，就不要写进团队规范。

做法 0-B 侧（原文没有效果指标，下面几条是报告建议）：从首次交付到我想要的需要几轮修改；事后 review 中属于它做错了东西而非写错了代码的问题条数；设计阶段耗时；构建中停下来说设计有问题的次数；完成总结能否让你不读代码就判断改动范围。最小试用：选一个 1–3 小时的真实编码任务，先在不装插件的会话里直接构建一遍做基线，再在装插件的会话里做一遍；检查它是否回写目标、受众、done 定义，是否声明选了哪条路径，是否在批准前一行代码都没写，批准后是否在同一会话直接开工，走 Architectural 时 spec 是否落到 `docs/specs/`。

做法 F 侧（原文没有效果指标，以下为调研建议）：一次通过率；需要追加的对话轮数和改动代码行数；按钮位置、动画、开关行为是否与参考一致；产出是否遵循 AGENTS.md 中的约定；同一任务 A 组给本地源码、B 组只文字描述的对照差异。最小试用：半天内写一份 AGENTS.md，克隆一个含目标交互的仓库，替换四要素后跑一次；若 A/B 差异不大，收益可能主要来自 AGENTS.md。

做法 A 侧：一次运行中途问你要不要继续的次数是否变少；子代理汇报是否附了可核对证据，最终表是否完整；它标注的无法确认项与你事后发现的盲区是否吻合；合并前审查给出的阻塞项里，多少是真问题、多少是误报。最小试用：挑一个真实长任务按 1–9 步跑一遍；需求还模糊就先做 0-A 或 0-C。

做法 C 侧（README 没有量化效率或质量数据，下面几条是调研建议）：从派发到 verified 的轮数和耗时；验证失败次数；审查打回次数；集成冲突或回滚次数；`status.sh` 显示的 token；你补上下文、修 agent 坏改动、做验收决策各花多少时间；验收时发现的缺陷数。改善判断：验证能稳定拦住问题、审查只需看小 diff、集成无需手工修冲突或回滚、人工介入集中在验收和方向决策，才算改善；若轮数或人工时间高于手工基线且没有质量收益，只保留状态机、SHA 门禁和独立验证思路。最小试用：低风险、已有测试命令的仓库，只开一个任务，`MAX_PARALLEL=1`，默认不开网络，设置快速但完整的 `AGENT_VERIFY_CMD`，用 `new-task.sh --scope` 限定小范围，按 dispatch → feedback → status/report → review approve → integrate → ship 跑完一条真实小需求。

做法 E 侧（原文没有指标，下面几条是调研自设）：同一条 issue 它给的等级与你独立判的等级是否一致；无人值守期间产出的分支和提交，被人工接受、被大改、被直接丢弃各占多少；现有测试是否通过，合并后过一段时间又发现多少回归；人工复核单条的平均耗时是否比从零手工处理低；一夜实际推进的条目数，注意区分标记完成与真正可合并。改善判断：分级一致率可接受、被接受的提交比例高、现有测试稳定通过、人工复核耗时更低，才算适合放手；只要返工率不降或一致率偏低，就退回只分级不执行。最小试用：半天内选一个中小型仓库，导出 open issue 与 TODO 清单做基线；第一轮只发分级版提示词并人工独立分级比对；第二轮放开 L1–L2，限定分支、禁止推主干；第三轮再试 L3。

做法 G 侧（原文只给过程性判据，没有结果指标，下面几条来自调研建议）：工单可核查率，即不用问作者就能被他人核查的工单占比；单工单一次通过率与返工轮次；返工原因中工单歧义与实现错误的比例，若前者占主导，说明瓶颈在上游拆解，符合作者判断；并行干扰事件数，应为 0；环境准备时间、单工单成本；PR 评审耗时与每 PR 意见数，判断人的评审是否成为新瓶颈；单工单实际读取文件数与 token 量，对比不建依赖图时的基线。改善判断：可核查率高、返工主要来自工单歧义而非实现错误、并行无干扰，则推广；若评审成为瓶颈或上下文切片效果不明显，降级为 study，只保留拆成可核查工单这一条。最小试用：1 个 epic 拆 3–5 张工单，每张写清验收标准；做可核查性评审；每张准备全新预配置沙箱同批并行，记录环境准备耗时和干扰；让智能体先查依赖、只拉相关文件，记录读取文件数和 token 量；产出走人工审 PR，记录意见类型。

## 常见坑

- 任务已经界定清楚、边界很窄，还硬跑 `/ambition`。可能只是把话说得更宏大，实际产出没差别。
- 把 0-D 的 brief 当成它替你定好了任务。它只给 brief 并停下等你，选不选是你的决定。
- 只读 brief 不看依据就照单执行。本次材料没有 `SKILL.md` 和 `references/essay-notes.md` 正文，别默认它的升维方向和你的目标一致。
- 把「先出 brief 再等确认能避免跑偏」当成已验证收益。README 未给结果或案例。
- 需求已经明确还硬要先澄清。小改动或需求清楚时可能只增加交互轮次。
- 把做法 0-A 当成完整的 6 条技巧。采集文本只保留第 1 条。
- 把做法 0-C 当成一批逆天 prompt。原文第 2 条在 2. 处截断，不要替作者补全。
- 用 0-C 时第一条消息就把所有背景倒完。这样绕过了追问本身。
- 让模型一次问太多。追问挤成一团时，明确要求一次只问一个问题。
- 只看它问了没有，不看问到了什么。反复问目标用户却不深入边界和验收标准，属于追问空洞。
- 只走 0-C 不做对照。同一时期要留一个复杂度相近、不做澄清的需求作对照。
- 期待 0-C 输出统一格式文档。原文未规定模板，输出因人因模型而异。
- 装了 superbrainstorming 却没新开会话。session-start hook 只在会话开始时生效。
- 同时装着 Superpowers。两个插件都带 `brainstorming` skill 和 session-start hook，会冲突。
- 跳过冒烟验证。发一句 `Let's make a react todo list` 就能看出 skill 或 hook 有没有生效。
- 把 `.superbrainstorming/` 提交进仓库。视觉伴侣生成的 mockup 存在这个目录，记得加进 `.gitignore`。
- 以为插件的轻量配置是通用规律。它删掉了 TDD、子代理和独立代码审查，当前模型能自己走完只是作者主张。
- 试用 0-B 时只跑装了插件的那一遍。没有对照就看不出改善。
- 拿玩具任务或大重构当 0-B 试点。报告建议 1–3 小时的真实任务。
- 在非 Claude Code 宿主上等 superbrainstorming 自动触发。没有 session-start hook 时要按名字显式要求它加载 `skills/brainstorming/SKILL.md`。
- 改了 `skills/brainstorming/SKILL.md` 或 `hooks/bootstrap.md` 就直接合并。要在真实会话里试过。
- 直接照抄做法 F 的提示词路径。`~/.config/herdr-app/AGENTS.md`、`magpie`、`herdr`、`Routing` 都是作者本机的，必须替换。
- 只给截图或在线链接，不给本地参考源码。原文的关键是给本地路径。
- 把 AGENTS.md 写成空文件或只写一句写好代码。它应该是动手前必须先读的约定文件。
- 把做法 F 当成跨模型通用定稿。作者自己说实现效果看模型可能需要微调。
- 只看生成结果，不做保真度比对。要运行项目检查按钮位置、开关、动画和实时刷新。
- 只跑 A 组不做对照。没有 B 组只用文字描述的基线，就看不出参考源码是否起作用。
- 把收益全归给参考源码。若 A/B 差异不大，收益可能主要来自 AGENTS.md。
- 在目标项目没有 mod 或插件扩展点时硬套做法 F。
- 把做法 F 当成新工具介绍。它只是一条提示词模板和一种下发写法。
- 让它自主跑就放松把关。破坏性操作前先停必须留在 CLAUDE.md 里，破坏性命令权限提示也要保持开启。
- 靠读滚动回放看进度。长任务会填满上下文窗口，要看 TASKS.md。
- 还在提示词里写 think hard、think step by step。要控制思考量就改 effort 设置。
- 用别做得平庸这种笼统说法排除设计风格。要列具体排除项。
- 在长链分析类项目里加「已答过的问题视为定稿」。后面的步骤可能暴露前面答案的错误。
- 在回复里要求复现内部推理。这是会被拒的类别之一。
- 拦截后一直卡在原对话里。那条消息可能再次被标记，开新对话可以避免。
- 把 fast mode 当成默认。它是研究预览功能，需要额外用量、每 token 更贵。
- 用做法 C 却没设 `AGENT_VERIFY_CMD`。任务会停在 `needs-review`，调度器无法独立判定完成。
- 把做法 C 当成无人监督自动编程。README 明确要求人负责体验产品、反馈、决定方向和发布。
- 一开始就把 `MAX_PARALLEL` 开大。最小试用应只开一个任务、限定 `--scope`。
- 只看 agent 自报完成，不看 SHA 与验证结果。跳过这一步就退化成普通聊天。
- 升级 Codex CLI 后不重验流程。行为与 Codex CLI 版本相关。
- 在 Windows 上直接照搬做法 C。README 未提 Windows 支持，强依赖 bash、git、python3 或 jq。
- 等 `alert.sh` 在 macOS 沙箱里发声。它要在沙箱外运行才有声音。
- 任务说明不写验收标准，只写改一下阅读器字体。调度器能跑测试，但判不了产品意图。
- 把做法 E 那条被截断的提示词当成完整方法论。L2 及以上的等级定义、完成约束、后续指令全都要你自己写。
- 第一轮就把 then take it that far 原样发出去。先改成只分级、不执行、不改代码。
- 直接相信模型自评的等级。自评容易偏乐观，先人工独立分级比对一致率。
- 一上来就放开 L3 以上。先 L1–L2，稳定后再试 L3；涉及外部权限、密钥或需求歧义的条目不该自动执行。
- 把标记完成当成真正可合并。记录指标时这两个数要分开。
- 用做法 E 替代做法 C 的门禁。E 没有独立验证、SHA 绑定、集成回滚。
- 把做法 G 当成让 agent 理解整个大仓库。原文明确不是，是任务、环境、上下文同时变小。
- 工单不可核查还硬交给智能体。原文要求这类工单由工程师自己做。
- 待办列表没写成可核查形式就直接上。作者判断真正难点在上游拆解。
- 没有预配置可复制环境就谈并行。并行受干净环境和 PR 评审吞吐限制。
- 不给依赖图，直接把整个仓库塞上下文。应先查依赖再拉相关切片。
- 只有 agent 跑完，没有人审 PR。流程最后一步是人审 PR。
- 把十张工单可并行当成保证。这是作者断言，未给验证条件。
- 把返工都归为 agent 实现错误。要分「工单歧义」和「实现错误」；前者占主导说明上游拆解有问题。
- 以为做法 G 给了工具、命令或指标。原文没有；沙箱、依赖图、上下文切片、提示词、PR 审查深度都要自己选型。
- 用做法 G 替代做法 C 的独立验证或 SHA 门禁。G 只给流程骨架，没有这些机制。

## 证据与来源

本手册合并九篇调研。

一、开发前需求澄清的两条提示词（做法 0-A、0-C）。0-A 来源 X 推文 @goan999999，标题称 Codex 6.1 有 6 个技巧，采集文本只保留第 1 条；原文给了一条可复制澄清提示词和适用痛点「页面出来了，需求理解错了」，互动为 31 点赞、8 转发、8 回复，不等于效果证据；没有案例、前后对比、返工率或代码正确率；第 2–4 步是按提示词语义推导的最小流程。0-C 来源 X 推文 @watreejane（61 赞、6 转、22 回复），作者自称收藏逆天 prompt，采集文本只完整给出第 1 条，第 2 条在 2. 处截断；只有一条可逐字复制提示词和适用条件，没有案例、耗时或质量数据；未指定模型，追问质量依赖模型，未规定文档模板；本手册 0-C 的四条指标和 1 周对照法均为调研自设。

二、superbrainstorming 批准闸门（做法 0-B）。来源 harrymunro/superbrainstorming 的 README（Superpowers 的 fork 与精简版）。可核验内容：安装和测试命令、三路径对照表、验证提示词 `Let's make a react todo list` 及预期行为、与 Superpowers 的 skill 和 hook 冲突提醒、视觉伴侣的 opt-in、Node.js、本地运行、`.superbrainstorming/` 目录、仓库结构。只是作者主张：当前模型能把已达成设计保持在上下文里并自己走完，所以删掉 TDD、子代理、逐任务代码审查是安全的；没有对照数据或案例；前沿模型用轻量版的分界线只给了模型名称，没有评估方法。仓库仅 31 stars，未审查代码实现，未在真实项目中验证行为描述。原文没有效果指标；`tests/brainstorm-server` 的 npm test 和 `tests/hooks/test-session-start.sh` 验证的是插件机制，不是工作效果。

三、ambition skill：动手前把任务升维（做法 0-D）。来源 wanderingspirit03/ambition-skill 的 README，仓库 49 stars。可核验内容：仓库结构、一行安装命令、两个触发方式、只先展示 brief 等用户选择的交互约定、方法来源 Felix Rieseberg 的 essay。只是作者主张：改写能让任务更有高度、深度和范围；先出 brief 再等确认能避免跑偏。本次只有 README，没有 `SKILL.md` 与 `references/essay-notes.md` 内容，无法确认提示词具体怎么写、altitude/depth/range 如何落地、是否需要额外模型能力。原文没有指标；0-D 的四条观察点和 2–3 个真实任务试用方式为调研自设。

四、Opus 5.5 长任务全套做法（做法 A、B 与 Claude 应用部分）。来源 claude.dev 博客，作者 Addy Osmani，2026-09-22 的 Opus 5.5 操作指南。提示词、CLAUDE.md 规则、斜杠命令和收尾清单按原文照抄。证据分三类：原文明确的前提条件可直接当规则用，例如 fast mode 是研究预览、需要额外用量且每 token 更贵；长链分析类项目不要加已答过的问题视为定稿；拦截检查覆盖文件和搜索结果；要求复现内部推理会被拒。作者或厂商单方主张，没有可复现量化证据：Opus 5.5 自主工作时间更长、会直白说明做了什么、每次回复前先思考、多步骤长任务比 Opus 5 撑得更久、读图表截图更准、做出的表格和文档分享前编辑更少、是首个带 Fable 级生物或网络安全防护的 Opus 模型。转述的早期测试者说法，二手且无数据：让它跑数小时编码任务几乎不用盯着；协调多个并行子代理做长审计和迁移几乎不用盯着；最低 effort 下抓到的 bug 比 Opus 5 高 effort 还多、误报更少。

五、hitl-dev-loop：有人验收的长任务循环（做法 C）。来源 mu-zi-lee/hitl-dev-loop 的 README。可核验内容：安装命令、脚本清单、配置表、使用示例、协议、模板、测试说明；流程为 init→new-task→dispatch→feedback→status/report→review→integrate→ship；不设置 `AGENT_VERIFY_CMD` 时任务停在 `needs-review`；默认适配 Codex CLI；任务隔离在独立 git worktree；默认由调度器提交；只读 repo-maintainer 子 Agent 走低成本路线；`status.sh` 能识别 stalled 任务；审查结论绑定 SHA；集成后再验证，失败自动回滚；`ship.sh` 只构建已验证的集成 SHA。测试证据：21 个模拟 Codex 的自动化场景，CI 在 ubuntu 和 macOS 运行，验证的是流程机制，不是真实项目效率或质量提升。没有效率或质量数据，没有独立第三方评测，很多可靠性描述是作者主张。局限：强依赖 Claude Code、Codex CLI、bash、git、python3 或 jq；未提 Windows；行为与 Codex CLI 版本相关；需要人持续验收；`alert.sh` 在 macOS 沙箱外运行才有声音。试用建议：低风险、已有测试命令的仓库跑一条真实小任务，重点看独立验证和 SHA 门禁是否减少返工，暂不宜 adopt。

六、/goal 自主度分级（做法 E）。来源 X 推文 @Voxyz_ai，标题称睡前发给 Claude Code 或 Codex，醒来会有惊喜。可核验内容：一条 `/goal` 提示词的开头部分，到 `→ L1: get the` 为止，以及核心做法描述——遍历 open issue 与 TODO，按自动驾驶分级评估每条在人介入时能推进到哪一步，再推进到那一步。材料极不完整：正文在 L1 处截断，完整分级定义、L2 及以上、后续指令均未获取；本手册的 L1–L5 等级表、执行边界、工作区干净等前提均为调研补充、自拟。只是作者主张：没有案例、仓库、产出数据或前后对比；睡前发出、醒来有惊喜只是标题主张；传播约 97 点赞、7 转发、21 回复，不等于有效。原文自己指出风险：模型自评等级容易偏乐观，做到哪一步缺少客观判定标准，容易产出看似完成实际不可用的结果；适用条件是 issue 或 TODO 较清晰、仓库有可跑测试、能用版本控制回滚，涉及外部权限、密钥或需求歧义不该放开。E 的五项指标和三轮试用方式均为调研自设。

七、三段式编码任务下发（做法 F）。来源 X 推文 @lexrus，标题称提示词差不多是这样，实现效果看模型可能需要微调。可核验内容：一条完整可复制提示词，包含读 `~/.config/herdr-app/AGENTS.md`、读 magpie 本地源码 `{本地 git 仓库地址}`、照抄 Routing 界面动画、实现 herdr mod、在 Files 和 Changes 按钮右边放 Routing 按钮；互动 47 赞、2 转、2 回复。只是作者主张：没有说明用哪个模型、跑了几轮、是否成功；没有生成结果、前后对比、AGENTS.md 实际内容、magpie 或 herdr 具体仓库地址、耗时或返工数据。适用条件：智能体需有本机文件读取与执行权限；参考仓库可本地克隆；目标项目有 mod 或插件扩展点；作者本机路径必须替换。F 的 A/B 试用方法和四项指标为调研自设。

八、大代码库三步缩小（做法 G）。来源 X 推文 @mardehaym，标题问 CTO 们：大遗留代码库上 agent 怎么工作。原文给出三步流程骨架：拆解 epic 为可核查工单；每张工单在全新且用完即弃的沙箱里运行；让智能体先查依赖图，只拉取与本工单相关的一片上下文；一次有边界运行后由人审 PR。结论建议小范围试点这套「先缩小任务、再隔离运行、最后按依赖检索上下文、人工审 PR」的流程，但没给工具、命令或指标，需要自己补齐实现细节并设好验收口径。可核验内容只有流程骨架和判据：如果一张工单没法被核查，它就不适合交给智能体，由工程师自己做；代码库规模不再重要，是因为任务规模变小；真正难点在上游，即把工单写成智能体能真正做完的形式；并行数量受干净环境和 PR 评审吞吐限制。只是作者主张：十张工单可并行、大仓库退化成少量文件，均未给验证条件；没有并行吞吐、PR 通过率、缺陷率、成本或耗时对比；没有具体沙箱、依赖图工具、上下文切片方式、提示词写法或 PR 审查深度。传播数据 25 赞、11 转发、10 回复，属于单个从业者经验主张。适用条件：任务必须能拆成可核查工单；具备可复制的干净环境、可用的依赖映射、足够评审人力。G 的试用方式和指标为调研建议。

九、证据强度总说明。以上九篇的收益表述都来自厂商或作者一方；Opus 5.5 那套强绑定具体版本；G 只有推文提纲且无数据；E 原文截断；F 只有一条提示词；0-B 和 0-D 只有 README；0-A、0-C 只有推文片段。整套做法按 try 使用，不要按 adopt 全面铺开。

## 依据的调研

- [Getting the most out of Opus 5.5 in Claude and Claude Code](../research/radar/2026-10-02/395-getting-the-most-out-of-opus-5-5-in-claude-and-cla.md)：值得一试，把这篇文章当作一份可直接照搬的 Opus 5.5 使用规程：在 Claude Code 里用「一句话交底 + 明确完成线 + CLAUDE.md 停走规则 + TASKS.md 清单 + 子代理分工 + 合并前审查」这套组合跑一个真实长任务，先小范围验证是否真的减少打断和返工。给 try 而不是 adopt，是因为所有收益表述都来自厂商/作者单方主张，且强绑定 Opus 5.5 这一具体版本，没有可复现的量化证据。
- [@goan999999: Codex 6.1 这 6 个“奇技淫巧”，建议你下次开工就试](../research/radar/2026-10-02/783-codex-6-1-6.md)：值得一试，建议在下一次用 Codex 写代码前先发送原文提示词，让模型先澄清目标用户、使用场景、验收标准并指出矛盾，方案确认后再实现；理由是原文给出了可直接复制的提示词，但采集文本只保留六条中的第一条，且没有效果数据，适合小范围试。
- [harrymunro/superbrainstorming](../research/radar/2026-10-05/1275-harrymunro-superbrainstorming.md)：值得一试，可以在一两个真实开发任务上小范围试装 superbrainstorming：它把「先对齐设计、人工批准、再动手写码」做成了 Claude Code 里的固定流程，安装和验证步骤在原文中写得很清楚；但效果主张没有数据支撑，且它砍掉了上游的 TDD、子代理与代码审查，是否够用取决于你用的模型和任务风险。
- [@watreejane: 作为小排老师的忠实粉丝，我其实还收藏了很多 逆天 prompt，谁用谁知道，大家也不用找了：](../research/radar/2026-10-14/3154-prompt.md)：值得一试，可以把原文第 1 条提示词原样拿来，在真正开工前的需求澄清环节小范围试用：它是可直接复制的多轮追问模板，能逼出用户、场景、边界和验收标准；但原文只有这一条完整、无案例无数据，先试再定是否写进手册。
- [wanderingspirit03/ambition-skill](../research/radar/2026-10-16/3841-wanderingspirit03-ambition-skill.md)：值得一试，把仓库 clone 到 ~/.claude/skills/ambition，在 Claude Code 里用 /ambition 或“make this more ambitious”触发，让它在动手前先产出升维改写 brief 再由你选择——安装与触发方式明确、成本极低，适合先在自己定义任务/委派任务的环节小范围试；但本次材料只有 README，SKILL.md 正文不可见，暂不足以给 adopt。
- [mu-zi-lee/hitl-dev-loop](../research/radar/2026-10-21/5566-mu-zi-lee-hitl-dev-loop.md)：值得一试，建议小范围试用：在一个低风险、已有测试命令的仓库按 README 的 init→new-task→dispatch→feedback→review→integrate→ship 跑一条真实小任务，重点看独立验证和 SHA 门禁是否减少返工；它给出了可复制的脚本、配置和流程，但依赖 Claude Code/Codex CLI 且证据主要是仓库自述与模拟测试，暂不宜直接 adopt。
- [@Voxyz_ai: You have to send this to Claude Code or Codex 𝗯𝗲𝗳𝗼𝗿𝗲 𝗯𝗲𝗱! You'll wake up to a nice surprise](../research/radar/2026-11-07/11001-you-have-to-send-this-to-claude-code-or-codex-you-.md)：值得一试，值得小范围试：把这条 /goal 提示词当模板，先只让它对 issue 和 TODO 做自主推进分级、暂不执行，确认分级可靠后再放开低级别自动完成；原文在「L1: get the」处被截断，完整分级定义与后续指令需自行补齐。
- [@lexrus: 提示词差不多是这样，实现效果看模型可能需要微调：](../research/radar/2026-11-09/11830-item.md)：值得一试，把这条推文当成“全局规范（AGENTS.md）+ 本地参考实现源码 + 精确落点”的三段式编码智能体下发模板，替换路径与组件名后小范围试用；因为提示词本身可直接照抄，但只有单条推文、没有生成结果或对比证据，效果须自行验证。
- [@mardehaym: CTOs with big legacy codebases ask a fair question: how does an agent work on a system that size?](../research/radar/2026-11-13/12976-ctos-with-big-legacy-codebases-ask-a-fair-question.md)：值得一试，建议小范围试点这套“先缩小任务、再隔离运行、最后按依赖检索上下文、人工审 PR”的三步流程；原文给出了可直接照做的流程骨架，但没给工具、命令或指标，需要自己补齐实现细节并设好验收口径。
