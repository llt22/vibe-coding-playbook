# glmn-ai/neurosquad-cli

- 结论：**值得一试**。先在单个 git 仓库里用 npx neurosquad 跑一两个带 --worktree 的后台 agent，实测“关掉窗口后继续跑 + 状态/成本可观测 + 权限内联回答”是否成立，再决定是否纳入日常；README 给了可直接复制的安装、启动、回答与成本命令，但项目自标 0.1.0 preview、命令与配置在 1.0 前可能变化，不宜直接 adopt。
- 原文：https://github.com/glmn-ai/neurosquad-cli
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-10T10:48:42.480Z

## 是什么

nsq 是一个终端里的多智能体管理器：把 Claude Code、Codex、OpenCode 或**任意命令**注册为 agent，由 per-user daemon 持有它们各自的终端，用一个 dashboard 以网格形式显示多个实时终端；agent 需要你时给出通知并原样带出它的问题，你可以不切进该终端就直接回答。项目为 MIT、开源，README 自标 0.1.0 preview，要求 Node.js 22.13 或更新，native 部分预编译（Windows x64/arm64、macOS Apple silicon/Intel、Linux x64/arm64），无需编译器。仓库另有同名桌面版 NeuroSquad，二者共享 @neurosquad/core，nsq 是其终端版。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Node.js 22.13+；要使用 Claude Code / Codex / OpenCode 之一，需该 CLI 自身已登录，或改走 OpenRouter / 自建模型服务器。

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
sq run claude --provider openrouter --model anthropic/claude-sonnet-4.5
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

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
- 把**任何命令**注册成 agent（`nsq run -- npm run dev`），即把非 AI 的长驻进程（dev server 等）也纳入同一个监控面板，与 AI agent 并列管理——这是 README 明确支持的一种“本没想到交给 AI 编排层”的用法。
- 多 agent 并行开发被做成默认路径：每个 agent 一份 `--worktree` 独立 checkout，分支 `nsq/<name>`，`nsq diff <agent>` 单独看某个 agent 的未提交改动。

**2. 任务匹配**
- harness 与状态精度相关：Claude Code、Codex、OpenCode（1.x 与 2.x）走各自的 hooks，能给出 working / needs you / finished，且 “needs you” 会带上 harness 自己的原话（README 举例：*Claude wants to run: npm test*）；任意命令没有 hooks，只能 working / finished。
- 模型可替换：dashboard 按 **m** 在 OpenRouter 上选模型并切换该 agent（在同一 session 上重启、保留对话），选 “default” 切回；也可指向自建服务器。
- 协议匹配有说明：Claude Code 用服务器的 Anthropic endpoint，Codex 用 Responses endpoint（或经本地网关的 chat completions），OpenCode 两者皆可。

**3. 条件供给**
- 需要：Node 22.13+；目标 CLI 自身已登录，或配置 OpenRouter key / 自建 provider。
- 权限：dashboard 内 `y` / `a` / `n` 或 `nsq answer <agent> yes|always|no` 直接答复权限询问，不必进全屏。
- 配置隔离：`~/.claude`、`~/.codex`、`opencode.json` 永不被写；nsq 需要的一切放在 per-agent 层（flags、环境变量、自己的文件夹）。数据在 `~/.neurosquad-cli`（可用 `NSQ_HOME` 迁移），密钥在 OS keyring。
- 关闭遥测/更新：`NSQ_NO_UPDATE=1` 或 `nsq config set autoUpdate false`；无账号亦可全功能使用。

**4. 主动推进**
- 时间/事件驱动的持续执行：per-user daemon 持有终端，关掉 dashboard 或终端后 agent 继续工作；`nsq down` 停止，`nsq up`（或 `nsq`）按各自 session 恢复，重启机器后也可。
- 状态触发：agent 需要你或完成时发原生通知（Windows/macOS/Linux），每个 agent 一条，重新开工时撤回；SSH 或无桌面时 dashboard 用自己的终端响铃（bell + OSC 9）。
- 回合结束触发：`nsq send <agent> "prompt" --when-done`（dashboard 里为 **S**）在当前回合结束后才发送提示。
- 注意：`nsq run --` 的任意命令不会产生 “needs you”，所以这条链对非 hook CLI 是断的。

**5. 效果验证**
- 成本：`nsq cost [--since 7d] [--json]` 从各 harness 自己的日志读 token；无已知价格的模型显示 “no price”，绝不显示 $0。
- 产出：`nsq diff <agent>` 看该 agent 目录下未提交改动；`nsq peek <agent> [-n 20]` 看屏幕最后几行；`nsq ls [--json]` 看各 agent 状态。
- README 没有给出任何“改善幅度”的量化指标或基准，只有上述可观测信号。

## 与已有做法的关系

- 清单中已有 **Claude Code**（adopt）：nsq 不替代它，而是把它作为受支持的 harness 之一来编排（带 hooks，状态最精确）。
- 清单中已有 **OpenCode**（watch）：README 明确支持 OpenCode 1.x 和 2.x，作为第三个内置 harness；nsq 并未改变 OpenCode 自身成熟度。
- 清单中没有其他相关条目。README 提到的桌面版 NeuroSquad、`@neurosquad/core`、ntfy、cloudflared 均未在清单中列出。

## 证据与局限

**原文给出的可核对内容**：安装方式（npm / npx / Homebrew / Scoop / 安装脚本）、完整命令清单、dashboard 快捷键表、多段可直接复制的命令示例、平台与 Node 版本（Windows 10/11 x64+arm64、macOS Apple silicon+Intel、Linux x64+arm64；CI 在 Node 22 和 24 上从打包后的 npm 包测试）、MIT 许可、copyright 2026 Stanislav Gelman and NeuroSquad contributors。

**只是作者主张、无第三方数据的**：“精确状态”（来自各 CLI 的 hooks，而非猜屏幕）、“减少人工看护”、成本按 agent 可读、隐私承诺（无账号、无遥测、每 6 小时一次向 npm registry 查公开包元数据）、CI 覆盖与“无需编译器”。这些都没有独立基准或量化对比。

**明确的适用条件与风险**：
- 版本 0.1.0 preview，README 自己声明 “Commands, keys and config may still change before 1.0”，并引导用户去报 bug——稳定性没有承诺。
- 手机端为 experimental 且默认关闭；`--online` 每次都要 opt-in 并打印警告：任何拿到该链接与 token 的人都能控制你的 agent；地址每次启动都变，需重新配对。
- 语音听写模型约 670 MB，需一次性下载；Windows arm64 不可用。
- 成本数据显示 “no price” 说明自建/未收录模型的价格数据不完整，不能当作精确账单。
- 仓库 stars 仅 30（初筛指标），属于小众、单维护方项目，长期维护性未知。
- 本文只依据仓库 README，未实测；所有行为均为文档描述。

## 怎么试、怎么验证

**最小试用（单机、单仓库、非关键项目）**：
1. 用 `npx neurosquad`（不安装、便于回退）在本地一个 git 仓库内执行 `nsq run claude "<一个真实的、1 小时内能完成的小任务>" --worktree`，再开第二个 `nsq run codex --name reviewer`（或 `nsq run -- <一条长驻命令>`）。
2. 在 dashboard 里只做三件事：不进入全屏回答一次权限询问（y/a/n）、按 q 关闭 dashboard、然后重新 `nsq` 确认 agent 仍在且回到各自 session。
3. 收工前跑一次 `nsq ls --json`、`nsq diff <agent>`、`nsq cost --since 1d`。

**判断是否改善的指标（对照试用前一周的基线）**：
- 人工介入次数与响应时延：单位时间内收到的 “needs you” 通知数，以及从通知到答复的时长是否下降（原先要切窗口才能看到问题）。
- 并行任务是否真的并行：是否还需要为第二个 agent 重开终端、重述上下文；用 `nsq ls` 能看到两个 agent 同时处于 working。
- 是否不再丢工作：关闭 dashboard、甚至重启后 agent 是否真的 resume（README 声明可以，必须自测）。
- 产出：`nsq diff <agent>` 是否有可提交的改动；`nsq cost --since 1d` 的 token 数与完成的任务量之比。
- 隔离是否有效：多 agent 并行时是否出现互相覆盖文件（worktree 是否起了作用）。

**回退与安全**：试用期不要开 `--dangerous`，不要开 `nsq phone on --online`；先确认 `nsq config set autoUpdate false` 或 `NSQ_NO_UPDATE=1` 是否符合你的环境要求；数据与密钥位置（`~/.neurosquad-cli`、OS keyring）在共享机器上需自行评估。若 0.1.0 期间命令/配置变更频繁导致脚本反复失效，则降级为 study，仅借用“daemon + 每 agent 一套 worktree + 状态来自 harness hooks + 成本按 agent 统计”这套设计。
