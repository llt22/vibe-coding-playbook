# ARYANK-08/agentic-dev-kit

- 结论：**值得一试**。按 README 给的一行 curl 命令把某个 skills/<name>/SKILL.md 装到项目的 .claude/skills/ 或全局的 ~/.claude/skills/，重启 Claude Code 后用一次解释类请求验证它是否按 description 自动加载；可以试是因为安装和自建技能的步骤具体可复制，但 README 里没有任何技能正文，实际收益必须装完读文件再判断。
- 原文：https://github.com/ARYANK-08/agentic-dev-kit
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-03T04:45:33.372Z

## 是什么

agentic-dev-kit 是一套面向 Claude Code 的 Markdown 技能集（skills），目标是改善 SDLC 的各个阶段——编码、架构、评审、测试、发布。

组织形式：每个技能是仓库 `skills/` 下的一个文件夹，文件夹里有一个 `SKILL.md`。装载位置决定作用范围：

- 项目级：`.claude/skills/<name>/SKILL.md`（随 git 共享给协作者）
- 全局级：`~/.claude/skills/<name>/SKILL.md`（对本人所有项目生效）

触发方式：重启 Claude Code 后，技能在「请求与其 `description` 匹配」时自动加载。

README 的技能表当前只列出一项：`explain`（用途：Clear explanations: simplified English, explain-like-I'm-13, diagrams, HTML pages, videos）。

## 具体做法

前提：本机已安装 Claude Code。

1. 项目级安装单个技能（不 clone 仓库）——在项目根目录执行：

```bash
mkdir -p .claude/skills/explain && curl -fsSL https://raw.githubusercontent.com/ARYANK-08/agentic-dev-kit/main/skills/explain/SKILL.md -o .claude/skills/explain/SKILL.md
```

2. 想对本人所有项目生效，把上一条命令里的 `.claude/skills/explain` 换成 `~/.claude/skills/explain`。

3. 想装别的技能，把命令里的 `explain` 换成对应技能名（README 目前只给出 `explain` 一个）。

4. 从 clone 的仓库复制（项目级）：

```bash
mkdir -p .claude/skills
cp -r path/to/agentic-dev-kit/skills/<name> .claude/skills/
```

全局级：

```bash
cp -r path/to/agentic-dev-kit/skills/<name> ~/.claude/skills/
```

5. 重启 Claude Code。之后当你的请求与技能 `description` 匹配时，技能会被加载。

6. 自建技能（README 给出的流程）：
   - 创建 `skills/<name>/SKILL.md`，frontmatter 中包含 `name` 和 `description` 两个字段（README 未给出 frontmatter 的完整示例格式）；
   - 在上面的技能表里加一行。

## 对应的研究问题

- **能力发现**：把「解释」这类沟通型工作交给编码智能体——简化英语、explain-like-I'm-13、示意图、HTML 页面、视频。README 只给了用途描述，没有给出实际提示词，因此只能确认「这类任务被作者纳入了技能范围」，无法确认其做法好坏。
- **任务匹配**：协作方式是「Markdown 技能文件 + Claude Code 按 description 自动匹配触发」，属于给编码智能体挂载可复用能力的一种机制；作用域可选项目级或全局级。
- **条件供给**：技能文件本身即上下文供给的载体——把领域/流程知识写成 `SKILL.md`，放在 `.claude/skills/` 或 `~/.claude/skills/` 下供会话复用。README 未提及所需工具、权限或反馈机制。
- **主动推进**：无依据。README 没有提到时间、事件或状态触发的持续执行。
- **效果验证**：无依据。README 没有给出任何验证指标或评估方法。

## 与已有做法的关系

清单中相关条目：**Claude Code**（tool，状态 adopt）。本条目不引入新工具，而是 Claude Code 的技能装载与编写实践：把 `SKILL.md` 放进 `.claude/skills/` 或 `~/.claude/skills/`，由 description 匹配触发，可作为 Claude Code 条目下的「技能/上下文供给」补充。

## 证据与局限

**有依据的部分**：README 给出了可直接复制的安装命令（一行 curl、cp 两种方式）、目录结构、作用域差异（项目级 vs 全局级）、触发机制（重启 + description 匹配）、以及自建技能的步骤。仓库 37 stars。

**只是主张、无法验证的部分**：README 标题声称改善 SDLC 的编码/架构/评审/测试/发布各阶段，但技能表里只有一个 `explain` 技能，且**没有展示任何一个 `SKILL.md` 的实际内容**。因此初筛理由中提到的「参考其提示与上下文组织方式」在现有材料里没有落地证据——看不到任何提示词或上下文组织示例。也没有效果数据、案例或对比。

**未说明的事项**：适用的 Claude Code 版本、frontmatter 的完整格式、技能命名冲突如何解决、description 怎么写才容易被匹配、以及 curl 安装方式对网络的依赖（需可访问 raw.githubusercontent.com）。

**适用条件**：需要 Claude Code 环境；使用 curl 一行安装时需能访问 raw.githubusercontent.com，否则改用 clone + cp 方式。

## 怎么试、怎么验证

**最小试用**：在一个小项目里按第 1 步装入 `explain` 技能，重启 Claude Code，提一个「解释这段代码」类型的请求，观察技能是否按 description 自动加载（若未触发，再尝试在请求中显式点名该技能，以区分「没匹配上」和「技能没装成」）。

**判断是否改善的指标**：
1. 是否被自动触发（不显式调用也能加载）——触发率低说明 description 写法需要调整；
2. 产出是否符合描述中的形态（简化英语、ELI13 语气、图示、HTML 页面）；
3. 同类请求重复多次是否稳定，而不是碰运气；
4. 相比不用技能时，你自己写的提示词长度是否明显缩短。

**推广前必须做的一步**：打开安装下来的 `.claude/skills/explain/SKILL.md` 读实际提示词，判断它是否值得沉淀成本团队的写法。只有这一步有正面结果，才考虑按第 6 步把团队自己的流程（架构、评审、测试、发布）写成新的 `SKILL.md`，逐个装入并各用一个小任务验证。
