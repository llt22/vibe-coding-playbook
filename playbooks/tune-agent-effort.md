# 给编码 agent 分档配算力：先补 spec 与自验，再升 effort、最后换模型

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：同一件事交给 AI，给多少算力、配什么提示，应由任务类型和失败原因决定，而不是一律开满或一律用默认档。
> 先试这一步：挑一个边界情况多的真实任务，在 low 和 high 各跑一次做对照；如果它是复杂长编码任务，先 `/effort high`，再按做法 F 一次只加一项提示或清理一项旧记忆。
> 最近修订：2026-11-14

## 解决什么问题

同一件事交给 AI 做，给多少算力应当由任务类型和失败原因决定，而不是一律开满。起稿、头脑风暴、简单改动用低档就够；验证、边界情况密集、安全与性能类的工作才值得升档。

现在有两个旋钮：**模型**（Haiku 5.5 / Sonnet 5.5 / Opus 5.5 / Fable 5.2）和**effort 档位**（low / medium / high / max 等）。模型决定能力上限、价格、延迟和上下文；effort 是给模型的一个近似值——你愿意让它花多少算力。要一个人 12 小时做完，他会尽力做；只给 1 小时，他会先给一个满足需求的版本，然后等你迭代。高档位下模型会更多地为判断和验证采取自主行动，低档位则快速给出起点。

正确的顺序不是「先换最大模型」，而是：**先确认模型能自验，再把 effort 提高一档，最后才换更大模型，并从比小模型更低的 effort 起步**。提高 effort 只让模型想更久、调用更多工具、更多自检，不会给它新知识或新技能；失败如果是「方向选错」，升档基本无效。

还有第二类失败：编码 agent 中途停下、没做完就宣布结束、长时间静默、审批时只回一句「go」、旧记忆里的「never retry」继续生效、最终报告要打开文件才看得懂。这类问题不是加档能修的，要在提示词与记忆层改：角色（你是这个代码库的长期维护者）、收尾要求、进度播报、精确审批、删除前询问、清理过时指令。这篇手册把这一层单列为做法 F，和档位选择分开处理。

这篇手册给出六条可照做的路径：（A）功能开发循环，按阶段分档；（B）手动选档与选模型——B0 最小配置基线（opus + medium，深度推理/验证升 high）、B1 按任务类型查 effort 表、B2 按任务选起始模型和 effort、B3 换模型前的排查顺序；（C）用 effortless 插件按每条 prompt 自动路由，并把上下文占用、缓存冷热这些平时看不见的成本变量显示出来；（D）子代理、advisor、多代理的适用边界；（E）切模型与迁移检查；（F）Fable 5.2 编码会话的配置层修正。

## 适用与不适用

**适用**

- 新功能实现（常规软件工程工作）。
- 在存量代码库里修 bug、验证与测试。
- 边界情况密集的任务：安全、硬件、代码审查、性能优化，以及生产要求高的复杂任务。
- 端到端构建并验证一个应用、在关键软件里找安全漏洞（原文把这类「希望完全自主解决困难问题」的场景归给最高档）。
- 需要区分「人在环」与「不在环」的任务：某类数据分析任务如果有用户在环，模型可能直接问用户该用哪种数据准备方式；没有用户在环时，高档位表现更好。
- 任务类型差异大、需要给每类任务选一个起始模型：日常工程、分类/路由/打标/高量抽取、子代理、聊天、范围明确的编码、文档/幻灯片/表格、重复运行的 agent 任务、计算机使用、大重构/迁移、深度研究——B2 有对照表。
- 逐条 prompt 难易长短差异大、你不想每次手动判断档位：可用 effortless 自动路由；它同一行 bar 上还给你上下文占用、缓存剩余时间、judge 判断理由，以及一键 Handoff / Compact。
- 想先做一个最小改动、不想马上装插件：用 `/model opus` + `/effort medium` 作默认，深度推理或验证时 `/effort high`。这条来自单条推文，只给出一条控制项，适合当起点，不适合当完整方法。
- 有大量旁路工作（搜索文件、读日志、跑测试、总结）：放到 Haiku/Sonnet 子代理，主模型保留判断和代码编辑。
- 工作放不进一个上下文窗口、又能拆成并行片段：用「强模型带队 + 便宜 worker 并行」的多代理模式。
- 大部分轮次是常规操作、偶尔需要更强模型：可试 advisor，但先测 consult rate，不要当默认。
- 在 Claude Code + Fable 5.2（或类似编码 agent）上做复杂编码、重构、迁移、长任务，且失败表现是中途停、未完成就宣布结束、长时间静默、审批含糊、最终报告要打开文件才懂：按做法 F 逐项加提示、清旧记忆。
- 想验证「Anthropic 指南是否建议 high 起步」这类二手说法：先 `/effort status` 看当前默认，再用同一组任务做 A/B。

**不适用或需谨慎**

- 手动档位（B1）只在 Opus 5.5 / Fable 5.1（以及 Fable 5）上测过；effortless 只在 Opus 5.5 / Sonnet 5.5 上 effort 会变化。B2 的选型表来自厂商 playbook，覆盖 Haiku 5.5、Sonnet 5.5、Opus 5.5、Fable 5.2，但依据主要是厂商基准与演示，不是你的任务数据。其他模型、其他版本的档位与效果没有依据。
- 失败原因是「方向选错」时，升档基本无效——提高档位不会修复走错路线，也不会给模型新知识。
- spec 写得越细，升档带来的差异越小；这种情况下先补 spec 比加档更划算。
- 手动档位没有给出任何时间/事件触发机制或持续运行的编排方式，所以不要指望靠档位实现「自动持续跑任务」。effortless 有状态、阈值、事件触发（上下文占用、缓存变冷、限额、新版本），但那是会话内的提示与辅助，也不是无人值守的自动编排。
- 手动档位的成本数据来自厂商内部运行，具体倍率需自己试，不能当公开基准用。
- effortless 是会在本机运行代码的第三方插件（源码在 `hooks/`，会启动 `claude` 自身、`git`），节省幅度与 92%–99% 的 judge 准确率都是作者自测；建议只在非关键项目小范围试装。
- 做法 B0 的证据只是一条推文：原文只展示 `/model opus`、`/effort medium`、`/effort high` 三个命令，之后疑似截断，没有完整 harness 流程、案例或效果数据；不能把标题里的「蓝图」当成完整方案。
- 做法 B0 原文未说明命令可用的版本/权限、何时切回 medium、如何判定「深度推理/验证」；这些需要你自己按任务边界定规则并记录。
- 做法 F 的材料只是对完整指南的二手摘要：第 3 项「Finishing work」块原文没给文本，只给链接和效果；不能自行编造，必须先取得完整文本再粘贴。
- 所有权提示（ownership line）原文称会增加 70–80% token，部分套餐会计入 usage credits；成本敏感时先只对复杂任务开。
- 做法 F 给出的数据（重复代码合并约 75% 对不足 10%、未完成会话约减半等）没有样本量、任务类型和评分方法，不能当已验证结论。
- F 的「复杂长编码从 high 起步」与 B0 的「默认 medium、验证时 high」适用面不同：B0 是通用最小基线，F 针对的是低档更容易中途停的长任务；不要互相替代，按任务选并记录。
- 「Enter 会按模型保存 effort」是原文说法，先自己验证；不要假设所有版本/套餐行为一致。
- advisor 不是默认：平台成本指南偏谨慎，四个配对里没有一个明显胜过单用 executor；示例里只高 1.7 分但贵约 2.1 倍，已在运行波动边缘，约等于提高 effort 能买到的提升。
- 多代理不适合只有一条依赖链、或工作能放进一个上下文窗口的情况：规划和合并的成本会超过节省。
- 切换模型有成本：prompt cache 属于写它的模型，新模型第一轮会对整段对话付 cache-write 价格；向下换层通常还会丢失先前推理。
- `opusplan` 把代码编辑放到 Sonnet，和「代码编辑与判断留给主模型」的建议相反，先测再决定是否设为默认。
- `haiku` 别名在 Anthropic API 上解析到 Haiku 5.5 需要 Claude Code v2.1.293 或更高；在 Amazon Bedrock、Google Cloud、Microsoft Foundry 和 Claude Platform on AWS 上仍解析到 Haiku 4.5。
- 迁移前不做兼容性检查会踩 400：thinking block、`tool_choice`、`temperature`/`top_p`/`top_k`、assistant turn 结尾等都有约束。

## 前置条件

- 在 Claude Code 中使用，并已登录；或使用 Claude API/Claude Platform。
- 做法 B1（手动档位）：模型为 Opus 5.5 或 Fable 5.1（文章只测了这两个以及 Fable 5）。作者提到，这些模型的 effort 调整不会破坏 Claude Code 的 prompt cache（原文未给出测量方法）。
- 做法 B0（最小配置）：`/model` 与 `/effort` 命令可用，且账号可用 opus 模型；原文未说明版本、权限或命令可用性，先确认命令能执行。
- 做法 B2/B3：能访问对应模型；Claude Code 的默认 effort 可能与 API 不同，先跑 `/effort status` 看当前设置。
- 做法 C（effortless）：插件会改变 Opus 5.5 / Sonnet 5.5 的 effort；默认的 Haiku judge 不需要 key，跑在你自己的 Claude 登录上；可选 Jev 需要 TypeSafe key。终端 CLI 环境需要 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`。作者建议装前先读插件 `hooks/` 里的代码。
- 做法 D：子代理配置放在 `.claude/agents/`；子代理有自己的上下文窗口，按它运行的模型计费。advisor 是 beta，先确认 executor 接受哪些 advisor。多代理需要能拆分任务并合并结果。
- 做法 E：切模型前能跑 `/compact` 或开新会话；自己改历史时保持 append-only；能按 content block 的 type 读响应。
- 做法 F：Claude Code + Fable 5.2；能修改项目或用户记忆、skill/agent 文件；能打开原文链接取得完整「Finishing work」块；能一次只加一项并记录效果与 token；能接受 ownership line 带来的 token 增幅。
- 你手上先有一个大致成形的需求描述，哪怕不完整——这是循环第 1 步成立的前提。
- 做自有任务测量时，能为每个任务写结果检查（测试通过、ticket 关闭、行数正确等），能从响应的 `usage` 字段记录成本，并能让每次运行单独开 session，避免共享 cache。
- 注意原文注明的测评环境条件：Opus 5.5 的响应上限为 128k tokens，且没有 GitHub 或 PyPI 访问权限；安全类任务在无网络访问下运行。这说明网络、包源等工具可得性会影响结果。

## 操作步骤

先跑做法 A 决定一段工作在时间上怎么分档（先低后高），再用 B 或 C 决定每一段或每一次一次性任务用哪个模型、哪一档 effort。**B 与 C 会互相打断**：effortless 的 Auto 开着时，你手动在应用里改 effort 会自动关掉 Auto（作者的说法是「你永远赢」），所以日常要么让 C 自动路由，要么用 B 手动拧，别同时要求两者。

模型和 effort 是两个旋钮。按 B3 的顺序排查：先确认模型能自验，再升 effort，最后换模型；不要一上来就换最大模型。做法 F 处理的是另一个层面：提示词、角色、收尾、审批和旧记忆。档位对了但提示层没配好，编码 agent 仍可能中途停或没做完就宣布结束。

### 做法 A：功能开发循环（作者自述在用的做法）

1. 给 Claude 一份 spec，并让它就你遗漏的细节采访你；同时给它自验手段（测试、构建或调用端点的脚本）。
   - 前提：你手上已有一个大致成形的需求描述，哪怕不完整。
   - 预期结果：spec 中被你漏掉的约束被补上，后面的低档实现不容易跑偏。这是整个循环里最关键的一步；没有自验手段，后面的高档验证会变成「它说自己对了」。
2. 用低档（low）实现它。
   - 预期结果：得到一个抓住要点、可迭代的基底，而不是最终版。
3. 审查实现，确认它抓住了要点（gist）正确；需要的话继续在低档迭代。
   - 预期结果：方向正确性由你这一关保证。原文的失败分布结论是，升档只减少「缺边界情况」类失败，不修复「走错方向」的失败——所以方向核对必须放在低档阶段由人来做。
4. 用高档（high）做验证和测试。
   - 预期结果：补上低档常漏的边界情况，以及「新写的测试是否真能抓住原始 bug」这类自查（原文把「没有检查自己的新测试能否抓住原始 bug」列为低档的失分点，高档会去检查）。
5. （可选）如果第 4 步本身就是边界情况密集的验证——安全、硬件、代码审查、性能优化、生产要求高的复杂任务——可以再往上升档。
   - 代价见下方成本预期表；也可以按 B3 试「更大模型 + 更低 effort」，不一定要继续加档。

### 做法 B：手动选档与选模型

**做法 B0：最小配置基线（来自单条推文，先小范围试）**

1. 默认把模型设为 opus、努力程度设为 medium：

```
/model opus
/effort medium
```

   - 前提：`/model` 与 `/effort` 命令可用，账号可用 opus；原文未说明版本/权限。
   - 预期结果：普通任务以中等算力运行，先建立基线。

2. 当任务需要更深入的推理或验证时，把努力程度调高：

```
/effort high
```

   - 预期结果：模型在深度推理/验证环节投入更多算力。原文没有说明何时切回 medium、如何判定「深度推理/验证」，也没有给出除该控制项外的其他 harness 步骤；试用时按任务边界手动切换并记录效果。

3. 本手册的操作建议（不是原文结论）：把 high 只留给验证、测试、安全/性能等边界情况密集的环节；该环节结束后切回 `/effort medium`，避免下一轮普通任务继续用高档。

**做法 B1：按任务类型查 effort 表，并在对话中途切换**

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

**做法 B2：按任务选起始模型和 effort（来自模型选型 playbook）**

不确定时用 Opus 5.5 medium。先跑 `/effort status` 看 Claude Code 当前 effort，再按表选起点；表里的「默认」指该模型在 API 的默认 effort。

| 任务 | 起始模型 | 起始 effort | 依据 |
| --- | --- | --- | --- |
| 日常工程与调试、多 PR 功能 | Opus 5.5 | medium（默认），再 high | 日常任务成本/能力平衡 |
| 分类、路由、打标、高量抽取 | Haiku 5.5 | medium（默认） | 家族中最低成本/延迟 |
| 搜索文件、读日志、总结的子代理 | Haiku 5.5 或 Sonnet 5.5 | 模型默认 | 错误便宜可发现，主模型做判断 |
| 聊天和交互会话 | Sonnet 5.5（简单高量聊天可 Haiku 5.5） | low 或 medium | Sonnet 5.5 在 low/medium 快 |
| 范围明确的编码：bug 修复、功能迭代、按 spec 开发 | Sonnet 5.5 | medium，难任务再 high | 处理 scoped task，token 价为 Opus 一半 |
| 日常文档、幻灯片、表格 | Sonnet 5.5 | high（默认；Claude Code 中 medium） | 迭代快、设计感强；复杂财务模型或大量素材文档从 Opus 5.5 开始 |
| 重复运行的 agent 任务：调查、评审、起草 | Sonnet 5.5 | medium | 定义良好的重复任务很少需要更大模型 |
| 计算机使用和重视觉工作流 | Opus 5.5 | medium | 长 agentic loop，多截图/图像 |
| 大重构/迁移、架构规划、领导多个子代理 | Fable 5.2 | medium，再 high（API 默认 high） | 技术领域最强 GA 模型 |
| 深度研究、科学或定量分析 | Fable 5.2 | medium，再 high（API 默认 high） | 为最难技术项目构建 |
| 不确定 | Opus 5.5 | medium（默认） | Claude Code 默认/平台文档推荐起点 |

用法：先用表选一个起点，再按 B3 的顺序只改一个变量。不要因为表里写了 Fable 就默认上 Fable；你的任务如果只是范围明确的编码，Sonnet 5.5 medium 更划算。

**做法 B3：换模型前的排查顺序（来自同一份选型 playbook）**

1. 先确认模型能否自验：给它测试、构建或调用端点的脚本。
2. 把 effort 提高一档。
3. 再换到上一级模型，并从比小模型更低的 effort 开始。
4. 如果结果能自动检查，全部先用低 effort 跑，只把失败项用高 effort 重跑。

三条判断规则：

- 超过 `high` 后，再高一档的成本可能等于换更大模型；如果你已经在 `high` 以上，优先试「更大模型 + 更低 effort」。
- 反过来，降一档也可能以更低价格得到需要的结果，先试再排除。
- 提高 effort 只帮助模型想更久、调用更多工具、更多自检，不会给它新知识或新技能。

**B1 与 B3 在 high 以上的分歧**：B1 的 `max` 来自官方博客，给「希望 Claude 完全自主解决困难问题」的场景；B3 来自选型 playbook，主张超过 high 后优先试更大模型 + 更低 effort。两者都保留：需要端到端自主跑完、且边界情况密集，可按 B1 试 max；只是要更高质量、且可以换模型，先按 B3 试更大模型 + 更低 effort。用自己的任务对照，不要只凭标签选。

**B0 与 F 的分歧**：B0 主张默认 `opus` + `medium`，只在深度推理/验证时升 `high`；做法 F 针对 Fable 5.2 的复杂编码和长任务，主张从 `/effort high` 起步，因为原文警告低 effort 更容易中途停止。两者适用面不同：想先建立一个通用、便宜的基线，用 B0；任务本身是复杂长编码、且失败表现是「中途停/没做完就结束」，用 F 的 high 起点，并记录 token 成本和完成率。不要用 B0 的 medium 基线去否定 F 的长任务起点，也不要用 F 的 high 起点把所有日常任务都开成高档。

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

### 做法 D：子代理、advisor、多代理

**D1：把旁路工作放到 Haiku/Sonnet 子代理**

原则：小模型只做「错了容易发现」的工作（找文件、跑测试、读日志、总结），代码编辑和判断留给主模型。

下面这个子代理配置可直接保存为 `.claude/agents/log-reader.md`：

```
---
name: log-reader
description: Reads test output and logs, and reports each failing case. Use after a test run.
tools: Read, Grep, Glob, Bash
model: haiku
---

Read the logs you're given. For each failure, report the file, the test name and the first error line. Don't edit any files.
```

配套设置：

- `CLAUDE_CODE_SUBAGENT_MODEL` 可设置未指定模型的子代理默认模型。
- `ANTHROPIC_DEFAULT_HAIKU_MODEL` 可固定 `haiku` 别名指向的模型。
- 当前 Claude Code 内置 Explore 子代理跑在会话模型上，不一定自动用 Haiku；要便宜就自己定义一个名为 `Explore`、`model: haiku` 的子代理。
- `haiku` 别名在 Anthropic API 上解析到 Haiku 5.5 需要 Claude Code v2.1.293 或更高；在 Amazon Bedrock、Google Cloud、Microsoft Foundry 和 Claude Platform on AWS 上仍解析到 Haiku 4.5。

**D2：`opusplan` 先测再用**

`opusplan` 别名：plan mode 用 Opus 规划，执行用 Sonnet。它把代码编辑放到 Sonnet，和 D1 的「代码编辑留给主模型」相反。原文要求先在自己任务上测 `opusplan`，再决定是否设为默认。

**D3：advisor（beta）先测 consult rate**

advisor 用一个更快更便宜的 executor 跑任务，中途可向更强的 advisor 求助；大部分 token 按 executor 价格计费，只有 executor 真的询问时才用到 advisor，低 effort 时询问更少。先确认 executor 接受哪些 advisor：例如 Sonnet 5.5 executor 接受 Fable 5.2、Opus 5.5、Opus 5、Sonnet 5.5；Fable 5.2 executor 只接受 Fable 5.2 或 Mythos 5.2。

平台成本指南偏谨慎：四个配对里没有一个明显胜过单用 executor。给出的内部编码基准例子是 Opus 5.5 high + Fable 5.1 advisor 得 90.1%、每次尝试 $2.92，比单用 Opus 5.5 high 高 1.7 分但贵约 2.1 倍，已在运行波动边缘，约等于提高 effort 能买到的提升。所以不要把 advisor 当默认；先测 consult rate 和每次完成任务的成本。

**D4：多代理——「强模型带队 + 便宜 worker 并行」**

做法：顶层模型拆任务，把片段交给多个更便宜的 worker 并行做，再合并结果。原文在约 2200 万 token 源码的内部缺陷搜索基准上，Opus 5.5 带队、最多 25 个 Sonnet 5.5 worker，比单用 Opus 5.5 默认 effort 便宜约三分之一，得分大致相同。Claude Platform 的 Claude Managed Agents 提供 coordinator + worker roster。

边界：只有一条依赖链、或工作能放进一个上下文窗口时不要用，规划和合并的成本会超过节省。只有当多代理方案击败 score–spend 图上每一个单模型点时，才保留它。

### 做法 E：切模型与迁移检查

1. **在自然断点切模型，别让新模型从零吞完整历史。** prompt cache 属于写它的模型，新模型第一轮会对整段对话付 cache-write 价格。Claude Code 里先跑 `/compact`，或开新会话并给一份简短书面计划；API 里用「到目前为止的工作摘要」开新模型对话，而不是完整历史。

2. **注意 thinking block 兼容。** Opus 5.5 可读 Sonnet 5.5/Haiku 5.5 的 thinking；Sonnet 5.5 可读 Haiku 5.5 的；Fable 5.2 可读 Opus/Sonnet/Haiku 的。向下换层通常会丢失先前推理；新模型读不到时 API 会丢弃这些 block，请求仍成功。Fable 5.2 切到其他 GA 模型通常会丢推理。

3. **迁移前逐项检查：**

   - Fable 5.2 的 preserved thinking 对所有 API 账号生效；如果 thinking block 之前的内容（system prompt、tools、更早消息）变了，API 会返回 400，除非你选择丢弃受影响的 thinking。用 Claude Code、Claude Agent SDK 或 Claude Managed Agents 不需要改；自己改历史就保持 append-only，并在切换前测试。
   - Thinking：Opus 5.5 和 Fable 5.2 总是思考，请求关闭 thinking 会报错；Sonnet 5.5 默认思考，`between_tools` 只让它在工具调用间隙思考；Haiku 5.5 默认思考，在 `high` effort 或以下可关闭。所有模型都应按 content block 的 type 读取响应。
   - 强制工具使用：在 Sonnet 5.5、Opus 5.5、Fable 5.2 上，`tool_choice` 设为 `any` 或 `tool` 会返回 400。改用 `auto`，给工具标 `strict: true`，并在 prompt 里说明何时使用。
   - Computer use：Opus 5.5、Sonnet 5.5、Haiku 5.5、Fable 5.2 只支持 Claude API 和 Google Cloud 上的 Claude Models（Google managed）的 `computer_toolset_20260801` 工具集。
   - Haiku 4.5 迁到 Haiku 5.5：用 effort level 替代 `budget_tokens`；去掉非默认的 `temperature`、`top_p`、`top_k`（会 400）；消息以 user turn 结尾，最后给 assistant turn 让它续写也会 400。
   - 安全回退：Opus 5.5、Sonnet 5.5、Fable 5.2 会跑安全分类器，最常标记网络安全和生物内容；Claude Code 中被标记的请求可在旧模型上重跑，transcript 会提示。Fable 5.2 保留 Fable 5.1 的回退模型：网络安全请求回退到 Opus 4.8，生物请求回退到 Opus 5。
   - 如果一个系统跑多个模型，所有请求按最严格的那个模型来写：历史 append-only、`tool_choice: auto` + strict tools、按 type 读 content block、prompt 和工具描述精确到最字面的模型也能懂。这样上下换层不用改代码。路由规则简单（例如每类步骤一个模型）时，让代码选模型，不要让模型自己选。

### 做法 F：Fable 5.2 编码会话的配置层修正（新增，二手摘要，先小范围试）

这条做法的核心是把默认 effort 从 medium 调到 high，并用代码库所有权、收尾要求、进度播报、精确审批和谨慎删除等提示，改变编码 agent 的续跑与收尾行为。它来自一条对完整指南的二手摘要，不是原始指南，也没有实验设计；按「一次只加一项、记录前后指标」的方式试。

**前提**：使用 Claude Code + Fable 5.2；能修改项目或用户记忆、skill/agent 文件；能打开原文链接取得完整「Finishing work」块；能记录 token/usage。以下只列原文明确给出的内容；第 3 项原文只给了链接和效果，未给完整文本，不能照抄。

1. 调整 effort。在 Claude Code 输入：

```
/effort high
```

   - 原文称 Enter 会按模型保存。适用复杂编码和长任务；原文警告低 effort 更容易中途停止。
   - 与 B0 的差异见上文「B0 与 F 的分歧」：B0 默认 medium，F 让复杂长编码从 high 起步。

2. 加入代码库所有权提示：

```
You are the owner and long-term maintainer of this codebase, and its design is up to you.
```

   - 原文称这能把重复代码合并率从不足 10% 提高到约 75% 的运行比例。
   - 代价：原文称 ownership line 单独增加 70–80% token，部分套餐会计入 usage credits。

3. 使用「Finishing work」块。原文未给出块文本，只给了指南链接和效果：工作未完成就结束的会话约减半。**必须先打开原文链接取得完整文本再粘贴，不要自行编造。**

4. 加入进度播报：

```
Every few tool calls, give the user a one-line update on where things stand.
```

   - 原文称可避免长时间静默。

5. 审批时明确批准内容，不用笼统的「go」：

```
yes, run the migration on staging
```

   - 原文要求说清楚你到底在批准什么。

6. 把删除类禁令改成先询问：

```
ask before deleting files
```

   - 不要写「never delete files」这类绝对禁令；原文称模型会把每个 never 读成绝对规则。

7. 清理旧记忆里的「never retry」等过时谨慎指令；原文称模型会在这些指令失效后继续遵守。

8. 删除「answer directly without deliberating」类提示；原文称 medium 及以上仍会思考，应通过 effort 调节，而不是靠这句话。

9. 删除提示里的大 token 预算；原文称 Anthropic 测试中成本下降、结果不变。

10. 重读 skills 和 agent 文件里所有「delegate this」行；原文称提示一旦邀请委派，模型会快速启动子代理，需要重新设定子代理预期。

11. 删除 Opus 5.5 时代「treat that answer as done」类行；原文称保留这类行会让模型几乎不再标记自己的错误。

12. 最终报告加读者提示：

```
Write for an intelligent but low-context reader.
```

   - 原文称这样最终报告可以不打开文件也能读懂。

建议顺序：`/effort high` → ownership line → 清理旧记忆，然后一次一项增加。原文承认几乎每项都增加 token；不要一次全加，否则无法判断哪一项有效、哪一项只是增加成本。

### 做法怎么选

- 想稳定拿到可用结果、并且愿意自己在中间审查一次 → 用做法 A 走完四步循环。
- 只想快速要一个起点、有人盯着 → 低档（B1）。
- 任务是边界情况密集的验证/修复 → 直接上 high，必要时再升；已在 high 以上先按 B3 试更大模型 + 更低 effort（B1/B3）。
- 希望 AI 端到端自主把难题做完 → max（B1）。
- 想先做一个最小改动、不装插件 → 用 B0：默认 `/model opus` + `/effort medium`，验证时 `/effort high`。它只是一条控制项，不是完整流程，先按试用 4 做对照。
- 任务类型差异大、想按任务选起点 → 用 B2 表；不确定就 Opus 5.5 medium。
- spec 已经写得很细 → 先别升档，因为原文的高度指定构建任务实验显示各档位表现明显趋同（设计和实现相似，只是细节不同，高档还花时间简化了一些细节）。
- 日常 prompt 难易长短混杂、不想每次手动判断，且能接受第三方插件在本机跑代码 → 用做法 C，先只保留 Haiku judge，再用 `/effortless stats` 和 `/effortless bench` 核对自己的花费与判断命中率。
- 有大量搜索/读日志/跑测试/总结 → 先加 D1 子代理，成本最低、风险最小。
- 大部分轮次常规、偶尔需要更强判断 → 试 D3 advisor，但先测 consult rate。
- 工作放不进一个上下文窗口、且能并行拆片 → 试 D4 多代理，并用 score–spend 图确认它击败单模型。
- 准备换模型/迁移 → 先按 E 做兼容性检查，并在自然断点切。
- 复杂长编码任务，失败表现是中途停、没做完就宣布结束、长时间静默、审批含糊、最终报告不自包含 → 按 F 一次只加一项；先只对这类任务用 `/effort high` 和 ownership line，再逐步加进度播报、精确审批、删除前询问，并清理旧记忆。
- 日常简单任务、或你还在建立通用基线 → 先用 B0 的 `opus` + `medium`，不要因为 F 就把所有会话都设成 high。

## 怎么判断变好了

### 最小试用（任选其一或组合）

**试用 1：跑一遍四步循环。** 挑一个你下周本来要做的新功能，按做法 A 走：让 Claude 先采访你补齐 spec → low 实现 → 你 review、按需 low 迭代 → high 验证测试。对照组：用你原来的习惯做法（比如直接中/高档一次做到底）做另一个规模相当的功能。

**试用 2：对同一任务做档位对照（成本最低、信号最强）。** 选一个「边界情况多」的任务——例如输入校验/清洗、HTML 或模板消毒、性能优化、在存量代码里修 bug——分别在 low 和 high（或 max）各跑一次，比较结果。

**试用 3：装 effortless 后核账。** 在非关键项目里装好、先用默认 Haiku judge；跑 `/effortless stats` 看本次会话 Auto 引导的各 effort 花了多少、judge 花了多少；跑 `/effortless bench` 用 `bench/judge-cases.json` 里的带标签 prompt 给你的 judge 打分；再跑 `node bench/quality.mjs` 看降级后质量是否够用。满意再常驻。

**试用 4：B0 最小配置对照。** 选一组同类任务，先用 `/model opus` + `/effort medium` 跑基线；再对其中需要深度推理或验证的同类任务使用 `/effort high`，保持提示词、输入和验收标准一致。观察任务完成率、返工次数、中途偏离或遗漏步骤数、人工复核耗时，以及 token/费用/时延。若 high 在难题上明显减少返工和遗漏且成本可接受，就保留为切换规则；否则只用 medium。

**试用 5：B2/B3 模型对照。** 用 `/model` 在 backlog 里挑一个任务跑两个模型，比较 `/usage` 报告；每次单独开 session，避免共享 cache。先按 B3 只改一个变量：同一任务先升一档 effort，再换上一级模型并从更低 effort 起步，看哪一步带来提升。

**试用 6：子代理/多代理/advisor 小范围。** 先加 D1 的 `log-reader` 子代理，观察主会话的上下文占用和费用是否下降、读日志的准确率是否够用。再试 D3 advisor 时记录 consult rate 和每次完成任务的成本；试 D4 多代理时只选能并行拆片、且放不进一个上下文窗口的任务。

**试用 7：自有任务 score–spend 测量（最可靠）。**

1. 抽一批真实任务，为每个任务写结果检查，例如测试通过、ticket 关闭、行数正确。
2. 每个候选模型跑两到三个 effort 档，每次单独开 session，避免共享 cache。
3. 从每个响应的 `usage` 字段记录每个已完成任务的成本。
4. 画「得分 vs 花费」图；只有多模型组合击败图上每一个单模型点时，才保留多模型方案。
5. 在切流量前，让获胜方案在真实流量的一小片上 shadow 运行。

原文给的判据是：如果低档失败是因为「缺边界情况 / 测试没抓到 bug」，升档应有效；如果失败是「需求读错 / 方向选错」，升档基本无效，此时应该改 spec，而不是加档。

**试用 8：做法 F 的逐项 A/B。** 选 5–10 个相似的编码任务做基线，记录当前设置下的完成率、未完成会话数、人工干预次数、token 成本、审批错误、最终报告是否需要打开文件才能理解、重复代码处理。然后一次只加一项：先对复杂任务用 `/effort high`，再加 ownership line，再加进度播报和 `ask before deleting files`；第 3 项先从原文链接取得完整「Finishing work」块后再试。每轮用同一组任务对比前后指标；若完成率或返工率改善不足以抵消 token 成本，就回退该项。原文没有给出建议的试用时长和基准值，至少覆盖 5–10 个相似任务的前后对照再下结论。

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
- 做法 B0 对照里的中途偏离或遗漏步骤数、人工复核耗时：这两项来自单条推文给出的试用建议，原文没有给基准值，需要你自己在同一组任务上前后对比。
- 做法 F 对照里的未完成就结束的会话比例、长时间静默次数、人工接管次数。
- 审批是否说清了批准内容（例如「在 staging 跑迁移」而不是「go」），以及因审批含糊导致的返工。
- 最终报告的自包含程度：不打开文件能否读懂。
- 旧记忆清理后，是否还出现「never retry」类过时行为。
- ownership line 的 token 增幅（原文称 70–80%）。
- 子代理：主会话上下文占用、子代理调用次数、读日志/找文件的准确率、按子代理模型计费后的总成本。
- advisor：consult rate、每次完成任务的成本、得分是否值得比单用 executor 更贵。
- 多代理：与单模型 best point 比，得分是否大致相同或更好、成本是否真的低三分之一左右。
- 切模型：新模型第一轮的 cache-write 成本、是否丢失 thinking、迁移后是否出现 400。

### 试多久

原文没有给出建议的试用时长，只说它自己的比较方式是每个任务跑 5 次尝试后再统计（失败分布共 370 次尝试）。所以试用至少要覆盖到你手上同一类任务的多次尝试再下结论；单次运行不足以判断——作者自己就声明其耗时表来自单次运行（toy examples / individual runs），不是多次采样的统计。effortless 这边，judge bench 是 73 例的小集合，作者写明 judge 不完全确定、重跑会差几个点；质量 bench 自认「one run, one grader, small set」，所以要多跑几轮、换几个自己的任务再判断。做法 B0 只有一条推文，没有给出试用时长，建议至少跑完一组同类任务的基线与 high 对照再决定是否保留。B2/B3 的模型对照也至少要覆盖一组真实任务、每个候选跑两到三个 effort，并用独立 session 记 `usage`；不要用一次对话里的模型切换来比成本。做法 F 同样没有给试用时长，建议覆盖 5–10 个相似编码任务的前后对照，并且每轮只加一项；不要用一次会话的观感判断 ownership line 或 Finishing work 块是否有效。

## 常见坑

- **拿升档去修「方向错」。** 原文失败分布的结论是：提高 effort 会减少「缺边界情况」类失败，但不会修复模型走错路线的失败。方向问题只能在 spec 和人工审查环节解决。
- **以为升 effort 会给新知识。** 它只让模型想更久、调用更多工具、更多自检；不会给它新知识或新技能。缺知识先补材料/工具，不是加档。
- **一上来就换最大模型。** 先确认自验、再升 effort、最后换模型；换模型时从比小模型更低的 effort 起步。超过 high 后继续加档，成本可能等于换更大模型。
- **spec 已经很细还盲目开最高档。** 高度指定构建任务的实验里各档位表现趋同，高档还额外花时间简化细节，收益小、成本高。
- **用单次运行或单点耗时下结论。** 原文的玩具实验与耗时表都是 individual runs，不是统计；档位效果要用同一任务的多次尝试看。effortless 的 judge bench 与质量 bench 也都是小样本，别把一次跑分当定论。
- **把厂商内部数字当公开基准。** 档位数据来自作者内部跑，每任务 5 次尝试，Fable 5.1 关闭了生产安全干预；在 Claude 产品里 Fable 5.1 的部分安全请求会被转给 Opus；安全任务在无网络访问下运行。因此这些数字与公开排行榜或发布文章不一致。
- **以为档位标签是统一的。** low / medium / high / xhigh / max 在不同图表中不完全一致，规则表与基准图用的档位标签并不完全对齐；不同模型的默认 effort 也可能不同，先 `/effort status`。
- **忽略题目难度差异。** Terminal-Bench 3.0 的题目复杂度，作者自己说「远高于我平时会遇到的平均任务」，所以这些对比的绝对收益未必线性迁移到日常开发。
- **忽略环境与权限条件。** 测评时响应上限 128k tokens、无 GitHub 或 PyPI 访问；网络、包源等工具可得性本身就是影响结果的外部条件。
- **把「max 自主」当成自动化编排。** 原文只把 max 定义为让 Claude 完全自主解决困难问题，没有任何时间/事件触发机制或持续运行的做法。effortless 虽然会在上下文占用 30% 起、每第二条消息评估 handoff，在缓存变冷、限额过 80%、有新版本时给提示，但这些只是会话内提示与告警，仍不是无人值守的自动编排，别自行延伸。
- **不读第三方插件的代码就装。** effortless 会在本机执行 `hooks/` 里的代码，会启动 `claude` 自身（更新/卸载时）、`git`（查新版本），Update 时把新版本文件复制进当前会话所在目录。只在非关键项目小范围试装。
- **把 92%–99% 的 judge 准确率当既成事实。** 那是 73 例小集合上的作者自测，重跑会差几个点；质量 bench 也只有 30 条 prompt、一次盲评。
- **一边要自动路由一边手动拧 effort。** 你在应用里手动改 effort 会关掉 Auto（「你永远赢」），B 和 C 同时用会互相打断。
- **Jev key 粘贴方式会明文落盘。** 粘进 setup guide 或 Judge 卡片会明文写入 `~/.config/jev/.env`；共享机器上优先用 `/plugin configure` 输入，让 key 存在 Claude Code 的安全存储里。
- **指望短跟进被重新分诊。** `go`、`ok`、`yes` 这类短跟进沿用已选的 effort，不调用 judge。
- **忘了插件不高于当前会话模型。** 便宜模型只在单条 prompt 上生效，主会话模型与其 cache 不变。
- **把一条推文当完整蓝图。** B0 原文只展示 `/model opus` 和 `/effort` 的控制项，在 `/effort high` 后即结束，疑似截断；没有完整 harness 流程、案例、数据或对比。不要自行补全为「Anthropic 官方完整方案」。
- **升到 high 后忘了切回。** B0 原文没有说明何时切回 medium；本手册建议在验证/深度推理环节结束后切回 `/effort medium`，否则下一轮普通任务会继续用高档。
- **以为 opus + effort 就能保证「不迷失」。** 推文标题这么说，但正文没有效果数据；只能把「不迷失」当作者主张，用试用 4 的指标自己验证。
- **在对话中途随便换模型。** prompt cache 属于写它的模型，新模型第一轮对整段对话付 cache-write；先 `/compact` 或开新会话带书面计划。
- **向下换模型还指望保留推理。** 向下换层通常会丢失先前 thinking；Fable 5.2 切到其他 GA 模型通常会丢推理。
- **用 `opusplan` 却不测代码质量。** 它把代码编辑放到 Sonnet，和「代码编辑留给主模型」相反；先在自己任务上测，再决定是否设为默认。
- **把 `haiku` 别名当 Haiku 5.5。** 在 Bedrock、Google Cloud、Microsoft Foundry、Claude Platform on AWS 上仍解析到 Haiku 4.5；Anthropic API 上要 Claude Code v2.1.293+。
- **让便宜子代理做代码编辑或判断。** 小模型只做「错了容易发现」的旁路工作；代码编辑和判断留给主模型。
- **把 advisor 当默认。** 四个配对里没有一个明显胜过单用 executor；示例只高 1.7 分但贵约 2.1 倍。先测 consult rate。
- **在单依赖链/单上下文窗口上用多代理。** 规划和合并成本会超过节省；只有多代理击败 score–spend 图上每个单模型点才保留。
- **迁移不检查 400 类问题。** `tool_choice: any/tool`、非默认 `temperature`/`top_p`/`top_k`、以 assistant turn 结尾、改 thinking block 之前的内容，都可能 400。按 E 的清单先测。
- **测成本时共享 cache。** 每个候选模型/effort 单独开 session，从 `usage` 记每个已完成任务的成本，否则比出来的成本失真。
- **把「never delete files」写成绝对禁令。** 原文称模型会把每个 never 读成绝对规则；改成 `ask before deleting files`，让删除前先确认。
- **旧记忆里的「never retry」不清理。** 原文称模型会在这些指令失效后继续遵守；换模型或换任务类型时，重读过时记忆。
- **保留「answer directly without deliberating」。** 原文称 medium 及以上仍会思考，应通过 effort 调节，而不是靠这句话。
- **保留提示里的大 token 预算。** 原文称 Anthropic 测试中成本下降、结果不变；预算数字可能只是无谓的约束。
- **保留「treat that answer as done」类行。** 原文称保留这类行会让模型几乎不再标记自己的错误；Opus 5.5 时代的行要清掉。
- **提示里留「delegate this」不重设预期。** 原文称模型会快速启动子代理；重读 skills 和 agent 文件里的委派行，重新设定子代理边界。
- **审批只回「go」。** 原文要求明确批准内容，例如 `yes, run the migration on staging`；笼统的 go 会让模型不知道你到底批准了什么。
- **直接照抄缺失的「Finishing work」块。** 原文只给链接和效果，没有给文本；必须先取得完整文本，不要自行编造。
- **以为 `/effort high` 会按模型保存而不验证。** 原文称 Enter 会按模型保存，但这是二手说法；先自己确认当前会话的 effort 状态和行为。
- **把二手摘要当 Anthropic 指南原文。** 做法 F 的推文是摘要，第 3 项还缺文本；数据没有样本量、任务类型和评分方法，不能当已验证结论。
- **忽略 ownership line 的 token 增幅。** 原文称单独增加 70–80% token，部分套餐计入 usage credits；成本敏感时先只对复杂任务开。
- **一次加十项，无法归因。** 做法 F 建议一次只加一项：先 `/effort high`，再加 ownership line，再清理旧记忆，然后逐项增加；否则不知道哪项有效、哪项只是增加成本。
- **把 F 的 high 起点和 B0 的 medium 基线混为一谈。** 两者适用面不同：B0 是通用最小基线，F 针对复杂长编码、低档容易中途停的任务；按任务选，不要互相替代。

## 证据与来源

**做法 A / 做法 B1 与档位概念**出自《Using Claude Code: Spending your effort》（Claude Code 官方工程博客，作者 Thariq Shihipar，原文 claude.dev）。作者供职于 Claude 团队，立场不完全中立。

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

**做法 B0（`/model opus` + `/effort medium/high`）**出自 @Arindam_1729 的一条推文。原文只给出可复制的 slash command 和「普通任务 medium、深度推理或验证 high」的使用规则；标题称 Anthropic 给出了构建「不会中途迷失的 AI 员工」的蓝图，但正文在 `/effort high` 后即结束，疑似截断，没有完整 harness 流程、案例、数据或对比。因此：`/model opus`、`/effort medium`、`/effort high` 是原文给出的操作；「蓝图」「不迷失」「效果更好」都只是作者主张，未给量化支撑。适用条件（Claude Code 支持相应命令、opus 可用、任务可按难度拆分）也是原文的隐含前提，原文未说明版本与权限。

**做法 B2/B3、D、E**出自《Which Claude model should you build with? Fable, Opus, Sonnet, or Haiku》这份模型选型 playbook。它给出任务→起始模型→effort 表、先调 effort 再换模型的顺序、子代理配置、advisor、多代理、迁移兼容检查和自有任务测量步骤。其结论是「按任务先选起点，再先调 effort、再换模型，最后用自己的任务测成本与通过率」，不要直接照搬型号和价格。依据主要是厂商基准与演示，需在自己的任务上验证。

原文给出的数据：

- 多代理：约 2200 万 token 源码的内部缺陷搜索基准，Opus 5.5 带队、最多 25 个 Sonnet 5.5 worker，比单用 Opus 5.5 默认 effort 便宜约三分之一，得分大致相同。
- advisor：内部编码基准例子 Opus 5.5 high + Fable 5.1 advisor 得 90.1%、每次尝试 $2.92，比单用 Opus 5.5 high 高 1.7 分但贵约 2.1 倍，已在运行波动边缘，约等于提高 effort 能买到的提升。
- 子代理/模型别名：`haiku` 别名在 Anthropic API 上解析到 Haiku 5.5 需要 Claude Code v2.1.293 或更高；在 Amazon Bedrock、Google Cloud、Microsoft Foundry 和 Claude Platform on AWS 上仍解析到 Haiku 4.5。内置 Explore 子代理跑在会话模型上，不一定自动用 Haiku。
- 迁移兼容：preserved thinking、thinking 开关、`tool_choice`、computer use 工具集、Haiku 4.5 迁移、安全回退等，都是原文列出的平台行为与检查项；具体版本行为以你实际 API 返回为准。

只是作者主张、无方法细节的部分：

- 任务→起始模型→effort 表是厂商 playbook 的推荐起点，不是你的任务上的对照结果。
- 「超过 high 后加档成本可能等于换更大模型」「提高 effort 只帮助想更久/更多工具/更多自检」是作者的经验规则，没有给出逐项测量方法。
- advisor 「四个配对里没有一个明显胜过单用 executor」是平台成本指南的结论，原文未展开统计细节。
- 多代理的「便宜约三分之一、得分大致相同」是单一内部基准的结果，不能直接外推到你的代码库。

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

作者自己写明的局限：73 例是小集合，judge 不完全确定，重跑会差几个点；judge 的 prompt 在 73 例中的 53 例上调过，只有 20 例 held-out。

**做法 F（Fable 5.2 编码会话的配置层修正）**出自 @Asteri_eth 的一条推文。它是对 Claude Code / Fable 5.2 提示与配置指南的二手摘要，列出 12 项「粘贴或删除」式修正，核心是把默认 effort 从 medium 调到 high，并用代码库所有权、收尾要求、进度播报、精确审批和谨慎删除等提示，改变编码 agent 的续跑与收尾行为。它不是完整指南，但给出了多条可直接复制的提示和一条明确命令。

原文给出的数据：

- 所有权提示下重复代码合并率从不足 10% 提高到约 75% 的运行比例。
- 收尾块使工作未完成就结束的会话约减半（但原文未给块文本，只给链接）。
- 进度播报可避免长时间静默。
- 大 token 预算在 Anthropic 测试中成本下降、结果不变。
- 所有权提示单独增加 70–80% token，部分套餐会计入 usage credits。

只是作者主张、无方法细节的部分：

- 上述数据都是推文转述，未给样本量、任务类型、评分方法和原始数据。
- 第 3 项「Finishing work」完整提示词缺失，不能照抄。
- 「Claude Code 默认 medium、Anthropic 指南建议 high 起步」是二手转述；先 `/effort status` 确认，再 A/B。
- 原文承认几乎每项都增加 token，但没有逐项成本表。

## 依据的调研

- [Using Claude Code: Spending your effort](../research/radar/2026-10-02/393-using-claude-code-spending-your-effort.md)：值得一试，把 Claude Code 的 effort 档位当成一种可调的工作方式：用「让模型先采访你→低档实现→低档迭代→高档验证」的循环做功能开发，并按任务类型选档（低档在环讨论、中档常规实现、高档验证与边界情况、最高档全自主难题）；理由是原文给出了明确的档位分工和一组可复现的效果对比，但数据来自厂商内部运行，具体倍率需自己试。
- [HeyCubit/effortless](../research/radar/2026-10-10/2272-heycubit-effortless.md)：值得一试，可以在非关键项目的 Claude Code 里小范围试装：按 README 的命令装好、先只用默认的 Haiku judge（无需 key），再用 `/effortless stats` 和 `/effortless bench` 在自己任务上核对花费与判断命中率，满意再常驻。给 try 而非 adopt 的理由是它是会本机运行代码的第三方插件，且节省幅度与 92%–99% 的 judge 准确率都是作者自测（73 例 bench、30 条质量用例、一次性盲评），必须自验。
- [@Arindam_1729: Anthropic 基本上把构建 AI 员工的蓝图递给了我们，这些 AI 员工不会在任务中途就迷失方向。](../research/radar/2026-10-25/6771-anthropic-ai-ai.md)：值得一试，可以小范围试用：在 Claude Code 中按任务难度切换 /model opus 与 /effort medium/high，把 high 留给深度推理和验证环节；原文只给出一条配置，未提供完整 harness 流程和效果数据，因此不宜直接采用。
- [Which Claude model should you build with? Fable, Opus, Sonnet, or Haiku](../research/radar/2026-11-10/12133-which-claude-model-should-you-build-with-fable-opu.md)：值得一试，把原文的“按任务定起始模型 + 先调 effort 再换模型 + 用自有任务测成本/通过率”流程小范围试用，不要直接照搬型号和价格；它给出了可执行的选型表、子代理配置和测量步骤，但依据主要是厂商基准与演示，需在自己的任务上验证。
- [@Asteri_eth: Claude Code runs Fable 5.2 at medium by default. Anthropic's own prompting guide says start at high](../research/radar/2026-11-14/13340-claude-code-runs-fable-5-2-at-medium-by-default-an.md)：值得一试，建议在 Claude Code 的小范围编码任务中试用：先把 effort 调到 high，再逐条加入所有权、进度播报、精确审批和谨慎删除等提示，并清理过时记忆。原因是原推给出了多条可直接粘贴的提示和配置，但它只是对完整指南的二手摘要，缺少完整收尾块和实验方法，必须自行 A/B 验证收益与 token 成本。
