# 让 AI 动真实账户前：按任务发资源权限，有副作用的动作延后批量批准

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 代理要操作付费媒体账户或外部服务时，如何让它默认只读或零权限、按当次任务只拿到单个具体资源的授权，并把有副作用的动作留给人批量审批，而不是预先全开权限、也不是卡在第一步等人点确认。
> 先试这一步：先挑一个平台做全程只读的验证：/ads setup → /ads audit → /ads report → /ads next，看它能否给出带日期证据和显式置信度的 findings；想验证权限模型就再花半天本地跑一次 pnpm run-local，走完「引入资源 → agent 请求权限 → 批量审批」链路。
> 最近修订：2026-10-04

## 解决什么问题

付费媒体账户和外部服务账号都是真金白银的操作面。AI 在只读状态下做审计、计划、创意、报告没问题；一旦它能直接改账户或调用外部服务，风险就从「答案不准」升级成「账户被动了」。这篇手册给两件事：一是默认只读、产出带证据的结论，账户变更先出草案再逐条过门控（以 AgriciDaniel/claude-ads 作为可照搬的落地模板）；二是把权限模型换成更省人的一种——不再预先给 AI 挂上所有服务、也不卡在第一步等人点确认，而是默认零权限、按当次任务只引入单个具体资源，有副作用的动作先在本地模拟结果让 agent 继续推进，人稍后一次性批量批准或逐条批准（以 Cloudflare OS 的 Gatekeeper 作为可本地体验的实现）。

## 适用与不适用

**适用：**

- 你管的是付费媒体账户。覆盖 12 个平台，搜索/视频/社交：Google Ads、Meta Ads、YouTube Ads、LinkedIn Ads、TikTok Ads、Microsoft Advertising、Reddit Ads、Snapchat Ads、X Ads；商务与零售媒体：Apple Ads、Amazon Ads、Pinterest Ads。
- 手上有可授权的账户导出或读取权限。
- 你用的宿主是 Claude Code（claude-ads 原文把它作为规范运行时），或能在其他兼容 Agent Skills 的宿主里消费同一批 skill 文件。
- 你要的是「AI 起草 + 人工审批 + 确定性验证」，或更进一步「默认零权限 + 按任务授权 + 延后批量审批」，而不是「AI 直接改账户」或「预先全开权限」。
- 你能接受默认只读、写操作逐条过门控的节奏。
- 你还想把这套权限与审批模式移植到通用 agent 工作流（GitHub repo、Google Doc、Slack 等外部服务）：Cloudflare OS 的 Gatekeeper 是可直接本地体验的来源。

**不适用：**

- 非付费媒体账户运营。claude-ads 这个仓库领域很窄。
- 需要 AI 立即自动改账户、无人审批的场景。原文的设计就要求 owner 审批、幂等键与回滚。
- 装不了 Claude Code 插件、也不能消费 skill 文件的宿主。原文只在安装一节把 Cursor、goose 归类为 watch 级：它们「在其运行时支持范围内」可消费同一批 skill 文件，但没有给出任何针对这两个宿主的具体步骤或适配说明。
- 需要核验评分与门控实现细节的场景。claude-ads 的本次材料只有 README 首页，看不到各 skill 的实际提示词、scoring.py 实现、capability manifest 明细。
- 想把 Cloudflare OS 当生产平台上线：它处于 early access、当前是 v2、自建服务器部署文档标注 COMING SOON、无 SLA。
- 想改造 Cloudflare OS 上游：仓库不接受外部大改动贡献，超过十几行的 PR 会被关闭（只收可轻易验证的小修复）。

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

## 操作步骤

下面分成两套做法。做法 A 是付费媒体账户的具体落地：默认只读，写操作逐条同步过门控。做法 B 是可迁移的权限与审批模式：默认零权限，按任务只引入单个资源，有副作用的动作延后批量审批。两者不冲突，可以叠加——用 A 的审计与门控管账户，用 B 的授权与审批节奏减少人的同步盯守。

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

**怎么选（做法 A 还是做法 B）：**

- 账户写操作、不可逆或 blast radius 大的动作：走做法 A 第 6 步，逐条同步确认。六项门控是硬约束，缺 ceilings 即禁止写入，v2 不支持永久删除。
- 可模拟、可回滚、需要连续推进的动作：走做法 B 第 13 步，先本地模拟让 agent 排队推进，人离线，回来批量批准。
- 只读审计与报告：两者都不触碰目标，直接按做法 A 第 2–4 步做；想验证权限链路，再用做法 B 第 10–13 步本地跑一遍。
- 差异要认清：做法 A 是「人看过 diff 才放行」的同步审批；做法 B 是「先给 agent 模拟结果、人稍后批量裁决」的异步审批。前者更保守，后者更省人的同步时间，但要求你能接受 agent 在模拟结果上继续往下做。原文对异步审批只给主张，没有效果数据。

## 怎么判断变好了

两份材料都没有给准确率、节省工时、误报/漏报率这类结果数据，所以只能看过程信号：

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

**最小试用方式：** claude-ads 侧全程只读、不触碰账户，只挑一个广告平台，依次跑 `/ads setup` → `/ads audit` → `/ads report` → `/ads next`，看它能不能给出带证据和置信度的 findings，以及 next 指出的阻塞项是否合理。Cloudflare OS 侧：装好 pnpm → `pnpm run-local` → 打开 http://localhost:8787 → 跑「做 slides」和「建协作白板应用」两条提示词 → 再配置一个真实资源（GitHub repo 或 Google Doc 选一个），走完「引入资源 → agent 请求权限 → 审批队列 → 批量批准」的完整链路。

**试多久：** claude-ads 的材料在「怎么试」一节被截断，没有给出建议时长。Cloudflare OS 原文建议最小试用控制在半天内。合起来的建议：单平台只读一轮，加半天本地权限链路验证，再决定要不要扩到更多平台或更多服务。调研结论本身的建议是「小范围试而非全面采用」。

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
- 把仓库自述当成已验证结果。见下一节。
- 指望监控自动触发。原文提到 `/ads monitor`（节奏、投放、追踪、疲劳、政策、表现），但没有给出定时器、事件或状态触发的具体机制；Cloudflare OS 原文也没有给出由时间、事件或状态触发并持续执行任务的机制，唯一相关的是审批异步化，那是「不中断」，不是「自动触发」。
- 以为 Cursor / goose 有现成适配。原文只把它们列为 watch 级，没有具体步骤或适配说明。
- 以为 12 个平台适配质量一致。本次材料无法判断各平台适配是实测通过还是仅有 fixture。
- 解释器不对。托管依赖只支持 CPython 3.11/3.12 且限于声明的 wheel 矩阵；不支持的解释器会在改动目标位置之前失败。
- 把 `pnpm run-local` 当生产环境。原文明确它不适用于生产，数据存在 `.wrangler` 子目录。
- 现在就把整套 Cloudflare OS 当生产平台上线。它处于 early access、自建服务器部署文档标注 COMING SOON、无 SLA。可直接拿走的是第 12、13 步的权限与审批模式，移植进你现有的 agent 工作流。
- 想改造 Cloudflare OS 上游。仓库不接受外部大改动贡献，超过十几行的 PR 会被关闭。

## 证据与来源

**依据两份材料：** AgriciDaniel/claude-ads 仓库 README 首页（版本号 v2.0.2）；cloudflare/cloudflare-os 仓库 README（当前是 v2，基于 v1 经验重写，定位 early access）。

**可以直接照抄的部分：**

- claude-ads：插件与脚本安装命令、`install.sh` / `install.ps1` / `uninstall.sh` 用法、完整命令表、12 平台清单、写操作六条门控、评分阈值（80%/60%）、release 四条硬规则、开发与校验命令；贡献者表列出带 issue/PR 编号的社区反馈（如 #65、#53、#17/#18、#56、#57、#61、#66 等），说明有真实使用与缺陷修复痕迹。
- Cloudflare OS：`pnpm run-local`、http://localhost:8787、五条官方提示词、11 个 gatekeeper 包路径清单、`pnpm dev-server` / `pnpm dev-client` 与 http://localhost:3000、部署入口与部署模板仓库、自建服务器部署标注 COMING SOON、OS 概念映射表（kernel=`packages/workshop-backend`、device drivers=`packages/gatekeeper-*`、shell=`packages/workshop-frontend`、processes=gadgets、executables=blueprints、ACLs=shared permissions）。

**只是作者主张、没有佐证的部分：**

- claude-ads README 全部为仓库自述。没有任何第三方评测、审计准确率、节省工时、误报/漏报率等结果数据；安全门控和 release 规则是作者设定的规则，未附验证结果；「确定性评分 / 确定性报告」也是自述，无对照数据。贡献者一节自己也声明「部分提案被独立实现或取代，署名不代表每个补丁都被合并」。
- Cloudflare OS：同等模型下该平台编码 agent 更快更好更省 token；沙箱让「slide 应用有安全漏洞泄露你的 slides 给攻击者」不可能发生；Blueprint 模式代表云软件传统作法的转变；传统操作系统「应当」对 AI agent 特殊对待。这些都无数据或第三方验证。仓库指标 10473 stars（当日 +84）只说明热度。

**材料本身的局限：**

- claude-ads：输入只有仓库 README 首页，不含各 skill 的实际提示词内容、`scoring.py` 实现、capability manifest 明细，因此无法核验评分与门控是否如其所述，也无法确认各平台适配是实测通过还是仅有 fixture；「怎么试、怎么验证」一节在材料中被截断，完整试用步骤无法从材料中得到。
- Cloudflare OS：没有给出任何一条 gatekeeper 的具体 OAuth 配置步骤（只有链接），且原文承认服务商有意不简化 OAuth 申请；自建服务器部署文档标注 COMING SOON；Gatekeeper 服务独立部署「细节尚未确定」，目前只能与 OS 实例一起部署；没有任何任务完成质量、耗时、成本的对照数据；原文也没有给出定时、事件或状态触发的自动推进机制。

**与已有工具做法的关系：** claude-ads 把 Claude Code 作为规范运行时，安装直接走 Claude Code 插件市场（`/plugin marketplace add`、`/plugin install`），本身是 Agent Skills 形态的实例（`ads/SKILL.md` 契约、`ads/`、`skills/`、`agents/` 目录结构，独立安装与插件命名空间 `/ads` 对 `/claude-ads:ads` 加载同一契约）；Cursor、goose 在原文里只列为 watch，仅说明可消费同一批 skill 文件。Cloudflare OS 的 Gatekeeper 原文自称「增强版 MCP server」，与「预先挂上所有 MCP server 让服务全程在场」相对；它也能跑在开源 `workerd` 上、不必绑定 Cloudflare 云，但这一点同样只有原文自述。

## 依据的调研

- [AgriciDaniel/claude-ads](../research/radar/2026-10-01/580-agricidaniel-claude-ads.md)：值得一试，可按 README 原样安装 Claude Code 插件，先在一个广告平台上跑只读审计（/ads setup → /ads audit → /ads report → /ads next），把它当作「AI 操作 + 权限门控 + 确定性验证」的落地模板照搬；理由是原文给出了可直接复制的安装命令、完整命令表、评分阈值和写操作六道门控，但适用面限于付费媒体、效果只有仓库自述，因此建议小范围试而非全面采用。
- [cloudflare/cloudflare-os](../research/radar/2026-10-04/1062-cloudflare-cloudflare-os.md)：值得一试，先在本地跑 `pnpm run-local` 体验，重点把 Gatekeeper 的「按任务引入资源 + 有副作用动作延后批量审批」这套权限流程抄到自己的 agent 工作里，不要照搬整套平台；理由是它仍是 early access、自部署文档未完成，但权限与审批的具体做法可立即小范围验证。
