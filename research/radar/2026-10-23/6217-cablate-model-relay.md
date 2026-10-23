# cablate/model-relay

- 结论：**值得一试**。如果你长期在 Claude Code 里工作，可以小范围试用：先只把 haiku 这类子任务和 429 故障转移接到一个备用 provider，用 /provider doctor --ping 确认链路通，再按窗口逐步放开。理由是 README 给出了可直接复制的安装、配置和自检命令，并有默认保守的开关；但它仍是单人用的本地守护进程，缺少效果数据，先小范围试、别急着全量替换。
- 原文：https://github.com/cablate/model-relay
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T05:51:38.363Z

## 是什么

`model-relay` 是 Claude Code 的插件，在本机 `127.0.0.1:8950` 上跑一个轻量路由守护进程，解决 Claude Code 模型设置“全局绑定所有终端窗口”的问题。它做四件事：

1. **按窗口/会话切模型**：在输入框上方的 `/provider` 交互面板里一键把“当前这个窗口”切到某个 provider，其他窗口不受影响。
2. **按请求路由**：通过 `matchModels` + `ANTHROPIC_DEFAULT_*_MODEL` 把 `haiku` / `sonnet` / `opus` 这类别名请求导到指定 provider；也可以动态注册 `model-relay:<name>` 子代理类型，让某个子代理跑在别的模型上。
3. **429 自动故障转移**：Anthropic 返回用量上限（HTTP 429）时，把请求转给 `failover.chain` 里的第一个 provider，并把这个会话钉住 7 天；冷却期（默认 10 分钟）后新会话再回去试 Claude，已钉住的会话保持不动。
4. **provider 重试**：429/5xx 时在同一 provider 上指数退避重试，Claude Code 看不到中间失败。

定位很明确：**单人本地守护进程**，不是给整个组织用的多租户云代理（作者自己说那种场景应该用 LiteLLM）。所有 provider 必须能接 Anthropic 的 `/v1/messages` 格式；只会说 OpenAI Chat Completions 的服务需要本地翻译层。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 前提

- Node.js 20+，Claude Code 2.1.287 或更新（作者在 Node.js 22.23.2 与 Claude Code 2.1.306 上测过）。
- 至少一个备用的 Anthropic 兼容端点（内置 preset：`zai`、`deepseek`、`kimi`、`minimax`、`openrouter`，或用 `--url` 指定自己的网关）。
- 接受这是**单用户本机**工具，不是团队共享代理。

### 步骤 1：先把 API key 设进环境变量，再启动 Claude Code

前提：key 由 router 进程从它继承的环境里读，**你在已经跑着 Claude Code 的 shell 里 export 是看不到的**。要写成永久变量，然后开新终端。

```sh
export BACKUP_API_KEY="your-api-key"      # macOS/Linux，写进 ~/.zshrc
setx BACKUP_API_KEY "your-api-key"        # Windows
```

### 步骤 2：安装插件

```sh
claude plugin marketplace add cablate/model-relay
claude plugin install model-relay@model-relay
```

### 步骤 3：让 Claude 陪你完成配置

前提：如果 Claude Code 之前已经开着，先 `/reload-plugins`。

```text
/provider setup
```

原文说明：setup 工具会替你跑，**不会让你把 key 粘到聊天里**，改 `~/.claude/settings.json` 之前会征求同意。可以直接带目标，例如：

```text
/provider setup use deepseek for haiku
```

### 步骤 4：手动路径（不想用交互 setup 时）

```text
/provider init
```

这会创建 `~/.claude/model-relay.json`（**先不含任何 provider**，所以所有请求仍走 Claude），并把 `~/.claude/settings.json` 里的 `ANTHROPIC_BASE_URL` 指向 relay。然后加 provider：

```bash
node tools/setup.mjs add <name> --preset <preset> --model <model id> --token env:<VAR>
```

前提：`node tools/setup.mjs` 要在插件安装目录里跑，即 `~/.claude/plugins/cache/model-relay/model-relay/<version>/`（设了 `CLAUDE_CONFIG_DIR` 时是 `$CLAUDE_CONFIG_DIR/plugins/cache/model-relay/model-relay/<version>/`，`ls` 一下看版本号）；在别处要用该目录下 `tools/setup.mjs` 的完整路径。`presets` 子命令列内置 preset。改完重启 Claude Code。

### 步骤 5：自检（这一步是关键，别跳）

```text
/provider doctor --ping
```

期望看到 `Config OK`、provider 出现在 `Providers` 下、`Upstream ping` 下有一个 `✓`。原文给的样例输出：

```text
Config OK (~/.claude/model-relay.json)
  Port: 8950
  Providers: backup -> your-model-id
  Failover: backup (back to Claude after 10 min)    Retry: on
  Aliases:  none (run "node tools/setup.mjs alias haiku <provider>" to route haiku)
  Claude settings: ✓ settings.json ANTHROPIC_BASE_URL=http://127.0.0.1:8950
  Router health: ✓ up on 127.0.0.1:8950 (pid 38780, <version>, pinned sessions: 0, 429 failover: idle, proxy off (0 routed / 0 tunnelled))
  Upstream ping:
    ✓ backup     (your-model-id) -> answers, first byte after 640 ms
```

`doctor` 默认**只报告、不改动**；加 `--fix` 才让它自己修能修的问题。`doctor --json` 给同样的结论，每条带修复参数（`fix`）和是否需要你确认（`needsConsent`），适合挂脚本。

### 步骤 6：把 `haiku` 类请求导到便宜/备用 provider

前提：新配置下 `haiku` 及所有请求默认都留在 Claude，**不加 alias 就不会外流**。这一步是显式打开。

```bash
node tools/setup.mjs alias                        # 查看 haiku / sonnet / opus / subagent 默认
node tools/setup.mjs alias haiku backup           # 同时改 settings.json 与 model-relay.json
node tools/setup.mjs alias haiku claude           # 改回 Anthropic Claude
node tools/setup.mjs alias subagent sonnet        # 设 CLAUDE_CODE_SUBAGENT_MODEL=sonnet
```

原文解释了两处联动：`settings.json` 里写 `env.ANTHROPIC_DEFAULT_HAIKU_MODEL = "your-model-id[1m]"`，让 Claude Code 自己把 `haiku` 别名解析成该模型；`model-relay.json` 里给 `providers.backup.matchModels` 加 `"haiku"`，接住 Claude Code 内部硬编码 `claude-haiku-*` 的调用。

### 步骤 7：给单个 provider 配专属子代理

前提：router 会为每个 provider 动态注册全能力 `Agent` 类型 `model-relay:<name>`，不用写 `.claude/agents/*.md`，也不用重启会话。在 `~/.claude/model-relay.json` 里：

```json
"providers": {
  "backup": {
    "model": "your-model-id",
    "agent": {
      "description": "Use for routine, well-scoped tasks: code search, summaries, small edits.",
      "effort": "medium",
      "maxTurns": 40
    }
  }
}
```

`description` 是 Claude 在挑子代理时读到的那行，要写清“什么时候选它”——这是把任务类型和模型对上号的关键字段。改 `agent` 从下一条消息起生效。原文列了实测限制：`permissionMode` 无法松动或收紧处于 `bypassPermissions` 的父会话；`initialPrompt` 对 Agent 工具起的子代理不生效；`memory` 无效。

### 步骤 8：配 429 故障转移链

```bash
node tools/setup.mjs providers
node tools/setup.mjs add local --url http://127.0.0.1:4000 --model your-local-model-id --token env:LOCAL_GATEWAY_TOKEN
node tools/setup.mjs set failover.chain backup,local
node tools/setup.mjs set providers.local.fallback none
```

相关默认值（原文配置表）：`failover.enabled` 默认 `true`；`failover.chain` 默认空（空则 429 原样返回；`add` 会把新配置的第一个 provider 放进来）；`failover.cooldownMs` 默认 `600000`（10 分钟，允许 60000–7200000）；`retry.attempts` 默认 `3`（`0` = 无限重试）；`retry.delayMs` 默认 `2000`；`retry.backoff` 默认 `2`；`retry.maxDelayMs` 默认 `10000`；`retry.failover` 默认 `false`（显式打开后，重试耗尽才转下一个 provider，且不会转回已试过的）。本地网关可设 `launch: { command, args }`，端口关着时 router 自动拉起。

### 步骤 9：把状态接进自己的 statusline

前提：每个窗口把状态写到 `~/.claude/model-relay-status/<session id>`，一行 `kind<TAB>label`；`session_id` 就是 Claude Code 传给 `statusLine` 命令的那个 id。`kind` 取值：`claude` / `pinned` / `failover` / `limit` / `offline` / `direct`。一周没更新的文件 router 会删。

### 步骤 10（可选）：用 Remote Control 又不想丢掉路由

```bash
node tools/setup.mjs proxy enable --go
node tools/setup.mjs rc
```

前提与代价（原文明确写了）：`HTTPS_PROXY` 写在 `settings.json` 的 `env` 里，所以**Claude Code 跑的命令（git、curl、gh）也会走 relay 当盲隧道，router 挂了它们就失败**；proxy 模式下 router 停了 Claude Code 连不上，得 `node tools/setup.mjs rc` 重启；`proxy disable --go` 可逆，旧 settings 保留为 `settings.json.model-relay-backup`，但已在 proxy 模式的会话要重启才能恢复。

### 步骤 11：从 0.6 及更早版本升级的额外动作

只更新插件不够，0.7+ 只读 `"format": 2`。要么：

```text
/provider setup upgrade my model-relay config
```

要么手动（`node tools/setup.mjs migrate` → `migrate --go` → `/provider restart`）。不迁移的话，后台跑着的 0.6 router 会一直跑旧代码。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 还能接管哪些没想到的工作）**
只有间接依据：router 会为每个 provider 动态注册全能力 `Agent` 类型 `model-relay:<name>`（保留父会话全部工具），意味着“同一会话里把搜索、摘要、小改动这类边界清晰的任务甩给便宜模型”这件事可以随时发生、不用建 agent 文件、不用重启。原文没举出具体工作类型的清单，只给了 `description` 的写法示例。

**2. 任务匹配（什么工作适合怎样的模型、工具、协作方式）** —— 这是该工具最直接的贡献
- 按**窗口/会话**匹配：一个终端跑 Claude，另一个窗口切到备用 provider，互不干扰。
- 按**请求别名**匹配：`haiku`（子代理、`WebFetch` 摘要、内部辅助调用）可整体外包，主对话仍留在 Opus/Sonnet。
- 按**子代理类型**匹配：`subagent_type: "model-relay:backup"` 按需起一次性子代理。
- 按**任务描述**匹配：`agent.description` 写“适合例行、边界清楚的任务：代码搜索、摘要、小改动”，这是让模型自己判断何时选哪个代理的机制。
- 路由优先级（原文明确）：请求的 `model` 等于某个 provider 自己的 `model` → 直接给它；否则按配置顺序试 `matchModels`，第一个命中者胜。match 到 Claude 名字（`claude-*`/`haiku`/`sonnet`/`opus`）会被替换成该 provider 的 `model`，所以 pattern 要匹配上游真正认识的模型 ID。

**3. 条件供给（需要给哪些信息、工具、权限、反馈）**
- **信息**：provider 的 `baseUrl`、`model` ID（必须自己填，作者说模型 ID 会过时所以不内置）、`token` 或 `env:VAR_NAME`、`authHeader` 形态（`bearer`/`x-api-key`/`both`，内置 preset 里只有 `zai` 用 `both`）、是否 `stripCacheControl`。
- **工具/环境**：Node 20+、Claude Code 2.1.287+；本地网关要能被 `launch` 拉起；`ANTHROPIC_BASE_URL` 指向 `127.0.0.1:8950`（或 proxy 模式下 `HTTPS_PROXY` + 只信任 `api.anthropic.com` 的 `NODE_EXTRA_CA_CERTS`，证书只约束 `api.anthropic.com`、私钥签名后即丢、不碰系统证书库）。
- **权限**：`/provider setup` 改 `~/.claude/settings.json` 前会问；`doctor` 默认只报告，`--fix` 才动手；`proxy enable` 会重写 settings。
- **反馈**：每次编辑配置留 `.model-relay-backup` 副本，token 从不打印；面板把“最近一次真实请求（`last 200 · 45.0s`）”和“最近一次测试（`test ok 640ms`）”分开显示；测试发一个 1-token 请求、拿到首字节就停（最多 15 秒），失败会用人话说原因（key 被拒、模型名错、额度用尽、本地网关没起、超时）；router 跳过某 provider 时（它的 `env:` 变量对 router 未设）面板会说明。

**4. 主动推进（时间、事件、状态触发并持续完成）**
- **事件触发**：Anthropic 返回 429 → 立即转 `failover.chain` 第一个 provider，并钉住该 session 7 天。
- **时间触发**：`failover.cooldownMs` 到期后，新会话重新试探 Claude；已钉住的会话继续留在备用。
- **状态触发**：provider 返回 429/5xx → 同 provider 指数退避重试（`attempts`/`delayMs`/`backoff`/`maxDelayMs`），`attempts: 0` 表示一直重试；客户端断开就停（会监听连接）。开了 `retry.failover` 才在重试耗尽后转下一个 provider。
- **状态触发（本地）**：`launch` 配了本地网关时，端口关着就自动拉起进程。
- `idleTimeoutMs`（默认 300000）控制上游多久不发数据算失败；仍在推流的回答不会被切断。

**5. 效果验证（怎么判断确实改善了结果）**
- `/provider doctor [--ping] [--fix]`：`Config OK`、provider 列表、`Upstream ping` 首个字节耗时；`doctor --json` 给脚本每条带 `fix` 与 `needsConsent`。
- `/provider ping`：逐个 provider 测“答不答、多快开始答、不答是什么问题”。
- 面板双指标分离：避免把“回复长”误读成“provider 慢”。
- 子代理模型一致性双重检查：子代理启动时对 Claude Code 报告的模型查一次，结束时对 router 实际收到的模型再查一次，任一不符弹提示指向 `/provider doctor`（原文提到 Claude Code 可能悄悄换模型，只在 debug 日志里留一行）。
- 状态文件 `~/.claude/model-relay-status/<session id>` 的 `kind` 可判断窗口实际走的是 Claude、被钉住、还是直连。
- 日志：`model-relay.log`、`model-relay-requests.log`（原文在此处被截断）。

## 与已有做法的关系

- **Claude Code（adopt）**：`model-relay` 是 Claude Code 的插件，不是替代品。它补的是 Claude Code 当前“模型设置全局绑定”的空档——窗口级切换、别名级路由、子代理级路由、429 故障转移。清单里已经有 Claude Code，这条线索的价值是“在 Claude Code 之上再加一层路由”的具体做法。
- **DeepSeek（try）**：`deepseek` 是内置 preset 之一（与 `zai`、`kimi`、`minimax`、`openrouter` 并列），preset 只预填地址和兼容开关，**模型 ID 永远要自己选**。所以这条线索可以看成“把清单里已试的 DeepSeek 接进 Claude Code 工作流”的一条现成通路，但两者不冲突、也不互相替代。
- 原文自己划的边界：多租户云代理场景应改用 **LiteLLM**，`model-relay` 只做单用户 localhost 守护进程。

## 证据与局限

**原文给出的具体物（可核对的）**
- 明确版本门槛与测试环境：Claude Code 2.1.287+，作者在 Node.js 22.23.2 + Claude Code 2.1.306 上测过；另有“Tested on Claude Code 2.1.308”的 agent 字段实测结论。
- 完整默认值表（端口 8950、cooldown 600000、retry 3 次 / 2s / ×2 / 上限 10s 等）与取值边界（backoff 1–4、cooldown 钳到 1 分钟–2 小时、attempts 上限 30）。这是可以照着配的硬信息。
- 安全设计细节：只监听 `127.0.0.1`；证书带 `api.anthropic.com` 的名字约束；无遥测；token 从不打印；编辑留 `.model-relay-backup`。
- 已知坑写得很实：`env:VAR` 从 router 进程环境读，后 export 的看不到，要重启 router；**`doctor` 读的是你的 shell，所以可能报告 key 已设而 router 根本看不到**——这个“假阳性”值得写进手册。
- 一处实测负面结论：Claude Code 可能悄悄把子代理换到另一个模型，只在 debug 日志留一行，所以插件才要做双端比对。

**只是作者主张、没有第三方或数据支撑的**
- “每个窗口和子代理都能用你想用的模型”“零外部云代理”“Remote Control 照常可用”——都是设计目标陈述，没有对比数据。
- 没有任何效果数据：没有成本节省比例、没有故障转移成功率、没有延迟对比、没有案例故事。
- 仓库 38 stars，属小众项目；维护者规模、issue 处理、长期兼容性都未知。
- 原文在“日志”那段被截断，`Cost, privacy, and permissions` 一节没写完，日志字段与实际排错流程无法确认。

**适用条件**
- 单人本机使用；多人/组织级代理不适用（作者指向 LiteLLM）。
- 所有 provider 必须接受 Anthropic `/v1/messages`；纯 OpenAI Chat Completions 的服务需要额外的本地翻译层，这一层原文没给。
- 用 proxy 模式换 Remote Control 的代价是：`git`/`curl`/`gh` 也走 relay，router 挂了命令就失败。
- 从 0.6 升级必须先迁移配置，否则旧 router 继续跑旧代码（含 0.7 才修的会话/工具丢失问题与 localhost 安全检查）。

## 怎么试、怎么验证

**最小试用（半天内可完成，风险可控）**

1. 装插件 → `/provider setup` → 只加**一个**备用 provider（建议就用清单里已 try 的 DeepSeek 内置 preset）→ `/provider doctor --ping` 拿到 `✓` 与首字节时间。此步不改任何现有窗口的模型，因为新配置默认全部走 Claude。
2. 只开一个口子：`node tools/setup.mjs alias haiku backup`，把子代理/`WebFetch` 摘要这类低风险请求导出去。跑一天。
3. 再开第二个口子：`node tools/setup.mjs set failover.chain backup`，把 429 接管打开（这本来就是 `add` 的默认行为，确认一下即可）。跑一周。
4. 确认稳定后，再考虑 `/provider <name>` 做窗口级切换，或配 `model-relay:<name>` 子代理。proxy 模式（Remote Control）放最后，且清楚“router 停了命令也停”的代价。

**判断有没有改善（指标；均为我建议的观测项，原文只提供观测手段，不给阈值）**

| 维度 | 看什么 | 怎么取数 |
|---|---|---|
| 链路是否通 | `Config OK` + `Upstream ping` ✓ + 首字节毫秒 | `/provider doctor --ping`、`doctor --json` |
| 稳定性是否变好 | 一周内“因 429 导致回合失败”的次数；`failover` / `retry` 触发的次数与最终成功率 | 状态文件 `kind` 出现 `failover`/`limit` 的频次；`model-relay-requests.log` |
| 模型是否真的换了 | 有没有出现“子代理实际模型不符”的提示 | 插件启动/结束双检的 notice；`/provider doctor` |
| 成本是否下降 | 外包出去的那部分请求（haiku 类）占比与花费 | 各 provider 账单对比，Claude 侧用量变化 |
| 有没有引入新故障 | router 挂掉导致的中断；proxy 模式下 `git`/`curl` 失败次数 | 终端报错；`model-relay.log` |
| 是否值得继续 | 上面几项综合：稳定性提升 > 新增故障，成本下降 > 迁移与维护成本 | 一周为一个观察窗 |

**回滚**：`node tools/setup.mjs alias haiku claude` 把别名收回；`/provider retry off`、`/provider failover off` 一键关；proxy 模式用 `proxy disable --go`（旧 settings 留在 `settings.json.model-relay-backup`，但 proxy 模式下的会话需重启）。注意 `remove <name>` **不会**动 `settings.json` 里的 `ANTHROPIC_DEFAULT_*_MODEL` 别名——如果别名还指着被删的 provider，请求会落回 Claude，需要自己逐个别名 reset（`doctor` 会警告没人认领的别名）。

**建议写进手册的三个坑**
1. key 必须在启动 Claude Code **之前**就存在于环境里，后 export 的看不到；`doctor` 读 shell，可能给出“key 已设”的假阳性。
2. 内置 preset 只给地址和兼容开关，**模型 ID 一定要自己填**，而且 pattern 要匹配上游真认识的 ID（`^backup` 这种写 provider 名的会传一个上游没听过的模型名过去）。
3. 升级前先 `migrate --go` 再 `/provider restart`，否则后台旧 router 继续跑旧代码。
