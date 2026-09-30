# joetawil7/first-pass

- 结论：**值得一试**。建议在一个仓库上小范围试装并跑几周，因为它把“确保正确”这类模糊要求换成了可执行的具名检查（十个问题、非作者评审、改动前失败的测试），直接对应本项目的任务匹配与效果验证问题；但作者自己说这是 0.5 版、收益尚未测量，且每次改动更慢更贵（小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元），因此不宜直接全团队采用。
- 原文：https://github.com/joetawil7/first-pass
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-09-30T17:23:13.845Z

## 是什么

first-pass 是一个 Claude Code 插件，安装在存放所有仓库的那个文件夹里，只需设置一次。它让编码 agent 不只看自己写的那几行，还要检查改动周围的代码，并在宣布“完成”之前拿出证据。作者称 Cursor、Codex 等 agent 能拿到同样的规则和技能，但 hooks 只属于 Claude Code。

它的组成：`premortem`（动手前的十个问题，对着真实代码回答）、`breaker`（全新上下文评审改动的 agent）、`ship-check`（完成的定义）、`fix-the-class`（把 bug 当一类来修）、`setup-first-pass`（一次性写入规则、仓库地图、每个仓库的段落和草拟的 `INVARIANTS.md`）、`habit-words`、`sharpen`、`review`、可选的 `jev` 判断模型，以及每会话运行的 hooks。

作者背景：他用 Claude Code 逐个功能做产品，每个功能请求都以“确保代码正确、无 bug、覆盖所有缺口、100% 确定”结尾；之后做了一次完整审计，发现 **318 个问题，其中 25 个高严重度**。按原因分类后，只有 45 个是正在写的那些行里的错误，其余都在周围的代码里。而且其中一些是早先审计发现并修过的——每次修都只补了一个点，教训没有带到下一个会话。

## 具体做法（原文里可照做的步骤、配置、提示词、流程，尽量具体）

**安装**

Claude Code：
```
/plugin marketplace add joetawil7/first-pass
/plugin install first-pass@first-pass
```
终端等价命令：`claude plugin marketplace add joetawil7/first-pass`，然后 `claude plugin install first-pass@first-pass`。更新：`claude plugin marketplace update first-pass`，再 `claude plugin update first-pass@first-pass`。hooks 需要 PATH 上有 Node.js 18 或更高版本；测试在 Windows 和 Linux 上跑过。

Cursor、Codex 等：
```
npx skills add joetawil7/first-pass -a cursor --copy        # 本项目
npx skills add joetawil7/first-pass -a cursor --copy -g     # 所有项目
```
把 `-a cursor` 换成自己的 agent（`-a codex`、`-a windsurf` 等）。`--copy` 写真实文件而不是符号链接（Windows 会把符号链接变成纯文本）。如果已用插件就不要加 `-a claude-code`，否则每个 skill 会出现两次。

**一次性设置**：在会话启动的文件夹里跑 `/first-pass:setup-first-pass`（Claude Code 之外是 `/setup-first-pass`）。它会翻你的仓库，只问代码回答不了的问题（哪些仓库有 UI、谁依赖谁、跑哪些仓库 hooks），然后写入上述文件。更新后重跑会保留你自己的文字、每个仓库的段落和 `INVARIANTS.md`。

**动手前的十个问题（pre-mortem）**：agent 在改代码前，对着真实代码回答这类问题——跑两次会怎样、跑到一半停下会怎样、外部调用超时或失败会怎样、失败不是空会怎样、还有哪些代码用同一份数据、各种结尾（取消、删除、过期、重连、降级）怎么办、钱、恶意用户、文案、规模与时间。每个答案必须是 `file:line`、一个测试，或者一句“Not handled, because ___”交给你决定是否接受。

**建造期间**：任务没要求的东西（helper、上限、重试、选项）必须先证明自己该存在；没有东西要求它就省掉，并列在“Not built”下让你事后要。工作中只有造成真实伤害或阻碍这次改动完成的问题才当场修（钱、数据、重复执行或发错、安全、法律、崩溃、卡住的任务、改动没起作用）；小问题在结束时作为一张清单交给你挑，挑中的一起评审一次。

**完成的定义**：一个在改动前会失败的测试 + `breaker` 的评审 + CI 自己的检查在干净 checkout 里通过。达不到就报告为 built，不是 done。`ship-check` 结束时报告 `Verified: <what was run> → <result>`，以及没被验证的部分。

**修 bug 用 `fix-the-class`**：复现 bug，找出同一模式在别处的位置，加一个能防止它复发的 helper、约束或检查（作者强调只有这类改动才持久，规则本身会淡去）。

**评审**：自己分支上输入 `/first-pass:review` 不带任何后缀，它会对照 base、PR、checks 和分支名里的 ticket 评审，最后说清在请人评审前要修什么。评审队友的 PR 时附上链接和上线状态，例如 `"/first-pass:review backend#147 web#151, live today: no agency workspaces"`。每条发现都带证据或被标为 unproven，并说明用户今天能不能撞到。它读 GitHub 但从不发帖，只有你挑了某个修复并说 yes 才推。来自 fork 或外部贡献者的 PR 只读不跑，除非你同意。

**习惯词（`habit-words`）**：读你最近 20 个 Claude Code 会话里你自己打的字，统计“be 100% sure”“don't assume”“full review”“all fine, right?”这类短语出现的频率、说完之后出了什么问题，然后写一小段把它们映射到本该触发的检查。只读 `~/.claude/projects` 里你自己的 transcript、只读你打的字和每条反驳前的回复结尾；工具输出、粘贴文本、通知、脚本启动的运行都排除；像 key、token、密码、邮箱、电话的内容在进临时文件前会被替换（尽力而为），用完删除文件。这段块只含你的短语和检查，绝不写进团队共享的文件。

**提示词改写（`sharpen`）**：在你想写的提示词前面加上 `/first-pass:sharpen`（Cursor 里是 `/sharpen`）。它把混了三个请求的消息拆成编号列表，把习惯词变成它们代表的检查，把改写给你看，然后按改写工作；只有需要猜的时候才停下来问。在 Claude Code 里，hook 会扣住编辑、shell 命令、子 agent、MCP 工具、发布、调度和其他 skill，直到改写出现在屏幕上（读文件从不被扣住）——作者说只用指令时，11 次测试中有 7 次跳过了改写。

**多仓库场景**：根上一套规则写在 `AGENTS.md`（由 `CLAUDE.md` import），从第一条消息起就加载；每个仓库一段（CI 的确切命令、怎么跑单个测试、真实测试需要什么在跑、测试限制、面向用户的文案在哪、同一件事在两处做）；每个仓库自己的 hooks 仍然运行，setup 列出它们、你逐个批准，批准会钉住 hook 和它脚本文件夹里的每个文件，某个 pull 改了其中之一，hook 就暂停等你重新批准，你和 agent 都会被告知；会话开始时报告漂移（某个仓库的 CI 变了、出现了新仓库、某个 hook 被暂停、Cursor 规则的副本落后了、规则比插件旧）。

**推荐的提问方式**：与其说“确保没有 bug”，不如说 *“Run the pre-mortem, show me the tests that fail without the change, and list what you didn't verify.”*

**可选 `jev`**：如果你有 TypeSafe API key，`/first-pass:jev` 为 `ship-check` 打开第二意见，判断每条评审发现是否真实伤害、哪些小问题值得现在修、小修复需要什么证据。作者说它便宜快，但让它在 269 个审计问题上排序时，它给“多少人会遇到”的权重高于“伤害多大”，所以它可以让一条发现变严重，永远不能清除评审者认为严重的发现；它不确定或失败时，规则按它不存在来处理。

**写到机器上的东西**：根上的 `AGENTS.md` 和 `CLAUDE.md`（都夹在 `first-pass` 标记之间，标记外只加 import 行并逐条列出）；每个仓库的 `INVARIANTS.md`（草稿待你评审）和 `CLAUDE.md`/`AGENTS.md` 的一段；`.first-pass/workspace.json`；需要时 `.claude/cursor-rules/*.md` 副本；hooks 用的 `~/.claude/plugins/data/` 小状态文件夹；`~/.claude/first-pass/jev.json`（只记哪个变量放 key、对哪些仓库，从不存 key 本身）。Setup 从不 commit 或 push。除 jev 外脚本不发网络请求、不读环境里的 key 或 token；`review` 走你自己的 `gh` 登录。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：原文展示了若干还没被普遍交给 AI 的工作——把“确保正确、无 bug”这种模糊要求翻译成具名的十条检查；让**没有写这段代码的**第二个 agent 在全新上下文里评审（作者引 Huang et al. 2024 说模型不擅长在同一上下文里发现自己的错误）；把“修一个 bug”扩展成“修这一类并加防止复发的检查”；读取你历史会话中的习惯用语并映射成检查清单；用盲评方式给自己写的规则做对照测试。

**2. 任务匹配**：Claude Code 用插件形式（有 hooks，能扣住编辑、发回无证据的 done）；Cursor、Codex、Windsurf 等只能拿到规则和技能，没有 hooks。专为“把所有仓库放在一个文件夹、从这里开会话”的模式设计（否则仓库自己的 `.claude/agents`、`.claude/settings.json` 里的 hooks、`.cursor/rules/*.mdc` import 都不会加载），单个仓库单独用也行。fork 或外部贡献者的 PR 只读不跑。`jev` 只用于判断评审发现是否真实伤害这类选择题。

**3. 条件供给**：需要跑一次 setup 提供仓库地图、每个仓库真实的 CI 命令、怎么跑单个测试、真实测试要什么在跑、测试限制、面向用户的文案位置、同一件事在两处做；需要 Node.js 18+；给 agent 的答案形式是 `file:line`、测试或明确接受的缺口；可选 jev 需要你指定一个 TypeSafe key 的变量名（评审发现会脱敏后发到 TypeSafe API，这是唯一需要你手动打开的例外）；`review` 需要你自己的 `gh` 登录。

**4. 主动推进**：hooks 每个会话运行，把没有证据的“done”打回，会话开始时报告漂移；`ship-check` 在 breaker 评审进行时并行跑 CI 的干净 checkout（受仓库测试限制约束），一段提示里有多个条目时先全建好再统一评审、CI 一次干净 checkout 跑完。问题不是随时问——因为每个问题都会停下会话等你回答（三个会话三天里 70 组问题中 17 组等了一小时以上），所以先做完所有不依赖你回答的部分，再一次问剩下的。注意：这些由 setup、hook、会话开始或显式斜杠命令触发，原文没有描述后台自主推进的长任务。

**5. 效果验证**：“done”必须由一个改动前会失败的测试 + breaker 评审 + 干净 checkout 的 CI 通过构成；`ship-check` 报告 `Verified: <what was run> → <result>` 和没验证的部分；每条评审发现带证据或被标 unproven；`fix-the-class` 落地的不是提示词而是共享 helper、数据库约束或 CI 检查；漂移在会话开始时被点出。

## 与已有做法的关系

- **Claude Code（清单中 adopt）**：first-pass 就是它的插件，依赖其 plugin / hook / skill 机制，是清单里 Claude Code 这一条的直接延伸和能力补充。
- **obra/superpowers（清单中 study）**：README 把它列在 Related 里，称其为“给编码 agent 的完整开发方法，以 skills 的形式”。两者形态相近（技能化的工作纪律），但 first-pass 更聚焦于“改动周围的代码 + 完成前拿证据”这一条纪律。
- **Ponytail（清单中 study）**：README 明确说 first-pass 的“它需要存在吗？”规则来自与 ponytail 的对照测试，测试对比了 first-pass 单独、first-pass + ponytail、以及该规则的不同版本。
- **i-have-adhd（清单中 watch）**：README 说 first-pass 的回复规则借鉴了它检查第一行和最后一行的做法。
- **Cursor（清单中 watch）**：提供了 `npx skills` 的安装路径，但拿不到 hooks。
- **Cline（清单中 watch）**：原文只提到 Cursor、Codex、Windsurf、Claude Code，**没有提及 Cline**。
- **arXiv（清单中 try）**：README 引用 Huang et al. 2024（《Large Language Models Cannot Self-Correct Reasoning Yet》，ICLR 2024）和 Tambon et al. 2024（《Bugs in Large Language Models Generated Code》），以及 Anthropic 的《Best practices for Claude Code》。

## 证据与局限

**原文给出的数据**

- 一个私有代码库的审计：318 个问题、25 个高严重度。按原因分类（人工分类，一个代码库，每个问题记一个原因，作者说你的分布会不同）：另一条代码路径用同样数据未更新 54；跑两次、同时跑或中途停 54；外部服务失败或慢而错误被隐藏 45；代码本身的普通错误 45；时间、单位、舍入 26；规模（无上限、无索引、列表只到一页）25；结尾（取消、删除、过期、重连、降级）19；UI、帮助、法律或定价文案说了代码没做的事 18；流水线（CI 红、没有对着真实数据库的测试）17；恶意用户或无上限成本 15。
- **减少没人要的代码**：两个任务（给产品页加缓存、给结账加优惠券）共 52 次运行，用全新 Claude Code 会话和 agent（Opus，高 effort）、加载别的东西、隐藏检查、盲评评委。每个隐藏正确性检查在每次运行都通过，只有一条关于拒付卡的例外——它在 32 次优惠券运行中失败 15 次、跨所有设置，作者说它更多是在测他的假支付网关而不是代码本身。缓存任务上，盲评评委数出 first-pass 单独运行时每次约 10 行没人要的代码，发布规则下是 3 行。优惠券任务上，评审发现之后追加的代码从每次 6 行降到 3 行。agent 自己写的测试在发布规则下抓到 18/18 个植入 bug；装了 ponytail 时 30 个中有 2 个漏过。作者预期会有帮助的一条规则“文档里的承诺算真实需求”让代码大了约 40%，所以没有采用。
- **回复可读性**：10 条真实回复按新旧两套回复规则改写，两个新评委按“聪明的 15 岁读者”来读，20 次里 16 次选新版本，清晰度评分 3.3 对 3.0（满分 5），被绊住的短语 150 对 175。代价是 7 次它扣下了重要的东西，所以规则改成绝不扣下风险、失败或属于你的决定。
- **评审仍然报告一切**：3 次运行、一个小改动、植入 8 个 bug，全部 8 个都出现在每次评审和每次最终回复里。
- **成本**：在一个小 demo 仓库上，用 `fix-the-class` 修一个重复扣费的 bug 再跑 `ship-check`，按 API 标价约花 29 美元（三次评审 pass）。在这套规则之前，评审发现一个小问题、问你一个问题、修一下、再评审这个修复，可以链上好几个小时：两天里 84 次评审中约三分之一只发现小问题，大多数还开了新一轮。

**作者自己的主张（非数据）**

- “规则能持续靠的是 `fix-the-class` 推动的东西：一个共享 helper、一个数据库约束、一个 CI 检查；规则本身会淡去。”
- “它不会让代码没有 bug。目标是更少、更小的逃逸：没有高严重度的，同一个 bug 类不出现两次。”
- 十个问题“能抓住”改动旁边的 bug（同一字段的另一条写入路径、到达两次的 webhook、表现为空列表的错误）——这些是设计意图，不是测量结果。

**原文自认的局限**

- 作者写明：“这些是小样本、小任务。它们说明规则按说的做，不说明它们对你的代码有多大帮助。”
- “这是 0.5 版，所以那是设计，不是已测量的结果。”
- **每次改动更慢**：一个先失败的测试、第二个 agent 的评审、干净 checkout 里的 CI 都要时间和 token。
- **规则会淡去**，只有落成结构性约束的修复才持久。
- **shell 编辑被看到得晚，而且不是全部**：`sed -i`、heredoc、copy、formatter 改的文件在回合末由 `git status` 和文件时间发现，所以 done 检查和回合末 hooks 能看到，但每次编辑后运行的 hooks 看不到。看不到的还有：git 忽略的文件；Windows 上覆盖了 git 显示无变化文件的 copy（会保留源文件的时间）；命令返回后仍在后台运行时的写入；从主文件夹出发、命令既不在其中运行、也没 `cd` 进去、也没提到路径的仓库；以及单仓库模式下的任何其他仓库。会被误计的有：内容相同地重写文件（`git stash` 再 `git stash pop`）、shell 命令运行期间别的程序的写或删、你拒绝一条命令后到你下一次提示之间的写入；删除按它所在文件夹记时间，所以同文件夹稍后的改动可能算上或盖住它。
- **`jev` 的偏向**：作者说在 269 个审计问题上，它给“多少人会遇到”的权重高于“伤害多大”。
- 适用条件：需要 Node 18+；多仓库集中在一个文件夹时收益最大；jev 需要 TypeSafe key 并把脱敏后的评审发现发到 TypeSafe API；团队要在仓库里提交这些文件，且每人各自安装（Claude Code 用插件，Cursor 用 `npx skills` 那行）。

## 怎么试、怎么验证

**最小试用方式**

1. 选一个你熟悉的仓库（或一个装了几个仓库的文件夹），按上面的命令装插件，跑一次 `/first-pass:setup-first-pass`，检查它写进 `AGENTS.md`/`CLAUDE.md` 的规则、每个仓库的 CI 命令段落和草拟的 `INVARIANTS.md` 是否属实（setup 不会 commit，文件由你审阅后自己提交）。
2. 在接下来一次真实小改动上，直接用它推荐的提示词：*“Run the pre-mortem, show me the tests that fail without the change, and list what you didn't verify.”* 或用 `/first-pass:sharpen` 包住你原本要打的提示词。看十条问题的答案有多少落在 `file:line` 或测试上，多少是“Not handled”，以及那些缺口你是否真的接受。
3. 找一个你已经知道原因的 bug，跑 `fix-the-class`，看它是否找到同一模式的其他命中、加的是什么防复发手段（helper、约束还是 CI 检查）。
4. 在请人评审前跑一次 `/first-pass:review`，看报告里的每个发现是否带证据、有没有把用户的真实可见影响说清。
5. 先不要对团队铺开，也不要急着开 `jev`（那需要 key 且会外发数据）。

**判断有没有改善的指标**

- 十条问题的答案中，落在 `file:line` 或测试上的比例，以及你接受“Not handled”的比例（作者设计的验收标准就是这两类）。
- 宣布 done 时，有多少次真的附带一个“改动前会失败”的测试；`Verified:` 行中你复核不了或无法复现的比例。
- 每改动多花的时间与 token，对照作者给的量级（小 demo 上修一个重复扣费 bug 加 ship-check，按 API 标价约 29 美元、三次评审 pass）。
- 评审发现的严重问题数、修完一轮还需要几轮追加修复（作者的前置基线是：两天 84 次评审中约三分之一只发现小问题，大多数还开了新一轮）。
- 没人要求而写下的代码行数（作者用的是盲评统计，缓存任务约 10 行对 3 行）。
- 同一个 bug 类是否在后续会话里再次出现（作者的核心主张是这一类才算真改善）。
- 回复是否更短、第一行是否直接说发生了什么或你要做什么、是否漏掉了风险或属于你的决定（他自己在这点上翻过车，7 次扣下重要内容）。

**注意**

作者明确说这些数据来自小样本、小任务，只证明规则按说的执行。所以试点要跑几周、用你自己仓库的对照，再决定是否推广；推广时需要把仓库文件提交，每个成员各自安装。
