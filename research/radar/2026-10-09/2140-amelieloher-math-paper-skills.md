# amelieloher/math-paper-skills

- 结论：**值得一试**。建议在数学/理论论文写作与可视化场景中小范围试用：按 README 克隆仓库，把四个 skill 链入 Claude Code 或 Codex 的 skills 目录，再按任务调用。理由是它给出了可复制的安装与调用入口，并内建“数学优先、渲染检查、独立审计”等流程约束，但 README 未展开 SKILL.md 细节，效果需在真实论文上验证。
- 原文：https://github.com/amelieloher/math-paper-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T23:46:21.420Z

## 是什么

`amelieloher/math-paper-skills` 是一组面向数学论文的 agent skills，兼容 Claude Code 和 OpenAI Codex。每个 skill 是一个文件夹，包含被两者读取的 `SKILL.md`，可选 `references/`；`agents/openai.yaml` 是 Codex 专用接口元数据。

包含四个 skill：

| Skill | 用途 |
|---|---|
| `latex-math-writing` | 起草、编辑、出版级润色数学 LaTeX：陈述、证明、记号、引言、展示、渲染页检查 |
| `math-paper-campaign` | 整篇论文、一次一个陈述地推进：从笔记或大纲 **build** 论文，或把 checked manuscript 经阶段 **polish**（reduce、cite、linearise、rewrite、introduction、final audit） |
| `visual-paper` | 从论文构建 companion website：证明依赖图、从源文引用的精确陈述与证明、审计摘要、notation cards、figures、Lean badges |
| `math-figures` | 设计、绘制、动画化、评审论文和网站用图；只在图能表达或教学数学思想时才做 |

`latex-math-writing` 是任何写作任务的入口。它的 references 包括：`writing-rules.md`（先读，优先级、硬规则、检查清单）、`artisan-writing.md`（陈述、证明、散文、记号、排版详细指导）、`house-style.md`（润色论文的默认外观和解释风格，含起始 preamble）。

`math-paper-campaign` 控制整篇论文流程：`route-build.md`（从笔记、大纲或 Lean development 到正确、经评审的论文）、`route-polish.md`（Phase 0–6，把 checked manuscript 变成出版就绪稿）、`shared-controls.md` 与 `control-artifacts.md`（packets、ledger 和状态、drift protocol、reviewers、final audit）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. 前提：已安装 git；使用 Claude Code 或 OpenAI Codex；能访问 GitHub 并执行软链接。

2. 克隆仓库并进入目录：

```bash
git clone https://github.com/amelieloher/math-paper-skills.git
cd math-paper-skills
```

3. 为 Claude Code 安装 skills：创建 `~/.claude/skills`，把 `skills/*` 逐个软链进去。

```bash
mkdir -p ~/.claude/skills
for s in skills/*; do ln -sfn "$(pwd)/$s" ~/.claude/skills/"$(basename "$s")"; done
```

4. 为 Codex 安装 skills：创建 `~/.agents/skills`，把 `skills/*` 逐个软链进去。

```bash
mkdir -p ~/.agents/skills
for s in skills/*; do ln -sfn "$(pwd)/$s" ~/.agents/skills/"$(basename "$s")"; done
```

5. 位置与更新：软链接指向克隆目录，所以保留克隆位置；`git pull` 可更新 skills。若只想在项目内共享，把 skill 文件夹复制到项目的 `.claude/skills/` 或 `.agents/skills/`。四个 skill 要一起安装，因为它们相互引用彼此 references。

6. 调用：对 agent 使用类似提示词。

```text
use latex-math-writing to tighten Section 3
use math-paper-campaign to polish this paper for submission
use visual-paper to build a companion site for this paper
```

7. 按任务选用：写作任务从 `latex-math-writing` 进入；整篇论文构建或润色用 `math-paper-campaign`；从论文生成 companion website 用 `visual-paper`；论文和网站配图用 `math-figures`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. 能力发现：AI 可承担研究级数学论文的 LaTeX 起草、编辑和出版级润色；可整篇地 build 或 polish 论文；可从论文生成带证明依赖图、精确陈述与证明引用、审计摘要、notation cards、figures、Lean badges 的交互式 companion website；可设计、绘制、动画化和评审数学图。

2. 任务匹配：材料明确面向 Claude Code 和 OpenAI Codex。每个 skill 是文件夹，`SKILL.md` 被两者读取，`agents/openai.yaml` 是 Codex 专用元数据。写作入口是 `latex-math-writing`；整篇论文流程是 `math-paper-campaign`；可视化网站是 `visual-paper`；图与动画是 `math-figures`。安装时四个一起装，因为相互引用。

3. 条件供给：需要提供 notes、outline、Lean development、checked manuscript 或 finished paper 等输入；需要 agent 能读取 skills 目录；需要 git 克隆和软链接权限；需要能编译并渲染 PDF，因为原则要求“Look at the pages”。可视化网站工作还要求 paper text 以 hashed reference 引用源文，agent 写的每句话都要引用来源并通过独立审计。

4. 主动推进：原文未给出由时间、事件或状态自动触发的机制。仅有分阶段流程（build/polish、Phase 0–6）以及 ledger、statuses、drift protocol 等控制概念，可支持人工推进和状态跟踪，但材料不足以判定可自动持续完成。

5. 效果验证：原则包括“Compiling is not checking: render the PDF and read it.”；“Nothing unchecked reaches a reader.”；可视化论文中 paper text 按 hashed reference 引用源文，agent 写的每句话引用来源并通过独立审计；`math-paper-campaign` 含 final audit。Lean badges 用于形式化相关标记。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中有：Claude Code（tool，adopt）、OpenAI Codex（tool，adopt）、Agent skills（concept，adopt）。本仓库与三者直接相关：它是 Agent skills 概念在数学论文写作、图、可视化网站场景的具体实现，安装方式依赖 Claude Code 和 Codex 的 skills 目录。清单中没有其他相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

证据：README 明确列出四个 skill 及用途；给出安装命令；给出调用示例；给出两个用这些方法构建的 visual papers 示例链接（Homogenization at a polynomial scale in high contrast，作者 Armstrong、Kuusi、Loher；Döblin–Fourier cancellation and kinetic Aleksandrov estimates，作者 Loher、Mooney、Mouhot）；给出五条原则；说明许可为 CC BY 4.0，改编自 Scott Armstrong 和 Amélie Loher 的私人集合。仓库当前 30 stars（初筛数据）。

局限：材料只有 README，没有展开 `SKILL.md` 的具体提示词、配置或完整流程；没有量化效果数据、对照实验或用户反馈；“数学优先”“无未检查内容到达读者”“图必须携带思想”等是作者主张，未在材料中验证。适用条件：数学论文 LaTeX 写作、Claude Code/Codex 环境、git 和 skills 目录权限、能编译渲染 PDF。非数学、非 LaTeX 或没有 agent skills 目录权限的环境不一定适用。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用：按安装步骤克隆并链接四个 skill；选一篇已有数学论文或其中一节，用 `latex-math-writing` 润色；或对一篇 checked manuscript 用 `math-paper-campaign` 做 polish；或对一篇论文用 `visual-paper` 生成 companion site。

验证方式：

- 编译并渲染 PDF 后逐页阅读，检查是否无意改变假设、结论、量词、常数或归一化。
- 检查散文是否隐藏 gap，技术条件是否在应在位置显式写出。
- 对可视化网站，检查论文文本是否按 hashed reference 引用源文，agent 写的每句话是否引用来源并通过独立审计。
- 检查网站是否包含证明依赖图、精确陈述与证明、审计摘要、notation cards、figures、Lean badges。
- 人工判断图或动画是否增加数学洞察或教学价值，而非装饰。

原文未给量化指标，建议记录：渲染检查发现的问题数、审计通过/失败项、人工复核发现的不一致数、生成网站中每条陈述可回溯到源文的比例、以及人工审阅时间的前后变化。
