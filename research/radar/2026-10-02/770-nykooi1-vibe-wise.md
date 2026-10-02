# nykooi1/vibe-wise

- 结论：**值得一试**。按 README 给出的命令在 Claude Code 里装 VibeWise，并在小项目上完整走一遍 Build→Design→Implementation 检查点，小范围评估它能否让「AI 写码时人边做边学」——它有可直接复制的安装/配置流程和明确的协作模式，但除 119 stars 外没有任何量化效果证据，且插件尚未进入公共社区市场。
- 原文：https://github.com/nykooi1/vibe-wise
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T13:27:22.311Z

## 是什么

VibeWise 是一个 Claude Code 插件，主张「你构建，AI 写代码」。它在 AI 写代码的全过程里插入以学习为先、人保留决策权的流程：Claude 先问你的方案、一起审视权衡、解释陌生概念，由你确定设计何时可以实施；Claude 写代码后再解释改了什么、为什么改。

核心机制是三类检查点：

| 检查点 | 发生什么 |
| --- | --- |
| **Build** | 你和 Claude 一起推理该怎么解决问题 |
| **Design** | 审阅设计；选 **Confirm and continue** 记录设计并继续规划，此时还不写代码 |
| **Implementation** | 审阅具体的代码改动；选 **Implement this step** 授权 Claude 执行 |

这三步不是必须全停：准备写码时，Implementation 检查点也会一并确认设计，跳过单独的 Design 检查点。两个确认都提供 **Discuss** 选项，先提问、弄清疑点或探索替代方案再决定。目标人群是边做边学的人——备选工程师、初级开发者，或探索陌生技术栈的资深工程师。

## 具体做法

**前提**：已安装 Claude Code 和 Python 3（不需要额外 Python 包，Python 仅用于恢复学习上下文和重置学习笔记）。作者称插件已获 Anthropic 的 Claude 目录批准，但尚未列入公共社区市场，目前只能通过作者的 GitHub marketplace 安装。

1. 在 Claude Code 中**逐条**运行，先添加 marketplace：

```text
/plugin marketplace add nykooi1/vibe-wise
```

2. 等它完成后，安装插件：

```text
/plugin install vibe-wise@vibe-wise
```

3. 开启自动更新：打开 `/plugin` → **Marketplaces** → **vibe-wise** → **Enable auto-update**。（第三方 marketplace 默认关闭自动更新。）

4. 在你要工作的项目里重启 Claude Code，然后启动学习模式：

```text
/vibe-wise:learn
```

5. 首次设置一次只问一个问题：用方向键加回车选择；想跳过偏好设置就选 **Use defaults**。之后直接让 Claude 构建东西即可。全新开始或加入一个陌生仓库都可以；对已有仓库，Claude 会先检查代码并画一张小型系统地图。

6. 在协作过程中按检查点作答：Build 检查点要你先说出方案；Design 检查点选 **Confirm and continue** 记录设计（尚不写码）；Implementation 检查点选 **Implement this step** 授权改码。每一步都可先选 **Discuss** 提问或探索替代方案。用平实语言作答即可；想了解更多帮助或跳过，直接说 "skip"。

7. 按经验水平调整讲解深度（所有人都是先自己推理，Claude 根据你的表现和技术栈熟悉度自适应）：Beginner=解释陌生点、用图、问更小的推理问题；Intermediate=减少入门铺垫，多谈交互与权衡；Advanced=追难点约束、失败模式和设计假设。检查点频率（Light / Normal / Frequent）是独立的设置。可直接用自然语言调整：

```text
Use fewer checkpoints.
Focus on backend architecture.
Use multiple-choice questions.
Just implement this one.
Pause learning.
```

恢复学习用 `/vibe-wise:learn`。

8. 偏好、学习笔记和项目地图存在项目内的 `.vibe-wise/`；建议把它加进 `.gitignore` 以免笔记进入 Git（插件不会静默改动 `.gitignore`）。无额外账号、后端或遥测；保存的笔记会进入 Claude 上下文，因此仍受你常规的 Claude Code 数据设置约束。

9. 如需从头学习该项目：

```text
/vibe-wise:reset
```

它会显示项目并询问 **Cancel / Reset learning**。确认后先把 profile、进度、项目地图备份到笔记目录的 `backups/` 文件夹，再重新开始引导；源码和其他项目不受影响。只改经验等级或偏好，直接告诉 Claude 即可，无需 reset。

10. 手动更新（在终端运行）：

```sh
claude plugin marketplace update vibe-wise
claude plugin update vibe-wise@vibe-wise
```

之后重启 Claude Code。项目学习笔记会保留，不需要 reset。用 `claude plugin list` 查看已安装版本。

## 对应的研究问题

- **能力发现**：把「在 AI 写码时解释设计决策」交给 AI——Claude 会解释陌生概念、画小图帮助追踪数据与关系、实现后说明改了什么以及关键代码为何符合你的决定。这属于原文明确支持、但容易没想到交给 AI 的一类工作。
- **任务匹配**：明确匹配 Claude Code + VibeWise 插件这一组合；协作方式是分段式人机协作——人先推理并确认检查点，AI 才写码与测试，且按经验水平调整讲解深度、按需调整检查点频率。
- **条件供给**：需提供 Claude Code 与 Python 3；项目文件访问权（对已有仓库会先检查代码）；项目内 `.vibe-wise/` 目录用于存偏好、学习笔记和项目地图；用户需在 Build 检查点给出方案判断、通过 Discuss/偏好设置/自然语言指令给反馈。
- **主动推进**：学习上下文会在未来会话以及 compaction 之后自动恢复；自动更新可开启。除此之外没有时间/事件/状态触发并持续完成任务的机制。
- **效果验证**：插件提供测试运行及结果、实现报告（改了什么、关键代码怎么工作、为何符合你的决定、加了/更新了哪些测试、覆盖什么），并区分「你确认的架构决定」与「Claude 追加的实现细节」。但这些是过程说明，不是「学习或产出被改善」的量化指标。

## 与已有做法的关系

清单中相关条目：**Claude Code**（kind: tool，status: adopt）。VibeWise 是构建在 Claude Code 之上的插件，先决条件是已有 Claude Code；它把 Claude Code 的默认「直接写码」协作方式改造成带 Build/Design/Implementation 检查点的分段式流程。清单中没有其他直接相关条目。

## 证据与局限

**原文给出的证据**：可复制的安装、更新、重置命令；明确的配置路径 `.vibe-wise/`；检查点行为表；一段「改编自真实学习会话」的对话示例（Notion 风格笔记应用，讲笔记与文件夹关系、删除文件夹对共享笔记的影响），示例中后续实现步骤被标注为示意性、中间的设计讨论被省略。README 提到仓库有 119 stars（来自输入的 metrics）。

**只是作者主张**：边做边学「更有效」、按经验水平自适应「有用」、检查点能帮助形成方案等，均无量化数据支撑；插件是否真的已进入 Anthropic 目录、是否即将出现在公共市场，也只是作者表述。

**适用条件**：仅适用于编码场景且绑定 Claude Code 生态；需 Python 3；第三方 marketplace 自动更新默认关闭，需手动开启；示例本身是节选与示意图，不能当作完整流程的验证。

## 怎么试、怎么验证

**最小试用方式**：在一个小项目里按上文步骤 1–6 安装并运行 `/vibe-wise:learn`，让 Claude 实现一个小功能，完整走一遍 Build→Design→Implementation 检查点，实现后追问一次细节。

**判断有没有改善的指标**（原文未给量化指标，以下为可自行采集的对照项）：

1. 在 Build/Design 检查点处，能否不看笔记用自己的话复述方案、权衡和被否掉的备选。
2. 实现后 Claude 的报告能否让你说清「改了什么、为什么、测了什么」；有说不清的点就追问，记录追问次数。
3. 同类小任务，开/关学习模式各做一次，比较返工次数与事后理解程度。
4. 下一会话或 compaction 后，`.vibe-wise/` 里的学习笔记与项目地图能否正确恢复。
5. 检查点频率（Light/Normal/Frequent）是否可调到不打断你节奏的程度——若频繁检查点让你更慢而无理解提升，说明该协作方式对本任务不划算。
