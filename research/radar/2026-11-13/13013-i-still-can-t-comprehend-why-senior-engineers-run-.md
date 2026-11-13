# @damkina7: i still can't comprehend why senior engineers run claude code on default configuration.

- 结论：**值得研读**。建议把“多模型角色分工 + 受限子代理”当作思路研读；不要照抄这份配置。原文虽然给出了 settings.json 和 scout/critic 提示词，但模型名与字段未经验证，也没有效果数据。
- 原文：https://x.com/damkina7/status/2120871722521883109
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T00:42:29.688Z

## 是什么
这是一条推文，主张不要把 Claude Code 保持在默认配置，而是用 `settings.json` 和两个子代理文件做“多模型分工”：Opus 负责规划和解阻，Sonnet 写生产代码，Haiku 做代码定位，另一个称为 Fable 的模型做 diff/计划审查。原文的核心是一组可直接粘贴的配置片段和子代理提示词，而非完整教程。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
注意：以下配置按原文整理，原文未验证；模型名、`settings` 字段和 Claude Code 版本兼容性都要先核对。字段不被接受时，不要写入主配置。

1. 前提：已安装并可使用 Claude Code，且当前账号/环境能访问原文列出的模型。先备份 `~/.claude/settings.json`，并保留已有 hooks、permissions、plugins。
2. 将以下 JSON 合并到 `~/.claude/settings.json`（原文要求 `Add this to ~/.claude/settings.json. Keep every hook, permission and plugin I already have.`）：
```json
{
  "model": "opusplan",
  "advisorModel": "opus",
  "effortLevel": "medium",
  "modelSettings": {
    "claude-opus-5-5": { "effortLevel": "high" },
    "claude-sonnet-5-5": { "effortLevel": "medium" },
    "claude-fable-5-2": { "effortLevel": "high" }
  },
  "env": {
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku"
  }
}
```
3. 创建 `~/.claude/agents/scout.md`，内容原样如下：
```markdown
---
name: scout
description: finds code fast. returns file paths and line numbers only.
model: haiku
tools: Read, Grep, Glob
---
Locate exactly what was asked. Return file:line. No fixes. No opinions.
```
4. 创建 `~/.claude/agents/critic.md`，内容原样如下：
```markdown
---
name: critic
description: reviews a diff or plan before any task is called done
model: fable-5-2
tools: Read, Grep, Bash
---
Assume this is broken. Find how it fails. One line per issue, worst first.
```
5. 按原文分工使用：规划或卡住时交给 opus/opusplan；生产代码交给 sonnet；找文件路径和行号交给 scout/haiku；合并前让 critic/fable 攻击 diff。原文没有给出具体调用命令，只给出这组配置和角色分工。

## 对应的研究问题
- 能力发现：原文提出把“代码定位”和“diff 审查”显式交给子代理，尤其 scout 只返回 `file:line`，不做修复和评论。
- 任务匹配：原文按任务分配模型与工具：Opus/opusplan 规划和解除阻塞，Sonnet 写生产代码，Haiku 检索，Fable 审查；scout 限制为 Read/Grep/Glob，critic 限制为 Read/Grep/Bash。
- 条件供给：需要可写的 `~/.claude/settings.json`、两个 agent 文件、模型访问权限、子代理工具权限，以及保留原有 hooks/permissions/plugins 的环境。原文要求先让 Claude Code“保留已有配置并展示 diff”。
- 主动推进：原文没有涉及时间、事件或状态触发的持续任务，只描述了任务内的角色分工，因此没有可依据的主动推进机制。
- 效果验证：原文没有给出数据、基准或案例，只给出主张。验证需要自行做 A/B，统计检索准确率、审查发现的问题、返工和成本。

## 与已有做法的关系
清单中有 Claude Code（tool，adopt）。这条线索是 Claude Code 的高级配置：用 `settings.json` 做模型路由，用 `agents` 目录创建 scout/critic 子代理。它是对现有 Claude Code 做法的补充，而不是新工具。清单中没有其他相关条目。

## 证据与局限
原文证据只有推文正文和互动数据（94 likes、4 reposts、7 replies），没有仓库、文档、运行截图、版本号或 benchmark。以下都是作者主张而非验证事实：
- “one settings change and every model gets its own job”；
- Opus/Sonnet/Haiku/Fable 的分工效果；
- 该 `settings.json` 字段和模型名在当前 Claude Code 中可用。
需要特别警惕：原文使用了 `claude-opus-5-5`、`claude-sonnet-5-5`、`claude-fable-5-2`、`fable-5-2` 等命名，其中 `fable` 不是材料中可验证的 Claude 模型名；`advisorModel`、`modelSettings`、`effortLevel` 等字段也未说明版本前提。`CLAUDE_CODE_SUBAGENT_MODEL` 设为 haiku 与 critic 指定 fable 之间是否冲突，原文没有解释。若直接粘贴，可能因未知字段或模型名导致配置无效。适用条件应限定为：先确认 Claude Code 版本和模型可用性，再在隔离环境试验。

## 怎么试、怎么验证
最小试用：
1. 在一次性仓库或分支中试验，先备份 `~/.claude/settings.json`，不要直接改主环境。
2. 先只创建 scout 和 critic 两个 agent 文件，把 model 改成你当前环境实际可用的模型；若 settings 字段不被接受，不要强行写入。
3. 选 3-5 个真实小任务，例如“定位某函数调用点”“审查一个小 diff”“实现一个小功能”，分别用默认配置和角色分工配置跑一遍。
4. 记录：scout 返回的 `file:line` 是否正确、critic 发现的问题中多少是真实问题/误报、端到端耗时、token 或费用、合并前返工次数、人工干预次数。
判断改善的标准：在任务结果不下降的前提下，检索定位更快更准、审查能提前拦住真实缺陷、返工或人工解释次数下降；若只是增加调用层级和成本，则不应采用。
