# Pi Durable

- 结论：**值得一试**。如果要把 coding agent 做成长期在线、可重连、可从崩溃恢复的应用，先用 SQLite + 单进程 owner 做一个受控原型，重点验证 submission 去重、工具重放边界、外部副作用幂等和故障恢复；不要把它直接当成稳定 API、分布式工作流平台或 exactly-once 执行系统。
- 原文：https://earendil.com/posts/pi-durable/
- 来源：manual，初筛相关度 3，依据原文，并用官方 README、官方示例目录和 Context7 当前文档交叉核验
- 调研：人工委托，Claude Opus 5.5，2026-10-06

## 是什么

Pi Durable 是 Earendil Works 在 Pi 1.0 同日发布的实验性 TypeScript 包 `@earendil-works/pi-durable`。它不是另一个终端 coding agent，而是一个可嵌入 Slack、GitHub bot、TUI 或服务端应用的 **durable agent harness**：把 conversation、模型请求、工具调用、压缩、子 agent 和自定义业务流程统一建模为可持久化、可检查点恢复的状态。

它试图补上普通交互式 coding agent 会话缺少的几种能力：

1. 进程因休眠、OOM、容器重启或部署中断后，能从已提交的 checkpoint 继续。
2. 一个 harness 同时运行多个 conversation，或从任意 transcript entry 分叉新 conversation。
3. 多个客户端可重连、观察 committed state，并在 agent 忙碌时排队或 steer。
4. transcript、todo、计划、工单等应用状态在一个 transaction 中原子提交。
5. 工具、扩展和提示词可按名称注册与替换，不把代码对象固化进持久记录。
6. 上下文接近上限时后台 compaction，但原始 entries 仍留在 storage。

官方 README 明确把它标为 **Experimental**，并说明 API 可能在 release 之间无通知变化。它当前更适合受控原型和架构验证，不适合未经版本固定与故障测试就承担生产关键路径。

### 核心抽象

| 抽象 | 作用 | 持久性要点 |
|---|---|---|
| `Harness` | 在一个 storage 上调度 conversations、tasks、tools 和 compaction | 重新 `open()` 后可 `resume()` 未完成工作 |
| Conversation | transcript、agent 配置、队列、usage 和 ownership 的边界 | 句柄按 ID 定位，事实来自 committed state |
| Entry / Commit | 用户、助手、工具、system、reset 等不可变记录及其原子提交 | entry、document 变更和 task 可同一 commit 落盘 |
| Submission | 向 conversation 提交 input 或 write | 稳定 `requestId` 可跨重启去重 |
| Task | 模型请求、工具调用、压缩和自定义工作的统一状态机 | 每个 phase 后 checkpoint，可等待、恢复、abort |
| Extension / Registry | sections、tools、hooks、wraps、tasks 的命名组合及进程内实现表 | conversation 保存名称；重启后应用必须重新安装代码 |
| Execution environment | 文件、shell 或远端运行环境的抽象 | 每个 conversation 可用不同 cwd/env；隔离由应用负责 |
| Document | 与 transcript 一起提交的类型化 JSON 应用状态 | 支持 rewindable history 和 fork 策略 |

### 最重要的边界

Pi Durable 提供的是 **commit-first、可恢复的 agent/task harness**，不是全局 exactly-once 系统：

- 同一个 storage 同一时间只允许一个 owner 进程；README 明确说没有跨进程锁。
- `requestId` 去重的是 submission，不自动让 deploy、付款、写外部 API 等副作用只发生一次。
- 工具只有显式声明 `replay: "safe"` 才会在崩溃后自动重跑；声明错了会重复副作用。
- 未声明安全重放的工具不会自动重跑，模型会看到 interrupted 说明和已经保存的输出；应用仍需核验外部系统的真实状态。
- 模型请求中断后会重新发送，而不是从最后一个 token 继续。
- SQLite 的 `synchronous=NORMAL` 可保住进程崩溃前已提交的数据，但 README 不保证断电、宿主故障或存储损坏时不丢最新数据。
- fork 继承 transcript 和 agent/document 语义，不复制文件系统、容器、网络资源等外部状态。

## 具体做法

### 1. 安装并固定版本

前提：项目有 JavaScript/TypeScript runtime，且愿意试用实验性 API。原文和当前官方 README 给出的安装命令是：

```bash
npm install @earendil-works/pi-durable @earendil-works/pi-ai @earendil-works/chord
```

由于 README 明示 API 会无通知变化，原型也应把这三个包锁到精确版本，并把升级单独作为一次故障恢复回归测试，不要长期跟随浮动版本。

### 2. 用 SQLite 建最小持久 harness

前提：先接受“一个 storage 只有一个 owner 进程”的部署约束。文章的核心初始化结构如下：

```ts
import { createModels } from "@earendil-works/pi-ai/models";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { createRegistry, Harness } from "@earendil-works/pi-durable";
import { NodeExecutionEnv } from "@earendil-works/pi-durable/env/node";
import { openNodeSqliteStorage } from
  "@earendil-works/pi-durable/storage/sqlite/node";
import { CodingTools } from "@earendil-works/pi-durable/tools";
```

```ts
models.setProvider(openaiProvider());
registry.install(CodingTools);

const env = ({ cwd }: { cwd?: string }) =>
  new NodeExecutionEnv({ cwd: cwd ?? process.cwd() });

const harness = await Harness.open(
  await openNodeSqliteStorage("./agent.sqlite"),
  { models, registry, env },
  context,
);
```

当前 README 还给出更小的恢复骨架：

```ts
const harness = await Harness.open(
  await openNodeSqliteStorage("./session.sqlite"),
  { models, registry },
  context,
);
const root = await harness.root(context);
harness.resume();
```

预期结果：关闭进程并重新打开同一个 SQLite 文件后，能取得同一个 root conversation，并让 pending work 继续。

生产化前必须另外处理：单实例选主、storage 文件备份、进程锁、认证授权、ExecutionEnv 隔离、秘密注入和版本迁移；这些不是 Pi Durable 自动提供的能力。

### 3. 每个可重试提交都使用稳定 `requestId`

前提：调用方能为一项业务工作生成稳定 ID。原文示例：

```ts
const job = {
  type: "input",
  content: "Fix the flaky login test",
  requestId: "job-42",
} as const;

const submission = await root.submit(job, context);
const settled = await submission.wait(context);
```

客户端网络重试或进程重启后，应复用同一个 `requestId`；重复 `submit()` 会返回已有 submission。不要每次重试都生成新 UUID，否则等于主动绕过去重。

`wait()` 的取消只停止当前等待者，不会取消底层工作；真正停止 conversation 要使用 `conversation.abort()`。这一区别需要写进调用端状态机，避免 UI 断开被误解为任务取消。

### 4. 先给工具分级，再决定是否允许自动重放

前提：逐个工具分析“同样参数执行两次是否安全”，不能按工具类别批量猜测。

只读、确定性查询可以考虑：

```ts
const searchIssues = defineTool({
  name: "search_issues",
  parameters: Type.Object({ query: Type.String() }),
  replay: "safe",
  execute: async (args, api) => { /* ... */ },
});
```

以下工具默认不要声明 `replay: "safe"`：

- deploy、发布、合并、删除；
- 付款、退款、发券；
- 发邮件、发消息、创建工单；
- 对不支持幂等键的外部 API 做写操作；
- 结果依赖当前外部状态、重复执行会改变含义的 shell 命令。

对有副作用但业务上必须可恢复的调用，采用两层保护：

1. 用 task ID 或业务 ID 构造外部系统接受的稳定幂等键。
2. 恢复时先查询外部系统状态，再决定继续、补偿还是转人工，不把“task checkpoint 已保存”当成“外部副作用一定没有发生”。

文章支付示例使用 `payment-${task.id}` 作为幂等键，并给 task 定义 `abort` 补偿退款。这个模式说明 Pi Durable 负责触发恢复与 abort，业务代码仍负责幂等和补偿正确性。

### 5. 把审批等跨重试决定写入 durable memo

前提：deploy、付款等工具需要人工或策略审批。文章用 `beforeTool` hook 拦截 `deploy`：

```ts
hook(ToolTask, {
  beforeTool: async (call, api, context) => {
    const approved = await api.memo<boolean>("approval:deploy", context);
    // 根据已保存或新取得的审批结果决定放行或 block
  },
});
```

`memo` 是 first-write-wins。hook 因崩溃重跑时，应复用第一次已经持久化的审批结果，而不是再次向审批人提问。若审批本身有时效，还需要在业务层保存批准范围、操作者、时间和过期规则；原文没有提供完整权限与审计方案。

### 6. 用 conversation 组合可恢复的子 agent

Pi Durable 没有专用 subagent 原语。原文推荐把子 agent 建模为由当前 tool task 拥有的 conversation：

1. 在 transaction 内按 `ownerTaskId` 查询既有 child conversation。
2. 找不到时才创建，避免 replay 重复生成孩子。
3. 用 `configure()` 选择较小模型、独立指令和最小工具集。
4. 用稳定 `requestId` 向 child 提交任务。
5. 等待 child 的回答 entry。
6. 用 `api.details()` 暴露 child ID，让 UI 能显示和打开它。

前台子 agent 使用 task ownership：

```ts
{ ownership: { kind: "task", taskId: api.taskId } }
```

它会阻止父 conversation idle，并随普通 abort 自底向上清理。

跨 turn 继续的后台工作使用：

```ts
{
  ownership: { kind: "conversation" },
  background: true,
}
```

它不阻止 conversation idle，普通 abort 默认也不会停止它。后台 task 必须提供单独的取消入口，否则会形成用户以为已经停止、实际仍在运行的孤儿工作。

### 7. 配置 compaction，并保留原始历史检索入口

前提：conversation 可能接近模型上下文上限。原文配置：

```ts
settings: {
  compaction: {
    reserveTokens: 16384,
    backgroundTokens: 32768,
  },
}
```

含义：在距离硬阈值尚有 `backgroundTokens` 时后台生成摘要；超过 `contextWindow - reserveTokens` 后，下一请求等待摘要。provider 仍报上下文过长时，harness 会压缩并重试一次。

手动压缩：

```ts
await root.compact(
  "Keep the names of the failing tests",
  context,
);
```

compaction 不删除 storage 中的原 entries，但模型后续主要看到摘要。应用应同时提供历史检索工具，例如用 `scanEntries()` 搜早期记录，并把摘要遗漏率列入试验指标。

需要主动开启新上下文时，可用 `reset(note?)` 或工具返回：

```ts
{
  content: [{ type: "text", text: "Handing off." }],
  control: { handoff: args.note },
}
```

文章建议 handoff 工具先用稳定 request ID 排队一条 `Continue.`，再结束当前 run，让新上下文从交接说明继续。

### 8. 用 Document 保存必须和 transcript 一致的应用状态

前提：todo、计划、工单状态等不能与对话各自提交、产生半成功状态。文章示例：

```ts
const Todos = defineDoc<{ items: string[] }>({
  kind: "app.todos",
  version: 1,
  scope: "conversation",
  history: "rewindable",
  fork: "asOf",
  initial: () => ({ items: [] }),
});
```

Document 可与 transcript entry 和 task 在同一个 commit 中更新。fork 时必须显式选择语义：

- `initial`：子 conversation 从初始值开始；
- `current`：取父 conversation 当前值；
- `asOf`：取父 conversation 在 fork entry 当时的值。

对计划、todo 和审查结论，通常先试 `asOf`，因为它能让分支看到“分叉当时”的状态；对共享资源或实时账户余额则不能凭此推断，应由外部系统提供真实状态。

### 9. UI 从 committed state 重建，不把瞬时事件当事实源

多端 UI 的基础读取方式：

```ts
const view = await thread.viewState(context);
render(view.value);
view.subscribe(render);
```

远端同步可选：

- `watch()`：传输 commit operations，负载较小；
- `watchEvents()`：转换成 Pi coding agent 风格事件，兼容性较好但字节更多。

README 说明 watch 最多保留 100 个未消费 frame/batch，客户端落后时可能收到最新完整状态或 snapshot。partial answer 和工具输出默认约每 100 ms commit 一次，因此崩溃时可能丢失这段刷新窗口里的流式片段。UI 必须能接受 snapshot 重建，不应假设每个增量事件都完整到达。

conversation 忙碌时可 steer：

```ts
await thread.submit(
  {
    type: "input",
    content: "Check the staging logs first",
    whenBusy: "steer",
  },
  context,
);
```

当前类型还支持 `whenBusy: "followUp" | "reject"`；默认行为是排队，不存在字面量 `"queue"` 选项。

### 10. 做故障注入后再决定是否采用

最小原型只选一条无生产副作用的 coding 任务，依次在这些边界杀进程：

1. submission commit 后、模型返回前；
2. 模型已经输出部分文本时；
3. replay-safe 查询工具执行中；
4. 非 replay-safe 模拟写工具“外部成功、结果尚未 commit”时；
5. child conversation 运行中；
6. compaction 生成中；
7. extension 替换后、pending task 进入下一 phase 前。

每次重新打开同一 SQLite storage 并调用：

```ts
const harness = await Harness.open(storage, options, context);
harness.resume();
```

预期结果不是“所有动作自动成功”，而是每项工作都进入可解释状态：继续、明确 interrupted、等待缺失代码、需要核验外部状态，或执行补偿；不能静默消失，也不能重复产生不可逆副作用。

## 对应的研究问题

### 2. 任务匹配：什么工作适合怎样的模型、工具和协作方式

- 短时、单人、终端内的编码会话继续用普通 Pi coding agent；只有任务要跨进程、跨客户端、跨 turn，才值得引入 Pi Durable。
- 可重复、只读的工具才考虑 `replay: "safe"`；外部写操作使用幂等键、状态核验与补偿。
- 子任务要独立 transcript、模型、工具和恢复边界时，用 child conversation；只需同一上下文内调用一个函数时，不要为“像 agent”而创建 conversation。
- 需要随当前 turn 一起完成的工作用 foreground ownership；提醒、长审查等跨 turn 工作用 background task。
- 需要历史分支时用 fork；需要完全重置上下文但保留同一 conversation 历史时用 reset/handoff。

### 3. 条件供给：需要提供哪些信息、工具、权限和反馈

- 必须提供 models、registry；内置文件和 shell 工具还需要 ExecutionEnv。
- 重启时要重新安装 conversation 引用的同名 extensions 和 task definitions，否则 pending task 可能一直等待。
- 生产环境必须在 harness 外补齐身份认证、会话授权、执行隔离、秘密管理、审计和存储备份。
- 外部副作用要有稳定业务 ID/幂等键；审批要持久化，不能只存在进程内 promise。
- UI 以 committed state 为准，用 snapshot + watch 恢复，不依赖内存事件流猜状态。

### 4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成

- task phase、durable timer、child task dependency、queued input 和 background ownership 构成长期推进基础。
- `harness.resume()` 扫描并继续 pending work；submission 或 `wait()` 也会启动 scheduler。
- `onYield` hook 可在 agent 本想停下时决定是否继续；foreground/background ownership 决定 idle 和 abort 的传播边界。
- compaction 可在 token 阈值达到时后台启动；handoff 可排队后续输入并切换到新上下文。
- 这些是主动推进的运行时原语，不等于业务调度、重试预算、SLA 和告警已经做好。

### 5. 效果验证：怎样判断确实改善了结果

- 通过 crash injection 检查恢复后没有丢任务、没有重复副作用、状态可解释。
- 通过重复相同 `requestId` 检查只产生一个 submission。
- 对 replay-safe 与非 replay-safe 工具分别制造中断，检查一个能安全重跑、另一个明确进入 interrupted 并保留已提交输出。
- 让客户端中途断开再加入，检查 UI 能仅靠 committed state 重建 transcript、工具状态、队列和 usage。
- 在 compaction 前后用固定事实问题回归，检查摘要是否遗漏任务目标、约束和关键测试名。
- 记录 task graph、恢复耗时、人工介入次数和重复外部调用数，而不只看最终回答是否“像完成了”。

## 与已有做法的关系

- **Pi（adopt）**：这是 Pi 体系中面向长期应用的运行层，补足已有 Pi 调研里只有名称、没有主动推进步骤的空白。普通 Pi coding agent 仍适合交互式终端工作；Pi Durable 是要自己构建 agent 服务时的更底层选择。
- **Claude Code 等交互式 coding agent**：它们主要解决人在环的单次编码会话。Pi Durable 解决的是应用级恢复、多 conversation、多客户端和持久业务状态，不是同一层的替代关系。
- **通用 durable workflow 引擎**：Pi Durable 借用了 checkpoint、ownership、补偿和 durable timer 等思路，但当前单 storage 单 owner、无跨进程锁，也未声明分布式调度或横向扩展，不应直接类比成 Temporal 一类成熟平台。
- **现有手册《让编码 agent 在可控环境里反复跑》**：该手册已有 Pi CLI、工作区、权限护栏和运行环境；本文进一步讨论“如何开发一个可恢复的 agent 应用”。二者有安全与运行边界交集，但使用者和操作层次不同。
- 清单中没有单独的 `Pi Durable` 条目；当前可作为 `Pi` 条目的深入证据，是否单列应等最小原型验证后再决定。

## 证据与局限

### 原文和官方材料直接支持的内容

- 原文给出安装、SQLite harness、submission、fork、extension、tool、hook、subagent、task、compaction、handoff、document、watch 和 steer 的代码片段。
- 官方 README 支持：`Harness.open()`/`resume()`、task checkpoint、`requestId` 去重、`replay: "safe"`、foreground/background ownership、document fork 策略、registry 热替换和 compaction。
- 官方示例目录包含与主张直接对应的 TypeScript 示例：`01-documents.ts`、`02-forks.ts`、`13-recovery.ts`、`22-subagent-foreground.ts`、`23-subagent-background.ts`、`25-compaction.ts`、`31-reload-and-restart.ts`。
- README 明确列出 memory、SQLite、JSONL 后端，并提供 storage conformance suite；SQLite/JSONL core 可通过 facade 适配其他 JavaScript runtime。

### 不能从材料推出的保证

- 没有独立 benchmark、生产案例数据、故障恢复成功率、延迟或吞吐 SLA。
- 示例目录的存在不能代替本机实际运行测试；本次没有安装包或运行 examples。
- `requestId` 不是所有外部副作用的 exactly-once 保证。
- `replay: "safe"` 是开发者声明，不会自动给网络、文件或支付操作增加幂等性。
- compaction 保留原始消息，但不保证摘要无损，也不保证模型行为与完整上下文一致。
- fork 不复制外部执行环境的状态。
- 没有证据表明它支持多进程共享 storage、leader election、跨主机自动 failover 或横向扩展。
- 多人 steer 的权限、冲突解决、身份认证和审计策略需要应用自行实现。

### 适用与不适用

适用：

- 正在开发 Slack/GitHub/内部平台里的长期 agent，而不是只在终端跑一次任务；
- 需要进程重启恢复、多客户端重连、conversation fork、持久子 agent 或原子应用状态；
- 团队有能力设计幂等键、补偿、执行隔离和故障注入测试；
- 可以固定实验性依赖版本，并接受单 storage 单 owner 架构。

不适用：

- 只想要开箱即用的 coding agent CLI；
- 需要成熟稳定 API、跨进程协调、水平扩展和明确 SLA；
- 外部副作用没有查询、幂等或补偿能力；
- 误以为“durable”会自动解决权限、安全、认证、备份和灾难恢复；
- 无法容忍实验性 API 在 release 间变化。

## 怎么试、怎么验证

### 最小试用：一个工作日完成单实例故障恢复原型

1. 固定三个 npm 包版本，用 SQLite 创建一个 root conversation，只安装 `CodingTools` 和一个自定义模拟工具。
2. 提交同一 `requestId` 两次，确认获得同一个 submission，storage 中没有重复工作。
3. 定义一个 replay-safe 查询工具和一个非安全模拟写工具；模拟写工具把业务幂等键写到独立测试表。
4. 分别在模型请求、两个工具、child conversation 和 compaction 中途强制退出进程。
5. 重开同一 storage，重新安装相同 registry/task definitions，调用 `harness.resume()`。
6. 用 `viewState()` 重建 UI，不读取旧进程内存；核对 transcript、queued input、task 状态和工具输出。
7. fork 一个 reviewer conversation，给它移除写工具，检查 fork point 和 document `asOf` 状态是否正确。
8. 记录下面的指标，满足采用判据后再接真实外部系统。

### 建议指标与采用判据

以下阈值是本项目建议的试验门槛，不是原文数据：

| 指标 | 采集方式 | 试用判据 |
|---|---|---|
| submission 重复数 | 同一 `requestId` 连续提交、跨重启再提交 | 只存在一个 submission |
| 不可逆副作用重复数 | 测试表按业务幂等键记录调用 | 0 次重复生效 |
| 故障后不可解释任务数 | 每个注入点恢复后检查 task graph/inspect | 0 个静默丢失；每项均为继续、interrupted、等待或已补偿 |
| UI 重建完整性 | 客户端断开后仅用 snapshot/watch 重连 | transcript、队列、工具状态和 usage 可重建 |
| background task 可取消性 | conversation idle 后单独取消后台任务 | 有明确入口，取消后无遗留工作 |
| compaction 事实保留率 | 压缩前预埋目标、约束、测试名，压缩后固定提问 | 关键任务约束全部保留；遗漏时调整提示或暂不采用 |
| extension 升级恢复 | pending task 中途替换/重启 registry | 新旧调用边界可解释，缺定义时可观察而非卡死无告警 |
| 人工介入次数 | 每次恢复需人工判断的节点计数 | 明确知道哪些工具必须人工核验，且数量可接受 |

### 决策规则

- **升级为采用**：所有故障注入都产生可解释状态，测试外部副作用零重复，UI 可重建，且团队能维护版本固定、幂等与补偿规则。
- **维持小范围试用**：核心恢复可用，但 extension 升级、compaction 或人工核验成本仍高。
- **放弃本方案**：需要多进程/多主机调度、无法给副作用加幂等与补偿，或 API 变更成本超过自建收益；此时应评估成熟 durable workflow 引擎承载业务流程，让 agent 只负责其中的模型步骤。
