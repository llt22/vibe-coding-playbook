# 让常驻 agent 接走你的周期性重复工作：四条路线的两周试跑与验收

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：面对 nanobot / CowAgent / Eigent / NanoClaw 这类自托管或桌面常驻 AI agent，如何用两周的小范围试跑和可观察指标，判断它是否值得接管你的周期性重复工作，而不是被 README 的能力清单说服。
> 先试这一步：在一个可丢弃的环境里只选一条路线跑通（Docker 优先、只开本地访问、只接一个模型、只配一个定时任务），并从第一次运行起就记录「按时完成率 / 人工介入次数 / token 成本」。
> 最近修订：2026-10-02

## 解决什么问题

周期性重复的工作——按固定时间汇总某个信息源、每周重复读同一批文件、跑同一批命令、查同一类网页——看起来很适合交给一个常驻的本地/服务器端 AI agent，或者一个桌面端的多 agent 应用。但这类项目的 README 只给安装和配置步骤，不给效果数据、对比案例或评估方法。

这份手册给出一条可执行的试跑路径：起一个实例 → 只接一个模型 → 配一个定时任务 → 跑两周 → 用「按时投递成功率 + 人工返工时间 + token 成本」决定它是否进入你的日常工作流。四条路线（nanobot / CowAgent / Eigent / NanoClaw）共用同一套判断标准，选一条走完即可。

## 适用与不适用

**适用**

- 你手上有明确的周期性重复工作，形态落在「读文件 / 跑命令 / 查网 / 按计划重复 / 拆给多个子代理」里。
- 有一台可联网、且你信得过的 Linux / macOS / Windows 机器或服务器；如果你想试 Eigent，还需要桌面环境；如果你想试 NanoClaw，需要 macOS 或 Linux（Windows 走 WSL2）以及 Docker。
- 至少有一个模型厂商的 API key，或者能在本机跑起一个本地推理服务（Eigent 支持 Ollama / vLLM / LM Studio 一类；NanoClaw 可以通过 `/add-ollama-provider` 接本地开源权重模型）。
- 能接受先花 1–2 周观察期，而不是马上全量切换。

**不适用**

- 没有重复性工作，只是想试个新工具。
- 必须部署在不受信任的环境——CowAgent 的 README 明确说 Agent 能访问本机操作系统，只能在可信环境部署。
- 承担不了 token 成本——同一份 README 明确警告 Agent 模式消耗显著多于普通对话。
- 期待有现成效果数据可抄——四份调研都指出各自原文没有任何效果数据、对比案例或指标（Eigent 只有 stars 数，NanoClaw 的 30866 stars 同理，那反映的是热度，不是效果）。
- 不想动代码：NanoClaw 的定制哲学是「Customization = code changes」，README 也承认主干只接受安全修复、bug 修复和明确改进，其余一律以 skill 形式自带，不想改代码的人上手成本高。

## 前置条件

- **用 nanobot**：Python 3.11 或更新；源码安装额外需要 Git 和 Bun。平台 wheel 同时含 WebUI 和原生终端 UI，覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64（x64 运行时要求 SSE4.2）；其他平台用 `nanobot --classic` 或 WebUI。
- **用 CowAgent**：一台可联网的 Linux / macOS / Windows 机器或服务器；至少一个模型厂商的 API key，在 Web console 里配置，不需要手改文件。
- **用 Eigent**：桌面环境；快速开始模式需要 Node.js 18–22 和 npm；后端 Python 依赖用 uv 管理。**本地部署与 MCP / Skill 配置的具体命令不在 README 正文里**——本地部署看 `./server/README_EN.md`，工具与能力配置看 `https://docs.eigent.ai`，本次材料未包含这两部分内容。
- **用 NanoClaw**：macOS 或 Linux（Windows 走 WSL2）；Node.js 22+ 与 pnpm 10+（缺失时安装脚本会装）；Docker Desktop（macOS/Windows）或 Docker Engine（Linux）；**Claude Code**——它负责 `/customize`、`/debug`、安装出错时的恢复，以及所有 `/add-<channel>` skill；另外需要 Anthropic 凭据（或改用其他 provider）。
- **常驻前提**：nanobot 的定时投递要生效，网关必须一直运行；CowAgent 本身定位就是可 7×24 跑在个人电脑或服务器上；Eigent 的 Automation 定位是「人离开时任务继续跑」，但前提是应用/服务在跑；NanoClaw 是「Node 宿主进程 + 每个 agent group 一个 Docker 容器」，只要宿主和容器在跑，定时任务就由宿主唤醒。
- **试用期约定**：Docker 优先（便于清理），只开本地访问，先不要把控制台暴露到外网。注意例外：**Eigent 的快速开始模式会连接 Eigent 云端服务、需要注册账号，不是完全本地**；如果你的目标是「数据不出本机」，别把 Quick Start 当成最终形态。NanoClaw 的安装默认在本地构建镜像、不联网、不需要账号，但**匿名安装诊断默认开启**，可用 `NANOCLAW_NO_DIAGNOSTICS=1` 关闭；可选账号只用于拉取预构建加固镜像和托管 Slack app（会看到你的邮箱和拉取时间）。

## 操作步骤

### 第 1 步：先选一种做法，别同时上多个

A、B、C、D 属于同一类「长驻 / 桌面 agent harness」，能力清单高度重叠（本地文件与 shell、网页搜索与抓取、MCP 工具、cron/调度、长期记忆、子代理委派、多模型路由）。区别只在形态与侧重，且这些侧重全部来自各自的 README 自述，没有第三方对比测试，也没有效果数据：

- 想接主流 IM 渠道（微信、飞书、钉钉、企微、QQ、公众号、Telegram、Slack、Discord 等）、想用现成技能市场、想要对话式技能生成 → **做法 B：CowAgent**。
- 想要更小的内核、WebUI + 终端 workbench、OpenAI 兼容 API / Python SDK、可自托管的 Python 包 → **做法 A：nanobot**。
- 想要桌面图形界面、要在一个任务里并行跑多个 agent 分工、要接本地推理模型让数据不出本机、要内置浏览器与终端工具包 → **做法 C：Eigent**。
- 想要容器级文件系统隔离（容器只挂载你显式允许的目录）、不想让 agent 持有原始 API key（出站请求经凭据网关在请求时注入，支持按 agent 的策略和限流）、想按频道选择「各自独立 agent / 共享一个 agent / 折叠成单一共享会话」、且能接受「定制即改代码」→ **做法 D：NanoClaw**。它原生跑 Anthropic 官方 Claude Agent SDK，等于 Claude Code 的容器化 + 常驻化外壳，所以 Claude Code 必须在手边；换后端可以装 `/add-codex`、`/add-opencode`、`/add-ollama-provider`，provider 粒度是 per agent group。
- 如果团队里已经在用 OpenClaw 一类做法：nanobot 的 `nanobot gateway` 被作者描述为「从 OpenClaw 过来、把 agent 当长驻服务跑的人熟悉的入口」；CowAgent 的 Skill Hub 声明技能格式与 OpenClaw、Claude Code 互通，可共用同一套技能资产；NanoClaw 则反过来把 OpenClaw 当对比对象——README 自述对方近 50 万行代码、53 个配置文件、70+ 依赖、应用层权限校验、单 Node 进程共享内存，自己定位为「同样核心功能、但代码小到能读懂 + 容器隔离」，这些数字全部是作者主张、原文无法核实；Eigent 只声明定位与 Claude Cowork / Codex 相似，没有给对比数据、迁移路径或兼容性说明，不能当作已验证的替代方案。

任选其一即可。同时开两个以上，两周后你分不清是哪个在起作用。

### 第 2 步（做法 A）：部署 nanobot 并接入一个模型

前提：Python 3.11+，只选一种安装方式（最稳定用 PyPI/uv，跟最新特性用源码）。

**A-1 安装。** 一键安装，macOS / Linux：

```bash
curl -fsSL https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.ps1 | iex
```

不改动环境、只看安装计划：

```bash
curl -fsSL https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.sh | sh -s -- --dry-run
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.ps1))) --dry-run
```

用 uv：

```bash
uv tool install nanobot-ai
```

用 pip：

```bash
python -m pip install nanobot-ai
```

源码安装（需要 Bun）：

```bash
git clone https://github.com/HKUDS/nanobot.git
cd nanobot
python -m venv .venv
```

激活：macOS/Linux 用 `source .venv/bin/activate`，Windows PowerShell 用 `.venv\Scripts\Activate.ps1`，然后：

```bash
python -m pip install -e .
```

预期结果：

```bash
nanobot --version
```

能输出版本号。如果 `nanobot` 不在 PATH 上，用 `uv tool run --from nanobot-ai nanobot ...` 或 `pipx run --spec nanobot-ai nanobot ...` 调用。

**A-2 首次运行并配置模型**（作者推荐的第一次运行方式）：

```bash
nanobot webui
```

预期结果：启动器按需创建配置和工作区，打开 `http://127.0.0.1:8765`，首次运行默认只绑 localhost，不暴露到局域网。前三个动作：

1. 打开 **Settings → Models**，选择 provider、凭据和模型。
2. 新建一个 topic，发送 `Hello!` 验证连接。
3. 做正式项目之前，先在输入区选择目标 workspace 和 access mode。

任何正常回复就说明 provider、模型、workspace 和浏览器网关已经打通。

**A-3 让它在你关掉终端后继续运行**（定时投递的前提）：

```bash
nanobot gateway --background
```

README 明确说这是**唯一**会把共享网关提升为持久后台模式的命令。管理命令：

```bash
nanobot gateway status
nanobot gateway logs
nanobot gateway restart
nanobot gateway stop
```

**A-4（可选）在终端里工作**：`nanobot` 以启动目录作为 workspace 打开原生终端客户端，和 WebUI 共享已保存的会话和本地网关。一次性执行适合快速验证 provider 或写进 shell 脚本：

```bash
nanobot -m "Hello!"
```

指定会话与工作区：

```bash
nanobot --session <会话> --workspace <工作区>
```

**A-5 把工具接进对话**：在 WebUI 的 **Apps** 里连接 MCP 服务器、启用 Agent Plugins、管理本地 CLI App 适配器，然后用 `@` 把可用工具挂上；**Skills** 放可复用指令；**Settings** 放模型、语音、图像、网页和聊天渠道配置。

**A-6 配一个周期性自动化**（本次试跑的重点）：在你希望接收结果的那个 topic 里让它创建 automation；用 **Tasks** 查看和管理日程，用 **Calendar** 按日期扫描已完成和即将执行的运行。前提：网关保持运行，否则定时投递不生效。

**A-7（可选）部署为常驻服务**：Render 一键部署会要求填 `ANTHROPIC_API_KEY` 和一个私有的 `NANOBOT_WEB_TOKEN`，持久磁盘需要付费；自托管按 `docs/deployment.md` 做 Docker、Docker Compose、Linux service、macOS LaunchAgent。接进自己的脚本则用 OpenAI 兼容 API（`docs/openai-api.md`）或 Python SDK（`docs/python-sdk.md`）。

### 第 3 步（做法 B）：部署 CowAgent 并接入一个模型

前提：可联网的 Linux / macOS / Windows 机器或服务器；至少一个模型 API key。

**B-1 安装**，三选一（脚本会处理依赖、配置与启动）。Linux / macOS：

```bash
bash <(curl -fsSL https://cdn.link-ai.tech/code/cow/run.sh)
```

Windows（PowerShell）：

```powershell
irm https://cdn.link-ai.tech/code/cow/run.ps1 | iex
```

Docker：

```bash
curl -O https://cdn.link-ai.tech/code/cow/docker-compose.yml
docker compose up -d
```

**B-2 打开 Web 控制台**：浏览器访问 `http://localhost:9899`。这是对话、配置模型、接入渠道、安装技能、管理记忆的统一入口。在里面配好一个 Chat 模型，预期结果是能正常对话。

**B-3 用 cow CLI 管理服务**：

```bash
cow start | stop | restart        # service control
cow status | logs                  # status and logs
cow update                         # pull latest code and restart
cow skill install <name>           # install a skill
cow install-browser                # install browser automation
```

**B-4 装一个技能**（对话里的斜杠命令）：

```bash
/skill list                   # list installed skills
/skill search <keyword>        # search the marketplace
/skill install <name>          # one-click install
```

技能来源是 Skill Hub（skills.cowagent.ai）、GitHub、ClawHub 或任意 URL。装不到合适的，就用 `skill-creator` 通过自然语言对话生成一个自定义技能，把你要重复做的那件事固化下来。

**B-5（可选）接 MCP 工具**：准备一个 `mcp.json`，支持 stdio / SSE 传输和热重载。注意调研指出 README 没有给出 `mcp.json` 的字段示例，需要查官方文档页 `/tools/mcp`。

**B-6（可选）需要图形桌面操作时**：

```bash
cow install-browser
```

**B-7 配模型路由**：在 Web console 里为 Chat、Vision、Image Generation、ASR/TTS、Embedding 分别指定厂商，一键切换；支持 DeepSeek、Claude、OpenAI、Gemini、MiniMax、GLM、Qwen、Kimi、Doubao、ERNIE、MiMo、LinkAI 及自定义（本地模型 / 第三方代理）。

**B-8 服务器部署的配置（试用阶段先别做）**：在 `config.json` 里把 `web_host` 设为 `0.0.0.0`、设置 `web_password` 保护控制台、在防火墙/安全组放行 `9899` 端口。README 明确说 Agent 能访问本机操作系统，只能在可信环境部署。

### 第 4 步（做法 C）：跑起 Eigent 并接入一个模型

前提：桌面环境；快速开始模式需要 Node.js 18–22 与 npm；后端 Python 依赖用 uv 管理。

**C-1 快速开始（云端连接模式）**：

```bash
git clone https://github.com/eigent-ai/eigent.git
cd eigent
npm install
npm run dev
```

注意：此模式会连接 Eigent 云端服务，需要注册账号，**不是完全本地**。预期结果：桌面端能启动、能对话、能调用工具。

**C-2 拉取新代码后同步前后端依赖**（README 专门列出，容易漏）：

```bash
# 1. Update frontend dependencies (in project root)
npm install

# 2. Update backend/Python dependencies (in backend directory)
cd backend
uv sync
```

**C-3 本地部署**（README 推荐方式，也是验证「数据不出本机」的唯一途径）：README 只给了入口文档链接 `./server/README_EN.md`（Local Deployment Guide），**正文没有给出具体命令，本次材料也未包含该文档内容**。按 README 描述，这套部署包含：本地后端服务（完整 API）、本地模型集成（vLLM、Ollama、LM Studio 等）、与云服务完全隔离、零外部依赖。要跑这一步，先打开该文档。

**C-4 选协作模式**：

- **单 agent**：聚焦型任务（research、写作、debug、操作），在桌面工作区里直接对话执行。
- **Workforce（多 agent）**：把复杂多步任务拆给多个专门 agent，并行分工执行。

依据：README 把二者列为两套并行能力，**没有给出「何时用哪个」的判定规则**，阈值需要你自己在试用中定。

**C-5 接模型**（模型无关）：可接三类——云端 API、企业网关、本地推理。前提是模型侧自己要准备好（本地要跑起 vLLM / Ollama / LM Studio 之一）。README 用例演示了用 Ollama 跑本地模型（DeepSeek）完成月度报告。

**C-6 配工具与能力入口**：README 列出 MCP Integration、Skill Integration、内置 Browser & Terminal Toolkits，但**没有给出配置示例或字段说明**，需查文档站 `https://docs.eigent.ai`。

**C-7 设置自动化（Automation）**：README 描述为「Schedule recurring workflows and let agents run tasks at the right time」——把周期性工作流排进计划，人离开时任务继续跑。**原文未给调度配置的具体格式。**

**C-8 照抄官方用例库里的场景**（原文只给标题 + 一句描述 + 链接，没有步骤，需要点进官网 guide 才能照做）：

- 并行建 10 个中文新年主题 HTML5 游戏（含计分、递增难度、重开流程）
- 用 Gemini 建 3D Snow Bros 平台跳跃游戏
- 用 Ollama 上的 DeepSeek 自动生成月度开发报告：读一个月 GitHub PR → 生成 Word 摘要 → 准备 Slack 发布更新
- 整理桌面文件：检查混乱的桌面并按更有用的结构归类
- 用 Gemini 审计 ML CI 失败：多 agent 拉日志、比对 golden values、追溯证据、委派深度推理、产出结构化审计报告
- 工单系统集成与报表：把本地工单数据导入浏览器端管理系统，再生成带图表和可视摘要的统计报告

本次试跑优先选**周期性、输入输出边界清楚、且用例库里已有 demo** 的那一条——月度 GitHub PR 汇总 → Word → Slack 是唯一带明确周期触发的样本，优先拿它当参照物。

### 第 5 步（做法 D）：部署 NanoClaw 并接一个频道

前提：macOS 或 Linux（Windows 走 WSL2）；Node.js 22+ 与 pnpm 10+（缺失时安装脚本会装）；Docker Desktop（macOS/Windows）或 Docker Engine（Linux）；机器上有 git；Claude Code 可用；Anthropic 凭据（或后面改用其他 provider）。

**D-1 一键安装并配对第一个频道**：

```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash nanoclaw.sh
```

预期结果（脚本会依次走完）：补装 Node、pnpm、Docker → 安装凭据网关并把你的 Anthropic 凭据注册进去 → 构建 agent 容器 → 配对第一个频道（Slack、Telegram、Discord、WhatsApp、iMessage 或本地 CLI）。某一步失败时，脚本会自动调用 Claude Code 诊断并从断点续跑。

注意目录名：README 的写法是把 v2 装成 `nanoclaw-v2`，便于和已有 v1 安装作为同级目录并存。

**D-2（可选）从 v1 迁移**：

```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash migrate-v2.sh
```

它会找到 v1 安装（同级目录，或 `NANOCLAW_V1_PATH=/path/to/nanoclaw`），合并 `.env`、从 `registered_groups` 播种 v2 数据库、复制 group 文件夹 + 会话数据 + 定时任务、安装你选择的频道适配器、复制频道鉴权状态（含 WhatsApp 的 Baileys keystore；v1 的 LID 映射不迁移，v7 适配器按消息解析）、构建 agent 容器。**不会**切换系统服务——需要你在提示处选 “switch to v2”，或测试后手动切。两个前提：要直接在真实 shell 里跑，不要在 Claude 会话里跑，因为确定性部分需要交互式提示和真实 shell I/O；新装的这次试跑用不到它，可以直接跳过。

**D-3 用触发词下指令**（默认触发词 `@Andy`）。README 给的三个可直接照抄的例子，正好就是「可以交给它的活儿」的清单：

```
@Andy send an overview of the sales pipeline every weekday morning at 9am (has access to my Obsidian vault folder)
@Andy review the git history for the past week each Friday and update the README if there's drift
@Andy every Monday at 8am, compile news on AI developments from Hacker News and TechCrunch and message me a briefing
```

在你自己拥有或管理的频道里，还能管理群组和任务：

```
@Andy list all scheduled tasks across groups
@Andy pause the Monday briefing task
@Andy join the Family Chat group
```

预期结果：第三条（每周一 8am 的新闻简报）最适合当本次试跑的靶子——触发时间明确、输入源明确、产出物是一段可人工核对的文字。用 `list all scheduled tasks across groups` 确认任务已登记，用 `pause` 验证你能随时叫停。

**D-4 改行为**：不使用配置文件。直接对 Claude Code 说要什么，例如：

- "Change the trigger word to @Bob"
- "Remember in the future to make responses shorter and more direct"
- "Add a custom greeting when I say good morning"
- "Store conversation summaries weekly"

或运行 `/customize` 做引导式修改。前提：代码库足够小，作者主张 Claude 能安全修改——这是自述，不是已验证结论。

**D-5 加频道 / 换模型**：频道适配器和替代 provider 不在主干上，通过 skill 装：`/add-telegram`、`/add-codex`（OpenAI Codex，可用 ChatGPT 订阅或 API key）、`/add-opencode`（经 OpenCode 接 OpenRouter、Google、DeepSeek 等）、`/add-ollama-provider`（本地开源权重模型）。Provider 可按 agent group 配置，同一安装里不同 agent 可以跑不同后端。一次性实验也可以用任何 Claude API 兼容端点，通过 `.env`：

```bash
ANTHROPIC_BASE_URL=https://your-api-endpoint.com
ANTHROPIC_AUTH_TOKEN=your-token-here
```

**D-6 控制隔离与共享**：用 `/manage-channels` 按频道选择：每个频道接自己的 agent（完全隔离）、多个频道共享一个 agent（统一记忆、各自会话），或把多个频道折进一个共享会话（一段对话跨多个界面）。参考 `docs/isolation-model.md`。同时记住容器只挂载你显式允许的目录，凭据不进容器——这就是这份手册里「数据边界」这一指标在 NanoClaw 上的检查方式。

**D-7 模板化起 agent**（前提：`templates/` 目录里有模板，可手工放或从公开库拷）：

```bash
ncl groups create --template <ref>
```

模板是「指令 + MCP 工具 + skills、不含密钥」的可复用包。

**D-8 调试**：直接问 Claude Code（“Why isn't the scheduler running?” “What's in the recent logs?” “Why did this message not get a response?”）。若安装失败且脚本自愈不了，运行 `claude` 然后 `/debug`。

**D-9 关闭匿名诊断**（默认开启）：

```bash
NANOCLAW_NO_DIAGNOSTICS=1
```

**D-10 卸载 / 回滚**（试用期结束、或降级为 watch 时执行）：

```bash
git clone ... && cd nanoclaw-v2
bash nanoclaw.sh --uninstall
```

每次安装带 per-checkout id，卸载器只删属于这份拷贝的东西（后台服务、容器与镜像、应用数据与日志、agent 文件、这份拷贝的网关 agent），共享的东西（网关服务、你的凭据、机器上其他 NanoClaw 拷贝）不动；会逐项列出并逐组确认。`--dry-run` 预览，`--yes` 跳过确认，`.env` 删除前会备份。预期结果：脚本跑完后，再手动删掉 checkout 目录，机器回到试跑前的状态。

### 第 6 步：无论 A / B / C / D，都收敛到同一个最小闭环

这一步是整篇手册的核心，四份调研给出的建议一致：

1. **实例只开本地访问**。Docker 优先；先不要把控制台暴露到外网（CowAgent 调研的建议就是先不要把 `web_host` 设为 `0.0.0.0`；Eigent 的 Quick Start 会连云端，要「不出本机」必须走 C-3 的本地部署；NanoClaw 默认本地构建、不联网，但要显式关掉匿名诊断并核对容器挂载清单）。
2. **只配一个 Chat 模型**，不接多渠道，先把「模型能用」这一步单独确认掉。NanoClaw 对应的是：只配一个 provider（默认 Anthropic），装别的 provider skill 留到跑通之后。
3. **只装 / 建一个技能或工具，范围严格限定在「一件你每周都要重复做的小事」**。装不到合适技能，就退回让 agent 用对话生成一个最小技能（CowAgent 用 `skill-creator`；NanoClaw 用自然语言直接对 Claude Code 改，或 `/customize`）。
4. **建一个定时任务**，例如固定时间汇总某个信息源并推送，观察它能否在无人干预下完成（nanobot 用 Automations / Tasks，前提是网关常驻；CowAgent 用内置 `scheduler`，在 Web console 里管理；Eigent 用 Automation；NanoClaw 用触发词让 agent 建 recurring job，用 `list all scheduled tasks across groups` 核对、`pause` 暂停）。
5. **让它连续处理同一类任务 5–10 次**，每次都检查两件事：一是任务是否完成，二是后续对话里它是否自动检索到了之前的记忆 / 知识，而不需要你重新交代背景。
6. **从第一次运行就开始记录指标**（见下一节）。否则两周后你只有印象，没有依据。

**如果选的是 Eigent，按这个顺序收敛**：先用 C-1 跑通桌面端 → 再把模型换成 Ollama 上的本地模型，验证「数据不出本机」这条是否成立 → 如果流程有效，再试 Workforce 多 agent 并行，和同一任务在单 agent 下的表现做对比 → **最后才试 Automation 定时调度**，观察连续几个周期是否可靠触发。顺序反了的话，一旦调度漏跑，你分不清是调度的问题还是多 agent 分工的问题。

**如果选的是 NanoClaw，按这个顺序收敛**：D-1 装好并只配对**一个**频道（本地 CLI 或你最常用的那个）→ D-3 用「每周一 8am 新闻简报」这一条建一个定时任务，连续跑几个周期 → 核对容器挂载清单，确认 agent 只看到你显式允许的目录 → 需要换本地模型或换渠道时，再分别装 `/add-ollama-provider`、`/add-telegram` 这类 skill → **最后**再试 `/manage-channels` 的隔离与共享组合。先动挂载和权限再搭任务，一旦出问题你分不清是权限配置还是任务本身。

预期结果：两周内你拿到一组自己的数字，而不是一份 README 的承诺。

## 怎么判断变好了

四份调研都没有给出官方指标，下面这套是「调研作者建议 + 你需要自建基线」的组合。

**可观察的指标**

- **定时任务按时完成率**，以及需要你人工介入的次数（按次记录）。
- **单次任务的实际耗时与返工次数**，对比「你自己做」或「用普通对话式 AI 做」的基线。Eigent 调研把它拆成两条：人工耗时差（从全程自己做变成只审核产出物）和首次通过率（产出需要返工或重做的比例）。
- **Token 成本**：算清每完成一件任务花多少钱。CowAgent README 明确警告 Agent 模式消耗显著多于普通对话，这是最容易失控的一项。NanoClaw 的定时任务可配 script gates，无活时不唤醒 agent，属于同一项成本上的一个可调开关（具体写法原文只给了链接）。
- **技能复用次数**：同一个技能被稳定调用多少次；如果一周内没有被重复调用，说明它没有固化成产能。
- **记忆有效性**：随机抽查后续会话，看它是否引用了正确的历史结论，而不是要你重新交代背景。
- **数据边界**（Eigent 调研建议）：在本地部署模式下，能否确认文件、凭据、上下文没有被送出本机。NanoClaw 上这一项最容易做成可检查项——容器只挂载你显式允许的目录，且 agent 不持有原始 API key（由凭据网关在请求时注入），你可以直接拿挂载清单和出站策略来核对；但它同样没有第三方验证，别把「设计如此」当成「实测成立」。
- **失败可诊断性**（Eigent 调研建议）：任务失败时能否从日志 / 步骤回放定位原因。NanoClaw 的路径是把排障直接交给 Claude Code（问它为什么调度没跑、日志里有什么），或 `/debug`。

**注意区分「可观测」和「有效果」**：nanobot 的 WebUI 可以展开查看推理过程、工具调用、文件改动、差分、命令输出和产出物，输入区的上下文指示器显示上下文大小、每轮输入 token 和 provider 上报的缓存复用，还有上下文压缩（compaction）时间线，配置里可接 Langfuse；CowAgent 有上下文用量可视化、`/compact` 上下文压缩、模型缓存命中率提升；NanoClaw 有 per-checkout id、可逐组确认的卸载清单、可关闭的匿名诊断、容器与凭据网关。这些说明「用了多少」「装在哪」，不说明「是否改善」，不能拿来当效果证据。同理，Eigent 的 15,457 stars 和 NanoClaw 的 30866 stars 只反映热度，不是效果证据。

**最小试用方式**：单机跑通一个实例，只开本地访问（Eigent 若走 Quick Start 会连云端），只配一个模型，装 1 个技能，建 1 个定时任务，连续跑 5–10 次同类任务。

**试多久**：nanobot 调研建议把这件周期性工作配成 automation 跑两周；CowAgent 调研建议 1–2 周；Eigent 调研未给观察期长度，沿用两周作为默认观察期；NanoClaw 调研建议 1 天内搭完、2 周判断。统一按两周执行。

**降级 / 放弃条件**（出现任一即可停）：一周内跑不出任何可复用的稳定产出；或 token 成本明显高于人工 / 普通对话方案；或必须开放外网与高权限才能用。Eigent 上的等价说法是：只有在那个周期任务上做到「人工时间明显下降且返工比例可接受」，才考虑纳入日常工作流，在此之前保持 try 状态。NanoClaw 上还可以加一条：如果为了让它跑起来必须持续改代码而你又不想维护这份 fork，直接停。出现任一情况，把项目从 try 降为 watch，只在观察清单里跟踪；NanoClaw 可以直接用 `bash nanoclaw.sh --uninstall` 干净回滚，不需要留一台挂着的机器。

## 常见坑

- **把「装好了、能回复」当成「工作变好了」**。四份调研都明确指出原文只有安装与能力清单，没有效果数据、对比案例、基准分数或成本节省数据。
- **把 Eigent 的「Zero Setup - No technical configuration required」当真**。这与后文要求 Node.js 18–22 + npm + `uv sync` 的实际步骤相互矛盾，应按后者准备环境。
- **把 Eigent 的 Quick Start 当成「本地部署」**。该模式会连接 Eigent 云端服务、需要注册账号，不是完全本地；要验证数据不出本机，必须走 `./server/README_EN.md` 的本地部署（本次材料未含该文档的具体命令）。
- **把 Eigent 的 Roadmap 当现有能力**。Context Engineering（Prompt caching、System prompt optimize、Toolkit docstring optimize、Context compression）、多 agent 固定工作流、多轮对话、Document Toolkit 动态编辑都是未完成项，不能算作已具备的能力。
- **拿 Eigent 的用例标题当验证依据**。用例库只有标题、一句描述和链接，没有耗时、成功率、人工介入比例；步骤在官网 guide 页面，不看就照做不了。
- **把 Eigent 当成 Claude Cowork / Codex 的已验证替代**。README 只说明定位相似，未提供任何对比数据、迁移路径或兼容性说明。
- **把 NanoClaw 当成零成本上手**。它需要 macOS/Linux/WSL2、Docker、Node 22+、pnpm 10+、Claude Code，以及 Anthropic 凭据（或改用其他 provider）；定制哲学是「Customization = code changes」，主干只接受安全修复、bug 修复和明确改进，其余以 skill 形式自带。想少动手的人，先按第 1 步的形态偏好重新选路线。
- **在 Claude 会话里跑 `migrate-v2.sh`**。调研明确说这条命令要直接在真实 shell 里跑，因为确定性部分需要交互式提示和真实 shell I/O；而且迁移**不会**自动切换系统服务，需要你选 “switch to v2” 或测试后手动切。
- **以为 NanoClaw 有配置文件可改行为**。它的做法是不用配置文件，直接对 Claude Code 说要什么，或跑 `/customize`；想加频道、换 provider 也只能通过 `/add-<channel>` 这类 skill，而 skill 需要在 Claude Code 里执行。
- **忘了关匿名安装诊断**。NanoClaw 的匿名诊断默认开启，用 `NANOCLAW_NO_DIAGNOSTICS=1` 关闭；可选账号会看到你的邮箱和拉取时间，只用于预构建加固镜像和托管 Slack app。
- **卸载时以为会删干净一切**。NanoClaw 的卸载器是 per-checkout 的：只删属于这份拷贝的后台服务、容器与镜像、应用数据与日志、agent 文件和这份拷贝的网关 agent，共享的网关服务、你的凭据、机器上其他拷贝都不动；最后要手动删掉 checkout 目录。先跑 `--dry-run` 看一眼要删什么。
- **文档有缺口就卡住**。CowAgent 的 MCP 集成只有一句描述、没有 `mcp.json` 示例，技能创作只有「用对话生成」没有演示，需查官方文档页；Eigent 的本地部署命令在 `server/README_EN.md`、MCP / Skill 配置在 `docs.eigent.ai`、用例步骤在官网 guide，都不在 README 正文里；nanobot 的上下文与隐私用法（不同任务用不同 topic、Temporary chat 不写历史或长期记忆、一个 workbench 最多并排四个会话）分散在 README 里；NanoClaw 的定时任务 script gates 具体写法和 `docs/` 里各文档细节，原文只有链接、没有正文，要照做必须先另行查阅。
- **把作者自述当事实**。CowAgent 的 stars 数是仓库自报；「proactively plans」「self-evolution」「grows alongside you」「Agent Harness engineering 的参考实现」、记忆分层与 Deep Dream、知识库自动整理与知识图谱、Self-Evolution 的具体效果，全部是自述，没有案例或数据支撑。Eigent 的「boosts productivity」「exceptional productivity」「turn your most complex workflows into automated tasks」同样无任何量化。nanobot 的能力清单同样只是项目自述。NanoClaw 对 OpenClaw 的对比数字（近 50 万行代码、53 个配置文件、70+ 依赖、应用层安全 vs OS 级隔离）以及「Claude 能安全修改这么小的代码库」也都是作者主张，原文无法核实。
- **定时任务不生效**。nanobot 的定时投递要靠网关常驻，`nanobot gateway --background` 是唯一把它提升为持久后台模式的命令；关掉终端就等着收不到结果。NanoClaw 侧则要先确认宿主进程和容器都在跑，再用 `list all scheduled tasks across groups` 确认任务确实登记了。
- **试用期就开放外网或高权限**。CowAgent README 明确说 Agent 能访问本机操作系统，只能在可信环境部署；服务器暴露控制台必须设 `web_password` 并限制端口。试用阶段就把实例锁在 localhost。NanoClaw 侧对应的是：先核对容器挂载清单、别急着用 `/manage-channels` 把多个频道折进一个共享会话，也先别让 agent 去改自己的代码。
- **pip 报 `externally-managed-environment`**：改用一键安装器、`uv tool install nanobot-ai`、`pipx install nanobot-ai`，或装进虚拟环境。
- **`nanobot` 不在 PATH**：用 `uv tool run --from nanobot-ai nanobot ...` 或 `pipx run --spec nanobot-ai nanobot ...`。
- **拉完代码忘了同步依赖（Eigent）**：前端要在项目根目录 `npm install`，后端要 `cd backend && uv sync`，两步都做。
- **技能装不通就放弃**。退回用 `skill-creator` 生成一个最小技能，范围严格限定在「一件你每周都要重复做的小事」。
- **把所有任务塞进同一个会话**。nanobot 支持按 topic 分开任务，并用 Temporary chat 做临时对话（不写入历史或长期记忆）；混在一起会污染记忆检索，也会让「记忆是否有效」这项指标失效。NanoClaw 上用 `/manage-channels` 决定「各自独立 agent / 共享一个 agent / 折叠成单一共享会话」时同理——共享记忆是便利，也是污染源，先按隔离跑。

## 证据与来源

- **做法 A 的全部命令**（安装脚本、`uv tool install nanobot-ai`、`nanobot webui`、`nanobot gateway --background` 及管理命令、`nanobot --session/--workspace`、`nanobot -m`）：来自 HKUDS/nanobot 调研，均为 README 原文命令。该项目自述 MIT 协议、最新版本 v0.3.5，平台支持覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64（x64 要求 SSE4.2）。
- **做法 B 的全部命令**（run.sh / run.ps1 / docker compose、`cow` CLI、`/skill` 斜杠命令、`cow install-browser`、控制台端口 9899、`config.json` 的 `web_host`/`web_password`）：来自 zhayujie/CowAgent 调研，均为 README 原文。该调研给出可核事实：MIT 许可、仓库自报 47192 stars、版本序列到 v2.2.0（2026.09.30）；并引用原文的风险声明：Agent 模式 token 消耗显著多于普通对话、Agent 可访问本机操作系统只能在可信环境部署。
- **做法 C 的全部命令**（`git clone` + `npm install` + `npm run dev` 快速开始、前端 `npm install` / 后端 `uv sync` 的依赖同步）：来自 eigent-ai/eigent 调研，均为 README 原文。可核事实：Apache 2.0 许可、仓库约 15,457 stars、技术栈为 FastAPI + uv + Uvicorn + CAMEL 后端与 React + Electron + TypeScript + Tailwind/Radix 前端（流程编辑器用 React Flow）。「单 agent 适合聚焦任务 / Workforce 适合复杂多步并行」是 README 的划分，**没有给出选择规则**；「本地部署包含本地后端、本地模型集成 vLLM/Ollama/LM Studio、与云服务完全隔离、零外部依赖」是 README 的定位描述，**具体命令在未提供的 `server/README_EN.md`**；Automation 只有一句功能描述，**未给调度配置格式**；用例库只有标题 + 一句描述 + 链接，**步骤在官网 guide**。
- **做法 D 的全部命令与机制**（`git clone ... nanoclaw-v2` + `bash nanoclaw.sh`、`migrate-v2.sh` 与 `NANOCLAW_V1_PATH`、`@Andy` 三个示例提示词与 `list/pause/join` 管理指令、`/customize`、`/add-telegram` `/add-codex` `/add-opencode` `/add-ollama-provider`、`.env` 的 `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`、`/manage-channels` 与 `docs/isolation-model.md`、`ncl groups create --template`、`NANOCLAW_NO_DIAGNOSTICS=1`、`bash nanoclaw.sh --uninstall` 及 `--dry-run`/`--yes`）：来自 nanocoai/nanoclaw 调研，均为项目 README 原文。可核事实：仓库 30866 stars（仓库指标，不构成质量或效果证据）。架构描述（Node 宿主进程 + 每个 agent group 独立 Docker 容器；消息经「用户 → 消息群 → agent group → 会话」路由写入 `inbound.db` 唤醒容器；容器内 agent-runner 用 Bun + Claude Agent SDK 轮询、执行、写 `outbound.db`，宿主再轮询并投递回聊天工具；每会话两个 SQLite 文件、各自单一写入者、不走 IPC 也不走 stdin；宿主有 60 秒 sweep，见 `src/host-sweep.ts`）以及容器文件系统隔离、凭据网关注入并支持按 agent 的策略与限流、每个 agent group 有自己的 `CLAUDE.md`/记忆/容器，均来自 README 自述。**定时任务 script gates 的具体写法、`docs/` 各文档的细节，原文只有链接没有正文，无法据此照做。定时任务与 `ncl` 的示例来自 README，未附效果数据。**
- **最小闭环与判断指标**：「只配一个模型 + 一个技能 + 一个定时任务」「连续处理同类任务 5–10 次」「按时完成率 / 人工介入次数 / 耗时与返工 / token 成本 / 技能复用次数 / 记忆有效性」「1–2 周」「跑两周」「降级为 watch 的条件」，来自 nanobot 与 CowAgent 两份调研的结论与验证建议；「人工耗时对比 / 首次通过率 / 调度可靠性 / 数据边界 / 失败可诊断性」「先 Quick Start → 换本地模型验证数据边界 → 再试 Workforce → 最后试 Automation」「只有人工时间明显下降且返工比例可接受才纳入日常工作流」来自 Eigent 调研的验证建议；「在可丢弃的环境里小范围试、只接一个频道、配一到两个可人工核对的定时任务跑两周」「排障交给 Claude Code 或 `/debug`」「用 `/uninstall` 干净回滚」来自 NanoClaw 调研的验证建议。这些都是调研作者给出的自建方法，不是项目官方提供。
- **只是作者主张**：nanobot 的「小而可读」内核、Dream 长期记忆、多智能体委派的实际效果；CowAgent 的「proactively plans」「self-evolution」「grows alongside you」「Agent Harness engineering 的参考实现」、记忆分层与 Deep Dream 蒸馏、知识库自动整理、Self-Evolution 的具体效果；Eigent 的「boosts productivity」「exceptional productivity」「turn your most complex workflows into automated tasks」「Zero Setup」；NanoClaw 与 OpenClaw 的对比数字（行数、配置文件数、依赖数、安全层级）以及「代码小到 Claude 能安全修改」——均无案例、基准或第三方评测支撑，四份调研都明确标注为自述或矛盾表述。
- **项目间关系**：nanobot 的 `nanobot gateway` 自述对 OpenClaw 用户是熟悉的入口；CowAgent 的 Skill Hub 声明技能可用于 CowAgent、OpenClaw、Claude Code 等，两者技能格式互通、可共用技能资产；NanoClaw 原生使用 Anthropic 官方 Claude Agent SDK（是 Claude Code 的容器化 + 常驻化外壳），并把 OpenClaw 作为对比对象，同时可通过 `/add-opencode` 接 OpenRouter / Google / DeepSeek、通过 `/add-ollama-provider` 接本地开源权重模型；Eigent 只声明定位与 Claude Cowork / Codex 相似，无迁移或兼容性说明。四份调研都没有给出这些项目之间的直接对比测试，因此本手册不比较优劣，只按形态偏好与渠道需求选一个。

## 依据的调研

- [HKUDS/nanobot](../research/radar/2026-10-02/551-hkuds-nanobot.md)：值得一试，建议小范围试用：本地装好 nanobot、接一个模型，把一件周期性重复的工作配成 automation 跑两周，再用“定时投递成功率 + 人工返工时间”判断是否值得纳入日常工作流；理由是 README 给出了完整可复制的安装、首次配置、常驻网关和定时任务步骤，但没有任何效果数据或对比案例支撑。
- [zhayujie/CowAgent](../research/radar/2026-10-02/552-zhayujie-cowagent.md)：值得一试，建议小范围试：在可信的本地/服务器环境用原文给出的一行命令部署 CowAgent，跑通“一个模型 + 一个技能 + 一个定时任务”的最小闭环，再决定是否扩用；理由是原文提供了可直接复制的安装、cow CLI、技能安装与 MCP/调度/多模型路由的配置骨架，但完全没有具体工作场景的流程、提示词或效果数据，且 Agent 模式成本高、有本地系统权限风险。
- [eigent-ai/eigent](../research/radar/2026-10-02/577-eigent-ai-eigent.md)：值得一试，建议小范围试：按 README 给出的命令把 Eigent 桌面端跑起来，先在一个周期性、输入输出明确的任务（如每月汇总 PR 生成报告）上验证「多 agent 并行 + 定时自动化」是否真能减少人工；理由是原文给了可照做的安装与更新命令、明确的单 agent/多 agent 分工和本地部署选项，但完全没有给效果数据，所以不能直接 adopt。
- [nanocoai/nanoclaw](../research/radar/2026-10-02/583-nanocoai-nanoclaw.md)：值得一试，建议在一个可丢弃的环境里小范围试：按 README 的 nanoclaw.sh 一键装好，只接一个频道、配一到两个可人工核对的定时任务跑两周，因为它给出了可照抄的安装/使用/调试/卸载流程和容器级隔离，但全部依据仅来自项目 README，没有效果数据或第三方验证，且定制方式是改代码。
