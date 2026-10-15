# wanderingspirit03/ambition-skill

- 结论：**值得一试**。把仓库 clone 到 ~/.claude/skills/ambition，在 Claude Code 里用 /ambition 或“make this more ambitious”触发，让它在动手前先产出升维改写 brief 再由你选择——安装与触发方式明确、成本极低，适合先在自己定义任务/委派任务的环节小范围试；但本次材料只有 README，SKILL.md 正文不可见，暂不足以给 adopt。
- 原文：https://github.com/wanderingspirit03/ambition-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-15T21:16:18.428Z

## 是什么

`wanderingspirit03/ambition-skill` 是一个 Claude Code skill（仓库 49 stars）。它把用户给出的一个任务重写成一个“更有野心”的版本，依据是 Felix Rieseberg 的文章 *How to be more ambitious: a tutorial for humans with models* 中的 altitude（高度）、depth（深度）、range（范围）方法。

关键交互特征（README 明确写的）：它只先展示改写后的简短 brief，然后**等用户选择**，在你确认之前不做任何实际工作。

仓库文件：`SKILL.md`（skill 本体）、`references/essay-notes.md`（那篇文章的摘要与示例）。

注意：本次输入只包含 README，**没有 SKILL.md 的正文**，所以下面只能给出安装/触发/交互层面的可照做步骤，改写用的具体提示词无法照抄。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提**：本机已安装并能运行 Claude Code，且有权限写入 `~/.claude/skills/` 目录。
   把仓库 clone 成 skills 目录下的 `ambition`：
   ```bash
   git clone https://github.com/wanderingspirit03/ambition-skill ~/.claude/skills/ambition
   ```
2. **前提**：已在一个 Claude Code 会话里，手头有一个你想改写/派发的任务。
   用斜杠命令或自然语言触发它：
   ```
   /ambition
   ```
   或直接说：
   ```
   make this more ambitious
   ```
3. 触发后，skill 会先给出一个**改写后的简短 brief**（即按 altitude / depth / range 升维过的任务描述），此时它不会开始干活。
4. 你阅读 brief，选择是否采用（这一步是原文明确的人在选择点上做决定，skill 在此等待）。
5. 想看方法依据或示例，读仓库里的 `references/essay-notes.md`（原文说明该文件是那篇 essay 的摘要与 worked examples）。
6. 想改造行为（例如改变它升维的方向、brief 长度、是否自动继续），直接编辑仓库中的 `SKILL.md`——README 只说明它是 skill 本体，未给出其内容。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：把“任务本身的定义/升维”交给 AI，而不是只让它执行任务。这是原文明确的功能定位（rewrite a task into a more ambitious version）。
- **任务匹配**：形态是 Claude Code skill；协作方式是“会话内轻量 skill + 人在环选择”——AI 先产出候选 brief，人来做取舍。适合任务定义与委派环节。
- **条件供给**：需要 Claude Code 运行环境、skills 目录的写入权限；需要你先提供一个待改写任务；需要你在 brief 出来后给出“选/不选”的反馈（skill 的设计就是在此处停下来等你）。
- **主动推进**：原文没有任何关于时间、事件或状态触发、持续运行的信息，无依据。
- **效果验证**：原文没有给出任何衡量指标或结果数据，无依据。

## 与已有做法的关系（对照给出的清单条目）

清单中已有条目：**Claude Code（tool，状态 adopt）**。本条目不是与它并列的工具，而是构建在 Claude Code 之上的一个 skill，属于对已有工具的补充用法：给 Claude Code 增加“先把任务升维、再执行”这一步。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的**（可直接核对的）：
- 仓库结构：`SKILL.md`、`references/essay-notes.md`；
- 一行安装命令（见上）；
- 两个触发方式：`/ambition` 与 “make this more ambitious”；
- 交互约定：先展示短 brief，等用户选择后才开始做事；
- 方法来源：Felix Rieseberg 的 essay（给出了链接）；
- 仓库 49 stars。

**只是作者主张（原文未给数据/案例）**：
- 这套改写能让任务“更有高度、深度和范围”；
- “先出 brief 再等确认”能避免跑偏——README 未给结果或案例来支撑。

**本次材料的最大局限**：只有 README，没有 `SKILL.md` 与 `references/essay-notes.md` 的内容。因此无法确认：
- 改写提示词具体怎么写；
- altitude / depth / range 三者在实操中如何落地、有没有示例；
- 是否需要额外的模型能力或上下文条件。

**适用条件**：仅适用于 Claude Code 环境；且待改写的任务本身要有被升维的空间（一个已经界定清楚、边界很窄的机械任务，未必适用）。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式**：按上面的命令安装后，在 Claude Code 里挑 2–3 个你**本来就要派给 AI 或同事的真实任务**，逐个跑 `/ambition`，只读它给出的 brief，先不做任何执行；对比 brief 与你的原始表述。

**判断有没有改善的观察点**（以下指标是本次调研为试用环节设计的，原文并未提供任何指标）：

1. **是否真的改了任务，而不是只换了说法**：对比改前/改后的任务，看目标、约束、交付物有没有实质变化；若有，记录变在哪一维（altitude / depth / range）。
2. **是否命中你的真实意图**：brief 是否说出了你原本想要但没写出来的东西；如果只是把话说得更宏大却没落到你的目标上，说明升维跑偏。
3. **返工是否减少**：同一类任务，用 `/ambition` 先改写的版本与直接派发的版本，各记录一次执行，比较返工次数或返工耗时——这是判断“先 brief 后执行”这个停下等待的动作是否值得的直接方式。
4. **停等是否真的发生**：确认它在给出 brief 后确实停住、没有抢跑执行，这是它相对普通 prompt 的核心差异点。

**退出门槛**：如果试过后发现它只是把任务说得更花哨、实际产出与不改写时无明显差别，就把它从“可用工具”降为“思路参考”（study），不要写进手册。
