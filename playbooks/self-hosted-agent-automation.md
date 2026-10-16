# 把周期性重复工作交给常驻 AI 队友：从安装到两周验收

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：面对周期性重复工作，如何选一条本地/托管 agent 路线，只接一个模型、一个技能、一个定时任务，用两周指标判断它是否值得纳入日常工作流。
> 先试这一步：今天先选一条路线（如做法 H 的 touri，或 A–G 任一），只配一个模型和一个定时任务，手动触发一次并记录结果。
> 最近修订：2026-10-16

## 解决什么问题

周期性重复的工作——按固定时间汇总某个信息源、每周重复读同一批文件、跑同一批命令、查同一类网页——看起来很适合交给一个常驻的本地/服务器端 AI agent、一个桌面端的多 agent 应用，或者一个跑在模型厂商基础设施上的托管定时 agent。但这类项目的 README 只给安装和配置步骤，不给效果数据、对比案例或评估方法。

这份手册给出一条可执行的试跑路径：起一个实例 → 只接一个模型 → 配一个定时任务 → 跑两周 → 用「按时投递成功率 + 人工返工时间 + token 成本」决定它是否进入你的日常工作流。八条路线（A nanobot / B CowAgent / C Eigent / D NanoClaw / E Comma / F Claude Managed Agents / G Claude Code + instagram-research-tool / H touri）共用同一套判断标准，选一条走完即可。

其中几条不是同一层东西：Comma 不是又一个编码 agent，而是上层编排 + 持久 Task 状态 + 事件/时间触发 + 权限边界，它把 Codex、Claude Code 这类已有 agent 当应用调用，或注册为 Worker / Sub-agent；Claude Managed Agents（做法 F）不是自托管 harness，而是把 agent 跑在 Anthropic 基础设施上，你本机不需要常驻任何进程，代价是依赖一个处于 beta 的托管平台，且信息源与凭据要按它的 vault 机制放；做法 G 不是长驻 harness 也不是托管平台，而是「系统定时器 + 一次性 `claude -p` 命令」唤醒你本机已有的 Claude Code，状态落在它自己 clone 下来的仓库文件里；做法 H 的 touri 是 local-first 的 macOS 桌面应用，把 Codex、Claude Code、OpenCode 这类 CLI 变成常驻 bot，用 cron routines 触发，凭据放 macOS Keychain，数据默认留在本机 SQLite。如果你只是想要一个编码 agent，沿用原来的四条路线更直接。

## 适用与不适用

**适用**

- 你手上有明确的周期性重复工作，形态落在「读文件 / 跑命令 / 查网 / 按计划重复 / 拆给多个子代理 / 盯收件箱或仓库的事件」里。
- 有一台可联网、且你信得过的 Linux / macOS / Windows 机器或服务器；如果你想试 Eigent，还需要桌面环境；如果你想试 NanoClaw，需要 macOS 或 Linux（Windows 走 WSL2）以及 Docker；如果你想试 Comma 的自建实例，需要 Docker Engine + Compose v2.24 以上，以及足够磁盘容纳构建层；如果你想试做法 F，本机只要有 Claude Code 即可，运行本身不占本机资源；如果你想试做法 G，本机要有 Claude Code 和 Node.js 18+，macOS / Linux 均可（iPhone / Mac 只对分享按钮必需）；如果你想试做法 H 的 touri，需要 macOS 14 或更新版本、Apple Silicon，且本机已安装并登录 Codex 或 Claude Code CLI。
- 至少有一个模型厂商的 API key，或者能在本机跑起一个本地推理服务（Eigent 支持 Ollama / vLLM / LM Studio 一类；NanoClaw 可以通过 `/add-ollama-provider` 接本地开源权重模型；Comma 自带模型即 BYO API key，或使用 ChatGPT / Claude 套餐，也可登录后在 Settings 里配私有模型）；做法 F 需要一个 Claude API workspace；做法 G 复用的是你已经在用的 Claude Code；做法 H 复用的是你已登录的 Codex 或 Claude Code CLI。
- 想先拿到「可复制的目录结构 + 配置 + 失败模式清单」再动手——六条路线里只有做法 F 的调研给出了参考实现的完整文件结构和规则清单；做法 G 同样给了一套可照抄的 skill 套装、`config.json` 字段表和日常命令表，是第二条「有结构可抄」的路线，但它的截图是合成样本，不是实测产出；做法 H 的 touri 给了一整套构建、验证、导入与 sidecar/MCP 命令，但 README 没有展开 UI 新建 bot、routine 调度配置与 overlap/catch-up 参数。
- 你的重复工作不是「读文件 / 跑命令 / 查网」这类通用形态，而是「盯一个内容源、按固定标准筛出异常、产出可读报告」——做法 G 给了一个完整实例；做法 H 的 touri 更适合把已有 Codex / Claude Code CLI 变成常驻 bot，用 routines 跑低风险重复任务。
- 能接受先花 1–2 周观察期，而不是马上全量切换。

**不适用**

- 没有重复性工作，只是想试个新工具。
- 必须部署在不受信任的环境——CowAgent 的 README 明确说 Agent 能访问本机操作系统，只能在可信环境部署。
- 承担不了 token 成本——同一份 README 明确警告 Agent 模式消耗显著多于普通对话。做法 F 的 `deployment.md` 里有一个 budget 字段，但原文没给成本上限的配置方式和数值。
- 期待有现成效果数据可抄——八份调研都指出各自原文没有任何效果数据、对比案例或指标（Eigent 只有 stars 数，NanoClaw 的 30866 stars 同理，Comma 的 172 stars 和运行时形式化验证同样不构成任务效果证据；做法 F 只有一套参考实现，没有成功率或成本对比；做法 G 只有 31 stars，README 截图明确标注为合成样本；做法 H 只有 35 stars，功能声明无截图、演示、案例或效果数据）。
- 不愿意为数据源付费、又需要完整的每日雷达——做法 G 的每日搜索要用 Sandcastles（付费计划起 $49/月）或 Apify（有每月 $5 免费额度，一次完整每日搜索约 $1.70，每条 reel 不到 1 美分）；免费路线 yt-dlp 只支持单条公开链接，且 IG 通常拿不到播放量、还可能被拦截。
- 不接受让工具的状态落在一个 clone 下来的仓库里、并由 Claude Code 在该目录内执行——做法 G 的供给物就是仓库文件：`config.json`、`niche.json`、`voice.md`、`inbox.txt`，凭证放 `.env`。
- 不想动代码：NanoClaw 的定制哲学是「Customization = code changes」，README 也承认主干只接受安全修复、bug 修复和明确改进，其余一律以 skill 形式自带，不想改代码的人上手成本高。
- 不想维护重栈：Comma 的运行时主要为 Elixir/OTP，关键系统组件用 Lean，核心分布式协议用 TLA+ 模型检查；首次构建会下载 Lean、Elixir、Go、Node 等公共工具链。如果你不打算长期维护这套栈，别把它当首选。
- 需要 Comma 的会议（Meetings）或 Agent VMM host——这两者需要的运行时**不包含在本仓库内**。
- 不能接受 beta 阶段的托管平台，或不愿意把信息源与凭据交给模型厂商的托管环境——做法 F 的凭据存在 vault 里、由平台在请求离开沙箱时注入，这套机制本身就是托管平台的一部分。
- 需要照着一份完整命令走到底——做法 F 的调研原文在「部署」一节被截断，没有可照抄的部署命令；做法 G 的 cron / launchd 具体写法在 `docs/iphone-shortcut.md`，本次材料也没包含该文档正文；做法 H 的 touri README 没有说明在 UI 里如何新建 bot、如何写 routine 的调度配置、overlap 与 catch-up 的具体参数怎么填。
- 用 Windows / Linux：做法 H 的 touri 仅 macOS、仅 Apple Silicon，其他平台完全用不上。
- 企业环境禁止绕过 Gatekeeper：touri 的 Release 构建目前未签名、未公证，首次启动必须手动绕过。
- 需要 bot-machine（隔离 Linux VM）开箱可用：touri 要求 macOS 26 与 Apple `container` >= 1.5.0；低于此版本本机 bot 仍可用，machine 功能会自报为不可用。

## 前置条件

- **用 nanobot**：Python 3.11 或更新；源码安装额外需要 Git 和 Bun。平台 wheel 同时含 WebUI 和原生终端 UI，覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64（x64 运行时要求 SSE4.2）；其他平台用 `nanobot --classic` 或 WebUI。
- **用 CowAgent**：一台可联网的 Linux / macOS / Windows 机器或服务器；至少一个模型厂商的 API key，在 Web console 里配置，不需要手改文件。
- **用 Eigent**：桌面环境；快速开始模式需要 Node.js 18–22 和 npm；后端 Python 依赖用 uv 管理。**本地部署与 MCP / Skill 配置的具体命令不在 README 正文里**——本地部署看 `./server/README_EN.md`，工具与能力配置看 `https://docs.eigent.ai`，本次材料未包含这两部分内容。
- **用 NanoClaw**：macOS 或 Linux（Windows 走 WSL2）；Node.js 22+ 与 pnpm 10+（缺失时安装脚本会装）；Docker Desktop（macOS/Windows）或 Docker Engine（Linux）；**Claude Code**——它负责 `/customize`、`/debug`、安装出错时的恢复，以及所有 `/add-<channel>` skill；另外需要 Anthropic 凭据（或改用其他 provider）。
- **用 Comma**：自建实例需要 Docker Engine + Compose v2.24 或更高、足够磁盘容纳构建层、一个可用的模型服务商账号（默认栈**不含** mock 模型，不配就没有真实模型调用）；不需要 Comma 账号，也不需要私有仓库 token。本地开发模式需要 pnpm（先跑一次 `pnpm install`）。要让它操作你自己的电脑，需要连接这台机器（Salix），并在设备设置里手动连接；群组云电脑需要 Cloudflare 配置。
- **用 Claude Managed Agents（做法 F）**：一个 Claude API workspace（Managed Agents 处于 beta）；已安装 Claude Code，并能跑 `claude-api` skill；一个 Slack app（按文中提供的 manifest 创建）和一个 GitHub token。凭据按源分别放进 vault（GitHub 走 MCP 由沙箱外 proxy 调用，Slack 走沙箱内 bash + curl），不写进 agent 配置。
- **用 Claude Code + skill 套装（做法 G）**：已安装 Claude Code；Node.js 18+（README 说 npm 零依赖，不需要 `npm install`）；至少一个数据源（Sandcastles MCP / Apify / yt-dlp / 任意自带源）；数据源凭证放 `.env`（例如 Apify token），不要提交。可选：ffmpeg（逐帧拆解用）、Whisper（无源字幕时转写，如 `pipx install openai-whisper`）、iPhone（分享按钮，只对这一步必需）。
- **用 touri（做法 H）**：macOS 14 或更新版本、Apple Silicon；本机已安装并登录 Codex 或 Claude Code CLI；若要用可选的 bot-machine（隔离 VM）功能，需要 macOS 26 与 Apple `container` >= 1.5.0，低于此版本本机 bot 仍可用，machine 功能会自报为不可用。源码构建需要 Bun 1.2.21 或更新、Rust 1.90 或更新并带 `aarch64-apple-darwin` target。Release 构建目前未签名、未公证，首次启动会被 Gatekeeper 拦截。
- **常驻前提**：nanobot 的定时投递要生效，网关必须一直运行；CowAgent 本身定位就是可 7×24 跑在个人电脑或服务器上；Eigent 的 Automation 定位是「人离开时任务继续跑」，但前提是应用/服务在跑；NanoClaw 是「Node 宿主进程 + 每个 agent group 一个 Docker 容器」，只要宿主和容器在跑，定时任务就由宿主唤醒；Comma 的 Task 被自动转成独立的 agent loop，只要实例在跑就继续 plan → execute → review → verify；做法 F 不需要本机常驻进程，排期由托管平台执行；做法 G 也不需要常驻网关或常驻容器——自动化是 cron / launchd 定时调用一次性 `claude -p` 命令，材料里没有提到要常驻任何进程；做法 H 的 touri 是桌面应用，bot 和 routines 的常驻取决于应用与 sidecar 是否在运行。
- **试用期约定**：Docker 优先（便于清理），只开本地访问，先不要把控制台暴露到外网。注意例外：**Eigent 的快速开始模式会连接 Eigent 云端服务、需要注册账号，不是完全本地**；如果你的目标是「数据不出本机」，别把 Quick Start 当成最终形态。NanoClaw 的安装默认在本地构建镜像、不联网、不需要账号，但**匿名安装诊断默认开启**，可用 `NANOCLAW_NO_DIAGNOSTICS=1` 关闭；可选账号只用于拉取预构建加固镜像和托管 Slack app（会看到你的邮箱和拉取时间）。Comma 自建实例首次启动会生成持久密钥并初始化空存储，默认所有公开端口只绑定 loopback，这正好适合试用期。做法 F 对应的是 `environment.yaml` 里的网络 allowlist：只放这个 brief 真正需要访问的主机。做法 G 对应的是：工具声明从不登录 Instagram、不用 cookies 或 session、不用你的账号抓取；下载的视频仅本地分析、不得重发；"My version" 保存前会检查抄袭短语。做法 H 对应的是：数据存在 `~/Library/Application Support/touri` 下的 SQLite，无遥测、无需账号；凭据放在 macOS Keychain，不进数据库、日志或导出；可选云托管是单独 opt-in 协议（`docs/protocol/cloud-v1.md`）。

## 操作步骤

### 第 1 步：先选一种做法，别同时上多个

A、B、C、D、E 属于同一类「长驻 / 桌面 / 编排 agent harness」，能力清单高度重叠（本地文件与 shell、网页搜索与抓取、MCP 工具、cron/调度、长期记忆、子代理委派、多模型路由）。区别只在形态与侧重，且这些侧重全部来自各自的 README 自述，没有第三方对比测试，也没有效果数据。F 是托管执行、本机不留进程。G 是第三种形态：由系统定时器唤醒一次性 Claude Code 会话，复用你本机已有的 Claude Code，分析全部在本地做，状态落在仓库文件里。H 是第四种形态：local-first 的 macOS 桌面应用，把 Codex / Claude Code CLI 变成常驻 bot，用 cron routines 触发，凭据放 Keychain，数据默认本机 SQLite。

- 想接主流 IM 渠道（微信、飞书、钉钉、企微、QQ、公众号、Telegram、Slack、Discord 等）、想用现成技能市场、想要对话式技能生成 → **做法 B：CowAgent**。
- 想要更小的内核、WebUI + 终端 workbench、OpenAI 兼容 API / Python SDK、可自托管的 Python 包 → **做法 A：nanobot**。
- 想要桌面图形界面、要在一个任务里并行跑多个 agent 分工、要接本地推理模型让数据不出本机、要内置浏览器与终端工具包 → **做法 C：Eigent**。
- 想要容器级文件系统隔离（容器只挂载你显式允许的目录）、不想让 agent 持有原始 API key（出站请求经凭据网关在请求时注入，支持按 agent 的策略和限流）、想按频道选择「各自独立 agent / 共享一个 agent / 折叠成单一共享会话」、且能接受「定制即改代码」→ **做法 D：NanoClaw**。它原生跑 Anthropic 官方 Claude Agent SDK，等于 Claude Code 的容器化 + 常驻化外壳，所以 Claude Code 必须在手边；换后端可以装 `/add-codex`、`/add-opencode`、`/add-ollama-provider`，provider 粒度是 per agent group。
- 想要「会话只是界面、Task 才是持久执行状态」，想让已有的 Codex / Claude Code 被当成应用调用或注册为 Worker / Sub-agent，想让 agent 自己写一个小 Loop 去盯收件箱 / 仓库 / 信息流、只在有事时才唤醒主 agent，能接受自建一整套栈（Docker Compose，默认五个界面端口）→ **做法 E：Comma**。它和 NanoClaw 的区别值得先说清：NanoClaw 是「给 Claude Code 套一个容器化常驻外壳」，Comma 是「在上层编排多个已有 agent，并把 Task 变成跨设备、跨对话、跨界面延续的持久状态」；两者可以并存，Comma 调研原文也把 Claude Code 列为它可调用的对象之一。
- 想跑在厂商托管的基础设施上、本机不留常驻进程、已经在用 Claude Code 和 Anthropic API、且能接受 beta 和托管平台的边界 → **做法 F：Claude Managed Agents 的 daily-brief 参考实现**。它的价值不在能力清单，而在给出了一套可直接复制的目录结构、配置文件和失败模式规则（bookmark、漏读上报、幂等记账），是八条路线里唯一把「怎么不悄悄出错」写进配置的；但它强依赖 Anthropic 托管平台，幂等性、漏读上报和成本上限都要自己实测。
- 已经在用 Claude Code、要盯的是一个内容源（社交 / 媒体），想要「拆解流程 + inbox + 每日雷达 + 用自己语气重写」这套可迁移骨架，且能接受付费数据源 → **做法 G：Claude Code + instagram-research-tool**。它的关键设计是职责分离：数据源只负责取原始事实（数字、caption、视频），**所有分析由 Claude Code 自己做**，所以换数据源不影响拆解质量。工具以 Claude Code skill 形式组织（`.claude/skills/reel-research`、`outliers`、`research-setup`），用斜杠命令触发；自动化靠 cron / launchd 调 `claude -p`，不需要常驻网关。它和做法 F 的区别：F 跑在托管平台上、用配置文件定义 agent 和排期；G 跑在你本机的 Claude Code 里、用仓库文件定义数据源、口径和语气。
- 你在 macOS 14+ Apple Silicon 上，已登录 Codex 或 Claude Code CLI，想把这些 CLI 变成常驻的 AI 队友（bot），要 cron 调度的 routines、按风险选的审批模式、逐线程 MCP token、可选的隔离 Linux VM，且能接受未签名 Release、README 未展开 UI 配置细节 → **做法 H：touri**。它把 Claude Code CLI 作为 runtime 接入，并在其上加常驻 bot、记忆、routines、逐线程 MCP token 与 VM 隔离；两者是叠加关系，不是替代。OpenCode 在 README 正文标题与 Features 里依据较弱，先别把它当成已支持。
- 如果团队里已经在用 OpenClaw 一类做法：nanobot 的 `nanobot gateway` 被作者描述为「从 OpenClaw 过来、把 agent 当长驻服务跑的人熟悉的入口」；CowAgent 的 Skill Hub 声明技能格式与 OpenClaw、Claude Code 互通，可共用同一套技能资产；NanoClaw 则反过来把 OpenClaw 当对比对象——README 自述对方近 50 万行代码、53 个配置文件、70+ 依赖、应用层权限校验、单 Node 进程共享内存，自己定位为「同样核心功能、但代码小到能读懂 + 容器隔离」，这些数字全部是作者主张、原文无法核实；Eigent 只声明定位与 Claude Cowork / Codex 相似，没有给对比数据、迁移路径或兼容性说明，不能当作已验证的替代方案。Comma 的调研没有提到 OpenClaw。touri 的调研没有提到 OpenClaw。

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

### 第 6 步（做法 E）：部署 Comma 并跑通一个长周期任务

前提：想零成本先跑通链路，用 E-1；想跑真实模型，用 E-2。两条路都不要在同一台机器上同时开。

**E-1 本地开发模式**（确定性 mock 模型，不需要 API key，最适合做最小验证）：

```sh
pnpm install
make dev
```

预期结果：本地后端与 Web 客户端启动，使用确定性 mock 模型。用 `comma-local@example.com` 登录，登录码在 Mailpit `http://127.0.0.1:8025` 读取。Mac app 用 `make dev-electron`。在仓库根目录还可以跑三组测试：

```sh
make test-clients
make test-systems
make test-policy
```

这一步的作用是先把「装得上、登录得了、界面能开」和「模型调用是否正常」两件事拆开——mock 模型下不存在 provider 配置问题。

**E-2 自建单机实例（Docker Compose）**：

1. 复制示例配置：

   ```sh
   cp .env.example .env
   ```

2. 把 `COMMA_OWNER_EMAIL` 设成你自己的邮箱——这个账号拿到 Admin 权限。
3. 在 `.env` 里设置模型服务商；或者跳过这步，登录后在 Settings 里配置私有模型。
4. 构建并启动整个栈：

   ```sh
   docker compose up -d --build
   ```

5. 打开 `http://localhost:8080`，用你的邮箱请求登录码。
6. 在本地收件箱 `http://localhost:8025` 读取登录码。

首次启动会生成持久密钥并初始化空存储；默认所有公开端口只绑定 loopback。

**E-3 环境变量（`.env`）**：

| 变量 | 用途 |
|---|---|
| `COMMA_OWNER_EMAIL` | 第一个 owner 账号和 Admin 权限 |
| `COMMA_ALLOW_SIGNUP` | 公开注册，默认关闭 |
| `COMMA_LLM_BASE_URL` | 模型服务商端点 |
| `COMMA_LLM_PROTOCOL` | 服务商协议，如 `chat_completions` |
| `COMMA_LLM_MODEL` | 服务商模型 ID |
| `COMMA_LLM_API_KEY` | 服务商凭据 |
| `COMMA_LLM_CONTEXT_TOKENS` | 模型上下文预算 |
| `COMMA_LLM_MAX_TOKENS` | 输出 token 上限 |
| `COMMA_EXA_API_KEY` | 可选，Exa 的 key，用于网页搜索和读页 |
| `COMMA_SMTP_*` | 登录码邮件服务器 |
| `COMMA_PUBLIC_URL`、`COMMA_API_URL`、`COMMA_ADMIN_URL`、`COMMA_SALIX_URL` | 浏览器 origin |

模型调用走你自己的服务商账号，可能产生服务商费用；自建实例不需要 Stripe 或 Comma credits。

**E-4 各界面默认地址**：

| 界面 | 默认地址 |
|---|---|
| Comma Web | `http://localhost:8080` |
| Comma Admin | `http://localhost:8082` |
| Comma Product API | `http://localhost:8081` |
| Salix dashboard | `http://localhost:4000/dash` |
| Local inbox | `http://localhost:8025` |

**E-5 对外暴露（试用阶段先别做）**：需要公开时，把 Comma 放在你自己的 HTTPS 反向代理后面；Web、Admin、Product API 必须是同一可注册域名下的不同 origin，例如 `app.example.com`、`admin.example.com`、`api.example.com`；换用真实 SMTP 服务器，本地收件箱只能用于 loopback，因为能读到它的人就能用里面的登录码。

**E-6 升级与备份**（原文给出的硬性操作要求）：升级前先停栈；一起备份全部五个 named volume：`config`、`postgres`、`objects`、`clickhouse`、`redis`。其中 `config` 卷保存加密密钥和认证密钥，**不要删除、不要重新生成它的密钥**。`docker compose down` 会保留数据；除非确实要删掉实例，否则不要加 `-v`。公开部署、升级或恢复前先读 `systems/DEPLOYMENT.md#self-hosted-compose`。

**E-7 让它操作你自己的电脑**：在设备设置里连接这台电脑；需要改文件、跑命令、把活转交给 Codex / Claude Code / Pi / Kimi 时，必须打开 **Allow operations**。群组云电脑需要 Cloudflare 配置；会议（Meetings）和 Agent VMM host 需要的运行时**不包含在本仓库内**。试用期建议先不开这个总开关。

**E-8 交给它一个真实的长周期任务**：把一件周期性重复、输入输出边界清楚的工作交给它的 Task + Loop 机制，跑一两周。三种触发方式对应三类活儿：

- **Task**：请求自动转成独立 agent loop，持续 plan → execute → review → verify，直到目标完成，并自行判断 Task 何时算完成；需要你决策时 Task 停在 Needs Review。
- **Routines**（时间触发）：按设定时间给你简报。
- **Loops**（事件触发）：agent 自己写的小程序，盯收件箱、仓库或信息流，只在有事时才唤醒 agent——安静的一小时不消耗大模型 token。

预期结果：任务在看板四态 Backlog / In progress / Needs Review / Done 之间推进，你能随时看到它卡在哪、需要你做什么决定。注意一个已知行为：**被中断的写操作不会自动重跑**。

### 第 7 步（做法 F）：用 Claude Managed Agents 搭一个每日 brief

前提：一个 Claude API workspace（Managed Agents 处于 beta）；已安装 Claude Code 并能跑 `claude-api` skill；一个 Slack app（按文中提供的 manifest 创建）和一个 GitHub token。先按「单一来源 + 单一收件人 + 每日一次」的最小场景起步。

**F-1 更新 Claude Code。**

```shell
claude update
```

**F-2 用 claude-api skill 一键起步**（最省事的入口）：

```
/claude-api managed-agents-onboard https://claude.dev/blog/building-effective-agent-automations/
```

预期结果：该 skill 会读这篇文章、提出一个方案、把文件写到项目里的 `agents/` 目录，并用 `ant apply` 创建资源。文中明确提示：把这当成起点，再按自己的来源 / 目的地 / 记忆偏好定制。

**F-3 认识参考实现的文件结构（`daily-brief/`）：**

```text
daily-brief/
├── agent.md model, tools, instructions
├── deployment.md schedule, time zone, budget, input message
├── environment.yaml network allowlist
├── memory_store_preferences.yaml user preferences
├── memory_store_state.yaml the agent's bookmarks, ledger, notes, and run records
├── vault.yaml the vault that holds the credentials
├── claude-lock.json resource IDs, written by ant apply
└── slack/manifest.yaml one bot app
```

`ant apply` 读取这些文件、在 Claude API workspace 里创建资源，并把资源 ID 记录进 `claude-lock.json`。

**F-4 建 vault 并把凭据放进去**（前提：先想清楚 agent 只需要哪些权限）：

```shell
ant apply vault.yaml
```

然后用 TypeScript SDK 逐个添加凭据（下面以 Slack 为例；`VAULT_ID` 从 `claude-lock.json` 取）：

```typescript
const vaultId = process.env.VAULT_ID!; // the vault's ID, from claude-lock.json

await client.beta.vaults.credentials.create(vaultId, {
  display_name: "SLACK_BOT_TOKEN",
  auth: {
    type: "environment_variable",
    secret_name: "SLACK_BOT_TOKEN",
    secret_value: process.env.SLACK_BOT_TOKEN!,
    networking: { type: "limited", allowed_hosts: ["slack.com"] },
    injection_location: { header: true },
  },
});
```

机制说明（照抄文中的设计）：GitHub 走 MCP，通过沙箱外的 proxy 调用，proxy 按 URL 匹配 vault 凭据；Slack 走沙箱内的 bash + curl，沙箱里只放占位符 `$SLACK_BOT_TOKEN`，请求离开沙箱时平台对 allowlist 内主机替换成真 token。

**F-5 把 vault 挂到 deployment**：把 `claude-lock.json` 里的 vault ID 复制到 `deployment.md` 的 `vault_ids`。

**F-6 用 bookmark 而不是固定时间窗口读来源**：不要写「读最近 24 小时」——跑晚了会漏，跑早了会重。改为每个来源一个 bookmark：每次运行结束时，把每个源读到的最新条目的时间戳写进 `bookmarks.json`，形如 `"slack": "2026-09-14T13:02:11Z"`。下次从 bookmark 起算，窗口自动伸缩。

bookmark 放在名为 `state` 的 memory store 里——一个文本文件目录，平台在每次运行时挂载到沙箱 `/mnt/memory/`，并在运行之间保留；agent 用普通文件工具读写，规则写在 `agent.md` 里。

**F-7 处理「读取失败」，别把它当成安静的今天**：MCP server 挂了或 token 过期时，运行照样启动，只是没有那个 server 的工具；session log 里有 error，但 agent 那侧什么都看不到，会报「nothing new」。`agent.md` 里三条规则：源失败时 ① 不动该源的 bookmark，② 用其余源照常写简报，③ 在简报末尾用一行点名没读到的东西（"pull requests unavailable this run"）。

**F-8 配置目的地：用 bash + curl 发 Slack。** 同一个 bot token 既读又发，不做人工审批（内置 bash 工具默认不请求批准），且 `slack.com` 在 environment 的 allowlist 上。

```shell
curl -s https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"channel": "C0123456789", "text": "Daily brief, Tue Sep 15 ..."}'
```

**F-9 确认发帖成功后才记账（幂等三规则）**：先查当天标题是否已在该 channel 的近期消息里，已有就不发；只有在 Slack 返回 `"ok": true` 且有 message `ts` 时才算发出；确认之后才更新 ledger 和 bookmark；结果不明确就把这次运行标成 `maybe posted`，其他什么都不改。run record 存在 memory store 的 `runs/<date>.md`，状态先标 `posting`，再标 `posted`（带 message ID）或 `maybe posted`。

**F-10 写 `agent.md`**（agent = 模型 + system prompt + 工具的版本化配置）。frontmatter 示例（注意 GitHub 工具集必须设为不请求批准，因为后台没人批准；GitHub token 只读；web 工具关掉）：

```markdown
---
name: Daily brief
model: claude-sonnet-5-5
mcp_servers:
  - type: url
    name: github
    url: https://api.githubcopilot.com/mcp/
tools:
  - type: agent_toolset_20260401
    configs:
      - name: web_search
        enabled: false
      - name: web_fetch
        enabled: false
  - type: mcp_toolset
    mcp_server_name: github
    default_config:
      permission_policy:
        type: always_allow
---
```

正文是运行步骤。文中说仓库里是八条编号步骤，本次材料只摘录了两条原文：

第 4 条（压住篇幅，只有值得今天行动的条目才成一行）：

```text
4. Decide. An item earns a line when the reader would act on it today, or it changes a decision they are about to make. When unsure, leave it out. Most days that is a few items, sometimes none. A count ("12 open reviews") is not an item; link the ones that are blocked. An item already in the ledger and still open is carried as one marked line ("still waiting, day 3"), not re-reported; a closed item is dropped. Do not bring back a topic the preferences file has retired.
```

第 5 条（发帖前复核，宁缺勿虚）：

```text
5. Verify. The world moved while you read. For every item you will report, re-check its live source just before posting: resolved since you read it, drop it; still open but changed, fix the line; cannot confirm, drop it and list it in the run record's cuts. One stale "still waiting on you" costs more trust than ten missing items, so never hedge an item's status: assert it or drop it. Every link is copied from the source's own link field (a pull request's html_url, a Slack permalink), never assembled by hand.
```

其余六条原文未包含，需要回原文补全。

**F-11 写 `deployment.md`**（agent 只是配置，deployment 才让它跑起来）：

```markdown
---
name: Daily brief
agent: ./agent.md
environment_id: ./environment.yaml
schedule:
  type: cron
  expression: "32 7 * * 1-5"
  timezone: America/New_York
vault_ids: [vlt_...] # the vault you create under Sources
resources:
  - path: ./memory_store_preferences.yaml
    access: read_only
    instructions: The reader's preferences. Re-read them every run. Never write here.
  - path: ./memory_store_state.yaml
    access: read_write
    instructions: Your state. Bookmarks, ledger, notes, proposals, and run records.

---

Write today's brief.
The reader's time zone is America/New_York. Work out every date in that zone.

Follow your run steps in order. Today's edition is titled "Daily brief, <weekday> <month> <day>".
```

注意：`timezone` 只决定什么时候触发，正文里还要显式告诉 agent 用哪个时区算日期，否则会出现把今天早上叫成「昨天」的 bug。

**F-12 部署**：调研原文在这一节被截断，只剩标题「部署 +」，**没有可照抄的命令**。要走到这一步，先回原文 blog 把部署部分补全；在此之前不要把它当成一条已经跑通的路线。

### 第 8 步（做法 G）：用 Claude Code + skill 套装跑一个每日内容雷达

前提：已安装 Claude Code；Node.js 18+（README 说 npm 零依赖，不需要 `npm install`）；至少一个数据源；ffmpeg / Whisper / iPhone 都只是可选。先按「免费单条流水线 → 付费每日雷达」的顺序走，别一上来就付月费。

**G-1 克隆并进入 Claude Code**（前提：本机有 Claude Code 和 Node 18+）：

```bash
git clone https://github.com/manthanpatelll/instagram-research-tool.git
cd instagram-research-tool
claude
```

预期结果：进入 Claude Code 会话，仓库里带着 `.claude/skills/reel-research`、`.claude/skills/outliers`、`.claude/skills/research-setup` 三个 skill，用斜杠命令触发。注意没有 `npm install` 这一步——README 说 npm 零依赖。

**G-2 在 Claude Code 内跑首次设置向导**（原文说约 10 分钟、逐个提问，这个时长是作者陈述）：

```
/research-setup
```

向导会依次做五件事：选择并连接数据源 → 询问你的 niche 并生成每日搜索查询（写入 `niche.json`）→ 让你提供三条自己的 caption 以学习你的语气（写入 `voice.md`）→ 引导 iPhone 分享按钮 → 跑自检。

**G-3 先不配数据源，看产出结构合不合用**（可选，验证环境）：

```bash
npm run library          # opens the reel library with a sample breakdown
npm run sample-report    # opens a sample outlier report
npm run selftest         # checks everything works, exit 0 = pass
```

预期结果：`selftest` 返回 exit 0 表示环境检查通过。**注意**：library 和 sample-report 打开的是合成样本（README 截图明确标注 "Screenshots use synthetic sample data"），只能用来看产出长什么样，不能拿它当效果证据。一条 reel 的完整产出应包含八个板块：Numbers / Transcript / Hook / Format / Angle / Visual breakdown / Scroll stoppers / My version。

**G-4 日常使用流程**（这张表就是「可以交给它的活儿」的清单）：

| 时机 | 做什么 | 得到什么 |
|---|---|---|
| 刷内容时 | 在 reel 上 Share > **Save to Research** | 链接存入 inbox |
| 早上 | `/outliers` | 打开当日 outlier 报告，并在对话里解释 top 10 |
| 早上 | `/reel-research inbox` | 拆解所有已保存 reel 并加入库 |
| 任意时间 | `/reel-research <reel link>` | 当场拆解单条 reel |
| 拍摄前 | 打开 `out/library.html`，选一个选题，从 "My version" 开始 | 一份用你语气写的草稿 |

**G-5 让早上的部分自动运行**（cron 与 launchd 示例在 `docs/iphone-shortcut.md`，本次材料未含该文档正文）：

```
claude -p "/reel-research inbox"
claude -p "/outliers"
```

这是做法 G 和 A–F 的关键形态差异：没有常驻网关、没有常驻容器、没有托管平台，由系统定时器在固定时刻起一个一次性 Claude Code 会话跑完就退出；状态全部落在仓库文件里（`inbox.txt`、`voice.md`、`niche.json`、`config.json`）。

**G-6 按需改配置（`config.json`）**：

| 字段 | 默认 | 作用 |
|---|---|---|
| `provider` | `sandcastles` | 单 reel 数据源：`sandcastles`/`apify`/`ytdlp`/`any` |
| `searchProvider` | `sandcastles` | 每日搜索数据源：`sandcastles` 或 `apify` |
| `inboxPath` | `~/Library/Mobile Documents/com~apple~CloudDocs/Reel Research/inbox.txt` | iPhone 快捷指令文件在 Mac 上的同步位置 |
| `windowHours` | `24` | outlier 时间窗 |
| `maxWindowHours` | `48` | 上限；仅当合格 reel 少于 15 条时才放宽，且不超过此值 |
| `minViews` | `2000` | 低于此播放量的 reel 不进报告 |
| `transcription` | `auto` | 有源字幕用源字幕，否则用本地 Whisper |
| `myHandle` | `""` | 你的 Instagram handle（可选） |

`niche.json` 按簇保存搜索查询，`/research-setup` 会按你的 niche 重写，也可手改——**按创作者实际写 caption 的方式写查询**。

**G-7 选数据源，先算成本再动手**（在 `config.json` 里切换）：

- **Sandcastles**（MCP，付费计划起 $49/月；搜索免费、每条新 reel 分析 1 credit；覆盖 IG / TikTok / YouTube Shorts）
- **Apify**（按结果付费，每月 $5 免费额度，每条 reel 不到 1 美分，一次完整每日搜索约 $1.70；覆盖 IG，每日搜索按 hashtag、按每小时播放量排名，**没有 outlier score**）
- **yt-dlp**（免费开源，仅单条公开链接，需本地 Whisper 转写；IG 通常无播放量且可能被拦截，无每日搜索）
- **任意源**（自带视频文件、导出或粘贴的数字）

预期结果：用 yt-dlp 能把单条公开 reel 的完整流水线跑通，并且**数字缺失时留空、工具从不编造数字**。这一步验证的是「流水线成立」，不是「效果变好」。

**G-8 想要每日雷达再上 Apify**：把 `provider` / `searchProvider` 设为 `apify`，跑一次 `/outliers`，核对报告筛选是否遵守 24h 窗口 / 48h 上限 / `minViews` 2000 / 去重合并 / 按 outlier score 排名 / 可疑触达标记这几条规则，以及成本是否落在每月 $5 免费额度或你能接受的范围里。注意 README 指出 Apify 的 actor 在本工具里只支持 Instagram（TikTok / Shorts 要靠 Sandcastles 或 yt-dlp 单条）。

**G-9 迁移到你的领域**：把同一套「数据源只取数 + Claude Code 分析 + 定时命令」结构换到你的场景（例如把 niche 换成你的关键词），看骨架是否仍成立。这一步是做法 G 对整篇手册的主要贡献——它示范了一个可迁移范式，而不是只教你做 Instagram。

### 第 9 步（做法 H）：安装 touri，把 Codex / Claude Code CLI 变成常驻 bot

前提：macOS 14 或更新版本，Apple Silicon；本机已安装并登录 Codex 或 Claude Code CLI；若要用可选的 bot-machine（隔离 VM）功能，需要 macOS 26 与 Apple `container` >= 1.5.0，低于此版本本机 bot 仍可用，machine 功能会自报为不可用。源码构建需要 Bun 1.2.21 或更新、Rust 1.90 或更新并带 `aarch64-apple-darwin` target。Release 构建目前未签名、未公证。

**H-1 安装 Release（前提：macOS 14+、Apple Silicon，已登录 Codex 或 Claude Code CLI）。** 从 Releases 页面下载最新 `.dmg`，把 `touri.app` 拖进 `/Applications`。Release 构建未签名、未公证，首次启动会被 Gatekeeper 拦截。按原文三步走：

1. 打开 `touri.app`，macOS 弹出警告并拒绝打开。
2. 打开 System Settings > Privacy & Security，滚动到关于 touri 的提示，点 "Open Anyway"。
3. 用密码确认。之后启动正常。

macOS 15 及以后，Control-click > Open 不再能绕过 Gatekeeper，必须用上面这套步骤。或者用终端去掉隔离标记：

```sh
xattr -dr com.apple.quarantine /Applications/touri.app
```

**H-2 从源码构建（前提：Bun 1.2.21+；Rust 1.90+ 并带 `aarch64-apple-darwin` target）。**

```sh
bun install
bun run build:sidecar
bun run tauri build --bundles app
open src-tauri/target/release/bundle/macos/touri.app
```

开发模式运行：

```sh
bun run build:sidecar && TOURI_SIDECAR_BIN="$PWD/src-tauri/binaries/touri-sidecar-aarch64-apple-darwin" bun run tauri dev
```

注意原文说明：签名、公证和 updater 已接线但被关闭（见 `docs/DECISIONS.md`）。

**H-3 验证安装/构建是否真的可用。**

```sh
bun run typecheck
bun run lint
TOURI_BROWSER_HEADLESS=1 bun test sidecar/test
(cd ui && bunx vitest run && bunx vite build && bunx playwright test)
(cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings)
```

可选的、打真实 CLI 的冒烟测试：

```sh
TOURI_E2E_REAL_CLI=1 bun test sidecar/test/runtime/real-cli.test.ts
```

**H-4 从旧设置导入（先 dry run）。** 前提：有一份早期 bot 设置的数据目录，可在本机路径或通过 SSH 访问。导入器是幂等的，routine 以 disabled 状态导入，且从不读取凭据文件；SSH 源在远端只读（仅白名单文件，不写远端）。

```sh
TOURI_APP_DATA="$HOME/Library/Application Support/touri-dev" bun sidecar/src/importer/legacy/cli.ts --source ssh --host user@host.example --root '~/.legacy-app' --dry-run --all
```

去掉 `--dry-run` 才真正导入；`--bot <name>` 选择 bot；`--cwd-map <from>=<to>` 映射路径。

**H-5 直接运行 sidecar / 接 MCP。**

```sh
TOURI_UI_TOKEN=dev-ui-token bun run sidecar/src/main.ts serve
```

该命令会往 stdout 打印一行 `SidecarHandshake` JSON。MCP stdio 模式只是连接运行中的 sidecar 的字节管道，只读逐线程 token 文件，不打开 SQLite：

```sh
bun run sidecar/src/main.ts mcp-stdio --thread <thread-id>
```

**H-6 运行时要留意的配置面**（README 只给了名称，未给字段级配置步骤）：

- 审批模式：`on-request`、`workspace-write`、`full`——按任务风险选档。
- MCP gateway 使用逐线程 token，并带审批提示。
- computer use 是 opt-in，必须依赖可见指示器与 kill switch。
- bot machine 通过 Apple `container` 起隔离 Linux VM；系统不满足条件时该功能报不可用。
- 仓库规则：`packages/contracts/` 放共享类型、SQL schema 与 MCP tool schema，改这里必须先有 contract change；凭据从不被导入或存入 SQLite。

**H-7 缺口提示**（原文未覆盖，试用时需自己摸索）：README 没有说明在 UI 里如何新建一个 bot、如何写 routine 的调度配置、overlap 与 catch-up 的具体参数怎么填。要照着手册用，需要补上 `docs/` 目录与界面内的说明。

预期结果：验证链通过后，你能在 macOS 上跑起 touri，让 Codex 或 Claude Code CLI 变成常驻 bot；routines 可按 cron 调度运行，审批模式、逐线程 MCP token 与可选隔离 VM 提供权限和数据边界控制。

### 第 10 步：无论 A / B / C / D / E / F / G / H，都收敛到同一个最小闭环

这一步是整篇手册的核心，各份调研给出的建议一致：

1. **实例只开本地访问**。Docker 优先；先不要把控制台暴露到外网（CowAgent 调研的建议就是先不要把 `web_host` 设为 `0.0.0.0`；Eigent 的 Quick Start 会连云端，要「不出本机」必须走 C-3 的本地部署；NanoClaw 默认本地构建、不联网，但要显式关掉匿名诊断并核对容器挂载清单；Comma 默认所有公开端口只绑 loopback，别急着按 E-5 暴露）。做法 F 没有本机实例，对应的是收紧 `environment.yaml` 的网络 allowlist——只放这个 brief 真正要访问的主机。做法 G 对应的是：数据源凭证只放 `.env` 且不提交，工具声明从不登录 Instagram、不用 cookies 或 session、不用你的账号抓取，下载的视频仅本地分析。做法 H 对应的是：数据默认存 `~/Library/Application Support/touri` 下的 SQLite，无遥测、无需账号；凭据放 macOS Keychain，不进数据库、日志或导出；可选云托管是单独 opt-in 协议，试用期别开。
2. **只配一个 Chat 模型**，不接多渠道，先把「模型能用」这一步单独确认掉。NanoClaw 对应的是：只配一个 provider（默认 Anthropic），装别的 provider skill 留到跑通之后。Comma 对应的是：先用 E-1 的 mock 模型跑通界面与登录，再用 E-2 配一个真实 provider，不要一上来就调 `COMMA_LLM_*` 全套参数。做法 F 对应的是：只接一个 GitHub MCP + 一个 Slack 目的地，别一上来就加第二个源。做法 G 对应的是：先跑一条 reel 或先看合成样本，别一上来就把 `provider` 和 `searchProvider` 都切到付费数据源。做法 H 对应的是：先只配一个 runtime（Codex 或 Claude Code），别同时接两个；审批模式先用 `on-request`，别一上来用 `full`。
3. **只装 / 建一个技能或工具，范围严格限定在「一件你每周都要重复做的小事」**。装不到合适技能，就退回让 agent 用对话生成一个最小技能（CowAgent 用 `skill-creator`；NanoClaw 用自然语言直接对 Claude Code 改，或 `/customize`）。Comma 上对应的是：只给它一个 Task，并把 Allow operations 当总开关按需打开。做法 G 上对应的是：先用 `reel-research` 这一个 skill 把单条拆解跑顺，`outliers` 留到下一步。做法 H 上对应的是：先只建一个 routine 跑低风险重复任务，先别开 computer use，也先别管 bot machine。
4. **建一个定时任务**，例如固定时间汇总某个信息源并推送，观察它能否在无人干预下完成（nanobot 用 Automations / Tasks，前提是网关常驻；CowAgent 用内置 `scheduler`，在 Web console 里管理；Eigent 用 Automation；NanoClaw 用触发词让 agent 建 recurring job，用 `list all scheduled tasks across groups` 核对、`pause` 暂停；Comma 用 Routines 做时间触发、用 Loops 做事件触发，用看板核对它有没有真的推进；做法 F 用 `deployment.md` 里的 cron + timezone；做法 G 用 cron / launchd 调 `claude -p "/outliers"`；做法 H 用 touri 的 routines，按 cron 调度 bot 运行，带 overlap 与 catch-up 控制，但原文没给具体参数写法，需要你自己在界面或 `docs/` 里补）。**做法 F 的做法值得在这里单独强调：先把场景缩到「单一来源 + 单一收件人 + 每日一次」，并用手动触发而不是等排期来验证第一次运行。** 做法 G 同理：先手动跑 `/outliers`，确认产出结构对了，再挂到 cron 上。做法 H 同理：先手动或临时触发一次 routine，确认 bot 能跑完，再让它按 cron 常驻。
5. **让它连续处理同一类任务 5–10 次**，每次都检查两件事：一是任务是否完成，二是后续对话里它是否自动检索到了之前的记忆 / 知识，而不需要你重新交代背景。touri 的 persistent bots 声明每个 bot 有自己的指令、记忆、技能和可分支对话历史，但这是功能声明，需要你自己抽查。
6. **从第一次运行就开始记录指标**（见下一节）。否则两周后你只有印象，没有依据。
7. **给有副作用的动作定一条幂等规则**：先说清楚「怎么算发出去了」，再让它动手，否则你会在几周后发现自己收到了重复的简报，或者根本不知道某天到底发没发。

**做法 F 的调研还给了几条不依赖具体平台的规则**，在你选的任何一条路线上都值得照抄（这是本次调研作者的转述与建议，不是跨平台验证过的结论）：

- **用游标，不用固定时间窗口。** 不要写「读最近 24 小时」——跑晚了会漏、跑早了会重。每个源存一个「上次读到哪」的时间戳，下次从那里起算，窗口自动伸缩。
- **源读不到时要显式上报，不要当成安静的今天。** 三条规则：不动这个源的游标、用其余源照常产出、在结果里用一行点名没读到的东西。这条在 nanobot / CowAgent / Comma 上都适用——它们的失败都默认是「没有输出」。
- **有副作用之前先查、确认成功才记账、结果不明确就标成「可能已发」。** 做法 F 的原话是：先查当天标题是否已在目标频道近期消息里；只有平台明确返回成功和消息 ID 才算发出；不明确就标 `maybe posted`，其它什么都不改。
- **只推「读者今天会因此行动」的条目。** 判定标准是它会不会改变对方即将做的一个决定；拿不准就不写。「12 个待审」这种计数不算一条，要给出具体被卡住的那几个。
- **发布前复核。** 从读到发布之间世界会变：已解决的删掉、状态变了的改掉、无法确认的删掉并记进本次运行的裁剪清单。状态宁可断言或删掉，不要模糊化。
- **链接从源自己的 link 字段复制，不要手拼。**
- **调度的时区只决定什么时候触发，日期计算用的时区还要在提示词正文里再写一遍。**

**做法 G 的调研补了一条选型层规则**：把「取数」和「分析」分开——数据源只负责给原始事实（数字、caption、视频），分析全部由 Claude Code 做，这样换数据源不会改变拆解质量。同一条规则还带出一个数据纪律：**数字缺失就留空，工具从不编造数字**——这条可以直接搬到做法 F 的 brief 上。

**如果选的是 Eigent，按这个顺序收敛**：先用 C-1 跑通桌面端 → 再把模型换成 Ollama 上的本地模型，验证「数据不出本机」这条是否成立 → 如果流程有效，再试 Workforce 多 agent 并行，和同一任务在单 agent 下的表现做对比 → **最后才试 Automation 定时调度**，观察连续几个周期是否可靠触发。顺序反了的话，一旦调度漏跑，你分不清是调度的问题还是多 agent 分工的问题。

**如果选的是 NanoClaw，按这个顺序收敛**：D-1 装好并只配对**一个**频道（本地 CLI 或你最常用的那个）→ D-3 用「每周一 8am 新闻简报」这一条建一个定时任务，连续跑几个周期 → 核对容器挂载清单，确认 agent 只看到你显式允许的目录 → 需要换本地模型或换渠道时，再分别装 `/add-ollama-provider`、`/add-telegram` 这类 skill → **最后**再试 `/manage-channels` 的隔离与共享组合。先动挂载和权限再搭任务，一旦出问题你分不清是权限配置还是任务本身。

**如果选的是 Comma，按这个顺序收敛**：E-1 的 `make dev` + mock 模型零成本跑通登录和界面 → E-2 起自建实例、只配**一个**真实模型 → E-8 只建一个 Routine 或一个 Loops（盯一个信息源），连续跑一两周 → 需要它动手时再打开 Allow operations，先只给读权限、让有副作用的操作停在 Needs Review → **最后**才考虑 E-5 的对外暴露和把 Codex / Claude Code 注册成 Worker。顺序反了的话，出问题你分不清是模型判断、调度触发还是权限放行造成的。

**如果选的是做法 F，按这个顺序收敛**：先确认 beta 平台和 workspace 能用 → 用 `managed-agents-onboard` 生成起点文件，只留一个来源和一个 Slack 目的地 → 只放这一个 brief 需要的凭据进 vault（GitHub token 只读；Slack 用同一个 bot token 读写）→ 把来源的游标、读取失败上报、发帖幂等规则先写进 `agent.md` → **手动触发第一次运行**，确认消息真的到了 Slack → 再把 cron 打开去等排期 → 最后才考虑加第二个来源或第二个目的地。顺序反了的话，一旦漏发或重发，你分不清是调度没触发、源没读到、还是幂等没写对。

**如果选的是做法 G，按这个顺序收敛**：G-1 克隆进 Claude Code → G-3 跑 `npm run selftest`（期望 exit 0）并打开合成样本，判断产出结构合不合用 → G-2 跑 `/research-setup`，把你的 niche 和三条 caption 喂进去 → 用免费的 yt-dlp 路线对一条公开 reel 跑 `/reel-research <link>`，确认八个板块都出、缺失数字留空 → 想要每日雷达再切到 Apify，跑一次 `/outliers` 并核对 24h / 2000 / 去重 / 排名规则 → **最后**才挂 cron / launchd 做自动化。顺序反了的话，一旦报告出问题，你分不清是数据源取不到数、查询写得不对，还是分析步骤本身有毛病。

**如果选的是做法 H，按这个顺序收敛**：先确认 macOS 14+ Apple Silicon 与 Codex / Claude Code CLI 登录 → 按 H-1 装 Release 并处理 Gatekeeper，或按 H-2 从源码构建 → 跑 H-3 的验证链，确认 typecheck、lint、sidecar 测试、UI 测试、Rust 测试与 clippy 都过 → 只配一个 runtime，只建一个 routine 跑低风险重复任务，审批模式先用 `on-request` → 用 MCP gateway 的逐线程 token 与审批提示核对工具权限 → **最后**才考虑 computer use（必须确认可见指示器与 kill switch）和 bot machine（需 macOS 26 + Apple `container` >= 1.5.0）。顺序反了的话，一旦 bot 行为异常，你分不清是 runtime、routine 配置、审批模式还是隔离 VM 的问题。

预期结果：两周内你拿到一组自己的数字，而不是一份 README 的承诺。

## 怎么判断变好了

各份调研都没有给出官方指标，下面这套是「调研作者建议 + 你需要自建基线」的组合。

**可观察的指标**

- **定时任务按时完成率**，以及需要你人工介入的次数（按次记录）。
- **单次任务的实际耗时与返工次数**，对比「你自己做」或「用普通对话式 AI 做」的基线。Eigent 调研把它拆成两条：人工耗时差（从全程自己做变成只审核产出物）和首次通过率（产出需要返工或重做的比例）。做法 G 上同样要自测这条基线：手工拆解一条 reel 需要多久、能产出哪些字段，用工具后耗时和字段覆盖怎么变。做法 H 上要测：以前手动跑 Codex / Claude Code CLI 的耗时，和交给 touri bot + routine 后的耗时、返工次数对比。
- **产出字段完整率**（做法 G 可直接观察的一项）：八个板块里哪些因数据源缺失而为空，哪些是实际产出的；以及缺失的数字有没有被留空，而不是被编造。
- **筛选规则可复现性**（做法 G）：`/outliers` 报告是否稳定生成，24h 窗口 / 48h 上限 / `minViews` 2000 / 去重合并 / 排名这几条规则是否每次一致。
- **Token 成本**：算清每完成一件任务花多少钱。CowAgent README 明确警告 Agent 模式消耗显著多于普通对话，这是最容易失控的一项。NanoClaw 的定时任务可配 script gates，无活时不唤醒 agent；Comma 的 Loops 同理——只在有事时唤醒 agent，安静的一小时不消耗大模型 token（两处具体写法原文都只给了链接或描述，没有正文）。做法 F 的 `deployment.md` 里有一个 budget 字段，说明成本上限是它的配置项之一，但**原文没给这个字段的配置方式和数值**，需要你自己在试用里定死。做法 G 的成本不在 token，而在数据源：一次完整每日搜索约 $1.70、Sandcastles 起 $49/月，要单独记账。做法 H 的成本取决于你接入的 Codex / Claude Code CLI 的用量，touri 本身没有给出成本上限配置或成本数据，需要你按 runtime 用量自测。
- **技能复用次数**：同一个技能被稳定调用多少次；如果一周内没有被重复调用，说明它没有固化成产能。
- **记忆有效性**：随机抽查后续会话，看它是否引用了正确的历史结论，而不是要你重新交代背景。做法 H 的 persistent bots 声明每个 bot 有自己的记忆和可分支对话历史，但这是功能声明，需要你抽查验证。
- **重发与漏读上报**（做法 F 调研给出的两个可观察失败模式）：同一个 brief 有没有被重复发出去；某个源读不到时，产出里有没有点名没读到的东西，而不是报「nothing new」。调研明确说**幂等性和漏读上报都需要你自己实测**，它是规则，不是已验证的结果。
- **数据边界**（Eigent 调研建议）：在本地部署模式下，能否确认文件、凭据、上下文没有被送出本机。NanoClaw 上这一项最容易做成可检查项——容器只挂载你显式允许的目录，且 agent 不持有原始 API key（由凭据网关在请求时注入），你可以直接拿挂载清单和出站策略来核对；但它同样没有第三方验证，别把「设计如此」当成「实测成立」。Comma 上的对应说法是「云端干活、设备管身份」——长任务跑在它自己的环境，敏感身份、会话、支付和私密数据留在你自己的设备；这是 README 的定位描述，需要你自己在试用里核实。做法 F 上对应的是 `environment.yaml` 的 allowlist 加 vault 的 `networking.allowed_hosts`：沙箱里只有占位符，真 token 在请求离开沙箱时才注入，同样需要你自己核对实际放行了哪些主机。做法 G 上对应的是：`.env` 里的数据源凭证有没有被提交，以及工具声明的「不用 cookies / session、不用你的账号抓取」是否在实际运行中成立。做法 H 上对应的是：数据是否留在 `~/Library/Application Support/touri` 下的 SQLite、凭据是否只进 macOS Keychain 而不进数据库/日志/导出、可选云托管是否保持关闭。
- **失败可诊断性**（Eigent 调研建议）：任务失败时能否从日志 / 步骤回放定位原因。NanoClaw 的路径是把排障直接交给 Claude Code（问它为什么调度没跑、日志里有什么），或 `/debug`；Comma 的路径是看板四态——卡在 Needs Review 说明在等你决定，长期停在 Backlog / In progress 说明 loop 没有推进；做法 F 的路径是 session log（源失败的错误在这里，agent 那侧看不到）加 memory store 里的 `runs/<date>.md`；做法 G 的路径是 `npm run selftest` 的退出码和单条命令的即时输出；做法 H 的路径是 H-3 的验证链（typecheck、lint、sidecar 测试、UI 测试、Rust 测试与 clippy）以及 `TOURI_E2E_REAL_CLI=1` 的真实 CLI 冒烟测试。

**注意区分「可观测」和「有效果」**：nanobot 的 WebUI 可以展开查看推理过程、工具调用、文件改动、差分、命令输出和产出物，输入区的上下文指示器显示上下文大小、每轮输入 token 和 provider 上报的缓存复用，还有上下文压缩（compaction）时间线，配置里可接 Langfuse；CowAgent 有上下文用量可视化、`/compact` 上下文压缩、模型缓存命中率提升；NanoClaw 有 per-checkout id、可逐组确认的卸载清单、可关闭的匿名诊断、容器与凭据网关；做法 F 有 session log、run record 和 ledger；做法 G 有 `selftest` 退出码和每条的互动率；做法 H 有构建、验证、导入与 sidecar/MCP 命令，但这些只说明「软件正常工作」，不说明「工作产出改善」。同理，Eigent 的 15,457 stars、NanoClaw 的 30866 stars、做法 G 的 31 stars、做法 H 的 35 stars 只反映热度，不是效果证据；Comma 的 172 stars 同理。

**Comma 独有的「运行时可靠性」怎么用**：原文列出六条被检查的性质——已接受的工作在失败和重启后不会静默丢失；失败的回复不算已完成工作；有副作用的操作在开始前先记录；被中断的变更操作不会被意外执行两次；过期 worker 不能覆盖更新的 agent 状态；数据只在策略允许的边界间流动。这些性质由 Lean 机器检查和 TLA+ 模型检查覆盖，可以作为「它不会悄悄把事情丢掉」的观察项。但原文**明确声明：形式化验证不证明模型判断或任务成功**，它只验证「即使出错，运行时仍按我们设计的规则行事」。不要把运行时可靠误读成结果可靠。

**最小试用方式**：单机跑通一个实例，只开本地访问（Eigent 若走 Quick Start 会连云端；做法 F 没有本机实例，对应的是收紧 allowlist；做法 H 是 local-first macOS 应用，数据默认本机 SQLite、凭据 Keychain，但 Release 未签名），只配一个模型，装 1 个技能，建 1 个定时任务，连续跑 5–10 次同类任务。Comma 的零成本入口是 E-1 的 `make dev` + mock 模型。做法 F 的最小场景是「单一来源 + 单一收件人 + 每日一次」，并且第一次用手动触发而不是等排期。做法 G 的最小场景是：不花一分钱，`selftest` + 合成样本 + 一条用 yt-dlp 跑的公开 reel，先判断产出结构合不合用。做法 H 的最小场景是：只配一个 runtime（Codex 或 Claude Code），跑通 H-3 验证链，只建一个 routine 跑低风险重复任务，审批模式先用 `on-request`，先不开 computer use 和 bot machine。

**试多久**：nanobot 调研建议把这件周期性工作配成 automation 跑两周；CowAgent 调研建议 1–2 周；Eigent 调研未给观察期长度，沿用两周作为默认观察期；NanoClaw 调研建议 1 天内搭完、2 周判断；Comma 调研建议把一个真实长周期任务交给 Task + Loop 跑一两周；做法 F 的调研没给观察期，沿用两周；做法 G 的调研也没给观察期，沿用两周；做法 H 的调研没给观察期，沿用两周。统一按两周执行。

**降级 / 放弃条件**（出现任一即可停）：一周内跑不出任何可复用的稳定产出；或 token 成本明显高于人工 / 普通对话方案；或必须开放外网与高权限才能用；或反复出现重发 / 漏发却查不出原因。Eigent 上的等价说法是：只有在那个周期任务上做到「人工时间明显下降且返工比例可接受」，才考虑纳入日常工作流，在此之前保持 try 状态。NanoClaw 上还可以加一条：如果为了让它跑起来必须持续改代码而你又不想维护这份 fork，直接停。Comma 上再加两条：如果你不打算长期维护 Elixir/Lean/TLA+ 这套重栈，别把它留在日常工作流；除运行时形式化验证外它没有任何任务成功率或效果数据，不宜直接采用。做法 F 上再加一条：它仍处于 beta、强依赖 Anthropic 托管平台，如果幂等性、漏读上报或成本上限中任何一项在两周期内没测清楚，就不要把它接到真实的信息源和真实收件人上。做法 G 上再加两条：如果拆解产出的 "My version" 从没被真正用于创作、或从选题到出稿的周期没有缩短，那它只是好看；如果每月数据源花费（Apify 约 $1.70/次搜索，或 Sandcastles $49/月起）换不回对应的产出，直接停。做法 H 上再加两条：如果 Windows / Linux 是你的主环境，或者企业策略禁止绕过 Gatekeeper，直接停；如果 README 没给 UI 新建 bot、routine 调度、overlap/catch-up 参数，而你又不愿意查 `docs/` 或界面说明，把它降为 watch。出现任一情况，把项目从 try 降为 watch，只在观察清单里跟踪；NanoClaw 可以直接用 `bash nanoclaw.sh --uninstall` 干净回滚，不需要留一台挂着的机器，Comma 用 `docker compose down` 停栈即可（记得不要加 `-v`，除非确实要删实例），做法 F 停掉排期即可、本机不留东西，做法 G 停掉 cron / launchd 任务、删掉 clone 下来的目录即可，做法 H 退出 touri、关闭 sidecar、按需删掉 `/Applications/touri.app` 与 `~/Library/Application Support/touri` 即可。

## 常见坑

- **把「装好了、能回复」当成「工作变好了」**。各份调研都明确指出原文只有安装与能力清单，没有效果数据、对比案例、基准分数或成本节省数据。
- **把合成样本当成实测产出**（做法 G 独有的坑）。README 的截图明确标注 "Screenshots use synthetic sample data"，library 和 sample-report 打开的都是合成数据；它只能告诉你产出长什么样，不能证明你的场景下有效。
- **以为做法 G 的效果有数据支撑**。仓库只有 31 stars，README 大量引导加入作者的付费社区（AI Inner Circle），「the breakdown is the same whichever one you pick」「about 10 minutes 的设置时长」都是作者陈述，没有独立验证。
- **为了省事跳过付费数据源、又期待有每日雷达**。免费路线 yt-dlp 只支持单条公开链接，IG 通常拿不到播放量且可能被拦截，也**没有每日搜索**；Apify 的 actor 在本工具里只支持 Instagram，TikTok / Shorts 要靠 Sandcastles 或 yt-dlp 单条。先用 yt-dlp 验证单条流水线，再决定要不要为雷达付费。
- **让缺失的数字被编出来**。工具的设计是「数字缺失就留空，工具从不编造数字」；如果你在 `provider` 上用覆盖不全的数据源，就要逐条核对哪些字段是空的，而不是当成完整报告。
- **把 Comma 的运行时形式化验证当成任务效果证据**。Lean 机器检查 + TLA+ 模型检查只覆盖上面那六条运行时性质，原文明确声明它不证明模型判断或任务成功。
- **把「源读不到」当成安静的今天**（做法 F 原文点名的失败模式）。MCP server 挂了或 token 过期时，运行照样启动、agent 那侧什么都看不到，会报「nothing new」——你会以为今天真的没新闻。规则是：不动该源游标、其余源照常写、末尾一行点名没读到的东西。
- **用「读最近 24 小时」这种固定窗口读来源**。跑晚了会漏、跑早了会重。改用每个来源一个 bookmark，每次运行结束时把该源最新条目的时间戳写回去。
- **发出去之前不查重、发出去不确定成功就记账**。先查当天标题是否已在目标频道近期消息里；只有平台明确返回成功和消息 ID 才算发出；结果不明确就标 `maybe posted`，其他什么都不改，否则下次运行会重复发一遍。
- **在 `deployment.md` 里设了 timezone 就以为日期没问题**。`timezone` 只决定什么时候触发；正文里还要显式告诉 agent 用哪个时区算日期，否则会把今天早上叫成「昨天」。
- **手拼链接**。做法 F 原文明确要求链接从源自己的 link 字段复制（PR 的 `html_url`、Slack permalink），不要自己拼。
- **给后台 agent 配了需要人工批准的工具**。做法 F 里 GitHub 工具集必须设成不请求批准（后台没人批准），同时 token 只读、web 工具关掉——否则后台运行会卡在一个永远等不到人的确认上。
- **给 agent 的凭据权限过大**。vault 里只放这个 brief 需要的凭据，并给每条凭据设 `allowed_hosts`；沙箱里只有占位符，真 token 在请求离开沙箱时才注入。
- **把 beta 的托管平台直接接到真实信息源和真实收件人上**。调研结论明确：它仍属 beta、强依赖 Anthropic 托管平台，幂等性、漏读上报和成本上限都需自己实测。
- **以为照抄 `daily-brief/` 的文件结构就跑起来了**。文中要求按自己的来源 / 目的地 / 偏好改写；而且调研原文在「部署」一节被截断，缺可照抄的命令，必须先回原文补全。
- **自建 Comma 时忘了默认栈不含 mock 模型**。E-2 的 compose 栈不配模型就没有真实模型调用；想零成本先跑通链路，要用 E-1 的 `pnpm install` + `make dev`。
- **公开暴露 Comma 时把 Web / Admin / Product API 放到不同顶级域名**。三者的 origin 必须属于同一个可注册域名；并且要换真实 SMTP，本地收件箱只能用于 loopback，能读到它的人就能用里面的登录码。
- **升级 Comma 前没停栈，或者删了 `config` volume / 重新生成它的密钥**。`config` 卷保存加密密钥和认证密钥；五个 named volume 要一起备份；`docker compose down` 不要随手加 `-v`。
- **一上来就打开 Allow operations**。它是改文件、跑命令、把活转交 Codex / Claude Code / Pi / Kimi 的总开关；先用只读和 Needs Review 跑通，再逐项放开。
- **把 Comma 当又一个编码 agent**。它的定位是常驻调度层，把 Codex / Claude Code 当应用调用或注册为 Worker / Sub-agent；如果你只是想要一个编码 agent，回到第 1 步重选。
- **期望 Comma 的 Meetings 或 Agent VMM host 开箱可用**。这两个需要的运行时不在本仓库内。
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
- **把 touri 的未签名 Release 当正常安装**。首次启动会被 Gatekeeper 拦截；要按 System Settings > Privacy & Security 里的 "Open Anyway" 三步走，或用 `xattr -dr com.apple.quarantine /Applications/touri.app`。macOS 15 及以后 Control-click > Open 不再能绕过。
- **以为 touri 能在 Windows / Linux 上用**。它仅 macOS、仅 Apple Silicon，其他平台完全用不上。
- **以为 touri 的 bot-machine 开箱可用**。它需要 macOS 26 与 Apple `container` >= 1.5.0；低于此版本本机 bot 仍可用，machine 功能会自报为不可用。
- **以为 touri README 讲了怎么新建 bot、配 routine**。原文没有说明在 UI 里如何新建 bot、如何写 routine 的调度配置、overlap 与 catch-up 的具体参数怎么填；要照着手册用，需要补 `docs/` 目录与界面内的说明。
- **把 touri 当 Claude Code 的替代品**。它是编排/外壳层，把 Claude Code CLI 作为 runtime 接入，并在其上加常驻 bot、记忆、routines、逐线程 MCP token 与 VM 隔离；两者是叠加关系。OpenCode 在 README 正文标题与 Features 里依据较弱，先别把它当成已支持。
- **把 touri 的功能声明当效果数据**。persistent bots、routines 带 overlap 和 catch-up 控制、agent browser 带人工接管、computer use 带可见指示器和 kill switch 都是 README 功能声明，没有截图、演示、案例或效果数据；仓库仅 35 stars，Apache-2.0。
- **文档有缺口就卡住**。CowAgent 的 MCP 集成只有一句描述、没有 `mcp.json` 示例，技能创作只有「用对话生成」没有演示，需查官方文档页；Eigent 的本地部署命令在 `server/README_EN.md`、MCP / Skill 配置在 `docs.eigent.ai`、用例步骤在官网 guide，都不在 README 正文里；nanobot 的上下文与隐私用法（不同任务用不同 topic、Temporary chat 不写历史或长期记忆、一个 workbench 最多并排四个会话）分散在 README 里；NanoClaw 的定时任务 script gates 具体写法和 `docs/` 里各文档细节，原文只有链接、没有正文；Comma 的公开部署、升级、恢复细节在 `systems/DEPLOYMENT.md#self-hosted-compose`，本次材料只给了这一入口，要照做必须先另行查阅；做法 F 的部署步骤在调研里被截断，运行步骤八条只摘了两条，都需要回原文补；做法 G 的 cron / launchd 示例在 `docs/iphone-shortcut.md`，本次材料未含该文档正文；做法 H 的 UI 新建 bot、routine 调度配置、overlap/catch-up 参数均未展开，需查 `docs/` 或界面说明。
- **把作者自述当事实**。CowAgent 的 stars 数是仓库自报；「proactively plans」「self-evolution」「grows alongside you」「Agent Harness engineering 的参考实现」、记忆分层与 Deep Dream、知识库自动整理与知识图谱、Self-Evolution 的具体效果，全部是自述，没有案例或数据支撑。Eigent 的「boosts productivity」「exceptional productivity」「turn your most complex workflows into automated tasks」同样无任何量化。nanobot 的能力清单同样只是项目自述。NanoClaw 对 OpenClaw 的对比数字（近 50 万行代码、53 个配置文件、70+ 依赖、应用层安全 vs OS 级隔离）以及「Claude 能安全修改这么小的代码库」也都是作者主张，原文无法核实。Comma 的「sessionless / relentless / swarm intelligence」效果性表述（减少上下文压缩、漂移、污染）、7×24 持续完成目标、「你管目标不管 swarm」，同样没有任何成功率、耗时或成本对比数据；示例视频（购物比价与结账、交付工作与生活）在文本中没有对应指标。做法 F 的「一条过期的 still waiting on you 比十条漏掉的条目更伤信任」和那套条目取舍标准同样是作者判断，参考实现本身没给出任何效果数据。做法 G 的所有功能描述、"the breakdown is the same whichever one you pick"、"about 10 minutes" 的设置时长，同样只是 README 陈述。做法 H 的 persistent bots、routines 带 overlap 和 catch-up 控制、agent browser 带人工接管、computer use 带可见指示器和 kill switch 也都是 README 功能声明，没有截图、演示、案例或效果数据。
- **定时任务不生效**。nanobot 的定时投递要靠网关常驻，`nanobot gateway --background` 是唯一把它提升为持久后台模式的命令；关掉终端就等着收不到结果。NanoClaw 侧则要先确认宿主进程和容器都在跑，再用 `list all scheduled tasks across groups` 确认任务确实登记了。Comma 侧要先确认实例在跑（`docker compose up -d --build` 之后的容器没停），Loops 只在事件触发时才唤醒 agent——如果它一直没动静，先确认你盯的那个信息源真的没有新事件。做法 F 侧要先确认自己不是把「源读不到」当成了「今天没新闻」，去 session log 里找 error。做法 G 侧要先手动跑一次 `claude -p "/outliers"` 看它是否正常输出，再去查 cron / launchd 有没有真的触发（做法 G 没有常驻进程，所以「不生效」几乎总是定时器或环境变量的问题，不是网关掉了）。做法 H 侧要先确认 touri 应用与 sidecar 在运行、bot 已创建、routine 已启用，再看 H-3 验证链是否通过、MCP gateway 的逐线程 token 是否有效——原文没给 routine 调度配置的字段说明，所以「不生效」也可能是因为参数没写对，需要查 `docs/` 或界面说明。
- **试用期就开放外网或高权限**。CowAgent README 明确说 Agent 能访问本机操作系统，只能在可信环境部署；服务器暴露控制台必须设 `web_password` 并限制端口。试用阶段就把实例锁在 localhost。NanoClaw 侧对应的是：先核对容器挂载清单、别急着用 `/manage-channels` 把多个频道折进一个共享会话，也先别让 agent 去改自己的代码。Comma 侧对应的是：默认端口本来就只绑 loopback，先别按 E-5 暴露；Allow operations 先别开。做法 F 侧对应的是：`environment.yaml` 的 allowlist 只放必需主机，vault 里每条凭据都设 `allowed_hosts`。做法 G 侧对应的是：数据源凭证放 `.env` 且不提交，别为了省事把 Instagram 账号密码或 cookies 交给工具——工具自己的声明就是不登录、不用 cookies / session。做法 H 侧对应的是：数据默认本机 SQLite、凭据只进 Keychain；审批模式先用 `on-request`，别一上来用 `full`；computer use 先别开，要开也必须确认可见指示器与 kill switch 都在；bot machine 先别用，除非系统满足 macOS 26 + Apple `container` >= 1.5.0。
- **pip 报 `externally-managed-environment`**：改用一键安装器、`uv tool install nanobot-ai`、`pipx install nanobot-ai`，或装进虚拟环境。
- **`nanobot` 不在 PATH**：用 `uv tool run --from nanobot-ai nanobot ...` 或 `pipx run --spec nanobot-ai nanobot ...`。
- **拉完代码忘了同步依赖（Eigent）**：前端要在项目根目录 `npm install`，后端要 `cd backend && uv sync`，两步都做。
- **技能装不通就放弃**。退回用 `skill-creator` 生成一个最小技能，范围严格限定在「一件你每周都要重复做的小事」。
- **把所有任务塞进同一个会话**。nanobot 支持按 topic 分开任务，并用 Temporary chat 做临时对话（不写入历史或长期记忆）；混在一起会污染记忆检索，也会让「记忆是否有效」这项指标失效。NanoClaw 上用 `/manage-channels` 决定「各自独立 agent / 共享一个 agent / 折叠成单一共享会话」时同理——共享记忆是便利，也是污染源，先按隔离跑。Comma 上同理：Task 是持久状态、会话只是界面，但一个 Task 里混进太多目标，看板就分不清它到底卡在哪一步。做法 F 上同理：一个 brief 只盯一个来源、只发一个收件人，加第二个源之前先确认第一个不会重发也不会漏报。做法 G 上同理：先把 `niche.json` 写窄一点，别一次塞进五个不相关的关键词簇，否则 outlier 报告会混进你根本不看的领域。做法 H 上同理：一个 bot 先只跑一类任务，别把多个 routine 塞进同一个 bot，否则 overlap 与 catch-up 的行为更难判断。

## 证据与来源

- **做法 A 的全部命令**（安装脚本、`uv tool install nanobot-ai`、`nanobot webui`、`nanobot gateway --background` 及管理命令、`nanobot --session/--workspace`、`nanobot -m`）：来自 HKUDS/nanobot 调研，均为 README 原文命令。该项目自述 MIT 协议、最新版本 v0.3.5，平台支持覆盖 macOS 13+、glibc 2.17+ Linux、Windows x64（x64 要求 SSE4.2）。
- **做法 B 的全部命令**（run.sh / run.ps1 / docker compose、`cow` CLI、`/skill` 斜杠命令、`cow install-browser`、控制台端口 9899、`config.json` 的 `web_host`/`web_password`）：来自 zhayujie/CowAgent 调研，均为 README 原文。该调研给出可核事实：MIT 许可、仓库自报 47192 stars、版本序列到 v2.2.0（2026.09.30）；并引用原文的风险声明：Agent 模式 token 消耗显著多于普通对话、Agent 可访问本机操作系统只能在可信环境部署。
- **做法 C 的全部命令**（`git clone` + `npm install` + `npm run dev` 快速开始、前端 `npm install` / 后端 `uv sync` 的依赖同步）：来自 eigent-ai/eigent 调研，均为 README 原文。可核事实：Apache 2.0 许可、仓库约 15,457 stars、技术栈为 FastAPI + uv + Uvicorn + CAMEL 后端与 React + Electron + TypeScript + Tailwind/Radix 前端（流程编辑器用 React Flow）。「单 agent 适合聚焦任务 / Workforce 适合复杂多步并行」是 README 的划分，**没有给出选择规则**；「本地部署包含本地后端、本地模型集成 vLLM/Ollama/LM Studio、与云服务完全隔离、零外部依赖」是 README 的定位描述，**具体命令在未提供的 `server/README_EN.md`**；Automation 只有一句功能描述，**未给调度配置格式**；用例库只有标题 + 一句描述 + 链接，**步骤在官网 guide**。
- **做法 D 的全部命令与机制**（`git clone ... nanoclaw-v2` + `bash nanoclaw.sh`、`migrate-v2.sh` 与 `NANOCLAW_V1_PATH`、`@Andy` 三个示例提示词与 `list/pause/join` 管理指令、`/customize`、`/add-telegram` `/add-codex` `/add-opencode` `/add-ollama-provider`、`.env` 的 `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`、`/manage-channels` 与 `docs/isolation-model.md`、`ncl groups create --template`、`NANOCLAW_NO_DIAGNOSTICS=1`、`bash nanoclaw.sh --uninstall` 及 `--dry-run`/`--yes`）：来自 nanocoai/nanoclaw 调研，均为项目 README 原文。可核事实：仓库 30866 stars（仓库指标，不构成质量或效果证据）。架构描述（Node 宿主进程 + 每个 agent group 独立 Docker 容器；消息经「用户 → 消息群 → agent group → 会话」路由写入 `inbound.db` 唤醒容器；容器内 agent-runner 用 Bun + Claude Agent SDK 轮询、执行、写 `outbound.db`，宿主再轮询并投递回聊天工具；每会话两个 SQLite 文件、各自单一写入者、不走 IPC 也不走 stdin；宿主有 60 秒 sweep，见 `src/host-sweep.ts`）以及容器文件系统隔离、凭据网关注入并支持按 agent 的策略与限流、每个 agent group 有自己的 `CLAUDE.md`/记忆/容器，均来自 README 自述。**定时任务 script gates 的具体写法、`docs/` 各文档的细节，原文只有链接没有正文，无法据此照做。定时任务与 `ncl` 的示例来自 README，未附效果数据。**
- **做法 E 的全部命令与机制**（`cp .env.example .env`、`docker compose up -d --build`、`pnpm install` + `make dev`、`make dev-electron`、`make test-clients`/`make test-systems`/`make test-policy`、界面端口 8080/8082/8081/4000(dash)/8025、`.env` 环境变量表、五个 named volume `config`/`postgres`/`objects`/`clickhouse`/`redis`、`systems/DEPLOYMENT.md#self-hosted-compose`、mock 模型的 `comma-local@example.com` 登录方式）：来自 AFK-surf/Comma 调研，均为 README 原文。可核事实：AGPL-3.0-only，修改后对外提供服务需保留 `/source.tar.gz` 下载；贡献需签 AFK AI, Inc. CLA；仓库星标 172（来自本次线索 metrics，不构成效果证据）。运行时主要为 Elixir/OTP，关键系统组件用 Lean，核心分布式协议用 TLA+ 模型检查；每个 agent 是 Erlang VM 上一个独立进程，失败即重启、其余 agent 继续跑；Salix 已接受的消息在重启后仍存活；被中断的写操作不会自动重跑。**原文明确声明：形式化验证不证明模型判断或任务成功，它只验证「即使出错，运行时仍按我们设计的规则行事」。**
- **做法 F 的全部命令与配置**（`claude update`、`/claude-api managed-agents-onboard <文章链接>`、`ant apply vault.yaml`、用 TypeScript SDK 往 vault 里加凭据的片段、`daily-brief/` 的八个文件、`agent.md` 的 frontmatter 与第 4/5 条运行步骤原文、`deployment.md` 的 cron/`timezone`/`vault_ids`/`resources`、bash + curl 发 Slack 的调用、bookmark 与 ledger 存在 `state` memory store 的 `runs/<date>.md`、源失败三条规则、幂等三规则）；来自 claude.dev 的 reference implementation 走查《Building effective agent automations》（作者 Lance Martin、CJ Avilla，2026-10-08），均为原文。参考实现仓库里是**八条**运行步骤，本次材料只摘录了**第 4 条和第 5 条**原文；原文在「部署」一节被截断，**没有可照抄的部署命令**。文章自述这是起点，需要按自己的来源、目的地、偏好改写；Managed Agents 处于 beta。
- **做法 G 的全部命令与配置**（`git clone https://github.com/manthanpatelll/instagram-research-tool.git` + `cd` + `claude`、`/research-setup`、`npm run library` / `npm run sample-report` / `npm run selftest`、五个日常动作与斜杠命令 `/outliers`、`/reel-research inbox`、`/reel-research <reel link>`、`claude -p "/reel-research inbox"` 与 `claude -p "/outliers"`、`config.json` 八个字段的默认值与作用、`niche.json` / `voice.md` / `inbox.txt` / `.env` 四类供给物、四个数据源的能力与成本对照）：来自 manthanpatelll/instagram-research-tool 调研，均为 README 原文。可核事实：MIT 许可，npm 零依赖，Node 18+，仓库仅 31 stars（不构成效果证据）；产出含八个板块（Numbers / Transcript / Hook / Format / Angle / Visual breakdown / Scroll stoppers / My version）；每日搜索约 70 次；outlier 窗口默认 24 小时、上限 48 小时、合格 reel 少于 15 条才放宽；最低播放量阈值 2000；成本数字（Sandcastles 起 $49/月、每条新 reel 分析 1 credit、Apify 每条不到 1 美分、一次完整每日搜索约 $1.70、Apify 每月 $5 免费额度、yt-dlp 免费）；ffmpeg 用于逐帧拆解（`frames.mjs` 切 contact sheets），Whisper 用于无字幕转写。**局限**：所有功能描述、"the breakdown is the same whichever one you pick"、"about 10 minutes" 的设置时长均为作者主张，未附独立验证；README 截图明确标注 "Screenshots use synthetic sample data"，没有真实使用前后的对比、省时数据或产出质量评估；只依据 README，未看到代码实现，无法确认脚本、skill 提示词与文档一致；cron / launchd 的具体写法在 `docs/iphone-shortcut.md`，本次材料未含该文档正文。合规声明（从不登录 Instagram、不用 cookies/session、不用你的账号抓取；下载视频仅本地分析、不得重发；"My version" 保存前检查抄袭短语）同样来自 README 自述。
- **做法 H 的全部命令与机制**（Release 下载 `.dmg` + 拖入 `/Applications`、Gatekeeper 三步、`xattr -dr com.apple.quarantine /Applications/touri.app`、`bun install` / `bun run build:sidecar` / `bun run tauri build --bundles app` / `open src-tauri/target/release/bundle/macos/touri.app`、开发模式 `bun run build:sidecar && TOURI_SIDECAR_BIN="$PWD/src-tauri/binaries/touri-sidecar-aarch64-apple-darwin" bun run tauri dev`、验证链 `bun run typecheck` / `bun run lint` / `TOURI_BROWSER_HEADLESS=1 bun test sidecar/test` / `(cd ui && bunx vitest run && bunx vite build && bunx playwright test)` / `(cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings)`、真实 CLI 冒烟 `TOURI_E2E_REAL_CLI=1 bun test sidecar/test/runtime/real-cli.test.ts`、导入器 dry-run 命令与 `--bot` / `--cwd-map` 参数、`TOURI_UI_TOKEN=dev-ui-token bun run sidecar/src/main.ts serve`、`bun run sidecar/src/main.ts mcp-stdio --thread <thread-id>`、审批模式 `on-request`/`workspace-write`/`full`、MCP gateway 逐线程 token、computer use 可见指示器与 kill switch、bot machine 通过 Apple `container` 起隔离 Linux VM、`packages/contracts/` 契约规则）：来自 touri-ai/touri 调研，均为 README 原文。可核事实：Apache-2.0，仓库 35 stars（不构成效果证据）；技术栈为 Tauri v2（Rust shell）+ Bun sidecar + React UI；数据存在 `~/Library/Application Support/touri` 下的 SQLite，无遥测、无需账号，凭据放 macOS Keychain，不进数据库、日志或导出，可选云托管是单独 opt-in 协议（`docs/protocol/cloud-v1.md`）；安装要求 macOS 14+、Apple Silicon、已登录 Codex 或 Claude Code CLI；bot machine 需 macOS 26 + Apple `container` >= 1.5.0；源码构建需 Bun 1.2.21+、Rust 1.90+ 带 `aarch64-apple-darwin` target；Release 未签名、未公证，签名、公证和 updater 已接线但被关闭（见 `docs/DECISIONS.md`）。**局限**：README 没有说明在 UI 里如何新建 bot、如何写 routine 的调度配置、overlap 与 catch-up 的具体参数怎么填；所有功能声明（persistent bots、routines 带 overlap 和 catch-up 控制、agent browser 带人工接管、computer use 带可见指示器和 kill switch）均无截图、演示、案例或效果数据；OpenCode 支持在 README 正文标题与 Features 里依据较弱；agent browser 是否基于 Playwright 未知，不能推断。
- **最小闭环与判断指标**：「只配一个模型 + 一个技能 + 一个定时任务」「连续处理同类任务 5–10 次」「按时完成率 / 人工介入次数 / 耗时与返工 / token 成本 / 技能复用次数 / 记忆有效性」「1–2 周」「跑两周」「降级为 watch 的条件」，来自 nanobot 与 CowAgent 两份调研的结论与验证建议；「人工耗时对比 / 首次通过率 / 调度可靠性 / 数据边界 / 失败可诊断性」「先 Quick Start → 换本地模型验证数据边界 → 再试 Workforce → 最后试 Automation」「只有人工时间明显下降且返工比例可接受才纳入日常工作流」来自 Eigent 调研的验证建议；「在可丢弃的环境里小范围试、只接一个频道、配一到两个可人工核对的定时任务跑两周」「排障交给 Claude Code 或 `/debug`」「用 `/uninstall` 干净回滚」来自 NanoClaw 调研的验证建议；「先用 `make dev` 跑通，再按 compose.yaml 自建单机实例，把一个真实的长周期任务交给 Task + Loop 跑一两周」「栈很重，不宜直接采用」「除运行时形式化验证外没有任何任务成功率或效果数据」来自 Comma 调研的结论；「在单一来源 + 单一收件人 + 每日一次的最小场景里试跑一个定时 brief」「用手动触发而非等排期来验证」「用 bookmark 而不是固定时间窗口」「源失败时不动 bookmark、其余源照常写、末尾点名没读到的东西」「先查重、确认成功才记账、不明确标 maybe posted」「只用『读者今天会因此行动』这一条标准取舍条目」「发布前复核」「链接从源自己的 link 字段复制」「调度时区与正文时区要分别写清」来自做法 F 的调研；「先跑 `selftest` 与合成样本判断产出结构」「用免费 yt-dlp 验证单条流水线」「想要雷达再上 Apify」「把缺失数字留空而非编造」「先手动跑 `/outliers` 再挂 cron」来自做法 G 的调研；「在符合条件的机器上装 touri，用 routines 和审批模式跑一个低风险重复任务做小范围验证」「只配一个 runtime」「只建一个 routine」「审批模式先用 `on-request`」「先不开 computer use 和 bot machine」「用 H-3 验证链判断软件是否正常工作」来自做法 H 的调研。这些都是调研作者给出的自建方法，不是项目官方提供。
- **只是作者主张**：nanobot 的「小而可读」内核、Dream 长期记忆、多智能体委派的实际效果；CowAgent 的「proactively plans」「self-evolution」「grows alongside you」「Agent Harness engineering 的参考实现」、记忆分层与 Deep Dream 蒸馏、知识库自动整理、Self-Evolution 的具体效果；Eigent 的「boosts productivity」「exceptional productivity」「turn your most complex workflows into automated tasks」「Zero Setup」；NanoClaw 与 OpenClaw 的对比数字（行数、配置文件数、依赖数、安全层级）以及「代码小到 Claude 能安全修改」；Comma 的「sessionless / relentless / swarm intelligence」效果性表述、24/7 持续完成目标、「你管目标不管 swarm」，以及示例视频（购物比价与结账、交付工作与生活）；做法 F 的「一条过期的 still waiting on you 比十条漏掉的条目更伤信任」以及整套条目取舍规则的收益；做法 G 的「数据源只取事实、分析全交给 Claude Code，所以换数据源不改变拆解质量」、"about 10 minutes" 的设置时长、以及整套拆解板块的实际价值；做法 H 的 persistent bots、routines 带 overlap 和 catch-up 控制、agent browser 带人工接管、computer use 带可见指示器和 kill switch——均无案例、基准或第三方评测支撑，各份调研都明确标注为自述、判断或矛盾表述。
- **项目间关系**：nanobot 的 `nanobot gateway` 自述对 OpenClaw 用户是熟悉的入口；CowAgent 的 Skill Hub 声明技能可用于 CowAgent、OpenClaw、Claude Code 等，两者技能格式互通、可共用技能资产；NanoClaw 原生使用 Anthropic 官方 Claude Agent SDK（是 Claude Code 的容器化 + 常驻化外壳），并把 OpenClaw 作为对比对象，同时可通过 `/add-opencode` 接 OpenRouter / Google / DeepSeek、通过 `/add-ollama-provider` 接本地开源权重模型；Eigent 只声明定位与 Claude Cowork / Codex 相似，无迁移或兼容性说明；Comma 调研明确把 Claude Code（清单中 kind: tool、status: adopt）当作被编排对象——Codex、Claude Code 等可「像应用一样被调用」，也可注册为 Worker / Sub-agent，因此 Comma 与 Claude Code 是互补关系，手册里把它描述为「常驻调度层」而不是又一个编码 agent；做法 F 的调研没有提到清单中其他条目，它与 Claude Code 的关系是「用 Claude Code 里的 `claude-api` skill 生成起点文件」，运行本身在 Anthropic 托管平台上；做法 G 的调研明确说清单中已有 Claude Code（adopt），本工具是建立在它之上的一个具体 skill 套装，可作为把 Claude Code 用于内容 / 媒体分析场景的参考实现；做法 H 的调研明确把 Claude Code 作为 runtime 接入，touri 不是替代品而是编排/外壳层，在其上加常驻 bot、记忆、routines、逐线程 MCP token 与 VM 隔离，两者是叠加关系；OpenCode 在 touri README 正文标题与 Features 里依据较弱，与其 watch 状态一致；Playwright Test 在 touri 仓库验证链里被实际使用，但 agent browser 是否基于 Playwright 未知。各份调研都没有给出这些项目之间的直接对比测试，因此本手册不比较优劣，只按形态偏好、渠道需求与托管 / 自托管的取舍选一个。

## 依据的调研

- [HKUDS/nanobot](../research/radar/2026-10-02/551-hkuds-nanobot.md)：值得一试，建议小范围试用：本地装好 nanobot、接一个模型，把一件周期性重复的工作配成 automation 跑两周，再用“定时投递成功率 + 人工返工时间”判断是否值得纳入日常工作流；理由是 README 给出了完整可复制的安装、首次配置、常驻网关和定时任务步骤，但没有任何效果数据或对比案例支撑。
- [zhayujie/CowAgent](../research/radar/2026-10-02/552-zhayujie-cowagent.md)：值得一试，建议小范围试：在可信的本地/服务器环境用原文给出的一行命令部署 CowAgent，跑通“一个模型 + 一个技能 + 一个定时任务”的最小闭环，再决定是否扩用；理由是原文提供了可直接复制的安装、cow CLI、技能安装与 MCP/调度/多模型路由的配置骨架，但完全没有具体工作场景的流程、提示词或效果数据，且 Agent 模式成本高、有本地系统权限风险。
- [eigent-ai/eigent](../research/radar/2026-10-02/577-eigent-ai-eigent.md)：值得一试，建议小范围试：按 README 给出的命令把 Eigent 桌面端跑起来，先在一个周期性、输入输出明确的任务（如每月汇总 PR 生成报告）上验证「多 agent 并行 + 定时自动化」是否真能减少人工；理由是原文给了可照做的安装与更新命令、明确的单 agent/多 agent 分工和本地部署选项，但完全没有给效果数据，所以不能直接 adopt。
- [nanocoai/nanoclaw](../research/radar/2026-10-02/583-nanocoai-nanoclaw.md)：值得一试，建议在一个可丢弃的环境里小范围试：按 README 的 nanoclaw.sh 一键装好，只接一个频道、配一到两个可人工核对的定时任务跑两周，因为它给出了可照抄的安装/使用/调试/卸载流程和容器级隔离，但全部依据仅来自项目 README，没有效果数据或第三方验证，且定制方式是改代码。
- [AFK-surf/Comma](../research/radar/2026-10-05/1312-afk-surf-comma.md)：值得一试，先用 `make dev`（内置确定性 mock 模型、无需 API key）在本机跑通，再按根目录 compose.yaml 自建单机实例，把一个真实的长周期任务（如仓库/收件箱监控）交给它的 Task+Loop 机制跑一两周；README 给出了可直接照做的部署步骤、完整环境变量表和权限开关，适合作为“常驻代理 + 工具权限供给 + 触发式推进”的试点对象，但它除运行时形式化验证外没有任何任务成功率或效果数据，且栈很重，不宜直接采用。
- [Building effective agent automations](../research/radar/2026-10-09/2065-building-effective-agent-automations.md)：值得一试，先按文中六条规则和参考实现的文件结构，在“单一来源 + 单一收件人 + 每日一次”的最小场景里试跑一个定时 brief（用 /claude-api managed-agents-onboard 起步、用手动触发而非等排期来验证），因为它给出了可复制的配置、命令和失败模式清单，但仍属 beta 且强依赖 Anthropic 托管平台，幂等性、漏读上报和成本上限都需自己实测。
- [manthanpatelll/instagram-research-tool](../research/radar/2026-10-13/2840-manthanpatelll-instagram-research-tool.md)：值得一试，可以小范围试：它给出了可照做的完整流程（clone、`/research-setup` 向导、日常斜杠命令、`config.json`/`niche.json`、cron/launchd 定时），把「Claude Code + 外部数据源 + skill + inbox + 每日雷达」这套可迁移模式落到具体配置；但依赖付费数据源、效果数据缺失、截图是合成样本，先小范围验证再决定是否写进手册。
- [touri-ai/touri](../research/radar/2026-10-16/3983-touri-ai-touri.md)：值得一试，在符合条件（macOS 14+ Apple Silicon、已登录 Codex/Claude Code CLI）的机器上装 touri，用它的 routines（cron 调度 bot）和审批模式跑一个低风险重复任务做小范围验证；理由是该仓库给出了可复制的安装、构建、验证与导入命令，且提供了常驻代理、定时触发、逐线程 token 与隔离 VM 这些正对研究问题 3、4 的具体机制，但它未签名、文档未展开配置细节、仅有 35 stars，所以先小范围试而非直接采用。
