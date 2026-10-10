# 让 AI 做数据分析：口径统一、结论可核对、动作可执行

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何让 AI（编码代理或 Claude Dashboard）在数据分析中产出可核对、可行动的结论，而不是口径不一致或无法落地的文字。
> 先试这一步：先用一份自己手头的小数据（如先导出 X 账号一个 Tab 的数据，或本地 DuckDB 官方示例项目）跑一遍最小流程，看 AI 能否给出带具体数字和可执行动作的结论，不要一上来就接入关键业务数据。
> 最近修订：2026-10-10

## 解决什么问题

编码 agent 能做数据分析，但直接让它写 Python/JS 或裸 SQL 容易导致外观和指标口径不一致，甚至同一关键指标用不同公式计算。另一种情况是，把数据交给 AI 分析后，得到一段读起来像样、但没有具体数字、也无法据此行动的结论。本篇给两套可照做的做法：做法 A 用 Graphene 的“everything-as-code”语义层，把 metrics 和 modeled joins 写成代码，通过 CLI 启动服务，让编码 agent 在本地迭代、自检、产出可复用的报表和 dashboard；做法 B 把 X 账号后台导出的数据作为附件上传到 Claude Artifacts 的 Dashboard，让 Claude 做账号复盘。两篇调研都建议先小范围实测，再决定是否纳入手册或固化进工作流。

## 适用与不适用

做法 A 适用：你有一个受支持的数据源（Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck 或本地 DuckDB）；你已经在用编码代理（如 Claude Code 等，原文未指定具体代理）；你希望把数据分析和业务代码放在同一个仓库里，让代理获得上下文；你愿意把模型和页面文件纳入 git 和 CI。

做法 A 不适用：你不想使用编码代理（原文说除非改用其托管的 Graphene Cloud，提供 Slack agent、MCP server、浏览器 SaaS）；你需要从零安装的确切命令和完整 setup 文档（原文未给出）；你需要量化效果数据再决定是否采用（原文没有任何量化成功指标）；你要做商业再分发（Elastic License 2.0，内部使用永久免费，做商用应用需联系）。

做法 B 适用：你有一个可用的 X（Twitter）账号，并且该账号能打开数据分析页；你有一个可访问 Artifacts 的 Claude 账号；你想做账号复盘（内容、互动、趋势），不想写 SQL 或搭语义层。

做法 B 不适用：你不愿把自己的账号数据上传给第三方服务（原文未讨论隐私影响）；你需要现成的分析提示词（原文提示词被截断，需要自己补）；你需要效果数据证明它比手动翻后台更好（原文未给）。

两套做法都不适用的情况：你需要定时或事件触发的自动运行（两篇原文均未涉及）；你需要明确的数据源凭据配置、代理权限限定或回滚方案（两篇原文均未说明）。

## 前置条件

- 做法 A：本机有 Node.js 与 npm/pnpm/yarn 之一；有一个受支持的数据源（本地文件可用 DuckDB，无需外部账号）；有一个编码代理（原文未指定具体代理）；有一个项目目录（可以是独立 repo，也可以是更大代码库里的一个目录）；使用 git 和编码代理是原文明确要求（除非改用其托管 Graphene Cloud）。
- 做法 B：一个可用的 X 账号并能访问 `https://x.com/i/account_analytics/overview`；一个可访问 Artifacts 的 Claude 账号（`https://claude.ai/artifacts`）；从 X 后台各 Tab 下载的数据文件。
- 共同：愿意先做小范围试用，再决定是否接入关键业务数据或固化流程。

## 操作步骤

### 做法 A：用 Graphene 语义层让编码 agent 做数据分析

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

### 做法 B：把 X 账号导出数据上传到 Claude Artifacts Dashboard

1. 前提：你有一个 X（Twitter）账号，并且该账号能打开数据分析页；你有一个可访问 Artifacts 的 Claude 账号。

2. 打开账号数据分析页：
   ```
   https://x.com/i/account_analytics/overview
   ```

3. 把该页面里每一个 Tab 能下载到的数据都下载下来（原文强调「每个 Tab」，即不要只取一个 Tab 的数据）。第一次试用可先只下一个 Tab，降低试错成本。

4. 打开 Claude 侧：
   ```
   https://claude.ai/artifacts
   ```
   新建一个 Dashboard。

5. 把第 3 步下载的数据文件作为附件上传到这个 Dashboard。

6. 发送提示词让 Claude 分析。原文此处只写了一个引用块标记「>」，提示词正文在采集时被截断，没有给出，这一步需要你自己写。最小试用时可先发一版朴素的提示词，例如：
   ```
   这是我 X 账号后台导出的数据。请先说明每一列/每个字段的含义和统计口径，
   然后找出 3 个最明显的变化趋势，每个趋势给出对应数字，
   最后给出 3 条我可以马上执行的具体动作。
   ```

7. 如果这一步输出可用，再把其余 Tab 的数据补齐重跑一次。

### 怎么选

- 需要长期复用、多人协作、统一口径、把分析纳入 git/CI：选做法 A。
- 只想快速复盘一个社交账号、不想写 SQL 或搭语义层：选做法 B。
- 两者可以先试 B 做一次轻量复盘，确认 AI 分析对自己有增量价值后，再评估是否投入 A 建语义层。反过来，如果已经在用编码代理，也可以先用 A 的最小闭环验证代理能不能稳定读模型、写页面。

## 怎么判断变好了

最小试用方式：

- 做法 A（半天内可完成）：①不接公司数据源，先用本地 DuckDB + 官方 demo 项目（example-flights），跑通 `graphene serve` 与页面渲染，确认代理能读懂随包的 agent skill。②把一个小型真实数据集接入为 `.gsql` 模型，只定义 2–3 个 dimension 和 2–3 个 measure（其中至少一个像 `aov` 这样由其他 measure 组合而成），验证点号遍历建模连接是否真的免写 JOIN。③让编码代理完成三个任务：回答一个数据问题、新建一个含至少一个 BigValue 和一个 BarChart 的 `.md` 页面、修改一次模型定义。全程记录代理是否需要人类纠正。
- 做法 B（第一次可先在一个 Tab 上试）：①先只下载一个 Tab 的数据，不做全量。②在 Claude Artifacts 新建 Dashboard，上传这一个文件。③用上面第 6 步的朴素提示词试跑。④如果这一步输出可用，再把其余 Tab 的数据补齐重跑一次。

可观察的指标：

- 做法 A：代理首次生成查询的语法检查通过率，与让它直接写等价裸 SQL 相比需要几轮修正；同一个指标（如 revenue / aov）在 ≥2 个页面上是否算出同一数值（验证语义层是否真的统一了口径）；生成一个可用 dashboard 所需的对话轮次与 token 消耗，与让它写 python/JS 方案相比；代理产出的页面中需要人工手工调整样式/布局的比例；修改模型后，旧页面是否自动跟随更新而不需逐页改（体现“promote/demote logic into or out of the semantic layer”的价值）。
- 做法 B：输出的结论里是否包含具体数字（而不是「有所增长」这类空话）；是否给出可执行动作（能直接照着改发布时间、内容类型、互动策略等）；与自己手动翻后台对比，得出结论所花的时间是否明显缩短；换一份数据（比如换时间段或换另一个 Tab）重跑，结论是否跟着数据变化——如果两次输出几乎一样，说明它没有真的在分析数据。

试多久：做法 A 的最小试用半天内可完成；做法 B 先一个 Tab、一次对话即可判断是否有增量价值。以上指标若明显优于现有做法，再考虑写入手册或固化进复盘习惯；若差异不明显，则退回 study。

## 常见坑

- 做法 A：原文未给出从零安装的确切命令、setup 文档正文，只能依赖 `/docs/setup.md`。不要凭空补安装命令。
- 做法 A：原文未说明如何配置数据源凭据、如何限定代理权限、如何回滚，也未给出任何触发式/定时任务的配置。
- 做法 A：原文无成本、token 消耗、准确率、生成速度等任何量化证据。作者主张的“build visualizations 10x faster”“raises the floor so that pages look beautiful by default”“beats traditional BI”等均无基准测试或用户数据；“more accurate queries”“more consistent and polished visuals”为设计目标陈述，非实测结论。
- 做法 A：强前置条件——默认要求使用 git + 编码代理；不想用代理的人必须转向其托管服务。Elastic License 2.0 对商业再分发有限制。社区热度仅 Hacker News 30 points、9 comments，样本很小。
- 做法 B：原文最关键的分析提示词被截断，需要自己补；没有给出任何分析结果、效果数据或案例。
- 做法 B：作者没有说明为什么这么用会比手动看后台更好，也没有给出任何量化收益。互动数据 37 点赞、1 转发、44 回复仅作热度参考，不构成效果证据。
- 做法 B：需要把自己的账号数据上传给第三方服务，原文未讨论隐私或数据规模上限；试用前先确认自己是否接受这一点。
- 共同：不要跳过最小试用直接接入关键业务数据。

## 证据与来源

做法 A 依据调研报告《Show HN: Graphene – Data analysis toolkit for your coding agent》。可核实的内容：可直接复制的 `.gsql` 模型定义示例与 `.md` 页面查询+图表示例（已放入操作步骤）；明确的 CLI 使用方式 `npm exec graphene serve`（含 pnpm 等变体）；支持的数据源清单（Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck、本地 DuckDB）；能力清单（CLI 可运行/编译查询、渲染页面、检查语法、打印截图；Graphene SQL 遵循 ANSI 并支持 170+ 函数；页面支持 HTML/CSS/JS/ECharts 能表达的任何内容）；许可 Elastic License 2.0，内部使用永久免费，做商用应用需联系；社区热度 Hacker News 30 points、9 comments（样本很小）。只是作者主张、未被数据支撑的部分：“build visualizations 10x faster”“raises the floor so that pages look beautiful by default”“beats traditional BI”等性能/质量断言，均无基准测试或用户数据；“more accurate queries”“more consistent and polished visuals”为设计目标陈述，非实测结论。信息缺口与局限：从零安装的确切命令、setup 文档正文未在原文中给出，只能依赖 `/docs/setup.md`；未说明如何配置数据源凭据、如何限定代理权限、如何回滚，也未给出任何触发式/定时任务的配置；无成本、token 消耗、准确率、生成速度等任何量化证据。强前置条件：默认要求使用 git + 编码代理；不想用代理的人必须转向其托管服务；Elastic License 2.0 对商业再分发有限制。

做法 B 依据调研报告《@dotey: 有个用 Claude Dashboard 的用法…》。原文给了的：两个具体 URL（`https://x.com/i/account_analytics/overview`、`https://claude.ai/artifacts`）、一个明确的操作顺序（下载各 Tab 数据 → 新建 Dashboard → 上传附件 → 发给 Claude 分析）。这些是可照做的部分。原文没给的：分析用的提示词正文（被截断，只剩一个「>」）；任何分析结果、效果数据或案例；作者没有说明为什么这么用会比手动看后台更好，也没有给出任何量化收益。只是主张的部分：「用 Claude Dashboard 分析 X 数据」能带来什么价值，原文没有论证，只能算一个用法主张。互动数据 37 点赞、1 转发、44 回复，仅作为热度参考，不构成效果证据。适用条件：需要有可用的 X 账号并能访问其数据分析页；需要能访问 Claude Artifacts；需要注意把自己的账号数据上传给第三方服务的隐私影响。原文未讨论隐私或数据规模上限。

两篇调研的共同点：都没有给出可复现的量化收益数据；都需要小范围实测再决定是否纳入长期工作流。

## 依据的调研

- [Show HN: Graphene – Data analysis toolkit for your coding agent](../research/radar/2026-10-04/1165-show-hn-graphene-data-analysis-toolkit-for-your-co.md)：值得一试，用一个只含本地 DuckDB 的小项目跑通 Graphene 的完整闭环（写 .gsql 语义模型 → 在 .md 页面里 select 查询 + 图表组件 → `npm exec graphene serve` 起服务让编码代理自主迭代），重点验证它能否让代理在少纠正次数下稳定产出可用报表；理由是 README 给出了可直接复制的模型/查询代码和明确的 CLI 启动方式，属于可照做的流程，但缺少从零安装的完整命令和任何效果数据，需小范围实测再决定是否纳入手册。
- [@dotey: 有个用 Claude Dashboard 的用法，就是下载你的 X 数据，然后从 Artifacts（](../research/radar/2026-10-10/2399-claude-dashboard-x-artifacts.md)：值得一试，可以小范围试：把 X 账号后台（account analytics）各 Tab 的数据导出后作为附件上传到 Claude Dashboard/Artifacts 做复盘分析，流程本身可照做，但原文最关键的分析提示词被截断，需要自己补。
