# HeyCubit/effortless

- 结论：**值得一试**。可以在非关键项目的 Claude Code 里小范围试装：按 README 的命令装好、先只用默认的 Haiku judge（无需 key），再用 `/effortless stats` 和 `/effortless bench` 在自己任务上核对花费与判断命中率，满意再常驻。给 try 而非 adopt 的理由是它是会本机运行代码的第三方插件，且节省幅度与 92%–99% 的 judge 准确率都是作者自测（73 例 bench、30 条质量用例、一次性盲评），必须自验。
- 原文：https://github.com/HeyCubit/effortless
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-09T17:34:08.607Z

## 是什么

`effortless` 是一个 Claude Code 插件（mod），在提示输入框上方画一条 bar，对**每一条 prompt** 自动选择模型与推理强度（effort）：简单问题走 Haiku 或 Sonnet 的低 effort，难任务在你的原模型上给 High。选择由 Haiku 5.5 担任的 judge 在约 1 秒内做出（可换成更快的 Jev，约 0.24 s）。同一条 bar 还显示：上下文占满程度（如 `◔ 38%`）、prompt cache 还有多久变冷（如 `cache 59:00`）、judge 的判断理由（如 *Haiku: a refactor…*）。会话变重时提供一键 **Handoff**（写摘要、在干净会话里继续）和 **Compact**（压缩）。

三个 Haiku 的用点：judge（读 prompt 选 effort 与模型）、便宜模型承接（被判为简单的 prompt 跑 Haiku/Sonnet，但只在单条 prompt 上生效，主会话模型与其 cache 不变）、压缩（每次 compaction 含 `/compact` 与自动压缩都由 Haiku 5.5 写摘要，失败则回退 Claude Code 默认）。三者都可单独关闭。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：已装并登录 Claude Code；插件会在本机跑 `hooks/` 里的代码，作者建议装前先读这些代码；只在 Opus 5.5 / Sonnet 5.5 上 effort 会变化。

1. **安装（三种方式任选）**

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

2. **重载插件**：运行 `/reload-plugins`（或重启 Claude Code）。

3. **首次 setup**（提示框上方弹出）：选择只保留 **Haiku**（一次点击、不需要 key、跑在自己的 Claude 登录上），或加 **Jev**（TypeSafe key，effort 判断约快 4 倍）；再选偏省还是偏聪明、以及 handoff 怎么写。之后用 `/effortless setup` 重跑，或在 ⚙ 里改任意一项。

4. **日常读 bar**：`High · Opus` = 本条 prompt 的 effort 与模型，judge 思考时显示 `Deciding`；其后若显示更便宜的模型（`Low · Haiku`）说明只有这一条 prompt 跑在那里。`◔ 38%` 是上下文占用，`cache 59:00` 是缓存变冷倒计时（变冷后下条消息重读整个会话按全价付费）。`Auto` 开关键；**你自己在应用里改 effort 也会自动关掉 Auto**。想极简可在 Settings → Customize 选 **Minimal**（不画 bar）。

5. **会话变重时开新会话**：缓存变冷的大会话里，bar 变成冰状态，出现 **Compact** 和 **Handoff**。Handoff 写一份会话摘要并在干净会话里接着干：**Quick** 几秒；**Full** 会检查 git 并保存 `HANDOFF.md`（或跑你自己的 skill）。之后可“清掉继续”“清掉等待”或保留会话只复制。

6. **压缩**：`Compact` 可填一条可选备注，说明摘要要保住什么。每次压缩（含 `/compact` 与自动压缩）默认由 Haiku 5.5 写，Haiku 失败则按 Claude Code 原样压缩。开关在 Settings → Handoff → Compact with。

7. **judge 选择**（Settings 或 `/plugin configure effortless@effortless`）：

| Setting | What it does |
|---|---|
| `auto`（默认） | Haiku，若设置里（或环境变量 `TYPESAFE_API_KEY`）有 TypeSafe key 则同时用 Jev |
| `haiku` | 只用 Haiku，绝不使用 key |
| `jev` | Haiku + Jev，key 也可来自 `~/.config/jev/.env` |

   key 只发给 TypeSafe、别处不发；用 `/plugin configure` 输入的 key 存在 Claude Code 的安全存储里，粘进 setup guide 或 Judge 卡片则明文写入 `~/.config/jev/.env`，共享机器上优先用 `/plugin configure`。Jev 失败或超过 3 秒时 Haiku 接手，并每会话提示一次原因（额度用尽、key 被拒、无应答）。

8. **短跟进不重新判断**：`go`、`ok`、`yes` 这类短跟进沿用已选的 effort，不调用 judge。

9. **终端 CLI 里插件不加载时**：把下面加进 `~/.claude/settings.json` 后重启。

```json
{ "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } }
```

10. **命令速查**：

| Command | Does |
|---|---|
| `/effortless settings` | 打开设置面板 |
| `/effortless setup` | 重跑 setup |
| `/effortless auto` | Auto 开/关 |
| `/effortless handoff` / `handoff full` | 不通过 bar 直接交接，跟随你上次选的后续动作 |
| `/effortless stats` | 本次会话 Auto 引导的各 effort 花了多少、judge 花了多少 |
| `/effortless cold`、`swamp`、`hot`、`down` | 立刻显示对应 bar，用于试用 |
| `/effortless bench` | 用 `bench/judge-cases.json` 里的带标签 prompt 给每个已配置的 judge 打分 |
| `/effortless update` | 立刻检查新版本 |

11. **自测质量**：

```bash
node bench/quality.mjs
```

  用 30 条 prompt 在 Opus 与路由所选模型上各答一遍，由盲评者比较。

12. **想改代码/自建**（在仓库目录）：

```bash
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

## 对应的研究问题

**1. 能力发现（AI 已能做、但没想到交给它的工作）**
- 把“这条 prompt 该配多强的模型和推理强度”这个平时靠人凭感觉做的元决策交给 AI（Haiku judge，约 1 秒）。
- 把“该不该开新会话 / 该不该压缩”的时机判断交给 AI：从上下文 30% 起、每第二条消息，Haiku 读会话用途、话题脉络、最后一条回复和上下文占用，只在理由明确时才建议新会话。
- 可照做的模式：用便宜模型做**元决策**（判断、分诊、摘要），而不用它做主体任务。

**2. 任务匹配（什么工作适合怎样的模型/工具/协作方式）**
- 简单 prompt → Haiku 或 Sonnet 低 effort；难任务 → 你自己的模型 + High；且“绝不高于当前会话的模型”。
- 粒度只到单条 prompt：主会话模型不变、其 prompt cache 保持热度供下一条难 prompt 使用。
- 短跟进（`go`/`ok`/`yes`）沿用已选 effort，不触发 judge。
- 压缩这类“快速、定义明确的工作”交给 Haiku。

**3. 条件供给（需要提供哪些信息、工具、权限、反馈）**
- 登录：默认 judge 不需要 key，跑在自己的 Claude 登录上。
- 可选 key：加 Jev 需要 TypeSafe key，`/plugin configure` 存入 Claude Code 安全存储；粘贴方式则明文落盘 `~/.config/jev/.env`。
- 权限/信任：插件会在本机执行代码（源码在 `hooks/`），会启动 `claude` 自身（更新/卸载时）、`git`（查新版本），Update 时把新版本文件复制进当前会话所在目录。
- 终端环境：需要 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`。
- 反馈回路：bar 上显示 judge 是谁、为什么；手动改 effort 会关掉 Auto（“你永远赢”）；judge 不再应答时 bar 会警告。

**4. 主动推进（时间/事件/状态触发）**
- 状态触发：上下文占用（30% 起、每第二条消息评估一次 handoff）；缓存变冷（bar 转冰，提示 Compact/Handoff）。
- 阈值触发：5 小时或每周限额过 80% 时告警，并可进 **Save 模式**把 effort 上限压到 Medium；会话被“淹没”（每条消息都重读大量上下文）时告警。
- 事件触发：新版本发布时弹出 Update / Later 卡片，按 Update 就在当前会话里加载新版本，无需输入任何东西。
- 每轮都跑：judge 对每条新 prompt 自动决策，不需要人触发。

**5. 效果验证**
- 会话内成本：`/effortless stats` 给出本次会话 Auto 引导的各 effort 花费与 judge 开销。
- judge 准确率：`/effortless bench` 用同一套真实调用代码跑带标签用例，对照固定 effort 打分。
- 答案质量：`node bench/quality.mjs` 用盲评比较 Opus 与路由所选模型的回答。
- 可视反馈：`◔ %` 与 `cache 59:00` 把“上下文占用 / 缓存热度”这类平时看不见的成本变量变成可观察量。

## 与已有做法的关系

清单中有 **Claude Code**（tool，status: adopt）。本条目正是 Claude Code 的第三方插件，建立在它之上，扩展两件原本要人工做的事：逐 prompt 的模型/effort 选择，以及会话压缩与交接。清单中没有其他相关条目。

## 证据与局限

**原文给出的数据**
- 成本结构（80k 次真实 Claude Code 请求测量）：约 **76%** 成本来自每次 tool call 回读缓存里的上下文，**16%** 是 cache 写入，仅 **8%** 是 output；effort 主要改变一条 prompt 产生多少 tool call。
- 一次关于 Opus 的长会话中，约**一半回复**跑在 Sonnet 或 Haiku 上，按作者估算成本约减半。
- 对照 high/xhigh 默认，Auto 省得多：中位 xhigh prompt 成本约为 medium 的 **3 倍**；对照 medium 默认则通常只省几个百分点，但把难任务放到自己的模型上并给 High。保持会话短、在缓存变冷前压缩，往往比调 effort 省得更多。
- 质量：`bench/quality.mjs` 于 2026-10-09 跑 30 条 prompt，便宜答案 **28/30** 够用（两条 Haiku 答案失手），在降级的那批 prompt 上成本低 **66–78%**；原文自述“几乎从不更好，往往略差”。
- judge 准确率（1.5.1 两个 run，73 例，Sonnet 与 Opus 5.5）：Always medium 44%（held-out 40%）、Always high 51%（50%）、Haiku **92–93%**（held-out 95%）、Jev **99%**（held-out 100%）；too low 分别为 17 / 0 / 1 / 0；中位耗时 Haiku 0.75 s、Jev 0.24 s。

**只是作者主张、未给方法细节的**
- “成本约减半”是 estimate；“effort 主要改变 tool call 数”是作者测量结论，没给统计方法。
- 质量 bench 自认“one run, one grader, small set”。
- “Anthropic 推荐 Haiku 做 compaction”是转述，材料里无出处链接内容。

**作者自己写明的局限**
- 73 例是小集合，judge 不完全确定，重跑会差几个点。
- judge 的 prompt 在 73 例中的 53 例上调过，只有 20 例 held-out 是“诚实的”，但那 20 例是在第一轮结果之后写的，并非盲测。
- Haiku 剩下的失误多是硬活之后的 “yes” 或 “thanks”，它会继续给高 effort。
- bench 只衡量 judge 选的 effort 是否合理，不衡量会话成本或答案好坏。

**适用条件**
- 只在 **Opus 5.5 与 Sonnet 5.5** 上 effort 会变；在 Fable 5.1 和更老模型上，改 effort 会重写大部分 prompt cache、得不偿失，于是 Auto 暂停并显示 `Paused`；Haiku 无 effort 设置。
- 终端支持需手动开 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`；测试于 Claude Code 2.1.285（stable）、2.1.286、2.1.288，80 与 120 列；低于 90 列时 bar 的带状区不画像素画。
- 桌面端 split view 里 Claude Code 只在左窗格画插件 bar，右半窗格靠一条同色小卡片提示应执行的命令。
- 信任面：像任何 Claude Code 插件一样在本机跑代码；作者建议用带消费上限的 key。

**我无法从材料核实、需要你自己确认的点**
- 原文出现的模型名（Haiku 5.5 / Opus 5.5 / Sonnet 5.5 / Fable 5.1）与日期（2026-10-09）请对照你当前的 Claude Code 和可用模型清单核实；README 未提供版本不匹配时的兜底说明。
- 仓库仅 46 stars，bench 结果无法用给出的材料复核；judge 用例集只有 73 条。

## 怎么试、怎么验证

**最小试用（约 10 分钟）**
1. 选一个非关键项目，在 Claude Code 里用第 1 步的命令安装，跑 `/reload-plugins`。
2. setup 时只选 **Haiku**，不配任何 key、不改任何设置——先把变量降到最少。
3. 连续做 2–3 个任务，覆盖一次简单问答和一次重构/多文件改动，留意 bar 上 effort 与模型是否随任务难度变化。
4. 跑 `/effortless stats` 看本次会话各 effort 的花费与 judge 开销；跑 `/effortless bench` 看 judge 在你自己环境上的命中率与 `too low` 条数。
5. 故意把一次会话拖长，等 bar 转冰，试一次 **Handoff（Quick 或 Full）**，检查接手会话是否保住了关键上下文。
6. 想量质量就 `node bench/quality.mjs`（注意这是作者自己的 30 条 prompt，只反映他们的任务分布）。

**判断有没有改善的指标**
- 成本：`/effortless stats` 对比 Auto 开/关（同等工作量）。注意基线——若你本来就用 medium 默认，别期待大幅下降；要从 high/xhigh 基线出发才看得到明显差异（原文：中位 xhigh prompt 约为 medium 的 3 倍）。
- 质量：拿你自己最常做的 prompt，比较 Auto 选择的模型/effort 与你手动固定 effort 的结果差异；作者自己的数字是 28/30，不代表你的任务。
- judge 可靠性：`/effortless bench` 的 `too low` 计数。若出现本该高 effort 却被判低（原文 Haiku 剩下失误多在硬活后的 “yes”/“thanks”），考虑加 Jev 或关掉 Auto。
- 上下文管理：记录缓存变冷告警出现的频率，以及压缩/Handoff 后有没有丢关键信息（尤其 `HANDOFF.md` 是否够用）。
- 结论口径：如果 stats 显示大部分 prompt 落到低 effort 而回答质量没有可感知下降、且 Handoff/Compact 没丢信息，就留在工作流里；如果 `too low` 频繁或摘要丢关键上下文，就别常驻，退回手动控制 effort。
