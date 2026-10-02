# @mirku21: Official Anthropic tip for Claude Code: stop burning Opus 5.5 context on tasks Sonnet 5.5 can swarm,

- 结论：**值得研读**。建议把“按任务难度分配模型 + 用多角色智能体并行”作为思路研究，不要照搬推文中的 /teams 命令和模型名；原文只是单条截断推文，缺少官方文档与可验证步骤，无法支撑 adopt/try。
- 原文：https://x.com/mirku21/status/2105764769479455043
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T13:27:00.805Z

## 是什么

- 输入是一条 X 推文，声称 Anthropic 官方建议在 Claude Code 中不要用 Opus 5.5 处理可由 Sonnet 5.5 并行完成的任务，并称可用 `/teams` 拉起自主团队。
- 原文给出的关键片段只有：

```text
/teams

claude --teammates ux,backend,adversary

Opus 5.5 acts as the lead architect, scoping architecture and
```

- 原文截断，没有安装、配置、权限、反馈、验证方式。模型名“Opus 5.5 / Sonnet 5.5 / Fable 5.1”和 `/teams`、`--teammates` 均未在材料中被官方文档证实。

## 具体做法

没有可照做的完整步骤。原文只给出一个未经证实的命令片段，不能作为手册步骤。若只做核验，可按以下顺序处理：

1. 先确认 Claude Code 当前版本是否真的支持 `/teams` 和 `claude --teammates`，可用帮助命令和官方文档核对：

```bash
claude --help
```

2. 若帮助中不存在 `--teammates`，则不要继续照搬该命令；记录为“未证实”。
3. 若确实存在，再检查材料中提到的模型标识是否可用；原文提到的 `Opus 5.5`、`Sonnet 5.5`、`Fable 5.1` 未在材料中证实。
4. 只有在确认命令和模型都存在后，才在小仓库中用 `ux,backend,adversary` 这类角色做最小实验，并明确各自输入、输出和评审标准。

前提：上述第 3、4 步都依赖原文未给出的信息，当前材料不足以指导实际配置。

## 对应的研究问题

- 能力发现：原文提出可把 UX、后端、对抗审查等角色交给智能体团队，但未说明这些角色具体能做什么、不能做什么。
- 任务匹配：这是原文最明确的主张：按任务难度分层，Opus 做 lead architect，Sonnet 承担可并行任务；但模型版本、任务边界和效果没有证据。
- 条件供给：若命令存在，至少需要 Claude Code 环境、`/teams`/`--teammates` 支持、角色定义和共享上下文；原文未说明工具、权限、文件访问、反馈机制等条件。
- 主动推进：原文没有给出时间、事件或状态触发规则，也没有说明团队如何持续执行；“autonomous team”只是措辞，不能视为已证实的持续执行能力。
- 效果验证：原文没有给指标、对照实验或案例，无法判断是否改善成本、速度或质量。

## 与已有做法的关系

清单中已有 `Claude Code`（tool，状态 adopt）。这条线索试图在 Claude Code 之上增加“模型分层 + 多角色智能体团队”的协作模式；但原文没有证明 `/teams` 是 Claude Code 的现有正式能力，因此只能视为对已有工具的待核验用法，而不是可替换或可直接补充的流程。

## 证据与局限

- 证据：只有一条 X 推文正文，且采集时文本截断；互动量为 86 likes、8 reposts、6 replies，不能当作技术验证。
- 主张：“Official Anthropic tip”是作者说法，原文没有给出 Anthropic 官方链接或文档片段。
- 未证实项：`/teams` 命令、`claude --teammates ux,backend,adversary` 语法、`Opus 5.5`、`Sonnet 5.5`、`Fable 5.1` 这些模型名称在材料中均无独立佐证。
- 适用条件：只有在 Claude Code 官方支持这些命令和模型时才可能适用；否则该具体做法不可用，只能研究其“模型分层 + 多角色分工”的思路。

## 怎么试、怎么验证

- 最小试用：先不要接入真实项目。用 `claude --help` 或官方文档核验 `/teams` 与 `--teammates` 是否存在。若不存在，停止，不进入手册。
- 若确认存在，选一个小型、可回滚的仓库，把任务拆成架构、后端实现、对抗审查三类，用原文命令做一次最小运行。
- 判断指标：
  1. 命令是否按预期启动多角色，而不是普通单会话；
  2. 高质量模型（原文称 Opus）是否只用于架构/评审，减少其上下文消耗；
  3. 并行任务是否减少总耗时；
  4. 返工次数、人工修正量、评审发现的问题数是否改善；
  5. 成本是否比单模型完成同样任务更低或更可控。
- 若以上指标没有对照数据，只能停留在 study，不进入 adopt/try。
