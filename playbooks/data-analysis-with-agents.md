# 让编码 agent 产出可复用的数据分析报表

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何让编码 agent 在数据仓库上稳定产出可复用的数据分析报表和 dashboard，而不是每次重写不一致的 Python/JS 脚本。
> 先试这一步：先用本地 DuckDB + Graphene 官方示例项目跑通 `npm exec graphene serve` 和页面渲染，再让 agent 完成一个数据问题、一个 dashboard、一次模型修改。
> 最近修订：2026-10-04

## 解决什么问题
编码 agent 能做数据分析，但直接让它写 Python/JS 或裸 SQL 容易导致外观和指标口径不一致，甚至同一关键指标用不同公式计算。Graphene 提供“everything-as-code”的数据分析框架：用 .gsql 语义层定义 metrics 和 modeled joins，用 .md 页面写 SQL 查询和图表组件，通过 CLI 启动服务，让编码 agent 在本地迭代、自检、产出报表。这篇手册解决如何用这套流程让 agent 稳定产出可复用的数据分析报表和 dashboard。

注意：调研报告结论是“需小范围实测再决定是否纳入手册”，因此本篇是待验证的操作方法，不是已验证的最佳实践。

## 适用与不适用
适用：你有一个受支持的数据源（Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck 或本地 DuckDB）；你已经在用编码代理（如 Claude Code 等，原文未指定具体代理）；你希望把数据分析和业务代码放在同一个仓库里，让代理获得上下文；你愿意把模型和页面文件纳入 git 和 CI。

不适用：你不想使用编码代理（原文说除非改用其托管的 Graphene Cloud，提供 Slack agent、MCP server、浏览器 SaaS）；你需要从零安装的确切命令和完整 setup 文档（原文未给出）；你需要量化效果数据再决定是否采用（原文没有任何量化成功指标）；你要做商业再分发（Elastic License 2.0，内部使用永久免费，做商用应用需联系）。

## 前置条件
- 本机有 Node.js 与 npm/pnpm/yarn 之一。
- 有一个受支持的数据源；本地文件可用 DuckDB，无需外部账号。
- 有一个编码代理（原文未指定具体代理）。
- 有一个项目目录（可以是独立 repo，也可以是更大代码库里的一个目录）。
- 使用 git 和编码代理是原文明确要求（除非改用其托管 Graphene Cloud）。

## 操作步骤
1. 先用本地 DuckDB + 官方示例项目跑通最小闭环，不接公司数据源。
   - 克隆官方示例项目：`https://github.com/graphene-data/example-flights`
   - 按 `/docs/setup.md` 安装依赖（原文未给出确切安装命令，不要凭空补）。
   - 启动开发服务器：
     ```bash
     npm exec graphene serve
     # 或
     pnpm graphene serve
     ```
   - 预期结果：服务起来，能在浏览器中看到示例页面渲染。确认代理能读懂随 npm 包发布的 agent skill 文档（代理无需外部检索即可获得用法）。

2. 准备一个项目目录。独立 repo 或更大代码库（例如 dbt 项目）里的一个目录。

3. 安装 Graphene CLI。原文只说明“can be installed via npm (or pnpm, yarn, etc.)”，未给出确切包名与安装命令。按 `/docs/setup.md` 或 npm 上的包名执行。这是原文的信息缺口，不要凭空补命令。

4. 创建新 Graphene 项目。按文档 `/docs/setup.md` 走；或继续使用官方示例项目。

5. 定义语义模型。在 `.gsql` 文件里声明表、维度、度量和连接关系。可直接照抄 README 示例的结构：
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

6. 写查询页面。在 `.md` 文件里用 SQL 代码块查询，用组件标签渲染。查询时用点号遍历建模连接，不需要手写 JOIN，也不需要在 `from` 里写连接：
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

7. 让编码代理干活。服务起来后，用提示词让代理做具体分析工作。原文给出的任务类型是：
```
answer a data question
build a dashboard
edit the model
```

8. 利用 CLI 的校验/反馈能力做闭环。Graphene CLI 支持检查语法、渲染页面、打印截图。让代理在提交前先自检、看渲染结果、本地迭代。

9. 纳入版本控制与 CI。把模型和页面文件放进 git，对关键 dashboard 跑测试，出问题时回滚代理的改动。

## 怎么判断变好了
最小试用方式（半天内可完成）：
1. 不接公司数据源，先用本地 DuckDB + 官方 demo 项目（example-flights），跑通 `graphene serve` 与页面渲染，确认代理能读懂随包的 agent skill。
2. 把一个小型真实数据集接入为 `.gsql` 模型，只定义 2–3 个 dimension 和 2–3 个 measure（其中至少一个像 `aov` 这样由其他 measure 组合而成），验证点号遍历建模连接是否真的免写 JOIN。
3. 让编码代理完成三个任务：回答一个数据问题、新建一个含至少一个 BigValue 和一个 BarChart 的 `.md` 页面、修改一次模型定义。全程记录代理是否需要人类纠正。

可观察的指标：
- 代理首次生成查询的语法检查通过率，与让它直接写等价裸 SQL 相比需要几轮修正。
- 同一个指标（如 revenue / aov）在 ≥2 个页面上是否算出同一数值（验证语义层是否真的统一了口径）。
- 生成一个可用 dashboard 所需的对话轮次与 token 消耗，与让它写 Python/JS 方案相比。
- 代理产出的页面中需要人工手工调整样式/布局的比例。
- 修改模型后，旧页面是否自动跟随更新而不需逐页改（体现“promote/demote logic into or out of the semantic layer”的价值）。

试多久：最小试用半天内可完成。以上指标若明显优于现有做法，再考虑写入手册；若差异不明显，则退回 study。

## 常见坑
- 原文未给出从零安装的确切命令、setup 文档正文，只能依赖 `/docs/setup.md`。不要凭空补安装命令。
- 原文未说明如何配置数据源凭据、如何限定代理权限、如何回滚，也未给出任何触发式/定时任务的配置。
- 原文无成本、token 消耗、准确率、生成速度等任何量化证据。作者主张的“build visualizations 10x faster”“raises the floor so that pages look beautiful by default”“beats traditional BI”等均无基准测试或用户数据。
- “more accurate queries”“more consistent and polished visuals”为设计目标陈述，非实测结论。
- 强前置条件：默认要求使用 git + 编码代理；不想用代理的人必须转向其托管服务。
- Elastic License 2.0 对商业再分发有限制。
- 社区热度仅 Hacker News 30 points、9 comments，样本很小。
- 不要跳过最小试用直接接入关键业务数据。

## 证据与来源
本篇依据调研报告《Show HN: Graphene – Data analysis toolkit for your coding agent》。

可核实内容（来自原文）：
- 可直接复制的 `.gsql` 模型定义示例与 `.md` 页面查询+图表示例（已放入操作步骤）。
- 明确的 CLI 使用方式：`npm exec graphene serve`（含 pnpm 等变体）。
- 支持的数据源清单：Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck、本地 DuckDB。
- 能力清单：CLI 可运行/编译查询、渲染页面、检查语法、打印截图；Graphene SQL 遵循 ANSI 并支持 170+ 函数；页面支持 HTML/CSS/JS/ECharts 能表达的任何内容。
- 许可：Elastic License 2.0，内部使用永久免费，做商用应用需联系。
- 社区热度：Hacker News 30 points、9 comments（样本很小）。

只是作者主张、未被数据支撑的部分：
- “build visualizations 10x faster”“raises the floor so that pages look beautiful by default”“beats traditional BI”等性能/质量断言，均无基准测试或用户数据。
- “more accurate queries”“more consistent and polished visuals”——为设计目标陈述，非实测结论。

信息缺口与局限：
- 从零安装的确切命令、setup 文档正文未在原文中给出，只能依赖 `/docs/setup.md`。
- 未说明如何配置数据源凭据、如何限定代理权限、如何回滚，也未给出任何触发式/定时任务的配置。
- 无成本、token 消耗、准确率、生成速度等任何量化证据。
- 强前置条件：默认要求使用 git + 编码代理；不想用代理的人必须转向其托管服务。Elastic License 2.0 对商业再分发有限制。

## 依据的调研

- [Show HN: Graphene – Data analysis toolkit for your coding agent](../research/radar/2026-10-04/1165-show-hn-graphene-data-analysis-toolkit-for-your-co.md)：值得一试，用一个只含本地 DuckDB 的小项目跑通 Graphene 的完整闭环（写 .gsql 语义模型 → 在 .md 页面里 select 查询 + 图表组件 → `npm exec graphene serve` 起服务让编码代理自主迭代），重点验证它能否让代理在少纠正次数下稳定产出可用报表；理由是 README 给出了可直接复制的模型/查询代码和明确的 CLI 启动方式，属于可照做的流程，但缺少从零安装的完整命令和任何效果数据，需小范围实测再决定是否纳入手册。
