# Fixing Tool-Call Accuracy in vLLM

- 结论：**值得一试**。建议在 Kimi/DeepSeek 的 vLLM 0.31 服务上小范围试用：启用 `--tool-strict-level` 开启约束解码，并用 K2VV ToolCall 基准对比 schema accuracy 后再上线；原文给出了 92% 到 100% 的案例和验证流程，但没有完整启动命令或参数值，且对其他模型可能引入回归。
- 原文：https://www.ubicloud.com/blog/fixing-tool-call-accuracy-in-vllm
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T14:56:45.320Z

## 是什么
Ubicloud 记录了其用 vLLM 服务 Kimi K2.6 和 DeepSeek V4 Flash 时，工具调用 schema 准确率不足会导致 agent 多轮上下文被错误污染。vLLM 0.31 提供 server-side flag `--tool-strict-level` 来开启 constrained decoding，借助 XGrammar 在生成时屏蔽不符合 tool schema 的 token，把工具调用 schema 准确率从 92% 提升到 100%。原文核心不是新模型，而是推理引擎配置和验证方法。

## 具体做法
1. 确认前提：目标是服务 Kimi K2.6 或 DeepSeek V4 Flash；推理引擎使用 vLLM 0.31。原文提到 vLLM 0.28 服务 Kimi K2.6 时 schema 准确率为 92%，vLLM 0.31 提供 server-side flag。还需要已定义好的 tool schema JSON，以及 agent harness（原文示例为 OpenCode）。原文没有给出完整 vLLM 启动命令和 flag 参数值，不能凭空补全；实际使用前需按 vLLM 0.31 文档确认语法和取值。
2. 准备工具声明和 schema：agent harness 向模型发送 JSON 数组，每个 function 包含 name、description、parameters（JSON Schema）和 required 字段。parameters 中说明参数类型、enum、默认值和必填项。原文示例是 OpenCode 的 webfetch 工具，参数包含 url、format 和 timeout。只有调用符合该 schema，harness 才能执行。
3. 在 vLLM 0.31 启动配置中加入严格工具调用开关，原文给出的 flag 是：
```
--tool-strict-level
```
该 flag 用于开启 tool-call strictness/constrained decoding。前提是所选模型支持 constrained decoding，并且推理服务能正确把模型工具调用格式翻译为语法约束；原文没有给出 flag 的具体取值或完整命令行。
4. 确认模型工具调用语法和解析器一致。原文给出 Kimi K2.6 的工具调用语法为：
```
# Kimi K2.6 tool call syntax:
# <|tool_call_begin|>{function.name}:{index}
# <|tool_call_argument_begin|>{arguments}
# <|tool_call_end|>
```
vLLM 使用 XGrammar 的 structural tags，在生成过程中按 开始工具调用 → 工具名 → 调用序号 → 开始参数 → schema 约束 JSON → 结束工具调用 的路径约束 token。解析器需要能把模型特定 token 解析成 JSON tool_calls。
5. 用 K2VV ToolCall benchmark 验证。该基准包含 2000 个请求，衡量两个指标：trigger similarity（是否触发工具调用及与 Moonshot AI 服务的相似度）和 schema accuracy（生成的工具调用符合 schema 可成功调用的比例）。先测基线，再开启严格模式后重跑同一基准，并验证所有服务的模型版本。原文的基线是 Kimi K2.6 在 vLLM 0.28 上 92%，开启 constrained decoding 后达到 100%。
6. 排查三类已知问题：一般模型问题，部分模型的无约束输出与工具 schema 或工具调用格式差异过大；grammar translation bugs，vLLM 把工具 schema 或工具调用格式翻译成模型语法时出错；feature interaction bugs，例如 constrained decoding 与 speculative decoding 交互导致请求失败。若开启后出现请求失败或准确率下降，应对该模型关闭或回退，不要对所有模型默认开启。
7. 验证通过后再部署，并监控 malformed tool calls、请求失败、重试次数和上下文污染情况。原文称 constrained decoding 的运行时开销可忽略，但没有给出量化延迟数据，试用时仍应监测延迟。

## 对应的研究问题
- 能力发现：原文展示的是让开放权重模型在 agent 工作流中更可靠地调用外部工具，尤其是 webfetch 这类有明确 JSON Schema 的工具；约束解码把 schema 准确率从尽力而为变成运行时保证。
- 任务匹配：适合用 vLLM 服务 Kimi/DeepSeek、且 agent 多轮会话中工具 schema 严格的场景。原文强调 constrained decoding 是 per-model 任务，vLLM 作为模型无关引擎默认关闭；其他模型如 gpt-oss-20b、Qwen 3.6、GLM 5.1 有开启后出问题的报告。
- 条件供给：需要提供 tool schema、模型特定的工具调用 token 格式、支持 constrained decoding 的 vLLM 0.31、能解析工具调用的 harness，以及 K2VV ToolCall 这类反馈基准。
- 主动推进：原文没有涉及由时间、事件或状态触发并持续完成的工作；只说明生成时逐步屏蔽非法 token，不能作为主动推进的依据。
- 效果验证：原文给出可操作指标 schema accuracy 和 trigger similarity，并用 2000 请求的 K2VV ToolCall 对比开启前后，且要求验证所有服务模型版本。

## 与已有做法的关系
- DeepSeek（try）：直接相关。原文明确服务 DeepSeek V4 Flash，并在启用 constrained decoding 后验证工具调用 schema 准确率。
- OpenCode（watch）：相关但非修复对象。原文把 OpenCode 作为 agent harness 示例，展示工具声明、工具调用解析和执行流程。
- Firecracker（study）：无关。原文没有涉及 Firecracker。
- 清单中没有 vLLM、XGrammar 或 K2VV ToolCall 条目；上述 DeepSeek 和 OpenCode 是直接相关条目。

## 证据与局限
原文给出的数据：vLLM 0.28 服务 Kimi K2.6 时 schema 准确率 92%，即约 2/25 次工具调用失败；切换到 vLLM 上游 constrained decoding 后曾因默认关闭降到 91%；Ubicloud 开启 constrained decoding 并验证后达到 100%。K2VV ToolCall 基准包含 2000 个请求，衡量 trigger similarity 和 schema accuracy。原文还称 XGrammar 通过预计算 token mask 使运行时开销可忽略。
这些主要是作者所在厂商的单一部署经验，没有独立复现或延迟数据；上下文污染、模型性能下降和重试成本增加属于作者主张，未给出量化。适用条件限定在 Kimi/DeepSeek 与 vLLM 0.31；原文没有给出完整启动命令和 flag 取值，且明确指出其他模型可能因一般模型问题、grammar translation bugs 或 feature interaction bugs 出现回归。

## 怎么试、怎么验证
最小试用：选一个 Kimi K2.6 或 DeepSeek V4 Flash 的 vLLM 0.31 部署，固定 harness 和 tool schema，先用 K2VV ToolCall 或同规模代表性请求测基线，记录 schema accuracy、trigger similarity、请求失败率、重试次数和 p95 延迟。确认 `--tool-strict-level` 的正确用法后启用，重跑同一批请求。
判断改善：schema accuracy 应明显提升，原文目标是 100%；trigger similarity 不应变差；请求失败率和重试次数不应增加；延迟不应出现不可接受的回退。若出现 grammar translation 或 speculative decoding 交互问题，应针对该模型关闭严格模式并回退。上线后继续用生产日志统计 malformed tool calls、解析失败和重试情况。
