# 让自建 agent 从能跑到可靠：先搭 harness，再补生产级分层

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：你只在聊天框里用 AI，或自建 Agent 只能跑起来但不可靠、不可控；这份手册帮你搭好可操作环境，并用生产级分层补齐可靠性、安全、可观测与评估。
> 先试这一步：先跑通一个最小 agent loop（如 learn-claude-code 的 `python s01_agent_loop/code.py`），确认模型能通过工具执行动作，再决定补 harness 还是补生产级分层。
> 最近修订：2026-10-02

## 解决什么问题
模型本身已经有感知、推理、行动的能力（Agency），但一个能用的 agent 产品 = 模型 + harness。这份手册解决的是：你只在聊天框里用 AI，它看不到你的代码库、跑不了命令、记不住跨会话目标、停没停全凭它自己说；或者你自建 Agent 只能跑起来，但不可靠、不可控。你要给它搭一个可操作的环境，把工具、知识、观察、动作接口和权限补齐；再用生产级分层补齐可靠性、安全、可观测、评估、并发、成本和发布。仓库把前者叫 harness engineering，以 Claude Code 为范本；后者叫企业级 Agent 系统设计，以 `heaven999b/hello-agent-system` 为课程。

## 适用与不适用
适用：你想让 AI 在自己的项目里持续干活，愿意按机制逐项搭环境，有 Python 环境和 Anthropic API key，能跑代码、看输出、按章节对照。也适用于正在自建 Agent 的工程同学：想用离线 demo、练习和测试验证生产级分层是否补得上，有 Python 3.10+、git、make，以及任意支持 function calling 的 OpenAI 兼容接口（OpenAI / DeepSeek / 通义 / 本地 vLLM / 模型网关均可）；没有 key 也可跳过，因为 hello-agent-system 的所有 demo 都支持 `--offline`，所有练习和测试都是离线的。
不适用：你只想找一个现成工具、不打算跑代码或没有 API key；你期待拖拽式工作流/无代码 AI Agent 平台/prompt 链编排就能解决；你不能接受跑模型产生调用费用；或者你打算把 `hello-agent-system` 直接当生产组件——本次只拿到 README，没有讲义正文与数据，性能数字和组件可靠性均未核实，不要照抄模型名。`learn-claude-code` 仓库本身每章实现细节未随 README 给出，效果主张也缺数据，适合小范围试，不适合直接全量上生产。

## 前置条件
- 能访问 GitHub 与 npm。
- 本机有 Python 环境和 pip；`hello-agent-system` 需要 Python 3.10+、git、make。
- `learn-claude-code`：有一个 Anthropic API key；课程跑起来需要配 `ANTHROPIC_API_KEY`。跑模型会产生调用费用。
- `hello-agent-system`：有任意支持 function calling 的 OpenAI 兼容接口；配 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`。没有 key 可跳过，所有 demo 支持 `--offline`（用剧本模型 ScriptedLLM），所有练习和测试都是离线的。
- 需要 Node 才能跑 `learn-claude-code` 的 web 端。
- 不要照抄 `hello-agent-system` README 里的 `gpt-5.6-luna` 这类模型名，那是作者环境，必须换成你自己的模型。

## 操作步骤
先选路线：想系统理解 harness 机制、有时间和 API 预算，选做法 A；已经有自己的 agent 骨架、只想把环境检查清单补齐，选做法 B；想验证生产级可靠性、安全、评估分层，选做法 C；已有 Agent 骨架想直接套生产级组装，选做法 D。可组合：先用做法 B 补 harness 清单，再用做法 C 跑可靠性与评估两课，最后用做法 D 的骨架套自己项目。

### 做法 A：按 learn-claude-code 教程从 s01 跑通到 s17，建立 harness 直觉
1. 克隆并安装依赖。前提：能访问 GitHub，本机有 Python 与 pip。
```sh
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code
pip install -r requirements.txt
cp .env.example .env   # configure ANTHROPIC_API_KEY
```
预期：依赖装好，`.env` 里配好 `ANTHROPIC_API_KEY`。

2. 从第 1 章跑起，确认最小循环能通（README 标注这是起点：one loop + bash）。
```sh
python s01_agent_loop/code.py        # Start here -- one loop + bash
```
预期：最小 agent loop 跑起来，模型能通过 bash 工具执行动作。

3. 按顺序推进，复杂章节单独跑一遍对照。
```sh
python s08_context_compact/code.py   # Context compaction (complex)
python s17_goal_loop/code.py         # Endpoint: continue until a checkable goal is met
```
阅读方式按 README：每章一个文件夹，`README.md` 是英文完整叙事（另有 `README.zh.md` / `README.ja.md`）、`code.py` 是独立可运行实现、`images/` 放 SVG 图；从 `s01` 顺序读到 `s17`，复杂章节有 `<details>` 折叠深挖。注意不要混用新旧两条线的章节号（README 给了旧 12 课到新 17 课的映射表）。

4. 如果要看旧版 12 课实现（`agents/` 目录，包含完整版），按需对照。
```sh
python agents/s01_agent_loop.py
python agents/s12_worktree_task_isolation.py
python agents/s_full.py
```
预期：旧线实现可运行；注意它与新版 17 课章节号不同。

5. 可选：跑 web 端对照课程（s16/s17 有 reading/source/simulator/architecture 视图）。前提：本机有 Node。
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

2. 抄最小 agent loop 作为骨架，可复制后替换 `MODEL` / `SYSTEM` / `TOOLS` / `TOOL_HANDLERS`。
```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS,
        )
        messages.append({"role": "assistant",
                         "content": response.content})

        tool_calls = [
            block for block in response.content if block.type == "tool_use"
        ]
        if not tool_calls:
            return

        results = []
        for block in tool_calls:
            output = TOOL_HANDLERS[block.name](**block.input)
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": output,
            })
        messages.append({"role": "user", "content": results})
```
配套原则（README 原话）：循环保持不变，新工具只是往分发表里加一个 handler；加扩展点靠 hook，不要改主循环。

3. 需要现成 CLI 而不是自己搭时，按 README 指向同作者的 Kode。
```sh
npm i -g @shareai-lab/kode
```
README 称其支持 Skill 与 LSP、兼容 Windows、可用 GLM / MiniMax / DeepSeek 等开放模型。

4. 想做「常驻型」而非「用完即弃」的 agent，按 README 指向姊妹仓库路线（`claw0` / OpenClaw）叠加两个额外机制：Heartbeat（每 30 秒 harness 给 agent 发一条消息让它检查待办，没活就继续睡）和 Cron（agent 自己排未来任务，到点自动触发），再加 IM 多通道路由、持久上下文记忆和 Soul 人格系统。

### 做法 C：按 hello-agent-system 跑通可靠性（08）与评估（11），用离线测试验证生产级分层
1. 环境准备。前提：Python 3.10+、git、make。
```bash
git clone https://github.com/heaven999b/hello-agent-system.git
cd hello-agent-system
make setup          # 创建 .venv 并安装（核心依赖只有 openai + pydantic）
```
预期：`.venv` 创建好，核心依赖装好。

2. 配置模型接口。前提：有任意「支持 function calling 的 OpenAI 兼容接口」（OpenAI / DeepSeek / 通义 / 本地 vLLM / 模型网关均可）。没有 key 可跳过此步——所有 demo 都支持 `--offline`（用剧本模型 ScriptedLLM），所有练习和测试都是离线的。
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
1. 直接套用 README 给出的组装骨架。前提：不想自己从零设计分层。每个参数背后对应一节课：
```python
import asyncio
from agentkit import *

agent = Agent(
    llm=ResilientLLM(default_llm(), fallbacks=[default_llm("gpt-5.6-luna")]),   # 第 08 课：重试/熔断/降级
    tools=[search_kb, create_ticket, reset_password],                            # 第 03 课：工具设计
    system_prompt="你是 IT 服务台助手。" + UNTRUSTED_DATA_RULE,                    # 第 09 课：不可信数据规则
    hooks=[
        InputGuard(),                                                            # 第 09 课：输入检测
        PermissionPolicy(role_tools={"employee": {"search_kb", "create_ticket"},
                                     "it_admin": {"*"}}),                        # 第 09 课：RBAC + 高危审批
        ToolOutputGuard(), OutputGuard(),                                        # 第 09 课：隔离 + 脱敏
        BudgetHook(max_cost_usd=0.10, max_tool_calls=20),                        # 第 08 课：预算
        AuditLog("runs/audit.jsonl"),                                            # 第 09 课：审计
    ],
    context_strategy=SlidingWindow(max_tokens=8000),                             # 第 04 课：上下文工程
    checkpointer=FileCheckpointer("runs/"),                                      # 第 08 课：检查点
    idempotency_store=IdempotencyStore(),                                        # 第 08 课：幂等
    tracer=Tracer(jsonl_exporter("runs/traces.jsonl")),                          # 第 10 课：追踪
)

async def main():
    me = {"tenant_id": "acme", "user_id": "alice", "roles": ["employee"]}
    result = await agent.run("帮我重置密码", metadata=me)
    if result.status == "paused":                    # 高危操作 → 暂停等人工审批（可以是几小时后、另一个进程）
        result = await agent.approve(result.run_id, approved=True, by="it_manager")
    print(render_tree(result.trace))                 # 看见 Agent 的每一步
    # 同一个 Agent 实例，一个进程，同时服务 50 个会话（第 02 课）
    results = await asyncio.gather(*(agent.run("VPN 怎么连？", metadata=me) for _ in range(50)))

asyncio.run(main())
```
照抄时注意：`gpt-5.6-luna` 这类模型名来自作者环境，必须换成你自己的模型。

2. 单进程扛不住、或进程会崩时，让多个 worker 进程从同一个持久化队列领任务（第 12–13 课）。前提：需要崩溃接手和不重复的副作用。
```python
# app.py —— 每个 worker 进程启动时加载一次
from agentkit.distributed import AgentJobHandler, SQLiteCheckpointer, SQLiteIdempotencyStore

async def make_handler(ctx):                         # ctx.db：这个 worker 进程自己的数据库连接
    ckpt, idem = SQLiteCheckpointer(ctx.db), SQLiteIdempotencyStore(ctx.db)
    await ckpt.setup(); await idem.setup()
    agent = Agent(default_llm(), tools, checkpointer=ckpt, idempotency_store=idem)
    return AgentJobHandler(agent, ckpt)               # 领任务 → run / 审批后 resume；fence 保护检查点
```
```bash
# 起几条就是几个 worker 进程；kill -9 其中一个，它手上的任务在租约过期后由别的进程从检查点接手
python -m agentkit.distributed.worker --queue sqlite:///runs/jobs.db --app app.py:make_handler --concurrency 16
```
```python
queue = SQLiteJobQueue("runs/jobs.db"); await queue.setup()
await queue.enqueue("run", {"op": "run", "input": "打印机坏了"}, tenant_id="acme", idempotency_key="req-42")
```

3. 多机时只换组件、不换接口。前提：单机 SQLite 不够用。队列换成 `--queue postgresql://...`，其余不变（第 26 课）；组件换成 contrib 适配器：
```python
from agentkit import Agent, KeyedLimiter, ResilientLLM
from agentkit.contrib.gateway import LiteLLMRouterLLM
from agentkit.contrib.postgres import PostgresCheckpointer
from agentkit.contrib.redis_store import RedisIdempotencyStore, RedisTokenBucket, RateLimitHook
from agentkit.contrib.otel import OTelTracer, PrometheusHook, setup_tracing
from agentkit.contrib.policy import CedarPolicy

checkpointer = PostgresCheckpointer(dsn)
await checkpointer.setup()
agent = Agent(
    ResilientLLM(LiteLLMRouterLLM.from_env(), max_concurrency=20),   # 网关：路由、降级；进程内并发上限
    tools,
    hooks=[
        CedarPolicy("policies.cedar", tools=tools),                          # 策略即代码（第 29 课）
        RateLimitHook(RedisTokenBucket(redis, rate_per_sec=5, capacity=10)),   # 跨实例的租户限流（第 26 课）
        PrometheusHook(),                                                    # 指标（第 28 课）
    ],
    checkpointer=checkpointer,                        # 多实例共享、带 CAS 与 fence 的检查点（第 26 课）
    idempotency_store=RedisIdempotencyStore(redis),   # 跨进程幂等（第 26 课）
    tracer=OTelTracer(setup_tracing("itbuddy")),      # OpenTelemetry，GenAI 语义约定（第 28 课）
    limiter=KeyedLimiter(per_key=5, global_limit=200),  # 每个租户最多 5 个同时在跑的运行（第 30 课）
    run_timeout=120,
)
result = await agent.run("VPN 怎么连？", metadata={"tenant_id": "acme", "user_id": "alice", "roles": ["employee"]})
```

4. 用综合实战做一次端到端演练。前提：想验证「组装起来能不能跑成服务」。`capstone/` 的 ITBuddy 用 `deploy.py` 一键拉起 API 进程 + 多个 worker 进程 + 共用持久化队列。原文此处关于审批的后续未完整给出，按需查看仓库。

### 机制对照表（按需跳到 learn-claude-code 对应章节）
- s01 Agent Loop：`messages` / `while True` / `tool_use`
- s02 Tool Use：`TOOL_HANDLERS` 分发表
- s03 Permission：`PermissionRule` / 审批流水线
- s04 Hooks：`PreToolUse` / `PostToolUse`
- s05 TodoWrite：plan-then-execute
- s06 Subagent：新 `messages[]`、上下文隔离
- s07 Skill Loading：`SkillLoader` / 目录 / 按需注入
- s08 Context Compact：tool_result_budget / snip_compact / micro_compact / compact_history
- s09 Memory：选择 / 抽取 / 固化
- s10 Task System：`TaskRecord` / `blockedBy` / 磁盘持久化
- s11 Background Tasks：线程执行 / 通知队列
- s12 Cron Scheduler：持久调度
- s13 Agent Teams：常驻队友 / 原子认领任务 / task-bound worktree / 类型化协议
- s14 MCP Plugin：工具发现 / 命名空间
- s15 Integrated Harness：把前面积累的机制重新接回一条完整循环
- s16 Workflow Runtime：工作流编排、可恢复 journal
- s17 Goal Loop：目标闭环

## 怎么判断变好了
可观察指标：
- AI 能在你的项目里调用工具、读写文件，并看到 git diff、错误日志、浏览器状态等观察再继续。
- 知识是按需加载（s07），不是把全部文档塞进上下文。
- 长会话遇到上下文压力时能压缩（s08 的 tool_result_budget / snip_compact / micro_compact / compact_history）。
- 大目标能拆小、带 `blockedBy` 依赖并持久化到磁盘（s10）。
- 慢操作能放后台线程、完成后注入通知（s11）；任务能定时自触发（s12）。
- 停止由可检查的目标门决定：s17 用独立评估器审查每一次提议的停止；不可能、已失败或超限的目标把控制权交回用户，而不是模型自述完成。
- 权限有边界：s03 的权限规则与审批流水线、s04 的 hook 扩展点。
- hello-agent-system：能按 `make lesson N=xx` 跑通 08 可靠性、11 评估，离线测试通过；能把失败模式图鉴、设计评审清单、Agent 构造骨架套到自己项目；能看见 Agent 每一步（`render_tree(result.trace)`）；高危操作会 `paused` 等人工审批；单进程可并发服务 50 个会话；`kill -9` 一个 worker 后任务由别的进程从检查点接手；多机只换组件不换接口。
- 注意：hello-agent-system 只拿到 README，讲义正文与数据未核实，性能数字和组件可靠性未核实，不能当生产组件。所以这些只是可试用指标，不是已验证生产指标。

最小试用方式：先跑通 learn-claude-code 的 s01，再挑一个与你当前痛点对应的章节（上下文爆了就 s08，目标总漂移就 s17，权限失控就 s03），把它抄进自己项目。做法 B 的话，先把 harness 五件套清单填一遍，跑一个真实小任务。做法 C 的话，先 `make check-env` 和 00 demo，然后优先跑 08 与 11 两课。做法 D 的话，先套 Agent 构造骨架跑一个真实小任务，再用多 worker 和组件替换做一次崩溃恢复演练。
试多久：建议小范围试：learn-claude-code 按 README Quick Start 从 s01 逐章跑通到 s17 再定；hello-agent-system 主线约 6 小时、第三部分约 3.5 小时、第四部分约 3 小时，赶时间走 4 小时速通路线（每课只读开头的「核心路径」）。本次只拿到 README，建议先跑 08 与 11 验证可靠性/评估再决定是否纳入工作流。
注意：s05 有一句“先列步骤，完成率翻倍”，README 未给数据来源，不能当已验证指标。

## 常见坑
- 混用新旧两条线章节号：旧 12 课保留在 `docs/` 和 `agents/`，新 17 课是主线，README 有映射表。
- 只读 README 不跑 `code.py`：每章 `code.py` 才是独立可运行实现。
- 把 harness 当成拖拽式工作流 / 无代码 AI Agent 平台 / prompt 链编排库：仓库明确说这类只是“塞了一个 LLM 的 Rube Goldberg 机器”。
- 试图改主循环加功能：原则是循环保持不变，新工具往分发表加 handler，扩展点靠 hook。
- 没配 `ANTHROPIC_API_KEY` 就跑；跑模型会产生调用费用。
- 把 s05 的“完成率翻倍”当成结论——README 未给数据来源。
- 不区分“模型能力”和“harness 职责”：Agency 来自模型训练，不是来自外部代码编排；harness 只是给模型一个可操作的环境。
- 每章实现细节未随 README 给出，效果主张缺数据；不要直接全量上生产。
- hello-agent-system 不要照抄模型名 `gpt-5.6-luna`，那是作者环境，必须换成自己的模型。
- 不要把 hello-agent-system 直接当生产组件：本次只拿到 README，没有讲义正文与数据，性能数字和组件可靠性均未核实。
- hello-agent-system 没有 key 可跳过配置，所有 demo 支持 `--offline`，练习和测试离线；不要因为没 key 就放弃验证。
- 多机替换组件时注意接口不变但组件行为不同，先小范围验证。
- 综合实战 `capstone/` 的审批部分原文未完整给出，按需查看仓库。

## 证据与来源
- 本手册保留的 harness 公式、最小 agent loop、s01→s17 机制、旧 12 课、Kode CLI、姊妹仓库 `claw0` / OpenClaw 的 Heartbeat 与 Cron、web 端命令，均来自 `shareAI-lab/learn-claude-code` 的 README 与目录结构（给定指标：77,855 stars，MIT 许可）。s05 的“先列步骤，完成率翻倍”README 未给数据来源，只是作者主张。仓库效果主张缺数据，建议小范围试。
- `hello-agent-system` 的 32 节课、不依赖 Agent 框架、课程结构（讲义 + demo.py + exercise.py + solution.py + test_exercise.py，测试离线、确定性、零成本）、工具书文档（79 种失败模式、199 条设计评审清单、76 道面试题、框架对照表、一页纸速查、术语表、生产就绪指南、135 条延伸阅读）、综合实战 ITBuddy、生产组件替换（Postgres / Redis / Temporal / OpenTelemetry / LiteLLM / Cedar）、组装骨架与分布式 worker 代码，均来自 `heaven999b/hello-agent-system` 的 README（MIT、约 32 星、中英双语）。本次只拿到 README，没有讲义正文与数据，性能数字和组件可靠性均未核实；模型名 `gpt-5.6-luna` 来自作者环境，必须替换。
- 结论建议小范围试：先跑 08 可靠性、11 评估两课，并把失败模式图鉴、设计评审清单、Agent 构造骨架套到自己项目；因为原文给出了可照抄的配置、代码和全离线测试，能低成本验证生产级分层是否补得上。但不要照抄模型名，也不要把它当生产组件。

## 依据的调研

- [shareAI-lab/learn-claude-code](../research/radar/2026-10-01/526-shareai-lab-learn-claude-code.md)：值得一试，建议小范围试：按 README 的 Quick Start 从 s01 逐章跑通到 s17，并把其中的 Harness 五件套（Tools/Knowledge/Observation/Action/Permissions）与最小 agent loop 当作给真实工作搭环境的检查清单和骨架。理由是它给的是可克隆、可运行、可复制的具体步骤与代码，而不只是观点；但每章实现细节未随 README 给出，效果主张也缺数据，先试再定。
- [heaven999b/hello-agent-system](../research/radar/2026-10-02/773-heaven999b-hello-agent-system.md)：值得一试，建议小范围试：让正在自建 Agent 的工程同学按「读讲义 → 跑 demo → 写练习 → make lesson N=xx」跑通可靠性（08）与评估（11）两课，并把失败模式图鉴、设计评审清单和 Agent 构造骨架直接套到自己项目上；因为原文给出了可照抄的配置、代码和全离线测试，能低成本验证生产级分层是否补得上。但本次只拿到 README、没有讲义正文与数据，性能数字和组件可靠性均未核实，不要照抄模型名，也不要把它当生产组件。
