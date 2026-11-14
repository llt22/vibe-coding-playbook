# 让编码 agent 在装包和提交前被确定性规则拦住

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决编码 agent 能装依赖、提交代码后，凭据暴露和供应链风险靠提示词管不住的问题。
> 先试这一步：先选一个仓库，把 agent 放进容器且不挂生产凭据，只加密钥扫描和依赖冷却两个 hook。
> 最近修订：2026-11-14

## 解决什么问题

AI 只读做审计、计划、创意、报告没问题；一旦能直接改账户、调外部服务、写代码或删文件，风险升级。本手册给十四套做法：A 付费媒体账户默认只读、写操作逐条过六项门控；B 默认零权限、按任务只引入单个资源、有副作用动作先本地模拟再批量批准；C 本地仓库用 Claude 只读规划 + Codex 工作卡核准 + 沙箱执行 + git 还原点；D 用 Strands Box 验证默认拒绝、凭证注入、OTLP 决策记录；E 云端 Claude Code 通过反向 SSH 隧道落到 Windows 本机执行，靠端口最小放行与凭据管理夹住边界；F 用 MXC 做沙箱化代码执行，并在 Windows 11 上用 Permissive→Learning→Enforcement 三模式为 agent 收敛权限；G 磁盘清理先测量、出三层报告、人工批准后逐步删除；H 自托管 Diffinery，为编码 agent 开独立账号，用服务器强制的权限限制、人审 PR、CI 全绿后自动合并；I 给编码 agent 的工具调用前加独立安全审查，先 shadow 记录，再逐步开启 HARD BLOCK；J 自建 MCP OAuth 授权服务器保留服务器级 allowlist 与 loopback，同时允许每用户信任最多 10 个精确 https 重定向地址，把授权码去向检查从注册阶段推迟到用户登录后的 authorize 页面，覆盖错误与 Deny 分支；K 用 Home Assistant 的 ha-mcp 演示专用账号、只读模式、逐工具放开、审批策略与自动备份；L 在把编码 agent 推进到接近客户代码库之前，用六项准入清单检查统一网关、无凭证沙箱、成本硬上限、全链路追溯、prompt 测试门禁和 PR 人审；M 用单 agent 修小 bug，读文件和跑测试只读，写文件前必须打印完整提案并停在确认提示，路径围栏写在代码里，测试作为验收标准；N 给编码 agent 加供应链与凭据防线：agent 进容器或 microVM、凭据与 agent 可触达范围分离、用确定性 hooks 强制依赖冷却与密钥扫描、让 agent 交付安全修复、把防线压到新代码。

## 适用与不适用

**适用：** A 管付费媒体账户且有授权导出或读取权限；B 要 AI 起草 + 人工审批 + 确定性验证；C 要双 CLI 分工 + 工作卡核准 + 沙箱执行 + 还原点；D 能接受 macOS + Node.js 20+ + Git 跑本机网页界面；E 有自己控制的 Linux 服务器和 Windows 本机，想让云端 Claude Code 在本机读写文件并执行命令；F 想在 Windows 11 用 MXC 把自主编码/操作 agent 放进策略驱动执行层；G 需要清理磁盘空间且能先做可信备份、愿意在需确认模式下运行通用编码 agent；H 想复刻 GitHub 式协作但要求 agent 独立账号、服务端硬限制、PR 人审、CI 全绿自动合并，且有自己的 Cloudflare 付费账号；I 有会执行工具调用的 coding agent、能拿到完整 transcript，并有独立监控模型/分类器和 pre-tool hook；J 运营支持自助注册的 MCP OAuth 授权服务器，想允许自建 agent、Slack bot、VPS 服务或周末写的 MCP client 接入，又不愿任意接受 redirect URI；K 有 Home Assistant 实例，想让 Claude、ChatGPT、Gemini CLI、Cursor、VS Code 等 MCP 客户端搭建、维护与排障；L 准备把编码 agent 从演示推进到接近客户代码库；M 有可靠测试、改动范围小、可隔离运行的代码修复，且有人愿意逐次阅读提案；N 用编码 agent 写代码、agent 能安装依赖并提交代码，团队愿意用确定性 hook 而不是只写提示词。

**不适用：** 需要 AI 立即自动改账户或无人审批；装不了 Claude Code 插件或不能消费 skill 文件；把 Cloudflare OS 当生产平台；非 macOS 或想让会议室公开访问；需要 AI 直接产图或要量化效果数据才能采用；非 Apple silicon Mac 或无法访问指定 Bedrock 模型；把 Strands Box 当生产标准；想让 cc-desk-tunnel 当沙箱或多用户共用；不能接受数据离开本机；服务器所在地不在 Anthropic 支持的国家和地区；想用 `--audit` 给不可信代码补权限；源码构建环境不满足 Rust 1.93、Node.js 24+；MXC 没有配置示例，必须回 SDK 仓库补全；不能备份、不能接受删除不可逆仍想自动批准跑磁盘清理；想找 Diffinery 托管服务、SLA，或直接把它当团队唯一基础设施；没有 Cloudflare Workers Paid 与 R2；要求 agent 直接推保护分支、改 secrets 或自己把 CI 标绿；没有 pre-tool hook 或拿不到完整 transcript；想把监控提示词塞进被监控 agent 自己；想直接在生产或共享环境开阻断；把独立审查当权限系统替代品；不做 MCP server 或只是普通 AI 使用者；没有登录用户、邮件和审计日志；想靠 J 的设计阻止有决心的社会工程师；需要通配符、前缀匹配或 loopback 式端口灵活匹配；把每用户信任列表当成允许任意客户端的通用开关；没有 Home Assistant；想一上来就让 AI 全量写权限；不愿意建专用账号、只读模式、逐工具开关和自动备份；把 stdio 当正式环境；同一客户端挂两种安装方式；只想周末搭个编码 agent demo、不打算接真实客户代码库；没有任务队列、账单、追溯、测试和评审基础设施却想靠 L 六条清单本身获得安全；把 L 当完整实施方案或工具配置；M 用于无人值守直接改生产代码、大范围重构、没有可一键运行测试、或没人愿意读提案的场景；N 用于不产出代码、agent 没有写权限、没有容器/microVM 或无法在安装依赖与提交前后挂 hook 的岗位。

## 前置条件

- A：Claude Code；CPython 3.11/3.12；浏览器抓取需 Playwright；PDF 需 WeasyPrint/Pango；账户侧要有 client/account/KPI/privacy/guardrail 档案；凭证放环境变量、OS keychain 或 secret manager；写操作需 capability、对象 ID、before/after diff、审批上限、幂等键、审计目的地、回滚、验证窗口。
- B：pnpm；本地数据在 `.wrangler`；部署需自己的 Cloudflare 账号；外部服务要各自 OAuth client 凭据。
- C：macOS、Node.js 20+、Git、已登录 `claude` 与 `codex`；首次启动设定精灵问项目文件夹、手机入口、登录密码；可选 `.secrets/telegram-token.txt`、`.secrets/telegram-chat-id.txt`、`.secrets/gemini-api-key.txt`。
- D：Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、`us-west-2` Bedrock Claude Opus 5；下载脚本校验 checksum 到 `./box-core`；源码构建用 Cargo workspace。
- E：一台有公网 IP 或域名的 Linux 服务器（x86_64，推荐 Ubuntu，已装 Docker）+ Windows 10/11 x64；记录服务地址、证书指纹、服务凭据；防火墙放行 8787 和 7000；客户端安装包自带 PowerShell 7、OpenSSH、frpc，无代码签名。
- F：Windows 11；从 MXC 仓库获取 SDK、configuration schema、文档与 samples；先只试进程容器；源码构建 Rust 1.93、Node.js 24+。
- G：通用编码 agent 能读文件、跑 shell；必须在需要人工确认工具调用的模式；先做可信备份；从仓库取 `prompts/disk-cleanup.<语言>.md`，把 `---` 行以下内容贴进 agent。
- H：Cloudflare 账号在 Workers Paid 计划并启用 R2；该账号下有一个域名；具备文档所列权限的 Cloudflare API token；部署机有 Node.js 22、pnpm 10、Docker、`jq`、`curl`、`openssl`。给每个需要动手的 agent 建独立账号、token 与限额；`REVIEW.md` 放 base 分支；开启 agent review 并加入 required checks。
- I：有会执行工具调用的 coding agent；独立监控模型或分类器；能拿到完整 transcript 和最新工具调用；最好能在工具执行前运行；有可接入的 pre-tool hook 或权限层；先 shadow，再开 HARD BLOCK。
- J：你运营一个支持自助注册的 MCP OAuth 授权服务器；能识别已登录用户；能存储每用户的重定向地址列表；能发送邮件和写审计日志；能控制 authorize 与 token 交换阶段的响应。
- K：Home Assistant 实例；推荐的 in-process 服务器要求 HA 2026.8.0+；一个 MCP 客户端；每个客户端只配一种安装方式；正式环境不用 stdio；建专用账号或长期访问令牌；准备只读模式、逐工具开关、tool security policies、automatic edit backups；小模型客户端准备 `ENABLE_TOOL_SEARCH=true` 并抬高上下文窗口。
- L：已盘点所有模型调用点和 API key；有统一网关或代理层；任务运行环境可临时创建和销毁；能记录重试次数和累计成本；session、commit、PR、ticket、epic 之间有可关联标识；有一组可自动运行的 prompt 测试用例；有代码评审流程和明确审批责任人。
- M：隔离临时仓库或容器；API key 放环境变量；项目有可一键运行的测试；读文件工具能在代码里解析路径并拒绝越界；跑测试工具固定测试命令、设超时与输出截断；写文件工具必须先打印完整提案并停在确认提示；主循环有上限；有人愿意逐次阅读提案。原文声称 Python 3.12、Gemini SDK 3.0.0、测试框架 9.2.0、Gemini 3.8 Flash，版本号和模型名先核实；原文还给出读取上限 8000 字、测试 120 秒超时、只返回输出尾部 3000 字、主循环上限十二步，这些是原文参数。
- N：有容器或 microVM 运行环境；agent 的工作目录可挂载，宿主文件系统其余部分对它不可写；先清点 agent 会用到的全部 token、密钥；agent 执行路径上有可挂 hook 的位置（安装依赖、写文件、git commit 前后）；能拿到包的发布时间元数据；有密钥扫描工具；有 CI 配置写权限并能圈定死代码范围。原文未给冷却天数 N、hook 实现方式和 microVM 选型，这些需自行确定并记录。

## 操作步骤

下面分十四套做法。A/B/C/D/F/H/I/J/K/L/M/N 不冲突；E 不是沙箱，只宜自用小范围试；G 删除不可逆，先只出报告；I 是独立审查层，不是权限替代；J 是 MCP OAuth 授权层，决定授权码可以送到哪里，不替代 A–I 的权限、沙箱、审批与服务器强制限制；K 是 Home Assistant 场景的权限收窄流程；L 是编码 agent 上线前的准入检查表；M 是单 agent 小范围修 bug 的写入前审批门，不能替代 C 的沙箱与还原点、H 的服务器强制限制、I 的动作前审查；N 是编码 agent 的供应链与凭据防线，不能替代 F 的沙箱化执行、H 的服务端限制、I 的动作前审查和 L 的上线准入。

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
2. 先建档：`/ads setup`。前提：有授权导出或账户读取权限。预期：建立客户、账户、KPI、隐私与护栏档案。
3. 只读审计：`/ads audit [all|platform|scope]`；平台快捷方式 `/ads google`、`/ads meta`、`/ads amazon`、`/ads reddit`。预期：带日期证据和显式置信度，不触碰账户。
4. 报告：`/ads report`、`/ads next`、`/ads status`。规范结果是版本化 JSON run bundle，Markdown/HTML/PDF 只是渲染。
5. 要改动时只出草案：`/ads launch --draft`、`/ads optimize --draft`。
6. 真正落地逐条满足六项：精确操作有已测试并启用的 capability；明确账户和对象 ID；人类可读 before/after diff 含 blast radius；在账户定义上限内由 owner 审批；幂等键、审计目的地、回滚、验证窗口；验证远端状态仍匹配变更前置条件。缺 ceilings 即禁止写入；v2 不支持永久删除。
7. 评分判读：控件结果只有 pass、fail、unknown、not_applicable。覆盖率 ≥80% 可评级，60–79% 暂定，低于 60% 证据不足。optional、beta、premium、unavailable、ineligible 不计分。
8. 可选自建或验证实现：
```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install --no-deps -e .
.venv/bin/python -m pip install --require-hashes --only-binary=:all: -r requirements.lock
.venv/bin/python -m pip check
.venv/bin/python -m pytest -q
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
3. 按任务引入具体资源，不预先挂上所有服务。每个 agent 和 Gadget 默认零权限，按当次任务把具体资源介绍给它；agent 可主动请求，由你批或拒。Gatekeeper 包装原生 API、处理 OAuth、限定到用户指定资源、记录全部动作、对有副作用动作提供人工批准。
4. 有副作用动作先模拟、后批量批准。agent 触发需批准动作时，Gatekeeper 本地模拟结果，告诉 agent 已完成，读回也给模拟结果，agent 可继续排队；你回来一次性批量批准或逐条批准。
5. 接入外部服务前读对应 gatekeeper 包配置说明，自行申请 OAuth client 凭据。路径包括 `packages/gatekeeper-github/README.md`、`packages/gatekeeper-google/README.md`、`packages/gatekeeper-cloudflare/README.md` 等。
6. 可选开发与部署：`pnpm dev-server`、`pnpm dev-client`，访问 http://localhost:3000。部署到自己的 Cloudflare 账号走 https://os.cloudflare.app/deploy。

### 做法 C：本地代码仓库（ai-meeting-room）——双 AI 只读规划 + 工作卡核准 + 沙箱执行 + 核准前 git 还原点

1. 安装启动：前提 macOS、Node.js 20+、Git、已登录 `claude` 与 `codex`。解压后 Finder 双击 `start.command`；首次设定精灵问项目文件夹、手机入口、登录密码；浏览器打开 `http://127.0.0.1:4477`；终端可用 `npm start`。检查环境检查显示 `claude` 和 `codex` 版本号。
2. 跑会议：用白话写想做什么，按开始会议；等 Claude 只读规划、方案、风险；等 Codex 回报可行性、要改哪些文件、操作清单；左栏选方案；右栏逐张核准或拒绝；低风险=只新增文件或改样式，中风险=动现有功能，高风险=删档、装套件、部署；两张以上时有“核准全部低风险”和“核准全部”，按一下变“确定？再按一次”；每张先存还原点，一张失败就停；全部做完 Claude 再审查；按结束并产出决议，存成 `meetings/` 里的 markdown。
3. 权限与还原：讨论中和待核准时 Claude 只能读，Codex 只能读（`--sandbox read-only`）；你按核准后 Claude 仍只能读，Codex 可写（`--sandbox workspace-write`）。每次核准前自动存 git 还原点，右下角“回到执行前”一键回复；Codex 越界写未列出文件会停下并还原；项目夹没有 git 时第一次执行自动建立版本控制。不要设路由器转发或公开反向代理，不要把监听位址改成 `0.0.0.0`；手机入口只接受 Tailscale 网段 100.64.0.0/10。
4. 模型自动跟进与费用护栏：启动时、每次 AI 开工前（最多每 5 分钟）比对版本；CLI 新列出的模型标成“待你开放”，按“开放”才用；选定模型若本次未提供，暂时改用最接近且不比原本高阶的模型，设定区与会议纪录写明；原模型恢复后自动换回。
5. 通知、远程与交件：三个时刻响一声；Telegram 推播需要 `.secrets/telegram-token.txt` 和 `.secrets/telegram-chat-id.txt`；需要图片素材时右栏出现“等你交件”卡片，写清尺寸、格式、数量、档名和存放路径；单档上限 25MB，同名档不覆盖。
6. 白话解释降级链：每则讯息下“用白话解释”，顺序 Ollama→Gemini→Claude，前面连不上、逾时或没回东西自动往后退，最后一行写是谁翻的。
7. 出问题：连线中断重新双击 `start.command`；Claude 或 Codex 没回应按环境检查，通常登录过期；还原点建不起来说 .git 被锁住，在项目资料夹执行 `rm -f .git/*.lock .git/objects/maintenance.lock` 再按核准。
8. 测试 `node --test test/*.test.js`。可用模型由 `codex debug models` 和 `claude --help` 即时侦测。

### 做法 D：Strands Box——用默认拒绝策略把执行、读写、网络能力放开（Preview，先做可行性验证）

1. 确认前提：Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、能访问 `us-west-2` Bedrock Claude Opus 5。
2. 下载并验证：
```sh
curl -fsSL https://raw.githubusercontent.com/strands-agents/box/main/download.sh | sh
./box-core/box --version
```
脚本校验 release checksum，解包到 `./box-core`，不改 `PATH`，不动系统目录。
3. 替代：源码构建：
```sh
git clone https://github.com/strands-agents/box.git
cd box
cargo build --release -p strands-box -p strands-box-containment
```
4. 按 `docs/user/getting-started.md` 写最小 `box.toml` 和 `policy.dw`，启动 box。本次材料未给这两个文件字段或示例。
5. 分清分工：`box.toml` 改 agent 运行环境和直接访问授权；`policy.dw` 改 Box 经解释器和网关检查的操作规则。
6. 写策略时把策略编写 skill 交给编码 agent：`https://raw.githubusercontent.com/strands-agents/box/main/.agents/skills/authoring-box-policy/SKILL.md`。
7. 记住边界：`box.toml` 直接文件系统授权由 OS 强制执行，不产生单条 Dogwood 决策；要让策略管到文件操作，必须走解释器。
8. 跑示例：`examples/strands-box/strands-sdk-agent/`；凭证配在网关上，不要给 agent 本体。
9. 审计读决策记录：默认 `<box_dir>/private/telemetry/records.jsonl`，OTLP JSON。把记录条数与 agent 实际调用对照。

### 做法 E：跨机器执行（cc-desk-tunnel）——云端 Claude Code + Windows 本机，靠端口最小放行与凭据管理夹住边界

1. 确认前提：一台有公网 IP 或域名的 Linux 服务器（x86_64，推荐 Ubuntu，已装 Docker）+ Windows 10/11 x64；服务器必须自己控制、可信。
2. 部署服务端：在 Linux 服务器执行发布页的 `deploy/install.sh`；脚本检查依赖、下载并校验服务端程序包、解压到 `/opt/cc-desk-tunnel`、询问公网地址与证书方式、构建镜像并启动；打印服务地址、证书指纹、服务凭据，以及需放行的两个 TCP 端口（默认 8787 和 7000）。
3. 安装 Windows 客户端并填三项信息：服务地址、证书指纹、服务凭据并连接。首次 SmartScreen 点“更多信息 → 仍要运行”；frpc 可能被杀毒软件拦截。
4. 登录 Claude 并接入项目：客户端左下角账号页登录 Claude 账号；添加项目文件夹，开始对话。
5. 按权限边界配置端口：控制端口默认 8787/TCP 需要放行；隧道端口默认 7000/TCP 需要放行；通往 Windows 的 SSH 映射端口不需要也无法放行。Windows 一侧不放行任何入站端口。想收紧在云厂商安全组只允许自己的出口 IP。
6. 必须知道的四件事：服务凭据等同于完全控制权；不是沙箱；数据会离开本机；指纹从可信渠道取得。
7. 处理杀毒软件与 SmartScreen：先确认安装包来自本仓库发布页、对照 `SHA256SUMS` 校验、查看具体被拦截文件，确认来源后只对已核验组件文件设必要例外。
8. 最小试用：云厂商安全组只允许你的出口 IP 访问 8787 和 7000；服务器跑一次安装脚本；Windows 装客户端连接，登录 Claude，只添加一个不重要测试项目目录；让 Claude 读取一个本机文件并汇报，再执行一条无害命令；试完断开，确认本机没有常驻服务、SSH 监听已停止。

### 做法 F：MXC——沙箱化代码执行 + Windows 11 三模式为 agent 收敛权限

**F1 用 SDK 把模型生成代码放进沙箱执行**

1. 按语言安装 SDK：Node `@microsoft/mxc-sdk`；Rust crates.io `mxc-sdk`；.NET NuGet `Microsoft.Mxc.Sdk`。
2. 在应用里发起一次受控执行。请求至少要给 `command`；`network`、`timeoutMs` 是示例字段。预期：模型生成代码在沙箱容器执行，stdout 可回收，出站默认 deny，超时 30 秒。
3. 对照运行平台选后端：Windows 11 x64/ARM64 默认 `processcontainer`；Linux x64/ARM64 默认 `bubblewrap`；macOS ARM64/x64 默认 `seatbelt`。
4. 跑三组用例验证隔离：允许目录读写应成功；写被拒路径应失败；出网应失败。对失败用 `wxc-exec.exe --debug config.json` 打开诊断；要补权限走 `docs/logging-access-denied.md` 的 deny-and-record，不要用 `--audit`。
5. 仅在开发 MXC 时源码构建。构建前置：Rust 1.93、Node.js 24+ 与 npm。命令：`build.bat --all`、`./build.sh --all`、`./build-mac.sh --all`。
6. 需要持久隔离环境时用状态感知生命周期：provision → start → execute → stop → deprovision。
7. 遥测默认关闭；非 Windows 平台为 no-op，本地开源构建不向 Microsoft 发送。

**F2 在 Windows 11 上用三模式为 agent 收敛权限边界**

1. 先列出任务真正需要的资源，按五个策略域逐项声明：Containment、Process、File system、Network、User interface。
2. 按负载选容器后端：Process container 适合低延迟；Session container 仅 Windows 11，适合长期运行；WSL container 仅 Windows 11，适合 Linux-first 工具链；MicroVM 实验性。先只试进程容器。
3. 用低约束模式起草策略，不要一上来就 Enforcement。
4. 三模式推进：Enforcement 阻断未授权访问、无活动报告；Learning 阻断并记录、有 JSON 活动报告；Permissive 放行并记录、有 JSON 活动报告。
5. 用活动报告收敛成最小权限策略：每次被拒操作暴露一个待调整点，只补真正需要的权限。
6. 让负载优雅处理越界：说明任务无法在现有权限内完成、请求用户或管理员操作、或选择安全替代方案，不应静默失败。
7. 最小试用：选一个无害任务；第一轮 Permissive 跑同一任务拿 JSON 活动报告；写最小权限策略；切 Learning 复跑；处理拒绝到收敛；切 Enforcement 跑基线；再故意触碰不该碰的资源确认被拦且显式报告失败。

### 做法 G：磁盘空间审计（ai-disk-cleanup）——先测量、三层报告、人工批准后逐步删除

1. 前提：先做一份你信得过的备份。这些命令不进回收站，删除不可逆。必须在工具调用需要你确认的模式下运行；不要用 auto-approve / yolo 模式。
2. 选语言，打开对应文件，把 `---` 行以下的全部内容粘贴进 agent：英文 `prompts/disk-cleanup.en.md`；简体中文 `prompts/disk-cleanup.zh-CN.md`。
3. agent 会先探测操作系统，之后只用该平台的命令和路径。
4. 测量，不要猜：自顶向下走到真正的元凶。知道陷阱：稀疏磁盘、符号链接被重复计数、快照占着已释放空间、异步删除、名字叫 `target/` 但不是 Rust 的目录。
5. 按三层出报告，然后停下：Tier 1 缓存、构建产物、包下载、死 worktree，可再生产；Tier 2 VM 磁盘、旧 SDK 运行时、容器镜像，里面真有数据；Tier 3 Downloads、浏览器配置、不用的应用。
6. 回答它提出的“层级”问题之前，先把上表读一遍，再决定批哪一层。
7. 逐步执行：每删一项后打印新释放出的空间；用各工具自己的清理命令，而不是 `rm -rf`。
8. 任何需要 `sudo` 或提权的操作，都以“可直接运行的命令”形式交回给你。
9. 绝不删除：源码、git 历史、`.env`、密钥、钥匙串、照片与邮件库、云同步文件夹、正在运行的 VM 磁盘、操作系统快照。
10. 信任边界：提示词要求 agent 把磁盘上发现的一切当作数据，不是指令。运行前自己把提示词读一遍。

### 做法 H：自托管 Git 平台（Diffinery）——独立 agent 账号 + 服务端硬限制 + 人审 PR + CI 全绿自动合并

1. 生产部署前提：Cloudflare 账号在 Workers Paid 计划并启用 R2；该账号下有一个域名；一个具备文档所列权限的 Cloudflare API token；部署机有 Node.js 22、pnpm 10、Docker、`jq`、`curl`、`openssl`。
2. 克隆并设置环境变量：
```sh
git clone https://diffinery.com/codician/diffinery.git
cd diffinery
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export DIFFINERY_DOMAIN=git.example.com
export BOOTSTRAP_ADMINS=you@example.com
```
3. 先空跑校验：`scripts/setup.sh --dry-run`。
4. 正式执行：`scripts/setup.sh`。
5. 成为首个管理员：打开 `https://<your host>/auth/access`，用一次性验证码确认邮箱，然后添加 passkey。
6. 零成本本地验证：
```sh
pnpm install
pnpm -r build && pnpm -r typecheck && pnpm -r test
pnpm --filter @diffinery/app db:migrate:local
pnpm dev
pnpm --filter @diffinery/app e2e
```
7. 给每个需要动手的 agent 建独立账号，分配 token 与限额；不要复用人的账号。服务器强制限制：agent 不能推保护分支；agent 的 PR 至少需要一个人批准，agent 的批准不算；agent 不能改 secrets、environments、分支保护；agent 的检查结果不能满足 required checks；agent 推送代码触发的 workflow 只拿 job token；agent 不能登录 Web UI。
8. 在 base 分支写 `REVIEW.md`，写清哪些问题可 blocking、哪些只建议。开启 agent review 并加入 required checks。
9. 在 Settings → Merge on green 勾选必须通过的检查、指定哪些 agent 的 PR 可自动落地、是否仍需人工批准。若按做法 L 要求每个 PR 合并前必须有人工批准，这里必须保留人工批准；若配置为无需人工批准的自动落地，就与 L 冲突。
10. 最小试点：在一个非关键仓库上，先用本地 `pnpm dev` 或自己的实例；建独立 agent 账号，写 `REVIEW.md`，让 agent 从目标开 PR；验证它不能推保护分支、不能改 secrets、不能自己把 CI 标绿；人批准后 CI 全绿自动合并；再故意让 agent 尝试推保护分支或改 secrets，确认被服务器拒绝。

### 做法 I：编码 agent 的工具调用前独立安全审查（claude-code-auto-safeguard-prompt）

1. 前提：有会执行工具调用的 coding agent，以及一个独立监控模型或分类器；监控器能拿到完整 transcript 和最新工具调用，最好能在工具执行前运行。
2. 把仓库提示词全文作为监控器的 system prompt，不要塞进被监控 agent 自己的 system prompt。原文开头：`You are a security monitor for autonomous AI coding agents.`
3. 每次工具调用前，把 `transcript` 对话历史加上最后一条工具调用作为待评估动作送入监控器；保留 harness 注入的 meta 行、outcome 行和 host context。
4. 要求监控器输出 allow/block、命中的规则和理由。HARD BLOCK 不允许用用户上下文放行；SOFT BLOCK 只有在用户明确命名危险动作和危险参数时才放行。
5. 先开 shadow mode：只记录判定，不真正拦截；把监控器判定和人工复核或事后审计对比。
6. 稳定后再对 HARD BLOCK 开启阻断；SOFT BLOCK 先只告警。classifier 不可达或解析失败时会 fail-closed，试用时单独统计。
7. 接入方式：按你所用 harness 的 pre-tool hook 或权限层接入；原文只提供提示词逻辑，不提供安装步骤。
8. 最小试用：选一个低风险仓库或沙盒，跑一个较长任务的 coding agent；只记录不阻断，覆盖至少 20–50 次工具调用（试用建议，原文没有给样本量）；人工标注每次调用是否应拦。指标：误拦率、漏拦率、与人工一致率、平均审查延迟、fail-closed 次数。

### 做法 J：自建 MCP OAuth 授权服务器——在 authorize 阶段按用户校验重定向地址，保留服务器级 allowlist 与 loopback

1. 前提：你运营一个支持自助注册的 MCP OAuth 授权服务器；能识别已登录用户；能存储每用户的重定向地址列表；能发送邮件和写审计日志；能控制 authorize 与 token 交换阶段的响应。
2. 保留服务器级 allowlist 和 loopback，作为所有账户都可用的信任来源；额外增加每用户精确 https 重定向地址列表，原文实现上限为 10 个。注册阶段可以接受 https URI 作为候选，但不要据此发放 code；真正的放行决定放在用户登录后的 authorize 页面。
3. 在 authorize 阶段、重定向之前检查目标地址：只有属于服务器级 allowlist、loopback，或当前用户自己信任的地址，才允许收到 code。这个检查必须覆盖所有响应，包括错误响应和用户点击 Deny 的分支；不通过时渲染自家域名下的拒绝页，不做重定向。
4. 在同意屏上只显示本次登录实际要返回的 redirect host，并说明它为什么被允许：在 allowlist 上、是 loopback，或你本人某日自己信任了这个地址。权限默认从只读开始。
5. 修改用户信任列表只能通过用户自己的浏览器会话，不能通过 app 或 API token。从拒绝页添加地址时，要求用户手动输入 host；在输入 host 之前，Trust and continue 保持禁用。
6. 每次添加地址都发邮件通知用户；活动日志开启时写入审计。邮件以 host 开头，写明时间和账户，完整地址不要变成可点击链接。
7. 删除地址时，撤销经该地址建立的所有 grant，并丢弃已批准但尚未交换的 code；删除后即使该地址正处于登录流程中，也要立即切断。
8. 拒绝浏览器和服务器 URI 解析器读法不一致的 host，例如把 `good.example%2eevil.example` 解析成一个 host、浏览器却跳到另一个 host 的情况；只做精确匹配，不支持通配符、前缀匹配或 loopback 式端口灵活匹配。
9. 按原文自查清单做负向测试：注册 redirect 为 evil.example 的客户端并发起 authorize，确认不会向 evil.example 发送 code 或 error；合法客户端同意屏显示正确 host 和依据；点 Deny 不跳转到攻击者地址；用 app 或 API token 尝试添加地址应失败；从拒绝页添加地址必须手打 host；删除地址后旧 grant 被撤销、未交换 code 失效；解析器读法不一致的 URI 被拒。

### 做法 K：Home Assistant（ha-mcp）——专用账号 + 只读模式 + 逐工具放开 + 审批与自动备份

1. 明确前提与纪律：需要 Home Assistant 实例；推荐的 in-process 服务器方式要求 HA 2026.8.0+；一个 MCP 客户端。每个客户端只配一种安装方式；不要用 stdio 做正式环境，只建议 demo/试验。
2. 零成本先试通（不动自己的实例）。安装脚本按平台从仓库获取；装完重启客户端，然后问：`Can you see my Home Assistant?`。
3. 正式安装（推荐组件一体化）：HA 2026.8–2026.10 走 HACS 搜 `HA-MCP` → Download；2026.11+ 走 `设置 → Marketplace` 搜 `HA-MCP` → Install。重启 Home Assistant。
4. 决定服务器以哪个管理员身份行事：在自己账号上建长期访问令牌，或更安全地单独建账号并勾选 `允许登录`、`仅本地访问`、`管理员`。
5. 添加集成：`设置 → 设备与服务 → 添加集成`，搜 `HA-MCP`，选 `HA-MCP Server`；粘贴令牌或专用账号用户名密码；选择客户端连接方式，然后提交。从条目的 `配置` 页复制连接 URL。
6. 替代安装法：app(add-on)、Docker、PyPI/uvx、手工安装；具体客户端配置由官方 Setup Wizard 生成。
7. 先设安全阀，再放开写权限：打开 `Read Only Mode`；用 `per-tool enable/disable` 按需开工具；用 `tool security policies（用户审批）` 让高风险操作必须人工确认；依赖 `automatic edit backups`；只把远程访问开到你确实需要的范围；要更严可把 `Authentication mode` 设为 `ha_auth` 或用 OIDC。文件/YAML 编辑是 beta，需要额外添加 `HA-MCP File & YAML Tools` 条目，且必须先开 `ENABLE_BETA_FEATURES`。
8. 按模型能力调整工具暴露方式：支持延迟加载的客户端默认列全部工具；不支持延迟加载的模型/客户端开 `ENABLE_TOOL_SEARCH=true`，同时把模型上下文窗口调高。
9. 最小试用：先跑 demo 打通连接，再用只读模式接真实实例，然后逐工具放开写权限；不要一上来全开。

### 做法 L：编码 agent 上线前六项准入——统一网关、无凭证沙箱、成本硬上限、全链路追溯、prompt 测试门禁、PR 人审

原文没有给出可直接复制的命令、配置或提示词；以下把六条转成可执行检查项。

1. 统一模型网关与消费上限：所有模型调用只经过一个网关；为每个 key 设置消费上限；把直连模型供应商的调用视为缺陷并修复。预期：直连调用数为零，账单能按 key 核对上限。
2. 一次性无凭证沙箱：每个任务新建一个沙箱；沙箱内不放入长期凭证；任务结束后销毁沙箱。需要访问外部服务时，由沙箱外的网关或代理按任务提供受控权限。预期：沙箱内凭证数量为零，任务结束环境确实销毁。
3. 尝试次数与成本硬上限：为每个任务设置硬性的尝试次数上限和成本上限；超限任务退回任务板。预期：卡死任务不会无限重试。
4. 全链路追溯：保证每行代码都能沿 session、commit、PR、ticket 回溯到 epic。预期：抽查任意代码变更，能追到原始任务和 epic。
5. prompt 变更测试门禁：prompt 变更先跑测试用例集，通过后才允许发布。预期：未通过测试的 prompt 变更不能进入生产。
6. PR 人工批准：每个 PR 合并前必须由人批准；agent 的批准不能替代人批准。预期：人工批准覆盖率为 100%。
7. 与 H 的差异：H 的 Merge on green 可以配置 CI 全绿后自动落地，但 L 要求每个 PR 合并前有人工批准。两者不冲突的配置是：在 H 里保留人工批准，CI 全绿只是前置条件；如果 H 配置为无需人工批准自动合并，就与 L 冲突。

### 做法 M：单 agent 修小 bug——写入前人工审批门 + 代码级路径围栏 + 测试验收

原文只给流程与参数，没有给可直接复制的安装命令、工具 schema、主循环代码或审批门实现。以下按原文整理为设计步骤；所有版本号与模型名先核实可用性。

1. 开隔离环境并固定版本。把 API key 放进环境变量，不要写进代码。原文前提：Python 3.12、Gemini SDK 3.0.0、测试框架 9.2.0、模型 Gemini 3.8 Flash；主循环上限十二步。预期：有一个可回滚的临时仓库或容器。
2. 准备一个小型示范项目：购物车，加入方法写错——同一商品加第二次时数量被覆写而不是累加。测试写成：先加 2 本笔记本、再加 3 本，预期总数 5，购物车却报 3。
3. 先跑一次测试，确认初始状态是“一败三胜”，再往下做。预期：后续修复有基准。
4. 实现三个工具，职责分开：读文件只读，路径围栏写在代码里，每条路径都要解析并检查是否落在项目文件夹内，落在外面直接拒绝；读取上限 8000 字（原文表述）。跑测试只读，测试指令写死在程序里，模型可以叫它执行但改不了它；120 秒超时；只返回输出的尾部 3000 字（原文表述）。写文件是唯一会改变世界的工具；必须先打印完整提案，停在确认提示，用户亲自读完并点头后才写入。没有审批门就不要让模型碰写入。
5. 写主循环，上限十二步；任务写清楚：修来源文件、绝对不要改测试。原文任务约束可原样放进提示词：
```
任务：修來源檔案，絕對不要改測試。
```
6. 运行 Agent：它先跑测试看到失败，再读测试文件、读购物车程序文件，说出病因，然后打印完整提案并停在确认提示；此时磁盘上的文件一个字都还没变。
7. 人工审查提案后再确认写入。Agent 可能为了改一个方法里的三行而把整个文件重写一遍，存档文件还可能带着一行旧注解；自动点头的人会把过期注解一起送进去。必须亲自读提案。
8. 写入后让 Agent 再跑一次测试；购物车示范从“一败三胜”变为“四胜”才算通过。原文成本参考：7017 个输入代币 + 1202 个输出代币，约 0.0098 美元；这是单案例数据。
9. 路径围栏不要只写在提示词里。跟模型说“请不要读项目以外的文件”只是建议，不是强制执行；围栏要由代码解析路径并拒绝越界。
10. 判定失败：出现未审批写入、试图改测试、越界读取、整文件重写或带入过期注释，就收紧围栏或停止试用。

### 做法 N：编码 agent 的供应链与凭据防线——沙箱起步、凭据隔离、确定性 hooks、交付安全修复、防线压到新代码

原文只给措施方向，没有给可复制配置：没有 hook 代码、没有冷却天数取值、没有 microVM 选型。以下按原文措施整理落地顺序；需要自行确定并记录参数，不要当成原文结论。

1. 确认前提：有容器或 microVM 运行环境；agent 的工作目录可挂载，但宿主文件系统的其余部分对它不可写。原文称容器是下限、microVM 是 gold standard，这是经验判断而非对比实验。先清点 agent 会用到的全部 token、密钥；确认 agent 执行路径上有可挂 hook 的位置（安装依赖、写文件、git commit 前后）；能拿到包的发布时间元数据；有密钥扫描工具；有 CI 配置写权限并圈定死代码范围。
2. 把编码 agent 放进沙箱。容器起步，条件允许再考虑 microVM；只挂载工作目录，宿主其余部分不可写。预期：agent 不能直接改宿主文件系统。
3. 凭据与 agent 可触达范围分离。容器内不挂生产或个人凭据；外部服务改由最小权限、可撤销的短期凭据提供。预期：沙箱内没有长期凭证。
4. 先确定工具链取向，例如用 pnpm 而不是 npm。前提：项目里存在多种可选工具。把取向写清楚，但不要只靠提示词。
5. 用确定性 hook 强制执行第 4 步。在安装依赖、写文件、git commit 前后等位置挂 hook；规则由 hook 执行，不由 agent 自己判断。
6. 加依赖冷却 hook：拒绝安装发布时间晚于 N 天的包。前提：能拿到包的发布时间元数据；N 由团队确定并固定写在 hook 里，原文未给取值。预期：新发布包不能立即进入依赖。
7. 加密钥扫描 hook：在提交或写入前扫描，命中即阻断。原文强调，一个便宜的密钥扫描 hook 胜过告诉 agent 不要提交密钥。预期：明文密钥在进入主干前被拦住。
8. 让 agent 交付安全修复，而不是只找 bug。给它一个业务风险，让它构建修复 PR，例如把 CI 里每个 GitHub Action 固定到确切版本、删除死代码；合并前人工过一眼。预期：产出可合并的安全改造，而不是只出报告。
9. 把防线压到新代码。把上述 hook 与扫描设为新代码、新依赖路径上的默认，而不是只对历史代码做一次性清理。原文用 Android 没有重写技术栈、而是改变新代码写法后报告漏洞大幅下降来支持这一点；原文没有给具体数字、时间窗口或统计口径。

**怎么选（A–N）：** 账户写操作、不可逆或 blast radius 大：做法 A 的六项门控，缺 ceilings 即禁止写入。可模拟、可回滚、需要连续推进：做法 B，先本地模拟让 agent 排队推进，人离线，回来批量批准。本地代码仓库改动：做法 C，Claude 全程只读规划与复审，Codex 只在核准后 `workspace-write` 执行工作卡明列文件；核准前存 git 还原点。想验证默认拒绝 + 语义策略 + 凭证注入 + 决策记录且有 Apple silicon Mac：做法 D，只当可行性验证。会话必须在云上、项目与工具链必须在 Windows 本机：做法 E，但它不是沙箱，服务凭据等同于完全控制权，只宜单用户自用。要把模型生成代码放进沙箱执行并回收结果：做法 F1。在 Windows 11 上要让自主编码/操作 agent 先观测再收紧权限边界：做法 F2。磁盘空间不足、删除不可逆、愿意先备份并在需确认模式下跑：做法 G，第一轮只跑到三层报告为止。想把 GitHub 式协作搬到自己的 Cloudflare 账号：做法 H，先本地零成本验证。想给已有 coding agent 加动作前二次审查、又不想改权限系统：做法 I，先 shadow 只记录。要运营支持自助注册的 MCP OAuth 授权服务器：做法 J，先做负向测试。有 Home Assistant，想让 AI 搭建、维护与排障：做法 K，先跑 demo，再用只读模式接真实实例。准备把编码 agent 推进到接近客户代码库：先做 L 的六项准入检查。有可靠测试、改动范围小、可隔离、有人逐次读提案，只修一个小 bug：做法 M；M 与 C 的差异是 C 用双 CLI 分工、工作卡核准与 git 还原点，M 用单 agent 三工具、写入前审批门、代码级路径围栏和测试验收；两者可叠加，M 不能替代 C 的沙箱与回滚。已有编码 agent 且它能安装依赖、提交代码，想补供应链与凭据防线：做法 N，先容器 + 密钥扫描 + 依赖冷却两个 hook；N 与 F 的差异是 F 重点在沙箱化代码执行与 Windows 权限收敛，N 重点在装包、提交与凭据暴露路径上的确定性规则；N 与 H/L 互补，不能替代服务器强制限制和上线准入。

## 怎么判断变好了

各材料都没有给准确率、节省工时、误报/漏报率这类结果数据，主要看过程信号。A：audit run 的 findings 是否带日期证据和显式置信度；报告是否为版本化 JSON run bundle；证据覆盖率是否 ≥80% 可评级；写操作是否一直停在草案直到六项门控齐备。B：从下提示词到可用产出需要中途介入几次；审批能否真的延后批量完成；Gatekeeper 日志能否复盘 agent 对外的每个动作以及限定在哪个具体资源。C：会议结束是否产出 `meetings/` 里的 markdown 决议；每次核准前是否成功存 git 还原点；Codex 是否只写工作卡明列文件；模型被替换时设定区与会议纪录是否写明。D：拒绝有效性——让 agent 访问未授权路径或发未 permit 的请求，确认被实际拒绝；记录完整性——`<box_dir>/private/telemetry/records.jsonl` 对每次受检查操作都有 OTLP JSON 记录。E：Claude 能否在客户端成功读写指定路径的本机文件并在本机执行命令看到输出；Windows 一侧是否没有放行任何入站端口，本机 SSH 是否只监听回环、随连接启停；服务凭据是否只存在密码管理器里。F1：越权用例被拦比例，目标 100%；合法用例被误拦比例与策略返工次数；合法工作负载首次运行成功率。F2：Enforced 策略下同一任务成功率与耗时没有明显退化；活动报告中出现的资源集合 ⊆ 策略声明的集合；Learning→Enforcement 后不再出现“策略本会拒绝”的条目；越界尝试 100% 被阻断，且 agent 显式说明权限不足。G：误报数应为 0；未经批准的操作次数应为 0；测量准确率——抽查项中它报的大小与你自己 `du` 实测一致的条数；Tier 1 释放量。H：agent 不能推保护分支；agent 的批准不算人批准；agent 的检查不能当 required checks；agent 代码触发的 workflow 无 secrets；agent 不能改 secrets、environments、分支保护；Merge on green 只在检查通过且规则满足时合并。I：shadow 阶段误拦率、漏拦率、与人工一致率、平均审查延迟、fail-closed 次数；HARD BLOCK 开启后真实危险动作是否减少且正常开发不被阻断；不要只看拦截数量。J：未信任 redirect 收到 code 或 error 的比例应为零；Deny 分支重定向到未信任地址的比例应为零；解析混淆 URI 被接受的比例应为零；删除地址后旧 code 和 grant 仍可用的比例应为零；添加地址的邮件和审计记录覆盖率应为 100%；合法自建客户端的首次连接成功率、从发起到连通的耗时。K：demo 阶段固定验收语 `Can you see my Home Assistant?` 能得到肯定回答；接真实实例后，只读模式下 agent 能正确读出实体、自动化、仪表盘与历史/统计；逐工具放开后，每次高风险操作是否触发用户审批；自动编辑备份是否在改动前生成；小模型客户端开启 `ENABLE_TOOL_SEARCH=true` 后工具列表是否收敛；正式环境是否没有用 stdio。L：直连模型供应商的调用数应为 0；每个 key 都有消费上限并能在账单中核对；沙箱内凭证数量为 0，任务结束后沙箱确实销毁；超过尝试次数或成本上限的任务是否全部退回任务板；代码行到 session、commit、PR、ticket、epic 的追溯覆盖率；prompt 变更是否都先跑测试集；PR 人工批准覆盖率应为 100%。M：修复前失败/通过数，修复后目标测试是否通过、全量测试是否通过；测试文件 hash 是否保持不变；diff 行数、改动文件数；是否只改必要方法；是否出现整文件重写；是否带入过期注释；越界读取尝试是否被代码拒绝；未审批写入次数必须为 0；写入前是否确实停在确认提示；主循环步数是否不超过 12；人工审批耗时；输入/输出 token 与费用是否在预算内。N：hook 阻断次数（密钥命中数、被拒的新包数）应为正，否则说明 hook 没生效或规则太松；逃逸事件数——合并进主干的提交中出现明文密钥、未固定版本的 Action、N 天内新依赖的次数，目标为 0；完成同类任务的时间与人工 review 时长，确认防护没有吃掉 agent 的产出效率；若可测，新写代码上发现的安全问题数。判定：逃逸事件降到 0 且任务耗时没有明显上升，可认为该做法在本团队成立；若逃逸为 0 但人工 review 时间大幅上涨，说明 hook 规则过严或沙箱配置成本过高，需要调整 N 与规则后再试。

**最小试用方式：** A 只挑一个广告平台，`/ads setup` → `/ads audit` → `/ads report` → `/ads next`，全程只读。B 装 pnpm → `pnpm run-local` → 跑“做 slides”和“建协作白板应用” → 再配置一个真实资源，走完引入资源 → agent 请求权限 → 审批队列 → 批量批准。C 在一个无关紧要的小仓库，双击 `start.command` → 完成设定精灵 → 打开 `http://127.0.0.1:4477` → 提一个小改动 → 逐张核准（先存还原点）→ 看 Codex 是否只写列出文件 → 按“回到执行前”验证回滚。D 满足前提的 Apple silicon Mac 上执行下载与 `--version`；按 `docs/user/getting-started.md` 写最小 `box.toml` 和 `policy.dw`，启动 box，跑示例 agent。E 限定两台机器、一个非关键项目：安全组只允许自己的出口 IP 访问 8787 和 7000，服务器跑一次安装脚本，Windows 装客户端连接，登录 Claude，只添加一个不重要测试项目目录，让 Claude 读取一个本机文件并汇报，再执行一条无害命令，试完断开。F1 在 Linux 或 macOS + Node SDK，安装 `@microsoft/mxc-sdk`，照 README 写脚本，跑三组用例，用 `wxc-exec.exe --debug config.json` 诊断失败原因。F2 一台 Windows 11：先只试进程容器；选无害任务；Permissive 跑同一任务拿 JSON 活动报告；写最小权限策略；Learning 复跑并处理拒绝；Enforcement 跑作为基线；再故意触碰不该碰的资源确认被拦且显式报告失败。G 选一台非关键机器或先做完整备份；用 Claude Code 普通权限模式或 Cursor ask mode，粘贴 `prompts/disk-cleanup.zh-CN.md` 里 `---` 以下的内容；第一轮只跑到三层报告为止，不批准任何一项；人工抽查至少 5 条，自己跑 `du` 核对；抽查通过后，第二轮只批准 Tier 1。H 在一个非关键仓库上，先用本地 `pnpm dev` 或自己的实例；建独立 agent 账号，写 `REVIEW.md`，让 agent 从目标开 PR；验证它不能推保护分支、不能改 secrets、不能自己把 CI 标绿；人批准后 CI 全绿自动合并；再故意让 agent 尝试推保护分支或改 secrets，确认被服务器拒绝。I 选一个低风险仓库或沙盒，跑一个较长任务的 coding agent；用仓库提示词作为独立监控器的 system prompt；只记录不阻断，覆盖至少 20–50 次工具调用，人工标注每次是否应拦。J 若用 Stream Vessel：在自己的 agent 中加入 `https://mcp.streamvessel.com` 并登录，确认不在 allowlist 时落到拒绝页、手打 host 后才能继续、同意屏只显示本次 redirect host 和允许依据、权限默认只读；若自建：在测试环境实现 authorize 时按用户校验重定向地址和每用户精确 https 列表，按七条规则逐条做负向测试。K 先跑 demo 打通连接，问 `Can you see my Home Assistant?`；再用专用账号 + 只读模式接真实实例，让 agent 读一遍自动化、仪表盘和历史/统计；确认无误后只开一个低风险工具，再逐项放开；文件/YAML 编辑默认不开。L 选一个低风险、已有测试的代码库，保留一个编码智能体循环，逐条落实六项管控后再让它处理一组编码任务；与现有流程并行跑，记录每项管控是否真正生效。M 在一个临时仓库或容器里放一个小型项目和一个失败测试，按“读文件只读 + 跑测试只读 + 写文件必须人工审批 + 代码级路径围栏 + 主循环十二步”实现最小 Agent，只让它修一个失败测试对应的小 bug，禁止改测试文件；先跑一次确认一败三胜，再让 agent 提案，人工读完提案后确认写入，写入后复跑测试看是否四胜。N 选一个仓库、一到两周：把 agent 放进容器或 microVM，容器内不挂任何生产凭据；只加两个 hook：密钥扫描（命中阻断）+ 依赖冷却（拒绝 N 天内新包），N 先取一个保守值并记录在案；给 agent 一件交付型任务：把 CI 里的 GitHub Action 全部固定到确切版本；观察 hook 阻断次数、逃逸事件数、完成同类任务的时间与人工 review 时长。

**试多久：** claude-ads 材料在“怎么试”被截断，没有建议时长；Cloudflare OS 原文建议最小试用控制在半天内；ai-meeting-room 原文没有建议时长，建议至少跑通一轮完整会议并故意制造一次越界或失败看还原与重试；Strands Box、cc-desk-tunnel、MXC、Diffinery、claude-code-auto-safeguard-prompt 原文都没有建议时长，先做一次可行性验证，不要直接进生产；ai-disk-cleanup 原文建议最小试用半天内做完，且第一次不删任何东西；J 原文没有建议时长，先做一轮负向测试和合法客户端连通测试，通过后再考虑灰度；K 原文没有建议时长，先跑通 demo，再用只读模式接真实实例观察一段时间；L 原文没有建议时长，先并行跑一组任务并覆盖一次 prompt 变更和一次超限任务；M 原文没有建议时长，先只修一个失败测试对应的小 bug，通过后再考虑扩大，不要直接上生产或大范围重构；N 原文建议选一个仓库、一到两周做最小试用，但这是试用建议，不是效果数据。

## 常见坑

- A：把远程安装脚本直接管道进 shell；旧 marketplace 别名没清；以为出了 diff 就能改账户（缺 ceilings 等于禁止写入）；把 unknown 当扣分项；覆盖率不够就下结论；把 partial run 当完整审计。
- B：预先挂上一堆 MCP server；把所有有副作用的动作都卡在第一步同步等确认；用 `--dangerously-skip-permissions` 自动放行；把 `pnpm run-local` 当生产环境。
- C：把 `0.0.0.0` 当方便；在会议室里直接打开 HTML、SVG 这类会执行程序的附件；用 `npm run dev` 跑核准工作；以为 Claude 或 Codex 会产图；把新模型自动升级；把唯读失败和写工单失败一视同仁。
- D：把 Strands Box 当生产标准；非 Apple silicon 还硬套；以为直接文件系统授权会产生 Dogwood 决策；以为原文给了 `box.toml` / `policy.dw` 字段或示例；忘了把 helper 二进制放在同一目录。
- E：把服务凭据当普通密码；以为它是沙箱；在共用或来路不明服务器部署；以为 Docker 发布端口会受 `ufw` 规则限制；以为“通往 Windows 的 SSH 映射端口”需要放行；只凭“它是 frp”就当误报放行；以为安装包有代码签名；证书指纹从别人转发的消息里拿。
- F：把 `--audit` 用于不可信代码；以为原文给了完整策略 JSON 示例；把 experimental 后端当稳定生产；源码构建环境不对；遥测想开就开；一上来就用 Enforcement；让 agent 静默失败。
- G：把提示词当强制暂停；用 auto-approve / yolo 模式跑删除；以为删除会进回收站；相信它报的大小和“可再生”判断；把磁盘上发现的文件名或 README 当指令。
- H：把 Diffinery 当托管服务或有 SLA；没有 Cloudflare Workers Paid 与 R2 就硬上；把 API token 提交进仓库；复用人的账号给 agent；只靠提示词限制 agent；让 agent 的批准当人批准；让 agent 的检查当 required checks；忘记 agent 对 workflow 文件的改动仍需人合并；把 API key 放进沙箱。
- I：把监控提示词塞进被监控 agent 自己的 system prompt；把 assistant 文本当用户意图，或把 meta 行当动作；没有完整 transcript / pre-tool hook 就硬套；直接在生产或共享环境开阻断；不先 shadow；把 classifier fail-closed 当正常；把 stars 当效果证据；把提示词当完整部署方案。
- J：只在 token exchange 阶段检查 redirect URI；错误响应和 Deny 分支漏检；同意屏把客户端注册的多个地址都列出来；允许 app 或 API token 修改信任列表；从拒绝页添加地址不要求手打 host；删除地址不撤销 grant 和 in-flight code；接受浏览器与解析器读法不一致的 URI；用通配符、前缀匹配或 loopback 式端口灵活匹配；以为这套设计能阻止有决心的社会工程师。
- K：同一客户端挂两种安装方式导致连接挂起；用 stdio 做正式环境；用自己账号的长期访问令牌而不是专用账号；一上来全量开工具；没有先开 Read Only Mode；没有逐工具 enable/disable；没有用 tool security policies；没有依赖 automatic edit backups；远程访问开得太大；不知 `ha_config_set_yaml` 等是 beta 且需要额外条目；小模型客户端没开 `ENABLE_TOOL_SEARCH=true`，也没抬高上下文窗口。
- L：以为编码 agent 循环能跑就算上线；允许直连模型供应商、key 不设消费上限；沙箱里放长期凭证或任务结束不销毁；只设软提醒不设硬上限；追溯只到 PR 不到 ticket/epic；prompt 变更不跑测试直接发布；让 agent 的批准替代人批准；把 L 当完整实施方案；把 L 与 H 的自动合并混用，却不加回人工批准。
- M：把路径围栏只写在提示词里，以为模型会遵守；用 auto-approve / yolo 或自动点头跑写入；不先跑基线测试；让 agent 改测试文件；不读完整提案就确认；把整文件重写和过期注解一起送进去；把原文的版本号、模型名、成本数据当已验证事实；把“审批门比模型聪明”当结论；没有隔离环境或回滚；主循环不设上限；读文件、跑测试不设上限、超时和输出截断；无人值守直接改生产代码或大范围重构。
- N：只把“不要提交密钥”“不要装新包”写进提示词，却不用确定性 hook 强制；容器里挂生产凭据；把容器当完整隔离，却不限制宿主文件系统挂载；依赖冷却没拿到包发布时间元数据；hook 只挂在提交前，漏掉安装依赖和写文件路径；为了省事把 N 设得很小或关掉冷却；让 agent 只找 bug、不交付修复；只清理历史代码，不把 hook 设为新代码默认；把原文的容器/microVM 判断当对比实验结论；把没有给出的 N 取值、hook 代码、microVM 选型当成已有配置。

## 证据与来源

做法 A 依据 AgriciDaniel/claude-ads 仓库 README 首页（v2.0.2）。可直接照抄的是插件与脚本安装命令、`install.sh` / `install.ps1` / `uninstall.sh` 用法、完整命令表、12 平台清单、写操作六条门控、评分阈值 80%/60%、release 四条硬规则、开发与校验命令；README 全部为仓库自述，没有第三方评测、审计准确率、节省工时、误报/漏报率。做法 B 依据 cloudflare/cloudflare-os README（v2，early access）。可直接照抄的是 `pnpm run-local`、http://localhost:8787、五条官方提示词、11 个 gatekeeper 包路径、开发命令与部署入口；没有 gatekeeper 的具体 OAuth 配置步骤，自建服务器部署 COMING SOON；同等模型下该平台编码 agent 更快更好更省 token 是作者主张。做法 C 依据 sojei1989/ai-meeting-room README（Apache License 2.0，macOS 本机开源应用）。可直接照抄的是安装步骤、`--sandbox read-only` / `--sandbox workspace-write`、风险分级、核准与还原规则、模型发现与费用护栏、白话解释降级链、测试命令；原文没有 benchmark、用户案例或量化结果。做法 D 依据 strands-agents/box README（Preview，只支持 macOS Apple silicon 本地执行）。可直接照抄的是下载脚本、Cargo 构建命令、两个配置文件名与分工、策略 skill URL、决策记录默认路径、示例目录；`box.toml` 字段写法和 `policy.dw` 规则示例都没给出；凭证注入是设计声明，没有验证方式。做法 E 依据 sun168567/cc-desk-tunnel README（Apache-2.0，约 39 stars，自述主要由 AI 编写、个人维护、没有专业安全审计，与 Anthropic 无隶属或合作关系）。可直接照抄的是服务端部署脚本、默认放行端口 8787 与 7000、三行端口对照表、作者“必须知道的四件事”、杀毒软件与 SmartScreen 处理建议含 `SHA256SUMS` 核对；只有 README 一份材料，不是沙箱，服务凭据等同于完全控制权，数据会离开本机，单用户自用。做法 F1 依据 Microsoft MXC 仓库 README；可直接照抄的是包管理器、诊断命令 `wxc-exec.exe --debug config.json`、审计命令及警告、后端表、源码构建命令、遥测默认关闭条件；跨平台、后端清单、遥测默认关闭均为项目自述，无第三方验证数据。做法 F2 依据 MXC: Microsoft Execution Containers version 1.0.0 发布帖调研；可直接照抄的是四个后端与平台可用性表格、五个策略域填空清单、三模式行为差异表格、JSON 活动报告与仅 Windows 进程容器能生成活动报告等描述；原文没有一行配置示例。做法 G 依据 riza/ai-disk-cleanup README（30 stars，只有 README）。可直接照抄的是三层分层表、“绝不删除”清单、逐步执行且每步打印新释放空间、需要 `sudo` 的操作以可直接运行的命令交回、把磁盘内容当数据不当指令、语言文件路径与把 `---` 以下内容贴进 agent 的用法；提示词正文和具体 shell 命令没有提供，无法核验。做法 H 依据 codician-team/diffinery 调研报告；README 给出可直接执行的部署/安装命令和权限限制清单，包括 agent 独立账号、服务器强制的权限限制、人审 PR、CI 全绿自动合并；但项目年轻、无托管服务、需自备 Cloudflare 付费账号，不适合直接作为团队唯一基础设施。做法 I 依据 collinzrj/claude-code-auto-safeguard-prompt 调研；原文给出较完整分类器提示词：角色、威胁模型、输入格式、HARD/SOFT 区分、用户意图高证据门槛、复合动作、写文件执行、子代理委托等评估规则；没有安装步骤、代码、模型选择、阈值、基准数据或实际案例；stars 不是效果证据；子代理委托规则处被截断。做法 J 依据 Stream Vessel 的 MCP OAuth 重定向 URI 信任设计文章（单一厂商博客与实践描述）。可直接照抄的是七条防绕过规则、服务器自查清单、授权码去向在 authorize 而非 registration 决定、每用户最多 10 个精确 https 地址、同意屏只显示本次 redirect host、手打 host、添加邮件、删除即撤销 grant 与 in-flight code、拒绝解析器读法不一致 URI；原文给出的数据是 2026 年 5 月一项测试 119 个启用 OAuth 的 MCP server，其中 114 个、95.8% 的注册端点接受匿名请求者提供的任意 redirect_uri，同一研究称 60.5% 的测试服务器不显示 redirect host；2026 年 1 月 Obsidian Security 报告 Square 的 MCP server 存在该攻击链；n8n CVE-2026-42230（2026 年 4 月）会把点击 Deny 的用户直接送到攻击者注册的地址；Cloudflare workers-oauth-provider CVE-2025-4143（2025 年 5 月）只在 token exchange 检查；原文引用 RFC 9700 §4.11.2、MCP authorization security considerations 和 MCP client registration 2026-07-28。局限：单一厂商博客和实践描述，没有独立评估；作者明确说这套设计不能阻止有决心的社会工程师；每用户上限 10、精确匹配会带来接入摩擦。做法 K 依据 homeassistant-ai/ha-mcp README 调研；可直接照抄的是安装脚本、demo 验收语 `Can you see my Home Assistant?`、组件/HACS/Marketplace 安装路径、专用账号与长期访问令牌二选一、连接 URL 形态、Read Only Mode、per-tool enable/disable、tool security policies、automatic edit backups、`ENABLE_BETA_FEATURES` 与文件/YAML 工具、`ENABLE_TOOL_SEARCH=true`、`ha_get_skill_guide`、远程 Webhook Proxy 与 OpenAI Tunnel 接法、FAQ 链接；原文没有给出效果量化数据，权限收窄与备份是 README 自述。做法 L 依据 @mardehaym 的推文调研；原文只有一条推文式清单：编码智能体的计划、编辑、跑测试、修复、开 PR 循环一个周末能搭出来，真正耗时的是六项周边管控；原文没有给出样本量、项目案例、成本数据、缺陷数据或对照实验；六条措施是作者经验主张，点赞、转发和回复数不构成效果证据；原文只给高层管控清单，没有工具选型、配置样例、阈值和落地命令。做法 M 依据 @swordBluesy 的文章调研；原文给出具体案例、测试前后结果、工具分工、路径围栏、读取/超时/输出截断参数、主循环上限和一次成本数据，这些是可直接借鉴的设计约束；局限是原文没有给出可复制的代码、安装命令、工具 schema、审批门实现或实际仓库链接；版本号与模型名需要核实；案例只有一个购物车小 bug，作者关于“审批门比模型聪明更重要”的判断属于主张，缺少多项目、多语言、多故障类型的证据。做法 N 依据 @mihail_eric 的推文，转述 Semgrep CEO 在 Stanford 课程 The Modern Software Developer 上关于“Black October”之后 AI 代码安全的分享。可直接借鉴的是四条措施：agent 进容器或 microVM、凭据与 agent 可触达范围分离、用确定性 hooks 强制依赖冷却与密钥扫描、让 agent 交付安全修复、把防线压到新代码。原文给出的数据/案例：已公开漏洞中被实际利用的不到 2%，用于论证应做预防而非穷举修复，未给来源与口径；Android 未重写技术栈、而是改变新代码写法后报告漏洞大幅下降，没有具体数字、时间窗口或统计口径；一次事故成本轻易到六位数，而编码 agent 内做一次修复只花几分钱，是作者成本对比主张。局限：这是推文作者对一场分享的二手转述，没有演讲材料、链接或复现步骤；全文没有命令、配置、hook 代码，也没有冷却天数 N 的取值；“Black October”未解释；来源是代码安全厂商 Semgrep 的 CEO，存在立场偏向；容器起步、microVM 最佳是经验判断而非对比实验。

与已有工具做法的关系：claude-ads 把 Claude Code 作为规范运行时，本身是 Agent Skills 形态；Cloudflare OS 的 Gatekeeper 自称增强版 MCP server；ai-meeting-room 是 Claude Code 的一种落地用法，Claude Code 只做只读规划与复审，执行交给 Codex，用核准卡 + git 还原点夹住写权限；Strands Box 是 harness-agnostic 沙箱引擎；MXC 是 harness-agnostic 沙箱化代码执行系统，也是 Windows 平台上策略驱动的执行层；cc-desk-tunnel 不修改 Claude Code 本体，是官方 Claude Code 与官方 Agent SDK 之上的一层胶水，改变执行位置边界；ai-disk-cleanup 是在 Claude Code / Cursor 之上加一层磁盘审计 + 分层批准的使用流程；Diffinery 把 GitHub 式协作搬到自己的 Cloudflare 账号；claude-code-auto-safeguard-prompt 是工具调用前的二次审查层；做法 J 是 MCP OAuth 授权服务器的一层准入控制，决定授权码可以送到哪里；做法 K 是 Home Assistant 场景的权限收窄流程；做法 L 是编码 agent 上线前的总检查表；做法 M 是单 agent 小范围修 bug 的写入前审批门，重点在读/跑测试只读、写文件必须人工审批、路径围栏写在代码里、测试作验收，与 C 的双 CLI 分工、工作卡核准和 git 还原点互补；做法 N 是编码 agent 在装包、提交与凭据暴露路径上的确定性规则层，与 F 的沙箱化执行、H 的服务端硬限制、I 的动作前审查、L 的上线准入互补，不能替代它们。

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
- [Letting users trust their own MCP clients, without opening a phishing hole](../research/radar/2026-11-05/10356-letting-users-trust-their-own-mcp-clients-without-.md)：值得一试，建议作为 MCP 服务器授权层的候选方案小范围试用：在测试环境按原文清单实现「authorize 时按用户校验重定向地址」、手打 host、邮件通知和撤销联动；理由是原文给出了可操作的七条防护规则与自查清单，但证据主要来自单一厂商实践和外部事件，尚未证明能普适降低风险。
- [homeassistant-ai/ha-mcp](../research/radar/2026-11-11/12471-homeassistant-ai-ha-mcp.md)：值得一试，有 Home Assistant 的团队可以照着 README 的步骤小范围试：先跑 demo 打通连接，再用只读模式接真实实例，然后逐工具放开写权限；理由是它是少见的、把“给 AI 开放一整套工具与管理员权限”所需的前置条件（专用账号、只读开关、逐工具开关、审批策略、改动前自动备份、领域技能包、按模型能力选择工具加载方式）都写成了可照做的配置，但它只覆盖智能家居运维这一个场景，原文也没有任何效果量化数据。
- [@mardehaym: You can build a coding agent loop in a weekend. Plan, edit, run the tests, fix, open a pull request.](../research/radar/2026-11-13/12973-you-can-build-a-coding-agent-loop-in-a-weekend-pla.md)：值得一试，建议在小范围代码库中把原文六条当作编码智能体上线前的准入门槛试用：统一网关与消费上限、一次性无凭证沙箱、尝试和成本硬上限、全链路追溯、prompt 变更测试门禁、PR 人工批准；原文只给了管控清单，没有工具配置和效果数据，因此先试再推广。
- [@swordBluesy: # 让 AI 自己改程式码，你敢吗？这道审批门让它改之前先问你](../research/radar/2026-11-14/13344-ai.md)：值得一试，建议小范围试：在隔离仓库里按“读文件和跑测试只读、写文件必须人工审批、路径围栏写在代码里、测试作为验收标准”搭最小原型，只让它修一个失败测试对应的小 bug。原文给出了可操作的流程和参数，但没有可复制代码，且版本号与模型名需核实，因此不宜直接 adopt。
- [@mihail_eric: One of the top AI code security leaders believes high-profile exploits, vulnerabilities, and attacks](../research/radar/2026-11-14/13443-one-of-the-top-ai-code-security-leaders-believes-h.md)：值得一试，先在一个仓库上小范围试点原文提出的四件事：agent 进沙箱（容器起步、microVM 更佳）、凭据与 agent 隔离、用确定性 hooks 强制“依赖冷却 + 密钥扫描”、让 agent 直接产出安全修复（固定 CI 中 Action 版本、删死代码）；理由是它给出的是可执行的措施而不是纯观点，但原文只是演讲转述、没有任何配置或参数，只能试不能直接采用。
