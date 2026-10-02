# nanocoai/nanoclaw

- 结论：**值得一试**。建议在一个可丢弃的环境里小范围试：按 README 的 nanoclaw.sh 一键装好，只接一个频道、配一到两个可人工核对的定时任务跑两周，因为它给出了可照抄的安装/使用/调试/卸载流程和容器级隔离，但全部依据仅来自项目 README，没有效果数据或第三方验证，且定制方式是改代码。
- 原文：https://github.com/nanocoai/nanoclaw
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T08:27:05.819Z

## 是什么

NanoClaw 是一个自托管的 AI 常驻助理运行框架。架构上是一个 Node 宿主进程 + 每个 agent group 独立 Docker 容器：消息从你已有的聊天工具进来，宿主按“用户 → 消息群 → agent group → 会话”路由，写入该会话的 `inbound.db`，唤醒容器；容器里的 agent-runner（Bun + Claude Agent SDK）轮询 `inbound.db`、执行、把回复写进 `outbound.db`，宿主再轮询并投递回聊天工具。每个会话两个 SQLite 文件、各自单一写入者，不走 IPC 也不走 stdin。

宣称的差异点：容器文件系统隔离（只挂载你显式允许的目录）、agent 不持有原始 API key（出站请求经凭据网关在请求时注入，支持按 agent 的策略和限流）、每个 agent group 有自己的 `CLAUDE.md`、记忆、容器；作者明确把它和 OpenClaw 对比（后者近 50 万行代码、53 个配置文件、70+ 依赖、应用层权限校验、单 Node 进程共享内存）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **满足前置条件**：macOS 或 Linux（Windows 走 WSL2）；Node.js 22+ 与 pnpm 10+（缺失时安装脚本会装）；Docker Desktop（macOS/Windows）或 Docker Engine（Linux）；Claude Code（用于 `/customize`、`/debug`、安装出错恢复以及所有 `/add-<channel>` skill）。

2. **一键安装并配对第一个频道**（前提：机器上有 git 和上面的运行条件）：
```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash nanoclaw.sh
```
脚本会走完：补装 Node、pnpm、Docker → 安装凭据网关并把你的 Anthropic 凭据注册进去 → 构建 agent 容器 → 配对第一个频道（Slack、Telegram、Discord、WhatsApp、iMessage 或本地 CLI）。某一步失败时，会自动调用 Claude Code 诊断并从断点续跑。

3. **（可选）从 v1 迁移**：在新目录 clone v2，与 v1 安装作为同级目录，然后：
```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash migrate-v2.sh
```
它会找到 v1 安装（同级目录，或 `NANOCLAW_V1_PATH=/path/to/nanoclaw`），合并 `.env`、从 `registered_groups` 播种 v2 数据库、复制 group 文件夹 + 会话数据 + 定时任务、安装你选择的频道适配器、复制频道鉴权状态（含 WhatsApp 的 Baileys keystore；v1 的 LID 映射不迁移，v7 适配器按消息解析）、构建 agent 容器。**不会**切换系统服务——需要你在提示处选 “switch to v2”，或在测试后手动切。注意：要直接在真实 shell 里跑，不要在 Claude 会话里跑，因为确定性部分需要交互式提示和真实 shell I/O。

4. **用触发词下指令**（默认触发词 `@Andy`）。README 给的三个可直接照抄的例子：
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

5. **改行为**：不使用配置文件。直接对 Claude Code 说要什么，例如：
- "Change the trigger word to @Bob"
- "Remember in the future to make responses shorter and more direct"
- "Add a custom greeting when I say good morning"
- "Store conversation summaries weekly"
或运行 `/customize` 做引导式修改。（前提：代码库足够小，作者主张 Claude 能安全修改。）

6. **加频道 / 换模型**：频道适配器和替代 provider 不在主干上，通过 skill 装：`/add-telegram`、`/add-codex`（OpenAI Codex，可用 ChatGPT 订阅或 API key）、`/add-opencode`（经 OpenCode 接 OpenRouter、Google、DeepSeek 等）、`/add-ollama-provider`（本地开源权重模型）。Provider 可按 agent group 配置。一次性实验也可以用任何 Claude API 兼容端点，通过 `.env`：
```bash
ANTHROPIC_BASE_URL=https://your-api-endpoint.com
ANTHROPIC_AUTH_TOKEN=your-token-here
```

7. **控制隔离与共享**：用 `/manage-channels` 按频道选择：每个频道接自己的 agent（完全隔离）、多个频道共享一个 agent（统一记忆、各自会话），或把多个频道折进一个共享会话（一段对话跨多个界面）。参考 `docs/isolation-model.md`。

8. **模板化起 agent**（前提：`templates/` 目录里有模板，可手工放或从公开库拷）：
```bash
ncl groups create --template <ref>
```
模板是“指令 + MCP 工具 + skills、不含密钥”的可复用包。

9. **调试**：直接问 Claude Code（“Why isn't the scheduler running?” “What's in the recent logs?” “Why did this message not get a response?”）。若安装失败且脚本自愈不了，运行 `claude` 然后 `/debug`。

10. **关闭匿名诊断**（默认开启）：
```bash
NANOCLAW_NO_DIAGNOSTICS=1
```

11. **卸载/回滚**：
```bash
git clone ... && cd nanoclaw-v2
bash nanoclaw.sh --uninstall
```
每次安装带 per-checkout id，卸载器只删属于这份拷贝的东西（后台服务、容器与镜像、应用数据与日志、agent 文件、这份拷贝的网关 agent），共享的东西（网关服务、你的凭据、机器上其他 NanoClaw 拷贝）不动；会逐项列出并逐组确认。`--dry-run` 预览，`--yes` 跳过确认，`.env` 删除前会备份。最后手动删掉 checkout 目录。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 给出的三个示例提示词本身就是“可以交给它的活儿”的清单——定时产出销售管道概览、每周按 git history 检查 README 是否漂移并更新、每周汇总 Hacker News/TechCrunch 的 AI 动态成简报。另一条：agent 能修改和扩展自己的 NanoClaw fork（因为原生用 Claude Code 全套工具集），即“让 AI 改自己赖以运行的代码”也被明说支持。

**2. 任务匹配**：默认走 Anthropic 官方 Claude Agent SDK（即 Claude Code 全套工具）；替代 provider 为 Codex、OpenCode（OpenRouter/Google/DeepSeek 等）、Ollama 本地模型，且 provider 粒度是 per agent group，同一安装里不同 agent 可跑不同后端。频道与 agent 的对应关系可按频道选择：一对一（隐私隔离）/ 多对一（统一记忆、分会话）/ 折叠成单一共享会话。

**3. 条件供给**：每个 agent group 有自己的 `CLAUDE.md`（指令）、自己的记忆、自己的容器，且只能看到显式挂载的目录——给了“要给什么信息/文件访问”的明确载体（示例中通过挂载给它 Obsidian vault 目录）；定时任务可配 script gates，无活时不唤醒 agent（省调用）；凭据不进容器，由网关在请求时注入并支持按 agent 的策略与限流；频道鉴权状态由适配器管理。

**4. 主动推进**：定时任务（recurring jobs，由 agent 执行）是核心机制，时间触发在示例里明确（每工作日 9am、每周五、每周一 8am）；宿主有 60 秒 sweep（`src/host-sweep.ts`）负责陈旧检测、到期消息唤醒和 recurrence。事件/状态触发体现为：消息到达即按实体模型路由写入 `inbound.db` 并唤醒容器。任务可被列出和暂停（`list all scheduled tasks` / `pause the Monday briefing task`）。

**5. 效果验证**：README 没有给任何效果指标、案例或验证方法；只给了排障路径（问 Claude Code、`/debug`）和可关闭的匿名安装诊断。判断是否改善要自己定义（见下一节）。

## 与已有做法的关系

- **Claude Code（adopt）**：NanoClaw 原生通过 Anthropic 官方 Claude Agent SDK 使用 Claude Code，把 Claude Code 从“你手动开的会话”变成“常驻、被消息和定时任务唤醒、跑在容器里的 agent”；Claude Code 同时是安装失败恢复、`/customize`、`/debug`、`/add-<channel>` skill 的执行者。是 Claude Code 的容器化 + 常驻化外壳。
- **OpenClaw（watch）**：README 明确以它为对比对象——近 50 万行、53 个配置文件、70+ 依赖、应用层安全而非 OS 级隔离、单 Node 进程共享内存。NanoClaw 定位为“同样核心功能、但代码小到能读懂 + 容器隔离”。
- **OpenCode（watch）**：通过 `/add-opencode` 接入 OpenRouter、Google、DeepSeek 等，作为替代 provider。
- **DeepSeek（try）**：只作为 OpenCode 可路由的模型之一被点名，无额外配置细节。
- **Obsidian（drop）**：仅在示例提示词的括号里作为挂载的数据源出现（“has access to my Obsidian vault folder”），无集成细节。
- **PRAW**：清单中有此条目，但原文完全未提及。

## 证据与局限

- 全部内容来自项目 README，属项目自我描述，**没有第三方测评、没有效果数据、没有用户案例**。仓库 30866 stars 是仓库指标，不构成质量或效果证据。
- 与 OpenClaw 的对比数字（行数、配置文件数、依赖数、安全层级）是作者主张，原文无法核实。
- 适用条件明确且不轻：需要 macOS/Linux/WSL2、Docker、Node 22+、pnpm 10+、Claude Code，以及 Anthropic 凭据（或改用其他 provider）；定制哲学是 “Customization = code changes”，不想改代码的人上手成本高，README 也承认主干只接受安全修复、bug 修复和明确改进，其余一律以 skill 形式自带。
- 隐私/账号：匿名安装诊断默认开启，可用 `NANOCLAW_NO_DIAGNOSTICS=1` 关闭；可选账号用于拉取预构建加固镜像和托管 Slack app（会看到你的邮箱和拉取时间），本地构建是默认且不联网、不需账号；相关本地文件（`~/.config/nanoclaw/account.json`、`device-key.json`、`data/community-portal.json`）权限为 0600，宿主保持一条到 portal 的出站连接。
- 定时任务 script gates 的具体写法、`docs/` 里各文档的细节，原文只有链接，没有正文，**无法据此照做**，需要另行查阅。
- 原文完全没有给出“如何验证改善”的方法或指标，这是最大的空白。

## 怎么试、怎么验证

**最小试用**（1 天内可搭完，2 周可判断）：
1. 在一台可丢弃的机器或独立环境里执行 quick start，只接**本地 CLI 频道**（避开 Slack/WhatsApp 等鉴权与账号环节），用 Anthropic 凭据或先切到 `/add-opencode` + 一个便宜模型。
2. 只挂载一个低风险的目录作为数据源（复制一份，不要挂真工作目录）。
3. 配 1–2 个输出可人工核对的定时任务，例如：
```
@Andy every Monday at 8am, compile news on AI developments from Hacker News and TechCrunch and message me a briefing
@Andy review the git history for the past week each Friday and update the README if there's drift
```
4. 用 `@Andy list all scheduled tasks across groups` 和 `pause ...` 练习管控。

**判断有没有改善的观测点**（都是可以从 README 机制上观察、需要你自己记录的）：
- 触发可靠性：两周内定时任务是否漏触发/重复触发（对照 `src/host-sweep.ts` 的 60 秒 sweep 与“due-message wake”机制）。
- 产出可用率：简报/README 更新是否需要人工返工，返工比例是多少。
- 省下的时间：同类任务手动做一次要多久 vs 收到成品后修一版要多久。
- 越权风险：容器实际能看到的是否仅限于你挂载的目录（检查挂载配置），出站请求是否都经网关。
- 空跑成本：给定时任务加 script gate 前后，无活时的调用次数差异。
- 回滚干净度：先跑 `bash nanoclaw.sh --uninstall --dry-run` 看清单，确认只删这份拷贝、不动共享的网关服务和凭据。

**止损条件**：如果两周内定时任务漏触发、产出需要大量返工，或者你必须改代码才能得到想要的行为而团队不具备这个能力，就退回 study，只借鉴它的“容器隔离 + 每 agent 独立记忆/CLAUDE.md + 定时任务 + script gate 省调用”这几条设计。

（注：以上只基于给出的 README 文本，`docs/` 下架构、隔离模型、定时任务、模板、迁移等文档的具体内容未在材料中，需另行获取后才能把步骤补全成手册。）
