# 把多步文书任务做成可验收流水线：起草、独立审阅、脚本验收

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：让模型写的文书不再靠“看着还行”验收，而是用独立审阅和机器可检的验收标准决定能不能交付。
> 先试这一步：挑一件你手上真实的多步文书任务，先写出三条机器可检的验收标准（页数、文本可抽取、关键词覆盖等），再让一个全新上下文的审阅者只拿草稿做批评。
> 最近修订：2026-10-22

## 解决什么问题

模型会把“我觉得对”当成“已经对”。关键不是换一个更强的模型，而是改变提交规则：模型只负责提议，独立检查负责决定能不能提交，未通过只回原因，残差驱动下一次尝试，所有决定和拒绝都落盘。

还有一条同源问题：模型自报的置信度只是逐 token 生成的文本延续，不是对内部状态的测量，也没有针对“它是否答对”校准；换措辞、重复问都可能变。可信的置信度需要反映预测所依据的信息量，并在同类问题上与实际结果核对过。替代方案是像天气预报员一样，用可观测信息建立“信息到置信度”的规则，持续记录结果并按实际正确率校准。LLM 仍可写回答、做摘要，但置信度来自规则，不来自 LLM 自我报告。

三份材料给的是同一条回路在不同场景里的实现：

- 有客观对错的任务（对账、排班、行程规划、约束优化、工程校核等）：ResiMind README 的流程是 `Propose → check → diagnose what remains → change strategy → check again → 完成证明 → 准入规则 → 复用并复检`。
- 由固定规则和一串数字决定结果的决策（例如永续合约交易）：trading-research-agents 的一句话是 **“The agents propose; the system decides.”** 模型只负责读数据、给判断；取数、算数字、给往返成本定价、套用限额、定仓位由系统做。
- 多步文书任务（例如按岗位改写简历、写求职信、准备面试）：ai-job-search 把流程拆成 drafter 起草、fresh context 的 reviewer 独立批评、`verify_pdf.py` / `verify_layout.py` / ATS 检查等机器可检验收，外部写操作前留人工批准位。

共用的提交规则：

- 模型只负责提议下一步候选与证据引用。
- 可信的领域代码独立重算结果，检查引用、前提、作用域、精确有理数运算和单位；模型不能靠置信度或一个 `verified` 字段给自己发验证。文书任务里对应的是页数、文本可抽取、版式、关键词覆盖、发布信息完整性等可脚本检查项。
- 置信度不是模型自报，而是由可观测信号和已校准规则产生；低置信度走人工复核。规则置信度用于分级/分流，不替代独立重算与校验。
- 未通过不改变状态，只把原因回给提议方；未完成目标、未知量和硬约束构成残差，从已提交事实重建后驱动下一次提议。文书任务里残差可以是缺页、缺关键词、版式碰撞、未回答的面试缺口。
- 每个决定和每次拒绝都连同理由落盘，事后可查“发生了什么、为什么”，而且不重写。
- 任务完成后才从已完成的推导中抽取候选规则，经独立准入、重载复检、每次新应用再检查，存进持久规则库。模型权重不变，知识长在模型之外。

## 适用与不适用

**适用**

- 结果能被独立重算/校验的任务：有约束的行程规划（时间窗、预算、步行上限、路线连续性、室内要求）、退款金额与保单资格核对、带等式/非负/上界约束的二次优化与全局最优性证书、连续梁内力与位移协调、线性方程求解、轴向杆应力。共同点是“对错由外部计算决定”。
- 决策由固定规则加数字决定、且你不想自己写验证器的场景：trading-research-agents 当前可用范围是永续合约（USDT/USDC 保证金），四类分析师 + 最多三个验证者 + 只能收紧的风控 + 两个审计。
- 需要跨任务复用已验证规则、又不想改模型权重的场景（知识长在模型之外）。
- 想先比较“已验证规则的预览、化简、本地展开”三种本地手段，再决定是否叫模型的场景。
- 需要给输出分级或分流、且任务是重复出现的同类问题、每条回答可以事后判定对错、已有真人复核通道的场景（客服回复、工单回复、文档问答等）。这时可用做法 D 产生置信度，但置信度规则不能替代独立验证器。
- 多步、有材料可核、有可写死验收标准的文书工作：岗位匹配打分与排序、按岗位改写 CV 与求职信、公司调研与草稿批评、面试 prep pack、技能 gap heatmap、跟进信起草、从邮件识别申请状态、生成 HTML 仪表盘、注册并试编译模板、为本地招聘站点生成搜索 CLI。这里迁移的是“起草—独立审阅—机器验收—人工批准外发”的结构，不是整套求职工具。

**不适用或要谨慎**

- 没有独立验证标准的任务。写不出“什么算通过”的独立检查，就不要照搬这套回路。文书任务里如果只有“读起来不错”，至少要先写出可检查的页数、结构、事实引用和必填项。
- 把 `solved` 当成“存在可行解或满足工程限值”。`solved` 只表示“声明的义务已完成”，每个适配器有自己的有界范围。
- 想靠它直接提升模型准确率或节省总体算力。ResiMind 原文明确：十题离线对照只测“已发布开发任务上的复用”，不测模型准确率提升，也不测总体算力节省。
- trading-research-agents 处于 alpha，真实资金路径作者自己没跑过，且强绑定永续合约交易场景——只适合小范围试，不要用真钱起步。
- 想找时间或外部事件触发的后台持续运行机制时，要分开看：ResiMind 材料里只有状态触发（残差驱动下一次提议），没有时间触发和后台持续运行的说明；trading-research-agents 提供 `tra run --every 15m` 这种按 15 分钟 bar 的时钟循环；ai-job-search 的 `/outcome followup` 默认找 10 天无回音的申请，但原文没有给出 cron/CI 定时调度配置，节奏靠人手动触发。三者不要混为一谈。
- 没有人工复核或结果标签时，置信度校准无法落地。
- 不能把一个任务上校准出的置信度规则直接假定适用于另一类任务。
- 校准本身不等于有用：一个永远输出历史基率的规则也可能校准，但没有利用新信息；要看高置信度组与低置信度组的实际正确率是否有明显差异。
- ai-job-search 的门户搜索开箱可用范围是丹麦四家加 `linkedin-search` 与 `freehire-search`；其他市场要 `/add-portal` 或社区 fork。`linkedin-search` 明确个人使用、低频率，自动化访问违反 LinkedIn ToS。
- ai-job-search 的实证只有作者一人的求职漏斗，无法区分框架贡献与个人背景、市场、时间投入；时间是未来式的（2025 年底被裁、2026 年 6 月入职），数据本身不可独立复核。
- 它的安全边界是指令级防护，不是沙箱；陌生门户的抓取与写入建议人工过目。

## 前置条件

- ResiMind 路径：Python 3.10+；离线 demo 不需要 API key；只有 `--domain lean` 额外需要已安装的 Lean 4.29.0 工具链。接真模型时才需要环境变量（如 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`）；实时调用会产生费用，且**实时请求失败后没有离线回退**。
- trading-research-agents 路径：Python 3.11+；需要一个 provider 的 key（免费档可用 groq）；每个命令只在 `strategy.toml` 旁边的 `.env` 里找 key。
- 要为自己的任务写适配器，前提是能先明确写出“什么算通过”的独立检查；ResiMind 核心不 import 任何参考领域。
- 做法 D 的前提：任务是重复出现的同类问题；每个回答可以事后判定对错；能记录每条回复的可观测信号、规则给出的置信度、最终是否正确；能按周或固定周期汇总；有人工复核通道和可接受的延迟。
- 做法 E（ai-job-search 结构）的前提：Claude Code（无免费层，需 Pro/Max/Team 订阅或 API credits）、Python 3.10+、Bun、带 `lualatex` 与 `xelatex` 的 LaTeX 发行版；可选 `pypdf`（ATS 检查用），Poppler `pdftotext` 为 fallback。自用要建私有仓库，不要用公开 fork，因为 `/setup` 会把姓名、联系方式、履历、薪资期望写进 tracked 文件。模板必须能从命令行编译出 PDF；新增门户前提是目标站点无登录墙。
- 版本认知：ResiMind v0.12.1 / Experimental，MIT，30 stars，领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果；trading-research-agents 为 MIT、PyPI 包、README 标注 Status: alpha；ai-job-search 为单一样本、自我报告、无对照，仓库 stars 63187。都先小范围试，不要直接采用。

## 操作步骤

### 做法 A：先用官方离线 demo 看清回路（第一次接触推荐这条）

**步骤 1：安装并跑第一个离线 demo**

前提：本机已装 Python 3.10+；无需 API key，demo 离线运行。

```bash
git clone https://github.com/1105216375-alt/resimind.git
cd resimind
python -m venv .venv
source .venv/bin/activate
python -m pip install .
python -m resimind demo --domain scheduling
```

Windows PowerShell 激活命令改为 `.venv\Scripts\Activate.ps1`。安装过程可能下载 build tools。`python -m resimind` 和安装后的 `resimind` 命令在仓库目录之外也能用。

预期结果：第一个 demo 会保存并重载已校验规则，然后比较“空规则库”与“已学习规则库”，并配置了一个模型回调——正常任务应当**不会**触发该回调；另有一个本地预算被故意设为 0 的用例，会触发一次脚本化提议来展示 fallback。全程不发起 API 调用。

**步骤 2：按目的挑一个离线 demo**

前提：同上，全部离线；只有 `--domain lean` 额外需要已安装的 Lean 4.29.0 工具链。

| 想看什么 | 命令 |
| --- | --- |
| 跳过装饰性改写、处理剩余展开目标 | `python -m resimind demo --domain progress` |
| 复用规则、先化简再昂贵替换、本地够用就不调模型 | `python -m resimind demo --domain scheduling` |
| 原始展开 vs 有界分配+同类项合并 | `python -m resimind demo --domain growth-control` |
| 真实未完成的 Lean 目标驱动新策略，再复用已校验规则 | `python -m resimind demo --domain lean` |
| 拒绝错误步骤、换策略、完成证明并复用规则 | `python -m resimind demo --domain adaptive` |
| 推导规则→验证入库→新任务复用并复检 | `python -m resimind demo --domain knowledge-growth` |
| 多可行解但仍受时间/预算/路线约束 | `python -m resimind demo --domain planning` |
| ¥259 退款提议被 ¥249 计算拒绝 | `python -m resimind demo --domain customer-support` |
| 目标更优但违反约束的解被拒，需最优性证书 | `python -m resimind demo` |
| 平衡了力但共享墩处转角不兼容被拒 | `python -m resimind demo --domain bridge` |

预期结果：看到你要迁移的那类回路（拒绝、重试、复用规则、准入规则）。

**步骤 3：看审计轨迹**

前提：在任一 demo 命令后追加参数。

```bash
# 在任意 demo 命令后追加
--json
```

预期结果：逐步查看每一步的决策、原因、状态和残差。这是后面判断“有没有变好”的原始材料。

### 做法 B：直接用自己的任务接适配器（已经有明确“什么算通过”的检查时走这条）

**步骤 4：写 Proposer / Verifier / Domain 三接口适配器**

前提：先能明确写出“什么算通过”的独立检查；核心不 import 任何参考领域。

| 接口 | 你的职责 |
| --- | --- |
| `Proposer.propose(...)` | 用模型、规则或检索提出下一个候选 |
| `Verifier.verify(...)` | 独立检查当前输入与候选；返回 `accept` / `reject` / `defer` / `interrupt` |
| `Domain.rebuild(...)` | 从已提交事实重算所有剩余义务 |

再用 `Agent`、`Task`、注册的 `EvidenceTool` 以及可选 `RouteMemory` 组装起来。详细指南 `docs/adapters.md`、`docs/domain-contract.md` 目前是中文，英文实现地图见 `docs/neuro-symbolic.md`。

预期结果：模型只负责提出候选，能不能成为事实由你的 Verifier 决定；拒绝时状态不变，只回原因。

**步骤 5：用 Python API 驱动 Agent（可选，先跑通第 4 步再说）**

前提：已完成步骤 1 的安装。下面是 README 原文代码。

```python
from resimind import Task
from resimind.domains.planning import DOMAIN, build_agent, demo_problem, verified_plan

agent = build_agent(demo_problem())  # Offline; inject complete=your_model for neural proposals.
result = agent.run(Task("day-out", "Plan a relaxed day with art and a meal.", DOMAIN))
run = result.run_result
if run.status == "solved" and run.residual.solved:
    print(verified_plan(result))
else:
    print("Still unresolved:", run.residual.pending)
```

注意：`solved` 只表示“声明的义务已完成”，**不自动等于存在可行解或满足工程限值**。

**步骤 6：接真模型（可选）**

前提：先设置本地环境变量，再接模型；实时调用会产生费用，也可能一直保持未解决状态，且**实时请求失败后没有离线回退**。

```bash
python -m pip install '.[deepseek]'
# Set DEEPSEEK_API_KEY and DEEPSEEK_MODEL in your local environment first.
python -m examples.open_planning --live --json
```

接入方式是把一个 provider 无关的回调交给 domain builder：`build_agent(problem, complete=your_complete)`；`ModelProposer` 接受 `complete(prompt: str) -> str`。回调会收到：当前状态、未完成义务、证据、允许的动作列表、上一次验证器反馈，返回一个 JSON 候选或 `null`。另有 OpenAI Responses 路径（`.[openai]`）和 LangGraph 外层连接器（`.[langgraph]`），后者只转发已校验事实或未解决义务，不提供额外领域验证规则。

**步骤 7：跑测试与看历史校验记录**

```bash
python -m examples.agent_demo       # task → tool → model callback → verifier
python -m examples.inventory        # independent recomputation and rejection
python -m examples.document_review  # missing evidence stays unresolved
python -m examples.route_memory     # review, applicability, and revocation
python -m pip install -e '.[dev]'
python -m pytest -q
```

预期结果：能看到独立重算与拒绝、缺证据时保持 unresolved、规则的审核/适用性/撤销。

### 做法 C：决策由固定规则和数字决定时，用现成 desk（trading-research-agents）

这条与 A/B 的差别：验证与执行系统是现成的，你交付的是设置与限额，不是自己写 Verifier；代价是强绑定永续合约交易场景，且项目处于 alpha。

**步骤 8：安装**

前提：Python 3.11+。

```bash
uv tool install 'trading-research-agents[ccxt,openai,anthropic,google,data]'
```

没有 uv 就在虚拟环境里 `pip install 'trading-research-agents[ccxt,openai,anthropic,google,data]'`。升级并确认版本：

```bash
uv tool upgrade trading-research-agents      # 或 pip install -U '…'
tra --version
```

预期结果：`tra --version` 能显示版本。README 特别提醒：GitHub 的 `develop` 分支是下一个版本的开发处，那里的 commit **不是** release，要用 PyPI 上的 release。

**步骤 9：建一个 desk**（一个装着你的设置和所有 agent 决定的文件夹）

前提：有下面某一个 provider 的 key。

```bash
tra init my-desk --profile autonomous --agent groq
cd my-desk
```

| `--agent` | 写入 `.env` 的 key | 不指定模型时的默认模型 |
|---|---|---|
| `groq` | `GROQ_API_KEY`（免费档） | `openai/gpt-oss-120b` |
| `google` | `GEMINI_API_KEY` | `gemini-flash-latest` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-opus-5-5` |
| `openai`, `deepseek`, `xai`, `openrouter`, … | 见 “Models and providers” | 用 `--model` 指定；`tra models <provider>` 可列出 |

加 `--venue okx`（或任何 ccxt id）可换成非默认的 Bybit。

**步骤 10：放 key**

前提：每个命令只在 `strategy.toml` 旁边的 `.env` 里找 key。

```bash
cp .env.example .env        # 然后在 .env 里设 GROQ_API_KEY=...
```

**步骤 11：自检**

`tra check` 会把所有设置互相对照，并指出下一步唯一要修的那件事。就绪时输出：

```bash
tra check
```

```
ok    provider groq: ready
ready to run `tra run`
```

**步骤 12：在沙箱里跑**

`tra run` 用实时行情决策一次，在沙箱里，什么都不发出去；`tra run --every 15m` 按 15 分钟 bar 的时钟持续决策。只敲 `tra` 会进控制台（接受同样的命令）。脚本/cron 用 `tra -c "run --now"`。

```bash
tra run
tra run --every 15m
```

预期结果：决定与拒绝理由连同快照、briefs、answers、intent 落盘，可事后查“发生了什么、为什么”。

**步骤 13：把新 desk 的默认值当 checklist 读**

| 项目 | 默认 | 改哪里 |
| --- | --- | --- |
| 下单 | 不发单，沙箱把每个决定写下来 | `[execution].mode` |
| 交易什么 | Bybit 上的 BTCUSDT，taker | `[run].instrument`、`[universe]`、`--venue` |
| 周期 | 15 分钟 bar 决策，读 1h/4h 作上下文 | `[run].bar_interval_s`、`context_intervals` |
| 策略 | 不固定，分析师在测得的 regime 支持时选 setup，否则空仓 | `[agents].mechanism` |
| 止损/目标 | 分析师提，止损被夹在 0.2%–3% 且不在一根 ATR 内，目标为止损的 1.5x–4x | `[exit]` |
| 单笔风险 | 在止损处损失 equity 的 0.5%（与止损距离无关） | `[controls].max_risk_per_trade_bps` |
| 坏日子 | 当日亏 3% 或从峰值跌 10% 后不再开新仓 | `[controls]` |
| 时间限制 | 持仓 4 小时后平 | `[exit].timeout_bars` |
| 值不值得做 | edge 至少是往返成本的 2 倍，一半交易能打平或更好，一天最多 6 笔 | `[targets]` |
| 监督 | 一个只能 cut/pause/halt 的风控；两个只汇报的审计 | `[audit]` |

**步骤 14：真要发单时（先在交易所的练习账户，不要上 mainnet）**

把练习账户的 key 放进 `.env`；用 `tra mandate` 读授权书，`tra mandate --sign "Your Name"` 签名（签名不会打开任何开关，落成 `MANDATE.md`）；在 `strategy.toml` 的 `[execution]` 里设 `mode = "venue"`、`leverage`、`max_notional`（单笔订单上限）。`tra check` 会列出还缺什么。

可直接抄的配置样例（原文给的 TOML）：

```toml
[agents]
provider = "groq"
model = "openai/gpt-oss-120b"
effort = "medium"                    # minimal | low | medium | high | xhigh | max，vendor 支持时生效；不写用 vendor 默认
fallback = ["google:gemini-flash-latest", "anthropic:claude-opus-5-5"]

[agents.roles.sentiment_analyst]     # 只做打标的角色可以跑更便宜的模型
model = "a-cheaper-model"
effort = "low"
```

```toml
[execution]
mode = "venue"
environment = "demo"             # demo | testnet | mainnet
leverage = 3                     # 你选；它永远不会把一笔交易变大
max_notional = 400               # 单笔订单最大名义价值（计价货币）
margin_mode = "isolated"         # isolated | cross
hold_limit = "timeout"           # 按 [exit].timeout_bars 到时平；或 horizon，或 none
```

**步骤 15：换交易所/数据源，并看数据鲜度**

```bash
tra venues okx            # 它能做什么、用哪些 key 签名
tra venues okx --setup    # 要粘进 envelope.toml、data.toml、strategy.toml 和 .env 的块
```

`tra sources show` 列出每个数据系列的来源和最后一个值的年龄；超过其 `max_age` 的值显示为 stale 且**永不计入**。

**步骤 16：想用固定脚本策略而不是 agent（可选）**

```bash
tra data get BTCUSDT 2025-01-01
tra backtest                     # 净成本回放一天
tra paper --minutes 30           # 在实时行情上空跑
tra live                         # 硬上限下的小型 canary
```

### 做法 D：需要给输出分级或分流时，用可观测信号和校准规则产生置信度

这条与 A/B/C 的差别：A/B 是让独立验证器决定候选能不能提交，C 是现成交易 desk 用固定规则决定；D 不解决“事实对不对”的最终裁决，它解决“这条输出该自动走还是送人工”的分级问题。D 可以独立使用，但最好和独立验证器一起用：置信度高不等于事实正确，低置信度送人工也不等于高置信度可以免检。

**步骤 17：选择可观测信息**

前提：任务是重复出现的同类问题，且每个回答可以事后判定对错。列出不询问 LLM“感觉”就能观察到的信号，例如：检索是否命中相关文章、命中几篇、此类问题以前是否处理过、同一问题问两次两个回答是否一致。预期结果：得到一小组可记录、可分组、能随信息变化而变化的信号；不要用模型自报的 confidence 作为信号。

**步骤 18：用历史基率作为初始置信度**

前提：有一批复核过的历史回答。原文举例：若检查 200 条历史回复、其中 150 条正确，则新回复的初始置信度都设为 75%。这是冷启动值，不是最终值。预期结果：得到初始基率，并明确样本量；后续要按信号分组更新，不要一直停在基率。

**步骤 19：为每条回复留档**

前提：有复核结果或客户不再追问等结果信号，并能记录。每条保存：第 17 步的可观测信息、规则给出的置信度、最终是否正确。预期结果：形成可分组、可算正确率的记录表；没有结果标签的记录不能用来校准。

**步骤 20：用记录更新规则**

前提：累计足够样本，能按信号分组。把历史回复按可观测信息分组，计算每组实际正确率。原文举例：有匹配文章且两次回答一致的组历史正确率为 95%，该组下次置信度就用 95%；无匹配文章的组仅 40%，就用 40%。样本少时分组粗，数据增加后再细化。预期结果：置信度随可观测信息变化，而不是所有输出都拿到同一个基率；同时能看出高置信度组和低置信度组的实际正确率是否拉开差距。

**步骤 21：定期校准并修正**

前提：能按周或固定周期汇总结果。按置信度档位做表：说 90% 的组实际正确率是多少。若 90% 档实际只有 70% 正确，说明规则过度自信，用新记录调整。原文中的 90%/70% 是说明性例子。预期结果：每个档位的“声称正确率”和“实际正确率”差距缩小；如果所有组都接近同一个基率，说明规则没有利用信息，需要回到第 17、20 步改信号或分组。

**步骤 22：把规则用于分流**

前提：有人工复核通道和可接受的延迟。LLM 仍负责生成回答；置信度来自上述规则；低置信度回复在发送前交给人。原文没有给出具体阈值，阈值需按自身复核能力设定。先做影子模式，不自动发送；把低置信度输出送人工复核，积累记录后再调整分组规则。预期结果：低置信度被筛出来送人工，且这些被送人工的回复中实际错误的比例高于整体；如果被送人工的回复并不更容易错，说明分流规则没有筛出不确定项。

### 做法 E：多步文书任务用“起草—独立审阅—机器验收—人工批准外发”

这条与 A/B/C/D 的差别：A/B 用领域验证器裁决事实，C 用固定规则裁决交易，D 给输出分级；E 处理的是“文档能不能交付”的流程验收。E 的机器检查能抓页数、文本层、版式、发布信息完整性，但审阅者的批评和匹配评分仍带主观判断，不能把它当成 ResiMind 那样的数学证明。

**步骤 23：建私有仓库并安装门户 CLI**

前提：只是自己用、不打算回贡；自用不要直接公开 fork，因为 `/setup` 会写入个人隐私信息。README 明确警告 fork 公开仓库必然是 public，做法在 `SETUP.md` 第 8 节改成私有 repo 并把该 repo 设为 `upstream`。

```bash
gh repo fork MadsLorentzen/ai-job-search --clone
cd ai-job-search
python3 tools/install_portal_clis.py   # 可先加 --dry-run 看会装什么
```

预期结果：脚本会发现在 `.agents/skills/*/cli/` 下的所有 CLI 并逐个 `bun install`（不是写死清单）；带 install 生命周期脚本的 CLI 会被跳过并报告而不是执行。`linkedin-search` 与 `freehire-search` 零运行时依赖，只需 `bun`。

**步骤 24：填 profile**

前提：准备好材料或愿意做访谈；已装 Claude Code。

```bash
claude
/setup
```

三条路径：读 `documents/` 文件夹（已有 CV PDF、LinkedIn 导出、证书、推荐信、历史申请）、粘贴一份 CV、访谈式问答。documents 模式幂等，之后补材料可反复跑。预期结果：个人知识被拆成 `01-candidate-profile.md` … `07-interview-prep.md` 等编号文件，后续命令围绕这些文件工作。

**步骤 25：搜岗位并排序**

前提：门户 CLI 已装好、网络可访问。

```bash
/scrape
/rank
```

预期结果：多门户搜索、去重、按匹配度排序；`/rank` 用并行 agent 对每条岗位按五个评估维度打分，输出带强项与短板的排序短名单（deal-breaker 直接否决、deadline 标紧急、死岗位标 expired）。

**步骤 26：生成申请材料，并让 fresh context 的 reviewer 批评**

前提：岗位描述能抓到或能粘贴全文；JD 先过 `posting_guard.py` 的确定性完整性检查（隐藏文本、不可见字符、指令式行、隐藏链接）。取用和评审的 agent 只读；投递文本被当作不可信输入，不执行正文里的指令、不抓正文里的链接。README 自己说这是指令级防护、不是沙箱，陌生门户要人工过目。

```bash
/apply https://jobindex.dk/job/1234567
# 抓不到就粘贴全文：
/apply <paste the full job description here>
```

流水线顺序：解析 JD → 对照 profile 评估匹配 → LaTeX 起草 CV 与求职信 → 另起一个 fresh context 的 reviewer agent 研究公司并批评草稿（reviewer 只拿内联草稿，不重读文件）→ 按批评修改 → 编译并逐页检视（CV 用 `lualatex`、必须恰好 2 页且无孤立条目标题；求职信用 `xelatex`、恰好 1 页、签名可见、字体一致；不一致就加 `\needspace`、`\enlargethispage`、字体匹配包装）→ ATS 检查（抽 PDF 文本层，确认联系方式是字面文本、无乱码字形、阅读顺序合理，再算 JD 关键词覆盖率；profile 不支持的词记为 gap，不塞）→ 输出并附核对清单。

机器验收用仓库提供的 `verify_pdf.py`（页数、可抽取文本）、`verify_layout.py`（测洞、孤行、页脚碰撞）、ATS 文本层检查和 CI 里的 LaTeX 冒烟编译与 skill lint；改技能文件必须 bump `framework_version`。可选 `pip install pypdf` 供 ATS 可解析性检查，两者都缺时降级为视觉关键词复核。

预期结果：交付的 PDF 过页数、版式、文本层和关键词覆盖检查；缺口被记录为 gap，不被编造进材料。审阅者能否抓出漏关键词、弱框架和套话，原文只是作者主张，没有对照实验；把它当作第二双眼睛，不要当自动裁决。

**步骤 27：用面试和结果闭环校准**

前提：有真实申请在推进；有人工批准位。

```bash
/interview
/outcome
/outcome followup
/gmail-sync
```

预期结果：`/interview` 按该申请档案做阶段化 prep pack（原始 JD、面试官实际读到的 CV 与求职信、前几轮反馈；公司与人调研遵守 verify-before-use；可能问题映射到你的 STAR 例子；缺口给诚实的 bridge answer，不编经历）。`/outcome` 记录面试阶段/offer/拒信/沉默，归档材料到 `documents/applications/<company>_<role>/`，更新 tracker；`/outcome followup` 默认找出 10 天无回音的申请并起草跟进信，每份最多两次，且只用你已提交材料里的事实；`/gmail-sync` 只批量提议，批准后才写 tracker，offer 类不自动提议 `hired`/`offer_declined`，冲突信号转人工 `/outcome`。原文没有给出定时调度配置，节奏靠人手动触发。拿到几份结果后回 `/setup` 按“实际拿到面试的”重新校准 fit 框架。

**步骤 28：按长尾需要加扩展，不要一次装全家桶**

前提：上面主流程已跑通；模板必须能从命令行编译出 PDF；新增门户目标站点无登录墙。

```bash
/expand
/upskill
/html-report
/notion-sync
/add-template
/add-portal
```

预期结果：`/expand` 扫 profile 里已链接的 GitHub/作品集/Kaggle/Scholar 与课程大纲，带来源标签补充能力；`/upskill` 给 profile × 已投/已排序岗位的差距 heatmap 与带资源和课时的学习计划；`/html-report` 生成离线自包含仪表盘；`/notion-sync` 通过官方 Notion MCP 单向只读同步，repo 仍是唯一事实源。`/add-template` 采集源扩展名、编译命令、字体位置、样式规则、硬页数上限，存到 `templates/`，强制试编译，再接入 `/apply`；模板里用 `[PLACEHOLDER]` 占位所以可提交共享；`--list` / `--use <name>` / `--use default` 切换。`/add-portal` 调查搜索 URL 模式、结果结构、robots.txt/访问规则，按与自带技能相同的契约（`search`/`detail` CLI、`--format json|table|plain`、`SKILL.md` 里的 `enabled:` 开关、自带测试）脚手架新技能，注册前跑一次真实查询；有登录墙的拒绝，条款严格的门户加个人使用警告。

**步骤 29：安全与共享边界**

前提：仓库里已有个人材料。预期结果：不把公开 fork 当私有仓库；从其他 fork 拷门户技能前先通读代码、离线跑测试、检查 `dependencies` 与生命周期脚本；陌生门户的抓取与写入人工过目；`/gmail-sync` 与 `followup` 只起草/提议，不自动发送。

### 怎么选用 A / B / C / D / E

- 第一次接触、只想看清回路：走 A。
- 已经有明确“什么算通过”的检查、要把回路搬到自己的任务：走 B。
- 决策由固定规则+数字决定、不想自己写 Verifier，且场景就是永续合约交易研究：走 C。
- 需要给模型输出分级/分流、已有真人复核和结果标签、又不想让模型自评置信度：走 D；D 可以独立于 A/B/C 使用，但最好和独立验证器一起用。
- 多步文书任务、验收能写成页数/文本层/版式/关键词/发布信息等检查：走 E；先只取“起草—独立审阅—脚本验收—人工批准”四件事，不要整体照搬求职工具。
- 只想评估值不值得继续投入：先 A，再小范围 B 或 C 或 D 或 E。

### 不管走哪条路，都要守住的约束

1. **证据先于主张**：证据必须由注册的 `EvidenceTool` 先收集成类型化输入，再谈主张。文书任务里对应的是先拿到 JD、profile、已提交材料，再写。
2. **验证器必须独立**：检查引用、前提、作用域、精确有理数算术、单位；提交时原子地检查引用与冲突。模型不能靠置信度或一个 `verified` 字段给自己发验证。做法 C 的等价物是：模型引用的每一个数字都要对着发给它的 brief 校验，连值一起校验。做法 E 的等价物是：草稿之外另起 fresh context 的 reviewer，并用脚本检查页数、版式、文本层。
3. **成本先算**：fee、spread、impact、funding、slippage 组成往返成本，在订单存在之前就定价，声称的 edge 覆盖不了就直接拒。
4. **每个角色只看它工作需要的数字**：brief 由系统按角色写；宏观分析师永远不能提方向，情绪分析师不能编造没有数字支持的 mood。文书任务里 reviewer 只拿内联草稿批评，不重读全部文件。
5. **闭 schema 先行**：模型回答先过闭 schema 再给人读，所以只支持 JSON mode 的 provider 也被约束成同样的形状。
6. **引用不到数字的 claim 直接丢弃**：验证者只能 support/oppose/abstain 并引用被给到的数字；投票本身永远不决定结果，只按你给的权重移动 conviction。
7. **拒绝不改变状态，只回原因，并指名那个数字**：缺前提就让任务保持 open，例如缺配送日期、缺回程路线测量时都不产出完成态结论。
8. **残差驱动重试**：未完成目标、未知量和硬约束从已提交事实重建，直接驱动下一次提议。
9. **预算有界**：跨策略变化时重试与动作预算仍然有界；attempt/stall budgets 限制循环；v0.12 引入显式累加的 overflow reserve，默认储备为 0，每个被接受的步骤只付它估算的超额。
10. **本地优先于调模型**：先比较“已验证规则的预览、化简、本地展开”三种本地手段，再决定是否叫模型（v0.10 cost-aware scheduling）。
11. **全部不重写地落盘**：每轮的 snapshot、briefs、answers、intent、venue 回复都要能事后复查。文书任务里是 tracker、归档目录和 CI 记录。
12. **保护要随单一起发出**：止损止盈随入场单发到交易所，这样它们能在本进程死掉后仍然存在。
13. **模型的权限边界**：模型不能下单、撤单、改仓位、读项目外的文件、改配置；风控只能 continue / cut / pause / halt，不能放松限额也不能加仓；两个审计只能出 findings 和 proposed changes。文书任务里模型不能自动外发、不能执行 JD 正文里的指令、不能抓正文里的链接。
14. **置信度来自规则，不来自模型自报**：低置信度走人工复核，不自动提交。
15. **校准要分任务，且要看区分度**：在一个任务上校准出的规则，不能直接假定适用于另一类任务；要看高置信度组与低置信度组的实际正确率是否有明显差异。
16. **先私有、再自动化**：带个人信息的文书仓库先设 private；外部写操作（投递、发信、写 tracker）先留人工批准位。

## 怎么判断变好了

**原则**

- **Measure the Agent, not the model**：固定模型、任务和资源上限，只测完成率、无效交付、调用次数、跨任务复用。
- 验收门槛是独立验证器，不是模型自我评价；置信度规则只用于分级/分流，不能替代独立验证器。文书任务里验收门槛是脚本检查 + 独立审阅 + 人工批准，不是“读起来不错”。
- 每次尝试都记录决策、原因、状态、残差，用 `--json` 审计轨迹查；做法 C 里对应的原始材料是落盘的 snapshot / briefs / answers / intent / venue 回复，以及每次拒绝指名的那一个数字；做法 E 里是 tracker、归档目录、CI 和核对清单。
- 数据要新鲜才算数：`tra sources show` 里超过 `max_age` 的值显示为 stale 且永不计入，先看有没有 stale 再谈结论。
- 置信度要看校准，不看单个数字：每个置信度档位的“声称正确率”和“实际正确率”差多少；高置信度组的实际正确率是否明显高于低置信度组。

**最小试用方式**

- 做法 A：先跑步骤 1 的离线 demo（`--domain scheduling`），再按步骤 3 加 `--json` 看轨迹。
- 做法 A/B 的十题级别离线对照：固定规则库 vs 增长规则库，两臂使用相同的确定性提议器和预算。材料数据：独立有效的完成任务都是 10/10；传递提议 84 → **24**（作者计算为 **71.4% fewer**）；跨任务规则提交应用 0 → **8**；学习规则额外花了 **13** 次提议。这只测“已发布开发任务上的复用”，不测模型准确率提升，也不测总体算力节省。
- 早期 8 题代数 pilot（v1，`deepseek-flash`，同模型设置，每题 8 次调用上限，独立精确 oracle 评分）：ReAct-style 5/8（3 个无效答案）、verify-and-retry 6/8、residual reasoning 6/8；第四组“residual + verified knowledge”的数字在材料中未完整给出，不要补。
- 做法 C：先在沙箱里 `tra run`（用实时行情决策但不发单），看每个决定与每次拒绝是否都带得出背后的数字；再 `tra paper --minutes 30` 在实时行情上空跑，`tra backtest` 用净成本回放一天。材料没有给出这些路径的收益类效果数字，不要拿它当业绩证据。
- 做法 C 的前置检查也算可观察指标：`tra check` 就绪时给 `ok provider groq: ready` / ``ready to run `tra run` ``，未就绪时它指出下一步唯一要修的那件事。
- 做法 D：选一个窄而重复、已有真人复核的流程（客服回复、工单回复或文档问答）；按步骤 17 记录可观测信号；用已复核历史数据算初始基率；对每条新输出记录规则置信度和最终是否正确；先做影子模式，不自动发送；把低置信度输出送人工复核；按周或固定周期生成校准表。可观察指标：校准偏差、信息利用程度、稳定性、分流效果、记录覆盖度。
- 做法 E：先挑一件真实多步文书任务，不装全家桶。最小试用是：写 3 条机器可检的验收标准（页数、文本可抽取、联系方式是字面文本、关键词覆盖率、发布信息完整性等）→ 让 drafter 出草稿 → 另起 fresh context 的 reviewer 只拿草稿批评 → 按批评修改 → 跑脚本检查 → 人工批准后才外发。试 5–10 个真实任务，记录每次被脚本拒绝的原因、审阅者指出的问题、人工改了什么、最终是否被接受；不要用“感觉写得更好了”当结论。
- 做法 E 的可观察指标：脚本一次通过率；被脚本拒绝的具体原因分布（页数、版式、文本层、关键词、隐藏字符等）；人工返工次数；审阅者指出的问题中，修改后确实消失的比例；外发后是否出现事实错误或格式事故；从草稿到可交付的端到端时长。原文没有给出这些指标的目标值，先记录基线再比较。

**试多久**

材料没有给出统一时间长度。它给出的可比单位是“十题离线对照”“每题 8 次调用上限”，做法 C 的 bar 粒度（15 分钟 bar 决策、`--every 15m`），做法 D 的按周或固定周期汇总，做法 E 的“5–10 个真实任务”是这里建议的最小观察窗口而非原文数字。按这些粒度做最小对照，不要用“感觉聪明了”当结论。

## 常见坑

- **让模型自己发验证**：用置信度或一个 `verified` 字段替代独立检查。
- **用 LLM 自报置信度做校验或分流**：这个数字只是逐 token 生成的文本延续，不是对内部状态的测量，也没有针对“它是否答对”校准；换措辞、重复问都可能变。原文用客户支持回复分流作为案例，但没有给出实验统计或基准测试。
- **证据后补**：先让模型主张、再去找证据。
- **把 `solved` 当成工程可行**：`solved` 只是声明的义务已完成，适配器有自己的有界范围。
- **缺前提也强行给完成态**：缺配送日期、缺回程路线测量时都应保持 open。
- **拒绝时改动状态**：正确做法是保留状态、只回传原因；而且要指名背后的那个数字。
- **实时失败没有回退却当成离线用**：ResiMind 材料明确实时请求失败后没有离线回退；实时调用还会产生费用，也可能一直保持未解决状态。
- **把领域示例当生产证据**：ResiMind v0.12.1 为 Experimental，领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果；trading-research-agents 为 alpha，真实资金路径作者自己没跑过；ai-job-search 只有作者一人的求职漏斗，无对照。
- **用 GitHub 的 `develop` 分支而不是 PyPI release**：README 明确那里的 commit 不是 release。
- **`.env` 放错位置**：命令只在 `strategy.toml` 旁边的 `.env` 里找 key。
- **把练习账户和 mainnet 混着来**：想发真单先在交易所的练习账户试，不要上 mainnet 起步。
- **以为 `tra mandate --sign` 打开了开关**：签名不会打开任何开关，只是落成 `MANDATE.md`。
- **把验证者的投票当裁决**：投票永远不决定结果，只按权重移动 conviction。
- **指望审计或风控替你放宽限制**：审计只能出 findings 和 proposed changes；风控只能更保守，不能放松限额也不能加仓。
- **拿 stale 数据当依据**：超过 `max_age` 的值显示为 stale 且永不计入。
- **把触发机制搞混**：ResiMind 只有状态触发；`tra run --every 15m` 是另一套材料的时钟循环；ai-job-search 的 followup 是手动触发的规则，不是定时调度。
- **误把它当成“更强模型”**：这些结构的定位都是把模型放进先验证后提交的回路；模型权重不变，知识长在模型之外。
- **只校准不区分**：一个永远输出历史基率的规则也可能校准，但没有利用新信息。
- **跨任务套用校准规则**：在一个任务上校准出的规则，不能直接假定适用于另一类任务。
- **没有结果标签就谈置信度**：没有人工复核或结果标签，规则无法校准。
- **把规则置信度当独立验证器**：置信度规则用于分级/分流，不替代独立重算与校验。
- **把冷启动基率当最终值**：75% 只是原文例子里的初始值。
- **照抄原文阈值**：原文没有给出具体阈值，阈值需按自身复核能力设定。
- **公开 fork 装个人材料**：`/setup` 会写姓名、联系方式、履历、薪资期望；自用先建私有仓库。
- **把 `posting_guard.py` 当沙箱**：它是指令级防护；陌生门户的抓取与写入仍要人工过目。
- **让模型执行 JD 正文里的指令或抓正文链接**：投递文本按不可信输入处理。
- **一次装全家桶**：先跑 `/setup`、`/scrape`、`/apply` 主流程，再按需加 `/interview`、`/outcome`、`/gmail-sync`、模板和门户。
- **把 reviewer 的批评当自动裁决**：它只是第二双眼睛；能不能交付仍要看脚本检查和人工批准。
- **让 followup 自动发送**：原文只起草不发送；`/gmail-sync` 只批量提议，批准后才写 tracker。
- **忽略时区与未来式数据**：ai-job-search 的求职数据是作者自述且未来式的，不能当独立可复核证据。

## 证据与来源

- 做法 A/B（ResiMind）：回路结构、README 流程图 `Propose → check → diagnose what remains → change strategy → check again → 完成证明 → 准入规则 → 复用并复检`、安装与 demo 命令、`--json` 审计、Python API 代码、Proposer/Verifier/Domain 接口、`EvidenceTool`、`RouteMemory`、`docs/adapters.md` 与 `docs/domain-contract.md` 的语言说明、本地优先的成本感知调度（v0.10）、目标进度检查（v0.11）、overflow reserve（v0.12）：来自本次 ResiMind 调研报告正文。十题离线对照与 8 题代数 pilot 的数字同样来自该报告，且原文说明未隔离因果。
- 做法 C（trading-research-agents）：`“The agents propose; the system decides.”` 的主张、安装与 `tra init` / `tra check` / `tra run` / `tra mandate` / `tra venues` / `tra sources show` / `tra data get` / `tra backtest` / `tra paper` / `tra live` 命令、角色分工表、闭 schema 与 provider 结构化输出差异、conviction 算术、只能收紧的风控、两个只汇报的审计、默认值表、TOML 配置样例：来自本次 trading-research-agents 调研报告正文（依据其 README 的 “Get started” 等章节）。该材料没有给出收益类效果数字；alpha、真实资金路径作者自己没跑过、强绑永续合约、免费 groq 档与 provider 表、`develop` 分支不是 release，也来自该报告正文与结论。
- 做法 D（置信度校准）：核心主张“不要用 LLM 自报置信度”、天气预报员类比、客户支持回复分流 6 步流程、200 条/150 条正确→75%、有匹配文章且两次回答一致 95%、无匹配文章 40%、90% 档实际 70% 的说明性例子：来自本次“Using LLM for confidence scoring is a bad idea”调研报告。报告说明这些是解释性示例，不是真实实验数据；原文没有代码、配置文件或完整系统实现；没有给出具体阈值。可观测信号清单、按周左右检查校准表、影子模式、人工复核分流也来自该报告。该报告局限：核心论证取决于是否有同类问题历史记录、是否能判定每次输出正确与否、记录是否足够支撑分组；规则只和记录一样好；校准必须针对同类问题；校准本身不等于有用。
- 做法 E（ai-job-search）：把个人知识拆成 `01-candidate-profile.md` … `07-interview-prep.md`、`.claude/commands/*.md`、`verify_pdf.py`、`verify_layout.py`、`posting_guard.py`、`lint_skills.py`、drafter 写 + fresh context 的 reviewer 批评、LaTeX 页数与版式规则、ATS 文本层与关键词覆盖、CI 的 LaTeX 冒烟编译与 skill lint、`framework_version` bump 检查、私有仓库警告、`/setup` / `/scrape` / `/rank` / `/apply` / `/interview` / `/outcome` / `/gmail-sync` / `/expand` / `/upskill` / `/html-report` / `/notion-sync` / `/add-template` / `/add-portal` 的用法与前提：来自本次 ai-job-search 调研报告正文，依据其 README 与 `SETUP.md`。其中 `verify_pdf.py`、`verify_layout.py`、ATS 检查、CI、`posting_guard.py` 属于仓库中可直接核对的机器检查；reviewer 能抓出漏关键词/弱框架/套话、框架“编码了职业指导最佳实践”、模式可迁移到其他多步文书任务，属于作者主张，原文没有非求职用例，也没有对照实验。作者自述数据为 69 份定制申请、20 次一面、1 份签约、2026 年 6 月入职；仓库 stars 63187；这是单一样本、自我报告、无对照，且时间是未来式的，不能独立复核。门户绑定丹麦市场、Claude Code 无免费层、需要 LaTeX/Bun/Python、`/apply` 编译-检视循环多花 token、LinkedIn 自动化违反 ToS、安全边界是指令级不是沙箱、原文没有 cron/CI 定时调度配置：均来自该报告。
- 需要区分的两类信息：命令、接口契约、审计方式、默认值表、脚本名与 CI 检查属于仓库/README 材料可直接核对；完成率、提议次数、复用次数、69→20→1 等效果数字属于作者自报，ResiMind 原文说明未隔离因果，ai-job-search 无对照；trading-research-agents 材料未给出任何收益类效果数字；置信度调研的 75%/95%/40%/90%/70% 均为解释性示例。采用前先按“怎么判断变好了”自行验证。

## 依据的调研

- [1105216375-alt/resimind](../research/radar/2026-10-10/2425-1105216375-alt-resimind.md)：值得一试，可以小范围试：ResiMind 给出可直接跑的安装命令、离线 demo 和「Proposer/Verifier/Domain 三接口」适配器契约，能把「先验证再提交事实 + 残差驱动重试 + 验证过才入库的规则记忆」这套流程搬到自己有客观校验标准的任务上；但它是 v0.12.1 实验版、领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果，所以先试不要直接采用。
- [BijectiveLabs/trading-research-agents](../research/radar/2026-10-18/4632-bijectivelabs-trading-research-agents.md)：值得一试，建议先照 README 的六步在沙箱里跑一遍（免费 groq key + `tra init` / `tra check` / `tra run --every 15m`），把它的“模型只提议、系统算数并执行、每次拒绝都指名背后的数字”这套结构抽出来复用；理由是这个仓库把该结构的每一步都写成了可复制的命令、配置和角色分工表，但项目处于 alpha、真实资金路径作者自己没跑过，且强绑定永续合约交易场景，所以只适合小范围试。
- [Using LLM for confidence scoring is a bad idea](../research/radar/2026-10-22/5721-using-llm-for-confidence-scoring-is-a-bad-idea.md)：值得一试，不要采用 LLM 自报置信度来做校验或分流；改用可观测信号、历史正确率和定期校准的规则，并先在有人工复核的窄流程中小范围验证。原文给出了可操作的记录与校准步骤，但证据以论证和示例为主，尚不足以直接全面采用。
- [ai-job-search-dev/ai-job-search](../research/radar/2026-10-22/5843-ai-job-search-dev-ai-job-search.md)：值得一试，把它的“起草—独立审阅—机器可检验收”流水线（drafter/reviewer 双 agent、把验收标准写成脚本、把个人知识拆成编号 profile 文件）抽出来小范围试，而不是整体照搬求职工具；理由是把多步文书任务拆成可复用命令、并用脚本而非“看着还行”来验收，正是最值得迁移到其他工作的部分，但原文的实证只有作者一人的求职漏斗，门户工具绑定丹麦市场，且需要付费 Claude 加 LaTeX/Bun 环境。
