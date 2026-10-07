# manaflow-ai/cmux

- 结论：**值得一试**。macOS 上并行跑多个终端型 coding agent 的人，可以照 README 的安装与 hooks 步骤小范围试一套「通知驱动的注意力路由」工作流：装 cmux、跑 `cmux hooks setup`、用 workspace 分屏跑 agent、靠通知环和 ⌘⇧U 跳转；理由是多 agent 并行时「哪个在等我」是可复制的痛点，而这份 README 给出了具体命令与配置键，但它只支持 macOS、性能与收益均无第三方数据，因此不宜作为通用默认方案直接采用。
- 原文：https://github.com/manaflow-ai/cmux
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-07T16:33:11.311Z

## 是什么

cmux（manaflow-ai/cmux）是一个基于 Ghostty 渲染引擎（libghostty）的 **macOS 原生终端**（Swift + AppKit，非 Electron），为「并行运行多个 AI coding agent」这一场景加了三样东西：

1. **垂直标签 + 侧边栏**：每个 workspace 显示 git 分支、关联 PR 状态/编号、工作目录、监听端口、最新通知文本。
2. **通知系统**：pane 出现蓝色通知环、tab 在侧栏点亮、通知面板汇总所有待处理项。通知可由标准终端转义序列 OSC 9/99/777 自动触发，也可由 CLI `cmux notify` 触发，或接进 Claude Code / OpenCode 等 agent 的 hooks。
3. **内置可编程浏览器 + CLI/socket API**：可创建 workspace/tab、切分 pane、发送按键、驱动浏览器（导航、快照 DOM、点击、填表、执行 JS）。

作者的出发点是：用 Ghostty + 一堆分屏 + 系统通知跑 Claude Code / Codex，但 Claude Code 通知正文永远是「Claude is waiting for your input」没有上下文，tab 一多连标题都看不清。

作者自己强调定位：**「cmux is a primitive, not a solution」**——它不规定工作流，只提供终端、浏览器、通知、workspace、分屏、tab 和 CLI。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 0. 前提
- **仅支持 macOS**（README 明确「macOS only, for now」）。
- 会读取你已有的 Ghostty 配置 `~/.config/ghostty/config`（主题、字体、颜色、cursor）。
- 若要用 agent hooks 的自动恢复，**必须先装好对应 agent CLI，且其 binary 在 PATH 上**（README 原文要求："Install hooks after installing the agent CLI so its binary is on `PATH`"）。

### 1. 安装

推荐 DMG：从 releases 页下载 `cmux-macos.dmg`，拖入 Applications，之后靠 Sparkle 自动更新，只需下载一次。

或用 Homebrew：

```bash
brew tap manaflow-ai/cmux
brew install --cask cmux
```

后续更新：

```bash
brew upgrade --cask cmux
```

> 首次启动 macOS 可能提示「来自已验证开发者」，点 **Open** 继续。

想同时保留稳定版、另测每日构建，可下载 NIGHTLY（独立 bundle ID，可与稳定版并存，有自己的 Sparkle 更新源）。

### 2. 接入 agent hooks（会话可恢复的前提）

```bash
cmux hooks setup
cmux hooks setup codex
cmux hooks setup --agent opencode
```

`cmux hooks setup` 会自动装它能找到的受支持 agent，并对跳过的 agent 打印摘要。README 列出的受支持恢复集成：Claude Code、Codex、Grok、OpenCode、Pi、Amp、Cursor CLI、Gemini、Rovo Dev、Copilot、CodeBuddy、Factory、Qoder。Claude Code 由 cmux 的 Claude wrapper 处理（需在 Settings 中开启 Claude 集成）。

### 3. 把「agent 在等我」变成可见信号

两条路径，任选：
- **自动**：任何发 OSC 9/99/777 转义序列的进程都会触发 pane 蓝环、侧栏未读徽标、通知弹窗和 macOS 桌面通知。
- **手动/钩子**：用 cmux CLI `cmux notify`，接进 agent hooks。

配套快捷键（用于「路由注意力」）：

| 快捷键 | 动作 |
|---|---|
| ⌘ ⇧ U | 跳到最新未读 |
| ⌘ I | 打开通知面板 |
| ⌥ ⌘ U | 切换当前项未读状态 |
| ⌃ ⌘ U | 把当前项标为最旧未读并跳到下一个最新未读 |
| — | 全部标已读 / 全部清除（默认未绑定，需在 Settings 或 `cmux.json` 中配） |

### 4. 一键跑 Claude Code 的 teammate 模式（多 agent 可见化）

```bash
cmux claude-teams
```

README 说明：teammate 会以原生分屏形式出现，带侧栏元数据和通知，**不需要 tmux**。

### 5. 远程机器上跑 agent，本地驱动

```bash
cmux ssh user@remote
```

为远程机器创建 workspace；可传初始命令：

```
cmux ssh user@remote --command 'omp "investigate auth"'
```

要点（README 原文）：`--command` 只在**第一个远程终端的第一个终端里运行一次**；浏览器 pane 走远程网络，所以 localhost 直接可用；把图片拖进远程会话会通过 scp 上传。

### 6. 关掉「重开时自动跑 agent 恢复命令」（保留布局恢复）

配置 `~/.config/cmux/cmux.json`：

```json
{
  "terminal": {
    "autoResumeAgentSessions": false
  }
}
```

或关闭 **Settings > Terminal > Resume Agent Sessions on Reopen**。

> 注意：这只关掉自动恢复命令；cmux 仍会恢复布局、工作目录、scrollback 和浏览器历史。

### 7. 手动恢复上一次会话

三种等价方式：`File > Reopen Previous Session`、`⌘ ⇧ O`、或：

```bash
cmux restore-session
```

### 8. 跨安装（stable / nightly / rc / staging / debug）迁移会话

```bash
cmux restore-session --from nightly          # or stable, rc, staging, debug:<tag>
cmux restore-session --export ~/session.json # write this install's saved session to a file
cmux restore-session --export ~/session.json --force # replace an existing export file
cmux restore-session --from ~/session.json   # reopen an exported file
```

行为差异（README 明确写出，照做前必须理解）：
- `--from <channel>`：按「你自己会话」同等信任恢复，**包括自动 agent 恢复**。
- `--from <path>`：视为**不可信**。只恢复布局、工作目录、文本 scrollback 和 http(s) 浏览器 tab；**文件里任何东西都不会自动运行**。内置 agent（Claude Code、Codex、Amp 等）用 cmux 依据 agent 种类 + session id 自己拼出的命令恢复，忽略文件里存的启动参数，且要求工作目录已存在。自定义 agent 恢复命令、resume 绑定、tmux 启动命令只保留供手动恢复。
- 会被丢弃：scrollback 里的终端控制序列（剪贴板、通知、链接、标题）、草稿附件、非 http(s) 页面与 profile、SSH/云连接、workspace 环境变量。
- 更新版本写的快照（较新 session 格式）会被拒绝并报错。

### 9. 给任意工具绑定自定义「恢复命令」

适用于自带持久状态、不需要 cmux 猜的工具（如 tmux 会话、自定义 agent CLI）：

```bash
cmux surface resume set --kind tmux --checkpoint work --shell "tmux attach -t work"
cmux surface resume show --json
cmux surface resume clear --checkpoint work
```

信任规则（照做前必须知道）：绑定附着在具体 cmux surface 上；公开 CLI 或 socket 创建的绑定只会被存储、供检视与手动恢复，**除非你批准一个签名命令前缀**才自动恢复；批准的前缀还会绑定工作目录与精确环境值（若存在）；可在 **Settings > Terminal > Resume Commands** 审阅或修改；cmux 只自动运行它标记为可信的绑定（如活进程探测到的 tmux 绑定，或用户批准的前缀）；token、password、secret、API key 等敏感环境键在存储绑定前会被丢弃。

### 10. 让 agent 活过 cmux 退出/崩溃/更新

```bash
cmux local-tmux
```

zellij 用户可用 `cmux local-zellij`。生命周期与机器休眠限制见 `docs/local-tmux.md`。

**边界（README 明说）**：本机 tmux server **活不过 logout、重启、关机或断电**；需要「这台 Mac 离线时进程仍在」时，改用 `cmux ssh-tmux`、`cmux mosh-tmux` 或持久云 VM。

### 11. 大仓库 / 托管 Mac 上的进程 churn 缓解

如果 shell watcher 抖动或托管 Mac 进程审计量过大，使用 README 点名的缓解开关：

```
CMUX_NO_GIT_WATCH=1
```

代价是 Git/PR 更新会受影响（细节在 `docs/shell-integration.md`）。

### 12. 其他可配置项（README 提及但细节在外链文档）
- **自定义命令**：在 `cmux.json` 里定义项目专属动作，从命令面板启动。
- **浏览器导入**：从 Chrome、Firefox、Arc 等 20+ 浏览器导入 cookie、历史、会话，让浏览器 pane 开局就是已登录态。
- **浏览器自动化**：给 agent 用（snapshot 可访问性树、取元素 ref、点击、填表、求值 JS、读 console/network），API 从 agent-browser 移植。
- **外观**：见 `docs/customizing-appearance.md`；配置为 `~/.config/cmux/cmux.json`。
- **Skills**：可复用的 agent 工作流，公开集合在 `cmux-skills` 仓库。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

### 1. 能力发现：AI 已经能做哪些还没想到交给它的工作
- **多 agent 并行的注意力路由**：把「某个 agent 需要输入」变成可跳到具体 pane 的结构化信号（OSC 9/99/777 或 `cmux notify`），而不是一句无上下文的系统通知——这是作者描述的真实痛点。
- **agent 自验证 web 改动**：内置浏览器是可编程的，agent 可以导航、快照 DOM、点击、填表、执行 JS、读 console/network，在 cmux 里自己验证 dev server 上的改动。
- **subagent/teammate 可见化**：agent 派生 subagent 时，cmux 把它变成原生 pane/分屏，而不是隐藏的后台进程。

### 2. 任务匹配：什么工作适合怎样的模型、工具和协作方式
- 适合：**在同一台 macOS 上并行跑多个终端型 agent**、需要一眼看出「谁在等我」的场景。
- 适合：**远程主机上跑 agent、本地驱动**（SSH workspace、浏览器走远程网络、图片 scp 上传）。
- 适合：**需要长期/跨重启保持的 agent 任务**，但必须换到 `ssh-tmux` / `mosh-tmux` / 持久云 VM，本机 `local-tmux` 撑不过关机断电。
- 作者明确反对强绑定：cmux 是 primitive，不锁工作流。

### 3. 条件供给：需要提供哪些信息、工具、权限和反馈
- **平台**：macOS（硬门槛）。
- **PATH**：装 hooks 前 agent CLI 必须在 PATH 上。
- **权限/信任**：自定义 resume 绑定要自动执行，必须先批准签名命令前缀；批准的前缀还绑定工作目录与精确环境值。
- **安全边界**：token/password/secret/API key 在存储绑定前被丢弃；`--from <path>` 视为不可信、不自动执行任何内容。
- **反馈回路**：通知环 + 侧栏徽标 + 通知面板 + 桌面通知 + ⌘⇧U 跳转，构成「agent 等待 → 人响应」的闭环。
- **配置面**：`~/.config/ghostty/config`（渲染）、`~/.config/cmux/cmux.json`（侧栏/tab/分屏/行为）、Settings 中的快捷键与 Resume Commands。

### 4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成
- **进程触发**：进程发出 OSC 9/99/777 时自动弹通知环/点亮 tab。
- **agent hooks 触发**：agent 需要输入或等待时触发通知。
- **重启触发**：重开 cmux 时自动恢复布局、工作目录、best-effort scrollback、浏览器 URL 与历史；开启自动恢复时，受支持 agent 会执行原生 resume 命令。
- **持久化触发**：`cmux local-tmux` / `local-zellij` 提供本地 detach/reattach；跨机器离线场景用 `ssh-tmux` / `mosh-tmux` / 云 VM。
- **手动触发**：`cmux restore-session`、`cmux surface resume`。
- README 没有描述定时（cron 类）编排；作者明说 cmux 是 primitive，不预设流程。

### 5. 效果验证：怎样判断确实改善了结果
- README **没有提供任何量化收益数据**（无基准、无 A/B、无成功率）。可验证的只有功能行为本身：通知是否亮起、⌘⇧U 是否跳到正确的 pane、会话是否恢复成功、浏览器 pane 是否保持登录态、远程 workspace 的 localhost 是否可用。
- 作者的主张（更快启动、更低内存、原生非 Electron）**没有给出任何测量数据**，只能作为自评。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：最直接相关。cmux 有专门的 Claude wrapper（需在 Settings 开启 Claude 集成），有 `cmux claude-teams` 一键进入 teammate 模式并把 teammate 变成原生分屏（**无需 tmux**）。Claude Code 是 README 点名支持自动恢复的 agent 之一。cmux 相当于给已 adopt 的 Claude Code 加一层「并行编排 + 注意力路由 + 会话恢复」的外壳，不替换它。
- **OpenCode（watch）**：`cmux hooks setup --agent opencode` 是 README 给出的显式命令；并支持 oh-my-opencode 多模型编排。
- **Cline（watch） / Cursor（watch） / goose（watch）**：README 的 FAQ 明确点名「Claude Code、Codex、OpenCode、Gemini CLI、Kiro、Aider、Goose、Amp、Cline、Cursor Agent，以及任何能从命令行启动的东西」都开箱可用（因为它就是个终端），但**没有专门集成或专门命令**，支持程度弱于 Claude Code / OpenCode。
- **与 tmux 的关系**（项目内的参照概念）：cmux 不是替代品——它是以 GUI + socket API 内置分屏/浏览器/垂直标签，不用配置文件、不用 prefix key；README 说很多人把 cmux + SSH + tmux 一起用，cmux 可原生 attach 远程 tmux 会话（beta）。但本机 tmux 的持久性边界仍在（撑不过 logout/重启/关机/断电）。

## 证据与局限

**原文给出的具体事实（可复核）**
- 平台：仅 macOS（native Swift + AppKit，基于 libghostty 渲染）。
- 一系列可直接复制的命令与配置键：Homebrew 安装/更新、`cmux hooks setup`（含 `codex` / `--agent opencode` 变体）、`cmux ssh ... --command ...`、`cmux local-tmux` / `cmux local-zellij`、`cmux surface resume set/show/clear`、`cmux restore-session` 的 4 种用法、`cmux.json` 的 `terminal.autoResumeAgentSessions`、环境变量 `CMUX_NO_GIT_WATCH=1`。
- 受支持 resume 集成清单（Claude Code、Codex、Grok、OpenCode、Pi、Amp、Cursor CLI、Gemini、Rovo Dev、Copilot、CodeBuddy、Factory、Qoder）。
- 明确的安全语义：敏感 env 键存前丢弃；`--from <path>` 不自动执行任何东西；自定义 resume 需批准签名前缀。
- 许可：主项目 GPL-3.0-or-later；`web/`、Cloudflare workers、relay services 用 Business Source License 1.1，**生产使用或自托管需商业许可**。README 提到若组织无法遵守 GPL，可联系商业条款（但仅限 Manaflow 拥有权利的部分，不含第三方材料）。
- 外部信号：GitHub 约 27,753 stars、当日 +96（来自仓库指标，非 README）。

**只是作者主张，未给数据**
- 「not Electron. Fast startup, low memory」——**无任何基准或内存数字**。
- 「任何终端里的 agent 都开箱可用」——无兼容性测试矩阵。
- 「The Zen of cmux」整节（primitive 而非 solution、百万开发者会更快找到最优工作流）是立场与愿景，不是可验证结论。

**局限与适用条件**
- **非 macOS 用户完全不适用**，没有 Windows/Linux 路径。
- README 中大量细节（自定义命令、浏览器自动化、快捷键全表、skills、外观、`docs/local-tmux.md`、`docs/shell-integration.md`）都**只给外链**，本材料里没有正文，照做时需要另开文档。
- **收益无可量化证据**：没有第三方评测、没有「多开 N 个 agent 后响应延迟下降 X%」之类的数据。是否真的比「Ghostty + 系统通知」更好，只能靠自测。
- **许可注意**：GPL-3.0-or-later 对某些企业不合规；服务端部分为 BSL 1.1，生产/自托管要商业许可。
- **会话恢复不是进程保持**：README 反复强调恢复的是 app-owned state 和 resume 命令，不 checkpoint 任意活进程；要真持久必须上 tmux/ssh-tmux/mosh-tmux/云 VM。
- iOS app、cmux AI、Cloud VMs、Voice mode 都在 Founder's Edition 付费 early access 里，非免费功能。

## 怎么试、怎么验证

**最小试用（建议半天内跑完，只针对「多 agent 并行」这一个痛点）**
1. 在 macOS 上按 §1 安装；确认它能读到你的 `~/.config/ghostty/config`（主题/字体应与原 Ghostty 一致，这是「没换环境」的快速确认）。
2. 装好 Claude Code（或 Codex/OpenCode）并确认 binary 在 PATH，然后跑 `cmux hooks setup`，看打印的安装摘要中是否包含你要用的 agent。
3. 开 3 个 workspace（⌘N），每个跑一个 agent 的独立任务；用 ⌘D / ⌘⇧D 分屏，`⌘1–8` 跳转。
4. 让其中一个 agent 停下来等输入，观察：pane 是否出现蓝环、侧栏对应 tab 是否点亮、macOS 是否弹桌面通知。
5. 按 ⌘⇧U，看是否**一次性跳到那个最新未读**；再按 ⌘I 看通知面板是否列全了所有待处理项。
6. 退出 cmux 再重开，确认布局/工作目录/scrollback 恢复；如不想自动跑 agent 恢复命令，先按 §6 配 `autoResumeAgentSessions: false` 再试。
7. 试跑 `cmux claude-teams`，确认 teammate 真的以分屏出现而不是藏在后台。
8. （可选）跑一次 `cmux ssh user@remote`，确认浏览器 pane 能访问远程 localhost、拖图片能上传。

**判断有没有改善的指标**（注意：以下均为自测建议，README 未提供任何指标）
- **等待→响应延迟**：从某个 agent 进入等待状态，到你切到那个 pane 并开始处理的时间；与原来「Ghostty + macOS 系统通知」的基线对比。
- **漏接次数**：一轮多 agent 并行中，有多少次 agent 等待超过 N 分钟后你才发现。
- **切错 pane / 找不到人的次数**：tab 一多时你点错 pane 的次数。
- **任务吞吐**：单位时间内并行完成的 agent 任务数（在相同任务集下对比基线）。
- **上下文重建成本**：重开 cmux 后回到「可继续工作」状态所需的手工操作步数（对比手动重开各个 agent 会话）。
- **资源开销**：与 Ghostty/其他终端相比的启动时间和常驻内存（作者声称更好但没给数，需要你自己量）。

**淘汰条件**：若你不是 macOS 用户，或你的日常并不是「同时跑多个终端型 agent」，或通知/恢复的信任与安全模型在你的合规要求下不可接受（GPL/BSL），则应放弃采用。
