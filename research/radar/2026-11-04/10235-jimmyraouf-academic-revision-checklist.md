# JimmyRaoUF/academic-revision-checklist

- 结论：**值得一试**。建议先在英文学术写作的小范围修订中试用：按 README 安装 Claude skill 或粘贴清单，先跑脚本列出候选，再由人按 16 条清单和 workflow 逐句核对，研究问题、引文、数字和反思不交给 AI。理由是它给出了可复制的安装、脚本命令和逐句检查流程，但可见材料只有 README，缺少完整规则、提示词和效果数据，暂不宜直接 adopt。
- 原文：https://github.com/JimmyRaoUF/academic-revision-checklist
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-04T12:22:34.485Z

## 是什么

这个仓库把英文学术写作的修改经验整理成一套可执行的“读者优先”检查流程：16 条快速清单、66 条规则，一个“一个案例，一条规则，查全文”的方法，以及一个列出可疑候选的 Python 脚本；也可作为 Claude Code 或 Claude 自定义 skill 使用。作者明确说，“AI 痕迹”指第一次读就卡住、要回头再读的地方，不是用来绕过 AI 检测器。内容来自作者英文博士论文五周、60 多轮修改记录，规则中文、例子英文。

本次材料只有 README，未包含完整的 checklist.md、patterns.md、workflow.md、reading-protocols.md、lessons.md 和脚本源码，因此只能确认其结构、用法和 16 条快速清单，不能核验 66 条细则与脚本实现。

## 具体做法

1. 先当清单读。前提是拿到仓库文件。从 references/checklist.md 开始；想知道某条规则为什么改、怎么改，就看 references/patterns.md 里同一编号。

2. 装成 Claude Code 的 skill。前提是已使用 Claude Code。

```bash
git clone https://github.com/JimmyRaoUF/academic-revision-checklist.git ~/.claude/skills/academic-revision-checklist
```

然后在 Claude Code 里说“用 academic-revision-checklist 检查 chapter3.tex”，或输入 `/academic-revision-checklist`。只想在一个项目里用，就放到该项目的 `.claude/skills/` 下面。

3. 在 Claude 网页版或桌面版里用。把整个文件夹打包成 zip，作为自定义 skill 上传；文件夹名要和 skill 名一致。从 GitHub 点 Download ZIP 得到的文件夹叫 `academic-revision-checklist-main`，要先改回 `academic-revision-checklist` 再打包。也可以只把 `checklist.md` 和需要的 `patterns.md` 章节贴进对话。

4. 在 ChatGPT、Gemini 等其他模型里用。把 `references/checklist.md` 贴进去，再用 `references/workflow.md` 里的提示词模板。要求它逐句读、标出读者会停下的句子，不要让它整段重写；它给的每一条意见，都先拿原文和数据核对。

5. 跑候选脚本。前提是安装 Python 3，不用装其他包。

```bash
python3 scripts/flag_candidates.py chapter3.tex --summary
python3 scripts/flag_candidates.py chapter3.tex chapter4.tex --md flags.md
python3 scripts/flag_candidates.py paper.md --max-para 150
```

脚本能读 `.tex`、`.md` 和 `.txt`，会跳过表格、图、公式和注释；它负责把可疑处列全，判断仍要靠人读。

6. 改完一段，逐条问 16 条快速清单：

- 第一次读的人会在这一句停下吗？要读两遍的，写下原因。
- 一句话只报一个结果。
- 写了 more、higher，就写出和谁比。
- significant 只用在差异、关联或检验上，不用在比例或平均数上。
- this、these、the former、the name 这类词，指的东西在前一句之内吗？
- 一个名字只指一样东西，普通词别撞上自己定义的术语。
- 冒号只用来引出列表、引文、问题或定义。
- 少用先否定再肯定的铺垫，带内容的否定留下。
- 正文不用破折号连接分句。
- 连着几句长度差不多、开头一样的，改掉一处。
- 空的过渡词和段尾总结，能删就删，删不掉就换成具体内容。
- 用自己和这个领域会用的词，能用常用词就不用生僻词。
- 论文只写研究本身，不写论文是怎么改出来的。
- 研究问题、引文、数字、自己的反思，不交给 AI 改。
- 改完重读这一段和前一段，字数上限、段落长度这些硬指标再跑一遍。
- 别人和 AI 的意见，先拿原文和数据对过，成立的才改。

7. 每轮单列“不交给 AI 改”的内容：研究问题的措辞、引文原文、没有数据支撑的数字、自己写的反思段落；只报告，不改。

8. 修改后做回归检查：重读当前段和前一段；重新跑字数上限、段落长度等硬指标；对 AI 或他人意见逐条用原文和数据核对，不成立就不改。

## 对应的研究问题

- 能力发现：材料显示 AI 可被用于学术文本的逐句检查，标出“第一次读会停”的句子；本地脚本可先列出破折号、冒号、对比句式、缩写等候选，再由人判断。未证明可用于其他类型工作。
- 任务匹配：Claude Code 通过 skill 调用；Claude 网页版/桌面版通过上传 zip 自定义 skill；ChatGPT、Gemini 等通过粘贴清单加 workflow 提示词；候选扫描用本地 Python 脚本；最终判断和受保护内容由人负责。材料没有不同模型间的效果比较。
- 条件供给：需要提供清单与规则、原文文件、明确“逐句读、标出停顿句、不要整段重写”的指令、用于核对的原文和数据、受保护段落清单；Claude Code 需要本地文件权限，网页版需要上传 skill 或粘贴文本，脚本需要 Python 3。反馈方式是重读前一段、重跑硬指标、逐条核对意见。
- 主动推进：材料只支持手动调用 skill 和手动/批量运行脚本，可对多个文件生成候选清单；没有时间、事件或状态触发，也没有持续自动完成的机制。
- 效果验证：以“第一次读是否停下、是否需要读两遍”为核心判断，并要求写下原因；脚本列候选、人读后判定；作者举例说缩写检查标出 13 处，真有问题的只有 3 处。材料没有给出修改前后量化对比。

## 与已有做法的关系

清单中有 Claude Code，状态为 adopt。这个仓库可直接作为 Claude Code skill 安装到 `~/.claude/skills/academic-revision-checklist`，并在 Claude Code 中调用；它是在 Claude Code 之上增加学术写作检查清单、脚本和人工核对约束。清单中没有其他相关条目。

## 证据与局限

原文给出的证据主要是作者经验：英文博士论文五周、60 多轮修改；66 条规则和 16 条快速清单；仓库包含清单、模式说明、工作流、阅读协议、教训和候选脚本；作者举例说缩写检查标出 13 处、真正有问题 3 处。这些都是作者主张或单一个案，没有对照实验、没有错误率下降或节省时间的量化数据。

局限也很明显：本次只拿到 README，无法核验 66 条规则的具体内容、workflow 提示词模板、patterns 例子和脚本实现；适用对象是英文学术写作，尤其是作者所在的人机交互方向，规则中文、例子英文；脚本明确只列候选，误报需要人读判断，作者自己的例子就显示候选多、真问题少；“AI 痕迹”不是检测器指标，不能用于规避检测；研究问题、引文、无数据支撑数字和反思段落不能交给 AI 改。

## 怎么试、怎么验证

最小试用：选一个英文学术章节或一节，先记录基线；把研究问题、引文、无数据支撑数字、反思段落单列保护；运行脚本保存候选清单；用 16 条快速清单或 Claude skill 逐句检查，要求只标出读者可能停下的句子并说明原因，不允许整段重写；由作者逐条接受或拒绝，拒绝时记录原因；改完重读当前段和前一段，并重跑字数与段落长度检查。

判断指标：同一节在试用前后由第一次读的人标出的“停下/读两遍”句子数量是否下降；脚本候选中的真问题比例是否可接受；被采纳的修改是否都能对应到某条规则；被拒绝的 AI 意见是否多因与原文或数据不符；受保护内容是否保持零改动；字数上限和段落长度是否仍合规；每节修改耗时是否可接受。由于原文没有给出量化基线，这些指标应在本单位或本人文本上先做小样本对照，再决定是否扩大使用。
