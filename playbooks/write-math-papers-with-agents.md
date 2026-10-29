# 让论文写作 agent 先补证据再动笔，交稿前拿出可核验的检查记录

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决 AI 在数学/理论论文和 CV/ML 论文写作中把“生成完成”或“编译通过”当成“检查完成”，从而改变假设、结论、量词、常数，或编造数字、隐藏缺项的问题。
> 先试这一步：先选一篇论文的一节（数学/理论）或一篇有完整摘要和结果表的论文（CV/ML），只安装对应技能跑通一次“输入—生成—检查—人工复核”的小闭环，不要直接投稿。
> 最近修订：2026-10-29

## 解决什么问题
AI 在论文写作中有两类高风险失败：数学/理论论文里把“编译通过”当成“检查完成”，在润色或改写中无意改变假设、结论、量词、常数或归一化，或用散文隐藏 gap；CV/ML 论文底稿里容易凭空补数字、基线和引用，或把缺项写成看似完整的句子。这篇手册把两套可安装技能合成一条工作原则：先补证据和缺项，再生成/改写，最后用渲染、脚本和人工审计证明没有偷改内容。具体工具作为步骤出现，不要求一次全用。

## 适用与不适用
适用：
- 数学/理论论文 LaTeX 写作、整篇 build/polish、从论文生成 companion website、论文和网站配图；环境为 Claude Code 或 OpenAI Codex，能读 skills 目录，有 git 和软链接权限，能编译并渲染 PDF。
- CV/ML 英文论文底稿生成（摘要、引言、方法、实验、配图规划与绘制）；使用 Claude Code、Claude.ai/Cowork 或 Codex，能安装 `bestpaper-writing` 技能，最好有 Python 3 运行检查脚本。

不适用/需谨慎：
- 非数学、非 LaTeX 写作不要硬套 math-paper-skills；非 CV/ML 论文不要假定 bestpaper-writing 的语料规律直接成立，README 自己也邀请补 NLP、机器人、系统等领域语料。
- 没有 agent skills 目录权限、不能编译渲染 PDF、不能人工核验时，不要用这套流程宣称“已检查”。
- 期望 agent 自动持续推进：两份材料都没有给出时间、事件或状态自动触发机制，只有分阶段流程和人工推进。
- 把生成稿直接投稿：两份材料都要求人工核验缺项、修改对照表和审计结果。

## 前置条件
- git；使用 Claude Code 或 Codex；能写 `~/.claude/skills` 或 `~/.agents/skills`，或能复制到项目 `.claude/skills/` / `.agents/skills/`。
- 数学/理论任务：有 notes、outline、Lean development、checked manuscript 或 finished paper 等输入；能编译并渲染 PDF，因为原则要求“Look at the pages”。
- CV/ML 任务：有研究信息表或完整摘要；填表至少 5 个必填项，推荐 8 项；方法与实验可补符号、组件、目标、数据集、指标、对比方法、结果表、消融、`refs.bib` 等；辅助脚本需要 Python 3；可选 CVPR LaTeX 模板。
- 安装后技能不可见时重启 agent；Codex 中 `bestpaper-writing` 需显式调用 `$bestpaper-writing`。
- 可视化网站任务还要求 paper text 以 hashed reference 引用源文，agent 写的每句话都要引用来源并通过独立审计。

## 操作步骤
1. 选择路线，不要混用。前提：先判断论文类型。数学/理论 LaTeX 论文用做法 A；CV/ML 英文论文底稿用做法 B；两边都做时分别安装、分别审计。预期：每篇论文只走对应路线，共用“不编造、人工核验、检查后再交稿”的底线。

2. 做法 A：安装 math-paper-skills。前提：已安装 git，能访问 GitHub。命令：
```bash
git clone https://github.com/amelieloher/math-paper-skills.git
cd math-paper-skills
```
预期：当前目录下出现 math-paper-skills。四个 skill 要一起安装，因为它们相互引用彼此的 references。

3. 做法 A：选择全局或项目内安装。前提：希望所有项目可用且能写 home 下 skills 目录，选全局；只想在某个项目内使用，选项目内复制。全局安装 Claude Code：
```bash
mkdir -p ~/.claude/skills
for s in skills/*; do ln -sfn "$(pwd)/$s" ~/.claude/skills/"$(basename "$s")"; done
```
全局安装 Codex：
```bash
mkdir -p ~/.agents/skills
for s in skills/*; do ln -sfn "$(pwd)/$s" ~/.agents/skills/"$(basename "$s")"; done
```
项目内安装：把 skill 文件夹复制到项目的 `.claude/skills/` 或 `.agents/skills/`。预期：对应 skills 目录下出现四个 skill。用软链时保留克隆位置；更新时在克隆目录执行：
```bash
git pull
```
预期：skills 更新，软链仍有效；移动或删除克隆目录会让软链失效。

4. 做法 A：调用并按任务选 skill。前提：已安装四个 skill 并已提供输入。提示词示例：
```text
use latex-math-writing to tighten Section 3
use math-paper-campaign to polish this paper for submission
use visual-paper to build a companion site for this paper
```
预期：agent 按对应 skill 开始工作。写作任务从 `latex-math-writing` 进入；整篇论文构建或润色用 `math-paper-campaign`（其 polish 包含 reduce、cite、linearise、rewrite、introduction、final audit 等阶段）；从论文生成 companion website 用 `visual-paper`；论文和网站配图用 `math-figures`。

5. 做法 A：写作或润色后编译并渲染 PDF，逐页读。前提：能编译并渲染 PDF。预期：检查是否无意改变假设、结论、量词、常数或归一化；检查散文是否隐藏 gap；检查技术条件是否在应在位置显式写出。执行这条原则：“Compiling is not checking: render the PDF and read it.”以及“Nothing unchecked reaches a reader.”

6. 做法 A：可视化网站和配图额外检查。前提：用 `visual-paper` 或 `math-figures`。网站任务要求 paper text 按 hashed reference 引用源文，agent 写的每句话引用来源并通过独立审计；预期网站包含证明依赖图、从源文引用的精确陈述与证明、审计摘要、notation cards、figures、Lean badges。配图只在图能表达或教学数学思想时才做；预期图或动画增加数学洞察或教学价值，而非装饰。

7. 做法 B：安装 bestpaper-writing。前提：本机有 git；辅助脚本需要 Python 3；已安装 Claude Code 或 Codex。命令：
```bash
git clone https://github.com/gulucaptain/Best-Paper-Writing-Skill.git
cd Best-Paper-Writing-Skill

./install.sh claude     # Claude Code → ~/.claude/skills/
./install.sh codex      # Codex       → ~/.agents/skills/
./install.sh all        # 两个都装；加 --project 则装到当前项目目录
```
预期：技能出现在对应目录。Claude Code 也可手动复制 `skills/bestpaper-writing/` 到 `~/.claude/skills/`；Codex 可手动复制到 `~/.agents/skills/`；Claude.ai/Cowork 可把 `bestpaper-writing` 文件夹打成 zip，在 Skills 页面上传。安装后技能不可见时重启 agent；Codex 中用 `$bestpaper-writing` 显式调用。

8. 做法 B：准备输入。前提：已安装 bestpaper-writing。方式一：用浏览器打开 `skills/bestpaper-writing/assets/intake_form.html`，离线填写并导出 JSON。必填 5 项：一句话说清工作、任务、现有方法在什么情况下不行、方法组成、头条结果；推荐 8 项：现有最强方法、失败原因、核心观察、最相近工作、具体画面、效率优势、反直觉之处、团队内部叫法。方式二：直接准备一段完整摘要，或直接用文字描述工作。预期：输入越完整，底稿质量越高；缺失的数字、基线、引用不要猜，后续保留为 `[TODO]`。

9. 做法 B：调用技能生成底稿。前提：技能已安装好。填表方式发送导出的 JSON，并附提示词：
```text
用 Best-Paper-Writing-Skill，根据这份信息表 JSON 写出论文的 Title、Abstract、Introduction、Methods 和 Experiments。
```
摘要方式附提示词：
```text
用 Best-Paper-Writing-Skill，根据这段摘要写出论文的 Title、Abstract、Introduction、Methods 和 Experiments。
```
预期：技能先把摘要拆回字段，标出哪些已有、哪些模糊、哪些缺失，一次性追问缺项；按八类论文路由论证路线；输出 Markdown 或写入 LaTeX 模板；写完后给出摘要修改对照表（原句→改后句→理由），可逐条接受或拒绝；输出论文稿和 `report.md`（核心主张、主张-证据表、待补充清单、Limitations 要点）。

10. 做法 B：做配图规划和检查。前提：使用 bestpaper-writing 的配图部分。预期：先做图像规划表（每张图承载哪个主张、放哪、需要什么素材），按论证路线选 Figure 1 类型，再用统一配色和样式画示意图/方法总览图；需要实验结果的图留白，并把规划写进图注。配图不要只当装饰。

11. 做法 B：运行检查器并人工定稿。前提：已生成草稿和配图规划，本机有 Python 3。使用仓库自带 `check_draft.py`、`check_figures.py`；README 未给出这两个脚本的命令行示例，需按脚本实际参数运行。预期：`check_draft.py` 对照语料统计检查草稿中的 AI 腔、破折号、堆砌警句和凭空数字；`check_figures.py` 检查图注长度、首句、引用、矢量图与占位图。随后把 `[TODO]`、修改对照表、`report.md` 中的主张-证据表和待补充清单交给作者/合作者核验；不要把生成稿直接投稿。

12. 两条路线共用的交稿前检查。前提：已完成生成或改写。预期：逐项确认没有编造数字/基线/引用；所有 `[TODO]` 已有人工处理；修改对照表已接受或拒绝；主张-证据表与实验/消融一一对应；数学论文已渲染 PDF 逐页读，网站每句话可回溯源文；检查器和人工审计的失败项有处理记录。只有这些完成后，才把稿子称为“检查过”。

## 怎么判断变好了
最小试用：
- 数学/理论：选一篇已有数学论文或其中一节；安装四个 skill；用 `latex-math-writing` 润色一节，或对 checked manuscript 用 `math-paper-campaign` 做 polish；或对一篇论文用 `visual-paper` 生成 companion site；编译并渲染 PDF，逐页读。记录渲染检查发现的问题数、审计通过/失败项、人工复核发现的不一致数、生成网站中每条陈述可回溯到源文的比例、人工审阅时间前后变化。
- CV/ML：选 1 篇已有完整摘要、结果表和消融的实验论文；安装 Claude Code 技能；用填表方式提供 5 个必填项和尽量多的推荐项，按提示词生成 Title、Abstract、Introduction、Methods、Experiments；再对同一篇论文用同一模型直接写一版作对照；运行 `check_draft.py` 和 `check_figures.py`，并按仓库 `evals/` 的盲评标准请 2 位同领域同事盲评。记录人工修改时间是否下降；事实错误、凭空数字和 `[TODO]` 数量是否不增加；检查器报告的 AI 腔、破折号、堆砌警句、图注问题是否减少；修改对照表接受率；主张-证据表是否完整、消融是否与主张一一对应；盲评是否不差于直接 AI 草稿。

判断变好：至少同时满足“没有更多事实错误/缺项被隐藏”“人工修改时间下降或持平但审计更完整”“盲评或人工复核不差于原流程”。如果指标没有改善，或人工核验成本高于直接写作，就只保留其检查清单和写作规则，不把完整流程纳入常规。

试多久：材料未给推荐时长；建议先在一节或一篇论文上小范围试用，记录上述指标前后变化，再决定是否扩大。math-paper-skills 的 README 未展开 SKILL.md 细节，效果需在真实论文上验证；bestpaper-writing 的安装脚本和检查器也未在材料中实际运行。

## 常见坑
- 只编译不检查：原则明确“Compiling is not checking: render the PDF and read it.”必须渲染后逐页读。
- 只装一部分 math skill：四个 skill 相互引用 references，要一起安装。
- 用软链后移动或删除克隆目录：软链会失效，需保留克隆位置或用项目内复制方式。
- 把 README 当完整文档：math-paper-skills README 未展开 SKILL.md 的具体提示词、配置或完整流程；bestpaper-writing README 未给检查器命令行示例；效果需在真实论文上验证。
- 以为会自动持续完成：两份材料都没有给出时间、事件或状态自动触发机制，只有分阶段流程和 ledger、statuses、drift protocol 等控制概念，需要人工推进和状态跟踪。
- 在非数学、非 LaTeX 或没有 skills 目录权限的环境硬套 math-paper-skills：不一定适用。
- 网站任务只生成不审计：可视化网站要求 hashed reference、每句话引用来源并通过独立审计。
- 图只当装饰：math-figures 只在图能表达或教学数学思想时才做；bestpaper-writing 的配图也要先有规划表，说明图承载哪个主张。
- 把 bestpaper-writing 的生成稿直接投稿：必须人工处理 `[TODO]`、修改对照表和 `report.md` 中的待补充清单。
- 把 `[TODO]` 当成可以自动补齐：缺失数字、基线、引用必须人工补，不能让 agent 猜。
- 只跑检查器不读输出：`check_draft.py`、`check_figures.py` 是辅助，README 未给命令行示例，且未展示实际评测结果。
- 输入表填得太少：bestpaper-writing 至少 5 个必填项，推荐 8 项；只给一句话会让缺项追问和改写对照表失去作用。
- 不做对照和盲评：只看“生成得像论文”不够，建议同题直接写一版作对照。
- 混用路线：数学/理论论文不要用 CV/ML 语料规律替代逐页渲染和数学审计；CV/ML 底稿也不要假装已经过数学证明检查。

## 证据与来源
- 数学/理论论文的安装、四个 skill、调用示例、逐页渲染、网站审计、配图原则：依据 `amelieloher/math-paper-skills` 的 README。README 明确列出四个 skill 及用途；给出安装命令；给出调用示例；给出两个用这些方法构建的 visual papers 示例链接（Homogenization at a polynomial scale in high contrast，作者 Armstrong、Kuusi、Loher；Döblin–Fourier cancellation and kinetic Aleksandrov estimates，作者 Loher、Mooney、Mouhot）；给出五条原则；说明许可为 CC BY 4.0，改编自 Scott Armstrong 和 Amélie Loher 的私人集合；仓库当前 30 stars（初筛数据）。其中“数学优先”“无未检查内容到达读者”“图必须携带思想”等是作者主张，README 没有量化效果数据、对照实验或用户反馈；材料只有 README，没有展开 SKILL.md 的具体提示词、配置或完整流程，效果需在真实论文上验证。
- CV/ML 论文底稿的安装、填表、提示词、`[TODO]`、`report.md`、配图规划、`check_draft.py`/`check_figures.py`：依据 `gulucaptain/Best-Paper-Writing-Skill` 的 README。README 自述语料为 2021–2025 年 CVPR 22 篇、ICCV 12 篇、NeurIPS 26 篇，共 60 篇；类型分布为方法改进 26、新能力 7、数据集 6、测量 5、机理分析 5、理论 4、规模规律 4、再检验 3；风格规则由其中 55 篇拟合，5 篇 2024 年论文留出测试；配图统计来自 44 篇获奖论文。README 还给出通用 AI 草稿与获奖论文的对比（句尾分词短语约 32% 对约 8%，开头、缺口、组件、局限写法不同），但没有在给定材料中展示原始统计表、盲评结果或独立复现；仓库声明不含论文 PDF 或全文；适用条件偏 CV/ML 英文论文写作，README 自己也邀请补充 NLP、机器人、系统等领域语料。安装脚本和检查器未在本次材料中实际运行；`check_draft.py`、`check_figures.py` 的命令行示例 README 未给出。
- “人工核验后再定稿”“不要直接投稿”“缺失数字/基线/引用保留为 `[TODO]`”：两份 README 的共同要求或明确说明；其中“不要直接投稿”在 bestpaper-writing 材料中明确写出，math-paper-skills 以“Nothing unchecked reaches a reader.”表达同类主张。哪些是作者主张：两份材料都没有提供独立对照实验或用户反馈来证明整体流程能稳定提升论文质量；本文把“小范围试用、同题对照、盲评、记录人工修改时间”列为验证方式，属于基于材料的谨慎做法，不是原文给出的效果结论。

## 依据的调研

- [amelieloher/math-paper-skills](../research/radar/2026-10-09/2140-amelieloher-math-paper-skills.md)：值得一试，建议在数学/理论论文写作与可视化场景中小范围试用：按 README 克隆仓库，把四个 skill 链入 Claude Code 或 Codex 的 skills 目录，再按任务调用。理由是它给出了可复制的安装与调用入口，并内建“数学优先、渲染检查、独立审计”等流程约束，但 README 未展开 SKILL.md 细节，效果需在真实论文上验证。
- [gulucaptain/Best-Paper-Writing-Skill](../research/radar/2026-10-29/8203-gulucaptain-best-paper-writing-skill.md)：值得一试，建议先小范围试用：按 README 安装为 Claude Code/Codex 技能，用一篇论文按“填表/摘要→追问缺项→起草→自检”跑通；它给出可复制命令、表单和提示词，但效果证据主要来自仓库自述，且范围限于 CV/ML 论文，需人工核验后再决定是否纳入常规流程。
