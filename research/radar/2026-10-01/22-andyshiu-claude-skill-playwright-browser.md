# AndyShiu/claude-skill-playwright-browser

- 结论：**值得一试**。建议在一个前端项目里按 README 的安装与命令做小范围试跑（先只做「多尺寸截图 + 移动端溢出定位」这一件事，与手动 F12 对照），因为原文给出了可直接复制的安装步骤、CLI 命令、登录流程和排错表，且自带视觉比对与健康检查等验证手段；但它只是 49 stars 的单作者第三方 skill，效果数据仅来自各跑一次的对比，不足以直接写成标准做法。
- 原文：https://github.com/AndyShiu/claude-skill-playwright-browser
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T06:24:58.762Z

## 是什么

这是一个给 Claude Code 用的 skill（AndyShiu/claude-skill-playwright-browser，MIT，49 stars），本质是把 Playwright 驱动的浏览器以**后台**方式挂到 Claude Code 上：用自然语言（不必提 Playwright）让 Claude 开浏览器、点击、截图、跑检查，最后把结果和文件交回来；不占用你正在用的浏览器，可在任意项目（前端、后端、非 Node 项目）中使用。

能力清单（README 表格）：桌面/平板/手机截图、整页或单元素、批量多页；前端健康检查（console 错误、4xx/5xx 接口失败、坏图坏链、移动端布局溢出并指出是哪个元素、axe 无障碍、LCP/CLS）；视觉比对（改 CSS 前存 baseline，改后出红色高亮 diff 图）；UI 流程（登录、点菜单、填表、翻页、断言，每步截图、失败自动截图）；需登录站点（人工登录一次后后台复用会话，不存密码）；按需把流程转成项目内 Playwright Test 跑 CI。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：已装 Claude Code；Node.js ≥18（`node -v` 自查）；macOS / Linux / Windows；Chromium 约占 150 MB 磁盘。

1. 把仓库克隆到 skills 目录，**目录名必须叫 `playwright-browser`**。

```bash
# Just for you, available in every project
git clone https://github.com/AndyShiu/claude-skill-playwright-browser.git ~/.claude/skills/playwright-browser

# Or for a single project (commit it with the project to share with your team)
git clone https://github.com/AndyShiu/claude-skill-playwright-browser.git <project>/.claude/skills/playwright-browser
```

Windows 个人目录为 `%USERPROFILE%\.claude\skills\playwright-browser`。

2. 装运行时。默认方式：第一次使用时 Claude 会自己发现运行时没装、告知你并执行一次性 setup。想提前装：

```bash
node ~/.claude/skills/playwright-browser/scripts/setup.mjs                  # Chromium only
node ~/.claude/skills/playwright-browser/scripts/setup.mjs firefox webkit   # also Firefox and WebKit (Safari's engine)
```

npm 包进 skill 目录内的 `node_modules/`（已 git-ignore），浏览器进 Playwright 共享缓存（所有项目共用一份下载）；README 称「你的项目目录永不被碰」。

3. 直接用自然语言下任务，不用提 "Playwright"。README 给的例句（原样）：

```
Take mobile and desktop screenshots of the homepage at localhost:5173
A customer says our site scrolls sideways on iPhone — find the element that's too wide
Health-check the new checkout page before we ship it
I changed the header CSS — compare before and after
On the admin "Orders" page, does going to page 2 actually load different data?
This issue says "Submit" does nothing — reproduce it on dev and capture screenshots
Screenshot every page in the admin menu and save them to my Desktop
```

注意其行为约定：只做你要的事（要截图就只给截图，问一个 bug 就只查那个 bug），只有你明确要 review / health check 时才输出完整检查加建议清单。

4. 需要登录的站点（前提：站点确实需要账号）：
   1) 告诉 Claude 你要操作需要登录的站点，它打开一个浏览器窗口；
   2) **你自己**在该窗口登录（只有你输入凭据，凭据不被存储）；
   3) 用完关掉窗口，或让 Claude 在到达指定页面后自动保存并关闭。之后 Claude 可在后台复用该会话；每次运行后站点刷新的 token 会被写回，持续使用的会话保持登录。若闲置超过站点登录有效期，Claude 会检测到跳转登录页并请你重新登录，而不会把登录页当结果交给你。

5. 想自己跑 CLI（日常不需要，Claude 会代劳）：

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

6. 知道文件去哪（涉及数据安全，必须遵守）：

| What | Where | Notes |
|---|---|---|
| Login sessions | `~/.claude/playwright/sessions/<project>/` | 含 cookies/tokens，仅你可读，**绝不提交或分享** |
| Visual baselines | `~/.claude/playwright/baselines/<project>/` | 前后比对用的参考截图 |
| Screenshots & reports | 系统临时目录的 `claude-playwright/` | **7 天后删除**，要留的 Claude 会问存哪 |

7. Windows / Git Bash 专属坑：Claude Code on Windows 默认用 Git Bash，会把以 `/` 开头的参数改写成 Windows 路径（`--until-url /dashboard` 变成 `C:/Program Files/Git/dashboard`）。本 skill 对自己的选项会自动还原；你手动跑别的命令遇到同样问题时：去掉前导 `/`（写成 `--until-url dashboard`）、命令前加 `MSYS_NO_PATHCONV=1`，或改用 PowerShell / cmd。

8. 出问题按这个表处理：截图显示登录页 → 会话过期，让 Claude 重新登录；显示 loading spinner → 让 Claude 等到特定内容再截（用 `--wait-for`）；内网站点证书错误 → 确认主机可信后加 `--insecure`；`localhost` 不通 → dev server 没起，Claude 会告知并可帮你起；按钮“没反应”其实是弹了确认框 → 浏览器对话框默认被关闭，Claude 知道何时该接受；要测 Safari 兼容 → 跑 `setup.mjs webkit`。

9. 维护：更新在 skill 目录 `git pull`，`package.json` 变了就再跑一次 `node scripts/setup.mjs`；卸载删 skill 目录和 `~/.claude/playwright/`，浏览器缓存在删目录前先跑 `npx playwright uninstall --all`，或手动删 `~/Library/Caches/ms-playwright`（macOS）、`~/.cache/ms-playwright`（Linux）、`%LOCALAPPDATA%\ms-playwright`（Windows）。

## 对应的研究问题

1. **能力发现**：把一批本来由人手点的事交给 AI 后台做——多尺寸截图、移动端横向溢出定位到具体元素、上线前健康检查、CSS 改动前后比对、复现“按钮没反应”的 issue、验证后台列表翻页是否真的换了数据、批量截取整个菜单的页面。README 给的是可直接照说的触发句式。
2. **任务匹配**：给了与本项目最可能冲突的“Claude in Chrome”的分工判据——要用你当前开着的标签页/你已登录的浏览器、想看着它干活、一次性随便看看 → 用 Chrome；要后台运行不碰你的浏览器、要结果可重复、要一次批量多尺寸多页面、要健康检查/报告/前后比对/测试 → 用本 skill；两者都行时 Claude 会问你偏好并给建议。另有按任务类型估算的 token 成本表（单图 5k–7k；三尺寸 8k–10k；单页健康检查 12k–18k；排查一个问题/走一条流程 20k–40k；批量多页 25k–40k），并提示成本主要在“看图”（每张约 1.5k–2k），只截需要的尺寸、直接给 URL 能省。
3. **条件供给**：需要 Node ≥18、约 150 MB Chromium（要 Safari 内核再加 WebKit）、目标 URL、dev server 在跑；登录站点需要人工先登录一次并保存会话，凭据不落盘；需要时提供 `--wait-for`、`--insecure`、`--script flow.mjs` 等参数；要交代产出存哪（临时目录 7 天清），会话与 baseline 默认在 `~/.claude/playwright/` 下按项目分目录。
4. **主动推进**：支持一次批量多页面截图；每次运行后把站点刷新的 token 写回，使持续使用的会话来保持登录；会话过期能被检测并主动要求重登。但原文**没有**给定时/事件/状态触发的编排方案，唯一与持续运行沾边的是“把流程转成项目内 Playwright Test 后在 CI 里跑”（细节在原文只提到 `references/project-tests.md`，未展开）。
5. **效果验证**：视觉比对（先存 baseline → 改后重截 → 出红色高亮 diff 图）；健康检查的量化项（console 错误、4xx/5xx、坏图、坏链、移动端溢出及其肇事元素、axe 无障碍问题、LCP/CLS）；流程每步截图 + 失败自动截图；CLI 每条命令输出一行 JSON，便于后续判断。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）**：本项就是 Claude Code 的 skill 扩展，安装路径 `~/.claude/skills/playwright-browser` 或项目级 `<project>/.claude/skills/`，是给 Claude Code 补“眼睛和手”的一环。
- **Playwright Test（清单状态：try）**：README 明确写“需要时可把一条流程转成你项目里的 Playwright Test 并在 CI 跑”，对应仓库的 `references/project-tests.md`（原文只列了文件名和能力描述，未给具体内容）。
- 清单中没有其它相关条目。

## 证据与局限

**原文给出的数据/案例**：
- README 中所有示意图（响应式截图、健康检查、前后比对）都由该 skill 对一个小型 demo 站生成。
- 与 Claude in Chrome 的对头测试：同一任务“对 3 个报表页拍移动端截图”（登录态内部 admin，URL 由人给出），两个全新 Claude agent 各跑一次：token 48,045 vs 48,853；耗时 93 s vs 47 s；工具调用 9 vs 7；移动端尺寸 500×667（Chrome 窗口不能窄于 500 px）vs 390×844（真 iPhone 尺寸，3× scale）；输出 JPEG 在临时目录需搬走 vs 按指定位置存 PNG；整页截图 Chrome 不可用 / 本 skill 可用；登录分别用“你 Chrome 现有登录”与“事先用本 skill 保存的会话”。
- token 成本表（上节已列）。

**作者自己承认的局限**：token “基本打平”，因为两边大头都是 agent 的固定开销；只各跑一次、且 URL 由人提供；页数或步骤更多的任务“应该更有利于本 skill，但那部分尚未测量”。

**只是主张、未见独立验证**：批量多页“只采样几张图而不是打开每一张”因而省 token；健康检查阈值与结果解读（在 `references/analysis.md`）；会话自动续期行为；“你的项目永不被碰”；token 估算表；Windows 路径自动还原。

**适用条件**：需 Claude Code + Node ≥18 + 约 150 MB 浏览器缓存；需有可访问的 URL 与运行中的 dev server；登录站点仍需人工完成首次登录；临时截图 7 天即删，长期结果要另存；绑定 Playwright 1.63；生态上仅 49 stars、单一作者、第三方来源（MIT），长期维护与安全审计无保障；session 目录含 cookies/tokens，属于敏感数据。

## 怎么试、怎么验证

**最小试用（约半天、单项目）**：在一个前端项目或任意 demo 站按“具体做法”第 1–2 步安装到用户级 skills 目录，先只做一件事：对 `localhost:5173` 首页拍 desktop + mobile 两张截图，然后追问一句“移动端有没有横向溢出，是哪个元素造成的”。拿到结果后**手工在浏览器 devtools 里核对**结论对不对，再决定是否继续用它的健康检查与视觉比对。

**判断有没有改善的指标**：
- 同一任务（截图 + 定位溢出）与手动截图/排查的耗时对比；
- 单次 token 消耗是否落在成本表区间（单图 5k–7k，三尺寸 8k–10k）；
- 移动端截图尺寸是否真的是 390×844 这类真机宽度（而非 Chrome 的 500 px 下限），这决定它能否发现只在 390 px 出现的布局 bug；
- `audit` 报告里的 console 错误、4xx/5xx 与坏图，与手动 F12 核对：**误报数和漏报数**分别是多少；
- 视觉比对：只改一处 header CSS，看 diff 图是否只高亮该区域（高亮扩散说明基线或截图不稳定）；
- 登录站点：隔一段时间再跑同一流程，看会话是否仍有效、过期时是否明确提示重登而不是把登录页当结果交回来；
- 越权行为检查：只要截图时是否真的只给截图，没有附送一堆未要求的健康检查建议（README 承诺如此，值得实测）；
- 数据安全：确认 session 目录没有被提交进仓库。
