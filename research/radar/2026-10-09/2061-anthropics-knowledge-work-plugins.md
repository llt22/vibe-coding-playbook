# anthropics/knowledge-work-plugins

- 结论：**值得一试**。先挑一个与本职最接近的插件（如数据岗用 data、销售岗用 sales），按原文两条命令装好、跑通一个斜杠命令，再打开它的 skills/ 文件按团队真实流程改一条；因为原文给出了可直接复制的安装命令和明确的插件目录结构，属于可照做的最小动作，但 README 只有“更好更一致”的主张、没有任何效果数据，不足以直接 adopt。
- 原文：https://github.com/anthropics/knowledge-work-plugins
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T16:32:59.387Z

## 是什么

Anthropic 开源的 11 个知识工作插件集（knowledge-work-plugins），目标是把 Claude 变成特定职能的“专家”。原文定位：每个插件面向一个具体 job function，打包该职能需要的 **skills**（Claude 在相关时自动调用的领域知识、最佳实践、分步工作流）、**commands**（你显式触发的斜杠命令）、**connectors**（通过 MCP server 连接的外部工具，如 CRM、项目跟踪器、数据仓库、设计工具）以及 sub-agents。

官方定位是“Claude Cowork”产品（可在 claude.com/plugins 安装），同时兼容 Claude Code。全部组件基于文件（markdown + JSON），原文明确说“no code, no infrastructure, no build steps”。

11 个插件及各自声称的用途（原文表格）：productivity（任务/日历/日常流程/个人上下文）、sales（客户调研、通话准备、pipeline 复盘、外联起草、竞品 battlecard）、customer-support（工单分类、回复起草、升级打包、客户背景调研、把已解决问题转成知识库文章）、product-management（写 spec、路线图、用户研究综合、干系人同步、竞品跟踪）、marketing（内容起草、活动规划、品牌语气、竞品 brief、跨渠道效果汇报）、legal（合同审查、NDA 分类、合规、风险评估、会议准备、模板化回复）、finance（分录准备、对账、报表生成、差异分析、结账管理、审计支持）、data（写 SQL、统计分析、搭看板、分享前自检）、enterprise-search（跨邮件/聊天/文档/wiki 一次查询）、bio-research（临床前研究工具与数据库：文献检索、基因组分析、靶点优先级）、cowork-plugin-management（为组织定制或新建插件）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：你需要能使用 Claude Code（有 `claude` CLI）或访问 claude.com/plugins 的 Cowork。原文未说明 Cowork 的开放范围、价格或区域限制，也未说明仓库许可协议——自行确认后再用于生产。

1. **（Claude Code 路径）先添加 marketplaces**：

```bash
# Add the marketplace first
claude plugin marketplace add anthropics/knowledge-work-plugins
```

2. **安装具体插件**（以 sales 为例）：

```bash
# Then install a specific plugin
claude plugin install sales@knowledge-work-plugins
```

3. **验证已激活**：原文称安装后插件自动激活——“Skills fire when relevant, and slash commands are available in your session”。在会话里确认对应斜杠命令出现，例如 `/sales:call-prep`、`/data:write-query`、`/finance:reconciliation`、`/product-management:write-spec`。若命令不出现，说明插件未生效，先回到第 1 步检查 marketplace。

4. **（Cowork 路径）**：直接从 https://claude.com/plugins/ 安装，或在 GitHub 浏览完整集合。

5. **读懂结构再改**。原文给出的统一结构：

```
plugin-name/
├── .claude-plugin/plugin.json   # Manifest
├── .mcp.json                    # Tool connections
├── commands/                    # Slash commands you invoke explicitly
└── skills/                      # Domain knowledge Claude draws on automatically
```

对应关系：`skills/` 放领域知识和工作流（Claude 自动取用）；`commands/` 放你显式触发的动作；`connectors`（`.mcp.json`）通过 MCP server 接你职能依赖的外部工具；`plugin.json` 是清单。

6. **按原文给的四个方向定制**（原文 “Making Them Yours”）：
   - **换 connector**：编辑 `.mcp.json`，指向你自己的工具栈（前提：知道自家工具栈的 MCP 接入方式或已有 MCP server）。
   - **加公司上下文**：把你的术语、组织结构、流程写进 skill 文件，让 Claude 理解你的语境。
   - **调工作流**：改 skill 指令，让流程匹配你团队的实际做法，而不是教科书做法。
   - **建新插件**：用 `cowork-plugin-management` 插件，或直接照上面的目录结构为未覆盖的角色/流程新建。

7. **贡献回仓库**（可选）：原文说插件就是 markdown 文件，fork 后改，提 PR。

**注意**：原文只给了上述总体步骤和目录结构，**没有**收录任何单个插件的具体 skill 内容、提示词全文或命令清单。要照做必须自己打开仓库对应目录去读——这一步材料里没有。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文明文列出了各职能已可交给 Claude 的工作，等于一份“可以直接派活的清单”，例如 legal 的“审合同、NDA 分类、合规、风险评估、会议准备、模板化回复”，data 的“写 SQL、统计分析、搭看板、分享前自检”，finance 的“分录、对账、报表、差异分析、结账、审计支持”。这为“AI 还能做哪些你想不到交给它的活”提供了按职能枚举的入口。
- **任务匹配**：原文明确区分了两种任务形态——`skills` 是“相关时自动触发”的领域知识，`commands` 是“你显式触发”的斜杠命令；不同职能对应不同插件、不同 connector 组合。原文举的命令示例 `/sales:call-prep`、`/data:write-query` 直接体现了“这类工作用这种调用方式”。
- **条件供给**：原文把需要供给的东西写得很清楚——外部工具连接（.mcp.json / MCP servers）、公司上下文（术语、组织结构、流程）、工作流指令（skill 内的分步做法）。原文还指出“你定义的上下文会被烘焙进每一次相关交互”，即供给是一次性投入、持续复用。
- **主动推进**：只有部分依据。原文称 “plugins activate automatically”“Skills fire when relevant”，属于“上下文/状态相关即触发”；但**没有**提到按时间、事件或状态持续执行的循环任务、定时任务或后台流程，这一条依据不足。
- **效果验证**：原文**没有**给出任何验证方法或指标，只有“better and more consistent outcomes”“spend less time enforcing processes”这类主张。本条无依据。

## 与已有做法的关系（对照给出的清单条目）

清单中相关条目：**Claude Code**（kind: tool，status: adopt）。

关系是叠加而非替代：本仓库明确“also compatible with Claude Code”，并给出 `claude plugin marketplace add` / `claude plugin install` 两条命令，即在你已采用的 Claude Code 之上，加上一层“插件市场 + 按职能打包的 skills/commands/connectors”。换句话说，已有做法解决“用 Claude Code 干活”，本仓库解决“把某个职能的领域知识、工具连接和固定动作预先打包好，让团队复用”。清单中其余条目原文均未提及。

## 证据与局限

**原文给出的可核信息**：仓库 star 27360、今日 +309（来自 metrics）；11 个插件各自的用途与 connector 名单（逐一列名，如 sales 接 Slack、HubSpot、Close、Clay、ZoomInfo、Notion、Jira、Fireflies、Microsoft 365）；统一的目录结构；两条 Claude Code 安装命令；Cowork 侧的安装入口。

**只是作者主张**：插件能带来“更好、更一致的结果”；“让 Claude 像专为你的团队打造一样工作”；“你可以少花时间执行流程、多花时间改进流程”。这些都没有数据、案例、benchmark 或对比支撑。

**局限**：

1. 本文是 README，不含任何单个插件的 skill 正文、提示词、命令清单，因此**无法从这份材料判断实际质量**，也无法照抄具体提示词。
2. 未说明 Cowork 的可用性、价格或区域限制；未说明仓库许可协议。
3. 原文自称“these plugins are generic starting points”，即开箱效果有限，价值取决于你是否投入定制（换 connector、补公司上下文、改工作流）。
4. 材料可能被截断（例如各插件子目录的具体内容、sub-agents 的说明均未出现），上述判断仅基于所给 README 文本。

**适用条件**：团队已用 Claude Code 或可用 Cowork；所需外部工具能通过 MCP 接入；有人愿意花时间读 skills 文件并按本团队流程改写。不具备这些条件时，只能停在“看看”。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 选一个和你当前工作最贴近的插件（数据岗选 data，销售选 sales，法务选 legal，等等），执行第 1、2 步的两条命令装上。
2. 只做两件事：跑一个对应斜杠命令（如 `/data:write-query`），以及观察一次技能是否在相关提问时自动触发。
3. 打开该插件的 `skills/` 目录读一遍，挑其中一条指令，改成你团队的真实流程（例如把“教科书式对账流程”换成你们实际用的审批链）。再跑一次同样的任务。

**判断有没有改善的指标（原文没给官方指标，全部自测）**

- 同一任务的**完成时间**：装插件前后各记一次。
- **返工次数**：你需要手动修正、重写输出的次数是否下降。
- **补齐上下文的次数**：是否还需要你在对话里反复解释同样背景（原文的诉求正是“少重复自己”）。
- **命令是否真的可用**：`/xxx:yyy` 在会话中是否出现并成功执行——这是最硬的通过/不通过信号。

建议先记录 2–3 次基线再对照。若上述指标没有可感知改善，说明开箱插件对你不合适，价值在定制，应把精力放到第 6 步而不是继续试更多插件。
