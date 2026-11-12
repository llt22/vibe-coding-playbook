# 把周期性重复工作交给常驻 agent 前，先做两周可回滚的试跑

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：面对周期性重复工作，如何从多种常驻、托管或协作型 agent 中选一条路线，用两周小范围试跑和可观察指标判断它是否值得进入日常工作流。
> 先试这一步：选一条路线（A–K），只配一个模型、一个定时或事件触发，连续跑 5–10 次同类任务，并从第一次运行就记录按时完成率、人工返工时间和成本。
> 最近修订：2026-11-13

## 解决什么问题

周期性重复的工作——按固定时间汇总某个信息源、每周重复读同一批文件、跑同一批命令、查同一类网页——看起来很适合交给一个常驻的本地或服务器端 AI agent、桌面端多 agent 应用、托管定时 agent，或自托管的 Slack 式人机协作平台。但这类项目的 README 往往只给安装和配置步骤，不给效果数据、对比案例或评估方法。

这份手册给出一条可执行的试跑路径：起一个实例 → 只接一个模型 → 配一个定时或事件触发 → 跑两周 → 用“按时投递成功率 + 人工返工时间 + token 或模型成本”决定它是否进入你的日常工作流。以下路线共用同一套判断标准，选一条走完即可：A nanobot、B CowAgent、C Eigent、D NanoClaw、E Comma、F Claude Managed Agents、G Claude Code + instagram-research-tool、H touri、I agent-autoloop、J agentes.chat、K AgentRun。

其中几条不是同一层东西：Comma 是上层编排 + 持久 Task 状态 + 事件/时间触发 + 权限边界，把 Codex、Claude Code 这类已有 agent 当应用调用，或注册为 Worker / Sub-agent；Claude Managed Agents 把 agent 跑在 Anthropic 基础设施上，本机不需要常驻进程，代价是依赖 beta 托管平台；做法 G 是“系统定时器 + 一次性 claude -p 命令”唤醒本机已有的 Claude Code；做法 H 的 touri 是 local-first macOS 桌面应用，把 Codex、Claude Code、OpenCode 这类 CLI 变成常驻 bot；做法 I 的 agent-autoloop 是 macOS/Linux 上的轻量自动化中台，把定时任务、GitHub Issue、HTTP 事件变成标准事件，按 rules.json 派给已登录 CLI Agent，每轮干完就退出；做法 J 的 agentes.chat 是开源、可自托管的 Slack 替代品，让团队和多个 agent 在频道、线程和 DM 中协作；做法 K 的 AgentRun 是套在已有 harness 外面的控制平面 + 持久化执行 + 学习层，可把 pi、Claude Code、Codex、OpenCode 当可选 harness。如果你只是想要一个编码 agent，沿用原来的四条路线更直接。

## 适用与不适用

**适用**

- 你手上有明确的周期性重复工作，形态落在读文件、跑命令、查网、按计划重复、拆给多个子代理、盯收件箱或仓库事件、在频道里让人和 agent 协作处理同一件事。
- 有一台可联网、且你信得过的 Linux、macOS 或 Windows 机器或服务器。做法 J 需要 Linux 服务器和 Docker；做法 K 需要 Node 24.22.3+ 和 macOS/Linux。
- 至少有一个模型厂商的 API key，或者能在本机跑起一个本地推理服务。做法 K 可用 OpenRouter、Anthropic 或 OpenAI key；做法 J 需要组织自备模型 key。
- 想先拿到可复制的目录结构、配置和失败模式清单再动手。做法 K 的 README 给出安装、模板、workflow JSON、CLI/API、触发器和部署路径，但收益数字均为作者自报。
- 能接受先花 1–2 周观察期，而不是马上全量切换。

**不适用**

- 没有重复性工作，只是想试个新工具。
- 必须部署在不受信任的环境。CowAgent 的 README 明确说 Agent 能访问本机操作系统，只能在可信环境部署。
- 承担不了 token 或模型成本。Agent 模式通常显著多于普通对话；做法 J 给每个 agent 设月预算，做法 K 用 --max-cost-usd 给单次 run 设上限。
- 期待有现成效果数据可抄。A–K 的调研都指出原文没有独立效果数据或第三方评测；做法 K 的收益数字是作者自报、样本只有 30 个 PR。
- 不愿意为数据源付费、又需要完整每日雷达。做法 G 的每日搜索要用 Sandcastles 或 Apify；免费 yt-dlp 只支持单条公开链接。
- 不能接受 beta 托管平台，或不愿意把信息源与凭据交给模型厂商的托管环境。做法 F 的凭据存在 vault 里。
- 不能接受 macOS 或 Linux 限制。做法 H 仅 macOS、仅 Apple Silicon；做法 I 仅 macOS 或 Linux；做法 K 仅 macOS 或 Linux；做法 J 需要 Linux 服务器和 Docker/Tailscale 运维能力。
- 不能接受做法 J 的 Beta 边界：browser、Postgres connector、mailboxes、phone app、desktop app、导入和无 Docker 自托管均为 Beta；Codex 接入仍在测试；AGPL-3.0-only 和商标/署名条款意味着分发修改版有额外义务。
- 不能接受做法 K 的以下边界：收益数字为作者自报、样本小、无独立复现；deploy 目录的 compose 没有 Docker socket，agent 只有文件工具和 web_fetch、没有 shell；密钥封存在 AGENTRUN_SEAL_KEY 下，丢失即解不开；API token 不能写密钥、不能批准工具调用。

## 前置条件

- 用 nanobot：Python 3.11+；源码安装额外需要 Git 和 Bun；平台 wheel 覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64。
- 用 CowAgent：一台可联网的 Linux、macOS 或 Windows 机器或服务器；至少一个模型厂商的 API key。
- 用 Eigent：桌面环境；快速开始模式需要 Node.js 18–22 和 npm；后端 Python 依赖用 uv 管理；本地部署命令在 server/README_EN.md。
- 用 NanoClaw：macOS 或 Linux（Windows 走 WSL2）；Node.js 22+ 与 pnpm 10+；Docker Desktop 或 Docker Engine；Claude Code；Anthropic 凭据或其他 provider。
- 用 Comma：自建实例需要 Docker Engine + Compose v2.24+、足够磁盘、一个模型服务商账号；默认栈不含 mock 模型；本地开发模式需要 pnpm。
- 用 Claude Managed Agents：一个 Claude API workspace（beta）；已安装 Claude Code 并能跑 claude-api skill；一个 Slack app 和一个 GitHub token；凭据按源放进 vault。
- 用 Claude Code + skill 套装：已安装 Claude Code；Node.js 18+；至少一个数据源；凭证放 .env。
- 用 touri：macOS 14+、Apple Silicon；本机已安装并登录 Codex 或 Claude Code CLI；bot-machine 需要 macOS 26 与 Apple container 1.5.0+；源码构建需要 Bun 1.2.21+、Rust 1.90+ 并带 aarch64-apple-darwin target；Release 未签名、未公证。
- 用 agent-autoloop：macOS 或 Linux；Node 24、Git、curl；一个已登录的命令行 Agent；先建沙盒目录 mkdir -p ~/autoloop-sandbox/notes。
- 用 agentes.chat：Linux 服务器；Docker；README 默认走 Tailscale 私有 HTTPS，也可用公共域名加 Caddy；组织自备模型 key；需要读 SELF_HOSTING.md 了解未展开的自托管细节；Postgres 是唯一依赖。
- 用 AgentRun：Node 24.22.3 或更新；macOS 或 Linux；想用 Docker sandbox 需本机 Docker 在运行（首次构建镜像需数分钟）；默认 SQLite，可换 Postgres；OpenRouter key 可给所有 harness 供模型，Anthropic key 跑 pi 和 Claude Code，OpenAI key 跑 pi、Codex、OpenCode。
- 常驻前提：nanobot 的定时投递要求网关常驻；CowAgent 定位 7×24；Eigent 的 Automation 要求应用或服务在跑；NanoClaw 是 Node 宿主进程加每个 agent group 一个 Docker 容器；Comma 的 Task 只要实例在跑就继续执行；做法 F 不需要本机常驻；做法 G 不需要常驻网关或容器；做法 H 取决于应用与 sidecar 是否运行；做法 I 每轮干完就退出，但调度服务本身要能跑；做法 J 的服务、routines 和 runner 必须运行；做法 K 的 server 和 runner 需运行，多 runner 时死掉 runner 的 run 在其 30 秒租约到期后被接管。
- 试用期约定：Docker 优先，只开本地或私有网络访问，先不要把控制台暴露到公网。NanoClaw 匿名诊断默认开启，可用 NANOCLAW_NO_DIAGNOSTICS=1 关闭；Comma 默认公开端口只绑 loopback；做法 F 收紧 environment.yaml 的 allowlist；做法 G 凭证只放 .env；做法 H 数据默认存本机 SQLite、凭据放 Keychain；做法 I 先用沙盒目录；做法 J 默认 Tailscale 私有 HTTPS、MCP 最小 scope、审批人 owner/admin、月预算先设低；做法 K 的端口只绑本机 loopback，对外要加 TLS 代理。

## 操作步骤

### 第 1 步：先选一种做法，别同时上多个

A、B、C、D、E 属于长驻或桌面或编排 agent harness，能力清单高度重叠。F 是托管执行、本机不留进程。G 是系统定时器唤醒一次性 Claude Code 会话。H 是 local-first macOS 桌面应用，把 CLI 变成常驻 bot。I 是已有 CLI agent 外面的调度、审批与审计层。J 是自托管 Slack 式协作与权限层。K 是套在已有 harness 外面的控制平面 + 持久化执行 + 学习层。

- 想接主流 IM 渠道、用现成技能市场、对话式生成技能 → 做法 B：CowAgent。
- 想要更小内核、WebUI 加终端 workbench、OpenAI 兼容 API 或 Python SDK → 做法 A：nanobot。
- 想要桌面图形界面、多 agent 并行、接本地推理模型、内置浏览器与终端工具包 → 做法 C：Eigent。
- 想要容器级文件系统隔离、凭据网关注入、按频道选择隔离或共享、能接受定制即改代码 → 做法 D：NanoClaw。
- 想要会话只是界面、Task 才是持久执行状态，把已有 Codex 或 Claude Code 当应用调用或 Worker，能接受自建整套栈 → 做法 E：Comma。
- 想跑在厂商托管基础设施上、本机不留常驻进程、已经在用 Claude Code 和 Anthropic API、能接受 beta 和托管边界 → 做法 F。
- 已经在用 Claude Code、要盯一个内容源、想要拆解流程加 inbox 加每日雷达加用自己语气重写、能接受付费数据源 → 做法 G。
- 你在 macOS 14+ Apple Silicon 上，已登录 Codex 或 Claude Code CLI，想把这些 CLI 变成常驻 bot，要 cron routines、按风险选的审批模式、逐线程 MCP token、可选隔离 Linux VM，能接受未签名 Release → 做法 H。
- 你已经有登录好的 CLI Agent，想让它们在后台按 cron、GitHub Issue 或 HTTP 事件接活，遇到删数据、重启服务、花钱、对外发消息时推卡片等人拍板，等待期间不占进程、不耗 Token → 做法 I。
- 你想要一个自托管的 Slack 式工作空间，让团队和多个 agent 在频道、线程和 DM 里协作，需要 agent 角色、instructions、月预算、所有者、MCP 最小权限、敏感动作审批、routines、skills、wiki、任务板和 memory，能接受 Linux + Docker + Tailscale 或 Caddy 运维，能接受大量 Beta 和 AGPL 义务 → 做法 J：agentes.chat。
- 你想在已有 harness 外面加控制平面、持久化执行和学习层，能接受 Node 24.22.3+、本地 SQLite/Postgres、模板和 workflow JSON，想先验证 learning 打开前后同一批任务的 token 成本与通过率 → 做法 K：AgentRun。它默认不是手册的默认方案，先按本地模板试跑和费用上限验证。

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

预期结果：nanobot --version 能输出版本号。

A-2 首次运行并配置模型：

```bash
nanobot webui
```

打开 http://127.0.0.1:8765，在 Settings → Models 选 provider、凭据和模型；新建 topic 发 Hello! 验证。

A-3 让网关常驻：

```bash
nanobot gateway --background
nanobot gateway status
nanobot gateway logs
nanobot gateway restart
nanobot gateway stop
```

A-4 终端工作：nanobot 以启动目录作为 workspace；一次性执行用 nanobot -m 'Hello!'；指定会话与工作区用 nanobot --session <会话> --workspace <工作区>。

A-5 在 WebUI 的 Apps 里连接 MCP、启用 Agent Plugins、管理本地 CLI App 适配器；Skills 放可复用指令。

A-6 配一个周期性自动化：在接收结果的 topic 里创建 automation，用 Tasks 查看日程，用 Calendar 扫描已完成和即将执行。前提是网关保持运行。

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

B-4 对话里装技能：/skill list、/skill search <keyword>、/skill install <name>。装不到合适的，用 skill-creator 对话生成一个最小技能。

B-5 可选接 MCP：准备 mcp.json，支持 stdio / SSE 和热重载；字段示例需查官方文档页 /tools/mcp。

B-6 服务器部署试用阶段先别做；要暴露时在 config.json 把 web_host 设为 0.0.0.0、设置 web_password、放行 9899，并且只在可信环境部署。

### 第 4 步（做法 C）：跑起 Eigent 并接入一个模型

C-1 快速开始（会连 Eigent 云端、需要注册账号，不是完全本地）：

```bash
git clone https://github.com/eigent-ai/eigent.git
cd eigent
npm install
npm run dev
```

C-2 拉新代码后同步依赖：项目根目录 npm install；backend 目录 cd backend && uv sync。

C-3 本地部署看 ./server/README_EN.md；本次材料未包含具体命令。

C-4 选协作模式：单 agent 适合聚焦任务；Workforce 适合复杂多步并行。README 没有给选择规则，需要自己在试用中定。

C-5 接模型：云端 API、企业网关或本地推理；本地要跑起 vLLM、Ollama、LM Studio 之一。

C-6 工具与能力入口：MCP Integration、Skill Integration、内置 Browser & Terminal Toolkits；配置示例需查 docs.eigent.ai。

C-7 Automation 只有一句功能描述，未给调度配置格式。

### 第 5 步（做法 D）：部署 NanoClaw 并接一个频道

D-1 一键安装并配对第一个频道：

```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash nanoclaw.sh
```

脚本会补装 Node、pnpm、Docker，安装凭据网关并注册 Anthropic 凭据，构建 agent 容器，配对第一个频道。

D-2 用触发词下指令，默认 @Andy：

```text
@Andy send an overview of the sales pipeline every weekday morning at 9am (has access to my Obsidian vault folder)
@Andy review the git history for the past week each Friday and update the README if there's drift
@Andy every Monday at 8am, compile news on AI developments from Hacker News and TechCrunch and message me a briefing
```

管理任务：@Andy list all scheduled tasks across groups；@Andy pause the Monday briefing task；@Andy join the Family Chat group。

D-3 改行为：直接对 Claude Code 说要什么，或运行 /customize。加频道或换模型用 skill：/add-telegram、/add-codex、/add-opencode、/add-ollama-provider。

D-4 用 /manage-channels 按频道选择各自独立 agent、共享一个 agent 或折叠成单一共享会话；容器只挂载显式允许的目录，凭据不进容器。

D-5 模板化起 agent：

```bash
ncl groups create --template <ref>
```

D-6 关闭匿名诊断：NANOCLAW_NO_DIAGNOSTICS=1。卸载或回滚：bash nanoclaw.sh --uninstall；先跑 --dry-run 预览。

### 第 6 步（做法 E）：部署 Comma 并跑通一个长周期任务

E-1 本地开发模式，确定性 mock 模型，不需要 API key：

```sh
pnpm install
make dev
```

用 comma-local@example.com 登录，登录码在 Mailpit http://127.0.0.1:8025 读取；Mac app 用 make dev-electron。

E-2 自建单机实例：

```sh
cp .env.example .env
docker compose up -d --build
```

把 COMMA_OWNER_EMAIL 设成自己的邮箱；在 .env 设置模型服务商，或登录后在 Settings 配私有模型；打开 http://localhost:8080 请求登录码，在 http://localhost:8025 读取。默认公开端口只绑 loopback。

E-3 关键环境变量：COMMA_OWNER_EMAIL、COMMA_ALLOW_SIGNUP、COMMA_LLM_BASE_URL、COMMA_LLM_PROTOCOL、COMMA_LLM_MODEL、COMMA_LLM_API_KEY、COMMA_LLM_CONTEXT_TOKENS、COMMA_LLM_MAX_TOKENS、COMMA_EXA_API_KEY、COMMA_SMTP_*、COMMA_PUBLIC_URL、COMMA_API_URL、COMMA_ADMIN_URL、COMMA_SALIX_URL。

E-4 默认地址：Comma Web http://localhost:8080；Admin http://localhost:8082；Product API http://localhost:8081；Salix dashboard http://localhost:4000/dash；Local inbox http://localhost:8025。

E-5 升级前先停栈；一起备份 config、postgres、objects、clickhouse、redis 五个 named volume；config 卷保存加密密钥和认证密钥，不要删除、不要重新生成；docker compose down 保留数据，不要随手加 -v。

E-6 交给它一个真实长周期任务：Task 自动转成独立 agent loop，持续 plan → execute → review → verify，需要你决策时停在 Needs Review；Routines 按时间触发；Loops 按事件触发。看板四态 Backlog / In progress / Needs Review / Done。被中断的写操作不会自动重跑。

### 第 7 步（做法 F）：用 Claude Managed Agents 搭一个每日 brief

F-1 更新 Claude Code：claude update。

F-2 用 claude-api skill 起步：

```text
/claude-api managed-agents-onboard https://claude.dev/blog/building-effective-agent-automations/
```

F-3 daily-brief/ 的参考文件结构：agent.md、deployment.md、environment.yaml、memory_store_preferences.yaml、memory_store_state.yaml、vault.yaml、claude-lock.json、slack/manifest.yaml。

F-4 建 vault 并放凭据：

```shell
ant apply vault.yaml
```

用 TypeScript SDK 逐个添加凭据；GitHub 走 MCP，由沙箱外 proxy 调用；Slack 走沙箱内 bash + curl，沙箱里只放占位符，请求离开沙箱时平台对 allowlist 内主机替换成真 token。

F-5 用 bookmark 而不是固定时间窗口读来源：每个来源一个 bookmark，运行结束时把最新条目的时间戳写进 bookmarks.json；bookmark 放在名为 state 的 memory store 里，平台每次挂载到沙箱 /mnt/memory/。

F-6 读取失败要显式上报：源失败时不动该源 bookmark，用其余源照常写简报，在简报末尾用一行点名没读到的东西。

F-7 确认发帖成功后才记账：先查当天标题是否已在目标频道近期消息里；只有 Slack 返回 ok true 且有 message ts 才算发出；确认后才更新 ledger 和 bookmark；结果不明确就标 maybe posted。

F-8 写 agent.md 的 frontmatter：model、mcp_servers、tools；GitHub 工具集必须设成不请求批准，token 只读，web 工具关掉。正文是运行步骤；材料只摘录了第 4 条和第 5 条原文，其余六条要回原文补全。

F-9 写 deployment.md：schedule 用 cron，timezone 决定触发时间；正文还要显式告诉 agent 用哪个时区算日期；resources 里 preferences 只读，state 读写。部署一节在调研原文被截断，没有可照抄命令。

### 第 8 步（做法 G）：用 Claude Code + skill 套装跑一个每日内容雷达

G-1 克隆并进入 Claude Code：

```bash
git clone https://github.com/manthanpatelll/instagram-research-tool.git
cd instagram-research-tool
claude
```

G-2 在 Claude Code 内跑首次设置向导：/research-setup。

G-3 先不配数据源，看产出结构合不合用：

```bash
npm run library
npm run sample-report
npm run selftest
```

selftest 返回 exit 0 表示环境检查通过；library 和 sample-report 是合成样本，只能看产出长什么样，不能当效果证据。

G-4 日常流程：刷内容时 Share → Save to Research 存 inbox；早上 /outliers 打开当日 outlier 报告；/reel-research inbox 拆解已保存 reel；/reel-research <reel link> 当场拆解单条；拍摄前打开 out/library.html 选选题。

G-5 让早上的部分自动运行：

```bash
claude -p '/reel-research inbox'
claude -p '/outliers'
```

没有常驻网关、没有常驻容器、没有托管平台；系统定时器起一次性 Claude Code 会话跑完就退出，状态落在仓库文件里。cron 和 launchd 示例在 docs/iphone-shortcut.md。

G-6 选数据源先算成本：Sandcastles 付费计划起 49 美元每月；Apify 按结果付费，每月 5 美元免费额度，每条 reel 不到 1 美分，一次完整每日搜索约 1.70 美元；yt-dlp 免费，仅单条公开链接，需本地 Whisper，IG 通常无播放量且可能被拦截。数字缺失时留空，工具声明从不编造数字。

### 第 9 步（做法 H）：安装 touri，把 Codex 或 Claude Code CLI 变成常驻 bot

H-1 安装 Release：从 Releases 下载 .dmg，把 touri.app 拖进 /Applications。未签名、未公证，首次启动会被 Gatekeeper 拦截。按三步走：打开 app 被拒绝；System Settings → Privacy & Security 点 Open Anyway；用密码确认。也可用：

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

可选真实 CLI 冒烟：TOURI_E2E_REAL_CLI=1 bun test sidecar/test/runtime/real-cli.test.ts。

H-4 从旧设置导入先 dry run：导入器幂等，routine 以 disabled 状态导入，从不读取凭据文件；SSH 源在远端只读。去掉 --dry-run 才真正导入。

H-5 直接运行 sidecar 或接 MCP：

```sh
TOURI_UI_TOKEN=dev-ui-token bun run sidecar/src/main.ts serve
bun run sidecar/src/main.ts mcp-stdio --thread <thread-id>
```

H-6 配置面：审批模式 on-request、workspace-write、full 按风险选；MCP gateway 用逐线程 token 并带审批提示；computer use 是 opt-in，必须有可见指示器和 kill switch；bot machine 通过 Apple container 起隔离 Linux VM；凭据从不被导入或存入 SQLite。

H-7 缺口：README 没有说明在 UI 里如何新建 bot、如何写 routine 调度配置、overlap 与 catch-up 参数怎么填；要照着手册用，需要补 docs/ 和界面说明。

### 第 10 步（做法 I）：安装 agent-autoloop，跑通事件→单轮执行→人工拍板→续跑

I-1 准备沙盒目录：mkdir -p ~/autoloop-sandbox/notes。

I-2 安装：

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

to 必须是 agents 里已登记的名字，cwd 换成实际目录。保存后几秒内自动生效；运行 agent-autoloop check 检查。

I-5 约定 Agent 如何回执：中台只要求 Agent 在最后一条回复里交代结果；需要请示时在回复末尾附 agent-autoloop 代码块，用 ask、notice、resolve、later、events。

I-6 配人工拍板通道：桌面通知默认开启；飞书、钉钉、企微、Slack、Discord 按 skills/agent-autoloop/SKILL.md 的通道小节配置。文字通道要把 hub.publicUrl 配成手机或电脑能打开的地址。

I-7 日常查看和审计：agent-autoloop status；agent-autoloop why 1；agent-autoloop check。

### 第 11 步（做法 J）：自托管 agentes.chat，在频道里让 agent 接重复工作

J-1 在 Linux 服务器运行安装命令。前提：允许脚本安装缺失组件，并在询问时确认安装 Docker；需要私有 HTTPS 时要能接入 Tailscale。

```sh
curl -fsSL https://agentes.chat/install | sh
```

J-2 添加组织模型 key。在应用内为组织添加 Claude、OpenAI、Gemini、DeepSeek、Kimi、Z.ai、MiniMax 或 OpenRouter 的 key；每个 agent 设月预算。

J-3 创建一个 agent：设角色、instructions、模型、月预算和所有者；所有者接收审批和预算告警。

J-4 连接 MCP 工具：组织一次连接 MCP server；每个 agent 只授予所需 scope。

J-5 配置审批：Merge、deploy、rollback 以及 connector 标记为敏感的动作，会等 agent 所有者或 admin 在聊天中以卡片批准；批准动作只按批准内容执行一次。

J-6 配置 routines：让 agent 按计划或事件触发，交付到频道、DM 或 Drive。

J-7 按需接执行环境：agent computer 跑在 runner 所在机器；browser 为 Beta；Postgres connector 为 Beta，只读 SQL；mailboxes 为 Beta，默认发送需审批。

J-8 用 skills、wiki、tasks、memory 固化协作；人工审核 memory 和 instructions 变更。

J-9 最小试跑：Linux 测试服务器 + 一个模型 key + 一个私有频道 + 一个有角色、instructions、月预算、所有者的 agent + 一个只读 MCP scope 或不接 + 一个计划或事件 routine + 审批开启，跑两周并与人工基线对照。README 没有可直接复制的提示词模板，先用角色和 instructions 字段自写。

### 第 12 步（做法 K）：本地起 AgentRun，用模板和 learning 验证重复工作

K-1 前提：Node 24.22.3 或更新，macOS 或 Linux；想用 Docker sandbox 需本机 Docker 在运行。

K-2 本地起服务：

```sh
npx @parcha/agentrun
```

它在 7340（被占用则顺延）起 server 和一个 runner，数据存 ~/.agentrun，并自动打开浏览器控制台。

K-3 设密码 + 加模型 key：在控制台设密码，然后 Settings → Model keys 加 key。OPENROUTER_API_KEY 给所有 harness 供模型；Anthropic key 跑 pi 和 Claude Code；OpenAI key 跑 pi、Codex、OpenCode。

K-4 用模板跑第一个 agent，验证链路，不需要自备工具：打开 Templates → Apply → KYB due diligence，输入一个公司名和网址即可跑。跑完看 run 的 Report tab（带结论、每条陈述有引用），再看该 agent 的 Learning tab 看它留下了什么。注意 Apply 模板不会自动授予任何 MCP 工具权限，需自己逐个勾选。想让编码 agent 代劳，原文给的指令是：

```text
Read agentrun.ai/SKILL.md and set up AgentRun for me
```

K-5 打开学习：在 agent 定义里加 "learning": true。每轮结束后的保留流程：最后一步提议案（notes / skill / workflow）；先过代码校验（大小、数量、命名、形状等规则；出现密钥、隐藏字符、目录外文件、删除操作或整份索引则整份丢弃）；再由一个 grader 判一次，通过的提交到 main；高风险规则等你点 OK；从网页或粘贴邮件里读到的“规则”、含账号的 note 会被丢弃；某个 skill 已服务 3 轮后，下一轮会要求把它写成 workflow 草案，草案先 dry-run（不调模型、不跑工具）才保留。退役某条保留项：

```sh
npx @parcha/agentrun learning retire
```

配合该 note 的 ETag。

K-6 把重复工作写成 workflow：workflow 是 typed steps 的 JSON 文档，可调工具、跑模型、做快速 typed 判断（是/否、选一、打分，各带置信度）、按答案分支、并行 map、有限次循环、调用其他 workflow，或把疑难案例交给 agent。示例：

```json
{
  "v": 2, "name": "read-site",
  "schemas": {
    "In":   { "type": "object", "required": ["website"], "properties": { "website": { "type": "string" } } },
    "Page": { "type": "object", "required": ["ok"], "properties": { "ok": { "type": "boolean" } } }
  },
  "input":  { "schemaId": "In" },
  "output": { "schemaId": "Page", "path": "home" },
  "root": { "node": "chain", "steps": [
    { "node": "call", "label": "Read the home page", "via": "tool", "tool": "web_fetch",
      "args": { "url": "{website}" }, "out": "Page", "as": "home", "deadline_s": 60 }
  ] }
}
```

保存为 agent 的 workflow 字段前先校验：

```sh
npx @parcha/agentrun workflows validate
```

workflow 作为 agent 的一个 revision 运行，沿用该 agent 的工具权限和花费上限。

K-7 用 CLI 跑一轮“会停下来问你”的 run：

```sh
# 1. Make an agent that can write files and ask you things.
cat > agent.json <<'EOF'
{"definition": {"id": "notes", "version": 1, "name": "Notes",
  "instructions": "Do what you are asked, and write what you make to a file.",
  "skills": [], "tools": ["write", "ask_person"]}}
EOF
npx @parcha/agentrun agents create --body @agent.json

# 2. Start a capped run and wait. It stops to ask you which region (exit code 8: it waits on you).
npx @parcha/agentrun runs start notes --max-cost-usd 1 --wait \
  --body '{"input": {"content": "Ask me which region to cover, then write region.md about it."}}' > out.json

# 3. Answer, wait for it to finish, and read what it wrote.
run=$(node -p 'require("./out.json").run_id')
npx @parcha/agentrun runs message "$run" --content "Europe"
npx @parcha/agentrun runs wait "$run" > out.json
npx @parcha/agentrun runs read-file "$run" region.md
```

退出码：0 完成、1 失败、8 在等你（提问 / 触顶 / 审批）。runs timeline RUN_ID --follow 流式看每一步。

K-8 从代码调用（TypeScript / Python）：

```sh
export AGENTRUN_BASE_URL=http://127.0.0.1:7340/v2
export AGENTRUN_API_KEY=$(cat ~/.agentrun/.token)
```

TypeScript 用 @parcha/agentrun-client 的 AgentRun 客户端；Python 用 pip install parcha-agentrun，方法同名。

K-9 给 agent 配“计算机”：

```yaml
computer:
  kind: sandbox        # none, sandbox, desktop, phone or browser
  provider: daytona    # one you connected in Settings → Computers (none takes no provider)
```

provider 的 key 先在 Settings → Computers 加一次；Daytona / Modal / E2B 只有在开启 Archil disk 后才可用，且此时 Docker sandbox 被拒绝。

K-10 定时 / 事件驱动：Triggers 可自启动有上限的 run：schedule、带签名的 webhook、GitHub pull request 事件。code-review 模板会自己配好 GitHub 触发器。

K-11 跑模板的评测用例：

```sh
npx @parcha/agentrun template eval DIR
```

在一次性临时 server 上把模板的 eval 用例当真实 run 跑并打分。

K-12 部署（可选）：Render 一键是单个 1 CPU / 2 GB 实例 + 10 GB 盘，约 $25/月 + 磁盘 $2.50（原文写作时价格），用你自己的 OpenRouter key（建议设额度上限和有效期）。Docker Compose（Linux）：

```sh
git clone https://github.com/Parcha-ai/agentrun && cd agentrun/deploy
printf 'AGENTRUN_SEAL_KEY=%s\n' "$(openssl rand -base64 32)" > .env && chmod 600 .env
echo 'OPENROUTER_API_KEY=...' >> .env
docker compose up -d --build
docker compose logs server
```

注意该 compose 文件没有 Docker socket，因此 agent 只有文件工具和 web_fetch、没有 shell；需要 shell 得用仓库根目录的单 server compose.yaml（Docker Engine 26+）或 Daytona/E2B + Archil disk。端口只绑本机 loopback，对外要加 TLS 代理。多 runner：server 用 --no-runner 起，每个 runner 从同一镜像以 runner --data /data --name <name> 起，全部进程共享同一个 AGENTRUN_SEAL_KEY。

K-13 安全前提：所有密钥封存在 AGENTRUN_SEAL_KEY 下，丢了就解不开；密钥只写，控制台只显示已设/缺失；API token 不能写密钥、不能批准工具调用；run 只拿到自己模型和工具需要的 key。

K-14 最小试跑：本地起服务，设密码和 key，用 code-review 或 kyb 模板设费用上限，跑一批自有数据；对比 learning 打开前后同一批任务的 token 成本与通过率，并记录它相对现用工具的缺陷发现率。不要一上来接第二个来源或第二个目的地。

### 第 13 步：无论 A 到 K，都收敛到同一个最小闭环

1. 实例只开本地或私有访问。Docker 优先；先不要把控制台暴露到外网。做法 J 默认 Tailscale 私有 HTTPS；做法 K 端口只绑 loopback，对外加 TLS 代理。
2. 只配一个 Chat 模型或一个 Agent runtime。做法 J 只加一个组织模型 key；做法 K 只加一个模型 key。
3. 只装或建一个技能或工具，范围严格限定在一件你每周都要重复做的小事。做法 J 先只接一个只读 MCP 或不接；做法 K 先用一个模板或一个 workflow。
4. 建一个定时任务或事件触发。nanobot 用 Automations / Tasks；CowAgent 用内置 scheduler；Eigent 用 Automation；NanoClaw 用触发词建 recurring job；Comma 用 Routines / Loops；做法 F 用 cron 加 timezone；做法 G 用 cron 或 launchd 调 claude -p；做法 H 用 routines；做法 I 用 rules.json 的 when.cron 或 when.source；做法 J 用一个计划或事件 routine；做法 K 用 Triggers 的 schedule、webhook 或 GitHub PR 事件。
5. 让它连续处理同一类任务 5–10 次，每次检查任务是否完成，以及后续对话里是否自动检索到之前的记忆或知识。做法 J 还要看 memory 提议的 instructions 修改是否被接受；做法 K 看 Learning tab 里的保留项是否被接受、是否按 3 轮规则转成 workflow 草案。
6. 从第一次运行就开始记录指标，否则两周后只有印象，没有依据。
7. 给有副作用的动作定一条幂等规则：先说清楚怎么算发出去了，再让它动手。做法 J 的审批卡片只按批准内容执行一次；做法 K 的 run 先设 --max-cost-usd，退出码 8 表示在等你。

做法 F 的调研还给了几条不依赖具体平台的规则：用游标，不用固定时间窗口；源读不到时显式上报，不要当成安静的今天；有副作用之前先查、确认成功才记账、结果不明确就标可能已发；只推读者今天会因此行动的条目；发布前复核；链接从源自己的 link 字段复制；调度的时区只决定什么时候触发，日期计算用的时区还要在提示词正文里再写一遍。

做法 G 的调研补了一条选型层规则：把取数和分析分开，数据源只负责给原始事实，分析全部由 Claude Code 做；数字缺失就留空，工具从不编造数字。这条可以直接搬到做法 F 的 brief、做法 J 的 routine 和做法 K 的 workflow 判断节点上。

如果选 Eigent，按这个顺序收敛：C-1 跑通桌面端 → 换 Ollama 本地模型验证数据不出本机 → 试 Workforce 多 agent 并行并与单 agent 对比 → 最后才试 Automation。

如果选 NanoClaw，按这个顺序收敛：D-1 装好并只配对一个频道 → D-2 用每周一 8am 新闻简报建一个定时任务，连续跑几个周期 → 核对容器挂载清单 → 需要换模型或渠道时再装 skill → 最后才试 /manage-channels。

如果选 Comma，按这个顺序收敛：E-1 的 make dev 加 mock 模型零成本跑通登录和界面 → E-2 起自建实例、只配一个真实模型 → E-6 只建一个 Routine 或一个 Loops，连续跑一两周 → 需要它动手时再打开 Allow operations，先只给读权限 → 最后才考虑 E-5 对外暴露和注册 Worker。

如果选做法 F，按这个顺序收敛：确认 beta 平台和 workspace 能用 → 用 managed-agents-onboard 生成起点文件，只留一个来源和一个 Slack 目的地 → 只放这个 brief 需要的凭据进 vault → 把游标、读取失败上报、发帖幂等规则写进 agent.md → 手动触发第一次运行，确认消息真的到了 Slack → 再打开 cron。

如果选做法 G，按这个顺序收敛：G-1 克隆进 Claude Code → G-3 跑 npm run selftest 并打开合成样本 → G-2 跑 /research-setup → 用免费 yt-dlp 对一条公开 reel 跑 /reel-research，确认八个板块都出、缺失数字留空 → 想要每日雷达再切 Apify → 最后才挂 cron 或 launchd。

如果选做法 H，按这个顺序收敛：确认 macOS 14+ Apple Silicon 与 CLI 登录 → 装 Release 并处理 Gatekeeper，或从源码构建 → 跑 H-3 验证链 → 只配一个 runtime，只建一个 routine 跑低风险重复任务，审批模式先用 on-request → 最后才考虑 computer use 和 bot machine。

如果选做法 I，按这个顺序收敛：先跑 agent-autoloop try 完成一次提问、退出、answer 拍板、status 显示续跑完成 → 只配一个 CLI Agent → 只写一条本机 cron 规则，cwd 指到 ~/autoloop-sandbox/notes → 跑通后再接一个事件源 → 再接一个通知通道。

如果选做法 J，按这个顺序收敛：Linux 测试服务器运行安装命令，确认私有 HTTPS 可访问 → 只加一个组织模型 key → 建一个私有频道和一个 agent → 只接一个只读 MCP scope 或不接 → 配一个计划或事件 routine → 打开审批，手动确认一次 routine 能交付 → 再加 skill、wiki 或 memory → 最后才考虑 browser、Postgres connector、mailboxes、Codex 接入、公共域名和迁移。

如果选做法 K，按这个顺序收敛：K-2 本地 npx 起服务 → K-3 设密码和 key → K-4 用 kyb 或 code-review 模板跑通一次，设费用上限 → K-5 打开 learning，对比同一批任务 learning 前后的 token 成本与通过率 → K-6 只写一个 workflow 并 validate → K-7 用 CLI 跑一次会停下来问你的 run，确认退出码 8 和续跑 → 最后才考虑 K-9 配计算机、K-10 加触发器、K-12 部署。

预期结果：两周内你拿到一组自己的数字，而不是一份 README 的承诺。

## 怎么判断变好了

各份调研都没有给出官方指标，下面这套是调研作者建议加你需要自建基线的组合。

- 定时任务按时完成率，以及需要你人工介入的次数，按次记录。
- 单次任务的实际耗时与返工次数，对比你自己做或用普通对话式 AI 做的基线。Eigent 拆成人工耗时差和首次通过率；做法 G 测手工拆解一条 reel 需要多久；做法 H 测手动跑 CLI 的耗时和交给 bot 后的耗时；做法 I 测引入前人工时间、遗漏次数、误报次数和人工介入次数，以及引入后的轮数、Token、费用、从事件到产出的时间、人工拍板次数；做法 J 测 routine 产出被直接接受的比例、返工次数、每个产出需要的审批次数；做法 K 测同一批任务 learning 打开前后的 token 成本与通过率，以及相对现用工具的缺陷发现率。
- 产出字段完整率：做法 G 的八个板块里哪些因数据源缺失而为空；缺失的数字有没有被留空。
- 筛选规则可复现性：做法 G 的 /outliers 报告是否稳定生成，24h 窗口、48h 上限、minViews 2000、去重合并、排名是否每次一致。
- 成本：算清每完成一件任务花多少钱。CowAgent README 警告 Agent 模式消耗显著多于普通对话；NanoClaw 的定时任务可配 script gates；Comma 的 Loops 只在有事时唤醒 agent；做法 F 的 deployment.md 有 budget 字段；做法 G 一次完整每日搜索约 1.70 美元；做法 I 用 status 看轮数、Token 和费用；做法 J 按 agent 月预算和调用记录；做法 K 用 --max-cost-usd 给单次 run 设上限，并记录 learning 前后成本。
- 技能复用次数：同一个技能被稳定调用多少次；如果一周内没有被重复调用，说明它没有固化成产能。
- 记忆有效性：随机抽查后续会话，看它是否引用了正确的历史结论。做法 H 的 persistent bots 要抽查；做法 J 看 memory 提议的 instructions 修改是否被接受；做法 K 看 Learning tab 的保留项是否被下一轮使用。
- 重发与漏读上报：同一个 brief 有没有被重复发出去；某个源读不到时，产出里有没有点名没读到的东西。做法 F 的幂等性和漏读上报需要自己实测。
- 审批卡片是否只在真正需要时出现：做法 I 如果卡片频繁出现但都不是需要拍板的事，说明规则或 Agent 回执写得不好；做法 J 看 merge、deploy、rollback 和敏感 connector 动作是否都走审批；做法 K 看退出码 8 是否只在提问、触顶或审批时出现。
- 未经授权的写操作、关键告警漏报、重复误报：做法 I、J、K 这三项任一出现，就停止扩大范围。
- why 是否能解释每轮来龙去脉：做法 I 的 agent-autoloop why <轮次> 应能说明这一轮为什么跑、结果是什么；做法 K 用 runs timeline --follow 看每一步。
- 数据边界：Eigent 本地部署模式下能否确认文件、凭据、上下文没有被送出本机；NanoClaw 看容器挂载清单和出站策略；Comma 看云端干活、设备管身份的说法是否成立；做法 F 看 environment.yaml 的 allowlist 加 vault 的 networking.allowed_hosts；做法 G 看 .env 凭证有没有被提交；做法 H 看数据是否留在本机 SQLite、凭据是否只进 Keychain；做法 I 看外部文字是否只当资料放进文件；做法 J 看 MCP scope 是否越界；做法 K 看密钥是否封存在 AGENTRUN_SEAL_KEY 下、API token 是否不能写密钥或批准工具调用、run 是否只拿到自己模型和工具需要的 key。
- 失败可诊断性：任务失败时能否从日志或步骤回放定位原因。NanoClaw 把排障交给 Claude Code 或 /debug；Comma 看板四态；做法 F 看 session log 加 runs/<date>.md；做法 G 看 selftest 退出码；做法 H 看 H-3 验证链和真实 CLI 冒烟；做法 I 看 status、why、check；做法 J 看审批卡片、任务当前步骤；做法 K 看 run 的 Report tab、Learning tab、runs timeline 和退出码。

注意区分可观测和有效果：WebUI 能展开推理过程、工具调用、文件改动、差分、命令输出和产出物；CowAgent 有上下文用量可视化、/compact、缓存命中率；NanoClaw 有 per-checkout id、可逐组确认的卸载清单、可关闭的匿名诊断、容器与凭据网关；做法 F 有 session log、run record 和 ledger；做法 G 有 selftest 退出码和每条互动率；做法 H 有构建、验证、导入与 sidecar/MCP 命令；做法 I 有 status、why、check 和审批卡片；做法 J 有月预算、调用记录、审批卡片、任务当前步骤；做法 K 有 Report、Learning、runs timeline、退出码和 template eval。但这些只说明软件正常工作，不说明工作产出改善。Eigent 的 15,457 stars、NanoClaw 的 30866 stars、做法 G 的 31 stars、做法 H 的 35 stars、做法 J 的 205 stars、Comma 的 172 stars 只反映热度，不是效果证据；做法 I 的性能数据是项目自测；做法 K 的收益数字是作者自报、样本小。

Comma 独有的运行时可靠性：原文列出六条被检查的性质——已接受的工作在失败和重启后不会静默丢失；失败的回复不算已完成工作；有副作用的操作在开始前先记录；被中断的变更操作不会被意外执行两次；过期 worker 不能覆盖更新的 agent 状态；数据只在策略允许的边界间流动。这些由 Lean 机器检查和 TLA+ 模型检查覆盖，可以作为它不会悄悄把事情丢掉的观察项。但原文明确声明：形式化验证不证明模型判断或任务成功，只验证即使出错运行时仍按设计规则行事。不要把运行时可靠误读成结果可靠。做法 K 的持久化执行可观察项是：杀掉服务再起，run 继续；多 runner 时死掉 runner 的 run 在其 30 秒租约到期后被别的 runner 接管。这同样不等于任务结果可靠。

最小试用方式：单机跑通一个实例，只开本地或私有访问，只配一个模型，装 1 个技能，建 1 个定时任务或事件触发，连续跑 5–10 次同类任务。Comma 的零成本入口是 E-1 的 make dev 加 mock 模型；做法 F 的最小场景是单一来源加单一收件人加每日一次；做法 G 的最小场景是不花一分钱，selftest 加合成样本加一条 yt-dlp 公开 reel；做法 H 的最小场景是只配一个 runtime，跑通 H-3 验证链，只建一个 routine，审批模式先用 on-request；做法 I 的最小场景是 try 完成一次人工拍板闭环，一条沙盒 cron 规则；做法 J 的最小场景是 Linux 测试服务器加一个模型 key 加一个私有频道加一个有角色、instructions、月预算、所有者的 agent 加一个只读 MCP 或不接加一个 routine 加审批开启；做法 K 的最小场景是本地 npx 起服务，设密码和 key，用 kyb 或 code-review 模板设费用上限，跑一批自有数据，对比 learning 前后同一批任务的 token 成本与通过率。

试多久：nanobot 调研建议跑两周；CowAgent 建议 1–2 周；Eigent 沿用两周；NanoClaw 建议 1 天内搭完、2 周判断；Comma 建议跑一两周；做法 F、G、H 调研没给观察期，沿用两周；做法 I 建议低风险流程试 1–2 周；做法 J 建议跑两周并与人工基线对照；做法 K 调研建议先本地试跑一批自有数据，未给观察期，沿用两周。统一按两周执行。

降级或放弃条件：一周内跑不出任何可复用的稳定产出；或 token 或模型成本明显高于人工或普通对话方案；或必须开放外网与高权限才能用；或反复出现重发或漏发却查不出原因。Eigent 上只有在周期任务做到人工时间明显下降且返工比例可接受，才考虑纳入日常工作流；NanoClaw 上如果为了让它跑起来必须持续改代码而你又不想维护这个 fork，直接停；Comma 上如果不打算长期维护 Elixir / Lean / TLA+ 这套重栈，别留在日常工作流；做法 F 如果 beta、幂等性、漏读上报或成本上限中任何一项在两周期内没测清楚，不要接真实信息源和真实收件人；做法 G 如果 My version 从没被用于创作、或选题到出稿周期没有缩短、或数据源花费换不回产出，直接停；做法 H 如果 Windows 或 Linux 是主环境、企业策略禁止绕过 Gatekeeper、或你不愿意查 docs 和界面说明，降为 watch；做法 I 如果出现未经授权的写操作、关键告警漏报、重复误报或人工时间没有下降，停止扩大范围；做法 J 如果产出质量低于基线、人工监督成本不可接受、时间或成本没有改善，退回 study 或 drop；做法 K 如果 learning 前后同一批任务的 token 成本与通过率没有改善、缺陷发现率不高于现用工具、或 AGENTRUN_SEAL_KEY 丢失导致密钥不可恢复，停止扩大范围。回滚：NanoClaw 用 bash nanoclaw.sh --uninstall；Comma 用 docker compose down，不要加 -v；做法 F 停排期；做法 G 停 cron 或 launchd 并删 clone 目录；做法 H 退出 touri、关闭 sidecar、按需删 app 和 Application Support；做法 I 停进程或服务并按安装方式回滚；做法 J 按 SELF_HOSTING.md 的备份和停服步骤处理；做法 K 停 server 和 runner，按部署方式回滚，AGENTRUN_SEAL_KEY 丢失后无法解密旧密钥。

## 常见坑

- 把装好了、能回复当成工作变好了。各份调研都指出原文只有安装与能力清单，没有效果数据、对比案例或基准分数。
- 把合成样本当成实测产出。做法 G 的 README 截图明确标注 synthetic sample data。
- 以为做法 G 的效果有数据支撑。仓库只有 31 stars，大量引导加入作者付费社区。
- 为了省事跳过付费数据源、又期待有每日雷达。免费 yt-dlp 只支持单条公开链接，IG 通常拿不到播放量且可能被拦截。
- 让缺失的数字被编出来。工具设计是数字缺失就留空；用覆盖不全的数据源时要逐条核对空字段。
- 把 Comma 的运行时形式化验证当成任务效果证据。Lean 加 TLA+ 只覆盖运行时性质，不证明模型判断或任务成功。
- 把源读不到当成安静的今天。MCP server 挂了或 token 过期时，运行照样启动，agent 那侧什么都看不到，会报 nothing new；规则是不动该源游标、其余源照常写、末尾点名没读到的东西。
- 用读最近 24 小时这种固定窗口读来源。跑晚了会漏、跑早了会重；改用每个来源一个 bookmark。
- 发出去之前不查重、发出去不确定成功就记账。先查当天标题是否已在目标频道近期消息里；只有平台明确返回成功和消息 ID 才算发出；不明确就标 maybe posted。
- 在 deployment.md 里设了 timezone 就以为日期没问题。timezone 只决定什么时候触发，正文还要显式告诉 agent 用哪个时区算日期。
- 手拼链接。原文要求链接从源自己的 link 字段复制。
- 给后台 agent 配了需要人工批准的工具。做法 F 里 GitHub 工具集必须设成不请求批准，同时 token 只读、web 工具关掉。
- 给 agent 的凭据权限过大。vault 里只放这个 brief 需要的凭据，并给每条凭据设 allowed_hosts；沙箱里只有占位符。
- 把 beta 的托管平台直接接到真实信息源和真实收件人上。做法 F 仍属 beta，幂等性、漏读上报和成本上限都需自己实测。
- 自建 Comma 时忘了默认栈不含 mock 模型。E-2 的 compose 栈不配模型就没有真实模型调用；零成本先跑通要用 E-1 的 make dev。
- 公开暴露 Comma 时把 Web、Admin、Product API 放到不同顶级域名。三者必须属于同一可注册域名；要换真实 SMTP，本地收件箱只能用于 loopback。
- 升级 Comma 前没停栈，或者删了 config volume、重新生成它的密钥。五个 named volume 要一起备份；docker compose down 不要随手加 -v。
- 一上来就打开 Allow operations。它是改文件、跑命令、转交 Codex 或 Claude Code 的总开关；先用只读和 Needs Review 跑通。
- 把 Comma 当又一个编码 agent。它是常驻调度层，把 Codex 或 Claude Code 当应用调用。
- 把 Eigent 的 Zero Setup 当真。这与后文要求 Node.js 18–22 加 npm 加 uv sync 的实际步骤矛盾，应按后者准备环境。
- 把 Eigent 的 Quick Start 当成本地部署。该模式会连 Eigent 云端、需要注册账号；要验证数据不出本机，必须走 server/README_EN.md 的本地部署。
- 把 Eigent 的 Roadmap 当现有能力。Context Engineering、多 agent 固定工作流、多轮对话、Document Toolkit 动态编辑都是未完成项。
- 拿 Eigent 的用例标题当验证依据。用例库只有标题、一句描述和链接，没有耗时、成功率、人工介入比例。
- 把 NanoClaw 当成零成本上手。它需要 macOS、Linux 或 WSL2、Docker、Node 22+、pnpm 10+、Claude Code 和 Anthropic 凭据；定制哲学是 Customization = code changes。
- 在 Claude 会话里跑 migrate-v2.sh。它要直接在真实 shell 里跑；迁移不会自动切换系统服务。
- 以为 NanoClaw 有配置文件可改行为。它不用配置文件，直接对 Claude Code 说要什么，或跑 /customize。
- 忘了关匿名安装诊断。NanoClaw 的匿名诊断默认开启，用 NANOCLAW_NO_DIAGNOSTICS=1 关闭。
- 卸载时以为会删干净一切。NanoClaw 的卸载器是 per-checkout 的，最后要手动删掉 checkout 目录；先跑 --dry-run。
- 把 touri 的未签名 Release 当正常安装。首次启动会被 Gatekeeper 拦截；按 Open Anyway 三步走，或用 xattr 去掉隔离标记。
- 以为 touri 能在 Windows 或 Linux 上用。它仅 macOS、仅 Apple Silicon。
- 以为 touri 的 bot-machine 开箱可用。它需要 macOS 26 与 Apple container 1.5.0 以上。
- 以为 touri README 讲了怎么新建 bot、配 routine。原文没有说明 UI 新建 bot、routine 调度配置、overlap 与 catch-up 参数。
- 把 touri 当 Claude Code 的替代品。它是编排或外壳层，把 Claude Code CLI 作为 runtime 接入。
- 把 agent-autoloop 当成新 agent。它是已有 CLI agent 外面的调度、审批、审计层。
- 一上来就接生产写操作、删数据、对外发消息或自动合并 PR。先选一个低风险、只读或只写沙盒的流程试 1–2 周。
- 忘了 to 必须是 agents 里已登记的名字、cwd 要换实际目录。改完不跑 agent-autoloop check，规则写错时系统会继续按旧规则跑。
- 文字通道没配 hub.publicUrl。飞书、钉钉、企微、Slack、Discord 等文字通道要把 hub.publicUrl 配成手机或电脑能打开的地址。
- 以为 agent-autoloop 的模板都在真实账号跑过。四种 Webhook 模板只在本地模拟服务上验证过；反馈处理、网站巡检和飞书摘要只使用虚构样例和假飞书 CLI。
- 以为 agent-autoloop 的性能数据是独立评测。冷启动、内存、长轮询、持久化写入、派活 p99、启动和重建时间都是项目自测。
- 以为 agent-autoloop 能保证整机断电恢复。它做了 20 万步模拟断网、丢包、崩溃和重复提交，以及强杀进程 1000 次，但整机断电没有单独测过。
- 设计无限事件链自触发。它用跳数熔断限制 Agent 自触发层数，超过 8 层只记录并通知。
- 高频自动化用个人订阅额度。原文建议高频场景使用 API Key，而不是个人订阅额度。
- 把 deliver 流水线直接用在关键仓库。先在非关键仓库试；审查和交付配置只从 main 读取。
- 把 agentes.chat 只当成 Slack 替代品。它的价值在频道协作之上叠加 agent 角色、instructions、月预算、所有者、MCP scope、审批、routines、skills、wiki、任务板和 memory。
- 给 agentes.chat 的 agent 过宽的 MCP scope。每个 agent 只授予所需 scope。
- 没设 owner 或 admin 就开审批。Merge、deploy、rollback 和敏感 connector 动作会等 agent 所有者或 admin 批准；没有审批人，动作会卡住。
- 没设月预算就放 agent 跑。每个 agent 设月预算，README 称每次调用前检查预算。
- 在 agentes.chat 上先开 Beta 功能再跑基础 routine。先跑通一个低风险 routine，再逐项开。
- 期待 agentes.chat 的 browser 无人值守登录或过 captcha。browser 为 Beta，需要人工接管。
- 期待 agentes.chat 的 Postgres connector 写库。它为 Beta，只读 SQL。
- 期待 agentes.chat 的 mailboxes 默认不审批。它为 Beta，默认发送需审批。
- 以为 agentes.chat 的 router 会授予权限。router 从不授予权限。
- 以为 agentes.chat README 给了提示词模板。README 没有给可直接复制的提示词模板。
- 迁移 agentes.chat 时以为密钥会跟着走。keys 从不导入。
- 忽略 agentes.chat 的 AGPL 和商标条款。AGPL-3.0-only，修改后对外提供服务需保留 /source.tar.gz 下载。
- 把 agentes.chat 的 205 stars 当效果证据。README 首图是示意图，不是可核验案例。
- 文档有缺口就卡住。CowAgent 的 MCP 集成没有 mcp.json 示例；Eigent 的本地部署、MCP 与 Skill 配置不在 README 正文；做法 F 的部署步骤被截断；做法 G 的 cron 与 launchd 示例在 docs/iphone-shortcut.md；做法 H 的 UI 新建 bot、routine 调度参数未展开；做法 J 的 SELF_HOSTING.md 细节未展开。
- 把作者自述当事实。CowAgent 的 stars 和 self-evolution、Eigent 的 boosts productivity、NanoClaw 对 OpenClaw 的对比数字、Comma 的 sessionless 和 swarm intelligence、做法 F 的条目取舍标准、做法 G 的拆解质量、做法 H 的 persistent bots、做法 I 的性能数据、做法 J 的 safe by default、做法 K 的学习层收益和模板效果，均无案例、基准或第三方评测支撑。
- 定时任务不生效。nanobot 先确认网关常驻；NanoClaw 先确认宿主和容器在跑并用 list 确认任务登记；Comma 先确认实例在跑、Loops 盯的信息源真的有新事件；做法 F 先确认不是把源读不到当成今天没新闻；做法 G 先手动跑 claude -p，再查 cron 或 launchd；做法 H 先确认应用与 sidecar 在运行、bot 已创建、routine 已启用；做法 I 先跑 check 看规则、status 看轮次、why 看原因；做法 J 先确认服务、runner、routines 都在跑；做法 K 先跑 runs timeline --follow 看每一步，再查 Triggers 和退出码。
- 试用期就开放外网或高权限。CowAgent 只能在可信环境部署；NanoClaw 先核对挂载清单；Comma 默认只绑 loopback；做法 F 的 allowlist 只放必需主机；做法 G 凭证只放 .env；做法 H 审批先用 on-request；做法 I 先用沙盒目录；做法 J 默认 Tailscale 私有 HTTPS；做法 K 端口只绑 loopback，对外加 TLS 代理。
- 以为 AgentRun 的 Apply 模板会自动授予 MCP 工具权限。原文强调需自己逐个勾选。
- 把 learning 保留项当成一定可信。代码校验会丢弃含密钥、隐藏字符、目录外文件、删除操作或整份索引的提案；从网页或粘贴邮件里读到的“规则”、含账号的 note 会被丢弃；高风险规则还要你点 OK。
- 保存 workflow 前不校验。先跑 npx @parcha/agentrun workflows validate。
- 用 deploy 目录的 compose 却期待 shell。该 compose 文件没有 Docker socket，agent 只有文件工具和 web_fetch、没有 shell；需要 shell 得用仓库根目录的单 server compose.yaml（Docker Engine 26+）或 Daytona/E2B + Archil disk。
- 把 AGENTRUN_SEAL_KEY 当可丢的配置。所有密钥封存在它下面，丢了就解不开。
- 以为 API token 什么都能做。API token 不能写密钥、不能批准工具调用。
- 以为 AgentRun 的收益数字可直接抄。所有收益数字均为作者自报、样本小（30 个 PR），且无独立复现。
- Docker sandbox 和 Daytona/Modal/E2B + Archil disk 的选择没想清楚。Daytona / Modal / E2B 只有在开启 Archil disk 后才可用，且此时 Docker sandbox 被拒绝。

## 证据与来源

- 做法 A：来自 HKUDS/nanobot 调研，安装脚本、uv tool install、nanobot webui、gateway --background 及管理命令、session/workspace、-m 均为 README 原文命令。项目自述 MIT、v0.3.5，平台覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64；能力清单和 Dream 长期记忆、多智能体委派效果均为作者主张，没有效果数据。
- 做法 B：来自 zhayujie/CowAgent 调研，run.sh、run.ps1、docker compose、cow CLI、/skill、cow install-browser、控制台 9899、config.json 的 web_host 和 web_password 均为 README 原文。可核事实：MIT、仓库自报 47192 stars、版本到 v2.2.0；原文明确警告 Agent 模式 token 消耗显著多于普通对话、Agent 可访问本机操作系统只能在可信环境部署。proactively plans、self-evolution、记忆分层等是作者主张。
- 做法 C：来自 eigent-ai/eigent 调研，git clone 加 npm install 加 npm run dev、前端 npm install 与后端 uv sync 均为 README 原文。可核事实：Apache 2.0、约 15,457 stars、FastAPI 加 uv 加 Uvicorn 加 CAMEL 后端、React 加 Electron 加 TypeScript 加 Tailwind/Radix 前端。单 agent 与 Workforce 的划分没有选择规则；本地部署命令在未提供的 server/README_EN.md；Automation 只有一句描述；用例库只有标题、一句描述和链接。
- 做法 D：来自 nanocoai/nanoclaw 调研，git clone 加 bash nanoclaw.sh、migrate-v2.sh、@Andy 示例、list/pause/join、/customize、/add-telegram、/add-codex、/add-opencode、/add-ollama-provider、.env 的 ANTHROPIC_BASE_URL 和 ANTHROPIC_AUTH_TOKEN、/manage-channels、ncl groups create --template、NANOCLAW_NO_DIAGNOSTICS=1、--uninstall 均为 README 原文。可核事实：仓库 30866 stars，不构成效果证据；Node 宿主加每个 agent group 独立 Docker 容器、凭据网关注入、per agent group 的 CLAUDE.md 和记忆均来自 README 自述。
- 做法 E：来自 AFK-surf/Comma 调研，cp .env.example .env、docker compose up -d --build、pnpm install 加 make dev、make dev-electron、三组测试、8080/8082/8081/4000/8025、.env 变量表、五个 named volume、systems/DEPLOYMENT.md、mock 模型登录方式均为 README 原文。可核事实：AGPL-3.0-only，修改后对外提供服务需保留 /source.tar.gz 下载；贡献需签 AFK AI, Inc. CLA；仓库 172 stars。运行时主要为 Elixir/OTP，关键系统组件用 Lean，核心分布式协议用 TLA+ 模型检查；原文明确声明形式化验证不证明模型判断或任务成功。
- 做法 F：来自 claude.dev 的 reference implementation 走查 Building effective agent automations，作者 Lance Martin、CJ Avilla，2026-10-08。claude update、/claude-api managed-agents-onboard、ant apply vault.yaml、TypeScript SDK 加凭据、daily-brief 八个文件、agent.md frontmatter、第 4 和第 5 条运行步骤、deployment.md 的 cron/timezone/vault_ids/resources、bookmark 与 ledger、源失败三条规则、幂等三规则均为原文。参考实现有八条运行步骤，本次只摘录第 4 和第 5 条；原文在部署一节被截断；Managed Agents 处于 beta；条目取舍标准和信任判断是作者主张，没有效果数据。
- 做法 G：来自 manthanpatelll/instagram-research-tool 调研，git clone 加 claude、/research-setup、npm run library/sample-report/selftest、/outliers、/reel-research inbox、/reel-research <reel link>、claude -p、config.json 八个字段、niche.json/voice.md/inbox.txt/.env、四个数据源能力与成本均为 README 原文。可核事实：MIT、npm 零依赖、Node 18+、仓库 31 stars；产出八个板块；每日搜索约 70 次；outlier 窗口默认 24h、上限 48h、合格 reel 少于 15 条才放宽；最低播放量 2000；Sandcastles 起 49 美元每月、Apify 每条不到 1 美分、一次完整每日搜索约 1.70 美元、每月 5 美元免费额度、yt-dlp 免费。局限：所有功能描述、设置约 10 分钟、拆解质量均为作者主张；截图明确标注合成样本。
- 做法 H：来自 touri-ai/touri 调研，Release 下载、Gatekeeper 三步、xattr、bun install/build:sidecar/tauri build、验证链、真实 CLI 冒烟、导入器 dry-run、sidecar serve、mcp-stdio、审批模式、逐线程 token、computer use、bot machine、packages/contracts 均为 README 原文。可核事实：Apache-2.0、仓库 35 stars、Tauri v2 加 Bun sidecar 加 React UI；数据存 ~/Library/Application Support/touri 下 SQLite，无遥测、无需账号，凭据放 Keychain；安装要求 macOS 14+、Apple Silicon、已登录 Codex 或 Claude Code CLI；bot machine 需 macOS 26 加 Apple container 1.5.0 以上。局限：UI 新建 bot、routine 调度、overlap 与 catch-up 参数未说明；所有功能声明无截图、演示、案例或效果数据。
- 做法 I：来自 KKKKhazix/agent-autoloop 调研，mkdir 沙盒、install.sh、try、answer、status、rules.json 示例、check、why、ask/notice/resolve/later/events、skills/agent-autoloop/SKILL.md 的插件与通道小节、hub.publicUrl、deliver 标签均为原文。可核事实与原文自测：内核约 1651 行、零运行时依赖；Apple M5 Pro、24 GB、Node 24.21.0 上冷启动 88.78 ms、空闲内存 59.94 MB RSS、1000 个同时等待的长轮询 170.49 MB RSS、持久化写入 2394 条每秒、派活 p99 1.82 ms、110 万条事实时启动 99.8 ms、格式变化后从日志全量重建 110 万条 43.1 秒；20 万步模拟断网、丢包、崩溃和重复提交，强杀进程 1000 次检查已确认记录不丢；整机断电没有单独测过。局限：四种 Webhook 模板只在本地模拟服务上验证过；反馈处理、网站巡检和飞书摘要只使用虚构样例和假飞书 CLI；没有独立第三方评测。
- 做法 J：来自 agentes-chat/agentes-chat 调研，安装命令 curl -fsSL https://agentes.chat/install | sh、Docker 和 Postgres 唯一依赖、Tailscale 私有 HTTPS 或公共域名加 Caddy、组织模型 key、agent 角色/instructions/模型/月预算/所有者、MCP 一键连接与 Composio 连接器、审批卡片、routines、agent computer、browser Beta、Claude Code 和 Codex 在连接电脑上运行、Postgres connector Beta 只读 SQL、mailboxes Beta 默认发送审批、skills/wiki/tasks/memory、从 Grok Bot/ChatGPT dots/OpenBot.run/OpenMausBot/Hermes Agent/OpenClaw/Paperclip 导入、wiki 支持 Obsidian 导入，均为 README 原文。可核事实：AGPL-3.0-only 与商标/署名条款；仓库指标 205 stars；大量功能标注 Beta；README 首图是示意图，不是可核验案例。作者主张包括 safe by default、agents that actually do the work、一条命令约 10 分钟、每次调用有预算和记录、router never grants a permission 等；没有基准测试、客户案例或独立审计。
- 做法 K：来自 Parcha Labs 的 Show HN 调研 AgentRun – open-source, Self-improving Managed Agents。npx @parcha/agentrun、7340 端口、~/.agentrun、Settings → Model keys 的 key 对应关系、Templates → Apply → KYB due diligence、Read agentrun.ai/SKILL.md and set up AgentRun for me、learning 保留流程、learning retire、workflow JSON 示例、workflows validate、CLI 的 agent.json 与 runs start/message/wait/read-file、退出码 0/1/8、runs timeline --follow、TypeScript/Python 客户端、computer 配置与 provider 前提、Triggers、template eval、Render 与 Docker Compose 部署、AGENTRUN_SEAL_KEY 与 API token 权限边界，均为该调研转述的 README 原文。可核事实：Apache-2.0；默认 SQLite 可换 Postgres；多 runner 时死掉 runner 的 run 在其 30 秒租约到期后被接管；deploy 目录 compose 没有 Docker socket；端口只绑本机 loopback。局限与作者主张：所有收益数字均为作者自报、样本只有 30 个 PR、无独立复现；学习层收益、模板效果、code-review 的缺陷发现率均为作者主张；调研结论明确建议先本地起服务、给模板设费用上限、跑一批自有数据，重点验证 learning 打开前后同一批任务的 token 成本与通过率，以及相对现用工具的缺陷发现率，暂不宜作为默认方案。
- 最小闭环与判断指标：只配一个模型加一个技能加一个定时任务、连续处理同类任务 5–10 次、按时完成率、人工介入次数、耗时与返工、token 成本、技能复用次数、记忆有效性、1–2 周、降级为 watch 的条件，来自 nanobot 与 CowAgent 调研的结论与验证建议；人工耗时对比、首次通过率、调度可靠性、数据边界、失败可诊断性、先 Quick Start 再换本地模型再试 Workforce 最后试 Automation，来自 Eigent 调研；小范围试、只接一个频道、配一到两个可人工核对的定时任务跑两周、排障交给 Claude Code 或 /debug、用卸载器干净回滚，来自 NanoClaw 调研；先用 make dev 跑通再自建单机实例、把真实长周期任务交给 Task 加 Loop 跑一两周、栈很重不宜直接采用，来自 Comma 调研；单一来源加单一收件人加每日一次、手动触发验证、bookmark、源失败三条规则、先查重确认成功才记账、只推读者今天会行动的条目、发布前复核、链接从源字段复制、调度时区与正文时区分别写清，来自做法 F 调研；先跑 selftest 与合成样本、用免费 yt-dlp 验证单条、想要雷达再上 Apify、缺失数字留空、先手动跑 /outliers 再挂 cron，来自做法 G 调研；在符合条件的机器上装 touri、只配一个 runtime、只建一个 routine、审批先用 on-request、先不开 computer use 和 bot machine、用 H-3 验证链判断软件是否正常，来自做法 H 调研；安装后跑 try 完成一次提问到拍板到续跑、选低风险只读或只写沙盒流程试 1–2 周、记录人工基线、用 status 和 why 记录轮数 Token 费用和原因、出现未授权写操作或关键告警漏报就停止扩大范围，来自做法 I 调研；Linux 测试服务器、一个模型 key、一个私有频道、一个有角色 instructions 月预算所有者的 agent、一个只读 MCP 或不接、一个计划或事件 routine、审批开启、跑两周并与人工基线对照，来自做法 J 调研；本地 npx 起服务、模板设费用上限、learning 前后同一批任务的 token 成本与通过率、相对现用工具的缺陷发现率、先本地再部署，来自做法 K 调研。这些都是调研作者给出的自建方法，不是项目官方提供。
- 只是作者主张：nanobot 的小而可读、Dream 长期记忆、多智能体委派实际效果；CowAgent 的 proactively plans、self-evolution、grows alongside you、记忆分层与 Deep Dream、知识库自动整理；Eigent 的 boosts productivity、turn your most complex workflows into automated tasks、Zero Setup；NanoClaw 与 OpenClaw 的对比数字和 Claude 能安全修改小代码库；Comma 的 sessionless、relentless、swarm intelligence、24/7 持续完成目标；做法 F 的条目取舍规则收益；做法 G 的数据源只取事实分析全交给 Claude Code、设置约 10 分钟、拆解板块实际价值；做法 H 的 persistent bots、routines 带 overlap 和 catch-up、computer use 带可见指示器和 kill switch；做法 I 的性能数据、Webhook 模板验证范围、虚构样例、其他 CLI Agent 接入命令可用性；做法 J 的 safe by default、agents that actually do the work、一条命令约 10 分钟、每次调用有预算和记录、router never grants a permission；做法 K 的学习层收益、模板效果、code-review 缺陷发现率、30 个 PR 样本的可推广性——均无案例、基准或第三方评测支撑，各份调研都明确标注为自述、判断或矛盾表述。

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
- [Show HN: AgentRun – open-source, Self-improving Managed Agents](../research/radar/2026-11-13/12949-show-hn-agentrun-open-source-self-improving-manage.md)：值得一试，先在本地用 `npx @parcha/agentrun` 启动服务，并给一个模板（建议用 `code-review` 或 `kyb`）设置费用上限，跑一批自有数据，重点验证「learning 打开前后同一批任务的 token 成本与通过率」以及它相对现用工具的缺陷发现率；理由是 README 给出了可直接执行的安装、模板、workflow JSON、CLI/API 与触发器的完整路径，但所有收益数字均为作者自报、样本小（30 个 PR），且无独立复现，暂不宜作为手册中的默认方案。
