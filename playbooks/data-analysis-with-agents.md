# 别把真实数据交给 AI：先用合成替身让它写分析代码

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在含 PII 或隐私敏感的表格数据上使用 AI 做 EDA 时，如何既让编码 agent 写出可运行、可检查的分析代码，又不把真实数据上传出去。
> 先试这一步：选一个非关键或已脱敏的单表 CSV，在本地用 SDV 生成 100 行合成替身，只把合成 CSV 上传到 Claude Code 的 Cloud mode，用原文 Prompt 1 让它写 notebook，再下载到本地换成真实数据运行。
> 最近修订：2026-11-09

## 解决什么问题

编码 agent 能做数据分析，但直接让它写 Python/JS 或裸 SQL 容易导致外观和指标口径不一致，同一关键指标用不同公式计算。另一种情况，是把数据交给 AI 分析后，得到一段读起来像样、但没有具体数字、也无法据此行动的结论。还有一种常见情况：自己的 X 账号里已有历史帖子数据，却没有被读出来用于内容复盘。第四种情况是：每次让 AI 做数据工程类工作（新数据源摸底、失败管道排查、对账、变更影响分析）都从头写长提示词，流程无法版本化，也没写清它能读什么、写什么、绝不能碰什么。第五种情况是经济学实证研究：数据清理、计量分析、论文复现、理论建模和写作都交给编码 agent，但没有留下可核对的证据，交付物变成“我跑出来了”，而不是“别人能重跑”。第六种情况是：企业已有元数据和业务术语，但智能体不知道数据在哪、是什么意思、该不该用、怎么 join，直接写 SQL 容易算错指标；原文说“a revenue metric answered faster is worth nothing if the number is wrong”。第七种情况是隐私敏感数据：手里有含 PII 的表格数据，想用 AI 做 EDA，但不愿把真实数据上传到云端，直接上传又有泄露风险。

本篇给七套可照做的做法：做法 A 用 Graphene 的「everything-as-code」语义层，把 metrics 和 modeled joins 写成代码，通过 CLI 启动服务，让编码 agent 在本地迭代、自检、产出可复用的报表和 dashboard；做法 B 把 X 账号后台导出的数据作为附件上传到 Claude Artifacts 的 Dashboard，让 Claude 做账号复盘；做法 C 把 X 账号的数据归档下载到本地，解压后在归档目录启动 Claude Code，让它读取 `data/tweets.js`，作为基于自己历史帖子做内容分析的入口；做法 D 把数据工程任务固化成 Claude Code 技能文件（`SKILL.md`），只挑 1–2 个装进项目的 `.claude/skills`，用真实任务跑两周，再决定是否扩到全部 16 个；做法 E 按经济学研究课程路径，用 `CLAUDE.md`、Plan mode、验收清单和可重跑复制包，把实证流程交给编码代理，先从只碰公开数据的最小闭环开始；做法 F 用 NVIDIA auto-ontology 从企业元数据自动生成语义本体，由人认证术语、SQL 属性和 join 关系，再通过 MCP/REST 暴露给任意 agent，让智能体先判断可回答性、再写 SQL，并返回答案、SQL 和步骤；做法 G 先在本地用 SDV 生成与真实数据同结构、同字段类型的合成替身，只把合成 CSV 上传到 Claude Code 的 Cloud mode，让它写 EDA notebook 和 dashboard，再把 notebook 和 requirements.txt 下载到本地，换成真实数据运行和修改。

七篇调研都建议先小范围实测，再决定是否纳入手册或固化进工作流。

## 适用与不适用

做法 A 适用：你有一个受支持的数据源（Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck 或本地 DuckDB）；你已经在用编码代理；你希望把数据分析和业务代码放在同一个仓库里，让代理获得上下文；你愿意把模型和页面文件纳入 git 和 CI。不适用：你不想使用编码代理（除非改用其托管的 Graphene Cloud）；你需要从零安装的确切命令和完整 setup 文档（原文未给出）；你需要量化效果数据再决定（原文没有任何量化成功指标）；你要做商业再分发（Elastic License 2.0，内部使用永久免费，做商用应用需联系）。

做法 B 适用：你有一个可用的 X 账号，并且该账号能打开数据分析页；你有一个可访问 Artifacts 的 Claude 账号；你想做账号复盘（内容、互动、趋势），不想写 SQL 或搭语义层。不适用：你不愿把自己的账号数据上传给第三方服务（原文未讨论隐私影响）；你需要现成的分析提示词（原文提示词被截断，需要自己补）；你需要效果数据证明它比手动翻后台更好（原文未给）。

做法 C 适用：你有可登录的 X 账号，能进入 `Settings → Your account → Download an archive of your data` 申请下载个人数据归档；归档中包含 `data/tweets.js`；本地有 Claude Code 使用环境；你想基于自己的历史帖子做内容分析，并愿意自己补后续分析提示词。不适用：你需要一套完整的内容分析流程、现成提示词或验证指标（原文只到读取文件这一入口）；你不愿把个人归档交给第三方或模型服务（原文未讨论隐私与脱敏）；你需要定时或事件触发自动运行（原文未涉及）；你没有 Claude Code 环境或不想用编码代理。

做法 D 适用：数据工程团队；已具备 Claude Code 付费计划（Claude Pro、Max、Team、Enterprise 或 Claude Console 账号）；项目内有 Claude Code 能读到的仓库、数据与日志；有人愿意先读 `SKILL.md` 再使用；你想把「一类任务怎么做」从临时长提示词变成可版本化、带读写边界的技能文件。不适用：你需要效果数据再决定是否采用（原文没有任何数据、基线或前后对比，作者自述是首版草稿）；你想先核对每个技能的步骤是否够具体再装（原文只提供 README，没有 `SKILL.md` 正文）；你的任务缺少必要输入（big-review 和 cost-review 依赖查询日志，incident 依赖运行记录）；你需要定时调度、事件订阅或状态机的具体配置（原文只到「技能名 + 一句话职责」）；你需要具体的权限配置项或 MCP/工具接入细节（原文未给出）；你不接受把虚构公司与虚构数据的示例页当作参考基准。

做法 E 适用：经济学实证研究场景（Stata/R/Python + 微观调查数据）；会用 Stata 或 R/Python 中的一种，懂基础计量；不需要用过智能体工具；愿意按课程顺序做，每课按验收清单自查；能提前申请 CHNS 或 CHARLS 等授权数据；接受以“别人能重跑”作为交付标准；本地能装 Claude Code（或 Codex）、Git、Python 或 Stata。不适用：无计量基础者（本科生被明确建议先用传统方式打基础）；需要立刻使用 CHNS/CHARLS（数据需自行申请，可能需要几天到几周，课程不分发数据）；你需要效果数据再决定是否采用（原文没有学员成果、前后对照、复现成功率或耗时对比）；你只拿到课程 README 索引，却想直接照抄每课详细步骤（讲义 PDF、作业说明 PDF、作业包 zip 与验收清单正文不在本次材料中）；你需要定时触发、事件触发或状态机的具体配置（原文未给出）；你不接受社媒数据只用于个人学习研究、遵守平台协议、控制采集频率、个人信息去标识化、原始数据不公开。

做法 F 适用：你有 Docker + Compose v2、`uv`、一个来自 build.nvidia.com 的 `nvapi-...` key；你有一个只读数据库副本（支持 PostgreSQL、MySQL、Databricks、Snowflake、ClickHouse、Trino、Kyuubi、HeavyDB、DuckDB、SQLite 十种数据源）；你希望把术语、经审核的 SQL 属性和 join 关系作为智能体的上下文层，让自然语言转 SQL 的答案可核对；你愿意先按 README 的 Docker Compose Quickstart 跑通样例库，再换到自己的只读副本。不适用：你需要轻量部署（F 依赖 NVIDIA NIM 端点，组件多、部署较重）；你需要准确率数据再决定（原文不含准确率数据）；你不能提供 NVIDIA NIM key；你不想先跑 Docker Compose；你需要定时/事件触发配置（原文未给）；你希望语义层完全手写并纳入代码仓库（那更接近做法 A）。

做法 G 适用：数据是表格型、可在本地用 Python 处理，且你有权限使用；你想用 AI 做 EDA，但不愿把真实数据上传到云端；你接受先在本地生成合成替身，只把合成数据交给 AI；你愿意在运行前审查 AI 生成的代码，确认不会把数据回传；你本地有 Python/Jupyter 环境，能安装 SDV 并运行 notebook。不适用：多表或复杂关系的数据（原文只演示单表；GaussianCopula 对复杂关系和高基数字段可能有限）；你需要合成数据保真度验证再决定（README 未给完整 SDV 代码和评估）；你需要完整可复制的 SDV 命令（原文只描述 notebook 步骤，需参照仓库 notebook 和 SDV 文档）；你需要与人工分析或直接上传真实数据的对照数据（原文没有）；你不接受使用 Claude Code 的 Cloud mode（原文称它零访问本地文件，但它是产品功能，未来可能变化）；你需要定时或事件触发（原文没有）。

做法 B 与做法 C 的差异：B 用 X 后台 analytics 页各 Tab 导出的数据，上传到 Claude Artifacts；C 用完整数据归档，在本地目录用 Claude Code 读取 `data/tweets.js`。B 更接近快速 dashboard 复盘，C 更接近本地文件 + 编码代理的内容分析入口；两者原文都没有给出完整分析提示词和效果验证。B 会把账号数据上传给第三方服务；C 在本地目录启动 Claude Code，但原文未讨论隐私与脱敏，试用时只处理脱敏副本，避免把归档上传到不需要的外部位置。

做法 D 与做法 A 的差异：A 用语义层（`.gsql` 模型 + `.md` 页面）统一指标口径，产出是可复用的报表和 dashboard，前置是有一个受支持的数据源；D 用 `SKILL.md` 固化一类任务的流程与读写边界，产出多是可直接阅读分享的网页报告，前置只是一个 Claude Code 能读到的项目目录。两者可以并用：口径放 A 的语义层，流程放 D 的技能文件。

做法 F 与做法 A 的差异：A 用 `.gsql` 手写表、维度、度量、连接关系，产出是 `.md` 页面里的报表和 dashboard，语义模型是代码；F 从企业元数据自动生成 ontology（Terms、SQL attributes、Relationships），由人在 Chat 或 MCP 里用真实问题认证，再通过 MCP/REST 暴露给任意 agent，产出是「答案 + SQL + 步骤」。A 更接近「手写语义层 + 报表」，F 更接近「自动生成 + 人工认证的上下文层」。两者都解决指标口径问题：A 靠 measure 组合，F 靠经审核的 SQL attributes 和术语映射。可以并用：F 做上下文层，A 做 dashboard 层；但两者都需要只读副本和小范围实测。

做法 F 与做法 D 的差异：D 固化一类任务的流程与读写边界（`SKILL.md`），F 固化的是数据含义、可用指标和 join 关系（本体）。D 管「怎么做」，F 管「数据是什么、能不能答」。先有 F 的术语和可回答性判断，再用 D 的技能跑具体任务，可以减少 agent 猜表名和字段含义。

做法 E 与做法 D 的差异：D 是通用数据工程技能仓库，重点是 `/profile`、`/incident` 等技能与“读什么/写什么/绝不做什么”的边界；E 是经济学实证研究的课程路径，重点是 `CLAUDE.md`、Plan mode、六阶段研究 harness、每课验收清单和“别人能重跑的复制包”，并补上 Codex 替代 Claude Code 时的适配与沙箱联网配置。E 第 4 课也会写自己的 `SKILL.md`，可与 D 的技能文件做法并用；但 E 的领域前置更强，需要计量基础和数据授权。

做法 G 与做法 B/C 的差异：B 把 X 后台导出的数据上传到 Claude Artifacts；C 把完整归档放在本地目录用 Claude Code 读取；G 只把合成替身上传到 Cloud mode，真实数据留在本地运行。B/C 原文未讨论隐私与脱敏，G 把隐私作为流程前提。代价是 G 的合成数据只有 100 行，且保真度未验证；如果换成真实数据后代码大量返工，说明合成替身不够有代表性。

做法 G 与做法 A 的差异：A 用 `.gsql` 语义层统一指标口径，产出报表和 dashboard；G 用合成数据让 AI 写可本地运行的 EDA 代码，产出 notebook 和 requirements.txt。两者可并用：先用 G 在脱敏/合成数据上把分析代码跑通，再在 A 的语义层里固化指标口径；但 G 不解决口径统一，A 不解决隐私上传。

七套做法都不适用的情况：你需要定时或事件触发的自动运行（七篇原文均未给出可照做的调度配置）；你需要明确的数据源凭据配置、代理权限限定或回滚方案（原文均未说明，E 只给了 Codex 沙箱联网这一项，F 给了 MCP 只读工具和按用户权限执行，但未给具体权限配置项）；你不接受先做小范围试用。

## 前置条件

- 做法 A：本机有 Node.js 与 npm/pnpm/yarn 之一；有一个受支持的数据源（本地文件可用 DuckDB，无需外部账号）；有一个编码代理（原文未指定具体代理）；有一个项目目录（可以是独立 repo，也可以是更大代码库里的一个目录）；使用 git 和编码代理是原文明确要求（除非改用其托管 Graphene Cloud）。
- 做法 B：一个可用的 X 账号并能访问 `https://x.com/i/account_analytics/overview`；一个可访问 Artifacts 的 Claude 账号（`https://claude.ai/artifacts`）；从 X 后台各 Tab 下载的数据文件。
- 做法 C：一个可登录的 X 账号；已申请并收到数据归档（原文说明归档可能需要一天到达）；解压后的归档目录中存在 `data/tweets.js`；本地有 Claude Code 使用环境。
- 做法 D：已安装 Claude Code，并有 Claude Pro、Max、Team、Enterprise 计划或 Claude Console 账号；有一个 Claude Code 能读到代码和数据的工程目录；愿意先读 `skills/<name>/SKILL.md` 确认读写边界再运行。
- 做法 E：已装 Claude Code（或 Codex）、Git、Python 或 Stata；第 1 课作业说明里有图文安装步骤；第 3、4 课要用的 CHNS 或 CHARLS 需按各数据官网流程自行申请，可能需要几天到几周，课程不分发数据，授权数据不得分享、不得上传公开仓库；若用 Codex 下载数据，需处理沙箱联网；若只做最小试用，先只碰公开数据。
- 做法 F：Docker + Compose v2；`uv`；一个来自 build.nvidia.com 的 `nvapi-...` key；一个只读数据库副本（或先用微软 Wide World Importers 样例库）；愿意按 Quickstart 改 `.env` 里所有默认口令；能访问本地 3000/3001/3002/3003/5432 端口。
- 做法 G：本地 Python/Jupyter 环境；按 SDV 官方文档安装 SDV；一个可用的 Claude Code Cloud mode（原文称它零访问本地文件）；一个非关键或已脱敏的单表 CSV，且有权限使用；能本地安装 `pip install -r requirements.txt` 并运行 notebook；愿意只保留回答分析问题所需的最小列。
- 共同：愿意先做小范围试用，再决定是否接入关键业务数据或固化流程。

## 操作步骤

### 做法 A：用 Graphene 语义层让编码 agent 做数据分析

1. 先用本地 DuckDB + 官方示例项目跑通最小闭环，不接公司数据源。克隆官方示例项目 `https://github.com/graphene-data/example-flights`，按 `/docs/setup.md` 安装依赖（原文未给出确切安装命令，不要凭空补）。启动开发服务器：
   ```bash
   npm exec graphene serve
   # 或
   pnpm graphene serve
   ```
   预期结果：服务起来，能在浏览器中看到示例页面渲染。确认代理能读懂随 npm 包发布的 agent skill 文档（代理无需外部检索即可获得用法）。

2. 准备一个项目目录。独立 repo 或更大代码库（例如 dbt 项目）里的一个目录。预期：后续模型和页面文件都放在这个目录里，能纳入 git。

3. 安装 Graphene CLI。原文只说明「can be installed via npm (or pnpm, yarn, etc.)」，未给出确切包名与安装命令。按 `/docs/setup.md` 或 npm 上的包名执行。这是原文的信息缺口，不要凭空补命令。预期：CLI 可用，能执行 `graphene serve`。

4. 创建新 Graphene 项目。按文档 `/docs/setup.md` 走；或继续使用官方示例项目。预期：项目内有可编辑的 `.gsql` 模型和 `.md` 页面。

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

8. 利用 CLI 的校验/反馈能力做闭环。Graphene CLI 支持检查语法、渲染页面、打印截图。让代理在提交前先自检、看渲染结果、本地迭代。预期：代理能在本地发现语法或渲染问题，而不是把问题留给人。

9. 纳入版本控制与 CI。把模型和页面文件放进 git，对关键 dashboard 跑测试，出问题时回滚代理的改动。预期：模型和页面可追溯、可回滚。

### 做法 B：把 X 账号导出数据上传到 Claude Artifacts Dashboard

1. 前提：你有一个 X（Twitter）账号，并且该账号能打开数据分析页；你有一个可访问 Artifacts 的 Claude 账号。

2. 打开账号数据分析页：
   ```
   https://x.com/i/account_analytics/overview
   ```

3. 把该页面里每一个 Tab 能下载到的数据都下载下来（原文强调「每个 Tab」，即不要只取一个 Tab 的数据）。第一次试用可先只下一个 Tab，降低试错成本。预期：拿到可上传的数据文件。

4. 打开 Claude 侧：
   ```
   https://claude.ai/artifacts
   ```
   新建一个 Dashboard。预期：有一个可上传附件的 Dashboard。

5. 把第 3 步下载的数据文件作为附件上传到这个 Dashboard。

6. 发送提示词让 Claude 分析。原文此处只写了一个引用块标记「>」，提示词正文在采集时被截断，没有给出，这一步需要你自己写。最小试用时可先发一版朴素提示词（这是试用示例，不是原文提示词）：
   ```
   这是我 X 账号后台导出的数据。请先说明每一列/每个字段的含义和统计口径，
   然后找出 3 个最明显的变化趋势，每个趋势给出对应数字，
   最后给出 3 条我可以马上执行的具体动作。
   ```

7. 如果这一步输出可用，再把其余 Tab 的数据补齐重跑一次。预期：输出包含具体数字和可执行动作，而不是「有所增长」这类空话。

### 做法 C：用 Claude Code 读取本地 X 数据归档中的 tweets.js

1. 前提：有可登录的 X 账号，并已具备 Claude Code 使用环境。在 X 中进入 `Settings → Your account → Download an archive of your data`，申请下载个人数据归档。原文说明归档可能需要一天到达。预期：提交申请并等待归档。

2. 收到归档文件后，将归档压缩包解压。建议先复制一份归档数据，后续只处理副本。预期：得到解压后的归档目录。

3. 确认解压后的目录中存在原文指定的 `data/tweets.js`。在该目录中打开 Claude Code。预期：Claude Code 的工作目录能看到该文件。

4. 在 Claude Code 中粘贴原文给出的起始提示词：
```
Read data/tweets.js.
```
预期：Claude Code 能打开并解析 `data/tweets.js`。注意：原文在此处截断，没有给出读取后要求输出什么、如何筛选高表现帖子、如何归因、如何验证。因此这一步只能作为工作流入口，不能据此声称已有完整分析流程。

5. 自行追加分析要求。原文没有给这些追加提示词，需要在试用中自行设计并记录。最小试用时可以先让它汇报字段结构、帖子数量级和样例，再基于字段做描述性统计。预期：你能核对字段和统计口径，而不是直接接受一段无法复核的结论。

6. 核对产物。把它判断的「高表现帖子」回到原始字段核对；看它能否形成具体的选题、开头、发布时机等调整建议，并与人工基线比较一致性和耗时。预期：分析可复核，且能产生可执行改进。

### 做法 D：把数据工程任务固化成 Claude Code 技能文件

1. 前提：已安装 Claude Code，并有 Claude Pro、Max、Team、Enterprise 计划或 Claude Console 账号；项目是一个 Claude Code 能读到代码和数据的工程目录。预期：Claude Code 能在该目录内正常运行。

2. 先按场景挑 1–2 个技能，不要一次装全 16 个。优先 `profile`（输入是一个数据源目录，最容易复现）或 `incident`（有明确的对错答案）。预期：明确这次要试的技能和它对应的一次真实任务。原文的技能清单按「什么时候用」分六组：新数据到达（profile、contract、metadata）、出故障（incident、quality、reconcile）、变更上线前（impact、test-data、pr-review）、需要全局视角（toolkit、big-review、cost-review）、他人使用你的数据（data-product、docs）、项目变大（knowledge-refresh、migration）。

3. 安装（二选一）。

   做法 D-1：复制到项目：
   ```bash
   git clone https://github.com/DataWithBaraa/claude-code-data-engineering-skills.git
   mkdir -p your-project/.claude/skills
   cp -r claude-code-data-engineering-skills/skills/* your-project/.claude/skills/
   ```
   前提：在 `your-project` 之外执行，或自行调整相对路径；技能放在项目内才能读到项目上下文。

   做法 D-2：作为插件安装，在 Claude Code 里执行：
   ```text
   /plugin marketplace add DataWithBaraa/claude-code-data-engineering-skills
   /plugin install data-engineering@data-with-baraa
   ```

   怎么选：想改技能正文、把自己项目的路径与标准写进去，用 D-1；只想先跑一次看默认行为，用 D-2。

4. 调用技能。直接敲技能名加上它需要的东西：
   ```text
   /profile data/landing/purchasing
   /incident 2026-08-19
   ```
   插件形式需加命名空间前缀：
   ```text
   /data-engineering:profile
   ```
   注意视频里 incident 技能当时叫 `/incidents`，仓库里已改为 `/incident`。

5. 使用前先读一遍 `skills/<name>/SKILL.md`。每个技能都写明了它读什么、写什么、绝不做什么。这一步是权限与影响面的确认，不要跳过。预期：你能说清这次运行会碰哪些路径和表。

6. 先跑一遍默认行为，再本地化改写。技能故意写得通用，需要把自己的路径、标准、规则加进步骤里。仓库根的 `CLAUDE.md` 是视频里用的指令文件，复制到项目根目录后改写：
   ```bash
   cp claude-code-data-engineering-skills/CLAUDE.md your-project/CLAUDE.md
   ```
   预期：同一任务改写前后各跑一次，能看出「条件供给」是否到位——改写后下一次同类任务是否还需要重复交代背景。

7. 兼容性处理：其他 Claude 应用可能不接受 `argument-hint` 这一行，上传技能到那些应用前先删掉该行。

8. 更新：插件更新不自动。要么 `git pull` 后重新执行第 3 步的拷贝，要么在 `/plugin` 里手动更新。

9. 看示例产出：多数技能在 `references/` 下有示例结果；示例页是 HTML，GitHub 只显示源码，需在浏览器中打开。

10. 自己写新技能时照它的结构模板来：一个技能 = 一个 `SKILL.md`，固定包含「任务 / 输入 / 步骤 / 输出 / 读什么 / 写什么 / 绝不做什么」，外加 `references/` 里的示例结果。至少把「读什么 / 写什么 / 绝不做什么」写死，再交给 agent 跑。

11. 通过后再逐个增加技能。不建议一次装全 16 个，因为多数技能会写文件，且整套是首版草稿。

### 做法 E：按经济学研究课程路径把实证流程交给编码代理

1. 核对先修条件。前提：会用 Stata 或 R/Python 中的一种，懂基础计量（微观/宏观/计量）；不需要用过智能体工具。本科生被明确建议先用传统方式打基础。预期：确认自己适合按课程路径做，而不是一上来就把授权数据交给 agent。

2. 装环境。Claude Code（或 Codex）、Python 或 Stata、Git。第 1 课作业说明里有图文安装步骤。预期：本地能启动 Claude Code 或 Codex，并能用 Git 管理项目。

3. 立刻申请数据，别等到第 3、4 课。第 3、4 课要用 CHNS 或 CHARLS，按各数据官网流程自行申请，可能需要几天到几周。课程不分发数据，授权数据不得分享、不得上传公开仓库。预期：数据申请已提交，或明确改用公开数据做最小试用。

4. 固定资料使用顺序：讲义 PDF → 图文作业说明 PDF → 作业包 zip（可在网页直接浏览）→ 验收清单自查。第一次用终端的先看作业说明。预期：每一步都知道该读哪份材料、该交什么。

5. 第 1 课：写自己的 `CLAUDE.md`（项目上下文约定），用 Plan mode 完成一个小任务，并按验收清单核对结果。预期：项目根目录有一版可用的 `CLAUDE.md`，且你能说清 Plan mode 产出的计划是否被验收清单覆盖。

6. 第 2 课：从空文件夹到一张可用于论文的图。两条路径：用公开数据接口下载世界银行数据；或用智能体操作浏览器采集小红书评论（人扫码登录，人机分工）。社媒数据只能用于个人学习研究，遵守平台协议、控制采集频率、个人信息去标识化、原始数据不公开。预期：先走公开数据分支，得到一张由脚本生成、可核对的图。

7. 第 3 课：用作者的 research harness 清理 CHNS，产出三件东西——审查报告、清理后的面板、带变量定义的 codebook。前提：CHNS 已获授权且未上传公开仓库。预期：三件交付物齐全，变量定义能被人复核。

8. 第 4 课：跑 CHARLS 长护险 staggered DID；复现一篇论文；专门练习“用大模型构造变量时怎样验证”；并写自己的第一个 `SKILL.md`（把可复用流程固化成技能）。预期：不仅跑出结果，还能说明变量构造和复现差距如何核对。

9. 第 5 课：用 pAI-Econ 构建理论模型；按作者自己的论文写作顺序写作；新开会话做审稿（用干净上下文审自己的稿，避免自我确认）。预期：审稿意见不是在同一上下文里自我确认出来的。

10. 第 5 课综合作业（二选一）：交付“别人能重跑的复制包”，或交付“一节理论机制”。这是整个课程最硬的验收物。预期：选择复制包时，另一个人或另一台机器能按包重跑。

11. 第 6 课（研讨）：AI for Social Science 的验证问题、Project APE 与 HLER 案例、智能体常见的八种错误、研究者的训练。预期：把八种常见错误当成后续试用时的错误分类表。

12. 改用 Codex 的适配。前提：已装 Codex。让它读取课程按 Claude Code 组织的 `CLAUDE.md` 与 `.claude/skills/`，自动生成对应的 `AGENTS.md`；提示词在 lab1 作业包的 `codex_adapt_prompt.md` 里。预期：Codex 能读到与 Claude Code 对应的项目约定和技能目录。

13. Codex 联网配置。前提：下载数据的脚本需要联网。Codex 默认沙箱不允许终端命令联网，Windows 上会报 `WinError 10013`。在 `~/.codex/config.toml` 加：
```toml
[sandbox_workspace_write]
network_access = true
```
改完重启 Codex。预期：下载脚本不再因沙箱断网报 `WinError 10013`。

14. 国内工具：Trae 桌面版可在设置中打开对 `CLAUDE.md` 和 `AGENTS.md` 的读取；WorkBuddy 也支持 skill。README 提醒这些工具更新很快，以各自当前官方文档为准。预期：不把旧版设置界面当成永久操作路径。

15. 把作者的工作流拆成可迁移的六阶段：审查 → 清理 → 计划 → 执行 → 审阅 → 发布。README 对 harness 的一句话描述用于第 2、3、5 课。预期：每次任务都能说清当前在哪个阶段、下一步交什么。

16. 每课结束都对验收清单自查。交付物以“别人能重跑”为准，不以“我跑出来了”为准。预期：表和图由脚本生成、数据处理有记录、关键数字经过独立核对。

17. 先跑最小闭环，只碰公开数据：装 Claude Code（或 Codex）+ Git + Python；只做第 1 课（写 `CLAUDE.md`、用 Plan mode 完成可核对小任务、对照验收清单打分）；只做第 2 课公开数据分支（从空文件夹用世界银行数据产出一张图）。若用 Codex，先加第 13 步的联网配置并重启。预期：1—2 小时内得到一张能被人重跑的图；不碰 CHNS/CHARLS 与社媒采集，直到前两步跑通、数据授权到手。

18. 要照做后续课程，先下载 lab1/lab2 作业包，把 PDF 与 zip 里的具体步骤、提示词、脚本和验收清单补齐。本次材料只有 README 索引，不能据此编造每课逐条操作。预期：手册里写的第 5—10、12 步只作为“做什么、产出什么”，补齐作业包后再写“逐条怎么做”。

### 做法 F：用 NVIDIA auto-ontology 给 agent 一个可认证的数据上下文层

1. 前提：Docker + Compose v2、`uv`、一个来自 build.nvidia.com 的 `nvapi-...` key。克隆并准备环境变量：
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
   注意：`.env.example` 里每个模型角色各有一行 `nvapi-your-api-key-here`，要么逐个替换，要么删掉让它们回退到 `DEFAULT_MODELS_API_KEY`。预期：`.env` 中没有默认口令和占位 key。

2. 起 Postgres 并灌入微软 Wide World Importers 样例库（种子脚本在另一个仓库，需要 `uv`）：
   ```bash
   docker compose up -d --wait postgres
   git clone https://github.com/NVIDIA/auto-ontology-eval.git ../auto-ontology-eval
   (cd ../auto-ontology-eval && uv sync && cp .env.example .env && \
     POSTGRES_PASSWORD='<the same password>' \
     uv run python scripts/seed/seed_wwi.py --database-name wideworldimporters --drop)
   ```
   预期：Postgres 起来，`wideworldimporters` 库有数据。

3. 构建并启动其余组件：
   ```bash
   docker compose up -d --build
   ```
   预期：前端 3000、后端 3001、摄取 worker 3002、MCP server 3003、Postgres 5432 起来。

4. 打开 http://localhost:3000，用 `.env` 里的 `AUTO_ONTOLOGY_ADMIN_EMAIL` / `AUTO_ONTOLOGY_ADMIN_PASSWORD` 登录，进 **Settings → Semantic Compilation** 打开它。摄取在启动时执行，编译立即开始，完成后界面显示 **Semantic compilation is ready**。预期：本体已生成，可以进入 Chat 测试。

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
   预期：答案、SQL、步骤三件都在，能回到源库核对。

6. 反向测试「数据回答不了的问题」——WWI 没有广告数据：
   ```text
   What was return on ad spend for the sushi roll flash drive in June 2015?
   ```
   期望行为（通过 MCP 接入时）：`check_answerable` 返回低覆盖率（示例 coverage 0.5，无术语覆盖 "ad spend"），智能体说明缺什么并请求澄清或要求接新数据源，而不是编一个数。预期：它没有硬编一个答案。

7. 排障：重启后左侧导航消失是浏览器持有了过期会话 cookie，清掉 `localhost:3000` 的站点数据再登录；其他失败见 `skills/nvidia-ontology-setup/references/troubleshooting.md`。

8. 把本体接进你自己的智能体（前提：上面栈已跑起来，且已登录拿到权限）。起 MCP server（只读工具；每个用户经 Auto-Ontology 登录，调用按该用户权限执行）：
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
   改完重启客户端，按提示登录。预期：客户端能连上 3003 的 MCP server。

10. 选对工具：就绪检查 `check_readiness`；查术语 `search_terms`、`get_term`、`get_term_columns`、`get_term_sql_attributes`、`get_sql_attribute`、`describe_table`；可回答性 `check_answerable`；提问 `ask_question`（返回答案、SQL、行）。在写 SQL 之前先调 `check_answerable`，是这套做法里最值得照抄的一条纪律。预期：每次提问前先判断「数据能不能答」，而不是先写 SQL 再硬凑。

11. 或用 REST：在用户菜单 → **API Tokens** 里签发 token，然后：
   ```bash
   curl -N http://localhost:3000/api/chat/completions \
     -H "x-api-key: $AUTO_ONTOLOGY_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"question": "How many orders shipped last week?"}'
   ```
   响应是 SSE 流：`result` 事件带答案，`data: [DONE]` 结束。原文给出的 Python 客户端示例在材料中被截断；先用上面的 `curl` 和 SSE 约定跑通，不要凭空补全客户端代码。

12. 在只读副本上用自己的真实业务问题测试：先跑 `check_answerable`，再 `ask_question`，把答案、SQL、步骤三件与源库人工核对。预期：能人工核对通过，再考虑接生产。原文建议先在你自己的只读数据库副本上跑一遍，先用一批真实业务问题测“答案＋SQL＋步骤”能否人工核对通过，再决定是否接入生产。

13. 认证与精修：在 Chat 里用真实问题测，或在 MCP 上调 `check_answerable`/`ask_question`，然后精修并认证术语、描述、SQL 属性。预期：术语、SQL 属性、join 关系经过人认证，而不是自动生成后直接用。

14. 可选：如果要接自己的数据源，支持 10 种数据源（PostgreSQL、MySQL、Databricks、Snowflake、ClickHouse、Trino、Kyuubi、HeavyDB、DuckDB、SQLite）。原文未给出每种数据源的详细接入配置；先按 Quickstart 用样例库跑通，再换只读副本。预期：不把样例库的配置直接当生产配置。

### 做法 G：先用本地合成数据让 Claude Code 写分析代码，再把代码拿回本地跑真实数据

1. 明确分析问题并准备本地单表 CSV。前提：数据是表格型、可在本地用 Python 处理，且你有权限使用。原文示例是 2000 条酒店客人记录，含邮箱、账单地址、信用卡号等 PII；作者建议只保留回答分析问题所需的最小列，不需要的敏感列先删掉。预期：得到一个只含最小列的单表 CSV。

2. 在本地生成合成替身。按仓库的 Synthetic Data Generation Notebook 流程：安装 SDV（具体安装方式按 SDV 官方文档），用 SDV 的 CSVHandler 加载 CSV，自动检测表元数据，人工检查并修正误识别列（原文例子：billing_address 被识别成 id 而不是 address），用 GaussianCopulaSynthesizer 拟合，采样 100 行，得到 hotel_guest_data_synthetic.csv。前提：单表、字段类型可识别；合成数据只用于让 AI 写代码，不用于得出业务结论。注意：原文 README 没有给出完整的 SDV 代码和命令，只描述了 notebook 中的步骤，实际执行需参照仓库 notebook 和 SDV 文档，不要凭空补命令。

3. 打开 Claude Code 的 Cloud mode（原文称它零访问本地文件），只上传合成 CSV，并粘贴 Prompt 1：
```text
Create a Jupyter notebook to explore this hotel guest data. Use pandas and Plotly (or any other package or library you prefer).

1. Firstly, I want to know how many nights our guests usually stay at our hotel.
2. Secondly, I'm curious what are the most common email domains of our guests.
3. Identify how many regular individual household customers and how many high-volume corporate office accounts we have in our data.

Add code comments to walk the reader through, and mention all the gotchas and data warnings (such as missing values or invalid data). Finally, generate a live dashboard for me to look at the results.
```
前提：Cloud mode 可用；上传文件只含合成数据和最小列。预期：Claude 生成一个带注释、包含数据质量警告和 dashboard 的 EDA notebook。

4. 让 Claude 生成依赖文件。原文在本地首次运行下载的 notebook 时遇到缺少 nbformat、导致 Plotly 图表无法渲染的错误，于是用了 Prompt 2：
```text
Please give me a requirements.txt file with the required packages to run this notebook.
```
预期：拿到 requirements.txt。

5. 下载 notebook 和 requirements.txt 到本地，安装依赖并运行。原文给出的安装命令是：
```bash
pip install -r requirements.txt
```
原文还给出仓库试用命令（需替换占位符）：
```bash
git clone <your-repo-url>
cd <your-repo-folder>
```
然后把 notebook 中的数据路径从合成 CSV 改成真实数据集（原文示例改为 hotel_guest_data.csv），重启 kernel，运行所有单元格。前提：本地有真实数据访问权限；运行前审查代码，确认不会把数据回传。预期：notebook 在本地真实数据上跑通，图表和 dashboard 正常渲染。

6. 处理运行错误并核对结果。遇到缺依赖、渲染错误或数据格式问题时，把错误反馈给 Claude 让它补代码或补 requirements；同时检查 notebook 中的数据质量警告（缺失值、无效数据），并按需增删改代码。预期：代码可读、依赖完整，核心统计结果能与人工独立计算核对。

### 怎么选

- 需要长期复用、多人协作、统一口径、把分析纳入 git/CI：选做法 A。
- 只想快速复盘一个社交账号、不想写 SQL 或搭语义层：选做法 B。
- 想基于完整 X 归档在本地用编码代理读文件，并且愿意自己补分析提示词：选做法 C。
- 想固定「一类数据工程任务怎么做」（新数据源摸底、故障根因、对账、变更影响面），并且已经在用 Claude Code：选做法 D。
- 做经济学实证研究、愿意按课程顺序做、能提前申请授权数据、接受“别人能重跑”作为验收：选做法 E。只想先验证 agent 是否改善研究流程，先做 E 的第 1 课 + 第 2 课世界银行公开数据分支，不要直接上 CHNS/CHARLS 或社媒采集。
- 企业已有元数据和业务术语，希望智能体知道数据在哪、是什么意思、该不该用、怎么 join，并且要「答案 + SQL + 步骤」可核对：选做法 F。先按 Docker Compose Quickstart 在只读副本上跑，不要直接接生产。
- 需要把含 PII 的表格数据交给 AI 做 EDA、又不愿上传真实数据：选做法 G。先用一个非关键或已脱敏的单表数据集，只上传最小列的合成 CSV；如果换成真实数据后代码大量返工，降级为 study/watch。
- B 与 C 的取舍：B 用后台各 Tab 导出上传到 Claude Artifacts，适合快速 dashboard 复盘；C 用完整归档 + 本地 Claude Code，适合本地文件分析入口，但原文只到读取文件，后续分析要自己设计。B 会把账号数据上传给第三方服务；C 在本地目录启动 Claude Code，但原文未讨论隐私与脱敏，试用时只处理脱敏副本，避免把归档上传到不需要的外部位置。
- A 与 D 的取舍：A 管口径，产出是报表和 dashboard；D 管流程与读写边界，产出多为网页报告。两者不冲突，可以先在 A 的 demo 项目上验证代理能不能稳定读模型、写页面，同时用 D 的 `profile` 技能做新数据源摸底。
- A 与 F 的取舍：A 手写 `.gsql` 语义模型，适合把 metrics 和 modeled joins 写成代码、产出报表和 dashboard；F 从元数据自动生成 ontology，由人认证后通过 MCP/REST 暴露给任意 agent，适合给已有的 agent 补上下文层。两者都解决口径问题：A 靠 measure 组合，F 靠经审核的 SQL attributes。可以并用：F 做上下文层，A 做 dashboard 层。
- F 与 D 的取舍：D 管「一类任务怎么做」，F 管「数据是什么、能不能答」。先有 F 的术语和可回答性判断，再用 D 的技能跑具体任务，减少 agent 猜表名和字段含义。
- D 与 E 的取舍：D 是通用数据工程技能仓库，适合先把 1—2 个技能装进项目试默认行为；E 是经济学实证研究课程路径，适合把 `CLAUDE.md`、Plan mode、验收清单、复现包和新会话审稿串成研究流程。E 第 4 课也会写 `SKILL.md`，可以和 D 的技能文件结构互相参照。
- G 与 B/C 的取舍：B/C 会把真实账号数据或归档交给第三方/模型服务，G 只上传合成替身；但 G 的合成数据只有 100 行、保真度未验证，复杂关系和高基数字段可能失真，适合先写代码而不是直接得结论。
- G 与 A 的取舍：A 管口径和 dashboard 复用，G 管隐私保护下生成可本地运行的分析代码；可以先用 G 写代码，再在 A 的语义层固化指标。
- 先试哪个：想快速看到 AI 分析是否对自己有增量价值，先试 B 或 C 做一次轻量复盘；想验证「把流程固化成技能文件」是否减少重复交代，先试 D 的 `profile` 或 `incident`；如果已经在用编码代理且数据源受支持，再考虑 A；如果是经济学实证研究，先试 E 的公开数据最小闭环；如果企业已有元数据、又不想一上来手写完整语义层，先试 F 的 Quickstart；如果数据含 PII、又不愿上传真实数据，先试 G 的单表合成替身流程。

## 怎么判断变好了

最小试用方式：

- 做法 A（半天内可完成）：①不接公司数据源，先用本地 DuckDB + 官方 demo 项目（example-flights），跑通 `graphene serve` 与页面渲染，确认代理能读懂随包的 agent skill。②把一个小型真实数据集接入为 `.gsql` 模型，只定义 2–3 个 dimension 和 2–3 个 measure（其中至少一个像 `aov` 这样由其他 measure 组合而成），验证点号遍历建模连接是否真的免写 JOIN。③让编码代理完成三个任务：回答一个数据问题、新建一个含至少一个 BigValue 和一个 BarChart 的 `.md` 页面、修改一次模型定义。全程记录代理是否需要人类纠正。
- 做法 B（第一次可先在一个 Tab 上试）：①先只下载一个 Tab 的数据，不做全量。②在 Claude Artifacts 新建 Dashboard，上传这一个文件。③用上面第 6 步的朴素提示词试跑。④如果这一步输出可用，再把其余 Tab 的数据补齐重跑一次。
- 做法 C（先只验证读取入口）：①复制一份归档数据，按原文步骤解压。②在归档目录打开 Claude Code，只用它读取 `data/tweets.js`。③确认它能正确识别文件结构和帖子字段后，再自行追加分析要求（例如先汇报字段、再基于字段做描述性统计）。原文没有给这些追加提示词，需在试用中自行设计并记录。
- 做法 D（连续两周、3–5 个真实任务）：①只选 1–2 个技能，优先 `profile` 或 `incident`。②在测试项目的 `.claude/skills` 里只放这两个，先不改写，直接跑一遍看默认行为。③然后按第 6 步把项目路径与标准写进 `SKILL.md`（或 `CLAUDE.md`），再跑一遍，比较改写前后的差别。④同时用人工方式（或另一位同事）独立完成同一件事，作为对照。⑤连续两周、用 3–5 个真实任务重复，记录每次结果。⑥通过后再逐个增加技能。
- 做法 E（1—2 小时最小闭环，只碰公开数据）：①装 Claude Code（或 Codex）+ Git + Python。②只做第 1 课：写一版自己的 `CLAUDE.md`，用 Plan mode 完成一个可核对的小任务，对照验收清单打分。③只做第 2 课的公开数据分支：从一个空文件夹出发，用世界银行数据产出一张图。④若用 Codex，先加 `[sandbox_workspace_write] network_access = true` 并重启，确认下载脚本不再报 `WinError 10013`。⑤不碰 CHNS/CHARLS 与社媒采集，直到前两步跑通、数据授权到手。
- 做法 F（先样例库、再只读副本）：①按 Quickstart 跑通样例库，问跨多表 join 的问题，检查输出是否同时有答案、SQL、步骤。②问一个数据回答不了的问题，看 `check_answerable` 是否返回低覆盖率、智能体是否说明缺什么而不是编数。③换到自己的只读副本，用 5–10 个真实业务问题测「答案＋SQL＋步骤」能否人工核对通过。④记录 `check_answerable` 的覆盖率、人工核对通过率、需要修复 SQL 的次数。原文没有给准确率基线，以上指标需自己记录。
- 做法 G（先试一个数据集）：①选一个非关键或已脱敏的单表数据集，按三步走一遍：本地生成 100 行合成替身 → 只上传最小列合成 CSV 到 Cloud mode，用 Prompt 1 和 Prompt 2 → 下载 notebook 和 requirements.txt，本地换成真实数据运行。②同时用同一分析问题手写一次 EDA 作为对照。③运行前审查代码，确认没有把真实数据回传。④记录 notebook 一次运行成功率、依赖错误数量、人工修改代码行数、核心统计结果与人工独立计算的一致率。

可观察的指标：

- 做法 A：代理首次生成查询的语法检查通过率，与让它直接写等价裸 SQL 相比需要几轮修正；同一个指标（如 revenue / aov）在 ≥2 个页面上是否算出同一数值（验证语义层是否真的统一了口径）；生成一个可用 dashboard 所需的对话轮次与 token 消耗，与让它写 python/JS 方案相比；代理产出的页面中需要人工手工调整样式/布局的比例；修改模型后，旧页面是否自动跟随更新而不需逐页改。
- 做法 B：输出的结论里是否包含具体数字（而不是「有所增长」这类空话）；是否给出可执行动作（能直接照着改发布时间、内容类型、互动策略等）；与自己手动翻后台对比，得出结论所花的时间是否明显缩短；换一份数据（比如换时间段或换另一个 Tab）重跑，结论是否跟着数据变化——如果两次输出几乎一样，说明它没有真的在分析数据。
- 做法 C：读取是否成功——Claude Code 能否稳定打开并解析 `data/tweets.js`；结构识别是否正确——它列出的字段、帖子数量级和样例是否与人工抽查一致；分析是否可复核——它给出的「高表现帖子」判断能否回到原始字段核对；是否产生可执行改进——能否据此形成具体的选题、开头、发布时机等调整建议，并与人工基线比较判断一致性和耗时；风险控制——是否只处理脱敏副本，是否避免把个人归档数据上传到不需要的外部位置。
- 做法 D：耗时——从「拿到失败运行 / 新数据源」到「写出可用的根因 / 画像」的分钟数，AI 组 vs 人工组；结论质量——根因是否正确、画像是否覆盖了后续建模真正用到的字段和边界案例，与人工独立结论的重合度与遗漏项数量；返工率——生成的页面有多少能直接发给同事，需要重写的段落比例；边界遵守——`SKILL.md` 里「绝不做什么」是否被遵守，有没有写到不该写的路径或表；稳定性——同一输入跑 3 次结论是否一致，不一致的地方是否正好是需要人判断的地方；可复用性——改写一次 `SKILL.md` 后，下一次同类任务是否不再需要重复交代背景。同时保留失败案例：如果失败集中在「缺少某类输入」或「步骤写得不够具体」，那正好是决定要不要自己重写 `SKILL.md` 的依据——这时仓库的价值从「拿来用」转为「拿来当模板」。
- 做法 E：可复现性最硬——把仓库交给另一个人或另一台机器，从空目录能否重跑出同一张图、同一组数字；不能重跑则视为无效改善。验收清单通过项占比（每课自查）。人工返工次数与“纠正智能体错误”的耗时（第 6 课列了八种常见错误，可当错误分类表计数）。同一任务“纯手工 vs 带 `CLAUDE.md` 的智能体”的耗时与出错率对比（自行记录，原文未提供基线）。阶段性扩展指标：第 3 课 codebook 变量定义完整率；第 4 课复现结果与原论文的数值差距；第 5 课复制包能否被第三方在无指导情况下重跑成功——这条应作为是否升级到长期采用的最终判据。
- 做法 F：`check_answerable` 的覆盖率（原文示例 coverage 0.5）；答案、SQL、步骤三件齐全的比例；SQL 能直接执行且结果与源库人工核对一致的比例；需要修复 SQL 的次数；同一问题重复问 3 次结果是否一致；接入 MCP 后 agent 是否减少猜表名/字段名的次数。原文不含准确率数据，以上需自行记录基线。
- 做法 G：隐私——上传文件是否只含合成数据和最小列；真实数据是否从未离开本地；运行前代码审查是否发现外传行为。效率——从提问到 notebook 在本地跑通的时间；依赖错误数量；人工修改代码的行数。质量——notebook 一次运行成功率；缺失值和无效值检查是否覆盖；核心统计结果与人工独立计算的一致率；图表和 dashboard 是否可复现。可维护性——代码注释是否足够、requirements.txt 是否完整、代码是否易读。原文没有量化基线，以上需自己记录。

试多久：做法 A 的最小试用半天内可完成；做法 B 先一个 Tab、一次对话即可判断是否有增量价值；做法 C 先验证一次读取和字段核对即可判断入口是否可用；做法 D 需要连续两周、3–5 个真实任务，才有足够样本和人工对照；做法 E 的最小闭环 1—2 小时内可完成，但只碰公开数据，完整课程要等数据授权和作业包补齐；做法 F 的 Quickstart 半天内可跑通，换到自己的只读副本后，先用 5–10 个真实业务问题试 1–2 天，再决定是否接生产；做法 G 原文未给试用时长，先试一个数据集，跑通一次并核对核心数字，再决定是否扩大。以上指标若明显优于现有做法，再考虑写入手册或固化进复盘习惯；若差异不明显，则退回研究阶段。

## 常见坑

- 做法 A：原文未给出从零安装的确切命令、setup 文档正文，只能依赖 `/docs/setup.md`。不要凭空补安装命令。
- 做法 A：原文未说明如何配置数据源凭据、如何限定代理权限、如何回滚，也未给出任何触发式/定时任务的配置。
- 做法 A：原文无成本、token 消耗、准确率、生成速度等任何量化证据。作者主张的「build visualizations 10x faster」「raises the floor so that pages look beautiful by default」「beats traditional BI」等均无基准测试或用户数据；「more accurate queries」「more consistent and polished visuals」为设计目标陈述，非实测结论。
- 做法 A：强前置条件——默认要求使用 git + 编码代理；不想用代理的人必须转向其托管服务。Elastic License 2.0 对商业再分发有限制。社区热度仅 Hacker News 30 points、9 comments，样本很小。
- 做法 B：原文最关键的分析提示词被截断，需要自己补；没有给出任何分析结果、效果数据或案例。
- 做法 B：作者没有说明为什么这么用会比手动看后台更好，也没有给出任何量化收益。互动数据 37 点赞、1 转发、44 回复仅作热度参考，不构成效果证据。
- 做法 B：需要把自己的账号数据上传给第三方服务，原文未讨论隐私或数据规模上限；试用前先确认自己是否接受这一点。
- 做法 C：原文只给了下载归档、解压、在目录中打开 Claude Code、粘贴 `Read data/tweets.js.` 这一条起始提示。它没有给出分析输出样例、数据字段说明、内容策略结论或效果数据；读取之后的分析提示词被截断，需要自己补。
- 做法 C：原文的核心判断「你的账号已经知道哪些帖子有效」属于作者主张，不是验证过的结论。推文互动数据为点赞 104、转发 3、回复 12，只能说明有一定传播，不能证明方法有效。
- 做法 C：原文未讨论个人数据隐私与脱敏。试用时先复制一份归档数据，只处理脱敏副本，避免把个人归档数据上传到不需要的外部位置。
- 做法 D：原文只提供 README，没有 `SKILL.md` 正文，无法核对每个技能的步骤是否够具体、是否真能照做。装之前先读 `skills/<name>/SKILL.md`，别把「技能名 + 一句话职责」当成完整流程。
- 做法 D：效果验证部分完全空缺，没有任何数据、基线或前后对比；「按标准逐轮评审 PR 并会提出反驳」「安全的改动顺序」等表述没有附带案例或对照；作者自述这是首版草稿，会持续扩充。
- 做法 D：示例页面使用虚构公司和虚构数据，不能代表真实环境的复杂度；示例产出是 HTML，在 GitHub 上只显示源码，需在浏览器打开才能看见效果。
- 做法 D：技能故意写得通用，直接使用大概率需要按自己项目的路径和标准改写；不先跑一遍默认行为再改写，就分不清哪些问题是技能本身带来的、哪些是自己的配置问题。
- 做法 D：big-review 和 cost-review 依赖查询日志，incident 依赖运行记录，缺少这些输入时技能无法工作。
- 做法 D：不要一次装全 16 个——多数技能会写文件，且整套是首版草稿；插件更新不自动，要 `git pull` 后重新拷贝或在 `/plugin` 里手动更新。
- 做法 D：其他 Claude 应用可能不接受 `argument-hint` 这一行，上传前先删掉；视频里 incident 技能叫 `/incidents`，仓库里已改为 `/incident`。
- 做法 E：本次拿到的只有课程 README 索引，真正的操作步骤、提示词、脚本和验收清单正文都在讲义 PDF 与 zip 作业包内，不在材料中。要写进手册并照做，必须先下载 lab1/lab2 作业包把步骤补齐；不要把“做什么、产出什么”当成逐条操作。
- 做法 E：课程“能明显改善研究方式”没有数据支撑——没有学员成果、前后对照、复现成功率或耗时对比；50 stars 不构成质量证据；README 中“2026 年 11 月 3 日”等日期未核实。
- 做法 E：CHNS/CHARLS 课程不分发，需自行申请，可能几天到几周；授权数据不得分享、不得上传公开仓库。社媒采集需要人扫码登录，只能用于个人学习研究，遵守平台协议、控制采集频率、个人信息去标识化、原始数据不公开。
- 做法 E：Codex 默认沙箱不允许终端命令联网，Windows 会报 `WinError 10013`；要在 `~/.codex/config.toml` 加 `[sandbox_workspace_write] network_access = true` 并重启。不要把它当成所有工具的通用配置。
- 做法 E：无计量基础者不适合直接上；本科生被明确建议先用传统方式打基础。不要跳过 `CLAUDE.md`、Plan mode 和验收清单，直接让 agent 跑完整实证。
- 做法 E：审稿要新开会话，用干净上下文审自己的稿，避免同一上下文里的自我确认；不要在同一会话里既写又审还宣称已经验证。
- 做法 E：Trae、WorkBuddy 等工具更新很快，README 的界面说明以各自当前官方文档为准，不要把旧版设置路径当成永久做法。
- 做法 E：原文没有给出定时触发、事件触发或状态机的具体配置；六阶段流水线只说明流程可固化并重复执行，不能外推为自动调度。
- 做法 F：依赖 NVIDIA NIM 端点，需要 `nvapi-...` key；没有 key 跑不起来。
- 做法 F：部署较重（前端 3000、后端 3001、摄取 worker 3002、MCP server 3003、Postgres 5432），本地端口和资源要留够。
- 做法 F：`.env.example` 里每个模型角色各有一行占位 key，要么逐个替换，要么删掉让它们回退到 `DEFAULT_MODELS_API_KEY`；不要留着占位 key。
- 做法 F：每个默认口令都要换，Compose 会把 Postgres、pgAdmin、Web 应用发布到宿主机。
- 做法 F：重启后左侧导航消失是浏览器持有了过期会话 cookie，清掉 `localhost:3000` 的站点数据再登录。
- 做法 F：先调 `check_answerable` 再写 SQL；不要跳过可回答性判断直接让 agent 写 SQL。
- 做法 F：原文不含准确率数据；「a revenue metric answered faster is worth nothing if the number is wrong」是设计主张，不是实测结论。
- 做法 F：MCP server 是只读工具，每个用户经 Auto-Ontology 登录，调用按该用户权限执行；但仍要先在只读副本上试，不要直接接生产。
- 做法 F：原文未给出定时/事件触发配置，也未给出每种数据源的详细接入配置；先按 Quickstart 用样例库跑通。
- 做法 G：原文 README 是教程索引，SDV 的完整代码和命令未在文本中给出，只描述了 notebook 步骤；实际执行需参照仓库 notebook 和 SDV 官方文档，不要凭空补命令。
- 做法 G：100 行合成数据是否足够代表真实分布未验证；GaussianCopula 对复杂关系和高基数字段可能有限。合成数据只用于让 AI 写代码，不用于得出业务结论。
- 做法 G：即使使用合成数据，也只应共享回答分析问题所需的最小列；真实数据是否从未离开本地、代码是否会把数据回传，要在运行前审查。
- 做法 G：Cloud mode 是产品功能，未来可能变化；原文称它零访问本地文件，但不能替代自己的代码审查。
- 做法 G：原文没有与人工分析或直接上传真实数据的对照数据；notebook 一次运行成功率、依赖错误数量、人工修改行数、结果一致率等指标需自己记录。
- 做法 G：把 notebook 数据路径改成真实数据后要重启 kernel；原文遇到缺少 nbformat 导致 Plotly 图表无法渲染，用 Prompt 2 生成 requirements.txt 解决。
- 做法 G：适用条件是单表结构化数据、有 Python/Jupyter 环境、可本地处理数据；多表或复杂关系的数据不要直接套用。
- 共同：不要跳过最小试用直接接入关键业务数据或授权数据。

## 证据与来源

做法 A 依据调研报告《Show HN: Graphene – Data analysis toolkit for your coding agent》。可核实的内容：可直接复制的 `.gsql` 模型定义示例与 `.md` 页面查询+图表示例（已放入操作步骤）；明确的 CLI 使用方式 `npm exec graphene serve`（含 pnpm 等变体）；支持的数据源清单（Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck、本地 DuckDB）；能力清单（CLI 可运行/编译查询、渲染页面、检查语法、打印截图；Graphene SQL 遵循 ANSI 并支持 170+ 函数；页面支持 HTML/CSS/JS/ECharts 能表达的任何内容）；许可 Elastic License 2.0，内部使用永久免费，做商用应用需联系；社区热度 Hacker News 30 points、9 comments（样本很小）。只是作者主张、未被数据支撑的部分：「build visualizations 10x faster」「raises the floor so that pages look beautiful by default」「beats traditional BI」等性能/质量断言，均无基准测试或用户数据；「more accurate queries」「more consistent and polished visuals」为设计目标陈述，非实测结论。信息缺口与局限：从零安装的确切命令、setup 文档正文未在原文中给出，只能依赖 `/docs/setup.md`；未说明如何配置数据源凭据、如何限定代理权限、如何回滚，也未给出任何触发式/定时任务的配置；无成本、token 消耗、准确率、生成速度等任何量化证据。强前置条件：默认要求使用 git + 编码代理；不想用代理的人必须转向其托管服务；Elastic License 2.0 对商业再分发有限制。

做法 B 依据调研报告《@dotey: 有个用 Claude Dashboard 的用法…》。原文给了的：两个具体 URL（`https://x.com/i/account_analytics/overview`、`https://claude.ai/artifacts`）、一个明确的操作顺序（下载各 Tab 数据 → 新建 Dashboard → 上传附件 → 发给 Claude 分析）。这些是可照做的部分。原文没给的：分析用的提示词正文（被截断，只剩一个「>」）；任何分析结果、效果数据或案例；作者没有说明为什么这么用会比手动看后台更好，也没有给出任何量化收益。只是主张的部分：「用 Claude Dashboard 分析 X 数据」能带来什么价值，原文没有论证，只能算一个用法主张。互动数据 37 点赞、1 转发、44 回复，仅作为热度参考，不构成效果证据。原文未讨论隐私或数据规模上限，试用前需自行判断是否接受把账号数据上传给第三方。

做法 C 依据调研报告《@RoundtableSpace: Your X account already knows which of your posts work. You just never read the data.》。可核实的内容：X 归档下载入口 `Settings → Your account → Download an archive of your data`；原文说明归档可能需要一天到达；解压归档；归档目录中存在 `data/tweets.js`；在该目录中打开 Claude Code；起始提示词 `Read data/tweets.js.`。只是作者主张、未被数据支撑的部分：「你的 X 账号已经知道哪些帖子有效，只是你没读数据」没有给出验证。信息缺口与局限：读取之后的分析提示词被截断，没有给出分析输出样例、数据字段说明、内容策略结论或效果数据；没有给出验证方法、指标或对照结果；原文未讨论个人数据隐私与脱敏，也未涉及定时或事件触发。互动数据为点赞 104、转发 3、回复 12，只能说明有一定传播，不能证明方法有效。

做法 D 依据调研报告《DataWithBaraa/claude-code-data-engineering-skills》。可核实的内容：仓库地址与两条安装路径的确切命令（`git clone` + `cp -r` 到 `.claude/skills`；`/plugin marketplace add` + `/plugin install data-engineering@data-with-baraa`）；调用示例（`/profile data/landing/purchasing`、`/incident 2026-08-19`，插件前缀 `/data-engineering:profile`）；16 个技能的名称、一句话职责与六组场景分组；`SKILL.md` 的固定结构（任务 / 输入 / 步骤 / 输出 / 读什么 / 写什么 / 绝不做什么）；7 个技能有 YouTube 视频演示；`references/` 下有示例结果；`CLAUDE.md` 位于仓库根可直接复制；MIT 许可；`argument-hint` 兼容性说明；插件更新需手动。仓库指标 36 stars。只是作者主张、未经证实：技能的实际质量和步骤细度，「按标准逐轮评审 PR 并会提出反驳」「安全的改动顺序」等表述没有附带案例或对照；作者自述这是 first draft，会持续扩充。信息缺口与局限：提供的原文只有 README，没有 `SKILL.md` 正文，无法核对技能能否照做；效果验证完全空缺，没有任何数据、基线或前后对比；示例使用虚构公司与虚构数据；技能故意写得通用，需按自己项目改写；big-review 和 cost-review 依赖查询日志、incident 依赖运行记录；原文只到「技能名 + 一句话职责」的层面，没有定时调度、事件订阅或状态机的具体配置，也未给出具体权限配置项或 MCP/工具接入细节。本篇采用的最小试用方案（1–2 个技能、两周、3–5 个真实任务、人工对照）来自该报告的建议，尚未有任何实测结果支撑。

做法 E 依据调研报告《maxwell2732/chenzhu-claude-econ》。可核实的内容：6 次课，每次约 2 小时，5 次实操 + 1 次研讨；每课资料结构固定为讲义 PDF → 图文作业说明 PDF → 作业包 zip（可在网页直接浏览）→ 验收清单；原创材料 MIT；数据不分发，CHNS/CHARLS 需自行申请；5 个配套工具仓库及对应课次：`claudecode-research-harness-workflow`（实证流程）、`codex-stata-for-economists`（Stata 流水线）、`paper-replicate-agent-demo`（复现）、`pAI-Econ-claude`（理论建模）、`hler-working-papers`（人机协作研究工作论文）；第 1 课写 `CLAUDE.md`、用 Plan mode；第 2 课用世界银行公开数据或人扫码登录采集小红书评论；第 3 课清理 CHNS 产出审查报告、清理后面板、codebook；第 4 课跑 CHARLS 长护险 staggered DID、复现论文、练习变量验证、写第一个 `SKILL.md`；第 5 课用 pAI-Econ 构建理论模型、按作者论文写作顺序写作、新开会话审稿；第 5 课综合作业二选一（别人能重跑的复制包或一节理论机制）；第 6 课研讨 AI for Social Science 验证问题、Project APE 与 HLER 案例、智能体八种常见错误；Codex 适配提示词在 lab1 作业包 `codex_adapt_prompt.md`；Codex 联网配置 `[sandbox_workspace_write] network_access = true`；Trae 可读取 `CLAUDE.md` 和 `AGENTS.md`，WorkBuddy 支持 skill；六阶段为审查 → 清理 → 计划 → 执行 → 审阅 → 发布。只是作者主张、未给证据：课程“能明显改善研究方式”没有数据支撑——没有学员成果、前后对照、复现成功率或耗时对比；50 stars 也不构成质量证据；README 中“2026 年 11 月 3 日”等日期未核实。关键局限：本次拿到的只有 README 索引，真正的操作步骤、提示词、脚本和验收清单正文都在 PDF 与 zip 作业包内，不在材料中；因此第 5—10、12 步只能给出“做什么、产出什么”，给不出“逐条怎么做”；原文也没有给出定时触发、事件触发或状态机的具体配置。适用条件：经济学实证研究场景（Stata/R/Python + 微观调查数据）；需要提前几周申请授权数据；不适用于无计量基础者。

做法 F 依据调研报告《NVIDIA/auto-ontology》。可核实的内容：Apache 2.0 开源；三阶段 Generate → Certify → Answer；本体三类定义 Terms、SQL attributes、Relationships；组件与端口（前端 3000、后端 3001、摄取 worker 3002、MCP server 3003、Postgres 17 + pgvector 5432、可选 HashiCorp Vault）；支持 10 种数据源（PostgreSQL、MySQL、Databricks、Snowflake、ClickHouse、Trino、Kyuubi、HeavyDB、DuckDB、SQLite）；Quickstart 的确切命令（`git clone`、`cp .env.example .env`、`docker compose up -d --wait postgres`、seed 脚本、`docker compose up -d --build`）；`.env` 必改项；样例问题与合格输出（答案、SQL、步骤）；MCP server 启动命令与 Cursor/Claude Desktop 配置；MCP 工具清单（`check_readiness`、`search_terms`、`get_term`、`get_term_columns`、`get_term_sql_attributes`、`get_sql_attribute`、`describe_table`、`check_answerable`、`ask_question`）；REST 的 `curl` 示例与 SSE 约定（`result` 事件带答案，`data: [DONE]` 结束）；排障说明。只是作者主张、未被数据支撑的部分：「a revenue metric answered faster is worth nothing if the number is wrong」是设计主张；原文不含准确率数据；没有给出量化收益或前后对比。信息缺口与局限：Python 客户端示例在原文中被截断；每种数据源的详细接入配置未给出；未给出定时/事件触发配置；部署较重、依赖 NVIDIA NIM 端点；需要自己记录可回答性覆盖率和人工核对通过率。本篇采用的最小试用方案（Quickstart → 样例库 → 只读副本 → 5–10 个真实问题）来自该报告的建议，尚未有实测结果支撑。

做法 G 依据调研报告《thu-vu92/claude-code-data-analysis》。可核实的内容：仓库 README 给出的三步流程（本地 SDV 生成合成数据 → Claude Code Cloud mode 只上传合成 CSV 写 EDA notebook 和 dashboard → 下载 notebook 和 requirements.txt 到本地换成真实数据运行）；两个可直接复制的提示词 Prompt 1 与 Prompt 2（已放入操作步骤）；原文示例数据是 2000 条酒店客人记录，含邮箱、账单地址、信用卡号等 PII；合成数据采样 100 行，文件名 `hotel_guest_data_synthetic.csv`；原文在本地首次运行下载的 notebook 时遇到缺少 nbformat、导致 Plotly 图表无法渲染的错误；原文给出的安装命令 `pip install -r requirements.txt` 和仓库试用命令 `git clone <your-repo-url>`、`cd <your-repo-folder>`；作者建议只保留回答分析问题所需的最小列。只是作者主张、未被数据支撑的部分：「数据分析师不需要 AI 直接分析数据，只需要 AI 写可靠代码」；「即使使用合成数据，也只应共享回答问题所需的最小列」。信息缺口与局限：README 是教程索引，SDV 的完整代码和合成数据质量评估未在文本中给出；100 行合成数据是否足够代表真实分布未验证；GaussianCopula 对复杂关系和高基数字段可能有限；Cloud mode 是产品功能，未来可能变化；没有与人工分析或直接上传真实数据的对照数据；dashboard 的部署和运行细节也不充分。适用条件：单表结构化数据、有 Python/Jupyter 环境、可本地处理数据、Claude Code Cloud 可用。本篇采用的最小试用方案（一个非关键或已脱敏单表数据集、同一问题手写 EDA 对照、记录隐私/效率/质量/可维护性指标）来自该报告的建议，尚未有实测结果支撑。

七篇调研的共同点：都没有给出可复现的量化收益数据；都需要小范围实测再决定是否纳入长期工作流。

## 依据的调研

- [Show HN: Graphene – Data analysis toolkit for your coding agent](../research/radar/2026-10-04/1165-show-hn-graphene-data-analysis-toolkit-for-your-co.md)：值得一试，用一个只含本地 DuckDB 的小项目跑通 Graphene 的完整闭环（写 .gsql 语义模型 → 在 .md 页面里 select 查询 + 图表组件 → `npm exec graphene serve` 起服务让编码代理自主迭代），重点验证它能否让代理在少纠正次数下稳定产出可用报表；理由是 README 给出了可直接复制的模型/查询代码和明确的 CLI 启动方式，属于可照做的流程，但缺少从零安装的完整命令和任何效果数据，需小范围实测再决定是否纳入手册。
- [@dotey: 有个用 Claude Dashboard 的用法，就是下载你的 X 数据，然后从 Artifacts（](../research/radar/2026-10-10/2399-claude-dashboard-x-artifacts.md)：值得一试，可以小范围试：把 X 账号后台（account analytics）各 Tab 的数据导出后作为附件上传到 Claude Dashboard/Artifacts 做复盘分析，流程本身可照做，但原文最关键的分析提示词被截断，需要自己补。
- [@RoundtableSpace: Your X account already knows which of your posts work. You just never read the data.](../research/radar/2026-10-29/8131-your-x-account-already-knows-which-of-your-posts-w.md)：值得一试，可以按原文小范围试通“X 归档 + Claude Code 读取 tweets.js”这一入口，但不要把它当成完整内容分析手册；原文只给了下载、解压和一条被截断的读取提示，缺少分析指令与验证指标。
- [DataWithBaraa/claude-code-data-engineering-skills](../research/radar/2026-10-30/8578-datawithbaraa-claude-code-data-engineering-skills.md)：值得一试，先在一个测试项目里挑 1–2 个技能（profile 或 incident）装进 .claude/skills 跑两周，对比人工完成同一任务的耗时与产出质量，再决定是否扩到全部 16 个；理由是仓库给出了可直接复制的安装和调用方式、每个 SKILL.md 都固定声明读写边界，但原文只有 README、看不到技能正文，且作者自述为首版草稿、无任何效果数据。
- [maxwell2732/chenzhu-claude-econ](../research/radar/2026-11-03/9719-maxwell2732-chenzhu-claude-econ.md)：值得一试，建议小范围试：照这门课的路径先跑第 1—2 课的最小流程（写 CLAUDE.md、用 Plan mode、从空文件夹到一张别人能重跑的图，并用验收清单自查），跑通后再决定要不要投入 CHNS/CHARLS 的完整实证流水线；理由是 README 给出了可执行的课程结构、每课产出物、验收清单、配套工具仓库和一段可直接复制的 Codex 网络配置，但具体步骤在 PDF 与作业包里，本次材料只到索引层，还没有效果数据。
- [NVIDIA/auto-ontology](../research/radar/2026-11-05/10524-nvidia-auto-ontology.md)：值得一试，照 README 的 Docker Compose Quickstart 在你自己的只读数据库副本上跑一遍，先用一批真实业务问题测“答案＋SQL＋步骤”能否人工核对通过，再决定是否接入生产。理由：它给出可直接复制的部署、模型角色配置、MCP/REST 接入步骤，并内建“先判可回答性、查询后返回 SQL 与出处”的验证闭环，正好补上智能体做结构化分析时缺的上下文层；但它依赖 NVIDIA NIM 端点、部署较重、且不含准确率数据。
- [thu-vu92/claude-code-data-analysis](../research/radar/2026-11-09/11721-thu-vu92-claude-code-data-analysis.md)：值得一试，建议按“本地 SDV 合成数据→Claude Code Cloud 写代码→本地真实数据运行”小范围试，原文的三步流程和提示词可直接照搬；但 README 未给完整 SDV 代码和合成数据保真度验证，先试一个数据集再决定是否纳入手册。
