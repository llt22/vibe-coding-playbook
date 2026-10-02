# Building with Claude Sonnet 5.5

- 结论：**值得一试**。把这篇当作 Sonnet 5.5 的选型与迁移操作手册来小范围试用：先按任务类型选模型、再按原文步骤迁移和调 effort，因为原文给了可直接照做的代码、参数和提示词；但所有档位和收益都需要用自己的 eval 重新验证，不能直接照抄当结论。
- 原文：https://claude.dev/blog/building-with-claude-sonnet-5-5/
- 来源：rss:claude.dev，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T00:27:34.235Z

## 是什么

这是 claude.dev 上的构建手册（作者 Addy Osmani，发布于 2026-09-28，9 分钟阅读），主题是 Claude Sonnet 5.5：什么时候用 Sonnet 5.5 而不是 Opus 5.5、价格、模型细节、从 Sonnet 5 迁移的破坏性变更，以及 effort / thinking / 缓存的调参方式。

它不是新闻稿：原文给出了模型 ID、定价表、effort 档位、5 个破坏性变更的前后对比代码、一段可直接复制的系统提示词、拒答的分类与回退配置。对“什么工作适合什么模型、需要什么配置”这两个问题，是可照做的素材。

## 具体做法（编号步骤）

前提：有 Anthropic API key，装好 anthropic SDK；如果用 `between_tools`，确认 SDK 版本已定义该字段，否则先升级。

**1. 先按任务类型选模型**（原文表格，直接照抄）

| 你的活儿 | 起步用 |
|---|---|
| 范围清晰的日常编码：修 bug、快速迭代功能、对照需求验证 | Sonnet 5.5 |
| 高频日常开发 | Sonnet 5.5 |
| 打磨文档、幻灯片、表格（一页纸、图、摘要页、文档修改、表格整理），需要设计感 | Sonnet 5.5 |
| 明确定义、反复运行的 agent 任务：调查、评审、起草 | Sonnet 5.5 |
| 需要谨慎判断的复杂工作，包括长周期 agentic 编码和知识工作 | Opus 5.5 |
| 最难、最需要智力的问题 | Opus 5.5 |

原文给的判据：任务有清晰规格（spec）和可验证结果时用 Sonnet 5.5；最难的长周期工作用 Opus。

**2. 跑通最小调用**

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": "Analyze the trade-offs between microservices and monolithic architectures",
        }
    ],
    output_config={"effort": "medium"},
)

for block in response.content:
    if block.type == "text":
        print(block.text)
```

关键点：Sonnet 5.5 默认开启 thinking，响应可能以 thinking block 开头，必须按 `block.type` 遍历读取；直接取 `content[0].text` 会崩。

**3. 从 Sonnet 5 迁移（改 model ID，再处理 5 个破坏性变更 + 1 个响应结构变更）**

3.1 让 Claude Code 代劳：

```text
/claude-api migrate this project to claude-sonnet-5-5
```

3.2 用 `between_tools` 取代“关闭 thinking”：Sonnet 5.5 上 `thinking: {"type": "disabled"}` 会返回 400，改用：

```python
# Before: Claude Sonnet 5
client.messages.create(
    model="claude-sonnet-5",
    max_tokens=16000,
    thinking={"type": "disabled"},
    output_config={"effort": "xhigh"},
    messages=[{"role": "user", "content": "..."}],
)

# After: Claude Sonnet 5.5
client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=16000,
    thinking={"type": "between_tools"},
    output_config={"effort": "high"},
    messages=[{"role": "user", "content": "..."}],
)
```

`between_tools` 的限制（原文）：只在 low/medium/high 有效，xhigh 或 max 会 400；不接受 display、budget_tokens、block_binding；effort 不能在对话中途变。它带来的是“只在工具调用之间思考”，总响应时间持平或更快。无工具、需要几步推演的请求，改用 adaptive thinking。

3.3 强制的 tool_choice 换成 auto + strict：`tool_choice` 为 `any` 或 `tool` 会 400（token counting 端点也一样）。改成：

```python
weather_tool = {
    "name": "get_weather",
    "description": "Get the current weather in a given location",
    "input_schema": {
        "type": "object",
        "properties": {"location": {"type": "string"}},
        "required": ["location"],
        "additionalProperties": False,
    },
    "strict": True,
}

client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    tools=[weather_tool],
    tool_choice={"type": "auto"},  # was {"type": "tool", "name": "get_weather"}
    messages=[
        {"role": "user", "content": "What's the weather in Paris? Use the get_weather tool."}
    ],
)
```

strict 工具要求每个 object 都带 `additionalProperties: false`，并在提示词里说明什么时候用这个工具。

3.4 对话保持 append-only：Sonnet 5.5 的 thinking block 与模型和会话绑定；Sonnet 5.5 能读 Sonnet 5 的 thinking block，所以从 Sonnet 5 切过来的会话能保留推理，但其他模型读不了 Sonnet 5.5 的 block。

3.5 computer use 改走 toolset：Claude API 和 Google Cloud 上只支持 `{"type": "computer_toolset_20260801"}`，声明 `computer_20251124` 会 400。去掉 `anthropic-beta: computer-use-2025-11-24` 头、去掉 SDK 的 betas 参数、改用标准 client 调 Messages API，并更新 agent loop 以处理 member tool_use blocks、批量动作和结果上的 toolset_name。同时去掉 `fine-grained-tool-streaming-2025-05-14`（与 toolset 条目同用会 400），需要的话在每个工具上设 `eager_input_streaming: true`。Amazon Bedrock 仍接受 `computer_20251124`。

3.6 检查 advisor 配对：Sonnet 5.5 执行方会拒绝 Opus 4.8、Opus 4.7、Sonnet 5 作为 advisor；接受 Opus 5.5、Opus 5 和 Sonnet 5.5 自身。被接受 advisor 的建议以加密的 `advisor_redacted_result` block 返回，代码读不到建议正文。

3.7 从 thinking block 读工具调用之间的文本：这些进度笔记长于一两句时以 progress-update thinking block 返回，默认 display 下为空。用 adaptive thinking 时把 `thinking.display` 设为 `"updates"`（beta，需 `thinking-display-updates-2026-08-18` 头）或 `"summarized"`，并在随后的 tool_use block 之前渲染每个非空 thinking block。用 `between_tools` 时文本直接回来，不需要 display 设置。

**4. 重跑 effort sweep（effort 档位被重新校准，旧设置不可迁移）**

- 除非工作负载是 agentic 或对延迟敏感，从 `high` 起步。
- agentic 编码和多步工具调用：明确定义的任务从 `medium` 起步，更难更长的用 `high`。
- 聊天和其他延迟敏感场景：从 `medium` 或 `low` 起步。
- 只在 eval 证明有质量提升时才用 `xhigh` 或 `max`；用高了会失去 Sonnet 的质量/速度/成本平衡，那就该考虑 Opus 5.5。

**5. 给 thinking 留 token：thinking 计入 max_tokens**

agentic 编码把 `max_tokens` 设到模型上限 128,000 并发流式。想要更少思考就调低 effort 档位——在系统提示里让模型“少想”不可靠。

**6. 删掉为 Sonnet 5 写的 workaround，再重跑 eval**

原文明确点名：refusal steering、tool-call 重试垫片、“do not be lazy”这类补丁都该删掉，删完先重跑 eval，再调别的。

**7. 低 effort 下补一段“真实检查”系统提示**

Sonnet 5.5 通常报告完成前会自检，但低 effort 时有时跳过真正跑一遍变更的检查。原文建议加这段：

```text
When you change code that can be run, built, or type-checked, run a real
check that exercises the change before reporting it done: the project's
tests, type-checker, or build, or the changed command itself. A syntax-only
check, or a check command that failed to start, does not count; if all
that is missing is the project's declared dependencies, install them with
its own package manager and lockfile (e.g. npm install, pip
install -r requirements.txt), never via sudo or the system package manager,
unless told not to. Only if no real check can run here, say which one you
did not run and why instead of reporting the change as done.
```

**8. 用 thinking.display 拿进度，而不是让模型把推理写进正文**

```python
thinking={"type": "adaptive", "display": "summarized"}
```

原文理由：要求模型把推理写出来会触发 `reasoning_extraction` 拒答。面向用户的进度笔记用 `display: "updates"`（beta）；想在固定位置出笔记（比如第一次工具调用前一行、结尾一段小结），在系统提示里写清楚。

**9. 多缓存**

最小可缓存 prompt 从 1,024 降到 512 token，短系统提示和工具定义现在也能缓存；cache read 是 input 价格的十分之一。注意：改顶层 effort 会让缓存失效，想某一轮用不同档位就用 per-message effort（beta），缓存可保住。

**10. 处理拒答与回退**

被拒请求返回 HTTP 200 + `stop_reason: "refusal"`，`stop_details` 给出五类之一：cyber、bio、frontier_llm、reasoning_extraction、general_harms。服务端回退 `fallbacks: "default"`（beta，Claude API）只对 cyber 和 frontier_llm 重试到 Sonnet 5，其余三类不重试；也可以自己写 SDK 中间件或重试。合法的安全工作可通过 Cyber Verification Program（即将覆盖 Sonnet 5.5）。

**11. 在 Claude Code 里用**

Claude Code v2.1.284（Agent SDK for TypeScript v0.3.284）起，`sonnet` 别名在 Claude API 上解析为 Sonnet 5.5，默认 medium effort，原生 1M 上下文。Claude Code 里不能关闭 thinking，effort 决定思考量，Sonnet 5.5 没有 fast mode。默认模型仍是 Opus 5.5，范围明确的任务用 `/model sonnet` 切换。

## 对应的研究问题

**1. 能力发现（AI 已经能做哪些还没想到交给它的工作）**

- 原文点出几类容易被忽略、但 Sonnet 5.5 已胜任的活儿：打磨文档/幻灯片/表格（一页纸、图、摘要页、文档修改、表格整理）且“有设计眼光”；反复运行的明确定义的 agent 任务（调查、评审、起草）。
- Epic Games 的测试描述：模型能处理数万行代码的游戏系统架构、保持响应速度、完成多小时任务，并且“更少的规定性提示”就能交付。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**

- 本文核心就是这一条：上文的选型表直接回答“编码/文档/agent 任务 → Sonnet，长周期复杂判断/最难问题 → Opus”。
- 档位匹配：agentic 编码 medium→high，聊天/延迟敏感 medium 或 low，xhigh/max 只在 eval 证明有益时用。
- Claude Code 内用 `/model sonnet` 处理范围明确的任务，默认仍是 Opus。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**

- 信息：清晰的 spec 和可验证结果是选 Sonnet 的前提；低 effort 下要额外提供“真实检查”系统提示。
- 工具：严格工具定义（`strict: true` + `additionalProperties: false`）配合 `tool_choice: auto`；computer use 需换成 `computer_toolset_20260801`。
- 权限/环境：`max_tokens` 放到 128,000 并流式；agentic 场景留足思考 token。
- 反馈：用 `thinking.display` 的 summarized/updates 读进度，而不是让模型输出推理；工具调用之间的笔记按 block 类型读取并原样回传。
- 成本条件：缓存门槛 512 token、cache read 十分之一价、顶层 effort 变更会使缓存失效。

**4. 主动推进（时间/事件/状态触发并持续完成）**

- 相关性有限但有据：`between_tools` 让思考只发生在工具调用之间，适合多步工具循环；对话 append-only 让 Sonnet 5→5.5 的会话保住推理；Epic 案例提到模型能跑多小时任务。
- 原文没有给定时触发、事件订阅或后台持续执行的机制，这条只能算弱证据。

**5. 效果验证（怎样判断确实改善了结果）**

- 原文明确要求：effort 档位被重新校准，必须重跑自己的 effort sweep；删掉旧 workaround 后先重跑 eval。
- 给出可判定的失败信号：变更被报告为完成却没有测试或构建输出，说明低 effort 跳过了真实检查，用那段系统提示补上。
- 成本侧指标：同一任务 token 数更少（原文称典型情况下最多省 30% 成本）、速度提升 30%、价格不变。
- 质量侧证据只有一句：自动化行为审计中 Sonnet 5.5 在多数对齐与诚实度指标上等同或优于 Sonnet 5，未给具体分数。

## 与已有做法的关系

- **Claude Code（adopt）**：本文直接补充了它的具体用法——v2.1.284 起 `sonnet` 别名指向 Sonnet 5.5、默认 medium effort、1M 上下文原生、不能关 thinking、没有 fast mode、`/model sonnet` 切换；还有 `/claude-api migrate this project to claude-sonnet-5-5` 这条迁移命令。这些可以直接补进 Claude Code 的既有条目。
- **Claude Code Mods（study）**：本文没有提到 mods，无直接关系。
- **Cline（watch）**：本文没有提到 Cline，无直接关系；但其中“strict 工具 + tool_choice auto”与“按 block 类型读取响应”的做法，对任何编排外部模型的工具都有参考价值。

## 证据与局限

**原文给出的具体数据**：

- 价格（每百万 token，Sonnet 5.5 / Opus 5.5）：输入 $2 / $4，输出 $10 / $20，5 分钟缓存写 $2.50 / $5，1 小时缓存写 $4 / $8，缓存读 $0.20 / $0.20。Sonnet 5.5 的全部价格（含批处理和提示缓存）与 Sonnet 5 一致，换 model ID 不改单价。US-only 推理（`inference_geo: "us"`）为标准价的 1.1 倍。
- 模型细节：model ID `claude-sonnet-5-5`（Bedrock 为 `anthropic.claude-sonnet-5-5`）；1M 上下文、原生、无需 beta 头；最大输出 128k，Message Batches API 加 `output-300k-2026-03-24` beta 头可到 300k；知识截止 2026 年 6 月；默认 adaptive thinking；effort 档位 low/medium/high/xhigh/max；Claude API 默认 high，Claude Code 默认 medium；分词器与 Sonnet 5 相同；最小可缓存 prompt 512 token（Sonnet 5 为 1,024）；限流独立于 Sonnet 5。
- 图像：使用高分辨率档，长边最高 2576 像素，一张 2000×1500 的图比 Sonnet 4.6/4.5 或 Haiku 4.5 多约 2.5 倍 token——不需要细节就先缩图。
- 性能主张：比 Sonnet 5 更聪明、更高效、快 30%；典型情况下同一任务用更少 token，多数工作最多便宜 30%。

**只有主张、没有数据支撑的部分**：

- “smarter, more efficient”没有给出基准分数。
- 对齐与诚实度的说法是“在多数指标上等同或优于 Sonnet 5”，出自自家自动化审计，没给分数或方法细节。
- 图片 token 增加 2.5 倍只给了这一个尺寸的例子。
- “大多数常规软件开发不受新网络安全防护影响”属于定性判断。

**案例**：Epic Games COO Daniel Vogel 的引语（早测中通过系统设计审计和数据流评审、管理数万行代码、多小时任务、更少规定性提示）；一个 code-to-painting 演示视频（照片 / Sonnet 5 / Sonnet 5.5 / Opus 5.5 四张对比图），但原文没有给评审分数。

**适用条件与局限**：

- 这是厂商自述文档，选型与收益结论都站在 Anthropic 自己的产品线上，没有第三方复现。
- effort 被重新校准，意味着 Sonnet 5 上的调参经验不能直接搬。
- 价格、模型 ID、beta 头名都带日期（如 `output-300k-2026-03-24`、`computer_toolset_20260801`），属于会过期的信息，写进手册时要标注版本和日期。
- 原文自相矛盾式提示：“如果忍不住想用 xhigh 或 max，记住 Sonnet 5.5 会思考更久、更贵”——这说明档位选择必须靠自己的 eval，不能靠文档默认值。
- 拒答回退只覆盖两类（cyber、frontier_llm），bio、reasoning_extraction、general_harms 需要自建重试逻辑，原文没有展开怎么处理。

## 怎么试、怎么验证

**最小试用方式（半天内可完成）**

1. 挑一个范围明确、结果可验证的任务（修一个 bug、或把一份材料做成摘要页/表格）。
2. 用上面的最小调用代码跑通，`effort` 先设 `medium` 和 `high` 各跑一轮；agentic 编码把 `max_tokens` 设 128,000 并开流式。
3. 同一任务用你现在的模型（Sonnet 5 或 Opus 5.5）跑一轮作为对照。
4. 删掉提示词里针对 Sonnet 5 的 workaround（refusal steering、tool-call 重试垫片、“do not be lazy”），重跑原有用例。
5. 如果变更被报告为完成却没有测试/构建输出，把那段“真实检查”系统提示加进系统提示，再跑一轮。
6. 如果同一会话要切档位，用 per-message effort（beta）而不是改顶层 effort，避免缓存失效。

**判断有没有改善的指标**

| 维度 | 指标 | 改善方向 |
|---|---|---|
| 成本 | 同一任务的输入+输出 token 数、实际账单 | 下降（原文预期最多 30%） |
| 速度 | 端到端延迟、首 token 延迟 | 下降（原文称快 30%） |
| 质量 | 人工通过率、需要返工/追问的次数 | 上升 / 下降 |
| 可靠性 | 报告完成时是否附有真实测试或构建输出 | 附有输出的比例上升 |
| 缓存 | 缓存命中率、cache read 占比 | 命中率上升（cache read 为 input 的 1/10 价） |
| 拒答 | `stop_reason: "refusal"` 的比例与类别分布 | 常规开发任务应为 0 |

**通过标准建议**：同一任务质量不低于当前模型、成本或延迟至少一项明确改善、且“无检查就报完成”的情况减少，才把它写进手册当成默认选择；任一项变差，就退回 Sonnet 5 或按选型表改用 Opus 5.5。
