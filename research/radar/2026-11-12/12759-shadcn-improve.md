# shadcn/improve

- 结论：**值得一试**。先在具备完整 build/test/lint 命令的代码仓库里小范围试用：用 `/improve quick` 产出一份审计报告，只选 1–2 条高置信、工作量小的发现生成计划，再交给成本较低的模型执行；因为原文给出了可直接照抄的安装命令、完整的命令序列，以及计划必须满足的三条硬性规范（自包含、验证门槛、STOP 条件），但改善效果只有作者的一个示例运行，没有量化证据。
- 原文：https://github.com/shadcn/improve
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T06:28:11.432Z

## 是什么

`shadcn/improve` 是一个 Agent Skill：用能力最强的模型审计代码库，并把审计结论写成自包含的实施计划（markdown），交给更便宜的模型或其他 agent 执行。核心分工是「智能叠加在理解与判断上，执行交给弱模型」——这个 skill 自己从不改代码，产物是计划本身。

```
you          →  /improve                    (expensive model, advises)
plans/       →  001-fix-n-plus-one.md       (self-contained specs)
other agent  →  implements, tests, ships    (cheap model, executes)
```

计划是纯 markdown，任何 agent 或人都能接手。按原文，它可在任何支持 [Agent Skills](https://agentskills.io) 格式的 agent 中使用。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：目标是一个 git 仓库；使用支持 Agent Skills 格式的 agent；该仓库有可跑通的 build/test/lint 命令（这些会变成计划里的验证门槛）；你愿意人工审阅计划并自己决定合并。

1. **安装 skill**（在仓库或全局环境执行）：
   ```bash
   npx skills add shadcn/improve
   ```

2. **首次审计**。在仓库里打开 agent，跑完整审计；想先控制成本就用 quick 档：
   ```
   /improve
   /improve quick
   ```
   其他可选档位：
   ```
   /improve deep                 exhaustive: every package, every category
   /improve security             focused audit (also: perf, tests, bugs, ...)
   /improve branch               audit only what the current branch changes
   /improve next                 feature suggestions — where to take the project
   /improve plan <description>   skip the audit, spec one thing
   /improve review-plan <file>   critique and tighten an existing plan
   /improve ... --issues         also publish plans as GitHub issues
   ```

3. **挑选要立项的发现**。审计返回一张 findings 表（列含 #、Finding、Category、Effort、Confidence），用自然语言回复编号即可，例如 `plan 1, 3 and 5`。

4. **人工审阅 `plans/`**。每条被选中的发现生成一个文件，另有一份 index，包含推荐顺序和依赖图。原文明确说这些计划「meant to be reviewed」，这一步不要跳过。

5. **交给执行端**。两种方式：把计划丢给任意 agent（例如让它 `implement plans/001-*.md`），或让 skill 代派：
   ```
   /improve execute 001
   ```
   后者会在隔离的 git worktree 里启动一个更便宜的 executor 子 agent，拿到计划后执行，再由顾问角色像 tech lead 一样复核：重跑每条 done criterion、检查范围合规、对照意图读 diff，给出 approve（合并仍由你决定）/ 退回修改（最多 2 轮）/ block 并回头改计划。

6. **下一次会话做清账**：
   ```
   /improve reconcile
   ```
   验证已完成（DONE）的计划是否仍然成立、排查被 BLOCKED 的计划并绕过障碍重写、刷新已漂移的计划、退役被别人顺手修掉的发现。

7. **PR 前做范围化审计**：
   ```
   /improve branch
   ```

8. **（可选）把计划发到工作发生的地方**：加 `--issues`，以同样的自包含正文发布成 GitHub issue。

**写计划时必须满足的三条规范**（原文称之为让计划「可执行」的关键，可直接当作自检清单）：

- **自包含**：所有上下文内联——精确文件路径、当前状态代码摘录、仓库惯例（附一个范例文件）、已验证的命令。不写「如上文所述」。
- **验证门槛**：每一步以一条命令加其期望输出结尾，done criteria 必须机器可判定，执行器不需要自己判断是否成功。
- **硬边界**：显式列出范围外清单，并写 STOP 条件（「若 X，停下并报告」），避免弱模型在现实与计划不符时自由发挥。
- 另外，每份计划会打上写作时的 git commit，执行器动手前先做一次机械的 drift check。

**skill 自身的硬规则**（可作为给 agent 设定边界时的参考）：从不修改源码，唯一写入是 `plans/`；执行器只在一次性 worktree 里改动；从不运行会改变工作树的命令，只读、搜索与只读分析；从不复现密钥值，只报位置和凭证类型并建议轮换；被要求直接实现时拒绝，指向计划或提供 `execute`。

审计覆盖九个类别：correctness、security、performance、test coverage、tech debt、dependencies & migrations、DX、docs、direction（功能建议，每条必须引用仓库自身证据）。流程为：Recon（映射仓库技术栈、惯例、精确的 build/test/lint 命令；若存在 `docs/adr/`、PRD、`CONTEXT.md`、`DESIGN.md`、`PRODUCT.md` 则一并读取）→ Audit（并行子 agent 分头审九类）→ Vet（顾问自己重读每个被引用的位置，剔除误报、修正错误归因、记录驳回理由）→ Prioritize（按 leverage = impact ÷ effort，以 confidence 加权排序）→ Plan。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：可交给 AI 的不止写代码——「读懂代码库、判断什么值得做、写规格」被显式划给最强模型，且 skill 拒绝自己实现。可交给 AI 的审计面被具体化为九类，包含常被忽略的 DX、docs 和 direction（功能方向建议）。direction 类要求每条建议引用仓库自身证据，是抑制「空泛点子」的一条可照搬约束。

**2. 任务匹配**：明确的两级分工——强模型做审计、判断、写规格、复核；便宜模型做执行。执行在隔离 worktree 中进行，执行后由顾问按计划复核，退回上限 2 轮。计划被刻意写给「最弱的可能执行者」（从未见过顾问会话、可能小得多的模型），这是任务与模型能力匹配的一个可操作原则。

**3. 条件供给**：需要提供的信息与工具包括——skill 安装；仓库可运行的 build/test/lint 命令（成为验证门槛，没有它这套流程的核心约束就落不了地）；已有的意图与设计文档（ADR、PRD、`CONTEXT.md`、`DESIGN.md`、`PRODUCT.md`），读了才能不把已决定的权衡重新报为问题、方向建议才有依据、计划才说仓库自己的术语；git commit 戳用于漂移检查；`--issues` 需要 GitHub 写入权限。

**4. 主动推进**：`reconcile` 是典型的基于状态推进——按 DONE / BLOCKED / 漂移 / 已被他人修复四种状态分别处理，把 backlog 当作需要持续维护的活对象而不是一次性输出。`branch` 把审计范围绑定到当前分支的变更，是一种按变更事件触发的小循环。但原文描述的仍是人工在会话里手动调用的命令，没有任何定时或事件自动触发的机制。

**5. 效果验证**：这是原文最实在的部分——每步一条命令加期望输出，done criteria 机器可判定；`execute` 会重跑所有 done criterion 并检查范围合规；结论是三态（approve / 退回 / block）；计划记录 commit 以做机械漂移检查；被驳回的发现连理由一起记录，避免下一轮重复出现（示例中 SEC-01 被判 by-design 并留档）。

## 与已有做法的关系

- **Agent skills（concept，adopt）**：本条目就是该格式的一个具体 skill，用 `npx skills add` 安装即可，可直接叠加在已有的 Agent Skills 做法上，是目前清单里该概念最完整的落地样本之一（含安装、命令集、边界规则）。
- **Cline（tool，watch）**：清单里 Cline 属于执行型编码 agent，与本做法中「executor 由任意 agent 承担、可换更便宜模型」的定位相容，理论上可作为执行端候选。但原文完全没有提到 Cline，这一对应关系是推断，未经原文验证，试的时候需要自己确认 skill 与 Cline 的兼容性。

## 证据与局限

**有依据的部分**：仓库 README 给出了完整安装命令、命令清单、五步使用流程、计划的三条写作规范、skill 的硬规则，并链接了一份真实产出的示例计划（`examples/001-extract-shadow-config-resolution.md`）。另有一次对 shadcn/ui 的示例运行，findings 表包含两条具体条目（`search.ts` / `view.ts` 中 shadow-config 重复且已漂移，`search.ts:31` 有 TODO；`migrate-icons.ts:168` 存在 O(n²) 的图标迁移），以及一条被驳回并记录理由的条目（`[SEC-01] https_proxy` 被判定为 by-design，不是 finding）。仓库当前 11,136 stars、当日 +361（来自指标，非 README 内容）。

**只是作者主张**：九类并行子 agent 的覆盖面、vet 阶段能有效压掉误报、leverage 排序的合理性，以及「面向最弱执行者写作」能提升可执行性——这些都没有量化证据（修复率、返工率、误报率、强/弱模型成本对比一概没有）。

**适用条件与局限**：

- 只适用于代码库类工作，非编码任务无法直接照搬。
- 强依赖仓库有可运行的验证命令；缺少测试/lint 的仓库里，verification gates 这一核心约束会退化。
- 计划质量仍取决于人工审阅——原文自己也说计划是给人审的，approve 后合并仍需人工。
- 平台绑定：需支持 Agent Skills 格式的 agent。
- 本报告仅依据 README（source_note 亦标注依据仓库 README），未读 skill 源码，也未读示例计划全文，因此 skill 内部提示词与实现细节不在证据范围内。

## 怎么试、怎么验证

**最小试用（一次会话到一次合并）**：

1. 选一个中等规模、测试和 lint 能跑通的仓库，先在干净分支上操作。
2. 安装后跑 `/improve quick`，控制成本。
3. 只挑 1 条 Confidence=HIGH、Effort=S/M 的发现生成计划。
4. 人工按上面的三条规范逐项检查这份计划：路径和代码摘录是否齐全、每步是否有命令加期望输出、是否写了范围外清单和 STOP 条件、是否打了 commit。
5. 用 `/improve execute <plan>`（或手动把计划交给一个更便宜/更小的模型）执行，记录过程。
6. 与基线对比：同一仓库、同类任务，用单一强模型直接改一遍。

**判断是否改善的指标**：

- 计划可执行率：执行器无需追问、无需自行补充上下文即可完成的比例。
- 一次通过率与退回轮次（原文上限 2 轮），以及 block 的发生频率与原因分类。
- 验证门槛的可靠性：gate 报通过但实际有问题的次数（假阳性），以及人工复核发现漏检的次数。
- 审计信噪比：vet 之后进入 findings 表、但被人工判为无效的条目占比（原文未给出该数字，需要你自己统计）。
- 成本：强模型 token 消耗与弱模型 token 消耗之和，对比全程使用强模型。
- 周期：从审计到合并的墙钟时间；以及一个周期后 `/improve reconcile` 中 DONE 的占比、BLOCKED 的数量。

**判断标准建议**：若一次通过率高（多数计划无需退回）、验证门槛假阳性接近零、且总成本低于单强模型基线，则可从 quick 档推进到常规 `/improve` 并扩大适用范围；若退回或 block 频繁，优先怀疑计划写作的三条规范没有落实（尤其是验证门槛与 STOP 条件），而不是直接否定这套分工。
