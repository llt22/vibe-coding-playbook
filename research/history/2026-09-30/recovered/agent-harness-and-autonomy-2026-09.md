# Agent 环境、持续工作与产品能力：历史比较

> 历史材料，归档于 2026-09-30。本文件恢复当时的用户讨论与 AI 回答，未重新核验外部能力、数字、版本或“已测试”声明。安装命令和推荐仅是历史正文，不代表本次执行或当前建议。涉及提问所在项目的限制只属于当时上下文。

研究用途：从历史比较中找出持续身份、任务状态、触发、工作区、工具和反馈这些配套条件。文中项目强弱排名、代码现状与框架选择均有当时语境，不能直接移植为当前项目决策。

## Stencil Harness Playbook（09-04）

### 历史 AI 回答 · 原会话第 34 行

来源：`~/.codex/sessions/2026/09/04/rollout-2026-09-04T23-53-45-01a06d20-3fb3-77e2-be46-1bf74024c602.jsonl:34`。

我看完了。它不是一篇 UI 设计文章，而是一篇关于 AI Agent Harness 如何避免失控的架构复盘。对我们当前原项目最有价值的是这几条。

第一，只有一个事实源。

文章反复强调：状态不能同时存在于数据库、内存闭包、前端状态和日志里，否则重放、恢复、分支都会失真。

对原项目的对应关系应该是：

```text
原项目 API / 数据库
  = 唯一事实源

Agent、Workflow、Version、Run、Node Run
  = 持久化状态

Web、MCP、内置 Builder
  = 状态的不同操作面和视图
```

前端不能自己维护另一套 Workflow 真相。画布上的节点、连线、运行状态最终都要来自后端状态。

第二，界面应该是状态的投影，不应该拥有业务逻辑。

这对我们正在做的设计系统很重要：

```text
后端状态
  -> 语义组件
  -> 不同界面渲染
```

例如后端只表达：

```text
node.status = "running"
node.type = "knowledge_retrieval"
```

组件自己决定显示：

- 紫色节点边框；
- 加载图标；
- 状态文本；
- 调试 Trace；
- 移动端布局。

业务代码不应该到处写颜色、边框和图标。这正好说明我们现在先做 `Button`、`Panel`、`NodeCard` 等设计系统组件是正确顺序。

第三，复杂工作必须是可取消、有限制、可观测的。

文章认为 Tool、Subagent、后台任务都不能是一个无限等待的函数调用，而应该是：

```text
可取消
有超时
有输出上限
有运行状态
有错误和重试边界
```

这和我们之前 Builder 卡住 120 秒的情况直接相关。以后 Workflow UI 不能只显示“运行中”，还要显示：

- 当前节点；
- 已耗时；
- 可取消；
- 超时原因；
- 重试当前节点；
- 输入、输出和错误。

第四，模型和 Provider 的兼容性应该集中处理。

文章反对在业务代码各处散落模型特殊判断。我们之前遇到 DeepSeek 的 `developer` role 问题，就是典型案例。

以后应当由 Provider 层统一处理：

```text
模型能力
消息角色兼容
工具调用格式
参数限制
上下文限制
错误转换
```

Agent、Workflow 和 UI 不应该知道这些模型差异。

第五，验证协议必须成为产品的一部分。

这是对我们当前“快速模型写代码、我来把控”最重要的一条。

文章的观点是：

> 如果没有明确的、机器可执行的验证方式，Agent 很容易生成一个看起来像测试、实际上没有验证价值的东西。

所以我们后续让 Gemini Flash 写 UI 时，不应只要求“做得像参考图”，还要给它固定验证协议：

```text
必须通过：
- Web typecheck
- Web build
- 页面可访问
- 关键组件存在
- 空状态可见
- 加载状态可见
- 错误状态可见
- 节点可选中
- 右侧配置面板可打开
- 调试面板可展开
```

最好再增加 Playwright 的非破坏性检查和截图基准。

对我们当前原项目的结论是：

```text
DESIGN.md
  -> 设计令牌和组件约束

组件层
  -> Button / Panel / NodeCard / Trace 等统一实现

后端状态
  -> Agent / Workflow / Run 唯一事实源

页面
  -> 只是状态投影

快速模型
  -> 在受限目录和组件规范内写代码

主模型/人工
  -> 审查架构、交互和验证结果
```

这篇文章不建议我们照搬它的 XML DOM、Rust、Python 扩展或 omp² runtime。那些是为 Agent Harness 本身服务的架构。我们现在更应该吸收的是它的原则：

> 让复杂性由底层统一承担，让上层和代码生成模型面对简单、稳定、可验证的接口。

所以目前“先写原项目设计系统组件，再让快速模型组装 Agent 和 Workflow 页面”的路线是对的，而且这篇文章进一步说明了：组件系统不仅是视觉规范，也是约束快速模型、保证代码一致性的工程边界。

## Clawith：按能否满足工作需求比较（09-11）

### 历史 AI 回答 · 原会话第 50 行

来源：`~/.omp/agent/sessions/-WebstormProjects-private-project/2026-09-11T10-25-31-432Z_01a09000-4328-7294-91e9-f53e0ab6e4ef.jsonl:50`。

你说得对。按“能不能满足数字员工需求”来判断，结论更直接：

**现阶段，Clawith 比我们的数字员工更强。**

不是因为它架构更好，而是它已经覆盖了数字员工最核心的行为需求：

| 核心需求 | Clawith | 我们当前 |
|---|---|---|
| 员工主动发现工作 | 有 Aware / Focus | 没有，主要等待人工或定时触发 |
| 持续跟踪任务 | 有 Focus 状态和长期记忆 | 有 Assignment 状态，但更像一次任务执行记录 |
| 自己安排后续行动 | Agent 可创建、调整、取消 Trigger | Trigger 主要由人配置，员工不能自主管理工作节奏 |
| 被事件唤醒 | 支持消息、轮询、Webhook 等 | 主要是手动和 cron；Webhook 当前偏结果投递 |
| 长期记忆 | `memory.md`、Experience、持久上下文 | 有 Agent Version 和 Knowledge，但不是员工工作记忆 |
| 独立工作空间 | 每个员工有自己的 workspace，可执行代码 | 有 DSH/Coding Agent 工作区，但没有完整映射为数字员工能力 |
| 员工之间协作 | 组织目录、消息、委派、关系 | Crew 和 handoff 有模型，但完整 Agent-to-Agent 协作尚未形成 |
| 对外工作 | Slack、Discord、飞书等渠道身份 | 当前主要是 Web、memory、webhook |
| 员工身份连续性 | 人格、记忆、工作区持续存在 | Agent Version 是发布快照，不等于持续员工身份 |

因此，如果用户需求是：

> “给我一个员工，我布置目标后，它能自己跟进、主动工作、记住上下文、调用工具、联系其他员工，并通过企业渠道交付结果。”

**Clawith 当前更接近满足需求。**

我们现在更接近：

> “我配置一个已发布 Agent，给它一个 Assignment，按计划执行，并对执行过程进行可靠记录、审计、重试和交付。”

这满足的是**受治理的自动化任务执行**，还没有完全满足**自主数字员工**。

我们的优势只有在需求包含以下内容时才明显：

- AI 应用需要先构建、测试、评测和发布；
- 需要不可变版本；
- 需要交付到独立 Runtime；
- 需要严格的权限、审批、凭据隔离；
- 需要 Run / Attempt / Invocation / Artifact 级审计；
- 需要可靠重试、故障恢复和多租户隔离。

但这些是“企业级应用交付和运行”的能力，不足以抵消数字员工核心行为能力的差距。

**按需求满足度排名：**

1. **主动工作的数字员工：Clawith 胜出**
2. **多员工组织协作：Clawith 胜出**
3. **长期员工记忆与身份：Clawith 胜出**
4. **渠道内工作的员工：Clawith 胜出**
5. **可验证、可治理、可交付的 AI 应用：原项目胜出**
6. **稳定执行预设任务：两者都有，但原项目的运行治理更扎实**

所以当前不能说“我们整体更强”。更准确的判断是：

> **如果核心需求就是数字员工，Clawith 的满足度高于我们；我们目前的数字员工只是可靠执行内核，尚未达到 Clawith 的员工行为层。**

我们最应该补的不是更多 Tool、更多 Workflow 或更多页面，而是四个直接影响需求满足度的能力：

1. 员工长期记忆和持续身份；
2. Focus / Objective 这样的持续工作状态；
3. 员工自主决定下一步并创建受控触发器；
4. 员工之间和外部渠道之间的消息、委派、回复闭环。

参考：[Clawith](https://github.com/dataelement/Clawith)；我们当前状态见 `current-state.md`（`~/WebstormProjects/private-project/docs/development/current-state.md:100`） 和 `architecture-baseline.md`（`~/WebstormProjects/private-project/docs/development/architecture-baseline.md:123`）。

## StaffDeck：概念、工程实现与产品整合（09-16）

### 历史 AI 回答 · 原会话第 290 行

来源：`~/.codex/archived_sessions/rollout-2026-09-15T12-34-40-01a0a358-7df1-7e93-8157-4d75127bb5e0.jsonl:290`。

**结论：两者都没有发明新的技术类别，但不能一概说成纯造概念。**

- **StaffDeck**：主要是把已有技术做成了较完整、可靠的 Agent 产品。概念不新，但部分工程实现有价值。
- **WorkerDeck**：更偏产品整合与行业包装，概念扩张明显，部分关键闭环还没有真正实现。

截至 **2026 年 9 月 16 日**，我检查了 StaffDeck `main` 分支和本地 WorkerDeck 当前代码。

## 直接对比

| 判断 | StaffDeck | WorkerDeck |
|---|---|---|
| 新的基础理论 | 没有 | 没有 |
| 新的执行原语 | 基本没有 | 没有 |
| 工程实现增量 | 比较明显 | 有，但较弱 |
| 产品整合价值 | 明显 | 明显 |
| 概念包装程度 | 中等 | 较高 |
| 核心链路完成度 | 相对较高 | 部分仍是占位 |
| 值得吸收的部分 | 运行可靠性机制 | 产品形态和业务视图 |

## StaffDeck 真正有价值的东西

StaffDeck 最有价值的不是“数字员工”名称，而是它对 **Agent 执行可靠性**做了比较具体的实现。

### 1. 对话回合的防重复执行

它用 `client_turn_id`、请求摘要、持久化记录和租约控制同一请求只能执行一次；已完成请求可以返回原结果，进行中的请求不会被重复提交。([raw.githubusercontent.com](https://raw.githubusercontent.com/OpenBMB/StaffDeck/main/backend/app/core/harness_turn_store.py))

这不是新理论，本质是：

```text
幂等键 + 持久化收据 + Lease + Fencing
```

但很多 Agent 项目确实没有认真实现。

### 2. 写操作防重放

工具调用会生成稳定的 `logical_action_key`。调用结果确定成功时可以复用；外部系统是否执行成功无法确认时，进入 `outcome_unknown`，阻止自动重试，避免重复创建工单或重复发送消息。([raw.githubusercontent.com](https://raw.githubusercontent.com/OpenBMB/StaffDeck/main/backend/app/core/harness_capability_invoker.py))

这是传统分布式系统方法在 Agent 工具调用中的正确应用，有实际价值。

### 3. 会话并发控制

StaffDeck 为每个会话建立数据库 Lease，并通过 owner fencing 防止两个 Worker 同时推进同一个会话。([raw.githubusercontent.com](https://raw.githubusercontent.com/OpenBMB/StaffDeck/main/backend/app/core/harness_session_lease.py))

同样不是新技术，但属于真正的生产工程，而不是概念展示。

### 4. SOP 状态机与能力约束

它把 SOP 定义为节点、边、条件、所需信息、可用工具、知识范围、重试策略和人工处理人，并支持子流程。([raw.githubusercontent.com](https://raw.githubusercontent.com/OpenBMB/StaffDeck/main/backend/app/skills/skill_schema.py))

本质仍然是：

```text
状态机 + Slot Filling + Tool Allowlist + Human Task
```

不是什么新的“数字员工技能理论”，但组合得比较具体。

### 5. OKF 并不是真正的新“本体”

OKF 实际上是带 frontmatter、链接、引用和来源关系的 Markdown 概念页。检索先通过标题、类型、正文关键词进行概念匹配，再结合文档路由和 LLM 选择。([raw.githubusercontent.com](https://raw.githubusercontent.com/OpenBMB/StaffDeck/main/backend/app/knowledge/okf.py))

所以更准确的名称是：

> 结构化知识 Wiki + 分层检索 + 引用追踪

它可能有效，但没有对比评测前，不能认为它比传统混合检索或层次化 RAG 更先进。

## WorkerDeck 的情况

WorkerDeck 的主要能力可以直接还原：

```text
感知 = Event / Trigger
编排 = Workflow
执行 = Agent / Tool
审批 = Human Task
复盘 = Trace / Analytics
```

它确实实现了一些能力，例如 Burr 驱动的流程、条件分支、暂停审批、恢复执行和多人协作。但核心并没有形成新的执行模型。

而且存在明显的“页面概念先于执行能力”：

- `parallel`、`loop` 当前仍按普通控制节点直接流转，没有真正并发和循环语义。
- `action` 节点只生成“提议写动作”的文字，没有调用真实业务操作。actions.py（`~/WebstormProjects/private-project/gateway/engine/actions.py:214`）
- Runcard 回流本体平台明确标记为 `stub`，只是返回虚拟成功结果。retro.py（`~/WebstormProjects/private-project/gateway/retro.py:402`）

所以 WorkerDeck 更准确的定位是：

> 数字员工业务运营产品原型，而不是新的数字员工技术底座。

## 最终判断

**StaffDeck：旧原理，新组合，部分工程实现扎实。**

值得借鉴：

- Run 幂等
- Lease 和 fencing
- 工具副作用防重放
- `outcome_unknown`
- 可恢复事件流
- 节点级能力白名单
- 渠道 inbox/outbox 可靠性

不应该照搬：

- “数字员工”资源模型
- 自建第二套 Agent Runtime
- 自建 SOP 引擎
- OKF 名称和概念体系

**WorkerDeck：主要是产品包装和已有组件集成。**

值得参考的是业务工作台、运行观察和协作体验；“五环”“本体驱动”“复盘回流”等不应进入原项目底层模型。

一句话裁决：

> **StaffDeck 有值得吸收的可靠性工程，但没有新技术范式；WorkerDeck 有产品设计参考价值，但更接近重新组织并命名已有能力。两者都不值得整体引入，只应拆成具体能力逐项评估。**

另外，StaffDeck 使用 AGPL-3.0，直接复用代码前需要单独评估许可证影响。([raw.githubusercontent.com](https://raw.githubusercontent.com/OpenBMB/StaffDeck/main/LICENSE))

## Octop：自托管助手与触发入口（09-20）

### 历史 AI 回答 · 原会话第 139 行

来源：`~/.codex/archived_sessions/rollout-2026-09-20T18-01-24-01a0be43-6b56-74b2-a07c-fa2ae8df30b7.jsonl:139`。

**结论**

Octop 是一个完成度较高的“自托管 AI 助手成品”，偏个人、家庭和小团队使用。它不是原项目这类 Agent/Workflow 构建与治理平台，也不适合作为原项目的 Runtime 或 Core 直接引入；更适合参考其安装交付、统一消息入口、安全审批和本地运维设计。

截至 **2026 年 9 月 20 日**，最新版本是 **v1.0.1**，发布于 **2026 年 9 月 19 日**。

**它是什么**

- 多用户、多 Agent 的自托管助手。
- 入口包括 Web、CLI、HTTP/WebSocket、飞书、钉钉、QQ、企业微信等。
- 支持 Agent 人格、专家模板、记忆、知识库、定时任务、插件、MCP Connector、ACP 编程 Agent。
- 提供 Windows、macOS、Linux、Docker、飞牛 NAS 安装包。

核心架构比较直接：

```text
FastAPI + React
    ↓
Agent / Gateway / Cron / User Manager
    ↓
harness-agent / gateway / memory / browser
    ↓
SQLite 或 PostgreSQL + Agent 文件工作区
```

它明确采用**单进程、无 Redis、无外部队列**的模式。优点是部署简单，代价是只能单机纵向扩展，不提供多实例并发和高可用承诺。

**工程质量**

仓库不是演示项目：

- 约 1025 个 Python 文件、835 个 TS/TSX 文件。
- 约 12.3 万行 Python、15.8 万行前端代码。
- 344 个单元测试文件、67 个集成测试文件、169 个前端测试文件。
- 使用严格 mypy、Ruff、pytest、Vitest、CodeQL。
- 有 ADR、模块边界、Agent 开发规范、SQLite/PostgreSQL 双后端迁移设计。
- 发布物覆盖多个平台，升级、备份、系统服务和数据目录都有完整路径。

**主要风险**

1. **关键运行时尚未真正开源**

   核心能力大量依赖 `harness-agent`、`harness-gateway`、`harness-memory`、`harness-browser`。仓库中有 181 个文件引用这些组件，而 README 明确写着这些项目“正在筹备开源”。

   因此 MIT 许可主要覆盖 Octop 外壳，核心 Agent 行为目前无法在同一个仓库内完整审计、修改和复现。这是采用或深度二开的最大风险。

2. **仍处于 1.0 初期快速演进阶段**

   当前 GitHub 页面显示约 199 个开放 Issue、79 个 PR。最近版本仍在集中处理配置损坏、PostgreSQL 字段、Windows 构建和前端依赖锁定等问题。

3. **CI 对前端的强制门禁不足**

   PR 主 CI 主要执行 Python lint、mypy 和 pytest，没有强制执行 Dashboard 的 ESLint、TypeScript build 和 Vitest。前端会在部分发布流水线构建，但不等同于每个 PR 都完整验证。

4. **真实集成测试可能跳过**

   Live CI 在缺少真实凭据时会自动跳过，所以 CI 绿色不代表所有 LLM、Connector、IM 和对象存储集成都经过真实验证。

5. **文档已有轻微漂移**

   项目和发布版本已经是 `1.0.1`，但中文 README 的版本徽章仍写 `0.9.33`，说明高速发布下文档同步存在遗漏。

6. **安全责任较多落在部署者身上**

   项目具备 JWT、审计日志、敏感信息脱敏、HITL 审批和 Shell Tool Guard，但官方安全说明仍要求部署者负责网络暴露、凭据轮换和规则维护。推荐的 `curl | bash` 安装方式也应先审查脚本再执行。

**对原项目的意义**

值得借鉴：

- Web、IM、CLI、Cron 统一进入同一处理链。
- 一条命令启动、系统服务、升级、备份和数据目录约定。
- Tool Guard、HITL、审计和凭据脱敏的产品化方式。
- ADR、模块边界和跨平台发布物管理。
- SQLite 默认、PostgreSQL 可选的低门槛部署策略。

不应引入原项目 Core：

- MBTI、专家库、长期记忆、主动关怀等助手产品概念。
- Octop 的动态插件、Agent Teams 或 `harness-*` Runtime。
- 以 Octop 替换 Mastra，或者在原项目内形成第二套 Agent、权限、存储和执行生命周期。
- 将 Octop 的单进程状态模型直接套到原项目的 Version、Run、Attempt、Invocation 合同上。

我的判断是：**Octop 很适合直接部署成自托管 AI 助手，也适合作为原项目前端交互和本地交付的竞品参考；但不适合作为原项目的基础依赖。** 真要发生集成，也应把它看成外部系统，通过原项目已有公开 API/Skill 边界协作，而不是进入 Core。

## Microsoft Agent Framework（09-21）

### 历史 AI 回答 · 原会话第 64 行

来源：`~/.codex/archived_sessions/rollout-2026-09-21T20-19-40-01a0c3e8-5cc9-7782-af50-977b2938c641.jsonl:64`。

我看了。结论先说：

**Microsoft Agent Framework（MAF）值得关注，但按原项目当前架构，不应替换 Mastra，也不应引入为第二套 Runtime。** 它更适合作为外部候选实现和能力参考。

**它是什么**

MAF 是微软把 AutoGen、Semantic Kernel 等方向收拢后的统一 Agent/Workflow 框架，当前主线覆盖 Python、.NET，并有 Go SDK；定位是构建、编排和部署单 Agent、多 Agent 以及图式 Workflow。它支持 OpenAI、Azure OpenAI、Microsoft Foundry、MCP、A2A 等集成。([github.com](https://github.com/microsoft/agent-framework/blob/main/TRANSPARENCY_FAQ.md?utm_source=openai))

比较有价值的能力：

- 图式 Workflow：顺序、并行、条件路由、handoff、sub-workflow；
- Checkpoint / resume / rehydrate；
- Human-in-the-loop，通过 request/response 暂停 Workflow；
- Tool approval；
- Agent 与 Workflow 组合；
- OpenTelemetry、Azure Functions / Durable hosting；
- Python、.NET、Go 的跨语言方向。([learn.microsoft.com](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop?utm_source=openai))

**和原项目的关系**

| MAF 能力 | 原项目当前对应 |
|---|---|
| Agent / Workflow Runtime | Mastra |
| Workflow graph | Mastra Workflow |
| Agent orchestration | Mastra + 原项目组合调用 |
| Checkpoint / resume | 原项目 Run / Attempt / Workflow 恢复边界 |
| HITL / approval | 原项目 Human Task、Approval |
| Tool / MCP | 原项目 Tool、Policy、Credential、Invocation |
| Telemetry / evidence | 原项目 Event、Artifact、Usage、Audit |
| Hosting / queue / identity | 原项目自己的控制面、pg-boss、Keycloak |

关键区别是：**MAF 更像执行框架；原项目还负责不可变版本、发布、权限、Policy、审批、Package、运行证据和审计。** MAF 的 checkpoint 是 Workflow 执行状态持久化，不等于原项目的 Run/Attempt/Invocation 事实模型，也不应该直接暴露为原项目的第二套状态源。

**当前判断**

1. **不迁移 Runtime**
   当前计划已经明确 Mastra 是唯一 Agent / Workflow / Assignment Runtime。引入 MAF 会形成第二套 Workflow、状态、恢复和执行语义，直接违反现有架构基线。

2. **不把 MAF 的概念搬进 Core**
   `Checkpoint`、`Executor`、`RequestPort`、`Orchestration` 等可以作为 Adapter 内部实现细节或 Probe 观察对象，不能未经真实任务验证就变成原项目的公共资源、权限模型或默认 UI。

3. **可以借鉴三个具体点**
   - checkpoint 与 HITL 请求如何绑定；
   - graph workflow 的暂停、恢复、取消和迟到响应语义；
   - durable hosting 与外部 worker 的边界设计。

4. **真正有价值的后续验证条件**
   只有出现真实需求，例如某客户明确要求 .NET/Foundry/Azure Durable 部署，或者当前 Mastra 无法满足某种跨进程恢复场景，才值得做一个受控 Adapter Probe。Probe 需要比较：
   - 状态是否能映射到现有 Run/Attempt；
   - 外部副作用未知时是否能保持原项目的禁止重放规则；
   - checkpoint 是否会复制 Provider 或 Runtime 私有状态；
   - 失败、取消、人工审批和审计是否能保持现有合同。

因此，这次调研的结论应记录为：

> **MAF 是值得持续观察的外部 Agent/Workflow Runtime 候选，但当前没有进入原项目的产品或实现路线。Mastra 继续作为唯一 Runtime；MAF 只在出现真实 .NET、Azure Durable 或跨进程恢复触发时进入受控 Adapter 评估。**

本次没有修改代码或当前计划。
