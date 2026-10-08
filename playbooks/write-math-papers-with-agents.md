# 让 AI 写数学论文时按流程推进并逐页核对渲染结果

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决 AI 写数学/理论论文时只编译不检查、改动假设或隐藏 gap 的问题，给出一套可安装、可调用、带审计约束的工作流程。
> 先试这一步：先克隆仓库并把四个 skill 链入你的 agent skills 目录，然后拿一篇已有论文的一节用 latex-math-writing 润色，编译后逐页读 PDF，检查是否无意改变假设、结论或记号。
> 最近修订：2026-10-09

## 解决什么问题
AI 在数学/理论论文写作里容易把“编译通过”当成“检查完成”，可能在润色或改写中无意改变假设、结论、量词、常数或归一化，也可能用散文隐藏 gap。这篇手册给出一套安装、调用和审计约束，让 agent 按“数学优先、渲染检查、独立审计”的流程工作。

## 适用与不适用
适用：数学论文 LaTeX 写作、整篇论文 build/polish、从论文生成 companion website、论文和网站配图；环境为 Claude Code 或 OpenAI Codex，能读 skills 目录，有 git 和软链接权限，能编译并渲染 PDF。
不适用：非数学、非 LaTeX 写作；没有 agent skills 目录权限；不能编译渲染 PDF；期望 agent 自动持续推进（原文未给出时间/事件/状态自动触发机制）。README 未展开 SKILL.md 细节，效果需在真实论文上验证。

## 前置条件
- 已安装 git；使用 Claude Code 或 OpenAI Codex；能访问 GitHub 并执行软链接。
- 有 notes、outline、Lean development、checked manuscript 或 finished paper 等输入。
- agent 能读取 skills 目录。
- 能编译并渲染 PDF，因为原则要求“Look at the pages”。
- 可视化网站任务还要求 paper text 以 hashed reference 引用源文，agent 写的每句话都要引用来源并通过独立审计。

## 操作步骤
1. 克隆仓库。前提：已安装 git，能访问 GitHub。命令：
```bash
git clone https://github.com/amelieloher/math-paper-skills.git
cd math-paper-skills
```
预期：当前目录下出现 math-paper-skills。

2. 选择安装方式。
- 做法 A：全局安装（推荐先试）。前提：希望所有项目可用，且能写 home 下 skills 目录。把 skills/* 软链到 Claude Code 和/或 Codex 的全局 skills 目录。预期：安装后 agent 能读取四个 skill。
- 做法 B：项目内共享。前提：只想在某个项目内使用。把 skill 文件夹复制到项目的 .claude/skills/ 或 .agents/skills/。预期：项目内出现四个 skill 文件夹。
四个 skill 要一起安装，因为它们相互引用彼此 references。

3. 为 Claude Code 安装 skills。前提：使用 Claude Code。命令：
```bash
mkdir -p ~/.claude/skills
for s in skills/*; do ln -sfn "$(pwd)/$s" ~/.claude/skills/"$(basename "$s")"; done
```
预期：~/.claude/skills 下出现四个指向克隆目录的软链。

4. 为 Codex 安装 skills。前提：使用 OpenAI Codex。命令：
```bash
mkdir -p ~/.agents/skills
for s in skills/*; do ln -sfn "$(pwd)/$s" ~/.agents/skills/"$(basename "$s")"; done
```
预期：~/.agents/skills 下出现四个指向克隆目录的软链。

5. 位置与更新。前提：用软链安装。软链接指向克隆目录，所以保留克隆位置；更新时在克隆目录执行：
```bash
git pull
```
预期：skills 更新，软链仍有效。若只想在项目内共享，跳过此步，改为复制到项目目录。

6. 调用 skill。前提：已安装四个 skill，并已提供输入。直接用类似提示词：
```text
use latex-math-writing to tighten Section 3
use math-paper-campaign to polish this paper for submission
use visual-paper to build a companion site for this paper
```
预期：agent 按对应 skill 开始工作。

7. 按任务选用 skill。写作任务从 latex-math-writing 进入；整篇论文构建或润色用 math-paper-campaign；从论文生成 companion website 用 visual-paper；论文和网站配图用 math-figures。前提：输入是 notes、outline、Lean development、checked manuscript 或 finished paper。预期：任务落到对应流程；math-paper-campaign 的 polish 包含 reduce、cite、linearise、rewrite、introduction、final audit 等阶段。

8. 写作或润色后，编译并渲染 PDF，逐页读。前提：能编译并渲染 PDF。预期：检查是否无意改变假设、结论、量词、常数或归一化；检查散文是否隐藏 gap；检查技术条件是否在应在位置显式写出。原则是“Compiling is not checking: render the PDF and read it.”以及“Nothing unchecked reaches a reader.”

9. 可视化网站任务额外检查。前提：用 visual-paper 生成 companion site。要求 paper text 按 hashed reference 引用源文，agent 写的每句话引用来源并通过独立审计。预期：网站包含证明依赖图、从源文引用的精确陈述与证明、审计摘要、notation cards、figures、Lean badges。

10. 配图任务。前提：用 math-figures。只在图能表达或教学数学思想时才做。预期：图或动画增加数学洞察或教学价值，而非装饰。

## 怎么判断变好了
最小试用：按安装步骤克隆并链接四个 skill；选一篇已有数学论文或其中一节，用 latex-math-writing 润色；或对一篇 checked manuscript 用 math-paper-campaign 做 polish；或对一篇论文用 visual-paper 生成 companion site。
可观察指标（原文未给量化指标，建议记录）：
- 渲染检查发现的问题数。
- 审计通过/失败项。
- 人工复核发现的不一致数。
- 生成网站中每条陈述可回溯到源文的比例。
- 人工审阅时间的前后变化。
检查点：
- 编译并渲染 PDF 后逐页阅读，检查是否无意改变假设、结论、量词、常数或归一化。
- 检查散文是否隐藏 gap，技术条件是否在应在位置显式写出。
- 对可视化网站，检查论文文本是否按 hashed reference 引用源文，agent 写的每句话是否引用来源并通过独立审计；检查网站是否包含证明依赖图、精确陈述与证明、审计摘要、notation cards、figures、Lean badges。
- 人工判断图或动画是否增加数学洞察或教学价值。
试多久：原文未给推荐时长；建议先在一节或一篇 checked manuscript 上小范围试用，记录上述指标前后变化，再决定是否扩大。

## 常见坑
- 只编译不检查：原则明确“Compiling is not checking: render the PDF and read it.”必须渲染后逐页读。
- 只装一部分 skill：四个 skill 相互引用 references，要一起安装。
- 用软链后移动或删除克隆目录：软链会失效，需保留克隆位置或用项目内复制方式。
- 把 README 当完整文档：README 未展开 SKILL.md 的具体提示词、配置或完整流程，效果需在真实论文上验证。
- 以为会自动持续完成：原文未给出时间、事件或状态自动触发机制，只有分阶段流程和 ledger、statuses、drift protocol 等控制概念，需要人工推进和状态跟踪。
- 在非数学、非 LaTeX 或没有 skills 目录权限的环境硬套：不一定适用。
- 网站任务只生成不审计：可视化网站要求 hashed reference、每句话引用来源并通过独立审计。
- 图只当装饰：math-figures 只在图能表达或教学数学思想时才做。

## 证据与来源
- 做法依据的调研：amelieloher/math-paper-skills 的 README。README 明确列出四个 skill 及用途；给出安装命令；给出调用示例；给出两个用这些方法构建的 visual papers 示例链接（Homogenization at a polynomial scale in high contrast，作者 Armstrong、Kuusi、Loher；Döblin–Fourier cancellation and kinetic Aleksandrov estimates，作者 Loher、Mooney、Mouhot）；给出五条原则；说明许可为 CC BY 4.0，改编自 Scott Armstrong 和 Amélie Loher 的私人集合；仓库当前 30 stars（初筛数据）。
- 哪些是作者主张，未在材料中验证：“数学优先”“无未检查内容到达读者”“图必须携带思想”等原则；README 没有量化效果数据、对照实验或用户反馈。
- 局限：材料只有 README，没有展开 SKILL.md 的具体提示词、配置或完整流程；效果需在真实论文上验证。
- 适用条件：数学论文 LaTeX 写作、Claude Code/Codex 环境、git 和 skills 目录权限、能编译渲染 PDF。

## 依据的调研

- [amelieloher/math-paper-skills](../research/radar/2026-10-09/2140-amelieloher-math-paper-skills.md)：值得一试，建议在数学/理论论文写作与可视化场景中小范围试用：按 README 克隆仓库，把四个 skill 链入 Claude Code 或 Codex 的 skills 目录，再按任务调用。理由是它给出了可复制的安装与调用入口，并内建“数学优先、渲染检查、独立审计”等流程约束，但 README 未展开 SKILL.md 细节，效果需在真实论文上验证。
