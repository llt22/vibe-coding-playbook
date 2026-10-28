# MiniMax-AI/mcode-stack

- 结论：**值得一试**。建议小范围试用：先在 MiniMax Code 或 Claude Code 中安装 long-command-check、independent-review、harness-experiment 等技能，按 README 的目录和插件方式接入，并用 /skills 调用，验证能否改善长命令、评审和实验流程。理由是它给出了可执行的安装与调用步骤，且来自团队日常使用；但当前材料只有 README，具体检查项需打开各 SKILL.md 才能照做。
- 原文：https://github.com/MiniMax-AI/mcode-stack
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-28T18:19:18.667Z

## 是什么
这是 MiniMax Code 团队开源的“工作流与技能”仓库：把日常与 AI 编程代理协作的习惯做成 `SKILL.md` 技能、检查清单和 `WORKFLOW.md`，可直接安装到 MiniMax Code（部分也可用于 Claude Code 及其他支持 skills 的代理）。README 将内容分为技能、检查清单、工作流三类，并列出 15 个技能，覆盖任务拆分、上下文/工具成本、长会话与长命令、代码评审、实验与热修。本次材料只有 README，未包含各技能正文。

## 具体做法
前提：已安装 MiniMax Code；如果要走 Claude Code 市场命令，需已安装 Claude Code；本地需有 git。以下命令均来自 README。

1. 安装单个技能（所有项目可用）：
```bash
git clone https://github.com/MiniMax-AI/mcode-stack.git ~/mcode-stack
mkdir -p ~/.agents/skills
cp -R ~/mcode-stack/stacks/ronny/skills/long-command-check ~/.agents/skills/
```
前提：每个技能是一个子目录，目录内包含 `SKILL.md`。也可把技能放到项目级 `.minimax/skills/`、`.claude/skills/` 或 `.agents/skills/`；全局还会读取 `~/.claude/skills/`、`~/.codex/skills/`。

2. 在新会话中查看并调用：
```text
/skills
/long-command-check
```
也可以不手动调用，让代理根据技能描述自行加载。把 `long-command-check` 换成其他技能名即可调用对应技能。

3. 安装整栈为本地插件：
```bash
mcode plugin marketplace list
```
把 `stacks/ronny` 整个目录复制到该命令显示的本地插件目录，然后在 MiniMax Code 打开 `/plugins`，按 `Ctrl+R` 刷新；在面板中按空格启用或禁用。注意 README 说明：`mcode plugin add` 只从官方目录安装，不接受 GitHub URL 或本地路径。

4. 从市场安装（MiniMax Code 桌面端）：
打开 **Plugins**，选择 **Add marketplace**，输入 `MiniMax-AI/mcode-stack`；每个 stack 会显示为一个可安装/更新/卸载的插件。README 说明该功能在逐步开放，部分版本可能还没有。

5. 在 Claude Code 中安装同一目录：
```bash
/plugin marketplace add MiniMax-AI/mcode-stack
/plugin install ronny@mcode-stack
```

6. 使用方式：技能用 `/<skill-name>` 调用；检查清单本身也是技能，代理会按项目逐项走，也可直接阅读 `checklists/` 下的纯文本；工作流则阅读对应 stack 的 `WORKFLOW.md`。如果要先小范围试，建议从 README 中与高频痛点最直接相关的技能开始：`long-command-check`（长命令/后台任务十点审计）、`independent-review`（干净上下文只给 diff、需求和测试结果做评审）、`harness-experiment`（小评估、一次只改一项、重复运行、看翻转任务）、`subagent-split-check`（判断任务交给子代理还是留在主循环）、`tool-budget-audit`（衡量工具在上下文中的成本，考虑裁剪、工具搜索或程序化工具调用）。这些技能的具体检查项需打开各自的 `SKILL.md`，README 未展开。

## 对应的研究问题
- 能力发现：README 明确列出一批通常不一定交给 AI 的工作，并做成技能：判断是否拆子代理、把大功能/重构/迁移拆成小 PR、写变更说明、审计工具上下文成本、审计每轮注入内容及对 prompt cache 的影响、长会话压缩/记忆范围、交接文档、长 shell 命令与后台任务审计、干净上下文独立评审、代码健康评审、评审评论与作者回应、实验 harness、轨迹评审、紧急变更评审。这为“还能把哪些工作交给 AI”提供了候选清单。
- 任务匹配：README 给出若干匹配规则的方向：`subagent-split-check` 决定工作去子代理还是主循环；`tool-budget-audit` 在裁剪、工具搜索、程序化工具调用之间做选择；`long-session-check` 在丢弃、摘要、写入文件、压缩或新开会话、记忆范围之间做选择；`harness-experiment` 要求小评估、一次只改一项、重复运行并检查翻转任务。具体判断标准在技能正文中，README 未给出。
- 条件供给：安装路径和插件机制明确（项目级/全局 skills 目录、插件市场、Claude Code 市场）；`independent-review` 要求评审时只提供 diff、需求和测试结果，属于对输入条件的约束；`handoff-doc` 和 `long-session-check` 涉及把状态写入文件/交接文档；`context-tax-audit` 和 `tool-budget-audit` 要求先量化每轮注入和工具成本。README 没有展开权限模型、工具白名单或反馈闭环的具体配置。
- 主动推进：`long-command-check` 面向长 shell 命令和后台任务，`long-session-check`/`handoff-doc` 面向长会话持续工作；但 README 没有说明定时、事件或状态触发机制，不能据此认为仓库提供了自动触发式工作流。
- 效果验证：`harness-experiment` 明确用小型评估、一次只改一项、重复运行和查看翻转任务来判断改动；`trajectory-review` 要求看代理如何得到结果，而不只看是否通过；`independent-review` 用干净上下文复核 diff。README 没有给出量化的业务效果数据。

## 与已有做法的关系
- 清单中的 **Claude Code**（adopt）：该仓库的技能采用通用 `SKILL.md` 格式，README 明确给出 Claude Code 的市场安装命令，并称多数技能也可用于其他支持 skills 的代理。可作为 Claude Code 之外另一套可移植的技能/工作流来源。
- 清单中的 **Harness Engineering**（study）：README 直接把仓库定位为把 harness engineering 习惯做成可运行的技能和检查清单，并与 *MCode Engineering Notes* 文章配套；文章讲思路，仓库让思路可运行。它把“研究概念”推进到“可安装技能”的层面。
- 其他清单条目：清单中没有其他直接相关条目。

## 证据与局限
- 证据：README 显示仓库为 MIT（部分 stack 的 `NOTICE.md` 可能另有说明），有 15 个技能徽章、GitHub Actions `validate` 徽章，以及 01–04 和即将发布的 06 篇配套文章；安装命令、目录发现规则、插件市场命令和技能清单是具体可执行的。六个 `engineering-*` 技能注明改编自 Google Engineering Practices，改编材料保持 CC-BY 3.0。
- 只是作者主张：README 称这些是团队“每天实际使用”的工作流，并称真正拉开差距的是代理周围的工程习惯；但本次材料没有给出使用前后对比、缺陷率、节省时间、采用率等量化数据，也没有真实案例细节。
- 关键局限：本次只拿到仓库 README，没有拿到各 `SKILL.md`、`checklists/` 和 `WORKFLOW.md` 正文，因此无法验证每个技能的具体检查项是否足够可照做；部分安装方式依赖 MiniMax Code 版本（插件市场在逐步开放），`mcode plugin add` 也不支持 GitHub URL 或本地路径。若要写入手册，应先打开目标技能的 `SKILL.md` 再决定是否采用其具体流程。

## 怎么试、怎么验证
建议最小试用：选 2–3 个与当前工作痛点最直接的技能，不要一次装整套。优先组合：`long-command-check` + `independent-review` + `harness-experiment`。按上面第 1 步安装到 `~/.agents/skills/`，新开会话用 `/skills` 确认可见，再在真实任务中调用；同时保留一个不调用技能的对照会话。

可记录的指标（建议，非 README 给出）：
- 安装与调用：技能是否被正确发现、`/skills` 是否列出、调用后是否按预期执行；记录安装失败/版本不兼容情况。
- 长命令：长命令阻塞次数、人工中断/重试次数、后台任务失败或丢失次数、等待时间；对照使用前后各 5–10 次长命令任务。
- 独立评审：干净上下文评审发现的问题数、其中被普通评审漏掉的问题数、无效评论数、评审耗时；以同一 diff 做对照。
- 实验：同一评估任务重复运行后的通过率波动、翻转任务数量、一次只改一项时能否定位变化来源；这是 README 对 `harness-experiment` 的直接描述，可作为验证框架。
- 工作流采用：团队是否愿意持续调用、是否减少返工或评审往返。若只有安装成功但没有可观察的任务结果改善，应停留在“try”，不要升级为“adopt”。
