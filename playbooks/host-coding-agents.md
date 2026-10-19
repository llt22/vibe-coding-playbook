# 让长期运行的编码 agent 在 tmux 里保活、可脚本驱动、可读回

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决编码 agent 断开终端即中断、多实例无统一入口、脚本化驱动与读回只能靠屏幕抓取的问题，同时保留现有十三条运行与验证路径。
> 先试这一步：先在一个仓库里运行 `claude --worktree --tmux=classic`；若只想单 agent 单分支，到此为止，否则按做法 N 建一仓库一会话并用 send-keys/capture-pane 驱动。
> 最近修订：2026-10-19

## 解决什么问题

本手册把编码 agent（Claude Code / Codex CLI / OpenCode / goose / pi / agentbox / Xiryn 等）从「在本机随手跑一次」变成「在可控环境里、按项目规则反复跑」，并能实时看到它在读什么、写什么，需要时在真实（仿真）系统里执行并拿到可判定结果。现有十三条做法 A-M 分别覆盖自托管工作区、MCP 供给、项目级护栏、只读规划/放权编辑分工、Codex CLI 起步、Claude Mods 受控试点、pi 容器化、观察面与危险命令闸门、手机审批与通知、QEMU guest 验证、云端一次性 VM、每 agent 独立沙箱桌面、换实现对比迁移。新增做法 N 补一层：用 tmux 给长期运行的 Claude Code 做保活与脚本化外壳，让 SSH 断开后会话仍在、一个仓库一个会话、一个任务一个窗口、用 send-keys 驱动、用 capture-pane 读回、用 pipe-pane 落盘日志。

## 适用与不适用

适用：需要服务器/非生产机器工作区、共享目录、Git 审查、按轮成本记录（A）；需要 MCP 供给工具权限（B）；已在单个真实项目用 Claude Code、想固定项目规则与自动化触发（C）；需要默认只读、bash 前询问的 plan 模式（D）；已有 ChatGPT 订阅想装官方 CLI（E）；需要受控试点 Claude Mods（F）；需要统一多 provider 接口并愿意自己容器化（G）；已在用 Claude Code、想先看清读写与危险命令（H）；已有 Codex App 桌面会话、想让审批和通知离开桌面（I）；需要真实内核/网络 guest 验证（J）；有 Pro/Max/Team/Enterprise、想把边界清晰任务放云端并行（K）；想在个人电脑自托管、每 agent 一台隔离 Linux 桌面、凭据不进视野、可手机接管（L）；想在 OpenCode 或现有编码代理之外换一个实现跑同一批任务对比（M）。新增 N 适用于：编码 agent 长期挂终端、SSH 断线仍要继续、多仓库/多任务需要统一入口、想用脚本 send-keys 驱动并用 capture-pane 读回、想把输出落盘成全量日志、单 agent 单分支先试内置路径的人。

不适用：agentbox 仅 34 stars、v0.1.7，存在 bypassPermissions 默认权限、凭据可被终端用户读取、单机单进程等硬约束，暂不适合作为通用方案（A）。goose README 只有入口级信息，供应商字段、权限、提示词、工作流需查官方文档（B）。claude-code-pro-course 仅 109 stars，README 是课程宣传页，install.sh/labs/starter-kit 内容与效果数据未给出（C）。OpenCode README 是入口文档，配置在外部 docs；桌面版 BETA；211212 stars 量级异常需核实（D）。Codex CLI 抓取只有 README 首页，没有工作流、权限/沙箱/审批、性能成本（E）。Claude Mods 是 early access、源码记录命令，作者未声称在真实会话执行，不适合生产依赖（F）。pi README 是宣传+导览，扩展细节仅链接；没有内置权限系统，不容器化不适合接触敏感文件/凭证/网络；默认无 sub-agents 和 plan mode（G）。hamzafer/claude-code-mods 只有 README，Code 视图限 macOS+Chrome+图片终端，My setup 类插件需 fork 改规则，blast-radius 需先演练（H）。Codex Mobile Bridge 是社区项目、依赖 Codex App 内部 IPC、无多用户隔离，免密高风险，Linux 实验性（I）。qemu-harness 项目体量小，自带 overlay 以 root、空密码启动 dropbear，README 标注 lab only，不可放到不可信网络；隧道低带宽（J）。Claude Code 云端会话不适用于 Console API key 或第三方 provider，需要 Pro/Max/Team/Enterprise，组织 owner 可能要先开启；routines 是 research preview、projects 是 public beta；网络 None 仍会向 Anthropic API 发请求（K）。Xiryn 仅 49 star、无第三方评测、定时/循环未实现、单体架构、需要 Docker，配置表在本次材料截断（L）。opencode-rust 仅 35 stars，`run` 端到端未在有余额 provider 上验证，README 主体是工程修复记录（M）。tmux 做法 N 不适用于：需要完成事件或结构化状态、重启机器后仍要恢复会话、不能运行 tmux 的环境、iTerm2 上想用 tmux 命令附着内置 native panes、把 tmux 当权限/审批系统的人；状态检测靠屏幕抓取，不能当作可靠完成信号。

## 前置条件

通用：一个非生产、可回退的仓库或环境；受管/涉密环境先审阅所有 `curl | bash`、`irm | iex`、`./install.sh`、`./setup.sh` 类脚本，或改用包管理器/源码审阅后执行。

A：Linux 服务器 + systemd + 本地 Docker；Ubuntu 22.04+/Debian 12+ 可自动补依赖；源码构建需 Docker 访问权限。B：本机可装 CLI，有受支持供应商 key 或订阅，非生产环境。C：macOS/Linux/WSL、Node+npm 或 curl、真实 Git 项目、可回退。D：macOS/Linux/Windows 开发机，安装前清 0.1.x 前旧版。E：Mac/Linux/Windows；按 ChatGPT 订阅需 Plus/Pro/Business/Edu/Enterprise；API key 需 additional setup。F：一次性项目、合成数据、无生产凭据、已批准 Claude Code、能设 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`、能生成 `/plugin-types`、有回滚负责人。G：Node.js 22.19+、非关键可回退仓库、优先容器环境、模型订阅或 API key。H：Claude Code 2.1.287+（README 自述，无法独立验证）、Code 视图需 macOS+Chrome+图片终端、非关键 Git 仓库。I：macOS/Windows 10/11、已运行 Codex App、电脑保持唤醒联网、手机同局域网、通知需 Bark/ntfy。J：Python 3.8+、QEMU、Go 1.22+、首次联网、非关键环境。K：Pro/Max/Team/Enterprise 且 claude.ai 登录；GitHub 连接；private repo 装 Claude GitHub App；终端路径已用 `gh` 且可 `/web-setup`；`claude --cloud` 前先 push。L：约 4 GB 空闲磁盘、至少一个 provider key（必需）、Firecrawl 可选、Node ≥20.9、Docker；Telegram 可选。M：Node 18+、可用 provider key、非关键小仓库；Homebrew 路径会拉 Rust 工具链。N：较新的 Claude Code，`claude --help` 能看到 `-w/--worktree` 与 `--tmux`；本机有 tmux；远程机器可 SSH；iTerm2 上内置路径用 native panes 而非真 tmux，脚本化必须加 `=classic`。

## 操作步骤

按环境选：A 要服务器工作区；B 要通用 agent+MCP；C 要 Claude Code 项目护栏；D 要 OpenCode build/plan 分工；E 要 Codex CLI 起步；F 要 Claude Mods 受控试点；G 要 pi 容器化+多 provider；H 要观察面与危险命令闸门；I 要 Codex 会话接手机；J 要 QEMU guest 验证；K 要云端一次性 VM；L 要每 agent 独立 Linux 桌面；M 要 opencode-rust 对比；N 要 tmux 保活/脚本化/读回。做法 C 可与 A 叠加；F 是 C 的扩展面试点；H 是第三方插件集合，不替代 F；I 与 E 并存；J 补执行目标；K 补会话跑在哪里；L 与 A 不同层；M 与 D 是同一层两个实现；N 是 C/E/K 等做保活外壳。

### 做法 A：Linux 服务器 agentbox

1. 安装：`curl -fsSL https://raw.githubusercontent.com/devilcoolyue/agentbox/main/install.sh | sudo bash`。固定版本追加 `-s -- --version v0.1.7`；只本机/反代访问追加 `-s -- --listen 127.0.0.1:8180`。预期：构建工作区镜像、生成配置和随机管理员密码、启动 `agentbox.service`。
2. 浏览器打开 `http://YOUR_SERVER_IP:8180`，用 `boxadmin` 和终端密码登录；系统设置→账号池加 Claude/Codex 账号，选订阅 OAuth 或 API key/relay。
3. 新建工作区，填名称、选 agent 和账号；文件上传或终端 `git clone`；对话发任务，结束后到变更页看 diff 再提交/下载。
4. 系统服务：`sudo ./deploy/install.sh`、`sudo ./deploy/deploy.sh`。备份含工作区用 `agentbox backup --full`（先停服务和相关容器），用 `backup-verify` 校验。

### 做法 B：goose + MCP

1. 可从文档安装页装桌面版；CLI：`curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash`。
2. 按 Quickstart 配模型供应商；按需接入 MCP 扩展；团队统一用 `CUSTOM_DISTROS.md` 构建预配置发行版。原文没有 provider 字段、权限设置、提示词、工作流细节，需查 goose-docs.ai。

### 做法 C：Claude Code 项目级护栏

1. 安装：`curl -fsSL https://claude.ai/install.sh | bash` 或 `npm install -g @anthropic-ai/claude-code`。
2. 写短 `CLAUDE.md`：命令、架构、规则；命令/风格/禁令要短，细节放 `.claude/rules/` 和 skills。
3. 权限用 `.claude/settings.json` 的 allow/ask/deny，检查顺序 deny→ask→allow；不要用 bypassPermissions。
4. PostToolUse hook 让格式化必然发生；PreToolUse 可拦 `rm -rf`、`.env`、迁移文件（`exit 2` + stderr 阻断）；Stop 做收尾检查。CLAUDE.md 是请求，hook 是规则。
5. subagent 隔离嘈杂审查；重复三次以上流程写 skill；`claude mcp add playwright -- npx @playwright/mcp@latest`，不用的 MCP 关掉。
6. 主工作流 Explore→Plan→Code→Verify→Commit；超过一个文件的改动先 Plan mode；每轮跑测试/lint/构建；`/clear` 开新任务，长任务 `/compact`，`/rewind` 或 Esc Esc 回退。
7. headless：`claude -p '...' --output-format json`；可限制工具与步数；GitHub 用 `/install-github-app` 后在 issue/PR 里 `@claude`。

### 做法 D：OpenCode build/plan

1. 清 0.1.x 前旧版；安装任选 `curl -fsSL https://opencode.ai/install | bash`、`npm i -g opencode-ai@latest`、`brew install anomalyco/tap/opencode` 或发行版包管理器。
2. 启动后按 `Tab` 在 `build` 与 `plan` 间切换；plan 默认拒绝文件编辑、bash 前询问权限；确认计划后切 build 执行。
3. 复杂搜索/多步任务用 `@general` 调 general 子代理；桌面版 BETA。模型与协作配置查 `https://opencode.ai/docs` 与 agents 文档。

### 做法 E：Codex CLI

1. 安装：`curl -fsSL https://chatgpt.com/codex/install.sh | sh` 或 `npm install -g @openai/codex` 或 `brew install --cask codex`；Windows 用 PowerShell 安装命令。
2. 运行 `codex`，选 Sign in with ChatGPT；API key 路径需 additional setup。原文只有 README 首页，工作流、权限/沙箱/审批、性能成本未给。

### 做法 F：Claude Mods 受控试点

1. `claude --version`；`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude`；在兼容会话执行 `/plugin-types` 并留存与当前安装匹配的声明。
2. 从官方仓库已审阅 revision 检出，在 checkout 根目录运行：`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir ./mods/diff`，再跑 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test ./mods/diff`。
3. 按验收矩阵逐项测：版本/API 漂移、链式组合、保护缺失或损坏、敏感金丝雀泄漏、只考虑 UI 的假设、运维回归。成本公式：每被接受任务总成本 =（可归属模型与工具费用 + 工程与评审时间）÷ 通过同一验收标准的任务数。early access，不替代 Skills/MCP/经典 hook；命令不可用就找管理员，不要关组织托管保护。

### 做法 G：pi 容器化试用

1. 确认 Node.js 22.19+；安装 CLI：`curl -fsSL https://pi.dev/install.sh | sh`，Windows 用 PowerShell 安装脚本，或 npm 安装。`pi update` 更新。
2. `cd /path/to/project && pi`；在 Pi 内 `/login` 接入订阅或 API key。
3. 权限边界：pi 没有内置权限系统，不限制文件系统/进程/网络/凭证；用容器化模式之一：Gondolin extension、Plain Docker（起步最简单）、OpenShell。
4. 换一个 provider 用同一提示重跑，验证统一接口可迁移；需要固定版本用 Nix：`nix run github:earendil-works/pi/stable`。默认无 sub-agents 和 plan mode。

### 做法 H：Claude Code 观察面与危险命令闸门

1. `claude plugin marketplace add hamzafer/claude-code-mods`；`claude plugin install mission-control@claude-code-mods`。
2. 重启 Claude Code，`/mission` 开面板；`w` 看 agents 和每次工具调用，`c` 看代码地图（需 macOS+Chrome+图片终端）；蓝=读、橙=写、绿=完成。
3. 可加 token-weather、`/where`、`/radar`、`/browser`、`/replay`、`/md`；blast-radius 对 `rm -r`、force push、migration 先展示影响范围并等待确认，超时取消。先在含可丢弃文件目录演练。My setup 类插件需 fork 改规则。

### 做法 I：Codex Mobile Bridge

1. 在 macOS/Windows 已运行 Codex App 的电脑安装 Bridge v1.3.1；在「网络与登录」保留局域网和账号密码，启动网关。
2. 手机连同一局域网，在 App 首页展开「扫码登录」扫码；二维码 5 分钟内有效、仅一次、网关重启失效。选已有会话，发消息、排队、撤回、停止、回应权限/提问卡片、切模型与 Skill。复杂 MCP 表单、身份验证挑战回桌面。
3. 通知：iPhone 用 Bark 填服务地址和 Device Key；Android 用 ntfy 填服务地址和完整主题名，公共匿名主题 Token 留空；发测试通知以手机实际收到为准。外网用临时 HTTPS、自有服务器 SSH、NAS/反代；只测 `127.0.0.1` 不算。免密 `--no-auth` 高风险，默认账号密码至少 12 位。

### 做法 J：qemu-harness

1. 前提 Python >=3.8、QEMU、Go >=1.22；Windows 安装：`irm https://raw.githubusercontent.com/b3s3da/qemu-harness/main/install.ps1 | iex`；Linux/macOS：`git clone https://github.com/b3s3da/qemu-harness && ./install.sh`。
2. 新终端在项目目录：`mkdir lab ; cd lab`；`qh up --kernel alpine:aarch64`；`qh exec 'uname -a; ip -4 -o a show eth0'`；`qh down`。预期：构建 initramfs、启动 VM、agent 可应答；退出码传播。
3. 项目级 `qh.json` 固化 kernel/mem/smp/fs/pkgs/fwd；用 `qh probe` 预检、`qh up --dry-run` 核对 QEMU 命令行、`qh exec --json` 的退出码判定。自带 overlay 以 root、空密码启动 dropbear，lab only。

### 做法 K：Claude Code 云端会话

1. 前提 Pro/Max/Team/Enterprise 且 claude.ai 登录；组织 owner 可能要先开启。连接 GitHub：public 登录 GitHub；private 在拥有仓库的账号/组织安装 Claude GitHub App；终端已用 `gh` 可 `/web-setup`。
2. 写自包含工单：什么问题、完成定义、如何证明；用 `claude --cloud 'npm test fails maybe one run in four. Find the flaky test, fix root cause, prove by running suite at least 30 times.'` 这类提示点名证明命令。先 `git push` 当前分支。
3. 并行多个 `claude --cloud`；关标签页后手机/浏览器看进度；结束后在 diff view 逐条审查并开 PR。
4. 本地计划、云端构建、终端收尾：`claude --permission-mode plan` 定方案 push，再 `claude --cloud 'Execute the migration plan in docs/migration-plan.md'`；`claude --teleport` 拉回本地。环境网络设 None/Trusted；secrets 不放共享变量；命令写进 CLAUDE.md。routine 是 research preview，运行时无审批提示。

### 做法 L：Xiryn 自托管个人 agent 运行环境

1. 非主力机器，约 4 GB 空闲磁盘，至少一个 provider key；安装：`curl -fsSL https://raw.githubusercontent.com/SouravBeraAkaSpeed/xiryn/main/setup.sh | bash`，Windows 用 PowerShell 安装脚本；或手动 `git clone ...`、`npm install`、`npm run setup`、`npm run dev`。
2. 打开 `http://127.0.0.1:6796`，Settings 填 key；每个 agent 跑自己的 Linux 桌面容器（shell、持久 home、1280×800 桌面+Chromium）。状态栏点一次 alerts 才允许桌面通知。
3. Telegram：@BotFather 发 `/newbot` 拿 token，填 Settings→Remote access，手机扫码 Start；命令 `/agents`、`/new`、`/stop`、`/status`。机器人走本地 long-poll，只能一个配对账号使用。
4. 需要时 Take over 接管，交回时附一句说明让 agent 接着做；凭据掩码显示，由 Xiryn 填页面，每笔支付逐次批准。定时/循环任务未实现。

### 做法 M：opencode-rust 对比试用

1. Node 18+；安装 npm 预编译包：`npm install -g opencode-rust`；或 Homebrew `brew install vakandi/tap/opencode-rust`（从源码构建，拉 Rust 工具链）；或源码 `./install.sh`。
2. 首次运行前 `export ANTHROPIC_API_KEY=sk-ant-...`；三种运行：`opr`、`opr run 'check this repo for risks'`、`opr serve --port 3000`。
3. TUI 里 `Tab` 切 `build`/`plan`；命名 agent 快捷命令等价于 `--agent <slug>`。Homebrew 安装必须显式写 `opr tui --some-flag`，npm 分发脚本会把 `opr --some-flag` 转成 `opencode tui --some-flag`。
4. 无人值守长任务：`opr run --wait-background-timeout 300 '...'`，默认 120 秒；`opr db path` / `opr debug paths` 核对配置；代理池不要自己 export 代理环境变量，必须通过 `opencode_proxy::start()` 启用。`run` 端到端尚未在有余额 provider 上验证，先只用 TUI。

### 做法 N：用 tmux 给 Claude Code 做保活与脚本化外壳

1. 先试内置路径。前提：较新的 Claude Code，`claude --help` 能看到 `-w/--worktree` 与 `--tmux`。

```
claude --worktree --tmux

# or name the worktree
claude --worktree auth-refactor --tmux
```

`--tmux` 不带 `--worktree` 会报错；在 iTerm2 上它用 native panes 而非真 tmux，后面 tmux 命令无从附着。要脚本化必须加 `=classic`：

```
claude --worktree --tmux=classic
```

单 agent、单分支的场景到此为止，不必往下看。

2. 一会话一仓库，用 repo 名命名。组织规则不是一任务一会话、也不是一 agent 一会话，而是一个 repo 一个 session：任务是流动的，项目是稳定的。

```
tmux new-session -d -s api -c ~/code/api
tmux new-session -A -s api -c ~/code/api
```

`-A` 是 attach-or-create，可重复执行。会话名不能含 `.` 或 `:`（tmux target 分隔符）。巡检：

```
tmux ls
tmux list-sessions -F '#{session_name} windows=#{session_windows} attached=#{session_attached}'
```

3. 会话内按任务开窗口，只为正在盯的开 pane：

```
tmux new-window -t api -n auth -c ~/code/api
tmux new-window -t api -n tests -c ~/code/api
tmux split-window -h -c '#{pane_current_path}'
tmux split-window -v -c '#{pane_current_path}'
tmux select-layout tiled
```

`-c '#{pane_current_path}'` 极易漏写；漏了会在会话初始目录开 pane，agent 被指到错误仓库。并排布局：

```
tmux select-layout main-vertical
tmux set-window-option main-pane-width 60%
```

百分比值需要 tmux >=3.2，旧版用绝对列数。

4. 写入 `.tmux.conf` 的增量配置：

```
set -g history-limit 100000
set -g default-terminal 'tmux-256color'
set -ga terminal-overrides ',*256col*:Tc'
set -g mouse on
set -g allow-rename off
set-window-option -g automatic-rename off
set -g base-index 1
set-window-option -g pane-base-index 1
set -g renumber-windows on
set-window-option -g monitor-activity on
set -g visual-activity off
set -g status-interval 5
set -sg escape-time 10
bind -n M-h select-pane -L
bind -n M-j select-pane -D
bind -n M-k select-pane -U
bind -n M-l select-pane -R
```

`allow-rename off` 防止 agent TUI 改掉命名窗口；`escape-time 10` 治方向键发粘。

5. 用 `send-keys` 驱动 agent。目标语法 `session:window.pane`：

```
tmux send-keys -t api:auth 'run the test suite and fix what fails' Enter
```

三个坑：裸参数会被当键名；用 `-l` 发字面量：

```
tmux send-keys -t api:auth -l 'press Enter to continue was the old flow'
tmux send-keys -t api:auth Enter
```

文本里的分号会截断 tmux 命令，需要转义；agent TUI 需要在文本和回车之间留一拍：

```
tmux send-keys -t api:auth -l '你的提示词'
sleep 0.3
tmux send-keys -t api:auth Enter
```

打断失控 agent：`tmux send-keys -t api:auth C-c`。

6. 用 `capture-pane` 读回：

```
tmux capture-pane -p -t api:auth
tmux capture-pane -p -J -S -200 -t api:auth
tmux capture-pane -p -J -S - -t api:auth
tmux capture-pane -p -e -t api:auth
```

`-J` 合并折行；不合并时一行断成两行，之后 grep 在接缝处会错。

7. 落盘成全量日志：

```
tmux pipe-pane -o -t api:auth 'cat >> ~/agent-logs/api-auth.log'
tmux pipe-pane -t api:auth
```

`-o` 是 toggle，跑两次关闭；输出是含转义序列的原始流，要可读需过滤。

8. 状态栏监控可选。作者自己说它是补丁：

```
set -g status-interval 5
set -g status-right '#(~/bin/tmux-agent-status) | %H:%M'
set -g status-right-length 100
```

脚本按 `capture-pane` 最后几行判断 parked/working/idle，属于屏幕抓取。轻量替代用 tmux 原生活跃度：

```
set-window-option -g monitor-silence 30
set -g visual-silence on
```

9. SSH/远程机器：

```
ssh devbox -t tmux new-session -A -s agents
```

断线后重跑同一条命令回到同一会话；链路差可配 mosh。嵌套 tmux 冲突：远端改前缀 `set -g prefix C-a`，或按两次 prefix。

10. 知道它会活过什么、活不过什么：关终端窗口、detach 客户端、SSH 断开，agent 继续跑；`tmux kill-session`、`tmux kill-server`、重启机器，不继续。

## 怎么判断变好了

A：用量页按用户/模型/时间过滤 tokens、成本来源、单轮延迟，可 CSV 导出；缓存命中率 `cache reads / (uncached input + cache reads + cache writes)`；每条回复显示时间、模型、设置快照和记录成本；变更页看 diff 和整文件。无效果评测。
B：挑 1 个重复性高、边界清楚任务，记录手工基线；非生产机器接 1 个 provider + 1~2 个相关 MCP；重复 3~5 次。看完成率、人工介入/返工时间、token 费用、权限请求数量、失败归因。
C：在单个真实项目只落地短 CLAUDE.md、permissions、一个 PostToolUse hook；用 Plan mode 跑同类任务 3~5 次。看完成率、人工介入/返工、token 费用、权限请求、失败归因、提交前 diff 是否变小、hook 是否拦住未格式化/未测试改动、`/context` 是否塞着不用 MCP。
D：选不熟悉中小仓库，让 plan 定位 X 功能并给计划，人工核对命中；确认后切 build 执行；另取同量级任务跳过 plan 做对照。看定位准确率、计划返工次数、到首个可运行改动耗时、plan 拦下次数、build 回滚/重做次数。
E：约 15 分钟：本机安装、`codex` 选 ChatGPT 登录、小仓库给边界清晰任务、人工 review 每处改动。看是否一次跑通、diff 人工重写比例、与手工时间差、上下文误解次数、权限确认次数。
F：记录版本、启动实验开关、保存 `/plugin-types`、加载 diff 示例并跑测试脚手架；按验收矩阵逐项留证据；用成本公式在相同任务集/模型/质量线下比较基线。交互省时但返工变多可能是净亏；只有明确运行时/界面限制、受控数据、负责人、回滚手段才试点。
G：非关键可回退仓库；记录安装方式；先在 Plain Docker 等容器里跑；`pi` + `/login`；给边界清晰小任务；换 provider 重跑同提示。看一次完成率、人工介入、返工/补上下文、换 provider 是否仍跑通、实际触达文件系统/网络范围；会话导出先确认合规。
H：非关键仓库装 mission-control 和 token-weather；派一个改 3–5 文件、拉起至少一个子 agent 的任务；用 `w`/`c` 记录错误读写发现时延；在可丢弃目录演练 blast-radius 的 `rm -r`。看发现错误读写时延、上下文事故次数、被阻塞次数/时长、危险命令拦截率、额度消耗。Code 视图打不开就停。
I：半小时：只开局域网+账号密码；手机扫码选已测会话；发短标记确认原会话收到并回复；测一次待确认卡片；配置 Bark/ntfy 测试；关手机网页看完成通知；重启网关看登录/地址/会话。看手机读取/实时更新、消息到达、审批生效、通知不轰炸、未登录 401、停网关不可访问、重启恢复、无重复提交/误操作。外网必须用真实手机蜂窝网络验 HTTPS。
J：非关键机器装 qh；跑 `qh up --kernel alpine:aarch64` → `qh exec 'uname -a; ip -4 -o a show eth0'` → `qh down`；挑需要真实内核/网络验证的小任务，先用现有工具做基线，再交给 agent+skill。看 guest 内是否返回 stdout/stderr/exit code、到可判定结果耗时、人工介入次数、跨架构是否一次跑通、TCG 耗时是否可接受。大 payload 走隧道失败说明用法不匹配。
K：先跑通一个任务：有对应计划并登录、连接 GitHub、选仓库和 Default 环境；写自包含工单并用 `claude --cloud` 发起，点名证明命令；关标签页后回来看进度和 diff；用本地 Claude Code 做对照；重复 3–5 次。看是否拿到可判定证据、人工介入/返工相对本地基线、到可审查 diff 耗时、并行 session 计划用量、是否出现需手动处理的 merge conflict。
L：非主力机器装一份，只配一个 provider key，不接 Firecrawl/Telegram；建单个 agent 给真实小任务（clone 仓库跑测试给 diff，或带引用调研）；确认隔离是否成立；同任务用本地 Claude Code 对照；记录一次 Take over 交回；看 token 花费。看沙箱隔离、hand-off 人工介入成本、token/单任务成本、持久 home 是否留住文件、凭据是否掩码且支付逐笔批准。
M：npm 装一份，export 有余额 provider key；非关键小仓库用 `opr run` 和 TUI 各跑同一任务；再用现有编码代理跑对照；重复 3–5 次。看一次跑通/人工介入、diff 人工重写比例、耗时与资源占用、`run` 后台等待是否等到工作、MCP server 是否起来且工具注册、换实现同提示是否跑通。`run` 端到端跑不通就先只用 TUI。
N：最小试用：一个 repo、一个会话、一个边界清晰任务，半天/一个任务周期。先试 `claude --worktree --tmux=classic`，再试手工 `tmux new-session -A -s <repo>`；用 `send-keys` 发任务，`capture-pane -p -J` 读回，`pipe-pane` 写日志；断开 SSH 后重跑 `ssh devbox -t tmux new-session -A -s agents` 看是否回到同一会话且 agent 仍在跑。看：`tmux ls` 能看到 repo 会话；窗口按任务命名；send-keys 能驱动；capture-pane 能读回可 grep 输出；日志文件持续增长；状态栏/脚本能区分 working/parked/idle（仅屏幕抓取，不保证准确）。若你需要完成事件、结构化状态或重启后恢复，则不应采用 N。

## 常见坑

- A：agentbox 默认 bypassPermissions、凭据可被终端用户读、单机单进程；撤销账号访问不会收回已下发凭据、不会终止运行进程；Web 提交不 push、不跑 Git hooks/签名；默认备份不含工作区；持久文件只放 `/workspace`、`/home/agent`、每用户 `/shared`；容器停止或重建就终止进程。
- B：`curl | bash` 先审阅；README 是宣传页，配置细节、权限模型、扩展清单、沙箱边界、效果数据都缺。
- C：install.sh/starter-kit 内容未展示，先审查；CLAUDE.md 超过几百行会淹没重点；deny 永远优先；无人值守只在无生产访问容器/沙箱；CLAUDE.md 是请求，hook 是规则；不用的 MCP 关掉；一个任务一个会话，错误上不要叠第三条消息。
- D：安装前清 0.1.x 前旧版；桌面版 BETA；README 是入口，配置/模型/提示词/协作流程在外部 docs。
- E：API key 需 additional setup；curl/PowerShell 安装是下载即执行，受管环境先审阅或改用 npm/brew/手动二进制。
- F：early access，API 可能不通知就变；`/diff` 已是内置命令会争夺归属；`hooks.json` 只是加载器片段，不是安全控制；不要从一次成功运行推断 fail-closed；`sec-default` 不是通用防火墙；升级后重新生成声明。
- G：pi 无内置权限，不隔离不要接触敏感文件/凭证/网络；README 是宣传+导览，扩展细节仅链接；默认无 sub-agents/plan mode；npm 不 pin 传递依赖；`pi-telemetry`/`pi-share-hf` 导出等于上传工作数据，先确认合规。
- H：材料只有 README，无基准/耗时/token 节省/用户反馈；Code 视图限 macOS+Chrome+图片终端；My setup 类插件需 fork 改规则；blast-radius 先在可丢弃目录演练，漏拦一次就不该作为真实仓库唯一闸门。
- I：社区项目、与 OpenAI 无隶属、依赖 Codex App 内部 IPC；免密高风险；二维码 5 分钟一次、网关重启失效；只测 `127.0.0.1` 不算外网可用；通知不保证恰好一次；无多用户角色隔离；复杂 MCP 表单/身份验证挑战回桌面；`.local/` 不上传公开仓库。
- J：自带 overlay root 空密码 dropbear，lab only；无 NIC 驱动时隧道约 15 KB/s 入、75 KB/s 出，大 payload 放 `fs/` 再 `qh reload`；Git Bash 设 `MSYS_NO_PATHCONV=1`；`agent did not respond` 先 `qh logs --tail 80` 再 `qh probe`；跨架构 TCG 偏慢，同架构才可 WHPX/KVM。
- K：`claude --cloud` 从 GitHub 克隆当前分支，先 push；闲置 VM 会回收，长任务边做边 commit；secrets 不放共享环境变量；网络 None 仍会向 Anthropic API 发请求；setup script 必须 exit 0 且约 5 分钟内完成；缓存只存文件不存进程；routine 运行时无审批提示；Claude 不会收到与 base 分支的 merge conflict 通知，需要让它 rebase；Console API key/第三方 provider 不适用。
- L：setup 是下载即执行，先审阅；49 star、无第三方评测、无效果对照；定时/循环未实现；单体 Next.js 进程是单点；Settings 值优先于 `.env` 且只存 `data/xiryn.db`；配置表在 `XIRYN_WORKSTATION_CPUS`/`XIRYN_WORKSTATION_MEMORY_GB` 处截断；Take over 与凭据保险箱只有机制描述，按钮路径需到界面确认；Telegram 需联网。
- M：`run` 端到端未在有余额 provider 验证；`opr` 在 npm 与 Homebrew 安装下行为不等价；Homebrew 从源码构建会拉 Rust 工具链；npm 无匹配平台时干净退出；代理池不要自己 export 代理变量；代理池无注释语法，`#` 行只是解析失败丢弃；命名 agent 显示名与配置 slug 不一致会导致配置落不到 agent；drain 是 fail-open，不会挂死但也不保证一定等到。
- N：`--tmux` 不带 `--worktree` 会报错；iTerm2 用 native panes 而非真 tmux；脚本化必须 `=classic`；会话名不能含 `.` 或 `:`；`split-window` 漏写 `-c '#{pane_current_path}'` 会开错目录；`main-pane-width` 百分比需 tmux >=3.2；`send-keys` 裸参数会被当键名，分号会截断命令，TUI 需在文本和回车之间 sleep 0.3；`capture-pane` 不带 `-J` 会让 grep 在折行接缝出错；`pipe-pane -o` 是 toggle，原始流含转义；状态检测靠屏幕抓取，没有完成事件，`kill-session`/`kill-server`/重启机器后会话不保留；嵌套 tmux 需改前缀或按两次 prefix。

## 证据与来源

- 做法 A 依据《devilcoolyue/agentbox》：安装命令、配置样例、工作区闭环、容器默认限额、账号池与凭据约束、备份与价格目录说明来自原文；34 stars、v0.1.7、硬约束为报告结论；无效果评测。
- 做法 B 依据《aaif-goose/goose》：安装命令、供应商/MCP/定制发行版链接来自 README；其余为作者主张；无配置细节。
- 做法 C 依据《justxor/claude-code-pro-course》：安装、CLAUDE.md、permissions、PostToolUse hook、subagent、skill、MCP、headless、Explore→Plan→Code→Verify→Commit、提示词示例来自 README；109 stars、课程宣传页；无 install.sh/labs/starter-kit 内容与效果数据；先落地片段为作者主张。
- 做法 D 依据《anomalyco/opencode》：安装命令、目录优先级、build/plan、Tab、@general、桌面包名来自 README；211212 stars 量级异常；plan 描述无案例；配置在外部 docs 未抓。
- 做法 E 依据《openai/codex》：安装命令、下载源与回退、环境变量、二进制文件名、登录方式、Apache-2.0、127,454 stars 来自 README 首页；无工作流/权限/审批/性能成本；指标为报告提出。
- 做法 F 依据《Claude Mods: Setup, Function Hooks and Security》：实验开关、`/plugin-types`、`--plugin-dir`、`plugin test`、插件目录结构、`hooks.json`、选型表、验收矩阵、成本公式、`sec-default`/`telemetry` 边界来自原文；作者声明文档与源码审阅非 benchmark、命令未在真实会话执行；成本公式为作者方法。
- 做法 G 依据《earendil-works/pi》：安装、Node 22.19+、`/login`、Nix、包列表、三种容器化、源码构建、供应链加固、telemetry、OpenClaw 案例来自原文；111397 stars 为 metrics；扩展细节仅链接；无效果数据；最小试用为报告提出。
- 做法 H 依据《hamzafer/claude-code-mods》：marketplace 安装、`/mission`、`w`/`c`、颜色语义、token-weather、blast-radius、My setup 属性来自 README；MIT、37 stars、演示图为硬信息；无基准、耗时、token 节省或用户反馈；2.1.287+ 无法独立验证；最小试用为报告提出。
- 做法 I 依据《try2love/codex-mobile-bridge》：v1.3.1 下载安装、局域网网关、扫码、手机操作、Bark/ntfy、四种入口、命令行参数、安全说明来自 README；32 stars；依赖 IPC；设计说明无独立评测；指标为项目验收维度。
- 做法 J 依据《b3s3da/qemu-harness》：安装、最小链路、`qh.json`、命令表、SKILL.md、排障、性能数字来自 README 自述；无第三方复现；案例仅 Alpine 与 Android GKI；lab only；最小试用为报告提出。
- 做法 K 依据《Claude Code in the cloud: a field guide to cloud sessions》：五步起步、GitHub 三路径、工单提示词、并行 session、超时变量、plan+cloud+teleport、手机查看、Auto-fix、routine、一次性 VM/网络、setup script、CLAUDE.md 来自原文；套餐/组织/preview 为原文自述；正文在「五个 ses」处截断；无效果评测；最小试用沿用通用节奏。
- 做法 L 依据《SouravBeraAkaSpeed/xiryn》：安装脚本、手动安装、agent 代装提示词、启动、Telegram、配置表、独立 Linux 桌面容器、单体架构、Take over、凭据保险箱、Node≥20.9、约 4 GB 来自 README；49 stars；无第三方评测；定时未实现；配置表截断；最小试用为报告提出。
- 做法 M 依据《vakandi/opencode-rust》：安装三路径、平台包名、export key、`opr`/`run`/`serve`、Tab、命名 agent、配置解析、MCP、run 等待、代理池、cargo test 来自 README；MIT、35 stars、21 crates、571 tests、22 内置工具、3 servers 约 4 秒暴露 77 工具为仓库自述或工具行为；Rust 更省资源为作者主张；`run` 端到端未验证；对比指标为作者主张。
- 做法 N 依据《Tmux and Claude Code: Sessions, Send-Keys, and the Ceiling》：内置 `--worktree --tmux`、`=classic`、会话/窗口/pane 命令、`.tmux.conf` 增量、`send-keys` 三个坑、`capture-pane` 参数、`pipe-pane`、状态栏脚本、SSH、存活表均来自该报告转述原文；推荐 crystl 为作者推荐；原文明确状态检测靠屏幕抓取、无完成事件、重启即失；无效果数据或基准；判断指标与最小试用为本手册沿用通用节奏，属作者主张。
- 十四条做法都没有「AI 是否让结果变好了」的对照评测或基准数据；A 是记账维度，F 是验收矩阵/成本公式，J 是退出码/probe/dry-run，K 是点名命令证据，M 是工具自检数据，N 是保活/读回能力；均非独立基准。

## 依据的调研

- [devilcoolyue/agentbox](../research/radar/2026-10-02/36-devilcoolyue-agentbox.md)：值得一试，建议在一台可信的 Linux 服务器上小范围试装 agentbox，用它把 Claude Code / Codex CLI 装进 Docker 工作区，换取持久工作区、共享目录、统一 Git 审查和按轮次的用量成本记录；理由是一键安装命令、最小配置样例和任务闭环步骤都可直接照做，但项目仅 34 stars、稳定版 v0.1.7，且原文自述存在 bypassPermissions 默认权限、凭据可被终端用户读取、单机单进程等硬约束，暂不适合直接作为通用方案推给不特定的人。
- [aaif-goose/goose](../research/radar/2026-10-01/550-aaif-goose-goose.md)：值得一试，建议小范围试用：在非生产机器上用给出的命令装 CLI，接一个模型供应商和 1~2 个相关 MCP 扩展，拿一个重复性任务跑通并记录人工耗时变化；理由是它是本地运行、能用 MCP 供给工具与权限的通用 agent，README 给了可复制的安装方式，但配置与工作流细节缺失，须配合官方文档。
- [justxor/claude-code-pro-course](../research/radar/2026-10-02/672-justxor-claude-code-pro-course.md)：值得一试，建议小范围试：先把 README 里可直接复制的片段（短 CLAUDE.md、permissions 的 allow/ask/deny、PostToolUse 自动格式化 hook、subagent 与 skill 定义、Plan mode 工作流）在单个真实项目上落地，再决定是否引入其 starter-kit 安装脚本与 CI 集成；理由是这些配置具体到可照抄、覆盖了上下文供给与自动化触发两条主线，但仓库自带的 install.sh／labs／starter-kit 具体内容与任何效果数据都未在原文中给出，不足以直接判定为成熟可采用的成品。
- [anomalyco/opencode](../research/radar/2026-10-02/511-anomalyco-opencode.md)：值得一试，可先在一台开发机上按 README 给的 brew/npm 命令安装 OpenCode，用 Tab 在 build 与 plan 之间切换，把「读陌生代码库、出改动计划」固定交给只读的 plan agent，确认后再切到 build 执行。理由：README 直接给出了可复制的安装命令和 plan agent 的权限行为（默认拒绝文件编辑、执行 bash 前询问），这套「先只读规划、再放权编辑」的分工流程可以照做；但仓库内容只到入口层，配置细节与效果未给，需自行验证。
- [openai/codex](../research/radar/2026-10-02/516-openai-codex.md)：值得一试，可以按 README 给出的命令在本机装好 Codex CLI、用 ChatGPT 账号登录，先在真实小仓库里跑通一次终端编码任务；因为原文只提供了安装与登录这类可照做的步骤，没有可提炼的工作流配置，所以先小范围试而不是直接采用。
- [Claude Mods: Setup, Function Hooks and Security](../research/radar/2026-10-02/851-claude-mods-setup-function-hooks-and-security.md)：值得一试，把 Claude Mods 当作受控试点的运行时/界面扩展面来用：先用实验开关与 /plugin-types 在一次性项目里跑通官方 diff 示例，再按文章的验收矩阵和「每被接受任务总成本」指标判断是否留下。理由是原文给出了可直接复制的启用命令、插件目录结构、hooks.json 片段和一整套安全验收检查，但它自认只是文档与源码审阅、API 处于 early access，因此不适合直接采纳为生产依赖。
- [earendil-works/pi](../research/radar/2026-10-03/518-earendil-works-pi.md)：值得一试，建议小范围试：按 README 的安装脚本装好 pi，在单个有版本控制的项目目录里用 /login 接入模型跑一个边界清晰的小任务（优先在容器里跑），验证它作为「统一模型接口 + 编码 agent」能否承载可复用的协作工作流；理由是原文给出了安装、启动、登录、容器化三类能直接照做的步骤，但扩展、技能、提示词模板等定制细节全在外链文档里，只有实测才能判断值不值得写进手册。
- [hamzafer/claude-code-mods](../research/radar/2026-10-04/1071-hamzafer-claude-code-mods.md)：值得一试，建议在受控项目里小范围试装 mission-control（配合 token-weather、按需 blast-radius），用实时视图观察 agent 读了哪些文件、写了什么、上下文还剩多少，并在危险命令前设一道闸；理由是 README 给出了可直接照抄的安装命令、快捷键和版本要求，属于可执行流程，但全部依据仅为该 README，无实测数据，且部分视图依赖特定 Claude Code 版本与 macOS/Chrome 环境。
- [try2love/codex-mobile-bridge](../research/radar/2026-10-04/1187-try2love-codex-mobile-bridge.md)：值得一试，建议在单台 macOS/Windows 电脑上加装该桌面 App，先在局域网和账号密码模式下小范围试用，把已有 Codex 会话接到手机做异步审批和完成通知；原因是它给出了可照做的安装、启动、通知和部署 Agent 步骤，但依赖 Codex App 内部 IPC、属社区项目，外网暴露和安全边界需自行验收。
- [b3s3da/qemu-harness](../research/radar/2026-10-06/1581-b3s3da-qemu-harness.md)：值得一试，先在一台 Windows 或 Linux/macOS 机器上按 README 跑通「qh up → qh exec → qh down」这条最小链路，再用自带的 skill/SKILL.md 把它接给 Claude Code，让需要真实系统验证的任务在 guest 里执行；理由是原文给出了可直接复制的安装命令、完整 CLI 用法、qh.json 配置和排障路径，能补上 agent 缺少真实内核/网络执行环境这一环，但项目体量小、自带 overlay 为 lab 用途，适合小范围试用而非全盘采用。
- [Claude Code in the cloud: a field guide to cloud sessions](../research/radar/2026-10-07/1611-claude-code-in-the-cloud-a-field-guide-to-cloud-se.md)：值得一试，建议按文中步骤在 Claude Code 套餐中开通云端会话，先把边界清晰、需要独立验证的任务（如修 flaky test、更新 API 文档、结构化日志）以自包含工单+证明命令的方式并行跑起来，再决定是否推广；理由是原文给出了可直接复制的命令、环境配置、GitHub 接入与证据要求，但依赖套餐/组织权限且 routines/projects 等仍属 preview/beta。
- [SouravBeraAkaSpeed/xiryn](../research/radar/2026-10-13/2843-souravberaakaspeed-xiryn.md)：值得一试，在一台非主力、可装 Docker 的机器上按 README 的一键脚本（或手动 clone + npm run setup）装一份 Xiryn，配一个模型 key、建单个 agent 跑一个真实小任务（如 clone 仓库跑测试给 diff、或一次带引用的调研），重点验证沙箱隔离、hand-off 人工介入成本和 token 花费后再决定是否推广。README 提供了可直接复制的安装、配置、Telegram 配对与编码 agent 提示词，具备可照做性；但仓库仅 49 star、无第三方评测，定时/循环任务仍在 roadmap 未实现，故给 try 而非 adopt。
- [vakandi/opencode-rust](../research/radar/2026-10-13/2915-vakandi-opencode-rust.md)：值得一试，用 npm 装一份、配好有余额的 provider key，在一个小仓库上用 `opr run` 和 TUI 各跑同一个任务，与现有编码代理对比后再决定是否迁移——它的安装、配置路径、代理池格式和 run 的后台等待语义都是可直接照做的具体内容，但作者自认 `run` 的端到端链路尚未在有过余额的 provider 上验证过，因此只适合小范围试。
- [Tmux and Claude Code: Sessions, Send-Keys, and the Ceiling](../research/radar/2026-10-19/4922-tmux-and-claude-code-sessions-send-keys-and-the-ce.md)：值得一试，把 tmux 作为 Claude Code 的保活与脚本化外壳来使用：一个仓库一个会话，一个任务一个窗口，用 send-keys 驱动、用 capture-pane 读回、把日志写入文件，这样值得小范围试用，因为原文给出的命令和配置可直接照抄且能解决“断开即中断”和“多实例无入口”这两个真问题；但状态检测靠屏幕抓取、无完成事件、重启即失，这些边界要一并接受。
