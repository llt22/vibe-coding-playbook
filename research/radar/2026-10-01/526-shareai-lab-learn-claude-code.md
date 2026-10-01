# shareAI-lab/learn-claude-code

- 结论：**值得一试**。建议小范围试：按 README 的 Quick Start 从 s01 逐章跑通到 s17，并把其中的 Harness 五件套（Tools/Knowledge/Observation/Action/Permissions）与最小 agent loop 当作给真实工作搭环境的检查清单和骨架。理由是它给的是可克隆、可运行、可复制的具体步骤与代码，而不只是观点；但每章实现细节未随 README 给出，效果主张也缺数据，先试再定。
- 原文：https://github.com/shareAI-lab/learn-claude-code
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T10:28:25.346Z

## 是什么

`shareAI-lab/learn-claude-code` 是一个 MIT 许可的「harness engineering」教程仓库（给定指标显示 77,855 stars）。它的核心论点只有一句：**Agency（感知、推理、行动的能力）来自模型训练，不是来自外部代码编排；但一个能用的 agent 产品 = 模型 + harness**——「模型是司机，harness 是车」。

仓库认为被滥用的「agent」概念（拖拽式工作流、无代码 AI Agent 平台、prompt 链编排库）只是「塞了一个 LLM 的 Rube Goldberg 机器」，因此把工作重新定义为两件事：训练模型，或**搭 harness**（给模型一个可操作的环境）。它选 Claude Code 作为范本，因为 Claude Code 不试图「成为 agent」，只提供工具、知识、上下文管理、权限边界，然后让模型自己做判断。

课程共 17 章（`s01_agent_loop` → `s17_goal_loop`），每章隔离一个 harness 机制，配可独立运行的 `code.py` 和中/日/英三语 README；`s15` 把前面积累的机制重新接回一条完整循环，`s16`（工作流编排、可恢复 journal）和 `s17`（目标闭环）是聚焦示例。旧的 12 课版本保留在 `docs/` 和 `agents/`。

17 章目录（README 给的关键概念）：s01 Agent Loop（`messages`/`while True`/`tool_use`）、s02 Tool Use（`TOOL_HANDLERS` 分发表）、s03 Permission（`PermissionRule`/审批流水线）、s04 Hooks（`PreToolUse`/`PostToolUse`）、s05 TodoWrite（plan-then-execute）、s06 Subagent（新 `messages[]`、上下文隔离）、s07 Skill Loading（`SkillLoader`/目录/按需注入）、s08 Context Compact（tool_result_budget / snip_compact / micro_compact / compact_history）、s09 Memory（选择/抽取/固化）、s10 Task System（`TaskRecord`/`blockedBy`/磁盘持久化）、s11 Background Tasks（线程执行/通知队列）、s12 Cron Scheduler（持久调度）、s13 Agent Teams（常驻队友/原子认领任务/task-bound worktree/类型化协议）、s14 MCP Plugin（工具发现/命名空间）、s15 Integrated Harness、s16 Workflow Runtime、s17 Goal Loop。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：能访问 GitHub 与 npm；本机有 Python 环境和 `pip`；有一个 Anthropic API key（课程跑起来需要配 `ANTHROPIC_API_KEY`）；跑模型会产生调用费用；需要 Node 才能跑 web 端。

1. 克隆并安装依赖（当前 17 课主线）：

```sh
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code
pip install -r requirements.txt
cp .env.example .env   # configure ANTHROPIC_API_KEY
```

2. 从第 1 章跑起，确认最小循环能通（README 标注这是起点：one loop + bash）：

```sh
python s01_agent_loop/code.py        # Start here -- one loop + bash
```

3. 按顺序推进，复杂章节单独跑一遍对照：

```sh
python s08_context_compact/code.py   # Context compaction (complex)
python s17_goal_loop/code.py         # Endpoint: continue until a checkable goal is met
```

   阅读方式按 README：每章一个文件夹，`README.md` 是英文完整叙事（另有 `README.zh.md` / `README.ja.md`）、`code.py` 是独立可运行实现、`images/` 放 SVG 图；从 `s01` 顺序读到 `s17`，复杂章节有 `<details>` 折叠深挖。注意不要混用新旧两条线的章节号（README 给了旧 12 课到新 17 课的映射表）。

4. 如果要看旧版 12 课实现（`agents/` 目录，包含完整版）：

```sh
python agents/s01_agent_loop.py
python agents/s12_worktree_task_isolation.py
python agents/s_full.py
```

5. 把「harness 公式」抄成给真实任务搭环境的检查清单，逐项填空（这是 README 里最可直接复用的一块）：

```
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions

    Tools:          file I/O, shell, network, database, browser
    Knowledge:      product docs, domain references, API specs, style guides
    Observation:    git diff, error logs, browser state, sensor data
    Action:         CLI commands, API calls, UI interactions
    Permissions:    sandbox isolation, approval workflows, trust boundaries
```

6. 抄最小 agent loop 作为骨架（README 原文代码，可复制后替换 `MODEL`/`SYSTEM`/`TOOLS`/`TOOL_HANDLERS`）：

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS,
        )
        messages.append({"role": "assistant",
                         "content": response.content})

        tool_calls = [
            block for block in response.content if block.type == "tool_use"
        ]
        if not tool_calls:
            return

        results = []
        for block in tool_calls:
            output = TOOL_HANDLERS[block.name](**block.input)
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": output,
            })
        messages.append({"role": "user", "content": results})
```

   配套原则（README 原话）：循环保持不变，新工具只是往分发表里加一个 handler；加扩展点靠 hook，不要改主循环。

7. 需要现成 CLI 而不是自己搭时，README 指向同作者的 Kode：

```sh
npm i -g @shareai-lab/kode
```

   README 称其支持 Skill 与 LSP、兼容 Windows、可用 GLM / MiniMax / DeepSeek 等开放模型。

8. 想做「常驻型」而非「用完即弃」的 agent，按 README 指向姊妹仓库路线（`claw0` / OpenClaw）叠加两个额外机制：**Heartbeat**（每 30 秒 harness 给 agent 发一条消息让它检查待办，没活就继续睡）和 **Cron**（agent 自己排未来任务，到点自动触发），再加 IM 多通道路由、持久上下文记忆和 Soul 人格系统。

9. 可选：跑 web 端对照课程（s16/s17 有 reading/source/simulator/architecture 视图）：

```sh
cd web && npm install && npm run dev   # http://localhost:3000
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 明确主张「Agency 来自模型，harness 只是给它一个落脚点」，并列出 2024–2025 的 LLM coding agent 现状：读代码库、写实现、调试失败、作为团队协同。课程层面，把「已经能做但常被忽略交给 AI」的能力拆成可数的机制：计划（s05）、子任务隔离（s06）、按需加载知识（s07）、跨会话记忆（s09）、并行编辑（s13 worktree）、定时自触发（s12）——这些是「可以交给 agent 做」的能力清单。

**2. 任务匹配**：给出的是「模型 vs harness」的分工判据：模型决定、harness 执行；模型推理、harness 提供上下文。harness 工程师的五项职责被显式列出——实现工具（文件读写、shell、API 调用、浏览器控制、数据库查询，要求原子、可组合、描述清晰）、筛选知识（产品文档、架构决策记录、风格指南、合规要求，按需加载而非预加载）、管理上下文（子 agent、压缩、任务系统让目标跨对话存活）、控制权限（沙箱、危险操作审批、信任边界）、收集轨迹数据（每次动作序列都是下一代模型的训练信号）。另外模型选择上，README 提到 Kode CLI 可挂 GLM/MiniMax/DeepSeek 等开放模型。

**3. 条件供给**：这是该仓库最直接对应的问题。`Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions` 本身就是一份「要给 AI 提供什么」的供给清单；课程进一步细化：权限规则与审批流水线（s03）、hook 扩展点（s04）、按需注入的技能目录（s07）、四级上下文压缩策略（s08）、记忆的选择/抽取/固化三子系统（s09）、MCP 外部能力接入（s14）。

**4. 主动推进**：s10 任务系统（大目标拆小、带 `blockedBy` 依赖、持久化到磁盘）、s11 后台任务（慢操作放后台线程，完成后注入通知）、s12 Cron 调度器（「Fire on schedule, no human kick needed」）、s13 常驻队友原子认领可执行任务、s16 保存的工作流配可恢复 journal、s17 目标门驱动的自动续跑。姊妹路线进一步给出 Heartbeat（30 秒轮询待办）与 Cron（自排未来任务）。

**5. 效果验证**：只有 s17 给了可对照的机制——「独立评估器审查每一次提议的停止；不可能、已失败或超限的目标把控制权交回用户」，即用可检查的目标门代替模型自述完成。s05 有一句「先列步骤，完成率翻倍」，但 README 未给数据来源。README 另把轨迹数据列为后续微调的原料，属于间接验证路径。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：本仓库的整篇论述以 Claude Code 为范本，README 把它拆成「一条 agent loop + 工具（bash/read/write/edit/glob/grep/browser…）+ 按需技能加载 + 上下文压缩 + 子 agent + 带依赖图的任务系统 + 异步邮箱团队协作 + 绑定任务的 worktree 并行编辑 + 权限治理 + hooks 扩展 + 记忆持久化 + MCP 外部能力路由」，并逐章对应实现。可视为对已有 Claude Code 做法的原理层拆解。
- **Harness Engineering（清单状态 study）**：该仓库就是这个概念的系统化课程，把「harness 工程师实际做什么」落成五项职责和 17 个可运行机制。
- **OpenClaw（清单状态 watch）**：README 明确把它列为「从被动会话到常驻助手」的姊妹路线，并给出其相对 Claude Code 式「用完即弃 harness」多出的机制：Heartbeat、Cron、IM 多通道路由（WhatsApp/Telegram/Slack/Discord 等 13+ 平台）、持久上下文记忆、Soul 人格系统；同作者的 `claw0` 是拆解这些机制的姊妹教学仓库。
- **DeepSeek（清单状态 try）**：仅在「Kode CLI 可用 GLM / MiniMax / DeepSeek 等开放模型」一句中被提到，README 未给具体配置或步骤。
- **Semble / PRAW / Trendshift**：清单中没有相关条目（Trendshift 只作为 README 里的 star 徽章来源出现）。

## 证据与局限

**原文给出的数据与案例**：仓库自身只有 star 指标（给定材料为 77,855）。README 用四个外部历史案例支撑「agency 来自训练」的论点，并附了出处链接：2013 DeepMind DQN 玩 Atari（2015 年扩展到 49 款游戏、发表于 Nature）、2019 OpenAI Five（自我对弈 10 个月相当于 45,000 年 Dota 2，2-0 击败 TI8 冠军 OG，公开场 42,729 局胜率 99.4%）、2019 DeepMind AlphaStar（闭门赛 10-1 击败职业选手，欧服达到 Grandmaster，前 0.15%）、2019 腾讯绝悟（世界冠军杯半决赛全场 5v5 击败 KPL 职业选手；1v1 模式职业选手 15 场仅胜 1 场；一天训练量相当于 440 人年）。这些是外部案例，不是本仓库的实验结果。

**只是作者主张的部分**：「工作流搭建器/无代码平台只是套了 LLM 的 shell script」是带强烈立场的判断；「Claude Code 是最优雅完整的 harness 实现」是主观评价；s05 的「完成率翻倍」没有给出任何数据来源或实验方法。

**关键局限**：本报告只依据仓库 README。每一章的具体实现（`code.py` 内容、依赖版本、是否真能跑通）、17 章的实际代码质量、以及任何前后对比效果，材料中都没有出现，无法核实。README 自称「设计模式可泛化到任何领域」，但正文与选例全部围绕编程场景，没有非编程领域的落地证据。

**适用条件**：需要 Python、`pip`、可用的 Anthropic API key 与相应费用；web 端需要 Node；面向的是「愿意自己写代码搭 harness」的人，而不是想直接用现成产品的人（后者 README 指向 Kode CLI/SDK）。

## 怎么试、怎么验证

**最小试用（半天以内）**
1. `git clone` + `pip install -r requirements.txt` + 配好 `.env` 里的 `ANTHROPIC_API_KEY`；
2. 跑 `python s01_agent_loop/code.py`，把示例任务换成你自己的一个小任务（读一个你熟悉的仓库、改一处代码、跑一次测试），确认「一条循环 + bash」真的能完成；
3. 再跑 `s08` 和 `s17` 各一次，观察上下文压缩和「目标门」是否按 README 描述的方式工作（s17 的关键行为：独立评估器审查每次提议的停止，不可能/失败/超限时交回用户）。

**第二步（应用到真实工作）**：挑一个你现在手上的真实任务，用 Harness 五件套逐项填空——工具缺什么、该按需加载哪些知识、能观察到什么反馈（git diff、错误日志）、允许执行哪些动作、哪些必须审批。填不出来的那一格就是当前的瓶颈，按它去对应章节（权限→s03、知识→s07、上下文→s08、长任务→s10/s11/s12）。

**判断有没有改善的指标**（README 未给指标，以下为自行埋点建议）：
- 任务一次完成率，以及需要人介入/接管的总次数；
- 因上下文超限而中断或失忆的次数（对照 s08 压缩前后）；
- 长任务是否能被定时器/后台任务接续，而不是靠人重新催（对照 s11/s12）；
- 循环停止的理由是否由可检查的目标决定，而非模型自述「我做完了」（对照 s17 的独立评估器门）；
- 若照 s05 先出计划再执行，直接对比「先列步骤」与「不列步骤」两组的完成率和返工次数，用来验证 README 那句未给数据的「完成率翻倍」是否在你这里成立。

**止损条件**：如果 s01 在标准环境下跑不通、或跑通后单次真实任务的成本与人工介入次数没有下降，就退回 study——保留 Harness 五件套和最小循环两个思路，不必继续投入 17 章。
