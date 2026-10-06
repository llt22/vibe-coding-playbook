# Claude Code in the cloud: a field guide to cloud sessions

- 结论：**值得一试**。建议按文中步骤在 Claude Code 套餐中开通云端会话，先把边界清晰、需要独立验证的任务（如修 flaky test、更新 API 文档、结构化日志）以自包含工单+证明命令的方式并行跑起来，再决定是否推广；理由是原文给出了可直接复制的命令、环境配置、GitHub 接入与证据要求，但依赖套餐/组织权限且 routines/projects 等仍属 preview/beta。
- 原文：https://claude.dev/blog/claude-code-in-the-cloud/
- 来源：rss:claude.dev，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T17:34:17.849Z

## 是什么
Claude Code 云端会话是在 Anthropic 托管基础设施（或组织自托管环境）上运行的 Claude Code 会话。每个任务分配一台全新虚拟机，仓库克隆到新分支，环境预装好；可从 claude.ai/code、Claude 手机应用、Desktop、终端和 Slack 启动，并从浏览器、手机和 Desktop 跟进，完成后得到一个可开 PR 的分支。

与本地会话的关键差异：每任务独立 VM/独立分支/独立端口，不会互相改文件或抢端口；笔记本睡眠或断网后会话继续；GitHub token 不进入 VM，由代理持有，会话拿短期凭据且只能推自己的工作分支；仓库内的 CLAUDE.md、rules、skills、agents、commands 随仓库进入云端，个人 ~/.claude 留在本地；闲置 VM 会被回收，重开得到新 VM 但恢复对话。

套餐与权限：随 Pro、Max、Team、Enterprise 计划提供，无单独云机器费用，会话消耗计划用量；组织 owner 可能需要先开启云会话。不适用于 Console API key 或第三方 provider。

## 具体做法

1. 开通并跑通第一个云端任务。前提：有 Pro/Max/Team/Enterprise 且用 claude.ai 账号登录；组织可能需要 owner 开启。步骤（原文“Start in five minutes”）：
   1. 打开 claude.ai/code，或在 Claude Code 中运行 `/login` 并登录 claude.ai 账号。
   2. 连接 GitHub，并在仓库所属账号或组织安装 Claude GitHub App。
   3. 选择仓库和 Default 环境。
   4. 从 backlog 给 Claude 一个任务，并附上能证明完成的命令。
   5. 关掉标签页；之后从手机查看，最后在 claude.ai/code 审查 diff 并创建 pull request。

2. 连接 GitHub。前提：public repo 只需登录 GitHub；private repo 还需要在拥有它的账号或组织安装 Claude GitHub App；Auto-fix、GitHub 触发 routines 和 projects 也依赖 App。
   - 路径 A（推荐）：在 claude.ai/connect-github 连接 GitHub，然后在仓库所属账号或组织安装 Claude GitHub App；组织通常需要 owner 批准。
   - 路径 B（终端）：如果已用 `gh` CLI，在 Claude Code 中运行 `/web-setup`，把 gh token 发送到 Claude 账号。Team/Enterprise 需要 owner 先开启 Quick setup。
   - 路径 C（跳过 GitHub 的一次性做法）：在没有 GitHub remote 或未安装 App 的仓库里运行 `claude --cloud`，Claude Code 会上传仓库 bundle；只有 GitHub 连接对该仓库有 push 权限时才能推回。
   - 常见故障：private repo 不在选择器里，通常是 App 未安装在拥有它的账号/组织，或 App 的 Repository access 未包含它；报错说必须是组织 owner 才能链接，通常是组织阻止了 membership check（待批准的 App 权限请求、IP allow list 或 SAML SSO）；SAML 跳过后组织仓库缺失，要在 GitHub 的 Single sign-on to your organizations 步骤为每个组织点 Authorize，或之后在 GitHub 设置中授权 Claude 再重连；每个云端会话都认证失败，可能是组织使用 IP allowlisting，需要让支持豁免 Anthropic 托管服务。

3. 把任务写成自包含工单。前提：每个任务单独一个 session；沿文件边界切分并行任务。工单要写清：什么问题、完成定义、如何证明。原文示例提示词可直接复制：
```
claude --cloud "npm test fails maybe one run in four. Find the flaky test, fix the root cause in the code (not the test), and prove it by running the suite at least 30 times in a row."
claude --cloud "docs/API.md is out of date with src/server.js. Rewrite it so every endpoint, parameter, default and response shape matches the code. Start the server and run each curl example to check it."
claude --cloud "Make src/logger.js emit one JSON object per line, keep LOG_LEVEL, and log method, path, status and duration_ms as fields. Add a test for the logger."
```

4. 并行清理 backlog。前提：先 `git push` 本地提交，因为 `claude --cloud` 会从 GitHub 克隆你当前分支。示例：
```
claude --cloud "Fix the flaky test in auth.spec.ts"
claude --cloud "Update the API documentation"
claude --cloud "Refactor the logger to use structured output"
```
可同时开多个 session；项目（Pro/Max public beta）可用协调会话启动并追踪云会话，按 working、waiting on you、ready for review 分组。

5. 让会话自己证明修复。前提：环境里能跑测试/服务。flaky test 场景可要求跑 suite 200 次、bisect 50 个 commit 的回归、跑慢集成测试，或启动应用用 curl 打。前台命令默认 2 分钟超时（最多 10 分钟），之后在后台继续最多 30 分钟；可在环境变量里调整：
```
BASH_DEFAULT_TIMEOUT_MS
BASH_MAX_TIMEOUT_MS
```

6. 本地计划、云端构建、终端收尾。前提：较大改动先在对答便宜的地方把方案定下来。步骤：
```
claude --permission-mode plan
# ...agree on the plan, save it to docs/migration-plan.md, commit and push...
claude --cloud "Execute the migration plan in docs/migration-plan.md"
```
云端构建时终端可做别的；完成后拉回本地手工收尾：
```
claude --teleport # pick a cloud session
claude --teleport <session-id>
```
前提：同一仓库、工作树干净（会提示 stash）、分支已 push。Claude Code 内可用 `/teleport`（或 `/tp`），也可用 `/tasks` 然后 `t`。Desktop app 的 Open in 菜单可把本地会话送到云端。

7. 手机查看和追问。前提：Claude 手机应用 Code tab 连接同一批会话。手机适合问那些到键盘前就忘掉的问题。原文示例：给第四个 session 问 tidepool 如何预测潮汐、在时间窗口边缘可能如何出错；它跑代码验证答案并发现真实 bug。

8. 接管 CI 失败和 review 评论。前提：仓库安装 Claude GitHub App。在 claude.ai/code 的 CI bar 打开 Auto-fix；也可在终端 PR 分支运行 `/autofix-pr`，或在手机应用让 Claude watch PR，或把 PR URL 粘进 session。Claude 会推清晰修复并解释改了什么；模糊或架构问题会问你。review thread 的回复以你的 GitHub 用户名发布并标为 Claude Code。Claude 不会收到与 base 分支的 merge conflict 通知，需要让它 rebase；它的评论也可能触发 comment-driven automation（如 Atlantis）。

9. 用时间/事件触发工作。前提：routine（research preview）由保存的资源（prompt、repositories、connectors、environment）组成，每次 run 是一个 cloud session，由 trigger 启动。trigger 可以是 schedule（最快每小时）、对 routine endpoint 的 HTTP 调用，或 GitHub 事件（如 PR 打开、release）。可在 claude.ai/code/routines、Desktop app 或 CLI 里用 `/schedule` 创建。Routine 运行时没有审批提示，默认推送到 `claude/` 前缀分支。也可把 follow-up 排队进正在运行的 session：
```
claude -p "The integration tier is green now; rebase on main and push" --cloud <session-id>
```
还可以收藏预填 session 的 URL，例如：
```
claude.ai/code?prompt=Triage+the+newest+issues&repositories=acme-labs/tidepool
```

10. 运行不完全信任的代码。前提：贡献者 PR、新依赖安装脚本、刚 clone 的仓库等。云端 session 在一次性 VM 中运行，没有你的 SSH key、cloud CLI、浏览器配置，只有 session 级 GitHub 凭据，并可收窄网络。环境网络设为 None 最严格，或 Trusted（允许包 registry、GitHub 和主要云 SDK host）。即使 None，Claude Code 仍会向 Anthropic API 发请求，数据可能以此离开 VM；session 仍可推自己的分支；所有出站流量经过代理并记录 hostname。

11. 给 session 自检环境。前提：默认环境用 Trusted 网络、无变量、无 setup script，够大多数 JavaScript、Python、Go、Rust 仓库。
   - setup script 在 Claude Code 启动前以 root 运行，可用 apt install；必须 exit 0 否则 session 不启动；应在约 5 分钟内完成以便环境缓存；之后新 session 从带工具的 snapshot 启动。改脚本或 allowed hosts 会重建缓存，约每 7 天重建。
   - 项目级用 SessionStart hook：把 `npm install` 等放入仓库 `.claude/settings.json`，本地和云行为一致；只在云跑时检查 `CLAUDE_CODE_REMOTE`。Repository hooks 在单仓库 session 加载。
   - 服务按 session 启动：缓存只存文件，之前运行的进程不会保留；让 Claude 跑 `service postgresql start`，或放进 SessionStart hook。
   - 网络用能工作的最窄级别：Trusted 覆盖常见 registry；Custom 加私有 registry；Full 只在需要开放互联网时用；改动约 1 分钟到达运行中的 session。
   - secrets 不要放共享变量：环境变量对使用该环境的人可见；Pro/Max 上环境 API credentials 可在 VM 外把 key 附加到你指定 host 的请求，key 不放在变量里。
   - 命令写进 CLAUDE.md：个人 ~/.claude 不到云 VM；需要知道怎么跑集成测试，仓库必须写。

12. 养成降低返工的习惯。前提：按原文建议。
   - 一个任务一个 session；小而独立的 session 更好审查、更便宜丢弃。
   - 要求证据：点名证明完成的命令，先读 Claude 的 summary 再看 diff。
   - `claude --cloud` 前先 push：VM 从 GitHub 克隆，未 push 的 commit 到不了。
   - 长任务边做边 commit：闲置 VM 可能被回收。
   - 在 diff view 审查：inline comments 会批处理进下一条消息，Create PR 可开完整 PR、draft 或 GitHub compose 页。
   - Claude 工作时也可 steering：你发的消息会排队，也可撤回排队消息。
   - 共享 session：Team/Enterprise 可把 session 可见性设为 Team，让 reviewer 读到改动如何产生；云端 session 的 commit 带 Claude-Session trailer 链接回 transcript。
   - 注意限额：并行 session 并行消耗计划限额，五个 session 约以五倍速度消耗；routines 有每小时上限，projects 最多每天启动 200 个新 thread。

## 对应的研究问题
- 能力发现：原文列出七类适合云端会话的工作流，可作为“还没想到交给 AI”的候选：并行清理 backlog；让 AI 反复自证修复（跑 suite、bisect、慢集成测试、启动应用 curl）；本地计划-云端构建-终端收尾；手机提问并让它跑代码验证；接管 CI 失败和 review 评论；由 schedule/HTTP/GitHub 事件触发的 routine；在一次性 VM 中运行不完全信任的代码。原文案例还显示它会发现未要求修的真实 bug（潮汐时间窗口首尾样本未检查）。
- 任务匹配：适合独立 VM、独立分支、并行、长时运行、需要重复证明、需要隔离不可信代码的任务；不适合需要本地真实数据库、VPN 服务、GPU、手机模拟器、桌面硬件、秒级视觉循环，或组织启用 Zero Data Retention 的场景。模型本身原文未展开；工具与协作方式明确：`claude --cloud`、plan mode、`--teleport`、GitHub App、Auto-fix、routines、手机/Desktop/Slack/API/schedule。任务写法要自包含，沿文件边界切分，合并分支要有顺序，并预期一个 session 报告另一个 session 正在修的问题。
- 条件供给：需要 GitHub 登录与 App 安装（private repo 和 Auto-fix/触发/projects 必需）；仓库内 CLAUDE.md、rules、skills、agents、commands、`.claude/settings.json` SessionStart hook、`.mcp.json`；setup script、环境变量、网络级别、API credentials；不要共享 secrets。权限侧包括组织开启 cloud sessions、GitHub connector、Quick setup、owner 批准、IP allowlist、SAML SSO。反馈来自会话消息、review comments、Auto-fix、手机 watch PR。
- 主动推进：routines 可由 schedule（最快每小时）、HTTP 调用、GitHub 事件（PR 打开、release）触发，每次 run 是 cloud session，无审批提示，默认推 `claude/` 前缀分支；可把 follow-up 排队进运行中的 session；Auto-fix 监听 PR 的失败检查和 review 评论；手机可让 Claude watch PR；projects 协调会话启动并追踪云会话，按 working/waiting on you/ready for review 分组；可保存预填 prompt 与仓库的 URL。
- 效果验证：原文把“证明命令”作为任务定义的一部分。flaky test 要求至少跑 30 次，实际跑 40 次零失败；docs session 启动 server 并对每个 endpoint 跑 curl，发现 5 处文档与代码不一致；logger session 增加 5 个测试，并在提交时发现 suite 不干净，重跑 cache test 8 次、5 次失败，追踪到同一 race；手机 session 跑代码验证答案并发现边界 bug。验证信号包括测试重复运行失败率、curl 端到端通过、diff/PR 审查、Claude summary、`Claude-Session` trailer 链接 transcript。

## 与已有做法的关系
- 清单中直接相关的是 `Claude Code`（tool，adopt）：本文是其云端会话扩展，沿用本地 Claude Code 的会话、CLAUDE.md、权限模式、hooks、MCP 等，但把每任务放到独立 VM，并新增 GitHub App、`--teleport`、Auto-fix、routines、projects 等云端能力。
- `Claude Code Mods`（tool，study）：原文没有直接讨论 mods，只提到 rules、skills、agents、commands、`.claude/`、`.mcp.json`、CLAUDE.md、SessionStart hook。可视为同一仓库内配置生态，但本文没有给出 mods 的具体做法，不能据此更新 mods 条目。
- 除此之外，清单中没有其他相关条目。

## 证据与局限
- 原文证据：作者针对一个小型示例仓库 `tidepool`（Node API）跑了四个真实云端会话，文中 transcript、diff、timing 来自这些会话；仓库和截图中用户是虚构的，但工作、输出和数字来自会话。
- 并行证据：三个 session 在 16 秒内启动，分别跑 61、65、72 秒，第一个启动后 87 秒全部完成；重建仓库约占每次运行的三分之一到一半以上。flaky test session 找到 `TtlCache.get` 的 race，改为存 in-flight promise、失败时删 entry，并连续跑 `npm test` 40 次零失败。docs session 启动 server 并对每个 endpoint 跑 curl，发现五处错误（列出不存在的字段、记录了代码忽略的 `days` 参数、单位 feet 与 metres 不符、漏 `/next-high`、漏 error responses；另把 malformed `from=` 返回空列表且 200 记为 caveat）。logger session 写 JSON logger、改结构化字段、加 5 个测试；提交时一个测试失败，重跑 cache test 8 次、5 次失败，追踪到同一 race，提出同样修复但未改 cache，并在 summary 说明 suite 不干净。手机 session 跑代码检查答案，发现时间窗口首尾样本未被检查，漏掉窗口开始高水位，未改文件。
- 环境与限额数据：VM 约 4 vCPU、16 GB RAM、30 GB disk；前台命令默认 2 分钟超时、最多 10 分钟，之后后台最多 30 分钟；setup script 应约 5 分钟完成；缓存约每 7 天重建；routines schedule 最快每小时；projects 每天最多 200 个新 thread。Pro/Max 一次性 bonus credit 为 $100/$250，须在 Oct 7 前 claim，Nov 4 过期，不适用于 Projects 或 Routines。
- 局限：七种工作流和“大多数价值来自 Claude 运行命令”是作者建议，不是对照实验；样本仓库小、虚构，数字来自作者的四次会话，缺少第三方复现。适用条件包括：Pro/Max/Team/Enterprise 且 claude.ai 账号；组织可能需 owner 开启；private repos 需要 GitHub App；Zero Data Retention 会关闭云会话；self-hosted environments 为 Team/Enterprise beta；routines 和 projects 为 research preview；routines 无审批提示；共享环境变量可见；闲置 VM 会回收；并行 session 并行消耗计划限额；GitLab/Bitbucket 可上传 bundle 但不能推回；GitHub Enterprise Server 仅在 Team/Enterprise 支持；IP allowlisting 可能需要支持豁免。

## 怎么试、怎么验证
1. 最小试用：选一个非关键 GitHub 仓库和 1 个边界清晰的小任务（如修 flaky test、更新 API 文档、结构化 logger），按“Start in five minutes”开通。前提：确认套餐、GitHub App、本地提交已 push，环境里能跑证明命令。
2. 写工单：一句话问题 + 完成定义 + 证明命令。可直接套用原文提示词，例如要求“跑 suite 至少 30 次并证明零失败”。
3. 启动 2-3 个并行 session，沿文件边界切开；观察是否互不干扰、是否各自产出分支/PR。
4. 验证指标：
   - flaky test：重复运行失败率是否降到目标（如 0/40）；
   - 文档：启动 server 后每个 endpoint/参数/默认值/响应形状是否与 curl 结果一致；
   - logger：JSON 字段与测试是否通过；
   - 每个 session 的 summary 是否先给出证明命令输出；
   - diff/PR 人工审查接受率；
   - 与本地串行相比，是否减少等待、减少互相打扰、支持离开电脑后继续；
   - 计划用量消耗是否可接受（并行 session 成倍消耗）。
5. 冲突处理：先把一个分支 merge，再对下一个 session 发 follow-up：
```
claude -p "rebase on main and fix any conflicts" --cloud <session-id>
```
6. 停止条件：组织有 Zero Data Retention；任务必须访问本地真实数据库、VPN 服务、GPU、手机模拟器或桌面硬件；必须秒级视觉循环；或私有仓库/GitHub App 无法安装。此时回退本地会话。
