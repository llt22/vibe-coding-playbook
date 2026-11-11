# StaysUp/agentbus

- 结论：**值得一试**。建议小范围试用：按 README 启动 AgentBus 本地网关，用 curl 或 cockpit 记录编码智能体的模型调用、成本和完整会话，先验证隔离、diff/apply 与多模型切换；理由是原文给出了可复制命令和权限配置，但项目较新且有已知限制，不宜直接全面替代现有工作流。
- 原文：https://github.com/StaysUp/agentbus
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-11T02:25:35.606Z

## 是什么
AgentBus 是一个跨厂商的编码智能体中间件，位于编码智能体（当前支持 Claude Code 和 codex）与模型厂商之间。它把每次模型请求和回复记录到本地，给每次调用计价，并在自己的存储中保存会话历史；每个 turn 在文件夹副本中运行，可查看 diff、全量应用变更、做可选评审，也可通过统一 API 让程序或 CI 启动 turn。

## 具体做法（编号步骤）
前提：macOS 或 Linux；已安装并登录 `claude`（Claude Code）或 `codex`，或两者都有；用 `go install` 或源码构建时才需要 Go 1.27.1 以上。以下按本地单人最小试用写。

1. **安装并确认版本**（Homebrew 或安装脚本二选一；Go 路线需 Go 1.27.1+）
```sh
brew install staysup/tap/agentbus
# 或
curl -fsSL https://raw.githubusercontent.com/staysup/agentbus/main/install.sh | sh
agentbus version
```

2. **启动本地服务**（前提：`claude`/`codex` 已在当前 shell 可运行并已登录）
```sh
agentbus up
```
默认监听 `http://127.0.0.1:8787`，并打印数据目录。数据目录优先级为 `$AGENTBUS_HOME`、`$XDG_DATA_HOME/agentbus`、`~/.local/share/agentbus`。首次启动会生成 `token` 文件，每个 API 请求都要带它。

3. **检查 harness 是否被找到并已登录**
```sh
TOKEN=$(cat ~/.local/share/agentbus/token)
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8787/api/v0/harnesses
```
返回中每个 harness 会给出 `found`、`version`、`signed_in`。只有 `found` 且 `signed_in` 的 agent 才适合启动 turn。

4. **用 curl 起一个只读 hello turn**（前提：`folder` 必须是存在的绝对路径；`read_only` 让 agent 只有读工具）
```sh
curl -s http://127.0.0.1:8787/api/v0/turns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent":"claude","folder":"'"$PWD"'","prompt":"Say hello in five words.","model":"haiku","read_only":true}'
```
默认会在数据目录下为本次会话做文件夹副本，原文件夹不被修改；要直接改原文件夹可传 `"isolate":false`。隔离方式由 `permissions.toml` 的 `isolation` 决定，默认 `auto`。

5. **读回 turn 记录、回复、状态和成本**
```sh
curl -s "http://127.0.0.1:8787/api/v0/turns?session=<id>" -H "Authorization: Bearer $TOKEN"
```
把上一步返回的 `id` 填到 `<id>`。`GET /api/v0/turns/<turn>` 可只读一个 turn。

6. **在同一会话中续聊并切换模型**
```sh
curl -s http://127.0.0.1:8787/api/v0/turns -H "Authorization: Bearer $TOKEN" \
  -d '{"session":"<id>","prompt":"Now add a test for it.","model":"sonnet"}'
```
每条消息可单独指定 `model`、`agent` 或两者；不指定则沿用上一次。这样可对同一会话做模型切换对比。

7. **查看 diff，并一次性 apply 到自己的文件夹**
```sh
curl -s http://127.0.0.1:8787/api/v0/turns/<turn>/diff -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://127.0.0.1:8787/api/v0/turns/<turn>/apply -H "Authorization: Bearer $TOKEN"
```
`apply` 会先检查每个文件；如果原文件夹中的文件在会话之后被改过，会返回 409 并列出冲突文件，不写入。

8. **配置权限与限制**（前提：编辑数据目录下的 `permissions.toml`；每个 turn 启动时读取，API 每个请求也读取）
```toml
read_folders = ["~/.agents"]
allow = ["go test", "make test"]
forbid = ["git push", "git checkout"]
edit = "session"
subagents = true

[limits]
max_depth = 2
max_jobs_per_turn = 10
max_jobs_per_tree = 30
max_cost_usd_per_tree = 0.0

[agent_api]
scope = "tree"
read = true
list_agents = true
start = true
continue = true
review = true
cancel = true
rename = true
```
`allow` 会转成 Claude Code 的允许工具规则；`forbid` 由 gateway 检查模型回复中的 shell 命令文本并拒绝；`max_cost_usd_per_tree` 为 0 表示关闭成本上限。注意：`forbid` 看不到运行时拼接出来的命令，也看不到 agent 早先写入脚本后再执行的命令；强规则还要配合收回凭据。

9. **可选：接 OpenRouter 上的其他模型**（前提：服务环境变量中有 `OPENROUTER_API_KEY`）
```sh
curl -s http://127.0.0.1:8787/api/v0/agents -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"DeepSeek","harness":"claude","access":"openrouter","model":"deepseek/deepseek-v4.1-flash"}'
```
之后可在 turn 中传 `"agent":"<新 agent id>"` 把会话交给它。原文明确：OpenRouter turn 当前成本显示为 `$0`，因为价格表还没有 OpenRouter 价格。

10. **可选：停止正在运行的 turn**
```sh
curl -s -X POST "http://127.0.0.1:8787/api/v0/turns/<turn>/stop" -H "Authorization: Bearer $TOKEN"
```

11. **可选：浏览器 cockpit**
Cockpit 在独立仓库 `staysup/agentbus-cockpit`，按该仓库 README 启动，使用 `agentbus up` 的服务地址和 token 文件中的 token。

## 对应的研究问题
- **能力发现**：AgentBus 把“让另一个 agent 评审/接手/并行处理”做成会话内动作，例如在聊天里说“have codex review this”“ask all three”；被询问的 agent 在另一份文件夹副本中工作，并通过 API 读取提问 turn 的 diff。它还支持消息排队，以及每条消息切换模型或 agent，适合发现多模型分工、交叉评审、批量委派等原本不容易交给 AI 的工作。
- **任务匹配**：当前明确支持 Claude Code 与 codex；可用 `model` 参数按消息指定模型；可用 `read_only` 做只读任务；可用 `subagents=false` 禁止 agent 自己再开子代理；可限制并发（`-max-runs` 默认 4，runner `-capacity` 默认 4，范围 1–64）；隔离方式可选 `auto`、`overlay`、`copy`、`git`、`none`，适合按任务风险选择不同隔离和权限。
- **条件供给**：需要提供已安装并登录的 harness、服务 `PATH` 能找到 `claude`/`codex`、API token、绝对文件夹路径、`permissions.toml` 中的读写/允许/禁止/编辑/子代理/成本限制、`instructions.md` 中的统一附加指令、OpenRouter 的 `OPENROUTER_API_KEY` 环境变量；多机时还要 `enroll_token`、connector/runner 地址和网络 allow 列表。
- **主动推进**：turn 是 job，消息可排队，agent 间转交不等待、答案作为后续 turn 回来；程序或 CI 可通过 Jobs API 启动和读取 turn。原文没有内置“时间/事件触发器”，持续或状态触发需要外部程序调用 API，但 API 和 job 队列为这种自动化提供了基础。
- **效果验证**：`events.db` 保存每个 turn 的模型请求和回复，`cost/` 给每次调用计价；每个 turn 有 diff，`apply` 做冲突检查并返回 409；评审会给出 pass/fail/unknown 和 findings，任何 P1 即 fail；`forbid` 拒绝会记录为 `tool.refused` 事件；可用 `max_cost_usd_per_tree` 设成本上限。这些都能作为验证“是否改善结果”的记录来源。

## 与已有做法的关系
- **Claude Code（清单中为 adopt）**：AgentBus 不替代 Claude Code，而是作为中间层运行已登录的 `claude`，补上调用记录、成本、会话存储、隔离副本、diff/apply、评审和统一 API。它可视为对现有 Claude Code 工作流的增强，尤其适合需要多模型对比和过程核验的场景。
- **DeepSeek（清单中为 try）**：原文示例可通过 OpenRouter 把 DeepSeek 作为 saved agent 接入（`harness: claude`、`access: openrouter`、指定模型），从而在 AgentBus 会话中切换使用。但原文同时说明 OpenRouter turn 成本显示为 `$0`，所以用它做成本对比时不能依赖 AgentBus 的成本数字。
- 清单中没有其他直接相关条目。

## 证据与局限
原文给出的可验证内容主要是安装命令、API 示例、`permissions.toml` 配置、隔离/apply/评审机制和已知限制。原文给出的具体数据包括：默认监听 `127.0.0.1:8787`；`-max-runs` 默认 4、范围 1–64；runner `-capacity` 默认 4；跨机器首次传输 50,000 文件、414 MB 的文件夹约 30 秒，后续会话只传变化约 4 秒；OpenRouter turn 成本显示 `$0`；网络控制仅 Linux，默认关闭，macOS 上 `contain="on"` 会拒绝每个 turn；Ubuntu 24.04 尚未测试；会话不能跨 runner 迁移；远程 runner 上 codex 订阅登录暂不支持；被询问的 agent 能读提问 turn 的 diff，但不能运行那些未应用的文件。
局限：这些是项目 README 的功能说明和作者主张，没有第三方基准、用户案例或量化收益数据；仓库仅约 30 stars，成熟度有限；需要本地安装和已有 Claude Code/codex 登录，不是托管服务；网络跨机器时无 HTTPS，需要 SSH 隧道或私有网络；`forbid` 只检查命令文本，存在绕过边界。适用条件主要是个人或小团队在 macOS/Linux 本地或私有网络中使用，且接受先小范围验证。

## 怎么试、怎么验证
最小试用方式：按上面第 1–7 步安装、启动、检查 harness、起一个只读 hello turn、读回记录与成本、续聊并切换模型、查看 diff 后 apply；再用第 8 步加入 `allow=["go test"]` 和 `forbid=["git push"]`，观察允许和拒绝是否按预期记录；最后可选接一个 OpenRouter agent 做同会话多模型对比。

判断有没有改善的指标：
- 每次模型调用是否都能在 `events.db`/API 中看到请求、回复、turn 和 session；
- 每个 turn 的成本是否可见（注意 OpenRouter 当前为 `$0`，不能作为成本依据）；
- 同一会话能否在切换模型或 agent 后继续，历史是否保持；
- 原文件夹是否在 agent 运行期间不被污染，apply 是否只在无冲突时写入、冲突时正确返回 409；
- `forbid` 命令是否被拒绝并产生 `tool.refused` 事件；
- 多 agent 评审是否给出 pass/fail/unknown 和 findings，P1 是否导致 fail；
- 与不用 AgentBus 的手工流程相比，记录成本、核对 diff、切换模型和复现会话的人工时间是否下降，误改或漏审次数是否减少。
建议先用 1–2 周、在非关键仓库或只读任务上试用，记录上述指标后再决定是否扩大到日常编码工作流。
