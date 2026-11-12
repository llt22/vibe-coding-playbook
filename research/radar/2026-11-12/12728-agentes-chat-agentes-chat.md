# agentes-chat/agentes-chat

- 结论：**值得一试**。建议小范围自建试用：用频道、代理角色、审批和例行任务搭一个低风险可观察工作流，再与人工基线比较；理由是 README 给出了安装命令和较具体的权限、调度、审批机制，但缺少效果数据，且多项关键功能仍是 Beta。
- 原文：https://github.com/agentes-chat/agentes-chat
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T02:18:21.540Z

## 是什么
agentes.chat 是开源、可自托管的 Slack 替代品，让团队和 AI agent 在频道、线程和 DM 中一起工作。README 称 agent 是 workspace 成员，不是侧边栏机器人；每个 agent 有角色、instructions、模型、月预算和所有者，可用 Claude、OpenAI、Gemini、DeepSeek、Kimi、Z.ai、MiniMax 或 OpenRouter 模型，使用 MCP 工具，拥有独立电脑和浏览器，并支持例行任务、记忆、审批、技能、wiki、Drive、任务板和邮件。云版和自托管据称运行同一代码库，自托管用 Docker 一条命令，Postgres 是唯一依赖。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
前提：Linux 服务器；Docker（安装脚本会询问后安装）；README 默认把服务放进 Tailscale 网络并配私有 HTTPS，约 10 分钟；也可用公共域名加 Caddy。组织需自备模型 key。以下按 README 可执行项排列，未展开的 SELF_HOSTING.md 细节需另读原文。

1. 自建服务。在 Linux 服务器运行：
```sh
curl -fsSL https://agentes.chat/install | sh
```
前提：允许脚本安装缺失组件，并在询问时确认安装 Docker；需要私有 HTTPS 时要能接入 Tailscale。README 称约 10 分钟完成。

2. 添加组织模型 key。在应用内为组织添加 Claude、OpenAI、Gemini、DeepSeek、Kimi、Z.ai、MiniMax 或 OpenRouter 的 key；云版则直接注册 agentes.chat。前提：准备对应供应商 key；每个 agent 设月预算，README 称每次调用前检查预算。

3. 创建 agent。为 agent 设角色、instructions、模型、月预算和所有者；所有者接收审批和预算告警。前提：先划清职责、审批人和预算上限，不要先给宽权限。

4. 连接 MCP 工具。组织一次连接 MCP server：官方 Linear、Sentry、Notion、Stripe 可一键连接，其他可用 URL；每个 agent 只授予所需 scope。若有 Composio key，可连 Google Drive、Calendar、Sheets、Docs、Slack、Microsoft Teams、OneDrive、HubSpot、Salesforce、Zendesk、Asana、Figma、Intercom、Dropbox、Square 及多个社交/WhatsApp Business 连接器。前提：按最小权限给 scope。

5. 配置审批。Merge、deploy、rollback 以及 connector 标记为敏感的动作，会等 agent 所有者或 admin 在聊天中以卡片批准；批准动作只按批准内容执行一次。前提：指定 owner/admin，并把审批当检查点而非橡皮图章。

6. 配置 routines。让 agent 按计划触发（README 例子是 every weekday at 9am）或按事件触发（GitHub pull request、Sentry issue、新任务、来信），交付到频道、DM 或 Drive。前提：先有明确事件源和交付位置。

7. 按需接执行环境。agent computer 跑在 runner 所在机器：默认是服务器本身，也可连接服务器、VM 或笔记本；browser 为 Beta，可看直播、接管登录或 captcha，再附注交还；Claude Code 和 Codex 可在连接电脑上用已登录计划运行，Codex 仍在测试；Postgres connector 为 Beta，只读 SQL，单条解析语句、只读事务、限时限额；mailboxes 为 Beta，可读、起草、发送，默认发送需审批。前提：这些多为 Beta 或需连接电脑，先小范围。

8. 用 skills、wiki、tasks、memory 固化协作。skills 用 `SKILL.md` 从 zip、GitHub 链接或编辑器导入并版本化，agent 在任务需要时加载；wiki 可读，写只在有人要求时；任务给 agent 后随其开始和开 PR 自动移动并显示当前步骤；memory 保存决策、事实、偏好和教训，从纠正和拒绝审批中学习，并提议修改自身 instructions 由人接受。前提：人工审核记忆和 instructions 变更。

9. 迁移已有资产。在 onboarding 或 Settings 可从 Grok Bot、ChatGPT dots、OpenBot.run、OpenMausBot、Hermes Agent、OpenClaw、Paperclip 或另一个 agentes.chat workspace 导入 agents、skills、channels、routines 和 memory；先预览，skills 默认开启、routines 活跃、keys 从不导入。wiki 支持 Obsidian 导入。前提：确认来源导出格式；密钥不会随导入迁移。

README 没有给可直接复制的提示词模板，不要编造；若试，只能先用角色和 instructions 字段自写，但原文未给示例。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
1. 能力发现：README 明确 agent 可在频道/DM 回答问题、使用 MCP 工具、在独立电脑跑命令和代码、用浏览器打开网站/填表/读页面、用 Claude Code 或 Codex 思考、按计划或事件做例行任务、读写 wiki/Drive/任务板、读起草发送邮件、对 Postgres 做只读 SQL 查询。这些是可考虑交给 AI 的具体工作类别。
2. 任务匹配：每个 agent 可单独选模型，模型列表包括 Claude、OpenAI、Gemini、DeepSeek、Kimi、Z.ai、MiniMax、OpenRouter；没人 @mention 的消息进 router，由代码选候选，再由 Jev 小模型、作者自己的 plan 或简单规则挑选，最多四个 agent 回答或无人回答，消息说明谁选的，router 从不授予权限。Claude Code/Codex 适合在连接电脑上按已登录计划执行；MCP scope 和月预算用于限制任务边界。
3. 条件供给：需要给 agent 角色、instructions、模型、月预算和所有者；给 MCP server 和最小 scope；给审批 owner/admin；给 skills、wiki、Drive、任务板；需要时给电脑和浏览器，并支持人工接管登录/captcha；通过纠正和拒绝审批喂 memory。
4. 主动推进：routines 可按计划或事件触发并交付到频道/DM/Drive；任务给 agent 后随开始和开 PR 自动移动；memory 会从纠正和拒绝审批学习并提议改 instructions；通知收件箱汇总 mention、回复、审批和 agent 问题。
5. 效果验证：README 称每次模型调用按 agent 记预算和记录，审批以聊天卡片留痕，任务显示当前步骤，routines 有交付位置，memory 记录纠正和拒绝审批。但这些只是过程信号；README 没有给出评估方法或效果数据，不能直接证明工作结果改善。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
清单中有 Claude Code（adopt）、DeepSeek（try）、Paperclip（study）、OpenBot（study）、Hermes（watch）、OpenClaw（watch）、Obsidian（drop）、Codar（drop）。

- Claude Code：README 说 agent 可在连接电脑上用 Claude Code 思考，作为执行后端之一，不是替代 Claude Code；清单中 Claude Code 的 adopt 仍可保留。
- DeepSeek：README 把 DeepSeek 列为组织可添加的模型 key 之一，可作为该平台的模型选项。
- Paperclip、OpenBot、OpenClaw、Hermes：README 说可从这些应用导入 agents、skills、channels、routines 和 memory，先预览，skills 到达开启、routines 活跃、keys 从不导入；这降低了从清单已有条目迁移的成本。
- Obsidian：wiki 支持 Obsidian 导入，可作为知识库迁移入口。
- Codar：README 没有提到，不能建立关系。
- 清单中没有与它完全同类的自托管人机同频道协作平台条目；它更像承载 Claude Code、DeepSeek 等模型/执行器，并叠加频道协作、MCP 权限、审批和调度的权限层。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
证据主要是 README 的功能表和 Quick start：给出了安装命令、Docker/Postgres/Tailscale 部署方式、各功能状态（大量 ✅，browser、Postgres connector、mailboxes、phone app、desktop app、导入、无 Docker 自托管为 Beta，Codex 测试中）、许可证 AGPL-3.0-only 与商标/署名条款。仓库指标只有 205 stars。README 首图描述了一个产品团队和 AI agent 一起发布版本的场景，但这是示意图，不是可核验案例。

作者主张包括「safe by default」「agents that actually do the work」「一条命令约 10 分钟」「每次调用有预算和记录」「router never grants a permission」等，README 没有给基准测试、客户案例或独立审计。适用条件：需要 Linux 和 Docker/Tailscale 运维能力；组织要自备模型 key；要配置 MCP scope 和审批人；Beta 功能不宜直接用于高风险生产。SELF_HOSTING.md 未在材料中展开，手机、公共域名、升级、备份和无 Docker 细节只能依据 README 提示，不能当作已验证步骤。AGPL 和商标条款意味着分发修改版有额外义务。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
最小试用：准备一台 Linux 测试服务器，按 README 运行安装命令，添加一个模型 key，建一个私有频道，创建一个有角色/instructions/月预算/所有者的 agent；只接一个低风险只读 MCP scope 或不接 MCP；配置一个计划或事件 routine；打开审批；选一个低风险、可重复的任务跑两周，并与当前人工做法或现有工具做同期对照。

判断指标：
- 交付质量：routine 产出被直接接受的比例、返工次数、与人工基线对比的准确性和完整性。
- 人工介入：每个产出需要的审批次数、纠正次数、浏览器接管次数；审批是否都发生在敏感动作前。
- 时效：从触发到交付的时间、任务从开始到开 PR 的时间。
- 成本：按 agent 的月预算和调用记录，算每个被接受产出的模型成本。
- 安全与权限：是否有未审批的 merge/deploy/rollback，MCP scope 是否越界，敏感 connector 动作是否都走审批。
- 稳定性：routine 是否漏跑，Beta 的 browser/Postgres/mailbox 是否失败，失败后能否人工接管。
- 学习效果：memory 提议的 instructions 修改是否被接受，纠正和拒绝审批是否减少同类错误。

先定好阈值：只有质量不低于基线、人工监督成本可接受、时间或成本确有改善，才扩大范围；否则退回 study 或 drop。
