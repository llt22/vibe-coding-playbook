# Getting the most out of Opus 5.5 in Claude and Claude Code

- 结论：**值得一试**。把这篇文章当作一份可直接照搬的 Opus 5.5 使用规程：在 Claude Code 里用「一句话交底 + 明确完成线 + CLAUDE.md 停走规则 + TASKS.md 清单 + 子代理分工 + 合并前审查」这套组合跑一个真实长任务，先小范围验证是否真的减少打断和返工。给 try 而不是 adopt，是因为所有收益表述都来自厂商/作者单方主张，且强绑定 Opus 5.5 这一具体版本，没有可复现的量化证据。
- 原文：https://claude.dev/blog/getting-the-most-out-of-opus-5-5/
- 来源：rss:claude.dev，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T01:27:33.349Z

## 是什么

这是 claude.dev 博客（作者 Addy Osmani，2026-09-22）的一篇操作指南，讲怎么在 Claude 应用和 Claude Code 里使用 Opus 5.5。它给出了三个方向的成套做法：怎么写提示词、怎么驾驭一次长任务、怎么核查结果，另外还讲了被安全策略拦截时的处理步骤和一个速度模式。

文章开篇自述 Opus 5.5 的三点行为差异：自主工作时间更长、会直白说明自己做了什么、每次回复前都会先思考。全文最有价值的部分是其中可直接复制的提示词、CLAUDE.md 规则、斜杠命令和一套收尾检查清单。

## 具体做法

以下步骤与代码块均按原文照抄，前提条件也按原文标注。

### A. 怎么写提示词

1. **一次性交底整个任务，并写明「完成」长什么样**。前提：你清楚验收标准。原文示例（Claude Code）：

```
Migrate the payment endpoints from the old client to the new one.
Done means: every endpoint uses the new client, the old client is deleted, and the test suite passes.
Stop and ask me only if a test fails for a reason you can't explain.
```

   原文理由：Opus 5.5 在多步骤长任务上比 Opus 5 撑得更久，早期测试者让它跑数小时编码任务而几乎不用盯着；有了明确完成线，它自己知道什么时候算完。

2. **删掉「think carefully」「think step by step」这类话**，包括提示词和已保存的指令。前提：你用的确实是 Opus 5.5。原文理由：它每次回复前都会思考，并由自己决定思考多少。要快速回答简单问题时，直接写 “Answer directly.”；要在 Claude Code 里调整思考量，改 effort 设置。

3. **任务跑到一半想起补充要求时，直接打字追加**，不用重启。在 Claude Code 里趁它工作时输入消息并按 Enter，例如：

```
Also keep the old endpoint names as aliases.
```

   原文理由：现在长任务跑得久，重启代价更大。

4. **做设计类任务时，点名你不想要的风格**，不要只说「别做得太平庸」（原文说这种笼统指令基本只是换一种默认风格）。示例：

```
Build a personal website with placeholder content.
Don't use a cream or off-white background, italic accent words in headings, numbered "01 / 02 / 03" section labels, monospace labels, or pill-shaped buttons.
```

   前提与后续动作：做完后先看它改用了什么；如果也不满意，把它加进这个清单再要一次。

### B. 在 Claude Code 里驾驭长任务

5. **在 CLAUDE.md 里写清楚「什么时候停、什么时候继续」**。前提：项目根目录有或可新建 CLAUDE.md；按项目实际修改。原文原文：

```
When a step doesn't need my input, keep going. Put status notes in the same message as your next action.
Stop and ask only when you can't continue without me, or before anything destructive: deleting data, force-pushing, or changing anything outside this repository.
```

   原文补充：如果一次运行以 “Want me to continue?” 停下，回一句 “continue” 即可；如果经常这样，上面这条规则能减少停顿。规则让它可以继续跑，就意味着你更要保留自己的把关——所以规则最后一行要保留破坏性操作前先停，并且**破坏性命令的权限提示要保持开启**。

6. **成对编程场景反过来配置**。前提：你希望每一步都参与。在 CLAUDE.md 里写成：开始前先给一行计划，结束时给一段简短回顾。原文说两种方式 Opus 5.5 都遵守。

7. **大范围工作拆给子代理，并逐个核对证据**。前提：审计/迁移/跨大代码库评审这类任务。原文示例：

```
Audit every service in services/ for the retry bug in the linked issue.
Give each service to its own subagent. When a subagent reports back, check its evidence before you accept it.
Finish with one table: service, affected yes or no, and the evidence.
```

   原文理由：早期测试者让 Opus 5.5 协调多个并行子代理做长审计和迁移，几乎不用盯着。

8. **把任务清单放进文件里**。前提：任务会跑较久。指令原文：

```
Keep a checklist in TASKS.md. Tick each item when it's done, and add anything new you find.
```

   原文理由：长任务会填满上下文窗口，Claude Code 随后会摘要较早的回合；写在文件里的清单能熬过这个过程，让你一眼看到做完什么、还剩什么。读这个文件，而不是读滚动回放。

### C. 核查结果

9. **长任务结束后，先读「它需要你做什么」的部分**，比如它留给你决定的事、要你批准的改动，然后再读其余总结。前提：无。原文理由：Opus 5.5 的进展更新和最终总结会说清做了什么、发现了什么、需要你什么。要改总结格式就在 CLAUDE.md 里写，例如：

```
End every run with three headings: Blocked on me, Changed, Found.
```

10. **在人工评审之前先让它做一轮代码审查**。提示词原文：

```
Review the diff on this branch against main.
List only problems you'd block the merge for. For each one, give the file and line, why it's wrong, and how to show it fails.
```

    原文理由：一位早期测试者称 Opus 5.5 在最低 effort 下抓到的 bug 比 Opus 5 在高 effort 下还多，误报更少；它还会用平实语言解释改动，PR 描述更好审。

11. **要求它标注自己无法确认的东西**。在请求里加上：

```
Mark anything you couldn't confirm, and say where you looked
```

    原文说这在 Claude 研究类回答和 Claude Code 里都适用。

### D. 在 Claude 应用里

12. **先确认模型选择器显示的是 Opus 5.5**。

13. **直接附上图表/截图本身，不要手打数字**。前提：信息在图片里。附上并问一个具体问题，例如：

```
Which of these services call the billing API directly?
```

    原文理由：Opus 5.5 读图表、示意图、截图更准且不需要额外步骤，也更擅长依赖位置关系的含义（箭头连接哪些框、两版示意图之间改了什么、日历截图里会议几点开始几点结束）。

14. **让它检查长文档的自相矛盾之处**。提示词原文：

```
Check this deck for anything that contradicts itself: numbers, dates and names. Quote each problem and say where it is.
```

15. **直接要成品文件，不要大纲**。示例：

```
Make this a spreadsheet I can share: one row per vendor, with columns for cost, contract end date and owner.
```

    原文理由：它做出的表格和文档在分享前需要的编辑比 Opus 5 少。

16. **在项目（Project）里声明「已答过的问题视为定稿」**，用于长对话中追加短问题变慢的情况。写进项目指令：

```
Once you have answered something, treat that answer as done. Focus on what I'm asking now, and don't go back over an earlier answer unless I ask about it or point out a problem with it.
```

    适用条件（原文明确）：**长链分析类项目不要加这条**，因为后面的步骤可能暴露前面答案的错误。

### E. 消息被安全策略拦截时

17. 原文称 Opus 5.5 是首个带 Fable 级生物/网络安全防护的 Opus 模型；应用和 Claude Code 里大多数被标记的消息会转到较老的模型上继续，工作不中断；在源码中查找安全漏洞是被允许的，日常健康和教育问题也应正常。
    - Claude 应用：会看到以 “Switched to” 开头的提示和较老模型名，对话留在该模型上。要回到 Opus 5.5，在模型选择器里选它；如果那条消息还在对话里，可能再次被标记，**开新对话可以避免**。想先被询问，去 Settings → Capabilities，关掉 “Switch models when a message is flagged”，会看到一张带选项的 “paused” 卡片。注意：检查覆盖对话里的全部内容，包括文件和搜索结果，所以标记可能来自更早的内容而非你最后一条消息。
    - Claude Code：提示里会点名较老的模型，会话继续在该模型上。要切回，运行 `/model`；按两次 Esc 编辑上一条消息重试；想先被询问，运行 `/config` 修改 “Switch models when a message is flagged”；如果是误判，运行 `/feedback`。
18. **不要在回复里要求它复现内部推理**。这是会被拒的类别之一。改为要你需要的东西，例如：

```
Explain why you chose this approach in three sentences.
```

### F. 速度

19. **在你逐条等回复的来回式工作里开 fast mode**。在 Claude Code 里输入 `/fast`。前提条件（原文明确）：这是随 Opus 5.5 发布的研究预览功能，需要开启额外用量（extra usage），每 token 成本高于标准模式；换来的是同一个模型的文本更早到达。

### G. 原文自带的收尾清单

- 提问：任务写清「完成」长什么样；提示词和保存的指令里没有 “think hard” 类句子；设计请求列出了要排除的风格；图表和截图是附件而不是重打的数字。
- Claude Code 长任务：CLAUDE.md 写明何时停何时继续、破坏性操作前必停；破坏性命令的权限提示仍然开启；大型审计和迁移拆给子代理；任务清单保存在文件里。
- 核查：先读报告里「需要你」的部分；人工评审前先跑一轮审查；研究类回答标注了无法确认的内容。
- 拦截：知道怎么切回（模型选择器或 `/model`）；“Switch models when a message is flagged” 按你的意愿设置。

## 对应的研究问题

**1. 能力发现（哪些还没想到交给 AI 的工作）**
- 直接上传图表/示意图/日历截图并问依赖空间位置的问题（箭头连哪两个框、两版图之间改了什么、会议几点开始几点结束），而不是把图转成文字——这是原文明确点出的「不需要额外步骤」的能力。
- 要成品文件（可分享的表格、文档）而不是大纲。
- 把 diff/PR 的合并前审查整体交给它先跑一轮。
- 用自然语言做长文档的内部一致性检查（数字、日期、名称自相矛盾之处）。
- 把跨大代码库的审计/迁移拆给多个子代理并行做。

**2. 任务匹配（什么工作配什么模型/工具/协作方式）**
- 长、多步骤、有明确完成线的工作（如贯穿大仓库的改动直到测试通过）适合让 Opus 5.5 一次交底后自主跑。
- 需要你逐条读回复再发下一条的来回式工作，用 Claude Code 的 `/fast`（同模型、更快、更贵、研究预览）。
- 思考量由模型自己决定；要干预在 Claude Code 里改 effort，而不是写「think hard」。
- 成对编程 vs 自主长任务，是两种要用 CLAUDE.md 反向配置的协作方式。
- 简单问题用 “Answer directly.” 明确要求直接回答。

**3. 条件供给（要提供什么信息、工具、权限、反馈）**
- 信息：一句话说明整个任务 + 明确的「完成」定义 + 什么情况下才停下问你；设计任务要给出具体的排除风格清单。
- 工具/配置：CLAUDE.md 的停走规则与总结格式（如 “Blocked on me, Changed, Found”）；TASKS.md 作为外部任务清单；`/model`、`/config`、`/feedback`、`/fast` 这些命令；子代理。
- 权限：长跑规则让它可以继续，前提是破坏性命令的权限提示保持开启，并在规则里写明破坏性操作前必须停下问。
- 反馈：任务进行中直接打字追加要求；发现不满意的设计默认风格就持续往「不要」清单里加；误拦截用 `/feedback`。

**4. 主动推进（由时间/事件/状态触发并持续完成）**
- 触发条件是**状态**而非时间：以「测试通过」「每个端点都迁移完」这类完成线作为终止判据，模型据此自行判断何时结束。
- 长任务中途不因非阻塞事项停下来汇报（原文描述它会给出不阻塞工作的选项列表、只报下一步而不做），用 CLAUDE.md 规则把这类停顿去掉，让它持续跑。
- 清单落在 TASKS.md 这类文件上，可跨上下文摘要存活，使长任务在上下文被压缩后仍然可续、可查。
- 多个子代理并行分工推进审计/迁移，并由主代理汇总成一张表。

**5. 效果验证（怎么判断确实改善了结果）**
- 要求子代理回报时附证据，且在接受前核对证据。
- 合并前审查提示词要求：只列会阻止合并的问题，每条给出文件与行号、为什么错、怎么证明它会失败。
- 研究和分析类请求要求标注「无法确认的内容以及查过哪里」。
- 长跑结束后先读「需要你」的部分，再读其余总结；总结格式可用 CLAUDE.md 固定为 Blocked on me / Changed / Found 三段。

## 与已有做法的关系

- **Claude Code（adopt）**：高度相关且是本文的主战场。文中多条做法直接作用于 Claude Code 的既有机制——CLAUDE.md 规则文件、破坏性命令的权限提示、子代理、上下文窗口摘要行为，以及 `/model`、`/config`、`/feedback`、`/fast` 等命令。可以作为 Claude Code 条目下的「提示词与长任务驾驭规程」补充。
- **Claude Code Mods（study）**：本文没有提到 mods，无直接关系。
- **Cline（watch）**：本文没有提到 Cline，无直接关系。

## 证据与局限

**原文给出的数据/案例（均为少量、无量化）**
- 「在我们的聊天产品测试中，删掉一句 ‘think carefully’ 让回复更快开始，且质量没有明显下降」——作者自测，无样本量、无指标定义。
- 「早期测试者让它跑数小时编码任务，几乎不用盯着」「早期测试者让它协调并行子代理做长审计和迁移」。
- 「一位早期测试者说 Opus 5.5 在最低 effort 下抓到的 bug 比 Opus 5 在高 effort 下还多，误报更少」——单一用户的主观比较。
- 「在我们的测试中，它在一个很长的规划讨论串里抓出一个日期落在错误的星期几，以及一份 deck 里图表和数字不符」。
- 防护方面：「大多数被标记的消息会转到较老模型」，「这些防护有时会误标合法工作，我们正在调低误标率」。

**哪些只是主张**
- 「Opus 5.5 比 Opus 5 在长多步骤工作上更好」「读图表更准」「更关注细节」「做出的表格文档需要更少编辑」——都是无对照、无指标的厂商/作者陈述。
- 「每次回复前都会思考」「删除 think 类指令不会降低质量」——属于行为描述与经验断言。
- 关于安全防护的范围和允许事项（源码漏洞查找允许、日常健康与教育问题正常）属于政策陈述，非可验证步骤。

**适用条件**
- 强绑定 Opus 5.5 这个具体模型版本；换模型后「不要 think hard」「effort 控制」等前提可能不成立（文章本身就是相对 Opus 5 的对比）。
- 部分能力只在 Claude 应用（图片理解、成品文件、Project 指令）或只在 Claude Code（CLAUDE.md、子代理、`/fast`、`/model`、`/config`）里成立，不能混用。
- `/fast` 是研究预览，需开启额外用量且单价更高；不是默认免费能力。
- 第 16 条「已答问题视为定稿」明确不适用于长链分析类项目。
- 安全防护存在误标，可能导致工作中途切到较老模型；开启「先询问」会带来你自己的决策成本。
- 全文没有基准测试、没有可复现实验设计、没有任何量化结果，属于单一厂商博客的操作建议。

## 怎么试、怎么验证

**最小试用（建议 1 个真实长任务，1–2 小时）**
1. 先只在 Claude Code 里做一件事：把第 5 条的 CLAUDE.md 停走规则写进项目，并按项目改写「破坏性操作」清单；确认破坏性命令的权限提示仍是开启的。
2. 挑一个边界清晰、有客观完成线的任务（原文给的迁移任务就是模板）。写一句话任务 + 「Done means: ...」+ 「只在无法继续或破坏性操作前停下问我」，一次性发出。
3. 让它把清单写进 TASKS.md（第 8 条），过程中需要补充就趁它跑着追加消息（第 3 条），不要重启。
4. 任务结束后按第 9 条先读「需要你」的部分；用第 10 条提示词跑一轮合并前审查，再由人评审；对研究类部分用第 11 条要求标注无法确认之处。
5. 可选：对跨多服务/多模块的审计类任务（第 7 条）试一次子代理分拆，并要求每个子代理附证据。

**判断有没有改善的指标（建议先记录本次基线，再对比下次）**
- 非必要停顿次数：一次长任务里出现多少次「Want me to continue?」或只汇报不推进的总结。
- 人工介入次数与重述次数：你被迫重新解释上下文或重启任务的次数。
- 合并前审查的有效产出：只列阻塞项时，抓到的问题数、其中你认可的占比、误报数（对应「更低误报」这一主张）。
- 交付质量：完成后测试是否通过、成品文件（表格/文档）在分享前你实际改动了几处。
- 时间：从发指令到完成线的实际耗时，以及与开启 `/fast` 时逐轮等待的体感/计时差异（注意成本上升）。
- 可追溯性：TASKS.md 是否能独立说明「做完什么、还剩什么」，你是否还在翻滚动回放。
- 若中途被安全策略切到较老模型，记录发生频率和是否属于误标（用 `/feedback` 反馈）。

**结论怎么下**：如果在 2–3 个真实任务上，非必要停顿和人工重述次数明显下降、测试/交付质量不降、误报没有增加，就可以把这套规程写进手册；若只是「感觉更快」而没有上述任一项改善，就保持 try 或降级为 study。
