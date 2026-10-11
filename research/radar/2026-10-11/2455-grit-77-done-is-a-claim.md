# Grit-77/done-is-a-claim

- 结论：**值得一试**。把「完成是一句主张，要附证据」落成可操作的规则文件+技能包+本地采证工具，先在一个小项目上按 README 的安装路径和 receipt 工具试跑一轮，再决定是否固化进团队流程；理由是它给出了可照抄的安装命令、18 条规则、回执工具用法和验证模板，但作者自己声明不强制、不拦截，效果数据为自报且原始日志未公开。
- 原文：https://github.com/Grit-77/done-is-a-claim
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T02:12:47.472Z

## 是什么

`Grit-77/done-is-a-claim` 是一套面向 coding agent 的「证据优先（evidence-first）」开发工作流：核心命题是「agent 说 done，只是一句主张（claim），必须给出能证明它的证据」。

它由几部分组成：

- 一条主流程：understand → plan → implement → diagnose → review → verify → deliver（小任务走更短的路径）。
- 13 个互相衔接的技能（skill），每个是独立的 `SKILL.md`，不需要 Grit 的服务、账号或 CLI。
- 18 条「实战规则」（field rules），每条在 `INCIDENTS.md` 里有对应的失败故事。
- 可复用模板：completion receipt（完成回执）、acceptance brief（验收简报）、handoff（交接）。
- 可选本地工具：`tools/receipt.py`（采证）、`tools/check_receipt.py`（复核回执新鲜度）、`tools/install_skills.py`（安装技能）、`tools/native_smoke.py`（在真实工作上冒烟测试）、`tools/run_tests.py` 等。
- 演示与评测材料：`examples/false_green.py`（假绿）、`examples/wrong_delivery.py`（交付错件）、`evals/` 场景包。

关键定位（原文明确）：这套东西**提供指令、小工具、示例和评测材料，但不拦截 agent 的工具调用、不阻断合并、不强制执行部署策略**——「规则不是闸门」。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：本机有 Git；跑 demo 需要 Python 3.10+；宿主是 Claude Code 或 Codex，或任意会读 `AGENTS.md` 的 agent。

### 1. 先看「假绿」演示，理解要防的是什么

前提：Python 3.10+。

```bash
git clone https://github.com/Grit-77/done-is-a-claim.git
cd done-is-a-claim
python examples/false_green.py
```

预期现象（合成演示）：verifier 以退出码 **1** 失败，summarizer 打印其输出后以 **0** 退出；receipt 跟随 verifier，标注 **FAIL**。demo 自身退出 0 是因为它暴露了这个不一致，而不是因为 verifier 通过。

### 2. 再看「交付错件」演示（可选但推荐）

```bash
python examples/wrong_delivery.py
```

它对比三种情况：过期的副本、正确的副本、字节相同但无法解析的内容。使用临时本地 fixture；退出 0 表示陷阱被演示出来，不代表真实交付成功。

### 3. 选一种安装方式

**3a. 让 agent 自己装**（把下面这段原样发给你的 coding agent）：

> Install https://github.com/Grit-77/done-is-a-claim. Then explain simply what
> changed, what it helps with, and how I start using it.

安装方 agent 应遵循 `INSTALL.md`：识别当前宿主和安装范围、保留既有工作、验证结果，并用用户语言做简短说明。

**3b. 手动装成原生插件**

Claude Code：

```bash
claude plugin marketplace add Grit-77/done-is-a-claim --scope local
claude plugin install done-is-a-claim@done-is-a-claim-marketplace --scope local
```

Codex：

```bash
codex plugin marketplace add Grit-77/done-is-a-claim
codex plugin add done-is-a-claim@done-is-a-claim-marketplace
```

装完开一个新 session：Claude Code 里调用 `/done-is-a-claim:using-done-is-a-claim`；Codex 里通过 `/skills` 或 `$` 技能选择器选 `using-done-is-a-claim`。

**3c. 只想要规则文件**（在步骤 1 的 clone 目录里操作）

| 你用的东西 | 加到项目里 |
|---|---|
| Codex 或读 `AGENTS.md` 的 agent | 把 `AGENTS.md` 复制到项目根目录 |
| Claude Code | 复制 `AGENTS.md` 和 `CLAUDE.md`（后者用 `@AGENTS.md` 导入它） |
| 已有指令文件 | 把相关规则合并进去，保留你项目自己的命令和约束 |

注意：原生插件安装**不会**把这些规则加进被采用项目的指令里。

**3d. 不覆盖已有文件地装技能**

前提：在你 clone 出来的仓库目录里执行；把 `../my-project` 换成你真实项目路径。

```bash
python tools/install_skills.py --project ../my-project --agent codex --profile workflow --dry-run
```

预览没问题后去掉 `--dry-run` 正式安装；Claude Code 用 `--agent claude-code`。已存在的技能目标会被拒绝安装，项目指令文件不动；用 `--list` 看有哪些 profile 和单个技能；显式 `--update` 可以替换未被修改过的、安装器自己管理的副本并保留备份，本地改过的会被拒绝。

### 4. 用第一句请求试一次

在你自己项目里发：

> Use using-done-is-a-claim for this task. Identify observable acceptance, take a
> proportionate path through implementation and review, and report the actual
> result, tested inputs and remaining gaps. Continue within my existing authorization.

这一步是在检查 agent 有没有理解请求，**并不强制它遵守**。

### 5. 在真实工作上冒烟测试安装

前提：先按步骤 3 装好，且你通过自己正常宿主和账号把 agent 跑起来（`native_smoke` 只创建和检查 fixture）。从本仓库 clone 目录执行：

```bash
python tools/native_smoke.py create --project ../claim-smoke
python tools/native_smoke.py verify --project ../claim-smoke --json
```

初始的独立检查是**故意失败**的，尽管 starter 的窄测试能过——这正是在练习「窄测试通过不等于独立验收通过」。

### 6. 给一条命令采集回执

```bash
python tools/receipt.py -- python tools/run_tests.py
```

它会在 `.local/receipts/` 下写出新的 `receipt.json` 和 `command.log`，记录命令自己的退出码、完整输出和 Git 状态。用 `--input` 可以在运行前后对选定文件做指纹。注意语义：退出码为 0 只记录「命令成功」，**不等于用户任务完成**；没有选定 inputs（`--input`）时，回执对「新鲜度复查」来说是不完整的。

### 7. 编辑或交接后复核回执

用上一步打印出来的确切路径：

```bash
tools/check_receipt.py path/to/receipt.json --project .
```

### 8. 用模板固化报告格式

- `templates/completion-receipt.md`：完成回执
- `templates/acceptance-brief.md`：验收简报
- `templates/handoff.md`：交接

原则：**缺了哪项检查，就要写进报告里**。主张与证据的对照关系见下表（照抄进你的报告规范）：

| 主张 | 能支撑它的证据 |
|---|---|
| “测试通过了。” | 命令、收集到的用例、实际结果、它自己的退出状态、被测的代码树 |
| “那个失败在 main 上本来就有。” | 可比的 branch 运行与干净基线运行，且失败签名匹配 |
| “worker 干完了。” | worker 实际的 diff、被检查的输入、验收结果；交付要单独记录 |
| “截图保存了。” | 一张能解码、且被肉眼检查过的图片 |
| “可以发布了。” | 被评审的产物与即将发布的产物仍然一致 |

### 9. 按场景挑 skill

| 出现这种情况 | 用这个 skill | 它帮你判断 |
|---|---|---|
| 想要一个任务入口 | using-done-is-a-claim | 结合任务、授权和已有证据，下一步最有用的动作是什么 |
| 变更有依赖或范围较大 | planning-changes | 哪些有界任务、负责人和观察点能到达目标结果 |
| 计划里有已就绪且已授权的工作 | executing-plans | 现在能推进什么，什么证据能收尾每个任务 |
| 行为与预期矛盾 | debugging-with-evidence | 哪个实验能区分几种可能原因 |
| 变更准备送审 | reviewing-changes | 实际 diff 是否满足请求，发现的问题是否已解决并复查 |
| 任务的“通过”条件含糊 | acceptance-design | 这个检查是否跨过了用户真正在意的边界 |
| 数字看起来很可信 | reading-measurements | 这个输出建立了什么，又留下了什么未知 |
| 你的分支上测试失败 | whose-red | 有没有可比证据区分回归、既有失败、还是原因未明 |
| subagent 汇报成功 | collecting-worker-results | 有没有相关工作、是否被测过、是否真的交付了 |
| 检查之后工作又变了 | evidence-freshness | 回执是否仍描述你即将据以行动的那些输入 |
| README 或发布帖提出主张 | public-claims | 读者能否追溯它，验证的边界有没有写清 |
| 你接手了未完成的工作 | resuming-work | 哪个检查点、产物和下一步动作在当前 checkout 里仍然有效 |
| 发送或发布报告成功 | checking-delivery | 实际目的地是否含被评审的结果，其消费者能否使用 |

### 10. 把 18 条规则贴到手边

| 时刻 | 规则 |
|---|---|
| **开工前** | **01** 干活前先定义验收。 **02** 检查路径。 |
| **说“完成”之前** | **03** 在当前工作状态上重跑。 **04** 检查更宽的测试套件。 **05** 抓取命令自己的退出码。 **06** 没测试就是没通过。 **07** 未知不等于通过。 **08** 每项必需检查都要读。 |
| **汇报时** | **09** 读产物。 **10** 打开写出来的东西。 **11** 自己亲眼看。 **12** 核对引用。 **13** 声明基线并在发布前复核它。 |
| **测试与修复时** | **14** 测行为，别测“是否等于某个常量”。 **15** 修一整类缺陷。 **16** 在已知正确的用例上测试检测器。 **17** 干活前先登记清理。 |
| **永远保住已有工作** | **18** 永远不要用破坏性命令来回答一个问题。 |

完整措辞在 `AGENTS.md`，每条规则背后的失败故事在 `INCIDENTS.md`。

### 11. 仓库自检（可选，用来确认环境可用）

```bash
python tools/run_tests.py
python tools/check_repository.py
python tools/check_package.py
```

测试 runner 会拒绝空的或全被跳过的测试套件；后两个检查会验证工具、本地文档链接目标、技能元数据和 import。CI（`.github/workflows/check.yml`）在 Windows 和 Linux 上跑。

### 12. 压力测试（可选）

用 `evals/` 场景包在压力下检验指令：通过的管道、错配的对照组、没有任何相关改动的 worker、过期证据等陷阱。参与者提示与评测 rubric 分开；在新 session 里跑提示词并保留回复。这是人工行为评测，不是公布的成功率。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

### 1. 能力发现

它把一批通常不会被明确交给 agent 的「收尾类」工作显式变成了技能：证据新鲜度复查（evidence-freshness）、交付确认（checking-delivery）、判断红灯归属（whose-red）、收集 subagent 结果（collecting-worker-results）、读懂测量输出（reading-measurements）、审查公开主张（public-claims）、接手未完成工作（resuming-work）。这些属于「原来不会想到交给 agent」的工作候选。

### 2. 任务匹配

原文给出了明确的分流：小改动直接从 inspection 走到 implementation、review、verification；有依赖或范围较大的走 planning-changes + executing-plans；行为与预期矛盾走 debugging-with-evidence；subagent 报告走 collecting-worker-results；检查后工作又变了走 evidence-freshness。worker（子代理）是可选的；reviewer 不可用时，要报告成「self-review limit」。

### 3. 条件供给

- 信息：`AGENTS.md` 放项目根（Claude Code 再加 `CLAUDE.md` 用 `@AGENTS.md` 导入）；已有指令文件就合并规则、保留项目自己的命令和约束。
- 工具/环境：Claude Code 或 Codex 宿主、Git、Python 3.10+（demo 与本地工具）、项目自己的测试命令。
- 权限：需要 agent 能在项目里跑命令、写 `.local/receipts/`；技能安装用 `--scope local` 或 `--project` 指定范围。
- 反馈：通过 receipt 回流——命令自身退出码、完整输出、Git 状态、`--input` 指纹；以及「缺了哪项检查就写进报告」的汇报纪律。

### 4. 主动推进

有状态/事件触发的成分：receipt 的新鲜度复查（`check_receipt.py` 在编辑或交接之后与当前项目比对）；`native_smoke.py create/verify` 成对使用；CI 在 Windows 和 Linux 上跑检查。但原文明确这套东西**不拦截工具、不阻断合并、不强制部署策略**，所以它本身不是自动执行的触发系统，只提供「何时该重新检查」的规则与工具。

### 5. 效果验证

这是该仓库最直接对应的研究问题。它的验证手段包括：claim 与 evidence 的对照表、completion receipt / acceptance brief / handoff 模板、receipt + check_receipt 的采证与新鲜度复核、`run_tests.py` 拒绝空或全跳过的套件、`check_repository.py` / `check_package.py` 的元数据与文档链接校验、以及 evals 场景包做人工行为评测。作者给的量化观察：14–29 September 2026 间 3,489 次任务验收复跑，其中 2,282 次通过首次独立复跑；另有内部计数称 736 个任务自己验收通过、但主分支全量套件崩了。这些是作者自报的历史观察，未经公开基准验证。

## 与已有做法的关系

清单中只有一项相关：**Claude Code**（tool，状态 adopt）。

本线索不是替代 Claude Code，而是**给 Claude Code（以及 Codex）加装一层指令 + 技能 + 本地采证工具**：安装方式明确写了 `claude plugin marketplace add` / `claude plugin install ... --scope local`，并提示原生插件安装不会把规则写进被采用项目的指令里，所以还需要额外复制或合并 `AGENTS.md`。可以理解为对「Claude Code 怎么用得好」这一条既有 adopt 条目的补充实践。

## 证据与局限

**原文给出的数据/案例：**

- `examples/false_green.py`：verifier exit 1、summarizer exit 0、receipt FAIL 的合成演示（原文强调这是合成演示，不是生产日志、不是 agent 性能基准）。
- `examples/wrong_delivery.py`：过期副本 / 正确副本 / 字节相同但解析失败 三种情况的对比，用临时本地 fixture。
- `native_smoke`：初始独立检查故意失败，尽管 starter 的窄测试通过。
- 作者自报的运营数字：2026-09-14 至 09-29 之间 3,489 次任务验收复跑，2,282 次首次独立复跑通过；另计 736 个任务「自家验收通过但主分支全量套件崩」。
- 仓库自身检查：`run_tests.py` 拒绝空/全跳过套件；CI 覆盖 Windows 与 Linux。

**哪些只是作者主张：**

- 上述 3,489 / 2,282 / 736 全部是「author-reported historical observations, not a public benchmark」，原始内部日志未包含在仓库里；原文自己说部分失败复跑是环境问题，这些数字既不构成 agent 错误率，也不证明本工具集有效。
- 附加工作流（additional workflows）被称为「guidance，不是新测得的事件」，即从 Grit 的运维 runbook 蒸馏而来。
- evals 是人工行为评测，原文明确不是公布的成功率。
- 作者反复声明：规则不是闸门、不强制、测试通过不证明 agent 会遵守指令。
- 我的判断只依据该 README（仓库内被引用的 `INSTALL.md`、`WORKFLOW.md`、`RECEIPTS.md`、`INCIDENTS.md`、`CLAIMS.md` 等文档正文未提供），因此看不到规则全文和技能的完整内容。

**适用条件：**使用 Claude Code / Codex 这类 coding agent 的项目；项目本身有可运行的测试和发布门禁（因为这套东西不做强制拦截，最终把关仍靠你自己的 gate）；团队愿意维护 receipt 这类证据文件。README 中的复跑数据日期（2026 年 9 月）看起来异常，需以实际仓库内容为准。

## 怎么试、怎么验证

**最小试用（半天内可完成）：**

1. `git clone` 后跑 `python examples/false_green.py`，确认自己能否讲清「verifier 失败但流程仍退出 0」的陷阱在哪。
2. 挑一个**已有小项目**，从 `AGENTS.md` 开始（最低成本路径），复制到项目根；有 `CLAUDE.md` 的话用 `@AGENTS.md` 导入。
3. 用步骤 4 的那句试用请求，给一个有明确验收标准的小任务，观察 agent 的输出结构。
4. 从 clone 目录跑 `python tools/native_smoke.py create --project ../claim-smoke` 和 `... verify ... --json`，确认「窄测试通过但独立检查失败」能如期出现。
5. 用 `python tools/receipt.py -- python <你的测试命令>` 采一份 receipt，改一次代码后再用 `check_receipt.py` 复核，体会新鲜度判断。

**判断有没有改善的指标：**

- **可追溯率**：agent 声称「测试通过」时，是否同时给出命令、收集到的用例、实际结果、退出码和被测代码树（对照 README 的 claim/evidence 表）。
- **假绿发现率**：出现「自家验收通过但更宽套件失败」时，是否被如实报告而不是被掩盖（对应 736 这个现象类）。
- **空口通过率**：出现无测试、或状态未知却报「通过」的次数是否下降（规则 06、07）。
- **过期证据率**：编辑或交接后，过期 receipt 被重新运行而不是被复用的比例（evidence-freshness / check_receipt）。
- **交付可消费率**：目标位置上的产物确实能被消费——能解析、能解码、被肉眼检查过（checking-delivery / wrong_delivery 的三种陷阱）。
- **自我审查透明度**：reviewer 不可用时，是否按规则报告为 self-review limit，而不是假装已审。

**判定方式**：同一类任务在「装之前」和「装之后」各跑几轮，比较「声称完成」与「实际可被独立验证完成」之间的差距是否收窄。注意原文的前提——这套规则不强制、不拦截，所以指标下降只能说明流程纪律起作用，不能当成工具的自动保证。
