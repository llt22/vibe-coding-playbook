# 给能执行 shell 的 agent 补上可控的读取能力

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在不一次性全量接入、不重写代码的前提下，给能执行 shell 的 agent 补上外部平台读取能力，并在读网页/PDF 时控制进入上下文的 token 与成本。
> 先试这一步：先跑 `agent-reach install --env=auto --dry-run` 看它会改什么，再默认安装并跑 `agent-reach doctor`；若你更关心单页/PDF 的 token 成本，另用 `fats <url> dry:true` 做一次预估。
> 最近修订：2026-10-22

## 解决什么问题

已有 agent（Claude Code、Cursor、Windsurf、OpenClaw 等）能执行 shell，但默认不知道该怎么读外部平台的内容，也容易把整页 HTML 或整份 PDF 直接塞进上下文。Agent-Reach 是一个 CLI 形式的「能力层」：它自己不实现抓取，负责选型、安装、体检、路由；真正的读取由 Agent 直接调用上游工具完成，没有包装层。fatsearch（命令 `fats`）则把单个 URL 或 PDF 抓取、清洗、生成大纲并缓存成 id，让 Agent 先拿大纲，需要细节时再按节读取或页内过滤，并记录每次抓取的 provider、耗时、成本和 token。这篇手册要解决的是：怎么以最小风险给 agent 补上这些读取能力，并在读网页/PDF 时控制进入上下文的 token 与成本；某个渠道失效时能定位、换路，而不是重写代码。

Agent-Reach 覆盖渠道：网页（Jina Reader）、YouTube 字幕+搜索（yt-dlp）、RSS/Atom（feedparser）、全网语义搜索（Exa，经 mcporter 以 MCP 接入）、GitHub（gh CLI）、Twitter/X、B站（bili-cli）、Reddit、Facebook、Instagram、小红书、LinkedIn、Boss直聘、V2EX、雪球、小宇宙播客转写（Whisper）。

关键设计：每个平台是一个有序后端列表（首选+备选），某个接入方式失效时只调整列表顺序，不重写代码；`agent-reach doctor` 告诉你每个平台当前实际在用哪个后端。默认只激活 6 个零配置渠道（网页、YouTube、RSS、GitHub、B站、V2EX），需要登录态的会先问你。

## 适用与不适用

适用：

- 你已有一个能执行 shell 的 agent。Claude Code、Cursor、Windsurf 不需要额外设置；OpenClaw 需要先开 exec 权限。
- 你想先用最小范围验证 Agent-Reach：`--dry-run` 预览、只用默认零配置渠道、固定用 `agent-reach doctor` 体检。
- 你有多个可替代渠道的需求，想在某个后端失效时只调整路由顺序而不重写代码。
- 你要读网页、YouTube 字幕、RSS、GitHub、B站、V2EX 等零配置渠道的内容。
- 你需要读网页或 PDF、且上下文预算敏感，愿意按 fatsearch 的「先大纲、按节读」流程小范围试用。
- 你需要绕过 JS 渲染页、captcha 或拦截页，并愿意自备 Oxylabs / Bright Data / Decodo 之一作为 provider。
- 你需要把 PDF 按页切节、引用某一页，或需要单次抓取的成本/token 可见。

不适用：

- agent 不能执行 shell。Agent-Reach 的 shell 是前提，OpenClaw 还要额外开 exec；fatsearch 也要先安装 CLI 并注册 MCP，至少要有能落地的安装环境。
- 你想一次性全量接入所有登录态渠道。原文的口径是默认只装零配置渠道，登录态渠道列菜单点名才装；且这些渠道存在平台反爬与封号风险，稳定性必须自己验证。
- 你想用它评测产出质量。Agent-Reach 的效果验证只到「渠道是否可用」这一层；fatsearch 给的是 token/成本可见性，效果数字全部来自作者自发布 benchmark，不能当第三方评测。
- 你想靠它做主动推进或定时触发。Agent-Reach 只在需求列表里提到「帮我订阅这几个 RSS 源，有更新告诉我」，实现侧只给了 feedparser 解析，没有给出定时轮询、事件触发或状态触发的配置；fatsearch 明确写「no daemon」，没有 watch、cron、回调、重试队列。
- 你打算从 PyPI 安装同名包。原文明确说那不是本项目。
- 你要读扫描版 PDF（OCR，fatsearch 返回 `! no_text`）、DOCX/XLSX（fatsearch 返回 `! not_in_v1 zip`）、登录墙后的页面，或需要语义近似/主题匹配（`match:near`/`match:topic` 需本地模型）。
- 你要求必须通读全文才能下结论：fatsearch 默认只给大纲、按节读；作者没有讨论这种任务是否会被大纲机制削掉信息，这是试用时要专门验的点。

## 前置条件

**Agent-Reach**

- Agent 能执行 shell。除 OpenClaw 外，其他平台（Claude Code、Cursor、Windsurf）不需要额外设置。
- OpenClaw 用户必须先开 exec 权限，否则 Agent 无法执行 `pip install`、`mcporter`、`twitter` 等命令：

```bash
openclaw config set tools.profile "coding"
```

或在 `~/.openclaw/openclaw.json` 中设置：

```json
{ "tools": { "profile": "coding" } }
```

设置后重启并开新对话：

```bash
openclaw gateway restart
```

- 系统基建：Node.js、gh CLI、mcporter。安装过程会检查并给出缺失项的安装方式；yt-dlp、feedparser 随 CLI 自带。
- 登录态渠道额外需要：OpenCLI（桌面）或 Cookie（由 Cookie-Editor 手工导出）等。
- 凭据只存本机 `~/.agent-reach/config.yaml`，文件权限 600，不上传不外传。
- 不要从 PyPI 安装同名包，那不是本项目。

**fatsearch**

- macOS/Linux 或 Windows；有 Homebrew / npm / cargo 之一，或能跑安装脚本；不需要账号。
- provider key 可选；只装免费通道时，遇到 JS 页面、captcha 或拦截页就抓不到内容，网页搜索也用不了。
- 代理侧需要能注册 MCP；可选装 Agent Skill 让代理知道「先大纲、按节读」。
- 没有账号体系，没有 daemon、没有浏览器内核；二进制 17–21 MB。

## 操作步骤

先做做法 A；需要精读网页/PDF 且 token 敏感时试做法 B；需要登录态渠道再进做法 C。三者可并存，不要求按顺序全做。

### 做法 A：最小可行试用 Agent-Reach

1. 预览安装会做什么。前提：已完成 Agent-Reach 前置条件。预期结果：只读检查并列出缺失项，不实际修改系统。

```bash
agent-reach install --env=auto --dry-run
```

2. 执行默认安全检查安装。前提：看过预览，接受只读检查范围。预期结果：只激活默认 6 个零配置渠道（网页、YouTube、RSS、GitHub、B站、V2EX）；需要登录态的渠道会先问你。原文同时给出兼容安全参数 `--safe`，与默认行为相同。

```bash
agent-reach install --env=auto
```

也可以直接把这句话复制给 Agent 安装：

```
帮我安全检查并安装 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
```

如果你明确允许修改当前机器，加 `--system`：

```bash
agent-reach install --env=auto --system
```

原文说明了 Agent 安装时会依次做 6 件事：从仓库安装 `agent-reach` CLI（自带 yt-dlp、feedparser，注意不要从 PyPI 安装同名包）；检查系统基建 Node.js、gh CLI、mcporter 并给出缺失项的安装方式；按授权安装与配置，仅在显式传入 `--system` 时才安装依赖并通过 MCP 接入 Exa；检测环境，判断本地电脑还是服务器，给对应配置建议；按授权注册 SKILL.md，仅在显式 `--system` 时写入 Agent 的 skills 目录，默认只检查不改文件；问你要不要更多，默认只激活 6 个零配置渠道，登录态渠道列菜单点名才装。

3. 体检。前提：安装已完成。预期结果：一条命令给出每个渠道的状态、当前走哪条路、坏掉的给出修复处方。

```bash
agent-reach doctor
```

4. 装好即用，不用记命令。前提：SKILL.md 已按原文注册或安装就绪。预期结果：Agent 读了 SKILL.md 后自己知道调什么命令。原文给的使用示例：

- 「帮我看看这个链接」→ `curl https://r.jina.ai/URL` 读任意网页
- 「这个 GitHub 仓库是做什么的」→ `gh repo view owner/repo`
- 「这个 YouTube 视频讲了什么」→ `yt-dlp` 提取字幕
- 「B站搜一下 AI 教程」→ `bili search`（无需登录）
- 「全网搜一下 LLM 框架对比」→ Exa 语义搜索
- 「订阅这个 RSS」→ `feedparser` 解析

### 做法 B：上下文预算敏感时，用 fatsearch 按大纲/分节读网页或 PDF

前提：macOS/Linux 或 Windows；有 Homebrew / npm / cargo 之一，或能跑安装脚本；不需要账号。provider key 可选，但只装免费通道时，遇到 JS 页面、captcha 或拦截页抓不到内容，网页搜索也用不了。

1. 安装 CLI。任选其一。预期结果：得到 `fats` 命令；包名是 `fatsearch`，命令是 `fats`。Homebrew、npm 和安装脚本会额外加一个 `fatsearch` 别名；`cargo install` 只加 `fats`。

```sh
brew install fatsearch/tap/fatsearch
```

```sh
curl -fsSL https://fatsearch.com/install.sh | sh
```

```sh
npm i -g fatsearch        # Windows 走这条
```

```sh
cargo install --locked fatsearch
```

2. （可选）配置 provider key。前提：你愿意用付费 provider 读 JS 页面、captcha 或拦截页，或要用网页搜索。预期结果：key 写入 key 目录下的 `auth.json`（权限 0600），只发给对应 provider；`auth.json` 是唯一 key 来源，`fats` 不会使用环境变量里的 key；替换 key 时旧文件保留为 `auth.json.bak`（0600）；表单拒绝来自其他源的 POST。

在终端里自己操作：

```sh
fats setup
```

它会打开一个菜单（↑↓ Enter，即上下方向键加回车）：免费抓取、各 provider 及其状态、Settings（agent 连接、缓存、统计、遥测）。选一个 provider，粘贴 key（显示为 `•` 和计数），`fats` 会实时校验后再保存。也可直接跳转：

```sh
fats setup oxy       # 也可 bd / decodo / gh
```

通过代理配置（key 不进入对话）：让代理执行 `fats setup oxy`（或 `bd` / `decodo` / `gh`）。它会打印 provider 控制台链接和一个位于 `127.0.0.1` 的一次性表单 URL，有效期 10 分钟；你在浏览器里粘贴 key，而不是粘进聊天。README 给出的代理侧话术原文：

```console
$ fats setup decodo
= setup decodo · waiting for the key at http://127.0.0.1:59802/k/e0c8baba7a5b058947f4fdab97dabb05/decodo · 10 min · $0
tell the user (never ask for the key in chat):
1. open https://dashboard.decodo.com/web-data/playground  (no account yet: https://dashboard.decodo.com/register)
2. Copy the API key shown on the Web Data playground. Do NOT paste it in this chat.
3. open http://127.0.0.1:59802/k/e0c8baba7a5b058947f4fdab97dabb05/decodo , paste the key, press Save
then: fats setup   (when the user says done; end your turn, do not poll · checks it, $0)
browser not on this machine (SSH)? the user runs fats setup decodo in a terminal there and pastes the key
```

没有浏览器的机器（CI / SSH）：把 key 通过管道输入。

```sh
printf %s "$KEY" | fats setup oxy
```

环境里已导出 key：导入一次；它只补「尚未保存」的位置，不覆盖已保存的 key。

```sh
fats setup import-env
```

临时停用某 provider 而不丢 key：

```sh
fats setup oxy off
fats setup oxy on
```

完全关掉免费通道（所有页面都走 provider，每页都花钱）：

```sh
fats setup free off
```

3. 接入代理（MCP）。预期结果：代理侧出现一个 MCP server `fats`，只暴露一个工具 `fats(cmd)`，工具卡约 60 token，一个字符串参数。MCP Registry 标识：`mcp-name: io.github.fatsearch/fats`。

```sh
claude mcp add --scope user fats -- fats mcp                      # Claude Code
codex mcp add fats -- fats mcp                                    # Codex
{"mcpServers": {"fats": {"command": "fats", "args": ["mcp"]}}}   # Cursor, Desktop, …
```

4. 给代理装入技能说明（推荐，让代理知道「怎么读而不淹上下文」）。预期结果：代理知道先拿大纲、按节读。没有上述 CLI 的代理，读取固定到某个 release 的原文（可审阅、不来自网站运行）：

```sh
npx skills add fatsearch/fatsearch        # Agent Skills standard: Claude Code, Codex, Cursor, Copilot, Gemini CLI, …
gh skill install fatsearch/fatsearch      # the same through GitHub CLI ≥ 2.90
```

```
https://raw.githubusercontent.com/fatsearch/fatsearch/v0.2.3/skills/fatsearch/SKILL.md
```

给代理看的纯 Markdown 文档：`https://fatsearch.com/llms.txt`。

5. 日常读取：先大纲，再按节/过滤。前提：CLI 已安装，代理已能调用 `fats`。预期结果：第一次抓取缓存为 `u1`，之后用 id 反复寻址，不重复把整页塞进上下文。

```sh
fats <url>              # 抓取 → 清洗 → 大纲，缓存为 u1
fats u1#3               # 读第 3 节
fats u1 price           # 页内过滤
fats u1 links           # 编号链接
fats l4                 # 跟随第 4 个链接
fats rust async runtime # 网页搜索（需 Oxylabs 或 Bright Data key）
fats gh rust markdown   # GitHub 仓库按 star 搜
fats ./report.pdf       # 本地文件，每页一节
fats stats              # 每次抓取：provider、毫秒、成本、token
```

先估算再执行（在每个命令后加修饰符）：

```sh
fats https://www.nytimes.com/ dry:true
```

输出示例（原文）：

```console
$ fats https://www.nytimes.com/ dry:true
nytimes.com/ fetch plain → oxy (after a captcha) → bd ∥ oxyjs after 5s → new u1 · up to $0.0040

$ fats stats
u1 rust-lang.org · Rust Programming Language · plain 230ms $0.0000 · 1.2ktok
u2 en.wikipedia.org · Rust (programming language… · plain 558ms $0.0000 · 40.9ktok
```

其他修饰符：`limit:20` `country:de` `js:true` `wait:30` `fresh:true`（`fresh:true` 用于绕过缓存取新内容）。全部命令一屏看：`fats help`；用法建议：`fats guide`。

6. 按需关闭遥测。前提：团队要求关闭。预期结果：遥测不上传 URL、搜索词、页面文本、文件、API key、IP 或任何 id，只上传版本、OS、包来源、命令名、错误、provider 可用性、自身崩溃；三种关闭方式任选。先看清到底发了什么：`fats telemetry show`。

```sh
fats setup telemetry off
```

```sh
FATS_TELEMETRY=0
```

```sh
DO_NOT_TRACK=1
```

7. 用边界样本验证。前提：你准备把 fatsearch 用于真实任务。预期结果：拿扫描版 PDF、DOCX、登录墙页面各试一次，看到 `! no_text`、`! not_in_v1 zip` 或读不到内容，就能判断它是否适合你的任务；不要假设它能读所有文档。

### 做法 C：按需解锁需要登录态的渠道

不用查文档，直接对 Agent 说「帮我配 XXX」。原文给出的口径：

- **GitHub**：告诉 Agent「帮我登录 GitHub」→ 解锁私有仓库、提 Issue/PR、Fork。
- **Twitter/X**：Cookie 必须由用户通过 Cookie-Editor 手工导出；保存后仅供 `agent-reach doctor` 检查配置是否齐全，直接运行上游 `twitter` 命令前，仍需在当前进程环境中显式设置 `TWITTER_AUTH_TOKEN` 和 `TWITTER_CT0`。
- **B站**：搜索+视频详情用 bili-cli（无需登录）；字幕需 OpenCLI。
- **Reddit**：没有零配置路径（匿名接口已被封），桌面装 OpenCLI 用浏览器登录态，或 rdt-cli + Cookie。
- **Facebook / Instagram**：桌面装 OpenCLI，复用 Chrome 登录态。
- **小红书**：OpenCLI 只用用户已有 Chrome 会话；MCP/存量工具用 Cookie-Editor 导出后配置 xiaohongshu-mcp / 存量工具。`agent-reach configure xhs-cookies` 不会把 Cookie 注入 OpenCLI / Chrome。
- **LinkedIn / Boss直聘 / 雪球 / 小宇宙播客**：告诉 Agent「帮我配 XXX」；Boss直聘由 Agent 打开专用 Chrome，你手动登录。

安全约束（照抄执行）：

- 凭据只存本机 `~/.agent-reach/config.yaml`，文件权限 600，不上传不外传。
- 用 Cookie 登录的平台（Twitter、小红书等）务必用专用小号，作者明确提示存在被平台检测并封号的风险，主账号不要用。
- 本地电脑不需要代理；代理只有部署在服务器上才需要（~$1/月）。

### 维护：更新与卸载 Agent-Reach

更新：

```
帮我更新 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/update.md
```

卸载：

```bash
agent-reach uninstall
agent-reach uninstall --dry-run        # 只预览，不实际删除
agent-reach uninstall --keep-config    # 只删 skill 文件，保留 token 配置
pip uninstall agent-reach              # 卸载 Python 包本身
```

`agent-reach uninstall` 会清除 `~/.agent-reach/`（含所有 token/cookie）、各 Agent 的 skill 文件、mcporter 中的 MCP 配置。

## 怎么判断变好了

- 渠道可用性：`agent-reach doctor` 一条命令给出每个渠道的状态、当前实际用哪个后端、坏掉的修复处方。这是 Agent-Reach 原文唯一给出的效果验证层，能看到哪个通、哪个不通、怎么修。
- 改动可控性：`--dry-run` 能先看到会做什么再决定是否执行；`--system` 是否使用由你显式决定，默认只检查不改文件、不写 skills 目录。
- 默认范围：安装后默认只激活 6 个零配置渠道（网页、YouTube、RSS、GitHub、B站、V2EX），没有在你点名之前装登录态渠道。
- 跑通示例任务：用原文给的 6 个示例（读链接、读 GitHub 仓库、读 YouTube 字幕、B站搜索、Exa 全网搜索、RSS 解析）各试一次，看 Agent 是否知道自己该调什么命令。
- fatsearch 的 token/成本可见性：`fats stats` 逐次列出 provider、毫秒、成本、token；`dry:true` 在执行前预估花费。用你自己的真实页面/PDF 做小范围试用，先看 `fats stats` 和 `dry:true` 的数字，再决定是否推广。
- fatsearch 的缺失能力是否显式：缺失能力以 `!` 行说明「缺什么、该怎么办」，且「Never silence」（从不静默）。
- 不要用作者 benchmark 直接 adopt：fatsearch 的效果数字全部来自作者自发布 benchmark，项目 48 stars、v0.2.x 早期；报告建议小范围试用。

最小试用方式：Agent-Reach 先 `agent-reach install --env=auto --dry-run` 预览 → 默认安装 → `agent-reach doctor` → 挑 1～2 个零配置渠道的示例任务跑通；fatsearch 先安装 CLI → 注册 MCP → 用 `dry:true` 和 `fats stats` 量几个真实网页/PDF 的 token 与成本。试多久：两份材料都没有给出时长；Agent-Reach 的稳定性需要你自己验证，作者自述渠道频繁换代；fatsearch 也不足以直接 adopt，先用 `fats stats` 和 `dry:true` 自己量。

## 常见坑

- 从 PyPI 安装同名包不是本项目。原文明确提示不要这么做。
- 以为 `agent-reach configure xhs-cookies` 能配好 OpenCLI / Chrome：它不会把 Cookie 注入 OpenCLI / Chrome。
- Twitter Cookie 保存后不等于可以直接跑上游命令：`agent-reach doctor` 只是检查配置是否齐全；直接运行上游 `twitter` 命令前，仍需在当前进程环境中显式设置 `TWITTER_AUTH_TOKEN` 和 `TWITTER_CT0`。
- Reddit 没有零配置路径，匿名接口已被封，只剩登录态路线。
- 用 Cookie 登录的平台（Twitter、小红书等）用主账号有被平台检测并封号的风险，务必用专用小号。
- 本地电脑不需要代理；只有把方案部署到服务器上才需要（原文提到 ~$1/月）。
- 默认只激活 6 个零配置渠道；登录态渠道要你点名才装。不要指望一次全量。
- `--system` 才会安装系统依赖、通过 MCP 接入 Exa、把 SKILL.md 写入 Agent 的 skills 目录；默认只检查不改文件。
- yt-dlp 仍适合 YouTube，但作者自述 2026-06 已被 B站风控 412 封死，所以 B站改用 bili-cli；这类渠道换代需要自己盯。
- Agent-Reach 的验证只到渠道是否可用，没有产出质量指标；`agent-reach doctor` 不评价内容摘要或搜索结果是否切题。
- RSS 只给了 feedparser 解析，没有定时轮询、事件触发或状态触发配置，不能当「有更新就通知我」的完整方案。
- fatsearch 的包名是 `fatsearch`，命令是 `fats`；Homebrew、npm 和安装脚本会加 `fatsearch` 别名，`cargo install` 只加 `fats`。
- fatsearch 不配 provider key 也能用免费通道，但遇到 JS 页面、captcha 或拦截页会抓不到内容，网页搜索也用不了；不要把它当万能抓取器。
- provider key 不要粘进聊天：走 `fats setup` 的一次性表单、管道或 `fats setup import-env`；`auth.json` 是唯一 key 来源，`fats` 不会使用环境变量里的 key。
- `fats setup free off` 会关掉免费通道，所有页面都走 provider，每页都花钱；只想临时停用某个 provider 用 `fats setup oxy off` / `on`。
- fatsearch 没有 daemon，没有 watch、cron、回调、重试队列；不要用它做定时订阅或主动推进。
- fatsearch 读扫描版 PDF 会返回 `! no_text`（OCR），DOCX/XLSX 在 v1 返回 `! not_in_v1 zip`，登录墙后的页面也读不到；需要语义近似/主题匹配时 `match:near`/`match:topic` 需本地模型。
- fatsearch 默认只给大纲、按节读；作者没有讨论「必须通读全文才能下结论」的任务是否会被大纲机制削掉信息，试用时要专门验。
- fatsearch 效果数字全部来自作者自发布 benchmark，项目 48 stars、v0.2.x 早期；不要因为示例里的 token/成本数字好看就直接全量推广。

## 证据与来源

- Agent-Reach 做法 A、做法 C、维护步骤和大部分坑：Panniantong/Agent-Reach 调研报告。安装提示词、`install --env=auto` / `--dry-run` / `--safe` / `--system`、`doctor`、`uninstall` / `--dry-run` / `--keep-config`、OpenClaw 的 `tools.profile = "coding"` 与 `openclaw gateway restart`、各平台登录态口径，均来自该报告原文，属作者自述，没有第三方核验。
- Agent-Reach 仓库指标：88,184 stars、当日 +683（来自输入 metrics，非 README 正文）。
- Agent-Reach 渠道状态数据：yt-dlp 154K Star，YouTube 仍是最佳，但不再用于 B站；作者自述 2026-06 yt-dlp 被 B站风控 412 封死，已切换 bili-cli，用户零操作。这些均为作者自述。
- Agent-Reach 效果验证：仅到渠道是否可用这一层；原文没有产出质量指标或评测方法。主动推进证据较弱：原文只在需求列表里提到 RSS 更新通知，实现侧只给了 feedparser 解析，没有可照做的触发机制。
- Agent-Reach 与已有做法的关系：Jina Reader 是 Agent-Reach 中读网页渠道的首选后端；Agent-Reach 通过注册 SKILL.md 落地 Agent skills 机制；报告建议把 Agent-Reach 的状态从 study 上调为 try。
- fatsearch 做法 B：fatsearch/fatsearch 调研报告。安装命令、MCP 注册、`fats setup` 的安全设计、`dry:true` / `fats stats`、遥测开关、能力边界，均来自该报告与 README 原文；属作者自述，没有第三方核验。
- fatsearch 项目状态：48 stars、v0.2.x 早期项目；效果数字全部来自作者自发布 benchmark，不足以直接 adopt。报告建议把它装成 Claude Code 的 MCP 工具，在「代理需要读网页或 PDF、但上下文预算敏感」的场景里小范围试用，先用 `fats stats` 和 `dry:true` 自己量 token 与成本，再决定是否推广。
- fatsearch 的其他数据：MCP 只暴露一个工具 `fats(cmd)`，工具卡约 60 token，一个字符串参数；没有账号体系，无 daemon、无浏览器内核；二进制 17–21 MB；免费抓取每个站点每秒最多发起一次请求；示例 `dry:true` 预估 up to $0.0040；`fats stats` 示例列出 1.2ktok、40.9ktok 等 token 数。这些均来自报告/README，属作者自述。
- 两者关系：Agent-Reach 负责多渠道选型、安装、体检、路由；fatsearch 负责单页/PDF 的「先大纲、按节读」与成本可见。给出的材料没有提供二者集成的命令，本手册只把它们并列为可选做法；这是依据材料做的编排，不是原文集成说明。

## 依据的调研

- [Panniantong/Agent-Reach](../research/radar/2026-10-03/852-panniantong-agent-reach.md)：值得一试，把它作为「给 Agent 补互联网读取能力」的最小可行方案小范围试用：先 --dry-run，再只用默认零配置渠道，并固定用 `agent-reach doctor` 做体检。理由是原文给出了可照抄的安装/体检/更新/卸载流程和「首选+备选多后端路由」的可复用设计，但各渠道依赖平台反爬与登录态、作者自述频繁换代，稳定性必须自己验证，不宜直接全量采纳。
- [fatsearch/fatsearch](../research/radar/2026-10-22/5707-fatsearch-fatsearch.md)：值得一试，把 fatsearch 装成 Claude Code 的 MCP 工具，在“代理需要读网页或 PDF、但上下文预算敏感”的场景里小范围试用，先用 `fats stats` 和 `dry:true` 自己量 token 与成本，再决定是否推广。因为它给出可直接照抄的安装、MCP 注册和“先看大纲、按节读取”的操作流程，但效果数字全部来自作者自published benchmark，48 stars 的早期项目（v0.2.x），还不足以直接 adopt。
