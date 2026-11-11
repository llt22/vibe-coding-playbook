# 让 AI 在真实项目里持续干活：选脚手架、补可靠性、用证据判断

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决你把 AI 用在聊天框里、或自建 Agent 只能跑起来却不可靠、不可控、不可恢复，不知道从哪个可运行骨架开始、该补哪些可靠性机制、如何用证据判断是否变好的问题。
> 先试这一步：先挑一个高频、边界清楚的真实任务，按工作类型从 Claude Quickstarts 选一个最接近的骨架，或从 learn-claude-code 的 s01 跑通最小循环，只做这一个任务并记录基线，再决定是否扩展。
> 最近修订：2026-11-11

## 解决什么问题
模型本身已有感知、推理、行动能力，但一个能用的 agent = 模型 + harness。这份手册解决：你只在聊天框里用 AI，它看不到代码库、跑不了命令、记不住跨会话目标、停没停全凭它自己说；或者自建 Agent 只能跑起来，但不可靠、不可控，出了问题只能靠回放提示词去猜；或者要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用；或者要把团队积累的经验变成每个 PR 的强制检查，让 agent 响应 PR、合规、事故等已有事件；或者任务本身跨天、跨周，路径不可预测，要反复等待人和外部系统，进程一崩、网络一断就重来或重复副作用；或者你还没有自己的骨架，不知道从哪个可运行示例开始。
做法包括：搭可操作环境，把工具、知识、观察、动作接口和权限补齐（harness engineering，以 Claude Code 为范本）；用生产级分层补齐可靠性、安全、可观测、评估、并发、成本和发布（hello-agent-system）；当它真的慢、卡住或反复报错时，用真实 telemetry 而不是提示词回放定位（blazo）；用 Pi Durable 验证持久化、断点恢复、submission 去重、工具重放边界和外部副作用幂等；用 Cursor Agent SDK 把事件触发的重复流程写成代码项目，先在本地 playground 跑 evals 和事件回放，再 deploy 或自托管；用 NamiAgent 从 100 行最小循环逐课加到权限、上下文、Skills、MCP、子 Agent、计划和记忆，并用网页端直接看每一步思考和本次发给模型的完整上下文；对跨天长流程，用持久化执行把决策、动作、等待分开，等待时挂起不占计算，外部写加业务幂等键并在执行前重校验约束；按工作类型从 Claude Quickstarts 选一个官方可运行脚手架，先跑通最小路径，再把凭证放 vault、去重账本、按来源书签、单会话花费上限、人工审核 PR 等可靠性模式抄进自己的实现。
每个做法都有边界，不要把实验性原型直接放上生产关键路径；NamiAgent 明确是教学代码，不是生产级框架；长周期持久化执行的示例是演示/模拟，不是生产部署，原文也缺完整代码与量化结果；Claude Quickstarts 的根 README 只是索引，子项目命令、配置和提示词要读各自 README，且没有效果数据。

## 适用与不适用
适用：
- 你想让 AI 在自己的项目里持续干活，愿意按机制逐项搭环境，有 Python 环境和 Anthropic API key，能跑代码、看输出、按章节对照。
- 正在自建 Agent 的工程同学：想用离线 demo、练习和测试验证生产级分层是否补得上，有 Python 3.10+、git、make，以及任意支持 function calling 的 OpenAI 兼容接口（OpenAI / DeepSeek / 通义 / 本地 vLLM / 模型网关均可）；没有 key 也可跳过，因为 hello-agent-system 的所有 demo 都支持 --offline。
- 你的 agent 是 TypeScript 写的、有多个工具调用和 LLM 调用，痛点在慢 / 卡 / 失败的现场排查，本机可以装 Bun（或 Node 20+），选 blazo。
- 你要把 coding agent 嵌入 Slack、GitHub bot、TUI 或服务端应用，希望进程因休眠、OOM、容器重启或部署中断后能从已提交 checkpoint 继续；需要一个 harness 同时运行多个 conversation，或从任意 transcript entry 分叉新 conversation；需要多个客户端可重连、观察 committed state，并在 agent 忙碌时排队或 steer；需要 transcript、todo、计划、工单等应用状态在一个 transaction 中原子提交；需要工具、扩展和提示词可按名称注册与替换；需要上下文接近上限时后台 compaction，但原始 entries 仍留在 storage。Pi Durable 适用，但官方 README 明确标为 Experimental，API 可能在 release 之间无通知变化。
- 你是软件团队，有标准明确、每周至少发生数次的重复任务（例如让每个 PR 按团队知识库做一致性检查、执行合规流程、调查线上事故、做变更风险分级与批准），愿意用 Cursor 生态，有 Node 环境、Cursor 账号与 dashboard、GitHub/GitLab/Bitbucket 等事件源，想用代码化定义 + evals + 事件触发来小范围验证，选 Cursor Agent SDK。
- 你想零基础理解 agent 的 while 循环，愿意按 NamiAgent 从 lesson-01 跑到 lesson-11，用网页端看每一步思考和完整上下文；有 Python 3.10+、git、pip，以及任意 OpenAI 兼容接口的 API key（默认 DeepSeek，换模型改环境变量）；愿意在专用工作区运行，不把工作区指向主目录。
- 任务跨天或跨周、目标明确但路径不可预测、需要持续追踪依赖并频繁等待人和外部系统，例如客户 onboarding、销售/法务/采购之间的交易推进、患者转诊/预约/改期/文书、库存补货；有支持持久化执行的运行时（原文示例为 Temporal 和 Cloudflare）；外部写操作能用业务键做幂等；人或外部系统能把 approval、supplier-reply、goods-received 等事件作为信号送回工作流；团队能运维运行时。
- 你想先找官方可运行示例，按工作类型选一个最接近的骨架：客服问答接知识库、财报数据分析、桌面操作、浏览器导航与填表、跨会话自主编码、每工作日定时摘要、文档语料蒸馏成知识 wiki、IM/工单内应答、MCP Server、Sentry 错误 triage 与自动提 PR。有 Claude API key 和对应运行环境，愿意只跑通最小路径再改造，选 Claude Quickstarts。
不适用：
- 你只想找一个现成工具、不打算跑代码或没有 API key；你期待拖拽式工作流 / 无代码 AI Agent 平台 / prompt 链编排就能解决；你不能接受跑模型产生调用费用。
- 你打算把 hello-agent-system 直接当生产组件——本次只拿到 README，没有讲义正文与数据，性能数字和组件可靠性均未核实，不要照抄模型名。learn-claude-code 同样每章实现细节未随 README 给出、效果主张缺数据，适合小范围试，不适合直接全量上生产。
- 你要的是评测、playground、提示词管理、数据集、agent 市场，或 SaaS / 云端可观测性——blazo 明确不做这些；你只想用 gRPC OTLP，或需要 TypeScript 之外的 SDK，也要自己另接。blazo 项目自标 MVP、dashboard 配图明确标注为目标设计而非当前 UI，不适合直接当稳定生产依赖。
- 你要的是稳定 API、分布式工作流平台或 exactly-once 执行系统：不要用 Pi Durable。它当前没有跨进程锁，同一个 storage 同一时间只允许一个 owner 进程；requestId 去重的是 submission，不自动让 deploy、付款、写外部 API 等副作用只发生一次；工具只有显式声明 replay: 'safe' 才会在崩溃后自动重跑，声明错了会重复副作用。未做单实例选主、storage 文件备份、进程锁、认证授权、ExecutionEnv 隔离、秘密注入和版本迁移前，不要把它放到生产关键路径。
- Cursor Agent SDK 不是无代码平台，也不是完整教程：原文没给安装命令、playground 启动命令、eval 具体写法、权限模型、成本与限额；它强绑定 Cursor 生态（模型 id、dashboard、部署基础设施），自托管只说明是单个 Node 进程可容器化，未给资源要求。非软件类工作只能借鉴其「代码化定义 + 评测 + 事件触发」的结构，不能照搬。
- 你不要把 NamiAgent 当生产级框架，也不要拿它和 Claude Code、Codex 比功能；它明确是教学代码。你不能接受 agent 真的执行命令、读写文件，或不愿使用专用工作区，也不适用。第 3 课权限机制能挡误操作和低成本越界，但挡不住有意的攻击。
- 可预测的流程不要套长周期 agent，仍应交给传统软件；任务不需要等待人和外部系统、没有可拆成可记录外部交互的步骤、外部系统不支持幂等键或发信号，也不适合做持久化执行。
- 不要把长周期持久化执行的 demo 当生产部署；原文示例是演示/模拟，没有量化业务结果，提供文本在 Making the loop durable 之后只有目录标题、正文缺失，无法据此编造实体/工作流划分、重试、代码变更、记忆与提示词控制的具体配置。
- 你期待 Claude Quickstarts 的根 README 直接给完整命令、配置或提示词：它只是索引页，具体内容在各子项目 README；你需要效果数据、基准或对比实验时也不适用，所有“demonstrates”都是官方主张。Computer Use Best Practices 明确要求放在 VM 里跑；Browser Toolset 与 Computer Toolset 自述“展示接口、非生产代码”，工具集名称带版本日期，接口可能变化。Managed Agents 系列依赖 ant apply、session metadata、vault、cron deployment 等特定平台能力，迁移到别的平台需要重写这部分管道。

## 前置条件
- 能访问 GitHub 与 npm。
- 本机有 Python 环境和 pip；hello-agent-system 需要 Python 3.10+、git、make。
- learn-claude-code：有一个 Anthropic API key；课程跑起来需要配 ANTHROPIC_API_KEY。跑模型会产生调用费用。
- hello-agent-system：有任意支持 function calling 的 OpenAI 兼容接口；配 LLM_BASE_URL、LLM_API_KEY、LLM_MODEL。没有 key 可跳过，所有 demo 支持 --offline（用剧本模型 ScriptedLLM），所有练习和测试都是离线的。
- 需要 Node 才能跑 learn-claude-code 的 web 端。
- blazo：Bun（latest，可用 mise 管理，.mise.toml 固定 bun = 'latest'）、Git；Node.js 20+ 仅在你于 Bun 之外运行 dashboard / SDK 时需要。
- 不要照抄 hello-agent-system README 里的 gpt-5.6-luna 这类模型名，那是作者环境，必须换成你自己的模型。
- Pi Durable：有 JavaScript/TypeScript runtime，能访问 npm；安装 @earendil-works/pi-durable、@earendil-works/pi-ai、@earendil-works/chord。官方 README 明示 API 会无通知变化，原型也应把这三个包锁到精确版本，并把升级单独作为一次故障恢复回归测试，不要长期跟随浮动版本。需要 SQLite 文件。需要调用方能为一业务工作生成稳定 requestId；需要逐个工具分析「同样参数执行两次是否安全」；需要为有副作用调用准备外部系统幂等键或补偿；审批需要 durable memo。生产化前另需处理单实例选主、storage 备份、进程锁、认证授权、ExecutionEnv 隔离、秘密注入和版本迁移。
- Cursor Agent SDK：Node 环境；能访问 Cursor 账号与 dashboard（用于管理 secrets 和集成）；有 GitHub/GitLab/Bitbucket 等事件源可用于触发。原文未给出 @cursor/agent-sdk 的安装命令，需查官方文档补齐。原文示例模型 id 为 composer-2.5、参数 effort high、fast true，这是示例，按自己的环境替换。
- NamiAgent：Python 3.10+、git、pip；有 OpenAI 兼容接口的 API key，默认 DeepSeek，换其他模型改环境变量；专用工作区目录 NAMI_WORKSPACE；第 4 课起状态目录 NAMI_STATE_DIR 默认在 ~/.nami-agent，放在工作区之外。必须在专门的工作区目录运行，不要把工作区指向主目录。
- 长周期持久化执行：任务确实跨天/周、路径不可预测，且需要等待人或外部系统；有一个支持持久化执行的运行时（原文示例为 Temporal 和 Cloudflare）；外部写操作能用业务键做幂等；人或外部系统能把事件送回工作流，运行时支持持久化定时器和信号；审批上限等约束要写成可检查的条件；团队能按运行时文档配置持久化存储、worker 和重试策略。原文只给示例时间线，没有完整代码与量化结果，生产部署需另行调研运行时文档。
- Claude Quickstarts：本机有 git；有 Claude API key（README 指向 console.anthropic.com 注册）；各子项目依赖与运行命令在各自 README 里，本材料未包含，需打开对应目录补齐；Computer Use Best Practices 要求放在 VM 里跑；Browser Toolset 与 Computer Toolset 自述“展示接口、非生产代码”；工具集名称带版本日期（computer_toolset_20260801、browser_toolset_20260801），接口可能随版本变化；Managed Agents 系列依赖 ant apply、session metadata、vault、cron deployment 等特定平台能力。

## 操作步骤
先选路线：想零基础从 while 循环开始、用网页端看每一步思考和完整上下文，选做法 H；想系统理解 harness 机制、有时间和 API 预算，选做法 A；已经有自己的 agent 骨架、只想把环境检查清单补齐，选做法 B；想验证生产级可靠性、安全、评估分层，选做法 C；已有 Agent 骨架想直接套生产级组装，选做法 D；agent 已经能跑、但你要回答「它为什么慢、卡住或失败」，选做法 E；要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用，先用做法 F 做受控原型；如果重复工作围绕 PR、合规、事故等事件，且愿意用 Cursor 生态，选做法 G；如果任务跨天/周、频繁等待人和外部系统、需要崩溃恢复并防止重复副作用，选做法 I；如果你还没有自己的骨架，想先从官方可运行示例里挑一个最接近的，选做法 J。可组合：先用做法 H 的 demo 和网页端建立「上下文里有什么、工具怎么被调用」的直觉，再按做法 A 深入 harness 分章；用做法 B 补 harness 清单，再用做法 C 跑可靠性与评估两课，用做法 D 的骨架套自己项目，如果 agent 是 TypeScript 再按做法 E 接本地可观测性，用做法 F 验证持久恢复和工具重放边界，最后用做法 G 把事件触发的重复流程做成可评测的代码项目；长流程用做法 I 做运行时可靠性层，用 F 验证单进程 conversation 恢复，用 D 做多 worker 任务队列，用 E 看本地执行，但它们不是同一个东西。注意 D 和 F 在持久化 / worker 上有差异：hello-agent-system 展示多 worker 从同一持久化队列领任务、kill -9 后租约过期由别的进程从检查点接手；Pi Durable 当前单 storage 只允许一个 owner 进程，没有跨进程锁。两者都写，按场景选：要分布式 worker 崩溃接手看 D；要单进程 owner、可恢复 conversation/task、submission 去重和 replay 边界看 F。不要把 F 当分布式工作流平台。G 的评测是 evals 与事件回放，E 的评测是本地 telemetry 可观测性，两者可以并用但解决的问题不同。H 是教学快照，不是生产框架；A 和 H 都从最小循环开始，但 A 偏机制分章，H 偏零基础网页端观察和权限确认，按你的背景选。I 是长周期流程的持久化执行，不等同于 F 的单进程 conversation 恢复，也不等同于 D 的多 worker 队列；原文没有提到 Claude Code、Cursor、OpenClaw 的集成，不要声称已经集成。J 是选型目录，不是完整教程：先跑通一个子项目的最小路径，再把可靠性模式抄进自己的实现，不要直接当生产组件。

### 做法 A：按 learn-claude-code 教程从 s01 跑通到 s17，建立 harness 直觉
1. 克隆并安装依赖。前提：能访问 GitHub，本机有 Python 与 pip。
```sh
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code
pip install -r requirements.txt
cp .env.example .env   # configure ANTHROPIC_API_KEY
```
预期：依赖装好，.env 里配好 ANTHROPIC_API_KEY。

2. 从第 1 章跑起，确认最小循环能通。
```sh
python s01_agent_loop/code.py        # Start here -- one loop + bash
```
预期：最小 agent loop 跑起来，模型能通过 bash 工具执行动作。

3. 按顺序推进，复杂章节单独跑一遍对照。
```sh
python s08_context_compact/code.py   # Context compaction (complex)
python s17_goal_loop/code.py         # Endpoint: continue until a checkable goal is met
```
阅读方式按 README：每章一个文件夹，README.md 是英文完整叙事（另有 README.zh.md / README.ja.md）、code.py 是独立可运行实现、images/ 放 SVG 图；从 s01 顺序读到 s17，复杂章节有 details 折叠深挖。注意不要混用新旧两条线的章节号。

4. 如果要看旧版 12 课实现（agents/ 目录，包含完整版），按需对照。
```sh
python agents/s01_agent_loop.py
python agents/s12_worktree_task_isolation.py
python agents/s_full.py
```
预期：旧线实现可运行；注意它与新版 17 课章节号不同。

5. 可选：跑 web 端对照课程。前提：本机有 Node。
```sh
cd web && npm install && npm run dev   # http://localhost:3000
```

### 做法 B：不跑完整课程，直接把 harness 公式和最小 agent loop 抄进自己的项目
1. 把 harness 公式抄成给真实任务搭环境的检查清单，逐项填空。
```text
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions

    Tools:          file I/O, shell, network, database, browser
    Knowledge:      product docs, domain references, API specs, style guides
    Observation:    git diff, error logs, browser state, sensor data
    Action:         CLI commands, API calls, UI interactions
    Permissions:    sandbox isolation, approval workflows, trust boundaries
```
预期：你能说清当前任务缺哪一项，先补最缺的。

2. 抄最小 agent loop 作为骨架，可复制后替换 MODEL / SYSTEM / TOOLS / TOOL_HANDLERS。
```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS,
        )
        messages.append({'role': 'assistant', 'content': response.content})
        tool_calls = [b for b in response.content if b.type == 'tool_use']
        if not tool_calls:
            return
        results = []
        for block in tool_calls:
            output = TOOL_HANDLERS[block.name](**block.input)
            results.append({'type': 'tool_result', 'tool_use_id': block.id, 'content': output})
        messages.append({'role': 'user', 'content': results})
```
配套原则（README 原话）：循环保持不变，新工具只是往分发表里加一个 handler；加扩展点靠 hook，不要改主循环。

3. 需要现成 CLI 而不是自己搭时，按 README 指向同作者的 Kode。
```sh
npm i -g @shareai-lab/kode
```
README 称其支持 Skill 与 LSP、兼容 Windows、可用 GLM / MiniMax / DeepSeek 等开放模型。

4. 想做「常驻型」而非「用完即弃」的 agent，按 README 指向姊妹仓库路线（claw0 / OpenClaw）叠加两个额外机制：Heartbeat（每 30 秒 harness 给 agent 发一条消息让它检查待办，没活就继续睡）和 Cron（agent 自己排未来任务，到点自动触发），再加 IM 多通道路由、持久上下文记忆和 Soul 人格系统。

### 做法 C：按 hello-agent-system 跑通可靠性（08）与评估（11），用离线测试验证生产级分层
1. 环境准备。前提：Python 3.10+、git、make。
```bash
git clone https://github.com/heaven999b/hello-agent-system.git
cd hello-agent-system
make setup          # 创建 .venv 并安装（核心依赖只有 openai + pydantic）
```
预期：.venv 创建好，核心依赖装好。

2. 配置模型接口。前提：有任意「支持 function calling 的 OpenAI 兼容接口」。没有 key 可跳过此步——所有 demo 都支持 --offline（用剧本模型 ScriptedLLM），所有练习和测试都是离线的。
```bash
LLM_BASE_URL=https://api.openai.com/v1     # 或 DeepSeek / 通义 / 本地 vLLM / 模型网关
LLM_API_KEY=sk-xxx
LLM_MODEL=gpt-4o-mini                       # 需要支持 function calling
```
预期：环境变量配好；不需要 key 也能离线跑。

3. 先验证连通性与工具调用能力，再跑第一个 demo。
```bash
make check-env                                  # 检查模型连通性与工具调用能力
.venv/bin/python lessons/00_overview/demo.py    # 看一眼你将要造出的东西
```
预期：连通性检查通过，或离线模式可跑；你能看到课程要造出的 Agent 雏形。

4. 每课都走同一个循环：读讲义 → 跑 demo → 写练习 → 让测试变绿 → 过自测清单；每课开头都标注了一篇必读论文或文章。
```bash
make lesson N=xx
```
```bash
.venv/bin/python scripts/progress.py
```
预期：你按进度跑课；每课结构固定：讲义（README.md + README.en.md）+ demo.py + exercise.py + solution.py + test_exercise.py，测试离线、确定性、零成本。

5. 按投入选路线。前提：先决定花多少时间。主线（第一部分 + 第二部分 + 综合实战）约 6 小时；第三部分约 3.5 小时、第四部分约 3 小时，属进阶；赶时间走 4 小时速通路线（每课只读开头的「核心路径」）。

6. 优先跑可靠性（08）与评估（11）两课，并把失败模式图鉴、设计评审清单和 Agent 构造骨架直接套到自己项目上。理由：这是本次调研给出的建议小范围试路径；课程有 79 种失败模式、199 条设计评审清单、76 道面试题、框架对照表、一页纸速查、术语表、生产就绪指南、135 条延伸阅读等「工具书」文档可对照。

### 做法 D：用 hello-agent-system 的 Agent 构造骨架和生产组件替换路线，把已有 Agent 补到生产级
1. 直接套用 README 给出的组装骨架。前提：不想自己从零设计分层。每个参数背后对应一节课。注意 gpt-5.6-luna 这类模型名来自作者环境，必须换成你自己的模型。
```python
import asyncio
from agentkit import *

agent = Agent(
    llm=ResilientLLM(default_llm(), fallbacks=[default_llm('gpt-5.6-luna')]),
    tools=[search_kb, create_ticket, reset_password],
    system_prompt='你是 IT 服务台助手。' + UNTRUSTED_DATA_RULE,
    hooks=[
        InputGuard(),
        PermissionPolicy(role_tools={'employee': {'search_kb', 'create_ticket'},
                                     'it_admin': {'*'}}),
        ToolOutputGuard(), OutputGuard(),
        BudgetHook(max_cost_usd=0.10, max_tool_calls=20),
        AuditLog('runs/audit.jsonl'),
    ],
    context_strategy=SlidingWindow(max_tokens=8000),
    checkpointer=FileCheckpointer('runs/'),
    idempotency_store=IdempotencyStore(),
    tracer=Tracer(jsonl_exporter('runs/traces.jsonl')),
)

async def main():
    me = {'tenant_id': 'acme', 'user_id': 'alice', 'roles': ['employee']}
    result = await agent.run('帮我重置密码', metadata=me)
    if result.status == 'paused':
        result = await agent.approve(result.run_id, approved=True, by='it_manager')
    print(render_tree(result.trace))
    results = await asyncio.gather(*(agent.run('VPN 怎么连？', metadata=me) for _ in range(50)))

asyncio.run(main())
```

2. 单进程扛不住、或进程会崩时，让多个 worker 进程从同一个持久化队列领任务（第 12–13 课）。前提：需要崩溃接手和不重复的副作用。
```python
from agentkit.distributed import AgentJobHandler, SQLiteCheckpointer, SQLiteIdempotencyStore

async def make_handler(ctx):
    ckpt, idem = SQLiteCheckpointer(ctx.db), SQLiteIdempotencyStore(ctx.db)
    await ckpt.setup(); await idem.setup()
    agent = Agent(default_llm(), tools, checkpointer=ckpt, idempotency_store=idem)
    return AgentJobHandler(agent, ckpt)
```
```bash
python -m agentkit.distributed.worker --queue sqlite:///runs/jobs.db --app app.py:make_handler --concurrency 16
```
```python
queue = SQLiteJobQueue('runs/jobs.db'); await queue.setup()
await queue.enqueue('run', {'op': 'run', 'input': '打印机坏了'}, tenant_id='acme', idempotency_key='req-42')
```

3. 多机时只换组件、不换接口。前提：单机 SQLite 不够用。队列换成 --queue postgresql://...，其余不变（第 26 课）；组件换成 contrib 适配器：LiteLLMRouterLLM、PostgresCheckpointer、RedisIdempotencyStore、RedisTokenBucket、RateLimitHook、OTelTracer、PrometheusHook、CedarPolicy 等。先小范围验证，因为接口不变但组件行为不同。

4. 用综合实战做一次端到端演练。前提：想验证「组装起来能不能跑成服务」。capstone/ 的 ITBuddy 用 deploy.py 一键拉起 API 进程 + 多个 worker 进程 + 共用持久化队列。原文此处关于审批的后续未完整给出，按需查看仓库。

### 做法 E：用 blazo 本地可观测性，回答「这个 TypeScript agent 为什么慢、卡住或失败」
适用前提：agent 是 TypeScript 项目，有多个工具调用和 LLM 调用；本机有 Bun（或 Node 20+）。它只做可观测性，不做构建、playground、评测。

1. 克隆并安装。前提：能访问 GitHub，有 Bun 或 Node 20+、Git。
```bash
git clone https://github.com/agentblazo/blazo.git
cd blazo
mise install            # 或: brew install bun / curl -fsSL https://bun.sh/install | bash
bun install
```
预期：依赖装好。

2. 一条命令起全套（collector + dashboard）。
```bash
bun apps/cli/src/index.ts watch
```
预期：collector 在端口 4318、dashboard 在端口 3000 同时启动，终端显示 runs/events 的实时 TUI；浏览器打开 http://localhost:3000；Ctrl+C 停止全部。链路是：@blazo/sdk 埋点 → @blazo/otel 以 OTLP/HTTP JSON 发到本地 collector（Hono + Bun）→ collector 在 ingest 时归一化数据、跑检测规则、写入 SQLite（WAL 模式）→ dashboard 通过 SSE 实时更新，不需要 Redis、不需要云端账号。
想分开跑两个服务：
```bash
bun apps/collector/src/index.ts        # collector on :4318
bun run dev --cwd apps/dashboard       # dashboard on :3000
```

3. 先用现成 agent 验证链路。
```bash
bun run --cwd examples/basic-agent start
```
预期：原文称该 run 会在约 2 秒内出现在 dashboard 上、无需刷新；这是作者主张、未经第三方验证，只要你能看到 run 出现即可继续。

4. 生成并改配置。
```bash
blazo init                  # 写入默认 blazo.config.json
```
默认配置可直接改阈值：endpoint 默认 http://127.0.0.1:4318；collector host 127.0.0.1、port 4318；dashboard host 127.0.0.1、port 3000；database path .blazo/blazo.db；detection 里 longRunningMs 30000、repeatedToolCount 3、repeatedErrorCount 3、noActivityMs 30000、loopRepeatCount 4。预期：按你自己工作流的正常耗时 / 重复次数改 detection；阈值不改，容易全是误报或全都不报。

5. 给自己的 agent 埋点。前提：TypeScript 项目，能安装 @blazo/sdk。
```ts
import { observe, span, log } from '@blazo/sdk';

await observe('research-agent', async () => {
  log('info', 'agent started', { version: '0.1.0' });
  await span('llm.chat', () => callModel(prompt), { type: 'llm' });
  await span('tool.search', () => search(query), { type: 'tool' });
});
```
SDK 要点：observe(name, fn, options?) 包裹 agent 入口，返回 fn 的结果，把 run 标记为 success/error 并记录异常；它产生的 root span 被当作一次 Run，子 span 成为时间线上的事件。span(name, fn, options?) 是 run 内的工作单元，options.type（llm | tool | agent | error | session）决定 dashboard 展示样式——按类型如实标注是把步骤区分开的关键。log(level, message, metadata?) 挂到当前 run 的结构化日志。configure() / shutdown() 初始化并 flush OpenTelemetry provider；退出前必须调用 shutdown()，否则缓冲的 telemetry 不会导出。endpoint 解析顺序：BLAZO_ENDPOINT → OTEL_EXPORTER_OTLP_ENDPOINT → 默认 http://127.0.0.1:4318。

6. 用命令行查看与下钻。
```bash
blazo init                  # 写默认 blazo.config.json
blazo watch                 # 起 collector + dashboard，实时 TUI
blazo runs [--limit N]      # 列出最近 runs
blazo inspect <run-id>      # 完整报告：timeline、logs、errors、findings
```
开发期通过源码入口执行：bun apps/cli/src/index.ts <command>。全局选项：--collector <url>（附加到指定 collector）、--json（runs / inspect 输出机器可读结果）、--no-spawn-collector（watch 时附加已有 collector）、--no-dashboard（watch 时不启动 dashboard）。预期：blazo inspect <run-id> 直接给出 timeline、logs、errors、findings，不用自己去翻日志。

7. 可选：不装 SDK，直接把已有 OTLP/HTTP JSON 数据发进来。collector 提供标准端点：POST /v1/traces、POST /v1/logs、GET /health、GET /api/runs、GET /api/runs/:id、GET /api/runs/:id/events、GET /api/errors、GET /api/logs?level=、GET /api/findings、GET /api/overview、GET /api/config、GET /api/stream。SSE 事件类型：run.started、span.completed、log.created、error.created、finding.created、run.completed。

8. 靠五条确定性检测规则把「日志里隐约可见」的执行模式变成 Findings（全部确定性、无 ML）：long_running 运行时长超过 longRunningMs，默认 30000 ms；repeated_tool 同一工具被反复调用 repeatedToolCount 次，默认 3；repeated_error 同一类错误重复 repeatedErrorCount 次，默认 3；no_activity 长时间无事件超过 noActivityMs，默认 30000 ms；possible_loop 循环检测达到 loopRepeatCount，默认 4。这些规则在 ingest 时和周期性扫描（默认每 5 秒）两个时机自动评估，命中后生成 Finding 并通过 SSE 推到 dashboard（finding.created 事件），不需要你主动去查。实践意义：repeated_tool 反复出现，可以反过来提示「这个环节其实不该由 AI 做」或「这里缺了工具」——注意原文只给了规则定义，没有给出用 findings 发现新任务的案例，这一层是推断。

9. 人工排查时用 dashboard 六个页面：Overview /（指标卡、活跃 / 慢 / 最近 runs、findings、高频错误）、Runs /runs（id、agent、状态、时长、tokens、cost、开始时间）、Run Detail /runs/[id]（摘要、时间线、步骤检查器、日志、错误、findings）、Errors /errors（按签名分组的错误，可点进受影响的 run）、Logs /logs（最近日志，带级别过滤）、Settings /settings（当前本地生效配置）。

### 做法 F：用 Pi Durable 做可持久、可恢复的 coding agent 受控原型
什么时候选：你要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用；要验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复。不要把它当稳定 API、分布式工作流平台或 exactly-once 执行系统。与做法 D 的差异：D 展示多 worker 从同一持久化队列领任务、崩溃接手；F 当前单 storage 只允许一个 owner 进程，没有跨进程锁。两者都写，按场景选。

1. 安装并固定版本。前提：有 JavaScript/TypeScript runtime，愿意试用实验性 API。
```bash
npm install @earendil-works/pi-durable @earendil-works/pi-ai @earendil-works/chord
```
README 明示 API 会无通知变化，原型也应把这三个包锁到精确版本，并把升级单独作为一次故障恢复回归测试，不要长期跟随浮动版本。

2. 用 SQLite 建最小持久 harness。前提：先接受「一个 storage 只有一个 owner 进程」的部署约束。
```ts
import { createModels } from '@earendil-works/pi-ai/models';
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai';
import { createRegistry, Harness } from '@earendil-works/pi-durable';
import { NodeExecutionEnv } from '@earendil-works/pi-durable/env/node';
import { openNodeSqliteStorage } from '@earendil-works/pi-durable/storage/sqlite/node';
import { CodingTools } from '@earendil-works/pi-durable/tools';

models.setProvider(openaiProvider());
registry.install(CodingTools);

const env = ({ cwd }: { cwd?: string }) =>
  new NodeExecutionEnv({ cwd: cwd ?? process.cwd() });

const harness = await Harness.open(
  await openNodeSqliteStorage('./agent.sqlite'),
  { models, registry, env },
  context,
);
```
当前 README 还给出更小的恢复骨架：
```ts
const harness = await Harness.open(
  await openNodeSqliteStorage('./session.sqlite'),
  { models, registry },
  context,
);
const root = await harness.root(context);
harness.resume();
```
预期：关闭进程并重新打开同一个 SQLite 文件后，能取得同一个 root conversation，并让 pending work 继续。生产化前必须另外处理：单实例选主、storage 文件备份、进程锁、认证授权、ExecutionEnv 隔离、秘密注入和版本迁移；这些不是 Pi Durable 自动提供的能力。

3. 每个可重试提交都使用稳定 requestId。前提：调用方能为一业务工作生成稳定 ID。
```ts
const job = {
  type: 'input',
  content: 'Fix the flaky login test',
  requestId: 'job-42',
} as const;

const submission = await root.submit(job, context);
const settled = await submission.wait(context);
```
客户端网络重试或进程重启后，应复用同一个 requestId；重复 submit() 会返回已有 submission。不要每次重试都生成新 UUID，否则等于主动绕过去重。wait() 的取消只停止当前等待者，不会取消底层工作；真正停止 conversation 要使用 conversation.abort()。这一区别需要写进调用端状态机，避免 UI 断开被误解为任务取消。

4. 先给工具分级，再决定是否允许自动重放。前提：逐个工具分析「同样参数执行两次是否安全」，不能按工具类别批量猜测。
只读、确定性查询可以考虑：
```ts
const searchIssues = defineTool({
  name: 'search_issues',
  parameters: Type.Object({ query: Type.String() }),
  replay: 'safe',
  execute: async (args, api) => { /* ... */ },
});
```
以下工具默认不要声明 replay: 'safe'：deploy、发布、合并、删除；付款、退款、发券；发邮件、发消息、创建工单；对不支持幂等键的外部 API 做写操作；结果依赖当前外部状态、重复执行会改变含义的 shell 命令。
对有副作用但业务上必须可恢复的调用，采用两层保护：1）用 task ID 或业务 ID 构造外部系统接受的稳定幂等键；2）恢复时先查询外部系统状态，再决定继续、补偿还是转人工，不把「task checkpoint 已保存」当成「外部副作用一定没有发生」。文章支付示例使用 payment-${task.id} 作为幂等键，并给 task 定义 abort 补偿退款。这个模式说明 Pi Durable 负责触发恢复与 abort，业务代码仍负责幂等和补偿正确性。

5. 把审批等跨重试决定写入 durable memo。前提：deploy、付款等工具需要人工或策略审批。
```ts
hook(ToolTask, {
  beforeTool: async (call, api, context) => {
    const approved = await api.memo<boolean>('approval:deploy', context);
    // 根据已保存或新取得的审批结果决定放行或 block
  },
});
```
memo 是 first-write-wins。hook 因崩溃重跑时，应复用第一次已经持久化的审批结果，而不是再次向审批人提问。若审批本身有时效，还需要在业务层保存批准范围、操作者、时间和过期规则；原文没有提供完整权限与审计方案。

6. 用 conversation 组合可恢复的子 agent。Pi Durable 没有专用 subagent 原语。原文推荐把子 agent 建模为由当前 tool task 拥有的 conversation：1）在 transaction 内按 ownerTaskId 查询既有 child conversation；2）找不到时才创建，避免 replay 重复生成孩子；3）用 configure() 选择较小模型、独立指令和最小工具集；4）用稳定 requestId 向 child 提交任务；5）等待 child 的回答 entry；6）用 api.details() 暴露 child ID，让 UI 能显示和打开它。
前台子 agent 使用 task ownership：
```ts
{ ownership: { kind: 'task', taskId: api.taskId } }
```
它会阻止父 conversation idle，并随普通 abort 自底向上清理。
跨 turn 继续的后台工作使用：
```ts
{
  ownership: { kind: 'conversation' },
  background: true,
}
```
它不阻止 conversation idle，普通 abort 默认也不会停止它。后台 task 必须提供单独的取消入口，否则会形成用户以为已经停止、实际仍在运行的孤儿工作。

7. 配置 compaction，并保留原始历史检索入口。前提：conversation 可能接近模型上下文上限。
```ts
settings: {
  compaction: {
    reserveTokens: 16384,
    backgroundTokens: 32768,
  },
}
```
含义：在距离硬阈值尚有 backgroundTokens 时后台生成摘要；超过 contextWindow - reserveTokens 后，下一请求等待摘要。provider 仍报上下文过长时，harness 会压缩并重试一次。手动压缩时可以在指令中明确必须保留的事实：
```ts
await root.compact('Keep the names of the failing tests', context);
```
compaction 不删除 storage 中的原 entries，但模型后续主要看到摘要。应用应同时提供历史检索入口，并把目标、约束和关键测试名是否保留列入试验指标。

### 做法 G：用 Cursor Agent SDK 把事件触发的重复流程写成代码项目
什么时候选：你的重复工作围绕 PR、合规、事故等事件，标准写得出、每周至少发生数次；你愿意用 Cursor 生态，想把提示词、工具、连接、evals 和回放都当成普通软件项目来版本控制和评审。与 E 的差异：E 解决本地可观测性，G 解决事件触发、评测与部署；可以先用 E 看 run，再用 G 做 PR 检查。原文没给安装命令、playground 启动命令和 eval 具体写法，下面从「项目定义」开始，缺的步骤需查官方文档。

1. 建一个项目目录，像起普通软件项目一样组织：提示词（Markdown）与工具代码（TypeScript 函数）、外部服务连接、evals 放在一起，一起进版本控制和评审。前提：Node 环境；能访问 Cursor 账号与 dashboard；有 GitHub/GitLab/Bitbucket 等事件源；已按官方文档安装并可用 agent-sdk 命令（原文未给安装命令）。预期：每类文件清楚对应 agent「知道什么」或「能做什么」。

2. 用 defineAgent 定义 agent。原文示例的模型 id 与参数原样保留，按自己环境替换。
```ts
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineAgent } from '@cursor/agent-sdk';

export default defineAgent({
  name: 'Robo',
  model: {
    id: 'composer-2.5',
    params: [
      { id: 'effort', value: 'high' },
      { id: 'fast', value: 'true' },
    ],
  },
  local: {
    cwd: join(homedir(), '.cache', 'factory', 'robo'),
  },
});
```
预期：得到一个可本地运行的 agent 定义；模型 id 与参数是原文示例，不是你必须照抄的生产配置。

3. 在本地起 playground 迭代。原文只说「启动本地 playground」，未给命令，需查官方文档。预期：本地就能看日志、跑 evals，与部署后用的是同一套；先在这里把提示词和工具改到能稳定通过固定测试集。

4. 写 evals 并做事件回放（event replay）。原文称开箱即用，但具体写法未给，需查文档。建议把过去若干真实 PR 作为固定测试集：改一次提示词跑一次，比较结论是否稳定、是否越改越差。预期：上线前就有一套可重复的回归检查，而不是上线后靠感觉调。

5. 部署到 Cursor 基础设施。前提：secrets 与集成已在 dashboard 管理好。
```
agent-sdk deploy
```
预期：该命令会构建、分配 URL 并在 Cursor 基础设施上启动。原文未给资源要求、成本与限额，需自己确认。

6. 若要自托管：把 agent 作为单个 Node 进程打包进容器运行。前提：你愿意自己管运行环境、日志、升级和 secrets；原文只说明可容器化，未给资源要求。预期：不依赖 Cursor 托管也能跑，但权限、限额和可观测性要自己补。

7. 先让 agent 响应已有事件，但只做影子模式。例如响应 GitHub/GitLab/Bitbucket 的 PR 事件，按团队可检查、可修改的策略执行动作：评估变更风险、路由给正确团队、对符合策略的变更批准。第一版只输出发现与引用出处，不自动批准、不自动路由，人工处置。预期：积累真实命中与误报，不把写权限一开始就交出去。

8. 只有误报可接受、且人工复核成本明显低于自己从头看时，再逐步放开「路由」「批准」这类写操作权限。预期：每放开一层都保留回滚和人工复核入口。

9. 复杂任务拆解：agent 可把任务交给另一个带独立工具和会话的专用 agent，也可把工作分给并行子 agent。预期：不要让一个 agent 硬扛所有步骤；拆开后分别评测各自的工具和输出。

10. 省力路径：从模板起步，或直接把编码 agent 指向官方文档，让 agent 帮你把这个 bot 一起写出来（SDK 自带引导编码 agent 走开发流程的 skills）。预期：减少搭建成本，但仍需自己跑 evals、回放和影子模式验证。

### 做法 H：用 NamiAgent 从 lesson-01 跑到 lesson-11，用网页端看每一步思考和完整上下文
什么时候选：你想零基础理解 agent 的 while 循环，愿意按课程逐课加能力；你要一个能在本地跑起来、用 OpenAI 兼容接口、默认 DeepSeek、只依赖 openai 一个包、没有 Agent 框架的教学快照；你想在网页端左边看每一步思考和工具调用，右边看本次发给模型的完整上下文和 token 占用。不要把它当生产级框架，也不要用它替代 Claude Code、Codex 等产品。安全前提：Agent 会真的执行命令、读写文件；第 3 课的权限机制能挡误操作和低成本越界，但挡不住有意的攻击；必须在专门的工作区目录运行，不要把工作区指向主目录。

1. 准备环境。前提：Python 3.10+，有 git 和 pip。
```bash
git clone https://github.com/aa1143/NamiAgent.git
cd NamiAgent
pip install -r requirements.txt
```
预期：依赖装好。

2. 配置模型和工作区。前提：有 OpenAI 兼容接口的 API Key。第 3 课起 Agent 只能操作 NAMI_WORKSPACE；第 4 课起状态目录 NAMI_STATE_DIR 默认在 ~/.nami-agent，放在工作区之外。
```bash
export API_KEY=你的模型密钥
# 默认用 DeepSeek；换其他 OpenAI 兼容模型：
# export BASE_URL=https://...   MODEL=模型名
export NAMI_WORKSPACE=~/agent-workspace
mkdir -p $NAMI_WORKSPACE
```
预期：环境变量配好，专用工作区目录存在。

3. 先跑演示模式，不需要 API Key。打开 http://localhost:8765，观察左边每一步的思考与工具调用，右边本次发给模型的完整上下文。
```bash
python web/app.py --demo
```
预期：不配 key 也能看到每一步思考和完整上下文。

4. 再用真实模型跑同一个网页端。它会读取 API_KEY、BASE_URL、MODEL；写文件、跑命令这类有副作用的操作会弹窗确认。开头写 /plan 可以让它先出计划，批准后再动手。
```bash
python web/app.py
```
预期：网页端能连真实模型；有副作用的操作触发确认；文件只落在 NAMI_WORKSPACE。

5. 按课程逐课运行和对比。README 的快速开始示例是第 5 课；每个 lesson 目录都是学完该课时的完整代码，可以直接运行，也可以对比相邻两课的差异。
```bash
cd lessons/lesson-05
python agent.py
```
预期：该课快照能运行；对比相邻两课能看出新增能力。

6. 跑测试，不需要 API Key。README 说第 3 课起每课都有测试，第 11 课共 49 个，用假模型跑。
```bash
cd lessons/lesson-11 && pytest -q
```
预期：按 README 预期是 49 个测试通过；若实际数量不同，以实际结果记录。

7. 可选接入聊天软件和 MCP。第 6 课的 bot.py 需要 TG_BOT_TOKEN 和 TG_ALLOWED_USERS；第 8 课起可接入 MCP 服务器，配置放在 ~/.nami-agent/mcp.json，格式见第 8 课。预期：需要相应 token / 白名单 / MCP 配置才启用，不影响前面的本地课程。

8. 把课程中的控制点抽出来复用。按课程表，可复用的点包括：第 3 课权限的「硬规则 → 风险分级 → 人工确认」；第 4 课上下文的「截断 → 清理 → 摘要」和会话持久化；第 5 课 AGENTS.md 常驻、技能按需加载；第 7 课定时任务的无人值守预授权和心跳；第 8 课 stdio MCP 客户端；第 9 课子 Agent 用独立上下文、并行只读；第 10 课待办清单和由代码强制只读的计划模式；第 11 课长期记忆每条确认、会话检索。预期：你能把这些控制点对应到自己项目的权限、上下文、计划、记忆和子任务设计上；README 对第 7 课只给课程名和一句话，触发条件、状态机和失败处理需看课程正文或自己补。

### 做法 I：用持久化执行做跨天长流程，把决策、动作、等待分开
什么时候选：任务跨天/周、目标明确但路径不可预测、需要持续追踪依赖，并频繁等待人和外部系统；例如客户 onboarding、销售/法务/采购之间的交易推进、患者转诊/预约/改期/文书、库存补货。可预测的流程仍应交给传统软件。原文示例是演示/模拟，不是生产部署；提供文本在 Making the loop durable 之后只有目录标题、正文缺失，不要编造缺失配置。

1. 先判断任务是否适合。适合的是「目标明确但路径不可预测、需要持续追踪依赖」的流程；可预测的流程仍应交给传统软件。前提：任务确实需要跨天/周等待，且路径不可完全预先编排。预期：你能说清为什么不用普通同步脚本或单次 agent 调用。

2. 把流程拆成决策、动作、等待三类。以库存补货为例：库存检查（触发）→ 获取报价（动作）→ 选供应商（决策）→ 草拟采购订单（动作）→ 请求审批（动作）→ 等待审批（等待）→ 下单（动作）→ 等待供应商确认（等待）→ 读取回复（动作）→ 等待收货（等待）→ 关闭订单（动作）。决策只做选择，动作才产生外部副作用。预期：每个步骤都能归入三类之一，等待步骤不混进动作。

3. 选一个持久化执行运行时，并先跑通原文示例。前提：有支持持久化执行的运行时；原文示例为 Temporal 和 Cloudflare。
```
# Temporal：在 python/ 目录启动 Temporal dev server 和一个 worker（见其 README），然后重新运行
# Cloudflare：在 typescript/ 目录执行
cd typescript/
npm run dev
# 或设置 CF_URL 指向 replenish.live，然后重新运行
```
预期：先理解示例时间线；这些是跑通交互示例的说明，不是生产部署步骤。生产环境要按运行时的文档配置持久化存储、worker 和重试策略。

4. 让运行时记录每个动作的结果。示例中的动作包括 get_quotes、draft_purchase_order、request_approval、place_order、read_supplier_reply、close_purchase_order；每一步的结果进入记录，崩溃后重放时跳过已完成步骤并重建状态。前提：动作结果可序列化保存，且重放不会重复产生副作用。预期：进程崩溃后重新运行，已完成步骤被跳过，状态由记录重建。

5. 把等待人工/外部系统改成挂起加信号恢复。示例用 wait_for_approval、wait_for_supplier_reply、wait_for_goods 三个等待步骤；时间线明确写 Compute used: None. The workflow is suspended.。恢复靠信号：approval（经理批准 $4.20，上限 $4.41）、supplier-reply（供应商确认 1000 件、24 October、$4.20）、goods-received（收货 1000 件）。前提：人或外部系统能把事件送回工作流，运行时支持持久化定时器和信号。预期：等待期间工作流挂起，不占计算；收到信号后继续推进。

6. 对外部写操作加幂等键，并在执行前重新校验约束。示例下单时使用 Idempotency key: PO 4473，执行前做 Price re-checked: $4.20, within the approved $4.41，结果供应商侧 Orders at the supplier for PO 4473: 1。前提：外部系统接受幂等键，或你能用业务单号去重；审批上限等约束要写成可检查的条件。预期：重试或恢复后不重复下单，价格不超过审批上限。

7. 用崩溃恢复验证持久化是否真的生效。原文示例包含 worker 进程 down/up 的崩溃区间，并说明崩溃后工作流继续推进。最小验证：在等待审批或等待收货时重启 worker，确认恢复后不重复下单、不丢审批状态；重复发送同一信号，验证幂等。前提：运行时和 worker 按生产方式配置，而不是只跑内存 demo。预期：恢复后状态一致，重复信号不产生重复外部写。

8. 上线前补齐原文目录提到但正文未展开的四项：失败调用至少一次重试、持久化不等于业务正确、运行中代码变更、记忆与模型可见上下文。提供文本只有这些标题，没有具体步骤；不要在没有依据时编造配置，应另行调研或等原文完整内容。预期：这四项都有明确的负责人和验证方式，不以 demo 通过代替。

### 做法 J：用 Claude Quickstarts 按工作类型选脚手架，再把可靠性模式抄进自己的实现
什么时候选：你想先找官方可运行示例，按工作类型选一个最接近的骨架；有 Claude API key；愿意只跑通最小路径再改造。不要把它当完整教程或生产组件；根 README 只是索引，子项目命令和配置在各自 README。

1. 克隆仓库。前提：本机有 git。
```bash
git clone https://github.com/anthropics/claude-quickstarts.git
cd claude-quickstarts
```
预期：拿到仓库索引。

2. 按工作类型选一个切入点，不要一次铺开。
| 你的工作形态 | 对应 quickstart |
|---|---|
| 有人在聊天里问、答案依赖内部知识库 | Customer Support Agent |
| 需要看数、出图、追问 | Financial Data Analyst |
| 要 AI 直接操作桌面软件 | Computer Use Demo / Computer Use Best Practices |
| 要 AI 在网页上导航、抓内容、填表 | Browser Use Demo / Browser Toolset |
| 长周期、多会话才能完成的大改动 | Autonomous Coding Agent |
| 每天/每周固定时间出一份摘要 | Managed Agents: Daily Brief |
| 有一堆文档，要反复回答同类问题 | Managed Agents: Knowledge Wiki |
| 工作在 IM/工单里发生，要 @ 一下就有回应 | Managed Agents: Slack / Linear / Chat SDK |
| 想让已有 agent 被 Claude Code / Desktop 调用 | Managed Agents: MCP Server (TypeScript) |
| 线上报错要自动定位并提 PR（人工审） | Managed Agents: Sentry Autofix |
预期：只选一个与当前高频任务最接近的骨架。

3. 进入该目录并安装依赖。前提：具体包管理器与命令看子项目 README。
```bash
cd <quickstart-name>
# 安装依赖：以子项目 README 为准（Python 通常 pip/uv，TS 通常 npm）
```
预期：依赖装好。

4. 配置 API key。README 明确要求以环境变量方式提供。
```bash
export ANTHROPIC_API_KEY=<your-key>
```
预期：环境变量配好。

5. 运行该 quickstart，先跑通最小路径，再动代码。
```bash
# 运行命令以子项目 README 为准
```
预期：最小路径跑通；不要停在「demo 能跑」，下一步把可靠性模式抄进自己的实现。

6. 跑通后，把以下可靠性模式抄到自己的实现里，作为设计检查项：
- Daily Brief：整套部署用文件描述、通过 ant apply 应用（agent、environment、两个 memory store、vault、cron deployment）；只读的偏好库与读写状态库分开；无人值守要「失败得体面」——按来源分别记 bookmark、用一个 ledger 防重复、某个源读不到就报「不可读」而不是当成「今天没事发生」。
- Knowledge Wiki：把语料一次性蒸馏成版本化的 memory-store 知识 wiki（一个动态 workflow run 完成抽取、消解、合并），之后反复问答走 wiki；每个事实带 provenance。
- Slack / Linear：无状态 webhook 桥接——@mention 或 AgentSessionEvent 创建 session，把 channel/thread 或 Linear 的 session/organization ID 存进 session metadata，收到 session.status_idled 再读回 metadata 回帖；没有数据库、没有长连接；Linear 用 OAuth actor=app 安装。
- Sentry Autofix：webhook 一 issue 一 session；凭证放在沙箱外的 vault；沙箱无外网路由；每个 session 设硬性花费上限；agent 只推分支，PR 由宿主用自定义工具打开，保证每个修复都过人。
- MCP Server：wait_for_idle 把事件流折叠成一次请求/响应；用 agent allowlist 限制 bearer token 持有者能碰到哪些 agent。
- Computer Use Best Practices：显式工具定义、正确的图像尺寸与裁剪、prompt caching、服务端压缩、批量工具调用、沙箱 shell、轨迹记录。
- Autonomous Coding Agent：双 agent（initializer + coding agent）；进度用 git 和一份功能清单持久化，agent 逐项推进。
注意：Browser Toolset 与 Computer Toolset 是「展示接口、非生产代码」；Computer Use Best Practices 要求放在 VM 里跑。

7. 先只跑通「读取 + 输出」的最小闭环，不做写操作、不发真实频道；再按第 6 步模式逐项补：凭证进 vault、去重 ledger、失败显式报错、花费上限。预期：降低风险，先验证价值再放开权限。

8. 同一任务先用人工方式做一周，记录基线，再切到 agent，用同样指标对比。预期：有基线，能判断是否改善；不要只看 demo 是否能跑。

### 机制对照表（按需跳到 learn-claude-code 对应章节）
- s01 Agent Loop：messages / while True / tool_use
- s02 Tool Use：TOOL_HANDLERS 分发表
- s03 Permission：PermissionRule / 审批流水线
- s04 Hooks：PreToolUse / PostToolUse
- s05 TodoWrite：plan-then-execute
- s06 Subagent：新 messages[]、上下文隔离
- s07 Skill Loading：SkillLoader / 目录 / 按需注入
- s08 Context Compact：tool_result_budget / snip_compact / micro_compact / compact_history
- s09 Memory：选择 / 抽取 / 固化
- s10 Task System：TaskRecord / blockedBy / 磁盘持久化
- s11 Background Tasks：线程执行 / 通知队列
- s12 Cron Scheduler：持久调度
- s13 Agent Teams：常驻队友 / 原子认领任务 / task-bound worktree / 类型化协议
- s14 MCP Plugin：工具发现 / 命名空间
- s15 Integrated Harness：把前面积累的机制重新接回一条完整循环
- s16 Workflow Runtime：工作流编排、可恢复 journal
- s17 Goal Loop：目标闭环

## 怎么判断变好了
可观察指标（harness 与生产分层）：
- AI 能在你的项目里调用工具、读写文件，并看到 git diff、错误日志、浏览器状态等观察再继续。
- 知识是按需加载（s07），不是把全部文档塞进上下文。
- 长会话遇到上下文压力时能压缩（s08 的 tool_result_budget / snip_compact / micro_compact / compact_history）。
- 大目标能拆小、带 blockedBy 依赖并持久化到磁盘（s10）。
- 慢操作能放后台线程、完成后注入通知（s11）；任务能定时自触发（s12）。
- 停止由可检查的目标门决定：s17 用独立评估器审查每一次提议的停止；不可能、已失败或超限的目标把控制权交回用户，而不是模型自述完成。
- 权限有边界：s03 的权限规则与审批流水线、s04 的 hook 扩展点。
- hello-agent-system：能按 make lesson N=xx 跑通 08 可靠性、11 评估，离线测试通过；能把失败模式图鉴、设计评审清单、Agent 构造骨架套到自己项目；能看见 Agent 每一步（render_tree(result.trace)）；高危操作会 paused 等人工审批；单进程可并发服务 50 个会话；kill -9 一个 worker 后任务由别的进程从检查点接手；多机只换组件不换接口。
- 注意：hello-agent-system 只拿到 README，讲义正文与数据未核实，性能数字和组件可靠性未核实，不能当生产组件。所以这些只是可试用指标，不是已验证生产指标。

可观察指标（可观测性）：
- Run 上能看到 status、duration、tokens、cost；Span 上能看到 type、name、status、duration、metadata；Error 能按签名分组；Finding 带 type、severity——这些字段齐全，说明埋点到位。
- 慢 / 卡 / 失败能在 dashboard 或 blazo inspect <run-id> 里直接定位到具体 span，而不是靠读提示词回放。
- findings 是自动产生的（不需要人主动去查），说明检测规则在起作用；repeated_tool、possible_loop、no_activity 能持续被推到 dashboard。
- 能用 blazo runs --json / blazo inspect <run-id> --json 把结果接进自己的脚本做前后对比。

可观察指标（Pi Durable）：
- 关闭进程并重新打开同一个 SQLite 文件后，能取得同一个 root conversation，并让 pending work 继续。
- 客户端网络重试或进程重启后复用 requestId，重复 submit 返回已有 submission，而不是重复执行。
- 只读、确定性工具可声明 replay: 'safe' 并自动重跑；有副作用工具未声明 safe 时不会自动重跑，模型会看到 interrupted 说明和已经保存的输出，应用仍需核验外部系统的真实状态。
- 审批 deploy 等用 durable memo，崩溃重跑复用已持久化审批结果，不重复问人。
- 子 agent 按 ownerTaskId 查询 / 创建，replay 不重复生成孩子；前台 child 阻止父 idle 并随 abort 清理；后台 child 不阻止 idle 且必须有单独取消入口。
- compaction 配置后接近上限后台摘要，原始 entries 仍在 storage 可检索；provider 报上下文过长时压缩并重试一次。
- 注意边界：不是 exactly-once；SQLite synchronous=NORMAL 可保住进程崩溃前已提交的数据，但不保证断电、宿主故障或存储损坏时不丢最新数据；fork 继承 transcript 和 agent/document 语义，不复制文件系统、容器、网络资源等外部状态。实验性 API，需锁版本。

可观察指标（Cursor Agent SDK）：
- 命中率：被 agent 标记且人工确认为真问题的比例；对照人工全量检查算漏报。
- 误报率 / 噪音：每个 PR 平均无效告警数，以及工程师主动忽略 / 关闭的比例。
- 引用可核验率：每条发现都能指到具体条目（团队约定、历史决策、知识库笔记），指错即为缺陷。
- 周期时间：PR 从提交到合并的时间、需要人工 review 轮次的前后对比。
- 一致性：同一批回放事件重复运行，结论是否稳定；用 event replay 做回归。
- 采用率：工程师对 agent 提出的问题实际处理（修正或明确驳回）的比例。
- 注意：Cursor 内部一个团队「大约一天」做出 kb-reviewer、跑在主库每个 PR 上，是单点内部案例，无准确率、误报率、节省工时等数字；PGA Tour 的推荐语无数据。这些是作者主张或客户证言，不是已验证基准。

可观察指标（NamiAgent）：
- demo 模式不配 key 也能在 http://localhost:8765 看到每一步思考和本次发给模型的完整上下文；右侧能看到 token 占用。
- 真实模型模式下，写文件、跑命令这类有副作用的操作会弹窗确认；文件只落在 NAMI_WORKSPACE；第 3 课起 Agent 只能操作工作区。
- cd lessons/lesson-11 && pytest -q 能跑测试；README 预期第 11 课 49 个测试通过，实际数量以运行结果记录。
- 逐课运行 lesson-01 到 lesson-11，对比相邻快照，确认每一课新增能力可运行。
- 换模型时只改 BASE_URL / MODEL 并重跑同一任务，记录是否还能完成；README 未给模型与任务匹配的对比数据，这一项是建议记录，不是原文结论。
- 建议对比加入权限、计划、上下文管理前后的完成情况、人工确认次数、越界尝试次数和每轮上下文长度；前三项是 README 能直接支持的功能性指标，后面几项是建议用于实际工作流对比的指标，不是原文给出的数据。

可观察指标（长周期持久化执行）：
- 完成率提升、端到端时长缩短、人工催办/干预次数下降；重复外部写操作和审批越界为 0；恢复后状态一致；等待期间不持续消耗模型/计算资源。
- 原文示例的可核对输出：outcome=received；Orders at the supplier for PO 4473: 1；Price re-checked: $4.20, within the approved $4.41；等待步骤 Compute used: None. The workflow is suspended.。这些是示例时间线，不是生产业务指标。
- 记录基线：传统流程的端到端时长、人工催办次数、重复操作数、审批越界数、等待期间计算成本。
- 原文建议小范围跑 2-4 周，对比试点流程的完成率、平均端到端时长、人工干预次数、重复副作用数、崩溃恢复成功率、每次任务的计算成本；若这些指标没有改善或仍需大量人工兜底，说明流程还没达到可产品化的持久化执行条件。

可观察指标（Claude Quickstarts）：
- 上手成本：从 clone 到本机跑通所需时间；把它接到自己数据上所需改动文件数/行数。
- 任务质量：产出被直接采用的比例、需要人工修改的比例、事实性错误数（Knowledge Wiki 场景可查 provenance 是否指对）。
- 可靠性：连续 N 次运行的成功率；源不可读时是否被报成「不可读」而不是静默变成「无内容」（这是 Daily Brief 明确的设计目标，可直接当验收项）。
- 成本：单次运行成本、单问成本，与「直接对原始文档检索/人工处理」的基线对比。
- 风险：写操作是否都经过人工确认（如 Sentry Autofix 式的「agent 只推分支、人开 PR」）；凭证是否始终在沙箱外；是否有硬性花费上限。
- 判断「有改善」的最低门槛：同一任务上，产出被采用率不低于人工基线，单次耗时明显下降，且连续两周无静默失败（即失败都能被看见）。达不到就退回 study，只借它的架构模式，不搬它的具体实现。

最小试用方式：
- 做法 A：先跑通 learn-claude-code 的 s01，再挑一个与你当前痛点对应的章节（上下文爆了就 s08，目标总漂移就 s17，权限失控就 s03），把它抄进自己项目。
- 做法 B：先把 harness 五件套清单填一遍，跑一个真实小任务。
- 做法 C：先 make check-env 和 00 demo，然后优先跑 08 与 11 两课。
- 做法 D：先套 Agent 构造骨架跑一个真实小任务，再用多 worker 和组件替换做一次崩溃恢复演练。
- 做法 E：clone → bun apps/cli/src/index.ts watch → 跑 examples/basic-agent 看到 run 出现在 dashboard → 再给自己的 TypeScript agent 加 observe / span / log 埋点，用 blazo runs / blazo inspect 下钻一次真实问题。
- 做法 F：npm install 锁版本 → SQLite 最小 harness → 提交一个带稳定 requestId 的 job → 关闭 / 重启进程验证 resume → 再用一个假副作用工具验证 replay 边界和外部幂等键 → 最后加审批 memo。重点验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复。不要直接生产；升级单独做故障恢复回归测试。
- 做法 G：选一个标准写得出、每周至少发生数次的重复任务（例如 PR 是否符合团队约定 / 历史决策），把这份约定整理成可引用的条目；建项目、写提示词与一个工具（读 PR diff + 检索条目），本地 playground 跑通；先影子模式，只输出发现与引用出处，不自动批准、不自动路由；用 evals + 事件回放，把过去若干真实 PR 作为固定测试集，改一次提示词跑一次；只有当误报可接受、且人工复核成本明显低于自己从头看时，再 agent-sdk deploy 上线并逐步放开写操作权限。
- 做法 H：第一，不配 API Key 跑 python web/app.py --demo，打开 http://localhost:8765，确认能看到每一步思考和完整上下文；第二，在专用工作区配置真实模型，跑 python web/app.py，让它写一个 hello.py 并运行，确认写文件和跑命令前会弹窗，且文件只落在 NAMI_WORKSPACE；第三，跑 cd lessons/lesson-11 && pytest -q，按 README 预期是 49 个测试通过，若实际数量不同以实际结果记录。进一步再逐课运行 lesson-01 到 lesson-11，对比相邻快照。
- 做法 I：选一个真实但低风险的长周期流程（如采购审批或客户 onboarding 的某一段），限定 1 个流程、1-2 个外部系统、1 个审批人；用 Temporal 或 Cloudflare 搭最小工作流，步骤分成 decision/action/wait，等待审批和外部回复用挂起加信号，写操作加幂等键；可先跑通原文 demo 的命令理解时间线；人为在等待期间重启 worker/进程，验证恢复后不重复下单、不丢状态；重复发送同一信号，验证幂等。
- 做法 J：建议 1-2 天，只选一个任务和一个最接近的 quickstart：从自己工作里挑一个高频、边界清楚、有现成输入的任务（例如每工作日汇总 Slack 与 PR，或对一批文档反复回答同类问题）；选对应脚手架（定时摘要 → Daily Brief；文档问答 → Knowledge Wiki；IM 内应答 → Slack 或 Linear）；先只跑通「读取 + 输出」的最小闭环，不做写操作、不发真实频道；再按可靠性模式逐项补：凭证进 vault、去重 ledger、失败显式报错、花费上限；同一任务先用人工方式做一周，记录基线，再切到 agent，用同样指标对比。

试多久：
- learn-claude-code 按 README Quick Start 从 s01 逐章跑通到 s17 再定。
- hello-agent-system 主线约 6 小时、第三部分约 3.5 小时、第四部分约 3 小时，赶时间走 4 小时速通路线；本次只拿到 README，建议先跑 08 与 11 验证可靠性 / 评估再决定是否纳入工作流。
- blazo 建议在一个真实调试场景里小范围试（自标 MVP），先用它回答一次「为什么这次 run 慢 / 卡住」，再决定是否长期挂着。
- Pi Durable 建议按一个真实小任务做到能复现一次崩溃恢复再决定是否扩大；官方标 Experimental，不要直接承担生产关键路径。
- Cursor Agent SDK 建议 1–2 周、单人可做：选任务、整理条目、建项目、本地 playground、影子模式、evals 回放；误报可接受后再 deploy。原文是产品发布文，缺安装与评测的具体写法、权限模型、成本与限额，动手前需读官方文档补齐。
- NamiAgent 建议按 lesson-01 到 lesson-11 逐课跑一遍再决定是否复用其控制点；先跑 demo 和专用工作区真实模型小任务，再跑第 11 课测试。只拿 README，没有各课正文和完整代码，先小范围验证，不要直接用于生产工作流。
- 长周期持久化执行建议按原文示例先跑通一个低风险流程，再小范围跑 2-4 周；先验证崩溃恢复、重复信号、幂等和审批上限，不要用 demo 通过代替生产验证。
- Claude Quickstarts 建议 1-2 天只选一个任务/脚手架，先跑通最小闭环，再补可靠性模式；同一任务人工基线一周，对比产出采用率、单次耗时和静默失败。
- 注意：s05 有一句「先列步骤，完成率翻倍」，README 未给数据来源，不能当已验证指标。

## 常见坑
- 混用新旧两条线章节号：旧 12 课保留在 docs/ 和 agents/，新 17 课是主线，README 有映射表。
- 只读 README 不跑 code.py：每章 code.py 才是独立可运行实现。
- 把 harness 当成拖拽式工作流 / 无代码 AI Agent 平台 / prompt 链编排库：仓库明确说这类只是「塞了一个 LLM 的 Rube Goldberg 机器」。
- 试图改主循环加功能：原则是循环保持不变，新工具往分发表加 handler，扩展点靠 hook。
- 没配 ANTHROPIC_API_KEY 就跑；跑模型会产生调用费用。
- 不区分「模型能力」和「harness 职责」：Agency 来自模型训练，不是来自外部代码编排；harness 只是给模型一个可操作的环境。
- 每章实现细节未随 README 给出，效果主张缺数据；不要直接全量上生产。
- hello-agent-system 不要照抄模型名 gpt-5.6-luna，那是作者环境，必须换成自己的模型；也不要把 hello-agent-system 直接当生产组件。
- hello-agent-system 没有 key 可跳过配置（所有 demo 支持 --offline，练习和测试离线）；不要因为没 key 就放弃验证。
- 多机替换组件时注意接口不变但组件行为不同，先小范围验证。
- 综合实战 capstone/ 的审批部分原文未完整给出，按需查看仓库。
- blazo：埋完点忘了在退出前调用 shutdown()，缓冲的 telemetry 不会导出，dashboard 上会「什么都没有」。
- blazo：span 的 type 没按 llm | tool | agent | error | session 如实标注，dashboard 展示样式和后面对 findings 的判断都会失真。
- blazo：不调 detection 阈值。默认 30000ms / 3 次 / 3 次 / 30000ms / 4 次不一定匹配你的工作流，容易全是误报或全都不报。
- blazo：把它当评测 / playground / 提示词管理 / 数据集 / agent 市场用——原文明确不做这些，也不做 SaaS / 云。
- blazo：只做 OTLP/HTTP（4318），不做 gRPC；只提供 TypeScript SDK 一个集成，其他语言要自己发 OTLP。
- blazo：把 dashboard 配图当成当前 UI——原文明确标注为目标设计而非当前 UI；项目自标 MVP，不要当稳定生产依赖。
- blazo：把「install 后立刻看到执行」「run 约 2 秒出现在 dashboard」当已验证指标——这些是作者主张。
- Pi Durable：把它当稳定 API / 分布式工作流平台 / exactly-once 执行系统。README 标 Experimental，API 可能无通知变化。
- Pi Durable：同一个 storage 多个进程同时打开。它没有跨进程锁，当前只允许一个 owner 进程。
- Pi Durable：每次重试都生成新 UUID 当 requestId，等于主动绕过去重。
- Pi Durable：把 wait() 取消当成任务取消；取消等待者不取消底层工作，要停 conversation 用 conversation.abort()。
- Pi Durable：给有副作用的工具声明 replay: 'safe'；声明错了会重复副作用。deploy、发布、合并、删除、付款、退款、发券、发邮件、发消息、创建工单、无幂等键外部写、依赖外部状态的 shell 命令默认不要声明。
- Pi Durable：把 task checkpoint 已保存当成外部副作用一定没发生；恢复时要查外部系统状态再继续 / 补偿 / 转人工。
- Pi Durable：审批 memo 如果有时效，不在业务层保存批准范围、操作者、时间和过期规则，崩溃重跑会误用旧批准。
- Pi Durable：后台子 agent 不给单独取消入口，普通 abort 不会停它，形成孤儿工作。
- Pi Durable：忘了处理单实例选主、storage 备份、进程锁、认证授权、ExecutionEnv 隔离、秘密注入和版本迁移；这些不是自动提供。
- Pi Durable：SQLite synchronous=NORMAL 不保证断电、宿主故障或存储损坏时不丢最新数据。
- Pi Durable：fork 继承 transcript 和 agent/document 语义，不复制文件系统、容器、网络资源等外部状态。
- Cursor Agent SDK：把原文当完整教程。安装命令、playground 启动、eval 具体写法、权限模型、成本与限额都缺，动手前必须查官方文档。
- Cursor Agent SDK：一上来就自动批准 / 自动路由，没有先影子模式跑真实 PR 或真实事件。
- Cursor Agent SDK：没有把团队约定 / 历史决策整理成可引用条目就让 agent 做检查；引用可核验率无法保证，误报也无法归因。
- Cursor Agent SDK：改提示词不跑 evals / 事件回放，越改越差；固定测试集是回归底线。
- Cursor Agent SDK：忽略强绑定 Cursor 生态（模型 id、dashboard、部署基础设施）；自托管只说明单 Node 进程可容器化，未给资源要求、成本和限额。
- Cursor Agent SDK：把 Cursor 内部「大约一天做出 kb-reviewer」当成效果数据；原文无准确率、误报率、节省工时，PGA Tour 也只是客户证言。
- Cursor Agent SDK：复杂任务不拆分，一个 agent 硬扛；原文明确可用带独立工具和会话的专用 agent，或并行子 agent。
- NamiAgent：把它当生产级框架。作者明确说是教学代码，不是生产框架，也不打算和 Claude Code、Codex 比功能。
- NamiAgent：把工作区指向主目录。Agent 会真的执行命令、读写文件；必须使用专用工作区目录，不要把 NAMI_WORKSPACE 指向主目录。
- NamiAgent：以为第 3 课权限能挡有意攻击。它能挡误操作和低成本越界，但挡不住有意的攻击。
- NamiAgent：把网页端展示的思考当成模型内部真实计算过程；界面里展示的思考只是模型写出来的文字。
- NamiAgent：没配 API Key 就放弃。python web/app.py --demo 不需要 key，第 11 课测试也用假模型，不需要 key。
- NamiAgent：把第 11 课「49 个测试」当成绝对数字；它是 README 预期，实际以运行结果记录。
- NamiAgent：默认 DeepSeek、OpenAI 兼容，换模型只改环境变量；README 未给不同模型或不同任务如何匹配的对比数据，不要自行编造匹配结论。
- NamiAgent：只拿 README 就认为已核实每课实现质量；目前没有各课正文和完整代码，无法核实每一课的实现质量和细节。
- NamiAgent：把第 7 课定时任务当成完整方案；README 只给课程名和一句话，未展开具体触发条件、状态机和失败处理。
- NamiAgent：忽略第 6 课 bot 需要 TG_BOT_TOKEN 和 TG_ALLOWED_USERS，第 8 课 MCP 配置在 ~/.nami-agent/mcp.json。
- 长周期持久化执行：把可预测流程也交给长周期 agent；可预测流程仍应交给传统软件。
- 长周期持久化执行：只跑 demo 就当生产部署；原文示例是演示/模拟，不是生产部署，缺完整代码与量化结果。
- 长周期持久化执行：等待用轮询占算力，而不是挂起加信号；示例明确等待期间 Compute used: None. The workflow is suspended.。
- 长周期持久化执行：外部写没有幂等键，重试重复下单/付款/发消息；用业务单号或业务键去重，并在执行前重校验审批上限等约束。
- 长周期持久化执行：把「持久化」当「业务正确」；等待期间外部世界变化，恢复后要重新校验价格、库存、审批有效期等。
- 长周期持久化执行：崩溃恢复只测进程内异常，不测等待期间重启 worker；要在等待审批或收货时重启验证，并重复发送同一信号验证幂等。
- 长周期持久化执行：原文目录提到失败调用至少一次重试、持久化不等于业务正确、运行中代码变更、记忆与模型可见上下文，但正文未展开；不要编造配置，需另行调研。
- 长周期持久化执行：以为 Temporal/Cloudflare 已与 Claude Code、Cursor、OpenClaw 集成；原文没有提到，不要声称已经集成。
- Claude Quickstarts：把根 README 当完整教程。它只是索引，没有代码、具体命令、提示词、配置样例；第 3-5 步必须打开子项目 README 补齐。
- Claude Quickstarts：一次铺开多个 quickstart。应按工作类型只选一个，先跑通最小路径。
- Claude Quickstarts：把 quickstart 直接当生产代码。Browser Toolset 与 Computer Toolset 自述「展示接口、非生产代码」；Computer Use Best Practices 要求放在 VM 里跑。
- Claude Quickstarts：忘记用环境变量提供 ANTHROPIC_API_KEY；跑模型会产生调用费用。
- Claude Quickstarts：把 stars 当效果证据。20623 stars、531 stars_today 只是关注度，不是效果数据；所有「demonstrates」都是官方主张。
- Claude Quickstarts：忽略 Managed Agents 的平台绑定。ant apply、session metadata、vault、cron deployment 等迁移到别的平台需要重写管道。
- Claude Quickstarts：无人值守摘要不做按来源 bookmark 和去重 ledger，源读不到时静默当成「今天没事发生」；Daily Brief 明确要求失败得体面，报「不可读」。
- Claude Quickstarts：凭证放在沙箱内；Sentry Autofix 要求凭证在沙箱外 vault、沙箱无外网路由、单 session 硬性花费上限、agent 只推分支、PR 由人开。
- Claude Quickstarts：忽略工具集版本日期。computer_toolset_20260801、browser_toolset_20260801 接口可能随版本变化。

## 证据与来源
- learn-claude-code：本手册保留的 harness 公式、最小 agent loop、s01→s17 机制、旧 12 课、Kode CLI、姊妹仓库 claw0 / OpenClaw 的 Heartbeat 与 Cron、web 端命令，均来自 shareAI-lab/learn-claude-code 的 README 与目录结构（给定指标：77,855 stars，MIT 许可）。s05 的「先列步骤，完成率翻倍」README 未给数据来源，只是作者主张。仓库效果主张缺数据，建议小范围试。
- hello-agent-system：32 节课、不依赖 Agent 框架、课程结构（讲义 + demo.py + exercise.py + solution.py + test_exercise.py，测试离线、确定性、零成本）、工具书文档（79 种失败模式、199 条设计评审清单、76 道面试题、框架对照表、一页纸速查、术语表、生产就绪指南、135 条延伸阅读）、综合实战 ITBuddy、生产组件替换（Postgres / Redis / Temporal / OpenTelemetry / LiteLLM / Cedar）、组装骨架与分布式 worker 代码，均来自 heaven999b/hello-agent-system 的 README（MIT、约 32 星、中英双语）。本次只拿到 README，没有讲义正文与数据，性能数字和组件可靠性均未核实；模型名 gpt-5.6-luna 来自作者环境，必须替换。结论建议小范围试：先跑 08 可靠性、11 评估两课，并把失败模式图鉴、设计评审清单、Agent 构造骨架套到自己项目；因为原文给出了可照抄的配置、代码和全离线测试，能低成本验证生产级分层是否补得上。
- blazo：可照做内容来自 agentblazo/blazo README：安装与启动命令、SDK 三段 API（observe / span / log）示例与语义、blazo.config.json 的全部默认值与字段名、collector 的 11 个 HTTP 端点与 SSE 事件名、五条检测规则的触发条件与默认阈值、六个 dashboard 页面的路由与内容、五类数据实体（Run / Span / Log / Error / Finding）的字段、端口 4318 与 3000、SQLite（WAL）、OTLP/HTTP JSON、默认每 5 秒周期扫描、仓库目录结构与测试命令。只是作者主张、未经第三方验证的部分：「install Blazo, run an agent, and immediately see its execution live」「run appears in the dashboard within ~2s」等；项目自标 MVP，dashboard 配图标注为目标设计而非当前 UI；原文只给规则定义，没有「用 findings 发现新任务」的案例，手册里那一层推断已标注。结论仍建议小范围试：先在一个真实 TypeScript agent 的调试环节接入，用 runs / inspect 定位一次慢、卡死或重复错误，再决定是否长期使用。
- Pi Durable：安装命令、最小持久 harness 代码、稳定 requestId 示例、工具 replay safe 示例与禁用清单、durable memo 审批 hook、子 agent ownership 代码、compaction 配置，均来自调研报告《Pi Durable》及其核验的原文、官方 README、官方示例目录和 Context7 当前文档。结论建议：如果要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用，先用 SQLite + 单进程 owner 做一个受控原型，重点验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复；不要把它直接当成稳定 API、分布式工作流平台或 exactly-once 执行系统。官方 README 标为 Experimental，API 可能无通知变化。审批权限与审计原文未提供完整方案；支付示例的 payment-${task.id} 幂等键与 abort 补偿退款是作者示例，不是已验证生产方案。需把三个包锁到精确版本，升级单独做故障恢复回归测试。
- Cursor Agent SDK：defineAgent 示例、模型 id composer-2.5 与参数 effort high / fast true、agent-sdk deploy 命令、自托管为单个 Node 进程可容器化、事件触发（PR / 合规 / 事故）、子 agent 移交与并行、本地 playground、evals 与事件回放、kb-reviewer 案例，均来自调研报告《The Agent SDK》及其核验的 Cursor 发布文。数据：Cursor 内部一个团队「大约一天」做出 kb-reviewer，现跑在主库每个 PR 上，会标记与已记录经验冲突的改动并引用对应笔记；这是单点内部案例，没有准确率、误报率、节省工时等数字。PGA Tour 的 Michael Gyarmathy 推荐语称用该 SDK 构建其「软件工厂」全部组件、内置 evals 让其快速迭代；属客户证言，无数据。其余为作者主张：agent 应围绕团队工作流定制、策略应可检查可修改、代码化便于版本控制与评审；没有对照实验或基准支撑。适用条件是软件团队、以 PR / 合规 / 事故等事件为中心的重复流程；强绑定 Cursor 生态；原文缺安装与评测具体写法、权限模型、成本与限额。结论建议小范围试 1–2 周、单人可做：先影子模式，只输出发现与引用出处，用过去真实 PR 做 evals 回放，误报可接受且人工复核成本明显更低后，再 agent-sdk deploy 并逐步放开写操作权限。
- NamiAgent：证据主要来自 aa1143/NamiAgent README：100 行最小循环、lessons/lesson-01 到 lesson-11 每课可运行快照、第 11 课 49 个测试、只依赖 openai 一个包、网页端只用 Python 标准库、demo 模式不需要 API Key、环境变量 API_KEY / BASE_URL / MODEL / NAMI_WORKSPACE / NAMI_STATE_DIR、第 3 课起限定工作区并做权限确认、第 6 课 TG_BOT_TOKEN 与 TG_ALLOWED_USERS、第 8 课 MCP 配置 ~/.nami-agent/mcp.json、第 3/4/5/7/8/9/10/11 课可复用控制点。仓库指标显示 37 stars，但这不是效果证据。局限：目前只拿到 README，没有各课正文和完整代码，无法核实每一课的实现质量和细节；作者自述是教学代码，不是生产级框架，也不打算和 Claude Code、Codex 比功能；权限机制挡不住有意攻击；必须使用专用工作区；界面里展示的思考只是模型写出来的文字，不等于模型内部真实计算过程；第三部分写的是截至 2026 年 10 月的情况，产品更新快，细节应以各自官方文档为准。结论建议小范围试：先跑 demo 看每一步思考和完整上下文，再在专用工作区用真实模型写一个 hello.py 并运行确认权限弹窗和工作区限制，最后跑第 11 课测试并逐课对比；不要直接用于生产工作流。
- 长周期持久化执行：来自调研《Long-horizon agents and durable execution》及其核验的原文（Martin Fowler 源）。原文用库存补货示例展示：3 家供应商报价 A $4.20、5 天、98% 准时；B $4.05、12 天、91%；C $4.60、3 天、99%；选择 A 1000 件，PO 4473，总价 $4,200；审批上限 $4.41，经理 Priya 批准 $4.20；供应商确认 1000 件、24 October、$4.20；收货 1000 件；关闭订单；outcome=received；下单使用 Idempotency key: PO 4473，供应商侧 Orders at the supplier for PO 4473: 1；价格重校验 Price re-checked: $4.20, within the approved $4.41；等待步骤标注 Compute used: None. The workflow is suspended.；示例包含 worker 进程 down/up 崩溃区间。这些是演示/模拟时间线，不是生产部署，也没有量化业务结果。局限：提供文本在 Making the loop durable 之后只有目录标题、正文缺失，无法提炼实体/工作流划分、等待、重试、正确性、代码变更、记忆、提示词控制的具体做法；作者关于「改变经济性」的判断是主张；持久化只保证恢复，不保证业务正确，等待期间外部世界变化需要额外校验。原文没有提到 Claude Code、Cursor、OpenClaw 的集成，不能声称已集成。结论建议小范围试：选真实但低风险的长周期流程，限定 1 个流程、1-2 个外部系统、1 个审批人，用 Temporal 或 Cloudflare 跑通 decision/action/wait 与挂起加信号，在等待期间重启 worker 验证不重复下单、不丢状态，重复信号验证幂等，记录基线并小范围跑 2-4 周再决定是否扩大。
- Claude Quickstarts：证据来自 anthropics/claude-quickstarts 的仓库根 README，本质是索引页：列出约 18 个项目；通用五步为 clone → 进目录 → 装依赖 → 设 ANTHROPIC_API_KEY → 运行，但第 3-5 步的实际命令被推到各子项目 README；可靠性模式包括 Daily Brief 的 ant apply、按来源 bookmark、去重 ledger、只读偏好库与读写状态库分开、源不可读要显式报错；Knowledge Wiki 的一次性蒸馏、版本化 memory-store、每个事实带 provenance；Slack / Linear 的无状态 webhook 桥接、session metadata、session.status_idled 回写、Linear OAuth actor=app；Sentry Autofix 的 webhook 一 issue 一 session、凭证在沙箱外 vault、沙箱无外网路由、单 session 硬性花费上限、agent 只推分支、PR 由宿主打开；MCP Server 的 wait_for_idle 和 agent allowlist；Computer Use Best Practices 的显式工具定义、正确图像尺寸与裁剪、prompt caching、服务端压缩、批量工具调用、沙箱 shell、轨迹记录；Autonomous Coding Agent 的双 agent（initializer + coding agent）、用 git 和功能清单持久化进度。数据：仓库指标 stars 20623、stars_today 531，只是关注度，不是效果证据。局限：根 README 没有代码、具体命令、提示词、配置样例；所有「demonstrates」都是官方主张，没有数字、基准或对比实验；Computer Use Best Practices 要求放在 VM 里跑；Browser Toolset 与 Computer Toolset 自述「展示接口、非生产代码」；工具集名称带版本日期，接口可能随版本变化；Managed Agents 系列依赖 ant apply、session metadata、vault、cron deployment 等特定平台能力，迁移到别的平台需要重写这部分管道。结论：把它当作「任务→脚手架」选型目录，小范围试 1-2 天，只选一个任务和一个最接近的 quickstart，先跑通「读取 + 输出」最小闭环，再补凭证 vault、去重 ledger、失败显式报错、花费上限和人工审核。

## 依据的调研

- [shareAI-lab/learn-claude-code](../research/radar/2026-10-01/526-shareai-lab-learn-claude-code.md)：值得一试，建议小范围试：按 README 的 Quick Start 从 s01 逐章跑通到 s17，并把其中的 Harness 五件套（Tools/Knowledge/Observation/Action/Permissions）与最小 agent loop 当作给真实工作搭环境的检查清单和骨架。理由是它给的是可克隆、可运行、可复制的具体步骤与代码，而不只是观点；但每章实现细节未随 README 给出，效果主张也缺数据，先试再定。
- [heaven999b/hello-agent-system](../research/radar/2026-10-02/773-heaven999b-hello-agent-system.md)：值得一试，建议小范围试：让正在自建 Agent 的工程同学按「读讲义 → 跑 demo → 写练习 → make lesson N=xx」跑通可靠性（08）与评估（11）两课，并把失败模式图鉴、设计评审清单和 Agent 构造骨架直接套到自己项目上；因为原文给出了可照抄的配置、代码和全离线测试，能低成本验证生产级分层是否补得上。但本次只拿到 README、没有讲义正文与数据，性能数字和组件可靠性均未核实，不要照抄模型名，也不要把它当生产组件。
- [agentblazo/blazo](../research/radar/2026-10-03/819-agentblazo-blazo.md)：值得一试，先在一个 TypeScript agent 的调试环节小范围试：按 README 的 clone → mise/bun install → bun apps/cli/src/index.ts watch 起本地 collector+dashboard，用 observe/span/log 埋点，再靠 runs/inspect 与 findings 定位慢、卡死、重复错误。理由是原文给出了可直接照做的命令、SDK 用法、config 默认阈值和五条确定性检测规则，但项目自标 MVP、dashboard 配图明确标注为目标设计而非当前 UI，因此适合试一试而不是直接采用。
- [Pi Durable](../research/radar/2026-10-06/1606-pi-durable.md)：值得一试，如果要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用，先用 SQLite + 单进程 owner 做一个受控原型，重点验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复；不要把它直接当成稳定 API、分布式工作流平台或 exactly-once 执行系统。
- [The Agent SDK](../research/radar/2026-10-29/7961-the-agent-sdk.md)：值得一试，先用一个标准明确、高频重复的任务（比如让每个 PR 按团队知识库做一致性检查）小范围试：把提示词写成 Markdown、工具写成 TypeScript 函数、评测和事件回放一起放进代码仓库，在本地用 playground 跑通评测，再执行 `agent-sdk deploy` 上线为事件触发；理由是原文给出了从定义到部署的最小可操作流程和一个内部落地案例，但安装细节、评测配置和量化效果都缺失，只适合小范围验证。
- [aa1143/NamiAgent](../research/radar/2026-10-31/8889-aa1143-namiagent.md)：值得一试，建议小范围试：按 README 从 lesson-01 到 lesson-11 逐课运行，并用网页端观察上下文与权限确认；它把工具、上下文、权限、计划、记忆等供给方式做成了可运行快照，但属于教学代码，需在专用工作区验证后再用于实际工作流。
- [Long-horizon agents and durable execution](../research/radar/2026-11-10/12301-long-horizon-agents-and-durable-execution.md)：值得一试，对需要跨天或跨周、频繁等待人和外部系统的智能体任务，可按原文示例改成持久化执行：记录每一步外部交互结果，等待用挂起加信号恢复，外部写操作加幂等键并重校验约束；先用一个真实流程小范围试点。理由是原文用库存补货案例展示了崩溃恢复、审批/供应商/收货信号和重复下单防护，但只给了示例时间线，缺少完整代码与量化结果。
- [anthropics/claude-quickstarts](../research/radar/2026-11-11/12468-anthropics-claude-quickstarts.md)：值得一试，把这份仓库当作“任务→脚手架”的选型目录：先按你的实际工作类型挑一个 quickstart（如定时简报、知识库问答、IM/工单触发、跨会话编码），照通用五步跑通，再抽取其中的可靠性模式（书签/去重账本、凭证放 vault、沙箱无外网、单会话花费上限、人工审核 PR）。理由是官方给了可运行、可改造的骨架和明确的通用起手流程，但 README 只是索引，具体命令、配置和提示词都在各子项目 README 里，本材料无法直接照抄，因此只到“小范围试”。
