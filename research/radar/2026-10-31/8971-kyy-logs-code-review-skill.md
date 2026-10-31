# kyy-logs/code-review-skill

- 结论：**值得一试**。建议在非关键仓库或历史提交上小范围试用：先按 README 安装，并用 worktree 和 commits 两种模式跑通，验证四路探查、证据契约和 JSON 门禁是否真正可审计。暂不 adopt，因为它是 beta，现有验证只是回归样例，未证明通用召回率，并发缺陷检测也未验证。
- 原文：https://github.com/kyy-logs/code-review-skill
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-31T12:30:31.379Z

## 是什么

这是一个面向 Claude Code / Codex 的 Agent Skill，做“证据可审计、静态优先、探查驱动、门禁化”的代码评审。它读取 diff、周边源码、测试和项目规则，不要求构建、跑测试或覆盖率报告，也不修改被评审代码。核心是四路独立探查：`behavior-review`、`test-coverage`、`repo-guard` 为必需，`impact-analysis` 可选；每个发现必须带位置、摘要、证据和严重级别，最后由 JSON 派生报告事实和合并门禁。当前为 `v0.1.0-beta.3` 测试版。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. 前提：项目使用 Claude Code 或 Codex，并支持 Agent Skills / 自定义 agent；需要 Bash、Git、awk、grep、sed、Python 3.9+；`npx skills` 安装入口需要 Node.js 22.20+。在项目根目录执行安装命令。

```bash
npx -y skills add kyy-logs/code-review-skill --agent codex --skill code-review --yes
```

Codex 会安装到 `.agents/skills/code-review/`；Claude Code 把 `--agent codex` 换成 `--agent claude-code`，安装到 `.claude/skills/code-review/`。该命令只安装 skill，不再安装独立 reviewer adapter。

2. 在 Claude Code 中运行评审。前提是已安装 skill，并且当前仓库有未提交改动或指定 commit 区间。

```text
Review these changes with code-review.
```

也可以直接调用：

```text
/code-review
```

3. 对固定提交区间运行。前提是知道 `base..head` 的 commit ID。

```text
Use code-review on commits abc123..def456
```

支持两种模式：`worktree` 评审当前 `HEAD` 下的 staged、unstaged 和 untracked 改动；`commits` 评审固定的 `base..head` 区间。

4. 读取输出。评审结果写到：

```text
docs/work/active/{slug}/
├── code-review.md      # human report
└── probes/
    ├── behavior-review.json
    ├── test-coverage.json
    ├── repo-guard.json
    └── impact-analysis.json
```

5. 按需配置探查和项目规则。`references/probes.yaml` 控制 probe registry；项目规则可以放在 `.code-review/rules/`，也可以用环境变量指向：

```bash
export CODE_REVIEW_RULES_DIR=/path/to/rules
```

注意：项目规则包会替换内置规则包，不是与内置规则合并。

6. 理解执行流程：`scope → probes → sync → reconcile → report → gate`。先确定 `worktree` 或 `commits`，记录 base/head；再分派四个独立 agent，各自写 probe JSON；用 `collect-metrics` 校验 JSON 并派生计数；高严重度发现必须关闭或被 probe 标为误报；报告的事实部分从 JSON 渲染并校验；最后按 required-probe 失败和未关闭 high findings 阻断合并。

7. 按证据契约提交发现。每个 finding 必须记录：`location`（`path:line`，或带理由的文件级）、`summary`（具体什么问题，不是“建议改进”）、`evidence`（契约、代码路径、测试输出或规则 ID）、`severity`（`high` / `medium` / `low`）、`status`（`open` / `reconciled` / `wontfix` / `false-positive`）。High 级发现必须引用实际方法签名及其违反的契约，或具体代码路径；没有核对证据的猜测最高只能标 `medium`。

8. 明确边界：它不是测试、CI 或人工评审的替代品；干净报告不保证改动正确；不是覆盖率工具，覆盖率有数据时才用；不是修复器，不修改被评审代码。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- 能力发现：它把代码评审拆成行为契约、测试质量、仓库规则、影响面四类独立问题，能发现“普通 AI review 停在看起来有风险”之外的可定位问题。README 的回归案例提到资源生命周期、执行逻辑、输入边界、权限与数据范围、API 兼容性、缓存与状态一致性、性能与重复工作、测试质量等风险区域；但这些是样例验证，不是通用能力证明。
- 任务匹配：适合静态优先的代码评审，尤其是 fresh clone 或 partial checkout，不依赖构建、测试运行和覆盖率；四路探查各自回答窄问题，`behavior-review` 不是 linter，`repo-guard` 不是通用 bug scanner。不适合替代测试、CI、人工评审或自动修复。
- 条件供给：需要宿主支持 Claude Code / Codex 的 Agent Skills；需要 Bash、Git、awk、grep、sed、Python 3.9+；需要 diff、周边源码、测试和项目规则；覆盖率是可选项。项目规则要放在 `.code-review/rules/` 或用 `CODE_REVIEW_RULES_DIR` 指定，且会替换内置规则包。反馈条件包括 probe JSON、`collect-metrics` 计数、reconcile 状态和 gate 决策。
- 主动推进：可由代码变更或固定 commit 区间触发，按 scope 分派四路探查并自动产出报告和门禁；README 说明的是评审流程内的事件触发和状态门禁，没有说明定时调度或长期后台自主运行，因此不能据此认定它支持持续自主推进。
- 效果验证：用证据契约约束每条发现，用机器可读 JSON 派生计数和阻断条件，报告事实与 JSON 同源并互相校验；这让“为什么阻断合并”可审计。但仓库自己也说明速度、token 节省未验证，并发缺陷检测未验证，回归结果不等于通用召回率。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- Claude Code（adopt）：该 skill 明确支持 Claude Code，安装时使用 `--agent claude-code`，安装到 `.claude/skills/code-review/`，运行方式是自然语言提示或 `/code-review`。属于在 Claude Code 上增加一个可安装的代码评审 skill。
- Agent skills（adopt）：仓库按 Agent Skills 标准组织，skill 源在 `skills/code-review/`，安装入口是 `npx skills add`，README 也标注 Agent Skills 标准。属于 Agent Skills 概念的一个具体实现。
- 清单中没有其他相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

原文给出的验证数据：

- 52 个离线 pipeline、NEWS 和安装测试；干净项目端到端 gate 运行；额外的 probe smoke。作者明确说这些是回归检查，不是通用召回声明。
- 11 例历史 Java 回归（2026-10-29）：11/11 完成，静态评审；原始行为目标 5/5 命中，加上两个独立确认的边界案例后为 5/7 必需目标；干净和修复对照 4/4 通过且未误阻断；33 条原始发现，8 high、20 medium、5 low；0 条确认误报，未验证项仍 open；完整 merge gate 没有运行。两个确认漏报是 Keycloak 的合法 `tileVisible` 字符串写法绕过校验，以及 Kestra 的 JSON render/parse round-trip 破坏含引号、反斜杠或换行的命令值。
- 9 例扩展（2026-10-30）：独立运行，9/9 完成，36/36 probe records，0 probe 错误或跳过；正向目标 4/6；修复对照 3/3 不再报告；22 条原始发现，7 high、13 medium、2 low。该旧运行使用了 reviewer（5 run / 4 skip），而当前 skill 已没有独立 reviewer；作者明确说不要把两批合并成 20/20 的结论。确认漏报包括 x01 的合法 `d` flag 和 x04 的取消/加载生命周期。

哪些是作者主张或尚未证明：

- “no self-grading”“separation of duties”“auditable output”“machine-checkable gate”有架构描述支撑，但作者也承认四个 probe 仍使用同一模型，属于职责分离，不是独立人类裁决。
- 实际速度和 token 节省明确写为未验证；并发缺陷检测未验证；不是通用召回率声明。
- 评估 harness 和原始报告未放在公开仓库，外部无法复核完整评测过程。
- 当前是 beta，probe contract、report schema、gate behavior 在 1.0 前可能变化；严重级别从四级改为三级，旧记录中的 `critical` 不兼容，`collect-metrics` 会拒绝。

适用条件：静态优先、可在 fresh clone 或 partial checkout 上工作；覆盖率可选；需要宿主和 Python 等依赖；不能替代测试、CI、人工评审，也不能保证干净报告等于改动正确。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用方式：

1. 选一个非关键仓库和一小批改动：一批未提交 `worktree` 改动，加一段有已知问题或已修复问题的历史 `commits` 区间；同时准备至少一个干净对照或已修复对照。
2. 按 README 在项目内安装 skill，分别用 `Review these changes with code-review.` 和 `Use code-review on commits abc123..def456` 跑通两种模式。
3. 保留 `docs/work/active/{slug}/code-review.md` 和四个 probe JSON；用仓库自带的 `collect-metrics` 校验 JSON 并核对报告事实是否与 JSON 一致。README 没有给出 `collect-metrics` 的具体调用命令，试用时按仓库脚本说明执行，不要假设参数。
4. 对同一批改动保留现有的人工/CI 评审结果作为对照，记录哪些发现是新增的、哪些被人工确认、哪些是误报。

判断是否改善的指标：

- 必需 probe 是否都产出记录，JSON 字段是否完整；high finding 是否都带方法签名/契约或具体代码路径。
- gate 决策能否只从 JSON 重新推导，并与 `code-review.md` 的事实部分一致；这是“可审计”的核心检查。
- 在干净或已修复对照上是否出现误阻断；在小样本历史缺陷上是否命中已知问题，同时记录漏报，不把少量样例当成召回率。
- 与现有评审相比，人工确认一条可行动发现所需时间、误报导致的复核时间、以及阻断是否合理；速度/token 节省需要单独测量，因为 README 明确说未验证。
- 如果报告与 JSON 不一致、high finding 缺少证据、或干净对照频繁被误阻断，就不应扩大试用。
