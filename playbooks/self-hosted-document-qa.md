# 把自有文档变成带来源引用的问答与定时流水线

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何把一批自有文档变成带来源引用、可定时、可被 agent 编排的问答入口，并在不放弃检索地基的前提下逐步升级检索方案。
> 先试这一步：先挑一条路（要最快见效选现成应用，要对照检索方案选自建 RAG 全栈），拿 20–50 份同主题文档跑通「导入 → 提问 → 拿到带引用回答」这一条端到端流水线，并记下耗时与引用命中情况作为基线。
> 最近修订：2026-10-04

## 解决什么问题

把散落的自有文档（PDF/TXT/DOCX）变成能带来源引用回答的入口，并把每周重复的固定动作交给定时任务；进一步，让 agent 能程序化驱动一个「有据可依的昂贵阅读与综合层」，自己只负责编排和最后一公里。如果你还想弄清答对答错出在检索的哪一环、想把这条链路握在自己手里，就需要第三条路：在本地起一套完整 RAG 栈，按周从关键词检索做到混合检索、再到 Agentic RAG，用同一批问题做对照。三条路共同的纪律是：不被一份很长的功能清单牵着走——README 给的是能力入口，不是可照做的参数，先小范围试，再决定用不用。

## 适用与不适用

**适用**

- 需要本地优先（runs locally by default）部署，把文档上下文、多模型、agent 与定时调度放在同一个应用里。
- 想把一批自有文档变成可问答、回答带来源引用的知识入口。
- 想用 cron 定时跑重复任务或提示词，且任务具备完整 agent 能力。
- 已经在用 Claude Code、Codex、OpenClaw 等 agent，希望把 NotebookLM / Gemini Notebook 当「零 token 综合层/记忆层」，由它做有据可依的昂贵阅读与综合，agent 只做编排和最后一公里。
- 需要用 CLI / Python API / MCP Server / REST Server / agent skill 程序化建 notebook、批量导入来源、带引用问答、生成并下载音频/视频/幻灯片/信息图/测验/闪卡/报告/数据表/思维导图。
- 需要 Web UI 不提供的批量下载、测验/闪卡的 JSON/Markdown/HTML 导出、思维导图 JSON 提取。
- 有本地模型（Ollama / LM Studio / LocalAI / llama.cpp 兼容模型）或已在用的云端 provider（AnythingLLM README 列出 30+ LLM provider、10+ embedder、9 个向量库）。
- 需要多用户与权限、或需要把问答挂件嵌到网站——这两项**仅 AnythingLLM 的 Docker 版本提供**。
- 想自己掌控检索层、看清「关键词检索 / 混合检索 / Agentic RAG」三档差别，而不是只要一个能用就行的问答框（做法 C）。
- 需要本地 LLM 且数据不出本地（Ollama，端口 11434），同时要监控与缓存（Langfuse、Redis）。
- 需要定时自动抓取与编排（Airflow DAG），或需要把问答做到移动端（Telegram Bot）。
- 手上有一套可被 Docling 解析的 PDF 文档；课程本身以 arXiv 论文为贯穿案例。
- 有 Docker 资源余量：8GB+ 内存、20GB+ 空闲磁盘。

**不适用**

- 只是偶尔问一次问题，不需要文档库和调度。
- 敏感数据场景且需要安全/合规结论——三份调研都未提供安全或合规说明。
- 出网严格受限的环境——AnythingLLM 即使关掉遥测，使用外部模型/向量库仍有对应厂商外连，应用本身还会连 `cdn.anythingllm.com` 与 github/githubusercontent；notebooklm-py 依赖 Google 服务；做法 C 的混合检索要 Jina API、监控要 Langfuse，也都是外连。
- 不能接受非官方 API、未公开 Google API 的稳定性和限额风险。
- 没有本地浏览器做首次交互式登录，且未准备 master token / 专用账号。
- 想直接照抄 AnythingLLM 的定时任务、动态模型路由、Agent Flows 的具体参数——README 对这些只给文档链接和一句话描述，没有配置样例。
- 不想承担自建与运维成本：做法 C 要自己起 Docker 全栈、配 `.env`、管端口和内存。
- 只想尽快拿到一个能用的文档问答入口，不打算做检索方案对照实验——那做法 A 更划算。
- 不愿意读代码和 notebook：做法 C 的提示词、LangGraph 图定义和评估脚本不在 README，而在仓库代码/notebooks 与博客里，README 只到架构与入口层面。

## 前置条件

- AnythingLLM：一台能跑 Docker 的机器（或走 README 指向的 `./BARE_METAL.md` 无 Docker 部署；也可直接下载桌面版，支持 Mac/Windows/Linux）。
- AnythingLLM：一个已经能用的模型 provider：本地推理需先把模型服务跑起来；云端 provider 需要相应 API Key。
- AnythingLLM：一个向量库：默认 LanceDB，零配置；也可从 PGVector、Astra DB、Pinecone、Chroma、Weaviate、Qdrant、Milvus、Zilliz 中选。
- AnythingLLM：20–50 份同主题、答案位置明确的文档，用于验证。
- AnythingLLM：走源码开发模式时，`server/.env.development` 必须填好。
- notebooklm-py：一个可用于 NotebookLM / Gemini Notebook 的 Google 账号（每个 notebook 的来源数量上限取决于账号等级）。
- notebooklm-py：Python 3.10–3.14。
- notebooklm-py：首次交互式登录需要本地浏览器（会下载 Chromium，约 170 MB）。
- notebooklm-py：推荐用 uv、pipx 或虚拟环境隔离，避免 PEP 668 的 `externally-managed-environment` 报错。
- notebooklm-py：无头/服务器场景需要可接受使用专用账号和 master token。
- 做法 C：Docker Desktop（含 Docker Compose）。
- 做法 C：Python 3.12+ 与 UV 包管理器。
- 做法 C：8GB+ 内存、20GB+ 空闲磁盘。
- 做法 C：`.env`（从 `.env.example` 复制）；其中 `JINA_API_KEY` 在 Week 4 及以后必需（混合检索的向量嵌入），`TELEGRAM__BOT_TOKEN` 在 Week 7 必需（Telegram Bot），`LANGFUSE__PUBLIC_KEY` 与 `LANGFUSE__SECRET_KEY` 在 Week 6 可选（监控）。
- 做法 C：可被 Docling 解析的 PDF 文档。

## 操作步骤

先决定走哪条路：

- **做法 A：AnythingLLM，本地优先文档问答 + 定时任务**。要开多用户、要把问答挂件嵌进网站，只能走 Docker；本地看效果、要改代码，走源码开发模式。最短路径，几乎不写代码，但检索层是黑盒。
- **做法 B：notebooklm-py，让 agent 程序化驱动 NotebookLM / Gemini Notebook**。适合已经在用 agent、想把昂贵阅读与综合外包给 NotebookLM 的团队；但它是非官方 API，依赖未公开的 Google API，稳定性和限额必须自行验证。
- **做法 C：自建 production-agentic-rag-course 全栈**。适合想掌控检索层、要做「关键词 / 混合 / Agentic」对照的团队。它的路线主张是先用 BM25 关键词检索打底、再用向量增强，而不是一上来就向量检索。代价是要自己起 Docker 全栈、读仓库代码与 notebook。
- **可组合**：NotebookLM 做 grounded 阅读与综合，agent 只负责编排和最后一公里；AnythingLLM 做本地文档库与 cron 定时任务；做法 C 做检索质量对照与自建链路。先各自跑通一条端到端流水线，再决定是否固化进 SKILL.md 或定时任务。

### 做法 A：AnythingLLM 本地优先

A1. 选部署方式：
   - **Docker 部署**：要开多用户、要把问答挂件嵌进网站，只能走这条（两项均仅 Docker 版本提供）。
   - **源码开发模式**：本地看效果、要改代码时用；README 里可直接复制的命令只有这一组，但它只是「跑起来」的步骤，不是「用好」的步骤。

A2. Docker：打开仓库里的 `./docker/HOW_TO_USE_DOCKER.md`，按其中给出的命令起服务。
   - 前提：本机已装 Docker。
   - 注意：README 只提供了指向该文件的入口链接，没有给出可直接复制的 `docker run` 命令，命令需点进该文件获取。
   - 预期结果：本机或内网可访问 AnythingLLM；顺手记录一次「冷启动到可用」的耗时，作为后面比较的基线。

A3. 关闭遥测（默认开启）。在 server 或 docker 的 `.env` 中写入：

```env
DISABLE_TELEMETRY=true
```

   也可以不改配置，在应用内 sidebar > `Privacy` 里关闭。
   - README 说明遥测只发送事件类型（安装类型、文档增删事件、向量库类型、LLM provider 与模型 tag、聊天发送事件），不含聊天内容、IP 或可识别信息，收集方为 PostHog；源码中所有 `Telemetry.sendTelemetry` 调用点可查。
   - 前提与预期：即使关闭遥测，使用外部模型/向量库仍会有对相应厂商的外连；应用仍会连 `cdn.anythingllm.com`（拉取模型镜像）和 github/githubusercontent（下载上下文窗口缓存文件）。在有出网限制的环境里要提前评估。

A4. 源码开发模式：在仓库根目录依次执行（README 原文命令）：

```bash
yarn setup        # 生成各模块所需的 .env 文件
yarn dev:server   # 本地启动服务端
yarn dev:frontend # 本地启动前端
yarn dev:collector # 运行文档收集器
```

   - 前提：仓库根目录；`yarn setup` 之后手工填写生成出来的 `.env`，尤其是 `server/.env.development`。
   - README 原文提示：Ensure `server/.env.development` is filled or else things won't work right。
   - 预期结果：server 与 collector 同时在线；collector 不在线时文档解析会失败。

A5. 接入模型与向量库，**先只接一个** provider，作为基线。
   - 本地推理选 Ollama / LM Studio / LocalAI / llama.cpp 兼容模型，云端选 OpenAI / Anthropic / DeepSeek 等。
   - 前提：云端 provider 需要 API Key；本地 provider 需要模型服务已跑起来。

A6. 建一个 workspace，拖拽上传那 20–50 份 PDF/TXT/DOCX 文档，由 `collector` 解析入库。
   - 前提：`collector` 服务在运行。
   - 预期结果：在对话中得到带来源引用的回答。

A7. 配 1 个 cron 定时任务：选一件你本来每周手动做一次的固定动作，让它按计划产出。
   - README 指向 `docs.anythingllm.com/scheduled-jobs/overview`，**未给出 cron 表达式或任务配置样例**，需读官方文档；agent 类任务需要相应的工具权限。
   - 预期结果：连续观察 2–3 次触发，看是否按时、产出是否可用。

A8. 可选，按需要再加：
   - 动态模型路由，按自定义规则把对话自动路由到合适的 provider / 模型（README 指向 `docs.anythingllm.com/model-router/overview`，未给出规则字段与写法）。
   - no-code Agent 构建器（Agent Flows）搭自定义 agent。
   - 对外集成用 Full Developer API；给站点加问答入口用 embed 挂件（仅 Docker 版）。

### 做法 B：notebooklm-py 程序化驱动 NotebookLM / Gemini Notebook

B1. 前提确认：有可用于 NotebookLM / Gemini Notebook 的 Google 账号；Python 3.10–3.14；首次交互式登录需要本地浏览器（会下载 Chromium，约 170 MB）。

B2. 安装 CLI（推荐隔离环境，避免 PEP 668 的 `externally-managed-environment` 报错）：

```bash
uv tool install "notebooklm-py[browser]"   # or: pipx install "notebooklm-py[browser]"
notebooklm login                           # first run auto-downloads Chromium (~170 MB), then Google sign-in
notebooklm auth check --test --json        # verify: expect "status": "ok"
```

   没有 uv 时用：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

   或 `brew install uv` / `winget install astral-sh.uv`。也可以直接在虚拟环境里用 pip：

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install "notebooklm-py[browser]"
```

   只当库用（不装 Playwright/Chromium）：

```bash
uv add notebooklm-py                    # or, inside a virtualenv: pip install notebooklm-py
```

   - 预期结果：`notebooklm auth check --test --json` 返回 `"status": "ok"`。

B3. 登录的三种方式（按场景选）：

```bash
# 1. Authenticate (opens browser)
notebooklm login
# Or use Microsoft Edge (for orgs that require Edge for SSO)
# notebooklm login --browser msedge
# Or reuse cookies from an already-logged-in browser session
# notebooklm login --browser-cookies chrome
# notebooklm login --browser-cookies 'chrome::Profile 1'  # one Chromium profile
```

   多账号用 profile：

```bash
notebooklm profile list                     # List all Google account profiles
notebooklm profile switch work              # Switch active account profile
```

B4. 建 notebook → 加来源 → 提问 → 生成 → 下载（CLI 主流程）：

```bash
# 2. Create a notebook and add sources
notebooklm create "My Research"
notebooklm use <notebook_id>
notebooklm source add "https://en.wikipedia.org/wiki/Artificial_intelligence"
notebooklm source add "./paper.pdf"

# 3. Chat with your sources
notebooklm ask "What are the key themes?"
notebooklm ask --prompt-file ./long_question.txt  # Read question from file

# 4. Generate content (use --prompt-file for long prompts)
notebooklm generate audio "make it engaging" --wait
notebooklm generate quiz --difficulty hard
notebooklm generate flashcards --quantity more
notebooklm generate mind-map                       # interactive studio map (default); --kind note-backed for the JSON tree
notebooklm generate data-table "compare key concepts"

# 5. Download artifacts
notebooklm download audio ./podcast.m4a
notebooklm download quiz --format markdown ./quiz.md
notebooklm download flashcards --format json ./cards.json
notebooklm download mind-map ./mindmap.json
notebooklm download data-table ./data.csv
```

   - 注意 `--prompt-file` 只用于 `ask`、prompt 型 `generate` 和 `source add-research`；上传文件作为来源仍用 `source add ./file.pdf`。
   - 预期结果：拿到带引用回答，产物可下载到本地。

B5. 让 agent 自动做网络调研并把结果一次导入：

```bash
notebooklm source add-research "AI" --import-all  # web research + import found sources
```

   README 另给的 deep 模式写法：

```bash
notebooklm source add-research "your topic" --mode deep
```

B6. 把库装成 agent skill（前提：已安装 CLI）：

```bash
notebooklm skill install
```

   安装位置为 `~/.claude/skills/notebooklm` 和 `~/.agents/skills/notebooklm`。或用开放 skills 生态：

```bash
npx skills add teng-lin/notebooklm-py
```

   查看内置的 agent 模板：

```bash
notebooklm agent show codex          # Print bundled Codex instructions
notebooklm agent show claude         # Print bundled Claude Code skill template
notebooklm skill status              # Check local agent skill installation
```

B7. 无头/服务器场景：master token + 定时保活（前提：可接受用专用账号）。
   - README 的定位是：master token 可按需签发新 cookie，让过期会话无人值守自愈，是服务器、CI 和远程 MCP connector 的认证模型。

```bash
notebooklm auth refresh --quiet      # One-shot cookie keepalive (for cron / launchd / systemd)
notebooklm auth refresh --browser-cookies chrome  # Re-extract and repair account routing
```

B8. 可选 Android（gRPC）后端（前提：显式安装 android 运行时，它不在 `all` extra 中）：

```bash
pip install "notebooklm-py[android,browser]"
notebooklm login --master-token --account you@example.com
notebooklm --backend android list --json
```

   - README 说明：Android 后端从所选 profile 读取 `master_token.json`，按需签发短期移动 bearer token，十一个公开命名空间都可用，不依赖浏览器 cookie 会话、Web build 标签或 Web RPC ID；因为 master token 是全账号级凭证，应使用专用账号并妥善保护。
   - 默认后端仍是 Web（`batchexecute`），也可用环境变量 `NOTEBOOKLM_BACKEND=android` 或 Python API 的 `NotebookLMClient.from_storage(backend="android")` / `NotebookLMClient(..., backend="android")` 选择。

B9. Python API 嵌入自有管道：

```python
import asyncio
from notebooklm import NotebookLMClient, MindMapKind


async def main():
    async with NotebookLMClient.from_storage() as client:
        # Create notebook and add sources
        nb = await client.notebooks.create("Research")
        await client.sources.add_url(nb.id, "https://example.com", wait=True)

        # Chat with your sources
        result = await client.chat.ask(nb.id, "Summarize this")
        print(result.answer)

        # Generate content (podcast, video, quiz, etc.)
        status = await client.artifacts.generate_audio(nb.id, instructions="make it fun")
        await client.artifacts.wait_for_completion(nb.id, status.task_id)
        await client.artifacts.download_audio(nb.id, "podcast.m4a")

        # Generate quiz and download as JSON
        status = await client.artifacts.generate_quiz(nb.id)
        await client.artifacts.wait_for_completion(nb.id, status.task_id)
        await client.artifacts.download_quiz(nb.id, "quiz.json", output_format="json")
```

   - 调研材料中的 Python 示例在此处截断，未给出完整 mind map 调用；不要照抄不存在的部分。

B10. 小范围试：先用 `create → source add → ask → download` 跑通一条端到端流水线，再决定是否固化进 SKILL.md 或定时任务。

### 做法 C：自建生产级 RAG 全栈（production-agentic-rag-course）

C1. 前提：Docker Desktop（含 Docker Compose）、Python 3.12+、UV 包管理器、8GB+ 内存、20GB+ 空闲磁盘。

C2. 克隆并起全栈（前提：完成 C1）：

```bash
# 1. Clone and setup
git clone <repository-url>
cd arxiv-paper-curator

# 2. Configure environment (IMPORTANT!)
cp .env.example .env
# The .env file contains all necessary configuration for OpenSearch, 
# arXiv API, and service connections. Defaults work out of the box.
# You need to add Jina embeddings free api key and langfuse keys (check the blogs)

# 3. Install dependencies
uv sync

# 4. Start all services
docker compose up --build -d

# 5. Verify everything works
curl http://localhost:8000/api/v1/health
```

   - 注意：README 的克隆命令里写的是 `arxiv-paper-curator` 这个仓库名，而当前页面的仓库名是 `production-agentic-rag-course`，克隆前先确认实际地址。
   - 预期结果：健康检查有响应；服务全部起来大约要等 2–3 分钟。

C3. 配置必需变量（前提：`.env` 已由 `.env.example` 生成）：

```bash
cp .env.example .env
# Edit .env for your environment
```

   - `JINA_API_KEY`：Week 4 及以后必需（混合检索的向量嵌入）。
   - `TELEGRAM__BOT_TOKEN`：Week 7 必需（Telegram Bot）。
   - `LANGFUSE__PUBLIC_KEY` & `LANGFUSE__SECRET_KEY`：Week 6 可选（监控）。
   - 完整选项见仓库 `.env.example`。

C4. 访问各服务（前提：`docker compose up --build -d` 成功）：

| 服务 | URL | 用途 |
|---|---|---|
| API Documentation | http://localhost:8000/docs | 交互式 API 测试 |
| Gradio RAG Interface | http://localhost:7861 | 聊天界面 |
| Langfuse Dashboard | http://localhost:3000 | RAG 链路监控与追踪 |
| Airflow Dashboard | http://localhost:8080 | 工作流管理 |
| OpenSearch Dashboards | http://localhost:5601 | 搜索引擎 UI |

   - Airflow 用户名/密码见 `airflow/simple_auth_manager_passwords.json.generated`。
   - 预期结果：五个入口都能打开；记一次冷启动到可用的耗时作为基线。

C5. 按周推进，每周跑对应 notebook（前提：C2–C4 已通过）：

```bash
uv run jupyter notebook notebooks/week1/week1_setup.ipynb
uv run jupyter notebook notebooks/week2/week2_arxiv_integration.ipynb
uv run jupyter notebook notebooks/week3/week3_opensearch.ipynb
uv run jupyter notebook notebooks/week4/week4_hybrid_search.ipynb
uv run jupyter notebook notebooks/week5/week5_complete_rag_system.ipynb
uv run jupyter notebook notebooks/week6/week6_cache_testing.ipynb
uv run jupyter notebook notebooks/week7/week7_agentic_rag.ipynb
```

   启动 Gradio 界面：

```bash
uv run python gradio_launcher.py
# Open http://localhost:7861
```

C6. 只取某一周的代码做对照实验（前提：想跳过前面周次）：

```bash
# Clone a specific week's code
git clone --branch <WEEK_TAG> https://github.com/jamwithai/arxiv-paper-curator
cd arxiv-paper-curator
uv sync
docker compose down -v
docker compose up --build -d

# Replace <WEEK_TAG> with: week1.0, week2.0, etc.
```

   - 可用 tag：`week1.0` … `week7.0`。
   - 预期结果：同一批问题可以在不同周的检索实现上重复提问，做对照。

C7. 构建检索层（Week 3 → Week 4，这是可迁移的核心流程）：
   1. 先在 OpenSearch 建索引/mapping，跑 BM25 关键词检索（`src/services/opensearch/`、`src/routers/search.py`，端点 `POST /api/v1/search`）。
   2. 再用 `src/services/indexing/text_chunker.py` 做按章节切分（带 overlap）。
   3. 用 `src/services/embeddings/`（Jina AI，含 fallback 策略）生成向量。
   4. 通过 `src/routers/hybrid_search.py`（端点 `POST /api/v1/hybrid-search/`）用 RRF 融合关键词与语义结果。
   - 预期结果：同一批问题分别拿到关键词检索与混合检索两套结果；Week 3 用 precision、recall、relevance scoring 记录质量。

C8. 接 LLM 与流式输出（Week 5）：
   - 端点：`/api/v1/ask` 与 `/api/v1/stream`（`src/routers/ask.py`）。
   - 系统提示词文件：`src/services/ollama/prompts/rag_system.txt`（针对学术论文优化）。
   - LLM 服务：`src/services/ollama/`（本地 Ollama，端口 11434，数据不出本地）。

C9. 加监控与缓存（Week 6）：
   - Langfuse：`src/services/langfuse/`，在 RAG 端点挂 tracing，看延迟/成本仪表盘。
   - Redis：`src/services/cache/`，精确匹配缓存 + 优雅降级，缓存键与 TTL 在服务内管理。
   - `docker-compose.yml` 增加 Redis 与 Langfuse 本地实例。

C10. 升级为 Agentic RAG（Week 7）：
   - 节点实现：`src/services/agents/nodes/`（guardrail、retrieve、grade、rewrite、generate）。
   - 工作流编排：`src/services/agents/agentic_rag.py`（LangGraph）。
   - 智能体端点：`src/routers/agentic_ask.py`；Telegram Bot：`src/services/telegram/`。
   - 关键机制：决策节点自适应选检索策略、文档相关性打分（document grading）、结果不足时查询改写重试（query rewriting / adaptive retrieval）、域外问题 guardrail 拦截（防幻觉）、暴露推理步骤便于调试。
   - 预期结果：域外问题被拦截而不是硬答；检索结果不足时会改写重试；推理步骤可见。

C11. 日常操作与排障（前提：位于仓库根目录）：

```bash
make help          # View all available commands
make start         # Start all services
make health        # Check all services health
make test          # Run tests
make stop          # Stop services
```

   直接命令替代方案：

```bash
docker compose up --build -d    # Start services
docker compose ps               # Check status
docker compose logs            # View logs
uv run pytest                 # Run tests
```

   - 排障：服务起不来先等 2–3 分钟并看 `docker compose logs`；端口冲突释放 8000 / 8080 / 5432 / 9200；内存不足调大 Docker Desktop 内存。
   - 完全重置：

```bash
docker compose down --volumes && docker compose up --build -d
```

## 怎么判断变好了

**最小试用方式（单机、单人）**

1. 做法 A：按 A1–A7 起一个实例，先设 `DISABLE_TELEMETRY=true`，记录一次冷启动到可用的耗时。
2. 做法 A：只接一个你已经在用的模型，作为基线，不做切换对比。
3. 做法 A：建 workspace，上传 20–50 份你日常需要反复翻查的文档（同一主题，含明确的答案位置）。
4. 做法 A：准备 10 个你已知答案的问题，逐个提问，逐条记录：答案是否正确、引用是否指向真正含答案的那份文档、回答耗时。
5. 做法 A：配 1 个 cron 定时任务，选一件你本来每周手动做一次的固定动作，连续观察 2–3 次触发是否按时、产出是否可用。
6. 做法 B：先用 `create → source add → ask → download` 跑通一条端到端流水线，建议连续做多次真实任务；记录 ask 回答是否有引用、产物能否下载、agent 调用成功率、认证失效/限额触发次数。再决定是否固化进 SKILL.md 或定时任务。
7. 做法 C：先用默认分支跑到 `curl http://localhost:8000/api/v1/health` 通过、五个服务入口能打开；再用 `week3.0` 与 `week4.0` 两个 tag 各起一次，用同一批问题对比 BM25 与混合检索。只有这一步出现可观察差异，再考虑 Week 5–7。
8. 对照基线：同一批问题用你现在的做法（手工翻文档，或直接把文档贴进通用聊天窗口）走一遍，用同样的记录口径。

**可观察的指标**

- 10 个已知答案问题的答案正确数。
- 引用命中率：引用是否指向真正含答案的那份文档。
- 单次回答耗时，以及冷启动到可用的耗时。
- 定时任务 2–3 次触发的按时率与产出可用率。
- notebooklm-py：端到端流水线跑通次数、产物下载成功率、agent skill 调用成功率、认证保活是否无人值守、限额/失败次数。
- 做法 C：同一批问题在 BM25 / 混合检索 / Agentic RAG 三档下的 precision、recall、relevance scoring；Langfuse 仪表盘上的端到端延迟与成本；重复问题命中 Redis 缓存后的耗时；Agentic 侧 guardrail 拦截次数、查询改写重试次数、推理步骤是否可读。

**试多久**

- 做法 A、B：一周。一周内如果引用命中率没有明显优势，或定时任务产出不可用，就不要继续投入。notebooklm-py 若认证频繁失效或限额触发，不要固化进 SKILL.md 或定时任务。
- 做法 C：课程本身按 7 周递进，不要一周内全做完。至少把 Week 3 与 Week 4 的对照跑完再决定是否继续投入 Week 5–7；如果混合检索相对 BM25 没有可观察提升，就不要继续往后投。

## 常见坑

- **AnythingLLM README 只有入口链接，没有可直接复制的命令**。Docker 部署要自己点进 `docker/HOW_TO_USE_DOCKER.md`；定时任务、模型路由、Agent Flows、MCP 兼容也各只有一个文档链接，没有参数、配置样例和步骤。
- **AnythingLLM 多用户支持与网站嵌入挂件仅 Docker 版本提供**。选错部署方式，后面这两项直接做不了。
- **AnythingLLM 遥测默认开启**，需要主动关闭；关闭后仍有固定外连（模型厂商、`cdn.anythingllm.com`、github/githubusercontent）。
- **AnythingLLM `server/.env.development` 不填好，开发模式跑不起来**。`yarn setup` 生成 `.env` 后必须手工填写。
- **把宣传性表述当成数据**。「Intelligent Skill Selection……token 使用最多降低 80%」、「比其它 chat UI 成本更低、响应更快」、「battle-tested」、「no extra configuration required」这些都没有测法、没有对照，只是作者主张。
- **AnythingLLM README 没有任何效果、性能、成本数据，也没有安全/合规说明**，无法据此判断敏感数据场景是否可用。
- **`yarn` 那组命令只是「跑起来」的步骤**，不是「用好」的步骤，后者要另找官方文档。
- **notebooklm-py 是非官方 API，依赖未公开的 Google API**。稳定性和限额必须自行验证，不能假设长期可用。
- **NotebookLM 在 2026 年 7 月被 Google 更名为 Gemini Notebook，底层服务与链接不变**；看到旧名称时不要以为换了服务。
- **首次交互式登录需要本地浏览器**，会下载 Chromium（约 170 MB）；无头服务器要提前准备 master token 和专用账号。
- **PEP 668 的 `externally-managed-environment` 报错**：优先用 `uv tool install`、`pipx` 或虚拟环境，不要直接往系统 Python 装。
- **master token 是全账号级凭证**，应使用专用账号并妥善保护；Android 后端从 profile 读取 `master_token.json`，按需签发短期移动 bearer token。
- **Android 后端不在 `all` extra 中**，需显式安装 `notebooklm-py[android,browser]`。
- **默认后端是 Web（`batchexecute`）**，可用 `NOTEBOOKLM_BACKEND=android` 或 Python API 的 `NotebookLMClient.from_storage(backend="android")` / `NotebookLMClient(..., backend="android")` 选择 Android。
- **`--prompt-file` 只用于 `ask`、prompt 型 `generate` 和 `source add-research`**；上传文件作为来源仍用 `source add ./file.pdf`。
- **每个 notebook 的来源数量上限取决于账号等级**；批量导入前先确认限额。
- **notebooklm-py 的 stars 19591 来自本次线索的 metrics 字段**，不是效果、性能或成本数据。
- **「零 token 综合层/记忆层」是调研建议**，不是 README 数据；先小范围试，再决定是否固化。
- **课程仓库的克隆命令与页面仓库名不一致**：README 写 `cd arxiv-paper-curator`，而当前页面仓库名是 `production-agentic-rag-course`，克隆前先确认实际地址。
- **做法 C 的 README 只到架构与入口层面**：提示词、LangGraph 图定义和评估脚本都在仓库代码/notebooks 与博客里，照着 README 走不到「用好」。
- **不要跳过前几周直接上 Week 7**：课程按 7 周递进，作者的路线主张是先 BM25 关键词检索打底、再用向量增强；顺序本身是课程主张，实际差距要自己测。
- **做法 C 的密钥要分清必需与可选**：Jina 是 Week 4 及以后必需，Telegram Bot Token 是 Week 7 必需，Langfuse 公私钥 Week 6 可选。
- **做法 C 服务起不来通常只是没等够**：等 2–3 分钟再看 `docker compose logs`；端口冲突释放 8000 / 8080 / 5432 / 9200；内存不足调大 Docker Desktop 内存。
- **Airflow 登录信息不在 README 正文里**：见 `airflow/simple_auth_manager_passwords.json.generated`。
- **Week 6 的 Redis 是精确匹配缓存**：字面不同但语义相近的问题不会命中。
- **课程以 arXiv 论文为贯穿案例**：摄取层围绕 arXiv API 构建，用到自己的文档前先确认这条路径能改到你的数据源。

## 证据与来源

**AnythingLLM 部分**

- 全部操作项来自 Mintplex-Labs/anything-llm 仓库 README：MIT 许可、66,645 stars、monorepo 六模块（`frontend` / `server` / `collector` / `docker` / `embed` / `browser-extension`）、支持清单（30+ LLM provider、10+ embedder、9 个向量库、多 TTS/STT）、部署方式一览表，以及开发模式的三条 `yarn` 命令与 `server/.env.development` 前置要求。
- 遥测范围与关闭方式为 README 自述（PostHog 收集事件类型，不含聊天内容、IP 或可识别信息），并说明可在源码中按 `Telemetry.sendTelemetry` 检索核对。
- 以下仅为作者主张、无数据支撑，本手册只作提示、不作结论：token 使用最多降低 80% 的「Intelligent Skill Selection」；「比其它 chat UI 更低成本、更快响应」的优化说法；「battle-tested」「no frustrating setup」「no extra configuration required」「Production-ready for any cloud deployment」；多用户权限与嵌入挂件「更安全/更私密」的定性描述。
- 本份 AnythingLLM 调研只有 README，没有官方文档正文，也没有任何性能、成本、效果或安全合规数据。文中的最小试用方式、20–50 份文档、10 个已知答案问题、2–3 次触发观察，均为该调研给出的试用建议，不是厂商数据；「怎么算变好」需要自己按上述口径采集。

**notebooklm-py 部分**

- 来自 teng-lin/notebooklm-py 调研/README：非官方 Python API + CLI，同时提供 MCP Server、REST Server 和 agent skill 安装方式，让 Claude Code、Codex、OpenClaw 等智能体以编程方式驱动 NotebookLM。
- README 自述定位是「程序化访问 NotebookLM 全部能力」：建 notebook、批量导入来源（URL/YouTube/PDF/Word/EPUB/音视频/图片/Google Drive/粘贴文本）、带引用的问答、把回答存成 note、生成音频/视频/幻灯片/信息图/测验/闪卡/报告/数据表/思维导图，并把产物批量下载到本地（MP3/MP4/PDF/PPTX/PNG/CSV/JSON/Markdown）。
- README 强调了两类 Web UI 不提供的能力：批量下载、测验/闪卡的 JSON/Markdown/HTML 导出、思维导图 JSON 提取。
- README 自述的使用范式是：NotebookLM 做「有据可依（grounded）的昂贵阅读与综合」，agent 只负责编排和最后一公里。
- 仓库指标显示 stars 19591（来自本次线索的 metrics 字段）。
- NotebookLM 在 2026 年 7 月被 Google 更名为 Gemini Notebook，底层服务与链接不变。
- 安装、认证、CLI/Python API 与 agent 集成步骤来自该 README；但它依赖未公开的 Google API，稳定性和限额必须自行验证。
- 调研结论建议小范围试：把 notebooklm-py 作为「零 token 综合层/记忆层」接进 Claude Code 等 agent 的研究与写作工作流，先用 create → source add → ask → download 跑通一条端到端流水线再决定是否固化进 SKILL.md 或定时任务。这是调研建议，不是厂商数据。
- 本份 notebooklm-py 调研没有官方文档正文，也没有性能、成本、效果或安全合规数据。文中把 notebooklm-py 纳入同一周试用，是本次合并时的操作化安排，不是厂商数据；「怎么算变好」需要自己按上述口径采集。

**production-agentic-rag-course 部分**

- 全部操作项来自 jamwithai/production-agentic-rag-course 仓库 README：MIT、免费课程，以 arXiv Paper Curator 为贯穿案例，7 周递进、每周一个独立 release tag（`week1.0` … `week7.0`），以及 Quick Start 命令、`.env` 必需变量清单、五个服务入口、`make` 命令与完全重置命令。
- 课程结构（Week 1 基础设施 → Week 2 摄取 → Week 3 BM25 → Week 4 分块 + 混合检索 → Week 5 完整 RAG → Week 6 监控与缓存 → Week 7 Agentic RAG + Telegram）与各周对应的源码路径、端点，来自该 README。
- Week 3 的 precision / recall / relevance scoring 是课程给出的质量指标；Week 6 的 Langfuse 端到端追踪与 Redis 精确匹配缓存、Week 7 的 guardrail / document grading / query rewriting / 推理步骤暴露，都是课程 README 列出的内容。
- 「先用扎实的关键词搜索地基，再用向量增强」是作者明确主张的路线，属于主张而非效果数据。
- 该调研同样只有 README，没有官方文档正文，也没有性能、成本、效果或安全合规数据；README 本身只到架构与入口层面，提示词、LangGraph 图定义与评估脚本在仓库代码/notebooks 与博客里。
- README 克隆命令中的仓库名（`arxiv-paper-curator`）与页面仓库名（`production-agentic-rag-course`）不一致，这是本次合并时发现的材料内部不一致，照抄前需确认。
- 文中把做法 C 与做法 A/B 放进同一份试用与对照口径，是本次合并时的操作化安排，不是厂商数据。

## 依据的调研

- [Mintplex-Labs/anything-llm](../research/radar/2026-10-02/546-mintplex-labs-anything-llm.md)：值得一试，可以小范围试：按 README 给出的开发/自托管入口把 AnythingLLM 在本机或内网部署起来，接入已有模型，用「文档问答」和「cron 定时任务」各跑一个真实场景，理由是它把本地文档上下文、多模型、agent 与定时调度打包成一套可直接部署的应用；但 README 只给功能入口链接、缺少定时任务/模型路由等关键功能的可照做参数，也没有任何效果数据，因此先试不直接采用。
- [teng-lin/notebooklm-py](../research/radar/2026-10-02/584-teng-lin-notebooklm-py.md)：值得一试，建议小范围试：把 notebooklm-py 作为「零 token 综合层/记忆层」接进 Claude Code 等 agent 的研究与写作工作流，先用 create → source add → ask → download 跑通一条端到端流水线再决定是否固化进 SKILL.md 或定时任务。README 给出了可复制的安装、认证、CLI/Python API 与 agent 集成步骤，但它依赖未公开的 Google API，稳定性和限额必须自行验证。
- [jamwithai/production-agentic-rag-course](../research/radar/2026-10-04/1063-jamwithai-production-agentic-rag-course.md)：值得一试，建议小范围试：按 README 的 Quick Start 在本地起完整栈（Docker + FastAPI + PostgreSQL + OpenSearch + Airflow + Ollama），先跑 Week 3 的 BM25 关键词检索、再加 Week 4 混合检索，最后对比 Week 7 的 Agentic RAG 与普通 RAG 的效果；理由是原文给出了可直接复制的命令、配置项、服务入口和按周递进的可复现路径，且 Langfuse 追踪与 Redis 缓存提供了现成的效果验证手段，但提示词、LangGraph 图定义和评估脚本都在仓库代码/notebooks 与博客里，README 本身只到架构与入口层面。
