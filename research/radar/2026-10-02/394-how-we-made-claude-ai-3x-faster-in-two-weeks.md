# How we made claude.ai 3x faster in two weeks

- 结论：**值得一试**。把性能（或任何可量化的）优化做成「一个频道 + 多条线程 + 一个只能下降的基准 ratchet」的循环，人工只负责定目标、取舍和审批，可先在一个旅程上小范围试；理由是这样既能拿到真实收益，又能用 CI ratchet 防止收益回退，但原文依赖内部 beta 工具和成熟的监控/CI/flag 基础设施，不能整包照搬。
- 原文：https://claude.dev/blog/how-we-made-claude-ai-faster/
- 来源：rss:claude.dev，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T01:27:10.114Z

## 是什么

Anthropic 团队在 2026 年 8 月的两周冲刺里，把 claude.ai 和 Claude 桌面端的核心体验提速约 3 倍。整个过程跑在一个 Slack 频道里，每个线程里都有 Claude（Claude Tag beta，内部研究模型，大致相当于 Opus 5.5）参与：Claude 找瓶颈、建 benchmark、提 PR、盯部署、读线上数据；人负责设目标、做取舍、批准每一次改动。结果是合并了 3000 多次改动，没有一次客户可见事故或回滚。

原文给出的效果数据（p75）：fresh load 到可输入页面 3.1s → 0.55s；新建 Claude Code 会话 0.8s → 0.3s；加载 Claude Cowork 云会话 2.6s → 0.73s。作者估计每天为用户节省数万小时的等待。

作者自己总结的核心经验是：**一旦某件事能被测量，Claude 就能把它爬下来**，所以最高杠杆的动作是「找出更多可以测量的东西」——测量从过去的「第零步」变成了「爬坡的第一步」。

## 具体做法（编号步骤）

1. **建频道 + 固定指令（standing instructions）。** 原文照录如下，可作为模板：
```
@Claude Your job is to facilitate all things related to the performance of the claude.ai website and desktop app. Your responsibilities include monitoring deploys for performance regressions, assessing the accuracy and comprehensiveness of existing telemetry, maintaining well-curated observability dashboards, proactively implementing solutions for observed issues and low-hanging fruit, proposing performance project opportunities, and communicating with your human teammates. […]

The ultimate goal for this channel is for you to become as autonomous as possible, but today we know that isn’t yet possible.
```
前提：一个协作频道（这里是 Slack）、一个能读监控/仓库/CI 的 agent，以及数据源接入（他们用了 Datadog MCP server）。

2. **用真实用量数据锁定少数旅程，再把埋点口径统一。** 让 Claude 通过 Datadog MCP 分析用量数据，找出影响最大的四个旅程：启动 app、开新对话、加载已有对话、发送消息；web + 桌面 + 各产品组合起来共 13 个测量口径。加埋点直到它们可直接比较：都从一次用户交互开始、结果渲染后结束，并区分客户端与服务端的工作。

3. **先立基线，再列项目清单并估毫秒收益，汇总成冲刺目标。** 约 20 个人工挑选的项目，每个针对一个具体旅程；Claude 逐个估毫秒影响，汇总为两周目标。（原文：第 3 天就达成 13 个目标中的 12 个。）

4. **建立线程循环。** 原文明确给出六步：
   - 有人针对某段慢的旅程开线程，通常附截图或录屏；
   - Claude 追流程，找到或新建一个能复现问题的 benchmark；
   - 实验室有结果后，Claude 提 PR——常常是多个，按风险和评审粒度拆分，任何用户可见的东西放在 flag 后面；
   - ship 后 Claude 盯部署、读线上数据；
   - 有改善就把该 benchmark 的 ratchet 锁低；没有就关掉 flag 再迭代；
   - 接着去找同一旅程里的下一个慢点。

5. **让每个 benchmark 兼任两件事：实验室里可推动的指标 + CI 里只能下降的 ratchet。** 判断标准：跑起来不稳、或与用户延迟不相关的 benchmark 直接丢掉，不能让 Claude 爬错坡。要求它自证相关性，原文提示词：
```
@Claude please prove that hill climbing against each of these can result in measurable wall clock perf wins. we’ll unship the benches for any candidates that cannot prove that
```

6. **用确定性计数替代噪声大的 wall-clock。** 原文对话给出的具体选项：
```
Yes. For pure-JS hot paths, literal instruction counts: run the benchmark under Valgrind with node --predictable and compare to a checked-in baseline — one run, no statistics needed.
For browser paths there’s no instruction counting under Chromium, but there’s a ladder of other deterministic counts: React commits per interaction, function call counts from V8’s precise coverage, layout and style-recalc counts, DOM mutations. Which do you want first?
```
落地方式：Valgrind + Ir + `node --predictable` 单开一条线程；浏览器/React 类 bench 各自新开线程。每条 ratchet 配一个 daily job，计数下降就自动把上限继续压低；任何提高这些路径指令计数的 PR 直接 CI 失败。

7. **原清单做完后，让 Claude 重扫机会面。** 原文提示词：
```
@Claude we’ve ended up funding nearly every project in the original projects list and more. let’s do a refresh […] what have we not explored, what can we hill climb on, where is the most opportunity at this point? […] i am open to WACKY ideas
```

8. **横向扩展：线程不关，继续跑。** 单个线程能产出 50 乃至 100 个优化 PR；越来越多新线程是 Claude 自己开的（来自独立调查或 nightly job）。高峰期一天落地 200+ 改动，约 1/3 的 PR 附带新的遥测或 guardrail。冲刺期间同时跑 150+ 条线程。

9. **上线前先把安全机制立好。** 三件套：每个 PR 走自动评审 + 至少一个人类批准；先写单元测试，再做优化；任何可能造成用户可见问题的改动都放在短生命周期 feature flag 后面。flag 堆积后另开一条线程协调放量和清理，Claude 把每个 flag 分类为 kill switch 或 ramp，一旦安全就退役（两周引入近 200 个 flag，结束时过半已清理）。

10. **为脆弱的优化定制 guardrail**（以静态 composer 为例）：静态标记由真实 React 组件在 jsdom 中渲染生成，测试保证二者不漂移；集成测试跨 14 个视口尺寸比对静态页与 React 渲染，断言 1px 内对齐；按键测试直接穿过交接过程，任何丢键或乱序即失败；线上每次交接上报到 0.1 像素的位移，任何非零位移自动开线程。

11. **高风险改动做增量放量：** 先员工，再 1% 用户，再全量。

12. **Steering（人工职责，三部分）：**
    - *Ambition*：Claude 默认保守，会把发现票据化、对可行性含糊、给估算留余量，需要明确鼓励它更大胆。原文示例：
```
if you put it up right now I will get it merged and deployed. we have the power to do anything. please be braver
```
      目标达成后还要逐线程提醒：“Let’s keep driving this down, the targets are not the stopping point. What’s next? Be ambitious.”
    - *Taste*：每条线程有具名的人类 owner，Claude 把所有用户可感知的改动配上 before/after 截图或录屏交给他们裁决（表格逐格填入还是等整行完成？骨架屏立刻出现还是半秒后？流式文字的逐字淡入是否值五分之一帧预算？）。
    - *Direction*：每条线程刻意保持很窄，只围绕一个 benchmark 或一个旅程，要求 Claude 只在该范围内找改进。多数决策是排序和用户影响：优先哪些界面、如何合并互相踩脚的线程、何时关掉收益递减的线程。原文提到一个 900 行的 PR 得到一行回复：“going to gavel that 2ms per send is not worth the complexity of maintaining this build plugin.”

13. **（进阶）用帧预算做最细粒度度量。** 让 Claude 在 headless Chrome 里用 DevTools begin-frame control 做确定性 120Hz 帧步进（240 个 begin-frame 正好 240 帧，每帧 8.33ms），把「这一帧是否装得进 120Hz 预算」从噪声读数变成精确读数；再把 120Hz rig 变成 nightly job，持续盯回归。

## 对应的研究问题

**1. 能力发现（AI 已能做哪些还没想到交给它的工作）**
原文里大量工作是在冲刺过程中才被交给 agent 的，而且不是最初计划的：
- 扫描发现高亮一个已完成代码块会让页面冻结约 1 秒，根因是 em dash 等非 Latin-1 字符让 V8 把整个字符串按 UTF-16 存储，使所有语法高亮正则走两字节慢路径，用 20 行改动先把代码块复制成一字节字符串修复；
- 读闲置标签页的 profiler 样本，发现每分钟两次把相同的 cache 快照克隆进 IndexedDB，全在主线程；
- 追踪首次绘制后的代码路径，发现一处遗留的 `location.reload()`，每天造成 50 万次隐藏刷新，且现有加载指标完全看不到；
- 统计 React hook，发现 composer 输入路径上有 6,900 个 hook 和 900 个 store 订阅，每次按键都重渲染；
- 统计样式重算，发现单个 `:root:has()` 选择器给每次 DOM 变更加 24ms。
这些属于「可测量 → 可攀爬」的典型发现，说明 agent 能被派去做定位、埋点、建 bench、改代码、盯部署整条链。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 适合 agent：可量化、能重复测量、能在实验室复现、有 CI gate 的优化任务；可以异步跑数小时甚至过夜；一条线程只做一个窄目标；单线程可以连续产出 50–100 个 PR。
- 适合人类：设目标、做产品取舍、批准每次改动、裁决用户可感知的体验细节、判断收益是否值得复杂度（“2ms per send 不值得维护这个 build plugin”）。
- 工具形态：协作频道里的多线程并行 + 监控数据接入（Datadog MCP）+ CI ratchet + feature flag + nightly job。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 固定职责说明（standing instructions）与频道约定；
- 数据/可观测性访问：Datadog MCP server，以及可自定义的埋点与线上字段上报；
- 代码与发布权限：能开 PR、能进 CI、能盯部署；用户可见改动必须走 flag 与人类批准；
- benchmark 基础设施：Valgrind + `node --predictable`（指令计数）、V8 precise coverage（函数调用计数）、React commit 计数、layout/style-recalc 计数、DOM mutation 计数，以及每日自动下压的 ratchet job；
- 测试与 guardrail 基建：jsdom 生成静态标记、14 个视口的对拍、按键穿透测试、0.1px 位移上报；
- 逐线程的人类 owner，用于 taste 裁决与方向决策；
- 实验 rig：headless Chrome + DevTools begin-frame control。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
- 时间触发：nightly job 跑 120Hz rig 盯流式回归；daily job 在计数下降时自动把 ratchet 上限压得更低。
- 事件触发：部署后自动盯回归；线上出现任何非零像素位移就自动开线程；flag 一旦安全立即退役；
- 状态触发：线程原有请求完成后不关闭，继续找同一旅程的下一个慢点；由 Claude 自己开新线程去追它发现的独立机会。
- 前提条件：作者也承认这条循环「不是自主的」，需要人持续 steering。

**5. 效果验证（怎样判断确实改善了结果）**
- 主指标：真实用户监控里的 p75 端到端旅程时间，按平台和产品拆分对比（8/13 vs 8/27）；作者也指出 p95、其他旅程、超长对话仍有空间。
- 护栏指标：CI 里的确定性计数只能下降（指令计数、React commits、样式重算、DOM 变更），并每日自动下压。
- 相关性验证：benchmark 必须证明能带来 wall-clock 收益，否则下线；原文给了指令计数降 48%/31% 对应 wall-clock 降 78%/44% 的例子。
- 实验室 + 线上双读：例如布局位移事件上线后读到 31% 的 web 加载在页面可用后仍有位移（且没有用户交互），再逐个按名字修掉（迟到表头、用户名加载后横向滑动的光标、滚动条出现导致的列表移动）。
- 单测红绿验证：布局位移集成测试在 main 上 20/20 红，在 PR 上 20/20 绿。
- 结果层：长回复总阻塞从约 750ms 降到约 200ms，CPU 约为原来的 1/3，在 120Hz MacBook 上全程满帧。

## 与已有做法的关系

- **Claude Code（adopt）**：直接相关。Claude Code 本身是被优化的旅程之一（新建会话 0.8s → 0.3s），同时也是 agent 在仓库/CI 里干活的能力基础。本文可看作「把 Claude Code 式的 agent 常驻在一个协作频道里、以多线程方式长时间跑优化循环」的组织级用法扩展。
- **Claude Code Mods（study）**：原文正文未提及 mods，仅在文末相关文章列表中出现同名标题，不作为依据。
- **Semble（try）**：原文未提及。
- 其余未涉及。

## 证据与局限

**原文给出的数据/案例：**
- 三项 p75 时间改善（3.1→0.55、0.8→0.3、2.6→0.73）；
- 两周合并 3000+ 改动，0 客户可见事故、0 回滚；
- 第 3 天达成 12/13 个目标；
- 指令计数降 48% 和 31%，对应 wall-clock 降 78% 和 44%；
- 布局位移测试 main 20/20 红、PR 20/20 绿；上线后 31% 的 web 加载有可用后位移；
- 单线程近 60 个 PR（8ms 预算那条）、一般单线程 50–100 个 PR；最忙一天 200+ 改动；约 1/3 PR 带遥测或 guardrail；冲刺中同时跑 150+ 线程；
- 两周引入近 200 个 flag，过半已清理；
- 长回复总阻塞约 750ms → 约 200ms，CPU 约 1/3，120Hz 满帧；
- 具体发现案例：em dash/UTF-16 慢路径（20 行修复）、`location.reload()` 每天 50 万次隐藏刷新、6,900 个 React hook、`:root:has()` 每次 DOM 变更加 24ms、闲置标签页每分钟两次 IndexedDB 克隆。

**只是作者主张、没有独立验证的部分：**
- 「一旦能被测量就能被攀爬」「测量从第零步变成第一步」这类方法论总结；
- Claude 默认保守、需要人鼓励更大胆；
- benchmark 的挑选标准（不稳或不相关就丢掉）；
- steering 的 ambition/taste/direction 三分法；
- 「目标不是终点」的推进要求。
- 上述所有数字都来自这篇博客自述，没有第三方复现，也没有给出完整的方法论文档。

**适用条件（重要）：**
- 需要大型、活跃、有成熟 CI / feature flag / 真实用户监控的代码库；
- 需要能把 agent 接到监控数据和仓库的集成（原文用的是 Claude Tag beta 和内部研究模型，外部不一定可用）；
- 需要专职工程师在频道里做 steering 和审批——原文明确说这条循环「不是自主的」；
- 小团队或没有观测基础设施时，只能照搬循环结构和 ratchet 思路，不能照搬 150 条并行线程的规模。

## 怎么试、怎么验证

**最小试用方式（一个旅程、一条线程，不要一上来铺开）：**
1. 选一个痛点明确、能端到端测量的旅程（不要选全站）。建一个频道 + 一条线程。
2. 写 standing instruction：明确 agent 的职责范围、可访问的数据源和仓库、必须开 PR 而不能直接推、必须人类批准。
3. 先用现有埋点定基线：一个起点（用户交互）、一个终点（结果渲染），区分客户端与服务端。
4. 让 agent 找到或新建一个实验室可跑的 benchmark，并要求它证明该 benchmark 与 wall-clock 相关；证明不了就废弃。
5. 让 agent 提 PR（用户可见的放 flag 后），走自动评审 + 至少一个人类批准，并坚持先写测试再优化。
6. ship 后让 agent 读线上数据：有改善就把 ratchet 锁低（CI 只能下降 + 每日自动下压），没改善就关 flag 再迭代。
7. 一条线程跑通后复制到第二、第三条，最后才考虑并行规模。

**判断有没有改善的指标：**
- 主指标：真实用户监控里的 p75（必要时加 p95）端到端旅程时间，前后同口径对比。
- 护栏指标：CI 内的确定性 ratchet 数字（指令计数 / React commits / 样式重算 / DOM 变更），只能降不能升。
- 相关性检查：实验室指标下降时，线上 wall-clock 是否同步下降；不相关的 bench 直接丢弃。
- 安全指标：客户可见事故数、回滚数、试用结束时遗留未清理的 flag 数（理想为 0）。
- 协作成本：每条线程消耗的人工评审时间、被驳回的 PR 比例——若人工审批成为瓶颈，说明线程开太多或 scope 太宽，需要收缩而不是加码。
