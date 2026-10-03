# hamzafer/claude-code-mods

- 结论：**值得一试**。建议在受控项目里小范围试装 mission-control（配合 token-weather、按需 blast-radius），用实时视图观察 agent 读了哪些文件、写了什么、上下文还剩多少，并在危险命令前设一道闸；理由是 README 给出了可直接照抄的安装命令、快捷键和版本要求，属于可执行流程，但全部依据仅为该 README，无实测数据，且部分视图依赖特定 Claude Code 版本与 macOS/Chrome 环境。
- 原文：https://github.com/hamzafer/claude-code-mods
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-03T17:59:42.714Z

## 是什么

`hamzafer/claude-code-mods` 是一个 Claude Code 插件（mods）集合，MIT 许可，37 stars。核心能力是给 Claude Code 会话加上实时 UI 和 hook：把每个子 agent、每次工具调用、每个被读写的文件画在聊天旁边的面板里。README 的原话定位是 “See what your agent is reading and writing, live.”

主力插件是 **mission-control**：蓝色表示 agent 正在读某文件，橙色表示正在写，绿色表示完成并附一行变更说明；`w` 看 agent 和全部工具调用，`c` 看带 import 箭头的代码地图。其余插件分三类：

- 观察类：token-weather（上下文占用，从 Clear 到 “Compact soon”，外加 prompt 缓存倒计时）、where-am-i（`/where`：目标、当前在做什么、在等你什么、下一步）、next-steps（每轮给 2–3 个可能的下一句提示，按 `1` `2` `3` 起草，`0` 隐藏）、usage-meter（5 小时/7 天额度、重置倒计时、本会话成本）、agent-radar（`/radar`，每个运行中子 agent 一行）、browser-lanes（`/browser`）、replay-theater（`/replay`，按 diff 逐步回放上一轮编辑）、md-preview（`/md`，前后并排渲染 Markdown）。
- 防护类：blast-radius，拦截 `rm -r`、force push、migration，先展示将要删掉什么，超时无人确认就取消。
- 作者个人配置（README 明确说“fork and adapt”）：glance（`/glance`，会议/PR/Linear/Slack，需 `gh` 和 Google Calendar、Linear、Slack 连接器）、merge-gate（`/gate`，CI 全绿且 Codex review 过一次之前挡住 `gh pr merge`，需 `gh` 和 Codex CLI）、rulebook-guard（写作与 git 规则，如改写 em dash、`--amend` 前先问）、session-saver（`/park [note]`，需 unpause）。
- 娱乐（opt-in）：reels、snake。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Claude Code 2.1.287+。Code 视图另外需要 macOS、Google Chrome，以及能显示图片的终端（Ghostty、kitty、iTerm2）；Who 视图（`w`）在任何环境都可用。

1. 安装 mission-control。在终端执行：

```sh
claude plugin marketplace add hamzafer/claude-code-mods
claude plugin install mission-control@claude-code-mods
```

2. 重启 Claude Code，然后输入 `/mission` 打开面板；输入 `/mission code` 直接打开代码地图；按 `q` 关闭。

3. 在面板里按 `w` 查看 agents 和每一次工具调用（实时）；按 `c` 查看代码地图及 import 箭头。

4. 用颜色判断状态：**蓝色**=agent 正在读文件，**橙色**=正在写，**绿色**=完成，并附一行说明改了什么。

5. 装其他插件：同样两条命令，把插件名替换掉 `mission-control`，例如：

```sh
claude plugin marketplace add hamzafer/claude-code-mods
claude plugin install token-weather@claude-code-mods
```

6. 不安装、临时试某一个插件：

```sh
 git clone https://github.com/hamzafer/claude-code-mods && cd claude-code-mods
claude --plugin-dir mods/token-weather
```

7. 建议同时装的观察类插件及其命令：`/where`（where-am-i）、`/radar`（agent-radar）、`/browser`（browser-lanes）、`/replay`（replay-theater）、`/md`（md-preview）；next-steps 用 `1` `2` `3` 键起草下一句提示、`0` 隐藏。token-weather 与 usage-meter 没有列出命令。

8. 防护：装上 blast-radius 后，遇到 `rm -r`、force push、migration 时插件会先展示影响范围并等待确认，超时未回应则取消——适合在真实仓库里当兜底闸门。

9. 个人配置类插件（glance、merge-gate、rulebook-guard、session-saver）按 README 说法是围绕作者自己的工具和规则搭的，用前先 fork 改规则；merge-gate 依赖 `gh` 和 Codex CLI，README 提示 review 跑在一个固定模型上，需要改成自己的。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：只间接相关。mission-control 把每次工具调用和子 agent 画出来，能让人看到 agent 实际在被派去做哪些动作（读、写、并发子 agent），next-steps 会主动给出 2–3 个可能的下一句提示。原文没有讲“哪些工作可以交给 AI”的清单，这一条只能作为观察手段而非发现方法。
- **任务匹配**：基本没有依据。README 没有讨论什么任务配什么模型；唯一接近的是 merge-gate 强制“CI 绿 + Codex review 一次”的组合把关。
- **条件供给**：直接相关。token-weather 显示上下文填充度（Clear → Compact soon）和 prompt 缓存倒计时，用来决定何时补/换上下文；where-am-i 明确列出“waiting on you”和下一步，等于告诉你缺哪条信息或哪个许可；blast-radius 把权限确认前置成一次性闸门。
- **主动推进**：部分相关，形态是事件触发的守卫而非长时自治。blast-radius 在危险命令触发时介入、超时自动取消；merge-gate 在 `gh pr merge` 被调用时挡住直到 CI 绿且 review 完成；session-saver 的 `/park [note]` 保存进度并在恢复时展示。
- **效果验证**：直接相关但只到“可看”。mission-control 的绿色态给出一行变更说明，replay-theater 按 diff 逐步回放上一轮编辑，md-preview 前后并排对比 Markdown。README 没有给出任何量化验证指标或对照数据。

## 与已有做法的关系

- **Claude Code**（tool，adopt）：这些 mods 是 Claude Code 的插件层，安装命令走 `claude plugin marketplace add` / `claude plugin install`，会直接改变现有 Claude Code 会话的可见性和守卫行为，属于对已采用工具的增强而非替代。
- **Claude Code Mods**（tool，study）：本仓库看起来正是该条目的具体来源，README 给出了可照抄的安装命令、快捷键、版本与平台前提，足以把该条目从“研读思路”推到“可小范围试”。
- **Cursor**（watch）：本条目与之无关；README 只在末尾提到作者更早的项目 cursor-commands（600+ stars）。

## 证据与局限

- 提供的材料只有仓库 README（`docs/mods.md`、`docs/demo.md`、GIF 与视频均未包含），因此以下判断全部基于 README 自述。
- 可核对的“硬信息”很少：MIT 许可、CI badge、37 stars、一张 mission-control 4x 演示图（描述为“两个子 agent + 一个 logout 功能落在四个文件上”）、作者自述早期项目 cursor-commands 有 600+ stars。除此之外没有任何基准、耗时、token 节省或用户反馈数据。
- 属于作者主张而非验证结论的：颜色语义的准确性、token-weather “Compact soon” 阈值的合理性、blast-radius 真能拦住全部危险命令、next-steps 建议的质量。
- 明确的适用条件：需要 Claude Code 2.1.287+（版本号本身无法从材料中验证）；Code 视图限 macOS + Chrome + 支持图片的终端，Linux/Windows 或普通终端只能用到 Who 视图；glance 需 `gh` 与 Google Calendar/Linear/Slack 连接器；merge-gate 需 `gh` 与 Codex CLI 且 review 模型写死；session-saver 依赖外部项目 unpause。
- “My setup” 一类插件是作者按自己规则写的，README 自己都要求 fork 后改规则，直接照用会引入别人的写作/git 约束。
- 稳定性、对上游版本升级的兼容性、多插件同开时的性能开销，README 都没有交代。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 在一个非关键的 git 仓库里按上面第 1、5 步安装 `mission-control` 和 `token-weather`（先不装 “My setup” 类插件）。
2. 派一个会改 3–5 个文件、且会拉起至少一个子 agent 的任务（例如按演示场景做一个 logout 功能）。
3. 全程用 `w` 看工具调用、`c` 看代码地图，记录是否出现“读了不该读的文件”“写到预期外的文件”以及你是在第几步发现的。
4. 单独做一次 blast-radius 演练：在一个含可丢弃文件的目录里让 agent 执行 `rm -r`，确认它是否真的先展示影响范围、以及超时是否如描述般取消。
5. 只在确认上面两步有效后，再考虑 `/where`、`/replay`、`/md`、`/gate`。

**判断有没有改善的指标（试用前后各测一次同类任务）**

- 发现错误读写的时延：从“改错了文件”到“你发现”的轮数或分钟数。
- 上下文事故次数：因触发 compact 而丢失上下文的次数（用 token-weather 在 “Compact soon” 之前主动介入，看能否降到 0）。
- 你被阻塞的次数与时长：`/where` 中 “waiting on you” 出现的次数，以及从出现到你回应的间隔。
- 危险命令的拦截率：构造的 `rm -r` / force push / migration 场景中被拦下的比例（目标 100%，任何漏拦都说明这道闸不能用于真实仓库）。
- 成本对照：usage-meter 显示的 5 小时/7 天额度消耗与本会话成本，同类任务是否上升（若观察成本明显抬升而事故率没降，就退回不装）。

**退出条件**：如果 Code 视图在你的平台上根本打不开，或安装后会话不稳定、与现有插件冲突，就停在这一步，仅保留结论“需要 macOS + Chrome + 图片终端才可用”。
