# 把周期性重复的工作交给常驻 agent：先跑两周再决定留不留

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在没有现成效果数据的情况下，怎样小范围试出一个常驻 AI agent 是否真能接管你周期性重复的工作，而不是只把它装好就以为变好了。
> 先试这一步：在一台可信的机器上用 Docker 或一键脚本起一个本地实例（只开本地访问），只接一个 Chat 模型、只配一个定时任务，连续跑两周，同时记录按时投递成功率和你的返工时间。
> 最近修订：2026-10-02

## 解决什么问题

周期性重复的工作——按固定时间汇总某个信息源、每周重复读同一批文件、跑同一批命令、查同一类网页——看起来很适合交给一个常驻的本地/服务器端 AI agent。但这类项目的 README 只给安装和配置步骤，不给效果数据、对比案例或评估方法。这份手册给出一条可执行的试跑路径：本地起一个实例 → 只接一个模型 → 配一个定时任务 → 跑两周 → 用「按时投递成功率 + 人工返工时间 + token 成本」决定它是否进入你的日常工作流。

## 适用与不适用

**适用**

- 你手上有明确的周期性重复工作，形态落在「读文件 / 跑命令 / 查网 / 按计划重复 / 拆给多个子代理」里。
- 有一台可联网、且你信得过的 Linux / macOS / Windows 机器或服务器。
- 至少有一个模型厂商的 API key（成本自担）。
- 能接受先花 1–2 周观察期，而不是马上全量切换。

**不适用**

- 没有重复性工作，只是想试个新工具。
- 必须部署在不受信任的环境——CowAgent 的 README 明确说 Agent 能访问本机操作系统，只能在可信环境部署。
- 承担不了 token 成本——同一份 README 明确警告 Agent 模式消耗显著多于普通对话。
- 期待有现成效果数据可抄——两份调研都指出原文没有任何效果数据、对比案例或指标。

## 前置条件

- **用 nanobot**：Python 3.11 或更新；源码安装额外需要 Git 和 Bun。平台 wheel 同时含 WebUI 和原生终端 UI，覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64（x64 运行时要求 SSE4.2）；其他平台用 `nanobot --classic` 或 WebUI。
- **用 CowAgent**：一台可联网的 Linux / macOS / Windows 机器或服务器；至少一个模型厂商的 API key，在 Web console 里配置，不需要手改文件。
- **常驻前提**：nanobot 的定时投递要生效，网关必须一直运行；CowAgent 本身定位就是可 7×24 跑在个人电脑或服务器上。
- **试用期约定**：Docker 优先（便于清理），只开本地访问，先不要把控制台暴露到外网。

## 操作步骤

### 第 1 步：先选一种做法，别同时上两个

A 和 B 属于同一类「长驻个人 / 服务器端 agent harness」，能力清单高度重叠（本地文件与 shell、网页搜索与抓取、MCP 工具、cron/调度、长期记忆、子代理委派、多模型路由）。区别只在侧重，且这些侧重全部来自各自的 README 自述，没有第三方对比：

- 想接主流 IM 渠道（微信、飞书、钉钉、企微、QQ、公众号、Telegram、Slack、Discord 等）、想用现成技能市场、想要对话式技能生成 → **做法 B：CowAgent**。
- 想要更小的内核、WebUI + 终端 workbench、OpenAI 兼容 API / Python SDK、可自托管的 Python 包 → **做法 A：nanobot**。
- 如果团队里已经在用 OpenClaw 一类做法：nanobot 的 `nanobot gateway` 被作者描述为「从 OpenClaw 过来、把 agent 当长驻服务跑的人熟悉的入口」；CowAgent 的 Skill Hub 声明技能格式与 OpenClaw、Claude Code 互通，可共用同一套技能资产。

任选其一即可。同时开两个，两周后你分不清是哪个在起作用。

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

### 第 4 步：无论 A 还是 B，都收敛到同一个最小闭环

这一步是整篇手册的核心，两份调研给出的建议一致：

1. **实例只开本地访问**。Docker 优先；先不要把控制台暴露到外网（CowAgent 调研的建议就是先不要把 `web_host` 设为 `0.0.0.0`）。
2. **只配一个 Chat 模型**，不接多渠道，先把「模型能用」这一步单独确认掉。
3. **只装 / 建一个技能或工具，范围严格限定在「一件你每周都要重复做的小事」**。装不到合适技能，就退回让 agent 用对话生成一个最小技能。
4. **建一个定时任务**，例如固定时间汇总某个信息源并推送，观察它能否在无人干预下完成（nanobot 用 Automations / Tasks，前提是网关常驻；CowAgent 用内置 `scheduler`，在 Web console 里管理）。
5. **让它连续处理同一类任务 5–10 次**，每次都检查两件事：一是任务是否完成，二是后续对话里它是否自动检索到了之前的记忆 / 知识，而不需要你重新交代背景。
6. **从第一次运行就开始记录指标**（见下一节）。否则两周后你只有印象，没有依据。

预期结果：两周内你拿到一组自己的数字，而不是一份 README 的承诺。

## 怎么判断变好了

两份调研都没有给出官方指标，下面这套是「调研作者建议 + 你需要自建基线」的组合。

**可观察的指标**

- **定时任务按时完成率**，以及需要你人工介入的次数（按次记录）。
- **单次任务的实际耗时与返工次数**，对比「你自己做」或「用普通对话式 AI 做」的基线。
- **Token 成本**：算清每完成一件任务花多少钱。CowAgent README 明确警告 Agent 模式消耗显著多于普通对话，这是最容易失控的一项。
- **技能复用次数**：同一个技能被稳定调用多少次；如果一周内没有被重复调用，说明它没有固化成产能。
- **记忆有效性**：随机抽查后续会话，看它是否引用了正确的历史结论，而不是要你重新交代背景。

**注意区分「可观测」和「有效果」**：nanobot 的 WebUI 可以展开查看推理过程、工具调用、文件改动、差分、命令输出和产出物，输入区的上下文指示器显示上下文大小、每轮输入 token 和 provider 上报的缓存复用，还有上下文压缩（compaction）时间线，配置里可接 Langfuse；CowAgent 有上下文用量可视化、`/compact` 上下文压缩、模型缓存命中率提升。这些说明「用了多少」，不说明「是否改善」，不能拿来当效果证据。

**最小试用方式**：单机 Docker 优先，只开本地访问，只配一个 Chat 模型，装 1 个技能，建 1 个定时任务，连续跑 5–10 次同类任务。

**试多久**：nanobot 调研建议把这件周期性工作配成 automation 跑两周；CowAgent 调研建议 1–2 周。取两周作为默认观察期。

**降级 / 放弃条件**（出现任一即可停）：一周内跑不出任何可复用的稳定产出；或 token 成本明显高于人工 / 普通对话方案；或必须开放外网与高权限才能用。出现任一情况，把项目从 try 降为 watch，只在观察清单里跟踪。

## 常见坑

- **把「装好了、能回复」当成「工作变好了」**。两份调研都明确指出原文只有安装与能力清单，没有效果数据、对比案例、基准分数或成本节省数据。
- **定时任务不生效**。nanobot 的定时投递要靠网关常驻，`nanobot gateway --background` 是唯一把它提升为持久后台模式的命令；关掉终端就等着收不到结果。
- **试用期就开放外网或高权限**。CowAgent README 明确说 Agent 能访问本机操作系统，只能在可信环境部署；服务器暴露控制台必须设 `web_password` 并限制端口。试用阶段就把实例锁在 localhost。
- **pip 报 `externally-managed-environment`**：改用一键安装器、`uv tool install nanobot-ai`、`pipx install nanobot-ai`，或装进虚拟环境。
- **`nanobot` 不在 PATH**：用 `uv tool run --from nanobot-ai nanobot ...` 或 `pipx run --spec nanobot-ai nanobot ...`。
- **把作者自述当事实**。CowAgent 的 stars 数是仓库自报；「proactively plans」「self-evolution」「grows alongside you」「Agent Harness engineering 的参考实现」、记忆分层与 Deep Dream、知识库自动整理与知识图谱、Self-Evolution 的具体效果，全部是自述，没有案例或数据支撑。nanobot 的能力清单同样只是项目自述。
- **文档有缺口就卡住**。CowAgent 的 MCP 集成只有一句描述、没有 `mcp.json` 示例，技能创作只有「用对话生成」没有演示，需查官方文档页；nanobot 的上下文与隐私用法（不同任务用不同 topic、Temporary chat 不写历史或长期记忆、一个 workbench 最多并排四个会话）分散在 README 里。
- **技能装不通就放弃**。退回用 `skill-creator` 生成一个最小技能，范围严格限定在「一件你每周都要重复做的小事」。
- **把所有任务塞进同一个会话**。nanobot 支持按 topic 分开任务，并用 Temporary chat 做临时对话（不写入历史或长期记忆）；混在一起会污染记忆检索，也会让「记忆是否有效」这项指标失效。

## 证据与来源

- **做法 A 的全部命令**（安装脚本、`uv tool install nanobot-ai`、`nanobot webui`、`nanobot gateway --background` 及管理命令、`nanobot --session/--workspace`、`nanobot -m`）：来自 HKUDS/nanobot 调研，均为 README 原文命令。该项目自述 MIT 协议、最新版本 v0.3.5，平台支持覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64（x64 要求 SSE4.2）。
- **做法 B 的全部命令**（run.sh / run.ps1 / docker compose、`cow` CLI、`/skill` 斜杠命令、`cow install-browser`、控制台端口 9899、`config.json` 的 `web_host`/`web_password`）：来自 zhayujie/CowAgent 调研，均为 README 原文。该调研给出可核事实：MIT 许可、仓库自报 47192 stars、版本序列到 v2.2.0（2026.09.30）；并引用原文的风险声明：Agent 模式 token 消耗显著多于普通对话、Agent 可访问本机操作系统只能在可信环境部署。
- **最小闭环与判断指标**：「只配一个模型 + 一个技能 + 一个定时任务」「连续处理同类任务 5–10 次」「按时完成率 / 人工介入次数 / 耗时与返工 / token 成本 / 技能复用次数 / 记忆有效性」「1–2 周」「跑两周」「降级为 watch 的条件」，全部来自两份调研的结论与验证建议，是调研作者给出的自建方法，不是项目官方提供。
- **只是作者主张**：nanobot 的「小而可读」内核、Dream 长期记忆、多智能体委派的实际效果；CowAgent 的「proactively plans」「self-evolution」「grows alongside you」「Agent Harness engineering 的参考实现」、记忆分层与 Deep Dream 蒸馏、知识库自动整理、Self-Evolution 的具体效果——均无案例、基准或第三方评测支撑，两份调研都明确标注为自述。
- **两者关系**：nanobot 的 `nanobot gateway` 自述对 OpenClaw 用户是熟悉的入口；CowAgent 的 Skill Hub 声明技能可用于 CowAgent、OpenClaw、Claude Code 等，两者技能格式互通、可共用技能资产。两份调研都没有给出这两个项目的直接对比测试，因此本手册不比较优劣，只按渠道需求与形态偏好二选一。

## 依据的调研

- [HKUDS/nanobot](../research/radar/2026-10-02/551-hkuds-nanobot.md)：值得一试，建议小范围试用：本地装好 nanobot、接一个模型，把一件周期性重复的工作配成 automation 跑两周，再用“定时投递成功率 + 人工返工时间”判断是否值得纳入日常工作流；理由是 README 给出了完整可复制的安装、首次配置、常驻网关和定时任务步骤，但没有任何效果数据或对比案例支撑。
- [zhayujie/CowAgent](../research/radar/2026-10-02/552-zhayujie-cowagent.md)：值得一试，建议小范围试：在可信的本地/服务器环境用原文给出的一行命令部署 CowAgent，跑通“一个模型 + 一个技能 + 一个定时任务”的最小闭环，再决定是否扩用；理由是原文提供了可直接复制的安装、cow CLI、技能安装与 MCP/调度/多模型路由的配置骨架，但完全没有具体工作场景的流程、提示词或效果数据，且 Agent 模式成本高、有本地系统权限风险。
