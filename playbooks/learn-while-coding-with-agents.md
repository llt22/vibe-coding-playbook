# 让 AI 写码时你仍然做决定：用检查点边做边学

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在 Claude Code 这类 AI 编码工具里，如何通过分段检查点保留自己的方案判断和设计决策，避免变成只看结果的旁观者。
> 先试这一步：在一个小项目里安装 VibeWise 并运行 /vibe-wise:learn，让 Claude 实现一个小功能，完整走一遍 Build→Design→Implementation 检查点。
> 最近修订：2026-10-02

## 解决什么问题

在 AI 写代码时，人容易退到旁观位；这篇手册把 AI 写码过程改造成带检查点的分段协作：你先推理方案、确认设计，AI 才写代码并解释改动。目标不是让 AI 更自动，而是让你在构建过程中保留决策权、边做边学。

## 适用与不适用

适用：使用 Claude Code 的编码场景；你是备选工程师、初级开发者，或探索陌生技术栈的资深工程师；愿意在写码前先自己推理并确认检查点。

不适用：不使用 Claude Code 的场景；不想在过程中被检查点打断、只想让 AI 直接产出代码的任务；需要量化学习效果证明的场景——当前材料没有量化效果数据。

## 前置条件

- 已安装 Claude Code 和 Python 3（不需要额外 Python 包，Python 仅用于恢复学习上下文和重置学习笔记）。
- 项目文件访问权；对已有仓库，Claude 会先检查代码并画一张小型系统地图。
- 项目内会生成 `.vibe-wise/` 目录，用于存偏好、学习笔记和项目地图。
- 作者称插件已获 Anthropic 的 Claude 目录批准，但尚未列入公共社区市场，目前只能通过作者的 GitHub marketplace 安装。此为作者主张，未在材料中独立验证。

## 操作步骤

1. 在 Claude Code 中逐条运行，先添加 marketplace。
   前提：已安装 Claude Code。
   命令：
   ```text
   /plugin marketplace add nykooi1/vibe-wise
   ```
   预期结果：marketplace 添加成功。

2. 等它完成后，安装插件。
   命令：
   ```text
   /plugin install vibe-wise@vibe-wise
   ```
   预期结果：插件安装成功。

3. 开启自动更新。
   打开 `/plugin` → **Marketplaces** → **vibe-wise** → **Enable auto-update**。
   前提：第三方 marketplace 默认关闭自动更新。
   预期结果：后续可自动更新。

4. 在你要工作的项目里重启 Claude Code，然后启动学习模式。
   命令：
   ```text
   /vibe-wise:learn
   ```
   预期结果：进入学习模式。

5. 首次设置一次只问一个问题：用方向键加回车选择；想跳过偏好设置就选 **Use defaults**。
   之后直接让 Claude 构建东西即可。全新开始或加入一个陌生仓库都可以；对已有仓库，Claude 会先检查代码并画一张小型系统地图。

6. 在协作过程中按检查点作答：
   - Build 检查点：要你先说出方案。
   - Design 检查点：选 **Confirm and continue** 记录设计（尚不写码）。
   - Implementation 检查点：选 **Implement this step** 授权改码。
   每一步都可先选 **Discuss** 提问或探索替代方案。用平实语言作答即可；想了解更多帮助或跳过，直接说 "skip"。
   变体：准备写码时，Implementation 检查点也会一并确认设计，跳过单独的 Design 检查点。两个确认都提供 **Discuss** 选项，先提问、弄清疑点或探索替代方案再决定。

7. 按经验水平调整讲解深度。
   所有人都是先自己推理，Claude 根据你的表现和技术栈熟悉度自适应：
   - Beginner：解释陌生点、用图、问更小的推理问题。
   - Intermediate：减少入门铺垫，多谈交互与权衡。
   - Advanced：追难点约束、失败模式和设计假设。
   检查点频率（Light / Normal / Frequent）是独立的设置。可直接用自然语言调整：
   ```text
   Use fewer checkpoints.
   Focus on backend architecture.
   Use multiple-choice questions.
   Just implement this one.
   Pause learning.
   ```
   恢复学习用 `/vibe-wise:learn`。

8. 管理项目内数据。
   偏好、学习笔记和项目地图存在项目内的 `.vibe-wise/`；建议把它加进 `.gitignore` 以免笔记进入 Git（插件不会静默改动 `.gitignore`）。无额外账号、后端或遥测；保存的笔记会进入 Claude 上下文，因此仍受你常规的 Claude Code 数据设置约束。

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

## 怎么判断变好了

材料未给量化指标，以下为可自行采集的对照项。

最小试用方式：在一个小项目里按步骤 1–6 安装并运行 `/vibe-wise:learn`，让 Claude 实现一个小功能，完整走一遍 Build→Design→Implementation 检查点，实现后追问一次细节。

可观察指标：
1. 在 Build/Design 检查点处，能否不看笔记用自己的话复述方案、权衡和被否掉的备选。
2. 实现后 Claude 的报告能否让你说清“改了什么、为什么、测了什么”；有说不清的点就追问，记录追问次数。
3. 同类小任务，开/关学习模式各做一次，比较返工次数与事后理解程度。
4. 下一会话或 compaction 后，`.vibe-wise/` 里的学习笔记与项目地图能否正确恢复。
5. 检查点频率（Light/Normal/Frequent）是否可调到不打断你节奏的程度——若频繁检查点让你更慢而无理解提升，说明该协作方式对本任务不划算。

试多久：材料未指定；建议至少在一个小功能上完整走一遍检查点，并在下一次会话或 compaction 后检查恢复情况。

## 常见坑

- 第三方 marketplace 自动更新默认关闭，需手动开启；否则不会自动更新。
- `.vibe-wise/` 可能把学习笔记带进 Git；插件不会静默改 `.gitignore`，需要自己加。
- 保存的笔记会进入 Claude 上下文，仍受常规 Claude Code 数据设置约束。
- 插件尚未进入公共社区市场，目前只能通过作者的 GitHub marketplace 安装；作者关于已获 Anthropic 目录批准的表述只是作者主张。
- 效果缺乏量化证据；README 提到 119 stars（来自输入的 metrics），但无学习或产出改善的量化数据。
- 示例对话被标注为示意性、设计讨论被省略，不能当作完整流程的验证。
- 检查点频率调得太高可能打断节奏；若更慢且无理解提升，应降低频率或暂停学习模式。
- 仅适用于编码场景且绑定 Claude Code 生态，需 Python 3。

## 证据与来源

本篇内容依据调研报告《nykooi1/vibe-wise》。

- 可直接复制的安装、更新、重置命令，配置路径 `.vibe-wise/`，检查点行为表，经验水平与检查点频率设置：来自该调研报告转述的 README。
- README 提到仓库有 119 stars（来自输入的 metrics）。
- “边做边学更有效”“按经验水平自适应有用”“检查点能帮助形成方案”：只是作者主张，无量化数据支撑。
- “插件已获 Anthropic 的 Claude 目录批准、是否即将出现在公共市场”：也只是作者表述。
- 示例是节选与示意图，不能当作完整流程的验证。
- 适用条件：仅适用于编码场景且绑定 Claude Code 生态；需 Python 3；第三方 marketplace 自动更新默认关闭，需手动开启。

## 依据的调研

- [nykooi1/vibe-wise](../research/radar/2026-10-02/770-nykooi1-vibe-wise.md)：值得一试，按 README 给出的命令在 Claude Code 里装 VibeWise，并在小项目上完整走一遍 Build→Design→Implementation 检查点，小范围评估它能否让「AI 写码时人边做边学」——它有可直接复制的安装/配置流程和明确的协作模式，但除 119 stars 外没有任何量化效果证据，且插件尚未进入公共社区市场。
