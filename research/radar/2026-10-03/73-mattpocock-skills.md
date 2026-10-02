# mattpocock/skills

- 结论：**值得一试**。值得在一个真实仓库里小范围试：按原文两条安装路径之一装上技能集，先跑 /setup-matt-pocock-skills 配好 issue tracker、triage 标签和文档目录，再从 /grill-with-docs + /tdd 这两个最高频入口开始用；理由是原文给出了可直接复制的安装命令、一次性配置项和每个技能的职责清单，但效果只有作者主张，需要自建指标验证。
- 原文：https://github.com/mattpocock/skills
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T17:27:57.131Z

## 是什么

`mattpocock/skills`（作者 Matt Pocock）是一套面向编码智能体（Claude Code、Codex 等）的**技能（skills）集合**，作者自述是他每天用来做真实工程开发、而非 vibe coding 的配置。技能被设计为**小而可组合、跨模型可用**，每条都能单独改动。作者明确说这些技能不接管流程（对比 GSD、BMAD、Spec-Kit），而是把工程基本功压缩成可重复实践。

技能按一条轴分类：

- **用户调用型（user-invoked）**：只有你手输 `/xxx` 才会触发，职责是**编排**。用户调用型可以调用模型调用型，但不能调用另一个用户调用型。
- **模型调用型（model-invoked）**：你可以手动调用，agent 也可以在任务匹配时自动调用，承载**可复用的纪律**。

原文列出的技能（工程类）：用户调用型有 `ask-matt`（路由，问该用哪个技能）、`grill-with-docs`（拷问 + 建领域模型，内联更新 `GLOSSARY.md` 和 ADR）、`triage`、`improve-codebase-architecture`、`setup-matt-pocock-skills`、`to-spec`、`to-tickets`、`implement`、`implement-spec`、`wayfinder`、`retro`；模型调用型有 `prototype`、`diagnosing-bugs`、`research`、`tdd`、`domain-modeling`、`codebase-design`、`code-review`、`pr`、`wizard`。

生产力类：用户调用型 `grill-me`、`handoff`、`teach`、`to-questionnaire`、`wait-what`；模型调用型 `grilling`、`writing-for-agents`。

作者归纳它要解决的四个编码 agent 失败模式：

1. **Agent 没做我要的** → 用「拷问（grilling）」在动手前对齐；作者称这是他最受欢迎的技能，建议**每次**想做改动都用。
2. **Agent 太啰嗦** → 建一份共享语言文档（术语表），让 agent 能解码项目行话。原文给的 before/after 例子：`"There's a problem when a lesson inside a section of a course is made 'real' (i.e. given a spot in the file system)"` → `"There's a problem with the materialization cascade"`。
3. **代码跑不起来** → 补反馈回路：静态类型、浏览器访问、自动化测试；测试用红-绿-重构。
4. **造出一坨泥** → 每天投资设计；`/to-spec` 会先问你要动哪些模块；`/improve-codebase-architecture` 每隔几天扫一次深模块候选。

## 具体做法

**前提**：你需要一个支持 agent skills 的编码 agent（Claude Code、Codex 等）。下面两条安装路线**只选一条**——原文明确说两个都装会让每个技能出现两份。

### 1. 安装技能（二选一）

**路线 A：Claude Code 插件（只读、随作者更新，等于订阅而非 fork）**

```bash
claude plugins install mattpocock-skills
```

或在一个会话内：

```
/plugin install mattpocock-skills
```

前提：它在 Claude Code 官方 marketplace 里，不需要先添加源，更新自动到达。

**路线 B：Codex 及其他 agent（可选技能、可编辑）**

```bash
npx skills@latest add mattpocock/skills
```

前提/注意：安装器会让你**选择要装哪些技能、装到哪些编码 agent 上**；原文特意强调 **`setup-matt-pocock-skills` 必须被选中**。原文提到原生 Codex 插件在路线图上。

**给想改的人**：任意 agent（包括 Claude Code）用同一个安装器：

```bash
npx skills@latest add mattpocock/skills
```

它把技能以普通文件写进你的仓库，归你所有、可编辑，不会在背后自动更新；想要作者最新改动时拉取：

```bash
npx skills update
```

### 2. 每个仓库跑一次配置

在你的 agent 里运行：

```
/setup-matt-pocock-skills
```

前提：在每个仓库跑一次，且要在用其他工程类技能**之前**跑。它会被问三件事：

- 你要用哪个 issue tracker（GitHub、Linear，或本地文件）
- 你在 triage 工单时打什么标签（`/triage` 会用到这些标签）
- 你希望生成的文档存到哪里

### 3. 每次想改动前先对齐

- 非代码用途用 `/grill-me`：被 relentless 地追问一个计划或设计，直到设计树的每个分支都被解决。
- 代码用途用 `/grill-with-docs`：同样是拷问，但会顺带建项目的领域模型、打磨术语，**内联更新 `GLOSSARY.md` 和 ADR**。

前提：`/grill-with-docs` 需要你愿意让它写 `GLOSSARY.md` 和 ADR 文件（存放位置在步骤 2 里定过）。

### 4. 建共享语言（可选，但作者说这是最值钱的一步）

用 `/grill-with-docs` 或模型调用型 `/domain-modeling`：挑战术语是否与术语表一致，用边界场景压力测试，内联更新 `GLOSSARY.md` 和 ADR。作者称共享语言除了减少啰嗦还有三个附带好处：变量/函数/文件命名一致、代码库对 agent 更好导航、agent 思考花的 token 更少。

### 5. 建反馈回路

- `/tdd`：红-绿-重构循环，一次做一个垂直切片，用来建功能或修 bug。它会指导 agent 什么算好测试、什么算坏测试。
- `/diagnosing-bugs`：针对难 bug 和性能回归的纪律化诊断环，分阶段把关：**先建一个能对当前 bug 变红的反馈回路 → 最小化 → 提假设 → 插桩 → 修 → 回归测试**。

前提：原文说这类反馈回路依赖「静态类型、浏览器访问、自动化测试」这些常规设施——你得先有。

### 6. 管设计，别让它烂掉

- `/to-spec`：把当前对话整理成规格并发到 issue tracker（**不再访谈**，只是综合你说过的东西）；它会在写规格前先问你会动哪些模块。
- `/improve-codebase-architecture`：扫描代码库里的「深化机会」，以可视化 HTML 报告交出候选，然后对选定的一项做拷问。作者建议**每隔几天**在代码库上跑一次，并提醒这是**勘察不是抢救**：在老代码库上能找到真候选，但不会替你解开泥球。

### 7. 串起完整工作流

典型链路：`/to-spec` → `/to-tickets` → `/implement` 或 `/implement-spec` → `/code-review` 后才提交。

- `/to-tickets`：把任何计划/规格/对话拆成一组 tracer-bullet 工单，每个工单声明它的阻塞边；可写成本地文本文件，也可在真实 tracker 上建成原生 blocking 链接。
- `/implement`：按规格或工单建东西，在事先约定的接缝处驱动 `/tdd`，提交前用 `/code-review` 收尾。
- `/implement-spec`：在一个集成分支上实现整个 spec，把工单当任务图跑，在「就绪前沿」上并发跑实施子 agent，最后用 `/code-review` 收尾。
- `/wayfinder`：为超过一个 agent 会话容量的大块工作，在 issue tracker 上建一张决策工单共享地图，一次解决一个，直到通往目的地的路清晰。
- `/code-review`：按两个轴审 diff——**Standards**（是否符合仓库编码规范，加一套 Fowler 坏味道基线）和 **Spec**（是否忠实实现了源工单/规格），以并行子 agent 跑，互不污染。
- `/pr`：规定 PR 正文该长什么样——用最小的可视化把改动说清、附前后证据、给出合并风险判断（单向门还是双向门 + 爆炸半径）。
- `/retro`：会话结束后，按严重程度从高到低，提出对编码 agent 环境（导航、自动化检查、编码规范、steering 文件、工具）的改进建议。
- `/handoff`：把当前对话压缩成交接文档，让另一个 agent 能接着干。
- `/research`：作为后台 agent 运行，对着高可信一手来源调查一个问题，把结论写成带引用的 Markdown 文件存进仓库。
- `/wizard`：生成交互式 bash 向导，带人类走只有人才能做的步骤：开基础设施、配凭证或 CI secrets、走不熟的第三方控制台、跑一次性迁移或切换。

## 对应的研究问题

**1. 能力发现**：原文最有价值的部分在这里——它把一批「通常不会想到交给 AI 或本该交给 AI」的工作显式列了出来：动手前的需求拷问（`grilling` 是 `grill-me`/`grill-with-docs`/`triage`/`wayfinder`/`improve-codebase-architecture` 背后复用的原语）、建领域模型与术语表（`domain-modeling`）、把对话变成规格（`to-spec`）、拆票（`to-tickets`）、双轴代码评审（`code-review`）、纪律化调试（`diagnosing-bugs`）、扫深模块候选（`improve-codebase-architecture`）、生成人类操作向导（`wizard`）、把答不了的决策变成问卷（`to-questionnaire`）、跨会话教学（`teach`）、写面向 agent 的文档（`writing-for-agents`）。

**2. 任务匹配**：原文给出**一条明确的分工轴**——用户调用型负责编排、模型调用型承载可复用纪律；用户调用型可调用模型调用型，不可调用另一个用户调用型。并声明这些技能**跨模型可用**（不绑定单一模型）。`ask-matt` 被定位成用户调用型技能之上的路由器，用来「问哪个技能或流程适合你的情况」。

**3. 条件供给**：原文明确列了要提供什么——issue tracker 类型（GitHub / Linear / 本地文件）、triage 标签、文档存放位置（步骤 2 的三问）；`GLOSSARY.md` 与 ADR 文件（`grill-with-docs`、`domain-modeling`）；静态类型、浏览器访问、自动化测试（反馈回路前提）；一个能对当前 bug 变红的自动化反馈回路（调试前提）；后台 agent 能力（`research`）；子 agent 并行能力（`implement-spec`、`code-review`）。

**4. 主动推进**：有几条明确的触发线索，但**没有给出可照抄的定时/事件配置**：模型调用型技能可由 agent 在任务匹配时自动调用（状态/任务触发）；`/research` 以**后台 agent** 方式运行；`/improve-codebase-architecture` 作者建议**每隔几天**跑一次（时间触发，但未给 cron 或 hook 配置）；`/retro` 在**会话结束后**触发；`/triage` 把 issue 推进过一个 triage 角色的状态机；`/tdd` 以红-绿-重构循环持续提供反馈。

**5. 效果验证**：原文只有主张、没有量化验证方法。可归入验证的是这些主张：共享语言减少啰嗦、让命名一致、让代码库更好导航、让 agent 少花 token 思考；红-绿-重构「给 agent 一致的反馈水平，结果代码好得多」；`/code-review` 用并行子 agent 让两个轴互不污染。原文**没有给任何指标定义、基线或对照数据**。

## 与已有做法的关系

- **Claude Code（tool，adopt）**：本文的路线 A 就是 Claude Code 官方插件安装（`claude plugins install mattpocock-skills` 或 `/plugin install mattpocock-skills`），后续所有斜杠命令与 `/setup-matt-pocock-skills` 都在 Claude Code 会话里跑。本文可作为 Claude Code 上「装什么、按什么顺序用」的一份具体增量。
- **mattpocock/skills（tool，study）**：就是本条线索本身。原文提供了可复制的安装命令、一次性配置的交互项、完整技能清单与每个技能的职责，以及一条清晰的能力分类轴——这些是把状态从 study 往 try 抬的依据；但各 `SKILL.md` 的实际提示词内容不在材料里，所以不宜直接给 adopt。
- **Agent skills（concept，adopt）**：本文是该概念的一个具体实现集合，并贡献两条可复用的设计经验：用户调用 vs 模型调用的分层规则（谁能调谁），以及 `writing-for-agents` 这条「怎么写 agent 读的文档（skills、`AGENTS.md`/`CLAUDE.md`、任何 agent 通过指针找到的文档）」的元技能。
- **skills.sh（source，try）**：本文给出该来源的可执行入口——`npx skills@latest add mattpocock/skills`、`npx skills update`，以及 `https://skills.sh/mattpocock/skills`。也给出该来源的定位：把可编辑的技能文件复制进你的项目（与 Claude Code 插件的只读订阅形成对照）。

## 证据与局限

**原文给出的实证/具体物**：可复制的安装命令（三条）、`/setup-matt-pocock-skills` 的三个交互问题、技能清单与逐条职责描述、一个共享语言的 before/after 文本对照、一个具体仓库中术语表文件的链接（`course-video-manager` 的 `CONTEXT.md`，作者注明该 commit 早于改名，现在叫 `GLOSSARY.md`）、以及 `skills.sh` 徽章链接。仓库热度指标（stars 274500、stars_today 955）来自本次输入的元数据，原文中未交叉验证，不作为判断依据。

**只是作者主张、无数据支撑**：技能「小、易改、可组合、跨模型」；共享语言能减少啰嗦、统一命名、让代码库更好导航、让 agent 少花 token；红-绿-重构「结果代码好得多」；`grill-with-docs` 可能是「这个仓库里最酷的技术」；`improve-codebase-architecture` 在新代码库上能修泥球。这些都来自 README 的自我描述，没有基准、对照或测量。

**适用条件与风险**：需要支持 skills 的编码 agent；两条安装路线**只能选一条**，都装会让每个技能重复出现；插件路线是只读的（你不改，作者改）；`npx skills` 路线写进仓库的文件不会自动更新，要手动 `npx skills update`；`/setup-matt-pocock-skills` 只针对工程类技能，且必须在使用其他工程技能前、每个仓库跑一次；所有技能都假定你在做**真实的软件工程**（有 issue tracker、有测试、有类型系统），纯 vibe coding 场景收益不明。

**最重要的局限**：材料只有 README，没有附上任何一个 `SKILL.md` 的实际内容。因此上面所有流程描述都来自 README 的**摘要级说明**，具体提示词、步骤细节、以及 `/tdd` 会「给 agent 什么指导」都无从核对。要真正照做，需要打开对应 `SKILL.md` 阅读。

## 怎么试、怎么验证

**最小试用（建议一次只在一个已有仓库上做）**

1. 选一条安装路线。建议先走路线 B（`npx skills@latest add mattpocock/skills`），因为它把文件写进你的仓库、可编辑可 `git diff` 回退，比插件路线更容易评估和撤销；安装器里确保勾上 `setup-matt-pocock-skills`。
2. 跑一次 `/setup-matt-pocock-skills`，把 tracker、triage 标签、文档目录配好。
3. 只挑两条最高频入口先跑两周：改动前 `/grill-with-docs`，写代码时 `/tdd`。不要一上来把所有技能都用一遍。
4. 稳定后再加入 `/to-spec` → `/to-tickets` → `/implement` → `/code-review` 这条链。
5. 每隔几天跑一次 `/improve-codebase-architecture`，每次会话结束跑一次 `/retro`。

**注意**：原文**没有给出任何效果度量指标**。下面这套指标是为了回答本项目的第 5 个问题而自建的，需要你在试用前先记一份基线（同一仓库、相似任务、不用技能时的表现），否则无法判断改善。

| 想验证的点 | 可观测指标 | 怎么采 |
|---|---|---|
| 对齐是否改善 | 一次改动前「做错方向」导致的返工次数；`/grill-me`/`/grill-with-docs` 的往返轮次 | 两周内每次改动记一行，和基线周对比 |
| 啰嗦是否减少 | 同一类任务下 agent 输出的字数/token；代码里是否真用了 `GLOSSARY.md` 里的术语命名 | 建 `GLOSSARY.md` 前后各跑同类任务 |
| 代码质量反馈 | `/tdd` 里红→绿循环的次数；`/code-review` 在 Standards 轴和 Spec 轴各打回的问题数 | 直接从会话里数 |
| 架构是否被照看 | `/improve-codebase-architecture` 报出的候选深模块数，以及你实际采纳数 | 每几天跑一次记录 |
| 环境是否在自我改进 | `/retro` 提出的改进项数量与最终落实比例 | 每次会话后记录 |

**判停条件**：如果两周后「返工次数」和「被 `/code-review` 打回的问题数」都没有下降，说明技能里的纪律没有真正执行到位（常见原因是 `/setup-matt-pocock-skills` 没配或 `GLOSSARY.md` 建了但没人维护），此时应先修这两点而不是继续加技能。
