# aa1143/NamiAgent

- 结论：**值得一试**。建议小范围试：按 README 从 lesson-01 到 lesson-11 逐课运行，并用网页端观察上下文与权限确认；它把工具、上下文、权限、计划、记忆等供给方式做成了可运行快照，但属于教学代码，需在专用工作区验证后再用于实际工作流。
- 原文：https://github.com/aa1143/NamiAgent
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-31T06:18:59.549Z

## 是什么

NamiAgent 是一个零基础 AI Agent 教程，也是一个能在本地跑起来的 Agent。它把 Agent 的核心概括为一个 while 循环：调模型、执行工具、把结果写回上下文、再调模型。课程从 100 行最小循环开始，每课增加一个能力：工具、权限、上下文管理、Skills、MCP、子 Agent、计划、记忆。

仓库提供 `lessons/lesson-01` 到 `lessons/lesson-11` 每课可运行快照，自带网页端：左边看每一步思考和工具调用，右边看本次发给模型的完整上下文。它使用 OpenAI 兼容接口，默认 DeepSeek，只依赖 `openai` 一个包，没有 Agent 框架。作者明确说这是教学代码，不是生产级框架，也不打算和 Claude Code、Codex 比功能。

安全前提：Agent 会真的执行命令、读写文件；第 3 课的权限机制能挡误操作和低成本越界，但挡不住有意的攻击。必须在专门的工作区目录运行，不要把工作区指向主目录。

## 具体做法

1. 准备环境。前提是 Python 3.10+，并有 git 和 pip。克隆仓库并安装依赖：

```bash
git clone https://github.com/aa1143/NamiAgent.git
cd NamiAgent
pip install -r requirements.txt
```

2. 配置模型和工作区。前提是有 OpenAI 兼容接口的 API Key。README 给出的环境变量如下；第 3 课起 Agent 只能操作 `NAMI_WORKSPACE`，第 4 课起状态目录 `NAMI_STATE_DIR` 默认在 `~/.nami-agent`，放在工作区之外：

```bash
export API_KEY=你的模型密钥
# 默认用 DeepSeek；换其他 OpenAI 兼容模型：
# export BASE_URL=https://...   MODEL=模型名

export NAMI_WORKSPACE=~/agent-workspace
mkdir -p $NAMI_WORKSPACE
```

3. 先跑演示模式，不需要 API Key。打开 http://localhost:8765，观察左边每一步的思考与工具调用，右边本次发给模型的完整上下文：

```bash
python web/app.py --demo
```

4. 再用真实模型跑同一个网页端。它会读取 `API_KEY`、`BASE_URL`、`MODEL`；写文件、跑命令这类有副作用的操作会弹窗确认。开头写 `/plan ` 可以让它先出计划，批准后再动手：

```bash
python web/app.py
```

5. 按课程逐课运行和对比。README 的快速开始示例是第 5 课；每个 lesson 目录都是学完该课时的完整代码，可以直接运行，也可以对比相邻两课的差异：

```bash
cd lessons/lesson-05
python agent.py
```

6. 跑测试，不需要 API Key。README 说第 3 课起每课都有测试，第 11 课共 49 个，用假模型跑：

```bash
cd lessons/lesson-11 && pytest -q
```

7. 可选接入聊天软件和 MCP。第 6 课的 `bot.py` 需要 `TG_BOT_TOKEN` 和 `TG_ALLOWED_USERS`；第 8 课起可接入 MCP 服务器，配置放在 `~/.nami-agent/mcp.json`，格式见第 8 课。

8. 把课程中的控制点抽出来复用。按课程表，可复用的点包括：第 3 课权限的“硬规则 → 风险分级 → 人工确认”；第 4 课上下文的“截断 → 清理 → 摘要”和会话持久化；第 5 课 `AGENTS.md` 常驻、技能按需加载；第 7 课定时任务的无人值守预授权和心跳；第 8 课 stdio MCP 客户端；第 9 课子 Agent 用独立上下文、并行只读；第 10 课待办清单和由代码强制只读的计划模式；第 11 课长期记忆每条确认、会话检索。

## 对应的研究问题

- 能力发现：README 展示的能力包包括读写文件、执行命令、接入 MCP、长期记忆、定时任务与心跳、子 Agent、计划。这些可以作为“还能把什么交给 AI”的能力清单，但原文没有给出新的工作场景案例。
- 任务匹配：材料只说明使用 OpenAI 兼容接口、默认 DeepSeek、换模型改环境变量；没有提供不同模型或不同任务如何匹配的对比数据。网页端可以观察上下文，但 README 未给匹配结论。
- 条件供给：这是最有依据的部分。明确需要 `API_KEY`、`BASE_URL`、`MODEL`、`NAMI_WORKSPACE`、`NAMI_STATE_DIR`；第 3 课起限定工作区并做权限确认；第 5 课用 `AGENTS.md` 常驻和技能按需加载；第 6 课有聊天白名单；第 8 课有 MCP 配置。
- 主动推进：第 7 课有 scheduler 和 heartbeat，支持无人值守的预授权和心跳；第 6 课有常驻 bot、聊天确认和白名单。但 README 只给课程名和一句话，未展开具体触发条件、状态机和失败处理。
- 效果验证：第 11 课有 49 个测试，用假模型跑，不需要 API Key；网页端逐次展示思考、工具调用、完整上下文和 token 占用。它能验证功能和上下文变化，但不包含对工作结果改善的指标。

## 与已有做法的关系

清单中相关条目有：Claude Code（adopt）、DeepSeek（try）、DeepSeek Harness（watch）、Hermes（watch）、OpenClaw（watch）。NamiAgent 第 12 课拆解 Claude Code，第 16 课拆解 DeepSeek Harness，第 17 课拆解 OpenClaw 与 Hermes，第 18 课是总对照表；默认模型是 DeepSeek。因此它更像是对已有工具背后机制的教學、复现和对照，不替代上述产品。可以作为采用 Claude Code 或试用 DeepSeek 之前，理解上下文与工具供给方式的配套材料。

## 证据与局限

证据主要来自 README：100 行最小循环、lesson-01 到 lesson-11 每课可运行快照、第 11 课 49 个测试、只依赖 `openai` 一个包、网页端只用 Python 标准库、demo 模式不需要 API Key。仓库指标显示 37 stars，但这不是效果证据。

局限：目前只拿到 README，没有各课正文和完整代码，无法核实每一课的实现质量和细节。作者自述这是教学代码，不是生产级框架，也不打算和 Claude Code、Codex 比功能；权限机制挡不住有意攻击；必须使用专用工作区；界面里展示的思考只是模型写出来的文字，不等于模型内部真实计算过程。第三部分写的是截至 2026 年 10 月的情况，产品更新快，细节应以各自官方文档为准。

## 怎么试、怎么验证

最小试用分三步：第一，不配 API Key，运行 `python web/app.py --demo`，打开 http://localhost:8765，确认能看到每一步思考和完整上下文；第二，在专用工作区配置真实模型，运行 `python web/app.py`，让它写一个 `hello.py` 并运行，确认写文件和跑命令前会弹窗，且文件只落在 `NAMI_WORKSPACE`；第三，运行 `cd lessons/lesson-11 && pytest -q`，按 README 预期是 49 个测试通过，若实际数量不同以实际结果记录。

进一步验证：逐课运行 lesson-01 到 lesson-11，对比相邻快照，确认每一课新增能力可运行；观察上下文面板是否能看到每一块是谁写的、大概占多少 token；换模型时只改环境变量并重跑同一任务，记录是否还能完成。

判断有没有改善，建议记录这些指标：测试是否通过；有副作用的操作是否都触发确认；Agent 是否被限制在工作区内；同一任务在加入权限、计划、上下文管理前后的完成情况、人工确认次数、越界尝试次数和每轮上下文长度。前面三项是 README 能直接支持的功能性指标，后面几项是建议用于实际工作流对比的指标，不是原文给出的数据。
