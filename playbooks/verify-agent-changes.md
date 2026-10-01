# 让编码 agent 在宣布完成前拿出证据，包括它亲眼看到的界面

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把「确保正确、100% 确定」这种没法执行的指令，换成一串具名检查：agent 必须在说「完成」之前同时交出代码侧和界面侧的证据。
> 先试这一步：挑一个仓库小范围试装 first-pass，让下一个改动完整走一遍 premortem → 只修真实伤害 → breaker 评审 → ship-check；如果这次改的是前端，只再加一件事：让它多尺寸截图并定位移动端溢出，和手动 F12 对照。
> 最近修订：2026-10-02

## 解决什么问题

每个功能请求都以「确保代码正确、无 bug、覆盖所有缺口、100% 确定」结尾，但 agent 检查的往往只有它刚写的那几行。作者的完整审计在代码库里发现 **318 个问题，其中 25 个高严重度**；按原因分类，**只有 45 个落在正在写的那些行里**，其余都在改动周围的代码里。其中一些还是更早审计已发现并修过的——每次只补一个点，教训没有带到下一个会话。

这篇手册把「确保正确」换成一串具名、可执行的检查，并规定 agent 在宣布「完成」之前必须交出证据。

还有第二件事：「跑过测试」不等于「用户看到的界面是对的」——移动端横向滚动、console 报错、接口 4xx/5xx、坏图坏链、按钮「没反应」、上线前的样式回归，这些代码和测试都拦不住。所以还要给 agent 一双能自己在后台开浏览器的眼睛，把它看到的东西（截图、报告、前后比对）作为证据交回来。

## 适用与不适用

**适用**

- 把所有仓库放在一个文件夹、从这个文件夹启动会话的多仓库工作方式（first-pass 就是为这个模式设计的）；单个仓库单独用也行。
- Claude Code：能拿到插件和 hooks，可以扣住编辑、把没有证据的「done」打回、会话开始时报告漂移。
- Cursor、Codex、Windsurf 等：能拿到同样的规则和技能，但**没有 hooks**。
- 有界面的项目：浏览器 skill 以后台方式运行，不占用你正在用的浏览器，前端、后端、非 Node 项目都能用。

**不适用 / 需要知道**

- 来自 fork 或外部贡献者的 PR，`review` 只读不跑，除非你同意。
- first-pass 作者自称这是 **0.5 版、收益尚未测量**，而且每次改动更慢更贵（小 demo 上修一个重复扣费 bug 加 ship-check 约 **29 美元**），因此不宜直接全团队铺开。
- first-pass 原文没有描述后台自主推进的长任务：所有触发都来自 setup、hook、会话开始或你显式输入的斜杠命令。
- 浏览器 skill 是 **49 stars 的单作者第三方 skill（MIT）**，效果数据只来自「各跑一次」的对比，不足以直接写成标准做法；建议先在一个前端项目里小范围试跑。它原文也**没有**给定时/事件/状态触发的编排方案，唯一与持续运行沾边的是「把流程转成项目内 Playwright Test 后在 CI 里跑」（原文只列了 `references/project-tests.md`，未展开）。
- 后端纯逻辑改动、没有页面的项目，用不上浏览器这一套；别为了用而用。

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

## 操作步骤

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

**最小试用方式**

- first-pass：在**一个仓库**上小范围试装，第一个改动完整走一遍 premortem → 修改（只当场修真实伤害）→ breaker 评审 → ship-check。
- 浏览器 skill：先在**一个前端项目**里只做「多尺寸截图 + 移动端溢出定位」这一件事，把结果和手动 F12 的结论对照，确认它对得上再扩展。

**试多久**

- first-pass：作者的建议是跑**几周**再判断是否铺开。成本要有预期：小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元，且作者自己说每次改动更慢更贵、收益尚未测量。
- 浏览器 skill：原文只给了「各跑一次」的对比数据，没有多轮、没有跨项目验证，因此没有可信的试用时长建议。先按上面的最小试用走，自己记录 2–3 次真实任务里「它报的问题是否成立、漏报了什么」，再决定是否常驻。

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

**没有证据支撑的部分**：把浏览器实测和「完成的定义」串成一条流程、以及「先在一个前端项目只做多尺寸截图 + 移动端溢出」这个试用建议，是本次合并时按上述材料做的编排，不是原文给出的验证结论。

## 依据的调研

- [joetawil7/first-pass](../research/radar/2026-10-01/8-joetawil7-first-pass.md)：值得一试，建议在一个仓库上小范围试装并跑几周，因为它把“确保正确”这类模糊要求换成了可执行的具名检查（十个问题、非作者评审、改动前失败的测试），直接对应本项目的任务匹配与效果验证问题；但作者自己说这是 0.5 版、收益尚未测量，且每次改动更慢更贵（小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元），因此不宜直接全团队采用。
- [AndyShiu/claude-skill-playwright-browser](../research/radar/2026-10-01/22-andyshiu-claude-skill-playwright-browser.md)：值得一试，建议在一个前端项目里按 README 的安装与命令做小范围试跑（先只做「多尺寸截图 + 移动端溢出定位」这一件事，与手动 F12 对照），因为原文给出了可直接复制的安装步骤、CLI 命令、登录流程和排错表，且自带视觉比对与健康检查等验证手段；但它只是 49 stars 的单作者第三方 skill，效果数据仅来自各跑一次的对比，不足以直接写成标准做法。
