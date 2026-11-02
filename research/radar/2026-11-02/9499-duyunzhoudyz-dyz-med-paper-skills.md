# duyunzhoudyz/dyz-med-paper-skills

- 结论：**值得一试**。建议小范围试用：在单个论文项目里按 README 安装 32 个技能，先用 dyz-med-orchestrator 做任务分诊，再完成一项有明确输入输出的写作或修回任务。理由是它给出了可复制的安装、目录、调用和检查步骤，但仍是公开测试版，真实写作效果和医学质量尚未完成独立评估。
- 原文：https://github.com/duyunzhoudyz/dyz-med-paper-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T06:51:36.386Z

## 是什么
DYZ MedPaper 是一套面向中国医生与医学研究生的医学论文写作与科研 Agent Skills。仓库声明包含 32 个技能，覆盖选题、PubMed 检索、中英写作、统计结果解读、翻译、选刊、审稿修回、稿件诊断等；以 Agent Skills 的 SKILL.md 目录形式组织，可安装到 Claude Code、Codex 或其他支持 Agent Skills 的智能体。它强调用中文沟通，把导师意见和审稿要求落实到段落与修改清单，并可用论文项目记录接续工作。仓库目前为公开测试版，README 明确说整篇论文不会在一次调用后自动完成。

## 具体做法
1. 前提：准备支持 Agent Skills 的智能体（如 Claude Code 或 Codex）、Python 3.10+、一个独立论文项目文件夹，以及合成材料或已脱敏、获准处理的研究材料。按所在机构要求处理数据，不提交可识别患者信息、医院凭据或未获准材料。注意：本地脚本运行不代表整个 AI 会话离线，模型服务可能接收会话中提供的内容。
2. 获取仓库：下载 ZIP 解压后在该目录打开终端，或执行：
```bash
git clone https://github.com/duyunzhoudyz/dyz-med-paper-skills.git
cd dyz-med-paper-skills
```
3. 选择安装范围：个人级或项目级。Claude Code 个人级目录为 ~/.claude/skills/，项目级为 .claude/skills/；Codex 个人级为 ~/.agents/skills/，项目级为 .agents/skills/。同一宿主的个人级与项目级安装二选一，避免同名重复条目。
4. Claude Code 个人级安装并自检：
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
安装器默认复制全部 32 个技能及许可文件，成功后显示 PASS、技能数和安装路径；安装器不联网，不安装模型或 R/Python 包，不修改宿主设置、账号或其他技能；同名技能内容有差异时会停止。Windows 可先运行 python --version，如使用 py -3，将后续 python 替换为 py -3；路径含空格时保留引号。
5. 打开论文项目并显式调用编排技能。Claude Code 使用 /dyz-med-orchestrator，Codex 使用 $dyz-med-orchestrator；其他智能体按其技能调用方式操作。可先发：
```text
请使用 dyz-med-orchestrator，看看这个文件夹里的论文材料，告诉我现在最该解决什么，先帮我把这一步做好。需要补充的材料列出来。
```
先看它对任务的理解和材料缺口，再继续写作或修改。
6. 选一个眼前任务并给足输入。例如材料齐备时可以交代：
```text
这是我的结果表、几篇已经核实的文献和讨论初稿。帮我把讨论重写一版：先说清主要发现，再和已有研究比较，最后写临床意义和局限。缺依据的地方单列，用中文告诉我为什么这样改。
```
要求输出至少包括：讨论草稿、结果与文献对应说明、修改理由、还需补充的问题。不要期望一次调用自动完成整篇论文。
7. 需要文献检索、统计、Word 导出时，先确认权限与工具条件：内置在线检索工具目前只覆盖 PubMed，知网等中文来源需相应权限；正式统计需相应软件并先确认分析方案；Word 导出适合基础审阅稿，复杂排版、公式和修订痕迹需另用工具处理。
8. 升级与维护：在新版本源码目录运行安装器，相同内容会跳过；有差异时指定一个尚不存在、位于源码与安装目录之外的备份目录：
```bash
python scripts/install_codex.py --upgrade --backup "/path/to/new-backup"
python scripts/install_codex.py --check
```
Claude Code 或自定义目录的升级与自检要继续带原来的 --target；Codex 项目级安装继续带相同的 --project。手动安装时，将全部 32 个 dyz-med-* 目录完整复制到宿主对应的技能目录，并放入 LICENSE、NOTICE、COMMERCIAL-LICENSE.md；模板与脚本也要复制，不能只复制 SKILL.md 或把整个仓库作为单个技能安装。卸载前备份自己的改动，然后仅删除本项目的 32 个技能目录，论文材料另存在项目目录中。

## 对应的研究问题
1. 能力发现：README 明确列出可承接的任务类别，包括选题可行性、PubMed 检索方案与文献梳理、统计结果解读与图表/结果段落、引言/讨论写作、导师意见诊断与改写、审稿意见逐条回复、选刊与投稿材料。仓库称有 32 个技能，但输入只包含 README，完整技能索引未展开，因此能确认这些任务类别，不能确认每个技能的具体质量。
2. 任务匹配：按宿主分 Claude Code、Codex、其他支持 Agent Skills 的智能体；按范围分个人级/项目级；用编排技能做任务分诊，再进入具体技能。本地安装器只负责复制文件与检查，不安装模型或包；文献检索、统计、文件读取、Word 导出各自需要工具和权限。适合把论文工作拆成可分别交代的任务，而不是一次生成整篇。
3. 条件供给：需要给智能体可读的论文项目文件夹、结果表、已核实文献、讨论初稿、导师意见、审稿意见、学校/期刊要求、预算和时间、单位认可范围等；需要网络和数据库权限、统计软件、文件读取工具、Word/PDF/Excel 工具；需要明确授权和人工审阅。README 还要求不提交可识别患者信息、医院凭据或未获准材料。
4. 主动推进：有“工作被打断，下次有记录可接”的项目记录思路；可以明确交代一组连续任务，让助手在授权范围内接着做。但 README 没有给出时间、事件触发或定时自动运行的机制，主要是按当前瓶颈和项目状态继续。因此只能算状态接续，不是自动调度。
5. 效果验证：安装自检可确认文件一致并显示 PASS、技能数和路径；但 --check 的环境探测只检查 Codex、Rscript、PyYAML 是否能被发现，不探测 Claude Code 或其他宿主，也不验证账号、网络、包版本或文档工具。实际技能是否加载要在所用智能体中核实，可要求助手说明本轮实际读取了哪个 SKILL.md。README 明确说真实连续写作效果、各智能体实际表现、医学内容独立质量评估尚未全部完成；教学示例是合成的，不是用户反馈或已发表论文。因此效果验证需要使用者自己设任务验收。

## 与已有做法的关系
清单中有 Claude Code（adopt）和 Agent skills（adopt）。本仓库是 Agent Skills 规范下的具体技能库，并给出 Claude Code/Codex 的安装目录、显式调用方式和检查命令；它依赖这些宿主提供技能发现、工具权限与调用入口。清单中没有其他与本仓库直接对应的条目。

## 证据与局限
证据：README 给出 32 个技能、安装/自检命令、个人级/项目级目录、显式调用方式、升级/备份/手动安装说明，以及四个合成教学示例（论证地图、拒稿诊断、中译英、审稿回复）。输入指标显示 32 stars，只能说明有一定关注，不能证明效果。
局限：公开测试版；真实使用中的连续写作效果、各智能体表现、医学内容独立质量评估未全部完成；示例不是医生反馈或已发表论文；在线检索只覆盖 PubMed，中文数据库需权限；统计需软件和确认方案；Word 导出适合基础审阅稿；安装自检不等于技能已加载，也不等于结论成立或论文可发表。许可为 PolyForm Noncommercial License 1.0.0，商业使用需单独书面授权。适用条件：医学论文写作场景、能提供脱敏材料、有人工审阅、接受公开测试版风险。

## 怎么试、怎么验证
最小试用：选一个论文项目，优先项目级安装，准备合成或已脱敏材料；运行 --check，确认 PASS、32 个技能和安装路径；在宿主中显式调用 /dyz-med-orchestrator 或 $dyz-med-orchestrator，要求助手说明本轮实际读取了哪个 SKILL.md；然后只做一个边界清晰的任务，例如按给定结果表、已核实文献和讨论初稿重写讨论，要求输出草稿、结果-文献对应、修改理由、待补材料。
判断改善的指标（建议记录，不是原文数据）：
- 安装与加载：--check 是否 PASS；助手能否指出实际读取的 SKILL.md；调用是否按宿主方式生效。
- 任务完成质量：输出是否包含要求的四类内容；重要说法能否回到给定结果或文献；缺依据处是否单列；修改理由是否具体到段落/问题。
- 人工复核成本：数字、术语、结论分寸是否被逐项核对；医学判断是否由人确认；是否出现未授权材料或可识别患者信息。
- 流程改善：与当前做法相比，是否更早暴露材料缺口、修改顺序是否更清楚、导师/审稿意见逐条覆盖是否更容易追踪、下次能否凭项目记录接续。可记录首次可用草稿时间、待补材料数量、未解决意见数量等自定指标。
- 停止条件：技能未实际加载、输出无法追溯依据、需要越权访问数据、或无人做医学审阅时，不应继续采用。
