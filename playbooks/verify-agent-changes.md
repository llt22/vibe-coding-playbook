# 让编码 agent 自己证明改对了：把「确保没问题」换成必须交出的证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 用「已确保正确、无 bug」交差，但它只检查自己刚写的那几行，改动周围的代码和上一次修过的同类问题都不在视野里，你也拿不到可核对的完成证据。
> 先试这一步：在一个仓库（或你存放所有仓库的那个文件夹）里跑一次 `/first-pass:setup-first-pass`，然后从下一个改动开始，要求 agent 先做 premortem，并且每个答案必须是 `file:line`、一个测试，或明确写出「Not handled, because ___」。
> 最近修订：2026-10-01

## 解决什么问题

每个功能请求都以「确保代码正确、无 bug、覆盖所有缺口、100% 确定」结尾，但 agent 检查的往往只有它刚写的那几行。作者的完整审计在代码库里发现 **318 个问题，其中 25 个高严重度**；按原因分类，**只有 45 个落在正在写的那些行里**，其余都在改动周围的代码里。其中一些还是更早审计已发现并修过的——每次只补一个点，教训没有带到下一个会话。

这篇手册把「确保正确」换成一串具名、可执行的检查，并规定 agent 在宣布「完成」之前必须交出证据。

## 适用与不适用

**适用**

- 把所有仓库放在一个文件夹、从这个文件夹启动会话的多仓库工作方式（first-pass 就是为这个模式设计的）；单个仓库单独用也行。
- Claude Code：能拿到插件和 hooks，可以扣住编辑、把没有证据的「done」打回、会话开始时报告漂移。
- Cursor、Codex、Windsurf 等：能拿到同样的规则和技能，但**没有 hooks**。

**不适用 / 需要知道**

- 来自 fork 或外部贡献者的 PR，`review` 只读不跑，除非你同意。
- 作者自称这是 **0.5 版、收益尚未测量**，而且每次改动更慢更贵（小 demo 上修一个重复扣费 bug 加 ship-check 约 **29 美元**），因此不宜直接全团队铺开。
- 原文没有描述后台自主推进的长任务：所有触发都来自 setup、hook、会话开始或你显式输入的斜杠命令。

## 前置条件

- Claude Code 走插件安装；hooks 需要 **PATH 上有 Node.js 18 或更高版本**（测试在 Windows 和 Linux 上跑过）。
- `review` 需要你自己的 `gh` 登录。
- 可选的 `jev` 需要你有 TypeSafe API key，并指定存放 key 的变量名。
- 跑 setup 前想清楚代码回答不了的那几个问题：哪些仓库有 UI、谁依赖谁、跑哪些仓库 hooks。

## 操作步骤

### 1. 安装：选做法 A 还是 B

**做法 A（Claude Code，要 hooks 就选这个）**

```
/plugin marketplace add joetawil7/first-pass
/plugin install first-pass@first-pass
```

终端等价命令：`claude plugin marketplace add joetawil7/first-pass`，然后 `claude plugin install first-pass@first-pass`。

更新：`claude plugin marketplace update first-pass`，再 `claude plugin update first-pass@first-pass`。

**做法 B（Cursor / Codex / Windsurf 等，没有 hooks）**

```
npx skills add joetawil7/first-pass -a cursor --copy        # 本项目
npx skills add joetawil7/first-pass -a cursor --copy -g     # 所有项目
```

把 `-a cursor` 换成自己的 agent（`-a codex`、`-a windsurf` 等）。`--copy` 写真实文件而不是符号链接（Windows 会把符号链接变成纯文本）。**如果已经用了插件，就不要加 `-a claude-code`**，否则每个 skill 会出现两次。

**怎么选**：你需要「扣住编辑、打回没有证据的 done、会话开始报漂移」这类强制力，就走 A——只有 Claude Code 有 hooks。只想拿到规则和技能，走 B。

**预期结果**：插件或 skills 装好；A 方式下 hooks 可用。

### 2. 跑一次性 setup

在会话启动的那个文件夹里执行：

```
/first-pass:setup-first-pass
```

Claude Code 之外是 `/setup-first-pass`。

它会翻你的仓库，只问代码回答不了的问题（哪些仓库有 UI、谁依赖谁、跑哪些仓库 hooks），然后写入：根上的 `AGENTS.md` 和 `CLAUDE.md`（都夹在 `first-pass` 标记之间，标记外只加 import 行并逐条列出）、每个仓库的 `INVARIANTS.md`（草稿待你评审）和 `CLAUDE.md`/`AGENTS.md` 的一段、`.first-pass/workspace.json`、需要时 `.claude/cursor-rules/*.md` 副本、hooks 用的 `~/.claude/plugins/data/` 小状态文件夹。

**更新后重跑**会保留你自己的文字、每个仓库的段落和 `INVARIANTS.md`。

**预期结果**：规则从第一条消息起就加载；setup 从不 commit 或 push；除 jev 外脚本不发网络请求、不读环境里的 key 或 token。

### 3. 改代码之前：premortem 十问，答不出来不许动手

agent 动手前要对着**真实代码**回答这类问题：

- 跑两次会怎样；跑到一半停下会怎样
- 外部调用超时或失败会怎样；失败不是空会怎样
- 还有哪些代码用同一份数据
- 各种结尾（取消、删除、过期、重连、降级）怎么办
- 钱；恶意用户；文案；规模与时间

每个答案必须是 `file:line`、一个测试，或者一句 `Not handled, because ___` 交给你决定是否接受。

**推荐的提问方式**（直接照抄）：

```
Run the pre-mortem, show me the tests that fail without the change, and list what you didn't verify.
```

### 4. 建造期间：先证明「它需要存在吗？」

任务没要求的东西（helper、上限、重试、选项）必须先证明自己该存在；没有东西要求它就省掉，并列在「Not built」下让你事后要。

工作中只有造成**真实伤害或阻碍这次改动完成**的问题才当场修：钱、数据、重复执行或发错、安全、法律、崩溃、卡住的任务、改动没起作用。小问题在结束时作为一张清单交给你挑，挑中的一起评审一次。

### 5. 完成的定义：三条同时成立才算 done

1. 一个**在改动前会失败的测试**；
2. `breaker`（全新上下文、不是写这段代码的那个 agent）的评审；
3. CI 自己的检查在干净 checkout 里通过。

达不到就报告为 **built，不是 done**。`ship-check` 结束时报告：

```
Verified: <what was run> → <result>
```

以及**没被验证的部分**。一段提示里有多个条目时，先全建好再统一评审，CI 一次干净 checkout 跑完。

### 6. 修 bug 用 `fix-the-class`

复现 bug → 找出同一模式在别处的位置 → 加一个能防止它复发的 helper、约束或检查。作者强调只有这类改动才持久，规则本身会淡去。

### 7. 评审：`/first-pass:review`

- 自己分支上不带任何后缀输入 `/first-pass:review`：它会对照 base、PR、checks 和分支名里的 ticket 评审，最后说清在请人评审前要修什么。
- 评审队友的 PR 时附上链接和上线状态，例如：

```
"/first-pass:review backend#147 web#151, live today: no agency workspaces"
```

每条发现都带证据或被标为 `unproven`，并说明用户今天能不能撞到。它读 GitHub 但从不发帖，只有你挑了某个修复并说 yes 才推。

### 8. 把你自己常说的话变成检查：`habit-words`

读你最近 **20 个** Claude Code 会话里**你自己打的字**，统计「be 100% sure」「don't assume」「full review」「all fine, right?」这类短语出现的频率、说完之后出了什么问题，然后写一小段把它们映射到本该触发的检查。

边界（作者写明）：只读 `~/.claude/projects` 里你自己的 transcript、只读你打的字和每条反驳前的回复结尾；工具输出、粘贴文本、通知、脚本启动的运行都排除；像 key、token、密码、邮箱、电话的内容在进临时文件前会被替换（尽力而为），用完删除文件。**这段块只含你的短语和检查，绝不写进团队共享的文件。**

### 9. 写提示词时先 `sharpen`

在你想写的提示词前面加上 `/first-pass:sharpen`（Cursor 里是 `/sharpen`）。它把混了三个请求的消息拆成编号列表，把习惯词变成它们代表的检查，把改写给你看，然后按改写工作；只有需要猜的时候才停下来问。

在 Claude Code 里，hook 会扣住编辑、shell 命令、子 agent、MCP 工具、发布、调度和其他 skill，**直到改写出现在屏幕上**（读文件从不被扣住）。

### 10. 多仓库场景

- 根上一套规则写在 `AGENTS.md`（由 `CLAUDE.md` import），从第一条消息起就加载。
- 每个仓库一段：CI 的确切命令、怎么跑单个测试、真实测试需要什么在跑、测试限制、面向用户的文案在哪、同一件事在两处做。
- 每个仓库自己的 hooks 仍然运行：setup 列出它们、你逐个批准；**批准会钉住 hook 和它脚本文件夹里的每个文件**，某个 pull 改了其中之一，hook 就暂停等你重新批准，你和 agent 都会被告知。
- 会话开始时报告漂移：某个仓库的 CI 变了、出现了新仓库、某个 hook 被暂停、Cursor 规则的副本落后了、规则比插件旧。

### 11. 可选：`jev` 第二意见

如果你有 TypeSafe API key，`/first-pass:jev` 会为 `ship-check` 打开第二意见，判断每条评审发现是否真实伤害、哪些小问题值得现在修、小修复需要什么证据。

规则：它可以让一条发现**变严重**，永远不能清除评审者认为严重的发现；它不确定或失败时，规则按它不存在来处理。它需要你指定一个 TypeSafe key 的变量名（评审发现会脱敏后发到 TypeSafe API，这是**唯一需要你手动打开的例外**）；`~/.claude/first-pass/jev.json` 只记哪个变量放 key、对哪些仓库，从不存 key 本身。

## 怎么判断变好了

**可观察的指标**

- 「done」不再由 agent 自己宣布：改动前会失败的测试 + 非作者评审（breaker）+ 干净 checkout 的 CI 通过，三者缺一就只报 built。
- `ship-check` 输出里能看到 `Verified: <what was run> → <result>`，以及明确列出的「没被验证的部分」。
- 每条评审发现带证据或被标 `unproven`。
- 同类 bug 的复发被落地的共享 helper / 数据库约束 / CI 检查挡住，而不是靠提示词。
- 会话开始时被点出的漂移（CI 变了、新仓库出现、hook 被暂停、Cursor 规则副本落后、规则比插件旧）。

**最小试用方式**

在**一个仓库**上小范围试装，第一个改动完整走一遍：premortem → 修改（只当场修真实伤害）→ breaker 评审 → ship-check。

**试多久**

作者的建议是跑**几周**再判断是否铺开。成本要有预期：小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元，且作者自己说每次改动更慢更贵、收益尚未测量。

## 常见坑

- **别指望提示词本身能拦住。** 作者说只用指令时，11 次测试中有 7 次跳过了改写；能扣住编辑的是 Claude Code 的 hook，Cursor 等拿不到 hooks。
- **问题不要随时问。** 每个问题都会停下会话等你回答——三个会话三天里的 70 组问题中，有 17 组等了一小时以上。先做完所有不依赖你回答的部分，再一次问剩下的。
- **`jev` 不是裁判。** 它在 269 个审计问题上排序时，给「多少人会遇到」的权重高于「伤害多大」，所以它能让一条发现变严重，但永远不能清除评审者认为严重的发现。
- **`habit-words` 的输出别外流。** 只含你自己的短语和检查，绝不写进团队共享文件；transcript 只读、临时文件用完删除。
- **装了插件别再 `-a claude-code`**，否则每个 skill 出现两次；Windows 上用 `--copy`，因为符号链接会变成纯文本。
- **hook 是被钉住的**：某个 pull 改了 hook 脚本文件夹里的任一文件，hook 就暂停等你重新批准，别以为是坏了。
- **fork / 外部贡献者的 PR 只读不跑**，除非你同意。
- **`review` 不会自己发帖**：只有你挑了某个修复并说 yes 才推。

## 证据与来源

全部做法来自本次调研的 **joetawil7/first-pass** 报告：安装命令、一次性 setup、premortem 十问、建造期间的「它需要存在吗？」规则、完成的定义（改动前失败的测试 + breaker 评审 + 干净 checkout 的 CI）、`fix-the-class`、`review` 的调用方式、`habit-words` 的读取范围与脱敏规则、`sharpen` 在 Claude Code 里的 hook 行为、多仓库的漂移与 hook 钉住机制、可选 `jev` 的行为与限制、以及写到机器上的文件清单。

报告里的数据（均为作者自述，未看到第三方复现）：

- 完整审计发现 **318 个问题、25 个高严重度**，其中只有 **45 个**在正在写的那些行里。
- 只用指令时，**11 次测试中有 7 次**跳过了 `sharpen` 改写。
- 三个会话三天里 **70 组问题中 17 组**等了一小时以上。
- `jev` 排序测试用了 **269 个**审计问题。
- 小 demo 上修一个重复扣费 bug 加 ship-check 约 **29 美元**。

其他依据：

- 「让**没有写这段代码的**第二个 agent 在全新上下文里评审」这条，报告称作者引用 **Huang et al. 2024**（模型不擅长在同一上下文里发现自己的错误）。
- 「它需要存在吗？」规则来自与 **Ponytail** 的对照测试（对比 first-pass 单独、first-pass + ponytail、以及该规则的不同版本）。README 把 **obra/superpowers** 列为 Related；回复规则借鉴 **i-have-adhd** 检查第一行和最后一行的做法。
- **作者主张、尚无数据**：这是 0.5 版、收益尚未测量，且每次改动更慢更贵。
- 报告明确：原文只提到 Cursor、Codex、Windsurf、Claude Code，**没有提及 Cline**；也没有描述后台自主推进的长任务。

## 依据的调研

- [joetawil7/first-pass](../research/radar/2026-10-01/8-joetawil7-first-pass.md)：值得一试，建议在一个仓库上小范围试装并跑几周，因为它把“确保正确”这类模糊要求换成了可执行的具名检查（十个问题、非作者评审、改动前失败的测试），直接对应本项目的任务匹配与效果验证问题；但作者自己说这是 0.5 版、收益尚未测量，且每次改动更慢更贵（小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元），因此不宜直接全团队采用。
