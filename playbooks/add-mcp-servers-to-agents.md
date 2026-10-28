# 给代理接第三方工具包：先隔离试用、核对清单、再决定去留

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在不污染主力环境、不越过数据外发边界的前提下，把第三方 MCP、CLI、技能包或插件接给代理，用可观察对照决定继续、降级还是停止。
> 先试这一步：先选一个低风险真实任务做未接入基线，再把目标工具装进隔离环境，只跑一次冒烟并对照。
> 最近修订：2026-10-29

## 解决什么问题

把第三方工具以 MCP、CLI、技能包或插件形式接给代理时，常见供给方式是一句注册/安装命令就完事：能不能用、多出哪些工具、花了多少钱、数据发到哪里、和现有做法比是不是真的更好，全靠感觉。本章解决的是：怎么在不污染主力环境、不越过数据外发边界的前提下，完成接入、核对工具清单、冒烟测试和对照验证，并据证据决定「继续试」「只当思路参考」还是「停止」。现在覆盖 16 条工具路径：jevcrawl、REA/Hermes、arcmira、CLI-Anything/CLI-Hub、reason network、idx、Blender 扩展、jevreel、WhatsApp MCP、im-mcp、claude-security-scan、vulnerator-ai、TradingView-Unified-MCP、agent-toolkit-for-aws、flashmind、mcode-stack；做法 C 是不接入的降级做法。WhatsApp MCP、im-mcp 这两条私人消息路径有一个共同前提：先只读、只用自己的个人账号、只在一台机器上试；发送、多人共享、媒体转写都不在范围内。claude-security-scan 路径也要先只读、只对一个低风险域、确认脱敏和「未能确认」标注可靠后再扩大。vulnerator-ai 更极端：它是默认无 scope-guard、无 consent、无 audit、无授权闸门的自主渗透循环，只在隔离靶场、只对明确授权的目标试，先把它当「自主循环 + 工具供给」的架构模板，而不是当生产工具。TradingView-Unified-MCP 只验证「Claude Code 通过本地 MCP 接触外部数据平台」的接入动作；原文在启动命令后被截断、零效果证据，不能据此上真实资金。agent-toolkit-for-aws 则把 MCP 服务、Agent Skills、插件、项目级 rules 和审计控制打包给支持的编码 agent；先只装 aws-core，并在只读或沙箱权限下小范围试用，不要先放开写操作。flashmind 是另一类打包插件：它把 MCP 记忆、防幻觉规则和 4 个按需技能一起装进编码客户端，但原文只给了接线方式，规则正文与技能正文都缺失、也没有效果数据；先只选一个仓库、一个客户端，只启用 `verify-before-done` 一个技能，用两周对照决定去留。mcode-stack 是「技能/工作流包」：它把团队习惯做成 15 个 `SKILL.md` 技能、检查清单和 `WORKFLOW.md`，可装到 MiniMax Code，部分也可用于 Claude Code 和其他支持 skills 的代理；但本次只有 README，没有各技能正文，先只选 2–3 个技能，打开对应 `SKILL.md` 核对具体检查项后再决定是否照做。

## 适用与不适用

适用：
- 通用：本机有可用的 MCP 客户端或支持 skills 的代理；愿意在容器、虚拟机或专用账号里先跑第三方包；目标是让代理获得一整套外部工具或一类新能力；需要反复调用外部软件、需要可复现操作；愿意做「挂载 vs 未挂载」或「调用技能 vs 不调用技能」的对照。
- jevcrawl：站内多跳资料检索，答案埋在首页几跳之下，且目标站点不依赖 JavaScript 渲染。
- REA/Hermes：已有 Hermes CLI，想试一条 `npx` 拉起的 MCP 工具集；但原文只给一条命令、能力清单被截断，只适合试。
- arcmira：要在 YouTube 视频与直播转录里检索谁在什么时间说了什么、品牌赞助、谁在推荐某个实体；接受远程 MCP + 写程序调用；有付费计划与预算。
- CLI-Anything：要反复调用 GIMP、Blender、LibreOffice 等软件，愿意先装上游软件；或想让编码 agent 为内部工具生成 CLI。
- reason network：团队里每个人都在用 Reason CLI、成员都在同一个 Reason workspace，想让一个 session 直接问另一个 session。
- idx：目标就是印尼股市，或想照抄它的结构——「一份数据三种界面」、`mcp setup` 自动填绝对路径、统一 envelope 与退出码。
- Blender 扩展：Windows x64 + Blender 4.2+，想让 AI 在场景里做可回退操作，并要审批、取消、命名撤销与视口截图。
- jevreel：有一段本地或 URL 视频，要在里面找「某个瞬间在哪儿」；接受底层 Jev 图像能力仍是实验性、验证只基于单个测试视频。
- WhatsApp MCP：个人 WhatsApp 账号，只做只读检索、摘要、补看群聊、给未命名聊天补名；愿意在自己的 Cloudflare 付费 Workers 上部署；能接受非官方协议和违反 WhatsApp 条款的风险；一个部署只对应一个账号和一个 owner。
- im-mcp：Windows x64 或 macOS，微信 4.x / 钉钉 7.x，客户端已登录；要给 agent 补一段私有沟通上下文；只读检索；能接受本地数据库解密后明文落盘、强依赖客户端版本。
- claude-security-scan：已安装 Claude Code、git、bash；Python 3.11+；能访问 GitHub；想用一句自然语言或定时任务做跨 Mac 本体、本地 git 仓库、GitHub、Vercel/公开站点、AWS、GCP、Azure、Cloudflare、Supabase、Gmail 的只读例行检查；愿意按域准备只读登录；接受缺工具或权限时进入「未能确认」而不是「无问题」；想按重要度、领域、NEW 过滤报告。
- vulnerator-ai：已经能在隔离环境里接入单个 MCP 工具集；想在授权靶场上验证「模型自己决定下一步并直接执行」的 OODA 循环；有 docker、docker compose v2、openssl 与 OpenRouter key；能接受默认无 scope-guard、无 consent、无 audit、无授权闸门；目标已获书面授权，且能把 kali 容器与宿主机/内网隔开。
- TradingView-Unified-MCP：已装 Claude Code 与 Node.js；想验证「Claude Code 通过本地 MCP 进程接触外部数据平台」的接入形态；只做只读行情/图表查询，不接真实资金；愿意先读仓库 README 补齐注册、账号/订阅与权限要求。
- agent-toolkit-for-aws：团队在 AWS 上开发；使用 Claude Code、Codex、Cursor、Devin、Kiro、fx 或其他受支持的编码智能体；目标任务属于 AWS 构建、部署、管理、数据分析或 DevSecOps；本地已配置 AWS 账号凭据（仅做文档检索或技能发现不需要认证）；Kiro、fx 和其他 agent 的手动安装路径已装 `uv`；愿意先只装 aws-core，并在只读或沙箱账号下小范围试用。
- flashmind：使用 Gemini CLI / Antigravity / Cursor / VS Code(Copilot) / Windsurf / Claude Code 等支持 MCP 的客户端；Node ≥18；想让 agent 在任务开始回忆历史决策、写代码前核对符号与版本、宣布完成前跑测试并报告终端输出；愿意只选一个仓库、一个客户端、只启用 `verify-before-done` 一个技能做两周对照；能接受原文没有规则与技能正文、没有效果数据，需要自己补规则措辞并做对照。
- mcode-stack：已安装 MiniMax Code；若走 Claude Code 市场命令，已安装 Claude Code；本地有 git；想从长命令/后台任务审计、干净上下文独立评审、小评估实验这三个高频痛点开始；能接受本次只有 README、具体检查项要打开各 `SKILL.md`；愿意一次只装 2–3 个技能并保留不调用技能的对照会话。

不适用：
- 通用：不能隔离、必须直接在主力工作目录上试用；需要稳定可复现的生产接入；依赖被截断的完整工具清单来规划任务；需要量化效果数据但原文只有作者自述。
- jevcrawl：目标站点需要 JavaScript、需要登录、有付费墙/CAPTCHA；这些它都不做。
- arcmira：不想开账号、不想设预算；需要可删除的持续跟踪生命周期（monitor 只能 `paused`，不提供删除）。
- CLI-Anything：所选 harness 包装真实软件但你不想装上游软件；Windows 上没有 Git for Windows（含 `bash`/`cygpath`）或 WSL。
- reason network：团队不在 Reason workspace，或找不到第二个人配合；单人无法自测出「团队通信」的价值。
- idx：目标不是印尼股市；它领域窄，值得抄的是供给结构，不是行情本身。
- Blender 扩展：不在 Windows x64 / Blender 4.2+；把「Python 工具验证」当安全沙箱；需要量化效果证据。
- jevreel：需要成熟、有独立验证的图像理解能力；不装 FFmpeg、不用 Python 3.11+ 或不用 uv；需要向量检索式的跨大库存量查询。
- WhatsApp MCP：要发送消息、多人共享、媒体转写；用免费 Cloudflare 计划（README 要求 Workers Paid，免费计划未验证）；不能接受非官方协议与条款风险；希望一个部署服务多个账号或多个 owner。
- im-mcp：Linux（原文未提支持）；微信/钉钉版本不在支持表；Windows 没有管理员终端或微信未登录；macOS 4.1+ 没有 64 位 hex passphrase；不能接受本地解密明文落盘；需要 README 未给出的定时/事件触发实现；需要效果指标而只有兼容性验证表。
- claude-security-scan：需要攻击性测试（暴力、模糊测试）；需要 Google Workspace 整体管理设置（需 Admin API 委派，不在范围）；AWS 只默认东京和弗吉尼亚，其他区域需配置；不能接受第三方技能读取多账户敏感信息；要求有检出率、误报率或独立评测；不能先在隔离或低风险环境试；只依赖 README 的只读与脱敏设计而未经代码级验证。
- vulnerator-ai：对未授权目标、生产资产或客户环境；不能把 kali 容器与宿主机/内网隔开；需要审批闸门、审计日志或合规证据；需要准确率、耗时、成本基线或独立评测；只想接一个渗透工具而不想接整套四容器循环；把 MIT 许可当安全背书。
- TradingView-Unified-MCP：想照推文直接得到可运行交易机器人；需要策略、回测、风控或收益证据；不能先读 README 补齐 MCP 注册与账号/订阅要求；工具可能直接下单而无法限制为只读；需要把账号密码明文写进配置。
- agent-toolkit-for-aws：非 AWS 工作；使用 README 未支持的编码智能体且不愿手动配置 MCP 与 skills；不愿配置 AWS 凭据或只读/最小权限；需要独立效果数据、检出率、成功率或客户案例；需要 README 未给出的 IAM/CloudWatch/CloudTrail 配置样例、rules 内容或提示词模板；想直接放开写操作或生产账号；把官方 README 当独立评测。
- flashmind：需要现成的量化效果证据；不愿维护规则文件与记忆库；不能接受记忆污染风险；需要原文未提供的防幻觉规则正文或四个 `SKILL.md` 正文；客户端不支持 MCP；Node <18。
- mcode-stack：需要现成的量化效果数据或案例；不愿打开 `SKILL.md` 核对具体检查项；需要仓库提供定时/事件触发式自动工作流；MiniMax Code 版本不支持插件市场且只能走 `mcode plugin add` 从官方目录安装；想一次装整套 15 个技能。

## 前置条件

通用：
- 一个隔离环境：容器、虚拟机或专用账号，避免第三方工具直接接触主力工作目录。
- 到包分发源与目标服务的网络出口。
- 一个可回退的低风险真实任务，用来做冒烟测试和对照。

jevcrawl：TypeSafe Jev API key（付费，`jev-1.13.0` 输入 token 单价 $0.042/百万）；本机已装 uv；到 `api.typesafe.ai` 的网络出口；确认页面文本允许外发到 TypeSafe。

REA/Hermes：`hermes` 命令存在；Node.js/npx 可用；能访问 npm registry；在隔离环境执行。

arcmira：Arcmira 账号；MCP 宿主为 Claude Code / Codex / Claude Desktop / claude.ai / ChatGPT / Cursor / Gemini CLI 之一；付费计划与 on-demand 预算（README 只说 Plan limits apply，未给免费额度上限）；到 `https://mcp.arcmira.com/mcp` 与 `https://api.arcmira.com` 的网络出口。

CLI-Anything：Python 3.10+；若 harness 包装真实软件，先装该上游软件；meta-skill 需要支持 SKILL 的 agent；Claude Code 生成器需已装 Claude Code，Windows 需 Git for Windows 或 WSL；Cursor 需已装 Cursor 并 clone 仓库。

reason network：使用 Reason CLI 与 Reason workspace，团队其他成员也在同一个 workspace；每台机器上的 daemon、MCP server `reason-network` 与三个工具权限可用；网络可达（同 Wi-Fi 直连、iroh 跨公网、或中继兜底）；`~/.reason/network` 可用。各 session 要维护有意义的 title 和 todo。

idx：Node/npm，或 Rust 1.88+，或 Linux/macOS 直接跑 install.sh；Windows 无 npm 时从 releases 下载 `idx-<version>-x86_64-pc-windows-msvc.zip`；npm 12 需 `--allow-git=all`；支持 MCP 的客户端；只支持远程 URL 的产品需要 HTTPS 隧道；离线模式要求之前至少成功取过一次。

Blender 扩展：Windows x64、Blender 4.2+；从 Releases 下载 `mcp-for-blender-pro.zip`；支持 tool calling 的模型与 provider 凭证；资产工作流可能需要 Poly Haven / Sketchfab / Poly Pizza 的 key；使用 Studio 或外部客户端时保持 Blender 打开。

jevreel：Python 3.11+、FFmpeg 在 PATH；TypeSafe API key（无 key 时，不带时间线的索引、zoom、字幕和 query 仍可用）；插件方式需要 uv 与 FFmpeg，本地语音转写默认不含；视频为本地文件或 URL，或旁有 `.srt`/`.vtt` 字幕；自定义问题要写成 lens TOML。

WhatsApp MCP：Cloudflare 账户（README 要求 Workers Paid；免费计划未验证，作者建议删掉 `limits` 块并预期首次导入不稳定）；Node 20+；自己的手机和 WhatsApp 账号；只读个人账号；创建 `OAUTH_KV` 并把 id 填进 `wrangler.jsonc`；设置至少 12 字符的 `OWNER_PASSWORD`；可选 `PIN`（32+ 随机字符）开启调试路由。

im-mcp：Windows x64 或 macOS（Apple Silicon / Intel），原文未提 Linux；微信 4.x（实测 `4.1.15.13` Windows、`4.1.35.15` macOS ARM64、`4.1.15`(270115) macOS x86_64），兼容 3.9.x；钉钉 7.x（实测 `7.6.0.x`，另有 7.5.x / 7.0.x）；Windows 初始化需管理员终端且微信已登录（扫描 `Weixin.exe` 内存取密钥）；macOS 4.1+ 需 64 位 hex passphrase；已安装 uv；客户端支持 MCP 配置。默认落盘 `~/.wechat_mcp/`、`~/.dingtalk_mcp/`，可用 `--output` / `--output-dir` 改。

claude-security-scan：Claude Code、git、bash；Python 3.11+；能访问 GitHub。把仓库克隆到 `~/.claude/skills/security-scan`，并安装 gitleaks 与 osv-scanner（`scripts/install-tools.sh`，SHA256 验证）。按域准备只读登录：`gh auth login`、`vercel login`、`aws configure` 或 `aws sso login`、`gcloud auth login`（viewer）、`az login`（Reader）、`CLOUDFLARE_API_TOKEN` 只读、`supabase login`、`SUPABASE_ACCESS_TOKEN`、`gog auth add you@example.com`；命令里的 `...` 要换成自己的只读 token。无配置也能运行；需要限制范围时把 `config.example.toml` 复制到 `~/.config/security-scan/config.toml` 后编辑。AWS 默认只查东京 `ap-northeast-1` 和弗吉尼亚 `us-east-1`，其他区域要在 `[aws] regions` 中追加。报告保存在 `reports/<日時>/report.html`，本机权限 700，含弱点清单，注意共享。

vulnerator-ai：docker、docker compose v2、openssl；一个 OpenRouter API key；可隔离的靶场（安装器的 `--with-juice-shop` 起 OWASP Juice Shop，或自有授权靶机）；目标已获书面授权；能自己生成或让安装器生成 32 字节 hex token（`HERMES_API_SERVER_KEY`、`VULNERATOR_MCP_INBOUND_TOKEN`）；知道四个端口的角色：kali-mcp `:8900`、playwright-mcp `:8931`、Hermes `:8642`、vulnerator-mcp 内部 `:8700`。

TradingView-Unified-MCP：Claude Code 已安装并可正常对话；Node.js 运行时；能访问 GitHub 并下载解压仓库；终端在仓库根目录；按仓库 README 确认 TradingView 账号/订阅、是否需要 API 凭据、MCP 如何注册、`launch` 后进程是否常驻；只读凭据或只读权限；不接真实资金。

agent-toolkit-for-aws：AWS 账号及本地凭据（API 调用和脚本执行需要；仅文档检索或技能发现不需要）；使用 README 支持的编码智能体；Kiro、fx 和其他 agent 的手动安装路径需安装 `uv`；Claude Code 需默认已添加 `claude-plugins-official` marketplace；首次接入只装 `aws-core`，覆盖服务选择、CDK/CloudFormation、无服务器、容器、存储、可观测性、账单、SDK 使用和部署；按任务再加 `aws-agents`、`aws-data-analytics`、`aws-agents-for-devsecops`、`aws-startup-advisor`；先准备只读或最小权限策略，再逐步放开写操作；示例区域为 `us-west-2`，实际使用按自己的区域和权限调整。

flashmind：Node ≥18；git；目标客户端支持 MCP；自动安装器需要能安装 Engram 二进制；一个真实仓库和隔离分支/worktree；决定只保留一份 MCP 配置、一份规则文件、一份技能副本；对记忆库有清理纪律，知道信任前要用 `mem_review` 对照当前代码复核；知道原文没有给出 `AGENTS.md` / `GEMINI.md` 规则正文和 4 个 `SKILL.md` 正文。

mcode-stack：已安装 MiniMax Code；若走 Claude Code 市场命令需已安装 Claude Code；本地有 git；每个技能是一个包含 `SKILL.md` 的子目录；技能可放全局 `~/.agents/skills/`、`~/.claude/skills/`、`~/.codex/skills/` 或项目级 `.minimax/skills/`、`.claude/skills/`、`.agents/skills/`；整栈插件路径需要先跑 `mcode plugin marketplace list` 找到本地插件目录；`mcode plugin add` 只从官方目录安装，不接受 GitHub URL 或本地路径；MiniMax Code 桌面端市场安装功能在逐步开放，部分版本可能没有。

## 操作步骤

先做 A 或 D1：它们能在半天内给出可观察结论，也顺带把隔离环境、基线记录这套流程跑通。若目标就是私人消息只读检索，再考虑 J 或 K；不要从发送、多人共享或媒体转写开始。若你已有支持远程 MCP 的宿主且目标就是口语内容检索，直接做 E；团队已在 Reason 且找得到第二个人，可做 F；只想用最小成本看清「CLI 与 MCP 共用一份输出」的结构，做 G 的第 1、3、4 步；手上就有 Windows x64 + Blender 4.2+，做 H 的第 1–4 步；有一段本地短视频要检索，做 I 的第 1–3 步；有个人 WhatsApp 且接受条款风险，做 J 的 1–8 步；要在本机补微信/钉钉沟通上下文，做 K 的 1–6 步；想做跨系统的例行只读安全检查，做 L 的 1–8 步，先 `--demo`，再只对一个低风险域 `--skip repos`；想验证「自主循环 + 工具供给」这套架构，做 M 的 1–4 步，先在 `--with-juice-shop` 靶场里跑，确认前门只暴露 run 生命周期、且没有越出靶场，再考虑第 5 步以后；只想验证 Claude Code 接外部数据平台，做 N 的 1–6 步，先只读、不碰真实资金；团队在 AWS 上开发且使用支持的 agent，做 O 的 1–10 步，先只装 aws-core，在沙箱或只读权限下跑一个边界清晰任务；若你想给编码 agent 补记忆、防幻觉规则和「宣布完成前先验证」的技能，做 P 的 1–9 步，先只接 MCP + 规则 + `verify-before-done` 一个技能，两周对照，不要一次启用四个技能；若你想补一套可移植的工程习惯技能，做 Q 的 1–8 步，先只装 2–3 个技能并保留不调用技能的对照。

### 做法 A：接入有完整参数与回执的工具集（以 jevcrawl 为例）

1. 申请 key，确认外发边界。页面文本（段落、链接标签、URL）会被发送到 TypeSafe 打分。预期结果：拿到 key，并列出哪些站点不能碰。
2. 装成 Claude Code 的 MCP server：
```bash
claude mcp add jevcrawl -e TYPESAFE_API_KEY=<your key> -- uvx jevcrawl
```
3. 自检配置：
```bash
uvx jevcrawl doctor
```
预期结果：doctor 报告通路正常。
4. 用自然语言提示词验证通路：
```text
Use jevcrawl to find which Python version added the walrus operator, starting from docs.python.org
```
预期结果：代理自动调用 jevcrawl 并返回带出处的原文段落。
5. 或不走 MCP，直接用 CLI：
```bash
uv tool install jevcrawl
jevcrawl crawl https://docs.python.org/3/ --goal 'What does the walrus operator do?' --json
jevcrawl scrape https://example.com/help/returns --goal '...' --json
jevcrawl map https://example.com --goal '...' --limit 20
```
6. 用预算参数和回执字段核对每次调用：`max_pages`、`max_seconds`、`max_decision_usd`、`return_tokens` 限定每次调用；用 `stopped_because`、`stats.degraded`、`stats.needs_js_urls`、`jev_cost_usd` 判断是找到答案、撞上限还是降级。连续三次 Jev 请求失败后爬取转为广度优先，所有 block 以未打分形式放进 `uncertain`，不要把降级结果当成打分结果。

### 做法 B：接入只有一条命令、清单不完整的工具集（以 REA 接入 Hermes 为例）

1. 在隔离环境确认 `hermes` 命令存在、`npx` 可用、能访问 npm registry。
2. 注册：
```bash
hermes mcp add rea --command npx --args -y rea-agents@6.3.0 mcp
```
3. 核对注册与工具清单。原文没有给出查看已注册 MCP 服务器或工具列表的命令，需查 Hermes 文档补上；记录 `rea` 是否存在、实际工具数量和名称。作者声称有 139 个工具，这个数量未验证。
4. 做低风险冒烟测试：在 Hermes 会话里提一个需要外部工具的自然语言请求，观察代理会不会自动选中 rea 工具。
5. 与未挂载时做对照：同一任务，不挂载 rea 再跑一次，比较能否自主选用工具、人工干预、步骤数和耗时。

### 做法 C：不实际接入，只当作「用 MCP 批量接工具」的思路参考

当注册失败、注册后工具无法被代理实际调用、无法提供隔离环境、或需要完整工具清单和失败排查步骤而原文没有时，选做法 C。只记录设计点：MCP 批量供给、远程 MCP 只暴露少量工具让模型写程序、团队 agent 三工具接口（`list_team` / `send_message` / `check_inbox`）、CLI 与 MCP 共用一份 JSON envelope 并把退出码带进工具错误、零嵌入视频检索的类型化回答 + contact sheet + 全分辨率复核、MCP server 与可视化工作区一起长在宿主软件内部并用审批与命名撤销兜底、前门只暴露 run 生命周期而不暴露原始执行工具。

### 做法 D：用 CLI-Anything / CLI-Hub 把软件包成 agent-native CLI

选 D 当你要反复调用外部软件、需要可复现操作，而且目标软件有现成 harness 或愿意让编码 agent 生成。先做 D1。
#### D1：直接用现成 CLI
```bash
pip install cli-anything-hub
cli-hub list
cli-hub search image
cli-hub info gimp
cli-hub install gimp
cli-hub launch gimp
```
跑通一条真实重复任务，并记录与不用 CLI 时的差异。
#### D2：让 agent 自己发现并安装 CLI
```bash
npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
```
```text
Find appropriate CLI software in CLI-Hub and complete the task: ...
```
#### D3：用 Claude Code 生成新 CLI
```bash
/plugin marketplace add HKUDS/CLI-Anything
/plugin install cli-anything
/cli-anything ./gimp
/cli-anything:refine ./gimp
```
排错顺序：先 `/reload-plugins`；再 `/help cli-anything`；旧版不识别 `/cli-anything` 时改用 `/cli-anything:cli-anything`。

### 做法 E：接入远程 MCP，用「写程序」的方式调用（以 arcmira 为例）

1. 标准路径：用宿主登录（OAuth）添加远程 MCP，无 key：
```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp
codex mcp add arcmira --url https://mcp.arcmira.com/mcp
```
2. 连上后先调用 `arcmira_describe` 拿参考手册，别猜方法签名。
3. 遵守 id 规则：先用 `resolve` 拿 id，再用 id 查询。过滤器只接受原样 id；把名字当 id 会抛 `id_required`。
4. 需要整段转录时用 Premium 质量，并处理「还没转好」：未就绪时返回 `202` + `Retry-After`，按它重读不重复计费；`failed` / `refunded` 除非传 `retry: true` 不会重开。
5. 先查价再跑贵操作：`arcmira.quote(video)` 返回整段 Premium 读取会用多少 credits，本身不计费。预算由 dashboard 控制，工具本身不接受金额参数。
6. 用示例提示词快速验证接通：Which brands sponsor both TBPN and the All-In Podcast? / Find a moment on TBPN from the last 90 days where someone talks about stablecoins, and quote it.
7. 要持续盯着就建 monitor（必须走 `arcmira_execute_write`）；它不提供删除，退出方式是 `paused`。

### 做法 F：把团队里各人的 agent session 连成一张网（以 reason network 为例）

1. 初始化本机 agent 接线：
```sh
reason network
```
2. 看谁在线：
```sh
reason network who
```
3. 直接向某个 session 提问并等回答：
```sh
reason network alice/api-claude 'did the token format change?'
```
4. 只发不等：
```sh
reason network send alice/api-claude 'heads up: main is red'
```
5. MCP server 名为 `reason-network`，对 agent 暴露 `list_team`、`send_message`、`check_inbox` 三个工具。
6. 最小试用：找 2 名已经在用 Reason 的同事，各自开 Claude Code session，分别跑 `reason network who` 互相确认；A 用 `reason network <b的session> '...'` 提一个只有 B 的 agent 凭会话上下文才能回答的问题。

### 做法 G：接入「现成 CLI 自带 MCP server」的工具（以 idx / ihsg-cli 为例）

1. 零安装先跑通：
```sh
npx github:fzn0x/idx stocks quote BBCA
```
2. 正式安装（四选一）：
```sh
cargo install ihsg-cli
npm install -g github:fzn0x/idx
curl -fsSL https://raw.githubusercontent.com/fzn0x/idx/main/install.sh | sh
```
3. 先用 JSON 模式核对输出契约：
```sh
idx -o json stocks quote BBCA
```
stdout 只放一个 JSON 文档，其余走 stderr；来源没返回的字段是 `null`，不做估算。退出码：`0` 正常、`2` 用法错、`3` 网络/来源错、`4` 未找到、`5` 离线缓存未命中、`6` 配置错。
4. 启动 MCP server 并注册：
```sh
idx mcp
idx mcp setup codex
claude mcp add --scope user idx -- idx mcp
```
`idx mcp setup <client>` 会把二进制绝对路径填进配置，因为 GUI 应用通常不继承 shell 的 `PATH`。
5. 接好后跑一条真实任务，再不挂 MCP 用原方式做同一件事，比较调用次数、人工步骤、耗时、工具选择是否正确。

### 做法 H：把 AI 助手接进宿主软件内部（以 Blender 扩展 mcp-for-blender-pro 为例）

1. 在 Windows x64 + Blender 4.2+ 中，从 Releases 下载 `mcp-for-blender-pro.zip`；`Edit → Preferences → Get Extensions → menu → Install from Disk`，选中 ZIP，启用 mcp-for-blender-pro。
2. 打开 3D Viewport → N → MCP Pro，配置 provider 与模型；必须选支持 tool calling 的模型；要解读视口截图还需模型有图像能力。
3. 先用单助手跑通，按 README 提示词依次跑：
```text
Inspect this scene and explain its object structure before making any changes.
```
```text
Create a simple product-display scene with a pedestal, a camera and three lights. Give the pedestal a matte blue material.
```
观察审批、取消、命名撤销与 `viewport_screenshot` 是否按预期出现。
4. 核对 21 个工具；其中 `execute_code`、`export_scene`、`import_asset` 是高影响操作。
5. 多步任务再换 Manager/Worker/Reviewer 团队链做同一件事，比较单助手与团队链的耗时、人工接管次数、Reviewer 退回次数。

### 做法 I：把视频检索接给 agent（以 jevreel 为例）

1. 装 CLI 并配置 key：
```bash
uv tool install 'jevreel[all]'
export TYPESAFE_API_KEY=...
```
2. 索引、提问、放大看：
```bash
jevreel index talk.mp4
jevreel ask talk 'a slide with a bar chart'
jevreel zoom talk 12:00 12:10
```
3. 接到 agent（插件 / 手动 MCP / skill 任选）：
```bash
claude plugin marketplace add DeepAleph/jevreel
claude plugin install jevreel@jevreel
claude mcp add jevreel -e TYPESAFE_API_KEY=your-key -- uvx --from 'jevreel[all]' jevreel mcp
```
4. 成本自测：`jevreel measure <video>` 报告某个网格尺寸下一张 contact sheet 在你账号上的成本。四步工作流：Index → Screen → Verify → Look closer。

### 做法 J：只读 WhatsApp MCP（Cloudflare 自部署）

1. 准备 Cloudflare 付费 Workers、Node 20+、自己的手机和 WhatsApp 账号。
2. 克隆并安装依赖：
```sh
git clone https://github.com/finereli/whatsapp-mcp
cd whatsapp-mcp
npm install
```
3. 创建 OAuth KV 命名空间，把打印出的 id 填进 `wrangler.jsonc`：
```sh
npx wrangler kv namespace create OAUTH_KV
```
4. 设置 owner 密码（至少 12 个字符）：
```sh
npx wrangler secret put OWNER_PASSWORD
```
5. 部署：
```sh
npm run deploy
```
6. 打开部署 URL，扫码链接 WhatsApp；首次链接会导入历史。
7. 接入 MCP 客户端：
```sh
claude mcp add --transport http whatsapp https://your-url/mcp
```
8. 只调用只读工具：`list_chats`、`get_messages`、`search_messages`、`unnamed_chats`、`set_contact_names`、`sync_now`、`link_status`、`relink`。不要用来发送消息或多人共用。

### 做法 K：本地只读微信/钉钉检索（以 im-mcp 为例）

1. 确认前置条件：Windows 初始化需管理员终端且微信已登录；macOS 4.1+ 需 64 位 hex passphrase；已安装 uv；客户端支持 MCP 配置。
2. 安装：
```bash
uv tool install 'git+https://github.com/stkoecn/im-mcp.git' --with 'im-mcp[all]'
```
3. 一次性初始化：
```bash
wechat-init
dingtalk-init
```
4. 接入 AI 客户端：方案 A 用 `uvx` 即席运行；方案 B 命令在 PATH 中时直接写 `wechat-mcp` / `dingtalk-mcp`。
5. 给 agent 装配套技能文档：
```bash
mkdir -p ~/.agents/skills/im-mcp && cp skills/im-mcp/SKILL.md ~/.agents/skills/im-mcp/
```
6. 用完即清：先完全退出 AI 客户端，再：
```bash
im-clean --dry-run
im-clean
uv tool uninstall im-mcp
```

### 做法 L：把例行只读安全检查交给 agent（以 claude-security-scan 为例）

1. 克隆技能并安装工具：
```bash
git clone https://github.com/chaenmasahiro0425/claude-security-scan ~/.claude/skills/security-scan
bash ~/.claude/skills/security-scan/scripts/install-tools.sh
```
2. 按需准备各域只读登录；缺什么会在报告里标为未确认。
3. 先用示例数据确认安装和报告样式：
```bash
python3 ~/.claude/skills/security-scan/scan.py --demo --open
```
4. 只对一个低风险域跑真实扫描，先去掉较重的本地仓库代码检查：
```bash
python3 ~/.claude/skills/security-scan/scan.py --skip repos
```
预期结果：生成 `reports/<日時>/report.html`；失败或未登录的域进入「未能确认的项目」，而不是被当成「没有问题」；报告中没有明文秘密值。
5. 在 Claude Code 里用自然语言触发和追问：
```text
セキュリティチェックして
前回から新しく出たリスクだけ教えて
```
6. 确认只读边界成立后再逐域增加登录，最后才考虑全量扫描和每周定时。

### 做法 M：把「自主循环 + 工具供给」整套接进来，但只当模板（以 vulnerator-ai 为例）

1. 确认前提：docker、docker compose v2、openssl；一个 OpenRouter API key；能把 kali 容器与宿主机/内网隔开的环境；目标已获书面授权。缺任何一条都不要往下做。
2. 用安装器一键起栈：
```sh
./install.sh
```
参数：`--with-juice-shop`（同时启动 OWASP Juice Shop 练习靶场）、`--no-up`（只写 `.env` 不起容器）、`--force`（覆盖已有 `.env`）。
3. 先确认控制面：前门 vulnerator-mcp（内部 `:8700`）只应暴露 6 个 run 生命周期工具——`health()`、`start_pentest`、`get_run_status`、`stream_run_events`、`steer_run`、`stop_run`。确认它拿不到原始 `kali_run`，也不能直接打 `/v1/chat/completions`。
4. 先只在 TUI 里跑靶场，不注册到任何助手：
```sh
docker compose exec -it ooda-agent hermes chat
```
5. 做对照试验：同一靶场、同一目标，先人工按 checklist 跑一遍并记录命令序列、发现数、误报数、耗时；再用 agent 跑一轮同样的目标，比较发现数、误报数、重复命令比例、`steer_run` 干预次数、`stop_run` 是否真的停、耗时。
6. 扩到真实目标前先答三个问题：这一轮有没有人逐条复核 agent 发出的每条命令？kali 容器和宿主机/内网隔开了吗？有没有超出授权范围的动作？任何一条不确定，就停在靶场，把它降级为 study。

### 做法 N：把 Claude Code 接到外部数据平台（以 TradingView-Unified-MCP 为例）

1. 安装并打开 Claude Code。
2. 下载并解压 TradingView-Unified-MCP 仓库；本机有 Node.js 运行时。
3. 先读仓库 README，补齐原文没写的注册与权限要求。
4. 在解压后的仓库根目录启动 MCP 服务：
```bash
node src/cli.mjs launch
```
5. 回到 Claude Code 检查 MCP server 是否被识别、工具数是否可枚举、每个工具的名称与参数。
6. 只读冒烟：让 Claude 取某标的行情/图表数据，与 TradingView 网页端人工核对 3–5 次；记录一次完整问答的耗时和偏差。不要用盈亏评估这一轮。

### 做法 O：给编码 agent 接 AWS，先只装 aws-core 并在只读权限下小范围试用（以 agent-toolkit-for-aws 为例）

1. 确认前提：目标任务属于 AWS；使用 README 支持的编码智能体；API 调用和脚本执行需要本地已配置 AWS 账号凭据；仅做文档检索或技能发现不需要认证；Kiro、fx 和其他 agent 的手动安装路径要求本机安装 `uv`。首次接入只装 `aws-core`。
2. Claude Code：
```text
/plugin install aws-core@claude-plugins-official
```
若提示 Plugin not found，先 `/plugin marketplace update claude-plugins-official`。
3. Codex：
```text
codex plugin marketplace add aws/agent-toolkit-for-aws
```
启动 Codex 后运行 `/plugins`，浏览并安装 `aws-core`。
4. Cursor：Settings → Plugins → Team Marketplaces → Add Marketplace → Import from Repo，指向 `aws/agent-toolkit-for-aws`；再在 Plugins 面板安装 `aws-core`。
5. Kiro/fx/其他 agent：手动配置 AWS MCP Server 并另装 skills：
```text
npx skills add aws/agent-toolkit-for-aws/skills
```
6. 先设权限和审计，再放开写操作。README 说明该工具链提供 IAM 条件键区分 agent 动作与人类动作、CloudWatch 指标和 CloudTrail 审计日志；可据此先配置只读或最小权限策略，再逐步放开。
7. 最小试用：选一个 AWS 仓库和一个边界清晰的任务，只安装 `aws-core`，在沙箱账号或只读权限下运行；先跑未装基线，再跑装后同任务，记录完成、耗时、CloudWatch/CloudTrail 是否能看到动作、权限边界是否成立。

### 做法 P：给编码 agent 接打包插件，先只启用「宣布完成前先验证」一个技能（以 flashmind 为例）

1. 确认前提：Node ≥18；目标客户端支持 MCP；本机有 git；选一个真实仓库和隔离分支/worktree；记录试用前基线。
2. 最轻路径：只接 MCP 服务。在客户端 MCP 配置中加入 `flashmind`，`command` 用 `npx`，`args` 用 `-y`、`flashmind`。
3. 要记忆 + 技能 + 规则全套，跑自动安装器：
```bash
git clone https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent flashmind
cd flashmind
./install.sh antigravity-cli
```
安装后必须打开实际文件核对；原文没有给出规则与技能正文。
4. 只启用 `verify-before-done` 一个技能，暂不启用其余三个：`plan-first`、`no-invented-code`、`systematic-debugging`。
5. 更新时只替换、不追加：一个服务一个条目；规则文件整体覆盖，共享文件用标记包裹后只替换标记之间内容；技能只留一份。
6. 最小试用两周：选一个真实仓库、只选一个客户端，只装 MCP 记忆 + 规则文件 + `verify-before-done` 一个技能；记录「未跑测试就宣布已修复」「引入不存在的包/函数/CLI 参数」两类事件计数、返工时长、测试通过率，与试用前同仓库同类型任务对照。

### 做法 Q：先只装 2–3 个「工程习惯」技能，用真实任务对照（以 MiniMax-AI/mcode-stack 为例）

注意证据等级：本次只有 README，没有各 `SKILL.md`、`checklists/`、`WORKFLOW.md` 正文，也没有使用前后对比、缺陷率、节省时间或采用率数据；能照抄的是安装/调用方式和技能清单，具体检查项要打开目标技能目录里的 `SKILL.md` 再决定是否照做。建议从 `long-command-check`、`independent-review`、`harness-experiment` 三个开始，不要一次装整套 15 个。

1. 确认前提：已安装 MiniMax Code；若走 Claude Code 市场命令，已安装 Claude Code；本地有 git；选一个真实仓库或任务；记录不调用技能时的基线（长命令阻塞/重试、评审漏检、实验重复运行的波动等）。预期结果：明确只选 2–3 个技能，并保留一个不调用技能的对照会话。
2. 安装单个技能（所有项目可用）：
```bash
git clone https://github.com/MiniMax-AI/mcode-stack.git ~/mcode-stack
mkdir -p ~/.agents/skills
cp -R ~/mcode-stack/stacks/ronny/skills/long-command-check ~/.agents/skills/
```
把 `long-command-check` 换成 `independent-review`、`harness-experiment` 等技能名可装其他技能。也可把技能放到项目级 `.minimax/skills/`、`.claude/skills/` 或 `.agents/skills/`；全局还会读取 `~/.claude/skills/`、`~/.codex/skills/`。预期结果：目标目录下出现包含 `SKILL.md` 的技能子目录。
3. 在新会话中查看并调用：
```text
/skills
/long-command-check
```
也可以不手动调用，让代理根据技能描述自行加载。把 `long-command-check` 换成其他技能名即可调用对应技能。预期结果：`/skills` 能列出已装技能；调用后代理按该技能执行。
4. 安装整栈为本地插件（可选，先不要一次启用全部）：先看本地插件目录：
```bash
mcode plugin marketplace list
```
把 `stacks/ronny` 整个目录复制到该命令显示的本地插件目录，然后在 MiniMax Code 打开 `/plugins`，按 `Ctrl+R` 刷新；在面板中按空格启用或禁用。注意 README 说明：`mcode plugin add` 只从官方目录安装，不接受 GitHub URL 或本地路径。预期结果：插件面板出现该 stack，可按需启用/禁用，而不是全部默认启用。
5. 从市场安装（MiniMax Code 桌面端，可选）：打开 Plugins，选择 Add marketplace，输入 `MiniMax-AI/mcode-stack`；每个 stack 会显示为一个可安装/更新/卸载的插件。README 说明该功能在逐步开放，部分版本可能还没有。预期结果：市场里能看到 stack；若版本没有该功能，回到第 2 步或第 4 步。
6. 在 Claude Code 中安装同一目录（可选）：
```bash
/plugin marketplace add MiniMax-AI/mcode-stack
/plugin install ronny@mcode-stack
```
预期结果：Claude Code 里出现该市场与插件；再用 `/skills` 或技能名调用。
7. 打开你选中的技能正文再照做：本次材料只有 README，没有 `SKILL.md` 正文；先打开 `~/mcode-stack/stacks/ronny/skills/<skill>/SKILL.md`，核对具体检查项、输入条件和停止条件。检查清单也可直接读 `checklists/` 下的纯文本；工作流读对应 stack 的 `WORKFLOW.md`。预期结果：你能复述该技能要求先做什么、检查什么、什么时候停；不能复述就先不要把它写进团队流程。
8. 最小试用：选 2–3 个与当前痛点最直接的技能，优先组合 `long-command-check` + `independent-review` + `harness-experiment`；在真实任务中调用，同时保留一个不调用技能的对照会话。记录：技能是否被正确发现、`/skills` 是否列出、调用后是否按预期执行；长命令阻塞/人工中断/重试/后台任务失败或丢失/等待时间（前后各 5–10 次长命令任务）；同一 diff 的干净上下文评审发现的问题数、其中普通评审漏掉的问题数、无效评论数、评审耗时；同一评估任务重复运行的通过率波动、翻转任务数量、一次只改一项时能否定位变化来源；团队是否愿意持续调用、是否减少返工或评审往返。预期结果：与不调用技能的对照相比，至少一个目标指标改善且没有明显负作用；若只有安装成功、没有可观察任务结果改善，就停在 try，不要升级为 adopt。

## 怎么判断变好了

可观察指标：
- 通路：`uvx jevcrawl doctor` 是否报通路正常；`rea` 是否出现在 Hermes 服务器列表；CLI-Hub 的 `cli-hub info/install/launch` 是否成功；`arcmira_describe` 是否返回方法表与版本行；`reason network who` 是否稳定列出对方 session 及当前任务；`idx mcp setup <client>` 是否打印绝对路径、客户端里 `idx` 是否出现且工具数可枚举；Blender 扩展是否能打开 MCP Pro 面板、选中支持 tool calling 的模型、跑通「检查场景 → 建对象 → 复制排列」；jevreel 是否 `index` 打印 video id、`ask` 返回时间/概率/帧、`zoom` 取到全分辨率帧；WhatsApp MCP 的 `/debug` 是否为 `phase: idle` 且 `paired: true`；im-mcp 的 `wechat-init` / `dingtalk-init` 是否成功；claude-security-scan 的 `--demo --open` 能否打开示例报告、`--skip repos` 能否生成 `reports/<日時>/report.html`；vulnerator-ai 的 `docker compose ps` 是否四容器健康、前门是否只暴露 6 个 run 生命周期工具；TradingView MCP 是否 `node src/cli.mjs launch` 无报错、Claude Code 是否识别 server 与工具列表；agent-toolkit-for-aws 是否装出 aws-core 插件、skills 是否可见、MCP Server 是否被客户端识别；flashmind 客户端里是否出现 `flashmind` MCP 服务、规则文件是否落到对应路径、技能是否只有一份副本；mcode-stack 的 `/skills` 是否列出已装技能、`/<skill-name>` 调用后是否按技能执行。
- 工具清单：注册后必须去客户端确认工具真的出现、数量可枚举；不能把「注册成功」当「验证完成」。
- 任务效果：同一组真实任务，挂载 vs 未挂载/人工，比较任务完成率、答案正确性、漏掉已知消息数、人工步骤数、耗时、工具报错次数。vulnerator-ai 另有：发现数与人工 checklist 的比值、误报数、重复命令比例、`steer_run` 干预次数、`stop_run` 后是否真的停止。TradingView 路径只比只读问答。agent-toolkit-for-aws 比较同一 AWS 任务未装 vs 只装 aws-core：完成情况、耗时、调用到的 AWS API、CloudTrail 审计是否可见、IAM 条件键是否区分 agent 与人类动作。flashmind 比较同一仓库、同一类任务试用前后两类幻觉事件计数、返工时长、测试通过率。mcode-stack 比较调用技能 vs 不调用技能：长命令阻塞/人工中断/重试/后台任务失败或丢失/等待时间；同一 diff 的干净上下文评审发现的问题数、普通评审漏掉的问题数、无效评论数、评审耗时；同一评估任务重复运行的通过率波动、翻转任务数量、一次只改一项时能否定位变化来源；团队是否愿意持续调用、返工或评审往返是否减少。
- 成本与停止原因：jevcrawl 看 `jev_cost_usd`、`stopped_because`、`degraded`、`needs_js_urls`；arcmira 看 `quote` 预估与实际消耗、错误码是否可按 `code` 分支；jevreel 看 `jevreel measure` 与实际计费、重复 `ask` 是否 0 请求 0 成本、`query` 是否不产生请求。
- 安全负向指标：是否出现越权访问、读取工作目录之外文件、执行非预期命令；Blender 侧看 `execute_code` 是否超出预期；jevreel 侧确认视频帧与问题允许外发到 TypeSafe；WhatsApp MCP 侧确认没有发送消息、没有多人共享；im-mcp 侧确认只读、明文数据库已按需清理；claude-security-scan 侧确认没有明文秘密、没有对测试仓库/账号产生写入或发送、报告权限 700；vulnerator-ai 侧确认没有越出靶场或授权范围的动作、前门没有暴露原始 `kali_run`；TradingView 侧确认没有接真实账户、没有下单；agent-toolkit-for-aws 侧确认先只读/最小权限、CloudTrail 能看到 agent 动作；flashmind 侧确认规则文件与技能只有一份、记忆库没有存进未经核实的结论；mcode-stack 侧确认技能只从可信仓库安装、没有把密钥写进技能目录或日志。

对照试验设计：所有系统从同一入口、同样预算、同一个问题出发，抓到的内容交给同一个回答 LLM，由同一个 judge 打分，只让被试工具这个变量变。没有对比性指标的工具，先用流程内建测试和真实重复任务做前后对照。vulnerator-ai 的对照要额外固定靶场和目标。TradingView 接入的对照只比接入与只读查询。agent-toolkit-for-aws 的对照要固定 AWS 账号/沙箱、区域和任务。flashmind 的对照要固定仓库、客户端和任务类型。mcode-stack 的对照要固定仓库、任务类型和技能组合，只比较调用技能与不调用技能；不要同时装整套 15 个技能。

可参考的作者自测数据（非独立验证）：
- jevcrawl：50 个 WebWalkerQA 任务答对 40%、找到答案页 54%、$0.025/任务；与 Crawl4AI 0.9.4 的 20 任务对照答案页 10 vs 5；docs.python.org 示例 80,034 tokens 压到 1,873 tokens。
- CLI-Anything README 自报：2,461 个测试通过、pytest 100%；无第三方复现。
- reason network：README 没有效果数据、指标或案例；仓库 33 stars。
- idx：未见效果数据、性能数字或对比指标；正文在第 9 步后被截断。
- Blender 扩展：705 stars；没有用户案例、成功率、耗时对比或基准数据。
- jevreel：作者自测成本与暂停菜单对照；底层 Jev 图像能力仍是实验性，验证只基于单个测试视频。
- WhatsApp MCP：HN 35 points 只说明关注度；作者只在一个真实账号上跑过；没有业务效果指标。
- im-mcp：只有兼容性验证表，没有效果指标或对照数据；「毫秒级响应」为作者声称。
- claude-security-scan：32 stars；没有检出率、误报率、真实用户案例或独立评测；只读与脱敏设计尚未经过代码级验证。
- vulnerator-ai：没有准确率、耗时、成本或对比基线；默认无 scope-guard、无 consent、无 audit、无授权闸门。
- TradingView-Unified-MCP：零效果证据；互动量只说明关注度；原文在启动命令后截断。
- agent-toolkit-for-aws：官方 README；约 3196 stars 只是关注度；没有独立测评、客户案例或 skills 端到端指标。
- flashmind：31 stars；没有防幻觉规则正文、没有 4 个 `SKILL.md` 正文、没有基准或前后对比；能照抄的是接线方式。
- mcode-stack：README 列出 15 个技能，有 MIT、GitHub Actions `validate` 徽章和配套文章；作者称团队每天实际使用，但本次没有使用前后对比、缺陷率、节省时间、采用率等量化数据，也没有真实案例细节；只有 README，没有各 `SKILL.md`、`checklists/`、`WORKFLOW.md` 正文。

最小试用方式与试多久：
- jevcrawl：半天内完成。准备一个答案埋在首页几跳之下、站点不依赖 JS 的真实问题；先跑现有方式，再接 jevcrawl 跑同一个问题，交给同一个评审对照打分。
- REA：以完成一轮「注册 → 枚举 → 冒烟 → 对照」为准，原文没有时间或次数建议。
- CLI-Anything：以跑通一条真实重复任务并留下一组对照为准。
- arcmira：以「示例提示词跑通 + `resolve` 路径走通 + `quote` 预估与实际对得上」为一轮。
- reason network：以 2 人配合跑通一轮 who → 问答 → send → 离线补发为准。
- idx：以「零安装跑通 → JSON 契约核对 → MCP 注册 → agent 一次调用 → 离线一次」为一轮。
- Blender 扩展：以「单助手四条提示词跑通 + 团队链把同一任务重做一次」为一轮。
- jevreel：以「index → ask → zoom 跑通 + 一次插件/MCP 接入 + 一次 lens 过滤」为一轮。
- WhatsApp MCP：以「部署 → 链接个人账号 → 只读搜索/摘要/补名 → 与人工完成同一组任务对照」为一轮。
- im-mcp：以「初始化 → 客户端接入 → 3–5 个真实只读任务 → 与人工对照 → 清理」为一轮。
- claude-security-scan：先 `--demo`；再只登录一个低风险域，用 `--skip repos` 跑一次；确认报告生成、失败项进入「未能确认」、没有明文秘密、没有写入/发送后，再逐域增加登录；连续两周记录 NEW 项和人工复核结果。
- vulnerator-ai：以「`--with-juice-shop` 起栈 → 四容器健康 → TUI 里跑一轮靶场 → 前门 6 个工具各走一次 → 与人工 checklist 对照」为一轮；至少跑两轮再决定是否扩大。
- TradingView-Unified-MCP：半天内完成只读接入实验；连续启动/调用 10 次记录失败次数；不要用盈亏评估这一轮。
- agent-toolkit-for-aws：先选一个 AWS 仓库和一个边界清晰任务，只装 aws-core，在沙箱账号或只读权限下做一轮；先跑未装基线，再跑装后同任务，记录完成、耗时、CloudTrail 审计、权限边界。
- flashmind：两周。选一个真实仓库、只选一个客户端，只装 MCP 记忆 + 规则文件 + `verify-before-done` 一个技能；记录两类幻觉事件计数、返工时长、记忆库过期比例、测试通过率，与试用前对照。
- mcode-stack：建议 2–3 个技能，不要一次装整套；优先 `long-command-check` + `independent-review` + `harness-experiment`；装到 `~/.agents/skills/`，新开会话用 `/skills` 确认可见，再在真实任务中调用；同时保留一个不调用技能的对照会话；先打开对应 `SKILL.md` 核对具体检查项。原文没给试多久，按前后各 5–10 次长命令任务、同一 diff 对照评审、同一评估任务重复运行来收数；没有可观察改善就停在 try。

在得到明确正负结果前，不要扩展到长期使用或生产环境。

## 常见坑

- 把「注册成功」当成「验证完成」。REA 原文没有 list/枚举命令，要查 Hermes 文档补上；jevcrawl 至少还有 `uvx jevcrawl doctor`；arcmira 至少还有 `arcmira_describe`；reason network 至少还有 `reason network who`；idx 至少还要去客户端确认 `idx` 出现、工具数可枚举；Blender 扩展至少还要跑一遍「检查场景 → 建对象 → 复制排列」；jevreel 至少还要 `ask` 真问一次、`zoom` 真看一次；WhatsApp MCP 至少还要看 `/debug` 的 `paired` 与 `last_pull`；im-mcp 至少还要初始化成功、客户端真调一次检索工具；claude-security-scan 至少还要 `--demo` 打开报告、再只对一个低风险域 `--skip repos` 跑一次并人工复核；vulnerator-ai 至少还要四容器健康、前门 6 个工具各走一次、`stop_run` 真能停；TradingView MCP 至少还要看到 server 被识别、工具列表可枚举；agent-toolkit-for-aws 至少还要看到 aws-core 插件、skills 和 MCP Server 在客户端出现；flashmind 至少还要看到 `flashmind` MCP 服务、规则文件落到正确路径、技能只有一份副本；mcode-stack 至少还要 `/skills` 列出技能、在真实任务中调用一次并保留对照。
- 把名字当 id 传。arcmira 的过滤器只接受原样 id，传名字会在发网络请求前抛 `id_required`；必须先 `resolve`。
- 连上就开始猜方法签名。先调 `arcmira_describe`，把 id 规则、参数与返回字段、计量规则、错误码一次读全。
- 不看清计量规则就批量跑。arcmira 搜索按超出前 5 条的每条 passage 收 4 credits；Premium 转录每开始 15 分钟收 300 credits；贵操作前先 `arcmira.quote`。
- 以为 arcmira 工具有预算参数。预算在 dashboard 设；被拦住时按返回的 `code` 分支处理。
- 把「还在转」当失败。Premium 未就绪时返回 `202` + `Retry-After`，按它重读不重复计费。
- 建了 arcmira monitor 就以为能删。它不提供删除，只能 `paused`。
- 把厂商自述当独立证据。arcmira 的数据覆盖与说话人/赞助识别准确性全是厂商自述。
- 把「安装成功」当「任务有效」。CLI-Hub 装完 harness 后，要接进 agent 跑一条真实重复任务。
- 把作者自测当独立证据。jevcrawl、CLI-Anything、reason network、idx、Blender 扩展、jevreel、WhatsApp MCP、im-mcp、claude-security-scan、vulnerator-ai、TradingView、agent-toolkit-for-aws、flashmind、mcode-stack 都只有 README、作者自测或关注度，不等于独立效果证据。
- 在主力环境里直接跑第三方包。REA 依赖 `npx`、jevcrawl 依赖 `uvx`、CLI-Hub 依赖 `pip`，都会拉取并执行第三方包；arcmira 在厂商沙箱里执行；idx 是静态二进制直连公开数据源；Blender 扩展的 Python 工具验证不是安全沙箱；jevreel 的视频帧与问题会发到 TypeSafe；WhatsApp MCP 使用非官方协议；im-mcp 会把本地数据库解密后明文落盘；claude-security-scan 会读取多账户敏感信息；vulnerator-ai 默认没有 scope-guard、consent、audit；TradingView MCP 是本地 Node 进程；agent-toolkit-for-aws 会访问 AWS API；flashmind 通过 `npx` 拉取 npm 包；mcode-stack 是技能文件，安装前要确认来源和目录权限，不要把密钥写进技能目录或日志。
- 忽略版本写死。`rea-agents@6.3.0`、`jev-1.13.0`、`jev-1.14.0`、微信/钉钉版本都是写死或强依赖的；换版本要重新核对。
- 以为 jevcrawl 能爬任何站点。它不执行 JavaScript、不读 `robots.txt`、不登录、不绕付费墙和 CAPTCHA。
- 忽略内容外发。jevcrawl 会把页面文本发送到 TypeSafe；API key 只从环境变量读，不落盘、不写日志。
- 把 401 当故障。arcmira 对无凭证请求返回 401 + OAuth 挑战，这是登录/开户路径。
- 忽略上游软件依赖。大量 CLI harness 包装真实桌面软件；不先装上游软件，`cli-hub launch` 不会产生有效结果。
- Windows 上直接跑 Claude Code 生成路径。需先装 Git for Windows 或使用 WSL，否则会报 `cygpath: command not found`。
- 给 GUI 客户端手写相对路径或 `idx`。GUI 应用通常不继承 shell 的 `PATH`；用 `idx mcp setup <client>` 生成绝对路径。
- 从 stdout 以外的地方捞数据。idx 约定 stdout 只放一个 JSON 文档、其余全部走 stderr。
- 把 `null` 当 0、或当成「该自己补一个」。idx 对来源未返回的字段写 `null`，不做估算。
- 不看退出码。idx 用 `0/2/3/4/5/6` 分语义；靠解析错误文本做分支，换个版本就碎。
- 把 Blender 扩展的 Python 工具验证当安全沙箱。它用于拦截不允许操作，不是隔离机制；高影响操作是 `execute_code`、`export_scene`、`import_asset`。
- 默认团队链一定更好。Blender 扩展 README 没有量化指标，审核开销可能大于收益；先用单助手跑通同一任务，再换团队链对比。
- 把 jevreel 的底层图像能力当成熟能力。README 明确它是实验性，验证只基于单个测试视频。
- 把 `jevreel query` 当收费操作、或把 lens 事后跑当免费。`query` 过滤不产生请求；lens 随索引请求一起走几乎免费，事后再单独跑是每分钟视频一次请求。
- 用 WhatsApp MCP 的免费 Cloudflare 计划，或以为首次导入失败会自动补。README 要求 Workers Paid，免费计划未验证；首次历史导入每个链接只发生一次，失败后要重新链接才能补。
- 以为 WhatsApp MCP 能发消息、能多人共享、能转写媒体。它不能发送；媒体只显示标签，不下载不转写；一个部署对应一个账号和一个 owner。
- 在公共机器上跑完 im-mcp 不清理。先完全退出 AI 客户端；用 `im-clean --dry-run` 预览，再 `im-clean`；最后 `uv tool uninstall im-mcp`。
- 把第三方安全技能当「只读就安全」。claude-security-scan 会读取 Mac 本体、本地全部 git 仓库、GitHub、Vercel、多个云和 Gmail；先在隔离或低风险环境只登录一个域试。
- 一上来就全量扫描 claude-security-scan。先 `--demo`，再 `--skip repos` 只对一个低风险域跑。
- 把「未能确认」当「没有问题」。缺工具、缺权限、抓取失败都会进入「未能确认的项目」并附理由。
- 把 vulnerator-ai 的「默认无护栏」当成「有默认护栏」。安装完就是裸的；两个 opt-in 控制项也不是 consent、不是防火墙。
- 对未授权目标跑 vulnerator-ai。它只能对已获书面授权的目标使用；没有书面授权、没有隔离靶场，就先不要起栈。
- 把 vulnerator-ai 的前门当执行体。前门只暴露 run 生命周期，不暴露原始 `kali_run`。
- 把 TradingView 推文标题当教程。原文在 `node src/cli.mjs launch` 后截断，没有策略、代码、回测、结果；只能当接入线索。
- 把 agent-toolkit-for-aws 的官方 README 当独立效果证据。它给出安装命令和覆盖范围，但没有独立测评、客户案例或 skills 端到端评估指标。
- 只装插件不配 AWS 凭据或只读权限。API 调用和脚本执行需要本地 AWS 凭据；先在沙箱账号或只读权限下跑。
- 把 skills 当 MCP Server。Kiro、fx 和其他 agent 的手动路径要分别配置 MCP Server 和安装 skills。
- 把 flashmind 的接线当效果。原文没有防幻觉规则正文、没有 4 个 `SKILL.md` 正文、没有基准/案例/前后对比。
- 一次启用四个 flashmind 技能。多变量混淆；先只启用 `verify-before-done`，两周后再扩。
- MCP 配置重复粘贴。只保留一个 `flashmind` 和一个 `engram` 键；改现有条目而不是追加第二份。
- 把记忆库当真相。Engram 是第三方组件；信任前用 `mem_review` 对照当前代码复核，只保存经 `/verify` 确认的决策。
- 把 mcode-stack 的 README 当技能正文。本次只有 README，没有各 `SKILL.md`、`checklists/`、`WORKFLOW.md` 正文；先打开目标技能目录里的 `SKILL.md` 再照做。
- 一次装整套 mcode-stack 15 个技能。多变量混淆；先只装 2–3 个，优先 `long-command-check` + `independent-review` + `harness-experiment`。
- 把「安装成功/`/skills` 能列出」当效果。要在真实任务中调用并保留不调用技能的对照会话；没有可观察改善就停在 try。
- 以为 `mcode plugin add` 能从 GitHub URL 或本地路径安装。它只从官方目录安装；本地 stack 要复制到 `mcode plugin marketplace list` 显示的本地插件目录，再到 `/plugins` 刷新启用。
- 以为 MiniMax Code 桌面端市场安装一定可用。README 说该功能在逐步开放，部分版本可能没有；没有就回到单技能安装或本地插件目录。
- 把 mcode-stack 当自动触发工作流。README 没有说明定时、事件或状态触发机制；它给的是技能、检查清单和工作流文档。
- 忽略 mcode-stack 的技能发现路径。技能可放 `~/.agents/skills/`、项目级 `.minimax/skills/`、`.claude/skills/`、`.agents/skills/`，全局还会读 `~/.claude/skills/`、`~/.codex/skills/`；放错位置 `/skills` 看不到。
- 把 `harness-experiment` 当一次跑完就算。README 要求小评估、一次只改一项、重复运行、看翻转任务；不重复运行无法判断波动。
- 把 `independent-review` 的干净上下文当普通评审。它要求只提供 diff、需求和测试结果；把完整会话和历史都塞进去就失去「独立」条件。

## 证据与来源

本节说明每个做法依据哪类材料、有哪些数据、哪些只是作者主张。
- 做法 A jevcrawl：可核查的是 README 的安装命令、参数默认值、输出字段与环境变量表。数据均为作者自测：50 个 WebWalkerQA 任务答对 40%、找到答案页 54%、$0.025/任务；与 Crawl4AI 0.9.4 的 20 任务对照答案页 10 vs 5、中位爬取时间 29s vs 43s；docs.python.org 示例 80,034 tokens → 1,873 tokens。作者主张无独立验证：比 LLM 驱动爬取快、天然抗 prompt injection、引文逐字可溯源。原文自陈局限：样本小；不执行 JavaScript；不读 `robots.txt`；页面文本会发送到 TypeSafe。
- 做法 B REA/Hermes：可核查的是一条完整接入命令，以及「REA 设置菜单已支持 Claude Code 和 Codex」的事实陈述。只是作者主张、未经原文验证：接入后代理会多出 139 个工具；能力清单在列举处被截断。Matthew 的 REA 帖子 230 万次浏览是曝光量，不是效果证据。
- 做法 C：不接入的降级做法，依据是各路径原文在工具清单、验证方式或效果数据上的缺口。
- 做法 D CLI-Anything：可核查的是 README 的安装与使用命令、各宿主安装脚本。作者主张无第三方复现：CLI 是人和 agent 的通用接口；7 阶段流水线能生成 CLI、测试、文档并发布；README 自报 2,461 个测试通过、pytest 100%。原文明确：大量 harness 依赖上游桌面软件；Windows 需 Git for Windows 或 WSL；没有对比性指标。
- 做法 E arcmira：可核查的是接入命令、`arcmira_describe`、`id_required` 与 `resolve` 语义、Premium 转录的 `202` + `Retry-After`、credits 计量规则、错误码清单、monitor 方法集、沙箱出站白名单与永不 DELETE。厂商自述、无第三方复现：数据覆盖与说话人/赞助识别准确性。调研结论是先在 Claude Code 用一条命令接入或改用 Bearer key，再照「先 resolve 后查询」的示例做小范围试用。
- 做法 F reason network：可核查的是安装方式、四条 CLI 命令、MCP server 名与三个工具名、按 agent 区分的投递时机、网络与安全模型、状态目录。只是作者主张、没有数据支撑：整套「团队协作因此变好」的说法；README 没有任何使用数据、性能数字、前后对比或用户案例；仓库 33 stars。
- 做法 G idx：可核查的是安装方式、npm 启动器校验、`idx -o json` 的 envelope 字段、缺失字段为 `null` 不估算、退出码语义、`idx mcp` 的 stdio 与 HTTP 形态、`idx mcp setup` 打印绝对路径、各客户端注册命令、23 个工具名与筛选语法、仓库数据保鲜流水线。调研未给出效果数据、性能数字、前后对比；正文在第 9 步后被截断。
- 做法 H Blender 扩展：可核查的是 README 的安装与使用信息、Windows x64 + Blender 4.2+、21 个工具清单、单助手与 Manager/Worker/Reviewer 团队链、四条提示词、OpenCode Portable 与其他兼容客户端、控制与安全说明。仅为作者主张、无数据支撑：更快迭代、自动化重复工作等价值描述；没有用户案例、成功率、耗时对比或基准数据。仓库 705 stars；Release 1.0.0、MIT。
- 做法 I jevreel：可核查的是 README/调研给出的命令与机制、lens TOML、插件安装命令、手动 MCP 命令、环境变量表、四步工作流、MCP 工具与 CLI 对照。数据均为作者自测：10 分钟 1080p 视频单张 sheet 约 $0.00025、索引 $0.0033、一次 ask $0.004–0.005、重复 ask $0；暂停菜单仅 screening 得分 0.36 / 0.50 / 0.95，验证前漏掉两个、验证后全部捞回。底层 Jev 图像能力仍是实验性，验证只基于单个测试视频；原文在 Claude Code 插件部分被截断。
- 做法 J WhatsApp MCP：可核查的是 README 的完整部署命令、配置项、工具表、架构和调试步骤。HN 的 35 points、23 comments 只能说明关注度。作者明确说只在一个真实账号上跑过；首次历史导入每个链接只发生一次，失败后要重新链接；免费计划未验证；媒体不下载、不转写；一个部署对应一个 WhatsApp 账号和一个 owner；非官方实现，作者承认违反 WhatsApp 条款。
- 做法 K im-mcp：可核查的是 README 的安装命令、初始化命令、客户端配置、清理命令、工具表、兼容性验证表。原文只给了兼容性验证，没有任何效果指标、任务成功率或对照数据；「毫秒级响应」是作者声称。工具声明只读，但本地数据库会解密为 SQLite、明文落盘；没有 cron、webhook、守护进程说明。
- 做法 L claude-security-scan：可核查的是 README 的检测项清单、安装命令、各域准备方式、报告路径、安全设计和限制；仓库 32 stars。没有检出率、误报率、真实用户案例或独立评测，也没有代码审计结果。原文自述限制：Google Workspace 整体管理设置不在范围；AWS 默认只查东京和弗吉尼亚；不做攻击性检查；检测结果需人工最终判断。这是会读取多账户敏感信息的第三方技能，只读与脱敏设计尚未在本次材料中经过代码级验证。
- 做法 M vulnerator-ai：可核查的是四容器架构与端口、Kali 工具清单、`install.sh` 的行为、三个可选 flag、TUI 命令、stdio 模式的 MCP 配置、六个 MCP 工具名、两个 opt-in 控制项及其边界说明、MIT 许可、OWASP Juice Shop 练习靶场、`docs/design.md` 的 findings-store schema、`docs/example-report.md` 的脱敏样例。原文没有任何准确率、耗时、成本或对比基线数据，没有独立评测和用户案例；设计上刻意没有 core、没有 REST API、没有 UI、没有 gates；默认无 scope-guard、无 consent、无 audit、无授权闸门。
- 做法 N TradingView-Unified-MCP：可核查的只有两步接入动作——安装 Claude Code、下载解压仓库并在根目录执行 `node src/cli.mjs launch`；原文在第二步命令后被截断。零效果证据：没有策略、代码、回测、收益、胜率、截图或日志；互动量约 50 赞、6 转发、3 回复，只说明关注度。作者主张「通过与 Claude 对话构建了一个交易机器人」未经验证；MCP 注册、账号/订阅、API 凭据、工具列表、进程是否常驻均需从仓库 README 补。
- 做法 O agent-toolkit-for-aws：证据来自 AWS 官方 README，仓库状态为 GA，许可证 Apache-2.0，约 3196 stars。可核查：多 agent 安装命令、Kiro/fx 的 MCP JSON 配置、skills 安装命令、插件覆盖范围、项目级 rules 目录、IAM 条件键/CloudWatch 指标/CloudTrail 审计的陈述。局限：只有官方文档，没有独立测评或客户案例；没有 skills 端到端评估指标；没有 IAM/CloudWatch/CloudTrail 配置样例；没有 rules 文件内容；没有提示词模板。
- 做法 P flashmind：可核查的是 npm 包名 `flashmind`、MIT、31 stars、Node ≥18、可直接复制的 MCP JSON、六种客户端配置映射表、技能触发条件表、更新与去重规则、Gemini CLI 斜杠命令、隐私承诺。属于作者主张、原文未提供支撑的：「消除幻觉」「让快模型记得住、会规划、会验证」；没有任何基准、案例、前后对比数据或用户反馈。关键缺失：防幻觉规则的实际正文和 4 个 `SKILL.md` 的正文都没有出现在抓取到的文本里。
- 做法 Q mcode-stack：证据来自仓库 README，MIT（部分 stack 的 `NOTICE.md` 可能另有说明），有 15 个技能徽章、GitHub Actions `validate` 徽章、01–04 和即将发布的 06 篇配套文章；安装命令、目录发现规则、插件市场命令和技能清单是具体可执行的。六个 `engineering-*` 技能注明改编自 Google Engineering Practices，改编材料保持 CC-BY 3.0。只是作者主张：README 称这些是团队「每天实际使用」的工作流，并称真正拉开差距的是代理周围的工程习惯；本次材料没有使用前后对比、缺陷率、节省时间、采用率等量化数据，也没有真实案例细节。关键局限：只拿到 README，没有各 `SKILL.md`、`checklists/`、`WORKFLOW.md` 正文，无法验证每个技能的具体检查项是否足够可照做；部分安装方式依赖 MiniMax Code 版本（插件市场在逐步开放），`mcode plugin add` 也不支持 GitHub URL 或本地路径。结论强度：try，先选 2–3 个技能小范围试用，打开 `SKILL.md` 后再决定是否采用其具体流程。

## 依据的调研

- [@BkashJosi: REA 的设置菜单中列出了 Claude Code 和 Codex。Hermes 不在其中。🪽](../research/radar/2026-10-12/2718-rea-claude-code-codex-hermes.md)：值得一试，可以小范围试：在隔离环境里用作者给出的一行命令把 rea-agents 作为 MCP 服务器挂到 Hermes，再核对工具清单并跑一个低风险任务验证；因为原文只给了这一条可复制的接入命令，工具数量与能力都还只是作者主张，且原文在工具清单处被截断。
- [RayenMlayeh/jevcrawl](../research/radar/2026-10-14/3198-rayenmlayeh-jevcrawl.md)：值得一试，按 README 给出的两条 MCP 配置把 jevcrawl 挂到 Claude Code/Cursor，先用 1–2 个真实的多跳查资料任务与现有抓取方式做对照；理由是它提供了可直接照做的安装命令、参数默认值和输出字段，成本/耗时对比具体，但基准样本小、依赖付费 Jev API、不执行 JavaScript，适合小范围试而非直接替换。
- [HKUDS/CLI-Anything](../research/radar/2026-10-15/3558-hkuds-cli-anything.md)：值得一试，建议小范围试用：先用 `cli-hub` 装一个现成 harness 接进 agent 跑一条真实重复任务，确认真有用后再考虑用 `/cli-anything` 为内部工具生成新 CLI——它把“给 AI 提供工具入口”变成了可复制的命令与流程，但所有效果数据均为项目自述、无第三方复现，且大量 harness 依赖上游桌面软件。
- [arcmira/mcp](../research/radar/2026-10-17/4078-arcmira-mcp.md)：值得一试，先在 Claude Code 里用一条命令接入这个远程 MCP（或改用带 Bearer key 的 JSON 配置），再照 README 的「先 resolve 后查询」示例程序做小范围试用；理由是仓库给出了可直接复制的安装命令、方法表、示例代码和 credits/限额规则，属于能立刻落地的工具供给，但数据覆盖与说话人/赞助识别准确性全是厂商自述，且有付费计划与预算门槛，不足以直接采纳。
- [reason-machines/reason-network](../research/radar/2026-10-17/4174-reason-machines-reason-network.md)：值得一试，若团队已经在用 Reason CLI 并且成员都在同一 workspace，可以小范围试用 reason network：用 `reason network who` 和 `reason network <session> "..."` 让两个 agent session 直接互相问答，观察是否减少人工中转。理由是原文给出了可复制的安装命令、CLI 命令和 MCP 工具名，但完全没有效果数据，且强依赖 Reason 产品与团队整体部署。
- [fzn0x/idx](../research/radar/2026-10-18/4493-fzn0x-idx.md)：值得一试，值得小范围试：照 README 把 idx 装起来并用 `idx mcp setup <客户端>` 注册进你已在用的 agent，用来验证「把现成 CLI 包成 MCP 工具供 agent 调用」这一模式是否真的省事；它本身是印尼股市工具，领域窄，先试流程而不是直接写进手册。
- [LiCinCan/blender-ai-mcp-addon](../research/radar/2026-10-18/4630-licincan-blender-ai-mcp-addon.md)：值得一试，建议在 Windows x64 + Blender 4.2+ 环境小范围试用：按 README 安装扩展，先用单助手跑通“检查场景→创建对象→复制排列”的提示词，再视任务复杂度配置 Manager/Worker/Reviewer 团队链；理由是它把场景工具、模型选择、审批与审核流程都做成了可照做的集成，但只有 README 级证据，缺少效果数据且平台受限。
- [DeepAleph/jevreel](../research/radar/2026-10-19/4711-deepaleph-jevreel.md)：值得一试，照 README 的 Quickstart 在一段本地短视频上跑通 index→ask→zoom，并以 MCP/插件形式接到 Claude Code 或 Codex 试做视频检索；它给的是完整可复制的安装、配置与 lens 用法，值得小范围试，但底层 Jev 图像能力仍是实验性、验证只基于单个测试视频，不建议直接全量采用。
- [Show HN: WhatsApp MCP running free on Cloudflare](../research/radar/2026-10-19/4806-show-hn-whatsapp-mcp-running-free-on-cloudflare.md)：值得一试，建议小范围试用：在自己的 Cloudflare 账户部署只读 WhatsApp MCP，接入 Claude Code 验证搜索、跨聊天查找和群聊补课类任务；它给出了完整部署步骤和工具接口，但属于非官方协议、仅单账号验证，不宜直接作为团队默认方案。
- [stkoecn/im-mcp](../research/radar/2026-10-19/4855-stkoecn-im-mcp.md)：值得一试，按 README 的「uv tool 安装 → wechat-init/dingtalk-init 初始化 → 客户端 MCP 配置」三步在一两台机器上小范围试跑，它能把微信/钉钉的沟通上下文变成 agent 可直接检索的只读数据源；但涉及本地数据库解密与明文落盘、强依赖客户端版本，且只有作者自述无实测数据，暂不宜作为通用做法直接写进手册。
- [chaenmasahiro0425/claude-security-scan](../research/radar/2026-10-20/5184-chaenmasahiro0425-claude-security-scan.md)：值得一试，建议先小范围试用：按 README 安装后用 --demo 验证，再只对一个低风险域运行 --skip repos，确认只读、脱敏和“未能确认”标注可靠后再扩大。理由是它把跨 Mac、仓库、云和 Gmail 的例行检查封装成一句触发和定时任务，步骤具体；但它是跨多账户读取敏感信息的第三方技能，目前只有 README 证据，不宜直接全量 adopt。
- [irraz/vulnerator-ai](../research/radar/2026-10-21/5350-irraz-vulnerator-ai.md)：值得一试，把 Hermes + Kali-MCP + vulnerator-mcp 前门的四容器 OODA 结构当成“自主循环 + 工具供给”的模板，先在隔离靶场（--with-juice-shop）跑一轮并对照人工基线，再考虑扩到真实授权目标；它给出了可照做的安装、MCP 配置和运行、干预入口，但默认无任何护栏且完全没有效果数据，不宜直接用于生产。
- [@DaviddDotTech: 我通过与 Claude 对话来构建了一个交易机器人。](../research/radar/2026-10-24/6555-claude.md)：值得一试，可以小范围试的只是“用 MCP 把 Claude Code 接到 TradingView”这一步：按原文装 Claude Code、解压作者的 MCP 仓库、在该目录跑 `node src/cli.mjs launch`；但它后面怎么让 Claude 产出交易逻辑、怎么验证效果，原文全部截断且零证据，只能当接入实验，不能直接上真实资金。
- [aws/agent-toolkit-for-aws](../research/radar/2026-10-25/6886-aws-agent-toolkit-for-aws.md)：值得一试，如果团队在 AWS 上开发且已使用 Claude Code、Codex、Cursor、Devin、Kiro 或 fx，建议先安装 aws-core 并在只读权限下小范围试用；它把 MCP 服务、Agent Skills、插件和审计控制打包，能直接补齐智能体访问 AWS 的能力与权限供给，但证据主要来自官方 README，缺少独立效果数据。
- [Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent](../research/radar/2026-10-27/7314-hvftpie13-flashmind-gemini-3-8-flash-smart-agent.md)：值得一试，先在一个仓库、一个 MCP 客户端上照着 README 接线（npx 启动的 MCP 配置、规则文件、verify-before-done 单个技能），小范围试用两周，再用「未跑测试就说已修复」和「虚构包名或函数」两类事件计数判断去留；理由是原文提供了可直接照抄的安装命令、MCP JSON 和客户端配置映射，但没有给出任何效果数据，且防幻觉规则正文与四个技能正文均未提供，只能复用其接线方式。
- [MiniMax-AI/mcode-stack](../research/radar/2026-10-29/7996-minimax-ai-mcode-stack.md)：值得一试，建议小范围试用：先在 MiniMax Code 或 Claude Code 中安装 long-command-check、independent-review、harness-experiment 等技能，按 README 的目录和插件方式接入，并用 /skills 调用，验证能否改善长命令、评审和实验流程。理由是它给出了可执行的安装与调用步骤，且来自团队日常使用；但当前材料只有 README，具体检查项需打开各 SKILL.md 才能照做。
