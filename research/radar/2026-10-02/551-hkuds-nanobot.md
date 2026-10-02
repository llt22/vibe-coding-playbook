# HKUDS/nanobot

- 结论：**值得一试**。建议小范围试用：本地装好 nanobot、接一个模型，把一件周期性重复的工作配成 automation 跑两周，再用“定时投递成功率 + 人工返工时间”判断是否值得纳入日常工作流；理由是 README 给出了完整可复制的安装、首次配置、常驻网关和定时任务步骤，但没有任何效果数据或对比案例支撑。
- 原文：https://github.com/HKUDS/nanobot
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T06:27:23.406Z

## 是什么

nanobot（HKUDS/nanobot）是一个用 Python 写的超轻量、开源、可自托管的个人 AI agent 框架，MIT 协议，最新版本 v0.3.5。它可以在浏览器 WebUI、终端 TUI 或聊天应用里运行，把工具调用、长期记忆、MCP 集成、模型路由、多智能体委派、定时自动化和一个 OpenAI 兼容 API 收在一个作者自称“小而可读”的内核里。

架构上它刻意保持极简：消息从聊天渠道进来，由 LLM 决定何时调用工具，记忆和技能只作为上下文按需拉取，而不是做成一层沉重的编排系统。

README 给出的能力清单（原文表述）：
- 在 WebUI 或终端运行
- 连接 Telegram、Discord、Slack、微信、Email、Mattermost、Linear 等渠道
- 使用文件、shell、网页搜索、网页抓取、MCP、cron、图像生成、subagents 等工具
- 通过 Dream 保留会话历史和长期记忆
- 运行长周期目标和定时自动化
- 暴露 Python SDK 和 OpenAI 兼容 API
- 作为长期运行的本地或服务器端 agent 网关部署

需要说明：以上均为项目自述，原文没有性能数据、对比测试或第三方案例。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 1. 安装（前提：Python 3.11 或更新；源码安装额外需要 Git 和 Bun）

只选一种安装方式。想要最稳定就用 PyPI/uv，想跟最新特性就用源码。

一键安装，macOS / Linux：

```bash
curl -fsSL https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.ps1 | iex
```

不改动环境、只看安装计划（dry-run）：

```bash
curl -fsSL https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.sh | sh -s -- --dry-run
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/HKUDS/nanobot/main/scripts/install.ps1))) --dry-run
```

用 uv 安装：

```bash
uv tool install nanobot-ai
```

用 pip 安装：

```bash
python -m pip install nanobot-ai
```

如果 pip 报 `externally-managed-environment`，改用一键安装器、`uv tool install nanobot-ai`、`pipx install nanobot-ai`，或装进虚拟环境。

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

之后命令与稳定版一致；`git pull --ff-only` 会同步更新 Python、TUI、WebUI 源码，依赖变化时重跑 `python -m pip install -e .`。

验证安装：

```bash
nanobot --version
```

如果 `nanobot` 不在 PATH 上，用安装它的方式调用，例如 `uv tool run --from nanobot-ai nanobot ...` 或 `pipx run --spec nanobot-ai nanobot ...`。

平台支持（原文）：平台 wheel 同时含 WebUI 和原生终端 UI，覆盖 macOS 13+（Apple Silicon 和 Intel）、glibc 2.17+ Linux（ARM64 和 x64）、Windows x64；x64 运行时要求 SSE4.2。其他平台用 `nanobot --classic` 或 WebUI。

完全不懂终端/API key/配置文件的人，README 指向 `docs/start-without-technical-background.md` 的引导式教程。

### 2. 首次运行并配置模型（前提：安装完成）

```bash
nanobot webui
```

这是作者推荐的第一次运行方式。启动器会按需创建配置和工作区，在确认后安全启用本地 WebSocket 通道，启动或加入共享本地网关，并打开 `http://127.0.0.1:8765`。首次运行默认只绑 localhost，不暴露到局域网。

前三个动作（原文）：
1. 打开 **Settings → Models**，选择 provider、凭据和模型。
2. 新建一个 topic，发送 `Hello!` 验证连接。
3. 做正式项目之前，先在输入区选择目标 workspace 和 access mode。

任何正常回复就说明 provider、模型、workspace 和浏览器网关已经打通。

### 3. 让它在关掉终端后继续运行（前提：先用 `nanobot webui` 完成首次模型配置）

```bash
nanobot gateway --background
```

README 明确说这是**唯一**会把共享网关提升为持久后台模式的命令，它让渠道和自动化在所有本地 TUI/WebUI 启动器退出后仍然运行。管理命令：

```bash
nanobot gateway status
nanobot gateway logs
nanobot gateway restart
nanobot gateway stop
```

网关优先的工作流（跳过 WebUI 配置和开浏览器）：

```bash
nanobot gateway
```

作者说明这是从 OpenClaw 过来或本来就把 agent 当长驻服务跑的人熟悉的入口。

### 4. 在终端里工作（可选路径）

```bash
nanobot
```

以启动目录作为 workspace 打开原生终端客户端，和 WebUI 共享已保存的会话和本地网关。常用交互（原文）：
- 输入 `/` 发现命令，`/sessions` 切换会话，`@` 提及某个 app、MCP 服务器或已保存会话
- `Ctrl+V` 或 `Alt+V` 粘贴剪贴板图片，`$` 补全 skill 引用
- `/diff` 查看文件改动，`/context` 查看会话上下文，`/branch` 从一条已完成的回复分叉出新会话
- 工作时 `Enter` 立即发送，`Tab` 在当前回复结束后发送，`Shift+Enter` 换行（`Ctrl+J` 备用）
- `/detach` 让当前任务继续跑

会话与工作区参数：

```bash
nanobot --session <会话> --workspace <工作区>
```

一次性执行（适合快速验证 provider、写进 shell 脚本和本地自动化）：

```bash
nanobot -m "Hello!"
```

### 5. 把工具接进对话（Apps / MCP / Skills）

在 WebUI 里用 **Apps** 连接 MCP 服务器、启用 Agent Plugins、管理本地 CLI App 适配器：加一个预设或自定义服务器，然后用 `@` 把可用工具挂上。**Skills** 提供可复用指令；**Settings** 放模型、语音、图像、网页和聊天渠道配置。

### 6. 配一个周期性自动化（前提：网关保持运行）

README 给出的操作方式：在**你希望接收结果的那个 topic 里**让它创建 automation；用 **Tasks** 查看和管理日程，用 **Calendar** 按日期扫描已完成和即将执行的运行；本地触发器可以让脚本按需启动一个已保存的任务。作者强调：定时投递要生效，必须让网关一直运行。

### 7. 部署为常驻服务（可选）

Render 一键部署（使用仓库里的 Blueprint）：会要求填 `ANTHROPIC_API_KEY` 和一个私有的 `NANOBOT_WEB_TOKEN`，并为会话、记忆、WebUI 历史准备持久存储；持久磁盘需要付费 Render 服务。自托管则按 `docs/deployment.md` 做 Docker、Docker Compose、Linux service、macOS LaunchAgent。

### 8. 集成到自己的脚本/系统

用 OpenAI 兼容 API（`docs/openai-api.md`）或 Python SDK（`docs/python-sdk.md`），把 nanobot 接进本地工具和自动化。

### 9. 控制上下文与隐私的用法细节

- 不同任务/项目用不同 topic 分开；临时对话用 **Temporary chat**，它不写入历史或长期记忆，连接关闭即结束，使用默认 workspace 且处于 Restricted 模式。
- 一个 workbench 里最多并排放四个会话（列、行、网格或主副面板），每个 topic 保留自己的历史；从 `@` 菜单选另一个 topic 或拖进输入区，就能让 agent 读取其上下文并跨会话协调。
- **Settings → Appearance → File edit display** 切到 **Diff** 可看行内补丁；输入区的上下文指示器显示当前上下文大小、每轮输入 token，以及 provider 上报的缓存复用。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
原文给出了一份可交给它的能力清单，但都是能力类别而非具体工作：文件操作、shell、网页搜索、网页抓取、MCP 工具、cron、图像生成、subagents（多智能体委派）、长期记忆（Dream）、长周期目标、定时自动化、Python SDK / OpenAI 兼容 API。这些是“还没想到交给 AI 的工作”的候选池——凡是落在“读文件/跑命令/查网/按计划重复/拆给多个子代理”形态的工作都可以往这里套，但原文没有给出任何具体行业或岗位的示例。

**2. 任务匹配**
原文给的是工具侧的匹配机制，不是任务分类学：
- 模型路由 + fallback models，支持 OpenAI 兼容 API 和本地 LLM（Ollama、vLLM 或其他兼容服务器），有 Provider Cookbook 和 Providers 文档
- WebUI 里可以为每个任务单独选 project、access mode 和 model
- 需要并行对比时最多四会话并排
- 多智能体委派（subagents）处理可拆分的活

**3. 条件供给**
原文明确列出的前置条件：
- 选择目标 workspace 和 access mode（做正式项目前必须先定）
- provider 凭据；部署场景还要 `ANTHROPIC_API_KEY` 和 `NANOBOT_WEB_TOKEN`
- 通过 Apps 接入 MCP 服务器和本地 CLI 适配器，才有个性化工具
- Skills 提供可复用指令
- 要按时投递就必须让网关常驻（`nanobot gateway --background`）
- 配置项覆盖 provider、fallback、Langfuse、MCP、web 工具、安全（`docs/configuration.md`）

**4. 主动推进**
这是原文着墨较多的一条：Automations 按日程运行，可以在“接收结果的那个 topic”里直接创建；Tasks 管理日程、Calendar 按日期看已完成与即将执行的运行；本地触发器让脚本按需启动已保存任务；cron 作为内置工具；还支持“长周期目标”。前提条件说得很清楚：网关必须一直在跑，否则定时投递不生效。

**5. 效果验证**
原文在这一条上很弱，只有可观测性，没有结果验证方法：WebUI 可展开查看推理过程、工具调用、文件改动、差分、命令输出和产出物；上下文指示器显示上下文大小、每轮输入 token 和缓存复用；有上下文压缩（compaction）的时间线；可在配置里接 Langfuse。没有任何关于“怎么判断工作变好了”的指标、基线或评估方法。

## 与已有做法的关系

清单中相关条目是 **OpenClaw（tool，status: watch）**。

原文有一处直接对照：`nanobot gateway` 被描述为“如果你来自 OpenClaw，或者本来就把 agent 当作长驻服务来运营，这是你熟悉的入口”，说明 nanobot 与 OpenClaw 属于同一类“长驻 agent 网关”做法，是同类需求的另一个实现。

相对的差异（基于原文自述）：nanobot 强调内核小、可读、可自托管，把 WebUI + 终端 workbench + MCP Apps + Skills + Automations + 多会话分栏打包在一个 Python 包和平台 wheel 里；支持多渠道（Telegram、Discord、Slack、微信、Feishu、Email、Mattermost、Linear、Teams）；提供 Python SDK 和 OpenAI 兼容 API；一键部署到 Render 或自托管 Docker/Linux service/LaunchAgent。

如果手册里已经有 OpenClaw 条目，nanobot 可作为“同一模式的更轻量替代实现”并列写入，供读者按自托管偏好和渠道需求二选一，而不是当作新方法叠加。

## 证据与局限

**原文给出的可核对信息：**
- 完整的安装命令、安装方式对照表、平台与版本要求（Python 3.11+、macOS 13+、glibc 2.17+、Windows x64、SSE4.2）
- 完整的启动/网关/一次性执行命令，以及 dry-run 预览方式
- WebUI 地址 `http://127.0.0.1:8765`，首次绑定 localhost
- 最新版本 v0.3.5 及其功能说明；若干条带日期的更新记录（2026-09-07 至 2026-09-19）
- MIT 许可证

**只属于作者主张、没有数据支撑的部分：**
- “ultra-lightweight”“small core”“readable internals”等定位描述
- 各项能力的实际稳定性和效果（工具调用、记忆质量、多智能体委派、定时可靠性）
- WebUI 截图中的对话、token 数量和日程，原文已注明是示例/示意，不可当证据
- 架构图中“记忆和技能只按需作为上下文拉取”的效率优势，没有基准数据

**适用条件与风险：**
- 需要自己准备 provider 凭据和模型，README 不包含任何开箱即用的模型配额
- 定时自动化强依赖网关常驻；本地机器关机或网关停止就断
- agent 拥有文件、shell 等工具权限，access mode 和 workspace 的选择是主要的安全边界，需要用户自己设置；README 提到安全配置在 `docs/configuration.md`，但正文没有展开
- 原文是一篇 README，抓取内容基本完整（末尾的贡献者头像列表被截断，不影响正文），但它是项目自述文档，不是独立评测

## 怎么试、怎么验证

**最小试用（建议 1–2 周，单机）：**

1. 用 `--dry-run` 先看清安装器要做什么，再正式安装；`nanobot --version` 确认成功。
2. `nanobot webui`，在 Settings → Models 接一个你已有的 provider 和模型，新建 topic 发 `Hello!` 确认通路。
3. 挑**一件真实存在的周期性重复工作**（例如每周汇总某个目录下的文件、定期抓取几个网页并整理），在“你希望收到结果的那个 topic”里创建 automation，时间设成每周或每天一次。
4. `nanobot gateway --background` 让它常驻，第二天用 `nanobot gateway status` 和 WebUI 的 Calendar 确认第一次定时运行是否真的完成。
5. 两周内不要给它 shell 权限做破坏性操作；先用受限 workspace，敏感内容放 Temporary chat。

**判断有没有改善的指标（都可以从现有功能读出）：**

| 指标 | 从哪里看 | 判断标准 |
|---|---|---|
| 定时投递成功率 | Automations → Calendar 的已完成 vs 错过 | 无人工干预的按期完成比例 |
| 人工返工量 | 对比自己从零做同一件事的时间 | 明显下降才算改善 |
| 产出被采纳率 | 你实际使用了多少次它生成的结果 | 低于半数说明任务选错了 |
| 工具调用是否真被执行 | WebUI 展开 agent activity 看 tool calls、文件改动、命令输出 | 有实际动作，而不是只回复文字 |
| 成本与上下文效率 | 输入区上下文指示器的 token 和缓存复用、Langfuse | token 不随会话无限膨胀 |

**基线对照**：试用前先记录这类工作你原来花的时间和出错率，试用后同样记两周，做同口径比较。如果两周内定时投递成功率低、或每次产出都要大幅度人工修改，就说明当前任务不适合，换任务或降低 verdict 为 study。

**不建议的用法**：把 README 里的能力清单直接当成“AI 能做的事”写进手册——清单是能力类别，具体哪些工作值得交出去，必须靠上面这种小范围实测得出。
