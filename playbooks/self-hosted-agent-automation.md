# 把周期性重复工作交给常驻 AI agent 之前，先跑两周小样本验证

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：周期性重复工作看起来很适合交给一个常驻/桌面 AI agent，但 nanobot、CowAgent、Eigent 这类项目的 README 只给安装步骤和能力清单，不给效果数据——这份手册给出一条两周内自己跑出判断依据的路径，并说明三种做法怎么选。
> 先试这一步：先在这三类里选一个（不要同时开两个），只配一个模型、只装一个技能、建一个定时任务，从第一次运行就开始记「按时完成率 + 人工返工时间 + token 成本」。
> 最近修订：2026-10-02

## 解决什么问题

周期性重复的工作——按固定时间汇总某个信息源、每周重复读同一批文件、跑同一批命令、查同一类网页——看起来很适合交给一个常驻的本地/服务器端 AI agent，或者一个桌面端的多 agent 应用。但这类项目的 README 只给安装和配置步骤，不给效果数据、对比案例或评估方法。

这份手册给出一条可执行的试跑路径：起一个实例 → 只接一个模型 → 配一个定时任务 → 跑两周 → 用「按时投递成功率 + 人工返工时间 + token 成本」决定它是否进入你的日常工作流。三条路线（nanobot / CowAgent / Eigent）共用同一套判断标准，选一条走完即可。

## 适用与不适用

**适用**

- 你手上有明确的周期性重复工作，形态落在「读文件 / 跑命令 / 查网 / 按计划重复 / 拆给多个子代理」里。
- 有一台可联网、且你信得过的 Linux / macOS / Windows 机器或服务器；如果你想试 Eigent，还需要桌面环境。
- 至少有一个模型厂商的 API key，或者能在本机跑起一个本地推理服务（Eigent 支持 Ollama / vLLM / LM Studio 一类）。
- 能接受先花 1–2 周观察期，而不是马上全量切换。

**不适用**

- 没有重复性工作，只是想试个新工具。
- 必须部署在不受信任的环境——CowAgent 的 README 明确说 Agent 能访问本机操作系统，只能在可信环境部署。
- 承担不了 token 成本——同一份 README 明确警告 Agent 模式消耗显著多于普通对话。
- 期待有现成效果数据可抄——三份调研都指出各自原文没有任何效果数据、对比案例或指标（Eigent 只有 stars 数，那反映的是热度，不是效果）。

## 前置条件

- **用 nanobot**：Python 3.11 或更新；源码安装额外需要 Git 和 Bun。平台 wheel 同时含 WebUI 和原生终端 UI，覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64（x64 运行时要求 SSE4.2）；其他平台用 `nanobot --classic` 或 WebUI。
- **用 CowAgent**：一台可联网的 Linux / macOS / Windows 机器或服务器；至少一个模型厂商的 API key，在 Web console 里配置，不需要手改文件。
- **用 Eigent**：桌面环境；快速开始模式需要 Node.js 18–22 和 npm；后端 Python 依赖用 uv 管理。**本地部署与 MCP / Skill 配置的具体命令不在 README 正文里**——本地部署看 `./server/README_EN.md`，工具与能力配置看 `https://docs.eigent.ai`，本次材料未包含这两部分内容。
- **常驻前提**：nanobot 的定时投递要生效，网关必须一直运行；CowAgent 本身定位就是可 7×24 跑在个人电脑或服务器上；Eigent 的 Automation 定位是「人离开时任务继续跑」，但前提是应用/服务在跑。
- **试用期约定**：Docker 优先（便于清理），只开本地访问，先不要把控制台暴露到外网。注意例外：**Eigent 的快速开始模式会连接 Eigent 云端服务、需要注册账号，不是完全本地**；如果你的目标是「数据不出本机」，别把 Quick Start 当成最终形态。

## 操作步骤

### 第 1 步：先选一种做法，别同时上多个

A、B、C 属于同一类「长驻 / 桌面 agent harness」，能力清单高度重叠（本地文件与 shell、网页搜索与抓取、MCP 工具、cron/调度、长期记忆、子代理委派、多模型路由）。区别只在形态与侧重，且这些侧重全部来自各自的 README 自述，没有第三方对比测试，也没有效果数据：

- 想接主流 IM 渠道（微信、飞书、钉钉、企微、QQ、公众号、Telegram、Slack、Discord 等）、想用现成技能市场、想要对话式技能生成 → **做法 B：CowAgent**。
- 想要更小的内核、WebUI + 终端 workbench、OpenAI 兼容 API / Python SDK、可自托管的 Python 包 → **做法 A：nanobot**。
- 想要桌面图形界面、要在一个任务里并行跑多个 agent 分工、要接本地推理模型让数据不出本机、要内置浏览器与终端工具包 → **做法 C：Eigent**。
- 如果团队里已经在用 OpenClaw 一类做法：nanobot 的 `nanobot gateway` 被作者描述为「从 OpenClaw 过来、把 agent 当长驻服务跑的人熟悉的入口」；CowAgent 的 Skill Hub 声明技能格式与 OpenClaw、Claude Code 互通，可共用同一套技能资产；Eigent 只声明定位与 Claude Cowork / Codex 相似，没有给对比数据、迁移路径或兼容性说明，不能当作已验证的替代方案。

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

### 第 5 步：无论 A / B / C，都收敛到同一个最小闭环

这一步是整篇手册的核心，三份调研给出的建议一致：

1. **实例只开本地访问**。Docker 优先；先不要把控制台暴露到外网（CowAgent 调研的建议就是先不要把 `web_host` 设为 `0.0.0.0`；Eigent 的 Quick Start 会连云端，要「不出本机」必须走 C-3 的本地部署）。
2. **只配一个 Chat 模型**，不接多渠道，先把「模型能用」这一步单独确认掉。
3. **只装 / 建一个技能或工具，范围严格限定在「一件你每周都要重复做的小事」**。装不到合适技能，就退回让 agent 用对话生成一个最小技能（CowAgent 用 `skill-creator`）。
4. **建一个定时任务**，例如固定时间汇总某个信息源并推送，观察它能否在无人干预下完成（nanobot 用 Automations / Tasks，前提是网关常驻；CowAgent 用内置 `scheduler`，在 Web console 里管理；Eigent 用 Automation）。
5. **让它连续处理同一类任务 5–10 次**，每次都检查两件事：一是任务是否完成，二是后续对话里它是否自动检索到了之前的记忆 / 知识，而不需要你重新交代背景。
6. **从第一次运行就开始记录指标**（见下一节）。否则两周后你只有印象，没有依据。

**如果选的是 Eigent，按这个顺序收敛**：先用 C-1 跑通桌面端 → 再把模型换成 Ollama 上的本地模型，验证「数据不出本机」这条是否成立 → 如果流程有效，再试 Workforce 多 agent 并行，和同一任务在单 agent 下的表现做对比 → **最后才试 Automation 定时调度**，观察连续几个周期是否可靠触发。顺序反了的话，一旦调度漏跑，你分不清是调度的问题还是多 agent 分工的问题。

预期结果：两周内你拿到一组自己的数字，而不是一份 README 的承诺。

## 怎么判断变好了

三份调研都没有给出官方指标，下面这套是「调研作者建议 + 你需要自建基线」的组合。

**可观察的指标**

- **定时任务按时完成率**，以及需要你人工介入的次数（按次记录）。
- **单次任务的实际耗时与返工次数**，对比「你自己做」或「用普通对话式 AI 做」的基线。Eigent 调研把它拆成两条：人工耗时差（从全程自己做变成只审核产出物）和首次通过率（产出需要返工或重做的比例）。
- **Token 成本**：算清每完成一件任务花多少钱。CowAgent README 明确警告 Agent 模式消耗显著多于普通对话，这是最容易失控的一项。
- **技能复用次数**：同一个技能被稳定调用多少次；如果一周内没有被重复调用，说明它没有固化成产能。
- **记忆有效性**：随机抽查后续会话，看它是否引用了正确的历史结论，而不是要你重新交代背景。
- **数据边界**（Eigent 调研建议）：在本地部署模式下，能否确认文件、凭据、上下文没有被送出本机。
- **失败可诊断性**（Eigent 调研建议）：任务失败时能否从日志 / 步骤回放定位原因。

**注意区分「可观测」和「有效果」**：nanobot 的 WebUI 可以展开查看推理过程、工具调用、文件改动、差分、命令输出和产出物，输入区的上下文指示器显示上下文大小、每轮输入 token 和 provider 上报的缓存复用，还有上下文压缩（compaction）时间线，配置里可接 Langfuse；CowAgent 有上下文用量可视化、`/compact` 上下文压缩、模型缓存命中率提升。这些说明「用了多少」，不说明「是否改善」，不能拿来当效果证据。同理，Eigent 的 15,457 stars 只反映热度，不是效果证据。

**最小试用方式**：单机跑通一个实例，只开本地访问（Eigent 若走 Quick Start 会连云端），只配一个模型，装 1 个技能，建 1 个定时任务，连续跑 5–10 次同类任务。

**试多久**：nanobot 调研建议把这件周期性工作配成 automation 跑两周；CowAgent 调研建议 1–2 周；Eigent 调研未给观察期长度，沿用两周作为默认观察期。

**降级 / 放弃条件**（出现任一即可停）：一周内跑不出任何可复用的稳定产出；或 token 成本明显高于人工 / 普通对话方案；或必须开放外网与高权限才能用。Eigent 上的等价说法是：只有在那个周期任务上做到「人工时间明显下降且返工比例可接受」，才考虑纳入日常工作流，在此之前保持 try 状态。出现任一情况，把项目从 try 降为 watch，只在观察清单里跟踪。

## 常见坑

- **把「装好了、能回复」当成「工作变好了」**。三份调研都明确指出原文只有安装与能力清单，没有效果数据、对比案例、基准分数或成本节省数据。
- **把 Eigent 的「Zero Setup - No technical configuration required」当真**。这与后文要求 Node.js 18–22 + npm + `uv sync` 的实际步骤相互矛盾，应按后者准备环境。
- **把 Eigent 的 Quick Start 当成「本地部署」**。该模式会连接 Eigent 云端服务、需要注册账号，不是完全本地；要验证数据不出本机，必须走 `./server/README_EN.md` 的本地部署（本次材料未含该文档的具体命令）。
- **把 Eigent 的 Roadmap 当现有能力**。Context Engineering（Prompt caching、System prompt optimize、Toolkit docstring optimize、Context compression）、多 agent 固定工作流、多轮对话、Document Toolkit 动态编辑都是未完成项，不能算作已具备的能力。
- **拿 Eigent 的用例标题当验证依据**。用例库只有标题、一句描述和链接，没有耗时、成功率、人工介入比例；步骤在官网 guide 页面，不看就照做不了。
- **把 Eigent 当成 Claude Cowork / Codex 的已验证替代**。README 只说明定位相似，未提供任何对比数据、迁移路径或兼容性说明。
- **定时任务不生效**。nanobot 的定时投递要靠网关常驻，`nanobot gateway --background` 是唯一把它提升为持久后台模式的命令；关掉终端就等着收不到结果。
- **试用期就开放外网或高权限**。CowAgent README 明确说 Agent 能访问本机操作系统，只能在可信环境部署；服务器暴露控制台必须设 `web_password` 并限制端口。试用阶段就把实例锁在 localhost。
- **pip 报 `externally-managed-environment`**：改用一键安装器、`uv tool install nanobot-ai`、`pipx install nanobot-ai`，或装进虚拟环境。
- **`nanobot` 不在 PATH**：用 `uv tool run --from nanobot-ai nanobot ...` 或 `pipx run --spec nanobot-ai nanobot ...`。
- **拉完代码忘了同步依赖（Eigent）**：前端要在项目根目录 `npm install`，后端要 `cd backend && uv sync`，两步都做。
- **把作者自述当事实**。CowAgent 的 stars 数是仓库自报；「proactively plans」「self-evolution」「grows alongside you」「Agent Harness engineering 的参考实现」、记忆分层与 Deep Dream、知识库自动整理与知识图谱、Self-Evolution 的具体效果，全部是自述，没有案例或数据支撑。Eigent 的「boosts productivity」「exceptional productivity」「turn your most complex workflows into automated tasks」同样无任何量化。nanobot 的能力清单同样只是项目自述。
- **文档有缺口就卡住**。CowAgent 的 MCP 集成只有一句描述、没有 `mcp.json` 示例，技能创作只有「用对话生成」没有演示，需查官方文档页；Eigent 的本地部署命令在 `server/README_EN.md`、MCP / Skill 配置在 `docs.eigent.ai`、用例步骤在官网 guide，都不在 README 正文里；nanobot 的上下文与隐私用法（不同任务用不同 topic、Temporary chat 不写历史或长期记忆、一个 workbench 最多并排四个会话）分散在 README 里。
- **技能装不通就放弃**。退回用 `skill-creator` 生成一个最小技能，范围严格限定在「一件你每周都要重复做的小事」。
- **把所有任务塞进同一个会话**。nanobot 支持按 topic 分开任务，并用 Temporary chat 做临时对话（不写入历史或长期记忆）；混在一起会污染记忆检索，也会让「记忆是否有效」这项指标失效。

## 证据与来源

- **做法 A 的全部命令**（安装脚本、`uv tool install nanobot-ai`、`nanobot webui`、`nanobot gateway --background` 及管理命令、`nanobot --session/--workspace`、`nanobot -m`）：来自 HKUDS/nanobot 调研，均为 README 原文命令。该项目自述 MIT 协议、最新版本 v0.3.5，平台支持覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64（x64 要求 SSE4.2）。
- **做法 B 的全部命令**（run.sh / run.ps1 / docker compose、`cow` CLI、`/skill` 斜杠命令、`cow install-browser`、控制台端口 9899、`config.json` 的 `web_host`/`web_password`）：来自 zhayujie/CowAgent 调研，均为 README 原文。该调研给出可核事实：MIT 许可、仓库自报 47192 stars、版本序列到 v2.2.0（2026.09.30）；并引用原文的风险声明：Agent 模式 token 消耗显著多于普通对话、Agent 可访问本机操作系统只能在可信环境部署。
- **做法 C 的全部命令**（`git clone` + `npm install` + `npm run dev` 快速开始、前端 `npm install` / 后端 `uv sync` 的依赖同步）：来自 eigent-ai/eigent 调研，均为 README 原文。可核事实：Apache 2.0 许可、仓库约 15,457 stars、技术栈为 FastAPI + uv + Uvicorn + CAMEL 后端与 React + Electron + TypeScript + Tailwind/Radix 前端（流程编辑器用 React Flow）。「单 agent 适合聚焦任务 / Workforce 适合复杂多步并行」是 README 的划分，**没有给出选择规则**；「本地部署包含本地后端、本地模型集成 vLLM/Ollama/LM Studio、与云服务完全隔离、零外部依赖」是 README 的定位描述，**具体命令在未提供的 `server/README_EN.md`**；Automation 只有一句功能描述，**未给调度配置格式**；用例库只有标题 + 一句描述 + 链接，**步骤在官网 guide**。
- **最小闭环与判断指标**：「只配一个模型 + 一个技能 + 一个定时任务」「连续处理同类任务 5–10 次」「按时完成率 / 人工介入次数 / 耗时与返工 / token 成本 / 技能复用次数 / 记忆有效性」「1–2 周」「跑两周」「降级为 watch 的条件」，来自 nanobot 与 CowAgent 两份调研的结论与验证建议；「人工耗时对比 / 首次通过率 / 调度可靠性 / 数据边界 / 失败可诊断性」「先 Quick Start → 换本地模型验证数据边界 → 再试 Workforce → 最后试 Automation」「只有人工时间明显下降且返工比例可接受才纳入日常工作流」来自 Eigent 调研的验证建议。这些都是调研作者给出的自建方法，不是项目官方提供。
- **只是作者主张**：nanobot 的「小而可读」内核、Dream 长期记忆、多智能体委派的实际效果；CowAgent 的「proactively plans」「self-evolution」「grows alongside you」「Agent Harness engineering 的参考实现」、记忆分层与 Deep Dream 蒸馏、知识库自动整理、Self-Evolution 的具体效果；Eigent 的「boosts productivity」「exceptional productivity」「turn your most complex workflows into automated tasks」「Zero Setup」——均无案例、基准或第三方评测支撑，三份调研都明确标注为自述或矛盾表述。
- **项目间关系**：nanobot 的 `nanobot gateway` 自述对 OpenClaw 用户是熟悉的入口；CowAgent 的 Skill Hub 声明技能可用于 CowAgent、OpenClaw、Claude Code 等，两者技能格式互通、可共用技能资产；Eigent 只声明定位与 Claude Cowork / Codex 相似，无迁移或兼容性说明。三份调研都没有给出这些项目之间的直接对比测试，因此本手册不比较优劣，只按形态偏好与渠道需求选一个。

## 依据的调研

- [HKUDS/nanobot](../research/radar/2026-10-02/551-hkuds-nanobot.md)：值得一试，建议小范围试用：本地装好 nanobot、接一个模型，把一件周期性重复的工作配成 automation 跑两周，再用“定时投递成功率 + 人工返工时间”判断是否值得纳入日常工作流；理由是 README 给出了完整可复制的安装、首次配置、常驻网关和定时任务步骤，但没有任何效果数据或对比案例支撑。
- [zhayujie/CowAgent](../research/radar/2026-10-02/552-zhayujie-cowagent.md)：值得一试，建议小范围试：在可信的本地/服务器环境用原文给出的一行命令部署 CowAgent，跑通“一个模型 + 一个技能 + 一个定时任务”的最小闭环，再决定是否扩用；理由是原文提供了可直接复制的安装、cow CLI、技能安装与 MCP/调度/多模型路由的配置骨架，但完全没有具体工作场景的流程、提示词或效果数据，且 Agent 模式成本高、有本地系统权限风险。
- [eigent-ai/eigent](../research/radar/2026-10-02/577-eigent-ai-eigent.md)：值得一试，建议小范围试：按 README 给出的命令把 Eigent 桌面端跑起来，先在一个周期性、输入输出明确的任务（如每月汇总 PR 生成报告）上验证「多 agent 并行 + 定时自动化」是否真能减少人工；理由是原文给了可照做的安装与更新命令、明确的单 agent/多 agent 分工和本地部署选项，但完全没有给效果数据，所以不能直接 adopt。
