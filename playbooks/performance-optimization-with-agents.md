# 让 agent 把性能问题爬下来：一个频道、多条线程、一个只能下降的基准

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎么把可量化的性能优化做成一个 agent 能持续爬坡、收益又不会回退的循环，而不是一次人肉攻坚。
> 先试这一步：先在一个旅程上建一个专用协作频道，把固定职责说明发给能读监控、仓库和 CI 的 agent 并接上数据源，看它能不能自证 benchmark 与用户延迟相关。
> 最近修订：2026-10-02

## 解决什么问题

一旦某件事能被测量，agent 就能把它爬下来。这篇手册讲的是怎么把这句话落成一个循环：在一个协作频道里开多条线程，每条线程只盯一个可测量的窄目标；agent 找瓶颈、建 benchmark、提 PR、盯部署、读线上数据并锁低 ratchet，人只负责定目标、做取舍、批准每一次改动。目标是拿到真实收益，同时用只能下降的基准防止收益回退。

## 适用与不适用

适用：

- 可量化、能重复测量、能在实验室复现、有 CI gate 的优化任务。
- 可以异步跑数小时甚至过夜的窄目标。
- 有真实用量数据，能把埋点口径统一到可直接比较的旅程上。

不适用或不能整包照搬：

- 原文依赖内部 beta 工具（Claude Tag beta，内部研究模型，大致相当于 Opus 5.5）和成熟的监控/CI/flag 基础设施。
- 跑起来不稳、或与用户延迟不相关的 benchmark 不要用，否则 agent 会爬错坡。
- 用户可感知的体验取舍、收益是否值得复杂度，仍要人来裁决。

## 前置条件

- 一个协作频道（原文用 Slack）和一个能读监控、仓库、CI 的 agent。
- 数据源接入：原文用了 Datadog MCP server，以及可自定义的埋点与线上字段上报。
- 代码与发布权限：能开 PR、能进 CI、能盯部署；用户可见改动必须走 feature flag 和人类批准。
- benchmark 基础设施：Valgrind + `node --predictable`（指令计数）、V8 precise coverage（函数调用计数）、React commit 计数、layout/style-recalc 计数、DOM mutation 计数，以及每日自动下压的 ratchet job。
- 测试与 guardrail 基建：jsdom 生成静态标记、跨 14 个视口的对拍、按键穿透测试、0.1px 位移上报。
- 逐线程的人类 owner，用于 taste 裁决与方向决策。
- 实验 rig：headless Chrome + DevTools begin-frame control（进阶用）。

## 操作步骤

### 1. 建频道 + 固定指令（standing instructions）

在协作频道里给 agent 一份固定职责说明。原文照录如下，可作为模板：

```
@Claude Your job is to facilitate all things related to the performance of the claude.ai website and desktop app. Your responsibilities include monitoring deploys for performance regressions, assessing the accuracy and comprehensiveness of existing telemetry, maintaining well-curated observability dashboards, proactively implementing solutions for observed issues and low-hanging fruit, proposing performance project opportunities, and communicating with your human teammates. […]

The ultimate goal for this channel is for you to become as autonomous as possible, but today we know that isn’t yet possible.
```

前提：一个协作频道、一个能读监控/仓库/CI 的 agent、数据源接入。预期：agent 承担盯部署回归、评估遥测准确性、维护可观测看板、主动修复明显问题、提性能项目机会、与人类沟通。

### 2. 用真实用量数据锁定少数旅程，再把埋点口径统一

让 agent 通过 Datadog MCP 分析用量数据，找出影响最大的四个旅程：启动 app、开新对话、加载已有对话、发送消息。web + 桌面 + 各产品组合起来共 13 个测量口径。

加埋点直到它们可直接比较：都从一次用户交互开始、结果渲染后结束，并区分客户端与服务端的工作。

### 3. 先立基线，再列项目清单并估毫秒收益，汇总成冲刺目标

约 20 个人工挑选的项目，每个针对一个具体旅程；让 agent 逐个估毫秒影响，汇总为两周目标。原文：第 3 天就达成 13 个目标中的 12 个。

### 4. 建立线程循环

原文明确给出六步：

1. 有人针对某段慢的旅程开线程，通常附截图或录屏；
2. agent 追流程，找到或新建一个能复现问题的 benchmark；
3. 实验室有结果后，agent 提 PR——常常是多个，按风险和评审粒度拆分，任何用户可见的东西放在 flag 后面；
4. ship 后 agent 盯部署、读线上数据；
5. 有改善就把该 benchmark 的 ratchet 锁低；没有就关掉 flag 再迭代；
6. 接着去找同一旅程里的下一个慢点。

### 5. 让每个 benchmark 兼任两件事：实验室里可推动的指标 + CI 里只能下降的 ratchet

判断标准：跑起来不稳、或与用户延迟不相关的 benchmark 直接丢掉，不能让 agent 爬错坡。要求它自证相关性，原文提示词：

```
@Claude please prove that hill climbing against each of these can result in measurable wall clock perf wins. we’ll unship the benches for any candidates that cannot prove that
```

### 6. 用确定性计数替代噪声大的 wall-clock

做法 A：确定性计数

- 纯 JS 热路径：在 Valgrind 下用 `node --predictable` 跑 benchmark，与 checked-in baseline 比较——一次运行，不需要统计。
- 浏览器路径没有 Chromium 下的指令计数，但有别的确定性计数阶梯：每次交互的 React commits、V8 precise coverage 的函数调用计数、layout 和 style-recalc 计数、DOM mutation 计数。

原文对话给出的具体选项：

```
Yes. For pure-JS hot paths, literal instruction counts: run the benchmark under Valgrind with node --predictable and compare to a checked-in baseline — one run, no statistics needed.
For browser paths there’s no instruction counting under Chromium, but there’s a ladder of other deterministic counts: React commits per interaction, function call counts from V8’s precise coverage, layout and style-recalc counts, DOM mutations. Which do you want first?
```

落地方式：Valgrind + Ir + `node --predictable` 单开一条线程；浏览器/React 类 bench 各自新开线程。每条 ratchet 配一个 daily job，计数下降就自动把上限继续压低；任何提高这些路径指令计数的 PR 直接 CI 失败。

做法 B：帧预算（进阶）

让 agent 在 headless Chrome 里用 DevTools begin-frame control 做确定性 120Hz 帧步进（240 个 begin-frame 正好 240 帧，每帧 8.33ms），把「这一帧是否装得进 120Hz 预算」从噪声读数变成精确读数；再把 120Hz rig 变成 nightly job，持续盯回归。

怎么选：纯 JS 热路径选做法 A；浏览器渲染/流式路径先用做法 A 里的确定性计数，需要最细粒度时再上做法 B。

### 7. 原清单做完后，让 agent 重扫机会面

原文提示词：

```
@Claude we’ve ended up funding nearly every project in the original projects list and more. let’s do a refresh […] what have we not explored, what can we hill climb on, where is the most opportunity at this point? […] i am open to WACKY ideas
```

### 8. 横向扩展：线程不关，继续跑

单个线程能产出 50 乃至 100 个优化 PR；越来越多新线程是 agent 自己开的（来自独立调查或 nightly job）。高峰期一天落地 200+ 改动，约 1/3 的 PR 附带新的遥测或 guardrail；冲刺期间同时跑 150+ 条线程。

### 9. 上线前先把安全机制立好

三件套：每个 PR 走自动评审 + 至少一个人类批准；先写单元测试，再做优化；任何可能造成用户可见问题的改动都放在短生命周期 feature flag 后面。

flag 堆积后另开一条线程协调放量和清理，agent 把每个 flag 分类为 kill switch 或 ramp，一旦安全就退役（两周引入近 200 个 flag，结束时过半已清理）。

### 10. 为脆弱的优化定制 guardrail

以静态 composer 为例：静态标记由真实 React 组件在 jsdom 中渲染生成，测试保证二者不漂移；集成测试跨 14 个视口尺寸比对静态页与 React 渲染，断言 1px 内对齐；按键测试直接穿过交接过程，任何丢键或乱序即失败；线上每次交接上报到 0.1 像素的位移，任何非零位移自动开线程。

### 11. 高风险改动做增量放量

先员工，再 1% 用户，再全量。

### 12. Steering（人工职责，三部分）

- Ambition：agent 默认保守，会把发现票据化、对可行性含糊、给估算留余量，需要明确鼓励它更大胆。原文示例：

```
if you put it up right now I will get it merged and deployed. we have the power to do anything. please be braver
```

目标达成后还要逐线程提醒：“Let’s keep driving this down, the targets are not the stopping point. What’s next? Be ambitious.”

- Taste：每条线程有具名的人类 owner，agent 把所有用户可感知的改动配上 before/after 截图或录屏交给他们裁决（表格逐格填入还是等整行完成？骨架屏立刻出现还是半秒后？流式文字的逐字淡入是否值五分之一帧预算？）。

- Direction：每条线程刻意保持很窄，只围绕一个 benchmark 或一个旅程，要求 agent 只在该范围内找改进。多数决策是排序和用户影响：优先哪些界面、如何合并互相踩脚的线程、何时关掉收益递减的线程。原文提到一个 900 行的 PR 得到一行回复：“going to gavel that 2ms per send is not worth the complexity of maintaining this build plugin.”

### 13. （进阶）用帧预算做最细粒度度量

让 agent 在 headless Chrome 里用 DevTools begin-frame control 做确定性 120Hz 帧步进（240 个 begin-frame 正好 240 帧，每帧 8.33ms），把「这一帧是否装得进 120Hz 预算」从噪声读数变成精确读数；再把 120Hz rig 变成 nightly job，持续盯回归。

## 怎么判断变好了

可观察指标（全部来自原文）：

- p75：fresh load 到可输入页面 3.1s → 0.55s；新建 Claude Code 会话 0.8s → 0.3s；加载 Claude Cowork 云会话 2.6s → 0.73s。
- 两周期内合并 3000 多次改动，没有一次客户可见事故或回滚。
- 第 3 天达成 13 个目标中的 12 个。
- 单条线程 50–100 个优化 PR；高峰期一天落地 200+ 改动；约 1/3 的 PR 附带新的遥测或 guardrail；冲刺期间同时跑 150+ 条线程。
- 两周引入近 200 个 flag，结束时过半已清理。
- ratchet 层面：daily job 在计数下降后自动把上限继续压低；任何提高这些路径指令计数的 PR 直接 CI 失败。
- 作者估计每天为用户节省数万小时的等待（这是估算，不是测量）。

最小试用方式：先在一个旅程上小范围试（启动 app、开新对话、加载已有对话、发送消息里选一个），先立基线、统一埋点口径，再让 agent 按线程循环跑。

试多久：原文是一次两周冲刺；先按两周跑，每日看 ratchet 是否只降不升，以及有没有出现客户可见事故或回滚。

## 常见坑

- 不要整包照搬原文：它依赖内部 beta 工具（Claude Tag beta）和成熟的监控/CI/flag 基建。
- benchmark 跑起来不稳、或与用户延迟不相关，直接丢掉；要求 agent 自证相关性（见步骤 5 的提示词）。
- wall-clock 噪声大，不要拿它当唯一 ratchet；改用确定性计数。
- agent 默认保守：会把发现票据化、对可行性含糊、给估算留余量；需要明确鼓励更大胆（“please be braver”）。目标达成后还要逐线程提醒：“Let’s keep driving this down, the targets are not the stopping point. What’s next? Be ambitious.”
- flag 会堆积：需要另开一条线程协调放量和清理，把每个 flag 分类为 kill switch 或 ramp，一旦安全就退役。
- 收益递减和复杂度成本要人判断：原文里一个 900 行的 PR 得到一行回复：“going to gavel that 2ms per send is not worth the complexity of maintaining this build plugin.”
- 用户可感知的细节（表格逐格填入还是等整行完成？骨架屏立刻出现还是半秒后？流式文字逐字淡入是否值五分之一帧预算？）必须由具名人类 owner 裁决，不要让 agent 自己决定。

## 证据与来源

- 做法全部来自调研《How we made claude.ai 3x faster in two weeks》：Anthropic 团队在 2026 年 8 月的两周冲刺里，把 claude.ai 和 Claude 桌面端的核心体验提速约 3 倍，整个过程跑在一个 Slack 频道里，每个线程里都有 Claude（Claude Tag beta）参与。
- 数据：p75 fresh load 3.1s → 0.55s、新建 Claude Code 会话 0.8s → 0.3s、加载 Claude Cowork 云会话 2.6s → 0.73s；合并 3000 多次改动、无客户可见事故或回滚；第 3 天达成 13 个目标中的 12 个；单线程 50–100 个 PR；高峰一天 200+ 改动；约 1/3 PR 附带新遥测或 guardrail；150+ 条线程；近 200 个 flag 且结束时过半清理。
- 属于作者主张而非测量的：核心经验「一旦某件事能被测量，Claude 就能把它爬下来」；「测量从过去的第零步变成了爬坡的第一步」；「每天为用户节省数万小时」是作者估计。
- 步骤里给出的提示词、measurement 选项、guardrail 设计（jsdom 静态标记、14 视口对拍、按键穿透、0.1px 位移上报）均为原文照录或原文描述的做法。

## 依据的调研

- [How we made claude.ai 3x faster in two weeks](../research/radar/2026-10-02/394-how-we-made-claude-ai-3x-faster-in-two-weeks.md)：值得一试，把性能（或任何可量化的）优化做成「一个频道 + 多条线程 + 一个只能下降的基准 ratchet」的循环，人工只负责定目标、取舍和审批，可先在一个旅程上小范围试；理由是这样既能拿到真实收益，又能用 CI ratchet 防止收益回退，但原文依赖内部 beta 工具和成熟的监控/CI/flag 基础设施，不能整包照搬。
