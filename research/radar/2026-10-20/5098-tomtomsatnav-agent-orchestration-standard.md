# tomtomsatnav/agent-orchestration-standard

- 结论：**值得一试**。建议小范围试用：先用 AOS-1 的文件状态、heartbeat 和校验器搭一个低风险项目的多代理看板与调度，再逐步接入 Claude Code 执行；理由是原文给出了可复制的命令、配置和验证流程，但项目仍是 macOS-first 的个人早期项目，且没有效果数据，高风险派发必须加人工审批门禁。
- 原文：https://github.com/tomtomsatnav/agent-orchestration-standard
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T22:56:22.804Z

## 是什么
AOS-1 是一个与运行时无关的最小契约，用文件保存 Goal、Task、Agent、Heartbeat 和追加事件日志，让周期性 Heartbeat 重新评估目标、回收停滞任务、规划并派发 ready Task、执行预算，直到目标完成、阻塞或取消。仓库包含规范、JSON Schema、零依赖一致性校验器、参考 server、看板和 heartbeat runner；另有 Claude Code 会话的本地只读实时监控插件，展示项目图、agent 工具流、token、运行时间、文件冲突、错误、告警和回放。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. 准备参考实现并跑通校验。前提：Node 18+，无需安装依赖；在仓库目录执行。
```sh
node server.mjs                       # dashboard + API at http://127.0.0.1:4317
node conformance/validate.mjs         # validate ./state against schemas and the spec's MUSTs
node conformance/validate.mjs path/to/state
node conformance/validate.mjs --selftest
```
校验器通过退出 0，不通过退出 1，并打印 `FAIL: <file>: <message>`；stale heartbeat 等 warning 不影响退出码。

2. 按文件状态组织一个目标。前提：先读 SPEC.md 和 schemas/；state 目录至少包含 goal.json、tasks.json、agents.json、heartbeat.json、events.ndjson。每个 Task 必须有非空 output_contract 和至少一个 acceptance 检查；Task id 唯一，depends_on 必须存在且无环；Goal 必须有 budget；assignee/current_task/goal_id 引用必须能解析；attempts 不超过 max_attempts；events.ndjson 每行一个 JSON，seq 严格递增。用上一步的 validate.mjs 校验。

3. 配置 heartbeat 派发命令。前提：命令能由 shell 启动；键名和可用变量以 heartbeat/config.json 和 runner 头注释为准。
```json
{
  "interval_s": 60,
  "dispatch_command": "claude -p \"$AOS_TASK_PROMPT\""
}
```
可以把 dispatch_command 换成任何 shell 能启动的东西：Claude CLI、脚本或 HTTP client。这是接入真实 agent runtime 的唯一位置。SPEC 第 7 节要求：会部署、发消息、花钱或删除东西的命令，必须由记录为 human.* Event 的人工批准来门禁。建议先用只打印/只生成草稿的脚本验证状态流转，再换成真实执行命令。

4. 把 server 和 heartbeat 作为长驻进程运行。前提：heartbeat 文件的 ts 是存活信号；runner 崩溃会先显示 late 再显示 dead。快速方式：
```sh
cd /path/to/agent-orchestration-standard
nohup node server.mjs > server.log 2>&1 &
```
持久方式（macOS）原文给了 launchd plist 模板；保存为 `~/Library/LaunchAgents/dev.aos.server.plist`，改好路径后：
```sh
launchctl load ~/Library/LaunchAgents/dev.aos.server.plist
```
heartbeat runner 若单独进程，用同一模板换 label 和入口；Linux 可用等价 systemd unit 并设 `Restart=always`。

5. 安装 Claude Code 实时看板插件。前提：Node 18+ 和 Claude Code CLI；项目自述为 macOS-first 的个人项目。
```sh
make install        # builds, registers + installs the local plugin, links `aos-dash`, builds the notifier, starts the monitor
make doctor         # checks the whole setup and tells you what to fix
make                # lists every target (test, build, start/stop, statusline, uninstall, ...)
```
然后打开 http://127.0.0.1:4318；monitor 随会话自动启动，设 `AOS_NO_AUTOSTART=1` 可禁用。新会话会拾取 hooks，已有会话需要 `/reload-plugins`。项目分组、告警和 stuck/errored 规则在 monitor 的 `live/config.json` 调整。

6. 用看板/终端/MCP 做观察和复盘。前提：monitor 只绑定 127.0.0.1、只读、无写端点。看板显示 heart -> project hubs -> agents 图、每个 agent 的当前工具、工具流、token、运行时间、模型、文件冲突、错误和告警；`aos-dash --once` 可出终端快照；MCP server 只读查询 monitor；`?debug=1` 打开屏上记录器。数据删除路径：`~/.claude/plugins/data/aos-dashboard-aos-local/live`（或你的 `AOS_LIVE_DIR`）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
1. 能力发现：原文显示可把“围绕一个长期 Goal 的持续编排”交给系统：Heartbeat 定期重评估、回收停滞工作、规划、派发 ready Task、执行预算；看板还能监控 Claude Code 会话、子 agent、工具流、token、运行时间和冲突/错误。
2. 任务匹配：真实执行通过 dispatch_command 接入，任何 shell 能启动的 Claude CLI、脚本或 HTTP client 都行；看板显示每个 agent 的模型，并支持按模型设置 stuck 阈值。原文没有说明哪类模型最适合哪类任务。
3. 条件供给：需要 Node 18+、文件状态（goal/tasks/agents/heartbeat/events）、每个 Task 的 output_contract 和 acceptance、Task 依赖、Goal budget、可执行的 dispatch_command；Claude Code 插件还需要 Claude Code CLI 和 hooks。反馈来自 Web/终端看板、MCP、通知、状态行和 validator。高风险动作需要 human.* Event 审批。
4. 主动推进：Heartbeat 按 interval_s 周期运行，派发 ready Task、回收停滞任务并执行预算；heartbeat 的 ts 年龄决定 alive/late/dead。server 和 heartbeat 可做成常驻进程，macOS 用 launchd，Linux 可等价 systemd。
5. 效果验证：validator 检查 schema 和语义 MUST：Goal budget、output_contract、acceptance、id 唯一、依赖存在且无环、引用解析、attempts 不超限、events.seq 严格递增、heartbeat 存活一致性。看板提供 token、运行时间、模型、文件冲突、错误、告警和回放。原文没有给出业务结果或 ROI 指标。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
清单中相关条目只有 Claude Code（tool，adopt）。AOS-1 直接对接 Claude Code：hooks 写事件，dispatch_command 可用 `claude -p "$AOS_TASK_PROMPT"`，插件提供 Claude Code 会话的实时看板、终端、MCP 和通知。它把单会话使用扩展为多 agent/多项目编排、文件状态、heartbeat 调度和一致性校验；属于补充层，不是替代 Claude Code。清单中没有其他相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
- 证据：README 给出规范、JSON Schema、validator 和 selftest/fixtures、参考 server、heartbeat runner、Web/Terminal UI、MCP、notifier、make 目标、配置样例、launchd 样例和安全模型。命令和配置可直接照做。
- 数据/案例：截图展示“三个项目、19 个 agent”的合成演示数据，明确没有真实项目或路径；stars 33（输入指标）。没有给出成功率、成本节省、可靠性、规模上限或对照实验。
- 作者主张：隐私优先、布局无重叠、粒子流自适应、主题对比度等，部分由自动化测试覆盖，但未给独立验证。项目状态为个人项目、macOS-first；Linux 仅说可用 systemd 等价，未给 unit。validator 只能结构性检查 append-only（seq 单调、行可解析），不能检查历史写入，追加写入靠 writer 自律。heartbeat runner 的具体入口 README 未列出，需查仓库。高风险命令的人工审批是规范要求，不是自动保证。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
最小试用：选一个低风险、边界清楚的项目，建立一个小 state（一个 Goal、少量有 output_contract 和 acceptance 的 Task、一个或少数 agent），先只用 monitor 只读观察，再让 dispatch_command 指向只打印/生成草稿的脚本跑心跳，最后才接 `claude -p`。每次改 state 后运行：
```sh
node conformance/validate.mjs path/to/state
```
判断改善：
- 合规性：validator 连续退出 0；`--selftest` 能抓住负例；heartbeat 在试用期不出现 late/dead；无依赖环、无引用解析失败、attempts 不超 max_attempts。
- 运行质量：看板中 errored agent 数、file conflict 数、stuck 数、人工干预次数、每任务 token 与 run time、重试次数；回放抽查是否有未审批的高风险动作。
- 结果质量：每个 Task 的 acceptance 通过率、返工率、从创建到验收的周期时间；与同类的单 Claude Code 会话/人工基线对比。原文没有给目标阈值，需在试用前自定并记录。若只看板不改善验收通过率或降低人工干预，就退回只读监控或 study。
