# 让编码 agent 在一次性 Windows 干净机上验证桌面应用并留下证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把 Windows 桌面应用的干净机冒烟测试、安装/卸载残留审计、UI 自动化和不可信文件 detonate 交给编码 agent 在一次性 Windows Sandbox 里执行，并留下可复核的报告、截图和审计日志。
> 先试这一步：先在符合前提的 Windows 11 24H2 Pro/Enterprise 机器上运行 `./sbx.cmd doctor`，再用系统自带 `charmap` 跑通一次最小闭环。
> 最近修订：2026-11-07

## 解决什么问题

本手册把编码 agent（Claude Code / Codex CLI / OpenCode / goose / pi / agentbox / Xiryn / Omnara 等）从“在本机随手跑一次”变成“在可控环境里、按项目规则反复跑”，并能实时看到它在读什么、写什么；需要时在真实（仿真）系统里执行并拿到可判定结果；断网或数据不出本机时，也能用本地模型跑小任务并用项目自带测试独立验收；需要给每个任务留下可离线复核的证据时，把任务关进无网卡的 micro-VM，由宿主 signer 逐项放行并导出签名审计包；需要把模型与会话放到远端、而文件、shell 和密钥留在本机时，用 ACP 中间层把工具执行点切在本机；需要验证 Windows 桌面应用在干净机上能否安装、启动、通过 UI 冒烟、卸载无残留时，用一次性 Windows Sandbox 跑闭环并留下报告、截图和审计日志。二十四次做法 A-X 按层覆盖：项目规则与观察（C/D/F/H）、会话与多机（N/O/P）、云端与托管（K/Q/R）、隔离与验证（J/L/U/V）、Windows 桌面干净机验证（X）、离线与收尾（S/T）、分离部署（W），以及起步/替代实现（A/B/E/G/I/M）。

## 适用与不适用

| 做法 | 适用 | 不适用/边界 |
|---|---|---|
| A | Linux 服务器 + systemd + Docker，需要服务器工作区、共享目录、Git 审查、按轮成本记录 | 34 stars、v0.1.7，默认 bypassPermissions、凭据可被终端用户读、单机单进程，暂不适合作为通用方案 |
| B | 通用 agent + MCP，有受支持供应商 key 或订阅，非生产环境 | README 只有入口级信息，供应商字段、权限、提示词、工作流需查官方文档 |
| C | 在单个真实项目用 Claude Code，想固定项目规则与自动化触发 | 课程仓库仅 109 stars，README 是课程宣传页，install.sh/labs/starter-kit 内容与效果数据未给出 |
| D | 需要默认只读、bash 前询问的 plan 模式，再切 build 执行 | README 是入口文档，配置在外部 docs；桌面版 BETA；star 量级异常需核实 |
| E | 已有 ChatGPT 订阅想装官方 CLI | 抓取只有 README 首页，没有工作流、权限/沙箱/审批、性能成本 |
| F | 需要受控试点 Claude Mods | early access、源码记录命令，作者未声称在真实会话执行，不适合生产依赖 |
| G | 需要统一多 provider 接口并愿意自己容器化 | pi 没有内置权限系统，不容器化不适合接触敏感文件/凭证/网络；默认无 sub-agents 和 plan mode；README 是宣传+导览 |
| H | 已在用 Claude Code，想先看清读写与危险命令 | 材料只有 README，无基准/耗时/token 节省/用户反馈；Code 视图限 macOS+Chrome+图片终端；My setup 类插件需 fork 改规则；blast-radius 需先演练 |
| I | 已有 Codex App 桌面会话，想让审批和通知离开桌面 | 社区项目、依赖 Codex App 内部 IPC、无多用户隔离，免密高风险，Linux 实验性 |
| J | 需要真实内核/网络 guest 验证 | 项目体量小，自带 overlay 以 root、空密码启动 dropbear，README 标注 lab only，不可放到不可信网络；隧道低带宽 |
| K | 有 Pro/Max/Team/Enterprise，想把边界清晰任务放云端并行 | Console API key 或第三方 provider 不适用；routines 是 research preview、projects 是 public beta；网络 None 仍会向 Anthropic API 发请求 |
| L | 想在个人电脑自托管、每 agent 一台隔离 Linux 桌面、凭据不进视野、可手机接管 | 仅 49 star、无第三方评测、定时/循环未实现、单体架构、需要 Docker，配置表在本次材料截断 |
| M | 想在 OpenCode 或现有编码代理之外换一个实现跑同一批任务对比 | 仅 35 stars，run 端到端未在有余额 provider 上验证，README 主体是工程修复记录 |
| N | 编码 agent 长期挂终端、SSH 断线仍要继续、多仓库/多任务需要统一入口、想用脚本 send-keys 驱动并用 capture-pane 读回 | 需要完成事件或结构化状态、重启机器后仍要恢复会话、不能运行 tmux、iTerm2 上想用 tmux 命令附着内置 native panes、把 tmux 当权限/审批系统的人；状态检测靠屏幕抓取，不能当作可靠完成信号 |
| O | 在 macOS 上并排跑多个 Claude Code/Codex 长任务、需要按状态排序的侧栏、想让 tmux 会话在重启后仍保留分组与顺序、想从手机 ssh 接管同一会话 | 非 macOS、不能接受非官方 Warp fork 与 AGPL-3.0、上游登录未测试却要求稳定登录、想把它当自动化编排器、需要精确完成事件而不是侧栏状态、没有能力维护额度环 JSON；它只显示状态与同步 tmux 布局，不做定时触发、失败重试或任务队列 |
| P | 想把同一任务发到多台计算机或沙箱、需要线程续聊/日志/人工接管、愿意先在两三台机器小范围试跑只读诊断和单仓库修测试 | 需要内置定时器/cron/webhook/事件触发器/任务队列/重试；把 codex/gemini/opencode 适配器直接上生产（README 按文档写、未实机验证）；把 local/ssh 默认权限当强隔离；需要中继/计量/账号体系 |
| Q | 需要跨机器/跨用户、由 app/Slack/GitHub/定时触发的云代理，希望把长期运行/远程监督/审批/断点恢复放到托管运行层，且有工程运维能力愿意小范围试用 | 简单一次性任务不必上平台；没有独立评测/成熟度证据，不宜全面 adopt；自托管本地默认配置故意不安全；沙箱需 public URL；权限具体配置、cron 完整参数、memory/subagents 配置材料只给链接，不能照抄 |
| R | 已在用 Claude Code，想把审批和观察搬到手机/飞书，需要逐工具审批、macOS 内核沙箱和只追加哈希链审计 | 自标 prototype、40 stars，执行端只有 Claude Code（Codex 能探测到但没接通），内核级沙箱仅 macOS、Linux 需自行用专用用户或容器兜底，笔记本休眠即离线，无定时/状态触发，单条消息 10 分钟无输出/30 分钟/100 次工具调用上限 |
| S | 断网/隐私受限、项目依赖和测试已在本机、需要小范围修复/解释/小重构 | 公开证据只有一次单行 bug 修复；未测大仓库、陌生框架、复杂依赖；不能下载新包/上网查资料；需要足够内存；opencode.json 完整内容不在材料内 |
| T | 项目已有 AGENTS.md 且智能体会读取并遵守；工作流会创建 git worktree，尤其 subagent 的 .claude/worktrees/agent-*；智能体有删除 worktree 和分支的权限 | 证据只有一条推文和一个 AGENTS.md 示例链接；规则片段在“它专用的 cargo target”处截断，删除命令、分支命名规则、cargo target 处理细节不可见；无验证数据；不能防误删，需额外保护未合并工作 |
| U | Linux + KVM 主机上，agent 要改真实系统又需要隔离与可审计；想把一次任务导出成 .tkb 离线验证；在 GitHub Actions 里跑 Claude Code/Codex 修测试，并只在 signer 逐文件放行后应用改动 | v0、无 release、需从源码构建；必须自带并常驻 Tracekit signer，同机 dev signer 只有 Assurance: dev、isolation: same-user；Action 里的 dev signer 没有 witness，只证明 job 后记录未被改动，不证明 runner 本身诚实；Mac 只能按 docs/development.md 走 Lima VM；无 KVM 的机器跑不起来；材料没有并发调度、成本、性能数据 |
| V | macOS 或 Linux 上，想让现有编程智能体把不受信任代码、桌面操作、并行修复放进可丢弃 VM，真实密钥留在 host，按需授权 | README 自标 early-stage、experimental；exe.dev、boat.dev、Cloud Hypervisor 后端标注 experimental；仓库 38 stars；Windows 未提；docs/grants.md、docs/security.md、docs/pool.md 正文未获取，授权细节不能照抄；无正确性/成本/质量验证数据 |
| W | 本机有代码和环境、想统一用某台常开服务器上的模型/订阅/会话记录；不愿或不能把 shell 交给远端；用 Zed/paseo 等 ACP 客户端 | 依赖项目级 .claude/（commands、skills、agents、settings）、checkpoint/rewind、LSP、Monitor、worktree 工具的工作流；需要定时/事件触发；服务器未登录或 claude 低于 2.1.248；Windows OpenSSH 不能共享连接 |
| X | Windows 11 24H2（build 26100）+ Pro/Enterprise/Education、已开虚拟化，需要对 Windows 桌面应用做干净机冒烟测试、安装/卸载残留审计、UI 自动化、不可信文件 detonate，并留下报告/截图/审计日志 | 仅 Windows 11 24H2+ Pro/Enterprise/Education，Home/Server 不支持；同一时间只能跑一个沙箱；ARM64 当前未打包；不适合 Linux、持久环境、多机并行；不自带调度器，时间/事件触发需外层 agent 或 CI 编排；provision 后的通过不算干净机通过 |

## 前置条件

通用：非生产、可回退的仓库或环境；受管/涉密环境先审阅所有 curl | bash、irm | iex、./install.sh、./setup.sh 类脚本，或改用包管理器/源码审阅后执行。

A：Linux 服务器 + systemd + 本地 Docker；Ubuntu 22.04+/Debian 12+ 可自动补依赖；源码构建需 Docker 访问权限。B：本机可装 CLI，有受支持供应商 key 或订阅，非生产环境。C：macOS/Linux/WSL、Node+npm 或 curl、真实 Git 项目、可回退。D：macOS/Linux/Windows 开发机，安装前清 0.1.x 前旧版。E：Mac/Linux/Windows；ChatGPT 订阅需 Plus/Pro/Business/Edu/Enterprise；API key 需 additional setup。F：一次性项目、合成数据、无生产凭据、已批准 Claude Code、能设 CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1、能生成 /plugin-types、有回滚负责人。G：Node.js 22.19+、非关键可回退仓库、优先容器环境、模型订阅或 API key。H：Claude Code 2.1.287+（README 自述，无法独立验证）、Code 视图需 macOS+Chrome+图片终端、非关键 Git 仓库。I：macOS/Windows 10/11、已运行 Codex App、电脑保持唤醒联网、手机同局域网、通知需 Bark/ntfy。J：Python 3.8+、QEMU、Go 1.22+、首次联网、非关键环境。K：Pro/Max/Team/Enterprise 且 claude.ai 登录；GitHub 连接；private repo 装 Claude GitHub App；终端路径已用 gh 且可 /web-setup；claude --cloud 前先 push。L：约 4 GB 空闲磁盘、至少一个 provider key（必需）、Firecrawl 可选、Node ≥20.9、Docker；Telegram 可选。M：Node 18+、可用 provider key、非关键小仓库；Homebrew 路径会拉 Rust 工具链。N：较新的 Claude Code，claude --help 能看到 -w/--worktree 与 --tmux；本机有 tmux；远程机器可 SSH；iTerm2 上内置路径用 native panes 而非真 tmux，脚本化必须加 =classic。O：macOS；从 Releases 下载 dmg 或按源码构建；源码构建需 rust-toolchain.toml 指定的 Rust 工具链；接受非官方 Warp fork、AGPL-3.0、上游登录未测试；要 tmux 同步需 tmux；额度环需能定期生成 docs/limit-rings.md 格式 JSON；Claude Code 后台任务 hook 可选。P：已装 Node.js / npm；目标机可 SSH 登录（README 建议用 Tailscale 处理 NAT）且已安装要用的智能体 CLI；macOS 26 可用 Apple 开源 container 运行时，或改用 Docker / Podman；Claude Code 订阅或 API key 用于 claude setup-token；人工接管需 Mac 开启屏幕共享或 Linux 运行绑定 localhost 的 VNC 服务；SDK 路径需 Node/TS 工程。Q：Omnara Cloud 账号；Node.js 22 或更新；使用首项目自带的模型 provider 和 sandbox pool。SDK 路径需 dashboard 创建 API key、导出 OMNARA_TOKEN、npm install @omnara/sdk、用 npx omnara config 获得 org/project ID。自托管需 Docker 和 Compose；新实例需在控制台添加 model provider 和 model、在 Machines 连接本机并共享给项目；沙箱还需实例有 public URL。工具权限、cron 完整参数、memory/subagents 配置需查 docs.omnara.com。R：Node.js >= 22.13（依赖内置 node:sqlite）；macOS 或 Linux（内核级沙箱仅 macOS 提供，Linux 需自行用专用用户或容器兜底）；Claude Code 已安装并登录、claude 在 PATH 上；一个飞书/Lark 账号，手机能打开授权链接；init 会创建 ~/.wardendeck（权限 0700），需备份 master.key 与数据库。S：笔记本内存足够（9B 建议 12–16 GB 以上，64k 上下文再留余量）；装有 Python3；项目及依赖、测试、README 已在本地；先在一次联网会话里完成安装和模型下载；OpenCode 1.19.4 与 qwen3.5:9b 需在自己环境核实。T：项目已有 AGENTS.md 且智能体会读取并遵守；项目工作流确实创建 git worktree（含 subagent 的 .claude/worktrees/agent-*）；智能体具备删除 worktree 和分支的权限；需要知道 worktree 路径；原文提到专用 cargo target，但材料截断，需按 https://github.com/JimLiu/baocut/blob/main/AGENTS.md 示例核对。U：Linux x86_64 或 arm64，daemon 用户能打开 /dev/kvm（裸机、支持嵌套虚拟化的云 VM，或 GitHub 托管的 ubuntu-latest runner，action 会启用 KVM）；Mac 按 docs/development.md 走 Lima VM；装 e2fsprogs（需要 mkfs.ext4）和 git；同一主机安装 Tracekit 1.4.2 signer，开发环境可先 tracekit init --dev --v2 --no-hooks && tracekit up --wait；主机能出站 HTTPS 到镜像仓库（Docker Hub 或 GHCR）；daemon 首次启动会从 GitHub 下载 Firecracker v1.17.0、从 Firecracker 项目的 S3 下载 guest kernel 6.1.155，按 SHA-256 校验后缓存到 <state dir>/images/assets，无外网时用 tkbox daemon --firecracker FILE --kernel FILE 传本地文件。V：macOS 或 Linux（README 徽章只标 macOS | Linux，未提 Windows）；能安装 brew、jq、node；选 Lima 后端时本机能运行 VM；需要一台可信 host（同一台 Mac、Linux 服务器或小 VPS）；VM 内默认没有真实凭证，必须显式授权；docs/grants.md、docs/security.md、docs/pool.md 正文未获取，授权细节需先补齐。W：本机 ssh 免密可登录一台常开服务器（key + ~/.ssh/config 配好端口/用户/跳板机）；服务器上 Claude Code 2.1.248+ 已安装并登录、POSIX login shell；本机装 Bun（仅构建，产出的二进制无依赖）；本机不需要装 claude；需要自定义 ssh 时能设 CC_REMOTE_SSH；Windows 需 PATH 上有 pwsh（可选）和 ripgrep（rg）。X：Windows 11 24H2（build 26100）或更高，Pro/Enterprise/Education，UEFI/BIOS 已开虚拟化；Home/Server 不支持；同一时间只能跑一个沙箱；需要管理员 PowerShell 开启 Windows Sandbox 并重启，重启后从开始菜单打开一次 Windows Sandbox 再关闭以安装 wsb；下载 Windows x64 portable ZIP，先用相邻 .sha256 校验再解压，ZIP 自带 Node.js、sbx、MCP server、guest agent 和 skills，无需安装 Node/npm；MCP 配置需要绝对路径；部署目标必须是专用目录；录 MP4 需要 host 上有 ffmpeg，但不会静默安装。

## 操作步骤

按层选：C/D/F/H 先定项目规则与观察面；N/O 做保活与状态侧栏；P 做多机线程；K/Q/R 把会话放到云端或托管审批；J/L/U/V 做隔离与可验证执行；X 做 Windows 桌面干净机验证；S 做断网路径；T 做 worktree 收尾；A/B/E/G/I/M 做起步或替代实现；W 做“模型在远端、文件与 shell 在本机”的分离部署。V 是隔离供给层：给 Claude Code/Codex/Cursor/opencode/pi 补“一次性 VM + 凭证边界”，不替代 C 的项目规则，也不替代 N/O/P 的保活与多机会话。C 可与 A 叠加；F 是 C 的扩展面试点；H 是第三方插件集合，不替代 F；I 与 E 并存；J 补执行目标；K 补会话跑在哪里；L 与 A 不同层；M 与 D 是同一层两个实现；N 是 C/E/K 等做保活外壳；O 是 C/E/N 等做状态侧栏与 tmux 布局同步，不替代 N 的脚本化外壳，也不是自动化编排器；P 与 A/L 不同层，是发起方统一管理多机线程的直连层，可与 C/E 的 agent 规则叠加，不替代 N 的 tmux 脚本化，也不替代 O 的状态侧栏，且不提供定时/重试；Q 与 C/E/K 等互补：Claude Code/Codex/OpenCode 是单终端/单机 agent loop，Omnara 补云托管、跨机器、跨用户、Slack/GitHub/定时触发，可用 MCP 让 Claude Code 管理 Omnara 代理；Q 不替代 C 的项目护栏，也不替代 N/O/P 的本地/多机外壳；R 是 C/E/K 等的授权与审计层：Claude Code 仍是唯一执行引擎，WardenDeck 在其上补移动触发、逐工具审批、macOS 内核沙箱和哈希链审计，不替代 C 的项目护栏，也不替代 N/O/P 的本地/多机外壳，且不提供定时触发；S 与 D 是同一工具不同配置：D 是 build/plan 与桌面版，S 是离线本地模型；S 与 C/E/K 等不冲突，是断网/隐私受限时的补充路径；S 不能替代 A/L 的隔离，因为模型、依赖、测试都在本机；T 是项目规则层，补 N 的 worktree 收尾，可与 C 的 CLAUDE.md/规则并存；T 不替代隔离、审批、验收或 tmux 保活；U 是隔离+审计层：C/E 的规则管 agent 做什么，U 管它能碰到什么、每次触碰是否被签名记录，可与 C 的 CLAUDE.md 和 E 的 CLI 叠加；U 不替代 N/O/P 的保活与多机会话，也不提供定时触发、任务队列或重试（Action 的触发来自 CI job 本身）。V 是 VM 供给层：给已有智能体补“隔离运行环境 + 凭证边界”，把允许 agent 执行命令的权限问题从本机移到一次性 VM；V 不替代 C 的项目规则，不替代 U 的签名审计包，也不提供基于时间/事件/状态触发的调度。W 是部署形态层：把 Claude Code 的推理端（模型、system prompt、会话、Web search、subagents、skills）放到远端服务器，把 Read/Write/Edit/NotebookEdit/Bash/Glob/Grep 和本地 MCP 留本机；W 不替代 C 的项目规则（项目级 .claude/ 不下发，服务器用自己的设置），不替代 U/V 的隔离（文件仍在本机执行，没有 VM 边界），不替代 N 的 tmux 保活（worktree 工具关闭，内置 --worktree/--tmux 路径不可用），也不提供定时/事件触发。W 与 K 都是“远端”，但边界不同：K 把模型和文件都放进云端一次性 VM，W 只把模型与会话放远端、文件与 shell 留在本机。X 是 Windows 桌面验证层：给 Windows 桌面应用补“一次性真实 Windows 干净机 + 报告/截图/审计日志”，CLI 可独立使用，MCP 只是给需要工具 schema 和内联截图的客户端；X 不替代 C 的项目规则，不替代 U 的签名审计包，不替代 V 的通用 VM 隔离，也不提供基于时间/事件/状态触发的调度。X 与 J 不同：J 是 QEMU 真实内核/网络 guest，X 是 Windows Sandbox 里的真实 Windows 桌面应用场景；X 与 V 不同：V 给现有智能体补可丢弃 VM，X 专门做 Windows 桌面干净机测试与证据收集。

### 做法 A：Linux 服务器 agentbox

1. 安装：curl -fsSL https://raw.githubusercontent.com/devilcoolyue/agentbox/main/install.sh | sudo bash。固定版本追加 -s -- --version v0.1.7；只本机/反代访问追加 -s -- --listen 127.0.0.1:8180。预期：构建工作区镜像、生成配置和随机管理员密码、启动 agentbox.service。
2. 浏览器打开 http://YOUR_SERVER_IP:8180，用 boxadmin 和终端密码登录；系统设置→账号池加 Claude/Codex 账号，选订阅 OAuth 或 API key/relay。
3. 新建工作区，填名称、选 agent 和账号；文件上传或终端 git clone；对话发任务，结束后到变更页看 diff 再提交/下载。
4. 系统服务：sudo ./deploy/install.sh、sudo ./deploy/deploy.sh。备份含工作区用 agentbox backup --full（先停服务和相关容器），用 backup-verify 校验。

### 做法 B：goose + MCP

1. 可从文档安装页装桌面版；CLI：curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash。
2. 按 Quickstart 配模型供应商；按需接入 MCP 扩展；团队统一用 CUSTOM_DISTROS.md 构建预配置发行版。原文没有 provider 字段、权限设置、提示词、工作流细节，需查 goose-docs.ai。

### 做法 C：Claude Code 项目级护栏

1. 安装：curl -fsSL https://claude.ai/install.sh | bash 或 npm install -g @anthropic-ai/claude-code。
2. 写短 CLAUDE.md：命令、架构、规则；命令/风格/禁令要短，细节放 .claude/rules/ 和 skills。
3. 权限用 .claude/settings.json 的 allow/ask/deny，检查顺序 deny→ask→allow；不要用 bypassPermissions。
4. PostToolUse hook 让格式化必然发生；PreToolUse 可拦 rm -rf、.env、迁移文件（exit 2 + stderr 阻断）；Stop 做收尾检查。CLAUDE.md 是请求，hook 是规则。
5. subagent 隔离嘈杂审查；重复三次以上流程写 skill；claude mcp add playwright -- npx @playwright/mcp@latest，不用的 MCP 关掉。
6. 主工作流 Explore→Plan→Code→Verify→Commit；超过一个文件的改动先 Plan mode；每轮跑测试/lint/构建；/clear 开新任务，长任务 /compact，/rewind 或 Esc Esc 回退。
7. headless：claude -p '...' --output-format json；可限制工具与步数；GitHub 用 /install-github-app 后在 issue/PR 里 @claude。

### 做法 D：OpenCode build/plan

1. 清 0.1.x 前旧版；安装任选 curl -fsSL https://opencode.ai/install | bash、npm i -g opencode-ai@latest、brew install anomalyco/tap/opencode 或发行版包管理器。
2. 启动后按 Tab 在 build 与 plan 间切换；plan 默认拒绝文件编辑、bash 前询问权限；确认计划后切 build 执行。
3. 复杂搜索/多步任务用 @general 调 general 子代理；桌面版 BETA。模型与协作配置查 https://opencode.ai/docs 与 agents 文档。

### 做法 E：Codex CLI

1. 安装：curl -fsSL https://chatgpt.com/codex/install.sh | sh 或 npm install -g @openai/codex 或 brew install --cask codex；Windows 用 PowerShell 安装命令。
2. 运行 codex，选 Sign in with ChatGPT；API key 路径需 additional setup。原文只有 README 首页，工作流、权限/沙箱/审批、性能成本未给。

### 做法 F：Claude Mods 受控试点

1. claude --version；CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude；在兼容会话执行 /plugin-types 并留存与当前安装匹配的声明。
2. 从官方仓库已审阅 revision 检出，在 checkout 根目录运行：CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir ./mods/diff，再跑 CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test ./mods/diff。
3. 按验收矩阵逐项测：版本/API 漂移、链式组合、保护缺失或损坏、敏感金丝雀泄漏、只考虑 UI 的假设、运维回归。成本公式：每被接受任务总成本 =（可归属模型与工具费用 + 工程与评审时间）÷ 通过同一验收标准的任务数。early access，不替代 Skills/MCP/经典 hook；命令不可用就找管理员，不要关组织托管保护。

### 做法 G：pi 容器化试用

1. 确认 Node.js 22.19+；安装 CLI：curl -fsSL https://pi.dev/install.sh | sh，Windows 用 PowerShell 安装脚本，或 npm 安装。pi update 更新。
2. cd /path/to/project && pi；在 Pi 内 /login 接入订阅或 API key。
3. 权限边界：pi 没有内置权限系统，不限制文件系统/进程/网络/凭证；用容器化模式之一：Gondolin extension、Plain Docker（起步最简单）、OpenShell。
4. 换一个 provider 用同一提示重跑，验证统一接口可迁移；需要固定版本用 Nix：nix run github:earendil-works/pi/stable。默认无 sub-agents 和 plan mode。

### 做法 H：Claude Code 观察面与危险命令闸门

1. claude plugin marketplace add hamzafer/claude-code-mods；claude plugin install mission-control@claude-code-mods。
2. 重启 Claude Code，/mission 开面板；w 看 agents 和每次工具调用，c 看代码地图（需 macOS+Chrome+图片终端）；蓝=读、橙=写、绿=完成。
3. 可加 token-weather、/where、/radar、/browser、/replay、/md；blast-radius 对 rm -r、force push、migration 先展示影响范围并等待确认，超时取消。先在含可丢弃文件目录演练。My setup 类插件需 fork 改规则。

### 做法 I：Codex Mobile Bridge

1. 在 macOS/Windows 已运行 Codex App 的电脑安装 Bridge v1.3.1；在“网络与登录”保留局域网和账号密码，启动网关。
2. 手机连同一局域网，在 App 首页展开“扫码登录”扫码；二维码 5 分钟内有效、仅一次、网关重启失效。选已有会话，发消息、排队、撤回、停止、回应权限/提问卡片、切模型与 Skill。复杂 MCP 表单、身份验证挑战回桌面。
3. 通知：iPhone 用 Bark 填服务地址和 Device Key；Android 用 ntfy 填服务地址和完整主题名，公共匿名主题 Token 留空；发测试通知以手机实际收到为准。外网用临时 HTTPS、自有服务器 SSH、NAS/反代；只测 127.0.0.1 不算。免密 --no-auth 高风险，默认账号密码至少 12 位。

### 做法 J：qemu-harness

1. 前提 Python >=3.8、QEMU、Go >=1.22；Windows 安装：irm https://raw.githubusercontent.com/b3s3da/qemu-harness/main/install.ps1 | iex；Linux/macOS：git clone https://github.com/b3s3da/qemu-harness && ./install.sh。
2. 新终端在项目目录：mkdir lab ; cd lab；qh up --kernel alpine:aarch64；qh exec 'uname -a; ip -4 -o a show eth0'；qh down。预期：构建 initramfs、启动 VM、agent 可应答；退出码传播。
3. 项目级 qh.json 固化 kernel/mem/smp/fs/pkgs/fwd；用 qh probe 预检、qh up --dry-run 核对 QEMU 命令行、qh exec --json 的退出码判定。自带 overlay 以 root、空密码启动 dropbear，lab only。

### 做法 K：Claude Code 云端会话

1. 前提 Pro/Max/Team/Enterprise 且 claude.ai 登录；组织 owner 可能要先开启。连接 GitHub：public 登录 GitHub；private 在拥有仓库的账号/组织安装 Claude GitHub App；终端已用 gh 可 /web-setup。
2. 写自包含工单：什么问题、完成定义、如何证明；用 claude --cloud 'npm test fails maybe one run in four. Find the flaky test, fix root cause, prove by running suite at least 30 times.' 这类提示点名证明命令。先 git push 当前分支。
3. 并行多个 claude --cloud；关标签页后手机/浏览器看进度；结束后在 diff view 逐条审查并开 PR。
4. 本地计划、云端构建、终端收尾：claude --permission-mode plan 定方案 push，再 claude --cloud 'Execute the migration plan in docs/migration-plan.md'；claude --teleport 拉回本地。环境网络设 None/Trusted；secrets 不放共享变量；命令写进 CLAUDE.md。routine 是 research preview，运行时无审批提示。

### 做法 L：Xiryn 自托管个人 agent 运行环境

1. 非主力机器，约 4 GB 空闲磁盘，至少一个 provider key；安装：curl -fsSL https://raw.githubusercontent.com/SouravBeraAkaSpeed/xiryn/main/setup.sh | bash，Windows 用 PowerShell 安装脚本；或手动 git clone ...、npm install、npm run setup、npm run dev。
2. 打开 http://127.0.0.1:6796，Settings 填 key；每个 agent 跑自己的 Linux 桌面容器（shell、持久 home、1280×800 桌面+Chromium）。状态栏点一次 alerts 才允许桌面通知。
3. Telegram：@BotFather 发 /newbot 拿 token，填 Settings→Remote access，手机扫码 Start；命令 /agents、/new、/stop、/status。机器人走本地 long-poll，只能一个配对账号使用。
4. 需要时 Take over 接管，交回时附一句说明让 agent 接着做；凭据掩码显示，由 Xiryn 填页面，每笔支付逐次批准。定时/循环任务未实现。

### 做法 M：opencode-rust 对比试用

1. Node 18+；安装 npm 预编译包：npm install -g opencode-rust；或 Homebrew brew install vakandi/tap/opencode-rust（从源码构建，拉 Rust 工具链）；或源码 ./install.sh。
2. 首次运行前 export ANTHROPIC_API_KEY=sk-ant-...；三种运行：opr、opr run 'check this repo for risks'、opr serve --port 3000。
3. TUI 里 Tab 切 build/plan；命名 agent 快捷命令等价于 --agent <slug>。Homebrew 安装必须显式写 opr tui --some-flag，npm 分发脚本会把 opr --some-flag 转成 opencode tui --some-flag。
4. 无人值守长任务：opr run --wait-background-timeout 300 '...'，默认 120 秒；opr db path / opr debug paths 核对配置；代理池不要自己 export 代理环境变量，必须通过 opencode_proxy::start() 启用。run 端到端尚未在有余额 provider 上验证，先只用 TUI。

### 做法 N：用 tmux 给 Claude Code 做保活与脚本化外壳

1. 先试内置路径。前提：较新的 Claude Code，claude --help 能看到 -w/--worktree 与 --tmux。

```
claude --worktree --tmux

# or name the worktree
claude --worktree auth-refactor --tmux
```

--tmux 不带 --worktree 会报错；在 iTerm2 上它用 native panes 而非真 tmux，后面 tmux 命令无从附着。要脚本化必须加 =classic：

```
claude --worktree --tmux=classic
```

单 agent、单分支的场景到此为止，不必往下看。

2. 一会话一仓库，用 repo 名命名。组织规则不是一任务一会话、也不是一 agent 一会话，而是一个 repo 一个 session：任务是流动的，项目是稳定的。

```
tmux new-session -d -s api -c ~/code/api
tmux new-session -A -s api -c ~/code/api
```

-A 是 attach-or-create，可重复执行。会话名不能含 . 或 :（tmux target 分隔符）。巡检：

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

-c '#{pane_current_path}' 极易漏写；漏了会在会话初始目录开 pane，agent 被指到错误仓库。并排布局：

```
tmux select-layout main-vertical
tmux set-window-option main-pane-width 60%
```

百分比值需要 tmux >=3.2，旧版用绝对列数。

4. 写入 .tmux.conf 的增量配置：

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

allow-rename off 防止 agent TUI 改掉命名窗口；escape-time 10 治方向键发粘。

5. 用 send-keys 驱动 agent。目标语法 session:window.pane：

```
tmux send-keys -t api:auth 'run the test suite and fix what fails' Enter
```

三个坑：裸参数会被当键名；用 -l 发字面量：

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

打断失控 agent：tmux send-keys -t api:auth C-c。

6. 用 capture-pane 读回：

```
tmux capture-pane -p -t api:auth
tmux capture-pane -p -J -S -200 -t api:auth
tmux capture-pane -p -J -S - -t api:auth
tmux capture-pane -p -e -t api:auth
```

-J 合并折行；不合并时一行断成两行，之后 grep 在接缝处会错。

7. 落盘成全量日志：

```
tmux pipe-pane -o -t api:auth 'cat >> ~/agent-logs/api-auth.log'
tmux pipe-pane -t api:auth
```

-o 是 toggle，跑两次关闭；输出是含转义序列的原始流，要可读需过滤。

8. 状态栏监控可选。作者自己说它是补丁：

```
set -g status-interval 5
set -g status-right '#(~/bin/tmux-agent-status) | %H:%M'
set -g status-right-length 100
```

脚本按 capture-pane 最后几行判断 parked/working/idle，属于屏幕抓取。轻量替代用 tmux 原生活跃度：

```
set-window-option -g monitor-silence 30
set -g visual-silence on
```

9. SSH/远程机器：

```
ssh devbox -t tmux new-session -A -s agents
```

断线后重跑同一条命令回到同一会话；链路差可配 mosh。嵌套 tmux 冲突：远端改前缀 set -g prefix C-a，或按两次 prefix。

10. 知道它会活过什么、活不过什么：关终端窗口、detach 客户端、SSH 断开，agent 继续跑；tmux kill-session、tmux kill-server、重启机器，不继续。

### 做法 O：Harp 侧栏管理多个 Claude Code/Codex 会话

1. 安装（前提：macOS）。从 Releases 下载最新 Harp-<version>.dmg，拖进 Applications。它有独立 bundle id com.dominikmartn.Harp、URL scheme harp:// 和设置目录 ~/.harp，可与原版 Warp 并存、不共享数据。预期：Harp 能启动终端；先验证上游登录是否可用，登录失败即止步并记为阻塞（README 明确说通过 Harp 登录未经测试）。
2. 或从源码构建（前提：macOS + rust-toolchain.toml 指定的 Rust 工具链）。

```sh
./script/bootstrap   # one-time: toolchain and build dependencies
./script/run         # builds target/debug/bundle/osx/Harp.app and launches it
```

说明：script/macos/run 会用钥匙串里第一个 Apple Development 身份签名，失败则退回 ad-hoc 签名；可公证的发布 DMG 由 script/release_macos 产出（见 --help）。提交改动前跑 ./script/presubmit（format、clippy、tests）。预期：本地构建并启动 Harp.app。
3. 打开扩展（前提：已安装并能启动 Harp）。扩展默认关闭，在 ~/.harp/settings.toml 中开启，文件变化时应用会自动重载：

```toml
[integrations.limit_rings]
enabled = true
file = '~/.cache/limit-rings.json'

[integrations.tmux]
enabled = true
```

预期：tmux 集成启用；额度环在数据文件存在时可用。相关默认值：enabled=false、file 默认为空（~ 指家目录）。
4. 喂额度数据（可选，前提：你有办法定期生成该 JSON）。按 docs/limit-rings.md 的格式写 integrations.limit_rings.file 指向的文件；Harp 只读不抓。预期：页脚每个 provider 两个环（5 小时窗口 + 周额度）能渲染；没有数据管道就跳过，不要把它当自动抓取。
5. 接入 tmux（可选）。开启 integrations.tmux.enabled 后启用 tmux 同步（名字、分组、顺序、标志、接管会话）和 tmux 内的 agent 检测；每 10 秒轮询一次。若想自定义改名/分组逻辑，可配置 integrations.tmux.session_script，它会被这样调用：

```text
<script> rename <shell_pid> <group> <title>
<script> group <session_id> <old_group> <new_group>
```

预期：侧栏标签跟随 tmux 会话的名字、分组、顺序与标志；注意 10 秒轮询会带来延迟。
6. 从别处接管会话（可选，前提：该会话跑在 tmux 里）。在异地的 tmux 会话中执行：

```sh
tmux set-option @warp_adopt 1
```

预期：Harp 出现对应标签，名字与分组随会话走，便于手机 ssh 启动的会话接回桌面。
7. 上报 Claude Code 后台任务（可选）。使用仓库内 integrations/claude-code 提供的 Claude Code hook，把后台任务状态报给侧栏（按其 README 配置）。注意：agents.third_party.should_render_cli_agent_toolbar 默认 false，关掉后需通过 Claude Code 的 plugin marketplace 更新 Warp 的 Claude Code 插件。预期：后台任务在侧栏有圆点等状态提示。
8. 调整菜单密度（可选）。appearance.vertical_tabs.full_tab_menu = false 把标签/分组菜单精简到只留必要项（也可在 Settings > Appearance > Tabs 改）。预期：菜单更短，减少误点。
9. 做状态准确性核查（可选，开发开关）。启动时设置环境变量：

```sh
WARPOSS_STATUS_TRACE=1
```

每一行显示状态的每次变化都会以 [status-check] 行写进 ~/Library/Logs/harp.log，可用于对照 agent 的 transcript 做回归检查。另有 WARPOSS_SKIP_LOGIN=1（测试用户启动、所有认证请求失败，供无登录自动化跑）和 WARP_DATA_PROFILE=<name>（debug 构建，数据放 ~/.harp-<name>）。预期：能拿到状态变化日志并逐条对照。
10. 知道被故意移除的东西（避免误以为是 bug）：侧栏布局下标签栏的搜索框、视图选项、标签配置按钮（新标签来自 Cmd+T、双击或侧栏空白处右键），侧栏分隔条选项，标题栏面板开关。Harp 只做状态展示与 tmux 布局同步，不做定时触发、事件触发重跑、失败自动重试或任务队列。

### 做法 P：openspaces 多机线程与沙箱

1. 安装并打开本地面板（前提：已装 Node.js / npm）。

```sh
npm install -g github:migasrias2/geckobox
openspaces ui
```

预期：面板只监听 127.0.0.1，链接里带随机 token，并拒绝其它 host，因此外部网站无法驱动它。
2. 把其它计算机登记进来并做连通性检查（前提：目标机可 SSH 登录，README 建议用 Tailscale 处理 NAT，且已安装要用的智能体 CLI）。

```sh
openspaces computers add mini ssh:me@mac-mini.local
openspaces computers test mini             # reachable? which agents are installed?
```

预期：computers test 回答两个关键问题：能否连上、装了哪些智能体。
3. 在本机用沙箱隔离跑（推荐的第一种执行环境；前提：macOS 26 可用 Apple 开源 container 运行时，或改用 Docker / Podman）。

```sh
brew install container && container system start   # macOS 26: Apple's open-source runtime (or use Docker/Podman)
openspaces sandbox create dev                       # ~20 s: an isolated Linux VM with Claude Code installed
openspaces start --on dev 'clone my repo and fix the failing test'
```

可选参数：--agents claude-code,codex,gemini,opencode 指定要装哪些；--cpus / --memory 定规格；openspaces sandbox ls | stop | start | rm 管理沙箱。预期：约 20 秒创建带 Claude Code 的隔离 Linux VM；沙箱内智能体以非特权 agent 用户运行且跳过权限询问——它能改动盒内任何东西，动不了盒外。
4. 注入智能体登录凭据（前提：Claude Code 订阅或 API key）。

```sh
claude setup-token                                  # prints a long-lived subscription token
openspaces secrets set CLAUDE_CODE_OAUTH_TOKEN      # paste it; stored in the Keychain (account 'openspaces')
```

预期：密钥经 stdin 进入沙箱，不出现在 argv，也不写入 openspaces 的状态或日志；单次任务也可用 --env NAME 转发某个变量。例外是 Cua 的 sandbox exec 不接受 stdin，走 Cua 时密钥会作为参数出现在本机命令行上。
5. 发起任务、跟踪、续聊、收尾（前提：已完成第 2 或第 3 步）。

```sh
openspaces start --on mini 'Upgrade the deps and run the tests'   # prints a thread id, runs in the background
openspaces logs <id> -f                    # watch messages and tool calls
openspaces send <id> --wait 'Now open a PR'
openspaces status                          # every thread, every computer
openspaces close <id>                      # stops it and deletes its work dir
```

常用选项：--agent、--cwd /abs/path（在已有仓库里工作，且永远不会被删除）、--keep、--model、--env NAME、--auto-approve / --no-auto-approve。预期：start 打印 thread id 并后台运行；logs 看消息与工具调用；send 在同一 agent session 续聊；status 看每台机器的每个线程；close 停止并删除目标机上的 ~/.openspaces/work/<thread>，不删 --cwd。
6. 一个任务同时下发到多台机器。

```sh
openspaces run --on local,mini,docker:ci 'Run the test suite and summarise failures'
```

预期：面板与 SDK 的 Run everywhere 并排显示结果。
7. 用 SDK 编程接入（前提：Node/TS 工程，已安装依赖）。

```ts
import { startThread } from 'openspaces'

const bot = await startThread({
  agent: 'claude-code',
  prompt: 'Open the repo and run the tests',
  on: 'local'
})
console.log(await bot.wait())
console.log(await bot.send('Now fix the failing test'))
console.log(await bot.status())
await bot.close()
```

预期：线程方法 wait()、send(prompt)、status()、interrupt()（停止本轮及其所有子进程但保留线程）、close() 可用；把 on: 'local' 换成另一台机器的名字，任务就跑到那台上。
8. 人工接管与旁观（前提：Mac 上开启 系统设置 → 通用 → 共享 → 屏幕共享；Linux 上运行任意绑定 localhost 的 VNC 服务）。

```sh
openspaces view mini            # SSH tunnel to the Mac's Screen Sharing (VNC :5900), opens it; Ctrl-C closes
openspaces view mini --port 5901
openspaces view cua:desk        # Cua's own local viewer (loopback, no relay); the app streams it inline
```

预期：隧道复用你已有的 SSH，不额外暴露端口；面板内也能以约 3 fps 看实时画面、点击/滚动/输入接管、暂停交接。
9. 按环境设定权限策略（上线前必做的一步）。智能体以无头方式运行，中途无法向你提问；默认只在隔离环境（docker:、cua:）跳过权限询问；在 local 和 ssh: 上，Claude Code 拿到的是 --permission-mode acceptEdits：文件编辑自动批准，其它工具按 Claude Code 自身规则来（原本会询问的一律拒绝）；只有在你信任这台机器时才加 --auto-approve；close 只删目标机上的 ~/.openspaces/work/<thread>，不删你传的 --cwd；pid 文件只在本轮存在，close 只杀它能确认属于该线程的进程。

### 做法 Q：Omnara 托管代理平台小范围试用

1. Cloud 最小启动（前提：有 Omnara Cloud 账号；Node.js 22 或更新；使用首项目自带的模型 provider 和 sandbox pool）。登录 app.omnara.com。将以下配置保存为 agent.yaml（原文称首项目自带 omnara-openrouter 和 default-pool，可直接运行；示例模型名按原文照录，实际使用要确认 provider 可用模型）：

```yaml
version: v1
instruction: |
  You are an engineering assistant. Use your machine to run commands.
model:
  provider_config: omnara-openrouter
  name: anthropic/claude-fable-5.1
machine_sources:
  - machine_pool_name: default-pool
```

然后用 CLI 启动；未登录时第一条命令会打开浏览器登录：

```sh
npx omnara agents launch --file agent.yaml --name 'Machine assistant' --message 'Report this machine operating system and free disk space.'
```

用 npx omnara agents chat <agent-id> 在终端对话，或打开 dashboard 观察工具调用并回复。

2. 从 TypeScript SDK 启动（前提：在 dashboard 创建 API key，导出 OMNARA_TOKEN；执行 npm install @omnara/sdk；用 npx omnara config 获得 org/project ID）。原文示例的核心形状：createOmnaraClient + bearerToken、sdk.createAgentConfig、sdk.createAgent、openAgentEventStream；按原文照录。
3. 让编码代理代做安装（前提：编码代理可读取网页并执行）。把下面提示词原样给它：

```text
Help me set up Omnara by following https://www.omnara.com/SKILL.md
```

4. 自托管（前提：安装 Docker 和 Compose）。执行：

```sh
git clone https://github.com/omnara-ai/omnara.git
cd omnara
docker compose -f compose.yaml --profile app up -d
```

打开 http://localhost:8000 并注册；本地开发的验证链接会打印在 docker compose logs api，不需要邮件服务。若要从源码构建而不是用发布镜像，执行：

```sh
docker compose --profile app up -d --build
```

新实例还没有模型和机器：在控制台添加 model provider 和 model，在 Machines 连接本机，并把两者共享给项目；沙箱还需要实例有 public URL。把 CLI 指向自托管实例并登录：

```sh
npx omnara config --api-url http://localhost:8000/api/v1 --issuer-url http://localhost:8000
npx omnara login
```

在 agent.yaml 中使用你的 provider/model 名称，并把 machine_pool_name 条目替换为 machine_name: <your machine>，然后用上面的 launch 命令启动。注意：本地默认配置故意不安全；真实部署要按 self-hosting guide 和 configuration reference 操作。
5. 设置工具权限与审批（前提：在平台中可管理工具权限）。README 说明每个工具可设为立即运行、先问人、禁止；平台执行该设置，代理会等待批准或拒绝。具体配置界面/字段未在 README 给出，需按 docs.omnara.com/tools/permissions 操作。
6. 接入 MCP 客户端（前提：客户端支持 OAuth）。原文命令：

```sh
claude mcp add --transport http omnara https://app.omnara.com/mcp
codex mcp add omnara --url https://app.omnara.com/mcp
```

然后在 Claude Code 中用 /mcp 登录，在 Codex 中用 codex mcp login omnara 登录。Omnara 也在官方 MCP Registry 中列为 com.omnara/omnara。
7. 选用示例或触发器扩展（前提：按 examples/ 中对应目录的 agent.yaml 和 SKILL.md 操作；触发器细节需查文档）。README 列出 Slack coding agent、PR review agent、SRE agent、Browser agent、PostHog analytics agent、Reddit/X/LinkedIn signal agent、Video generation agent 等示例。Cron trigger 可按时区给已有代理发消息、从 profile 启动新代理、开新的 Slack/Discord thread；GitHub 代理可在 PR 打开或被提及时启动；Slack/Discord 提及 bot 可在 thread 启动代理。README 没有给出 cron 的完整命令/JSON，只给了 API 链接。

### 做法 R：WardenDeck 飞书审批闸门与审计链

1. 确认前提：Node.js >= 22.13（依赖内置 node:sqlite）；macOS 或 Linux（内核级沙箱仅 macOS 提供，Linux 需自行用专用用户或容器兜底）；Claude Code 已安装并登录、claude 在 PATH 上；一个飞书/Lark 账号，手机能打开授权链接。预期：node -v 看到 >= 22.13，claude --version 有输出。
2. 安装：git clone https://github.com/bocoboho/wardendeck.git、cd wardendeck、npm install && npm run build、npm link。预期：wardendeck 出现在 PATH；不执行 npm link 则改用 node dist/cli.js <command>。
3. 初始化并建项目：wardendeck init --admin-email you@example.com；mkdir -p ~/code/demo；wardendeck project create --name demo --workdir ~/code/demo。预期：创建 ~/.wardendeck（权限 0700），生成 master.key、数据库和一次性 Web 控制台 token，自动探测本地 agent。--workdir 决定 agent 实际能碰的目录，建议指向可丢弃的仓库副本。
4. 备份密钥：把 ~/.wardendeck/master.key 与数据库一起备份。预期：换机后能解密已存凭据；不备份则凭据不可恢复。
5. 连接飞书。做法 A（自动建应用）：wardendeck feishu setup --project demo，在手机上打开打印出的链接并授权。预期：自动创建应用、把凭据存为 feishu_demo、自动绑定私聊。随后到飞书开放平台确认：事件订阅→长连接开启，并订阅 im.message.receive_v1；想要卡片按钮审批，添加 card.action.trigger 回调；没有它就在对话里回 1 / 2 / 3 审批。做法 B（复用已有飞书应用）：建自建应用（国际版 open.larksuite.com）；开启机器人，申请 im:message、im:message:send_as_bot、im:chat:readonly；按上文设置长连接+事件订阅，发布版本；然后：

```sh
wardendeck secret set feishu_demo --value 'cli_xxx 换行 app_secret_xxx'

wardendeck platform bind --project demo --platform feishu --credential feishu_demo --channel oc_xxx
```

第一行 App ID、第二行 App Secret；国际版再加第三行 lark。不写 --allowed-users 时只允许应用所有者。怎么选：能用自动建应用就用 A；已有应用或需要群聊就用 B。
6. 绑定群聊（可选，前提：先把 bot 拉进群）：

```sh
wardendeck feishu chats --credential feishu_demo
wardendeck platform bind --project demo --platform feishu --credential feishu_demo --channel oc_xxx --allowed-users ou_aaa,ou_bbb
```

预期：群里只有 @ 这个 bot 才响应；务必用 oc_... 群 ID，不是个人 ou_... ID。
7. 启动：wardendeck serve。预期：Web 控制台在 http://127.0.0.1:8787（用 init 打印的 token 登录）；不需要就 wardendeck serve --no-web。笔记本休眠即离线，常驻写法 caffeinate -is wardendeck serve，或在常开主机/服务器上跑。
8. 在聊天里派活与审批：发自然语言，例如“你好，看一下这个目录里有什么”。预期：卡片随工具调用原地刷新，遇到需要审批的调用会停下。指令：1/允许 允许本次工具调用；2/允许30分钟 30 分钟内允许工具调用；3/拒绝 拒绝本次工具调用；/stop 停止当前任务并取消待审批；/remember <text> 存记忆（私聊→user 作用域，群→chat 作用域）；/memory 列出可见的长期记忆；/forget <id> 删除当前作用域内某条记忆；AW_ATTACH: /path/image.png 在最终回答里回传本地图片。单条消息上限：10 分钟无输出、30 分钟实际耗时、100 次工具调用。
9. 收紧权限模式与沙箱（前提：先在一个低风险目录试）：wardendeck project permission --name demo --mode default。可选模式：default、acceptEdits、plan、dontAsk、auto、bypassPermissions（危险）。环境变量：WARDENDECK_DIR 数据目录（默认 ~/.wardendeck）；WARDENDECK_DENY_PATHS agent 不得读/执行的额外路径，按系统路径分隔符；WARDENDECK_SANDBOX=0 关闭 macOS 沙箱（不推荐）；WARDENDECK_CLAUDE_AUTO_MEMORY=1 重新开启 Claude Code 内置自动记忆（默认关，避免事实跨 bot 泄漏）。
10. 核对审计与自检：wardendeck status、wardendeck doctor、wardendeck audit list --limit 20、wardendeck audit verify。预期：看到绑定、健康状态、最近审计事件；audit verify 校验哈希链完整性。排查顺序：bot 不回 → 看 serve 是否在跑 → status 看绑定 → 控制台确认长连接与 im.message.receive_v1 → audit list 找 message.inbound：没有说明事件没到（查事件订阅）；有说明被 allowed_users 挡了（比对发送者 open_id）。

### 做法 S：离线本地模型编码 agent（OpenCode + Ollama + Qwen3.5 9B）

1. 前提：笔记本内存足够（9B 建议 12–16 GB 以上，64k 上下文再留余量）；装有 Python3；项目及依赖、测试、README 已在本地。先在一次联网会话里完成安装和模型下载。原文说完整安装步骤在 GitHub README 中（安装工具、下载项目、安装 OpenCode 1.19.4），本材料未包含 README 内容。Terminal A 保持在项目目录。预期：OpenCode 1.19.4 可用；后续断网只依赖本地模型、项目文件和已装依赖。
2. 配置项目级 opencode.json：model 与 small_model 都指向 Qwen3.5 9B；baseURL 指向 Ollama：http://127.0.0.1:11434/v1；只启用 local provider；编辑文件、执行 shell 命令前需要确认；禁用 web 工具。原文只描述字段，完整 JSON 在仓库里，不要凭空补全。预期：agent 只走本地模型，编辑/命令要审批，无 web 工具。
3. Terminal B 启动 Ollama 并保持常驻（把模型服务限制在 localhost，关闭 Ollama 云端功能，设置上下文长度）：

```
OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 OLLAMA_CONTEXT_LENGTH=65536 ollama serve
```

预期：本地模型服务在 11434 监听。
4. Terminal A 下载模型，等下载完成：ollama pull qwen3.5:9b。预期：下载完成；下载体积不等于内存需求，6.6 GB 的 9B 构建需 12–16 GB 内存，64k 上下文还要更多。
5. 先建立基线，记录失败项（示例是 expense calculator：5 笔支出含一笔退款，正确总额 25.50，起始程序只打印最后一笔 8.00）：python3 expense_total.py、python3 -m unittest -v。预期：原文记录 3 个用例失败（十进制运算、退款、样例支出），空输入和单条输入已通过。
6. 联网时先做一次冒烟测试（--pure 关闭外部插件）：.tools/node_modules/.bin/opencode --pure。确认选中的是本地 Qwen3.5 9B，输入诊断提示词：Read expense_total.py and run the tests. Explain the bug without editing any files. 逐条查看权限提示再放行。原文的教训：agent 一开始提议用 pytest，而项目用的是内置 unittest——下一次任务应在提示词里写明确切测试命令 python3 -m unittest -v。完成后 /exit，Ollama 继续在 Terminal B 运行。预期：能读到本地模型回复并解释 bug，不编辑文件。
7. 断网：关闭 Wi-Fi，拔掉网线/关闭手机热点。然后验证“本地通、外网断”：

```
curl --noproxy '*' --fail http://127.0.0.1:11434/api/tags
curl --noproxy '*' --connect-timeout 5 --max-time 10 --head https://example.com
```

预期：第一条返回并列出已下载的 qwen3.5:9b；第二条失败（原文为 Could not resolve host）。
8. 断网状态下重开 agent，下修复任务：.tools/node_modules/.bin/opencode --pure。提示词：Fix the bug in expense_total.py so the existing tests pass. Do not change the tests or install anything. Run the tests and explain your fix. 审阅 diff 后再批准编辑。预期：原文记录模型提议一行改动并跑通 5 个测试：total = Decimal(amount) 改为 total += Decimal(amount)。
9. 独立验收：先 /exit 退出 agent，再自己跑测试和样例：python3 -m unittest -v。预期：5 个测试全通过、样例输出 25.50、源码确实是 total += Decimal(amount)、测试文件与初始版本一致（未被改动）。
10. 同一套配置下再练两个任务（作者自述尚未完成这两个的离线跑通）：补完 examples/csv-report/csv_report.py、修复 examples/log-analyzer/log_analyzer.py，提示词都要求保持测试不变、不安装任何东西、跑测试并解释改动。预期：作为扩展练习；作者未完成离线跑通，不能当作已验证能力。
11. 断网工作前的准备清单：把项目依赖和会用到的文档预先存到本地；联网时用完全相同的命令/模型/配置跑通一次；提示词里给明确切测试命令；任务保持小而聚焦，看 diff 并自己跑测试；保留原测试；注意内存压力；把权限提示、重试、失败也记录下来。

### 做法 T：在 AGENTS.md 里写死 worktree 清理规则

1. 前提核对：项目已有 AGENTS.md，且智能体会读取并遵守其中规则；项目工作流确实创建 git worktree，尤其是 subagent 使用 .claude/worktrees/agent-* 的情况；智能体具备删除 worktree 和分支的权限。预期：你能指出规则应写进哪个文件、哪些任务会创建 worktree。
2. 在 AGENTS.md 中新增“worktree 不遗留”条目，明确任务完成时删除该 worktree 及其分支。原文可见的规则文本如下（末尾被截断，不能当作完整规则直接照抄）：

```
worktree 不遗留：在 worktree（含 subagent 的 .claude/worktrees/agent-*）里做的任务，完成时必须删除该 worktree 及其分支。它专用的 cargo target
```

预期：规则明确触发点是“任务完成时”，要求删除 worktree 及分支；截断部分待补。
3. 按原文所附的 https://github.com/JimLiu/baocut/blob/main/AGENTS.md 示例核对并补全被截断部分，特别是“它专用的 cargo target”之后的条件和处理方式；给出的材料没有提供删除命令、分支命名规则或 cargo target 处理细节，不能据材料编造。预期：得到一条完整、与项目工作流匹配的规则。
4. 权限与安全边界：若智能体没有删除 worktree 和分支的权限，需要人工执行同样规则，或先调整权限与安全边界；规则必须写明触发点是“任务完成时”，让清理动作由完成状态触发，而不是只写在文档里不执行。
5. 验收：每个任务完成后检查 git worktree list、相关分支和原文提到的 cargo target 目录是否残留；与试用前同样数量任务做对比。预期：能记录残留 worktree 数、残留分支数、人工清理耗时、误删或破坏未合并工作的次数。

### 做法 U：Tracekit Box 每任务独立 micro-VM 与可离线验证的审计包

1. 准备前提（缺一项就先不要往下走）：Linux x86_64 或 arm64，daemon 用户能打开 /dev/kvm（裸机、支持嵌套虚拟化的云 VM，或 GitHub 托管的 ubuntu-latest runner，action 会启用 KVM；Mac 用 docs/development.md 的 Lima VM）；安装 e2fsprogs（需要 mkfs.ext4）和 git；同一主机安装 Tracekit 1.4.2 signer，开发环境先跑 tracekit init --dev --v2 --no-hooks && tracekit up --wait（更高保证需要把 signer 作为独立用户运行，并在另一台主机放 witness 共同签名 signer 日志）；主机能出站 HTTPS 到镜像仓库（Docker Hub 或 GHCR）。预期：/dev/kvm 可打开、signer 起来、能拉镜像；daemon 首次启动会下载 Firecracker 与 guest kernel 并按 SHA-256 校验缓存在 <state dir>/images/assets，无外网时改用本地文件。
2. 从源码构建并安装（前提：Go 版本按 go.mod，已装 make；当前没有 release）：

```sh
git clone https://github.com/Cygnux-Labs/tracekit-box && cd tracekit-box
make linux
arch=$(uname -m); case $arch in x86_64) arch=amd64 ;; aarch64) arch=arm64 ;; esac
sudo install -m 0755 bin/tkbox-linux-$arch /usr/local/bin/tkbox
sudo install -m 0755 bin/tkbox-guest-linux-$arch /usr/local/bin/
tkbox version
```

预期：tkbox version 有输出。tkbox 默认在自身二进制旁边找 tkbox-guest-linux-<arch>，也可用 tkbox daemon --guest-dir DIR 指定目录。
3. 启动 dev signer 和 daemon（前提：同机已安装 Tracekit；daemon 启动时若没有 signer 应答会退出）：

```sh
tracekit init --dev --v2 --no-hooks && tracekit up --wait
export GH_TOKEN=ghp_...
tkbox daemon > ${TMPDIR:-/tmp}/tkbox-daemon.log 2>&1 &
until tkbox ls >/dev/null 2>&1; do sleep 1; done
```

预期：tkbox ls 能返回。dev signer 是 same-user，导出的 bundle 会显示 Assurance: dev 和 isolation: same-user。
4. 创建一个 box（前提：在一个 git checkout 目录中执行；workspace 是 checkout 的副本）：

```sh
tkbox run --image python:3.12-slim --allow pypi --allow debian --workspace . --name demo --secret GH=env:GH_TOKEN@api.github.com --env PIP_ROOT_USER_ACTION=ignore --env PIP_DISABLE_PIP_VERSION_CHECK=1
```

预期：box 创建成功，VM 内只有 secret 占位符，真实值只在访问 api.github.com 时由宿主机代理换入。
5. 执行命令并观察各道门（前提：box 已创建；示例中 curl 不在 python:3.12-slim，所以先用 debian 允许列表安装）：

```sh
tkbox exec demo --env DEBIAN_FRONTEND=noninteractive -- sh -c 'apt-get update -q && apt-get install -y -q curl'
tkbox exec demo -- python -c 'print(1+1)'
tkbox exec demo -- pip install -q requests
tkbox exec demo -- curl -sI https://example.com
tkbox exec demo -- curl -sS https://169.254.169.254/
```

预期：example.com 不在 allowlist，会被挂起，需在宿主机另一个终端运行 tkbox approvals 查看 id，再运行 tkbox approve <id> 或 tkbox reject <id>；无人处理则 2 分钟后拒绝。169.254.169.254 是云 metadata 地址，无论 allowlist 或人工批准都会直接拒绝。VM 内 echo $GH 只打印占位符；把 secret 占位符发到未绑定主机会被代理阻断并记录 tkbox.secret.leak；发到绑定主机 api.github.com 才会换入真实值并记录 tkbox.secret.use。
6. 取回改动、停止、导出并离线验证（前提：apply 只能在已停止的 box 上、导出前执行）：

```sh
tkbox exec demo -- sh -c 'echo hi > /workspace/x.txt' && tkbox diff demo
tkbox stop demo && tkbox export demo -o demo.tkb
tracekit verify demo.tkb --trust demo.trust.json
```

预期：tkbox diff demo 显示 git-format patch；tracekit verify 离线检查 bundle，成功打印 Integrity: VERIFIED.，用 dev signer 时还会打印 Assurance: dev 和 isolation: same-user。若执行 tkbox apply demo，它会对每个文件先问 signer，再写入你的 checkout；示例 demo 不 apply。README 提醒：应固定你预期的 trust 文件（提交到仓库或放在 CI 外），不要直接信任 bundle 旁边附带的那个。
7. 在 GitHub Actions 中跑 agent（前提：使用 GitHub 托管的 ubuntu-latest；action 会启用 KVM、启动 dev signer 和 daemon）：

```yaml
jobs:
  fix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: Cygnux-Labs/tracekit-box/action@main
        with:
          agent: claude-code
          prompt: 'Make the failing test in test/parser.test.js pass. Do not change the test.'
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

预期：action 在 box 中跑 Claude Code、Codex 或一条命令，停止 box 后，仅当 signer 允许每个文件且没有敏感文件（如 .github/workflows/**）时才应用改动，然后导出、验证并上传 bundle。注意：action 的 signer 是同一 job 内创建的 dev signer，没有 witness，所以 bundle 只能验证为 Assurance: dev——它证明记录在 job 后未被改动，不证明 runner 本身诚实；action 会把 agent 改动应用到 runner 的 checkout，随后构建/测试这些改动等于在 runner 上运行 agent 的代码；examples/claude-code-fix.yml 给出的安全形状是三个 job：一个用只读 token 跑 box，一个用只读、不持久化、无 secret 的 token 测试 patch，第三个持有写 token 开 PR 且从不运行仓库代码。
8. 用 Python SDK 调 daemon（前提：Python 3.9+，从 checkout 安装 pip install ./sdk/python）：

```python
from tracekit_box import Client

c = Client()
c.create_box('python:3.12-slim', name='demo', allow=['pypi'], workspace='.')
print(c.exec('demo', ['python', '-c', 'print(1+1)']).stdout_text)
```

预期：create_box 建出 box，exec 返回 stdout。失败时的行为（按原文，不是你的兜底）：系统是 fail closed——没有 signer 就没有 daemon，signer 不应答会拒绝后续命令、连接和文件写入；无法记录必须保留的事件时会停止 box 并记 tkbox.gap。

### 做法 V：boxery 把不受信任任务放进 VM，凭证默认拒绝、按需授权

1. 前提核对：macOS 或 Linux（README 徽章只标 macOS | Linux，未提 Windows）；能安装 brew、jq、node；选 Lima 后端时本机能运行 VM；需要一台可信 host（同一台 Mac、Linux 服务器或小 VPS）。预期：你能决定 host 放在本机还是远端，并接受 VM 内默认没有真实凭证。
2. （可选）让智能体自己安装。把这段原样发给智能体：

```text
Read github.com/modem-dev/boxery and set up boxery on this machine.
Then spin up a VM with `boxery new demo` and open its desktop.
```

3. 手工安装（Mac + Lima）：

```bash
brew install lima jq node
npm install -g boxery-vm
boxery-host init --backend lima && boxery-host build-base
boxery setup local
```

注意 build-base 会构建一次桌面镜像（原文称约 3 分钟）；只需要 headless VM 时可以跳过这一步。Linux 或云端请改看 docs/install.md#choosing-a-backend（原文未给出这部分具体命令）。预期：host 初始化完成，MCP server 可被智能体发现。
4. 把 MCP 接入智能体（二选一或都装）：

```bash
npx add-mcp boxery-vm      # Claude Code、Codex、Cursor、VS Code、opencode、Zed 等
pi install npm:boxery-vm   # 或原生 pi 扩展
```

预期：智能体看到一组 vm_* 工具；先只接一个智能体（建议 Claude Code），避免多智能体干扰归因。
5. 用自然语言下达任务。原文示例：

```text
Clone my repo in a VM, start the dev server, and screenshot the homepage in Chrome.
```

预期：智能体通过 vm_* 工具在 VM 内克隆、装依赖、跑服务、截图；真实密钥不进入 VM。
6. 按需授权，不要一次性全开。VM 默认什么权限都没有（连 LLM 都没有），需要通过 vm_grant 或 docs/grants.md 的机制开放：LLM provider、GitHub 或 HTTPS API（密钥留在 host）、ssh-agent、环境变量、文件。原文没有给出 vm_grant 的参数细节，具体配置需要查阅 docs/grants.md。预期：每加一项授权都有记录；跑不通时再逐个加，不要先开全量。
7. 自己做人工干预（不用智能体时）：boxery attach demo、boxery desktop demo。预期：能附着 shell 或打开桌面旁观/接管。
8. 多智能体共享 VM 池时使用 lease：vm_lease 支持从共享池租用 VM，避免多个智能体互相冲突（细节见 docs/pool.md）。预期：并行任务不会抢同一台 VM；lease 参数按 docs/pool.md 补齐后再用。
9. 需要长时间常驻任务时，把 host 放到服务器或云端，智能体在本地，VM 在远端；关掉笔记本后任务继续运行。预期：本地只保留 MCP 客户端，长任务在远端 host 上继续。
10. 最小试用（半天以内）：只走 headless 路径（跳过 build-base），用 --backend lima 执行 boxery-host init；只接 Claude Code；选一个本来就要在本机执行、且会安装依赖或运行外部代码的真实任务（克隆仓库→装依赖→跑测试→输出失败用例）；全程不授予任何 grant，观察智能体在无凭证状态下能否完成任务；跑不通时再逐个加授权并记录每一步加了什么；重复同一任务 3 次，其中至少一次在任务中途执行 vm_manage 的 fork 或 snapshot/revert，验证回滚是否可用。

### 做法 W：cc-remote 远端模型、本机文件与 shell

1. 前提核对：本机 ssh 免密能登录一台常开服务器（key + ~/.ssh/config 配好端口/用户/跳板机）；服务器上 Claude Code 2.1.248+ 已安装并登录、POSIX login shell；本机装 Bun（只为构建，产出的二进制无依赖）；本机不需要装 claude。预期：ssh devbox 直接进 shell；服务器上 claude --version 有输出。先记住切分：本机跑 Read、Write、Edit、NotebookEdit、Bash（Windows 为 PowerShell）、Glob、Grep，以及 ACP 客户端带来的 MCP servers 和本地 Claude Code 配置里的 MCP servers；服务器跑模型、system prompt、会话、Web search、subagents、skills 和服务器自己的设置与 MCP servers。
2. 本机克隆并构建：

```sh
git clone https://github.com/AkaraChen/cc-remote && cd cc-remote
bun install
bun run compile    # builds the binary for this machine into dist/cc-remote
bun link           # puts cc-remote on your PATH, in ~/.bun/bin
```

要一次构建全平台（linux-x64、linux-arm64、darwin-arm64、windows-x64、windows-arm64）用 bun run build，产物落在 dist/。预期：cc-remote --version 有输出。
3. 写 host 配置并自检。host 查找顺序：--host → $CC_REMOTE_HOST → ~/.config/cc-remote/host；host 可以是任何 ssh 接受的值，端口/key/跳板机放 ~/.ssh/config：

```sh
mkdir -p ~/.config/cc-remote && echo devbox > ~/.config/cc-remote/host
cc-remote doctor
```

预期：doctor 同时检查 ssh 与远端 claude 版本；这一步通过再往下走，否则后面全是黑盒排错。需要自定义 ssh 命令时（语义同 rsync 的 RSYNC_RSH）：

```sh
export CC_REMOTE_SSH="ssh -p 2222 -i ~/.ssh/devbox"
```

4. 服务器还没登录过时：cc-remote --cli auth login。预期：服务器上的 claude 完成登录；本机不装 claude 也能用。
5. 在 ACP 客户端注册 agent，命令为 cc-remote --host devbox（写过 host 文件后可直接 cc-remote）。Zed 在 settings.json 加：

```json
"agent_servers": {
  "Claude (devbox)": { "command": "cc-remote", "args": ["--host", "devbox"] }
}
```

paseo 在 ~/.paseo/config.json 的 agents.providers 下加：

```json
"claude-devbox": {
  "extends": "acp",
  "label": "Claude (devbox)",
  "command": ["cc-remote", "--host", "devbox"]
}
```

或改用插件（带 host / ssh 命令 / 可执行路径的设置界面，“Check” 按钮即执行 cc-remote doctor）：

```sh
paseo plugin install github:AkaraChen/cc-remote:paseo-plugin
```

预期：客户端能起会话，diff 与终端在客户端里正常渲染。
6. 命令清单：

```
cc-remote [--host <host>"]                  speak ACP on stdio (what your client runs)
cc-remote [--host <host>] doctor           check ssh and the remote claude version
cc-remote [--host <host>] --cli <args...>  run `claude <args...>` on the server
cc-remote --version | --help
```

7. 按边界配置权限，这是最值得照抄的部分：权限请求转发给你的 ACP 客户端；Read、Glob、Grep 从不询问；“Accept edits” 只批准会话目录内的 Write、Edit、NotebookEdit；Bash（Windows 为 PowerShell）询问时，批准的是命令前缀（如 npm test:*），不是整个 Bash；含 ;、&、|、重定向、$(…)、反引号或换行的命令永不自动批准；前缀批准持续到 cc-remote 退出为止——长会话里等于权限只增不减，需要主动重启。预期：危险组合命令每次都问；你清楚自己批的是哪一段前缀。
8. MCP：除客户端传入的 server 外，cc-remote 还会启动你本地 Claude Code 会启动的那些（~/.claude.json 的 user servers、为该目录添加的 servers、项目 .mcp.json 中已批准的 servers，批准记录在 ~/.claude/settings.json、.claude/settings.local.json 或本地 claude 里），这些都在本机运行。重名时优先级：客户端 > 本地配置 > 服务器上同名 server。需要 OAuth 的 http/sse server 会先提供一个 authenticate 工具，调用后在本机浏览器打开登录页、在 localhost 接收回调，token 存在 ~/.config/cc-remote/mcp-auth/（与 Claude Code 的分开）。预期：服务器端不出现这些 MCP 的凭据。
9. 知道 ssh 与会话怎么走：所有会话共享一条连接（ControlMaster，保持 10 分钟）；每条连接带 ServerAliveInterval=15、ServerAliveCountMax=3，断链约一分钟失败而不是挂死；若 CC_REMOTE_SSH 里更早出现同名 -o，以它为准；Windows 的 OpenSSH 不能共享连接，每个会话各开一条。每个会话镜像到本机 ~/.claude/projects/（与本地 Claude Code 同位置），客户端可列表、重放、加载、fork；resume 服务器没见过的会话（如 fork）时 cc-remote 会先拷到服务器。服务器上每个本地目录对应一个空工作夹 ~/.cc-remote/ws/<your hostname>/<local path>/（Windows 上 C:\\Users\\me\\app → ~/.cc-remote/ws/<your hostname>/C/Users/me/app/）。预期：断线后客户端约一分钟内报错而不是永久卡住；会话记录能在本机找到。
10. Windows 补充：shell 工具是 PowerShell（PATH 上有 pwsh 用 PowerShell 7，否则 5.1）；Grep 需要 PATH 上有 ripgrep（rg）。预期：Windows 上 Bash 类工具按 PowerShell 语义执行，Grep 不退化成慢速遍历。
11. 要改 cc-remote 本身时走开发回路：

```sh
bun install
bun test
bun src/main.ts --host devbox     # speaks ACP on stdio
bun run compile                   # dist/cc-remote, for this machine
bun run build                     # dist/cc-remote-{linux-x64,linux-arm64,darwin-arm64,windows-x64,windows-arm64}
```

测试目录 test/e2e/ 里有最小 ACP 客户端和一个 fake ssh，用独立的 HOME 在本机模拟“远端”，用法见 test/e2e/client.ts 头部注释——这是不碰真实服务器就能验证改动的方式。

### 做法 X：sandbox-mcp Windows 干净机测试与证据

1. 开启 Windows Sandbox。前提：管理员 PowerShell、Windows 11 24H2（build 26100）+ Pro/Enterprise/Education、UEFI/BIOS 已开虚拟化；Home/Server 不支持。运行：

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All
```

运行后重启；重启后从开始菜单打开一次 Windows Sandbox 再关闭，以安装 `wsb`。预期：功能启用，`wsb` 可用；同一时间只能跑一个沙箱。

2. 下载 portable ZIP（Windows x64），先用相邻 `.sha256` 校验再解压；ZIP 自带 Node.js、`sbx`、MCP server、guest agent 和 skills，无需安装 Node/npm。解压后在 PowerShell 运行只读检查：

```powershell
./sbx.cmd doctor
```

预期：`doctor` 只解释缺什么和怎么修，不自动开功能、不提权、不改 PATH、不重启；通过再往下。

3. 用系统自带程序跑通最小闭环：

```powershell
./sbx.cmd run C:/Windows/System32/charmap.exe --open
```

预期：在 `%LOCALAPPDATA%/sandbox-mcp/runs/<timestamp>` 留下 `report.md`、`report.json`、截图和 `audit.jsonl`。

4. 对自有 Windows 应用做干净机冒烟测试。前提：应用能在 Windows Sandbox 运行；测试脚本存在时用 `--test`；默认不安装任何运行时。

```powershell
./sbx.cmd run ./dist/YourApp.exe --network off --test ./test/smoke.ps1 --open
```

预期：启动全新 guest、部署/启动、观察、收集、销毁并出报告。如果失败并提示缺 VC++/.NET/Windows App Runtime，可显式选择自动补齐：

```powershell
./sbx.cmd run ./dist/YourApp.exe --provision auto --open
```

但这会把报告标记为 `PROVISIONED (not a clean-machine test)`，不能当作干净机通过。也可先用只读静态诊断：

```powershell
./sbx.cmd deps ./dist/YourApp.exe
```

预期：`deps` 是保守静态扫描，不证明所有动态依赖存在；WebView2 等可选组件必须在真实 guest 中检查。

5. 测安装器和卸载残留。前提：有安装包和可选测试脚本。

```powershell
./sbx.cmd install-test ./setup.msi --test ./test/after-install.ps1 --fail-on-leftovers --open
```

预期：报告列出安装器新增、卸载器遗漏的文件、注册表、服务、计划任务、自启动项。

6. 不可信文件在无网沙箱中 detonate。前提：只在一次性 guest 中运行；默认无网。

```powershell
./sbx.cmd detonate ./suspicious.ps1 --network off --open
```

预期：报告列出进程、域名查询、连接尝试、持久化和文件变化。

7. 需要反复改代码时用 warm sandbox 快循环。前提：目标目录专用，guest 中该目录的多余文件会被删除；`deploy` 只传变更并用 SHA256 校验。

```powershell
./sbx.cmd start --network off
./samples/HelloSandbox/build.ps1
./sbx.cmd deploy ./samples/HelloSandbox/bin C:/apps/HelloSandbox --launch HelloSandbox.exe --restart
./sbx.cmd shot --window 'Hello Sandbox'
./sbx.cmd stop
```

预期：先 `start`，再 build/deploy/shot，改完重复，最后 `stop`；`deploy` 报告 added/changed/removed/unchanged、传输字节、耗时和 `verified: true`。

8. 让 agent 直接走 CLI 或接 MCP。前提：agent 能执行 shell 时优先直接用 `sbx`/`sbx.cmd`，不必配 MCP；只有需要可发现工具 schema、结构化结果和内联截图时才配 MCP。VS Code `.vscode/mcp.json` 形状如下，路径替换为解压目录，且用绝对路径：

```json
{
  "servers": {
    "windows-sandbox": {
      "type": "stdio",
      "command": "C:/Users/you/Downloads/sandbox-mcp/node.exe",
      "args": ["C:/Users/you/Downloads/sandbox-mcp/src/server.js"]
    }
  }
}
```

GitHub Copilot CLI 的 `%USERPROFILE%/.copilot/mcp-config.json` 用 `mcpServers` 顶层键并加 `tools`；Claude Desktop 用 `mcpServers` 且省略 `type` 和 `tools`。重载客户端后，可让 agent 执行“build it, test it on a clean machine, look at the screenshot, fix it, repeat”。

9. 可选：安装 agent skills/plugin。前提：Node.js 20+；只用 CLI 时不需要。skills 覆盖 setup、干净机运行、交互 UI 测试、安装器测试、不可信文件 detonate。

```powershell
copilot plugin marketplace add shanselman/sandbox-mcp
copilot plugin install sandbox-mcp@sandbox-mcp
```

也可把 `skills/` 中需要的目录复制到 agent 的 skills 文件夹，例如 `~/.copilot/skills/`。

10. 知道它不做什么：README 没有说它自带调度器；时间/事件触发需要外层 agent 或 CI 来编排。适合 Windows 桌面应用（Win32、WinForms、WPF、WinUI、console、PyInstaller、Electron 等）的干净机验证、GUI 测试、安装器和不可信文件；不适合需要 Linux、持久环境、多机并行或 ARM64 打包的场景。CLI 适合能跑 shell 的 agent；MCP 适合需要工具 schema、结构化结果和内联截图的客户端。

## 怎么判断变好了

A：用量页按用户/模型/时间过滤 tokens、成本来源、单轮延迟，可 CSV 导出；缓存命中率 cache reads / (uncached input + cache reads + cache writes)；每条回复显示时间、模型、设置快照和记录成本；变更页看 diff 和整文件。无效果评测。

B：挑 1 个重复性高、边界清楚任务，记录手工基线；非生产机器接 1 个 provider + 1~2 个相关 MCP；重复 3~5 次。看完成率、人工介入/返工时间、token 费用、权限请求数量、失败归因。

C：在单个真实项目只落地短 CLAUDE.md、permissions、一个 PostToolUse hook；用 Plan mode 跑同类任务 3~5 次。看完成率、人工介入/返工、token 费用、权限请求、失败归因、提交前 diff 是否变小、hook 是否拦住未格式化/未测试改动、/context 是否塞着不用 MCP。

D：选不熟悉中小仓库，让 plan 定位 X 功能并给计划，人工核对命中；确认后切 build 执行；另取同量级任务跳过 plan 做对照。看定位准确率、计划返工次数、到首个可运行改动耗时、plan 拦下次数、build 回滚/重做次数。

E：约 15 分钟：本机安装、codex 选 ChatGPT 登录、小仓库给边界清晰任务、人工 review 每处改动。看是否一次跑通、diff 人工重写比例、与手工时间差、上下文误解次数、权限确认次数。

F：记录版本、启动实验开关、保存 /plugin-types、加载 diff 示例并跑测试脚手架；按验收矩阵逐项留证据；用成本公式在相同任务集/模型/质量线下比较基线。交互省时但返工变多可能是净亏；只有明确运行时/界面限制、受控数据、负责人、回滚手段才试点。

G：非关键可回退仓库；记录安装方式；先在 Plain Docker 等容器里跑；pi + /login；给边界清晰小任务；换 provider 重跑同提示。看一次完成率、人工介入、返工/补上下文、换 provider 是否仍跑通、实际触达文件系统/网络范围；会话导出先确认合规。

H：非关键仓库装 mission-control 和 token-weather；派一个改 3–5 文件、拉起至少一个子 agent 的任务；用 w/c 记录错误读写发现时延；在可丢弃目录演练 blast-radius 的 rm -r。看发现错误读写时延、上下文事故次数、被阻塞次数/时长、危险命令拦截率、额度消耗。Code 视图打不开就停。

I：半小时：只开局域网+账号密码；手机扫码选已测会话；发短标记确认原会话收到并回复；测一次待确认卡片；配置 Bark/ntfy 测试；关手机网页看完成通知；重启网关看登录/地址/会话。看手机读取/实时更新、消息到达、审批生效、通知不轰炸、未登录 401、停网关不可访问、重启恢复、无重复提交/误操作。外网必须用真实手机蜂窝网络验 HTTPS。

J：非关键机器装 qh；跑 qh up --kernel alpine:aarch64 → qh exec 'uname -a; ip -4 -o a show eth0' → qh down；挑需要真实内核/网络验证的小任务，先用现有工具做基线，再交给 agent+skill。看 guest 内是否返回 stdout/stderr/exit code、到可判定结果耗时、人工介入次数、跨架构是否一次跑通、TCG 耗时是否可接受。大 payload 走隧道失败说明用法不匹配。

K：先跑通一个任务：有对应计划并登录、连接 GitHub、选仓库和 Default 环境；写自包含工单并用 claude --cloud 发起，点名证明命令；关标签页后回来看进度和 diff；用本地 Claude Code 做对照；重复 3–5 次。看是否拿到可判定证据、人工介入/返工相对本地基线、到可审查 diff 耗时、并行 session 计划用量、是否出现需手动处理的 merge conflict。

L：非主力机器装一份，只配一个 provider key，不接 Firecrawl/Telegram；建单个 agent 给真实小任务（clone 仓库跑测试给 diff，或带引用调研）；确认隔离是否成立；同任务用本地 Claude Code 对照；记录一次 Take over 交回；看 token 花费。看沙箱隔离、hand-off 人工介入成本、token/单任务成本、持久 home 是否留住文件、凭据是否掩码且支付逐笔批准。

M：npm 装一份，export 有余额 provider key；非关键小仓库用 opr run 和 TUI 各跑同一任务；再用现有编码代理跑对照；重复 3–5 次。看一次跑通/人工介入、diff 人工重写比例、耗时与资源占用、run 后台等待是否等到工作、MCP server 是否起来且工具注册、换实现同提示是否跑通。run 端到端跑不通就先只用 TUI。

N：最小试用：一个 repo、一个会话、一个边界清晰任务，半天/一个任务周期。先试 claude --worktree --tmux=classic，再试手工 tmux new-session -A -s <repo>；用 send-keys 发任务，capture-pane -p -J 读回，pipe-pane 写日志；断开 SSH 后重跑 ssh devbox -t tmux new-session -A -s agents 看是否回到同一会话且 agent 仍在跑。看：tmux ls 能看到 repo 会话；窗口按任务命名；send-keys 能驱动；capture-pane 能读回可 grep 输出；日志文件持续增长；状态栏/脚本能区分 working/parked/idle（仅屏幕抓取，不保证准确）。若你需要完成事件、结构化状态或重启后恢复，则不应采用 N。

O：最小试用半天、单机。装 dmg，与现有 Warp 并存，先不动任何配置，确认能起终端、能登录（若登录失败即止步，记为阻塞）。在 ~/.harp/settings.toml 只开 tmux 集成，开 2 个 tmux 会话：一个跑长任务（如大范围重构/长测试），一个跑需要中途确认的任务。把窗口切走去做别的事，只用侧栏判断何时该回来；记录每次“侧栏说 waiting for you”是否真的在等你。想更严格时加 WARPOSS_STATUS_TRACE=1，事后把 ~/Library/Logs/harp.log 里的 [status-check] 行与各会话的 agent transcript 逐条对齐，数误报/漏报。若要从手机接管，在异地会话里 tmux set-option @warp_adopt 1，看标签是否按预期出现、名字与分组是否随会话走。额度环留到最后：先手工写一份符合 docs/limit-rings.md 的 JSON 验证渲染，再决定是否值得写生成脚本。可自定指标：状态准确率（waiting for you 的误报/漏报次数，目标可先定误报 ≤ 1 次/小时）、接管延迟（从 agent 进入 waiting 到你实际回到该会话的秒数，对照不用侧栏时的基线）、并行度（同时推进且不互相踩踏的会话数，试用前后各记一周）、空转率（切到某标签后发现其实没在等我的比例）、稳定性（一周内因 Harp 本身而非 agent 导致的中断次数）。止损条件：登录不通、状态误报频繁且无法用 hook/脚本修正、或并行度提升带来的注意力收益抵不过维护 ~/.harp 配置与额度 JSON 的成本，则退回原版 Warp + 手工 tmux 布局，把结论降级为 study。

P：先在两三台机器上用 openspaces 小范围试跑只读诊断任务和单仓库修测试。最小试用：安装并打开本地面板；openspaces computers test 确认目标机可达且装了哪些 agent；openspaces sandbox create dev 后跑一个只读诊断（如查 OS/磁盘余量）再跑一个单仓库修测试；用 logs -f 看消息和工具调用；send 续聊验证同一 session；close 后确认只删 ~/.openspaces/work/<thread> 不删 --cwd；在 local/ssh: 上核对 acceptEdits 是否自动改文件、其它询问是否被拒。看：线程能否恢复、日志是否完整、清理是否越界、权限行为是否符合预期、fan-out 结果是否并排、人工接管是否可用。若需要定时/事件触发/任务队列/重试，则不应采用 P。

Q：最小试用：先用 Omnara Cloud 的 quickstart 跑通一个只读诊断代理（报告 OS 和磁盘空间），确认 dashboard 能看到 tool calls、能发消息、能触发审批（若配置了）；再选低风险 PR 审查或 SRE 排查任务，与现有 Claude Code 流程做对照，重点验证远程托管、审批和断点恢复是否减少人工盯守。可观察：每一步事件是否存入 Postgres 并可查询/流式接收；审批是否按工具权限（立即运行/先问人/禁止）生效；崩溃/重启/机器断连后是否可断点恢复；Slack/Discord/GitHub/Cron 触发是否按预期启动代理；人工介入次数、返工、到可审查结果耗时、并行代理数。注意：原文没有效果指标、基准或案例数据，只能验证运行可观测性，不能据此证明任务结果改善；建议小范围、多轮重复后再决定是否扩大。

R：最小试用半天到一天，在一台可丢弃或低风险机器上跑。按步骤 1-10 跑通一个只读诊断任务（如“看一下这个目录里有什么”），再跑一个单仓库修测试；用手机发任务、在卡片上审批、用 /stop 中断一次；用 audit list --limit 20 和 audit verify 检查审计链。可观察：卡片是否原地更新工具调用；审批是否只有发起者能批；audit verify 是否通过；message.inbound/message.outbound 是否成对；/stop 是否取消待审批；Linux 上是否自己补了沙箱兜底；单任务 token/成本。止损：bot 不回且按排查顺序查不到、审批卡不生效、或你需要定时触发/多 agent 执行端，则不采用 R。原文没有任务质量、成功率或效率的量化数据，只能验证过程可审计性。

S：最小试用：挑一个 1–2 小时内能读完、已有测试套件的小仓库（最好依赖已装好），在一次联网会话里完成安装、ollama pull 和在线冒烟；记录测试失败基线；断网；跑 5–10 个同类小任务（解释、定位、一行修复、补完小函数各若干），每个任务都用“agent 改完 → 退出 → 自己跑原测试”的方式验收。看：独立验证通过率（自己跑原测试全通过的任务数/总任务数，不看 agent 自述）、测试完整性（测试文件被改动次数，目标 0）、越界行为（尝试联网/装包次数，目标 0）、人工返工量、耗时比（从下提示到测试通过的实际耗时 ÷ 自己手动完成的耗时）、资源（内存峰值、每任务 token、是否 OOM/超时）、权限提示数与误提议次数。采纳门槛：小任务集上独立验证通过率不低于手动基线、测试零改动、零联网尝试，且耗时不超过手动的约 1.5 倍，则可纳入断网/隐私受限场景的标准工作流；否则先只用于解释代码、定位失败测试这类低风险任务。

T：最小试用：选一个会产生 worktree 的代码仓库，按上述方式把规则写入 AGENTS.md，先跑 3–5 个真实任务，覆盖普通任务和 subagent 任务。每个任务完成后检查 git worktree list、相关分支和原文提到的 cargo target 目录是否残留；与试用前同样数量的任务做对比。看每 N 个任务后的残留 worktree 数、残留分支数、人工清理耗时、误删或破坏未合并工作的次数；同时确认任务完成质量没有下降。若残留明显减少且无误删，再扩大范围；若出现误删或规则未被遵守，先补充权限、保护规则和验收检查。原文没有给出指标，这些是试用设计。

U：最小试用：在一次性 Linux+KVM 主机或 GitHub Actions 中，按本文第 4–6 步跑一个修测试任务，导出 .tkb 并用固定 trust 文件离线验证；先不 apply，只看 diff。跑一个任务周期或半天即可。可观察：tkbox diff 是否是 git-format patch；tracekit verify 是否打印 Integrity: VERIFIED.、Assurance 是否为 dev；tkbox approvals 的挂起与 approve/reject 是否符合预期、无人处理是否 2 分钟后拒绝；VM 内 echo $GH 是否只打印占位符；明文 HTTP 到未绑定主机是否被阻断并记 tkbox.secret.leak；绑定主机是否记 tkbox.secret.use；metadata 地址是否直接拒绝；日志里是否出现 tkbox.gap；同一个 agent 改动在有 U 与无 U（本机直接跑）两组之间，人工复核时间、需要回滚的次数、你愿意让它碰的仓库范围是否变化。原文没有效果数据，以上是本手册提出的试用设计。

V：最小试用半天以内：只走 headless 路径（跳过 build-base），用 --backend lima 执行 boxery-host init；只接 Claude Code；选一个本来就要在本机执行、且会安装依赖或运行外部代码的真实任务（克隆仓库→装依赖→跑测试→输出失败用例）；全程不授予任何 grant，观察智能体在无凭证状态下能否完成任务；跑不通时再逐个加授权，记录每一步实际加的是什么；重复同一任务 3 次，其中至少一次在任务中途执行 vm_manage 的 fork 或 snapshot/revert，验证回滚是否可用。可观察：宿主机零污染（任务完成后主机上是否新增依赖、环境变量或残留进程，目标：无）；凭证没有外泄（VM 内是否确实没有任何真实密钥，只有可撤销 token）；人工介入次数（一次任务中需要人工执行 vm_grant 或手工操作的次数）；可复现性（同任务 3 次结果是否一致，snapshot/revert 重放后是否收敛）；任务成功率与耗时（与直接在本机让智能体做的基线对比，README 中的 13 秒/1 秒/3 分钟是作者主张，必须用自己环境实测替换）；长任务持续能力（把 host 放到远端，任务发起后关闭笔记本，回来检查任务是否完成）；失败模式清单（破坏性变更、后端不稳、授权卡住各出现几次）。升级为 adopt 的建议条件：上述试用在 2 周内稳定跑通，人工介入次数降到接近 0，且补齐 docs/grants.md 和 docs/security.md 中可照抄的配置后，再考虑写入手册主线；否则保留为 try，作为隔离执行环境的可选方案列出。

W：最小试用半天到一天，一台常开服务器 + 本机一个可回退的小仓库。按步骤 1–5 跑通 cc-remote doctor 与第一个 ACP 会话；给一个边界清晰任务（跑测试、定位失败、单文件修）；全程盯权限询问，确认 Read、Glob、Grep 不问、Bash 只按前缀问、含 ; & | 重定向 $(…) 反引号换行的命令每次都问；退出后在本机 git status 看改动是否只落在预期文件。可观察：doctor 是否一次通过（ssh + 远端 claude 版本）；同一任务相对本地 Claude Code 的人工介入次数与到可审查 diff 的耗时；权限询问次数与你实际误批的次数；长会话里前缀批准累积到第几轮时你主动重启；断 ssh 后是约一分钟失败还是挂死；会话是否能在本机 ~/.claude/projects/ 列表、重放、fork；服务器端是否只出现工作夹路径而不见本机其它文件；Windows 上 PowerShell 与 rg 是否按预期工作。原文没有任何质量、延迟或成本量化数据，以上指标是本手册提出的试用设计。止损：工作流依赖项目级 .claude/（commands、skills、agents、settings）、依赖 checkpoint/rewind、依赖 LSP 或 worktree 工具，或需要定时/事件触发，则不要切到 W，保留本地 Claude Code 或改用 K/U/V。

X：最小试用：在一台符合前提的 Windows 11 24H2 Pro/Enterprise 开发机上，按步骤 1–3 跑通 `doctor` 和 `charmap`；再跑仓库自带样例：`HelloSandbox` 正常测试应通过，`--args --crash` 应失败并给出崩溃证据，`LeakyApp` 应报告卸载残留，`Suspicious` 应报告模拟恶意行为。然后用一个真实 Windows 应用做 3 次 `sbx run --network off --test ... --open`，记录每次 pass/fail、耗时、截图/报告是否齐全、是否发现只在干净机出现的问题。接入 agent 后做 A/B：同一批 3–5 个已知问题，比较“不用沙箱”和“用沙箱闭环”的修复成功率、首次诊断时间、人工介入次数、证据完整性、误判为通过的比例、单次运行成本。可观察：干净机通过率、干净机专属失败发现数、从失败到定位缺依赖/崩溃原因的时间、安装器残留发现数、agent 需要人手动操作桌面的次数、报告和截图可复现率。作者仓库记录的参考数据：GUI 样例端到端约 40–50 秒；干净机运行 `NativeProof.exe` 29.8 秒失败，退出码 -1073741515，诊断为缺 VC++ redistributable；显式 provision 后另一台新 guest 30.9 秒通过，安装器为 Microsoft 签名 14.51.36247.0，guest 网络保持 off；兼容性矩阵覆盖七种配置，WinUI/WPF/Win32 有真实离线 guest 截图；build 26100.9882 的可选组件基线记录在 `test/fixtures/sandbox-26100.9882.json`。这些是作者仓库内实测记录，不是对所有 Windows 应用或未来 guest 镜像的保证。止损：团队没有 Windows 桌面应用测试需求，或机器不满足 Windows 11 24H2 Pro/Enterprise，则不值得采用，最多作为思路研读。

## 常见坑

- A：agentbox 默认 bypassPermissions、凭据可被终端用户读、单机单进程；撤销账号访问不会收回已下发凭据、不会终止运行进程；Web 提交不 push、不跑 Git hooks/签名；默认备份不含工作区；持久文件只放 /workspace、/home/agent、每用户 /shared；容器停止或重建就终止进程。
- B：curl | bash 先审阅；README 是宣传页，配置细节、权限模型、扩展清单、沙箱边界、效果数据都缺。
- C：install.sh/starter-kit 内容未展示，先审查；CLAUDE.md 超过几百行会淹没重点；deny 永远优先；无人值守只在无生产访问容器/沙箱；CLAUDE.md 是请求，hook 是规则；不用的 MCP 关掉；一个任务一个会话，错误上不要叠第三条消息。
- D：安装前清 0.1.x 前旧版；桌面版 BETA；README 是入口，配置/模型/提示词/协作流程在外部 docs。
- E：API key 需 additional setup；curl/PowerShell 安装是下载即执行，受管环境先审阅或改用 npm/brew/手动二进制。
- F：early access，API 可能不通知就变；/diff 已是内置命令会争夺归属；hooks.json 只是加载器片段，不是安全控制；不要从一次成功运行推断 fail-closed；sec-default 不是通用防火墙；升级后重新生成声明。
- G：pi 无内置权限，不隔离不要接触敏感文件/凭证/网络；README 是宣传+导览，扩展细节仅链接；默认无 sub-agents/plan mode；npm 不 pin 传递依赖；pi-telemetry/pi-share-hf 导出等于上传工作数据，先确认合规。
- H：材料只有 README，无基准/耗时/token 节省/用户反馈；Code 视图限 macOS+Chrome+图片终端；My setup 类插件需 fork 改规则；blast-radius 先在可丢弃目录演练，漏拦一次就不该作为真实仓库唯一闸门。
- I：社区项目、与 OpenAI 无隶属、依赖 Codex App 内部 IPC；免密高风险；二维码 5 分钟一次、网关重启失效；只测 127.0.0.1 不算外网可用；通知不保证恰好一次；无多用户角色隔离；复杂 MCP 表单/身份验证挑战回桌面；.local/ 不上传公开仓库。
- J：自带 overlay root 空密码 dropbear，lab only；无 NIC 驱动时隧道约 15 KB/s 入、75 KB/s 出，大 payload 放 fs/ 再 qh reload；Git Bash 设 MSYS_NO_PATHCONV=1；agent did not respond 先 qh logs --tail 80 再 qh probe；跨架构 TCG 偏慢，同架构才可 WHPX/KVM。
- K：claude --cloud 从 GitHub 克隆当前分支，先 push；闲置 VM 会回收，长任务边做边 commit；secrets 不放共享环境变量；网络 None 仍会向 Anthropic API 发请求；setup script 必须 exit 0 且约 5 分钟内完成；缓存只存文件不存进程；routine 运行时无审批提示；Claude 不会收到与 base 分支的 merge conflict 通知，需要让它 rebase；Console API key/第三方 provider 不适用。
- L：setup 是下载即执行，先审阅；49 star、无第三方评测、无效果对照；定时/循环未实现；单体 Next.js 进程是单点；Settings 值优先于 .env 且只存 data/xiryn.db；配置表在 XIRYN_WORKSTATION_CPUS/XIRYN_WORKSTATION_MEMORY_GB 处截断；Take over 与凭据保险箱只有机制描述，按钮路径需到界面确认；Telegram 需联网。
- M：run 端到端未在有余额 provider 验证；opr 在 npm 与 Homebrew 安装下行为不等价；Homebrew 从源码构建会拉 Rust 工具链；npm 无匹配平台时干净退出；代理池不要自己 export 代理变量；代理池无注释语法，# 行只是解析失败丢弃；命名 agent 显示名与配置 slug 不一致会导致配置落不到 agent；drain 是 fail-open，不会挂死但也不保证一定等到。
- N：--tmux 不带 --worktree 会报错；iTerm2 用 native panes 而非真 tmux；脚本化必须 =classic；会话名不能含 . 或 :；split-window 漏写 -c '#{pane_current_path}' 会开错目录；main-pane-width 百分比需 tmux >=3.2；send-keys 裸参数会被当键名，分号会截断命令，TUI 需在文本和回车之间 sleep 0.3；capture-pane 不带 -J 会让 grep 在折行接缝出错；pipe-pane -o 是 toggle，原始流含转义；状态检测靠屏幕抓取，没有完成事件，kill-session/kill-server/重启机器后会话不保留；嵌套 tmux 需改前缀或按两次 prefix。
- O：仅 macOS；AGPL-3.0，改后通过网络提供给别人需提供源码；非官方 Warp fork，不受 Warp 制作、背书或支持；通过 Harp 登录未测试，可能卡在第一步；额度环不主动抓取，需要你自建数据管道，否则形同虚设；tmux 集成每 10 秒轮询，状态判定准确性未给验证结果，可能滞后或竞态；侧栏状态不是完成事件，不能当自动化编排器；内部命名仍沿用 Warp（warp-oss 二进制、WARPOSS_* 开关、@warp_* tmux 选项），与其他 tmux 客户端共享这些选项，需注意别名冲突；agents.third_party.should_render_cli_agent_toolbar 默认 false，关掉后需通过 Claude Code plugin marketplace 更新 Warp 的 Claude Code 插件；侧栏布局下标签栏的搜索框、视图选项、标签配置按钮被移除，新标签来自 Cmd+T、双击或侧栏空白处右键；WARP_DATA_PROFILE 只用于 debug 构建；没有基准、案例或效果数据。
- P：原文没有内置定时器、cron、webhook 或事件触发器，也没有任务队列/重试；它只提供可被外部触发的原语（start 后台运行并打印 thread id、send <id> --wait 续聊、SDK startThread/fanOut/openThread、status 查询、interrupt() 只停本轮但保留线程）。codex、gemini、opencode 适配器按文档写、未实机验证；已实机验证的是 claude-code 与 shell。默认只在隔离环境（docker:、cua:）跳过权限询问；在 local 和 ssh: 上 Claude Code 拿到 --permission-mode acceptEdits，文件编辑自动批准，其它原本会询问的一律拒绝；只有信任这台机器时才加 --auto-approve。Cua 的 sandbox exec 不接受 stdin，走 Cua 时密钥会作为参数出现在本机命令行上。close 只删目标机上的 ~/.openspaces/work/<thread>，不删你传的 --cwd；pid 文件只在本轮存在，close 只杀它能确认属于该线程的进程。目标机除智能体 CLI 外无需守护进程/账号/中继，但线程状态存在发起方机器的 ~/.openspaces/threads/。view 需要 Mac 屏幕共享或 Linux 绑定 localhost 的 VNC。面板只监听 127.0.0.1 且链接带随机 token；外部网站无法驱动它。
- Q：只有 README/项目自述，没有独立评测、用户案例、性能数据、成本数据、失败率；Show HN 51 points/15 comments 只是早期关注信号。权限具体配置、cron trigger 完整参数、memory/subagents 配置、示例内容等只给链接，本次材料未包含，不能照抄完整配置。自托管本地默认配置故意不安全，真实部署要按 self-hosting guide 和 configuration reference 操作。沙箱还需要实例有 public URL。Cloud 示例模型名按原文，实际使用要确认 provider 可用模型。工具权限可设为立即运行、先问人、禁止，但具体界面/字段未在 README 给出，需按 docs.omnara.com/tools/permissions 操作。Omnara 是运行层，不是 agent framework 替代；简单一次性任务不必上平台。
- R：自标 prototype、40 stars、MIT；执行端只有 Claude Code（Codex 能探测到但没接通）；内核级沙箱仅 macOS，Linux 需自行用专用用户或容器兜底；笔记本休眠即离线；无定时触发/状态触发，任务只能由人发消息启动；单条消息有 10 分钟无输出、30 分钟实际耗时、100 次工具调用上限，长批处理要拆多条；--workdir 指向的目录就是 agent 能碰的范围，别指向生产仓库；master.key 不备份则换机后凭据不可恢复；allowed_users 不写默认只允许应用所有者；群聊必须用 oc_... 群 ID 且只有 @ bot 才响应；bypassPermissions 危险；macOS 沙箱可用 WARDENDECK_SANDBOX=0 关闭但不推荐；默认关闭 Claude Code 内置自动记忆以避免事实跨 bot 泄漏。
- S：公开证据只有一次单行 bug 修复；CSV 报告和日志分析器作者自述尚未跑离线版；未测大仓库、陌生框架、复杂依赖；示例只用 Python 标准库，绕开了“依赖是否齐备”这个离线最大坑；没有本机速度、延迟、成功率、内存峰值的量化数据；单作者、单机（Mac）、单项目，工具/模型版本与部分环境变量（如 OLLAMA_NO_CLOUD、qwen3.5:9b、OpenCode 1.19.4）需在自己环境核实后再照抄；opencode.json 完整内容不在材料内，只有字段描述，不要凭空补全；下载体积不等于内存需求；模型可能误提 pytest 而项目用 unittest，提示词要写明确切测试命令；不能下载新包、不能上网查资料；agent 改完必须退出后自己跑原测试，不能只看自述。
- T：证据只有一条推文和一个 AGENTS.md 示例链接；规则片段在“它专用的 cargo target”处截断，完整规则、删除命令、分支命名规则、cargo target 处理都不可见；没有前后对比、残留数量、清理耗时或失败案例，作者“最佳策略”只是主张；智能体必须能读取 AGENTS.md 且有删除 worktree/分支权限，否则规则不会生效；必须防误删未合并工作；不要凭空补命令。
- U：v0、无 release，只能从源码构建；Mac 只能按 docs/development.md 走 Lima VM；没有 /dev/kvm 的机器直接跑不起来。必须自己装并常驻 Tracekit signer：daemon 启动时没有 signer 应答就退出；同机 dev signer 是 same-user，bundle 只显示 Assurance: dev 和 isolation: same-user，更高保证要把 signer 作为独立用户运行、并在另一台主机放 witness 共同签名 signer 日志。Action 里的 signer 是同一 job 内创建的 dev signer、没有 witness，Assurance: dev 只证明记录在 job 后未被改动，不证明 runner 本身诚实；action 会把 agent 改动应用到 runner 的 checkout，随后构建/测试等于在 runner 上运行 agent 的代码，要按 examples/claude-code-fix.yml 的三 job 形状把写 token 隔开。固定你预期的 trust 文件（提交到仓库或放 CI 外），不要直接信任 bundle 旁边附带的那个。tkbox apply 只能在已停止的 box 上、导出前执行，且对每个文件先问 signer；示例 demo 不 apply。网络不在 allowlist 会被挂起，无人处理 2 分钟后拒绝；云 metadata 地址 169.254.169.254 无论 allowlist 或人工批准都直接拒绝；明文 HTTP 把 secret 占位符带到未绑定主机会被阻断并记 tkbox.secret.leak；绑定主机才换入真实值并记 tkbox.secret.use。无外网时用 --firecracker/--kernel 传本地文件；tkbox 默认在自身二进制旁找 guest 二进制，也可 --guest-dir 指定。材料没有并发调度、任务队列、成本或性能数据；不要把它当多任务编排器。
- V：README 顶部明确警告 Early-stage, experimental software. Expect rough edges and breaking changes between releases.；exe.dev、boat.dev、Cloud Hypervisor 三个后端标注 experimental；仓库 38 stars；本次只拿到 README，docs/grants.md、docs/security.md、docs/pool.md、docs/cli.md、docs/install.md 正文均未获取，授权具体配置、CLI 参数、安全边界细则无法照抄；约 13 秒启动完整桌面 VM、约 1 秒快照、约 3 分钟构建基础镜像都是作者主张，没有基准测试方法或环境说明；密钥永不进入 VM 是设计声明，实际隔离强度需读 docs/security.md；VM 默认连 LLM 都没有，必须显式授权；Windows 不适用；多智能体共享池要用 vm_lease 并补 docs/pool.md；不要把 V 当成定时调度器，原文没有基于时间/事件/状态触发的调度机制。
- W：项目级 .claude/（commands、skills、agents、settings）不会下发到服务器，服务器用自己的设置，本机的 CLAUDE.md 在本机读；依赖这些的工作流行为会不一致。checkpoint/rewind 失效；LSP、Monitor、worktree 工具被关闭，N 的内置 --worktree/--tmux 路径在这条线上不可用，要保活改用 N 的手工 tmux 会话。前缀批准持续到 cc-remote 退出，长会话权限只增不减，必须主动重启；“含 ; & | 重定向 $(…) 反引号换行永不自动批准”不等于完整沙箱，Bash 仍在本机执行。服务器上的 claude 必须已登录且 2.1.248+；本机不需要装 claude，但需要 Bun 构建。Windows OpenSSH 不能共享连接，PowerShell 版本与 rg 缺失会影响 shell 与 Grep。重名 MCP 优先级是客户端 > 本地配置 > 服务器；OAuth token 与 Claude Code 分开存，换机要重新授权。没有定时/事件触发；resume/fork 只是“接着上次”，不是自动推进。原文没有独立评测或量化数据；先小范围试用，不要直接全面替换本地 Claude Code。
- X：仅 Windows 11 24H2+ Pro/Enterprise/Education；Home/Server 不支持；需要虚拟化和管理员操作；同一时间只能一个沙箱，不支持并行；ARM64 当前未打包；不适合 Linux 或持久环境。`deps` 是保守静态扫描，不证明所有动态依赖存在；WebView2 等可选组件必须在真实 guest 中检查；provision 后的通过不是干净机通过。不是所有 Windows 应用或依赖硬件的负载都能在 Sandbox 工作；录 MP4 需要 host 上有 ffmpeg，但不会静默安装。原文在 CLI 段落被截断，部分命令选项只能按已给内容判断。部署目标必须是专用目录，guest 中该目录的多余文件会被删除；MCP 配置需要绝对路径；`doctor` 不自动修，只解释；首次必须手动打开一次 Windows Sandbox 才能安装 `wsb`；它不自带调度器，时间/事件触发需要外层 agent 或 CI 编排；报告标记 `PROVISIONED (not a clean-machine test)` 不能当作干净机通过；下载后先用相邻 `.sha256` 校验再解压。

## 证据与来源

| 做法 | 依据与数据 | 注意 |
|---|---|---|
| A | 《devilcoolyue/agentbox》：安装命令、配置样例、工作区闭环、容器默认限额、账号池与凭据约束、备份与价格目录说明来自原文；34 stars、v0.1.7 为报告数据 | 无效果评测；硬约束为报告结论 |
| B | 《aaif-goose/goose》：安装命令、供应商/MCP/定制发行版链接来自 README | 其余为作者主张；无配置细节 |
| C | 《justxor/claude-code-pro-course》：安装、CLAUDE.md、permissions、PostToolUse hook、subagent、skill、MCP、headless、Explore→Plan→Code→Verify→Commit、提示词示例来自 README | 109 stars、课程宣传页；无 install.sh/labs/starter-kit 内容与效果数据；先落地片段为作者主张 |
| D | 《anomalyco/opencode》：安装命令、目录优先级、build/plan、Tab、@general、桌面包名来自 README | star 量级异常；plan 描述无案例；配置在外部 docs 未抓 |
| E | 《openai/codex》：安装命令、下载源与回退、环境变量、二进制文件名、登录方式、Apache-2.0、127,454 stars 来自 README 首页 | 无工作流/权限/审批/性能成本；指标为报告提出 |
| F | 《Claude Mods: Setup, Function Hooks and Security》：实验开关、/plugin-types、--plugin-dir、plugin test、插件目录结构、hooks.json、选型表、验收矩阵、成本公式、sec-default/telemetry 边界来自原文 | 作者声明文档与源码审阅非 benchmark、命令未在真实会话执行；成本公式为作者方法 |
| G | 《earendil-works/pi》：安装、Node 22.19+、/login、Nix、包列表、三种容器化、源码构建、供应链加固、telemetry、OpenClaw 案例来自原文；111397 stars 为 metrics | 扩展细节仅链接；无效果数据；最小试用为报告提出 |
| H | 《hamzafer/claude-code-mods》：marketplace 安装、/mission、w/c、颜色语义、token-weather、blast-radius、My setup 属性来自 README；MIT、37 stars、演示图为硬信息 | 无基准、耗时、token 节省或用户反馈；2.1.287+ 无法独立验证；最小试用为报告提出 |
| I | 《try2love/codex-mobile-bridge》：v1.3.1 下载安装、局域网网关、扫码、手机操作、Bark/ntfy、四种入口、命令行参数、安全说明来自 README；32 stars | 依赖 IPC；设计说明无独立评测；指标为项目验收维度 |
| J | 《b3s3da/qemu-harness》：安装、最小链路、qh.json、命令表、SKILL.md、排障、性能数字来自 README 自述 | 无第三方复现；案例仅 Alpine 与 Android GKI；lab only；最小试用为报告提出 |
| K | 《Claude Code in the cloud: a field guide to cloud sessions》：五步起步、GitHub 三路径、工单提示词、并行 session、超时变量、plan+cloud+teleport、手机查看、Auto-fix、routine、一次性 VM/网络、setup script、CLAUDE.md 来自原文 | 套餐/组织/preview 为原文自述；正文在“五个 ses”处截断；无效果评测；最小试用沿用通用节奏 |
| L | 《SouravBeraAkaSpeed/xiryn》：安装脚本、手动安装、agent 代装提示词、启动、Telegram、配置表、独立 Linux 桌面容器、单体架构、Take over、凭据保险箱、Node≥20.9、约 4 GB 来自 README；49 stars | 无第三方评测；定时未实现；配置表截断；最小试用为报告提出 |
| M | 《vakandi/opencode-rust》：安装三路径、平台包名、export key、opr/run/serve、Tab、命名 agent、配置解析、MCP、run 等待、代理池、cargo test 来自 README；MIT、35 stars、21 crates、571 tests、22 内置工具、3 servers 约 4 秒暴露 77 工具为仓库自述或工具行为 | Rust 更省资源为作者主张；run 端到端未验证；对比指标为作者主张 |
| N | 《Tmux and Claude Code: Sessions, Send-Keys, and the Ceiling》：内置 --worktree --tmux、=classic、会话/窗口/pane 命令、.tmux.conf 增量、send-keys 三个坑、capture-pane 参数、pipe-pane、状态栏脚本、SSH、存活表均来自该报告转述原文 | 原文明确状态检测靠屏幕抓取、无完成事件、重启即失；无效果数据或基准；判断指标与最小试用为本手册沿用通用节奏，属作者主张 |
| O | 《dominikmartn/harp》：macOS-only、AGPL-3.0、非官方 Warp fork、状态侧栏、固定分组、额度环、tmux 同步与 10 秒轮询、@warp_adopt、Claude Code hook、WARPOSS_STATUS_TRACE 日志、默认配置与移除项来自 README 与报告转述；157 stars 为报告数据 | 登录未测试；无效果指标、案例或 benchmark；状态准确率与并行收益为作者主张或本手册提出的自测指标；最小试用与止损为报告建议 |
| P | 《migasrias2/geckobox》：MIT、openspaces 安装、computers add/test、sandbox create、secrets set、start/logs/send/status/close、run --on、SDK startThread/fanOut/openThread、view、默认权限策略、Cua 的 stdin 例外、线程状态位置、无守护进程/账号/中继来自 README 与报告转述 | claude-code 与 shell 适配器已实机验证，codex/gemini/opencode 未实机验证；原文没有定时器/cron/webhook/事件触发器/任务队列/重试；无独立评测或效果数据；先在两三台机器小范围试跑为报告建议 |
| Q | 《Show HN: Omnara – Open-source alternative to Claude Managed Agents》：agent.yaml、CLI、TypeScript SDK、Docker Compose 自托管、MCP 接入、工具权限/审批、Cron/GitHub/Slack/Discord 触发、每步事件存 Postgres、断点恢复、示例目录来自 README/项目自述；Apache 2.0；Show HN 51 points/15 comments 为早期关注信号 | 无独立评测、用户案例、性能/成本/失败率数据；权限具体配置、cron 完整参数、memory/subagents 配置只给链接；自托管本地默认不安全；沙箱需 public URL；Cloud 示例模型名按原文；小范围试用建议来自报告结论 |
| R | 《bocoboho/wardendeck》：安装、init/project create、备份 master.key、feishu setup、复用已有应用、绑定群聊、serve、聊天指令、权限模式、环境变量、审计命令、排查顺序来自 README；40 stars、MIT、自标 prototype 为报告数据 | 执行端只有 Claude Code、内核沙箱仅 macOS、Linux 需自行兜底、无定时触发、单条消息限额为报告结论；无任务质量/成功率/效率量化数据，只有过程可验证性（哈希链审计、卡片状态、doctor/status）；建议小范围试、不直接写进手册为调研结论 |
| S | 《Coding From the Himalayas With an Offline AI Agent》：OpenCode 1.19.4、Ollama、Qwen3.5 9B、opencode.json 字段、Ollama 启动命令、断网验证命令、修复提示词、一行 diff、测试从 3 失败到 5 通过、样例输出 25.50、准备清单来自原文；LiveCodeBench v6/BFCL-V4 分数来自 Qwen 模型卡，非本机实测；12–16 GB 内存预算为原文引用 Voltti；预印本 OpenCode/Goose/OpenHands-SDK pass rate 与 OpenCode token 用量约 40 倍于 Goose 为原文引用，作者注明不能预测本地 Qwen3.5 9B | 只有一次单行修复成功案例，CSV 报告/日志分析器未离线跑通；无本机速度/延迟/成功率/内存峰值数据；opencode.json 完整内容不在材料内 |
| T | 《@dotey: 避免 worktree 残留的最佳策略是在 AGENTS.md 里面添加规则……》：AGENTS.md 规则方向、可见规则文本（截断）、JimLiu/baocut 示例链接、推文互动数据（38 点赞、7 转发、40 回复）来自原文 | 原文没有给出删除命令、分支命名规则或 cargo target 处理细节，也没有验证数据；最佳策略为作者主张；3–5 个任务的试用与指标为报告建议/本手册试用设计 |
| U | 《Cygnux-Labs/Tracekit-box》：/dev/kvm、e2fsprogs、Tracekit 1.4.2 signer、tracekit init --dev --v2 --no-hooks、make linux 构建与安装、tkbox daemon 首次下载 Firecracker v1.17.0 与 guest kernel 6.1.155 并 SHA-256 校验、tkbox run/exec/approvals/approve/reject/diff/stop/export、--secret GH=env:GH_TOKEN@api.github.com 语法、allowlist 挂起与 2 分钟拒绝、metadata 地址直接拒绝、tkbox.secret.leak/tkbox.secret.use、tracekit verify --trust 打印 Integrity: VERIFIED.、Action YAML 与三 job 安全形状、Python SDK 示例、fail-closed 与 tkbox.gap 均来自 README/报告转述；v0、无 release、需 KVM 为报告结论 | 无独立评测、用户案例、性能或成本数据；更高保证需把 signer 作为独立用户运行并在另一台主机放 witness 为 README 说明；Assurance: dev 不证明 runner 诚实为 README 明示；小范围试用、不宜直接作为生产默认为调研结论；最小试用与观察项为本手册提出 |
| V | 《modem-dev/boxery》：安装命令序列（brew install lima jq node、npm install -g boxery-vm、boxery-host init --backend lima && boxery-host build-base、boxery setup local）、npx add-mcp boxery-vm、pi install npm:boxery-vm、vm_* 工具清单、后端清单（本地 Lima/libvirt/Cloud Hypervisor、云端 exe.dev/boat.dev）、默认拒绝的 grant 机制、VM 只持有可撤销 token、boxery attach/desktop、vm_lease 来自 README；38 stars、early-stage experimental、三个后端 experimental 为报告数据 | 约 13 秒启动完整桌面 VM、约 1 秒快照、约 3 分钟构建基础镜像均为作者主张，无基准方法或环境说明；密钥永不进入 VM 是设计声明，实际隔离强度需读 docs/security.md；docs/grants.md、docs/security.md、docs/pool.md、docs/cli.md、docs/install.md 正文未获取，授权具体配置、CLI 参数、安全边界细则不能照抄；无正确性、成本、质量验证数据；Windows 不适用；最小试用与 adopt 条件为报告建议/本手册试用设计 |
| W | 《AkaraChen/cc-remote》：远端 claude + 本机工具的切分表、ssh 传输与 claude-agent-acp 的单处 patch、bun install/compile/link 与全平台 build、host 查找顺序与 CC_REMOTE_SSH 语义、cc-remote doctor、--cli auth login、Zed agent_servers 与 paseo agents.providers 配置及 paseo 插件、命令清单、权限模型（Read/Glob/Grep 不问、Accept edits 限会话目录、Bash 按命令前缀、危险 shell 语法永不自动批准、前缀批准持续到退出）、MCP 本地启动与重名优先级、OAuth token 目录、ControlMaster/ServerAlive 参数、会话镜像 ~/.claude/projects/、服务器工作夹路径、Windows PowerShell 与 ripgrep、test/e2e 的 fake ssh 均来自原文 | 原文没有任务质量、延迟或成本数据；只有 doctor（ssh + 版本）与 test/e2e fake ssh 两类检查；项目级 .claude/ 不下发、checkpoint/rewind 失效、LSP/Monitor/worktree 关闭为原文/调研结论；结论是 try 而非 adopt，不建议直接全面替换本地 Claude Code；最小试用与观察项为本手册提出 |
| X | 《shanselman/sandbox-mcp》：Windows Sandbox 开关命令、portable ZIP 与 `.sha256`、`sbx.cmd doctor`、`run`/`install-test`/`detonate`/`start`/`deploy`/`shot`/`stop`/`deps`、MCP 配置形状、skills/plugin 安装、报告与 `audit.jsonl`、`PROVISIONED` 标记、约 40–50 秒 GUI 样例、NativeProof 29.8 秒失败与 30.9 秒 provision 通过、安装器签名、七种配置兼容矩阵、build 26100.9882 基线来自 README/报告转述；作者仓库内实测，非独立第三方评测 | 仅 Windows 11 24H2+ Pro/Enterprise/Education；Home/Server 不支持；单沙箱、不支持并行；ARM64 未打包；不自带调度器；`deps` 保守静态扫描；provision 后不算干净机通过；原文 CLI 段落截断；无独立评测；小范围试用建议来自调研结论 |

二十四条做法都没有独立的“AI 是否让结果变好了”的对照评测或基准数据；A 是记账维度，F 是验收矩阵/成本公式，J 是退出码/probe/dry-run，K 是点名命令证据，M 是工具自检数据，N 是保活/读回能力，O 是侧栏状态与 tmux 布局同步，P 是线程续聊/日志/清理/权限行为与 fan-out 能力，Q 是运行可观测性/审批/断点恢复，R 是逐工具审批/哈希链审计/内核沙箱，S 是项目自带测试的独立验收与断网越界检查，T 是 AGENTS.md 清理规则与残留检查，U 是 micro-VM 隔离、密钥/网络/文件写入的签名记录与离线 verify，V 是 VM 隔离、凭证默认拒绝、宿主机零污染与可回滚性，W 是 doctor 连通/版本检查与 fake ssh 的本机端到端测试，X 是 Windows 干净机闭环的作者仓库实测记录（GUI 样例约 40–50 秒、NativeProof 失败后 provision 通过等）；均非独立基准。

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
- [dominikmartn/harp](../research/radar/2026-10-21/5344-dominikmartn-harp.md)：值得一试，值得在 macOS 上小范围试用 Harp，把多个 Claude Code / Codex 长任务并排跑，并用侧栏状态提示减少“哪个会话在等我”的切换成本；但它是非官方 Warp 分支、登录未测试、指标全靠自建，所以先按最小验证跑一轮再决定是否长期使用。
- [migasrias2/geckobox](../research/radar/2026-10-21/5610-migasrias2-geckobox.md)：值得一试，先在两三台机器上用 `openspaces` 小范围试跑只读诊断任务和单仓库修测试，验证线程恢复、日志、清理与权限行为之后，再扩展到多机并行；理由是 README 给出了可直接复制的安装、沙箱、凭据注入和多机 fan-out 命令与 SDK 片段，但它本身没有调度能力、codex/gemini/opencode 适配器未实机验证、且默认权限策略会自动放行文件编辑，不宜一次性铺开。
- [Show HN: Omnara – Open-source alternative to Claude Managed Agents](../research/radar/2026-10-22/5714-show-hn-omnara-open-source-alternative-to-claude-m.md)：值得一试，建议小范围试用：先用 Omnara Cloud 的 quickstart 跑通一个只读诊断代理，再选低风险 PR 审查或 SRE 排查任务与现有 Claude Code 流程做对照，重点验证远程托管、审批和断点恢复是否减少人工盯守。理由是 README 给出了可复制的配置、CLI/SDK 和自托管步骤，但缺少独立效果数据与成熟度证据，暂不宜全面 adopt。
- [bocoboho/wardendeck](../research/radar/2026-10-25/6882-bocoboho-wardendeck.md)：值得一试，建议小范围试：按 README 的 init→project create→feishu setup→serve 跑通一遍，把 WardenDeck 当作 Claude Code 的“审批闸门 + 沙箱 + 审计链”控制面，验证离开终端时也能安全派活；因其自标 prototype、执行端只有 Claude Code、内核沙箱仅 macOS，暂不直接写进手册。
- [Coding From the Himalayas With an Offline AI Agent](../research/radar/2026-10-28/7662-coding-from-the-himalayas-with-an-offline-ai-agent.md)：值得一试，先按文中步骤（OpenCode + Ollama + Qwen3.5 9B）在联网时完成一次安装和冒烟测试，再拿一个自带测试的小项目做离线修复试用，并用原始测试自行验收；之所以值得小范围试，是因为原文给出了可直接复制的命令、配置字段和离线连通性验证方法，但公开证据只有一次单行 bug 修复，还不足以直接 adopt。
- [@dotey: 避免 worktree 残留的最佳策略是在 AGENTS.md 里面添加规则，要求 worktree 不遗留，让 Agent 自己去清理。](../research/radar/2026-10-28/7828-worktree-agents-md-worktree-agent.md)：值得一试，建议小范围试用：在 AGENTS.md 中明确要求智能体完成任务后删除 worktree 及分支；原文给出了可照抄的规则雏形，但内容被截断且无验证数据，不宜直接 adopt。
- [Cygnux-Labs/Tracekit-box](../research/radar/2026-10-30/8511-cygnux-labs-tracekit-box.md)：值得一试，建议小范围试用：在一次性 Linux+KVM 主机或 GitHub Actions 中按 README 的 demo/action 跑一个修测试任务，导出 .tkb 并用固定 trust 文件离线验证；原因是步骤具体可复现，但项目仍是 v0、需自建 signer，默认只有 dev 级担保，不宜直接作为生产默认。
- [modem-dev/boxery](../research/radar/2026-11-03/9948-modem-dev-boxery.md)：值得一试，可以在 macOS 或 Linux 上小范围试用：按 README 的步骤安装 boxery host，用 Lima 或 libvirt 启动 VM，通过 MCP 把 VM 工具交给现有编程智能体（如 Claude Code），用来运行不受信任的代码、执行桌面操作和并行尝试，真实密钥保留在 host 上而不进入 VM。原因是原文给出了可直接照抄的安装命令、MCP 工具清单和默认拒绝、按需授权的凭证模型，属于少见的“任务供给 + 权限边界”完整闭环；但项目自标早期实验阶段、多个后端尚为实验性，因此还不宜作为手册主线直接采用。
- [AkaraChen/cc-remote](../research/radar/2026-11-07/11234-akarachen-cc-remote.md)：值得一试，可以在有一台常开服务器（已登录 claude）的前提下，按 README 的步骤搭一套 cc-remote 做小范围试用，把"模型/会话在远端、文件与 shell 在本机"当作一条可复用的部署与权限边界模板；但它有明确的已知限制（.claude/ 不下发、checkpoint/rewind 失效、LSP/worktree 关闭），不建议直接全面替换本地 Claude Code。
- [shanselman/sandbox-mcp](../research/radar/2026-11-07/11330-shanselman-sandbox-mcp.md)：值得一试，建议小范围试用：在符合 Windows 11 Pro/Enterprise 条件、且确有 Windows 桌面应用干净机验证需求的团队，先按 README 跑通 doctor 和内置样例，再接入编码智能体。原因是它给出了可复制的 CLI/MCP 配置、沙箱流程和证据链，但环境限制明显，当前只适合 Windows 桌面测试这一窄场景。
