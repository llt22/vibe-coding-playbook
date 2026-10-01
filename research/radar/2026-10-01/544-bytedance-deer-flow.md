# bytedance/deer-flow

- 结论：**值得一试**。可以按官方 Quick Start 在本地或小团队环境跑通 DeerFlow 2.0（clone → make setup → make doctor → make docker-start），把它作为长时程子代理＋沙箱＋记忆的执行底座试点；理由是原文给出了可直接复制的安装、模型接入、部署选型和安全配置步骤，但 skills、sub-agents、scheduled tasks 等核心能力的用法在抓到的原文里只剩目录标题，需进一步查阅仓库文档才能照做。
- 原文：https://github.com/bytedance/deer-flow
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T11:27:05.911Z

## 是什么

DeerFlow（Deep Exploration and Efficient Research Flow）是字节跳动开源的 **super agent harness**，用于编排 **sub-agents、memory 和 sandboxes**，由**可扩展 skills** 驱动。2.0 是完全重写版，与 1.x 不共享代码，1.x 作为原 Deep Research 框架保留在 `main-1.x` 分支。MIT 协议，要求 Python 3.12+、Node.js 22+。仓库当前 83290 stars。

README 目录显示的功能面包括：Skills & Tools（含 Claude Code Integration）、Session Goals、Manual Context Compaction、Sub-Agents、Sandbox & File System、Context Engineering、Current Task Notes、Long-Term Memory、Recommended Models、Embedded Python Client、Scheduled Tasks、Terminal Workbench (TUI)、MCP Server、IM Channels、LangSmith / Langfuse / Monocle Tracing、Using Multiple Providers、Personal Access Tokens、Documentation、Security Notice。

**重要限制：抓到的原文在 "Option 2: Local Development" 的 "Prerequisit" 处被截断。** 上述大部分功能小节在原文里只有标题、没有正文，因此本报告只能对安装/配置/部署部分给出可照做步骤，对 skills、sub-agents、scheduled tasks、memory 等只能说明其存在，不能编造用法。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 最快路径：让编码助手替你搭（前提：你在用 Claude Code / Codex / Cursor / Windsurf 等编码 agent）

1. 把下面这句话原样交给编码助手：

```text
Help me clone DeerFlow if needed, then bootstrap it for local development by following https://raw.githubusercontent.com/bytedance/deer-flow/main/Install.md
```

原文说明该提示词的预期行为：让 agent 按需 clone 仓库、在可用时选 Docker、并在最后停下来给出准确的下一步命令和用户仍需提供的缺失配置。

### B. 手动路径（前提：本机有 git、Docker Desktop/Engine、Docker Compose v2.24+，用 `docker compose version` 自检；低于该版本的 Compose 无法解析 `docker/docker-compose-dev.yaml` 里的 `env_file` 语法）

2. 克隆仓库：

```bash
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow
```

3. 在项目根目录运行交互式安装向导（原文称约 2 分钟）：

```bash
make setup
```

该向导做的事（原文明确）：引导选择 LLM provider、可选的 web search、以及执行/安全偏好（sandbox 模式、bash 访问、文件写入工具）；生成最小 `config.yaml`，并把密钥写入 `.env`。向导也可以选择暂时跳过 web search provider。

4. 随时验证环境并获取可执行的修复提示：

```bash
make doctor
```

5. 如果准备提 issue，先产出排障包（会打印上报步骤，写出 `*-issue-summary.md`、`*-issue-draft.md`，并在 `.deer-flow/support-bundles/` 下可选生成证据 zip）：

```bash
make support-bundle
```

原文强调：若由 AI 助手代提 issue，应从 draft 出发并替换每个 REQUIRED 占位符，不要编造缺失事实；zip 仅在维护者要求或摘要不够时附上。该 bundle 只含脱敏诊断和文件清单，**不含 `.env`、原始对话消息、用户文件内容**。

6. 高级/手写配置路线（前提：你想直接编辑 `config.yaml`）：改用 `make config` 复制完整模板，参考 `config.example.yaml`。

### C. 模型接入（写进 `config.yaml` 或 `.env`）

7. 官方推荐用于跑 DeerFlow 的模型：Doubao-Seed-2.0-Code、DeepSeek v3.2、Kimi 2.5。

8. 通用 OpenAI 兼容模型配置示例（原样可抄）：

```yaml
models:
  - name: gpt-4o
    display_name: GPT-4o
    use: langchain_openai:ChatOpenAI
    model: gpt-4o
    api_key: $OPENAI_API_KEY

  - name: openrouter-gemini-2.5-flash
    display_name: Gemini 2.5 Flash (OpenRouter)
    use: langchain_openai:ChatOpenAI
    model: google/gemini-2.5-flash-preview
    api_key: $OPENROUTER_API_KEY
    base_url: https://openrouter.ai/api/v1

  - name: gpt-5-responses
    display_name: GPT-5 (Responses API)
    use: langchain_openai:ChatOpenAI
    model: gpt-5
    api_key: $OPENAI_API_KEY
    use_responses_api: true
    output_version: responses/v1

  - name: qwen3-32b-vllm
    display_name: Qwen3 32B (vLLM)
    use: deerflow.models.vllm_provider:VllmChatModel
    model: Qwen/Qwen3-32B
    api_key: $VLLM_API_KEY
    base_url: http://localhost:8000/v1
    supports_thinking: true
    when_thinking_enabled:
      extra_body:
        chat_template_kwargs:
          enable_thinking: true
```

9. CLI 后备 provider（复用你已有的编码 agent 凭证，不必另配 API key）：

```yaml
models:
  - name: gpt-5.4
    display_name: GPT-5.4 (Codex CLI)
    use: deerflow.models.openai_codex_provider:CodexChatModel
    model: gpt-5.4
    supports_thinking: true
    supports_reasoning_effort: true

  - name: claude-sonnet-4.6
    display_name: Claude Sonnet 4.6 (Claude Code OAuth)
    use: deerflow.models.claude_provider:ClaudeChatModel
    model: claude-sonnet-4-6
    max_tokens: 4096
    supports_thinking: true
```

凭证来源（原文）：Codex CLI 读 `~/.codex/auth.json`；Claude Code 接受 `CLAUDE_CODE_OAUTH_TOKEN`、`ANTHROPIC_AUTH_TOKEN`、`CLAUDE_CODE_CREDENTIALS_PATH` 或 `~/.claude/.credentials.json`。macOS 上必要时显式导出：

```bash
eval "$(python3 scripts/export_claude_code_oauth.py --print-export)"
```

10. 把外部 ACP agent 挂进来（示例为 MiniMax Code）：

```bash
npm install --global @minimax-ai/code
mcode login
```

```yaml
acp_agents:
  mcode:
    command: mcode
    args: ["acp"]
    description: MiniMax Code for implementation, refactoring, debugging, and repository tasks
    auto_approve_permissions: false
```

前提与注意：`mcode` 必须在 Gateway 进程的 `PATH` 上（只装在 Docker 宿主机上，Gateway 容器内不可用）；DeerFlow 通过 `invoke_acp_agent` 在 per-thread ACP workspace 中调用它并转发已启用的 MCP servers；**不受信任的任务保持 `auto_approve_permissions: false`**，只有当你信任该任务且确实需要它改文件/跑命令时才开启。

11. API key 也可以直接在 `.env` 里写（原文推荐）或在 shell 里 export：

```bash
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-api-key
```

12. 管理员还可以走 UI 共享模型：**Settings → Models** 添加/编辑/测试/启停 OpenAI 兼容 Chat Completions 模型，无需改 `config.yaml`。原文注意事项：连接测试会发一次短流式 tool-call 请求、**可能产生 provider 费用**，它不保存草稿、也不验证图片支持；加密目录与本地密钥在 `$DEER_FLOW_HOME/managed-models/`（默认 `.deer-flow/managed-models/`），要**备份整个目录**、限制文件系统访问、并在需要共享同一 catalog 的多个 Gateway worker 间同步。

### D. 运行与部署

13. 按用途选规格（原文给的实用起点）：

| 部署目标 | 起点 | 推荐 | 备注 |
|---|---|---|---|
| 本地评测 / `make dev` | 4 vCPU, 8 GB RAM, 20 GB SSD | 8 vCPU, 16 GB | 单人单会话＋托管模型 API；`2 vCPU / 4 GB` 通常不够 |
| Docker 开发 / `make docker-start` | 4 vCPU, 8 GB RAM, 25 GB SSD | 8 vCPU, 16 GB | 镜像构建、bind mount、沙箱容器更吃资源 |
| 长跑服务 / `make up` | 8 vCPU, 16 GB RAM, 40 GB SSD | 16 vCPU, 32 GB | 共享使用、多 agent 运行、报告生成、重沙箱负载 |

14. Docker 开发模式（热重载、源码挂载）：

```bash
make docker-init    # Pull sandbox image (only once or when image updates)
make docker-start   # Start services (auto-detects sandbox mode from config.yaml)
make docker-logs    # View logs
```

`make docker-start` 仅在 `config.yaml` 使用 provisioner 模式（`sandbox.use: deerflow.community.aio_sandbox:AioSandboxProvider` 且带 `provisioner_url`）时才启动 `provisioner`。受限网络下可先导出镜像源再构建：

```bash
export UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
export NPM_REGISTRY=https://registry.npmmirror.com
```

15. 生产模式：

```bash
make up     # Build images and start all production services
make down   # Stop and remove containers
```

访问地址：http://localhost:2026。`make up` 会等 Gateway `/health` 通过才报成功；超时则以非零码退出并打印容器状态和近期 Gateway 日志。

16. 升级已有 checkout：保留 `config.yaml`、`.env`、`extensions_config.json`，停掉当前服务，`git pull --ff-only`，再以相同模式启动。**常规源码升级不要重跑 `make config` 或 `make docker-init`**；若新版本要求配置变更，先跑 `make config-upgrade`。

17. Linux 上 Docker 报 `permission denied ... /var/run/docker.sock` 时，把用户加入 `docker` 组后重新登录（详见 CONTRIBUTING.md）。

### E. 运维与安全要点（原文明确给出的）

18. 持久化部署把 `database.backend` 设为 `sqlite` 或 `postgres`，该后端被 LangGraph checkpointer、LangGraph Store 和 DeerFlow 应用数据共享。轻量单进程事件持久化可用 `run_events.backend: jsonl`。
19. 生产默认单 Gateway worker（`GATEWAY_WORKERS=1`）。多 worker 需要：Postgres、Redis stream bridge（`stream_bridge.type: redis`）、`run_ownership.heartbeat_enabled: true`、`run_events.backend: db`。
20. 跨域：统一 nginx 端点默认同源、不发 CORS 头；拆分源/端口转发的浏览器客户端需设 `GATEWAY_CORS_ORIGINS` 为逗号分隔的精确 origin（如 `http://localhost:3000`）。
21. 权限：启用细粒度授权后，Live Browser 连接除线程所有权外还需要 `threads:write`（因为同一连接可控制浏览器）。
22. 代理头安全：DeerFlow 会读 `Forwarded` / `X-Forwarded-*` 恢复浏览器侧 scheme 和 origin，外层可信代理必须替换或剥掉客户端自带的转发头。
23. 多 worker 共用沙箱后端（Docker/AIO 或 E2B）时，另配 `sandbox.ownership.type: redis`，避免重复/孤儿清理误杀存活 peer 的沙箱。
24. 可选的提示词覆盖（不改源码扩展 lead-agent、subagent、DeerMem 抽取提示词）见 `backend/docs/CONFIGURATION.md#prompt-overlays`；可按模型开启 `request_admission` 控制请求速率（默认关闭）。

> 原文没有给出 Skills、Sub-Agents、Scheduled Tasks、Long-Term Memory、TUI、Embedded Python Client 的具体配置或命令，只有目录条目。这些部分**不能**从本材料推导出步骤，需补看仓库内文档。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
- 有依据的部分：项目自我定位是把 sub-agents、memory、sandboxes 编排起来"do almost anything"，由可扩展 skills 驱动——即能力边界靠 skills/tools 扩展而非固定功能表。目录中存在 Skills & Tools、Claude Code Integration、MCP Server、IM Channels 等条目，说明扩展路径至少有 skills、MCP、IM 网关三条。
- 缺依据的部分：原文截断，没有 skills 清单、没有"哪些工作可以交给它"的具体示例。因此只能得出"能力可按需扩展"这一结构性判断，不能列出具体新增能力。

**2. 任务匹配**
- 官方推荐模型：Doubao-Seed-2.0-Code、DeepSeek v3.2、Kimi 2.5。
- 按模型类型分别接入：OpenAI 兼容（含 OpenRouter、Responses API）、vLLM 自托管（Qwen 类推理模型有专门的 thinking 开关与 `reasoning` 字段保留）、CLI 后备 provider（Codex CLI、Claude Code OAuth）、ACP agent（如 MiniMax Code，定位为"implementation, refactoring, debugging, repository tasks"）。
- 部署规格按用途分档：本地评测 / Docker 开发 / 长跑服务，并明确"共享使用、多 agent 运行、报告生成、重沙箱负载"用 `make up` 档。
- 这是原文最实的一块：它给出了"什么任务配什么模型/什么部署档"的对照依据。

**3. 条件供给**
- `make setup` 向导显式要求提供：LLM provider、可选 web search provider、沙箱模式、bash 访问、文件写入工具偏好；密钥落 `.env`。
- 其他需供给的资源：MCP server（转发给 ACP agent）、IM channel 状态、tracing（LangSmith / Langfuse / Monocle）、沙箱与文件系统、长期记忆（DeerMem）、per-model 定价（必须全用同一币种，否则 Console 成本估算被禁用）。
- 权限类条件：`auto_approve_permissions`（默认 false）、`threads:write`、`GATEWAY_CORS_ORIGINS`、`GATEWAY_WORKERS`、`sandbox.ownership.type`、`run_ownership.heartbeat_enabled`。
- 反馈类条件：`make doctor` 给修复提示、`make support-bundle` 产出可粘贴的诊断摘要。

**4. 主动推进**
- 原文目录存在 **Scheduled Tasks** 与 **Session Goals** 两个小节，说明项目在设计上支持按时间/状态推进任务；正文截断，**没有给出任何触发配置**。
- 有实质依据的是长时程运行的可靠性机制：run lease 心跳、owner 失联后由 lease takeover / orphan recovery 接管、取消请求可由非 owner worker 持久化并由 live owner 在续租时执行、SSE 断线用 `Last-Event-ID` 重放并在游标被裁剪时发 `gap` 事件让前端重载持久状态。这些是"持续完成"而不是"发一条跑一条"的工程支撑。
- IM Channels 的存在意味着可从消息网关侧发起/接续任务，但配置细节缺失。

**5. 效果验证**
- 运行层：`make up` 必须等 Gateway `/health` 通过才算成功；`make doctor` 验证安装；DeepSeek 提供可选的 live 回归测试：

```bash
DEER_FLOW_RUN_LIVE_TESTS=1 uv run --no-sync pytest tests/test_managed_deepseek_live.py -q
```

（在 `backend/` 下运行，需环境变量 `DEEPSEEK_TEST_API_KEY`，可选 `DEEPSEEK_TEST_MODEL`；会发真实请求并可能产生费用，用临时状态、不把凭证写进部署 catalog、CI 中跳过。）
- 过程层：LangSmith / Langfuse / Monocle 三种 tracing；姊妹项目 LLM Space 被描述为"inspect each harness step, replay failures, and benchmark performance"。
- 成本层：per-model 定价 + Console 成本估算（混币种时自动禁用而非给出错误合计）。
- **缺依据的部分**：原文没有任何"业务效果改善了多少"的指标、A/B 数据或用户案例数据。

## 与已有做法的关系

- **Claude Code（adopt）**：直接相关且有可照做内容。DeerFlow 提供 `deerflow.models.claude_provider:ClaudeChatModel` 把 Claude Code OAuth 当作模型 provider，凭证路径为 `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_AUTH_TOKEN` / `CLAUDE_CODE_CREDENTIALS_PATH` / `~/.claude/.credentials.json`，macOS 可用 `python3 scripts/export_claude_code_oauth.py --print-export` 导出；此外"把 Install.md 交给编码助手一句搭好"这条路径也以 Claude Code 为一等公民。
- **Cursor（watch）**：原文把 Cursor 与 Claude Code、Codex、Windsurf 并列为可承接一键安装指令的编码 agent，但没有 Cursor 专属配置。
- **DeepSeek（try）**：官方 DeepSeek 端点（`https://api.deepseek.com` 或 `/v1`）自动走 DeerFlow 的 DeepSeek adapter，跨 tool call 保留 reasoning content 并遵守输出 token 上限；已有 DeepSeek profile 无需重填凭证即可获得该 adapter；官方推荐 DeepSeek v3.2 用于跑 DeerFlow；并提供上文的 live 回归测试命令。
- **Tavily（watch）**：原文只在 `.env` 示例中出现 `TAVILY_API_KEY=your-tavily-api-key`，说明它是受支持的 web search provider 之一；也提到 Jina、Browserless、InfoQuest 的抓取行为。
- **Context engineering（study）**：原文目录含 Context Engineering、Manual Context Compaction、Current Task Notes、Long-Term Memory 四个相关小节，说明项目把这些当作一等机制；但正文缺失，没有可提炼的做法。
- **GitHub Trending（try）**：原文称 2026 年 2 月 28 日 DeerFlow 在 2.0 发布后登上 GitHub Trending 第 1。
- **Trendshift（watch）**：README 顶部带 Trendshift 徽章（repository 14699）。

## 证据与局限

**原文给出的可核对事实/数据**
- 仓库 stars 83290（来源为本次输入的 metrics）。
- 明确的版本与依赖约束：Python 3.12+、Node.js 22+、Docker Compose v2.24+、MIT 协议；2.0 为完全重写、与 1.x 无共享代码。
- 部署资源表（见上）——官方推荐的起始/推荐规格。
- 默认值与可调项：`recursion_limit` 默认 100、`max_recursion_limit` 默认 1000；`GATEWAY_WORKERS=1`；`stream_bridge.heartbeat_interval_seconds` 默认 15；`database.checkpoint_delta.snapshot_frequency` 默认 10；`database.checkpoint_cache` 默认 `memory`、`max_entries: 0` 禁用；InfoQuest 读取/搜索的 HTTP 连接与读取空闲超时为 30 秒。
- 行为契约：`make up` 等 `/health`；配置热更新对多数项生效但 checkpoint 存储设置在首次构建 agent 时冻结、需重启进程；managed models 的加密 catalog 存储在 `$DEER_FLOW_HOME/managed-models/`；support-bundle 不含 `.env`、原始消息、用户文件内容。

**只是作者主张、未经第三方验证**
- "do almost anything"、"super agent harness"——定位性宣传语。
- 官方推荐模型（Doubao-Seed-2.0-Code、DeepSeek v3.2、Kimi 2.5）是项目方的推荐，不是独立评测结论。
- GitHub Trending 第 1、Trendshift 徽章属于热度信号，不等于效果好。
- 部署规格表是实用起点建议，不是压测结论。

**适用条件与风险**
- 需要 Docker 与相对充裕的机器（2 vCPU / 4 GB 通常不够），长跑服务档要到 8–16 vCPU / 16–32 GB。
- 需要自备模型 API key 或本地推理服务，会产生 token 费用；连接测试、live 测试同样可能计费。
- 生产默认单 Gateway worker，多 worker 是一次架构升级（Postgres + Redis stream bridge + 心跳 + db 事件存储），不是改个数字。
- 原文有独立的安全须知小节标题，明确"不正确部署可能引入安全风险"，并给出 CORS、转发头、权限、沙箱所有权等具体建议——说明自行暴露公网有实际风险。
- **最大局限：抓取截断。** 本材料无法支撑 skills、sub-agents、scheduled tasks、memory、TUI、Python client、IM channels 的任何具体步骤，也无法给出任何效果数据。

## 怎么试、怎么验证

**最小试用（1–2 小时，单机）**
1. 用编码助手走 A 路线，或 `git clone` + `make setup`（选你已有的 provider，先跳过 web search 也可以）。
2. `make doctor`，把提示的缺失项补齐。
3. `make docker-init` → `make docker-start`（或按需 `make up`），确认 http://localhost:2026 可访问、Gateway `/health` 通过。
4. 只挑一个真实的长任务（例如一项需要多步检索 + 写文件 + 产出报告的活）跑通，全程开着一种 tracing（LangSmith/Langfuse/Monocle）。
5. 对照记录：不跑 DeerFlow 时这件事要多久、要几步人工介入。

**判断有没有改善的指标**
- 工程可用性：`make doctor` 一次通过；`/health` 在启动窗口内就绪；无重复重启。
- 任务层：同一任务的人工介入次数、重跑次数、被取消/中断后能否自动续上（看 lease takeover、SSE 重放是否按预期工作，是否出现 `gap` 事件）。
- 过程可观测：tracing 里能逐步骤复盘、能重放失败步骤；LLM Space 的 step inspect / replay 是否真的让定位问题变快。
- 成本：per-model 定价统一币种后 Console 成本估算可用；单任务 token 成本与人工工时成本对比。
- 安全：确认未把带沙箱/bash/文件写权限的实例暴露到公网；多 worker 或多沙箱场景已按要求配好 Redis 所有权与事件后端。

**建议的下一步取证（本材料不足、但决定是否升级为 adopt 的关键）**
- 读仓库内 `backend/docs/CONFIGURATION.md`（含 prompt overlays、model request admission）与 `config.example.yaml` 全文。
- 读 Skills & Tools、Sub-Agents、Scheduled Tasks、Long-Term Memory 四节的正式文档，确认是否有可直接照抄的定义与触发配置。
- 在补齐这些之后，若某类工作能被写成 skill + 定时触发 + 可验证产出，再考虑把具体做法提升为 adopt。
