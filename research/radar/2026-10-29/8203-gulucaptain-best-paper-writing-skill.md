# gulucaptain/Best-Paper-Writing-Skill

- 结论：**值得一试**。建议先小范围试用：按 README 安装为 Claude Code/Codex 技能，用一篇论文按“填表/摘要→追问缺项→起草→自检”跑通；它给出可复制命令、表单和提示词，但效果证据主要来自仓库自述，且范围限于 CV/ML 论文，需人工核验后再决定是否纳入常规流程。
- 原文：https://github.com/gulucaptain/Best-Paper-Writing-Skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T11:55:49.059Z

## 是什么
这个仓库把 2021–2025 年 CVPR、ICCV、NeurIPS 的 60 篇最佳论文/最佳学生论文/荣誉提名论文的写作规律，整理成一个同时支持 Claude 与 Codex 的 `bestpaper-writing` 技能。它面向论文底稿生成：摘要、引言、方法、实验，以及配图规划与绘制；输出 Markdown 或写入 LaTeX 模板，并附带 `report.md`（核心主张、主张-证据表、待补充清单、Limitations 要点）。它强调不编造数字、基线和引用，缺失项保留为 `[TODO]`；自带 `check_draft.py`、`check_figures.py` 等检查脚本，并按八类论文路由论证路线。支持 Claude Code、Claude.ai/Cowork、Codex。

## 具体做法
前提：本机有 git；辅助脚本需要 Python 3；已安装 Claude Code 或 Codex；若安装后技能不可见，重启 agent。以下命令和提示词均来自 README。

1. 克隆仓库并安装技能。按使用平台选择命令；加 `--project` 可装到当前项目目录。
```bash
git clone https://github.com/gulucaptain/Best-Paper-Writing-Skill.git
cd Best-Paper-Writing-Skill

./install.sh claude     # Claude Code → ~/.claude/skills/
./install.sh codex      # Codex       → ~/.agents/skills/
./install.sh all        # 两个都装；加 --project 则装到当前项目目录
```
Claude Code 也可手动复制 `skills/bestpaper-writing/` 到 `~/.claude/skills/`；Codex 可手动复制到 `~/.agents/skills/`，用 `$bestpaper-writing` 显式调用；Claude.ai/Cowork 可把 `bestpaper-writing` 文件夹打成 zip，在 Skills 页面上传。

2. 准备输入。方式一：用浏览器打开 `skills/bestpaper-writing/assets/intake_form.html`，离线填写并导出 JSON。必填 5 项：一句话说清工作、任务、现有方法在什么情况下不行、方法组成、头条结果；推荐 8 项：现有最强方法、失败原因、核心观察、最相近工作、具体画面、效率优势、反直觉之处、团队内部叫法；补充得越详细，底稿质量越高。方式二：直接准备一段完整摘要，或直接用文字描述工作。

3. 在 agent 中调用技能。填表方式发送导出的 JSON，并附提示词：
```text
用 Best-Paper-Writing-Skill，根据这份信息表 JSON 写出论文的 Title、Abstract、Introduction、Methods 和 Experiments。
```
摘要方式附提示词：
```text
用 Best-Paper-Writing-Skill，根据这段摘要写出论文的 Title、Abstract、Introduction、Methods 和 Experiments。
```
前提是技能已安装好；Codex 中需显式调用 `$bestpaper-writing`。

4. 处理缺项与追问。README 说明：给摘要时，技能会先把摘要拆回字段，标出哪些已有、哪些模糊、哪些缺失，一次性追问缺项；写完后给出摘要修改对照表（原句→改后句→理由），可逐条接受或拒绝。缺失的数字、基线、引用保留为 `[TODO]`，需要人工补齐。

5. 生成底稿并检查。技能输出论文稿和 `report.md`；配图部分先做图像规划表（每张图承载哪个主张、放哪、需要什么素材），按论证路线选 Figure 1 类型，再用统一配色和样式画示意图/方法总览图，需要实验结果的图留白并把规划写进图注。随后使用仓库自带检查器：`check_draft.py` 对照语料统计检查草稿中的 AI 腔、破折号、堆砌警句和凭空数字；`check_figures.py` 检查图注长度、首句、引用、矢量图与占位图。README 未给出这两个脚本的命令行示例，需按脚本实际参数运行。

6. 人工审阅后定稿。把 `[TODO]`、修改对照表、`report.md` 中的主张-证据表和待补充清单交给作者/合作者核验；不要把生成稿直接投稿。

## 对应的研究问题
- 能力发现：原文明确列出可让 AI 做摘要、引言、方法、实验章节起草，做配图规划与绘制，按八类论文路由论证路线，生成作者报告，并用脚本检查草稿与图注。这些是比“让 AI 随便写一段”更具体的可交给 AI 的工作。
- 任务匹配：原文给出按论文类型路由（方法改进、新能力、规模规律、再检验、机理分析、理论、数据集、测量）；同一 `SKILL.md` 格式支持 Claude Code、Codex、Claude.ai/Cowork；输入可选填表或摘要，输出可选 Markdown 或 LaTeX；配图另有规划表和模板。协作方式是人类接受/拒绝修改对照表并补 `[TODO]`。
- 条件供给：需要提供研究信息表或完整摘要；填表至少 5 个必填项，推荐 8 项，越详细越好；方法与实验部分可补符号、组件、目标、数据集、指标、对比方法、结果表、消融、`refs.bib` 等。工具条件包括 git、Python 3、Claude Code/Codex 或 Claude.ai/Cowork、可选 CVPR LaTeX 模板；反馈条件是作者对缺项追问的回答和对生成稿的核验。
- 主动推进：原文只描述用户发起后的工作流（填表/贴摘要→补全缺项→判断类型→起草→自检→产出），没有给出由时间、事件或状态触发并持续完成的机制；不能据此认为它能自动推进。
- 效果验证：原文提供 `check_draft.py`、`check_figures.py`、`style_metrics.py`、`evals/` 留出测试集与盲评标准，并称检查器会对照语料统计抓 AI 腔、破折号、警句和凭空数字，检查图注长度、首句、引用、矢量图与占位图。这些可作为验证工具，但原文没有给出实际评测结果。

## 与已有做法的关系
清单中有 `Claude Code`（tool，adopt）。该技能可直接安装为 Claude Code 的 skill（`./install.sh claude` 到 `~/.claude/skills/`），是已采用工具的领域技能扩展，不替代 Claude Code；同一技能也支持 Codex 和 Claude.ai/Cowork。清单中没有其他直接相关条目。

## 证据与局限
原文是仓库 README，不是完整技能文件、规则库或评测报告。它给出的主要证据是作者自述：语料为 2021–2025 年 CVPR 22 篇、ICCV 12 篇、NeurIPS 26 篇，共 60 篇；类型分布为方法改进 26、新能力 7、数据集 6、测量 5、机理分析 5、理论 4、规模规律 4、再检验 3；风格规则由其中 55 篇拟合，5 篇 2024 年论文留出测试；配图统计来自 44 篇获奖论文。README 还给出通用 AI 草稿与获奖论文的对比（句尾分词短语约 32% 对约 8%，开头、缺口、组件、局限写法不同），但没有在给定材料中展示原始统计表、盲评结果或独立复现。仓库声明不含论文 PDF 或全文，示例短句仅作教学引用。适用条件偏 CV/ML 英文论文写作；README 自己也邀请补充 NLP、机器人、系统等领域语料。安装脚本和检查器未在本次材料中实际运行，效果需小范围验证。

## 怎么试、怎么验证
最小试用：选 1 篇已有完整摘要、结果表和消融的实验论文，先安装 Claude Code 技能；用填表方式提供 5 个必填项和尽量多的推荐项，按上面的提示词生成 Title、Abstract、Introduction、Methods、Experiments；再对同一篇论文用同一模型直接写一版作为对照；运行 `check_draft.py` 和 `check_figures.py`，并按仓库 `evals/` 的盲评标准请 2 位同领域同事盲评。判断改善的指标：人工修改时间是否下降；事实错误、凭空数字和 `[TODO]` 数量是否不增加；检查器报告的 AI 腔、破折号、堆砌警句、图注问题是否减少；修改对照表的接受率；主张-证据表是否完整、消融是否与主张一一对应；盲评是否不差于直接 AI 草稿。若这些指标没有改善，或人工核验成本高于直接写作，就只保留其检查清单和写作规则，不把完整流程纳入常规。
