# 让 agent 做可测量的优化：先立基线，再要复测证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎样把性能优化交给 agent，并用可重复测量、正确性判据和复测证据防止它把波动当收益。
> 先试这一步：先挑一个能重复测量的窄任务，手工跑基线并记下波动，再只让 agent 跑一次诊断或一轮审计，用复测结果决定要不要继续。
> 最近修订：2026-11-09

## 解决什么问题

一旦某件事能被测量，agent 就能把它爬下来。这篇手册把这句话落成五套可照做的循环。做法 A：在一个协作频道里开多条线程，每条线程只盯一个可测量的窄目标；agent 找瓶颈、建 benchmark、提 PR、盯部署、读线上数据并锁低 ratchet；人只负责定目标、做取舍、批准每一次改动。做法 B：在单个可重复启动的训练 / 推理 job 上，先让 agent 把目标、约束和正确性判据写成契约，再走一次或多次「测量—定位—验证」闭环。做法 C：拿一条 “research first” 提示词，让 agent 对一个可运行的应用做采样剖析，先交付火焰图和源码热力图，把“慢在哪”看清楚，再自己补上优化验证。做法 D：给编码 agent 挂上 Chrome DevTools MCP，在目标网站目录里让 agent 跑 Lighthouse 审计、定位并修复慢速问题，再用同样配置重跑一次 Lighthouse，用新旧分数对比证明改善。做法 E：拿一个可反复使用的解析 / 清洗函数规格，让 agent 分别写 C 与 Rust 的 SQLite 扩展，实测每行耗时和产物体积，再针对瓶颈让 agent 重写，并用跨实现模糊测试保证语义一致。五套做法的共同前提是：可重复的测量、只能变好的基准、明确的正确性判据、以及语义一致；目标是拿到真实收益，同时防止收益回退。

## 适用与不适用

通用（五套做法都要满足）：

- 可量化、能重复测量、能在受控环境复现、有 CI gate 或正确性检查的优化任务。
- 可以异步跑数小时甚至过夜的窄目标（做法 C、做法 D、做法 E 例外，做法 C 是一次性交付分析产物，做法 D 是单轮审计—修复—复测闭环，做法 E 是一次跨实现对比实验加复测）。

做法 A（产品级、多线程）适用：

- 有真实用量数据，能把埋点口径统一到可直接比较的旅程上。
- 有成熟的监控 / CI / feature flag 基础设施，能开 PR、能进 CI、能盯部署。

做法 B（单 job、领域 harness）适用：

- 单个 PyTorch 训练或推理 job。
- 该 job 有一条可重复执行的启动命令（例如通过 Slurm 提交的 job）。
- 能访问空闲 GPU，且你能为它给出正确性判据。

做法 C（单应用采样剖析）适用：

- 有一个能装、能跑的应用（原文是 PyPI 上的 `web-edit`，且处于未修改状态）。
- 环境里确实是 Python 3.15，可用内置的 `profiling.sampling`。
- 有一个能在终端和文件系统里干活的 coding agent（原文用 Codex 里的 GPT-6 Astra Extra High）。
- 目标只是先“看清楚慢在哪”、拿到可视化产物，还没有现成的 ratchet 或 CI gate。

做法 D（单站 Lighthouse 复测）适用：

- 网页 / 前端性能优化场景。
- 目标页面能在本机 Chrome 中打开，有可运行的本地环境或线上站点。
- 已安装 Claude Code，且有可用的 Node / npx 环境。
- 目标只是先跑一轮“审计→修复→复测”的闭环，不要求 CI 或持续巡检（原文未涉及主动推进）。

做法 E（跨语言小工具对比）适用：

- 有一个反复使用的数据清洗 / 解析函数，例如把 `-$1,234.56`、`12.5%` 这类字符串转成可求和、可排序的数值。
- 能先固定函数规格：去掉 `,`、`$`、`£`、`%`，处理前导 `-`，无法解析时返回 `NULL`。
- 本机有 C 编译器和 Rust 工具链，能编译 SQLite 可加载扩展（原文使用 Rusqlite、sqlite-loadable-rs）。
- 愿意自己补基准脚本：原文未给出，需要构造测试表、循环调用函数、计时、扣除空跑基线。
- 目标是小范围比较 C / Rust 的每行耗时、代码复杂度和产物体积，而不是产品级多线程冲刺。

不适用或不能整包照搬：

- 跑起来不稳、或与用户延迟不相关的 benchmark 不要用，否则 agent 会爬错坡。
- 用户可感知的体验取舍、收益是否值得复杂度，仍要人来裁决。
- 做法 A 原文依赖内部 beta 工具（Claude Tag beta，内部研究模型，大致相当于 Opus 5.5）和成熟的监控 / CI / flag 基建，不能整包照搬。
- 做法 B 对应的插件目前只有 v0.1.0，Roadmap 三项（NVIDIA Nsight Systems skills、与用户意图进一步对齐、按需递归委派给 kernel 优化 agent）全部未完成，加速数据全部来自作者主张、缺少第三方复现；非 PyTorch、无 GPU、或启动过程不可重复的任务不适用。属于「小范围试用」，不宜直接 adopt。
- 做法 C 原文只有一条提示词，没有给出剖析命令、配置、耗时或成本，具体怎么调用剖析器要靠 agent 自己调研，读者无法照抄命令；原文只做到“找出热点”，没有展示据此优化后效果变好的验证；被测应用是作者自己的 demo，结论（行尾符保留是热点）不能外推到你的代码。
- 做法 D 原文最关键的提示词被链接卡片截断，没有给出，第 3 步无法照抄，只能自拟并迭代。
- 做法 D 原文未说明 MCP 具体暴露哪些工具、Lighthouse 在什么环境下跑（本地有头 Chrome 还是 headless）、是否支持 CI。
- 做法 D 命令里用 `@latest`，行为可能随版本变化，可复现性打折扣。
- 做法 D 只有一条推文，没有配套文档，属于二手转述而非官方教程；“能修复慢速问题”“能用新分数证明效果”都只是主张，没有真实站点的旧分数、新分数、改动清单或耗时数据。
- 做法 E 在没有明确函数规格、无法定义“语义一致”时不要做；没有 C / Rust 编译环境或无法加载 SQLite 扩展时不要做。
- 做法 E 原文没有附完整代码、基准脚本、编译命令、SQLite 版本和硬件信息；只做了一次实验，属于个案；模型版本为 Opus 5.5，换模型后提示词效果可能变化；“C 最终最快”只在作者给定的数据分布和实现下成立，不能直接外推到其他解析规则或数据形态。
- 做法 E 原文没有涉及由时间、事件或状态触发并持续运行的机制，只描述一次性的对话式实验；不要把它当成自动巡检。

## 前置条件

五套做法共同需要：

- 一个 coding agent（能读代码仓库、跑 benchmark、开 PR），如 Claude Code 或 Codex。
- 每次优化有一个具名的人类 owner，用于 taste 裁决与方向决策。
- 权限：能开 PR、能进 CI、能盯部署；任何用户可见改动必须走 feature flag 和人类批准。

做法 A 额外需要：

- 一个协作频道（原文用 Slack）和一个能读监控、仓库、CI 的 agent。
- 数据源接入：原文用了 Datadog MCP server，以及可自定义的埋点与线上字段上报。
- benchmark 基础设施：Valgrind + `node --predictable`（指令计数）、V8 precise coverage（函数调用计数）、React commit 计数、layout/style-recalc 计数、DOM mutation 计数，以及每日自动下压的 ratchet job。
- 测试与 guardrail 基建：jsdom 生成静态标记、跨 14 个视口的对拍、按键穿透测试、0.1px 位移上报。
- 实验 rig：headless Chrome + DevTools begin-frame control（进阶用）。

做法 B 额外需要：

- 手上有要优化的代码仓库。
- 有一条能启动该训练 / 推理 job 的命令。
- 能访问空闲的 GPU 环境。
- 在要优化的仓库目录下启动 Claude Code 或 Codex。
- 运行 `init` 之前，在 Claude Code 里开启 **Auto mode**，或在 Codex 里开启 **Approve for me**，以减少 agent 被打断。

做法 C 额外需要：

- 被测应用的名称与来源（如 PyPI 上的 `web-edit`），且能在本机安装并跑起来。
- Python 3.15 环境，否则内置的 `profiling.sampling` 不可用。
- 允许 agent 自行查资料和试跑——“research first” 隐含这一点。
- 一个明确的产物要求：火焰图 + 源码热力图。

做法 D 额外需要：

- 本机已安装 Claude Code，且有可用的 Node / npx 环境。
- 已经拿到目标网站的代码，并在本地能跑起来 / 能访问到页面。
- 在目标网站的文件夹中打开 Claude Code。
- 一段说清任务的提示词（原文缺失，是这条线索最大的信息缺口，需要自己补写并迭代）。
- 对目标站点的访问能力（本地目录 + 能在 Chrome 中打开的 URL）。

做法 E 额外需要：

- 先写清函数规格：输入是什么、要剥掉哪些字符、负号怎么处理、解析失败返回什么。
- 本机有 C 编译器和 Rust 工具链，能编译 Rusqlite、sqlite-loadable-rs 等 SQLite 扩展。
- 能加载并调用 SQLite 自定义函数的测试环境。
- 200 万行规模的数据，或按比例缩小的等价数据；数据要分三类：混合数据（整数、小数、带符号、带百分号混在一起）、仅整数、仅小数。
- 基准脚本：原文未给出，需要自己构造测试表、循环调用函数、计时并扣除空跑基线。
- 跨实现一致性校验的数据生成方法：随机生成含货币符号、千分位、百分号、负号、非法输入的字符串。
- 支持长对话和代码生成的模型（原文为 Claude Opus 5.5 的普通聊天）。

## 操作步骤

五套做法都从同一个动作开始：先把测量做稳。做法 B 的具体做法是——先手工跑 2–3 次基线，确认任务耗时波动范围，再把同一个启动命令交给 agent；做法 A 则是先让 agent 用真实用量数据锁定少数旅程、把埋点口径统一，再立基线；做法 E 则是先把函数规格和对比维度固定，否则两版实现没有共同基准。不要跳过这一步，否则 agent 会把波动当成收益。

做法 C 是这套顺序里最靠前的一段：先要产物、再核对采样范围、最后才谈优化。

做法 D 同样要求先固定跑分口径：固定模式（移动端或桌面端）、固定跑 3 次取中位数，记下 Performance 分数和 LCP / TBT / CLS，再看 agent 的改动。

### 做法 A：协作频道里的多线程爬坡（产品级性能）

**1. 建频道 + 固定指令（standing instructions）**

在协作频道里给 agent 一份固定职责说明。原文照录如下，可作为模板：

```
@Claude Your job is to facilitate all things related to the performance of the claude.ai website and desktop app. Your responsibilities include monitoring deploys for performance regressions, assessing the accuracy and comprehensiveness of existing telemetry, maintaining well-curated observability dashboards, proactively implementing solutions for observed issues and low-hanging fruit, proposing performance project opportunities, and communicating with your human teammates. […]

The ultimate goal for this channel is for you to become as autonomous as possible, but today we know that isn’t yet possible.
```

前提：一个协作频道、一个能读监控 / 仓库 / CI 的 agent、数据源接入。预期：agent 承担盯部署回归、评估遥测准确性、维护可观测看板、主动修复明显问题、提性能项目机会、与人类沟通。

**2. 用真实用量数据锁定少数旅程，再把埋点口径统一**

让 agent 通过 Datadog MCP 分析用量数据，找出影响最大的四个旅程：启动 app、开新对话、加载已有对话、发送消息。web + 桌面 + 各产品组合起来共 13 个测量口径。

加埋点直到它们可直接比较：都从一次用户交互开始、结果渲染后结束，并区分客户端与服务端的工作。

**3. 先立基线，再列项目清单并估毫秒收益，汇总成冲刺目标**

约 20 个人工挑选的项目，每个针对一个具体旅程；让 agent 逐个估毫秒影响，汇总为两周目标。原文：第 3 天就达成 13 个目标中的 12 个。

**4. 建立线程循环**

原文明确给出六步：

1. 有人针对某段慢的旅程开线程，通常附截图或录屏；
2. agent 追流程，找到或新建一个能复现问题的 benchmark；
3. 实验室有结果后，agent 提 PR——常常是多个，按风险和评审粒度拆分，任何用户可见的东西放在 flag 后面；
4. ship 后 agent 盯部署、读线上数据；
5. 有改善就把该 benchmark 的 ratchet 锁低；没有就关掉 flag 再迭代；
6. 接着去找同一旅程里的下一个慢点。

**5. 让每个 benchmark 兼任两件事：实验室里可推动的指标 + CI 里只能下降的 ratchet**

判断标准：跑起来不稳、或与用户延迟不相关的 benchmark 直接丢掉，不能让 agent 爬错坡。要求它自证相关性，原文提示词：

```
@Claude please prove that hill climbing against each of these can result in measurable wall clock perf wins. we’ll unship the benches for any candidates that cannot prove that
```

**6. 用确定性计数替代噪声大的 wall-clock**

做法 A1：确定性计数

- 纯 JS 热路径：在 Valgrind 下用 `node --predictable` 跑 benchmark，与 checked-in baseline 比较——一次运行，不需要统计。
- 浏览器路径没有 Chromium 下的指令计数，但有别的确定性计数阶梯：每次交互的 React commits、V8 precise coverage 的函数调用计数、layout 和 style-recalc 计数、DOM mutation 计数。

原文对话给出的具体选项：

```
Yes. For pure-JS hot paths, literal instruction counts: run the benchmark under Valgrind with node --predictable and compare to a checked-in baseline — one run, no statistics needed.
For browser paths there’s no instruction counting under Chromium, but there’s a ladder of other deterministic counts: React commits per interaction, function call counts from V8’s precise coverage, layout and style-recalc counts, DOM mutations. Which do you want first?
```

落地方式：Valgrind + Ir + `node --predictable` 单开一条线程；浏览器 / React 类 bench 各自新开线程。每条 ratchet 配一个 daily job，计数下降就自动把上限继续压低；任何提高这些路径指令计数的 PR 直接 CI 失败。

做法 A2：帧预算（进阶）

让 agent 在 headless Chrome 里用 DevTools begin-frame control 做确定性 120Hz 帧步进（240 个 begin-frame 正好 240 帧，每帧 8.33ms），把「这一帧是否装得进 120Hz 预算」从噪声读数变成精确读数；再把 120Hz rig 变成 nightly job，持续盯回归。

怎么选：纯 JS 热路径选 A1；浏览器渲染 / 流式路径先用 A1 里的确定性计数，需要最细粒度时再上 A2。

**7. 原清单做完后，让 agent 重扫机会面**

原文提示词：

```
@Claude we’ve ended up funding nearly every project in the original projects list and more. let’s do a refresh […] what have we not explored, what can we hill climb on, where is the most opportunity at this point? […] i am open to WACKY ideas
```

**8. 横向扩展：线程不关，继续跑**

单个线程能产出 50 乃至 100 个优化 PR；越来越多新线程是 agent 自己开的（来自独立调查或 nightly job）。高峰期一天落地 200+ 改动，约 1/3 的 PR 附带新的遥测或 guardrail；冲刺期间同时跑 150+ 条线程。

**9. 上线前先把安全机制立好**

三件套：每个 PR 走自动评审 + 至少一个人类批准；先写单元测试，再做优化；任何可能造成用户可见问题的改动都放在短生命周期 feature flag 后面。

flag 堆积后另开一条线程协调放量和清理，agent 把每个 flag 分类为 kill switch 或 ramp，一旦安全就退役（两周引入近 200 个 flag，结束时过半已清理）。

**10. 为脆弱的优化定制 guardrail**

以静态 composer 为例：静态标记由真实 React 组件在 jsdom 中渲染生成，测试保证二者不漂移；集成测试跨 14 个视口尺寸比对静态页与 React 渲染，断言 1px 内对齐；按键测试直接穿过交接过程，任何丢键或乱序即失败；线上每次交接上报到 0.1 像素的位移，任何非零位移自动开线程。

**11. 高风险改动做增量放量**

先员工，再 1% 用户，再全量。

**12. Steering（人工职责，三部分）**

- Ambition：agent 默认保守，会把发现票据化、对可行性含糊、给估算留余量，需要明确鼓励它更大胆。原文示例：

```
if you put it up right now I will get it merged and deployed. we have the power to do anything. please be braver
```

目标达成后还要逐线程提醒：“Let’s keep driving this down, the targets are not the stopping point. What’s next? Be ambitious.”

- Taste：每条线程有具名的人类 owner，agent 把所有用户可感知的改动配上 before/after 截图或录屏交给他们裁决（表格逐格填入还是等整行完成？骨架屏立刻出现还是半秒后？流式文字的逐字淡入是否值五分之一帧预算？）。

- Direction：每条线程刻意保持很窄，只围绕一个 benchmark 或一个旅程，要求 agent 只在该范围内找改进。多数决策是排序和用户影响：优先哪些界面、如何合并互相踩脚的线程、何时关掉收益递减的线程。原文提到一个 900 行的 PR 得到一行回复：“going to gavel that 2ms per send is not worth the complexity of maintaining this build plugin.”

### 做法 B：单 job 的领域 harness 闭环（以 PyTorch 训练 / 推理为例）

`who-ate-my-flops` 给的就是这套闭环：agent 先问清目标与约束、把它们写成契约，再基于 profiling 分析和正确性检查做「测量—定位—验证」。它的工作面是「单次训练或推理 job」，不是一整个产品的多条线程。

**0. 选任务并手工摸清基线波动**

挑一个当前有明显性能痛点、且能用一条命令重复启动的 PyTorch 训练或推理 job；在空闲 GPU 上先手工跑 2–3 次，记下耗时波动范围。后面 agent 报出的加速比必须超出这个范围才算数。

**1. 安装插件（三选一）**

方式 A，直接让 agent 装，对 Claude Code 或 Codex 说：

```text
Install the who-ate-my-flops plugin from
https://github.com/OpenPerfAgent/who-ate-my-flops
for this client. Follow the installation instructions in its README.
```

方式 B，Claude Code 手动安装，在 Claude Code 中运行：

```text
/plugin marketplace add OpenPerfAgent/who-ate-my-flops
/plugin install who-ate-my-flops@openperfagent
```

方式 C，Codex 手动安装，在终端运行：

```bash
codex plugin marketplace add OpenPerfAgent/who-ate-my-flops
codex plugin add who-ate-my-flops@openperfagent
```

**2. 建立工作负载与契约（init）**

把启动命令和 GPU 环境告诉 agent。agent 会询问你的优化目标、约束和正确性要求，并把这些记录到 `contract.md`。

| Claude Code | Codex |
|---|---|
| `/who-ate-my-flops:init` | `$who-ate-my-flops:init` |

前提：已在仓库目录下启动客户端、已开 Auto mode / Approve for me。预期结果：生成 `contract.md`。先自己读一遍，确认它真的反映了你的意图——这一步本身就是对「agent 能否澄清意图」的验证；如果它没问出你一开始没说出口的约束，先补进契约再往下走。

**3. 诊断或优化（二选一）**

- `diagnose`：做一次调查，并给出一个经过测量的修复。
- `optimize`：让 agent 连续推进多个改进。

| | Claude Code | Codex |
|---|---|---|
| Diagnose | `/who-ate-my-flops:diagnose` | `$who-ate-my-flops:diagnose` |
| Optimize | `/who-ate-my-flops:optimize` | `$who-ate-my-flops:optimize` |

第一次只跑 `diagnose`。`optimize` 会连续推进多个改动，等你确认过单次闭环可靠之后再开。

**4. 等待并审查结果**

等 agent 跑完后，先看 `latest-report.md`。所有报告和实验记录都在 `workspace-who-ate-my-flops/` 目录下：

```text
workspace-who-ate-my-flops/
├── latest-report.md   # Results, correctness checks, and reproduction commands
├── benchmark.csv      # Baseline and optimization measurements
├── contract.md        # Agreed goals and constraints
├── records/           # Process records and planning notes
├── tools/             # Helper scripts
├── runs/              # Run outputs
└── commits/           # Profiling traces and diagnoses by commit
```

**5. 独立验证（这步不能省）**

- 用 `benchmark.csv` 对比基线与优化后的测量值，看加速比是否 > 1 且超出你自己测的基线波动范围；
- 用 `latest-report.md` 中的 correctness checks 确认改动没有破坏正确性；
- 用 `latest-report.md` 中的 reproduction commands 自己重跑一次；
- 用 `commits/` 里每次提交对应的 profiling trace 和诊断回溯「为什么这么改」。

预期结果：四项都过，这次优化才算成立；任何一项不过，按下面的止损条件处理。

### 做法 C：单应用采样剖析——先要火焰图和源码热力图，再谈优化

原文是 “Research” 类短文，可照抄的只有一条提示词和几个结果数字；没有给出运行剖析的命令、配置或完整流程。所以这条路定位在“测量 + 定位”阶段，优化验证要自己补。

**1. 准备被测应用**

原文用的是 PyPI 上的 `web-edit` 应用，且强调是在**未修改**（unmodified）状态下被剖析的。前提：该应用能在本机安装并跑起来。

**2. 准备 Python 3.15 环境**

原文使用 Python 3.15 内置的 `profiling.sampling`（原文陈述）。前提：环境里确实是 Python 3.15，否则内置剖析器不可用。

**3. 把提示词原样交给 agent，只替换应用名和来源**

在 Codex 中选 GPT-6 Astra Extra High（原文如此），把下面这条提示词原样交给它：

```
I need a Python 3.15 flame graph and heatmap demo of the "web-edit" app from PyPI - research first then make me those demos
```

关键在 “research first”：要求 agent 先自行调研 Python 3.15 新剖析器的用法，再动手做 demo。原文没有给出调研命令，也就是说这一步的产出要靠 agent 自己查出来。

**4. 明确要两种产物**

火焰图 + 源码热力图（原文链接了示例火焰图和热力图；报告中没有这两个产物的内容）。预期结果：两个可读产物都拿到，只拿到其中一个不算完成。

**5. 核对是否采样了全部线程（这步不能省）**

原文指出：95.1% 的采样栈来自 AnyIO 的 worker 线程，只看主线程的剖析会漏掉这部分。拿到图之后要确认剖析器是把所有线程都采了；漏了就说明结果不可信。

**6. 读结果、定位热点**

原文在 web-edit 的繁忙编辑负载下发现：

- `preserve_endings` 出现在 15,296 个已记录 CPU 栈中的 64.8%；
- `SequenceMatcher.find_longest_match` 贡献了 38.3% 的 leaf 样本。

即热点是“混合行尾符的保留”逻辑，而非编辑本身。要求热点指向可解释的代码路径（具体函数），否则这张图对下一步没有用。

**7. 自己补上验证（原文没有做这一步）**

改掉热点代码后，用同一编辑负载对比耗时或 CPU 占用是否下降。原文没有展示这一步，所以做法 C 本身不构成“收益已成立”的证据；可以把它接到做法 B 的闭环里，用 `benchmark.csv` / correctness checks / reproduction commands 来验证。

**8. 把调研出来的调用方式记下来**

把 agent 自己调研出来的 Python 3.15 剖析调用方式（命令、参数）记成可复用材料——这是原文没给、但手册最需要的那种东西。

### 做法 D：单站 Lighthouse 闭环——审计、修复、用新分数复测

原文给出的是一条推文入口：一条 MCP 安装命令 + 一段操作提示（提示词正文在采集文本中被截断，只剩 GitHub 链接卡片）。它属于“给已有编码智能体加装一个能力外设”的用法，而不是新工具。

**1. 安装 Chrome DevTools MCP**

前提：本机已安装 Claude Code，且有可用的 Node / npx 环境。安装 Chrome DevTools MCP（用户级作用域，对所有项目生效）：

```
claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest
```

预期结果：MCP 挂载成功，Claude Code 能调用 Chrome DevTools 能力。注意命令用 `@latest`，行为可能随版本变化。

**2. 在目标网站的文件夹中打开 Claude Code**

前提：已经拿到目标网站的代码，并在本地能跑起来 / 能访问到页面。原文表述：“在您网站的文件夹中打开 Claude Code”。

**3. 自拟提示词，让 agent 在 Chrome 中打开站点并做 Lighthouse 审计**

⚠️ 原文此处的提示词正文被链接卡片截断，**没有给出**。调研报告建议至少包含这些要素，自己补写并迭代：

- 目标 URL；
- 审计范围（只做性能还是含可访问性 / 最佳实践）；
- 跑 Lighthouse 的配置（移动端 / 桌面端）；
- 约束（不改动对外行为、不改业务逻辑）；
- 要求改完必须用同样配置重跑一次，并给出新旧分数对照。

预期结果：agent 先列出问题清单和拟改动，而不是直接改代码。

**4. 让 agent 根据审计结果定位并修复拖慢加载的问题**

原文表述：“修复慢速问题”。前提：提示词已说清约束和范围。预期结果：得到可解释的改动清单。

**5. 让 agent 重新跑一次 Lighthouse，用新分数对比旧分数**

原文表述：“然后用新分数证明效果”——这是整条线索中唯一明确的验证闭环。要求用与第 3 步完全相同的配置重跑，输出新旧分数对照表与改动清单。

**6. 人工复核改动，确认没有功能回归**

核对：功能是否正常、视觉是否回归、其他页面分数是否劣化。预期结果：有量化改善且无回归，才认为这一轮成立。

### 做法 E：跨语言小工具对比——先固定函数规格，再让 agent 写两版、复测、模糊测试

原文是一次实验记录：用 Claude（Opus 5.5）写一个 SQLite 自定义函数 `parse_number()`，把 `-$1,234.56`、`12.5%` 这类字符串转成可求和、可排序的数值；同一个行为分别用 C 和 Rust（Rusqlite、sqlite-loadable-rs）实现，比较每行耗时、代码复杂度和生成的扩展体积。第一轮 Rust 更快，作者再让 Claude 手写 C 解析函数追赶，最终优化后的 C 实现最快（16–19 ns/行）。原文原样给出了三段提示词，但没有给完整代码、基准脚本、编译命令、SQLite 版本和硬件信息。

**1. 先固定函数规格**

原文给出的规格是：去掉 `,`、`$`、`£`、`%`，处理前导 `-`，无法解析时返回 `NULL`。前提：你要先能用自己的话把输入、输出、边界条件写清楚，否则后续对比没有共同基准。

**2. 第一条提示词：让模型同时给出 C 与 Rust 两版方案并做对比**

前提：使用支持长对话和代码生成的模型（原文为 Claude Opus 5.5 的普通聊天）。

```text
I'm thinking about a SQLite custom function 'parse_number(value)' that strips ',', '$', '£' and '%', handles a leading '-', and returns 'NULL' for anything it can’t parse 

 Explore the difference between building this as a SQLite extension in C v.s. in Rust - I want to compare performance and code complexity and size of the resulting .so (or whatever) file
```

**3. 编译扩展并做基准测试**

按两版代码各自编译成 SQLite 可加载扩展，在同样数据上跑 200 万行，记录每行净耗时；数据分三类分别看：混合数据（整数、小数、带符号、带百分号混在一起）、仅整数、仅小数。前提：本机有 C 编译器和 Rust 工具链，能编译 SQLite 扩展；基准脚本原文未给出，需要自己写（构造测试表、循环调用函数、计时、扣除空跑基线）。

**4. 根据第一轮结果追加提示词：让模型针对瓶颈重写**

原文第一轮发现 Rust 更快，作者把原因归结为 Rust 中对应 C `strtod` 的实现“快两倍”，于是发出第二条提示词。前提：你要能从基准结果里看出瓶颈在“解析数字”这一层，而不是在 SQLite 调用开销或数据构造上。

```text
Try writing your own C function for parsing text into a decimal number that catches up to or beats the Rust implementation
```

**5. 复测四版实现**

把第一版 C、新 C、Rusqlite 版、sqlite-loadable-rs 版放同一张表里横评，同时记录每行耗时和生成的 `.so` 体积。原文数字：C 14 KB，Rusqlite 321 KB，sqlite-loadable-rs 298 KB。

200 万行基准的每行净耗时（ns，越低越好；依次为第一版 C、新 C、Rusqlite、sqlite-loadable-rs）：

| 数据形态 | 第一版 C | 新 C | Rusqlite | sqlite-loadable-rs |
|---|---:|---:|---:|---:|
| 混合数据 | 67 | 19 | 46 | 41 |
| 仅整数 | 25 | 16 | 36 | 32 |
| 仅小数 | 106 | 18 | 55 | 47 |

**6. 做跨实现一致性校验（模糊测试）**

原文提到四种实现在 800 万次 fuzz 检查中结果一致。可照做的做法是：随机生成大量字符串（含货币符号、千分位、百分号、负号、非法输入），分别喂给四版实现，逐条比对返回值是否完全相同，包括 `NULL` 的情形。前提：先定义好“一致”的判定标准。

**7. （可选）第三条提示词：让模型把调查整理成仓库风格的研究报告**

前提：能访问 `simonw/research` 仓库，并按该仓库的目录结构归档。

```text
Clone simonw/research from GitHub and turn your above investigation into a research report as seen in that repository - you can give me a zip file to download that contains your new folder
```

**8. 记录可复用材料**

把函数规格、三段提示词、基准数据的分桶口径、`.so` 体积、fuzz 一致性判定标准，以及你自己确认过的编译和加载方式记下来。原文没有给出编译命令和基准脚本，所以这一步需要你实际跑通后再记录，不要假装有可照抄的命令。

### 怎么选做法 A / 做法 B / 做法 C / 做法 D / 做法 E

- 对象是产品级体验（web / 桌面 / 多个用户旅程），有多条可并行、彼此独立的窄目标，且有线上用量和成熟基建 → 做法 A。
- 对象是单个训练 / 推理 job，有一条可重复的启动命令和空闲 GPU，要的是「测量—定位—验证」闭环而不是多线程冲刺 → 做法 B。
- 对象是单个可运行的应用，你只想先“看清楚慢在哪”、拿到火焰图和源码热力图 → 做法 C。它的产物是定位，不是收益证据；拿到热点后要自己补验证。
- 对象是单个网站 / 前端页面，你想先跑一轮“Lighthouse 审计→修复→同配置复测”的闭环，且已有 Claude Code + Node/npx → 做法 D。它的产物是同一页面、同一配置下的新旧分数对照，比做法 C 多了一步复测；但原文没有给出提示词和真实案例，需要自己补写提示词并接受“可能只是跑通流程”。
- 对象是一个反复用的数据清洗 / 解析函数，你想比较 C 与 Rust 的每行耗时、代码复杂度和产物体积，并且能先固定函数规格、自己补基准脚本 → 做法 E。它的产物是四版实现的横评数据和 fuzz 一致性结论；原文只是个案，适合小范围试，不宜直接当成通用结论。
- 不确定收益是否真实、或第一次接触这类做法：先按做法 B 只跑一次 `diagnose` 试水，不要一上来跑 `optimize`，也不要照搬做法 A 的整套基建；做法 D 可以拿一个已知加载偏慢的页面小范围试；做法 E 可以拿一个自己手头反复用 SQL `replace()` 清洗数字的表格小范围试。
- 五者可以并存，且遵守同一条顺序：先有可重复的测量和正确性判据，再让 agent 爬坡；先把 ratchet 和判据立起来，再放开 agent 改代码；跨语言对比时先把函数规格和一致性判据立起来，再比较快慢。

## 怎么判断变好了

做法 A 的可观察指标（全部来自原文）：

- p75：fresh load 到可输入页面 3.1s → 0.55s；新建 Claude Code 会话 0.8s → 0.3s；加载 Claude Cowork 云会话 2.6s → 0.73s。
- 两周期内合并 3000 多次改动，没有一次客户可见事故或回滚。
- 第 3 天达成 13 个目标中的 12 个。
- 单条线程 50–100 个优化 PR；高峰期一天落地 200+ 改动；约 1/3 的 PR 附带新的遥测或 guardrail；冲刺期间同时跑 150+ 条线程。
- 两周引入近 200 个 flag，结束时过半已清理。
- ratchet 层面：daily job 在计数下降后自动把上限继续压低；任何提高这些路径指令计数的 PR 直接 CI 失败。
- 作者估计每天为用户节省数万小时的等待（这是估算，不是测量）。

做法 B 的可观察指标：

- 端到端耗时 / 吞吐相对基线的加速比（来自 `benchmark.csv`），要求 > 1 且超出你自己测的基线波动范围。
- `latest-report.md` 中的 correctness checks 是否全部通过。
- 按 reproduction commands 重跑，结果是否稳定复现（不可复现即不算改善）。
- 改动落在哪一层（配置 / Python 代码 / GPU kernel），是否可维护、可回滚（`commits/` 有记录）。
- 与人工做同样优化所花的时间做对比。
- 辅助指标：`contract.md` 是否覆盖了你的真实目标和约束，agent 的提问是否发现了你一开始没说出口的约束。

做法 C 的可观察指标：

- 是否真的产出了火焰图和源码热力图两种可读产物——这是原文设定的交付标准。
- 剖析是否覆盖全部线程。原文的教训是 95.1% 的栈来自 AnyIO worker 线程，先检查有没有漏采后台线程；漏了就说明结果不可信。
- 图里指出的热点是否指向可解释的代码路径（原文是 `preserve_endings` / `SequenceMatcher.find_longest_match` 这类具体函数）。
- 能否据此提出并验证一个优化：改掉热点代码后，同一编辑负载的耗时或 CPU 占用是否下降。注意原文没有做这一步，需要自己补。
- 是否把 agent 自己调研出来的 Python 3.15 剖析调用方式记了下来，作为可复用材料。

做法 D 的可观察指标（来自调研报告给出的验证建议）：

- 同一页面、同一配置下 Lighthouse Performance 分数的中位数变化；
- LCP / TBT / CLS 等核心指标的变化；
- 改动是否可解释、是否引入回归（功能、视觉、其他页面分数是否劣化）；
- 相比手工优化的时间成本（这条链路是否真的省时）。
- 判定标准建议：分数提升幅度需大于多次跑分的自然波动才算法效；如果波动大于提升，视为无效。只信“重跑后的分数”，不信智能体自称“已优化”。

做法 E 的可观察指标：

1. 每行耗时相对现有 SQL `replace()` 方案的倍数；
2. 按数据分布分桶看（混合、整数、小数），不能只看总体均值；
3. 跨实现 fuzz 结果差异数（应为 0，包括 `NULL` 行为）；
4. 产物体积与部署复杂度（14 KB 对 300 KB 量级）；
5. 代码维护成本（行数、涉及语言、团队能否接手）。

做法 E 的结论判定：只有在“解析语义完全一致 + 在目标数据形态上稳定快于现状”同时成立时，才算改善；如果只在某类数据上快，就只在对应查询场景使用，或回到原方案。原文给出的数据是：混合数据 67 / 19 / 46 / 41 ns/行，仅整数 25 / 16 / 36 / 32 ns/行，仅小数 106 / 18 / 55 / 47 ns/行（依次为第一版 C、新 C、Rusqlite、sqlite-loadable-rs）；扩展体积为 C 14 KB、Rusqlite 321 KB、sqlite-loadable-rs 298 KB；800 万次 fuzz 检查四版结果一致。但这些数字只来自原文的一次实验。

最小试用方式：

- 做法 A：先在一个旅程上小范围试（启动 app、开新对话、加载已有对话、发送消息里选一个），先立基线、统一埋点口径，再让 agent 按线程循环跑。
- 做法 B：只跑一次 `diagnose`，不要一上来跑 `optimize`。
- 做法 C：拿一个自己手头的小型 Python 3.15 应用，把提示词里的应用名和来源替换掉，交给 Codex 里的同类智能体，要求 “research first”，然后看它交付什么。
- 做法 D：选一个已知加载偏慢的页面（或一个能本地跑起来的前端小项目），先记录基线：固定模式（移动端或桌面端）、固定跑 3 次取中位数，记下 Performance 分数和 LCP / TBT / CLS；再执行安装命令、自拟提示词、跑一轮“审计→修复→同配置复测”，最后人工复核改动。
- 做法 E：从自己工作里挑一个反复用 SQL `replace()` 清洗数字的表格，按步骤 2 的提示词让模型生成 C 与 Rust 两版 `parse_number()` 扩展，跑 10 万–200 万行基准，分别记录每行耗时、生成的 `.so` 体积和代码规模；再用几百到几万条随机字符串做跨实现一致性比对。

试多久：

- 做法 A：原文是一次两周冲刺；先按两周跑，每日看 ratchet 是否只降不升，以及有没有出现客户可见事故或回滚。
- 做法 B：一次 `diagnose` 结束、按复现命令自己重跑一次即可判断，不需要按两周评估。
- 做法 C：一次交付即可初判——拿到两种产物、核对线程覆盖、热点可解释，就说明这条路可用；要判断收益，还需自己补上优化后的对比。
- 做法 D：调研报告给的最小试用约半天。一次闭环即可初判；要判断真实收益，需看分数提升是否大于跑分自然波动。
- 做法 E：一次跨实现对比实验加一轮 fuzz 一致性校验即可初判；要判断是否值得长期维护，还要看代码维护成本和你自己的数据形态。

## 常见坑

- 不要整包照搬做法 A：它依赖内部 beta 工具（Claude Tag beta）和成熟的监控 / CI / flag 基建。
- 做法 B 也不要直接 adopt：版本只有 v0.1.0、Roadmap 三项全部未完成、社区采用度低；README 里的 3.6× 是「up to」的上界，没有给出每个项目的具体数字、基线定义、硬件配置和测量方法，也无法核实「合入上游仓库」与「插件产出」之间的因果关系。
- 不要在没摸清基线波动之前就让 agent 动手：它会把波动当成收益。
- benchmark 跑起来不稳、或与用户延迟不相关，直接丢掉；要求 agent 自证相关性（见做法 A 步骤 5 的提示词）。
- wall-clock 噪声大，不要拿它当唯一 ratchet；改用确定性计数。
- agent 默认保守：会把发现票据化、对可行性含糊、给估算留余量；需要明确鼓励更大胆（“please be braver”）。目标达成后还要逐线程提醒：“Let’s keep driving this down, the targets are not the stopping point. What’s next? Be ambitious.”
- flag 会堆积：需要另开一条线程协调放量和清理，把每个 flag 分类为 kill switch 或 ramp，一旦安全就退役。
- 收益递减和复杂度成本要人判断：原文里一个 900 行的 PR 得到一行回复：“going to gavel that 2ms per send is not worth the complexity of maintaining this build plugin.”
- 用户可感知的细节（表格逐格填入还是等整行完成？骨架屏立刻出现还是半秒后？流式文字逐字淡入是否值五分之一帧预算？）必须由具名人类 owner 裁决，不要让 agent 自己决定。
- 做法 B 的止损条件：加速比接近 1、correctness checks 失败、或结果无法用复现命令稳定重现，就说明该任务当前不适配这个插件，不要继续投入；此时降级为「了解其测量—定位—验证闭环思路」即可。
- 做法 C 只做到找热点，原文没有展示据此优化后效果变好的验证；“找出热点”不等于“收益成立”。
- 做法 C 拿到图后先看线程覆盖：原文里 95.1% 的采样栈来自 AnyIO worker 线程，只看主线程会漏掉这部分，结论会失真。
- 做法 C 的热点结论只适用于被测应用（作者自己的 demo），不能外推到你的代码。
- 做法 C 原文没有给出剖析命令、配置、耗时或成本；不要假装有可照抄的命令，调用方式要自己确认后再记录、复用。
- 做法 D 的提示词原文缺失：第 3 步无法照抄，必须自己补写并迭代；不要假装有一条可复制的原文提示词。
- 做法 D 只有一条推文，没有真实站点的旧分数、新分数、改动清单或耗时数据；“能修复慢速问题”“能用新分数证明效果”都只是主张，不是已验证的效果。
- 做法 D 命令里 `@latest` 可能随版本变化，先确认 MCP 挂载成功再继续。
- 做法 D 的分数提升幅度必须大于多次跑分的自然波动才算法效；波动大于提升就视为无效。只信“同配置重跑后的分数”，不信智能体自称“已优化”。
- 做法 D 原文未说明 Lighthouse 跑在有头还是 headless、是否支持 CI；不要假设它能直接接进 CI。
- 做法 E 不要以为有可照抄的编译命令或基准脚本：原文没有附完整代码、基准脚本、编译命令、SQLite 版本和硬件信息；这些要自己补，并在补完后记录成可复用材料。
- 做法 E 只做了一次实验，属于个案；模型版本为 Opus 5.5，换模型后提示词效果可能变化；“C 最终最快”只在作者给定的数据分布和实现下成立，不能直接外推到其他解析规则或数据形态。
- 做法 E 里“Rust 中对应 C `strtod` 的实现快两倍”只是作者解释，文中没有给出独立验证；代码复杂度也只是定性描述，没有代码行数等量化。
- 做法 E 的跨实现一致性校验不能省：要逐条比对返回值是否完全相同，包括 `NULL` 的情形；只比较“能跑”不算语义一致。
- 做法 E 如果只在某类数据上快，就只在对应查询场景使用，或回到原方案；不要用一个总体均值掩盖分桶差异。
- 做法 E 原文没有涉及由时间、事件或状态触发并持续运行的机制；不要把它包装成自动巡检或持续优化系统。

## 证据与来源

- 做法 A 全部来自调研《How we made claude.ai 3x faster in two weeks》：Anthropic 团队在 2026 年 8 月的两周冲刺里，把 claude.ai 和 Claude 桌面端的核心体验提速约 3 倍，整个过程跑在一个 Slack 频道里，每个线程里都有 Claude（Claude Tag beta）参与。
- 做法 A 的数据：p75 fresh load 3.1s → 0.55s、新建 Claude Code 会话 0.8s → 0.3s、加载 Claude Cowork 云会话 2.6s → 0.73s；合并 3000 多次改动、无客户可见事故或回滚；第 3 天达成 13 个目标中的 12 个；单线程 50–100 个 PR；高峰一天 200+ 改动；约 1/3 PR 附带新遥测或 guardrail；150+ 条线程；近 200 个 flag 且结束时过半清理。
- 做法 A 属于作者主张而非测量的：「一旦某件事能被测量，Claude 就能把它爬下来」；「测量从过去的第零步变成了爬坡的第一步」；「每天为用户节省数万小时」是作者估计。
- 做法 A 步骤里给出的提示词、measurement 选项、guardrail 设计（jsdom 静态标记、14 视口对拍、按键穿透、0.1px 位移上报）均为原文照录或原文描述的做法。
- 做法 B 来自调研《OpenPerfAgent/who-ate-my-flops》，其依据是该仓库 README（source_note 标注「依据仓库 README」，blog 正文不在材料内）：安装命令、`init` / `diagnose` / `optimize` 三种入口、产物结构（`contract.md` / `benchmark.csv` / `latest-report.md` / `records/` / `tools/` / `runs/` / `commits/`）、适用条件（单个 PyTorch job、可重复启动命令、空闲 GPU、正确性判据）都来自 README。
- 做法 B 中属于作者主张的：README 声称「用该插件开发的优化已合入 FunASR、FastVideo、gsplat、Ultralytics、Unsloth、SGLang，在测试工作负载上测得最高 3.6× 加速」；3.6× 是 up-to 上界，没有具体数字、基线定义、硬件配置和测量方法，也没有第三方复现报告（仓库 34 stars，社区采用度低）。
- 做法 B 里的「最小试用方式」与止损条件（先手工跑 2–3 次基线、先只跑 `diagnose`、不可复现即不算改善、加速比接近 1 就停）来自调研报告给出的试用建议，不是插件 README 的原始说明。
- 做法 C 来自调研《Profiling web-edit with Python 3.15: flame graphs and source heatmaps》，其依据是 Simon Willison 的一篇 “Research” 类短文：一条提示词、Codex 中的 GPT-6 Astra Extra High、Python 3.15 内置 `profiling.sampling`、PyPI 上的 `web-edit` 应用。
- 做法 C 的数据：`preserve_endings` 出现在 15,296 个已记录 CPU 栈的 64.8% 中；`SequenceMatcher.find_longest_match` 占 38.3% 的 leaf 样本；95.1% 的采样栈来自 AnyIO 的 worker 线程。
- 做法 C 中无法独立验证的前提：“Python 3.15 内置 `profiling.sampling`”、“GPT-6 Astra Extra High”。属于可核对判断的：「采样所有线程是必需的，否则只看主线程会漏掉」——有 95.1% 的数字支撑。
- 做法 C 的局限：原文只有一条提示词，没有给出剖析命令、配置、耗时或成本，具体怎么调用剖析器需要 agent 自行调研，读者无法照抄命令；被测应用是作者自己的 demo，结论（行尾符保留是热点）只适用于该应用，不能外推；原文只做到“找出热点”，没有展示据此优化后效果变好的验证。
- 做法 D 来自调研《@RoundtableSpace: Claude Code 现在可以在您的网站上运行 Lighthouse 审计，修复慢速问题，然后用新分数证明效果》，其依据是一条推文：安装命令 `claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest`、官方仓库 `ChromeDevTools/chrome-devtools-mcp`（Google 官方维护）、以及“审计→修慢→用新分数证明”的闭环描述。
- 做法 D 中属于主张、没有证据的部分：“能修复慢速问题”“能用新分数证明效果”；原文没有给出任何一个真实站点的旧分数、新分数、改动清单或耗时数据；互动量（151 赞 / 14 转发 / 12 回复）只说明传播度，不是效果证据。
- 做法 D 的局限：原文提示词被截断，第 3 步无法照抄；未说明 MCP 具体暴露哪些工具、Lighthouse 在什么环境下跑、是否支持 CI；命令用 `@latest` 可复现性打折扣；只有一条推文，属于二手转述而非官方教程。
- 做法 D 的最小试用与判定标准（固定模式、跑 3 次取中位数、分数提升需大于自然波动、约半天）来自调研报告给出的试用建议，不是推文原文。
- 做法 E 来自调研《parse_number() as a SQLite extension: C vs Rust》，其依据是 Simon Willison 的一次实验记录：用 Claude（Opus 5.5）写 SQLite 自定义函数 `parse_number()`，分别用 C 和 Rust（Rusqlite、sqlite-loadable-rs）实现，比较每行耗时、代码复杂度和生成的扩展体积。
- 做法 E 的数据：扩展体积为 321 KB（Rusqlite）、298 KB（sqlite-loadable-rs）、14 KB（C）；200 万行基准的每行净耗时（ns，越低越好）：混合数据 67 / 19 / 46 / 41；仅整数 25 / 16 / 36 / 32；仅小数 106 / 18 / 55 / 47（依次为第一版 C、新 C、Rusqlite、sqlite-loadable-rs）；800 万次 fuzz 检查四版结果一致。
- 做法 E 中只是作者主张的部分：Rust 中对应 C `strtod` 的实现“快两倍”——这是解释第一轮为何 Rust 更快的说法，文中没有给出独立验证；代码复杂度也只是定性描述，没有代码行数等量化。
- 做法 E 的局限：没有附完整代码、基准脚本、编译命令、SQLite 版本和硬件信息；只做了一次实验，属于个案；模型版本为 Opus 5.5，换模型后提示词效果可能变化；“C 最终最快”只在作者给定的数据分布和实现下成立，不能直接外推到其他解析规则或数据形态。
- 做法 E 的结论来自调研报告：建议小范围试，把“让 AI 用两种语言实现同一个小工具、实测对比、再针对瓶颈让它重写”的流程，用在自己工作中需要反复做的数据清洗、解析函数上；理由是原文给出了可直接复用的三段提示词和实测数字，但没有附代码与基准脚本，需要自己补齐后才能照做。

## 依据的调研

- [How we made claude.ai 3x faster in two weeks](../research/radar/2026-10-02/394-how-we-made-claude-ai-3x-faster-in-two-weeks.md)：值得一试，把性能（或任何可量化的）优化做成「一个频道 + 多条线程 + 一个只能下降的基准 ratchet」的循环，人工只负责定目标、取舍和审批，可先在一个旅程上小范围试；理由是这样既能拿到真实收益，又能用 CI ratchet 防止收益回退，但原文依赖内部 beta 工具和成熟的监控/CI/flag 基础设施，不能整包照搬。
- [OpenPerfAgent/who-ate-my-flops](../research/radar/2026-10-02/772-openperfagent-who-ate-my-flops.md)：值得一试，在有可重复启动命令、能给出正确性判据的单个 PyTorch 训练/推理任务上小范围试用：安装插件后先跑 init 把优化目标、约束、正确性要求写进 contract.md，再用 diagnose 做一次「测量—定位—验证」，用 benchmark.csv 对比基线加速比。理由是 README 给出了完整可照做的安装命令与工作流闭环，但版本仅 v0.1.0、加速数据全部来自作者主张，尚未独立验证，所以不宜直接 adopt。
- [Profiling web-edit with Python 3.15: flame graphs and source heatmaps](../research/radar/2026-10-14/3089-profiling-web-edit-with-python-3-15-flame-graphs-a.md)：值得一试，可以照抄原文那条“先调研、再产出”的提示词，让编程智能体（Codex 中的 GPT-6 Astra Extra High）对 Python 3.15 应用做采样剖析并交付火焰图和源码热力图，同时务必确认剖析覆盖了全部线程；原文只给出这一条提示词和结果数字、没有给出具体命令与配置，所以先小范围试再决定是否写进手册。
- [@RoundtableSpace: Claude Code 现在可以在您的网站上运行 Lighthouse 审计，修复慢速问题，然后用新分数证明效果。](../research/radar/2026-10-18/4541-claude-code-lighthouse.md)：值得一试，可以先小范围试：用一条命令给 Claude Code 挂上 Google 官方的 Chrome DevTools MCP，然后在网站目录里让智能体走“跑 Lighthouse→定位并修复→重跑对比分数”的闭环；理由是该命令与官方仓库明确可照做、且验证方式（新旧分数对比）本身就是可量化的，但原文里的具体提示词被截断，需要自己补写并迭代。
- [parse_number() as a SQLite extension: C vs Rust](../research/radar/2026-11-09/11726-parse-number-as-a-sqlite-extension-c-vs-rust.md)：值得一试，建议小范围试：把“让 AI 用两种语言实现同一个小工具、实测对比、再针对瓶颈让它重写”的流程，用在自己工作中需要反复做的数据清洗、解析函数上；理由是原文给出了可直接复用的三段提示词和实测数字，但没有附代码与基准脚本，需要自己补齐后才能照做。
