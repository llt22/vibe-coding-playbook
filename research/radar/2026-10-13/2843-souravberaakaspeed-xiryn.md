# SouravBeraAkaSpeed/xiryn

- 结论：**值得一试**。在一台非主力、可装 Docker 的机器上按 README 的一键脚本（或手动 clone + npm run setup）装一份 Xiryn，配一个模型 key、建单个 agent 跑一个真实小任务（如 clone 仓库跑测试给 diff、或一次带引用的调研），重点验证沙箱隔离、hand-off 人工介入成本和 token 花费后再决定是否推广。README 提供了可直接复制的安装、配置、Telegram 配对与编码 agent 提示词，具备可照做性；但仓库仅 49 star、无第三方评测，定时/循环任务仍在 roadmap 未实现，故给 try 而非 adopt。
- 原文：https://github.com/SouravBeraAkaSpeed/xiryn
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T02:12:28.777Z

## 是什么

Xiryn（github.com/SouravBeraAkaSpeed/xiryn，MIT）是一个可自托管的个人 agent 运行环境。README 描述的核心机制：

- **每个 agent 一台独立 Linux 桌面**：一个 Docker 容器，内含 shell、持久 home 目录和 1280×800 桌面 + Chromium；首次使用时创建，空闲时停止；与宿主系统隔离，不读宿主的文件、屏幕，不动鼠标。
- **单体架构**：一个 Next.js 进程同时提供 UI、在进程内通过 AI SDK 跑 agent turn、并持有 SQLite（`data/xiryn.db`）。README 明确写“no queue, no worker, no backend of ours”。
- **模型可换**：README 列出 OpenAI / Anthropic / Google / xAI / Groq / Mistral / DeepSeek / OpenRouter / Ollama / LM Studio / 任意 OpenAI 兼容端点，可按 agent 单独选模型。
- **远程控制**：Telegram 机器人（本地 long-poll，无需公网 URL / 隧道 / 端口转发），只能被一个配对账号使用。
- **人工接管**：可实时看 agent 的桌面并“Take over”，交回时可附一句说明（如“I picked the 6:40 flight”），agent 看屏后继续。
- **凭据保险箱**：登录/卡号/UPI/个人信息用 AES-256-GCM 加密，密钥由操作系统钥匙串（macOS Keychain / Windows DPAPI / Linux Secret Service）保存；agent 只看到掩码（如“Visa ···· 4242”），由 Xiryn 自己往页面里填；每笔支付需用户逐次批准。

README 开头把它定位为 Muse / Grok Bot / Dots 的开源自托管替代（属宣传表述，见“证据与局限”）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 步骤 1：确认前提
- 一台有约 **4 GB 空闲磁盘**的电脑。
- **至少一个模型 provider 的 API key**（必需）。
- Firecrawl key 可选（用于快速搜索与正文读取）。
- 安装脚本会自行安装 Git、Node.js、Docker；Windows 上可能要求接受 Docker Desktop 条款或重启以启用 WSL 2。
- README 未声明操作系统版本下限，仅声明 Node **≥ 20.9**。

### 步骤 2：一键安装（前提：可执行 shell / PowerShell 脚本）

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/SouravBeraAkaSpeed/xiryn/main/setup.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/SouravBeraAkaSpeed/xiryn/main/setup.ps1 | iex
```

已经 clone 过仓库的话：macOS/Linux 跑 `./setup.sh`，Windows 双击 `setup.cmd`。

README 说明 setup 会依次做四件事（可据此核对每步是否成功）：
1. 装缺失的 **Git、Node.js、Docker**（Windows 走 `winget`/Docker Desktop，macOS 走 Homebrew，Linux 走 `get.docker.com` 装 Docker Engine）。
2. 把 Xiryn clone 到 `./xiryn` 并安装依赖。
3. 启动 Docker 并构建 agent 桌面镜像（首次需几分钟）。
4. 生成 `.env`，在 **http://127.0.0.1:6796** 启动。

失败重跑：脚本会跳过已完成部分。

### 步骤 3（替代方案）：手动安装（前提：已装 Node.js 20.9+ 与 Docker）

```bash
git clone https://github.com/SouravBeraAkaSpeed/xiryn.git
cd xiryn
npm install
npm run setup     # checks Docker, builds the agents' desktop image, creates .env
npm run dev
```

### 步骤 4：让编码 agent 代你装（README 给出的原样提示词，可整段粘贴到 Claude Code / Codex / Cursor）

```text
Install and start Xiryn for me — the open-source personal agent that runs on my own computer: https://github.com/SouravBeraAkaSpeed/xiryn

1. From my home folder, run Xiryn's setup without prompts. It clones Xiryn into ./xiryn (or reuses it), installs Git, Node.js and Docker if they're missing, installs the packages and builds the agents' desktop image, which takes several minutes the first time — let it finish:
   - macOS / Linux:  curl -fsSL https://raw.githubusercontent.com/SouravBeraAkaSpeed/xiryn/main/setup.sh | XIRYN_YES=1 XIRYN_NO_START=1 bash
   - Windows (PowerShell):  $env:XIRYN_YES="1"; $env:XIRYN_NO_START="1"; irm https://raw.githubusercontent.com/SouravBeraAkaSpeed/xiryn/main/setup.ps1 | iex
   (If you'd rather not pipe a script, clone the repo and run ./setup.sh or .\setup.ps1 inside it with the same two variables.)
   - If it stops and shows a command that needs my password, show me that command, wait for me to run it in my own terminal, then run the setup again.
   - If Docker Desktop was just installed or isn't running, ask me to open it and accept its terms (Windows may also ask for a restart). Wait until `docker info` works, then run the setup again.
   - Node.js may have been installed into ~/.xiryn/node/bin; add that to PATH in your shell if `node` isn't found.

2. Ask me for my keys. Explain each in one sentence with where to get it, and let me skip the optional ones:
   - Required, at least one model provider: OpenAI (OPENAI_API_KEY, platform.openai.com/api-keys), Anthropic (ANTHROPIC_API_KEY, console.anthropic.com), Google Gemini (GOOGLE_GENERATIVE_AI_API_KEY, aistudio.google.com/apikey) — or any other provider listed in .env.example, including a local Ollama or LM Studio.
   - Optional: FIRECRAWL_API_KEY (firecrawl.dev) for fast web search.
   - Optional: TELEGRAM_BOT_TOKEN to talk to my agents from my phone. Tell me how to get it: in Telegram, message @BotFather, send /newbot, choose a name and a username ending in "bot", and copy the token it replies with.
   Put what I give you into the matching lines of xiryn/.env. Never repeat the keys back to me, log them or commit .env.

3. Start Xiryn with `npm run dev` inside the xiryn folder, in the background. Wait until http://127.0.0.1:6796 responds, then open it in my browser.

4. Finish with a short summary: what got installed, which keys are set, how to start Xiryn next time (cd xiryn && npm run dev), and — if I added a Telegram token — that I should open Settings → Remote access in Xiryn and scan the QR code with my phone to pair it.
```

### 步骤 5：填 key 与启动（前提：安装已完成）

在应用 **Settings** 里粘贴 key，或写进 `.env`：

```bash
OPENAI_API_KEY=sk-...          # or any other provider
FIRECRAWL_API_KEY=fc-...       # optional: web search & reading
```

日常启动：

```bash
cd xiryn
npm run dev                    # or: npm run build && npm start
```

打开 `http://127.0.0.1:6796`。想连 Xiryn 本身也跑在容器里：`docker compose up -d`。

首次进去后在状态栏点一次 **alerts**，才允许桌面通知（agent 完成/失败/需要你时会有提示音与通知）。

### 步骤 6：配 Telegram 远程控制（前提：有 Telegram 账号）
1. 在 Telegram 里给 **@BotFather** 发 `/newbot`，复制返回的 token。
2. 把 token 粘到 **Settings → Remote access**。
3. 用手机扫二维码，点 **Start**。

可用命令（README 原样给出）：

```
/agents   pick an agent or squad      /new     start a fresh thread
/stop     interrupt the agent         /status  what's running
```

### 步骤 7：关键配置项（来自 README 的配置表；可在 `.env` 或 Settings 里改，**Settings 里的值优先**，只存于 `data/xiryn.db`）

| 变量 | 作用 |
| --- | --- |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY` | 托管模型 provider |
| `OLLAMA_BASE_URL`, `LMSTUDIO_BASE_URL`, `CUSTOM_BASE_URL` | 本地运行时与任意 OpenAI 兼容 API |
| `XIRYN_DEFAULT_MODEL`, `XIRYN_MAX_STEPS` | 默认 `provider/model`；每轮最大工具调用数 |
| `XIRYN_WORKSTATION_CPUS`, `XIRYN_WORKSTATION_MEMORY_GB` | 每台 agent 机器的资源上限（**默认 2 CPU、4 GB**） |
| `XIRYN_WORKSTATION_AUTO_STOP_MINUTES`, `XIRYN_WORKSTATION_AUTO_DELETE_MINUTES` | 空闲停止；用完即毁的机器 |
| `XIRYN_PHONE_TAKEOVER` | 设为 `off` 则 Telegram hand-off 不带手机端桌面链接 |
| `FIRECRAWL_API_KEY` | 网页搜索与阅读 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_ID` | 远程访问 |
| `XIRYN_TELEGRAM_NOTIFY` | 任务完成时的 Telegram 通知：`long`（≥1 分钟，默认）/ `all` / `off` |
| `XIRYN_DATA_DIR`, `XIRYN_ALLOWED_HOSTS` | 数据位置；自建代理后的额外主机名 |
| `XIRYN_URL` | Telegram hand-off 链接里指向的地址 |
| `XIRYN_UPDATE_CHECK` | `off` 关闭更新检查与 star 数获取 |

### 步骤 8：更新（前提：数据在 `data/xiryn.db`、vault、agent home 目录，更新不动这些）

```bash
cd xiryn
git pull
./setup.sh        # Windows: setup.cmd
```

容器方式：

```bash
cd xiryn
git pull
docker compose up -d --build
```

### 步骤 9：把权限交给它之前要做的事（README 的治理做法）
- 登录/卡/地址等敏感值在 **Settings → Vault** 录入，或在聊天里的安全表单录入；agent 永远看不到明文。
- 支付走“**Approve / I'll pay myself / Decline**”三选一（应用内或 Telegram 一键）。
- 遇到登录、支付、一次性验证码、CAPTCHA，agent 会**主动停下**并给出当前位置与剩余步骤，接管视图自动打开；配对 Telegram 时会给一个手机可用的桌面实时链接。
- 保存的登录只在其原始站点自动填充，已批准的卡只在获批站点可用（README 称“phishing-proof by design”）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**（AI 已能做、但还没想到交给它的工作）
README 给了可照做的能力清单，可当作“可外包任务”的候选池：
- 构建与调试：clone 仓库、安装依赖、跑测试、修失败项、给出 diff。
- 调研：搜索、读一手来源、产出带引用的摘要。
- 写作：launch post、文档、报告，以文件形式落在它的 workstation 上。
- 操作网页：填表单、比选项、备好一次预订或下单——但登录/支付/CAPTCHA 处会交还给人。
- 组队：把请求丢给一个 squad，由合适的专家接单。
README 的概括口径是：“凡是用终端 + 浏览器 + 桌面能完成的事”。

**2. 任务匹配**（什么工作适合怎样的模型、工具和协作方式）
- 按 agent 选模型：可给不同 agent 配不同 provider/模型（README 列出 11 类 provider，含本地 Ollama/LM Studio）。
- 按角色定义 agent：name、role、standing orders，各自独立模型。
- 分工方式：多个 agent 组成 squad，互相委派给“更合适的人”，各自跑在自己的机器上。
- 工具依赖差异：有 Firecrawl 走快速搜索+正文清洗；没有则用 agent 自带浏览器搜索阅读（README FAQ 明确这个降级关系）。
- 前提提示：本地模型必须**支持 tool calling** 才能按 README 的方式用。

**3. 条件供给**（需要提供哪些信息、工具、权限和反馈）
- 信息/密钥：至少一个模型 provider key；可选 Firecrawl key；可选 Telegram bot token。
- 工具与权限：Docker（否则只能聊天、记忆，不能跑代码或用桌面）；宿主机约 4 GB 磁盘；每台 agent 默认 2 CPU / 4 GB 上限；凭据进加密 vault；支付逐笔批准。
- 反馈回路：实时桌面可旁观、可 Take over、交回时带说明让 agent 从你的操作处续做；hand-off 时它明确说出“卡在哪、还剩什么”。
- 隔离条件：只绑 127.0.0.1，拒绝非 loopback 的 Host/Origin（README 称这也挡 DNS rebinding）；Telegram 只应答一个配对账号，配对码一次性、错猜后轮换；agent 只在自己容器内执行。

**4. 主动推进**（哪些工作可由时间、事件或状态触发并持续完成）
- README 已实现的持续机制：durable turns（关掉标签页任务继续跑，重开接回实时流）；agent 完成/失败/需要你时用提示音、桌面通知、Telegram 消息通知；workstation 空闲自动停止、可设用完即删（记忆留在磁盘）。
- **明确未实现**：roadmap 里“Scheduled and recurring tasks — standing goals that run while you sleep”仍是未勾选项。也就是说，按时间触发的定时/循环任务目前**不能照 README 做**，只能靠人手动发起或靠 durable turn 在单次任务内持续推进。

**5. 效果验证**（怎样判断确实改善了结果）
- README 里唯一直接的量化手段是 **Usage 页面显示每个模型、每个 agent 的 token 消耗**。
- 过程可观测性：可实时看桌面、可看 agent 给出的 diff、调研结果带引用来源。
- README 没有给出任何“效果变好”的评测方法、基线对比或通过标准。这一条基本需要自己设计（见下节）。

## 与已有做法的关系（对照清单条目）

- **Claude Code（adopt）/ Codex / Cursor（watch）**：README 把这三者当作**安装器**使用，提供了一段现成提示词让它们跑 setup、收集 key、后台启动并汇报（见步骤 4）。也就是说 Xiryn 与这些编码 agent 是配合关系而非替代关系：编码 agent 负责装，Xiryn 负责“常驻 + 有自己的桌面 + 手机可控”。
- **OpenClaw（watch）**：README 的对比表把它列为“本地 computer-use agent”的代表，差异点是 Xiryn 的 agent 跑在 Docker 沙箱桌面里而非直接操作宿主机（表里写 OpenClaw 会用到“你机器上的 shell、文件和 app”）。这是作者自述的对比，未见双方验证。
- **Cline（watch）**：清单未在 README 中出现，无依据说明关系。
- **DeepSeek（try）**：README 的 provider 列表包含 `DEEPSEEK_API_KEY`，可作为 Xiryn 的模型来源之一。
- **Atlas（watch）**：README 截图说明文字里出现 “Atlas lists the nonstop Bengaluru to Lucknow flights…”“Atlas wants to pay ₹19,062 to MakeMyTrip”，但此处的 Atlas 是 README 里一个**示例 agent 的名字**，不能据此认定与清单中的 Atlas 条目是同一事物。

## 证据与局限

**原文给出的可核查项（自述口径）**
- 仓库元数据：MIT 许可、CI badge、Node ≥ 20.9、star 数 49（来自本条线索的 metrics）。
- 具体数值：默认端口 127.0.0.1:6796；workstation 默认 2 CPU / 4 GB 内存；桌面 1280×800；vault 用 AES-256-GCM；约 4 GB 磁盘需求；README 称支持“11 providers, incl. local”。
- 安装脚本确实给出四步可核对的动作（装 Git/Node/Docker → clone → 构建镜像 → 起服务）。
- 更新流程、`.env` 变量表、Telegram 配对三步都写得可照做。

**只是作者主张、未见证据的部分**
- “It does everything Muse, Grok Bot and Dots do”以及与 OpenClaw 的整张对比表——README 自注“Based on public launch coverage as of October 2026”，并写“corrections welcome”，属未经验证的对比。
- “Phishing-proof by design”“never touches your computer”“no telemetry”等安全与隐私表述：README 指向 `SECURITY.md`，但本条材料中**没有**第三方审计、渗透测试或 CVE 记录。
- 截图（订机票、写脚本、squad 委派、带引用调研）是展示性证据，不是可复现的评测结果。

**适用条件与硬性限制**
- 必须能装并运行 Docker；README 明说没有 Docker 就只能聊天、记忆和（有 Firecrawl 时）调研，不能跑代码、不能用桌面。
- 本地模型路线要求模型支持 tool calling。
- 定时/循环任务、WhatsApp/Discord/Slack、MCP 连接器、语音输入输出、可分享模板都在 roadmap 的**未完成**清单里，不能当作现成能力写进手册。
- 49 star 的项目，成熟度、长期维护与安全响应能力都未经市场验证；README 里大量营销式表述应打折看待。
- 只绑本地回环意味着远程使用必须依赖 Telegram（或自建代理 + `XIRYN_ALLOWED_HOSTS`）。

## 怎么试、怎么验证

**最小试用（建议 1–2 小时，一台非主力机器）**
1. 按步骤 2 或 3 安装，记录从开始到 `http://127.0.0.1:6796` 可访问的实际耗时与卡点（Docker 条款、WSL 2 重启、`~/.xiryn/node/bin` 未入 PATH 是否出现）。
2. 只配一个模型 key，先不要 Firecrawl 和 Telegram，跑通“创建 1 个 agent → 发一条指令”。
3. 选一个**你本来要自己做的真实小任务**，三类各试一次即可：
   - 代码类：让它 clone 一个小仓库、装依赖、跑测试、给失败修复的 diff。
   - 调研类：让它查一个有明确答案的问题，要求给可点击的引用来源。
   - 网页操作类：让它在一个需要登录或支付的流程上走到 hand-off 点，验证它是否真的停下并说清剩余步骤。
4. 中途至少故意做一次 Take over + 带说明交回，检验它能否从你的操作处续做。
5. 安全抽查：确认服务只监听 127.0.0.1；确认 agent 在其桌面里 `ls` 不到你的宿主目录；确认 vault 里的值没有出现在聊天记录或日志里；确认 Telegram 只应答你一个账号。

**判断有没有改善的指标（自行记录，README 未提供）**
- 任务完成率：发出任务中无需你重做就达标的比例。
- 人工介入成本：每个任务的 hand-off 次数、take-over 累计分钟数。
- 质量核验：diff 是否可接受、引用的链接是否真实可达且支持结论。
- 成本：Usage 页面的每任务 token 数与折算费用，对比你自己做的耗时。
- 稳定性：durable turn 在关掉标签页后是否真的继续完成；通知是否按 `XIRYN_TELEGRAM_NOTIFY` 的设定触发。

**降级条件**
- 若安装阶段反复失败（如 Docker/WSL 环境问题超过一次重启仍不通），或单个小任务的人工介入次数与手工完成相当，则把它降为 study/watch，不进手册的可照做步骤；
- 只有在你确认沙箱隔离、vault 不泄露、hand-off 行为符合 README 描述，并且至少一个真实任务显著省时之后，才考虑写进手册作为“自托管常驻 agent”的推荐方案，并注明其定时任务尚未实现、需自行补触发机制。
