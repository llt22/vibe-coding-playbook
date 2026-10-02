# heaven999b/hello-agent-system

- 结论：**值得一试**。建议小范围试：让正在自建 Agent 的工程同学按「读讲义 → 跑 demo → 写练习 → make lesson N=xx」跑通可靠性（08）与评估（11）两课，并把失败模式图鉴、设计评审清单和 Agent 构造骨架直接套到自己项目上；因为原文给出了可照抄的配置、代码和全离线测试，能低成本验证生产级分层是否补得上。但本次只拿到 README、没有讲义正文与数据，性能数字和组件可靠性均未核实，不要照抄模型名，也不要把它当生产组件。
- 原文：https://github.com/heaven999b/hello-agent-system
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T14:28:06.463Z

## 是什么

`heaven999b/hello-agent-system` 是一个企业级 Agent 系统设计课程仓库（MIT、约 32 星、中英双语）：32 节课，不依赖任何 Agent 框架，从零手写 Agent 的每一层——工具、上下文、架构、编排、可靠性、安全、可观测、评估、并发、成本、发布；进阶部分覆盖检索、记忆、MCP 与沙箱、Agent 数据、评估方法论、提示词优化、编码 Agent、主动式 Agent；第四部分把接口原样换成 Postgres / Redis / Temporal / OpenTelemetry / LiteLLM / Cedar 落地生产。每课结构固定：讲义（README.md + README.en.md）+ demo.py + exercise.py + solution.py + test_exercise.py，测试离线、确定性、零成本。另有一个综合实战（ITBuddy 企业 IT 服务台 Agent）和一批「工具书」文档（79 种失败模式、199 条设计评审清单、76 道面试题、框架对照表、一页纸速查、术语表、生产就绪指南、135 条延伸阅读）。它的定位是让 Agent「在生产中可靠、安全、可控地跑起来」，而不是「能跑起来」。

## 具体做法（编号步骤）

1. 环境准备。前提：Python 3.10+、git、make。

```bash
git clone https://github.com/heaven999b/hello-agent-system.git
cd hello-agent-system
make setup          # 创建 .venv 并安装（核心依赖只有 openai + pydantic）
```

2. 配置模型接口。前提：有任意「支持 function calling 的 OpenAI 兼容接口」（OpenAI / DeepSeek / 通义 / 本地 vLLM / 模型网关均可）。没有 key 可跳过此步——所有 demo 都支持 `--offline`（用剧本模型 ScriptedLLM），所有练习和测试都是离线的。

```bash
LLM_BASE_URL=https://api.openai.com/v1     # 或 DeepSeek / 通义 / 本地 vLLM / 模型网关
LLM_API_KEY=sk-xxx
LLM_MODEL=gpt-4o-mini                       # 需要支持 function calling
```

3. 先验证连通性与工具调用能力，再跑第一个 demo。

```bash
make check-env                                  # 检查模型连通性与工具调用能力
.venv/bin/python lessons/00_overview/demo.py    # 看一眼你将要造出的东西
```

4. 每课都走同一个循环：读讲义 → 跑 demo → 写练习 → 让测试变绿 → 过自测清单；每课开头都标注了一篇必读论文或文章。

```bash
make lesson N=xx
```

```bash
.venv/bin/python scripts/progress.py
```

5. 按投入选路线。前提：先决定花多少时间。主线（第一部分 + 第二部分 + 综合实战）约 6 小时；第三部分约 3.5 小时、第四部分约 3 小时，属进阶；赶时间走 4 小时速通路线（每课只读开头的「核心路径」）。

6. 直接套用 README 给出的组装骨架。前提：不想自己从零设计分层。每个参数背后对应一节课：

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

7. 单进程扛不住、或进程会崩时，让多个 worker 进程从同一个持久化队列领任务（第 12–13 课）。前提：需要崩溃接手和不重复的副作用。

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

8. 多机时只换组件、不换接口。前提：单机 SQLite 不够用。队列换成 `--queue postgresql://...`，其余不变（第 26 课）；组件换成 contrib 适配器：

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

9. 用综合实战做一次端到端演练。前提：想验证「组装起来能不能跑成服务」。`capstone/` 的 I...ITBuddy 用 `deploy.py` 一键拉起 API 进程 + 多个 worker 进程 + 共用持久化队列；审批可以在一个进程里暂停、在另一个进程里恢复；kill -9 之后工单也只建一张。同目录还有 24 条评估用例（其中 10 条安全用例）、组件消融实验，以及做自己项目时可直接套用的 `capstone/REPORT_TEMPLATE.md`（要求基线对比、消融与错误分析）。`production/` 里是 API + 多 worker + 压测 + 故障注入 + docker-compose / Kubernetes 的参考服务（第 31 课）。

10. 把文档当「工具书」用，不必按课顺序读：`docs/failure-modes.md`（79 种失败模式：症状 → 根因 → 检测 → 修复）、`docs/design-review-checklist.md`（199 条上线前检查项，按 P0/P1/P2 分级）、`docs/production-readiness.md`（逐模块「做到了什么 → 还差什么 → 换成什么 → 怎么迁移」+ 上线前 P0 清单）、`docs/cheatsheet.md`（原则、默认参数、决策树，适合打印）、`docs/framework-comparison.md`（agentkit 概念 ↔ LangGraph / OpenAI Agents SDK / Claude Agent SDK / ADK）、`docs/interview-questions.md`、`docs/glossary.md`、`docs/reading-list.md`（按角色给阅读路线）。第 07 课的 20 个工程维度 × 通用必查点 / 情境触发点（共 301 条）+ 9 种场景画像矩阵 + 设计评审方法，是进入后续课程的地图。

## 对应的研究问题

1. 能力发现：第 07 课的 20 个工程维度（301 条必查点/触发点）与 79 种失败模式图鉴，实为「Agent 还会在哪些地方出事、因此还需要补哪些能力」的清单式索引；第 24 课亲手造一个能修 bug 的编码 Agent（ACI 工具、测试保护、diff 审查、跨会话接力）、第 25 课主动式 Agent（用户模型、何时打扰的决策器），给出了可以交给 AI 的新工作形态。
2. 任务匹配：第 05 课 5 种 Agent 架构（ReAct / Plan-and-Execute / ReWOO / Reflection / CodeAct）+ 5 种多 Agent 拓扑；第 06 课编排模式（路由、并行、编排者-执行者、评估-优化、Agent 即工具）；第 12 课同步/流式/异步接口与自建 vs 框架的选择；第 14 课模型级联与「会取消输家的对冲请求」；第 29 课模型网关路由与降级；第 20 课同一任务在 DSPy / LangGraph / OpenAI Agents SDK 下的实现对照。贯穿的原则是厂商无关：业务代码只依赖一个 `await llm.chat()` 接口，模型可随时替换。
3. 条件供给：第 03 课工具设计（Schema、校验、身份注入、业务错误、三种超时语义）；第 04 课上下文工程（安全截断、摘要压缩、工具结果清理、长期记忆隔离）；第 09 课钩子层（输入注入检测、RBAC + 人工审批、工具输出隔离、PII 脱敏、预算、审计）；第 26–27 课的状态与协调（Postgres `SKIP LOCKED`、CAS 与 fence、Redis 幂等 / Lua 令牌桶 / 带 fencing 的锁、Temporal Activity 重试与 Signal 审批）；以及贯穿全课的 `metadata={"tenant_id","user_id","roles"}` 身份注入与 Cedar 策略即代码。README 里的 `Agent(...)` 构造本身就把「要给 Agent 提供什么」逐项列成了参数。
4. 主动推进：第 25 课主动式 Agent 与「何时打扰的决策器」；第 08 课检查点 + 审批「可以是几小时后、另一个进程」；第 12–13 课持久化队列 + 租约 + fencing（进程崩了由别的 worker 从检查点接手，副作用不重复）；第 27 课持久化工作流（Activity 重试、Signal/Update 审批、continue-as-new）；第 16 课金丝雀分桶、自动回滚决策、多 worker 共同遵守的 kill switch；第 31 课按队列深度扩缩容与优雅停机时间线。
5. 效果验证：每节课都有带自动化测试的练习，`ScriptedLLM` 让 Agent 测试像普通单元测试一样确定、离线、免费；第 11 课评估驱动开发（pass^k、轨迹评分、发布门禁）；第 22 课成对评委去位置偏差、置信区间与配对检验；第 21 课 Cohen's kappa、防泄漏划分；第 10 / 28 课从 trace 计算 SLO 指标与燃烧率告警；第 12–13 课用真进程、真信号（kill -9 / SIGSTOP / SIGTERM、真实 TCP 断网）证明「说并发就用并发证明」；综合实战的 24 条评估用例 + 消融实验 + 要求基线对比的报告模板。

## 与已有做法的关系

清单中只有 DeepSeek（tool，状态 try）。本仓库明确厂商无关，「任何支持 function calling 的 OpenAI 兼容接口」都行，README 也把 DeepSeek 列为可用的 LLM_BASE_URL 之一，因此它不替代 DeepSeek 这类模型供给，而是叠在模型之上的工程层（工具、权限、可靠性、可观测、评估、成本、发布）。清单中没有其他相关条目。

## 证据与局限

原文（README）自述的产出与数据：核心约 3800 行 + 多进程模块约 2000 行代码；32 节课、中英双语；第 30 课「200 个会话：一个接一个 80.7s → gather 0.43s」「进程 1→4 个 348→846 任务/秒」；第 29 课「级联护栏分类器精确率 0.42→0.92」；79 种失败模式、199 条设计评审项、76 道面试题、246 条术语、135 条延伸阅读；32 星。

作者自己写明的局限（也是适用条件的关键）：`agentkit` 核心状态默认在内存或本地文件，注入检测与 PII 脱敏是正则；`agentkit.distributed` 基于 SQLite，只能在一台机器上，同一时刻一个写者；`agentkit.contrib` 用嵌入式 Postgres、fakeredis、Temporal 开发服务器测试，Redis 主从切换、集群分片、多区域没有实测；`production/` 是参考实现不是托管产品，作者本机没有 Docker，部署配置没有实际启动过。

需要打折的地方：本次只拿到 README，没有讲义正文、测试代码和数据文件，所以课程质量、测试是否真的「离线且确定性」、以及上面那些性能与精确率数字，都无法核实，只能算作者主张；README 中出现的模型名（`gpt-5.5`、`gpt-5.6-luna`、`Claude Opus 5.5`）与「斯坦福 2026 年秋季 CS329Z」在这次材料里同样无法印证；32 星的规模说明外部使用者还很少。适用条件：面向要自己构建和运维 Agent 系统的工程读者（Python 3.10+、能读 async/await），不是给非技术岗位「拿来即用」的工作流模板；无 API key 时可全程离线学习，成本为零，这降低了试错成本。

## 怎么试、怎么验证

最小试用一（约 1–2 小时，零成本，验证课程是否真的可跑）：clone → `make setup` → 不动 `.env`，用 `--offline` 跑 `lessons/00_overview/demo.py`；再挑一节和你最关心的问题最接近的课（如 08 可靠性、11 评估），跑 demo、写练习、`make lesson N=xx` 直到测试变绿；用 `scripts/progress.py` 看进度。判断标准：测试是否不用 API key 就能通过；讲义是否讲清了「为什么这么选」而不只是贴代码。

最小试用二（约半天，不学课程，直接用在已有项目上）：拿 `docs/design-review-checklist.md` 给自己的 Agent 项目过一遍，统计命中的 P0 项；再用 `docs/failure-modes.md` 挑 3–5 条症状，看能否在自己系统里复现并定位。

判断有没有改善的指标（都以自己项目的基线比较，不要拿仓库数字当预期）：
- 自己项目的 P0 未决项数量在评审前后下降多少；
- 已知失败模式从「线上事后发现」变成「上线前检查到」的条数；
- 幂等与崩溃接手是否真的成立：让 Agent 跑到一半 kill -9，再跑同一请求，副作用（重复建工单、重复发邮件等）是否仍然只有一次；
- 有评估集的话，改动前后 pass^k / 通过率、成本、长尾延迟是否可比较（第 11、22 课给了 pass^k、轨迹评分、置信区间与配对检验的做法）；
- 人工审批链路是否真的跨进程可用（一个进程暂停、另一个进程 resume）。

如果试用一里测试在没有 API key 的情况下跑不绿、或讲义正文与 README 描述不符，就把它降级为「读思路」（study），只取失败模式图鉴、评审清单和分层设计思路。
