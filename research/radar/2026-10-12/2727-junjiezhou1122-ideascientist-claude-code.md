# junjiezhou1122/ideascientist-claude-code

- 结论：**值得一试**。可以小范围试：按 README 的安装与调用命令，在自己熟悉的一个窄研究问题上跑一次 `/ideascientist:ideate` 并用 `check_artifacts.py` 校验产物，重点借鉴它「角色拆解 + 精确版本证据 + 候选前冻结基线 + 离线结构校验」这套可复制的机制，而不是它的研究结论；理由是它给出了可直接照做的命令、角色职责、预算上限和文件产物结构，但作者自述完整合规的科学工作流尚未被验证，且许可证为非商业（CC BY-NC 4.0）。
- 原文：https://github.com/junjiezhou1122/ideascientist-claude-code
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-12T14:12:52.542Z

## 是什么

IdeaScientist 研究构思方法论在 Claude Code / Codex / Pi 上的原生适配（独立适配，非官方上游分发）。给编码 agent 一个研究问题作为入口，一条命令协调多智能体流程：自动搜索方法学空白、阅读支撑论文、把机制迁移到目标研究场景、挑战并修订候选想法，最后把幸存的直觉发展成一份完整的可证伪研究提案。

它**不跑实验、不训练模型、不实现研究代码**。产出是一份研究提案，附带可溯源的论文证据、显式假设、评估计划，以及会否证其预测的条件。许可证为 CC BY-NC 4.0（含署名与非商业条款），原始版权归 IdeaScientist 原作者。

## 具体做法

1. **确认前提**：Claude Code 需为当前版本并支持嵌套 subagent（原生设计测试于 **2.1.287**）。七个 agent 全部使用 `model: inherit`，沿用你现有的 Claude Code 登录与模型配置。不需要原版 Python 运行时、Vault 数据库、向量服务、自定义模型端点、MCP server 或训练环境。离线检查器、固定的 arXiv 元数据助手、Claude Code reader 的 PDF 获取助手需要 **Python 3.10 或更高**，且只用标准库。

2. **从 GitHub marketplace 安装（Claude Code 内）**：

```text
/plugin marketplace add junjiezhou1122/ideascientist-claude-code
/plugin install ideascientist@ideascientist-native
```

等价终端命令：

```sh
claude plugin marketplace add junjiezhou1122/ideascientist-claude-code
claude plugin install ideascientist@ideascientist-native
```

3. **重启 Claude Code**。如果 Claude 请求读取捆绑的 contracts 或 templates，授予对插件文件的 Read 权限——加载插件不会自动授予对其捆绑资源的文件系统访问权。使用 Claude Code 显示的实际安装路径，而不是固定的 cache 版本路径。

4. **（替代方案）加载本地检出**：克隆仓库，并在你想保存输出的研究项目里启动 Claude Code。

```sh
git clone https://github.com/junjiezhou1122/ideascientist-claude-code.git
# Replace both paths with the absolute path to your checkout.
claude --plugin-dir /absolute/path/to/ideascientist-claude-code --add-dir /absolute/path/to/ideascientist-claude-code
```

`--add-dir` 让 agent 能读取捆绑的 workflow、contracts 和 artifact schema；研究输出仍留在你的工作项目里。

5. **Codex 安装**：需 Codex CLI 支持原生 plugin 与 multi-agent（适配加载于 **0.160.0**）。

```sh
codex plugin marketplace add junjiezhou1122/ideascientist-claude-code
codex plugin add ideascientist@ideascientist-native
```

重启 Codex 后调用 `$ideascientist:ideascientist-ideate <research problem>`。四个已安装 skill 使用全新的通用原生 worker 并共享角色指令；coordinator 中转 paper-reader 任务，因此不需要自定义 agent 配置或调整嵌套深度。使用本会话实际的多智能体 schema 和原生 web 搜索能力。

6. **Pi 安装**：需 Pi **1.0.0** 或更高，配当前 `@earendil-works` 扩展 API。

```sh
pi install git:github.com/junjiezhou1122/ideascientist-claude-code
```

重启 Pi 后调用 `/ideascientist <research problem>`。包会注册四个命令和全新的原生角色 worker；worker 继承你当前的模型、thinking level 和 provider 认证。默认研究工具用 Crossref 做发现、精确解析 arXiv 元数据、抓公开 HTML/text，不需要额外 API key；PDF 解析、出版商登录和 JavaScript 渲染需要兼容的宿主工具。

7. **启动一次运行**：

```text
/ideascientist:ideate Investigate local credit assignment failures in long-horizon policy learning.
```

coordinator 一次只搜索一个 challenge axis。gap finder 把具体的方法缺陷落在 near-miss 工作上；innovator 提出一个带来源的直觉并把其机制映射到目标场景；一个全新的 reviewer 搜索竞争工作，试图反驳其新颖性、连贯性、可行性和有据性。修订会获得新 ID 并接受再次评审。只有当前幸存的候选会推进为完整提案。

8. **可选：加历史截止、run 名或输出语言**：

```text
/ideascientist:ideate <research problem> cutoff 2025-12-31 slug credit-assignment
```

无 cutoff 时使用实时文献。cutoff 作用于所读论文的**精确版本**；版本日期不明的来源无法支撑历史运行。输出跟随你请求的语言，或请求本身的语言。

9. **辅助命令**（在任何辅助命令后追加 `runs/ideascientist/<slug>`）：

| 动作 | Claude Code | Codex | Pi |
|---|---|---|---|
| Resume | `/ideascientist:resume` | `$ideascientist:ideascientist-resume` | `/ideascientist-resume` |
| Check evidence | `/ideascientist:check` | `$ideascientist:ideascientist-check` | `/ideascientist-check` |
| Evaluate proposal | `/ideascientist:evaluate` | `$ideascientist:ideascientist-evaluate` | `/ideascientist-evaluate` |

10. **跑完后检查产物结构**：

```sh
python3 /absolute/path/to/ideascientist-claude-code/scripts/check_artifacts.py /absolute/path/to/run --json
```

检查器会拒绝：损坏的 paper ID、缺失的阅读、locator 不匹配、不允许的版本日期、过期证据回执、变更的依赖快照、不完整的嵌套提案字段。

**角色与预算（可直接照搬的约束设计）**：七个角色为 `orchestrator`（依产物协调状态、稳定 ID、预算与阶段决策）、`gap-finder`（在一个 challenge axis 上找 0–2 个有据的方法学空白）、`paper-reader`（读一个已注册的论文版本，用 locator 回答具体目标）、`innovator`（提出一个带来源的直觉，或对已评审候选做新修订）、`reviewer`（主动挑战当前候选，可选评估提案）、`blind-baseline`（在候选暴露前从问题和 near-miss 冻结一个推导基线）、`report-writer`（把幸存的直觉展开成全部十四个提案字段）。默认预算为 **24 次角色调用、40 次搜索、18 次 reader 调用**；每次运行最多 **3 个 challenge axis、每个 gap 最多 3 个候选、每条 lineage 最多 2 次修订**。中断后预留额度仍视为已花费。证据不足以支撑 gap 时记录 `no_gap`；访问、验证或预算阻塞时记录 `blocked` 或 `unverified` 并附原因。

**产物结构**：每次运行位于研究项目下的 `runs/ideascientist/<slug>`，包含 `run.json`/`plan.md`/`problem.md`（状态、预算、选中 ID、决策、研究问题）、`gaps/A001.json`、`papers/P001.json`（精确版本身份、目标回答、locator、四个 result-masked 视图）、`sources/P001.request.json` 与 `sources/P001.pdf`/`sources/P001.acquisition.json`、`discoveries/T001.json`、`candidates/C001.json` 与 `reviews/C001.json`、`baselines/G001.json`、`report.json`/`report-evidence.json`（完整提案 + 引用回执与依赖快照）、`evaluation.json`（可选的独立评估，附带声明的证据限制）。提案覆盖问题、相关工作、机制、形式化设定、方法、模型与训练假设、与先前工作的比较、拟议评估、可证伪预测和局限；预测含显式 `kill_condition` 字段；拟议结果仍只是预测。

## 对应的研究问题

- **能力发现**：把「研究构思」这件通常不交给 AI 的工作拆成一条可执行的 agent 流水线（找 gap → 读论文 → 迁移机制 → 挑战修订 → 写提案），同时明确划出边界：不跑实验、不训练模型、不写研究代码。这本身就是「AI 还能接手哪类工作」的候选答案。
- **任务匹配**：按角色给每个人格化子任务分配职责（七个角色各有独立职责说明），并给出三种运行时的不同协作拓扑：Claude 与 Pi 的 specialist 可直接调用已注册的 paper-reader，Codex 则走 coordinator 中转。角色之间交换结构化 digest 而非原始论文全文。
- **条件供给**：需要提供研究问题（必需），可选提供 cutoff / slug / 输出语言；需要授予插件文件的 Read 权限；需要在研究工作目录中运行并用 `--add-dir` 暴露捆绑资源；离线检查器需要 Python 3.10+（仅标准库）；PDF 获取助手只对 Claude Code reader 可用，Codex/Pi 的 PDF 解析依赖兼容宿主工具。权限与工具边界写得很明确。
- **主动推进**：一条命令触发全流程，coordinator 一次只推一个 challenge axis，靠预算（24/40/18）和上限（3 轴、每 gap 3 候选、每条线 2 次修订）自动推进并停止；中断后额度不恢复；提供 `resume` 续跑。触发方式是命令式而非时间/事件/状态式，但「预算 + 上限 + 中断状态持久化」的模式可迁移到其他长流程。
- **效果验证**：这是最值得借鉴的部分——artifact schema + 离线检查器做结构校验；论文用精确版本 + locator + 证据回执 + 依赖快照；result masking 从 digest 中移除已报告的数值结果和优越性声明；blind-baseline 在候选暴露前冻结；提案必须含 `kill_condition` 可证伪预测；reviewer 独立给出 verdict；无法支撑时记录 `no_gap`/`blocked`/`unverified` 而不是硬编一个结论。同时它自己声明检查器**只能证明结构一致**，不能证明引用支持其主张、基线确实先建、或想法全局新颖。

## 与已有做法的关系

清单中的相关条目：**Claude Code**（tool，adopt）与 **arXiv**（source，try）。

本线索直接构建在 Claude Code 的 plugin marketplace、`--plugin-dir`、skills 与原生 agent 机制之上，可视为 Claude Code 条目下「多智能体研究工作流」的一种具体用法（安装、调用、产物目录都在 Claude Code 的框架内）。arXiv 被用作精确版本元数据解析与 PDF 获取来源（Claude Code reader 的 scoped helper），与清单中 arXiv 条目的 try 状态一致；Crossref 用于文献发现。清单中没有其他相关条目。

## 证据与局限

**原文给出的数据与案例**：版本 0.2.2 于 2026-10-10 的检查通过了 81 个离线测试、结构检查器、Codex 与 Pi 的原生加载，以及确定性的 Pi transport 测试；之后的契约澄清通过了 84 个回归。一次隔离的 Claude Code reader 获取了精确的 CLIN PDF、读取第 1–20 页，并在 coordinator 检查之前写好 digest。另一次 Learn2Play 续跑以 `no_gap` 结束，检查器通过，独立评估限于其被审阅的证据。之后一次前瞻性 punctuation-repair 测试通过全部 23 项 observer 检查，native CLI 与 observer 退出码均为 0，并有对该窄修复边界的独立评估。较老的随机工作流在中断后结束，没有 C002 verdict 或 report。一次修正实验完成了新的基线、候选和当前评审，随后因所选证据不可用而以评审 verdict `unverified` 停止；其 native CLI 和最终检查器成功，但 observer driver 未通过全路径验收，未生成 report。

**作者主张／未验证项**：作者明说「complete compliant scientific workflow remains unverified（完整合规的科学工作流尚未被验证）」。角色间的结构化 digest 与 result masking 只是降低泄露——搜索摘要与抓取的文档仍可能在历史 cutoff 之后暴露结果或页面。文件所有权与角色边界依赖 prompt 和工具配置，不是文件系统沙箱，也不保证完全盲化。离线检查器不能证明引用支持其主张、基线确实先建、或想法全局新颖。非显而易见性比较需要候选暴露前冻结的基线。除非你显式提供参考提案，reference matching 与 citation F1 不可用。

**适用条件**：Claude Code 需支持嵌套 subagent（测试于 2.1.287）；Codex CLI 需原生 plugin 与 multi-agent 支持（加载于 0.160.0）；Pi 需 1.0.0+ 与当前 `@earendil-works` 扩展 API；离线检查器需 Python 3.10+；PDF acquisition helper 仅对 Claude Code reader 可用（本次修复未为 Codex 或 Pi 增加 PDF 解析）。许可证 CC BY-NC 4.0，商用受限。

## 怎么试、怎么验证

**最小试用方式**：挑一个你已经熟悉、有一定文献积累的窄研究问题（便于人工核对证据真伪），跑一次：

```text
/ideascientist:ideate <你熟悉的窄问题> slug <短名>
```

结束后立即跑结构检查：

```sh
python3 /absolute/path/to/ideascientist-claude-code/scripts/check_artifacts.py runs/ideascientist/<短名> --json
```

再人工抽查三类东西：`papers/P001.json` 里的 locator 是否真能在它声称的精确版本里定位到对应段落；`report-evidence.json` 的引用回执与依赖快照是否自洽；`candidates/C001.json` 与 `reviews/C001.json` 的 verdict 是否一致、`baselines/G001.json` 是否确实早于候选。

**判断有没有改善的指标**：
1. 检查器 pass/fail（结构一致性的门槛）。
2. 人工抽查的 locator 命中率（抽若干条，看多少条能在精确版本中找到对应处）。
3. 提案里的 `kill_condition` 是否具体到可判定，而不是空话。
4. 是否出现 `no_gap` / `blocked` / `unverified` 以及原因是否合理——「敢于拒绝产出」本身是可信度信号。
5. 对照实验：同一问题分别用「带插件」和「裸 Claude Code 对话」跑，比较产出中可溯源证据的比例与显式假设的完备程度。

不要把「生成了提案」当作成功标准：作者明确说 proposed results 只是 predictions，且完整合规的科学工作流仍未被验证。若你的场景是商业用途，还需先处理 CC BY-NC 4.0 的许可限制。
