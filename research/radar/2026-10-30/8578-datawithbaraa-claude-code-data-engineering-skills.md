# DataWithBaraa/claude-code-data-engineering-skills

- 结论：**值得一试**。先在一个测试项目里挑 1–2 个技能（profile 或 incident）装进 .claude/skills 跑两周，对比人工完成同一任务的耗时与产出质量，再决定是否扩到全部 16 个；理由是仓库给出了可直接复制的安装和调用方式、每个 SKILL.md 都固定声明读写边界，但原文只有 README、看不到技能正文，且作者自述为首版草稿、无任何效果数据。
- 原文：https://github.com/DataWithBaraa/claude-code-data-engineering-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T12:00:43.461Z

## 是什么

`DataWithBaraa/claude-code-data-engineering-skills` 是一个面向数据工程师的 Claude Code 技能（skills）集合，共 16 个，定位是“写代码之外的工作”：新数据源摸底、失败管道排查、元数据建设、变更评审、文档、平台治理。多数技能最终产出一个可直接阅读、分享的网页。

- 其中 7 个（profile、metadata、incident、toolkit、data-product、pr-review、big-review）出自作者的 YouTube 视频《I Built My Own Data Engineering Tools with Claude Code》
- 示例页面描述的是虚构公司和虚构数据
- 作者明确标注这是 first draft，后续会扩充
- MIT 许可；示例页字体为 SIL Open Font License

技能按“什么时候用”分成六组，这份分组本身就是一份任务清单：

| 场景 | 技能 |
|---|---|
| 新数据到达 | profile（在基于它建任何东西前先理解数据源）、contract（按 Open Data Contract Standard 写数据契约）、metadata（每张表每列都有描述，类型取自数据、描述取自文档） |
| 出故障 | incident（从报错到根因、修复选项、邮件草稿、日志条目）、quality（哪些检查失败或告警，每张表今天是否可用）、reconcile（两个应当一致的数字，在哪分叉、为什么） |
| 变更上线前 | impact（改一张表/一列/一个函数会破坏什么，安全的改动顺序）、test-data（带边界案例的测试数据，且先写期望结果）、pr-review（按标准逐轮评审 PR，会提出反驳） |
| 需要全局视角 | toolkit（从仓库生成项目文档站）、big-review（从查询日志和仓库看整个平台并给建议）、cost-review（算力和存储的钱花在哪、砍什么） |
| 他人使用你的数据 | data-product（一张表对消费者所需的一切，从使用指南到契约）、docs（与代码一致的 runbook 和 how-to） |
| 项目变大 | knowledge-refresh（Claude Code 读的知识，对照代码和数据做校验）、migration（旧的任务与表资产盘点、打分、分波次规划） |

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**第 0 步 前提**：已安装 Claude Code，并有 Claude Pro、Max、Team、Enterprise 计划或 Claude Console 账号。项目是一个 Claude Code 能读到代码和数据的工程目录。

**第 1 步（方式 A：复制到项目）** 克隆仓库并把技能拷进项目的 `.claude/skills`：

```bash
git clone https://github.com/DataWithBaraa/claude-code-data-engineering-skills.git
mkdir -p your-project/.claude/skills
cp -r claude-code-data-engineering-skills/skills/* your-project/.claude/skills/
```

前提：在 `your-project` 之外执行，或自行调整相对路径；技能放在项目内才能读到项目上下文。

**第 2 步（方式 B：作为插件安装）** 在 Claude Code 里执行：

```text
/plugin marketplace add DataWithBaraa/claude-code-data-engineering-skills
/plugin install data-engineering@data-with-baraa
```

**第 3 步 调用技能**：直接敲技能名加上它需要的东西：

```text
/profile data/landing/purchasing
/incident 2026-08-19
```

插件形式需加命名空间前缀：

```text
/data-engineering:profile
```

注意视频里 incident 技能当时叫 `/incidents`，仓库里已改为 `/incident`。

**第 4 步 使用前先读一遍 `skills/<name>/SKILL.md`**：每个技能都写明了它读什么、写什么、绝不做什么。这一步是权限与影响面的确认，不要跳过。

**第 5 步 本地化改写**：技能故意写得通用，需要把自己的路径、标准、规则加进步骤里。仓库根的 `CLAUDE.md` 是视频里用的指令文件，复制到项目根目录后改写：

```bash
cp claude-code-data-engineering-skills/CLAUDE.md your-project/CLAUDE.md
```

**第 6 步 兼容性处理**：其他 Claude 应用可能不接受 `argument-hint` 这一行，上传技能到那些应用前先删掉该行。

**第 7 步 更新**：插件更新不自动。要么 `git pull` 后重新执行第 1 步的拷贝，要么在 `/plugin` 里手动更新。

**第 8 步 看示例产出**：多数技能在 `references/` 下有示例结果；示例页是 HTML，GitHub 只显示源码，需在浏览器中打开。

**技能文件的结构模板**（这是本仓库最可直接复用的部分）：一个技能 = 一个 `SKILL.md`，固定包含“任务 / 输入 / 步骤 / 输出 / 读什么 / 写什么 / 绝不做什么”，外加 `references/` 里的示例结果。

## 对应的研究问题

**1. 能力发现**：README 直接给出一份“数据工程里可以交给 AI 的非编码工作”清单，共 16 项，包括数据源摸底、数据契约、元数据补全、故障根因、质量裁决、双数对账、变更影响分析、测试数据与期望结果、PR 逐轮评审、文档站生成、平台级复查、成本复查、数据产品页、runbook、知识刷新、迁移盘点。其中多项（对账、影响面排序、成本归因、知识漂移校验）通常不会第一时间想到交出去。多数技能的共同终点是“生成一个可读可分享的页面”，说明这类交付物形态适合作为 AI 的产出单位。

**2. 任务匹配**：仓库按触发场景给技能分组，等价于一张“什么场景用哪个技能”的映射表。做法上它选择把流程固化成可复用的 SKILL.md 文件，而不是每次写长提示词；单个技能对应单个任务（一个数据源、一次失败运行、一张表、一个 PR），这是明确的任务粒度示例。

**3. 条件供给**：每个 SKILL.md 明示“读什么 / 写什么 / 绝不做什么”，这是把信息、工具、权限边界写进任务定义的具体做法，可作为给智能体授受权限时的模板。安装层面把技能放进项目 `.claude/skills` 以便接触项目上下文，项目根用 `CLAUDE.md` 提供路径与标准。原文未给出具体的权限配置项或 MCP/工具接入细节。

**4. 主动推进**：incident 可由失败的运行（原文示例用日期 `2026-08-19` 定位）触发；quality 输出“每张表今天是否可用”，隐含按天状态检查；knowledge-refresh 是随代码与数据漂移而做的周期性校验；migration 把旧资产分波次规划。但原文只到“技能名 + 一句话职责”的层面，没有给出定时调度、事件订阅或状态机的具体配置。

**5. 效果验证**：原文没有给出任何指标或验证方法。可用的只有两点线索：一是产出是“可读可分享的网页”，即可用“能否直接发给同事”作为人工验收标准；二是 `references/` 里有示例结果，可作为期望产出的比对基准。真正的验证方案需要自行设计。

## 与已有做法的关系

清单中相关条目只有 **Claude Code**（tool，状态 adopt）。本仓库是建立在 Claude Code 之上的领域技能包，属于对 Claude Code 的扩展用法：它把“如何用 Claude Code 做数据工程”从临时提示词变成可版本化的技能文件。不改变清单中 Claude Code 的 adopt 状态，也不与清单中其他条目冲突。

## 证据与局限

**原文给出的证据**：可执行的安装与插件安装命令；具体的调用示例（含插件命名空间前缀）；16 个技能的名称与一句话职责；SKILL.md 的固定结构（任务/输入/步骤/输出/读什么/写什么/绝不做什么）；7 个技能有视频演示；示例页面（`docs/*.png`）确实存在；MIT 许可；CLAUDE.md 位于仓库根可直接复制。仓库指标为 36 stars。

**只是作者主张、未经证实**：技能的实际质量和步骤细度——“按标准逐轮评审 PR 并会提出反驳”“安全的改动顺序”等表述没有附带案例或对照；作者自述这是 first draft，会持续扩充。

**关键局限**：提供的原文只有 README，**没有 SKILL.md 正文**，因此无法核对每个技能的步骤是否够具体、是否真能照做；效果验证部分完全空缺，没有任何数据、基线或前后对比；示例使用虚构公司与虚构数据，不能代表真实环境的复杂度；技能故意写得通用，直接使用大概率需要按自己项目的路径和标准改写；big-review 和 cost-review 依赖查询日志，incident 依赖运行记录，缺少这些输入时技能无法工作；示例产出是 HTML，在 GitHub 上只显示源码。

**适用条件**：数据工程团队；已具备 Claude Code 付费计划；项目内有 Claude Code 可读取的仓库、数据与日志；有人愿意先读 SKILL.md 再使用。

## 怎么试、怎么验证

**最小试用方式**：
1. 只选 1–2 个技能，优先 `profile`（输入是一个数据源目录，最容易复现）或 `incident`（有明确的对错答案）。
2. 在测试项目的 `.claude/skills` 里只放这两个，先不改写，直接跑一遍看默认行为。
3. 然后按第 5 步把项目路径与标准写进 SKILL.md，再跑一遍，比较改写前后的差别。
4. 同时用人工方式（或另一位同事）独立完成同一件事，作为对照。
5. 连续两周、用 3–5 个真实任务重复，记录每次结果。
6. 通过后再逐个增加技能；不建议一次装全 16 个，因为多数技能会写文件，且整套是首版草稿。

**判断有没有改善的指标**：
- 耗时：从“拿到失败运行/新数据源”到“写出可用的根因/画像”的分钟数，AI 组 vs 人工组。
- 结论质量：根因是否正确、画像是否覆盖了后续建模真正用到的字段和边界案例；与人工独立结论的重合度与遗漏项数量。
- 返工率：生成的页面有多少能直接发给同事，需要重写的段落比例。
- 边界遵守：SKILL.md 里“绝不做什么”是否被遵守，有没有写到不该写的路径或表。
- 稳定性：同一输入跑 3 次，结论是否一致；不一致的地方是否正好是需要人判断的地方。
- 可复用性：改写一次 SKILL.md 后，下一次同类任务是否不再需要重复交代背景（这直接检验“条件供给”是否到位）。

同时保留失败案例：如果失败集中在“缺少某类输入”或“步骤写得不够具体”，那正好是决定要不要自己重写 SKILL.md 的依据——这种情况下，仓库的价值就从“拿来用”转为“拿来当模板”。
