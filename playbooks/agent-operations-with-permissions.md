# 让 AI 在触碰账户、代码和执行环境前守住权限边界

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 一旦能直接改账户、写代码或执行命令，风险就从答案不准升级成资产被动；这篇手册给出六种可照做的权限边界做法，从只读审计、按任务授权、双 CLI 分工、底层沙箱到跨机器执行和模型生成代码的沙箱执行。
> 先试这一步：如果你管付费媒体账户，先装 claude-ads 跑 `/ads setup` 和 `/ads audit`，看它能不能给出带日期证据和显式置信度的只读结论。
> 最近修订：2026-10-09

## 解决什么问题

付费媒体账户、外部服务账号、本地代码仓库都是真金白银或真实代码的操作面。AI 在只读状态下做审计、计划、创意、报告没问题；一旦它能直接改账户、调用外部服务或写代码，风险就从「答案不准」升级成「账户/仓库被动了」。这篇手册给六件事：一是默认只读、产出带证据的结论，账户变更先出草案再逐条过门控（以 AgriciDaniel/claude-ads 作为可照搬的落地模板）；二是把权限模型换成更省人的一种——不再预先给 AI 挂上所有服务、也不卡在第一步等人点确认，而是默认零权限、按当次任务只引入单个具体资源，有副作用的动作先在本地模拟结果让 agent 继续推进，人稍后一次性批量批准或逐条批准（以 Cloudflare OS 的 Gatekeeper 作为可本地体验的实现）；三是在本地代码仓库里用两个 CLI 分工——Claude 只读规划与复审，Codex 只在你逐张核准工作卡后于 `--sandbox workspace-write` 下写卡上明列的文件，核准前自动存 git 还原点，越界就停下并还原（以 sojei1989/ai-meeting-room 作为可照做的本机流程）；四是做一次底层沙箱的可行性验证——在 Apple silicon Mac 上用 Strands Box 把执行、读写、网络能力放开给 agent，用默认拒绝的 Dogwood 语义策略在 agent 进程之外判定 allow/deny，凭证由网关注入而不交给 agent，决策写 OTLP JSON 记录供事后审计（以 strands-agents/box 作为 Preview 阶段的试装来源）；五是当会话必须放在云端、项目与工具链必须留在 Windows 本机时，把「在哪执行」这一环拆开——服务器上的官方 Claude Code 通过一条加密反向 SSH 隧道在你电脑上读写文件、执行命令，边界靠端口最小放行、凭据当密码管、审批沿用 Claude Code 自身机制来夹住（以 sun168567/cc-desk-tunnel 作为一个只宜自用、小范围试的拓扑）；六是把模型生成的代码放进沙箱执行并回收结果——在你的应用里嵌入 MXC SDK，以 egress 默认 deny + 超时启动容器，先验证越权用例确实被拦（以 Microsoft MXC 作为可试装的沙箱化代码执行系统）。

## 适用与不适用

**适用：**

- 你管的是付费媒体账户。覆盖 12 个平台，搜索/视频/社交：Google Ads、Meta Ads、YouTube Ads、LinkedIn Ads、TikTok Ads、Microsoft Advertising、Reddit Ads、Snapchat Ads、X Ads；商务与零售媒体：Apple Ads、Amazon Ads、Pinterest Ads。
- 手上有可授权的账户导出或读取权限。
- 你用的宿主是 Claude Code（claude-ads 原文把它作为规范运行时），或能在其他兼容 Agent Skills 的宿主里消费同一批 skill 文件。
- 你要的是「AI 起草 + 人工审批 + 确定性验证」，或更进一步「默认零权限 + 按任务授权 + 延后批量审批」，或「双 CLI 分工 + 工作卡核准 + 沙箱执行 + 还原点」，而不是「AI 直接改账户/仓库」或「预先全开权限」。
- 你能接受默认只读、写操作逐条过门控的节奏。
- 你还想把这套权限与审批模式移植到通用 agent 工作流（GitHub repo、Google Doc、Slack 等外部服务）：Cloudflare OS 的 Gatekeeper 是可直接本地体验的来源。
- 你有 macOS、Node.js 20 以上、Git，并且已经用自己账号登录了 `claude` 与 `codex` 指令；想用本机网页界面跑双 AI 协作。
- 你能接受 ai-meeting-room 的现状：只支持 macOS、界面繁体中文、目前只有 Claude（规划）+ Codex（执行）两位成员，Gemini CLI 等是后续方向。
- 你有 Apple silicon Mac、macOS 15 或更高、Homebrew 安装的 Node.js 22.21 或更高、能访问 `us-west-2` 上 Amazon Bedrock 的 Claude Opus 5；想验证「默认拒绝 + 语义策略 + 凭证注入 + 决策记录」这套 agent 沙箱设计。
- 你能接受 Strands Box 的现状：README 标注 Preview，当前只支持 macOS Apple silicon 上的本地执行，仓库 63 stars；策略与配置的具体写法全在外链 `docs/` 里，本次材料只给了安装和构建命令。
- 你的日常开发环境在 Windows 本机（Windows 10/11 x64），又想让云端 Claude Code 直接在本机读写文件并执行命令；手上有一台你自己控制的 Linux 服务器（x86_64，推荐 Ubuntu，已装 Docker）。
- 你能接受把本机的任意命令执行权交给这台服务器（作者原话：服务凭据等同于完全控制权；它不是沙箱）。
- 你能接受单用户自用：一个服务对应一个使用者、同一时间一台在线 Windows 设备，没有多用户、权限分级或租户隔离。
- 你想用时间触发的定时任务让工作持续推进：到点向指定会话或新会话发送预设提示词，也可以直接让 Claude 帮你设置。
- 你能接受文档目前只有中文。
- 你需要把执行能力嵌入自己的应用，运行不可信代码（model output、plugins、tools），并且愿意按平台挑后端、调策略；平台是 Windows / Linux / macOS；用 Node SDK 时在 Linux 或 macOS 上试最省事（原文推荐的最小试用环境）。
- 你能接受 MXC 的现状：README 属项目一手文档，没有性能数字、对比基准或落地案例；完整策略 JSON 示例、接入 agent 主循环的做法、各后端实际隔离强度对比未给出；部分后端标注 experimental。
- 你只想先做可行性验证：跑通「生成代码 → 隔离执行 → 回结果」的循环，先验证越权用例被拦。

**不适用：**

- 非付费媒体账户运营。claude-ads 这个仓库领域很窄。
- 需要 AI 立即自动改账户、无人审批的场景。原文的设计就要求 owner 审批、幂等键与回滚。
- 装不了 Claude Code 插件、也不能消费 skill 文件的宿主。原文只在安装一节把 Cursor、goose 归类为 watch 级：它们「在其运行时支持范围内」可消费同一批 skill 文件，但没有给出任何针对这两个宿主的具体步骤或适配说明。
- 需要核验评分与门控实现细节的场景。claude-ads 的本次材料只有 README 首页，看不到各 skill 的实际提示词、scoring.py 实现、capability manifest 明细。
- 想把 Cloudflare OS 当生产平台上线：它处于 early access、当前是 v2、自建服务器部署文档标注 COMING SOON、无 SLA。
- 想改造 Cloudflare OS 上游：仓库不接受外部大改动贡献，超过十几行的 PR 会被关闭（只收可轻易验证的小修复）。
- 非 macOS、没有 Node.js 20 以上或 Git、或不愿意用本机网页界面跑 ai-meeting-room 的场景。
- 想让会议室被路由器转发或公开反向代理访问：原文明确不要，也不要把监听位址改成 `0.0.0.0`。
- 需要 AI 直接产图：ai-meeting-room 里 Claude 和 Codex 都不产图，需要素材时改成开「等你交件」卡由人交付。
- 需要量化效果数据来决定是否采用：ai-meeting-room 原文没有 benchmark、用户案例或量化结果。
- 非 Apple silicon Mac、macOS 低于 15、Node.js 低于 22.21（且不是 Homebrew 安装），或无法访问 `us-west-2` 的 Bedrock Claude Opus 5。这些条件下无法照做 Strands Box。
- 想把 Strands Box 当生产标准或完整教程。它仍是 Preview；`box.toml` 的字段写法和 `policy.dw` 的规则示例都没有给出，getting-started、security、policy、architecture 全在外链文档里。
- 想让 `box.toml` 里的直接文件系统授权也产生 Dogwood 决策。直接授权由 OS 强制执行，不产生单条 Dogwood 决策；要让策略管到文件操作，必须走解释器，并把这些文件排除在直接授权之外。
- 想让 cc-desk-tunnel 当沙箱：Claude 能访问你 Windows 用户能访问的一切，而不只是项目目录；项目边界只靠提示词引导 + Claude Code 自身审批机制。
- 把服务器放在与他人共用或来路不明的机器上：连接期间服务器能以你的 Windows 用户身份执行任意命令，服务器被攻陷等于你的电脑被攻陷。
- 需要多用户、权限分级或租户隔离的场景。
- 不能接受数据离开本机：Claude 读取的文件片段和命令输出会经服务器发往模型服务；服务器上保存会话记录和 Claude 登录凭据，备份文件同样含这些秘密。
- 想要经过专业安全审计的工具：README 自陈主要由 AI 编写、个人维护、没有经过专业的安全审计，与 Anthropic 无隶属或合作关系。
- 需要拿「工作效果是否改善」的量化数据来决定采用：README 只提供用量侧的额度、重置时间和调用统计，没有指标、基准或对比数据。
- 服务器所在地不在 Anthropic 支持的国家和地区：服务器所在地即使用地点；条款限制第三方产品提供 Claude.ai 登录或代为使用订阅额度，技术上能用不代表获得许可，拿不准时改用 API key。
- 想要有代码签名的安装包：安装包没有代码签名。
- 想靠文档配置定时任务：README 未给出具体提示词模板或配置字段，需在客户端里实际操作确认。
- 只是偶尔跑一段生成代码：用现成容器/沙箱可能更省事（此句为推论，非原文主张）。
- 需要完整的策略 JSON 示例或现成的 agent 主循环接入方案：原文未给出，需按 README 指向的 `docs/backends/`、`docs/api-reference/`、`schemas/stable/` 继续查证。
- 想用 `--audit` 来给不可信代码补权限：原文字面警告 `--audit` 会关闭被分析工作负载的全部沙箱安全，绝不能用于不可信代码；给不可信代码补权限应走 `docs/logging-access-denied.md` 的 deny-and-record 流程。
- 想依赖 experimental 后端（`windows_sandbox`、`microvm`、`hyperlight`）作为稳定生产：原文标注为 experimental。
- 源码构建环境不满足：Rust 1.93（由 `src/rust-toolchain.toml` 固定）、Node.js 24 或更高版本。

## 前置条件

- 运行时会话：Claude Code。要落到其他独立宿主，需在安装时显式指定 target。
- 托管依赖支持 CPython 3.11 和 3.12，且限于声明的 Linux/macOS/Windows wheel 矩阵；不支持的解释器会在改动目标位置之前失败。`--no-deps` / `-NoDeps` 用于只装 skill。
- 浏览器抓取需要操作员自行安装 Playwright 浏览器 payload。
- PDF 渲染需要宿主的 WeasyPrint 和 Pango 系统库（见 `control-plane/manifests/external-runtime-dependencies.json`）。
- 账户侧要有 client / account / KPI / privacy / guardrail 档案，由 `/ads setup` 建。
- 凭证必须放环境变量、OS keychain 或经批准的 secret manager，不得进入仓库、profile、报告或日志。
- 写操作另需：capability、账户与对象 ID、before/after diff 与 blast radius、审批上限、幂等键、审计目的地、回滚、验证窗口。
- 想本地体验 Cloudflare OS：需要安装 pnpm（原文未给出 Node 版本要求）；本地数据存在 `.wrangler` 子目录。
- 想部署到自己的 Cloudflare 账号：需要自己的 Cloudflare 账号。
- 想接入外部服务：多数 Gatekeeper 需要各自的服务配置，包括自行申请该服务的 OAuth client 凭据；Gatekeeper 服务独立部署的细节「尚未确定」，目前只能与 OS 实例一起部署。
- 想跑 ai-meeting-room：macOS；Node.js 20 以上；Git；已用自己账号登录的 `claude` 与 `codex` 指令。
- 首次启动 ai-meeting-room 的设定精灵会问三件事：项目放在哪个文件夹、要不要开手机入口（可留空）、会议室的登录密码。
- ai-meeting-room 可选输入：`.secrets/telegram-token.txt` 与 `.secrets/telegram-chat-id.txt`（Telegram 推播）；`.secrets/gemini-api-key.txt`（白话解释用 Gemini）；需要图片素材时按卡片规格交件。
- 想试 Strands Box：Apple silicon Mac；macOS 15 或更高；Homebrew 安装的 Node.js 22.21 或更高；能访问 `us-west-2` 上 Amazon Bedrock 的 Claude Opus 5。
- Strands Box 的下载脚本会校验 release checksum，把二进制解包到 `./box-core`，不改 `PATH`，也不动系统目录；`./box-core/box --version` 可自检。
- Strands Box 从源码构建：Cargo workspace，`rust-toolchain.toml` 固定编译器，首次构建时由 rustup 安装；构建产物按 `./target/release/strands-box` 运行，helper 二进制要放在同一目录。
- Strands Box 的写策略细节需要读 `docs/user/getting-started.md`、`docs/user/security.md`、`docs/user/policy.md`；本次材料未包含这些外链文档内容。
- 想跑 cc-desk-tunnel：一台有公网 IP 或域名的 Linux 服务器（x86_64，推荐 Ubuntu，已安装 Docker）+ 一台 Windows 10 / 11 x64 电脑。作者称服务器不需要高配：编译测试都在 Windows 本机跑，服务器上只有 Claude Code 和一个轻量代理服务，2 核 1 GB 内存的入门机型就能运行（作者陈述，无实测数据）。
- cc-desk-tunnel 的部署脚本会检查 Docker、Docker Compose 等依赖，缺少时只告诉你要装什么，不会替你安装系统软件；也不会修改防火墙、nginx 或 SSH 配置。再次运行同一条命令可以升级已有部署。
- 需要记录服务器安装后打印的三项信息：服务地址、证书指纹、服务凭据；并在防火墙放行两个 TCP 端口（默认 8787 和 7000）。
- cc-desk-tunnel 的 Windows 客户端安装包自带 PowerShell 7、OpenSSH 和 frpc，不需要另装任何东西；安装包没有代码签名，首次运行会遇到 SmartScreen 提示。
- Claude 账号登录走官方 `claude auth` 流程，登录凭据只保存在服务器上；不想用订阅登录时可改用 API key，在数据目录的 `config/provider.json` 中配置。
- 从源码构建 cc-desk-tunnel 需要 Git、Node.js 24 与 npm；Windows 上使用 PowerShell 7。
- cc-desk-tunnel 需要填入的三项连接信息来自你自己登录服务器看到的安装汇总，不要采用别人转发的证书指纹。
- MXC Node SDK 安装：`@microsoft/mxc-sdk`（npm，包内含原生运行时资产），适用于 Linux/macOS 的最小试用。
- MXC 也可用 Rust：`mxc-sdk`（crates.io）；或 .NET：`Microsoft.Mxc.Sdk`（NuGet）。
- MXC 按平台选择后端：Linux x64/ARM64 默认 `bubblewrap`（其他：`lxc`、`microvm`、`hyperlight`）；macOS ARM64/x64 默认 `seatbelt`；Windows 11 x64/ARM64 默认 `processcontainer`（其他：`windows_sandbox`*、`wslc`、`microvm`*、`hyperlight`*、`isolation_session`）。带 * 的后端为 experimental。
- MXC 源码构建前置：Rust（由 `src/rust-toolchain.toml` 固定为 1.93）、Node.js 24 或更高版本与 npm、所选后端要求的平台工具链与前置条件。
- MXC 诊断：原生 executor 默认把 stdin/stdout/stderr 留给工作负载，MXC 自身的诊断要显式用 `--debug` 打开。
- MXC 审计模式：仅受支持的 Windows 版本；原文字面警告会关闭沙箱安全。

## 操作步骤

下面分成六套做法。做法 A 是付费媒体账户的具体落地：默认只读，写操作逐条同步过门控。做法 B 是可迁移的权限与审批模式：默认零权限，按任务只引入单个资源，有副作用的动作延后批量审批。做法 C 是本地代码仓库的双 AI 协作：Claude 只读规划与复审，Codex 只在你逐张核准工作卡后于沙箱内执行，核准前自动存 git 还原点。做法 D 是底层沙箱的可行性验证：在 Apple silicon Mac 上用 Strands Box 把执行、读写和网络能力放开给 agent，用默认拒绝的 Dogwood 语义策略在 agent 进程之外判定 allow/deny，凭证由网关注入，决策写 OTLP JSON。做法 E 是跨机器执行的位置边界：官方 Claude Code 会话跑在你自己控制的 Linux 服务器上，通过加密反向 SSH 隧道在 Windows 本机读写文件、执行命令，边界靠端口最小放行与凭据管理夹住。做法 F 是模型生成代码的沙箱执行：在你的应用里嵌入 MXC SDK，以 egress 默认 deny + 超时启动容器，跑通「生成代码 → 隔离执行 → 回结果」的循环，先验证越权用例被拦。E 与 A/B/C/D/F 不冲突，但它不是沙箱，只宜自用、小范围试。F 与 D 不冲突：D 是 agent 沙箱（macOS Apple silicon + Dogwood 语义策略），F 是代码执行沙箱（跨平台 + 多后端 + SDK 嵌入应用）。

### 做法 A：付费媒体账户（claude-ads）——默认只读、写操作逐条过门控

**1. 安装**

原文明确要求：优先使用宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档；不要把远程安装脚本直接管道进 shell。

插件路线（在 Claude Code 里就用这条）：

```text
/plugin marketplace add agricidaniel/claude-ads
/plugin install claude-ads@ai-marketing-hub-claude-ads
```

若在 v2.0.0 之前加过该 marketplace，本地别名是陈旧的 `agricidaniel-claude-ads`，先移除再加：

```text
/plugin marketplace remove agricidaniel-claude-ads
/plugin marketplace add agricidaniel/claude-ads
/plugin install claude-ads@ai-marketing-hub-claude-ads
```

本地克隆路线（需要先审代码、或走带 SHA-256 校验的本地归档时用这条）：

```bash
git clone https://github.com/AgriciDaniel/claude-ads.git
cd claude-ads
bash install.sh --source=local
```

显式选择其他独立宿主：

```bash
bash install.sh --target=codex --source=local
bash install.sh --target=gemini --source=local --no-deps
```

PowerShell 使用同一套托管归属模型：

```powershell
git clone https://github.com/AgriciDaniel/claude-ads.git
Set-Location claude-ads
.\install.ps1 -Source local
```

两条路线怎么选：在 Claude Code 里跑就用插件路线；需要本地审查代码、或使用带 SHA-256 校验的 tagged release 归档时用本地克隆路线。预期结果：skill 文件落到宿主，`/ads` 或 `/claude-ads:ads` 命名空间加载同一份契约。

**2. 先建档**

```text
/ads setup
```

前提：已有授权导出或账户读取权限。预期结果：客户、账户、KPI、隐私与护栏档案建立完成——这是后面所有审计与报告的条件供给。

**3. 跑一次只读审计**

```text
/ads audit [all|platform|scope]
```

平台快捷方式：`/ads google`、`/ads meta`、`/ads amazon`、`/ads reddit` 会路由到对应平台审计。

预期结果：审计结果带日期证据（dated evidence）和显式置信度。这一步不触碰账户。

**4. 出报告、看阻塞项**

```text
/ads report
/ads next
```

`/ads report` 渲染已验证的 JSON run bundle；`/ads status` / `/ads next` 显示当前状态与最高优先级阻塞项。规范结果是版本化 JSON，Markdown、HTML、PDF 都只是同一个已验证 run bundle 的渲染。

其余命令：

```text
/ads plan
/ads create
/ads experiment
/ads monitor
/ads research refresh
/ads validate
/ads status
```

`/ads research refresh` 刷新平台、政策、API、基准和生态证据；`/ads validate` 校验 contracts、runs、capabilities、maturity 或 release readiness。

**5. 要改动时，只让它出草案**

```text
/ads launch --draft
/ads optimize --draft
```

预期结果：起草账户变更计划，但不动账户。

**6. 真正落地前，逐条满足六项门控（这是做法 A 的同步节奏）**

要真正落地，必须逐条满足以下六项（原文顺序）：

1. 针对**精确操作**要有已测试并启用的 capability。
2. 明确的账户和对象 ID。
3. 人类可读的 before/after diff，含 blast radius。
4. 在账户定义的上限内由 owner 审批。
5. 幂等键、审计目的地、回滚、验证窗口。
6. 验证远端状态仍匹配变更前置条件。

缺少 ceilings 即等于禁止写入；v2 不支持永久删除。注意：这是「人看过 diff 才放行」的同步逐条审批。另一种节奏（先模拟、后批量批准）见第 13 步。

**7. 按规则判读评分**

控件结果只有 `pass`、`fail`、`unknown`、`not_applicable` 四种。

- 健康度（health）、证据覆盖率（evidence coverage）、监管暴露（regulatory exposure）、机会（opportunities）彼此独立。
- unknown 控件只降低证据覆盖率，不改变已确定的健康度。
- 覆盖率 ≥80% 可评级，60–79% 为暂定（provisional），低于 60% 证据不足。
- optional、beta、premium、unavailable、ineligible 的功能不计分。
- 平台 profile 被禁用或未批准时不产出健康分。
- 某平台失败会被排除出组合评分，并使该次 run 变为 partial。

**8.（可选）自建或验证实现**

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

预期结果：依赖装齐、`pip check` 无冲突、单测通过、版本与 finding 校验可跑。

**9. 卸载**

```bash
bash uninstall.sh --target=claude
```

PowerShell 对应 `uninstall.ps1`。预期结果：只删 manifest 拥有的文件。

### 做法 B：Cloudflare OS Gatekeeper——按任务引入资源 + 有副作用动作延后批量审批

**10. 本地跑起来（不用于生产，数据存在 `.wrangler` 子目录）**

```bash
pnpm run-local
```

然后访问 http://localhost:8787 。预期结果：看到预载公司运作知识的 agent 对话界面，可以直接派任务。

**11. 用官方给的提示词验证能力边界**（原文原样给出）

```
Make slides for my upcoming meeting with a customer.
```

（会使用内置 slides blueprint）

```
Make a collaborative whiteboard app.
```

（从零创建新应用）

```
Make a tic tac toe game.
I'll be X and you be O. I've made my first move. Your turn.
```

```
Make an issue dashboard for this GitHub repo.
```

（需附加一个 repo，且需先配置 GitHub 集成）

```
Fix the typos in this Google Doc.
```

（需附加一个 doc，且需先配置 Google 集成）

**12. 按任务引入具体资源，而不是预先挂上所有服务**

Cloudflare OS 的做法：每个 agent 和 Gadget 默认零权限，必须按当次任务把具体资源「介绍」给它（粘贴链接，或点 add resource 选择）；agent 也可以主动请求引入某资源，由你批或拒。Gatekeeper 侧负责：包装原生 API、处理 OAuth、把访问限定到用户指定的那一个资源、记录全部动作、对有副作用的动作提供人工批准。

预期结果：这个 agent 或 Gadget 只拿到本次任务需要的那一个资源，其余一律不可见。

**13. 有副作用的动作：先模拟、后批量批准**

agent 触发需批准的动作时，Gatekeeper 在本地模拟该动作结果，告诉 agent 已完成、读回时也给模拟结果，于是 agent 可以继续排队后续动作；等它做完，你再一次性批量批准或逐条批准，不必盯着屏幕同步点确认。原文认为这优于两种常见做法：卡在第一步等人点确认，或者干脆开 `--dangerously-skip-permissions` 自动放行。

预期结果：你离开一段时间回来，agent 已经基于模拟结果推进了后续步骤，而不是停在第一步。

**14. 接入外部服务前，读对应 gatekeeper 包的配置说明，并自行申请该服务的 OAuth client 凭据**

```
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

注意：原文只给了这些路径，没有给出任何一条 gatekeeper 的具体 OAuth 配置步骤，要照做必须打开对应文件；原文也提醒服务商通常不为非开发者简化这件事。

**15.（可选）开发模式与部署**

开发模式（两个终端）：

```bash
pnpm dev-server
pnpm dev-client
```

访问 http://localhost:3000 。

部署到自己的 Cloudflare 账号走 https://os.cloudflare.app/deploy ；要带自己的 gatekeeper 或改代码，用部署模板仓库 https://github.com/cloudflare/cloudflare-os-starter 。自建服务器部署原文标注 COMING SOON，目前需要自己读 workerd 配置文档（https://github.com/cloudflare/workerd/blob/main/src/workerd/server/workerd.capnp ）或让 agent 去读。

### 做法 C：本地代码仓库（ai-meeting-room）——双 AI 只读规划 + 工作卡核准 + 沙箱执行 + 核准前 git 还原点

**16. 安装并启动（前提：macOS；Node.js 20 以上；Git；已用自己账号登录的 `claude` 与 `codex` 指令）**

1. 从 GitHub 页面 Code > Download ZIP 或 Releases 下载压缩档，解压到习惯放工具的位置。
2. 在 Finder 双击 `start.command`。若 macOS 提示无法打开，右键选「打开」，或到「系统设定 > 隐私权与安全性」按「强制打开」。
3. 首次启动的设定精灵会问三件事：项目放在哪个文件夹、要不要开手机入口（可留空）、会议室的登录密码。
4. 设定完成后浏览器自动打开 `http://127.0.0.1:4477`，输入密码进入。
5. 想用终端机：进到会议室文件夹执行 `npm start`；要关掉按 `Control + C`。
6. 检查画面左下角「环境检查」：`claude` 和 `codex` 都显示版本号就没问题；上方「模型状态」会列出侦测到的模型，未验证或本次未提供的模型会被标示原因并禁止选用。

**17. 跑一场会议（可直接照做的操作顺序）**

1. 用白话写下想做什么，按「开始会议」。
2. 等 Claude 出规划、方案选项、风险（全程只能读）。
3. 等 Codex 回报可行性、要改哪些文件，并列出操作清单。
4. 在左栏选方案。
5. 在右栏一张一张核准或拒绝。风险分级照原文：低风险＝只新增文件或改样式；中风险＝会动到现有功能；高风险＝删档、装套件、部署。
6. 卡片两张以上时，栏位标题会出现「核准全部低风险」和「核准全部」；按一下会变成「确定？再按一次」，再按才开跑。批次是一张接一张做，每张照样先存还原点；中途一张失败就停下来，后面的留在待处理。
7. 全部做完 Claude 再审查一次。
8. 按「结束并产出决议」，存成 `meetings/` 里的 markdown。

会议中可随时插话（Enter 送出，Shift + Enter 换行），送出前要选这句话给谁：

- Claude（策划者）：问方向、改需求、要他重新规划
- Codex（执行者）：问项目的事、要他多做或改做某件事；若这句话代表要多做操作，右栏会自动长出新的待核准卡片
- 只记录，不询问：只留一句话在会议纪录里，不呼叫任何 AI

AI 正在跑的时候发言框会暂时锁住，跑完自动解开。

**18. 权限与还原机制（这套工具最值得抄的部分）**

| 阶段 | Claude | Codex |
|---|---|---|
| 讨论中 | 只能读 | 只能读（`--sandbox read-only`） |
| 待核准 | 只能读 | 只能读 |
| 你按核准后 | 只能读 | 可写（`--sandbox workspace-write`） |

配套规则：

- 每次核准前自动存一个 git 还原点，右下角「回到执行前」可一键回复。
- Codex 越界写未列出的文件时会停下来并还原本次变更。
- 项目夹没有 git 时，第一次执行会自动建立版本控制（夹标旁绿色 `GIT` 表示还原点可正常运作）。
- 不要设定路由器转发或公开反向代理，也不要把监听位址改成 `0.0.0.0`。会议室只监听本机 `127.0.0.1`；手机入口只接受 Tailscale 网段（100.64.0.0/10），填错会直接不开放。
- 登录密码存在本机 `.secrets/passcode.txt`，不出现在画面、log 或会议纪录；登录八小时后、按登出、或服务器重启后都要重新登录；只关分页不会立刻撤销登录。
- 附件或交件档若是 HTML、SVG 这类会执行程序的档案，一律改成下载，不在会议室里直接打开。

**19. 模型自动跟进与费用护栏**

原文描述的机制（不用改程序）：

- 会议室启动时、每次 AI 开工前（最多每 5 分钟一次）比对 `claude` 和 `codex` 的版本；版本变了，或 Codex 的模型清单超过一小时，就自动重新侦测。闲置时每 30 分钟也看一次。
- CLI 新列出的模型会出现在设定里，标成「待你开放」；按「开放」才会被使用，避免不知情下换成更贵的模型；不想用了可以「收回」。
- 选定的模型若本次未提供（例如官方下架），会暂时改用最接近、且不比原本高阶（不会更贵）的模型，设定区与会议纪录都会写明换成了什么；原模型恢复后自动换回，设定不会被改。若剩下的模型都比原本高阶，会停下来请你在设定里选，不会自己升级。
- Codex 执行时若回报模型不能用，会立刻重新侦测。唯读的讨论会自动换模型重试一次；会改档的工单不会自动重跑，改成提示你按「重试」。

**20. 通知、远程与交件**

- 三个时刻会响一声：AI 跑完一轮、有新的事需要你决定、素材做好了等你看。右下角「提示音」可关。音档放在 `public/assets/sfx/yes-my-lord.mp3`，想换声音用同名档案盖掉。
- Telegram 推播（需要你决定、Codex 做完一张卡、出错三个时刻）只要两个档案，放在 `.secrets/`：

```
.secrets/telegram-token.txt     BotFather 給你的 bot token
.secrets/telegram-chat-id.txt   你自己的 chat id（純數字）
```

存好后重启服务器，启动讯息会显示「Telegram 通知：已启用」；页尾「测试通知」可立刻试收一则。

- 需要图片素材时 Claude 和 Codex 都不产图，右栏会出现「等你交件」卡片，写清尺寸、格式、数量、档名和存放路径；卡片建立时会先准备好收件资料夹。可「开启资料夹」「把档案拖到这里」（单档上限 25MB，同名档不会被覆盖）「复制产图工单」；自己放好后按「我自己放好了」，确认档案存在才让 Codex 接手。

**21. 看不懂时的白话解释（含降级链）**

每则讯息下面有「用白话解释」，翻成不含技术词汇的中文，程序码收在「展开技术细节」里。翻译顺序是 Ollama（本机、免费）→ Gemini → Claude，前面连不上、逾时或没回东西就自动往后退，白话版最后一行会写是谁翻的。

- 想跳过 Ollama：把 `config.json` 的 `explainBy` 改成 `gemini`；全交给 Claude 就改成 `claude`。
- Ollama：`config.json` 的 `ollama.url` 填位址，例如 `http://100.x.x.x:11434`；`model` 留空就用第一个模型。装在另一台电脑时，把那台的 `OLLAMA_HOST` 设成它自己的 Tailscale IP，不要设成 `0.0.0.0`。
- Gemini：到 Google AI Studio 建一把金钥，存成 `.secrets/gemini-api-key.txt`（一行，只有金钥本身）。服务器只在启动 `gemini` 时把它当环境变数传入。没有金钥时自动退回 Claude。

**22. 出问题时的处理**

- 画面显示「连线中断」：服务器关掉了，重新双击 `start.command`。
- 被送回登录页：登录逾时、已登出或服务器刚重启，重新输密码。
- 显示错误次数过多：依登录页显示的时间等待，期间即使密码正确也不放行。
- 手机网址打不开：看启动视窗写的原因，确认 Mac 的 Tailscale 已连线；本机仍可用 `http://127.0.0.1:4477`。
- Claude 或 Codex 没回应：按「环境检查」，通常是登录过期，在终端机执行一次 `claude` 或 `codex` 重新登录。
- 还原点建不起来、说 .git 被锁住：在项目资料夹执行

```
rm -f .git/*.lock .git/objects/maintenance.lock
```

再按一次核准。

- 回覆格式跑掉：画面会直接显示原始回覆，不会当掉。
- CLI 改版导致参数失效：改 `config.json` 里的 `args`，不用动程序码。

**23.（可选）想改程序或自建时**

- 改画面（`public/index.html`）重新整理浏览器就好；改 `server/` 或 `config.json` 要按左下角「重新启动」。
- `npm run dev` 会在程式变动时自动重启，但执行核准工作时不要用，监视器会把 Codex 执行到一半的工作砍掉。
- 测试：

```
node --test test/*.test.js
```

- 可用模型由 `codex debug models` 和 `claude --help` 即时侦测（`server/model-discovery.js`）；`server/model-config.js` 只放已知模型的中文名称、说明和高低排序。
- 工单的模型上限依「Astra > Sol > Terra > Luna，同家族比版本」判断；不认得的新家族一律当成最高档，思考深度也一样。
- 打包 Mac 版：

```
node scripts/build-release.mjs --platform mac --out dist/ai-meeting-room-mac.zip
```

### 做法 D：Strands Box——用默认拒绝策略把执行、读写、网络能力放开（Preview，先做可行性验证）

**24. 确认前提（不满足就退回借鉴设计）**

前提：Apple silicon Mac；macOS 15 或更高；Homebrew 安装的 Node.js 22.21 或更高；能访问 `us-west-2` 上 Amazon Bedrock 的 Claude Opus 5。预期结果：全部满足才继续；拿不到 Apple silicon 机器或 Bedrock 模型访问时，不要强行套用，退回借鉴「默认拒绝、凭证注入、决策记录」三件事。

**25. 下载并验证可执行文件**

```sh
curl -fsSL https://raw.githubusercontent.com/strands-agents/box/main/download.sh | sh
./box-core/box --version
```

前提：能访问 `raw.githubusercontent.com`。下载脚本会校验 release checksum，把二进制解包到 `./box-core`，不改 `PATH`，也不动系统目录。预期结果：`./box-core/box --version` 能输出版本。保持下载下来的二进制都放在同一个 `./box-core` 目录里。

**26. （替代路线）从源码构建**

```sh
git clone https://github.com/strands-agents/box.git
cd box
cargo build --release -p strands-box -p strands-box-containment
```

预期结果：构建产物按 `./target/release/strands-box` 运行，helper 二进制要放在同一目录。这是 Cargo workspace，`rust-toolchain.toml` 固定编译器，首次构建时由 rustup 安装。常用任务走 `just`：

```sh
just build         # the CLI, the alias image, and the containment trampoline
just test          # workspace tests
just check         # pre-push gate: fmt-check + clippy + test
just test-all      # workspace tests and box example checks
```

完整测试套件是 `cargo test --workspace --all-features`；要加 `--all-features` 才会跑 `box_shell` 和 `box_credentials` 两套测试，它们依赖 `test-support` feature。

**27. 按 getting-started 指南写出最小 `box.toml` 和 `policy.dw`，启动 box**

按 `docs/user/getting-started.md` 的 getting-started 指南用 Box 跑 Strands CLI，写 `box.toml` 和 `policy.dw`，然后启动 box。注意：该指南本身是外链文档，本次材料没有给出其内容；也没有给出这两个文件的字段或示例内容。预期结果：能按指南启动 box 并跑通 Strands CLI。

**28. 分清两个文件的分工**

`box.toml` 改 agent 的运行环境和直接访问授权；`policy.dw` 改 Box 经由解释器和网关检查的操作规则。前提：先读 `docs/user/getting-started.md`、`docs/user/security.md`、`docs/user/policy.md`。预期结果：改权限时知道改哪个文件；不会把直接授权误当成策略决策。

**29. 需要写策略时，把策略编写 skill 交给你的编码 agent**

```text
https://raw.githubusercontent.com/strands-agents/box/main/.agents/skills/authoring-box-policy/SKILL.md
```

预期结果：让编码 agent 帮你处理 Dogwood 语法和 Box 支持的动作。注意：原文没有给出策略示例，skill 内容也不在本次材料内。

**30. 记住边界**

`box.toml` 里的直接文件系统授权由 OS 强制执行，不产生单条 Dogwood 决策；要让策略管到文件操作，必须走解释器，并把这些文件排除在直接授权之外。细节见 `docs/user/security.md` 和 `docs/user/policy.md`。预期结果：你能判断哪些操作会出现在决策记录里、哪些不会。

**31. 跑示例**

`examples/strands-box/strands-sdk-agent/` 是一个小 agent，三个工具都走 Shell；`examples/README.md` 是示例索引，含依赖和运行说明。预期结果：示例能跑通，作为最小验证。

**32. 需要 agent 调外部 API 时，把凭证配在网关上**

把凭证配在网关上（API 凭证或 AWS SigV4 签名），不要给 agent 本体。预期结果：经网关签名的请求成功，但 agent 侧拿不到底层 secret（原文是设计声明，需要自行验证）。

**33. 需要审计时去读决策记录**

默认 `<box_dir>/private/telemetry/records.jsonl`，OTLP JSON 格式。预期结果：每次受检查操作都有记录；把记录条数与 agent 实际发起的调用对照，看是否有漏记。

**34. （可复现的验证）复现 README 举的时序场景**

一次经 Shell 或 Python 的文件读之后，网关随后拒绝一个出站 HTTP 请求。预期结果：行为与描述一致则时序规则生效；不一致就不要按「可照做」写入你的标准流程。

### 做法 E：跨机器执行（cc-desk-tunnel）——云端 Claude Code + Windows 本机，靠端口最小放行与凭据管理夹住边界

**35. 确认两台机器与自用前提（不满足就退回做法 C 或 D）**

前提：一台有公网 IP 或域名的 Linux 服务器（x86_64，推荐 Ubuntu，已安装 Docker）+ 一台 Windows 10 / 11 x64 电脑；服务器必须是你自己控制、可信的机器，不要部署在与他人共用或来路不明的机器上。预期结果：两台机器都满足才继续；不满足就改用做法 C（本机双 CLI 分工 + git 还原点）或做法 D（底层沙箱验证）。

**36. 部署服务端（在 Linux 服务器上执行）**

```sh
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/sun168567/cc-desk-tunnel/main/deploy/install.sh)"
```

脚本会做四件事（README 原文列举）：

1. 检查 Docker、Docker Compose 等依赖；缺少时只告诉你要装什么，**不会替你安装系统软件**。
2. 从发布页下载最新服务端程序包并校验，解压到 `/opt/cc-desk-tunnel`。
3. 询问公网地址、证书方式、端口和数据目录（都有默认值，一路回车即可），然后构建镜像并启动。
4. 打印客户端要填的**服务地址、证书指纹、服务凭据**，以及需要在防火墙放行的两个 TCP 端口（默认 8787 和 7000）。

注意：目前不提供现成镜像，镜像在你的服务器上从源码构建，首次需要几分钟；脚本**不会修改防火墙、nginx 或 SSH 配置**。再次运行同一条命令可以升级已有部署。已有 nginx 和域名时，另见仓库的 `deploy/nginx.md`。预期结果：拿到三项连接信息与两个待放行端口。

**37. 安装 Windows 客户端并填入三项信息**

从发布页下载 `CC-Desk-Tunnel-Setup-<版本>-x64.exe` 并安装。安装包自带 PowerShell 7、OpenSSH 和 frpc，不需要另装任何东西。启动后填入上一步拿到的三项信息（服务地址、证书指纹、服务凭据）并连接。

首次运行会遇到 SmartScreen 提示，按 README：点「更多信息 → 仍要运行」；frpc 也可能被杀毒软件拦截，处理见第 41 步。预期结果：客户端连上服务器。

**38. 登录 Claude 并接入项目**

在客户端左下角的账号页登录 Claude 账号（走官方 `claude auth` 流程，**登录凭据只保存在服务器上**），然后添加一个项目文件夹，开始对话。

如果不想用订阅登录，README 提到可改用 API key，在数据目录的 `config/provider.json` 中配置。预期结果：能在客户端里对项目文件夹发起对话。

**39. 按权限边界配置端口（关键，不要跳过）**

| 端口 | 用途 | 是否需要放行 | 保护方式 |
| --- | --- | --- | --- |
| 控制端口（默认 8787/TCP） | 客户端登录与对话 | 需要（nginx 模式下改为放行 443，8787 只监听本机） | TLS + 服务凭据 + 登录限速 |
| 隧道端口（默认 7000/TCP） | 建立反向隧道 | 需要 | TLS + 每次连接随机令牌；只在有客户端连接时才有程序监听 |
| 通往 Windows 的 SSH 映射端口（随机） | Claude 在你的电脑上执行命令 | **不需要，也无法放行** | 只监听容器内部回环地址，未发布到服务器；只接受本次连接的临时公钥 |

- Windows 一侧不需要放行任何入站端口；本机 SSH 服务只监听回环地址，随连接启停。
- 想进一步收紧：在云厂商安全组里**只允许你自己的出口 IP** 访问这两个端口。注意 Docker 发布的端口通常不受 `ufw` 规则限制，来源限制请在云厂商安全组做。
- 即使服务器防火墙放行了全部端口，SSH 映射端口依然无法从外部访问；但全部放行会把服务器上的其他服务（例如它自己的 SSH）一起暴露，作者建议只放行需要的端口。

预期结果：只有你指定的来源 IP 能访问 8787 和 7000，其余不放行。

**40. 落实作者给出的「必须知道的四件事」**

1. **服务凭据等同于完全控制权**：拿到它的人可以使用你的 Claude 账号，并在你电脑上执行任意命令。用脚本自动生成的随机凭据，不要改成短口令、不要截图或贴到聊天/issue；泄漏后在服务器上执行 `manage.sh token` 更换。
2. **不是沙箱**：Claude 能访问你的 Windows 用户能访问的一切，而不只是项目目录；项目只靠提示词引导它在项目内工作，审批沿用 Claude Code 自己的机制。
3. **数据会离开本机**：Claude 读取的文件片段和命令输出会经服务器发往模型服务；服务器上保存会话记录和 Claude 登录凭据，备份文件同样含这些秘密。
4. **指纹要从可信渠道取得**：使用自签证书时，证书指纹应来自你自己登录服务器看到的安装汇总，而不是别人转发的消息。

预期结果：这四条你都能向自己复述一遍，再继续往下用。

**41. 处理杀毒软件与 SmartScreen**

- frpc 可能被报毒：Windows Defender 和不少杀毒软件会把 frp 标成「黑客工具 / 风险软件」并隔离，部分云厂商主机安全组件也会对服务器上的 `frps` 告警。README 强调**不要仅凭「它是 frp」就当误报放行**：先确认安装包来自本仓库发布页、对照 `SHA256SUMS` 校验、查看具体被拦截的文件，确认来源后只对已核验的组件文件设置必要的例外，不建议关闭杀毒软件或排除整个磁盘。
- 连接提示「组件启动失败」时，先检查保护记录。
- 安装包没有代码签名。

预期结果：例外只加在已核验的组件文件上，而不是整个磁盘。

**42.（可选）定时任务：让工作按时间持续推进**

客户端自带定时任务功能：到点向指定会话或新会话发送预设提示词，也可以直接让 Claude 帮你设置。注意：README 未给出具体提示词模板或配置字段，需在客户端里实际操作确认。预期结果：到点后指定会话收到你预设的提示词；这是时间触发，README 没有展开事件/状态触发的机制。

**43.（可选）从源码构建与本地开发**

需要 Git、Node.js 24 与 npm；Windows 上使用 PowerShell 7。

```powershell
npm ci
npm run dev               # 本地模拟服务 + 浏览器界面，不需要任何账号
npm test                  # 单元测试；另有 typecheck、test:ui、check
npm run package:windows   # 生成 Windows 安装包，准备步骤见 apps/desktop/README.md
npm run package:server    # 生成服务端程序包，传到服务器后运行其中的 deploy/install.sh
```

仓库结构：`apps/desktop/`（Windows 客户端）、`apps/server/`（Linux 服务）、`packages/protocol/`（两端消息契约，Zod）、`deploy/`（Docker 部署与运维脚本）、`scripts/`（检查/开发启动/打包/发布）、`docs/`。

**44. 只用一个非关键项目做最小试用并收尾**

1. 在云厂商安全组里只允许你的出口 IP 访问 8787 和 7000，其余不放行。
2. 在服务器上跑一次安装脚本，把服务地址、证书指纹、服务凭据记进密码管理器，凭据不入聊天记录。
3. 在 Windows 上装客户端、填入三项信息连接，登录 Claude（或先配 `config/provider.json` 用 API key），**只添加一个不重要的测试项目目录**。
4. 用一个能在本机明确验证的任务试：让 Claude 读取一个本机文件并汇报内容；再让它在本机执行一条无害命令（例如查看目录、跑一次项目的单元测试）。
5. 试完断开连接，确认本机没有常驻服务、SSH 监听已停止。

预期结果：本机能观察到命令确实在本机执行；断开后本机不残留常驻服务。

### 做法 F：MXC——把模型生成的代码放进沙箱执行并回收结果

**45. 按语言安装 SDK（前提：不需要 clone 仓库，按语言用包管理器装）**

- Node（Linux/macOS 最小试用推荐）：`@microsoft/mxc-sdk`（npm，包内含原生运行时资产）。
- Rust：`https://crates.io/crates/mxc-sdk`（该 crate 会把 MXC SDK、引擎和所选后端一并编译进调用方应用）。
- .NET：`https://www.nuget.org/packages/Microsoft.Mxc.Sdk`（包内含原生运行时资产）。

预期结果：SDK 依赖装进你的应用，可以发起容器请求。

**46. 在应用里发起一次受控执行（原样摘自 README 的 Node 片段）**

```typescript
import { spawn, type ContainerRequest } from '@microsoft/mxc-sdk/v1';

const request: ContainerRequest = {
  command: 'node -e "console.log(\'hello from container\')"',
  network: { egress: { default: 'deny' } },
  timeoutMs: 30_000,
};

const child = await spawn(request);
```

请求至少要给 `command`；`network`、`timeoutMs` 是示例中出现的字段。更完整的可运行样例见仓库 `samples/run-with-io-stdio-streaming/`，API 参考见 `docs/api-reference/`。

预期结果：模型生成的代码在沙箱容器里执行，stdout 可回收；出站默认 deny，超时 30 秒。

**47. 对照运行平台选择后端**

| Runtime platform | Default backend | Other backends | Minimum host OS |
|---|---|---|---|
| Windows 11 x64 / ARM64 | `processcontainer` | `windows_sandbox`\*, `wslc`, `microvm`\*, `hyperlight`\*, `isolation_session` | [Windows OS-version support](docs/backends/process-container/os-version-support.md)|
| Linux x64 / ARM64 | `bubblewrap` | `lxc`, `microvm`, `hyperlight` | - |
| macOS ARM64 / x64 | `seatbelt` | - | - |

带 \* 的后端为 experimental。各后端的前置条件与行为见 `docs/backends/`。

预期结果：你知道自己平台上默认走哪个后端，以及哪些后端只是 experimental。

**48. 跑三组用例验证隔离有效性（最小试用）**

在 Linux 或 macOS 上用 Node SDK：

1. 安装 `@microsoft/mxc-sdk`，照第 46 步的 Node 片段写脚本：`command` 换成一端模型生成的短脚本，保留 `network: { egress: { default: 'deny' } }` 与有限 `timeoutMs`（示例为 30_000）。
2. 跑三组用例：
   - (a) 只读写允许目录的脚本——应成功并回收 stdout；
   - (b) 尝试写被拒路径的脚本——应失败；
   - (c) 尝试出网的脚本——应失败。
3. 对 (b)(c) 的失败用 `wxc-exec.exe --debug config.json` 打开诊断，确认是策略拒绝而非环境没搭好；若要给可信工具补权限，走 `docs/logging-access-denied.md` 的 deny-and-record，不要用 `--audit`。

预期结果：越权用例被拦，合法用例成功，诊断能区分策略拒绝与环境问题。

**49.（替代路线）用平台专用 executor 二进制测试**

平台专用 executor 二进制（如 `wxc-exec.exe`）接受 `schemas/stable/` 定义的稳定 schema 的 JSON 容器创建请求，用于测试，或 SDK 无法嵌入应用时。

预期结果：不写 SDK 也能按同一份 schema 发起容器请求。

**50.（仅在开发 MXC 时）源码构建**

前提：仅在开发 MXC、修改原生运行时、或想用独立 executor 二进制而非打包 SDK 时。构建前置条件：Rust（由 `src/rust-toolchain.toml` 固定为 1.93）、Node.js 24 或更高版本与 npm、所选后端要求的平台工具链与前置条件。

```bash
build.bat --all             # Windows: Release build for current architecture
```

```bash
./build.sh --all            # Linux: Release build
```

```bash
./build-mac.sh --all        # macOS: Release build for native architecture
```

预期结果：得到 Release 构建产物。

**51. 需要持久隔离环境时用状态感知生命周期**

provision → start → execute → stop → deprovision（概述见 `docs/container-lifecycle.md`），SDK 提供一次性与状态感知两类 API。

预期结果：容器可跨多次执行保持状态，而不是每次重新起。

**52. 遥测默认关闭，想开需同时满足条件**

需同时满足运行级 opt-in、Windows 用户明示同意、管理策略允许、应用在容器请求中启用遥测选项；管理员只能阻止、不能代用户同意；非 Windows 平台为 no-op，本地开源构建不向 Microsoft 发送。

预期结果：你明确知道遥测何时会开、何时不会。

**怎么选（做法 A / 做法 B / 做法 C / 做法 D / 做法 E / 做法 F）：**

- 账户写操作、不可逆或 blast radius 大的动作：走做法 A 第 6 步，逐条同步确认。六项门控是硬约束，缺 ceilings 即禁止写入，v2 不支持永久删除。
- 可模拟、可回滚、需要连续推进的动作：走做法 B 第 13 步，先本地模拟让 agent 排队推进，人离线，回来批量批准。
- 本地代码仓库的改动：走做法 C。它把「谁能写、写哪些文件、核准前存还原点、越界就还原」夹住；Claude 全程只读规划与复审，Codex 只在核准后 `workspace-write` 执行工作卡明列的文件。比 A 更省去逐条 diff 门控的配置，比 B 多了 git 还原点；但只支持 macOS、界面繁体中文、当前只有 Claude+Codex 两位成员。
- 想验证「默认拒绝 + 语义策略 + 凭证注入 + 决策记录」这条通用设计，且手上有 Apple silicon Mac：走做法 D，但只当可行性验证，不当生产标准。D 比 B/C 更底层：在 agent 进程之外判定 allow/deny，凭证不交给 agent，决策写 OTLP JSON；但 Preview、只支持 macOS Apple silicon、配置写法在外链文档，原文只提供安装和构建命令。
- 想把模型生成的代码放进沙箱执行并回收结果，且平台是 Linux/macOS（或 Windows），愿意按平台挑后端、调策略：走做法 F，先做最小试用验证越权用例被拦。它比做法 D 更偏向“嵌入你的应用”的 SDK 形态，跨平台且后端可选；但原文未给出完整策略 JSON 示例与接入 agent 主循环的做法，只到 try 级。与做法 D 的差别：D 是 Strands Box（macOS Apple silicon、Dogwood 语义策略、agent 沙箱），F 是 MXC（跨平台、多后端、SDK 依赖，编译进你的应用）。两者都还在 Preview/验证阶段，不要直接当生产标准。
- 会话必须在云上、项目与工具链必须在 Windows 本机：走做法 E。它改变的是 Claude Code 的执行位置边界，会话在云服务器、命令落到本机 Windows 执行，复用官方 Claude Code 的审批与上下文管理；但**它不是沙箱**，只有隧道 + 端口最小放行 + 凭据管理三层，服务凭据等同于完全控制权，且只宜单用户自用。要真正的隔离，用做法 D 的设计思路；要在本机做可回滚的代码改动，用做法 C；要把模型生成代码放进沙箱执行，用做法 F。
- 拿不到 Apple silicon 机器或 Bedrock 模型访问时，不要强行套用，退回借鉴设计：默认拒绝、凭证注入、决策记录三件事本身是通用的。
- 只读审计与报告：两者都不触碰目标，直接按做法 A 第 2–4 步做；想验证权限链路，再用做法 B 第 10–13 步本地跑一遍，或用做法 C 第 16–18 步在小仓库上跑一轮，或用做法 D 第 24–31 步做一次沙箱可行性验证，或用做法 E 第 35–44 步在非关键项目上跑一次跨机器执行，或用做法 F 第 45–48 步跑一次模型生成代码的沙箱执行。
- 差异要认清：做法 A 是「人看过 diff 才放行」的同步审批；做法 B 是「先给 agent 模拟结果、人稍后批量裁决」的异步审批；做法 C 是「逐张工作卡同步核准 + 核准前 git 还原点 + 沙箱执行」的同步审批；做法 D 是「操作系统隔离 + Dogwood 语义策略默认拒绝 + 凭证注入 + OTLP 决策记录」的底层沙箱；做法 E 是「云端会话 + 反向 SSH 隧道落到本机执行 + 端口最小放行」，没有沙箱层，审批沿用 Claude Code 自身机制；做法 F 是「SDK 嵌入应用 + 多后端容器隔离 + egress 默认 deny + 超时」的代码执行沙箱。原文对异步审批只给主张，没有效果数据；ai-meeting-room 也没有量化效果数据；Strands Box 同样没有效果指标或前后对照数据；cc-desk-tunnel 的 README 也只提供用量侧的额度、重置时间和调用统计；MXC 原文没有给出性能数字、对比基准或落地案例。

## 怎么判断变好了

六份材料都没有给准确率、节省工时、误报/漏报率这类结果数据，所以只能看过程信号：

claude-ads 侧：

- 审计 run 产出的 findings 是否带日期证据和显式置信度。
- 报告是否为版本化 JSON run bundle，MD/HTML/PDF 是否同源渲染。
- 证据覆盖率是否 ≥80%（可评级）；60–79% 只能算暂定；低于 60% 视为证据不足，别急着下结论。
- `/ads status` / `/ads next` 是否稳定给出当前状态和最高优先级阻塞项。
- 写操作是否一直停在草案，直到六项门控齐备才放行。
- 发布侧四条硬规则是否被守住：无来源即无平台主张；无实现+fixture+测试即无 capability 主张；无审批与回滚即无账户变更；无独立验证即无发布。

Cloudflare OS 侧：

- 从下提示词到拿到可用产出，需要你中途介入几次；接入真实资源后是否仍需同步守着点确认。
- 审批能否真的延后批量完成：你离开一段时间后回来，agent 是否已经基于模拟结果继续推进了后续步骤，而不是卡在第一步。
- Gatekeeper 日志能否让你复盘 agent 对外的每一个动作、以及它被限定在了哪个具体资源上——这正是「最小权限 + 可审计」是否落地的检验。
- 同一任务换通用编码 agent 跑一次，对比 token 消耗、失败次数与返工量。原文声称同一底层模型在该平台上更快更好、token 更少，这是作者主张，需自行验证。

ai-meeting-room 侧：

- 会议结束后是否产出 `meetings/` 里的 markdown 决议。
- 每次核准前是否成功存 git 还原点，夹标旁绿色 `GIT` 是否表示还原点可正常运作；按「回到执行前」能否一键回复。
- Codex 是否只写工作卡明列的文件；越界时是否停下来并还原本次变更。
- 风险分级是否合理：低=只新增文件或改样式；中=会动到现有功能；高=删档、装套件、部署。
- 模型被替换时，设定区与会议纪录是否写明换成了什么；原模型恢复后是否自动换回，设定未被改。
- 唯读讨论失败是否自动换模型重试一次；会改档的工单是否不自动重跑、提示人按「重试」。
- 程序侧 `node --test test/*.test.js` 是否通过；环境检查是否显示 `claude` 和 `codex` 版本号。

Strands Box 侧：

- 拒绝有效性：让 agent 访问未授权路径或发未 `permit` 的请求，确认被实际拒绝（不是靠提示词约束）。
- 记录完整性：`<box_dir>/private/telemetry/records.jsonl` 中对每次受检查操作都有 OTLP JSON 记录；把记录条数与 agent 实际发起的调用对照，看是否有漏记，尤其确认直接授权的文件操作确实不出现在 Dogwood 决策里。
- 凭证不外泄：确认 agent 侧拿不到底层 secret，同时经网关签名的请求仍然成功。
- 时序规则生效：复现 README 举的场景——一次文件读之后，网关拒绝后续出站 HTTP——看是否与描述一致。
- 工作方式改善：挑一件原本因风险不做、需要人工逐步审批的 agent 任务，交给 Box 后比较是否能无人值守完成；出问题时能否从决策记录定位到是被哪条规则拒绝。
- 以上任一条在本机无法复现，就不宜按「可照做」写入手册，只保留其沙箱设计思路。

cc-desk-tunnel 侧：

- 功能可达性（可客观验证）：Claude 能否在客户端里成功读写你指定路径的本机文件、并在本机执行命令且看到输出。
- 执行位置是否正确：编译、测试等命令确实在 Windows 本机跑，而不是在服务器上跑。
- 边界是否守住：Windows 一侧没有放行任何入站端口；本机 SSH 服务只监听回环地址、随连接启停；试完断开后本机没有常驻服务。
- 凭据是否管住：服务凭据只存在密码管理器里，没有被截图或贴到聊天/issue；需要更换时能在服务器上执行 `manage.sh token`。
- 指纹来源是否可信：证书指纹来自你自己登录服务器看到的安装汇总，而不是别人转发的消息。
- 数据外流是否知情：你清楚会话记录和 Claude 登录凭据留在服务器上、备份文件同样含密，并且确认服务器所在地在 Anthropic 支持的国家和地区。
- 材料没有给出「工作效果是否改善」的指标、基准或对比数据；用量侧只能看客户端的额度、重置时间和调用统计。

MXC 侧：

- 隔离有效性：越权用例（写系统路径、联网、读敏感文件）被拦比例，目标 100%；同时记录合法用例被误拦的比例与策略返工次数。
- 可用性：合法工作负载首次运行成功率、修策略后成功率、单次执行延迟与资源占用（与直接在宿主执行对比）。
- 集成效果：接进「生成代码 → 隔离执行 → 回结果」的循环后，任务端到端成功率、超时/拒绝后的重试次数、人工介入次数（对照不隔离或人工审查的基线）。
- 原文没有给出「是否改善了业务结果」的指标。

**最小试用方式：** claude-ads 侧全程只读、不触碰账户，只挑一个广告平台，依次跑 `/ads setup` → `/ads audit` → `/ads report` → `/ads next`，看它能不能给出带证据和置信度的 findings，以及 next 指出的阻塞项是否合理。Cloudflare OS 侧：装好 pnpm → `pnpm run-local` → 打开 http://localhost:8787 → 跑「做 slides」和「建协作白板应用」两条提示词 → 再配置一个真实资源（GitHub repo 或 Google Doc 选一个），走完「引入资源 → agent 请求权限 → 审批队列 → 批量批准」的完整链路。ai-meeting-room 侧：在一个无关紧要的小仓库上，下载解压 → 双击 `start.command` → 完成设定精灵 → 浏览器打开 `http://127.0.0.1:4477` → 用白话提一个小改动 → 等 Claude 规划、Codex 列卡 → 逐张核准（注意先存还原点）→ 看 Codex 是否只写列出的文件 → 按「回到执行前」验证回滚 → 结束并产出决议。Strands Box 侧：在一台满足前提的 Apple silicon Mac 上执行下载与 `--version`，确认二进制可运行；按 `docs/user/getting-started.md` 写出最小 `box.toml` 和 `policy.dw`，启动 box，跑 `examples/strands-box/strands-sdk-agent/` 示例；只做一件事：把示例 agent 的一次操作从「直接授权」改成「经解释器 + 策略检查」，体会边界差别。cc-desk-tunnel 侧：限定在两台机器、一个非关键项目——云厂商安全组里只允许自己的出口 IP 访问 8787 和 7000，服务器上跑一次安装脚本（凭据只进密码管理器），Windows 上装客户端填入三项信息并连接，登录 Claude，只添加一个不重要的测试项目目录，让 Claude 读取一个本机文件并汇报内容、再在本机执行一条无害命令（例如查看目录、跑一次项目单元测试），试完断开连接并确认本机无常驻服务、SSH 监听已停止。MXC 侧：Linux 或 macOS + Node SDK，安装 `@microsoft/mxc-sdk`，照 README 的 Node 片段写脚本，跑三组用例（允许目录读写、被拒路径写入、出网），用 `wxc-exec.exe --debug config.json` 诊断失败原因。

**试多久：** claude-ads 的材料在「怎么试」一节被截断，没有给出建议时长。Cloudflare OS 原文建议最小试用控制在半天内。ai-meeting-room 原文没有给出建议时长；建议至少跑通一轮完整会议，并故意制造一次越界或失败，看还原与重试行为是否符合预期。Strands Box 原文没有给建议时长；先做一次可行性验证，不要直接进生产。cc-desk-tunnel 原文也没有给建议时长；材料里那段「怎么试、怎么验证」在「判断有没有改善的指标」处被截断，建议按第 44 步限定一次会话、试完即断开。MXC 原文没有给建议时长；先做一次可行性验证（跑通三组用例），不要直接进生产。合起来的建议：单平台只读一轮，加半天本地权限链路验证，再决定要不要扩到更多平台、更多服务或跨机器执行。调研结论本身的建议是「小范围试而非全面采用」；cc-desk-tunnel 的结论同样是「在一台自己可控的云主机 + 一台 Windows 上小范围试」；MXC 的结论同样是「小范围试」——在 Linux/macOS 上用 Node SDK 按 README 的片段以 egress 默认 deny + 超时启动容器，跑一段模型生成代码并回收 stdout，先验证越权用例确实被拦。

## 常见坑

- 把远程安装脚本直接管道进 shell。原文明确不要；改用宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档。
- 旧 marketplace 别名没清。v2.0.0 之前加过的话，本地别名 `agricidaniel-claude-ads` 是陈旧的，必须先 remove 再 add。
- 以为出了 diff 就能改账户。缺 ceilings 等于禁止写入；六条门控缺一不可；v2 不支持永久删除。
- 预先挂上一堆 MCP server、让所有服务在整个会话里都「在场」。Cloudflare OS 原文反对这种做法，改成默认零权限、按当次任务引入单个资源。
- 把所有有副作用的动作都卡在第一步同步等确认。原文认为不如「先模拟、后批量批准」，但前提是你能接受 agent 在模拟结果上继续推进。
- 用 `--dangerously-skip-permissions` 自动放行。原文把它列为异步审批要替代的另一种坏做法。
- 把 unknown 当扣分项。unknown 只降低证据覆盖率，不改变已确定的健康度。
- 覆盖率不够就下结论。低于 60% 是证据不足，60–79% 只是暂定。
- 把 partial run 当完整审计。某平台失败会被排除出组合评分并使该次 run 变为 partial；按原文的协作约定，必需的 worker 失败即让整次 run 变为 partial，绝不悄悄当成完整审计。
- 凭证乱放。必须放环境变量、OS keychain 或经批准的 secret manager，不得进入仓库、profile、报告或日志。接入外部服务时，OAuth client 凭据也要自备，别指望服务商简化流程。
- 把仓库自述当成已验证结果。见「证据与来源」。
- 指望监控自动触发。原文提到 `/ads monitor`（节奏、投放、追踪、疲劳、政策、表现），但没有给出定时器、事件或状态触发的具体机制；Cloudflare OS 原文也没有给出由时间、事件或状态触发并持续执行任务的机制，唯一相关的是审批异步化，那是「不中断」，不是「自动触发」。cc-desk-tunnel 的定时任务是时间触发，README 未给出事件/状态触发机制。
- 以为 Cursor / goose 有现成适配。原文只把它们列为 watch 级，没有具体步骤或适配说明。
- 以为 12 个平台适配质量一致。本次材料无法判断各平台适配是实测通过还是仅有 fixture。
- 解释器不对。托管依赖只支持 CPython 3.11/3.12 且限于声明的 wheel 矩阵；不支持的解释器会在改动目标位置之前失败。
- 把 `pnpm run-local` 当生产环境。原文明确它不适用于生产，数据存在 `.wrangler` 子目录。
- 现在就把整套 Cloudflare OS 当生产平台上线。它处于 early access、自建服务器部署文档标注 COMING SOON、无 SLA。可直接拿走的是第 12、13 步的权限与审批模式，移植进你现有的 agent 工作流。
- 想改造 Cloudflare OS 上游。仓库不接受外部大改动贡献，超过十几行的 PR 会被关闭。
- 把 `0.0.0.0` 当方便。ai-meeting-room 原文明确不要设定路由器转发或公开反向代理，也不要把监听位址改成 `0.0.0.0`；手机入口只接受 Tailscale 网段（100.64.0.0/10），填错会直接不开放。
- 只关分页就以为登出了。登录八小时后、按登出、或服务器重启后都要重新登录；只关分页不会立刻撤销登录。
- 在会议室里直接打开 HTML、SVG 这类会执行程序的附件或交件档。原文明说一律改成下载。
- 用 `npm run dev` 跑核准工作。原文警告监视器会把 Codex 执行到一半的工作砍掉。
- 以为 Claude 或 Codex 会产图。需要图片素材时右栏会出现「等你交件」卡片，写清尺寸、格式、数量、档名和存放路径；单档上限 25MB，同名档不会被覆盖；自己放好后按「我自己放好了」，确认档案存在才让 Codex 接手。
- 把新模型自动升级。CLI 新列出的模型会标成「待你开放」，按「开放」才会被使用；选定模型若本次未提供，会暂时改用最接近且不比原本高阶（不会更贵）的模型，原模型恢复后自动换回，设定不会被改。若剩下的模型都比原本高阶，会停下来请你在设定里选，不会自己升级。
- 把唯读失败和写工单失败一视同仁。唯读讨论会自动换模型重试一次；会改档的工单不会自动重跑，改成提示你按「重试」。
- 把会议室的 git 锁当作死局。还原点建不起来、说 .git 被锁住时，在项目资料夹执行 `rm -f .git/*.lock .git/objects/maintenance.lock` 再按一次核准。
- 以为 ai-meeting-room 有量化效果数据。原文没有 benchmark、用户案例或量化结果；先在小仓库验证。
- 把 Strands Box 当生产标准。README 明确标注 Preview，当前只支持 macOS Apple silicon 上的本地执行；仓库 63 stars 只说明热度。
- 非 Apple silicon 或不满足前提还硬套。前置是 Apple silicon Mac、macOS 15+、Homebrew Node.js 22.21+、`us-west-2` Bedrock Claude Opus 5。
- 以为直接文件系统授权会产生 Dogwood 决策。`box.toml` 里的直接文件系统授权由 OS 执行，不产生单条 Dogwood 决策；要让策略管到文件操作，必须走解释器，并把这些文件排除在直接授权之外。
- 以为原文给了 `box.toml` / `policy.dw` 的字段或示例。没有；getting-started、security、policy、architecture 全在外链 `docs/` 里，本次材料未包含。
- 把默认拒绝、permit 覆盖、forbid 优先、文件读影响后续 HTTP 放行当已验证。原文只有文字描述，没有附测试、日志或案例数据。
- 以为凭证注入已验证 agent 拿不到 secret。这是设计声明，没有给出验证方式；需要自己按「凭证不外泄」指标试。
- 忘了把 helper 二进制放在同一目录。下载路线是 `./box-core`；源码构建路线是 `./target/release/strands-box` 与 helper 同目录。
- 把 cc-desk-tunnel 的服务凭据当普通密码。作者原话：服务凭据等同于完全控制权，拿到它的人可以使用你的 Claude 账号，并在你电脑上执行任意命令；用脚本自动生成的随机凭据，不要改成短口令、不要截图或贴到聊天/issue；泄漏后在服务器上执行 `manage.sh token` 更换。
- 以为 cc-desk-tunnel 是沙箱。Claude 能访问你的 Windows 用户能访问的一切，而不只是项目目录；项目边界只靠提示词引导 + Claude Code 自身审批机制。
- 在共用或来路不明的服务器上部署 cc-desk-tunnel。服务器被攻陷等于你的电脑被攻陷；连接期间服务器能以你的 Windows 用户身份执行任意命令。
- 以为 Docker 发布的端口会受 `ufw` 规则限制。来源限制请在云厂商安全组做，只允许你自己的出口 IP 访问 8787 和 7000。
- 以为「通往 Windows 的 SSH 映射端口」需要放行。它只监听容器内部回环地址、未发布到服务器，不对外暴露，也不需要也无法放行；但服务器防火墙全部放行会把它的其他服务（例如 SSH）一起暴露。
- 只凭「它是 frp」就当误报放行。README 强调先确认安装包来自本仓库发布页、对照 `SHA256SUMS` 校验、查看具体被拦截的文件，确认来源后只对已核验的组件文件设置必要的例外；不建议关闭杀毒软件或排除整个磁盘。
- 以为 cc-desk-tunnel 服务器需要高配。「2 核 1 GB 入门机型就能运行」是作者陈述，无实测数据；只有你打算让 Claude 直接在服务器上编译或跑重负载时，才需要按那些任务选服务器配置。
- 账号合规想当然。服务器所在地即使用地点，需位于 Anthropic 支持的国家和地区；README 明确指出条款限制第三方产品提供 Claude.ai 登录或代为使用订阅额度，技术上能用不代表获得许可，拿不准时改用 API key。
- 想把 cc-desk-tunnel 多用户共用。它是单用户自用：一个服务对应一个使用者、同一时间一台在线 Windows 设备，没有多用户、权限分级或租户隔离。
- 以为安装包有代码签名。没有；首次运行会遇到 SmartScreen 提示（「更多信息 → 仍要运行」）。
- 证书指纹从别人转发的消息里拿。自签证书时，指纹应来自你自己登录服务器看到的安装汇总。
- 忘记数据会离开本机。Claude 读取的文件片段和命令输出会经服务器发往模型服务；服务器上保存会话记录和 Claude 登录凭据，备份文件同样含这些秘密。
- 以为定时任务有文档化的提示词模板或配置字段。README 未给出，需在客户端里实际操作确认。
- 把 `--audit` 用于不可信代码。原文字面警告：`--audit` 会关闭被分析工作负载的全部沙箱安全，绝不能用于不可信代码；给不可信代码补权限应走 `docs/logging-access-denied.md` 的 deny-and-record 流程。
- 以为原文给了完整策略 JSON 示例。没有；需按 README 指向的 `docs/backends/`、`docs/api-reference/`、`schemas/stable/` 继续查证。
- 以为原文给了把 MXC 接进 agent 主循环的做法（超时后如何处理、结果回收格式、重试）。没有；需自行查证或实现。
- 把 experimental 后端当稳定生产。`windows_sandbox`、`microvm`、`hyperlight` 原文标注为 experimental。
- 忘了原生 executor 默认把 stdin/stdout/stderr 留给工作负载。MXC 自身的诊断要显式用 `--debug` 打开。
- 源码构建环境不对。Rust 由 `src/rust-toolchain.toml` 固定为 1.93；Node.js 24 或更高版本与 npm；所选后端要求的平台工具链与前置条件。
- 遥测想开就开。需同时满足运行级 opt-in、Windows 用户明示同意、管理策略允许、应用在容器请求中启用遥测选项；管理员只能阻止、不能代用户同意；非 Windows 平台为 no-op。
- 把「跨平台」「后端清单」「遥测默认关闭」当已验证。这些均为项目自述，无第三方验证数据。

## 证据与来源

**依据六份材料：** AgriciDaniel/claude-ads 仓库 README 首页（版本号 v2.0.2）；cloudflare/cloudflare-os 仓库 README（当前是 v2，基于 v1 经验重写，定位 early access）；sojei1989/ai-meeting-room 仓库 README（Apache License 2.0，macOS 本机开源应用，作者自述是平面设计师、不写程序、工具是他自己每天在用的）；strands-agents/box 仓库 README（自述 Preview，当前只支持 macOS Apple silicon 本地执行，63 stars）；sun168567/cc-desk-tunnel 仓库 README（Apache-2.0，约 39 stars，公开客户端、服务端和构建部署脚本，自述主要由 AI 编写、个人维护、没有经过专业的安全审计，与 Anthropic 无隶属或合作关系）；Microsoft MXC 仓库 README（source_note 为「依据仓库 README」，属项目一手文档）。

**可以直接照抄的部分：**

- claude-ads：插件与脚本安装命令、`install.sh` / `install.ps1` / `uninstall.sh` 用法、完整命令表、12 平台清单、写操作六条门控、评分阈值（80%/60%）、release 四条硬规则、开发与校验命令；贡献者表列出带 issue/PR 编号的社区反馈（如 #65、#53、#17/#18、#56、#57、#61、#66 等），说明有真实使用与缺陷修复痕迹。
- Cloudflare OS：`pnpm run-local`、http://localhost:8787、五条官方提示词、11 个 gatekeeper 包路径清单、`pnpm dev-server` / `pnpm dev-client` 与 http://localhost:3000、部署入口与部署模板仓库、自建服务器部署标注 COMING SOON、OS 概念映射表（kernel=`packages/workshop-backend`、device drivers=`packages/gatekeeper-*`、shell=`packages/workshop-frontend`、processes=gadgets、executables=blueprints、ACLs=shared permissions）。
- ai-meeting-room：安装步骤（`start.command`、`npm start`、`http://127.0.0.1:4477`）、沙箱参数（`--sandbox read-only` / `--sandbox workspace-write`）、档案路径（`.secrets/passcode.txt`、`.secrets/telegram-token.txt`、`.secrets/telegram-chat-id.txt`、`.secrets/gemini-api-key.txt`、`public/assets/sfx/yes-my-lord.mp3`、`meetings/`）、风险分级、核准与还原规则、模型发现与费用护栏、白话解释降级链、测试命令 `node --test test/*.test.js`、打包命令 `node scripts/build-release.mjs --platform mac --out dist/ai-meeting-room-mac.zip`。
- Strands Box：下载脚本与 `./box-core/box --version`；Cargo workspace 构建命令、`just` 四个任务、`cargo test --workspace --all-features` 与 `test-support` 的关系；两个配置文件名与分工；策略 skill URL；决策记录默认路径；示例目录路径；架构描述（Dogwood Local Engine 与执法组件跑在 agent 沙箱之外的独立进程里）。
- cc-desk-tunnel：服务端部署命令 `sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/sun168567/cc-desk-tunnel/main/deploy/install.sh)"`；安装脚本会做的四件事；默认放行端口 8787 与 7000；三行端口与放行/保护方式对照表；作者给出的「必须知道的四件事」；杀毒软件与 SmartScreen 处理建议（含 `SHA256SUMS` 核对）；源码构建与本地开发命令（`npm ci`、`npm run dev`、`npm test`、`npm run package:windows`、`npm run package:server`）；仓库结构（`apps/desktop/`、`apps/server/`、`packages/protocol/`、`deploy/`、`scripts/`、`docs/`）；`manage.sh token` 更换凭据；`config/provider.json` 配 API key；证书指纹来源要求。
- MXC：安装包管理器（`@microsoft/mxc-sdk`、`mxc-sdk`、`Microsoft.Mxc.Sdk`）；Node 片段（`spawn`、`ContainerRequest`、`network: { egress: { default: 'deny' } }`、`timeoutMs: 30_000`）；诊断命令 `wxc-exec.exe --debug config.json`；审计命令 `wxc-exec.exe --audit policy.json` 及原文字面警告；后端表；源码构建命令（`build.bat --all`、`./build.sh --all`、`./build-mac.sh --all`）；遥测默认关闭的条件。

**只是作者主张、没有佐证的部分：**

- claude-ads README 全部为仓库自述。没有任何第三方评测、审计准确率、节省工时、误报/漏报率等结果数据；安全门控和 release 规则是作者设定的规则，未附验证结果；「确定性评分 / 确定性报告」也是自述，无对照数据。贡献者一节自己也声明「部分提案被独立实现或取代，署名不代表每个补丁都被合并」。
- Cloudflare OS：同等模型下该平台编码 agent 更快更好更省 token；沙箱让「slide 应用有安全漏洞泄露你的 slides 给攻击者」不可能发生；Blueprint 模式代表云软件传统作法的转变；传统操作系统「应当」对 AI agent 特殊对待。这些都无数据或第三方验证。仓库指标 10473 stars（当日 +84）只说明热度。
- ai-meeting-room：原文是 README 级别的作者自述系统设计与操作流程，没有 benchmark、用户案例或量化结果；可核对的事实性材料包括安装步骤、沙箱参数、档案路径、风险分级、核准与还原规则、模型发现与费用护栏、白话解释降级链、测试与打包命令，但「改善了多少」没有数据。
- Strands Box：`box.toml` 的字段写法和 `policy.dw` 的规则示例都没有给出，getting-started、security、policy、architecture 全在外链 `docs/` 里；「默认拒绝」「permit 覆盖、forbid 优先」「文件读会影响后续 HTTP 放行」都是文字描述，没有附测试、日志或案例数据；「凭证注入让 agent 拿不到 secret」是设计声明，没有给出验证方式；没有效果指标或前后对照数据。63 stars 只说明热度。
- cc-desk-tunnel：「服务器不需要高配，2 核 1 GB 入门机型就能运行」是作者陈述，无实测数据；「本机桌面应用的输入、滚动和复制比远程桌面/SSH 终端更好」「多项目多会话更好管理」是作者对体验的判断，无对比数据；「不改官方本体、不做对抗」是自我描述，未附审计报告；README 只提供用量侧的额度、重置时间和调用统计，没有任何「工作效果是否改善」的指标、基准或对比数据。约 39 stars 只说明热度。
- MXC：「跨平台」「后端清单」「遥测默认关闭」等均为项目自述，无第三方验证数据；原文未给性能数字、对比基准或落地案例。

**材料本身的局限：**

- claude-ads：输入只有仓库 README 首页，不含各 skill 的实际提示词内容、`scoring.py` 实现、capability manifest 明细，因此无法核验评分与门控是否如其所述，也无法确认各平台适配是实测通过还是仅有 fixture；「怎么试、怎么验证」一节在材料中被截断，完整试用步骤无法从材料中得到。
- Cloudflare OS：没有给出任何一条 gatekeeper 的具体 OAuth 配置步骤（只有链接），且原文承认服务商有意不简化 OAuth 申请；自建服务器部署文档标注 COMING SOON；Gatekeeper 服务独立部署「细节尚未确定」，目前只能与 OS 实例一起部署；没有任何任务完成质量、耗时、成本的对照数据；原文也没有给出定时、事件或状态触发的自动推进机制。
- ai-meeting-room：只支持 macOS；界面是繁体中文；目前只有 Claude（规划）+ Codex（执行）两位成员，Gemini CLI 等是后续方向；原文没有给出「改善了多少」的量化数据。
- Strands Box：非 Apple silicon 或不满足模型访问条件的环境无法照做；Preview 阶段接口和文档可能变动；策略与配置的具体写法全在外链文档里，原文只提供安装和构建命令。
- cc-desk-tunnel：只有仓库 README 一份材料，且「怎么试、怎么验证」一节在「判断有没有改善的指标」处被截断，完整试用步骤无法从材料中得到；文档目前只有中文；不是沙箱；服务凭据等同于完全控制权；数据会离开本机；单用户自用、没有多用户、权限分级或租户隔离；账号合规需自行确认；frpc/frps 容易被杀毒软件和云厂商安全组件告警；部署依赖 Docker，镜像在服务器上从源码构建；脚本不代装系统软件、不改防火墙/nginx/SSH 配置，这些都需你自己完成。
- MXC：完整策略 JSON 示例、把 MXC 接进 agent 主循环（超时后如何处理、结果回收格式、重试）的做法、各后端实际隔离强度对比未给出；需按 README 指向的 `docs/backends/`、`docs/api-reference/`、`schemas/stable/` 继续查证；`windows_sandbox`、`microvm`、`hyperlight` 标注为 experimental；`--audit` 会关闭被分析工作负载的全部沙箱安全，绝不能用于不可信代码；审计模式仅在部分 Windows 版本可用；源码构建要求 Rust 1.93（由 `src/rust-toolchain.toml` 固定）、Node.js 24+。

**与已有工具做法的关系：** claude-ads 把 Claude Code 作为规范运行时，安装直接走 Claude Code 插件市场（`/plugin marketplace add`、`/plugin install`），本身是 Agent Skills 形态的实例（`ads/SKILL.md` 契约、`ads/`、`skills/`、`agents/` 目录结构，独立安装与插件命名空间 `/ads` 对 `/claude-ads:ads` 加载同一契约）；Cursor、goose 在原文里只列为 watch，仅说明可消费同一批 skill 文件。Cloudflare OS 的 Gatekeeper 原文自称「增强版 MCP server」，与「预先挂上所有 MCP server 让服务全程在场」相对；它也能跑在开源 `workerd` 上、不必绑定 Cloudflare 云，但这一点同样只有原文自述。ai-meeting-room 可以看作 Claude Code 的一种落地用法：让 Claude Code 只做只读的规划与复审，执行交给另一个 CLI（Codex），并用核准卡 + git 还原点把写权限夹住；它没有替代 Claude Code，而是补上了「谁执行、谁核准、怎么回滚、模型换代怎么办」这几层。Strands Box 是 harness-agnostic 的沙箱引擎，把操作系统隔离和 Dogwood 语义策略结合，默认拒绝，凭证由网关注入，决策写 OTLP JSON；适合作为做法 B/C 更底层的补充验证，但仍是 Preview。MXC 在本次清单中没有相关条目。它是 harness-agnostic 的沙箱化代码执行系统，把多种隔离后端统一在同一个 containment 模型与带类型的 SDK 之后；适合作为做法 D 更偏“嵌入应用”的补充验证，但原文未给出接入 agent 主循环的做法，且仍是 try 级。cc-desk-tunnel 与 Claude Code 的关系很直接：它不修改 Claude Code 本体，是官方 Claude Code 与官方 Agent SDK 之上的一层胶水，官方 CLI 与 Agent SDK 仍由官方渠道安装、按 Anthropic 条款使用；它改变的是 Claude Code 的执行位置边界——会话在云端服务器、命令落到本机 Windows 执行，从而复用已有的 Claude Code 采用方式（审批、上下文管理、会话记忆都不变），只把「在哪里执行」这一环拆开。换句话说，它是 Claude Code 的一个部署拓扑扩展，而不是替代品；与做法 C 的差别是 C 用两个 CLI + 工作卡 + git 还原点把写权限夹住，E 只有一个 CLI，靠隧道 + 端口最小放行 + 凭据管理；与做法 D 的差别是 D 有操作系统隔离与语义策略默认拒绝，E 明确不是沙箱；与做法 F 的差别是 F 是代码执行沙箱（SDK 嵌入应用、多后端容器隔离），E 是跨机器执行拓扑（没有沙箱层）。

## 依据的调研

- [AgriciDaniel/claude-ads](../research/radar/2026-10-01/580-agricidaniel-claude-ads.md)：值得一试，可按 README 原样安装 Claude Code 插件，先在一个广告平台上跑只读审计（/ads setup → /ads audit → /ads report → /ads next），把它当作「AI 操作 + 权限门控 + 确定性验证」的落地模板照搬；理由是原文给出了可直接复制的安装命令、完整命令表、评分阈值和写操作六道门控，但适用面限于付费媒体、效果只有仓库自述，因此建议小范围试而非全面采用。
- [cloudflare/cloudflare-os](../research/radar/2026-10-04/1062-cloudflare-cloudflare-os.md)：值得一试，先在本地跑 `pnpm run-local` 体验，重点把 Gatekeeper 的「按任务引入资源 + 有副作用动作延后批量审批」这套权限流程抄到自己的 agent 工作里，不要照搬整套平台；理由是它仍是 early access、自部署文档未完成，但权限与审批的具体做法可立即小范围验证。
- [sojei1989/ai-meeting-room](../research/radar/2026-10-08/1867-sojei1989-ai-meeting-room.md)：值得一试，建议小范围试装这套「只读规划 + 核准后写入 + 核准前 git 还原点」的双 AI 协作流程，因为它把权限边界、风险分级和回滚都做成了可直接照做的配置；但它是作者个人项目、只支持 macOS、界面仅繁体中文，且没有效果数据，所以先在一个无关紧要的小仓库上验证再决定是否长期用。
- [strands-agents/box](../research/radar/2026-10-08/1929-strands-agents-box.md)：值得一试，可在 Apple silicon Mac 上小范围试：按 README 给的下载/构建命令装起 Strands Box，用 box.toml 控直接访问、policy.dw 写默认拒绝策略，安全地把执行、读写和网络能力放开给 agent；但它自述仍是 Preview、只支持 macOS Apple silicon，策略与配置的具体写法全在外链文档里，原文只提供了安装和构建命令，所以先当可行性验证而非标准做法。
- [sun168567/cc-desk-tunnel](../research/radar/2026-10-08/1977-sun168567-cc-desk-tunnel.md)：值得一试，如果你的日常开发环境在 Windows 本机、又想让云端 Claude Code 直接在本机读写文件并执行命令，可以照 README 的部署流程在一台自己可控的云主机 + 一台 Windows 上小范围试；但它是个人维护、主要由 AI 编写、未经安全审计的工具，等于把本机的任意命令执行权交给服务器，只能自用、且必须先读安全须知并收紧端口与来源。
- [MXC - a sandboxed code execution system](../research/radar/2026-10-09/2229-mxc-a-sandboxed-code-execution-system.md)：值得一试，建议小范围试：在 Linux/macOS 上用 Node SDK 按 README 的片段以 egress 默认 deny + 超时启动容器，跑一段模型生成代码并回收 stdout，先验证越权用例确实被拦。理由是原文给出了可安装的 SDK、可复制的调用片段和 --debug/--audit 诊断命令，但完整策略 JSON 与接入 agent 主循环的做法未给出，故只到 try。
