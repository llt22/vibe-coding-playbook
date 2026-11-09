# Ask HN: How do you manage your AI agents' context across clients and projects?

- 结论：**值得一试**。建议小范围试：采用“每个客户/项目独立目录 + AGENTS.md 入口 + 规则/文档文件夹 + 读-做-写决策记录”的组合工作流，能明显减少重复解释和上下文丢失。理由：论坛中多位实践者给出了可复制的具体结构和提示词，且已有 Claude Code 等工具支持。
- 原文：https://news.ycombinator.com/item?id=50403153
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T08:00:51.427Z

## 是什么
这是一篇 Hacker News 的 Ask HN 讨论帖，提问者想知道如何在多个客户和项目之间管理 AI 代理的上下文。40 条评论中，多位实践者分享了各自的工作流、工具和踩坑经验。核心问题包括：新会话如何提供上下文、如何在多个代理之间传递上下文、如何隔离不同客户的上下文、上下文丢失的代价，以及是否值得自建工具。讨论没有给出单一标准答案，但提炼出若干可复制的模式：用独立目录/身份隔离客户、用 AGENTS.md/CLAUDE.md 作为入口、用规则文件夹和决策记录承载细节、让代理在每轮结束时总结并写入知识库、用索引文件加速冷启动、通过提交纪律保持上下文精简。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

以下做法综合了多位评论者的实践，可按需组合。前提：你已经在使用 Claude Code、Codex 或其他支持 AGENTS.md/CLAUDE.md 的代理框架，并且有读写项目目录的权限。

1. **为每个客户/项目建立独立的工作目录和身份**
   - 为每个客户创建独立的系统用户或至少独立的项目根目录。评论者 mceachen 建议：“If you have separate clients, I would use a different username/login for each client so session transcripts (like in ~/.claude/...) are segregated.”
   - 在每个项目根目录放置 `AGENTS.md`（或 `CLAUDE.md`）作为入口文件。该文件只放最小必要信息和到详细文件的链接，避免臃肿。
   - 如果使用 Claude Code，可以在项目目录下通过 `claude` 启动，会话记录会自然按目录隔离。

2. **用规则文件夹和文档文件夹组织项目特定上下文**
   - 评论者 marvstazar 的做法：每个项目有自己的 `CLAUDE.md`/`AGENTS.md`，它只是查找文档；详细的项目特定 markdown 放在 `rules/` 文件夹下（例如 `rules/forms-and-dialogs.md`、`rules/roles.md`）；代理在新功能或 bug 修复中持续更新这些规则；同时 `docs/` 文件夹分为 `idea/`、`plan/`、`review/`，在实现新功能时创建对应文档。
   - 你可以创建如下结构：
     ```
     project/
       AGENTS.md
       rules/
         forms-and-dialogs.md
         roles.md
       docs/
         idea/
         plan/
         review/
     ```
   - 在 `AGENTS.md` 中写入：
     ```
     在做任何任务前，先阅读 `rules/` 下与任务相关的文件。
     新功能或修复的文档写入 `docs/idea/`、`docs/plan/` 或 `docs/review/`。
     ```

3. **实施“读-做-写”循环与决策记录**
   - 评论者 ksajadi 使用该循环 14 个月，维护两类知识：通用知识（跨项目）和项目特定知识（每个项目）。格式为 markdown 和决策记录，每个决策有元数据：approved、rejected、failed。
   - 具体操作：
     - 每轮任务开始时，提示代理：“Read the relevant previous notes in `knowledge/` before starting.”
     - 任务结束时，提示代理：“Summarize what you learned and any decisions made. For each decision, create a markdown file in `knowledge/decisions/` with status (approved/rejected/failed), date, and context.”
     - 下一轮任务开始时，让代理先读这些决策记录，避免重复被拒绝的方法。
   - 示例提示词：
     ```
     请回顾本轮工作，总结关键发现和决策。将每个决策写成 `knowledge/decisions/<date>-<slug>.md`，包含：
     - 标题
     - 状态：approved / rejected / failed
     - 背景
     - 决策内容
     - 后果
     然后更新 `knowledge/summary.md` 的索引。
     ```

4. **维护主索引文件以加速冷启动**
   - 评论者 lp92 维护一个“master index document listing every file along with a brief overview”，这能显著减少新会话的扫描时间。
   - 在项目根目录创建 `INDEX.md`，列出关键文件和一句话说明。例如：
     ```
     | 文件 | 说明 |
     |------|------|
     | src/auth.js | 认证逻辑 |
     | rules/roles.md | 用户角色规则 |
     | docs/plan.md | 当前实现计划 |
     ```
   - 在 `AGENTS.md` 中指示：“开始新会话时，先读 `INDEX.md`。”

5. **用 Git 提交纪律保持上下文精简**
   - 评论者 synapsomorphy 建议：“The minimal delta is a commit. Every implementation turn must end with one or multiple, and a clean worktree.” 他还建议鼓励简短、与提交关联的聊天，避免昂贵的缓存写入。
   - 步骤：要求代理在每个实现回合结束时提交（可以是一个或多个 commit），并保持工作树干净。在 `AGENTS.md` 中明确：“每个实现回合必须以 git commit 结束，且 `git status` 干净。”
   - 这使上下文可以随时从提交历史恢复，减少对长篇聊天记录的依赖。

6. **使用 ADR 目录记录架构决策（可选）**
   - 评论者 charlesabarnes 在所有仓库中使用 gitignored 的 ADR（Architecture Decision Record）目录，并维护一个 status doc 用于恢复。
   - 创建 `adr/` 目录并加入 `.gitignore`（如果不想提交）。提示代理：“在做出重大架构决策前，先写一个 ADR 到 `adr/`，格式：标题、状态、背景、决策、后果。”
   - 同时维护 `STATUS.md` 记录当前工作状态，新会话先读它。

7. **用编号系统（如 Johnny.Decimal）统一组织和快速定位**
   - 评论者 jen729w（Johnny.Decimal 的作者）描述：为每个项目/客户分配一个 ID（如 `21.15`），在 Obsidian vault 中维护索引笔记，磁盘上有对应文件夹。使用 CLI 命令 `jd 21.15` 跳转到文件夹，然后启动 `claude`。
   - 步骤：
     1. 设计一套编号方案（如领域.项目编号），为每个客户/项目分配唯一 ID。
     2. 在 Obsidian 中为每个 ID 创建笔记，作为该项目的索引和共享记忆。
     3. 在磁盘上创建同名文件夹，放置 `AGENTS.md` 和项目文件。
     4. 安装 `jd` CLI（或自己写一个简单脚本），运行 `jd <ID>` 切换目录并启动代理。
   - 他说整个设置大约需要半小时，且免费（MCP 服务付费）。

8. **用外部工具管理会话记录和搜索（可选）**
   - 评论者 cmrx64 使用 `cv`（https://github.com/emberian/cv）来切割和搜索代理记录，在最近一次评估中节省了 40% 的 token。
   - 评论者 hyldmo 使用 farero.ai 将所有聊天存入 SQLite 数据库，并注入 MCP 工具让代理搜索历史决策。
   - 这些工具适合需要保留大量历史记录并跨会话搜索的场景。可以先评估 `cv` 等开源工具。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：讨论中展示的 AI 代理可以做但常被忽略的工作包括：在每轮结束时自动总结并写入知识库（ksajadi）；根据索引文件自主查找相关规则（lp92）；维护和更新项目 wiki（dumbmrblah、mapontosevenths）；在架构决策时自动生成 ADR（charlesabarnes）；根据状态文档恢复工作（charlesabarnes）。这些能力不需要额外训练，只需在提示词和文件结构中给予明确指令。

2. **任务匹配**：评论者对不同代理和工具的选择有明确倾向。mceachen 同时使用 Claude 和 Codex，并为每个任务维护技术项目计划；nilleb 为每个客户分配特定代理，并指出不同代理格式不同需要额外工作；synapsomorphy 用 Podman 容器隔离不同代理；baalimago 使用 MCP 服务器（slivingdoc）同步上下文，使上下文跨代理框架可用。适合用代理的任务包括：代码实现、代码评审、研究、监控分析、根据看板执行任务。协作方式上，多人团队可考虑 Notion 或自建 WIKI（ksajadi、dumbmrblah）。

3. **条件供给**：讨论反复强调以下条件：清晰的目录结构和命名（jen729w、marvstazar）；入口文件（AGENTS.md/CLAUDE.md）只放链接，详细内容分散在规则/文档/决策文件中（marvstazar、lp92）；提供读写权限，让代理能更新知识库（ksajadi、anyonecancode）；提供反馈机制，如 gatekeeper 脚本验证 wiki 是否更新（mapontosevenths）；提供 MCP 工具访问外部系统（Jira、邮件、监控）（option_greek、twodave）。缺少这些条件时，代理会重复犯错或忘记决策（spockz 指出触发写日志的困难）。

4. **主动推进**：多个评论描述了由时间、事件或状态触发的持续工作流。twodave 有一个技能管理每日看板 JSON，从邮件、Slack、Grafana、ADO 拉取任务，维护每日日志，并循环运行子会话。hyldmo 设置了 grok bot 监控分析以发现 bug，并可以启动编码工作树。synapsomorphy 调度功能实现以利用每周使用上限。状态触发包括：会话结束时自动更新 `topic.md`（anyonecancode）；决策状态（approved/rejected/failed）触发后续行为（ksajadi）；gatekeeper 脚本在代理尝试开始新一轮前强制更新 wiki（mapontosevenths）。

5. **效果验证**：讨论中提到的可验证指标包括：节省 token（cmrx64 报告节省 40%）；减少重复解释的时间（提问者本身的主要痛点）；减少因上下文丢失导致的返工（mceachen 说“the more slack I give to agents, the more likely a session's work will have to be discarded”，而 TPP 帮助避免）；代理是否能正确引用规则和决策（marvstazar 说“The agent so far has not failed to reference the above files”）；是否能复现项目任一阶段（mapontosevenths 说“I could reproduce any stage of my project”）。但这些都是轶事，缺乏对照实验。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）**：讨论中的大部分做法直接围绕 Claude Code 的 `CLAUDE.md`、`--resume`、技能机制展开。例如 mceachen、marvstazar、jen729w 都使用 Claude Code 作为代理框架。本线索可视为对 Claude Code 上下文管理实践的补充。
- **Agent skills（adopt）**：多个评论者使用“技能”来封装可复用的操作流程。dools 的 skillzmouse、chrisweekly 引用的 Matt Pocock 技能库、baalimago 的 clai profiles 都属于技能管理。ksajadi 的“读-做-写”循环也可以封装为技能。
- **Obsidian（drop）**：在清单中状态为 drop，但 jen729w 和 encruxx 在讨论中仍将 Obsidian 用作索引和知识库。如果清单已决定 drop，可以只借鉴其“索引笔记”思路，而不必采用 Obsidian 本身。
- **Firecracker（study）**：nilleb 在讨论中提到 Firecracker 逃逸漏洞，作为安全隔离的背景。这与上下文隔离间接相关，但不是核心。
- **Semble（try）**：讨论中未提及。
- **OpenCode（watch）**：讨论中未明确提及，但 synapsomorphy 提到从同一本地 Web 服务器运行 Claude 和 Codex，可能类似多代理编排。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**证据**：
- 多个评论者给出了运行时长：ksajadi 使用读-做-写循环 14 个月；jen729w 说 Johnny.Decimal 设置约半小时；cmrx64 报告 `cv` 在一次评估中节省 40% token；MadBrad-Develop 报告一次上下文丢失事故花费约 7 分钟修复。
- 有具体工具和链接：Varda、slivingdoc、clai、farero、estratos、skillzmouse、byre、cv、Johnny.Decimal、Basic Memory 等，部分开源可查。
- 有可复制的文件结构和提示词示例（如上文提取）。

**局限**：
- 所有内容均为个人经验分享，没有对照实验或量化基准。节省 40% token 是单一案例，未必可推广。
- 讨论者中有多人推广自己的工具（nilleb、jen729w、dools、petesergeant、hyldmo、cpinto 等），存在自我宣传偏差。
- 方法碎片化，没有统一的“最佳实践”验证。例如 spockz 指出让代理在“足够重要”时主动写日志并不可靠，说明依赖代理自觉性的方法有失败风险。
- 适用条件：适合频繁切换多个客户/项目的独立开发者或小团队，且愿意投入初始设置时间（半小时到数小时）；对于单一项目或简单任务，可能过度工程化。团队协作场景讨论较少，ksajadi 提到用 Notion 共享，但未展开。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式**：
1. 选择两个规模相近的新项目（或一个项目的两个阶段），一个作为对照组（沿用现有方式），一个作为实验组。
2. 在实验组项目根目录创建：
   - `AGENTS.md`（入口，指向规则和索引）
   - `rules/`（放 1-2 个规则文件）
   - `docs/idea|plan|review/`
   - `INDEX.md`（列出关键文件）
   - `knowledge/decisions/`（用于决策记录）
3. 在 `AGENTS.md` 中写入提示词：开始任务前读 `INDEX.md` 和相关规则；每轮结束总结并写决策记录；每个实现回合以 git commit 结束且工作树干净。
4. 运行 2-4 周，记录以下指标：
   - 每次新会话开始时，你手动重新解释上下文所花的时间（分钟）。
   - 代理因忘记之前决策或使用被拒绝方法而需要你纠正的次数。
   - 代理能否在 1-2 轮内找到正确的规则文件或历史决策（是/否）。
   - 你查看项目状态所需的时间（通过 `INDEX.md` 或 `STATUS.md`）。
5. 与对照组对比。如果实验组在“重新解释时间”和“纠正次数”上明显下降，且代理能稳定引用历史决策，则视为改善。

**判断改善的指标**：
- 主观指标：你是否感觉更少被“上下文切换”打断；代理是否更少问重复问题。
- 客观指标：重新解释时间减少 30% 以上；上下文相关错误减少 50% 以上；新会话达到有效工作状态所需的轮数减少。
- 注意：这些指标需要在你自己的项目中基线测量，不能直接套用讨论中的轶事数据。
