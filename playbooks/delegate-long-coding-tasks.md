# 开工前先让编码 agent 对齐设计，再把长任务跑到完成

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：需求没想清就开工、长任务跑一半停下、上下文被摘要后只能读滚动回放、宣布完成时无法核实——这套规程把「先对齐设计、你批准、再动手」和「一次性交底、写明完成线、清单与子代理」做成可以照着走的流程。
> 先试这一步：挑一个你近期真实要做、规模在 1–3 小时内的编码任务，先在**不装插件**的会话里让智能体直接构建一遍并记下返工轮数，再按做法 0-B 装上 superbrainstorming 跑第二遍，看批准闸门是否真的挡住了「把错误的东西建得很好」。
> 最近修订：2026-10-05

## 解决什么问题

一次让 agent 写代码，页面出来了才发现需求理解错了；或者长任务跑到一半停下、返工；上下文被摘要后你只能读滚动回放；它宣布完成时你没法确认是否真完成。本文给出一套开工规程：需求没想清时先让模型澄清目标用户、使用场景和验收标准（做法 0-A），或者在 Claude Code 里装一道「先设计、你批准、再写码」的批准闸门（做法 0-B）；需求清楚后再用「一次性交底 + 明确完成线 + CLAUDE.md 停走规则 + TASKS.md 清单 + 子代理分工 + 合并前审查」把长任务跑完（做法 A），需要你每一步都参与时改用做法 B。

证据状况：做法 0-A 出自一条 X 推文，采集文本只保留 Codex 6.1 六条技巧中的第一条，没有效果数据；做法 0-B 出自 superbrainstorming 的 README，安装与验证步骤写得很清楚，但效果主张没有数据支撑，仓库仅 31 stars，本手册也未审查其代码实现；Opus 5.5 那套的收益表述全部来自厂商/作者单方主张，也没有可复现的量化证据。三种做法都建议先在一个真实任务上小范围验证。

## 适用与不适用

适用：

- 需求模糊、担心「页面出来了，需求理解错了」的产品/功能任务：先做需求澄清。不想装东西用做法 0-A（原文指定 Codex 6.1）；在 Claude Code 里、想让流程本身挡住「没批准就写码」，用做法 0-B。
- 长、多步骤、有明确完成线的工作，例如贯穿大仓库的改动直到测试通过（做法 A）。
- 大代码库的审计、迁移、跨服务评审，可拆给子代理并行做（做法 A）。
- 信息在图表、示意图、日历截图里，需要问依赖空间位置关系的问题。
- 需要先跑一轮合并前审查，或要成品文件（可分享的表格、文档）而不是大纲。
- 1–3 小时规模的真实编码任务、你用的又是当前前沿模型、只想要一次快速设计确认：这是做法 0-B 的试点场景。

不适用或需谨慎：

- 需求已经明确、只是小改动时，先澄清可能白增交互轮次（原文未讨论成本）。
- Opus 5.5 那套强绑定该具体版本，不要直接搬到其他模型上当作通用规律。
- 做法 0-B 主要适用于 Claude Code；其他支持 Agent Skills 的宿主没有 session-start hook，不会自动触发，需要按名字显式要求它。
- 做法 0-B 删掉了 TDD、子代理与逐任务代码审查，在高风险或要求可审计的代码库中，这种精简本身就是风险。
- 需要强制测试先行、独立代码审查、并行多代理或 git worktree 管理时：回上游 Superpowers，或按做法 A 手动补齐子代理与合并前审查。
- 长链分析类项目不要用「已答过的问题视为定稿」这条项目指令：后面的步骤可能暴露前面答案的错误。
- 需要你每一步都参与的成对编程，不要用自主长任务的停走规则，改用做法 B。
- 三种做法的收益都没有可复现的量化证据（插件那篇甚至没有任何效果指标，只给了插件自身的测试命令），按 try 使用，不要按 adopt 全面铺开。

## 前置条件

- 做法 0-A：使用 Codex 6.1；你有一个产品/功能想法但需求还没想清楚，愿意先多一轮澄清再写代码。原文没有说明需要哪些文件、权限或工具。
- 做法 0-B：使用 Claude Code。如果你已经在用 Superpowers，先准备通过 `/plugin` 把它禁用或卸载——两个插件都带 `brainstorming` skill 和 session-start hook，重名会冲突。可选的视觉伴侣另需本机有 Node.js。
- 做法 0-B 的仓库只有 31 stars，本手册只依据其 README 判断，未审查代码实现，技能提示词的实际内容与行为约束强度未知。
- 在 Claude 应用里，先确认模型选择器显示的是 Opus 5.5。
- 在 Claude Code 里，项目根目录有或可新建 CLAUDE.md，按项目实际修改。
- 你自己清楚验收标准，才能写出「完成」长什么样。
- 破坏性命令的权限提示保持开启（原文明确要求）。
- fast mode 是随 Opus 5.5 发布的研究预览功能，需要开启额外用量（extra usage），每 token 成本高于标准模式。

## 操作步骤

先选做法：

- 做法 0（需求还没想清）：先澄清再实现。0-A 是一条提示词，不装东西；0-B 是 Claude Code 插件，用批准闸门保证「没批准不写码」。
- 做法 A（自主长任务）：任务长、多步骤、有明确完成线，你不想全程盯着。默认先试这套。
- 做法 B（成对编程）：你希望每一步都参与，开始前一行计划、结束时一段简短回顾。CLAUDE.md 按做法 B 反向配置。

做法 0 和做法 A 不是二选一：0 解决「需求本身没想清」，A 解决「需求清楚后怎么一次交底并跑到完成」。需求模糊时先 0 再 A；需求已经清楚时直接从 A 开始。做法 0-B 和做法 A 也不冲突，但要知道：0-B 的设计前提是「设计达成后模型自己走完」，它删掉了子代理和逐任务代码审查，所以高风险任务仍要手动补上做法 A 的第 8 步。

### 做法 0-A：写代码前先让模型澄清需求（Codex 6.1）

**1. 先不要要求写代码，直接发送澄清提示词。**

前提：你有一个产品/功能想法，但需求还没想清楚，担心直接写代码会理解错。原文提示词：

```text
先问清楚目标用户、使用场景和验收标准。指出需求里的矛盾，整理方案后再实现。
```

预期结果：它先反问你，而不是直接产出页面或代码。

**2. 按它的反问，补齐目标用户、使用场景和验收标准。**

**3. 读它指出的需求矛盾和整理出的方案，先确认或修正方案。**

**4. 方案确认后，再让它进入实现。**

局限（原文明确）：原文只给了这一条提示词，没有给后续操作、配置或其余 5 条技巧；上面第 2–4 步是按该提示词语义推导的最小流程，不是原文展开的完整流程。

### 做法 0-B：在 Claude Code 里装一道批准闸门（superbrainstorming）

流程是一个带闸门的循环：你提出需求 → 智能体先提问并给出设计 → 你批准？未批准就回去继续改设计；批准后它在同一个会话里立刻开始构建。作者的立论是：编码智能体「会建东西」但不知道你指什么、给谁用、你在意哪些取舍，所以「一个很有能力的智能体仍然可能把错误的东西建得很好」。

**1. 先处理 Superpowers 冲突。**

如果你已经在用 Superpowers，先通过 `/plugin` 把它禁用或卸载。原因是两个插件都带 `brainstorming` skill 和 session-start hook，而 Superpowers 那一版在同一位置会转而进入「写计划」而不是直接构建。

**2. 安装插件。**

在 Claude Code 中运行：

```bash
/plugin marketplace add harrymunro/superbrainstorming
/plugin install superbrainstorming@superbrainstorming
```

然后**新开一个会话**（session-start hook 在会话开始时生效）。

**3. 做一次冒烟验证。**

在全新会话里发送：

```
Let's make a react todo list
```

预期行为：智能体加载 `superbrainstorming:brainstorming` skill、声明把这件事当作 architectural 工作处理、并在写任何代码之前先问这个应用是做什么用的。如果没出现这些行为，说明 hook 或 skill 没生效。

**4. 确认三选一的路径，且你有否决权。**

智能体会按任务规模选一条并**明确告诉你选了哪条**，你可以推翻它：

| 路径 | 适用 | 会发生什么 |
|---|---|---|
| **Spike** | 「这事到底可行吗」类问题 | 智能体建议一个快速实验，你点头后它去跑，回来汇报发现；产出的东西是一次性的、可丢弃 |
| **Bounded** | 对现有代码的小范围、边界清晰的改动 | 智能体问清什么重要，在对话里给一个简短设计 |
| **Architectural** | 新项目、新子系统、大的结构性改动 | 智能体一次只问一个问题，给出两三个方案，并把 spec 写到 `docs/specs/` |

**5. 在批准之前，要求它复述三件事。**

原文明确说它会主动做：想达成什么、给谁用、「done（完成）」长什么样，并回写给你让你纠正。发现复述不对就在这里改，这是最便宜的纠错点。

**6. 只有你批准后才动工。**

三条路径都遵守这一点。批准后它立刻在同一会话里开始，自己做步骤跟踪，遵循你项目在测试和提交上的既有约定，并在宣布完成前自检。

**7. 中途发现问题时，它应该停下来问你**，而不是悄悄改道。如果它没停，这就是流程失效的信号。

**8. 想跳过设计就直接说。** 原文说「say so and the agent will」——直接构建是被支持的逃生口。

**9. 换用其他智能体。** skill 是 `skills/brainstorming/` 下的标准 `SKILL.md`，任何支持 Agent Skills 的智能体都能加载；但没有 session-start hook 时它可能不会自动触发，需要按名字显式要求它。原文提到 Superpowers 有面向许多其他工具的集成，可供移植参考。

**10. 可选：视觉伴侣。** 对布局、mockup、示意图这类「看一眼比描述更清楚」的问题，智能体可以提议在你的浏览器里开一个标签页展示选项。它是 opt-in、需要 Node.js、完全在你本机运行、不从互联网加载任何东西。生成的 mockup 存在项目内的 `.superbrainstorming/`，记得把它加进 `.gitignore`。

**11. （改插件本身时）跑测试：**

```bash
# Visual companion server
cd tests/brainstorm-server && npm ci && npm test

# Session-start hook
bash tests/hooks/test-session-start.sh
```

原文提醒：改动 `skills/brainstorming/SKILL.md` 或 `hooks/bootstrap.md` 会改变智能体的行为，合并前要在真实会话里试过。

**0-A、0-B 与上游 Superpowers 怎么选：**

- 只想先问几个问题、不想装插件，或用的不是 Claude Code：用 0-A。
- 在 Claude Code 里、用当前前沿模型、只想要一次快速设计确认：用 0-B。
- 用较小或较旧的模型，或需要强制 TDD、逐任务代码审查、git worktree 管理：用上游 Superpowers。(0-B 是它的 fork 与精简版，删掉了 writing-plans、executing-plans、subagent-driven-development、test-driven-development、systematic-debugging、verification-before-completion、代码评审类、git worktree 类等技能，也删掉了 Claude Code 之外的工具集成。)
- 注意：「当前模型能把已达成的设计保持在上下文里并自己走完，所以删掉 TDD、子代理、逐任务代码审查是安全的」只是本 fork 存在的理由，原文没有任何对照数据或案例；「前沿模型用轻量版、旧模型用重流程」的分界线也只给了模型名称（Claude Opus 5.5、Sonnet 5.5、Fable 5.1，本材料无法核实），没有评估方法。按 try 对待。

### 做法 A：让长任务自主跑（Opus 5.5）

**1. 一次性交底整个任务，并写明「完成」长什么样。**

前提：你清楚验收标准。在 Claude Code 里用下面这段（原文示例，内容按你的任务改）：

```
Migrate the payment endpoints from the old client to the new one.
Done means: every endpoint uses the new client, the old client is deleted, and the test suite passes.
Stop and ask me only if a test fails for a reason you can't explain.
```

预期结果：它自己知道什么时候算完，不因为「要不要继续」反复停你。原文理由：Opus 5.5 在多步骤长任务上比 Opus 5 撑得更久，早期测试者让它跑数小时编码任务而几乎不用盯着。

与做法 0 的差异：做法 0 让模型反问你「目标用户 / 场景 / 验收标准是什么」，做法 A 这一步由你自己一次性把「完成」写成验收线。两者可以都写：先做 0 把需求敲定，再做 A 把完成线写死。做法 0-B 则把这一步前置成一道闸门，由你在设计阶段就点过头。

**2. 删掉「think carefully」「think step by step」这类话。**

包括提示词里和已保存的指令里。前提：你用的确实是 Opus 5.5。原文理由：它每次回复前都会思考，并由自己决定思考多少。

- 要快速回答简单问题时，直接写 "Answer directly."。
- 要在 Claude Code 里调整思考量，改 effort 设置，而不是写「think hard」。

**3. 任务跑到一半想起补充要求，直接打字追加，不用重启。**

在 Claude Code 里趁它工作时输入消息并按 Enter，例如：

```
Also keep the old endpoint names as aliases.
```

预期结果：长任务继续跑，不因补充要求重来。原文理由：现在长任务跑得久，重启代价更大。

**4. 在 CLAUDE.md 里写清楚「什么时候停、什么时候继续」。**

前提：项目根目录有或可新建 CLAUDE.md；按项目实际修改。原文原文：

```
When a step doesn't need my input, keep going. Put status notes in the same message as your next action.
Stop and ask only when you can't continue without me, or before anything destructive: deleting data, force-pushing, or changing anything outside this repository.
```

预期结果：减少以 "Want me to continue?" 结束的停顿。原文补充：如果一次运行这样停下，回一句 "continue" 即可；如果经常这样，这条规则能减少停顿。

注意：规则让它可以继续跑，就意味着你更要保留自己的把关——所以最后一行要保留「破坏性操作前先停」，并且破坏性命令的权限提示要保持开启。

**5. 把任务清单放进文件里。**

前提：任务会跑较久。指令原文：

```
Keep a checklist in TASKS.md. Tick each item when it's done, and add anything new you find.
```

预期结果：一眼看到做完什么、还剩什么。原文理由：长任务会填满上下文窗口，Claude Code 随后会摘要较早的回合；写在文件里的清单能熬过这个过程。读这个文件，而不是读滚动回放。

**6. 大范围工作拆给子代理，并逐个核对证据。**

前提：审计、迁移、跨大代码库评审这类任务。原文示例：

```
Audit every service in services/ for the retry bug in the linked issue.
Give each service to its own subagent. When a subagent reports back, check its evidence before you accept it.
Finish with one table: service, affected yes or no, and the evidence.
```

预期结果：收到一张「服务 / 是否受影响 / 证据」的表，且每条结论你都先看过证据再接受。原文理由：早期测试者让 Opus 5.5 协调多个并行子代理做长审计和迁移，几乎不用盯着。

注意：做法 0-B 明确不做子代理分工，这一步要靠你自己发起。

**7. 长任务结束后，先读「它需要你做什么」的部分。**

比如它留给你决定的事、要你批准的改动，然后再读其余总结。原文理由：Opus 5.5 的进展更新和最终总结会说清做了什么、发现了什么、需要你什么。

要改总结格式就在 CLAUDE.md 里写，例如：

```
End every run with three headings: Blocked on me, Changed, Found.
```

**8. 在人工评审之前先让它做一轮代码审查。**

提示词原文：

```
Review the diff on this branch against main.
List only problems you'd block the merge for. For each one, give the file and line, why it's wrong, and how to show it fails.
```

预期结果：拿到一份「会阻塞合并」的问题清单，每条带文件、行号、错在哪、怎么证明它失败。原文理由（属早期测试者主张）：一位早期测试者称 Opus 5.5 在最低 effort 下抓到的 bug 比 Opus 5 在高 effort 下还多，误报更少；它还会用平实语言解释改动，PR 描述更好审。

如果你走的是做法 0-B，这一步尤其不能省：插件本身不做独立代码审查，只有你批准后的一次自检。

**9. 要求它标注自己无法确认的东西。**

在你的请求里加上：

```
Mark anything you couldn't confirm, and say where you looked
```

原文说这在 Claude 研究类回答和 Claude Code 里都适用；做完做法 0 的方案整理后，也可以加这句，分清哪些结论是查证过的、哪些只是推断。预期结果：你能分清哪些是查证过的、哪些只是它的推断。

### 做法 B：成对编程

**1. 反过来配置 CLAUDE.md。**

前提：你希望每一步都参与。在 CLAUDE.md 里写成：开始前先给一行计划，结束时给一段简短回顾。原文说两种方式 Opus 5.5 都遵守。

### Claude 应用里的补充做法

**1. 先确认模型选择器显示的是 Opus 5.5。**

**2. 直接附上图表 / 截图本身，不要手打数字。**

前提：信息在图片里。附上并问一个具体问题，例如：

```
Which of these services call the billing API directly?
```

原文理由：Opus 5.5 读图表、示意图、截图更准且不需要额外步骤，也更擅长依赖位置关系的含义（箭头连接哪些框、两版示意图之间改了什么、日历截图里会议几点开始几点结束）。

**3. 让它检查长文档的自相矛盾之处。**

提示词原文：

```
Check this deck for anything that contradicts itself: numbers, dates and names. Quote each problem and say where it is.
```

**4. 直接要成品文件，不要大纲。**

示例：

```
Make this a spreadsheet I can share: one row per vendor, with columns for cost, contract end date and owner.
```

原文理由：它做出的表格和文档在分享前需要的编辑比 Opus 5 少。

**5. 在项目（Project）里声明「已答过的问题视为定稿」。**

用于长对话中追加短问题变慢的情况。写进项目指令：

```
Once you have answered something, treat that answer as done. Focus on what I'm asking now, and don't go back over an earlier answer unless I ask about it or point out a problem with it.
```

适用条件（原文明确）：长链分析类项目不要加这条，因为后面的步骤可能暴露前面答案的错误。

**6. 设计类任务点名你不想要的风格。**

不要只说「别做得太平庸」（原文说这种笼统指令基本只是换一种默认风格）。示例：

```
Build a personal website with placeholder content.
Don't use a cream or off-white background, italic accent words in headings, numbered "01 / 02 / 03" section labels, monospace labels, or pill-shaped buttons.
```

后续动作：做完后先看它改用了什么；如果也不满意，把它加进这个清单再要一次。

**7. 来回式工作可以开 fast mode。**

在 Claude Code 里输入 `/fast`。前提条件（原文明确）：这是随 Opus 5.5 发布的研究预览功能，需要开启额外用量（extra usage），每 token 成本高于标准模式；换来的是同一个模型的文本更早到达。适用于你逐条等回复的来回式工作，不适用于长任务自主跑。

### 消息被安全策略拦截时

**1. 知道怎么切回、怎么先被询问。**

原文称 Opus 5.5 是首个带 Fable 级生物 / 网络安全防护的 Opus 模型；应用和 Claude Code 里大多数被标记的消息会转到较老的模型上继续，工作不中断；在源码中查找安全漏洞是被允许的，日常健康和教育问题也应正常。

- Claude 应用：会看到以 "Switched to" 开头的提示和较老模型名，对话留在该模型上。要回到 Opus 5.5，在模型选择器里选它；如果那条消息还在对话里，可能再次被标记，开新对话可以避免。想先被询问，去 Settings → Capabilities，关掉 "Switch models when a message is flagged"，会看到一张带选项的 "paused" 卡片。注意：检查覆盖对话里的全部内容，包括文件和搜索结果，所以标记可能来自更早的内容而非你最后一条消息。
- Claude Code：提示里会点名较老的模型，会话继续在该模型上。要切回，运行 `/model`；按两次 Esc 编辑上一条消息重试；想先被询问，运行 `/config` 修改 "Switch models when a message is flagged"；如果是误判，运行 `/feedback`。

**2. 不要在回复里要求它复现内部推理。**

这是会被拒的类别之一。改为要你需要的东西，例如：

```
Explain why you chose this approach in three sentences.
```

## 怎么判断变好了

收尾清单（出自 Opus 5.5 指南原文），可以直接当检查表用，每一条都是可观察的：

- 提问侧：任务写清了「完成」长什么样；提示词和保存的指令里没有 "think hard" 类句子；设计请求列出了要排除的风格；图表和截图是附件而不是重打的数字。
- Claude Code 长任务侧：CLAUDE.md 写明何时停何时继续、破坏性操作前必停；破坏性命令的权限提示仍然开启；大型审计和迁移拆给了子代理；任务清单保存在 TASKS.md 里。
- 核查侧：先读报告里「需要你」的部分；人工评审前先跑了一轮审查；研究类回答标注了无法确认的内容。
- 拦截侧：知道怎么切回（模型选择器或 `/model`）；"Switch models when a message is flagged" 按你的意愿设置。

做法 0-A 侧（指标原文未提供，需自设并记录）：实现前是否发现至少一个需求矛盾或遗漏；方案确认后写出的代码 / 页面与验收标准的偏差次数；因理解错需求导致的返工次数和返工时间；从提出想法到首次可验收版本的交互轮次。

做法 0-B 侧（原文没有给出任何效果指标，下面几条是报告的试用建议）：

- **返工轮数**：从首次交付到「我想要的」之间需要几轮修改。
- **理解偏差类问题数**：事后 review 中属于「它做错了东西」而非「它写错了代码」的问题条数。
- **设计阶段耗时**：从提出需求到你按下批准的时间。原文卖点是这一步很「快」，如果明显拉长（提问过多、反复给方案），说明这条路不适合你的任务类型。
- **中途改道次数**：它在构建中停下来说「设计有问题」的次数——偏高说明前期提问/确认不够，偏低且最后发现理解错了说明闸门形同虚设。
- **完成总结的可核对性**：它给的「我建了什么、我怎么检查的」总结，是否能让你不读代码就判断改动范围。

做法 A 侧：一次运行中途问你「要不要继续」的次数是否变少；子代理汇报是否附了可核对的证据，最终表是否完整；它标注的「无法确认」项与你事后发现的盲区是否吻合；合并前审查给出的阻塞项里，多少是真问题、多少是误报。

最小试用方式（做法 0-B，报告建议的对照法）：

1. 选一个你近期真实要做的、规模在 1–3 小时内的编码任务（不要用玩具任务，也不要上大重构）。
2. 按做法 0-B 第 1–3 步安装并做冒烟验证，确认 skill 被加载、且它在写代码前先提问。
3. **做对照**：同一个任务，先在**不装插件**的会话里让智能体直接构建一遍（或回忆上次同类任务的经历），记录结果；再在装插件的会话里做一遍。只做后者看不出改善。
4. 观察并记录四个检查点是否发生：它是否回写「目标 / 受众 / done 定义」给你确认；是否声明选了哪条路径；是否在你批准前一行代码都没写；批准后是否在同一会话里直接开工而不是转去写计划。
5. 若走 Architectural 路径，检查 spec 是否真的落到 `docs/specs/`，以及它是否遵循了你项目的测试与提交约定。

最小试用方式（做法 A）：挑一个你手头的真实长任务，按做法 A 的 1–9 步跑一遍；如果这个任务的需求本身还模糊，先按做法 0 做一轮澄清再进 A。先不全面铺开。两篇原文都没有给出试用时长和量化阈值，试多久由你按任务长度决定（0-B 建议落在 1–3 小时的任务上）。

什么时候不该继续用 0-B：任务需要强制测试先行、需要独立代码审查、或需要并行多代理时——原文自己说了这类场景应回到上游 Superpowers。

## 常见坑

- 需求已经明确还硬要先澄清。原文的适用场景是「需求未想清楚」，小改动或需求清楚时先澄清可能只增加交互轮次，原文未讨论这个成本。
- 把做法 0-A 当成完整的 6 条技巧。采集文本只保留第 1 条，其余 5 条无法核实，第 2–4 步是按提示词语义推导的最小流程。
- 装了 superbrainstorming 却没新开会话。session-start hook 只在会话开始时生效，不新开会话就不会触发。
- 同时装着 Superpowers。两个插件都带 `brainstorming` skill 和 session-start hook，会互相冲突（Superpowers 那一版会转去「写计划」而不是直接构建），安装前先在 `/plugin` 里禁用或卸载它。
- 跳过冒烟验证。发一句 `Let's make a react todo list` 就能看出 skill / hook 有没有生效；不出现「先问这个应用是做什么用的」就说明没生效。
- 把 `.superbrainstorming/` 提交进仓库。视觉伴侣生成的 mockup 存在这个目录，记得加进 `.gitignore`。
- 以为插件的轻量配置是通用规律。它删掉了 TDD、子代理和独立代码审查，「当前模型能自己走完」只是作者主张，没有对照数据；高风险或需要可审计的代码库要么用上游 Superpowers，要么手动补做法 A 的第 6、8 步。
- 试用时只跑装了插件的那一遍。没有对照就看不出改善，也没有基线可比。
- 拿玩具任务或大重构当试点。报告建议的任务规模是 1–3 小时的真实任务。
- 在非 Claude Code 宿主上等它自动触发。没有 session-start hook 时，要按名字显式要求它加载 `skills/brainstorming/SKILL.md`。
- 改了 `skills/brainstorming/SKILL.md` 或 `hooks/bootstrap.md` 就直接合并。这会改变智能体行为，要在真实会话里试过再合并。
- 让它自主跑就放松把关。规则让它可以继续跑，就意味着你更要保留自己的把关；「破坏性操作前先停」这条必须留在 CLAUDE.md 里，破坏性命令的权限提示也要保持开启。
- 靠读滚动回放看进度。长任务会填满上下文窗口，Claude Code 会摘要较早的回合；要看 TASKS.md。
- 还在提示词里写「think hard / think step by step」。前提是你用的确实是 Opus 5.5；要控制思考量就改 effort 设置，简单问题直接写 "Answer directly."。
- 用「别做得平庸」这种笼统说法排除设计风格。原文说这基本只是换一种默认风格，要列具体的排除项。
- 在长链分析类项目里加「已答过的问题视为定稿」。后面的步骤可能暴露前面答案的错误。
- 在回复里要求复现内部推理。这是会被拒的类别之一。
- 拦截后一直卡在原对话里。那条消息可能再次被标记，开新对话可以避免；标记也可能来自更早的内容（包括文件和搜索结果），不一定是最后一条消息。
- 把 fast mode 当成默认。它是研究预览功能，需要额外用量、每 token 更贵，只适合逐条等回复的来回式工作。

## 证据与来源

本手册合并三篇调研。

**一、Codex 6.1 需求澄清（做法 0-A）**

来源：X 推文 @goan999999，标题称 Codex 6.1 有 6 个「奇技淫巧」，采集文本只保留第 1 条。

- 原文证据：一条可直接复制的澄清提示词，以及适用痛点描述「页面出来了，需求理解错了」。推文互动数据为 31 点赞、8 转发、8 回复，但这不等于效果证据。
- 作者主张：标题称有 6 个技巧，但采集文本只包含第 1 条，无法核实其余 5 条，也无法判断整体方法是否完整。
- 原文没有给出案例、前后对比数据、返工率、代码正确率等结果指标；本手册中标为「自设」的验证指标均需你自己记录。
- 推导部分：操作步骤第 2–4 步是按提示词语义推导的最小流程，不是原文展开的完整流程。

**二、superbrainstorming 批准闸门（做法 0-B）**

来源：harrymunro/superbrainstorming 的 README（Superpowers 的 fork 与精简版）。

- 原文给出的可核验内容：三段安装/测试命令、一张三路径对照表、一个具体的验证提示词（`Let's make a react todo list`）及其预期行为、明确的前置冲突提醒（与 Superpowers 的 skill 与 hook 重名）、视觉伴侣的 opt-in / Node.js / 本地运行 / `.superbrainstorming/` 目录要求、仓库结构说明（`skills/brainstorming/`、`hooks/`）。这些足以照做。
- 只是作者主张、没有数据支撑：「当前模型能把已达成的设计保持在上下文里并自己走完」，因此删掉 TDD、子代理、逐任务代码审查是安全的——这是本 fork 存在的全部理由，原文没有任何对照数据或案例；「前沿模型用轻量版、旧模型用重流程」的分界线只给了模型名称，没有评估方法；原文提到的 Claude Opus 5.5、Sonnet 5.5、Fable 5.1 无法从本材料核实。
- 其他局限：仓库仅 31 stars；本次只依据 README 判断，未审查代码实现，技能提示词的实际内容与行为约束强度未知；未在真实项目中验证过任何一条行为描述（如「中途会停下来问你」）。
- 原文完全没有给出效果指标；`tests/brainstorm-server` 的 npm test 和 `tests/hooks/test-session-start.sh` 验证的是插件机制，不是工作效果。上面「怎么判断变好了」里的五个指标是报告建议的自设指标。

**三、Opus 5.5 长任务全套做法（做法 A / B 与 Claude 应用部分）**

来源：claude.dev 博客（作者 Addy Osmani，2026-09-22）的一篇 Opus 5.5 操作指南。文中的提示词、CLAUDE.md 规则、斜杠命令和收尾清单均按该文原文照抄。按证据强度分三类：

- 原文明确的前提条件，可直接当规则用：fast mode 是研究预览功能、需要开启额外用量且每 token 成本更高；长链分析类项目不要加「已答过的问题视为定稿」；拦截检查覆盖对话里的全部内容，包括文件和搜索结果；要求复现内部推理会被拒。
- 作者 / 厂商单方主张，没有可复现的量化证据：Opus 5.5 自主工作时间更长、会直白说明自己做了什么、每次回复前都会先思考；在多步骤长任务上比 Opus 5 撑得更久；读图表、示意图、截图更准；做出的表格和文档分享前需要的编辑更少；是首个带 Fable 级生物 / 网络安全防护的 Opus 模型。
- 转述的早期测试者说法，二手且无数据：让它跑数小时编码任务几乎不用盯着；协调多个并行子代理做长审计和迁移几乎不用盯着；在最低 effort 下抓到的 bug 比 Opus 5 在高 effort 下还多、误报更少。

三边的收益表述都来自厂商 / 作者一方，且 Opus 5.5 那套强绑定具体版本，因此整套做法按 try 使用，不要按 adopt 全面铺开。

## 依据的调研

- [Getting the most out of Opus 5.5 in Claude and Claude Code](../research/radar/2026-10-02/395-getting-the-most-out-of-opus-5-5-in-claude-and-cla.md)：值得一试，把这篇文章当作一份可直接照搬的 Opus 5.5 使用规程：在 Claude Code 里用「一句话交底 + 明确完成线 + CLAUDE.md 停走规则 + TASKS.md 清单 + 子代理分工 + 合并前审查」这套组合跑一个真实长任务，先小范围验证是否真的减少打断和返工。给 try 而不是 adopt，是因为所有收益表述都来自厂商/作者单方主张，且强绑定 Opus 5.5 这一具体版本，没有可复现的量化证据。
- [@goan999999: Codex 6.1 这 6 个“奇技淫巧”，建议你下次开工就试](../research/radar/2026-10-02/783-codex-6-1-6.md)：值得一试，建议在下一次用 Codex 写代码前先发送原文提示词，让模型先澄清目标用户、使用场景、验收标准并指出矛盾，方案确认后再实现；理由是原文给出了可直接复制的提示词，但采集文本只保留六条中的第一条，且没有效果数据，适合小范围试。
- [harrymunro/superbrainstorming](../research/radar/2026-10-05/1275-harrymunro-superbrainstorming.md)：值得一试，可以在一两个真实开发任务上小范围试装 superbrainstorming：它把「先对齐设计、人工批准、再动手写码」做成了 Claude Code 里的固定流程，安装和验证步骤在原文中写得很清楚；但效果主张没有数据支撑，且它砍掉了上游的 TDD、子代理与代码审查，是否够用取决于你用的模型和任务风险。
