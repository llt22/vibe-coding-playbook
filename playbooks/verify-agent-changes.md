# 让 agent 在说完成之前拿出可核对的证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这篇手册解决 agent 没看懂就改、没运行检查就说完成、测试通过/界面正确/研究结论都缺少可复核证据的问题。
> 先试这一步：先在一个真实小任务上写清可客观判定的通过标准，要求 agent 先复现、最小改动，并交出修前修后的命令输出或截图；再决定是否装 hooks 或回执工具。
> 最近修订：2026-11-11

## 解决什么问题

每个功能请求都以“确保代码正确、无 bug、覆盖所有缺口、100% 确定”结尾，但 agent 检查的往往只有它刚写的那几行。作者的完整审计在代码库里发现 318 个问题，其中 25 个高严重度；按原因分类，只有 45 个落在正在写的那些行里，其余都在改动周围的代码里。还有一些是更早审计已发现并修过的——每次只补一个点，教训没有带到下一个会话。

本手册把“确保正确”换成一串具名、可执行的检查，并要求 agent 在宣布“完成”之前交出证据。覆盖：first-pass 的完成定义、premortem、breaker 评审和 hooks；浏览器 skill 让 agent 自己看移动端横向滚动、console 报错、4xx/5xx、坏图坏链、按钮没反应、样式回归；dotpals 核对“测试通过”是不是真的；done-is-a-claim 用回执、模板和新鲜度复核补无 hook 场景；Shrike 让 agent 看见一次点击实际走了哪条路径；Vantage 按证据推进工作项；Agent-Cockpit 把研究 claim 锁在运行记录和代码哈希上；deepseek-stack 用短循环和硬停止条件补便宜模型的四个缺口；pstack 把“没看懂就改、没试过就说做完”固化成先复现、最小改动、贴修前修后证据、把纠正写回仓库。最后两条最小规则可独立叠加：AGENTS.md 未运行检查披露、E2E 通过证据加截图/录屏。

## 适用与不适用

**适用**

- first-pass + 浏览器 skill：first-pass 适合把所有仓库放在一个文件夹、从该文件夹启动会话的多仓库工作方式；Claude Code 能拿插件和 hooks，Cursor、Codex、Windsurf 能拿规则和技能但没有 hooks。浏览器 skill 适合有界面的项目，后台运行、不占用你正在用的浏览器，前端、后端、非 Node 项目都能用。
- dotpals：有测试套件的编码项目；读测试输出判定真通过、识别伪造通过，并在 Claude Code 上回推修复；对“改了代码但测试通过后又改文件”的时点问题特别有用。
- done-is-a-claim：宿主是 Claude Code 或 Codex，或任意会读 AGENTS.md 的 agent；你只想拿走规则、模板和回执工具，不想装一套会拦你的插件；需要在 agent 之间交接工作。
- Shrike：用 AI 搭 Web 应用、需要在本地调试“点按钮没反应/报错”的人；后端是 Node（Express、Next.js、NestJS、Hono、Remix）或 Python 3.12+（FastAPI、Flask、Django），前端是 Vite/Next 时，能拿到逐函数参数、返回值和源码行号。
- Vantage：以 Claude Code + git 为主的小仓库；愿意安装 hooks；想观察工作项是否按证据从 Asked 到 Built 到 Proven，而不是听 agent 说做了什么；接受先 dry-run 再安装、数据默认留在本机。
- Agent-Cockpit：以“跑代码/跑实验 → 写结论”为主线的研究流程；目标目录是 git 仓库；agent 支持 MCP；愿意接受三条纪律——所有实验用 cockpit run 执行、变更用 cockpit_report 上报、claim 证据必须是某次记录 run 实际写出的文件字段。
- deepseek-stack：在支持 SKILL.md 的编码 agent 里，用 DeepSeek V4.1 Flash、V4 Pro 这类便宜模型做代码/PR 任务；你愿意让 agent 跑真实检查和 CI；想先用短循环补“跳过计划、没运行就声称修好、重复坏思路、长任务漂移”四个缺口。
- pstack：已有 Claude Code/Cursor/Codex/OpenCode 之一；任务产出可执行验证，能跑命令、能读文件或存储、能对比输出；愿意接受先复现、最小改动、贴修前修后证据；Codex/OpenCode 路线需要 Node.js 22.20+。
- 两条最小规则：代理会读取项目根目录的 AGENTS.md 或同类指令文件，且任务中存在可运行的检查；E2E 规则还要求有可运行的 E2E 测试或检查入口，界面任务能截图或录屏，你愿意人工复核证据。

**不适用 / 需要知道**

- first-pass 作者自称 0.5 版、收益尚未测量，而且每次改动更慢更贵；小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元。原文没有描述后台自主推进的长任务。浏览器 skill 是 49 stars 的单作者第三方 skill，效果数据只来自“各跑一次”的对比；后端纯逻辑改动、没有页面的项目用不上。
- dotpals 很新（31 stars、v0.10）：强制回推修复只支持 Claude Code；Cursor、Gemini CLI、OpenCode、GitHub Copilot CLI 只挂只读 hook，原文明确它们不能批准或阻止任何东西；无测试的项目不会被拦住。
- done-is-a-claim 作者明说：不拦截 agent 的工具调用、不阻断合并、不强制部署策略，所以它自己挡不住任何东西，别把它当闸门用。演示和本地工具需要 Python 3.10+；只复制规则文件则不需要。效果数据为作者自报，原始日志未公开。
- Shrike 只覆盖本地开发调试，不做生产监控——README 明确写 For errors in production, keep Sentry。平台强绑定 macOS Apple Silicon；Linux 只有 x64/arm64 自构建且没有语音；Windows 从未在 Windows 机器上跑过。对其它会说 OpenTelemetry 的后端只有请求、查询和外部调用级基础 tracing。仓库 31 stars、只有 GitHub README，没有实测、没有第三方评测。
- Vantage 仍是 Phase 1、未发布 release；当前只对 Claude Code 和 git 建好可用切片，只有 Asked/Built/Proven 阶段机，Reviewed、Shipped、Verified 还需要后续阶段的数据源。Stop gate 默认只是 warn 模式，只提示、不阻塞；不能当完整交付验收系统或强制闸门。README 自称尚未按日使用满一周，没有独立基准、对照实验或长期使用数据。README 没有提到 Cursor 集成，不能把 Vantage 用于 Cursor 的依据写入手册。
- Agent-Cockpit 很年轻（36 stars），材料只有 README 与作者自述的一次会话录像；误报率和流程摩擦需要自行验证。Python 依赖做到函数级，其他语言的处理方式原文未说明，不要外推。它只给事件/状态触发，没有定时调度或长期后台轮询。不装 graphify 或 open-code-review 时用内置规则，不代表有同等强度的外部审查。
- deepseek-stack 只有 README 级描述（58 stars、MIT）：约 30 个技能只给名称和一句话功能，没有展开每个 SKILL.md 的提示词全文，也没有 benchmark、成功率、成本对比或用户案例。README 称它能让 DeepSeek 像更贵的模型、称 thinking mode 比任何技能都重要，都是作者主张。ds-ship 是无人值守从变更走到合并，ds-watch-pr 会自动盯 CI 和 review bot，ds-adopt / ds-revive 会接手旧 PR；README 没有给权限边界、失败回滚或人工审批点的细节。ds-jury、ds-best-of-n、ds-swarm 需要子代理或第二模型，没有时会退化为在新上下文里串行尝试。
- pstack 是第三方中文教程站（32 stars）的 README，教程对象是 pstack，通用镜像在 backnotprop/pstack；细节页和技能原文都在外链页面，不在本次材料里，命令和行为以官方仓库为准。原文没有版本号、核对日期、成功率、任务耗时对比或案例数据；首页 before/after 图和 hero 演示是示意插画，不是实测记录；作者自承更慢、更费 token，小改动不用它。它没有 hooks 或强制闸门。
- AGENTS.md 未运行检查规则只是一行披露要求，不拦截工具调用、不阻断合并，也不自己运行检查；原文第二条规则在 Every time I correct you, 后被截断，不能复原成完整流程；没有案例、数据或前后对比。任务本身没有可执行检查时，它只能促使 agent 写“未检查”，不能替代验证。
- E2E 验收规则原文只显示第 1 条，第 2 条起截断；没有命令、配置、完整提示词、案例数据或对比结果，推文互动量低，不能当效果证据。任务没有可靠 E2E 检查时，截图或录屏不能证明结果正确。原文要求“自检到通过”但没有给最大轮次或超时，实际用必须自己加停止条件；这是合并时补的控制，不是原文。它不拦截工具调用、不阻断合并。

## 前置条件

**first-pass + 浏览器 skill**

- Claude Code 走插件安装；hooks 需要 PATH 上有 Node.js 18 或更高版本；review 需要你自己的 gh 登录；可选的 jev 需要 TypeSafe API key，并指定存放 key 的变量名。
- 浏览器 skill：已装 Claude Code；Node.js ≥18；macOS / Linux / Windows；Chromium 约占 150 MB 磁盘；目标 URL 可用且 dev server 在跑；需要登录的站点先人工登录一次并保存会话。

**dotpals**

- Node.js 20 或更新；项目里有测试套件才会被拦；想拿到强制回推修复需要装 Claude Code 插件；Codex 零安装；其他 agent 只读 hook；接自定义 agent 需要本地 bridge 在跑，监听 127.0.0.1:5175；二次复核 Laya 需 Python 3.10+，云端 TypeSafe Jev 默认关，需要你自己的 key。

**done-is-a-claim**

- 本机有 Git；跑演示和 tools/ 下的工具需要 Python 3.10+；宿主是 Claude Code、Codex，或任意会读 AGENTS.md 的 agent；想装原生插件需要对应宿主命令；想只拿规则只需能往项目里复制文件；有一个自己的小项目可试跑一轮，最好带测试套件。

**Shrike**

- macOS Apple Silicon；语音需要 macOS 15+；应用能在 Node 22.18 及以上运行；从源码跑需要 Node 24 + pnpm 10；语音还要 Xcode；Claude Code 可选，不装则用内置 agent + 你自己的 Anthropic API key；想拿到逐函数值，后端得是 Node（Express、Next.js、NestJS、Hono、Remix）或 Python 3.12+（FastAPI、Flask、Django）。

**Vantage**

- Node.js 22.5 或更新版本、git、Claude Code；从 checkout 构建还需要 pnpm；当前没有 published release，只能走 checkout；需要本地 daemon、仓库注册、对 Claude Code settings.json 的写入权限和 hooks；数据默认本地存放在 ~/.vantage。

**Agent-Cockpit**

- Node.js ≥ 22.13（用到内置 node:sqlite）、git；demo 项目还需要 python3；目标目录必须是 git 仓库；支持 MCP 的 agent；可选装 graphify 或 open-code-review；三条纪律：实验必须经 cockpit run 执行、变更必须 cockpit_report 上报、claim 证据必须是记录 run 写出的文件字段。

**deepseek-stack**

- 支持 SKILL.md 的编码 agent harness；机器上有可用的 npx；手动安装则要能把 skills/* 复制到所用 harness 的 skills 文件夹；用 Ship 组技能需要安装并登录 gh；ds-watch-pr 需要 python3；ds-jury、ds-best-of-n、ds-swarm 需要子代理或第二模型。

**pstack**

- 已有 Claude Code / Cursor / Codex / OpenCode 之一；Codex、OpenCode 路线需要 Node.js 22.20+；能安装 plugin 或 skills；任务可执行验证；跑一夜还需要独立 worktree，并愿意写决策日志和逃生口。

**两条最小规则**

- 代理能读取并遵守项目根目录的 AGENTS.md，或同类代理指令文件；任务中存在可运行的检查。E2E 规则还要求任务有可运行的 E2E 测试或检查入口，agent 有权限执行这些检查，界面任务能产出截图或录屏，你愿意人工复核证据。

## 操作步骤

以下按做法分组，组内编号；每组可单独用。做法 1 把 first-pass 的完成定义和浏览器 skill 的界面事实放在一起；做法 8 是本次新增的 pstack，材料只到 README 和教程站入口，细节外链不在材料里，只能按下面可核验部分小范围试。做法 9 是两条最小规则。

### 做法 1：first-pass + 浏览器 skill：先规定什么算完成，再让 agent 自己看界面

前提：Claude Code 走插件安装；hooks 需要 Node.js 18+；review 需要自己的 gh 登录；浏览器 skill 需要 Node.js ≥18，Chromium 约 150 MB，dev server 在跑。

1. 安装 first-pass。要 hooks 走 A；只要规则走 B。

```bash
# A（Claude Code）
/plugin marketplace add joetawil7/first-pass
/plugin install first-pass@first-pass

# B（Cursor / Codex / Windsurf 等，没有 hooks）
npx skills add joetawil7/first-pass -a cursor --copy
npx skills add joetawil7/first-pass -a cursor --copy -g
```

把 -a cursor 换成自己的 agent。--copy 写真实文件而不是符号链接；Windows 会把符号链接变成纯文本。已经用了插件，就不要加 -a claude-code，否则每个 skill 会出现两次。预期：插件或 skills 装好；A 方式下 hooks 可用。

2. 在会话启动的那个文件夹里跑一次性 setup：

```text
/first-pass:setup-first-pass
```

Claude Code 之外是 /setup-first-pass。它会翻仓库，只问代码回答不了的问题（哪些仓库有 UI、谁依赖谁、跑哪些仓库 hooks），然后写入 AGENTS.md、CLAUDE.md、每个仓库的 INVARIANTS.md、.first-pass/workspace.json 等。预期：规则从第一条消息起就加载；setup 从不 commit 或 push；除 jev 外脚本不发网络请求、不读环境里的 key 或 token。

3. 动手前做 premortem 十问：跑两次会怎样；跑到一半停下会怎样；外部调用超时或失败会怎样；失败不是空会怎样；还有哪些代码用同一份数据；各种结尾（取消、删除、过期、重连、降级）怎么办；钱；恶意用户；文案；规模与时间。每个答案必须是 file:line、一个测试，或者一句 Not handled, because ___ 交给你决定是否接受。提问方式：

```text
Run the pre-mortem, show me the tests that fail without the change, and list what you didn't verify.
```

预期：答不出来不许动手。

4. 建造期间：任务没要求的东西（helper、上限、重试、选项）必须先证明自己该存在；没有东西要求它就省掉，并列在 Not built 下让你事后要。工作中只有造成真实伤害或阻碍这次改动完成的问题才当场修：钱、数据、重复执行或发错、安全、法律、崩溃、卡住的任务、改动没起作用。小问题在结束时作为一张清单交给你挑。

5. 完成的定义三条同时成立才算 done：一个在改动前会失败的测试；breaker（全新上下文、不是写这段代码的那个 agent）的评审；CI 自己的检查在干净 checkout 里通过。达不到就报告为 built，不是 done。ship-check 结束时报告：

```text
Verified: <what was run> → <result>
```

以及没被验证的部分。一段提示里有多个条目时，先全建好再统一评审，CI 一次干净 checkout 跑完。

6. 修 bug 用 fix-the-class：复现 bug → 找出同一模式在别处的位置 → 加一个能防止它复发的 helper、约束或检查。作者强调只有这类改动才持久，规则本身会淡去。

7. 评审用 /first-pass:review。自己分支上不带后缀输入；评审队友的 PR 时附上链接和上线状态，例如：

```text
/first-pass:review backend#147 web#151, live today: no agency workspaces
```

每条发现都带证据或被标为 unproven，并说明用户今天能不能撞到。它读 GitHub 但从不发帖，只有你挑了某个修复并说 yes 才推。

8. habit-words：读你最近 20 个 Claude Code 会话里你自己打的字，统计 be 100% sure、don't assume、full review、all fine, right? 这类短语出现的频率、说完之后出了什么问题，然后写一小段把它们映射到本该触发的检查。边界：只读 ~/.claude/projects 里你自己的 transcript、只读你打的字和每条反驳前的回复结尾；工具输出、粘贴文本、通知、脚本启动的运行都排除；像 key、token、密码、邮箱、电话的内容在进临时文件前会被替换（尽力而为），用完删除文件。这段块只含你的短语和检查，绝不写进团队共享的文件。

9. 写提示词前先 sharpen：在提示词前面加上 /first-pass:sharpen（Cursor 里是 /sharpen）。它把混了三个请求的消息拆成编号列表，把习惯词变成它们代表的检查，把改写给你看，然后按改写工作；只有需要猜的时候才停下来问。在 Claude Code 里，hook 会扣住编辑、shell 命令、子 agent、MCP 工具、发布、调度和其他 skill，直到改写出现在屏幕上（读文件从不被扣住）。

10. 多仓库场景：根上一套规则写在 AGENTS.md（由 CLAUDE.md import），从第一条消息起就加载；每个仓库一段写清 CI 的确切命令、怎么跑单个测试、真实测试需要什么在跑、测试限制、面向用户的文案在哪、同一件事在两处做。每个仓库自己的 hooks 仍然运行：setup 列出它们、你逐个批准；批准会钉住 hook 和它脚本文件夹里的每个文件，某个 pull 改了其中之一，hook 就暂停等你重新批准。会话开始时报告漂移：某个仓库的 CI 变了、出现了新仓库、某个 hook 被暂停、Cursor 规则的副本落后了、规则比插件旧。

11. 可选 jev：如果你有 TypeSafe API key，/first-pass:jev 会为 ship-check 打开第二意见，判断每条评审发现是否真实伤害、哪些小问题值得现在修、小修复需要什么证据。规则：它可以让一条发现变严重，永远不能清除评审者认为严重的发现；它不确定或失败时，规则按它不存在来处理。它需要你指定一个 TypeSafe key 的变量名；~/.claude/first-pass/jev.json 只记哪个变量放 key、对哪些仓库，从不存 key 本身。

12. 给 agent 一双眼睛：装浏览器 skill。个人用走 A；单项目随项目提交给团队走 B。目录名必须叫 playwright-browser，否则不会被识别。

```bash
# A（个人用）
git clone https://github.com/AndyShiu/claude-skill-playwright-browser.git ~/.claude/skills/playwright-browser

# B（单个项目）
git clone https://github.com/AndyShiu/claude-skill-playwright-browser.git <project>/.claude/skills/playwright-browser
```

Windows 个人目录为 %USERPROFILE%/.claude/skills/playwright-browser。预期：skill 目录克隆完成。

13. 装运行时（Chromium，约 150 MB）。第一次使用时 Claude 会自己发现运行时没装、告知你并执行一次性 setup；想提前装：

```bash
node ~/.claude/skills/playwright-browser/scripts/setup.mjs
node ~/.claude/skills/playwright-browser/scripts/setup.mjs firefox webkit
```

npm 包进 skill 目录内的 node_modules/，浏览器进 Playwright 共享缓存。只做日常多尺寸截图和健康检查，装 Chromium 就够；需要验证 Safari 兼容再加 webkit。预期：运行时可用；README 称你的项目目录永不被碰。

14. 用自然语言下任务，不用提 Playwright。可以原样照说：

```text
Take mobile and desktop screenshots of the homepage at localhost:5173
A customer says our site scrolls sideways on iPhone — find the element that's too wide
Health-check the new checkout page before we ship it
I changed the header CSS — compare before and after
On the admin Orders page, does going to page 2 actually load different data?
This issue says Submit does nothing — reproduce it on dev and capture screenshots
Screenshot every page in the admin menu and save them to my Desktop
```

行为约定：只做你要的事；只有你明确要 review / health check 时才输出完整检查加建议清单。要用你当前开着的标签页、用你已登录的浏览器、想看着它干活、一次性随便看看，用 Claude in Chrome；要后台运行不碰你的浏览器、要结果可重复、要一次批量多尺寸多页面、要健康检查/报告/前后比对/测试，用本 skill。

15. 需要登录的站点：告诉 Claude 你要操作需要登录的站点，它打开一个浏览器窗口；你自己在该窗口登录（只有你输入凭据，凭据不被存储）；用完关掉窗口，或让 Claude 在到达指定页面后自动保存并关闭。会话在 ~/.claude/playwright/sessions/<project>/，含 cookies/tokens，仅你可读，绝不提交或分享。若闲置超过站点登录有效期，Claude 会检测到跳转登录页并请你重新登录。

16. 想自己跑 CLI（日常不需要，Claude 会代劳）：

```bash
PW=$HOME/.claude/skills/playwright-browser/scripts/pw.mjs
node $PW inspect --url https://example.com --click Pricing
node $PW shot --url https://example.com --viewport desktop,mobile --full
node $PW audit --url https://example.com
node $PW run --script flow.mjs --url https://example.com
node $PW login --session admin --url https://example.com/login --until-url dashboard
node $PW sessions
node $PW clean --days 0
```

每条命令输出一行 JSON；全部选项见仓库 SKILL.md。截图与报告在系统临时目录的 claude-playwright/，7 天后删除；baseline 在 ~/.claude/playwright/baselines/<project>/。

17. Windows / Git Bash 路径改写坑：Claude Code on Windows 默认用 Git Bash，会把以 / 开头的参数改写成 Windows 路径（--until-url /dashboard 变成 C:/Program Files/Git/dashboard）。本 skill 对自己的选项会自动还原；你手动跑别的命令遇到同样问题时：去掉前导 /（写成 --until-url dashboard）、命令前加 MSYS_NO_PATHCONV=1，或改用 PowerShell / cmd。排错：截图显示登录页→会话过期，让 Claude 重新登录；显示 loading spinner→让 Claude 等到特定内容再截；内网站点证书错误→确认主机可信后加 --insecure；localhost 不通→先起 dev server；按钮没反应其实是弹了确认框→浏览器对话框默认被关闭，Claude 知道何时该接受。维护：在 skill 目录 git pull；package.json 变了再跑一次 node scripts/setup.mjs。卸载：删 skill 目录和 ~/.claude/playwright/；浏览器缓存在删目录前先跑 npx playwright uninstall --all，或手动删 ~/Library/Caches/ms-playwright（macOS）、~/.cache/ms-playwright（Linux）、%LOCALAPPDATA%/ms-playwright（Windows）。

### 做法 2：dotpals：核对“测试通过”是不是真的

前提：Node.js 20 或更新；项目里有测试套件才会被拦；Claude Code 上有完整回推，其他 agent 只读。

1. 安装：

```bash
npx dotpals@latest setup
npx --allow-git=all github:rikinshah787/dotpals setup
```

这一步会把桌面 pal 装到 ~/.dotpals 并下载 runtime（Electron，约 100 MB，一次）；若装了 Claude Code 就加插件；若装了 Codex 自动接管；启动 pal、开启登录时打开、打开 dashboard。可选参数：--no-claude、--no-login、--no-start。预期：dashboard 打开，dotpals status 能看到什么在跑、连了哪些 agent。

2. 只装 Claude Code 插件：

```text
/plugin marketplace add rikinshah787/dotpals
/plugin install dotpals@dotpals
```

重启 Claude Code，然后运行 /dotpals:pals。Codex 无需安装：dotpals 跟随 Codex 的会话日志 ~/.codex/sessions；用 DOTPALS_CODEX=0 可关掉。

3. 接入其他 agent：打开 dashboard 的 Agents 页，对要用的 agent 按 Connect。Connect 会先备份原文件、合并而非覆盖、读不了的文件不动；Disconnect 只移除 dotpals 加的内容；Send a test event 会跑真实命令。Connect 会改动这些文件：Cursor 改 ~/.cursor/hooks.json；Gemini CLI 改 ~/.gemini/settings.json（需 Gemini CLI 0.26+，且在你信任的目录里）；OpenCode 新增 ~/.config/opencode/plugins/dotpals.js；GitHub Copilot CLI 新增 ~/.copilot/hooks/dotpals.json。每个集成也可以在 ~/.dotpals/config.json 里用 agents.cursor=false 这类配置关掉。只有 Claude Code 有 hook + transcript 的完整观测和强制回推修复；其他只挂只读 hook，只能事后观察和提醒。

4. 让任意助手通过 MCP 问 dotpals。Claude Code：

```bash
claude mcp add dotpals -- npx dotpals mcp
```

Codex 写进 ~/.codex/config.toml：

```toml
[mcp_servers.dotpals]
command = npx
args = [dotpals, mcp]
```

Cursor 等：命令 npx，参数 dotpals mcp。前提是 dotpals 在跑。可用工具：agents_now、test_status、ready_to_merge、recap、today、risky_steps、handoff_note、check_my_work。

5. 打开“让 agent 修失败测试”：Claude Code 上默认开启，可在 Settings 或 notch 里的齿轮关掉。行为：测试失败即刻告知 Claude 并说明原因；当它测试失败或最后一次改动后没跑测试却想结束/commit/push 时，回推去修，每个请求最多两次，之后可以停下并由 pal 告诉你。没改代码的请求只报告失败；Claude 动手前就已失败的测试只报告、不强制它修；输出被 | tail 之类切断而无法判读时让它重跑，仍读不出就请你人工看。

6. 判读不清时二次复核：Settings → Set up Laya 或 dotpals laya（需 Python 3.10+）在本地复核；或 Settings → Double-check unclear test results 选云端 TypeSafe Jev（默认关，需要你的 key，会发送去除密码/密钥/邮箱/IP 后的测试输出尾部）。

7. 常用命令与快捷键：

```bash
dotpals start
dotpals dashboard
dotpals status
dotpals doctor
dotpals bridge
dotpals mcp
dotpals statusline
dotpals notch --auto | --off
```

快捷键：Ctrl+Alt+P（macOS ⌘⌥P）显示/隐藏 pal；批准卡显示时 Ctrl+Alt+N / Ctrl+Alt+Y（macOS ⌘⌥N / ⌘⌥Y）拒绝/允许。

### 做法 3：done-is-a-claim：用回执、模板和新鲜度复核补无 hook 场景

前提：本机有 Git；跑演示和 tools/ 下的工具需要 Python 3.10+；宿主是 Claude Code、Codex，或任意读 AGENTS.md 的 agent。

1. 安装四法选一。做法 A，让 agent 自己装，把下面这段原样发给 coding agent：

```text
Install https://github.com/Grit-77/done-is-a-claim. Then explain simply what changed, what it helps with, and how I start using it.
```

做法 B，手动装成原生插件。Claude Code：

```bash
claude plugin marketplace add Grit-77/done-is-a-claim --scope local
claude plugin install done-is-a-claim@done-is-a-claim-marketplace --scope local
```

Codex：

```bash
codex plugin marketplace add Grit-77/done-is-a-claim
codex plugin add done-is-a-claim@done-is-a-claim-marketplace
```

装完开一个新 session：Claude Code 里调用 /done-is-a-claim:using-done-is-a-claim；Codex 里通过 /skills 或 $ 技能选择器选 using-done-is-a-claim。做法 C，只想要规则文件不要插件：先 clone，再把 AGENTS.md 复制到项目根目录；Claude Code 再复制 CLAUDE.md（用 @AGENTS.md 导入它）；已有指令文件就把相关规则合并进去。做法 D，不覆盖已有文件地装技能：

```bash
python tools/install_skills.py --project ../my-project --agent codex --profile workflow --dry-run
```

预览没问题后去掉 --dry-run 正式安装；Claude Code 用 --agent claude-code。已存在的技能目标会被拒绝安装，项目指令文件不动。怎么选：想一次拿到全流程和工具就走 A 或 B；只想拿走规则走 C；项目已有自己的技能和指令、怕被覆盖走 D。预期：技能装好、规则文件就位；原生插件安装不会把这些规则加进被采用项目的指令里。

2. 先看两个演示，理解要防什么。前提：Python 3.10+，在第 1 步 clone 出来的目录里。

```bash
python examples/false_green.py
python examples/wrong_delivery.py
```

预期现象：false_green.py 里 verifier 以退出码 1 失败，summarizer 打印它的输出后却以 0 退出；receipt 跟随 verifier，标注 FAIL。demo 自身退出 0，是因为它把这个不一致演示出来了，不代表 verifier 通过。wrong_delivery.py 对比三种情况：过期的副本、正确的副本、字节相同但无法解析的内容；退出 0 表示陷阱被演示出来，不代表真实交付成功。

3. 用第一句请求试一次（在你自己的项目里）：

```text
Use using-done-is-a-claim for this task. Identify observable acceptance, take a proportionate path through implementation and review, and report the actual result, tested inputs and remaining gaps. Continue within my existing authorization.
```

这一步是在检查 agent 有没有理解请求，并不强制它遵守——它没有 hooks。预期：agent 的报告里出现可观察的验收标准和没验证的部分，而不是一句都做完了。

4. 在真实工作上冒烟测试安装：

```bash
python tools/native_smoke.py create --project ../claim-smoke
python tools/native_smoke.py verify --project ../claim-smoke --json
```

预期：初始的独立检查是故意失败的，尽管 starter 的窄测试能过——这正是用来练窄测试通过不等于独立验收通过。

5. 给一条命令采集回执：

```bash
python tools/receipt.py -- python tools/run_tests.py
```

它会在 .local/receipts/ 下写出新的 receipt.json 和 command.log，记录这条命令自己的退出码、完整输出和 Git 状态。用 --input 可以在运行前后对选定文件做指纹。语义要记牢：退出码为 0 只记录这条命令成功了，不等于用户的任务完成；没有用 --input 选定输入的回执，对新鲜度复查来说是不完整的。

6. 编辑或交接后复核回执：

```bash
tools/check_receipt.py path/to/receipt.json --project .
```

什么时候用：你改完东西之后、或者把活交接给另一个 agent 之前——确认这份回执仍然描述你即将据以行动的那些输入。

7. 用模板固化报告格式：templates/completion-receipt.md、templates/acceptance-brief.md、templates/handoff.md。原则：缺了哪项检查，就要写进报告里。主张和证据的对照关系可以直接抄进你的报告规范：测试通过了，要给命令、收集到的用例、实际结果、它自己的退出状态、被测的代码树；那个失败在 main 上本来就有，要给可比的 branch 运行与干净基线运行，且失败签名匹配；worker 干完了，要给 worker 实际的 diff、被检查的输入、验收结果，交付要单独记录；截图保存了，要给一张能解码、且被肉眼检查过的图片；可以发布了，要被评审的产物与即将发布的产物仍然一致。

8. 把 18 条规则贴到手边。完整措辞在 AGENTS.md，每条规则背后的失败故事在 INCIDENTS.md。按出现的时刻分组记：开工前：01 干活前先定义验收；02 检查路径。说完成之前：03 在当前工作状态上重跑；04 检查更宽的测试套件；05 抓取命令自己的退出码；06 没测试就是没通过；07 未知不等于通过；08 每项必需检查都要读。汇报时：09 读产物；10 打开写出来的东西；11 自己亲眼看；12 核对引用；13 声明基线并在发布前复核它。测试与修复时：14 测行为，别测是否等于某个常量；15 修一整类缺陷；16 在已知正确的用例上测试检测器；17 干活前先登记清理。永远保住已有工作：18 永远不要用破坏性命令来回答一个问题。按场景挑 skill 时，可以用 using-done-is-a-claim 做任务入口、planning-changes 做计划、executing-plans 推进、debugging-with-evidence 区分原因、reviewing-changes 送审、acceptance-design 设计通过条件、reading-measurements 读数字、whose-red 分辨回归、collecting-worker-results 收子代理结果、evidence-freshness 查回执新鲜度、public-claims 查公开主张、resuming-work 接手未完成工作、checking-delivery 查实际目的地。

9. 仓库自检与压力测试（可选）：

```bash
python tools/run_tests.py
python tools/check_repository.py
python tools/check_package.py
```

测试 runner 会拒绝空的或全被跳过的测试套件；后两个检查验证工具、本地文档链接目标、技能元数据和 import。CI 在 Windows 和 Linux 上跑。evals/ 场景包是人工行为评测，不是公布的成功率。

### 做法 4：Shrike：让 agent 看见一次点击实际走了哪条路径

前提：macOS Apple Silicon；语音需要 macOS 15+；应用能在 Node 22.18 及以上运行；从源码跑需要 Node 24 + pnpm 10；语音还要 Xcode；Claude Code 可选。

1. 安装选 A 或 B。A 二进制：从 Releases 下载 Shrike-<version>-arm64.dmg，拖进 Applications，打开后点 Open the sample project → Run → 加一个 todo，看它如何崩。B 源码：

```sh
git clone https://github.com/SumantxD/shrike.git
cd shrike
pnpm i
pnpm dev
```

Linux 暂无发布版，用 scripts/release/build-linux.sh 构建 AppImage 或 .deb，或取 CI 的 shrike-linux-x64 artifact；NixOS 上用 appimage-run。Windows 能用同一份配置构建，但从未在 Windows 机器上跑过。预期：Shrike 打开，sample project 能跑起来，应用被它接管（它会把应用的 OpenTelemetry SDK 指向自己）。

2. 先在 sample project 上走通一次完整闭环：点击出问题的按钮，Thread 视图画出 trip，坏掉的那步变红并内联显示真实值；按 E 打开 Files 视图，打开实际执行到的行、带当时经过的值，旁边是这次点击碰过的所有文件，底部是可拖动的调用路径；用大白话提问，例如：

```text
when I click Add Todo nothing shows up
```

看它给出的 diff → 点 Apply 批准 → 看 Shrike 重放同一次点击证明通过。预期：一次点击 → 一条记录 → 原因被钉到某一行并一句话说明；agent 还会告诉你它用了哪个 playbook。

3. 接进终端里的 Claude Code：

```text
/plugin marketplace add SumantxD/shrike
/plugin install shrike@shrike
```

装好后，终端里的 Claude Code 能读 Shrike 的同一份记录（Shrike 需保持打开），会在提示词上方带出最新 trip，并可用 /shrike。用 Cursor 或其他 MCP 客户端时，从 Shrike 的 Tools 面板复制一行式 setup；原文没有给出具体命令，无法照抄。预期：你在终端里问同一个 bug，agent 走的是那一条已记录的 trip；改码仍然只在 Shrike 里点 Apply 才生效。

4. 在你自己的项目上走一遍：让 Shrike 运行你的应用；点一次会出问题的那颗按钮，先复现；用大白话描述症状；看 agent 把原因钉在哪一行、一句话说明是什么，以及它用了哪个 playbook；看 diff → 点 Apply 批准 → 观察同一次点击的 replay 是否通过 → 再提交、开 PR；修复进 PR 后，CI 检查失败与 review 评论可在同一窗口读，并可把失败转成 lessons；想并行比方案，用 git worktree 副本同时跑两份修复，留下通过的那份。只有后端是 Node（Express、Next.js、NestJS、Hono、Remix）或 Python 3.12+（FastAPI、Flask、Django）时，才能拿到进你自己代码的每次调用及其参数、返回值、文件与行号；其他会说 OpenTelemetry 的后端只有请求、查询和外部调用级。验收信号是同一次点击重放通过，不是模型自评。

5. 不用配置就已经生效的隐私与审批行为：无账号、无遥测，代码、记录和密钥留在本机；密钥在存储、展示、发给 agent、导出之前一律剥离；agent 不能直接改文件，每个改动都是你批准的 diff；只有你主动要求时才外连：agent 自己的 API、从 Hugging Face 下载语音模型、通过你的 gh 登录访问 GitHub。不要为了省事把 Apply 这一步自动化掉——那正是这条做法存在的理由。

### 做法 5：Vantage：按证据观察工作项有没有从 Asked 走到 Proven

前提：Node.js 22.5 或更新版本、git、Claude Code；从 checkout 构建还需要 pnpm；当前没有 published release，只能走 checkout；需要本地 daemon、仓库注册、对 Claude Code settings.json 的写入权限和 hooks；数据默认本地存放在 ~/.vantage。

1. 让 Claude Code 按安装指南安装，先 dry-run 再等你确认。在要跟踪的仓库中打开 Claude Code，粘贴：

```text
Install Vantage for this repo. Follow https://github.com/ymatrix1/vantage/blob/main/docs/install-for-agents.md exactly: check the prerequisites, get Vantage if it is not already on this machine (from a release, or a checkout build), show me the dry run first and wait for my OK, then install, start it, verify with vantage doctor, and tell me what changed and how to undo it.
```

预期：安装完成后 vantage doctor 能给出 PASS/WARN/FAIL 和修复提示；安装方告诉你改了什么、怎么撤销。

2. 手工从 checkout 构建并启动：

```bash
git clone https://github.com/ymatrix1/vantage.git
cd vantage
pnpm install
pnpm build
```

在 npm 包发布前，用 node 运行 CLI，并设置一个短别名：

```bash
alias vantage='node /path/to/vantage/packages/cli/dist/src/main.js'
```

在要跟踪的仓库里按顺序执行：

```bash
vantage add --dry-run
vantage add --yes
vantage start
vantage doctor
vantage open
```

--dry-run 只打印会改动的文件，不写入；--yes 备份 settings.json、添加 hooks、注册仓库；start 运行 daemon；doctor 输出 PASS/WARN/FAIL 和修复提示；open 打开本地 Track 页面。条目大约在 daemon 下一轮扫描后出现，README 说约 30 秒。预期：Track 页面能看到当前仓库的工作项。

3. 可选安装 Claude Code 插件：

```text
claude plugin install vantage@vantage
```

然后在新会话中使用 /vantage:open、/vantage:start、/vantage:doctor、/vantage:status、/vantage:add。预期：不用离开 Claude Code 就能打开、启动、检查 Vantage；但状态推进仍按证据，不按对话里的自称。

4. 理解 Stop gate 和 proof 的边界。默认是 warn 模式，只在智能体编辑代码后停止且没有新的测试或数据检查时提示，不阻塞。可用环境变量或配置调整：

```bash
VANTAGE_GATE_MODE=off
```

或在 ~/.vantage/config.toml 中设置：

```toml
proof_gate = 'off'
```

README 也列出可选值 off|warn。不要把它写成强制闸门；它当前不会阻断 agent。预期：编辑后没有新测试时你能收到提示；误报多时先关掉并记录误报场景。

5. 用 stats 看可量化状态：

```bash
vantage stats
vantage stats --days 7
vantage stats --since 7d
vantage stats --repo myrepo
vantage stats --json
```

输出包括工作项总数和活跃数、可读标题与 fallback 行、anchor 类型、session lineage、Needs you 数量及按 flag 分类、阶段分布、有多少编辑过的条目达到 Proven、有多少 Built 条目失去 proof、运行了哪些检查、事件来源和每日事件、数据库大小、最后一次阶段扫描时间。输出只含数字和固定标签，不含标题、命令、路径或仓库名。预期：你能每周对照编辑过的条目中达到 Proven 的比例、Built 条目失去 proof 的数量、Needs you 总数和最近 48 小时数量、Stop gate 误报数量。

6. 可选启用 Haiku 分类（只改善标题，不决定状态）。先 dry-run，再后台运行，再预览确认：

```bash
vantage classify --dry-run
vantage classify
vantage classify accept
vantage classify accept --all
vantage classify undo
```

启用前在 ~/.vantage/config.toml 中设置：

```toml
[engines.classify]
enabled = true
[data_policy]
outside_calls = true
[data_policy.allow]
transcripts = true
```

README 说明每项只发送仓库名、分支、第一条请求的第一句（最多 300 字符，移除 URL 和疑似秘密文本）、最多 10 个文件名（不含路径）、计数和当前标题；不发送命令、transcript 或路径。默认关闭。它只改善标题、主题和分组，不决定状态、阶段或 proof。

7. 撤销与清理：

```bash
vantage remove
vantage uninstall
```

remove 停止跟踪当前仓库，uninstall 移除 Vantage 写入 settings.json 的 hooks 和状态行；两者都不删除 ~/.vantage，需要手动删除该目录才会清除数据。

### 做法 6：Agent-Cockpit：把研究 claim 锁在运行记录和代码哈希上

前提：Node.js ≥ 22.13、git、python3（仅 demo 项目需要）；目标目录必须是 git 仓库；支持 MCP 的 agent；三条纪律：实验必须经 cockpit run 执行、变更必须 cockpit_report 上报、claim 证据必须是记录 run 写出的文件字段。

1. 先跑 demo，确认失效检测真的成立：

```bash
git clone https://github.com/chutingyean/Agent-Cockpit.git
cd Agent-Cockpit
npm install
npm run demo
node bin/cockpit.mjs serve --repo demo/research
```

预期：demo 有 6 次真实运行、6 条 claim；白板在 http://127.0.0.1:4180 打开。若没有这些，后面的试用不必做。

2. 制造一次未上报改动，看 claim 怎么变红、怎么恢复：

```bash
node bin/cockpit.mjs demo --break
node bin/cockpit.mjs demo --restore
```

预期：--break 悄悄放宽 grader 的答案匹配且不上报，依赖该 grader 的 claim 在白板上变红，系统自己抛出一个待人类决策项并生成一页证据简报；--restore 后哈希重新一致，claim 恢复。若你看到的现象不是这样，不要接入自己的仓库。

3. 接入自己的研究仓库：

```bash
cd /path/to/your-research
node /path/to/Agent-Cockpit/bin/cockpit.mjs init
node /path/to/Agent-Cockpit/bin/cockpit.mjs serve
```

预期：init 写入 MCP 配置、AGENTS.md、Stop hook、pre-commit；为 Claude Code、Cursor、VS Code、Gemini CLI 写好配置，并为 Codex 打印命令；serve 打开白板。可选执行 npm link 获得全局 cockpit 命令。

4. 所有实验都用 cockpit run 执行：

```bash
node /path/to/Agent-Cockpit/bin/cockpit.mjs run -- python3 train.py --lr 1e-3
```

预期：这次运行被记录，包括脚本哈希、脚本依赖的每个文件哈希、触达的每个函数哈希；只有被记录下来的 run 才能作为 claim 的证据来源。直接 python xxx.py 不记录，整套证据链会空转。

5. 用 cockpit_claim 登记结论，证据必须落到文件字段。每跑完一次实验，让 agent 通过 MCP 的 cockpit_claim 登记结论。硬约束：证据必须是某次被记录 run 实际写出的文件 + 字段（例如 metrics.json 里的某个 key），不能是“我觉得”“日志看起来”。具体调用参数原文未列出，以仓库 docs/tutorial.md 为准。预期：claim 与 run 绑定；代码或依赖一变，claim 能被判 stale。

6. 按 MCP 工具表给 agent 立规矩：cockpit_overview 开场先调用，看代决策、需要复核的 claim 及原因、未上报变更；cockpit_plan / cockpit_stage 做研究路径，stage 在必需工具被调用前不能关闭；cockpit_task 是 agent 自己的任务卡，每轮更新；cockpit_run 跑实验并记录；cockpit_claim 登记 claim；cockpit_hypothesis / cockpit_premise 记假设与尚未验证的前提；cockpit_decide / cockpit_decisions 向人提问并等回答；cockpit_report 上报改了哪些文件；cockpit_review 做代码审查，装了 ocr 用 ocr，否则内置规则。预期：计划、执行、结论、假设、人工裁决、变更上报、复核都有固定入口。

7. 提交前自查，并把事件日志纳入版本管理：

```bash
cockpit status
cockpit check
```

预期：status 打印 cockpit 摘要；check 列出未上报变更。把 .cockpit/events.jsonl 提交进仓库——原文说它是单一事实来源，同时兼作 agent 的工作日志。可选增强：装 graphify 或 open-code-review 后 cockpit 会自动改用它们；不装就用内置的 graphify 兼容代码图与规则式 review。手动重建与审查：

```bash
cockpit graph
cockpit review [--all]
```

cockpit_review 检测到 ocr 时优先用 ocr，否则内置规则；默认只看变更行，--all 看全部。

8. 关键裁决让它阻塞等待，不要自己猜。用 cockpit_decide 向人提问并等回答，用 cockpit_decisions 读回答案。当改动破坏 claim 时，cockpit 自己发起一个决策项并写一页证据简报，人只需选“恢复 / 接受”，再由 agent 执行。预期：agent 不在关键裁决上自说自话；问题修好后 brief 仍然保留，便于复盘。

9. 回放与边界：白板可拖到任意时刻重放；事件日志 .cockpit/events.jsonl 是唯一事实来源，白板只是 reduce → derive 的投影。所有写入（MCP、CLI、白板）过同一道 gate（src/gate.mjs），不合规写入被拒并给出可执行理由，拒绝也记日志。未上报的文件变更会被检出：阻断 git commit，且 Claude Code 在上报前无法结束回合。白板绑定 127.0.0.1，所有检查是普通规则，无 LLM 调用、零 token。别把它当定时调度或长期后台轮询——原文只给了事件/状态触发。

### 做法 7：deepseek-stack：用短循环和硬停止条件补便宜模型的四个缺口

前提：支持 SKILL.md 的编码 agent harness；机器上有可用的 npx；手动安装则要能把 skills/* 复制到所用 harness 的 skills 文件夹；用 Ship 组技能需要安装并登录 gh；ds-watch-pr 需要 python3；ds-jury、ds-best-of-n、ds-swarm 需要子代理或第二模型。

1. 先只装最小三件套，不要一上来装全包。先只装一个技能试：

```bash
npx skills add aicodeking/deepseek-stack --skill ds-verify-loop
```

确认可用后再装整包：

```bash
npx skills add aicodeking/deepseek-stack
npx skills add aicodeking/deepseek-stack -g
```

手动安装则把 skills/* 复制到 ~/.claude/skills/、~/.codex/skills/ 或所用 harness 的 skills 文件夹。不知道从哪开始时运行：

```text
/ds-help
```

预期：技能目录出现；先打开对应 SKILL.md 审阅，再用于真实任务。最小试用只装 ds-mode、ds-plan-loop、ds-verify-loop 三件套，遇到同一失败两次再加 ds-unstick；不要先上 ds-ship。

2. 按任务选技能。日常默认用 ds-mode（复述、先读、小步验证、有证据才说完成）加 ds-principles（21 条带触发条件的工程规则）。新任务用 ds-sharpen 复述并重写提示词，再用 ds-plan-loop 做“每步带检查”的计划、在新一轮里自我批评一次、然后一步一实现。实现阶段用 ds-verify-loop 反复“改—跑真实检查—读真实错误—修根因”，最多 5 轮。同一失败出现两次用 ds-unstick 命名共同假设、验证它、换路线。长任务用 ds-context-reset 维护 PROGRESS.md 并在新上下文继续，或用 ds-ledger 一行一个决策、每步前重读。评审用 ds-review-loop（作者加新上下文评审，最多 4 轮）或 ds-jury（两三个不同模型直到一致）。要质量时用 ds-best-of-n 或 ds-swarm。构建与交付：先 ds-blueprint 定类型、签名、模块布局再实现；需要测试驱动时用 ds-tdd；改完用 ds-blast-radius 找 diff 之外的破坏面并证明安全；前端用 ds-design / ds-design-audit；交付用 ds-pr 写以问题开头的短 PR，ds-watch-pr 盯 CI 和 review bot 并修真实问题，ds-ship 无人值守从变更走到合并，ds-ready 同样流程但停在合并前；接手别人的 PR 用 ds-adopt，旧 PR 用 ds-revive。预期：每个技能对应一个短循环和硬停止条件，不靠聊天里临时约定。

3. DeepSeek 配置建议原文：

```text
Use thinking mode at max effort for planning and review. It matters more than any skill.
Run big jobs at off-peak hours, when the API price is lower.
DeepSeek is cheap, so spend tokens on quality: ds-best-of-n, ds-review-loop and ds-jury cost little and catch a lot.
Pair a stronger planner with DeepSeek as the implementer if your harness supports separate plan and act models.
```

这几条是作者主张，不是实测结论。用法：规划和评审开最大 thinking；大批量任务错峰跑；把省下的钱花在 ds-best-of-n、ds-review-loop、ds-jury 上；harness 支持分离 plan/act 模型时，用更强规划模型配 DeepSeek 实现。

4. 用 10 个同类型小任务做 A/B 最小试用。选 10 个同类型的小任务（修小 bug 或加小功能），同一 harness、同一仓库快照、同一提示词模板，分两组：A 组便宜模型裸跑；B 组只安装 ds-mode、ds-plan-loop、ds-verify-loop，遇到重复失败再加 ds-unstick。先不要上 ds-ship 自动合并。记录：是否先给出计划、计划每一步是否带检查；是否实际执行验证命令；是否读取并引用真实错误；首次通过率、平均修复轮数、同一失败重复次数；人工干预次数和人工返工时间；token 消耗/费用和总耗时。预期：B 组验证命令执行率应接近 100%，重复失败次数和人工干预次数应下降，首次通过率或总耗时不差于 A 组；如果成本增加但返工明显减少，可继续加 ds-review-loop 或 ds-best-of-n 做第二轮对比。

5. 长任务和交付边界。长任务另测 ds-context-reset + ds-ledger，看跨上下文是否丢状态：PROGRESS.md 记进度，ledger 一行一个决策、每步前重读。Ship 类先在非关键仓库用 ds-ready（不自动合并）观察 CI 修复和评审处理质量；ds-watch-pr 需要 gh 登录和 python3；ds-ship 是无人值守从变更走到合并，风险最高，不要在关键仓库直接开。预期：长任务不在新上下文里丢状态；交付技能停在合并前时，你能看到 CI 修复和 review 处理质量，再决定是否放开。

6. 把失败变成下一次的规则，而不是重试。ds-verify-loop 最多 5 轮；同一失败出现两次就转 ds-unstick，不要继续原样重试。ds-review-loop 最多 4 轮；ds-jury 用两三个不同模型直到一致。每次失败后把可复用的检查写回技能或项目规则：例如把重复错误转成类型、lint、测试，或写进 ds-principles 的触发条件。预期：同一坏思路不会无限重试；失败留下可复用的检查，而不是只留下聊天记录。

### 做法 8：pstack：先复现、最小改动、贴修前修后证据

前提：已有 Claude Code / Cursor / Codex / OpenCode 之一；Codex、OpenCode 路线需要 Node.js 22.20+；能安装 plugin 或 skills；任务可执行验证（能跑命令、能读文件或存储、能对比输出）。材料是第三方教程站 nevertoday/xxd-pstack 的 README，32 stars，教程对象 pstack（通用镜像 backnotprop/pstack）；细节页和技能原文都在外链页面，不在本次材料里，命令和行为以官方仓库为准。

1. 安装 pstack：

```bash
# Claude Code：命令会带 pstack: 前缀，比如 /pstack:poteto-mode
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins

# Cursor
/add-plugin pstack

# Codex、OpenCode 等（Node.js 22.20+；加 -g 装到全局）
npx skills add backnotprop/pstack
```

预期：技能装好；Claude Code 里命令带 pstack: 前缀。

2. 初始化：装完后新开一个对话，不要沿用旧上下文。

```text
/setup-pstack
```

问到“要不要生成验证技能”时选要。README 只给了这一步的一句话说明；Claude Code 的会话模型与角色搭配指向外链“三套推荐配置”，原文未给出具体配置值，需另查。预期：初始化完成，验证技能可用。

3. 用一件真实但不大、可执行验证的事跑第一个任务。README 给的例句可以原样照说：

```text
/poteto-mode 收藏列表刷新后偶尔会重复。先复现，不要先改代码。
修好的标准：连点十次收藏，列表和 chrome.storage 里都只有一条。
把修之前和修之后 storage 里的实际内容给我看。
```

预期：先复现、不改代码；修好标准可判定；给出修前修后 storage 实际内容。把场景替换成你的，保留三个要件：先复现不要先改、可判定的完成标准、要看修前修后实际内容。

4. 按五要素写提示词：一句好提示词最多五样东西——目标、怎么算做完、想看什么证据、你已经知道的、不能碰的地方。最好别写的两样：具体怎么做，和你猜的原因。

5. 日常只记一个命令 /poteto-mode。它会从 23 套剧本里挑一套（修 bug、加功能、重构、查性能等），把步骤抄进待办清单，一步步调用其他技能；决定不做的步骤不会悄悄消失，会写明 skip: 理由。预期：不用自己记技能名；被跳过的步骤可见。

6. 按场景换提示词：修 bug → 先让问题再出现一次再动手；加功能 → 说清哪些旧行为一点都不能变；重构 → 先录下现在的输出，改完证明没变；性能 → 给测量值不要给感觉；接手陌生项目 → 先别改代码，只让它调查；提交前 → 让几个模型挑刺、只留能跑出失败的问题；写文档 → 先写 README；大迁移 → 完成条件要能判断过没过，不写做 4 小时。

7. 验收时索取证据：要求贴真实命令输出、存下来的值、修前修后对比；汇总看 /show-me-your-work。预期：回复里出现证据，而不是“应该没问题了”。

8. 跑一夜（时间触发 + 自验证）。前提：任务完成条件可机械判定，且在独立 worktree 里跑。睡前给它一份合同，五个要素：目标、能判断过或不过的完成条件、一个新的 worktree、决策日志、卡住时的逃生口。每一轮：检查完成条件 → 做最小改动 → 验证 → 提交或丢弃 → 记一行日志。早上先读 /show-me-your-work 回复里的“需要注意”部分，审决定，不重读整夜。预期：无人值守按合同循环；但这是 README 描述，材料没有日志或复现，先小范围试。

9. 纠偏与沉淀：跑偏时用一句话拉回；同一个错用 /correct 改仓库本身；不熟的代码先用 /how 读懂再动手。预期：纠正写回仓库，下一个 AI 不再犯同一个错。

10. 与已有做法的差异：pstack 偏剧本调度和提示词，给的是先复现、最小改动、贴证据、/correct 写回；done-is-a-claim 给回执、模板和新鲜度复核，但不是闸门；first-pass 有 hooks 能扣住编辑和打回没证据的 done，强制力更强。pstack 材料没有 hooks、拦截或效果数据；作者自承更慢更费 token，小改动不用。跑一夜与现有手册其他做法不同：其他做法没有定时或后台自主推进描述，不能把跑一夜当已成熟方案。

### 做法 9：两条最小规则：未运行检查披露 + E2E 验收证据

1. AGENTS.md 未运行检查规则。前提：代理会读取项目根目录的 AGENTS.md 或同类指令文件，且任务中存在可运行的检查。在 AGENTS.md 的检查或验证相关段落加入这一行，原样照抄：

```md
- Didn't run a check? Say so. An unrun check is not a pass.
```

在需要检查或验证的任务中，要求代理在最终答复里区分两种状态：实际运行了检查，或没有运行检查并明确说明。不要让它把“未运行”写成“已通过”。不要根据推文标题或开头补写 Every time I correct you, 之后的第二条规则；采集到的正文在这里被截断。最小试用：在一个会读取 AGENTS.md 的代理项目中加入上述一行，选一类容易“没跑检查就说完成”的任务，连续试用若干次，并在每次交付时记录代理是否明确说明检查状态。预期：代理在报告里开始出现“没有运行检查”或“未验证”的说明；未运行却被表述为“已通过”或“已完成”的次数应下降。它不会自动运行检查，也不会拦住任何动作。

2. E2E 验收规则。前提：任务有可运行的 E2E 测试或检查入口；agent 有权限执行；界面任务能截图或录屏；你愿意人工复核证据。任务开始前写清“验证通过”的判定标准：哪些检查必须成功、需要交哪些证据、哪些界面路径要覆盖。在交付要求里加入验收条款；下面这段是按原文整理的提示词条款，原文没有给可照抄的完整提示词，把它接到你项目现有的 E2E 命令和截图/录屏方式上再用：

```text
不要只声称“做完了”。交付时必须给出：
1) 本次新增或修改的 E2E 用例；
2) 该用例的运行命令与通过输出，或项目现有的通过流程/日志；
3) 界面任务提供关键路径截图或录屏；
4) 你实际运行过的检查清单，以及没有运行/没有验证的部分。
检查失败就继续修复并重跑，直到通过；如果无法通过，明确说明卡在哪里。
```

人工复核证据：是否对应本次变更、是否包含新增 E2E case、是否真实通过；未通过就退回，让 agent 继续修复并重跑检查。给自检循环加停止条件：原文只说“自检到通过”，没有提最大轮次或超时；实际试用时必须自己加最大轮次或超时，避免无限循环——这一条是合并时补的控制，不是原文。小范围试用：选 1–2 个已有 E2E 测试的编码任务，任务开始前写清通过标准；交付时强制要求新增 E2E case 通过证据及截图/录屏；与“只让 agent 口头声称完成”的基线对比。预期：交付里出现新增 E2E 用例、通过输出或日志、界面截图/录屏、实际运行过的检查清单和未验证部分；检查失败时 agent 继续修复并重跑，而不是只写“已完成”。注意：它不拦截工具调用、不阻断合并，也不自己保证 E2E 检查可靠。

## 怎么判断变好了

| 做法 | 可观察指标 | 最小试用 | 试多久 |
|---|---|---|---|
| first-pass | done 不再由 agent 自己宣布：改动前会失败的测试 + 非作者评审（breaker）+ 干净 checkout 的 CI 通过，三者缺一就只报 built；ship-check 输出里有 Verified: <what was run> → <result> 和未验证部分；每条评审发现带证据或被标 unproven；同类 bug 的复发被落地的共享 helper/数据库约束/CI 检查挡住；会话开始时被点出的漂移 | 在一个仓库上小范围试装，第一个改动完整走一遍 premortem → 修改（只当场修真实伤害）→ breaker 评审 → ship-check | 作者建议跑几周再判断是否铺开；成本预期：小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元，作者自己说每次改动更慢更贵、收益尚未测量 |
| 浏览器 skill | 移动端横向溢出的报告能指到具体是哪个元素；健康检查给出 console 错误、4xx/5xx、坏图、坏链、axe 无障碍问题、LCP/CLS；改 CSS 前后拿到红色高亮的 diff 图；UI 流程每步有截图，失败自动截图；CLI 每条命令输出一行 JSON | 先在一个前端项目里只做多尺寸截图 + 移动端溢出定位这一件事，把结果和手动 F12 的结论对照 | 原文只给了各跑一次的对比数据，没有多轮、没有跨项目验证；自己记录 2–3 次真实任务里它报的问题是否成立、漏报了什么 |
| dotpals | 每个测试结果被归为 ✅ ran successfully / ❌ failed / ❔ unclear / ⚪ not run；伪造通过能被点出来；测试通过后又改文件显示成 Changed 2 files after the tests passed: not tested since；Claude Code 在测试失败或最后改动后没跑测试却想结束/commit/push 时被回推去修，同一请求最多两次；today/recap/handoff_note/risky_steps 可用 | 在一个有测试套件的小项目上按 README 一条命令装起来；先让 agent 报一次测试通过，再用 test_status / MCP 核对它说得和实际是否一致；有条件加一次改测试让它变绿的对照 | 报告没有给出试用时长；项目 31 stars、v0.10，先记录 2–3 次真实任务里它拦下的失败是否成立、误报和漏报各几次 |
| done-is-a-claim | 回执里有命令、实际输出、命令自己的退出码、Git 状态；receipt.json 和 command.log 落在 .local/receipts/ 下；check_receipt.py 能判定回执是否还描述当前输入；报告里出现主张与证据的对照；subagent 汇报成功时带着实际 diff、被检查的输入和验收结果 | 在一个小项目上装一次，用 receipt.py 给一条命令采一份回执、跑一次 check_receipt.py，再用第一句请求让 agent 交一次报告 | 报告没有给出试用时长，只说先在一个小项目上试跑一轮；记录 2–3 次真实任务里回执记录的事实和实际是否一致、它漏掉了什么 |
| Shrike | 从点击到定位到具体代码行的往返次数；agent 第一次给出的修复是否需要推倒重来；replay 同一次点击是否通过；需要人工粘贴日志、翻找文件的次数是否下降 | 在一台 macOS Apple Silicon 上装二进制版，先用自带 sample project 走通完整闭环，再换成自己一个真实项目挑一个真实的点按钮没反应或报错的 bug 复现一遍；然后装上 Claude Code 插件，用终端里的 agent 定位同一个 bug 对照 | 报告没有给出试用时长，也没有准确率、耗时或成功率数字；先用一两个真实 bug 做前后对照，记录定位到行要几个来回、replay 是否通过、还需要人工粘几次日志 |
| Vantage | vantage stats --days 7 / --since 7d / --json 里，编辑过的条目中达到 Proven 的比例是否上升；Built 条目失去 proof 的数量是否下降；Needs you 总数和最近 48 小时数量是否可接受；Stop gate 提示中有多少是误报；人工抽查 10 条 Track 记录，对照 git diff、测试日志和 PR，确认阶段推进确实有证据 | 选一个真实小仓库、一个开发者，先跑 vantage add --dry-run 检查会改哪些文件，再安装并运行 1 到 2 周；只启用默认功能，先不要开 classify；明确记录安装前的基线工作方式 | 调研建议先跑 1 到 2 周；README 自称 Phase 1、尚未按日使用满一周，且没有独立基准；若 Stop gate 误报过多，先用 VANTAGE_GATE_MODE=off 关闭并记录误报场景 |
| Agent-Cockpit | demo 的 --break 之后，依赖 grader 的 claim 在白板上变红，并生成待人类决策项与一页证据简报；--restore 之后哈希重新一致，claim 恢复；改动 run 未触达的函数不会使 run 失效，改动可达函数、import 或模块级代码一定失效；cockpit check 能列出未上报变更；pre-commit 能阻断提交；.cockpit/events.jsonl 能回放到任意时刻；brief 在问题修好后仍然保留 | 先按 demo 步骤跑，确认你看到 claim 变红和恢复；再在一个已有 git 的小型计算型研究仓库上 cockpit init、用 cockpit run 记录实验、用 cockpit_claim 登记结论，并做一次“改未触达函数”与“改可达函数/import”的对照 | 报告没有给出试用时长；项目仅 36 stars、只有 README 与自述一次会话录像，先记录误报和流程摩擦再决定是否扩大 |
| deepseek-stack | B 组是否先给出计划，计划每一步是否带检查；是否实际执行验证命令；是否读取并引用真实错误；首次通过率、平均修复轮数、同一失败重复次数是否下降；人工干预次数和人工返工时间是否下降；token 消耗/费用和总耗时是否可接受；长任务用 ds-context-reset + ds-ledger 后跨上下文是否丢状态；ds-ready 停在合并前时 CI 修复和 review 处理质量是否可接受 | 按 10 个同类型小任务做 A/B；B 组只装 ds-mode、ds-plan-loop、ds-verify-loop，重复失败再加 ds-unstick，先不要上 ds-ship；长任务另测 ds-context-reset + ds-ledger；Ship 类先在非关键仓库用 ds-ready 观察 | 报告没有给试用时长；先按 10 个同类型小任务跑一轮 A/B，记录验证执行率、返工、人工干预和成本，再决定是否加 ds-review-loop、ds-best-of-n 或进入 Ship 类技能 |
| pstack | 返工轮数是否下降；首次交付即通过率是否上升；证据完整性是否从无到有；改动文件数与 diff 行数；同一类错误在后续任务中再次出现的次数；token 消耗与墙钟时间；跑一夜专项看“需要注意”条目数、需要人工介入的次数、决策日志中被推翻的决定比例、产出中被丢弃的比例 | 选一个当前真实存在、可复现、可自动判定的小 bug，按安装、初始化、首个任务提示词跑一次；同一件任务再用普通对话跑一次作为对照；若有效，再试一次跑一夜 | 报告没有给试用时长；先半天到一天一轮，按任务次数记录，判断省下的返工是否大于多花的成本 |
| 两条最小规则 | AGENTS.md：未运行检查却被表述为“已通过”或“已完成”的次数下降；代理明确写出“没有运行检查”或“未验证”的比例上升；人工复核发现未验证却漏报的次数下降；机械声明是否可控。E2E：人工验收发现“声称完成但未通过”的次数下降；返工轮次、从任务下达到通过耗时下降；新增 E2E 用例数增加；证据缺失率下降；回归失败率不升高 | AGENTS.md 只加入那一行，选一类容易“没跑检查就说完成”的任务连续试用；E2E 选 1–2 个已有 E2E 测试的编码任务，开始前写清通过标准，交付时强制要求新增 E2E case 通过证据及截图/录屏，与“只让 agent 口头声称完成”的基线对比 | 原文没有给具体时长或次数；按任务次数记录，直到你能判断比例变化；不要把它当已成熟方案 |

通用顺序：先写清可客观判定的通过标准，再选一个真实小任务，要求先复现、最小改动、交出修前修后证据；需要强制力再装 first-pass 的 hooks 或 CI；需要回执和新鲜度复核用 done-is-a-claim；需要界面事实用浏览器 skill；研究结论时效用 Agent-Cockpit；便宜模型短循环用 deepseek-stack；pstack 先小范围试，不要直接铺开。

## 常见坑

- 别指望提示词本身能拦住。first-pass 作者说只用指令时，11 次测试中有 7 次跳过了改写；能扣住编辑的是 Claude Code 的 hook，Cursor 等拿不到 hooks。
- 问题不要随时问。每个问题都会停下会话等你回答——三个会话三天里的 70 组问题中，有 17 组等了一小时以上。先做完所有不依赖你回答的部分，再一次问剩下的。
- jev 不是裁判。它在 269 个审计问题上排序时，给多少人会遇到的权重高于伤害多大，所以它能让一条发现变严重，但永远不能清除评审者认为严重的发现。
- habit-words 的输出别外流。只含你自己的短语和检查，绝不写进团队共享文件；transcript 只读、临时文件用完删除。
- 装了 first-pass 插件别再 -a claude-code，否则每个 skill 出现两次；Windows 上用 --copy，因为符号链接会变成纯文本。hook 是被钉住的：某个 pull 改了 hook 脚本文件夹里的任一文件，hook 就暂停等你重新批准，别以为是坏了。
- fork / 外部贡献者的 PR 只读不跑，除非你同意。review 不会自己发帖：只有你挑了某个修复并说 yes 才推。
- 浏览器会话文件绝不提交、绝不分享。它含 cookies/tokens，只放在 ~/.claude/playwright/sessions/<project>/；截图和报告在临时目录 7 天后删除，要留的得另说存哪。
- 浏览器 skill 不替你做代码评审。它的约定是只做你要的事；想要完整检查清单，你得明确说 review / health check。成本主要在“看图”：每张约 1.5k–2k token。只截需要的尺寸、直接给 URL 能省；别顺手把整个后台菜单都截一遍。它不认识你的 dev server，localhost 不通就是没起；内网自签证书先确认主机可信再加 --insecure。
- dotpals 别当成熟方案。31 stars、v0.10，且强制回修只支持 Claude Code；Cursor / Gemini CLI / OpenCode / GitHub Copilot CLI 只挂只读 hook，不能批准或阻止任何东西。它拦不住没有测试的项目，也不会对跑测试告诉我结果这类没改代码的请求强制修；回推有次数上限，同一个请求最多两次。输出被 | tail 之类切断时它读不出结论，会让你重跑；仍读不出就请你人工看。云端二次复核默认是关的，开了会把去除密码/密钥/邮箱/IP 之后的测试输出尾部发到 TypeSafe Jev，需要你自己的 key。
- done-is-a-claim 不是闸门。作者写明它不拦截工具调用、不阻断合并、不强制部署策略；想真的拦住，得靠 first-pass 的 hooks 或 CI。原生插件装完，规则不会进你的项目指令文件；想让项目本身带上这些规则，走做法 C 或 D。回执里退出码 0 ≠ 任务完成；没有用 --input 对选定文件做指纹的回执，对新鲜度复查来说是不完整的。install_skills.py 默认不覆盖：已存在的技能目标会被拒绝安装，项目指令文件不动；本地改过的副本连 --update 也不会替换。跑演示时别把退出码读反：false_green.py 和 wrong_delivery.py 退出 0 表示陷阱被演示出来了，不代表真实交付成功或 verifier 通过。
- Shrike 只做本地调试，不做生产监控。README 明确写 For errors in production, keep Sentry；别把它当成线上告警方案的替代。平台强绑定：只有 macOS Apple Silicon 有发布版；Linux 需自己构建且无语音；Windows 从未在 Windows 机器上跑过。不是所有栈都能拿到逐函数的值。它没有定时、事件、状态触发的编排；效果宣称没有度量，先用一两个真实 bug 做前后对照。不装 Claude Code 就要自备 Anthropic API key；从源码跑要 Node 24 + pnpm 10，语音还要 Xcode。别把 Apply 这步自动化掉：agent 不能直接改文件、每个改动都是你批准的 diff 是这条做法的一半价值。
- Vantage 不是完整交付验收系统。Phase 1 只覆盖 Asked/Built/Proven，Reviewed、Shipped、Verified 还没有数据源；Stop gate 默认只是 warn，只提示、不阻塞，别把它当闸门。当前没有 published release，只能 checkout 构建；README 没有提到 Cursor 集成，别把 Vantage 用到 Cursor 的依据写进方案。stats 输出只含数字和固定标签，不含标题、命令、路径或仓库名；人工抽查 Track 记录时仍要对照 git diff、测试日志和 PR。Haiku 分类默认关闭；开启后会发送仓库名、分支、第一条请求的第一句（最多 300 字符，移除 URL 和疑似秘密文本）、最多 10 个文件名（不含路径）、计数和当前标题，不发送命令、transcript 或路径。它只改善标题、主题和分组，不决定状态、阶段或 proof。vantage remove 和 vantage uninstall 都不删除 ~/.vantage；需要手动删除该目录才会清除数据。
- Agent-Cockpit 的证据链吃纪律：实验不经 cockpit run 就没有记录；变更不 cockpit_report 上报就可能被 gate 拦住；claim 证据不落到 run 实际写出的文件字段，整条链就是空的。它不是 git 仓库就用不了，init 只往仓库内写。未上报变更会阻断 git commit，也会让 Claude Code 在上报前无法结束回合；别以为是工具坏了，先 cockpit check / cockpit_report。函数级精度只对 Python 有原文依据，其他语言不要外推。它很年轻：36 stars，材料只有 README 与作者自述的一次会话录像；误报率和流程摩擦没有独立评测。白板绑定 127.0.0.1、所有检查是普通规则、无 LLM 调用、零 token，这些是机制描述；不等于你的研究结论自动可信。cockpit_review 默认只看变更行，--all 才看全部；装了 ocr 才优先用 ocr。
- deepseek-stack 别当成熟方案。58 stars、MIT，只有 README 级描述；约 30 个技能只给名称和一句话功能，没有技能内部提示词、benchmark、成功率或成本对比。先打开 SKILL.md 审阅，再用于真实任务。ds-ship 风险最高：无人值守从变更走到合并；ds-watch-pr 会自动盯 CI 和 review bot；ds-adopt / ds-revive 会接手旧 PR。README 没有给权限边界、失败回滚或人工审批点的细节。ds-jury、ds-best-of-n、ds-swarm 需要子代理或第二模型；没有时会退化为在新上下文里串行尝试。别把“安装全部技能”当默认。先只装 ds-mode、ds-plan-loop、ds-verify-loop；同一失败出现两次再转 ds-unstick，不要原样重试到第 5 轮以后。ds-verify-loop 最多 5 轮，ds-review-loop 最多 4 轮，这是硬停止条件，不是建议。
- pstack 是第三方教程站 32 stars，细节外链不在材料，命令和行为以官方仓库为准；没有版本号、核对日期、成功率、任务耗时对比或案例数据，首页 before/after 和 hero 演示是示意插画，不是实测记录。作者自承更慢、更费 token，小改动不用。跑一夜需要可机械判定的完成条件、独立 worktree、决策日志和逃生口；材料没有日志或复现，先小范围试，不要当已成熟方案。它不提供 hooks 或闸门，想强制拦仍要靠 first-pass 的 hooks、dotpals 的测试状态核对、CI 或 done-is-a-claim 的回执与复核。
- AGENTS.md 规则不是闸门。它只要求代理披露“没跑检查”，不拦截工具调用、不阻断合并，也不会自己运行检查；不要补写被截断的第二条规则；机械写“未检查”不等于改善。任务本身没有可执行检查时，这条规则不能替代验证；它只能促使代理说清楚“没有检查”。
- E2E 规则的原文只有第 1 条，第 2 条起截断；不要根据标题或开头补写后续规则，也不要把按原文整理的提示词条款当成原文全文。它没有给命令、配置、案例数据或对比结果，推文互动量低；只能小范围试，不能当效果证据。如果 E2E 检查本身不可靠，截图或录屏也不能证明结果正确；证据要对应本次变更，并配合回归检查。“自检到通过”没有最大轮次或超时；实际用必须自己加停止条件，否则可能无限循环。这是合并时补的控制，不是原文。它不拦截工具调用、不阻断合并；想强制拦仍要靠 first-pass 的 hooks、dotpals 的测试状态核对、CI 或 done-is-a-claim 的回执与复核。截图/录屏只证明界面某状态，不证明逻辑正确；界面任务仍要交 E2E 通过日志或流程。

## 证据与来源

**first-pass 部分**来自本次调研的 joetawil7/first-pass 报告：安装命令、一次性 setup、premortem 十问、建造期间的“它需要存在吗？”规则、完成的定义（改动前失败的测试 + breaker 评审 + 干净 checkout 的 CI）、fix-the-class、review 的调用方式、habit-words 的读取范围与脱敏规则、sharpen 在 Claude Code 里的 hook 行为、多仓库的漂移与 hook 钉住机制、可选 jev 的行为与限制、以及写到机器上的文件清单。数据均为作者自述，未看到第三方复现：完整审计发现 318 个问题、25 个高严重度，其中只有 45 个在正在写的那些行里；只用指令时 11 次测试中有 7 次跳过了 sharpen 改写；三个会话三天里 70 组问题中 17 组等了一小时以上；jev 排序测试用了 269 个审计问题；小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元。其他依据：让没有写这段代码的第二个 agent 在全新上下文里评审，报告称作者引用 Huang et al. 2024；它需要存在吗？规则来自与 Ponytail 的对照测试；README 把 obra/superpowers 列为 Related；回复规则借鉴 i-have-adhd 检查第一行和最后一行的做法。作者主张、尚无数据：这是 0.5 版、收益尚未测量，且每次改动更慢更贵。报告明确：原文只提到 Cursor、Codex、Windsurf、Claude Code，没有提及 Cline；也没有描述后台自主推进的长任务。

**浏览器 skill 部分**来自本次调研的 AndyShiu/claude-skill-playwright-browser 报告（仓库 MIT、49 stars，单作者）：克隆路径与目录名要求、setup.mjs 的两种装法、自然语言例句、登录站点的人工登录与后台复用会话流程、CLI 命令清单、三张文件位置表与 7 天清理、Windows / Git Bash 路径改写坑、排错表、维护与卸载步骤、与 Claude in Chrome 的分工判据。数据与局限：README 中所有示意图都由该 skill 对一个小型 demo 站生成；与 Claude in Chrome 的对比是同一任务对 3 个报表页拍移动端截图，两个全新 Claude agent 各跑一次，token 48,045 vs 48,853、耗时 93 s vs 47 s、工具调用 9 vs 7（原文此处截断，未说明哪一组属于哪个工具），样本只有一次；token 成本估算为单图 5k–7k、三尺寸 8k–10k、单页健康检查 12k–18k、排查一个问题/走一条流程 20k–40k、批量多页 25k–40k、每张图约 1.5k–2k；你的项目目录永不被碰是 README 的说法，未做独立验证；Playwright Test 细节只在 references/project-tests.md，原文未展开。

**dotpals 部分**来自本次调研的 Rikinshah787/dotpals 报告（仓库 31 stars、v0.10）：一键安装与 GitHub 直装、三个可选参数、Claude Code 插件命令与 /dotpals:pals、Codex 的日志跟随与 DOTPALS_CODEX=0、dashboard Agents 页的 Connect / Disconnect / Send a test event 行为与各 agent 改动的文件清单、~/.dotpals/config.json 按 id 关闭集成、POST /event 接口的字段与同 id 合并语义、bridge/adapters/ 自定义 adapter 的模块形状、MCP 接入命令与可用工具清单、默认开启的回推修复失败测试行为与几类只报告不强制修的情形、Laya / TypeSafe Jev 二次复核、CLI 命令与快捷键。数据均为作者或 README 自述，未见第三方复现：测试结果的四态、能识别的伪造通过、时点问题示例、失败原因示例、支持读测试输出的框架、回推上限是每个请求最多两次、强制回修只支持 Claude Code，其余 agent 只挂只读 hook，原文明确 none of them can approve or block anything；云端 TypeSafe Jev 默认关，需要你的 key。

**done-is-a-claim 部分**来自本次调研的 Grit-77/done-is-a-claim 报告：主流程、13 个技能、18 条实战规则与 INCIDENTS.md、安装四法、examples/false_green.py 与 examples/wrong_delivery.py、tools/receipt.py、tools/check_receipt.py、tools/native_smoke.py、tools/run_tests.py、templates/ 三份模板、主张与证据对照表、按场景挑 skill 的表、AGENTS.md / CLAUDE.md 的复制方式。数据均为作者或 README 自述，未见第三方复现：假绿演示 verifier 退出码 1、summarizer 退出码 0，receipt 跟随 verifier 标 FAIL；原文明确不拦截 agent 的工具调用、不阻断合并、不强制执行部署策略；原生插件安装不会把规则加进被采用项目的指令文件；receipt.py 的退出码 0 只代表命令成功，不代表任务完成；未用 --input 指认输入的回执对新鲜度复查不完整；13 个技能、18 条规则，每条规则在 INCIDENTS.md 里有对应失败故事；CI 在 Windows 和 Linux 上跑；演示与工具需要 Python 3.10+；效果数据为作者自报，原始日志未公开。

**Shrike 部分**来自本次调研的 SumantxD/shrike 报告：安装、Claude Code 插件两行命令与 /shrike、sample project 的完整闭环、worktree 并行比两份修复、默认的隐私与审批四条规定、支持的技术栈与各栈记录粒度、Linux 自构建路径与 NixOS 的 appimage-run、包结构。材料只来自 GitHub README（仓库 31 stars）：没有实测、没有 issue/讨论内容、没有版本发布记录或第三方评测。较可核验的具体内容：安装与源码运行命令、Claude Code 插件两行命令、支持技术栈清单与各栈记录粒度、隐私与审批机制描述、Roadmap 勾选状态、包结构。仅属作者主张：How it compares 对比表、Bazaar 示例应用、agent 第一次就修对、40 秒演示视频等效果宣称——均无准确率、耗时或对照实验数据。硬限制：只覆盖本地开发调试，不能替代生产监控；平台强绑定 macOS Apple Silicon；从源码跑要求 Node 24 + pnpm 10；语音还要 Xcode；不装 Claude Code 要自备 Anthropic API key；Roadmap 中自动更新、Windows/Linux 正式发布、.shriketrace 可分享记录与只读 web viewer、更多栈均未完成。主动推进这一项在本条线索中基本无依据，报告明说不宜据此写进手册。

**Vantage 部分**来自本次调研的 ymatrix1/vantage 报告：本地工作项状态跟踪、A2V 轨道 Asked → Built → Proven → Reviewed → Shipped → Verified、只有证据能让卡片前进、Phase 1 只对 Claude Code 和 git 建好可用切片、hook 采集到本地 spool、SQLite 存储、git 扫描、linker、Asked/Built/Proven 阶段机、warn 模式的 Stop gate、终端状态行、本地 Track 页面、单进程 daemon 和安装器；安装与从 checkout 构建命令、vantage add --dry-run / --yes / start / doctor / open、可选 Claude Code 插件命令、Stop gate 的 off|warn 配置、stats 输出字段、可选 Haiku 分类的配置与数据策略、remove / uninstall 行为。数据均为 README 自述：Node.js 22.5+、git、Claude Code，checkout 构建需要 pnpm；当前没有 published release；README 自称 Phase 1，尚未按日使用满一周；Reviewed、Shipped、Verified 还没有数据源；只有 Claude Code 和 git 的完整切片；没有独立基准、对照实验或长期使用数据；Track 页面只监听 127.0.0.1，带 token 和 Host/Origin 检查；stats 输出只含数字和固定标签；Haiku 分类默认关闭，只发送仓库名、分支、第一条请求的第一句（最多 300 字符，移除 URL 和疑似秘密文本）、最多 10 个文件名（不含路径）、计数和当前标题，不发送命令、transcript 或路径；remove / uninstall 都不删除 ~/.vantage。

**Agent-Cockpit 部分**来自本次调研的 chutingyean/Agent-Cockpit 报告（仓库 36 stars，材料只有 README 与作者自述的一次会话录像）：本地白板 + MCP server、claim 必须引用某次被记录 run 实际写出的文件字段、run 记录脚本哈希与依赖文件/函数哈希、内容哈希判定时效、回滚即恢复、Python 依赖做到函数级、所有写入过同一道 gate（src/gate.mjs）、未上报变更阻断 git commit 且 Claude Code 在上报前无法结束回合、事件溯源 .cockpit/events.jsonl、白板绑定 127.0.0.1、无 LLM 调用零 token；命令与步骤包括 npm install、npm run demo、cockpit serve --repo demo/research、demo --break / --restore、cockpit init、cockpit run -- python3 train.py --lr 1e-3、npm link、cockpit status、cockpit check、cockpit graph、cockpit review [--all]、cockpit decide / cockpit_decisions；MCP 工具表包括 cockpit_overview、cockpit_plan、cockpit_stage、cockpit_task、cockpit_run、cockpit_claim、cockpit_hypothesis、cockpit_premise、cockpit_decide、cockpit_decisions、cockpit_report、cockpit_review。可核验的是命令、工具名、Node.js ≥ 22.13、demo 6 runs / 6 claims、Python 函数级、事件日志与 gate 的代码位置；属于作者主张或尚未独立验证的是误报率低、流程摩擦可接受、函数级精度足以支撑真实研究、回滚即恢复在所有项目上都可靠。报告明确建议先在一个已有 git 的小型计算型研究仓库上小范围试用，但没有给出试用时长，也没有独立基准、对照实验或第三方评测。把 Agent-Cockpit 作为研究 claim 时效的做法，并把“回执新鲜度”和“claim 随代码/运行失效”并列，是本次合并时按材料做的编排；两者没有做过交叉验证。

**deepseek-stack 部分**来自本次调研的 aicodeking/deepseek-stack 报告（仓库 58 stars、MIT）：README 把便宜模型的常见失败归为四类——跳过计划、没运行就声称修好、反复重试同一个坏思路、长任务漂移；技能分 Core、Loops、Build、Ship、Understand 五组，约 30 个，可在任何读取 SKILL.md 的 harness 中使用，README 列出 Claude Code、Codex、Cline、OpenCode、PandaCode 等。可核验的具体内容：安装命令、全局 -g、单技能 --skill ds-verify-loop、手动复制 skills/*、/ds-help；依赖 npx、gh、python3、子代理或第二模型；技能名与一句话分工；DeepSeek 配置建议原文。属于作者主张、尚无数据：这些技能能让 DeepSeek 像更贵的模型、便宜模型总在同样几处失败、thinking mode 比任何技能都重要、错峰更便宜、多花 token 很划算；README 没有 benchmark、成功率、成本对比、用户案例或技能内部提示词。成熟度：58 stars，低关注度，技能质量、维护频率、与各 harness 的兼容性未证明。风险：自动合并、自动修 CI、自动接手他人 PR 可能误改；README 没有给权限边界、失败回滚或人工审批点。最小试用是 10 个同类型小任务的 A/B，B 组只装 ds-mode、ds-plan-loop、ds-verify-loop，记录验证执行率、返工、人工干预、成本和耗时；报告没有给试用时长。

**pstack 部分**来自本次调研的 nevertoday/xxd-pstack 报告（32 stars，第三方中文教程站，教程对象 pstack，通用镜像 backnotprop/pstack）：可核验安装命令三组、首个任务提示词全文、五要素提示词规则、场景索引 8 条、跑一夜的五件套合同要素、规模描述 34 个技能 / 23 套剧本 / 24 条原则 / 17 篇 How-to / 20 条 Wiki / 10 种语言 / 3 课 20 分钟。只是主张、没有数据的部分：20 分钟从零到用上、三分钟上手、命令都对照过官方仓库——均为作者自述，材料中没有版本号、核对日期、成功率、任务耗时对比或案例数据；首页 before/after 图和 hero 演示是示意插画，不是实测记录；“更慢、更费 token”“小改动不用它”是作者主动承认的成本判断，方向可信但无量化。结构性局限：这是第三方非官方教程，教程内容依据 pstack 的 README 与 docs/guide 写成，命令与行为以官方仓库为准；技能原文、剧本、How-to 提示词、三套模型配置都在外链页面，不在给出的文本里，因此只能按 README 层面可照做的部分小范围试，不能验证 /poteto-mode、/setup-pstack、/show-me-your-work 等命令的真实行为；32 stars，社区验证规模很小。适用条件：工作产出可执行验证时最有效；文档、设计、方案类产出无法自动验证时，“贴证据”的约束会退化为自述，收益下降；需要愿意付更高 token 与时间成本，且任务本身值得；需要工具具备 skills/plugin 能力，且有独立 worktree 的并行条件。

**两条最小规则**：AGENTS.md 未运行检查规则来自本次调研的 @Voxyz_ai 推文线索，可确认的只有一条完整规则 Didn't run a check? Say so. An unrun check is not a pass.；第二条以 Every time I correct you, 开头后被截断，无法还原完整规则。原文没有案例、数据、前后对比或失败率；这条规则属作者主张。适用条件是代理能读取并遵守 AGENTS.md，且任务中存在可运行检查；没有可执行检查时它只能披露“未检查”，不能替代验证。E2E 验收规则来自本次调研的 @vikingmute 推文线索，可确认的只有第 1 条——不要相信 agent 自己说“做完了”，要给它明确的验证机制，要求它提供新的 E2E case 通过流程、截图甚至录屏，并让它自己能跑检查，直到通过。第 2 条起在采集文本中截断，无法判断后续内容。原文没有给出命令、配置或完整提示词，也没有案例数据、对比结果或量化指标；推文互动量较低，不能作为效果证据。做法 9 里的验收条款是把这条表述整理成可复制的最小提示词，不是原文原句；“最大轮次或超时”是合并时补的控制，原文未提及。

**没有证据支撑的部分**：把 dotpals 的测试状态核对接在 first-pass 的完成的定义之后、在已有测试套件的小项目上小范围试并加一次改绿测试看它是否识别这套试用方式，把 done-is-a-claim 的回执 + 新鲜度复核作为 first-pass 完成定义的无 hook 替代，把 Shrike 的真实执行轨迹 + Apply 审批 + replay 验收接在 first-pass 与浏览器 skill 之后，把 Vantage 的 stats 与 Stop gate 作为观察工作项是否按证据推进的做法，把 Agent-Cockpit 的 claim/run/代码哈希作为研究结论时效的做法，把 deepseek-stack 作为便宜模型短循环的做法，以及把 pstack 作为“先复现、最小改动、贴证据、/correct 写回”的独立做法，都是本次合并时按上述材料做的编排；报告本身没有给出这些编排的验证结论，也没有给试用时长。各组做法之间可以互相替代的部分，材料里也没有做过交叉验证。把 AGENTS.md 规则与 first-pass/dotpals/done-is-a-claim 的证据要求并列，把 E2E 通过证据、截图/录屏、自检到通过接在 first-pass/done-is-a-claim/浏览器 skill 之后，也是本次合并时按材料做的编排；推文本身没有给出这些编排的验证结论、交叉验证或试用时长。

## 依据的调研

- [joetawil7/first-pass](../research/radar/2026-10-01/8-joetawil7-first-pass.md)：值得一试，建议在一个仓库上小范围试装并跑几周，因为它把“确保正确”这类模糊要求换成了可执行的具名检查（十个问题、非作者评审、改动前失败的测试），直接对应本项目的任务匹配与效果验证问题；但作者自己说这是 0.5 版、收益尚未测量，且每次改动更慢更贵（小 demo 上修一个重复扣费 bug 加 ship-check 约 29 美元），因此不宜直接全团队采用。
- [AndyShiu/claude-skill-playwright-browser](../research/radar/2026-10-01/22-andyshiu-claude-skill-playwright-browser.md)：值得一试，建议在一个前端项目里按 README 的安装与命令做小范围试跑（先只做「多尺寸截图 + 移动端溢出定位」这一件事，与手动 F12 对照），因为原文给出了可直接复制的安装步骤、CLI 命令、登录流程和排错表，且自带视觉比对与健康检查等验证手段；但它只是 49 stars 的单作者第三方 skill，效果数据仅来自各跑一次的对比，不足以直接写成标准做法。
- [Rikinshah787/dotpals](../research/radar/2026-10-06/1427-rikinshah787-dotpals.md)：值得一试，建议在已有测试套件的小项目上按 README 一条命令装起来小范围试：用 dotpals 读取测试输出、识别“伪造通过”，并在 Claude Code 试图收尾/commit/push 时把失败测试回推给它修。理由是它给出了完整可照做的安装、MCP 接入和自定义 agent 事件接口，且自带一份逐条人工核对的准确率数据；但项目很新（31 stars、v0.10），强制回修只支持 Claude Code，其余 agent 只能事后观察，需先验证再决定是否长期用。
- [Grit-77/done-is-a-claim](../research/radar/2026-10-11/2455-grit-77-done-is-a-claim.md)：值得一试，把「完成是一句主张，要附证据」落成可操作的规则文件+技能包+本地采证工具，先在一个小项目上按 README 的安装路径和 receipt 工具试跑一轮，再决定是否固化进团队流程；理由是它给出了可照抄的安装命令、18 条规则、回执工具用法和验证模板，但作者自己声明不强制、不拦截，效果数据为自报且原始日志未公开。
- [SumantxD/shrike](../research/radar/2026-10-12/2683-sumantxd-shrike.md)：值得一试，在一台 macOS Apple Silicon 上用一个小型 Node/Next（或 FastAPI/Flask/Django）项目接入 Shrike，完整走一遍“点击出错按钮→Agent 沿真实执行轨迹定位到行→批准 diff→重放同一次点击验证”的闭环，理由是把真实运行轨迹（含行内真实值）通过 MCP 喂给 Claude Code、并强制人工批准后才能改码，正好补上编程智能体“看不见实际执行、只能读代码猜”的短板；但只有 macOS 构建、项目仅 31 stars 且无独立评测，先小范围试。
- [ymatrix1/vantage](../research/radar/2026-10-20/5186-ymatrix1-vantage.md)：值得一试，建议在一个以 Claude Code + git 为主的小仓库试用 Vantage，先 dry-run 安装，再用 Stop gate 和 stats 检验“只有证据才推进”的验收流程；它给出了可照做的安装与配置，但仍是 Phase 1、未发布、只覆盖 Asked/Built/Proven，不能当作完整交付验收系统。
- [chutingyean/Agent-Cockpit](../research/radar/2026-10-30/8506-chutingyean-agent-cockpit.md)：值得一试，建议在一个已有 git 的小型计算型研究仓库上小范围试用 Agent-Cockpit：先跑 demo 观察“改一行 grader→相关结论变红→回滚后恢复”，再用 `cockpit init` 接入自有仓库、用 `cockpit run` 记录实验并通过 MCP 的 `cockpit_claim` 登记结论；理由是它把“结论—运行—代码”的失效检测做成确定性哈希规则（零 token、无 LLM 调用），并挂进 Claude Code/Cursor 等 MCP agent 的 Stop hook 与 pre-commit，直接作用于效果验证，但项目很年轻（36 stars、仅有 README 与自述的一次会话录像佐证），误报率与流程摩擦需自行验证。
- [aicodeking/deepseek-stack](../research/radar/2026-11-01/9047-aicodeking-deepseek-stack.md)：值得一试，建议小范围试：在支持 SKILL.md 的编码 agent 里安装 ds-mode、ds-plan-loop、ds-verify-loop 三件套，用一批小任务对比裸跑 DeepSeek 时的验证执行率、返工次数和人工干预。仓库给出了可直接复制的安装命令和清楚的技能分工，但只有 README 级描述、没有效果数据和技能内部提示词，暂不宜直接 adopt。
- [@Voxyz_ai: These days I talk to my agents 𝗺𝗼𝗿𝗲 𝘁𝗵𝗮𝗻 𝗺𝘆 𝘁𝗲𝗮𝗺𝗺𝗮𝘁𝗲𝘀.](../research/radar/2026-11-06/10923-these-days-i-talk-to-my-agents.md)：值得一试，建议把“未运行检查必须明确说明，未运行的检查不算通过”作为一条 AGENTS.md 规则小范围试用；它能减少代理把未验证结果说成通过，但原文被截断且没有证据，只够试这一条规则，不足以采用整套多智能体方法。
- [@vikingmute: 几天文章中很好的最佳实践，有些在他之前的文章中说过，我觉得再看一遍还有收获：](../research/radar/2026-11-09/11850-item.md)：值得一试，建议在编码智能体的验收环节小范围试用：先定义可客观判定的通过标准，再要求它提供新增 E2E 用例通过流程、截图或录屏等证据，并自检到通过；理由是推文给出了可操作的验收与反馈闭环，但原文截断且缺少完整配置与案例，不宜直接全面采用。
- [nevertoday/xxd-pstack](../research/radar/2026-11-11/12434-nevertoday-xxd-pstack.md)：值得一试，先照 README 给出的安装命令在现有工具（Claude Code / Cursor / Codex）里装上 pstack，用「先复现、最小改动、贴出修前修后证据」的提示词跑一件真实小 bug，再决定是否纳入日常；因为原文把「AI 说修好了但没修好」这个失败模式固化成了可抄的命令、提示词和验收动作，但正文只是教程站 README，所有细节页都不在材料里，且作者自承更慢更费 token。
