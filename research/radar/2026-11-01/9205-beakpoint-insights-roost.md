# Beakpoint-Insights/roost

- 结论：**值得一试**。建议在单个仓库、单个小型 epic 上安装 roost 跑一遍完整流程（shape-epic → 计划审批 → 逐切片构建 → 发布 QA → pair-runbook），以“人工介入次数、计划返工轮数、漏到 release-qa 的缺陷数”作为是否保留的判断依据；它给出了可直接照抄的安装命令、配置查找顺序、会话拓扑与人工检查点，但成熟度证据只有作者自述与 30 stars，且强绑定 Claude Code + Jira/Xray/gh stack，尚不足以直接 adopt。
- 原文：https://github.com/Beakpoint-Insights/roost
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-01T07:07:04.666Z

## 是什么

roost 是 Beakpoint 开源（MIT）的一套 Claude Code 插件式 **skills 集合**（不是独立 agent，本身不托管任何服务），把「产品想法 → 上线」整条链路串起来：塑造 epic、按切片逐块构建、整体评审、真实浏览器 QA、以及带着人一步步执行发布 runbook。

它的主张是「规格驱动开发不能停在写完代码」：多数 spec-driven 工具在代码写完后交付，roost 继续走完 review、close-out、release QA 和 rollout。同时它对人机分工有明确约定：**agent 干活，但在命名检查点停下来让人做决定；rollout 的每条命令都由人自己执行**。

作者是 Beakpoint，自称每天用它构建自家产品（属自述，无第三方数据）。README 中可见 30 stars，属于早期项目。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 步骤 0：确认前置条件（不满足就别装）

README 给出的「今天能完整跑通」的组合：

- **Claude Code**，每个 repo 一个 session；多数 skill 也能在 Cursor 里用（见步骤 6）。
- **Tracker**：Jira（走 Atlassian MCP）或 GitHub Issues（走 `gh` CLI）。
- **测试管理**：Xray（Cucumber 场景），或 repo 里的 eval cases（Claude Code 插件场景）。
- **GitHub** + `gh` CLI；如果堆叠 PR，还要 `gh stack` 扩展。
- 如果是 app：**Playwright MCP**（检查原型、真实浏览器测试）+ 一条命令就能起来的**本地栈**（Aspire、Docker Compose 或你自己的脚本）。库或插件类项目不需要这两项。

凭据通过环境变量提供（README 只写变量名，未给取值方式）：Jira 用 `JIRA_EMAIL`、`JIRA_API_TOKEN`；Xray 用 `XRAY_CLIENT_ID`、`XRAY_CLIENT_SECRET`。

⚠️ README 明确警告：**某个 skill 所需工具缺失时，安装会「静默失败」（install fails quietly）**，所以先按下面「What each skill needs」表核对，再开工。

### 步骤 1：安装插件

前提：已在 Claude Code 中。命令原样：

```
/plugin marketplace add Beakpoint-Insights/roost
/plugin install roost@roost
```

安装后 skill 以 `roost:<skill>` 形式可用，例如 `roost:shape-epic`。

### 步骤 2：写一份团队配置

前提：能回答你们的 tracker、repos、本地栈、分支与部署规则。运行：

```
/roost:setup
```

它要么链接你们已有的共享配置，要么逐个询问后生成一份。完整示例见 `examples/config.example.yml`，每个 key 的含义见 `skills/roost-config/references/config-schema.md`（这两份文件不在本次抓取的正文里，实施时必须打开读）。

**配置查找顺序**（排在前面的优先）：

1. 你显式指定的路径
2. `$ROOST_CONFIG`
3. 当前 repo 的 `.roost/config.yml`
4. `~/.claude/roost/config.yml`

**多团队/单机多配置**：orchestrator 运行在 repo 之外，看不到 repo 内的 `.roost/config.yml`，所以要用环境变量启动：

```
ROOST_CONFIG=<that team's config> claude
```

**机器级差异**（自己的数据库、不同端口）只覆盖差异项，写到 `~/.claude/roost/local/<team.name>.yml`，仅在本机覆盖团队共享配置。

**团队协作做法**：多数团队把一份配置放在私有 repo 里，在各机器上链接到 `~/.claude/roost/config.yml`，`git pull` 即可同步。

**安全硬规则**：配置文件永不存放密钥，只写「密钥从哪里取」。

配置中可见的 key（README 表格）：`tracker.kind`、`tests.kind`、`vcs.stacking`、`vcs.host`、`repos`、`stack`（另有 `deploy`、`design`、`qa` 可选，以及 `roadmap.skill`）。当前支持 Jira / GitHub Issues、Xray / repo eval cases、`gh stack` / 普通 PR、GitHub；Linear、Graphite、GitLab、Gherkin 文件、Cursor 完整支持、Codex、Copilot、Gemini CLI 均在 roadmap 中。

### 步骤 3：搭建会话拓扑（这是它最可照搬的一条结构）

前提：所有 repo 在同一台机器上，每个 session 都装了 roost。

以「后端 + 前端两个 repo」为例，开三个 Claude Code session：

- **API session**：在后端 repo 里打开；
- **UI session**：在前端 repo 里打开；
- **orchestrator**：在任意位置打开，**它从不编辑任何 repo**，只把活分发给其他 session 并把结果带回来。

一个 repo 就是一个 worker session，三个 repo 就三个。

### 步骤 4：塑造 epic

前提：tracker 与测试工具可访问、Playwright MCP 可用、能读到你们的设计系统、配置里指定了 plan skill。

```
/roost:shape-epic New customers should be able to send data within minutes of signing up.
```

它跑七个阶段：problem、epic、design、slices、tests、build guide、handoff，每个阶段结束都与你确认。产物落到 epic 上：

- 含问题、目标、范围描述的 epic；
- 基于你们设计系统做出的原型；
- 有序 stories，一个切片一个，每个都小到能独立交付；
- 每个 story 的测试（写进你们的测试工具）；
- build guide 与 tech lead prompt，附在 epic 上。

### 步骤 5：规划构建（第一个硬检查点）

在 orchestrator 里：

```
Build PROJ-1234.
```

`build-epic` 不提问直接开跑，先做规划：

1. 把 epic 的 tech lead prompt 发给 lead repo 的 session，后者在新开的 `gh stack` 上写实现计划。
2. **你审批计划**（或要求修改）。计划末尾固定有一行 **`Rollout needed: yes or no`**：当「合并 + 部署」本身不够时（迁移、回填、feature flag、外部服务配置）填 yes。
3. lead session 为每个 repo 在每个 story 上贴 kickoff comment（构建从这些 comment 起跑），并在 epic 上贴 **Release order** comment。若需要 rollout，还会创建 epic 的 deploy ticket 并跑 `write-runbook`，runbook 的每个阶段成为该 ticket 的子任务，**编号与名称一一对应**。

### 步骤 6：逐切片构建（核心循环）

`build-epic` 用 `run-slice` 按顺序构建每个 story：

1. 各 repo 的 session 按配置顺序、依据自己的 kickoff comment 构建自己那部分；**stack 的 owner 在它们之间启动本地栈**，使后建的 repo 对着前一个 repo 的真实成果构建。
2. 持有 e2e 套件的 session 用 `verify-slice-tests` 核对该 story 的测试，每个 session 对自己的 stack 跑 `/code-review`。
3. **检查点**：你会收到一份汇总的测试结果与评审发现，每条都带建议（现在修 / 之后开票 / 跳过），由你拍板。
4. session 对「现在修」的项以测试先行方式修复；e2e session 在真实浏览器里手工验证该切片，发现的 bug 以同样方式回到你面前。
5. `slice-handoff` 把剩余项归入「下一个切片 / 发布前 / 以后」（**归置结果由你确认**），跑一遍 epic 到目前为止的全部测试，并按实际建成的东西重写下一个 story 的 kickoff comment。

然后下一个 story 自动开始，不再询问。每个 repo 在每个切片的部分、每个 bug 修复，都是 epic stack 上独立的 PR，Release order comment 列出全部 PR 的合并顺序。

### 步骤 7：发布前收口

1. 修完「发布前」项（bug 走 `run-bug` 与 `bug-bash`），epic 的全部测试再跑一遍。
2. `review-epic`：每个 session 对 `main` 做整 epic 的 `/code-review`（高 effort），服务端代码额外做 `/security-review`，**重点盯没有任何切片评审看过的代码**，每条发现由你决定。
3. `close-out-epic`：每张未关 ticket 都要有归宿（发布前修 / 移到后续 epic / 独立），**由你确认**；发布后检查生产确实跑了这个 epic，并主动提议起草 release note。
4. e2e session 跑 `release-qa`：完整 e2e、探索性测试、给出发布结论。

### 步骤 8：发布（人执行每一步命令）

roost **不替你 merge、不替你 deploy**。对它说：

```
let's run the PROJ-1234 runbook together
```

`pair-runbook` 带着你一次一步地走 deploy ticket 的 runbook：给你命令和预期结果，**你自己执行并粘贴输出**，它校验结果、填写本次运行记录、关闭该步子任务；每个阶段的门禁都停下来等你放行。合 stack 也是 runbook 的一步（`stacked-prs` 协助解冲突）。

### 步骤 9（可选）：在 Cursor 里用

前提：已 clone 本仓库。Cursor 从 `~/.cursor/skills/` 读同格式的 `SKILL.md`：

```
git clone https://github.com/Beakpoint-Insights/roost.git ~/src/roost
~/src/roost/scripts/link-skills.sh
```

换成别的工具目录：`scripts/link-skills.sh ~/.agents/skills`；撤销：`scripts/link-skills.sh --remove`。配置放 `~/.claude/roost/config.yml` 或设 `ROOST_CONFIG`。

Cursor 下的能力差异（照抄结论，别踩坑）：`run-slice`、`build-epic`、`run-bug`、`review-epic` **不能用**（它们要给别的 Claude Code session 发消息，Cursor 做不到）；`retro` 不能用（读 Claude Code transcript）；`slice-handoff` 部分可用（排序、tracker 更新、stack 检查可用，epic 测试那一步要手动在各 repo 跑）；`shape-epic` 部分可用（问题陈述、切片、测试可用；原型/artifact/tech lead 交接要在 Claude Code 里跑）。

### 步骤 10（可选）：沉淀团队自有 skill

只对你们团队有意义的 skill（公司格式的 roadmap、给董事会的报告）应放进自己的私有插件，与配置文件放在一起。roost 的 skill 可以调用它们——例如 `shape-epic` 会调用 `roadmap.skill` 指定的 skill 把 epic 放到 roadmap 上。新增 tracker 或测试工具的方式是加一个 adapter 文件（放在 `skills/roost-config/references/`）并在支持表里加一行。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 已经能做、但你可能没想到交出去的工作）**

README 里明确超出「写代码」范围、且给出触发方式和产物的：

- 把一句产品想法展开成含问题陈述、原型、切片、测试、build guide 的 epic（`shape-epic`，带 7 阶段清单）。
- 把「发布运维手册」写成**可录制、带门禁、命令字面化**的 runbook，并与 tracker 子任务一一对应编号同名（`write-runbook`）——这是很少被交给模型的文档工作。
- 起草面向客户的 release note：按「生产首次承载该 epic 的日期」定日期、附证据表格、只写切片实际建成的内容、证据不足处留白由人补（`release-notes`）。
- 跨仓交接：写出一段另一个 repo 的 agent 能在「冷启动」状态下直接执行的 prompt，并作为 ticket comment 落地（`cross-repo-handoff`）。
- ticket 分诊：先判断 tracker 里的发现是否准确、是否需要修，再按要求以测试先行方式修（`triage-ticket`）。
- 回溯改进：通过脚本读 session transcript，产出一份排序后的 setup 改进建议，每条带证据、被跳过的代价、以及「Checked / Hypothesis」标注，**在你决定前不做任何变更**（`retro`）。
- 测试侧：在场景「定稿前」就用 Playwright 对着运行中的应用验证 BDD 场景是否成立（`live-verified-bdd`），以及证明哪些 story 的测试真的已自动化并通过、必要时提议拆分（`verify-slice-tests`）。

**2. 任务匹配（什么工作适合什么模型、工具、协作方式）**

- **orchestrator 不碰代码**，只做分发与汇总；每个 repo 一个 worker session；按配置的顺序串行推进。这是一种明确的「多 session 编排 vs 单 session 全包」分工方案。
- **工具按操作类型分工**并有 adapter 抽象：tracker（Jira via Atlassian MCP / GitHub Issues via `gh`）、测试管理（Xray / repo eval cases）、分支（`gh stack` / 普通 PR）、本地栈（Aspire / Docker Compose / 自定义脚本）、浏览器验证（Playwright MCP）。
- **模型/agent 层面**：完整功能仅 Claude Code；Cursor 部分可用并逐 skill 列出能用/不能用（见步骤 9）。
- **计划由谁写**：由 lead repo 的 session 依据 tech lead prompt 写，而不是 orchestrator 直接写。
- **哪些命令绝不能交给 agent**：rollout 的每条命令由人执行。

**3. 条件供给（需要提供哪些信息、工具、权限、反馈）**

- **一份团队配置**是硬前置：tracker、repos（数量与顺序）、本地栈命令与 URL、分支与部署规则；`deploy`/`design`/`qa`/`stack` 可选，没有就不写。
- **凭据只以变量名出现**，配置里不放密钥。
- **状态不留在聊天里**：计划、kickoff、carry-over、测试结果都落到 tracker，因此任何一次运行都能接着上次继续。
- **可访问性**：每个 repo 一个 session、同一台机器；orchestrator 在 repo 之外启动，因此需要 `ROOST_CONFIG` 才能看到团队配置。
- **配置粘性**：orchestrator 记录启动时的配置，若恢复的运行加载了不同配置就停止——避免跨团队配置串台。
- **反馈回路**：每个命名检查点（计划、每切片发现、延后项归置、rollout 门禁）都是人给结构化反馈的位置；`slice-handoff` 会按实际建成情况**重写下一个 story 的 kickoff**，即把现实反馈回灌到后续提示词。
- **机器差异**用 `~/.claude/roost/local/<team.name>.yml` 局部覆盖。

**4. 主动推进（可由时间/事件/状态触发并持续完成）**

- `build-epic` **不提问直接开跑**，在切片之间、以及最后一个切片之后继续做发布前工作与 `release-qa`，「只在你的决策点和真实阻塞处停」。
- `run-bug` 同样「starts without asking」。
- 触发条件是**状态型**的：stories 还没有 kickoff comment 时先做规划；一个切片完成由 `slice-handoff` 收口后下一个 story 自动开始，不需要再问。
- 恢复机制基于 tracker 里的持久状态（不是聊天上下文），可「从上次中断处拾起」。
- 检查点是**命名且有限**的：`shape-epic` 提问、计划审批、每切片检查点、每切片交接归置、`review-epic` 发现、`close-out-epic` 归宿、rollout 每步与每阶段门禁；另外只属于人的事（解锁 commit signing、应答某 session 的权限弹窗）会列在「🙋 Your turn」最前面。
- 随时可问 orchestrator：`where are we on PROJ-1234?` 得到状态表。

**5. 效果验证（怎样判断确实改善了结果）**

- **有/无对照的 evals**：README 声称 eval cases 检查 skills 的行为，并且「run with and without roost」——即 A/B 跑法（具体用例与结果未在正文给出，需看 `CONTRIBUTING.md#evals`）。
- `verify-slice-tests` 提供**「哪些测试真的自动化且通过」的证明**并打标，而不是靠声称。
- `release-qa` 要求 e2e 全跑、**每个失败都要被分拣**，加探索性测试与明确的发布结论。
- `close-out-epic` 在发布后**逐张检查 ticket 是否真的 done**；并确认生产环境确实跑过该 epic（用 Python 3 + `gh` CLI）。
- `release-notes` 用表格列证据，且「证据没给出的留给人工填」。
- `retro` 把建议分成 **Checked（已验证）/ Hypothesis（假设）** 两档，并要求给出证据与被跳过的代价。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：roost 是运行在 Claude Code 里的插件式 skills 集合，`/plugin marketplace add` + `/plugin install` 即装；完整功能以 Claude Code 为前提，部分核心 skill（`run-slice`/`build-epic`/`run-bug`/`review-epic`）依赖它跨 session 发消息的能力。二者是「宿主 + 工作流层」的关系，不冲突。
- **Playwright MCP（try）**：被 `shape-epic`（检查原型）、`live-verified-bdd`（场景定稿前对运行中的应用验证）、`release-qa`（真实浏览器 e2e 与探索性测试）直接使用；是 app 类项目的硬前置之一。
- **Cursor（watch）**：README 有专门的「Using roost in Cursor」一节，用 `scripts/link-skills.sh` 链接 `SKILL.md`，并逐 skill 说明可用性；但四个编排类 skill 与 `retro` 不可用，`shape-epic`/`slice-handoff` 仅部分可用，且「Cursor 完整支持」仍在 roadmap。
- **GitHub Copilot（drop）**：README 把 GitHub Copilot 列为**计划中**的编码 agent 支持（issue #39），当前不支持。
- **Atlas（watch）**：给出的 README 文本中未提及，无可依据的关联，不作推断。
- **skills.sh（try）**：材料中未直接提及；可确认的相邻事实是 roost 以 `SKILL.md` 格式分发 skills，并支持链接到 `~/.cursor/skills/` 或任意目录如 `~/.agents/skills`。是否与 skills.sh 生态互通，需另查，不作结论。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的（可核对的事实性内容）**：

- 安装命令、配置查找顺序、`ROOST_CONFIG` 与 `local/<team.name>.yml` 覆盖机制、Cursor 链接脚本及其 `--remove`/目标目录参数——都是可执行的具体做法。
- 每个 skill 的依赖表（tracker access / test access / Playwright MCP / 本地栈 / `gh` CLI 等），以及环境变量名（`JIRA_EMAIL`、`JIRA_API_TOKEN`、`XRAY_CLIENT_ID`、`XRAY_CLIENT_SECRET`）。
- 当前支持矩阵与 roadmap（Linear、Graphite、GitLab、Gherkin、Cursor 完整、Codex、Copilot、Gemini CLI 尚未支持）。
- 一个具体（示例性、虚构）的 epic 走查：PROJ-1234「新客户注册后几分钟内就能发数据」，两个 repo → 三个 session，五段流程和各检查点。
- 明确的失败模式警告：「Install fails quietly if a skill's tools aren't there」。
- 一个可复现 demo 的生成方式：`vhs demo/roost.tape && gifsicle -b -O3 --colors 64 --lossy=30 demo/roost.gif`。

**只是作者主张、正文未给数据的**：

- 「Its behavior is tested」——只说有 eval cases、with/without 对照，**没有给出用例数、通过率或对照结果**（在 `CONTRIBUTING.md#evals`，本次未抓取）。
- 「Beakpoint uses it every day to build its own product」——自用背书，无第三方或量化效果。
- 「Most spec-driven kits hand off once the code is written」——对同类工具的概括，无对比证据。
- 30 stars、无发布方之外的采用案例；README 未给性能、缺陷率、周期缩短等任何数字。
- 本次材料**只有 README**，未包含 `examples/config.example.yml`、`config-schema.md`、`CONTRIBUTING.md#evals`、各 adapter 说明文件；因此配置的具体字段值、eval 的具体断言都无法从材料确认，实际实施必须打开这些文件。

**适用条件（照做前必须满足/接受的）**：

1. 团队在 **Claude Code** 上，且愿意接受「每个 repo 一个 session + 一个 orchestrator，全在同一台机器」的拓扑。
2. Tracker 只能是 **Jira（Atlassian MCP）或 GitHub Issues（`gh`）**；测试管理只能是 **Xray 或 repo 内 eval cases**。用 Linear / GitLab / Graphite 的团队现在上不了。
3. 需要付费/配置成本：Jira + Xray、`gh stack` 扩展、app 类还要 Playwright MCP 与可一条命令启动的本地栈。
4. 接受它的强观点：测试先行、小 PR 堆叠、命名检查点必须由人拍板、任何东西不得只存在于聊天里、rollout 由人执行。
5. 团队要能维护一份共享配置（建议放私有 repo 并链接到 `~/.claude/roost/config.yml`），且接受「配置里绝不写密钥」。
6. 对 Cursor 用户：先按步骤 9 的能力表裁剪，不要指望编排类 skill。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（建议 1–2 周，一个 repo、一个真实但小的 epic）**

1. 只在一个 repo 上试（跳过跨仓复杂度）：装插件 → `/roost:setup` 生成配置 → 确认 `tracker.kind`、`tests.kind`、`vcs.stacking`、`repos`、`stack` 都填对；把配置提交到私有 repo 并在本机链接到 `~/.claude/roost/config.yml`。
2. 先跑**只有一个人的闭环**：一个 worker session + 一个 orchestrator（同一台机器）。暂不接 `gh stack`，用普通 PR（`vcs.stacking` 设为 plain PRs）。
3. 挑一个 3–5 个切片的小 epic，跑 `/roost:shape-epic`，**只做「问题陈述 + 切片 + 测试」三个阶段**就停，先判断它切出来的 story 是否「小到能独立交付」——这是它最核心的可检验主张。
4. 再跑一个切片：`Build <EPIC-ID>` → 审批计划（重点看计划末尾的 `Rollout needed:` 判断是否符合你的实际）→ 走完一个 `run-slice` 检查点 → 手动执行一次 `slice-handoff`（Cursor 或单 session 场景下按 README 说明手动做 epic 测试那一步）。
5. 若项目是 app，接 Playwright MCP，跑一次 `verify-slice-tests`；不是 app 就不接。
6. 最后用 `retro` 读一次 transcript，看它给出的「Checked / Hypothesis」建议里，有多少是你愿意采纳的——这同时是对工具本身的检验。

**判断有没有改善的指标（试用前后各记一次基线）**

| 维度 | 指标 | 期望信号 |
|---|---|---|
| 人工介入成本 | 单个 epic 的人为介入次数；每次介入是否都落在它声明的命名检查点上（计划/切片/交接/评审/rollout） | 介入次数下降，且**非预期打断**（如权限弹窗、静默失败）占比很低 |
| 计划质量 | 计划被驳回/要求修改的轮数；`Rollout needed` 判断与实际所需的一致性（漏判/误判次数） | 首轮通过率上升，rollout 漏判为 0 |
| 切片粒度 | `shape-epic` 产出的 story 中，真正能独立交付（单独合并后不留半成品）的比例 | 比例上升 |
| 测试可信度 | `verify-slice-tests` 判定「已自动化且通过」的测试数 / 该 story 测试总数；发布后回归漏网数 | 自动化并验证通过的比例上升，漏网下降 |
| 缺陷左移 | 在 slice 检查点与 `review-epic` 抓到 vs 在 `release-qa` 或生产才抓到的缺陷数 | 后者下降，前者不降（说明不是靠少测来「改善」） |
| 状态可恢复性 | 中断后按 tracker 状态续跑的成功率；续跑时因配置不一致而被正确拦下的次数 | 成功率高，配置串台为 0 |
| 周期 | epic 从 shape 到 release 的日历天 / 有效工时 | 不劣于基线（早期常常持平甚至变慢，属正常） |
| 对照实验 | 按 `CONTRIBUTING.md#evals` 的方法，对同一批任务跑 **with / without roost** 的 evals | 差异可复现、且体现在最终产物而非过程 |

**触发放弃/降级为 study 的信号**：`/plugin install` 后 skill 静默不可用且依赖表核对无误；配置需要为每个新 epic 手工大改；检查点频繁出现在声明之外的琐事上（说明编排边界没立住）；`verify-slice-tests` 无法对你们的测试栈给出可信的「通过证明」；或团队不在 Jira/GitHub Issues + Claude Code 组合内而 roadmap 又排不到你需要的工具。
