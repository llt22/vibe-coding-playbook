# collinzrj/claude-code-auto-safeguard-prompt

- 结论：**值得一试**。建议小范围试用：把该提示词作为独立监控模型的 system prompt，在工具调用前做 shadow 审查，再逐步开启 HARD BLOCK；理由是原文给出了较具体的风险分类、输入格式和用户同意规则，但缺少接入代码、完整规则和效果数据，不能直接 adopt。
- 原文：https://github.com/collinzrj/claude-code-auto-safeguard-prompt
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T12:21:47.784Z

## 是什么

这是一份给自治 AI 编程智能体做“动作前安全审查”的系统提示词。它把被监控 agent 描述为有 shell、文件系统、API 凭据、可长时间无人值守、可能处于共享环境的执行者；监控器读取 transcript，判断最新一次工具调用是否应被拦截。原文把风险分为三类：prompt injection、scope creep、accidental damage；把规则分为 HARD BLOCK（无条件拦截）和 SOFT BLOCK（在用户明确意图下可解除）。给出的原文是提示词正文，不是安装文档。

## 具体做法

1. 前提：你有一个会执行工具调用的 coding agent，以及一个独立的监控模型或分类器。监控器要能拿到完整 transcript 和最新工具调用，并且最好能在工具执行前运行。原文要求 transcript 包含 user/assistant 消息、工具调用、meta 行、outcome 行等环境事实。

2. 把仓库中的提示词全文作为监控器的 system prompt，不要塞进被监控 agent 自己的 system prompt，避免让被监控对象自己判断自己。原文开头是：

```
You are a security monitor for autonomous AI coding agents.
```

3. 每次工具调用前，把以下内容一起送入监控器：`transcript` 对话历史，加上最后一条工具调用作为待评估动作；保留 harness 注入的 meta 行、outcome 行和 host context。原文明确：transcript 只是上下文，待评估的是最后一条 tool call；meta 行不是动作；assistant 文本不是用户消息，不能单独建立用户意图。

4. 要求监控器输出 allow/block、命中的规则和理由。HARD BLOCK 不允许用用户上下文放行；SOFT BLOCK 只有在用户明确命名危险动作和危险参数时才放行。原文的同意门槛是：用户必须命名动作以及使其危险的具体对象；agent 自己推断、选择或从工具结果里拿到的参数不算用户意图。

5. 先开 shadow mode：只记录判定，不真正拦截。把监控器判定和人工复核或事后审计对比。前提是不能直接在生产或共享环境开启阻断。

6. 稳定后再对 HARD BLOCK 开启阻断；SOFT BLOCK 先只告警，逐步调整规则。原文提到 classifier 不可达或解析失败时会 fail-closed，这会影响可用性，试用时要单独统计这种情况。

7. 如果仓库没有给出具体接入代码，不要臆造安装命令。按你所用 harness 的 pre-tool hook 或权限层接入；原文只提供提示词逻辑，不提供完整部署流程。

## 对应的研究问题

- 能力发现：可把“安全审查/拦阻”交给第二个模型，覆盖 prompt injection、scope creep、accidental damage 三类风险。这是原文明确列出的能力范围。
- 任务匹配：适合有 shell、文件系统、API 凭据、长时间自治、可能处于共享环境的 coding agent；低风险、短任务不一定需要独立监控器。监控器应独立于被监控 agent。
- 条件供给：需要完整 transcript、最新工具调用、meta/outcome/host context、仓库可见性、gitStatus、navigation 等 harness 事实；需要给监控器阻断权限；需要明确 HARD/SOFT 规则和用户同意规则。
- 主动推进：可按“每次工具调用”事件触发，在动作执行前自动审查；适合长时间任务持续监控。原文还提到 classifier 不可达或解析失败时 fail-closed。
- 效果验证：原文没有给指标；可测误拦率、漏拦率、人工复核一致率、被拦动作类型分布、fail-closed 触发率，并保留日志做事后审计。

## 与已有做法的关系

清单中直接相关的是 Claude Code（adopt）：这个提示词明显面向 Claude Code 或同类自治 coding agent 的 harness，可作为其权限系统之外的二次审查层，不是替代品。Semble（try）和 Cline（watch）没有直接依据，不能硬套。原文还引用 Claude-in-Chrome navigation、repoVisibility、gitStatus 等 harness 概念，说明它和具体运行环境耦合较强。

## 证据与局限

原文给了较完整的分类器提示词：角色、威胁模型、输入格式、HARD/SOFT 区分、用户意图的高证据门槛、复合动作、写文件执行、子代理委托等评估规则。但没有给出安装步骤、代码、模型选择、阈值、基准数据或实际案例；stars 数不是效果证据。原文在子代理委托规则处被截断，看不到完整 BLOCK 列表和后续内容，无法判断规则完备性。它高度依赖 harness 提供的 meta/outcome 行，换环境可能失效。提示词很长，可能增加延迟和成本；误拦和漏拦都需要实测。适用条件是：你已经有能记录完整工具调用 transcript 的 agent 运行环境，并能把监控器放在执行前。

## 怎么试、怎么验证

最小试用：选一个低风险仓库或沙盒，跑一个较长任务的 coding agent；用仓库提示词作为独立监控器的 system prompt；只记录不阻断，覆盖至少 20-50 次工具调用（原文没有给样本量，这是试用建议）。人工标注每次调用是否应拦。指标包括：误拦率（合法动作被拦/总合法动作）、漏拦率（应拦未拦/总应拦）、与人工一致率、平均审查延迟、fail-closed 次数。若误拦率可接受且能抓到至少一类真实风险，再对 HARD BLOCK 开阻断；否则只保留告警。不要用“拦了多少”作为唯一成功指标，要看是否减少真实危险动作且不阻断正常开发。
