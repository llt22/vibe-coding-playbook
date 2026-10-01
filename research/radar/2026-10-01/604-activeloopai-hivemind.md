# activeloopai/hivemind

- 结论：**值得一试**。建议先在一个仓库、一个 agent（如 Claude Code）上小范围试：按 README 的安装命令接入、用 `.hivemind` 限定捕获范围、再看 skillify 是否真的产出被复用的 SKILL.md；它给出了可直接照做的安装/配置/触发步骤，但基准数据是作者自测，且默认把全部会话 prompt 与工具输出写进团队共享 workspace。
- 原文：https://github.com/activeloopai/hivemind
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T14:28:41.173Z

## 是什么

Hivemind 是 activeloop 做的「所有 agent 共用一个大脑」：把编码类 agent（Claude Code、OpenClaw、Codex、Cursor、Hermes、pi、Claude Cowork）每次会话的 prompt、工具调用、工具响应、助手回复捕获成结构化 trace 存进 Deeplake，后台 worker 从 trace 里挖重复模式、写成 `SKILL.md`，再把这些技能注入团队里每个已接入 agent 的上下文。核心链路是 **Capture → Codify → Propagate → Compound**。README 强调它的定位不只是「记忆」，而是把团队 trace 里的重复模式固化成可复用技能并实时跨会话、跨 agent、跨人、跨机器传播。

数据落在 Deeplake 的 SQL 表（`sessions` 存逐事件捕获，`memory` 存摘要与虚拟文件系统），支持 BYOC（自带 GCS/Azure/S3/on-prem bucket）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Node ≥ 22.0.0；走 npm 路径时需要可写的 npm 全局前缀；需要一个 Deeplake 账号以获得 token。安装器会探测机器上所有受支持的 assistant，接好 hooks，弹一行同意提示后开浏览器登录；装完要重启 assistant。

1. 安装（macOS / Linux）：

```bash
curl -fsSL https://deeplake.ai/hivemind.sh | sh
```

Windows（PowerShell）：

```powershell
irm https://deeplake.ai/hivemind.ps1 | iex
```

任何平台走 npm（适合 CI / Dockerfile，或策略禁止把下载脚本管道给 shell 的环境；注意它跳过安装器的检查，Node 22+ 与可写 npm 前缀自负）：

```bash
npm i -g @deeplake/hivemind && hivemind install
```

2. 授权登录。交互式走浏览器流程；无头 / CI 用 token 替代：

```bash
HIVEMIND_TOKEN=<your-token> hivemind install
# 或
hivemind install --token <your-token>
```

非交互 shell 且没给 token 时，安装完成但跳过登录，之后可再跑 `hivemind login` 启用共享记忆。

3. 只给指定 assistant 安装（按需选一个，先小范围试）：

```bash
hivemind install --only claude
hivemind claude install    # equivalent
hivemind codex install
hivemind claw install
hivemind cursor install
hivemind hermes install
hivemind pi install
hivemind claude_cowork install   # Alpha
```

4. 检查接线状态：

```bash
hivemind status
```

5. 重启对应 assistant。个别 agent 有额外动作：
   - **Codex**：首次启动会弹「Hooks need review」，必须选 `2. Trust all and continue`，否则 hooks 不运行、hivemind 不生效。
   - **Cursor 1.7+**：安装会在 `~/.cursor/hooks.json` 里接 sessionStart、beforeSubmitPrompt、postToolUse、afterAgentResponse、stop、sessionEnd 六个生命周期事件，hook 每次事件 fork 一个 Node bundle（`~/.cursor/hivemind/bundle/`），装完重启 Cursor。
   - **Claude Cowork**：安装会在 Claude Desktop 的 `claude_desktop_config.json` 的 `mcpServers.hivemind` 下注册共享 MCP server（`~/.hivemind/mcp/server.js`），必须完全退出并重开 Claude Desktop。

6. （可选）开语义检索。默认**关闭**，因为本地嵌入守护进程（nomic-embed-text-v1.5）约 600 MB；不开就静默降级成 ILIKE 词法检索：

```bash
hivemind embeddings install
# 或安装时一并开
hivemind install --with-embeddings
```

7. 配置捕获范围与身份。全局环境变量（节选关键项）：

| 变量 | 默认 | 作用 |
|---|---|---|
| `HIVEMIND_CAPTURE` | `true` | 设 `false` 彻底关闭捕获 |
| `HIVEMIND_WORKSPACE_ID` | `default` | 工作区 |
| `HIVEMIND_CAPTURE_ONLY_CLI` | _(none)_ | 设 `true` 只捕获交互式 CLI 会话，跳过 Claude Agent SDK 起的会话 |
| `HIVEMIND_SKILLIFY_EVERY_N_TURNS` | `20` | 每多少助手轮触发一次自动技能挖掘（越低越频繁、越便宜但越吵） |
| `HIVEMIND_SUMMARY_EVERY_N_MSGS` | `50` | 每多少捕获事件做一次会话摘要（首条摘要固定在第 10 个事件） |
| `HIVEMIND_SUMMARY_EVERY_HOURS` | `2` | 基于时间的摘要节奏（期间至少有一个新事件时才跑） |
| `HIVEMIND_WIKI_WORKER` | _(none)_ | 设 `1` 完全关闭后台摘要 worker（同时用作递归保护） |
| `HIVEMIND_GRAPH_ON_STOP` | _(none)_ | 设 `0` 关闭 Stop / SessionEnd 时的代码图重建 |
| `HIVEMIND_DEBUG` | _(none)_ | 设 `1` 输出 hook 调试日志 |

关闭捕获或开调试的示例：

```bash
HIVEMIND_CAPTURE=false claude
HIVEMIND_DEBUG=1 claude
```

8. 用 `.hivemind` 文件做按目录路由或退出（`.git`/`.gitconfig` 式「最近的赢」，不做继承；`.hivemind.local` 优先于同目录 `.hivemind`）：

```json
{
  "orgId": "acme-corp",
  "workspaceId": "client-work",
  "collect": true
}
```

```jsonc
// route this repo to a client org/workspace — reads and writes both land there
{ "orgId": "acme-corp", "workspaceId": "client-work" }

// Hivemind fully off in this folder (e.g. a personal or sensitive repo)
{ "collect": false }
```

只在自己选定的仓库里开、其他树关掉（最近的赢）：

```bash
echo '{ "collect": false }' > ~/.hivemind.local                 # or at the root of your source tree
echo '{ "collect": true }'  > ~/src/my-repo/.hivemind.local     # repeat per repo
```

约定：`.hivemind` 可提交（像 `.editorconfig`，声明本仓库 trace 归属），`.hivemind.local` 不提交（个人覆盖，加进 `.gitignore`）。`.hivemind` 不含 token，鉴权始终在 `~/.deeplake/credentials.json`，所以路由只能指向你已经授权的 org。优先级是 `env > file > login`；`collect: false` 作为 fail-safe 始终生效。每次会话开始的 banner 会打印当前生效的 org/workspace（含 `.hivemind` 覆盖后结果），例如 `org: acme-corp (workspace: client-work) · routed by ./.hivemind`。

9. 使用技能提炼（skillify）：worker 在 Stop / SessionEnd 触发，挖掘范围内最近会话，问 Haiku 值不值得留，然后把 `SKILL.md` 写到 `<project>/.claude/skills/<name>/`。

```bash
hivemind skillify                            # show current scope, team, install, per-project state
hivemind skillify scope <me|team>            # who counts as "in scope" for mining
hivemind skillify pull                       # install teammates' skills locally
hivemind skillify unpull                     # remove pulled skills
```

10. （可选）用自然语言搜索 trace 与技能（README 给的示例提问）：

```
"What was Emanuele working on?"
"Search traces for authentication bugs we've solved"
"What did we decide about the API design?"
"Show me skills my team has codified for handling migrations"
```

11. （可选）代码库图与代码文档：

```bash
hivemind docs sync              # generate/refresh docs for this repo (asks first)
hivemind docs list              # status: enabled? pages? in sync with HEAD?
hivemind docs auto on|off       # keep docs fresh automatically on each commit
hivemind docs agent [name]      # which host CLI writes the docs (claude|codex|pi|cursor)
```

文档生成 shell 出去调宿主 agent 自己的 CLI（`claude -p`、`codex exec` 等），不需要另配 API key，后台运行。解析顺序：`HIVEMIND_DOCS_LLM_AGENT`（env）> `docs.llmAgent`（config）> 自动探测；逐文件文档用便宜模型，wiki 页用更强的模型。

12. （可选）跨 agent 团队规则，SessionStart 注入每个会话：

```bash
hivemind rules add "no DROP TABLE on prod creds"
hivemind rules list                          # latest 10 active
hivemind rules edit <rule-id> "<new text>"   # bumps version
hivemind rules done <rule-id>                # mark closed
```

（原文在此处被截断，`rules` 一节的命令块未结束，后续 `goals` 等命令只有目录提及、没有正文。）

13. 卸载：

```bash
hivemind uninstall              # remove from every detected assistant
hivemind codex uninstall        # remove from one
```

## 对应的研究问题

**1. 能力发现**：把「跨会话、跨人复用已解决的问题」变成默认能力——不需要人主动整理笔记，后台 worker 从 trace 里挖模式并写成 `SKILL.md`（第 9 步），再用自然语言检索（第 10 步）。README 的说法是一个工程师的 agent 周一搞定的迁移模式，周二全队 agent 都能执行。

**2. 任务匹配**：README 给出按 agent 选集成方式的具体依据——Claude Code 走 marketplace plugin、OpenClaw 走原生扩展、Codex/Cursor 走 `hooks.json`、Hermes 走 `config.yaml` shell hooks + skill + MCP server、pi 走扩展 API + skill + AGENTS.md、Claude Cowork 只能走 MCP server（无 hook 生命周期）。模型搭配上也有明确建议：因为 Hivemind 每轮做很多小工具调用，OpenClaw 的 `agents.defaults.model` 推荐 `anthropic/claude-haiku-4-5-20251001`，Opus 这类大推理模型会显得迟钝。

**3. 条件供给**：需要给的东西写得很具体——Node 22+、可写 npm 前缀、Deeplake 账号 token、Codex 里的 hooks 信任、Claude Desktop 的完全重启、Cursor 的重启；权限上 hooks 在沙箱外运行；反馈回路由 `HIVEMIND_SKILLIFY_EVERY_N_TURNS`、`HIVEMIND_SUMMARY_EVERY_N_MSGS/HOURS` 等旋钮调节；数据面需要决定 workspace / BYOC bucket，并用 `.hivemind` 声明 trace 归属。

**4. 主动推进**：这是全文最有触发机制的部分——skillify worker 由 Stop / SessionEnd 触发；技能挖掘每 20 个助手轮自动触发一次（可调）；摘要每 50 个事件或每 2 小时触发一次（首条在第 10 个事件）；Cowork 走后台 ingester tail transcript，某条 transcript 空闲 5 分钟即视为结束并跑 wiki/skillify worker；代码图在 Stop / SessionEnd 重建；`hivemind docs auto on` 让文档每次 commit 自动刷新；session-start banner 主动披露 trace 去向。

**5. 效果验证**：README 给出 LoCoMo 基准的三项指标定义（cost / 100 QA、tokens / question、turns / question），可直接作为对比口径；本地侧有 `hivemind status`、`hivemind skillify`（查看范围、团队、安装、逐项目状态）、`hivemind docs list`（是否启用、页面数、是否与 HEAD 同步）这些可检查的状态输出。

## 与已有做法的关系

清单中的相关条目：

- **Claude Code（adopt）**：Hivemind 支持度最高，走官方 Marketplace plugin，有 `/plugin marketplace add activeloopai/hivemind`、`/plugin install hivemind`、`/reload-plugins`、`/hivemind:login` 这套原生路径，auto-capture 与 auto-recall 都是 ✅。可以作为 Claude Code 现有做法的插件式增强。
- **Cursor（watch）、Hermes（watch）、OpenClaw（watch）**：三者都被 Hivemind 接入（Cursor 用 1.7+ hooks.json；Hermes 用 config.yaml shell hooks + skill + MCP；OpenClaw 用原生扩展 + ClawHub），并且 README 记录了对 OpenClaw `memory-core` 的共存策略（不抢 memory slot，`memory-core` 的 dreaming cron 继续跑）。这些集成细节可以喂给清单里对应条目的成熟度判断。
- **arXiv（try）**：基准用的是 arXiv 上的 LoCoMo 长上下文记忆基准（arXiv 2402.17753），与清单里的 arXiv 来源条目对上。
- **Trendshift（watch）**：README 里挂了 Trendshift 的仓库徽章（repositories/28172）。
- 其余条目（如 Goals、rules 等）是 Hivemind 自身功能，不在给定清单内。

## 证据与局限

**原文给出的数据**：

- LoCoMo 长上下文记忆基准（100 QA pairs，Claude Haiku via `claude -p`，词法 + 语义混合检索）：成本 / 100 QA 从 \$8.94 降到 \$6.65（便宜 25%），每问 token 从 1,700 降到 1,008（少 1.7×），每问轮数从 8.9 降到 6.2（少 31%）。README 给的机制解释是「prior work 已在召回范围内，不必每会话重新推导」。
- 仓库指标：npm 包 `@deeplake/hivemind`，License Apache 2.0，Node ≥ 22.0.0，YC 背景；初筛给的信息里 stars 为 1622。

**只是作者主张、没有数据支撑的**：

- 「一个工程师的 agent 周一搞定迁移、周二全队 agent 都会执行这个模式」是叙事性开场，不是案例数据。
- 「One brain for all your agents」「sharper」等定位表述属于宣传语。
- 上述基准是作者自测（自家 README 的表格），原文未提供第三方复现、消融细节或误差范围。

**适用条件与硬约束**：

- 需要 Deeplake 账号与 token，数据默认写进团队 workspace；README 明说「All users in your Deeplake workspace can read this data. That's the design.」——捕获内容包括用户 prompt、工具调用名称与完整输入、完整工具输出、助手回复、子 agent 活动。想自带存储得走 BYOC（GCS/Azure/S3/on-prem）。
- 语义检索默认关闭（依赖约 600 MB），不装时检索静默降级为 ILIKE 词法；README 说明 embeddings 状态的种子变量只在 `~/.deeplake/config.json` 尚无 `embeddings.enabled` 时读一次。
- **Claude Cowork 是 Alpha，且 auto-capture 只覆盖 Local Agent Mode 会话**（能 tail 到 transcript 的那部分）；普通 desktop-chat 轮次因 MCP 设计读不到会话、也无法从压缩的 claude.ai IndexedDB 缓存读取，不会被捕获。
- 安装器会把下载脚本直接管道给 shell（或用 PS 的 `iex`）；npm 路径跳过安装器自带的检查。Codex 首次必须信任 hooks，否则全程静默失效。
- 按目录 `.hivemind` 不继承（nearest wins），叶目录要用父目录的 org 就得自己再写一遍。
- 原文在 `rules` 一节被截断，`goals`、`hivemind_graph` 等只出现在 Hermes/pi 的 skill 目录名里，没有可照做的正文，不能据此推断步骤。
- 整体仍是较新的项目（Claude Cowork 集成自称 Alpha），不建议直接当作团队级基础设施铺开。

## 怎么试、怎么验证

**最小试用（建议 2–4 周，单机单 agent）**：

1. 选一个仓库、一个 agent（Claude Code 最稳，走 marketplace plugin），按上面的命令安装并登录。
2. 先不开 embeddings（省掉约 600 MB），用词法检索跑通闭环；确认 `hivemind status` 显示已接线、会话开始 banner 显示正确的 org/workspace。
3. 用 `.hivemind` 把敏感仓库设成 `{ "collect": false }`，或只在自己指定的仓库里 `{ "collect": true }`，确认 banner 打印 `capture is disabled for this directory` 符合预期。
4. 连续做几天真实工作（尤其是重复性任务：迁移、鉴权 bug 排查、API 设计决策），然后跑 `hivemind skillify` 看是否真的产出了 `SKILL.md`、有没有出现在 `<project>/.claude/skills/` 下。
5. 如果团队有第二个人，用 `hivemind skillify pull` 看能否把对方的技能拉到自己这边并生效。

**判断有没有改善的指标（沿用 README 的口径，自己测一遍）**：

- **成本 / 任务**：固定一批重复问答（可以用自己团队的真实问题凑 20–100 条），对比接入前后的花费。
- **token / 问题**：同一批问题接入前后每问消耗 token 数。
- **轮数 / 问题**：同一批问题达到同样答案所需的对话轮数——README 称这是「不必每会话重新推导」的直接体现。
- **技能复用率**：`hivemind skillify` 产出的 SKILL.md 里，有多少在后续会话被真正引用；产出很多但没人用的是噪声信号，此时应调高 `HIVEMIND_SKILLIFY_EVERY_N_TURNS`。
- **文档新鲜度**：跑 `hivemind docs list` 看是否 enabled、页数、是否与 HEAD 同步。
- **反向指标（防翻车）**：后台 worker 的额外开销（可用 `HIVEMIND_WIKI_WORKER=1` 关掉摘要 worker 做对照）、会话是否变慢（OpenClaw 场景下换小模型验证）、以及一次隐私审计——检查 banner 披露的 org/workspace 是否与预期一致、workspace 里是否出现了不该出现的会话内容。

若三项效率指标没有同向改善、或 skillify 产出长期不被复用，就把 verdict 降到 study：把它当作「trace → 技能固化」这个思路的参考实现来读，而不必在生产里用这套具体工具。
