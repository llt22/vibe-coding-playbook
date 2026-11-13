# @mojeskoqq: I can't f*cking believe this is public. OpenAI's co-founder mass-published AI research. Google, Clou

- 结论：**值得研读**。先把这条推文当作选库线索，逐个核验这些 agent skills 仓库的 README、许可证、权限与示例后再决定是否小范围试用；原文只有仓库名和 star 宣传，没有给出可照做的步骤、配置或效果证据。
- 原文：https://x.com/mojeskoqq/status/2120976164521202083
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T15:43:19.438Z

## 是什么
这条推文声称：不必从零写提示词，直接复用成熟团队的 agent skills / agent configs。它列出 5 个 GitHub 仓库线索（TypeScript 技能、Google 前工程负责人发布的 24 个生产技能、Cloudflare 安全审计技能、Obsidian vault 技能、Google 设计评审框架），并给出作者声称的 star 数。原文没有提供任何仓库 README、安装命令、配置片段、提示词内容或审计结果。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
原文没有给出可照做的步骤、命令、配置或提示词，只有仓库链接和宣传性描述，因此不能按原文直接复现。若要把线索转成调研动作，只能做以下核验（这是对线索的处理建议，不是原文步骤）：
1. 打开每个仓库，确认 README 是否给出安装方式、依赖、适用模型/工具、示例输入输出。
2. 检查 license、最近提交、issue 处理、维护者身份，判断能否用于团队。
3. 重点检查安全审计类技能会读取哪些文件、会执行哪些命令、是否需要网络/密钥/写权限。
4. 在隔离环境或非生产分支，用仓库自带示例跑一次，记录是否可复现。
5. 只选一个与当前工作最接近的技能做小范围对照试用，不把 star 数当质量证据。

原文可原样保留的只有仓库线索：
- github.com/mattpocock/skills
- github.com/addyosmani/agent-skills
- github.com/cloudflare/security-audit-skill
- github.com/kepano/obsidian-skills
- github.com/google/elephant-goldfish-model

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
- 能力发现：提示 agent 可复用「技能包/配置」来做 TypeScript 开发、生产工程、安全审计、笔记库读写、设计评审；但原文没有展示这些能力具体能完成什么任务，属于待核验线索。
- 任务匹配：只提到 Claude Code 和 agent configs，没有说明什么任务配什么模型、工具或协作方式，也没有任务边界。
- 条件供给：仓库技能可能提供部分信息/工具封装，但原文未说明需要哪些权限、上下文、反馈机制和安全约束。
- 主动推进：未涉及时间、事件或状态触发，也未说明持续执行。
- 效果验证：未给出任何效果指标或案例，只有 star 数；star 数不能证明工作结果改善。

## 与已有做法的关系（对照给出的清单条目；没有就写「清单中没有相关条目」）
清单中「Claude Code」为 adopt：推文提到 Claude Code 可用的 reusable skills，但原文没有给出加载方式或配置，因此只能作为 Claude Code 技能生态的线索。清单中「Obsidian」为 drop：推文提到 obsidian-skills 可让 agent 读写 vault，但没有具体能力、权限或效果证据，不足以改变清单状态。其余仓库在清单中没有对应条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
证据仅为一条推文正文。作者声称的 star 数、团队身份和「mass-published AI research」均未经原文材料验证；链接在原文中还被换行截断。没有仓库内容、license、安装步骤、权限模型、失败案例或效果数据。适用条件是：团队愿意先做仓库尽调和小范围隔离试用；不能把宣传性 star 数当作采用依据。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
最小试用：先不接入生产。选一个低风险且与当前工作最接近的仓库（例如安全审计或 TypeScript 技能），读完 README 和 license 后，在隔离环境用仓库示例跑通；若跑通，再在非生产分支对同一批任务做「无技能基线 vs 使用技能」对照。判断指标：能否按文档复现、输出是否可执行、人工返工次数、发现问题数量与误报率、耗时、是否需要额外权限或敏感数据。若无法复现、权限过大或许可证不清，则停留在研读，不进入试用。
