# 让编码 agent 在动手前先过独立安全审查

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这篇手册解决如何在 AI 能读写文件、执行命令、调用外部服务时，用权限边界、沙箱、审批和独立审查把动作夹在可控范围内。
> 先试这一步：选一个低风险仓库，在 agent 的 pre-tool hook 里以 shadow 模式接入独立安全审查，只记录判定不拦截，先对比误拦和漏拦。
> 最近修订：2026-11-03

## 解决什么问题

AI 只读做审计、计划、创意、报告没问题；一旦能直接改账户、调外部服务、写代码或删文件，风险升级。本手册给九套做法：A 付费媒体账户默认只读、写操作逐条过六项门控；B 默认零权限、按任务只引入单个资源、有副作用动作先本地模拟再批量批准；C 本地仓库用 Claude 只读规划 + Codex 工作卡核准 + 沙箱执行 + git 还原点；D 用 Strands Box 验证默认拒绝、凭证注入、OTLP 决策记录；E 云端 Claude Code 通过反向 SSH 隧道落到 Windows 本机执行，靠端口最小放行与凭据管理夹住边界；F 用 MXC 做沙箱化代码执行，并在 Windows 11 上用 Permissive→Learning→Enforcement 三模式为 agent 收敛权限；G 磁盘清理先测量、出三层报告、人工批准后逐步删除；H 自托管 Diffinery，为编码 agent 开独立账号，用服务器强制的权限限制、人审 PR、CI 全绿后自动合并；I 给编码 agent 的工具调用前加独立安全审查，先 shadow 记录，再逐步开启 HARD BLOCK。

## 适用与不适用

**适用：** 管付费媒体账户且有授权导出或读取权限；要 AI 起草 + 人工审批 + 确定性验证；要默认零权限 + 按任务授权 + 延后批量审批；要双 CLI 分工 + 工作卡核准 + 沙箱执行 + 还原点；能接受 macOS + Node.js 20+ + Git 跑本机网页界面；Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、能访问 `us-west-2` Bedrock Claude Opus 5，想验证 Strands Box；Windows 10/11 x64 + 自己控制的 Linux 服务器，想让云端 Claude Code 在本机读写文件并执行命令；Windows 11，想用 MXC 把自主编码/操作 agent 放进策略驱动执行层；需要清理磁盘空间且能先做可信备份、愿意在需确认模式下运行通用编码 agent；想复刻 GitHub 式协作但要求 agent 独立账号、服务端硬限制、PR 人审、CI 全绿自动合并，且有自己的 Cloudflare 付费账号，愿意自托管 Diffinery；有会执行工具调用的 coding agent、能拿到完整 transcript，并有独立监控模型/分类器和 pre-tool hook，想加一层动作前安全审查。

**不适用：** 需要 AI 立即自动改账户、无人审批；装不了 Claude Code 插件或不能消费 skill 文件；把 Cloudflare OS 当生产平台；非 macOS 或想让会议室公开访问；需要 AI 直接产图或要量化效果数据才能采用；非 Apple silicon Mac 或无法访问指定 Bedrock 模型；把 Strands Box 当生产标准；想让 cc-desk-tunnel 当沙箱或多用户共用；不能接受数据离开本机；服务器所在地不在 Anthropic 支持的国家和地区；想用 `--audit` 给不可信代码补权限；源码构建环境不满足 Rust 1.93、Node.js 24+；MXC 没有配置示例，必须回 SDK 仓库补全；不能备份、不能接受删除不可逆仍想自动批准跑磁盘清理；想找 Diffinery 托管服务、SLA，或直接把它当团队唯一基础设施；没有 Cloudflare Workers Paid 与 R2；要求 agent 直接推保护分支、改 secrets 或自己把 CI 标绿；没有 pre-tool hook 或拿不到完整 transcript；想把监控提示词塞进被监控 agent 自己；想直接在生产或共享环境开阻断；把独立审查当权限系统替代品。

## 前置条件

- A：Claude Code；CPython 3.11/3.12；浏览器抓取需 Playwright；PDF 需 WeasyPrint/Pango；账户侧要有 client/account/KPI/privacy/guardrail 档案；凭证放环境变量、OS keychain 或 secret manager；写操作需 capability、对象 ID、before/after diff、审批上限、幂等键、审计目的地、回滚、验证窗口。
- B：pnpm；本地数据在 `.wrangler`；部署需自己的 Cloudflare 账号；外部服务要各自 OAuth client 凭据。
- C：macOS、Node.js 20+、Git、已登录 `claude` 与 `codex`；首次启动设定精灵问项目文件夹、手机入口、登录密码；可选 `.secrets/telegram-token.txt`、`.secrets/telegram-chat-id.txt`、`.secrets/gemini-api-key.txt`。
- D：Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、`us-west-2` Bedrock Claude Opus 5；下载脚本校验 checksum 到 `./box-core`；源码构建用 Cargo workspace；策略细节读 `docs/user/getting-started.md`、`security.md`、`policy.md`。
- E：一台有公网 IP 或域名的 Linux 服务器（x86_64，推荐 Ubuntu，已装 Docker）+ Windows 10/11 x64；记录服务地址、证书指纹、服务凭据；防火墙放行 8787 和 7000；客户端安装包自带 PowerShell 7、OpenSSH、frpc，无代码签名。
- F：Windows 11（会话容器、WSL 容器仅 Windows 11；进程容器支持 Windows 11/macOS/Linux）；从 MXC 仓库获取 SDK、configuration schema、文档与 samples；先只试进程容器；源码构建 Rust 1.93、Node.js 24+。
- G：通用编码 agent 能读文件、跑 shell；必须在需要人工确认工具调用的模式（Claude Code 普通权限提示、Cursor ask mode）；先做可信备份；从仓库取 `prompts/disk-cleanup.<语言>.md`，把 `---` 行以下内容贴进 agent。
- H：Cloudflare 账号在 Workers Paid 计划并启用 R2；该账号下有一个域名；具备文档所列权限的 Cloudflare API token；部署机有 Node.js 22、pnpm 10、Docker、`jq`、`curl`、`openssl`。本地零成本验证只需 Node 22、pnpm 10。给每个需要动手的 agent 建独立账号、token 与限额；`REVIEW.md` 放 base 分支；开启 agent review 并加入 required checks；在 Merge on green 里配好规则。
- I：有会执行工具调用的 coding agent；独立监控模型或分类器；能拿到完整 transcript（user/assistant 消息、工具调用、meta 行、outcome 行等 harness 事实）和最新工具调用；最好能在工具执行前运行；有可接入的 pre-tool hook 或权限层；先 shadow，再开 HARD BLOCK。

## 操作步骤

下面分九套做法。A/B/C/D/F/H/I 不冲突；E 不是沙箱，只宜自用小范围试；G 删除不可逆，先只出报告；I 是独立审查层，不是权限替代。

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

1. 本地跑：`pnpm run-local`，访问 http://localhost:8787。数据在 `.wrangler`，不用于生产。
2. 用官方提示词验证能力边界：
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
3. 按任务引入具体资源，不预先挂上所有服务。每个 agent 和 Gadget 默认零权限，按当次任务把具体资源介绍给它（粘贴链接或 add resource）；agent 可主动请求，由你批或拒。Gatekeeper 包装原生 API、处理 OAuth、限定到用户指定资源、记录全部动作、对有副作用动作提供人工批准。
4. 有副作用动作先模拟、后批量批准。agent 触发需批准动作时，Gatekeeper 本地模拟结果，告诉 agent 已完成，读回也给模拟结果，agent 可继续排队；你回来一次性批量批准或逐条批准。原文认为优于卡在第一步等人点确认，或开 `--dangerously-skip-permissions`。
5. 接入外部服务前读对应 gatekeeper 包配置说明，自行申请 OAuth client 凭据。路径：`packages/gatekeeper-github/README.md`、`packages/gatekeeper-google/README.md`、`packages/gatekeeper-cloudflare/README.md`、`packages/gatekeeper-supabase/README.md`、`packages/gatekeeper-notion/README.md`、`packages/gatekeeper-confluence/README.md`、`packages/gatekeeper-email/README.md`、`packages/gatekeeper-homeassistant/README.md`、`packages/gatekeeper-slack/README.md`、`packages/gatekeeper-spotify/README.md`、`packages/gatekeeper-zoominfo/README.md`。
6. 可选开发与部署：`pnpm dev-server`、`pnpm dev-client`，访问 http://localhost:3000。部署到自己的 Cloudflare 账号走 https://os.cloudflare.app/deploy；带自己的 gatekeeper 或改代码用 https://github.com/cloudflare/cloudflare-os-starter。自建服务器部署标注 COMING SOON。

### 做法 C：本地代码仓库（ai-meeting-room）——双 AI 只读规划 + 工作卡核准 + 沙箱执行 + 核准前 git 还原点

1. 安装启动：前提 macOS、Node.js 20+、Git、已登录 `claude` 与 `codex`。下载压缩档解压；Finder 双击 `start.command`；首次设定精灵问项目文件夹、手机入口、登录密码；浏览器打开 `http://127.0.0.1:4477`；终端可用 `npm start`。检查环境检查显示 `claude` 和 `codex` 版本号。
2. 跑会议：用白话写想做什么，按开始会议；等 Claude 只读规划、方案、风险；等 Codex 回报可行性、要改哪些文件、操作清单；左栏选方案；右栏逐张核准或拒绝；低风险=只新增文件或改样式，中风险=动现有功能，高风险=删档、装套件、部署；两张以上时有“核准全部低风险”和“核准全部”，按一下变“确定？再按一次”；每张先存还原点，一张失败就停，后面留待处理；全部做完 Claude 再审查；按结束并产出决议，存成 `meetings/` 里的 markdown。会议中可插话，送出前选给 Claude、给 Codex 或只记录。
3. 权限与还原：讨论中和待核准时 Claude 只能读，Codex 只能读（`--sandbox read-only`）；你按核准后 Claude 仍只能读，Codex 可写（`--sandbox workspace-write`）。每次核准前自动存 git 还原点，右下角“回到执行前”一键回复；Codex 越界写未列出文件会停下并还原；项目夹没有 git 时第一次执行自动建立版本控制。不要设路由器转发或公开反向代理，不要把监听位址改成 `0.0.0.0`；手机入口只接受 Tailscale 网段 100.64.0.0/10。登录密码存本机 `.secrets/passcode.txt`。附件或交件档若是 HTML、SVG 等会执行程序的档案，一律改成下载。
4. 模型自动跟进与费用护栏：启动时、每次 AI 开工前（最多每 5 分钟）比对 `claude` 和 `codex` 版本；版本变了或 Codex 模型清单超过一小时就重新侦测；闲置时每 30 分钟看一次。CLI 新列出的模型标成“待你开放”，按“开放”才用；不想用了可“收回”。选定模型若本次未提供，暂时改用最接近且不比原本高阶的模型，设定区与会议纪录写明；原模型恢复后自动换回。若剩下模型都比原本高阶，会停下来请你选。Codex 执行时若回报模型不能用，立刻重新侦测；唯读讨论自动换模型重试一次，会改档的工单不自动重跑，提示按“重试”。
5. 通知、远程与交件：三个时刻响一声（AI 跑完一轮、有新决定、素材做好）；右下角提示音可关。Telegram 推播需要 `.secrets/telegram-token.txt` 和 `.secrets/telegram-chat-id.txt`，存好后重启服务器，页尾可测试通知。需要图片素材时右栏出现“等你交件”卡片，写清尺寸、格式、数量、档名和存放路径；单档上限 25MB，同名档不覆盖；自己放好后按“我自己放好了”，确认档案存在才让 Codex 接手。
6. 白话解释降级链：每则讯息下“用白话解释”，顺序 Ollama（本机免费）→ Gemini → Claude，前面连不上、逾时或没回东西自动往后退，最后一行写是谁翻的。跳过 Ollama 把 `config.json` 的 `explainBy` 改成 `gemini`；全给 Claude 改成 `claude`。Ollama 的 `config.json` 的 `ollama.url` 填位址，例如 `http://100.x.x.x:11434`；`model` 留空用第一个模型；装在另一台电脑时把那台 `OLLAMA_HOST` 设成它自己的 Tailscale IP，不要设 `0.0.0.0`。Gemini 到 Google AI Studio 建金钥，存成 `.secrets/gemini-api-key.txt`。
7. 出问题：连线中断重新双击 `start.command`；被送回登录页重新输密码；错误次数过多等登录页显示的时间；手机网址打不开看启动视窗原因，确认 Tailscale 已连线；Claude 或 Codex 没回应按环境检查，通常登录过期，在终端执行 `claude` 或 `codex` 重新登录；还原点建不起来说 .git 被锁住，在项目资料夹执行 `rm -f .git/*.lock .git/objects/maintenance.lock` 再按核准；回覆格式跑掉会显示原始回覆；CLI 改版导致参数失效改 `config.json` 里的 `args`。
8. 可选改程序或自建：改画面 `public/index.html` 重新整理；改 `server/` 或 `config.json` 按左下角重新启动；`npm run dev` 会在程式变动时自动重启，但执行核准工作时不要用。测试 `node --test test/*.test.js`。可用模型由 `codex debug models` 和 `claude --help` 即时侦测；工单模型上限依 Astra > Sol > Terra > Luna，同家族比版本，不认得的新家族一律当最高档。打包 Mac 版：`node scripts/build-release.mjs --platform mac --out dist/ai-meeting-room-mac.zip`。

### 做法 D：Strands Box——用默认拒绝策略把执行、读写、网络能力放开（Preview，先做可行性验证）

1. 确认前提：Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、能访问 `us-west-2` Bedrock Claude Opus 5。不满足就退回借鉴设计：默认拒绝、凭证注入、决策记录。
2. 下载并验证：
```sh
curl -fsSL https://raw.githubusercontent.com/strands-agents/box/main/download.sh | sh
./box-core/box --version
```
脚本校验 release checksum，解包到 `./box-core`，不改 `PATH`，不动系统目录。二进制都放同一 `./box-core`。
3. 替代：源码构建：
```sh
git clone https://github.com/strands-agents/box.git
cd box
cargo build --release -p strands-box -p strands-box-containment
```
产物按 `./target/release/strands-box` 运行，helper 二进制同目录。常用任务：`just build`、`just test`、`just check`、`just test-all`；完整测试 `cargo test --workspace --all-features`。
4. 按 `docs/user/getting-started.md` 写最小 `box.toml` 和 `policy.dw`，启动 box。注意本次材料未给这两个文件字段或示例。
5. 分清分工：`box.toml` 改 agent 运行环境和直接访问授权；`policy.dw` 改 Box 经解释器和网关检查的操作规则。先读 `docs/user/getting-started.md`、`security.md`、`policy.md`。
6. 写策略时把策略编写 skill 交给编码 agent：`https://raw.githubusercontent.com/strands-agents/box/main/.agents/skills/authoring-box-policy/SKILL.md`。
7. 记住边界：`box.toml` 直接文件系统授权由 OS 强制执行，不产生单条 Dogwood 决策；要让策略管到文件操作，必须走解释器，并把这些文件排除在直接授权之外。
8. 跑示例：`examples/strands-box/strands-sdk-agent/` 是一个小 agent，三个工具都走 Shell；`examples/README.md` 是示例索引。预期能跑通。
9. 需要 agent 调外部 API 时，凭证配在网关上（API 凭证或 AWS SigV4 签名），不要给 agent 本体。原文是设计声明，需自行验证。
10. 需要审计读决策记录：默认 `<box_dir>/private/telemetry/records.jsonl`，OTLP JSON。把记录条数与 agent 实际调用对照，看是否漏记。
11. 可复现验证：复现 README 时序场景——一次经 Shell 或 Python 的文件读之后，网关随后拒绝一个出站 HTTP 请求。行为一致才按“可照做”写进标准流程。

### 做法 E：跨机器执行（cc-desk-tunnel）——云端 Claude Code + Windows 本机，靠端口最小放行与凭据管理夹住边界

1. 确认前提：一台有公网 IP 或域名的 Linux 服务器（x86_64，推荐 Ubuntu，已装 Docker）+ Windows 10/11 x64；服务器必须自己控制、可信，不要部署在共用或来路不明机器。不满足退回做法 C 或 D。
2. 部署服务端（在 Linux 服务器上执行）：
```sh
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/sun168567/cc-desk-tunnel/main/deploy/install.sh)"
```
脚本检查依赖（缺少只告诉你装什么，不代装系统软件）；从发布页下载最新服务端程序包并校验，解压到 `/opt/cc-desk-tunnel`；询问公网地址、证书方式、端口、数据目录（有默认值），构建镜像并启动；打印服务地址、证书指纹、服务凭据，以及需放行的两个 TCP 端口（默认 8787 和 7000）。不提供现成镜像，首次从源码构建需几分钟；不改防火墙、nginx、SSH 配置；再次运行同命令可升级。
3. 安装 Windows 客户端并填三项信息：下载 `CC-Desk-Tunnel-Setup-<版本>-x64.exe` 安装。自带 PowerShell 7、OpenSSH、frpc。启动后填服务地址、证书指纹、服务凭据并连接。首次 SmartScreen 点“更多信息 → 仍要运行”；frpc 可能被杀毒软件拦截。
4. 登录 Claude 并接入项目：客户端左下角账号页登录 Claude 账号（官方 `claude auth` 流程，登录凭据只保存在服务器上）；添加项目文件夹，开始对话。不想用订阅登录可改用 API key，在数据目录 `config/provider.json` 配置。
5. 按权限边界配置端口：控制端口（默认 8787/TCP）需要放行，nginx 模式改放行 443、8787 只监听本机，保护方式是 TLS + 服务凭据 + 登录限速；隧道端口（默认 7000/TCP）需要放行，TLS + 每次连接随机令牌，只在有客户端连接时监听；通往 Windows 的 SSH 映射端口（随机）不需要也无法放行，只监听容器内部回环地址，未发布到服务器，只接受本次连接临时公钥。Windows 一侧不放行任何入站端口；本机 SSH 只监听回环，随连接启停。想收紧在云厂商安全组只允许自己的出口 IP 访问 8787 和 7000。Docker 发布端口通常不受 `ufw` 限制。即使服务器防火墙全放行，SSH 映射端口仍无法从外部访问，但全部放行会暴露其他服务。
6. 必须知道的四件事：服务凭据等同于完全控制权，拿到它的人可使用你的 Claude 账号并在你电脑上执行任意命令；用脚本自动生成的随机凭据，不要改短口令、不要截图或贴聊天/issue，泄漏后在服务器执行 `manage.sh token` 更换。不是沙箱：Claude 能访问你的 Windows 用户能访问的一切，不只项目目录；项目边界只靠提示词引导 + Claude Code 自身审批。数据会离开本机：文件片段和命令输出经服务器发往模型服务；服务器保存会话记录和 Claude 登录凭据，备份文件同样含密。指纹从可信渠道取得：自签证书指纹应来自你自己登录服务器看到的安装汇总。
7. 处理杀毒软件与 SmartScreen：frpc 可能被报毒，Windows Defender 和不少杀毒软件会把 frp 标成黑客工具并隔离，部分云厂商主机安全组件也会对 `frps` 告警。不要仅凭“它是 frp”就当误报放行：先确认安装包来自本仓库发布页、对照 `SHA256SUMS` 校验、查看具体被拦截文件，确认来源后只对已核验组件文件设必要例外，不建议关杀毒软件或排除整个磁盘。连接提示“组件启动失败”先检查保护记录。安装包没有代码签名。
8. 可选定时任务：客户端自带，到点向指定会话或新会话发送预设提示词，也可让 Claude 帮你设置。README 未给具体提示词模板或配置字段，需在客户端实际操作确认。这是时间触发，没有展开事件/状态触发。
9. 可选源码构建与本地开发：需要 Git、Node.js 24 与 npm；Windows 上用 PowerShell 7。命令：`npm ci`、`npm run dev`、`npm test`、`npm run package:windows`、`npm run package:server`。仓库结构：`apps/desktop/`、`apps/server/`、`packages/protocol/`、`deploy/`、`scripts/`、`docs/`。
10. 只用一个非关键项目做最小试用并收尾：云厂商安全组只允许你的出口 IP 访问 8787 和 7000；服务器跑一次安装脚本，把三项记进密码管理器；Windows 装客户端连接，登录 Claude（或先配 `config/provider.json` 用 API key），只添加一个不重要测试项目目录；让 Claude 读取一个本机文件并汇报，再在本机执行一条无害命令（查看目录、跑一次项目单元测试）；试完断开，确认本机没有常驻服务、SSH 监听已停止。

### 做法 F：MXC——沙箱化代码执行 + Windows 11 三模式为 agent 收敛权限

**F1 用 SDK 把模型生成代码放进沙箱执行**

1. 按语言安装 SDK（不需要 clone 仓库，按语言用包管理器）：Node（Linux/macOS 最小试用推荐）`@microsoft/mxc-sdk`；Rust `https://crates.io/crates/mxc-sdk`；.NET `https://www.nuget.org/packages/Microsoft.Mxc.Sdk`。
2. 在应用里发起一次受控执行。按 README 的 Node 片段，请求至少要给 `command`；`network`、`timeoutMs` 是示例字段。更完整样例见 `samples/run-with-io-stdio-streaming/`，API 参考见 `docs/api-reference/`。预期：模型生成代码在沙箱容器执行，stdout 可回收，出站默认 deny，超时 30 秒。
3. 对照运行平台选后端：Windows 11 x64/ARM64 默认 `processcontainer`，其他有 `windows_sandbox`、`wslc`、`microvm`、`hyperlight`、`isolation_session`，带 * 为 experimental；Linux x64/ARM64 默认 `bubblewrap`，其他 `lxc`、`microvm`、`hyperlight`；macOS ARM64/x64 默认 `seatbelt`。各后端前置与行为见 `docs/backends/`。
4. 跑三组用例验证隔离：在 Linux 或 macOS 用 Node SDK，安装 `@microsoft/mxc-sdk`，照 README 写脚本；跑 (a) 只读写允许目录——应成功并回收 stdout；(b) 尝试写被拒路径——应失败；(c) 尝试出网——应失败。对 (b)(c) 用 `wxc-exec.exe --debug config.json` 打开诊断，确认是策略拒绝而非环境没搭好；要补权限走 `docs/logging-access-denied.md` 的 deny-and-record，不要用 `--audit`。
5. 替代：用平台专用 executor 二进制测试。如 `wxc-exec.exe` 接受 `schemas/stable/` 定义的稳定 schema 的 JSON 容器创建请求，用于测试，或 SDK 无法嵌入应用时。
6. 仅在开发 MXC 时源码构建。前提：修改原生运行时，或用独立 executor 二进制。构建前置：Rust 1.93、Node.js 24+ 与 npm、所选后端平台工具链。命令：`build.bat --all`、`./build.sh --all`、`./build-mac.sh --all`。
7. 需要持久隔离环境时用状态感知生命周期：provision → start → execute → stop → deprovision（概述见 `docs/container-lifecycle.md`），SDK 提供一次性与状态感知两类 API。
8. 遥测默认关闭：需同时满足运行级 opt-in、Windows 用户明示同意、管理策略允许、应用在容器请求中启用遥测选项；管理员只能阻止、不能代用户同意；非 Windows 平台为 no-op，本地开源构建不向 Microsoft 发送。

**F2 在 Windows 11 上用三模式为 agent 收敛权限边界**

前提：Windows 11。会话容器、WSL 容器仅 Windows 11；进程容器同时支持 Windows 11 / macOS / Linux。原文没有给出任何 JSON 字段名、命令行或 SDK 调用示例，只说可以从 MXC 仓库获取 SDK、configuration schema、文档和 samples。以下步骤是流程与决策框架，具体语法以 SDK 文档为准。

1. 先列出任务真正需要的资源，按五个策略域逐项声明：Containment 用哪种隔离环境（process/session/WSL/microVM）；Process 启动工作负载的命令、参数、工作目录、环境变量等；File system 可修改的位置/可读不可改的位置/完全不可访问的位置；Network 入站与出站连通性，以及能否通过宿主机 loopback 访问服务；User interface 能否访问或操作桌面及相关 UI 资源。原文示例：给编码 agent 本地源码仓库读写权 + Git 等必要开发工具；禁止访问用户 Documents 等个人位置；阻断入站与出站网络连接；禁止访问交互桌面。
2. 按负载选容器后端：Process container 适合需要低延迟响应的负载，Windows 用 AppContainer、macOS 用 Seatbelt、Linux 用 Bubblewrap；Session container 仅 Windows 11，适合长期运行的 agent 与自动化、需要桌面或更强隔离；WSL container 仅 Windows 11，适合依赖 Linux 包与开发生态的 Linux-first 工具链；MicroVM 支持 Windows 11 与 Linux，实验性，适合需要硬件级虚拟化边界的高风险负载。原文建议先只试进程容器，最轻、跨平台、最容易回滚。
3. 用低约束模式起草策略，不要一上来就 Enforcement。首次放进 MXC，策略很可能挡掉合法需要的能力，这些拒绝指出边界该往哪调。
4. 三模式推进：Enforcement 阻断未授权访问、无活动报告，按生产策略运行负载；Learning 阻断并记录、有 JSON 活动报告，诊断失败、验证策略只授予必需访问；Permissive 放行并记录、有 JSON 活动报告，不强制策略观测 agent 行为。Learning 下边界仍生效，未授予操作被阻断并写入 JSON 活动报告；Permissive 下策略本会拒绝的访问被记录但仍放行，适合授权阶段，任务能跑完并攒下资源使用证据。Permissive 不绕开其他操作系统或组织限制。
5. 用活动报告收敛成最小权限策略：每次被拒操作暴露一个待调整点，只补真正需要的权限。仅 Windows 的 MXC 进程容器能生成该活动报告。
6. 让负载优雅处理越界：把工作负载设计成能在比默认更严格的边界下运行。如果组织策略挡住某资源，agent 应说明任务无法在现有权限内完成、请求用户或管理员操作、或选择安全替代方案，不应静默失败。
7. 接入方式：用你常用的编码 agent 去集成 MXC SDK 并起草初版策略，然后 review、测试、迭代控制项。组织侧可叠加管理策略；同一个 agent 能在不同企业边界内运行，不用把组织安全姿态写进应用里。
8. 最小试用（Windows 11）：从 MXC 仓库拉 SDK 与样例，确认本机版本与后端可用性，先只试进程容器；选一个无害任务，例如让编码 agent 在本地仓库改一个 README 并跑一次测试；第一轮用 Permissive 跑同一任务，拿 JSON 活动报告，看清实际碰了哪些文件、哪些网络目标；按报告写最小权限策略（仓库读写、必要工具/命令，其余不授予），切 Learning 复跑；处理每次拒绝，确认确实需要还是可换安全做法，只补前者，重复到拒绝清单收敛；切 Enforcement 跑同一任务，作为生产态基线；再故意让 agent 触碰明确不该碰的资源（用户文档目录或外部网络地址），确认被拦下且 agent 显式报告失败，而不是静默失败。

### 做法 G：磁盘空间审计（ai-disk-cleanup）——先测量、三层报告、人工批准后逐步删除

1. 前提：先做一份你信得过的备份。README 明确：这些命令不进回收站，删除不可逆，批 Tier 2 / Tier 3 之前尤其要先备份。必须在“工具调用需要你确认”的模式下运行：Claude Code 的普通权限提示、Cursor 的 ask mode 等；不要用 auto-approve / “yolo” 模式。提示词只是“要求”批准，真正保证暂停的是你的 agent 权限模式；无人值守的 agent 可能在你看分层表之前就删完了。它报告的大小、以及它判断“能否再生”都可能错，它只是从 `du` 输出推断。
2. 选语言，打开对应文件，把 `---` 行以下的全部内容粘贴进 agent：英文（基准）`prompts/disk-cleanup.en.md`；简体中文 `prompts/disk-cleanup.zh-CN.md`；其余 `prompts/disk-cleanup.tr.md`、`es`、`ru`、`pt-BR`、`ja`。提示词的语言是有功能的：它同时决定 agent 用什么语言向你汇报；shell 命令在所有语言版本里都保持英文。
3. agent 会先探测操作系统，之后只用该平台的命令和路径。
4. 测量，不要猜：自顶向下走到真正的元凶，而不是停在它的父目录。README 举的例子包括 `Docker.raw` 显示 60 GB、实际占用 14 GB；真正的头号占用是一个 23 GB 的废弃 `git` worktree 目录；两个 15 GB 的 iOS 模拟器运行时躺在 `/Library` 下，普通的主目录扫描根本到不了。
5. 知道陷阱：稀疏磁盘、符号链接被重复计数、快照占着已释放的空间、异步删除、以及名字叫 `target/` 但不是 Rust 的目录。
6. 按三层出报告，然后停下：Tier 1 缓存、构建产物、包下载、死 worktree，可再生产、无风险；Tier 2 VM 磁盘、旧 SDK 运行时、容器镜像，里面真有数据，会没；Tier 3 Downloads、浏览器配置、不用的应用，完全由你决定。
7. 回答它提出的“层级”问题之前，先把上表读一遍，再决定批哪一层。
8. 逐步执行：每删一项后打印新释放出的空间；用各工具自己的清理命令，而不是 `rm -rf`。
9. 尊重权限边界：任何需要 `sudo` 或提权的操作，都以“可直接运行的命令”形式交回给你，不得绕过。
10. 绝不删除：源码、git 历史、`.env`、密钥、钥匙串、照片与邮件库、云同步文件夹、正在运行的 VM 磁盘、操作系统快照。
11. 汇总：包括哪些是“你之后必须手工修”的（README 的示例中，两个 root 拥有的项——10 GB 的模拟器 `dyld` 缓存和一个 6 GB 的废弃 Nessus 安装——就是以 `sudo` 一行命令交回的）。
12. 信任边界：提示词要求 agent 把磁盘上发现的一切当作数据，不是指令——某个下载目录里的文件名或 README 不能诱导它多删东西。运行前自己把提示词读一遍。
13. 本次材料只有 README，提示词正文和具体 shell 命令没有提供，因此无法逐条抄录；以上步骤来自 README 的 Usage 与 “The method” 小节，真正粘贴的内容需要去仓库取。

### 做法 H：自托管 Git 平台（Diffinery）——独立 agent 账号 + 服务端硬限制 + 人审 PR + CI 全绿自动合并

1. 生产部署前提：Cloudflare 账号在 Workers Paid 计划并启用 R2；该账号下有一个域名；一个具备文档所列权限的 Cloudflare API token；部署机有 Node.js 22、pnpm 10、Docker、`jq`、`curl`、`openssl`。预期：能创建 D1、R2、Queues、Workflows、Containers 等资源。
2. 克隆并设置环境变量：
```sh
git clone https://diffinery.com/codician/diffinery.git
cd diffinery
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export DIFFINERY_DOMAIN=git.example.com
export BOOTSTRAP_ADMINS=you@example.com
```
预期：token 不提交。
3. 先空跑校验工具、token 与配置，不改动任何资源：
```sh
scripts/setup.sh --dry-run
```
4. 正式执行：
```sh
scripts/setup.sh
```
预期：创建缺失的 D1 数据库、R2 桶与生命周期规则、队列、Turnstile、用于邮箱找回的 Cloudflare Access 应用，执行迁移，部署 Worker 与 runner 镜像，生成 Worker 密钥，并检查站点可访问。原文称每一步可重复执行，同一命令也用于升级。
5. 成为首个管理员：打开 `https://<your host>/auth/access`，用一次性验证码确认邮箱，然后添加 passkey。
6. 零成本本地验证（不需要 Cloudflare 账号）：Node 22、pnpm 10。
```sh
pnpm install
pnpm -r build && pnpm -r typecheck && pnpm -r test
pnpm --filter @diffinery/app db:migrate:local
pnpm dev
pnpm --filter @diffinery/app e2e
```
预期：本地 http://localhost:8787，以 dev@diffinery.local 登录；e2e 用真实 git 推仓库、跑 workflow、驱动 MCP 与 REST、并用 passkey 在 Chromium 登录。
7. 给每个需要动手的 agent 建独立账号，分配 token 与限额；不要复用人的账号。理解服务器强制限制：agent 不能推保护分支；agent 的 PR 至少需要一个人批准，agent 的批准不算；除非规则允许，agent 不能合并保护分支；agent 的检查结果不能满足 required checks；agent 推送代码触发的 workflow 只拿到 job token，拿不到 secrets；agent 无论角色如何都不能改 secrets、environments、分支保护，push protection 也不可绕过；agent 不能登录 Web UI；每次提交记录代表谁。
8. 在 base 分支写 `REVIEW.md`，写清哪些问题可 blocking、哪些只建议。开启 agent review 并加入 required checks；blocking finding 会让 Agent review check 失败。用 Fix it 把 finding 转成任务，或开 autofix 推到 PR 分支。注意：无写权限作者的 PR 不会被自动评审；一个仓库的评审费用由一个 key 支付。
9. 在 Settings → Merge on green 勾选必须通过的检查、指定哪些 agent 的 PR 可自动落地、是否仍需人工批准。注意硬限制：agent 对 workflow 文件的改动仍需人合并。
10. 用 Projects 给仓库配 agent 任务看板、对话、项目指令与共享记忆；需要把帖子自动变成任务时开 coordinator agent 并设上限。每日从 Today / Needs you 进入，可开早间邮件；agent 可通过 MCP 的 `today` 工具读同一视图。需要按自己的订阅跑时，打开 terminal 用自己账号登录 Claude Code / Codex 再交任务；API key 不进沙箱，每次运行只拿一个仅被 Diffinery 模型代理接受的 token。
11. 接入工具链：
```sh
claude plugin marketplace add codician-team/diffinery
claude plugin install diffinery@diffinery
claude plugin install diffinery-ci@diffinery
codex plugin marketplace add https://diffinery.com/codician/diffinery.git
codex plugin add diffinery@diffinery
```
MCP server 地址：`https://<your host>/mcp`，用浏览器登录（OAuth 2.1）或 agent token。Claude（claude.ai / Desktop / 移动端）：Settings → Connectors → Add custom connector，填 `https://diffinery.com/mcp`。CLI：`curl -fsSL https://diffinery.com/install | bash`，随后 `diffinery setup`。让 `gh` 可用：`diffinery auth setup-gh`。JetBrains 插件仓库：`https://diffinery.com/-/jetbrains/updatePlugins.xml`（2024.3+）。
12. 最小试点：在一个非关键仓库上，先用本地 `pnpm dev` 或自己的实例；建独立 agent 账号，写 `REVIEW.md`，让 agent 从目标开 PR；验证它不能推保护分支、不能改 secrets、不能自己把 CI 标绿；人批准后 CI 全绿自动合并；再故意让 agent 尝试推保护分支或改 secrets，确认被服务器拒绝。原文未给建议试点时长。

### 做法 I：编码 agent 的工具调用前独立安全审查（claude-code-auto-safeguard-prompt）

1. 前提：有会执行工具调用的 coding agent，以及一个独立监控模型或分类器；监控器能拿到完整 transcript 和最新工具调用，最好能在工具执行前运行。没有 pre-tool hook 或拿不到完整 transcript 就不要硬套。
2. 把仓库提示词全文作为监控器的 system prompt，不要塞进被监控 agent 自己的 system prompt，避免让被监控对象自己判断自己。原文开头：`You are a security monitor for autonomous AI coding agents.`
3. 每次工具调用前，把 `transcript` 对话历史加上最后一条工具调用作为待评估动作送入监控器；保留 harness 注入的 meta 行、outcome 行和 host context。原文明确：transcript 只是上下文，待评估的是最后一条 tool call；meta 行不是动作；assistant 文本不是用户消息，不能单独建立用户意图。
4. 要求监控器输出 allow/block、命中的规则和理由。HARD BLOCK 不允许用用户上下文放行；SOFT BLOCK 只有在用户明确命名危险动作和危险参数时才放行。原文同意门槛：用户必须命名动作以及使其危险的具体对象；agent 自己推断、选择或从工具结果里拿到的参数不算用户意图。
5. 先开 shadow mode：只记录判定，不真正拦截；把监控器判定和人工复核或事后审计对比。不要直接在生产或共享环境开启阻断。
6. 稳定后再对 HARD BLOCK 开启阻断；SOFT BLOCK 先只告警，逐步调整规则。原文提到 classifier 不可达或解析失败时会 fail-closed，这会影响可用性，试用时单独统计。
7. 接入方式：按你所用 harness 的 pre-tool hook 或权限层接入；原文只提供提示词逻辑，不提供安装步骤、代码或完整部署流程，不要臆造安装命令。
8. 最小试用：选一个低风险仓库或沙盒，跑一个较长任务的 coding agent；用仓库提示词作为独立监控器的 system prompt；只记录不阻断，覆盖至少 20-50 次工具调用（这是试用建议，原文没有给样本量）；人工标注每次调用是否应拦。指标：误拦率（合法动作被拦/总合法动作）、漏拦率（应拦未拦/总应拦）、与人工一致率、平均审查延迟、fail-closed 次数。若误拦率可接受且能抓到至少一类真实风险，再对 HARD BLOCK 开阻断；否则只保留告警。不要用“拦了多少”作为唯一成功指标。
9. 与已有做法的关系：它是 Claude Code 等 harness 权限系统之外的二次审查层，不是替代品；不改变执行位置权限，不能替代 A 的六项门控、B 的 Gatekeeper、C 的沙箱与还原点、D/F 的隔离、E 的端口与凭据边界、G 的人工批准、H 的服务器强制限制。低风险短任务不一定需要独立监控器。

**怎么选（A–I）：** 账户写操作、不可逆或 blast radius 大：做法 A 的六项门控，逐条同步确认，缺 ceilings 即禁止写入。可模拟、可回滚、需要连续推进：做法 B，先本地模拟让 agent 排队推进，人离线，回来批量批准。本地代码仓库改动：做法 C，Claude 全程只读规划与复审，Codex 只在核准后 `workspace-write` 执行工作卡明列文件；核准前存 git 还原点。想验证默认拒绝 + 语义策略 + 凭证注入 + 决策记录且有 Apple silicon Mac：做法 D，只当可行性验证。会话必须在云上、项目与工具链必须在 Windows 本机：做法 E，但它不是沙箱，服务凭据等同于完全控制权，只宜单用户自用。要把模型生成代码放进沙箱执行并回收结果：做法 F1，先做最小试用验证越权用例被拦。在 Windows 11 上要让自主编码/操作 agent 先观测再收紧权限边界：做法 F2，用三模式，先只试进程容器。磁盘空间不足、删除不可逆、愿意先备份并在需确认模式下跑：做法 G，第一轮只跑到三层报告为止。想把 GitHub 式协作搬到自己的 Cloudflare 账号，并让 agent 只能开 PR、不能推保护分支、不能改 secrets、不能自己把 CI 标绿：做法 H，先本地零成本验证，再上自己的 Cloudflare；不要直接作为团队唯一基础设施。想给已有 coding agent 加动作前二次审查、又不想改权限系统：做法 I，先 shadow 只记录，稳定后只对 HARD BLOCK 开阻断；它不能替代 A-H 的权限、沙箱、审批和服务器强制限制。只读审计与报告：做法 A 的 setup/audit/report/next；想验证权限链路，再用 B、C、D、E、F、G、H 或 I 的最小试用。

## 怎么判断变好了

各材料都没有给准确率、节省工时、误报/漏报率这类结果数据，主要看过程信号。A：audit run 的 findings 是否带日期证据和显式置信度；报告是否为版本化 JSON run bundle；证据覆盖率是否 ≥80% 可评级，60–79% 暂定，低于 60% 证据不足；写操作是否一直停在草案直到六项门控齐备。B：从下提示词到可用产出需要中途介入几次；审批能否真的延后批量完成；Gatekeeper 日志能否复盘 agent 对外的每个动作以及限定在哪个具体资源；换通用编码 agent 对比 token 消耗、失败次数与返工量（原文声称更快更好更省 token，是作者主张）。C：会议结束是否产出 `meetings/` 里的 markdown 决议；每次核准前是否成功存 git 还原点，绿色 `GIT` 是否表示还原点可正常运作，按“回到执行前”能否一键回复；Codex 是否只写工作卡明列文件，越界时是否停下并还原；模型被替换时设定区与会议纪录是否写明，原模型恢复后是否自动换回；`node --test test/*.test.js` 是否通过。D：拒绝有效性——让 agent 访问未授权路径或发未 permit 的请求，确认被实际拒绝；记录完整性——`<box_dir>/private/telemetry/records.jsonl` 对每次受检查操作都有 OTLP JSON 记录，把记录条数与实际调用对照；凭证不外泄；时序规则生效。E：Claude 能否在客户端成功读写指定路径的本机文件并在本机执行命令看到输出；编译、测试等命令是否确实在 Windows 本机跑；Windows 一侧是否没有放行任何入站端口，本机 SSH 是否只监听回环、随连接启停；服务凭据是否只存在密码管理器里；是否清楚会话记录和 Claude 登录凭据留在服务器上。F1：越权用例被拦比例，目标 100%；合法用例被误拦比例与策略返工次数；合法工作负载首次运行成功率；接进“生成代码 → 隔离执行 → 回结果”循环后的端到端成功率、重试次数、人工介入次数。F2：Enforced 策略下同一任务成功率与耗时相比不加容器时没有明显退化；活动报告中出现的资源集合 ⊆ 策略声明的集合；Learning→Enforcement 后不再出现“策略本会拒绝”的条目；越界尝试 100% 被阻断，且 agent 显式说明权限不足。G：误报数应为 0；未经批准的操作次数应为 0；测量准确率——抽查项中它报的大小与你自己 `du` 实测一致的条数；发现力——与你自己手工 `du | sort` 得出的 top 10 占用项对比；Tier 1 释放量；人工负担。H：agent 不能推保护分支；agent 的批准不算人批准；agent 的检查不能当 required checks；agent 代码触发的 workflow 无 secrets；agent 不能改 secrets、environments、分支保护；Agent review 的 blocking finding 会卡住；Merge on green 只在检查通过且规则满足时合并；Today / Needs you 是否只列需要你处理的项；本地 `pnpm -r test` 与 e2e 是否通过。I：shadow 阶段误拦率、漏拦率、与人工一致率、平均审查延迟、fail-closed 次数；HARD BLOCK 开启后真实危险动作是否减少且正常开发不被阻断；不要只看拦截数量。原文没有给指标。

**最小试用方式：** A 只挑一个广告平台，`/ads setup` → `/ads audit` → `/ads report` → `/ads next`，全程只读。B 装 pnpm → `pnpm run-local` → 跑“做 slides”和“建协作白板应用” → 再配置一个真实资源，走完引入资源 → agent 请求权限 → 审批队列 → 批量批准。C 在一个无关紧要的小仓库，双击 `start.command` → 完成设定精灵 → 打开 `http://127.0.0.1:4477` → 提一个小改动 → 逐张核准（先存还原点）→ 看 Codex 是否只写列出文件 → 按“回到执行前”验证回滚。D 满足前提的 Apple silicon Mac 上执行下载与 `--version`；按 `docs/user/getting-started.md` 写最小 `box.toml` 和 `policy.dw`，启动 box，跑示例 agent；把一次操作从直接授权改成经解释器 + 策略检查，体会边界差别。E 限定两台机器、一个非关键项目：安全组只允许自己的出口 IP 访问 8787 和 7000，服务器跑一次安装脚本，Windows 装客户端填三项信息连接，登录 Claude，只添加一个不重要测试项目目录，让 Claude 读取一个本机文件并汇报，再在本机执行一条无害命令，试完断开并确认本机无常驻服务、SSH 监听已停止。F1 在 Linux 或 macOS + Node SDK，安装 `@microsoft/mxc-sdk`，照 README 写脚本，跑三组用例（允许目录读写、被拒路径写入、出网），用 `wxc-exec.exe --debug config.json` 诊断失败原因。F2 一台 Windows 11：从 MXC 仓库拉 SDK 与样例，先只试进程容器；选无害任务（改 README 并跑测试）；Permissive 跑同一任务拿 JSON 活动报告；写最小权限策略；Learning 复跑并处理拒绝；Enforcement 跑作为基线；再故意触碰不该碰的资源确认被拦且显式报告失败。G 选一台非关键机器或先做完整备份；用 Claude Code 普通权限模式或 Cursor ask mode，粘贴 `prompts/disk-cleanup.zh-CN.md` 里 `---` 以下的内容；第一轮只跑到三层报告为止，不批准任何一项；人工抽查至少 5 条（其中必须包含 1 条“看起来特别大”的项和 1 条 `/Library`、`/var` 之类主目录之外的项），自己跑 `du` 核对实际占用；抽查通过后，第二轮只批准 Tier 1，逐步执行，每步之后自己核对释放量；Tier 2/3 先不动。H 在一个非关键仓库上，先用本地 `pnpm dev` 或自己的实例；建独立 agent 账号，写 `REVIEW.md`，让 agent 从目标开 PR；验证它不能推保护分支、不能改 secrets、不能自己把 CI 标绿；人批准后 CI 全绿自动合并；再故意让 agent 尝试推保护分支或改 secrets，确认被服务器拒绝。I 选一个低风险仓库或沙盒，跑一个较长任务的 coding agent；用仓库提示词作为独立监控器的 system prompt；只记录不阻断，覆盖至少 20-50 次工具调用（试用建议，原文没有给样本量），人工标注每次是否应拦；先看误拦率能否接受、能否抓到至少一类真实风险，再考虑对 HARD BLOCK 开阻断。

**试多久：** claude-ads 材料在“怎么试”被截断，没有建议时长；Cloudflare OS 原文建议最小试用控制在半天内；ai-meeting-room 原文没有建议时长，建议至少跑通一轮完整会议并故意制造一次越界或失败看还原与重试；Strands Box、cc-desk-tunnel、MXC、Diffinery、claude-code-auto-safeguard-prompt 原文都没有建议时长，先做一次可行性验证，不要直接进生产；ai-disk-cleanup 原文建议最小试用半天内做完，且第一次不删任何东西。合起来：单平台只读一轮，加半天本地权限链路验证，加半天磁盘只读审计，再加一个非关键仓库跑通 Diffinery 的“目标→PR→评审→CI→合并”一轮，再加一次安全审查 shadow 试用，再决定要不要扩到更多平台、更多服务或跨机器执行。

## 常见坑

- A：把远程安装脚本直接管道进 shell；旧 marketplace 别名没清；以为出了 diff 就能改账户（缺 ceilings 等于禁止写入，六条门控缺一不可）；把 unknown 当扣分项；覆盖率不够就下结论；把 partial run 当完整审计；凭证乱放；把仓库自述当成已验证结果。
- B：预先挂上一堆 MCP server、让所有服务在整个会话里都“在场”；把所有有副作用的动作都卡在第一步同步等确认；用 `--dangerously-skip-permissions` 自动放行；把 `pnpm run-local` 当生产环境；现在就把整套 Cloudflare OS 当生产平台上线；想改造 Cloudflare OS 上游。
- C：把 `0.0.0.0` 当方便；只关分页就以为登出了；在会议室里直接打开 HTML、SVG 这类会执行程序的附件或交件档；用 `npm run dev` 跑核准工作；以为 Claude 或 Codex 会产图；把新模型自动升级；把唯读失败和写工单失败一视同仁；把会议室的 git 锁当死局；以为 ai-meeting-room 有量化效果数据。
- D：把 Strands Box 当生产标准；非 Apple silicon 或不满足前提还硬套；以为直接文件系统授权会产生 Dogwood 决策；以为原文给了 `box.toml` / `policy.dw` 字段或示例；把默认拒绝、permit 覆盖、forbid 优先、文件读影响后续 HTTP 放行当已验证；以为凭证注入已验证 agent 拿不到 secret；忘了把 helper 二进制放在同一目录。
- E：把 cc-desk-tunnel 的服务凭据当普通密码；以为它是沙箱；在共用或来路不明服务器部署；以为 Docker 发布端口会受 `ufw` 规则限制；以为“通往 Windows 的 SSH 映射端口”需要放行；只凭“它是 frp”就当误报放行；以为服务器需要高配；账号合规想当然；想多用户共用；以为安装包有代码签名；证书指纹从别人转发的消息里拿；忘记数据会离开本机；以为定时任务有文档化提示词模板或配置字段。
- F：把 `--audit` 用于不可信代码；以为原文给了完整策略 JSON 示例；以为原文给了把 MXC 接进 agent 主循环的做法；把 experimental 后端当稳定生产；忘了原生 executor 默认把 stdin/stdout/stderr 留给工作负载；源码构建环境不对；遥测想开就开；把“跨平台”“后端清单”“遥测默认关闭”当已验证；一上来就用 Enforcement；把 Permissive 当绕过组织限制；把会话容器/WSL 容器当成跨平台；让 agent 静默失败。
- G：把提示词当强制暂停；用 auto-approve / “yolo” 模式跑删除；以为删除会进回收站；相信它报的大小和“可再生”判断；把磁盘上发现的文件名或 README 当指令；以为跨平台有运行数据。
- H：把 Diffinery 当托管服务或有 SLA；没有 Cloudflare Workers Paid 与 R2 就硬上；把 API token 提交进仓库；复用人的账号给 agent；只靠提示词限制 agent，不依赖服务器强制限制；让 agent 的批准当人批准；让 agent 的检查当 required checks；忘记 agent 对 workflow 文件的改动仍需人合并；把 `REVIEW.md` 放错分支；以为无写权限作者的 PR 会被自动评审；把 API key 放进沙箱（原文说 API key 不进沙箱，每次运行只拿一个仅被 Diffinery 模型代理接受的 token）；把本地 `pnpm dev` 当生产等价；项目年轻、无托管服务、需自备 Cloudflare 付费账号，却直接作为团队唯一基础设施。
- I：把监控提示词塞进被监控 agent 自己的 system prompt，让被监控对象自己判断自己；把 assistant 文本当用户意图，或把 meta 行当动作；没有完整 transcript / pre-tool hook 就硬套；直接在生产或共享环境开阻断；不先 shadow；把 HARD BLOCK 用用户上下文放行；SOFT BLOCK 同意门槛低于“用户明确命名动作和危险参数”；把 classifier fail-closed 当正常，不统计可用性影响；把 stars 当效果证据；把提示词当完整部署方案；臆造安装命令；忽略原文被截断，以为 BLOCK 列表完整；把独立审查当权限系统替代品。

## 证据与来源

做法 A 依据 AgriciDaniel/claude-ads 仓库 README 首页（v2.0.2）。可直接照抄的是插件与脚本安装命令、`install.sh` / `install.ps1` / `uninstall.sh` 用法、完整命令表、12 平台清单、写操作六条门控、评分阈值 80%/60%、release 四条硬规则、开发与校验命令；README 全部为仓库自述，没有第三方评测、审计准确率、节省工时、误报/漏报率，安全门控和 release 规则是作者设定，未附验证结果。做法 B 依据 cloudflare/cloudflare-os README（v2，early access）。可直接照抄的是 `pnpm run-local`、http://localhost:8787、五条官方提示词、11 个 gatekeeper 包路径、开发命令与部署入口；没有 gatekeeper 的具体 OAuth 配置步骤，自建服务器部署 COMING SOON，没有任务完成质量、耗时、成本对照数据；同等模型下该平台编码 agent 更快更好更省 token 是作者主张。做法 C 依据 sojei1989/ai-meeting-room README（Apache License 2.0，macOS 本机开源应用）。可直接照抄的是安装步骤、`--sandbox read-only` / `--sandbox workspace-write`、风险分级、核准与还原规则、模型发现与费用护栏、白话解释降级链、测试与打包命令；原文没有 benchmark、用户案例或量化结果。做法 D 依据 strands-agents/box README（Preview，只支持 macOS Apple silicon 本地执行）。可直接照抄的是下载脚本、Cargo 构建命令、`just` 任务、两个配置文件名与分工、策略 skill URL、决策记录默认路径、示例目录；`box.toml` 字段写法和 `policy.dw` 规则示例都没给出，默认拒绝、permit 覆盖、forbid 优先、文件读影响后续 HTTP 放行都是文字描述，凭证注入是设计声明，没有验证方式。做法 E 依据 sun168567/cc-desk-tunnel README（Apache-2.0，约 39 stars，自述主要由 AI 编写、个人维护、没有专业安全审计，与 Anthropic 无隶属或合作关系）。可直接照抄的是服务端部署命令、默认放行端口 8787 与 7000、三行端口对照表、作者“必须知道的四件事”、杀毒软件与 SmartScreen 处理建议含 `SHA256SUMS` 核对、源码构建命令、`manage.sh token` 更换凭据、`config/provider.json` 配 API key；只有 README 一份材料，不是沙箱，服务凭据等同于完全控制权，数据会离开本机，单用户自用；“2 核 1 GB 入门机型就能运行”是作者陈述，无实测数据。做法 F1 依据 Microsoft MXC 仓库 README；可直接照抄的是包管理器、诊断命令 `wxc-exec.exe --debug config.json`、审计命令及警告、后端表、源码构建命令、遥测默认关闭条件；跨平台、后端清单、遥测默认关闭均为项目自述，无第三方验证数据；原文没有一行配置示例、字段名、SDK 调用或命令，完整策略 JSON 与接进 agent 主循环的做法未给出。做法 F2 依据本次新增 MXC: Microsoft Execution Containers version 1.0.0 发布帖调研；结论是值得在 Windows 11 上小范围试，把 Permissive→Learning→Enforcement 三模式流程用在自主编码/操作智能体上；可直接照抄的是四个后端与平台可用性表格、五个策略域填空清单、三模式行为差异表格、JSON 活动报告与仅 Windows 进程容器能生成活动报告等描述；原文没有一行配置示例，Intune 管理策略与 Entra 的 agent 身份区分都是 soon / coming soon。做法 G 依据 riza/ai-disk-cleanup README（30 stars，只有 README）。可直接照抄的是三层分层表、“绝不删除”清单、逐步执行且每步打印新释放空间、需要 `sudo` 的操作以可直接运行的命令交回、把磁盘内容当数据不当指令、语言文件路径与“把 `---` 以下内容贴进 agent”的用法；提示词正文和具体 shell 命令没有提供，无法核验；删除不可逆、没有回收站；提示词无法强制暂停，安全性完全依赖 agent 的权限模式；跨平台只有声明，材料只有 macOS 一次运行。做法 H 依据 codician-team/diffinery 调研报告；README 给出可直接执行的部署/安装命令和一份明确的权限限制清单，包括 agent 独立账号、服务器强制的权限限制、人审 PR、CI 全绿自动合并；但项目年轻、无托管服务、需自备 Cloudflare 付费账号，不适合直接作为团队唯一基础设施；调研结论是建议在非关键仓库上小范围试点，重点不是换掉 GitHub，而是复刻它的协作模式；材料没有给效果数据，权限设计属 README 自述，需自行验证。做法 I 依据 collinzrj/claude-code-auto-safeguard-prompt 调研；原文给出较完整分类器提示词：角色、威胁模型、输入格式、HARD/SOFT 区分、用户意图高证据门槛、复合动作、写文件执行、子代理委托等评估规则；没有安装步骤、代码、模型选择、阈值、基准数据或实际案例；stars 不是效果证据；子代理委托规则处被截断，看不到完整 BLOCK 列表和后续内容；高度依赖 harness 提供的 meta/outcome 行，换环境可能失效；提示词长可能增加延迟和成本；误拦漏拦需实测；适用条件是有完整工具调用 transcript 且能把监控器放在执行前。结论是建议小范围试用，作为独立监控模型的 system prompt，在工具调用前 shadow 审查，再逐步开启 HARD BLOCK；不能直接 adopt。

与已有工具做法的关系：claude-ads 把 Claude Code 作为规范运行时，本身是 Agent Skills 形态；Cloudflare OS 的 Gatekeeper 自称增强版 MCP server，与预先挂上所有 MCP server 相对；ai-meeting-room 是 Claude Code 的一种落地用法，Claude Code 只做只读规划与复审，执行交给 Codex，用核准卡 + git 还原点夹住写权限；Strands Box 是 harness-agnostic 沙箱引擎，把操作系统隔离和 Dogwood 语义策略结合；MXC 是 harness-agnostic 沙箱化代码执行系统，也是 Windows 平台上策略驱动的执行层，agent 不能给自己追加权限；cc-desk-tunnel 不修改 Claude Code 本体，是官方 Claude Code 与官方 Agent SDK 之上的一层胶水，改变执行位置边界；ai-disk-cleanup 不引入新工具，是在 Claude Code / Cursor 之上加一层“磁盘审计 + 分层批准”的使用流程；Diffinery 把 GitHub 式协作搬到自己的 Cloudflare 账号，用独立 agent 账号、服务端硬限制、人审 PR、CI 全绿自动合并，补的是“谁执行、谁审批、什么条件才能落地”的协作边界；claude-code-auto-safeguard-prompt 是 Claude Code 等 harness 的二次审查层，在工具调用前由独立监控模型判断 allow/block，与 A-H 的权限、沙箱、审批、服务器强制限制互补，不是替代品。

## 依据的调研

- [AgriciDaniel/claude-ads](../research/radar/2026-10-01/580-agricidaniel-claude-ads.md)：值得一试，可按 README 原样安装 Claude Code 插件，先在一个广告平台上跑只读审计（/ads setup → /ads audit → /ads report → /ads next），把它当作「AI 操作 + 权限门控 + 确定性验证」的落地模板照搬；理由是原文给出了可直接复制的安装命令、完整命令表、评分阈值和写操作六道门控，但适用面限于付费媒体、效果只有仓库自述，因此建议小范围试而非全面采用。
- [cloudflare/cloudflare-os](../research/radar/2026-10-04/1062-cloudflare-cloudflare-os.md)：值得一试，先在本地跑 `pnpm run-local` 体验，重点把 Gatekeeper 的「按任务引入资源 + 有副作用动作延后批量审批」这套权限流程抄到自己的 agent 工作里，不要照搬整套平台；理由是它仍是 early access、自部署文档未完成，但权限与审批的具体做法可立即小范围验证。
- [sojei1989/ai-meeting-room](../research/radar/2026-10-08/1867-sojei1989-ai-meeting-room.md)：值得一试，建议小范围试装这套「只读规划 + 核准后写入 + 核准前 git 还原点」的双 AI 协作流程，因为它把权限边界、风险分级和回滚都做成了可直接照做的配置；但它是作者个人项目、只支持 macOS、界面仅繁体中文，且没有效果数据，所以先在一个无关紧要的小仓库上验证再决定是否长期用。
- [strands-agents/box](../research/radar/2026-10-08/1929-strands-agents-box.md)：值得一试，可在 Apple silicon Mac 上小范围试：按 README 给的下载/构建命令装起 Strands Box，用 box.toml 控直接访问、policy.dw 写默认拒绝策略，安全地把执行、读写和网络能力放开给 agent；但它自述仍是 Preview、只支持 macOS Apple silicon，策略与配置的具体写法全在外链文档里，原文只提供了安装和构建命令，所以先当可行性验证而非标准做法。
- [sun168567/cc-desk-tunnel](../research/radar/2026-10-08/1977-sun168567-cc-desk-tunnel.md)：值得一试，如果你的日常开发环境在 Windows 本机、又想让云端 Claude Code 直接在本机读写文件并执行命令，可以照 README 的部署流程在一台自己可控的云主机 + 一台 Windows 上小范围试；但它是个人维护、主要由 AI 编写、未经安全审计的工具，等于把本机的任意命令执行权交给服务器，只能自用、且必须先读安全须知并收紧端口与来源。
- [MXC - a sandboxed code execution system](../research/radar/2026-10-09/2229-mxc-a-sandboxed-code-execution-system.md)：值得一试，建议小范围试：在 Linux/macOS 上用 Node SDK 按 README 的片段以 egress 默认 deny + 超时启动容器，跑一段模型生成代码并回收 stdout，先验证越权用例确实被拦。理由是原文给出了可安装的 SDK、可复制的调用片段和 --debug/--audit 诊断命令，但完整策略 JSON 与接入 agent 主循环的做法未给出，故只到 try。
- [Mxc: Microsoft Execution Containers version 1.0.0](../research/radar/2026-10-11/2471-mxc-microsoft-execution-containers-version-1-0-0.md)：值得一试，值得在 Windows 11 上小范围试：把 MXC 的 Permissive→Learning→Enforcement 三模式流程用在自主编码/操作智能体上，先观测再收紧权限边界；理由是原文给出了明确的策略域、后端适用场景和三模式行为定义，可直接照着走，但没给任何配置示例，具体 schema 需去 SDK 仓库拿。
- [riza/ai-disk-cleanup](../research/radar/2026-10-26/7128-riza-ai-disk-cleanup.md)：值得一试，建议小范围试用：先取得仓库里对应语言的提示词文件（prompts/disk-cleanup.zh-CN.md），在必须人工确认工具调用的模式下，按“测量→三层报告→批准→逐步执行”的流程清理磁盘，不要用自动批准模式。理由是它给出了一套可照做的分层与权限边界流程，并有一次真实运行数据，但提示词正文与具体命令不在本次材料里，删除又不可逆，所以先备份、先小范围验证。
- [codician-team/diffinery](../research/radar/2026-10-26/7214-codician-team-diffinery.md)：值得一试，建议在一个非关键仓库上小范围试点,重点不是换掉 GitHub,而是复刻它的协作模式:为编码智能体开独立账号、用服务器强制限制权限、人类审批 PR、CI 全绿后自动合并;理由是 README 给出了可直接执行的部署/安装命令和一份明确的权限限制清单,但项目年轻、无托管服务、需自备 Cloudflare 付费账号,不适合直接作为团队唯一基础设施。
- [collinzrj/claude-code-auto-safeguard-prompt](../research/radar/2026-11-03/9947-collinzrj-claude-code-auto-safeguard-prompt.md)：值得一试，建议小范围试用：把该提示词作为独立监控模型的 system prompt，在工具调用前做 shadow 审查，再逐步开启 HARD BLOCK；理由是原文给出了较具体的风险分类、输入格式和用户同意规则，但缺少接入代码、完整规则和效果数据，不能直接 adopt。
