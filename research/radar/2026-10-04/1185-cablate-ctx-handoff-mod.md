# cablate/ctx-handoff-mod

- 结论：**值得一试**。可以直接照 README 的 Quick start 在单个 Claude Code 会话里小范围试：clone 后以 --plugin-dir 加载、跑 /handoff 验证状态，先用 /handoff dry 观察交接成本，再在长任务上启用自动交接与 distill。理由是原文给出了可复制的安装/配置/命令与明确的触发条件，但作者自己标注为 experimental、依赖早期 function-hooks API，且空闲缓存刷新等关键行为尚未实测，所以只建议试不建议直接采用。
- 原文：https://github.com/cablate/ctx-handoff-mod
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-04T10:45:53.371Z

## 是什么

ctx-handoff 是一个 Claude Code 的 mod（插件），面向在 1M 上下文模型 + Claude 订阅（1 小时 prompt cache）上跑长时间 Claude Code 会话的人，做三件事（只作用于主会话，子代理回合被忽略）：

1. **自动交接**：主会话停止且上下文达到阈值（默认 600k，或窗口的 80%，取较低者）时，用一次 fork 写交接摘要（并行做 distill），然后 `/clear` 并提交交接，新会话接着做。用户不需要敲任何命令。
2. **空闲保活 / away handoff**：空闲 55 分钟后 fork 一个极小请求刷新 prompt cache，最多 3 次（约 4 小时）；到第 4 个点保存 "away handoff" 而**不** clear（人不在，不替用户切换会话）。回来后第一条消息被暂扣，由用户选 `/handoff resume`（用交接开新会话）或 `/handoff continue`（留在老会话）。
3. **Distill（对话沉淀）**：在缓存还热时，用一个无工具的 fork 读对话，把值得保留的内容写成两类条目——**Memory**（偏好、项目当前状态、外部资源位置）和 **Rule**（可复用做法 + 出现次数；出现 2 次及以上的规则才注入新会话，按次数排序）。落到每个项目自己的 `ctx-handoff.md`（纯 Markdown，用户手改会被保留）。

作者自标 **experimental**，构建在 Claude Code 的 early-access function-hooks API 上，开发与测试版本为 2.1.287。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：需要一个带 function hooks（mods）的 Claude Code build；作者在 2.1.287 上开发测试。目标是 1M 上下文模型 + 1 小时 prompt cache 的订阅用户。

1. 克隆并首次加载（把 mod 放在 mods 目录下）：

```sh
git clone https://github.com/cablate/ctx-handoff-mod ~/.claude/mods/ctx-handoff
claude --plugin-dir ~/.claude/mods/ctx-handoff
```

2. 在会话里运行 `/handoff` 自检，应看到类似输出（模块消息为繁体中文）：

```
[ctx-handoff] context 12034 / 門檻 600000（視窗 1000000）
快取刷新 on，本次閒置已刷新 0/3，計時器未啟動
```

3. 想让每个会话都加载，在 `~/.claude/settings.json` 的 `env` 里加绝对路径；多个文件夹 Windows 用 `;`、macOS/Linux 用 `:`：

```json
"env": { "CLAUDE_CODE_PLUGIN_DIRS": "/home/you/.claude/mods/ctx-handoff" }
```

4. 按需调参：数值是 [`hooks/register.ts`](hooks/register.ts) 顶部的常量，改那里；若该文件夹被监听，改动会热重载。

| 常量 | 默认 | 含义 |
|---|---|---|
| `THRESHOLD` | `600_000` | 触发交接的上下文 token 数 |
| `WINDOW_RATIO` | `0.8` | 小窗口时阈值为 `window × ratio` |
| `IDLE_MS` | 55 min | 触发刷新前的空闲时间（按 1 小时缓存调校） |
| `MAX_REFRESH` | `3` | away handoff 前的刷新次数 |
| `MIN_TOKENS` | `30_000` | 低于此值跳过刷新和 away handoff |

   作者对阈值的说明：社区反馈和 Anthropic 的 MRCR 数据提示质量大致在 200k–300k token 附近开始下滑；600k 是刻意选的、为了少交接。如果你发现模型在交接触发前就变差，就把它调低。

5. 5 分钟缓存用户必须关掉刷新（API key、Bedrock、Vertex 用户，以及进入 usage credits 的订阅用户）：5 分钟 TTL 下，55 分钟时的刷新会发现缓存已失效，而每次刷新会重写整个上下文。mod 不检测 TTL，需要手动执行：

```
/handoff refresh off
```

6. 日常不需要命令；需要时用唯一的 `/handoff` 及其子命令：

| 命令 | 用途 |
|---|---|
| `/handoff` | 显示上下文用量、阈值、刷新与 distill 状态、待处理的 away handoff、用法 |
| `/handoff now` | 立刻交接（会清空会话） |
| `/handoff dry` | 生成交接并显示其成本，**不清空** |
| `/handoff distill` | 立刻 distill 当前项目的 memory 和 rules |
| `/handoff resume` | 使用 away handoff：先 `/clear` 再提交，外加被暂扣的那条消息 |
| `/handoff continue` | 丢弃 away handoff，在老会话里发被暂扣的消息 |
| `/handoff resend` | 重新提交没送达的交接（本进程记录，否则最近一次生成的）；不执行 `/clear` |
| `/handoff refresh on\|off` | 开关空闲缓存刷新；关掉后空闲 55 分钟直接保存 away handoff |
| `/handoff distill on\|off` | 开关后台 distill |

   最近 5 次交接保留在 mod 的 store 里。

7. 了解几条会影响使用的行为（照做时要知道）：
   - 交接到提交之间输入的消息会被暂扣并附到交接文本后面（只暂扣文本，图片/附件必须在交接后重新粘贴，通知里会说明）；`after that text was built` 之后到的消息在交接回合之后立即提交；交接在 `/clear` 前失败则在老会话里重新提交。`/handoff dry` 和 away handoff 从不暂扣消息。
   - 后台 distill 结果乘在下一条真正进入会话的消息上；有变更时会有 toast 显示变更条目数和写入的每个 notes 文件全路径；交接前的那次 distill 不排队任何东西。
   - distill 输出是 JSONL，由程序校验并落盘：每行一个 action，位于 `=== ACTIONS ===` 与 `=== END ===` 之间（`add_memory`、`update_memory`、`delete_memory`、`add_rule`、`confirm_rule`、`update_rule`、`delete_rule`，以及一步完成跨项目移动的 `move_memory`/`move_rule`），始终用繁体中文（台湾），代码、命令、路径、报错保持原样。非法行被丢弃并计数，最多保留 3 个样本连同原因，由 `/handoff` 展示；任何含疑似密钥字段的 action 整条丢弃且不保留样本。
   - notes 按项目归档：会话从父目录（如 home 或 workspace）启动但触碰多个 repo 时，按工具路径（`file_path`、`path`、`notebook_path`）和 Bash 工作目录记录触碰的项目，取有 `.git` 的最近祖先，否则取会话根的一级子目录（跳过 `AppData` 与点目录）。会话根是 `P1`（默认），Bash `cd` 到别的 repo 不会改变它；触碰的项目为 `P2`、`P3`……最多 8 个，最老的被丢弃。一次会话首次触碰已有 notes 文件的项目时，该项目的 notes 会随下一条真实 prompt 注入一次（`P1` 不这样注，因为它在会话开始时已带入）。
   - 失败可见可恢复：每次交接失败（写、`/clear`、提交）都被记录并由 `/handoff` 展示；3 分钟未应答的交接 fork 被放弃、暂扣消息回到老会话，distill fork 8 分钟放弃；阈值交接失败后等 3 条用户消息或 10 分钟再重试；交接全文在 `/clear` 前存为 `pendingSubmit:<session id>`，提交成功后才删。
   - 推迟有硬上限：后台工作让交接一直等时，上下文达到 `min(90% of the window, threshold + 150k)` 就照常交接，交接开头会说明还有什么在跑。
   - 开发/自检命令：

```sh
claude plugin validate .
claude plugin test .
tsc -p .   # after the mod has loaded once, which writes .claude-plugin/types/
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：把通常手动做的 `/clear` + 重述上下文、以及"同一个纠正说第四遍"这两件事交给自动化——阈值交接、后台 distill 成 memory/rule、跨项目归档 notes、空闲时保活缓存，都是原文点明但容易被忽略可自动化的环节。
- **任务匹配**：明确匹配 Claude Code 长会话编程智能体；适配 1M 窗口 + 1 小时 prompt cache 的订阅用户；5 分钟缓存用户（API key/Bedrock/Vertex/usage credits）明确不适配，需关刷新。只作用于主会话，子代理回合被忽略。
- **条件供给**：需要安装 mod、目标 build 带 function hooks、在 `~/.claude/settings.json` 配 `CLAUDE_CODE_PLUGIN_DIRS` 才能每会话加载；notes 文件是纯 Markdown、归用户所有、手改会被保留（多行 memory、未知 `## ` 段落能往返）。反馈通道：`/handoff` 显示上下文/阈值/刷新/distill 状态、交接失败原因、非法 JSONL 样本与原因、distill 变更 toast 与文件全路径。
- **主动推进**：由事件/状态触发——`Stop` hook 触发 + 上下文 ≥ 600k（或窗口 80%，取低）；后台任务、一次性定时唤醒或子代理还在跑时等待（循环 cron 从不阻塞），到硬上限 `min(90% 窗口, threshold + 150k)` 就照常交接；空闲 55 分钟触发刷新，最多 3 次，第 4 次保存 away handoff 不 clear；失败后等 3 条消息或 10 分钟重试。
- **效果验证**：`claude plugin test` 94/94 通过，覆盖 JSONL 校验与拒绝样本、跨项目移动、fork 超时、最后一次 distill 的 60 秒等待、暂扣消息去重与附件、Bash `cd` 不移动 `P1`、git worktree 用主工作树的 notes、密钥不外泄、`/clear` 在 resume 时失败、按项目路由与触碰检测、fork 中单文件跳过、首次触碰注入、阈值、200k 窗口、refresh→away handoff、refresh off、小上下文跳过、resume、交接中的暂扣消息、上下文注入、按项目 store key 与清理、失败退避与 `/handoff resend`、memory 文件往返、基于 `Stop` 的推迟、away 流程。另有实测数据见下节。

## 与已有做法的关系（对照给出的清单条目；没有就写"清单中没有相关条目"）

- **Claude Code**（tool，adopt）：本 mod 是 Claude Code 的插件/扩展，前提就是这个工具，且依赖它的 function-hooks API 和 `Stop` hook、`/clear`、`prompt.submit` 等能力。可以把本条目看作 Claude Code 在长会话场景下的一个可选增强，而非替代。
- **Context Mode**（tool，watch）：同属上下文管理方向，但给出的材料没有说明两者的具体关系或能否共用，无法对照判断，只能并列参考。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的数据/案例**（可作为依据）：
- 用探针 mod 现场验证过构件：从 mod 里 `/clear` 后 `prompt.submit` 可用；对一个 102k token 对话做 fork，输入 token 102,523 中 102,003 从缓存读取（约 99.5%）。
- `claude plugin test`：94/94 通过（覆盖范围见上节）。
- 2026-10-04 现场确认：distill 写 JSONL 与繁体中文 notes；distill 变更乘在下一条消息上且模型能看到；从 home 目录启动的会话会把 memory 归档到对应 repo 的 notes；交接期间暂扣的消息会附到新会话第一条消息上；超过硬上限时即使有后台任务和子代理也照常交接。
- 时间开销：distill 在 476k 约 95 秒、800k 约 3 分钟（800k 时交接本身约 28 秒），因此交接在 60 秒后不再等它。

**作者主张而非实测**：
- 阈值 600k 的合理性依据是 "社区报告和 Anthropic MRCR 数据提示 200k–300k 开始下滑"，属于间接引用，不是本项目测量。
- "distill 几乎不额外花 token（约 99.5% 缓存读取）" 只有单次 102k fork 的实测支撑。

**明确未验证/局限**：
- **空闲刷新是否真的保活 1 小时缓存未经验证**——fork 的缓存读能否延长主会话的 1 小时缓存条目尚未确认。
- **5 分钟缓存用户必须 `/handoff refresh off`**，mod 不检测 TTL；否则每次刷新重写整个上下文。
- 后台工作检测依赖 `Stop` hook 的快照：哪些 `status` 算"仍在运行"、`Stop` 相对 `turn.complete` 何时触发，都未在真实会话确认。永不结束的任务（如 dev server）只会推迟到硬上限，需用 `/handoff now` 提前强制。
- 大上下文下最后一次 distill 可能做不完：`/clear` 是否让在途 fork 完成未现场确认；若不能，该次 distill 记为失败，老对话结尾不被 distill。
- 暂扣消息只保文本：mod 只能看到附件的类型、看不到字节，交接期间或 away handoff 之后的图片必须重贴。测试用 composer-origin 提交模拟输入，不是真实终端。
- 热重载会重置计时器和内存状态（暂扣消息、排队的 distill notes、resend 记录）。
- API 是 early access，Claude Code 更新可能要求修改。

**适用条件**：带 function hooks 的 Claude Code build（测试于 2.1.287）；1M 上下文 + 1 小时 prompt cache；主会话（子代理回合被忽略）；需要能写 `~/.claude/mods` 与修改 `~/.claude/settings.json`。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用**：
1. 只在一个会话里试，不要先全局配置：

```sh
git clone https://github.com/cablate/ctx-handoff-mod ~/.claude/mods/ctx-handoff
claude --plugin-dir ~/.claude/mods/ctx-handoff
```

2. 进会话先跑 `/handoff`，确认能显示上下文/阈值（如 `context 12034 / 門檻 600000（視窗 1000000）`）与刷新、distill 状态。若不是 1 小时缓存，先 `/handoff refresh off`。
3. 跑 `/handoff dry`，在不 clear 的情况下产出一次交接，检查摘要质量与作者给出的成本数据。
4. 在一个真实长任务上跑到阈值（默认 600k；想更快看效果可临时调低 `hooks/register.ts` 里的 `THRESHOLD`），观察是否自动交接、新会话是否"报告它理解了什么并等你"。
5. 手动 `/handoff distill` 一次，打开对应项目的 `ctx-handoff.md` 看 memory/rule 是否合理，再手改一处看下次 distill 是否保留。
6. 故意制造一次失败（如在交接中发消息、或提交失败后 `/handoff resend`），看 `/handoff` 是否报出原因。

**判断有没有改善的指标**：
- 交接后新会话是否准确复述任务并等待，而不是重复问已经答过的问题（原文的 distill demo 就是针对"同一个指令说第四遍"）。
- 重复纠正/重复解释的次数是否下降；被纠正过两次以上的做法是否进 `ctx-handoff.md` 并成为 rule（rule 需出现 2+ 次才注入）。
- 长会话是否能不中断地跑过上下文上限：交接触发时上下文是否落在阈值附近，而不是拖到模型质量已下滑；`/handoff` 报告的上下文用量与阈值。
- 交接/提交/`/clear` 的失败次数与恢复是否成功（`/handoff resend`、暂扣消息回到老会话）。
- distill 的 token 成本：是否能复现"约 99.5% 从缓存读取"。
- 交接引入的额外时间：与原文的 800k 约 28 秒、distill 476k 约 95 秒对比。

**注意**：因为空闲刷新保活、`Stop` 快照、大上下文下最后一次 distill 这三项作者自己都标为未验证，评估时应把它们当作待验证项而不是默认成立；如果试用中出现上下文被反复重写（5 分钟缓存场景）或交接后丢失结尾对话的情况，应按 Limitations 的说明降级处理（关刷新、用 `/handoff now`、手动 distill）。
