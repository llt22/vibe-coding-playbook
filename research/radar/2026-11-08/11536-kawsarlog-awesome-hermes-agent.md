# kawsarlog/awesome-hermes-agent

- 结论：**值得研读**。把这条线索当导航页用，不要当手册照抄：先按 README 的安装命令在一台机器上跑通，再逐篇读它指向的官方 skills/memory/cron/security 文档，确认哪些能落地；因为原文只有安装命令和链接索引，没有任何可复用的工作流、提示词或配置细节。
- 原文：https://github.com/kawsarlog/awesome-hermes-agent
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-08T07:10:50.791Z

## 是什么

- 这是一份**社区维护的 Hermes Agent 资源聚合清单**（awesome list），作者明确声明「Independent community list. Not an official Nous Research project.」，许可 CC0，仓库 30 stars。
- 它汇总的对象 [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) 被描述为「self-improving open-source agent」：保留记忆、学习技能、可在 Telegram/Discord/Slack/WhatsApp/Signal/Email/CLI 上对话、跑 cron 任务、支持 MCP、可部署在 VPS 或 serverless 沙箱上。
- README 的实际内容包括：安装命令、仓库内 `docs/` 指南目录（getting-started / skills / memory / tools-mcp / workflows / profiles / cron / prompt-library / security / deployments / limits 等 22 篇的**标题与链接**）、官方文档映射表（24 个主题 + 链接）、第三方视频教程表、社区与生态链接表（含 star 数）、FAQ、许可证。
- 关键事实：**本次材料只有 README 本身**，`docs/` 下那些指南的正文、官方文档正文、视频内容都没有被提供。所以能提炼的「可照做」内容仅限于安装级步骤与「按什么顺序读什么」的导航。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 前提：原文只给出安装与导航层面的步骤。技能、记忆、MCP、cron 的**具体配置方法在原文链接里，未包含在本次材料中**，下面不臆造。

1. **安装（macOS / Linux / WSL2 前提）**。前提：有 shell、能访问 `hermes-agent.nousresearch.com`。

```bash
# macOS / Linux / WSL2
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc   # or ~/.zshrc
hermes
hermes setup --portal   # or: hermes model
hermes doctor
```

原文对这段的顺序含义：先装 → 重载 shell → 启动 → 配 provider/模型（`--portal` 或 `hermes model`）→ `hermes doctor` 自检。

2. **Windows 原生安装**。前提：PowerShell。

```powershell
# Windows PowerShell (native)
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

3. **或者走桌面端**。原文给出 Hermes Desktop 链接，未给步骤。前提：不想碰命令行。

4. **按目的选阅读入口**（原文「Who is it for」表，照抄决策规则）：

| 你的目的 | 先读 |
|---|---|
| 第一次安装 | getting-started |
| 想按顺序系统学 | learning-path |
| 想安全地用技能 | skills |
| 要托管到 VPS | deployments |
| 从 OpenClaw 等迁移 | comparisons |
| 先保证安全 | security |

5. **按主题查官方文档**（原文映射表里与本项目五问最相关的几条）：
   - 配置：Config file、providers、models → `/docs/user-guide/configuration`
   - 记忆：Persistent memory across sessions → `/docs/user-guide/features/memory`
   - 技能：「Procedural memory the agent reuses」 → `/docs/user-guide/features/skills`
   - MCP：连接与过滤 MCP servers → `/docs/user-guide/features/mcp`，实务配置 → `/docs/guides/use-mcp-with-hermes`
   - 上下文文件：Project context for every chat → `/docs/user-guide/features/context-files`
   - 人格：`SOUL.md` 全局默认语气 → `/docs/user-guide/features/personality`
   - 多机器人：Bot mode，每个 bot 独立模型、记忆、技能 → `/docs/user-guide/bot-mode`
   - 定时：cron 相关 → 仓库 `docs/cron.md`、官方 CLI 参考
   - 安全：approvals、authorization、isolation → `/docs/user-guide/security`
   - 诚实局限：仓库 `docs/limits.md`

6. **启用任何社区技能前先读安全文档**。原文的 IMPORTANT 提示：「Listings are discovery aids, not security badges. Read security.md before enabling community skills.」这是这份清单里最像「操作规程」的一条约束。

7. **已在使用其他 agent 的话先看迁移**。前提：已在 OpenClaw / Claude Code / Codex / Cursor 上有配置。原文指向 `/docs/guides/migrate-from-openclaw` 和 `docs/comparisons.md`，说明存在配置导入路径（但原文未给导入命令）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文给出的是**功能面清单**而非案例——技能学习闭环、持久记忆、多聊天入口、cron + MCP + Tool Gateway、60+ 内置工具、voice mode、Bot mode（多 agent 各自独立模型/记忆/技能）、`SOUL.md` 人格。可作为「还没想到交给 AI 的工作」的候选能力表，但原文没有任何一个具体的使用场景细节，需要回到官方 user-stories 页才能落地。
- **任务匹配**：有两处结构性依据。①「Who is it for」表给出了**按目的选入口**的匹配逻辑；② Bot mode 支持「Named bots with own model, memory, skills」，即同一套系统里按任务分设不同模型与技能的 agent。原文**没有**任何「什么任务该用哪个模型」的判断标准或对比数据。
- **条件供给**：这是原文信息最实的一块。对应关系清楚：持续上下文 → context-files；跨会话不失忆 → memory；固定行为风格 → `SOUL.md`/personality；外部能力 → tools + MCP + Tool Gateway；权限与边界 → security 的 approvals / authorization / isolation；身份与渠道 → messaging gateway 与 Bot mode。即「信息、工具、权限」三类供给在它这里都有对应配置面，但原文只给了页面位置，没给配置样例。
- **主动推进**：原文明确列出「Cron + MCP + Tool Gateway」为卖点之一，并有 `docs/cron.md`「Scheduled jobs」与视频「VPS, Telegram, skills, scheduled jobs」；加上「can live on a VPS or serverless sandbox」，说明**时间触发 + 常驻运行 + 消息渠道回推**这条链路是产品设计内的。事件触发、状态触发原文未提。
- **效果验证**：**没有依据**。原文没有 benchmark、没有前后对比、没有成功案例数据，只有一句「self-improving」的定性主张；唯一相关的是它承认存在 `docs/limits.md`（Honest limits）。这一点需要在手册里明确标为空白。

## 与已有做法的关系（对照给出的清单条目）

- **Hermes（watch）**：本清单就是 Hermes 的社区外围索引，可当作 Hermes 条目的阅读路线图，但权威来源是官方 docs（原文自己反复强调这点，并标注了「Verified against the docs landing page on 2026-11-04」）。因此它**加强**了 Hermes 条目的可评估性，但不改变其 watch 状态。
- **OpenClaw（watch）**：原文给出 `docs/comparisons.md` 与 `migrate-from-openclaw` 指南入口，说明两者在配置/技能层面存在可迁移关系，可作为对比评估的起点。
- **Claude Code（adopt）**：原文把 Claude Code 列为**可导入来源之一**（「Import from OpenClaw / Claude Code / Codex / Cursor」）。对以 Claude Code 为主的现有做法是互补：可以用 Hermes 补「常驻 + cron + 多聊天入口 + 跨会话记忆」，而不必替换 Claude Code。
- **Cursor（watch）**：同上，仅作为迁移来源出现，无进一步内容。
- 结论性判断：清单中的条目**不构成对现有 adopt 做法的替代方案**，只提供外围能力（常驻、定时、消息面）的候选实现。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**可核验的数据/事实**
- 生态 star 表：hermes-agent 260k+、hermes-webui 19k+、hermes-desktop 14k+、hermes-workspace 6k+、另一份 awesome 6k+，注明取自 GitHub API、时间为 2026-11-04 Asia/Dhaka。
- 官方文档映射表注明核对日期 2026-11-04；视频标题与频道注明 YouTube 核对日期 2026-11-04。
- 许可：本清单 CC0-1.0，上游 Hermes 为 MIT。
- 明确声明：非官方项目；hermesagents.net、hermes-agent.org 等非 Nous 运营；无可核实的官方 subreddit 或 GitHub Discussions。

**只是主张、未经证实的部分**
- 「self-improving」「learns skills」「procedural memory the agent reuses」——全部是项目方/作者定性描述，原文**没有任何**学习效果、技能复用率、记忆准确率的证据。
- 「60+ built-in tools」为官方文档标题的转述，未逐项列出。
- 视频教程被标为第三方，且原文自己警告「Hermes changes fast, so older videos may show outdated commands」。

**适用条件与硬局限**
- 适用：想要一个**自托管、跨聊天平台、带持久记忆与定时任务**的常驻 agent，且愿意自己读官方文档、自己承担安全审查。
- 局限 1：这是聚合清单，作者自认质量参差，且「listings are discovery aids, not security badges」——生态表里的 star 数不代表可信。
- 局限 2：本次只有 README，**没有**任何指南正文、没有示例 workflow、没有 prompt、没有 cron 配置片段、没有 security 策略细节。因此它无法直接支撑手册中的任何一条可执行流程。
- 局限 3：所有链接与 star 数都有明确时效（2026-11-04），Hermes 迭代快，命令可能已变。
- 局限 4：模型成本、provider 选择、Nous Portal 定价「have their own pricing」，原文未给数字。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（建议 1 台机器 + 1 个渠道 + 1 个任务，3–5 天）**
1. 在本地 WSL2 或一台低配 VPS 上执行第 1 步安装，`hermes doctor` 必须全绿；不绿就停，不要继续。
2. 只接**一个**模型 provider（`hermes model`），只开**一个**消息渠道（例如 Telegram），避免多面铺开。
3. 做一件**只读、可验证**的定时任务：例如每天固定时间把某个仓库/某个 RSS 的新条目汇总后推给自己。不接写权限、不发外部消息。
4. 配一次 `context-files`（项目背景）与一次 `memory`（记住一条偏好），故意在新会话里不重复交代，看它是否记得。
5. 做一次**安全红队测试**：要求它执行一个破坏性动作（删文件 / 向陌生地址发消息），确认 approvals 拦得住。
6. 全程只用官方文档 + 仓库 `docs/security.md`、`docs/limits.md` 作为依据，第三方技能先不装。

**判断有没有改善的指标**
- 跑通成本：从 `curl` 到第一次成功回复的耗时；`hermes doctor` 一次通过率。
- 定时可靠性：3–5 天内 cron 任务应跑次数 / 实际成功次数 / 漏跑次数。
- 记忆有效性：同一背景信息需要重复交代的次数（基线：现有工具下每天 N 次）。
- 安全边界：破坏性请求被拦截的比例（目标 100%），有无误拦正常请求。
- 与现状对照：同一件汇总任务，用现有做法（Claude Code 手动跑 / 手写 crontab + 脚本）的耗时与错误率作为基线，比较两者。

**停止规则（很重要，因为此条只给到 study）**
- 若 3 天内无法稳定跑通，或需要大量手工修补、或安全测试未能拦住破坏性动作 → 直接退回 **watch**，本清单只保留为链接参考，不写进手册。
- 只有在上述指标**明显优于**现有做法，并且我们能拿到 `docs/skills.md`、`docs/cron.md`、`docs/security.md` 的正文并提炼出可复制的配置样例后，才考虑升级为 **try**。
