# @gregisenberg: Making the most AI pilled company is the whole game:

- 结论：**值得一试**。建议小范围试：先在一个高价值 workflow 上按原文搭“第二大脑/事实与语气文件/顶层指令/录音转 skill/回归案例”的最小闭环，再逐步接 MCP、触发器和成本核算。理由是原文给出了可照做的组件和顺序，但缺少配置细节与效果数据，不能直接 adopt。
- 原文：https://x.com/gregisenberg/status/2121331227009364340
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T22:52:15.512Z

## 是什么
这是一条推文清单，提出把公司变成“AI pilled”的 40 条动作：从个人第二大脑、公司大脑、事实/语气文件、Git 版本和顶层指令文件，到技能库、MCP/浏览器/独立电脑、常开 orchestrator、触发器、模型路由、成本核算、生产流水线和回写循环。原文在第 40 条截断，且多数条目只给工具名和动作，没有给配置细节。

## 具体做法
以下按原文条目归纳；原文没有给命令/配置的地方不补造。共同前提：先确定数据权限、隐私和人工审批边界；原文未展开这些风险控制。

1. 建个人第二大脑：在 Obsidian 中用一个 Markdown 文件夹记录你如何思考、写作和决策。前提：选定一个 vault，内容用 Markdown 保存。
2. 与第二大脑对话：用 Wispr 全天发语音笔记，让 agent 把每个事实、故事和决策归档。前提：规定 agent 可写入的目录，且不得覆盖原文。
3. 建公司大脑：放入客户、通话、数字、定价、playbook、过去决策及原因。前提：统一目录和字段，否则后续难以检索。
4. 录下每次通话和会议：用 Granola 录音，转写直接进公司大脑。前提：确认录音、转写和数据留存合规。
5. 维护事实文件：只放关于你和公司、允许 agent 对外说的真实内容，用来减少编造。前提：每条事实可追溯。
6. 维护语气文件：收集你最好的 50 条帖子、你讨厌的 20 条，以及你永不使用的词。前提：有足够历史内容可整理。
7. 全部放进 Git/GitHub：让每次变更都有历史。前提：敏感内容脱敏或做权限隔离。
8. 在顶层写一个指令文件（CLAUDE.md 或 AGENTS.md），并加入原文规则：
```
read these files before any task, never overwrite, always date
```
前提：agent 启动时能读到该文件。
9. 给 agent 跨会话记忆：用 claude-mem、mem0，避免每次从零开始。前提：明确哪些记忆可持久化、哪些不能。
10. 把每个数据源接入一个可查询仓库：Airbyte → ClickHouse，接广告、分析、CRM、支付。前提：各数据源有凭据和可维护的 schema。
11. 喂竞争对手下载不到的数据。前提：确认数据授权和合规。
12. 不要从零写技能：先安装现成的好技能，原文列出 anthropics/skills、obra/superpowers、mattpocock/skills、addyosmani/agent-skills。前提：安装前审查代码和权限。
13. 也装营销技能：coreyhaines31/marketingskills、Cody Schneider 的 graphed skills（静态广告和 UGC）、boringmarketing.com skills。前提：同上，先审查。
14. 画出公司所有 workflow，按“赚到的钱或省下的钱”排序。前提：有流程清单和粗略收益估算。
15. 对每个流程亲自做一次，边做边大声讲解并录下来。前提：从排序最高的流程开始。
16. 让 agent 把录音转成 skill：写清何时使用、步骤、检查项、要避免的错误。前提：录音可转写。
17. 一个工作一个 skill；小而无聊胜过一个巨大 prompt。
18. 用 MCP 连接工具，让 agent 能行动而不只是建议：gmail、slack、stripe、linear、notion、posthog、supabase。前提：最小权限。
19. 给 agent 浏览器：browser-use、vercel agent-browser、claude in chrome。
20. 给 agent 一台自己的电脑，处理没有 API 的工具：vercel agent-desktop、orgo。
21. 把最好的 skill 公开送出去，作为新的 lead magnet。
22. 跑一个永不关闭的 orchestrator（grok bot、openclaw、hermes），每个项目一个 agent，每个 agent 再跑自己的子 agent。前提：有任务队列、日志和预算。
23. 用编码 agent 做构建：claude code、codex、cursor、t3、antigravity。
24. 用 harness 包住它们，让它们会计划、测试和记忆：ECC、superpowers。
25. 在一个地方管理整个 agent fleet（paperclip）；每个 agent 有 job、budget 和 log。
26. 把 skill 放到触发器上（n8n、scheduled tasks）：每日、每周、每个新 lead、每次取消。
27. 做模型路由（openrouter）：贵的模型负责计划和检查（原文写作 fable 5.2、gemini 4 carbon），便宜的跑量。
28. 降 token 账单：更短输出、更小 tool results（caveman）。
29. 对不能出机器的数据跑本地模型（gemma 4）。
30. 追踪每个 job 的成本；如果成本高于收益，就修或杀。
31. 建生产线：spec agent → 并行 builder agents（git worktrees）→ test agent → reviewer agent → deploy（vercel、railway）。
32. 设计走同一条线（paper MCP），再用 skill 去掉“AI 味”（unslop）。
33. 公司里每个烦人任务，当天变成内部工具。
34. 每个客户请求先变成 pull request，再让人读（tstack 用于 PR workflow）。
35. reviewer agent 要有明确门槛：
```
would the best team in the world ship this?
```
不到 yes 就拒绝。
36. 保留 50 个真实案例和正确答案；每次新模型发布就重跑，切换到赢家。
37. 人类负责批准、拥有结果、和客户沟通；这是要保留的 10%。
38. 每个完成的 job 写回大脑：什么有效、什么失败、什么要停止。
39. 支持工单、分析、社交评论每晚流入。
40. 原文写到“every friday an agent rewrites”即截断，无法提炼完整步骤；不要据此补造。

## 对应的研究问题
- 能力发现：原文把 AI 从“给建议”推进到“能行动”，包括归档语音笔记、把录音转成 skill、接 MCP 操作工具、用浏览器/独立电脑、把客户请求变 PR、夜间流入支持/分析/评论、追踪每 job 成本。这些是可供发现的新任务类型。
- 任务匹配：贵的模型做计划和检查，便宜模型跑量；编码 agent 做构建；本地模型处理不能出机器的数据；一个工作一个 skill；orchestrator 管项目、子 agent 执行；人类保留批准、结果责任和客户沟通。
- 条件供给：需要个人/公司大脑、事实文件、语气文件、Git 历史、顶层指令文件、跨会话记忆、统一数据仓库、MCP 权限、浏览器/电脑、技能库、50 个评测案例、预算和日志。原文把这些列为 agent 能做事的先决条件。
- 主动推进：触发器覆盖每日/每周/新 lead/取消；orchestrator 常开；支持/分析/评论每晚流入；完成 job 写回；原文还提到周五 agent 重写（截断，无法展开）。
- 效果验证：用 50 个真实案例和正确答案做回归，新模型发布时重跑并选赢家；按 job 追踪成本与收益；reviewer agent 用统一门槛拒绝；人类批准并拥有结果。原文没有给统计方法或基线设计。

## 与已有做法的关系
- Claude Code（adopt）：原文第 23 条把它列为编码 agent；与清单 adopt 一致，但原文没有新增配置细节。
- addyosmani/agent-skills（try）：第 12 条列为可直接安装的好技能；支持小范围试。
- mattpocock/skills（study）：第 12 条列为现成技能；原文只给“安装”动作，没有评估，维持 study 更稳。
- obra/superpowers（study）：第 12 条列为技能库，第 24 条又作为 harness；原文把它放进生产流水线，但没有配置，仍适合先 study 或小范围试。
- Paperclip（study）：第 25 条用于管理 agent fleet，每个 agent 有 job、budget、log；只有用途，没有设置步骤。
- Cursor（watch）：第 23 条列为编码 agent；无进一步说明，维持 watch。
- Hermes（watch）：第 22 条列为常开 orchestrator；无细节，维持 watch。
- Obsidian（drop）：第 1 条作为第二大脑的 Markdown 文件夹示例；清单已 drop，原文没有提供改变结论的新证据。
- OpenClaw（watch）：第 22 条列为常开 orchestrator；无细节，维持 watch。
- 其余大量工具（GitHub、Airbyte、ClickHouse、n8n、OpenRouter 等）不在给出的清单中，未逐条对照。

## 证据与局限
- 原文是一条推文清单，互动量为 469 likes、34 reposts、123 replies；互动量不是效果证据。
- 原文没有给案例结果、前后对比、失败复盘或成本数字，主要是作者主张。
- 第 40 条截断，最后的“周五重写”循环无法评估。
- 多数条目只给工具名和动作，没有给目录结构、MCP 配置、触发器定义、评测 rubric、成本阈值或权限模型；需要自行补齐。
- 原文列出的工具和模型名称（如 fable 5.2、gemini 4 carbon、gemma 4 等）需自行核实可用性和版本。
- 适用条件：适合有历史内容、会议记录、多个数据源、愿意做权限隔离和人工审批的小团队；个人可先做第二大脑、事实/语气文件和单个技能。原文未展开合规、安全和权限隔离风险。

## 怎么试、怎么验证
最小试用不要一次上 40 条，先取原文第 1、5、6、8、14、15、16、30、36、38 条做一个闭环：
1. 选一个高价值、重复发生的 workflow（按第 14 条排序后的第一名），指定一个负责人。
2. 建一个 Obsidian Markdown 文件夹，先放事实文件和语气文件；内容脱敏，事实可追溯。
3. 建 AGENTS.md 或 CLAUDE.md，放入原文规则：
```
read these files before any task, never overwrite, always date
```
4. 负责人完整做一次该 workflow，边做边口述判断并录音；让 agent 按第 16 条转成一个 skill，写清何时用、步骤、检查项、常见错误。
5. 在最小权限下接一个 MCP 或触发器（例如新 lead 或取消事件），先保留人工批准。
6. 建回归集：原文建议 50 个真实案例和正确答案；最小试用可先做 10 个，再逐步补到 50。每次改 skill、换模型或改指令文件都重跑。
7. 记录每 job 成本（原文第 30 条）、回归通过率（原文第 36 条），并补充完成时间、人工修改时间、事实错误/编造次数（对应原文第 5 条）、reviewer 通过率（对应原文第 35 条）。
判断改善：如果回归通过率上升、人工修改时间下降、单成功任务成本不高于原流程，且事实错误不增加，就扩大；如果成本高于收益或错误率上升，按第 30 条修或停。
