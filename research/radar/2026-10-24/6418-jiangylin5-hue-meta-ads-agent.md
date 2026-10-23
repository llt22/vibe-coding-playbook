# jiangylin5-hue/meta-ads-agent

- 结论：**值得研读**。把它当作“受限权限顾问型智能体”的架构样本来研读，重点提炼写操作分段（只能是草稿）、只有活跃 Skill 的工具暴露给模型、上下文组装和幂等租约这几条可直接迁移的设计约束；但不建议直接采用，因为公开材料只有一份作品集式 README 加本地运行命令，Skill 契约、预算数值、提示词、MCP 配置都不在其中，照抄只能跑起一个禁用了真实执行的演示。
- 原文：https://github.com/jiangylin5-hue/meta-ads-agent
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T17:50:15.710Z

## 是什么

`jiangylin5-hue/meta-ads-agent` 是一个 Meta 广告投放 copilot 的**公开作品集快照**（README 自称 "curated public release snapshot"，已剔除内部开发历史、运行日志、凭证和客户账号标识）。它围绕官方 Meta Ads MCP、项目级 Skills、DeepSeek/OpenAI 兼容模型、持久上下文和“带审批的 Draft 工作流”构建。

README 给出的主链路：

```text
Next.js workbench
  -> POST /api/agent/turn (JSON or SSE)
  -> turn lease + idempotency + version checks
  -> context assembler
       - five recent rounds
       - rolling summary
       - active Skills
       - task progress
       - long-term Memory
       - selected-account cache
  -> bounded ReAct loop
       - DeepSeek Chat Completions or OpenAI Responses
       - Skill-scoped Meta MCP tools
       - structured observations
  -> final answer / local action record / non-live Meta Draft
```

README 声明的关键设计：有界 ReAct 循环（步数、时间、token、工具四类预算）；渐进式披露（先只显示一份短 Skill 目录，只有“活跃 Skill”的工具才会暴露给模型）；12 个项目 Skill（账号简报、诊断、审计、创意、优化、计划、追踪、受众、目录、竞品研究、实验、政策审查）；5 轮对话窗口加滚动摘要压缩；长期 Memory 与可恢复任务状态；带 TTL 和 stale 回退的账号与 MCP 结果缓存；幂等 turn、会话租约、乐观版本与冲突响应；只能创建 Draft，激活/更新/删除/发布在代码层被阻断。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 前提说明：以下 1–3 步是 README 中唯一可原样照做的操作。第 4–6 步是基于 README 描述的迁移路径，**具体参数（预算阈值、Skill 契约内容、提示词、MCP 配置）原文未给出**，需自行打开仓库代码与 `project-docs/` 补齐。

1. 准备环境并安装依赖（Windows PowerShell 示例，README 原样命令）。前提：本机有 Python、Node、Docker；从 `.env.example` 复制出 `.env` 并填入**自己的**凭证，`.env` 不要提交。

```powershell
python -m venv .venv
.venv\Scripts\pip.exe install -r requirements.txt
docker compose up -d postgres
.venv\Scripts\python.exe -m alembic upgrade head
.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8010
npm.cmd install --prefix frontend
npm.cmd run dev --prefix frontend
```

2. 打开工作台：`http://127.0.0.1:3000/app`。前提：Meta Graph API 与官方 Meta Ads MCP 需要出网 HTTPS 访问 Meta，部分网络需要 VPN 或代理。

3. 跑验证套件确认基线（README 原样命令，先清空 OPENAI_API_KEY 以便走默认 provider）。

```powershell
$env:OPENAI_API_KEY=""
.venv\Scripts\python.exe -m pytest tests -q
npm.cmd run lint --prefix frontend
npm.cmd run build --prefix frontend
npm.cmd run test:smoke --prefix frontend
```

4. 按 README 给的模块职责表，逐个读实现再决定迁移哪一块（这些是“读哪里”，不是“怎么配”）：

| 要迁移的能力 | 去读的路径（README 标注的职责） |
|---|---|
| 有界 ReAct 循环、provider 中立工具处理 | `backend/agent/runtime.py` |
| DeepSeek Chat Completions 适配 | `backend/agent/deepseek.py` |
| MCP 发现、预算、Draft 路由、激活阻断 | `backend/agent/tools.py` |
| 5 轮窗口、摘要契约、token 估算 | `backend/agent/context.py` |
| turn 租约、幂等、重放 | `backend/services/turn_control.py` |
| 类型化 Memory | `backend/services/long_term_memory.py` |
| 任务进度与工具台账 | `backend/services/task_state.py` |
| 账号与 MCP 结果缓存 | `backend/services/account_cache.py` |
| 12 个 Skill 的契约与按需引用 | `backend/skills/` |

5. 照抄它的安全边界规则（这是 README 中少数能直接落到设计文档里的硬约束，逐条写进自己的规格）：

- 凭证只放环境变量，绝不进入 prompt、Memory、缓存、trace、源码。
- 只允许 4 个创建类工具到达 MCP：`ads_create_campaign`、`ads_create_ad_set`、`ads_create_ad`、`ads_create_creative`。
- 只走官方 Draft Mode，返回的是**不会上线**的 Draft 对象。
- `ads_activate_entity`、更新、删除、发布路径对模型不可见（不是靠提示词劝阻，是代码层不给）。
- “Draft 审批”不等于“执行”；demo 中真实执行直接返回 `410 execution_disabled_in_demo`。

6. 上下文组装照它的六件套顺序实现（近期 5 轮 → 滚动摘要 → 活跃 Skills → 任务进度 → 长期 Memory → 选中账号缓存），并在 Skill 选择上采用渐进披露：默认只给模型看一份短目录，命中某个 Skill 后才暴露该 Skill 名下的工具。前提：你需要自己定义 Skill 契约格式，原文只说“有 contracts 和 on-demand references”，未给格式。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 列出了 12 个已交给 AI 的广告运营任务类别——账号简报、诊断、审计、创意、优化、计划、追踪、受众、目录、竞品研究、实验、政策审查。这是一份“别人已经放心交给 AI 的任务清单”的目录级证据，但每类的能力边界原文未展开。

**2. 任务匹配**：默认 provider 是 DeepSeek `deepseek-flash` 配 high reasoning，OpenAI Responses 为可选项，工具执行做成 provider 中立——说明同一套有界循环可以换模型而不改工具层。匹配方式上是“单 Agent + 有界循环 + 按需挂载 Skill 工具”，而不是多 Agent 编排；并用步数、时间、token、工具数四类预算限制单轮成本。

**3. 条件供给**：这是该项目信息最密的一块。供给给模型的东西被明确拆成六类（近 5 轮对话、滚动摘要、活跃 Skills、任务进度、长期 Memory、选中账号缓存），加上结构化 observation（工具返回先结构化再回灌）。权限供给用的是“白名单化工具暴露 + 凭证隔离 + Draft-only”三段式。反馈供给在原文中没有显式描述。

**4. 主动推进**：有“可恢复任务状态”和“任务进度”概念，加上 turn 租约、幂等、乐观版本、冲突响应，支撑的是“多轮任务可中断续跑、重发不重复执行”。但**原文没有任何时间触发、事件触发或状态轮询调度的描述**，所以只能算主动推进的基础设施，不能作为调度方案的证据。

**5. 效果验证**：README 的验证是**工程验证**而非业务效果验证——pytest/lint/build/smoke 覆盖 ReAct 循环、12 个 Skill 契约、渐进式工具暴露、上下文压缩、Memory/任务状态、账号缓存、租约/幂等、SSE、Draft 安全、前端流程。没有任何广告效果指标（花费、ROI、采纳率等）。

## 与已有做法的关系

- **DeepSeek（工具，try）**：原文把 DeepSeek `deepseek-flash`（high reasoning）设为默认 provider，OpenAI Responses 仅作可选。因此该仓库可以作为“DeepSeek 在带工具调用的多轮 Agent 中如何被接入”的一个参照实现（适配层在 `backend/agent/deepseek.py`），但原文没有给出调用参数、温度、上下文长度等配置细节。
- **Semble（工具，try）**：原文完全未提及，无关联依据。
- 清单中没有其他相关条目。

## 证据与局限

**原文给出的事实性内容**：架构链路、模块路径与职责、可复制的本地运行命令、验证套件命令与其覆盖面、安全边界的具体工具名和阻断方式（`410 execution_disabled_in_demo`）、四条已知约束。

**只是作者主张、无数据支撑的**：12 个 Skill 的实际质量与覆盖度；“有界”预算真的能约束住成本（作者自己在 Known Constraints 里承认多 Skill 场景下真实 provider input 仍可能超出估算，硬预算强制“仍有待校准”）；上下文压缩与长期 Memory 是否真的提升回答质量；渐进式披露减少了多少 token。全文没有一个案例、数字或对比评测。

**本次材料的结构性局限**：只有 README 一层，`project-docs/01-product/`、`02-architecture/`、`03-stages/STAGE_09_CONTEXT_AND_AGENT_MEMORY.md` 以及全部代码均未提供。因此 Skill 契约长什么样、提示词怎么写、预算阈值是多少、MCP 怎么配、摘要契约是什么格式——**全部无法确认**，任何具体参数都不能凭这份材料复现。这也是 verdict 压在 study 而非 try 的主要原因。

**适用条件**：场景是 Meta 广告投放；需要出网 HTTPS 访问 Meta（部分网络需代理）；Meta 账号数据可能为空或过时，作者要求“必须暴露缺失与陈旧数据，不得编造当前事实”；demo 版禁用了真实执行，不能直接当生产投放工具用。

## 怎么试、怎么验证

**最小试用（1–2 天，只读 + 草稿）**：克隆仓库，按第 1–3 步起服务并跑通验证套件；然后只做只读类流程（账号简报、诊断、审计）和 Draft 创建，全程不碰激活/发布。观察四件事：

1. 打开发送请求后，模型是否**只**暴露了当前活跃 Skill 名下的工具（看 trace 里的工具列表，而不是看回答）。
2. 创建 campaign/ad set/ad/creative 后，返回对象是否为非上线 Draft，后台是否确实没有生效。
3. 同一 turn 人为重发两次（模拟断网重试），是否**零重复 Draft**（幂等 + 租约 + 版本检查是否真的生效）→ 这是最值得抄的一条，也最容易验收。
4. 连续多轮把上下文顶到窗口上限，摘要压缩是否触发、回答是否还引用得住前面的事实。

**判断有没有改善的指标**：

- turn 成功率、平均步数/工具调用数、单轮 token 是否触顶（对应它自己承认的预算校准问题）。
- 幂等重放下的重复 Draft 数（目标为 0）。
- 缓存命中率，以及数据陈旧时是否**主动提示**而非编造（可人工抽查）。
- 草稿的人工采纳率与返工次数——这是把工程验证转成业务验证的关键一步；建议先只在“草稿/建议”档位跑两周，与人工基线对比采纳率和返工率，任何上线动作保持人工执行，直到有独立审批与审计链路为止。
- 迁移到自家受限权限场景时，同样先只开放“创建草稿”一个写入口，用上面第 3 条的幂等测试作为验收门槛。
