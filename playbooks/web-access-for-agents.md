# 给 agent 补上外部平台读取能力：先预览安装，再体检守稳定性

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎么以最小风险让已经能跑命令行的 agent 获得读网页、YouTube、RSS、GitHub、B站等外部平台的能力，并在某个渠道失效时能定位和换路。
> 先试这一步：先跑 `agent-reach install --env=auto --dry-run` 预览，或把「帮我安全检查并安装 Agent Reach」的安装提示词交给 Agent，再用 `agent-reach doctor` 确认每个渠道当前走哪条路。
> 最近修订：2026-10-03

## 解决什么问题

已有 agent（Claude Code、Cursor、Windsurf、OpenClaw 等）能执行 shell，但默认不知道该怎么读外部平台的内容。Agent-Reach 是一个 CLI 形式的「能力层」：它自己不实现抓取，负责选型、安装、体检、路由；真正的读取由 Agent 直接调用上游工具完成，没有包装层。这篇手册要解决的是：怎么以最小风险给 agent 补上这些读取能力，并且在某个渠道失效时能定位、换路，而不是重写代码。

覆盖渠道：网页（Jina Reader）、YouTube 字幕+搜索（yt-dlp）、RSS/Atom（feedparser）、全网语义搜索（Exa，经 mcporter 以 MCP 接入）、GitHub（gh CLI）、Twitter/X、B站（bili-cli）、Reddit、Facebook、Instagram、小红书、LinkedIn、Boss直聘、V2EX、雪球、小宇宙播客转写（Whisper）。

关键设计：每个平台是一个有序后端列表（首选+备选），某个接入方式失效时只调整列表顺序，不重写代码；`agent-reach doctor` 告诉你每个平台当前实际在用哪个后端。默认只激活 6 个零配置渠道（网页、YouTube、RSS、GitHub、B站、V2EX），需要登录态的会先问你。

## 适用与不适用

适用：

- 你已有一个能执行 shell 的 agent。Claude Code、Cursor、Windsurf 不需要额外设置；OpenClaw 需要先开 exec 权限。
- 你想先用最小范围验证：`--dry-run` 预览、只用默认零配置渠道、固定用 `agent-reach doctor` 体检。
- 你有多个可替代渠道的需求，想在某个后端失效时只调整路由顺序而不重写代码。
- 你要读网页、YouTube 字幕、RSS、GitHub、B站、V2EX 等零配置渠道的内容。

不适用：

- agent 不能执行 shell。shell 是前提，OpenClaw 还要额外开 exec。
- 你想一次性全量接入所有登录态渠道。原文的口径是默认只装零配置渠道，登录态渠道列菜单点名才装；且这些渠道存在平台反爬与封号风险，稳定性必须自己验证。
- 你想用它评测产出质量。原文的效果验证只到「渠道是否可用」这一层，没有给出摘要是否准确、搜索是否切题的任何指标或评测方法。
- 你想靠它做主动推进或定时触发。原文只在需求列表里提到「帮我订阅这几个 RSS 源，有更新告诉我」，实现侧只给了 feedparser 解析，没有给出定时轮询、事件触发或状态触发的配置。
- 你打算从 PyPI 安装同名包。原文明确说那不是本项目。

## 前置条件

- Agent 能执行 shell。除 OpenClaw 外，其他平台（Claude Code、Cursor、Windsurf）不需要额外设置。
- OpenClaw 用户必须先开 exec 权限，否则 Agent 无法执行 `pip install`、`mcporter`、`twitter` 等命令：

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

- 系统基建：Node.js、gh CLI、mcporter。安装过程会检查并给出缺失项的安装方式；yt-dlp、feedparser 随 CLI 自带。
- 登录态渠道额外需要：OpenCLI（桌面）或 Cookie（由 Cookie-Editor 手工导出）等。
- 凭据只存本机 `~/.agent-reach/config.yaml`，文件权限 600，不上传不外传。
- 不要从 PyPI 安装同名包，那不是本项目。

## 操作步骤

先做做法 A（最小可行试用），确认默认渠道可用、且你接受它在本机的改动范围后，再按需进入做法 B。

### 做法 A：最小可行试用

1. 预览安装会做什么。前提：已完成前置条件。预期结果：只读检查并列出缺失项，不实际修改系统。

```bash
agent-reach install --env=auto --dry-run
```

2. 执行默认安全检查安装。前提：看过预览，接受只读检查范围。预期结果：只读检查并列出缺失项，只激活默认 6 个零配置渠道（网页、YouTube、RSS、GitHub、B站、V2EX）；需要登录态的渠道会先问你。原文同时给出兼容安全参数 `--safe`，与默认行为相同。

```bash
agent-reach install --env=auto
```

也可以直接把这句话复制给 Agent 安装：

```
帮我安全检查并安装 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
```

如果你明确允许修改当前机器，加 `--system`：

```bash
agent-reach install --env=auto --system
```

原文说明了 Agent 安装时会依次做 6 件事：从仓库安装 `agent-reach` CLI（自带 yt-dlp、feedparser，注意不要从 PyPI 安装同名包）；检查系统基建 Node.js、gh CLI、mcporter 并给出缺失项的安装方式；按授权安装与配置，仅在显式传入 `--system` 时才安装依赖并通过 MCP 接入 Exa；检测环境，判断本地电脑还是服务器，给对应配置建议；按授权注册 SKILL.md，仅在显式 `--system` 时写入 Agent 的 skills 目录，默认只检查不改文件；问你要不要更多，默认只激活 6 个零配置渠道，登录态渠道列菜单点名才装。

3. 体检。前提：安装已完成。预期结果：一条命令给出每个渠道的状态、当前走哪条路、坏掉的给出修复处方。

```bash
agent-reach doctor
```

4. 装好即用，不用记命令。前提：SKILL.md 已按原文注册或安装就绪。预期结果：Agent 读了 SKILL.md 后自己知道调什么命令。原文给的使用示例：

- 「帮我看看这个链接」→ `curl https://r.jina.ai/URL` 读任意网页
- 「这个 GitHub 仓库是做什么的」→ `gh repo view owner/repo`
- 「这个 YouTube 视频讲了什么」→ `yt-dlp` 提取字幕
- 「B站搜一下 AI 教程」→ `bili search`（无需登录）
- 「全网搜一下 LLM 框架对比」→ Exa 语义搜索
- 「订阅这个 RSS」→ `feedparser` 解析

### 做法 B：按需解锁需要登录态的渠道

不用查文档，直接对 Agent 说「帮我配 XXX」。原文给出的口径：

- **GitHub**：告诉 Agent「帮我登录 GitHub」→ 解锁私有仓库、提 Issue/PR、Fork。
- **Twitter/X**：Cookie 必须由用户通过 Cookie-Editor 手工导出；保存后仅供 `agent-reach doctor` 检查配置是否齐全，直接运行上游 `twitter` 命令前，仍需在当前进程环境中显式设置 `TWITTER_AUTH_TOKEN` 和 `TWITTER_CT0`。
- **B站**：搜索+视频详情用 bili-cli（无需登录）；字幕需 OpenCLI。
- **Reddit**：没有零配置路径（匿名接口已被封），桌面装 OpenCLI 用浏览器登录态，或 rdt-cli + Cookie。
- **Facebook / Instagram**：桌面装 OpenCLI，复用 Chrome 登录态。
- **小红书**：OpenCLI 只用用户已有 Chrome 会话；MCP/存量工具用 Cookie-Editor 导出后配置 xiaohongshu-mcp / 存量工具。`agent-reach configure xhs-cookies` 不会把 Cookie 注入 OpenCLI / Chrome。
- **LinkedIn / Boss直聘 / 雪球 / 小宇宙播客**：告诉 Agent「帮我配 XXX」；Boss直聘由 Agent 打开专用 Chrome，你手动登录。

安全约束（照抄执行）：

- 凭据只存本机 `~/.agent-reach/config.yaml`，文件权限 600，不上传不外传。
- 用 Cookie 登录的平台（Twitter、小红书等）务必用专用小号，作者明确提示存在被平台检测并封号的风险，主账号不要用。
- 本地电脑不需要代理；代理只有部署在服务器上才需要（~$1/月）。

### 维护：更新与卸载

更新：

```
帮我更新 Agent Reach：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/update.md
```

卸载：

```bash
agent-reach uninstall
agent-reach uninstall --dry-run        # 只预览，不实际删除
agent-reach uninstall --keep-config    # 只删 skill 文件，保留 token 配置
pip uninstall agent-reach              # 卸载 Python 包本身
```

`agent-reach uninstall` 会清除 `~/.agent-reach/`（含所有 token/cookie）、各 Agent 的 skill 文件、mcporter 中的 MCP 配置。

## 怎么判断变好了

- 渠道可用性：`agent-reach doctor` 一条命令给出每个渠道的状态、当前实际用哪个后端、坏掉的修复处方。这是原文唯一给出的效果验证层，能看到哪个通、哪个不通、怎么修。
- 改动可控性：`--dry-run` 能先看到会做什么再决定是否执行；`--system` 是否使用由你显式决定，默认只检查不改文件、不写 skills 目录。
- 默认范围：安装后默认只激活 6 个零配置渠道（网页、YouTube、RSS、GitHub、B站、V2EX），没有在你点名之前装登录态渠道。
- 跑通示例任务：用原文给的 6 个示例（读链接、读 GitHub 仓库、读 YouTube 字幕、B站搜索、Exa 全网搜索、RSS 解析）各试一次，看 Agent 是否知道自己该调什么命令。

最小试用方式：先 `agent-reach install --env=auto --dry-run` 预览 → 默认安装 → `agent-reach doctor` → 挑 1～2 个零配置渠道的示例任务跑通。试多久：原文没有给出时长，也没有任何产出质量（摘要是否准确、搜索是否切题）的指标或评测方法；稳定性需要你自己验证，作者自述渠道频繁换代。

## 常见坑

- 从 PyPI 安装同名包不是本项目。原文明确提示不要这么做。
- 以为 `agent-reach configure xhs-cookies` 能配好 OpenCLI / Chrome：它不会把 Cookie 注入 OpenCLI / Chrome。
- Twitter Cookie 保存后不等于可以直接跑上游命令：`agent-reach doctor` 只是检查配置是否齐全；直接运行上游 `twitter` 命令前，仍需在当前进程环境中显式设置 `TWITTER_AUTH_TOKEN` 和 `TWITTER_CT0`。
- Reddit 没有零配置路径，匿名接口已被封，只剩登录态路线。
- 用 Cookie 登录的平台（Twitter、小红书等）用主账号有被平台检测并封号的风险，务必用专用小号。
- 本地电脑不需要代理；只有把方案部署到服务器上才需要（原文提到 ~$1/月）。
- 默认只激活 6 个零配置渠道；登录态渠道要你点名才装。不要指望一次全量。
- `--system` 才会安装系统依赖、通过 MCP 接入 Exa、把 SKILL.md 写入 Agent 的 skills 目录；默认只检查不改文件。
- yt-dlp 仍适合 YouTube，但作者自述 2026-06 已被 B站风控 412 封死，所以 B站改用 bili-cli；这类渠道换代需要自己盯。
- 原文的验证只到渠道是否可用，没有产出质量指标；`agent-reach doctor` 不评价内容摘要或搜索结果是否切题。
- RSS 只给了 feedparser 解析，没有定时轮询、事件触发或状态触发配置，不能当「有更新就通知我」的完整方案。

## 证据与来源

- 主要依据：Panniantong/Agent-Reach 调研报告。安装提示词、`install --env=auto` / `--dry-run` / `--safe` / `--system`、`doctor`、`uninstall` / `--dry-run` / `--keep-config`、OpenClaw 的 `tools.profile = "coding"` 与 `openclaw gateway restart`、各平台登录态口径，均来自该报告原文，属作者自述，没有第三方核验。
- 仓库指标：88,184 stars、当日 +683（来自输入 metrics，非 README 正文）。
- 渠道状态数据：yt-dlp 154K Star，YouTube 仍是最佳，但不再用于 B站；作者自述 2026-06 yt-dlp 被 B站风控 412 封死，已切换 bili-cli，用户零操作。这些均为作者自述。
- 效果验证：仅到渠道是否可用这一层；原文没有产出质量指标或评测方法。
- 主动推进：证据较弱。原文只在需求列表里提到 RSS 更新通知，实现侧只给了 feedparser 解析，没有可照做的触发机制。
- 与已有做法的关系（来自报告）：Jina Reader 是 Agent-Reach 中读网页渠道的首选后端；Agent-Reach 通过注册 SKILL.md 落地 Agent skills 机制；报告建议把 Agent-Reach 的状态从 study 上调为 try。

## 依据的调研

- [Panniantong/Agent-Reach](../research/radar/2026-10-03/852-panniantong-agent-reach.md)：值得一试，把它作为「给 Agent 补互联网读取能力」的最小可行方案小范围试用：先 --dry-run，再只用默认零配置渠道，并固定用 `agent-reach doctor` 做体检。理由是原文给出了可照抄的安装/体检/更新/卸载流程和「首选+备选多后端路由」的可复用设计，但各渠道依赖平台反爬与登录态、作者自述频繁换代，稳定性必须自己验证，不宜直接全量采纳。
