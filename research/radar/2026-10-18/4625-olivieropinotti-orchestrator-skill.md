# olivieropinotti/orchestrator-skill

- 结论：**值得一试**。可以在 Claude Code 里小范围试装这个 orchestrator skill，用它的“主会话只调度、任务全派后台子代理 + 账本文件跟踪”模式跑 2-3 个可并行的子任务；因为它给出了可照做的安装命令和控制命令，但效果全凭作者自述、无任何数据或案例，所以先试不直接采用。
- 原文：https://github.com/olivieropinotti/orchestrator-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T11:08:03.389Z

## 是什么

`orchestrator` 是一个 Claude Code skill，作用是把主会话（main session）改造成一个不会阻塞的调度器：每条消息被拆成互相独立的任务，全部派给后台 subagent 执行，主会话自己只做计划、分派、跟踪和汇报，因此可以在 3-5 个 agent 干活的同时继续对话。

它用一个小的账本文件 `.claude/orchestrator.md` 记录每个 agent 的状态，作者称该文件能在 context compaction 之后存活。

MIT 许可，仓库 stars 约 38。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：已安装并可使用 Claude Code，且环境能运行 `npx`。

1. 安装 skill：

```bash
npx skills add olivieropinotti/orchestrator-skill
```

2. 在 Claude Code 中启用：输入

```
/orchestrator
```

3. 正常提出需求。按 README 描述，skill 会把每条消息拆成独立任务并并行分派；对同一主题的后续消息会发给已经在做该主题的 agent，以保留它的上下文。

4. 查看进度：

```
status
```

用于列出每个 agent 及其状态（回答直接来自账本文件）。

5. 停止某个或全部 agent：

```
stop <name>
stop all
```

6. 改变某个 agent 的方向：

```
redirect <name> to ...
```

7. 关闭编排模式：直接对 Claude Code 说 “stop orchestrating”。

8. 需要人工检查或留存时，查看账本文件 `.claude/orchestrator.md`（前提：当前项目目录下存在/可写 `.claude/` 目录）。

原文还说明了两条内含规则，可在写需求时配合使用：

- 每个 agent 会收到一份完整 brief：目标、事实、它负责的文件、它不能做什么、以及“完成”的定义。
- 按任务选模型：判断类任务用 Opus，紧凑且可核对的任务用 Sonnet。

注意：README 没有给出 brief 的提示词模板、配置项、并发上限的硬性设置或失败处理流程，只有上述命令与行为描述。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- 能力发现：原文给出的“还没想到交给 AI 的工作”是把原本占用主会话、串行进行的多任务改成后台并行分派（“keep talking while 3-5 agents work”）。除此之外没有列举具体工种或任务类型，依据较弱。
- 任务匹配：有明确依据。任务按主题归属到固定 agent（follow-up 发给同一主题的 agent 以保持上下文）；模型按任务性质选择（Opus 用于判断，Sonnet 用于紧凑可核对的任务）；任务粒度是“独立任务”。
- 条件供给：需要提供的东西在原文中有对应：安装 skill、`/orchestrator` 启用、为每个 agent 提供完整 brief（目标、事实、负责文件、禁止事项、完成定义）、可写的 `.claude/orchestrator.md` 账本、以及明确的文件归属（否则并行 agent 之间的边界未定义）。
- 主动推进：只有部分依据。账本文件能在 context compaction 后存活，且 `status` 可随时查询状态；但原文没有提到由时间、事件或状态自动触发并持续运行，流程仍是人在会话中驱动的。
- 效果验证：依据很弱。原文只提供 `status` 这种状态跟踪，没有给出任何衡量“结果是否改善”的指标或方法。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中相关条目有两个：

- **Claude Code**（tool，status: adopt）：本 skill 是跑在 Claude Code 之上的扩展，安装后在 Claude Code 内用 `/orchestrator` 启用，属于对已有 adopt 工具的能力叠加，而非替代。
- **skills.sh**（source，status: try）：README 带有 skills.sh 徽章，且安装方式就是 `npx skills add ...`，说明该 skill 走的是 skills.sh 的分发渠道，可作为 skills.sh 这条 source 的一个具体取样。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

证据：

- 一条可直接执行的安装命令；一组可用的交互命令（`status`、`stop <name>`、`stop all`、`redirect <name> to ...`）；一个具体的账本文件路径 `.claude/orchestrator.md`；以及模型选择规则（Opus / Sonnet）。
- 仓库指标仅有 stars ≈ 38。

只是作者主张、无外部验证：

- “never blocks”“3-5 agents work”“survives context compaction”“sends follow-ups to the agent already on that topic, so its context stays intact” 等能力描述，均来自 README 自述。
- 没有任何 benchmark、对比实验、真实项目案例、失败模式或成本数据。

适用条件与风险（原文未说明的部分需自行确认）：

- 必须使用 Claude Code；项目需可写 `.claude/` 目录。
- 并行 agent 的数量、token 成本、多个 agent 同时改同一文件时的冲突处理，原文均未交代。
- 本次材料只有 README，不是完整文档，仓库内的其他文件内容未包含在内，因此可能存在 README 未写明的配置或限制。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用方式：

1. 在一个 git 仓库上新建分支（便于回滚），确保没有未提交改动。
2. 执行 `npx skills add olivieropinotti/orchestrator-skill`，在 Claude Code 中输入 `/orchestrator`。
3. 提一个含 2-3 个彼此独立子任务的需求，例如分别处理不同目录/不同模块的修改，并明确各自负责的文件。
4. 观察：主会话是否仍可继续对话（不阻塞）、子任务是否真的并行、`status` 的条目是否与实际 agent 一致、`stop`/`redirect` 是否生效。
5. 结束前查看 `.claude/orchestrator.md`，核对账本记录是否完整；最后说 “stop orchestrating” 关闭。

判断有没有改善的指标（原文未给基线，以下为自定对照）：

- 主会话被阻塞的时间：编排前后对比，是否减少。
- 同一批任务的墙上时间：与串行做一遍相比。
- 返工率：产出需要人工纠正的比例，尤其是文件冲突（两个 agent 改同一文件）导致的返工。
- 状态可信度：`status` 报告的 agent 数量/状态与实际执行是否一致，账本是否在长会话 compaction 后仍然可用。
- 成本：多 agent 并行带来的 token 消耗增量（原文无数据，需自行记录）。

如果返工率或成本明显上升、或 `status` 与账本不可信，则不宜升级为常规做法。
