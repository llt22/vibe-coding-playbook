# ABLingss/awesome-agent-loops

- 结论：**值得研读**。把这个仓库当作 agent loop、skill 和插件的索引来研读，按五个问题挑出少量条目，再回到各自源仓库核实具体用法，不要直接全量安装；因为原文只有目录、一句话描述和安装命令，没有可复用的配置、步骤或效果证据。
- 原文：https://github.com/ABLingss/awesome-agent-loops
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T07:45:09.698Z

## 是什么
这是一个面向 DSH、Codex、Claude Code 及兼容 Agent 的目录型仓库，汇总 Loop Skills、工作流自动化、云端交付、工程、调研与自动化技能。原文提供了一键安装精选 Skills 和安装 DSH 插件的命令，但每个条目基本只有名称、链接和一句话功能描述。它不是一套完整方法论，也不是某个具体 skill 的实现说明，更接近索引和入口。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. 前提：先不要直接执行管道安装。原文明确提醒每个链接都是外部 skill 或插件，安装前要检查其源码和权限。应先访问安装脚本 URL 阅读脚本内容，确认来源可信，并在隔离环境或非生产仓库中操作。确认后再执行原文命令：
```sh
curl -fsSL https://raw.githubusercontent.com/ABLingss/awesome-agent-loops/main/install-skills.sh | bash
```
2. 前提：已安装 git、DSH，且知道如何回滚插件树和配置变更。需要同时安装 DSH 插件时，执行原文命令：
```sh
git clone https://github.com/ABLingss/awesome-agent-loops
cd awesome-agent-loops
./install-skills.sh --dsh
```
3. 打开 README，按五个研究问题建立候选表。只做索引，不凭一句话描述直接采用。可按类别摘录：DSH Skills、Workflow Skills、Cloud & Delivery Skills、Engineering Skills、Research & Automation Skills。每条记录至少包括：条目名、源链接、一句话功能、它对应五个问题中的哪一个、是否与已有清单重合、需要什么权限或运行环境。
4. 对候选条目回到源仓库读说明，确认是否给出安装方式、配置、触发条件、停止条件、权限边界和验证命令。若源仓库也没有具体步骤，只保留为 study，不进入试用。
5. 选择一个最小条目做隔离试用，不要全量安装。优先选与已有清单重合、风险较低的条目，例如 mattpocock/skills 中的 triage 或 handoff，或 Ralph Loop 插件。前提是已阅读源仓库说明，并在临时分支、临时目录或非生产云项目中运行。
6. 试用前保留回滚点。原文目录中列有 dsh-undo-savepoint、cc-safety-net、dsh-permission-rules 等安全与回滚相关条目，但原文没有给出它们的具体配置；需要回到各自源仓库确认用法后再使用。
7. 记录触发方式线索。原文中 dsh-loop 的描述提到 `/loop 30m <task>`、状态查看、恢复和停止；Ralph Loop 插件提到围绕目标持续迭代并在条件满足时停止；handoff 提到为下一轮 Agent 留下持久交接信息。这些可以作为设计触发器式自动推进的参考，但原文没有给出完整配置，不能直接照搬。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
1. 能力发现：目录列出了一些容易被忽略的可委托能力，例如 OCR、视觉定位、UI 恢复和像素对比，跨命令保持浏览器会话，对抗式 UI 检查，从一个漏洞继续搜索相似漏洞，云端部署与观测，多轮视频生成一致性。依据仅是条目名称和一句话描述，具体能力边界要回源仓库确认。
2. 任务匹配：目录按 DSH、Workflow、Cloud & Delivery、Engineering、Research & Automation 分类，并列出 subagent-codex、subagent-claude-code、triage、handoff、tdd、code-review 等条目。可据此形成任务分流、子代理委派、交接和检查约束的匹配线索；原文没有给出模型选择标准或匹配效果数据。
3. 条件供给：dsh-permission-rules 提到为长期运行的 Agent 增加允许、拒绝和询问边界；cc-safety-net 提到阻止危险命令和敏感文件访问；dsh-context 提到查看和管理长任务中的上下文增长；mnemon 系列提到把文档、运行时状态和持久记忆接入上下文；dsh-undo-savepoint 提到回滚损坏的插件树和配置变更。这些都对应信息、权限、上下文和回滚条件，但原文只有索引，没有具体配置。
4. 主动推进：dsh-loop 提到 `/loop 30m <task>`、状态、恢复和停止；Ralph Loop 插件提到目标导向迭代和停止条件；handoff 提到为下一轮 Agent 留下持久交接信息；agent-browser 提到在多轮 Agent 命令之间保持浏览器会话。可作为时间触发、状态恢复和持续交接的参考，但缺少完整的触发与停止设计。
5. 效果验证：tdd 提到 red、green、refactor 循环；code-review 提到在 Loop 宣布成功前检查变更；ui-test 提到 Loop 停止前运行对抗式 UI 检查；web-quality-audit 提到检查性能、无障碍、SEO 和最佳实践；google-agents-cli-workflow 提到构建、评估、部署和观测 Agent。它们提供了验证方向的线索，但原文没有指标、数据或验证流程。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
- Claude Code（状态 adopt）：目录收录 Ralph Loop plugin，并列出 dsh-subagent-claude-code。该目录只是索引，不能替代已有的 Claude Code 具体做法。
- mattpocock/skills（状态 study）：目录大量收录其条目，包括 grill-me、to-spec、to-tickets、implement、handoff、triage、tdd、code-review、research、diagnosing-bugs 等。该线索可作为这批技能的下游目录，但原文没有展开用法。
- obra/superpowers（状态 study）：目录收录 systematic-debugging，描述为用假设驱动调试替代盲目重试。仅此一条索引。
- DeepSeek Harness（状态 watch）：目录包含大量 dsh-* 插件，涉及循环、权限、上下文、记忆、回滚、子代理和视觉工具。可作为 DSH 生态的条目索引，但不是 DeepSeek Harness 本身的使用手册。
- Ralph loop（状态 watch）：目录收录 Ralph Loop plugin，描述为目标导向的 Claude Code 迭代和停止条件。原文没有给出安装、配置或停止条件细节。
- skills.sh（状态 try）：目录中大量外部技能链接指向 skills.sh，可作为来源索引，但需要逐项审查。
- DeepSeek（状态 try）：目录中的 DSH 名称与 DeepSeek Harness 相关，但原文没有模型能力评测或 DeepSeek 使用步骤。
总体上，该线索与已有清单高度重叠，但只增加索引价值，不增加可直接执行的具体做法。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
证据：原文给出了 README 目录、两条安装命令、约一百个条目的一句话描述，以及 105 stars 的来源指标。原文还明确警告：每个链接都是外部 skill 或插件，安装前要检查源码和权限。
局限：没有案例、数据、效果对比、配置示例、提示词、停止条件细节或验证指标；安装脚本内容未提供，无法判断安全性；所有外部链接内容未抓取，无法判断维护状态、兼容性和权限要求；条目描述是作者归纳，属于主张而非验证结论。适用条件是使用 DSH、Codex、Claude Code 或兼容 Agent，并愿意逐项审查外部 skill 和插件。若不能审查源码和权限，不应安装。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
最小试用方式：不要执行全量安装。先从与已有清单重合的条目中选一个，例如 mattpocock/skills 的 triage 或 handoff，或 Ralph Loop 插件；回到源仓库阅读说明，确认有明确安装方式、触发条件、停止条件和权限边界后，再在隔离仓库或临时环境中跑一个边界清晰的小任务。保留回滚点，记录安装前后差异。
判断指标建议：同一任务相对手动基线，任务完成率是否提高；人工干预次数是否减少；循环是否按停止条件停止，是否出现无法停止或反复重试；上下文和成本增长是否可控；危险命令拦截、敏感文件访问和权限违规次数；产出是否通过 code review、测试或 UI 检查；回滚次数和恢复时间。原文没有给出这些指标，以上是试用设计建议；若源仓库没有具体步骤和验证方式，则只保留为 study，不进入 try。
