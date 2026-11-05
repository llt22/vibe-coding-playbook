# 在隔离环境里给代理接入第三方工具，并用对照证据决定去留

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在不污染主力环境、不越过数据外发边界的前提下，完成第三方工具接入、工具清单核对、冒烟测试和对照验证，并据证据决定继续试、只当思路参考还是停止。
> 先试这一步：先在一个隔离环境里选一条半天能出结论的路径（如做法 A 的 jevcrawl 或 D1 的现成 CLI）跑通注册、冒烟和未接入对照；若目标是 iPhone App 界面操作，先按做法 W 用备用 iPhone 只跑只读任务。
> 最近修订：2026-11-06

## 解决什么问题
把第三方工具以 MCP、CLI、技能包、插件、浏览器扩展加本地 bridge、本地数据集或真机操作桥接接给代理时，常见做法是一句注册/安装命令就完事；能不能用、多出哪些工具、花多少钱、数据发到哪里、是否真的更好，全靠感觉。本手册给出统一流程：隔离环境 → 安装/注册 → 核对工具清单 → 冒烟 → 与未接入对照 → 决定 try / study / stop。覆盖 A–W 共 22 条路径：jevcrawl、REA/Hermes、arcmira、CLI-Anything/CLI-Hub、reason network、idx、Blender 扩展、jevreel、WhatsApp MCP、im-mcp、claude-security-scan、vulnerator-ai、TradingView-Unified-MCP、agent-toolkit-for-aws、flashmind、mcode-stack、snapgent-connector、expo/skills、kensaku、radar-cnpj-mcp、trustabl/agent-reliability-skills、poki；做法 C 是不接入的降级做法。高敏感路径先只读/最小权限/隔离：私人消息只读、安全扫描只读低风险域、vulnerator 只在隔离靶场和书面授权目标、TradingView 只验证接入、AWS 先只装 aws-core 并只读/沙箱、flashmind 先只启用 verify-before-done、mcode-stack 先只选 2–3 个技能、snapgent 只在非敏感可丢弃仓库、kensaku 只索引一个工作文件夹并保持只读、radar-cnpj-mcp 先只下一个州并用 CLI 校准、trustabl 先在一个受支持 SDK 仓库试点并人工审查 SKILL.md、poki 只用备用 iPhone 先跑只读/可逆操作并接受屏幕内容外发与 ToS 风险。

## 适用与不适用
通用适用：本机有 MCP 客户端或支持 skills 的代理；愿意在容器、虚拟机、专用账号或备用设备里先跑第三方包；目标是让代理获得外部工具或一类新能力；愿意做「挂载 vs 未挂载」或「调用技能 vs 不调用技能」的对照；愿意先人工审查工具生成的文件（如 SKILL.md）再让代理读取使用。
通用不适用：不能隔离、必须直接在主力工作目录或主力手机试；需要稳定生产接入；依赖被截断的完整工具清单来规划任务；只有作者自述没有效果数据却要做量化决策；生成物没有任何样例、规则正文或验证方式却要直接进代理上下文。
各路径关键条件（简表）：
- A jevcrawl：站内多跳检索，目标站点不依赖 JavaScript 渲染；页面文本允许外发到 TypeSafe。
- B REA/Hermes：已有 hermes CLI，想试 npx 拉起的 MCP 工具集；原文只给一条命令、能力清单被截断，只适合试。
- C 不接入：注册失败、注册后工具无法被代理实际调用、无法隔离，或需要完整清单和失败排查而原文没有时，只记录设计点。
- D CLI-Anything/CLI-Hub：要反复调用 GIMP、Blender、LibreOffice 等软件，愿意先装上游软件；或让编码 agent 为内部工具生成 CLI。
- E arcmira：要在 YouTube 视频与直播转录里检索谁在什么时间说了什么、品牌赞助；接受远程 MCP、写程序调用、付费计划和预算。
- F reason network：团队都在用 Reason CLI 且在同一 workspace，想让一个 session 直接问另一个 session。
- G idx：目标就是印尼股市，或想照抄一份数据三种界面、mcp setup 绝对路径、统一 envelope 与退出码。
- H Blender 扩展：Windows x64 + Blender 4.2+，想让 AI 在场景里做可回退操作，并要审批、取消、命名撤销与截图。
- I jevreel：有一段本地或 URL 视频，要检索某个瞬间；接受底层 Jev 图像能力仍是实验性、验证只基于单个测试视频。
- J WhatsApp MCP：个人 WhatsApp 账号只读检索、摘要、补看群聊、补名；愿意在自己的 Cloudflare 付费 Workers 上部署；接受非官方协议和条款风险；一个部署一个账号一个 owner。
- K im-mcp：Windows x64 或 macOS，微信 4.x/钉钉 7.x 已登录；只读检索；接受本地数据库解密后明文落盘、强依赖客户端版本。
- L claude-security-scan：已装 Claude Code、git、bash、Python 3.11+，能访问 GitHub；想做跨本机、本地 git 仓库、GitHub、云服务和 Gmail 的只读例行检查；接受缺工具/权限时标为未能确认。
- M vulnerator-ai：能在隔离环境接入单个 MCP 工具集；想在授权靶场验证模型自己决定下一步并直接执行的 OODA 循环；有 docker、compose v2、openssl、OpenRouter key；接受默认无 scope-guard、consent、audit、授权闸门；目标已获书面授权且能隔离 kali 容器。
- N TradingView-Unified-MCP：已装 Claude Code 与 Node.js；只想验证 Claude Code 通过本地 MCP 接触外部数据平台的接入形态；只做只读行情/图表查询，不接真实资金。
- O agent-toolkit-for-aws：团队在 AWS 上开发，使用受支持的编码智能体；任务属于 AWS 构建、部署、管理、数据分析或 DevSecOps；本地已配置 AWS 凭据；愿意先只装 aws-core 并在只读/沙箱权限下试用。
- P flashmind：支持 MCP 的客户端，Node ≥18；想给 agent 补记忆、防幻觉规则和宣布完成前验证；愿意只选一个仓库、一个客户端、只启用 verify-before-done 做两周对照；接受原文没有规则和技能正文。
- Q mcode-stack：已装 MiniMax Code；若走 Claude Code 市场命令已装 Claude Code；想从长命令审计、干净上下文独立评审、小评估实验开始；接受本次只有 README、要打开 SKILL.md 核对；愿意一次只装 2–3 个技能并保留对照。
- R snapgent-connector：Edge/Chrome MV3、VS Code、Windows/macOS/Linux；macOS/Linux 需 Python 3.9+；使用期间保持 bridge 运行；目标项目在 VS Code 打开；只在非敏感可丢弃仓库试用；接受 unpacked 扩展站点权限和 MCP 写权限风险。
- S expo/skills：已有 Expo/React Native 项目；使用受支持的编码 agent；想让 agent 按官方技能处理 Router、原生 UI、SDK 升级、EAS 构建/工作流/更新；接受部分 services 技能依赖付费 EAS；先只装技能验证路由再决定接 MCP。
- T kensaku：本机有工作相关文件、截图、PDF/DOCX/PPTX/XLSX/EPUB、代码或日志；想给 agent 补本地只读检索上下文；接受首次索引选择范围并排除敏感目录；只需只读检索。
- U radar-cnpj-mcp：工作涉及巴西企业注册数据、B2B 勘探或区域市场摸底；Node ≥20；只下载目标州；接受数据来自巴西联邦税务局公开 CNPJ、默认遮蔽 MEI 电话/邮箱、LGPD 责任在使用者。
- V trustabl/agent-reliability-skills：Node.js 22+；目标仓库有依赖清单；仓库确实使用受支持的 agent SDK；客户端支持 MCP；愿意先在一个仓库试点，生成 SKILL.md 后人工审查再让编码代理使用。
- W poki：有 Apple Silicon Mac、macOS 15+、完整 Xcode、Rust、Node.js 24+、ffmpeg，预构建包还需 Python 3；有一台可清空的备用 iPhone，真机已用 USB 与 Mac 配对并开启开发者模式；目标任务只能走 App 界面、没有可用 API；接受屏幕内容发送到模型服务、第三方 App 自动化可能违反 ToS、AGPL-3.0-only。
各路径关键不适用：jevcrawl 不做 JS/登录/付费墙/CAPTCHA；REA 只适合试；arcmira 不提供 monitor 删除；CLI-Anything 需上游软件且 Windows 需 Git for Windows 或 WSL；reason network 需第二人配合；idx 只印尼股市；Blender 不在 Windows x64/Blender 4.2+ 不适用；jevreel 需成熟图像理解或跨大库存量查询不适用；WhatsApp 要发送、多人共享、媒体转写不适用；im-mcp Linux、版本不在支持表、不能接受明文落盘不适用；安全扫描需要攻击性测试或独立评测不适用；vulnerator 对未授权目标、生产资产、需要审批审计不适用；TradingView 想直接得到交易机器人或收益证据不适用；AWS 非 AWS 工作、不愿配只读/最小权限、需要独立效果数据不适用；flashmind 需要现成量化证据、不能接受记忆污染、客户端不支持 MCP 不适用；mcode-stack 需要量化效果、要自动触发工作流、想一次装整套不适用；snapgent 敏感仓库、需要安全审计、不能保持 bridge 不适用；expo 非 Expo/RN/EAS、需要误选率、不愿刷新会话不适用；kensaku 要索引整盘或敏感目录、要 agent 写文件、要已上线问答层不适用；radar 只覆盖巴西 CNPJ，离开巴西 B2B 基本无用，需要电话名单外呼时默认遮蔽会限制；trustabl 不覆盖未支持的 SDK 或没有依赖清单的仓库，需要现成量化证据、不能接受人工审查、想一次生成永久有效不适用；poki 没有备用 iPhone、Intel Mac、没有完整 Xcode、需要无人值守发消息/付款、不能接受屏幕内容外发或 ToS 风险、需要生产级稳定性时不适用。

## 前置条件
通用：一个隔离环境；到包分发源和目标服务的网络出口；一个可回退的低风险真实任务，用来做冒烟测试和对照。
各路径关键前置：
- A jevcrawl：TypeSafe Jev API key、uv、到 api.typesafe.ai 出口。
- B REA：hermes 命令、npx、npm registry。
- D CLI-Anything：Python 3.10+、上游软件、支持 SKILL 的 agent。
- E arcmira：账号、支持的 MCP 宿主、付费计划与预算。
- F reason network：Reason CLI/workspace、daemon、MCP server 和三个工具权限。
- G idx：Node/npm 或 Rust，或 install.sh。
- H Blender：Windows x64、Blender 4.2+、支持 tool calling 的模型。
- I jevreel：Python 3.11+、FFmpeg、TypeSafe key（无 key 时部分能力可用）。
- J WhatsApp MCP：Cloudflare 付费 Workers、Node 20+、OAUTH_KV、OWNER_PASSWORD。
- K im-mcp：Windows x64/macOS、微信 4.x/钉钉 7.x、uv、管理员终端或 64 位 hex passphrase。
- L claude-security-scan：Claude Code、git、bash、Python 3.11+、各域只读登录。
- M vulnerator-ai：docker、compose v2、openssl、OpenRouter key、隔离靶场、书面授权、两个 32 字节 hex token。
- N TradingView：Claude Code、Node.js、只读凭据。
- O agent-toolkit-for-aws：AWS 账号及本地凭据、支持的编码智能体、Kiro/fx 手动路径需 uv。
- P flashmind：Node ≥18、git、支持 MCP 的客户端、隔离分支/worktree。
- Q mcode-stack：MiniMax Code、可选 Claude Code、git、技能目录和 SKILL.md。
- R snapgent：Edge/Chrome MV3、VS Code、Python 3.9+、保持 bridge 运行。
- S expo/skills：Expo/RN 项目、受支持 agent、重启或刷新会话。
- T kensaku：安装包或源码构建、选择索引范围和排除项、支持 stdio 的 MCP 客户端。
- U radar-cnpj-mcp：Node.js 20+、明确覆盖州、用于 B2B 勘探/市场摸底、准备 LGPD 合规做法。
- V trustabl：Node.js 22+、仓库依赖清单、受支持 agent SDK、支持 MCP 的客户端、可写仓库内 .claude/skills/ 的权限、首次联网下载 analyzer 与规则仓库。
- W poki：macOS 15+、Apple Silicon（预构建包仅 arm64）、完整 Xcode（不是 Command Line Tools）、Rust、Node.js 24+、ffmpeg、预构建包需 Python 3；备用 iPhone 已 USB 配对并开启开发者模式；MCP 客户端；接受屏幕内容外发、ToS 风险和 AGPL-3.0-only。

## 操作步骤
先做 A 或 D1：它们能在半天内给出可观察结论，也顺带把隔离环境、基线记录这套流程跑通。若目标就是私人消息只读检索，再考虑 J 或 K；不要从发送、多人共享或媒体转写开始。若你已有支持远程 MCP 的宿主且目标就是口语内容检索，直接做 E；团队已在 Reason 且找得到第二个人，可做 F；只想用最小成本看清「CLI 与 MCP 共用一份输出」的结构，做 G 的第 1、3、4 步；手上就有 Windows x64 + Blender 4.2+，做 H 的第 1–4 步；有一段本地短视频要检索，做 I 的第 1–3 步；有个人 WhatsApp 且接受条款风险，做 J 的 1–8 步；要在本机补微信/钉钉沟通上下文，做 K 的 1–6 步；想做跨系统的例行只读安全检查，做 L 的 1–8 步，先 --demo，再只对一个低风险域 --skip repos；想验证「自主循环 + 工具供给」这套架构，做 M 的 1–4 步，先在 --with-juice-shop 靶场里跑；只想验证 Claude Code 接外部数据平台，做 N 的 1–6 步；团队在 AWS 上开发且使用支持的 agent，做 O 的 1–7 步；想给编码 agent 补记忆、防幻觉规则和宣布完成前先验证，做 P 的 1–6 步；想补可移植的工程习惯技能，做 Q 的 1–8 步；想让网页聊天 AI 经本地 bridge 操作 VS Code，做 R 的 1–8 步；在 Expo/React Native 项目里，做 S 的 1–9 步；想给 agent 补本地文件、截图、文档或日志的只读检索，做 T 的 1–8 步；工作涉及巴西企业注册数据/B2B 勘探/区域市场摸底，做 U 的 1–6 步；仓库使用受支持的 agent SDK、想让编码代理在写代码前读到仓库专属可靠性规则，做 V 的 1–10 步；要让代理操作没有开放 API 的 iPhone App，且有一台可清空的备用 iPhone 和完整 macOS 工具链，做 W 的 1–8 步，先只跑只读任务，再跑可逆写操作。

### 做法 A：接入有完整参数与回执的工具集（以 jevcrawl 为例）
1. 申请 key，确认外发边界：页面文本会被发送到 TypeSafe 打分；列出哪些站点不能碰。
2. 装成 Claude Code 的 MCP server：
```bash
claude mcp add jevcrawl -e TYPESAFE_API_KEY=<your key> -- uvx jevcrawl
```
3. 自检配置：
```bash
uvx jevcrawl doctor
```
4. 用自然语言提示词验证通路：
```text
Use jevcrawl to find which Python version added the walrus operator, starting from docs.python.org
```
5. 或不走 MCP，直接用 CLI：
```bash
uv tool install jevcrawl
jevcrawl crawl https://docs.python.org/3/ --goal 'What does the walrus operator do?' --json
jevcrawl scrape https://example.com/help/returns --goal '...' --json
jevcrawl map https://example.com --goal '...' --limit 20
```
6. 用预算参数和回执字段核对每次调用：max_pages、max_seconds、max_decision_usd、return_tokens 限定每次调用；用 stopped_because、stats.degraded、stats.needs_js_urls、jev_cost_usd 判断是找到答案、撞上限还是降级。连续三次 Jev 请求失败后爬取转为广度优先，所有 block 以未打分形式放进 uncertain，不要把降级结果当打分结果。

### 做法 B：接入只有一条命令、清单不完整的工具集（以 REA 接入 Hermes 为例）
1. 在隔离环境确认 hermes 命令存在、npx 可用、能访问 npm registry。
2. 注册：
```bash
hermes mcp add rea --command npx --args -y rea-agents@6.3.0 mcp
```
3. 核对注册与工具清单；原文没有给出查看已注册 MCP 服务器或工具列表的命令，需查 Hermes 文档补上；记录 rea 是否存在、实际工具数量和名称。作者声称有 139 个工具，这个数量未验证。
4. 做低风险冒烟测试：在 Hermes 会话里提一个需要外部工具的自然语言请求，观察代理会不会自动选中 rea 工具。
5. 与未挂载时做对照：同一任务，不挂载 rea 再跑一次，比较能否自主选用工具、人工干预、步骤数和耗时。

### 做法 C：不实际接入，只当作「用 MCP 批量接工具」的思路参考
当注册失败、注册后工具无法被代理实际调用、无法提供隔离环境、或需要完整工具清单和失败排查步骤而原文没有时，选做法 C。只记录设计点：MCP 批量供给、远程 MCP 只暴露少量工具让模型写程序、团队 agent 三工具接口（list_team / send_message / check_inbox）、CLI 与 MCP 共用一份 JSON envelope 并把退出码带进工具错误、零嵌入视频检索的类型化回答 + contact sheet + 全分辨率复核、MCP server 与可视化工作区一起长在宿主软件内部并用审批与命名撤销兜底、前门只暴露 run 生命周期而不暴露原始执行工具。

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
排错顺序：先 /reload-plugins；再 /help cli-anything；旧版不识别 /cli-anything 时改用 /cli-anything:cli-anything。

### 做法 E：接入远程 MCP，用「写程序」的方式调用（以 arcmira 为例）
1. 标准路径：用宿主登录（OAuth）添加远程 MCP，无 key：
```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp
codex mcp add arcmira --url https://mcp.arcmira.com/mcp
```
2. 连上后先调用 arcmira_describe 拿参考手册，别猜方法签名。
3. 遵守 id 规则：先用 resolve 拿 id，再用 id 查询。过滤器只接受原样 id；把名字当 id 会抛 id_required。
4. 需要整段转录时用 Premium 质量，并处理「还没转好」：未就绪时返回 202 + Retry-After，按它重读不重复计费；failed / refunded 除非传 retry: true 不会重开。
5. 先查价再跑贵操作：arcmira.quote(video) 返回整段 Premium 读取会用多少 credits，本身不计费。预算由 dashboard 控制，工具本身不接受金额参数。
6. 用示例提示词快速验证接通：Which brands sponsor both TBPN and the All-In Podcast? / Find a moment on TBPN from the last 90 days where someone talks about stablecoins, and quote it.
7. 要持续盯着就建 monitor（必须走 arcmira_execute_write）；它不提供删除，退出方式是 paused。

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
4. 核对 21 个工具；其中 execute_code、export_scene、import_asset 是高影响操作。
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
预期结果：生成 reports/<日時>/report.html；失败或未登录的域进入「未能确认的项目」，而不是被当成「没有问题」；报告中没有明文秘密值。
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
参数：--with-juice-shop（同时启动 OWASP Juice Shop 练习靶场）、--no-up（只写 .env 不起容器）、--force（覆盖已有 .env）。
3. 先确认控制面：前门 vulnerator-mcp（内部 :8700）只应暴露 6 个 run 生命周期工具——health()、start_pentest、get_run_status、stream_run_events、steer_run、stop_run。确认它拿不到原始 kali_run，也不能直接打 /v1/chat/completions。
4. 先只在 TUI 里跑靶场，不注册到任何助手：
```sh
docker compose exec -it ooda-agent hermes chat
```
5. 做对照试验：同一靶场、同一目标，先人工按 checklist 跑一遍并记录命令序列、发现数、误报数、耗时；再用 agent 跑一轮同样的目标，比较发现数、误报数、重复命令比例、steer_run 干预次数、stop_run 是否真的停、耗时。
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

### 做法 P：给编码 agent 接打包插件，先只启用「宣布完成前先验证」一个技能（以 flashmind 为例）
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
6. 最小试用两周：选一个真实仓库、只选一个客户端，只装 MCP 记忆 + 规则文件 + verify-before-done 一个技能；记录「未跑测试就宣布已修复」「引入不存在的包/函数/CLI 参数」两类事件计数、返工时长、测试通过率，与试用前同仓库同类型任务对照。

### 做法 Q：先只装 2–3 个「工程习惯」技能，用真实任务对照（以 MiniMax-AI/mcode-stack 为例）
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
5. 可选连接 EffectCraft 或 Roblox Studio MCP：Windows 下 start.bat 会检测 EffectCraft 常见安装位置并启动其控制通道；macOS/Linux 需安装 EffectCraft CLI 并把 effectcraft-cli 放到 PATH。Roblox Studio MCP 在 macOS 默认检测 /Applications/RobloxStudio.app/Contents/MacOS/StudioMCP；安装在其他位置时，启动前设置 ZS_STUDIO_MCP_PATH。Linux 不自动检测 Roblox Studio MCP。
6. 开始会话：打开支持的 AI 聊天站点并新建聊天；在 VS Code 打开项目文件夹后，在聊天栏点击 Start，然后用自然语言描述任务。README 示例提示词是：
```text
Inspect the files in my project and explain how the login flow works.
Add a search bar to the books page and wire it to the existing API.
```
7. 运行要点与排障：保持 bridge 窗口开启，关闭会断开 agent；保持目标项目在 VS Code 打开；Arena 使用 Direct 模式；Gemini 或 Kimi 在长会话中停止使用工具时，提醒它使用 snapgentV3 commands 或新建聊天。扩展栏缺失时检查扩展是否启用、当前聊天站点是否允许访问并刷新标签页；bridge offline 时重新启动对应 launcher。
8. 最小对照：先不接 connector，用同一个 AI 聊天手动复制粘贴完成 2–3 个边界清楚的任务，记录耗时、人工复制粘贴和终端步骤数、返工次数。再接 connector 重复同类任务；每次接受修改前用 git status 和 git diff 检查改动范围。记录任务完成情况、从开始到首个有用结果的时间、总完成时间、人工步骤数、工具调用失败次数、bridge 断连次数、返工次数、非预期文件改动数；如果测试仓库有测试或构建命令，记录是否通过。若出现 bridge 不稳定、AI 不使用工具、权限过大或工作区意外改动，应停止扩大范围。

### 做法 S：在垂直技术栈里装官方技能包，先验证路由再接 MCP（以 expo/skills 为例）
注意证据等级：原文是官方 README，给出了安装/更新命令、按 agent 分流的安装路径、技能分组和示例提示词；没有给出 SKILL.md 实际正文、误选率或「装了之后工作变好多少」的任何度量。能照抄的是安装方式和验证路由的方法。
1. 确认前提：已有一个 Expo / React Native 项目；选定一个受支持的 AI 编码 agent；接受部分 services 技能依赖付费 EAS。
2. 选择安装路径：Claude Code 或 Codex 走官方插件市场；Cursor、OpenCode、GitHub Copilot、Windsurf、Gemini、Cline、AMP、Factory Droid、Antigravity、Kiro CLI 等走 skills CLI。
3. Claude Code：
```text
claude plugin install expo@claude-plugins-official
```
也可以在 Claude Code 内执行：
```text
/plugin install expo@claude-plugins-official
```
4. Codex：
```text
codex plugin add expo@openai-curated
```
也可以在 Codex 内打开 /plugins，从 OpenAI-curated 市场安装 expo。
5. 其他 agent 在项目根目录执行：
```text
npx skills@latest add expo/skills --skill '*' --agent <你的 agent>
```
说明：这条命令选的是「全部 Expo 技能」，不是「全部 agent」；不加 --agent 时 CLI 会询问装到哪里。
6. 装完后重启或刷新 agent 会话，让它能发现已安装的 SKILL.md。
7. 用示例提示词验证路由：
```text
Build a native-feeling Expo Router screen with tabs, modals, and animations.
```
```text
Create an EAS workflow that builds previews on pull requests.
```
```text
Help me upgrade this app to the latest Expo SDK.
```
```text
Check whether this EAS Update rollout is healthy.
```
观察点：agent 是否根据任务上下文和各技能描述自动选中正确技能；请求含糊时是否先加载 expo-overview 再分发。
8. 需要实时动作时再接 MCP。Claude Code 和 Codex 的 expo 插件已内置 MCP 配置；其他 agent 或单独接，按 Expo MCP setup guide（https://docs.expo.dev/eas/ai/mcp/）配置。
9. 更新与反馈：
```text
npx skills@latest update
npx skills@latest update expo-router
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
kensaku-cli search 'resume' --json
kensaku-cli state
```
5. 把本地索引接入 MCP 客户端（只读）：command 填 kensaku-cli，args 填 mcp。
6. 需要 HTTP 接入时再启动本地服务：kensaku-cli serve；README 说明它只监听 loopback，并要求配置目录中的 bearer token。
7. 设定 agent 使用边界：保持默认只读，不把索引当可写工作区；README 说明 agent 工具不能改文件，reindex 默认关闭；响应有大小预算，文件内容作为数据返回、不作为指令。
8. 最小对照 1–2 周：选一个包含文档、截图、代码或日志的项目文件夹建立索引；保持 agent 只读，接入一个 MCP 客户端。设计固定任务，例如「找出某次部署失败的日志行」「找出包含 CUDA 报错的截图」「按描述找出数据库索引相关 PDF」「在代码库中找某个函数/错误文本」。记录每次从开始到找到目标的时间、前 5 条结果是否命中、是否需要退回手动翻目录、agent 任务是否因缺少上下文而重试，以及 OCR 误识别和隐私暴露事件。

### 做法 U：把本地公开数据集做成窄工具 MCP（以 radar-cnpj-mcp 为例）
注意证据等级：README 给出安装/接入命令、7 个工具、过滤器、示例问题、CLI、隐私默认、MIT、CI badge、36 stars；没有验证指标或基准测试。「毫秒级、7000 万+、几秒下载、导入几分钟」和示例数字均为作者陈述或示例，未独立验证。只覆盖巴西 CNPJ 数据。
1. 前提：Node.js 20+；明确目标州；用于 B2B 勘探或市场摸底；先只下一个州。预期结果：你知道要覆盖哪个 UF，并接受数据只覆盖巴西企业注册信息。
2. 下载目标州的数据库：
```sh
npx -y radar-cnpj-mcp baixar --ufs SP,MG
```
把 SP,MG 换成你的目标州。预期结果：本地有目标州数据；随后用 status 确认参考月份和已导入 UF。
3. 先走 CLI，不接 agent，做校准：
```sh
npx radar-cnpj-mcp status
npx radar-cnpj-mcp contar --cnae 4520-0/01 --uf SP --agrupar municipio
npx radar-cnpj-mcp buscar --cnae 4520-0/01 --municipio Campinas --sem-mei --limite 20
npx radar-cnpj-mcp buscar --cnae 4520 --municipio Campinas --csv oficinas.csv
npx radar-cnpj-mcp --help
```
预期结果：status 显示参考月份和已导入 UF；contar/buscar 能返回可核对数字和 CSV，便于后面判断 agent 是否答对。
4. 接入 agent。Claude Code：
```sh
claude mcp add radar-cnpj -- npx -y radar-cnpj-mcp
```
Claude Desktop / Cursor / VS Code 等，在其 MCP 配置里加：command 填 npx，args 填 -y 和 radar-cnpj-mcp。可选全局安装：
```sh
npm install -g radar-cnpj-mcp
radar-cnpj-mcp baixar --ufs SP,MG
claude mcp add radar-cnpj -- radar-cnpj-mcp
```
更新工具：npm update -g radar-cnpj-mcp。预期结果：客户端列出 radar-cnpj 服务，工具名可枚举：buscar_empresas、contar_empresas、buscar_cnae、buscar_municipio、detalhar_empresa、exportar_csv、status_base。
5. 按「先定位代码、再计数、再拉明细、最后导出」的顺序向 agent 提问。用 buscar_cnae 把口语化活动翻译成 CNAE 代码；用 contar_empresas 按 UF/市/区/CNAE/规模/MEI/年份聚合；用 buscar_empresas 取明细；用 exportar_csv 出 Excel 可读表格。可用 README 模板：
```text
Quantas oficinas mecânicas ativas existem em Campinas?
Liste academias abertas desde 2025 em Santo André, sem MEI, com telefone.
Em quais cidades de SP há mais clínicas odontológicas?
Exporte para CSV os restaurantes do bairro Pinheiros.
```
可用快捷 prompt：prospectar、dimensionar_mercado、empresas_novas；在 Claude Code 中变成 /radar-cnpj:prospectar 这类命令。预期结果：agent 自动选用窄工具，答案能回到 CLI 同参数核对。
6. 用同一问题做 agent vs CLI 对照：记录 agent 计数是否与 CLI 一致、CNAE 映射是否需要纠正、导出字段是否完整、MEI 电话/邮箱被遮蔽比例、从提问到可用名单的时间。若 CNAE 映射频繁出错，或业务根本不需要巴西企业数据，停在 try，只把「本地数据 + MCP 窄工具 + 状态资源」当模式参考。
7. 备选数据源：直接从 Receita Federal 导入尚未进入预构建数据集的月份。前提：去 arquivos.receitafederal.gov.br 的 Dados › Cadastros › CNPJ 下载该月目录（README 称约 7GB）。
```sh
npx -y radar-cnpj-mcp importar ~/Downloads/2026-10 --ufs SP,MG
```
README 提示：导入会读取税务局的全部文件，即使只处理一个州也要几分钟。预期结果：status 参考月份更新。
8. 维持新鲜度和隐私：每月重跑一次 baixar 更新数据库；用 status_base 或 status 确认参考月份和已导入 UF 再信任任何数字；默认隐藏 MEI 电话与邮箱；B2B 接触遵守 LGPD，报价要与对方的活动相关，并提供「不再联系」渠道。

### 做法 V：让编码代理在写代码前读到仓库专属的可靠性规则（以 trustabl/agent-reliability-skills 为例）
注意证据等级：本次只有 README，版本 v0.1.0-rc.1、42 stars；没有生成的 SKILL.md 样例、没有检测规则正文、没有案例或前后对比数据；README 中 Claude Code/Cursor/Claude Desktop 的 workspace 报告状态均为 pending。先在一个仓库试点，生成后人工审查再让代理使用。
1. 确认前提：Node.js 22+；目标仓库有依赖清单（package.json、pyproject.toml、requirements.txt、go.mod 等）；仓库确实使用受支持的 agent SDK（Claude Agent SDK、OpenAI Agents SDK、Google ADK、MCP、LangChain/LangGraph、CrewAI、Pydantic AI、Vercel AI SDK、AutoGen）；客户端支持 MCP。先只选一个仓库试点，不要全量铺开。
2. Claude Code 安装 MCP server：
```bash
claude mcp add agent-reliability-skills -- npx -y https://github.com/trustabl/agent-reliability-skills/releases/download/v0.1.0-rc.1/agent-reliability-skills-0.1.0-rc.1.tgz
```
3. Cursor 安装：在项目内 .cursor/mcp.json 或 ~/.cursor/mcp.json 的 mcpServers 下加 agent-reliability-skills，command 为 npx，args 为 -y 和上面的 tgz URL。
4. Claude Desktop 安装：打开 Settings → Developer → Edit Config，把同样的 mcpServers 条目加入 claude_desktop_config.json，重启 Claude Desktop。Claude Desktop 没有项目文件夹，因此提问时要给出仓库路径。
5. 调用 trustabl_forge 工具生成 skill。参数：path（仓库绝对路径；README 说明只有客户端通过 MCP roots 报告 workspace 时才可省略，而 Claude Code/Cursor/Claude Desktop 的该项状态都标为 pending，因此试点时按必填处理）；output_path（通常设为 .claude/skills/trustabl-pre-coding/SKILL.md）；可选 policy（为尚未出现在清单中的 SDK 补充类别，如 openai_sdk）；可选 lang（python、typescript、go）。
6. 如果使用 Claude Desktop，可直接用 README 给出的提示词：
```text
Generate the Trustabl pre-coding skill for /Users/me/code/my-agent and write it to .claude/skills/trustabl-pre-coding/SKILL.md.
```
7. 注意写入约束并人工审查：只有提供 output_path 才会写文件；路径必须留在仓库内；已有文件只有在是 Forge 生成时才会被替换，手写文件不会被覆盖。生成后先人工审查 SKILL.md：识别到的 SDK 是否正确、规则是否适用、有没有敏感信息；确认后再让编码代理读取使用。
8. 首次调用会下载 analyzer 二进制和 Trustabl 规则仓库，之后从缓存离线工作。若 GitHub 匿名限流，可设置 GITHUB_TOKEN；也可用 TRUSTABL_BIN 指向本地 analyzer 构建：
```bash
export TRUSTABL_VERSION=v0.1.15
export GITHUB_TOKEN=你的_token
export TRUSTABL_BIN=/path/to/trustabl
```
9. 依赖或 Trustabl 规则变化后，重新生成并审查 skill；不要把它当成一次生成就永久有效的固定文件。
10. 最小对照：先记录基线（现有测试通过率、lint/类型检查结果、团队已有的可靠性扫描 findings、人工 review 中与可靠性相关的意见）；生成并审查 SKILL.md 后，让编码代理完成 1–3 个同类小任务，再用同一套测试和检查比较。判断指标：生成文件是否准确覆盖仓库实际使用的 SDK；任务后测试、lint/类型检查是否不退化；可靠性相关 findings 或人工 review 意见是否减少；代理是否因为读取 skill 而提前避开规则问题；生成过程是否没有覆盖手写文件。若生成内容 SDK 识别错误、规则不适用或引入敏感信息，应停止试用并回到人工规则清单。README 未给出 analyzer 的扫描命令，验证时使用团队现有测试和扫描工具，不要虚构命令。

### 做法 W：把真实 iPhone 的界面操作接到 MCP，但只用备用机做只读/可逆试用（以 poki 为例）
注意证据等级：README 给出安装/启动/注册命令、依赖清单、两种分发方式、示例任务和真机配对要求；项目 v0.1.0、126 stars、AGPL-3.0-only。只是作者主张、无数据支撑：「Gets faster with use」；真机只在中国区界面语言的 iPhone 上验证过；真机仅支持竖屏；App 容器导出、跳转 Settings 子页面直链不可用；屏幕内容会发送到模型服务；写操作会真实发生，第三方 App 自动化可能违反 ToS。先只跑只读任务，再跑可逆写操作。
1. 核对硬性前提：macOS 15+；预构建包只提供 Apple Silicon arm64；完整版 Xcode（不是 Command Line Tools）、Rust、Node.js 24+、ffmpeg；预构建包还需 Python 3；一台可清空的备用 iPhone，真机先用 USB 与 Mac 配对并开启开发者模式。不满足就停在 study，只保留「MCP 接真机」思路。
2. 源码方式启动服务（终端 A 长期运行）：
```sh
git clone https://github.com/JosssphZhou/poki.git
cd poki
./bin/setup
npm start
```
3. 或使用预构建 macOS arm64 包（可跳过 Rust 与 ./bin/setup）：
```sh
tar -xzf poki-v0.1.0-macos-arm64.tar.gz
cd poki-v0.1.0
npm ci --no-audit --no-fund
npm start
```
包内已含原生桥与 idevice 工具；仍需 Apple Silicon 的 macOS、完整 Xcode、Node.js 24+、Python 3 和 ffmpeg。
4. 把 MCP 服务器注册到客户端（另开终端，在同一目录执行）：
```sh
claude mcp add --scope user poki-mcp -- node $PWD/src/stdio.mjs
codex mcp add poki-mcp -- node $PWD/src/stdio.mjs
```
前提：终端 A 的 npm start 保持运行；$PWD 必须是仓库/包目录；路径含空格时给 $PWD/src/stdio.mjs 加引号。
5. 找到设备并跑第一个只读任务：
```sh
node bin/call.mjs list_devices
poki 'Search esp32 in Chrome and summarize the top result'
```
只有一台已连接设备时会自动选中；多设备需加 --device '<device UUID>'。
6. 可选：安装独立 Agent，用终端或消息通道下任务：
```sh
npm ci --prefix agent
export PATH=$PWD/bin:$PATH
poki login
poki status
```
渠道配置完成后再启动 poki imessage 或 poki telegram；具体配置见 agent/README.md，原文未展开。
7. 或让 agent 自己完成安装：把下面这段原样交给 agent：
```text
Install https://github.com/JosssphZhou/poki following its root AGENTS.md, including the MCP skill, and stop whenever you need me to act.
```
最后一句是人为介入点设计——安装过程中需要你操作时它会停下来。
8. 先立安全边界再跑写操作：先用只读任务（搜索、读屏、总结）每类 3 次；再跑可逆写操作 3 次（例如给自己发一条消息、新建一条备忘），全程盯着屏幕；不要用主力机，不要从付款、群发、不可逆按钮开始。每类任务重复第二遍，检验「重复执行更快」是否真实存在。

## 怎么判断变好了
可观察指标分五类：通路、工具清单、任务效果、成本与停止原因、安全负向指标。
- 通路：每条路径要看到注册成功之外的回执或冒烟结果。例如 jevcrawl 看 doctor 是否报通路正常；rea 是否出现在 Hermes 服务器列表；CLI-Hub 的 info/install/launch 是否成功；arcmira_describe 是否返回方法表；reason network who 是否稳定列出对方 session；idx mcp setup 是否打印绝对路径；Blender 是否能打开 MCP Pro 面板并跑通检查场景→建对象→复制排列；jevreel 是否 index 打印 video id、ask 返回时间/概率/帧；WhatsApp MCP 的 /debug 是否为 phase: idle 且 paired: true；im-mcp 的初始化是否成功；claude-security-scan 的 --demo --open 是否打开示例报告、--skip repos 是否生成 reports/<日時>/report.html；vulnerator-ai 四容器是否健康、前门是否只暴露 6 个 run 生命周期工具；TradingView MCP 是否识别 server 与工具列表；AWS 是否装出 aws-core 插件、skills 和 MCP Server 是否可见；flashmind 是否出现 flashmind MCP 服务、规则文件是否落到对应路径、技能是否只有一份；mcode-stack 的 /skills 是否列出已装技能；snapgent 是否出现 snapgentV3 图标、bridge 是否保持开启、VS Code target 是否可用；expo/skills 是否装出 expo 插件、重启/刷新后是否发现技能；kensaku 是否能命中已知文件、MCP 客户端是否列出 kensaku 服务；radar-cnpj-mcp 是否列出 7 个工具、status 是否显示参考月份和已导入 UF；trustabl 是否在客户端出现 MCP 服务、trustabl_forge 是否可调用、SKILL.md 是否写到指定路径；poki 是否注册出 poki-mcp、list_devices 是否返回设备 UUID、只读示例任务是否完成。
- 工具清单：注册后必须去客户端确认工具真的出现、数量可枚举；不能把「注册成功」当「验证完成」。snapgent 默认 VS Code MCP server 标注有 24 个 workspace 工具，但原文只给标注，不是完整能力清单；expo/skills 的 README 技能清单也不是各 SKILL.md 正文；kensaku 要确认 agent 只调用检索工具；radar-cnpj-mcp 要确认 7 个工具名与参数可枚举；trustabl 要确认 trustabl_forge 的 path、output_path、policy、lang 参数可枚举；poki 要确认客户端实际列出桥接工具，而不是只看 npm start 成功。
- 任务效果：同一组真实任务，挂载 vs 未挂载/人工，比较任务完成率、答案正确性、人工步骤数、耗时、工具报错次数。vulnerator-ai 另看发现数与人工 checklist 的比值、误报数、重复命令比例、steer_run 干预次数、stop_run 后是否真的停止；TradingView 只比只读问答；AWS 比较同一任务未装 vs 只装 aws-core 的完成情况、耗时、调用到的 AWS API、CloudTrail 是否可见、IAM 条件键是否区分 agent 与人类动作；flashmind 比较两类幻觉事件计数、返工时长、测试通过率；mcode-stack 比较调用技能 vs 不调用技能的长命令阻塞/人工中断/重试/后台任务失败或丢失/等待时间、同一 diff 的干净上下文评审发现的问题数、无效评论数、评审耗时、同一评估任务重复运行的通过率波动；snapgent 比较手动复制粘贴 vs 接 connector 的任务完成、首个有用结果时间、总完成时间、人工步骤、工具失败、bridge 断连、返工、非预期改动、测试/构建是否通过；expo/skills 比较是否选对技能、是否减少查文档/试错步骤、改动是否可审查、EAS 构建/工作流是否真的被触发；kensaku 比较找到目标的时间、前 5 条命中率、退回手动翻目录次数、agent 因缺上下文重试次数；radar-cnpj-mcp 比较 agent 计数与 CLI 是否一致、CNAE 映射命中率/需要纠正次数、导出 CSV 行数与字段完整度、MEI 电话/邮箱被遮蔽比例、从提问到可用名单的时间；trustabl 比较同一仓库同类任务在生成并审查 skill 前后的测试通过率、lint/类型检查结果、可靠性 findings 或人工 review 意见数量；poki 比较首次成功率、人工接管次数/任务、端到端耗时 vs 手工耗时、重复任务第二次耗时相对第一次的下降幅度、误操作次数。
- 成本与停止原因：jevcrawl 看 jev_cost_usd、stopped_because、degraded、needs_js_urls；arcmira 看 quote 预估与实际消耗、错误码是否可按 code 分支；jevreel 看 measure 与实际计费、重复 ask 是否 0 请求 0 成本；expo/skills 看 services 技能开头的成本/套餐限额；kensaku 看索引范围、首次索引耗时和内存占用；radar-cnpj-mcp 看下载体积、导入耗时、磁盘/内存（本次未验证）、每月重跑 baixar 的成本，以及 status 的参考月份是否满足业务要求；trustabl 看首次下载 analyzer 与规则仓库是否成功、之后是否从缓存离线工作、限流时是否需要 GITHUB_TOKEN；poki 看安装编译耗时、首次任务耗时、重复任务是否真的变快。
- 安全负向指标：是否出现越权访问、读取工作目录之外文件、执行非预期命令。Blender 看 execute_code 是否超出预期；jevreel 确认视频帧与问题允许外发到 TypeSafe；WhatsApp MCP 确认没有发送消息、没有多人共享；im-mcp 确认只读、明文数据库已按需清理；claude-security-scan 确认没有明文秘密、没有对测试仓库/账号产生写入或发送、报告权限 700；vulnerator-ai 确认没有越出靶场或授权范围、前门没有暴露原始 kali_run；TradingView 确认没有接真实账户、没有下单；AWS 确认先只读/最小权限、CloudTrail 能看到 agent 动作；flashmind 确认规则文件与技能只有一份、记忆库没有存进未经核实的结论；mcode-stack 确认技能只从可信仓库安装、没有把密钥写进技能目录或日志；snapgent 确认只在非敏感仓库、没有非预期文件改动、扩展站点权限和 MCP 写权限没有超出预期；expo/skills 确认没有把密钥写进技能目录、没有让 agent 直接对生产 EAS 做不可逆操作；kensaku 确认索引没有同步到共享位置、agent 没有写文件或重建索引权限、没有把敏感目录纳入索引；radar-cnpj-mcp 确认默认遮蔽 MEI 联系方式、没有把索引或导出数据同步到共享位置、B2B 接触遵守 LGPD 并提供不再联系渠道；trustabl 确认生成文件只写在仓库内、没有覆盖手写文件、SKILL.md 不含敏感信息、规则确实来自受控来源；poki 确认只用备用 iPhone、没有在主力机跑、没有未经确认的付款/群发/不可逆按钮、屏幕内容外发范围可接受、第三方 App 自动化没有违反 ToS。
对照试验设计：所有系统从同一入口、同样预算、同一个问题出发，抓到的内容交给同一个回答 LLM，由同一个 judge 打分，只让被试工具这个变量变。没有对比性指标的工具，先用流程内建测试和真实重复任务做前后对照。vulnerator-ai 的对照要额外固定靶场和目标；TradingView 只比接入与只读查询；AWS 要固定账号/沙箱、区域和任务；flashmind 要固定仓库、客户端和任务类型；mcode-stack 要固定仓库、任务类型和技能组合，只比较调用技能与不调用技能；snapgent 要固定同一个聊天站点、同一个测试仓库和同类任务，只比较手动复制粘贴与接 connector；expo/skills 要固定同一个 Expo 项目、同一个 agent 和同类任务，只比较装技能与不装技能；kensaku 要固定同一组本地检索任务，只比较接索引与手动翻目录；radar-cnpj-mcp 要固定州、参考月份、CNAE/城市/筛选条件，只比较 CLI 与 agent，或接与不接；trustabl 要固定同一个仓库、同一类任务和同一套测试/检查，只比较生成并审查 skill 前后；poki 要固定同一台备用 iPhone、同一组只读任务和可逆写任务，只比较接 MCP 与手工操作，并重复第二遍看耗时是否下降。
可参考的作者自测数据（非独立验证）：jevcrawl 50 个 WebWalkerQA 任务答对 40%、找到答案页 54%、$0.025/任务；与 Crawl4AI 0.9.4 的 20 任务对照答案页 10 vs 5；docs.python.org 示例 80,034 tokens 压到 1,873 tokens。CLI-Anything README 自报 2,461 个测试通过、pytest 100%；无第三方复现。reason network 没有效果数据、指标或案例，仓库 33 stars。idx 未见效果数据、性能数字或对比指标，正文在第 9 步后被截断。Blender 扩展 705 stars，没有用户案例、成功率、耗时对比或基准数据。jevreel 作者自测成本与暂停菜单对照；底层 Jev 图像能力仍是实验性，验证只基于单个测试视频。WhatsApp MCP 的 HN 35 points 只说明关注度；作者只在一个真实账号上跑过。im-mcp 只有兼容性验证表，没有效果指标或对照数据；毫秒级响应为作者声称。claude-security-scan 32 stars；没有检出率、误报率、真实用户案例或独立评测。vulnerator-ai 没有准确率、耗时、成本或对比基线；默认无 scope-guard、无 consent、无 audit、无授权闸门。TradingView 零效果证据，互动量只说明关注度，原文在启动命令后截断。agent-toolkit-for-aws 是官方 README，约 3196 stars 只是关注度；没有独立测评、客户案例或 skills 端到端指标。flashmind 31 stars；没有防幻觉规则正文、没有 4 个 SKILL.md 正文、没有基准或前后对比。mcode-stack 有 15 个技能徽章、validate 徽章和配套文章，但本次没有使用前后对比、缺陷率、节省时间、采用率等量化数据，也没有各 SKILL.md、checklists/、WORKFLOW.md 正文。snapgent-connector 53 stars、V3.3、GPL-3.0；没有独立安全审计、性能基准或用户案例；没有任务成功率、时间节省、错误率或基准数据。expo/skills 3658 stars、今日 +90 只是热度信号；没有误选率、成功率、耗时或装了之后工作变好多少的任何度量。kensaku 1.0.6、MIT；作者自测 Linux 8 vCPU、SSD、100,000 文件下文件名内存搜索平均 1.3 ms、首次索引 101,101 文件 184 s、峰值 183 MB、无变化重索引 0.56 s；案例是作者演示，不是独立效果研究。radar-cnpj-mcp 的 36 stars、CI badge 和示例数字 2.301 / 1.407 / 783 只是结果形态示例；毫秒级、7000 万+、几秒下载、导入几分钟均为作者陈述，未独立验证。trustabl 的 42 stars、v0.1.0-rc.1 只说明关注度和版本状态；没有生成的 SKILL.md 样例、没有检测规则正文、没有案例或前后对比数据。poki 的 126 stars、v0.1.0 只说明早期关注度；没有成功率、耗时或对照数据；「Gets faster with use」只是作者主张；真机只在中国区界面语言的 iPhone 上验证过，真机仅支持竖屏。
最小试用方式与试多久：jevcrawl 半天内完成，准备一个答案埋在首页几跳之下、站点不依赖 JS 的真实问题，先跑现有方式再接 jevcrawl 跑同一个问题，交给同一个评审对照打分。REA 以完成一轮注册→枚举→冒烟→对照为准。CLI-Anything 以跑通一条真实重复任务并留下一组对照为准。arcmira 以示例提示词跑通 + resolve 路径走通 + quote 预估与实际对得上为一轮。reason network 以 2 人配合跑通一轮 who → 问答 → send → 离线补发为准。idx 以零安装跑通 → JSON 契约核对 → MCP 注册 → agent 一次调用 → 离线一次为一轮。Blender 以单助手四条提示词跑通 + 团队链把同一任务重做一次为一轮。jevreel 以 index → ask → zoom 跑通 + 一次插件/MCP 接入 + 一次 lens 过滤为一轮。WhatsApp MCP 以部署 → 链接个人账号 → 只读搜索/摘要/补名 → 与人工完成同一组任务对照为一轮。im-mcp 以初始化 → 客户端接入 → 3–5 个真实只读任务 → 与人工对照 → 清理为一轮。claude-security-scan 先 --demo，再只登录一个低风险域，用 --skip repos 跑一次；确认报告生成、失败项进入未能确认、没有明文秘密、没有写入/发送后，再逐域增加登录；连续两周记录 NEW 项和人工复核结果。vulnerator-ai 以 --with-juice-shop 起栈 → 四容器健康 → TUI 里跑一轮靶场 → 前门 6 个工具各走一次 → 与人工 checklist 对照为一轮；至少跑两轮再决定是否扩大。TradingView 半天内完成只读接入实验；连续启动/调用 10 次记录失败次数；不要用盈亏评估这一轮。AWS 先选一个 AWS 仓库和一个边界清晰任务，只装 aws-core，在沙箱账号或只读权限下做一轮；先跑未装基线，再跑装后同任务，记录完成、耗时、CloudTrail 审计、权限边界。flashmind 两周；只选一个真实仓库、一个客户端，只装 MCP 记忆 + 规则文件 + verify-before-done 一个技能；记录两类幻觉事件计数、返工时长、记忆库过期比例、测试通过率，与试用前对照。mcode-stack 建议 2–3 个技能，不要一次装整套；优先 long-command-check + independent-review + harness-experiment；装到 ~/.agents/skills/，新开会话用 /skills 确认可见，再在真实任务中调用；同时保留一个不调用技能的对照会话；没有可观察改善就停在 try。snapgent 原文未给时长；至少用 2–3 个边界清楚的任务做手动复制粘贴基线和接 connector 的前后对照；每次接受修改前看 git status 和 git diff；出现 bridge 不稳定、AI 不使用工具、权限过大或工作区意外改动就停止扩大。expo/skills 约半天；选一个真实 Expo 项目，装技能、重启/刷新会话，用四条示例提示词验证路由；至少一条任务产生可审查改动后，再决定是否接 MCP。kensaku 1–2 周；选一个包含文档、截图、代码或日志的项目文件夹建立索引；保持 agent 只读，接入一个 MCP 客户端；用固定任务集做前后对照，记录找到目标的时间、前 5 条命中率、退回手动翻目录次数、agent 重试次数、OCR 误识别和隐私暴露事件。radar-cnpj-mcp 半天内；只下一个州，先 CLI 校准，再接 agent，跑三类任务：纯计数（市场容量）、条件筛选 + 导出（名单）、口语活动 → CNAE 映射；与人工查税务局 CSV 或买第三方数据的同任务耗时对照。若 CNAE 映射频繁出错，或业务根本不需要巴西企业数据，就停在 try。trustabl 以一个仓库、1–3 个同类小任务为一轮；先记录测试通过率、lint/类型检查、已有可靠性 findings 和人工 review 意见作为基线；生成并人工审查 SKILL.md 后让代理做同类任务，再用同一套检查比较；若 SDK 识别错误、规则不适用或引入敏感信息，停止试用。poki 建议 1 天内完成最小试用：备用 iPhone USB 配对，按源码或预构建包启动，注册到 Claude Code；只读任务每类 3 次（浏览器搜索并总结、读取某个 App 列表页并结构化输出、一个没有 API 只能点界面的真实小任务），再跑可逆写操作 3 次（给自己发消息、新建备忘等），全程盯着屏幕；每类重复第二遍。若只读任务成功率高、接管少，可收录为「无 API 移动端流程」执行方案（仍限制在只读或可逆操作）；若接管频繁、需要反复人工纠偏，或出现未经确认的不可逆动作，降级为 study，只保留「MCP 接真机」思路。

## 常见坑
- 把「注册成功」当成「验证完成」。REA 原文没有 list/枚举命令，要查 Hermes 文档补上；jevcrawl 至少还有 uvx jevcrawl doctor；arcmira 至少还有 arcmira_describe；reason network 至少还有 reason network who；idx 至少还要去客户端确认 idx 出现、工具数可枚举；Blender 至少还要跑一遍检查场景→建对象→复制排列；jevreel 至少还要 ask 真问一次、zoom 真看一次；WhatsApp MCP 至少还要看 /debug 的 paired 与 last_pull；im-mcp 至少还要初始化成功、客户端真调一次检索工具；claude-security-scan 至少还要 --demo 打开报告、再只对一个低风险域 --skip repos 跑一次并人工复核；vulnerator-ai 至少还要四容器健康、前门 6 个工具各走一次、stop_run 真能停；TradingView MCP 至少还要看到 server 被识别、工具列表可枚举；AWS 至少还要看到 aws-core 插件、skills 和 MCP Server 在客户端出现；flashmind 至少还要看到 flashmind MCP 服务、规则文件落到正确路径、技能只有一份副本；mcode-stack 至少还要 /skills 列出技能、在真实任务中调用一次并保留对照；snapgent 至少还要看到 snapgentV3 图标、bridge 保持开启、VS Code target 可用、聊天 AI 实际调用工具；expo/skills 至少还要重启/刷新会话后看到技能被发现、示例提示词触发对应技能；kensaku 至少还要 kensaku-cli search 命中已知文件、MCP 客户端列出 kensaku 服务；radar-cnpj-mcp 至少还要看到 7 个工具可枚举、status 显示参考月份和已导入 UF、agent 计数与 CLI 同参数一致；trustabl 至少还要看到 MCP 服务出现、trustabl_forge 可调用、SKILL.md 写到指定路径且经过人工审查；poki 至少还要看到 poki-mcp 注册成功、list_devices 返回设备 UUID、只读示例任务真的完成。
- 把作者自测当独立证据。jevcrawl、CLI-Anything、reason network、idx、Blender 扩展、jevreel、WhatsApp MCP、im-mcp、claude-security-scan、vulnerator-ai、TradingView、agent-toolkit-for-aws、flashmind、mcode-stack、snapgent、expo/skills、kensaku、radar-cnpj-mcp、trustabl、poki 都只有 README、作者自测或关注度，不等于独立效果证据。
- 在主力环境里直接跑第三方包。REA 依赖 npx、jevcrawl 依赖 uvx、CLI-Hub 依赖 pip，都会拉取并执行第三方包；arcmira 在厂商沙箱里执行；idx 是静态二进制直连公开数据源；Blender 扩展的 Python 工具验证不是安全沙箱；jevreel 的视频帧与问题会发到 TypeSafe；WhatsApp MCP 使用非官方协议；im-mcp 会把本地数据库解密后明文落盘；claude-security-scan 会读取多账户敏感信息；vulnerator-ai 默认没有 scope-guard、consent、audit；TradingView MCP 是本地 Node 进程；AWS 会访问 AWS API；flashmind 通过 npx 拉取 npm 包；mcode-stack 是技能文件，安装前要确认来源和目录权限；snapgent 是 unpacked 浏览器扩展加本地 bridge，可能读写 VS Code 工作区；expo/skills 通过官方插件市场或 skills CLI 装技能；kensaku 的索引包含文件名和抽取文本，应视为敏感数据；radar-cnpj-mcp 会下载公开企业数据到本地，导出名单也可能含联系方式；trustabl 通过 npx 拉取 tgz，首次会下载 analyzer 二进制和规则仓库，并把 SKILL.md 写进仓库；poki 控制真实 iPhone，屏幕内容会发送到模型服务，写操作会真实发生。
- 忽略版本写死。rea-agents@6.3.0、jev-1.13.0、jev-1.14.0、微信/钉钉版本、Node ≥20 的 radar-cnpj-mcp、v0.1.0-rc.1 的 trustabl、v0.1.0 的 poki 都是写死或强依赖的；换版本要重新核对。
- 以为 jevcrawl 能爬任何站点。它不执行 JavaScript、不读 robots.txt、不登录、不绕付费墙和 CAPTCHA。
- 忽略内容外发。jevcrawl 会把页面文本发送到 TypeSafe；API key 只从环境变量读，不落盘、不写日志。
- 把 401 当故障。arcmira 对无凭证请求返回 401 + OAuth 挑战，这是登录/开户路径。
- 把名字当 id 传。arcmira 的过滤器只接受原样 id，传名字会在发网络请求前抛 id_required；必须先 resolve。
- 连上就开始猜方法签名。先调 arcmira_describe，把 id 规则、参数与返回字段、计量规则、错误码一次读全。
- 不看清计量规则就批量跑。arcmira 搜索按超出前 5 条的每条 passage 收 4 credits；Premium 转录每开始 15 分钟收 300 credits；贵操作前先 arcmira.quote。
- 以为 arcmira 工具有预算参数。预算在 dashboard 设；被拦住时按返回的 code 分支处理。
- 把「还在转」当失败。Premium 未就绪时返回 202 + Retry-After，按它重读不重复计费。
- 建了 arcmira monitor 就以为能删。它不提供删除，只能 paused。
- 把厂商自述当独立证据。arcmira 的数据覆盖与说话人/赞助识别准确性全是厂商自述。
- 把「安装成功」当「任务有效」。CLI-Hub 装完 harness 后，要接进 agent 跑一条真实重复任务。
- 忽略上游软件依赖。大量 CLI harness 包装真实桌面软件；不先装上游软件，cli-hub launch 不会产生有效结果。
- Windows 上直接跑 Claude Code 生成路径。需先装 Git for Windows 或使用 WSL，否则会报 cygpath: command not found。
- 给 GUI 客户端手写相对路径或 idx。GUI 应用通常不继承 shell 的 PATH；用 idx mcp setup <client> 生成绝对路径。
- 从 stdout 以外的地方捞数据。idx 约定 stdout 只放一个 JSON 文档、其余全部走 stderr。
- 把 null 当 0、或当成「该自己补一个」。idx 对来源未返回的字段写 null，不做估算。
- 不看退出码。idx 用 0/2/3/4/5/6 分语义；靠解析错误文本做分支，换个版本就碎。
- 把 Blender 扩展的 Python 工具验证当安全沙箱。它用于拦截不允许操作，不是隔离机制；高影响操作是 execute_code、export_scene、import_asset。
- 默认团队链一定更好。Blender 扩展 README 没有量化指标，审核开销可能大于收益；先用单助手跑通同一任务，再换团队链对比。
- 把 jevreel 的底层图像能力当成熟能力。README 明确它是实验性，验证只基于单个测试视频。
- 把 jevreel query 当收费操作、或把 lens 事后跑当免费。query 过滤不产生请求；lens 随索引请求一起走几乎免费，事后再单独跑是每分钟视频一次请求。
- 用 WhatsApp MCP 的免费 Cloudflare 计划，或以为首次导入失败会自动补。README 要求 Workers Paid，免费计划未验证；首次历史导入每个链接只发生一次，失败后要重新链接才能补。
- 以为 WhatsApp MCP 能发消息、能多人共享、能转写媒体。它不能发送；媒体只显示标签，不下载不转写；一个部署对应一个账号和一个 owner。
- 在公共机器上跑完 im-mcp 不清理。先完全退出 AI 客户端；用 im-clean --dry-run 预览，再 im-clean；最后 uv tool uninstall im-mcp。
- 把第三方安全技能当「只读就安全」。claude-security-scan 会读取 Mac 本体、本地全部 git 仓库、GitHub、Vercel、多个云和 Gmail；先在隔离或低风险环境只登录一个域试。
- 一上来就全量扫描 claude-security-scan。先 --demo，再 --skip repos 只对一个低风险域跑。
- 把「未能确认」当「没有问题」。缺工具、缺权限、抓取失败都会进入「未能确认的项目」并附理由。
- 把 vulnerator-ai 的「默认无护栏」当成「有默认护栏」。安装完就是裸的；两个 opt-in 控制项也不是 consent、不是防火墙。
- 对未授权目标跑 vulnerator-ai。它只能对已获书面授权的目标使用；没有书面授权、没有隔离靶场，就先不要起栈。
- 把 vulnerator-ai 的前门当执行体。前门只暴露 run 生命周期，不暴露原始 kali_run。
- 把 TradingView 推文标题当教程。原文在 node src/cli.mjs launch 后截断，没有策略、代码、回测、结果；只能当接入线索。
- 把 agent-toolkit-for-aws 的官方 README 当独立效果证据。它给出安装命令和覆盖范围，但没有独立测评、客户案例或 skills 端到端评估指标。
- 只装插件不配 AWS 凭据或只读权限。API 调用和脚本执行需要本地 AWS 凭据；先在沙箱账号或只读权限下跑。
- 把 skills 当 MCP Server。Kiro、fx 和其他 agent 的手动路径要分别配置 MCP Server 和安装 skills。
- 把 flashmind 的接线当效果。原文没有防幻觉规则正文、没有 4 个 SKILL.md 正文、没有基准/案例/前后对比。
- 一次启用四个 flashmind 技能。多变量混淆；先只启用 verify-before-done，两周后再扩。
- MCP 配置重复粘贴。只保留一个 flashmind 和一个 engram 键；改现有条目而不是追加第二份。
- 把记忆库当真相。Engram 是第三方组件；信任前用 mem_review 对照当前代码复核，只保存经 /verify 确认的决策。
- 把 mcode-stack 的 README 当技能正文。本次只有 README，没有各 SKILL.md、checklists/、WORKFLOW.md 正文；先打开目标技能目录里的 SKILL.md 再照做。
- 一次装整套 mcode-stack 15 个技能。多变量混淆；先只装 2–3 个，优先 long-command-check + independent-review + harness-experiment。
- 把「安装成功或 /skills 能列出」当效果。要在真实任务中调用并保留不调用技能的对照会话；没有可观察改善就停在 try。
- 以为 mcode plugin add 能从 GitHub URL 或本地路径安装。它只从官方目录安装；本地 stack 要复制到 mcode plugin marketplace list 显示的本地插件目录，再到 /plugins 刷新启用。
- 以为 MiniMax Code 桌面端市场安装一定可用。README 说该功能在逐步开放，部分版本可能没有；没有就回到单技能安装或本地插件目录。
- 把 mcode-stack 当自动触发工作流。README 没有说明定时、事件或状态触发机制；它给的是技能、检查清单和工作流文档。
- 忽略 mcode-stack 的技能发现路径。技能可放 ~/.agents/skills/、项目级 .minimax/skills/、.claude/skills/、.agents/skills/，全局还会读 ~/.claude/skills/、~/.codex/skills/；放错位置 /skills 看不到。
- 把 harness-experiment 当一次跑完就算。README 要求小评估、一次只改一项、重复运行、看翻转任务；不重复运行无法判断波动。
- 把 independent-review 的干净上下文当普通评审。它要求只提供 diff、需求和测试结果；把完整会话和历史都塞进去就失去「独立」条件。
- 把浏览器聊天接本地工作区当无风险。snapgent 扩展是 unpacked 加载，涉及站点权限；bridge 路由到 VS Code MCP，可能读写工作区；先只在非敏感、可丢弃仓库试用，每次接受修改前看 git status 和 git diff。
- 关掉 bridge 后以为 agent 还能工作。使用期间 bridge 窗口或终端必须保持开启；bridge offline 时重新启动对应 launcher。
- 把「无需终端」当成所有平台都成立。Linux 需要在终端运行 bash Linux_Start.sh，各平台也要求保持 bridge 窗口或终端开启。
- 把默认 24 个 workspace 工具当完整能力清单。原文只说默认 VS Code MCP server 标注有 24 个 workspace 工具，仍要在客户端核对实际工具名称与参数。
- 忽略 snapgent 的站点限制。ChatGPT/Claude 禁用图片输入和截图；Grok 需要登录 xAI；Gemini 或 Kimi 长会话可能停止使用工具；Arena 要用 Direct 模式。
- 以为 snapgent 有定时或事件触发。原文没有时间、事件或状态触发的自动任务；会话由用户点击 Start 并发出指令启动。
- 把 expo/skills 的 README 技能清单当各 SKILL.md 正文。原文只给安装命令、技能分组和示例提示词，没有 SKILL.md 实际内容；先打开对应技能文件再判断是否照做。
- 装完 expo/skills 不重启/刷新会话。README 明确要求重启或刷新 agent 会话，否则技能不被发现。
- 把 npx skills@latest add expo/skills --skill '*' 当成「装全部 agent」。它选的是「全部 Expo 技能」，不是「全部 agent」；不加 --agent 时 CLI 会询问装到哪里。
- 把 expo/skills 当效果证据。官方 README 没有误选率、成功率、耗时或前后对比；路由有效性是设计声明，不是验证结果。
- 忽略 expo/skills 的付费边界。Services 组核心依赖付费 EAS；先看技能开头的成本/套餐限额，再决定是否让 agent 触发构建或工作流。
- 把 kensaku 当云搜索或已上线的「向文件提问」答案层。它是本地索引和检索工具；「向文件提问」只在路线图中。
- 把整个磁盘或敏感目录纳入 kensaku 索引。索引包含文件名和抽取文本，应视为敏感数据；先只选一个工作文件夹，默认跳过凭据文件和常见构建目录，不要同步到共享位置。
- 给 kensaku 开写操作或重建索引权限。README 说明 agent 工具不能改文件、reindex 默认关闭；保持只读，除非确有需要。
- 把 kensaku 的性能基准当工作效果。1.3 ms 文件名搜索、184 s 首次索引等是作者在特定 Linux 环境下的自测，不是任务完成质量提升的证据；要做前后对照。
- 把 kensaku 的检索结果当指令。响应有大小预算，文件内容作为数据返回、不作为指令；不要让 agent 把文件里的文本当系统提示执行。
- Node <20 跑 radar-cnpj-mcp。README 要求 Node.js 20 或以上。
- 一次下载所有州。先只下目标州以控制体积；README 称可只下需要的州。
- 把 agent 给出的计数直接当准数。先用同一 CNAE/UF/城市/筛选条件跑 CLI contar/buscar，核对 agent 答案。
- 把示例数字 2.301 / 1.407 / 783 当验收标准。README 未标参考月份，只能当结果形态示例。
- 不看 status 的参考月份和已导入 UF 就信任数字。先跑 npx radar-cnpj-mcp status 或 status_base。
- 需要电话/邮箱外呼时忽略 MEI 默认遮蔽。工具默认隐藏 MEI 电话与邮箱；要显式处理并核对遮蔽比例。
- 把工具当 LGPD 合规背书。LGPD 合规责任在使用者；B2B 接触时报价要与对方活动相关，并提供不再联系渠道。
- 忘记每月重跑 baixar。README 要求每月重跑一次更新数据库；否则数据会旧。
- 把它用于巴西以外市场。radar-cnpj-mcp 只覆盖巴西 CNPJ 公开数据。
- 把「毫秒级、7000 万+、几秒下载、导入几分钟」当已验证性能。这些是作者陈述；本次只读到 README，未读源码与测试，导入耗时、磁盘占用、内存需求、更新延迟、与税务局原始数据一致性均未验证。
- 把生成 SKILL.md 当效果。trustabl 没有给出 SKILL.md 样例、没有检测规则正文、没有案例或前后对比；必须人工审查并用现有测试/扫描验证。
- 省略 path 以为工具会自动定位仓库。README 说只有客户端通过 MCP roots 报告 workspace 时才可省略，而 Claude Code/Cursor/Claude Desktop 该项状态均为 pending；试点时按必填处理。
- 不提供 output_path 以为会写文件。只有提供 output_path 才会写；路径必须留在仓库内。
- 让生成物覆盖手写文件。已有文件只有在是 Forge 生成时才会被替换；仍要在生成后检查 diff，确认没有覆盖手写内容。
- 把生成的 SKILL.md 当一次生成永久有效。依赖或 Trustabl 规则变化后要重新生成并重新审查。
- 首次调用断网或限流就判定工具不可用。首次要下载 analyzer 二进制和规则仓库，之后才缓存离线；GitHub 匿名限流时设 GITHUB_TOKEN，或用 TRUSTABL_BIN 指向本地构建。
- 把 v0.1.0-rc.1 当稳定版。它仍是 RC，42 stars 只是关注度，SECURITY.md 未提供；不要在多个仓库全量铺开。
- 把 Cursor 配置当已验证。Cursor 在清单中仍是 watch；配置可用不等于效果已被证明。
- 让未经审查的生成内容直接进代理上下文。先审查 SDK 识别、规则适用性和敏感信息，再让编码代理读取。
- 把 poki 当无风险的真机自动化。它控制真实 iPhone，发消息或付款就会真做；屏幕内容会发送到模型服务；第三方 App/网站自动化可能违反 ToS，账号受限后果自担。只用备用机，先只读，再可逆写，不要从付款、群发、不可逆按钮开始。
- 在主力 iPhone 上试 poki。误发消息、误付款或误触不可逆按钮会影响真实账号；用可清空的旧 iPhone 做靶机。
- 没有完整 Xcode 或 Intel Mac 就硬上 poki。预构建包仅 macOS arm64，且要求完整 Xcode（不是 Command Line Tools）；不满足就停在 study。
- 把 poki 的「越用越快」当已验证。README 只有一句主张，没有成功率、耗时或对照数据；要自己重复第二遍测。
- 以为 poki 支持所有 iPhone 界面。真机只在中国区界面语言的 iPhone 上验证过，仅支持竖屏；App 容器导出、跳转 Settings 子页面直链不可用。
- 忽略 poki 的 AGPL-3.0-only。若把它的代码集成进对外提供的服务，要考虑开源传染性。
- 注册 poki 时 $PWD 不是仓库/包目录，或终端 A 的 npm start 没在跑。注册命令里的路径会失效，桥也连不上；路径含空格时给 $PWD/src/stdio.mjs 加引号。

## 证据与来源
本节说明每个做法依据哪类材料、有哪些数据、哪些只是作者主张。
- 做法 A jevcrawl：可核查的是 README 的安装命令、参数默认值、输出字段与环境变量表。数据均为作者自测：50 个 WebWalkerQA 任务答对 40%、找到答案页 54%、$0.025/任务；与 Crawl4AI 0.9.4 的 20 任务对照答案页 10 vs 5、中位爬取时间 29s vs 43s；docs.python.org 示例 80,034 tokens → 1,873 tokens。作者主张无独立验证：比 LLM 驱动爬取快、天然抗 prompt injection、引文逐字可溯源。原文自陈局限：样本小；不执行 JavaScript；不读 robots.txt；页面文本会发送到 TypeSafe。
- 做法 B REA/Hermes：可核查的是一条完整接入命令，以及 REA 设置菜单已支持 Claude Code 和 Codex 的事实陈述。只是作者主张、未经原文验证：接入后代理会多出 139 个工具；能力清单在列举处被截断。Matthew 的 REA 帖子 230 万次浏览是曝光量，不是效果证据。
- 做法 C：不接入的降级做法，依据是各路径原文在工具清单、验证方式或效果数据上的缺口。
- 做法 D CLI-Anything：可核查的是 README 的安装与使用命令、各宿主安装脚本。作者主张无第三方复现：CLI 是人和 agent 的通用接口；7 阶段流水线能生成 CLI、测试、文档并发布；README 自报 2,461 个测试通过、pytest 100%。原文明确：大量 harness 依赖上游桌面软件；Windows 需 Git for Windows 或 WSL；没有对比性指标。
- 做法 E arcmira：可核查的是接入命令、arcmira_describe、id_required 与 resolve 语义、Premium 转录的 202 + Retry-After、credits 计量规则、错误码清单、monitor 方法集、沙箱出站白名单与永不 DELETE。厂商自述、无第三方复现：数据覆盖与说话人/赞助识别准确性。
- 做法 F reason network：可核查的是安装方式、四条 CLI 命令、MCP server 名与三个工具名、按 agent 区分的投递时机、网络与安全模型、状态目录。只是作者主张、没有数据支撑：整套「团队协作因此变好」的说法；README 没有任何使用数据、性能数字、前后对比或用户案例；仓库 33 stars。
- 做法 G idx：可核查的是安装方式、npm 启动器校验、idx -o json 的 envelope 字段、缺失字段为 null 不估算、退出码语义、idx mcp 的 stdio 与 HTTP 形态、idx mcp setup 打印绝对路径、各客户端注册命令、23 个工具名与筛选语法、仓库数据保鲜流水线。调研未给出效果数据、性能数字、前后对比；正文在第 9 步后被截断。
- 做法 H Blender 扩展：可核查的是 README 的安装与使用信息、Windows x64 + Blender 4.2+、21 个工具清单、单助手与 Manager/Worker/Reviewer 团队链、四条提示词、OpenCode Portable 与其他兼容客户端、控制与安全说明。仅为作者主张、无数据支撑：更快迭代、自动化重复工作等价值描述；没有用户案例、成功率、耗时对比或基准数据。仓库 705 stars；Release 1.0.0、MIT。
- 做法 I jevreel：可核查的是 README/调研给出的命令与机制、lens TOML、插件安装命令、手动 MCP 命令、环境变量表、四步工作流、MCP 工具与 CLI 对照。数据均为作者自测：10 分钟 1080p 视频单张 sheet 约 $0.00025、索引 $0.0033、一次 ask $0.004–0.005、重复 ask $0；暂停菜单仅 screening 得分 0.36 / 0.50 / 0.95，验证前漏掉两个、验证后全部捞回。底层 Jev 图像能力仍是实验性，验证只基于单个测试视频；原文在 Claude Code 插件部分被截断。
- 做法 J WhatsApp MCP：可核查的是 README 的完整部署命令、配置项、工具表、架构和调试步骤。HN 的 35 points、23 comments 只能说明关注度。作者明确说只在一个真实账号上跑过；首次历史导入每个链接只发生一次，失败后要重新链接；免费计划未验证；媒体不下载、不转写；一个部署对应一个 WhatsApp 账号和一个 owner；非官方实现，作者承认违反 WhatsApp 条款。
- 做法 K im-mcp：可核查的是 README 的安装命令、初始化命令、客户端配置、清理命令、工具表、兼容性验证表。原文只给了兼容性验证，没有任何效果指标、任务成功率或对照数据；「毫秒级响应」是作者声称。工具声明只读，但本地数据库会解密为 SQLite、明文落盘；没有 cron、webhook、守护进程说明。
- 做法 L claude-security-scan：可核查的是 README 的检测项清单、安装命令、各域准备方式、报告路径、安全设计和限制；仓库 32 stars。没有检出率、误报率、真实用户案例或独立评测，也没有代码审计结果。原文自述限制：Google Workspace 整体管理设置不在范围；AWS 默认只查东京和弗吉尼亚；不做攻击性检查；检测结果需人工最终判断。这是会读取多账户敏感信息的第三方技能，只读与脱敏设计尚未在本次材料中经过代码级验证。
- 做法 M vulnerator-ai：可核查的是四容器架构与端口、Kali 工具清单、install.sh 的行为、三个可选 flag、TUI 命令、stdio 模式的 MCP 配置、六个 MCP 工具名、两个 opt-in 控制项及其边界说明、MIT 许可、OWASP Juice Shop 练习靶场、docs/design.md 的 findings-store schema、docs/example-report.md 的脱敏样例。原文没有任何准确率、耗时、成本或对比基线数据，没有独立评测和用户案例；设计上刻意没有 core、没有 REST API、没有 UI、没有 gates；默认无 scope-guard、无 consent、无 audit、无授权闸门。
- 做法 N TradingView-Unified-MCP：可核查的只有两步接入动作——安装 Claude Code、下载解压仓库并在根目录执行 node src/cli.mjs launch；原文在第二步命令后被截断。零效果证据：没有策略、代码、回测、收益、胜率、截图或日志；互动量约 50 赞、6 转发、3 回复，只说明关注度。作者主张「通过与 Claude 对话构建了一个交易机器人」未经验证；MCP 注册、账号/订阅、API 凭据、工具列表、进程是否常驻均需从仓库 README 补。
- 做法 O agent-toolkit-for-aws：证据来自 AWS 官方 README，仓库状态为 GA，许可证 Apache-2.0，约 3196 stars。可核查：多 agent 安装命令、Kiro/fx 的 MCP JSON 配置、skills 安装命令、插件覆盖范围、项目级 rules 目录、IAM 条件键/CloudWatch 指标/CloudTrail 审计的陈述。局限：只有官方文档，没有独立测评或客户案例；没有 skills 端到端评估指标；没有 IAM/CloudWatch/CloudTrail 配置样例；没有 rules 文件内容；没有提示词模板。
- 做法 P flashmind：可核查的是 npm 包名 flashmind、MIT、31 stars、Node ≥18、可直接复制的 MCP JSON、六种客户端配置映射表、技能触发条件表、更新与去重规则、Gemini CLI 斜杠命令、隐私承诺。属于作者主张、原文未提供支撑的：「消除幻觉」「让快模型记得住、会规划、会验证」；没有任何基准、案例、前后对比数据或用户反馈。关键缺失：防幻觉规则的实际正文和 4 个 SKILL.md 的正文都没有出现在抓取到的文本里。
- 做法 Q mcode-stack：证据来自仓库 README，MIT（部分 stack 的 NOTICE.md 可能另有说明），有 15 个技能徽章、GitHub Actions validate 徽章、01–04 和即将发布的 06 篇配套文章；安装命令、目录发现规则、插件市场命令和技能清单是具体可执行的。六个 engineering-* 技能注明改编自 Google Engineering Practices，改编材料保持 CC-BY 3.0。只是作者主张：README 称这些是团队「每天实际使用」的工作流，并称真正拉开差距的是代理周围的工程习惯；本次材料没有使用前后对比、缺陷率、节省时间、采用率等量化数据，也没有真实案例细节。关键局限：只拿到 README，没有各 SKILL.md、checklists/、WORKFLOW.md 正文，无法验证每个技能的具体检查项是否足够可照做；部分安装方式依赖 MiniMax Code 版本（插件市场在逐步开放），mcode plugin add 也不支持 GitHub URL 或本地路径。结论强度：try，先选 2–3 个技能小范围试用，打开 SKILL.md 后再决定是否采用其具体流程。
- 做法 R snapgent-connector：证据主要来自仓库 README：支持 provider 列表、系统要求、分平台安装步骤、启动方式、使用示例、架构说明、项目结构、排障表和测试文件；仓库 53 stars、release V3.3、GPL-3.0。可核查的接入动作是：加载 snapgent-extension 扩展、按系统启动 bridge、在 VS Code 打开项目、聊天栏点击 Start、用示例提示词发任务。作者主张包括：无需 API key、订阅或登录；无需终端、无需复制粘贴；Turn any AI chatbot browser to VS Code。但实际支持站点是有限列表，Linux 步骤需要在终端运行 launcher，各平台也要求保持 bridge 窗口或终端开启，因此「no terminal」不是完全无条件成立。README 还标注了 Gemini/Kimi 长会话可能停止使用工具、ChatGPT/Claude 禁用图片输入和截图、Grok 需要登录 xAI、Arena 要用 Direct 模式。局限：只有 README，没有独立安全审计、性能基准或用户案例；扩展以 unpacked 方式加载，涉及浏览器站点权限和本地 MCP 路由，VS Code MCP 可能读写工作区；README 对 provider 激活只给出文件位置，没有给出可直接复制的完整配置值；没有证据支持定时、事件触发或长期自主推进。结论强度：try，只在非敏感、可丢弃仓库小范围验证。
- 做法 S expo/skills：证据来自 Expo 官方 README。可核查：三条安装命令（Claude Code 插件市场、Codex curated 市场、skills CLI）、更新与单技能更新命令、反馈命令、四类示例提示词、完整技能清单与用途、免费 vs 付费分组、实验性技能单独插件、MCP 能力范围。只是作者主张、无独立验证：技能能让 agent 正确应用 Expo API；agent 能根据任务上下文和技能描述选对技能（未给误选率）。局限：强绑定 Expo / React Native / EAS；部分能力依赖付费 EAS；原文只是 README，没有各 SKILL.md 正文，无法判断技能写得是否足够可照做；3658 stars 和今日 +90 只是热度信号。结论强度：try，先验证路由，再决定是否接 MCP。
- 做法 T kensaku：证据来自仓库 README，MIT，版本 1.0.6。可核查：安装方式、源码构建前提、首次索引的排除项、CLI 检索命令、MCP stdio 配置、serve 的 loopback 与 bearer token 约束、agent 只读与 reindex 默认关闭、响应大小预算。数据为作者自测：Linux 8 vCPU、SSD、100,000 文件下文件名内存搜索平均 1.3 ms；首次索引 101,101 文件 184 s、峰值 183 MB；无变化重索引 0.56 s；10 万文件名与元数据约 12 MB；Windows 安装包 9 MB，加载 24,500 文件索引后托盘空闲约 20 MB 私有内存，活跃浏览约 150 MB。案例是作者演示，不是独立效果研究；没有推荐提示词模板，也没有证明能提升工作产出。局限：构建未代码签名、自动更新未接通；OCR 默认 Tesseract；视觉搜索 beta 且未进入搜索结果；Windows 获得最多真实测试，macOS/Linux 仍需更多验证；性能对比未测量 Spotlight、Everything、Listary，数字来自 Linux。结论强度：try，先限定一个文件夹、只读、1–2 周前后对照。
- 做法 U radar-cnpj-mcp：证据来自仓库 README：完整安装与接入命令、7 个 MCP 工具及职责表、过滤器清单、4 条示例问题与 1 组示例答案、CLI 示例、开发脚本、隐私默认、MIT、CI badge、36 stars。可核查的接入动作是 baixar、claude mcp add/JSON 配置、CLI status/contar/buscar、importar 路径。仅为作者主张、未经独立验证：毫秒级查询即使全巴西、7000 万+ establishments、几秒下载、导入几分钟；示例数字 2.301 / 1.407 / 783 无参考月份、无口径说明，只能当结果形态。局限：只覆盖巴西 CNPJ，离开巴西 B2B 基本无用；需要 Node ≥20；本次只读到 README，未读源码与测试，导入耗时、磁盘占用、内存需求、数据更新延迟、与税务局原始数据一致性均未验证；默认隐藏 MEI 电话/邮箱，会限制按电话名单外呼；LGPD 合规责任在使用者。结论强度 try：半天内只下一个州，先 CLI 校准，再接 agent，跑纯计数、条件筛选+导出、口语活动→CNAE 映射三类任务，与现状对照。
- 做法 V trustabl/agent-reliability-skills：证据来自仓库 README：Claude Code 安装命令、Cursor 的 mcp.json 配置、Claude Desktop 的配置路径、trustabl_forge 的 path/output_path/policy/lang 参数、写入保护（只有提供 output_path 才写、路径必须留在仓库内、只替换 Forge 生成的文件）、环境变量 TRUSTABL_VERSION/GITHUB_TOKEN/TRUSTABL_BIN、checksum 校验、支持 SDK 列表、首次下载 analyzer 与规则仓库后缓存离线。仓库显示 42 stars，版本 v0.1.0-rc.1。局限：没有给出实际生成的 SKILL.md 样例，没有展示具体检测规则，没有案例、前后对比数据或独立评测；README 中 Claude Code/Cursor/Claude Desktop 的 workspace 报告状态均为 pending；首次使用依赖联网下载二进制和规则；安全细节只指向未提供的 SECURITY.md；Cursor 在清单中仍是 watch。「编码时应用规则比事后扫描更好」目前只是作者主张，生成 skill 的质量取决于上游规则，且该工具仍是 RC 版本。结论强度：try，先在一个使用受支持 SDK 的仓库试点，生成后人工审查，再用团队现有测试和扫描做前后对照；不要虚构 analyzer 的扫描命令。
- 做法 W poki：证据来自仓库 README：安装/启动/注册命令、依赖清单、源码与预构建 macOS arm64 两种分发方式、一个可直接执行的示例任务、真机 USB 配对与开发者模式要求、AGPL-3.0-only。可核查的接入动作是 git clone 后 ./bin/setup 与 npm start、或解压预构建包后 npm ci 与 npm start、claude mcp add 注册 poki-mcp、node bin/call.mjs list_devices、poki 示例任务。仅为作者主张、无数据支撑：「Gets faster with use: Poki Agent remembers past tasks and runs them faster on repeat.」没有成功率、耗时或对照数据。原文自陈限制：真机只在中国区界面语言的 iPhone 上验证过；真机仅支持竖屏；App 容器导出、跳转 Settings 子页面直链不可用；平台限定 macOS，预构建包仅 arm64，且需要完整 Xcode；屏幕内容会发送到模型服务；写操作会真实发生；第三方 App 自动化可能违反 ToS，账号受限后果自担。仓库 126 stars、v0.1.0 说明早期、社区验证有限。结论强度：try，只用备用 iPhone，先只读任务，再可逆写操作；若接管频繁或出现未经确认的不可逆动作，降级为 study，只保留「MCP 接真机」思路。

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
