# StochasticResult/codex-cto-agent-team

- 结论：**值得一试**。先只借用它的「任务交接模板（目标/权限/产出/验收/可写资源）+ 模型路由分级 + 验收证据规则」，用 plan-only 提示词和 1 个 PM+2~3 个工程师的最小配置在真实小项目上跑一轮；56 角色全铺开和私有状态机暂缓，因为原文只有设计与流程说明、没有效果数据，且明确声明不带后台调度、未做过客户端实测。
- 原文：https://github.com/StochasticResult/codex-cto-agent-team
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T18:22:30.888Z

## 是什么

一个面向 Codex 的多角色团队 Skill（仓库 31 stars）：CTO 负责接单、协调与最终交付，5 个 PM 按域分工（产品交互 / 服务与数据 / 系统与设备 / 自动化集成 / 质量与发布），每个 PM 下挂 10 个工程师角色（CS0101–CS0510），共 56 个角色登记。核心不是「角色扮演」，而是三件事：

1. **任务路由**：按工作性质把任务分到「模型 + reasoning 强度」的档位（`compatibility-6.1` 档位表 + 本地选择器脚本）。
2. **交接与验收契约**：每个任务必须有唯一 ID、归属 PM、目标、权限、产出、验收标准、可写资源；PM 做实质验收，CTO 做最终交付和跨团队决策。
3. **私有状态与恢复纪律**：角色注册快照、任务记录、通知状态放在仓库外的私有目录，`registry.json` 单写者串行；容量失败按固定退避重试。

原文反复强调的一点值得单独记：**角色登记 ≠ 建了 chat ≠ READY ≠ 真在算**，这四个是不同状态，README 全程在做这种「证据等级」区分。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 安装（前提：Codex 类宿主，能加载 skill；本机 Python ≥ 3.11，只用标准库）

1. 克隆仓库并复制整个 `skills/cto-agent-team` 目录（必须保留 `scripts`、`references`、`assets`、`agents` 子目录）。PowerShell 个人级安装：

```powershell
git clone https://github.com/StochasticResult/codex-cto-agent-team.git
Set-Location codex-cto-agent-team
$skillSource = Join-Path (Get-Location) 'skills/cto-agent-team'
$skillTarget = Join-Path $env:USERPROFILE '.agents/skills/cto-agent-team'
if (Test-Path -LiteralPath $skillTarget) { throw 'The target exists. Review it before updating.' }
New-Item -ItemType Directory -Path (Split-Path -Parent $skillTarget) -Force | Out-Null
Copy-Item -LiteralPath $skillSource -Destination $skillTarget -Recurse
```

2. 项目级安装则改为复制到该项目的 `.agents/skills/cto-agent-team`。
3. 在 Codex 里选择 `cto-agent-team`；列表里没有就重启 Codex。
4. 注意边界：Claude Code / Cursor / 通用云环境只在 `skills/cto-agent-team/references/host-adapters.md` 里有文字指引，**原文自述「documented guidance, not live client validation」**；建 chat、发消息、监控都依赖宿主工具和账号容量，这个 skill 本身不提供这些能力。

### B. 两种用法：先出计划，再决定要不要真建组织

5. **只做计划（推荐作为第一步试用）**，在目标项目里开一个 CTO chat，选中 skill 或直接用 `$cto-agent-team`：

```
Use $cto-agent-team to plan the work for `<GOAL>`. Give the task owners and acceptance criteria. Do not make chats.
```

6. **要真建独立 chat 的全组织模式**（前提：你有足够账号容量，且必须显式授权建 chat 和发任务消息——原文明确「Skill selection alone does not authorize chat creation or task messages」）：

```
Use $cto-agent-team for `<PROJECT>`. Use the current chat as CTO. Make five PM chats and ten engineer chats per PM.
Use suitable existing chats. I permit creation of missing chats. I permit CTO-to-PM and PM-to-engineer task messages for this project.
Keep private state in `<PRIVATE_STATE_DIR>`. Use the available tools and account capacity. Give actual creation and READY results.
```

### C. 写任务单/交接单（这是最值得直接抄走的部分）

7. 每张任务单必须写清五项：**目标、权限、产出、验收标准、可写资源**。原文：「Each task must identify its target, permissions, outputs, acceptance criteria, and writable resources.」
8. 委派不等于授权：组织上的层层下派，**不**自动授予设备操作、发布、对外发消息、采购等权限。
9. 派活前读目标项目的 `AGENTS.md`，确认设备身份、连接方式、任务权限三项都对。
10. 共享文件 / 设备 / 桌面 / 线上操作，**同一时刻只有一个写者**（one writer per shared resource）。
11. 交接里带上显式风格、约束和**可观察的验收标准**，并记录「改变了输出的那几个决定」（原文：record the few decisions that changed the output）。
12. 结果回流走共享私有事件：PM 在共享事件里读工程师结果，由**指定的一名文书（clerk）**写共享摘要，CTO 读摘要 + 必要的原始引用。**不要**用消息中转例行进度和结果（原文：「Do not send routine progress or result relay messages」）。

### D. 模型路由（原文 `compatibility-6.1` 档位表）

13. 按工作性质选档（原文表格，注意原文声明该表「不是所有宿主的默认值，也不是可用性承诺」）：

| 路由 | 工作 | 模型 | Reasoning |
| --- | --- | --- | --- |
| `coordination_research` | 例行 PM 协调、跨来源调研 | `gpt-6.1-sol` | `high` |
| `scoped_engineering` | 有明确目标的范围内修复、UI 实现、视觉检查、电脑操作 | `gpt-6.1-terra` | `high` |
| `extraction` | 从给定材料做简单抽取与例行摘要 | `gpt-6.1-terra` | `medium` |
| `complex_engineering` | 复杂编码、架构、权限、事务、关键评审、跨系统发布 | `gpt-6.1-sol` | `xhigh` |
| `mechanical_supervision` | 例行状态检查、重试记录、去重、完成候选分派 | `gpt-6-luna` | `low` |

14. 升级规则：只有在批准范围内、出现**冲突约束 / 关键决策 / 复杂状态 / 实质性验收失败**时才升到 Sol/xhigh；抽取有歧义先上 Terra/high。
15. 本地选择器（先跑无凭据的 fixture 看它输出什么格式）：

```sh
python scripts/model_route.py assets/routing.example.json --now 2030-01-02T00:00:00Z
```

16. 选择器使用要点（原文明确）：
    - fixture 结果固定 `dispatch_ready: false`，只能看结构，实际使用要替换合成证据、改用当前时间，并按 `assets/routing.schema.json` 的七段 schema 提供私有策略/目录输入和显式 profile。
    - `--escalate-from` 要求有实质失败和先前结果证据，最多升两级。
    - `--retry-from` 保留已验证的原始 native 请求与质量历史，即使常规目录已过期。
    - 任何 pin、未知能力、不支持参数、预算不满足，都**阻断**选择；未知成本不等于省钱。
    - 「不同厂商的 effort/speed 参数不是同义词」，不要照字面互换。
    - 工具接受请求 ≠ 后端真的用了那个模型。

### E. 私有状态与角色注册（前提：选一个仓库外的私有目录）

17. 初始化与校验（初始化只创建 55 个 `planned` 从属角色，**不建 chat**，CTO 继续在当前 chat 里干）：

```powershell
$teamStateDir = Join-Path $env:LOCALAPPDATA 'codex-cto-agent-team/my-team'
python "$skillTarget/scripts/team_state.py" init --state-dir "$teamStateDir"
python "$skillTarget/scripts/team_state.py" validate --state-dir "$teamStateDir"
```

18. 建 chat 的工具返回真实身份后再登记（占位符不能当真实 ID 登记）：

```powershell
python "$skillTarget/scripts/team_state.py" register --state-dir "$teamStateDir" --role PM01 --thread-id "<THREAD_ID_FROM_TOOL>" --host-id "<HOST_ID_FROM_TOOL>" --status created
```

19. 收到真实 READY 回复后，用**同一身份**再登记一次，`--status ready`。要求 55 个从属角色全部就绪时才用：

```powershell
python "$skillTarget/scripts/team_state.py" validate --state-dir "$teamStateDir" --require-ready
```

20. 状态机注意：`init` 可用 `--pm-model`、`--engineer-model`、`--effort` 覆盖注册快照（`--effort` 同时作用于两类角色）；重复 `init` 遇到不兼容配置会**拒绝**而不是覆盖；老快照要重跑必须带上原始覆盖参数（例如 `--effort xhigh`）；`validate` **不做迁移**。
21. 注册助手共用一份 `registry.json` 且**没有跨进程锁**，所以 CTO 必须串行化写入；它只记角色，不记每任务路由、真实执行或后端模型验证。
22. 私有状态目录里不得存凭据，只能存「凭据存储的引用」。

### F. 监控、交付与恢复

23. 每个独立请求给唯一 task ID 和归属 PM，发完整交接后 **CTO 立刻结束本轮**；PM 继续实现、评审、授权交付；新请求不得覆盖旧的未完成任务。
24. 例行监控交给便宜档（Luna/low）；复用已有监控和已保存的游标，未变化的检查和普通重试保持安静；**不要**再套一个高成本 CTO 循环去盯监控者。
25. 「完成候选」必须匹配任务与结果版本，并附带产出与验收证据；PM 保留实质验收权，CTO 做最终交付与跨团队决策。
26. 事件发布要原子、发布后不可变、更正用链接指向原事件；持久化已消费事件标识和源版本；发布、验收、派发、真实用户送达这四类回执要分开记。
27. 容量失败重试：仅对**已确认**因临时模型容量导致失败/中断、且仍有未完成授权工作的回合重试。默认退避 0、2、5、10、15 分钟，之后每 15 分钟；供应商给的 retry-after 更长则以它为准。重试要用失败回合已验证的模型、完整 native 参数和质量历史，**不要**换成新默认值或监控者的模型。已知成功的输出和已完成的外部动作要保留。凭据问题、账号耗尽、审批请求、主动停止、永久错误走各自流程，不走这条重试。
28. 关键限制：**本轮结束不会自动安排自己回来，仓库不含后台调度器**；宿主 schedules 是可配置能力，唤醒仍需明确的接收方与范围授权；一次性监控在无职责后要退役。

### G. 任务技能挂载（原文给的组合建议）

29. 编码与评审：读并应用 [Ponytail](https://github.com/DietrichGebert/ponytail) 核心，默认用 `full` 指引；要求复用已有 helper、交付最小完整改动，同时保留校验、安全、可访问性、错误处理、数据完整性。
30. 前端：按任务选择 [Anthropic Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) 和/或 [Emil](https://github.com/emilkowalski/skills)（原文：两者无固定优先级；新页面可两者并用，Frontend Design 偏整体方向、Emil 偏组件与交互细节）；用户需求与既有设计系统优先。
31. 任务流程：按需用 [Superpowers](https://github.com/obra/superpowers) 的模块，如 `systematic-debugging`、`verification-before-completion`；但**不要**顺手引入一刀切审批门、强制 worktree、额外 agent 树、重复全量检查、每条回复都加载 skill。
32. 可选研究岗：最多保留 3 个候选、1 条推荐，附来源/版本/许可证、不确定性、权衡、最小复用路径；由归属 PM 记录采纳与实现验收；到约定边界或证据已能回答就停；紧急恢复、小改动、就绪发布不设研究门。
33. 英文任务指令/交接/提问按 ASD-STE100（Issue 9）写；技术词与字面命令保持一致；短句本身不等于合规；中文摘要不得声称符合英文标准。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：原文给出的「可交给 AI 但常被忽略」的清单是——跨来源例行调研与 PM 协调（`coordination_research`）、从给定材料做抽取与例行摘要（`extraction`）、例行状态检查/去重/重试记录/完成候选分派这类机械监督（`mechanical_supervision`，明确用最低档模型），以及一个可选的研究岗（限 3 候选 1 推荐、带许可证与不确定性）。另外「工程师专长只用于指导派活，允许合适的越界工作」，意味着角色标签不该成为拒绝任务的理由。这些都是设计主张，原文没有给出这些能力被实测有效的任何数据。
2. **任务匹配**：这是原文最实的一块。它把「任务需求 / 宿主能力 / 模型证据 / 用户策略 / native 参数 / 实际执行」六个层面显式拆开，给定 5 条路由（协调研究、范围工程、抽取、复杂工程、机械监督）和两档升级条件；并要求「不同厂商的 effort/speed 参数不是同义词」「工具接受 ≠ 后端模型被验证」「模型名写在 prompt 里不等于设置了监控模型」。这套「按工作性质分档 + 升级要有失败证据」的做法可直接搬。
3. **条件供给**：原文给得比较完整——显式授权（建 chat、发消息、唤醒、浏览器通道各需单独授权）、目标项目 `AGENTS.md`、私有状态目录与写者串行、宿主适配矩阵与真实工具名/参数边界、账号容量、交接单必填五项、交接中的风格/约束/可观察验收、以及「一个共享资源一个写者」。还要求把策略与证据要求一路带进每次交接和每条模型路由。
4. **主动推进**：**弱项且原文自己承认**——「An ended turn does not schedule its own return. This repository contains no background scheduler.」能做的只有：宿主可配置的 schedules、复用已有监控与游标、容量失败的定时退避重试（0/2/5/10/15…分钟，provider retry-after 优先）、以及用「任务完成或反复失败」事件触发有界改进（记录观察、证据、责任人、验证、决策、回滚）。唤醒仍需显式授权，不能靠 skill 自己持续跑。
5. **效果验证**：原文的重点。「完成候选」必须匹配任务与结果版本并带产出+验收证据；PM 实质验收、CTO 最终交付；发布/验收/派发/送达四类回执分开；登记状态 created / READY / 真在算 三级区分；证据等级要区分 文档说明 / 账号可用 / 有权限 / fixture 或配置 / 请求被接受 / 实际执行；视觉主张必须有与该产物版本绑定的实际观察视图，签入的 UI 不能靠 HTTP、构建产物、标记或合成页面来「证明」；技能名、读过文档、代码测试通过，都不能单独作为视觉或业务验收依据。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：本仓库的宿主适配矩阵里提到 Claude Code，但原文自述那只是「documented guidance, not live client validation or universal native adapters」。也就是说它是「同名思路的另一宿主实现参考」，不构成对 Claude Code 现有做法的替代或验证；不要把 Codex 上的安装步骤直接套到 Claude Code。
- **obra/superpowers（study）**：被本仓库当作**任务流程模块供应方**引用（`systematic-debugging`、`verification-before-completion`），并且原文明确划了边界：不引入一刀切审批门、强制 worktree、额外 agent 树、重复全量检查、每条回复都加载 skill。这正好是「拿来当零件、不当框架」的用法示范。
- **Ponytail（study）**：被定为编码/评审的默认核心（`full` 指引），且要求写进新建或恢复的 agent 交接里；同样有边界：复用 helper、最小完整改动，但不牺牲校验/安全/可访问性/错误处理/数据完整性。
- **Cursor（watch）**：只在宿主矩阵里作为适配对象提及，原文无实测。

清单中没有与「CTO–PM–工程师三级任务路由 + 私有注册状态机」直接对应的条目，这部分属于新增。

## 证据与局限

**原文给了什么**：完整的目录结构、安装命令、两段可直接用的提示词、5 条路由表、选择器脚本的调用方式与参数语义、状态机三条命令（init/validate/register）与参数覆盖规则、重试退避序列、以及大量明确的「不要做什么」。这些是可照做的部分。

**原文没给什么**：任何量化结果。31 stars，没有 benchmark、没有案例、没有 token/时间/成本对比。原文自己写了「Third-party benchmarks do not establish this team's measured token, time, or cost savings」，以及多处「guidance and task-context examples, not a deployed browser adapter or a report of real browser execution」「does not establish automatic README selection」式的免责。

**只是作者主张的部分**：56 角色编制是否比 1 个 agent 更好、5 个 PM 分工是否真的减少串扰、Luna/low 做机械监督是否够用、单写者+事件不可变是否真能避免冲突——全部没有数据支撑，属于设计主张。

**适用条件与坑**：
- 绑定 Codex 类宿主 + skill 机制；其他宿主只有文字指引。
- 需要 Python ≥ 3.11；`registry.json` 无跨进程锁，CTO 必须串行写。
- 需要足够账号容量真的能开 56 个 chat；开不出来时原文允许「用合适的现有角色代替」。
- 路由表里的模型名属于 `compatibility-6.1` profile，原文明确「不是所有宿主的默认值，也不是可用性承诺」，实际必须换成你环境中被支持的原生模型与参数。
- 没有后台调度：想「持续跑」必须靠宿主自己的 schedule 能力，且要有显式授权。
- 规则密度很高（单写者、事件不可变、四类回执分离、证据等级分离），小团队照搬会显著增加记录开销，收益未验证。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**第一周：只跑计划，不建 chat。**
1. 挑一个真实、边界清楚的小项目（一次交付、有明确验收）。
2. 先用 A/B 两种方式各出一次计划：单 agent 直接做 vs 用第 5 步的 plan-only 提示词。
3. 对比两份计划的**任务归属是否明确、验收标准是否可观察**——原文的验收哲学是「产出+证据」，所以看计划里有没有写出「怎么算做完」。

**第二周：1 PM + 2~3 工程师的最小组织。**
4. 手工开 1 个 PM chat、2~3 个工程师 chat（不必用脚本建 56 个），按 C 节写 3 张任务单，每张都写全五项。
5. 只对**互相独立**的子任务并行，共享文件坚持单写者。
6. 用一个固定模板记录每个任务：task ID、归属、路由档位、验收证据、是否返工。

**判断改善的指标（都能从上面记录里直接算）：**
- **一次验收通过率**：完成候选一次通过 PM 验收的比例（对应原文「completion candidate must match task and result revision」）。
- **返工次数**：因验收标准缺失或产出不符导致的返工次数，比较「有交接单五项」与「没有」的差异。
- **消息条数/任务**：原文要求不传例行进度，理想值应显著低于无契约的协作；如果反而变多，说明你在用它当 IM。
- **证据完整率**：完成项里「产出 + 与该版本绑定的验收证据」齐全的比例，目标 100%；缺证据的一律不算完成。
- **升级次数**：升到高成本档（Sol/xhigh）的次数占比，如果长期接近 100%，说明路由表没有起到分流作用。
- **成本与时长**：与单 agent 基线比较 token 与墙钟时间；原文明确第三方 benchmark 不能代替你自己的实测，这个对比只能你自己做。
- **单写者违规次数**：应为 0；出现即说明共享资源所有权没落实。

**判定**：如果一次验收通过率与证据完整率明显高于基线、返工与消息条数下降，再把范围扩到 5 个 PM；如果记录开销吃掉收益，就只保留三样东西写进手册——**任务交接五项模板、路由分档+升级要有失败证据、验收必须带版本绑定的证据**，其余（56 角色、状态机脚本、事件不可变协议）先不要。
