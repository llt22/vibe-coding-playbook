# 让编码 agent 能读网页/PDF 并操作浏览器，失效时能换路

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎么以最小风险给 agent 补上网页、PDF、JS 渲染页和登录态渠道的读取/操作能力，并在读网页/PDF 时控制进入上下文的 token 与成本，某个渠道失效时能定位、换路，而不是重写代码。
> 先试这一步：先做做法 A：用 `agent-reach install --env=auto --dry-run` 预览，再默认安装并跑 `agent-reach doctor`，只启用零配置渠道。
> 最近修订：2026-11-06

## 解决什么问题

已有 agent 能执行 shell，但默认不知道如何读外部平台的内容，也容易把整页 HTML 或整份 PDF 直接塞进上下文；遇到 JS 渲染页、需要点击/填表/复用 Cookie 的页面时，又缺少一个可脚本化、可给 MCP 调用的浏览器。Agent-Reach 是一个 CLI 形式的“能力层”：它自己不实现抓取，负责选型、安装、体检、路由；真正的读取由 Agent 直接调用上游工具完成，没有包装层。fatsearch（命令 `fats`）把单个 URL 或 PDF 抓取、清洗、生成大纲并缓存成 id，让 Agent 先拿大纲，需要细节时再按节读取或页内过滤，并记录每次抓取的 provider、耗时、成本和 token。Lightpanda 是一个从零写的无头浏览器（Zig 实现，非 Chromium/WebKit 分支），定位为“给 AI agent 和自动化用的浏览器”；它提供 `fetch --dump`、CDP/MCP 服务和 `agent` 原生模式，用自然语言跑通后可导出 PandaScript 回放。BrowserAct 是面向 AI agent 的浏览器自动化 CLI/Skill，提供云端托管执行与本地浏览器控制，强调真实浏览器操作、受保护页面抽取、登录态复用、多账号隔离、并发会话和人工接管。agent-browser 是一个用 Rust 写的原生 CLI，用 `snapshot` 把当前页面转成带 ref 的紧凑文本，agent 对 ref 执行动作后重新读页面确认结果；每条命令发给首次调用时启动的后台 daemon，daemon 通过 Chrome DevTools Protocol 控制浏览器，浏览器在命令之间保持打开。这篇手册要解决的是：怎么以最小风险给 agent 补上网页、PDF、JS 页面和登录态渠道的读取/操作能力，并在读网页/PDF 时控制进入上下文的 token 与成本；某个渠道失效时能定位、换路，而不是重写代码。

Agent-Reach 覆盖渠道：网页（Jina Reader）、YouTube 字幕+搜索（yt-dlp）、RSS/Atom（feedparser）、全网语义搜索（Exa，经 mcporter 以 MCP 接入）、GitHub（gh CLI）、Twitter/X、B站（bili-cli）、Reddit、Facebook、Instagram、小红书、LinkedIn、Boss直聘、V2EX、雪球、小宇宙播客转写（Whisper）。

关键设计：每个平台是一个有序后端列表（首选+备选），某个接入方式失效时只调整列表顺序，不重写代码；`agent-reach doctor` 告诉你每个平台当前实际在用哪个后端。默认只激活 6 个零配置渠道（网页、YouTube、RSS、GitHub、B站、V2EX），需要登录态的会先问你。

另有一条试验性做法：用 Microsoft Playwright CLI 及其 skills 把浏览器自动化作为“技能”供给 Claude Code，让 agent 用自然语言驱动浏览器抓公开页面，再与手写脚本做对照。来源只有一条推文、原文在第二步被截断，没有成功率与失败案例，所以本手册只把它列为“做法 E（试验性）”，不进入默认链路。

还有两条试用性做法：BrowserAct（做法 F）依据 README 可小范围验证浏览器执行层；agent-browser（做法 G）依据 README 可小范围验证“snapshot→动作→复查”的浏览器操作循环。两者都没有成功率、耗时或对照数据，默认不进入生产链路。

## 适用与不适用

适用：

- 你已有能执行 shell 的 agent。Claude Code、Cursor、Windsurf 不需要额外设置；OpenClaw 需要先开 exec 权限。
- 你想先用最小范围验证 Agent-Reach：`--dry-run` 预览、只用默认零配置渠道、固定用 `agent-reach doctor` 体检。
- 你有多个可替代渠道的需求，想在某个后端失效时只调整路由顺序而不重写代码。
- 你要读网页、YouTube 字幕、RSS、GitHub、B站、V2EX 等零配置渠道的内容。
- 你需要读网页或 PDF、且上下文预算敏感，愿意按 fatsearch 的“先大纲、按节读”流程小范围试用。
- 你需要绕过 JS 渲染页、captcha 或拦截页，并愿意自备 Oxylabs / Bright Data / Decodo 之一作为 provider。
- 你需要把 PDF 按页切节、引用某一页，或需要单次抓取的成本/token 可见。
- 你需要 JS 渲染、点击、表单输入、Cookie、自定义 Header、代理、网络拦截或 adblocker，并想用比 headless Chrome 更轻的浏览器跑自动化。
- 你想把单个页面直接转成 Markdown/HTML/PNG/PDF/结构化数据，喂给模型或存档。
- 你已有 Puppeteer/Playwright 脚本，想通过 CDP 换一个浏览器引擎；或想让 MCP 客户端直接拿到一个浏览器工具。
- 你想先用自然语言把网页任务跑通，再固化成不消耗 token 的 PandaScript 回放。
- 你想验证“把浏览器自动化作为技能交给编码 agent”是否能省掉写爬虫：在 Node.js 20+ 环境装 Playwright CLI 并执行 `playwright-cli install --skills`，用自然语言驱动 Claude Code 抓公开页面，再与手写脚本做对照。这是试验性做法，不是已验证流程。
- 你想给 Claude Code、Cursor、OpenCode、OpenClaw、Codex、Gemini CLI 等可执行 shell 且能加载 Skill 的 agent 增加真实浏览器执行层，并愿意小范围试用 BrowserAct。
- 你需要复用本地 Chrome 登录态、无登录隐私批处理、固定身份多账号、跨浏览器/同浏览器多 session 并发隔离、CAPTCHA 处理、人工接管、重复网站生成 Skill。
- 你能接受 BrowserAct 账号登录（stealth-extract、remote-assist 等登录后免费；代理和超过 5 个 stealth browser 需付费），并愿意逐次批准浏览器创建/删除、Profile 导入、代理变更等敏感操作。
- 你想用“一次一条命令、每步后复查”的方式让 agent 操作浏览器；想把页面以 accessibility tree 的紧凑文本喂给模型，而不是整页 HTML；想用 `snapshot -i` 的 ref 做动作，并在导航/DOM 变化后重新 snapshot。
- 你想让 agent 通过 CLI 或 MCP 接入浏览器；需要按 `--session` 隔离浏览器实例与登录态；需要在 Chrome for Testing、现有 Chrome（`--cdp`/`--auto-connect`）、Lightpanda/Obscura 引擎、iOS 模拟器 Mobile Safari 或 Browserbase/Browserless/Browser Use/Kernel/AgentCore 等云浏览器之间切换。
- 你想把 discovery skill 装进 agent harness（`npx skills add vercel-labs/agent-browser` 或 AGENTS.md 指令），让技能随 CLI 版本同步；能接受 Vercel Labs 实验产品、接口可能变，并愿意先小范围试。

不适用：

- agent 不能执行 shell。Agent-Reach 的 shell 是前提，OpenClaw 还要额外开 exec；fatsearch 也要先安装 CLI 并注册 MCP，至少要有能落地的安装环境。
- 你想一次性全量接入所有登录态渠道。原文的口径是默认只装零配置渠道，登录态渠道列菜单点名才装；且这些渠道存在平台反爬与封号风险，稳定性必须自己验证。
- 你想用它评测产出质量。Agent-Reach 的效果验证只到“渠道是否可用”这一层；fatsearch 给的是 token/成本可见性，效果数字全部来自作者自发布 benchmark，不能当第三方评测；Lightpanda 的基准也是作者自测；agent-browser 只有 star 关注度指标。
- 你想靠它做主动推进或定时触发。Agent-Reach 只在需求列表里提到“帮我订阅这几个 RSS 源，有更新告诉我”，实现侧只给了 feedparser 解析，没有给出定时轮询、事件触发或状态触发的配置；fatsearch 明确写“no daemon”，没有 watch、cron、回调、重试队列；BrowserAct 材料和 agent-browser README 都没有时间/事件/状态触发机制。
- 你打算从 PyPI 安装同名包。原文明确说那不是本项目。
- 你要读扫描版 PDF（OCR，fatsearch 返回 `! no_text`）、DOCX/XLSX（fatsearch 返回 `! not_in_v1 zip`）、登录墙后的页面，或需要语义近似/主题匹配（`match:near`/`match:topic` 需本地模型）。
- 你要求必须通读全文才能下结论：fatsearch 默认只给大纲、按节读；作者没有讨论这种任务是否会被大纲机制削掉信息，这是试用时要专门验的点。
- 你要求稳定发行版而非 nightly：Lightpanda 目前只有 nightly 构建，不适合作为唯一生产依赖；agent-browser 是 Vercel Labs 实验产品，接口可能变。
- 你在 Windows 上想要原生 Lightpanda 二进制，或在 Alpine/musl、Android/Termux 上直接跑：Windows 走 WSL2；Linux 二进制链接 glibc，Alpine 等 musl 系统会报 `cannot execute: required file not found`，需换 Debian/Ubuntu 基础镜像或源码编译；Android/Termux 不可用。
- 你要求 Lightpanda 在所有站点上都与 Chrome 行为一致：结论提示 Lightpanda 无渲染引擎，兼容性必须在自家目标站点上验证；不要因为内存/速度数字好看就直接替换现有 Chrome + Playwright。
- 你要求一条已验证、可复现的浏览器自动化标准流程：Playwright CLI 这条只有一条推文，原文第二步被截断，没有提示词、使用示例、成功率或失败案例；只能作为试验，不能写进生产链路。
- 你没有可执行 shell 且能加载 Skill 的 agent，或机器不能联网安装 BrowserAct Skill。
- 你想直接全量采用 BrowserAct 的 stealth 反封锁、CAPTCHA 处理或多账号操作：README 没有成功率、准确率、延迟、成本或对比实验数据，核心 stealth 功能需登录，代理和超过 5 个 stealth browser 需付费，合规边界也未展开。
- 你未获授权抓取受保护页面、处理 CAPTCHA 或做多账号操作：这些可能涉及目标网站条款和合规风险。
- 你需要 agent-browser 的时间/事件/状态触发或调度器：README 没有提到调度能力；默认 daemon 在 1 小时无命令后关闭 headless 浏览器并退出。
- 你要求用 README 直接配置 agent-browser 的 auth vault、域名允许列表、动作策略、内容边界：README 只给链接，具体字段与默认值在 agent-browser.dev/security，本次材料未包含。
- 你不想首次安装浏览器/联网，或从源码构建但环境不满足 Node.js 24+、pnpm 11+、Rust。
- 你想把 agent-browser 的“快照紧凑因而更适合 agent”“daemon + 每条命令一次短调用更好用”当已验证结论：这是作者主张，没有基准测试、任务成功率或对照实验。

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
- 代理侧需要能注册 MCP；可选装 Agent Skill 让代理知道“先大纲、按节读”。
- 没有账号体系，没有 daemon、没有浏览器内核；二进制 17–21 MB。

**Lightpanda**

- Linux x86_64 / macOS（或 WSL2）。Windows 无原生二进制，走 WSL2；Android/Termux 不可用；Linux 二进制链接 glibc，在 Alpine 等 musl 系统上会报 `cannot execute: required file not found`，需换 `FROM debian:bookworm-slim` / `FROM ubuntu:24.04` 这类基础镜像，或从源码编译。
- 安装方式：Homebrew（nightly）、Arch AUR、Linux x86_64 二进制、Nix；也可用 Docker 起 CDP 服务。
- `agent` 模式需要任一模型供应商 API key 或本地模型；`--no-llm` 可进基础 REPL。CDP/MCP 路线不要求先跑自然语言 agent。
- 默认会上报使用遥测，需要关闭时设 `LIGHTPANDA_DISABLE_TELEMETRY=true`；不想要 core dump 时设 `LIGHTPANDA_DISABLE_CORE_DUMP`。
- 抓取第三方站点时注意合规，示例命令带 `--obey-robots`。

**Playwright CLI（做法 E，试验性）**

- Node.js 20 及以上（原文明确要求）；用 `node -v` 确认输出为 v20 或更高。
- 能运行 Claude Code 的环境；全局安装 `@playwright/cli` 需要 npm 权限。
- 目标站点允许抓取（遵守 robots.txt 与站点条款）；需要登录态的站点要另行提供凭据与授权。
- 原文未说明是否还需额外安装浏览器内核，需用 `playwright-cli --help` 确认。
- 原文在 `playwright-cli install --skills` 处被截断，后续步骤、执行目录要求均未给出，不能当作已验证流程。

**BrowserAct（做法 F，试用性）**

- agent 能执行 shell 命令并加载 Skills，机器可联网；README 声明兼容 Windows/macOS/Linux，并适配 Claude Code、Cursor、VS Code、OpenCode、OpenClaw、Codex、Gemini CLI 等可执行 shell 且能加载 Skill 的 agent。
- 安装 Skill 的提示词见操作步骤；更细的安装说明在 docs/installation.md，但本次材料未包含该文档内容。
- 本地登录态场景需要 Chrome profile 或 CDP attach；无登录批处理用 stealth 隐私模式；登录账号多开用 stealth 固定身份。
- stealth 相关能力需要 BrowserAct 登录；代理和超过 5 个 stealth browser 需要付费。`stealth-extract`、`remote-assist` 属于登录后免费功能。
- 浏览器创建/删除、Profile 导入、代理变更、安全与隐私开关等敏感操作需要用户显式批准，且此前的批准不会延续。
- 只对已获授权的页面使用；CAPTCHA 处理、代理轮换、多账号操作可能涉及目标网站条款和合规风险。

**agent-browser（做法 G，试用性）**

- 本机有 Node/npm 环境；首次需要联网下载浏览器（默认 Chrome for Testing）。安装 `npm install -g agent-browser` 后执行 `agent-browser install`；Homebrew 用 `brew install agent-browser` 后再 `agent-browser install`；Linux 用 `agent-browser install --with-deps` 一并装系统库；不想装可用 `npx agent-browser open example.com`。
- 执行者（人或 agent）有 shell 命令权限。
- agent harness 支持 skill 机制，或你能改它的 AGENTS.md；否则只能手工按命令循环跑。
- 平台支持：macOS ARM64/x64、Linux ARM64/x64 glibc 与 musl、Windows x64；Apache-2.0。
- 从源码构建要求 Node.js 24+、pnpm 11+、Rust。
- 安全相关（auth vault、domain allowlists、action policies、content boundaries）README 只给链接，具体字段与默认值在 agent-browser.dev/security，本次材料未包含；使用前另读。
- 需要保留登录态或多任务并发时，按 `--session` 隔离；默认 daemon 在 1 小时无命令后关闭 headless 浏览器并退出，配置 session persistence 时会先保存状态。
- Vercel Labs 实验产品，接口可能变；README 没有效果数据。

## 操作步骤

先做做法 A；需要精读网页/PDF 且 token 敏感时试做法 B；需要登录态渠道再进做法 C；需要 JS 渲染、浏览器交互或 MCP 浏览器工具时试做法 D。做法 E、F、G 都是试用性做法：E 只验证自然语言驱动 Playwright CLI；F 只验证 BrowserAct 浏览器执行层；G 只验证 agent-browser 的 snapshot→动作→复查循环。默认都不进入生产链路。材料没有给出 Agent-Reach、fatsearch、Lightpanda、BrowserAct、agent-browser 之间的集成命令，本手册只把它们并列为可选做法；Playwright CLI 也没有与前三者的集成说明。

### 做法 A：最小可行试用 Agent-Reach

1. 预览安装会做什么。前提：已完成 Agent-Reach 前置条件。预期结果：只读检查并列出缺失项，不实际修改系统。

```bash
agent-reach install --env=auto --dry-run
```

2. 执行默认安全检查安装。前提：看过预览，接受只读检查范围。预期结果：只激活默认 6 个零配置渠道；需要登录态的渠道会先问你。原文同时给出兼容安全参数 `--safe`，与默认行为相同。

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

原文说明 Agent 安装时会依次做 6 件事：从仓库安装 `agent-reach` CLI（自带 yt-dlp、feedparser，注意不要从 PyPI 安装同名包）；检查系统基建 Node.js、gh CLI、mcporter 并给出缺失项的安装方式；按授权安装与配置，仅在显式传入 `--system` 时才安装依赖并通过 MCP 接入 Exa；检测环境，判断本地电脑还是服务器，给对应配置建议；按授权注册 SKILL.md，仅在显式 `--system` 时写入 Agent 的 skills 目录，默认只检查不改文件；问你要不要更多，默认只激活 6 个零配置渠道，登录态渠道列菜单点名才装。

3. 体检。前提：安装已完成。预期结果：一条命令给出每个渠道的状态、当前走哪条路、坏掉的给出修复处方。

```bash
agent-reach doctor
```

4. 装好即用，不用记命令。前提：SKILL.md 已按原文注册或安装就绪。预期结果：Agent 读了 SKILL.md 后自己知道调什么命令。原文给的使用示例：

- “帮我看看这个链接” → `curl https://r.jina.ai/URL` 读任意网页
- “这个 GitHub 仓库是做什么的” → `gh repo view owner/repo`
- “这个 YouTube 视频讲了什么” → `yt-dlp` 提取字幕
- “B站搜一下 AI 教程” → `bili search`（无需登录）
- “全网搜一下 LLM 框架对比” → Exa 语义搜索
- “订阅这个 RSS” → `feedparser` 解析

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

通过代理配置（key 不进入对话）：让代理执行 `fats setup oxy`（或 `bd` / `decodo` / `gh`）。它会打印 provider 控制台链接和一个位于 `127.0.0.1` 的一次性表单 URL，有效期 10 分钟；你在浏览器里粘贴 key，而不是粘进聊天。

没有浏览器的机器（CI / SSH）：把 key 通过管道输入。

```sh
printf %s "$KEY" | fats setup oxy
```

环境里已导出 key：导入一次；它只补“尚未保存”的位置，不覆盖已保存的 key。

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

4. 给代理装入技能说明（推荐，让代理知道“怎么读而不淹上下文”）。预期结果：代理知道先拿大纲、按节读。没有上述 CLI 的代理，读取固定到某个 release 的原文（可审阅、不来自网站运行）：

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

不用查文档，直接对 Agent 说“帮我配 XXX”。原文给出的口径：

- **GitHub**：告诉 Agent“帮我登录 GitHub” → 解锁私有仓库、提 Issue/PR、Fork。
- **Twitter/X**：Cookie 必须由用户通过 Cookie-Editor 手工导出；保存后仅供 `agent-reach doctor` 检查配置是否齐全，直接运行上游 `twitter` 命令前，仍需在当前进程环境中显式设置 `TWITTER_AUTH_TOKEN` 和 `TWITTER_CT0`。
- **B站**：搜索+视频详情用 bili-cli（无需登录）；字幕需 OpenCLI。
- **Reddit**：没有零配置路径（匿名接口已被封），桌面装 OpenCLI 用浏览器登录态，或 rdt-cli + Cookie。
- **Facebook / Instagram**：桌面装 OpenCLI，复用 Chrome 登录态。
- **小红书**：OpenCLI 只用用户已有 Chrome 会话；MCP/存量工具用 Cookie-Editor 导出后配置 xiaohongshu-mcp / 存量工具。`agent-reach configure xhs-cookies` 不会把 Cookie 注入 OpenCLI / Chrome。
- **LinkedIn / Boss直聘 / 雪球 / 小宇宙播客**：告诉 Agent“帮我配 XXX”；Boss直聘由 Agent 打开专用 Chrome，你手动登录。

安全约束（照抄执行）：

- 凭据只存本机 `~/.agent-reach/config.yaml`，文件权限 600，不上传不外传。
- 用 Cookie 登录的平台（Twitter、小红书等）务必用专用小号，作者明确提示存在被平台检测并封号的风险，主账号不要用。
- 本地电脑不需要代理；代理只有部署在服务器上才需要（~$1/月）。

### 做法 D：需要 JS 渲染或浏览器交互时，用 Lightpanda

Lightpanda 的 README 给出三种给 AI 用的接入面：`fetch --dump`（把页面转成 HTML/Markdown/PNG/PDF/结构化数据）、CDP/MCP 服务（给 Puppeteer/Playwright 或 MCP 客户端调用）、`agent` 原生 agent 模式（自然语言驱动，产出可回放的 PandaScript）。选哪条：

- 只要“把网页变成模型能读的文本” → D1。
- 已有 Puppeteer/Playwright 脚本，想换引擎 → D2。
- MCP 客户端要直接拿浏览器工具 → D3。
- 想先用自然语言跑通，再固化成免模型脚本 → D4。

#### D1：只要把网页变成模型能读的文本

1. 安装。前提：Linux x86_64 / macOS（或 WSL2）。任选一种。预期结果：得到 `lightpanda` 命令或二进制。

```console
brew install lightpanda-io/browser/lightpanda
```

```console
yay -S lightpanda-nightly-bin
```

```console
curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && \
chmod a+x ./lightpanda
```

```console
nix run github:lightpanda-io/browser -- --help
```

2. 运行前先校验二进制。预期结果：打印版本，确认能执行。

```console
./lightpanda version
```

3. 抓单个 URL 并直接输出 Markdown（喂给 LLM 最省 token 的形态）。预期结果：页面正文以 Markdown 输出。

```console
./lightpanda fetch --obey-robots --dump markdown --log-format pretty --log-level info https://demo-browser.lightpanda.io/campfire-commerce/
```

可替换的输出格式：`--dump html`、`--dump png > page.png`、`--dump pdf > page.pdf`（纯文本渲染）、`--dump structured_data`（输出页面的 JSON-LD、OpenGraph、Twitter card、meta 和 link 标签为 JSON）。

4. 页面是异步渲染时，用等待参数控制抓取时机：`--wait-until`、`--wait-ms`、`--wait-selector`、`--wait-script`。

#### D2：给现成 Puppeteer/Playwright 脚本换引擎（CDP）

前提：已有 Puppeteer 脚本；客户端可跑在 WSL 内或 Windows 宿主（WSL 会自动转发 `localhost:9222`）。

1. 用 Docker 起服务端（最简单）。预期结果：本机 9222 端口上有一个 CDP 服务。

```console
docker run -d --name lightpanda -p 127.0.0.1:9222:9222 lightpanda/browser:latest
```

或直接起 CDP server：

```console
./lightpanda serve --obey-robots --log-format pretty --log-level info --host 127.0.0.1 --port 9222
```

需要只允许本机用户访问时，改用 Unix domain socket（owner-only，0600）：

```console
./lightpanda serve --unix-socket /run/user/1000/lightpanda.sock
```

2. 把脚本里的 `connect` 改成指向 `browserWSEndpoint`，其余逻辑不变。预期结果：原脚本通过 Lightpanda 执行。

```js
import puppeteer from 'puppeteer-core';

// use browserWSEndpoint to pass the Lightpanda's CDP server address.
const browser = await puppeteer.connect({
  browserWSEndpoint: "ws://127.0.0.1:9222",
});

// The rest of your script remains the same.
const context = await browser.createBrowserContext();
const frame = await context.newPage();

// Dump all the links from the frame.
await frame.goto('https://demo-browser.lightpanda.io/amiibo/', {waitUntil: "networkidle0"});

const links = await frame.evaluate(() => {
  return Array.from(document.querySelectorAll('a')).map(row => {
    return row.getAttribute('href');
  });
});

console.log(links);

await frame.close();
await context.close();
await browser.disconnect();
```

3. 需要 WebDriver Bidi 时，在 serve 上加 `--protocol webdriver`；两个协议可同时开：`--protocol webdriver --protocol cdp`。

#### D3：接入 MCP 客户端

前提：MCP 客户端支持 stdio 或 HTTP 传输。

1. stdio 方式，在 MCP 配置里加。预期结果：客户端出现 `lightpanda` MCP server。

```json
{
  "mcpServers": {
    "lightpanda": {
      "command": "/path/to/lightpanda",
      "args": ["mcp"]
    }
  }
}
```

2. 多个 agent 共用一个进程时，改用 HTTP 传输。预期结果：客户端向 `http://host:9223/mcp` POST JSON-RPC。

```bash
lightpanda mcp --port 9223
```

要点：

- 不带 `Mcp-Session-Id` 头 `initialize` 会被分配新会话（id 在响应的 `Mcp-Session-Id` 头里返回），后续请求带上它以保持隔离——每个会话有自己的页面、Cookie 和内存，agent 之间不再互相踩页面。
- 两个 agent 用**相同**的 `Mcp-Session-Id` 则共享同一个浏览上下文（例如多个 agent 协作同一页面）。
- 用 `session_new` / `session_list` / `session_close` 显式管理会话；`DELETE /mcp` 带 session id 关闭会话。

3. 用 `run` 工具执行 PandaScript，可一次 POST 完成（脚本默认超时 60000ms）。预期结果：脚本在浏览器里执行并返回结果。脚本结束时打开的页面会关闭，但 Cookie 和 storage 保留，登录态可以带到下一次 `run`。也有现成 skill：`lightpanda-io/agent-skill`。

#### D4：用自然语言跑一遍，再固化成免模型的脚本

前提：有任一模型供应商的 API key，或本地模型。

1. 让 agent 干活（自动从环境变量检测 key）。预期结果：用自然语言完成网页任务。

```console
./lightpanda agent                                    # auto-detects API key from env
./lightpanda agent --task "top story on news.ycombinator.com?"
./lightpanda agent --no-llm                           # basic REPL, no LLM
./lightpanda run session.js                           # run a recorded script
cat session.js | ./lightpanda run -                   # ...or pipe one in via stdin
./lightpanda agent --provider gemini --task "..."
./lightpanda agent --list-models                      # models available for the detected provider
```

支持 Anthropic、OpenAI、Gemini、Vertex AI、Mistral、Hugging Face、Vercel AI Gateway、OpenRouter、任意 OpenAI 兼容端点，以及 Ollama / llama.cpp / LLMD 本地模型。示例：

```console
OPENROUTER_API_KEY=... ./lightpanda agent --provider openrouter --model anthropic/claude-sonnet-5
OPENAI_BASE_URL=https://my-gateway/v1 OPENAI_API_KEY=... ./lightpanda agent
```

2. 跑通后用 `/save` 把当前会话导出成 PandaScript（原生 JS + 少量浏览器原语），再用 `lightpanda run <script>.js` 回放。按 README 说法，脚本是确定性的、不消耗 token，所以可以“用 LLM 做原型、把产物上线到生产而不在运行时带模型”。

#### D5：运维/合规

- 默认会上报使用遥测，需要关闭时设 `LIGHTPANDA_DISABLE_TELEMETRY=true`。
- 不想要 core dump 时设 `LIGHTPANDA_DISABLE_CORE_DUMP`。
- 抓第三方站点时注意合规；示例命令带 `--obey-robots`。

### 做法 E（试验性）：用 Playwright CLI + skills 让 Claude Code 自然语言驱动浏览器

说明：来源只有一条推文，正文在第二步中途被截断（“Run playwright-cli install --skills in your” 之后缺失），没有给出提示词、使用示例或结果。以下只把原文给出的两条命令当作可照做部分，其余标注为待验证；不要把它当标准做法。

1. 确认 Node.js 20+。前提：准备在 Claude Code 环境里试。预期结果：输出 v20 或更高。

```bash
node -v
```

2. 全局安装 Playwright CLI。前提：npm 可用。预期结果：得到 `playwright-cli` 命令（原文命令原样）。

```bash
npm install -g @playwright/cli@latest
```

3. 安装 skills，把工具用法暴露给 Claude Code。前提：上一步成功；原文说在项目目录下执行。预期结果：agent 知道如何调用浏览器。原文未说明是否需要特定目录或是否需先初始化项目；是否还需额外安装浏览器内核，原文未提及，需用 `playwright-cli --help` 确认。

```bash
playwright-cli install --skills
```

4. 在 Claude Code 中发起抓取任务。前提：前三步完成，目标站点允许抓取。原文没有给示例提示词；下面这段是调研报告按该思路自拟的待验证写法，不是原文内容：

```text
用 playwright 打开 https://example.com，抓取列表页每一条的标题、链接、日期，
翻完所有分页，结果输出为 CSV。遇到需要登录或 robots 禁止的页面就停下并告诉我。
```

预期结果：agent 用自然语言驱动浏览器执行并返回结果。实际是否零代码、是否覆盖“几乎任何网站”，原文没有给出证据，按下面的最小试用自己量。

5. 记录过程与指标。前提：你要判断这种做法是否值得保留。预期结果：拿到一组可与手写脚本对照的数字（人工投入时间、人工干预次数、是否改代码、字段完整率/准确率、翻页/渲染失败率、是否主动做合规检查）。判定规则见“怎么判断变好了”。

### 做法 F（试用性）：用 BrowserAct Skills 给编码 agent 增加浏览器执行层

说明：依据 BrowserAct README，有安装提示词、Quick Start 命令、浏览器模式表、并发说明、免费/付费表、兼容列表、MIT License 和 6318 stars 的仓库指标；但本次材料缺 docs/installation.md、quick-start.md、skills.md 等详细文档，remote-assist、云端托管、Skill Forge 的具体命令和异常处理无法核对。反封锁效果、token 效率“数是 JSON/HTML 的数倍”、账号不被标记、零干扰并发等，都是作者主张，没有测试方法、样本量、失败率或独立复现。不要把它当已验证生产链路。

1. 安装/加载 Skill。前提：agent 能执行 shell 命令并加载 Skills，机器可联网。对 agent 说：

```
Install browser-act. Skill source: https://github.com/browser-act/skills/tree/main/browser-act . Verify it works after installation.
```

预期结果：Skill 安装后由 agent 自行验证；更细的安装说明在 docs/installation.md，但本次材料未包含该文档内容。

2. 每个会话开始时先探测环境。前提：Skill 已安装。运行：

```
browser-act get-skills core --skill-version 2.0.2
```

预期结果：README 称该命令一次返回环境状态、浏览器列表和可用命令，便于 agent 选择后续动作。命令中的 `2.0.2` 来自 README 示例，材料未说明版本兼容范围。

3. 选择执行模式。前提：明确任务是本地浏览器控制还是云端托管。

- 云端：无需自己搭 agent，描述目标网站、筛选条件和字段，BrowserAct 在真实云浏览器中构建并测试可复用 scraping Bot，再从云端运行。README 没有给出具体命令，只给了网站入口和演示链接。
- 本地：适合需要本地 Chrome 登录态复用或直接嵌入自有 agent 工作流。登录态可用 chrome 模式的 profile import 或 CDP attach；无登录批处理用 stealth 隐私模式，每次新指纹加代理轮换；登录账号多开用 stealth 固定身份，要求稳定指纹加稳定 IP。

预期结果：选定模式后再执行后续命令。

4. 受保护页面抽取（需登录后免费功能，只对已获授权的页面使用）。前提：README 的免费表显示 `stealth-extract` 属于登录后免费功能，因此需要 BrowserAct 账号。运行：

```
browser-act stealth-extract https://example.com
```

预期结果：抽取受保护页面内容；材料没有给成功率与失败处理。

5. 单任务浏览器自动化。前提：把 `<id>` 换成 `get-skills` 返回的浏览器 id，并给任务起唯一 session 名。运行：

```
browser-act --session my-task browser open <id> https://example.com
browser-act --session my-task state
browser-act --session my-task click 3
browser-act --session my-task input 2 "hi"
```

预期结果：`state` 返回带索引的可交互元素列表，随后用 `click 3`、`input 2 "hi"` 按索引操作，不需要解析 DOM。

6. 并发与隔离。前提：不同任务使用不同 `--session` 名称；需要账号隔离时使用不同 browser/profile，而不是只换 session。预期结果：跨浏览器并行时 cookie、指纹、代理独立；同浏览器多 session 共享登录态但独立执行、任务互不阻塞。浏览器创建/删除、Profile 导入、代理变更、安全与隐私开关等敏感操作需要用户显式批准，且此前的批准不会延续。

7. 卡住时人工接管。前提：`remote-assist` 属于登录后免费功能；README 未给出具体命令，需查 docs。流程是生成一个实时 URL，用户从任意设备打开接管，完成后 agent 继续。不要让 agent 在未授权或高风险账号上无人值守运行。

8. 对重复网站做批量化 Skill。前提：同一网站需要反复、规模化抽取。先对 agent 说：

```
Install browser-act-skill-forge. Skill source: https://github.com/browser-act/skills/tree/main/browser-act-skill-forge . Verify it works after installation.
```

然后描述需求，例如：

```
Forge a Skill that extracts job listings from LinkedIn — title, company, salary, URL. I'll run 300 keywords later.
```

预期结果：README 称 Skill Forge 会探索一次网站、发现 API 和数据模式、生成可部署 Skill，之后不再重复探索；但本次材料没有给出 Skill Forge 的底层命令和失败处理细节。

9. 安全边界。前提：所有敏感操作走确认门禁。README 强调确认门禁在 Skill 层强制执行，不是配置开关；因此不要把浏览器创建/删除、Profile 导入、代理变更等权限预先批量授予 agent。

### 做法 G（试用性）：用 agent-browser 的 snapshot→动作→复查循环让 agent 操作浏览器

说明：依据 vercel-labs/agent-browser README，有安装命令、quick start 五步、snapshot/ref 机制、skills/MCP/源码构建命令、平台支持、Apache-2.0 许可；但除 star 数外没有任何效果数据，且属 Vercel Labs 实验产品。不要把它当已验证生产链路。

1. 安装。前提：本机有 Node/npm 环境；首次需要联网下载浏览器。预期结果：得到 `agent-browser` 命令和默认 Chrome for Testing。

```bash
npm install -g agent-browser
agent-browser install           # download Chrome for Testing (first time only)
```

替代路径：Homebrew 用 `brew install agent-browser` 后再 `agent-browser install`；Linux 用 `agent-browser install --with-deps` 一并装系统库；不想装可用 `npx agent-browser open example.com`。

```bash
brew install agent-browser
agent-browser install
```

```bash
agent-browser install --with-deps
```

```bash
npx agent-browser open example.com
```

2. 手工跑通核心循环。前提：执行者（人或 agent）有 shell 命令权限。预期结果：打开页面、看到带 ref 的可交互元素、对 ref 执行动作、复查 URL、关闭。

```bash
agent-browser open example.com
agent-browser snapshot -i       # interactive elements, each with a ref
agent-browser click @e1         # act on a ref from that snapshot
agent-browser get url           # check the result
agent-browser close
```

配套的三条硬规则，要写进给 agent 的指令里：

- ref 只描述快照那一刻的页面，导航或 DOM 变化后必须重新 `snapshot` 再用 ref。
- 除 ref 外也支持 CSS selector、文本、XPath 和语义定位器，例如 `agent-browser find role button click --name "Submit"`。
- 目标隐藏、禁用、在视口外、或被 cookie 横幅之类的元素遮挡时，click 会失败报错而不是谎报成功；处理办法是关掉遮挡元素、重新 snapshot、再重试。

3. 给 agent 装载与已安装 CLI 版本匹配的 skill。前提：agent harness 支持 skill 机制，或你能改它的 AGENTS.md。预期结果：agent 知道先加载 core skill，指令与已安装 CLI 版本对齐。

```bash
agent-browser skills get core                 # the core loop, refs, waiting, and common workflows
agent-browser skills get core --ref commands  # one reference, such as the full command list
agent-browser skills get core --full          # adds the full command reference and templates
agent-browser skills list                     # specialized skills: electron, slack, dogfood, and more
```

把 discovery skill 装进 agent harness：

```bash
npx skills add vercel-labs/agent-browser
```

或在 `AGENTS.md` 里加：

```markdown
Use `agent-browser` for browser automation. Before the first use, run
`agent-browser skills get core` and follow it.
```

原文说明：装进去的 skill 只是一个薄壳，让 agent 去加载 `agent-browser skills get core`，因此指令始终与已安装的 CLI 版本对齐。

4. MCP 客户端接入（可选）。前提：客户端支持 stdio MCP。预期结果：客户端出现 `agent-browser` MCP server。

```bash
agent-browser mcp
```

5. 会话隔离与生命周期。前提：需要多任务并发或需要保留登录态。预期结果：每个 `--session` 有自己的 daemon 和浏览器；默认情况下，daemon 在 1 小时无命令后关闭 headless 浏览器并退出；配置了 session persistence 时会先保存状态。原文未给出具体持久化配置命令，需查文档。

6. 换引擎/连已有 Chrome/云浏览器（可选）。按原文选项：`--cdp` / `--auto-connect` 挂到已运行的 Chrome，`--engine` 换 Lightpanda / Obscura 引擎，驱动 iOS 模拟器里的 Mobile Safari，或接 Browserbase / Browserless / Browser Use / Kernel / AgentCore 等云浏览器。原文未给出这些选项的完整配置示例，执行前查文档。

7. 从源码构建（可选）。前提：Node.js 24+、pnpm 11+、Rust。预期结果：构建并全局链接原生 CLI，再装浏览器。

```bash
pnpm install
pnpm build:source               # builds the dashboard and the native CLI
pnpm link --global
agent-browser install
```

8. 最小试用。前提：CLI 已装、agent 已能执行 shell。预期结果：选一个高频、步骤固定的浏览器任务（例如每周从某站点取几个固定数字，或反复填写同一张内部表单），按 quick start 五步手工跑一遍确认可用，再把 AGENTS.md 指令加进 agent，让它自己按“snapshot → 动作 → 复查”跑同一任务 5～10 次；同时用现有做法（人工操作、一次性 Playwright 脚本、或其它浏览器工具）跑同样次数对照。记录指标见“怎么判断变好了”。

9. 安全配置。使用 auth vault、domain allowlists、action policies、content boundaries 前，另读 `agent-browser.dev/security`；README 未给具体字段与默认值。

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
- 默认范围：安装后默认只激活 6 个零配置渠道，没有在你点名之前装登录态渠道。
- 跑通示例任务：用原文给的 6 个示例（读链接、读 GitHub 仓库、读 YouTube 字幕、B站搜索、Exa 全网搜索、RSS 解析）各试一次，看 Agent 是否知道自己该调什么命令。
- fatsearch 的 token/成本可见性：`fats stats` 逐次列出 provider、毫秒、成本、token；`dry:true` 在执行前预估花费。用你自己的真实页面/PDF 做小范围试用，先看 `fats stats` 和 `dry:true` 的数字，再决定是否推广。
- fatsearch 的缺失能力是否显式：缺失能力以 `!` 行说明“缺什么、该怎么办”，且“Never silence”（从不静默）。
- 不要用作者 benchmark 直接 adopt：fatsearch 的效果数字全部来自作者自发布 benchmark，项目 48 stars、v0.2.x 早期；报告建议小范围试用。
- Lightpanda 的最小对比：先用 Docker 或二进制启动 Lightpanda，用 `fetch --dump markdown` 和 MCP / agent 模式各跑一条真实的网页采集与操作任务，并与现有 Chrome + Playwright 方案对比成功率、耗时和内存。这是调研报告给出的试用判断方式。
- Lightpanda 的基准只能当参考：README 自测在 AWS EC2 m5.large、请求 933 个真实网页，100 页峰值内存 123MB vs Headless Chrome 2GB（约 16 倍更少），执行时间 5s vs 46s（约 9 倍更快）；这是作者自测，不是第三方评测。
- Playwright CLI 的最小对照：选 3 个公开站点做同一件任务——一个静态页面、一个 JS 渲染页面、一个需要翻页的列表页；每类任务做两次对照：A = 手写脚本或手动复制，B = 在 Claude Code 中用自然语言驱动 Playwright，任务目标与字段完全相同；记录 B 组从发指令到拿到可用结果的完整过程（含 agent 反复试错、是否需要人工纠正）。这是调研报告给出的最小试用设计，不是实测结论。
- Playwright CLI 看这些指标：人工投入时间（分钟）与人工干预次数（每次卡住需人介入算一次）；是否需要写/改代码（原文主张零代码，这是主要待验证点）；字段完整率与准确率（对照人工核对的前 20 条）；翻页/渲染类页面上的失败率与重试次数；合规检查是否被 agent 主动执行（如遇到 robots 禁止是否停下）。
- Playwright CLI 的判定规则：若在静态页和列表页这两类任务上 B 组显著省时、无需改代码、准确率不低于人工核对基准，可作为 Claude Code 的一条可选工具供给做法保留；若只在静态页成立，降级为“特定场景可用”的注记，不进入标准流程。
- BrowserAct 的最小试用：选 3 类低风险任务各 1 个——公开页面字段抽取；已登录内部系统的只读查询；一个需要人工接管的登录或验证码场景（须获授权）。在 Claude Code 或其他兼容 agent 中安装 Skill，先用 `get-skills` 确认浏览器列表和命令；每个任务用独立 `--session`；并行时用不同 browser/profile，避免同账号并发；记录每次是否完成、字段是否准确、是否触发 CAPTCHA/封锁、是否需要 remote-assist、接管耗时、是否出现串号、总耗时和费用。
- BrowserAct 的判断指标：与现有手工流程或旧工具做基线对比，看任务成功率、字段抽检准确率、人工接管率与接管时长、阻塞率、跨会话污染次数、单任务耗时、token/命令开销、付费 credits 消耗、合规事件数。建议每类任务重复足够次数（例如 10 次）再判断；若成功率与准确率不低于基线、接管和阻塞可控、无串号与合规问题，再扩大范围；否则退回手动或换工具。这是调研报告给出的试用设计，不是实测结论。
- agent-browser 的最小试用：选一个高频、步骤固定的浏览器任务（例如每周从某站点取几个固定数字，或反复填写同一张内部表单）。装完 CLI 后按 quick start 五步手工跑一遍确认可用，再把 AGENTS.md 指令加进 agent，让它自己按“snapshot → 动作 → 复查”跑同一任务 5～10 次。
- agent-browser 的判断指标：任务成功率（首次即成功比例、需要人工接管次数）；输入成本（同一页面下 `snapshot -i` 的文本体积 vs 直接取整页 HTML 的体积，以及每次任务的总命令数/token 数）；完成耗时（含失败重试的端到端时间）；假成功次数（是否存在“点了但页面没变”却报成功的实例，README 声称不会，正好实测）；可诊断性（失败时能否只靠 `console` / `errors` / `screenshot` 定位原因）。
- agent-browser 的对照方式：同任务用现有做法（人工操作、一次性 Playwright 脚本、或其它浏览器工具）跑同样次数比较。
- agent-browser 的判定：成功率不低于现状且人工介入次数下降，或同等成功率下搭建与维护成本更低，才继续扩大使用；仅仅 star 多、安装顺不代表有效果。
- 试用时长：材料没有给出 Agent-Reach 和 fatsearch 的试用时长；Lightpanda 材料只给出“先小范围对比”的建议；Playwright CLI 这条，调研报告把最小试用设计为“半天内可完成”；BrowserAct 这条，调研报告建议每类任务重复足够次数（例如 10 次）再判断；agent-browser 原文没有给试用时长，调研报告建议同一任务跑 5～10 次并与现有做法对照。至少先完成上述最小任务对比，再决定是否扩大。

最小试用方式：Agent-Reach 先 `agent-reach install --env=auto --dry-run` 预览 → 默认安装 → `agent-reach doctor` → 挑 1～2 个零配置渠道的示例任务跑通；fatsearch 先安装 CLI → 注册 MCP → 用 `dry:true` 和 `fats stats` 量几个真实网页/PDF 的 token 与成本；Lightpanda 先 `./lightpanda version` → `fetch --dump markdown` 抓一个真实页面 → 用 MCP 或 agent 模式跑一条任务 → 与现有 Chrome + Playwright 对比成功率、耗时、内存；Playwright CLI（试验性）先 `node -v` 确认 20+ → 装 CLI → `playwright-cli install --skills` → 用 `playwright-cli --help` 确认可用 → 按静态页、JS 渲染页、翻页列表页做 A/B 对照；BrowserAct（试用性）先安装 Skill → `browser-act get-skills core --skill-version 2.0.2` 探测环境 → 用独立 `--session` 跑 3 类低风险任务 → 记录成功率、字段准确率、接管率、串号、费用与合规事件；agent-browser（试用性）先 `npm install -g agent-browser` → `agent-browser install` → 手工跑 quick start 五步 → 装 skill/AGENTS.md → 用同一固定任务跑 5～10 次并与现有做法对照。

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
- RSS 只给了 feedparser 解析，没有定时轮询、事件触发或状态触发配置，不能当“有更新就通知我”的完整方案。
- fatsearch 的包名是 `fatsearch`，命令是 `fats`；Homebrew、npm 和安装脚本会加 `fatsearch` 别名，`cargo install` 只加 `fats`。
- fatsearch 不配 provider key 也能用免费通道，但遇到 JS 页面、captcha 或拦截页会抓不到内容，网页搜索也用不了；不要把它当万能抓取器。
- provider key 不要粘进聊天：走 `fats setup` 的一次性表单、管道或 `fats setup import-env`；`auth.json` 是唯一 key 来源，`fats` 不会使用环境变量里的 key。
- `fats setup free off` 会关掉免费通道，所有页面都走 provider，每页都花钱；只想临时停用某个 provider 用 `fats setup oxy off` / `on`。
- fatsearch 没有 daemon，没有 watch、cron、回调、重试队列；不要用它做定时订阅或主动推进。
- fatsearch 读扫描版 PDF 会返回 `! no_text`（OCR），DOCX/XLSX 在 v1 返回 `! not_in_v1 zip`，登录墙后的页面也读不到；需要语义近似/主题匹配时 `match:near`/`match:topic` 需本地模型。
- fatsearch 默认只给大纲、按节读；作者没有讨论“必须通读全文才能下结论”的任务是否会被大纲机制削掉信息，试用时要专门验。
- fatsearch 效果数字全部来自作者自发布 benchmark，项目 48 stars、v0.2.x 早期；不要因为示例里的 token/成本数字好看就直接全量推广。
- Lightpanda 目前只有 nightly 构建，不要把它当成稳定发行版直接替换唯一生产链路。
- Linux 二进制链接 glibc，在 Alpine 等 musl 系统上会报 `cannot execute: required file not found`；Android/Termux 不可用；Windows 没有原生二进制，走 WSL2。
- 抓第三方站点时注意合规；示例命令带 `--obey-robots`。
- MCP HTTP 模式下，不带 `Mcp-Session-Id` 的 `initialize` 会新建会话；后续请求要带上它。用相同 `Mcp-Session-Id` 会共享页面、Cookie 和内存，多个 agent 协同时才这么做。
- `run` 结束时页面会关闭，但 Cookie 和 storage 保留，登录态会带到下一次 `run`；不要以为脚本结束就清掉了登录态。
- Lightpanda 的基准是作者自测，只有 nightly 构建，结论还提示无渲染引擎；不要因为 16 倍内存、9 倍速度的数字好看就直接替换 Chrome + Playwright，先在自家目标站点对比成功率、耗时和内存。
- Playwright CLI 原文在第二步被截断：`playwright-cli install --skills` 之后该在哪个目录、还要做什么、提示词怎么写都没有；执行前先用 `playwright-cli --help` 查清，不要照抄半截流程。
- Playwright CLI 这条只有一个推文来源（46 赞、1 转发、10 回复），“turns into a web crawler for almost any website”“zero lines of code”都是作者主张，没有案例、截图、抓取结果、成功率或失败情形。
- 原文没有说明是否还需额外安装浏览器内核；`npm install -g @playwright/cli@latest` 成功不等于浏览器能启动。
- 原文没讨论封禁、速率限制、版权与合规风险；对需要登录、强反爬或高频请求的站点，“almost any website”未经验证，不要直接跑。
- 不要把做法 E 当成已验证的标准流程或生产链路；它只用于和手写脚本做对照试验。
- BrowserAct 材料只有 README，缺 docs/installation.md、quick-start.md、skills.md 等详细文档；remote-assist、云端托管、Skill Forge 的具体命令和异常处理无法核对。
- 反封锁效果、token 效率“数是 JSON/HTML 的数倍”、账号不被标记、零干扰并发等是作者主张，没有测试方法、样本量、失败率或独立复现；不要因为 6318 stars 和 MIT License 就直接全量采用。
- 核心 stealth 功能需要 BrowserAct 登录，代理和超过 5 个 stealth browser 需要付费；不要在不评估成本与授权的情况下直接采用。
- CAPTCHA 处理、代理轮换、多账号操作可能涉及目标网站条款和合规风险；README 没有展开合规边界，只对已获授权的页面使用。
- 浏览器创建/删除、Profile 导入、代理变更、安全与隐私开关等敏感操作的确认门禁在 Skill 层强制执行，不是配置开关；不要把权限预先批量授予 agent，且此前的批准不会延续。
- 同浏览器多 session 只共享登录态但独立执行；要账号隔离必须用不同 browser/profile，不要只换 session，否则可能串号。
- BrowserAct 材料没有时间触发、事件触发、状态触发机制或调度器说明；不要把它当定时任务或主动推进方案。
- `browser-act get-skills core --skill-version 2.0.2` 中的 `2.0.2` 来自 README 示例；材料未说明版本兼容范围，执行时以实际返回为准。
- agent-browser 是 Vercel Labs 实验产品，接口可能变；README 只有 46,053 stars、当日 +150 的关注度指标，没有成功率、耗时或对照数据。
- `agent-browser install` 首次需要联网下载 Chrome for Testing；Linux 还要 `--with-deps` 装系统库；不装可用 `npx agent-browser open example.com` 临时跑。
- ref 只描述快照那一刻；导航或 DOM 变化后必须重新 `snapshot` 再用 ref，否则会点错/失败。
- 目标隐藏、禁用、在视口外、或被 cookie 横幅遮挡时，click 会失败报错而不是谎报成功；要关掉遮挡元素、重新 snapshot、再重试。
- 默认 daemon 在 1 小时无命令后关闭 headless 浏览器并退出；长任务或需要保活要显式处理 session persistence，原文未给具体配置命令。
- 每个 `--session` 有自己的 daemon 和浏览器；不要以为不同 session 共享登录态，除非你显式用同一会话/持久化。
- README 没有提到时间/事件/状态触发或调度能力；不要把它当定时任务或主动推进方案。
- auth vault、domain allowlists、action policies、content boundaries 只在 Security 文档链接里，README 没给字段与默认值；要用必须另读 `agent-browser.dev/security`。
- “快照紧凑因而更适合 agent”“daemon + 每条命令一次短调用更好用”是作者主张，没有基准测试、任务成功率或对照实验；不要因为 star 多就直接替换现有浏览器方案。
- 从源码构建要求 Node.js 24+、pnpm 11+、Rust；不满足就别走源码路线。
- 需要换引擎/连已有 Chrome/云浏览器时，`--cdp` / `--auto-connect` / `--engine` 的完整配置示例原文未给，执行前查文档。

## 证据与来源

- Agent-Reach 做法 A、做法 C、维护步骤和大部分坑：Panniantong/Agent-Reach 调研报告。安装提示词、`install --env=auto` / `--dry-run` / `--safe` / `--system`、`doctor`、`uninstall` / `--dry-run` / `--keep-config`、OpenClaw 的 `tools.profile = "coding"` 与 `openclaw gateway restart`、各平台登录态口径，均来自该报告原文，属作者自述，没有第三方核验。
- Agent-Reach 仓库指标：88,184 stars、当日 +683（来自输入 metrics，非 README 正文）。
- Agent-Reach 渠道状态数据：yt-dlp 154K Star，YouTube 仍是最佳，但不再用于 B站；作者自述 2026-06 yt-dlp 被 B站风控 412 封死，已切换 bili-cli，用户零操作。这些均为作者自述。
- Agent-Reach 效果验证：仅到渠道是否可用这一层；原文没有产出质量指标或评测方法。主动推进证据较弱：原文只在需求列表里提到 RSS 更新通知，实现侧只给了 feedparser 解析，没有可照做的触发机制。
- Agent-Reach 与已有做法的关系：Jina Reader 是 Agent-Reach 中读网页渠道的首选后端；Agent-Reach 通过注册 SKILL.md 落地 Agent skills 机制；报告建议把 Agent-Reach 的状态从 study 上调为 try。
- fatsearch 做法 B：fatsearch/fatsearch 调研报告。安装命令、MCP 注册、`fats setup` 的安全设计、`dry:true` / `fats stats`、遥测开关、能力边界，均来自该报告与 README 原文；属作者自述，没有第三方核验。
- fatsearch 项目状态：48 stars、v0.2.x 早期项目；效果数字全部来自作者自发布 benchmark，不足以直接 adopt。报告建议把它装成 Claude Code 的 MCP 工具，在“代理需要读网页或 PDF、但上下文预算敏感”的场景里小范围试用，先用 `fats stats` 和 `dry:true` 自己量 token 与成本，再决定是否推广。
- fatsearch 的其他数据：MCP 只暴露一个工具 `fats(cmd)`，工具卡约 60 token，一个字符串参数；没有账号体系，无 daemon、无浏览器内核；二进制 17–21 MB；免费抓取每个站点每秒最多发起一次请求；示例 `dry:true` 预估 up to $0.0040；`fats stats` 示例列出 1.2ktok、40.9ktok 等 token 数。这些均来自报告/README，属作者自述。
- Lightpanda 做法 D：lightpanda-io/browser 调研报告。安装命令、`fetch --dump`、CDP/MCP 配置、PandaScript 流程、平台限制、遥测与 core dump 环境变量，均来自该报告与 README 原文；属作者自述，没有第三方核验。
- Lightpanda 自测基准：AWS EC2 m5.large、请求 933 个真实网页，100 页峰值内存 123MB vs Headless Chrome 2GB（约 16 倍更少），执行时间 5s vs 46s（约 9 倍更快）。这是作者自测，不是第三方评测。
- Lightpanda 的项目判断：只有 nightly 构建；结论提示无渲染引擎；建议先用 Docker 或二进制启动，用 `fetch --dump markdown` 和 MCP / agent 模式各跑一条真实的网页采集与操作任务，并与现有 Chrome + Playwright 方案对比成功率、耗时和内存。这是调研报告的建议，不是实测结论。
- 三者关系：Agent-Reach 负责多渠道选型、安装、体检、路由；fatsearch 负责单页/PDF 的“先大纲、按节读”与成本可见；Lightpanda 负责 JS 渲染与浏览器交互。给出的材料没有提供三者集成的命令，本手册只把它们并列为可选做法；这是依据材料做的编排，不是原文集成说明。
- Playwright CLI 做法 E：@plusxbt 推文（46 赞、1 转发、10 回复）。`node -v` 要求 Node.js 20+、`npm install -g @playwright/cli@latest`、`playwright-cli install --skills` 两条命令来自原文；原文在第二步中途被截断，后续步骤、提示词、使用示例、成功率与失败案例均缺失。调研报告的结论是：先做小范围试验，用“耗时/人工干预次数/是否改代码”对比手写脚本，不宜直接写进手册作为标准做法。第 4 步的提示词是调研报告自拟的待验证写法，不是原文内容。Playwright CLI 与前面三者没有集成说明，只是并列的试验性浏览器供给方式。
- BrowserAct 做法 F：browser-act/skills 调研报告。安装提示词、`get-skills`、`stealth-extract`、session 命令、三种浏览器模式、并发说明、remote-assist、Skill Forge、免费/付费表、兼容列表、MIT License、6318 stars 均来自 README；属作者自述，没有第三方核验。材料缺 docs/installation.md、quick-start.md、skills.md 等详细文档；remote-assist、云端托管、Skill Forge 的具体命令和异常处理无法核对。反封锁效果、token 效率“数是 JSON/HTML 的数倍”、账号不被标记、零干扰并发等是作者主张，没有测试方法、样本量、失败率或独立复现。CAPTCHA、代理轮换、多账号操作可能涉及合规风险，README 未展开。
- BrowserAct 最小试用与指标：调研报告建议选 3 类低风险任务各 1 个、独立 session、不同 browser/profile、记录成功率/准确率/接管/串号/费用/合规事件，每类重复例如 10 次；这是建议，不是实测结论。
- agent-browser 做法 G：vercel-labs/agent-browser 调研报告。安装命令、quick start 五步、`snapshot -i` 的 ref 机制、点击失败报错、skills / MCP / 源码构建命令、平台支持、Apache-2.0 许可，均来自该报告与 README 原文；属作者自述，没有第三方核验。
- agent-browser 项目状态：46,053 stars、当日 +150；README 有 npm 月下载徽章但文本中没给具体数值；这些不是效果证据。
- agent-browser 作者主张：“快照紧凑因而更适合 agent”“daemon + 每条命令一次短调用更好用”，没有基准测试、任务成功率或对照实验。
- agent-browser 安全内容：auth vault、域名允许列表、动作策略、内容边界 README 只给链接，具体字段与默认值在 agent-browser.dev/security，本次材料未包含。
- agent-browser 与 Vercel Sandbox / skills.sh 的关系：README 指向 agent-browser.dev/next 的 Next.js and Vercel 文档，说明可在 Vercel Sandbox 里运行；`npx skills add vercel-labs/agent-browser` 把 discovery skill 装进 agent harness，skill 是薄壳、运行时才拉 `skills get core`，从而与已安装 CLI 版本对齐。这些来自 README，属作者自述。
- agent-browser 最小试用与指标：调研报告建议选一个高频、步骤固定的浏览器任务，按 quick start 五步手工跑一遍，再让 agent 跑同一任务 5～10 次，对照现有做法记录成功率、人工接管、snapshot 体积 vs 整页 HTML、总命令数/token、端到端耗时、假成功次数、可诊断性；这是建议，不是实测结论。

## 依据的调研

- [Panniantong/Agent-Reach](../research/radar/2026-10-03/852-panniantong-agent-reach.md)：值得一试，把它作为「给 Agent 补互联网读取能力」的最小可行方案小范围试用：先 --dry-run，再只用默认零配置渠道，并固定用 `agent-reach doctor` 做体检。理由是原文给出了可照抄的安装/体检/更新/卸载流程和「首选+备选多后端路由」的可复用设计，但各渠道依赖平台反爬与登录态、作者自述频繁换代，稳定性必须自己验证，不宜直接全量采纳。
- [fatsearch/fatsearch](../research/radar/2026-10-22/5707-fatsearch-fatsearch.md)：值得一试，把 fatsearch 装成 Claude Code 的 MCP 工具，在“代理需要读网页或 PDF、但上下文预算敏感”的场景里小范围试用，先用 `fats stats` 和 `dry:true` 自己量 token 与成本，再决定是否推广。因为它给出可直接照抄的安装、MCP 注册和“先看大纲、按节读取”的操作流程，但效果数字全部来自作者自published benchmark，48 stars 的早期项目（v0.2.x），还不足以直接 adopt。
- [lightpanda-io/browser](../research/radar/2026-10-31/8886-lightpanda-io-browser.md)：值得一试，建议小范围试：先用 Docker 或二进制启动 Lightpanda，用 `fetch --dump markdown` 和 MCP / agent 模式各跑一条真实的网页采集与操作任务，并与现有 Chrome + Playwright 方案对比成功率、耗时和内存；理由在于 README 给出了可直接复制的安装、MCP 配置、PandaScript 录制回放流程，但只有 nightly 构建、基准为自测且无渲染引擎，兼容性必须在自家目标站点上验证。
- [@plusxbt: It is becoming f*cking dangerous: Claude Code turns into a web crawler for almost any website, and y](../research/radar/2026-11-01/9089-it-is-becoming-f-cking-dangerous-claude-code-turns.md)：值得一试，先做小范围试验：在 Node.js 20+ 环境安装 Microsoft Playwright CLI 并执行 skills 安装，让 Claude Code 用自然语言驱动浏览器抓取公开页面，再用「耗时/人工干预次数/是否改代码」对比手写脚本；原文只给出两步安装线索、第二步还被截断，没有流程细节和验证数据，因此不宜直接写进手册作为标准做法。
- [browser-act/skills](../research/radar/2026-11-04/10216-browser-act-skills.md)：值得一试，建议把 BrowserAct Skills 作为现有编码代理的浏览器执行层做小范围试用：先用 get-skills 探测环境，用独立 session 跑只读或低风险任务，并用 remote-assist 兜底；README 给出一手安装与命令，但关键稳定性和反封锁效果多为作者主张，且 stealth 能力需登录或付费，暂不宜直接 adopt。
- [vercel-labs/agent-browser](../research/radar/2026-11-06/10838-vercel-labs-agent-browser.md)：值得一试，照着 README 的 quick start 五步（open → snapshot -i → 对 ref 执行动作 → get/is 复查 → close）挑一个真实浏览器任务小范围试，并把 `agent-browser skills get core` 或对应的 AGENTS.md 指令装进 agent；理由是原文给出了可直接复制的安装命令、命令循环、失败语义和给 agent 的指令文本，但除 star 数外没有任何效果数据，且属 Vercel Labs 实验产品。
