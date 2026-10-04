# heise3/academic-deai

- 结论：**值得一试**。建议小范围试：按仓库给出的路径把 academic-deai 装成 Agent Skill，用它的自然语言提示词做论文润色／翻译／结构修订，再用 content_lock.py 做命题级核对；理由是安装、提示词、验证命令都可直接照抄，但效果证据只有作者自制的合成案例，且作者自述没有盲评、模型间对照或检测器分数。
- 原文：https://github.com/heise3/academic-deai
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-04T10:46:39.819Z

## 是什么

Academic DeAI 是一个「模型中立」的 Agent Skill（v3.1.0，MIT 开源），用于中英文术编辑：减少空泛开头、重复收尾、机械段落等模板化文风，同时核对并保留事实、数字、引文、术语、证据强度与作者语气。可用于论文校对、语言润色、学术翻译和授权范围内的结构修订。

Skill 本身只提供文本规则，由所选模型执行，不绑定模型厂商、版本或 API。README 声称支持 Codex、Claude Code、Cursor、Gemini CLI、OpenCode 等能加载 Agent Skills 的平台；但作者说明格式兼容性按官方文档核对，实际编辑验证只在本地 Codex 会话中完成。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：你的平台需支持 Agent Skills，或至少能加载编辑指令与相关资源。仅能读取文本指令的平台必须同时提供 references/ 等参考文件，不能假定具备脚本或文件编辑能力。

1. 确认平台支持与安装位置。README 给出的路径示例：

| 平台 | 完整 Skill 的安装位置示例 |
|---|---|
| Codex | `~/.agents/skills/academic-deai/` |
| Claude Code | `~/.claude/skills/academic-deai/` |
| Cursor | `.cursor/skills/academic-deai/` |
| Gemini CLI | `.gemini/skills/academic-deai/` |
| OpenCode | `.opencode/skills/academic-deai/` |

2. 安装（README 给的 Codex 新安装示例，目标目录尚不存在时使用）。复制完整文件夹，保持 `SKILL.md`、`references/` 和可选 `scripts/` 的相对位置：

```sh
git clone https://github.com/heise3/academic-deai.git
mkdir -p ~/.agents/skills
cp -R academic-deai ~/.agents/skills/academic-deai
```

3. 升级时先备份已有目录，再整体替换，避免合并遗留文件（README 明确提示）。

4. 调用 Skill。显式语法各平台不同；已加载时先用自然语言指定任务。可直接复制的中文提示词：

```text
用 Academic DeAI 润色下面的中文讨论部分。
减少模板化表达，保留数字、引文、术语和证据强度。
不要添加新事实，只返回修改后的正文。
```

英文翻译场景提示词：

```text
Use Academic DeAI to translate this manuscript into English.
Use the terminology list and my writing sample below.
Preserve substantive claims, citations, section structure, and the requested minimum length.
Return only the revised text.
```

Codex 可显式使用 `$academic-deai`；其他平台按其 Skill 加载与调用方式执行。校对、语言润色、翻译和结构修订的修改深度由用户指定。

5. 按 README 的编辑规则执行，规则本身可当作验收清单：

- 先看段落功能和证据连接，再处理孤立词语。
- 套话和重复结构需要结合上下文判断。
- 真实比较、负结果、必要总结、合理被动语态和规范术语可以保留。
- 作者样本只用来指导表达习惯，不提供新稿的事实或观点。
- 按任务加载参考和核查工具，不强制固定轮次或额外报告。
- 比较改变的命题：主体、对象、方向、时间、条件和引文支持位置。

6. 可选文本核查工具（需 Python 3.10+ 与标准库）：

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate_package.py .
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
python3 scripts/content_lock.py original.md revised.md --strict
```

7. 抽取格式的前提：PDF 文本抽取还需 Poppler `pdftotext`；DOCX 正文抽取不能保留所有样式、批注、修订记录、脚注或文本框，可编辑 Word 交付需要相应文档工具。

8. README 明确说明：无需安装 Humanizer，也不自动串联其他编辑器；结构编辑思路参考 Humanizer 3.1.0。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- 能力发现：把「去模板化」与「证据/引文/命题核对」放在同一次改写里完成，这是较少被主动交给 AI 的组合；README 还把「提取并核对原稿命题」单独做过一轮（41 条命题），可视为一个可复用的任务形态。
- 任务匹配：作者主张模型中立，由所选模型执行文本规则，不绑定厂商/版本/API；但同时也说明格式兼容与各模型编辑效果分别记录，实际编辑验证只在本地 Codex 会话完成——即任务与模型的匹配需要自己按平台试。作者样本用于指导表达习惯，属于「提供风格参照」的匹配手段。
- 条件供给：需要提供术语表、作者写作样本、references/ 参考；平台需能加载完整 Skill 文件夹并保持 `SKILL.md`、`references/`、可选 `scripts/` 相对位置；仅文本平台需同时提供参考；PDF 需 `pdftotext`。
- 主动推进：原文没有给出时间、事件或状态触发的机制或流程，只提到「按任务加载参考和核查工具，不强制固定轮次或额外报告」。此条没有可照做的依据。
- 效果验证：给出 `validate_package.py`、`unittest`、`content_lock.py --strict` 三类检查，并做过命题核对（发现「未下降」被强化为「保持不变」并针对性修正）。但作者同时声明这些检查各自只证明其覆盖范围，不能证明所有含义不变或检测器分数。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- Agent skills（adopt）：本仓库正是 Agent Skill 形态的一个具体实例，可直接纳入「skill 怎么装、怎么写提示词、怎么验证」的做法库。
- Claude Code（adopt）、Cursor（watch）、OpenCode（watch）：README 给出这三者的 Skill 安装路径示例，是把 skill 落地到这些平台的一个可抄配置；但非 Codex 平台的具体安装与调用细节在 `docs/agent-platforms.md`，本次输入未包含该文件，无法核对。
- 仓库提到的结构编辑思路来源 Humanizer 3.1.0：清单中没有相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- 案例：四组完整案例（中文研究短文、English abstract and discussion、技术综述、审稿回复），含完整前后文本与编辑说明。但这些是「刻意加入模板化表达的合成演示」，研究、数据、引文编号、投稿改动均为虚构。
- 数据：四例使用 3.0.0 执行，3.1.0 保留原稿与修订稿、更新展示与平台说明；两个编辑回合读取 Skill 后修订，另一个模型回合提取并核对 41 条原稿命题。
- 作者自述的局限（重要）：没有独立人工盲评、模型间对照或检测器分数；案例「展示本次修改，不证明一般写作质量提升或其他工具的排名」。验证工具也只证明其覆盖范围。
- 属于作者主张而非实测的部分：模型中立、跨平台可用、效果随模型不同等；非 Codex 平台的兼容性按官方文档核对，实际编辑只在 Codex 本地会话验证。
- 适用条件：需要支持 Agent Skills 的平台或能加载完整参考文本的环境；DOCX 交付能力受限；PDF 需额外安装 Poppler。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用方式：

1. 用一段自己真实的中文讨论段落（含数字、引文编号、置信区间或不确定性表述），先另存为 `original.md`。
2. 按上面第 2 步装好 Skill，用中文提示词跑一轮，输出另存为 `revised.md`。
3. 运行 `python3 scripts/content_lock.py original.md revised.md --strict`，人工逐条核对被标记的命题差异（主体、对象、方向、时间、条件、引文支持位置）。
4. 有条件时做一次不使用 Skill 的同提示词对照，以及一次人工盲评（原文未提供这两类数据，需自建）。

判断有没有改善的指标：

- 模板化表达减少：空泛开头、重复收尾、机械段落的数量是否下降（可人工计数或标注）。
- 事实与证据不变：数字、引文编号、置信区间、不确定性表述、术语是否原样保留；`content_lock.py --strict` 是否无未解释的命题变化。
- 无新造事实：是否出现原稿没有的事实或观点（提示词已要求「不要添加新事实」，可作为核对项）。
- 作者声音保留：与作者样本/术语表的一致性是否提高。
- 交付质量：修订稿是否仍满足章节结构、篇幅下限等硬性要求（对应英文提示词中的 section structure / minimum length）。

注意：以上指标需自行建立基线，因为原文没有提供盲评、模型对照或检测器分数。
