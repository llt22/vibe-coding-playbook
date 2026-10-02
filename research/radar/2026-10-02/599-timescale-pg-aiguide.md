# timescale/pg-aiguide

- 结论：**值得一试**。按 README 给出的命令给 AI 编码助手装上 pg-aiguide 的 Postgres 技能与文档 MCP，然后用它的开/关对照法在一个真实 Postgres schema 任务上小范围验证收益。理由是安装与配置步骤完整可直接照做、覆盖多种主流 agent，但效果证据只有厂商自己的一次演示，尚不足以直接 adopt。
- 原文：https://github.com/timescale/pg-aiguide
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T08:28:30.929Z

## 是什么

pg-aiguide 是 Timescale（TigerData）开源的、面向 AI 编码助手的 PostgreSQL 知识包，用来让 agent 生成更靠谱的 Postgres 代码。它由三部分组成：

1. **语义检索**：对官方 PostgreSQL 手册（按版本区分）、TimescaleDB、PostGIS 文档做检索，通过一个公共 MCP server 暴露（`search_docs`）。
2. **AI 优化的「技能」（skills）**：把有倾向性的 Postgres 最佳实践固化成 agent 可自动调用的技能，覆盖既有 schema/对象探查、schema 设计、索引策略、数据类型、数据完整性与约束、命名规范、性能调优、现代 Postgres 特性。
3. **扩展生态文档**：目前支持 TimescaleDB（文档+技能）与 PostGIS（文档），pgvector 标注为 coming soon。

三种接入形态：Agent Skills（`npx skills`，声称兼容 Claude Code、Cursor、Codex、Gemini CLI、VS Code 等 40+ agent）、公共 MCP server（任意支持 MCP 的 agent）、Claude Code 插件。许可证 Apache 2.0，README 标注 1853 stars。

## 具体做法

### 步骤 1：安装技能（前提：本机可用 `npx`，目标 agent 支持 Agent Skills）

装 Postgres 最佳实践技能：

```bash
npx skills add timescale/pg-aiguide --skill postgres
```

装用来调查既有数据库的 schema 探查技能：

```bash
npx skills add timescale/pg-aiguide --skill schema-exploration
```

交互式挑选单个技能：

```bash
npx skills add timescale/pg-aiguide
```

### 步骤 2：接入 MCP server（前提：agent 支持 MCP）

公共端点：`https://mcp.tigerdata.com/docs`，通用 JSON 配置：

```json
{
  "mcpServers": {
    "pg-aiguide": {
      "url": "https://mcp.tigerdata.com/docs"
    }
  }
}
```

按环境分别配置：

Claude Code（插件方式，同时带上 skills 与 MCP）：

```bash
claude plugin marketplace add timescale/pg-aiguide
claude plugin install pg@aiguide
```

Codex：

```bash
codex mcp add --url "https://mcp.tigerdata.com/docs" pg-aiguide
```

Gemini CLI：

```bash
gemini mcp add -s user pg-aiguide "https://mcp.tigerdata.com/docs" -t http
```

Cursor（写入 `.cursor/mcp.json`，或使用 README 提供的一键安装链接）：

```json
{
  "mcpServers": {
    "pg-aiguide": {
      "url": "https://mcp.tigerdata.com/docs"
    }
  }
}
```

Windsurf（写入 `~/.codeium/windsurf/mcp_config.json`，注意这里字段名是 `serverUrl`）：

```json
{
  "mcpServers": {
    "pg-aiguide": {
      "serverUrl": "https://mcp.tigerdata.com/docs"
    }
  }
}
```

OpenCode（写入 `~/.config/opencode/opencode.json` 或项目级 `opencode.json`，并在提示词里加 `use pg-aiguide`）：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "pg-aiguide": {
      "type": "remote",
      "url": "https://mcp.tigerdata.com/docs"
    }
  }
}
```

VS Code：

```bash
code --add-mcp '{"name":"pg-aiguide","type":"http","url":"https://mcp.tigerdata.com/docs"}'
```

VS Code Insiders 把 `code` 换成 `code-insiders`。README 还提供 Cursor / VS Code / Visual Studio / Goose / LM Studio 的一键安装徽章链接。

### 步骤 3：用具体任务触发它

安装后可直接提 Postgres 问题或让它设计 schema。README 给的示例提示词（可原样复制）：

简单：

```
Create a Postgres table schema for storing usernames and unique email addresses.
```

复杂：

```
You are a senior software engineer. You are given a task to generate a Postgres schema for an IoT device company.
The devices collect environmental data on a factory floor. The data includes temperature, humidity, pressure, as
the main data points as well as other measurements that vary from device to device. Each device has a unique id
and a human-readable name. We want to record the time the data was collected as well. Analysis for recent data
includes finding outliers and anomalies based on measurements, as well as analyzing the data of particular devices for ad-hoc analysis. Historical data analysis includes analyzing the history of data for one device or getting statistics for all devices over long periods of time.
```

### 步骤 4：用 README 演示的 A/B 法自测（原文提供的验证提示词）

```
Please describe the schema you would create for an e-commerce website two times, first with the tiger mcp server disabled, then with the tiger mcp server enabled. For each time, write the schema to its own file in the current working directory. Then compare the two files and let me know which approach generated the better schema, using both qualitative and quantitative reasons. For this example, only use standard Postgres.
```

## 对应的研究问题

- **能力发现**：把「写 Postgres DDL / 设计 schema」这类以往靠人手写加人工复核的活交给编码 agent，并在提示词里点名用 pg-aiguide 的 MCP 工具。README 声称装与不装差距明显（见证据部分），属于「原本没想到交给 AI」的一类候选任务。
- **任务匹配**：明确匹配「Postgres 相关的 schema 设计、索引与约束设计、既有库探查、版本特性使用」。协作方式上给了两种：技能（由 agent 自动加载的最佳实践）与 MCP 文档检索（按需语义/关键词检索）。兼容 Claude Code、Cursor、Codex、Gemini CLI、VS Code 等 40+ agent。
- **条件供给**：需要提供的是领域知识与文档入口——版本化的官方手册、最佳实践技能、扩展（TimescaleDB/PostGIS）文档，以及允许 agent 调用外部 MCP 服务。README 未涉及权限、写操作或反馈机制的配置。
- **主动推进**：依据很弱。只有「技能会被 AI agent 自动使用」这一说法，没有讲时间、事件或状态触发的持续运行。
- **效果验证**：给了可复用的对照方法——同一提示词，先关掉 MCP 生成一份、再打开生成一份，各自写文件，然后从定性和定量两方面比较。这是本线索里最可直接迁移的部分。

## 与已有做法的关系

- **Claude Code（adopt）**：pg-aiguide 提供专门的插件市场与安装命令，是把外部知识接进 Claude Code 的一条现成路径。
- **Agent skills（adopt）**：pg-aiguide 用 `npx skills` 分发技能，是 Agent Skills 机制的一个具体实例，可作为「如何为某个领域写/装技能」的样例。
- **Cursor（watch）/ goose（watch）/ OpenCode（watch）**：README 分别给出了 `.cursor/mcp.json`、`~/.codeium/windsurf/mcp_config.json`、`opencode.json`、`code --add-mcp` 等 MCP 接入写法，可作为这些工具接入第三方 MCP 的配置参考。

## 证据与局限

**原文给出的数据/案例**：一个 e-commerce schema 演示（含视频与文字转录），与关闭 MCP 时相比，结果被总结为「约束多 4 倍」「索引多 55%（含 partial/expression 索引）」「采用 PG17 推荐模式」「使用现代特性 `GENERATED ALWAYS AS IDENTITY`、`NULLS NOT DISTINCT`」「命名与文档更整洁」。

**只是作者主张的部分**：以上数字来自厂商自己的一次演示，没有任务集、没有多次重复、没有第三方复核，也没有说明「更好」的判定细则；「dramatically better」「more robust, performant, maintainable」属于宣传性表述。1853 stars 只说明关注度，不构成效果证据。README 未说明公共 MCP 服务的可用性保证、速率限制与数据隐私（查询内容会发送到 Timescale 托管的端点）。

**适用条件**：只在 Postgres / TimescaleDB / PostGIS 相关任务上有用；需要 agent 支持 Agent Skills 或 MCP；README 未说明是否支持本地自建（只在 DEVELOPMENT.md 里提到本地运行 MCP server，本次未读到该文件）。若团队不允许把 schema 信息发往第三方端点，需要先评估或改为自建。

## 怎么试、怎么验证

**最小试用**：选一个团队里真实但不紧急的 Postgres schema 设计或重构任务（不要用线上迁移做首次试验）。先用 README 的 A/B 提示词跑一次：关闭 pg-aiguide 生成一份 DDL，打开后再生成一份，两份都落到文件，再让 agent（或人）做逐项对比。若结果正向，再在日常会话里长期开启 MCP 与 `postgres` 技能。

**判断有没有改善的指标**（前两项来自原文演示的对比维度，其余为可自行设计的复核项）：

1. 约束数量（NOT NULL / CHECK / 唯一约束 / 外键）；
2. 索引数量与类型，特别是 partial 与 expression 索引；
3. 是否使用了与目标 PG 版本匹配的现代语法（如 `GENERATED ALWAYS AS IDENTITY`、`NULLS NOT DISTINCT`）；
4. 人工 review 的返工次数与修改条数；
5. DDL 应用后是否需要补加索引或补约束（生产环境事后返工率）；
6. 对同一版本问题，答案是否与官方手册一致（可用 MCP 的 `search_docs` 交叉核对）。

**注意**：单次 A/B 结果受提示词与模型随机性影响很大，建议同一任务重复 3 次以上、或换 2–3 个任务再下结论，避免把一次演示当成稳定收益。
