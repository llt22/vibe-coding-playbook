# dzhng/jevgrep

- 结论：**值得一试**。在编码智能体所在的仓库里装 jevgrep CLI 与配套 skill（npm install -g @dzhng/jevgrep → jg auth → jg skill），把"知道要理解什么行为但不知道代码在哪"这类定位工作交给 jg，已知精确符号或路径时仍用直接读/rg；理由是它给出了可复制的安装、认证、排除与调用步骤，并有单次 SWE-bench 对比数据（10 题中同样解决 8 题、成本下降约 25%–29%），但证据是单次运行且会把源码发往外部 provider，所以先小范围试。
- 原文：https://github.com/dzhng/jevgrep
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-09-30T18:23:34.106Z

## 是什么

jevgrep（命令名 `jg`）是一个给编码智能体用的代码库语义检索工具。它接收一个自然语言的"仓库问题"，输出相关的文件路径、阅读线索和逐字源码片段（stdout 一次性返回），让 agent 有个起点去实现和测试改动。

README 的定位是："Same intelligence. ~30% lower cost."——编码 agent 在每个不熟悉的任务上都要花一部分时间找文件，jg 把这部分变成一个入口。检索用 Jev 模型在文件夹、文件、声明层级判断相关性（README 称经 Vercel AI Gateway 的 Jev）。

基本调用形态：

```sh
npm install -g @dzhng/jevgrep
jg auth
jg skill
jg "How are telemetry events recorded and sent?" ./my-project
```

输出顺序为：摘要和紧凑文件列表 → 带行号引用的选中源码 → 声明与调用位置的细节。Python、TypeScript/JavaScript、Go、Rust 支持声明解析，其他文本走 fallback。README 明确：输出是给 agent 用的证据，不是生成的答案，也不保证找全所有相关文件。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提检查。** 需要 **Node.js 22+**、**macOS 或 Linux**（未提 Windows 支持），以及下列之一的 key：Vercel AI Gateway、TypeSafe、OpenRouter、OpenCode Zen，或自定义的 TypeSafe 兼容 endpoint。使用 `jg` 不需要另外装 Python、Bun 或 ripgrep。provider 选择功能需要 **0.3.0 或更新版本**。

2. **安装 CLI。**

```sh
npm install -g @dzhng/jevgrep
```

3. **认证。** `jg auth` 会询问 provider，然后把 key 存进仅属主可读的配置文件。前提：你有对应 provider 的 key。

```sh
jg auth
```

注意（原文明确）：重复运行 auth 会替换该配置；搜索总是使用已保存的 provider；**基于环境变量的凭证和 endpoint 覆盖不会被使用**，此前依赖环境变量的要重新跑 `jg auth`；没有 provider 的旧 key 仍按 Vercel key 处理。可以用 `jg doctor` 以合成输入检查配置。

4. **安装 agent skill（README 称 agent 场景下必需）。** 只装 CLI 不会让编码 agent 知道怎么用它，要在 agent 工作的项目里执行：

```sh
jg skill
```

安装器会检测你的编码 agent（Claude Code、Codex、OpenCode 等）并询问安装位置。可选参数：`--global` 用户级安装，`--yes` 无人值守安装。也可以不装 CLI、直接跑上游安装器：

```sh
npx skills add dzhng/jevgrep --skill jevgrep
```

前提：`jg skill` 委托给 skills CLI，需要 npm/npx 和网络访问。注意：skill 安装器本身**不配置凭证**，认证仍需你按第 3 步做；skill 只负责说明安装、调用方式和返回上下文的含义，研究与实现决策留给调用它的 agent。0.1.0 版本的 `jg skill` 只打印内置 skill 文本，那个版本要用 `npx skills`。

5. **（建议先做）确认搜索会读到哪些文件。** 这条命令不需要 provider key、不发网络请求，按顶层目录分组统计某个根下检索可能读取的文件数，接受与检索相同的过滤参数：

```sh
jg files [root]
```

6. **提问检索。** 用"描述行为"而不是"报文件名"的方式提问：

```sh
jg "Where is authentication checked before a request reaches a handler?" .
jg "How are database connections created, pooled, and closed?" ./src
jg "Which tests cover retry behavior when a request times out?" .
```

前提：选一个你愿意发送给 provider 的搜索根。

7. **按次排除路径。** 传入相对根的 gitignore 模式：

```sh
jg --exclude '**/*.test.ts' --exclude 'src/generated/' "..." .
```

8. **升级 CLI 与 skill（两件事分开做）。** 目前没有 `jg upgrade`：

```sh
npm install -g @dzhng/jevgrep@latest
jg --version
```

升级 npm 包**不会**覆盖你项目里的 skill 文件，要单独重跑 `jg skill` 更新 skill。缓存控制、搜索覆盖项和不完整结果行为见 `jg --help`。

9. **判断什么时候不要用它。** README 明确：已经知道精确符号或路径时，直接读文件或用 `rg` 就够了；jevgrep 最有价值的是"跨不熟悉文件"的问题。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现（AI 已能做但还没交给它的工作）：** 把"在陌生代码库里定位实现位置"这件事从 agent 的试错式探索变成一次语义检索。README 的描述是：编码 agent 在每个不熟悉任务上都要花时间找对文件，jg 给它们一个起点；它输出的文件位置、阅读线索、逐字片段可以直接进入 agent 的上下文。
- **任务匹配（什么工作适合什么模型/工具/协作方式）：** 适合"知道要理解什么行为、但不知道它在哪里"的问题（认证检查在哪、连接怎么建/池化/关闭、哪个测试覆盖超时重试）。不适合已知精确符号或路径的场景（用直接读或 `rg`）。声明解析对 Python、TypeScript/JavaScript、Go、Rust 有专门支持，其他文本走 fallback。协作分工上，检索与证据收集交给 jg，实现与测试仍由调用它的编码 agent 做。
- **条件供给（需要提供哪些信息、工具、权限和反馈）：** 需要 Node 22+、macOS/Linux、所选 provider 的 key、以及把 skill 安装进 agent（`jg skill`，否则 agent 不知道该怎么用）。需要指定一个愿意外发的搜索根，并可用 ignore 文件、默认过滤、`--exclude` 控制范围，用 `jg files` 事先核查。凭证必须通过 `jg auth` 保存，环境变量方式不被采用。
- **主动推进（时间/事件/状态触发）：** 原文没有提供定时、事件或状态触发的持续运行机制。它是按需调用的一次性检索；`jg skill` 的作用是让被检测到的编码 agent 在需要时知道可以调用它。评估答案默认缓存在本地。
- **效果验证（怎样判断确实改善了结果）：** README 给出了可照做的验证方法：在任务集上对比"用 jg"与"不用 jg"的任务成功率和成本，并公开了结果与方法学文件路径（`evals/results/relevance-threshold-2026-09-27.md`、`total-cost-2026-09-28.md`、`combined-cost-research-2026-09-28.md`、`speed-2026-09-28.md`），可据此复现或改造成自己的任务集对比。

## 与已有做法的关系（对照给出的清单条目；没有就写"清单中没有相关条目"）

- **Claude Code（tool，adopt）：** jg 的 skill 安装器明确会检测 Claude Code 等编码 agent 并询问安装位置，属于在现有 agent 上叠加一层"代码库定位/上下文检索"能力的补充件，不替代 Claude Code 本身。
- **OpenCode（tool，watch）：** 同样在 `jg skill` 的检测范围内。
- 清单中除此之外没有与"语义代码检索 / 上下文供给"直接对应的条目，因此本线索在清单中是新增的能力补位，而不是对已有条目的替换或变体。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**给出的数据（来自 README 的 self-report，未独立复核）：**

- 十个调优过的 Python SWE-bench 任务、一个冻结的已安装包、仓库内的公开 skill 做对比：Jevgrep 与无 Jev 基线**同样解决 8/10 题**。
- **Sol 成本从 $7.62 降到 $5.44**，降幅 **28.6%**（四舍五入 ~30%），**该口径包含失败尝试、不含 Jev 成本**。
- 0.4.3 的总成本重跑（**含 Jev**）：总成本降低 **25.8%**，同样解决 8/10 题。
- 0.5.0 评估：保持 8/10 解决，原生 Jev 成本相比 0.4.3 那次下降约 **59%**；合并 Sol+Jev 成本高出 2–3%，作者接受为小折衷。
- 另有独立的速度研究文件（`speed-2026-09-28.md`），衡量后续本地优化配合 Jev 原生 TypeSafe endpoint。

**作者自己的限定与主张：**

- README 明确写了：这是**单次运行观察**，**不构成统计等价，也不构成速度改善的证明**；它衡量的是任务成功率和成本，"不保证在每个仓库上都省钱"。
- 封面图的"~30% lower cost"是较旧的 Sol-only 口径，README 后面已修正为总成本 25.8%，并说明未来基准统计会包含 Jev。
- "Same intelligence"是营销式表述，实际含义只是这 10 题里两边都是 8/10。

**适用条件与风险：**

- 评测只覆盖 **10 个 Python SWE-bench 任务**、一个冻结安装包和该仓库自带 skill，样本极小、单一语言、单次运行，不能外推到你的仓库和语言。
- **隐私：** 检索会把符合条件的源码内容通过认证时选择的 provider 发给 Jev。默认文件系统过滤会尊重 ignore 文件并排除隐藏、依赖/构建、二进制和明显的凭证文件，但 README 明确"这些过滤不保证所有敏感信息都已被移除"，要用你愿意发送的搜索根。
- **平台限制：** Node.js 22+、macOS 或 Linux。
- **凭证限制：** 搜索始终使用 `jg auth` 保存的 provider；环境变量凭证和 endpoint 覆盖不被使用。
- **版本坑：** provider 选择需要 0.3.0+；0.1.0 的 `jg skill` 只打印 skill 文本。
- 输出是证据而非答案，也不保证找全所有相关文件；需要 agent 侧自己判断。

## 怎么试、怎么验证

**最小试用（半天内可完成）：**

1. 选一个**真实但敏感度可控**的仓库（最好不是私密业务代码），先跑 `jg files <root>`，看清它可能读取哪些文件，确认外发范围可以接受。
2. 按第 2–4 步安装 CLI、`jg auth`、在项目内 `jg skill`（让 Claude Code / Codex / OpenCode 等能自动用上）。
3. 挑 5–10 个"知道要理解什么行为、但不知道代码在哪"的真实问题，写成自然语言，例如 `jg "Where is authentication checked before a request reaches a handler?" .`。
4. 对同一批任务做 A/B：A 组 agent 不装 skill，B 组装 skill，两组用同样的模型和同样的任务描述，各跑一遍。
5. 对定位明显变差的检索用 `--exclude` 收窄（如 `--exclude '**/*.test.ts' --exclude 'src/generated/'`），记录改动前后的差异。

**判断有没有改善的指标（直接对应 README 的评测口径）：**

- **任务成功率**（README 的核心指标是 solved 题数：8/10 vs 8/10）。
- **总成本**：优先看含检索成本的总成本，而不是只看到 agent 的 Sol-only 成本——README 自己就从 Sol-only 的 28.6% 修正为含 Jev 的 25.8%。
- **定位所需的检索步数 / 首次命中正确文件前读了多少文件**（这是 jg 声称改善的环节）。
- **需要人工指路的次数**、agent 中途放弃或改方向的次数。
- 记录基线，并注意 README 的告诫：单次运行不足以说明等价或提速，你的样本也要多次运行、避免拿一次结果下结论。

**不适用或应避免的场景：** 已经知道精确符号或路径时（直接读或 `rg`）；不允许把源码发往外部 provider 的仓库；Windows 环境；没有可用 provider key 的团队（因为环境变量凭证不被支持，必须先跑 `jg auth`）。
