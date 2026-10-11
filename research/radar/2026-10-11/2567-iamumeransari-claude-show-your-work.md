# iamumeransari/claude-show-your-work

- 结论：**值得一试**。在 macOS + Ghostty/kitty 的 Claude Code 终端工作流里小范围试装这个插件，先跑官方 examples/pricing 的 before/after 录制、确认 QA 视频、勾选清单和对比视图都能在终端内正常呈现，再把「Claude 改完前端 UI 后录一段前后对比 QA」纳入日常；理由是原文给出了可复制的安装命令、demo 脚本和前后对比的参数结构，能把视觉验证留在终端、不额外开浏览器，但目前只支持 macOS 与两种终端、项目仅 36 stars，属早期工具，不宜直接全量采用。
- 原文：https://github.com/iamumeransari/claude-show-your-work
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T14:11:54.383Z

## 是什么

`show-your-work` 是 Claude Code 的一个插件（MIT 开源）。当 Claude 做完一件事，它把成果直接显示在终端聊天里：生成页面的截图、用 Playwright 点按应用的录屏，或一次修复的完整 QA（原始版 / 修改版并排对比）。原文的定位是“No browser, no localhost, no manual QA”。

它靠两件事成立：

- **Claude Code 的 mods**（原文称是近期新增能力），第一次允许插件改变 Claude Code 内部界面的显示。
- **能画图的终端**：Ghostty 和 kitty 支持 kitty graphics protocol，程序把图交给终端、终端直接画在窗口里。

视频的做法是切成帧后像翻页动画一样逐帧播放，一次只准备几秒（类似视频流），所以长视频不会吃掉内存或磁盘。图片和视频**不经过 Claude**：Claude 只告诉插件该显示哪个文件，因此原文称几乎不消耗 token。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提（缺一不可）**：macOS；终端为 Ghostty 或 kitty（iTerm2、macOS Terminal、VS Code 内置终端目前画不了这类图片）；Claude Code v2.1.287 或更新。

1. 在 Claude Code 里添加插件市场并安装插件：

```
# in Claude Code
/plugin marketplace add https://github.com/iamumeransari/claude-show-your-work.git
/plugin install show-your-work@iamumeransari
```

2. 在你自己的终端里装 ffmpeg（视频播放需要）：

```bash
brew install ffmpeg
```

装完即用，原文称 Claude 会自己开始展示它的工作，不需要额外配置。

3. （可选）关掉每日自动更新。插件默认每天检查 GitHub 上新版本、自动安装，并提示你重启 Claude Code 才生效：

```bash
SHOW_YOUR_WORK_AUTO_UPDATE=0
```

关掉后手动更新用：

```bash
claude plugin update show-your-work@iamumeransari
```

4. （可选）关掉匿名遥测：

```bash
SHOW_YOUR_WORK_TELEMETRY=0
```

或 `DO_NOT_TRACK=1`；设置了 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 时也会自动关闭。原文声明不上传文件名、路径、URL、标题、提示词、你输入或 Claude 写出的任何内容。

5. 先跑官方 demo 验证环境。`examples/pricing` 是一个计费开关坏掉的定价页，外加一个录制前后对比的脚本：

```bash
cd examples/pricing && npm i playwright
node qa.cjs before rec-before   # the broken version: 3 checks fail
node qa.cjs after  rec-after    # the fixed version: all 5 pass
```

6. 让 Claude 展示这组对比，提示词原文照抄：

```
"show me the QA, rec-after vs rec-before"
```

7. 用在自己的项目上：让 Claude 用 Playwright 跑一遍改动前的应用并录制，改完再用**同一个脚本**录一遍，然后把两个文件作为前后对比交给 `show_video`。原文给出了 Claude 传给插件的参数结构，可作为“你需要准备哪些信息”的清单：

```jsonc
{
  "path": "qa/after.webm",          // the updated run
  "compare": "qa/before.webm",      // the original run, same script
  "title": "Pricing page",
  "url": "http://localhost:3000/pricing",
  "changes": [                      // what changed, and the second it shows up
    { "title": "Annual toggle sets prices", "at": 3.2 },
    { "title": "Plan buttons line up", "at": 5.4 }
  ],
  "summary": [                      // the test results, at most three lines
    { "label": "Billing: toggle works", "ok": true, "passed": 1, "total": 1 },
    { "label": "Layout: plans, buttons", "ok": true, "passed": 3, "total": 3 }
  ]
}
```

要点：`compare` 必须是**同一脚本**录的原始版，`changes[].at` 是每处改动出现在视频第几秒（用于点击跳转），`summary` 最多三行测试结果。

8. 只想看单张文件时，可以自己在 Claude Code 里打开：

```
/img path/to/file.png
```

9. （改插件本身时）编辑 `hooks/register.tsx`，然后：

```
/reload-plugins
```

校验用 `claude plugin validate .` 和 `claude plugin test .`。

**已知参数上限**：视频用 ffmpeg 切帧，最高 12 帧/秒、960 px 宽、最多 900 帧。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：原文把“让 Claude 自己展示产出”从人工环节拿掉了——不用起 localhost、不用开浏览器、不用手动 QA。可展示的产物不限于代码：落地页概念图、网站在桌面/平板/手机各断点的截图、bug 报告、动画、pitch deck、人物设定表、竖版视频广告，原文明确说“if Claude made it, it can show it”。这属于“AI 已经能做但很少想到交给它”的一类：视觉交付与视觉验证。
2. **任务匹配**：适合“人在终端里用 Claude Code”的前端/UI 任务、视频/动画类产出、需要视觉回归验证的修复；两个工具分工清楚——`show_image` 用于截图、渲染图、图表、稿子，`show_video` 用于 Playwright 录屏、动画、影片片段。不适合已经工作在本编辑器（VS Code/Cursor）里的用户（原文 FAQ 直接这么说）、Linux/Windows 用户、重度 tmux 用户。
3. **条件供给**：环境侧需要 macOS + Ghostty/kitty + Claude Code ≥2.1.287 + ffmpeg；任务侧需要一份可重复运行的 Playwright 脚本，能产出同一脚本的 before/after 两段录制；信息侧要提供 `url`（原视频里叫 Open page 要跳的地址）、`changes` 的时间戳、`summary` 的检查项与通过数——这三样决定了“随视频打勾”“点击跳转改动”“差异行”这些能力能不能出现。权限上图片视频不出本机、也不进模型上下文。
4. **主动推进**：插件每天自动检查 GitHub 新版本、自动安装并提示重启（可关）；原文称 Claude “starts showing you its work on its own”，即展示动作不需要每次人工触发；QA 环节里 Claude 是自己构建功能、自己点按测试（Playwright）、自己录制再放给你看。触发条件的具体规则原文没有展开。
5. **效果验证**：这是原文给得最具体的一块。QA summary 直接给结果（例 “Form: 8/8 passed”，最多三行）；每条 check 在视频播到被测试的那一刻弹出勾或叉；同一组 checks 会同时显示在原始版和修改版上（哪些之前失败、之后通过）；Compare 视图把两段录制逐帧对齐，“旧版加载慢的话视频会等它”，保证同一步在两边同时发生；视频下方一行给出“此刻的差异”，例 `Annual toggle updates prices · Original ✗ → Updated ✓`；多次修改会保留每一版历史以便回看对比。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：本插件是它的扩展，且依赖较新的版本（≥2.1.287）。作为“给 Claude Code 加装能力”的具体样例，可并入 Claude Code 的用法条目。
- **Claude Code Mods（study）**：原文明确说 mods 是“插件第一次能改变 Claude Code 内部界面”的前提，本线索等于 mods 的一个可跑通的落地案例，可把 Mods 从纯研读推进到“有一个真实用途”。
- **Cursor（watch）**：原文 FAQ 正面回答了“为什么不直接用 VS Code 或 Cursor”——如果你已经在编辑器里工作，可能不需要它；它的目标用户是坚持终端工作流、不想每完成一件事就切窗口的人。这可以作为“工具选择取决于工作环境”的一条判断依据。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**可复现的证据**：`examples/pricing` 目录 + 两条可直接执行的命令（before 3 项失败、after 5 项全过）+ 一句提示词，是原文中唯一能独立跑通并对照结果的部分。页面截图与录屏（`docs/*.jpg`）是作者自述效果，未见第三方评测。

**可当作参数事实的**：视频 12 帧/秒、960 px 宽、最多 900 帧；QA summary 最多三行；`show_image` / `show_video` 两个工具的用途划分；前后对比所需字段。

**只是作者主张的**：“几乎不消耗 token”“Claude 自动开始展示”“两段录制逐帧同步”“点击改动跳到视频对应时刻”。机制解释（Claude 不看图、只传文件路径）在逻辑上说得通，但没有量化数据支撑。

**适用条件很窄，这是最大限制**：仅 macOS；仅 Ghostty 和 kitty（iTerm2、macOS Terminal、VS Code 终端不行）；tmux 内“还不可靠”，可尝试在 tmux 配置里开 `set -g allow-passthrough on`；Linux 和 Windows 尚不支持。

**成熟度与风险**：仓库 36 stars，属早期小项目；默认每天从 GitHub 拉新版本并覆盖安装，接受“始终跟最新代码”就等于接受供应链风险，可关掉自动更新或锁定版本；匿名遥测虽明确不上传文件名/路径/URL/内容，但仍会上报会话、展示类型和按钮使用情况，可用环境变量关闭。图片、视频和文件不出本机、也不发给模型，这点原文明确。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天内可完成，不动生产代码）**

1. 在 macOS + Ghostty/kitty + Claude Code ≥2.1.287 的环境里，按上面步骤 1–2 安装插件和 ffmpeg；建议先 `SHOW_YOUR_WORK_AUTO_UPDATE=0` 锁住版本。
2. 跑 `examples/pricing` 的两条命令，产出 `rec-before` 与 `rec-after`。
3. 在 Claude Code 里输入：`"show me the QA, rec-after vs rec-before"`。

**判断有没有改善（尽量选可观测的指标）**

- 视频是否真的在终端内播放，全程**没有**打开浏览器或播放器（目标：跳出终端次数 = 0）。
- before 是否显示 3 项失败、after 是否显示 5/5 通过，与脚本输出一致。
- 点 “What changed” 里的条目，视频是否跳到对应时间点、被选中的条目是否高亮。
- Compare 视图两段录制是否逐步同步；视频下方的差异行描述与实际差异是否吻合（例：`Annual toggle updates prices · Original ✗ → Updated ✓`）。
- 同一次任务的会话 token 用量与不装插件时相比没有明显上升（对应“几乎不耗 token”的主张）。

**再上自己的任务**：挑一个真实前端 UI 修复，让 Claude 改完并录前后对比，人工看视频判断两类错误——误报（显示通过但实际没修好）和漏报（实际修好但显示失败）。原文没有给准确率数据，所以这一步必须人工兜底；连续 3–5 个任务都没有误判，才值得把“改完自动录一段前后对比 QA”写进常规流程。
