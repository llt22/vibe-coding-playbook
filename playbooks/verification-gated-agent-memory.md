# 让模型只提议、让独立验证器算数并裁决：可校验任务与交易决策的提交回路

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：模型会把「我觉得对」当成「已经对」，而这套工作方法要解决的是：在有独立校验标准的任务上，怎么让模型只提议、由系统独立算数并裁决，并让每次拒绝都指名背后的那个数字。
> 先试这一步：先跑一个离线/沙箱 demo 把回路看清：通用可校验任务跑 `python -m resimind demo --domain scheduling`；交易决策场景先 `tra init my-desk --profile autonomous --agent groq`，再 `tra check`、`tra run`（沙箱，什么都不发出去）。
> 最近修订：2026-10-18

## 解决什么问题

模型会把「我觉得对」当成「已经对」。关键不是换一个更强的模型，而是改变提交规则。两份材料给的是同一条回路在两个场景里的实现：

- 在有客观对错的任务上（对账、排班、行程规划、约束优化、工程校核等），ResiMind README 的流程图是 `Propose → check → diagnose what remains → change strategy → check again → 完成证明 → 准入规则 → 复用并复检`。
- 在由固定规则和一串数字决定结果的决策上（例如一笔永续合约交易要不要开、开多大），trading-research-agents README 的一句话是 **"The agents propose; the system decides."**：模型只负责「读数据、给判断」——方向、setup、信心、时间尺度、止损/目标位置；取数、算每一个数字、给往返成本定价、套用你设的限额、定仓位，然后要么把决定写下来、要么发一张带止损止盈的单，全部由系统（固定规则、无模型参与）做。

两者共用的提交规则：

- 模型只负责「提议」下一步候选与证据引用。
- 可信的领域代码独立重算结果，检查引用、前提、作用域、精确有理数运算和单位；模型不能靠置信度或一个 `verified` 字段给自己发验证。
- 未通过不改变状态，只把原因回给提议方；未完成的目标、未知量和硬约束构成「残差」，从已提交事实重建后直接驱动下一次提议。
- 每个决定和每次拒绝都连同理由落盘，事后可查「发生了什么、为什么」，而且不重写。
- 任务完成后才从已完成的推导中抽取候选规则，经独立准入、重载复检、每次新应用再检查，存进持久规则库。模型权重不变，知识长在模型之外。

## 适用与不适用

**适用**

- 结果能被独立重算/校验的任务。材料列出的可校验类别：有约束的行程规划（时间窗、预算、步行上限、路线连续性、室内要求）、退款金额与保单资格核对、带等式/非负/上界约束的二次优化与全局最优性证书、连续梁内力与位移协调、线性方程求解、轴向杆应力。共同点是「对错由外部计算决定」。
- 决策由固定规则加数字决定、且你不想自己写验证器的场景：trading-research-agents 的当前可用范围是永续合约（USDT/USDC 保证金），四类分析师 + 最多三个验证者 + 只能收紧的风控 + 两个审计。
- 需要跨任务复用已验证规则、又不想改模型权重的场景（知识长在模型之外）。
- 想先比较「已验证规则的预览、化简、本地展开」三种本地手段，再决定是否叫模型的场景。

**不适用或要谨慎**

- 没有独立验证标准的任务。材料反复强调：验收门槛是独立验证器，不是模型自我评价；写不出「什么算通过」的独立检查，就不要照搬这套回路。
- 把 `solved` 当成「存在可行解或满足工程限值」。材料明确：`solved` 只表示「声明的义务已完成」，每个适配器有自己的有界范围。
- 想靠它直接提升模型准确率或节省总体算力。原文明确：十题离线对照只测「已发布开发任务上的复用」，不测模型准确率提升，也不测总体算力节省。
- trading-research-agents 处于 alpha，真实资金路径作者自己没跑过，且强绑定永续合约交易场景——只适合小范围试，不要用真钱起步。
- 想找时间或外部事件触发的后台持续运行机制时，要分开看两份材料：ResiMind 材料里只有状态触发（残差驱动下一次提议），没有时间触发和后台持续运行的说明；trading-research-agents 提供 `tra run --every 15m` 这种按 15 分钟 bar 的时钟循环。前者是「有残差才动」，后者是「到点就看一次」，不要混为一谈。

## 前置条件

- ResiMind 路径：Python 3.10+；离线 demo 不需要 API key；只有 `--domain lean` 额外需要已安装的 Lean 4.29.0 工具链。要接真模型时才需要环境变量（如 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`）；实时调用会产生费用，且**实时请求失败后没有离线回退**。
- trading-research-agents 路径：Python 3.11+；需要一个 provider 的 key（免费档可用 groq）；每个命令只在 `strategy.toml` 旁边的 `.env` 里找 key。
- 要为自己的任务写适配器，前提是能先明确写出「什么算通过」的独立检查；ResiMind 核心不 import 任何参考领域。
- 版本认知：ResiMind 材料依据的是 v0.12.1 / Experimental，MIT，仓库 30 stars，领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果；trading-research-agents 为 MIT、PyPI 包、README 标注 Status: alpha。两者都先小范围试，不要直接采用。

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

Windows PowerShell 的激活命令改为 `.venv\Scripts\Activate.ps1`。安装过程可能下载 build tools。`python -m resimind` 和安装后的 `resimind` 命令在仓库目录之外也能用。

预期结果：第一个 demo 会保存并重载已校验规则，然后比较「空规则库」与「已学习规则库」，并配置了一个模型回调——正常任务应当**不会**触发该回调；另有一个本地预算被故意设为 0 的用例，会触发一次脚本化提议来展示 fallback。全程不发起 API 调用。

**步骤 2：按目的挑一个离线 demo**

前提：同上，全部离线；只有 `--domain lean` 额外需要已安装的 Lean 4.29.0 工具链。先选一个贴近你要迁移的回路。

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

预期结果：逐步查看每一步的决策、原因、状态和残差。这是后面判断「有没有变好」的原始材料。

### 做法 B：直接用自己的任务接适配器（已经有明确「什么算通过」的检查时走这条）

**步骤 4：写 Proposer / Verifier / Domain 三接口适配器**

前提：先能明确写出「什么算通过」的独立检查；核心不 import 任何参考领域。

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

注意：`solved` 只表示「声明的义务已完成」，**不自动等于存在可行解或满足工程限值**——每个适配器有自己的有界范围。

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

预期结果：决定与拒绝理由连同快照、briefs、answers、intent 落盘，可事后查「发生了什么、为什么」。

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

### 怎么选用 A / B / C

- 第一次接触、只想看清回路：走 A。
- 已经有明确「什么算通过」的检查、要把回路搬到自己的任务：走 B。
- 决策由固定规则+数字决定、不想自己写 Verifier，且场景就是永续合约交易研究：走 C。
- 只想评估值不值得继续投入：先 A，再小范围 B 或 C。

### 不管走哪条路，都要守住的约束

1. **证据先于主张**：证据必须由注册的 `EvidenceTool` 先收集成类型化输入，再谈主张。
2. **验证器必须独立**：检查引用、前提、作用域、精确有理数算术、单位；提交时原子地检查引用与冲突。模型不能靠置信度或一个 `verified` 字段给自己发验证。做法 C 的等价物是：模型引用的每一个数字都要对着发给它的 brief 校验，**连值一起校验**。
3. **成本先算**：fee、spread、impact、funding、slippage 组成往返成本，在订单存在之前就定价，声称的 edge 覆盖不了就直接拒。
4. **每个角色只看它工作需要的数字**：brief 由系统按角色写；宏观分析师永远不能提方向，情绪分析师不能编造没有数字支持的 mood。
5. **闭 schema 先行**：模型回答先过闭 schema 再给人读，所以只支持 JSON mode 的 provider 也被约束成同样的形状。
6. **引用不到数字的 claim 直接丢弃**：验证者（pro / contra / neutral）只能 support/oppose/abstain 并引用被给到的数字；投票本身永远不决定结果，只按你给的权重（`[conviction].validator_weight`）去移动 conviction。conviction 是算术：每个分析师的观点按其读数相对你画的阈值折算成 -1..1 的分数，一致就放大、反对按比例缩小，只有反对压过支持才中止交易。
7. **拒绝不改变状态，只回原因，并指名那个数字**：缺前提就让任务保持 open，例如缺配送日期、缺回程路线测量时都不产出完成态结论。
8. **残差驱动重试**：未完成目标、未知量和硬约束从已提交事实重建，直接驱动下一次提议。
9. **预算有界**：跨策略变化时重试与动作预算仍然有界；attempt/stall budgets 限制循环；v0.12 引入显式累加的 overflow reserve 用于异常大的符号步，默认储备为 0（保持旧行为），每个被接受的步骤只付它估算的超额。
10. **本地优先于调模型**：先比较「已验证规则的预览、化简、本地展开」三种本地手段，再决定是否叫模型（v0.10 cost-aware scheduling）。能直接闭合任务的规则即使表达式更大也可以赢；如果更简单的本地工作更便宜，匹配的规则可以被跳过。本地预算不足时才出现模型回调。
11. **全部不重写地落盘**：每轮的 snapshot、briefs、answers、intent、venue 回复都要能事后复查。
12. **保护要随单一起发出**：止损止盈随入场单发到交易所，这样它们能在本进程死掉后仍然存在。
13. **模型的权限边界**：模型不能下单、撤单、改仓位、读项目外的文件、改配置；风控只能 continue / cut / pause / halt（各自带声明的小时数），**不能放松你设的限额，也不能加仓**；两个审计只能出 findings 和 proposed changes，不能改任何东西。

## 怎么判断变好了

**原则**

- **Measure the Agent, not the model**：固定模型、任务和资源上限，只测完成率、无效交付、调用次数、跨任务复用。
- 验收门槛是独立验证器，不是模型自我评价。
- 每次尝试都记录决策、原因、状态、残差，用 `--json` 审计轨迹查；做法 C 里对应的原始材料是落盘的 snapshot / briefs / answers / intent / venue 回复，以及每次拒绝指名的那一个数字。
- 数据要新鲜才算数：`tra sources show` 里超过 `max_age` 的值显示为 stale 且永不计入，先看有没有 stale 再谈结论。

**最小试用方式**

- 做法 A：先跑步骤 1 的离线 demo（`--domain scheduling`），再按步骤 3 加 `--json` 看轨迹。
- 做法 A/B 的十题级别离线对照：固定规则库 vs 增长规则库，两臂使用相同的确定性提议器和预算。材料中这组对照的数据：独立有效的完成任务都是 10/10；传递提议 84 → **24**（作者计算为 **71.4% fewer**）；跨任务规则提交应用 0 → **8**；学习规则额外花了 **13** 次提议。原文明确：这只测「已发布开发任务上的复用」，不测模型准确率提升，也不测总体算力节省。
- 早期 8 题代数 pilot（v1，`deepseek-flash`，同模型设置，每题 8 次调用上限，独立精确 oracle 评分）：ReAct-style 5/8（3 个无效答案）、verify-and-retry 6/8、residual reasoning 6/8；第四组「residual + verified knowledge」的数字在材料中未完整给出，不要补。
- 做法 C：先在沙箱里 `tra run`（用实时行情决策但不发单），看每个决定与每次拒绝是否都带得出背后的数字；再 `tra paper --minutes 30` 在实时行情上空跑，`tra backtest` 用净成本回放一天。材料没有给出这些路径的收益类效果数字，不要拿它当业绩证据。
- 做法 C 的前置检查也算可观察指标：`tra check` 就绪时给 `ok provider groq: ready` / `ready to run `tra run``，未就绪时它指出下一步唯一要修的那件事。

**试多久**

材料没有给出时间长度。它给出的可比单位是「十题离线对照」「每题 8 次调用上限」，以及做法 C 的 bar 粒度（15 分钟 bar 决策、`--every 15m`）。按这些粒度做最小对照，不要用「感觉聪明了」当结论。

## 常见坑

- **让模型自己发验证**：用置信度或一个 `verified` 字段替代独立检查。
- **证据后补**：先让模型主张、再去找证据，而不是先由注册的 `EvidenceTool` 收集类型化输入。
- **把 `solved` 当成工程可行**：`solved` 只是声明的义务已完成，适配器有自己的有界范围。
- **缺前提也强行给完成态**：缺配送日期、缺回程路线测量时都应保持 open。
- **拒绝时改动状态**：正确做法是保留状态、只回传原因；而且要指名背后的那个数字。
- **实时失败没有回退却当成离线用**：ResiMind 材料明确实时请求失败后没有离线回退；实时调用还会产生费用，也可能一直保持未解决状态。
- **把领域示例当生产证据**：ResiMind v0.12.1 为 Experimental，领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果；trading-research-agents 为 alpha，真实资金路径作者自己没跑过。
- **用 GitHub 的 `develop` 分支而不是 PyPI release**：README 明确那里的 commit 不是 release。
- **`.env` 放错位置**：命令只在 `strategy.toml` 旁边的 `.env` 里找 key。
- **把练习账户和 mainnet 混着来**：想发真单先在交易所的练习账户试，不要上 mainnet 起步。
- **以为 `tra mandate --sign` 打开了开关**：签名不会打开任何开关，只是落成 `MANDATE.md`。
- **把验证者的投票当裁决**：投票永远不决定结果，只按权重移动 conviction。
- **指望审计或风控替你放宽限制**：审计只能出 findings 和 proposed changes、不能改任何东西；风控只能让 desk 更保守，不能放松限额也不能加仓。
- **拿 stale 数据当依据**：超过 `max_age` 的值显示为 stale 且永不计入。
- **把触发机制搞混**：ResiMind 材料里只有状态触发（残差驱动下一次提议），没有时间触发和后台持续运行的说明；`tra run --every 15m` 是另一套材料里的时钟循环。
- **误把它当成「更强模型」**：这两套东西的定位都是把模型放进先验证后提交的回路；模型权重不变，知识长在模型之外。

## 证据与来源

- ResiMind 侧：回路结构、README 流程图 `Propose → check → diagnose what remains → change strategy → check again → 完成证明 → 准入规则 → 复用并复检`、安装与 demo 命令、`--json` 审计、Python API 代码、Proposer/Verifier/Domain 接口、`EvidenceTool`、`RouteMemory`、`docs/adapters.md` 与 `docs/domain-contract.md` 的语言说明、本地优先的成本感知调度（v0.10）、目标进度检查（v0.11）、overflow reserve（v0.12）：来自本次 ResiMind 调研报告正文。十题离线对照与 8 题代数 pilot 的数字同样来自该报告，且原文说明未隔离因果。
- trading-research-agents 侧：`"The agents propose; the system decides."` 的主张、安装与 `tra init` / `tra check` / `tra run` / `tra mandate` / `tra venues` / `tra sources show` / `tra data get` / `tra backtest` / `tra paper` / `tra live` 命令、角色分工表、闭 schema 与 provider 结构化输出差异、conviction 算术、只能收紧的风控、两个只汇报的审计、默认值表、TOML 配置样例：来自本次 trading-research-agents 调研报告正文（依据其 README 的 “Get started” 等章节）。
- 可校验任务类别清单（行程规划、退款与保单核对、带约束二次优化与最优性证书、连续梁内力与位移协调、线性方程求解、轴向杆应力）来自 ResiMind 调研报告。
- 「Measure the Agent, not the model」、验收门槛是独立验证器、每次尝试记录决策/原因/状态/残差：来自 ResiMind 调研报告。
- 适用边界（没有独立验证标准就不适用、`solved` 不等于可行解或满足工程限值、ResiMind 只有状态触发没有时间/事件触发、实时失败无离线回退、领域示例多为合成 fixture、效果数据作者自报且未隔离因果、v0.12.1 Experimental、30 stars）来自 ResiMind 调研报告。
- trading-research-agents 的 alpha 状态、真实资金路径作者自己没跑过、强绑永续合约交易场景、免费 groq 档与 provider 表、`develop` 分支不是 release：来自本次 trading-research-agents 调研报告正文与其结论。
- 与 DeepSeek 的关系（作为可选模型后端 `.[deepseek]`，环境变量 `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`；早期 pilot 用 `deepseek-flash` 做过 8 题代数对照实验）来自 ResiMind 调研报告。Semble 在本次材料中未被提及，不做推测。
- 需要区分的两类信息：命令、接口契约、审计方式、默认值表属于仓库/README 材料可直接核对；完成率、提议次数、复用次数等效果数字属于作者自报，且 ResiMind 原文说明未隔离因果；trading-research-agents 材料未给出任何收益类效果数字，采用前先按上面「怎么判断变好了」自行验证。

## 依据的调研

- [1105216375-alt/resimind](../research/radar/2026-10-10/2425-1105216375-alt-resimind.md)：值得一试，可以小范围试：ResiMind 给出可直接跑的安装命令、离线 demo 和「Proposer/Verifier/Domain 三接口」适配器契约，能把「先验证再提交事实 + 残差驱动重试 + 验证过才入库的规则记忆」这套流程搬到自己有客观校验标准的任务上；但它是 v0.12.1 实验版、领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果，所以先试不要直接采用。
- [BijectiveLabs/trading-research-agents](../research/radar/2026-10-18/4632-bijectivelabs-trading-research-agents.md)：值得一试，建议先照 README 的六步在沙箱里跑一遍（免费 groq key + `tra init` / `tra check` / `tra run --every 15m`），把它的“模型只提议、系统算数并执行、每次拒绝都指名背后的数字”这套结构抽出来复用；理由是这个仓库把该结构的每一步都写成了可复制的命令、配置和角色分工表，但项目处于 alpha、真实资金路径作者自己没跑过，且强绑定永续合约交易场景，所以只适合小范围试。
