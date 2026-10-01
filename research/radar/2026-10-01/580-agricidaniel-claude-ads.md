# AgriciDaniel/claude-ads

- 结论：**值得一试**。可按 README 原样安装 Claude Code 插件，先在一个广告平台上跑只读审计（/ads setup → /ads audit → /ads report → /ads next），把它当作「AI 操作 + 权限门控 + 确定性验证」的落地模板照搬；理由是原文给出了可直接复制的安装命令、完整命令表、评分阈值和写操作六道门控，但适用面限于付费媒体、效果只有仓库自述，因此建议小范围试而非全面采用。
- 原文：https://github.com/AgriciDaniel/claude-ads
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T13:28:09.136Z

## 是什么

Claude Ads 是面向代理公司、顾问和甲方效果团队的「Claude-first」付费媒体操作技能包，覆盖 12 个广告平台。它把授权导出或账户读取转成有来源依据的审计、计划、创意工作流、实验、监控和报告。

- 默认只读（read-only by default）；实时改动在精确平台与操作通过审批、幂等、验证、审计、回滚门控之前保持关闭。
- 平台分两类：搜索/视频/社交——Google Ads、Meta Ads、YouTube Ads、LinkedIn Ads、TikTok Ads、Microsoft Advertising、Reddit Ads、Snapchat Ads、X Ads；商务与零售媒体——Apple Ads、Amazon Ads、Pinterest Ads。
- 每个平台有独立的 skill、审计 worker、control reference、capability 声明和可测试的路由面；`control-plane/manifests/capability-manifest.json` 是实时读写的权威记录。
- 规范结果是版本化 JSON，Markdown、HTML、PDF 都是同一个已验证 run bundle 的渲染。

## 具体做法

### 1. 安装（前提：Claude Code 为规范运行时）

README 明确要求：优先使用宿主原生插件流程，或带 SHA-256 校验的 tagged release 归档；**不要**把远程安装脚本直接管道进 shell。

Claude Code 原生插件流程：

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

或从公开仓库本地克隆安装：

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

运行时前提：托管依赖支持 CPython 3.11 和 3.12，限于声明的 Linux/macOS/Windows wheel 矩阵；不支持的解释器会在改动目标位置之前失败。`--no-deps` / `-NoDeps` 用于只装 skill。浏览器抓取需要操作员自行安装 Playwright 浏览器 payload；PDF 渲染需要宿主的 WeasyPrint 和 Pango 系统库（见 `control-plane/manifests/external-runtime-dependencies.json`）。

卸载（只删 manifest 拥有的文件）：

```bash
bash uninstall.sh --target=claude
```

PowerShell 对应 `uninstall.ps1`。

### 2. 先建档：客户、账户、KPI、隐私与护栏

```text
/ads setup
```

### 3. 跑审计

```text
/ads audit [all|platform|scope]
```

平台快捷方式：`/ads google`、`/ads meta`、`/ads amazon`、`/ads reddit` 路由到对应平台审计。审计结果应带日期证据（dated evidence）和显式置信度。

### 4. 计划、创意、实验、监控、报告、刷新与自检

```text
/ads plan
/ads create
/ads experiment
/ads monitor
/ads report
/ads research refresh
/ads validate
/ads status
/ads next
```

`/ads report` 渲染已验证的 JSON run bundle；`/ads research refresh` 刷新平台、政策、API、基准和生态证据；`/ads validate` 校验 contracts、runs、capabilities、maturity 或 release readiness；`/ads status` / `/ads next` 显示当前状态与最高优先级阻塞项。

### 5. 改动只出草案

```text
/ads launch --draft
/ads optimize --draft
```

起草账户变更计划，但不动账户。要真正落地，必须逐条满足以下六项（原文顺序）：

1. 针对**精确操作**要有已测试并启用的 capability。
2. 明确的账户和对象 ID。
3. 人类可读的 before/after diff，含 blast radius。
4. 在账户定义的上限内由 owner 审批。
5. 幂等键、审计目的地、回滚、验证窗口。
6. 验证远端状态仍匹配变更前置条件。

缺少 ceilings 即等于禁止写入；v2 不支持永久删除。凭证必须放环境变量、OS keychain 或经批准的 secret manager，不得进入仓库、profile、报告或日志。

### 6. 读懂评分规则（判读报告的前提）

控件结果只有 `pass`、`fail`、`unknown`、`not_applicable` 四种。

- 健康度（health）、证据覆盖率（evidence coverage）、监管暴露（regulatory exposure）、机会（opportunities）彼此独立。
- unknown 控件只降低证据覆盖率，不改变已确定的健康度。
- 覆盖率 ≥80% 可评级，60–79% 为暂定（provisional），低于 60% 证据不足。
- optional、beta、premium、unavailable、ineligible 的功能不计分。
- 平台 profile 被禁用或未批准时不产出健康分。
- 某平台失败会被排除出组合评分，并使该次 run 变为 partial。

### 7. 若要自建或验证实现

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

## 对应的研究问题

**1. 能力发现**：原文明确把「账户审计、渠道/活动/预算/竞品/度量计划、文案/图片/视频/产品图 brief 与素材、节奏与投放与追踪与疲劳与政策与表现监控、版本化报告、安全变更草案」列为已交给 AI 的工作；特别之处是**变更本身也由 AI 起草但默认不执行**。另有「报告缺失数据、过期来源、矛盾与部分失败」这一常被忽略的元任务。

**2. 任务匹配**：Claude Code 是规范运行时；Codex、Gemini、Cursor、Windsurf、Goose 及兼容 Agent Skills 宿主可在其运行时支持范围内消费同一批 skill 文件。协作方式为「一个 conductor 负责范围、政策、聚合与最终产物；worker 分析有界切片并返回 schema 合法 findings；必需的 worker 失败即让整次 run 变为 partial，绝不悄悄当成完整审计」。

**3. 条件供给**：需要 client/account/KPI/privacy/guardrail 档案（`/ads setup`）；需要授权导出或账户读取；凭证放环境变量/keychain/secret manager。写操作另需 capability、账户与对象 ID、before/after diff 与 blast radius、审批上限、幂等键、审计目的地、回滚、验证窗口。环境依赖为 CPython 3.11/3.12、Playwright payload、WeasyPrint+Pango。

**4. 主动推进**：有 `/ads monitor`（节奏、投放、追踪、疲劳、政策、表现）与 `/ads research refresh`（刷新平台/政策/API/基准/生态证据），以及 `/ads status`、`/ads next` 输出最高优先级阻塞项。原文提到「监控」，但**没有**给出定时器、事件或状态触发的具体机制，这部分依据不完整。

**5. 效果验证**：这是原文最完整的部分——确定性评分体系（四种控件结果、覆盖率 80/60 阈值分级、unknown 与不计分功能规则、未批准 profile 不出分、失败平台使 run 变 partial）、版本化 JSON 为唯一规范结果（MD/HTML/PDF 只是渲染）、`/ads validate` 校验命令，以及 release 控制的四条硬规则：「无来源即无平台主张；无实现+fixture+测试即无 capability 主张；无审批与回滚即无账户变更；无独立验证即无发布」。

## 与已有做法的关系

- **Claude Code（tool，adopt）**：本仓库以 Claude Code 为规范运行时，安装直接走 Claude Code 插件市场（`/plugin marketplace add`、`/plugin install`），是在该工具上的具体应用层。
- **Agent skills（concept，adopt）**：本仓库正是 Agent Skills 形态的实例——`ads/SKILL.md` 契约、`ads/`、`skills/`、`agents/` 目录结构，以及独立安装与插件命名空间（`/ads` 对 `/claude-ads:ads`）加载同一契约。
- **Cursor（tool，watch）、goose（tool，watch）**：原文仅在安装一节提到它们作为兼容 Agent Skills 的宿主「在其运行时支持范围内」可消费同一批 skill 文件，未给出针对这两个宿主的任何具体步骤或适配说明。

## 证据与局限

**给出的证据**：可复制的插件与脚本安装命令、`install.sh` / `install.ps1` / `uninstall.sh` 用法、完整命令表、12 平台清单、六条写操作门控、评分阈值（80%/60%）、release 四条硬规则、开发与校验命令；贡献者表列出带 issue/PR 编号的社区反馈（如 #65、#53、#17/#18、#56、#57、#61、#66 等），说明有真实使用与缺陷修复痕迹；版本号为 v2.0.2。

**只是主张、没有佐证的部分**：README 全部为仓库自述。没有任何第三方评测、审计准确率、节省工时、误报/漏报率等结果数据；安全门控和 release 规则是作者设定的规则，未附验证结果；「确定性评分/确定性报告」也是自述，无对照数据。贡献者一节自己也声明「部分提案被独立实现或取代，署名不代表每个补丁都被合并」。

**适用条件**：领域窄，仅限付费媒体账户运营；需要可授权的账户导出或读取权限；需要能装 Claude Code 插件（或在其他宿主消费 skill 文件）；需接受默认只读、写操作走人工审批的节奏；对 12 个平台各自的适配质量，本次材料无法判断。

**材料本身的局限**：输入是仓库 README（首页），不含各 skill 的实际提示词内容、`scoring.py` 实现、capability manifest 明细，因此无法核验评分与门控是否如其所述；也无法确认各平台适配是实测通过还是仅有 fixture。

## 怎么试、怎么验证

**最小试用（全程只读，不触碰账户）**

1. 在 Claude Code 中执行 `/plugin marketplace add agricidaniel/claude-ads` 与 `/plugin install claude-ads@ai-marketing-hub-claude-ads`；或本地 clone 后 `bash install.sh --source=local`。
2. `/ads setup` 建立一个客户档案，凭证用最小权限的只读导出或只读凭证，放环境变量。
3. 只选一个平台跑 `/ads audit`（如 `/ads google`）。
4. `/ads report` 出报告，`/ads next` 看它报出的最高优先级阻塞项。
5. 用 `/ads validate` 校验这次 run bundle。
6. 全程确认没有产生任何写操作。

**判断有没有改善的指标**

- 审计的每条结论是否都带日期证据和显式置信度，而非泛泛建议。
- 是否主动报告缺失数据、过期来源、矛盾与部分失败（这是与「看起来完整」的关键区别）。
- 证据覆盖率达到哪一档：≥80% 可评级 / 60–79% 暂定 / <60% 证据不足；低于 60% 时不应采信其健康分。
- 产出是否为 schema 合法的版本化 JSON，且同一输入重复运行结果一致（依据其「确定性评分、确定性报告」的说法做复现检验）。
- 写操作计数必须为 0；若做过一次草案流程，检查 before/after diff、审批上限、幂等键、回滚与验证窗口是否齐全，缺任何一项就不该放行。
- 与人工或现有工具的同一账户审计结果做对照，记录重叠发现与独有发现，作为是否值得推广到其余 11 个平台的依据。
