# SnailSploit/Claude-Red

- 结论：**值得一试**。建议小范围试：把 claude-red 当作“领域专家方法论 → 可注入技能包”的可复制模板，照它的安装/加载命令在自己领域复现一次技能加载，再决定是否写进手册；理由是 README 给出了具体可执行的安装与注入命令、以及技能粒度设计，但没给 SKILL.md 撰写模板和任何效果数据。
- 原文：https://github.com/SnailSploit/Claude-Red
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T07:35:36.102Z

## 是什么

claude-red 是一个面向 Claude Skills 系统的进攻性安全技能库。每个技能是一份结构化的 `SKILL.md` 文件，用来把某类攻击面（如 SQL 注入、EDR 规避、ADCS 滥用）的专家方法论预先注入 Claude，使其在该话题下表现得像领域专家。README 称其包含 78 个技能、23 个类别，目标约 130 个技能，采用 MIT 许可。

对调研项目真正有价值的不是这些安全技能本身，而是它演示的一种交付方式：把领域专长拆成细粒度、可单独安装、按对话触发词自动加载的技能文件，从而做到“不用就不占上下文”。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：已有一个 Claude 使用环境（Claude Skills 系统 / Claude Code / Claude.ai 项目），且使用范围合法合规（README 明确限定为授权红队、漏洞赏金、安全研究、CTF 等场景）。

1. 整库安装到 Claude Skills 目录（README 称此为推荐方式）

```bash
git clone https://github.com/SnailSploit/claude-red ~/.claude/skills/claude-red
```

README 说明：Claude 会根据对话触发词自动加载匹配的技能，例如提到 SQL injection 会加载 `offensive-sqli`；未使用的技能不占用上下文。

2. 只安装单个类别（稀疏检出）

```bash
git clone --filter=blob:none --sparse https://github.com/SnailSploit/claude-red
cd claude-red && git sparse-checkout set Skills/web Skills/active-directory
```

3. 使用仓库自带安装脚本

```bash
./install.sh                           # interactive
./install.sh --target ~/.claude/skills # explicit target
./install.sh --category web            # single category
```

4. 在 Claude Code 中把技能当作 system file 注入

```bash
cat Skills/web/offensive-sqli/SKILL.md | claude --system-file -

cat Skills/active-directory/**/SKILL.md | claude --system-file -
```

5. Claude.ai 手动方式：把某份 `SKILL.md` 的内容粘贴进 Project 的 system prompt，或直接前置到对话开头。

6. 迁移到自己的领域（这是把该仓库变成通用做法的关键一步）：按它的目录约定自建 `Skills/<类别>/<技能名>/SKILL.md`，技能粒度保持“单一任务面/单一攻击面”，README 在 Contributing 一节明确说“偏好聚焦的单一表面技能，而非大而全的综述”；frontmatter 标准与技能模板在 CONTRIBUTING.md 中（本次输入未包含该文件内容，需到仓库查看）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- 能力发现：展示了可以把 AI 变成细分领域专家——78 个技能覆盖 23 个类别，甚至包括 `offensive-fast-checking`（快速分诊检查清单）和 `offensive-reporting`（CVSS 打分、证据标准、高管摘要）这类“非攻击本身”的辅助工作。说明容易被忽略的可交给 AI 的工作包括“按专家检查清单逐项排查”和“按规范写报告”。
- 任务匹配：核心是粒度与加载方式匹配——技能按单一任务面切分，按对话触发词按需加载；交付通道有三种（Claude Skills 目录自动加载、Claude Code 的 `--system-file` 注入、Claude.ai 手工粘贴 system prompt），可按环境选择。
- 条件供给：需要提供的是“结构化方法论文件本身”（含技术、工具、边界情况、升级路径，README 原话）以及可写的安装目录（`~/.claude/skills`）或可注入的 system prompt 位；此外 README 通过“授权红队/合法范围”的措辞暗示使用前提是合规授权。
- 主动推进：只有“对话触发词自动加载”这一种事件触发；README 未描述任何按时间、状态或长期运行触发的机制。Roadmap 的分阶段状态（Phase 3/7/8/9 Complete，其余 Planned）是维护者视角，不是使用者的自动化。
- 效果验证：README 没有任何评测数据。只有一句主张式描述“it behaves like a domain specialist”；无法据此判断是否真的改善结果，需自行设计试用对比。

## 与已有做法的关系

清单中的相关条目：`Claude Code`（工具，状态 adopt）——本仓库给出的是向 Claude Code 注入 `SKILL.md` 的具体命令（`claude --system-file -`），可以作为 Claude Code 用法的一个补充做法；`Trendshift`（来源，状态 watch）——该仓库页面上带 Trendshift 徽章，说明它通过 Trendshift 榜单被发现，与本次线索来源一致，但不构成使用方法。除此之外，清单中没有针对“技能包/SKILL.md 交付方式”的条目。

## 证据与局限

原文给出的可核实内容：安装与调用命令、目录与类别结构（23 类别、78 技能）、各类别技能清单与一句话描述、Roadmap 各阶段状态、MIT 许可、致谢（原始检查清单来自 Sahar Shlichov 的 offensive-checklist 集合）。指标方面仅有 stars 7460（来自本次线索的 metrics，不在 README 正文中）。

仅为作者主张、无法从本次材料验证的：技能能让 Claude“像领域专家一样行为”、触发词自动加载的实际命中效果、“不用就不付上下文成本”的收益、78 个技能的覆盖完整度与质量。

本次材料的明显局限：README 只是目录与安装说明，没有任何一份 `SKILL.md` 的实际内容、frontmatter 示例、撰写模板或对照评测结果；因此本报告只能提炼“怎么安装/怎么注入/怎么组织结构”，无法提炼“技能文件内部该怎么写”。另外内容属进攻性安全领域，适用范围受授权条件限制，直接照搬到非授权场景不合适。

## 怎么试、怎么验证

最小试用方式（选一个自己工作里反复出现、依赖成体系方法论的任务，例如代码评审、故障排查、合规检查）：
1. 先不要技能，让 Claude 处理 3–5 个真实任务，记录输出。
2. 按第 6 步自建一份 `SKILL.md`，把任务需要的技术要点、可用工具、常见边界情况、何时该升级/求助写进去，安装或注入。
3. 用同样输入再跑一次，逐条对比。
4. 只在这一类任务上小范围用，不扩张到其它任务，直到第 3 步显示出稳定差异。

建议观察的指标（均可自行计数）：
- 首次输出即可用的比例（不需要返工重写）；
- 为得到可用结果所需的纠正轮数；
- 专家检查清单中被遗漏项的条数（对照你自己的清单逐项打勾）；
- 完成同一任务的时间；
- 上下文占用：未加载技能与加载技能时同一任务的 token/长度差异（用来验证“按需加载省上下文”这一主张）。

如果这些指标在多个任务上都没有稳定改善，说明该模式对你这套工作不成立，应降级为 study 而非写进手册。
