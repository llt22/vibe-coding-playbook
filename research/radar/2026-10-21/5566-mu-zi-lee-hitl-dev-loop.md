# mu-zi-lee/hitl-dev-loop

- 结论：**值得一试**。建议小范围试用：在一个低风险、已有测试命令的仓库按 README 的 init→new-task→dispatch→feedback→review→integrate→ship 跑一条真实小任务，重点看独立验证和 SHA 门禁是否减少返工；它给出了可复制的脚本、配置和流程，但依赖 Claude Code/Codex CLI 且证据主要是仓库自述与模拟测试，暂不宜直接 adopt。
- 原文：https://github.com/mu-zi-lee/hitl-dev-loop
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-21T06:09:02.968Z

## 是什么
`hitl-dev-loop` 是一个面向 Claude Code + 编码 Agent（默认 Codex CLI）的人机协作开发循环脚手架。Claude 作为主 Agent 负责理解需求、调研、拆解任务，编码 Agent 在独立 git worktree 中改代码，调度脚本负责任务状态、反馈送达、独立验证、审查/集成门禁和构建提醒；人负责体验产品、用大白话或截图反馈、决定方向和发布。README 明确说这不是无人监督的自动编程。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
前提：Claude Code、Codex CLI（或 Codex 桌面端自带 CLI）、git ≥ 2.31、bash、python3（或 jq）；可选 `gh`、git ≥ 2.38。以下命令来自 README。
1. 安装插件或复制技能。插件方式：
```
/plugin marketplace add mu-zi-lee/hitl-dev-loop
/plugin install hitl-dev-loop@hitl-dev-loop
```
或复制安装：
```bash
git clone https://github.com/mu-zi-lee/hitl-dev-loop
cp -r hitl-dev-loop/skills/hitl-dev-loop ~/.claude/skills/
cp hitl-dev-loop/PROTOCOL.md ~/.claude/skills/hitl-dev-loop/
cp hitl-dev-loop/agents/repo-maintainer.md ~/.claude/agents/
```
2. 在项目里启动 Claude Code，用 README 给出的启动话术让它先检查状态并只做最小改动：
```
用 hitl-dev-loop 的方式开发这个项目。先检查项目状态，告诉我需要做哪些最小改动。
```
3. 初始化仓库并配置验证命令。`init.sh` 每个仓库运行一次、可重复运行；验证命令写在 `.agent-loop/config.sh`：
```bash
S=~/.claude/skills/hitl-dev-loop/scripts
$S/init.sh
echo "AGENT_VERIFY_CMD='make test'" >> .agent-loop/config.sh
```
前提是已设置一个可独立运行的验证命令；README 说明不设置 `AGENT_VERIFY_CMD` 时任务会停在 `needs-review`。
4. 创建任务 worktree、分支、任务状态和任务说明，默认不开网络，可用 `--scope` 限定改动范围：
```bash
$S/new-task.sh reader-fonts --scope 'src/reader/*'
$EDITOR .agent-loop/briefs/reader-fonts.md
```
5. 派发并后台运行调度循环：
```bash
$S/dispatch.sh reader-fonts --detach
```
6. 给任务追加反馈；调度器只在一轮成功后才确认送达，失败会重发：
```bash
$S/feedback.sh reader-fonts "正文在 1280px 宽度下溢出"
```
7. 查看状态和单任务报告：
```bash
$S/status.sh
$S/report.sh reader-fonts
```
8. Claude 审查 diff 后记录审查结论（绑定 SHA）；`changes` 会转成反馈：
```bash
$S/review.sh reader-fonts approve
```
9. 集成：门禁检查后在集成 worktree 合并、再验证，失败自动回滚；冲突时停下并说明：
```bash
$S/integrate.sh reader-fonts
```
10. 只构建已验证的集成 SHA，并提醒人验收：
```bash
$S/ship.sh && $S/alert.sh "可以验收了"
```
11. 按需配置 `.agent-loop/config.sh`。README 列出的关键项包括：`AGENT_SHIP_CMD` 构建并安装产品以便验收（在集成 worktree 中运行，可用 `$SHIP_SHA`）；`AGENT_COMMITS` 默认 `scheduler`（Agent 不写 git 元数据），可改为 `agent`；`DEFAULT_NETWORK` 默认 `0`，单任务用 `--network` 开启；`MAX_PARALLEL`/`MAX_ROUNDS` 默认 3/15；`MAX_FAILS`/`MAX_VERIFY_FAILS` 默认 3/3；`ROUND_TIMEOUT`/`VERIFY_TIMEOUT` 默认 3600 秒；`TASK_TIME_BUDGET`/`TOKEN_BUDGET` 默认 0（不限）；`INTEGRATION_BRANCH` 默认 `codex/integration`。这些配置需要按项目实际命令和风险偏好填写。

## 对应的研究问题
- 能力发现：原文明确让 Claude 做需求理解、调研、任务拆解，编码 Agent 在 worktree 中改代码；调度器做验证、集成、构建；低成本的只读 `repo-maintainer` 子 Agent 整理 GitHub Issue/PR 并汇报需要决策的事项。
- 任务匹配：主 Agent 与编码 Agent 分工；默认适配 Codex CLI（`exec --json --output-schema`），实现同样接口可接其他编码 Agent；任务隔离在独立 git worktree；默认由调度器提交，避免沙箱写不了 git 索引；并发上限和文件重叠检测用于控制并行任务；只读子 Agent 走低成本路线。
- 条件供给：需要仓库内 `AGENTS.md`、`CLAUDE.md`、`TASKS.md`、`DECISIONS.md`、共用规则、任务说明模板、报告 JSON Schema；需要 `AGENT_VERIFY_CMD`、`AGENT_SHIP_CMD`；需要网络权限、额外可写目录、超时、熔断、预算、并发上限；反馈通过 `feedback.sh` 进入状态机，审查通过 `review.sh` 绑定 SHA。
- 主动推进：`dispatch.sh` 调用 `drive.sh` 调度循环，按任务状态推进：送达反馈（pending→inflight）、运行 Agent、读取结构化报告、判断是否 done、失败反馈继续、通过后验证；有轮数上限、失败熔断、超时和预算；`status.sh` 能识别进程已死的 stalled 任务；`alert.sh` 在人验收时重复提示。
- 效果验证：完成由调度器独立判定，不靠 Agent 自报；验证结果绑定当前 commit SHA；审查结论绑定 SHA；集成后再验证，失败自动回滚；`ship.sh` 只构建已验证的集成 SHA；测试用模拟 Codex 的 21 个场景，CI 在 ubuntu 和 macOS 运行。判断指标可用 `status.sh` 中的轮数、token、验证、审查、待送达反馈，以及验证失败/回滚/冲突次数。

## 与已有做法的关系
清单中相关条目只有 Claude Code（状态 adopt）。本线索不是替代 Claude Code，而是把 Claude Code 作为主 Agent，外接 Codex CLI 等编码 Agent 和调度脚本，补齐交接点、上下文供给、独立验证与集成门禁。清单中没有其他直接对应条目。

## 证据与局限
原文给出的是仓库 README：包含安装命令、脚本清单、配置表、使用示例、协议、模板和测试说明；测试为 21 个模拟 Codex 的自动化场景，CI 在 ubuntu 和 macOS 上运行；作者还列出在真实项目踩坑后的经验（部分在 codex-cli 0.162 实测）。局限：没有给出量化的效率或质量提升数据，没有独立第三方评测；很多可靠性描述是作者主张；强依赖 Claude Code、Codex CLI、bash、git、python3/jq，README 未提 Windows 支持；行为与 Codex CLI 版本相关，升级后需重验；需要人持续验收，不是无人监督自动编程；`alert.sh` 在 macOS 沙箱外运行才有声音。适用条件：macOS/Linux 类环境、愿意维护验证命令和任务说明、能把产品拆成可验证的小任务。

## 怎么试、怎么验证
建议最小试用：选一个低风险、已有测试命令的仓库，只开一个任务，`MAX_PARALLEL=1`，默认不开网络，设置一个快速但完整的 `AGENT_VERIFY_CMD`，用 `new-task.sh --scope` 限定小范围；按 `dispatch → feedback → status/report → review approve → integrate → ship` 跑完一条真实小需求。记录基线（同样需求手工做的时间、人工审查轮次、返工次数），再记录本流程的：从派发到 verified 的轮数和耗时、验证失败次数、审查打回次数、集成冲突/回滚次数、`status.sh` 显示的 token、人工介入次数、验收时发现的缺陷数。改善判断：在同样范围下，验证能稳定拦住问题、审查只需看小 diff、集成无需手工修冲突/回滚、人工介入集中在验收和方向决策，而不是反复补上下文或修 Agent 的坏改动；若轮数或人工时间高于手工基线且没有质量收益，则只保留其状态机、SHA 门禁和独立验证思路。
