# agentblazo/blazo

- 结论：**值得一试**。先在一个 TypeScript agent 的调试环节小范围试：按 README 的 clone → mise/bun install → bun apps/cli/src/index.ts watch 起本地 collector+dashboard，用 observe/span/log 埋点，再靠 runs/inspect 与 findings 定位慢、卡死、重复错误。理由是原文给出了可直接照做的命令、SDK 用法、config 默认阈值和五条确定性检测规则，但项目自标 MVP、dashboard 配图明确标注为目标设计而非当前 UI，因此适合试一试而不是直接采用。
- 原文：https://github.com/agentblazo/blazo
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T16:28:04.685Z

## 是什么

Blazo（产品名 AgentBlazo）是一个面向 AI agent 的**开源本地可观测性工具**。它不做 agent 构建、playground 或评测，只回答一个问题："我的 agent 为什么慢、卡住或失败"，依据是真实 telemetry 而不是提示词回放。

工作链路（原文架构图）：

- agent 侧用 `@blazo/sdk` 的 `observe()` / `span()` / `log()` 埋点；
- 经 `@blazo/otel` 以 **OTLP/HTTP JSON** 发到本地 collector（默认端口 **4318**，Hono + Bun）；
- collector 在 ingest 时归一化数据、跑确定性检测规则，写入 **SQLite（WAL 模式）**；
- dashboard（Next.js，默认端口 **3000**）通过 **SSE** 实时更新，无需 Redis、无需云端账号。

`observe(name, fn)` 产生的 root span 被当作一次 **Run**，子 span 成为时间线上的事件。检测规则共五条，全部确定性、无 ML：`long_running`、`repeated_tool`、`repeated_error`、`no_activity`、`possible_loop`，命中后生成 **Finding**。

## 具体做法（编号步骤）

### 前提条件

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Bun | latest | 可用 mise 管理（`.mise.toml` 固定 `bun = "latest"`） |
| Node.js | 20+ | 仅在 Bun 之外运行 dashboard/SDK 时需要 |
| Git | any | 用于克隆仓库 |

### 1. 安装

```bash
git clone https://github.com/agentblazo/blazo.git
cd blazo

mise install            # 或: brew install bun / curl -fsSL https://bun.sh/install | bash
bun install
```

### 2. 启动（一条命令起全套）

```bash
bun apps/cli/src/index.ts watch
```

`watch` 会同时启动 collector（4318）和 dashboard（3000），并在终端显示 runs/events 的实时 TUI。浏览器打开 `http://localhost:3000`，`Ctrl+C` 停止全部。

想分开跑两个服务：

```bash
bun apps/collector/src/index.ts        # collector on :4318
bun run dev --cwd apps/dashboard       # dashboard on :3000
```

### 3. 跑一个现成 agent 验证链路

```bash
bun run --cwd examples/basic-agent start
```

原文称该 run 会在约 2 秒内出现在 dashboard 上，无需刷新。

### 4. 生成配置文件

```bash
blazo init                  # 写入默认 blazo.config.json
```

默认内容（原文给出，可直接改阈值）：

```json
{
  "endpoint": "http://127.0.0.1:4318",
  "collector": { "host": "127.0.0.1", "port": 4318 },
  "dashboard": { "host": "127.0.0.1", "port": 3000 },
  "database": { "path": ".blazo/blazo.db" },
  "detection": {
    "longRunningMs": 30000,
    "repeatedToolCount": 3,
    "repeatedErrorCount": 3,
    "noActivityMs": 30000,
    "loopRepeatCount": 4
  }
}
```

### 5. 给自己的 agent 埋点

前提：agent 是 TypeScript 项目，能安装 `@blazo/sdk`。原文示例：

```ts
import { observe, span, log } from "@blazo/sdk";

await observe("research-agent", async () => {
  log("info", "agent started", { version: "0.1.0" });

  await span("llm.chat", () => callModel(prompt), { type: "llm" });
  await span("tool.search", () => search(query), { type: "tool" });
});
```

SDK API 要点：

| API | 说明 |
| --- | --- |
| `observe(name, fn, options?)` | 包裹 agent 入口，返回 `fn` 的结果，把 run 标记为 `success`/`error` 并记录异常 |
| `span(name, fn, options?)` | run 内的工作单元，`options.type`（`llm \| tool \| agent \| error \| session`）决定 dashboard 展示样式 |
| `log(level, message, metadata?)` | 挂到当前 run 的结构化日志 |
| `configure()` / `shutdown()` | 初始化并 flush OpenTelemetry provider；**退出前必须调用 `shutdown()`**，否则缓冲的 telemetry 不会导出 |

endpoint 解析顺序：`BLAZO_ENDPOINT` → `OTEL_EXPORTER_OTLP_ENDPOINT` → 默认 `http://127.0.0.1:4318`。

### 6. 命令行查看与下钻

```bash
blazo init                  # 写默认 blazo.config.json
blazo watch                 # 起 collector + dashboard，实时 TUI
blazo runs [--limit N]      # 列出最近 runs
blazo inspect <run-id>      # 完整报告：timeline、logs、errors、findings
```

开发期通过源码入口执行：`bun apps/cli/src/index.ts <command>`。

全局选项：`--collector <url>`（附加到指定 collector）、`--json`（`runs`/`inspect` 输出机器可读结果）、`--no-spawn-collector`（watch 时附加已有 collector）、`--no-dashboard`（watch 时不启动 dashboard）。

### 7.（可选）不装 SDK，直接对接已有 OTLP 数据

collector 提供标准端点，任何能发 OTLP/HTTP JSON 的东西都可以接入：

| Method | Endpoint | 说明 |
| --- | --- | --- |
| `POST` | `/v1/traces` | OTLP/HTTP trace 接入 |
| `POST` | `/v1/logs` | OTLP/HTTP log 接入 |
| `GET` | `/health` | 存活检查 |
| `GET` | `/api/runs` / `/api/runs/:id` | 最近 runs / run 详情 |
| `GET` | `/api/runs/:id/events` | 仅 spans |
| `GET` | `/api/errors` | 按签名分组的错误 |
| `GET` | `/api/logs?level=` | 最近日志，可按级别过滤 |
| `GET` | `/api/findings` | 最近 findings |
| `GET` | `/api/overview` | 概览页指标与列表 |
| `GET` | `/api/config` | 生效配置 |
| `GET` | `/api/stream` | SSE 流 |

SSE 事件类型：`run.started`、`span.completed`、`log.created`、`error.created`、`finding.created`、`run.completed`。

### 8. dashboard 六个页面（用于人工排查）

| 页面 | 路由 | 内容 |
| --- | --- | --- |
| Overview | `/` | 指标卡、活跃/慢/最近 runs、findings、高频错误 |
| Runs | `/runs` | id、agent、状态、时长、tokens、cost、开始时间 |
| Run Detail | `/runs/[id]` | 摘要、时间线、步骤检查器、日志、错误、findings |
| Errors | `/errors` | 按签名分组的错误，可点进受影响的 run |
| Logs | `/logs` | 最近日志，带级别过滤 |
| Settings | `/settings` | 当前本地生效配置 |

## 对应的研究问题

**1. 能力发现**：Blazo 本身不发现新能力，但它把原本只在日志里可见的执行模式变成 Findings——`repeated_tool`（同一工具被反复调用 N 次）、`possible_loop`（循环检测）、`no_activity`（长时间无事件）。这些是可以反过来提示"这个环节其实不该由 AI 做"或"这里缺了工具"的线索。原文只给了规则定义，没有给"用 findings 发现新任务"的案例，这一层是推断。

**2. 任务匹配**：原文明确适用边界——只提供 TypeScript SDK 一个集成，只做 OTLP/HTTP（端口 4318），不做 gRPC；明确**不做**评测、playground、提示词管理、数据集、agent 市场，也不做 SaaS/云。因此匹配的场景是：TypeScript 编写的、有多个工具调用和 LLM 调用的 agent，且痛点在"慢/卡/失败"的现场排查。`span` 的 `type` 字段（`llm | tool | agent | error | session`）是把步骤按类型区分开的关键，埋点时应当按这个分类如实标注。

**3. 条件供给**：接入需要提供的东西在原文档里很具体——(a) 一个可用的 Bun（或 Node 20+）运行环境；(b) 在 agent 代码里用 `observe`/`span`/`log` 包裹执行阶段；(c) endpoint 配置（`BLAZO_ENDPOINT` 或 `OTEL_EXPORTER_OTLP_ENDPOINT`，默认 127.0.0.1:4318）；(d) 退出前调用 `shutdown()` 保证数据被 flush；(e) 在 `blazo.config.json` 里按自己工作流的正常耗时/重复次数调 detection 阈值。

**4. 主动推进**：这是该工具与原研究问题贴合度最高的一点。检测规则在 **ingest 时**和**周期性扫描（默认每 5 秒）**两个时机自动评估，不需要人主动去查；命中后自动生成 Finding 并通过 SSE 推送到 dashboard（`finding.created` 事件）。`blazo watch` 还会在终端持续显示实时 TUI。即：由"新事件到达"和"时间间隔"两种触发条件驱动，持续产出结论。

**5. 效果验证**：数据模型直接支撑验证。Run 上带 `status, duration, tokens, cost`；Span 带 `type, name, status, duration, metadata`；Error 可按签名分组；Finding 带 `type, severity`。可以用 `blazo runs --json` / `blazo inspect <run-id> --json` 把结果接进自己的脚本做前后对比。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

**原文给出的实证性内容**（可直接照做）：完整安装与启动命令；SDK 三段 API 的示例代码与语义说明；`blazo.config.json` 的全部默认值与字段名；collector 的 11 个 HTTP 端点与 SSE 事件名；五条检测规则的触发条件与严重级别表；六个 dashboard 页面的路由与内容；五类数据实体（Run/Span/Log/Error/Finding）的字段；仓库目录结构；开发与 e2e 测试命令（含 `PLAYWRIGHT_CHROME_PATH`、Linux 下 `LD_LIBRARY_PATH` 的处理）。

**只是作者主张、未经第三方验证的部分**："install Blazo, run an agent, and immediately see its execution live"；"run appears in the dashboard within ~2s"；"no Redis, no cloud" 的简易性优势。原文未提供任何性能数据、案例研究或对比基准。

**明确的成熟度限制**：

- 仓库状态徽章自标 **MVP**；
- README 顶部的 dashboard 截图**明确标注为 "Target design — this is the direction Blazo is building toward, not the current UI"**，即当前 UI 可能与截图不一致，六个页面的具体呈现需实际跑起来才能确认；
- 38 stars，社区验证不足；
- **`LICENSE` 文件尚未添加**（原文 License 小节自述），商用前需确认授权；
- 只有 TypeScript 一个集成，Python/其他语言 agent 无法直接用 SDK 接入（理论上可走 OTLP 端点，但原文未演示）。

**适用条件**：本地/单机环境；Bun（或 Node 20+）可安装；agent 是 TypeScript 且能改代码加埋点；telemetry 走 OTLP/HTTP JSON 而非 gRPC。

## 怎么试、怎么验证

### 最小试用方式（约 30 分钟内可完成）

1. **先验证工具本身能跑**：`git clone` → `bun install` → `bun apps/cli/src/index.ts watch` → 另开终端 `bun run --cwd examples/basic-agent start`，确认 `http://localhost:3000` 上确实出现该 run，且不刷新页面即可看到更新。这一步只验链路，不提结论。
2. **接一个自己的真实 agent**：只包最小埋点——最外层一个 `observe("<你的agent名>", ...)`，把每个 LLM 调用包成 `span("...", ..., { type: "llm" })`，每个工具调用包成 `{ type: "tool" }`，别一开始就追求全覆盖。确认退出路径上调用了 `shutdown()`。
3. **验证检测规则真的会响**：把 `blazo.config.json` 里的 `repeatedToolCount` / `loopRepeatCount` 临时调小，跑一个会重复调工具的场景，看是否在 Findings 页/`/api/findings` 里出现对应条目。检测规则不触发的话，这套工具的价值就不成立。（阈值数值是建议的验证手段，不是原文给出的步骤。）
4. **接一次机器可读输出**：`blazo inspect <run-id> --json`，确认字段够不够你后续做自动化对比。

### 判断有没有改善的指标

- **接入成本**：从零到第一个 run 出现在 dashboard 的耗时；
- **可见延迟**：触发一次 run 到 dashboard 显示的时间（原文声称 ~2s，可实测）；
- **定位效率**：对一个已知失败的 run，从"知道它坏了"到"指出是哪一步坏了"所花的分钟数，与现在读 console/log 文件的方式对比；
- **稳定性信号**：同一工作流重复跑 N 次，`/api/errors` 里按签名分组的错误种数与出现次数是否下降；`repeated_tool`、`possible_loop` 类 finding 的数量是否下降；
- **成本/时长**：Runs 页的 `duration`、`tokens`、`cost` 在改动前后的分布变化（原文把这三个字段放在 run 列表页，说明是设计上的一等指标）。

### 建议的停止条件

如果第 3 步（检测规则）在真实 agent 上从不触发，或第 4 步的 `--json` 输出无法支撑你已有的脚本，就把它降级为 `study` 层面的参考（"agent 可观测性应当记录 Run/Span/Log/Error/Finding 这五类实体"），不必继续投入接入成本。
