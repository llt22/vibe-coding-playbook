# zhayujie/CowAgent

- 结论：**值得一试**。建议小范围试：在可信的本地/服务器环境用原文给出的一行命令部署 CowAgent，跑通“一个模型 + 一个技能 + 一个定时任务”的最小闭环，再决定是否扩用；理由是原文提供了可直接复制的安装、cow CLI、技能安装与 MCP/调度/多模型路由的配置骨架，但完全没有具体工作场景的流程、提示词或效果数据，且 Agent 模式成本高、有本地系统权限风险。
- 原文：https://github.com/zhayujie/CowAgent
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T06:27:40.283Z

## 是什么

CowAgent（原名 `chatgpt-on-wechat`）是一个开源“超级 AI 助手”，作者自称是 **Agent Harness engineering 的参考实现**。README 描述它能：主动规划任务并逐步执行（循环调用工具直到达成目标）、控制本机与外部服务、创建并运行 Skills、构建个人知识库与长期记忆、组织多智能体团队、通过自我进化在日常使用中成长。

定位与形态：

- 轻量、易部署、可扩展；可接任意主流 LLM，7×24 跑在个人电脑或服务器上。
- 覆盖 Web 与主流 IM 渠道（微信、飞书、钉钉、企微、QQ、公众号、Telegram、Slack、Discord 等）。
- 架构分层解耦：Channels 收消息 → Agent Core 结合记忆/知识/工具/技能做规划推理 → Models 生成回复 → 回原渠道。
- MIT 许可，仓库自报 47192 stars；README 声明不涉及加密货币。

## 具体做法（编号步骤）

> 前提：有一台可联网的 Linux/macOS/Windows 机器或服务器；准备好至少一个模型厂商的 API key（Web console 里配置，无需手改文件）。

**1. 安装（三选一，命令原样复制）**

Linux / macOS：

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

（脚本会处理依赖、配置与启动。）

**2. 打开 Web 控制台**

浏览器访问 `http://localhost:9899`。这是统一入口，用于对话、配置模型、接入渠道、安装技能、管理记忆。

**3. 服务器部署时改配置（前提：要让控制台可从外网访问）**

在 `config.json` 中：

- 把 `web_host` 设为 `0.0.0.0`
- 设置 `web_password` 保护控制台
- 在防火墙/安全组放行 `9899` 端口

**4. 用 cow CLI 管理服务**

```bash
cow start | stop | restart        # service control
cow status | logs                  # status and logs
cow update                         # pull latest code and restart
cow skill install <name>           # install a skill
cow install-browser                # install browser automation
```

**5. 安装与管理技能**

在对话里用斜杠命令：

```bash
/skill list                   # list installed skills
/skill search <keyword>        # search the marketplace
/skill install <name>          # one-click install
```

技能来源：Skill Hub（skills.cowagent.ai）、GitHub、ClawHub、任意 URL。也可以用 `skill-creator` 通过自然语言对话生成自定义技能，把任意工作流或第三方 API 变成可复用技能。

**6. 接入 MCP 工具生态**

前提：已有 MCP server。做法是准备一个 `mcp.json`，支持 stdio / SSE 传输、热重载、零代码接入。注意：README 没有给出 `mcp.json` 的字段示例，需查官方文档页 `/tools/mcp`。

**7. 需要图形桌面操作时**

```bash
cow install-browser
```

安装浏览器自动化能力（配套内置 `browser` 工具）。

**8. 可选：用桌面客户端代替自行部署**

从 cowagent.ai/download 下载 macOS / Windows 桌面客户端，后端已打包，开箱即用。

**9. 配置模型路由**

在 Web console 里为不同用途分别指定厂商：Chat、Vision、Image Generation、ASR/TTS、Embedding 可各自路由到不同供应商，一键切换。支持 DeepSeek、Claude、OpenAI、Gemini、MiniMax、GLM、Qwen、Kimi、Doubao、ERNIE、MiMo、LinkAI、自定义（本地模型/第三方代理）。

## 对应的研究问题

**1. 能力发现**（有依据，但停留在能力清单层面）

可交给它的原子能力（内置工具）：文件 I/O（`read`/`write`/`edit`/`ls`）、终端（`bash`）、文件发送（`send`）、记忆检索（`memory`）、环境变量（`env_config`）、网页抓取（`web_fetch`）、定时调度（`scheduler`）、网络搜索（`web_search`）、视觉（`vision`）、浏览器自动化（`browser`），另有 MCP 生态可扩展。更值得注意的“没想到交给 AI”的入口是：把日常重复工作流用对话式 `skill-creator` 固化成技能；以及把多个 Agent 组成团队分工协作。README 未给任何具体职业/场景案例。

**2. 任务匹配**（有依据）

- 按模态分厂商路由：Chat / Vision / Image Gen / ASR / TTS / Embedding 各自独立配置。
- Changelog 提到可配置模型列表、多个 fallback 模型（v2.1.9）、reasoning-effort 设置（v2.1.6）、更低的模型缓存成本（v2.2.0 称“更高的模型缓存命中率”）。
- 协作方式：Multi-Agent 团队（各 Agent 有独立角色、模型、技能、知识、workspace，可在同一会话中协作）、sub agents 并行任务委派（v2.1.6）。

**3. 条件供给**（有依据）

- 必须提供：模型 provider 与凭据（Web console 配置）；服务器场景下的 `web_host`/`web_password`/端口。
- 上下文与知识供给：三层记忆架构（对话上下文 → 日常记忆 → `MEMORY.md`），夜间 Deep Dream 蒸馏；个人知识库按主题自动整理成 Markdown wiki，自动维护交叉引用与索引，并带知识图谱可视化。
- 权限供给：会话级权限模式（v2.1.7）；MCP OAuth 授权（v2.1.4）；浏览器自动化需要 `cow install-browser`。
- 反馈供给：Self-Evolution 自动回顾对话、改进技能、跟进未完成任务、整合记忆与知识。
- 安全前提：README 明确说 Agent 能访问本机操作系统，只能在可信环境部署。

**4. 主动推进**（有依据）

- `scheduler` 内置调度工具，Web console 里可管理/手动创建定时任务（v2.1.2、v2.1.8）。
- 任务通知（v2.1.7）。
- Self-Evolution 自动跟进未完成任务；Deep Dream 在夜间自动蒸馏记忆。
- 可 7×24 常驻个人电脑或服务器。

**5. 效果验证**（依据很弱）

README 没有给出任何结果验证指标或方法。仅有的相关线索是过程性功能：上下文用量可视化（v2.1.8）、上下文压缩 `/compact`（v2.1.5）、模型缓存命中率提升（v2.2.0）。这些说明“用了多少”而非“是否改善”。验证方案需自行设计（见下节）。

## 与已有做法的关系

- **Harness Engineering（study）**：CowAgent 自称是 Agent Harness 的参考实现，README 给出 Channels / Agent Core / Models 三层架构图与解耦说明，可作为该概念的对照实例。
- **OpenClaw（watch）**：同属个人 Agent Harness 形态。其配套的 Cow Skill Hub 明确说明技能可用于 CowAgent、OpenClaw、Claude Code 等，两者技能格式可互通，可共用一套技能资产。
- **Claude Code（adopt）**：技能生态互通（同上）。定位互补：CowAgent 侧重跨 IM 渠道的个人常驻助手与本地/服务器 24/7 运行，Claude Code 侧重编码场景。
- **DeepSeek（try）**：模型表中支持 `deepseek-flash (V4.1)` / pro，可在 Web console 一键接入。
- **Trendshift（source）**：README 内嵌 Trendshift 仓库榜单徽章并链接到其页面对应 id。

## 证据与局限

**原文给出的可核事实**：MIT 许可；仓库自报 47192 stars；版本序列到 v2.2.0（2026.09.30）、v2.1.x 系列多版本；明确的安装/CLI/斜杠命令；明确的模型与渠道支持矩阵；一处明确风险声明（Agent 模式消耗显著多于普通对话的 token；Agent 可访问本机操作系统，只能在可信环境部署）。

**只是作者主张的部分**：“proactively plans”“self-evolution”“grows alongside you”“reference implementation of Agent Harness engineering”等均为自述；记忆分层与 Deep Dream、知识库自动整理、Self-Evolution 的具体效果没有案例或数据支撑；无第三方评测、无基准分数、无用户案例、无成本或时间节省数据。

**内容缺口**：原文只覆盖到安装与能力清单，没有给出任何一个具体工作场景的完整流程、提示词模板或验证方法；MCP 集成只有一句描述、没有 `mcp.json` 示例；技能创作只说“用对话生成”，没有演示。因此它更像“一个可试的平台”，而不是“一套可照抄的工作方法”。

**适用条件**：可联网、能跑容器或脚本的机器；有可用模型 API key（成本自担）；仅限可信环境；服务器暴露控制台时务必设 `web_password` 并限制端口。

## 怎么试、怎么验证

**最小试用（建议 1–2 周，单机 Docker 优先，便于清理）**

1. `docker compose up -d` 起一个实例，只开本地访问，先不要把 `web_host` 设为 `0.0.0.0`。
2. 在 `localhost:9899` 只配一个 Chat 模型（从清单里已有的 DeepSeek 或自选），不接多渠道。
3. `/skill search` + `/skill install` 装 1 个与你日常工作直接相关的技能；装不通就退回用 `skill-creator` 对话生成一个最小技能，范围限定在“一件你每周都要重复做的小事”。
4. 用 `scheduler` 建 1 个每日/每周定时任务（例如固定时间汇总某个信息源并推送），观察它是否在无人干预下完成。
5. 让它连续处理同一类任务 5–10 次，检查两次：一是任务是否完成，二是后续对话中它是否自动检索到了之前的记忆/知识（验证三层记忆与知识库是否真的起作用）。

**判断有没有改善的指标（自行建立基线，官方未提供）**

- 定时任务按时完成率，以及需要你人工介入的次数/单次。
- 单次任务的实际耗时与返工次数，对比“你自己做”或“用普通对话式 AI 做”的基线。
- Token 成本（README 明确警告 Agent 模式消耗显著更多），算清每完成一件任务花多少钱。
- 技能复用次数：同一技能被稳定调用多少次，如果一周内没有被重复调用，说明它没固化成产能。
- 记忆有效性：随机抽查后续会话，看它是否引用了正确的历史结论，而不是需要你重新交代背景。

**触发降级/放弃的条件**：一周内跑不出任何可复用的稳定产出；或 token 成本明显高于人工/普通对话方案；或必须开放外网与高权限才能用。出现任一情况，把该项目从 try 降为 watch，只在观察清单里跟踪。
