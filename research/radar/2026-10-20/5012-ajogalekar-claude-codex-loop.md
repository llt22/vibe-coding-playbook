# ajogalekar/claude-codex-loop

- 结论：**值得一试**。建议小范围试：把 claude-codex-loop 装成 Codex skill，用一个有明确可验证判据的长任务跑 5 轮以内，重点看它能否在无人盯盘时收敛且不误报成功；理由是原文给出了可直接照抄的安装命令、启动提示、配置字段与每轮核对/停止规则，但端到端可靠性只有模拟测试支撑，尚未在真实客户端上验证。
- 原文：https://github.com/ajogalekar/claude-codex-loop
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T16:43:16.838Z

## 是什么
一个可复用的 Codex skill，实现“Claude Code 执行 → Codex 每小时心跳审查 → 核对与验证 → 只发一条有边界的下一步提示 → 循环”的自治回路。每轮 Codex 对照最初目标与固定的成功判据，检查最新一轮的实际产出（依据 Claude 的回复与 artifacts）、是否推进原目标、每条判据有何证据，并复查此前的 claim 与未决 objection；只有全部判据记录为满足且无 blocking objection 才宣布成功。仓库含 SKILL.md（入口与 tick 流程）、scripts/control.py（无依赖持久状态控制器）、setup/protocol 参考、配置/评审/下一提示模板与隔离测试。

## 具体做法
1. 确认前提（缺一不可，仓库不负责安装）：macOS/Linux；Python 3.10+；桌面客户端提供“同会话定时调度”工具；支持可操作 Claude UI 的 computer use；已登录的 Claude Code 与 Codex 会话；本地主机与桌面应用保持运行。
2. 安装 skill 到客户端的 skill 目录（当前 `.agents/skills` 约定），从仓库根目录执行：
```bash
mkdir -p "$HOME/.agents/skills"
ln -s "$PWD" "$HOME/.agents/skills/claude-codex-loop"
```
部分客户端读取 `~/.codex/skills`，按客户端选目录；目标已存在时不要覆盖。Claude 侧不需要安装该 skill。
3. 在给 Codex 的起始提示里写清范围、目标、成功判据和停止条件（示例可直接改用，替换路径、会话与 claim）：
```
Use $claude-codex-loop for /work/my-calculation and my existing Claude Code
conversation "My calculation," session SESSION_ID. Review every hour and
automatically send follow-up prompts. Keep the work within this local project.

The goal is to produce a rigorous certificate for [precise claim]. Count success
only when Codex has checked the certificate against that claim and resolved all
blocking objections.

Stop after 20 follow-up prompts, 48 hours, or 3 consecutive reviews without
verified progress, whichever comes first.
```
4. 用配置模板分离三类设置：`goal`（要完成什么）、`success_criteria`（宣布成功前必须由证据确立什么）、`max_rounds`/`max_hours`/`max_no_progress_reviews`（未完成时的硬止损）。设置在运行开始时固定；修改原配置文件不会影响进行中的 run，要换设置就新开一次授权 run 并保留旧 ledger。
5. 让 Codex 记录范围与判据、接管当前计算、执行第一次 tick，并用可用工具建立同会话每小时计划。安装本身不启动任何东西；常规轮次无需再逐次确认。
6. 每轮按核对清单执行：
   - 以 Claude 实际会话、已发送标记、最终回复三者对照 ledger，绝不用“文件没动”或交接中的 PASS 标签推断完成；
   - 对选定输入、代码、输出做哈希；评审后文件若变化，必须重新评审才能发下一条提示；
   - 每条评审用哈希指向前一条，claim 与 issue ID 全部结转，纠正/撤回/解决显式记录；
   - 每条成功判据都要有证据，存在 open blocking issue 就不得判成功；预算触顶记为“未完成停止”；
   - 触碰 UI 前先冻结提示文本并持久化 `submitting`；投递不确定时靠观察 marker 恢复，绝不盲目重放；
   - 用 lease 与本地原子写协调重叠或中断的 tick。
7. 运行状态放在 Claude 项目之外、skill 仓库之外的私有 supervisor 目录；不要把真实对话、标识符、提示、凭据或研究 artifacts 随包发布。
8. 结束处理：满足全部判据且无 blocking objection 时保存结论并暂停计划；触发任一上限则记录为未完成停止。

## 对应的研究问题
- 能力发现：把“定时复审、证据核对、claim/issue 结转、生成下一条有界提示”这类元工作整体交给模型，人不必持续盯盘；这是容易被忽略、但可以委托的一类监督工作。
- 任务匹配：执行端用 Claude Code（长时计算/产出），监督端用 Codex（审查+调度），前提是任务判据能写下来（原文例子是可形式核对的数学证书）。依赖桌面 UI 自动化与同会话定时工具，不适合无法定义判据或必须 headless/API 的场景。
- 条件供给：需要项目路径、会话名与 SESSION_ID、goal、success_criteria、三类上限、可操作 UI 的权限、已认证会话、持续运行的主机；每轮还依赖 artifacts 与哈希、ledger、发送 marker 作为反馈信号。
- 主动推进：这是核心机制——同会话每小时定时触发，按状态继续或停止，止损为 20 条跟进提示 / 48 小时 / 连续 3 次无已验证进展，取先到者。
- 效果验证：判据逐条要证据、blocking issue 未清不得判成功、哈希链式评审、claim/issue 连续性；但作者明确控制器只执行记账与停止规则，科学正确性仍由 Codex 判断，两个模型的意见不等于真值。

## 与已有做法的关系
清单中有 Claude Code（tool，adopt）：本做法把 Claude Code 当作执行端，在外层加一个 Codex 监督/调度器与持久 ledger，属于对 Claude Code 用法的补充而非替代。其余清单条目无相关。

## 证据与局限
原文给出的证据：方法源自一个真实跑过的 convex-hull 研究 workflow；通用控制器用隔离的模拟 UI 观测与临时项目验证，覆盖中断发送、并发所有权、漂移、陈旧证据、claim 连续性与停止行为；2026-10-17 在 macOS + Python 3.14.6 上本地 28 个测试通过、Codex skill validator 通过；GitHub Actions 已配置 macOS/Linux 的 Python 3.10/3.12，但尚未跑过；仓库 38 stars。
作者自述的局限（属声明或主张，非实测）：不是每个桌面客户端的端到端演示；测试从不发送真实 Claude 提示；无法靠两个模型意见确立真值，不保证 UI 投递恰好一次，不沙箱项目代码，不强制美元预算；漂移覆盖仅限配置监视的文件；不安装依赖工具、不提供 API runner、不绕过审批或登录。适用条件：有明确可验证判据、能接受每小时一次审查开销、愿意维护常开桌面环境的长任务。

## 怎么试、怎么验证
最小试用：选一个 1–2 小时能跑完、判据可写成检查清单的任务（如带验收测试的小计算或小证明），在测试机装好 skill，起始提示设 `max_rounds=5`、`max_hours=8`、`max_no_progress_reviews=2`，artifacts 保持小而可哈希。
对照基线：同一任务人工盯盘跑一遍，记录人工介入次数、完成时间、被发现的错误/objection 数。
观察指标：
- 误报成功次数（判成功但判据无证据）——应为 0，出现一次即说明验证环节不可靠；
- blocking objection 收敛速度（每轮关闭数），连续无进展轮次是否按规则触发停止；
- 文件被改动后是否被哈希发现并要求重新评审；
- 发送是否恰好一次（看 marker 与是否出现重复提示）；
- 人工介入次数、总耗时与费用相对基线的变化。
判断改善：人工介入显著下降、结论可追溯到证据链、无误报成功，才算改善；若频繁需要人工救场、UI 投递重复/丢失或出现“PASS 标签但证据不足”，则只保留其“外部定时审查 + ledger + 停止条件”的思路，不采用该实现。
