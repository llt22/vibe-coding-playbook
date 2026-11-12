# 给 agent 补上网页、PDF 与登录态浏览器能力

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这篇手册解决如何以最小风险给可执行 shell 的 agent 补上网页、PDF、JS 页面和登录态渠道的读取/操作能力，并在读网页/PDF 时控制进入上下文的 token 与成本；某个渠道失效时能定位、换路，而不是重写代码。
> 先试这一步：先对现有 agent 跑一次 agent-reach install --env=auto --dry-run 预览，再用 agent-reach doctor 体检，确认零配置渠道可用后再按任务选择 fatsearch、Lightpanda 或试用性浏览器方案。
> 最近修订：2026-11-12

## 解决什么问题
已有 agent 能执行 shell，但默认不知道怎么读外部平台，也容易把整页 HTML 或整份 PDF 塞进上下文；遇到 JS 渲染、点击/填表、复用 Cookie 时又缺少可脚本化、可给 MCP 调用的浏览器。Agent-Reach 是 CLI 能力层，负责选型、安装、体检、路由，实际读取由 agent 调上游工具完成。fatsearch（`fats`）把单个 URL 或 PDF 抓取、清洗、生成大纲并缓存成 id，先大纲再按节读或页内过滤，并记录 provider、耗时、成本和 token。Lightpanda 是 Zig 写的无头浏览器，提供 `fetch --dump`、CDP/MCP 服务和 `agent` 模式。BrowserAct 和 agent-browser 是试用性浏览器执行层；Ruin Everything 是本地 Chrome 运行时 + MCP 服务，可复用同一 Chrome 配置的会话/Cookie/扩展，在后台标签页导航、点击、填表、读取页面，并在支持范围内继续登录/验证、留下提交回执。本篇要解决：怎么以最小风险补上网页、PDF、JS 页面和登录态渠道的读取/操作能力，控制 token 与成本，渠道失效时能定位、换路，而不是重写代码。

Agent-Reach 覆盖渠道：网页（Jina Reader）、YouTube 字幕+搜索（yt-dlp）、RSS/Atom（feedparser）、全网语义搜索（Exa，经 mcporter 以 MCP 接入）、GitHub（gh CLI）、Twitter/X、B站（bili-cli）、Reddit、Facebook、Instagram、小红书、LinkedIn、Boss直聘、V2EX、雪球、小宇宙播客转写（Whisper）。每个平台是有序后端列表，失效时调整顺序；`agent-reach doctor` 显示当前后端。默认只激活 6 个零配置渠道，需要登录态的会先问。Playwright CLI、BrowserAct、agent-browser、Ruin Everything 都只作试用性做法，默认不进入生产链路；材料没有给出它们与 Agent-Reach/fatsearch/Lightpanda 的集成命令。

## 适用与不适用
适用：
- 已有能执行 shell 的 agent；Claude Code、Cursor、Windsurf 不需额外设置，OpenClaw 先开 exec。
- 想先用最小范围验证 Agent-Reach：`--dry-run` 预览、只用默认零配置渠道、固定 `agent-reach doctor`。
- 有多个可替代渠道，想失效时只调路由顺序。
- 要读网页、YouTube 字幕、RSS、GitHub、B站、V2EX 等零配置渠道。
- 读网页/PDF 且上下文预算敏感，愿意按 fatsearch 先大纲、按节读。
- 要绕过 JS 渲染页、captcha 或拦截页，并愿意自备 Oxylabs/Bright Data/Decodo。
- 要 JS 渲染、点击、表单、Cookie、自定义 Header、代理、网络拦截或 adblocker，想用比 headless Chrome 更轻的浏览器。
- 已有 Puppeteer/Playwright 脚本，想通过 CDP 换引擎；或 MCP 客户端要直接拿浏览器工具。
- 想先用自然语言跑通再固化成 PandaScript 回放。
- 想验证把浏览器自动化作为技能交给编码 agent；可小范围试 Playwright CLI、BrowserAct、agent-browser、Ruin Everything。
- 需要复用本地 Chrome 登录态、后台标签页执行、在授权站点提交表单并留存 Ashby 回执，且接受 Ruin Everything 是 30 stars 的早期项目。

不适用：
- agent 不能执行 shell；OpenClaw 未开 exec；fatsearch 需安装 CLI 并注册 MCP。
- 想一次全量接入所有登录态渠道；登录态渠道有反爬/封号风险。
- 想用它评测产出质量；Agent-Reach 只验证渠道可用，fatsearch/Lightpanda 基准为作者自测，agent-browser 只有 star 指标，Ruin Everything 只有 README 自述与夹具/局部观察。
- 想靠它做主动推进或定时触发；Agent-Reach 只给 feedparser 解析，fatsearch 明确 no daemon，BrowserAct/agent-browser 无调度说明，Ruin 只有 `watch_ashby_receipt` 的 Ashby 监听，不是通用调度器。
- 打算从 PyPI 安装同名包。
- 要读扫描版 PDF（OCR，fatsearch 返回 `! no_text`）、DOCX/XLSX（`! not_in_v1 zip`）、登录墙后页面，或需本地模型做语义近似。
- 要求必须通读全文才能下结论；fatsearch 默认只给大纲。
- 要求稳定发行版而非 nightly：Lightpanda 只有 nightly；agent-browser 是 Vercel Labs 实验产品。
- Windows 想要原生 Lightpanda 二进制，或在 Alpine/musl、Android/Termux 直接跑；Windows 走 WSL2，Alpine 报 `cannot execute: required file not found`。
- 要求 Lightpanda 在所有站点与 Chrome 完全一致。
- 要求一条已验证、可复现的 Playwright CLI 标准流程；原文第二步被截断。
- 没有可执行 shell 且能加载 Skill 的 agent，或机器不能联网装 BrowserAct Skill。
- 想直接全量采用 BrowserAct 的 stealth、CAPTCHA 或多账号；无成功率/成本数据，核心 stealth 需登录，代理和超过 5 个 stealth browser 需付费。
- 未获授权抓取受保护页面、处理 CAPTCHA 或做多账号操作。
- 需要 agent-browser 的时间/事件/状态触发或调度器。
- 要求用 README 直接配置 agent-browser 的 auth vault、域名允许列表、动作策略、内容边界。
- 不想首次安装浏览器/联网，或从源码构建但环境不满足 Node.js 24+、pnpm 11+、Rust。
- 想把 agent-browser 的“快照紧凑更适合 agent”当已验证结论。
- 想用 Ruin Everything 导入另一个 Chrome 配置的登录态；它只复用自己持久配置目录中的登录。想在非 Ashby 站点查询通用回执；只有 Ashby 有 `get_ashby_receipt`。想把它当通用站点自动化或调度器；站点支持是特定流程，短信/邮件/图形验证依赖额外条件。不接受明文密码 vault；自动登录 vault 存明文密码 `~/.ruin/auth_vault.json`。未授权账号或高风险账号；验证码/验证流程可能涉及条款与合规风险。

## 前置条件
**Agent-Reach**
- agent 能执行 shell；OpenClaw 先开 exec：
```bash
openclaw config set tools.profile "coding"
```
或 `~/.openclaw/openclaw.json`：
```json
{ "tools": { "profile": "coding" } }
```
重启：`openclaw gateway restart`。
- Node.js、gh CLI、mcporter；yt-dlp、feedparser 随 CLI 自带；登录态渠道额外需要 OpenCLI 或 Cookie-Editor 导出 Cookie。
- 凭据只存 `~/.agent-reach/config.yaml`，权限 600；不要从 PyPI 装同名包。

**fatsearch**
- macOS/Linux/Windows；有 Homebrew/npm/cargo 之一或能跑安装脚本；不需要账号；provider key 可选；只装免费通道时 JS 页面/captcha/拦截页抓不到，网页搜索也用不了；代理侧需能注册 MCP；无 daemon、无浏览器内核；二进制 17–21 MB。

**Lightpanda**
- Linux x86_64/macOS 或 WSL2；Windows 走 WSL2；Android/Termux 不可用；Alpine/musl 报 `cannot execute: required file not found`，换 Debian/Ubuntu 或源码编译。
- 安装：Homebrew nightly、Arch AUR、Linux 二进制、Nix、Docker CDP。
- `agent` 模式需模型 API key 或本地模型；`--no-llm` 进基础 REPL；CDP/MCP 路线不要求先跑自然语言 agent。
- 关闭遥测：`LIGHTPANDA_DISABLE_TELEMETRY=true`；不要 core dump：`LIGHTPANDA_DISABLE_CORE_DUMP`；抓第三方站点带 `--obey-robots`。

**Playwright CLI（做法 E，试验性）**
- Node.js 20+；能运行 Claude Code；npm 可全局安装；目标站点允许抓取；需要登录态另给凭据与授权；原文在 `playwright-cli install --skills` 处截断，后续步骤未给出。

**BrowserAct（做法 F，试用性）**
- agent 能执行 shell 并加载 Skills，机器可联网；README 声明兼容 Windows/macOS/Linux 及 Claude Code、Cursor、VS Code、OpenCode、OpenClaw、Codex、Gemini CLI 等。
- 本地登录态需 Chrome profile 或 CDP attach；无登录批处理用 stealth 隐私模式；多开用 stealth 固定身份。
- stealth 需 BrowserAct 登录；代理和超过 5 个 stealth browser 需付费；`stealth-extract`、`remote-assist` 登录后免费。
- 浏览器创建/删除、Profile 导入、代理变更、安全与隐私开关需显式批准，且此前批准不延续。
- 只对已授权页面使用；CAPTCHA、代理轮换、多账号可能涉及条款与合规风险。

**agent-browser（做法 G，试用性）**
- Node/npm；首次联网下载浏览器；`npm install -g agent-browser` 后 `agent-browser install`；Homebrew 后同样 `install`；Linux 用 `--with-deps`；不装可用 `npx agent-browser open example.com`。
- 执行者有 shell 权限；agent harness 支持 skill 机制或能改 AGENTS.md。
- 平台：macOS ARM64/x64、Linux ARM64/x64 glibc 与 musl、Windows x64；Apache-2.0。
- 源码构建要求 Node.js 24+、pnpm 11+、Rust。
- Security 文档在 `agent-browser.dev/security`，本次材料未含字段与默认值。
- 默认 daemon 在 1 小时无命令后关闭 headless 浏览器并退出；session persistence 会先保存状态。

**Ruin Everything（做法 H，试用性）**
- Python 3.11+、Google Chrome、uv；MCP 客户端能运行 `uvx`。
- `ruin browser` 在 `127.0.0.1:9222` 启动或重连 Chrome，持久配置目录 `~/.ruin-everything/canvas-browser`；必须在这个配置里登录目标站点，不会导入另一个 Chrome 配置的登录态。
- 命令退出后 Chrome 和任务标签仍保持打开。
- 自动登录 vault 把明文密码存 `~/.ruin/auth_vault.json`，权限 0600，不进入工具结果；可用 `RUIN_LOCAL_AUTH_VAULT=0` 禁用该客户端自动监听启动。
- 短信读取需 macOS Messages 权限；邮件流程需 Outlook Web 已登录；部分图形验证需本地 Ollama 视觉模型。
- 账号辅助需 `ruin identity` / `ruin ats-setup`；只应在授权账号上使用。
- 仓库仅 30 stars，成熟度有限；站点支持是特定流程，不少流程仅浏览器夹具验证。

## 操作步骤
先做 A；需要精读网页/PDF 且 token 敏感时试 B；需要登录态渠道再进 C；需要 JS 渲染、浏览器交互或 MCP 浏览器工具时试 D。E、F、G、H 都是试用性做法，默认不进生产链路。材料没有给出这些工具之间的集成命令，只并列。

### 做法 A：最小可行试用 Agent-Reach
1. 预览：
```bash
agent-reach install --env=auto --dry-run
```
2. 默认安全检查安装：
```bash
agent-reach install --env=auto
```
也可把这句话给 Agent：
```
帮我安全检查并安装 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
```
明确允许修改当前机器时加 `--system`：
```bash
agent-reach install --env=auto --system
```
3. 体检：
```bash
agent-reach doctor
```
4. 装好即用，示例：“帮我看看这个链接” → `curl https://r.jina.ai/URL`；“这个 GitHub 仓库是做什么的” → `gh repo view owner/repo`；“这个 YouTube 视频讲了什么” → `yt-dlp` 字幕；“B站搜一下 AI 教程” → `bili search`；“全网搜一下 LLM 框架对比” → Exa；“订阅这个 RSS” → `feedparser`。

### 做法 B：上下文预算敏感时，用 fatsearch 按大纲/分节读网页或 PDF
1. 安装任一：
```sh
brew install fatsearch/tap/fatsearch
curl -fsSL https://fatsearch.com/install.sh | sh
npm i -g fatsearch
cargo install --locked fatsearch
```
包名 `fatsearch`，命令 `fats`；Homebrew/npm/安装脚本加 `fatsearch` 别名，`cargo install` 只加 `fats`。
2. 可选配置 provider key：
```sh
fats setup
fats setup oxy       # 也可 bd / decodo / gh
printf %s "$KEY" | fats setup oxy
fats setup import-env
fats setup oxy off
fats setup oxy on
fats setup free off
```
key 写入 key 目录 `auth.json`（0600），只发对应 provider；`auth.json` 是唯一 key 来源，不使用环境变量；替换时旧文件保留为 `auth.json.bak`。
3. 接入 MCP：
```sh
claude mcp add --scope user fats -- fats mcp
codex mcp add fats -- fats mcp
{"mcpServers": {"fats": {"command": "fats", "args": ["mcp"]}}}
```
代理侧出现一个 MCP server `fats`，只暴露一个工具 `fats(cmd)`，工具卡约 60 token。
4. 装技能说明：
```sh
npx skills add fatsearch/fatsearch
gh skill install fatsearch/fatsearch
```
或读取固定 release 的 SKILL.md；给代理看的纯 Markdown：`https://fatsearch.com/llms.txt`。
5. 日常读取：
```sh
fats <url>
fats u1#3
fats u1 price
fats u1 links
fats l4
fats rust async runtime
fats gh rust markdown
fats ./report.pdf
fats stats
```
先估算：`fats https://www.nytimes.com/ dry:true`。其他修饰符：`limit:20` `country:de` `js:true` `wait:30` `fresh:true`；`fats help`、`fats guide`。
6. 关闭遥测任选：`fats setup telemetry off`、`FATS_TELEMETRY=0`、`DO_NOT_TRACK=1`；先 `fats telemetry show` 看清发什么。
7. 用边界样本验证：扫描版 PDF、DOCX、登录墙页面各试一次，看到 `! no_text`、`! not_in_v1 zip` 或读不到内容，判断是否适合。

### 做法 C：按需解锁需要登录态的渠道
直接对 Agent 说“帮我配 XXX”。GitHub 说“帮我登录 GitHub”解锁私有仓库、Issue/PR、Fork。Twitter/X Cookie 必须由用户用 Cookie-Editor 手工导出；保存后仅供 `agent-reach doctor` 检查配置；直接运行上游 `twitter` 前仍需在当前进程设置 `TWITTER_AUTH_TOKEN` 和 `TWITTER_CT0`。B站搜索+视频详情用 bili-cli，无需登录；字幕需 OpenCLI。Reddit 无零配置路径，匿名接口已被封；桌面装 OpenCLI 或 rdt-cli + Cookie。Facebook/Instagram 桌面装 OpenCLI 复用 Chrome 登录态。小红书：OpenCLI 只用已有 Chrome 会话；MCP/存量工具用 Cookie-Editor 导出后配置；`agent-reach configure xhs-cookies` 不会把 Cookie 注入 OpenCLI/Chrome。LinkedIn/Boss直聘/雪球/小宇宙播客：说“帮我配 XXX”；Boss直聘由 Agent 打开专用 Chrome，你手动登录。安全：凭据只存 `~/.agent-reach/config.yaml` 权限 600；用 Cookie 登录的平台务必用专用小号；本地电脑不需要代理，服务器部署才需要（~$1/月）。

### 做法 D：需要 JS 渲染或浏览器交互时，用 Lightpanda
选哪条：只要网页变模型可读文本 → D1；已有 Puppeteer/Playwright 想换引擎 → D2；MCP 客户端要浏览器工具 → D3；自然语言跑通再固化 → D4。
#### D1：网页转文本
1. 安装任选：
```console
brew install lightpanda-io/browser/lightpanda
yay -S lightpanda-nightly-bin
curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && chmod a+x ./lightpanda
nix run github:lightpanda-io/browser -- --help
```
2. 校验：`./lightpanda version`
3. 抓 URL 输出 Markdown：
```console
./lightpanda fetch --obey-robots --dump markdown --log-format pretty --log-level info https://demo-browser.lightpanda.io/campfire-commerce/
```
可换 `--dump html`、`--dump png > page.png`、`--dump pdf > page.pdf`、`--dump structured_data`。
4. 异步页面用 `--wait-until`、`--wait-ms`、`--wait-selector`、`--wait-script`。

#### D2：给 Puppeteer/Playwright 换引擎（CDP）
1. Docker 起服务：`docker run -d --name lightpanda -p 127.0.0.1:9222:9222 lightpanda/browser:latest`；或 `./lightpanda serve --obey-robots --log-format pretty --log-level info --host 127.0.0.1 --port 9222`；只允许本机用户时用 `./lightpanda serve --unix-socket /run/user/1000/lightpanda.sock`。
2. 脚本 connect 指向 `browserWSEndpoint: "ws://127.0.0.1:9222"`，其余不变。
3. WebDriver Bidi：`--protocol webdriver`；两个协议可同时开：`--protocol webdriver --protocol cdp`。

#### D3：接入 MCP 客户端
stdio 配置：
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
多 agent 共用进程用 HTTP：`lightpanda mcp --port 9223`，向 `http://host:9223/mcp` POST JSON-RPC。不带 `Mcp-Session-Id` 的 `initialize` 会新建会话；后续带上保持隔离；相同 id 共享页面/Cookie/内存。用 `session_new`/`session_list`/`session_close` 管理；`DELETE /mcp` 带 session id 关闭。`run` 工具执行 PandaScript，默认超时 60000ms；脚本结束页面关闭但 Cookie/storage 保留。也有 `lightpanda-io/agent-skill`。

#### D4：自然语言跑一遍再固化
```console
./lightpanda agent
./lightpanda agent --task "top story on news.ycombinator.com?"
./lightpanda agent --no-llm
./lightpanda run session.js
cat session.js | ./lightpanda run -
./lightpanda agent --provider gemini --task "..."
./lightpanda agent --list-models
```
支持 Anthropic、OpenAI、Gemini、Vertex AI、Mistral、Hugging Face、Vercel AI Gateway、OpenRouter、OpenAI 兼容端点、Ollama/llama.cpp/LLMD。跑通后 `/save` 导出 PandaScript，再用 `lightpanda run <script>.js` 回放；脚本确定性、不消耗 token。

#### D5：运维/合规
`LIGHTPANDA_DISABLE_TELEMETRY=true` 关遥测；`LIGHTPANDA_DISABLE_CORE_DUMP` 不生成 core dump；抓第三方站点注意合规，示例带 `--obey-robots`。

### 做法 E（试验性）：用 Playwright CLI + skills 让 Claude Code 自然语言驱动浏览器
来源只有一条推文，正文在第二步被截断；只把原文两条命令当可照做部分。
1. `node -v` 确认 v20+。
2. `npm install -g @playwright/cli@latest`。
3. 在项目目录执行 `playwright-cli install --skills`；是否需额外装浏览器内核用 `playwright-cli --help` 确认。
4. 在 Claude Code 中发起抓取任务；原文没给示例提示词，调研报告自拟的待验证写法是：
```text
用 playwright 打开 https://example.com，抓取列表页每一条的标题、链接、日期，
翻完所有分页，结果输出为 CSV。遇到需要登录或 robots 禁止的页面就停下并告诉我。
```
5. 记录人工投入时间、人工干预次数、是否改代码、字段完整率/准确率、翻页/渲染失败率、合规检查是否主动执行，与手写脚本对照。

### 做法 F（试用性）：用 BrowserAct Skills 给编码 agent 增加浏览器执行层
依据 README；缺详细文档；反封锁、token 效率、账号不被标记、零干扰并发都是作者主张。
1. 安装 Skill：
```
Install browser-act. Skill source: https://github.com/browser-act/skills/tree/main/browser-act . Verify it works after installation.
```
2. 每会话探测：`browser-act get-skills core --skill-version 2.0.2`。
3. 选模式：云端托管由 BrowserAct 在真实云浏览器构建并测试可复用 Bot；本地适合复用本地 Chrome 登录态或嵌入自有 agent。登录态用 chrome 模式 profile import 或 CDP attach；无登录批处理用 stealth 隐私模式；多开用 stealth 固定身份。
4. 受保护页面抽取（登录后免费，仅授权页面）：`browser-act stealth-extract https://example.com`。
5. 单任务自动化：
```
browser-act --session my-task browser open <id> https://example.com
browser-act --session my-task state
browser-act --session my-task click 3
browser-act --session my-task input 2 "hi"
```
`state` 返回带索引可交互元素，用索引操作。
6. 并发隔离：不同任务用不同 `--session`；账号隔离用不同 browser/profile，不要只换 session。敏感操作需显式批准，且此前批准不延续。
7. 卡住时人工接管：`remote-assist` 登录后免费，生成实时 URL 由用户接管，完成后 agent 继续；README 未给具体命令。
8. 重复网站批量化 Skill：
```
Install browser-act-skill-forge. Skill source: https://github.com/browser-act/skills/tree/main/browser-act-skill-forge . Verify it works after installation.
```
然后描述需求，例如 `Forge a Skill that extracts job listings from LinkedIn — title, company, salary, URL. I'll run 300 keywords later.`
9. 安全边界：敏感操作确认门禁在 Skill 层强制，不是配置开关；不要预授批量权限。

### 做法 G（试用性）：用 agent-browser 的 snapshot→动作→复查循环让 agent 操作浏览器
依据 README；除 star 外无效果数据；Vercel Labs 实验产品。
1. 安装：
```bash
npm install -g agent-browser
agent-browser install
```
替代：`brew install agent-browser && agent-browser install`；Linux `agent-browser install --with-deps`；临时 `npx agent-browser open example.com`。
2. 手工跑核心循环：
```bash
agent-browser open example.com
agent-browser snapshot -i
agent-browser click @e1
agent-browser get url
agent-browser close
```
三条硬规则：ref 只描述快照那一刻，导航/DOM 变化后重新 `snapshot`；也支持 CSS selector、文本、XPath、语义定位器，如 `agent-browser find role button click --name "Submit"`；目标隐藏、禁用、视口外或被遮挡时 click 会失败报错，处理遮挡后重新 snapshot 再试。
3. 装载 skill：
```bash
agent-browser skills get core
agent-browser skills get core --ref commands
agent-browser skills get core --full
agent-browser skills list
npx skills add vercel-labs/agent-browser
```
或在 `AGENTS.md` 加：
```markdown
Use `agent-browser` for browser automation. Before the first use, run
`agent-browser skills get core` and follow it.
```
4. MCP：`agent-browser mcp`。
5. 会话隔离：每个 `--session` 有自己的 daemon 和浏览器；默认 1 小时无命令后关闭 headless 浏览器并退出；session persistence 会先保存状态，原文未给具体配置命令。
6. 换引擎/连已有 Chrome/云浏览器：`--cdp`/`--auto-connect` 挂已运行 Chrome，`--engine` 换 Lightpanda/Obscura，驱动 iOS 模拟器 Mobile Safari，或接 Browserbase/Browserless/Browser Use/Kernel/AgentCore；完整配置查文档。
7. 源码构建需 Node.js 24+、pnpm 11+、Rust：
```bash
pnpm install
pnpm build:source
pnpm link --global
agent-browser install
```
8. 最小试用：选一个高频、步骤固定的浏览器任务，按 quick start 五步手工跑通，再把 AGENTS.md 指令加进 agent，让它按 snapshot→动作→复查跑同一任务 5～10 次，并用现有做法对照。
9. 安全配置：auth vault、domain allowlists、action policies、content boundaries 另读 `agent-browser.dev/security`。

### 做法 H（试用性）：用 Ruin Everything 复用本地 Chrome 登录态并留存提交回执
依据 yuki4266/ruin-everything README；有可复制命令、MCP 配置和工具接口，但站点覆盖有限、不少流程仅浏览器夹具验证，仓库仅 30 stars。只用于低风险、可复核、已授权任务。
1. 启动共享浏览器。前提：Python 3.11+、Chrome、uv。Ruin 在 `127.0.0.1:9222` 启动或重连 Chrome，持久配置目录 `~/.ruin-everything/canvas-browser`；在这个配置里登录目标站点，它不会导入另一个 Chrome 配置的登录态；命令退出后 Chrome 和任务标签仍保持打开。
```sh
uvx --from 'ruin-everything @ git+https://github.com/yuki4266/ruin-everything.git@main' ruin browser
```
2. 连接 MCP。前提：MCP 客户端能运行 `uvx`；加入配置并重启连接。MCP 服务本身不需要 API key，智能体用自己的模型连接。
```json
{
  "mcpServers": {
    "ruin-everything": {
      "command": "uvx",
      "args": [
        "--isolated", "--refresh", "--from",
        "ruin-everything @ git+https://github.com/yuki4266/ruin-everything.git@main",
        "ruin-mcp"
      ],
      "env": { "RUIN_AUTO_UPDATE": "0" }
    }
  }
}
```
使用已发布包时，把 Git 源替换为 `ruin-everything`。
3. 发起第一个只读任务。向 agent 下指令，例如：
```
Use Ruin to open https://example.org and tell me the page title and visible links.
```
入口是 `ruin_browser(operation="navigate", url="https://example.org")`，后续调用使用返回的当前 URL。
4. 配置账号辅助（可选）。前提：需要持久化检出且只应在授权账号上使用。运行 `ruin identity`，在后台编辑标签页填写资料，决定是否启用自动注册；运行 `ruin ats-setup` 单独启用 ATS 密码恢复。
5. 上传本地文件（可选）。前提：已知精确标签页 URL 和绝对文件路径。调用 `ruin_browser(operation="upload")` 或别名 `set_files`；页面及其 frame 中只有一个文件输入时可省略 `selector`，多输入时指定目标输入；也可走显式 drop-area 路径。
6. 提交表单。前提：获得授权并使用精确当前 URL 和可见按钮文字。调用 `ruin_action` 提交；它会检查点击后的验证步骤。验证码被清除只是前进一步，站点回执才是提交证据。
7. 留存 Ashby 回执。前提：任务在 Ashby 站点。用 `watch_ashby_receipt` 监听原始 Ashby 标签页的确认并保存，之后用 `get_ashby_receipt` 在不打开 Chrome 的情况下查询。没有记录表示结果未知；非 Ashby 站点不要假设有通用回执，需人工另行留存站点确认。
8. 可选引擎切换。安装 Patchright：`pip install -e ".[patchright]"`；设置 `RUIN_BROWSER_ENGINE=patchright`，或把 `{"engine":"patchright"}` 保存到 `~/.ruin-everything/browser-engine.json`；切换后重启现有 runtime 客户端和 vault。
9. 控制敏感存储。自动登录 vault 把明文密码存到 `~/.ruin/auth_vault.json`，权限 `0600`，不进入智能体工具结果；可设置 `RUIN_LOCAL_AUTH_VAULT=0` 禁用该客户端的自动监听启动。不要在不受控机器上保存生产密码。
10. 开发检出时跑回归测试：
```sh
python -m pip install -e '.[agent]'
python -m playwright install chromium
RUIN_AUTO_UPDATE=0 RUIN_RULE_UPDATES=0 python -m unittest discover -s tests -v
```

### 维护：更新与卸载 Agent-Reach
更新：
```
帮我更新 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/update.md
```
卸载：
```bash
agent-reach uninstall
agent-reach uninstall --dry-run
agent-reach uninstall --keep-config
pip uninstall agent-reach
```
`agent-reach uninstall` 会清除 `~/.agent-reach/`（含 token/cookie）、各 Agent 的 skill 文件、mcporter 中的 MCP 配置。

## 怎么判断变好了
- 渠道可用性：`agent-reach doctor` 给出每个渠道状态、当前实际后端、坏掉的修复处方。
- 改动可控性：`--dry-run` 先看到会做什么；`--system` 由你显式决定，默认只检查不改文件、不写 skills 目录。
- 默认范围：安装后默认只激活 6 个零配置渠道，没有点名不装登录态渠道。
- 跑通示例任务：读链接、读 GitHub、读 YouTube 字幕、B站搜索、Exa 搜索、RSS 解析各试一次。
- fatsearch 的 token/成本可见性：`fats stats` 逐次列 provider、毫秒、成本、token；`dry:true` 预估花费；用真实页面/PDF 小范围试用后再推广。
- fatsearch 的缺失能力显式：缺失以 `!` 行说明缺什么、怎么办，且 Never silence。
- 不要用作者 benchmark 直接 adopt：fatsearch 效果数字来自作者自发布 benchmark，项目 48 stars、v0.2.x 早期。
- Lightpanda 最小对比：用 Docker 或二进制启动，`fetch --dump markdown` 和 MCP/agent 模式各跑真实采集与操作任务，与 Chrome + Playwright 对比成功率、耗时、内存。其自测为 AWS EC2 m5.large、933 个真实网页，100 页峰值内存 123MB vs Headless Chrome 2GB（约 16 倍更少），执行时间 5s vs 46s（约 9 倍更快）；作者自测，不是第三方评测。
- Playwright CLI 最小对照：选静态页、JS 渲染页、翻页列表页各一个，A=手写脚本或手动复制，B=Claude Code 自然语言驱动 Playwright，任务目标与字段相同；记录人工投入时间、人工干预次数、是否改代码、字段完整率/准确率、翻页/渲染失败率、合规检查是否主动执行。判定：若静态页和列表页 B 组显著省时、无需改代码、准确率不低于人工核对基准，可保留为可选工具；若只在静态页成立，降级为特定场景注记。
- BrowserAct 最小试用：选 3 类低风险任务各 1 个（公开页面字段抽取、已登录内部系统只读查询、需人工接管的登录/验证码场景且获授权）；每任务独立 `--session`，并行用不同 browser/profile；记录完成率、字段准确率、CAPTCHA/封锁、remote-assist、接管耗时、串号、总耗时和费用；建议每类重复例如 10 次再判断。
- agent-browser 最小试用：选一个高频、步骤固定的浏览器任务，装完 CLI 按 quick start 五步手工跑通，再让 agent 按 snapshot→动作→复查跑 5～10 次，与人工/一次性 Playwright/其它工具对照。指标：任务成功率、人工接管次数、`snapshot -i` 文本体积 vs 整页 HTML、总命令数/token、端到端耗时、假成功次数、失败时能否靠 `console`/`errors`/`screenshot` 定位。判定：成功率不低于现状且人工介入下降，或同等成功率下搭建维护成本更低，才扩大。
- Ruin Everything 最小试用：只用测试账号和低风险站点，不要先用生产密码或高价值账号；在 `~/.ruin-everything/canvas-browser` 中登录测试站点；先做只读任务（导航、读标题/链接、提取文本）确认 MCP 和后台标签页；再做允许自动化测试的表单提交，记录是否出现验证步骤、是否需人工接管、站点是否给确认页或回执；Ashby 用 `watch_ashby_receipt` 保存、`get_ashby_receipt` 查询；与人工基线对比完成率、人工干预次数和耗时、Chrome 重启后会话复用成功率、提交后能否拿到可核验回执、是否出现“声称成功但没有回执”的假成功、凭据泄露或越权。判定：只读和后台执行稳定、提交能拿到可核验回执、无凭据泄露/越权，可扩大；若回执不稳定或频繁人工处理验证码，只保留只读/辅助，不把自动提交写入手册。可先用 `RUIN_LOCAL_AUTH_VAULT=0` 关闭自动登录监听，并避免启用自动注册。
- 试用时长：材料没给 Agent-Reach 和 fatsearch 的试用时长；Lightpanda 只建议先小范围对比；Playwright CLI 最小试用设计为半天内完成；BrowserAct 建议每类任务重复足够次数（例如 10 次）；agent-browser 建议同一任务跑 5～10 次；Ruin Everything 建议先只读再可复核提交，按任务重复观察。至少先完成上述最小任务对比，再决定是否扩大。

## 常见坑
- 从 PyPI 安装同名包不是本项目。
- `agent-reach configure xhs-cookies` 不会把 Cookie 注入 OpenCLI/Chrome。
- Twitter Cookie 保存后不等于可直接跑上游命令；运行前仍需设置 `TWITTER_AUTH_TOKEN` 和 `TWITTER_CT0`。
- Reddit 没有零配置路径，匿名接口已被封。
- 用 Cookie 登录的平台用主账号有封号风险，务必用专用小号。
- 本地电脑不需要代理；服务器部署才需要（~$1/月）。
- 默认只激活 6 个零配置渠道；登录态渠道要点名才装。
- `--system` 才安装系统依赖、通过 MCP 接入 Exa、把 SKILL.md 写入 skills 目录；默认只检查不改文件。
- yt-dlp 仍适合 YouTube，但作者自述 2026-06 已被 B站风控 412 封死，B站改用 bili-cli；渠道换代要自己盯。
- Agent-Reach 的验证只到渠道是否可用，不评价内容摘要或搜索结果是否切题。
- RSS 只给 feedparser 解析，没有定时轮询、事件触发或状态触发配置。
- fatsearch 包名 `fatsearch`，命令 `fats`；`cargo install` 只加 `fats`。
- fatsearch 不配 provider key 也能用免费通道，但 JS 页面、captcha、拦截页抓不到，网页搜索也用不了。
- provider key 不要粘进聊天：走 `fats setup` 一次性表单、管道或 `fats setup import-env`；`auth.json` 是唯一 key 来源。
- `fats setup free off` 会关掉免费通道，所有页面都走 provider，每页都花钱；临时停用某 provider 用 `off`/`on`。
- fatsearch 没有 daemon，没有 watch、cron、回调、重试队列。
- fatsearch 读扫描版 PDF 返回 `! no_text`，DOCX/XLSX v1 返回 `! not_in_v1 zip`，登录墙后页面读不到；`match:near`/`match:topic` 需本地模型。
- fatsearch 默认只给大纲、按节读；必须通读全文的任务要专门验是否被大纲削掉信息。
- fatsearch 效果数字来自作者自发布 benchmark，项目 48 stars、v0.2.x 早期。
- Lightpanda 只有 nightly 构建，不要直接替换唯一生产链路。
- Linux 二进制链接 glibc，Alpine/musl 报 `cannot execute: required file not found`；Android/Termux 不可用；Windows 走 WSL2。
- 抓第三方站点注意合规；示例带 `--obey-robots`。
- MCP HTTP 模式下不带 `Mcp-Session-Id` 的 `initialize` 会新建会话；后续要带上。相同 id 会共享页面/Cookie/内存，多个 agent 协同时才这么做。
- `run` 结束页面关闭但 Cookie/storage 保留，登录态会带到下一次 `run`。
- Lightpanda 基准是作者自测，只有 nightly，结论提示无渲染引擎；不要因 16 倍内存、9 倍速度直接替换 Chrome + Playwright。
- Playwright CLI 原文在第二步被截断；`playwright-cli install --skills` 之后该在哪个目录、还要做什么、提示词怎么写都没有；先用 `--help` 查清。
- Playwright CLI 只有一条推文来源（46 赞、1 转发、10 回复），“almost any website”“zero lines of code”是作者主张，没有案例、截图、抓取结果、成功率或失败情形。
- 原文没说明是否还需额外安装浏览器内核；npm 安装成功不等于浏览器能启动。
- 原文没讨论封禁、速率限制、版权与合规风险；不要对登录、强反爬或高频站点直接跑。
- 不要把做法 E 当已验证标准流程或生产链路。
- BrowserAct 材料只有 README，缺 docs/installation.md、quick-start.md、skills.md 等；remote-assist、云端托管、Skill Forge 的具体命令和异常处理无法核对。
- BrowserAct 的反封锁、token 效率、账号不被标记、零干扰并发是作者主张，没有测试方法、样本量、失败率或独立复现；不要因 6318 stars 和 MIT License 直接全量采用。
- BrowserAct 核心 stealth 需登录，代理和超过 5 个 stealth browser 需付费。
- CAPTCHA、代理轮换、多账号可能涉及条款与合规风险；只对已授权页面使用。
- BrowserAct 敏感操作确认门禁在 Skill 层强制，不是配置开关；不要预授批量权限，且此前批准不延续。
- BrowserAct 同浏览器多 session 只共享登录态但独立执行；账号隔离必须用不同 browser/profile，不要只换 session。
- BrowserAct 没有时间/事件/状态触发或调度器说明。
- `browser-act get-skills core --skill-version 2.0.2` 的 `2.0.2` 来自 README 示例；版本兼容范围未说明。
- agent-browser 是 Vercel Labs 实验产品，接口可能变；README 只有 46,053 stars、当日 +150，没有成功率、耗时或对照数据。
- `agent-browser install` 首次联网下载 Chrome for Testing；Linux 还要 `--with-deps`；不装可用 `npx` 临时跑。
- ref 只描述快照那一刻；导航/DOM 变化后必须重新 `snapshot`。
- 目标隐藏、禁用、视口外或被遮挡时 click 会失败报错；关掉遮挡、重新 snapshot、再重试。
- 默认 daemon 1 小时无命令后关闭 headless 浏览器并退出；长任务或保活要显式处理 session persistence，原文未给具体配置命令。
- 每个 `--session` 有自己的 daemon 和浏览器；不要以为不同 session 共享登录态，除非显式用同一会话/持久化。
- agent-browser README 没有时间/事件/状态触发或调度能力。
- auth vault、domain allowlists、action policies、content boundaries 只在 Security 文档链接里；要用必须另读 `agent-browser.dev/security`。
- “快照紧凑因而更适合 agent”“daemon + 每条命令一次短调用更好用”是作者主张，没有基准测试、任务成功率或对照实验。
- 从源码构建要求 Node.js 24+、pnpm 11+、Rust。
- 需要换引擎/连已有 Chrome/云浏览器时，`--cdp`/`--auto-connect`/`--engine` 的完整配置示例原文未给，执行前查文档。
- Ruin Everything 只复用 `~/.ruin-everything/canvas-browser` 自己的登录态，不会导入另一个 Chrome 配置；不要以为本机 Chrome 已登录就能直接用。
- Ruin 的自动登录 vault 用明文保存密码；不要在不受控机器上保存生产密码，可先用 `RUIN_LOCAL_AUTH_VAULT=0`。
- Ruin 的站点支持是特定流程而非通用能力；Workday/iCIMS 等为夹具加局部实时检查，生产布局会变；Greenhouse/Outlook 实时兼容性未验证。
- 验证码被清除不等于提交成功；只有站点回执才是证据。只有 Ashby 有 `get_ashby_receipt`/`watch_ashby_receipt`，没有记录表示结果未知。
- Ruin 没有通用时间/事件调度器；`watch_ashby_receipt` 主要限于 Ashby 回执监听。
- Ruin 上传要求精确当前标签页 URL 和绝对文件路径；多文件输入要指定 selector，不要假设总能自动定位。
- Ruin MCP 不需要 API key，智能体用自己的模型连接；连接的智能体可能把页面文本发给其模型提供方。
- Ruin 仓库仅 30 stars，成熟度有限；133 个回归测试是作者自述，未独立复核。
- 不要在未授权站点、生产账号或高风险账号上跑 Ruin 的自动注册/提交/验证流程；验证码与验证流程可能涉及条款和合规风险。

## 证据与来源
- Agent-Reach 做法 A、做法 C、维护步骤和大部分坑：Panniantong/Agent-Reach 调研报告。安装提示词、`install --env=auto`/`--dry-run`/`--safe`/`--system`、`doctor`、`uninstall`/`--dry-run`/`--keep-config`、OpenClaw 的 `tools.profile = "coding"` 与 `openclaw gateway restart`、各平台登录态口径，均来自该报告原文，属作者自述，没有第三方核验。仓库指标：88,184 stars、当日 +683（来自输入 metrics，非 README 正文）。渠道状态：yt-dlp 154K Star，YouTube 仍是最佳，但作者自述 2026-06 yt-dlp 被 B站风控 412 封死，已切换 bili-cli。效果验证只到渠道是否可用；主动推进证据较弱，RSS 只在需求列表提到更新通知，实现侧只给 feedparser 解析。报告建议把 Agent-Reach 状态从 study 上调为 try。
- fatsearch 做法 B：fatsearch/fatsearch 调研报告。安装命令、MCP 注册、`fats setup` 安全设计、`dry:true`/`fats stats`、遥测开关、能力边界来自报告与 README；作者自述，无第三方核验。项目 48 stars、v0.2.x 早期；效果数字来自作者自发布 benchmark；MCP 只暴露一个工具 `fats(cmd)`，工具卡约 60 token；无账号、无 daemon、无浏览器内核；二进制 17–21 MB；免费抓取每站点每秒最多一次请求；示例 `dry:true` 预估 up to $0.0040；`fats stats` 示例列出 1.2ktok、40.9ktok。
- Lightpanda 做法 D：lightpanda-io/browser 调研报告。安装命令、`fetch --dump`、CDP/MCP 配置、PandaScript、平台限制、遥测/core dump 环境变量来自报告与 README；作者自述，无第三方核验。自测基准：AWS EC2 m5.large、933 个真实网页，100 页峰值内存 123MB vs Headless Chrome 2GB（约 16 倍更少），执行时间 5s vs 46s（约 9 倍更快）；作者自测，不是第三方评测。项目只有 nightly 构建；结论提示无渲染引擎；建议与现有 Chrome + Playwright 对比成功率、耗时、内存。
- 三者关系：Agent-Reach 负责多渠道选型、安装、体检、路由；fatsearch 负责单页/PDF 的“先大纲、按节读”与成本可见；Lightpanda 负责 JS 渲染与浏览器交互。材料没有三者集成命令，本手册只并列；这是依据材料做的编排，不是原文集成说明。
- Playwright CLI 做法 E：@plusxbt 推文（46 赞、1 转发、10 回复）。`node -v` 要求 Node.js 20+、`npm install -g @playwright/cli@latest`、`playwright-cli install --skills` 来自原文；原文在第二步中途被截断，后续步骤、提示词、使用示例、成功率与失败案例缺失。调研报告结论是先做小范围试验，用耗时/人工干预次数/是否改代码对比手写脚本，不宜直接写进手册作为标准做法。第 4 步提示词是调研报告自拟待验证写法，不是原文内容。Playwright CLI 与前三者没有集成说明。
- BrowserAct 做法 F：browser-act/skills 调研报告。安装提示词、`get-skills`、`stealth-extract`、session 命令、三种浏览器模式、并发说明、remote-assist、Skill Forge、免费/付费表、兼容列表、MIT License、6318 stars 来自 README；作者自述，无第三方核验。材料缺 docs/installation.md、quick-start.md、skills.md；remote-assist、云端托管、Skill Forge 具体命令和异常处理无法核对。反封锁、token 效率、账号不被标记、零干扰并发是作者主张，没有测试方法、样本量、失败率或独立复现。CAPTCHA、代理轮换、多账号可能涉及合规风险，README 未展开。调研报告建议选 3 类低风险任务各 1 个、独立 session、不同 browser/profile，记录成功率/准确率/接管/串号/费用/合规事件，每类重复例如 10 次；这是建议，不是实测结论。
- agent-browser 做法 G：vercel-labs/agent-browser 调研报告。安装命令、quick start 五步、`snapshot -i` 的 ref 机制、点击失败报错、skills/MCP/源码构建命令、平台支持、Apache-2.0 来自报告与 README；作者自述，无第三方核验。项目状态：46,053 stars、当日 +150；README 有 npm 月下载徽章但文本没给具体数值；不是效果证据。作者主张“快照紧凑因而更适合 agent”“daemon + 每条命令一次短调用更好用”，没有基准测试、任务成功率或对照实验。安全内容在 `agent-browser.dev/security`，本次材料未包含。`npx skills add vercel-labs/agent-browser` 把 discovery skill 装进 harness，skill 是薄壳，运行时才拉 `skills get core`，从而与已装 CLI 版本对齐。调研报告建议选一个高频、步骤固定任务，手工跑通后让 agent 跑 5～10 次，对照现有做法记录成功率、人工接管、snapshot 体积 vs 整页 HTML、总命令数/token、端到端耗时、假成功次数、可诊断性；这是建议，不是实测结论。
- Ruin Everything 做法 H：yuki4266/ruin-everything 调研报告。`uvx` 启动命令、MCP JSON 配置、六个工具名、`ruin identity`/`ruin ats-setup`、上传/提交/Ashby 回执、Patchright 引擎切换、明文 vault 与 `RUIN_LOCAL_AUTH_VAULT=0`、回归测试命令来自 README；作者自述，无第三方核验。README 称 133 个回归测试在 Playwright 引擎下一次运行全部通过，源码/wheel 构建和 Twine 元数据检查也通过；作者自述，未独立复核。少量真实站点观察：ZhongAn/Moka/飞书招聘短信倒计时、ZhongAn 成功页和申请历史、Bilibili 图标挑战一次通过、携程手机验证、IEEE/Duke 重定向和 PDF 访问。更多流程只到浏览器夹具或局部观察：Greenhouse/Outlook 实时兼容性未验证；Workday/iCIMS 为夹具加局部实时对话框检查；Ashby 回执为本地回执和浏览器集成测试；ACM/Springer 由夹具覆盖。仓库仅 30 stars。局限：站点支持是特定流程而非通用能力；登录仍会过期，部分验证仍需人工；验证码/验证流程可能涉及站点条款和合规风险；自动登录 vault 以明文保存密码；连接的智能体可能把页面文本发给其模型提供方。调研报告建议用测试账号和低风险站点，先只读任务，再做可复核提交，Ashby 用回执查询，与人工基线对比完成率、人工干预、耗时、会话复用、提交回执和假成功；若回执不稳定或频繁人工处理验证码，只保留只读/辅助。
- 本手册把 Agent-Reach、fatsearch、Lightpanda 作为主链路候选，把 Playwright CLI、BrowserAct、agent-browser、Ruin Everything 标为试用性；这是依据材料边界做的编排，不是原文集成或效果证明。

## 依据的调研

- [Panniantong/Agent-Reach](../research/radar/2026-10-03/852-panniantong-agent-reach.md)：值得一试，把它作为「给 Agent 补互联网读取能力」的最小可行方案小范围试用：先 --dry-run，再只用默认零配置渠道，并固定用 `agent-reach doctor` 做体检。理由是原文给出了可照抄的安装/体检/更新/卸载流程和「首选+备选多后端路由」的可复用设计，但各渠道依赖平台反爬与登录态、作者自述频繁换代，稳定性必须自己验证，不宜直接全量采纳。
- [fatsearch/fatsearch](../research/radar/2026-10-22/5707-fatsearch-fatsearch.md)：值得一试，把 fatsearch 装成 Claude Code 的 MCP 工具，在“代理需要读网页或 PDF、但上下文预算敏感”的场景里小范围试用，先用 `fats stats` 和 `dry:true` 自己量 token 与成本，再决定是否推广。因为它给出可直接照抄的安装、MCP 注册和“先看大纲、按节读取”的操作流程，但效果数字全部来自作者自published benchmark，48 stars 的早期项目（v0.2.x），还不足以直接 adopt。
- [lightpanda-io/browser](../research/radar/2026-10-31/8886-lightpanda-io-browser.md)：值得一试，建议小范围试：先用 Docker 或二进制启动 Lightpanda，用 `fetch --dump markdown` 和 MCP / agent 模式各跑一条真实的网页采集与操作任务，并与现有 Chrome + Playwright 方案对比成功率、耗时和内存；理由在于 README 给出了可直接复制的安装、MCP 配置、PandaScript 录制回放流程，但只有 nightly 构建、基准为自测且无渲染引擎，兼容性必须在自家目标站点上验证。
- [@plusxbt: It is becoming f*cking dangerous: Claude Code turns into a web crawler for almost any website, and y](../research/radar/2026-11-01/9089-it-is-becoming-f-cking-dangerous-claude-code-turns.md)：值得一试，先做小范围试验：在 Node.js 20+ 环境安装 Microsoft Playwright CLI 并执行 skills 安装，让 Claude Code 用自然语言驱动浏览器抓取公开页面，再用「耗时/人工干预次数/是否改代码」对比手写脚本；原文只给出两步安装线索、第二步还被截断，没有流程细节和验证数据，因此不宜直接写进手册作为标准做法。
- [browser-act/skills](../research/radar/2026-11-04/10216-browser-act-skills.md)：值得一试，建议把 BrowserAct Skills 作为现有编码代理的浏览器执行层做小范围试用：先用 get-skills 探测环境，用独立 session 跑只读或低风险任务，并用 remote-assist 兜底；README 给出一手安装与命令，但关键稳定性和反封锁效果多为作者主张，且 stealth 能力需登录或付费，暂不宜直接 adopt。
- [vercel-labs/agent-browser](../research/radar/2026-11-06/10838-vercel-labs-agent-browser.md)：值得一试，照着 README 的 quick start 五步（open → snapshot -i → 对 ref 执行动作 → get/is 复查 → close）挑一个真实浏览器任务小范围试，并把 `agent-browser skills get core` 或对应的 AGENTS.md 指令装进 agent；理由是原文给出了可直接复制的安装命令、命令循环、失败语义和给 agent 的指令文本，但除 star 数外没有任何效果数据，且属 Vercel Labs 实验产品。
- [yuki4266/ruin-everything](../research/radar/2026-11-12/12873-yuki4266-ruin-everything.md)：值得一试，建议小范围试用：按 README 的 uvx 启动方式和 MCP 配置接入本地 Chrome，先在低风险、可复核的网页任务上验证登录复用、后台执行和回执留存；理由是它给出了可执行命令、配置和工具接口，但站点覆盖有限、不少流程仅浏览器夹具验证，且本地明文密码与验证码处理带来安全合规风险。
