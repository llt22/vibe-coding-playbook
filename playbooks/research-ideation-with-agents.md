# 让研究构思 agent 交出可证伪提案：冻结基线、精确版本证据、结构校验

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎么把「研究构思」拆成一条可执行、有预算边界、产物可校验的多 agent 流水线，让 agent 交出带精确版本证据和可证伪预测的提案，而不是一个无法追溯的结论。
> 先试这一步：在 Claude Code 里装上 ideascientist 插件，拿自己熟悉的一个窄研究问题跑一次 `/ideascientist:ideate`，再用 `check_artifacts.py` 校验产物结构。
> 最近修订：2026-10-13

## 解决什么问题

研究构思这类工作通常不交给 AI，因为模型容易直接给一个看似完整、但无法追溯的结论。这篇手册给出一套可照做的做法：把研究构思拆成多角色 agent 流水线，每个角色只做一件事；用精确版本论文 + locator + 证据回执固定证据；在候选想法暴露之前冻结推导基线；用离线结构检查器校验产物；并给流程加上预算与上限，证据不足时记录 `no_gap` / `blocked` / `unverified` 而不是硬编结论。产出是一份带可证伪预测的研究提案，不是实验、模型或研究代码。

## 适用与不适用

适用：

- 你有一个窄的研究问题，想要一份可追溯证据、显式假设和评估计划的研究提案。
- 你想把「研究构思」从一次性问答改造成有角色分工、预算边界和产物结构的流水线。
- 你想借鉴其中可复制的机制（角色拆解、精确版本证据、候选前冻结基线、离线结构校验），而不是直接采纳它的研究结论。

不适用：

- 它不跑实验、不训练模型、不实现研究代码；产出的拟议结果仍只是预测。
- 需要可复现实验结果的场景，这套流程只能给出提案和评估计划。
- 商业用途：许可证为非商业（CC BY-NC 4.0，含署名与非商业条款），原始版权归 IdeaScientist 原作者。
- 作者自述完整合规的科学工作流尚未被验证；更适合小范围试，而不是直接当作科研结论来源。

## 前置条件

- Claude Code 需为当前版本并支持嵌套 subagent（原生设计测试于 2.1.287）。
- 七个 agent 全部使用 `model: inherit`，沿用你现有的 Claude Code 登录与模型配置。
- 不需要原版 Python 运行时、Vault 数据库、向量服务、自定义模型端点、MCP server 或训练环境。
- 离线检查器、固定的 arXiv 元数据助手、Claude Code reader 的 PDF 获取助手需要 Python 3.10 或更高，且只用标准库。
- 需要一个你想保存输出的研究项目目录；每次运行会写到该项目下的 `runs/ideascientist/<slug>`。
- 如果走 Codex：需 Codex CLI 支持原生 plugin 与 multi-agent（适配加载于 0.160.0）。
- 如果走 Pi：需 Pi 1.0.0 或更高，并配当前 `@earendil-works` 扩展 API。

## 操作步骤

### 做法 A：Claude Code 插件安装（推荐先跑这条）

1. 在 Claude Code 内从 GitHub marketplace 安装。前提：Claude Code 为当前版本且支持嵌套 subagent。预期：插件注册成功。

```text
/plugin marketplace add junjiezhou1122/ideascientist-claude-code
/plugin install ideascientist@ideascientist-native
```

等价终端命令：

```sh
claude plugin marketplace add junjiezhou1122/ideascientist-claude-code
claude plugin install ideascientist@ideascientist-native
```

2. 重启 Claude Code。

3. 如果 Claude 请求读取捆绑的 contracts 或 templates，授予对插件文件的 Read 权限——加载插件不会自动授予对其捆绑资源的文件系统访问权。使用 Claude Code 显示的实际安装路径，而不是固定的 cache 版本路径。

4. 启动一次运行。预期：coordinator 一次只搜索一个 challenge axis；gap finder 把具体的方法缺陷落在 near-miss 工作上；innovator 提出一个带来源的直觉并把其机制映射到目标场景；一个全新的 reviewer 搜索竞争工作，试图反驳其新颖性、连贯性、可行性和有据性。修订会获得新 ID 并接受再次评审。只有当前幸存的候选会推进为完整提案。

```text
/ideascientist:ideate Investigate local credit assignment failures in long-horizon policy learning.
```

5. 可选：加历史截止、run 名或输出语言。无 cutoff 时使用实时文献；cutoff 作用于所读论文的精确版本，版本日期不明的来源无法支撑历史运行；输出跟随你请求的语言，或请求本身的语言。

```text
/ideascientist:ideate <research problem> cutoff 2025-12-31 slug credit-assignment
```

6. 跑完后检查产物结构。预期：检查器会拒绝损坏的 paper ID、缺失的阅读、locator 不匹配、不允许的版本日期、过期证据回执、变更的依赖快照、不完整的嵌套提案字段。

```sh
python3 /absolute/path/to/ideascientist-claude-code/scripts/check_artifacts.py /absolute/path/to/run --json
```

7. 用辅助命令续跑、查证据或评估提案（在任何辅助命令后追加 `runs/ideascientist/<slug>`）：

| 动作 | Claude Code | Codex | Pi |
|---|---|---|---|
| Resume | `/ideascientist:resume` | `$ideascientist:ideascientist-resume` | `/ideascientist-resume` |
| Check evidence | `/ideascientist:check` | `$ideascientist:ideascientist-check` | `/ideascientist-check` |
| Evaluate proposal | `/ideascientist:evaluate` | `$ideascientist:ideascientist-evaluate` | `/ideascientist-evaluate` |

### 做法 B：本地检出加载（想读改插件文件或固定路径时用）

克隆仓库，并在你想保存输出的研究项目里启动 Claude Code：

```sh
git clone https://github.com/junjiezhou1122/ideascientist-claude-code.git
# Replace both paths with the absolute path to your checkout.
claude --plugin-dir /absolute/path/to/ideascientist-claude-code --add-dir /absolute/path/to/ideascientist-claude-code
```

`--add-dir` 让 agent 能读取捆绑的 workflow、contracts 和 artifact schema；研究输出仍留在你的工作项目里。

怎么选：只想用标准安装流程，选做法 A；想读改插件文件或避免依赖 cache 路径，选做法 B。

### 做法 C：Codex 安装

```sh
codex plugin marketplace add junjiezhou1122/ideascientist-claude-code
codex plugin add ideascientist@ideascientist-native
```

重启 Codex 后调用：

```text
$ideascientist:ideascientist-ideate <research problem>
```

四个已安装 skill 使用全新的通用原生 worker 并共享角色指令；coordinator 中转 paper-reader 任务，因此不需要自定义 agent 配置或调整嵌套深度。使用本会话实际的多智能体 schema 和原生 web 搜索能力。

### 做法 D：Pi 安装

```sh
pi install git:github.com/junjiezhou1122/ideascientist-claude-code
```

重启 Pi 后调用：

```text
/ideascientist <research problem>
```

包会注册四个命令和全新的原生角色 worker；worker 继承你当前的模型、thinking level 和 provider 认证。默认研究工具用 Crossref 做发现、精确解析 arXiv 元数据、抓公开 HTML/text，不需要额外 API key；PDF 解析、出版商登录和 JavaScript 渲染需要兼容的宿主工具。

### 可直接照搬的约束设计：角色与预算

七个角色：

- `orchestrator`：依产物协调状态、稳定 ID、预算与阶段决策。
- `gap-finder`：在一个 challenge axis 上找 0–2 个有据的方法学空白。
- `paper-reader`：读一个已注册的论文版本，用 locator 回答具体目标。
- `innovator`：提出一个带来源的直觉，或对已评审候选做新修订。
- `reviewer`：主动挑战当前候选，可选评估提案。
- `blind-baseline`：在候选暴露前从问题和 near-miss 冻结一个推导基线。
- `report-writer`：把幸存的直觉展开成全部十四个提案字段。

默认预算：24 次角色调用、40 次搜索、18 次 reader 调用。
默认上限：每次运行最多 3 个 challenge axis、每个 gap 最多 3 个候选、每条 lineage 最多 2 次修订。
中断后预留额度仍视为已花费。
证据不足以支撑 gap 时记录 `no_gap`；访问、验证或预算阻塞时记录 `blocked` 或 `unverified` 并附原因。

### 产物结构长什么样

每次运行位于研究项目下的 `runs/ideascientist/<slug>`，包含：

- `run.json` / `plan.md` / `problem.md`：状态、预算、选中 ID、决策、研究问题。
- `gaps/A001.json`：方法学空白。
- `papers/P001.json`：精确版本身份、目标回答、locator、四个 result-masked 视图。
- `sources/P001.request.json` 与 `sources/P001.pdf` / `sources/P001.acquisition.json`：论文请求、PDF 和获取记录。
- `discoveries/T001.json`：发现。
- `candidates/C001.json` 与 `reviews/C001.json`：候选与评审。
- `baselines/G001.json`：候选暴露前冻结的基线。
- `report.json` / `report-evidence.json`：完整提案 + 引用回执与依赖快照。
- `evaluation.json`：可选的独立评估，附带声明的证据限制。

提案覆盖问题、相关工作、机制、形式化设定、方法、模型与训练假设、与先前工作的比较、拟议评估、可证伪预测和局限；预测含显式 `kill_condition` 字段；拟议结果仍只是预测。

## 怎么判断变好了

可观察指标：

- 离线检查器通过：`check_artifacts.py` 不再拒绝损坏的 paper ID、缺失的阅读、locator 不匹配、不允许的版本日期、过期证据回执、变更的依赖快照、不完整的嵌套提案字段。
- 证据链可追溯：论文有精确版本身份、locator、证据回执和依赖快照；`report-evidence.json` 能对应回 `papers/` 和 `sources/`。
- 基线先于候选：`baselines/G001.json` 在候选暴露前冻结，而不是事后补。
- 提案可被否证：预测里有显式 `kill_condition`。
- 该停就停：证据不足以支撑 gap 时出现 `no_gap`，访问、验证或预算阻塞时出现 `blocked` 或 `unverified` 并附原因，而不是硬编一个结论。

最小试用方式：按上面的命令，在自己熟悉的一个窄研究问题上跑一次 `/ideascientist:ideate`，并用 `check_artifacts.py` 校验产物，重点看角色拆解、精确版本证据、候选前冻结基线、离线结构校验这四处机制。

试多久：材料没有给出时长建议；先以一次完整运行 + 检查器校验通过为准，再决定是否扩大到第二个问题。

原文给出的可核对数据：

- 版本 0.2.2 于 2026-10-10 的检查通过了 81 个离线测试、结构检查器、Codex 与 Pi 的原生加载，以及确定性的 Pi transport 测试；之后的契约澄清通过了 84 个回归。
- 一次隔离的 Claude Code reader 获取了精确的 CLIN PDF、读取第 1–20 页，并在 coordinator 检查之前写好 digest。
- 另一次 Learn2Play 续跑以 `no_gap` 结束。

## 常见坑

- 把「结构一致」当成「引用支持主张」。检查器只能证明结构一致，不能证明引用支持其主张、基线确实先建、或想法全局新颖。
- 忘记授予插件文件 Read 权限，导致 agent 读不到捆绑的 contracts 或 templates。
- 使用固定的 cache 版本路径，而不是 Claude Code 显示的实际安装路径。
- 无 cutoff 时使用实时文献，却期待历史截止效果；cutoff 只作用于所读论文的精确版本，版本日期不明的来源无法支撑历史运行。
- 中断后以为预留额度会恢复——预留额度仍视为已花费。
- 把 result masking 当成「证据被隐藏」；它是从 digest 中移除已报告的数值结果和优越性声明，避免被已报告结果带偏。
- 把拟议结果当成已验证结果；提案里的预测仍只是预测。
- 忽略许可证：CC BY-NC 4.0，含署名与非商业条款。
- 在 Codex 上额外配置自定义 agent 或调整嵌套深度——coordinator 中转 paper-reader 任务，不需要这些。
- 在 Pi 上期待 PDF 解析、出版商登录和 JavaScript 渲染开箱可用——它们需要兼容的宿主工具。

## 证据与来源

本手册依据的调研报告：`junjiezhou1122/ideascientist-claude-code`（作者自述为 IdeaScientist 研究构思方法论在 Claude Code / Codex / Pi 上的原生适配，独立适配，非官方上游分发）。

报告中给出的数据与案例：

- 版本 0.2.2 于 2026-10-10 的检查通过了 81 个离线测试、结构检查器、Codex 与 Pi 的原生加载，以及确定性的 Pi transport 测试；之后的契约澄清通过了 84 个回归。
- 一次隔离的 Claude Code reader 获取了精确的 CLIN PDF、读取第 1–20 页，并在 coordinator 检查之前写好 digest。
- 另一次 Learn2Play 续跑以 `no_gap` 结束。

报告结论：可以小范围试——按 README 的安装与调用命令，在自己熟悉的一个窄研究问题上跑一次 `/ideascientist:ideate` 并用 `check_artifacts.py` 校验产物，重点借鉴它「角色拆解 + 精确版本证据 + 候选前冻结基线 + 离线结构校验」这套可复制的机制，而不是它的研究结论。

作者自述的边界（尚未被验证的部分）：完整合规的科学工作流尚未被验证；许可证为非商业（CC BY-NC 4.0）。检查器本身声明只能证明结构一致，不能证明引用支持其主张、基线确实先建、或想法全局新颖。这些属于作者主张/自述，不是本手册独立复现的结论。

与已有清单条目的关系（来自报告）：Claude Code（tool，adopt）、arXiv（source，try）；Crossref 用于文献发现。清单中没有其他相关条目。

## 依据的调研

- [junjiezhou1122/ideascientist-claude-code](../research/radar/2026-10-12/2727-junjiezhou1122-ideascientist-claude-code.md)：值得一试，可以小范围试：按 README 的安装与调用命令，在自己熟悉的一个窄研究问题上跑一次 `/ideascientist:ideate` 并用 `check_artifacts.py` 校验产物，重点借鉴它「角色拆解 + 精确版本证据 + 候选前冻结基线 + 离线结构校验」这套可复制的机制，而不是它的研究结论；理由是它给出了可直接照做的命令、角色职责、预算上限和文件产物结构，但作者自述完整合规的科学工作流尚未被验证，且许可证为非商业（CC BY-NC 4.0）。
