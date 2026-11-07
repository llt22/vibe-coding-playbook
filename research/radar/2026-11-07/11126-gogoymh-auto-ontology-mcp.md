# gogoymh/auto-ontology-mcp

- 结论：**值得一试**。建议小范围试用：把 auto-ontology-mcp 作为 MCP 服务器接入 Claude Code/Cursor 等客户端，先用内置 demo 库跑通“建模—问数—校验—拒答”流程，再决定是否接入真实只读库或个人知识库。理由是原文给出了可直接复制的安装命令、客户端配置、工具调用序列和验证示例，但缺少独立效果数据，且配置有一定环境要求。
- 原文：https://github.com/gogoymh/auto-ontology-mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-07T01:18:18.623Z

## 是什么

`auto-ontology-mcp` 是一个把语义层（ontology）接入任意 MCP 客户端的服务器。它让用户已有的模型（Claude Code、Codex、OpenClaw、Hermes、Cursor、VS Code、Claude/ChatGPT 应用）负责读文档、抽实体、命名、判断和写 SQL，服务器负责确定性的工作：扫描数据库、剖析字段、推断键、校验 SQL、存储和只读执行。它有两个用途：一是“问数据库”，通过 Term、关系、SQL 属性和 `validate_sql` 减少 text-to-SQL 的静默错误；二是“个人知识库”，把收据、账单、论文、笔记等读成带类型和来源的记录/概念，之后可查询、引用和导出为 Obsidian vault。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提：安装 `uv`**。原文要求 `uv` 可用，否则无法用 `uvx` 启动。

2. **创建并注册 demo 数据库**（可选，但建议先跑 demo）：

```bash
uvx --from git+https://github.com/gogoymh/auto-ontology-mcp auto-ontology-mcp demo
```

原文说明 demo 是一个合成零售库（11 张表，3200 条订单）。

3. **把 MCP 服务器接入客户端**。以 Claude Code 为例：

```bash
claude mcp add auto-ontology -- uvx --from git+https://github.com/gogoymh/auto-ontology-mcp auto-ontology-mcp
```

Cursor 写入 `~/.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "auto-ontology": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/gogoymh/auto-ontology-mcp", "auto-ontology-mcp"]
    }
  }
}
```

VS Code 写入 `.vscode/mcp.json`：

```json
{
  "servers": {
    "auto-ontology": {
      "type": "stdio",
      "command": "uvx",
      "args": ["--from", "git+https://github.com/gogoymh/auto-ontology-mcp", "auto-ontology-mcp"]
    }
  }
}
```

Claude Desktop 写入 `claude_desktop_config.json` 并重启：

```json
{
  "mcpServers": {
    "auto-ontology": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/gogoymh/auto-ontology-mcp", "auto-ontology-mcp"]
    }
  }
}
```

Codex CLI 写入 `~/.codex/config.toml`：

```toml
[mcp_servers.auto-ontology]
command = "uvx"
args = ["--from", "git+https://github.com/gogoymh/auto-ontology-mcp", "auto-ontology-mcp"]
```

OpenClaw 用：

```bash
openclaw mcp set auto-ontology '{"command":"uvx","args":["--from","git+https://github.com/gogoymh/auto-ontology-mcp","auto-ontology-mcp"]}'
openclaw mcp list
```

Hermes Agent 写入 `~/.hermes/config.yaml`，然后 `/reload-mcp`：

```yaml
mcp_servers:
  auto_ontology:
    command: "uvx"
    args: ["--from", "git+https://github.com/gogoymh/auto-ontology-mcp", "auto-ontology-mcp"]
```

ChatGPT / claude.ai 远程连接需要 HTTP 传输和隧道：

```bash
uvx --from git+https://github.com/gogoymh/auto-ontology-mcp auto-ontology-mcp \
  serve --transport http --port 8765 --token "$(openssl rand -hex 24)"
cloudflared tunnel --url http://127.0.0.1:8765      # 或 ngrok http 8765
```

然后把 `https://<tunnel-host>/<token>/mcp` 加为自定义 connector。原文提示 ChatGPT 写工具需要在开发者模式添加 connector。

4. **按顺序发出提示词，跑通 demo**：

```text
1. "Use auto-ontology to build the ontology for the demo datasource: review the proposed joins, model every table, then save useful SQL attributes."（或选 build_ontology 提示词）
2. "Which states brought in the most delivered revenue in 2024?"
3. "What was return on ad spend last quarter?"  预期回答应是数据无法回答
4. 附上一张收据、账单或书摘，说 "Remember this."（或选 remember 提示词）
5. "Export my knowledge base for Obsidian."  产物写到 ~/.auto-ontology-mcp/wiki/knowledge
```

5. **接入自己的数据库**（只读账号）：

```bash
uvx --from git+https://github.com/gogoymh/auto-ontology-mcp --with "psycopg[binary]" auto-ontology-mcp \
  add shop "postgresql+psycopg://readonly_user:pass@host:5432/db" --schemas sales,geo
```

原文提醒客户端配置的 `args` 里也要加同样的 `--with`，服务器才能加载驱动。任何 SQLAlchemy URL 都可以，SQLite 内置，PostgreSQL 用 `psycopg[binary]`，MySQL 用 `pymysql`，DuckDB 用 `duckdb-engine`。

6. **个人知识库用法**：第一次保存时自动创建 `~/.auto-ontology-mcp/knowledge.sqlite`。让模型调用 `define_entity`、`add_records`、`save_concept`，每条记录带 `source`（标题、类型、locator、quote）。示例结构：

```text
Entity Receipt: paid_on date required, merchant ref:Merchant, category, total_krw integer
Concept Spaced Repetition: is_a Learning Technique, related_to Forgetting Curve
Source: IMG_2041.jpg, line 3; Make It Stick, ch. 2
```

7. **用 SQL 查询知识库**：模型先 `check_answerable`，再 `run_sql`，再 `get_source` 给出处。原文示例查询：

```sql
SELECT SUM(total_krw) FROM receipts
WHERE category = 'Eating Out' AND paid_on LIKE '2026-10-%'
```

8. **导出 Obsidian**：

```bash
uvx --from git+https://github.com/gogoymh/auto-ontology-mcp auto-ontology-mcp export-wiki -o ~/vault/ontology
```

或让模型调用 `export_wiki`。原文提醒 vault 是单向视图，Obsidian 里的编辑不会回读。

9. **安全配置建议**：使用只读数据库账号；共享机器上设 `AUTO_ONTOLOGY_ALLOW_DATASOURCE_TOOLS=0`，只允许 CLI 添加数据源；注意数据源 URL（含密码）以明文存在 `~/.auto-ontology-mcp/ontology.db`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现：AI 已经能做哪些还没想到交给它的工作**：原文把“让 AI 先检查问题是否可回答，再生成并校验 SQL”作为明确能力；还给出“把收据/笔记变成带类型、带来源的记录和概念，之后用 SQL 汇总”的用法。这些是模型在 MCP 工具约束下可以承担的工作。
- **任务匹配：什么工作适合怎样的模型、工具和协作方式**：原文明确适合“需要精确数字、可追溯来源的数据库问答”和“个人知识库的持续沉淀”。模型负责语义判断（命名、抽实体、写 SQL），服务器负责确定性校验和只读执行。适合 Claude Code、Cursor、VS Code、Claude Desktop、ChatGPT 等 MCP 客户端。
- **条件供给：需要提供哪些信息、工具、权限和反馈**：需要提供数据库只读连接、`uv` 运行环境、MCP 客户端配置；需要给模型建模规则、表样例、键关系、术语同义词；反馈来自 `validate_sql` 的错误提示、`check_answerable` 的覆盖判断、`check_readiness` 的空概念/无来源记录统计。
- **主动推进：哪些工作可由时间、事件或状态触发并持续完成**：原文的“持续”体现在知识库可不断追加记录、运行查询后把验证过的问答存为 `save_example_query`、用 `review_ontology` 和 `check_readiness` 做定期检查；但没有给出定时任务或事件触发的具体配置，因此只能算“可由用户/代理反复调用”的持续沉淀，而非内置调度。
- **效果验证：怎样判断确实改善了结果**：原文用 demo 示例展示 `validate_sql` 拒绝错误 join、提示近义值大小写、识别不可回答的问题；还给出 demo 扫描结果（9 个未声明外键，7 个自动接受，1 个建议复核，1 个未链接）。这些可以作为验证指标：错误 join 被拦截次数、不可回答问题被正确拒答比例、回答是否带来源。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）**：原文给出了 `claude mcp add` 一行命令，是最直接的接入方式之一。
- **Cursor（watch）**：原文给出 `~/.cursor/mcp.json` 配置和一键安装链接，可作为观察/试用对象。
- **Hermes（watch）**：原文给出 `~/.hermes/config.yaml` 配置和 `/reload-mcp` 步骤，工具名带 `mcp_auto_ontology_` 前缀。
- **OpenClaw（watch）**：原文给出 `openclaw mcp set` 注册命令，并说明工具会出现在 OpenClaw 的编码和消息工具配置中。
- **Obsidian（drop）**：原文把 Obsidian 作为 `export_wiki` 的查看器，导出 vault 含别名、`[[links]]` 和图视图；但明确说这是单向视图，Obsidian 内编辑不回读。与清单中 Obsidian 的 drop 状态一致：它只是输出端，不是核心做法。

清单中没有与“auto-ontology-mcp 语义层服务器”直接对应的条目；它更像是给已有 MCP 客户端补一个语义/知识层。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

原文给出了 demo 数据库的规模（11 张表、3200 条订单）、示例问数流程的真实工具调用与输出（营收 316.8、4 条订单行；ROAS 被判断为 partially_answerable，覆盖度 0.33）、以及 demo 扫描结果（9 个未声明外键，7 个自动接受，1 个建议复核，1 个未链接）。还有 `tests/test_knowledge.py` 中的知识库会话示例。

但以下内容主要是作者主张，缺少独立评估：text-to-SQL 的常见错误表、接入后能“明显减少静默错误”、个人知识库比 markdown wiki 更可信等。原文没有给出对比实验、准确率、用户研究或生产环境数据。

适用条件：需要 `uv`；需要 MCP 客户端；接真实库时要用只读账号；数据源 URL 明文存储，共享机器需额外限制；搜索是词法匹配，不是向量检索，需要自己补同义词；Obsidian 导出是单向的；知识库是单用户本机存储，需手动备份 `~/.auto-ontology-mcp`。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式**：先在 demo 数据库上跑通，不动真实数据。步骤：安装 `uv` → 运行 `auto-ontology-mcp demo` → 把 MCP 服务器加到 Claude Code 或 Cursor → 用 `build_ontology` 提示词让模型建模 → 问三个问题：一个能回答的营收问题、一个不可回答的 ROAS 问题、一个大小写/阈值陷阱问题 → 观察 `validate_sql` 是否拦截错误 join、是否提示近义值、是否拒答不可回答问题。再用一张收据或一段书摘试 `remember` 和 `get_source`。

**判断有没有改善的指标**：
- 错误 join 被 `validate_sql` 拦截的次数（对比无 ontology 时模型直接写 SQL 的错误率）。
- 不可回答问题被 `check_answerable` 正确拒答的比例。
- 回答是否附 SQL 和来源（记录/文件/locator/quote）。
- 同一问题重复提问时，已审核的 Term/示例查询是否让回答更稳定。
- 知识库记录是否有重复检测、批次校验失败时是否整批拒绝并列出问题。

如果 demo 上这些指标有改善，再考虑接入真实只读库；如果只是回答变长但没有减少错误，则降级为 study。
