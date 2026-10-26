# huaxialucaicaizi/ai-startup-skills

- 结论：**值得一试**。建议小范围试用它的“总入口 + 子 skill”安装与阶段路由层：在 Codex 或 Claude Code 中装入总入口和 7 个子 skill，用真实项目走一遍“阶段判断→子 skill→产出交接”，再决定是否保留；理由是 README 给出了可复制的安装命令、调用提示词和默认顺序，但各子 skill 的具体步骤与效果证据未在原文中展开，暂不宜直接 adopt。
- 原文：https://github.com/huaxialucaicaizi/ai-startup-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T05:49:28.964Z

## 是什么

这是一个面向“一人公司做 AI 产品”的 Agent Skill 合集仓库：把 7 个独立 skill（MVP 验证、商业计划书、政策导航、路演教练、增长获客、定价成交、注册合规）打包，并加一个总入口 skill。用户说明自己在做什么、做到哪一步，总入口判断阶段，最多问两个问题，然后调用对应子 skill；每一步产出可交给下一步使用。仓库还提供安装命令、默认顺序、同步与校验脚本，以及作者自己的案例目录。原则包括不编数据、政策法规只引官方来源、信息参考不构成法律或税务意见、进入某一步后以该步子 skill 的 SKILL.md 为准。

## 具体做法

1. 前提：使用支持 Agent Skills 的工具。README 明确支持 Codex、Claude Code，并说 Cursor 等其他工具可按各自方式安装；需要 git 和 shell，运行校验脚本需要 python3。先克隆仓库：

```bash
git clone https://github.com/huaxialucaicaizi/ai-startup-skills.git
```

2. 安装到 Codex 用户技能目录 `~/.agents/skills`：

```bash
mkdir -p ~/.agents/skills
cp -R ai-startup-skills/skills/* ~/.agents/skills/
cp -R ai-startup-skills ~/.agents/skills/ai-startup-skills
```

前提：已克隆到当前目录；目标是 Codex 的用户技能目录。README 要求把 `skills/` 下 7 个子 skill 和总入口一起放进技能目录。

3. 或安装到 Claude Code 用户技能目录 `~/.claude/skills`：

```bash
mkdir -p ~/.claude/skills
cp -R ai-startup-skills/skills/* ~/.claude/skills/
cp -R ai-startup-skills ~/.claude/skills/ai-startup-skills
```

前提同上。

4. 可运行结构校验。README 说 `validate.py` 用于校验总入口、7 个子 skill 的 frontmatter 和案例引用，提交 PR 前要运行。在仓库根目录执行：

```bash
python3 scripts/validate.py
```

前提：python3 可用；在 `ai-startup-skills` 仓库根目录执行。README 没有说安装后必须运行，可把它当作安装后的结构检查。

5. 用总入口判断阶段。把产品与进度填进去：

```text
用 ai-startup-skills 帮我看看我现在在创业的哪一步、下一步该做什么：___（在做什么产品、已经做到哪一步）
```

前提：技能已安装；说明产品是什么、已经做到哪一步。README 说总入口最多问两个问题，然后调用对应子 skill，并在每一步后建议下一步。

6. 也可以直接点名某一步。例如定价：

```text
用 opc-pricing-sales 帮我给这个 AI 产品定价：___
```

前提：知道要调用哪个子 skill；把产品信息补在冒号后。其他步骤把 skill 名替换成对应子 skill 即可。

7. 按默认顺序推进：新创业者默认顺序是 1 → 2 → 3 / 7 → 4 → 5 → 6；第 3 步和第 7 步可同时做，申请政策前通常要先注册主体。把上一步产出（验证证据、BP、定价等）作为下一步输入，README 明确要求各步产出串起来用，而不是各写各的。

8. 更新子 skill。README 说 7 个子 skill 的源头是各自独立仓库，要拉最新版本时在仓库根目录运行：

```bash
./scripts/sync.sh
python3 scripts/validate.py
```

前提：在仓库根目录；`sync.sh` 有执行权限；该脚本会从 7 个独立仓库重新拉取到 `skills/`。

使用时注意：政策、注册与合规子 skill 只提供信息参考，使用前应按 README 要求点开官方原文确认最新版本；正式法律、税务问题应以官方原文和专业人士意见为准。

## 对应的研究问题

- **能力发现**：原文明确把“判断创业阶段并路由到对应子 skill”交给 AI，并列出 7 类可交给 AI 的创业工作流：MVP 验证、BP、政策导航、路演、增长获客、定价成交、注册合规。这是能力清单，不是意外能力发现；每个子 skill 的具体能力边界原文没有展开。
- **任务匹配**：原文按“阶段”匹配子 skill，也允许直接点名某一步；匹配的工具是支持 Agent Skills 的 Codex、Claude Code，Cursor 只说可按各自方式安装。原文没有模型能力对比或选择标准；进入某一步后，子 skill 的规则优先于总入口。
- **条件供给**：需要提供三项关键输入：产品是什么、已经做到哪一步、上一步产出；需要把技能安装到工具的技能目录；需要能运行 git 和 shell，校验需要 python3；政策、法规、平台规则要求附官方原文链接并在使用前确认最新版本。权限和反馈机制原文没有具体说明。
- **主动推进**：原文没有给出时间、事件或状态触发的自动推进机制；总入口是在用户提问后判断阶段并建议下一步，属于“按阶段路由 + 下一步建议”，不是持续自主执行。
- **效果验证**：原文只提供结构校验（`validate.py` 检查 frontmatter 和案例引用）和“不编数据、只用官方来源”的原则；没有给出业务结果指标、对照实验或量化验证方法。案例目录是作者本人经历，不能替代独立效果验证。

## 与已有做法的关系

清单中直接相关的是：**Agent skills（adopt）**——本仓库就是一套 Agent Skill 合集，并增加总入口路由；**Claude Code（adopt）**和 **OpenAI Codex（adopt）**——README 给出了两者的用户技能目录和安装命令；**Cursor（watch）**——README 只说其他支持 Agent Skills 的工具如 Cursor 可按各自方式安装，没有给出具体步骤。

清单中没有与“一人公司创业流程技能包”直接对应的条目；它更像是在 Agent skills 概念上做领域打包和阶段路由，而不是新的模型或工具。

## 证据与局限

证据方面：原文提供了 7 个 skill 的名称与一句话用途、总入口“最多问两个问题再路由”的行为说明、默认推进顺序、Codex 和 Claude Code 的安装命令、`sync.sh` 与 `validate.py` 的用途、作者本人案例目录，以及“不编数据、只用官方来源、信息参考不是法律或税务意见”等原则。仓库元数据显示 230 stars，采用 MIT 许可。

局限方面：提供的材料只是 README，不是完整仓库内容；原文没有给出各子 skill 的 SKILL.md 具体步骤、提示词、配置或模板，因此只能评估“安装、路由、产出交接”这一层，不能评估验证、BP、定价等方法本身是否有效。原文没有给出任何结果数据、用户反馈或对照实验；所谓真实案例是作者自己的经历，且部分数字标为未公开。政策、注册与合规、平台获客主要针对中国大陆，政策和平台规则会过期；它也不适用于正式法律、税务意见和面向 VC 的融资路演。

## 怎么试、怎么验证

最小试用方式：选一个真实 AI 产品想法或一个真实任务（例如 MVP 验证或定价），只安装到 Codex 或 Claude Code 中的一个工具；先用总入口跑一次，记录它判断的阶段、追问的问题数、调用的子 skill，再用直接点名子 skill 的方式跑一次作为对照。把每一步产出保存下来，下一步调用时附上，检查产出能否被后续步骤直接使用。

建议观察的指标：1）路由准确性——阶段判断是否与自己的判断一致，是否最多问两个问题，是否调用正确子 skill；2）产出可用性——拿到的清单、模板或建议是否需要大量重写才能用；3）交接完整性——下一步是否真的用上了上一步的验证证据、BP 或定价结论；4）引用可靠性——政策、法规、平台规则是否附官方原文链接，点开后是否仍为最新版本；5）结构校验——`python3 scripts/validate.py` 是否通过；6）效率对比——完成同一任务所需时间、人工修改次数是否下降。若连续几次都出现路由错误、产出无法进入下一步或引用不可靠，就应降级为 study，而不是继续采用。
