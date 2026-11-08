# yanstd888/9routerx

- 结论：**值得研读**。把「本地网关层做多供应商路由 + 按 key 预算护栏 + 工具输出压缩」当作架构范式研读，但不要直接采用 9RouterX 这个具体实现——README 里的示例模型名（gemini-3.7-flash）和构建前置（Go 1.27）都不存在，20–40% 省 token、248 免费模型等数字无任何证据，keyless 与网页 Cookie 取号方式还有 ToS 与账号风险。
- 原文：https://github.com/yanstd888/9routerx
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-08T18:54:20.174Z

## 是什么

9RouterX 是一个自托管的本地 AI 网关（LLM router）项目 README：单个 Go 二进制，内嵌 Svelte 5 仪表盘，默认监听 `20128`，对外暴露 OpenAI 兼容端点（`/v1/chat/completions`、`/v1/messages`、`/v1/responses`、`/v1/embeddings`、`/v1/models`）和 Anthropic 兼容端点，把 Claude Code、OpenAI Codex CLI、Cursor、Cline/Roo Code、OpenCode、Gemini CLI、OpenClaw 等编码客户端统一接到上游多家供应商。

README 声称的四组核心能力：

1. **三层故障转移**：`Subscription → Cheap API → Free/Keyless`，即订阅额度先用、耗尽转低价 API、再兜底免费模型。路由策略含 `fallback`、`round-robin`、`sticky`、`capacity`、`fusion`。
2. **Token Saver**：对 CLI 与工具输出做压缩过滤，声称省 20–40% token，含 50+ 按工具的输出过滤器（`git diff`、`git log`、`grep`、`docker logs`、`npm install`、`cargo build`、`go test`、`terraform plan`、`kubectl`、`pytest` 等）、“Caveman / Ponytail / ADHD / Anti-Slop” 输出风格指令、tool-call JSON 修复。
3. **按 key 治理**：每日美元预算硬切断、请求限流、IP 白名单、按 key 注入系统提示、端点权限、SSRF/PII 防护。
4. **运维面**：模型健康探测 + 三级熔断、语义缓存、payload 检视、tracing、webhook/Telegram 告警。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 说明：以下步骤**均按 README 原文抄录**，但未经验证。原文示例中存在不存在的模型名与 Go 版本号（见「证据与局限」），执行前需逐条复核。

**步骤 1：安装（三选一）。前提：npm 方式需 Node.js >= 18；源码构建需 Go + Bun。**

```bash
# A. npm（README 推荐 Linux/macOS/Windows）
npm install -g 9routerx

# B. 官方安装脚本
# Linux & macOS
curl -fsSL https://raw.githubusercontent.com/yanstd888/9routerx/main/install.sh | sh
# Windows (PowerShell)
irm https://raw.githubusercontent.com/yanstd888/9routerx/main/install.ps1 | iex

# C. 或从 GitHub Releases 下载 linux-x64 / linux-arm64 / darwin-x64 / darwin-arm64 / win32-x64 独立包
```

**步骤 2：启动并建网关 key。前提：先改默认密码。**

```bash
9routerx
# Dashboard: http://localhost:20128 (Default password: 123456 — change in Settings → Profile)
# Next: Settings → API Keys → Create Key → copy your key (sk-...)
```

原文明确：`0 keys configured = 401 Authentication required`，即**必须先建至少一把 `sk-...` 才能发请求**。默认密码 `123456` 是明文写在 README 里的，暴露到任何非本机地址前必须改。

**步骤 3：冒烟测试。前提：已建好 `sk-YOUR-KEY`；README 建议用内置 keyless 模型免上游 key——但这一步建议改成你自己已付费/正规渠道的模型名。**

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR-KEY" \
  -d '{
    "model": "antigravity/gemini-3.7-flash-medium",
    "messages": [
      {"role": "user", "content": "Verify 9RouterX local gateway on port 20128 in one sentence."}
    ]
  }'
```

**步骤 4：后台常驻（不占终端）。前提：Linux/macOS；Windows 上 `stop` 用 TerminateProcess，不走优雅排空。**

```bash
9routerx start          # launch in background (writes DATA_DIR/run/gateway.pid)
9routerx status         # check running PID and active port
9routerx restart        # restart background instance
9routerx logs -n 100    # tail the last 100 lines of DATA_DIR/run/gateway.log
9routerx stop           # stop the background daemon
```

**步骤 5：Docker 方式（持久化 SQLite）。前提：把宿主 `~/.9router` 挂到容器 `/data`。**

```bash
docker run -d \
  --name 9routerx \
  --restart unless-stopped \
  -p 20128:20128 \
  -v ~/.9router:/data \
  -e DATA_DIR=/data \
  ghcr.io/yanstd888/9routerx:latest
```

**步骤 6：把编码客户端指过来（这是本文最可直接复用的部分）。**

Claude Code：

```bash
export ANTHROPIC_BASE_URL="http://localhost:20128"
export ANTHROPIC_API_KEY="sk-YOUR-KEY"
claude
```

Codex / OpenCode / OpenClaw（README 特别提示用显式 IPv4，避免 `localhost` 解析到 `::1` 连不上）：

```bash
export OPENAI_BASE_URL="http://127.0.0.1:20128/v1"
export OPENAI_API_KEY="sk-YOUR-KEY"
```

Cline / Cursor（JSON 配置）：

```json
{
  "apiProvider": "openai-compatible",
  "openAiBaseUrl": "http://127.0.0.1:20128/v1",
  "openAiApiKey": "sk-YOUR-KEY",
  "openAiModelId": "antigravity/gemini-3.7-flash-medium"
}
```

Gemini CLI / 其他 Anthropic 兼容客户端：

```bash
export GEMINI_API_BASE_URL="http://127.0.0.1:20128/v1"
export GEMINI_API_KEY="sk-YOUR-KEY"
```

**步骤 7：在仪表盘里配治理（README 只给了入口路径，没给字段级步骤）。**

- `Providers → Add Custom`：填自建/私有推理服务（vLLM、Ollama、llama.cpp、LM Studio、LiteLLM）的 OpenAI/Anthropic 兼容 base URL，可加自定义 header、每 provider 出站 HTTP/SOCKS5 代理、SSRF 规则。
- 组装 Combo 路由：选 `fallback` / `round-robin` / `sticky` / `capacity` / `fusion` 之一。
- 每把 key 设：日 USD 上限（硬切断）、请求速率、IP 白名单、系统提示、端点权限。
- 告警：`internal/notifications` 的 webhook 多目标、Telegram bot。

**步骤 8（可选）：把 9Router 的旧数据接过来。前提：先停旧进程，两者不能同时写同一个 SQLite。**

```bash
9routerx service take-over
```

默认数据目录：Linux/macOS `~/.9router/db/data.sqlite`；Windows `%APPDATA%\9router\db\data.sqlite`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现——AI 还能接管哪些没人想到交给它的工作。** README 展示了一类典型的“被忽略的工作”：不是内容生成，而是**请求生命周期管理**——配额耗尽后的自动续跑、429 时无感切换供应商、坏掉的 tool-call JSON 在途中修复、冗长终端输出在送进上下文前先削一遍。这些以前是人手动 `export` 换个 key、手动 `| head -50` 截日志，属于默认由人承担的隐形劳动。原文对“修复 tool-call 结构”和“50+ 按工具输出过滤”给了具体过滤器清单，是这一条最实的证据；但“语义缓存”“Anti-Slop”只有名字，没有可判定的行为描述。

**2. 任务匹配——什么工作适合什么模型、工具、协作方式。** 原文给了一个明确的分层规则：**订阅层（强模型，主任务）→ 低价 API 层（DeepSeek、Groq、Fireworks、Nebius）→ 免费层**，并且区分了按会话粘性（`sticky`）、按最少使用（`least-used`）、按容量（`capacity`）三种分配策略。可提炼的原则是“按任务价值而非按会话分配模型”：多文件重构留在订阅层，读取构建日志/批量重命名这类高 token 低判断的活下沉到便宜层。这是本报告最值得进手册的一条，且不依赖 9RouterX 本身——LiteLLM、OpenRouter 等都能复现。

**3. 条件供给——需要提供哪些信息、工具、权限和反馈。** 原文给出了较完整的供给清单，可直接照抄成检查表：上游凭证（API key / 一键 OAuth / 自定义 base URL + 自定义 header）；**每个 agent 一把独立网关 key**，从而能按 key 分别设预算、限流、系统提示、端点权限、IP 白名单；出站代理池；预算阈值；告警出口（webhook / Telegram）。其中“一个 agent 一把 key”是让治理粒度可落到单个自动化流水线上的关键前提。

**4. 主动推进——哪些工作可由时间、事件或状态触发。** 原文明确描述了两类触发器：（a）**状态触发**——模型健康探测发现端点延迟劣化或返回畸形时，三级熔断自动绕过；（b）**额度触发**——主层 429 或配额耗尽时自动溢出到下一层。另有一类是**阈值触发**：日消费达上限即硬切断。这三类都不需要人盯着，符合“可持续完成”的标准。

**5. 效果验证——怎样判断确实改善了结果。** 原文提供的观测面：实时 token 压缩比、语义缓存命中率、按 `12h`/`14d`/自定义区间的用量图、完整请求响应 payload 检视、tracing、uptime、安全审计日志、Codex 配额跟踪。但要注意：**这些都是这个工具自报的指标，不是“任务结果是否变好”的指标**，用它验证它自己是循环论证。真正的验证必须外部化（见最后一节）。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）/ OpenAI Codex（adopt）**：README 给的正是把这两个已采纳工具指向本地网关的 env 配置（步骤 6）。价值不在于换工具，而在于**在已 adopt 的工具外面加一层统一出入口**，从而获得按 agent 限额、跨供应商降级这两件原本做不到的事。这是本文与现有清单最直接的接口。
- **DeepSeek（try）**：README 把 `deepseek` 明确列为 Cheap 层候选之一。若已在小范围试 DeepSeek，这里给出的是它的具体定位——不是主力，而是“订阅额度打满时的低价溢出层”。
- **Cline（watch）/ Cursor（watch）/ OpenCode（watch）/ OpenClaw（watch）**：README 各给了 JSON 或 env 接法，可作为“多个客户端共用同一份额度池、共用同一套预算护栏”的配置模板。其中 OpenClaw 的 `localhost` → `::1` 解析坑是可直接写进手册的实操提醒。
- **Ponytail（study）/ i-have-adhd（watch）**：README 的“输出风格指令”里出现了 `Ponytail`、`ADHD` 字样，与清单条目同名。但原文**没有给出任何模式定义、提示词内容或行为说明**，只是一句罗列。无法据此判断是否同一物，也无法复用，视为无依据关联。
- **ZCode（avoid）**：README 的 28 个一键 OAuth provider 列表中包含 `zcode`。清单已把 ZCode 标为 avoid，说明“复用编码客户端自身 OAuth 凭证”这条路在本项目里已被判定不采用。这直接削弱了 9RouterX 订阅层方案的一大卖点——它的“28 个一键 OAuth”很大比例正是这类凭证复用。
- **Semble（try）**：清单中有，但原文未提及，无法建立关系。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给的“数据”全部是自述，且没有一条可核验：**

- “省 20–40% token”“155 providers / 248 free models / 24 keyless”“28 OAuth / 29 free-tier”——无基准测试、无对照实验、无第三方复现、无时间戳。README 只说这些数字“verified in `freemodels.go`”，但那是它自己仓库里的一个源文件，不构成外部证据。
- **全文没有任何一个真实使用案例**：没有“某团队在 X 任务上把成本从 A 降到 B”这类可追溯记录。

**存在可判定的臆造痕迹（这是降级的主因）：**

- 示例模型名 `antigravity/gemini-3.7-flash-medium`、`gemini-3.7-flash-high/low`——不存在这个模型。
- 源码构建前置写作“Go 1.27”——目前不存在这个 Go 版本。
- 功能面极宽（MCP server、A2A 协议、MITM 抓包、TLS stealth、TTS/STT、托盘应用、内置隧道、自更新、加密同步包），而仓库仅 45 stars，规模与宣称不匹配。
- README 通篇 SEO 关键词堆叠（“FREE”“Token Saver”“Single Binary”反复出现），是典型的生成式文案特征。

结论：**这份 README 至少部分是生成/臆造的，其中的命令与路径大概率不能原样跑通。** 因此不能给 try。

**合规与安全风险（适用条件的硬约束）：**

- “24 个 keyless 模型”与“4 个 web cookie providers”——本质是复用他人客户端或浏览器会话凭证，通常违反上游 ToS，封号后果由使用者承担。结合清单里 ZCode 已标 avoid，这条逻辑应当一致适用。
- 默认密码 `123456` + 内置 tunnel + MITM 抓包 + 集中存放多家供应商凭证 = 把所有鸡蛋放进一个可能被公网访问的篮子。
- 作为“所有 agent 的唯一出口”是单点故障；一旦网关挂掉，所有编码工作同时中断。

**适用条件：** 仅在完全本地、受控、单人环境做架构验证；不接 cookie/keyless 供应商；不开隧道；不用于团队共享或生产。

**材料完整性：** 原文在「Architecture Comparison」表格处被截断，FAQ、迁移细节、各模块的具体参数未见到，本报告只能覆盖前半部分。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（建议 1–2 天，只验证三个子能力里最值钱的两个）：**

1. 用 Docker 起，端口绑 `127.0.0.1:20128`（不要 `-p 20128:20128` 裸绑全网），改掉默认密码，不启用 tunnel。
2. **只接一家正规付费/已 adopt 的供应商**（Anthropic 或 OpenAI），完全不碰 keyless 与 cookie provider。
3. 建两把 key：一把给交互式 Claude Code，一把给自动化脚本；各设日预算上限。
4. 挑一个真实任务跑：建议选“需要读大量测试日志和 `git diff` 的多文件修复”，这正是 token saver 宣称收益最大、也最容易出错的场景。

**验证指标（做 A/B，直连 vs 经网关，同一任务同一模型）：**

| 维度 | 指标 | 判定 |
| :--- | :--- | :--- |
| 成本 | 上游账单 input tokens、网关日志记录数 | 省 token 是否达到宣称的下限量级（别指望 40%，看有没有正向节省） |
| **压缩安全性（最关键）** | 被过滤的 `git diff` / 测试输出里**有没有丢掉模型判断所必需的行**；改动是否引入了原本不存在的错误 | 出现一次“因为过滤掉了关键报错行而改错代码”，就说明压缩策略对该场景不适用，应关闭或只对 `npm install`/`cargo build` 这类噪声日志启用 |
| 可靠性 | 人工制造 429（把预算调到极低）后，任务是否无感续跑；切换后结果质量有无下降 | 若需要人手动干预，路由层就没带来净收益 |
| 质量 | 同一任务直连版与网关版的人工返工次数 | 返工次数不上升才算“改善了结果” |
| 延迟 | wall-clock 时间 | 网关本地开销应可忽略；若显著变慢，压缩/缓存反成负担 |

**停止条件（明确写出来，避免陷进去）：** 只要出现以下任一，就退回直连，只保留“每把 key 一个日预算上限”这一个子能力（这一条风险最低、收益最确定）：

- 压缩导致 bug 率上升或需要反复手工修复路由；
- 需要为某个客户端反复调 IPv4/兼容性；
- 网关本身成为故障源（挂掉时所有 agent 同时不可用）。

**不要做的事：** 不要用它的仪表盘数字来证明“效果变好了”——那是它自己报的中间指标；判断标准只能是“同一任务的人工返工次数和上游账单是否同时下降”。

**如果验证下来架构有效但实现不可靠：** 把「三层降级 + 每个 agent 一把带预算的 key + 工具输出按类型过滤」这三条规则平移到你已 adopt 的工具链上（Claude Code / Codex 的 env 指向任意一个成熟网关即可复现），本报告的价值就在这三条规则，而不在这个仓库。
