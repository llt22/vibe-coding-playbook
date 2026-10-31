# muaaz9329/cheap-ag

- 结论：**值得一试**。可以在有一个中等规模任务、并且已有可运行测试套件的项目里小范围试：用 npx cheap-agent 接入 Claude Code，让 Claude 只负责规划、廉价模型负责写码、测试充当裁判；理由是该仓库 README 给出了完整的安装、授权、配置和回退流程，并且用测试结果作为唯一验收标准，但所有效果数据均为作者自报，且在最难任务和极小任务上没有收益甚至略有倒退。
- 原文：https://github.com/muaaz9329/cheap-ag
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-31T06:18:18.617Z

## 是什么

Cheap Agent（npm 包名 `cheap-agent`）是一个 Claude Code 的插件/MCP 扩展，用来把“贵模型规划、廉价模型写码、测试把关”这一分工自动化。原话定位是“Your Opus is a principal engineer. Stop paying it to type.”：Opus 只写简短任务并做决策，廉价模型（DeepSeek / OpenRouter / OpenCode Go 上的模型）在项目的独立副本里写代码，并且必须先写一个失败的测试、再改到测试通过；Cheap Agent 自己运行测试，只有通过的结果才会以未提交（uncommitted）的形式落回项目；廉价模型做不完时默认由 Sonnet 兜底，而不是让 Opus 重做。项目 MIT 许可，作者自称 66 stars 级别的小项目，Windows 支持为 beta。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提条件（原文明确列出）**：
- 已安装 [Claude Code](https://claude.com/claude-code)
- Node.js 20+
- 一个充值了几美元的 API key，来自 OpenRouter / DeepSeek / OpenCode Go（原文：几美元够几百个任务）
- 支持 macOS 和 Linux；Windows 为 beta，CI 测过但无真实用户验证，且需要 Git for Windows（Git Bash）

**步骤 1：让 Claude Code 代为安装（最省事路径）**
把下面这段原样贴进 Claude Code：

```text
Set up Cheap Agent (npm: cheap-agent) for me.
1. Ask me: which provider (OpenRouter recommended, DeepSeek or OpenCode Go), and which
   models (balanced is the default; cheapest, strongest, or my own provider/model).
2. Check that node is 20+ and the claude CLI is installed.
3. If I picked my own model, save {"models":{"implement":"<model>"}} in
   ~/.config/cheapag/config.json, keeping what else is there.
4. Give me the command to run in my terminal: npx cheap-agent login --preset <my choice,
   or custom>, and which number to pick for my provider (1 OpenCode Go, 2 OpenRouter,
   3 DeepSeek). I run it and type my API key there. Never ask for my key.
5. When I say done, check `claude mcp list` shows cheapag, then tell me to run
   /cheapag:allow in a new Claude Code session in my project.
```

**步骤 2：或自己手动安装**
前提同上；在终端执行：

```bash
npx cheap-agent
```

按提示选 provider（不确定就选 OpenRouter），模型直接回车用推荐值，粘贴 API key。它会验证 key 可用，然后把自身注册进 Claude Code（对所有项目生效）。

**步骤 3：在每个项目里授权一次**
在项目中新开一个 Claude Code 会话，执行：

```
/cheapag:allow
```

这是把该项目代码发送给廉价模型的明确授权，同时会显示哪些模型会看到代码。未执行此命令前不会外发代码。

**步骤 4（可选）：项目级配置**
在项目根放一个 `cheapag.json`：

| 设置 | 默认值 | 作用 |
|---|---|---|
| `takeover` | `"sonnet"` | 廉价模型做不完的步骤由谁接手：Sonnet 助手，或 `"self"`（即 Opus 自己做，上限 15 次工具调用） |
| `limits.max_turns` | `25` | 廉价模型每一步最多可用轮数 |
| `models` | 来自安装时的选择 | 使用哪些廉价模型；可用 `npx cheap-agent login --preset strongest` 切换 |

**步骤 5：照平常方式提需求**
像以前一样让 Claude 改代码即可，Claude 会把代码改动交给廉价模型。常用命令：

| 命令 | 作用 |
|---|---|
| `/cheapag:allow` | 授权本项目代码发给廉价模型，每个项目一次 |
| `/cheapag:status` | 查看近期任务和廉价模型已花费金额 |
| `/cheapag:hook on` | 强制 Claude 必须把代码改动交给廉价模型，不许自己动手 |
| `/cheapag:clean` | 清理旧的任务目录 |

**步骤 6：人工审 diff 并自行提交**
工具从不 commit 或 push，改动以未提交形式落地，由你审阅 diff 后决定是否提交。

**步骤 7：更新与卸载（原文给出）**

```bash
npx cheap-agent@latest
```

```bash
claude plugin uninstall cheapag@cheapag
```

```bash
claude mcp remove -s user cheapag
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**
原文的主张是把这些活从贵模型手里拿回来交给半美分模型：写样板代码、写测试（案例中测试数从 33 增加到 38）、修真实仓库里的 bug（SWE-bench Verified 上 9 个最难任务里解决 6 个）、跨多文件的重构（作者用它实现 Windows 原生支持，36 个文件、+753/−278 行、30 个 job）。边界也被写明：极小任务（几行代码、从零写一个小应用）没有可省的空间；最难的一档 bug 上 6/9 对 7/9，反而略差。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
- 模型分工：贵模型（Opus）只写“简短任务”并做决策与诊断；廉价模型执行编码；Sonnet 作为失败的兜底（`takeover` 默认 `"sonnet"`）。
- 可用 `--preset` 在 balanced（默认）/ cheapest / strongest / 自定义 provider+model 之间切换；自定义模型写入 `~/.config/cheapag/config.json` 的 `{"models":{"implement":"<model>"}}`。
- 工具与协作方式：git worktree 隔离副本 + 测试作裁判 + hook 阻止 Opus 自己动手。原文还解释为什么不让 Opus 复查每个通过的改动：那样 token 会变成三倍，而作者实测没抓到任何问题。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
- 信息：Opus 写出的“短任务”是廉价模型能干活的前提；原文 FAQ 明确说半美分模型单独用不行，配上书面任务、必须通过的测试和跑测试的裁判才行。
- 工具：Node 20+、Claude Code、API key、可运行的测试套件（这是整个机制成立的关键前提）。
- 权限：每个项目需 `/cheapag:allow` 明确授权代码外发，并展示哪些模型会看到代码；API key 存在本地凭据库，不进聊天。
- 反馈：测试结果由 Cheap Agent 自己运行，不采信模型自述；`/cheapag:status` 回传近期任务与花费。
- 约束：`limits.max_turns` 默认 25 限制廉价模型的步数；`/cheapag:hook on` 强制把改动交给廉价模型。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
只有弱证据：每步最多 25 轮的循环、测试失败触发 Sonnet 兜底、hook 阻止贵模型绕过流程。原文没有给出时间驱动、事件驱动或长时挂机连续执行的机制。

**5. 效果验证：怎样判断确实改善了结果**
- 机制层：先写失败的测试、修到通过，测试由 Cheap Agent 自己跑，只有通过的结果才落地。
- 度量层：`/cheapag:status` 给出近期任务与成本；作者用 Opus token 数、Opus 轮数、测试通过数、廉价模型花费作为对照指标。
- 人工把关：改动永远未提交，由人审 diff。

## 与已有做法的关系

清单中的相关条目：
- **Claude Code（adopt）**：Cheap Agent 不是替代 Claude Code，而是挂在它上面的扩展（以 MCP 形式注册，`claude mcp list` 可查）；它改变的是 Claude Code 内部“谁写代码”的分工，属于对已有 adopt 工具的增强用法。
- **DeepSeek（try）**：是 README 明确支持的三个 provider 之一（安装时选 3，或 `OPENROUTER`/OpenCode Go）。这里给出了一个比“直接对着 DeepSeek 聊天”更具体的用法：让它做被测试约束的实现工，而不是做规划。
- **OpenCode（watch）**：README 说明廉价模型的执行引擎是 OpenCode（Windows 已知问题里直接点名 `opencode.exe`），即本方案实际上把 OpenCode 当作后台执行器使用；这为 OpenCode 提供了一个可观察的实际用途场景。

## 证据与局限

**原文给出的数据/案例（均为作者自报，无第三方复核）**：
- demo 对比：同一提示下，纯 Claude Code 攀升到 233k Opus token，加 Cheap Agent 止于 132k，廉价模型花费 $0.007。
- 同一功能同一提示：纯 Claude Code 154k Opus token / 5 轮；加 Cheap Agent 57k / 2 轮（少 63%），廉价模型花费半美分，两者都通过全部测试。
- before/after 表格：“加月度预算 + CSV 导出 + 全量测试”这一需求，154k→57k token、5→2 轮、写码者变为廉价模型（$0.005）、测试 33→38 通过。
- SWE-bench Verified（官方 harness，Opus 5.5，同提示对照）：日常 7 个 bug 修复 1.6M→655k（少 59%），双方 7/7 解决；最难 9 个 3.0M→1.3M（少 55%），6/9 对 7/9，剩余由 Sonnet 助手完成。
- 自举案例：Windows 原生支持（36 文件、+753/−278）用 Cheap Agent 完成，30 个 job 共 $0.29，Sonnet 助手补做并读 OpenCode 源码定位两个 Windows 专属 bug，测试在 Linux 和 Windows 均通过。

**作者自己承认的局限**：
- 最难一档 bug 上略逊（6/9 对 7/9），作者补充纯 Opus 单次平均也在 6 左右。
- 极小任务没有收益（Opus 本来就快）。
- 只在“真实代码里的真实功能和真实修复”这段中间地带有效。
- Windows 为 beta：CI 测过但无真实用户验证；首次任务可能耗时约 2 分钟（OpenCode 自举）；引擎中途崩溃会留下 `opencode.exe` 进程；廉价模型在其项目副本里读不到 `node_modules` 这类依赖目录（测试仍可正常运行）。

**其它需要注意的条件与证据强度**：
- 所有性能数字都来自作者单方、单次运行的对照，没有说明样本量、重复次数与随机性控制；SWE-bench 数字未给可复现脚本。
- 收益高度依赖于“项目里有能跑、能覆盖改动的测试”。原文没有说明测试缺失或不充分时的退化行为。
- 代码会被发送给第三方 provider，合规敏感场景需先过审。
- 本次材料只有 README，未查看源码，无法核实 worktree 隔离、hook 阻止逻辑和凭据存储的实现细节。
- 原文写的是“Opus 5.5”，版本命名以原文为准，未做核实。

## 怎么试、怎么验证

**最小试用方式**：
1. 选一个**中等规模**的真实任务（一个新功能或一个真实 bug，跨几个文件，不是几行改动，也不是从零起项目），并确认项目现有测试能在本地跑通。
2. 先用纯 Claude Code 记录基线：Opus token 用量、轮数、最终测试通过数（Claude Code 自带用量显示，或用 `/cost` 类手段；至少记录轮数与改动文件数）。
3. 装好 Cheap Agent，在项目内执行一次 `/cheapag:allow`，保持默认 `takeover="sonnet"`、`limits.max_turns=25`。
4. 用**同一条提示词**重跑同类任务，记录同样的指标，并额外记录 `/cheapag:status` 里的廉价模型花费。
5. 开 `/cheapag:hook on` 再跑一轮，比较“允许 Claude 自己判断”与“强制交给廉价模型”的差别。
6. 先只在个人或非敏感仓库试，审 diff 后再提交；确认无问题再考虑在有合规审查的仓库使用。

**判断有没有改善的指标**：
- Opus token 数 / 轮数是否明显下降（作者样本为 −55% ~ −63%，可把它当上限参考而非预期值）。
- 测试是否仍然全绿、覆盖是否没有下降（案例中 33→38，测试数不应减少）。
- 廉价模型单任务成本与 Sonnet 兜底触发频率：兜底越频繁，说明任务拆分或任务选择有问题。
- 人工审 diff 的返工率：需要你手动修的比例上升即视为退化。
- 失败模式记录：廉价模型在哪类任务上做不完（对照原文“最难 bug 略差、极小任务无收益”的边界，看自己的场景落在哪一档）。
- 反向信号：若你的项目测试薄弱或缺失，直接判定为不适用——裁判缺席时这套机制的核心保证不存在。
