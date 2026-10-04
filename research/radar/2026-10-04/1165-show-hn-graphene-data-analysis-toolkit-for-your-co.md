# Show HN: Graphene – Data analysis toolkit for your coding agent

- 结论：**值得一试**。用一个只含本地 DuckDB 的小项目跑通 Graphene 的完整闭环（写 .gsql 语义模型 → 在 .md 页面里 select 查询 + 图表组件 → `npm exec graphene serve` 起服务让编码代理自主迭代），重点验证它能否让代理在少纠正次数下稳定产出可用报表；理由是 README 给出了可直接复制的模型/查询代码和明确的 CLI 启动方式，属于可照做的流程，但缺少从零安装的完整命令和任何效果数据，需小范围实测再决定是否纳入手册。
- 原文：https://github.com/graphene-data/graphene
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-04T07:55:21.870Z

## 是什么

Graphene 是一个面向编码智能体（coding agent）设计的“everything-as-code”数据分析框架，覆盖基于 SQL 的数据探索、可视化和报表。它把两样东西交给代理：

1. **语义层（semantic layer）**：即 Graphene SQL，在普通 SQL 之上加入 metrics（度量）和 modeled joins（建模连接），目的是让代理生成的查询更准确、指标口径统一。
2. **dashboard 文件类型**：即 Graphene markdown（.md 页面），用组件标签生成可视化，作者主张比让代理直接写 Python/JavaScript 更一致、更好看。

它本身是一个 CLI，通过 npm（或 pnpm、yarn）安装，可运行/编译 Graphene SQL 查询、在浏览器渲染页面、检查语法、打印截图。整个文档以 agent skill 的形式随 npm 包发布，因此代理不需要外部检索即可获得用法。数据源支持 Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck 和本地数据（via DuckDB）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：本机有 Node.js 与 npm/pnpm/yarn 之一；有一个受支持的数据源（本地文件可用 DuckDB，无需外部账号）；有一个编码代理（如 Claude Code 等，原文未指定具体代理）。

1. **准备一个项目目录**。项目可以是独立 repo，也可以是更大代码库（例如 dbt 项目）里的一个目录。
2. **安装 Graphene CLI**。原文只说明“can be installed via npm (or pnpm, yarn, etc.)”，未给出确切包名与安装命令，需按 /docs/setup.md 或 npm 上的包名执行（这是原文的信息缺口，不要凭空补命令）。
3. **创建新 Graphene 项目**。按文档 `/docs/setup.md` 走；或先跑官方示例项目：

```
https:// github.com/graphene-data/example-flights
```

4. **启动开发服务器**（包管理器按需替换）：

```bash
npm exec graphene serve
# 或
pnpm graphene serve
```

5. **定义语义模型**。在 `.gsql` 文件里声明表、维度、度量和连接关系，可直接照抄 README 示例的结构：

```sql
table orders (
  id BIGINT
  user_id BIGINT
  amount FLOAT
  status STRING

  join one users on user_id = users.id  -- many orders per user

  is_complete: status = 'Complete'      -- dimension (scalar expression)
  revenue: sum(amount)                  -- measure (agg expression)
  aov: revenue / count(*)               -- measures can compose
)

table users (
  id BIGINT
  name VARCHAR

  join many orders on id = orders.user_id
)
```

要点：`join one/many` 建立建模连接关系；冒号语法定义 dimension（标量表达式）与 measure（聚合表达式）；measure 之间可以互相组合（`aov: revenue / count(*)`）。

6. **写查询页面**。在 `.md` 文件里用 SQL 代码块查询，用组件标签渲染。查询时用点号遍历建模连接，不需要手写 JOIN，也不需要在 `from` 里写连接：

````md
```sql top_customers
select
  users.name as name,   -- Use the dot operator to traverse the modeled join relationship
  revenue               -- Invokes the measure
from orders             -- A join statement here is not needed
group by 1
order by 2 desc
limit 10
```

<BigValue data="orders" value="revenue" />
<BarChart data="top_customers" x="name" y="revenue" />
````

7. **让编码代理干活**。服务起来后，用提示词让代理做具体分析工作，原文给出的任务类型是：

```
answer a data question
build a dashboard
edit the model
```

8. **利用 CLI 的校验/反馈能力做闭环**：Graphene CLI 支持检查语法、渲染页面、打印截图。让代理在提交前先自检、看渲染结果、本地迭代。
9. **纳入版本控制与 CI**：把模型和页面文件放进 git，对关键 dashboard 跑测试，出问题时回滚代理的改动。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：把“回答数据问题、构建 dashboard、编辑语义模型”这类通常由 BI 工具和人完成的工作交给编码代理。原文强调“everything-as-code”，代理与业务代码/数据同处一个仓库时能获得上下文（FAQ：if your BI stack lives in a folder right next to the rest of your company's data and code，agent 能判断该分析什么、为什么重要），这是原先没想到交给代理的一类任务。
- **任务匹配**：适合的形态是「CLI + 编码代理 + 语义层 + md dashboard 文件」。理由：语义层提高查询准确性；dashboard 文件类型比裸 Python/JS 输出更一致；语言设计追求 token 效率和最小样板（design goals: token efficiency, agent ergonomics）；全部通过 CLI 控制、文档内置为 agent skill，便于代理使用。原文还提出与 React/Python notebook 路线的对比：后者最大问题是外观和口径不一致，甚至同一关键指标用不同公式计算。
- **条件供给**：需要——项目目录/repo（可用 git）、CLI 执行权限、数据源连接（支持 DuckDB 本地数据等多种源）、随 npm 包发布的 agent skill 文档（代理无需外部检索）、`.gsql` 模型文件与 `.md` 页面文件。原文明确要求使用 git 和编码代理（除非改用其托管的 Graphene Cloud，提供 Slack agent、MCP server、浏览器 SaaS）。
- **主动推进**：仅部分有依据。原文提到“continuous agents for self-healing codebases”，以及代理可“validate before running, view dashboards, and iterate locally”，但**没有给出**任何时间/事件/状态触发的具体机制或配置，无法据此设计主动推进流程。
- **效果验证**：仅有间接依据。CLI 提供语法检查（validate/check syntax）与截图（print screenshots），可作为代理产出的即时校验；“Run tests on mission-critical dashboards”“Revert agent mistakes”说明把 dashboard 纳入测试与版本控制来判断改动是否变坏；语义层把“EBITDA”这类指标固定为确定对象，可用于检查同一指标在不同页面是否一致。原文**没有给出任何量化成功指标**。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中没有相关条目。原文提到的对照对象是同类的 semantic layer 产品（如 Malloy / LookML，Graphene SQL 灵感来自 Malloy，但改以标准 SQL 形式实现）以及传统 BI 工具、React/Python notebook 自建方案，但这些都不在本次给出的清单条目中。

## 证据与局限

**原文给出的可核实内容**：
- 可直接复制的 `.gsql` 模型定义示例与 `.md` 页面查询+图表示例。
- 明确的 CLI 使用方式：`npm exec graphene serve`（含 pnpm 等变体）。
- 支持的数据源清单：Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck、本地 DuckDB。
- 能力清单：CLI 可运行/编译查询、渲染页面、检查语法、打印截图；Graphene SQL 遵循 ANSI 并支持 170+ 函数；页面支持 HTML/CSS/JS/ECharts 能表达的任何内容。
- 许可：Elastic License 2.0，内部使用永久免费，做商用应用需联系。
- 社区热度：Hacker News 30 points、9 comments（样本很小）。

**只是作者主张、未被数据支撑的部分**：
- “build visualizations 10x faster”“raises the floor so that pages look beautiful by default”“beats traditional BI”等性能/质量断言，均无基准测试或用户数据。
- “more accurate queries”“more consistent and polished visuals”——为设计目标陈述，非实测结论。

**信息缺口与局限**：
- 从零安装的确切命令、setup 文档正文未在原文中给出，只能依赖 `/docs/setup.md`。
- 未说明如何配置数据源凭据、如何限定代理权限、如何回滚，也未给出任何触发式/定时任务的配置。
- 无成本、token 消耗、准确率、生成速度等任何量化证据。
- 强前置条件：默认要求使用 git + 编码代理；不想用代理的人必须转向其托管服务。Elastic License 2.0 对商业再分发有限制。

## 怎么试、怎么验证

**最小试用方式**（半天内可完成）：
1. 不接公司数据源，先用本地 DuckDB + 官方 demo 项目（example-flights），跑通 `graphene serve` 与页面渲染，确认代理能读懂随包的 agent skill。
2. 把一个小型真实数据集接入为 `.gsql` 模型，只定义 2–3 个 dimension 和 2–3 个 measure（其中至少一个像 `aov` 这样由其他 measure 组合而成），验证点号遍历建模连接是否真的免写 JOIN。
3. 让编码代理完成三个任务：回答一个数据问题、新建一个含至少一个 BigValue 和一个 BarChart 的 `.md` 页面、修改一次模型定义。全程记录代理是否需要人类纠正。

**判断有没有改善的指标**：
- 代理首次生成查询的语法检查通过率，与让它直接写等价裸 SQL 相比需要几轮修正。
- 同一个指标（如 revenue / aov）在 ≥2 个页面上是否算出同一数值（验证语义层是否真的统一了口径）。
- 生成一个可用 dashboard 所需的对话轮次与 token 消耗，与让它写 Python/JS 方案相比。
- 代理产出的页面中需要人工手工调整样式/布局的比例。
- 修改模型后，旧页面是否自动跟随更新而不需逐页改（体现“promote/demote logic into or out of the semantic layer”的价值）。

以上指标若明显优于现有做法，再考虑写入手册；若差异不明显，则退回 study。
