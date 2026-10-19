# kitlangton/scrawl

- 结论：**值得一试**。建议以 try 级别在 Apple silicon + macOS 26 以上的小范围视觉/交互任务中试用：按 README 安装 Scrawl 与 agent skill，用 ⌥⇧S 录屏、口述并标注生成 bundle，再交给 Claude Code/OpenCode/Codex 并用 scrawl zoom/frames 查看细节。理由是可照做的安装、权限和命令流程完整，但适用硬件窄、证据主要是 README 自述且没有工作效果数据，暂不宜直接 adopt。
- 原文：https://github.com/kitlangton/scrawl
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T22:56:47.965Z

## 是什么
Scrawl 是一个 macOS 菜单栏录屏、口述和标注工具。按 `⌥⇧S` 开始录制，说话、点击、画标记，再按一次结束；它把屏幕、语音和标注打包成 agent 可读的 bundle：`contact-sheet.png`、`frames/frame-XX.png`、`summary.md`（时间对齐的转写和交互时间线）以及 `scrawl.json`。它还提供 `scrawl` 命令行和 agent skill，让 Claude Code、OpenCode、Codex 等 agent 读取 bundle，并用 `scrawl zoom`、`scrawl frames` 查看细节。README 要求 Apple silicon Mac、macOS 26 或更高；iOS 端另有 ScrawlKit（iOS 18+）可选。

## 具体做法
1. 前提检查与安装：需要 Apple silicon Mac、macOS 26+。用 Homebrew 安装：
```sh
brew install --cask kitlangton/tap/scrawl
```
也可从 `scrawl.kitlangton.com` 下载 DMG。应用通过 Sparkle 自更新，Homebrew 把更新交给应用本身。

2. 安装 agent skill：前提是已有 `bunx`，且目标 agent 支持 skill（README 点名 Claude Code、OpenCode、Codex 及其他 agent）。
```sh
bunx skills add kitlangton/scrawl
```
`scrawl` 命令是 Scrawl.app 内的二进制；Homebrew cask 会把它链接到 PATH，也可在 Settings › Agents 点 Install，链接到 `/opt/homebrew/bin`、`/usr/local/bin` 或 `~/.local/bin`。不想安装 skill 时可用 `scrawl skill` 打印 skill 内容。

3. 授予权限：首次启动有 onboarding。必需权限是 Screen & System Audio Recording、Microphone、Accessibility；Camera 只在首次选择 iPhone 时询问。README 说明 Screen Recording 和 Accessibility 需要把 Scrawl 拖进权限列表，Microphone 和 Camera 走 macOS 弹窗。若权限授予后未生效，按 README 的 Quit & Reopen 或自动重启逻辑处理。要重放 onboarding：
```sh
tccutil reset All dev.kitlangton.scrawl
jq 'del(.onboarding)' ~/.config/scrawl/config.json > /tmp/c.json && mv /tmp/c.json ~/.config/scrawl/config.json
```
然后退出并重开 Scrawl。

4. 录制：轻按 `⌥⇧S`（0.25 秒内释放）立即录制指针所在显示器，并自动裁剪；再按一次结束。按住 `⌥⇧` 再按 `S` 可像 `⌘Tab` 一样切换 Screen → Window → iPhone；拖动鼠标可选择区域。录制中 `⇧`+移动可画红色标记，`⇧`-点击可放编号 pin，`⌘Z` 撤销上一笔，`Esc` 取消。Screen 捕获会记录窗口和光标时间线，结束后自动裁剪每个关键帧。

5. 交给 agent：录制结束后可用 `⌥⇧V` 把 `contact-sheet.png` 和 `summary.md` 粘贴到当前应用或终端；也可用命令复制或发送：
```sh
scrawl send <bundle> --clipboard
scrawl send <bundle> --session ses_...
scrawl inspect <bundle>
scrawl zoom <bundle> --at 0:12
scrawl zoom <bundle> --at "a phrase you said"
scrawl frames <bundle> --from 0:02 --to 0:07
```
装了 skill 的 agent 会读 contact sheet 和转写，按口述指向打开关键帧，并用 `scrawl zoom` 或 `scrawl frames` 拉近查看。

6. 可选：把 dev site 的捕获自动送到 OpenCode session。前提是浏览器在前台、已授予 macOS 控制浏览器的权限，且目标项目有 OpenCode session。支持 Brave、Chrome、Arc、Edge、Vivaldi、Chromium、Safari。localhost 零配置时，Scrawl 用 `lsof` 找端口进程、工作目录和 git root，再送到仓库里最近活跃的 root session。也可在页面加 dev-only 注册脚本：
```html
<script src="http://127.0.0.1:47777/sdk.js" data-session="ses_…"></script>
```
或用 `data-directory="/abs/path/to/project"` 指向项目。非 loopback 页面还需 `data-token`。查看某 URL 会送到哪里：
```sh
scrawl route --url http://localhost:5173/
```
关闭自动发送：在 `~/.config/scrawl/config.json` 设 `"autoSend": false`，或设环境变量 `SCRAWL_NO_OPENCODE=1`。

7. 可选：iPhone 录制。插上解锁并信任的 iPhone，选择 iPhone；也可从终端：
```sh
scrawl record --iphone --duration 8
scrawl devices
```
iOS 应用内录制可用 ScrawlKit：把仓库加为 Swift package，给根视图加 `.scrawl()`，三指长按开始/结束，`Scrawl.event("Done tapped")` 可把应用事件写入时间线。

## 对应的研究问题
- 能力发现：README 给出了一个可照做的例子：agent 不只听文字描述，而是读取录屏、语音转写、标注关键帧和交互时间线，还能按时间点或口述短语放大查看。这扩展了可交给 AI 的工作：UI 问题复现、交互流程演示、dev site 问题说明、iPhone/iOS 应用场景。
- 任务匹配：最适合 GUI、视觉和交互密集、口头描述容易丢上下文的任务；README 明确支持 Claude Code、OpenCode、Codex 等 agent，并对 OpenCode 提供 session 路由和直接发送。不适合非 Apple silicon、macOS 26 以下，或纯文本、无需视觉上下文的任务。
- 条件供给：需要给足三类条件：权限（Screen & System Audio Recording、Microphone、Accessibility，iPhone 另需 Camera）、工具（Scrawl.app、`scrawl` CLI、agent skill）、上下文入口（bundle 里的 contact sheet、关键帧、summary、manifest；dev-site 自动发送还需要浏览器控制权限和 OpenCode session，非 loopback 页面需要 token）。反馈体现在 `summary.md`、`scrawl.json` 和 `scrawl route` 等可检查产物上。
- 主动推进：README 有事件触发和重试机制：捕获结束时若前台是 dev site 浏览器，会自动送到对应 OpenCode session；排队的 bundle 每 15 秒重试，退避到 30 分钟，持续一天；应用每天自动清理旧捕获。这些是捕获结束、发送失败等事件/状态触发的自动化，不是通用自主规划。
- 效果验证：README 提供了自动裁剪的评估工具和模拟捕获语料，用于评估裁剪覆盖、重叠、上下文、可读性和稳定性；但没有给出“减少澄清轮次”“缩短解决时间”等工作结果数据。工作效果需要自行做对照试用。

## 与已有做法的关系
- Claude Code（adopt）：README 明确 agent skill 支持 Claude Code，Scrawl 可作为给 Claude Code 补充视觉与操作上下文的捕获层。
- OpenCode（watch）：README 明确支持把捕获发送到 OpenCode session，包括 `scrawl send --session`、dev-site 自动路由和 iPhone 捕获投递。
- Cline（watch）、Cursor（watch）：README 只笼统说“other agents”，没有给出这两个工具的具体集成命令或验证过的流程；不能据此认定已适配。
- 清单中没有“屏幕标注 + agent bundle”这一形态的条目；Scrawl 与已有 agent 工具是互补关系，不是替代关系。

## 证据与局限
- 证据：README 给出了较完整的安装、权限、快捷键、CLI 命令、bundle 结构、自动裁剪逻辑、dev-site 路由、iPhone/ScrawlKit 用法和自动裁剪评估脚本；仓库显示 447 stars。这些足以支撑“可照做的小范围试用”。
- 局限：内容主要是项目自述，没有独立 benchmark、用户研究或工作结果数据；“减少口头描述和来回澄清”是作者主张，不是已证实的量化结论。硬件和系统门槛窄（Apple silicon、macOS 26+），权限配置有摩擦；dev-site 自动发送依赖浏览器控制权限和 OpenCode session；agent skill 依赖目标 agent 支持。自动裁剪的调参证据来自模拟捕获和手工标注的理想裁剪，评估的是裁剪质量，不是工作任务效果。
- 适用条件：有 Apple silicon Mac、macOS 26+、愿意配置屏幕/麦克风/辅助功能权限，且任务本身需要视觉或交互上下文。若任务可用几行文字说清，Scrawl 的录制和整理成本可能抵不过收益。

## 怎么试、怎么验证
最小试用：选 3–5 个“文字描述容易漏上下文”的任务，例如 UI bug 复现、交互流程评审、dev-site 问题说明、iPhone 应用操作演示。对同一任务、同一 agent/模型，先做文字描述基线，再用 Scrawl 录制并让 agent 通过 skill 读取 bundle；记录录制和标注耗时，避免只比较 agent 侧时间。

判断指标：澄清轮次、首次正确复现时间、任务解决时间、agent 误读次数、人工返工次数，以及 agent 是否实际打开了关键帧或使用了 `scrawl zoom`/`scrawl frames`。若这些指标没有稳定改善，或录制整理成本明显抵消收益，应把 verdict 降为 study/watch，而不是 adopt。

验证 bundle 是否完整：用 `scrawl inspect <bundle>` 检查 summary 和 manifest，用 `scrawl zoom`、`scrawl frames` 确认 agent 能取到口述所指的细节。若自动裁剪切得不好，可用 `scrawl autocrop <bundle|latest> --serve --open` 调参，或在 `~/.config/scrawl/config.json` 设 `{ "autocrop": false }` 或 `{ "autocrop": { "padding": 24, "minW": 480 } }`。
