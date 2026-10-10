# 让多个编码 agent 并行干活：隔离、验证、评审与注意力路由

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：单个 AI 回答或单条串行会话交付的常常是未经验证的结果；这篇手册给出一套可照做的流程，把任务拆给多个 agent、用独立验证和评审设门槛、把产物落盘，并用通知与看板让“谁在等我”可见。
> 先试这一步：挑一个已有测试的小 git 仓库，先用 `npx neurosquad` 开一个 `--worktree` agent（或先用 `/arena --quick --seed 7` 把被拒的旧答案送进 16 个 agent 的锦标赛），在 1–2 个真实任务上确认隔离、验证和通知真的成立，再扩大。
> 最近修订：2026-10-10

## 解决什么问题

单个 AI 回答、单条串行的 agent 会话，交付的往往是你没有验证过的结果：看起来合理，但可能漏了你真正在意的约束。这篇手册把「不满意就重问一次」升级成一套可执行的流程——把同一个任务交给多个子代理用不同策略并行求解、互相对抗、由独立裁判按公开标准打分淘汰；把有固定分工的多步任务（先搜集资料、再扩写成文）固化成角色化 Crew 流水线，产物落盘成文件；代码类任务则必须通过你自己的验证命令才能合入，再进一步可以把整条链固化成 GitHub 上的 issue → PR → 浏览器实测 → 合并。同时给出成本预估、可观察指标，以及「什么时候不值得这么做」的判断线。新增的做法 H 把「隔离、记忆、评审」三件事落成可手工照做的流程：每个 agent 一个 git worktree、项目记忆写成 conventions.md/plan.md/dead-ends.md、第二个 agent 在提交前读 diff 做同行评审；Offrun 是这套流程在 macOS 上的一种现成实现。新增的做法 I 解决另一个并行 agent 的常见瓶颈：注意力。多个终端型 agent 跑起来后，真正的浪费常常不是模型慢，而是「哪个 agent 在等我」不可见。cmux 把等待输入变成蓝色通知环、侧栏徽标、通知面板和 ⌘⇧U 跳转，让「谁在等我」成为可路由的信号；但 cmux 作者明确说它是 primitive，不是 solution，不替代验证、记忆和评审。新增的做法 J 把「第二个智能体在同一 commit 上验证通过才算完成」做成可强制执行的状态机：SPEC.md 一行一行批准、每条 lane 一个 worktree、提交必须过 gate、验证必须由没参与构建的另一个 agent 在确切 commit 上做、给出 receipt 才合并；Pullboard 是本机运行、存在你 git 仓库里的看板实现，不调用模型。新增的做法 K 把镜头再拉远一层：不再只管一个仓库、一个任务，而是把多个已注册项目的状态、六步流水线（spec → build → sync → verify → review → release）、Git 摘要与 PR/CI 收进一块本地控制台面板——一个控制台会话承担跨项目的规格、监督与评审关卡，你只做决策和最终发布审批；项目状态（● 待决策、◆ 待评审、▶ 运行中、↻ 待同步、○ 空闲）来自项目里的 STATUS 卡，关卡字段没清空就阻止继续；默认执行者是 Claude Code 原生后台 agent（不需要 Codex 账号），也可按项目切到 Codex 或标成 manual 只做交接不派工；刷新只查本地文件和 CLI、不请求模型，只有提交决策草稿时才花 Claude 额度。新增的做法 L 把「谁在跑、谁在等我、花了多少」做成终端里的 daemon + dashboard：Claude Code、Codex、OpenCode 或任意命令都能注册成 agent，每个 agent 有自己的终端，dashboard 用网格显示；关闭 dashboard 或终端后 agent 继续跑，重启机器后 `nsq up` 按各自 session 恢复；agent 提问时通知里原样带出问题，不切进终端也能按 y/a/n 回答；`nsq ls --json`、`nsq cost --since 7d`、`nsq diff`、`nsq peek` 把状态、成本、改动、屏幕尾部做成可脚本化的信号。它管的是可见性与权限路由，不替代验证、记忆和评审；README 自标 0.1.0 preview。

## 适用与不适用

**适用**

- 你对某个 AI 回答确实不满意，且这个任务值得为此多花 token。
- 可拆分、且能被测试验证的编码任务：每支子代理跑在自己的 git worktree/分支上，测试过了才合入 main。
- 你同时使用多套编码 harness（如 Claude Code 与 Codex），需要座位、拓扑、快照恢复层面的统一管理。
- 想在同一个会话内给难任务「升档」，用一个显式动作决定何时上多 agent、上贵模型。
- 想自建长时程子代理 + 沙箱 + 记忆的执行底座。
- 有稳定重复的多步分工（搜集资料 → 扩写成文），且你愿意写一点 Python、改 JSONC 配置：用角色化 Crew（做法 F）把这条链固化下来。
- 有一个低风险、已有测试基础、且托管在 GitHub 上的小仓库，想验证「issue → PR → 浏览器实测 → 合并」这条自动链路到底能拦住多少问题（做法 G）。
- 你想在一个已有 git 的仓库里，用轻量方式隔离多个 agent（每个一个 worktree），并把项目记忆写成可提交的纯文件，让第二个 agent 在提交前读 diff 评审（做法 H）。
- 你有一台 Apple Silicon Mac（M1+）、macOS 14 Sonoma 或更高，想用 Offrun 把这套流程跑起来；或者你不在这个环境，但愿意手工照做同样的三条流程。
- 你在 macOS 上并行跑多个终端型 coding agent，需要一眼看出谁在等你，并可跳到具体 pane（做法 I）。
- 你想在远程机器上跑 agent、本地驱动（cmux ssh），或让 agent 用内置可编程浏览器自验证 web 改动（做法 I）。
- 你希望 Claude Code teammate/subagent 以原生分屏出现，而不是隐藏后台进程（做法 I）。
- 新增：你想让「另一个智能体在同一 commit 上验证通过才算完成」成为硬约束，而不是靠你口头要求（做法 J）。
- 新增：你愿意把需求写成一行一行可验收的 SPEC.md，并接受「未经第二 agent 验证不算完成」（做法 J）。
- 新增：单人或多 agent 在 git 仓库内做长期构建，希望用看板看到每条目的 claim / submit / verdict 和驳回理由（做法 J）。
- 新增：你同时照看多个项目、每个项目里都有 agent 在跑，想在一屏里看到「谁在等我做决策 / 等我评审 / 正在跑 / 待同步」（做法 K）。
- 新增：你的环境是 Windows 或 macOS，Claude Code 2.1.289 或更高且支持 mod，并且你接受自建「项目注册表 + STATUS 卡」这两样约定（做法 K）。
- 新增：你想按项目切换执行者——默认用 Claude Code 原生后台 agent，Claude 额度紧张时把个别项目切到 Codex，或标成 manual 只做交接不派工（做法 K）。
- 新增：你希望不可撤销命令（rm -r、force push、git reset --hard、DROP TABLE 等）在执行前被问一次，并让同一参数同一错误的工具调用不再试第三次（做法 K）。
- 新增：你在 macOS / Windows / Linux 上并行跑 Claude Code、Codex、OpenCode 或任意长驻命令，想在一个终端 dashboard 里看到谁在 working / 需要你 / 已完成（做法 L）。
- 新增：你希望关掉 dashboard 或终端后 agent 继续跑，`nsq up` 能按各自 session 恢复，重启机器后也可（做法 L）。
- 新增：你想不切进具体终端就回答权限询问（y/a/n）或发送提示（s / S），并在 agent 提问时从通知里原样看到它的问题（做法 L）。
- 新增：你想把非 AI 的长驻进程（如 `npm run dev`）和 AI agent 并列在同一个面板里管理（做法 L）。
- 新增：你想脚本化拿状态与成本：`nsq ls --json`、`nsq cost --since 7d --json`、`nsq diff`、`nsq peek`（做法 L）。
- 新增：你想给 agent 换 OpenRouter 模型，或指向自建 OpenAI/Anthropic 兼容服务器（llama.cpp、Ollama、LM Studio、vLLM、SGLang、Unsloth Studio 等），且不想让密钥进 argv、日志或文件（做法 L）。
- 新增：你需要在手机上（experimental，默认关闭）看 agent 屏幕、发提示、回答权限询问、中断 agent（做法 L）。

**不适用**

- 任务描述本身就含糊：arena README 明确说「Vague task in, 100 flavours of vague out」，含糊任务上锦标赛只会得到 100 种含糊。
- 编码任务没有可执行的验证命令：不设 `FARM_VERIFY_CMD` 就等于没有质量门。
- 只想「多问几次」、不愿承担 token 成本：开销随 agent 数和任务体量线性增长。
- 原生 Windows：openrig 仅支持 macOS / Linux，WSL2 未测试。
- 非编码场景：OmO 的「做 deck、跨源研究」等只有一句话主张，没有可核对的案例。
- 不愿意写代码、配环境：crewAI 是需要写代码、配环境的开发框架，不是装完即用的工具。
- 打算立刻在涉密环境跑：调研原文第 11 步「关掉默认遥测」的命令被截断，拿到确切做法前不要往敏感数据上跑。
- 项目只在本地、没有托管到 GitHub：cubefarm 的 issue 和 PR 是唯一协作媒介，纯本地项目用不了（做法 G）。
- 没有编码 agent 的付费订阅，或不愿让多个 agent 共享同一份用量限额：cubefarm 的所有 agent 共用同一份额度。
- 非 Web 类项目：cubefarm 的 QA 在真实浏览器里测，依赖 Google Chrome，README 未说明非 Web 项目怎么 QA。
- 不是 Apple Silicon Mac 或系统低于 macOS 14：Offrun 本身用不了；做法 H 的三条流程可以手工照做，不受此限。
- 想靠 Offrun 的「免费无限」「无服务器」「不经手密钥」等厂商声明作为选型依据：原文未给审计或第三方说明。
- 需要跨 Mac 通知或本地听写：这些只在 Offrun/macOS 生态成立。
- 希望评审后自动合并：做法 H 默认「Nothing merges on its own」，发现落到 chat 里由你判断；这与做法 B/G 的自动合入闸门不同。
- 不是 macOS；或不想用 GUI 终端：cmux 仅支持 macOS，且是 GUI 终端（做法 I）。
- agent CLI 不在 PATH 上却想用 hooks 自动恢复；README 要求装 hooks 前 agent binary 在 PATH（做法 I）。
- 把 cmux 当完整解决方案；它不规定工作流，也不负责合入闸门（做法 I）。
- 需要本机进程活过 logout、重启、关机或断电；本机 local-tmux 不行，要换 ssh-tmux、mosh-tmux 或持久云 VM（做法 I）。
- 没有第三方性能与收益数据，不宜作为通用默认方案直接采用（做法 I）。
- 新增：你想把 worktree 隔离当作安全边界：原文明确说 worktree 身份只在一台机器上有意义，不是安全边界（做法 J）。
- 新增：你的环境是原生 Windows：Pullboard 的 CI 只在 Linux 和 macOS 上跑，Windows 未测试（做法 J）。
- 新增：你需要现成的手机/远程看板：relay 和 Pullboard View 里的 roadmap 仍是 planned（做法 J）。
- 新增：你不愿意写 SPEC.md，也不想设一条 gate 命令：没有 gate 就没有提交前的门槛，也没有 verifier 可以依据的验收标准（做法 J）。
- 新增：不想维护项目注册表和每个项目的 STATUS 卡：面板的状态、同步与关卡都建立在这两样自建约定上（做法 K）。
- 新增：Claude Code 版本低于 2.1.289 或不支持 mod：插件装不上（做法 K）。
- 新增：原生 Linux：材料只给了 Windows 与 macOS 两个前提（做法 K）。
- 新增：希望面板替你执行发布或正式环境变更：原文明确面板自身不执行发布（做法 K）。
- 新增：指望面板刷新时调用模型来给出真实状态：刷新只查本地文件和 CLI、不请求模型（做法 K）。
- 新增：想把它当成熟方案直接全量采用：仓库仅 53 stars、版本 0.15.x，UI 当前是繁体中文，且强依赖特定 Claude Code 版本与自建的注册表/状态卡约定（做法 K）。
- 新增：你把它当成熟方案：nsq README 自标 0.1.0 preview，命令与配置在 1.0 前可能变化（做法 L）。
- 新增：任意命令 agent 没有 hooks，只有 working / finished，永远不会出现 needs you；对这类进程不要指望它提醒你权限或提问（做法 L）。
- 新增：需要手机端启动 agent、改设置或敲任意键：手机端只能看屏幕、发提示、回答权限、中断（做法 L）。
- 新增：Windows arm64 想用语音听写：不可用（做法 L）。
- 新增：你指望 README 给出改善幅度的量化指标：nsq README 没有基准或效果数据（做法 L）。
- 新增：涉密/敏感环境：手机端链接携带 pairing token，要当密码对待；是否可用要自己评估（做法 L）。

## 前置条件

- 共同前提：把任务写成独立、自包含的文件。子代理看不到你的聊天记录，任务文件是它唯一的信息源。
- 做法 A（arena-skill）：Claude Code（需要 spawn 子 agent）+ Python 3.8 以上；`bracket.py` 只用标准库，不需要 pip 安装。
- 做法 B（clodfarm）：一台装了 Docker 的机器；一个 Claude 订阅账号或 API key；一个你愿意让它改的 git 仓库（建议先小仓库）；一条验证命令。
- 做法 C（openrig）：Node.js 22 或 24 + tmux，仅 macOS / Linux；启动会写入 provider hooks 和 workspace trust 设置，动手前先备份相关文件。
- 做法 D（oh-my-openagent）：一台可弃用的机器或容器（安装脚本是 `curl | bash`）；一个自己的小项目目录；至少一家模型订阅或 API key。
- 做法 E（deer-flow）：git、Docker Desktop/Engine、Docker Compose v2.24+（用 `docker compose version` 自检）；仓库自身要求 Python 3.12+ / Node.js 22+。
- 做法 F（crewAI）：Python >= 3.10 且 < 3.14；命令行操作与基本 Python 编辑能力；用 uv 管理依赖；一个模型提供商的 API key（默认走 OpenAI API）；若任务要用网页搜索工具，另需 Serper.dev 的 key。Windows 上若遇 `chroma-hnswlib` 构建错误，需先装 Visual Studio Build Tools 并勾选 Desktop development with C++。
- 做法 G（cubefarm）：Node.js 22 或更新版本；`git`；已登录的 GitHub CLI（`gh auth login`）；一个编码 agent 的订阅（cubefarm 自带 Claude Code 作为默认 agent，CEO 也跑它，无需另行安装，登录一次即可；你本机已装并登录的 Codex 或 OpenCode 也可以被选中）；Google Chrome（QA agent 要在浏览器里测你的应用）；项目必须托管在 GitHub 上；办公室数据在 `~/.cubefarm`（设置、仓库克隆、每个 agent 一份独立工作副本），可用 `SWARM_HOME` 换目录。
- 做法 H（Offrun 或手工照做）：项目在 git 下（worktree 依赖 git）；至少一个你已在用的 agent CLI 和账号，有第二个账号更好（用于限额切换）。若用 Offrun 本身：Apple Silicon Mac（M1 或更新）、macOS 14 Sonoma 或更高；下载 Offrun 拖进 Applications；在 Settings → Agents 添加账号。若手工照做：任意支持 git 的环境，能创建 worktree 的 git 版本，agent CLI 能在指定目录运行。
- 做法 I（cmux）仅支持 macOS，会读取你已有的 Ghostty 配置 `~/.config/ghostty/config`。推荐 DMG 安装，也可 Homebrew。若要用 agent hooks 的自动恢复，必须先装好对应 agent CLI，且其 binary 在 PATH 上。README 列出的受支持恢复集成包括：Claude Code、Codex、Grok、OpenCode、Pi、Amp、Cursor CLI、Gemini、Rovo Dev、Copilot、CodeBuddy、Factory、Qoder。Claude Code 由 cmux 的 Claude wrapper 处理，需在 Settings 中开启 Claude 集成。要远程跑 agent 需可 SSH 的远程主机。自定义 resume 绑定若要自动执行，必须先批准签名命令前缀；token、password、secret、API key 等敏感环境键在存储绑定前会被丢弃。
- 做法 J（pullboard）：本机有 git 和 Node 22.13 或更新版本（README 原文："You need git and Node 22.13 or newer"）；在一个 git 仓库内操作；MIT 许可；本机运行、无账号、无依赖、不调用模型。要真正跑起来还需要三样你自己提供的东西：`SPEC.md` 里已批准的需求行、`PRACTICE.md` 里的 doctrine、`pullboard.json` 里的 gate 命令与每条 lane 的 `owns` / `specs` 授权。
- 新增做法 K（claude-console）：Windows 或 macOS；Claude Code 2.1.289 或更高且支持 mod；每个要纳入面板的项目在注册表里有一项、并有一个 STATUS 文件。若要用 Codex 执行者，还需要 Node.js、Codex Companion 和一个 Codex 账号（Windows 探测需要 PowerShell 和 Codex 桌面应用，macOS 需要 PATH 上有 `codex` CLI）。
- 新增做法 L（nsq）：Node.js 22.13 或更新；native 部分预编译（Windows x64/arm64、macOS Apple silicon/Intel、Linux x64/arm64），无需编译器。要使用 Claude Code / Codex / OpenCode 之一，需该 CLI 自身已登录，或改走 OpenRouter / 自建模型服务器。目录是 git 仓库时 `--worktree` 才会生效。数据在 `~/.neurosquad-cli`（可用 `NSQ_HOME` 迁移），密钥在 OS keyring；`~/.claude`、`~/.codex`、`opencode.json` 永不被写。

## 操作步骤

先按你的处境选路径：

| 你的处境 | 用哪条路径 |
|---|---|
| 只有一个被你拒掉的回答，想确认多策略竞争是否真的更好 | 做法 A |
| 可拆分、有测试的编码任务，想并行落地 | 做法 B |
| 同时跑 Claude Code + Codex 等多套 harness，要座位与恢复 | 做法 C |
| 只想在同一会话里给难任务升档 | 做法 D（先做对照实验） |
| 想自建长时程子代理 + 沙箱 + 记忆的底座 | 做法 E |
| 有固定的多步分工（研究 → 成文），愿意写 Python / 改 JSONC | 做法 F |
| 有 GitHub 上的低风险小仓库，想验证 issue → PR → 浏览器实测 → 合并 这条链 | 做法 G |
| 想在一个已有 git 的仓库里轻量隔离多个 agent、把项目记忆落成文件、提交前互评 | 做法 H |
| macOS 上并行跑多个终端型 coding agent，想一眼看到谁在等我 | 做法 I |
| 想让「另一个 agent 在同一 commit 上验证通过才算完成」变成硬约束：SPEC 行 + gate + lane 隔离 | 做法 J |
| 同时照看多个项目的 agent，想在一屏里看到状态、决策与评审关卡 | 做法 K |
| 跨平台并行跑多 CLI agent / 任意长驻命令，想用 daemon + dashboard 统一看状态、回权限、脚本化取成本 | 做法 L |

### 做法 A：把不满意的回答送进锦标赛（arena-skill）

1. 安装，三选一。直接粘给 Claude：

```
https://github.com/Jakeschincariol/arena-skill

Install this skill, then confirm /arena works.
```

或手动复制到全局 skill 目录：

```bash
git clone https://github.com/Jakeschincariol/arena-skill.git
cp -r arena-skill/skills/arena ~/.claude/skills/
```

或作为插件安装：

```
/plugin marketplace add Jakeschincariol/arena-skill
/plugin install arena-skill@arena-skill
```

预期结果：`/arena` 可用。注意以插件方式装会被命名空间化，命令变成 `/arena-skill:arena`；想只作用于某个仓库，把同一个 `skills/arena` 文件夹复制到该仓库的 `.claude/skills/` 下。

2. 运行前把权限切到 accept-edits（Shift+Tab）。否则每个子 agent 往 `.arena/` 写文件都会弹一次授权。

3. 先算成本再决定规模，`plan` 只打印、不写文件：

```bash
python3 skills/arena/bracket.py plan --agents 100
```

已知赛程与开销：100 个 agent = 7 轮 / 595 次子代理调用 / 70 个 wave；64 = 6 轮 / 379 / 49；32 = 5 轮 / 187 / 28；16（`--quick`）= 4 轮 / 91 / 16；8 = 3 轮 / 43 / 10。若带了要击败的旧答案，再加 1 次调用。作者建议：日常用 `--quick` 或 `--agents 16`，真重要的答案才上 100。

4. 把任务写具体，并检查任务文件。`.arena/<run>/task.md` 是这 100 个 agent 唯一知道的东西；任何要求没写进去，它们都会漏。

5. 跑最小完整形态，并把被拒的旧答案作为 baseline 传进去：

```
/arena --quick --seed 7 <把任务写具体>
```

常用变体：

```
/arena
/arena --quick write the headline for our pricing page
/arena --agents 32 fix the flaky test in tests/test_api.py
/arena --seed 7 plan my launch week, I have 6 hours a day
```

参数：`--agents N`（默认 100）、`--quick`（16 个，日常档）、`--seed S`（同 seed 给同样的卡和同样的赛程，默认随机但会记录）、`--wave W`（每波子 agent 数，默认 10，只有在调高了 Claude Code 并发上限时才需要加大）。预期结果：返回唯一幸存的那份答案，以及它扛过的攻击、它的策略卡和轮数。

6. 需要在锦标赛中途手工操作时，用 `bracket.py` 命令行（整个赛事状态存在一个 JSON 文件里）：

```bash
python3 bracket.py plan --agents 100
python3 bracket.py init --agents 100 --seed 7 --task-file task.md [--baseline-file old.md]
python3 bracket.py next
python3 bracket.py prompts attack
python3 bracket.py pairings
python3 bracket.py collect
python3 bracket.py record r3-m07 a042 --reason '...'
python3 bracket.py advance
python3 bracket.py status
python3 bracket.py winner
```

预期结果：主会话只跑循环、不读那几百份方案文件，上下文保持很轻；如果对话中途被压缩，用 `bracket.py next` 从 JSON 状态文件接着跑。

7. 验证工具本身：

```bash
python3 -m unittest discover -s tests -v
```

测试会用随机胜者跑完整 100 个 agent 的锦标赛，并检查最终恰好剩 1 个幸存者，还包括 16、7、1 个 agent 的情形、发牌保证，以及从 spawn 到终检的每个阶段。

8. 想改规则就改这三个文件：`skills/arena/strategies.json`（15 推理模式 × 12 工作流 × 12 策略，可自由编辑）、`skills/arena/rubric.md`（judge 的评分标准）、`skills/arena/SKILL.md`（编排步骤和每个子 agent 收到的确切 brief）。默认 rubric 权重：correctness 30、completeness against the task 25、robustness to the attacks raised 20、specificity 15、clarity 10。judge 看不到策略卡；总分高者晋级，且带「已核实致命缺陷」的方案不能赢过没有致命缺陷的方案。

### 做法 B：并行子代理 + 测试合入闸门（clodfarm）

1. 一行安装并启动（默认单容器、无数据库、无配置）：

```bash
curl -fsSL https://raw.githubusercontent.com/matank001/clodfarm/main/scripts/install.sh | sh
```

启动后打开登录流程：出现一个 URL，在任意设备上批准后把 code 粘回。UI 在 `http://localhost:8080`。

2. 替代方式，裸 Docker 启动：

```bash
docker run -d --name clodfarm --restart unless-stopped \
  -v clodfarm_claude-home:/home/farm/.claude -v clodfarm_workspace:/workspace \
  ghcr.io/matank001/clodfarm
docker exec -it clodfarm clodfarm login
```

或 clone 仓库后 `docker compose up -d`（`.env` 可选，从 `.env.example` 复制）。状态存在 workspace 卷里的 SQLite 文件。

3. 登录 Claude 账号，按场景选一种：A. `clodfarm login`（URL + 粘 code，服务器默认方式）；B. `claude setup-token` 得到 token，在 `.env` 设 `CLAUDE_CODE_OAUTH_TOKEN=...`（适合 headless worker / CI）；C. 挂载已有的 Linux `~/.claude`（macOS 存在 Keychain，不能用 C）；D. `ANTHROPIC_API_KEY` + `FARM_DAILY_BUDGET_USD`（团队、按 token 付费）。

4. 把它接到真实仓库并设验证闸门——这一步是整套流程的关键，不设就等于没有质量门：

```bash
FARM_REPO_URL=<你的仓库地址>
FARM_VERIFY_CMD='pytest -q'
```

预期结果：farm 克隆该仓库，每个子代理的成果只有在你的测试通过时才落到 `main`；失败输出会回注给该子代理续跑。

5. 派任务（命令行与 agent 内部用的是同一个命令）：

```bash
docker exec clodfarm clodfarm spawn 'Add CSV export' --prompt 'Add CSV export to the report page, with tests.'
docker exec clodfarm clodfarm status
```

`--on NAME` 可把子代理钉在指定 Claude 的账户上；不指定时由 budget governor 决定谁能跑。

6. 从手机下指令：Claude app → Code → `[clodfarm] clodfarm`，直接说 add CSV export to the report page、have gil's Claude review it、every morning at 9, triage new issues。

7. 从笔记本上的 Claude Code 接进来（远程 MCP，OAuth 2.1 + PKCE）：

```bash
claude mcp add --transport http --scope user farm http://localhost:8080/mcp
```

然后在 Claude Code 里跑 `/mcp` 登录，就能问 what's the farm doing?；断开用 `clodfarm disconnect`。

8. 定时任务（cron / 固定间隔 / 一次性；每个 box 都会检查，触发时原子领取，只跑一次）：

```bash
clodfarm schedule add TITLE (--cron ... [--tz ...] | --every 2h | --at ...)
```

还有 `list` / `remove ID`。默认时区由 `FARM_TZ` 决定（默认 UTC）。

9. 配置节流与并发（全部是环境变量，`.env.example` 有全量说明；关键几项）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `FARM_MAX_WORKERS` | `3` | 单个 Claude 同时能跑的子代理数上限 |
| `FARM_WEEKLY_TARGET` | `0.80` | 到达周窗口 80% 就停 |
| `FARM_FIVE_HOUR_CEILING` | `0.85` | 5 小时窗口最多用到 85% |
| `FARM_USAGE_REFRESH` | `300` | 空闲 Claude 每隔这么多秒重新测一次用量（0 = 只按运行中测） |
| `FARM_DAILY_BUDGET_USD` | `0` | API key 模式下的每日上限（0 = 不限） |
| `FARM_MODEL` / `FARM_EFFORT` | `opus` / 默认 | 所有 agent 的模型与 effort |
| `FARM_CLAUDE_UPDATE` | `3600` | 每隔这么久把 Claude Code 升到最新版（0 = 从不） |
| `FARM_REPO_URL` / `FARM_VERIFY_CMD` | 空 | 工作仓库 / 落地前必须通过的检查 |

10. 需要多机 / 多 seat 时，让多台机器共用一个 farm：需要真实 DynamoDB 表 + 所有 box 都能 push 的共享仓库。

```bash
deploy/aws/deploy.sh up --workspace-repo git@github.com:you/repo.git && deploy/aws/deploy.sh login
STACK=farm-2 deploy/aws/deploy.sh up --table clodfarm --workspace-repo git@github.com:you/repo.git
clodfarm budget
```

预期结果：`clodfarm budget` 显示每个 seat 的用量条、它的机器、现在允许跑什么。

11. 观测与运维：`clodfarm status`（有哪些 Claude、预算、在跑的子代理）、`clodfarm agents`（每个 Claude 的用量百分比）、`clodfarm budget [--refresh]`、`clodfarm events [-f]`、`clodfarm pause [reason]` / `resume`、`clodfarm login / whoami / doctor`；所有命令都支持 `--json`。

### 做法 C：多 harness、多座位的统一编排与恢复（openrig）

1. 先备份并检查前置条件（原文要求先读 What OpenRig changes on your machine 一节并备份相关文件）：

```bash
tmux -V
claude --version && claude auth status
codex --version && codex login status
```

只检查你实际会用的那一家；需要时先 `claude auth login` 或 `codex login` 登录一次；不要安装或登录用不到的 provider。

2. 安装 CLI 并预览 setup：

```bash
npm install -g @openrig/cli
rig setup --dry-run
```

用 Bun 的话 `bun add -g @openrig/cli`，但仍需另装 Node.js 22（OpenRig 仍跑在 Node 上）。`rig setup --dry-run` 只预览 setup 计划，不会应用。

3. 选 starter（复用你已有的工作账号，不需要再买第二份订阅）：

| Team | Starter | Models |
| --- | --- | --- |
| Two Codex agents | `first-project` | Both `gpt-6-astra` (unchanged) |
| Two Claude agents | `first-project-claude` | Configured native Claude default |
| Claude owner + Codex checker | `first-project-mixed` | Claude default + `gpt-6-astra` |

三套用同样的 owner/checker 角色和任务；启动前应显示所选 runtime、配置的模型和命令，并确认账号支持该模型。

4. 一次性权限选择：启动前 agent 会问一次是否允许它无重复授权地运行 OpenRig 命令（Yes — recommended / No — keep prompts）。原文明确：这不是全局 YOLO，也不是允许 agent 自己发明工作；作用域默认是 personal project scope。撤销方式是对 agent 说：Undo the OpenRig command allowances added by this setup。

5. 在一个仓库里启动两座位 starter：

```bash
cd /path/to/your/repository
starter=first-project  # or first-project-claude or first-project-mixed
rig specs preview '$starter' --kind rig
rig up '$starter' --cwd . --plan
rig up '$starter' --cwd .
rig tui --shared
```

`rig tui --shared` 打开共享看板；不停止看板而脱离，按 `Ctrl-b` 再按 `d`，回来仍用 `rig tui --shared`。关掉查看终端不等于要重启团队。

6. 下发任务前先做就绪检查：

```bash
rig ps --nodes --rig '$starter'
```

在分派工作前解决任何认证、信任或权限提示。

7. 给 owner 一个有界结果：

```bash
rig send dev-owner@$starter 'Implement <one useful change>. Track the task in the queue and return its ID. Keep it local, verify the behavior, ask dev-check in this rig to check the exact candidate, and record the result and how I can try it.'
rig queue list --destination dev-owner@$starter --limit 1000
```

关键提醒：发送消息本身不会创建队列项，是 owner 记录任务。然后读最终产物和针对「确切候选」的复核，再回到同一个 owner 做下一处改动。

8. 需要时再动这些开关：权限模式 `rig policy permissions list|show|current|apply`、`rig seat set-permissions <seat> --mode <mode> --reason <text>`（模式可为 `floor`、`full_bypass`、`inherit`）；保护手打座位 `rig seat set-typing-guard <seat> --enabled true --reason <text>`；更大 starter `rig up product-team`、`rig up conveyor`；运行中演进与恢复 `rig down --snapshot` + `rig up <name>`；诊断 `rig setup --full`、`rig doctor`（都支持 `--json`）。

### 做法 D：在同一编码 agent 内用关键字升档（oh-my-openagent）

把这条路径当作待验证的候选，而不是已验证的升级。

1. 安装（macOS / Linux）：

```bash
curl -fsSL https://get.omo.dev/install.sh | bash
omo
```

预期结果：原生 `omo` 二进制装到 `~/.local/bin`，用发布校验和校验，镜像不通时回落到 GitHub Releases。

2. Windows（PowerShell）：

```powershell
irm https://get.omo.dev/install.ps1 | iex
```

3. 或改用包管理器（包名是 `omo-ai`，npm 上那个无关的 `omo` 包是别人的）：

```bash
bun add -g omo-ai
# 或
npm i -g omo-ai
```

4. 进入项目目录运行，用自然语言描述任务：

```bash
cd /path/to/your/project
omo
```

5. 难任务加关键字：在 prompt 里加 `ultrawork`（或 `ulw`）。它承诺的行为序列是：先读代码库 → 计划 → 每步自证后再前进 → 在真实界面上检查结果 → 完成后停止。把这条当可验证的清单，而不是保证。

6. 需要多智能体协作时用 `mass ulw`（关键字和你的任务描述一起给）。注意：README 没有给出这张 agent 图如何定义、如何看图的配置写法。

7. 登录模型订阅：`/login`。从 OpenCode 版或 LazyCodex 迁移先跑：

```bash
omo setup
omo doctor
```

8. 配置：个人级 `~/.omo/omo.jsonc`，项目级 `<project>/.omo/omo.jsonc`，就近的文件优先；键值说明在 `docs/reference/configuration.md`（本次材料未给出，需自己去仓库或文档站取）。

9. 更新与卸载：二进制装法重跑安装命令即更新；包管理器装法 `omo update`；卸载 `rm ~/.local/bin/omo` + `bun remove -g omo-ai`（或 `npm uninstall -g omo-ai`）。

### 做法 E：搭长时程子代理底座（deer-flow）

先说清限制：本次抓到的原文在 Option 2: Local Development 的 Prerequisit 处被截断，skills、sub-agents、scheduled tasks、memory 等小节只有标题、没有正文。下面只写能照做的安装与配置部分。

1. 最快路径：把下面这句话原样交给编码助手：

```text
Help me clone DeerFlow if needed, then bootstrap it for local development by following https://raw.githubusercontent.com/bytedance/deer-flow/main/Install.md
```

预期行为：让它按需 clone 仓库、在可用时选 Docker，并在最后停下来给出准确的下一步命令和用户仍需提供的缺失配置。

2. 手动路径（前提：本机有 git、Docker Desktop/Engine、Docker Compose v2.24+）：

```bash
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow
make setup
make doctor
```

`make setup` 是交互式向导（原文称约 2 分钟），引导选择 LLM provider、可选的 web search、以及执行/安全偏好（sandbox 模式、bash 访问、文件写入工具），生成最小 `config.yaml` 并把密钥写入 `.env`。`make doctor` 验证环境并给出可执行的修复提示。

3. 模型接入（写进 `config.yaml` 或 `.env`）：官方推荐 Doubao-Seed-2.0-Code、DeepSeek v3.2、Kimi 2.5。通用 OpenAI 兼容配置示例：

```yaml
models:
  - name: gpt-4o
    display_name: GPT-4o
    use: langchain_openai:ChatOpenAI
    model: gpt-4o
    api_key: $OPENAI_API_KEY
```

也可以复用已有编码 agent 的凭证：Codex CLI 读 `~/.codex/auth.json`；Claude Code 接受 `CLAUDE_CODE_OAUTH_TOKEN`、`ANTHROPIC_AUTH_TOKEN`、`CLAUDE_CODE_CREDENTIALS_PATH` 或 `~/.claude/.credentials.json`。

4. Docker 开发模式（热重载、源码挂载）：

```bash
make docker-init    # Pull sandbox image (only once or when image updates)
make docker-start   # Start services (auto-detects sandbox mode from config.yaml)
make docker-logs    # View logs
```

5. 出问题要提 issue 时：

```bash
make support-bundle
```

预期结果：写出 `*-issue-summary.md`、`*-issue-draft.md`，并可选在 `.deer-flow/support-bundles/` 下生成证据 zip；该 bundle 只含脱敏诊断和文件清单，不含 `.env`、原始对话消息、用户文件内容。

6. 部署规格起点（来自原文）：本地评测 / `make dev` 从 4 vCPU、8 GB RAM、20 GB SSD 起，推荐 8 vCPU、16 GB；Docker 开发 / `make docker-start` 从 4 vCPU、8 GB RAM、25 GB SSD 起；长跑服务 / `make up` 从 8 vCPU、16 GB RAM、40 GB SSD 起，推荐 16 vCPU、32 GB。

### 做法 F：把多步任务固化成角色化流水线（crewAI）

适用场景：你反复做同一种「先搜集资料、再扩写成文」的多步活，想把它固定成一条带角色分工的流水线，而不是每次重新描述一遍。代价是要写一点 Python、改 JSONC 配置。

1. 先确认 Python 版本落在 `>=3.10, <3.14`：

```bash
python3 --version
```

2. 安装 uv（CrewAI 用它管理依赖）。macOS/Linux：

```shell
curl -LsSf https://astral.sh/uv/install.sh | sh
```

没有 curl 时：

```shell
wget -qO- https://astral.sh/uv/install.sh | sh
```

Windows：

```shell
powershell -ExecutionPolicy ByPass -c 'irm https://astral.sh/uv/install.ps1 | iex'
```

3. 安装 CrewAI CLI 并验证：

```shell
uv tool install crewai
```

出现 PATH 警告时：

```shell
uv tool update-shell
```

Windows 上若遇 `chroma-hnswlib==0.7.6` 构建错误（`fatal error C1083: Cannot open include file: 'float.h'`），需安装 Visual Studio Build Tools 并勾选 Desktop development with C++。验证：

```shell
uv tool list
```

升级全局 CLI：

```shell
uv tool install crewai --upgrade
```

预期结果：`uv tool list` 里能看到 crewai。注意这条只升级全局 CLI，项目虚拟环境内的版本升级要另看官方 upgrading-crewai 文档。

4. 创建项目：

```shell
crewai create crew <project_name>
```

生成的结构：

```
my_project/
├── .gitignore
├── .env
├── agents/
│   └── researcher.jsonc
├── crew.jsonc
├── knowledge/
├── pyproject.toml
├── README.md
├── skills/
└── tools/
```

需要旧式结构（`crew.py`、`config/agents.yaml`、`config/tasks.yaml`）时：

```shell
crewai create crew <project_name> --classic
```

5. 定义智能体：编辑 `agents/*.jsonc`，写清 role / goal / backstory / llm / tools / settings。第一个角色可写成研究员：role 带 `{topic}`，goal 是 Uncover cutting-edge developments in `{topic}`，llm 用 `openai/gpt-4o`，tools 加 `SerperDevTool`，settings 开 verbose。第二个角色可写成报告分析员：goal 是 Create detailed reports based on `{topic}` data analysis and research findings，llm 用 `openai/gpt-4o`，settings 开 verbose。

6. 定义任务与流程：编辑 `crew.jsonc`。`{placeholder}` 占位符可用在 agent 与 task 文本里，缺值会在 `crewai run` 时被 CLI 提示补全。关键字段：`context` 把上游任务结果喂给下游；`output_file` 指定落盘路径；`markdown: true` 输出 Markdown；`process` 可换成 hierarchical——框架会自动加一个 manager 来规划、委派并验证结果。另有 `tools/` 下的自定义工具（以 `custom:<name>` 引用）、`knowledge/` 知识文件、`skills/` 技能文件。

7. 配密钥：在 `.env` 里填模型提供商的 API key；若用网页搜索工具，填 Serper.dev 的 key：

```
SERPER_API_KEY=YOUR_KEY_HERE
```

8. 安装依赖并运行（在项目目录内）：

```shell
crewai install
crewai run
```

需要额外包用 `uv add <package-name>`。预期：控制台打印执行过程，项目根目录生成 `output/report.md`。模型默认走 OpenAI API，也可按官方 LLM connections 文档接本地模型（Ollama、LM Studio）。

9. 需要精确控制时，把 Crew 包进 Flow 做事件驱动编排。组合逻辑：`or_` 任一条件满足就触发，`and_` 全部满足才触发，可与 `@start`、`@listen`、`@router` 搭配。

10. 让 AI 编码助手按 CrewAI 规范写代码（减少瞎猜 API）。Claude Code：

```shell
/plugin marketplace add crewAIInc/skills
/plugin install crewai-skills@crewai-plugins
/reload-plugins
```

Cursor、Codex、Windsurf 等：

```shell
npx skills add crewaiinc/skills
```

装上的四个 skill 分别负责：`getting-started`（脚手架、`LLM.call()`/`Agent`/`Crew`/`Flow` 选型、装配 `crew.jsonc`/`main.py`）、`design-agent`（role/goal/backstory/tools/LLM/memory/guardrails）、`design-task`（任务描述、依赖、结构化输出 `output_pydantic`/`output_json`、人工审核）、`ask-docs`（查 CrewAI 文档 MCP 服务器）。

11. 涉密场景关掉默认遥测——调研原文在这一步被截断，具体命令缺失。在从仓库文档拿到确切写法之前，不要在有敏感数据的机器上跑。

### 做法 G：把 issue → PR → 浏览器实测 → 合并 做成一条自动链路（cubefarm）

把这条路径当作待验证的候选：它把多 agent 分工、浏览器实测和 auto-merge 门禁写成了可执行流程，但只有 README 级证据（53 stars，没有基准或案例数据），不足以直接采用。

1. 先体检环境，确认下面几项都齐：

```bash
npx cubefarm doctor
```

前提：Node.js 22+、`git`、已登录的 `gh`、一个编码 agent 订阅、Google Chrome。缺一项都不要往下走。

2. 登录内置编码 agent（前提：有 Claude Code 订阅）：

```bash
npx cubefarm login
```

3. 想先不花钱、不改动任何东西地看看，用 demo 模式（伪造 GitHub 和 agent）：

```bash
npx cubefarm --demo
```

预期结果：能在界面里认清工位、白板、手机、经理电脑的位置，且不产生真实调用。

4. 正式启动办公室，它会在浏览器中打开：

```bash
npx cubefarm
```

首次 `npx` 会问是否安装 cubefarm，回答 yes。可选参数：

```bash
npx cubefarm --port 4400   # 换端口（默认 4317）
npx cubefarm --no-open     # 不自动打开浏览器
```

预期结果：浏览器里出现卡通 3D 办公室与从 backlog 到 merged 的 Kanban 白板。

5. 建公司：按向导输入你的名字、给公司命名、认识 CEO。

6. 搬入一个项目（前提：该项目必须在 GitHub 上，因为 issue 和 PR 是团队的工作方式）：选一个本地项目文件夹、一个 GitHub 仓库，或新建一个；每个项目获得自己的楼层。

7. 让 CEO 做规划：CEO 会研究项目、写 QA 检查清单、把工作规划成 GitHub issues，并提议招谁。按 `P` 打开手机与 CEO 对话、批准招聘。预期结果：出现一批 GitHub issues 和一份 QA 检查清单。

8. 观察与介入：开发者领 issue、开 PR；走到某 agent 工位后面可打开它的真实终端，直接输入干预。按团队整体或按单个 agent 选择编码 agent、模型和 effort。

9. 控制并发额度：所有 agent 共用同一个编码 agent 订阅的用量限额，在经理控制台里设置 session limit 来限制同时工作的 agent 数量；第一次试跑先设为 1–2。

10. 合并门禁：QA 在真实浏览器里审查和测试每个 PR，贴出带截图的报告；开启 auto-merge 后，QA 通过且 GitHub checks 全绿时 PR 自行合并。第一次试跑先不要开 auto-merge，人工确认每一份 QA 报告和 PR 差异。

11. 更新（`npx` 会一直用第一次下载的版本，启动时会提示有新版）：

```bash
npx cubefarm@latest
# 或永久安装
npm install -g cubefarm
cubefarm
```

安全边界：agent 在你机器上、以你自己的编码 agent 方式工作，沿用你的 skills、MCP servers 和 settings，各自在仓库的独立副本里；它们不能 push 到主分支，也不能合并——合并由办公室在 QA 之后执行。

界面操作键：`W A S D`/方向键走动，`Shift` 跑，鼠标环视（需先点击画面），`E` 使用当前看着的东西（工位/白板/电梯/经理电脑），`P` 手机，`H` 帮助，`Esc` 松开鼠标或关闭面板。

### 做法 H：worktree 隔离 + 项目记忆文件 + 提交前互评（Offrun 或手工照做）

把这条路径当作可迁移流程来试，而不是直接采用 Offrun 本身：调研结论是先在单个有 git 的仓库上小范围试三条流程——每个 agent 一个 worktree、项目记忆落成 conventions.md/plan.md/dead-ends.md、第二个 agent 在提交前读 diff 做评审——再决定是否长期用 Offrun。理由是这几条流程具体、可照做且不依赖工具存活，而 Offrun 自身的收益目前只有厂商自述，且限定 Apple Silicon Mac。

1. 前提：项目在 git 下。若用 Offrun：下载 Offrun，拖进 Applications；Settings → Agents 添加账号（Claude Code、Codex、AGY、Grok Build 等；有第二个账号也一并添加）。页面示例里的账号是 Claude Code（Default、Work 两个）、Codex（用 ChatGPT 登录）、AGY（用 Google 登录）、Grok Build（用 X 登录）。预期结果：能在工作区里看到已连接的 agent。

2. 让每个 agent 拿到独立 worktree：在 Offrun 里，选一个项目，给它一个任务；项目里的每个 agent 都有自己的 git worktree，同一 repo 的两个 agent 不会碰同一批文件。手工照做：

```bash
git worktree add ../repo-agent1 -b agent1
git worktree add ../repo-agent2 -b agent2
```

预期结果：可以同时跑重构和修 bug，各自分支，按你自己的节奏合并。注意与做法 B 的差异：做法 B 用 Docker 容器克隆仓库来隔离，做法 H 在同一仓库用 worktree，更轻，但隔离边界是文件系统路径而非容器。

3. 建立项目记忆（原文给了文件名和读写时机）：在项目文件夹里存纯文件，可打开、可编辑、可提交：

```
conventions.md   # 仓库级约定，每个 agent 都读
plan.md          # 这个功能的做法
dead-ends.md     # 试过、失败、记下来
```

agent 在每次会话开始时读这些上下文，在工作中写回。原文的意图是：第四个会话知道第一个会话已经试过什么。手工照做时，把这些文件提交进仓库，并在每次任务开始时在 prompt 里要求 agent 先读它们、结束时把失败尝试写回 dead-ends.md。预期结果：第二个同类会话不再重复解释约定、不再重复踩 dead-ends 里已有的坑。

4. 让第二个 agent 做提交前评审：挑一个 reviewer，它的发现在工作还没提交时就直接落到 chat 里；你可以让它按意见改，改动落到你的消息框里由你读。原文强调 Nothing merges on its own。示例输出（原文给的形态）：Review by Codex · changes requested；Warning in src/retry.js:2；The 30 second cap is longer than the gateway's 25 second timeout, so the last retry is cut off。预期结果：评审抓的是跨文件约束（如上限与上游超时不一致），而不是格式挑刺。手工照做时，在提交前把 diff 交给另一个 agent，让它只找会改的实质问题。

5. 撞限额时切换登录：给不同 agent 指向不同登录；某个登录到限额后，Offrun 把 chat 移到还有余量的登录并告知；你重发消息，新登录接续整段对话；没有可用登录时它提议换另一个 agent。原文示例文案：Claude Code resets 3am. Codex can pick up this chat. It gets the whole conversation. 预期结果：等待限额的时间下降，对话不丢。

6. 按需要切换模式：Build —— 做出改动并运行以证明它能工作；Planner —— 只想出做法并写下来，不改任何文件。任意 chat 可随时切换。手工照做：需要「证明能跑通」时要求 agent 运行测试/命令；只需要方案时明确说「只写方案，不改文件」。

7. 开通知（Offrun）：Offrun 监听 Mac 上任何位置的编码 agent，包括它没启动的终端里的；agent 完成或停下来提问时通知你。原文示例：Codex needs your approval — Run npm install in billing-svc；Claude is waiting — Shall I push the tag for 2.4.0?。

8. 在 chat 旁边读产出：改动文件、带行号的 diff、渲染后的 markdown 和表格、图片、PDF，还有一个小浏览器。

9. 本地听写（可选，Offrun）：按住键说话，本机转写，按你代码的拼写纠正术语；可以针对词条加 voice sample（示例：mac book→MacBook、jason→JSON、retry backoff helper→retryBackoffHelper、Kubernetes）。原文称转写完全在本机、不录音不上传。

10. 数据边界（原文有一张明示表）：留在本机的是听写和项目文件；memory、chats、worktrees 在项目文件夹里；离开本机的是 agent 提示词和代码，直接发往你自己的 Anthropic / OpenAI / Google / xAI 账号；Offrun 服务器不在路径中。

### 做法 I：用 cmux 把并行 agent 的等待变成可路由通知（macOS）

把这条路径当作「注意力路由」的候选：它给的是终端、浏览器、通知、workspace、分屏、tab 和 CLI；作者明确说 cmux is a primitive, not a solution。它不替代验证、记忆和评审，只解决「哪个 agent 在等我」。

1. 安装。推荐 DMG：从 releases 页下载 `cmux-macos.dmg`，拖入 Applications，之后靠 Sparkle 自动更新，只需下载一次。或用 Homebrew：

```bash
brew tap manaflow-ai/cmux
brew install --cask cmux
brew upgrade --cask cmux
```

预期结果：macOS 原生终端可用，读取你已有的 Ghostty 配置（主题、字体、颜色、cursor）。首次启动 macOS 可能提示「来自已验证开发者」，点 Open 继续。想同时保留稳定版、另测每日构建，可下载 NIGHTLY（独立 bundle ID，可与稳定版并存，有自己的 Sparkle 更新源）。

2. 接入 agent hooks（前提：agent CLI 已装且 binary 在 PATH 上）：

```bash
cmux hooks setup
cmux hooks setup codex
cmux hooks setup --agent opencode
```

预期结果：`cmux hooks setup` 会自动装它能找到的受支持 agent，并对跳过的 agent 打印摘要。Claude Code 由 cmux 的 Claude wrapper 处理（需在 Settings 中开启 Claude 集成）。

3. 把「agent 在等我」变成可见信号。两条路径任选：自动：任何发 OSC 9/99/777 转义序列的进程都会触发 pane 蓝环、侧栏未读徽标、通知弹窗和 macOS 桌面通知；手动/钩子：用 `cmux notify` 接进 agent hooks。配套快捷键：

| 快捷键 | 动作 |
|---|---|
| ⌘⇧U | 跳到最新未读 |
| ⌘I | 打开通知面板 |
| ⌥⌘U | 切换当前项未读状态 |
| ⌃⌘U | 把当前项标为最旧未读并跳到下一个最新未读 |
| 默认未绑定 | 全部标已读 / 全部清除，需在 Settings 或 cmux.json 中配 |

4. 一键跑 Claude Code teammate 模式：

```bash
cmux claude-teams
```

预期结果：teammate 以原生分屏形式出现，带侧栏元数据和通知，不需要 tmux。

5. 远程机器上跑 agent、本地驱动：

```bash
cmux ssh user@remote
cmux ssh user@remote --command 'omp investigate auth'
```

要点：`--command` 只在第一个远程终端的第一个终端里运行一次；浏览器 pane 走远程网络，所以 localhost 直接可用；把图片拖进远程会话会通过 scp 上传。

6. 关掉「重开时自动跑 agent 恢复命令」（保留布局恢复）。配置 `~/.config/cmux/cmux.json`：

```json
{
  "terminal": {
    "autoResumeAgentSessions": false
  }
}
```

或关闭 Settings > Terminal > Resume Agent Sessions on Reopen。注意：这只关掉自动恢复命令；cmux 仍会恢复布局、工作目录、scrollback 和浏览器历史。

7. 手动恢复上一次会话：File > Reopen Previous Session、⌘⇧O，或：

```bash
cmux restore-session
```

8. 跨安装迁移（stable / nightly / rc / staging / debug）：

```bash
cmux restore-session --from nightly
cmux restore-session --export ~/session.json
cmux restore-session --export ~/session.json --force
cmux restore-session --from ~/session.json
```

行为差异（照做前必须理解）：`--from <channel>` 按「你自己会话」同等信任恢复，包括自动 agent 恢复；`--from <path>` 视为不可信，只恢复布局、工作目录、文本 scrollback 和 http(s) 浏览器 tab，文件里任何东西都不会自动运行；内置 agent（Claude Code、Codex、Amp 等）用 cmux 依据 agent 种类 + session id 自己拼出的命令恢复，忽略文件里存的启动参数，且要求工作目录已存在；自定义 agent 恢复命令、resume 绑定、tmux 启动命令只保留供手动恢复；会被丢弃：scrollback 里的终端控制序列（剪贴板、通知、链接、标题）、草稿附件、非 http(s) 页面与 profile、SSH/云连接、workspace 环境变量；更新版本写的快照（较新 session 格式）会被拒绝并报错。

9. 给任意工具绑定自定义「恢复命令」（适用于自带持久状态、不需要 cmux 猜的工具，如 tmux 会话、自定义 agent CLI）：

```bash
cmux surface resume set --kind tmux --checkpoint work --shell 'tmux attach -t work'
cmux surface resume show --json
cmux surface resume clear --checkpoint work
```

信任规则：绑定附着在具体 cmux surface 上；公开 CLI 或 socket 创建的绑定只会被存储、供检视与手动恢复，除非你批准一个签名命令前缀才自动恢复；批准的前缀还会绑定工作目录与精确环境值（若存在）；可在 Settings > Terminal > Resume Commands 审阅或修改；cmux 只自动运行它标记为可信的绑定（如活进程探测到的 tmux 绑定，或用户批准的前缀）；token、password、secret、API key 等敏感环境键在存储绑定前会被丢弃。

10. 让 agent 活过 cmux 退出/崩溃/更新：

```bash
cmux local-tmux
cmux local-zellij
```

边界：本机 tmux server 活不过 logout、重启、关机或断电；需要「这台 Mac 离线时进程仍在」时，改用 `cmux ssh-tmux`、`cmux mosh-tmux` 或持久云 VM。

11. 大仓库 / 托管 Mac 上的进程 churn 缓解：如果 shell watcher 抖动或托管 Mac 进程审计量过大，使用 README 点名的缓解开关：

```
CMUX_NO_GIT_WATCH=1
```

代价是 Git/PR 更新会受影响（细节在 `docs/shell-integration.md`）。

12. 其他可配置项（README 提及但细节在外链文档）：自定义命令可在 `cmux.json` 里定义项目专属动作，从命令面板启动；浏览器导入可从 Chrome、Firefox、Arc 等 20+ 浏览器导入 cookie、历史、会话，让浏览器 pane 开局就是已登录态；浏览器自动化给 agent 用（snapshot 可访问性树、取元素 ref、点击、填表、求值 JS、读 console/network）；外观见 `docs/customizing-appearance.md`，配置为 `~/.config/cmux/cmux.json`；Skills 可复用 agent 工作流，公开集合在 `cmux-skills` 仓库。

### 做法 J：把「另一个 agent 在同一 commit 上验证通过才算完成」做成状态机（pullboard）

把这条路径当作可试验证收益的候选：它把「第二个智能体验证通过才算完成」做成了可强制执行的状态机，并给出了可直接复制的命令与配置（MIT、本地运行、不调用模型），但项目很小（41 stars）、Windows 未测试、部分功能仍在 planned，适合先在小范围试。

1. 先看一遍闭环（在一次性/临时仓库上跑）。前提：本机有 git 和 Node 22.13 或更新版本。

```sh
npm i -g pullboard
pullboard tour
```

预期结果：tour 里你会批准一条规则（空名字按 "world" 问候）：coordinator 建条目 → builder 构建 → verifier 试空名字并驳回 → builder 修复并加测试 → verifier 故意破坏修复、看到测试失败、然后接受 → coordinator 带 receipt 合并。

2. 在自己的仓库初始化。`init` 会写入 spec、doctrine、agent 指令，并安装 hooks 和看板。

```sh
pullboard init
git add -A && git commit -m "chore(repo): set up pullboard"
```

预期结果：提交它写出来的文件后，在该目录打开一个 Claude Code 会话并说明要构建什么；这个 agent 就成为 coordinator（与你一起定 spec、规划 lanes 和 items、每条 lane 跑一个 builder，另跑一个没参与构建的 verifier，只合并已验证的工作）。

3. 写 `SPEC.md`，一行一个需求，格式固定：

```
- <id> [<status>, <priority>] <what must be true> | gate: <what proves it>
```

例：

```markdown
- G1 [approved, must] A shopper can pay by card in one step. | gate: test/checkout.test.js
- G2 [draft, aim] Saved carts follow a shopper across devices. | serves: G1
```

要点：id 是「段字母 + 数字」；行在你批准前是 draft，只有 approved 的行算数；agent 认领该工作时这一行的验收标准会被冻结（frozen）。

4. 配置 gate 和 lanes（`pullboard.json`）。gate 是任何能证明你代码的命令，在每次 submit 和 push 前运行；每条 lane 拥有若干路径和 spec 段，提交超出自己 lane 的路径会被拒绝。

```json
{
  "gate": "npm test",
  "lanes": {
    "web": { "owns": ["apps/web/"], "specs": ["G"] },
    "review": { "owns": [] }
  }
}
```

按技术栈选 gate（可用 `&&` 串起来，如 `ruff check . && pytest`）：

| 技术栈 | Gate |
| --- | --- |
| JavaScript, TypeScript | `npm test` |
| Python | `pytest` |
| Go | `go test ./...` |
| Rust | `cargo test` |
| Java | `mvn test` 或 `gradle test` |
| Ruby | `bundle exec rspec` |
| C#, .NET | `dotnet test` |

5. 手工走一遍（不依赖 agent，coordinator 做的每一步你都能自己做）。先建条目：

```sh
pullboard add web "Checkout" --specs G1 --criterion "card payment takes one step"
```

6. builder 侧认领并提交。前提：每条 lane 一个 worktree。

```sh
pullboard worktree web
cd ../myapp-web-1
pullboard next
pullboard submit 1
```

预期结果：builder 认领条目、提交时在 commit message 里引用需求行（如 `feat(web): pay by card [G1]`），并在 gate 绿的情况下提交。

7. verifier 侧验证。必须是另一个 agent，且它没有构建过这个条目；它 checkout 到那个确切的 commit。

```sh
pullboard worktree review
cd ../myapp-review-1
pullboard next --verify
pullboard verify 1 accept --note "paid in one step; without the fix the test fails"
```

接受时要给证据（「没有这个修复测试就会失败」），驳回要给理由。

8. 看板查看与人机接口。

```sh
pullboard view
```

预期结果："Needs you" 只显示只有你能做的决定（上升上来的决策、待批准的行、被 hold 的 lane）；Timeline 显示每个条目的 claim / submit / verdict 和驳回理由；Actions 可加条目、回答决策、shout 到某条 lane、hold 一条 lane；它跑在 local API v1 上，你自己的脚本也能用；`view --export` 写出静态可回放快照。

9. 与 agent 协作的常用命令：`pullboard worktree`（建 lane worktree 并打印给子 agent 的首条指令）、`pullboard resume`（agent 重启后回到它的 claim、消息和下一步）、`pullboard next`（认领下一个空闲条目，绝不抢别人已持有的）、`pullboard run`（让更轻的模型无人值守构建简单条目）、`pullboard prompt <role>`。Claude Code 会获得 skills；Codex 及其他 agent 读 `AGENTS.md` 或 `pullboard prompt <role>`。

10. 建议的协作方式（README 写成 recommended best practice）：只和一个 agent（你的 coordinator）深度工作，由它把工作扇出到各 lane 并写下你的偏好，这样你不需要解释两次；始终让一个 agent 领导其他 agent。

11. doctrine 与数据位置：doctrine 写在 `PRACTICE.md`（「我们怎么构建」，例："We do not store credit cards."），每个 repo 从 Pullboard 标准 doctrine 开始，可以追加、覆盖或拒绝任何一条；机器能检查的由 hooks 强制。`SPEC.md`、`PRACTICE.md`、`pullboard.json`、`AGENTS.md` 和 git hooks 在主检出里；看板是放在 `.git` 里的一个 SQLite 文件，被所有 worktree 共享、从不提交；已提交的工作在 git 里 pin 住；`pullboard export` 备份整个看板。

12. 条目状态机（决定「什么时候算完成」）：每条从 open 开始 → 被认领则 claimed（agent 沉默则重新 open）→ 提交后 submitted → verifier 接受变 verified，驳回则回到 open；只有 coordinator 能 withdraw；声明（`src/machine.js`）不允许的动作看板会拒绝。

### 做法 K：把多项目的派工、状态与评审关卡收进一个控制台（claude-console）

把这条路径当作待验证的候选：安装命令、配置键表、`dispatch.json` 结构与状态卡格式都可直接照做，但仓库仅 53 stars、版本 0.15.x，且强依赖特定 Claude Code 版本和你自己维护的注册表/STATUS 卡约定，适合先挑一两个可回滚的项目试。

前提：Windows 或 macOS；Claude Code 2.1.289 或更高且支持 mod；每个项目在注册表里有一项、并有一个 STATUS 文件。若要用 Codex 执行者，还需要 Node.js、Codex Companion 和一个 Codex 账号（Windows 探测需要 PowerShell 和 Codex 桌面应用，macOS 需要 PATH 上有 `codex` CLI）。

1. 安装（在 Claude Code 里执行；在本地 checkout 里安装则把第一行换成 `claude plugin marketplace add .`）：

```powershell
claude plugin marketplace add SaM-runtime/claude-console
claude plugin install console-status@claude-console
```

2. 先只看不接：任意 Claude Code 会话里运行 `/console demo` 看整块面板（不需要 registry），`/console refresh` 回到真实状态。

3. 配置插件。前提：先决定 `registryPath` 指向放项目注册表的 Markdown 文件（默认 `~/.claude/handoffs/projects-scope.md`）。值是单行字符串，未指定的保持原值，改完运行 `/reload-plugins` 或另开一个 Claude Code 会话：

```powershell
@'
{
  "registryPath": "C:\\Projects\\console\\projects-scope.md",
  "dispatchSettingsPath": "~/.claude/handoffs/dispatch.json",
  "claudeSessionsPath": "~/.claude/handoffs/claude-sessions.json",
  "executor": "claude",
  "codexFallback": "ask",
  "codexMinQuotaPercent": "10",
  "gitProbe": "on",
  "commandGuard": "ask",
  "loopGuard": "on",
  "autoSync": "on",
  "suggestNext": "on",
  "activation": "auto",
  "projectMode": "auto"
}
'@ | claude plugin configure console-status@claude-console --values-stdin
```

预期结果：这些键被写进插件配置；未指定的项保持原值。其余可配置项（默认值）：`dispatchSettingsPath`、`claudeSessionsPath`、`executor=claude`、`defaultModel`/`defaultEffort` 空、`companionScript` 空（空或失效路径会自动解析到最新安装的 Codex 插件）、`companionStateDir`（系统 Temp 的 codex-companion）、`companionStateRoots`（插件 data 优先，其次旧 Temp）、`modelsCachePath=~/.codex/models_cache.json`、`codexFallback=ask`、`codexMinQuotaPercent=10`、`cacheHint=on`、`cacheTtl=auto`、`cacheWritePrice` 空。

4. 建注册表与 STATUS 卡。注册表是「名字 → STATUS 文件」的 Markdown 映射，可带一列 Executor（`claude`/`codex`/`manual`/留空）；仓库给了 `workflow/projects-scope.example.md` 作例子。每个 STATUS 文件里只有一个机器可读块，用 `<!-- CARD -->` 和 `<!-- /CARD -->` 包住、不超过十行，解析器识别模板里的繁体键：`更新`、`狀態`、`驗證`、`等使用者`、`下一步`、`關卡`。`關卡` 写 `無`、`spec：…`、`review：…` 或 `release：…`；未知的非空关卡文本也会阻止继续。Git 项目里可以放在 `.console/STATUS.md`，并在该项目的 `.git/info/exclude` 里排除，保持本地。

5. 设派工（全局 + 每项目）。文件是 `~/.claude/handoffs/dispatch.json`：

```json
{
  "executor": "claude", "model": "", "effort": "",
  "projects": {
    "D:/Projects/api": { "executor": "codex", "model": "", "effort": "high" },
    "D:/Projects/legacy-portal": { "executor": "manual" }
  }
}
```

执行者解析顺序：面板覆盖（`projects["<root>"]`，Windows 盘符与 UNC 路径大小写不敏感）> 注册表 Executor 列 > 全局 `executor`。model 与 effort 同链条解析，但「执行者与全局不同的项目不继承全局 model/effort」。`manual` 表示面板永不派工：同步与继续按钮隐藏，卡片显示交接说明，但 CARD、验证、决策和关卡仍可用。0.1 版没有 `projects` 的平铺文件继续可用；`dispatch.json` 缺失时只读相邻的旧 `codex-dispatch.json`，写入一律进 `dispatch.json`。

6. 给同步配便宜模型（同步只写 CARD 和历史）：

```json
{
  "executor": "claude", "model": "opus", "effort": "high",
  "sync": { "claude": { "model": "haiku" }, "codex": { "model": "luna", "effort": "low" }, "session": "fresh" },
  "projects": { "D:/Work/Beta": { "sync": { "session": "resume" } } }
}
```

模型名是自由文本，写你账号有的即可；空字段回落到普通派工的模型/effort，项目级 `sync` 覆盖全局。`session: fresh` 会开一个小会话，只读 STATUS.md、`git log`/`git status` 和执行者摘要，并被告知只写这些看到的内容；Claude 侧配了自己的同步模型时默认走 `fresh`，Codex 保持 `resume`。用了独立同步模型时界面会写明，例如 `（用 haiku・新 session）`。

7. 日常操作：右键或按 `m`（光标所在行）打开动作菜单，Esc 关闭。动作键：`v` 验证、`s` 同步 STATUS、`c` 继续下一步（仍需六秒内第二次按键）、`r` 回覆执行者、`d` 做決定、`g` 关卡评审/终审、`o` 打开 STATUS.md、`p` 打开 PR。菜单开着时数字键按顺序回答待决事项（先按 `2` 再按 `1` 会读作 `1B 2-1`），Backspace 撤销上一个选择；`✎ 填入決策` 把已选答案填进输入框，Enter 发送。

8. 回覆停下提问的执行者：菜单里选 `↩ 回覆執行者`，输入框会被填成 `/console reply <project> `，写上答复按 Enter，控制台用你的话作提示继续那个会话（不必 attach）。仍在等权限批准（`等待批准`）的执行者需要 attach 处理。

9. 命令速查：

```text
/console executor
/console executor claude
/console model
/console model <name>
/console effort <level>
/console sync-model [claude|codex] <name>
/console sync-effort [claude|codex] <level>
/console sync-session fresh|resume
/console project executor|model|effort <value|inherit> <project name>
/console project
/console update
```

`/console model ""` 或 `/console effort ""` 恢复所选执行者的默认。Claude 侧模型按钮给别名 `fable`/`opus`/`sonnet`/`haiku`，effort 选项 `low`/`medium`/`high`/`xhigh`/`max`；置空则交给 Claude Code 决定。设置只影响下一次派工，正在跑的任务保持它请求的值。

10. 让手动派工的会话也遵守同一份设置，把下面这段贴进用户 `CLAUDE.md`：

```markdown
## Dispatch settings
Before dispatching to any executor, read ~/.claude/handoffs/dispatch.json
(if it is missing, read ~/.claude/handoffs/codex-dispatch.json; never write it).
- Global: "executor" (claude | codex), "model", "effort".
- Per project: "projects"["<project root>"] may set "executor"
  (claude | codex | manual), "model", "effort". Match the root case-insensitively
  on Windows. Precedence: projects entry > registry Executor column > global.
- Pass each nonempty model/effort as one --model / --effort argument; omit empty ones.
- "manual" means: never dispatch that project; prepare a handoff for the user instead.
```

11. 护栏：`commandGuard: ask`（默认）时不可撤销命令（`rm -r`、force push、`git reset --hard`、`DROP TABLE` 等）先问；`deny` 直接拒绝；`off` 关闭。`loopGuard` 默认 on：同一参数同一错误的工具调用失败两次后，模型被告知不要试第三次。

12. 控制台只在你要的地方生效：`activation: auto`（默认）下只有你运行过 `/console` 的会话（以及它 resume 后）运行控制台，其他会话只拿到命令护栏；在已注册项目目录里开的会话自动切到项目模式（`projectMode: auto`）。

13. 升级：页脚显示已装版本，有新版本时按 `⬆ 更新` 或运行 `/console update`。逐版本变更见仓库 `CHANGELOG.md`。

**Git/PR/CI（可选，`gitProbe` 默认 on）**：每次刷新在每个项目根跑 `git status --porcelain=v2 --branch --show-stash`（带 `--no-optional-locks`，不抢执行者需要的 index 锁）；装了 `gh` 并登录时，`gh pr view` 读当前分支 PR 与检查，每五分钟一次、检查还在跑时每分钟一次、强制刷新或分支变化时也读。设 `gitProbe: git` 跳过 GitHub，设 `off` 两者都跳过。冲突（`✕衝突n`）、CI 失败（`CI✕n`，状态带变红）、未提交（`●n`）、未推送（`↑n`）、落后上游（`↓n`）显示在 Git 列；`▸ 檔案`（菜单里 `f`）按 `git status` 的分组展开文件列表，每组最多 12 个。`提交` 字段显示最近三到五条提交；最后一次 `git fetch` 超过一天会提示 ahead/behind 可能过期。

### 做法 L：用一个终端 daemon + dashboard 管住并行 agent 的可见性与权限（nsq / neurosquad-cli）

把这条路径当作 0.1.0 preview 来试，而不是直接纳入日常：README 给了可直接复制的安装、启动、回答与成本命令，也明确支持 Claude Code、Codex、OpenCode（1.x 与 2.x）以及任意命令；但命令与配置在 1.0 前可能变化，且没有给出任何改善幅度的量化指标。

前提：Node.js 22.13 或更新；要使用 Claude Code / Codex / OpenCode 之一，需该 CLI 自身已登录，或改走 OpenRouter / 自建模型服务器；`--worktree` 只在 git 仓库里生效。

1. 安装（二选一；`npx` 方式无需安装）：

```sh
npm install -g neurosquad      # then run: nsq
npx neurosquad                 # or try it without installing
```

2. 在代码仓库里启动 agent。前提是该目录是 git 仓库（`--worktree` 才会生效）。`--worktree` 会给该 agent 一份独立 checkout，分支名为 `nsq/<name>`，避免多个并行 agent 互相踩：

```sh
cd ~/code/my-app
nsq run claude "fix the flaky checkout test" --worktree   # an agent on its own branch
nsq run codex --name reviewer                             # a second agent
nsq run -- npm run dev                                    # any command, as an agent
nsq                                                       # the dashboard
```

注意：`nsq run -- <command>` 这种任意命令没有 hooks，只能显示 working / finished，永远不会出现 “needs you”。

3. 在 dashboard 里操作：方向键（或 h j k l / Tab）选择 agent，**Enter** 进入全屏（此后所有按键都发给该 agent），**Ctrl+]** 回到网格。agent 弹出权限问题时，不进去也能按 **y**（yes）/ **a**（always）/ **n**（no）回答；**i** 中断、**s** 发送提示、**S** 在当前回合结束后再发送；**q** 关闭 dashboard 而 agent 继续跑。

4. 让 agent 脱离窗口存活：关闭 dashboard 或终端都不影响，daemon 一直持有它们。停止与恢复：

```sh
nsq down            # 停止 daemon（及其 agent）
nsq up              # 或直接 nsq；按各自 session 恢复，重启机器后也可
```

5. 用脚本化接口做无人看护 / 流水线（README 明确说 dashboard 里能做的都能脚本化）：

```sh
nsq ls --json                       # agents and their status
nsq send <agent> "prompt" [--when-done]   # 当前回合结束后再发送
nsq answer <agent> yes|always|no    # 回答权限询问
nsq peek <agent> [-n 20]            # 看它屏幕的最后几行
nsq diff <agent>                    # 其目录下的未提交改动（git diff HEAD）
nsq cost [--since 7d] [--json]      # 每个 agent 花了多少
```

6. 接模型（前提：想跨 CLI 换模型时）。OpenRouter key 存 OS keyring，也可用环境变量 `OPENROUTER_API_KEY`；key 只进 agent 的环境，不进 argv、日志或文件：

```sh
nsq openrouter set-key                 # stored in the OS keyring (or set OPENROUTER_API_KEY)
nsq run claude --provider openrouter --model anthropic/claude-sonnet-4.5
nsq openrouter models qwen             # search the catalogue
```

7. 接自己的模型服务器（llama.cpp、Ollama、LM Studio、vLLM、SGLang、Unsloth Studio 或任意 OpenAI/Anthropic 兼容 API）。`provider add` 会先做连通性测试：

```sh
nsq provider add lmstudio --url http://localhost:1234      # tests it: models, which APIs it speaks
nsq run claude --provider lmstudio --model qwen/qwen3-coder-30b
nsq provider models lmstudio
nsq provider list · nsq provider test|remove <name>
```

Claude Code 走该服务器的 Anthropic endpoint，Codex 走 Responses endpoint（或经本地网关走 chat completions），OpenCode 两种都行；key 无回显读取并存入 OS keyring，这类请求显示 “no price”。

8. 手机端（experimental，默认关闭；README 反复提示链接携带 pairing token，当作密码对待）：

```sh
nsq phone on --lan     # off by default; without --lan it listens on this machine only
nsq phone pair         # prints the link and a QR code — scan it with the phone
nsq phone on --online  # from anywhere: an https link through a Cloudflare quick tunnel
nsq phone push ntfy    # optional: a push via ntfy when an agent needs you
```

手机上可见 agent 与其屏幕、发提示、回答权限询问、中断；不能启动 agent、改设置或敲任意键。`nsq phone rotate` 让所有手机登出，`nsq phone off` 关闭。

9. 语音听写：dashboard 里按 **v**（或默认全局热键 `Ctrl+Shift+Space` / `Cmd+Shift+Space`）说话，识别在**本机**完成，文本只粘贴进输入框、不会自动提交，需你按 Enter。首次按 v 或执行 `nsq dictation setup` 会下载约 670 MB 模型（SHA-256 校验）；Windows arm64 不可用。

10. 配置与体检：

```sh
nsq config set autoUpdate false      # 也可 NSQ_NO_UPDATE=1 关掉更新检查
nsq doctor                            # check harnesses, hooks, terminal, updates
nsq set <agent> [--dangerous on|off] [--model id|none] [--provider name|openrouter|none]
```

默认自动更新：npm/Homebrew/Scoop 安装的会在后台装新版本，并在“不会丢东西”（没有忙碌 agent、没有打开的 dashboard、每个 agent 都能 resume）时切换，或按 **U** 立即切换。

### 通用收尾：不管走哪条路径

- 开始前先固定「完成」的定义（哪条测试通过、谁来复核、在哪里看结果），不要只依赖 agent 的自证。
- 代码类任务一律把测试或 lint 作为合入门槛，而不是事后补检查。
- 保留可复现的随机种子或赛程记录，便于不同规模之间做对比。
- 多步流水线一定要求产物落盘（如 `output_file`），否则你无法核对，也无法复用。
- 带自动合并能力的链路（如做法 G 的 auto-merge），先用人工确认跑过 3–5 个真实 issue，再考虑对低风险改动打开。
- 做法 H 的同行评审不要只看风格；让它明确读 diff 找跨文件约束冲突，并把结论落到 chat 里由你判断，不要自动合并。
- 做法 I 的通知环只负责把「谁在等我」变得可见；看到通知后仍要回到验证、记忆和评审，不要让通知替代合入门槛。
- 做法 J 的 verifier 必须是没参与构建该条目的另一个 agent，并在确切 commit 上给出证据；worktree 身份不是安全边界，不要拿它当权限隔离。
- 做法 K 的看板状态来自你自己维护的注册表与 STATUS 卡；刷新只查本地文件和 CLI、不请求模型，卡上写错了它不会替你纠正。
- 做法 L 的 daemon/dashboard 解决的是「agent 在不在跑、要不要你、花了多少」；它不替代验证、记忆和评审，权限回答快不等于产出可合入。

## 怎么判断变好了

**可观察的指标**

- 做法 A：最后那次与旧答案的盲评比分（技能会直接报，包括旧答案赢的情况）；冠军「扛过的攻击」里有多少条 FATAL / MAJOR 指向你原本没写进要求、但确实在意的缺口；你实际是否采用了它的输出（采用 / 部分采用 / 弃用）以及用了多少修改；实际 token 开销 vs `bracket.py plan --quick` 的预估（91 次调用）；代码类任务另加客观项——应用 diff 后测试 / lint 是否通过。
- 做法 B：合入 `main` 前的测试通过率；`FARM_VERIFY_CMD` 失败回注后子代理是否收敛；`clodfarm agents` / `budget` 显示的用量是否被节流在 5 小时窗口 85%、周窗口 80% 以内（不烧穿配额）。
- 做法 C：手动切换终端和人工传话的次数是否真的下降；`rig ps --nodes` 是否还有未解决的认证、信任或权限提示；恢复后逐节点报告的 resumed / fresh / failed 是否符合预期。
- 做法 D：同一任务三轮对照（普通 prompt / 加 `ulw` / 加 `mass ulw`），每轮从同一个干净分支或干净工作区开始，记录返工次数与人工介入次数。注意这三轮本身才是证据，README 的好评不是。
- 做法 E：`make doctor` 是否能无阻断跑完；能否跑通一个最小任务（受限于原文截断，skills / sub-agents / scheduled tasks 的用法需自行查仓库文档）。
- 做法 F：`output/report.md` 是否真的落盘、内容能不能直接用（采用 / 部分采用 / 弃用）；下游任务拿到的到底是不是上游的结果（`context` 是否真的接上了）；需要你手动返工几轮；`{placeholder}` 是否按预期被注入。
- 做法 G：QA 报告的真阳性率（它标出的问题里，多少经人工复核确认是真问题）；QA 通过的 PR 中人工复核后确实可用的比例（漏检率）；同一类 issue 从开单到合并的周期时间 vs 你自己动手的基线；每个 issue 消耗的订阅用量；每个 PR 你要动手改多少、终端里介入多少次；开启 auto-merge 后是否出现被合入但需要回滚的改动。
- 做法 H：并行任务时文件互相覆盖/冲突的次数（期望 0）；第二个同类会话的返工量——是否还要重复解释约定、是否重复踩 dead-ends 里已有的坑；同行评审提出的问题里，你判断有效（会改）的比例，以及误报率；撞到用量限额导致的等待时间是否下降（切登录后能否无缝继续）。
- 做法 I：从 agent 等待输入到人响应的时间；漏掉通知导致 agent 空转的时长；手动在终端里寻找 pane 的次数；通知环、侧栏未读徽标、通知面板是否能可靠触发；⌘⇧U 跳转是否真的减少切换成本；恢复会话后布局、工作目录、scrollback 和浏览器历史是否保留；`cmux hooks setup` 后受支持 agent 是否能按预期恢复；跨安装迁移时 `--from <channel>` 与 `--from <path>` 的信任差异是否符合预期；本机 `local-tmux` 撑不过 logout/重启/关机/断电这一边界是否被团队知道。
- 做法 J：每条条目是否都有 gate 绿 + verifier 的 accept/reject receipt；你仓库里的返工比例（原文称自家开发 Pullboard 时 "nearly one in three items goes back"）是多少；Timeline 里每条目的 claim / submit / verdict 是否完整；越界提交是否被 lane 的 `owns` 授权拒绝；"Needs you" 里出现的是不是只有你能做的决定；verifier 抓到的驳回理由里有多少是你事后确认有效的问题。
- 新增做法 K：面板上「● 待决策」「◆ 待评审」的条目从出现到你处理完的时间；你实际同时盯的窗口/终端数 vs 只看面板；autoSync 写回 CARD 后你是否还需要手工记状态；`關卡` 是否真的拦住了没清空的条目；Git 列里的冲突/CI 失败/未提交/未推送/落后上游是否比你手工发现得更早；刷新时是否产生模型调用（原文称刷新只查本地文件和 CLI）；被 `commandGuard` 拦下的不可撤销命令次数、`loopGuard` 阻止重复失败调用的次数。注意「减少盯盘」目前只是作者主张，要你自己前后对照。
- 新增做法 L：从 agent 需要你到人响应的时间；漏掉通知导致空转的时长；关掉 dashboard 或终端后 agent 是否继续跑、`nsq up` 后是否按各自 session 恢复；`nsq ls --json` 的状态是否与屏幕一致；`nsq cost` 是否读得到 token、无已知价格的模型是否显示 “no price” 而不是 $0；`nsq diff` 是否能看出该 agent 未提交改动；`nsq peek` 是否能不看全屏就判断它在做什么；`nsq doctor` 是否能无阻断跑完；手机上能否看屏幕、发提示、回答权限、中断；`nsq run --` 的任意命令是否如预期只显示 working / finished。README 没有给出改善幅度的量化指标，这些都要你自己前后对照。

**最小试用**

- 做法 A：装好后挑 1–2 个你确实问过、确实不满意的真实任务（最好一个写文案类、一个代码类），跑 `/arena --quick --seed 7 <把任务写具体>`，并用 `--baseline-file` 把被拒的旧答案传进去。16 个 agent / 4 轮 / 91 次调用，是能承受的最小完整形态。
- 做法 B：单机 + 小仓库 + 一条已有的测试命令，先验证 1–2 个编码任务，再决定是否铺开。
- 做法 C：`rig setup --dry-run` + 一个仓库里的两座位 starter，只跑一个有界的「实现 + 独立复核」任务。
- 做法 D：半天内在一台可弃用机器上跑完三轮对照。
- 做法 E：先走 `make setup` → `make doctor` → `make docker-start`，确认能起来再谈能力面。
- 做法 F：把手头一个「多步资料整理 → 成文」的活改写成 researcher + reporting_analyst 两个角色的 Crew，`crewai install` → `crewai run`，只看一件事：`output/report.md` 能不能直接用、你要改多少。
- 做法 G：`npx cubefarm doctor` 确认环境齐全 → `npx cubefarm --demo` 走一遍界面 → 选一个低风险、已有测试基础的小仓库接入，把 session limit 设为 1–2 → 先关闭 auto-merge，人工确认每一份 QA 报告和 PR 差异，跑 3–5 个真实 issue。
- 做法 H：半天到一天，一个仓库。装好 Offrun（或手工照做），接两个你已有的 agent 账号（至少 Claude Code 加另一个），挑一个有 git、且有能跑的测试的 repo。别一次全上，只试两件事：隔离（同一 repo 同时开两个任务——一个重构、一个修 bug，确认两个 worktree 不互相改文件，各自分支能分别合并）；记忆（手工建 conventions.md / plan.md / dead-ends.md，把仓库约定和不许再试的死路写进去，开第二个会话时确认 agent 是否真读了，以及失败尝试是否被写回 dead-ends.md）。再试同行评审：让另一个 agent 在提交前读 diff，重点看它能不能抓到跨文件的数值/契约冲突（如上限与上游超时不一致这类）。
- 做法 I：在 macOS 上装好 cmux，跑 `cmux hooks setup`，开 2–3 个终端型 agent（例如一个 Claude Code、一个 Codex），用 `cmux notify` 或让 agent hooks 触发通知，试 ⌘⇧U、⌘I 和通知面板；只在一两个真实任务上试半天到一天，观察「谁在等我」是否真的更快被处理。
- 做法 J（半天内可完成）：先在一次性仓库跑 `npm i -g pullboard && pullboard tour`，确认你理解「提交—驳回—修复—复验—合并」的节奏；再选一个真实小仓库，`pullboard init` 并提交它写出的文件，只写 1–3 行 approved 的 SPEC.md，设一个真实的 gate（如 `pytest` 或 `npm test`），配 1 条 builder lane + 1 条 review lane；然后用 2–3 个小条目走完整流程：`add` → builder `worktree/next/submit` → 另一个 agent `next --verify` → `verify ... accept/reject`。
- 新增做法 K（半天内可完成）：按 README 两条命令装好插件 → `/console demo` 看整块面板（不需要 registry）→ `/console refresh` 回到真实状态 → 挑一两个可回滚的项目，照 `workflow/projects-scope.example.md` 建注册表，并在项目里写一个用 `<!-- CARD -->` / `<!-- /CARD -->` 包住的 STATUS 块（Git 项目可放 `.console/STATUS.md` 并在 `.git/info/exclude` 里排除）→ 用 `dispatch.json` 给其中一个项目指定执行者（可先试 `manual`，或把它切到 Codex）→ 走一遍「派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审」，看这条闭环是否真的减少了你的盯盘。
- 新增做法 L（半天内可完成）：装好 `npm install -g neurosquad`（或直接 `npx neurosquad`）→ 在一个 git 仓库里跑 `nsq run claude "fix the flaky checkout test" --worktree` 和 `nsq run codex --name reviewer` → 打开 dashboard，试 Enter 全屏、Ctrl+] 回网格、y/a/n 回答权限、s / S 发送提示 → 按 q 关掉 dashboard 再 `nsq up`，确认 agent 是否按各自 session 恢复 → 用 `nsq ls --json`、`nsq peek <agent> -n 20`、`nsq diff <agent>`、`nsq cost --since 7d` 看状态、屏幕、改动和成本 → 可选：`nsq phone on --lan` + `nsq phone pair` 试手机端，或 `nsq provider add lmstudio --url http://localhost:1234` 接一个自建模型服务器。

**试多久、什么时候升级**

- 做法 A 的决策规则（来自原文）：用 `--seed` 固定复现赛程；若 `--quick` 在 3 个以上任务上稳定优于 baseline，且攻击确实命中你没考虑到的地方，再升到 `--agents 32`；若比分持平、或只是措辞更漂亮，说明这类任务不值得这份开销，退回普通的「重问一次 + 自己改」。
- 做法 B/C/D/E 都没有量化效果数据，先以一到两个任务、可弃用环境为限；只有当人工介入次数或返工次数可观察地下降，才扩大范围。
- 做法 F 同样没有对比数据：先固定成一条流水线，连跑 2–3 次同类任务，如果每次都要大改 `output/report.md`（或流水线本身），说明这类活还不适合固化角色分工，先退回单 agent 手改；只有当产出基本可用、你只需要做少量编辑时，才值得把它变成常用链路。
- 做法 G 同样没有量化数据：以 3–5 个真实 issue 为最小样本；若 QA 真阳性率接近零，或人工介入次数没有下降，说明当前形态的价值主要在演示而非产出，应考虑退回不用（或只当演示看）。熟悉后再对低风险改动尝试 auto-merge，并保留人工抽查。
- 做法 H 只在一个 repo、一两个任务上观察两周再决定是否推广；记忆是纯文件、chat 和 worktree 都在项目文件夹里，退回现有流程没有迁移成本。若同行评审有效比例低或误报高，先调整 reviewer 的 prompt 或换模型，再决定是否保留。
- 做法 I 没有第三方性能与收益数据：先在 1–2 个 agent、半天到一天内试用；若通知可靠、漏掉等待的时间下降、恢复会话不丢布局，再扩大 agent 数。若通知常漏、恢复信任规则让你不确定、或本机 tmux 生命周期边界不满足，就不要把它作为默认方案。
- 做法 J 只有 41 stars 和作者自述的返工比例：先在 2–3 个小条目上跑完整闭环，再决定是否固化成日常流程；如果 verifier 抓不到问题、或每个 PR 你仍要人工兜底，说明当前形态还没带来净收益。
- 新增做法 K 只有 53 stars 和 0.15.x 的版本号：先在一两个可回滚的项目上跑一到两周，确认「派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审」这条闭环真能减少人工盯盘；如果 STATUS 卡总得你手工维护、关卡拦不住东西、或配置/版本一变就装不上，就退回你现在的看板方式。
- 新增做法 L 是 0.1.0 preview：先在一个 git 仓库、一两个真实任务上试半天到一天，确认 daemon 恢复、通知、权限内联回答、`nsq ls/cost/diff/peek` 都可靠；若命令或配置随版本变化导致你反复修，或手机端/自建 provider 的边界不满足，就只把它当临时观察窗，不要写进日常流程。

## 常见坑

**做法 A（arena-skill）**

- 任务含糊，100 个 agent 会一起含糊。
- 子代理看不到你的对话，任务文件是唯一信息源；要求没进 `task.md` 就会被漏。
- 所谓「100 个 Claude」是你当前所跑模型的 100 个子 agent，不是 100 个不同模型；差异只来自策略卡。
- 同一 seed 只保证卡和赛程相同，不保证答案相同（模型非确定性）。
- judge 也是 Claude，评分本身有偏差；rubric 可改，也意味着结果依赖你改得好不好。
- README 自己声明：「最佳答案」只意味着「赢下所有对局的答案」，不是它正确的证明。
- token 消耗随 agent 数和任务体量线性增长；技能不碰你的项目文件，但会占用大量调用。
- 并发受 `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` 限制（默认 10），调高后要用 `--wave` 匹配。

**做法 B（clodfarm）**

- 不设 `FARM_VERIFY_CMD` 等于没有质量门。
- 多机共用 farm 需要真实 DynamoDB 表 + 所有 box 都能 push 的共享仓库，不是只改 `.env` 就行。
- 默认节流已经留了余量（周 80%、5 小时 85%），把这两个值拉满会烧穿配额。

**做法 C（openrig）**

- 启动会写入 provider hooks 和 workspace trust 设置，先备份。
- 原生 Windows 不支持，WSL2 未测试。
- 权限模式的显式选择不等于原生层面真的生效；`rig seat status` 只区分「期望选择」与「上次启动参数」。默认 YOLO 关闭。
- 默认托管启动给 Claude 用 `--permission-mode acceptEdits`，给 Codex 用 `-s workspace-write`；完全绕过要显式选择。
- 0.6.0 起只支持 Node.js 22 和 24，Node 20 的安装检查会直接拒绝；跨 0.5.9 布局边界要走随包附带的 `openrig-upgrade` skill。

**做法 D（oh-my-openagent）**

- 安装脚本是 `curl | bash`，需要信任 get.omo.dev 与发布产物；只在可弃用环境试。
- README 自述个人 side project、由 AI 助手维护；许可证徽章为 SUL-1.0，团队或商业环境先读许可证原文。
- `mass ulw` 的图如何定义、如何限制并行度、如何统计花费，材料里完全没有。
- 文档（configuration.md、migrating-from-opencode.md 等）本次都没给出，能照做的只到安装与关键字这一层。

**做法 E（deer-flow）**

- 抓到的原文在 Option 2 处被截断，skills / sub-agents / scheduled tasks / memory 只有标题，不要照标题猜用法。
- Compose 低于 v2.24 无法解析 `docker/docker-compose-dev.yaml` 里的 `env_file` 语法。
- UI 里的模型连接测试会发一次短流式 tool-call 请求，可能产生 provider 费用；它不保存草稿、也不验证图片支持。
- 不受信任的任务保持 `auto_approve_permissions: false`。
- `$DEER_FLOW_HOME/managed-models/` 要备份整个目录、限制文件系统访问，并在需要共享同一 catalog 的多个 Gateway worker 间同步。

**做法 F（crewAI）**

- 原文在 examples 与 FAQ 后半段被截断；第 11 步「关掉默认遥测」只给了标题、没给命令，涉密场景先自己查文档再跑。
- 这是需要写代码、配环境的开发框架，不是装完即用的工具；把它当「写一个小组件」而不是「装个 app」。
- 效果只有作者主张，没有基准或对照实验；先跑一个任务，用产物能不能直接用来说话。
- 默认走 OpenAI API，要用 Ollama / LM Studio 得另按官方 LLM connections 文档接。
- `uv tool install crewai --upgrade` 只升级全局 CLI，项目虚拟环境内的版本升级要另看官方 upgrading-crewai 文档。
- Python 版本窗口是 `>=3.10, <3.14`，超出这个范围装不上。
- Windows 上可能卡在 `chroma-hnswlib` 构建错误，需要先装 Visual Studio Build Tools 的 C++ 组件。
- `process` 换成 hierarchical 时框架会自动加一个 manager 来规划、委派并验证结果，这多出来的调用要算进成本。

**做法 G（cubefarm）**

- 项目必须已托管在 GitHub 上：issue 和 PR 是唯一的协作媒介，纯本地项目用不了。
- 所有 agent 共用同一份编码 agent 订阅额度，成本随并发线性上升；先用 session limit 1–2 试。
- QA 在真实浏览器里测，依赖 Google Chrome；README 没有说明非 Web 类项目怎么 QA。
- auto-merge 的「QA 通过 + GitHub checks 全绿」只有 README 描述，没有成功率、误合并率、成本或周期时间数字；先关掉它，人工确认每一份 QA 报告和 PR 差异。
- `npx` 会一直用第一次下载的版本，升级要 `npx cubefarm@latest` 或 `npm install -g cubefarm`。
- 本次材料只有 README；它指向的 `docs/how-it-works.md`（issue 生命周期、QA、auto-merge、模型与用量、安全模型）和 `CONTRIBUTING.md` 都没拿到，QA 具体怎么测、auto-merge 的判定细节、模型与额度策略都无法核实。
- agent 沿用你本机的 skills、MCP servers 和 settings，各自在仓库的独立副本里工作；它们不能 push 主分支、也不能合并，合并由办公室在 QA 之后执行。
- 唯一的量化指标是 53 stars；办公室「看起来在工作」、CEO 会写 QA 检查清单、QA 报告能起到把关作用，都只是作者主张，没有可验证数据。

**做法 H（Offrun 或手工照做）**

- 适用条件窄：Offrun 本身仅 Apple Silicon Mac（M1+）+ macOS 14 Sonoma 或更高；不是这个环境就只能手工照做三条流程。
- 「免费无限、无服务器、不经手密钥」是厂商声明，原文未给审计或第三方说明。
- 「50 runs in a row」「41 of 50 → 50 of 50」是页面演示，不是可复现评测；无版本号、无发布日志、无第三方用户案例。
- 项目必须在 git 下；worktree 依赖 git。
- 同行评审的发现是落到 chat 里由你判断（Nothing merges on its own），不要让它自动合并；这与做法 B/G 的自动合入闸门不同，做法 H 默认不自动合并。
- 记忆文件要靠 agent 每次会话去读；如果它没读或没写回，记忆就是空的。需要在 prompt 里明确要求，并抽查 dead-ends.md 是否真的被追加。
- 限额切换需要你手动重发消息；不是自动推进。
- 材料质量：抓取到的文本夹有站点源码注释（编码声明位置、tab 标题长度取舍、以及 demo 账号是编造的、别在页面上放真实地址或登录名的开发备注），页面示例里的 sam@studio.dev / sam@acme.co 是占位账号；不要把它们当步骤。

**做法 I（cmux）**

- 仅支持 macOS；这是硬门槛。
- 装 hooks 前 agent CLI 必须在 PATH 上，否则自动恢复不可用。
- 自动恢复 agent 命令有风险；可配置 `terminal.autoResumeAgentSessions: false` 或关 Settings > Terminal > Resume Agent Sessions on Reopen。注意这只关自动恢复命令，布局、工作目录、scrollback 和浏览器历史仍会恢复。
- `--from <channel>` 按同等信任恢复，包括自动 agent 恢复；`--from <path>` 视为不可信，只恢复布局、工作目录、文本 scrollback 和 http(s) 浏览器 tab，文件里任何东西都不会自动运行。
- 会被丢弃：scrollback 里的终端控制序列（剪贴板、通知、链接、标题）、草稿附件、非 http(s) 页面与 profile、SSH/云连接、workspace 环境变量；更新版本写的较新 session 格式快照会被拒绝并报错。
- 自定义 resume 绑定要自动执行，必须先批准签名命令前缀；批准的前缀还会绑定工作目录与精确环境值；敏感环境键在存储绑定前会被丢弃。
- 本机 `cmux local-tmux` 活不过 logout、重启、关机或断电；需要离线仍跑时换 `cmux ssh-tmux`、`cmux mosh-tmux` 或持久云 VM。
- `CMUX_NO_GIT_WATCH=1` 可缓解大仓库/托管 Mac 的进程 churn，但代价是 Git/PR 更新受影响。
- 调研材料在配置面处被截断，其他配置细节在外链文档；不要照不完整片段猜。
- 通知驱动的注意力路由能改善并行效率，目前只是作者主张；没有第三方性能与收益数据，不宜作为通用默认方案直接采用。
- 与做法 H 的差异：cmux 管终端、通知、浏览器，不自动合并；H 管记忆、评审、账号切换，默认不自动合并。与做法 B 的差异：cmux 是本地终端可见化/隔离，不是容器克隆仓库 + 测试闸门。

**做法 J（pullboard）**

- 项目很小（41 stars），部分功能仍是 planned：relay（在手机/其他机器上看板）和 Pullboard View 里的 roadmap 还没有。
- Windows 未测试：CI 只在 Linux 和 macOS 上跑。
- worktree 身份只在一台机器上有意义，不是安全边界；不要拿它当权限隔离。
- 可以用 `--no-verify` 跳过 hook，靠 pre-push gate 和 verifier 兜底；不要把 hook 当成唯一防线。
- 没有设 gate 就没有 submit/push 前的门槛；gate 是「任何能证明你代码的命令」，要选你真正会跑的那条。
- verifier 必须是没参与构建该条目的另一个 agent，否则「验证」退化成自证。
- 接受要给证据、驳回要给理由，否则 receipt 只是形式；tour 示范的验证强度是「故意破坏修复、看到测试失败」后才接受。
- SPEC 行在你批准前是 draft，只有 approved 的行算数；含糊的需求行会得到含糊的验收。
- 「nearly one in three items goes back」是作者对自己开发 Pullboard 时的描述，不是可复现的第三方基准。

**新增做法 K（claude-console）**

- 强依赖环境与版本：Claude Code 2.1.289 或更高且支持 mod；材料只给了 Windows 与 macOS 两个前提。
- 状态和关卡都建立在你自建的两样约定上：项目注册表（`registryPath`，默认 `~/.claude/handoffs/projects-scope.md`）和每个项目里的 STATUS 卡；不维护它们，面板就是空的。
- STATUS 卡是机器可读块，必须用 `<!-- CARD -->` / `<!-- /CARD -->` 包住且不超过十行，解析器识别的是模板里的繁体键：`更新`、`狀態`、`驗證`、`等使用者`、`下一步`、`關卡`；写错键名或写超长会解析不到。
- `關卡` 里除了 `無`、`spec：…`、`review：…`、`release：…`，未知的非空关卡文本也会阻止继续——这是有意为之，但容易被误读成「面板卡住了」。
- `dispatch.json` 缺失时只读相邻的旧 `codex-dispatch.json`，写入一律进 `dispatch.json`；0.1 版没有 `projects` 的平铺文件继续可用，升级时要留意这份遗留。
- 执行者解析顺序是 面板覆盖 > 注册表 Executor 列 > 全局 `executor`；而且「执行者与全局不同的项目不继承全局 model/effort」，容易造成某个项目的模型/effort 跟你预期不一致。
- `manual` 不是「什么都不显示」：同步与继续按钮隐藏、卡片显示交接说明，但 CARD、验证、决策和关卡仍可用。
- 设置只影响下一次派工，正在跑的任务保持它请求的值——改完模型/effort 别以为在跑的任务会跟着变。
- 配置改完要 `/reload-plugins` 或另开一个 Claude Code 会话才生效。
- 仍在等权限批准（`等待批准`）的执行者需要 attach 处理；`/console reply` 只能回停下提问的执行者，不能代替权限批准。
- `commandGuard: ask` 只拦不可撤销命令，`off` 就完全关掉；`loopGuard` 也只是「告诉模型不要试第三次」，不是硬禁止。
- `activation: auto` 下只有你运行过 `/console` 的会话（及它 resume 后）运行控制台，其他会话只拿到命令护栏；在已注册项目目录里开的会话会自动切到项目模式（`projectMode: auto`）。别以为它全局生效。
- 刷新只查本地文件和 CLI、不请求模型，只有提交决策草稿时才花 Claude 额度；所以面板的正确性完全取决于你的文件写得对不对，别把它当免费的全量状态来源。
- `gitProbe` 默认 on：每个项目根每次刷新跑一次 `git status --porcelain=v2 --branch --show-stash`（带 `--no-optional-locks`），装了 `gh` 并登录时会读 PR 与检查；设 `git` 跳过 GitHub，设 `off` 两者都跳过。最后一次 `git fetch` 超过一天会提示 ahead/behind 可能过期。
- 成熟度不足：仓库仅 53 stars、版本 0.15.x、UI 当前是繁体中文，且强依赖特定 Claude Code 版本与自建注册表/状态卡约定；升级靠页脚 `⬆ 更新` 或 `/console update`，逐版本变更看仓库 `CHANGELOG.md`。
- 材料在「对应的研究问题」小节处被截断，除这里列出的配置键与命令外，不要照片段猜其他能力。

**新增做法 L（nsq / neurosquad-cli）**

- 0.1.0 preview：README 自标 preview，命令与配置在 1.0 前可能变化；不要把它直接写进团队的日常流程。
- `nsq run -- <command>` 这类任意命令没有 hooks，只能显示 working / finished，永远不会出现 “needs you”；不要把非 hook CLI 也当成能被通知的 agent。
- 手机端是 experimental 且默认关闭；链接携带 pairing token，要当作密码对待。手机上只能看 agent 与屏幕、发提示、回答权限询问、中断，不能启动 agent、改设置或敲任意键。`nsq phone rotate` 让所有手机登出，`nsq phone off` 关闭。
- 语音听写首次按 v 或 `nsq dictation setup` 会下载约 670 MB 模型（SHA-256 校验）；识别在本机完成，文本只粘贴进输入框、不会自动提交，需你按 Enter；Windows arm64 不可用。
- 默认自动更新：npm/Homebrew/Scoop 安装的会在后台装新版本，并在“不会丢东西”（没有忙碌 agent、没有打开的 dashboard、每个 agent 都能 resume）时切换，或按 U 立即切换；想关掉用 `nsq config set autoUpdate false` 或 `NSQ_NO_UPDATE=1`。
- 密钥在 OS keyring 或 `OPENROUTER_API_KEY`；key 只进 agent 的环境，不进 argv、日志或文件。自建模型服务器上的请求显示 “no price”，不是 $0；无已知价格的模型都如此。
- 数据在 `~/.neurosquad-cli`（可用 `NSQ_HOME` 迁移），密钥在 OS keyring；`~/.claude`、`~/.codex`、`opencode.json` 永不被写；nsq 需要的一切放在 per-agent 层（flags、环境变量、自己的文件夹）。
- README 没有给出任何“改善幅度”的量化指标或基准；状态、成本、diff、屏幕尾部是它能给的可观测信号，但不等于产出已被验证。
- 与做法 I（cmux）的差异：nsq 跨平台（Windows/macOS/Linux）、用 per-user daemon 持有终端、有脚本化接口和成本命令；cmux 仅 macOS、是 GUI 终端、通知与恢复能力更细。两者都只是注意力路由，不替代验证、记忆和评审。
- 与做法 J/K 的差异：nsq 不提供 gate/verifier 状态机，也不提供跨项目关卡看板；它不做「完成」的定义，也不做合入闸门。

**通用**

- 别把「工具很多」当成改善证据；没有验证命令或盲评对比，只是把不确定性放大了。
- 让 agent 自己声明「完成」不算完成；先把完成定义写成可执行检查。
- 多步流水线不做落盘校验（只看聊天里的输出），事后无法复盘是哪一步坏了。
- 并行 agent 的通知很多时，先保证「谁在等我」可路由，再谈扩并发；否则只是把等待堆到更多 pane 里。
- 用面板/看板时，先确认它的状态来源是你或 agent 真的写下来的文件，而不是它自己猜的；做法 K 的刷新只查本地文件和 CLI、不请求模型，卡上写错它不会替你纠正。
- 用 daemon/dashboard 时，先确认它管的是「可见性与权限」而不是「完成与合入」；做法 L 不替代验证、记忆和评审。

## 证据与来源

- **做法 A** 依据调研《Jakeschincariol/arena-skill》。可核对：成本表（100/64/32/16/8 对应的轮数、子 agent 调用数、wave 数）、`bracket.py plan` 输出的赛程表（100→50→25→13→7→4→2→1，总计 595 次调用 / 70 个 wave）、2160 张卡、发牌保证、rubric 权重、默认并发 10、覆盖完整锦标赛的单元测试、仓库 117 stars。属于作者主张：淘汰赛能产出「更强答案」、质量提升幅度，README 没有给出质量对比数据或案例结果。
- **做法 B** 依据调研《matank001/clodfarm》。可核对：一行安装脚本、裸 Docker 与 compose 启动命令、四种登录方式、环境变量默认值、多机部署与 `clodfarm budget`、apps-role 围栏规则。原文未给出效果量化数据；「并行 + 测试闸门更高效」属于方案设计，不是实测结论。
- **做法 C** 依据调研《mvschwarz/openrig》。可核对：Node.js 22/24 与 tmux 要求、仅 macOS/Linux、npm 包名 `@openrig/cli`、三套 starter 与模型、`rig ps` / `rig send` / `rig queue` 等命令、0.6.0 的 Node 20 迁移说明。原文明确工具仍处早期版本且没有任何量化效果数据；「减少手动切换终端和人工传话成本」是待验证假设。
- **做法 D** 依据调研《code-yeongyu/oh-my-openagent》。可核对：安装脚本与渠道参数、包名 `omo-ai`、配置路径与「就近优先」、关键字 `ultrawork` / `ulw` / `mass ulw`、`omo setup` / `omo doctor` / `omo update`、stars ≈ 69701、许可证徽章 SUL-1.0。属于作者主张：「研究一万个来源」「一小时干完 Claude Code 七天的活」等来自 README 自述或用户好评，没有基准、数据集或对照实验。
- **做法 E** 依据调研《bytedance/deer-flow》。可核对：`make setup` / `make doctor` / `make support-bundle` / `make docker-start` 等命令、模型配置 YAML 示例、CLI 后备 provider 的凭证来源、部署规格起点表、ACP agent 配置与 `auto_approve_permissions` 规则、MIT 协议、Python 3.12+ / Node.js 22+、83290 stars。重要限制：原文在 Option 2: Local Development 的 Prerequisit 处被截断，skills、sub-agents、scheduled tasks、memory 等小节只有标题、没有正文，因此本手册只写安装与配置。
- **做法 F** 依据调研《crewAIInc/crewAI》。可核对：MIT 许可、Python >=3.10 且 <3.14、uv 各平台安装命令、`uv tool install crewai` / `uv tool update-shell` / `uv tool list` / `uv tool install crewai --upgrade`、`crewai create crew` 生成的目录结构与 `--classic` 旧式结构、两个 `agents/*.jsonc` 示例、`crew.jsonc` 里 `context` / `output_file` / `markdown` / `process: sequential|hierarchical` / `{placeholder}` 的用法、`crewai install` / `crewai run` / `uv add`、Flow 的 `@start` / `@listen` / `@router` 与 `or_` / `and_` 组合、CrewAI skills 的安装命令与四个 skill 分工、Windows 上 `chroma-hnswlib==0.7.6` 的构建错误与 Visual Studio Build Tools 解决办法。属于作者主张：多智能体角色分工能提升「多步资料整理 → 成文」的产出质量，README 没有给出基准、数据集或对照实验。重要限制：原文在 examples 与 FAQ 后半段被截断，第 11 步「关掉默认遥测」只有标题、没有命令。
- **做法 G** 依据调研《leonvanzyl/cubefarm》。可核对：可执行命令（`npx cubefarm`、`npx cubefarm login`、`npx cubefarm doctor`、`--demo`、`--port`、`--no-open`、`npx cubefarm@latest`、`npm install -g cubefarm`）、前提清单、五步上手流程、界面操作键、用 session limit 控制并发、数据目录 `~/.cubefarm` 与 `SWARM_HOME`、安全模型要点、QA 在真实浏览器里审查并发布带截图报告、合并门禁为「QA 通过且 GitHub checks 全绿」、白板 Kanban 覆盖从 backlog 到 merged。属于作者主张：办公室「看起来在工作」、CEO 会写出 QA 检查清单、QA 报告能起到把关作用、auto-merge 安全——没有成功率、误合并率、成本或周期时间的数字，唯一量化指标是 53 stars。重要限制：本次输入只有 README，它指向的 `docs/how-it-works.md` 与 `CONTRIBUTING.md` 均未包含在材料中，因此 QA 具体如何测、auto-merge 判定细节、模型与额度策略都无法核实。
- **做法 H** 依据调研《Show HN: Offrun – manage every coding agent from one workspace》。可核对：安装流程、每个 agent 一个 git worktree、三个记忆文件名与读写时机、同行评审示例输出、限额切换提示文案、数据边界表、50 次运行的对照表、Build/Planner 两种模式、通知与听写的描述。属于作者主张、没有外部验证：「50 runs in a row」「41 of 50 → 50 of 50」、免费无限/无服务器/不经手密钥等；无版本号、无发布日志、无第三方用户案例，HN 上 51 分、23 条评论的讨论内容不在给定材料里。适用条件：Apple Silicon（M1+）、macOS 14 Sonoma 或更高、至少一个已在用的 agent CLI；Pi 与 OpenCode 尚未支持。重要限制：原文是产品页面，本手册只采用其中可迁移的三条流程（worktree、记忆文件、提交前互评），Offrun 本身作为其中一种实现方式。
- **做法 I** 依据调研《manaflow-ai/cmux》。可核对：仅 macOS、基于 Ghostty 渲染引擎、DMG 与 Homebrew 安装、`cmux hooks setup` 及其受支持 agent 列表、OSC 9/99/777 与 `cmux notify` 通知路径、快捷键表、`cmux claude-teams`、`cmux ssh` 与 `--command` 行为、`autoResumeAgentSessions` 配置、`cmux restore-session` 的 `--from <channel>` 与 `--from <path>` 信任差异、`cmux surface resume set/show/clear` 信任规则、`cmux local-tmux` / `cmux local-zellij` 生命周期边界、`CMUX_NO_GIT_WATCH=1`、浏览器导入/自动化、Skills 仓库等。属于作者主张：通知驱动的注意力路由能改善并行 agent 工作流，但没有第三方性能与收益数据。重要限制：调研材料在配置面 `~/.config/c...` 处被截断，其他配置细节在外链文档；因此本手册只写能照做的安装、hooks、通知、恢复与生命周期部分，不补写未给出的配置项。
- **做法 J** 依据调研《pullboard-dev/pullboard》。可核对：完整 CLI 命令、`SPEC.md` 格式、`pullboard.json` 配置与各栈 gate 表、tour 的端到端示例（含故意破坏修复再看测试失败）、一个真实的 reject/accept receipt 样例、条目状态机（open → claimed → submitted → verified / 回 open）、`PRACTICE.md` doctrine、看板是放在 `.git` 里的一个 SQLite 文件、Node 22.13+、MIT 许可、41 stars。属于作者主张：这套方法论「更好」、返工比例可复现、多 agent 更连贯；「nearly one in three items goes back」是作者对自己开发 Pullboard 时的描述，不是可复现的第三方基准。原文自己声明的局限：worktree 身份只在一台机器上有意义、不是安全边界；可用 `--no-verify` 跳过 hook（靠 pre-push gate 和 verifier 兜底）；CI 只在 Linux 和 macOS 上跑，Windows 未测试；relay 和 Pullboard View 里的 roadmap 仍是 planned。
- **新增做法 K** 依据调研《SaM-runtime/claude-console》。可核对：两条安装命令、`/console demo` 与 `/console refresh`、插件配置的 `--values-stdin` 写法与全部配置键及默认值、注册表 + STATUS 卡格式（`<!-- CARD -->` / `<!-- /CARD -->`、十行上限、繁体键名、`關卡` 的四种取值）、`dispatch.json` 结构与执行者解析顺序（面板覆盖 > 注册表 Executor 列 > 全局）、`sync` 的模型/session 覆盖规则、动作键与数字键回答待决事项、`/console reply`、命令速查表、`commandGuard` / `loopGuard` / `activation` / `projectMode` 的取值与默认、Git/PR/CI 探测行为与 `gitProbe` 三档、`/console update`。属于作者主张：「一个控制台会话承担跨项目规格、监督与评审关卡」「刷新只查本地文件和 CLI、不请求模型」「减少盯盘」等来自原文自述，没有第三方基准或对照实验。原文自己声明的局限与材料限制：仓库仅 53 stars、版本 0.15.x、UI 为繁体中文、强依赖特定 Claude Code 版本与自建的注册表/STATUS 卡约定；材料在「对应的研究问题」小节处被截断，本手册只写能照做的安装、配置、派工、状态卡、动作与护栏部分。
- **新增做法 L** 依据调研《glmn-ai/neurosquad-cli》。可核对：`npm install -g neurosquad` / `npx neurosquad`、`nsq run claude "..." --worktree` 与分支名 `nsq/<name>`、`nsq run codex --name reviewer`、`nsq run -- npm run dev`、dashboard 的 Enter / Ctrl+] / y / a / n / i / s / S / q、`nsq down` / `nsq up`、`nsq ls --json` / `nsq send <agent> "prompt" [--when-done]` / `nsq answer <agent> yes|always|no` / `nsq peek <agent> [-n 20]` / `nsq diff <agent>` / `nsq cost [--since 7d] [--json]`、`nsq openrouter set-key`、`nsq provider add lmstudio --url http://localhost:1234`、`nsq phone on --lan|--online` / `nsq phone pair` / `nsq phone push ntfy` / `nsq phone rotate` / `nsq phone off`、语音听写 `v` 与约 670 MB 模型 / Windows arm64 不可用、`nsq config set autoUpdate false`、`nsq doctor`、`nsq set <agent> ...`、数据目录 `~/.neurosquad-cli` 与 `NSQ_HOME`、OS keyring、`~/.claude` / `~/.codex` / `opencode.json` 永不被写、Node.js 22.13+、MIT、README 自标 0.1.0 preview、native 预编译平台。属于作者主张、没有外部验证：daemon/dashboard 能改善并行 agent 的响应速度与成本可见性，README 没有给出任何“改善幅度”的量化指标或基准；`--worktree` 的隔离边界是文件系统路径而非安全边界。重要限制：本条只依据 README 级材料，命令与配置在 1.0 前可能变化，不宜直接纳入日常流程。

## 依据的调研

- [Jakeschincariol/arena-skill](../research/radar/2026-10-01/13-jakeschincariol-arena-skill.md)：值得一试，先按 README 的安装方式之一装进 Claude Code，用 `/arena --quick`（16 个 agent）对你手头一两道确实不满意的真实任务跑一遍，并把被拒的旧答案作为 baseline 做盲评对比，确认输出确实更好再考虑加大 agent 数；步骤、参数、成本表和自测方式都写得可直接照做，但“更强答案”目前只是作者主张且 token 开销很大。
- [matank001/clodfarm](../research/radar/2026-10-01/14-matank001-clodfarm.md)：值得一试，可以小范围试：clodfarm 给出了一套可照做的 Claude Code 多子代理编排方案——子代理各占一个 git worktree/分支、测试通过才合入 main、按账户真实 5 小时与周用量节流并留 20% 余量；先用单机 + 小仓库 + 已有测试命令验证 1–2 个编码任务再决定是否铺开。
- [mvschwarz/openrig](../research/radar/2026-10-02/67-mvschwarz-openrig.md)：值得一试，建议在单独的实验仓库里小范围试：按 README 的引导路径安装 OpenRig，用两座位 starter（复用已有 Claude Code 或 Codex 账号）跑一个「实现 + 独立复核」的有界任务，看是否真的减少了手动切换终端和人工传话的成本。理由是原文给出了从安装、启动、就绪检查、下发任务到权限与回滚的完整可复制命令，具备照做的条件；但工具仍处早期版本、会改写 provider 信任与 hook 配置、不支持 Windows，且没有任何量化效果数据，因此不宜直接写成手册主推做法。
- [code-yeongyu/oh-my-openagent](../research/radar/2026-10-01/508-code-yeongyu-oh-my-openagent.md)：值得一试，建议在一个可弃用的环境里小范围试用 OmO：按 README 的一行命令安装，用同一个真实小任务分别跑普通 prompt、加 `ulw`、加 `mass ulw`，对比返工次数与人工介入次数。理由是可照做的安装与关键字工作流已经给出（`omo`、`ulw`、`mass ulw`、`omo setup/doctor`、两份 `omo.jsonc` 配置），但全部效果说明都只有作者主张和用户好评，没有可核对的指标。
- [bytedance/deer-flow](../research/radar/2026-10-01/544-bytedance-deer-flow.md)：值得一试，可以按官方 Quick Start 在本地或小团队环境跑通 DeerFlow 2.0（clone → make setup → make doctor → make docker-start），把它作为长时程子代理＋沙箱＋记忆的执行底座试点；理由是原文给出了可直接复制的安装、模型接入、部署选型和安全配置步骤，但 skills、sub-agents、scheduled tasks 等核心能力的用法在抓到的原文里只剩目录标题，需进一步查阅仓库文档才能照做。
- [crewAIInc/crewAI](../research/radar/2026-10-02/549-crewaiinc-crewai.md)：值得一试，建议小范围试：照着 README 的 "uv 安装 → crewai create crew → 改 agents/*.jsonc 与 crew.jsonc → crewai install/run" 链路，先把手头一个"多步资料整理→成文"的工作改成 researcher + reporting_analyst 两个角色的 Crew，并把产物落盘到 output/ 文件；因为原文给出了完整可复制的命令、目录结构和配置示例，可照做，但它本质是需要写代码、配环境的开发框架，效果只有作者主张、没有对比数据，先试一步再决定是否推广。
- [leonvanzyl/cubefarm](../research/radar/2026-10-02/725-leonvanzyl-cubefarm.md)：值得一试，用 npx cubefarm 在低风险仓库上小范围试跑 issue→PR→QA→合并 这条自动链路，重点验证 QA 环节的真实拦截能力；因为它把多 agent 分工、浏览器实测和 auto-merge 门禁写成了可执行流程，但只有 README 级证据（53 stars、无基准与案例数据），不足以直接采用。
- [Show HN: Offrun – manage every coding agent from one workspace](../research/radar/2026-10-04/1066-show-hn-offrun-manage-every-coding-agent-from-one-.md)：值得一试，先在单个有 git 的仓库上小范围试三条可迁移流程——每个 agent 一个 worktree、项目记忆落成 conventions.md/plan.md/dead-ends.md、第二个 agent 在提交前读 diff 做评审——再决定是否长期用 Offrun 本身；理由是这几条流程具体、可照做且不依赖工具存活，而 Offrun 自身的收益（限额自动切换、全 Mac 通知、免费无限）目前只有厂�自述，且限定 Apple Silicon Mac。
- [manaflow-ai/cmux](../research/radar/2026-10-08/1856-manaflow-ai-cmux.md)：值得一试，macOS 上并行跑多个终端型 coding agent 的人，可以照 README 的安装与 hooks 步骤小范围试一套「通知驱动的注意力路由」工作流：装 cmux、跑 `cmux hooks setup`、用 workspace 分屏跑 agent、靠通知环和 ⌘⇧U 跳转；理由是多 agent 并行时「哪个在等我」是可复制的痛点，而这份 README 给出了具体命令与配置键，但它只支持 macOS、性能与收益均无第三方数据，因此不宜作为通用默认方案直接采用。
- [pullboard-dev/pullboard](../research/radar/2026-10-08/2038-pullboard-dev-pullboard.md)：值得一试，建议在小范围试：先用 `pullboard tour` 看一遍闭环，再在一个真实小仓库里把「SPEC 行 → gate → 另一个智能体在同一 commit 上验证」跑通，然后决定是否固化成日常流程；理由是它把「第二个智能体验证通过才算完成」做成了可强制执行的状态机，并给出了可直接复制的命令与配置（MIT、本地运行、不调用模型），但项目很小（41 stars）、Windows 未测试、部分功能仍在 planned，适合先试验证收益。
- [SaM-runtime/claude-console](../research/radar/2026-10-09/2187-sam-runtime-claude-console.md)：值得一试，建议小范围试：先按 README 的两条命令装好插件、用 /console demo 跑通面板，再挑一两个可回滚的项目接入 registry + STATUS 卡，验证「派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审」这条闭环是否真的减少了人工盯盘；理由是它给出了可直接照做的安装命令、配置键表、dispatch.json 结构、动作快捷键和状态卡格式，但仓库仅 53 stars、版本 0.15.x、强依赖特定 Claude Code 版本与自建的注册表/状态卡约定，成熟度还不够直接全量采用。
- [glmn-ai/neurosquad-cli](../research/radar/2026-10-10/2422-glmn-ai-neurosquad-cli.md)：值得一试，先在单个 git 仓库里用 npx neurosquad 跑一两个带 --worktree 的后台 agent，实测“关掉窗口后继续跑 + 状态/成本可观测 + 权限内联回答”是否成立，再决定是否纳入日常；README 给了可直接复制的安装、启动、回答与成本命令，但项目自标 0.1.0 preview、命令与配置在 1.0 前可能变化，不宜直接 adopt。
