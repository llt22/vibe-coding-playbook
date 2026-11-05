# NVIDIA/auto-ontology

- 结论：**值得一试**。照 README 的 Docker Compose Quickstart 在你自己的只读数据库副本上跑一遍，先用一批真实业务问题测“答案＋SQL＋步骤”能否人工核对通过，再决定是否接入生产。理由：它给出可直接复制的部署、模型角色配置、MCP/REST 接入步骤，并内建“先判可回答性、查询后返回 SQL 与出处”的验证闭环，正好补上智能体做结构化分析时缺的上下文层；但它依赖 NVIDIA NIM 端点、部署较重、且不含准确率数据。
- 原文：https://github.com/NVIDIA/auto-ontology
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T08:03:09.559Z

## 是什么

NVIDIA Auto Ontology 是 Apache 2.0 开源的一个「智能体上下文层」：从企业元数据自动生成语义本体（ontology），由人认证后再通过 MCP、CLI、REST API 暴露给任意 agent harness，让智能体在做结构化数据分析（自然语言转 SQL）时知道数据在哪、是什么意思、该不该用、怎么用、来自哪里。

它把可靠性当作核心问题（原文："a revenue metric answered faster is worth nothing if the number is wrong"），本体包含三类定义：

- **Terms**：业务概念（如 Customer、Invoice Line），带描述和同义词，映射到实际列。
- **SQL attributes**：挂在术语下、经审核的 SQL 表达式（如毛利率、滚动合计），智能体复用它们，保证同一指标每次算法一致。
- **Relationships**：表之间如何 join，包括桥表，由主外键和数据推断。

工作分三阶段：**Generate**（摄取→逐表命名实体→解析关系并建议 SQL 属性→写入 Postgres，向量存 pgvector）→ **Certify**（人用真实问题在 Chat 里测，或在 MCP 上调 `check_answerable`/`ask_question`，然后精修并认证术语、描述、SQL 属性）→ **Answer**（分类意图并抽实体→嵌入检索候选术语/列/SQL 属性→写 SQL→校验过滤值和查询、失败则修复→执行并返回答案、SQL 和步骤）。

组件：前端 Next.js 3000、后端 FastAPI 3001、摄取 worker 3002、MCP server（FastMCP）3003、Postgres 17 + pgvector 5432、可选 HashiCorp Vault。支持 10 种数据源（PostgreSQL、MySQL、Databricks、Snowflake、ClickHouse、Trino、Kyuubi、HeavyDB、DuckDB、SQLite）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 本地跑通（前提：Docker + Compose v2、`uv`、一个来自 build.nvidia.com 的 `nvapi-...` key）

1. 克隆并准备环境变量：

   ```bash
   git clone https://github.com/NVIDIA/auto-ontology.git && cd auto-ontology
   cp .env.example .env
   ```

   在 `.env` 中至少改这些（每个默认口令都要换，Compose 会把 Postgres、pgAdmin、Web 应用发布到宿主机）：

   ```dotenv
   DEFAULT_MODELS_API_KEY=nvapi-...
   AUTH_SECRET=<a long random string, e.g. from openssl rand -base64 32>
   APP_URL=http://localhost:3000
   POSTGRES_PASSWORD=<a new password>
   CONNECTION_STRINGS=postgresql://postgres:<the same password>@postgres:5432/wideworldimporters
   AUTO_ONTOLOGY_ADMIN_PASSWORD=<a new password>
   PGADMIN_PASSWORD=<a new password>
   ```

   注意：`.env.example` 里每个模型角色各有一行 `nvapi-your-api-key-here`，要么逐个替换，要么删掉让它们回退到 `DEFAULT_MODELS_API_KEY`。

2. 起 Postgres 并灌入微软 Wide World Importers 样例库（种子脚本在另一个仓库，需要 `uv`）：

   ```bash
   docker compose up -d --wait postgres
   git clone https://github.com/NVIDIA/auto-ontology-eval.git ../auto-ontology-eval
   (cd ../auto-ontology-eval && uv sync && cp .env.example .env && \
     POSTGRES_PASSWORD='<the same password>' \
     uv run python scripts/seed/seed_wwi.py --database-name wideworldimporters --drop)
   ```

3. 构建并启动其余组件：

   ```bash
   docker compose up -d --build
   ```

4. 打开 http://localhost:3000，用 `.env` 里的 `AUTO_ONTOLOGY_ADMIN_EMAIL` / `AUTO_ONTOLOGY_ADMIN_PASSWORD` 登录，进 **Settings → Semantic Compilation** 打开它。摄取在启动时执行，编译立即开始，完成后界面显示 **Semantic compilation is ready**。

5. 在 **Chat** 里问一个需要跨多表 join 的问题，检查答案是否同时给出 SQL 和推理步骤：

   ```text
   What was revenue for the USB food flash drive - sushi roll in Pennsylvania in June 2015?
   ```

   合格输出应长这样（原文示例），可用来比对源库：

   ```text
   Answer:  Revenue for USB food flash drive - sushi roll in Pennsylvania in
            June 2015 was $588.80, from 3 invoice lines.

   SQL:     SELECT SUM(il.extendedprice) AS revenue, COUNT(*) AS invoice_lines
            FROM sales.invoicelines il
            JOIN sales.invoices i             ON il.invoiceid = i.invoiceid
            JOIN warehouse.stockitems si      ON il.stockitemid = si.stockitemid
            JOIN sales.customers c            ON i.customerid = c.customerid
            JOIN application.cities ct        ON c.deliverycityid = ct.cityid
            JOIN application.stateprovinces sp ON ct.stateprovinceid = sp.stateprovinceid
            WHERE si.stockitemname = 'USB food flash drive - sushi roll'
              AND sp.stateprovincename = 'Pennsylvania'
              AND i.invoicedate >= '2015-06-01' AND i.invoicedate < '2015-07-01'

   Steps:   Resolved terms: Invoice Line (revenue), Stock Item, State Province, Invoice
            Joined: invoice line -> invoice -> customer -> city -> state province
            Validated the filter values against the data, then executed
   ```

6. 反向测试「数据回答不了的问题」——WWI 没有广告数据：

   ```text
   What was return on ad spend for the sushi roll flash drive in June 2015?
   ```

   期望行为（通过 MCP 接入时）：`check_answerable` 返回低覆盖率（示例 coverage 0.5，无术语覆盖 "ad spend"），智能体说明缺什么并请求澄清或要求接新数据源，而不是编一个数。

7. 排障：重启后左侧导航消失是浏览器持有了过期会话 cookie，清掉 `localhost:3000` 的站点数据再登录；其他失败见 `skills/nvidia-ontology-setup/references/troubleshooting.md`。

### B. 把本体接进你自己的智能体（前提：上面栈已跑起来，且已登录拿到权限）

8. 起 MCP server（只读工具；每个用户经 Auto-Ontology 登录，调用按该用户权限执行）：

   ```bash
   AUTO_ONTOLOGY_API_URL=http://localhost:3000 \
     uvx --from "git+https://github.com/NVIDIA/auto-ontology.git#subdirectory=mcp" auto-ontology-mcp
   ```

9. 在客户端配 MCP。Cursor（`~/.cursor/mcp.json`）：

   ```json
   {
     "mcpServers": {
       "auto-ontology": { "url": "http://localhost:3003/mcp" }
     }
   }
   ```

   Claude Desktop（`claude_desktop_config.json`，经 `mcp-remote` 桥接）：

   ```json
   {
     "mcpServers": {
       "auto-ontology": {
         "command": "npx",
         "args": ["mcp-remote", "http://localhost:3003/mcp"]
       }
     }
   }
   ```

   改完重启客户端，按提示登录。

10. 选对工具：就绪检查 `check_readiness`；查术语 `search_terms`、`get_term`、`get_term_columns`、`get_term_sql_attributes`、`get_sql_attribute`、`describe_table`；可回答性 `check_answerable`；提问 `ask_question`（返回答案、SQL、行）。在写 SQL 之前先调 `check_answerable`，是这套做法里最值得照抄的一条纪律。

11. 或用 REST：在用户菜单 → **API Tokens** 里签发 token，然后：

   ```bash
   curl -N http://localhost:3000/api/chat/completions \
     -H "x-api-key: $AUTO_ONTOLOGY_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"question": "How many orders shipped last week?"}'
   ```

   响应是 SSE 流：`result` 事件带答案，`data: [DONE]` 结束。Python 客户端示例（原文给出）：

   ```python
   import json
   import os

   import requests

   response = requests.post(
       "http://localhost:3000/api/chat/completions",
       headers={"x-api-key": os.environ["AUTO_ONTOLOGY_API_TOKEN"]},
       json={"question": "How many orders shipped last week?"},
       stream=True,
       timeout=900,
   )
   response.raise_for_status()

   for line in response.iter_lines(decode_unicode=True):
       if not line or not line.startswith("data:"):
           continue
       payload = line.removeprefix("data:").strip()
       if payload == "[DONE]":
           break
       event = json.loads(payload)
       if event["type"] == "result":
           print(event["answer"]["response"])
           print(event["answer"]["sql_code"])
       elif event["type"] == "error":
           raise RuntimeError(event["message"])
   ```

### C. 配模型（前提：想换成本地 NIM 或任意 OpenAI 兼容端点）

12. 四个角色各由一组 triplet 环境变量控制，任何字段没设就回退到 `DEFAULT_MODELS_<FIELD>`，`*_API_KEY` 还兼容旧的 `NVIDIA_API_KEY`：

    | 前缀 | 角色 |
    | --- | --- |
    | `DEFAULT_MODELS` | 共享默认，下面所有字段的回退目标 |
    | `REASONING` | 主对话 / NL-to-SQL，生成本体、写 SQL 与解释、判可回答性 |
    | `NON_REASONING` | 更轻的模型：意图识别、实体抽取、候选筛选、SQL 检查与修复 |
    | `EMBED` | 文本嵌入，**摄取与查询必须用同一个模型** |
    | `RERANK` | 检索流程与桥表 SQL 属性编译时的候选排序 |

    所以最简配置是只填 `DEFAULT_MODELS_ENDPOINT` / `DEFAULT_MODELS_API_KEY` / `DEFAULT_MODELS_MODEL`，再按需覆盖 `EMBED_MODEL`、`NON_REASONING_MODEL`。约束：模型要支持结构化输出；embedding 模型两端一致。

### D. 安全与数据边界（务必先做）

13. 端口 3001 和 3002 留在私有网络：后端直接信任前端转发的 `x-auto-ontology-user-id` 头，摄取服务（ingest/delete/reset/compile）自身没有任何鉴权；所有客户端走 3000。
14. 不要开 `KUMO_RFM_API_KEY`，除非已做数据审查——开启后预测类问题会把已连接的表上传到 KumoRFM（默认上限 `KUMO_MAX_TABLES` 20 张表，`KUMO_MAX_ROWS_PER_TABLE` 未设则不限行数）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**
- 从原始 schema、列画像、样本值出发，逐表抽取业务术语并映射到列；自动推断表间 join 和桥表；从查询历史里建议 SQL 属性——即「语义建模」这一通常由数据团队手工做的活可以先生成初稿。原文示例：一次编译 Wide World Importers 产出 31 个术语。
- 「可回答性判断」是一项容易被忽略、但可交给模型的工作：先判数据能不能回答问题，再决定要不要写 SQL。
- 答案自动附带 SQL、行数据、执行步骤与出处（provenance），把「核对」从人工翻库变成读一段可复查的推理。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
- 明确按角色分模型：重推理模型做本体生成、写 SQL 与解释、判可回答性；轻模型做意图、实体抽取、候选选择、SQL 检查与修复；embedding 做检索；rerank 做候选排序。这是「不要一个模型干所有事」的具体分工样例。
- 人机分工清晰：模型生成草案，人认证（certify）术语、描述、SQL 属性；认证后的内容才被当作可信定义复用。
- 接入方式分层：MCP 只读工具给通用 agent 客户端（Cursor / Claude Desktop），REST 给自有应用，Web UI 给人做认证。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
- 信息：数据源连接（10 种引擎）、schema 与列画像、样本值、查询历史；已有的语义模型可通过 Apache Ossie YAML 导入导出（`POST /api/model/import`、`POST /api/model/export`）。
- 工具与权限：推理端点（NVIDIA NIM 或 OpenAI 兼容）、Postgres + pgvector、API token、Better Auth 的 RBAC、可选 Vault 存连接凭据。
- 反馈：在 Chat 里用真实问题试、修正术语与 SQL 属性并认证——即「人给的修正」是这套系统必需的输入，而不是可选项。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
- 启动即摄取；编译在摄取后自动开始，完成时给出 ready 状态。
- 查询链路上的自动修复：过滤值或 SQL 校验失败时自动改写 SQL 重试。
- 事前拦截：`check_answerable` 覆盖率不足时主动说明「答不了」并请求澄清，而不是硬答。
- 原文宣称 "Learn: fold certified corrections and usage back into the ontology, so shared context improves with every question"——方向是使用反馈回流本体，但 README 未给具体机制或触发条件，属未展开部分。定时/事件触发的调度没有描述。

**5. 效果验证：怎样判断确实改善了结果**
- 每个答案都带 SQL 和 Steps，可直接对源库复核（示例答案 $588.80、3 条发票行、完整 join 路径）。
- `check_answerable` 给出可量化的覆盖度（示例 coverage 0.5，并指出没有术语覆盖 "ad spend"），可当作「拒答质量」的指标。
- 认证流程本身是一种验证：定义先被人确认，才被当作 certified 复用。
- 文本到 SQL 的基准（如 BIRD）被指向独立的 `ontology-sql-eval` 仓库——README 本身没给任何准确率数字。

## 与已有做法的关系（对照给出的清单条目）

- **Cursor（watch）**：原文给出了把外部上下文层接进 Cursor 的完整配置（`~/.cursor/mcp.json` 里一条 `url` 指向 `http://localhost:3003/mcp`），是「给 Cursor 补一个只读、带权限的领域上下文与查询工具」的可照抄样例，可作为 Cursor 条目从 watch 往上评估的证据之一。
- **Agent skills（adopt）**：仓库自带三个 skill——`nvidia-ontology-setup`（安装、连源、编译、证明就绪）、`nvidia-ontology-management`（查看、建模、认证、导入导出、发布）、`nvidia-ontology-query`（提问并校验 SQL、行和答案），入口是 `AGENTS.md`。这是一份「把复杂系统拆成三个可被编码 agent 执行的 skill」的现成结构，可作 Agent skills 条目的参照素材。
- 其余清单条目没有直接对应。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**有具体内容支撑的**：完整的 Docker Compose 启动路径与 `.env` 变量清单；模型四角色的 triplet 回退规则；MCP 的三种客户端配置；REST 的 curl 与 Python 流式解析代码；10 种数据源的连接方式；Ossie 导入导出端点；WWI 上一个跨 5 表 join 的问题的答案、SQL 与 Steps；一次编译产出 31 个术语；`check_answerable` 返回 coverage 0.5 的拒答示例。仓库指标：5609 stars、单日 +2050（热度，不代表质量）。

**只是作者主张、无量化证据的**："reliability gates agentic analytics"、"complements the semantic models customers already own"、"shared context improves with every question" 的学习闭环；没有任何准确率、召回率、拒答误判率、端到端耗时数据；benchmark 仅给出外部仓库链接。

**适用条件与风险**：
- 只覆盖结构化/表格数据的自然语言查询，不涉及文档检索、流程自动化等通用工作。
- 强依赖 NVIDIA NIM 端点（默认走 build.nvidia.com）或自建 OpenAI 兼容端点，需 key 与出网；嵌入模型必须在摄取与查询两端一致，否则检索失效。
- 部署偏重（5 个服务 + Postgres + 可选 Vault），本地至少要 Docker Compose 与 `uv`。
- 安全默认值不安全：摄取端点无鉴权、后端信任转发头、`.env` 里多个默认口令必须替换；Compose 会把 Postgres/pgAdmin/Web 发布到宿主机。
- 生态受限：项目**不接受外部 PR**（可提 issue 与集成请求），长期可维护性和二次开发要靠自己 fork。
- 数据外发风险：启用 KumoRFM 会把连接的表上传到托管服务。
- 文档有小的不一致：默认模型清单里 EMBED 写作 `nvidia/nemotron-3-embed-1b`，组件表里写作 `nvidia/nemotron-3.5-embed-1b`。以 `.env.example` 实际值为准，部署前先核对。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天到一天，不动生产）**
1. 只在一台开发机上按「具体做法 A」跑通 WWI 样例，确认 `Semantic compilation is ready`、示例问题能复现出带 SQL 和 Steps 的答案。
2. 准备 15–20 个你团队真实问过的问题作为题集，其中刻意混入 3–5 个「数据回答不了」的问题（如缺某类业务数据）。
3. 把数据库换成你自己的**只读副本**（先只连一个库、一两个 schema），重跑编译，人工过一遍生成的术语与 SQL 属性，只认证你确信正确的部分。
4. 接 MCP 到你日常用的客户端（Cursor 或 Claude Desktop），要求智能体先 `check_answerable` 再 `ask_question`。
5. 建基线：同一题集，用「把 schema 直接塞进提示词让模型写 SQL」的朴素做法跑一遍做对照。

**判断有没有改善的指标**
- 结果正确率：答案与人工核算一致的比例（这是主指标）。
- 拒答质量：`check_answerable` 对「答不了」的题目的拦截率，以及对「答得了」题目的误拒率。
- 一致性：同一指标换个问法多次提问，生成的 SQL 语义是否一致（复用 certified SQL 属性应显著提升）。
- 自愈能力：SQL 校验失败后自动修复并最终成功的比例、平均修复轮次。
- 人力成本：每个答案人工核对所需时间（有 SQL + Steps 应明显下降）。
- 可追责性：能给出出处/血缘的答案占比。

**升级/放弃判据**：若在只读副本上正确率与一致性明显优于基线、且人工核对时间下降，则扩到更多 schema 并走 Helm 进 K8s；若大部分错误来自术语/关系抽取而非模型能力，先补人工认证再评估；若关键场景是文档类或非结构化工作，直接放弃这套，选别的上下文方案。
