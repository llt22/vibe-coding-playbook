# android/skills

- 结论：**值得一试**。做 Android 开发的话，可按 README 给出的命令在当前项目或全局安装部分 skill（如 r8-analyzer），让智能体在相关任务中自动调用；理由是原文给出了可直接执行的安装、更新、激活流程，并把技能范围明确限定在“评估显示 LLM 表现较弱”的工作流上，但仓库只公开了安装方式，没有技能全清单和效果数据，所以先小范围试、用自己项目的结果来判断。
- 原文：https://github.com/android/skills
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-17T02:24:50.634Z

## 是什么

android/skills 是 Android 官方维护的、面向编程智能体的“技能”仓库。它的内容是 AI 优化的模块化指令与资源，用来让智能体按 developer.android.com 的最佳实践执行特定开发模式的开发任务。

- 技能遵循开放的 agent skills 标准（agentskills.io），即 markdown 文件 `SKILL.md`，里面写明任务的技术规范，为 LLM 补齐专门领域和流程的上下文。
- 官方自述的技能选题原则是：只做“评估显示 LLM 表现不佳”的用例与工作流，不去做 LLM 已经擅长的领域（例如基础 Jetpack Compose 最佳实践）。
- README 中举例出现的技能名：`r8-analyzer`、`wear-compose-m3`、`android-cli`（`android-cli` 是默认安装的那个）。
- 激活方式是自动的：智能体根据任务相关性自行选用已安装的技能，不需要手动点名。
- 使用前提：需要 Android CLI，或使用 Claude Code / Codex 的插件市场。授权为 Apache License 2.0，当前不接受公开贡献，反馈走 GitHub issue。

## 具体做法（编号步骤）

以下命令原样取自 README。前提分别是：路线 A 需要本机已装 Android CLI；路线 B 需要 Claude Code 或 Codex。

**路线 A：用 Android CLI 安装到项目**

1. 把单个技能装进当前项目目录（前提：已安装 Android CLI，且在项目根目录执行）：

```
android skills add r8-analyzer --project=.
```

2. 或把所有 Android 技能装到所有被检测到的智能体目录（前提：本机存在智能体目录，或明确用 `--agent` 指定）：

```
android skills add --all
```

3. 了解安装位置与选项：如果没有已存在的智能体目录、也没指定 agent，技能会被装到 Gemini 和 Antigravity 的 `~/.gemini/antigravity/skills`。可用选项：
   - `--all`：安装全部 Android 技能；省略时只安装 `android-cli` 这一个技能。
   - `--agent`：逗号分隔的 agent 列表；省略时对所有检测到的 agent 安装。
   - `--project`：安装到哪个项目根路径。

4. 更新技能（全部或指定）：

```
android skills update --all
android skills update wear-compose-m3
```

**路线 B：作为智能体插件安装**

5. Claude Code：

```
/plugin install android-skills --marketplace android/skills
```

6. Codex：

```
codex plugin marketplace add android/skills
codex plugin add android-skills@android-skills
```

**使用与触发**

7. 不要手动调用技能，直接向智能体描述一个与该技能相关的任务即可，例如 README 给的原句：`Make my app UI edge-to-edge.` 智能体在已安装技能的情况下应自动找到并使用相关技能。

**反馈路径**

8. 通过提交 GitHub issue 反馈问题、报告 bug、申请新技能或提出修改；当前不接受公开 PR。

## 对应的研究问题

**1. 能力发现**：部分有依据。仓库的定位就是补上智能体原本做不好的事——按作者自述，选题集中在“评估显示 LLM 表现较弱”的用例与工作流；README 中出现的具体能力线索有 R8 分析（`r8-analyzer`）、Wear Compose Material 3（`wear-compose-m3`）、边到边（edge-to-edge）UI 改造。但 README 没有给出完整技能清单，所以能发现什么能力只能靠 `android skills add --all` 之后再逐一看。

**2. 任务匹配**：有明确依据。匹配原则写在仓库目标里——只做 LLM 表现弱的工作流，不做 LLM 已擅长的（如基础 Compose 最佳实践）；匹配机制是智能体按任务相关性自动激活技能，人只需用自然语言描述任务。这提供了一条可迁移的选型规则：把“技能/上下文”投在评测分数低的环节，而不是投在模型本来就强的地方。

**3. 条件供给**：有具体依据。需要供给的是：Android CLI（或 Claude Code / Codex 插件机制）、技能文件落到智能体能读取的目录（项目根目录或 `~/.gemini/antigravity/skills` 等 agent 目录）、以及用 `--agent` 指定目标智能体。技能本身提供的就是“专门领域的知识与工作流”这类上下文供给。README 未涉及权限与反馈通道的具体设计（反馈只有 issue 一条）。

**4. 主动推进**：依据不足。原文只有“智能体会自动激活相关技能”，这是按任务触发，不是按时间、事件或状态触发的持续执行。是否支持持续/后台推进，原文没有说明。

**5. 效果验证**：只有间接依据。仓库声称选题基于“evaluations”，但没有给出任何评测方法、指标或数字；README 只在 Disclaimer 中要求“AI 会犯错，务必复核结果”。所以效果判断方法需要自己搭。

## 与已有做法的关系

- **Agent skills（concept，已 adopt）**：android/skills 是这一开放标准的一个官方实现样例——用 `SKILL.md` 这种 markdown 文件承载任务技术规范，可以直接拿来当“怎么写一个技能包”的参考模板与目录组织参考。
- **Claude Code（tool，已 adopt）**：README 给了 Claude Code 的插件市场安装路径 `/plugin install android-skills --marketplace android/skills`，这是把外部技能仓库接进 Claude Code 的一条具体渠道，可作为其他技能仓库接入方式的参照。
- 另外还给出了 Codex 的插件市场两条命令，虽然不在清单条目里，但同样是可照做的接入方式。
- 除以上两条外，清单中没有其他相关条目。

## 证据与局限

**原文给出的可核实内容**：
- 完整的安装/更新命令与选项（`--all`、`--agent`、`--project`）及默认安装路径。
- 两条插件安装路径（Claude Code、Codex）的命令。
- 自动激活的行为描述和一条示例提示语。
- 仓库元信息：约 8096 stars、当日 +36（来自抓取指标，非 README 内容）。

**只是作者主张、没有数据支撑的部分**：
- “AI-optimized”“follow the best practices and guidance on Android development”“ground LLMs with information on specialized domains and workflows”都是定位性表述，没有评测数据。
- “focuses on use cases and workflows where evaluations show LLMs underperform”提到存在评测，但没公开评测集、指标或对比结果。
- 没有任何案例、前后对比、用户反馈或性能数字。

**局限与适用条件**：
- 只依据仓库 README，看不到技能全清单、每个 `SKILL.md` 的实际内容，也无法判断质量与覆盖面。
- 强绑定 Android 开发与 Android CLI；不做 Android 的人只能用它的“技能包组织方式”作参考，命令本身无法复用。
- 依赖智能体自动识别任务并选用技能，能否稳定触发是运行时的未知数。
- 仓库明确不接受公开贡献，只能通过 issue 建议，扩展性受限。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 选一个真实、范围小的 Android 任务，且该任务对应 README 点名的方向之一，例如 R8 相关分析，或“把 UI 改成 edge-to-edge”。
2. 先记录基线：在**不装技能**的情况下让智能体做同一任务，保存输出和你的返工次数。
3. 安装技能：项目级用 `android skills add r8-analyzer --project=.`，或全量用 `android skills add --all`（注意不指定 `--agent` 时会装到 `~/.gemini/antigravity/skills`）。
4. 用同一句提示语再跑一遍（例：`Make my app UI edge-to-edge.`），确认智能体确实自动调用到了技能而不是靠猜。
5. 之后定期 `android skills update --all` 保持技能与官方指南同步。

**判断有没有改善的指标**

- 一次通过率：输出是否直接可编译/可提交，无需你手工修改。
- 返工轮数：从提出任务到可用结果之间，你要求智能体修改的次数（A/B 对比，装与不装技能）。
- 事实正确性：产出的做法是否与 developer.android.com 上的官方指引一致（这是该仓库声称的价值所在，最值得人工抽查）。
- 触发可靠性：多次同类任务中，智能体自发使用技能的比率；如果经常不触发，技能价值会大幅缩水。
- 成本：完成同一任务消耗的 token/时间是否上升（技能文件会占用上下文）。

**判定门槛**：如果在 3~5 个真实任务上，一次通过率或返工轮数相对基线有稳定改善、且触发可靠，则把该项目对应的接入方式沉淀进手册；否则只保留“技能包按 LLM 弱项选题 + 放入 agent 目录自动激活”这一条方法论，不写具体命令。
