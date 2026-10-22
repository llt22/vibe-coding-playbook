# EricJujianZou/rederive

- 结论：**值得一试**。建议在小范围新人上手或陌生代码库理解中试用：安装后用 /rederive 让 AI 只提问，按 .rederive/map.md 的 5 到 10 个问题重新推导设计，并用 .rederive/log.md 复盘。流程和命令具体可照做，但只有 README 宣传、没有效果数据，因此先试再扩大。
- 原文：https://github.com/EricJujianZou/rederive
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-22T05:49:19.244Z

## 是什么
rederive 是一个面向编码 Agent 的 Skill，目标不是让 AI 直接讲解代码库，而是让使用者从第一性原理重新设计系统，通过 Agent 只提问、不解释的方式推导出真实设计。README 称其用于学习任意代码库，兼容 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、opencode、Windsurf、Amp、Goose 等 Agent。核心产物是 `.rederive/map.md`（5 到 10 个按系统搭建顺序排列的问题、约束和真实设计）与 `.rederive/log.md`（记录你卡住和独立推导的地方）。

## 具体做法
1. 准备环境和目标仓库。前提：本机有 `git`、`bash`、`python3`；已安装至少一个支持 Skill 的编码 Agent；目标代码库可在本地打开，或可通过 URL 克隆。
2. 在项目目录安装 Skill。前提：能运行 `npx`。命令：
```
npx skills add EricJujianZou/rederive
```
README 说明该命令会把 Skill 放进项目里找到的每个 Agent 文件夹；若要对所有项目安装，在命令后加 `-g`。也可使用 Claude Code 插件方式：
```
/plugin marketplace add EricJujianZou/rederive
/plugin install rederive@rederive
```
或手工克隆后复制：
```
git clone https://github.com/EricJujianZou/rederive
cp -r rederive/skills/rederive ~/.agents/skills/
```
3. 启动一次推导会话。前提：已经在目标仓库上下文。按目标选择命令：
```
/rederive
/rederive ~/code/myapp
/rederive https://github.com/expressjs/express
```
第一条用于当前仓库，第二条用于本地仓库，第三条会把 URL 仓库克隆到当前文件夹。
4. 从项目为什么存在开始回答。前提：愿意用自然语言交互。自己的仓库会被问为什么做它；别人的仓库会由 Agent 先推断原始问题，再问你将如何解决。
5. 在回答期间让后台 Agent 建图。前提：不要提前打开答案。Agent 会读代码、文件间 import 关系和设计发生变化的提交；它不信任 commit message，因此用 AI 少量大提交构建的仓库也可用。图会写入 `.rederive/map.md`，包含 5 到 10 个按系统搭建顺序排列的问题、各自的约束和真实设计。完成前不要打开这个文件。
6. 卡住时要求缩小问题。前提：先自己尝试。README 说它会将问题收窄成几种可选方案；连续两次答错后，它会提出帮你勾勒问题。你可以用自然语言说卡住了、跳过一个问题或重新开始。
7. 结束后读记录并复盘。前提：会话完成后再看。`.rederive/log.md` 记录你在哪里卡住、哪些是你自己推导出来的；读它来决定后续练什么。
8. 隐私与版本控制。前提：使用本地 Agent 环境。README 称所有内容留在本机，`.rederive/` 会被加入仓库的本地 git exclude 列表，不会出现在提交中；rederive 不发送 telemetry。

## 对应的研究问题
- 能力发现：AI 在这里不是直接给答案，而是扮演只提问的导师，并通过后台 Agent 读取代码、import 关系和设计变更提交，生成按搭建顺序排列的 5 到 10 个设计问题。这展示了一个不常交给 AI 的工作：用受约束的提问让人类重新推导代码库设计，而不是让 AI 代读代讲。
- 任务匹配：适合新人上手、陌生代码库学习、理解设计决策；交互方式是问答式、刻意不解释，因此不适合需要快速直接答案的排障或紧急修改。README 明确说它只提问、不会解释，并以理解推导而非记忆 Agent 说法为目标。
- 条件供给：需要 `git`、`bash`、`python3`；需要支持 Skill 的编码 Agent；需要目标仓库的读取权限，URL 模式还需要克隆能力；需要使用者用自然语言回答；需要保留 `.rederive/` 本地文件并遵守“不提前打开 map”的约束。
- 主动推进：后台 Agent 会在你回答时自动读代码、import 关系和设计变更提交并建图；它还会在连续两次答错后主动提出画草图，并在 `.rederive/log.md` 持续记录表现。原文没有给出按时间、事件或状态自动触发并持续执行的机制，主动推进主要发生在一次交互会话内。
- 效果验证：原文提供 `.rederive/log.md` 作为过程记录，能看出哪里卡住、哪些是独立推导；会话本身包含 5 到 10 个设计问题。但 README 没有给出学习效果数据、对照实验或准确性指标，验证需要自行设计。

## 与已有做法的关系
清单中相关条目有 Claude Code（adopt）、Cursor（watch）、GitHub Copilot（drop）、goose（watch）、OpenCode（watch）和 Agent skills（adopt）。rederive 本身是一个 Agent Skill，直接利用“Agent skills”这一形态，并声称可在 Claude Code、Cursor、GitHub Copilot、opencode、Goose 等 Agent 中安装使用。它与清单中这些工具不是替代关系，而是给它们增加一个“通过重新推导学习代码库”的 Skill。需要注意：README 声称兼容 GitHub Copilot，但清单中 GitHub Copilot 当前状态是 drop；这条线索不足以改变该状态，只能说明 rederive 可能可在该工具中使用。

## 证据与局限
证据来自仓库 README：给出了安装命令、三种启动方式、`.rederive/map.md` 与 `.rederive/log.md` 的机制、后台 Agent 读取代码/import/设计变更提交的说明，以及 Express 的会话示例——Agent 问如何处理每个 HTTP 请求，用户先提出一个大 handler，再提出共享 auth 函数，Agent 增加约束，直到用户描述出按路由的一组函数，并告诉用户这重新推导出了 middleware chain。原文没有给出用户研究、学习效果对比、准确率、耗时或失败案例；40 stars 也只是仓库指标，不能证明效果。作者关于“通过推导而非记忆来理解”的主张属于设计理念，尚未被原文数据验证。适用条件主要是学习型、设计理解型任务，且依赖 Agent 对仓库的读取和 Skill 兼容性；对大型仓库、多语言仓库、权限受限仓库或需要直接答案的任务，原文没有说明表现。

## 怎么试、怎么验证
最小试用：选一个你熟悉但新人陌生的仓库，或直接用 README 的 Express 示例，安装后完整跑一次 `/rederive`，完成 5 到 10 个问题，会话结束前不打开 `.rederive/map.md`，结束后读 `.rederive/log.md`。同时保留一个基线：同一人先只读 README/文档并让 Agent 直接讲解，记录理解结果；再用 rederive 跑同类仓库。验证指标可包括：完成一次会话所需时间、卡住次数、连续答错后需要提示的次数、结束后不看资料解释系统设计要点的准确度、能否预测某个设计变更的影响、以及一周后是否还能复述核心设计决策。若多人试用，可让新人在同仓库分别用直接讲解和 rederive，再比较上手任务完成时间和提问质量。只有出现可重复的理解改善，才考虑扩大到团队；否则保持小范围试。
