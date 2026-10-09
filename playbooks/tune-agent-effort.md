# 按任务给 AI 分配算力：开发循环分档、手动选档与逐条自动路由

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决「同一件事该给 AI 多少算力」的判断问题：先分清该升档、该补 spec 还是交给自动路由，再用开发循环、手动 /effort 或 effortless 插件把它落到日常。
> 先试这一步：先拿一个边界情况多的任务（如输入校验/清洗，或在存量代码里修 bug），在 low 和 high 各跑一次做对照，据此判断你的失败属于「缺边界情况」（该升档）还是「走错方向」（该补 spec）。
> 最近修订：2026-10-10

## 解决什么问题

同一件事交给 AI 做，给多少算力应当由任务类型决定，而不是一律开满。起稿、头脑风暴、简单改动用低档就够；验证、边界情况密集、安全与性能类的工作才值得升档。

但「这条 prompt 该配多强的模型和推理强度」本身是一个平时靠感觉做的元决策——现在也可以交给便宜模型在约 1 秒内判断。

这篇手册给出三条可照做的路径：（A）功能开发循环，按阶段分档；（B）手动 `/effort` 逐任务选档；（C）用 effortless 插件按每条 prompt 自动路由，并把上下文占用、缓存冷热这些平时看不见的成本变量显示出来。核心定义不变：档位是给模型的一个「你愿意让它花多少算力」的近似值——要一个人 12 小时做完，他会尽力做；只给 1 小时，他会先给一个满足需求的版本，然后等你迭代。高档位下模型会更多地为判断和验证采取自主行动，低档位则快速给出起点。

## 适用与不适用

**适用**

- 新功能实现（常规软件工程工作）。
- 在存量代码库里修 bug、验证与测试。
- 边界情况密集的任务：安全、硬件、代码审查、性能优化，以及生产要求高的复杂任务。
- 端到端构建并验证一个应用、在关键软件里找安全漏洞（原文把这类「希望完全自主解决困难问题」的场景归给最高档）。
- 需要区分「人在环」与「不在环」的任务：原文指出，某类数据分析任务如果有用户在环，模型可能直接问用户该用哪种数据准备方式；没有用户在环时，高档位表现更好。
- 逐条 prompt 难易长短差异大、你不想每次手动判断档位：可用 effortless 自动路由；它同一行 bar 上还给你上下文占用、缓存剩余时间、judge 判断理由，以及一键 Handoff / Compact。

**不适用或需谨慎**

- 手动档位只在 Opus 5.5 / Fable 5.1（以及 Fable 5）上测过；effortless 只在 Opus 5.5 / Sonnet 5.5 上 effort 会变化。其他模型的档位与效果没有依据。
- 失败原因是「方向选错」时，升档基本无效——提高档位不会修复走错路线。
- spec 写得越细，升档带来的差异越小；这种情况下先补 spec 比加档更划算。
- 手动档位没有给出任何时间/事件触发机制或持续运行的编排方式，所以不要指望靠档位实现「自动持续跑任务」。effortless 有状态、阈值、事件触发（上下文占用、缓存变冷、限额、新版本），但那是会话内的提示与辅助，也不是无人值守的自动编排。
- 手动档位的成本数据来自厂商内部运行，具体倍率需自己试，不能当公开基准用。
- effortless 是会在本机运行代码的第三方插件（源码在 `hooks/`，会启动 `claude` 自身、`git`），节省幅度与 92%–99% 的 judge 准确率都是作者自测；建议只在非关键项目小范围试装。

## 前置条件

- 在 Claude Code 中使用，并已登录。
- 做法 B（手动档位）：模型为 Opus 5.5 或 Fable 5.1（文章只测了这两个以及 Fable 5）。作者提到，这些模型的 effort 调整不会破坏 Claude Code 的 prompt cache（原文未给出测量方法）。
- 做法 C（effortless）：插件会改变 Opus 5.5 / Sonnet 5.5 的 effort；默认的 Haiku judge 不需要 key，跑在你自己的 Claude 登录上；可选 Jev 需要 TypeSafe key。终端 CLI 环境需要 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`。作者建议装前先读插件 `hooks/` 里的代码。
- 你手上先有一个大致成形的需求描述，哪怕不完整——这是循环第 1 步成立的前提。
- 注意原文注明的测评环境条件：Opus 5.5 的响应上限为 128k tokens，且没有 GitHub 或 PyPI 访问权限；安全类任务在无网络访问下运行。这说明网络、包源等工具可得性会影响结果。

## 操作步骤

三条路径不互斥：A 决定一段工作在时间上怎么分档（先低后高），B 或 C 决定每一段或每一次一次性任务用哪一档。建议先跑 A，用 B 或 C 给 A 的第 2 步和第 4 步定档。**B 与 C 会互相打断**：effortless 的 Auto 开着时，你手动在应用里改 effort 会自动关掉 Auto（作者的说法是「你永远赢」），所以日常要么让 C 自动路由，要么用 B 手动拧，别同时要求两者。

### 做法 A：功能开发循环（作者自述在用的做法）

1. 给 Claude 一份 spec，并让它就你遗漏的细节采访你。
   - 前提：你手上已有一个大致成形的需求描述，哪怕不完整。
   - 预期结果：spec 中被你漏掉的约束被补上，后面的低档实现不容易跑偏。这是整个循环里最关键的一步。
2. 用低档（low）实现它。
   - 预期结果：得到一个抓住要点、可迭代的基底，而不是最终版。
3. 审查实现，确认它抓住了要点（gist）正确；需要的话继续在低档迭代。
   - 预期结果：方向正确性由你这一关保证。原文的失败分布结论是，升档只减少「缺边界情况」类失败，不修复「走错方向」的失败——所以方向核对必须放在低档阶段由人来做。
4. 用高档（high）做验证和测试。
   - 预期结果：补上低档常漏的边界情况，以及「新写的测试是否真能抓住原始 bug」这类自查（原文把「没有检查自己的新测试能否抓住原始 bug」列为低档的失分点，高档会去检查）。
5. （可选）如果第 4 步本身就是边界情况密集的验证——安全、硬件、代码审查、性能优化、生产要求高的复杂任务——可以再往上升档。
   - 代价见下方成本预期表。

### 做法 B：手动按任务类型选档，并在对话中途切换

1. 在 Claude Code 对话里输入下面这个命令切换档位，可按任务切换，也可以在同一段对话中途切换：

```
/effort
```

2. 对照这张规则表选档（原文的任务类型对应规则）：

| 档位 | 用在什么任务 | 原文场景举例 |
| --- | --- | --- |
| Low | 需要快速响应、人在环里 | 头脑风暴、草图（sketching）、简单改动 |
| Medium | 大部分常规软件工程工作 | 新功能实现 |
| High | 验证重要、或存在边界情况的工作 | 在存量代码库里修 bug |
| Max | 希望 Claude 完全自主解决困难问题 | 端到端构建并验证一个应用；在关键软件里找安全漏洞 |

3. 按成本预期决定值不值得升档（数据来自作者的玩具实验，模型 Opus 5.5，单次运行）：

| 任务 | low | medium | high | max |
| --- | --- | --- | --- | --- |
| 未充分指定的构建（健身追踪 app） | 1.5 分钟 | 4 分钟 | 11 分钟 | 67 分钟 |
| 轻度指定的设计任务（重做 /config 菜单） | 1 分钟 | — | — | 28 分钟 |
| 高度指定的构建任务 | 16 分钟 | 22 分钟 | 33 分钟 | 79 分钟 |

   - 用法：只想要一个可迭代的基底，低档就够；想要最好的一次成型结果，用最高档。

### 做法 C：用 effortless 让每条 prompt 自动路由

**前提**：已装并登录 Claude Code；插件会在本机跑 `hooks/` 里的代码，作者建议装前先读这些代码；只在 Opus 5.5 / Sonnet 5.5 上 effort 会变化。

1. 安装（三种方式任选）

   1a. 让 Claude 自己装：把下面整段粘进 Claude Code 按回车。

```text
Install the effortless plugin for me: run `claude plugin marketplace add HeyCubit/effortless` and then `claude plugin install effortless@effortless`. When both succeed, tell me to run /reload-plugins.
```

   1b. 在 Claude Code 聊天框里逐条输入。

```text
/plugin marketplace add HeyCubit/effortless
```

```text
/plugin install effortless@effortless
```

   1c. 或在终端一行完成。

```bash
claude plugin marketplace add HeyCubit/effortless; claude plugin install effortless@effortless
```

2. 重载插件：运行 `/reload-plugins`（或重启 Claude Code）。

3. 首次 setup（提示框上方弹出）：选择只保留 **Haiku**（一次点击、不需要 key、跑在自己的 Claude 登录上），或加 **Jev**（TypeSafe key，effort 判断约快 4 倍）；再选偏省还是偏聪明、以及 handoff 怎么写。之后用 `/effortless setup` 重跑，或在 ⚙ 里改任意一项。

4. 日常读 bar：`High · Opus` = 本条 prompt 的 effort 与模型，judge 思考时显示 `Deciding`；其后若显示更便宜的模型（`Low · Haiku`）说明只有这一条 prompt 跑在那里。`◔ 38%` 是上下文占用，`cache 59:00` 是缓存变冷倒计时（变冷后下条消息重读整个会话按全价付费）。`Auto` 是开关键；**你自己在应用里改 effort 也会自动关掉 Auto**。想极简可在 Settings → Customize 选 **Minimal**（不画 bar）。

5. 会话变重时开新会话：缓存变冷的大会话里，bar 变成冰状态，出现 **Compact** 和 **Handoff**。Handoff 写一份会话摘要并在干净会话里接着干：**Quick** 几秒；**Full** 会检查 git 并保存 `HANDOFF.md`（或跑你自己的 skill）。之后可「清掉继续」「清掉等待」或保留会话只复制。

6. 压缩：`Compact` 可填一条可选备注，说明摘要要保住什么。每次压缩（含 `/compact` 与自动压缩）默认由 Haiku 5.5 写，Haiku 失败则按 Claude Code 原样压缩。开关在 Settings → Handoff → Compact with。

7. judge 选择（Settings 或 `/plugin configure effortless@effortless`）：

| Setting | What it does |
| --- | --- |
| `auto`（默认） | Haiku，若设置里（或环境变量 `TYPESAFE_API_KEY`）有 TypeSafe key 则同时用 Jev |
| `haiku` | 只用 Haiku，绝不使用 key |
| `jev` | Haiku + Jev，key 也可来自 `~/.config/jev/.env` |

   key 只发给 TypeSafe、别处不发；用 `/plugin configure` 输入的 key 存在 Claude Code 的安全存储里，粘进 setup guide 或 Judge 卡片则明文写入 `~/.config/jev/.env`，共享机器上优先用 `/plugin configure`。Jev 失败或超过 3 秒时 Haiku 接手，并每会话提示一次原因（额度用尽、key 被拒、无应答）。

8. 短跟进不重新判断：`go`、`ok`、`yes` 这类短跟进沿用已选的 effort，不调用 judge。

9. 终端 CLI 里插件不加载时：把下面加进 `~/.claude/settings.json` 后重启。

```json
{ "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } }
```

10. 命令速查：

| Command | Does |
| --- | --- |
| `/effortless settings` | 打开设置面板 |
| `/effortless setup` | 重跑 setup |
| `/effortless auto` | Auto 开/关 |
| `/effortless handoff` / `handoff full` | 不通过 bar 直接交接，跟随你上次选的后续动作 |
| `/effortless stats` | 本次会话 Auto 引导的各 effort 花了多少、judge 花了多少 |
| `/effortless cold`、`swamp`、`hot`、`down` | 立刻显示对应 bar，用于试用 |
| `/effortless bench` | 用 `bench/judge-cases.json` 里的带标签 prompt 给每个已配置的 judge 打分 |
| `/effortless update` | 立刻检查新版本 |

11. 自测质量：

```bash
node bench/quality.mjs
```

   用 30 条 prompt 在 Opus 与路由所选模型上各答一遍，由盲评者比较。

12. 想改代码/自建（在仓库目录）：

```bash
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

### 三选一怎么选

- 想稳定拿到可用结果、并且愿意自己在中间审查一次 → 用做法 A 走完四步循环。
- 只想快速要一个起点、有人盯着 → 低档（B）。
- 任务是边界情况密集的验证/修复 → 直接上 high，必要时再升（B）。
- 希望 AI 端到端自主把难题做完 → max（B）。
- spec 已经写得很细 → 先别升档，因为原文的高度指定构建任务实验显示各档位表现明显趋同（设计和实现相似，只是细节不同，高档还花时间简化了一些细节）。
- 日常 prompt 难易长短混杂、不想每次手动判断，且能接受第三方插件在本机跑代码 → 用做法 C，先只保留 Haiku judge，再用 `/effortless stats` 和 `/effortless bench` 核对自己的花费与判断命中率。

## 怎么判断变好了

### 最小试用（三个，任选其一或组合）

**试用 1：跑一遍四步循环。** 挑一个你下周本来要做的新功能，按做法 A 走：让 Claude 先采访你补齐 spec → low 实现 → 你 review、按需 low 迭代 → high 验证测试。对照组：用你原来的习惯做法（比如直接中/高档一次做到底）做另一个规模相当的功能。

**试用 2：对同一任务做档位对照（成本最低、信号最强）。** 选一个「边界情况多」的任务——例如输入校验/清洗、HTML 或模板消毒、性能优化、在存量代码里修 bug——分别在 low 和 high（或 max）各跑一次，比较结果。

**试用 3：装 effortless 后核账。** 在非关键项目里装好、先用默认 Haiku judge；跑 `/effortless stats` 看本次会话 Auto 引导的各 effort 花了多少、judge 花了多少；跑 `/effortless bench` 用 `bench/judge-cases.json` 里的带标签 prompt 给你的 judge 打分；再跑 `node bench/quality.mjs` 看降级后质量是否够用。满意再常驻。

原文给的判据是：如果低档失败是因为「缺边界情况 / 测试没抓到 bug」，升档应有效；如果失败是「需求读错 / 方向选错」，升档基本无效，此时应该改 spec，而不是加档。

### 观察什么指标

- 一次通过的比率：同一任务要多次跑，而不是只看一次。
- 你的 review 发现的问题数、返工轮次。
- 进入验证阶段后才暴露的缺陷数（对应原文的「a bug its tests missed」）。
- token 消耗与墙钟时间。原文的核心图表就是「通过率 vs token 花费」——升档要值回票价的 token。
- 失败归因：记录每次失败属于「缺边界情况」还是「走错方向」。这是决定该升档还是该补 spec 的分叉点。
- 规格化的边际收益：同一任务给一份粗 spec 和一份经过采访补全的细 spec 各跑一次，看各档位的差距是否收窄。若收窄，说明性价比更高的做法是先把 spec 采访清楚，而不是无脑开最高档。
- 上下文占用与缓存剩余（`◔ %`、`cache 59:00`）：这把「上下文占用 / 缓存热度」这类平时看不见的成本变量变成可观察量。按原文的成本结构，约 76% 成本来自每次 tool call 回读缓存里的上下文，16% 是 cache 写入，仅 8% 是 output，所以保持会话短、在缓存变冷前压缩，往往比调 effort 省得更多。
- Auto 引导的各 effort 花费与 judge 开销：`/effortless stats`。
- judge 命中率与 too low 次数：`/effortless bench`。可参照作者自测（1.5.1 两个 run、73 例，Sonnet 与 Opus 5.5）：Always medium 44%（held-out 40%）、Always high 51%（50%）、Haiku 92–93%（held-out 95%）、Jev 99%（held-out 100%）；too low 分别为 17 / 0 / 1 / 0；中位耗时 Haiku 0.75 s、Jev 0.24 s。
- 降级后的答案质量：`node bench/quality.mjs` 于 2026-10-09 跑 30 条 prompt，便宜答案 28/30 够用（两条 Haiku 答案失手），在降级的那批 prompt 上成本低 66–78%；原文自述「几乎从不更好，往往略差」。

### 试多久

原文没有给出建议的试用时长，只说它自己的比较方式是每个任务跑 5 次尝试后再统计（失败分布共 370 次尝试）。所以试用至少要覆盖到你手上同一类任务的多次尝试再下结论；单次运行不足以判断——作者自己就声明其耗时表来自单次运行（toy examples / individual runs），不是多次采样的统计。effortless 这边，judge bench 是 73 例的小集合，作者写明 judge 不完全确定、重跑会差几个点；质量 bench 自认「one run, one grader, small set」，所以要多跑几轮、换几个自己的任务再判断。

## 常见坑

- **拿升档去修「方向错」。** 原文失败分布的结论是：提高 effort 会减少「缺边界情况」类失败，但不会修复模型走错路线的失败。方向问题只能在 spec 和人工审查环节解决。
- **spec 已经很细还盲目开最高档。** 高度指定构建任务的实验里各档位表现趋同，高档还额外花时间简化细节，收益小、成本高。
- **用单次运行或单点耗时下结论。** 原文的玩具实验与耗时表都是 individual runs，不是统计；档位效果要用同一任务的多次尝试看。effortless 的 judge bench 与质量 bench 也都是小样本，别把一次跑分当定论。
- **把厂商内部数字当公开基准。** 档位数据来自作者内部跑，每任务 5 次尝试，Fable 5.1 关闭了生产安全干预；在 Claude 产品里 Fable 5.1 的部分安全请求会被转给 Opus；安全任务在无网络访问下运行。因此这些数字与公开排行榜或发布文章不一致。
- **以为档位标签是统一的。** low / medm / high / xhigh / max 在不同图表中不完全一致，规则表与基准图用的档位标签并不完全对齐。
- **忽略题目难度差异。** Terminal-Bench 3.0 的题目复杂度，作者自己说「远高于我平时会遇到的平均任务」，所以这些对比的绝对收益未必线性迁移到日常开发。
- **忽略环境与权限条件。** 测评时响应上限 128k tokens、无 GitHub 或 PyPI 访问；网络、包源等工具可得性本身就是影响结果的外部条件。
- **把「max 自主」当成自动化编排。** 原文只把 max 定义为让 Claude 完全自主解决困难问题，没有任何时间/事件触发机制或持续运行的做法。effortless 虽然会在上下文占用 30% 起、每第二条消息评估 handoff，在缓存变冷、限额过 80%、有新版本时给提示，但这些只是会话内提示与告警，仍不是无人值守的自动编排，别自行延伸。
- **不读第三方插件的代码就装。** effortless 会在本机执行 `hooks/` 里的代码，会启动 `claude` 自身（更新/卸载时）、`git`（查新版本），Update 时把新版本文件复制进当前会话所在目录。只在非关键项目小范围试装。
- **把 92%–99% 的 judge 准确率当既成事实。** 那是 73 例小集合上的作者自测，重跑会差几个点；质量 bench 也只有 30 条 prompt、一次盲评。
- **一边要自动路由一边手动拧 effort。** 你在应用里手动改 effort 会关掉 Auto（「你永远赢」），B 和 C 同时用会互相打断。
- **Jev key 粘贴方式会明文落盘。** 粘进 setup guide 或 Judge 卡片会明文写入 `~/.config/jev/.env`；共享机器上优先用 `/plugin configure` 输入，让 key 存在 Claude Code 的安全存储里。
- **指望短跟进被重新分诊。** `go`、`ok`、`yes` 这类短跟进沿用已选的 effort，不调用 judge。
- **忘了插件不高于当前会话模型。** 便宜模型只在单条 prompt 上生效，主会话模型与其 cache 不变。

## 证据与来源

**做法 A / 做法 B 与档位概念**出自《Using Claude Code: Spending your effort》（Claude Code 官方工程博客，作者 Thariq Shihipar，原文 claude.dev）。作者供职于 Claude 团队，立场不完全中立。

有数据支撑的部分：

- 基准：Terminal-Bench 3.0，同一批 70 个任务（4 个 GPU 任务被排除），每个模型都跑；Opus 5.5 晚约三周运行，响应上限 128k tokens，无 GitHub 或 PyPI 访问；Opus 5 的最高纪录是其 effort-120 那次运行。
- 类别通过率（Fable 5.1，低档合并两个最低档位、最高档合并三个最高档位，因为类别样本小）：Security 64%→87%，Hardware 34%→75%，ML 54%→73%，Science 41%→61%，Software 43%→56%，Media 18%→30%，Operations 12%→22%。
- 失败分布（Fable 5.1，每任务 5 次尝试共 370 次）：低档 140 passed，最高档 214 passed；低档失败中「a bug its tests missed」40 次、「misread a requirement」45 次，最高档对应为 14 和 26。
- 单任务案例（每任务 5 次尝试）：html-js-filter（HTML 消毒器，穷举所有 JS 注入方式）Fable 5.1 低档 1/5 → xhigh 5/5，低档约 2 分钟/次、高档约 33 分钟；mvcc-lsm-compaction（按崩溃报告修存储引擎 bug）Opus 5.5 低档 0/5 → xhigh 4/5；cli-2ph-simplex（Python CLI 线性规划求解器）Opus 5.5 低档 0/5 → high 5/5；gsea-proteomics（蛋白质组学 GSEA）Opus 5.5 低档 0/5 → high 4/5。

只是作者主张、无量化支撑的部分：

- 「档位是算力的近似」「高档位会采取更多自主判断和验证」是概念性解释。
- 「spec 越详细各档位越趋同」只有几个玩具实验支撑，作者自称是 toy examples / individual runs。
- 成本预期表来自单次运行，不是多次采样的统计。
- 「effort 调整不破坏 prompt cache」是作者对自家产品的陈述，未给测量方法。
- 失败类型由「模型评委」判定，原文自己标注为 approximate。
- 只在 Opus 5.5 / Fable 5.1 上测过；档位名称与标签在不同图表中不完全一致。

**做法 C（effortless）**出自对 HeyCubit/effortless 的调研。它是 Claude Code 的第三方插件，建立在 Claude Code 之上，扩展两件原本要人工做的事：逐 prompt 的模型/effort 选择，以及会话压缩与交接。

原文给出的数据：

- 成本结构（80k 次真实 Claude Code 请求测量）：约 76% 成本来自每次 tool call 回读缓存里的上下文，16% 是 cache 写入，仅 8% 是 output；effort 主要改变一条 prompt 产生多少 tool call。
- 一次关于 Opus 的长会话中，约一半回复跑在 Sonnet 或 Haiku 上，按作者估算成本约减半。
- 对照 high/xhigh 默认，Auto 省得多：中位 xhigh prompt 成本约为 medium 的 3 倍；对照 medium 默认则通常只省几个百分点，但把难任务放到自己的模型上并给 High。
- judge 准确率（1.5.1 两个 run，73 例，Sonnet 与 Opus 5.5）：Always medium 44%（held-out 40%）、Always high 51%（50%）、Haiku 92–93%（held-out 95%）、Jev 99%（held-out 100%）；too low 分别为 17 / 0 / 1 / 0；中位耗时 Haiku 0.75 s、Jev 0.24 s。
- 质量：`bench/quality.mjs` 于 2026-10-09 跑 30 条 prompt，便宜答案 28/30 够用（两条 Haiku 答案失手），在降级的那批 prompt 上成本低 66–78%；原文自述「几乎从不更好，往往略差」。

只是作者主张、未给方法细节的：

- 「成本约减半」是 estimate；「effort 主要改变 tool call 数」是作者测量结论，没给统计方法。
- 质量 bench 自认「one run, one grader, small set」。
- 「Anthropic 推荐 Haiku 做 compaction」是转述，材料里无出处。

作者自己写明的局限：73 例是小集合，judgee 不完全确定，重跑会差几个点；judge 的 prompt 在 73 例中的 53 例上调过，只有 20 例 held-out。

## 依据的调研

- [Using Claude Code: Spending your effort](../research/radar/2026-10-02/393-using-claude-code-spending-your-effort.md)：值得一试，把 Claude Code 的 effort 档位当成一种可调的工作方式：用「让模型先采访你→低档实现→低档迭代→高档验证」的循环做功能开发，并按任务类型选档（低档在环讨论、中档常规实现、高档验证与边界情况、最高档全自主难题）；理由是原文给出了明确的档位分工和一组可复现的效果对比，但数据来自厂商内部运行，具体倍率需自己试。
- [HeyCubit/effortless](../research/radar/2026-10-10/2272-heycubit-effortless.md)：值得一试，可以在非关键项目的 Claude Code 里小范围试装：按 README 的命令装好、先只用默认的 Haiku judge（无需 key），再用 `/effortless stats` 和 `/effortless bench` 在自己任务上核对花费与判断命中率，满意再常驻。给 try 而非 adopt 的理由是它是会本机运行代码的第三方插件，且节省幅度与 92%–99% 的 judge 准确率都是作者自测（73 例 bench、30 条质量用例、一次性盲评），必须自验。
