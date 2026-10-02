# What a task costs on Opus 5.5

- 结论：**值得一试**。按文章给的方法（用 /usage 建基线 → 默认 medium effort → 优先给模型自检手段 → 模型分层 → 管好缓存与压缩）在自己的真实任务上小范围试验，并用同一任务跑两遍对比每任务成本与 turn 数；因为其中的命令和判断规则可以直接照做，但文章反复声明所有金额与 token 数都是示意值，只有你自己 /usage 出来的数才算。
- 原文：https://claude.dev/blog/what-a-task-costs-on-opus-5-5/
- 来源：rss:claude.dev，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T00:28:03.327Z

## 是什么

这是 claude.dev 上的一篇成本 playbook（作者 Addy Osmani，2026-09-25 发布，21 分钟阅读），标题《What a task costs on Opus 5.5》。它回答三个问题：我的典型任务在 Opus 5.5 上花多少钱、哪些设置会改变它、怎么查自己的会话用量。

核心论点：决定一次 Claude Code 任务成本的只有四件事——turn 数（每一轮都会重发此前的整个对话）、cache 读取比例、output token（思考按 output 计费，是 input 价的 5 倍）、模型选择。所以「同样 token 单价的两个模型，在同一任务上花费可以差很多」，因为一个模型可能多读一轮、多试一次。文章反复强调：所有数字都是 list price 或示意值，必须用自己的任务实测。

## 具体做法（可直接照做的步骤）

### 1. 先建基线：查一次会话的真实用量
前提：在 Claude Code 会话里，任务结束或中途都能看。

```
/usage
```

`/cost` 效果相同。Session 区块给出 input、output、cache 三项；prompt-cache 行说明有多少输入来自缓存。在 Pro/Max/Team/Enterprise 计划上同一屏还显示计划用量条。文章提醒：这个美元数字是在你本机按 list price 算的，订阅制下它是「你干了多少活」的参照，不是账单。

### 2. 升级到文章要求的版本
前提：你要按本文切换 Opus 5.5 做对比。

```
claude update
```

原文写明 Opus 5.5 需要 Claude Code v2.1.280 或更高。

### 3. 用同一任务跑两遍做对比（文章指定的验证方法）
- 从 backlog 里挑一个真实任务，不要用玩具例子。
- 用 `/model` 在 Opus 5 与 Opus 5.5 之间切换，各跑一次。
- 记录每次的 turn 数、output token 数和成本。
- 做三到四个任务再下结论。

### 4. 设 effort：默认 medium，按任务形状升降
前提：会话内可随时改，改动对下一个请求生效。

```
/effort medium
/effort status
```

- 日常范围清晰的工作用 medium（Opus 5.5 的默认就是 medium，比 Opus 5 的默认 high 低一级）。
- 机械工作（重命名、跨文件套用已知模式）用 low。
- medium 卡住再升 high。
- xhigh 和 max 只留给「你已经量出收益」的难题或单次会话。
- 文章明确警告：不要沿用你为 Opus 5 选的等级，同一等级下 Opus 5.5 每轮思考更多。在 API key 或 Claude 订阅下改 effort 不清缓存；但在 Amazon Bedrock、Google Cloud 的 Agent Platform 或 Claude apps gateway 上改 effort 会清掉缓存会话，下一次请求要为全部内容付 cache-write 价，所以那类环境要在休息点改。

### 5. 优先给模型「自检手段」，而不是升 effort
前提：项目里能跑测试、构建，或有能调端点的脚本。原文的规则是：升 effort 之前先问模型有没有办法检查自己的产出。一个能跑通客户端测试的任务，会在写错的当轮就暴露字段没改全的问题；升 effort 会让每一轮都变贵，而一次测试只花一轮加其输出。

### 6. 分层用模型（省 token 最有效的一招）
- Opus 5.5 当日常主力：跨几个文件的 feature 工作、调试、带后续修改的 code review——你盯着，循环短。
- 查找类工作下沉到 Sonnet 或 Haiku：搜索并总结的 subagent、读日志和测试输出、`这个定义在哪` 这类问题。做法是在 subagent 定义里写：

```
model: haiku
model: sonnet
```

- 要给所有 subagent 统一指定模型，设环境变量：

```
CLAUDE_CODE_SUBAGENT_MODEL
```

subagent 定义里写的模型会覆盖这个变量；没写模型的 subagent 跑在主模型上（除非设了变量）。
- 大量文件的机械编辑不要下沉模型，留在 Opus 5.5 并把 effort 设 low。
- 上升到更大模型（文中是 Fable 5.1，list price $10/M input、$50/M output）：用于无人监督的长跑、代码库里没有先例的问题、需要协调多个 subagent 的大改动。切换规则：xhigh 下同一个问题撞两次就切，解决后切回。切换要在自然断点，先 `/compact` 或新开会话并写一份简短计划，因为缓存属于旧模型，新模型第一轮要为整个对话付写缓存价。用 `/model` 切换（它也会把选择存为新会话默认值）。
- 判断权留在主模型。`opusplan` 别名是另一种分法（Opus 在 plan mode 规划、Sonnet 执行），文章说这与你上面的分工相反，变成默认前先自己量。

### 7. 缓存与会话形状
前提：理解缓存只复用「从头开始匹配」的前缀。
- 稳定会话每轮往对话末尾追加，命中率高；改工具定义会清掉整个缓存，改 system prompt 会从那一处起清掉（几乎是全部）。
- 原文列出预期会写缓存的时机：暂停超过缓存生命周期；在 Bedrock / Agent Platform / gateway 上改 effort；会话里第一次开 fast mode；连接或断开 MCP server；切换模型；对话被压缩。所以这些都在会话开始时设好，运行中别动。
- cache 生命周期：Claude 订阅 1 小时；API key 或云服务商默认 5 分钟，订阅一旦动用 usage credits 也会降到 5 分钟。每次命中会免费重置生命周期。120K 上下文下 5 分钟写缓存约 $0.60、读约 $0.02，一次写等于 25 次读。
- 长会话每轮更贵：20K 上下文时一轮 cache read 约 $0.004，150K 时约 $0.03，30 轮就 $0.90，而同样 30 轮在 20K 下约 $0.12。

### 8. 上下文清理：/clear、/compact、/rewind、/autocompact

```
/clear
/compact keep the failing test names and the schema change
/rewind
/autocompact
```

- `/clear` 清空对话、不花钱，换到不相关工作时用。
- `/compact` 保留连续性、花一次请求；可以在指令里说要保留什么（原文示例：保留失败的测试名和 schema 改动）。150K 时压缩约 $0.25，之后每轮省约 $0.025 的读，约十轮回本；快结束时压缩是亏的。压缩有损、会丢细节，要在自然断点做。
- 缓存冷的时候别压缩：休息超过缓存生命周期后压缩，会把整个对话重读一遍再写回缓存（150K、5 分钟缓存下光 input 就约 $0.75）。
- 想丢掉走错的路，用 `/rewind` 回到更早的轮次；缓存热时它回到的正是已缓存的前缀。
- `/autocompact` 加一个 token 数可以改自动压缩的触发阈值。

### 9. 审计迁移过来的提示词

```
/claude-api prompt-audit
```

前提：你从旧模型迁到 Opus 5.5，或在 Claude Platform 上构建应用。它检查 Claude Code 的 skills、CLAUDE.md 里的提示词反模式，也检查你构建的应用代码。原文案例：从 Opus 4.8 迁到 Opus 5.5，内部 44 张工单的客服基准上，低 effort 迁移把成本降了约 18%，跑 prompt-audit 再降 9%，合计比 Opus 4.8 起点低约 25%。被删掉的是让模型写更多、重复调工具的仪式性指令：强制六步流程、scratchpad 规则、verify-twice 规则、互相矛盾的指令。

### 10. 控制每轮都会重发的东西
- CLAUDE.md 在每个会话开始时载入，每一行都会在每轮重发；成本文档建议控制在 200 行以内。
- MCP 工具定义是延迟加载的，开始时只载入工具名和 server 指令；用 `/mcp` 看连了哪些 server，关掉不用的。

### 11. fast mode 只在会话开头开
fast mode 让 Opus 5.5 快最多 2.5 倍、价格翻倍（$8/M input、$40/M output）；订阅下走 usage credits 而非计划额度。开启后的第一次请求会为整个对话付 fast-mode input 价且不走缓存，所以要在会话开始开，不要跑到一半开。

### 12. 长跑结束后看报告；团队看报表
原文提到 Opus 5.5 会在长跑结束时汇报改了什么、发现了什么、需要你做什么，这能减少重跑。团队层面用 Claude Code Analytics API 看每用户估算成本，用 Usage and Cost API 按模型和缓存/非缓存 token 拆分开支。

## 对应的研究问题

1. 能力发现：原文基本不涉及「AI 还能做什么」。唯一可提炼的是把「检查自己的提示词/技能定义」也交给 AI——`/claude-api prompt-audit` 会扫 skills 和 CLAUDE.md 里的反模式并指出修改方向，属于不常想到交给模型的元任务。
2. 任务匹配：这是全文最厚的一块。给了明确分工：小模型做查找、读日志、跑测试；Opus 5.5 做受人监督的 feature / 调试 / review；更大的模型（Fable 5.1）做无人监督长跑、无先例问题、多 subagent 大改动。effort 与任务类型的映射也很具体：low 机械、medium 日常范围清晰、high 卡住时、xhigh 难题、max 单次会话。
3. 条件供给：给模型可自检的手段（测试、构建、调端点的脚本）比加思考更划算；缓存命中依赖稳定的会话形状、不在中途改工具定义 / system prompt / effort（云环境）/ MCP 连接；CLAUDE.md 控制在 200 行内；用 `CLAUDE_CODE_SUBAGENT_MODEL` 或 subagent 定义里的 `model:` 供给模型选择；团队用 API 供给成本数据。
4. 主动推进：只沾到边。`/autocompact` 按上下文接近上限的状态自动触发压缩；agent teams 的 teammate 会持续用 token 直到退出（plan mode 下约为标准会话 7 倍 token）；长跑以报告收尾。原文没有讲时间或事件触发的持续任务编排。
5. 效果验证：给了完整方法。会话内 `/usage`（或 `/cost`）看三项：cache 占比（长会话应高，低就去查长暂停、换模型、中途连 MCP、云环境改 effort）、output 对 input 的比例（小改动却大量 output = effort 过高或在重试）、总 input 对会话大小的倍数（倍数大说明 turn 多，去读对话找重复的循环）。方法上：同一真实任务在两模型各跑一次，跑三四个任务再下结论；团队用 Analytics API 和 Usage and Cost API。基线：企业部署平均约 $13/开发者/活跃日，90% 用户在 $30/活跃日以下。

## 与已有做法的关系

清单中有 Claude Code（tool，adopt）和 Claude Code Mods（tool，study）。本文是 Claude Code 的操作层成本 playbook，直接补充 Claude Code 条目：具体命令（/usage、/cost、/effort、/model、/clear、/compact、/rewind、/autocompact、/mcp、/claude-api prompt-audit、claude update）、环境变量 CLAUDE_CODE_SUBAGENT_MODEL、subagent 定义里的 model 字段，以及一套「先量再调」的试验流程。与 Claude Code Mods 没有直接关系。

## 证据与局限

原文给出的数据：
- Opus 5.5 API list price：$4/M input、$20/M output、$0.20/M cache read；cache read 是 input 价的二十分之一（Opus 5 是十分之一）。相比 Opus 5，input 和 output 便宜 20%，cache read 便宜 60%。
- 一个示意会话（cache read 2.0M、fresh input 200K、output 60K）：Opus 5 为 $3.50，Opus 5.5 为 $2.40，同一 token 数下 −31%；按 22 工作日、每天 10 个任务算，月省 $242。
- 44 张工单的客服基准迁移案例：低 effort 降约 18%，prompt-audit 再降 9%，合计约 25%。
- 其他规则：cache write 为 input 价 1.25 倍（5 分钟）/ 2 倍（1 小时）；fast mode 2 倍价、快 2.5 倍；agent teams plan mode 约 7 倍 token；企业平均 $13/开发者/活跃日、90% 低于 $30。

哪些只是作者主张：文中大量 token 数是作者自己声明的示意值（token counts are illustrations）；「Opus 5.5 比 Opus 5 便宜 40%」是作者团队的估计，建立在「默认设置下每任务用更少 token」这个假设上，作者强调这不是 token 单价降 40%；Opus 5.5 每任务用更多还是更少 token，作者明说要自己量。prompt-audit 的 25% 来自一个基准，作者明说当例子看，不要当成预期值。

适用条件：结论针对 Claude Code；缓存行为按付费方式不同（订阅 1 小时、API/云 5 分钟、用完 credits 后转 5 分钟）；云服务商或 gateway 上改 effort 会清缓存，所以「中途升降 effort 不破缓存」只在 API key 或订阅下成立。价格是 list price，不含 batch（半价）和 volume 折扣，也没有计入 cache write。

另外，原文描述的模型与价格（Opus 5.5、Fable 5.1、Claude Code v2.1.280）是这篇文章自己给的，你环境里是否存在、价格是否如此，要以自己的环境和官方文档为准；如果版本对不上，可用的仍是它的方法而不是它给的数字。

## 怎么试、怎么验证

最小试用（半天内可做）：
1. 在一个真实任务开始前定好 effort（默认 medium），任务结束时跑 `/usage`，记下 input、output、cache 占比、成本、turn 数，这是你的基线。
2. 找同一类任务再跑一次，只改一个变量：把 effort 降一档、或把查找类 subagent 换成 Haiku/Sonnet、或在一个断点用 `/compact` 而不是用 `/clear`。比较两次的 `/usage`。
3. 挑一个范围清晰的真实任务，先 `claude update`，再用 `/model` 在 Opus 5 与 Opus 5.5 各跑一次，记 turn、output token、成本。三四个任务后再下结论。
4. 如果是从旧模型迁移过来，跑 `/claude-api prompt-audit`，再拿一个真实任务比较审计前后的 `/usage`。

判断有没有改善的指标：
- 每任务成本（`/usage` 的估算值）下降，同时任务完成质量不变（测试通过、不需要人再补一遍）。
- turn 数下降——turn 是最贵的变量，因为每轮都重发全部上下文。
- cache 占比维持在长会话应有的高位；掉下来就去查作者列的那几个原因：超过缓存生命周期的暂停、中途换模型、中途连 MCP server、云环境改 effort。
- output token 相对 input 的比例是否与任务规模相称（小改动大 output = effort 过高或在重试）。
- 同一个问题是否要解决两次；原文的换模型规则是 xhigh 下同一问题撞两次就换更大的模型。
- 团队层面：Analytics API 的每用户估算成本、Usage and Cost API 按模型与缓存/非缓存拆分，对照 $13/开发者/活跃日的企业基线看自己是否偏高。
- 反向指标：省 token 的手段（降 effort、换小模型、减上下文）都可能让任务做不完，而一次重试比省下的更多——所以要看「任务完成 + 成本」两项一起，而不是只看成本。
