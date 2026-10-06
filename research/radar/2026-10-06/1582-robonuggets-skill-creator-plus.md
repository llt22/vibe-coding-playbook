# robonuggets/skill-creator-plus

- 结论：**值得一试**。建议小范围试：按 README 的安装命令把它装进 Claude Code 的 skills 目录，先对现有技能跑 validate_skill.py --all 拿到基线，再按审计报告改 2–3 条并复跑对比，理由是它给了可直接执行的命令和 46 条可逐条勾选的规则，能把“技能写得好不好”变成可复核的检查项；但材料只有 README、规则和模型相关论断均为作者主张，先验证再决定是否纳入手册。
- 原文：https://github.com/robonuggets/skill-creator-plus
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T11:42:50.544Z

## 是什么

skill-creator-plus 是一个免费的 Claude「技能（skill）」审计/构建/改进工具，作者 RoboNuggets，MIT 许可，仓库 31 stars。用法是把它指向一个技能（或整个技能文件夹），它先输出 findings report：每条规则标 pass / fail / not applicable，附文件与行号的证据，以及建议的修法；在你指定要应用哪些修复之前，它不动任何文件。

仓库自述共 46 条规则，按检查方式分三类：**Script**（validator 脚本判定）、**Script + read**（脚本标出候选，Claude 在上下文中确认）、**Read**（Claude 审计时判断并引用证据），另有少量标为 **Advice**（来自实践而非 Anthropic 文档）。规则分族：FM/DS（frontmatter 与 description）、ST（结构与渐进披露）、CT（内容质量）、WF（工作流）、SC（脚本）、NM（适配新模型）、HK（hook）、TS（测试与评估）、LB（库级冲突）。

盒子里的内容（README 文件清单）：`SKILL.md`、`references/audit-checklist.md`（每条规则的 why、怎么查、报告格式）、`references/authoring-guide.md`、`references/testing.md`、`scripts/validate_skill.py`（validator）、`scripts/init_skill.py`（脚手架）、`examples/`（故意写坏的样例技能及其 validator 输出与审计报告）。

## 具体做法

前提：Claude Code 环境（有 `~/.claude/skills` 或项目内 `.claude/skills`），或 claude.ai 账号（validator 需要打开代码执行）；本地需 Python 3.8 或更新版本，validator 只用标准库，Windows/Mac/Linux 均可。

1. 安装到 Claude Code（对所有项目生效）。文件夹名必须是 `skill-creator-plus`：

```bash
git clone https://github.com/robonuggets/skill-creator-plus ~/.claude/skills/skill-creator-plus
```

2. 或只对单个项目生效（在项目目录下执行）：

```bash
git clone https://github.com/robonuggets/skill-creator-plus .claude/skills/skill-creator-plus
```

Windows 上 `~/.claude` 就是用户目录下的 `.claude` 文件夹；从 GitHub 下载 ZIP 解压后复制进去也可以。

3. 要在 claude.ai 上用：把 `SKILL.md`、`references/`、`scripts/`、`LICENSE` 打成 zip（`examples/` 可以不放），在 claude.ai 设置的 Skills 里上传；frontmatter 只使用 claude.ai 接受的字段；validator 需要开启代码执行。

4. 用自然语言触发，三种模式：

| 模式 | 说类似这样的话 | 得到什么 |
|---|---|---|
| AUDIT | “Audit my deploy skill against Anthropic's rules.” / “Check every skill in ~/.claude/skills and tell me what to fix first.” | 一张报告：每规则一行，失败优先，修复项排好序。你挑选之前不编辑任何文件。 |
| NEW | “Make this a skill, we write release notes like this every Friday.” | 先给测试提示，然后生成一个能通过 validator 的新技能文件夹。 |
| REFINE | “The report skill keeps forgetting the date filter. Fix the skill.” | 规则围绕它的理由重写，通常比原来更短。 |

“Improve my skill for Opus 5.5” 会先跑 AUDIT，再按你批准的修复跑 REFINE。

5. 先拿机械检查的基线，再动手改：

```bash
python3 scripts/validate_skill.py path/to/my-skill              # 一个技能
python3 scripts/validate_skill.py --all ~/.claude/skills         # 文件夹里所有技能，输出一张表
python3 scripts/validate_skill.py path/to/my-skill --json       # 机器可读
python3 scripts/validate_skill.py path/to/my-skill --ban-em-dash # 额外标记破折号
```

退出码：`0` 无 error（warning 和 note 可以存在）、`1` 发现 error、`2` 跑不起来。每条 finding 带一个规则 ID。`--all` 的汇总表形如：

```text
Skill       Errors  Warnings  Notes  Rules with errors or warnings
----------  ------  --------  -----  -------------------------
pdf-helper       8        11      6  FM1 FM2 ST4 ST5
```

6. 新建技能时先出骨架：

```bash
python3 scripts/init_skill.py my-new-skill --path ~/.claude/skills --refs --scripts
```

7. 按报告逐条修：先清 error 再管 warning（README 示例结尾即 “fix the errors first”）；每条修复都能定位到文件与行号。

8. 把「每次运行都必须成立」的规则从正文挪进 hook（frontmatter 的 `hooks:`），因为正文可能被跳过或被 compaction 截断（规则 HK1）。相应地把最重要的指令放在 `SKILL.md` 最靠前的位置——Claude Code 的 compaction 只保留前 5,000 tokens（规则 ST2）。

9. 验证环节要显式写出来，并优先让一个全新上下文的 Claude 当 checker，而不是让模型自审（规则 NM5）；不要要求模型在回复里写出推理过程，改要答案或对答案的简短解释（NM2）。

10. 可从规则表直接照做的几条硬指标（原文列出，可原样当检查项）：description 用第三人称、不超过 1,024 字符、不含 XML 标签（DS1–DS2）；`SKILL.md` 正文少于 500 行（ST1）；引用文件只从 `SKILL.md` 往下一层（ST4）；超过 100 行的引用文件前 50 行内要有内容清单（ST5）；路径统一用正斜杠（ST7）；不写时效性信息（CT3）；不留 `TODO`/`FIXME`/空占位（CT9）；复杂任务用带 done when 行和回退行的清单（WF1）；至少 3 个评估、先建评估并留基线（TS1）。

## 对应的研究问题

1. **能力发现**：把「审自己的技能、写新技能、重写坏规则」这类元工作交给 AI——这是多数人不会想到交给模型的活。材料给出的三种模式（AUDIT/NEW/REFINE）就是可交付的元任务清单。
2. **任务匹配**：README 明确区分了检查分工——机械规则交给脚本（Script），需要上下文判断的交给 Claude（Read），两者结合的先由脚本标候选再由 Claude 确认（Script + read）；验证环节偏好全新上下文模型而非自审（NM5）。这是原文给出的、可直接照搬的「什么样的活给脚本、什么样的活给模型」的分工。
3. **条件供给**：需要模型能读到技能目录内容、能写文件（但只有在用户逐条批准后才写）、claude.ai 上需要代码执行权限、本地需要 Python 3.8+；规则的依据是 Anthropic 的官方文档页面（README 末尾给出逐条锚点链接）。
4. **主动推进**：这一条覆盖很弱。沾边的只有 HK1（必须每次成立的规则放进 hook，由 hook 触发）和 LB2（用 `/skill-doctor` 找出未使用的技能并关掉）。技能本身是用户手动触发的，README 没有给出按时间、事件或状态持续执行的机制。
5. **效果验证**：TS1（先建至少 3 个评估并留基线）、TS2（用全新 Claude 在真实工作上跑、技能开与关对比）、TS3（在它实际运行的模型上测），加上 validator 的退出码和逐规则 pass/fail 表——这是原文里最实的验证手段：error 数、退出码是可复核的客观量，A/B 结果是效果量。

## 与已有做法的关系

清单中只有 **Claude Code（adopt）** 直接相关：本条目就是一个安装在 Claude Code skills 目录里的技能，用法（`git clone` 到 `~/.claude/skills`、在会话里用自然语言触发）完全依附于 Claude Code，属于对已有做法的补强而非替代——它补的是「技能本身质量」这块，现有条目里没有对应的检查环节。

**Cline（watch）**、**PRAW（try）** 与本条目无直接关系。

## 证据与局限

- 依据仅为仓库 README（给出的 text 就是 README 内容），**没有源码、没有 `references/` 与 `examples/` 的正文**，因此无法核实 validator 的实现是否真与 46 条规则一致，也无法核实审计报告的实际形态。
- 材料给出的可核对事实：46 条规则及其检查方式/来源标注；validator 的 5 条命令与退出码 0/1/2；样例技能 `examples/pdf-helper` 的真实输出片段（8 errors、11 warnings、6 notes，含 FM1/ST4/ST5/DS2/NM2/HK1 六条示例）；`--all` 的汇总表格式；仓库文件清单；MIT 许可；31 stars；失败模式命名来自 Matt Pocock 的 writing-great-skills，与 Anthropic 无隶属关系。
- **只是作者主张**的部分：关于新模型（README 写作 Fable 5、Opus 5.5、Sonnet 5.5）的 NM1–NM5——旧模型技能“过于指令化、反而降低输出质量”需要测后再删、写出推理会被 reasoning_extraction 拒答、给理由而非只给请求、显式验证、全新 Claude 做 checker；以及「Claude Code compaction 只保留前 5,000 tokens」「规则于 2026-10-05 对照 Anthropic 页面检查」。这些在材料里只有论断和指向官方文档的链接，没有可交叉验证的细节，且提到的模型名在本材料之外无法确认。
- 适用条件：Claude 生态（Claude Code / claude.ai），对象是 `SKILL.md` 形态的「技能」工件；其它 agent 框架、或不用技能的普通对话任务不适用。
- 结论强度受限：只有规则、命令和一份样例输出可见，效果证据来自作者自己的样例，没有第三方评测。因此给 try 而不是 adopt。

## 怎么试、怎么验证

最小试用（半天以内）：

1. 挑 1–2 个你已经在用的 Claude 技能，按上文第 1 步安装到 `~/.claude/skills/skill-creator-plus`。
2. 跑基线并保存输出：

```bash
python3 scripts/validate_skill.py --all ~/.claude/skills
python3 scripts/validate_skill.py path/to/my-skill --json > baseline.json
```

3. 只对其中一个技能说 “Audit my skill at path/to/my-skill against Anthropic's rules.”，从排序最靠前的修复里挑 2–3 条改，改完复跑同一条命令。
4. 另一个技能保持不动作对照。

判断有没有改善的指标：

- **硬指标**：validator 退出码是否从 `1` 变 `0`，该技能的 error 数是否归零、warning 数是否下降（同一命令前后对比）。
- **触发正确率**：description 改成第三人称、写清 what + when 之后，用几个真实请求试它是否被正确触发（这是 DS2/DS3 想解决的“描述永远不触发”问题）。
- **效果 A/B**：同一个真实任务，在两个全新 Claude 会话里分别开着技能和关掉技能跑一遍，看结果是否更稳定、更符合预期（对应 TS2）。
- **体量方向**：REFINE 后 `SKILL.md` 通常更短；如果越改越长，说明改的方向错了。
- **删减要谨慎**：按 NM1，怀疑“为旧模型写得过细”的指令，先测再删，不要一次清空。

触发条件提醒：如果试用中出现 validator 报 `2`（跑不起来），先确认 Python 版本 ≥3.8 且传入的是技能文件夹路径；在 claude.ai 上则先确认代码执行已打开。
