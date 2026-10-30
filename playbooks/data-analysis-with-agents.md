# 让编码 agent 做数据分析：先固定口径与流程，再小范围验证

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：直接让 AI 写裸 SQL 或临时长提示词做数据分析，会导致指标口径不一致、结论无法核对、流程无法复用；本篇给四套可照做的做法，并说明每套怎么先小范围验证再固化进工作流。
> 先试这一步：挑 1–2 个数据工程技能（优先 profile 或 incident）装进测试项目的 `.claude/skills`，先不改写跑一遍，再按自己项目的路径与标准改写跑第二遍，同时让同事人工独立做同一件事对照。
> 最近修订：2026-10-30

## 解决什么问题

编码 agent 能做数据分析，但直接让它写 Python/JS 或裸 SQL 容易导致外观和指标口径不一致，同一关键指标用不同公式计算。另一种情况，是把数据交给 AI 分析后，得到一段读起来像样、但没有具体数字、也无法据此行动的结论。还有一种常见情况：自己的 X 账号里已有历史帖子数据，却没有被读出来用于内容复盘。第四种情况是：每次让 AI 做数据工程类工作（新数据源摸底、失败管道排查、对账、变更影响分析）都从头写长提示词，流程无法版本化，也没写清它能读什么、写什么、绝不能碰什么。

本篇给四套可照做的做法：做法 A 用 Graphene 的「everything-as-code」语义层，把 metrics 和 modeled joins 写成代码，通过 CLI 启动服务，让编码 agent 在本地迭代、自检、产出可复用的报表和 dashboard；做法 B 把 X 账号后台导出的数据作为附件上传到 Claude Artifacts 的 Dashboard，让 Claude 做账号复盘；做法 C 把 X 账号的数据归档下载到本地，解压后在归档目录启动 Claude Code，让它读取 `data/tweets.js`，作为基于自己历史帖子做内容分析的入口；做法 D 把数据工程任务固化成 Claude Code 技能文件（`SKILL.md`），只挑 1–2 个装进项目的 `.claude/skills`，用真实任务跑两周，再决定是否扩到全部 16 个。四篇调研都建议先小范围实测，再决定是否纳入手册或固化进工作流。

## 适用与不适用

做法 A 适用：你有一个受支持的数据源（Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck 或本地 DuckDB）；你已经在用编码代理（如 Claude Code 等，原文未指定具体代理）；你希望把数据分析和业务代码放在同一个仓库里，让代理获得上下文；你愿意把模型和页面文件纳入 git 和 CI。

做法 A 不适用：你不想使用编码代理（原文说除非改用其托管的 Graphene Cloud，提供 Slack agent、MCP server、浏览器 SaaS）；你需要从零安装的确切命令和完整 setup 文档（原文未给出）；你需要量化效果数据再决定是否采用（原文没有任何量化成功指标）；你要做商业再分发（Elastic License 2.0，内部使用永久免费，做商用应用需联系）。

做法 B 适用：你有一个可用的 X（Twitter）账号，并且该账号能打开数据分析页；你有一个可访问 Artifacts 的 Claude 账号；你想做账号复盘（内容、互动、趋势），不想写 SQL 或搭语义层。

做法 B 不适用：你不愿把自己的账号数据上传给第三方服务（原文未讨论隐私影响）；你需要现成的分析提示词（原文提示词被截断，需要自己补）；你需要效果数据证明它比手动翻后台更好（原文未给）。

做法 C 适用：你有可登录的 X 账号，能进入 `Settings → Your account → Download an archive of your data` 申请下载个人数据归档；归档中包含 `data/tweets.js`；本地有 Claude Code 使用环境；你想基于自己的历史帖子做内容分析，并愿意自己补后续分析提示词。

做法 C 不适用：你需要一套完整的内容分析流程、现成提示词或验证指标（原文只到读取文件这一入口，提示词被截断）；你不愿把个人归档交给第三方或模型服务（原文未讨论隐私与脱敏）；你需要定时或事件触发自动运行（原文未涉及）；你没有 Claude Code 环境或不想用编码代理。

做法 D 适用：数据工程团队；已具备 Claude Code 付费计划（Claude Pro、Max、Team、Enterprise 或 Claude Console 账号）；项目内有 Claude Code 能读到的仓库、数据与日志；有人愿意先读 `SKILL.md` 再使用；你想把「一类任务怎么做」从临时长提示词变成可版本化、带读写边界的技能文件。

做法 D 不适用：你需要效果数据再决定是否采用（原文没有任何数据、基线或前后对比，作者自述是首版草稿）；你想先核对每个技能的步骤是否够具体再装（原文只提供 README，没有 `SKILL.md` 正文）；你的任务缺少必要输入（big-review 和 cost-review 依赖查询日志，incident 依赖运行记录，缺这些时技能无法工作）；你需要定时调度、事件订阅或状态机的具体配置（原文只到「技能名 + 一句话职责」）；你需要具体的权限配置项或 MCP/工具接入细节（原文未给出）；你不接受把虚构公司与虚构数据的示例页当作参考基准。

做法 B 与做法 C 的差异：B 用 X 后台 analytics 页各 Tab 导出的数据，上传到 Claude Artifacts；C 用完整数据归档，在本地目录用 Claude Code 读取 `data/tweets.js`。B 更接近快速 dashboard 复盘，C 更接近本地文件 + 编码代理的内容分析入口；两者原文都没有给出完整分析提示词和效果验证。

做法 D 与做法 A 的差异：A 用语义层（`.gsql` 模型 + `.md` 页面）统一指标口径，产出是可复用的报表和 dashboard，前置是有一个受支持的数据源；D 用 `SKILL.md` 固化一类任务的流程与读写边界，产出多是可直接阅读分享的网页报告，前置只是一个 Claude Code 能读到的项目目录。两者可以并用：口径放 A 的语义层，流程放 D 的技能文件。D 与 B/C 的差异：B/C 是「读自己 X 数据」的两个具体入口，D 是通用任务框架，不针对某个数据源。

四套做法都不适用的情况：你需要定时或事件触发的自动运行（四篇原文均未给出可照做的调度配置）；你需要明确的数据源凭据配置、代理权限限定或回滚方案（原文均未说明）；你不接受先做小范围试用。

## 前置条件

- 做法 A：本机有 Node.js 与 npm/pnpm/yarn 之一；有一个受支持的数据源（本地文件可用 DuckDB，无需外部账号）；有一个编码代理（原文未指定具体代理）；有一个项目目录（可以是独立 repo，也可以是更大代码库里的一个目录）；使用 git 和编码代理是原文明确要求（除非改用其托管 Graphene Cloud）。
- 做法 B：一个可用的 X 账号并能访问 `https://x.com/i/account_analytics/overview`；一个可访问 Artifacts 的 Claude 账号（`https://claude.ai/artifacts`）；从 X 后台各 Tab 下载的数据文件。
- 做法 C：一个可登录的 X 账号；已申请并收到数据归档（原文说明归档可能需要一天到达）；解压后的归档目录中存在 `data/tweets.js`；本地有 Claude Code 使用环境。
- 做法 D：已安装 Claude Code，并有 Claude Pro、Max、Team、Enterprise 计划或 Claude Console 账号；有一个 Claude Code 能读到代码和数据的工程目录；愿意先读 `skills/<name>/SKILL.md` 确认读写边界再运行。
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

### 怎么选

- 需要长期复用、多人协作、统一口径、把分析纳入 git/CI：选做法 A。
- 只想快速复盘一个社交账号、不想写 SQL 或搭语义层：选做法 B。
- 想基于完整 X 归档在本地用编码代理读文件，并且愿意自己补分析提示词：选做法 C。
- 想固定「一类数据工程任务怎么做」（新数据源摸底、故障根因、对账、变更影响面），并且已经在用 Claude Code：选做法 D。
- B 与 C 的取舍：B 用后台各 Tab 导出上传到 Claude Artifacts，适合快速 dashboard 复盘；C 用完整归档 + 本地 Claude Code，适合本地文件分析入口，但原文只到读取文件，后续分析要自己设计。B 会把账号数据上传给第三方服务；C 在本地目录启动 Claude Code，但原文未讨论隐私与脱敏，试用时只处理脱敏副本，避免把归档上传到不需要的外部位置。
- A 与 D 的取舍：A 管口径，产出是报表和 dashboard；D 管流程与读写边界，产出多为网页报告。两者不冲突，可以先在 A 的 demo 项目上验证代理能不能稳定读模型、写页面，同时用 D 的 `profile` 技能做新数据源摸底。
- 先试哪个：想快速看到 AI 分析是否对自己有增量价值，先试 B 或 C 做一次轻量复盘；想验证「把流程固化成技能文件」是否减少重复交代，先试 D 的 `profile` 或 `incident`；如果已经在用编码代理且数据源受支持，再考虑 A。

## 怎么判断变好了

最小试用方式：

- 做法 A（半天内可完成）：①不接公司数据源，先用本地 DuckDB + 官方 demo 项目（example-flights），跑通 `graphene serve` 与页面渲染，确认代理能读懂随包的 agent skill。②把一个小型真实数据集接入为 `.gsql` 模型，只定义 2–3 个 dimension 和 2–3 个 measure（其中至少一个像 `aov` 这样由其他 measure 组合而成），验证点号遍历建模连接是否真的免写 JOIN。③让编码代理完成三个任务：回答一个数据问题、新建一个含至少一个 BigValue 和一个 BarChart 的 `.md` 页面、修改一次模型定义。全程记录代理是否需要人类纠正。
- 做法 B（第一次可先在一个 Tab 上试）：①先只下载一个 Tab 的数据，不做全量。②在 Claude Artifacts 新建 Dashboard，上传这一个文件。③用上面第 6 步的朴素提示词试跑。④如果这一步输出可用，再把其余 Tab 的数据补齐重跑一次。
- 做法 C（先只验证读取入口）：①复制一份归档数据，按原文步骤解压。②在归档目录打开 Claude Code，只用它读取 `data/tweets.js`。③确认它能正确识别文件结构和帖子字段后，再自行追加分析要求（例如先汇报字段、再基于字段做描述性统计）。原文没有给这些追加提示词，需在试用中自行设计并记录。
- 做法 D（连续两周、3–5 个真实任务）：①只选 1–2 个技能，优先 `profile` 或 `incident`。②在测试项目的 `.claude/skills` 里只放这两个，先不改写，直接跑一遍看默认行为。③然后按第 6 步把项目路径与标准写进 `SKILL.md`（或 `CLAUDE.md`），再跑一遍，比较改写前后的差别。④同时用人工方式（或另一位同事）独立完成同一件事，作为对照。⑤连续两周、用 3–5 个真实任务重复，记录每次结果。⑥通过后再逐个增加技能。

可观察的指标：

- 做法 A：代理首次生成查询的语法检查通过率，与让它直接写等价裸 SQL 相比需要几轮修正；同一个指标（如 revenue / aov）在 ≥2 个页面上是否算出同一数值（验证语义层是否真的统一了口径）；生成一个可用 dashboard 所需的对话轮次与 token 消耗，与让它写 python/JS 方案相比；代理产出的页面中需要人工手工调整样式/布局的比例；修改模型后，旧页面是否自动跟随更新而不需逐页改（体现「promote/demote logic into or out of the semantic layer」的价值）。
- 做法 B：输出的结论里是否包含具体数字（而不是「有所增长」这类空话）；是否给出可执行动作（能直接照着改发布时间、内容类型、互动策略等）；与自己手动翻后台对比，得出结论所花的时间是否明显缩短；换一份数据（比如换时间段或换另一个 Tab）重跑，结论是否跟着数据变化——如果两次输出几乎一样，说明它没有真的在分析数据。
- 做法 C：读取是否成功——Claude Code 能否稳定打开并解析 `data/tweets.js`；结构识别是否正确——它列出的字段、帖子数量级和样例是否与人工抽查一致；分析是否可复核——它给出的「高表现帖子」判断能否回到原始字段核对；是否产生可执行改进——能否据此形成具体的选题、开头、发布时机等调整建议，并与人工基线比较判断一致性和耗时；风险控制——是否只处理脱敏副本，是否避免把个人归档数据上传到不需要的外部位置。
- 做法 D：耗时——从「拿到失败运行 / 新数据源」到「写出可用的根因 / 画像」的分钟数，AI 组 vs 人工组；结论质量——根因是否正确、画像是否覆盖了后续建模真正用到的字段和边界案例，与人工独立结论的重合度与遗漏项数量；返工率——生成的页面有多少能直接发给同事，需要重写的段落比例；边界遵守——`SKILL.md` 里「绝不做什么」是否被遵守，有没有写到不该写的路径或表；稳定性——同一输入跑 3 次结论是否一致，不一致的地方是否正好是需要人判断的地方；可复用性——改写一次 `SKILL.md` 后，下一次同类任务是否不再需要重复交代背景（这直接检验「条件供给」是否到位）。同时保留失败案例：如果失败集中在「缺少某类输入」或「步骤写得不够具体」，那正好是决定要不要自己重写 `SKILL.md` 的依据——这时仓库的价值从「拿来用」转为「拿来当模板」。

试多久：做法 A 的最小试用半天内可完成；做法 B 先一个 Tab、一次对话即可判断是否有增量价值；做法 C 先验证一次读取和字段核对即可判断入口是否可用；做法 D 需要连续两周、3–5 个真实任务，才有足够样本和人工对照。以上指标若明显优于现有做法，再考虑写入手册或固化进复盘习惯；若差异不明显，则退回研究阶段。

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
- 共同：不要跳过最小试用直接接入关键业务数据。

## 证据与来源

做法 A 依据调研报告《Show HN: Graphene – Data analysis toolkit for your coding agent》。可核实的内容：可直接复制的 `.gsql` 模型定义示例与 `.md` 页面查询+图表示例（已放入操作步骤）；明确的 CLI 使用方式 `npm exec graphene serve`（含 pnpm 等变体）；支持的数据源清单（Snowflake、BigQuery、ClickHouse、Postgres、MotherDuck、本地 DuckDB）；能力清单（CLI 可运行/编译查询、渲染页面、检查语法、打印截图；Graphene SQL 遵循 ANSI 并支持 170+ 函数；页面支持 HTML/CSS/JS/ECharts 能表达的任何内容）；许可 Elastic License 2.0，内部使用永久免费，做商用应用需联系；社区热度 Hacker News 30 points、9 comments（样本很小）。只是作者主张、未被数据支撑的部分：「build visualizations 10x faster」「raises the floor so that pages look beautiful by default」「beats traditional BI」等性能/质量断言，均无基准测试或用户数据；「more accurate queries」「more consistent and polished visuals」为设计目标陈述，非实测结论。信息缺口与局限：从零安装的确切命令、setup 文档正文未在原文中给出，只能依赖 `/docs/setup.md`；未说明如何配置数据源凭据、如何限定代理权限、如何回滚，也未给出任何触发式/定时任务的配置；无成本、token 消耗、准确率、生成速度等任何量化证据。强前置条件：默认要求使用 git + 编码代理；不想用代理的人必须转向其托管服务；Elastic License 2.0 对商业再分发有限制。

做法 B 依据调研报告《@dotey: 有个用 Claude Dashboard 的用法…》。原文给了的：两个具体 URL（`https://x.com/i/account_analytics/overview`、`https://claude.ai/artifacts`）、一个明确的操作顺序（下载各 Tab 数据 → 新建 Dashboard → 上传附件 → 发给 Claude 分析）。这些是可照做的部分。原文没给的：分析用的提示词正文（被截断，只剩一个「>」）；任何分析结果、效果数据或案例；作者没有说明为什么这么用会比手动看后台更好，也没有给出任何量化收益。只是主张的部分：「用 Claude Dashboard 分析 X 数据」能带来什么价值，原文没有论证，只能算一个用法主张。互动数据 37 点赞、1 转发、44 回复，仅作为热度参考，不构成效果证据。原文未讨论隐私或数据规模上限，试用前需自行判断是否接受把账号数据上传给第三方。

做法 C 依据调研报告《@RoundtableSpace: Your X account already knows which of your posts work. You just never read the data.》。可核实的内容：X 归档下载入口 `Settings → Your account → Download an archive of your data`；原文说明归档可能需要一天到达；解压归档；归档目录中存在 `data/tweets.js`；在该目录中打开 Claude Code；起始提示词 `Read data/tweets.js.`。只是作者主张、未被数据支撑的部分：「你的 X 账号已经知道哪些帖子有效，只是你没读数据」没有给出验证。信息缺口与局限：读取之后的分析提示词被截断，没有给出分析输出样例、数据字段说明、内容策略结论或效果数据；没有给出验证方法、指标或对照结果；原文未讨论个人数据隐私与脱敏，也未涉及定时或事件触发。互动数据为点赞 104、转发 3、回复 12，只能说明有一定传播，不能证明方法有效。

做法 D 依据调研报告《DataWithBaraa/claude-code-data-engineering-skills》。可核实的内容：仓库地址与两条安装路径的确切命令（`git clone` + `cp -r` 到 `.claude/skills`；`/plugin marketplace add` + `/plugin install data-engineering@data-with-baraa`）；调用示例（`/profile data/landing/purchasing`、`/incident 2026-08-19`，插件前缀 `/data-engineering:profile`）；16 个技能的名称、一句话职责与六组场景分组；`SKILL.md` 的固定结构（任务 / 输入 / 步骤 / 输出 / 读什么 / 写什么 / 绝不做什么）；7 个技能有 YouTube 视频演示；`references/` 下有示例结果；`CLAUDE.md` 位于仓库根可直接复制；MIT 许可；`argument-hint` 兼容性说明；插件更新需手动。仓库指标 36 stars。只是作者主张、未经证实：技能的实际质量和步骤细度，「按标准逐轮评审 PR 并会提出反驳」「安全的改动顺序」等表述没有附带案例或对照；作者自述这是 first draft，会持续扩充。信息缺口与局限：提供的原文只有 README，没有 `SKILL.md` 正文，无法核对技能能否照做；效果验证完全空缺，没有任何数据、基线或前后对比；示例使用虚构公司与虚构数据；技能故意写得通用，需按自己项目改写；big-review 和 cost-review 依赖查询日志、incident 依赖运行记录；原文只到「技能名 + 一句话职责」的层面，没有定时调度、事件订阅或状态机的具体配置，也未给出具体权限配置项或 MCP/工具接入细节。本篇采用的最小试用方案（1–2 个技能、两周、3–5 个真实任务、人工对照）来自该报告的建议，尚未有任何实测结果支撑。

四篇调研的共同点：都没有给出可复现的量化收益数据；都需要小范围实测再决定是否纳入长期工作流。

## 依据的调研

- [Show HN: Graphene – Data analysis toolkit for your coding agent](../research/radar/2026-10-04/1165-show-hn-graphene-data-analysis-toolkit-for-your-co.md)：值得一试，用一个只含本地 DuckDB 的小项目跑通 Graphene 的完整闭环（写 .gsql 语义模型 → 在 .md 页面里 select 查询 + 图表组件 → `npm exec graphene serve` 起服务让编码代理自主迭代），重点验证它能否让代理在少纠正次数下稳定产出可用报表；理由是 README 给出了可直接复制的模型/查询代码和明确的 CLI 启动方式，属于可照做的流程，但缺少从零安装的完整命令和任何效果数据，需小范围实测再决定是否纳入手册。
- [@dotey: 有个用 Claude Dashboard 的用法，就是下载你的 X 数据，然后从 Artifacts（](../research/radar/2026-10-10/2399-claude-dashboard-x-artifacts.md)：值得一试，可以小范围试：把 X 账号后台（account analytics）各 Tab 的数据导出后作为附件上传到 Claude Dashboard/Artifacts 做复盘分析，流程本身可照做，但原文最关键的分析提示词被截断，需要自己补。
- [@RoundtableSpace: Your X account already knows which of your posts work. You just never read the data.](../research/radar/2026-10-29/8131-your-x-account-already-knows-which-of-your-posts-w.md)：值得一试，可以按原文小范围试通“X 归档 + Claude Code 读取 tweets.js”这一入口，但不要把它当成完整内容分析手册；原文只给了下载、解压和一条被截断的读取提示，缺少分析指令与验证指标。
- [DataWithBaraa/claude-code-data-engineering-skills](../research/radar/2026-10-30/8578-datawithbaraa-claude-code-data-engineering-skills.md)：值得一试，先在一个测试项目里挑 1–2 个技能（profile 或 incident）装进 .claude/skills 跑两周，对比人工完成同一任务的耗时与产出质量，再决定是否扩到全部 16 个；理由是仓库给出了可直接复制的安装和调用方式、每个 SKILL.md 都固定声明读写边界，但原文只有 README、看不到技能正文，且作者自述为首版草稿、无任何效果数据。
