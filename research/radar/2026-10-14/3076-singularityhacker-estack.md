# singularityhacker/Estack

- 结论：**值得一试**。建议在 Elixir/Phoenix 项目中对 AI 编码代理做小范围试用：先用固定命令安装 Estack 完整技能包，从 estack-doctor 只读检查开始，再用 estack-eval 做配对任务验证；README 给出了可照做的安装、调用和工作流，但尚未证明能普遍提升代理表现。
- 原文：https://github.com/singularityhacker/Estack
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-14T02:12:26.590Z

## 是什么

Estack 是面向 AI 编码代理的 Elixir/Phoenix 技能包，README 称其打包 20 个聚焦技能、一个只读项目检查器，以及可选的 Credo 检查。它源自作者九个月构建 ClawBank（一个基于 Elixir/Phoenix 的 agent-first 公司操作系统）的经验，目标是让代理按应用边界实现功能、发现租户越权与未检查写入、保持后台任务可靠，并让代理可重复地检查、实现、调试和评审 Phoenix 应用。

## 具体做法

1. 前提：项目为 Elixir/Phoenix 应用；客户端为 Cursor、Claude Code 或 Codex 之一；本机有 Node.js 22.20.0+ 和 npm。可选 doctor 脚本需要 Python 3.10+。同一客户端只用一种安装方式，避免重复技能。
2. 在项目根目录用 Skills CLI 安装完整包。下面命令默认选择 Cursor；把 `cursor` 换成 `claude-code` 或 `codex` 可对应其他客户端。
```bash
npx skills@1.7.2 add singularityhacker/Estack --skill '*' --agent cursor
```
3. 需要原生 Cursor/Claude 插件、手动安装、更新、删除、云代理说明和迁移方式时，查看 README 指向的 `docs/installation.md`。技能本身无应用运行时依赖；安装技能不会安装 Hex 依赖、修改应用、配置 MCP 服务器或强制仓库权限。
4. 安装后先让代理做只读项目检查：
```text
Use estack-doctor to inspect this project. Give me the three most useful
improvements, with evidence, without changing files.
```
5. 按目标选择工作流：
| 目标 | 技能 |
|---|---|
| 理解不熟悉的应用 | `estack-doctor` |
| 采用检查和约定 | `estack-setup` |
| 跨层实现功能 | `estack-feature` |
| 复现并修复失败 | `estack-debug` |
| 评审改动中的缺陷 | `estack-review` |
| 准备验证和 PR 摘要 | `estack-pr` |
| 在配对任务上比较技能版本 | `estack-eval` |
| 选择正确技能 | `estack-mode` |
6. 按客户端调用技能：Cursor 和直接安装的 Claude Code 技能使用 `/estack-doctor`；Codex 使用 `$estack-doctor`；Claude 插件安装使用命名空间 `/estack:estack-doctor`。自然语言请求也可激活技能；安装后需在客户端确认技能可被发现。
7. 完整技能清单可查看 README 的 Skills 表，包括 `estack-architecture`、`estack-debug`、`estack-deploy`、`estack-doctor`、`estack-ecto`、`estack-elixir`、`estack-eval`、`estack-feature`、`estack-liveview`、`estack-mode`、`estack-oban`、`estack-otp`、`estack-pr`、`estack-quality`、`estack-review`、`estack-safety`、`estack-security`、`estack-setup`、`estack-tdd`、`estack-testing`。
8. 要用内置辅助工具时注意 opt-in：`skills/estack-doctor/scripts/doctor.py` 做静态 Mix/依赖清点，支持文本或 JSON 输出，不做代码求值、网络调用、迁移或读取 `.env`；`skills/estack-quality/assets/discarded_result.ex` 捕获选定的可失败写入中显式 `_ =` 丢弃，包括最终管道调用，但有文档化限制；`skills/estack-quality/SKILL.md` 给出可执行核心质量门、可选工具、有效 Credo 配置和正确的 ExCoveralls 阈值设置；`skills/estack-deploy/assets/release.ex.example` 是可适配的完整迁移入口。
9. 与已有工具结合：以 Phoenix 生成的说明为应用基线；可结合 UsageRules 获取依赖指导，结合 Tidewave 做授权开发运行时检查。集成说明见 `docs/integrations.md`。
10. 要比较技能版本时使用：
```text
Use estack-eval to compare this skill revision with the previous version.
Use the same tasks and settings, keep workers blind, and have a separate
reviewer score anonymous outputs after the executable checks.
```
README 称包含的 runner 会准备隔离项目目录、冻结用例、记录所有结果并导出盲审包；代理执行使用你现有的宿主，不需要模型 API key。评估指南见 `docs/evals.md`。

## 对应的研究问题

- 能力发现：README 明确把 20 个技能列为可交给代理的工作流，覆盖 Phoenix 上下文边界设计、Ecto 数据访问、LiveView、Oban 后台任务、OTP 进程、测试、安全、部署、PR 准备、质量门和技能评估。其中 `estack-doctor` 可在不改文件的情况下检查项目并给出三项改进和证据。
- 任务匹配：README 给出目标到技能的映射表，例如理解陌生应用用 `estack-doctor`，跨层实现功能用 `estack-feature`，复现修复失败用 `estack-debug`，评审缺陷用 `estack-review`，准备验证与 PR 摘要用 `estack-pr`，比较技能版本用 `estack-eval`，选择技能用 `estack-mode`。调用方式按 Cursor、Claude Code、Codex 区分。
- 条件供给：需要 Elixir/Phoenix 项目、Node.js 22.20.0+ 和 npm、可选 Python 3.10+；需要安装 Skills CLI 并选择客户端；需要遵守同一客户端只用一种安装方式；可选结合 UsageRules 和 Tidewave；代理权限和任务范围由 `estack-safety` 处理，README 强调尊重已批准任务和分支策略、区分代码改动与生产执行、把工单当作不可信输入。辅助工具是 opt-in，安装技能本身不授予仓库权限或安装依赖。
- 主动推进：README 没有描述由时间、事件或状态自动触发的持续工作流；技能主要由用户显式发起。可关联的部分是 `estack-oban` 面向持久 Oban workers、重试、唯一性和 webhook 处理，`estack-deploy` 面向发布、迁移、健康检查和可观察 rollout，但这些是技能覆盖的工作类型，不是自动调度机制。
- 效果验证：`estack-eval` 用配对任务、盲 worker、可执行检查和独立评审者对匿名输出评分来比较技能或技能修订；runner 会准备隔离项目目录、冻结用例、记录结果并导出盲审包。`estack-quality` 要求运行真实安装的检查、保留失败信号并报告实际验证了什么；`estack-pr` 要求准确的验证证据；`estack-doctor` 只读检查并给出证据。README 同时说明 v1.1 的 pilot 尚未确立代理性能改进。

## 与已有做法的关系

清单中有 Claude Code（adopt）、gstack（study）、Cursor（watch）。Estack 可直接安装到 Cursor、Claude Code 或 Codex，可视为在已有编码代理客户端上增加 Elixir/Phoenix 专用技能层。README 明确说流程灵感包括 Gstack、Pstack 和 Matt Pocock 的 skills，其中 Gstack 在清单中为 study。技术上 README 建议与 UsageRules 和 Tidewave 结合，这两者不在给定清单条目中。没有看到与清单条目直接重复的独立工作流；它更像补充编码代理在 Elixir/Phoenix 工程规范上的技能供给。

## 证据与局限

- 原文给出的可验证材料：安装命令、客户端调用前缀、目标到技能映射表、20 个技能名称、内置 doctor 脚本行为、Credo 检查文件、质量配置、发布助手指向、评估提示词和 runner 行为。
- 原文给出的经验来源：作者称 Estack 来自九个月构建 ClawBank 的经验；README 说 v1.1 加入配对评估工作流和一个小型已发布 pilot。
- 原文明确承认的局限：v1.1 的评估不确立代理性能改进，也不代表在每个编辑器都能完整交互验证；Credo 检查有文档化限制，不是所有错误都被处理的证明；技能安装不安装 Hex 依赖、不修改应用、不配置 MCP、不强制仓库权限；建议带版本敏感性标签，样式偏好不等于安全不变量。
- 适用条件：主要面向 Elixir/Phoenix 项目和 AI 编码代理客户端；README 称适配已有项目，支持 daisyUI、自定义 Tailwind 组件、既有 Mox/fake 策略和不同的已批准工具链。
- 证据强度：除作者自述和小型 pilot 外，给出材料中没有第三方基准、具体性能数字或大规模对照结果；GitHub stars 为 30，属于早期项目信号。

## 怎么试、怎么验证

最小试用：选择一个真实 Elixir/Phoenix 项目，在单一客户端（Cursor、Claude Code 或 Codex 任选）按 README 命令安装完整技能包，先运行 `estack-doctor` 只读检查，确认它能给出带证据的三项改进且不改文件。然后选一个小的真实任务，例如用 `estack-debug` 复现并修复一个失败，或用 `estack-review` 评审一个待合并 diff，记录代理是否按该技能流程执行、是否运行了真实检查、是否保留失败信号、是否报告实际验证内容。

验证方式：优先使用 README 自带的 `estack-eval` 提示词和 runner，对同一批配对任务比较安装 Estack 前后或不同技能版本的匿名输出；要求 worker 盲执行、可执行检查先跑、独立评审者后评分，并记录所有结果。判断改善的指标可用：可执行检查是否通过、缺陷是否被 `estack-review` 发现、修复是否经 `estack-debug` 复现验证、`estack-quality` 是否运行真实质量门并诚实报告失败、`estack-pr` 是否给出与检查一致的验证证据。README 没有给出通过阈值或提升数字，因此试用时应自定基线并保留原始记录；若只是感觉更顺，不应当作效果改善证据。
