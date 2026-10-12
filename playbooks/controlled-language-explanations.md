# 让编码 agent 把 runbook 改写成低歧义的操作步骤

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何让编码 agent 按简化技术英语规则改写 runbook、操作步骤和解释，并在文本仍不够时按最低理解阶梯升级，减少歧义和误读，同时保住事实与限定条件。
> 先试这一步：挑一份团队真实在用的 runbook 或 API how-to，用 STE-Prompt 的 `/ste`（或把 10 条 STE 规则粘贴进对话）改写，保留原文，并让 2–3 位同事按改写稿实际执行一次。
> 最近修订：2026-10-13

## 解决什么问题
让编码 agent 按简化技术英语（Simplified Technical English，STE／ASD-STE100 风格）改写解释、runbook 和操作步骤，减少两处常见歧义：对冲式措辞和把多个主张塞进一句的复合句。若文本本身仍不足以让人理解，再按“最低够用”的理解阶梯升级为图表、交互页或视频。重点是先保住事实、数字、条件、限定词，再降低阅读与执行成本；所有做法目前都只有作者主张和少量示例，适合小范围试用，不宜直接当团队定稿规范。

## 适用与不适用
适用：
- 程序性文本：procedures、runbooks、agent step logs、API how-tos 的改写。
- 需要跨读者一致理解的技术说明类文本。
- 你或他人需要读懂的一段模型输出、代码、协议、流程说明、对外文档。
- 事实密集的技术说明或状态更新，适合做零安装最小试用。
- 有“某个参数会改变结果”“过程/因果/状态/组件”“随时间展开的推导”等内容，可能适合从文本升级为图表、交互页或视频。

不适用或慎用：
- 需要细微差别、风险讨论、研究综述的场合；这些地方“对冲”本身就是内容，强行 STE 会丢失信息。
- 需要表达丰富度、自然语气、文学性的写作；受控语言的一般代价是牺牲表达丰富度和自然度。
- 不要把它当成已验证有效的通用方法：STE-Prompt、understanding-ladder 和 @karpathy 的提示词都没有给出效果数据或对照实验。
- 不要一律把简单定义升级成 HTML 或视频；选择最低的、足以完整回答问题的阶梯。
- `plain-chinese` 是给 LLM 的轻量规则集，不是完整写作标准；句长之类的数字是经验法则。
- STE-Prompt 自称不复制 ASD-STE100 规范文本，只提供受公开描述启发的原创指引，所以产出未必等同于正式标准合规文本。

## 前置条件
- 一个“需要被准确理解”的解释对象，例如一份团队真实在用的 runbook、一段代码、一个协议、一份流程说明、一个对外文档，最贴合的起点是你自己或他人需要读懂的一段模型输出。
- 至少 2–3 位不了解背景的读者，用于做前后对照。
- 若走 STE-Prompt 路线 A：使用 Claude Code，且支持 plugin marketplace。
- 若走手动/AGENTS.md 路线：有写入 `.claude/commands/`、`.claude/output-styles/`、`AGENTS.md` 或 `~/.codex/AGENTS.md` 的文件权限。
- 若走做法 B：自备 ASD-STE100 规范文本；本次材料没有提供规范内容，也不知道模型是否内置该规范。
- 若走理解阶梯进阶：使用支持 Agent Skills 的客户端（原文列出 Claude Code、Codex、Cursor 等），有安装权限。
- 中文输出依赖 `plain-chinese` 规则集；本次抓取到的只有 README，分类逻辑细节和 15 条中文规则原文在未抓取的 SKILL.md 里，无法据此复现全部规则。
- 阶梯 4 只写分镜，渲染依赖外部视频工具（showtime 0.4.0+）。

## 操作步骤
1. 选定一个需要被准确理解的对象。前提：你手里有具体文本，且有真实读者。预期结果：得到一个明确的改写对象，而不是泛泛地“让模型写得更好”。优先选程序性文本：runbook、操作步骤、agent step log、API how-to。

2. 选一种改写方式并执行。目标都是让 agent 用简化技术英语写解释、runbook 和步骤。

   做法 A：STE-Prompt 的 Claude Code 插件（调研推荐，前提：Claude Code 支持 plugin marketplace）。
   ```
   /plugin marketplace add menonpg/ste-prompt
   /plugin install ste-prompt@menonlab
   ```
   安装后你会得到 `/ste` 斜杠命令、会自动触发的 `simplified-technical-english` skill，以及完整规则集与词典。使用：
   ```
   /ste            rewrite the previous answer in Simplified Technical English
   /ste <text>     rewrite the given text in STE
   ```
   预期结果：agent 按需改写上一段回答或给定文本；但效果只有作者主张，没有数据。

   做法 B：手动安装或让 Codex 等 agent 默认使用 STE（前提：已把仓库文件下载到本地）。
   - 手动复制命令：
   ```
   cp claude/commands/ste.md .claude/commands/
   ```
   或全局：
   ```
   cp claude/commands/ste.md ~/.claude/commands/
   ```
   若要变成持续生效的写作风格，把 `claude/output-styles/ste.md` 复制到 `.claude/output-styles/`，然后用 `/output-style` 选中它。
   - Codex / 其他读 `AGENTS.md` 的 agent 按项目生效：
   ```
   cat AGENTS.ste.md >> AGENTS.md
   ```
   全局生效：
   ```
   mkdir -p ~/.codex && cat AGENTS.ste.md >> ~/.codex/AGENTS.md
   ```
   同一份 `AGENTS.md` 追加方式适用于 Cursor、Cline、Aider、Windsurf、OpenClaw 等读取 `AGENTS.md` 约定的 agent。预期结果：STE 行为随仓库或全局配置存在，默认生效；但原文未在这些工具上验证。

   做法 C：零安装按需提示词（前提：无需安装）。
   - 把 `AGENTS.ste.md`（或 `RULES.md`）粘贴进任意 Codex / ChatGPT / Gemini / Cursor 对话，加上指令：
   ```
   rewrite the above in Simplified Technical English using these rules.
   ```
   - 或复现当前正文里的最低成本方式：
   ```
   Ask your LLM to explain something in ASD-STE100.
   ```
   落地时可以写成：
   ```
   Explain <要解释的内容> in ASD-STE100.
   ```
   - 零安装“80% 到 ASD-STE100”提示词（Karpathy 的“80%”加上最关键的一条规则）：
   ```
   Write about 80% of the way to ASD-STE100: one idea per sentence, one term per meaning, active voice, no filler. Cut nothing — keep every fact, number, condition, and hedge; just make the sentences clean.
   ```
   前提：把原文一并给模型。预期结果：得到一版更干净的文本，且不删事实、数字、条件、限定词。

   怎么选：
   - 想最小试、不安装：先用做法 C，尤其是“80% 到 ASD-STE100”提示词或粘贴规则集。
   - 用 Claude Code、想获得 `/ste` 和自动 skill：用做法 A。
   - 用 Codex 等读 `AGENTS.md` 的 agent，或希望行为随仓库走：用做法 B。
   - 如果你的目标就是检验模型是否真的按 ASD-STE100 规范写，并且你能提供规范文本，用“做法 B：把规范文本放进上下文”（这是推断做法，本次材料没有规范内容）。
   - 差异提示：做法 A 只给规范名称，无法确认模型是否真的按规范写；STE-Prompt 给的是受 ASD-STE100 公开描述启发的原创规则，未必等同正式标准；“80% 到 ASD-STE100”自称只是 80%，不是完整标准。

3. 用 STE 的 10 条精简规则检查改写稿。前提：你拿到了一版改写稿。规则如下，可直接照用：
   1. 程序性句子控制在 20 词以内；描述性句子 25 词以内。
   2. 一句一个指令。
   3. 使用主动语态。
   4. 程序性内容用现在时。
   5. 指令以命令动词开头（"Remove the bolt."）。
   6. 使用冠词（"the file"，不是 "file"）。
   7. 不要把名词当动词用。
   8. 只用批准词——一词一义（见 `DICTIONARY.md`）。
   9. 一段一个主题，首句为主题句。
   10. 超过三个条件或步骤时，用纵向列表。
   预期结果：文本变成可机械检查的 STE 风格；完整规则见 `RULES.md`，批准动词替换见 `DICTIONARY.md`（原文未展开这两份文件内容）。

4. 如果问题不只是“文本难读”，而是“该用什么形式解释”，安装 understanding-ladder 技能（可选，进阶）。前提：使用支持 Agent Skills 的客户端，有安装权限。安装三选一：
   - 通用方式：
   ```
   npx skills add ChangWenC/understanding-ladder
   ```
   - Claude Code 插件：
   ```
   /plugin marketplace add ChangWenC/understanding-ladder
   /plugin install understanding-ladder@understanding-ladder
   ```
   - 手工克隆到 Claude Code 全局 skills 目录：
   ```
   git clone --depth 1 https://github.com/ChangWenC/understanding-ladder.git
   cp -r understanding-ladder/skills/* ~/.claude/skills/
   ```
   预期结果：技能靠 description 自动命中。可直接提问触发，原文给的示例：
   ```
   Help me understand how learning rate affects convergence.
   Explain the TLS 1.3 handshake the clearest way.
   An agent wrote this plan — help me see what it actually does.
   Walk me through the Fourier series from rung 1 to rung 4.
   ```

5. 让它按内容类型自动选最低够用的阶梯。前提：已安装技能，或你愿意手工按映射表要求模型。核心分派表：
   | 内容类型 | 阶梯 | 输出形式 |
   |---|---|---|
   | 定义、事实、流程 | 阶梯 1 | 文本（英文约 80% ASD-STE100，中文用 `plain-chinese`） |
   | 过程、因果、状态、组件 | 阶梯 2 | 图表（Mermaid / SVG + “这张图怎么读”） |
   | 某个参数会改变结果 | 阶梯 3 | 单文件 HTML，带滑块，双击即可打开 |
   | 随时间展开的推导 | 阶梯 4 | 视频：出分镜 + 旁白，交给 showtime ≥ 0.4.0 用 `--from-storyboard` 渲染 |
   预期结果：输出形式刚好够回答问题。选择最低的、足以完整回答问题的阶梯，不要爬得比问题需要得更高；如果一条简单定义被做成动画视频，说明分派逻辑没生效。

6. 遵守三条贯穿所有阶梯的规则。前提：无论用哪个阶梯，都先有可检查的阶梯 1 文本草稿。三条规则是：
   - 不删内容：用简单语言，不是更少内容；每个数字、条件、限定词都要留下。
   - 先出草稿：任何图表、页面、视频都从一份可检查的阶梯 1 文本草稿开始。
   - 结尾附“该检查什么”。
   预期结果：每个图表、页面、视频都能回溯到事实完整的文本草稿，末尾有检查清单。注意：这三条是作者倡导的做法，没有对照实验。

7. 阶梯 4 渲染（如果用到）。前提：已装 showtime 0.4.0+。技能只负责写 storyboard，渲染由外部视频工具完成，例如：
   ```
   showtime new <template> <dir> --from-storyboard storyboard.md
   ```
   （原文说明支持英文或中文表头。）预期结果：得到可播放的视频，但渲染质量与事实正确性仍要人工检查。

8. 把改写结果和原解释并排给人读。目的不是“读起来更顺”，而是看读者是否更快、更少追问地得到正确理解。前提：有 2–3 位不了解背景的读者。预期结果：得到一组可比较的读者反馈，进入下一节判断。程序性文本还可让同事按改写后的 runbook 实际执行，记录提问次数、误读次数、完成时间。

## 怎么判断变好了
最小试用方式：
1. 半天内先做零安装或插件最小试用：选一份团队真实在用的运行手册或 API how-to，保留原始版本作为对照。
2. 在 Claude Code 里按做法 A 安装（或按做法 B 把 `AGENTS.ste.md` 追加进该仓库的 `AGENTS.md`；不安装则按做法 C 粘贴规则或提示词）。
3. 让它重写该文档，或对已生成的解释执行 `/ste`。
4. 把改写稿与原文并排保存，供后续 A/B 对照。
5. 找 2–3 位不了解背景的同事各读一版，做两件事：
   - 记录读完所需时间和中途提问次数；
   - 让对方用自己的话复述一遍，标出与原意不符的点；程序性文本可让其按改写后的 runbook 实际执行，记录提问次数、误读次数、完成时间。
6. 进阶试用：按操作步骤安装 understanding-ladder 后，分别拿三类内容各一条去问——一条定义/事实、一条流程或因果关系、一条含“某个参数会改变结论”的说明——观察它是否分别落到文本、图表、交互页，以及有没有把简单问题过度升级成 HTML 或视频。

可观察指标：
- 事实保全：逐条比对原文与产出，数字、条件、限定词是否一个没少。这是最强调的一条，也是最容易失败的一条。
- 程序性句子是否 ≤20 词、描述性句子是否 ≤25 词。
- 每句是否只有一个指令；主动语态句占比、被动句数量。
- 每段是否只有一个主题；指令是否以命令动词开头。
- 是否出现非批准词、名词当动词、缺失冠词（对照 `DICTIONARY.md`）；条件/步骤超过三条时是否已改为纵向列表。
- 理解成本：需要追问的次数是否下降；读完需要多久。
- 复述时出现的事实性偏差数量是否减少。
- 同一段内容被不同读者复述出的版本是否更一致。
- 形式是否够用而非过度：产出形式是不是刚好够回答问题；如果一条简单定义被做成动画视频，说明分派逻辑没生效。
- 警惕反向效果：特意在内容里留一个错误或遗漏，看自己是否因为产出“看起来精致”而漏检——这正是原文所说的“精致产出降低警惕”。
- 同一人分别读原文与改写稿，记录“需要回读的句子数”。

失败信号：简化时丢掉了限定词和条件；或者阶梯选择总是往上跳，把任何输入都做成图和视频。

试多久：本次材料没有给出时长。建议至少完成一轮上述对照（同一份内容、2–3 位读者或一次实际执行）后，再决定是否扩大到更多文本或团队范围。注意：原文没有提供任何基线数据，所以只能做自建的前后对照，不要引用本条线索去声称“已被验证有效”。

## 常见坑
- 把热度当效果：@karpathy 帖子的互动数据是 likes 24173、reposts 3078、replies 717，understanding-ladder 仓库星标 30，STE-Prompt 仓库 33 stars。这只说明受关注度高，不构成效果证据。
- 把“更简单”当成“符合规范”：如果模型不熟悉 ASD-STE100，只给规范名称的指令可能只产生更简单、更短的句子，而非真正符合规范（推断，原文未验证）。
- 把“80% 到 ASD-STE100”当成完整标准：它自称是 80%，不是完整 ASD-STE100；`plain-chinese` 也只是轻量规则集，不是完整写作标准。
- 把 STE-Prompt 当成正式 ASD-STE100：它自称不复制 ASD-STE100 规范文本，只提供受公开描述启发的原创指引，产出未必等同于正式标准合规文本。
- 忽略受控语言的代价：它通常牺牲表达丰富度和自然度，换取一致性与低歧义。因此更可能适用于需要跨读者一致理解的技术说明类文本，而不是所有写作。
- 在不适用场景强行套用：需要细微差别、风险讨论、研究综述时，对冲本身就是内容；强行 STE 会丢失信息。
- 只给规范名称、不给内容：原文只给了规范名称，没有提供规范内容。需要走做法 B 时，要自备规范文本并放进上下文。
- 忘记事实保全：简化时丢掉了限定词、条件、数字、限定词，是最容易失败的一条；不删内容这条规则要优先检查。
- 被精致产出降低警惕：更容易理解 ≠ 已验证；动画里的错误比文字里的错误更有说服力。每个输出都应附“该检查什么”。
- 阶梯选择总是往上跳：简单定义也做 HTML 或视频，说明没有按内容类型选择最低够用阶梯。
- 以为安装技能就万事俱备：understanding-ladder 的核心分类逻辑和 15 条中文规则在未抓取的 SKILL.md 里，本材料无法据此复现全部规则；STE-Prompt 的 `RULES.md`、`DICTIONARY.md` 实际内容也未提供。
- 阶梯 4 误以为技能负责渲染：技能只写 storyboard，渲染依赖外部视频工具 showtime 0.4.0+。
- 把截断线索当完整方法：@karpathy 原文被截断在第二个句子中途，ASD-STE100 的来源领域、完整技巧列表、后续 tips 全部缺失。
- 直接写成团队规范：调研结论明确说，现有材料只剩作者个人经验且无任何效果数据，只适合小范围试，不宜直接写成手册定稿。
- 以为 `AGENTS.md` 路线已经在所有工具验证：原文明确说同一份追加方式适用于 Cursor、Cline、Aider、Windsurf、OpenClaw 等，但未给出这些工具上的验证。

## 证据与来源
- “让 LLM 用 ASD-STE100 解释内容”来自调研《@karpathy: We'll be spending a lot more time trying to understand the outputs of language models. A few thought》。可确认的原文指令是 `Ask your LLM to explain something in ASD-STE100.`；原文把 ASD-STE100 描述为 controlled language specification（受控语言规范），并称作者自己“Something I've had success with”（个人成功经验）。互动数据：likes 24173、reposts 3078、replies 717。只说明受关注度高，不构成效果证据。原文没有给出任何案例、前后对比或评价标准；未说明适用于哪些内容类型、哪些读者、哪些模型。
- 做法“把规范文本放进上下文”（做法 B）属于推断、非原文验证。
- “80% 到 ASD-STE100”提示词、理解阶梯安装命令、内容类型→阶梯映射、三条贯穿规则、`plain-chinese`、阶梯 4 渲染命令均来自调研《ChangWenC/understanding-ladder》。原文给出一个可跑的在线 demo，主题是“服务器利用率超过约 80% 后延迟为什么爆炸”，其中第 3 个标签页有一个滑块，把利用率从 90% 拖到 95%——多 5 个点，延迟翻倍；单文件、无依赖、中英切换。中文/英文各有一组前后对照示例（中文说 5 组），仓库星标 30。属于作者主张、没有数据支撑的部分：选择最低足够阶梯、先出草稿、结尾写“该检查什么”这三条规则是作者倡导的做法，没有对照实验；各阶梯“更好”的排序来自 Karpathy 的帖子观点，不是测量结果。作者自己声明的局限：更容易理解 ≠ 已验证；阶梯降低的是理解成本，不是核对成本。阶梯 4 只写分镜，渲染依赖外部视频工具（showtime 0.4.0+）。`plain-chinese` 是给 LLM 的轻量规则集，不是完整写作标准；句长之类的数字是经验法则，未经过阅读研究检验。示例是照着 skill 做出来再手工检查的，只表明方向，不是基准测试。适用条件：需要支持 Agent Skills 的客户端；中文效果依赖 `plain-chinese`；本次抓取到的只有 README，分类逻辑细节和 15 条中文规则原文在未抓取的 SKILL.md 里，无法据此复现全部规则。
- STE-Prompt 的安装命令、文件路径、`/ste` 用法、`AGENTS.ste.md` 追加方式、10 条精简规则来自调研《menonpg/ste-prompt》。属于可照做的内容（证据强度较高，因为就是仓库自身的安装说明）；只是作者主张的部分包括：“STE 是规则化文体，模型能真正遵循”、STE 能机械地消除对冲措辞和复合句歧义、结果是“可快速扫描、少误读”，以上均无数据、案例或对照实验支撑。客观事实：仓库 33 stars，MIT 许可。重要局限：项目自称不复制 ASD-STE100 规范文本，只提供受该标准公开描述启发的原创指引，因此产出的“STE”未必等同于正式标准的合规文本；ASD-STE100 是 ASD 的商标。作者已限定不适用于细微差别、风险讨论、研究综述。本次只有仓库 README 可依据，`RULES.md`、`DICTIONARY.md` 的实际内容未提供，无法判断规则完整度与词典质量，也无法确认“批准词”是否覆盖常用技术动词。
- 互补工具 agent-ste（ctotheameron 的作品）不在给定清单中，作为原文自述的强制型 linter 出现，可用它把超长句、分号、非批准词变成客观报错；其效果未在本材料中验证。
- 试用方案（两版对比、2–3 位读者、追问次数、复述偏差、跨读者一致性指标、事实保全、形式是否过度、警惕精致产出）来自调研报告中的“怎么试、怎么验证”整理；原文没有提供基线数据。

## 依据的调研

- [@karpathy: We'll be spending a lot more time trying to understand the outputs of language models. A few thought](../research/radar/2026-10-02/744-we-ll-be-spending-a-lot-more-time-trying-to-unders.md)：值得一试，可以直接把「让模型用 ASD-STE100 受控语言来解释内容」当作一条提示词模板小范围试用，因为它是一条可原样复制的具体指令；但原文被截断、只剩作者个人经验且无任何效果数据，所以只适合小范围试、不宜直接写成手册定稿。
- [ChangWenC/understanding-ladder](../research/radar/2026-10-10/2423-changwenc-understanding-ladder.md)：值得一试，先把仓库里那段可复制的“80% 到 ASD-STE100”提示词拿来用，再考虑安装成 Agent Skill，让 AI 按内容类型自动选最低够用的解释形式（文本→图表→交互页→视频）而不是一律甩长文本；理由是原文给出了可照做的安装命令、提示词和内容—形式映射表，但只有作者主张与手工示例，没有基准数据，核心规则又放在未抓取的 SKILL.md 里，适合小范围试而非直接写死进手册。
- [menonpg/ste-prompt](../research/radar/2026-10-13/2780-menonpg-ste-prompt.md)：值得一试，先在 Claude Code 里装这个插件（或把 AGENTS.ste.md 追加进 AGENTS.md），拿一份真实的 runbook／操作步骤文档做改写对比，确认清晰度和误读率确有改善再推广到日常写作；理由是原文给出了可直接照抄的安装命令、文件路径和十条可执行规则，但只有作者主张、没有效果数据，且作者自己限定了不适用场景。
