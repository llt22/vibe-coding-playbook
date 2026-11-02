# wendersoon/radar-cnpj-mcp

- 结论：**值得一试**。按 README 给出的两条命令即可把巴西 CNPJ 公开数据装成本地库并接进 Claude Code / Cursor 等 agent，值得在“给 AI 接真实数据源”这类需求上小范围试用；但它只覆盖巴西企业注册数据，收益取决于你的工作是否涉及该市场，且“毫秒级、70M+、几秒下载”等均为作者陈述、未独立验证。
- 原文：https://github.com/wendersoon/radar-cnpj-mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T14:02:36.243Z

## 是什么

radar-cnpj-mcp 是一个 Node.js（要求 >= 20）写的 MCP server + CLI，把巴西联邦税务局（Receita Federal）公开的 CNPJ 企业注册数据（README 称 7000 万+  establishments，原始文件数 GB）转成本地数据库，再以 MCP 工具的形式提供给 AI agent 查询。

它同时提供三种使用面：

- **MCP 工具（给 agent）**：`buscar_empresas`、`contar_empresas`、`buscar_cnae`、`buscar_municipio`、`detalhar_empresa`、`exportar_csv`、`status_base`。
- **CLI（给人/脚本）**：`contar`、`buscar`、`status` 等子命令。
- **Resources**：`radar://status`、`radar://cnaes`、`radar://municipios/{uf}`、`radar://empresa/{cnpj}`，可挂到对话里做上下文。

支持过滤器：CNAE（精确或前缀、主/次活动）、UF、市、区、CEP、注册状态、成立日期、规模（porte）、MEI、 matriz/filial、注册资本、是否有电话或邮箱。License MIT，README 带 CI badge，仓库 36 stars。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**步骤 0｜前提**
- Node.js 20 或以上。
- 明确你要覆盖的州（UF），只下载需要的州以控制体积。
- 用于 B2B 勘探/市场摸底场景（README 的定位是“你卖东西给企业，想知道区域内有哪些潜在客户”）。

**步骤 1｜下载目标州的数据库**（从作者预构建的 radar-cnpj-dados 取，README 称“几秒”）

```sh
npx -y radar-cnpj-mcp baixar --ufs SP,MG
```

**步骤 2｜接入 agent**

Claude Code：

```sh
claude mcp add radar-cnpj -- npx -y radar-cnpj-mcp
```

Claude Desktop / Cursor / VS Code 等，在其 MCP 配置里加：

```json
{
  "mcpServers": {
    "radar-cnpj": {
      "command": "npx",
      "args": ["-y", "radar-cnpj-mcp"]
    }
  }
}
```

**步骤 2'（可选）｜改用全局安装**

```sh
npm install -g radar-cnpj-mcp
radar-cnpj-mcp baixar --ufs SP,MG
claude mcp add radar-cnpj -- radar-cnpj-mcp
```

```json
{
  "mcpServers": {
    "radar-cnpj": { "command": "radar-cnpj-mcp" }
  }
}
```

更新工具：`npm update -g radar-cnpj-mcp`。

**步骤 3｜（备选数据源）直接从 Receita Federal 导入尚未进入预构建数据集的月份**
- 前提：去 arquivos.receitafederal.gov.br 的 Dados › Cadastros › CNPJ 下载该月目录（README 称约 7 GB）。

```sh
npx -y radar-cnpj-mcp importar ~/Downloads/2026-10 --ufs SP,MG
```

README 提示：导入会读取税务局的全部文件，即使只处理一个州也要几分钟。

**步骤 4｜按“先定位代码、再计数、再拉明细、最后导出”的顺序向 agent 提问**（README 的示例问题就是这个套路）
- 用 `buscar_cnae` 把口语化活动翻译成 CNAE 代码；
- 用 `contar_empresas` 按 UF/市/区/CNAE/规模/MEI/年份聚合；
- 用 `buscar_empresas` 取明细（CNPJ、razão social、活动、地址、联系方式）；
- 用 `exportar_csv` 出 Excel 可读的表格。

README 给出的可直接照搬的问题模板：

```text
Quantas oficinas mecânicas ativas existem em Campinas?
Liste academias abertas desde 2025 em Santo André, sem MEI, com telefone.
Em quais cidades de SP há mais clínicas odontológicas?
Exporte para CSV os restaurantes do bairro Pinheiros.
```

README 也提供了快捷 prompt：`prospectar`、`dimensionar_mercado`、`empresas_novas`；在 Claude Code 中变成 `/radar-cnpj:prospectar` 这类命令。

**步骤 5｜用 CLI 做交叉校验（不经过 agent，验证 agent 答案）**

```sh
npx radar-cnpj-mcp contar --cnae 4520-0/01 --uf SP --agrupar municipio
npx radar-cnpj-mcp buscar --cnae 4520-0/01 --municipio Campinas --sem-mei --limite 20
npx radar-cnpj-mcp buscar --cnae 4520 --municipio Campinas --csv oficinas.csv
npx radar-cnpj-mcp status
npx radar-cnpj-mcp --help
```

**步骤 6｜维持数据新鲜度**
- README：每月重跑一次 `baixar` 更新数据库。
- 用 `status_base` / `npx radar-cnpj-mcp status` 确认参考月份和已导入的 UF，再信任任何数字。

**步骤 7｜遵守隐私默认与合规**
- 默认隐藏 MEI 的电话与邮箱（README 的理由：通常就是自然人本人的联系方式）。
- 进行 B2B 接触时遵守 LGPD：报价要与对方的活动相关，并提供“不再联系”的渠道。

**步骤 8｜（如果要改代码/自己维护）开发流程**

```sh
npm install
npm test           # 测试
npm run lint       # Biome
npm run typecheck
npm run build
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
README 展示了一类此前很少想到交给 AI 的工作：区域市场摸底——把“这个城市有多少家某类企业、按区/规模/MEI 分布如何、名单能不能直接导出”从人工查税务局原始 CSV 或买商业数据库，变成 agent 一句话可答。它同时提示了一个能力边界：**语义到代码的转换（“oficina mecânica”→CNAE 4520-0/01）由 agent 做，精确聚合由本地库做**，这种“模型负责翻译、数据层负责算数”的分工是可以迁移到其他领域的模式。

**2. 任务匹配**
- 模型（agent）承担的：理解自然语言、把活动描述映射到 CNAE、选择工具与参数、组织答案。
- 工具/数据层承担的：精确计数、过滤、导出。
- 工具被刻意拆窄（检索、计数、代码查询、市查询、明细、导出、状态），而不是一个万能查询接口——这是“给 agent 设计工具粒度”的可照抄样例。
- 常见流程被固化成 prompt：`prospectar`、`dimensionar_mercado`、`empresas_novas`。

**3. 条件供给**
README 明确列出了要让 agent 干成这件事需要供给的东西，可直接当清单用：
- **数据**：预先下载到本地的按州数据文件（`baixar --ufs`），或从原始档案导入（`importar`）；
- **接入配置**：一条 `claude mcp add` 或一段 JSON 的 `mcpServers` 配置；
- **工具 schema**：7 个工具的输入/过滤器定义（CNAE 精确/前缀、UF、市、区、CEP、状态、日期、porte、MEI、matriz/filial、资本、有无电话邮箱）；
- **领域字典**：`radar://cnaes` 让 agent 能查代码而不是猜；
- **状态反馈**：`status_base` / `radar://status` 提供数据月份与已导入 UF，让 agent 能自报数据新鲜度；
- **权限边界**：默认隐藏 MEI 联系方式。

**4. 主动推进**
README 只有一处时间触发：每月重跑 `baixar` 更新底层数据。原文没有描述事件触发、状态触发或持续后台执行的工作流（没有 cron/webhook/监听机制的说明），因此这一维度只能算“半个依据”。

**5. 效果验证**
README 未给出任何验证指标或基准测试。唯一可当基线的是示例答案本身：Campinas 有 2.301 家 CNAE 4520-0/01 活跃机构，其中 1.407 家 MEI、783 家微企——但这些数字未标注参考月份，只能作为“结果形态”的示例，不能当验收标准。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（清单状态 adopt）**：README 直接给出 `claude mcp add radar-cnpj -- npx -y radar-cnpj-mcp`，并说明 prompt 在 Claude Code 里会变成 `/radar-cnpj:prospectar` 这类斜杠命令。这是给已有的 Claude Code 用法补一个“接本地真实数据”的具体接法。
- **Cursor（清单状态 watch）**：README 把 Cursor 列为 JSON 配置的适用对象之一（与 Claude Desktop、VS Code 并列），但只给了通用 `mcpServers` 片段，没有 Cursor 专属步骤或验证，因此不能据此提升 Cursor 在清单中的状态。
- 清单中没有其他“MCP 数据服务 / 本地数据库接 agent”类条目可供对比。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的可核查材料**：完整的安装与接入命令、7 个 MCP 工具及职责表、过滤器清单、4 条示例问题与 1 组示例答案、CLI 示例、开发脚本、隐私默认行为、MIT 许可、CI badge、36 stars。

**仅为作者主张、未经独立验证的**：
- “毫秒级查询，即使在全巴西范围”；
- “7000 万+ establishments”；
- “几秒下载”（依赖作者维护的 radar-cnpj-dados 预构建集）；
- “导入几分钟”（依赖机器与文件大小）；
- 示例数字 2.301 / 1.407 / 783 无参考月份、无口径说明。

**局限与适用条件**：
- 只覆盖巴西 CNPJ 数据，离开巴西 B2B 场景基本无用；
- 需要 Node ≥ 20；
- 本次只读到 README，未读源码与测试，导入耗时、磁盘占用、内存需求、数据更新延迟、与税务局原始数据的一致性均未验证；
- 默认隐藏 MEI 电话/邮箱，会限制“按电话名单外呼”这类用法，需要显式处理；
- LGPD 合规责任在使用者，工具只给了默认遮蔽和一句提示。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天内可完成）**
1. 在一台 Node ≥ 20 的机器上，只下 1 个州：`npx -y radar-cnpj-mcp baixar --ufs <你的目标州>`。
2. 先只走 CLI，不接 agent：用 `status` 确认月份，用 `contar` 跑一个你已知答案的细分行业做校准。
3. 再用 `claude mcp add`（或那段 JSON）接进 agent，同一个问题问一遍，把 agent 答案与 CLI 结果并排比对。
4. 跑三类代表性任务：①纯计数（市场容量）；②条件筛选 + 导出（名单）；③口语活动 → CNAE 映射（考察语义翻译）。
5. 与现状对照：如果现在靠人工查税务局 CSV 或买第三方数据，记录同样任务所花的时间与人力。

**判断“有没有改善”的指标**
- **正确性**：agent 给出的计数是否与 CLI 同参数结果一致（不一致即工具选择或参数出错）；CNAE 映射是否与人工核对一致（记录命中率/需要纠正的次数）。
- **效率**：从提问到拿到可用名单的时间、人工干预轮数；与现有做法（手工查/买数据）同任务耗时对比。
- **可用性**：导出 CSV 的行数与字段完整度是否满足下游（是否有 CNPJ、活动、地址、联系方式）；需要电话/邮箱的字段中 MEI 被遮蔽的比例。
- **数据时效**：`status` 显示的参考月份是否满足业务要求，每月重跑 `baixar` 的成本是否可接受。
- **停止条件**：如果 CNAE 映射频繁出错、或你的业务根本不需要巴西企业数据，则不必继续，只把“本地数据 + MCP 窄工具 + 状态资源”这个结构作为模式参考即可。
