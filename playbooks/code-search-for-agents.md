# 让编码 agent 在陌生仓库里先定位再动手

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这份手册解决：当你知道要理解什么行为、但不知道代码在哪时，如何让编码 agent 用一次语义检索拿到可用的文件位置与源码片段，并用 A/B 方式验证它是否降低定位成本而不牺牲任务成功率。
> 先试这一步：选一个真实但敏感度可控的仓库，先跑 `jg files <root>` 看清检索可能读取哪些文件、外发范围是否可接受；确认后再安装 CLI 与 skill 做小范围 A/B。
> 最近修订：2026-10-02

## 解决什么问题
编码 agent 在每个不熟悉的任务上都要花一部分时间找对文件。当你知道要理解什么行为、但不知道代码在哪（例如：认证检查在哪、数据库连接怎么建/池化/关闭、哪个测试覆盖超时重试），直接读文件或用 `rg` 往往是试错式探索。jevgrep（命令 `jg`）把这类定位工作变成一次语义检索：输出相关的文件路径、阅读线索和逐字源码片段（stdout 一次性返回），让 agent 有个起点去实现和测试改动。检索与证据收集交给 jg，实现与测试仍由调用它的编码 agent 做；输出是给 agent 用的证据，不是生成的答案，也不保证找全所有相关文件。

## 适用与不适用
适用：跨不熟悉文件的问题；你知道要理解什么行为但不知道它在哪里。Python、TypeScript/JavaScript、Go、Rust 支持声明解析，其他文本走 fallback。

不适用或应避免：
- 已经知道精确符号或路径时，直接读文件或用 `rg` 就够了；jevgrep 最有价值的是“跨不熟悉文件”的问题。
- 不允许把源码发往外部 provider 的仓库。检索会把符合条件的源码内容通过认证时选择的 provider 发给 Jev。
- Windows 环境：README 提的是 macOS 或 Linux，未提 Windows 支持。
- 没有可用 provider key 的团队：环境变量凭证不被支持，必须先跑 `jg auth`。

## 前置条件
- Node.js 22+；macOS 或 Linux（未提 Windows 支持）。
- 下列之一的 key：Vercel AI Gateway、TypeSafe、OpenRouter、OpenCode Zen，或自定义的 TypeSafe 兼容 endpoint。使用 `jg` 不需要另外装 Python、Bun 或 ripgrep。
- 选一个你愿意发送给 provider 的搜索根。默认文件系统过滤会尊重 ignore 文件并排除隐藏、依赖/构建、二进制和明显的凭证文件，但 README 明确这些过滤不保证所有敏感信息都已被移除。
- 凭证必须通过 `jg auth` 保存；搜索总是使用已保存的 provider；基于环境变量的凭证和 endpoint 覆盖不会被使用。
- `jg skill` 委托给 skills CLI，需要 npm/npx 和网络访问；skill 安装器本身不配置凭证。
- provider 选择功能需要 0.3.0 或更新版本；0.1.0 的 `jg skill` 只打印内置 skill 文本，那个版本要用 `npx skills`。

## 操作步骤
1. **前提检查。** 确认 Node.js 22+、macOS 或 Linux，并准备好所选 provider 的 key。选一个你愿意发送给 provider 的搜索根。预期：满足前置条件后才继续；不满足就不要把源码发出去。

2. **安装 CLI。**
```sh
npm install -g @dzhng/jevgrep
```
预期：全局安装 `jg` 命令。前提：Node.js 22+。

3. **认证。**
```sh
jg auth
```
预期：`jg auth` 会询问 provider，然后把 key 存进仅属主可读的配置文件。前提：你有对应 provider 的 key。
注意：重复运行 auth 会替换该配置；搜索总是使用已保存的 provider；基于环境变量的凭证和 endpoint 覆盖不会被使用，此前依赖环境变量的要重新跑 `jg auth`；没有 provider 的旧 key 仍按 Vercel key 处理。可以用 `jg doctor` 以合成输入检查配置。

4. **安装 agent skill（README 称 agent 场景下必需）。** 只装 CLI 不会让编码 agent 知道怎么用它，要在 agent 工作的项目里执行：
```sh
jg skill
```
预期：安装器会检测你的编码 agent（Claude Code、Codex、OpenCode 等）并询问安装位置。可选参数：`--global` 用户级安装，`--yes` 无人值守安装。skill 只负责说明安装、调用方式和返回上下文的含义，研究与实现决策留给调用它的 agent。
也可以直接跑上游安装器：
```sh
npx skills add dzhng/jevgrep --skill jevgrep
```
做法 A / 做法 B 怎么选：做法 A 用 `jg skill`，适合已经装了 CLI、想让安装器检测并询问安装位置；做法 B 用 `npx skills add ...`，适合不想经过 `jg skill` 委托，或处在 0.1.0 版本（该版本的 `jg skill` 只打印内置 skill 文本）。两者都不配置凭证，认证仍需第 3 步。

5. **（建议先做）确认搜索会读到哪些文件。** 这条命令不需要 provider key、不发网络请求，按顶层目录分组统计某个根下检索可能读取的文件数，接受与检索相同的过滤参数：
```sh
jg files [root]
```
预期：看清它可能读取哪些文件，确认外发范围可以接受。这是决定是否继续试的关键一步。

6. **提问检索。** 用“描述行为”而不是“报文件名”的方式提问：
```sh
jg "Where is authentication checked before a request reaches a handler?" .
jg "How are database connections created, pooled, and closed?" ./src
jg "Which tests cover retry behavior when a request times out?" .
```
前提：选一个你愿意发送给 provider 的搜索根。预期：输出顺序为摘要和紧凑文件列表 → 带行号引用的选中源码 → 声明与调用位置的细节。把这些证据交给编码 agent 作为起点，由 agent 实现与测试。

7. **按次排除路径。** 传入相对根的 gitignore 模式：
```sh
jg --exclude '**/*.test.ts' --exclude 'src/generated/' "..." .
```
预期：收窄检索范围，减少不相关文件或敏感文件被读取。

8. **升级 CLI 与 skill（两件事分开做）。** 目前没有 `jg upgrade`：
```sh
npm install -g @dzhng/jevgrep@latest
jg --version
```
预期：升级 npm 包不会覆盖你项目里的 skill 文件，要单独重跑 `jg skill` 更新 skill。缓存控制、搜索覆盖项和不完整结果行为见 `jg --help`。

9. **判断什么时候不要用它。** README 明确：已经知道精确符号或路径时，直接读文件或用 `rg` 就够了；jevgrep 最有价值的是“跨不熟悉文件”的问题。所以把第 6 步限定在“知道行为不知道位置”的问题上。

## 怎么判断变好了
可观察的指标：
- 任务成功率（README 的核心指标是 solved 题数）。
- 总成本：优先看含检索成本的总成本，而不是只看到 agent 的 Sol-only 成本。
- 定位所需的检索步数 / 首次命中正确文件前读了多少文件（这是 jg 声称改善的环节）。
- 需要人工指路的次数、agent 中途放弃或改方向的次数。

最小试用（半天内可完成）：
1. 选一个真实但敏感度可控的仓库（最好不是私密业务代码），先跑 `jg files <root>`，看清它可能读取哪些文件，确认外发范围可以接受。
2. 按第 2–4 步安装 CLI、`jg auth`、在项目内 `jg skill`（让 Claude Code / Codex / OpenCode 等能自动用上）。
3. 挑 5–10 个“知道要理解什么行为、但不知道代码在哪”的真实问题，写成自然语言，例如 `jg "Where is authentication checked before a request reaches a handler?" .`。
4. 对同一批任务做 A/B：A 组 agent 不装 skill，B 组装 skill，两组用同样的模型和同样的任务描述，各跑一遍。
5. 对定位明显变差的检索用 `--exclude` 收窄（如 `--exclude '**/*.test.ts' --exclude 'src/generated/'`），记录改动前后的差异。

试多久：最小试用半天内可完成。记录基线，并注意 README 的告诫：单次运行不足以说明等价或提速，你的样本也要多次运行、避免拿一次结果下结论。

## 常见坑
- **环境变量凭证不被采用。** 搜索始终使用 `jg auth` 保存的 provider；此前依赖环境变量的要重新跑 `jg auth`；没有 provider 的旧 key 仍按 Vercel key 处理。
- **只装 CLI 没装 skill。** agent 不知道该怎么用；要在 agent 工作的项目里执行 `jg skill`。
- **升级 npm 包不会覆盖项目里的 skill 文件。** 要单独重跑 `jg skill` 更新 skill。
- **版本坑。** provider 选择需要 0.3.0+；0.1.0 的 `jg skill` 只打印 skill 文本，那个版本要用 `npx skills`。
- **隐私。** 检索会把符合条件的源码内容通过认证时选择的 provider 发给 Jev；默认过滤不保证所有敏感信息都已被移除；要用你愿意发送的搜索根，可先用 `jg files` 核查。
- **平台限制。** Node.js 22+、macOS 或 Linux，未提 Windows 支持。
- **已知精确符号或路径时不要用它。** 直接读或 `rg`。
- **输出是证据而非答案。** 不保证找全所有相关文件；需要 agent 侧自己判断。
- **评测样本小。** 不要拿单次结果下结论。
- **没有 `jg upgrade`。** 升级 CLI 与 skill 要分两步。

## 证据与来源
本篇依据调研报告《dzhng/jevgrep》。

- 安装、认证、`jg skill`、`jg files`、提问检索、`--exclude`、升级步骤：来自该调研报告正文中 README 给出的可复制命令与说明。
- 成功率与成本数据：来自 README 的 self-report，未独立复核。十个调优过的 Python SWE-bench 任务、一个冻结的已安装包、仓库内的公开 skill 做对比：Jevgrep 与无 Jev 基线同样解决 8/10 题；Sol 成本从 $7.62 降到 $5.44，降幅 28.6%（四舍五入 ~30%），该口径包含失败尝试、不含 Jev 成本；0.4.3 的总成本重跑（含 Jev）总成本降低 25.8%，同样解决 8/10 题；0.5.0 评估保持 8/10 解决，原生 Jev 成本相比 0.4.3 那次下降约 59%，合并 Sol+Jev 成本高出 2–3%，作者接受为小折衷；另有独立的速度研究文件（`speed-2026-09-28.md`），衡量后续本地优化配合 Jev 原生 TypeSafe endpoint。
- 作者自己的限定与主张：这是单次运行观察，不构成统计等价，也不构成速度改善的证明；它衡量的是任务成功率和成本，不保证在每个仓库上都省钱；封面图的“~30% lower cost”是较旧的 Sol-only 口径，README 后面已修正为总成本 25.8%，并说明未来基准统计会包含 Jev；“Same intelligence”是营销式表述，实际含义只是这 10 题里两边都是 8/10。
- 适用条件与风险：评测只覆盖 10 个 Python SWE-bench 任务、一个冻结安装包和该仓库自带 skill，样本极小、单一语言、单次运行，不能外推到你的仓库和语言。隐私：检索会把符合条件的源码内容通过认证时选择的 provider 发给 Jev；默认文件系统过滤会尊重 ignore 文件并排除隐藏、依赖/构建、二进制和明显的凭证文件，但 README 明确这些过滤不保证所有敏感信息都已被移除。平台限制：Node.js 22+、macOS 或 Linux。凭证限制：搜索始终使用 `jg auth` 保存的 provider；环境变量凭证和 endpoint 覆盖不被使用。版本坑：provider 选择需要 0.3.0+；0.1.0 的 `jg skill` 只打印 skill 文本。输出是证据而非答案，也不保证找全所有相关文件。
- 可复现的方法学文件路径：README 公开了 `evals/results/relevance-threshold-2026-09-27.md`、`total-cost-2026-09-28.md`、`combined-cost-research-2026-09-28.md`、`speed-2026-09-28.md`，可据此复现或改造成自己的任务集对比。
- 哪些只是作者主张：把“在陌生代码库里定位实现位置”从 agent 的试错式探索变成一次语义检索、能减少定位步数，是调研报告/README 的定位与主张；可复现的只有上述方法学文件与对比口径。与已有清单的关系：调研提到 Claude Code（tool, adopt）是 jg skill 检测范围内的补充件，不替代 Claude Code；OpenCode（tool, watch）也在检测范围内；除此之外清单中没有与语义代码检索/上下文供给直接对应的条目。

## 依据的调研

- [dzhng/jevgrep](../research/radar/2026-10-01/31-dzhng-jevgrep.md)：值得一试，在编码智能体所在的仓库里装 jevgrep CLI 与配套 skill（npm install -g @dzhng/jevgrep → jg auth → jg skill），把"知道要理解什么行为但不知道代码在哪"这类定位工作交给 jg，已知精确符号或路径时仍用直接读/rg；理由是它给出了可复制的安装、认证、排除与调用步骤，并有单次 SWE-bench 对比数据（10 题中同样解决 8 题、成本下降约 25%–29%），但证据是单次运行且会把源码发往外部 provider，所以先小范围试。
