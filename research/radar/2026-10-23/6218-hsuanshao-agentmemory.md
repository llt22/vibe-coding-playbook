# hsuanshao/AgentMemory

- 结论：**值得一试**。建议先以单团队、SQLite、本地 CLI 或 OpenAI 兼容端点做最小部署，接入一个客户端，用 2—3 次真实会话验证跨会话召回能否减少重复交代；README 给出了可照做的安装、配置和触发参数，但缺少效果数据，且 BUSL 对超过 1 个部门、10 人的生产使用收费。
- 原文：https://github.com/hsuanshao/AgentMemory
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T05:52:23.625Z

## 是什么

AgentMemory 是一个自托管、面向团队的 AI agent 长期记忆服务。它捕获每次对话，在后台蒸馏为 facts（L1）、scenes（L2）和 persona（L3），并在每次提示前召回相关内容。它声称可服务 Claude Code、Codex、Antigravity、Hermes 以及任意 MCP 客户端。

核心设计是分层记忆：原始对话 L0 存在 SQLite/FTS5；L1 做上下文分段与 persona/episodic/instruction 抽取；L2 按 team+agent 共享 scenes；L3 汇总为 `persona.md`。召回使用 BM25 + 向量检索 + RRF 融合。

数据、数据库乃至蒸馏模型都可放在内网：LLM 可用任意 OpenAI 兼容端点，也可用本机 `claude`、`codex`、`agy` 等 CLI。权限结构是部门→团队→成员/agent；成员对话和事实私有，agent 的 scenes 和 persona 由使用该 agent 的人共享。

## 具体做法

1. **准备前提**：Docker、git；一个 LLM 后端（OpenAI 兼容 API key，或本机可调用的 CLI）；默认 SQLite 无需额外安装。只有要多副本时才需要 Redis，要规模化或换掉 SQLite 时才需要 PostgreSQL/pgvector。从源码构建需要 Rust MSRV 1.88。生产使用前先看许可证：0.4.0 起服务端为 BUSL-1.1，免费范围是评估、个人、非营利，以及最多 1 个部门、10 个成员的组织。

2. **交互式安装**：

```bash
git clone https://github.com/hsuanshao/AgentMemory.git && cd AgentMemory
./install.sh
```

安装器会依次询问：存储后端（SQLite 默认 / 已有 PostgreSQL URL / 用 Docker 启动 PostgreSQL pgvector）；协调后端（单节点默认 / 已有 Redis / 用 Docker 启动 Redis）；LLM（OpenAI 兼容 API / Claude Code CLI / Antigravity CLI / Codex CLI）；CLI 的项目目录和暴露端口。之后它会生成 Gateway API key 和数据库密码，写入权限 600 的 `.env`（含 `COMPOSE_PROFILES`），启动服务并等待健康检查，最后创建第一个 admin 并显示一次性的登录 user key。

3. **非交互安装**（前提：已确定后端）：

```bash
INSTALL_STORAGE=postgres-docker INSTALL_COORDINATION=redis-docker ./install.sh --non-interactive
```

更多变量看 `./install.sh --help`。如果数据库在宿主机上，用 `host.docker.internal` 而不是 `localhost`。以后重启只需：

```bash
docker compose up -d
```

4. **不用安装脚本的手动部署**：

```bash
cp .env.example .env        # set at least AGENT_MEMORY_API_KEY
docker compose up -d --build
curl -s -X POST http://localhost:8420/v3/internal/meta/user/init-admin \
  -H "Authorization: Bearer $AGENT_MEMORY_API_KEY" \
  -H "x-memory-department-id: default" -H "content-type: application/json" \
  -d '{"username":"admin"}'
```

也可以分别启动服务：

```bash
docker build -f docker/core.Dockerfile -t memory-core:local .
docker run --rm -p 8420:8420 -e AGENT_MEMORY_API_KEY=change-me \
  -e AGENT_MEMORY_LLM_API_KEY=sk-... -v memory-core-data:/data memory-core:local

docker build -t memory-panel:local panel
docker run --rm -p 8125:8125 -e CORE_URL=http://host.docker.internal:8420 \
  -e CORE_API_KEY=change-me memory-panel:local
```

服务地址：memory-core 为 `http://localhost:8420`，memory-panel 为 `http://localhost:8125`。

5. **建立用户、团队和 agent**：用 admin user key 登录 Panel（默认 8125）。在 **Metadata** 下由系统管理员创建用户（每个用户拿到只显示一次的 user key）、创建团队、把用户按角色加入团队、创建 agent。其他成员默认只读 Panel。客户端只用 user key 认证，不需要 `AGENT_MEMORY_API_KEY`；每次记忆调用都要带用户所属的 `team_id` 和 `agent_id`。具体隔离规则看 `docs/COLLABORATION.md` 和 `docs/API.md`。

6. **接入客户端**：README 没有在正文给出 `amem` 的安装命令，只指向 `docs/REMOTE-CLIENTS.md`。按该文档安装 `amem`，配置 Claude Code、Codex、Antigravity 或 Hermes 的 hooks/MCP 集成；服务器和 agent 不在同一台机器时，还要按该文档处理 TLS、发 key 和客户端升级。`amem` 会在内容离开本机前做 secret 脱敏，并在服务器不可达时排队。

7. **选择 LLM 后端**。用 OpenAI 兼容 HTTP 时，按 README 的变量配置：

```text
AGENT_MEMORY_LLM_PROVIDER=openai
AGENT_MEMORY_LLM_BASE_URL=...
AGENT_MEMORY_LLM_API_KEY=...
AGENT_MEMORY_LLM_MODEL=...
```

用本地 CLI 时，配置 `memory-core.yaml`：

```yaml
llm:
  provider: cli
  timeoutMs: 180000
  cli:
    command: claude              # or ollama, or any tool that reads stdin and prints a text answer
    args: ["-p"]                 # ollama example: ["run", "llama3.1"]
    promptMode: stdin            # use arg for tools that only take arguments, and put {prompt} in args
    workingDir: ~/projects/my-app
    maxConcurrency: 2
```

对应环境变量是 `AGENT_MEMORY_LLM_PROVIDER=cli`、`AGENT_MEMORY_LLM_CLI_COMMAND`、`AGENT_MEMORY_LLM_CLI_ARGS`、`AGENT_MEMORY_LLM_CLI_PROMPT_MODE`、`AGENT_MEMORY_LLM_CLI_WORKDIR`。CLI 调用不经过 shell，prompt 默认走 stdin，不会出现在进程列表；每次调用受 `timeoutMs` 限制，超时会杀子进程，非零退出或空输出会被当作 LLM 不可用并交给管线重试。`agy` 的 prompt 作为参数传入，受 Linux 单参数 128 KiB 限制，且需要 CPU 支持 AES-NI。

8. **按规模选择存储和协调后端**。默认 SQLite：每个部门一个文件，FTS5 全文检索，`sqlite-vec` 做向量 KNN；扩展加载失败时退化为暴力比较。PostgreSQL：每个部门一个 schema（`am_<hash>`），tsvector + GIN，pgvector HNSW；维度大于 2000 时用精确搜索。Redis：管线状态、任务队列和分布式锁都放 Redis，可跑多个memory-core副本；队列是 at-least-once，租约默认 15 分钟并自动续期，节点崩溃后任务会重投；锁用 `SET NX PX`，默认 TTL 10 分钟；不支持 Redis Cluster。配置示例：

```text
AGENT_MEMORY_STORAGE_BACKEND=postgres
AGENT_MEMORY_POSTGRES_URL=postgres://user:pass@host:5432/db
AGENT_MEMORY_COORDINATION_BACKEND=redis
AGENT_MEMORY_REDIS_URL=redis://[:password@]host:6379/0
```

从 SQLite 迁到 PostgreSQL 用 `./migrate-to-postgres.sh`，用户、key、记忆和 skill 会一起迁移，客户端不用改。

9. **理解并接受默认触发参数**：warm-up 在 1→2→4→每 N 轮，或空闲 600 秒时触发；L1 抽取带 LLM 去重（store/update/merge/skip）；L2 在延迟 90 秒且距上次 L2 至少 900 秒后执行，之后每 3600 秒扫一次；L3 在冷启动、每 50 条新记忆或某个 scene 请求更新时触发；每个 team+agent 最多 15 个 scenes。召回接口 `/v3/recall` 会先剥掉之前注入的块，再做 L1 混合检索（BM25 + 向量 + RRF k=60，无 embedding 时退回 BM25），按阈值、数量和字符预算输出 `<relevant-memories>`，以及 `<user-persona>` 和 `<scene-navigation>`。中文全文检索会把文本切成“重叠 CJK bigram + 拉丁词”再进 FTS5，不需要词典。

10. **运维和自测**：Panel 的 Monitor 提供蒸馏健康、生成日志和死信；失败任务会过期重试，死信列表保留最新 10,000 条。`/health` 的 `stores.vectorIndex` 会报告 `sqlite-vec`、`brute-force`、`pgvector-hnsw`、`pgvector-exact` 或 `none`。升级用 `./upgrade.sh`，卸载客户端用 `./uninstall.sh client`，卸载服务端用 `./uninstall.sh server`，加 `--purge-data` 才删数据。本地测试命令：

```bash
cargo test --workspace

docker run -d --rm --name amem-pg -e POSTGRES_PASSWORD=test -p 25432:5432 pgvector/pgvector:pg16
docker run -d --rm --name amem-redis -p 26379:6379 redis:8.4.0
AGENT_MEMORY_TEST_POSTGRES_URL=postgres://postgres:test@127.0.0.1:25432/postgres \
AGENT_MEMORY_TEST_REDIS_URL=redis://127.0.0.1:26379 cargo test --workspace
AGENT_MEMORY_LLM_API_KEY=sk-... cargo run -p memory-server
cd panel && npm install && npm run dev
```

## 对应的研究问题

- **能力发现**：README 给出的不是“新任务类型”，而是把“跨会话记住用户/团队的事实、场景和偏好”从人工复述变成系统自动捕获和召回；agent 的 scenes/persona 可在使用同一 agent 的人之间共享。依据是 L0—L3 管线和团队共享设计。

- **任务匹配**：单节点、小团队适合 SQLite + local coordination；多副本才需要 Redis，规模化或要 pgvector 时用 PostgreSQL。LLM 可用 OpenAI 兼容 HTTP，也可用本地 CLI（`claude`、`ollama`、`codex`、`agy` 等）。客户端覆盖 Claude Code、Codex、Antigravity、Hermes 和 MCP。召回默认 BM25 + 向量 + RRF。README 没有给通用的“什么工作配什么模型”规则，只给了本系统的后端和客户端选择。

- **条件供给**：需要 API key、LLM 端点或 CLI 登录、数据库/Redis（可选）、用户/团队/agent 结构、客户端安装、项目目录挂载，远程部署还需要 TLS。反馈来自 Panel 的蒸馏健康/生成日志/死信，以及 `/health` 的向量索引状态。

- **主动推进**：有明确的时间/轮次/状态触发器：warm-up 1→2→4→每 N 轮或 idle 600 秒；L2 延迟 90 秒且距上次 L2 ≥900 秒，之后每 3600 秒 sweep；L3 冷启动/每 50 条新记忆/scene 请求更新；Redis 队列租约 15 分钟并自动续期，崩溃后重投；死信保留最新 10,000 条。

- **效果验证**：Panel 能看蒸馏健康、生成日志、死信；`/health` 能看向量索引类型。但 README 明确“不提供 analytics reports”，所以业务效果指标要自己定义和埋点，不能指望它直接给出“改善了多少”。

## 与已有做法的关系

清单中有 Claude Code（adopt）、claude-config（adopt）、Cursor（watch）、Hermes（watch）。清单中没有 AgentMemory 同名条目。

- **Claude Code**：AgentMemory 明确为 Claude Code 提供跨会话记忆，通过 hooks 和 MCP 接入；它与 Claude Code 的 adopt 状态是互补关系，相当于外挂记忆层，不替代 Claude Code 本身。
- **claude-config**：README 中 Docker 把 Claude 登录状态放在 named volume `claude-config` → `~/.claude`，这和 claude-config 的配置/登录状态管理相邻；但 AgentMemory 本身不是配置管理工具。
- **Hermes**：README 说提供 Hermes memory provider，和清单中 Hermes 的 watch 状态对应，属于可集成的对象。
- **Cursor**：README 未提及 Cursor，清单中的 Cursor 没有直接对应。

## 证据与局限

证据主要是 README 本身：给出了完整安装命令、Docker 部署、环境变量、`memory-core.yaml` 示例、API 端点、分层管线和触发参数，也有 CI、Release、Docker 镜像等工程信号。但这不是独立评测，没有基准测试、没有案例数据、没有“用了之后任务完成率提升多少”的量化结果。团队隔离、混合召回、自托管隐私等说法目前都是作者/文档主张，需要自行验证。

适用条件：有运维能力、对数据留在内网有要求、且确实存在跨会话/团队记忆需求的团队。局限包括：BUSL-1.1 对超过 1 个部门、10 个成员的生产使用要求商业许可；默认单节点，要多副本得上 Redis；Redis Cluster 不支持；Postgres 向量检索是近似的；改 embedding 维度会清空已有向量；文本不能含 NUL；`agy` 有 128 KiB 参数限制且需要 AES-NI；Docker 镜像约 940 MB；单个 KNN 查询最多返回 4096 行。

## 怎么试、怎么验证

最小试用方式：

1. 选一个 2—5 人小组、一个 agent，先用 SQLite + local coordination + 一个现成 LLM 后端（优先已有 OpenAI 兼容端点或本机 CLI），按 `install.sh` 默认路径安装，不要一开始就上 Postgres/Redis。
2. 在 Panel 建 1 个部门、1 个团队、成员和 agent，给每个成员发 user key；确认成员只能读写自己的 conversations/facts。
3. 按 `docs/REMOTE-CLIENTS.md` 接入一个客户端（Claude Code、Codex 或 Hermes），配置 hooks/MCP，使用同一个项目目录。
4. 跑 2—3 次真实任务会话，会话之间隔开；每次开始时刻意不重复交代背景，观察 agent 是否召回上次的决策、约束和偏好。
5. 检查 Panel 的蒸馏健康、生成日志和死信；检查 `/health` 的 `stores.vectorIndex`；记录召回延迟、失败和重试。
6. 做小对照：同一组任务，A 组开启记忆并注入，B 组不注入或关闭记忆，比较重复提问次数、人工纠正次数、任务完成时间和输出被采纳率。样本小，只看方向，不下强结论。

判断指标：重复交代背景的次数是否下降；“上次说的 X”能否被正确引用；错误召回（别人的事实、过时事实）次数；蒸馏成功率和死信数；召回延迟；团队隔离是否被破坏；LLM 调用量、存储增长和运维时间。若一周内经常召回无关或错误，或运维成本明显高于收益，就把结论降为 study/watch，而不是继续扩大部署。
