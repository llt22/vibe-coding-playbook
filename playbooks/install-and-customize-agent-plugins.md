# 让 AI 按你团队的职能流程干活：安装并改写知识工作插件

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决每次用 AI 做职能工作时都要重复交代领域知识、工具连接和固定流程，且输出不符合团队实际做法的问题。
> 先试这一步：先挑一个与你当前工作最接近的插件（如数据岗选 data、销售选 sales、法务选 legal），用两条命令装好，跑通一个斜杠命令，再打开它的 skills/ 文件按自己团队的真实流程改一条。
> 最近修订：2026-10-09

## 解决什么问题

你已经在用 Claude Code 或 Cowork，但每次让 AI 做某个职能的活（写 SQL、准备客户通话、审合同、对账等），都要重新解释领域知识、反复交代公司上下文、手动把外部工具的数据贴进去，而且 AI 给出的流程往往是教科书做法，不是你团队实际的做法。Anthropic 开源了 11 个知识工作插件（anthropics/knowledge-work-plugins），把某个职能需要的 **skills**（Claude 在相关时自动调用的领域知识、最佳实践、分步工作流）、**commands**（你显式触发的斜杠命令）、**connectors**（通过 MCP server 连接的外部工具）和 sub-agents 预先打包。本手册解决的就是：如何选一个插件、装好、跑通，并把它按你团队的真实流程改一条，让 AI 少让你重复交代，多按你的流程干活。

## 适用与不适用

**适用**：
- 团队已用 Claude Code（有 `claude` CLI）或可用 claude.com/plugins 的 Cowork。
- 所需外部工具能通过 MCP 接入（或你已有 MCP server）。
- 有人愿意花时间读插件的 `skills/` 文件，并按本团队流程改写。
- 你希望把某个职能的领域知识、工具连接和固定动作预先打包，让团队复用。

**不适用**：
- 不具备上述条件时，只能停在“看看”。
- 期望开箱即用、不做任何定制就大幅改善。原文自称 “these plugins are generic starting points”，价值取决于你是否投入定制。
- 需要先看到效果数据、案例或 benchmark 才决定采用。原文只有“更好更一致”的主张，没有效果数据。
- 无法确认 Cowork 的开放范围、价格、区域限制，或无法确认仓库许可协议，且要用于生产。

## 前置条件

1. 能使用 Claude Code（有 `claude` CLI）或访问 claude.com/plugins 的 Cowork。原文未说明 Cowork 的开放范围、价格或区域限制。
2. 自行确认仓库许可协议后再用于生产。
3. 若要换 connector，需要知道自家工具栈的 MCP 接入方式，或已有 MCP server。
4. 能读懂 markdown 和 JSON 文件，愿意按团队真实流程改 skill 指令。
5. 建议先记录 2–3 次基线（同一任务的完成时间、返工次数、补齐上下文的次数），再装插件对照。

## 操作步骤

### 第 1 步：选一个与你当前工作最接近的插件

原文列出 11 个插件及各自声称的用途：productivity（任务/日历/日常流程/个人上下文）、sales（客户调研、通话准备、pipeline 复盘、外联起草、竞品 battlecard）、customer-support（工单分类、回复起草、升级打包、客户背景调研、把已解决问题转成知识库文章）、product-management（写 spec、路线图、用户研究综合、干系人同步、竞品跟踪）、marketing（内容起草、活动规划、品牌语气、竞品 brief、跨渠道效果汇报）、legal（合同审查、NDA 分类、合规、风险评估、会议准备、模板化回复）、finance（分录准备、对账、报表生成、差异分析、结账管理、审计支持）、data（写 SQL、统计分析、搭看板、分享前自检）、enterprise-search（跨邮件/聊天/文档/wiki 一次查询）、bio-research（临床前研究工具与数据库：文献检索、基因组分析、靶点优先级）、cowork-plugin-management（为组织定制或新建插件）。

**做法**：数据岗选 data，销售选 sales，法务选 legal，以此类推。只挑一个，不要一次装多个。**预期结果**：你有一个明确的插件名（例如 `sales`），后面命令里会替换。

### 第 2 步：安装（做法 A / 做法 B）

**做法 A：用 Claude Code 安装**（前提：已安装 `claude` CLI 并能使用 Claude Code）

先添加 marketplace：

```bash
# Add the marketplace first
claude plugin marketplace add anthropics/knowledge-work-plugins
```

再安装具体插件（以 sales 为例）：

```bash
# Then install a specific plugin
claude plugin install sales@knowledge-work-plugins
```

把 `sales` 换成你第 1 步选的插件名。**预期结果**：原文称安装后插件自动激活——“Skills fire when relevant, and slash commands are available in your session”。

**做法 B：用 Cowork 安装**（前提：能访问 claude.com/plugins）

直接从 https://claude.com/plugins/ 安装，或在 GitHub 浏览完整集合。

**怎么选**：如果你已经在用 Claude Code，走做法 A；如果你用 Cowork，走做法 B。原文未说明 Cowork 的开放范围、价格或区域限制，选之前自行确认。

### 第 3 步：验证插件已激活

在会话里确认对应斜杠命令出现，例如 `/sales:call-prep`、`/data:write-query`、`/finance:reconciliation`、`/product-management:write-spec`。

**预期结果**：命令出现在会话中，并且能成功执行。**失败处理**：若命令不出现，说明插件未生效，先回到第 2 步检查 marketplace 是否添加成功。

### 第 4 步：读懂插件结构再改

原文给出的统一结构：

```
plugin-name/
├── .claude-plugin/plugin.json   # Manifest
├── .mcp.json                    # Tool connections
├── commands/                    # Slash commands you invoke explicitly
└── skills/                      # Domain knowledge Claude draws on automatically
```

对应关系：
- `skills/` 放领域知识和工作流，Claude 在相关时自动取用。
- `commands/` 放你显式触发的动作（斜杠命令）。
- `connectors`（`.mcp.json`）通过 MCP server 接你职能依赖的外部工具。
- `plugin.json` 是清单。

**注意**：原文只给了总体步骤和目录结构，**没有**收录任何单个插件的具体 skill 内容、提示词全文或命令清单。要照做必须自己打开仓库对应目录去读。

### 第 5 步：按原文给的四个方向定制

前提：你已经打开对应插件的 `skills/` 或 `.mcp.json` 文件。

1. **换 connector**：编辑 `.mcp.json`，指向你自己的工具栈。前提：知道自家工具栈的 MCP 接入方式或已有 MCP server。
2. **加公司上下文**：把你的术语、组织结构、流程写进 skill 文件，让 Claude 理解你的语境。
3. **调工作流**：改 skill 指令，让流程匹配你团队的实际做法，而不是教科书做法。
4. **建新插件**：用 `cowork-plugin-management` 插件，或直接照上面的目录结构为未覆盖的角色/流程新建。

**预期结果**：Claude 在相关交互中自动取用你改过的知识和流程；你用斜杠命令触发时，输出更贴近团队实际做法。

### 第 6 步：最小试用（半天内可完成）

1. 选一个和你当前工作最贴近的插件（数据岗选 data，销售选 sales，法务选 legal，等等），执行第 2 步装上。
2. 只做两件事：跑一个对应斜杠命令（如 `/data:write-query`），以及观察一次技能是否在相关提问时自动触发。
3. 打开该插件的 `skills/` 目录读一遍，挑其中一条指令，改成你团队的真实流程（例如把“教科书式对账流程”换成你们实际用的审批链）。再跑一次同样的任务。

### 第 7 步：贡献回仓库（可选）

原文说插件就是 markdown 文件，fork 后改，提 PR。

## 怎么判断变好了

原文**没有**给出任何验证方法或指标，只有“better and more consistent outcomes”“spend less time enforcing processes”这类主张。以下全部是自测指标，来自本次调研报告的建议。

**可观察的指标**（装插件前后各记一次）：
- 同一任务的**完成时间**。
- **返工次数**：你需要手动修正、重写输出的次数是否下降。
- **补齐上下文的次数**：是否还需要你在对话里反复解释同样背景（原文的诉求正是“少重复自己”）。
- **命令是否真的可用**：`/xxx:yyy` 在会话中是否出现并成功执行——这是最硬的通过/不通过信号。

**最小试用方式**：按第 6 步做，只跑一个命令、观察一次自动触发、改一条 skill 指令再跑一次。**试多久**：建议先记录 2–3 次基线再对照，整个最小试用半天内可完成。

**判断**：若上述指标没有可感知改善，说明开箱插件对你不合适，价值在定制，应把精力放到第 5 步而不是继续试更多插件。

## 常见坑

- **原文只有 README**：不含任何单个插件的 skill 正文、提示词、命令清单，因此无法从这份材料判断实际质量，也无法照抄具体提示词。要照做必须自己打开仓库对应目录去读。
- **未说明 Cowork 的可用性、价格或区域限制**；未说明仓库许可协议。用于生产前自行确认。
- **开箱效果有限**：原文自称“these plugins are generic starting points”，即开箱效果有限，价值取决于你是否投入定制（换 connector、补公司上下文、改工作流）。
- **没有效果数据**：原文只有“更好、更一致”“少花时间执行流程、多花时间改进流程”等主张，没有数据、案例、benchmark 或对比支撑。
- **命令不出现 = 未生效**：先回到第 2 步检查 marketplace，不要继续往下做。
- **材料可能被截断**：各插件子目录的具体内容、sub-agents 的说明均未在材料中出现；上述判断仅基于所给 README 文本。
- **不要一次装多个插件**：先挑一个跑通、改一条，再考虑扩展。

## 证据与来源

- **安装命令、目录结构、四个定制方向**：来自调研报告《anthropics/knowledge-work-plugins》所引原文 README。原文给出两条 Claude Code 安装命令（`claude plugin marketplace add anthropics/knowledge-work-plugins`、`claude plugin install sales@knowledge-work-plugins`）和统一目录结构，以及 “Making Them Yours” 的四个定制方向。
- **11 个插件及用途**：来自原文表格，逐一列名。
- **插件自动激活、Skills fire when relevant**：原文主张，调研报告引用。**仅为作者主张**，无数据支撑。
- **Star 数据**：原文 metrics 显示仓库 star 27360、今日 +309。这是可核信息，但只反映关注度，不反映实际工作效果。
- **自测指标（完成时间、返工次数、补齐上下文次数、命令可用性）**：原文没有官方指标；这些是调研报告在“怎么试、怎么验证”中建议的自测方式，属于本次调研作者的建议，不是原文数据。
- **效果主张（“更好、更一致”“少花时间执行流程”等）**：原文作者主张，无数据、案例、benchmark 或对比支撑。调研报告明确指出本条无依据。
- **适用条件与局限**：来自调研报告对原文的解读，包括：README 不含单个插件具体内容；未说明 Cowork 开放范围/价格/区域限制；未说明仓库许可协议；原文自称通用起点；材料可能被截断。
- **与已有做法的关系**：调研报告指出，本仓库与清单中的 Claude Code（kind: tool，status: adopt）是叠加关系，原文明确“also compatible with Claude Code”，即在已采用的 Claude Code 之上加一层“插件市场 + 按职能打包的 skills/commands/connectors”。清单中其余条目原文均未提及。

## 依据的调研

- [anthropics/knowledge-work-plugins](../research/radar/2026-10-09/2061-anthropics-knowledge-work-plugins.md)：值得一试，先挑一个与本职最接近的插件（如数据岗用 data、销售岗用 sales），按原文两条命令装好、跑通一个斜杠命令，再打开它的 skills/ 文件按团队真实流程改一条；因为原文给出了可直接复制的安装命令和明确的插件目录结构，属于可照做的最小动作，但 README 只有“更好更一致”的主张、没有任何效果数据，不足以直接 adopt。
