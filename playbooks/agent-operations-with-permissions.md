# 让 AI 先只读审计广告账户，改账户必须过六道门控

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎么把 AI 接进真实广告账户这类会花钱的操作面：默认只读、改动只出草案，等人工审批和确定性验证齐备之后才放行。
> 先试这一步：在 Claude Code 里装好 claude-ads，只挑一个广告平台跑一遍 /ads setup → /ads audit → /ads report → /ads next，全程只读、不碰账户。
> 最近修订：2026-10-02

## 解决什么问题

付费媒体账户是真金白银的操作面。让 AI 去做审计、计划、创意、报告没问题，但它一旦能直接改账户，风险就从「答案不准」升级成「账户被动了」。这篇手册用 AgriciDaniel/claude-ads 作为可照搬的落地模板，把一套通用做法拆开：默认只读地让 AI 产出带证据的审计结果，账户变更一律先出草案，再逐条过权限门控，最后用确定性规则验证和判读。

## 适用与不适用

**适用：**

- 你管的是付费媒体账户。覆盖 12 个平台，搜索/视频/社交：Google Ads、Meta Ads、YouTube Ads、LinkedIn Ads、TikTok Ads、Microsoft Advertising、Reddit Ads、Snapchat Ads、X Ads；商务与零售媒体：Apple Ads、Amazon Ads、Pinterest Ads。
- 手上有可授权的账户导出或读取权限。
- 你用的宿主是 Claude Code（原文把它作为规范运行时），或能在其他兼容 Agent Skills 的宿主里消费同一批 skill 文件。
- 你要的是「AI 起草 + 人工审批 + 确定性验证」，而不是「AI 直接改账户」。
- 你能接受默认只读、写操作逐条过门控的节奏。

**不适用：**

- 非付费媒体账户运营。这个仓库领域很窄。
- 需要 AI 立即自动改账户、无人审批的场景。原文的设计就要求 owner 审批、幂等键与回滚。
- 装不了 Claude Code 插件、也不能消费 skill 文件的宿主。原文只在安装一节把 Cursor、goose 归类为 watch 级：它们「在其运行时支持范围内」可消费同一批 skill 文件，但没有给出任何针对这两个宿主的具体步骤或适配说明。
- 需要核验评分与门控实现细节的场景。本次材料只有 README 首页，看不到各 skill 的实际提示词、scoring.py 实现、capability manifest 明细。

## 前置条件

- 运行时会话：Claude Code。要落到其他独立宿主，需在安装时显式指定 target。
- 托管依赖支持 CPython 3.11 和 3.12，且限于声明的 Linux/macOS/Windows wheel 矩阵；不支持的解释器会在改动目标位置之前失败。`--no-deps` / `-NoDeps` 用于只装 skill。
- 浏览器抓取需要操作员自行安装 Playwright 浏览器 payload。
- PDF 渲染需要宿主的 WeasyPrint 和 Pango 系统库（见 `control-plane/manifests/external-runtime-dependencies.json`）。
- 账户侧要有 client / account / KPI / privacy / guardrail 档案，由 `/ads setup` 建。
- 凭证必须放环境变量、OS keychain 或经批准的 secret manager，不得进入仓库、profile、报告或日志。
- 写操作另需：capability、账户与对象 ID、before/after diff 与 blast radius、审批上限、幂等键、审计目的地、回滚、验证窗口。

## 操作步骤

### 1. 安装

原文明确要求：优先使用宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档；**不要**把远程安装脚本直接管道进 shell。

**做法 A：Claude Code 原生插件流程（在 Claude Code 里就用这条）**

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

**做法 B：本地克隆安装（需要先审代码，或走本地归档时用这条）**

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

怎么选：在 Claude Code 里跑就用做法 A；需要本地审查代码、或使用带 SHA-256 校验的 tagged release 归档时用做法 B。预期结果：skill 文件落到宿主，`/ads` 或 `/claude-ads:ads` 命名空间加载同一份契约。

### 2. 先建档

```text
/ads setup
```

前提：已有授权导出或账户读取权限。预期结果：客户、账户、KPI、隐私与护栏档案建立完成——这是后面所有审计与报告的条件供给。

### 3. 跑一次只读审计

```text
/ads audit [all|platform|scope]
```

平台快捷方式：`/ads google`、`/ads meta`、`/ads amazon`、`/ads reddit` 会路由到对应平台审计。

预期结果：审计结果带日期证据（dated evidence）和显式置信度。这一步不触碰账户。

### 4. 出报告、看阻塞项

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

### 5. 要改动时，只让它出草案

```text
/ads launch --draft
/ads optimize --draft
```

预期结果：起草账户变更计划，但不动账户。要真正落地，必须逐条满足以下六项（原文顺序）：

1. 针对**精确操作**要有已测试并启用的 capability。
2. 明确的账户和对象 ID。
3. 人类可读的 before/after diff，含 blast radius。
4. 在账户定义的上限内由 owner 审批。
5. 幂等键、审计目的地、回滚、验证窗口。
6. 验证远端状态仍匹配变更前置条件。

缺少 ceilings 即等于禁止写入；v2 不支持永久删除。

### 6. 按规则判读评分

控件结果只有 `pass`、`fail`、`unknown`、`not_applicable` 四种。

- 健康度（health）、证据覆盖率（evidence coverage）、监管暴露（regulatory exposure）、机会（opportunities）彼此独立。
- unknown 控件只降低证据覆盖率，不改变已确定的健康度。
- 覆盖率 ≥80% 可评级，60–79% 为暂定（provisional），低于 60% 证据不足。
- optional、beta、premium、unavailable、ineligible 的功能不计分。
- 平台 profile 被禁用或未批准时不产出健康分。
- 某平台失败会被排除出组合评分，并使该次 run 变为 partial。

### 7.（可选）自建或验证实现

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

### 8. 卸载

```bash
bash uninstall.sh --target=claude
```

PowerShell 对应 `uninstall.ps1`。预期结果：只删 manifest 拥有的文件。

## 怎么判断变好了

原文没有给准确率、节省工时、误报/漏报率这类结果数据，所以只能看过程信号：

- 审计 run 产出的 findings 是否带日期证据和显式置信度。
- 报告是否为版本化 JSON run bundle，MD/HTML/PDF 是否同源渲染。
- 证据覆盖率是否 ≥80%（可评级）；60–79% 只能算暂定；低于 60% 视为证据不足，别急着下结论。
- `/ads status` / `/ads next` 是否稳定给出当前状态和最高优先级阻塞项。
- 写操作是否一直停在草案，直到六项门控齐备才放行。
- 发布侧四条硬规则是否被守住：无来源即无平台主张；无实现+fixture+测试即无 capability 主张；无审批与回滚即无账户变更；无独立验证即无发布。

**最小试用方式：** 全程只读、不触碰账户。装好之后只挑一个广告平台，依次跑 `/ads setup` → `/ads audit` → `/ads report` → `/ads next`，看它能不能给出带证据和置信度的 findings，以及 next 指出的阻塞项是否合理。

**试多久：** 本次材料在这一节被截断，没有给出建议时长。调研结论本身的建议是「小范围试而非全面采用」，所以先在一个平台、一次只读 run 上验证，再决定要不要扩到更多平台。

## 常见坑

- 把远程安装脚本直接管道进 shell。原文明确不要；改用宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档。
- 旧 marketplace 别名没清。v2.0.0 之前加过的话，本地别名 `agricidaniel-claude-ads` 是陈旧的，必须先 remove 再 add。
- 以为出了 diff 就能改账户。缺 ceilings 等于禁止写入；六条门控缺一不可；v2 不支持永久删除。
- 把 unknown 当扣分项。unknown 只降低证据覆盖率，不改变已确定的健康度。
- 覆盖率不够就下结论。低于 60% 是证据不足，60–79% 只是暂定。
- 把 partial run 当完整审计。某平台失败会被排除出组合评分并使该次 run 变为 partial；按原文的协作约定，必需的 worker 失败即让整次 run 变为 partial，绝不悄悄当成完整审计。
- 凭证乱放。必须放环境变量、OS keychain 或经批准的 secret manager，不得进入仓库、profile、报告或日志。
- 把仓库自述当成已验证结果。见下一节。
- 指望监控自动触发。原文提到 `/ads monitor`（节奏、投放、追踪、疲劳、政策、表现），但没有给出定时器、事件或状态触发的具体机制，这部分依据不完整。
- 以为 Cursor / goose 有现成适配。原文只把它们列为 watch 级，没有具体步骤或适配说明。
- 以为 12 个平台适配质量一致。本次材料无法判断各平台适配是实测通过还是仅有 fixture。
- 解释器不对。托管依赖只支持 CPython 3.11/3.12 且限于声明的 wheel 矩阵；不支持的解释器会在改动目标位置之前失败。

## 证据与来源

本次的依据是 AgriciDaniel/claude-ads 仓库 README 首页，版本号 v2.0.2。其中可以直接照抄的部分：插件与脚本安装命令、`install.sh` / `install.ps1` / `uninstall.sh` 用法、完整命令表、12 平台清单、写操作六条门控、评分阈值（80%/60%）、release 四条硬规则、开发与校验命令；贡献者表列出带 issue/PR 编号的社区反馈（如 #65、#53、#17/#18、#56、#57、#61、#66 等），说明有真实使用与缺陷修复痕迹。

**只是作者主张、没有佐证的部分：** README 全部为仓库自述。没有任何第三方评测、审计准确率、节省工时、误报/漏报率等结果数据；安全门控和 release 规则是作者设定的规则，未附验证结果；「确定性评分 / 确定性报告」也是自述，无对照数据。贡献者一节自己也声明「部分提案被独立实现或取代，署名不代表每个补丁都被合并」。

**材料本身的局限：** 输入是仓库 README 首页，不含各 skill 的实际提示词内容、`scoring.py` 实现、capability manifest 明细，因此无法核验评分与门控是否如其所述，也无法确认各平台适配是实测通过还是仅有 fixture。另外本次「怎么试、怎么验证」一节在材料中被截断（停在「在 Claude Code 中执行」），完整试用步骤无法从材料中得到。

**与已有工具做法的关系：** 本仓库把 Claude Code 作为规范运行时，安装直接走 Claude Code 插件市场（`/plugin marketplace add`、`/plugin install`），是在该工具上的具体应用层；它本身是 Agent Skills 形态的实例（`ads/SKILL.md` 契约、`ads/`、`skills/`、`agents/` 目录结构，独立安装与插件命名空间 `/ads` 对 `/claude-ads:ads` 加载同一契约）；Cursor、goose 在原文里只列为 watch，仅说明可消费同一批 skill 文件。

## 依据的调研

- [AgriciDaniel/claude-ads](../research/radar/2026-10-01/580-agricidaniel-claude-ads.md)：值得一试，可按 README 原样安装 Claude Code 插件，先在一个广告平台上跑只读审计（/ads setup → /ads audit → /ads report → /ads next），把它当作「AI 操作 + 权限门控 + 确定性验证」的落地模板照搬；理由是原文给出了可直接复制的安装命令、完整命令表、评分阈值和写操作六道门控，但适用面限于付费媒体、效果只有仓库自述，因此建议小范围试而非全面采用。
