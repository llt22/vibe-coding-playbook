# 让 AI 在你的项目里真正干活：搭好 harness 五件套，再逐章补齐权限、记忆与目标闭环

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决 AI 只能在聊天框里给建议、不能在你的项目环境里持续执行和验证的问题：用一份可运行的 harness 检查清单和最小 agent loop 骨架，把工具、知识、观察、动作接口与权限补齐。
> 先试这一步：先克隆 learn-claude-code 并跑通 s01 的最小 agent loop（one loop + bash），确认你能在一个真实项目里让模型调用工具，再按需跳到 s08、s17 等章节对照补齐。
> 最近修订：2026-10-02

## 解决什么问题
模型本身已经有感知、推理、行动的能力（Agency），但一个能用的 agent 产品 = 模型 + harness。这份手册解决的是：你只在聊天框里用 AI，它看不到你的代码库、跑不了命令、记不住跨会话目标、停没停全凭它自己说；你要给它搭一个可操作的环境，把工具、知识、观察、动作接口和权限补齐。仓库把这件事叫 harness engineering，并以 Claude Code 为范本。

## 适用与不适用
适用：你想让 AI 在自己的项目里持续干活，愿意按机制逐项搭环境，有 Python 环境和 Anthropic API key，能跑代码、看输出、按章节对照。
不适用：你只想找一个现成工具、不打算跑代码或没有 API key；你期待拖拽式工作流/无代码 AI Agent 平台/prompt 链编排就能解决；你不能接受跑模型产生调用费用。仓库本身每章实现细节未随 README 给出，效果主张也缺数据，适合小范围试，不适合直接全量上生产。

## 前置条件
- 能访问 GitHub 与 npm。
- 本机有 Python 环境和 pip。
- 有一个 Anthropic API key；课程跑起来需要配 `ANTHROPIC_API_KEY`。
- 跑模型会产生调用费用。
- 需要 Node 才能跑 web 端。

## 操作步骤
先选做法：想系统理解 harness 机制、有时间和 API 预算，选做法 A；已经有自己的 agent 骨架、只想把环境检查清单补齐，选做法 B。两者可以组合：先用做法 B 的清单补自己项目，再挑教程对应章节（如 s03 权限、s08 压缩、s17 目标门）单跑对照。

### 做法 A：按教程从 s01 跑通到 s17，建立 harness 直觉
1. 克隆并安装依赖。前提：能访问 GitHub，本机有 Python 与 pip。
```sh
git clone https://github.com/shareAI-lab/learn-claude-code
cd learn-claude-code
pip install -r requirements.txt
cp .env.example .env   # configure ANTHROPIC_API_KEY
```
预期：依赖装好，`.env` 里配好 `ANTHROPIC_API_KEY`。

2. 从第 1 章跑起，确认最小循环能通（README 标注这是起点：one loop + bash）。
```sh
python s01_agent_loop/code.py        # Start here -- one loop + bash
```
预期：最小 agent loop 跑起来，模型能通过 bash 工具执行动作。

3. 按顺序推进，复杂章节单独跑一遍对照。
```sh
python s08_context_compact/code.py   # Context compaction (complex)
python s17_goal_loop/code.py         # Endpoint: continue until a checkable goal is met
```
阅读方式按 README：每章一个文件夹，`README.md` 是英文完整叙事（另有 `README.zh.md` / `README.ja.md`）、`code.py` 是独立可运行实现、`images/` 放 SVG 图；从 `s01` 顺序读到 `s17`，复杂章节有 `<details>` 折叠深挖。注意不要混用新旧两条线的章节号（README 给了旧 12 课到新 17 课的映射表）。

4. 如果要看旧版 12 课实现（`agents/` 目录，包含完整版），按需对照。
```sh
python agents/s01_agent_loop.py
python agents/s12_worktree_task_isolation.py
python agents/s_full.py
```
预期：旧线实现可运行；注意它与新版 17 课章节号不同。

5. 可选：跑 web 端对照课程（s16/s17 有 reading/source/simulator/architecture 视图）。前提：本机有 Node。
```sh
cd web && npm install && npm run dev   # http://localhost:3000
```

### 做法 B：不跑完整课程，直接把 harness 公式和最小 agent loop 抄进自己的项目
1. 把 harness 公式抄成给真实任务搭环境的检查清单，逐项填空。
```text
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions

    Tools:          file I/O, shell, network, database, browser
    Knowledge:      product docs, domain references, API specs, style guides
    Observation:    git diff, error logs, browser state, sensor data
    Action:         CLI commands, API calls, UI interactions
    Permissions:    sandbox isolation, approval workflows, trust boundaries
```
预期：你能说清当前任务缺哪一项，先补最缺的。

2. 抄最小 agent loop 作为骨架，可复制后替换 `MODEL` / `SYSTEM` / `TOOLS` / `TOOL_HANDLERS`。
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

3. 需要现成 CLI 而不是自己搭时，按 README 指向同作者的 Kode。
```sh
npm i -g @shareai-lab/kode
```
README 称其支持 Skill 与 LSP、兼容 Windows、可用 GLM / MiniMax / DeepSeek 等开放模型。

4. 想做「常驻型」而非「用完即弃」的 agent，按 README 指向姊妹仓库路线（`claw0` / OpenClaw）叠加两个额外机制：Heartbeat（每 30 秒 harness 给 agent 发一条消息让它检查待办，没活就继续睡）和 Cron（agent 自己排未来任务，到点自动触发），再加 IM 多通道路由、持久上下文记忆和 Soul 人格系统。

### 机制对照表（按需跳到对应章节）
- s01 Agent Loop：`messages` / `while True` / `tool_use`
- s02 Tool Use：`TOOL_HANDLERS` 分发表
- s03 Permission：`PermissionRule` / 审批流水线
- s04 Hooks：`PreToolUse` / `PostToolUse`
- s05 TodoWrite：plan-then-execute
- s06 Subagent：新 `messages[]`、上下文隔离
- s07 Skill Loading：`SkillLoader` / 目录 / 按需注入
- s08 Context Compact：tool_result_budget / snip_compact / micro_compact / compact_history
- s09 Memory：选择 / 抽取 / 固化
- s10 Task System：`TaskRecord` / `blockedBy` / 磁盘持久化
- s11 Background Tasks：线程执行 / 通知队列
- s12 Cron Scheduler：持久调度
- s13 Agent Teams：常驻队友 / 原子认领任务 / task-bound worktree / 类型化协议
- s14 MCP Plugin：工具发现 / 命名空间
- s15 Integrated Harness：把前面积累的机制重新接回一条完整循环
- s16 Workflow Runtime：工作流编排、可恢复 journal
- s17 Goal Loop：目标闭环

## 怎么判断变好了
可观察指标：
- AI 能在你的项目里调用工具、读写文件，并看到 git diff、错误日志、浏览器状态等观察再继续。
- 知识是按需加载（s07），不是把全部文档塞进上下文。
- 长会话遇到上下文压力时能压缩（s08 的 tool_result_budget / snip_compact / micro_compact / compact_history）。
- 大目标能拆小、带 `blockedBy` 依赖并持久化到磁盘（s10）。
- 慢操作能放后台线程、完成后注入通知（s11）；任务能定时自触发（s12）。
- 停止由可检查的目标门决定：s17 用独立评估器审查每一次提议的停止；不可能、已失败或超限的目标把控制权交回用户，而不是模型自述完成。
- 权限有边界：s03 的权限规则与审批流水线、s04 的 hook 扩展点。

最小试用方式：先跑通 s01，再挑一个与你当前痛点对应的章节（上下文爆了就 s08，目标总漂移就 s17，权限失控就 s03），把它抄进自己项目。做法 B 的话，先把 harness 五件套清单填一遍，跑一个真实小任务。
试多久：建议小范围试，按 README Quick Start 从 s01 逐章跑通到 s17 再定。
注意：s05 有一句“先列步骤，完成率翻倍”，README 未给数据来源，不能当已验证指标。

## 常见坑
- 混用新旧两条线章节号：旧 12 课保留在 `docs/` 和 `agents/`，新 17 课是主线，README 有映射表。
- 只读 README 不跑 `code.py`：每章 `code.py` 才是独立可运行实现。
- 把 harness 当成拖拽式工作流 / 无代码 AI Agent 平台 / prompt 链编排库：仓库明确说这类只是“塞了一个 LLM 的 Rube Goldberg 机器”。
- 试图改主循环加功能：原则是循环保持不变，新工具往分发表加 handler，扩展点靠 hook。
- 没配 `ANTHROPIC_API_KEY` 就跑；跑模型会产生调用费用。
- 把 s05 的“完成率翻倍”当成结论——README 未给数据来源。
- 不区分“模型能力”和“harness 职责”：Agency 来自模型训练，不是来自外部代码编排；harness 只是给模型一个可操作的环境。
- 每章实现细节未随 README 给出，效果主张缺数据；不要直接全量上生产。

## 证据与来源
- 本手册全部步骤与代码来自 `shareAI-lab/learn-claude-code` 的 README 与目录结构（给定指标：77,855 stars，MIT 许可）。
- `Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions` 与最小 agent loop 代码为 README 原文。
- 17 章机制清单（s01→s17）、旧 12 课位置（`docs/`、`agents/`）、Kode CLI、姊妹仓库 `claw0` / OpenClaw 的 Heartbeat 与 Cron、web 端命令均为 README 所述。
- s17 的“独立评估器审查每一次提议的停止”是可对照的验证机制；s05 的“先列步骤，完成率翻倍”README 未给数据来源，只是作者主张。
- 仓库效果主张缺数据，因此结论是建议小范围试：先按 README Quick Start 从 s01 逐章跑通到 s17，再决定是否纳入工作流。

## 依据的调研

- [shareAI-lab/learn-claude-code](../research/radar/2026-10-01/526-shareai-lab-learn-claude-code.md)：值得一试，建议小范围试：按 README 的 Quick Start 从 s01 逐章跑通到 s17，并把其中的 Harness 五件套（Tools/Knowledge/Observation/Action/Permissions）与最小 agent loop 当作给真实工作搭环境的检查清单和骨架。理由是它给的是可克隆、可运行、可复制的具体步骤与代码，而不只是观点；但每章实现细节未随 README 给出，效果主张也缺数据，先试再定。
