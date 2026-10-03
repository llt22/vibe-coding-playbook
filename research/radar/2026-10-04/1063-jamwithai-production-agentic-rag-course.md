# jamwithai/production-agentic-rag-course

- 结论：**值得一试**。建议小范围试：按 README 的 Quick Start 在本地起完整栈（Docker + FastAPI + PostgreSQL + OpenSearch + Airflow + Ollama），先跑 Week 3 的 BM25 关键词检索、再加 Week 4 混合检索，最后对比 Week 7 的 Agentic RAG 与普通 RAG 的效果；理由是原文给出了可直接复制的命令、配置项、服务入口和按周递进的可复现路径，且 Langfuse 追踪与 Redis 缓存提供了现成的效果验证手段，但提示词、LangGraph 图定义和评估脚本都在仓库代码/notebooks 与博客里，README 本身只到架构与入口层面。
- 原文：https://github.com/jamwithai/production-agentic-rag-course
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-03T17:01:06.828Z

## 是什么

`jamwithai/production-agentic-rag-course` 是一门「从零手搓生产级 RAG 系统」的公开课程仓库（MIT，免费），以 **arXiv Paper Curator** 为贯穿案例：自动抓取 arXiv 论文 → 解析 PDF → 建索引 → 关键词/混合检索 → 接本地 LLM 做问答 → 加监控与缓存 → 升级为 Agentic RAG 并接 Telegram 机器人。

课程按 7 周递进，每周一个独立 release tag，可单独克隆：

| 周 | 内容 |
|---|---|
| Week 1 | 基础设施：Docker Compose、FastAPI、PostgreSQL、OpenSearch、Airflow、Ollama |
| Week 2 | 数据摄取：arXiv API（限速+重试）、Docling 解析 PDF、Airflow DAG、元数据入库 |
| Week 3 | BM25 关键词检索：索引管理、mapping、Query DSL、相关性指标 |
| Week 4 | 分块 + 混合检索：按章节切分、Jina 嵌入、RRF 融合 |
| Week 5 | 完整 RAG：Ollama 本地 LLM、SSE 流式、Gradio 界面 |
| Week 6 | 监控与缓存：Langfuse 端到端追踪、Redis 精确匹配缓存 |
| Week 7 | Agentic RAG：LangGraph 决策节点（guardrail / retrieve / grade / rewrite / generate）、Telegram Bot |

作者明确主张的路线是「先扎实的关键词搜索地基，再用向量增强」而不是「一上来就向量检索」——这是本仓库与多数 RAG 教程的主要区别。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**步骤 0｜前提**：Docker Desktop（含 Docker Compose）、Python 3.12+、UV 包管理器、8GB+ 内存、20GB+ 空闲磁盘。

**步骤 1｜克隆并起全栈（前提：完成步骤 0）**
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
注意：README 的克隆命令写的是 `arxiv-paper-curator` 仓库名，而当前页面的仓库名是 `production-agentic-rag-course`（见「证据与局限」）。

**步骤 2｜配置必需变量（前提：步骤 1 已生成 .env）**
```bash
cp .env.example .env
# Edit .env for your environment
```
- `JINA_API_KEY` —— Week 4 及以后必需（混合检索的向量嵌入）
- `TELEGRAM__BOT_TOKEN` —— Week 7 必需（Telegram Bot）
- `LANGFUSE__PUBLIC_KEY` & `LANGFUSE__SECRET_KEY` —— Week 6 可选（监控）
完整选项见仓库 `.env.example`。

**步骤 3｜启动并访问各服务（前提：`docker compose up --build -d` 成功，等待 2-3 分钟）**

| 服务 | URL | 用途 |
|---|---|---|
| API Documentation | http://localhost:8000/docs | 交互式 API 测试 |
| Gradio RAG Interface | http://localhost:7861 | 聊天界面 |
| Langfuse Dashboard | http://localhost:3000 | RAG 链路监控与追踪 |
| Airflow Dashboard | http://localhost:8080 | 工作流管理 |
| OpenSearch Dashboards | http://localhost:5601 | 搜索引擎 UI |

Airflow 用户名/密码见 `airflow/simple_auth_manager_passwords.json.generated`。

**步骤 4｜按周推进，每周跑对应 notebook（前提：步骤 1-3）**
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

**步骤 5｜只取某一周的代码（前提：想跳过前面周次或做对照实验）**
```bash
# Clone a specific week's code
git clone --branch <WEEK_TAG> https://github.com/jamwithai/arxiv-paper-curator
cd arxiv-paper-curator
uv sync
docker compose down -v
docker compose up --build -d

# Replace <WEEK_TAG> with: week1.0, week2.0, etc.
```
可用 tag：`week1.0` … `week7.0`。

**步骤 6｜构建检索层（Week 3 → Week 4，这是可迁移的核心流程）**
1. 先在 OpenSearch 建索引/mapping，跑 BM25 关键词检索（`src/services/opensearch/`、`src/routers/search.py`，端点 `POST /api/v1/search`）。
2. 再用 `src/services/indexing/text_chunker.py` 做按章节切分（带 overlap）。
3. 用 `src/services/embeddings/`（Jina AI，含 fallback 策略）生成向量。
4. 通过 `src/routers/hybrid_search.py`（端点 `POST /api/v1/hybrid-search/`）用 RRF 融合关键词与语义结果。

**步骤 7｜接 LLM 与流式输出（Week 5）**
- 端点：`/api/v1/ask` 与 `/api/v1/stream`（`src/routers/ask.py`）
- 系统提示词文件：`src/services/ollama/prompts/rag_system.txt`（针对学术论文优化）
- LLM 服务：`src/services/ollama/`（本地 Ollama，端口 11434，数据不出本地）

**步骤 8｜加监控与缓存（Week 6）**
- Langfuse：`src/services/langfuse/`，在 RAG 端点挂 tracing，看延迟/成本仪表盘
- Redis：`src/services/cache/`，精确匹配缓存 + 优雅降级，缓存键与 TTL 在服务内管理
- `docker-compose.yml` 增加 Redis 与 Langfuse 本地实例

**步骤 9｜升级为 Agentic RAG（Week 7）**
- 节点实现：`src/services/agents/nodes/`（guardrail、retrieve、grade、rewrite、generate）
- 工作流编排：`src/services/agents/agentic_rag.py`（LangGraph）
- 智能体端点：`src/routers/agentic_ask.py`
- Telegram Bot：`src/services/telegram/`
- 关键机制：决策节点自适应选检索策略、文档相关性打分（document grading）、结果不足时查询改写重试（query rewriting / adaptive retrieval）、域外问题拦截（guardrail 防幻觉）、暴露推理步骤便于调试

**步骤 10｜日常操作命令（前提：位于仓库根目录）**
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

**步骤 11｜排障**
- 服务起不来：等 2-3 分钟，看 `docker compose logs`
- 端口冲突：释放 8000 / 8080 / 5432 / 9200
- 内存不足：调大 Docker Desktop 内存
- 完全重置：
```bash
docker compose down --volumes && docker compose up --build -d
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**——原文列出的、容易被忽略可交给 AI 的环节：文档相关性自动打分（document grading）、检索结果不足时自动改写查询重试、域外问题 guardrail 拦截、把整个问答搬到 Telegram 做移动端访问。这些是「普通向量检索问答」之上多出来的能力位。

**2. 任务匹配**——课程给出明确的顺序主张：关键词检索打底 → 混合检索 → LLM 生成 → 监控缓存 → 智能体编排，反对「AI-first 忽略搜索基础」。工具-任务对应关系也有依据：Airflow 负责定时抓取编排、PostgreSQL 存元数据、OpenSearch 做 BM25+向量、Ollama 做本地隐私型 LLM、Jina 做嵌入、Redis 做缓存、Langfuse 做可观测、LangGraph 做多步决策、Gradio/Telegram 做交互前端。

**3. 条件供给**——需要提供：arXiv API（数据源）、Jina API key（嵌入）、Telegram Bot Token、Langfuse 公私钥、Docker 资源（8GB 内存/20GB 磁盘）、`.env` 配置、以及可被 Docling 解析的 PDF 文档；系统侧需要 OpenSearch 索引/mapping 与切分策略（按章节 + overlap）才能给出好的检索结果。

**4. 主动推进**——Airflow DAG 做「每日自动抓取论文」的时间触发流水线（Week 2）；Week 6 的 Redis 精确匹配缓存让重复问题直接命中；Week 7 的 Agentic 流程内部由状态驱动做多轮检索与兜底（结果不足则改写重试）。Telegram Bot 使问答可随时从移动端触发。

**5. 效果验证**——Week 3 明确给出质量指标：precision、recall、relevance scoring；Week 6 用 Langfuse 做端到端 RAG 链路追踪，提供延迟与成本的实时仪表盘；Week 7 通过暴露推理步骤（reasoning transparency）来调试与建立信任。另有作者声称的量化收益（见「证据与局限」）。

## 与已有做法的关系

清单中相关条目：**arXiv（source，status: try）**。

本仓库是把这个 arXiv 数据源真正跑起来的一条具体管道：`ArxivClient`（带限速与重试逻辑）抓取 → `PDFParserService` 用 Docling 解析科学文档 → 元数据与正文入 PostgreSQL → 灌入 OpenSearch → 提供 BM25 与混合检索 API。也就是说，它给出了「论文源 → 可检索知识库 → 可问答」的端到端路径与运维方式（Airflow 每日 DAG），而清单里原有的 arXiv 条目只标了来源和状态，没有这条实施路径。

## 证据与局限

**可核实的材料**：
- 仓库热度：9,341 stars，当日 +192（来自本线索的 metrics，非 README 内容）。
- README 自述状态为 Week 7（Advanced Features），7 周内容全部有对应 blog 与 release tag。
- 技术栈清单标注各组件状态为 Ready：FastAPI、PostgreSQL 16、OpenSearch 2.19、Airflow 3.0、Jina AI、Ollama、Redis、Langfuse。
- 成本自述：本地开发 $0，可选云 API 约 $2-5。
- 前置条件、命令、端口、端点、环境变量名都是原文给出的、可直接照做的内容。

**只是作者主张、原文未给测量方法的数据**：
- 「80% prompt reduction（6x speed improvement）」（Week 5）
- 「150-400x speedup with caching」（Week 6）
- 「production-grade」「industry best practices」「the way successful companies do」等定性说法
- 「先关键词后向量」的路线优越性——这是明确的观点主张，原文没有对照实验数据支撑

**适用条件与局限**：
- README 只有架构、目录、命令和端点，**没有** LangGraph 图定义、agent 提示词正文、评估脚本细节——这些在 `src/services/agents/`、`notebooks/week7/` 和 Substack 博客里，而博客与代码未包含在本线索中。因此「怎么写出 grading/rewrite 节点的提示词」这一步无法从本文照抄。
- 案例领域是 arXiv 学术论文（含针对论文优化的系统提示词 `rag_system.txt`），迁移到其他领域需要换数据源、切分策略与提示词。
- 仓库名不一致：README 的 clone 命令指向 `arxiv-paper-curator`，而本线索的 URL 是 `production-agentic-rag-course`；实际克隆前需确认正确的仓库地址。
- 依赖 Docker Desktop 与 8GB+ 内存，属于重量级本地部署，不是零成本试用的工具。
- 需要外部 API key（Jina，免费额度）与可选的 Langfuse、Telegram 配置。

## 怎么试、怎么验证

**最小试用（1-2 天）**：
1. 只克隆 `week3.0`（BM25 检索）与 `week4.0`（混合检索），不追全部 7 周。
2. 用步骤 1 的命令起栈，跑 `week3_opensearch.ipynb` 与 `week4_hybrid_search.ipynb`。
3. 取自己手头的一小批文档（或先用内置 arXiv 抓取）灌进两个索引，用同一批 10-20 个真实问题分别打 `POST /api/v1/search` 与 `POST /api/v1/hybrid-search/`。
4. 如果继续，再克隆 `week7.0`，用同一个 `agentic_ask` 端点与 Week 5 的 `/api/v1/ask` 做对照，看多轮改写与文档打分是否真的改善答案。

**判断有没有改善的指标（都能从原文给的工具里取到）**：
- 检索层：precision、recall、relevance scoring（Week 3 明确列出的质量指标），对比 BM25-only 与 hybrid 的排序变化。
- 端到端：Langfuse Dashboard（http://localhost:3000）上的链路追踪、延迟与成本曲线。
- 缓存：开启 Redis 前后同一问题的响应时间与缓存命中情况（对照作者声称的 150-400x，自行复现而非采信）。
- 生成质量：同一批问题下答案是否引用了正确的论文来源、guardrail 是否拦住域外问题、推理步骤是否可读可调试。
- 流水线健康：`curl http://localhost:8000/api/v1/health`、`make health`、`make test` 是否通过。

**不建议采纳（adopt）的原因**：本线索只给了 README，缺少可直接抄用的提示词、工作流定义与评估脚本；迁移到非学术领域还需要自行重写切分与提示词。因此定级为「值得小范围试」，把它的检索分层思路与 Langfuse 验证手段搬进手册，而不是整体照搬这套课程。
