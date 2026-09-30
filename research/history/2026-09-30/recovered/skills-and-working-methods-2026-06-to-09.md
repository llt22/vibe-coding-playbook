# Skill、规则与研发方法：六月至九月的讨论

> 历史材料，归档于 2026-09-30。本文件恢复当时的用户讨论与 AI 回答，未重新核验外部能力、数字、版本或“已测试”声明。安装命令和推荐仅是历史正文，不代表本次执行或当前建议。涉及 ProjectCore、ProjectCore、ProjectFlow 等项目的限制只属于当时项目上下文。

本次整理提示：08-27 的旧回答存在明显时间口径问题（2026 年把“2024 年初”称为“一年前”），且“Token 骤降 50%”“彻底消除”等说法未给出可复核证据。06-01 与 09-13 的流程、测试建议也不是本仓库当前规则。这里保留观点演变，不据此更新全局配置。

## Karpathy 原则与全局规则（06-01）

### 历史 AI 回答 · 原会话第 699 行

来源：`~/.codex/sessions/2026/06/01/rollout-2026-06-01T10-14-41-019e80f6-3c66-7621-8363-846f02e394b2.jsonl:699`。

明白，这个来源的核心其实是 4 件事：**编码前思考、简洁优先、精准修改、目标驱动执行**。它不是要让 AI 事事问人，而是防止 AI 默默猜、过度抽象、顺手乱改、没有验证目标。[来源](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/README.zh.md)

对照当前 `global-rules.md`，我建议不要再删太多。现在已经比较接近“只保留纠偏项”了。

**需要保留的**
- `事实驱动`：对应“不要假设、不要隐藏困惑”。
- `默认自主执行 + 必要时澄清`：你已经把“多方案不用问”修正好了。
- `最小改动 / 禁止顺手重构 / 只清理自己造成的问题`：这正是 Karpathy 规则里“精准修改”的核心。
- `简洁优先`：对应“不要过度工程”，这类 AI 仍然很容易犯，建议保留。
- `Fail Fast`：这是你自己的高价值补充，必须保留。
- `验证闭环`：对应“目标驱动执行”，必须保留。
- `风险红线 / Git 纪律`：这是人类决策边界，必须保留。

**可以再合并的**
当前还稍微有点重复的是这两处：

1. `修改边界` 和 `简洁优先` 有重叠
   但一个管“改动范围”，一个管“实现复杂度”，不完全一样。可以保留，也可以压缩。

2. `验证闭环` 里 Bug 修复、功能变更、无法验证、三次止损写得偏细
   可以压成 2 条：
   - 完成前必须给验证证据
   - 连续 3 次失败就停止试错

**我不建议删的**
- 不建议删 `简洁优先`，因为这是 AI 最常见问题之一。
- 不建议删 `只清理自己造成的问题`，这个很关键，能防止 AI 清理无关代码。
- 不建议删 `验证闭环`，否则 AI 很容易只解释不验证。

**我的判断**
当前提示词已经不算繁琐了。相比原始 Karpathy 指南，它已经把“呈现多种解释/多步骤计划”这类容易导致频繁确认的内容删掉了，只留下行为边界。

如果还要优化，我只建议做一个小合并：

- 保留 `修改边界`
- 保留 `简洁优先`
- 把 `验证闭环` 压短

例如：

```md
### 验证闭环
1. **完成必须验证**：声称完成前必须给出验证证据；能运行测试、类型检查、lint、构建或页面验证时应执行，无法验证时说明原因和残余风险。
2. **三次止损**：同一问题连续修改 3 次仍未解决时，停止试错并重新分析根因。
```

这会少两条规则，但不改变语义。其它部分我建议暂时不动。

## Addy Osmani 与 Superpowers：流程重量的取舍（06-01）

### 历史 AI 回答 · 原会话第 766 行

来源：`~/.codex/sessions/2026/06/01/rollout-2026-06-01T10-14-41-019e80f6-3c66-7621-8363-846f02e394b2.jsonl:766`。

作用大，但它和你这个仓库的定位不一样。

`addyosmani/agent-skills` 是一个**完整工程生命周期 skill 包**：从 `/spec`、`/plan`、`/build`、`/test`、`/review`、`/ship` 到 23 个细分 skills，比如 TDD、前端 UI、API 设计、安全加固、性能优化、代码简化、Git 工作流等。它的目标是让 AI coding agent 按“生产级工程流程”工作，而不是单纯给几条全局规则。[来源](https://github.com/addyosmani/agent-skills)

我的判断：

| 维度 | 价值 |
|---|---|
| 对 Claude Code / Gemini / Cursor 这类支持 skills 的工具 | 高 |
| 对大型项目、长期维护、多人协作 | 高 |
| 对你这个 playbook 的全局提示词 | 中等，不能直接照搬 |
| 对小需求、快速改文档、局部 bug 修复 | 可能偏重 |

它里面最有价值的点不是具体规则，而是三件事：

1. **按任务自动启用 skill**
   比如做 UI 触发 `frontend-ui-engineering`，做 API 触发 `api-and-interface-design`，调试触发 `debugging-and-error-recovery`。这比把所有规则塞进全局提示词更合理。

2. **验证不可跳过**
   它明确强调每个 skill 都有 evidence requirements，测试、构建、运行时数据才算证据，不能用 “seems right”。这和你刚优化的“完成必须验证”高度一致。

3. **流程按需展开**
   它的思路是 skill 入口轻，细节按需加载。这个也符合你现在的方向：全局提示词要短，复杂流程交给 skill。

但我不建议把它详细写进仓库文档。原因：

- 它本身就是一个 skill 包，安装后自带说明。
- 你刚删掉 Playwright 文档，就是为了避免重复维护工具文档。
- 你的全局规则已经吸收了它和 Karpathy 系规则的核心：最小改动、少确认、Fail Fast、验证闭环、Git 纪律。

更合适的做法：

- 不改 `prompts/global-rules.md`，避免继续膨胀。
- 可以在 tools/agent-tools.md（`~/WebstormProjects/vibe-coding-playbook/tools/agent-tools.md`） 里加一行“可选工程流程 Skill：Addy Osmani Agent Skills”，只写定位和适用场景。
- 或者干脆不加，因为这类 skill 安装后能自己发现和说明，和你对 Playwright 的判断一致。

结论：**值得装来用，尤其是复杂项目；不值得复制进全局提示词。**
如果要加到仓库，我建议只在工具表里加一行轻量推荐，不维护安装命令和详细用法。

## Superpowers 的适用范围（06-01）

### 历史 AI 回答 · 原会话第 890 行

来源：`~/.codex/sessions/2026/06/01/rollout-2026-06-01T10-14-41-019e80f6-3c66-7621-8363-846f02e394b2.jsonl:890`。

作用很大，但它是**强流程型**工具，不是轻量增强。

`obra/superpowers` 的定位是“完整的软件开发方法论 + 可组合 skills”。它不是只提供某几个工具调用，而是试图接管 Agent 从想法到交付的完整流程：先澄清目标、产出 spec、用户确认设计、写计划、分任务执行、TDD、review、最后收尾分支。README 明确说它会让 Agent 在开始写代码前先退一步问你真正想做什么，并在设计确认后再制定实现计划。来源：[obra/superpowers](https://github.com/obra/superpowers)

**它的价值**

- 对复杂功能、高风险改动、长期项目很有价值。
- 它强调 TDD、YAGNI、DRY、systematic debugging、verification before completion，这些和我们仓库里的“最小改动、验证闭环、三次止损、Fail Fast”方向一致。
- 它支持多种 Agent 环境，包括 Claude Code、Codex CLI、Codex App、Gemini CLI、OpenCode、Cursor、GitHub Copilot CLI。来源同上。
- 它有完整 basic workflow：brainstorming、worktree、writing plans、subagent-driven development / executing plans、TDD、code review、finishing branch。来源同上。

**风险或缺点**

- 它偏重，会明显增加流程感。
- 对小改动、文档修改、简单 bug 修复，可能拖慢速度。
- 它的默认行为和你刚优化的全局规则有一点冲突：你现在希望“低风险任务默认执行，别频繁确认”；Superpowers 的 workflow 更倾向先 spec、再确认、再计划。
- 如果和 `addyosmani/agent-skills` 同时推荐，会有重叠：两者都覆盖工程流程、review、测试、质量门禁。

**和 Addy Osmani Agent Skills 的区别**

- `addyosmani/agent-skills` 更像一组专项工程 skills：API、UI、安全、性能、review、ship 等，按任务调用。
- `obra/superpowers` 更像一套完整开发操作系统：从需求澄清到计划、执行、review、收尾都有规定动作。

**我的判断**

值得知道，也值得复杂项目时启用；但不适合作为默认推荐。

对你的仓库来说，最合理的评价是：

> Superpowers 适合“复杂功能或大改动时临时启用完整工程流程”，不适合替代当前全局规则，也不适合默认开启。

我不建议把它加进 `prompts/global-rules.md`。如果要加到仓库，最多在 tools/agent-tools.md（`~/WebstormProjects/vibe-coding-playbook/tools/agent-tools.md`） 里加一行“复杂任务可选”，并明确：小改动仍按全局规则直接执行，避免流程过重。

## Matt Pocock Skills（06-16）

### 历史 AI 回答 · 原会话第 1277 行

来源：`~/.codex/sessions/2026/06/15/rollout-2026-06-15T17-57-03-019ecab6-919f-7840-b421-441c0883a0d7.jsonl:1277`。

看了：[mattpocock/skills](https://github.com/mattpocock/skills)。

我觉得它对我们这次分享有价值，尤其适合补充到“Skill 和 Playbook 沉淀”这一节。

核心特点：

1. **它不是大流程，而是一组小 Skill**

它明确反对把所有研发流程交给一个大框架控制，而是把常见问题拆成小的、可组合的 skill。这个和我们现在的实践很接近：Spec、Goal、Review、页面验证、OMP 委派，本质上都可以拆成独立 skill。

2. **它按 AI 开发失败模式来设计 Skill**

README 里总结了几个失败模式：

- Agent 没做出我想要的东西
- Agent 太啰嗦，缺少项目统一语言
- 代码跑不起来，反馈循环不够
- AI 加速了代码复杂度膨胀

这几个点非常适合放进我们的分享，因为它不是“炫工具”，而是在讲 AI 研发真实会失败在哪里。

3. **`grill-me / grill-with-docs` 很值得借鉴**

这两个 skill 的思想是：在开发前让 AI 反复追问，直到需求和设计分支都被澄清。

这和我们现在的 Spec Review 很像，但它更强调“问问题”：

```text
不是 AI 直接生成文档，而是 AI 先拷问需求，把不清楚的问题问出来。
```

可以补到我们的流程里：

```text
大需求进入 Spec 前，可以先做一轮需求拷问，让 AI 主动暴露模糊点。
```

4. **`CONTEXT.md` / ADR 思路也有价值**

它强调项目要有统一语言，比如领域名词、业务概念、历史决策。
这能解决一个常见问题：AI 明明读了代码，但还是用错概念、说错业务词。

这可以补到我们“人提供上下文”那里：

```text
人不只是给 PRD、设计稿、接口文档，还要沉淀项目语言和关键决策。
```

5. **`prototype` 正好呼应我们刚才讨论的 Spec 边界**

它里面有 UI prototype 的做法：同一个页面放多个差异明显的 UI 方案，让用户切换比较。

这个非常适合补充我们刚说的：

```text
Spec 不等于原型和交互设计。
如果界面方向不清楚，可以先让 AI 做 throwaway prototype，而不是直接进入正式开发。
```

6. **`diagnose` 和 `tdd` 强调反馈循环**

它不是让 AI 猜 bug，而是先建立可重复的反馈信号：测试、浏览器脚本、HTTP 请求、日志、回放数据等。

这和我们“页面验证闭环”的观点一致，可以强化成：

```text
AI 开发质量的关键不是让它多想，而是给它可运行、可重复、可判断的反馈循环。
```

我建议从这个仓库吸收 4 个点到我们的文档：

- **需求拷问 Skill**：对应 `grill-me / grill-with-docs`
- **项目统一语言**：对应 `CONTEXT.md`
- **原型验证 Skill**：对应 `prototype`
- **反馈循环 Skill**：对应 `diagnose / tdd`

不建议直接照搬它的观点“not vibe coding”。我们的分享主题还是 AI 辅助研发实践，不需要在命名上和 Vibe Coding 对立。更适合的表达是：

```text
Vibe Coding 不是不要工程纪律，而是把工程纪律沉淀成 Spec、Goal、Skill 和验证闭环。
```

## Spec Kit 的介绍与后续事实修正（07-06）

### 历史 AI 回答 · 原会话第 3314 行

来源：`~/.codex/sessions/2026/07/03/rollout-2026-07-03T11-23-10-019f2600-70da-7b72-9a9a-f9558adbe24f.jsonl:3314`。

`spec-kit` 可以理解成一套“用规格驱动开发”的项目组织方法，不是单纯的文档模板。

它的核心思想是：大项目不要直接从“写代码”开始，而是先把共识变成可执行的规格资产，再从规格推导计划、任务和实现。

按它的流程，大概是：

1. `constitution`
   项目原则和约束。比如我们现在反复确认的：
   - 不臆测接口字段
   - 结果可追溯
   - 每轮全量下载
   - SHA256 复用抽取
   - ProjectCore1.0 做信息抽取
   - 规则用配置 + Python 稳定算子

2. `spec`
   业务需求规格。回答“系统到底要做什么”，不急着写技术实现。
   对我们来说就是：
   - 用户什么时候调用我们
   - 传什么材料项和文件
   - 我们输出什么结果
   - 什么叫通过、不通过、待确认
   - 用户修改后怎么重新识别

3. `plan`
   技术方案。回答“怎么做”。
   比如：
   - FastAPI / Celery / PostgreSQL / S3
   - 申报单、材料项、文件三层对象
   - 文件下载、准入、合成图片、ProjectCore1.0 抽取、后处理、规则审核
   - 状态机、重试、限流、日志、结果快照

4. `tasks`
   可执行任务清单。回答“谁先做什么，做到什么算完成”。
   也就是我们现在的排期文档，但要更像研发任务，而不是泛泛模块说明。

5. `implement`
   根据前面规格进入实现。实现时如果发现规格不清楚，回到 spec/plan/tasks 修正，而不是在代码里拍脑袋。

所以我对我们项目的判断是：现在确实需要借鉴 `spec-kit`，因为这个项目已经不是一个简单脚本或单接口集成了。它包含业务规则、文件处理、模型抽取、状态流转、客户交互、问题项、码值映射、增量复用、排期协作，这种规模如果只靠散落文档，会越来越乱。

但我不建议现在直接“安装并套用 spec-kit 全家桶”。更稳的是先采用它的目录和工作方式，把当前项目整理成：

```text
docs/specs/001-review/
  README.md        # 当前规格工作区索引
  spec.md          # 业务规格：用户交互、输入输出、结论口径
  plan.md          # 技术方案：模块、状态、流程、依赖
  tasks.md         # 排期和任务拆分
  contracts/       # API 契约
  research/        # 调研、讨论纪要、外部参考
```

同时把老的 `docs/spec/` 标记成历史规格或待迁移，因为里面还有 ProjectCore2 智能体、SSE、旧状态机等过时口径，已经不能作为当前主方案依据。

一句话：`spec-kit` 对我们最大的帮助，是把“讨论出来的共识”变成“项目后续开发可以依赖的唯一口径”。当前项目确实需要这一步。

### 历史 AI 回答 · 原会话第 3342 行

来源：`~/.codex/sessions/2026/07/03/rollout-2026-07-03T11-23-10-019f2600-70da-7b72-9a9a-f9558adbe24f.jsonl:3342`。

你说得对，我刚才应该直接查仓库确认。

我看了 `github/spec-kit` 当前仓库，结论是：

`data-model.md` 确实是它标准流程里的产物，但不是 `specify` 阶段生成的，而是 `plan` 阶段生成的设计产物。

`plan-template.md` 里明确写了一个功能目录结构：

```text
specs/[###-feature]/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

其中：

- `plan.md`：`plan` 命令输出
- `research.md`：Phase 0 输出
- `data-model.md`：Phase 1 输出
- `quickstart.md`：Phase 1 输出
- `contracts/`：Phase 1 输出
- `tasks.md`：Phase 2 由 `tasks` 命令生成，不是 `plan` 命令生成

`templates/commands/plan.md` 里也写得更清楚：Phase 1 会从 feature spec 里抽实体，生成 `data-model.md`，内容包括：

- entity name
- fields
- relationships
- validation rules
- state transitions

所以对我们项目来说，比较准确的对应关系应该是：

```text
spec.md
```

写业务需求和用户场景：开始智能识别、轮询、问题清单、通过/不通过/待确认。

```text
plan.md
```

写技术实现方案：FastAPI、Celery、文件下载、合成图片、ProjectCore1.0、规则引擎、状态流。

```text
research.md
```

写我们已经调研/讨论出来的决策：ProjectCore1.0 vs ProjectCore2.0、全量下载、SHA256 复用、文件名不作为主契约、论文材料包合成图片。

```text
data-model.md
```

写核心数据对象：申报单、识别运行、申报材料项、文件、材料包、抽取结果、问题项、结果快照、规则配置、外部调用日志。

```text
contracts/
```

写 API 契约：创建任务、提交文件清单、触发识别、查询进度和结果。

```text
tasks.md
```

写可执行开发任务，不只是排期表。

所以不是我之前说的“通常会有”那么模糊，按仓库模板看，`data-model.md` 是 `plan` 阶段的标准设计产物。

参考来源：
- [spec-kit plan-template.md](https://github.com/github/spec-kit/blob/main/templates/plan-template.md)
- [spec-kit plan command](https://github.com/github/spec-kit/blob/main/templates/commands/plan.md)

### 历史 AI 回答 · 原会话第 3358 行

来源：`~/.codex/sessions/2026/07/03/rollout-2026-07-03T11-23-10-019f2600-70da-7b72-9a9a-f9558adbe24f.jsonl:3358`。

因为我前面贴的是 `plan-template.md` 里“plan 阶段产物”的目录片段，不是完整 feature 目录。

准确说：

`spec.md` 是在 `/speckit.specify` 阶段先创建的。

然后 `/speckit.plan` 读取这个已有的：

```text
specs/[###-feature]/spec.md
```

再生成这些设计产物：

```text
specs/[###-feature]/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

所以那张图里没有 `spec.md`，不是因为 `spec.md` 不存在，而是因为那个片段只列了 `plan` 命令关心和生成的文档。

完整一点应该这样看：

```text
specs/[###-feature]/
├── spec.md          # specify 阶段：需求主文档，先有
├── plan.md          # plan 阶段：技术实施计划
├── research.md      # plan Phase 0：调研和决策
├── data-model.md    # plan Phase 1：实体、字段、关系、状态
├── quickstart.md    # plan Phase 1：端到端验证指南
├── contracts/       # plan Phase 1：API / 接口契约
└── tasks.md         # tasks 阶段：可执行任务清单
```

我前面表达不严谨，容易让你以为 `spec-kit` 的 feature 目录没有 `spec.md`。这里你抓得对。

## grill-with-docs：方法是否解决当前问题（07-06）

### 历史 AI 回答 · 原会话第 6892 行

来源：`~/.codex/sessions/2026/07/03/rollout-2026-07-03T11-23-10-019f2600-70da-7b72-9a9a-f9558adbe24f.jsonl:6892`。

有用，但不是“直接拿来就能解决我们现在问题”的那种有用。

我看了这个 skill，本体很小：`grill-with-docs` 的说明是“对计划/设计做猛烈追问，同时创建 ADR 和 glossary”，实际是运行 `/grilling`，并结合 `/domain-modeling`。`/grilling` 的核心方式是：围绕一个 plan/design 逐分支追问、一次只问一个问题、能从代码查就先查代码、在达成共同理解前不执行计划。`/domain-modeling` 则强调澄清术语、发现术语冲突、把稳定下来的领域词写进 `CONTEXT.md`，必要时写 ADR。来源：GitHub 上的 [grill-with-docs](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs)、[grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md)、[domain-modeling](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md)。

对我们当前阶段，我觉得它有用在三个点：

1. **把“听起来合理但没证据”的点揪出来**
   比如这次 `extractor_version`，如果按 grilling 的方式追问，问题会变成：
   “ProjectCore1.0 是否真的返回版本号？证据在哪？如果没有，缓存键靠什么失效？”
   这正是我们漏掉的类型。

2. **统一领域词**
   我们之前反复卡在“任务、材料、材料项、文件、材料包、抽取结果、审核结果”这些词上。`domain-modeling` 这种 glossary 机制适合把这些词固定下来，避免后面又有人把“材料”同时拿来指单文件和论文维度。

3. **把关键取舍写成 ADR**
   比如这些其实都适合 ADR：
   - 为什么每轮全量下载，而不是信客户 MD5
   - 为什么文件名不作为归并主契约
   - 为什么 ProjectCore1.0 抽取复用使用 `config hash`
   - 为什么任务池拆成申报运行编排池、文件处理池、抽取处理池
   这些未来新人肯定会问“为啥这样设计”。

但我不建议完整照搬它的工作流。原因是它偏“对话式追问”，而我们现在已经有一套比较完整的 spec，不适合又从头 grill 一遍。更好的用法是借它的方法，做一个我们自己的小流程：

```text
external-contract-audit.md
+ CONTEXT.md 领域词表
+ 少量 ADR
```

也就是说，当前最有价值的不是安装这个 skill，而是把它的思路落到我们项目里：

```text
1. 先建 CONTEXT.md，固定术语
2. 建 external-contract-audit.md，逐条核验外部契约
3. 对关键不可逆决策补 ADR
4. 每次发现“假设写成事实”，立刻回写 spec
```

我的判断：**有用，适合我们现在补“规格事实核验”和“领域词统一”这块短板；但不要拿它替代现有 spec，也不要重新大规模访谈。**

## Ponytail：少代码不等于正确方案（08-24）

### 历史 AI 回答 · 原会话第 59 行

来源：`~/.codex/sessions/2026/08/24/rollout-2026-08-24T18-42-56-01a0335d-bcec-7ea3-9b3e-90d19dd9f04b.jsonl:59`。

有帮助，但它不能替我们做架构设计；最适合作为“方案定稿后的过度设计审查器”，不适合现在以 `full` 模式常驻项目。

Ponytail 不是工作流框架或业务架构库，本质是给 AI 编码代理注入的一套约束：

```text
先确认是否需要
→ 优先复用现有实现
→ 再考虑标准库和平台原生能力
→ 避免提前抽象
→ 最后才写最小可行代码
```

## 对我们有价值的部分

它能纠正 AI 常见的实现膨胀：

- 一个实现就创建接口、工厂和适配层；
- 为可能出现的第二种业务提前做插件系统；
- 已有数据库能力不用，另建配置资源；
- 为固定流程建设动态 DAG；
- 能在现有函数解决，却新增多个文件和包装层；
- 修复症状，没有追到共享根因。

这与我们的目标一致，特别适合后续检查：

- `NodeContract` 中未被执行器消费的元数据；
- 单实现抽象和透传层；
- 为动态拓扑预留的代码；
- 没有真实消费者的配置项；
- 可以直接使用 PostgreSQL 约束、事务或标准库的自建机制。

它提供的 `ponytail-review` 和 `ponytail-audit` 很适合做这种专项检查，而且明确不直接修改代码。

## 不能依赖它解决的部分

它无法回答我们最近真正卡住的问题：

- 老系统哪些行为属于业务契约；
- code/text、码表和父子关系应该如何保留；
- 材料处理应该按材料还是按步骤调度；
- 哪些动作需要独立恢复和重试；
- 工作流是不是这个业务最合适的运行模型；
- 最终结果和审核语义是什么。

这些需要从接口、数据生命周期、生产行为、失败场景和验收样本中推导。Ponytail 只会在方案选定以后追问“能不能更简单”，不会证明方案本身正确。

## 为什么不建议常驻 `full`

它的一些规则正好会放大我们前面犯过的错误：

- “没有新依赖最好”
- “文件越少越好”
- “最短 diff 胜出”
- “能一行就一行”
- “一个小测试就够”

这些规则适用于明显过度实现的普通功能，但不适合作为本项目的最高设计原则。我们的优先顺序应是：

```text
业务等价
→ 数据正确
→ 故障可靠
→ 边界清楚
→ 可维护和可验证
→ 最后才是代码少、依赖少
```

尤其是码值数据库、任务 fencing、终态交付和业务回归测试，不能因为“更短”而削弱。

它自己的基准也承认：

- 主要收益集中在存在明显过度构建空间的任务；
- 只有一个主要模型的有限样本；
- 某些大型任务可能增加工具调用和成本；
- 独立评测发现部分日常异常输入处理会被削减。

因此不能把“平均减少 54% 代码”当成架构质量证明。

## 推荐用法

推荐只采用两种方式：

1. **架构确定前不用它做方案选择**
   先独立完成业务事实和运行要求分析。

2. **方案确定后，用 `ponytail-audit/review` 做第二道检查**
   只回答：“在不改变业务、可靠性和契约的情况下，哪些实现复杂度可以删除？”

当前项目的 `AGENTS.md` 已经包含最小改动、禁止投机扩展、避免过度设计、优先成熟组件、完整验证等原则，所以没有必要为了获得这些基本原则立刻安装整个插件。

最终判断：

> Ponytail 能帮助我们防止“已经选对方案以后又写重了”，但不能帮助我们决定“什么才是正确方案”。现在直接常驻使用，反而可能继续把“最佳设计”带偏成“最少代码”。最合适的是把它作为专项审查工具，而不是项目架构准则。

## Anthropic AI-native SDLC 与分享文章的关系（08-25）

### 历史 AI 回答 · 原会话第 157 行

来源：`~/.codex/sessions/2026/08/24/rollout-2026-08-24T09-56-10-01a0317b-797f-7af1-8233-877ec1d43d22.jsonl:157`。

这篇与篇 A 高度撞题，但不是坏事：它能作为强有力的外部佐证；篇 A 需要补充引用并强化差异，否则容易被读者理解为对 Anthropic 文章的中文转述。

重合点很明显：

- 都认为代码实现不再是瓶颈，瓶颈转移到实现前后。
- 都认为逐行 Code Review 跟不上 Agent 的代码产量。
- 都强调 spec、测试和人的判断力。
- 都主张流程不能只加速编码，整个研发周期都要重构。

Anthropic 的增量主要在落地层：

- 用 `intent.md → spec.md → plan.md → diff/tests → PR → incident record` 串起全流程。
- 每个阶段通过提交产物触发下一阶段，Git 历史同时承担审计记录。
- Skill 负责建议性约束，Hook 负责确定性强制。
- AI 可以自测，但最终验证要用独立上下文、确定性检查或人工关口，避免“自证”。
- 范围覆盖 Plan、Design、Build、Test、Deploy、Maintain，比篇 A 的“定义、实现、验证”更完整。

我建议篇 A 不扩成六阶段手册，继续保持“新敏捷的重心迁移”这条主线，但做三处增强：

1. 在“瓶颈转移”处引用 Anthropic 这篇文章，表明这是行业正在形成的共识。
2. 把“Spec 成为最有杠杆的产出”进一步落到“可提交、可版本化、可被下一阶段直接消费的产物”。
3. 把“AI 自证陷阱”说得更准确：问题不是 AI 不能自测，而是不能让生成实现的同一套假设垄断最终验收。自动反馈循环应该保留，最终关口需要独立验证。

不建议照搬它的 `intent.md/spec.md/plan.md` 命名或 Claude 产品细节，那会让篇 A 失去自己的观点性。篇 A 最有价值的差异仍然是：从敏捷方法论和产品判断力出发，解释“为什么实现越便宜，定义与验收越贵”。

来源信息：文章发布于 2026 年 8 月 21 日，8 月 24 日更新。当前尚未修改篇 A。

## 模型进步后全局规则是否过时（08-27）

### 历史 AI 回答 · 原会话第 23 行

来源：`~/.omp/agent/sessions/-WebstormProjects-blog-drafts/2026-08-27T15-03-42-090Z_01a043bf-8d0a-724d-8f17-edbf5690645e.jsonl:23`。

经过对 2025–2026 年行业主流实践（Anthropic 官方对 Claude Code 的指导、Cursor 社区演进、顶级工程团队的配置演化）的调研，**你的直觉完全踩中了这一年多来 AI Agent 提示词的演进趋势**。

一年前（2024 年初），业界流行“穷尽式提示词”（Over-Prompting）；而现在的核心共识已经彻底转向 **“Less is More”（精简契约与分层治理）**。

---

### 一、这一年多来，被大模型能力淘汰的 4 类提示词

#### 1. 淘汰：教模型“如何思考与决策”（Meta-Workflow）
* **典型旧写法**：“先理解目标，再分析影响，再给出方案”、“多轮对话中如何权衡决策”、“一步一步思考”。
* **为什么淘汰**：现在的模型（如 Claude 3.5/3.7、o3 系列）原生内置了强大的 CoT（思维链）和推理能力。在全局 Prompt 里教它怎么思考，不仅是废话，还会**诱发“爹味”**——模型会误以为你在要求它输出大量的反思、哲学探讨和方案说教。
* **对应你配置中的**：整个《执行与确认》模块的大部分内容。

#### 2. 淘汰：泛化的技术审美与软性要求（Vague Qualities）
* **典型旧写法**：“写优雅、可维护、高内聚低耦合的代码”、“请像顶级架构师一样思考”、“充分考虑所有边界情况”。
* **为什么淘汰**：现在的实测表明，这些形容词除了消耗注意力（Attention Drift），对代码质量毫无实质提升。现代 Prompt 必须是**可验证的硬约束（Hard Constraints）**，比如从“写好代码”变成“必须通过 `npm test`”。

#### 3. 淘汰：教模型使用基础工具的步骤（Micro-management）
* **典型旧写法**：“改动前必须先用 grep 查找同类代码”、“遇到库 API 必须用 xxx 工具去查文档”。
* **为什么淘汰**：现代编程 Agent（Claude Code、Cursor、Windsurf 等）的 Tool-Calling 闭环和自反思能力已经非常成熟。模型自己知道什么时候该搜代码、什么时候该读定义。把操作步骤写死，反而限制了模型的探索路径，还会造成**工具耦合（换个环境就失效）**。

#### 4. 淘汰：单体大一统 Prompt（Monolithic Prompt）
* **典型旧写法**：把个人习惯、项目架构、所有 API 文档、Git 规范全塞进一个 `~/.claude/CLAUDE.md`。
* **为什么淘汰**：现在讲究**分层（Hierarchy）**：
  * **用户全局 (`~/.claude/CLAUDE.md`)**：只放跨项目生效的**极端个人偏好 + 危险底线**（控制在 20 行以内）。
  * **项目根目录 (`./CLAUDE.md`)**：只放项目事实（技术栈、启动/测试命令、不可侵犯的架构红线）。
  * **子目录规则 (`.cursor/rules/*.mdc`)**：按文件路径动态注入（比如前端规范只在改 `src/components/` 时注入）。

---

### 二、什么依然是“高价值资产”（不过时的规则）

大模型变强了，但它依然有两个固有弱点：**偷懒本能（为了省事糊弄/编造）** 和 **缺乏对你本地环境的危险敬畏**。

你一年前写的内容里，真正有生命力、今天依然是业界推崇的，恰恰是这几条**强约束**：
1. **中文、结论先行**（输出格式约束，降低阅读成本）
2. **失败显式暴露**（封死模型用空值/fake fallback 假装成功的退路）
3. **最小改动**（防止模型顺手重构无关代码导致 Git diff 爆炸）
4. **事实优先 / 验证后交付**（逼模型用测试/编译事实说话，不靠嘴硬）
5. **Git 与危险操作门禁**（保护本地数据的物理安全底线）

---

### 三、按照 2026 年最新标准，你的全局 Prompt 最终极简版

把所有已淘汰的“思考说教”、“工具微操”和“重复确认”全部剥离，只保留**不可替代的个人偏好与硬性安全底线**：

```markdown
### 交互与输出
1. **中文、结论先行**：自然、简洁的中文，先给判断和结果，再给必要依据；不写客套话与过程流水账。
2. **事实优先**：不臆测 API、字段或运行状态；不确定时基于代码、定义或真实运行结果判断。

### 代码与修改
1. **最小改动**：只改任务所需内容，不顺手重构无关代码，保持向后兼容。
2. **失败显式暴露**：关键数据缺失、请求失败或契约不匹配必须显式报错，严禁用空值或静默捕获伪装成功。
3. **受阻即止**：同一方向尝试失败后停止无意义重试，说明根因与用户对齐后再继续。
4. **验证后交付**：按风险运行测试、类型检查或构建；用实际结果证明，不以臆测代替证据。

### 安全与 Git
1. **危险操作确认**：物理删除、清空数据、生产操作、force push 或改写 Git 历史前必须明确确认。
2. **提交规范**：提交信息使用 `type: 中文描述`，提交前说明改动摘要并请求确认（用户明确要求直接提交时可跳过）。
```

### 对比总结
* **体积**：从 450+ 字精简到 **200 字出头**。
* **收益**：彻底消除了模型“好为人师”的逻辑漏洞，省下全局 Token，模型响应会更干脆、执行更直接。

## Matt Pocock 的后续研判（08-27）

### 历史 AI 回答 · 原会话第 48 行

来源：`~/.omp/agent/sessions/-WebstormProjects-blog-drafts/2026-08-27T15-03-42-090Z_01a043bf-8d0a-724d-8f17-edbf5690645e.jsonl:48`。

对，就是 **Matt Pocock**（Total TypeScript 的作者、TypeScript 圈顶流）开源的 **`mattpocock/skills`**（*Skills for Real Engineers*）。

这个库在 GitHub 上极其出名，他提出了一套非常锋利的口号：**“Real Engineering, Not Vibe Coding”**（做真正的工程，不要凭感觉盲写）。

---

### 一、Matt Pocock 的核心设计哲学

读完他的整个仓库架构和核心 Skill，最震撼的一点是：**他的全局 `CLAUDE.md` 几乎不写代码哲学，而是把所有重型工程流程全部拆成了按需调用的独立 Skill。**

他解决了 AI 编程中大家最痛苦的 4 大死穴：

#### 1. 解决“AI 根本没理解你想做啥” → `/grill-me`（疯狂盘问）
* **原理**：很多时候任务失败是因为需求对齐不足。
* **做法**：AI 在动手前，会像面试官一样对你进行 **Grilling（极限盘问）**，把方案画成一棵决策树，每一轮列出当前未决的所有问题（带推荐答案），逼用户做选择题，直到“决策前沿（Frontier）”为空才允许写代码。

#### 2. 解决“AI 废话连篇、命名混乱” → `CONTEXT.md`（领域统一语言）
* **原理**：借鉴 DDD（领域驱动设计）的 Ubiquitous Language。
* **做法**：在项目里放一份极简的专业术语表（如把“课程视频切片落盘触发状态更新”定义为 `materialization cascade`）。AI 掌握了黑话后，**Token 消耗骤降 50%，函数与变量命名高度一致**。

#### 3. 解决“AI 瞎修 Bug、修了引入新 Bug” → `/diagnosing-bugs`（军规级 Debug）
* 这是他写得最精彩的一个 Skill，强制 AI 执行严苛的 **6 阶段闭环**：
  1. **Phase 1（建反馈环）**：**禁止在看到代码报错时立刻猜原因！** AI 必须先写出一个秒级返回、必定报错（Red-capable）的单行命令/测试脚本。建不出反馈环就停下。
  2. **Phase 2（最小化复现）**：把场景裁剪到哪怕多删一行都不会报错的最小形态。
  3. **Phase 3（提出可证伪假说）**：必须同时提 3~5 个假说（“如果 X 是原因，改 Y 就会好”），防止先入为主。
  4. **Phase 4（精准打桩）**：所有 debug 日志必须加 `[DEBUG-xxxx]` 前缀，方便最后单行正则全部清掉。
  5. **Phase 5（先写回归测试，再修 Bug）**。
  6. **Phase 6（清理现场）**：删掉所有 debug 桩代码，原命令验证变绿。

#### 4. 解决“AI 把系统写成一坨大泥球” → `/codebase-design` & `/tdd`
* 强制深模块设计（Deep Modules：简单接口包复杂实现）、强制每个关键设计“Design it twice”（至少出两套架构方案做对比）。

---

### 二、从 Matt Pocock 的方案中得到的启发

结合你刚才对自己全局提示词的思考，对比 Matt Pocock 的体系，可以得出两个非常关键的结论：

| 维度 | 传统旧做法（1 年前） | Matt Pocock / 现代模式 |
| :--- | :--- | :--- |
| **全局 `CLAUDE.md`** | 塞满各种“先思考、后确认、再执行、怎么写单测”的大段说教 | **极简底线**：只留安全红线、Git 习惯、交互语言（< 200 字） |
| **复杂工程流程** | 试图用一段话让 AI 在所有场景下都完美排错、设计 | **封装成独立 Skill**：遇到难缠 Bug 时唤醒 `diagnosing-bugs`，需求模糊时唤醒 `grill-me` |
| **思考机制** | 靠 Prompt 催眠（“你要深度思考”） | **靠硬工件与断点**（必须先拿出单行红灯测试，拿不出不准看代码） |

### 三、对你的配置建议

你之前直觉觉得《执行与确认》模块鸡肋是完全对的：
1. **把全局 `~/.claude/CLAUDE.md` 减到最轻**（保留你的中文结论先行、失败显式报错、Git 确认等核心底线）。
2. **如果你需要高质量的特定流程**（比如排错或者需求深挖），直接借鉴 Matt Pocock 的思路，把它们写成具体的技能文件，需要时再触发，日常开发完全不需要被冗余提示词拖慢速度。

## TeamAI：团队共享配置和经验（09-07）

### 历史 AI 回答 · 原会话第 515 行

来源：`~/.codex/sessions/2026/09/08/rollout-2026-09-08T00-10-51-01a07ca2-fd5a-7c41-b806-241cae1873b7.jsonl:515`。

结论：`Tencent/teamai-cli` 不是“另一个 AI 编程 CLI”，而是团队级 AI Agent 配置、知识、规则的同步和治理层。它的核心价值是把团队经验做成可版本化、可评审、可分发的 AI Harness，让 Claude Code、Codex、Cursor、CodeBuddy 等工具按同一套团队规则工作。仓库 README 也是这样定位：统一管理团队的 Skills、Rules、MCP 和知识，并分发到多种 AI Agents。([raw.githubusercontent.com](https://raw.githubusercontent.com/Tencent/teamai-cli/main/README.zh-CN.md))

**它解决什么问题**
- 团队每个人的 AI 工具配置不一致：skills、rules、MCP、hooks、env 分散在各自机器上。
- 项目经验难沉淀：踩坑、最佳实践、代码结构知识只留在个人会话里。
- 多 AI 工具并存：有人用 Codex，有人用 Claude/Cursor，团队规范很难统一。
- AI 使用缺少复盘：谁在用、哪里频繁被纠正、哪些经验值得沉淀，看不清。

**典型使用场景**
- 团队建一个专门的 TeamAI Git 仓库，集中存 `skills/rules/docs/hooks/mcp/teamwiki/learnings`。
- 管理员通过 MR 审核后发布团队规则，成员 `teamai pull` 同步到本地 AI 工具目录。
- 用 `teamai recall <query>` 或自动 recall，让 Agent 开始任务前检索团队知识。
- 用 `teamai import` 把代码仓库解析成知识图谱，帮助 Agent 找到相关模块和依赖。
- 用 `digest/dashboard/session save` 做 AI 使用统计和经验复盘。

**对 Codex/Claude/Cursor 的作用**
它相当于给这些工具加了一层“团队配置源”。例如团队可以统一下发：
- Codex/Claude/Cursor 的 skills
- 项目规则和编码规范
- MCP server 配置
- AI 工具 hooks
- 团队知识库和代码图谱
- 会话复盘与经验沉淀流程

**适合谁**
适合多人研发团队，尤其是：
- 已经大量使用 AI Coding Agent；
- 团队里混用 Codex、Claude Code、Cursor 等工具；
- 有明确代码规范、review 规范、项目知识沉淀诉求；
- 想把 AI 使用方式纳入 Git/MR 审核流程。

不太适合个人轻量使用。个人偶尔用 AI，直接维护本地 `AGENTS.md`、skills、MCP 配置更简单。

**主要风险**
最大风险不是代码质量，而是信任边界。它会写入本地 AI 工具配置目录，并可能注入 hooks、MCP、env 等；团队仓库一旦能下发 hooks，就具备实际执行影响力。所以接入前必须定好：
- TeamAI 仓库权限；
- MR review 规则；
- hooks/MCP 变更审批；
- 密钥不要进仓库；
- 先用 project scope，不要一上来全局写入用户目录。

**成熟度判断**
我看下来它发展很快，已经有完整测试和 CI，`typecheck/build/test` 都能过，生产依赖 audit 为 0。但它仍是 `0.x` 阶段，命令面还在变化。特别是主分支文档比 npm stable 更新，`teamai install/packages` 这类命令不要直接当稳定接口用。

**建议试用方式**
先不要在真实主力环境全局铺开。用一个空团队仓库、小项目、project scope 试：

```bash
npm install -g teamai-cli
teamai init https://github.com/yourorg/your-teamai-repo
teamai doctor
teamai status
teamai pull
```

试通后再逐步启用 skills/rules，最后再评估 hooks、MCP、recall、dashboard。总体看，这是一个“团队 AI 工程化治理工具”，不是单点提效工具；团队规模越大、AI 工具越多，它的价值越明显。

## Skill Based Architecture：跨工具规则去重（09-10）

### 历史 AI 回答 · 原会话第 1007 行

来源：`~/.claude/projects/-user-home-WebstormProjects-dev-sharing/9c0b390a-6b2e-4c5d-a00c-813cc7a927b4.jsonl:1007`。

这个和你的 `use-skill` 解决的是同一个痛点但层级不同：

| | use-skill（你的做法） | SBA |
|---|---|---|
| 解决什么 | Skill 文件放一个地方，按需路由 | 把整个项目的 AI 指令（规则/工作流/经验教训）结构化为一套技能目录 |
| 粒度 | 个人级，管 `~/skills/` | 项目级，管所有工具的入口文件（CLAUDE.md / AGENTS.md / .cursor/rules 等） |
| 核心能力 | 路由 + 按需加载 | 去重（同一规则不重复写）+ 跨工具入口统一 + 任务生命周期 + 经验沉淀 |

要加进分享文档吗？可以放在 2.1 Skill 管理方式那段，作为"更完整的方案参考"提一句。

### 历史 AI 回答 · 原会话第 1012 行

来源：`~/.claude/projects/-user-home-WebstormProjects-dev-sharing/9c0b390a-6b2e-4c5d-a00c-813cc7a927b4.jsonl:1012`。

一句话：**把一个项目里散落在各处的 AI 规则（CLAUDE.md、AGENTS.md、.cursor/rules 等）收拢成一个统一的 skills 目录，所有工具都从这一个地方读。**

解决的核心问题是：同一条规则在 CLAUDE.md 写了一遍、AGENTS.md 又写了一遍、Cursor rules 又写了一遍——改一处漏一处，互相矛盾。SBA 让每条规则只有一个归属位置，各工具入口只放引用。

和你的 `use-skill` 思路一脉相承，只是你管的是个人全局 Skill 的路由，它管的是单个项目里所有 AI 指令的去重和统一。

## 重新审视 Skills 与 Prompt（09-12）

### 历史 AI 回答 · 原会话第 625 行

来源：`~/.codex/sessions/2026/09/08/rollout-2026-09-08T00-10-51-01a07ca2-fd5a-7c41-b806-241cae1873b7.jsonl:625`。

这篇文章的核心结论是：

> **GPT-6 Astra 变强后，很多过去为了“扶着模型走”而写的 skills、`AGENTS.md` 和长 prompt，反而会拖慢它、误导它。现在应该定期删减和重写指令，而不是继续堆规则。**

文章发表于 **2026 年 9 月 11 日**，面向 Codex 开发者。([官方文章](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra))

**它主要提醒了四件事：**

1. **Skill 描述要短，而且触发条件要准确**

不要写：

> 只要涉及数据库、查询、模型、持久化就使用这个 skill。

这会导致 Agent 碰到普通数据库代码也加载迁移 skill。

应该写成：

> 新增、修改或审查数据库迁移时使用。

Skill 描述会被提前放进模型上下文。Skill 太多、描述太长，Codex 可能压缩这些描述，最后模型反而更难选对 skill。([官方文章](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra))

2. **采用渐进式披露，不要一次性塞完整手册**

一个 skill 的入口文件应该更像“路由器”：

```text
这个 skill 适用于什么场景
先做哪一步
需要哪类信息
具体流程去看哪个文档
脚本在哪里
```

详细流程、特殊案例、脚本、参考资料放到后续文件里，只有任务需要时再加载。这样可以减少无关上下文，也降低不同规则互相冲突的概率。

3. **`AGENTS.md` 不要变成每次任务都要执行的总检查表**

文章反对这种写法：

```text
每次修改前，必须先阅读 architecture.md、
database.md 和 deployment.md。
```

更合理的是：

```text
涉及服务边界时查看 architecture.md；
修改数据库结构时查看 database.md；
准备发布时查看 deployment.md。
```

也就是说，`AGENTS.md` 应该提供**约束和导航**，而不是强迫 Agent 每次都完整阅读整个项目文档。模型已经能自己判断很多事情，重复要求会浪费上下文、拖慢执行。([官方文章](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra))

4. **把“能自动做什么”和“什么时候完成”说清楚**

文章认为新模型通常更谨慎，但也可能在第一次实现后提前停下来等待人工检查。

所以任务提示里应该明确完成标准，例如：

```text
完成实现后运行相关测试，检查实际结果；
如果测试因本次改动失败，修复后重新运行；
直到实现、验证和结果检查全部完成再汇报。
```

同时，安全边界不要写得过度保守。比如本地测试使用隔离数据、不会访问生产环境，就可以明确授权 Agent 自动运行，而不是每一步都要求确认。

**这篇文章真正解决的问题**

它针对的是四类常见浪费：

- skill 太多，模型选错；
- `AGENTS.md` 和 skill 规则互相冲突；
- 每次任务都加载大量无关文档；
- 旧模型留下的“行为纠正规则”继续限制新模型；
- Agent 做完第一版就停，没有完成测试和修复闭环。

**和前面 Uber 文章的关系**

两篇文章讲的是同一个方向，但层级不同：

- Uber 优化的是组织级问题：MCP schema、模型路由、prompt cache、上下文图谱、Agent 成本。
- OpenAI 这篇优化的是项目级问题：skill、`AGENTS.md`、任务 prompt 的上下文质量。

共同原则都是：

> **不要给 Agent 更多信息，而要给它更少但更相关的信息。**

**对 TeamAI 的启发**

TeamAI 能把 skills、rules、MCP、知识分发给整个团队，但这也意味着：

> 如果 skill 写得不好，TeamAI 会把坏的规则规模化地传播给所有人。

所以团队不应只管理“有哪些 skill”，还要管理：

- skill 的触发条件是否准确；
- 描述是否过长；
- 是否支持渐进式加载；
- 是否包含过时的模型行为假设；
- 是否有真实任务评测；
- 是否会和其他规则冲突。

我的判断是：这不是一篇“prompt 技巧文章”，而是一篇 **AI Agent 配置治理指南**。它提醒大家：随着模型能力提升，`skills`、`AGENTS.md` 和 prompt 也需要像代码一样持续重构，旧规则本身会变成技术债。

## Skill 评估（09-13）

### 历史 AI 回答 · 原会话第 758 行

来源：`~/.codex/sessions/2026/09/08/rollout-2026-09-08T00-10-51-01a07ca2-fd5a-7c41-b806-241cae1873b7.jsonl:758`。

这篇的核心是：**Skill 不应该靠感觉调，要像代码一样做回归测试。**
OpenAI 官方文章把 eval skill 定义成一个闭环：`prompt -> 运行轨迹和产物 -> 检查规则 -> 可比较的分数`。它更像轻量 E2E 测试，不是单纯看最终回答好不好。来源： [OpenAI Developers: Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills)

**它解决的问题**

你改一个 skill 后，常见风险是：

- 该触发时没触发；
- 不该触发时乱触发；
- 触发了但少跑关键步骤；
- 产物结构偏了；
- 多跑无意义命令，成本变高；
- 修了一个 case，另一个 case 回归。

文章的观点是：不要问“感觉更好了没”，而是把这些行为变成可检查项。

**推荐方法**

1. **先定义成功标准，再写 skill**

检查项分四类：

- Outcome：任务是否完成，产物能不能跑；
- Process：是否调用了正确 skill、命令、步骤；
- Style：是否符合约定风格；
- Efficiency：有没有反复试错、命令过多、token 过高。

2. **准备 10-20 条小 prompt 集**

不用一开始搞大 benchmark。每个 skill 准备一组小 CSV 就够：

- 显式调用：用户直接说用 `$xxx`；
- 隐式调用：用户描述场景但不提 skill；
- 带噪声调用：真实任务里混着别的上下文；
- 反例：相邻但不该触发的请求。

反例很关键，比如“给已有 React 项目加 Tailwind”不应该触发“新建 React demo app”的 skill。

3. **用 `codex exec --json` 捕获行为轨迹**

重点不是只看最终输出，而是检查 trace：

- 是否执行了 `npm install`；
- 是否创建了 `package.json`；
- 是否按预期顺序执行命令；
- 是否出现重复命令或无效循环。

4. **确定性检查 + 模型打分结合**

确定性检查适合判断“有没有做”：

- 文件是否存在；
- 命令是否跑过；
- 构建是否通过；
- git 工作区是否干净。

但风格、结构、约定是否符合，硬编码规则不好写。文章建议再跑一个只读 Codex 检查，并用 `--output-schema` 让它输出稳定 JSON，方便比较分数。

5. **随着真实失败扩充 eval**

每次你手动修 skill 的问题，都应该反过来加一条 eval。这样 skill 会越用越稳，而不是越改越玄学。

**和上一篇 GPT-6 Astra 文章的关系**

上一篇说：**少写过度提示词，减少上下文负担。**
这篇补上后半句：**删减或重写以后，要用 eval 证明没有回归。**

所以完整方法是：

- 先精简 skill 和 prompt；
- 再用小型 eval 集确认触发、步骤、产物、成本没有变差；
- 真实失败继续进 eval 集。

**对你的意义**

你的全局 `AGENTS.md` 不需要上 eval，太通用，且不是一个明确可触发的 skill。真正适合做 eval 的是：

- 你反复使用的自定义 skill；
- 团队共享的 rules/skills；
- 会自动改代码、建项目、发布、生成文档的流程；
- TeamAI 这类要分发给多人使用的团队规范。

一句话：**全局提示词负责少而准，skill 负责可复用，eval 负责证明它真的稳定。**
