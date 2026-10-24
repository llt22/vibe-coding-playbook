# Show HN: Corgi, a helpful {agent, terminal} multiplexer

- 结论：**继续观察**。先把 Corgi 当作“agent 状态可视化 + 后台常驻”的设计样本小范围试用半天，重点验证它的 needs you 提示是否准确、是否真能减少切换窗口的次数；原文只是落地页文案，没有安装步骤、配置和任何效果数据，不能直接写进手册。
- 原文：https://corgi.computer/
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-24T03:04:58.259Z

## 是什么

Corgi 是一个把“编码智能体会话”和“普通终端”放进同一个多路复用器（multiplexer）的工具，在 Hacker News 的 Show HN 上发布（43 points / 7 comments）。原文给它的定位是：像 tmux 一样让 agent 和进程常驻后台，但额外增加“agent aware”的状态层——每个 agent 被标成 ▶ working / ● needs you / ● finished（另一处写作 working / needs you / unread / clear）/ ○ idle，按 F1 汇总“谁需要你”，按 Ctrl-T 直接跳进对应会话。

原文明确提到的其他能力：

- 支持 Claude Code、Codex、Pi、OpenCode，并可直接使用你已有的账号
- token 用量视图（top for your tokens）、agent 活动追踪（悬停查看它做了什么）
- replay：一屏查看某个 agent 改过的所有文件
- worktrees 与 workspace 自动组织、每个 workspace 的实时资源占用
- 现代终端能力：⌘V 直接粘图片（在 SSH 下也可用，但原文注明 * Requires Ghostty Nightly）、可复制的链接、可查看图片
- “hackable”：`corgi --skill` 把 Corgi 的用法教给 agent；可从任意终端驱动 Corgi

需要注意：给出的材料只有这页宣传文案，没有文档、安装说明、CLI 参数表或价格，也没有任何使用案例与数据。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

重要前提：原文没有给出安装命令、配置文件格式或完整上手流程，下面只能列出“原文明确出现的操作面”，不能当作可照抄的完整流程。其中唯一出现的命令是 `corgi --skill`，原样保留；其余为按键与界面能力的说明。

1. 前提确认：原文未说明支持的操作系统与终端要求，只明确“图片粘贴（含 SSH 场景）需要 Ghostty Nightly”。如果你不能接受 Nightly 依赖，就应先跳过该功能，再评估其他功能。
2. 安装与启动：原文只有一句 “corgi and you’re in.”，没有给出安装命令。要获取安装方式，需另行查看该站点或仓库（材料中无）。
3. 复用现有账号：原文说 “Use your existing accounts. All of them.”，即不用为 Claude Code / Codex / Pi / OpenCode 另建账号，直接沿用已登录的凭证。
4. 新建标签页与 agent：界面提供 “new tab” 与 “agent” 入口（原文为 UI 文案，没有具体命令）。
5. 用状态栏做注意力路由：把每个 agent 的状态看作一个看板——▶ working 时不要打扰，● needs you 时处理，● finished / unread / clear 时收尾，○ idle 时复用或关闭。
6. 用 F1 做汇总回顾：原文为 “F1 to catch up”，用来一次性查看所有 agent 状态，而不是逐个窗口查看。
7. 用 Ctrl-T 切换进具体工作：“Ctrl-T to jump into work, new or old.”
8. 用 Ctrl-Shift-T 恢复误关的标签页（“Undo tab closes with Ctrl-Shift-T”）。
9. 查看 agent 行为与花费：悬停 agent 查看它做了什么（activity tracking）；用 token 视图（“top for your tokens”）归因消耗。
10. 用 worktrees / workspace 做隔离：原文称会“organizes your workspaces for you”，可按 workspace 查看实时资源占用。原文没有给出 worktree 的创建命令或目录约定。
11. 用 replay 做验收：点 ↻ 后“Every file it touched, in one scroll.”，在一个视图里检查改动范围。
12. 让 agent 学会用 Corgi（原文唯一给出的命令）：

```
corgi --skill
```

13. 后台常驻：原文明确 “Like tmux, your agents and processes keep running in the background.”，关掉界面不等于结束进程。
14. SSH 场景：原文主张在慢速链路下 “Corgi keeps pace”，图片粘贴用 ⌘V，但前提仍是 Ghostty Nightly。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文提供了一个具体的“还没想到交给工具”的候选能力——同时看住多个 agent 的状态，并由工具汇总出“谁需要你”。但原文只做功能声明，没有给出任何“因此多做成了什么”的案例。
- **任务匹配**：原文列出兼容 Claude Code、Codex、Pi、OpenCode，说明同一界面可以混跑不同 agent；但没有说明哪类任务适合哪个模型，也未给切换策略。
- **条件供给**：这是原文信息最集中的一条。要让人放手并行，原文认为需要提供：后台常驻的进程（不因关界面而中断）、每个 agent 的显式状态、活动与 token 记录、文件改动 replay、worktree / workspace 隔离、以及用 `corgi --skill` 把工具用法告知 agent。权限、审批与沙箱方面原文完全未提。
- **主动推进**：原文有“状态触发人的注意力”这一半（needs you 才打扰、F1 汇总、后台持续运行），但没有“时间/事件触发 agent 自动继续干活”的机制描述。也就是说，它推进的是“人机交接”，不是“任务自走”。
- **效果验证**：原文给出的可观测项只有 token 用量、agent 活动记录、逐文件改动 replay、每 workspace 资源占用。这些是“过程可观测”，原文没有任何关于结果是否改善的指标、对照或数据。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Herdr（try）**：与 Corgi 同类，都是 agent/terminal 型多路复用器；原文结尾也把 Corgi 与 tmux、Herdr、cmux 并列，但未给出任何对比结论。两者在手册里应作为同一类方案做二选一或互补评估，而不是各写一套。
- **Claude Code（adopt）**：Corgi 明确把 Claude Code 列为可托管的 agent 之一，因此二者是宿主与被托管的关系；已有 Claude Code 的做法可以继续沿用，Corgi 只替换“外层调度界面”。
- **OpenCode（watch）**：同样出现在 Corgi 的支持列表中，属于被托管方；双方都还处于需要观察的阶段，组合使用的价值尚不明确。
- 清单中没有关于“agent 状态可视化 / 注意力路由”的独立条目，这是 Corgi 材料里唯一可能补进手册的新意。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- 原文没有提供任何数字、benchmark、用户案例或截图证据。所有表述都是作者主张：如 “keeps watch”、“clever corgi”、“Corgi keeps pace”、“Organizes your workspaces for you”。
- 唯一的外部件是社区信号：43 points、7 comments，属于关注度不高，不能当作验证。
- 材料是落地页文案，缺少安装步骤、配置项、CLI 完整参数、平台支持、许可与价格。因此无法判断上手成本与可复现性。
- 明显不稳定依赖：图片粘贴（含 SSH）功能标注 “* Requires Ghostty Nightly”，适用条件受限，不宜写入稳定流程。
- 支持列表（Claude Code / Codex / Pi / OpenCode）来自自家文案，未经验证；“Use your existing accounts. All of them.” 也未说明凭证如何被读取或隔离，存在权限与安全上的未知。
- 因此本材料只能支撑“设计方向值得看”，不能支撑“工具可放心采用”。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用（半天，不改变现有主力工具）：

1. 选一个有真实交付物的小任务，例如给同一个仓库并行派 3 个 agent：一个修 bug、一个补测试、一个跑 dev server。
2. 先用你现在的做法（多终端窗口 + 手动轮询）跑一遍，记录下面的基线指标。
3. 再用 Corgi 承载同样的三个会话跑一遍（先自行确认安装来源与 Ghostty Nightly 依赖是否可接受——材料中无安装信息）。
4. 全程观察 needs you 标记是否与“实际真的需要人”一致。

判断改善的指标：

- 从 agent 需要人介入，到你实际察觉的中位延迟（对比手动切窗口轮询）。
- 单位时间内人工切换窗口 / 标签的次数。
- 上下文重复交代次数、误关会话导致的工作丢失次数（含 Ctrl-Shift-T 挽回次数）。
- needs you 的误报与漏报计数——这是该工具的核心价值，只要误报多，状态栏就会退化成噪音。
- 单任务 token 消耗（用其 token 视图），确认并行没有让成本失控。
- 长任务存活率：关掉界面后进程是否真的继续运行。

判定规则：若“察觉延迟”和“切换次数”明显下降、needs you 漏报接近零且 token 不变差，则即使最终不用这个工具，也应把“working / needs you / finished + 汇总键 + 常驻后台”这套状态模型提炼进手册；任一项不达标则仅保留为观察对象。
