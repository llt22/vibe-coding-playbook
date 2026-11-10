# 让代理取数时把日期、时区、采样和过滤条件一起交出来

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把第三方工具接给代理时，用同一套隔离、冒烟和对照流程判断它是否真的可用、可控、可核验。
> 先试这一步：先挑一个只读、低风险的数据源类 MCP，在隔离环境里用示例数据跑一次冒烟，检查输出是否自带日期、时区、采样和过滤条件。
> 最近修订：2026-11-10

## 解决什么问题
把第三方工具以 MCP、CLI、技能包、插件、浏览器扩展加本地 bridge、本地数据集、真机操作桥接或现成组件目录接给代理时，常见错误是一句注册/安装命令就完事。能不能用、多出哪些工具、花多少钱、数据发到哪里、是否真的更好，要靠同一套流程：隔离环境 → 安装/注册 → 核对工具清单 → 冒烟 → 与未接入对照 → 决定 try / study / stop。高敏感路径先只读、最小权限、隔离：私人消息只读；安全扫描只读低风险域；vulnerator 只在隔离靶场和书面授权目标；TradingView 只验证接入；AWS 先只装 aws-core 并只读/沙箱；flashmind 先只启用 verify-before-done；mcode-stack 先只选 2–3 个技能；snapgent 只在非敏感可丢弃仓库；kensaku 只索引一个工作文件夹并保持只读；radar-cnpj-mcp 先只下一个州并用 CLI 校准；trustabl 先在一个受支持 SDK 仓库试点并人工审查 SKILL.md；poki 只用备用 iPhone 先跑只读/可逆操作并接受屏幕内容外发与 ToS 风险；iphone-control 只用专用 iPhone 和专用 Apple ID 并保留工具调用确认；remote-webview-debugger 先用测试账号和隔离测试页并先只开 observe；auto-ontology 先用 demo 库和只读账号，共享机器设 AUTO_ONTOLOGY_ALLOW_DATASOURCE_TOOLS=0；组件目录先预览每个组件会写入的文件并只装 1–2 个低风险组件。社交推荐里看到的单个插件也一样：只把可复现的安装命令当线索，规则正文、适用性和效果要自己核对，不能因为 star 数高就跳过流程。数据源类工具还要多查一层：返回数字时，有没有把日期边界、时区、采样状态、过滤器和聚合口径一起返回；没有这些，数字再好看也不能直接拿去决策。

## 适用与不适用
通用适用：本机有 MCP 客户端或支持 skills 的代理；愿意在容器、虚拟机、专用账号或备用设备里先跑第三方包；目标是让代理获得外部工具或一类新能力；愿意做“挂载 vs 未挂载”或“调用技能 vs 不调用技能”的对照；愿意先人工审查工具生成的文件再让代理读取使用。
通用不适用：不能隔离、必须直接在主力工作目录或主力手机试；需要稳定生产接入；依赖被截断的完整工具清单来规划任务；只有作者自述没有效果数据却要做量化决策；生成物没有任何样例、规则正文或验证方式却要直接进代理上下文；原文只剩推荐语气和 star 数，却要据此确定规则内容或效果。
各路径关键条件（压缩版）：A jevcrawl 适合站内多跳检索、不依赖 JS 渲染、允许页面文本外发 TypeSafe，不做登录/付费墙/CAPTCHA。B REA/Hermes 需已有 hermes CLI，原文只给一条命令且清单被截断，只适合试。C 不接入：注册失败、工具无法被实际调用、无法隔离，或需要完整清单和失败排查而原文没有时，只记录设计点。D CLI-Anything/CLI-Hub 要反复调用 GIMP、Blender、LibreOffice 等软件，愿意先装上游软件；Windows 需 Git for Windows 或 WSL。E arcmira 要在 YouTube 视频与直播转录里检索谁在什么时间说了什么、品牌赞助；接受远程 MCP、写程序调用、付费预算；不提供 monitor 删除。F reason network 团队都在用 Reason CLI 且同 workspace，需第二人配合。G idx 目标就是印尼股市，或照抄一份数据三种界面、mcp setup 绝对路径、统一 envelope 与退出码。H Blender 扩展需 Windows x64 + Blender 4.2+，想让 AI 在场景里做可回退操作，并要审批、取消、命名撤销与截图。I jevreel 有一段本地或 URL 视频要检索某个瞬间；底层 Jev 图像能力仍是实验性，验证只基于单测试视频。J WhatsApp MCP 个人 WhatsApp 只读检索、摘要、补看群聊；接受自部署 Cloudflare 付费 Workers、非官方协议与条款风险；一个部署一个账号一个 owner。K im-mcp 需 Windows x64 或 macOS、微信 4.x/钉钉 7.x 已登录；只读检索；接受本地数据库解密后明文落盘。L claude-security-scan 已装 Claude Code、git、bash、Python 3.11+，能访问 GitHub；做跨本机、本地 git 仓库、GitHub、云服务和 Gmail 的只读例行检查；缺工具/权限时标为未能确认。M vulnerator-ai 能在隔离环境接入单个 MCP 工具集，想在授权靶场验证 OODA 循环；默认无 scope-guard、consent、audit、授权闸门；目标已获书面授权且能隔离 kali 容器。N TradingView-Unified-MCP 已装 Claude Code 与 Node.js，只想验证只读行情/图表接入，不接真实资金。O agent-toolkit-for-aws 团队在 AWS 上开发、使用受支持编码智能体、本地已配置 AWS 凭据；先只装 aws-core 并在只读/沙箱权限下试用。P flashmind 支持 MCP 的客户端、Node ≥18；想给 agent 补记忆、防幻觉规则和宣布完成前验证；只选一个仓库、一个客户端、只启用 verify-before-done 做两周对照；原文没有规则和技能正文。Q mcode-stack 已装 MiniMax Code；若走 Claude Code 市场命令已装 Claude Code；想从长命令审计、干净上下文独立评审、小评估实验开始；本次只有 README，要打开 SKILL.md 核对；一次只装 2–3 个技能并保留对照。R snapgent-connector 需 Edge/Chrome MV3、VS Code、Windows/macOS/Linux；macOS/Linux 需 Python 3.9+；使用期间保持 bridge 运行；目标项目在 VS Code 打开；只在非敏感可丢弃仓库试用；接受 unpacked 扩展站点权限和 MCP 写权限风险。S expo/skills 已有 Expo/React Native 项目；使用受支持编码 agent；想按官方技能处理 Router、原生 UI、SDK 升级、EAS 构建/工作流/更新；部分 services 技能依赖付费 EAS；先只装技能验证路由再决定接 MCP。T kensaku 本机有工作相关文件、截图、PDF/DOCX/PPTX/XLSX/EPUB、代码或日志；想给 agent 补本地只读检索上下文；首次索引选择范围并排除敏感目录；只需只读检索。U radar-cnpj-mcp 工作涉及巴西企业注册数据、B2B 勘探或区域市场摸底；Node ≥20；只下载目标州；接受数据来自巴西联邦税务局公开 CNPJ、默认遮蔽 MEI 电话/邮箱、LGPD 责任在使用者。V trustabl/agent-reliability-skills 需 Node.js 22+；目标仓库有依赖清单且确实使用受支持 agent SDK；客户端支持 MCP；愿意先在一个仓库试点，生成 SKILL.md 后人工审查再让编码代理使用。W poki 需 Apple Silicon Mac、macOS 15+、完整 Xcode、Rust、Node.js 24+、ffmpeg，预构建包还需 Python 3；有一台可清空的备用 iPhone，真机已 USB 配对并开启开发者模式；目标任务只能走 App 界面；接受屏幕内容发送到模型服务、第三方 App 自动化可能违反 ToS、AGPL-3.0-only。X remote-webview-debugger 目标页面只在真实手机 WebView/H5 或微信类超级 App 复现，没有 USB 线、没有远程调试端口、本地无法复现；有 Docker 或可运行 Go 二进制；手机和 agent 都能访问网关；页面能注入 SDK；设备端用户在场并能批准；接受自托管部署、证书和运维；接受 SDK 0.3.0 早期版本可能变动。Y davila7/claude-code-templates 已安装 Claude Code，本机有 Node/npm，目标是在干净分支或临时仓库试用现成组件目录；只想先装 1–2 个组件，优先 loops、hooks、MCP；愿意在网页目录预览写入文件、用 --health-check 和 /stack 核对与回滚；接受组件质量与效果没有评测数据。Z iphone-control 有一台专用 iPhone（iOS 17+）和专用免费 Apple ID；主机是带 Docker 的 Linux 或 Apple Silicon Mac；用数据线连接；只想在自己拥有的设备和账号上让 agent 操作真实 App 界面；MCP 客户端能保留工具调用确认。AA auto-ontology-mcp 有 uv 和 MCP 客户端；想给数据库问答加语义层、减少 text-to-SQL 静默错误，或把收据/账单/论文/笔记沉淀成可查询知识库；先用内置 demo 库跑通建模—问数—拒答—导出；真实库用只读账号；远程 HTTP 需隧道和 token。不适用：没有 uv；需要内置调度或事件触发；不能接受数据源 URL 含密码明文存于 ~/.auto-ontology-mcp/ontology.db；需要独立效果证据。AB andrej-karpathy-skills 已安装并登录 Claude Code，能访问插件市场/对应 GitHub 仓库；只想把一条社交推荐当 try，先核对规则正文，再做启用/不启用对照；原文截断，只有第一项完整安装命令，不能据此补写其余 6 个仓库或“最少代码”提示词。AC Yandex Metrika MCP 工作涉及 Yandex Metrika 站点分析，有 MCP 客户端，Node.js 22.13+，想只读取数并让每次回答带日期、时区、采样状态和过滤器；接受数据发送给 AI 客户端及其模型提供方、token 不进对话。不适用：不用 Yandex Metrika；需要写操作；不能接受数据外发；需要跨平台已稳定验证（本次材料只说明在 macOS 上用真实 Yandex 登录跑过报表，其他平台未给结论）。不用 Yandex Metrika 时，只读 AC 的“输出自带口径”设计，不必安装。

## 前置条件
通用：一个隔离环境；到包分发源和目标服务的网络出口；一个可回退的低风险真实任务，用来做冒烟测试和对照。
各路径关键前置（压缩版）：A jevcrawl 需 TypeSafe Jev API key、uv、到 api.typesafe.ai 出口。B REA 需 hermes 命令、npx、npm registry。D CLI-Anything 需 Python 3.10+、上游软件、支持 SKILL 的 agent。E arcmira 需账号、支持的 MCP 宿主、付费计划与预算。F reason network 需 Reason CLI/workspace、daemon、MCP server 和三个工具权限。G idx 需 Node/npm 或 Rust，或 install.sh。H Blender 需 Windows x64、Blender 4.2+、支持 tool calling 的模型。I jevreel 需 Python 3.11+、FFmpeg、TypeSafe key。J WhatsApp MCP 需 Cloudflare 付费 Workers、Node 20+、OAUTH_KV、OWNER_PASSWORD。K im-mcp 需 Windows x64/macOS、微信 4.x/钉钉 7.x、uv、管理员终端或 64 位 hex passphrase。L claude-security-scan 需 Claude Code、git、bash、Python 3.11+、各域只读登录。M vulnerator-ai 需 docker、compose v2、openssl、OpenRouter key、隔离靶场、书面授权、两个 32 字节 hex token。N TradingView 需 Claude Code、Node.js、只读凭据。O agent-toolkit-for-aws 需 AWS 账号及本地凭据、支持的编码智能体、Kiro/fx 手动路径需 uv。P flashmind 需 Node ≥18、git、支持 MCP 的客户端、隔离分支/worktree。Q mcode-stack 需 MiniMax Code、可选 Claude Code、git、技能目录和 SKILL.md。R snapgent 需 Edge/Chrome MV3、VS Code、Python 3.9+、保持 bridge 运行。S expo/skills 需 Expo/RN 项目、受支持 agent、重启或刷新会话。T kensaku 需安装包或源码构建、选择索引范围和排除项、支持 stdio 的 MCP 客户端。U radar-cnpj-mcp 需 Node.js 20+、明确覆盖州、用于 B2B 勘探/市场摸底、准备 LGPD 合规做法。V trustabl 需 Node.js 22+、仓库依赖清单、受支持 agent SDK、支持 MCP 的客户端、可写仓库内 .claude/skills/ 的权限、首次联网下载 analyzer 与规则仓库。W poki 需 macOS 15+、Apple Silicon、完整 Xcode、Rust、Node.js 24+、ffmpeg、预构建包需 Python 3；备用 iPhone 已 USB 配对并开启开发者模式；MCP 客户端；接受屏幕内容外发、ToS 风险和 AGPL-3.0-only。X remote-webview-debugger 需 Docker 或 Go 二进制/源码构建环境；手机与 agent 都能访问的网关地址；控制台项目 app key；API key；能在页面或原生 document start 注入 SDK；设备端用户在场可批准；https 被调试页面需给网关配 HTTPS 与证书；测试账号和隔离测试页；可选 Postgres 连接串；自托管时准备域名、TLS 反代或 Compose 的 Caddy。Y davila7/claude-code-templates 需 Node/npm、npx、已安装 Claude Code；在目标项目目录执行；Mods 类要求 Claude Code 2.1.287+；干净分支或临时仓库；能访问 aitmpl.com 预览组件写入文件；能接受安装会写入项目 .claude 等配置、hook 是可执行脚本、MCP 组件会接外部服务凭证。Z iphone-control 需 iOS 17+ 真机、数据线、专用免费 Apple ID、主机为带 Docker 的 Linux 或 Apple Silicon Mac；MCP 客户端保留工具调用确认；macOS 上 Docker 不能透传 USB，必须直接跑二进制；WebDriverAgent 免费签名约 7 天需续签；准备 data/ 备份和可选 Telegram/Bark 通知渠道。AA auto-ontology-mcp 需 uv；建议先跑 demo 库；真实库用只读账号；MCP 客户端支持 stdio；远程 HTTP 需 serve --transport http 和隧道；PostgreSQL 需 psycopg[binary]，MySQL 需 pymysql，DuckDB 需 duckdb-engine，SQLite 内置；客户端 args 要与 --with 一致。AB 需 Claude Code 插件市场安装权限、网络/仓库访问；一个隔离分支或小仓库；能保存 diff、测试结果和人工 review 记录；能读到插件实际规则文本，读不到就停在 study。AC 需 Node.js 22.13+；一个 MCP 客户端（Claude Desktop、Claude Code、Cursor、VS Code、Windsurf、Codex 等）；真实取数时需有对应计数器权限的 Yandex 账号（README 说明无需自建 API key、无需自建 OAuth 应用）；接受数据发送给 AI 客户端及其模型提供方；只读，无裸 HTTP 工具。

## 操作步骤
先做 A 或 D1：它们能在半天内给出可观察结论，也顺带把隔离环境、基线记录这套流程跑通。若目标就是私人消息只读检索，再考虑 J 或 K；不要从发送、多人共享或媒体转写开始。若你已有支持远程 MCP 的宿主且目标就是口语内容检索，直接做 E；团队已在 Reason 且找得到第二个人，可做 F；只想用最小成本看清“CLI 与 MCP 共用一份输出”的结构，做 G 的第 1、3、4 步；手上就有 Windows x64 + Blender 4.2+，做 H 的第 1–4 步；有一段本地短视频要检索，做 I 的第 1–3 步；有个人 WhatsApp 且接受条款风险，做 J 的 1–8 步；要在本机补微信/钉钉沟通上下文，做 K 的 1–6 步；想做跨系统的例行只读安全检查，做 L 的 1–8 步，先 --demo，再只对一个低风险域 --skip repos；想验证“自主循环 + 工具供给”这套架构，做 M 的 1–4 步，先在 --with-juice-shop 靶场里跑；只想验证 Claude Code 接外部数据平台，做 N 的 1–6 步；团队在 AWS 上开发且使用支持的 agent，做 O 的 1–7 步；想给编码 agent 补记忆、防幻觉规则和宣布完成前先验证，做 P 的 1–6 步；想补可移植的工程习惯技能，做 Q 的 1–8 步；想让网页聊天 AI 经本地 bridge 操作 VS Code，做 R 的 1–8 步；在 Expo/React Native 项目里，做 S 的 1–9 步；想给 agent 补本地文件、截图、文档或日志的只读检索，做 T 的 1–8 步；工作涉及巴西企业注册数据/B2B 勘探/区域市场摸底，做 U 的 1–6 步；仓库使用受支持的 agent SDK、想让编码代理在写代码前读到仓库专属可靠性规则，做 V 的 1–10 步；要让代理操作没有开放 API 的 iPhone App，且有一台可清空的备用 iPhone 和完整 macOS 工具链，做 W 的 1–8 步，先只跑只读任务，再跑可逆写操作；bug 只在某台手机 WebView/H5 复现、没有 USB 和调试端口，做 X 的 1–7 步，先 observe；已装 Claude Code、只想从现成组件目录里挑 1–2 个组件小范围试用，做 Y 的 1–6 步，先在网页目录预览写入文件，再只装一个 hook、一个 loop 或一个只读 MCP；有专用 iPhone、专用 Apple ID，主机是 Linux Docker 或 Apple Silicon Mac，想在保留工具调用确认的前提下让 agent 操作真实 App，做 Z 的 1–6 步，先跑打开 Clock、打开 URL、等待文本三类低风险任务；想给数据库问答加语义层，或把收据/账单/论文/笔记沉淀成可查询知识库，做 AA 的 1–5 步，先 demo 再只读真实库；只是从推文里看到一个 Claude Code 规则插件，做 AB 的 1–4 步，只把它当 try；工作涉及 Yandex Metrika 站点分析，做 AC 的 1–6 步，先用 conn_demo 验证输出是否自带日期、时区、采样状态和过滤器；不用 Yandex Metrika 就只读 AC 的验证指标，不必安装。

### 做法 A：接入有完整参数与回执的工具集（以 jevcrawl 为例）
1. 申请 key，确认外发边界：页面文本会被发送到 TypeSafe 打分；列出哪些站点不能碰。
2. 装成 Claude Code 的 MCP server：
```bash
claude mcp add jevcrawl -e TYPESAFE_API_KEY=<your key> -- uvx jevcrawl
```
3. 自检配置并验证通路：
```bash
uvx jevcrawl doctor
```
```text
Use jevcrawl to find which Python version added the walrus operator, starting from docs.python.org
```
4. 或不走 MCP，直接用 CLI：
```bash
uv tool install jevcrawl
jevcrawl crawl https://docs.python.org/3/ --goal 'What does the walrus operator do?' --json
```
5. 用 max_pages、max_seconds、max_decision_usd、return_tokens 限定每次调用；用 stopped_because、stats.degraded、stats.needs_js_urls、jev_cost_usd 判断是找到答案、撞上限还是降级。连续三次 Jev 请求失败后爬取转为广度优先，所有 block 以未打分形式放进 uncertain，不要把降级结果当打分结果。

### 做法 B：接入只有一条命令、清单不完整的工具集（以 REA 接入 Hermes 为例）
1. 在隔离环境确认 hermes 命令存在、npx 可用、能访问 npm registry。
2. 注册：
```bash
hermes mcp add rea --command npx --args -y rea-agents@6.3.0 mcp
```
3. 核对注册与工具清单；原文没有给出查看已注册 MCP 服务器或工具列表的命令，需查 Hermes 文档补上；记录 rea 是否存在、实际工具数量和名称。作者声称有 139 个工具，这个数量未验证。
4. 做低风险冒烟测试，并与未挂载时做对照：同一任务，不挂载 rea 再跑一次，比较能否自主选用工具、人工干预、步骤数和耗时。

### 做法 C：不实际接入，只当作“用 MCP 批量接工具”的思路参考
当注册失败、注册后工具无法被代理实际调用、无法提供隔离环境、或需要完整工具清单和失败排查步骤而原文没有时，选做法 C。只记录设计点：MCP 批量供给、远程 MCP 只暴露少量工具让模型写程序、团队 agent 三工具接口、CLI 与 MCP 共用一份 JSON envelope 并把退出码带进工具错误、零嵌入视频检索的类型化回答 + contact sheet + 全分辨率复核、MCP server 与可视化工作区一起长在宿主软件内部并用审批与命名撤销兜底、前门只暴露 run 生命周期而不暴露原始执行工具。

### 做法 D：用 CLI-Anything / CLI-Hub 把软件包成 agent-native CLI
1. 直接用现成 CLI：
```bash
pip install cli-anything-hub
cli-hub list
cli-hub search image
cli-hub info gimp
cli-hub install gimp
cli-hub launch gimp
```
跑通一条真实重复任务，并记录与不用 CLI 时的差异。
2. 让 agent 自己发现并安装 CLI：
```bash
npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
```
3. 用 Claude Code 生成新 CLI：
```bash
/plugin marketplace add HKUDS/CLI-Anything
/plugin install cli-anything
/cli-anything ./gimp
/cli-anything:refine ./gimp
```
排错顺序：先 /reload-plugins；再 /help cli-anything；旧版不识别 /cli-anything 时改用 /cli-anything:cli-anything。

### 做法 E：接入远程 MCP，用“写程序”的方式调用（以 arcmira 为例）
1. 用宿主登录（OAuth）添加远程 MCP，无 key：
```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp
codex mcp add arcmira --url https://mcp.arcmira.com/mcp
```
2. 连上后先调用 arcmira_describe 拿参考手册，别猜方法签名。遵守 id 规则：先用 resolve 拿 id，再用 id 查询。过滤器只接受原样 id；把名字当 id 会抛 id_required。
3. 需要整段转录时用 Premium 质量，并处理“还没转好”：未就绪时返回 202 + Retry-After，按它重读不重复计费；failed / refunded 除非传 retry: true 不会重开。
4. 先查价再跑贵操作：arcmira.quote(video) 返回整段 Premium 读取会用多少 credits，本身不计费。预算由 dashboard 控制，工具本身不接受金额参数。
5. 用示例提示词快速验证接通：Which brands sponsor both TBPN and the All-In Podcast? / Find a moment on TBPN from the last 90 days where someone talks about stablecoins, and quote it.
6. 要持续盯着就建 monitor（必须走 arcmira_execute_write）；它不提供删除，退出方式是 paused。

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
5. MCP server 名为 reason-network，对 agent 暴露 list_team、send_message、check_inbox 三个工具。
6. 最小试用：找 2 名已经在用 Reason 的同事，各自开 Claude Code session，分别跑 reason network who 互相确认；A 用 reason network <b的session> '...' 提一个只有 B 的 agent 凭会话上下文才能回答的问题。

### 做法 G：接入“现成 CLI 自带 MCP server”的工具（以 idx / ihsg-cli 为例）
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
stdout 只放一个 JSON 文档，其余走 stderr；来源没返回的字段是 null，不做估算。退出码：0 正常、2 用法错、3 网络/来源错、4 未找到、5 离线缓存未命中、6 配置错。
4. 启动 MCP server 并注册：
```sh
idx mcp
idx mcp setup codex
claude mcp add --scope user idx -- idx mcp
```
idx mcp setup <client> 会把二进制绝对路径填进配置，因为 GUI 应用通常不继承 shell 的 PATH。
5. 接好后跑一条真实任务，再不挂 MCP 用原方式做同一件事，比较调用次数、人工步骤、耗时、工具选择是否正确。

### 做法 H：把 AI 助手接进宿主软件内部（以 Blender 扩展 mcp-for-blender-pro 为例）
1. 在 Windows x64 + Blender 4.2+ 中，从 Releases 下载 mcp-for-blender-pro.zip；Edit → Preferences → Get Extensions → menu → Install from Disk，选中 ZIP，启用 mcp-for-blender-pro。
2. 打开 3D Viewport → N → MCP Pro，配置 provider 与模型；必须选支持 tool calling 的模型；要解读视口截图还需模型有图像能力。
3. 先用单助手跑通：
```text
Inspect this scene and explain its object structure before making any changes.
```
```text
Create a simple product-display scene with a pedestal, a camera and three lights. Give the pedestal a matte blue material.
```
观察审批、取消、命名撤销与 viewport_screenshot 是否按预期出现。
4. 核对 21 个工具；其中 execute_code、export_scene、import_asset 是高影响操作。多步任务再换 Manager/Worker/Reviewer 团队链做同一件事，比较单助手与团队链的耗时、人工接管次数、Reviewer 退回次数。

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
4. 成本自测：jevreel measure <video> 报告某个网格尺寸下一张 contact sheet 在你账号上的成本。四步工作流：Index → Screen → Verify → Look closer。

### 做法 J：只读 WhatsApp MCP（Cloudflare 自部署）
1. 准备 Cloudflare 付费 Workers、Node 20+、自己的手机和 WhatsApp 账号。
2. 克隆并安装依赖：
```sh
git clone https://github.com/finereli/whatsapp-mcp
cd whatsapp-mcp
npm install
```
3. 创建 OAuth KV 命名空间，把打印出的 id 填进 wrangler.jsonc：
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
8. 只调用只读工具：list_chats、get_messages、search_messages、unnamed_chats、set_contact_names、sync_now、link_status、relink。不要用来发送消息或多人共用。

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
4. 接入 AI 客户端：方案 A 用 uvx 即席运行；方案 B 命令在 PATH 中时直接写 wechat-mcp / dingtalk-mcp。
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
预期结果：生成 reports/<日時>/report.html；失败或未登录的域进入“未能确认的项目”，而不是被当成“没有问题”；报告中没有明文秘密值。
5. 在 Claude Code 里用自然语言触发和追问：
```text
セキュリティチェックして
前回から新しく出たリスクだけ教えて
```
6. 确认只读边界成立后再逐域增加登录，最后才考虑全量扫描和每周定时。

### 做法 M：把“自主循环 + 工具供给”整套接进来，但只当模板（以 vulnerator-ai 为例）
1. 确认前提：docker、docker compose v2、openssl；一个 OpenRouter API key；能把 kali 容器与宿主机/内网隔开的环境；目标已获书面授权。缺任何一条都不要往下做。
2. 用安装器一键起栈：
```sh
./install.sh
```
参数：--with-juice-shop（同时启动 OWASP Juice Shop 练习靶场）、--no-up（只写 .env 不起容器）、--force（覆盖已有 .env）。
3. 先确认控制面：前门 vulnerator-mcp（内部 :8700）只应暴露 6 个 run 生命周期工具——health()、start_pentest、get_run_status、stream_run_events、steer_run、stop_run。确认它拿不到原始 kali_run，也不能直接打 /v1/chat/completions。
4. 先只在 TUI 里跑靶场，不注册到任何助手：
```sh
docker compose exec -it ooda-agent hermes chat
```
5. 做对照试验：同一靶场、同一目标，先人工按 checklist 跑一遍并记录命令序列、发现数、误报数、耗时；再用 agent 跑一轮同样的目标，比较发现数、误报数、重复命令比例、steer_run 干预次数、stop_run 是否真的停、耗时。
6. 扩到真实目标前先答三个问题：这一轮有没有人逐条复核 agent 发出的每条命令？kali 容器和宿主机/内网隔开了吗？有没有超出授权范围的动作？任何一条不确定，就停在靶场，把它降级为 study。

### 做法 N：把 Claude Code 接到外部数据平台（以 TradingView-Unified-MCP 为例）
1. 安装并打开 Claude Code。下载并解压 TradingView-Unified-MCP 仓库；本机有 Node.js 运行时。
2. 先读仓库 README，补齐原文没写的注册与权限要求。
3. 在解压后的仓库根目录启动 MCP 服务：
```bash
node src/cli.mjs launch
```
4. 回到 Claude Code 检查 MCP server 是否被识别、工具数是否可枚举、每个工具的名称与参数。
5. 只读冒烟：让 Claude 取某标的行情/图表数据，与 TradingView 网页端人工核对 3–5 次；记录一次完整问答的耗时和偏差。不要用盈亏评估这一轮。

### 做法 O：给编码 agent 接 AWS，先只装 aws-core 并在只读权限下小范围试用（以 agent-toolkit-for-aws 为例）
1. 确认前提：目标任务属于 AWS；使用 README 支持的编码智能体；API 调用和脚本执行需要本地已配置 AWS 账号凭据；仅做文档检索或技能发现不需要认证；Kiro、fx 和其他 agent 的手动安装路径要求本机安装 uv。首次接入只装 aws-core。
2. Claude Code：
```text
/plugin install aws-core@claude-plugins-official
```
若提示 Plugin not found，先 /plugin marketplace update claude-plugins-official。
3. Codex：
```text
codex plugin marketplace add aws/agent-toolkit-for-aws
```
启动 Codex 后运行 /plugins，浏览并安装 aws-core。
4. Cursor：Settings → Plugins → Team Marketplaces → Add Marketplace → Import from Repo，指向 aws/agent-toolkit-for-aws；再在 Plugins 面板安装 aws-core。
5. Kiro/fx/其他 agent：手动配置 AWS MCP Server 并另装 skills：
```text
npx skills add aws/agent-toolkit-for-aws/skills
```
6. 先设权限和审计，再放开写操作。README 说明该工具链提供 IAM 条件键区分 agent 动作与人类动作、CloudWatch 指标和 CloudTrail 审计日志；可据此先配置只读或最小权限策略，再逐步放开。
7. 最小试用：选一个 AWS 仓库和一个边界清晰的任务，只安装 aws-core，在沙箱账号或只读权限下运行；先跑未装基线，再跑装后同任务，记录完成、耗时、CloudWatch/CloudTrail 是否能看到动作、权限边界是否成立。

### 做法 P：给编码 agent 接打包插件，先只启用“宣布完成前先验证”一个技能（以 flashmind 为例）
1. 确认前提：Node ≥18；目标客户端支持 MCP；本机有 git；选一个真实仓库和隔离分支/worktree；记录试用前基线。
2. 最轻路径：只接 MCP 服务。在客户端 MCP 配置中加入 flashmind，command 用 npx，args 用 -y、flashmind。
3. 要记忆 + 技能 + 规则全套，跑自动安装器：
```bash
git clone https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent flashmind
cd flashmind
./install.sh antigravity-cli
```
安装后必须打开实际文件核对；原文没有给出规则与技能正文。
4. 只启用 verify-before-done 一个技能，暂不启用其余三个：plan-first、no-invented-code、systematic-debugging。
5. 更新时只替换、不追加：一个服务一个条目；规则文件整体覆盖，共享文件用标记包裹后只替换标记之间内容；技能只留一份。
6. 最小试用两周：选一个真实仓库、只选一个客户端，只装 MCP 记忆 + 规则文件 + verify-before-done 一个技能；记录“未跑测试就宣布已修复”“引入不存在的包/函数/CLI 参数”两类事件计数、返工时长、测试通过率，与试用前同仓库同类型任务对照。

### 做法 Q：先只装 2–3 个“工程习惯”技能，用真实任务对照（以 MiniMax-AI/mcode-stack 为例）
注意证据等级：本次只有 README，没有各 SKILL.md、checklists/、WORKFLOW.md 正文，也没有使用前后对比、缺陷率、节省时间或采用率数据；能照抄的是安装/调用方式和技能清单，具体检查项要打开目标技能目录里的 SKILL.md 再决定是否照做。建议从 long-command-check、independent-review、harness-experiment 三个开始，不要一次装整套 15 个。
1. 确认前提：已安装 MiniMax Code；若走 Claude Code 市场命令，已安装 Claude Code；本地有 git；选一个真实仓库或任务；记录不调用技能时的基线。
2. 安装单个技能（所有项目可用）：
```bash
git clone https://github.com/MiniMax-AI/mcode-stack.git ~/mcode-stack
mkdir -p ~/.agents/skills
cp -R ~/mcode-stack/stacks/ronny/skills/long-command-check ~/.agents/skills/
```
把 long-command-check 换成 independent-review、harness-experiment 等技能名可装其他技能。也可把技能放到项目级 .minimax/skills/、.claude/skills/ 或 .agents/skills/；全局还会读取 ~/.claude/skills/、~/.codex/skills/。预期结果：目标目录下出现包含 SKILL.md 的技能子目录。
3. 在新会话中查看并调用：
```text
/skills
/long-command-check
```
也可以不手动调用，让代理根据技能描述自行加载。
4. 安装整栈为本地插件（可选，先不要一次启用全部）：先看本地插件目录：
```bash
mcode plugin marketplace list
```
把 stacks/ronny 整个目录复制到该命令显示的本地插件目录，然后在 MiniMax Code 打开 /plugins，按 Ctrl+R 刷新；在面板中按空格启用或禁用。注意 mcode plugin add 只从官方目录安装，不接受 GitHub URL 或本地路径。
5. 从市场安装（MiniMax Code 桌面端，可选）：打开 Plugins，选择 Add marketplace，输入 MiniMax-AI/mcode-stack；每个 stack 会显示为一个可安装/更新/卸载的插件。README 说明该功能在逐步开放，部分版本可能还没有。
6. 在 Claude Code 中安装同一目录（可选）：
```bash
/plugin marketplace add MiniMax-AI/mcode-stack
/plugin install ronny@mcode-stack
```
7. 打开你选中的技能正文再照做：先打开 ~/mcode-stack/stacks/ronny/skills/<skill>/SKILL.md，核对具体检查项、输入条件和停止条件。检查清单也可直接读 checklists/ 下的纯文本；工作流读对应 stack 的 WORKFLOW.md。不能复述就先不要把它写进团队流程。
8. 最小试用：选 2–3 个与当前痛点最直接的技能，优先组合 long-command-check + independent-review + harness-experiment；在真实任务中调用，同时保留一个不调用技能的对照会话。记录：技能是否被正确发现、/skills 是否列出、调用后是否按预期执行；长命令阻塞/人工中断/重试/后台任务失败或丢失/等待时间；同一 diff 的干净上下文评审发现的问题数、普通评审漏掉的问题数、无效评论数、评审耗时；同一评估任务重复运行的通过率波动、翻转任务数量；团队是否愿意持续调用。若只有安装成功、没有可观察任务结果改善，就停在 try。

### 做法 R：把网页聊天 AI 经本地 bridge 接到 VS Code（以 snapgent-connector 为例）
选 R 的条件：你在 Edge/Chrome 的聊天站点里用 AI，希望它经本地 bridge 和 MCP 读改 VS Code 工作区，且只做非敏感、可丢弃仓库的小范围试用。原文只有 README，没有独立安全审计、性能基准或用户案例；扩展是 unpacked 加载，涉及站点权限和本地 MCP 写权限，先隔离验证。
1. 前提检查：准备 Edge 或 Chrome（Manifest V3）、VS Code、Windows/macOS/Linux 之一；macOS/Linux 需要 Python 3.9+；使用期间 bridge 必须运行；先下载并解压最新 release（当前 V3.3）；目标项目要在 VS Code 打开。
2. 加载扩展：打开 edge://extensions 或 chrome://extensions，启用 Developer mode，点击 Load unpacked，选择 snapgent-extension 文件夹；工具栏出现 snapgentV3 图标。
3. 设置 MCP 目标：在 VS Code 中打开要操作的项目文件夹，再在聊天栏点击 Start；bridge 可以先于 VS Code 启动，agent 会等待 workspace 可用，且 README 说明不会回退到 Snapgent release 文件夹。
4. 启动 bridge（按系统选择）：Windows 双击 start.bat；macOS 双击 MacOS_Start.command；Linux 在解压后的 release 文件夹打开终端并运行：
```bash
bash Linux_Start.sh
```
保持 bridge 窗口或终端开启。
5. 开始会话：打开支持的 AI 聊天站点并新建聊天；在 VS Code 打开项目文件夹后，在聊天栏点击 Start，然后用自然语言描述任务。README 示例提示词是：
```text
Inspect the files in my project and explain how the login flow works.
Add a search bar to the books page and wire it to the existing API.
```
6. 运行要点与排障：保持 bridge 窗口开启，关闭会断开 agent；保持目标项目在 VS Code 打开；Arena 使用 Direct 模式；Gemini 或 Kimi 在长会话中停止使用工具时，提醒它使用 snapgentV3 commands 或新建聊天。扩展栏缺失时检查扩展是否启用、当前聊天站点是否允许访问并刷新标签页；bridge offline 时重新启动对应 launcher。
7. 最小对照：先不接 connector，用同一个 AI 聊天手动复制粘贴完成 2–3 个边界清楚的任务，记录耗时、人工复制粘贴和终端步骤数、返工次数。再接 connector 重复同类任务；每次接受修改前用 git status 和 git diff 检查改动范围。记录任务完成情况、从开始到首个有用结果的时间、总完成时间、人工步骤数、工具调用失败次数、bridge 断连次数、返工次数、非预期文件改动数；如果测试仓库有测试或构建命令，记录是否通过。若出现 bridge 不稳定、AI 不使用工具、权限过大或工作区意外改动，应停止扩大范围。

### 做法 S：在垂直技术栈里装官方技能包，先验证路由再接 MCP（以 expo/skills 为例）
注意证据等级：原文是官方 README，给出了安装/更新命令、按 agent 分流的安装路径、技能分组和示例提示词；没有给出 SKILL.md 实际正文、误选率或“装了之后工作变好多少”的任何度量。能照抄的是安装方式和验证路由的方法。
1. 确认前提：已有一个 Expo / React Native 项目；选定一个受支持的 AI 编码 agent；接受部分 services 技能依赖付费 EAS。
2. Claude Code：
```text
claude plugin install expo@claude-plugins-official
```
也可以在 Claude Code 内执行：
```text
/plugin install expo@claude-plugins-official
```
3. Codex：
```text
codex plugin add expo@openai-curated
```
也可以在 Codex 内打开 /plugins，从 OpenAI-curated 市场安装 expo。
4. 其他 agent 在项目根目录执行：
```text
npx skills@latest add expo/skills --skill '*' --agent <你的 agent>
```
说明：这条命令选的是“全部 Expo 技能”，不是“全部 agent”；不加 --agent 时 CLI 会询问装到哪里。
5. 装完后重启或刷新 agent 会话，让它能发现已安装的 SKILL.md。
6. 用示例提示词验证路由：
```text
Build a native-feeling Expo Router screen with tabs, modals, and animations.
```
```text
Create an EAS workflow that builds previews on pull requests.
```
```text
Help me upgrade this app to the latest Expo SDK.
```
观察点：agent 是否根据任务上下文和各技能描述自动选中正确技能；请求含糊时是否先加载 expo-overview 再分发。
7. 需要实时动作时再接 MCP。Claude Code 和 Codex 的 expo 插件已内置 MCP 配置；其他 agent 或单独接，按 Expo MCP setup guide 配置。
8. 更新与反馈：
```text
npx skills@latest update
npx --yes @expo/agent-cli@latest feedback
```
Claude Code / Codex 的插件安装通过各自官方插件市场更新。

### 做法 T：把本地工作文件夹建成只读索引，经 MCP 给 agent 补检索上下文（以 kensaku 为例）
注意证据等级：README 给出了安装、索引范围、排除项、CLI 检索命令、MCP 配置、只读边界和性能基准；性能数字是作者在 Linux 8 vCPU、SSD、10 万文件下的自测，不是工作效果研究。先限定一个文件夹、保持只读、做 1–2 周前后对照。
1. 确认前提：本机可安装桌面应用，能接受首次运行的未签名警告；先只选一个工作相关文件夹；kensaku-cli 可从命令行调用。
2. 从 latest release 下载对应平台安装包。Windows 在 SmartScreen 中点 More info → Run anyway；macOS 在 System Settings → Privacy & Security 点 Open Anyway。每个 release 同时包含 kensaku-cli 和 SHA256SUMS。若要从源码构建（Rust stable、Bun 1.1+、平台 webview 库）：
```bash
git clone https://github.com/yjid/kensaku
cd kensaku
bun install
bun run tauri build
```
3. 首次运行选择要索引的文件夹和排除项，可选下载 OCR 或模型包；首次扫描期间搜索已可用。默认跳过隐藏文件、常见构建目录，以及 .pem、.key、.pfx 等凭据文件，并尊重 .gitignore 和 .cursorignore。索引包含文件名和抽取文本，应视为敏感数据，不要同步到共享位置。
4. 先用 CLI 验证检索是否覆盖你的工作材料：
```bash
kensaku-cli search 'docker error'
kensaku-cli search 'invoice' --ext pdf --since 30d
kensaku-cli state
```
5. 把本地索引接入 MCP 客户端（只读）：command 填 kensaku-cli，args 填 mcp。
6. 需要 HTTP 接入时再启动本地服务：kensaku-cli serve；README 说明它只监听 loopback，并要求配置目录中的 bearer token。
7. 设定 agent 使用边界：保持默认只读，不把索引当可写工作区；README 说明 agent 工具不能改文件，reindex 默认关闭；响应有大小预算，文件内容作为数据返回、不作为指令。
8. 最小对照 1–2 周：选一个包含文档、截图、代码或日志的项目文件夹建立索引；保持 agent 只读，接入一个 MCP 客户端。用固定任务记录从开始到找到目标的时间、前 5 条结果是否命中、是否需要退回手动翻目录、agent 任务是否因缺少上下文而重试，以及 OCR 误识别和隐私暴露事件。

### 做法 U：把本地公开数据集做成窄工具 MCP（以 radar-cnpj-mcp 为例）
注意证据等级：README 给出安装/接入命令、7 个工具、过滤器、示例问题、CLI、隐私默认、MIT、CI badge、36 stars；没有验证指标或基准测试。“毫秒级、7000 万+、几秒下载、导入几分钟”和示例数字均为作者陈述或示例，未独立验证。只覆盖巴西 CNPJ 数据。
1. 前提：Node.js 20+；明确目标州；用于 B2B 勘探或市场摸底；先只下一个州。
2. 下载目标州的数据库：
```sh
npx -y radar-cnpj-mcp baixar --ufs SP,MG
```
把 SP,MG 换成你的目标州。随后用 status 确认参考月份和已导入 UF。
3. 先走 CLI，不接 agent，做校准：
```sh
npx radar-cnpj-mcp status
npx radar-cnpj-mcp contar --cnae 4520-0/01 --uf SP --agrupar municipio
npx radar-cnpj-mcp buscar --cnae 4520-0/01 --municipio Campinas --sem-mei --limite 20
npx radar-cnpj-mcp buscar --cnae 4520 --municipio Campinas --csv oficinas.csv
```
4. 接入 Claude Code：
```sh
claude mcp add radar-cnpj -- npx -y radar-cnpj-mcp
```
其他客户端在 MCP 配置里 command 填 npx，args 填 -y 和 radar-cnpj-mcp。
5. 按“先定位代码、再计数、再拉明细、最后导出”的顺序向 agent 提问。可用 README 模板：
```text
Quantas oficinas mecânicas ativas existem em Campinas?
Em quais cidades de SP há mais clínicas odontológicas?
Exporte para CSV os restaurantes do bairro Pinheiros.
```
6. 用同一问题做 agent vs CLI 对照：记录 agent 计数是否与 CLI 一致、CNAE 映射是否需要纠正、导出字段是否完整、MEI 电话/邮箱被遮蔽比例、从提问到可用名单的时间。若 CNAE 映射频繁出错，或业务根本不需要巴西企业数据，停在 try。
7. 维持新鲜度和隐私：每月重跑一次 baixar 更新数据库；用 status_base 或 status 确认参考月份和已导入 UF 再信任任何数字；默认隐藏 MEI 电话与邮箱；B2B 接触遵守 LGPD，报价要与对方的活动相关，并提供“不再联系”渠道。

### 做法 V：让编码代理在写代码前读到仓库专属的可靠性规则（以 trustabl/agent-reliability-skills 为例）
注意证据等级：本次只有 README，版本 v0.1.0-rc.1、42 stars；没有生成的 SKILL.md 样例、没有检测规则正文、没有案例或前后对比数据；README 中 Claude Code/Cursor/Claude Desktop 的 workspace 报告状态均为 pending。先在一个仓库试点，生成后人工审查再让代理使用。
1. 确认前提：Node.js 22+；目标仓库有依赖清单；仓库确实使用受支持的 agent SDK；客户端支持 MCP。先只选一个仓库试点。
2. Claude Code 安装 MCP server：
```bash
claude mcp add agent-reliability-skills -- npx -y https://github.com/trustabl/agent-reliability-skills/releases/download/v0.1.0-rc.1/agent-reliability-skills-0.1.0-rc.1.tgz
```
3. Cursor 安装：在项目内 .cursor/mcp.json 或 ~/.cursor/mcp.json 的 mcpServers 下加 agent-reliability-skills，command 为 npx，args 为 -y 和上面的 tgz URL。
4. 调用 trustabl_forge 工具生成 skill。参数：path（仓库绝对路径；试点时按必填处理）、output_path（通常设为 .claude/skills/trustabl-pre-coding/SKILL.md）、可选 policy、可选 lang。
5. 生成后先人工审查 SKILL.md：识别到的 SDK 是否正确、规则是否适用、有没有敏感信息；确认后再让编码代理读取使用。只有提供 output_path 才会写文件；路径必须留在仓库内；已有文件只有在是 Forge 生成时才会被替换。
6. 首次调用会下载 analyzer 二进制和 Trustabl 规则仓库，之后从缓存离线工作。若 GitHub 匿名限流，可设置 GITHUB_TOKEN；也可用 TRUSTABL_BIN 指向本地 analyzer 构建。
7. 最小对照：先记录基线（现有测试通过率、lint/类型检查结果、团队已有的可靠性扫描 findings、人工 review 中与可靠性相关的意见）；生成并审查 SKILL.md 后，让编码代理完成 1–3 个同类小任务，再用同一套测试和检查比较。若 SDK 识别错误、规则不适用或引入敏感信息，停止试用并回到人工规则清单。

### 做法 W：把真实 iPhone 的界面操作接到 MCP，但只用备用机做只读/可逆试用（以 poki 为例）
注意证据等级：README 给出安装/启动/注册命令、依赖清单、两种分发方式、示例任务和真机配对要求；项目 v0.1.0、126 stars、AGPL-3.0-only。只是作者主张、无数据支撑：“Gets faster with use”；真机只在中国区界面语言的 iPhone 上验证过；真机仅支持竖屏；屏幕内容会发送到模型服务；写操作会真实发生，第三方 App 自动化可能违反 ToS。先只跑只读任务，再跑可逆写操作。与做法 Z 的差异：poki 是 macOS 工具链 + 备用 iPhone，iphone-control 是 Linux Docker 或 Apple Silicon Mac + 专用 iPhone；两者都先低风险。
1. 核对硬性前提：macOS 15+；预构建包只提供 Apple Silicon arm64；完整版 Xcode、Rust、Node.js 24+、ffmpeg；预构建包还需 Python 3；一台可清空的备用 iPhone，真机先用 USB 与 Mac 配对并开启开发者模式。不满足就停在 study，只保留“MCP 接真机”思路。
2. 源码方式启动服务（终端 A 长期运行）：
```sh
git clone https://github.com/JosssphZhou/poki.git
cd poki
./bin/setup
npm start
```
3. 或使用预构建 macOS arm64 包：
```sh
tar -xzf poki-v0.1.0-macos-arm64.tar.gz
cd poki-v0.1.0
npm ci --no-audit --no-fund
npm start
```
4. 把 MCP 服务器注册到客户端（另开终端，在同一目录执行）：
```sh
claude mcp add --scope user poki-mcp -- node $PWD/src/stdio.mjs
```
前提：终端 A 的 npm start 保持运行；$PWD 必须是仓库/包目录；路径含空格时给 $PWD/src/stdio.mjs 加引号。
5. 找到设备并跑第一个只读任务：
```sh
node bin/call.mjs list_devices
poki 'Search esp32 in Chrome and summarize the top result'
```
只有一台已连接设备时会自动选中；多设备需加 --device '<device UUID>'。
6. 先立安全边界再跑写操作：先用只读任务（搜索、读屏、总结）每类 3 次；再跑可逆写操作 3 次（例如给自己发一条消息、新建一条备忘），全程盯着屏幕；不要用主力机，不要从付款、群发、不可逆按钮开始。每类任务重复第二遍，检验“重复执行更快”是否真实存在。

### 做法 X：把真实手机 WebView/H5 的现场调试经自托管网关接给 agent（以 remote-webview-debugger 为例）
注意证据等级：README 给出部署命令、SDK 接入片段、claude mcp add 命令、HTTP/HTTPS 对照表、三种部署方式和安全配置；项目 SDK 0.3.0、51 stars、MIT。隐私承诺、像人一样点击输入的能力、掩码效果都只有作者主张，没有第三方验证或成功率数据；没有定时/事件触发、后台监控或无人值守轮询，不要外推成通用移动端自动化平台。
1. 起网关。前提：有 Docker；选定手机和 agent 都能访问的地址。
```bash
docker run -d --name rwd -p 8080:8080 -v rwd-data:/data -e RWD_ADMIN_PASSWORD='change-me' ghcr.io/zanel1u/remote-webview-debugger:latest
```
打开 http://<your-host>:8080，用 admin + 该密码登录。数据在 rwd-data 卷；升级是 pull 新 tag 后重建容器。也可用二进制 ./rwd serve --addr :8080，或用 deploy/platform 的 Docker Compose。
2. 让页面在线。前提：先在控制台建项目拿到 app key（形如 rwd_pk_…）。在页面中加载 SDK 并调用 run，或 npm install remote-webview-debugger 后 import。App 内则由原生代码在 document start 注入同一脚本。预期结果：手机上出现带设备码的小胶囊，可点“请求协助”。
3. 接入智能体。前提：在控制台建 API key。
```bash
claude mcp add --transport http rwd https://rwd.example.com/v1/mcp --header 'Authorization: Bearer rwd_sk_live_…'
```
然后用自然语言下任务，带上设备码，例如：Connect to device K7Q2-9M4X and find out why the checkout total shows --. 预期结果：MCP 客户端列出 rwd 服务，工具可枚举，且设备端尚未批准前不能操作。
4. 先定 HTTP 还是 HTTPS。前提：决定因素是被调试的页面，不是网关。https 页面不能加载 http 脚本、不能开 ws://；被调试页面是 http:// 时网关纯 HTTP 可用；浏览器或 iOS WKWebView 里的 https:// 必须给网关 HTTPS；Android WebView 里的 https:// 仅当 debug 构建放开混合内容才可用纯 HTTP。纯 HTTP 下 API key 与控制台密码明文传输，只放在可信网络。
5. 设定授权与隐私边界。前提：从最低权限起步，确认行为正常再提级。设备端批准分级 observe / interact / advanced；可开自动批准，但试点先手动。敏感动作在元素上加 data-rwd-confirm，要求二次确认。智能体操作期间锁屏，页面显示发光边缘、agent 光标和带计划步骤的任务卡；用户可随时 take over / hand back / end。掩码在快照、截图、console、网络数据里统一生效。审计日志记录谁做了什么，不含页面内容。API key 可设级别 / 有效期 / IP 白名单。
6. 最小试用。前提：全程用测试账号与隔离测试环境，先用内网 http:// 测试页。起网关、建项目拿 app key、建 API key；准备一个内网测试页，人为植入一个已知缺陷；真机打开该页，记住设备码；接入 MCP，把授权级别设为 observe，先只让 agent 读快照/console/network 并说出它看到的现象；升到 interact，让它执行复现路径；在同一页面上加 data-rwd-mask 和一个密码框，检查快照、截图、console、network body 里是否出现明文。预期结果：掩码处应为 0 明文；用户接管可用；审计日志能还原操作者和动作。
7. 做对照并决定去留：同一台测试设备、同一个测试页、同一个已知缺陷，先记录人工无 USB 场景下能否当天给出根因；再接 agent 做同样定位。记录定位耗时、首轮定位是否命中、需要几轮追问、用户 take over 次数与时机、设备端从发起到批准的耗时、误批准次数、agent 是否写入脏数据、会话中断率、SDK 是否拖慢页面加载、审计日志能否完整还原。若 observe 阶段就拿不到有用的 console/network 证据，或掩码抽查出现明文，或只能靠自动批准才能用，停在 study。

### 做法 Y：从现成组件目录挑 1–2 个组件小范围试用（以 davila7/claude-code-templates 为例）
注意证据等级：README 给出组件类型与数量、可复制安装命令、--health-check、Analytics、Conversation Browser、/stack 和 1.31.0 移除参数清单；仓库 33,155 stars 只是关注度。原文没有组件质量评测、成功率、安装后效果对比数据；安装会写入项目配置、hook 是可执行脚本、MCP 组件会接外部服务凭证。先预览、只装 1–2 个、保留回滚。
1. 先预览再装：打开 aitmpl.com，搜索组件，逐个查看它会写入哪些文件；再把要装的组件组合成一条命令。这一步不要跳过——安装动作等于往仓库写配置。
2. 选一个干净分支或临时仓库，确认 Node/npm、npx、Claude Code 可用；Mods 类要求 Claude Code 2.1.287+。
3. 不确定装什么时先交互式浏览：
```bash
npx claude-code-templates@latest
```
4. 只装 1–2 个组件，按风险从低到高选。示例命令：
```bash
npx claude-code-templates@latest --hook git/conventional-commits --yes
npx claude-code-templates@latest --loop engineering/docs-sweep-loop --yes
npx claude-code-templates@latest --mcp database/postgresql-integration --yes
```
其他类型示例：--skill、--agent、--command、--setting、--mod。安装 loop 会自动补齐该 loop 依赖的组件，这是“主动推进”类能力最省事的切入点。
5. 装完先做安装健康检查：
```bash
npx claude-code-templates@latest --health-check
```
预期结果：命令返回安装与项目配置诊断；若报错，先回滚，不要继续叠加组件。
6. 用 stack viewer mod 记录当前装了哪些组件，便于回滚；然后在 Claude Code 里执行 /stack：
```bash
npx claude-code-templates@latest --mod ui/stack-viewer
```
7. 需要观察使用情况时启动 Analytics（127.0.0.1:3333）：
```bash
npx claude-code-templates@latest --analytics
```
需要翻查历史会话时启动 Conversation Browser（127.0.0.1:9876）：
```bash
npx claude-code-templates@latest --chats
```
8. 最小对照：同一类任务在装前装后各做 3–5 次，保持任务同质。记录 loop 是否按间隔自动跑、停止条件是否触发、hook 拦截次数、MCP 接入后人工粘贴外部数据或手工建 PR 的次数、因权限/超时导致的会话中断次数；不要用 --analytics 的会话时长或工具调用数当成效指标，它只说明用得多。
9. 版本漂移：1.31.0 移除了 --plugins、--skills-manager、--command-stats、--hook-stats、--mcp-stats、--agents、--chats-mobile、--teams、--2025、--studio、--sandbox、--tunnel、--create-agent、--list-agents、--update-agent、--remove-agent、--clone-session；照抄旧教程命令会失败。
10. 止损：若某个组件装后一周内没有产生可指认的行为改变（自动执行、拦截、减少手工步骤中的任一），或 hook 脚本引入了不愿接受的写权限/外部调用，直接卸载并记录到不适用清单。

### 做法 Z：用专用 iPhone 和专用 Apple ID 做真实 iPhone 操作（以 iphone-control 为例）
注意证据等级：仅来自 GitHub README，有安装命令、工具表、日常命令和一个打开 Clock 并启动秒表的演示说明；没有基准测试、成功率、延迟对比、用户案例或第三方评测；仓库只有 31 stars。README 工具表列 15 个工具，Features 文案写 17 个，口径不一致，实际以安装版本为准。“减少往返”“可无人值守”“自动恢复/重签”是作者主张，未给量化数据。整机控制风险高，只在专用设备和专用账号上试。
1. 核对前提：iPhone iOS 17+，用数据线连接；准备专用免费 Apple ID；主机为带 Docker 的 Linux 或 Apple Silicon Mac；只在自己拥有的设备和账号上使用。全程在 MCP 客户端保留工具调用确认，避免 agent 误触支付、删除、发送。
2. Linux + Docker 安装并启动：
```bash
git clone https://github.com/Derrors/iphone-control.git && cd iphone-control
cp .env.example .env
docker compose up -d --build
docker exec -it iphone-control iphone-control setup
```
setup 是引导式配置，可重复运行，需按提示在手机上完成配对、开发者模式、Apple ID 登录和安装 WebDriverAgent。
3. 把 MCP server 注册到 Claude Code：
```bash
claude mcp add iphone -s user -- docker exec -i iphone-control iphone-control mcp
```
注册后重开 Claude Code 会话。预期结果：客户端出现 iphone 服务，工具可枚举，实际数量以当前版本为准。
4. macOS 直接跑二进制（Docker 不能透传 USB）：
```bash
V=v0.1.3
curl -fsSL https://github.com/Derrors/iphone-control/releases/download/$V/iphone-control-$V-macos-arm64.tar.gz | tar xz
mkdir -p ~/.local/bin && install -m 755 iphone-control-$V-macos-arm64/iphone-control ~/.local/bin/
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile && source ~/.zprofile
iphone-control daemon
```
另开终端：iphone-control setup；iphone-control mcp-config。daemon 终端需保持打开；mcp-config 会打印注册命令。
5. 用自然语言下发任务。README 示例：在 Claude Code 里说 Open Clock, switch to the stopwatch and start it. 先做三类低风险任务：打开 Clock 并启动秒表、打开指定 URL、用 iphone_wait_for 等待某个文本出现；稳定后再用 iphone_batch 串 2–3 步。不要先用支付、删除、发送类操作试。
6. 日常运维与排障：
```bash
docker exec -it iphone-control iphone-control status
docker exec -it iphone-control iphone-control doctor
docker exec -it iphone-control iphone-control resign --force
```
doctor 逐层检查 USB 到 WebDriverAgent 并给修复提示；resign 在签名快过期时重签。data/ 含配对记录、Apple ID 会话和签名密钥、自动解锁密码，要备份，绝不提交或分享。

### 做法 AA：把数据库语义层与个人知识库接给代理（以 auto-ontology-mcp 为例）
注意证据等级：原文给出可直接复制的安装命令、客户端配置、工具调用序列、demo 输出和验证示例；没有独立效果数据；text-to-SQL 静默错误减少、个人知识库比 markdown wiki 更可信等主要是作者主张。先用 demo 库跑通，再接只读真实库。
1. 前提：安装 uv。没有 uv 无法用 uvx 启动。
2. 创建并注册 demo 数据库（建议先跑）：
```bash
uvx --from git+https://github.com/gogoymh/auto-ontology-mcp auto-ontology-mcp demo
```
原文说明 demo 是合成零售库：11 张表、3200 条订单。
3. 接入 Claude Code：
```bash
claude mcp add auto-ontology -- uvx --from git+https://github.com/gogoymh/auto-ontology-mcp auto-ontology-mcp
```
其他客户端 command 均为 uvx，args 均为 --from、git+https://github.com/gogoymh/auto-ontology-mcp、auto-ontology-mcp。
4. 按顺序发出提示词跑通 demo：
```text
Use auto-ontology to build the ontology for the demo datasource: review the proposed joins, model every table, then save useful SQL attributes.
Which states brought in the most delivered revenue in 2024?
What was return on ad spend last quarter?
Remember this.
Export my knowledge base for Obsidian.
```
预期结果：第 2 条应返回营收示例（原文示例为 316.8、4 条订单行）；第 3 条应被判断为数据无法回答；第 4 条附一张收据、账单或书摘；第 5 条产物写到 ~/.auto-ontology-mcp/wiki/knowledge。
5. 接入自己的数据库（只读账号）：
```bash
uvx --from git+https://github.com/gogoymh/auto-ontology-mcp --with 'psycopg[binary]' auto-ontology-mcp add shop 'postgresql+psycopg://readonly_user:pass@host:5432/db' --schemas sales,geo
```
客户端配置的 args 里也要加同样的 --with，服务器才能加载驱动。
6. 个人知识库用法：第一次保存时自动创建 ~/.auto-ontology-mcp/knowledge.sqlite。让模型调用 define_entity、add_records、save_concept，每条记录带 source。查询时模型先 check_answerable，再 run_sql，再 get_source 给出处。
7. 导出 Obsidian：
```bash
uvx --from git+https://github.com/gogoymh/auto-ontology-mcp auto-ontology-mcp export-wiki -o ~/vault/ontology
```
vault 是单向视图，Obsidian 里的编辑不会回读。
8. 安全配置：使用只读数据库账号；共享机器上设 AUTO_ONTOLOGY_ALLOW_DATASOURCE_TOOLS=0，只允许 CLI 添加数据源；注意数据源 URL（含密码）以明文存在 ~/.auto-ontology-mcp/ontology.db。远程 HTTP 需 serve --transport http --port 8765 --token ... 加 cloudflared 或 ngrok。

### 做法 AB：从一条社交推荐里只安装一个规则插件，先做启用/不启用对照（以 andrej-karpathy-skills 为例）
1. 前提：已安装并登录 Claude Code，能访问插件市场/对应 GitHub 仓库。只把这条推文当 try；原文严重截断，只有第一项有完整安装命令，第二项被截断，后续 5 项未出现。不要根据标题或推文语气补写其余仓库或提示词。
2. 安装可复现的第一项：
```bash
/plugin marketplace add forrestchang/andrej-karpathy-skills
```
预期结果：插件市场命令成功，Claude Code 中能看到该插件。若安装失败或看不到插件，停止，不要继续推测。
3. 人工核对插件实际提供的 4 条编码规则文本：规则内容是什么、适用语言和项目类型是什么、和团队现有约定是否冲突。读不到正文就停在 study，只记录安装命令。
4. 选一个小仓库或独立分支，准备 2–3 个代表性编码任务（小功能、缺陷修复、局部重构）。先在不启用插件时跑一遍，保存提示词、diff、测试结果和人工 review 记录；再启用插件，用同一提示词、同一环境重跑同样任务，保存同样材料。比较净增代码行数、测试通过率、人工 review 需修改行数、返工轮次、规则被违反的次数。
5. 若规则与项目冲突、测试/检查退化，或没有可观察改善，禁用或卸载插件；不要因为 GitHub star 数高就把它写进团队默认配置。

### 做法 AC：接入只读分析数据源，强制输出取数口径（以 Yandex Metrika MCP 为例）
选 AC 当你的工作涉及 Yandex Metrika 站点分析，想让 Claude/Cursor/Codex 直接取数，并且每次回答都带日期、时区、采样状态和过滤器。它的价值不只是“又一个连接器”，而是示范“把取数口径当作工具输出的一部分强制返回”。若你不用 Yandex Metrika，只需读它的输出可核验设计，不必安装。注意证据等级：README 给出安装命令、13 个工具、3 个提示词、凭据存储与隐私默认；版本 1.0.0、MIT、126 stars。可核对的是设计与命令；没有给出与 Yandex 后台人工核对的样例差异、没有性能数据、没有错误率；“numbers you can verify”“strict accuracy refuses sampled data”的实际效果没有对比数据。README 承认只在 macOS 上做过真实登录与报表验证，Windows/Linux 及其他客户端的情况未在本文档中给出结论；文档主体是俄语，本次材料只有英文 README，weekly_review 提示词内容、导出上限、采样拒绝的具体触发条件无法核实。数据会发送给 AI 客户端及其模型提供方，token 不会。
1. 核对前提：Node.js 22.13+；一个 MCP 客户端；真实取数时需有对应计数器权限的 Yandex 账号（README 说明无需自建 API key、无需自建 OAuth 应用）；接受数据发送给 AI 客户端及其模型提供方；只读，无写接口、无裸 HTTP 工具。
2. 安装（一条命令写入客户端配置并自动备份）。--client 可选 claude-desktop、claude-code、cursor、vscode、windsurf、codex：
```bash
npx -y @dev-crabs/yandex-metrika-mcp setup --client claude-desktop
# 或 --client claude-code、cursor、vscode、windsurf、codex
```
Claude Code 也可单独装：
```bash
claude mcp add --scope user yandex-metrika -- npx -y @dev-crabs/yandex-metrika-mcp
```
Windows 上部分客户端无法直接启动 npx，setup 会写 cmd 加 /c npx 的形式；手写配置时按这个改。
3. 重启客户端，先不接真实账号，用合成连接 conn_demo 试跑：
```text
Compare the last two complete weeks by traffic source.
```
预期结果：工具被正确调用，输出里确实带日期区间、时区、采样状态、过滤器。这是判断“可核验”是否落到实处的第一条硬标准；缺一项就不算通过。
4. 接真实计数器：先让助手调 metrika_list_counters 和 metrika_describe_counter，拿到站点、时区、以及目标（goal）及其 ID；再调 metrika_catalog 拿预设、指标（含聚合规则）、维度、周期预设。这一步是把“口径”作为输入喂给模型，而不是让它自由发挥。
5. 取数三件套：metrika_run_report 做单周期；metrika_compare_periods 在两个周期完全相同条件下对比，给绝对值、百分比、百分点变化；metrika_run_timeseries 按日/周/月分桶，按精确日历边界切。检查是否按计数器时区切日历周期、默认只取完整日、严格精度模式是否拒绝采样数据而不是标成精确、是否用 API 总计而非可见行求和。
6. 大批量导出走：metrika_export_report 起后台任务 → metrika_get_job 轮询 → metrika_read_artifact 取产物（带校验和与 manifest，重启后可续跑）；要停就 metrika_cancel_job。核对 CSV 行数与 manifest/校验和是否自洽，以及中断后能否续跑。
7. 安全默认值确认：token 存在操作系统凭据库（macOS Keychain / Windows Credential Manager / Linux Secret Service）；没有凭据库时服务器默认拒绝保存，除非你显式选择“仅本人可读的未加密文件”；标签中的 URL 查询串默认被剥离；无遥测。团队共享场景用多连接隔离，别共用一条连接。
8. 最小试用约 15 分钟：用第 2 步装好，重启客户端；不接账号，用 conn_demo 问一句，确认输出带日期区间、时区、采样状态、过滤器；接真实计数器，记下时区与一个 goal ID；挑一个每周本来就要手做的报表，用 metrika_compare_periods 复现它；同一问题换成长周期，走导出三件套拿到 CSV。判断指标：口径零歧义率（抽查 5 次回答，5/5 都写明日期区间、时区、采样状态、过滤器，缺一项算不通过）；与 Yandex 后台手查值比对，重点看可见行求和 vs API 总计的差异；故意选会触发采样的区间，确认它拒绝而不是给一个看起来精确的数；同一问题从提问到可用结论的追问/纠错轮次；从提问到可贴进周报的对比表耗时；导出 CSV 行数与 manifest/校验和是否自洽、中断后能否续跑。若采样识别或日期/时区标注在实际使用中缺失，退回 study，只借设计思路，不纳入默认做法。

## 怎么判断变好了
可观察指标分五类：通路、工具清单、任务效果、成本与停止原因、安全负向指标。各做法的最小试用和判断指标已在对应步骤末尾写明；这里给通用判断和新增 AC 的检查点。
- 通路：每条路径要看到注册成功之外的回执或冒烟结果。例如 jevcrawl 看 doctor；arcmira 看 arcmira_describe；reason network 看 who；Blender 看 MCP Pro 面板并跑通检查场景→建对象→复制排列；WhatsApp MCP 看 /debug 的 paired；claude-security-scan 先 --demo --open 再 --skip repos；vulnerator-ai 看四容器健康、前门只暴露 6 个 run 生命周期工具；AWS 看 aws-core 插件和 MCP Server 可见；flashmind 看 MCP 服务和规则文件路径；mcode-stack 看 /skills 是否列出；snapgent 看图标与 bridge；expo/skills 重启后看技能被发现；kensaku 用 kensaku-cli search 命中已知文件；radar-cnpj-mcp 看 7 个工具、status 参考月份和已导入 UF；trustabl 看 MCP 服务与 SKILL.md 写入；poki 看 list_devices 返回设备 UUID；iphone-control 看 setup/doctor 和 iphone 服务；remote-webview-debugger 看控制台登录、设备码胶囊、observe 能读快照/console/network；davila7/claude-code-templates 看 --health-check 和 /stack；auto-ontology 看 demo 库和五条示例；AB 看插件市场命令、插件可见、规则文本可读；AC 看 conn_demo 冒烟输出是否带日期区间、时区、采样状态、过滤器。
- 工具清单：注册后必须去客户端确认工具真的出现、数量可枚举；不能把“注册成功”当“验证完成”。AC 要确认 13 个工具、3 个提示词按实际版本可枚举，且没有裸 HTTP 工具；其他路径同样以实际版本为准，不拿 README 文案数量当验收。
- 任务效果：同一组真实任务，挂载 vs 未挂载/人工，比较任务完成率、答案正确性、人工步骤数、耗时、工具报错次数。AC 专项：同一周期、同一过滤器、同一 goal，把 metrika_compare_periods 的结果与 Yandex 后台手查值比对；抽查 5 次回答是否 5/5 带日期区间、时区、采样状态、过滤器；故意选会触发采样的区间，确认拒绝而不是冒充精确；看导出 CSV 行数与 manifest/校验和是否自洽。
- 成本与停止原因：AC 看一次完整问答耗时、导出任务轮询次数、中断后续跑是否成功；其他路径按各自步骤末尾记录调用次数、人工步骤、费用和停止原因。所有工具都不要把 star 数、会话时长或工具调用数当成效指标。
- 安全负向指标：AC 确认 token 存 OS 凭据库或按默认拒绝保存、标签 URL 查询串被剥离、无遥测、多账号连接隔离、数据外发范围可接受；其他路径按各自步骤末尾检查越权访问、读取工作目录之外文件、执行非预期命令、明文秘密、非预期写操作。
- 对照试验设计：所有系统从同一入口、同样预算、同一个问题出发，抓到的内容交给同一个回答 LLM，由同一个 judge 打分，只让被试工具这个变量变。AC 的对照是：同一个 Yandex 计数器、同一个周期和过滤器、同一个 goal，比较 agent 经 MCP 取数与人工在后台手查/手做报表的耗时、返工次数、数字是否对得上、输出是否带口径。没有对比性指标的工具，先用流程内建测试和真实重复任务做前后对照。
- 最小试用方式与试多久：AC 约 15 分钟到半天；先用 conn_demo，再接真实计数器，复现一个每周手做报表，再跑一次长周期导出。其他路径按其步骤末尾的时长执行；没有可观察改善就停在 try。

## 常见坑
- 把“注册成功”当成“验证完成”。AC 至少还要用 conn_demo 跑一句，确认输出带日期区间、时区、采样状态、过滤器；其他路径至少还要看到工具清单、冒烟结果或真实任务被调用。
- 把作者自测当独立证据。本手册涉及的工具大多只有 README、作者自测、推文推荐或关注度；AC 的“可核验”设计也没有给出与 Yandex 后台人工核对的样例差异、性能数据或错误率。
- 在主力环境里直接跑第三方包。AC 通过 npx 拉取第三方包，数据会发送给 AI 客户端及其模型提供方；其他路径也各有外发、写权限、真机控制或明文落盘风险，先在隔离环境、只读/最小权限下试。
- 忽略版本写死。AC 要求 Node.js 22.13+，版本 1.0.0；其他路径的版本和参数同样要按实际安装版本核对。
- 把取数结果直接当决策依据。AC 的硬标准是输出带日期区间、时区、采样状态、过滤器；抽样数据必须被拒绝而不是标成精确；用 API 总计而非可见行求和。任何一项缺失，都退回 study。
- 把 AC 当通用能力。它只对 Yandex Metrika 用户有用；不用 Yandex Metrika 的团队只借鉴“口径随输出返回”的设计，不要为了学模式而安装。
- 忽略平台差异。AC 的 README 只说明在 macOS 上做过真实登录与报表验证；Windows/Linux 及其他客户端未给结论。其他路径也有平台限定，先核对。
- 忽略凭据默认值。AC 的 token 存 OS 凭据库；没有凭据库时服务器默认拒绝保存，除非显式选择“仅本人可读的未加密文件”。不要为了方便改成明文共享。
- 把组件目录、技能包或数据源当质量认证。star 数、组件数量、工具数量只说明关注度或目录规模，不等于安装后效果；先预览写入文件、只装 1–2 个、保留回滚。
- 在共享机器上留下敏感数据。AC 的多账号连接要隔离；auto-ontology 的 ontology.db 含明文密码；iphone-control 的 data/ 含配对记录和签名密钥；kensaku 索引含文件名和抽取文本；radar-cnpj-mcp 导出名单可能含联系方式。都要按敏感数据处理。
- 把“能列出工具”当“工具真的被用对”。AC 要检查是否先读 metrika_catalog 和 metrika_describe_counter 再算数；其他路径也要保留一个不挂载/不调用技能的对照会话。
- 忽略采样和时区。AC 的常见失败是数字看起来精确但实际来自采样数据，或日期边界没按计数器时区切；这两项是判断是否可用的硬指标。

## 证据与来源
本节说明每个做法依据哪类材料、有哪些数据、哪些只是作者主张。
- 做法 A jevcrawl：README 的安装命令、参数默认值、输出字段与环境变量表可核查；数据均为作者自测（50 个 WebWalkerQA 任务答对 40%、找到答案页 54%、$0.025/任务；与 Crawl4AI 0.9.4 的 20 任务对照答案页 10 vs 5；docs.python.org 示例 80,034 tokens → 1,873 tokens），无独立验证；作者自陈局限：样本小、不执行 JavaScript、不读 robots.txt、页面文本会发送到 TypeSafe。
- 做法 B REA/Hermes：可核查的是一条完整接入命令；139 个工具是作者声称，清单在列举处被截断。
- 做法 C：不接入的降级做法，依据是各路径原文在工具清单、验证方式或效果数据上的缺口。
- 做法 D CLI-Anything：README 的安装与使用命令可核查；2,461 个测试通过、pytest 100% 为作者自报，无第三方复现；大量 harness 依赖上游桌面软件，Windows 需 Git for Windows 或 WSL；没有对比性指标。
- 做法 E arcmira：接入命令、arcmira_describe、id_required 与 resolve 语义、Premium 的 202 + Retry-After、credits 计量规则、错误码、monitor 方法集、沙箱出站白名单可核查；数据覆盖与说话人/赞助识别准确性是厂商自述。
- 做法 F reason network：安装方式、四条 CLI 命令、MCP server 名与三个工具名、按 agent 区分的投递时机、网络与安全模型可核查；没有使用数据、性能数字、前后对比或用户案例，仓库 33 stars。
- 做法 G idx：安装方式、JSON envelope、缺失字段为 null、退出码语义、MCP 注册命令、23 个工具名可核查；没有效果数据、性能数字或前后对比，正文在第 9 步后被截断。
- 做法 H Blender 扩展：安装与使用信息、Windows x64 + Blender 4.2+、21 个工具、团队链、四条提示词可核查；更快迭代等价值描述为作者主张，无用户案例、成功率或耗时对比；705 stars。
- 做法 I jevreel：命令与机制、lens TOML、插件安装、四步工作流可核查；成本数据为作者自测；底层 Jev 图像能力仍是实验性，验证只基于单个测试视频。
- 做法 J WhatsApp MCP：完整部署命令、配置项、工具表、架构和调试步骤可核查；只在一个真实账号上跑过；非官方实现，作者承认可能违反 WhatsApp 条款；HN 35 points 只说明关注度。
- 做法 K im-mcp：安装、初始化、客户端配置、清理命令、工具表、兼容性验证表可核查；没有效果指标、任务成功率或对照数据；“毫秒级响应”是作者声称；本地数据库会解密为 SQLite 明文落盘。
- 做法 L claude-security-scan：检测项清单、安装命令、报告路径、安全设计和限制可核查；没有检出率、误报率、用户案例或独立评测；会读取多账户敏感信息，只读与脱敏设计未经代码级验证。
- 做法 M vulnerator-ai：四容器架构、install.sh 行为、TUI、六个 MCP 工具名、两个 opt-in 控制项、MIT、design.md schema 可核查；没有准确率、耗时、成本或对比基线；默认无 scope-guard、consent、audit、授权闸门。
- 做法 N TradingView-Unified-MCP：只有两步接入动作可核查，原文在启动命令后截断；零效果证据，互动量只说明关注度。
- 做法 O agent-toolkit-for-aws：AWS 官方 README，GA、Apache-2.0、约 3196 stars；安装命令、插件覆盖、IAM 条件键/CloudWatch/CloudTrail 的陈述可核查；没有独立测评、客户案例或 skills 端到端指标。
- 做法 P flashmind：npm 包名、MIT、31 stars、Node ≥18、MCP JSON、六种客户端配置映射、技能触发条件表、更新与去重规则可核查；防幻觉规则正文和 4 个 SKILL.md 正文没有出现在抓取到的文本里；没有基准、案例或前后对比。
- 做法 Q mcode-stack：README、MIT（部分 stack 另有 NOTICE）、15 个技能徽章、validate 徽章、安装命令、目录发现规则可核查；没有使用前后对比、缺陷率、节省时间或采用率数据，也没有各 SKILL.md、checklists/、WORKFLOW.md 正文；部分安装方式依赖 MiniMax Code 版本。
- 做法 R snapgent-connector：README 的支持 provider、系统要求、分平台安装、示例、架构、排障表可核查；53 stars、V3.3、GPL-3.0；没有独立安全审计、性能基准或用户案例；扩展是 unpacked 加载，涉及站点权限和本地 MCP 写权限。
- 做法 S expo/skills：Expo 官方 README 的安装/更新命令、技能清单、示例提示词、MCP 范围可核查；没有各 SKILL.md 正文、误选率或效果度量；3658 stars 和今日 +90 只是热度信号。
- 做法 T kensaku：README、MIT、1.0.6 的安装方式、排除项、CLI、MCP stdio、只读边界可核查；作者自测 Linux 8 vCPU、SSD、10 万文件下文件名内存搜索平均 1.3 ms、首次索引 101,101 文件 184 s、峰值 183 MB、无变化重索引 0.56 s；案例是作者演示，不是独立效果研究。
- 做法 U radar-cnpj-mcp：README 的安装/接入命令、7 个工具、过滤器、示例问题、CLI、隐私默认、MIT、CI badge、36 stars 可核查；毫秒级、7000 万+、几秒下载、导入几分钟均为作者陈述；示例数字 2.301 / 1.407 / 783 只是结果形态；只覆盖巴西 CNPJ。
- 做法 V trustabl/agent-reliability-skills：README 的安装命令、trustabl_forge 参数、写入保护、环境变量、支持 SDK 列表可核查；42 stars、v0.1.0-rc.1；没有生成的 SKILL.md 样例、检测规则正文、案例或前后对比；workspace 报告状态均为 pending。
- 做法 W poki：README 的安装/启动/注册命令、依赖清单、两种分发方式、示例任务、真机配对要求可核查；126 stars、v0.1.0、AGPL-3.0-only；“Gets faster with use”只是作者主张；真机只在中国区界面语言的 iPhone 上验证过且仅支持竖屏。
- 做法 X remote-webview-debugger：README 的部署命令、SDK 接入片段、claude mcp add 命令、HTTP/HTTPS 对照表、三种部署、安全配置可核查；SDK 0.3.0、51 stars、MIT；隐私承诺、掩码效果、像人一样点击输入都只是作者主张；没有成功率、定位改善或对照数据。
- 做法 Y davila7/claude-code-templates：README 的组件类型与数量、CLI 命令、1.31.0 移除清单、三个本地工具及监听地址限制可核查；33,155 stars 只是关注度；没有组件质量评测、成功率或安装后效果对比；安装会写入项目配置、执行 hook 脚本、接 MCP 凭证。
- 做法 Z iphone-control：仅来自 GitHub README 的安装命令、工具表、日常命令和一个演示说明；31 stars；没有基准测试、成功率、延迟对比、用户案例或第三方评测；工具数量 15 与 17 口径不一致；“减少往返”“可无人值守”“自动恢复/重签”是作者主张。
- 做法 AA auto-ontology-mcp：README 的 uvx 命令、客户端配置、demo 规模（11 张表、3200 条订单）、五条示例提示词、示例问数输出（营收 316.8、4 条订单行；ROAS 被判断为 partially_answerable，覆盖度 0.33）、demo 扫描结果（9 个未声明外键，7 个自动接受，1 个建议复核，1 个未链接）可核查；text-to-SQL 静默错误减少、个人知识库比 markdown wiki 更可信等主要是作者主张，没有对比实验或独立评估。
- 做法 AB andrej-karpathy-skills：证据来自一条推文的采集文本，严重截断。可核查的只有第一项完整安装命令，以及第一项声称从 Karpathy 帖子提炼 4 条编码规则；7 个仓库合计超过 1,000,000 GitHub stars、Karpathy 帖子 230K 是流行度，不是效果数据；第二项及后续 5 项未出现，没有规则正文、案例或前后对比。
- 做法 AC Yandex Metrika MCP：证据来自 DevCrabs-Inc/yandex-metrika-mcp 的英文 README。可核查的是安装命令、13 个工具、3 个提示词、语义化版本 1.0.0、MIT、合成连接 conn_demo 始终可用、凭据存 OS 凭据库、无凭据库时默认拒绝保存、标签 URL 查询串默认剥离、无遥测、多账号连接隔离、导出带校验和与 manifest、README 说明无需自建 API key/OAuth 应用。作者主张、未给证据的是：“numbers you can verify”“strict accuracy refuses sampled data”的实际效果没有对比数据；准确性只有设计描述，没有与 Yandex 后台人工核对的样例差异；没有性能数据、错误率。局限：只对 Yandex Metrika 用户有用；README 承认只在 macOS 上做过真实登录与报表验证；文档主体为俄语，本次只有英文 README，weekly_review 提示词内容、导出上限、采样拒绝的具体触发条件无法核实；126 stars、1.0.0 首发版本，早期项目。不用 Yandex Metrika 时只借鉴“输出自带口径”的设计，不安装。

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
- [herdodp/snapgent-connector](../research/radar/2026-10-29/7994-herdodp-snapgent-connector.md)：值得一试，建议小范围试用：在非敏感仓库按 README 加载浏览器扩展并启动本地桥接，让浏览器聊天 AI 经 MCP 操作 VS Code；理由是安装、启动、使用和排障步骤较完整，但项目成熟度、扩展权限与 MCP 写权限需先隔离验证，暂不宜直接全量采用。
- [expo/skills](../research/radar/2026-10-29/8157-expo-skills.md)：值得一试，在 Expo/React Native 项目里按 README 命令装一套 Expo skills（或插件）小范围试跑，重点验证“SKILL.md 技能包 + MCP 实时动作”这种把领域知识和可执行能力一起供给 agent 的封装方式能否迁移到自己的领域；理由是原文给出了可直接复制的安装/更新命令、按 agent 区分的安装路径和技能分组，但通篇没有效果数据，且只覆盖 Expo 这一垂直场景。
- [yjid/kensaku](../research/radar/2026-10-29/8163-yjid-kensaku.md)：值得一试，建议小范围试用：把工作文件夹纳入本地索引，以只读 MCP 接入 Claude/Cursor，用全文、OCR 和语义检索给 agent 补上下文；工具配置具体可照做，但版本较新、缺少工作效果验证，先限定范围试用。
- [wendersoon/radar-cnpj-mcp](../research/radar/2026-11-02/9580-wendersoon-radar-cnpj-mcp.md)：值得一试，按 README 给出的两条命令即可把巴西 CNPJ 公开数据装成本地库并接进 Claude Code / Cursor 等 agent，值得在“给 AI 接真实数据源”这类需求上小范围试用；但它只覆盖巴西企业注册数据，收益取决于你的工作是否涉及该市场，且“毫秒级、70M+、几秒下载”等均为作者陈述、未独立验证。
- [trustabl/agent-reliability-skills](../research/radar/2026-11-05/10419-trustabl-agent-reliability-skills.md)：值得一试，建议在单个使用受支持 Agent SDK 的仓库做小范围试点：按 README 安装 MCP、生成并人工审查 SKILL.md 后再让编码代理使用；理由是流程具体且把可靠性规则前置到编码阶段，但目前仅 RC/README、无效果数据，不宜直接推广。
- [JosssphZhou/poki](../research/radar/2026-11-06/10684-josssphzhou-poki.md)：值得一试，可以在有备用 iPhone 的 Mac 上按 README 原样跑通 MCP 注册与一个只读任务，测出成功率和人工接管成本后再决定是否进手册；因为安装与注册步骤具体可复制，但项目仅 v0.1.0、强依赖 macOS + 完整 Xcode、真机只在中国区界面验证过，且「越用越快」无数据支撑。
- [ZaneL1u/remote-webview-debugger](../research/radar/2026-11-06/10767-zanel1u-remote-webview-debugger.md)：值得一试，把 RWD 当作小范围试点：自托管一个网关，让 Claude Code 经 MCP 接入一台真实手机的 WebView/H5，专门处理「只在某台设备上复现、又没有 USB 和调试端口」的 bug；原因是 README 给出了可直接照抄的部署命令、SDK 接入片段和 `claude mcp add` 配置，同时提供了分级授权、掩码和审计等可执行的安全配置，但项目年轻（SDK 0.3.0、51 stars），效果与隐私承诺都只有作者主张，需先自行验证。
- [davila7/claude-code-templates](../research/radar/2026-11-06/10910-davila7-claude-code-templates.md)：值得一试，先在一个仓库里挑 1–2 个组件（优先 loops、hooks、MCP）按 README 的命令装上做小范围试用，而不是整包铺开；因为原文给了可直接复制执行的安装命令和清晰的组件分类，但没有给出任何组件质量或效果数据，且安装会写入项目配置、执行 hook 脚本、接入外部服务凭证。
- [Derrors/iphone-control](../research/radar/2026-11-07/11043-derrors-iphone-control.md)：值得一试，建议在专用 iPhone、专用 Apple ID、开启工具调用确认的隔离环境中小范围试用：按 README 用 Docker 或 macOS 二进制安装，跑 setup/doctor，再用 claude mcp add 接入 Claude Code 验证真实 App 操作；理由是它给出了可复制的安装、MCP 工具和运维命令，但整机控制风险高且缺少效果数据，不适合直接 adopt。
- [gogoymh/auto-ontology-mcp](../research/radar/2026-11-07/11126-gogoymh-auto-ontology-mcp.md)：值得一试，建议小范围试用：把 auto-ontology-mcp 作为 MCP 服务器接入 Claude Code/Cursor 等客户端，先用内置 demo 库跑通“建模—问数—校验—拒答”流程，再决定是否接入真实只读库或个人知识库。理由是原文给出了可直接复制的安装命令、客户端配置、工具调用序列和验证示例，但缺少独立效果数据，且配置有一定环境要求。
- [@plusxbt: It's pretty wild that people still run Claude Code bare when these 7 repos have over 1,000,000 GitHu](../research/radar/2026-11-07/11345-it-s-pretty-wild-that-people-still-run-claude-code.md)：值得一试，只建议小范围试用已给出的 Karpathy 规则插件安装命令，并把“最少代码”作为待验证目标；整条推文严重截断，无法核验其余 6 个仓库和完整流程，不能作为手册方案直接采用。
- [DevCrabs-Inc/yandex-metrika-mcp](../research/radar/2026-11-10/12285-devcrabs-inc-yandex-metrika-mcp.md)：值得一试，如果你的工作涉及 Yandex Metrika（俄罗斯站点分析），按 README 的一条命令或 JSON 配置安装这个只读 MCP 服务器，让 Claude/Cursor/Codex 直接取数，并且每次回答都带日期、时区、采样状态和过滤器；它的价值不在于“又一个连接器”，而在于示范了“把取数口径（日期边界、时区、采样、聚合规则、API 总计）当作工具输出的一部分强制返回”，这套做法可以迁移到任何数据源。若你不用 Yandex Metrika，只需读它的输出可核验设计，不必安装。
