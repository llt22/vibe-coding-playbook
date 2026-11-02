# 让论文写作 agent 在交稿前拿出证据和核查记录

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这篇手册解决如何把 AI 论文写作从“生成得像”变成“证据齐全、改动可追溯、交稿前可核查”的问题，覆盖数学/理论、CV/ML 和医学论文三条路线。
> 先试这一步：先选一条路线小范围试用：数学/理论论文用 math-paper-skills 润色一节并渲染 PDF 逐页读；CV/ML 底稿用 bestpaper-writing 从填表生成并跑检查器；医学论文用 dyz-med-paper-skills 项目级安装后调用编排技能做一个边界清晰的任务。
> 最近修订：2026-11-02

## 解决什么问题

AI 在论文写作中有三类高风险失败：数学/理论论文里把“编译通过”当成“检查完成”，在润色或改写中无意改变假设、结论、量词、常数或归一化，或用散文隐藏 gap；CV/ML 论文底稿里容易凭空补数字、基线和引用，或把缺项写成看似完整的句子；医学论文写作与修回里，材料缺口、导师意见、审稿意见和医学判断容易混在一起，输出看似完整却无法逐条追溯依据。这篇手册把三套可安装技能合成一条工作原则：先做任务分诊、补证据和缺项，再生成/改写，最后用渲染、脚本、审计和人工核验证明没有偷改内容。具体工具作为步骤出现，不要求一次全用。

## 适用与不适用

适用：
- 数学/理论论文 LaTeX 写作、整篇 build/polish、从论文生成 companion website、论文和网站配图；环境为 Claude Code 或 OpenAI Codex，能读 skills 目录，有 git 和软链接权限，能编译并渲染 PDF。
- CV/ML 英文论文底稿生成（摘要、引言、方法、实验、配图规划与绘制）；使用 Claude Code、Claude.ai/Cowork 或 Codex，能安装 `bestpaper-writing` 技能，最好有 Python 3 运行检查脚本。
- 医学论文写作与科研：面向中国医生与医学研究生，覆盖选题、PubMed 检索、中英写作、统计结果解读、翻译、选刊、审稿修回、稿件诊断等；使用 Claude Code、Codex 或其他支持 Agent Skills 的智能体；能提供合成材料或已脱敏、获准处理的研究材料，并安排人工医学审阅。

不适用/需谨慎：
- 非数学、非 LaTeX 写作不要硬套 math-paper-skills；非 CV/ML 论文不要假定 bestpaper-writing 的语料规律直接成立，README 自己也邀请补 NLP、机器人、系统等领域语料。
- 非医学论文、不能脱敏或获准处理材料、不能安排医学人工审阅时，不要用医学路线；README 明确要求不提交可识别患者信息、医院凭据或未获准材料。
- 没有 agent skills 目录权限、不能编译渲染 PDF、不能人工核验时，不要用这套流程宣称“已检查”。
- 期望 agent 自动持续推进：三份材料都没有给出时间、事件或状态自动触发机制；医学路线有论文项目记录接续的思路，但只是状态接续，不是自动调度。
- 把生成稿直接投稿：三份材料都要求人工核验缺项、修改对照表和审计结果。
- 医学路线的特定限制：在线检索目前只覆盖 PubMed，知网等中文来源需相应权限；正式统计需相应软件并先确认分析方案；Word 导出适合基础审阅稿，复杂排版、公式和修订痕迹需另用工具处理；许可为 PolyForm Noncommercial License 1.0.0，商业使用需单独书面授权。

## 前置条件

- git；使用 Claude Code 或 Codex；能写 `~/.claude/skills` 或 `~/.agents/skills`，或能复制到项目 `.claude/skills/` / `.agents/skills/`。
- 数学/理论任务：有 notes、outline、Lean development、checked manuscript 或 finished paper 等输入；能编译并渲染 PDF，因为原则要求“Look at the pages”。
- CV/ML 任务：有研究信息表或完整摘要；填表至少 5 个必填项，推荐 8 项；方法与实验可补符号、组件、目标、数据集、指标、对比方法、结果表、消融、`refs.bib` 等；辅助脚本需要 Python 3；可选 CVPR LaTeX 模板。
- 医学任务：Python 3.10+；一个独立论文项目文件夹；合成材料或已脱敏、获准处理的研究材料；按所在机构要求处理数据，不提交可识别患者信息、医院凭据或未获准材料。本地脚本运行不代表整个 AI 会话离线，模型服务可能接收会话中提供的内容。安装器默认不联网，不安装模型或 R/Python 包，不修改宿主设置、账号或其他技能；同名技能内容有差异时会停止。
- 医学任务的安装范围：Claude Code 个人级目录为 `~/.claude/skills/`，项目级为 `.claude/skills/`；Codex 个人级为 `~/.agents/skills/`，项目级为 `.agents/skills/`。同一宿主的个人级与项目级安装二选一，避免同名重复条目。
- 安装后技能不可见时重启 agent；Codex 中 `bestpaper-writing` 需显式调用 `$bestpaper-writing`，医学编排技能在 Claude Code 中用 `/dyz-med-orchestrator`，在 Codex 中用 `$dyz-med-orchestrator`。
- 可视化网站任务还要求 paper text 以 hashed reference 引用源文，agent 写的每句话都要引用来源并通过独立审计。

## 操作步骤

1. 选择路线，不要混用。前提：先判断论文类型和任务边界。数学/理论 LaTeX 论文用做法 A；CV/ML 英文论文底稿用做法 B；医学论文写作与科研用做法 C；多类都做时分别安装、分别审计。预期：每篇论文只走对应路线，共用“不编造、人工核验、检查后再交稿”的底线。

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

12. 做法 C：安装 dyz-med-paper-skills。前提：准备支持 Agent Skills 的智能体（如 Claude Code 或 Codex）、Python 3.10+、一个独立论文项目文件夹，以及合成材料或已脱敏、获准处理的研究材料。获取仓库：
```bash
git clone https://github.com/duyunzhoudyz/dyz-med-paper-skills.git
cd dyz-med-paper-skills
```
Claude Code 个人级安装并自检：
```bash
python scripts/install_codex.py --target "~/.claude/skills"
python scripts/install_codex.py --target "~/.claude/skills" --check
```
Codex 个人级安装并自检：
```bash
python scripts/install_codex.py
python scripts/install_codex.py --check
```
只为一个论文项目安装，路径替换为已经存在的论文项目目录。Claude Code 使用：
```bash
python scripts/install_codex.py --target "/path/to/my-paper/.claude/skills"
python scripts/install_codex.py --target "/path/to/my-paper/.claude/skills" --check
```
Codex 使用：
```bash
python scripts/install_codex.py --project "/path/to/my-paper"
python scripts/install_codex.py --project "/path/to/my-paper" --check
```
预期：安装器默认复制全部 32 个技能及许可文件，成功后显示 PASS、技能数和安装路径；安装器不联网，不安装模型或 R/Python 包，不修改宿主设置、账号或其他技能；同名技能内容有差异时会停止。Windows 可先运行 `python --version`，如使用 `py -3`，将后续 `python` 替换为 `py -3`；路径含空格时保留引号。同一宿主的个人级与项目级安装二选一。

13. 做法 C：打开论文项目并显式调用编排技能。前提：已安装并确认技能目录。Claude Code 使用 `/dyz-med-orchestrator`，Codex 使用 `$dyz-med-orchestrator`；其他智能体按其技能调用方式操作。可先发：
```text
请使用 dyz-med-orchestrator，看看这个文件夹里的论文材料，告诉我现在最该解决什么，先帮我把这一步做好。需要补充的材料列出来。
```
先看它对任务的理解和材料缺口，再继续写作或修改。然后选一个眼前任务并给足输入，例如材料齐备时可以交代：
```text
这是我的结果表、几篇已经核实的文献和讨论初稿。帮我把讨论重写一版：先说清主要发现，再和已有研究比较，最后写临床意义和局限。缺依据的地方单列，用中文告诉我为什么这样改。
```
要求输出至少包括：讨论草稿、结果与文献对应说明、修改理由、还需补充的问题。预期：助手先做任务分诊、列出材料缺口，再完成一个边界清晰的任务；不要期望一次调用自动完成整篇论文。可要求助手说明本轮实际读取了哪个 SKILL.md，以核实技能确实加载。

14. 做法 C：需要文献检索、统计、Word 导出时，先确认权限与工具条件。前提：任务涉及这些外部能力。内置在线检索工具目前只覆盖 PubMed，知网等中文来源需相应权限；正式统计需相应软件并先确认分析方案；Word 导出适合基础审阅稿，复杂排版、公式和修订痕迹需另用工具处理。预期：不会把“本地脚本能跑”误当成“检索、统计、排版都已就绪”。

15. 做法 C：升级与维护。前提：已有安装，准备升级。在新版本源码目录运行安装器，相同内容会跳过；有差异时指定一个尚不存在、位于源码与安装目录之外的备份目录：
```bash
python scripts/install_codex.py --upgrade --backup "/path/to/new-backup"
python scripts/install_codex.py --check
```
Claude Code 或自定义目录的升级与自检要继续带原来的 `--target`；Codex 项目级安装继续带相同的 `--project`。手动安装时，将全部 32 个 `dyz-med-*` 目录完整复制到宿主对应的技能目录，并放入 LICENSE、NOTICE、COMMERCIAL-LICENSE.md；模板与脚本也要复制，不能只复制 SKILL.md 或把整个仓库作为单个技能安装。卸载前备份自己的改动，然后仅删除本项目的 32 个技能目录，论文材料另存在项目目录中。

16. 三条路线共用的交稿前检查。前提：已完成生成或改写。预期：逐项确认没有编造数字/基线/引用；所有 `[TODO]` 已有人工处理；修改对照表已接受或拒绝；主张-证据表与实验/消融一一对应；数学论文已渲染 PDF 逐页读，网站每句话可回溯源文；医学任务的安装自检为 PASS、助手能指出实际读取的 SKILL.md、重要说法能回到给定结果或文献、缺依据处已单列、没有提交可识别患者信息或未获准材料、医学判断已由人确认；检查器和人工审计的失败项有处理记录。只有这些完成后，才把稿子称为“检查过”。

## 怎么判断变好了

最小试用：
- 数学/理论：选一篇已有数学论文或其中一节；安装四个 skill；用 `latex-math-writing` 润色一节，或对 checked manuscript 用 `math-paper-campaign` 做 polish；或对一篇论文用 `visual-paper` 生成 companion site；编译并渲染 PDF，逐页读。记录渲染检查发现的问题数、审计通过/失败项、人工复核发现的不一致数、生成网站中每条陈述可回溯到源文的比例、人工审阅时间前后变化。
- CV/ML：选 1 篇已有完整摘要、结果表和消融的实验论文；安装 Claude Code 技能；用填表方式提供 5 个必填项和尽量多的推荐项，按提示词生成 Title、Abstract、Introduction、Methods、Experiments；再对同一篇论文用同一模型直接写一版作对照；运行 `check_draft.py` 和 `check_figures.py`，并按仓库 `evals/` 的盲评标准请 2 位同领域同事盲评。记录人工修改时间是否下降；事实错误、凭空数字和 `[TODO]` 数量是否不增加；检查器报告的 AI 腔、破折号、堆砌警句、图注问题是否减少；修改对照表接受率；主张-证据表是否完整、消融是否与主张一一对应；盲评是否不差于直接 AI 草稿。
- 医学：选一个论文项目，优先项目级安装，准备合成或已脱敏材料；运行 `--check`，确认 PASS、32 个技能和安装路径；在宿主中显式调用 `/dyz-med-orchestrator` 或 `$dyz-med-orchestrator`，要求助手说明本轮实际读取了哪个 SKILL.md；然后只做一个边界清晰的任务，例如按给定结果表、已核实文献和讨论初稿重写讨论，要求输出草稿、结果-文献对应、修改理由、待补材料。记录安装自检是否 PASS、技能是否实际加载、输出是否包含要求的四类内容、重要说法能否回到给定结果或文献、缺依据处是否单列、修改理由是否具体到段落/问题、人工复核成本，以及首次可用草稿时间、待补材料数量、未解决意见数量等自定指标。

判断变好：至少同时满足“没有更多事实错误/缺项被隐藏”“人工修改时间下降或持平但审计更完整”“盲评或人工复核不差于原流程”。如果指标没有改善，或人工核验成本高于直接写作，就只保留其检查清单和写作规则，不把完整流程纳入常规。医学路线另有停止条件：技能未实际加载、输出无法追溯依据、需要越权访问数据、或无人做医学审阅时，不应继续采用。

试多久：材料未给推荐时长；建议先在一节、一篇论文或一个边界清晰的任务上小范围试用，记录上述指标前后变化，再决定是否扩大。math-paper-skills 的 README 未展开 SKILL.md 细节，效果需在真实论文上验证；bestpaper-writing 的安装脚本和检查器也未在材料中实际运行；dyz-med-paper-skills 是公开测试版，真实连续写作效果、各智能体实际表现和医学内容独立质量评估尚未全部完成。

## 常见坑

- 只编译不检查：原则明确“Compiling is not checking: render the PDF and read it.”必须渲染后逐页读。
- 只装一部分 math skill：四个 skill 相互引用 references，要一起安装。
- 用软链后移动或删除克隆目录：软链会失效，需保留克隆位置或用项目内复制方式。
- 把 README 当完整文档：math-paper-skills README 未展开 SKILL.md 的具体提示词、配置或完整流程；bestpaper-writing README 未给检查器命令行示例；dyz-med-paper-skills README 也说明真实连续写作效果和医学内容独立质量评估尚未全部完成。
- 以为会自动持续完成：三份材料都没有给出时间、事件或状态自动触发机制，只有分阶段流程、项目记录和状态跟踪，需要人工推进。
- 在非数学、非 LaTeX、非 CV/ML、非医学或没有 skills 目录权限的环境硬套对应路线：不一定适用。
- 网站任务只生成不审计：可视化网站要求 hashed reference、每句话引用来源并通过独立审计。
- 图只当装饰：math-figures 只在图能表达或教学数学思想时才做；bestpaper-writing 的配图也要先有规划表，说明图承载哪个主张。
- 把 bestpaper-writing 或 dyz-med-paper-skills 的生成稿直接投稿：必须人工处理 `[TODO]`、修改对照表、`report.md` 中的待补充清单，以及医学判断和导师/审稿意见。
- 把 `[TODO]` 当成可以自动补齐：缺失数字、基线、引用必须人工补，不能让 agent 猜。
- 只跑检查器不读输出：`check_draft.py`、`check_figures.py` 是辅助，README 未给命令行示例，且未展示实际评测结果。
- 输入表填得太少：bestpaper-writing 至少 5 个必填项，推荐 8 项；只给一句话会让缺项追问和改写对照表失去作用。
- 不做对照和盲评：只看“生成得像论文”不够，建议同题直接写一版作对照。
- 混用路线：数学/理论论文不要用 CV/ML 语料规律替代逐页渲染和数学审计；CV/ML 底稿也不要假装已经过数学证明检查；医学论文不要用通用写作规则替代医学人工审阅。
- 医学路线个人级与项目级同时安装：同一宿主二选一，避免同名重复条目。
- 手动安装只复制 SKILL.md 或把整个仓库当单个技能：必须完整复制全部 32 个 `dyz-med-*` 目录，并放入 LICENSE、NOTICE、COMMERCIAL-LICENSE.md，模板与脚本也要复制。
- 把安装自检 PASS 当成技能已加载或结论成立：`--check` 只检查 Codex、Rscript、PyYAML 是否能被发现，不探测 Claude Code 或其他宿主，也不验证账号、网络、包版本或文档工具；要要求助手说明本轮实际读取了哪个 SKILL.md。
- 让医学 agent 一次生成整篇论文：README 明确说整篇论文不会在一次调用后自动完成；先做任务分诊，再做边界清晰的任务。
- 提交可识别患者信息、医院凭据或未获准材料：医学路线必须使用合成或已脱敏、获准处理的材料，并遵守机构要求。
- 以为医学在线检索能查知网：内置在线检索目前只覆盖 PubMed，中文数据库需相应权限。
- 把 Word 导出当最终排版：Word 导出适合基础审阅稿，复杂排版、公式和修订痕迹需另用工具处理。
- 忽略医学技能许可：PolyForm Noncommercial License 1.0.0，商业使用需单独书面授权。
- 升级不带原来的 `--target` 或 `--project`，或备份目录放在源码/安装目录内或已存在：升级和自检要沿用原范围，备份目录需尚不存在且位于源码与安装目录之外。
- 把医学项目记录接续当成自动调度：它只是下次有记录可接，不是定时自动运行。

## 证据与来源

- 数学/理论论文的安装、四个 skill、调用示例、逐页渲染、网站审计、配图原则：依据 `amelieloher/math-paper-skills` 的 README。README 明确列出四个 skill 及用途；给出安装命令；给出调用示例；给出两个用这些方法构建的 visual papers 示例链接（Homogenization at a polynomial scale in high contrast，作者 Armstrong、Kuusi、Loher；Döblin–Fourier cancellation and kinetic Aleksandrov estimates，作者 Loher、Mooney、Mouhot）；给出五条原则；说明许可为 CC BY 4.0，改编自 Scott Armstrong 和 Amélie Loher 的私人集合；仓库当前 30 stars（初筛数据）。其中“数学优先”“无未检查内容到达读者”“图必须携带思想”等是作者主张，README 没有量化效果数据、对照实验或用户反馈；材料只有 README，没有展开 SKILL.md 的具体提示词、配置或完整流程，效果需在真实论文上验证。
- CV/ML 论文底稿的安装、填表、提示词、`[TODO]`、`report.md`、配图规划、`check_draft.py`/`check_figures.py`：依据 `gulucaptain/Best-Paper-Writing-Skill` 的 README。README 自述语料为 2021–2025 年 CVPR 22 篇、ICCV 12 篇、NeurIPS 26 篇，共 60 篇；类型分布为方法改进 26、新能力 7、数据集 6、测量 5、机理分析 5、理论 4、规模规律 4、再检验 3；风格规则由其中 55 篇拟合，5 篇 2024 年论文留出测试；配图统计来自 44 篇获奖论文。README 还给出通用 AI 草稿与获奖论文的对比（句尾分词短语约 32% 对约 8%，开头、缺口、组件、局限写法不同），但没有在给定材料中展示原始统计表、盲评结果或独立复现；仓库声明不含论文 PDF 或全文；适用条件偏 CV/ML 英文论文写作，README 自己也邀请补充 NLP、机器人、系统等领域语料。安装脚本和检查器未在本次材料中实际运行；`check_draft.py`、`check_figures.py` 的命令行示例 README 未给出。
- 医学论文写作与科研路线的安装、自检、个人级/项目级目录、编排技能、项目记录、升级/备份/手动安装、PubMed 检索限制、Word 导出限制和许可：依据 `duyunzhoudyz/dyz-med-paper-skills` 的 README。README 给出 32 个技能、安装/自检命令、个人级/项目级目录、显式调用方式、升级/备份/手动安装说明，以及四个合成教学示例（论证地图、拒稿诊断、中译英、审稿回复）；输入指标显示 32 stars，只能说明有一定关注，不能证明效果。局限是公开测试版；真实使用中的连续写作效果、各智能体表现、医学内容独立质量评估未全部完成；示例不是医生反馈或已发表论文；在线检索只覆盖 PubMed，中文数据库需权限；统计需软件和确认方案；Word 导出适合基础审阅稿；安装自检不等于技能已加载，也不等于结论成立或论文可发表；许可为 PolyForm Noncommercial License 1.0.0，商业使用需单独书面授权。
- “人工核验后再定稿”“不要直接投稿”“缺失数字/基线/引用保留为 `[TODO]`”：三份材料的共同要求或明确说明，医学 README 也要求人工审阅和不提交未获准材料；其中“不要直接投稿”在 bestpaper-writing 材料中明确写出，math-paper-skills 以“Nothing unchecked reaches a reader.”表达同类主张。哪些是作者主张：三份材料都没有提供独立对照实验或用户反馈来证明整体流程能稳定提升论文质量；本文把“小范围试用、同题对照、盲评、记录人工修改时间、设置停止条件”列为验证方式，属于基于材料的谨慎做法，不是原文给出的效果结论。

## 依据的调研

- [amelieloher/math-paper-skills](../research/radar/2026-10-09/2140-amelieloher-math-paper-skills.md)：值得一试，建议在数学/理论论文写作与可视化场景中小范围试用：按 README 克隆仓库，把四个 skill 链入 Claude Code 或 Codex 的 skills 目录，再按任务调用。理由是它给出了可复制的安装与调用入口，并内建“数学优先、渲染检查、独立审计”等流程约束，但 README 未展开 SKILL.md 细节，效果需在真实论文上验证。
- [gulucaptain/Best-Paper-Writing-Skill](../research/radar/2026-10-29/8203-gulucaptain-best-paper-writing-skill.md)：值得一试，建议先小范围试用：按 README 安装为 Claude Code/Codex 技能，用一篇论文按“填表/摘要→追问缺项→起草→自检”跑通；它给出可复制命令、表单和提示词，但效果证据主要来自仓库自述，且范围限于 CV/ML 论文，需人工核验后再决定是否纳入常规流程。
- [duyunzhoudyz/dyz-med-paper-skills](../research/radar/2026-11-02/9499-duyunzhoudyz-dyz-med-paper-skills.md)：值得一试，建议小范围试用：在单个论文项目里按 README 安装 32 个技能，先用 dyz-med-orchestrator 做任务分诊，再完成一项有明确输入输出的写作或修回任务。理由是它给出了可复制的安装、目录、调用和检查步骤，但仍是公开测试版，真实写作效果和医学质量尚未完成独立评估。
