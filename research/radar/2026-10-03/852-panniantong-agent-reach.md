# Panniantong/Agent-Reach

- 结论：**值得一试**。把它作为「给 Agent 补互联网读取能力」的最小可行方案小范围试用：先 --dry-run，再只用默认零配置渠道，并固定用 `agent-reach doctor` 做体检。理由是原文给出了可照抄的安装/体检/更新/卸载流程和「首选+备选多后端路由」的可复用设计，但各渠道依赖平台反爬与登录态、作者自述频繁换代，稳定性必须自己验证，不宜直接全量采纳。
- 原文：https://github.com/Panniantong/Agent-Reach
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T17:29:25.455Z

## 是什么

Agent-Reach 是一个 CLI 形式的「能力层」（capability layer），作用是给已有 Agent（Claude Code、OpenClaw、Cursor、Windsurf 等）补上读取和搜索外部平台内容的能力。它自己不实现抓取，而是负责**选型、安装、体检、路由**，真正的读取由 Agent 直接调用上游工具完成，没有包装层。

覆盖的渠道：网页（Jina Reader）、YouTube 字幕+搜索（yt-dlp）、RSS/Atom（feedparser）、全网语义搜索（Exa，经 mcporter 以 MCP 接入）、GitHub（gh CLI）、Twitter/X、B站（bili-cli）、Reddit、Facebook、Instagram、小红书、LinkedIn、Boss直聘、V2EX、雪球、小宇宙播客转写（Whisper）。

关键设计：每个平台是一个**有序后端列表**（首选 + 备选），某个接入方式失效时只调整列表顺序，不重写代码；`agent-reach doctor` 会告诉你每个平台当前实际在用哪个后端。安装时把 SKILL.md 注册进 Agent 的技能目录，之后 Agent 自己知道该调什么命令。

默认只激活 6 个零配置渠道（网页、YouTube、RSS、GitHub、B站、V2EX），需要登录态的（Twitter、小红书、Reddit、Facebook、Instagram 等）会先问你。

## 具体做法

### 步骤 0：确认前提——Agent 能执行 shell

除 OpenClaw 外，其他平台（Claude Code、Cursor、Windsurf）不需要额外设置。

OpenClaw 用户必须先开 exec 权限，否则 Agent 无法执行 `pip install`、`mcporter`、`twitter` 等命令：

```bash
openclaw config set tools.profile "coding"
```

或在 `~/.openclaw/openclaw.json` 中设置：

```json
{ "tools": { "profile": "coding" } }
```

设置后重启并开新对话：

```bash
openclaw gateway restart
```

### 步骤 1：复制一句话给 Agent 安装

```
帮我安装 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
```

原文说明了 Agent 会依次做 6 件事：
1. 从仓库安装 `agent-reach` CLI（自带 yt-dlp、feedparser）。**注意：不要从 PyPI 安装同名包，那不是本项目。**
2. 检查系统基建——Node.js、gh CLI、mcporter，并给出缺失项的安装方式。
3. 按授权安装与配置——仅在显式传入 `--system` 时才安装依赖并通过 MCP 接入 Exa。
4. 检测环境——判断本地电脑还是服务器，给对应配置建议。
5. 按授权注册 SKILL.md——仅在显式 `--system` 时写入 Agent 的 skills 目录；默认只检查不改文件。
6. 问你要不要更多——默认只激活 6 个零配置渠道，登录态渠道列菜单点名才装。

### 步骤 2（推荐先做）：预览与安全检查

| 方式 | 命令 | 适合场景 |
|------|------|---------|
| 默认安全检查 | `agent-reach install --env=auto` | 所有环境；只读检查并列出缺失项 |
| 显式安装系统依赖 | `agent-reach install --env=auto --system` | 你明确允许修改当前机器时 |
| 兼容安全参数 | `agent-reach install --env=auto --safe` | 与默认行为相同 |
| 仅预览 | `agent-reach install --env=auto --dry-run` | 先看看会做什么 |

原文也给出这条提示词用于「只检查不改配置」的安装：

```
帮我安全检查并安装 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
```

### 步骤 3：体检

```bash
agent-reach doctor
```

一条命令给出每个渠道的状态、当前走哪条路、坏掉的给出修复处方。

### 步骤 4：按需解锁需要登录态的渠道

不用查文档，直接对 Agent 说「帮我配 XXX」。原文给出的口径：

- **GitHub**：告诉 Agent「帮我登录 GitHub」→ 解锁私有仓库、提 Issue/PR、Fork。
- **Twitter/X**：Cookie 必须由用户通过 Cookie-Editor 手工导出；保存后仅供 `agent-reach doctor` 检查配置是否齐全，**直接运行上游 `twitter` 命令前，仍需在当前进程环境中显式设置 `TWITTER_AUTH_TOKEN` 和 `TWITTER_CT0`**。
- **B站**：搜索+视频详情用 bili-cli（无需登录）；字幕需 OpenCLI。
- **Reddit**：没有零配置路径（匿名接口已被封），桌面装 OpenCLI 用浏览器登录态，或 rdt-cli + Cookie。
- **Facebook / Instagram**：桌面装 OpenCLI，复用 Chrome 登录态。
- **小红书**：OpenCLI 只用用户已有 Chrome 会话；MCP/存量工具用 Cookie-Editor 导出后配置 xiaohongshu-mcp / 存量工具。`agent-reach configure xhs-cookies` 不会把 Cookie 注入 OpenCLI / Chrome。
- **LinkedIn / Boss直聘 / 雪球 / 小宇宙播客**：告诉 Agent「帮我配 XXX」；Boss直聘 由 Agent 打开专用 Chrome，你手动登录。

### 步骤 5：装好即用（不用记命令）

Agent 读了 SKILL.md 后自己知道调什么。原文给的使用示例：

- "帮我看看这个链接" → `curl https://r.jina.ai/URL` 读任意网页
- "这个 GitHub 仓库是做什么的" → `gh repo view owner/repo`
- "这个 YouTube 视频讲了什么" → `yt-dlp` 提取字幕
- "B站搜一下 AI 教程" → `bili search`（无需登录）
- "全网搜一下 LLM 框架对比" → Exa 语义搜索
- "订阅这个 RSS" → `feedparser` 解析

### 步骤 6：更新

```
帮我更新 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/update.md
```

### 步骤 7：卸载

```bash
agent-reach uninstall
agent-reach uninstall --dry-run        # 只预览，不实际删除
agent-reach uninstall --keep-config    # 只删 skill 文件，保留 token 配置
pip uninstall agent-reach              # 卸载 Python 包本身
```

`agent-reach uninstall` 会清除 `~/.agent-reach/`（含所有 token/cookie）、各 Agent 的 skill 文件、mcporter 中的 MCP 配置。

### 安全约束（照抄执行）

- 凭据只存本机 `~/.agent-reach/config.yaml`，文件权限 600，不上传不外传。
- 用 Cookie 登录的平台（Twitter、小红书等）**务必用专用小号**，作者明确提示存在被平台检测并封号的风险，主账号不要用。
- 本地电脑不需要代理；代理只有部署在服务器上才需要（~$1/月）。

## 对应的研究问题

**1. 能力发现**——原文给了一份「通常以为 Agent 做不到、装完就能做」的清单：读任意网页、YouTube 字幕提取+搜索、全网语义搜索、读公/私有 GitHub 仓库并提 Issue/PR、读推文/搜推文/读时间线、B站搜索+详情+字幕、Reddit 搜索+读帖评、Facebook/Instagram 搜索与 Feed、小红书搜索阅读评论、LinkedIn Profile/职位搜索、Boss直聘 岗位+JD 全文、V2EX 帖子、雪球行情、播客音频转文字。这是可直接对照的能力清单。

**2. 任务匹配**——原文给了明确的「场景 → 首选 → 备选 → 为什么这么选」映射表：读网页→Jina Reader（免费无 Key）；读推特→twitter-cli▸OpenCLI；Reddit→OpenCLI▸rdt-cli（只剩登录态路线）；YouTube→yt-dlp；B站→bili-cli▸OpenCLI▸搜索 API（因 yt-dlp 被 B站风控 412 封死而退役）；搜全网→Exa via mcporter；GitHub→gh CLI；RSS→feedparser；小红书→OpenCLI▸xiaohongshu-mcp▸xhs-cli；LinkedIn→mcp-server-linkedin▸Jina Reader。协作方式也明确：能力层只管选型/安装/体检/路由，**读取由 Agent 直接调用上游工具**，不做包装层。

**3. 条件供给**——原文给了较完整的供给清单：
- 权限：Agent 需能执行 shell（OpenClaw 需 `tools.profile = "coding"`）。
- 工具：Node.js、gh CLI、mcporter；yt-dlp、feedparser 随 CLI 自带；登录态渠道需 OpenCLI（桌面）。
- 凭据：Cookie/Token 存 `~/.agent-reach/config.yaml`（600 权限）；Twitter 需手工从 Cookie-Editor 导出并在进程环境设 `TWITTER_AUTH_TOKEN`/`TWITTER_CT0`。
- 知识/接口：注册 SKILL.md 到 Agent 的 skills 目录，让 Agent 知道该调什么。
- 反馈：`agent-reach doctor` 报每个渠道状态与修复处方；`--dry-run` 预览。

**4. 主动推进**——证据较弱。原文只在需求列表里提到「帮我订阅这几个 RSS 源，有更新告诉我 → 要自己装库写代码」，实现侧只给了 `feedparser` 解析，没有给出定时轮询、事件触发或状态触发的具体配置。可视为「RSS 可作为可持续输入源」，但没有可照做的触发机制。

**5. 效果验证**——只到「渠道是否可用」这一层：`agent-reach doctor` 告诉你哪个通、哪个不通、怎么修；`--dry-run` 预览操作。原文没有给出任何关于**产出质量**（摘要是否准确、搜索是否切题）的指标或评测方法。

## 与已有做法的关系

清单中已有条目：

- **Agent-Reach（tool，status=study）**：本线索就是该条目本身。原文给出的步骤足够具体（安装提示词、install/dry-run/doctor/uninstall 命令、OpenClaw exec 配置），建议把状态从 study 上调为 try。
- **Jina Reader（tool，status=try）**：是 Agent-Reach 中「读网页」渠道的首选后端，本方案是把 Jina Reader 纳入一个更大的多后端路由里。
- **Agent skills（concept，status=adopt）**：Agent-Reach 通过注册 SKILL.md 到 Agent 技能目录来工作，是 Agent skills 机制的一个具体落地样例。
- **OpenClaw（tool，status=watch）**：原文给了 OpenClaw 专属前提（`openclaw config set tools.profile "coding"`、`openclaw gateway restart`），也提到腾讯云 Lighthouse 可部署 OpenClaw 后接入。
- **Claude Code（tool，status=adopt）/ Cursor（tool，status=watch）**：原文声明「任何能跑命令行的 Agent 都能用」，列出的兼容对象包含这两者及其它（Windsurf）。
- **GitHub Trending（source，status=try）/ Trendshift（source，status=watch）**：本线索来源于 github-trending，README 中内嵌了 Trendshift 的 GitHub Trending #1 徽章。
- **DeepSeek（tool，status=try）**：原文无关联内容。

## 证据与局限

**原文给出的数据/案例**（均为作者自述，无第三方核验）：
- 仓库指标：88,184 stars、当日 +683（来自输入 metrics，非 README 正文）。
- yt-dlp 154K Star，YouTube 仍是最佳，但「不再用于 B站」。
- 自述实测：2026-06 yt-dlp 被 B站风控 412 封死 → 已切换 bili-cli，用户零操作。
- 自述：2026 年 3 月一批单平台 CLI 集体停更，作者更换了路由。
- 赞助商条目（BrowserAct、腾讯云 OpenClaw、CoreClaw、优刻得星图）中的宣传信息不属于本项目的可验证证据。

**只是作者主张的部分**：「当下最稳的接入方式」「每个渠道尽量保证能用、好用、免费」「持续换代，平台封了我们修」——这些是维护承诺，不是已证事实。

**适用条件与风险**：
- 需要 Agent 具备 shell 执行权限；受限沙箱环境不可用。
- 大量渠道走 Cookie / 浏览器登录态，作者自己承认有封号风险，要求用专用小号。
- Reddit 无零配置路径；Twitter Cookie 需手工导出且运行上游命令前还要显式设环境变量——并非「一句话就能全部搞定」。
- 部署在服务器需自行准备代理（~$1/月）。
- 渠道可用性随平台反爬策略变动，属于短期有效方案；README 中出现的「2026-06」「2026 年 3 月」等时间点说明这是一份持续变动的文档，照做时需以仓库最新内容为准。
- 原文未提供任何产出质量评测，无法据此判断「读回来的内容好不好」。

## 怎么试、怎么验证

**最小试用方式（建议 1~2 周）**

1. 先跑 `agent-reach install --env=auto --dry-run` 看它打算做什么，确认无系统级改动。
2. 只做默认只读检查：`agent-reach install --env=auto`（不加 `--system`）。
3. 装 CLI 并注册 SKILL.md（此时才需要 `--system`），**只保留 6 个零配置渠道**：网页、YouTube、RSS、GitHub、B站、V2EX。登录态渠道一个都不要开。
4. 选 3 个你本来要手动开浏览器完成的任务，例如：总结一个 YouTube 教程、读一个 GitHub 仓库的 Issue、搜一段全网资料做对比。
5. 每天跑一次 `agent-reach doctor`，记录渠道状态变化。

**判断有没有改善的指标**

- **渠道可用率**：`agent-reach doctor` 中「通」的渠道数 / 尝试的渠道数，试用期内是否稳定。
- **任务耗时**：同一任务从「人工开浏览器→复制粘贴→整理」到「一句话让 Agent 完成」的耗时差。
- **产出可用率**：Agent 读回来的内容/摘要，有多少被直接采用或只做少量修改。
- **故障可定位性**：渠道失效时，`doctor` 是否给出可执行的修复处方，而不是让你自己猜。
- **维护成本**：一周内你需要手工改配置/重装几次。这个指标最关键——原文的核心卖点就是「平台换代你不用操心」，如果试用期内你仍需频繁手工修，说明该卖点在你的环境下不成立。

**停止条件**：若一周内需要手工修复超过 2 次，或产出可用率明显低于人工方式，就退回只保留最稳的 2~3 个渠道（网页 + GitHub + RSS）。
