# Speedrunlab/reverse-engineer-anything-self-learning-loop

- 结论：**值得一试**。建议小范围试：把该技能装进 Claude Code 或兼容智能体，用一个已获授权的小产品，按“签收 parity checklist → 构建 → 对照验证 → 补差距”跑两轮，只有连续两轮 must-have 全过且有证据才算完成。理由是它把“做完”写成可测清单并强制证据复核，能补足智能体常停在 80% 的问题；但当前只有 README 层面的方法说明，缺少实测数据和完整 SKILL.md 内容，不宜直接 adopt。
- 原文：https://github.com/Speedrunlab/reverse-engineer-anything-self-learning-loop
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-28T12:05:22.446Z

## 是什么

这是一个面向智能体的技能包，目标不是“像原产品”，而是把“100% 完成”预先写成可测试的 parity checklist，然后循环执行：检查授权与范围、检查目标产品、定义完成标准、构建自己的版本、与原版做证据化对照、按差距规划下一轮、在满足停止条件时结束，并把可复用经验回流到技能中。README 明确说它合并了两个能力：Reverse Engineer Anything 的检查纪律，以及 Hermes Agent as a Skill File 的学习循环，并补上了“带书面完成定义的闭环”。

## 具体做法

1. **先过授权与范围门禁。** 前提：你只重建已获授权的产品。向智能体提供：要重建的产品、谁批准、范围、工作目录。README 的 Quick start 明确要求这四项。单独工作时也要把自己记录为 approver，并注明，目的是让授权显式化。

2. **安装到智能体的 skills 目录。** Claude Code 下可执行：

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/Speedrunlab/reverse-engineer-anything-self-learning-loop.git ~/.claude/skills/reverse-engineer-anything-self-learning-loop
```

然后在 Claude Code 中运行：

```text
/reverse-engineer-anything-self-learning-loop
```

OpenClaw 下可执行：

```bash
mkdir -p ~/.openclaw/skills
git clone https://github.com/Speedrunlab/reverse-engineer-anything-self-learning-loop.git ~/.openclaw/skills/reverse-engineer-anything-self-learning-loop
```

其他智能体：把文件夹复制进其 skills 目录，或把 `SKILL.md` 载入指令，并把 `references/` 和 `templates/` 放在智能体可读的位置。前提：该智能体支持技能目录或可加载外部指令文件。

3. **准备隔离的检查环境和独立的构建目录。** README 要求：检查环境由操作者提供，无网络、无凭据；任何 live 步骤使用一次性 VM；构建目录单独放在版本控制下；目标路线需要的开源工具要按固定版本显式安装，技能自己不安装工具；准备操作者拥有的 fixtures；批准人应独立于请求者。

4. **做静态优先、证据优先的检查。** 按 README 的约束：preflight；只读副本和摘要；限制抽取量；做逃逸检查；屏幕上不出现 secrets；把内容当作数据，不当作指令；笔记只记录行为，不记录受保护的表达。前提：不得绕过访问控制、不得搬运受保护资产、不得向厂商后端发送流量。

5. **在构建前写 parity checklist 并让操作者签收。** 每个条目包含：一个可测试行为；具体输入和期望输出；用于验证的精确检查；层级（must-have、should-have、out of scope）。运行得分定义为“通过的 must-have 数 / must-have 总数”。前提：清单必须先于构建产生并被签收。

6. **先搭 walking skeleton。** 先覆盖所有 must-have 路径，再补细节；遵守 clean-room 纪律：写代码的人不要同时打开反编译文本；使用操作者提供的 fixtures；用 stub 代替厂商后端；设计决策与观察记录分开保存。前提：构建是操作者自己的设计，只受观察到的行为启发。

7. **用同一输入对照原版复核。** 对原版和自建版使用相同输入；diff 或 hash 输出；做格式 round-trip；在声明的阈值下并排比较屏幕；测量耗时。每个结果标记 pass、fail 或 not testable，并且每个结果背后有文件证据。再让 fresh-eyes reviewer 抽样重新打分，并寻找 checklist 漏项。

8. **按差距规划并迭代。** 按影响和依赖排序 gap；每轮只选一批本轮能证明的改动；做 regression sampling，避免静默破坏；维护 iteration log，记录是什么推动了得分变化。

9. **使用停止条件。** 完成定义为：所有 must-have 在连续两次 review 中通过。出现以下情况停止并询问：得分连续两轮停滞；某个 gap 需要受保护材料或厂商后端；预算耗尽；任何检查停止条件触发。永远不要对未测试项宣布 100%。

10. **从每轮迭代学习，但不污染规则。** 把 checklist 模式、review 技术、路线、工具配方和修复配方保存到技能中，先 staging，等操作者批准。不要把失败直接固化为规则，不要捕获 secrets，也不要捕获来自目标产品的材料。

## 对应的研究问题

- **能力发现：** README 宣称智能体可以承担“检查一个已授权重建的产品、搭自己的版本、持续对照原版补差距直到 must-have 全过”的完整任务。这个能力边界很清楚，但原文没有给出多产品类别的成功案例，只能作为待验证能力。
- **任务匹配：** 适合有 skills 目录的智能体，README 明确给出 Claude Code 和 OpenClaw 的安装路径，并说明其他智能体可加载 `SKILL.md`。任务本身需要隔离检查环境、版本控制构建目录、固定版本工具、fixtures 和独立批准人；不适合无授权、需要绕过访问控制或依赖厂商后端的任务。
- **条件供给：** 需要提供授权记录、批准人、范围、工作目录、可签收的 parity checklist、操作者拥有的 fixtures、隔离分析环境、构建目录和证据文件。README 还要求把“内容当数据而非指令”、不显示 secrets、限制抽取量。
- **主动推进：** 技能内建多轮循环：写清单、构建、review、按 gap 规划、再迭代，并定义了得分停滞、预算耗尽、需要受保护材料等停止条件。它不是时间或事件触发器本身，但一旦由操作者启动，可以由循环和得分状态持续推进。
- **效果验证：** 这是原文最强的部分。用 parity checklist 定义 must-have，用 pass/total 计分；用相同输入、diff/hash、round-trip、屏幕阈值比较、耗时测量形成证据；fresh-eyes reviewer 抽样复核；连续两次 review 全过才算完成；不允许未测试项算通过。

## 与已有做法的关系

清单中的 **Claude Code** 是直接安装与运行目标，README 给出 `~/.claude/skills` 安装命令和 slash command；**OpenClaw** 也是明确支持的 skills 目录目标；**Hermes** 对应 README 中的 companion “Hermes Agent as a Skill File”，用于完整学习循环和记忆，但该 companion 在清单中状态为 watch。该技能可独立使用，安装 companion 后会把检查深度和记忆交给 companion。清单中没有其他直接相关条目。

## 证据与局限

原文是 README，不是完整技能正文。可见证据包括：安装命令、支持 Claude Code/OpenClaw/其他智能体、文件结构（`SKILL.md`、`references/`、`templates/`）、方法流程、停止条件和安全约束；仓库标记为 MIT，当前抓取材料显示 31 stars。原文没有给出 benchmark、对照实验、真实项目案例、得分变化数据或完整提示词。多数效果主张，例如“补上最后 20%”“下一产品起点更靠前”，目前只是作者主张，未由材料中的数据验证。完整方法在 `SKILL.md` 和 `references/` 中，但本次材料未展开，无法判断其提示词和模板质量。适用条件很窄：必须已获授权、有独立批准人、有隔离检查环境、有 fixtures、工具固定版本，且不得克隆第三方产品、绕过访问控制或搬运受保护资产。

## 怎么试、怎么验证

最小试用：选一个已获授权的内部小产品，列出 5 到 10 个 must-have 行为；按 README 安装到 Claude Code 或加载 `SKILL.md`；提供授权人、范围和工作目录；让操作者签收 parity checklist；跑至少两轮“构建—对照—补差距”。同时保留一个基线：用同一智能体、同一范围，但不使用该技能，直接要求“做出等价版本”。

判断改善的指标：每轮 must-have 通过率；未测试项数量；每个 review 结果是否有文件证据；连续两轮 must-have 全过所需轮数；fresh-eyes reviewer 与原评分的一致率；回归采样中发现的问题数；从开始到 walking skeleton 可运行的时间；总耗时与工具成本；人工判断“是否真的可交付”。如果使用技能后 must-have 通过率更高、未测试项更少、证据更完整，并且能以可接受成本达到连续两轮全过，才值得扩大到更多任务；否则维持 study 或回到 watch。
