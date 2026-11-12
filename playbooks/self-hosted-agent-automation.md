# 让常驻 AI agent 接管重复工作：十条路线，一套两周验证法

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：面对常驻、桌面、托管、编排、定时一次性执行和自托管协作平台等 agent 项目只有安装说明、缺少效果数据时，如何用两周最小试跑判断它能否真正接管你的周期性重复工作。
> 先试这一步：先选一条形态路线（例如做法 J：在 Linux 上用安装脚本起 agentes.chat），只配一个模型和一个低风险 routine，打开审批，跑两周并记录按时完成率、返工时间和成本。
> 最近修订：2026-11-12

## 解决什么问题

周期性重复的工作——按固定时间汇总某个信息源、每周重复读同一批文件、跑同一批命令、查同一类网页——看起来很适合交给一个常驻的本地或服务器端 AI agent、一个桌面端的多 agent 应用、一个跑在模型厂商基础设施上的托管定时 agent，或者一个自托管的 Slack 式人机协作平台。但这类项目的 README 往往只给安装和配置步骤，不给效果数据、对比案例或评估方法。

这份手册给出一条可执行的试跑路径：起一个实例 → 只接一个模型 → 配一个定时或事件触发 → 跑两周 → 用“按时投递成功率 + 人工返工时间 + token 或模型成本”决定它是否进入你的日常工作流。十条路线共用同一套判断标准，选一条走完即可：A nanobot、B CowAgent、C Eigent、D NanoClaw、E Comma、F Claude Managed Agents、G Claude Code + instagram-research-tool、H touri、I agent-autoloop、J agentes-chat。

其中几条不是同一层东西：Comma 是上层编排 + 持久 Task 状态 + 事件/时间触发 + 权限边界，把 Codex、Claude Code 这类已有 agent 当应用调用，或注册为 Worker / Sub-agent；Claude Managed Agents（做法 F）把 agent 跑在 Anthropic 基础设施上，本机不需要常驻进程，代价是依赖 beta 托管平台，信息源与凭据要按它的 vault 机制放；做法 G 是“系统定时器 + 一次性 claude -p 命令”唤醒本机已有的 Claude Code，状态落在仓库文件里；做法 H 的 touri 是 local-first 的 macOS 桌面应用，把 Codex、Claude Code、OpenCode 这类 CLI 变成常驻 bot，用 cron routines 触发，凭据放 macOS Keychain，数据默认留本机 SQLite；做法 I 的 agent-autoloop 是 macOS/Linux 上的轻量自动化中台，把定时任务、GitHub Issue、HTTP 事件等变成标准事件，按本机 rules.json 派给已登录的命令行 Agent，每轮干完就退出，需要拍板时推卡片等人；做法 J 的 agentes.chat 是开源、可自托管的 Slack 替代品，让团队和 AI agent 在频道、线程和 DM 中一起工作，每个 agent 有角色、instructions、模型、月预算和所有者，可接 MCP 工具、独立电脑和浏览器、routines、memory、审批、skills、wiki、Drive、任务板和邮件，自托管用 Docker 一条命令，Postgres 是唯一依赖。如果你只是想要一个编码 agent，沿用原来的四条路线更直接。

## 适用与不适用

**适用**

- 你手上有明确的周期性重复工作，形态落在读文件、跑命令、查网、按计划重复、拆给多个子代理、盯收件箱或仓库事件、在频道里让人和 agent 协作处理同一件事。
- 有一台可联网、且你信得过的 Linux、macOS 或 Windows 机器或服务器。做法 J 需要 Linux 服务器和 Docker；安装脚本会询问后安装 Docker；README 默认把服务放进 Tailscale 网络并配私有 HTTPS，也可用公共域名加 Caddy。
- 至少有一个模型厂商的 API key，或者能在本机跑起一个本地推理服务。做法 J 需要组织自备模型 key，可选 Claude、OpenAI、Gemini、DeepSeek、Kimi、Z.ai、MiniMax 或 OpenRouter。
- 想先拿到可复制的目录结构、配置和失败模式清单再动手。做法 J 的 README 给出了安装命令、权限、调度和审批机制，但 SELF_HOSTING.md 的细节未在本次材料中展开，也没有可直接复制的提示词模板。
- 能接受先花 1–2 周观察期，而不是马上全量切换。

**不适用**

- 没有重复性工作，只是想试个新工具。
- 必须部署在不受信任的环境。CowAgent 的 README 明确说 Agent 能访问本机操作系统，只能在可信环境部署。
- 承担不了 token 或模型成本。Agent 模式通常显著多于普通对话；做法 J 给每个 agent 设月预算，README 称每次调用前检查预算，但这只是过程控制，不是成本效果证明。
- 期待有现成效果数据可抄。A–I 的调研都指出原文没有效果数据或独立评测；做法 J 的 README 也没有基准测试、客户案例或独立审计，仓库指标只有 205 stars。
- 不愿意为数据源付费、又需要完整每日雷达。做法 G 的每日搜索要用 Sandcastles 或 Apify；免费 yt-dlp 只支持单条公开链接，且 IG 通常拿不到播放量、还可能被拦截。
- 不能接受 beta 托管平台，或不愿意把信息源与凭据交给模型厂商的托管环境。做法 F 的凭据存在 vault 里、由平台在请求离开沙箱时注入。
- 不能接受 macOS 或 Linux 限制。做法 H 仅 macOS、仅 Apple Silicon；做法 I 仅 macOS 或 Linux；做法 J 需要 Linux 服务器和 Docker/Tailscale 运维能力。
- 不能接受做法 J 的以下边界：大量功能仍是 Beta，包括 browser、Postgres connector、mailboxes、phone app、desktop app、导入和无 Docker 自托管；Codex 接入仍在测试；AGPL-3.0-only 和商标/署名条款意味着分发修改版有额外义务；需要无人值守浏览器登录或 captcha 时不合适，因为 browser 是 Beta 且需要人工接管；需要 Postgres 写操作时不合适，因为 connector 只读 SQL；需要邮件默认不审批时不合适，因为默认发送需审批。

## 前置条件

- 用 nanobot：Python 3.11 或更新；源码安装额外需要 Git 和 Bun；平台 wheel 覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64。
- 用 CowAgent：一台可联网的 Linux、macOS 或 Windows 机器或服务器；至少一个模型厂商的 API key，在 Web console 里配置。
- 用 Eigent：桌面环境；快速开始模式需要 Node.js 18–22 和 npm；后端 Python 依赖用 uv 管理；本地部署命令在 server/README_EN.md，MCP 与 Skill 配置在 docs.eigent.ai，本次材料未包含。
- 用 NanoClaw：macOS 或 Linux（Windows 走 WSL2）；Node.js 22+ 与 pnpm 10+；Docker Desktop 或 Docker Engine；Claude Code；Anthropic 凭据或其他 provider。
- 用 Comma：自建实例需要 Docker Engine + Compose v2.24 以上、足够磁盘、一个可用的模型服务商账号；默认栈不含 mock 模型；本地开发模式需要 pnpm。
- 用 Claude Managed Agents：一个 Claude API workspace（beta）；已安装 Claude Code 并能跑 claude-api skill；一个 Slack app 和一个 GitHub token；凭据按源放进 vault。
- 用 Claude Code + skill 套装：已安装 Claude Code；Node.js 18+；至少一个数据源；凭证放 .env；ffmpeg、Whisper、iPhone 都只是可选。
- 用 touri：macOS 14 或更新版本、Apple Silicon；本机已安装并登录 Codex 或 Claude Code CLI；bot-machine 需要 macOS 26 与 Apple container 1.5.0 以上；源码构建需要 Bun 1.2.21+、Rust 1.90+ 并带 aarch64-apple-darwin target；Release 未签名、未公证。
- 用 agent-autoloop：macOS 或 Linux；Node 24、Git、curl；一个已登录的命令行 Agent；不需要 GitHub 账号；先建沙盒目录 mkdir -p ~/autoloop-sandbox/notes。
- 用 agentes.chat：Linux 服务器；Docker；README 默认走 Tailscale 私有 HTTPS，也可用公共域名加 Caddy；组织自备模型 key；需要读 SELF_HOSTING.md 了解未展开的自托管细节；Postgres 是唯一依赖；README 称约 10 分钟完成安装。每个 agent 要设角色、instructions、模型、月预算和所有者；审批由 agent 所有者或 admin 处理；MCP 按最小权限给 scope。agent computer 跑在 runner 所在机器，默认是服务器本身，也可连接服务器、VM 或笔记本；browser、Postgres connector、mailboxes 为 Beta；Claude Code 和 Codex 可在连接电脑上用已登录计划运行，Codex 仍在测试。
- 常驻前提：nanobot 的定时投递要求网关常驻；CowAgent 定位 7×24 跑在个人电脑或服务器；Eigent 的 Automation 要求应用或服务在跑；NanoClaw 是 Node 宿主进程加每个 agent group 一个 Docker 容器；Comma 的 Task 只要实例在跑就继续执行；做法 F 不需要本机常驻；做法 G 不需要常驻网关或容器；做法 H 取决于应用与 sidecar 是否运行；做法 I 每轮干完就退出，但调度服务本身要能跑；做法 J 的服务、routines 和 runner 必须运行，agent computer 跑在 runner 所在机器。
- 试用期约定：Docker 优先，只开本地或私有网络访问，先不要把控制台暴露到公网。Eigent 的 Quick Start 会连接云端，不是完全本地；NanoClaw 匿名诊断默认开启，可用 NANOCLAW_NO_DIAGNOSTICS=1 关闭；Comma 默认公开端口只绑 loopback；做法 F 收紧 environment.yaml 的 allowlist；做法 G 凭证只放 .env 且不提交，工具声明不登录 Instagram、不用 cookies 或 session；做法 H 数据默认存本机 SQLite，凭据放 Keychain；做法 I 先用沙盒目录并做指令数据分离；做法 J 默认用 Tailscale 私有 HTTPS，公共域名用 Caddy，MCP 只给最小 scope，审批人设为 owner/admin，月预算先设低。

## 操作步骤

### 第 1 步：先选一种做法，别同时上多个

A、B、C、D、E 属于长驻或桌面或编排 agent harness，能力清单高度重叠。F 是托管执行、本机不留进程。G 是系统定时器唤醒一次性 Claude Code 会话。H 是 local-first macOS 桌面应用，把 CLI 变成常驻 bot。I 是已有 CLI agent 外面的调度、审批与审计层。J 是自托管 Slack 式协作与权限层，把人和多个 agent 放进频道、线程和 DM，用角色、月预算、MCP scope 和审批约束行为。

- 想接主流 IM 渠道、用现成技能市场、对话式生成技能 → 做法 B：CowAgent。
- 想要更小内核、WebUI 加终端 workbench、OpenAI 兼容 API 或 Python SDK → 做法 A：nanobot。
- 想要桌面图形界面、多 agent 并行、接本地推理模型、内置浏览器与终端工具包 → 做法 C：Eigent。
- 想要容器级文件系统隔离、凭据网关注入、按频道选择隔离或共享、能接受定制即改代码 → 做法 D：NanoClaw。
- 想要会话只是界面、Task 才是持久执行状态，把已有 Codex 或 Claude Code 当应用调用或 Worker，能接受自建整套栈 → 做法 E：Comma。
- 想跑在厂商托管基础设施上、本机不留常驻进程、已经在用 Claude Code 和 Anthropic API、能接受 beta 和托管边界 → 做法 F。
- 已经在用 Claude Code、要盯一个内容源、想要拆解流程加 inbox 加每日雷达加用自己语气重写、能接受付费数据源 → 做法 G。
- 你在 macOS 14+ Apple Silicon 上，已登录 Codex 或 Claude Code CLI，想把这些 CLI 变成常驻 bot，要 cron routines、按风险选的审批模式、逐线程 MCP token、可选隔离 Linux VM，能接受未签名 Release → 做法 H。
- 你已经有登录好的 CLI Agent，想让它们在后台按 cron、GitHub Issue 或 HTTP 事件接活，遇到删数据、重启服务、花钱、对外发消息时推卡片等人拍板，等待期间不占进程、不耗 Token → 做法 I。
- 你想要一个自托管的 Slack 式工作空间，让团队和多个 agent 在频道、线程和 DM 里协作，需要 agent 角色、instructions、月预算、所有者、MCP 最小权限、敏感动作审批、routines、skills、wiki、任务板和 memory，能接受 Linux + Docker + Tailscale 或 Caddy 运维，能接受大量 Beta 和 AGPL 义务 → 做法 J：agentes.chat。它更像承载 Claude Code、DeepSeek 等模型或执行器的协作与权限层，不是替代 Claude Code；可从 OpenClaw、Hermes、Paperclip、OpenBot 等导入 agents、skills、channels、routines 和 memory，先预览，skills 默认开启、routines 活跃、keys 从不导入。

任选其一即可。同时开两个以上，两周后你分不清是哪个在起作用。

### 第 2 步（做法 A）：部署 nanobot 并接入一个模型

A-1 安装。macOS 或 Linux 一键安装：

```bash
curl -fsSL https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.ps1 | iex
```

用 uv 或 pip：

```bash
uv tool install nanobot-ai
python -m pip install nanobot-ai
```

源码安装需要 Bun：

```bash
git clone https://github.com/HKUDS/nanobot.git
cd nanobot
python -m venv .venv
# 激活后
python -m pip install -e .
```

预期结果：nanobot --version 能输出版本号。不在 PATH 上用 uv tool run --from nanobot-ai nanobot ... 或 pipx run --spec nanobot-ai nanobot ...。

A-2 首次运行并配置模型：

```bash
nanobot webui
```

打开 http://127.0.0.1:8765，在 Settings → Models 选 provider、凭据和模型；新建 topic 发 Hello! 验证；正式项目前选 workspace 和 access mode。

A-3 让网关在关掉终端后继续运行：

```bash
nanobot gateway --background
nanobot gateway status
nanobot gateway logs
nanobot gateway restart
nanobot gateway stop
```

A-4 终端里工作：nanobot 以启动目录作为 workspace；一次性执行用 nanobot -m 'Hello!'；指定会话与工作区用 nanobot --session <会话> --workspace <工作区>。

A-5 在 WebUI 的 Apps 里连接 MCP、启用 Agent Plugins、管理本地 CLI App 适配器，用 @ 挂工具；Skills 放可复用指令；Settings 放模型、语音、图像、网页和聊天渠道。

A-6 配一个周期性自动化：在接收结果的 topic 里创建 automation，用 Tasks 查看日程，用 Calendar 扫描已完成和即将执行。前提是网关保持运行。

A-7 可选：Render 一键部署要求 ANTHROPIC_API_KEY 和私有 NANOBOT_WEB_TOKEN；自托管按 docs/deployment.md 做 Docker、Docker Compose、Linux service、macOS LaunchAgent；接脚本用 OpenAI 兼容 API 或 Python SDK。

### 第 3 步（做法 B）：部署 CowAgent 并接入一个模型

B-1 安装，三选一。Linux 或 macOS：

```bash
bash <(curl -fsSL https://cdn.link-ai.tech/code/cow/run.sh)
```

Windows PowerShell：

```powershell
irm https://cdn.link-ai.tech/code/cow/run.ps1 | iex
```

Docker：

```bash
curl -O https://cdn.link-ai.tech/code/cow/docker-compose.yml
docker compose up -d
```

B-2 打开 http://localhost:9899，在 Web 控制台配置一个 Chat 模型，预期能正常对话。

B-3 用 cow CLI 管理：

```bash
cow start | stop | restart
cow status | logs
cow update
cow skill install <name>
cow install-browser
```

B-4 对话里装技能：

```bash
/skill list
/skill search <keyword>
/skill install <name>
```

技能来源是 Skill Hub、GitHub、ClawHub 或任意 URL；装不到合适的，用 skill-creator 对话生成一个最小技能。

B-5 可选接 MCP：准备 mcp.json，支持 stdio / SSE 和热重载；README 没给字段示例，需查官方文档页 /tools/mcp。

B-6 需要图形桌面操作时运行 cow install-browser。

B-7 在 Web console 为 Chat、Vision、Image Generation、ASR/TTS、Embedding 分别指定厂商。

B-8 服务器部署试用阶段先别做；要暴露时在 config.json 把 web_host 设为 0.0.0.0、设置 web_password、放行 9899，并且只在可信环境部署。

### 第 4 步（做法 C）：跑起 Eigent 并接入一个模型

C-1 快速开始（会连 Eigent 云端、需要注册账号，不是完全本地）：

```bash
git clone https://github.com/eigent-ai/eigent.git
cd eigent
npm install
npm run dev
```

C-2 拉新代码后同步依赖：

```bash
# 项目根目录
npm install
# backend 目录
cd backend
uv sync
```

C-3 本地部署看 ./server/README_EN.md；本次材料未包含具体命令。按 README 描述，本地部署包含本地后端、本地模型集成、与云服务隔离、零外部依赖。

C-4 选协作模式：单 agent 适合聚焦任务；Workforce 适合复杂多步并行。README 没有给选择规则，需要自己在试用中定。

C-5 接模型：云端 API、企业网关或本地推理；本地要跑起 vLLM、Ollama、LM Studio 之一。

C-6 工具与能力入口：MCP Integration、Skill Integration、内置 Browser & Terminal Toolkits；配置示例需查 docs.eigent.ai。

C-7 Automation 只有一句功能描述，未给调度配置格式。

C-8 用例库只有标题、一句描述和链接，步骤在官网 guide。月度 GitHub PR 汇总到 Word 再到 Slack 是唯一带明确周期触发的样本，可优先当参照物。

### 第 5 步（做法 D）：部署 NanoClaw 并接一个频道

D-1 一键安装并配对第一个频道：

```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash nanoclaw.sh
```

脚本会补装 Node、pnpm、Docker，安装凭据网关并注册 Anthropic 凭据，构建 agent 容器，配对第一个频道；某步失败会自动调用 Claude Code 诊断并从断点续跑。

D-2 可选从 v1 迁移：

```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash migrate-v2.sh
```

要在真实 shell 里跑，不要在 Claude 会话里跑；不会自动切换系统服务。新试跑可跳过。

D-3 用触发词下指令，默认 @Andy：

```text
@Andy send an overview of the sales pipeline every weekday morning at 9am (has access to my Obsidian vault folder)
@Andy review the git history for the past week each Friday and update the README if there's drift
@Andy every Monday at 8am, compile news on AI developments from Hacker News and TechCrunch and message me a briefing
```

管理任务：

```text
@Andy list all scheduled tasks across groups
@Andy pause the Monday briefing task
@Andy join the Family Chat group
```

每周一 8am 新闻简报最适合当试跑靶子；用 list 确认登记，用 pause 验证能叫停。

D-4 改行为：不用配置文件，直接对 Claude Code 说要什么，或运行 /customize。前提是代码库足够小，作者主张 Claude 能安全修改，这是自述。

D-5 加频道或换模型用 skill：/add-telegram、/add-codex、/add-opencode、/add-ollama-provider。一次性实验可用 .env 的 ANTHROPIC_BASE_URL 和 ANTHROPIC_AUTH_TOKEN。

D-6 用 /manage-channels 按频道选择各自独立 agent、共享一个 agent 或折叠成单一共享会话；参考 docs/isolation-model.md。容器只挂载显式允许的目录，凭据不进容器。

D-7 模板化起 agent：

```bash
ncl groups create --template <ref>
```

D-8 调试直接问 Claude Code，或运行 claude 后 /debug。

D-9 关闭匿名诊断：

```bash
NANOCLAW_NO_DIAGNOSTICS=1
```

D-10 卸载或回滚：

```bash
bash nanoclaw.sh --uninstall
```

先跑 --dry-run 预览；卸载器只删属于这份拷贝的东西，最后手动删 checkout 目录。

### 第 6 步（做法 E）：部署 Comma 并跑通一个长周期任务

E-1 本地开发模式，确定性 mock 模型，不需要 API key：

```sh
pnpm install
make dev
```

用 comma-local@example.com 登录，登录码在 Mailpit http://127.0.0.1:8025 读取；Mac app 用 make dev-electron；可跑 make test-clients、make test-systems、make test-policy。

E-2 自建单机实例：

```sh
cp .env.example .env
docker compose up -d --build
```

把 COMMA_OWNER_EMAIL 设成自己的邮箱；在 .env 设置模型服务商，或登录后在 Settings 配私有模型；打开 http://localhost:8080 请求登录码，在 http://localhost:8025 读取。默认公开端口只绑 loopback。

E-3 关键环境变量：COMMA_OWNER_EMAIL 第一个 owner 和 Admin；COMMA_ALLOW_SIGNUP 公开注册默认关闭；COMMA_LLM_BASE_URL、COMMA_LLM_PROTOCOL、COMMA_LLM_MODEL、COMMA_LLM_API_KEY、COMMA_LLM_CONTEXT_TOKENS、COMMA_LLM_MAX_TOKENS 配模型；COMMA_EXA_API_KEY 可选；COMMA_SMTP_* 配登录码邮件；COMMA_PUBLIC_URL、COMMA_API_URL、COMMA_ADMIN_URL、COMMA_SALIX_URL 配浏览器 origin。

E-4 默认地址：Comma Web http://localhost:8080；Admin http://localhost:8082；Product API http://localhost:8081；Salix dashboard http://localhost:4000/dash；Local inbox http://localhost:8025。

E-5 对外暴露试用阶段先别做；要公开时放 HTTPS 反向代理后，Web、Admin、Product API 必须是同一可注册域名下的不同 origin，换真实 SMTP，本地收件箱只用于 loopback。

E-6 升级前先停栈；一起备份 config、postgres、objects、clickhouse、redis 五个 named volume；config 卷保存加密密钥和认证密钥，不要删除、不要重新生成；docker compose down 保留数据，不要随手加 -v。

E-7 让它操作自己的电脑：在设备设置里连接这台电脑；改文件、跑命令、转交 Codex 或 Claude Code 等要打开 Allow operations。试用期先不开这个总开关。

E-8 交给它一个真实长周期任务：Task 自动转成独立 agent loop，持续 plan → execute → review → verify，需要你决策时停在 Needs Review；Routines 按时间触发；Loops 按事件触发，只在有事时唤醒 agent。看板四态 Backlog / In progress / Needs Review / Done。已知行为：被中断的写操作不会自动重跑。

### 第 7 步（做法 F）：用 Claude Managed Agents 搭一个每日 brief

F-1 更新 Claude Code：

```shell
claude update
```

F-2 用 claude-api skill 起步：

```text
/claude-api managed-agents-onboard https://claude.dev/blog/building-effective-agent-automations/
```

该 skill 会读文章、提出方案、把文件写到 agents/ 目录，并用 ant apply 创建资源。把它当起点，按自己的来源、目的地、记忆偏好定制。

F-3 daily-brief/ 的参考文件结构：agent.md、deployment.md、environment.yaml、memory_store_preferences.yaml、memory_store_state.yaml、vault.yaml、claude-lock.json、slack/manifest.yaml。

F-4 建 vault 并放凭据：先想清楚 agent 只需要哪些权限。

```shell
ant apply vault.yaml
```

用 TypeScript SDK 逐个添加凭据；GitHub 走 MCP，由沙箱外 proxy 调用；Slack 走沙箱内 bash + curl，沙箱里只放占位符，请求离开沙箱时平台对 allowlist 内主机替换成真 token。

F-5 把 claude-lock.json 里的 vault ID 复制到 deployment.md 的 vault_ids。

F-6 用 bookmark 而不是固定时间窗口读来源：每个来源一个 bookmark，运行结束时把最新条目的时间戳写进 bookmarks.json；bookmark 放在名为 state 的 memory store 里，平台每次挂载到沙箱 /mnt/memory/。

F-7 读取失败要显式上报：源失败时不动该源 bookmark，用其余源照常写简报，在简报末尾用一行点名没读到的东西。

F-8 目的地用 bash + curl 发 Slack；同一个 bot token 既读又发，slack.com 在 environment 的 allowlist 上。

F-9 确认发帖成功后才记账：先查当天标题是否已在目标频道近期消息里；只有 Slack 返回 ok true 且有 message ts 才算发出；确认后才更新 ledger 和 bookmark；结果不明确就标 maybe posted，其他什么都不改。run record 存 memory store 的 runs/<date>.md。

F-10 写 agent.md 的 frontmatter：model、mcp_servers、tools；GitHub 工具集必须设成不请求批准，token 只读，web 工具关掉。正文是运行步骤；材料只摘录了第 4 条和第 5 条原文，其余六条要回原文补全。

F-11 写 deployment.md：schedule 用 cron，timezone 决定触发时间；正文还要显式告诉 agent 用哪个时区算日期；resources 里 preferences 只读，state 读写；正文写 Write today's brief 和当天标题格式。

F-12 部署：调研原文在这一节被截断，没有可照抄命令；要走到这一步先回原文补全。

### 第 8 步（做法 G）：用 Claude Code + skill 套装跑一个每日内容雷达

G-1 克隆并进入 Claude Code：

```bash
git clone https://github.com/manthanpatelll/instagram-research-tool.git
cd instagram-research-tool
claude
```

仓库带 .claude/skills/reel-research、outliers、research-setup 三个 skill；README 说 npm 零依赖，不需要 npm install。

G-2 在 Claude Code 内跑首次设置向导：

```text
/research-setup
```

向导选择并连接数据源、询问 niche 生成查询写入 niche.json、让你提供三条 caption 学习语气写入 voice.md、引导 iPhone 分享按钮、跑自检。

G-3 先不配数据源，看产出结构合不合用：

```bash
npm run library
npm run sample-report
npm run selftest
```

selftest 返回 exit 0 表示环境检查通过；library 和 sample-report 打开的是合成样本，只能看产出长什么样，不能当效果证据。一条 reel 的完整产出含八个板块：Numbers / Transcript / Hook / Format / Angle / Visual breakdown / Scroll stoppers / My version。

G-4 日常流程：刷内容时 Share → Save to Research 存 inbox；早上 /outliers 打开当日 outlier 报告；/reel-research inbox 拆解已保存 reel；/reel-research <reel link> 当场拆解单条；拍摄前打开 out/library.html 选选题，从 My version 开始。

G-5 让早上的部分自动运行：

```bash
claude -p '/reel-research inbox'
claude -p '/outliers'
```

没有常驻网关、没有常驻容器、没有托管平台；系统定时器起一次性 Claude Code 会话跑完就退出，状态落在仓库文件里。cron 和 launchd 示例在 docs/iphone-shortcut.md，本次材料未含。

G-6 配置 config.json：provider 默认 sandcastles，可选 apify、ytdlp、any；searchProvider 默认 sandcastles 或 apify；inboxPath 默认 iCloud 同步位置；windowHours 默认 24；maxWindowHours 默认 48；minViews 默认 2000；transcription 默认 auto；myHandle 可选。niche.json 按簇保存搜索查询，按创作者实际写 caption 的方式写。

G-7 选数据源先算成本：Sandcastles 付费计划起 49 美元每月；Apify 按结果付费，每月 5 美元免费额度，每条 reel 不到 1 美分，一次完整每日搜索约 1.70 美元，覆盖 IG，没有 outlier score；yt-dlp 免费，仅单条公开链接，需本地 Whisper，IG 通常无播放量且可能被拦截，无每日搜索；任意源可自带视频或粘贴数字。数字缺失时留空，工具声明从不编造数字。

G-8 想要每日雷达再上 Apify：把 provider 和 searchProvider 设为 apify，跑一次 /outliers，核对 24h 窗口、48h 上限、minViews 2000、去重合并、按 outlier score 排名、可疑触达标记，以及成本是否可接受。

G-9 迁移到你的领域：把数据源只取数、Claude Code 分析、定时命令这套结构换到你的场景，看骨架是否仍成立。

### 第 9 步（做法 H）：安装 touri，把 Codex 或 Claude Code CLI 变成常驻 bot

H-1 安装 Release：从 Releases 下载 .dmg，把 touri.app 拖进 /Applications。未签名、未公证，首次启动会被 Gatekeeper 拦截。按三步走：打开 app 被拒绝；System Settings → Privacy & Security 点 Open Anyway；用密码确认。macOS 15 及以后 Control-click → Open 不再能绕过；也可用：

```sh
xattr -dr com.apple.quarantine /Applications/touri.app
```

H-2 从源码构建，前提 Bun 1.2.21+，Rust 1.90+ 并带 aarch64-apple-darwin target：

```sh
bun install
bun run build:sidecar
bun run tauri build --bundles app
open src-tauri/target/release/bundle/macos/touri.app
```

H-3 验证安装或构建：

```sh
bun run typecheck
bun run lint
TOURI_BROWSER_HEADLESS=1 bun test sidecar/test
(cd ui && bunx vitest run && bunx vite build && bunx playwright test)
(cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings)
```

可选真实 CLI 冒烟：

```sh
TOURI_E2E_REAL_CLI=1 bun test sidecar/test/runtime/real-cli.test.ts
```

H-4 从旧设置导入先 dry run：导入器幂等，routine 以 disabled 状态导入，从不读取凭据文件；SSH 源在远端只读。去掉 --dry-run 才真正导入；--bot 选 bot；--cwd-map 映射路径。

H-5 直接运行 sidecar 或接 MCP：

```sh
TOURI_UI_TOKEN=dev-ui-token bun run sidecar/src/main.ts serve
bun run sidecar/src/main.ts mcp-stdio --thread <thread-id>
```

MCP stdio 只连接运行中的 sidecar，只读逐线程 token 文件，不打开 SQLite。

H-6 配置面：审批模式 on-request、workspace-write、full 按风险选；MCP gateway 用逐线程 token 并带审批提示；computer use 是 opt-in，必须有可见指示器和 kill switch；bot machine 通过 Apple container 起隔离 Linux VM；packages/contracts/ 放共享类型、SQL schema 与 MCP tool schema；凭据从不被导入或存入 SQLite。

H-7 缺口：README 没有说明在 UI 里如何新建 bot、如何写 routine 调度配置、overlap 与 catch-up 参数怎么填；要照着手册用，需要补 docs/ 和界面说明。

### 第 10 步（做法 I）：安装 agent-autoloop，跑通事件→单轮执行→人工拍板→续跑

I-1 准备沙盒目录：

```bash
mkdir -p ~/autoloop-sandbox/notes
```

I-2 安装，前提本机能运行 Node 24：

```bash
curl -fsSL https://raw.githubusercontent.com/KKKKhazix/agent-autoloop/main/install.sh | sh
```

I-3 先走内置真实试跑：

```bash
agent-autoloop try
agent-autoloop answer 1 2
agent-autoloop status
```

交互终端直接输入数字回车；非交互终端用 agent-autoloop answer 1 <序号>。status 应显示接上刚才的会话，并显示今天和最近 7 天的轮数、Token 和费用。通过标准：等待期间没有 Agent 进程空转，回答后能接回原会话。

I-4 写一条本机规则：打开 ~/.agent-autoloop/rules.json，在 rules 中放入类似对象：

```json
{
  "name": "早报",
  "when": { "cron": "0 9 * * *" },
  "to": "codex",
  "cwd": "~/notes",
  "prompt": "整理昨天的笔记和提交，写今天的早报。"
}
```

to 必须是 agents 里已登记的名字，cwd 换成实际目录。保存后几秒内自动生效；运行 agent-autoloop check 检查。改错了系统会继续按旧规则跑，并发卡片提醒。

I-5 接外部事件：先在 sources 里登记 github，然后加规则，when 用 source 和 types，to 用 codex，cwd 指到仓库，skill 指到任务 Skill，parallel 是并发数。改完运行 agent-autoloop check。

I-6 约定 Agent 如何回执：中台只要求 Agent 在最后一条回复里交代结果；需要请示时在回复末尾附 agent-autoloop 代码块，用 ask、notice、resolve、later、events。JSON 写错时中台只让它在原会话重写最后一段，不重做业务。

I-7 启用现成模板：先读模板 README，把任务 Skill 放进所用 Agent 的 skills 目录，把示例规则合入 rules.json，替换电脑名和路径，再运行 agent-autoloop check。可用于每日早报、跟进 GitHub Issue、线上告警排查、用户反馈处理、网站巡检、飞书周报、PR 自动交付等。反馈处理、网站巡检和飞书摘要默认使用北京时间，只发给本人的飞书私聊。

I-8 配人工拍板通道：桌面通知默认开启；飞书、钉钉、企微、Slack、Discord 按 skills/agent-autoloop/SKILL.md 的通道小节配置。文字通道要把 hub.publicUrl 配成手机或电脑能打开的地址。

I-9 需要交付流水线时，给 GitHub PR 打上 deliver 标签，它会按审代码、等 CI、合并 PR、等部署、核对线上版本跟进。先在非关键仓库试；审查和交付配置只从 main 读取，不在接单电脑上检出或运行 PR 里的代码。

I-10 日常查看和审计：

```bash
agent-autoloop status
agent-autoloop why 1
agent-autoloop check
```

### 第 11 步（做法 J）：自托管 agentes.chat，在频道里让 agent 接重复工作

J-1 在 Linux 服务器运行安装命令。前提：允许脚本安装缺失组件，并在询问时确认安装 Docker；需要私有 HTTPS 时要能接入 Tailscale。README 称约 10 分钟完成。

```sh
curl -fsSL https://agentes.chat/install | sh
```

也可用公共域名加 Caddy；SELF_HOSTING.md 的手机、公共域名、升级、备份和无 Docker 细节本次材料未展开，不能当作已验证步骤。

J-2 添加组织模型 key。在应用内为组织添加 Claude、OpenAI、Gemini、DeepSeek、Kimi、Z.ai、MiniMax 或 OpenRouter 的 key；云版则直接注册 agentes.chat。前提：准备对应供应商 key；每个 agent 设月预算，README 称每次调用前检查预算。

J-3 创建一个 agent。为 agent 设角色、instructions、模型、月预算和所有者；所有者接收审批和预算告警。前提：先划清职责、审批人和预算上限，不要先给宽权限。

J-4 连接 MCP 工具。组织一次连接 MCP server：官方 Linear、Sentry、Notion、Stripe 可一键连接，其他可用 URL；每个 agent 只授予所需 scope。若有 Composio key，可连 Google Drive、Calendar、Sheets、Docs、Slack、Microsoft Teams、OneDrive、HubSpot、Salesforce、Zendesk、Asana、Figma、Intercom、Dropbox、Square 及多个社交或 WhatsApp Business 连接器。前提：按最小权限给 scope。

J-5 配置审批。Merge、deploy、rollback 以及 connector 标记为敏感的动作，会等 agent 所有者或 admin 在聊天中以卡片批准；批准动作只按批准内容执行一次。前提：指定 owner 或 admin，并把审批当检查点，不是橡皮图章。

J-6 配置 routines。让 agent 按计划触发，README 例子是 every weekday at 9am，或按事件触发，例如 GitHub pull request、Sentry issue、新任务、来信；交付到频道、DM 或 Drive。前提：先有明确事件源和交付位置。

J-7 按需接执行环境。agent computer 跑在 runner 所在机器：默认是服务器本身，也可连接服务器、VM 或笔记本；browser 为 Beta，可看直播、接管登录或 captcha，再附注交还；Claude Code 和 Codex 可在连接电脑上用已登录计划运行，Codex 仍在测试；Postgres connector 为 Beta，只读 SQL，单条解析语句、只读事务、限时限额；mailboxes 为 Beta，可读、起草、发送，默认发送需审批。前提：这些多为 Beta 或需连接电脑，先小范围。

J-8 用 skills、wiki、tasks、memory 固化协作。skills 用 SKILL.md 从 zip、GitHub 链接或编辑器导入并版本化，agent 在任务需要时加载；wiki 可读，写只在有人要求时；任务给 agent 后随其开始和开 PR 自动移动并显示当前步骤；memory 保存决策、事实、偏好和教训，从纠正和拒绝审批中学习，并提议修改自身 instructions，由人接受。前提：人工审核记忆和 instructions 变更。

J-9 迁移已有资产。在 onboarding 或 Settings 可从 Grok Bot、ChatGPT dots、OpenBot.run、OpenMausBot、Hermes Agent、OpenClaw、Paperclip 或另一个 agentes.chat workspace 导入 agents、skills、channels、routines 和 memory；先预览，skills 默认开启、routines 活跃、keys 从不导入。wiki 支持 Obsidian 导入。前提：确认来源导出格式；密钥不会随导入迁移。

J-10 最小试跑。准备一台 Linux 测试服务器，按 README 运行安装命令，添加一个模型 key，建一个私有频道，创建一个有角色、instructions、月预算、所有者的 agent；只接一个低风险只读 MCP scope 或不接 MCP；配置一个计划或事件 routine；打开审批；选一个低风险、可重复的任务跑两周，并与当前人工做法或现有工具做同期对照。README 没有给可直接复制的提示词模板，不要编造；先用角色和 instructions 字段自写。

### 第 12 步：无论 A 到 J，都收敛到同一个最小闭环

1. 实例只开本地或私有访问。Docker 优先；先不要把控制台暴露到外网。做法 J 默认 Tailscale 私有 HTTPS，公共域名用 Caddy；MCP 只给最小 scope；审批人设为 owner 或 admin；月预算先设低。
2. 只配一个 Chat 模型或一个 Agent runtime。做法 J 只加一个组织模型 key，只建一个 agent。
3. 只装或建一个技能或工具，范围严格限定在一件你每周都要重复做的小事。做法 J 先只接一个只读 MCP 或不接，只用一个 skill 或先不用 skill。
4. 建一个定时任务或事件触发。nanobot 用 Automations / Tasks，前提是网关常驻；CowAgent 用内置 scheduler；Eigent 用 Automation；NanoClaw 用触发词建 recurring job，用 list 核对、pause 暂停；Comma 用 Routines 做时间触发、Loops 做事件触发；做法 F 用 deployment.md 的 cron 加 timezone；做法 G 用 cron 或 launchd 调 claude -p；做法 H 用 routines，但原文没给具体参数写法；做法 I 用 rules.json 的 when.cron 或 when.source，用 check 校验、status 看轮数和费用；做法 J 用一个计划或事件 routine，交付到私有频道或 DM，先手动确认一次，再等排期。
5. 让它连续处理同一类任务 5–10 次，每次检查任务是否完成，以及后续对话里是否自动检索到之前的记忆或知识。做法 J 还要看 memory 提议的 instructions 修改是否被接受，纠正和拒绝审批是否减少同类错误。
6. 从第一次运行就开始记录指标，否则两周后只有印象，没有依据。
7. 给有副作用的动作定一条幂等规则：先说清楚怎么算发出去了，再让它动手。做法 J 的审批卡片只按批准内容执行一次，但“批准后是否只执行一次”仍要自己核对。

做法 F 的调研还给了几条不依赖具体平台的规则，在你选的任何一条路线上都值得照抄：用游标，不用固定时间窗口；源读不到时显式上报，不要当成安静的今天；有副作用之前先查、确认成功才记账、结果不明确就标可能已发；只推读者今天会因此行动的条目；发布前复核；链接从源自己的 link 字段复制；调度的时区只决定什么时候触发，日期计算用的时区还要在提示词正文里再写一遍。

做法 G 的调研补了一条选型层规则：把取数和分析分开，数据源只负责给原始事实，分析全部由 Claude Code 做；数字缺失就留空，工具从不编造数字。这条可以直接搬到做法 F 的 brief 和做法 J 的 routine 上。

如果选 Eigent，按这个顺序收敛：C-1 跑通桌面端 → 换 Ollama 本地模型验证数据不出本机 → 试 Workforce 多 agent 并行并与单 agent 对比 → 最后才试 Automation。顺序反了，一旦调度漏跑，你分不清是调度问题还是多 agent 分工问题。

如果选 NanoClaw，按这个顺序收敛：D-1 装好并只配对一个频道 → D-3 用每周一 8am 新闻简报建一个定时任务，连续跑几个周期 → 核对容器挂载清单 → 需要换模型或渠道时再装 skill → 最后才试 /manage-channels。先动挂载和权限再搭任务，出问题分不清是权限还是任务。

如果选 Comma，按这个顺序收敛：E-1 的 make dev 加 mock 模型零成本跑通登录和界面 → E-2 起自建实例、只配一个真实模型 → E-8 只建一个 Routine 或一个 Loops，连续跑一两周 → 需要它动手时再打开 Allow operations，先只给读权限、有副作用的操作停在 Needs Review → 最后才考虑 E-5 对外暴露和注册 Worker。

如果选做法 F，按这个顺序收敛：确认 beta 平台和 workspace 能用 → 用 managed-agents-onboard 生成起点文件，只留一个来源和一个 Slack 目的地 → 只放这个 brief 需要的凭据进 vault → 把游标、读取失败上报、发帖幂等规则写进 agent.md → 手动触发第一次运行，确认消息真的到了 Slack → 再打开 cron → 最后才加第二个来源或目的地。

如果选做法 G，按这个顺序收敛：G-1 克隆进 Claude Code → G-3 跑 npm run selftest 并打开合成样本，判断产出结构合不合用 → G-2 跑 /research-setup，把 niche 和三条 caption 喂进去 → 用免费 yt-dlp 对一条公开 reel 跑 /reel-research，确认八个板块都出、缺失数字留空 → 想要每日雷达再切 Apify，跑一次 /outliers 并核对规则 → 最后才挂 cron 或 launchd。

如果选做法 H，按这个顺序收敛：确认 macOS 14+ Apple Silicon 与 Codex 或 Claude Code CLI 登录 → 装 Release 并处理 Gatekeeper，或从源码构建 → 跑 H-3 验证链 → 只配一个 runtime，只建一个 routine 跑低风险重复任务，审批模式先用 on-request → 用 MCP gateway 的逐线程 token 与审批提示核对工具权限 → 最后才考虑 computer use 和 bot machine。

如果选做法 I，按这个顺序收敛：先跑 agent-autoloop try 完成一次提问、退出、answer 拍板、status 显示续跑完成 → 只配一个 CLI Agent → 只写一条本机 cron 规则，cwd 指到 ~/autoloop-sandbox/notes → 跑通后再接一个事件源 → 再接一个通知通道，先桌面通知，再文字通道并配 hub.publicUrl → 需要交付流水线时再试 deliver 标签，先在非关键仓库试。

如果选做法 J，按这个顺序收敛：在 Linux 测试服务器运行安装命令，确认私有 HTTPS 可访问 → 只加一个组织模型 key → 建一个私有频道和一个 agent，设角色、instructions、月预算、所有者 → 只接一个只读 MCP scope 或不接 → 配一个计划或事件 routine，交付到该私有频道 → 打开审批，手动确认一次 routine 能交付 → 再加 skill、wiki 或 memory，人工审核 memory 提议的 instructions 修改 → 最后才考虑 browser、Postgres connector、mailboxes、Codex 接入、公共域名和迁移。先开 Beta 功能或宽 MCP scope，出问题你分不清是权限、Beta 功能、routine 还是模型判断造成的。

预期结果：两周内你拿到一组自己的数字，而不是一份 README 的承诺。

## 怎么判断变好了

各份调研都没有给出官方指标，下面这套是调研作者建议加你需要自建基线的组合。

- 定时任务按时完成率，以及需要你人工介入的次数，按次记录。
- 单次任务的实际耗时与返工次数，对比你自己做或用普通对话式 AI 做的基线。Eigent 调研把它拆成人工耗时差和首次通过率；做法 G 要测手工拆解一条 reel 需要多久、能产出哪些字段；做法 H 要测以前手动跑 CLI 的耗时和交给 bot 加 routine 后的耗时、返工次数；做法 I 要测引入前人工完成同类任务的时间、遗漏次数、误报次数和人工介入次数，以及引入后的轮数、Token、费用、从事件到产出的时间、人工拍板次数、误报漏报、失败重试次数；做法 J 要测 routine 产出被直接接受的比例、返工次数、每个产出需要的审批次数、纠正次数和浏览器接管次数，以及与人工基线对比的准确性和完整性。
- 产出字段完整率：做法 G 的八个板块里哪些因数据源缺失而为空，哪些是实际产出的；缺失的数字有没有被留空，而不是被编造。
- 筛选规则可复现性：做法 G 的 /outliers 报告是否稳定生成，24h 窗口、48h 上限、minViews 2000、去重合并、排名是否每次一致。
- 成本：算清每完成一件任务花多少钱。CowAgent README 明确警告 Agent 模式消耗显著多于普通对话；NanoClaw 的定时任务可配 script gates，无活时不唤醒 agent；Comma 的 Loops 只在有事时唤醒 agent；做法 F 的 deployment.md 有 budget 字段，但原文没给配置方式和数值；做法 G 的成本在数据源，一次完整每日搜索约 1.70 美元、Sandcastles 起 49 美元每月；做法 H 取决于接入的 CLI 用量；做法 I 用 status 看今天和最近 7 天的轮数、Token 和费用；做法 J 按 agent 的月预算和调用记录，算每个被接受产出的模型成本。
- 技能复用次数：同一个技能被稳定调用多少次；如果一周内没有被重复调用，说明它没有固化成产能。
- 记忆有效性：随机抽查后续会话，看它是否引用了正确的历史结论，而不是要你重新交代背景。做法 H 的 persistent bots 声明每个 bot 有自己的记忆和可分支对话历史，需要抽查；做法 J 看 memory 提议的 instructions 修改是否被接受，纠正和拒绝审批是否减少同类错误。
- 重发与漏读上报：同一个 brief 有没有被重复发出去；某个源读不到时，产出里有没有点名没读到的东西，而不是报 nothing new。做法 F 的幂等性和漏读上报需要自己实测。
- 审批卡片是否只在真正需要时出现：做法 I 如果卡片频繁出现但都不是需要拍板的事，说明规则或 Agent 回执写得不好；做法 J 看 merge、deploy、rollback 和敏感 connector 动作是否都走审批，以及审批是否只在敏感动作前出现。
- 未经授权的写操作、关键告警漏报、重复误报：做法 I 和 J 这三项任一出现，就停止扩大范围。
- why 是否能解释每轮来龙去脉：做法 I 的 agent-autoloop why <轮次> 应能说明这一轮为什么跑、结果是什么；check 应能提前发现规则错误。
- 数据边界：Eigent 本地部署模式下能否确认文件、凭据、上下文没有被送出本机；NanoClaw 看容器挂载清单和出站策略；Comma 看云端干活、设备管身份的说法是否成立；做法 F 看 environment.yaml 的 allowlist 加 vault 的 networking.allowed_hosts；做法 G 看 .env 凭证有没有被提交，以及工具声明的不用 cookies 或 session 是否成立；做法 H 看数据是否留在本机 SQLite、凭据是否只进 Keychain；做法 I 看外部文字是否只当资料放进文件，事件里的 cwd、agent、access 字段没有直接控制本机执行；做法 J 看 MCP scope 是否越界、敏感 connector 动作是否都走审批、公开访问是否按 Tailscale 私有 HTTPS 或 Caddy 配置。
- 失败可诊断性：任务失败时能否从日志或步骤回放定位原因。NanoClaw 把排障交给 Claude Code 或 /debug；Comma 看板四态；做法 F 看 session log 加 runs/<date>.md；做法 G 看 selftest 退出码和单条命令输出；做法 H 看 H-3 验证链和真实 CLI 冒烟；做法 I 看 status、why、check；做法 J 看审批卡片、任务当前步骤、routines 是否漏跑、Beta 功能失败后能否人工接管。

注意区分可观测和有效果：WebUI 能展开推理过程、工具调用、文件改动、差分、命令输出和产出物，上下文指示器显示大小、每轮输入 token 和缓存复用，有 compaction 时间线，可接 Langfuse；CowAgent 有上下文用量可视化、/compact、缓存命中率；NanoClaw 有 per-checkout id、可逐组确认的卸载清单、可关闭的匿名诊断、容器与凭据网关；做法 F 有 session log、run record 和 ledger；做法 G 有 selftest 退出码和每条互动率；做法 H 有构建、验证、导入与 sidecar/MCP 命令；做法 I 有 status、why、check 和审批卡片；做法 J 有月预算、调用记录、审批卡片、任务当前步骤、routines 交付位置和 memory 纠正记录。但这些只说明软件正常工作，不说明工作产出改善。Eigent 的 15,457 stars、NanoClaw 的 30866 stars、做法 G 的 31 stars、做法 H 的 35 stars、做法 J 的 205 stars 只反映热度，不是效果证据；Comma 的 172 stars 同理；做法 I 的性能数据是项目自测，不是独立复现。

Comma 独有的运行时可靠性：原文列出六条被检查的性质——已接受的工作在失败和重启后不会静默丢失；失败的回复不算已完成工作；有副作用的操作在开始前先记录；被中断的变更操作不会被意外执行两次；过期 worker 不能覆盖更新的 agent 状态；数据只在策略允许的边界间流动。这些由 Lean 机器检查和 TLA+ 模型检查覆盖，可以作为它不会悄悄把事情丢掉的观察项。但原文明确声明：形式化验证不证明模型判断或任务成功，只验证即使出错运行时仍按设计规则行事。不要把运行时可靠误读成结果可靠。

最小试用方式：单机跑通一个实例，只开本地或私有访问，只配一个模型，装 1 个技能，建 1 个定时任务或事件触发，连续跑 5–10 次同类任务。Comma 的零成本入口是 E-1 的 make dev 加 mock 模型；做法 F 的最小场景是单一来源加单一收件人加每日一次，第一次用手动触发；做法 G 的最小场景是不花一分钱，selftest 加合成样本加一条 yt-dlp 公开 reel；做法 H 的最小场景是只配一个 runtime，跑通 H-3 验证链，只建一个 routine，审批模式先用 on-request，先不开 computer use 和 bot machine；做法 I 的最小场景是 try 完成一次人工拍板闭环，一条沙盒 cron 规则，先只开桌面通知；做法 J 的最小场景是 Linux 测试服务器加一个模型 key 加一个私有频道加一个有角色、instructions、月预算、所有者的 agent 加一个只读 MCP 或不接加一个 routine 加审批开启，跑两周并与人工基线对照。

试多久：nanobot 调研建议跑两周；CowAgent 建议 1–2 周；Eigent 沿用两周；NanoClaw 建议 1 天内搭完、2 周判断；Comma 建议跑一两周；做法 F、G、H 调研没给观察期，沿用两周；做法 I 建议低风险流程试 1–2 周；做法 J 建议跑两周并与当前人工做法或现有工具做同期对照。统一按两周执行。

降级或放弃条件：一周内跑不出任何可复用的稳定产出；或 token 或模型成本明显高于人工或普通对话方案；或必须开放外网与高权限才能用；或反复出现重发或漏发却查不出原因。Eigent 上只有在周期任务做到人工时间明显下降且返工比例可接受，才考虑纳入日常工作流；NanoClaw 上如果为了让它跑起来必须持续改代码而你又不想维护这个 fork，直接停；Comma 上如果不打算长期维护 Elixir / Lean / TLA+ 这套重栈，别留在日常工作流；做法 F 如果 beta、幂等性、漏读上报或成本上限中任何一项在两周期内没测清楚，不要接真实信息源和真实收件人；做法 G 如果 My version 从没被用于创作、或选题到出稿周期没有缩短、或数据源花费换不回产出，直接停；做法 H 如果 Windows 或 Linux 是主环境、企业策略禁止绕过 Gatekeeper、或你不愿意查 docs 和界面说明，降为 watch；做法 I 如果出现未经授权的写操作、关键告警漏报、重复误报或人工时间没有下降，停止扩大范围；做法 J 如果产出质量低于基线、人工监督成本不可接受、时间或成本没有改善，退回 study 或 drop；如果 Beta 的 browser、Postgres connector、mailbox 反复失败且不能人工接管，不要用于高风险生产。回滚：NanoClaw 用 bash nanoclaw.sh --uninstall；Comma 用 docker compose down，不要加 -v；做法 F 停排期；做法 G 停 cron 或 launchd 并删 clone 目录；做法 H 退出 touri、关闭 sidecar、按需删 app 和 Application Support；做法 I 停进程或服务并按安装方式回滚；做法 J 按 SELF_HOSTING.md 的备份和停服步骤处理，本次材料未展开。

## 常见坑

- 把装好了、能回复当成工作变好了。各份调研都指出原文只有安装与能力清单，没有效果数据、对比案例或基准分数。
- 把合成样本当成实测产出。做法 G 的 README 截图明确标注 synthetic sample data，library 和 sample-report 都是合成数据。
- 以为做法 G 的效果有数据支撑。仓库只有 31 stars，大量引导加入作者付费社区，设置时长和拆解质量都是作者陈述。
- 为了省事跳过付费数据源、又期待有每日雷达。免费 yt-dlp 只支持单条公开链接，IG 通常拿不到播放量且可能被拦截，没有每日搜索；Apify 在本工具里只支持 Instagram。
- 让缺失的数字被编出来。工具设计是数字缺失就留空；用覆盖不全的数据源时要逐条核对空字段。
- 把 Comma 的运行时形式化验证当成任务效果证据。Lean 加 TLA+ 只覆盖运行时性质，原文明确说不证明模型判断或任务成功。
- 把源读不到当成安静的今天。MCP server 挂了或 token 过期时，运行照样启动，agent 那侧什么都看不到，会报 nothing new；规则是不动该源游标、其余源照常写、末尾点名没读到的东西。
- 用读最近 24 小时这种固定窗口读来源。跑晚了会漏、跑早了会重；改用每个来源一个 bookmark。
- 发出去之前不查重、发出去不确定成功就记账。先查当天标题是否已在目标频道近期消息里；只有平台明确返回成功和消息 ID 才算发出；不明确就标 maybe posted。
- 在 deployment.md 里设了 timezone 就以为日期没问题。timezone 只决定什么时候触发，正文还要显式告诉 agent 用哪个时区算日期。
- 手拼链接。原文要求链接从源自己的 link 字段复制。
- 给后台 agent 配了需要人工批准的工具。做法 F 里 GitHub 工具集必须设成不请求批准，同时 token 只读、web 工具关掉。
- 给 agent 的凭据权限过大。vault 里只放这个 brief 需要的凭据，并给每条凭据设 allowed_hosts；沙箱里只有占位符。
- 把 beta 的托管平台直接接到真实信息源和真实收件人上。做法 F 仍属 beta，幂等性、漏读上报和成本上限都需自己实测。
- 以为照抄 daily-brief 的文件结构就跑起来了。文中要求按自己的来源、目的地、偏好改写；而且部署一节被截断，缺可照抄命令。
- 自建 Comma 时忘了默认栈不含 mock 模型。E-2 的 compose 栈不配模型就没有真实模型调用；零成本先跑通要用 E-1 的 make dev。
- 公开暴露 Comma 时把 Web、Admin、Product API 放到不同顶级域名。三者必须属于同一可注册域名；要换真实 SMTP，本地收件箱只能用于 loopback。
- 升级 Comma 前没停栈，或者删了 config volume、重新生成它的密钥。五个 named volume 要一起备份；docker compose down 不要随手加 -v。
- 一上来就打开 Allow operations。它是改文件、跑命令、转交 Codex 或 Claude Code 的总开关；先用只读和 Needs Review 跑通。
- 把 Comma 当又一个编码 agent。它是常驻调度层，把 Codex 或 Claude Code 当应用调用；如果你只是想要编码 agent，回到第 1 步重选。
- 把 Eigent 的 Zero Setup 当真。这与后文要求 Node.js 18–22 加 npm 加 uv sync 的实际步骤矛盾，应按后者准备环境。
- 把 Eigent 的 Quick Start 当成本地部署。该模式会连 Eigent 云端、需要注册账号；要验证数据不出本机，必须走 server/README_EN.md 的本地部署。
- 把 Eigent 的 Roadmap 当现有能力。Context Engineering、多 agent 固定工作流、多轮对话、Document Toolkit 动态编辑都是未完成项。
- 拿 Eigent 的用例标题当验证依据。用例库只有标题、一句描述和链接，没有耗时、成功率、人工介入比例。
- 把 NanoClaw 当成零成本上手。它需要 macOS、Linux 或 WSL2、Docker、Node 22+、pnpm 10+、Claude Code 和 Anthropic 凭据；定制哲学是 Customization = code changes。
- 在 Claude 会话里跑 migrate-v2.sh。它要直接在真实 shell 里跑，因为确定性部分需要交互式提示和真实 shell I/O；迁移不会自动切换系统服务。
- 以为 NanoClaw 有配置文件可改行为。它不用配置文件，直接对 Claude Code 说要什么，或跑 /customize；加频道、换 provider 也只能通过 skill。
- 忘了关匿名安装诊断。NanoClaw 的匿名诊断默认开启，用 NANOCLAW_NO_DIAGNOSTICS=1 关闭。
- 卸载时以为会删干净一切。NanoClaw 的卸载器是 per-checkout 的，最后要手动删掉 checkout 目录；先跑 --dry-run。
- 把 touri 的未签名 Release 当正常安装。首次启动会被 Gatekeeper 拦截；按 Open Anyway 三步走，或用 xattr 去掉隔离标记；macOS 15 及以后 Control-click → Open 不再能绕过。
- 以为 touri 能在 Windows 或 Linux 上用。它仅 macOS、仅 Apple Silicon。
- 以为 touri 的 bot-machine 开箱可用。它需要 macOS 26 与 Apple container 1.5.0 以上；低于此版本本机 bot 仍可用，machine 功能会自报不可用。
- 以为 touri README 讲了怎么新建 bot、配 routine。原文没有说明 UI 新建 bot、routine 调度配置、overlap 与 catch-up 参数；要照着手册用，需要补 docs 和界面说明。
- 把 touri 当 Claude Code 的替代品。它是编排或外壳层，把 Claude Code CLI 作为 runtime 接入；两者是叠加关系。OpenCode 在 README 正文标题与 Features 里依据较弱，先别当成已支持。
- 把 agent-autoloop 当成新 agent。它是已有 CLI agent 外面的调度、审批、审计层，不替代 Claude Code 或 Codex。
- 一上来就接生产写操作、删数据、对外发消息或自动合并 PR。先选一个低风险、只读或只写沙盒的流程试 1–2 周。
- 忘了 to 必须是 agents 里已登记的名字、cwd 要换实际目录。改完不跑 agent-autoloop check，规则写错时系统会继续按旧规则跑。
- 文字通道没配 hub.publicUrl。飞书、钉钉、企微、Slack、Discord 等文字通道要把 hub.publicUrl 配成手机或电脑能打开的地址。
- 以为 agent-autoloop 的模板都在真实账号跑过。四种 Webhook 模板只在本地模拟服务上验证过；反馈处理、网站巡检和飞书摘要只使用虚构样例和假飞书 CLI。
- 以为 agent-autoloop 的性能数据是独立评测。冷启动、内存、长轮询、持久化写入、派活 p99、启动和重建时间都是项目自测，不是独立复现。
- 以为 agent-autoloop 能保证整机断电恢复。它做了 20 万步模拟断网、丢包、崩溃和重复提交，以及强杀进程 1000 次，但原文明确说整机断电没有单独测过。
- 设计无限事件链自触发。它用跳数熔断限制 Agent 自触发层数，超过 8 层只记录并通知。
- 高频自动化用个人订阅额度。原文建议高频场景使用 API Key，而不是个人订阅额度；对外提供服务时要考虑凭据和权限边界。
- 把 deliver 流水线直接用在关键仓库。先在非关键仓库试；审查和交付配置只从 main 读取，不在接单电脑上检出或运行 PR 里的代码。
- 把 agentes.chat 只当成 Slack 替代品。它的价值在频道协作之上叠加 agent 角色、instructions、月预算、所有者、MCP scope、审批、routines、skills、wiki、任务板和 memory；如果你只需要聊天，不需要 agent 权限层，别选 J。
- 给 agentes.chat 的 agent 过宽的 MCP scope。组织一次连接 MCP server，但每个 agent 只授予所需 scope；官方 Linear、Sentry、Notion、Stripe 可一键连接，其他用 URL，Composio 连接器也要按最小权限。
- 没设 owner 或 admin 就开审批。Merge、deploy、rollback 和敏感 connector 动作会等 agent 所有者或 admin 在聊天中批准；没有审批人，动作会卡住。
- 没设月预算就放 agent 跑。每个 agent 设月预算，README 称每次调用前检查预算；不设预算，成本失控时你只能事后发现。
- 在 agentes.chat 上先开 Beta 功能再跑基础 routine。browser、Postgres connector、mailboxes、phone app、desktop app、导入和无 Docker 自托管都是 Beta；Codex 接入仍在测试；先跑通一个低风险 routine，再逐项开。
- 期待 agentes.chat 的 browser 无人值守登录或过 captcha。browser 为 Beta，可看直播、接管登录或 captcha，再附注交还；它需要人工接管，不是全自动。
- 期待 agentes.chat 的 Postgres connector 写库。它为 Beta，只读 SQL，单条解析语句、只读事务、限时限额。
- 期待 agentes.chat 的 mailboxes 默认不审批。它为 Beta，可读、起草、发送，默认发送需审批。
- 以为 agentes.chat 的 router 会授予权限。没人 @mention 的消息进 router，由代码选候选，再由小模型、作者自己的 plan 或简单规则挑选，最多四个 agent 回答或无人回答；router 从不授予权限。
- 以为 agentes.chat README 给了提示词模板。README 没有给可直接复制的提示词模板；试跑时只能用角色和 instructions 字段自写。
- 以为 agentes.chat 的 SELF_HOSTING.md 细节都在 README。手机、公共域名、升级、备份和无 Docker 细节只能依据 README 提示，不能当已验证步骤；要照做先读 SELF_HOSTING.md。
- 迁移 agentes.chat 时以为密钥会跟着走。导入会先预览，skills 默认开启、routines 活跃、keys 从不导入；wiki 支持 Obsidian 导入。
- 忽略 agentes.chat 的 AGPL 和商标条款。AGPL-3.0-only，修改后对外提供服务需保留 /source.tar.gz 下载；贡献需签 AFK AI, Inc. CLA；分发修改版有额外义务。
- 把 agentes.chat 的 205 stars 当效果证据。README 首图是示意图，不是可核验案例；没有基准测试、客户案例或独立审计。
- 文档有缺口就卡住。CowAgent 的 MCP 集成只有一句描述、没有 mcp.json 示例；Eigent 的本地部署、MCP 与 Skill 配置、用例步骤都不在 README 正文；NanoClaw 的 script gates 具体写法和 docs 细节只有链接；Comma 的公开部署、升级、恢复在 systems/DEPLOYMENT.md；做法 F 的部署步骤被截断、运行步骤只摘了两条；做法 G 的 cron 与 launchd 示例在 docs/iphone-shortcut.md；做法 H 的 UI 新建 bot、routine 调度配置、overlap 与 catch-up 参数未展开；做法 I 的通道与事件插件配置在 skills/agent-autoloop/SKILL.md；做法 J 的 SELF_HOSTING.md 细节未展开。
- 把作者自述当事实。CowAgent 的 stars 和 self-evolution、Eigent 的 boosts productivity、NanoClaw 对 OpenClaw 的对比数字、Comma 的 sessionless 和 swarm intelligence、做法 F 的条目取舍标准、做法 G 的拆解质量、做法 H 的 persistent bots、做法 I 的性能数据、做法 J 的 safe by default 和一条命令约 10 分钟，均无案例、基准或第三方评测支撑。
- 定时任务不生效。nanobot 先确认网关常驻；NanoClaw 先确认宿主和容器在跑并用 list 确认任务登记；Comma 先确认实例在跑、Loops 盯的信息源真的有新事件；做法 F 先确认不是把源读不到当成今天没新闻；做法 G 先手动跑 claude -p，再查 cron 或 launchd；做法 H 先确认应用与 sidecar 在运行、bot 已创建、routine 已启用，再查 H-3 验证链和逐线程 token；做法 I 先跑 check 看规则、status 看轮次、why 看原因，文字通道收不到卡片先查 hub.publicUrl；做法 J 先确认服务、runner、routines 都在跑，再看交付位置和审批人。
- 试用期就开放外网或高权限。CowAgent 只能在可信环境部署；NanoClaw 先核对挂载清单；Comma 默认只绑 loopback，先别按 E-5 暴露；做法 F 的 allowlist 只放必需主机；做法 G 凭证只放 .env；做法 H 审批先用 on-request，computer use 先别开；做法 I 先用沙盒目录；做法 J 默认 Tailscale 私有 HTTPS，公共域名用 Caddy，MCP 最小 scope，审批人 owner 或 admin，月预算先设低。

## 证据与来源

- 做法 A：来自 HKUDS/nanobot 调研，安装脚本、uv tool install、nanobot webui、gateway --background 及管理命令、session/workspace、-m 均为 README 原文命令。项目自述 MIT、v0.3.5，平台覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64；能力清单和 Dream 长期记忆、多智能体委派效果均为作者主张，没有效果数据。
- 做法 B：来自 zhayujie/CowAgent 调研，run.sh、run.ps1、docker compose、cow CLI、/skill、cow install-browser、控制台 9899、config.json 的 web_host 和 web_password 均为 README 原文。可核事实：MIT、仓库自报 47192 stars、版本到 v2.2.0；原文明确警告 Agent 模式 token 消耗显著多于普通对话、Agent 可访问本机操作系统只能在可信环境部署。proactively plans、self-evolution、记忆分层、知识库自动整理等是作者主张。
- 做法 C：来自 eigent-ai/eigent 调研，git clone 加 npm install 加 npm run dev、前端 npm install 与后端 uv sync 均为 README 原文。可核事实：Apache 2.0、约 15,457 stars、FastAPI 加 uv 加 Uvicorn 加 CAMEL 后端、React 加 Electron 加 TypeScript 加 Tailwind/Radix 前端。单 agent 与 Workforce 的划分没有选择规则；本地部署命令在未提供的 server/README_EN.md；Automation 只有一句描述；用例库只有标题、一句描述和链接。
- 做法 D：来自 nanocoai/nanoclaw 调研，git clone 加 bash nanoclaw.sh、migrate-v2.sh、@Andy 示例、list/pause/join、/customize、/add-telegram、/add-codex、/add-opencode、/add-ollama-provider、.env 的 ANTHROPIC_BASE_URL 和 ANTHROPIC_AUTH_TOKEN、/manage-channels、ncl groups create --template、NANOCLAW_NO_DIAGNOSTICS=1、--uninstall 均为 README 原文。可核事实：仓库 30866 stars，不构成效果证据；Node 宿主加每个 agent group 独立 Docker 容器、凭据网关注入、per agent group 的 CLAUDE.md 和记忆均来自 README 自述；script gates 和 docs 细节只有链接。
- 做法 E：来自 AFK-surf/Comma 调研，cp .env.example .env、docker compose up -d --build、pnpm install 加 make dev、make dev-electron、三组测试、8080/8082/8081/4000/8025、.env 变量表、五个 named volume、systems/DEPLOYMENT.md、mock 模型登录方式均为 README 原文。可核事实：AGPL-3.0-only，修改后对外提供服务需保留 /source.tar.gz 下载；贡献需签 AFK AI, Inc. CLA；仓库 172 stars。运行时主要为 Elixir/OTP，关键系统组件用 Lean，核心分布式协议用 TLA+ 模型检查；原文明确声明形式化验证不证明模型判断或任务成功。
- 做法 F：来自 claude.dev 的 reference implementation 走查 Building effective agent automations，作者 Lance Martin、CJ Avilla，2026-10-08。claude update、/claude-api managed-agents-onboard、ant apply vault.yaml、TypeScript SDK 加凭据、daily-brief 八个文件、agent.md frontmatter、第 4 和第 5 条运行步骤、deployment.md 的 cron/timezone/vault_ids/resources、bookmark 与 ledger、源失败三条规则、幂等三规则均为原文。参考实现有八条运行步骤，本次只摘录第 4 和第 5 条；原文在部署一节被截断，没有可照抄部署命令；Managed Agents 处于 beta；条目取舍标准和信任判断是作者主张，没有效果数据。
- 做法 G：来自 manthanpatelll/instagram-research-tool 调研，git clone 加 claude、/research-setup、npm run library/sample-report/selftest、/outliers、/reel-research inbox、/reel-research <reel link>、claude -p、config.json 八个字段、niche.json/voice.md/inbox.txt/.env、四个数据源能力与成本均为 README 原文。可核事实：MIT、npm 零依赖、Node 18+、仓库 31 stars；产出八个板块；每日搜索约 70 次；outlier 窗口默认 24h、上限 48h、合格 reel 少于 15 条才放宽；最低播放量 2000；Sandcastles 起 49 美元每月、Apify 每条不到 1 美分、一次完整每日搜索约 1.70 美元、每月 5 美元免费额度、yt-dlp 免费。局限：所有功能描述、设置约 10 分钟、拆解质量均为作者主张；截图明确标注合成样本；cron 和 launchd 写法在未提供的 docs/iphone-shortcut.md。
- 做法 H：来自 touri-ai/touri 调研，Release 下载、Gatekeeper 三步、xattr、bun install/build:sidecar/tauri build、验证链、真实 CLI 冒烟、导入器 dry-run、sidecar serve、mcp-stdio、审批模式、逐线程 token、computer use、bot machine、packages/contracts 均为 README 原文。可核事实：Apache-2.0、仓库 35 stars、Tauri v2 加 Bun sidecar 加 React UI；数据存 ~/Library/Application Support/touri 下 SQLite，无遥测、无需账号，凭据放 Keychain，可选云托管单独 opt-in；安装要求 macOS 14+、Apple Silicon、已登录 Codex 或 Claude Code CLI；bot machine 需 macOS 26 加 Apple container 1.5.0 以上；源码构建需 Bun 1.2.21+、Rust 1.90+ 带 aarch64-apple-darwin；Release 未签名、未公证。局限：UI 新建 bot、routine 调度、overlap 与 catch-up 参数未说明；所有功能声明无截图、演示、案例或效果数据。
- 做法 I：来自 KKKKhazix/agent-autoloop 调研，mkdir 沙盒、install.sh、try、answer、status、rules.json 示例、check、why、ask/notice/resolve/later/events、skills/agent-autoloop/SKILL.md 的插件与通道小节、hub.publicUrl、deliver 标签均为原文。可核事实与原文自测：内核约 1651 行、零运行时依赖；Apple M5 Pro、24 GB、Node 24.21.0 上冷启动 88.78 ms、空闲内存 59.94 MB RSS、1000 个同时等待的长轮询 170.49 MB RSS、持久化写入 2394 条每秒、派活 p99 1.82 ms、110 万条事实时启动 99.8 ms、格式变化后从日志全量重建 110 万条 43.1 秒；20 万步模拟断网、丢包、崩溃和重复提交，强杀进程 1000 次检查已确认记录不丢；整机断电没有单独测过。局限：四种 Webhook 模板只在本地模拟服务上验证过；反馈处理、网站巡检和飞书摘要只使用虚构样例和假飞书 CLI；其他 CLI Agent 接入命令整理自官方文档，没有逐个跑过；没有独立第三方评测。
- 做法 J：来自 agentes-chat/agentes-chat 调研，安装命令 curl -fsSL https://agentes.chat/install | sh、Docker 和 Postgres 唯一依赖、Tailscale 私有 HTTPS 或公共域名加 Caddy、组织模型 key、agent 角色/instructions/模型/月预算/所有者、MCP 一键连接与 Composio 连接器、审批卡片、routines、agent computer、browser Beta、Claude Code 和 Codex 在连接电脑上运行、Postgres connector Beta 只读 SQL、mailboxes Beta 默认发送审批、skills/wiki/tasks/memory、从 Grok Bot/ChatGPT dots/OpenBot.run/OpenMausBot/Hermes Agent/OpenClaw/Paperclip 导入、wiki 支持 Obsidian 导入，均为 README 原文。可核事实：AGPL-3.0-only 与商标/署名条款；仓库指标 205 stars；大量功能标注 Beta；README 首图是产品团队和 AI agent 一起发布版本的示意图，不是可核验案例。作者主张包括 safe by default、agents that actually do the work、一条命令约 10 分钟、每次调用有预算和记录、router never grants a permission 等；没有基准测试、客户案例或独立审计。适用条件：需要 Linux 和 Docker/Tailscale 运维能力；组织自备模型 key；配置 MCP scope 和审批人；Beta 功能不宜直接用于高风险生产；SELF_HOSTING.md 未展开，手机、公共域名、升级、备份和无 Docker 细节不能当已验证步骤。
- 最小闭环与判断指标：只配一个模型加一个技能加一个定时任务、连续处理同类任务 5–10 次、按时完成率、人工介入次数、耗时与返工、token 成本、技能复用次数、记忆有效性、1–2 周、降级为 watch 的条件，来自 nanobot 与 CowAgent 调研的结论与验证建议；人工耗时对比、首次通过率、调度可靠性、数据边界、失败可诊断性、先 Quick Start 再换本地模型再试 Workforce 最后试 Automation，来自 Eigent 调研；小范围试、只接一个频道、配一到两个可人工核对的定时任务跑两周、排障交给 Claude Code 或 /debug、用卸载器干净回滚，来自 NanoClaw 调研；先用 make dev 跑通再自建单机实例、把真实长周期任务交给 Task 加 Loop 跑一两周、栈很重不宜直接采用，来自 Comma 调研；单一来源加单一收件人加每日一次、手动触发验证、bookmark、源失败三条规则、先查重确认成功才记账、只推读者今天会行动的条目、发布前复核、链接从源字段复制、调度时区与正文时区分别写清，来自做法 F 调研；先跑 selftest 与合成样本、用免费 yt-dlp 验证单条、想要雷达再上 Apify、缺失数字留空、先手动跑 /outliers 再挂 cron，来自做法 G 调研；在符合条件的机器上装 touri、只配一个 runtime、只建一个 routine、审批先用 on-request、先不开 computer use 和 bot machine、用 H-3 验证链判断软件是否正常，来自做法 H 调研；安装后跑 try 完成一次提问到拍板到续跑、选低风险只读或只写沙盒流程试 1–2 周、记录人工基线、用 status 和 why 记录轮数 Token 费用和原因、出现未授权写操作或关键告警漏报就停止扩大范围，来自做法 I 调研；Linux 测试服务器、一个模型 key、一个私有频道、一个有角色 instructions 月预算所有者的 agent、一个只读 MCP 或不接、一个计划或事件 routine、审批开启、跑两周并与人工基线对照、看交付质量返工人工介入时效成本安全稳定性和学习效果，来自做法 J 调研。这些都是调研作者给出的自建方法，不是项目官方提供。
- 只是作者主张：nanobot 的小而可读、Dream 长期记忆、多智能体委派实际效果；CowAgent 的 proactively plans、self-evolution、grows alongside you、Agent Harness engineering 参考实现、记忆分层与 Deep Dream、知识库自动整理、Self-Evolution 具体效果；Eigent 的 boosts productivity、exceptional productivity、turn your most complex workflows into automated tasks、Zero Setup；NanoClaw 与 OpenClaw 的对比数字和 Claude 能安全修改小代码库；Comma 的 sessionless、relentless、swarm intelligence、24/7 持续完成目标、你管目标不管 swarm，以及示例视频；做法 F 的一条过期的 still waiting on you 比十条漏掉的条目更伤信任和条目取舍规则收益；做法 G 的数据源只取事实分析全交给 Claude Code 所以换数据源不改变拆解质量、设置约 10 分钟、拆解板块实际价值；做法 H 的 persistent bots、routines 带 overlap 和 catch-up、agent browser 带人工接管、computer use 带可见指示器和 kill switch；做法 I 的性能数据、四种 Webhook 模板验证范围、反馈处理网站巡检飞书摘要的虚构样例、其他 CLI Agent 接入命令可用性；做法 J 的 safe by default、agents that actually do the work、一条命令约 10 分钟、每次调用有预算和记录、router never grants a permission——均无案例、基准或第三方评测支撑，各份调研都明确标注为自述、判断或矛盾表述。
- 项目间关系：nanobot 的 gateway 自述对 OpenClaw 用户是熟悉入口；CowAgent 的 Skill Hub 声明技能格式与 OpenClaw、Claude Code 互通；NanoClaw 原生使用 Anthropic 官方 Claude Agent SDK，是 Claude Code 的容器化加常驻化外壳，并把 OpenClaw 作为对比对象，可通过 /add-opencode 接 OpenRouter、Google、DeepSeek，通过 /add-ollama-provider 接本地开源权重模型；Eigent 只声明定位与 Claude Cowork 或 Codex 相似，无迁移或兼容性说明；Comma 调研把 Claude Code 当作被编排对象，Codex 和 Claude Code 可像应用一样被调用或注册为 Worker 或 Sub-agent；做法 F 用 Claude Code 里的 claude-api skill 生成起点文件，运行本身在 Anthropic 托管平台；做法 G 明确说清单中已有 Claude Code，本工具是建立在它之上的具体 skill 套装；做法 H 把 Claude Code 作为 runtime 接入，touri 是编排或外壳层；做法 I 把 Claude Code 列为内置 Agent 之一，agent-autoloop 不替代 Claude Code，而是在它外面加调度、审批、审计和持续跟进层；做法 J 把 Claude Code 和 Codex 作为可在连接电脑上运行的后端之一，agentes.chat 更像承载 Claude Code、DeepSeek 等模型或执行器的协作与权限层，并可从 OpenClaw、Hermes、Paperclip、OpenBot 等导入资产；DeepSeek、DeepSeek Harness、Hermes、OpenClaw、Cursor 在做法 I 里只有通用命令接入，未实测。各份调研都没有给出这些项目之间的直接对比测试，因此本手册不比较优劣，只按形态偏好、渠道需求、托管或自托管取舍选一个。

## 依据的调研

- [HKUDS/nanobot](../research/radar/2026-10-02/551-hkuds-nanobot.md)：值得一试，建议小范围试用：本地装好 nanobot、接一个模型，把一件周期性重复的工作配成 automation 跑两周，再用“定时投递成功率 + 人工返工时间”判断是否值得纳入日常工作流；理由是 README 给出了完整可复制的安装、首次配置、常驻网关和定时任务步骤，但没有任何效果数据或对比案例支撑。
- [zhayujie/CowAgent](../research/radar/2026-10-02/552-zhayujie-cowagent.md)：值得一试，建议小范围试：在可信的本地/服务器环境用原文给出的一行命令部署 CowAgent，跑通“一个模型 + 一个技能 + 一个定时任务”的最小闭环，再决定是否扩用；理由是原文提供了可直接复制的安装、cow CLI、技能安装与 MCP/调度/多模型路由的配置骨架，但完全没有具体工作场景的流程、提示词或效果数据，且 Agent 模式成本高、有本地系统权限风险。
- [eigent-ai/eigent](../research/radar/2026-10-02/577-eigent-ai-eigent.md)：值得一试，建议小范围试：按 README 给出的命令把 Eigent 桌面端跑起来，先在一个周期性、输入输出明确的任务（如每月汇总 PR 生成报告）上验证「多 agent 并行 + 定时自动化」是否真能减少人工；理由是原文给了可照做的安装与更新命令、明确的单 agent/多 agent 分工和本地部署选项，但完全没有给效果数据，所以不能直接 adopt。
- [nanocoai/nanoclaw](../research/radar/2026-10-02/583-nanocoai-nanoclaw.md)：值得一试，建议在一个可丢弃的环境里小范围试：按 README 的 nanoclaw.sh 一键装好，只接一个频道、配一到两个可人工核对的定时任务跑两周，因为它给出了可照抄的安装/使用/调试/卸载流程和容器级隔离，但全部依据仅来自项目 README，没有效果数据或第三方验证，且定制方式是改代码。
- [AFK-surf/Comma](../research/radar/2026-10-05/1312-afk-surf-comma.md)：值得一试，先用 `make dev`（内置确定性 mock 模型、无需 API key）在本机跑通，再按根目录 compose.yaml 自建单机实例，把一个真实的长周期任务（如仓库/收件箱监控）交给它的 Task+Loop 机制跑一两周；README 给出了可直接照做的部署步骤、完整环境变量表和权限开关，适合作为“常驻代理 + 工具权限供给 + 触发式推进”的试点对象，但它除运行时形式化验证外没有任何任务成功率或效果数据，且栈很重，不宜直接采用。
- [Building effective agent automations](../research/radar/2026-10-09/2065-building-effective-agent-automations.md)：值得一试，先按文中六条规则和参考实现的文件结构，在“单一来源 + 单一收件人 + 每日一次”的最小场景里试跑一个定时 brief（用 /claude-api managed-agents-onboard 起步、用手动触发而非等排期来验证），因为它给出了可复制的配置、命令和失败模式清单，但仍属 beta 且强依赖 Anthropic 托管平台，幂等性、漏读上报和成本上限都需自己实测。
- [manthanpatelll/instagram-research-tool](../research/radar/2026-10-13/2840-manthanpatelll-instagram-research-tool.md)：值得一试，可以小范围试：它给出了可照做的完整流程（clone、`/research-setup` 向导、日常斜杠命令、`config.json`/`niche.json`、cron/launchd 定时），把「Claude Code + 外部数据源 + skill + inbox + 每日雷达」这套可迁移模式落到具体配置；但依赖付费数据源、效果数据缺失、截图是合成样本，先小范围验证再决定是否写进手册。
- [touri-ai/touri](../research/radar/2026-10-16/3983-touri-ai-touri.md)：值得一试，在符合条件（macOS 14+ Apple Silicon、已登录 Codex/Claude Code CLI）的机器上装 touri，用它的 routines（cron 调度 bot）和审批模式跑一个低风险重复任务做小范围验证；理由是该仓库给出了可复制的安装、构建、验证与导入命令，且提供了常驻代理、定时触发、逐线程 token 与隔离 VM 这些正对研究问题 3、4 的具体机制，但它未签名、文档未展开配置细节、仅有 35 stars，所以先小范围试而非直接采用。
- [KKKKhazix/agent-autoloop](../research/radar/2026-11-04/10192-kkkkhazix-agent-autoloop.md)：值得一试，建议先小范围试：在一台 Mac/Linux 机器上安装 agent-autoloop，按内置 try 和一个低风险定时/巡检规则跑通“事件→Agent→人工拍板→续跑”闭环；原因是它把后台接活、挂起零消耗、卡片审批和审计做成了可配置流程，但真实业务、多通道和多 Agent 仍多为局部验证。
- [agentes-chat/agentes-chat](../research/radar/2026-11-12/12728-agentes-chat-agentes-chat.md)：值得一试，建议小范围自建试用：用频道、代理角色、审批和例行任务搭一个低风险可观察工作流，再与人工基线比较；理由是 README 给出了安装命令和较具体的权限、调度、审批机制，但缺少效果数据，且多项关键功能仍是 Beta。
