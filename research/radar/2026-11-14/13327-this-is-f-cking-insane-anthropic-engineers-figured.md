# @0xwhrrari: This is f*cking insane. Anthropic engineers figured out how to keep Claude coding for hours without 

- 结论：**值得研读**。这条推文只是把 Anthropic 官方文档汇总成一份入口清单，本身提炼不出可照做的步骤，因此建议顺着它列出的一份文档清单，去研读长时运行 agent 的 harness 设计、evals 以及 Claude Code 的 hooks/subagents/memory/headless 文档，从中抽取配置和循环流程，再判断是否采用。
- 原文：https://x.com/0xwhrrari/status/2121226588586926526
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-14T02:52:26.761Z

## 是什么

这是一条第三方 X 推文（作者 @0xwhrrari，点赞 73、转发 3、回复 44），声称 "Anthropic engineers figured out how to keep Claude coding for hours without forgetting a thing"，并给出一个口号式概括："2 agents. 3 files. 1 feature per session"。

推文主体是一份免费的文档索引，共列出 11 个链接（采集文本中 URL 被断行拆开，部分路径需自行拼接）：

- Effective harnesses for long-running agents（长时运行 agent 的 harness）
- Harness design for long-running apps
- Building effective agents
- Demystifying evals for AI agents
- Claude Code best practices
- Hooks
- Subagents
- Skills
- CLAUDE.md + memory
- Headless mode, run it in a loop
- Claude Code in action（课程）与 Anthropic academy

推文结尾承诺 "steal the prompt below"，但采集到的正文在此处中断，**没有包含任何提示词、命令、配置或流程**。因此本材料只能作为一个"去哪读"的线索，不能作为手册素材直接使用。

## 具体做法

原文未给出任何可执行步骤（没有命令、配置、提示词、文件结构示例）。下面只是**可复核的阅读动作**，不是原文提供的操作方法；每条的实际内容本报告无法确认。

1. 前提：已在使用 Claude Code 或类似编码 agent，并能访问 Anthropic 官方文档站。打开推文列出的 "effective harnesses for long-running agents" 与 "harness design for long-running apps" 两篇，摘录其中关于会话边界、上下文延续、验收环节的具体设计。
2. 前提：同上。打开 Claude Code 文档的 Hooks 与 Subagents 两页，记录可配置的触发事件名、配置字段与子 agent 定义格式（原文只给链接，未给字段）。
3. 打开 CLAUDE.md + memory 页，记录记忆文件的放置位置与加载规则。
4. 打开 Headless mode 页，记录非交互调用的启动方式与退出码/输出约定，再据此设计"循环运行"脚本。
5. 打开 "Demystifying evals for AI agents"，记录可复用的评测任务构造与判定方式。
6. 每读一篇，只保留可原样复制的片段（配置块、命令、提示词），汇总成自己的 harness 清单；无法复制的段落归入"仅观点"。

（以上 6 条是本次调研建议的阅读方法，不是原文内容。）

## 对应的研究问题

- **能力发现**：推文主张可让 Claude "连续编码数小时而不遗忘"，属于断言，无任何细节或案例支撑，无法据此判断能力边界。
- **任务匹配**：仅出现名词级线索——subagents（"2 agents"）、skills、headless 循环；没有说明什么任务该用子 agent、什么任务该单 agent。
- **条件供给**：指向 CLAUDE.md + memory（需要提供持久化的项目信息）与 hooks（在固定事件点注入检查与反馈）；具体需要提供什么信息、权限与反馈形式，原文未展开。
- **主动推进**："Headless mode, run it in a loop" 是唯一与循环/自动触发相关的线索，但只是链接标题，没有触发条件、状态判断或失败重试的设计。
- **效果验证**：指向 "Demystifying evals for AI agents" 与 evals 主题，但未给出任何指标或判定标准。

## 与已有做法的关系

清单中有 **Claude Code（tool，状态 adopt）**。这条线索指向的 hooks、subagents、skills、memory、headless mode 都属于 Claude Code 的扩展能力文档，可视为对已有 adopt 条目的补充入口；但原文没有给出与现有做法冲突的内容，也没有新增可直接落地的流程。

## 证据与局限

- 原文只有断言与链接，**没有任何数据、案例、基准或对照实验**。
- 核心口号 "2 agents. 3 files. 1 feature per session" 没有上下文解释（3 files 指什么、feature 粒度如何界定均不明）。
- 承诺的提示词（"the prompt below"）在采集文本中缺失，可能被截断；即使存在也未纳入判断。
- 链接在采集文本中被断行拆分（如 `anthropic.com/research/effec tive-harnesses-...`），无法确认全部可达，也未核实其内容与推文描述是否一致。
- 作者是第三方账号，不是 Anthropic 官方发布，"Anthropic engineers figured out" 属于二手转述。
- 适用条件：读者已在用编码 agent，且愿意自行阅读上游文档；对不使用 Claude Code 的团队，此线索的迁移价值需另行评估。
- 结论：本材料只支持"去读哪些文档"，不支持"照这样做"。

## 怎么试、怎么验证

**最小试用方式（不改动生产代码）**

1. 用半天时间按上面第 1–6 步读完 4 篇核心文档（两篇 harness + headless + evals），抽出一页"可原样复制的片段"清单；若某篇抽不出任何可复制片段，说明该篇对本团队无用，剔除。
2. 选一个低风险仓库、一个边界清晰的小 feature，限定改动文件范围（对应推文所说 "1 feature per session" 的粒度），先用当前习惯的方式做一次作为基线，记录数据。
3. 第二次用抽出的 harness 片段（记忆文件 + 事件钩子 + headless 循环）重做同类型任务，记录同样指标。

**判断有无改善的指标（建议指标，非原文给出）**

- 每个 session 开始时需要重新交代上下文的次数（越少越好）
- 单个 feature 交付过程中的人工干预次数（中断、纠偏、重述）
- 跨会话返工率：上次会话产物被下次会话推翻/重写的比例
- 任务级 eval 通过率（用第 5 步抽出的评测方式构造）
- 无人值守时段的实际产出（提交数/通过测试数），对照推文所称"睡觉时也能交付"的主张

只有在第二次明显优于基线、且指标可重复时，才把对应片段升级为手册条目；否则维持 study，仅作为阅读索引保留。
