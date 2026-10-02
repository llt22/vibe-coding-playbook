# @ben_burtenshaw: You can now train an open model with RL inside claude code, codex, opencode, pi, or any harness you 

- 结论：**继续观察**。建议先跟踪 openenv 的 capture proxy 实现，暂不纳入手册；原文只宣布功能存在，未给出安装、配置或训练步骤，无法直接照做。
- 原文：https://x.com/ben_burtenshaw/status/2105681647018315903
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T16:27:44.826Z

## 是什么

- 原文称：现在可以在 Claude Code、Codex、opencode、pi 或任何 harness 中用 RL 训练开放模型，可以同时进行，且 harness 运行无需修改。
- @adithya_s_k 给 openenv 添加了一个 capture proxy，它位于 harness 和模型之间，记录精确的 token ids。
- 原文在此截断，未提供项目链接、安装方式、配置示例、训练流程或结果数据。

## 具体做法

原文没有给出可照做的步骤、命令或配置。只能从原文提取出概念上的流程：

1. 准备一个 harness（如 Claude Code、Codex、opencode、pi 或任意 harness）和一个开放模型。
2. 在 harness 与模型之间部署 openenv 的 capture proxy。
3. 让 harness 正常运行（原文称 unmodified），由代理记录 token ids。
4. 用记录的 token ids 做 RL 训练（原文未说明训练框架、奖励信号、数据格式）。

以上仅为原文声明的逻辑，不是已验证步骤。原文未提供 openenv 仓库地址、代理安装命令、配置文件、启动参数、训练脚本。因此无法给出可复制的代码块。

## 对应的研究问题

- 能力发现：原文提出一种新能力——在编码助手/harness 内直接做 RL 训练，并捕获精确 token ids。但未说明具体能完成哪些此前做不到的工作。
- 任务匹配：原文列出 Claude Code、Codex、opencode、pi 或任意 harness，且称可“All at once”，但未说明不同 harness、模型或任务的匹配条件。
- 条件供给：需要 openenv 的 capture proxy、harness、开放模型，以及代理记录的 token ids。是否需要额外权限、网络、存储、计算资源均未说明。
- 主动推进：原文未提及时间、事件或状态触发，也未说明能否持续自动完成。
- 效果验证：原文只提到记录精确 token ids，未给出训练效果、评测指标或验证方法。

## 与已有做法的关系

清单中有 Claude Code（adopt）和 OpenCode（watch）。原文明确把 Claude Code 和 opencode 列为可用 harness，并称 harness 运行无需修改。这意味着该 capture proxy 可能扩展这两个工具的用途：从日常编码助手变成 RL 训练的数据捕获前端。但原文没有说明具体集成方式、版本要求或对现有工作流的影响。清单中没有 openenv 或 capture proxy 条目。

## 证据与局限

- 证据：一条推文正文，作者声称 @adithya_s_k 为 openenv 添加了 capture proxy，位于 harness 和模型之间，记录精确 token ids。推文有 156 likes、23 reposts、18 replies（来自输入元数据）。
- 局限：原文在“records the exact token ids and”处截断，缺少后半句和任何后续细节。没有链接（除推文链接）、没有代码、没有文档、没有案例、没有数据。功能是否可用、是否开源、许可证、依赖、成本均未知。作者主张未经独立验证。
- 适用条件：如果 openenv 项目和 capture proxy 真实可用，需要能接入 harness 与模型之间的流量，并且模型输出可被 token id 捕获。具体适用版本、模型类型、harness 类型未知。

## 怎么试、怎么验证

- 最小试用：先找到 openenv 项目中 capture proxy 的文档（原文未给链接，需自行搜索）。在单个 harness（如 Claude Code 或 OpenCode）上，把一个简单会话接入代理，确认能否记录到与模型输出对应的精确 token ids，并导出为可检查的文件。
- 验证指标：
  1. 能否无修改地运行 harness，且代理不破坏正常对话。
  2. 捕获的 token ids 是否完整、顺序正确，并能与模型实际输出对齐。
  3. 捕获的数据能否被训练框架读取（格式、字段、批次）。
  4. 用捕获数据做一次小规模 RL 训练后，是否有可测量的模型行为改善或至少训练 loss 正常下降。
- 因为原文没有给出任何步骤或基线，以上试用只能作为探索，不能作为手册中的可执行流程。建议持续跟踪 openenv 项目的后续发布。
