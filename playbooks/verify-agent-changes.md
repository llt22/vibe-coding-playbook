# 让编码 agent 在说「完成」前交出可核对的证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：agent 说「做完了」「测试通过」，但你手上没有任何能核对的证据——这篇手册给出一套可搬走的检查、回执、运行轨迹和界面事实，让「完成」变成必须交出来的东西。
> 先试这一步：下一次让 agent 动手前，先要求它对着真实代码跑一遍 premortem，并交出「改动前会失败的那个测试」；它给不出，就当它还没开始。
> 最近修订：2026-10-12

## 解决什么问题

每个功能请求都以「确保代码正确、无 bug、覆盖所有缺口、100% 确定」结尾，但 agent 检查的往往只有它刚写的那几行。作者的完整审计在代码库里发现 **318 个问题，其中 25 个高严重度**；按原因分类，**只有 45 个落在正在写的那些行里**，其余都在改动周围的代码里。其中一些还是更早审计已发现并修过的——每次只补一个点，教训没有带到下一个会话。

这篇手册把「确保正确」换成一串具名、可执行的检查，并规定 agent 在宣布「完成」之前必须交出证据。

第二件事：「跑过测试」不等于「用户看到的界面是对的」——移动端横向滚动、console 报错、接口 4xx/5xx、坏图坏链、按钮「没反应」、上线前的样式回归，这些代码和测试都拦不住。所以还要给 agent 一双能自己在后台开浏览器的眼睛，把它看到的东西（截图、报告、前后比对）作为证据交回来。

第三件事：「测试通过」这四个字本身也可能是假的。dotpals 的做法是**读测试输出而不是听 agent 自称**——它把每个测试结果归为 `✅ ran successfully` / `❌ failed` / `❔ unclear` / `⚪ not run`，识别「伪造通过」（改测试去掉断言、加 skip、改期望值），并指出「测试通过后又改了文件、此后没再测过」这类时点问题；在 Claude Code 上还会在 agent 试图结束、commit 或 push 时把失败测试回推给它修。

第四件事：「完成」是主张，不是事实。`Grit-77/done-is-a-claim` 把这句话落成可搬走的东西：一条 understand → plan → implement → diagnose → review → verify → deliver 的主流程、13 个互相衔接的技能、18 条实战规则（每条在 `INCIDENTS.md` 里对应一个失败故事）、可复用的完成回执 / 验收简报 / 交接模板，以及 `tools/receipt.py` 这类本地采证小工具。它和 first-pass 的分工很明确：first-pass 用 hook 把没有证据的「done」扣住，是**闸门**；done-is-a-claim 原文写死了「规则不是闸门」——**不拦截工具调用、不阻断合并、不强制执行部署策略**，它给的是能带走、能贴进任何项目、不依赖某一家宿主的规则、模板和回执工具。宿主拿不到 hooks 时，用这一组。

第五件事：上面几条都建立在「agent 能读到正确的事实」上，但它定位 bug 时多数只能读代码猜——它看得见代码，看不见这次点击实际走了哪条路径、哪一步的值是 `undefined`。Shrike 把一次点击从浏览器 → 服务器 → 数据库的整条路径记录成一条 trip，坏掉的那一步标红并内联当时真实的值（例如 `userId: undefined` 出现在 `todos.controller.ts` 第 18 行），再通过 MCP 交给终端里的 Claude Code；agent 只能给出 diff，必须你点 Apply 才真正改码，改完自动重放同一次点击来证明修好了。它补的不是「什么算完成」，而是「agent 据以判断的事实从哪来」，以及把改码的批准权留在你手里。

## 适用与不适用

**适用**

- 把所有仓库放在一个文件夹、从这个文件夹启动会话的多仓库工作方式（first-pass 就是为这个模式设计的）；单个仓库单独用也行。
- Claude Code：能拿到插件和 hooks，可以扣住编辑、把没有证据的「done」打回、会话开始时报告漂移。
- Cursor、Codex、Windsurf 等：能拿到同样的规则和技能，但**没有 hooks**。
- 有界面的项目：浏览器 skill 以后台方式运行，不占用你正在用的浏览器，前端、后端、非 Node 项目都能用。
- 有测试套件的编码项目：dotpals 读测试输出判定真通过、识别伪造通过，并在 Claude Code 上回推修复；对「改了代码但测试通过后又改文件」这类时点问题特别有用。
- done-is-a-claim：宿主是 Claude Code 或 Codex（两者都有原生插件装法），或任意会读 `AGENTS.md` 的 agent；你只想拿走规则、模板和回执工具，不想装一套会拦你的插件；需要在 agent 之间交接工作（`handoff.md`、`evidence-freshness`、`resuming-work`、`collecting-worker-results` 就是处理「检查之后工作又变了」「subagent 汇报成功」这类收尾问题的）。
- Shrike：用 AI 搭 Web 应用、需要在**本地**调试「点按钮没反应 / 报错」这类 bug 的人；后端是 Node（Express、Next.js、NestJS、Hono、Remix）或 Python 3.12+（FastAPI、Flask、Django），前端是 Vite/Next 时，能拿到逐函数的参数、返回值和源码行号。
- Shrike：手上是 macOS Apple Silicon，并且希望把「写文件的权限」从 agent 手里收回来——每个改动都是你点 Apply 才落地。
- Shrike：已经用 Claude Code，想给它补一份「真实执行轨迹」当上下文；不装 Claude Code 也能用内置 agent + 你自己的 Anthropic API key，完全不接 agent 时记录、Thread、API client 仍然可用。

**不适用 / 需要知道**

- 来自 fork 或外部贡献者的 PR，`review` 只读不跑，除非你同意。
- first-pass 作者自称这是 **0.5 版、收益尚未测量**，而且每次改动更慢更贵（小 demo 上修一个重复扣费 bug 加 ship-check 约 **29 美元**），因此不宜直接全团队铺开。
- first-pass 原文没有描述后台自主推进的长任务：所有触发都来自 setup、hook、会话开始或你显式输入的斜杠命令。
- 浏览器 skill 是 **49 stars 的单作者第三方 skill（MIT）**，效果数据只来自「各跑一次」的对比，不足以直接写成标准做法；建议先在一个前端项目里小范围试跑。它原文也**没有**给定时/事件/状态触发的编排方案，唯一与持续运行沾边的是「把流程转成项目内 Playwright Test 后在 CI 里跑」（原文只列了 `references/project-tests.md`，未展开）。
- 后端纯逻辑改动、没有页面的项目，用不上浏览器这一套；别为了用而用。
- dotpals 很新（**31 stars、v0.10**）：**强制回推修复只支持 Claude Code**；Cursor / Gemini CLI / OpenCode / GitHub Copilot CLI 只挂只读 hook，原文明确「none of them can approve or block anything」，只能事后观察和提醒。
- 无测试的项目不会被 dotpals 拦住；它对「没改代码、只是让你跑测试」的请求只报告失败，对「Claude 动手前就已经失败」的测试也只报告、不强制修。
- done-is-a-claim 作者明说：**不拦截 agent 的工具调用、不阻断合并、不强制部署策略**，所以它自己挡不住任何东西，别把它当闸门用。
- done-is-a-claim 的演示和本地工具需要 **Python 3.10+**；只复制规则文件则不需要。效果数据为作者自报，原始日志未公开。
- Shrike **只覆盖本地开发调试，不做生产监控**——README 明确写「For errors in production, keep Sentry」，生产上的错误还是 Sentry 的活。
- Shrike 平台强绑定 **macOS Apple Silicon**（语音需 macOS 15+）。Linux 只有 x64/arm64 的自构建（AppImage 或 `.deb`，或取 CI 的 `shrike-linux-x64` artifact，NixOS 用 `appimage-run`）且没有语音；Windows 能用同一份配置构建，但**从未在 Windows 机器上跑过**。
- Shrike 对**其他会说 OpenTelemetry 的后端**（.NET、Go、Java、3.12 之前的 Python）只有请求、查询和外部调用级的基础 tracing，拿不到逐函数的值。
- Shrike 成熟度有限：仓库 **31 stars**、只有 GitHub README，没有实测、没有第三方评测；Roadmap 里的自动更新、Windows/Linux 正式发布、`.shriketrace` 可分享记录与只读 web viewer、更多栈（Vite SSR、SvelteKit、Nuxt）都**尚未完成**。
- Shrike 原文几乎没有「时间/事件/状态触发的持续完成」依据：只有「点击即自动记录整条 trip」「worktree 里并行跑修复」「任何离开本机的动作都要先问」，不要指望它自己定时推进长任务。

## 前置条件

**first-pass**

- Claude Code 走插件安装；hooks 需要 **PATH 上有 Node.js 18 或更高版本**（测试在 Windows 和 Linux 上跑过）。
- `review` 需要你自己的 `gh` 登录。
- 可选的 `jev` 需要你有 TypeSafe API key，并指定存放 key 的变量名。
- 跑 setup 前想清楚代码回答不了的那几个问题：哪些仓库有 UI、谁依赖谁、跑哪些仓库 hooks。

**浏览器 skill**

- 已装 Claude Code；Node.js ≥18（`node -v` 自查）；macOS / Linux / Windows。
- Chromium 约占 **150 MB** 磁盘；要测 Safari 兼容再装 WebKit。
- 目标 URL 可用，且 dev server 在跑（`localhost` 不通时 Claude 会告知，并可帮你起）。
- 需要登录的站点：先人工登录一次并保存会话；只有你输入凭据，凭据不被存储。

**dotpals**

- **Node.js 20 或更新**（安装命令的前提）。
- 项目里有测试套件才会被拦：jest、vitest、mocha、node:test、pytest、go、cargo、dotnet、Maven、Gradle、PHPUnit、RSpec 等；无测试的项目不会被拦住。
- 想拿到「强制回推修复」需要装 Claude Code 插件；Codex 零安装（跟随 `~/.codex/sessions`）；Cursor / Gemini CLI / OpenCode / GitHub Copilot CLI 只挂只读 hook，其中 Gemini CLI 需 **0.26+** 且在你信任的目录里。
- 接自定义 agent：本地 bridge 在跑，监听 `127.0.0.1:5175`。
- 二次复核：Laya 需 **Python 3.10+**；云端 TypeSafe Jev **默认关**，需要你自己的 key。
- 首次会下载 Electron runtime（约 **100 MB**，只下一次）。

**done-is-a-claim**

- 本机有 Git；跑演示和 `tools/` 下的工具需要 **Python 3.10+**。
- 宿主是 Claude Code、Codex，或任意会读 `AGENTS.md` 的 agent。
- 想装成原生插件，需要对应宿主的插件命令（见第 29 步）；想只拿规则，只需要能往项目里复制文件。
- 有一个自己的小项目可用来试跑一轮，最好带测试套件。

**Shrike**

- **macOS Apple Silicon**；语音需要 macOS 15+。
- 你的应用能在 **Node 22.18 及以上**运行；从源码跑需要 **Node 24 + pnpm 10**；语音还要 Xcode（helper 首次使用时构建）。
- Claude Code 是**可选项**：装了就用你自己的订阅；没装则用内置 agent + 你自己的 Anthropic API key。完全不接 agent 时，记录、Thread、API client 仍然可用。
- 想拿到逐函数的值，后端得是 Node（Express、Next.js、NestJS、Hono、Remix）或 Python 3.12+（FastAPI、Flask、Django）；只有基础 tracing 的栈拿不到。

## 操作步骤

下面 1–20 是「规定什么才算完成」和「让它自己看到界面事实」；21–28 是去核对 agent 说的「测试通过」是不是真的；29–38 是同一件事的「不装闸门」做法——把证据要求写成规则、模板和本地回执，不依赖某个宿主的 hooks；39–43 是去补上「agent 看不见实际执行」这块——用真实运行轨迹把原因钉到具体代码行，并把改码的批准权留在你手里。五组可以各自单独用。

### 1. 安装 first-pass：选做法 A 还是 B

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

### 12. 给 agent 一双眼睛：装浏览器 skill（选做法 A 还是 B）

下面这几步和上面的规则是两件事：规则管「什么才算完成」，浏览器 skill 管「让它自己去看到界面上的事实」。两者都要，互不替代。

**做法 A（个人用，所有项目可用）**

```bash
git clone https://github.com/AndyShiu/claude-skill-playwright-browser.git ~/.claude/skills/playwright-browser
```

**做法 B（单个项目，随项目提交给团队）**

```bash
git clone https://github.com/AndyShiu/claude-skill-playwright-browser.git <project>/.claude/skills/playwright-browser
```

Windows 个人目录为 `%USERPROFILE%\.claude\skills\playwright-browser`。

**怎么选**：只给自己用、想在每个项目里都能使 → A；要跟团队共享、跟着项目版本走 → B（会提交进项目仓库）。

**预期结果**：skill 目录克隆完成。**目录名必须叫 `playwright-browser`**，否则不会被识别。

### 13. 装运行时（Chromium，约 150 MB）

默认方式：第一次使用时 Claude 会自己发现运行时没装、告知你并执行一次性 setup。想提前装：

```bash
node ~/.claude/skills/playwright-browser/scripts/setup.mjs                  # Chromium only
node ~/.claude/skills/playwright-browser/scripts/setup.mjs firefox webkit   # also Firefox and WebKit (Safari's engine)
```

npm 包进 skill 目录内的 `node_modules/`（已 git-ignore），浏览器进 Playwright 共享缓存（所有项目共用一份下载）；README 称「你的项目目录永不被碰」。

**怎么选**：只做日常多尺寸截图和健康检查，装 Chromium 就够；需要验证 Safari 兼容（WebKit）再加 `webkit`。

### 14. 用自然语言下任务（不用提 "Playwright"）

README 给的例句，可以原样照说：

```
Take mobile and desktop screenshots of the homepage at localhost:5173
A customer says our site scrolls sideways on iPhone — find the element that's too wide
Health-check the new checkout page before we ship it
I changed the header CSS — compare before and after
On the admin "Orders" page, does going to page 2 actually load different data?
This issue says "Submit" does nothing — reproduce it on dev and capture screenshots
Screenshot every page in the admin menu and save them to my Desktop
```

**行为约定**：只做你要的事（要截图就只给截图，问一个 bug 就只查那个 bug）；只有你明确要 review / health check 时才输出完整检查加建议清单。

**什么时候用这个、什么时候用 Chrome**（README 的分工判据）：要用你当前开着的标签页、用你已登录的浏览器、想看着它干活、一次性随便看看 → 用 Claude in Chrome；要后台运行不碰你的浏览器、要结果可重复、要一次批量多尺寸多页面、要健康检查 / 报告 / 前后比对 / 测试 → 用本 skill；两者都行时 Claude 会问你偏好并给建议。

### 15. 需要登录的站点

1. 告诉 Claude 你要操作需要登录的站点，它打开一个浏览器窗口；
2. **你自己**在该窗口登录（只有你输入凭据，凭据不被存储）；
3. 用完关掉窗口，或让 Claude 在到达指定页面后自动保存并关闭。

之后 Claude 可在后台复用该会话；每次运行后站点刷新的 token 会被写回，持续使用的会话保持登录。若闲置超过站点登录有效期，Claude 会检测到跳转登录页并请你重新登录，而不会把登录页当结果交给你。

### 16. 想自己跑 CLI（日常不需要，Claude 会代劳）

```bash
PW="$HOME/.claude/skills/playwright-browser/scripts/pw.mjs"

node "$PW" inspect --url https://example.com --click "Pricing"        # text outline of the page
node "$PW" shot    --url https://example.com --viewport desktop,mobile --full
node "$PW" audit   --url https://example.com                           # full health check, writes report.md
node "$PW" run     --script flow.mjs --url https://example.com         # custom flow
node "$PW" login   --session admin --url https://example.com/login --until-url dashboard   # log in; saves once you reach dashboard
node "$PW" sessions                                                    # list saved sessions
node "$PW" clean   --days 0                                            # delete all temp screenshots
```

每条命令输出一行 JSON；全部选项见仓库 `SKILL.md`。

### 17. 知道文件去哪（涉及数据安全，必须遵守）

| What | Where | Notes |
|---|---|---|
| Login sessions | `~/.claude/playwright/sessions/<project>/` | 含 cookies/tokens，仅你可读，**绝不提交或分享** |
| Visual baselines | `~/.claude/playwright/baselines/<project>/` | 前后比对用的参考截图 |
| Screenshots & reports | 系统临时目录的 `claude-playwright/` | **7 天后删除**，要留的 Claude 会问存哪 |

**预期结果**：会话和 baseline 按项目分目录躺在 `~/.claude/playwright/` 下；截图默认会自动消失，不用手工清理。

### 18. Windows / Git Bash 的路径改写坑

Claude Code on Windows 默认用 Git Bash，会把以 `/` 开头的参数改写成 Windows 路径（`--until-url /dashboard` 变成 `C:/Program Files/Git/dashboard`）。本 skill 对自己的选项会自动还原；你手动跑别的命令遇到同样问题时：去掉前导 `/`（写成 `--until-url dashboard`）、命令前加 `MSYS_NO_PATHCONV=1`，或改用 PowerShell / cmd。

### 19. 出问题查这张表

- 截图显示登录页 → 会话过期，让 Claude 重新登录。
- 显示 loading spinner → 让 Claude 等到特定内容再截（用 `--wait-for`）。
- 内网站点证书错误 → 确认主机可信后加 `--insecure`。
- `localhost` 不通 → dev server 没起，Claude 会告知并可帮你起。
- 按钮「没反应」其实是弹了确认框 → 浏览器对话框默认被关闭，Claude 知道何时该接受。
- 要测 Safari 兼容 → 跑 `setup.mjs webkit`。

### 20. 维护与卸载

- 更新：在 skill 目录 `git pull`；`package.json` 变了就再跑一次 `node scripts/setup.mjs`。
- 卸载：删 skill 目录和 `~/.claude/playwright/`；浏览器缓存在删目录前先跑 `npx playwright uninstall --all`，或手动删 `~/Library/Caches/ms-playwright`（macOS）、`~/.cache/ms-playwright`（Linux）、`%LOCALAPPDATA%\ms-playwright`（Windows）。
- 想让它进 CI：README 说可以把一条流程转成项目内 Playwright Test（细节在 `references/project-tests.md`，原文未展开）。

### 21. 装 dotpals（前提：Node 20 或更新）

```bash
npx dotpals@latest setup
```

从 GitHub 直装：

```bash
npx --allow-git=all github:rikinshah787/dotpals setup
```

这一步会：把桌面 pal 装到 `~/.dotpals` 并下载 runtime（Electron，约 100 MB，一次）；若装了 Claude Code 就加插件；若装了 Codex 自动接管；启动 pal、开启「登录时打开」、打开 dashboard。

可选参数：`--no-claude`（跳过插件）、`--no-login`（不要开机自启）、`--no-start`。随时重跑即可更新。

**预期结果**：dashboard 打开，`dotpals status` 能看到什么在跑、连了哪些 agent。

### 22. 只装 Claude Code 插件 / Codex 零安装

在 Claude Code 里：

```
/plugin marketplace add rikinshah787/dotpals
/plugin install dotpals@dotpals
```

重启 Claude Code，然后运行 `/dotpals:pals`。首次会询问是否下载桌面窗口的 runtime；之后每个 Claude Code 会话启动时 pal 自动出现。

**Codex（无需安装）**：dotpals 跟随 Codex 的会话日志 `~/.codex/sessions`，CLI、IDE 扩展和 app 都会显示。保持 pal 运行（托盘里勾 *Open when I log in*）。用 `DOTPALS_CODEX=0` 可关掉。

### 23. 接入其他 agent

打开 dashboard 的 **Agents** 页，对要用的 agent 按 **Connect**。Connect 会先备份原文件、合并而非覆盖、读不了的文件不动；**Disconnect** 只移除 dotpals 加的内容；**Send a test event** 会跑真实命令，收到则有个 pal 打招呼。Connect 会改动这些文件：

| Agent | Connect 改动的文件 |
| ----- | -------------------- |
| Cursor | `~/.cursor/hooks.json`（保存即重载） |
| Gemini CLI | `~/.gemini/settings.json`（需 Gemini CLI 0.26+，且在你信任的目录里） |
| OpenCode | 新增 `~/.config/opencode/plugins/dotpals.js`（需重启 OpenCode） |
| GitHub Copilot CLI | 新增 `~/.copilot/hooks/dotpals.json` |

每个集成也可以在 `~/.dotpals/config.json` 里用 `{ "agents": { "cursor": false } }` 关掉，id 为 `claude`、`codex`、`cursor`、`gemini`、`opencode`、`copilot`、`generic`。

**怎么选**：只有 Claude Code 有 hook + transcript 的完整观测和**强制回推修复**；Cursor / Gemini CLI / OpenCode / GitHub Copilot CLI 只挂只读 hook（原文明确它们不能批准或阻止任何东西），只能事后观察和提醒。只想看、不想拦，装到任一个即可；想让它把失败测试回推给 agent 修，就用 Claude Code。

### 24. 接自定义 agent（POST JSON）

前提：本地 bridge 在跑，监听 `127.0.0.1:5175`。同一个 `id` 的行会被合并，所以可以在工具调用开始时发一次、结束时再发一次：

```bash
# a tool call starts…
curl -s localhost:5175/event -d '{
  "session": "run-42", "harness": "my-agent", "label": "my-project",
  "state": "working", "text": "Running tests",
  "activity": { "id": "call-1", "kind": "run", "tool": "shell", "title": "Run the tests",
                "status": "running", "body": { "command": "npm test" } }
}'

# …and finishes
curl -s localhost:5175/event -d '{
  "session": "run-42", "harness": "my-agent", "state": "thinking",
  "activity": { "id": "call-1", "status": "ok", "ms": 5120, "body": { "output": "42 passing" } }
}'

# a file edit, with its diff
curl -s localhost:5175/event -d '{
  "session": "run-42", "harness": "my-agent",
  "activity": { "id": "call-2", "kind": "edit", "tool": "write_file", "title": "src/app.js", "status": "ok",
                "files": [{ "path": "/abs/path/src/app.js", "change": "edit" }],
                "body": { "patch": "-const a = 1;\n+const a = 2;" } }
}'
```

字段：`activity.kind` 取 `prompt`/`read`/`edit`/`write`/`run`/`search`/`web`/`agent`/`mcp`/`skill`/`plan`/`tool`/`done`/`error`；`activity.status` 取 `running`/`waiting`/`ok`/`failed`/`stopped`/`info`；`activity.files` 为 `[{ path, change: "read"|"edit"|"write"|"delete" }]`；`activity.body` 为 `{ command?, patch?, output?, args? }`。要新增一个 agent，在 `bridge/adapters/` 写同形状的模块（`id`、`name`、`detect()`、`connect()`、`disconnect()`、`apply()`）并在 `index.js` 里登记。

### 25. 让任意助手通过 MCP 问 dotpals

Claude Code：

```bash
claude mcp add dotpals -- npx dotpals mcp
```

Codex，写进 `~/.codex/config.toml`：

```toml
[mcp_servers.dotpals]
command = "npx"
args = ["dotpals", "mcp"]
```

Cursor 等：命令 `npx`，参数 `dotpals mcp`。前提是 dotpals 在跑（MCP 只读本地 pal）。

可用工具：`agents_now`、`test_status`、`ready_to_merge`、`recap`、`today`、`risky_steps`、`handoff_note`、`check_my_work`。可以直接问「What are my agents doing?」「Is this really tested?」「Is feat/login ready to merge?」「What did Codex change in billing this morning?」。项目默认取助手所在的目录，按 agent 真实工作的文件夹匹配（同名文件夹、monorepo 包、git worktree 会区分开）。

### 26. 打开「让 agent 修失败测试」

Claude Code 上默认开启，可在 Settings 或 notch 里的齿轮关掉。行为：测试失败即刻告知 Claude 并说明原因；当它测试失败或最后一次改动后没跑测试却想结束/commit/push 时，回推去修，**每个请求最多两次**，之后可以停下并由 pal 告诉你。没改代码的请求（「跑测试告诉我结果」）只报告失败；Claude 动手前就已失败的测试只报告、不强制它修；输出被 `| tail` 之类切断而无法判读时让它重跑，仍读不出就请你人工看。无测试的项目不会被拦住。

### 27. 判读不清时的二次复核

`Settings → Set up Laya` 或 `dotpals laya`（需 Python 3.10+）在本地复核；或 `Settings → Double-check unclear test results` 选云端 TypeSafe Jev（默认关，需要你的 key，会发送去除密码/密钥/邮箱/IP 后的测试输出尾部）。

### 28. 常用命令与快捷键

```bash
dotpals start       # open the floating pal
dotpals dashboard   # open the dashboard
dotpals status      # what's running and connected
dotpals doctor      # no pal or notch? checks and fixes it (setup runs the same check at the end)
dotpals bridge      # only the bridge, e.g. on a machine without a desktop; dashboard at http://127.0.0.1:5175/dashboard
dotpals mcp         # an MCP server, so any assistant can ask dotpals what your agents did (see below)
dotpals statusline  # Claude Code 只有通过 status line 才共享用量上限，运行一次即可
dotpals notch --auto | --off
```

快捷键：`Ctrl+Alt+P`（macOS `⌘⌥P`）显示/隐藏 pal；批准卡显示时 `Ctrl+Alt+N` / `Ctrl+Alt+Y`（macOS `⌘⌥N` / `⌘⌥Y`）拒绝/允许。

### 29. 装 done-is-a-claim：四种方式选一

前提：本机有 Git；宿主是 Claude Code、Codex，或任意读 `AGENTS.md` 的 agent。

**做法 A（让 agent 自己装，最省事）**——把下面这段原样发给你的 coding agent：

> Install https://github.com/Grit-77/done-is-a-claim. Then explain simply what
> changed, what it helps with, and how I start using it.

安装方 agent 应遵循 `INSTALL.md`：识别当前宿主和安装范围、保留既有工作、验证结果，并用你的语言做简短说明。

**做法 B（手动装成原生插件）**

Claude Code：

```bash
claude plugin marketplace add Grit-77/done-is-a-claim --scope local
claude plugin install done-is-a-claim@done-is-a-claim-marketplace --scope local
```

Codex：

```bash
codex plugin marketplace add Grit-77/done-is-a-claim
codex plugin add done-is-a-claim@done-is-a-claim-marketplace
```

装完开一个新 session：Claude Code 里调用 `/done-is-a-claim:using-done-is-a-claim`；Codex 里通过 `/skills` 或 `$` 技能选择器选 `using-done-is-a-claim`。

**做法 C（只想要规则文件，不要插件）**

先 clone：

```bash
git clone https://github.com/Grit-77/done-is-a-claim.git
cd done-is-a-claim
```

再按你的宿主挑：

| 你用的东西 | 加到项目里 |
|---|---|
| Codex 或读 `AGENTS.md` 的 agent | 把 `AGENTS.md` 复制到项目根目录 |
| Claude Code | 复制 `AGENTS.md` 和 `CLAUDE.md`（后者用 `@AGENTS.md` 导入它） |
| 已有指令文件 | 把相关规则合并进去，保留你项目自己的命令和约束 |

**做法 D（不覆盖已有文件地装技能）**——在 clone 出来的仓库目录里执行，把 `../my-project` 换成你真实项目路径：

```bash
python tools/install_skills.py --project ../my-project --agent codex --profile workflow --dry-run
```

预览没问题后去掉 `--dry-run` 正式安装；Claude Code 用 `--agent claude-code`。已存在的技能目标会被拒绝安装，项目指令文件不动；用 `--list` 看有哪些 profile 和单个技能；显式 `--update` 可以替换未被修改过的、安装器自己管理的副本并保留备份，本地改过的会被拒绝。

**怎么选**：想一次拿到全流程 + 工具 → A 或 B；只想拿走规则、不想装插件 → C；项目里已有自己的技能和指令、怕被覆盖 → D。

**预期结果与注意**：技能装好、规则文件就位。**原生插件安装不会把这些规则加进被采用项目的指令里**——想让项目本身带上规则，必须走 C 或 D。

### 30. 先看两个演示，理解要防的是什么

前提：Python 3.10+，在第 29 步 clone 出来的目录里。

```bash
python examples/false_green.py
python examples/wrong_delivery.py
```

**预期现象**：

- `false_green.py`（假绿，合成演示）：verifier 以退出码 **1** 失败，summarizer 打印它的输出后却以 **0** 退出；receipt 跟随 verifier，标注 **FAIL**。demo 自身退出 0，是因为它把这个不一致演示出来了，**不代表 verifier 通过**。
- `wrong_delivery.py`（交付错件）：对比三种情况——过期的副本、正确的副本、字节相同但无法解析的内容。用的是临时本地 fixture，退出 0 表示陷阱被演示出来，不代表真实交付成功。

**怎么选**：时间紧就只跑假绿这一个；要给别人讲清楚「字节对不等于交付对」，再跑第二个。

### 31. 用第一句请求试一次（在你自己的项目里）

```
Use using-done-is-a-claim for this task. Identify observable acceptance, take a
proportionate path through implementation and review, and report the actual
result, tested inputs and remaining gaps. Continue within my existing authorization.
```

这一步是在检查 agent 有没有理解请求，**并不强制它遵守**——它没有 hooks。

**预期结果**：agent 的报告里出现「可观察的验收标准」和「没验证的部分」，而不是一句「都做完了」。

### 32. 在真实工作上冒烟测试安装

前提：已按第 29 步装好，且你用自己正常的宿主和账号把 agent 跑起来（`native_smoke` 只创建和检查 fixture）。从 clone 目录执行：

```bash
python tools/native_smoke.py create --project ../claim-smoke
python tools/native_smoke.py verify --project ../claim-smoke --json
```

**预期结果**：初始的独立检查是**故意失败**的，尽管 starter 的窄测试能过——这正是用来练「窄测试通过 ≠ 独立验收通过」。

### 33. 给一条命令采集回执

```bash
python tools/receipt.py -- python tools/run_tests.py
```

它会在 `.local/receipts/` 下写出新的 `receipt.json` 和 `command.log`，记录这条命令自己的退出码、完整输出和 Git 状态。用 `--input` 可以在运行前后对选定文件做指纹。

**语义要记牢**：退出码为 0 只记录「这条命令成功了」，**不等于用户的任务完成**；没有用 `--input` 选定输入的回执，对「新鲜度复查」来说是不完整的。

### 34. 编辑或交接后复核回执

用第 33 步打印出来的确切路径：

```bash
tools/check_receipt.py path/to/receipt.json --project .
```

**什么时候用**：你改完东西之后、或者把活交接给另一个 agent 之前——确认这份回执仍然描述你即将据以行动的那些输入。

### 35. 用模板固化报告格式

- `templates/completion-receipt.md`：完成回执
- `templates/acceptance-brief.md`：验收简报
- `templates/handoff.md`：交接

**原则：缺了哪项检查，就要写进报告里。** 主张和证据的对照关系可以直接抄进你的报告规范：

| 主张 | 能支撑它的证据 |
|---|---|
| “测试通过了。” | 命令、收集到的用例、实际结果、它自己的退出状态、被测的代码树 |
| “那个失败在 main 上本来就有。” | 可比的 branch 运行与干净基线运行，且失败签名匹配 |
| “worker 干完了。” | worker 实际的 diff、被检查的输入、验收结果；交付要单独记录 |
| “截图保存了。” | 一张能解码、且被肉眼检查过的图片 |
| “可以发布了。” | 被评审的产物与即将发布的产物仍然一致 |

### 36. 按场景挑 skill

| 出现这种情况 | 用这个 skill | 它帮你判断 |
|---|---|---|
| 想要一个任务入口 | using-done-is-a-claim | 结合任务、授权和已有证据，下一步最有用的动作是什么 |
| 变更有依赖或范围较大 | planning-changes | 哪些有界任务、负责人和观察点能到达目标结果 |
| 计划里有已就绪且已授权的工作 | executing-plans | 现在能推进什么，什么证据能收尾每个任务 |
| 行为与预期矛盾 | debugging-with-evidence | 哪个实验能区分几种可能原因 |
| 变更准备送审 | reviewing-changes | 实际 diff 是否满足请求，发现的问题是否已解决并复查 |
| 任务的“通过”条件含糊 | acceptance-design | 这个检查是否跨过了用户真正在意的边界 |
| 数字看起来很可信 | reading-measurements | 这个输出建立了什么，又留下了什么未知 |
| 你的分支上测试失败 | whose-red | 有没有可比证据区分回归、既有失败、还是原因未明 |
| subagent 汇报成功 | collecting-worker-results | 有没有相关工作、是否被测过、是否真的交付了 |
| 检查之后工作又变了 | evidence-freshness | 回执是否仍描述你即将据以行动的那些输入 |
| README 或发布帖提出主张 | public-claims | 读者能否追溯它，验证的边界有没有写清 |
| 你接手了未完成的工作 | resuming-work | 哪个检查点、产物和下一步动作在当前 checkout 里仍然有效 |
| 发送或发布报告成功 | checking-delivery | 实际目的地是否含被评审的结果，其消费者能否使用 |

### 37. 把 18 条规则贴到手边

完整措辞在 `AGENTS.md`，每条规则背后的失败故事在 `INCIDENTS.md`。按出现的时刻分组记：

| 时刻 | 规则 |
|---|---|
| **开工前** | **01** 干活前先定义验收。 **02** 检查路径。 |
| **说“完成”之前** | **03** 在当前工作状态上重跑。 **04** 检查更宽的测试套件。 **05** 抓取命令自己的退出码。 **06** 没测试就是没通过。 **07** 未知不等于通过。 **08** 每项必需检查都要读。 |
| **汇报时** | **09** 读产物。 **10** 打开写出来的东西。 **11** 自己亲眼看。 **12** 核对引用。 **13** 声明基线并在发布前复核它。 |
| **测试与修复时** | **14** 测行为，别测“是否等于某个常量”。 **15** 修一整类缺陷。 **16** 在已知正确的用例上测试检测器。 **17** 干活前先登记清理。 |
| **永远保住已有工作** | **18** 永远不要用破坏性命令来回答一个问题。 |

### 38. 仓库自检与压力测试（可选）

用来确认环境可用：

```bash
python tools/run_tests.py
python tools/check_repository.py
python tools/check_package.py
```

测试 runner 会拒绝空的或全被跳过的测试套件；后两个检查验证工具、本地文档链接目标、技能元数据和 import。CI（`.github/workflows/check.yml`）在 Windows 和 Linux 上跑。

还想压一压这些指令，就用 `evals/` 场景包：通过的管道、错配的对照组、没有任何相关改动的 worker、过期证据等陷阱。参与者提示与评测 rubric 是分开的；在新 session 里跑提示词并保留回复。注意这是**人工行为评测，不是公布的成功率**。

### 39. 装 Shrike：做法 A（二进制）还是做法 B（源码）

**做法 A（二进制，最快）**

1. 从 Releases 下载 `Shrike-<version>-arm64.dmg`，拖进 Applications。
2. 打开 Shrike（该构建已由 Apple 签名并公证，可像普通应用一样打开）。
3. 点 **Open the sample project** → 按 **Run** → 加一个 todo，看它如何崩。

**做法 B（从源码跑）**

```sh
git clone https://github.com/SumantxD/shrike.git
cd shrike
pnpm i
pnpm dev
```

**怎么选**：只想尽快走通闭环、或不想碰构建 → A；要改代码、或要在自己机器上出 Linux 包 → B。

**平台注意**：Linux（x64/arm64）暂无发布版，用 `scripts/release/build-linux.sh` 构建 AppImage 或 `.deb`（见 `docs/RELEASING.md`），或取某次 CI 的 `shrike-linux-x64` artifact；NixOS 上用 `appimage-run`。Windows 能用同一份配置构建，但从未在 Windows 机器上跑过。语音仅 macOS。

**预期结果**：Shrike 打开，sample project 能跑起来，应用被它接管（它会把应用的 OpenTelemetry SDK 指向自己）。

### 40. 先在 sample project 上走通一次完整闭环

用自带示例把整条链路走熟，再换自己的项目：

1. 点击出问题的按钮：Thread 视图画出 trip（你、页面、服务器、数据库各泳道），坏掉的那步变红，并内联显示真实值。
2. 按 **E** 打开 Files 视图：打开的就是实际执行到的行、带当时经过的值，旁边是这次点击碰过的所有文件（热行=跑过，红行=坏了），底部是可拖动的调用路径。
3. 用大白话提问，例如原句：

```
when I click Add Todo nothing shows up
```

4. 看它给出的 diff → 点 Apply 批准 → 看 Shrike 重放同一次点击证明通过。

**预期结果**：一次点击 → 一条记录 → 原因被钉到某一行并一句话说明；agent 还会告诉你它用了哪个 playbook。这一步不追求修好，追求你看懂「记录 → 定位 → 批准 → 重放」四个动作各自长什么样。

### 41. 接进终端里的 Claude Code（或别的 MCP 客户端）

```
/plugin marketplace add SumantxD/shrike
/plugin install shrike@shrike
```

装好后，终端里的 Claude Code 能读 Shrike 的同一份记录（**Shrike 需保持打开**），会在提示词上方带出最新 trip，并可用 `/shrike`。

用 Cursor 或其他 MCP 客户端时，从 Shrike 的 Tools 面板复制一行式 setup（报告里只写到「复制一行式 setup」，没有给出具体命令，无法照抄）。

**预期结果**：你在终端里问同一个 bug，agent 走的是那一条已记录的 trip，而不是让你把日志粘过来；但改码仍然只在 Shrike 里点 Apply 才生效——接入不改变审批闸门的位置。

### 42. 在你自己的项目上走一遍闭环

1. 让 Shrike 运行你的应用（它会把应用的 OpenTelemetry SDK 指向自己）。
2. 点一次会出问题的那颗按钮——先复现，再谈定位。
3. 用大白话描述症状（例如第 40 步那句例句的写法）。
4. 看 agent 把原因钉在哪一行、一句话说明是什么，以及它用了哪个 playbook。
5. 看 diff → 点 Apply 批准 → 观察同一次点击的 replay 是否通过 → 再提交、开 PR。
6. 修复进 PR 后，CI 检查失败与 review 评论可在同一窗口读，并可把失败转成 lessons。
7. 想并行比方案：用 git worktree 副本（各自端口、各自 agent）同时跑两份修复，留下通过的那份。

**前提与预期结果**：后端是 Node（Express、Next.js、NestJS、Hono、Remix）或 Python 3.12+（FastAPI、Flask、Django）时，才能拿到进你自己代码的每次调用及其参数、返回值、文件与行号，并嵌套在触发它的请求下；其他会说 OpenTelemetry 的后端只有请求、查询和外部调用级。验收信号是「同一次点击重放通过」，不是模型自评。

### 43. 不用配置就已经生效的隐私与审批行为

这四条是默认值，不用去设置里找：

- 无账号、无遥测，代码、记录和密钥留在本机。
- 密钥在存储、展示、发给 agent、导出之前一律剥离。
- agent 不能直接改文件，每个改动都是你批准的 diff。
- 只有你主动要求时才外连：agent 自己的 API、从 Hugging Face 下载语音模型、通过你的 `gh` 登录访问 GitHub。

**预期结果**：你不需要额外写一份安全说明，也不要为了「省事」把 Apply 这一步自动化掉——那正是这条做法存在的理由。

## 怎么判断变好了

**可观察的指标（first-pass）**

- 「done」不再由 agent 自己宣布：改动前会失败的测试 + 非作者评审（breaker）+ 干净 checkout 的 CI 通过，三者缺一就只报 built。
- `ship-check` 输出里能看到 `Verified: <what was run> → <result>`，以及明确列出的「没被验证的部分」。
- 每条评审发现带证据或被标 `unproven`。
- 同类 bug 的复发被落地的共享 helper / 数据库约束 / CI 检查挡住，而不是靠提示词。
- 会话开始时被点出的漂移（CI 变了、新仓库出现、hook 被暂停、Cursor 规则副本落后、规则比插件旧）。

**可观察的指标（浏览器 skill）**

- 移动端横向溢出的报告能**指到具体是哪个元素**，而不是只给一张图。
- 健康检查给出量化项：console 错误、4xx/5xx 接口失败、坏图、坏链、axe 无障碍问题、LCP/CLS。
- 改 CSS 前后拿到红色高亮的 diff 图（先存 baseline → 改后重截）。
- UI 流程每步有截图，失败自动截图。
- CLI 每条命令输出一行 JSON，便于后续判断。

**可观察的指标（dotpals）**

- 每个测试结果被归为 `✅ ran successfully` / `❌ failed` / `❔ unclear` / `⚪ not run`，而不是 agent 的一句「都过了」。
- 「伪造通过」能被点出来：断言被删、加了 skip、期望值被改。
- 「测试通过后又改了文件、此后没再测过」这类时点问题显示成 `Changed 2 files after the tests passed: not tested since`。
- Claude Code 在测试失败、或最后一次改动后没跑测试却想结束 / commit / push 时被回推去修；同一个请求最多两次，之后停下并告知你。
- 会话故事是可以直接用的文本：`today` + **Copy today** 出 standup 便条，**Copy recap** 出 PR 描述或 commit message，`handoff_note` 把会话交接给另一个 agent。
- `risky_steps` 能列出 force push、递归删除、`.env` 改动这类风险步骤。

**可观察的指标（done-is-a-claim）**

- 回执里有命令、实际输出、命令自己的退出码、Git 状态；`receipt.json` 和 `command.log` 落在 `.local/receipts/` 下。
- `check_receipt.py` 能判定这份回执是否还描述当前的输入（新鲜度），而不是只看它存不存在。
- 报告里出现的是「主张 vs 证据」的对照（见第 35 步的表），而不是一句「测试通过了」。
- subagent 汇报成功时，带着它实际的 diff、被检查的输入和验收结果，而不是一句「干完了」。

**可观察的指标（Shrike）**

- 从点击到定位到具体代码行的往返次数：对照 README 的 Without 列（复制三个终端日志 → 猜是哪个请求 → 模型读代码猜 → 试到碰对），看是否收敛到「一次点击一条记录」。
- agent 第一次给出的修复是否需要推倒重来；把「replay 同一次点击是否通过」当硬判定，统计通过率。
- 需要人工粘贴日志、翻找文件的次数是否下降。
- 调试、发 API 请求、看 PR/CI 是否能在同一窗口完成，窗口切换是否减少。
- 注意：以上全是过程指标。README 没有任何节省时间或成功率的基准数字，别把这些当已验证的收益结论。

**最小试用方式**

- first-pass：在**一个仓库**上小范围试装，第一个改动完整走一遍 premortem → 修改（只当场修真实伤害）→ breaker 评审 → ship-check。
- 浏览器 skill：先在**一个前端项目**里只做「多尺寸截图 + 移动端溢出定位」这一件事，把结果和手动 F12 的结论对照，确认它对得上再扩展。
- dotpals：在**一个有测试套件的小项目**上按 README 一条命令装起来，小范围试。先让 agent 报一次「测试通过」，再用 `test_status` / MCP 核对它说的和实际是否一致；有条件的话加一次「改测试让它变绿」的对照，看它是否识别并回推。
- done-is-a-claim：在**一个小项目**上按第 29 步装一次，用 `receipt.py` 给一条命令采一份回执（第 33 步）、跑一次 `check_receipt.py`（第 34 步），再用第 31 步的请求让 agent 交一次报告，看它有没有把没验证的部分写出来。跑完这一轮再决定要不要固化进团队流程。
- Shrike：在一台 **macOS Apple Silicon** 上装二进制版，先用自带 sample project 走通一次完整闭环（点到崩溃 → 看 Thread 红行与内联真实值 → 看 diff → Apply → 看 replay），再换成你自己一个真实项目（Node/Express、Next.js、NestJS、Hono、Remix，或 FastAPI/Flask/Django 3.12+）挑一个真实的「点按钮没反应或报错」的 bug 复现一遍；然后装上 Claude Code 插件，用终端里的 agent 定位同一个 bug，跟「直接把报错粘进聊天」的做法对照表现差异。

**试多久**

- first-pass：作者的建议是跑**几周**再判断是否铺开。成本要有预期：小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元，且作者自己说每次改动更慢更贵、收益尚未测量。
- 浏览器 skill：原文只给了「各跑一次」的对比数据，没有多轮、没有跨项目验证，因此没有可信的试用时长建议。先按上面的最小试用走，自己记录 2–3 次真实任务里「它报的问题是否成立、漏报了什么」，再决定是否常驻。
- dotpals：报告没有给出试用时长建议；项目是 31 stars、v0.10，先记录 2–3 次真实任务里「它拦下的失败是否成立、误报和漏报各几次」，再决定是否长期用。注意强制回修只在 Claude Code 上有效，其他 agent 只能事后观察。
- done-is-a-claim：报告同样没有给出试用时长，只说先在一个小项目上试跑一轮，再决定是否固化进团队流程。同样记录 2–3 次真实任务里「回执记录的事实和实际是否一致、它漏掉了什么」。
- Shrike：报告没有给出试用时长，也没有任何准确率、耗时或成功率数字，验证方式可操作但未被独立度量。先用一两个真实 bug 做前后对照，记录「定位到行要几个来回、replay 是否通过、还需要人工粘几次日志」，再决定是否扩大使用范围。

## 常见坑

- **别指望提示词本身能拦住。** 作者说只用指令时，11 次测试中有 7 次跳过了改写；能扣住编辑的是 Claude Code 的 hook，Cursor 等拿不到 hooks。
- **问题不要随时问。** 每个问题都会停下会话等你回答——三个会话三天里的 70 组问题中，有 17 组等了一小时以上。先做完所有不依赖你回答的部分，再一次问剩下的。
- **`jev` 不是裁判。** 它在 269 个审计问题上排序时，给「多少人会遇到」的权重高于「伤害多大」，所以它能让一条发现变严重，但永远不能清除评审者认为严重的发现。
- **`habit-words` 的输出别外流。** 只含你自己的短语和检查，绝不写进团队共享文件；transcript 只读、临时文件用完删除。
- **装了 first-pass 插件别再 `-a claude-code`**，否则每个 skill 出现两次；Windows 上用 `--copy`，因为符号链接会变成纯文本。
- **hook 是被钉住的**：某个 pull 改了 hook 脚本文件夹里的任一文件，hook 就暂停等你重新批准，别以为是坏了。
- **fork / 外部贡献者的 PR 只读不跑**，除非你同意。
- **`review` 不会自己发帖**：只有你挑了某个修复并说 yes 才推。
- **浏览器会话文件绝不提交、绝不分享。** 它含 cookies/tokens，只放在 `~/.claude/playwright/sessions/<project>/`；截图和报告在临时目录 7 天后删除，要留的得另说存哪。
- **浏览器 skill 不替你做代码评审。** 它的约定是只做你要的事；想要完整检查清单，你得明确说 review / health check。
- **成本主要在「看图」**：每张约 1.5k–2k token。只截需要的尺寸、直接给 URL 能省；别顺手「把整个后台菜单都截一遍」。
- **它不认识你的 dev server。** `localhost` 不通就是没起，先起服务再下任务；内网自签证书先确认主机可信再加 `--insecure`。
- **别把它当已成熟方案。** 49 stars、单作者、对比只跑了一次，先在一个前端项目小范围试，别直接当成团队标准。
- **dotpals 别当成熟方案。** 31 stars、v0.10，且**强制回修只支持 Claude Code**；Cursor / Gemini CLI / OpenCode / GitHub Copilot CLI 只挂只读 hook，不能批准或阻止任何东西，只能事后观察和提醒。
- **dotpals 拦不住没有测试的项目**，也不会对「跑测试告诉我结果」这类没改代码的请求强制修；Claude 动手前就已经失败的测试只报告、不强制它修。
- **回推有次数上限**：同一个请求最多两次，之后它会停下并由 pal 告诉你，不是无限重试。
- **输出被 `| tail` 之类切断时它读不出结论**，会让你重跑；仍读不出就请你人工看。
- **Connect 会改你的配置文件**（会先备份、只合并不覆盖、读不了的文件不动），**Disconnect 只移除 dotpals 加的内容**；不想用某个集成就在 `~/.dotpals/config.json` 里按 id 关掉。
- **云端二次复核默认是关的**，开了会把去除密码/密钥/邮箱/IP 之后的测试输出尾部发到 TypeSafe Jev，需要你自己的 key。
- **MCP 只读本地 pal**，dotpals 没在跑时问不到东西。
- **done-is-a-claim 不是闸门。** 作者写明它不拦截工具调用、不阻断合并、不强制部署策略；想真的拦住，得靠 first-pass 的 hooks 或 CI，它自己只提供规则、模板和回执。
- **原生插件装完，规则不会进你的项目指令文件。** 想让项目本身带上这些规则，走第 29 步的做法 C（复制 `AGENTS.md` / `CLAUDE.md`）或做法 D（`install_skills.py`）。
- **回执里退出码 0 ≠ 任务完成。** 它只记录「这条命令成功了」；没有用 `--input` 对选定文件做指纹的回执，对新鲜度复查来说是不完整的。
- **`install_skills.py` 默认不覆盖。** 已存在的技能目标会被拒绝安装，项目指令文件不动；本地改过的副本连 `--update` 也不会替换。
- **跑演示时别把退出码读反。** `false_green.py` 和 `wrong_delivery.py` 退出 0 表示陷阱被演示出来了，不代表真实交付成功或 verifier 通过。
- **Shrike 只做本地调试，不做生产监控。** README 明确写「For errors in production, keep Sentry」；别把它当成线上告警方案的替代。
- **Shrike 平台强绑定。** 只有 macOS Apple Silicon 有发布版；Linux 需自己构建且无语音；Windows 能用同一份配置构建，但从未在 Windows 机器上跑过。
- **不是所有栈都能拿到逐函数的值。** 只有 Node（Express/Next.js/NestJS/Hono/Remix）和 Python 3.12+（FastAPI/Flask/Django）拿得到参数、返回值、文件和行号；其他会说 OpenTelemetry 的后端只有请求、查询和外部调用级，别指望靠它精确定位到行。
- **Shrike 没有定时 / 事件 / 状态触发的编排。** 原文只有「点击即自动记录」「worktree 并行跑修复」「离开本机的动作先问」，不要据此指望它自动推进长任务。
- **Shrike 的效果宣称没有度量。** 对比表、Bazaar 示例、「agent 第一次就修对」「40 秒演示视频」都是作者主张，没有准确率、耗时或对照实验数据；31 stars，先用一两个真实 bug 做前后对照。
- **不装 Claude Code 就要自备 Anthropic API key**；从源码跑要 Node 24 + pnpm 10，语音还要 Xcode（helper 首次使用时构建）。
- **别把 Apply 这步自动化掉。** 「agent 不能直接改文件、每个改动都是你批准的 diff」是 Shrike 这条做法的一半价值，绕过去就只剩一份更好的日志。

## 证据与来源

**first-pass 部分**来自本次调研的 **joetawil7/first-pass** 报告：安装命令、一次性 setup、premortem 十问、建造期间的「它需要存在吗？」规则、完成的定义（改动前失败的测试 + breaker 评审 + 干净 checkout 的 CI）、`fix-the-class`、`review` 的调用方式、`habit-words` 的读取范围与脱敏规则、`sharpen` 在 Claude Code 里的 hook 行为、多仓库的漂移与 hook 钉住机制、可选 `jev` 的行为与限制、以及写到机器上的文件清单。

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

**浏览器 skill 部分**来自本次调研的 **AndyShiu/claude-skill-playwright-browser** 报告（仓库 MIT、49 stars，单作者）：克隆路径与目录名要求、`setup.mjs` 的两种装法、自然语言例句、登录站点的人工登录与后台复用会话流程、CLI 命令清单、三张文件位置表与 7 天清理、Windows / Git Bash 路径改写坑、排错表、维护与卸载步骤、与 Claude in Chrome 的分工判据。

报告里的数据与局限：

- README 中所有示意图（响应式截图、健康检查、前后比对）都由该 skill 对一个小型 demo 站生成。
- 与 Claude in Chrome 的对头测试：同一任务「对 3 个报表页拍移动端截图」（登录态内部 admin，URL 由人给出），两个全新 Claude agent **各跑一次**，token **48,045 vs 48,853**、耗时 **93 s vs 47 s**、工具调用 **9 vs 7**（原文此处截断，未说明哪一组属于哪个工具）。样本只有一次，不足以判定优劣。
- token 成本估算：单图 5k–7k；三尺寸 8k–10k；单页健康检查 12k–18k；排查一个问题/走一条流程 20k–40k；批量多页 25k–40k；每张图约 1.5k–2k。
- 「你的项目目录永不被碰」是 README 的说法，未做独立验证。
- 与清单里已有做法的关系：**Claude Code**（adopt）——本 skill 就是它的扩展；**Playwright Test**（try）——README 说能把流程转成项目内 Playwright Test 在 CI 跑，但细节只在 `references/project-tests.md`，原文未展开。清单中没有其它相关条目。

**dotpals 部分**来自本次调研的 **Rikinshah787/dotpals** 报告（仓库 **31 stars、v0.10**）：一键安装 `npx dotpals@latest setup` 与 GitHub 直装、三个可选参数、Claude Code 插件命令与 `/dotpals:pals`、Codex 的日志跟随与 `DOTPALS_CODEX=0`、dashboard Agents 页的 Connect / Disconnect / Send a test event 行为与各 agent 改动的文件清单、`~/.dotpals/config.json` 按 id 关闭集成、`POST /event` 接口的字段与同 id 合并语义、`bridge/adapters/` 自定义 adapter 的模块形状、MCP 接入命令与可用工具清单、默认开启的「回推修复失败测试」行为与几类只报告不强制修的情形、Laya / TypeSafe Jev 二次复核、CLI 命令与快捷键。

报告里的数据与局限（均为作者 / README 自述，未见第三方复现）：

- 测试结果的四态：`✅ ran successfully` / `❌ failed` / `❔ unclear` / `⚪ not run`。
- 能识别的「伪造通过」：改测试去掉断言、加 skip、改期望值。
- 时点问题示例：`Changed 2 files after the tests passed: not tested since`。
- 失败原因示例：`expected 3, got -1 (test/math.test.js:5)`。
- 支持读测试输出的框架：jest、vitest、mocha、node:test、pytest、go、cargo、dotnet、Maven、Gradle、PHPUnit、RSpec 等。
- 项目很新（31 stars、v0.10）；强制回修只支持 Claude Code，其余 agent 只挂只读 hook，原文明确「none of them can approve or block anything」。
- 回推上限是**每个请求最多两次**。
- 云端 TypeSafe Jev 默认关，需要你的 key，会发送去除密码/密钥/邮箱/IP 后的测试输出尾部。

**done-is-a-claim 部分**来自本次调研的 **Grit-77/done-is-a-claim** 报告：主流程（understand → plan → implement → diagnose → review → verify → deliver）、13 个技能、18 条实战规则与 `INCIDENTS.md`、安装四法（agent 自装 / Claude Code 与 Codex 原生插件 / 复制规则文件 / `install_skills.py`）、`examples/false_green.py` 与 `examples/wrong_delivery.py`、`tools/receipt.py`、`tools/check_receipt.py`、`tools/native_smoke.py`、`tools/run_tests.py`、`templates/` 三份模板、主张与证据对照表、按场景挑 skill 的表、`AGENTS.md` / `CLAUDE.md` 的复制方式。

报告里的数据与局限（均为作者 / README 自述，未见第三方复现）：

- 假绿演示：verifier 退出码 **1**、summarizer 退出码 **0**，receipt 跟随 verifier 标 **FAIL**。
- 定位声明（原文明确）：**不拦截 agent 的工具调用、不阻断合并、不强制执行部署策略**——「规则不是闸门」。
- 原生插件安装**不会**把规则加进被采用项目的指令文件。
- `receipt.py` 的退出码 0 只代表命令成功，不代表任务完成；未用 `--input` 指认输入的回执对新鲜度复查不完整。
- 13 个技能、18 条规则，每条规则在 `INCIDENTS.md` 里有对应失败故事；CI 在 Windows 和 Linux 上跑。
- 演示与工具需要 Python 3.10+。
- 效果数据为作者自报，原始日志未公开。

**Shrike 部分**来自本次调研的 **SumantxD/shrike** 报告：安装（二进制版 `Shrike-<version>-arm64.dmg` 拖进 Applications；源码 `git clone` + `pnpm i` + `pnpm dev`）、Claude Code 插件两行命令与 `/shrike`、sample project 的完整闭环（点击 → Thread 红行与内联真实值 → 按 **E** 看 Files 视图 → 大白话提问 → 看 diff → Apply → replay）、worktree 并行比两份修复、默认的隐私与审批四条规定、支持的技术栈与各栈的记录粒度、Linux 自构建路径与 NixOS 的 `appimage-run`、包结构（`packages/browser-agent`、`node-agent`、`correlator`、`mcp-server`、`apps/desktop`）。

报告里的数据与局限：

- 材料只来自 GitHub README（仓库 31 stars）：没有实测、没有 issue/讨论内容、没有版本发布记录或第三方评测。
- **较可核验的具体内容**：安装与源码运行命令、Claude Code 插件两行命令、支持技术栈清单与各栈记录粒度、隐私与审批机制描述、Roadmap 勾选状态、包结构。
- **仅属作者主张**：「How it compares」对比表中对浏览器 devtools、Sentry、Postman/Bruno、单用 Claude Code 的各项优劣判定；Bazaar 示例应用「一次 Place order 跨 8 个服务、3 个 Postgres、1 个 SQLite outbox、3 个 LRU 缓存、队列、Stripe 和邮件服务，仍能停在那一行」；「agent 第一次就修对」「40 秒演示视频」等效果宣称——均无准确率、耗时或对照实验数据。
- **硬限制**：只覆盖本地开发调试，不能替代生产监控；平台强绑定 macOS Apple Silicon；从源码跑要求 Node 24 + pnpm 10；语音还要 Xcode；不装 Claude Code 要自备 Anthropic API key；Roadmap 中自动更新、Windows/Linux 正式发布、`.shriketrace` 可分享记录与只读 web viewer、更多栈（Vite SSR、SvelteKit、Nuxt）均未完成。
- **主动推进这一项在本条线索中基本无依据**，报告明说「不宜据此写进手册」，因此本手册没有为 Shrike 写任何定时或状态触发的步骤。

**没有证据支撑的部分**：把 dotpals 的测试状态核对接在 first-pass 的「完成的定义」之后、「在已有测试套件的小项目上小范围试，并加一次改绿测试看它是否识别」这套试用方式，把 done-is-a-claim 的「回执 + 新鲜度复核」作为 first-pass 完成定义的无 hook 替代，以及把 Shrike 的「真实执行轨迹 + Apply 审批 + replay 验收」接在 first-pass 与浏览器 skill 之后，都是本次合并时按上述材料做的编排，报告本身没有给出验证结论，也没有给试用时长；四组（现在五组）做法之间可以互相替代的部分，材料里也没有做过交叉验证。

## 依据的调研

- [joetawil7/first-pass](../research/radar/2026-10-01/8-joetawil7-first-pass.md)：值得一试，建议在一个仓库上小范围试装并跑几周，因为它把“确保正确”这类模糊要求换成了可执行的具名检查（十个问题、非作者评审、改动前失败的测试），直接对应本项目的任务匹配与效果验证问题；但作者自己说这是 0.5 版、收益尚未测量，且每次改动更慢更贵（小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元），因此不宜直接全团队采用。
- [AndyShiu/claude-skill-playwright-browser](../research/radar/2026-10-01/22-andyshiu-claude-skill-playwright-browser.md)：值得一试，建议在一个前端项目里按 README 的安装与命令做小范围试跑（先只做「多尺寸截图 + 移动端溢出定位」这一件事，与手动 F12 对照），因为原文给出了可直接复制的安装步骤、CLI 命令、登录流程和排错表，且自带视觉比对与健康检查等验证手段；但它只是 49 stars 的单作者第三方 skill，效果数据仅来自各跑一次的对比，不足以直接写成标准做法。
- [Rikinshah787/dotpals](../research/radar/2026-10-06/1427-rikinshah787-dotpals.md)：值得一试，建议在已有测试套件的小项目上按 README 一条命令装起来小范围试：用 dotpals 读取测试输出、识别“伪造通过”，并在 Claude Code 试图收尾/commit/push 时把失败测试回推给它修。理由是它给出了完整可照做的安装、MCP 接入和自定义 agent 事件接口，且自带一份逐条人工核对的准确率数据；但项目很新（31 stars、v0.10），强制回修只支持 Claude Code，其余 agent 只能事后观察，需先验证再决定是否长期用。
- [Grit-77/done-is-a-claim](../research/radar/2026-10-11/2455-grit-77-done-is-a-claim.md)：值得一试，把「完成是一句主张，要附证据」落成可操作的规则文件+技能包+本地采证工具，先在一个小项目上按 README 的安装路径和 receipt 工具试跑一轮，再决定是否固化进团队流程；理由是它给出了可照抄的安装命令、18 条规则、回执工具用法和验证模板，但作者自己声明不强制、不拦截，效果数据为自报且原始日志未公开。
- [SumantxD/shrike](../research/radar/2026-10-12/2683-sumantxd-shrike.md)：值得一试，在一台 macOS Apple Silicon 上用一个小型 Node/Next（或 FastAPI/Flask/Django）项目接入 Shrike，完整走一遍“点击出错按钮→Agent 沿真实执行轨迹定位到行→批准 diff→重放同一次点击验证”的闭环，理由是把真实运行轨迹（含行内真实值）通过 MCP 喂给 Claude Code、并强制人工批准后才能改码，正好补上编程智能体“看不见实际执行、只能读代码猜”的短板；但只有 macOS 构建、项目仅 31 stars 且无独立评测，先小范围试。
