# michael-denyer/pstack-claude

- 结论：**值得一试**。可以在 Claude Code（或 Codex/Pi）上按 README 给出的两条命令安装 pstack，再用 poteto-mode 跑一个已知小 bug，验证它是否真的复现失败、委派修复并交出通过证据；理由是仓库提供了可直接复制的安装命令、路由入口和按角色配置模型/推理强度的 setup 语法，但完整工作流定义在未被抓取的 docs/reference.md 与 SKILL.md 中，需小范围试用后再固化。
- 原文：https://github.com/michael-denyer/pstack-claude
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-05T16:37:46.878Z

## 是什么

pstack 原为 Lauren Tan 写的 Cursor 插件栈（"an opinionated Cursor skill stack that improves agent outcomes"），本仓库是把它移植到 Claude Code、Codex、Pi 及其他 agent harness 的版本，跟踪上游并携带若干具名策略分支（记录在 `tools/forks.json`）。

核心入口是一个名为 `poteto-mode` 的路由技能：你只告诉它目标，它自行调用合适的工作流，目标是让代码保持精简、简单且经过验证（"keeps your code concise, simple and verified"）。

另有独立插件 [agent-formal-verify](https://github.com/michael-denyer/agent-formal-verify) 处理测试触达不到的并发 bug 与不变量，方式是 TLA+ 模型检查与 Lean 证明。

docs/reference.md 中还有 skills 与 slash 命令、运行时支持、模型与依赖、维护与移植范围等细节（README 只给了链接，本次未抓取到正文）。

## 具体做法

前提：先装好对应 harness（Claude Code / Codex / Pi 之一）。

1. 在 Claude Code 内安装：

```text
/plugin marketplace add michael-denyer/pstack-claude
/plugin install pstack@pstack-claude
```

2. 或在终端用 Codex 安装：

```shell
codex plugin marketplace add michael-denyer/pstack-claude
codex plugin add pstack@pstack-claude
```

3. 或在终端用 Pi 安装：

```shell
pi install git:github.com/michael-denyer/pstack-claude
```

   Pi 下该包会加载 skills 与 pstack Pi extension，后者提供 skills 所需的 subagent、question、wake-up 工具，并加入 `/loop` 和路由指令；用 `/skill:<name>` 调用具体技能。

4. 配置角色模型与推理强度：运行 `setup-pstack`（Claude Code 中用 `/pstack:setup-pstack`）。可改模型默认值、按角色设定 reasoning effort、或关闭自动路由。README 给的写法示例是 `arena runners: opus @xhigh, fable @max`；Claude Code 通过插件提供的 `pstack:effort-<level>` 或 `pstack:poteto-agent-<level>` agent 派发；未指定 level 的角色沿用当前 session 的 effort，除非配置表的 `default effort` 行另有指定。

5. 处理 hook 信任：插件会在 Claude Code 和 Codex 上安装 routing hook；Codex 需要先通过 `/hooks` 信任它才会运行。

6. 其他 harness：Prime Agent、OpenCode、Gemini CLI，或任意 harness 的 skills-only 安装，参见 `docs/reference.md#shared-skills-installation`。

7. 使用示例（原文给出的入门提示）：

```text
Use poteto-mode to fix the search filter resetting when I change pages.
```

   对 bug，它会复现失败，用 `how` 和 `why` 调查，委派修复，再重跑失败用例；若修复跨越函数边界，会在实现前引入 `architect`。你拿到修复，以及失败与通过的证据。

8. 选 playbook：poteto-mode 的 playbooks 覆盖规划、功能开发、重构、性能问题、调查、原型、PR 维护、发布，以及较长周期项目（见 `plugins/pstack/skills/poteto-mode/SKILL.md#playbooks`）。

## 对应的研究问题

**1. 能力发现**：poteto-mode 的自动路由把"选哪套流程"这一步本身交给 agent，提示可以把原先自己规划的工作（复现 → 用 `how`/`why` 调查 → 委派修复 → 重跑失败用例 → 验证）整体交付。playbooks 明确列出性能问题、调查、原型、PR 维护、发布、长周期项目等类别，说明这些工作已被视为可托管给 agent 的对象。`unslop` 等辅助技能也被列为支持项。

**2. 任务匹配**：README 提供了三条匹配维度——按 harness 选择安装方式（Claude Code / Codex / Pi / Prime Agent / OpenCode / Gemini CLI / skills-only）；按角色配不同模型与推理强度（示例 `opus @xhigh, fable @max`）；按任务复杂度选执行结构（architect / arena / swarm，跨函数边界的修复要先引入 architect）。

**3. 条件供给**：需要提供 harness 的插件与 hook 权限（Codex 必须先信任 routing hook）；Pi 需要 extension 提供的 subagent、question、wake-up 工具；PR 工具依赖你的 GitHub CLI 登录；skills 让 agent 读取的内容（包含 session transcripts）会发送给你的模型 provider；脚本本地运行，无服务器、无遥测。

**4. 主动推进**：Pi extension 提供 wake-up 工具，并加入 `/loop`；插件安装 routing hook 后由 hook 触发路由（Claude Code、Codex 上均如此）；playbooks 中有 PR maintenance、shipping 和 longer projects。但 README 没有展开时间/事件/状态触发的具体配置方式。

**5. 效果验证**：bug 流程的交付物被定义为"修复 + 失败与通过的证据"，即通过重跑失败用例来自证；概述图提到用 interrogate、tests、measurements 做审查与验证；目标是 "verified work" 与简洁简单的代码；测试够不着的并发场景走 agent-formal-verify 的 TLA+ 模型检查与 Lean 证明。

## 与已有做法的关系

清单中相关条目：

- **Claude Code（adopt）**：本仓库的主要目标 harness，README 直接给出 Claude Code 的安装与 `/pstack:setup-pstack` 配置路径，可作为 Claude Code 现有用法的流程层补充。
- **Cursor（watch）**：本仓库是 Cursor 官方 pstack 的移植版，README 明确写上游来源与版权（Original pstack © 2026 Lauren Tan; imported cursor-team-kit skills © 2026 Cursor）。若清单中 Cursor 仍为 watch，此处可借移植版观察 pstack 在非 Cursor harness 上的可迁移性。
- **OpenCode（watch）**：README 把 OpenCode 列入可通过 shared installation 支持的对象，但细节在未抓取的 docs/reference.md。

## 证据与局限

可照做的部分：三条安装命令、`setup-pstack` / `/pstack:setup-pstack` 的用途、reasoning effort 的角色写法示例、`/skill:<name>`、`/hooks` 信任步骤、poteto-mode 入门提示词，均为原文直接给出，可原样复制。

属于作者主张、没有数据支撑的部分："improves agent outcomes"、"keeps your code concise, simple and verified"、bug 流程产出"失败与通过证据"，都只有描述性说明，没有给出准确率、耗时、代码量等量化结果，也没有第三方案例。本线索给到的数字只有仓库指标（1345 stars、今日 222 stars），不能作为效果证据。

适用条件与局限：需要目标 harness 支持插件/hook，Codex 需额外信任 hook；按角色配 effort 依赖插件自带的 `pstack:effort-<level>` / `pstack:poteto-agent-<level>` agent 存在；具体工作流的完整定义在 docs/reference.md 与 SKILL.md 中，本次未抓到，无法核对 playbook 的实际步骤；README 提示 skills 会把 session transcripts 等读取内容发往模型 provider，涉及隐私与合规时需先确认。许可证为 MIT。

## 怎么试、怎么验证

最小试用（单一仓库、单个已知小 bug）：

1. 在 Claude Code 中执行两条安装命令。
2. 选一个当前会失败、且你能独立复现的小 bug，输入 `Use poteto-mode to fix <该 bug 的现象>`。
3. 观察并记录：是否先复现失败、是否使用 `how`/`why` 调查、是否在有跨函数边界时引入 architect、最终是否交付失败改通过的证据。
4. 若需要，先跑 `/pstack:setup-pstack` 给角色指定模型与 effort，观察派发是否按 `pstack:effort-<level>` / `pstack:poteto-agent-<level>` 生效。

验证指标（建议与"同一 bug 用普通 Claude Code 会话"做对照）：

- 是否产出可核验的失败→通过证据（最关键，直接对应研究问题 5）。
- 是否减少了人工纠正路由或流程的次数。
- 最终 diff 的规模与新增抽象是否更小（对应 "concise, simple" 的主张）。
- 达到通过状态所需的往返轮数是否下降。
- 若试用 Codex：routing hook 信任后是否确实在任务开始时触发路由。

若以上任一项无明显改善，或 hook/agent 派发不生效，则退回 study，只借鉴"路由 + 复现/调查/委派/重跑失败用例"的流程骨架，而不继续使用该具体插件。
