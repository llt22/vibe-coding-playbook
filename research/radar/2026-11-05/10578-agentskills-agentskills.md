# agentskills/agentskills

- 结论：**值得一试**。建议小范围试：先用一个高频多步流程，按 SKILL.md 文件夹格式封装成技能，并验证 agent 能否按 description 触发、按需加载脚本和参考材料。README 只给出格式与渐进披露机制，缺少完整规范和案例，暂不宜直接全面采用。
- 原文：https://github.com/agentskills/agentskills
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T11:02:47.502Z

## 是什么
Agent Skills 是一个轻量、开放的格式，用文件夹给 AI agent 增加专门能力和知识。核心是 `SKILL.md`，至少包含 metadata（`name`、`description`）和告诉 agent 如何完成特定任务的 instructions；还可以附带 scripts、references、assets 等资源。Agent 通过“渐进披露”三阶段加载：启动时只读每个技能的 name 和 description；任务匹配后读取完整 `SKILL.md`；执行时按需运行附带代码或加载引用文件。目标是封装领域知识、可重复流程，并实现跨产品复用。

## 具体做法
1. 前提：选一个高频、多步、输入输出相对稳定的任务；确认所用 agent 客户端支持 Agent Skills。README 指向 Client Showcase，但正文没有列出具体客户端名单。
2. 建立技能文件夹，至少包含 `SKILL.md`；按需增加 `scripts/`、`references/`、`assets/`。README 给出的结构是：
```
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```
3. 在 `SKILL.md` 中写 metadata（至少 `name` 和 `description`）以及 instructions。`description` 要能说明该技能何时适用，因为 agent 启动时只加载 name 和 description 做发现。原文没有给出 `SKILL.md` 的完整字段语法，精确格式需查 specification。
4. 把可执行代码放进 `scripts/`，把参考文档放进 `references/`，把模板和资源放进 `assets/`；在 instructions 中写清何时执行代码、何时读取引用，配合执行阶段的按需加载。
5. 用渐进披露机制自检：启动时是否只暴露名称和描述；任务匹配时是否读取完整 `SKILL.md`；执行时是否只加载所需脚本或引用文件。
6. 先在一个真实流程上试，不要一次性建很多技能；记录触发是否准确、执行是否一致、是否需要人工返工。

## 对应的研究问题
- 能力发现：有依据。README 明确说技能可以封装专门知识和工作流，让 agent 获得新能力和专长，并举例法律审查流程、数据分析管线、演示文稿格式等。这对应“把还没想到交给 AI 的工作封装成技能”。
- 任务匹配：有依据但较粗。匹配靠技能的 `description`；技能适合多步、需要专门知识或资源的工作；渐进披露用于降低上下文占用。README 没有说明不同模型或工具如何选择，只称可跨 skills-compatible agent 复用。
- 条件供给：有依据。需要提供 `SKILL.md` 指令、可选的 scripts/references/assets，并以可版本控制的文件夹形式供给；agent 需要支持该格式。
- 主动推进：无依据。README 只讲任务匹配后激活，没有讲时间、事件或状态触发，也没有讲持续执行。
- 效果验证：弱依据。README 提到可重复、可审计的流程，但没有给出指标、实验或验证方法。

## 与已有做法的关系
清单中有“Agent skills”概念，状态为 adopt。该仓库是 Agent Skills 标准的 README/入口，与已有条目直接对应：它把“Agent skills”具体化为 `SKILL.md` 文件夹格式和渐进披露加载机制。若手册已有 adopt 的概念条目，可把本材料作为其格式说明和落地模板来源；但 README 本身不是完整规范，详细字段和校验需看 specification。

## 证据与局限
- 数据/事实：仓库有 26,958 stars；格式最初由 Anthropic 开发并作为开放标准发布，README 声称已被越来越多 agent 产品采用；README 还称有大量 AI 工具和客户端支持，但正文没有列出名单。
- 只是作者主张：领域专长、可重复流程、跨产品复用、上下文占用小，均没有量化案例或对比数据。
- 局限：输入只有 README，未包含 specification、示例技能和客户端列表；因此无法确认 `SKILL.md` 的精确 schema、必填字段格式、安全边界、版本兼容性和实际触发准确率。
- 适用条件：所用 agent 支持 Agent Skills；团队能维护版本化文件夹；技能描述和指令质量决定效果。

## 怎么试、怎么验证
- 最小试用：选一个当前反复人工处理的多步流程（如固定格式报告生成、数据检查、文档审阅），按上述结构建一个技能，只写一个 `SKILL.md` 和必要脚本/模板；在支持 skills 的 agent 中跑若干真实任务。
- 对照：同一批任务比较“不用技能”和“用技能”的结果；至少记录任务完成率、人工修改次数、完成时间、步骤一致性、是否在正确时机触发。
- 判断改善：若触发准确（相关任务能加载、不相关任务不误加载）、执行步骤更一致、人工返工减少，则可扩大；若 agent 不加载、加载后不遵循或脚本无法执行，先修 description、instructions 和资源组织，再考虑是否采用。
- 风险检查：确认技能中脚本权限、敏感数据和外部资源访问范围；README 未给安全模型，需自行审查。
