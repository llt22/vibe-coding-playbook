# 让 coding agent 长期在线，崩溃重启后还能接着干

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决把 AI 从聊天框搬到项目里、补齐 harness 与生产分层，并让 coding agent 可持久恢复、可观测、可验证的问题。
> 先试这一步：先选一条最小路线：跑通 learn-claude-code 的 s01，或用 Pi Durable 的 SQLite 骨架提交一个带稳定 requestId 的任务，验证进程重启后能继续。
> 最近修订：2026-10-06

## 解决什么问题
模型本身已经有感知、推理、行动能力（Agency），但一个能用的 agent 产品 = 模型 + harness。这份手册解决：你只在聊天框里用 AI，它看不到你的代码库、跑不了命令、记不住跨会话目标、停没停全凭它自己说；或者你自建 Agent 只能跑起来，但不可靠、不可控，出了问题只能靠回放提示词去猜；以及当你要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用时，怎么先用可持久 harness 做受控原型。要做的有几件事：给它搭一个可操作的环境，把工具、知识、观察、动作接口和权限补齐（仓库把这一段叫 harness engineering，以 Claude Code 为范本）；再用生产级分层补齐可靠性、安全、可观测、评估、并发、成本和发布（以 hello-agent-system 为课程）；当它真的慢、卡住或反复报错时，用真实 telemetry 而不是提示词回放定位（以本地可观测性工具 blazo 为例）；最后，用 Pi Durable 验证持久化、断点恢复、submission 去重、工具重放边界和外部副作用幂等，但不要把它当稳定 API、分布式工作流平台或 exactly-once 执行系统。

## 适用与不适用

适用：
- 你想让 AI 在自己的项目里持续干活，愿意按机制逐项搭环境，有 Python 环境和 Anthropic API key，能跑代码、看输出、按章节对照。
- 正在自建 Agent 的工程同学：想用离线 demo、练习和测试验证生产级分层是否补得上，有 Python 3.10+、git、make，以及任意支持 function calling 的 OpenAI 兼容接口（OpenAI / DeepSeek / 通义 / 本地 vLLM / 模型网关均可）；没有 key 也可跳过，因为 hello-agent-system 的所有 demo 都支持 --offline。
- 你的 agent 是 TypeScript 写的、有多个工具调用和 LLM 调用，痛点在“慢 / 卡 / 失败”的现场排查，本机可以装 Bun（或 Node 20+），选 blazo。
- 你要把 coding agent 嵌入 Slack、GitHub bot、TUI 或服务端应用，希望进程因休眠、OOM、容器重启或部署中断后能从已提交 checkpoint 继续；需要一个 harness 同时运行多个 conversation，或从任意 transcript entry 分叉新 conversation；需要多个客户端可重连、观察 committed state，并在 agent 忙碌时排队或 steer；需要 transcript、todo、计划、工单等应用状态在一个 transaction 中原子提交；需要工具、扩展和提示词可按名称注册与替换；需要上下文接近上限时后台 compaction，但原始 entries 仍留在 storage。Pi Durable 适用，但官方 README 明确标为 Experimental，API 可能在 release 之间无通知变化。

不适用：
- 你只想找一个现成工具、不打算跑代码或没有 API key；你期待拖拽式工作流 / 无代码 AI Agent 平台 / prompt 链编排就能解决；你不能接受跑模型产生调用费用。
- 你打算把 hello-agent-system 直接当生产组件——本次只拿到 README，没有讲义正文与数据，性能数字和组件可靠性均未核实，不要照抄模型名。learn-claude-code 同样每章实现细节未随 README 给出、效果主张缺数据，适合小范围试，不适合直接全量上生产。
- 你要的是评测、playground、提示词管理、数据集、agent 市场，或 SaaS / 云端可观测性——blazo 明确不做这些；你只想用 gRPC OTLP，或需要 TypeScript 之外的 SDK，也要自己另接。blazo 项目自标 MVP、dashboard 配图明确标注为目标设计而非当前 UI，不适合直接当稳定生产依赖。
- 你要的是稳定 API、分布式工作流平台或 exactly-once 执行系统：不要用 Pi Durable。它当前没有跨进程锁，同一个 storage 同一时间只允许一个 owner 进程；requestId 去重的是 submission，不自动让 deploy、付款、写外部 API 等副作用只发生一次；工具只有显式声明 replay: \"safe\" 才会在崩溃后自动重跑，声明错了会重复副作用。未做单实例选主、storage 文件备份、进程锁、认证授权、ExecutionEnv 隔离、秘密注入和版本迁移前，不要把它放到生产关键路径。

## 前置条件
- 能访问 GitHub 与 npm。
- 本机有 Python 环境和 pip；hello-agent-system 需要 Python 3.10+、git、make。
- learn-claude-code：有一个 Anthropic API key；课程跑起来需要配 ANTHROPIC_API_KEY。跑模型会产生调用费用。
- hello-agent-system：有任意支持 function calling 的 OpenAI 兼容接口；配 LLM_BASE_URL、LLM_API_KEY、LLM_MODEL。没有 key 可跳过，所有 demo 支持 --offline（用剧本模型 ScriptedLLM），所有练习和测试都是离线的。
- 需要 Node 才能跑 learn-claude-code 的 web 端。
- blazo：Bun（latest，可用 mise 管理，.mise.toml 固定 bun = \"latest\"）、Git；Node.js 20+ 仅在你于 Bun 之外运行 dashboard / SDK 时需要。
- 不要照抄 hello-agent-system README 里的 gpt-5.6-luna 这类模型名，那是作者环境，必须换成你自己的模型。
- Pi Durable：有 JavaScript/TypeScript runtime，能访问 npm；安装 @earendil-works/pi-durable、@earendil-works/pi-ai、@earendil-works/chord。官方 README 明示 API 会无通知变化，原型也应把这三个包锁到精确版本，并把升级单独作为一次故障恢复回归测试，不要长期跟随浮动版本。需要 SQLite 文件。需要调用方能为一业务工作生成稳定 requestId；需要逐个工具分析“同样参数执行两次是否安全”；需要为有副作用调用准备外部系统幂等键或补偿；审批需要 durable memo。生产化前另需处理单实例选主、storage 备份、进程锁、认证授权、ExecutionEnv 隔离、秘密注入和版本迁移。

## 操作步骤
先选路线：想系统理解 harness 机制、有时间和 API 预算，选做法 A；已经有自己的 agent 骨架、只想把环境检查清单补齐，选做法 B；想验证生产级可靠性、安全、评估分层，选做法 C；已有 Agent 骨架想直接套生产级组装，选做法 D；agent 已经能跑、但你要回答“它为什么慢、卡住或失败”，选做法 E；要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用，先用做法 F 做受控原型。可组合：先用做法 B 补 harness 清单，再用做法 C 跑可靠性与评估两课，用做法 D 的骨架套自己项目，如果 agent 是 TypeScript 再按做法 E 接本地可观测性，最后用做法 F 验证持久恢复和工具重放边界。注意 D 和 F 在持久化 / worker 上有差异：hello-agent-system 展示多 worker 从同一持久化队列领任务、kill -9 后租约过期由别的进程从检查点接手；Pi Durable 当前单 storage 只允许一个 owner 进程，没有跨进程锁。两者都写，按场景选：要分布式 worker 崩溃接手看 D；要单进程 owner、可恢复 conversation/task、submission 去重和 replay 边界看 F。不要把 F 当分布式工作流平台。

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

4. 想做“常驻型”而非“用完即弃”的 agent，按 README 指向姊妹仓库路线（claw0 / OpenClaw）叠加两个额外机制：Heartbeat（每 30 秒 harness 给 agent 发一条消息让它检查待办，没活就继续睡）和 Cron（agent 自己排未来任务，到点自动触发），再加 IM 多通道路由、持久上下文记忆和 Soul 人格系统。

### 做法 C：按 hello-agent-system 跑通可靠性（08）与评估（11），用离线测试验证生产级分层
1. 环境准备。前提：Python 3.10+、git、make。
```bash
git clone https://github.com/heaven999b/hello-agent-system.git
cd hello-agent-system
make setup          # 创建 .venv 并安装（核心依赖只有 openai + pydantic）
```
预期：.venv 创建好，核心依赖装好。

2. 配置模型接口。前提：有任意“支持 function calling 的 OpenAI 兼容接口”。没有 key 可跳过此步——所有 demo 都支持 --offline（用剧本模型 ScriptedLLM），所有练习和测试都是离线的。
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

5. 按投入选路线。前提：先决定花多少时间。主线（第一部分 + 第二部分 + 综合实战）约 6 小时；第三部分约 3.5 小时、第四部分约 3 小时，属进阶；赶时间走 4 小时速通路线（每课只读开头的“核心路径”）。

6. 优先跑可靠性（08）与评估（11）两课，并把失败模式图鉴、设计评审清单和 Agent 构造骨架直接套到自己项目上。理由：这是本次调研给出的建议小范围试路径；课程有 79 种失败模式、199 条设计评审清单、76 道面试题、框架对照表、一页纸速查、术语表、生产就绪指南、135 条延伸阅读等“工具书”文档可对照。

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

4. 用综合实战做一次端到端演练。前提：想验证“组装起来能不能跑成服务”。capstone/ 的 ITBuddy 用 deploy.py 一键拉起 API 进程 + 多个 worker 进程 + 共用持久化队列。原文此处关于审批的后续未完整给出，按需查看仓库。

### 做法 E：用 blazo 本地可观测性，回答“这个 TypeScript agent 为什么慢、卡住或失败”
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

8. 靠五条确定性检测规则把“日志里隐约可见”的执行模式变成 Findings（全部确定性、无 ML）：long_running 运行时长超过 longRunningMs，默认 30000 ms；repeated_tool 同一工具被反复调用 repeatedToolCount 次，默认 3；repeated_error 同一类错误重复 repeatedErrorCount 次，默认 3；no_activity 长时间无事件超过 noActivityMs，默认 30000 ms；possible_loop 循环检测达到 loopRepeatCount，默认 4。这些规则在 ingest 时和周期性扫描（默认每 5 秒）两个时机自动评估，命中后生成 Finding 并通过 SSE 推到 dashboard（finding.created 事件），不需要你主动去查。实践意义：repeated_tool 反复出现，可以反过来提示“这个环节其实不该由 AI 做”或“这里缺了工具”——注意原文只给了规则定义，没有给“用 findings 发现新任务”的案例，这一层是推断。

9. 人工排查时用 dashboard 六个页面：Overview /（指标卡、活跃 / 慢 / 最近 runs、findings、高频错误）、Runs /runs（id、agent、状态、时长、tokens、cost、开始时间）、Run Detail /runs/[id]（摘要、时间线、步骤检查器、日志、错误、findings）、Errors /errors（按签名分组的错误，可点进受影响的 run）、Logs /logs（最近日志，带级别过滤）、Settings /settings（当前本地生效配置）。

### 做法 F：用 Pi Durable 做可持久、可恢复的 coding agent 受控原型
什么时候选：你要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用；要验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复。不要把它当稳定 API、分布式工作流平台或 exactly-once 执行系统。与做法 D 的差异：D 展示多 worker 从同一持久化队列领任务、崩溃接手；F 当前单 storage 只允许一个 owner 进程，没有跨进程锁。两者都写，按场景选。

1. 安装并固定版本。前提：有 JavaScript/TypeScript runtime，愿意试用实验性 API。
```bash
npm install @earendil-works/pi-durable @earendil-works/pi-ai @earendil-works/chord
```
README 明示 API 会无通知变化，原型也应把这三个包锁到精确版本，并把升级单独作为一次故障恢复回归测试，不要长期跟随浮动版本。

2. 用 SQLite 建最小持久 harness。前提：先接受“一个 storage 只有一个 owner 进程”的部署约束。
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

4. 先给工具分级，再决定是否允许自动重放。前提：逐个工具分析“同样参数执行两次是否安全”，不能按工具类别批量猜测。
只读、确定性查询可以考虑：
```ts
const searchIssues = defineTool({
  name: 'search_issues',
  parameters: Type.Object({ query: Type.String() }),
  replay: 'safe',
  execute: async (args, api) => { /* ... */ },
});
```
以下工具默认不要声明 replay: \"safe\"：deploy、发布、合并、删除；付款、退款、发券；发邮件、发消息、创建工单；对不支持幂等键的外部 API 做写操作；结果依赖当前外部状态、重复执行会改变含义的 shell 命令。
对有副作用但业务上必须可恢复的调用，采用两层保护：1）用 task ID 或业务 ID 构造外部系统接受的稳定幂等键；2）恢复时先查询外部系统状态，再决定继续、补偿还是转人工，不把“task checkpoint 已保存”当成“外部副作用一定没有发生”。文章支付示例使用 payment-${task.id} 作为幂等键，并给 task 定义 abort 补偿退款。这个模式说明 Pi Durable 负责触发恢复与 abort，业务代码仍负责幂等和补偿正确性。

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
await root.compact(
  "Keep the names of the failing tests",
  context,
);
```

compaction 不删除 storage 中的原 entries，但模型后续主要看到摘要。应用应同时提供历史检索入口，并把目标、约束和关键测试名是否保留列入试验指标。

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
- 只读、确定性工具可声明 replay: \"safe\" 并自动重跑；有副作用工具未声明 safe 时不会自动重跑，模型会看到 interrupted 说明和已经保存的输出，应用仍需核验外部系统的真实状态。
- 审批 deploy 等用 durable memo，崩溃重跑复用已持久化审批结果，不重复问人。
- 子 agent 按 ownerTaskId 查询 / 创建，replay 不重复生成孩子；前台 child 阻止父 idle 并随 abort 清理；后台 child 不阻止 idle 且必须有单独取消入口。
- compaction 配置后接近上限后台摘要，原始 entries 仍在 storage 可检索；provider 报上下文过长时压缩并重试一次。
- 注意边界：不是 exactly-once；SQLite synchronous=NORMAL 可保住进程崩溃前已提交的数据，但不保证断电、宿主故障或存储损坏时不丢最新数据；fork 继承 transcript 和 agent/document 语义，不复制文件系统、容器、网络资源等外部状态。实验性 API，需锁版本。

最小试用方式：
- 做法 A：先跑通 learn-claude-code 的 s01，再挑一个与你当前痛点对应的章节（上下文爆了就 s08，目标总漂移就 s17，权限失控就 s03），把它抄进自己项目。
- 做法 B：先把 harness 五件套清单填一遍，跑一个真实小任务。
- 做法 C：先 make check-env 和 00 demo，然后优先跑 08 与 11 两课。
- 做法 D：先套 Agent 构造骨架跑一个真实小任务，再用多 worker 和组件替换做一次崩溃恢复演练。
- 做法 E：clone → bun apps/cli/src/index.ts watch → 跑 examples/basic-agent 看到 run 出现在 dashboard → 再给自己的 TypeScript agent 加 observe / span / log 埋点，用 blazo runs / blazo inspect 下钻一次真实问题。
- 做法 F：npm install 锁版本 → SQLite 最小 harness → 提交一个带稳定 requestId 的 job → 关闭 / 重启进程验证 resume → 再用一个假副作用工具验证 replay 边界和外部幂等键 → 最后加审批 memo。重点验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复。不要直接生产；升级单独做故障恢复回归测试。

试多久：
- learn-claude-code 按 README Quick Start 从 s01 逐章跑通到 s17 再定。
- hello-agent-system 主线约 6 小时、第三部分约 3.5 小时、第四部分约 3 小时，赶时间走 4 小时速通路线；本次只拿到 README，建议先跑 08 与 11 验证可靠性 / 评估再决定是否纳入工作流。
- blazo 建议在一个真实调试场景里小范围试（自标 MVP），先用它回答一次“为什么这次 run 慢 / 卡住”，再决定是否长期挂着。
- Pi Durable 建议按一个真实小任务做到能复现一次崩溃恢复再决定是否扩大；官方标 Experimental，不要直接承担生产关键路径。
- 注意：s05 有一句“先列步骤，完成率翻倍”，README 未给数据来源，不能当已验证指标。

## 常见坑
- 混用新旧两条线章节号：旧 12 课保留在 docs/ 和 agents/，新 17 课是主线，README 有映射表。
- 只读 README 不跑 code.py：每章 code.py 才是独立可运行实现。
- 把 harness 当成拖拽式工作流 / 无代码 AI Agent 平台 / prompt 链编排库：仓库明确说这类只是“塞了一个 LLM 的 Rube Goldberg 机器”。
- 试图改主循环加功能：原则是循环保持不变，新工具往分发表加 handler，扩展点靠 hook。
- 没配 ANTHROPIC_API_KEY 就跑；跑模型会产生调用费用。
- 不区分“模型能力”和“harness 职责”：Agency 来自模型训练，不是来自外部代码编排；harness 只是给模型一个可操作的环境。
- 每章实现细节未随 README 给出，效果主张缺数据；不要直接全量上生产。
- hello-agent-system 不要照抄模型名 gpt-5.6-luna，那是作者环境，必须换成自己的模型；也不要把 hello-agent-system 直接当生产组件。
- hello-agent-system 没有 key 可跳过配置（所有 demo 支持 --offline，练习和测试离线）；不要因为没 key 就放弃验证。
- 多机替换组件时注意接口不变但组件行为不同，先小范围验证。
- 综合实战 capstone/ 的审批部分原文未完整给出，按需查看仓库。
- blazo：埋完点忘了在退出前调用 shutdown()，缓冲的 telemetry 不会导出，dashboard 上会“什么都没有”。
- blazo：span 的 type 没按 llm | tool | agent | error | session 如实标注，dashboard 展示样式和后面对 findings 的判断都会失真。
- blazo：不调 detection 阈值。默认 30000ms / 3 次 / 3 次 / 30000ms / 4 次不一定匹配你的工作流，容易全是误报或全都不报。
- blazo：把它当评测 / playground / 提示词管理 / 数据集 / agent 市场用——原文明确不做这些，也不做 SaaS / 云。
- blazo：只做 OTLP/HTTP（4318），不做 gRPC；只提供 TypeScript SDK 一个集成，其他语言要自己发 OTLP。
- blazo：把 dashboard 配图当成当前 UI——原文明确标注为目标设计而非当前 UI；项目自标 MVP，不要当稳定生产依赖。
- blazo：把“install 后立刻看到执行”“run 约 2 秒出现在 dashboard”当已验证指标——这些是作者主张。
- Pi Durable：把它当稳定 API / 分布式工作流平台 / exactly-once 执行系统。README 标 Experimental，API 可能无通知变化。
- Pi Durable：同一个 storage 多个进程同时打开。它没有跨进程锁，当前只允许一个 owner 进程。
- Pi Durable：每次重试都生成新 UUID 当 requestId，等于主动绕过去重。
- Pi Durable：把 wait() 取消当成任务取消；取消等待者不取消底层工作，要停 conversation 用 conversation.abort()。
- Pi Durable：给有副作用的工具声明 replay: \"safe\"；声明错了会重复副作用。deploy、发布、合并、删除、付款、退款、发券、发邮件、发消息、创建工单、无幂等键外部写、依赖外部状态的 shell 命令默认不要声明。
- Pi Durable：把 task checkpoint 已保存当成外部副作用一定没发生；恢复时要查外部系统状态再继续 / 补偿 / 转人工。
- Pi Durable：审批 memo 如果有时效，不在业务层保存批准范围、操作者、时间和过期规则，崩溃重跑会误用旧批准。
- Pi Durable：后台子 agent 不给单独取消入口，普通 abort 不会停它，形成孤儿工作。
- Pi Durable：忘了处理单实例选主、storage 备份、进程锁、认证授权、ExecutionEnv 隔离、秘密注入和版本迁移；这些不是自动提供。
- Pi Durable：SQLite synchronous=NORMAL 不保证断电、宿主故障或存储损坏时不丢最新数据。
- Pi Durable：fork 继承 transcript 和 agent/document 语义，不复制文件系统、容器、网络资源等外部状态。

## 证据与来源
- 本手册保留的 harness 公式、最小 agent loop、s01→s17 机制、旧 12 课、Kode CLI、姊妹仓库 claw0 / OpenClaw 的 Heartbeat 与 Cron、web 端命令，均来自 shareAI-lab/learn-claude-code 的 README 与目录结构（给定指标：77,855 stars，MIT 许可）。s05 的“先列步骤，完成率翻倍”README 未给数据来源，只是作者主张。仓库效果主张缺数据，建议小范围试。
- hello-agent-system 的 32 节课、不依赖 Agent 框架、课程结构（讲义 + demo.py + exercise.py + solution.py + test_exercise.py，测试离线、确定性、零成本）、工具书文档（79 种失败模式、199 条设计评审清单、76 道面试题、框架对照表、一页纸速查、术语表、生产就绪指南、135 条延伸阅读）、综合实战 ITBuddy、生产组件替换（Postgres / Redis / Temporal / OpenTelemetry / LiteLLM / Cedar）、组装骨架与分布式 worker 代码，均来自 heaven999b/hello-agent-system 的 README（MIT、约 32 星、中英双语）。本次只拿到 README，没有讲义正文与数据，性能数字和组件可靠性均未核实；模型名 gpt-5.6-luna 来自作者环境，必须替换。结论建议小范围试：先跑 08 可靠性、11 评估两课，并把失败模式图鉴、设计评审清单、Agent 构造骨架套到自己项目；因为原文给出了可照抄的配置、代码和全离线测试，能低成本验证生产级分层是否补得上。
- blazo 的可照做内容来自 agentblazo/blazo README：安装与启动命令、SDK 三段 API（observe / span / log）示例与语义、blazo.config.json 的全部默认值与字段名、collector 的 11 个 HTTP 端点与 SSE 事件名、五条检测规则的触发条件与默认阈值、六个 dashboard 页面的路由与内容、五类数据实体（Run / Span / Log / Error / Finding）的字段、端口 4318 与 3000、SQLite（WAL）、OTLP/HTTP JSON、默认每 5 秒周期扫描、仓库目录结构与测试命令。只是作者主张、未经第三方验证的部分：“install Blazo, run an agent, and immediately see its execution live”“run appears in the dashboard within ~2s”等；项目自标 MVP，dashboard 配图标注为目标设计而非当前 UI；原文只给规则定义，没有“用 findings 发现新任务”的案例，手册里那一层推断已标注。结论仍建议小范围试：先在一个真实 TypeScript agent 的调试环节接入，用 runs / inspect 定位一次慢、卡死或重复错误，再决定是否长期使用。
- Pi Durable 的安装命令、最小持久 harness 代码、稳定 requestId 示例、工具 replay safe 示例与禁用清单、durable memo 审批 hook、子 agent ownership 代码、compaction 配置，均来自调研报告《Pi Durable》及其核验的原文、官方 README、官方示例目录和 Context7 当前文档。结论建议：如果要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用，先用 SQLite + 单进程 owner 做一个受控原型，重点验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复；不要把它直接当成稳定 API、分布式工作流平台或 exactly-once 执行系统。官方 README 标为 Experimental，API 可能无通知变化。审批权限与审计原文未提供完整方案；支付示例的 payment-${task.id} 幂等键与 abort 补偿退款是作者示例，不是已验证生产方案。需把三个包锁到精确版本，升级单独做故障恢复回归测试。

## 依据的调研

- [shareAI-lab/learn-claude-code](../research/radar/2026-10-01/526-shareai-lab-learn-claude-code.md)：值得一试，建议小范围试：按 README 的 Quick Start 从 s01 逐章跑通到 s17，并把其中的 Harness 五件套（Tools/Knowledge/Observation/Action/Permissions）与最小 agent loop 当作给真实工作搭环境的检查清单和骨架。理由是它给的是可克隆、可运行、可复制的具体步骤与代码，而不只是观点；但每章实现细节未随 README 给出，效果主张也缺数据，先试再定。
- [heaven999b/hello-agent-system](../research/radar/2026-10-02/773-heaven999b-hello-agent-system.md)：值得一试，建议小范围试：让正在自建 Agent 的工程同学按「读讲义 → 跑 demo → 写练习 → make lesson N=xx」跑通可靠性（08）与评估（11）两课，并把失败模式图鉴、设计评审清单和 Agent 构造骨架直接套到自己项目上；因为原文给出了可照抄的配置、代码和全离线测试，能低成本验证生产级分层是否补得上。但本次只拿到 README、没有讲义正文与数据，性能数字和组件可靠性均未核实，不要照抄模型名，也不要把它当生产组件。
- [agentblazo/blazo](../research/radar/2026-10-03/819-agentblazo-blazo.md)：值得一试，先在一个 TypeScript agent 的调试环节小范围试：按 README 的 clone → mise/bun install → bun apps/cli/src/index.ts watch 起本地 collector+dashboard，用 observe/span/log 埋点，再靠 runs/inspect 与 findings 定位慢、卡死、重复错误。理由是原文给出了可直接照做的命令、SDK 用法、config 默认阈值和五条确定性检测规则，但项目自标 MVP、dashboard 配图明确标注为目标设计而非当前 UI，因此适合试一试而不是直接采用。
- [Pi Durable](../research/radar/2026-10-06/1606-pi-durable.md)：值得一试，如果要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用，先用 SQLite + 单进程 owner 做一个受控原型，重点验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复；不要把它直接当成稳定 API、分布式工作流平台或 exactly-once 执行系统。
