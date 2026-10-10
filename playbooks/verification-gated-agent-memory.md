# 把有客观对错的任务交给模型：先验证，再提交

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当任务结果有外部可重算的对错标准时，怎么防止模型把自信当证据、把没通过检查的结果当成已完成。
> 先试这一步：先挑一个结果能被外部独立重算的任务，跑一遍 `python -m resimind demo --domain scheduling`，看清「提议 → 检查 → 拒绝只回原因 → 残差重试」的完整轨迹。
> 最近修订：2026-10-10

## 解决什么问题

模型会把「我觉得对」当成「已经对」。当任务本身有客观对错（对账、排班、行程规划、约束优化、工程校核等），关键不是换一个更强的模型，而是改变提交规则：

- 模型只负责「提议」下一步候选与证据引用。
- 可信的领域代码独立重算结果，检查引用、前提、作用域、精确有理数运算和单位；模型不能靠置信度或一个 `verified` 字段给自己发验证。
- 未通过不改变状态，只把原因回给提议方；未完成的目标、未知量和硬约束构成「残差」，从已提交事实重建后直接驱动下一次提议。
- 任务完成后才从已完成的推导中抽取候选规则，经独立准入、重载复检、每次新应用再检查，存进持久规则库。模型权重不变，知识长在模型之外。

ResiMind README 自己的流程图概括为：`Propose → check → diagnose what remains → change strategy → check again → 完成证明 → 准入规则 → 复用并复检`。这篇手册就是把这条回路搬到你自己的、有客观校验标准的任务上。

## 适用与不适用

**适用**

- 结果能被独立重算/校验的任务。调研报告列出的可校验类别：有约束的行程规划（时间窗、预算、步行上限、路线连续性、室内要求）、退款金额与保单资格核对、带等式/非负/上界约束的二次优化与全局最优性证书、连续梁内力与位移协调、线性方程求解、轴向杆应力。共同点是「对错由外部计算决定」。
- 需要跨任务复用已验证规则、又不想改模型权重的场景（知识长在模型之外）。
- 想先比较「已验证规则的预览、化简、本地展开」三种本地手段，再决定是否叫模型的场景。

**不适用或要谨慎**

- 没有独立验证标准的任务。材料反复强调：验收门槛是独立验证器，不是模型自我评价；写不出「什么算通过」的独立检查，就不要照搬这套回路。
- 把 `solved` 当成「存在可行解或满足工程限值」。材料明确：`solved` 只表示「声明的义务已完成」，每个适配器有自己的有界范围。
- 想靠它直接提升模型准确率或节省总体算力。原文明确：十题离线对照只测「已发布开发任务上的复用」，不测模型准确率提升，也不测总体算力节省。
- 想找时间或外部事件触发的后台持续运行机制。材料里只有状态触发（残差驱动下一次提议），没有时间触发和后台持续运行的说明。

## 前置条件

- Python 3.10+；离线 demo 不需要 API key。
- 只有 `--domain lean` 额外需要已安装的 Lean 4.29.0 工具链。
- 要接真模型时才需要环境变量（如 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`）；实时调用会产生费用，材料明确实时请求失败后没有离线回退。
- 要为自己的任务写适配器，前提是能先明确写出「什么算通过」的独立检查；核心不 import 任何参考领域。
- 版本认知：材料依据的是 ResiMind v0.12.1 / Experimental，MIT，仓库 30 stars，领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果。先小范围试，不要直接采用。

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

### 怎么选用 A 还是 B

- 第一次接触、只想看清回路：走 A。
- 已经有明确「什么算通过」的检查、要把回路搬到自己的任务：走 B。
- 只想评估值不值得继续投入：先 A，再小范围 B。

### 不管走 A 还是 B，都要守住的六条

1. **证据先于主张**：证据必须由注册的 `EvidenceTool` 先收集成类型化输入，再谈主张。
2. **验证器必须独立**：检查引用、前提、作用域、精确有理数算术、单位；提交时原子地检查引用与冲突。模型不能靠置信度或一个 `verified` 字段给自己发验证。
3. **拒绝不改变状态，只回原因**：缺前提就让任务保持 open，例如缺配送日期、缺回程路线测量时都不产出完成态结论。
4. **残差驱动重试**：未完成目标、未知量和硬约束从已提交事实重建，直接驱动下一次提议。
5. **预算有界**：跨策略变化时重试与动作预算仍然有界；attempt/stall budgets 限制循环；v0.12 引入显式累加的 overflow reserve 用于异常大的符号步，默认储备为 0（保持旧行为），每个被接受的步骤只付它估算的超额。
6. **本地优先于调模型**：先比较「已验证规则的预览、化简、本地展开」三种本地手段，再决定是否叫模型（v0.10 cost-aware scheduling）。能直接闭合任务的规则即使表达式更大也可以赢；如果更简单的本地工作更便宜，匹配的规则可以被跳过。本地预算不足时才出现模型回调。

## 怎么判断变好了

**原则**

- **Measure the Agent, not the model**：固定模型、任务和资源上限，只测完成率、无效交付、调用次数、跨任务复用。
- 验收门槛是独立验证器，不是模型自我评价。
- 每次尝试都记录决策、原因、状态、残差，用 `--json` 审计轨迹查。

**最小试用方式**

- 先跑步骤 1 的离线 demo（`--domain scheduling`），再按步骤 3 加 `--json` 看轨迹。
- 再做十题级别的离线对照：固定规则库 vs 增长规则库，两臂使用相同的确定性提议器和预算。材料中这组对照的数据：独立有效的完成任务都是 10/10；传递提议 84 → **24**（作者计算为 **71.4% fewer**）；跨任务规则提交应用 0 → **8**；学习规则额外花了 **13** 次提议。原文明确：这只测「已发布开发任务上的复用」，不测模型准确率提升，也不测总体算力节省。
- 早期 8 题代数 pilot（v1，`deepseek-flash`，同模型设置，每题 8 次调用上限，独立精确 oracle 评分）：ReAct-style 5/8（3 个无效答案）、verify-and-retry 6/8、residual reasoning 6/8；第四组「residual + verified knowledge」的数字在材料中未完整给出，不要补。

**试多久**

材料没有给出时间长度。它给出的可比单位是「十题离线对照」「每题 8 次调用上限」。按这个粒度做最小对照，不要用「感觉聪明了」当结论。

## 常见坑

- **让模型自己发验证**：用置信度或一个 `verified` 字段替代独立检查。
- **证据后补**：先让模型主张、再去找证据，而不是先由注册的 `EvidenceTool` 收集类型化输入。
- **把 `solved` 当成工程可行**：`solved` 只是声明的义务已完成，适配器有自己的有界范围。
- **缺前提也强行给完成态**：缺配送日期、缺回程路线测量时都应保持 open。
- **拒绝时改动状态**：正确做法是保留状态、只回传原因。
- **实时失败没有回退却当成离线用**：材料明确实时请求失败后没有离线回退；实时调用还会产生费用，也可能一直保持未解决状态。
- **把领域示例当生产证据**：v0.12.1 为 Experimental，领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果。
- **误以为有定时或事件触发**：材料只有状态触发（残差驱动下一次提议），没有时间触发和后台持续运行的说明。
- **误把它当成「更强模型」**：它的定位是把模型放进先验证后提交的回路；模型权重不变，知识长在模型之外。

## 证据与来源

- 回路结构、README 流程图 `Propose → check → diagnose what remains → change strategy → check again → 完成证明 → 准入规则 → 复用并复检`、安装与 demo 命令、`--json` 审计、Python API 代码、Proposer/Verifier/Domain 接口、`EvidenceTool`、`RouteMemory`、`docs/adapters.md` 与 `docs/domain-contract.md` 的语言说明、本地优先的成本感知调度（v0.10）、目标进度检查（v0.11）、overflow reserve（v0.12）：来自本次 ResiMind 调研报告正文。
- 十题离线对照：固定规则库 vs 增长规则库，独立有效完成任务 10/10；传递提议 84 → 24（作者计算为 71.4% fewer）；跨任务规则提交应用 0 → 8；学习规则额外花 13 次提议；两臂使用相同确定性提议器和预算。原文明确这只测「已发布开发任务上的复用」，不测模型准确率提升、不测总体算力节省。
- 早期 8 题代数 pilot（v1，`deepseek-flash`，同模型设置，每题 8 次调用上限，独立精确 oracle 评分）：ReAct-style 5/8（3 个无效答案）、verify-and-retry 6/8、residual reasoning 6/8；第四组 residual + verified knowledge 的数字在材料中未完整给出。
- 可校验任务类别清单（行程规划、退款与保单核对、带约束二次优化与最优性证书、连续梁内力与位移协调、线性方程求解、轴向杆应力）：来自调研报告。
- 「Measure the Agent, not the model」、验收门槛是独立验证器、每次尝试记录决策/原因/状态/残差：来自调研报告。
- 适用边界（没有独立验证标准就不适用、`solved` 不等于可行解或满足工程限值、只有状态触发没有时间/事件触发、实时失败无离线回退、领域示例多为合成 fixture、效果数据作者自报且未隔离因果、v0.12.1 Experimental、30 stars）：来自调研报告。
- 与 DeepSeek 的关系（作为可选模型后端 `.[deepseek]`，环境变量 `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`；早期 pilot 用 `deepseek-flash` 做过 8 题代数对照实验）来自调研报告。Semble 在本次材料中未被提及，不做推测。
- 需要区分的两类信息：命令、接口契约、审计方式来自仓库/README 材料；完成率、提议次数、复用次数等效果数字属于作者自报，且原文说明未隔离因果，采用前先按上面「怎么判断变好了」自行验证。

## 依据的调研

- [1105216375-alt/resimind](../research/radar/2026-10-10/2425-1105216375-alt-resimind.md)：值得一试，可以小范围试：ResiMind 给出可直接跑的安装命令、离线 demo 和「Proposer/Verifier/Domain 三接口」适配器契约，能把「先验证再提交事实 + 残差驱动重试 + 验证过才入库的规则记忆」这套流程搬到自己有客观校验标准的任务上；但它是 v0.12.1 实验版、领域示例多为合成/脚本化 fixture，效果数据由作者自报且未隔离因果，所以先试不要直接采用。
