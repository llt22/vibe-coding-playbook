# 给 AI 的写操作和外部执行装上可审批、可回滚、可拒绝的边界

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：让 AI 在审计、改代码、调外部服务和跨机器执行时，不拿到超出任务所需的权限，并对写操作保留审批、回滚与可核验记录。
> 先试这一步：先选一个不重要的项目或账号，只读跑一轮；再把一次写操作改成“出草案→人工核准→存还原点→沙箱执行”；如果你在 Windows 11，用 MXC 的 Permissive 模式跑一个无害任务并看活动报告。
> 最近修订：2026-10-11

## 解决什么问题

付费媒体账户、外部服务账号、本地代码仓库都是真金白银或真实代码的操作面。AI 只读做审计、计划、创意、报告没问题；一旦能直接改账户、调外部服务或写代码，风险升级。本手册给六套做法：A 付费媒体账户默认只读、写操作逐条过六项门控；B 默认零权限、按任务只引入单个资源、有副作用动作先本地模拟再批量批准；C 本地仓库用 Claude 只读规划 + Codex 工作卡核准 + 沙箱执行 + git 还原点；D 在 Apple silicon Mac 上用 Strands Box 验证默认拒绝、凭证注入、OTLP 决策记录；E 云端 Claude Code 通过反向 SSH 隧道落到 Windows 本机执行，靠端口最小放行与凭据管理夹住边界；F 用 MXC 做沙箱化代码执行，并在 Windows 11 上用 Permissive→Learning→Enforcement 三模式为 agent 收敛权限边界。

## 适用与不适用

**适用：**

- 管付费媒体账户，有可授权导出或读取权限，用 Claude Code 或能消费 Agent Skills 的宿主。
- 要 AI 起草 + 人工审批 + 确定性验证，或默认零权限 + 按任务授权 + 延后批量审批，或双 CLI 分工 + 工作卡核准 + 沙箱执行 + 还原点。
- 能把权限与审批模式移植到 GitHub repo、Google Doc、Slack 等外部服务：Cloudflare OS 的 Gatekeeper 可本地体验。
- macOS、Node.js 20+、Git，已登录 `claude` 与 `codex`，想用本机网页界面跑双 AI 协作。
- Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、能访问 `us-west-2` Bedrock Claude Opus 5，想验证 Strands Box 的默认拒绝 + 语义策略 + 凭证注入 + 决策记录。
- Windows 10/11 x64 本机 + 自己控制的 Linux 服务器（x86_64，推荐 Ubuntu，已装 Docker），想让云端 Claude Code 在本机读写文件并执行命令。
- Windows 11，想用 MXC 把自主编码/操作 agent 放进策略驱动执行层，先观测再收紧权限边界；低延迟负载先用进程容器，敏感数据或不可信代码用更强隔离。
- 需要把执行能力嵌入应用，运行 model output、plugins、tools；Node SDK 最小试用在 Linux/macOS 最省事。

**不适用：**

- 非付费媒体账户运营；需要 AI 立即自动改账户、无人审批。
- 装不了 Claude Code 插件、不能消费 skill 文件的宿主；claude-ads 材料只有 README 首页，看不到 scoring.py 与 capability manifest 明细。
- 把 Cloudflare OS 当生产平台：early access、v2、自建服务器部署 COMING SOON、无 SLA；上游不接受大改动。
- 非 macOS 或不愿用本机网页界面跑 ai-meeting-room；想让会议室公开访问或监听 `0.0.0.0`。
- 需要 AI 直接产图；需要量化效果数据来决定采用。
- 非 Apple silicon Mac、macOS 低于 15、Node.js 低于 22.21，或无法访问 `us-west-2` Bedrock Claude Opus 5。
- 想把 Strands Box 当生产标准；`box.toml` 字段写法和 `policy.dw` 示例原文未给。
- 想让 `box.toml` 直接文件系统授权也产生 Dogwood 决策；它由 OS 执行，不产生单条决策。
- 想让 cc-desk-tunnel 当沙箱；把服务器放在共用或来路不明机器上；需要多用户、权限分级、租户隔离。
- 不能接受数据离开本机；需要专业安全审计的工具。
- 服务器所在地不在 Anthropic 支持的国家和地区；想要有代码签名的安装包。
- 想靠文档配置 cc-desk-tunnel 定时任务；只是偶尔跑一段生成代码。
- 想用 `--audit` 给不可信代码补权限；依赖 experimental 后端作为稳定生产。
- 源码构建环境不满足：Rust 1.93、Node.js 24+。
- MXC：原文没有一行配置示例、字段名、SDK 调用或命令，必须回 SDK 仓库补全；会话容器与 WSL 容器仅 Windows 11；MicroVM 实验性；Intune 与 Entra agent 身份区分尚不可用。

## 前置条件

- claude-ads：Claude Code；CPython 3.11/3.12；浏览器抓取需 Playwright；PDF 需 WeasyPrint/Pango；账户侧要有 client/account/KPI/privacy/guardrail 档案；凭证放环境变量、OS keychain 或 secret manager；写操作需 capability、对象 ID、before/after diff、审批上限、幂等键、审计目的地、回滚、验证窗口。
- Cloudflare OS：pnpm；本地数据在 `.wrangler`；部署需自己的 Cloudflare 账号；外部服务要各自 OAuth client 凭据。
- ai-meeting-room：macOS、Node.js 20+、Git、已登录 `claude` 与 `codex`；首次启动设定精灵问项目文件夹、手机入口、登录密码；可选 `.secrets/telegram-token.txt`、`.secrets/telegram-chat-id.txt`、`.secrets/gemini-api-key.txt`。
- Strands Box：Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、`us-west-2` Bedrock Claude Opus 5；下载脚本校验 checksum 到 `./box-core`；源码构建用 Cargo workspace；写策略细节读 `docs/user/getting-started.md`、`security.md`、`policy.md`。
- cc-desk-tunnel：一台有公网 IP 或域名的 Linux 服务器（x86_64，推荐 Ubuntu，已装 Docker）+ Windows 10/11 x64；记录服务地址、证书指纹、服务凭据；防火墙放行 8787 和 7000；客户端安装包自带 PowerShell 7、OpenSSH、frpc，无代码签名。
- MXC：Windows 11（会话容器、WSL 容器仅 Windows 11；进程容器支持 Windows 11/macOS/Linux）；从 MXC 仓库获取 SDK、configuration schema、文档与 samples；先只试进程容器；源码构建 Rust 1.93、Node.js 24+。

## 操作步骤

下面分成六套做法。A 付费媒体账户；B 可迁移的权限与审批模式；C 本地代码仓库双 AI 协作；D Strands Box 底层沙箱验证；E 跨机器执行位置边界；F MXC 代码执行沙箱 + Windows 11 三模式权限收敛。A/B/C/D/F 不冲突，E 不是沙箱，只宜自用小范围试。

### 做法 A：付费媒体账户（claude-ads）——默认只读、写操作逐条过门控

1. 安装。优先宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档；不要把远程安装脚本直接管道进 shell。
```text
/plugin marketplace add agricidaniel/claude-ads
/plugin install claude-ads@ai-marketing-hub-claude-ads
```
若在 v2.0.0 前加过，先移除旧别名：
```text
/plugin marketplace remove agricidaniel-claude-ads
/plugin marketplace add agricidaniel/claude-ads
/plugin install claude-ads@ai-marketing-hub-claude-ads
```
本地克隆：
```bash
git clone https://github.com/AgriciDaniel/claude-ads.git
cd claude-ads
bash install.sh --source=local
```
其他宿主：
```bash
bash install.sh --target=codex --source=local
bash install.sh --target=gemini --source=local --no-deps
```
PowerShell：
```powershell
git clone https://github.com/AgriciDaniel/claude-ads.git
Set-Location claude-ads
.\install.ps1 -Source local
```
2. 先建档：`/ads setup`。前提：有授权导出或账户读取权限。预期：建立客户、账户、KPI、隐私与护栏档案。
3. 只读审计：`/ads audit [all|platform|scope]`；平台快捷方式 `/ads google`、`/ads meta`、`/ads amazon`、`/ads reddit`。预期：带日期证据和显式置信度，不触碰账户。
4. 报告：`/ads report`、`/ads next`、`/ads status`。规范结果是版本化 JSON run bundle，Markdown/HTML/PDF 只是渲染。
5. 要改动时只出草案：`/ads launch --draft`、`/ads optimize --draft`。
6. 真正落地逐条满足六项：精确操作有已测试并启用的 capability；明确账户和对象 ID；人类可读 before/after diff 含 blast radius；在账户定义上限内由 owner 审批；幂等键、审计目的地、回滚、验证窗口；验证远端状态仍匹配变更前置条件。缺 ceilings 即禁止写入；v2 不支持永久删除。
7. 评分判读：控件结果只有 pass、fail、unknown、not_applicable。health、evidence coverage、regulatory exposure、opportunities 独立。unknown 只降低证据覆盖率。覆盖率 ≥80% 可评级，60–79% 暂定，低于 60% 证据不足。optional、beta、premium、unavailable、ineligible 不计分。平台 profile 禁用或未批准不产出健康分。某平台失败会被排除出组合评分，并使 run 变为 partial。
8. 可选自建或验证实现：
```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install --no-deps -e .
.venv/bin/python -m pip install --require-hashes --only-binary=:all: -r requirements.lock
.venv/bin/python -m pip install --require-hashes --only-binary=:all: -r requirements-dev.lock
.venv/bin/python -m pip install --require-hashes --only-binary=:all: -r .github/requirements-schema-tests.lock
.venv/bin/python -m pip check
.venv/bin/python -m pytest -q
```
```bash
python -m claude_ads_core --version
python -m claude_ads_core validate finding path/to/finding.json
bash -n install.sh uninstall.sh
```
9. 卸载：`bash uninstall.sh --target=claude`；PowerShell 对应 `uninstall.ps1`。只删 manifest 拥有的文件。

### 做法 B：Cloudflare OS Gatekeeper——按任务引入资源 + 有副作用动作延后批量审批

10. 本地跑：`pnpm run-local`，访问 http://localhost:8787。数据在 `.wrangler`，不用于生产。
11. 用官方提示词验证能力边界：
```text
Make slides for my upcoming meeting with a customer.
```
```text
Make a collaborative whiteboard app.
```
```text
Make a tic tac toe game.
I'll be X and you be O. I've made my first move. Your turn.
```
```text
Make an issue dashboard for this GitHub repo.
```
```text
Fix the typos in this Google Doc.
```
12. 按任务引入具体资源，不预先挂上所有服务。每个 agent 和 Gadget 默认零权限，按当次任务把具体资源介绍给它（粘贴链接或 add resource）；agent 可主动请求，由你批或拒。Gatekeeper 包装原生 API、处理 OAuth、限定到用户指定资源、记录全部动作、对有副作用动作提供人工批准。
13. 有副作用动作先模拟、后批量批准。agent 触发需批准动作时，Gatekeeper 本地模拟结果，告诉 agent 已完成，读回也给模拟结果，agent 可继续排队；你回来一次性批量批准或逐条批准。原文认为优于卡在第一步等人点确认，或开 `--dangerously-skip-permissions`。
14. 接入外部服务前读对应 gatekeeper 包配置说明，自行申请 OAuth client 凭据。路径：
```text
packages/gatekeeper-github/README.md
packages/gatekeeper-google/README.md
packages/gatekeeper-cloudflare/README.md
packages/gatekeeper-supabase/README.md
packages/gatekeeper-notion/README.md
packages/gatekeeper-confluence/README.md
packages/gatekeeper-email/README.md
packages/gatekeeper-homeassistant/README.md
packages/gatekeeper-slack/README.md
packages/gatekeeper-spotify/README.md
packages/gatekeeper-zoominfo/README.md
```
15. 可选开发与部署：`pnpm dev-server`、`pnpm dev-client`，访问 http://localhost:3000。部署到自己的 Cloudflare 账号走 https://os.cloudflare.app/deploy；带自己的 gatekeeper 或改代码用 https://github.com/cloudflare/cloudflare-os-starter。自建服务器部署标注 COMING SOON。

### 做法 C：本地代码仓库（ai-meeting-room）——双 AI 只读规划 + 工作卡核准 + 沙箱执行 + 核准前 git 还原点

16. 安装启动：前提 macOS、Node.js 20+、Git、已登录 `claude` 与 `codex`。下载压缩档解压；Finder 双击 `start.command`；首次设定精灵问项目文件夹、手机入口、登录密码；浏览器打开 `http://127.0.0.1:4477`；终端可用 `npm start`。检查环境检查显示 `claude` 和 `codex` 版本号。
17. 跑会议：用白话写想做什么，按开始会议；等 Claude 只读规划、方案、风险；等 Codex 回报可行性、要改哪些文件、操作清单；左栏选方案；右栏逐张核准或拒绝；低风险=只新增文件或改样式，中风险=动现有功能，高风险=删档、装套件、部署；两张以上时有“核准全部低风险”和“核准全部”，按一下变“确定？再按一次”；每张先存还原点，一张失败就停，后面留待处理；全部做完 Claude 再审查；按结束并产出决议，存成 `meetings/` 里的 markdown。会议中可插话，送出前选给 Claude、给 Codex 或只记录。
18. 权限与还原：讨论中和待核准时 Claude 只能读，Codex 只能读（`--sandbox read-only`）；你按核准后 Claude 仍只能读，Codex 可写（`--sandbox workspace-write`）。每次核准前自动存 git 还原点，右下角“回到执行前”一键回复；Codex 越界写未列出文件会停下并还原；项目夹没有 git 时第一次执行自动建立版本控制。不要设路由器转发或公开反向代理，不要把监听位址改成 `0.0.0.0`；手机入口只接受 Tailscale 网段 100.64.0.0/10。登录密码存本机 `.secrets/passcode.txt`。附件或交件档若是 HTML、SVG 等会执行程序的档案，一律改成下载。
19. 模型自动跟进与费用护栏：启动时、每次 AI 开工前（最多每 5 分钟）比对 `claude` 和 `codex` 版本；版本变了或 Codex 模型清单超过一小时就重新侦测；闲置时每 30 分钟看一次。CLI 新列出的模型标成“待你开放”，按“开放”才用；不想用了可“收回”。选定模型若本次未提供，暂时改用最接近且不比原本高阶的模型，设定区与会议纪录写明；原模型恢复后自动换回。若剩下模型都比原本高阶，会停下来请你选。Codex 执行时若回报模型不能用，立刻重新侦测；唯读讨论自动换模型重试一次，会改档的工单不自动重跑，提示按“重试”。
20. 通知、远程与交件：三个时刻响一声（AI 跑完一轮、有新决定、素材做好）；右下角提示音可关。Telegram 推播需要 `.secrets/telegram-token.txt` 和 `.secrets/telegram-chat-id.txt`，存好后重启服务器，页尾可测试通知。需要图片素材时右栏出现“等你交件”卡片，写清尺寸、格式、数量、档名和存放路径；单档上限 25MB，同名档不覆盖；自己放好后按“我自己放好了”，确认档案存在才让 Codex 接手。
21. 白话解释降级链：每则讯息下“用白话解释”，顺序 Ollama（本机免费）→ Gemini → Claude，前面连不上、逾时或没回东西自动往后退，最后一行写是谁翻的。跳过 Ollama 把 `config.json` 的 `explainBy` 改成 `gemini`；全给 Claude 改成 `claude`。Ollama 的 `config.json` 的 `ollama.url` 填位址，例如 `http://100.x.x.x:11434`；`model` 留空用第一个模型；装在另一台电脑时把那台 `OLLAMA_HOST` 设成它自己的 Tailscale IP，不要设 `0.0.0.0`。Gemini 到 Google AI Studio 建金钥，存成 `.secrets/gemini-api-key.txt`。
22. 出问题：连线中断重新双击 `start.command`；被送回登录页重新输密码；错误次数过多等登录页显示的时间；手机网址打不开看启动视窗原因，确认 Tailscale 已连线；Claude 或 Codex 没回应按环境检查，通常登录过期，在终端执行 `claude` 或 `codex` 重新登录；还原点建不起来说 .git 被锁住，在项目资料夹执行
```text
rm -f .git/*.lock .git/objects/maintenance.lock
```
再按核准；回覆格式跑掉会显示原始回覆；CLI 改版导致参数失效改 `config.json` 里的 `args`。
23. 可选改程序或自建：改画面 `public/index.html` 重新整理；改 `server/` 或 `config.json` 按左下角重新启动；`npm run dev` 会在程式变动时自动重启，但执行核准工作时不要用。测试 `node --test test/*.test.js`。可用模型由 `codex debug models` 和 `claude --help` 即时侦测；工单模型上限依 Astra > Sol > Terra > Luna，同家族比版本，不认得的新家族一律当最高档。打包 Mac 版：
```text
node scripts/build-release.mjs --platform mac --out dist/ai-meeting-room-mac.zip
```

### 做法 D：Strands Box——用默认拒绝策略把执行、读写、网络能力放开（Preview，先做可行性验证）

24. 确认前提：Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、能访问 `us-west-2` Bedrock Claude Opus 5。不满足就退回借鉴设计：默认拒绝、凭证注入、决策记录。
25. 下载并验证：
```sh
curl -fsSL https://raw.githubusercontent.com/strands-agents/box/main/download.sh | sh
./box-core/box --version
```
脚本校验 release checksum，解包到 `./box-core`，不改 `PATH`，不动系统目录。二进制都放同一 `./box-core`。
26. 替代：源码构建：
```sh
git clone https://github.com/strands-agents/box.git
cd box
cargo build --release -p strands-box -p strands-box-containment
```
产物按 `./target/release/strands-box` 运行，helper 二进制同目录。常用任务：
```sh
just build
just test
just check
just test-all
```
完整测试 `cargo test --workspace --all-features`。
27. 按 `docs/user/getting-started.md` 写最小 `box.toml` 和 `policy.dw`，启动 box。注意本次材料未给这两个文件字段或示例。
28. 分清分工：`box.toml` 改 agent 运行环境和直接访问授权；`policy.dw` 改 Box 经解释器和网关检查的操作规则。先读 `docs/user/getting-started.md`、`security.md`、`policy.md`。
29. 写策略时把策略编写 skill 交给编码 agent：
```text
https://raw.githubusercontent.com/strands-agents/box/main/.agents/skills/authoring-box-policy/SKILL.md
```
30. 记住边界：`box.toml` 直接文件系统授权由 OS 强制执行，不产生单条 Dogwood 决策；要让策略管到文件操作，必须走解释器，并把这些文件排除在直接授权之外。
31. 跑示例：`examples/strands-box/strands-sdk-agent/` 是一个小 agent，三个工具都走 Shell；`examples/README.md` 是示例索引。预期能跑通。
32. 需要 agent 调外部 API 时，凭证配在网关上（API 凭证或 AWS SigV4 签名），不要给 agent 本体。原文是设计声明，需自行验证。
33. 需要审计读决策记录：默认 `<box_dir>/private/telemetry/records.jsonl`，OTLP JSON。把记录条数与 agent 实际调用对照，看是否漏记。
34. 可复现验证：复现 README 时序场景——一次经 Shell 或 Python 的文件读之后，网关随后拒绝一个出站 HTTP 请求。行为一致才按“可照做”写进标准流程。

### 做法 E：跨机器执行（cc-desk-tunnel）——云端 Claude Code + Windows 本机，靠端口最小放行与凭据管理夹住边界

35. 确认前提：一台有公网 IP 或域名的 Linux 服务器（x86_64，推荐 Ubuntu，已装 Docker）+ Windows 10/11 x64；服务器必须自己控制、可信，不要部署在共用或来路不明机器。不满足退回做法 C 或 D。
36. 部署服务端（在 Linux 服务器上执行）：
```sh
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/sun168567/cc-desk-tunnel/main/deploy/install.sh)"
```
脚本检查依赖（缺少只告诉你装什么，不代装系统软件）；从发布页下载最新服务端程序包并校验，解压到 `/opt/cc-desk-tunnel`；询问公网地址、证书方式、端口、数据目录（有默认值），构建镜像并启动；打印服务地址、证书指纹、服务凭据，以及需放行的两个 TCP 端口（默认 8787 和 7000）。不提供现成镜像，首次从源码构建需几分钟；不改防火墙、nginx、SSH 配置；再次运行同命令可升级。
37. 安装 Windows 客户端并填三项信息：下载 `CC-Desk-Tunnel-Setup-<版本>-x64.exe` 安装。自带 PowerShell 7、OpenSSH、frpc。启动后填服务地址、证书指纹、服务凭据并连接。首次 SmartScreen 点“更多信息 → 仍要运行”；frpc 可能被杀毒软件拦截。
38. 登录 Claude 并接入项目：客户端左下角账号页登录 Claude 账号（官方 `claude auth` 流程，登录凭据只保存在服务器上）；添加项目文件夹，开始对话。不想用订阅登录可改用 API key，在数据目录 `config/provider.json` 配置。
39. 按权限边界配置端口：
| 端口 | 用途 | 是否需要放行 | 保护方式 |
| --- | --- | --- | --- |
| 控制端口（默认 8787/TCP） | 客户端登录与对话 | 需要（nginx 模式改放行 443，8787 只监听本机） | TLS + 服务凭据 + 登录限速 |
| 隧道端口（默认 7000/TCP） | 建立反向隧道 | 需要 | TLS + 每次连接随机令牌；只在有客户端连接时监听 |
| 通往 Windows 的 SSH 映射端口（随机） | Claude 在本机执行命令 | 不需要，也无法放行 | 只监听容器内部回环地址，未发布到服务器；只接受本次连接临时公钥 |
Windows 一侧不放行任何入站端口；本机 SSH 只监听回环，随连接启停。想收紧在云厂商安全组只允许自己的出口 IP 访问 8787 和 7000。Docker 发布端口通常不受 `ufw` 限制。即使服务器防火墙全放行，SSH 映射端口仍无法从外部访问，但全部放行会暴露其他服务。
40. 必须知道的四件事：服务凭据等同于完全控制权，拿到它的人可使用你的 Claude 账号并在你电脑上执行任意命令；用脚本自动生成的随机凭据，不要改短口令、不要截图或贴聊天/issue，泄漏后在服务器执行 `manage.sh token` 更换。不是沙箱：Claude 能访问你的 Windows 用户能访问的一切，不只项目目录；项目边界只靠提示词引导 + Claude Code 自身审批。数据会离开本机：文件片段和命令输出经服务器发往模型服务；服务器保存会话记录和 Claude 登录凭据，备份文件同样含密。指纹从可信渠道取得：自签证书指纹应来自你自己登录服务器看到的安装汇总。
41. 处理杀毒软件与 SmartScreen：frpc 可能被报毒，Windows Defender 和不少杀毒软件会把 frp 标成黑客工具并隔离，部分云厂商主机安全组件也会对 `frps` 告警。不要仅凭“它是 frp”就当误报放行：先确认安装包来自本仓库发布页、对照 `SHA256SUMS` 校验、查看具体被拦截文件，确认来源后只对已核验组件文件设必要例外，不建议关杀毒软件或排除整个磁盘。连接提示“组件启动失败”先检查保护记录。安装包没有代码签名。
42. 可选定时任务：客户端自带，到点向指定会话或新会话发送预设提示词，也可让 Claude 帮你设置。README 未给具体提示词模板或配置字段，需在客户端实际操作确认。这是时间触发，没有展开事件/状态触发。
43. 可选源码构建与本地开发：需要 Git、Node.js 24 与 npm；Windows 上用 PowerShell 7。
```powershell
npm ci
npm run dev
npm test
npm run package:windows
npm run package:server
```
仓库结构：`apps/desktop/`、`apps/server/`、`packages/protocol/`、`deploy/`、`scripts/`、`docs/`。
44. 只用一个非关键项目做最小试用并收尾：云厂商安全组只允许你的出口 IP 访问 8787 和 7000；服务器跑一次安装脚本，把三项记进密码管理器；Windows 装客户端连接，登录 Claude（或先配 `config/provider.json` 用 API key），只添加一个不重要测试项目目录；让 Claude 读取一个本机文件并汇报，再在本机执行一条无害命令（查看目录、跑一次项目单元测试）；试完断开，确认本机没有常驻服务、SSH 监听已停止。

### 做法 F：MXC——沙箱化代码执行 + Windows 11 三模式为 agent 收敛权限

**F1 用 SDK 把模型生成代码放进沙箱执行**

45. 按语言安装 SDK（不需要 clone 仓库，按语言用包管理器）：
- Node（Linux/macOS 最小试用推荐）：`@microsoft/mxc-sdk`（npm，包内含原生运行时资产）。
- Rust：`https://crates.io/crates/mxc-sdk`（该 crate 会把 MXC SDK、引擎和所选后端一并编译进调用方应用）。
- .NET：`https://www.nuget.org/packages/Microsoft.Mxc.Sdk`（包内含原生运行时资产）。
46. 在应用里发起一次受控执行（原样摘自 README 的 Node 片段）：
```typescript
import { spawn, type ContainerRequest } from '@microsoft/mxc-sdk/v1';

const request: ContainerRequest = {
  command: 'node -e "console.log(\'hello from container\')"',
  network: { egress: { default: 'deny' } },
  timeoutMs: 30_000,
};

const child = await spawn(request);
```
请求至少要给 `command`；`network`、`timeoutMs` 是示例字段。更完整样例见 `samples/run-with-io-stdio-streaming/`，API 参考见 `docs/api-reference/`。预期：模型生成代码在沙箱容器执行，stdout 可回收，出站默认 deny，超时 30 秒。
47. 对照运行平台选后端：
| Runtime platform | Default backend | Other backends | Minimum host OS |
|---|---|---|---|
| Windows 11 x64 / ARM64 | `processcontainer` | `windows_sandbox`*、`wslc`、`microvm`*、`hyperlight`*、`isolation_session` | Windows OS-version support |
| Linux x64 / ARM64 | `bubblewrap` | `lxc`、`microvm`、`hyperlight` | - |
| macOS ARM64 / x64 | `seatbelt` | - | - |
带 * 为 experimental。各后端前置与行为见 `docs/backends/`。
48. 跑三组用例验证隔离：在 Linux 或 macOS 用 Node SDK，安装 `@microsoft/mxc-sdk`，照第 46 步写脚本；跑 (a) 只读写允许目录——应成功并回收 stdout；(b) 尝试写被拒路径——应失败；(c) 尝试出网——应失败。对 (b)(c) 用 `wxc-exec.exe --debug config.json` 打开诊断，确认是策略拒绝而非环境没搭好；要补权限走 `docs/logging-access-denied.md` 的 deny-and-record，不要用 `--audit`。
49. 替代：用平台专用 executor 二进制测试。如 `wxc-exec.exe` 接受 `schemas/stable/` 定义的稳定 schema 的 JSON 容器创建请求，用于测试，或 SDK 无法嵌入应用时。
50. 仅在开发 MXC 时源码构建。前提：修改原生运行时，或用独立 executor 二进制。构建前置：Rust 1.93、Node.js 24+ 与 npm、所选后端平台工具链。
```bash
build.bat --all
```
```bash
./build.sh --all
```
```bash
./build-mac.sh --all
```
51. 需要持久隔离环境时用状态感知生命周期：provision → start → execute → stop → deprovision（概述见 `docs/container-lifecycle.md`），SDK 提供一次性与状态感知两类 API。
52. 遥测默认关闭：需同时满足运行级 opt-in、Windows 用户明示同意、管理策略允许、应用在容器请求中启用遥测选项；管理员只能阻止、不能代用户同意；非 Windows 平台为 no-op，本地开源构建不向 Microsoft 发送。

**F2 在 Windows 11 上用三模式为 agent 收敛权限边界（新调研补充）**

前提：Windows 11。会话容器、WSL 容器仅 Windows 11；进程容器同时支持 Windows 11 / macOS / Linux。原文没有给出任何 JSON 字段名、命令行或 SDK 调用示例，只说可以从 MXC 仓库获取 SDK、configuration schema、文档和 samples。以下步骤是流程与决策框架，具体语法以 SDK 文档为准。

53. 先列出任务真正需要的资源，按五个策略域逐项声明（原文填空清单，字段名以 SDK schema 为准）：
```text
Containment      -> 用哪种隔离环境（process / session / WSL / microVM）
Process          -> 启动工作负载的命令、参数、工作目录、环境变量等
File system      -> 可修改的位置 / 可读不可改的位置 / 完全不可访问的位置
Network          -> 入站与出站连通性，以及能否通过宿主机 loopback 访问服务
User interface   -> 能否访问或操作桌面及相关 UI 资源
```
原文示例：给编码 agent 本地源码仓库读写权 + Git 等必要开发工具；禁止访问用户 Documents 等个人位置；阻断入站与出站网络连接；禁止访问交互桌面。
54. 按负载选容器后端：
| 后端 | 可用平台 | 适合 | 关键特性 |
|---|---|---|---|
| Process container | Windows 11 / macOS / Linux | 需要低延迟响应的负载，含模型生成代码与工具执行 | Windows 用 AppContainer、macOS 用 Seatbelt、Linux 用 Bubblewrap |
| Session container | 仅 Windows 11 | 长期运行的 agent 与自动化，需要桌面或更强隔离 | 独立 Windows 账号与会话，隔离桌面、剪贴板、UI、输入与活动会话 |
| WSL container (WSLc) | 仅 Windows 11 | 依赖 Linux 包与开发生态的 Linux-first 工具链 | 通过 WSL 提供 Linux 执行环境 |
| MicroVM | Windows 11 与 Linux，实验性 | 需要硬件级虚拟化边界的高风险负载 | 硬件强制隔离 + 完整 Linux 负载兼容性 |
每个后端安全属性不同，应逐负载评估适配度。原文建议先只试进程容器，最轻、跨平台、最容易回滚。
55. 用低约束模式起草策略，不要一上来就 Enforcement。首次放进 MXC，策略很可能挡掉合法需要的能力，这些拒绝指出边界该往哪调。
56. 三模式推进：
| 模式 | 未授权访问 | 活动报告 | 用途 |
|---|---|---|---|
| Enforcement | 阻断 | 无 | 按生产策略运行负载 |
| Learning | 阻断并记录 | 有（JSON） | 诊断失败，验证策略只授予必需访问 |
| Permissive | 放行并记录 | 有（JSON） | 不强制策略观测 agent 行为 |
Learning 下边界仍生效，未授予操作被阻断并写入 JSON 活动报告，可复现越界失败、搞清负载尝试访问哪些资源。Permissive 下策略本会拒绝的访问被记录但仍放行，适合授权阶段，任务能跑完并攒下资源使用证据。Permissive 不绕开其他操作系统或组织限制。
57. 用活动报告收敛成最小权限策略：每次被拒操作暴露一个待调整点，只补真正需要的权限。仅 Windows 的 MXC 进程容器能生成该活动报告。
58. 让负载优雅处理越界：把工作负载设计成能在比默认更严格的边界下运行。如果组织策略挡住某资源，agent 应说明任务无法在现有权限内完成、请求用户或管理员操作、或选择安全替代方案，不应静默失败。
59. 接入方式：用你常用的编码 agent 去集成 MXC SDK 并起草初版策略，然后 review、测试、迭代控制项。组织侧可叠加管理策略（Intune 策略即将可用于管理 Windows 11 上 MXC 集成 agent 的进程容器，控制 Windows 如何评估 agent 发出的容器创建请求以及容器强制的资源边界），同一个 agent 能在不同企业边界内运行，不用把组织安全姿态写进应用里。
60. 最小试用（Windows 11）：从 MXC 仓库拉 SDK 与样例，确认本机版本与后端可用性，先只试进程容器；选一个无害任务，例如让编码 agent 在本地仓库改一个 README 并跑一次测试；第一轮用 Permissive 跑同一任务，拿 JSON 活动报告，看清实际碰了哪些文件、哪些网络目标；按报告写最小权限策略（仓库读写、必要工具/命令，其余不授予），切 Learning 复跑；处理每次拒绝，确认确实需要还是可换安全做法，只补前者，重复到拒绝清单收敛；切 Enforcement 跑同一任务，作为生产态基线；再故意让 agent 触碰明确不该碰的资源（用户文档目录或外部网络地址），确认被拦下且 agent 显式报告失败，而不是静默失败。

**怎么选（做法 A / B / C / D / E / F1 / F2）：**

- 账户写操作、不可逆或 blast radius 大：做法 A 第 6 步，逐条同步确认。六项门控是硬约束，缺 ceilings 即禁止写入，v2 不支持永久删除。
- 可模拟、可回滚、需要连续推进：做法 B 第 13 步，先本地模拟让 agent 排队推进，人离线，回来批量批准。
- 本地代码仓库改动：做法 C。Claude 全程只读规划与复审，Codex 只在核准后 `workspace-write` 执行工作卡明列文件；核准前存 git 还原点，越界就还原。只支持 macOS、界面繁体中文、当前只有 Claude+Codex。
- 想验证默认拒绝 + 语义策略 + 凭证注入 + 决策记录，且有 Apple silicon Mac：做法 D，只当可行性验证，不当生产标准。
- 会话必须在云上、项目与工具链必须在 Windows 本机：做法 E。它改变执行位置边界，会话在云服务器、命令落到本机 Windows，复用官方 Claude Code 审批与上下文管理；但不是沙箱，只有隧道 + 端口最小放行 + 凭据管理，服务凭据等同于完全控制权，只宜单用户自用。
- 要把模型生成代码放进沙箱执行并回收结果，平台 Linux/macOS（或 Windows），愿意按平台挑后端、调策略：做法 F1，先做最小试用验证越权用例被拦。它比 D 更偏“嵌入应用”的 SDK 形态，跨平台且后端可选；但原文未给完整策略 JSON 示例与接入 agent 主循环的做法。
- 在 Windows 11 上要让自主编码/操作 agent 先观测再收紧权限边界：做法 F2，用 Permissive→Learning→Enforcement 三模式，先只试进程容器，用 JSON 活动报告收敛最小权限。原文没有配置示例，具体 schema 要回 SDK 仓库补全。
- 拿不到 Apple silicon 机器或 Bedrock 模型访问：不要强行套用做法 D，退回借鉴默认拒绝、凭证注入、决策记录三件事。
- 只读审计与报告：做法 A 第 2–4 步；想验证权限链路，再用 B 第 10–13 步，或 C 第 16–18 步，或 D 第 24–31 步，或 E 第 35–44 步，或 F1 第 45–48 步 / F2 第 53–60 步。

## 怎么判断变好了

六份材料都没有给准确率、节省工时、误报/漏报率这类结果数据，所以只能看过程信号：
- claude-ads：audit run 的 findings 是否带日期证据和显式置信度；报告是否为版本化 JSON run bundle；证据覆盖率是否 ≥80%（可评级），60–79% 暂定，低于 60% 证据不足；`/ads status` / `/ads next` 是否稳定给出状态和最高优先级阻塞项；写操作是否一直停在草案直到六项门控齐备；发布侧四条硬规则是否守住。
- Cloudflare OS：从下提示词到可用产出需要中途介入几次；审批能否真的延后批量完成；Gatekeeper 日志能否复盘 agent 对外的每个动作以及限定在哪个具体资源；同一任务换通用编码 agent 对比 token 消耗、失败次数与返工量（原文声称更快更好更省 token，是作者主张）。
- ai-meeting-room：会议结束是否产出 `meetings/` 里的 markdown 决议；每次核准前是否成功存 git 还原点，夹标旁绿色 `GIT` 是否表示还原点可正常运作，按“回到执行前”能否一键回复；Codex 是否只写工作卡明列文件，越界时是否停下并还原；风险分级是否合理；模型被替换时设定区与会议纪录是否写明，原模型恢复后是否自动换回；唯读讨论失败是否自动换模型重试一次，会改档工单是否不自动重跑、提示按“重试”；`node --test test/*.test.js` 是否通过，环境检查是否显示 `claude` 和 `codex` 版本号。
- Strands Box：拒绝有效性——让 agent 访问未授权路径或发未 permit 的请求，确认被实际拒绝，不是靠提示词约束；记录完整性——`<box_dir>/private/telemetry/records.jsonl` 对每次受检查操作都有 OTLP JSON 记录，把记录条数与实际调用对照，看是否漏记，尤其确认直接授权的文件操作确实不出现在 Dogwood 决策里；凭证不外泄——agent 侧拿不到底层 secret，同时经网关签名的请求仍成功；时序规则生效——复现 README 场景；挑一件原本因风险不做、需人工逐步审批的 agent 任务交给 Box，比较是否能无人值守完成，出问题能否从决策记录定位到被哪条规则拒绝。任一条无法复现，就不宜按“可照做”写入手册，只保留设计思路。
- cc-desk-tunnel：Claude 能否在客户端成功读写指定路径的本机文件并在本机执行命令看到输出；编译、测试等命令是否确实在 Windows 本机跑；Windows 一侧是否没有放行任何入站端口，本机 SSH 是否只监听回环、随连接启停，试完断开后本机没有常驻服务；服务凭据是否只存在密码管理器里，没有被截图或贴聊天/issue，需要更换时能在服务器执行 `manage.sh token`；证书指纹是否来自你自己登录服务器看到的安装汇总；是否清楚会话记录和 Claude 登录凭据留在服务器上、备份同样含密，并确认服务器所在地在 Anthropic 支持的国家和地区。用量侧只能看客户端额度、重置时间和调用统计。
- MXC F1：隔离有效性——越权用例（写系统路径、联网、读敏感文件）被拦比例，目标 100%；同时记录合法用例被误拦比例与策略返工次数。可用性——合法工作负载首次运行成功率、修策略后成功率、单次执行延迟与资源占用。集成效果——接进“生成代码 → 隔离执行 → 回结果”循环后，任务端到端成功率、超时/拒绝后的重试次数、人工介入次数。原文没有业务结果指标。
- MXC F2：Enforced 策略下同一任务成功率与耗时相比不加容器时没有明显退化；活动报告中出现的资源集合 ⊆ 策略声明的集合；Learning→Enforcement 后不再出现“策略本会拒绝”的条目；越界尝试 100% 被阻断，且 agent 显式说明权限不足；策略文本可复核，每条授予都能对应任务的一个具体需要，没有图省事全放开；企业场景下同一条 agent 在更严格组织策略下仍能运行或优雅失败。

**最小试用方式：**
- claude-ads：只挑一个广告平台，`/ads setup` → `/ads audit` → `/ads report` → `/ads next`，全程只读不触碰账户。
- Cloudflare OS：装 pnpm → `pnpm run-local` → 打开 http://localhost:8787 → 跑“做 slides”和“建协作白板应用” → 再配置一个真实资源（GitHub repo 或 Google Doc 选一个），走完引入资源 → agent 请求权限 → 审批队列 → 批量批准。
- ai-meeting-room：在一个无关紧要的小仓库，下载解压 → 双击 `start.command` → 完成设定精灵 → 打开 `http://127.0.0.1:4477` → 用白话提一个小改动 → 等 Claude 规划、Codex 列卡 → 逐张核准（先存还原点）→ 看 Codex 是否只写列出文件 → 按“回到执行前”验证回滚 → 结束并产出决议。
- Strands Box：满足前提的 Apple silicon Mac 上执行下载与 `--version`；按 `docs/user/getting-started.md` 写最小 `box.toml` 和 `policy.dw`，启动 box，跑 `examples/strands-box/strands-sdk-agent/`；只做一件事：把示例 agent 的一次操作从直接授权改成经解释器 + 策略检查，体会边界差别。
- cc-desk-tunnel：限定两台机器、一个非关键项目——云厂商安全组只允许自己的出口 IP 访问 8787 和 7000，服务器跑一次安装脚本（凭据只进密码管理器），Windows 装客户端填三项信息连接，登录 Claude，只添加一个不重要测试项目目录，让 Claude 读取一个本机文件并汇报，再在本机执行一条无害命令，试完断开并确认本机无常驻服务、SSH 监听已停止。
- MXC F1：Linux 或 macOS + Node SDK，安装 `@microsoft/mxc-sdk`，照第 46 步写脚本，跑三组用例（允许目录读写、被拒路径写入、出网），用 `wxc-exec.exe --debug config.json` 诊断失败原因。
- MXC F2：一台 Windows 11；从 MXC 仓库拉 SDK 与样例，先只试进程容器；选无害任务（改 README 并跑测试）；Permissive 跑同一任务拿 JSON 活动报告；写最小权限策略；Learning 复跑并处理拒绝；Enforcement 跑作为基线；再故意触碰不该碰的资源确认被拦且显式报告失败。

**试多久：** claude-ads 材料在“怎么试”被截断，没有建议时长；Cloudflare OS 原文建议最小试用控制在半天内；ai-meeting-room 原文没有建议时长，建议至少跑通一轮完整会议并故意制造一次越界或失败看还原与重试；Strands Box、cc-desk-tunnel、MXC 原文都没有建议时长，先做一次可行性验证，不要直接进生产。合起来的建议：单平台只读一轮，加半天本地权限链路验证，再决定要不要扩到更多平台、更多服务或跨机器执行。

## 常见坑

- 把远程安装脚本直接管道进 shell。改用宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档。
- 旧 marketplace 别名没清。v2.0.0 前加过的话，`agricidaniel-claude-ads` 是陈旧的，必须先 remove 再 add。
- 以为出了 diff 就能改账户。缺 ceilings 等于禁止写入；六条门控缺一不可；v2 不支持永久删除。
- 预先挂上一堆 MCP server、让所有服务在整个会话里都“在场”。改成默认零权限、按当次任务引入单个资源。
- 把所有有副作用的动作都卡在第一步同步等确认。原文认为不如先模拟、后批量批准，但前提是你能接受 agent 在模拟结果上继续推进。
- 用 `--dangerously-skip-permissions` 自动放行。原文把它列为异步审批要替代的坏做法。
- 把 unknown 当扣分项。unknown 只降低证据覆盖率，不改变已确定的健康度。
- 覆盖率不够就下结论。低于 60% 是证据不足，60–79% 只是暂定。
- 把 partial run 当完整审计。某平台失败会被排除出组合评分并使 run 变为 partial。
- 凭证乱放。必须放环境变量、OS keychain 或经批准 secret manager，不得进入仓库、profile、报告或日志。接入外部服务时 OAuth client 凭据要自备。
- 把仓库自述当成已验证结果。
- 指望监控自动触发。`/ads monitor` 没有给出定时器、事件或状态触发机制；Cloudflare OS 没有时间/事件/状态触发持续执行任务的机制，唯一相关是审批异步化；cc-desk-tunnel 的定时任务是时间触发，未给事件/状态触发机制。
- 以为 Cursor / goose 有现成适配。原文只列为 watch 级。
- 以为 12 个平台适配质量一致。材料无法判断是实测通过还是仅有 fixture。
- 解释器不对。托管依赖只支持 CPython 3.11/3.12 且限于声明的 wheel 矩阵。
- 把 `pnpm run-local` 当生产环境。数据在 `.wrangler`。
- 现在就把整套 Cloudflare OS 当生产平台上线。early access、自建服务器部署 COMING SOON、无 SLA。可直接拿走的是第 12、13 步的权限与审批模式。
- 想改造 Cloudflare OS 上游。仓库不接受外部大改动贡献，超过十几行的 PR 会被关闭。
- 把 `0.0.0.0` 当方便。ai-meeting-room 不要设路由器转发或公开反向代理，不要把监听位址改成 `0.0.0.0`；手机入口只接受 Tailscale 网段 100.64.0.0/10。
- 只关分页就以为登出了。登录八小时后、按登出、或服务器重启后都要重新登录。
- 在会议室里直接打开 HTML、SVG 这类会执行程序的附件或交件档。一律改成下载。
- 用 `npm run dev` 跑核准工作。监视器会把 Codex 执行到一半的工作砍掉。
- 以为 Claude 或 Codex 会产图。需要图片素材时右栏出现“等你交件”卡片，单档上限 25MB，同名档不覆盖。
- 把新模型自动升级。CLI 新列出的模型会标成“待你开放”，按“开放”才用；选定模型若本次未提供，会暂时改用最接近且不比原本高阶的模型，原模型恢复后自动换回；若剩下模型都比原本高阶，会停下来请你选。
- 把唯读失败和写工单失败一视同仁。唯读讨论自动换模型重试一次；会改档的工单不自动重跑，提示按“重试”。
- 把会议室的 git 锁当死局。执行 `rm -f .git/*.lock .git/objects/maintenance.lock` 再按核准。
- 以为 ai-meeting-room 有量化效果数据。原文没有 benchmark、用户案例或量化结果。
- 把 Strands Box 当生产标准。README 标注 Preview，只支持 macOS Apple silicon 本地执行。
- 非 Apple silicon 或不满足前提还硬套。前置是 Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、`us-west-2` Bedrock Claude Opus 5。
- 以为直接文件系统授权会产生 Dogwood 决策。`box.toml` 直接文件系统授权由 OS 执行，不产生单条 Dogwood 决策；要让策略管到文件操作，必须走解释器，并把这些文件排除在直接授权之外。
- 以为原文给了 `box.toml` / `policy.dw` 字段或示例。没有；全在外链 `docs/`。
- 把默认拒绝、permit 覆盖、forbid 优先、文件读影响后续 HTTP 放行当已验证。原文只有文字描述，没有附测试、日志或案例数据。
- 以为凭证注入已验证 agent 拿不到 secret。这是设计声明，没有验证方式。
- 忘了把 helper 二进制放在同一目录。下载路线是 `./box-core`；源码构建路线是 `./target/release/strands-box` 与 helper 同目录。
- 把 cc-desk-tunnel 的服务凭据当普通密码。服务凭据等同于完全控制权；用脚本自动生成的随机凭据，不要改短口令、不要截图或贴聊天/issue；泄漏后在服务器执行 `manage.sh token` 更换。
- 以为 cc-desk-tunnel 是沙箱。Claude 能访问你的 Windows 用户能访问的一切，不只项目目录；项目边界只靠提示词引导 + Claude Code 自身审批。
- 在共用或来路不明服务器部署 cc-desk-tunnel。服务器被攻陷等于你的电脑被攻陷；连接期间服务器能以你的 Windows 用户身份执行任意命令。
- 以为 Docker 发布端口会受 `ufw` 规则限制。来源限制请在云厂商安全组做，只允许自己的出口 IP 访问 8787 和 7000。
- 以为“通往 Windows 的 SSH 映射端口”需要放行。它只监听容器内部回环地址、未发布到服务器，不对外暴露，也不需要也无法放行；但服务器防火墙全部放行会把其他服务一起暴露。
- 只凭“它是 frp”就当误报放行。先确认安装包来自本仓库发布页、对照 `SHA256SUMS` 校验、查看具体被拦截文件，确认来源后只对已核验组件文件设必要例外；不建议关杀毒软件或排除整个磁盘。
- 以为 cc-desk-tunnel 服务器需要高配。“2 核 1 GB 入门机型就能运行”是作者陈述，无实测数据。
- 账号合规想当然。服务器所在地即使用地点，需位于 Anthropic 支持的国家和地区；条款限制第三方产品提供 Claude.ai 登录或代为使用订阅额度，拿不准时改用 API key。
- 想把 cc-desk-tunnel 多用户共用。它是单用户自用：一个服务对应一个使用者、同一时间一台在线 Windows 设备，没有多用户、权限分级或租户隔离。
- 以为安装包有代码签名。没有；首次运行会遇到 SmartScreen。
- 证书指纹从别人转发的消息里拿。应来自你自己登录服务器看到的安装汇总。
- 忘记数据会离开本机。文件片段和命令输出经服务器发往模型服务；服务器保存会话记录和 Claude 登录凭据，备份文件同样含密。
- 以为定时任务有文档化提示词模板或配置字段。README 未给，需在客户端实际操作确认。
- 把 `--audit` 用于不可信代码。原文字面警告 `--audit` 会关闭被分析工作负载的全部沙箱安全，绝不能用于不可信代码；补权限走 `docs/logging-access-denied.md` 的 deny-and-record。
- 以为原文给了完整策略 JSON 示例。没有；需按 README 指向的 `docs/backends/`、`docs/api-reference/`、`schemas/stable/` 继续查证。
- 以为原文给了把 MXC 接进 agent 主循环的做法（超时后如何处理、结果回收格式、重试）。没有；需自行查证或实现。
- 把 experimental 后端当稳定生产。`windows_sandbox`、`microvm`、`hyperlight` 标注为 experimental。
- 忘了原生 executor 默认把 stdin/stdout/stderr 留给工作负载。MXC 自身诊断要显式用 `--debug` 打开。
- 源码构建环境不对。Rust 由 `src/rust-toolchain.toml` 固定为 1.93；Node.js 24+ 与 npm；所选后端要求的平台工具链与前置条件。
- 遥测想开就开。需同时满足运行级 opt-in、Windows 用户明示同意、管理策略允许、应用在容器请求中启用遥测选项；管理员只能阻止、不能代用户同意；非 Windows 平台为 no-op。
- 把“跨平台”“后端清单”“遥测默认关闭”当已验证。均为项目自述，无第三方验证数据。
- MXC 新坑：一上来就用 Enforcement。原文建议先用低约束模式起草策略，Permissive 观测、Learning 诊断，再收敛到 Enforcement。
- MXC 新坑：把 Permissive 当绕过组织限制。Permissive 不绕开其他操作系统或组织限制。
- MXC 新坑：以为原文给了配置示例。原文没有一行 JSON 字段名、命令行或 SDK 调用，必须回 SDK 仓库补全。
- MXC 新坑：把会话容器/WSL 容器当成跨平台。它们仅 Windows 11；MicroVM 仅 Windows 11 与 Linux，且实验性。
- MXC 新坑：让 agent 静默失败。应设计成显式说明权限不足、请求用户/管理员操作，或选择安全替代方案。

## 证据与来源

依据材料：AgriciDaniel/claude-ads 仓库 README 首页（v2.0.2）；cloudflare/cloudflare-os 仓库 README（v2，early access）；sojei1989/ai-meeting-room 仓库 README（Apache License 2.0，macOS 本机开源应用）；strands-agents/box 仓库 README（Preview，只支持 macOS Apple silicon 本地执行，63 stars）；sun168567/cc-desk-tunnel 仓库 README（Apache-2.0，约 39 stars，自述主要由 AI 编写、个人维护、没有专业安全审计，与 Anthropic 无隶属或合作关系）；Microsoft MXC 仓库 README（source_note 为“依据仓库 README”，项目一手文档）；本次新增 MXC: Microsoft Execution Containers version 1.0.0 发布帖调研（结论：值得在 Windows 11 上小范围试，把 Permissive→Learning→Enforcement 三模式流程用在自主编码/操作智能体上，先观测再收紧权限边界）。

可以直接照抄的部分：
- claude-ads：插件与脚本安装命令、`install.sh` / `install.ps1` / `uninstall.sh` 用法、完整命令表、12 平台清单、写操作六条门控、评分阈值 80%/60%、release 四条硬规则、开发与校验命令；贡献者表列出带 issue/PR 编号的社区反馈，说明有真实使用与缺陷修复痕迹。
- Cloudflare OS：`pnpm run-local`、http://localhost:8787、五条官方提示词、11 个 gatekeeper 包路径清单、`pnpm dev-server` / `pnpm dev-client` 与 http://localhost:3000、部署入口与部署模板仓库、自建服务器部署标注 COMING SOON、OS 概念映射表。
- ai-meeting-room：安装步骤、沙箱参数 `--sandbox read-only` / `--sandbox workspace-write`、档案路径、风险分级、核准与还原规则、模型发现与费用护栏、白话解释降级链、测试命令 `node --test test/*.test.js`、打包命令。
- Strands Box：下载脚本与 `./box-core/box --version`；Cargo workspace 构建命令、`just` 四个任务、`cargo test --workspace --all-features` 与 `test-support` 的关系；两个配置文件名与分工；策略 skill URL；决策记录默认路径；示例目录路径；架构描述。
- cc-desk-tunnel：服务端部署命令、安装脚本四件事、默认放行端口 8787 与 7000、三行端口对照表、作者“必须知道的四件事”、杀毒软件与 SmartScreen 处理建议含 `SHA256SUMS` 核对、源码构建与本地开发命令、仓库结构、`manage.sh token` 更换凭据、`config/provider.json` 配 API key、证书指纹来源要求。
- MXC：安装包管理器、Node 片段、诊断命令 `wxc-exec.exe --debug config.json`、审计命令 `wxc-exec.exe --audit policy.json` 及警告、后端表、源码构建命令、遥测默认关闭条件；新增：四个后端与平台可用性表格、五个策略域填空清单、三模式行为差异表格、已集成与将集成名单、学习/许可模式产出 JSON 活动报告、仅 Windows 进程容器能生成活动报告、Windows 365 支持 MXC 已 GA。

只是作者主张、没有佐证的部分：
- claude-ads README 全部为仓库自述。没有第三方评测、审计准确率、节省工时、误报/漏报率；安全门控和 release 规则是作者设定的规则，未附验证结果；“确定性评分 / 确定性报告”也是自述。
- Cloudflare OS：同等模型下该平台编码 agent 更快更好更省 token；沙箱让 slide 应用安全漏洞不可能发生；Blueprint 模式代表云软件传统作法转变；传统操作系统“应当”对 AI agent 特殊对待。均无数据或第三方验证。10473 stars 只说明热度。
- ai-meeting-room：README 级别作者自述系统设计与操作流程，没有 benchmark、用户案例或量化结果。
- Strands Box：`box.toml` 字段写法和 `policy.dw` 规则示例都没给出；默认拒绝、permit 覆盖、forbid 优先、文件读影响后续 HTTP 放行都是文字描述，没有附测试、日志或案例数据；凭证注入是设计声明，没有验证方式；没有效果指标或前后对照数据。
- cc-desk-tunnel：“服务器不需要高配，2 核 1 GB 入门机型就能运行”是作者陈述，无实测数据；“本机桌面应用输入、滚动、复制比远程桌面/SSH 终端更好”“多项目多会话更好管理”是作者对体验的判断，无对比数据；“不改官方本体、不做对抗”是自我描述，未附审计报告；README 只提供用量侧额度、重置时间和调用统计，没有工作效果指标、基准或对比数据。
- MXC：跨平台、后端清单、遥测默认关闭均为项目自述，无第三方验证数据；原文没有任何性能数据、基准测试、渗透测试结果或事故案例数字；“agent 不能充当自己的安全权威”这一论断；容器能消除“要么放开要么封死”的二选一；安全收益的定性描述。原文没有一行配置示例、字段名、SDK 调用或命令，所有具体做法必须回 SDK 仓库补全。Intune 管理策略与 Entra 的 agent 身份区分都是 soon / coming soon，尚不可用。网页日期标注为 2026 年 10 月 7 日，需自行核对当前状态。MXC 已支持 GitHub Copilot、OpenClaw、OpenAI Codex、Replit、LM Studio、Unsloth AI；将支持 Anthropic Claude Code、Box、Egnyte、Heidi Health、Nous Research Hermes Agent、Manus、Perplexity、Raycast、Simular 等；NVIDIA 把 OpenShell 集成进 MXC，补充文件与推理服务访问策略控制、高级网络控制、凭据管理、面向企业的 OCSF 审计。注意清单里 Claude Code 是 adopt，但按 MXC 原文它目前只是“将支持”，尚不可用；Copilot 在清单里是 drop，而 MXC 原文说它已支持，两者口径不同。

材料局限：
- claude-ads：输入只有 README 首页，不含各 skill 实际提示词、`scoring.py` 实现、capability manifest 明细，无法核验评分与门控；无法确认各平台适配是实测通过还是仅有 fixture；“怎么试、怎么验证”一节被截断。
- Cloudflare OS：没有给出任何一条 gatekeeper 的具体 OAuth 配置步骤（只有链接），服务商有意不简化 OAuth；自建服务器部署 COMING SOON；Gatekeeper 服务独立部署细节尚未确定，目前只能与 OS 实例一起部署；没有任务完成质量、耗时、成本对照数据；没有定时、事件或状态触发自动推进机制。
- ai-meeting-room：只支持 macOS；界面繁体中文；目前只有 Claude + Codex 两位成员；原文没有量化数据。
- Strands Box：非 Apple silicon 或不满足模型访问条件无法照做；Preview 接口和文档可能变动；策略与配置具体写法全在外链文档。
- cc-desk-tunnel：只有 README 一份材料，“怎么试、怎么验证”一节被截断；文档只有中文；不是沙箱；服务凭据等同于完全控制权；数据会离开本机；单用户自用、没有多用户、权限分级或租户隔离；账号合规需自行确认；frpc/frps 容易被杀毒软件和云厂商安全组件告警；部署依赖 Docker，镜像在服务器上从源码构建；脚本不代装系统软件、不改防火墙/nginx/SSH 配置。
- MXC：完整策略 JSON 示例、把 MXC 接进 agent 主循环（超时后如何处理、结果回收格式、重试）的做法、各后端实际隔离强度对比未给出；需按 README 指向的 `docs/backends/`、`docs/api-reference/`、`schemas/stable/` 继续查证；`windows_sandbox`、`microvm`、`hyperlight` 标注为 experimental；`--audit` 会关闭被分析工作负载的全部沙箱安全，绝不能用于不可信代码；审计模式仅在部分 Windows 版本可用；源码构建要求 Rust 1.93、Node.js 24+。

与已有工具做法的关系：claude-ads 把 Claude Code 作为规范运行时，安装走 Claude Code 插件市场，本身是 Agent Skills 形态；Cursor、goose 只列为 watch。Cloudflare OS 的 Gatekeeper 自称增强版 MCP server，与预先挂上所有 MCP server 相对；也能跑在开源 workerd 上、不必绑定 Cloudflare 云，但只有原文自述。ai-meeting-room 是 Claude Code 的一种落地用法：Claude Code 只做只读规划与复审，执行交给 Codex，用核准卡 + git 还原点夹住写权限；没有替代 Claude Code，而是补上谁执行、谁核准、怎么回滚、模型换代怎么办。Strands Box 是 harness-agnostic 沙箱引擎，把操作系统隔离和 Dogwood 语义策略结合，默认拒绝，凭证由网关注入，决策写 OTLP JSON；适合作为 B/C 更底层补充验证，仍是 Preview。MXC 是 harness-agnostic 沙箱化代码执行系统，把多种隔离后端统一在同一个 containment 模型与带类型 SDK 之后；新增调研显示它也是 Windows 平台上策略驱动的执行层，策略在 agent 工作负载控制之外，agent 不能给自己追加权限；适合作为 D 更偏“嵌入应用”的补充验证，并可用三模式在 Windows 11 上为 agent 收敛权限边界。cc-desk-tunnel 不修改 Claude Code 本体，是官方 Claude Code 与官方 Agent SDK 之上的一层胶水，改变执行位置边界——会话在云服务器、命令落到本机 Windows 执行，复用已有 Claude Code 审批、上下文管理、会话记忆；与 C 的差别是 C 用两个 CLI + 工作卡 + git 还原点，E 只有一个 CLI，靠隧道 + 端口最小放行 + 凭据管理；与 D 的差别是 D 有操作系统隔离与语义策略默认拒绝，E 明确不是沙箱；与 F 的差别是 F 是代码执行沙箱 + 策略驱动执行层，E 是跨机器执行拓扑。

## 依据的调研

- [AgriciDaniel/claude-ads](../research/radar/2026-10-01/580-agricidaniel-claude-ads.md)：值得一试，可按 README 原样安装 Claude Code 插件，先在一个广告平台上跑只读审计（/ads setup → /ads audit → /ads report → /ads next），把它当作「AI 操作 + 权限门控 + 确定性验证」的落地模板照搬；理由是原文给出了可直接复制的安装命令、完整命令表、评分阈值和写操作六道门控，但适用面限于付费媒体、效果只有仓库自述，因此建议小范围试而非全面采用。
- [cloudflare/cloudflare-os](../research/radar/2026-10-04/1062-cloudflare-cloudflare-os.md)：值得一试，先在本地跑 `pnpm run-local` 体验，重点把 Gatekeeper 的「按任务引入资源 + 有副作用动作延后批量审批」这套权限流程抄到自己的 agent 工作里，不要照搬整套平台；理由是它仍是 early access、自部署文档未完成，但权限与审批的具体做法可立即小范围验证。
- [sojei1989/ai-meeting-room](../research/radar/2026-10-08/1867-sojei1989-ai-meeting-room.md)：值得一试，建议小范围试装这套「只读规划 + 核准后写入 + 核准前 git 还原点」的双 AI 协作流程，因为它把权限边界、风险分级和回滚都做成了可直接照做的配置；但它是作者个人项目、只支持 macOS、界面仅繁体中文，且没有效果数据，所以先在一个无关紧要的小仓库上验证再决定是否长期用。
- [strands-agents/box](../research/radar/2026-10-08/1929-strands-agents-box.md)：值得一试，可在 Apple silicon Mac 上小范围试：按 README 给的下载/构建命令装起 Strands Box，用 box.toml 控直接访问、policy.dw 写默认拒绝策略，安全地把执行、读写和网络能力放开给 agent；但它自述仍是 Preview、只支持 macOS Apple silicon，策略与配置的具体写法全在外链文档里，原文只提供了安装和构建命令，所以先当可行性验证而非标准做法。
- [sun168567/cc-desk-tunnel](../research/radar/2026-10-08/1977-sun168567-cc-desk-tunnel.md)：值得一试，如果你的日常开发环境在 Windows 本机、又想让云端 Claude Code 直接在本机读写文件并执行命令，可以照 README 的部署流程在一台自己可控的云主机 + 一台 Windows 上小范围试；但它是个人维护、主要由 AI 编写、未经安全审计的工具，等于把本机的任意命令执行权交给服务器，只能自用、且必须先读安全须知并收紧端口与来源。
- [MXC - a sandboxed code execution system](../research/radar/2026-10-09/2229-mxc-a-sandboxed-code-execution-system.md)：值得一试，建议小范围试：在 Linux/macOS 上用 Node SDK 按 README 的片段以 egress 默认 deny + 超时启动容器，跑一段模型生成代码并回收 stdout，先验证越权用例确实被拦。理由是原文给出了可安装的 SDK、可复制的调用片段和 --debug/--audit 诊断命令，但完整策略 JSON 与接入 agent 主循环的做法未给出，故只到 try。
- [Mxc: Microsoft Execution Containers version 1.0.0](../research/radar/2026-10-11/2471-mxc-microsoft-execution-containers-version-1-0-0.md)：值得一试，值得在 Windows 11 上小范围试：把 MXC 的 Permissive→Learning→Enforcement 三模式流程用在自主编码/操作智能体上，先观测再收紧权限边界；理由是原文给出了明确的策略域、后端适用场景和三模式行为定义，可直接照着走，但没给任何配置示例，具体 schema 需去 SDK 仓库拿。
