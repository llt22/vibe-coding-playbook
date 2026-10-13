# YeonwooSung/my-claude-code-mods

- 结论：**值得一试**。建议在 Claude Code 上小范围试装并验证，优先从单个 mod（如 loop-detective 或 context-inspector）入手，并用原文给出的四配置对照法测开销；理由是这份 README 给出了 6 个可安装的真实 mod、统一的安装路径（plugin@marketplace）和一套可照做的验证方法，但每个 mod 的具体安装与配置细节要进各自 README，且原文明确声明尚未给出多 mod 合并的性能结论。
- 原文：https://github.com/YeonwooSung/my-claude-code-mods
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T20:46:49.923Z

## 是什么

`YeonwooSung/my-claude-code-mods`（GitHub，486 stars）是一个 Claude Code 自定义 mod（插件）集合，包含 6 个 mod：

- **agent-profiler**：显示一次会话的时间去向（模型等待、工具调用、子代理、重复读取），并导出 OTLP trace 给 Jaeger/Tempo。
- **context-inspector**：分析 Claude 会话中的上下文浪费，包括窗口被什么占满、重复读取、近乎重复的输出、compaction 保留了哪些内容，并给出建议。
- **time-machine**：用 shadow-git 快照在分叉时间线上记录每一次工具调用，可以看到任意步骤时文件的原貌、定位哪次编辑弄坏了测试、恢复、分支、比较不同运行、重跑某一步。
- **loop-detective**：检测重复的 Bash 失败和 edit/retry 循环，附带证据、调查提示词、实时案例面板和有界历史。
- **pin-memo**：把备忘和可点击的 todo 固定在输入框上方，在同一文件夹/会话恢复时自动还原。
- **model-effort-band**：在提示框上方用彩色条显示当前选中的模型和观察到的主线程 effort。

仓库还给出开发/测试命令，以及一张验证目标与兼容版本对照表。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 安装并试用某个 mod（使用者路径）

1. **前提**：已安装 Claude Code，并具备使用官方 Mods 机制的环境。安装方式按官方文档使用 `plugin@marketplace`。
2. **第一步**：把本仓库这个 marketplace 添加一次。原文只给了机制描述（"Add this marketplace once"），未给出具体命令行，具体命令以官方 Mods 文档为准。
3. **第二步**：按目标 mod 自己的 README 安装该 mod（原文对 6 个 mod 各自都指向 `agent-profiler/README.md`、`context-inspector/README.md`、`time-machine/README.md`、`loop-detective/README.md`、`pin-memo/README.md`、`model-effort-band/README.md`）。
4. **注意**：官方文档入口为 `https://code.claude.com/docs/en/plugins/mods/overview` 与 `https://code.claude.com/docs/en/plugins/mods/create`。

### B. 本地开发 / 跑测试（开发者路径）

1. **前提**：Node 22.19.0 或更高；依赖已用 `package-lock.json` 锁定。
2. 安装依赖并运行核心测试（不需要安装 Claude Code、不需要账号）：

```sh
npm ci --ignore-scripts
npm test                  # core logic, no Claude Code installation/account required
CLAUDE_BIN=/path/to/claude npm run test:adapters  # full engine suites, including adapters
npm run typecheck         # requires engine-generated declarations in each .claude-plugin/types
```

3. **前提说明**：`npm test` 把核心测试里的 `claude-code/testing` import 映射到 Node 的 test runner 和 Jest 的 `expect`，**它不模拟引擎事件**；测试文件串行执行，以免已有的性能断言与其他测试进程争抢资源；CI 只跑这套独立核心测试。
4. **前提说明**：engine 的 type declarations 是本地生成、不入版本库的；要用与被测引擎对应的那份声明，生成/设置方式见各 mod 的开发说明。

### C. 对照测量 mod 开销（原文给出的实验方法）

1. 用一个**一次性的大型代表性仓库、固定在一个 commit**，并保持相同的 Claude 引擎/模型/权限设置。
2. 在四种配置下跑同一份工作负载：无 mod、仅 profiler、仅 Time Machine、以及三个 mod 全上。
3. 用 `--plugin-dir` 显式加载这些 mod，同时**禁用其他已安装插件**。
4. 在计时区间之外重置文件和 recorder 存储。
5. 每种配置做 warm-up，并至少做 5 次测量；交替运行顺序。
6. 记录：wall time、tool-call 数量、model tokens、snapshot 平均值；工作负载要包含"无改动的 mutating 调用"和"真实编辑"。
7. 报告 median/p95，并把模型延迟与 snapshot/hook 时间分开报告。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
原文给出了 6 类此前未必会想到交给 AI/编码智能体去做的"元工作"：会话时间去向剖析（profiler）、上下文浪费剖析（context-inspector）、工具调用时间线快照与回溯（time-machine）、失败/重试循环检测（loop-detective）、跨会话备忘与 todo 固定（pin-memo）、模型与 effort 可视化（model-effort-band）。这些是围绕"用 AI 工作"本身的测量与复盘能力。

**2. 任务匹配**
原文对每个 mod 都给了它对应的具体任务场景：定位时间花在哪、找出上下文被什么占满与重复读取、定位哪次编辑弄坏了测试并恢复/分支/比较运行、发现重复 Bash 失败与 edit/retry 循环、跨会话保持备忘与 todo、随时看到当前模型与 effort。可按这些场景一一对应选装。

**3. 条件供给**
原文列出的前提条件包括：Node 22.19.0 及以上（TypeScript transformation flag required）；依赖按 `package-lock.json` 锁定；`npm run typecheck` 需要每个 `.claude-plugin/types` 下由引擎生成的声明；用 `--plugin-dir` 显式加载 mod 并禁用其他插件；测试引擎侧需要 `CLAUDE_BIN` 指向 claude 可执行文件。兼容版本信息：原始三套 engine 测试套件、Pin Memo、Model Effort Band 在 Claude Code 2.1.292 验证过；Loop Detective 在 2.1.280 验证过（TypeScript 检查用本地 2.1.292 声明）。

**4. 主动推进**
原文支持三类触发：
- **事件触发**：loop-detective 检测重复 Bash 失败和 edit/retry 循环，并给出证据与调查提示词、实时案例面板与有界历史。
- **状态触发**：pin-memo 在同一 folder/session 被恢复时自动还原固定的备忘和 todo。
- **持续记录**：time-machine 持续记录每一次工具调用到分叉时间线上，可在任意步骤回看文件原貌。
- 对照实验方法本身要求 warm-up 后多次重复测量，属于流程化的持续推进方式。

**5. 效果验证**
原文给了两层验证依据：一是**兼容性验证矩阵**（哪些套件在哪个 Claude Code 版本验证过，以及 UI 只验证了 render trees 而未验证 live pixels）；二是**开销对照实验方法**（四配置、warm-up、至少 5 次、交替顺序、median/p95、模型延迟与 snapshot/hook 时间分离）。此外 context-inspector 本身就产出可用于判断的指标（窗口占用、重复读取、近重复输出、compaction 保留了什么），loop-detective 产出重复失败的证据。

## 与已有做法的关系

清单中已有：**Claude Code**（tool，adopt）、**Claude Code Mods**（tool，study）。本线索正是 "Claude Code Mods" 这一条目的一个具体实例集合，可作为把该条目从 study 推进为可试对象的候选材料。原文也直接指向官方的 Mods 概览与创建文档，说明它是建立在官方 mod 机制之上的第三方扩展，而非替代方案。

## 证据与局限

**原文给出的实际信息**
- 仓库元数据：486 stars（来自线索元数据）。
- 兼容性对照表：Node 核心测试需 Node 22.19.0 且需要 TypeScript transformation flag；原始三套 engine 测试套件、Pin Memo、Loop Detective、Model Effort Band 分别在 2.1.292 / 2.1.280 等版本验证；2.1.280 早期访问版下 profiler 可用，但 Context Inspector 缺少 `session.append`，Time Machine 的 per-test 选项会被忽略。
- 安装机制：使用 `plugin@marketplace`，按官方 Mods 文档操作。
- 开发/测试命令块（见上文，可原样复制）。

**只是作者主张、缺少数据支撑的部分**
- 6 个 mod 的功能描述都是一句话概括，原文没有给出功能实测数据、成功率或案例数字。
- 原文明确声明：**没有给出四配置的性能结果** —— "The existing 20k-span/item tests bound analysis cost but do not measure combined engine overhead; no four-mode performance result is claimed here." 即 20k span/item 的测试只界定了分析成本上限，并不测量引擎的综合开销。

**适用条件与未验证项**
- Node 22.19.0 及以上；对引擎版本敏感（不同 Claude Code 版本下行为不同）。
- 实时终端/桌面 UI 以及多 mod 同时运行：需要另做一次交互式集成运行，单元套件**不能**证明 UI 兼容性；Model Effort Band 的 live pixels 未验证。
- 本 README 只有概览：每个 mod 的具体安装命令与配置项要进各自的 README，本文无法给出。

## 怎么试、怎么验证

**最小试用方式**
1. 挑一个与当前痛点最直接对应的单个 mod，先装它一个（不要一次装全部）：例如反复出现同类失败就装 **loop-detective**；上下文经常被塞满、重复读取多就装 **context-inspector**。
2. 按官方 Mods 文档添加 marketplace，再按该 mod 的 README 安装。
3. 在一个真实任务上连续用一段时间（原文本身没有给建议时长，此处不编造），期间用 `--plugin-dir` 显式控制加载、禁用其他插件，保持引擎/模型/权限设置固定。
4. 若要看开销，照抄上文 C 节的四配置对照实验：固定 commit 的大型一次性仓库、warm-up + 至少 5 次测量、交替顺序、计时区间外重置文件与 recorder 存储。

**判断有没有改善的指标**
- 原文明确可测的指标：wall time、tool-call 数量、model tokens、snapshot 平均值，并按 median/p95 报告，且把模型延迟与 snapshot/hook 时间分开。
- 由 mod 自身产出的指标：context-inspector 的窗口占用构成、重复读取次数、近重复输出、compaction 保留内容；loop-detective 报告的重复 Bash 失败与 edit/retry 循环次数及证据；agent-profiler 的会话时间去向分布（模型等待 vs 工具 vs 子代理 vs 重复读取）。
- 判断基准：与"不装 mod"的同工作负载同设置运行对比；若装了多个 mod，必须按原文说明另做交互式集成运行，不能只用单元测试结果下结论。
- 反面判据：原文指出 20k-span/item 测试只能界定分析成本，不能证明合并引擎开销，所以不要拿单元测试通过当作性能可接受的证据。
