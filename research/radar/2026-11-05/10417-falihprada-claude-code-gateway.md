# FalihPrada/claude-code-gateway

- 结论：**值得一试**。可以小范围试：把它当成「同一套 Claude Code 工作流、换不同上游模型」的对照装置，先用单一上游加一个真实任务跑通工具调用与流式，再按任务比较成本与完成率；理由是 README 给出了可照抄的环境变量与模型路由配置，但缺安装启动命令，且兼容性与用户数均为作者自述。
- 原文：https://github.com/FalihPrada/claude-code-gateway
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T00:45:12.888Z

## 是什么

Claude Code Gateway 是一个本地运行（Node.js 20+、Express）的协议转换代理：它接收 Anthropic Messages API 请求（`POST /v1/messages`），转换成 OpenAI Chat Completions 格式转发给配置好的上游（Kimi、GLM、DeepSeek、OpenRouter、Mistral、Fireworks、Cerebras、Groq、Databricks，或本地的 Ollama / LM Studio / vLLM / llama.cpp），再把响应翻译回 Anthropic 格式。

关键能力（README 明确列出）：

- 完整 SSE 流式（`message_start` / `content_block_*` / `message_delta` / `message_stop`），并对分片做缓冲，避免工具参数 JSON 被截断输出。
- 双向工具调用翻译：Anthropic `tools`/`tool_use`/`tool_result` ↔ OpenAI `tools`/`tool_calls`。
- 确定性模型路由（精确 → glob 家族规则 → 透传 → 默认）、失败回退与熔断、流合成（上游流式坏但非流式可用时合成合法 SSE）。
- 管理面板（实时请求、单请求详情、翻译 playground、诊断）、`POST /v1/chat/completions` 透传（服务端注入 key）、`GET /v1/models`。
- 不需要 Anthropic API key；日志中对 key 与 Authorization 做脱敏。

对调研的意义不在「网关」本身，而在：它把「客户端/提示词/工具定义」固定住，只换后端模型，因此是问题 2（任务匹配）和问题 5（效果验证）的现成对照装置。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **准备环境**。前提：Node.js ≥ 20；Windows 10/11 或可跑容器的机器；不需要管理员权限；不需要 Anthropic key。README 只给出一个面向 Windows 的 PowerShell 安装页链接（`https://FalihPrada.github.io/claude-code-gateway/`），**没有在正文给出 clone / install / start 的具体命令**，这一步必须先到仓库或该脚本页确认。

2. **写最小 `.env`**（前提：已拿到任一 OpenAI 兼容上游的 base URL 与 key）：

```dotenv
GATEWAY_API_KEY=<你的上游 API key>
GATEWAY_BASE_URL=https://<上游>/v1
PORT=8787
DEFAULT_MODEL=<上游模型 ID>
STRICT_MODEL_MAPPING=true
REQUEST_TIMEOUT_MS=120000
MAX_RETRIES=2
```

变量含义（原文表格）：`GATEWAY_API_KEY` 必填；`GATEWAY_BASE_URL` 上游地址；`PORT` 默认 8787；`DEFAULT_MODEL` 无规则命中的兜底；`STRICT_MODEL_MAPPING` 为 true 时未匹配模型返回 400 而非透传；`PROXY_API_KEY` 给代理路由加 Bearer 校验；`ADMIN_PASSWORD` 给 `/admin` 加 Basic auth；`CORS_ORIGINS` 默认 `*`。注意：README 的 FAQ 里出现的是 `BLUESMINDS_BASE_URL` / `BLUESMINDS_API_KEY`，与表格不一致，首次启动时两个命名都要试或到代码里确认。

3. **配置模型路由** `config/models.json`（原样可抄）：

```json
{
  "anthropic_to_provider": {
    "claude-3-5-sonnet-latest": "vendor/model-a"
  },
  "default": "vendor/model-a",
  "family_rules": [
    { "name": "Sonnet", "pattern": "claude*sonnet*", "primary": "vendor/model-a", "fallback": "vendor/model-b" },
    { "name": "Haiku",  "pattern": "claude*haiku*",  "primary": "vendor/model-b" },
    { "name": "Opus",   "pattern": "claude*opus*",   "primary": "vendor/model-a" }
  ]
}
```

解析顺序（原文）：精确映射 → glob 家族规则 → 非严格模式透传 → `default` / `DEFAULT_MODEL`。`vendor/model-a` 等需替换成上游真实模型 ID。

4. **让客户端指向网关**。前提：Claude Code CLI 或任何说 Anthropic Messages 协议的客户端（README 称 Cline、Roo Code、Continue.dev、Aider、LibreChat、Open WebUI、LobeChat 亦可）。把客户端的 base URL 设为 `http://localhost:8787`，API key 填任意非空值（若设了 `PROXY_API_KEY` 则填该值）。Claude Code 自身不改。

5. **对齐上游模型 ID（换供应商时必做）**。打开 `/admin` → Model Router → `Sync Models` 拉取实时模型列表 → `Auto-Map` 打分并批量给出修正建议（建议只在置信度 > 0.75 时出现）→ `Apply` → `Save Router`。不做这步时面板会显示 UNSAVED，因为各供应商有 vendor 前缀与裸名两种写法。

6. **配置失败回退与熔断**。每个家族规则的 `fallback` 是首选备份，没有则走 registry 的 `default`；连续失败会打开熔断，半开探测成功后自动恢复。阈值与冷却时间在 `Admin → Settings`，默认值按公共免费额度端点调过，需按自身上游重调。

7. **持久化与重置**。请求历史、配置覆盖、路由覆盖都写在 `.blueclaude-data/`（无数据库）；删掉该目录即回到文件默认值。生产环境应设 `ADMIN_PASSWORD` 并只绑回环或放在带 TLS 的反向代理后。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **问题 1 能力发现**：只能间接支持。网关不新增模型能力，但它让「原本只在 Claude 上做的工作」可以在同一套工具定义下换模型重跑，从失败点上发现某类工作中的哪些环节别的模型已经能做。作者明确警告：转换层只归一格式，不归一能力，上下文窗口、工具调用保真度、流式语义、结构化输出因供应商而异——这正是「能力边界」要记录的字段。
- **问题 2 任务匹配**：核心契合。确定性路由链（精确 / 家族 glob / 透传 / 默认）加上运行时改写，使得「同一客户端、同一提示词、按任务切换模型」成为可执行的配置动作，而不是改代码。`STRICT_MODEL_MAPPING=true` 可强制暴露未映射模型，避免静默走兜底污染对比结论。
- **问题 3 条件供给**：给出的条件清单明确——上游 base URL 与 key、Node 20+、可选 `PROXY_API_KEY`/`ADMIN_PASSWORD`/`CORS_ORIGINS`；反馈通道是 `.blueclaude-data/request-log.json`（有界环形缓冲）、Admin 的 Live Requests（SSE）与逐请求详情。缺的是「每类任务该配什么系统提示词/工具集」的内容，那部分要自己补。
- **问题 4 主动推进**：弱。有事件触发的自动行为（超时/5xx/熔断 → 回退模型；流式失败 → 合成流），属于可用性保障，不是任务级持续执行。
- **问题 5 效果验证**：提供了观测设施（请求日志、单请求详情、playground、分步诊断、usage 随 `message_delta` 回传），但没有定义任何质量指标或基线，也没有基准数据。

## 与已有做法的关系

- **Claude Code（adopt）**：本网关是它的接入层替代——客户端不变，只换后端与 base URL。若手册已有 Claude Code 用法，此条应写成「可选接入层」，不影响原有流程。
- **DeepSeek（try）**：README 明确列为开箱即用的上游之一，可作为最省事的第一条试跑链路。
- **Cline（watch）**：README 称 Cline / Roo Code 等说 Anthropic 协议的 VS Code 扩展无需改动即可接入，可作为 IDE 侧的第二个验证客户端。
- **Semble**：清单中没有相关条目。

## 证据与局限

**原文给出的具体信息**：完整端点与翻译规则、环境变量表（含默认值：8787 / 120000ms / 2 次重试 / CORS `*`）、`models.json` 结构、四段解析顺序、Auto-Map 的 0.75 置信度阈值、熔断半开恢复机制、数据目录与脱敏边界。这些是可核对的配置性内容。

**只是作者主张**：`USERS-1.2K`、`STATE-ACTIVE` 徽章不可核验；「out of the box 支持某某供应商」「客户端无需改动」都是声明而非测试结果；全篇没有任何延迟、成本、工具调用成功率或对照实验数据。

**明显的文档与成熟度问题**（影响可信度，试前必查）：(a) 环境变量命名不一致（表格 `GATEWAY_*` vs FAQ `BLUESMINDS_*`），数据目录又叫 `.blueclaude-data/`，像多次改名未清理；(b) 正文缺少安装与启动命令，Windows 一键脚本页与「container / process-manager / reverse-proxy 配置」均未在正文展开；(c) 项目自述为社区维护、MIT、无任何担保，并明确「不做授权校验」，合规责任全在部署者。

**适用条件**：只在本地或受控内网运行并设 `ADMIN_PASSWORD`；上游模型 ID 会随供应商变更而失效，每次换供应商都要 `Sync Models` + 保留 `fallback`；不要把「格式转换成功」误当成「能力等价」——作者的免责声明已明确这一点。

## 怎么试、怎么验证

**最小试用（半天内可完成）**：一台 Node 20+ 的机器；选一个上游（优先 DeepSeek，其次 OpenRouter）；只配 `default` + 一条家族规则，先不配熔断细节；开 `STRICT_MODEL_MAPPING=true`；用 Claude Code 直连同一上游跑 3 个真实任务——(1) 纯文本改写类、(2) 需要多轮工具调用（读文件→改代码→跑测试）、(3) 长上下文（接近该模型窗口的中段）。每组任务保留同一份提示词与工具定义。

**判断有没有改善的指标**：

- 工具调用往返正确率：`tool_use` 发出后能否收到结构完整的 `tool_result`，有无参数 JSON 被截断或 stop_reason 映射错（对照 `tool_use` ↔ `tool_calls`）。
- 流式稳定性：是否出现中断、重复块、合成流（说明上游流式已坏）。
- 任务完成率：三组任务是否端到端做完，与 Claude 直连基线逐项对照。
- 成本与延迟：用日志里的 usage 与实际耗时，算每完成任务成本，而不是每 token 价格。
- 结论口径：**完成率不低于基线且每完成任务成本明显下降**才算改善；只要出现工具调用错乱或结构化输出失败，就记为该模型的能力缺口，作为问题 1 的素材而不是网关的 bug。

**建议同时记录的反例**：同一任务在两个上游上的失败模式差异（这是任务匹配最有价值的产出）；以及 Auto-Map 在换供应商后是否给出错误映射（用于判断该工具本身是否值得长期留在手册里）。
