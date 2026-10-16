# ztt0216/MyAgent

- 结论：**值得一试**。可以小范围试：按 README 用 OpenAI-compatible 接口（示例里就有 deepseek-chat）把 MyAgent 在本地跑起来，重点验证 Plan Mode 的只读审批和 Skills 自进化能否把反馈沉淀成可复用规则；它给了可照抄的安装、.env、权限模式和反馈写法，但只有作者主张、没有评测数据，先在自己的小任务上跑通再决定是否写进手册。
- 原文：https://github.com/ztt0216/MyAgent
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T17:03:05.359Z

## 是什么

MyAgent（仓库 ztt0216/MyAgent，36 stars，MIT）是一个 Python 实现的通用 **Agent Runtime**。它不是命令行聊天工具，而是把模型推理之外的环节统一收在 Runtime：Agent Loop（模型请求 → tool call 解析 → 权限检查 → 工具执行 → tool result 回写 → 继续推理 → 会话保存）、工具系统与权限控制、长期 Memory、Skills 体系与自进化、MCP 外部工具、子 Agent、会话恢复与上下文压缩。项目自述重点是 **Harness**：模型只负责推理和提出工具调用意图，真正的环境操作由 Runtime 做权限判断、执行、回写和沉淀。README 称其适合学习通用 Agent 底层机制，也适合作为个人 Agent、项目分析助手或领域 Agent 的二次开发基础。

README 给出的核心运行链路（可直接照此理解 runtime 的工作方式）：

```text
用户输入
  -> agents/main.py
  -> Agent.chat()
  -> 构建 Prompt / 检索 Skills / 预取 Memory / 初始化 MCP
  -> 调用 OpenAI-compatible 或 Anthropic-compatible 模型
  -> 模型返回文本或 tool call
  -> Runtime 做权限检查
  -> 执行工具 / Skill / MCP / 子 Agent
  -> tool result 回写模型
  -> 保存 Session
  -> 后台执行 Skill usage tracking 和 online skill evolution
```

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提（第 0 步）**：Python 3.11+、macOS / Linux、Git、ripgrep（可选但推荐）、一个 OpenAI-compatible 或 Anthropic-compatible 的模型接口。

1. 安装依赖（在项目目录内）：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. 配置 `.env`（项目会自动读取当前目录或父目录中的 `.env`）。三选一：

Anthropic-compatible 示例：

```env
APIKEY=sk-your-api-key
API=https://your-host/anthropic
MODEL=claude-sonnet-4-6
```

OpenAI-compatible 示例：

```env
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://your-host/v1
MODEL=gpt-4o
```

通用变量示例：

```env
APIKEY=sk-your-api-key
API=https://your-host/v1
MODEL=deepseek-chat
```

协议判断规则（照此决定填哪种变量）：`API` 或 `--api-base` 路径包含 `/anthropic` 时按 Anthropic-compatible 调用；否则有 OpenAI base URL 时按 OpenAI-compatible 调用；`--model` 会覆盖 `.env` 中的 `MODEL`。

3. 启动 REPL：

```bash
python3 -m agents.main
```

启动后直接输入任务，例如：

```text
阅读这个项目，告诉我 agent loop 是怎么跑起来的
```

4. 执行一次性任务：

```bash
python3 -m agents.main "总结这个项目的目录结构和核心模块"
```

5. 使用 Plan Mode（README 明确适合重构、复杂修复和多文件修改：先只读分析和写计划，用户审批后再执行）：

```bash
python3 -m agents.main --plan "分析 Skills 检索逻辑应该如何优化"
```

REPL 内也可输入：

```text
/plan
```

Plan Mode 下会阻断写操作和 Shell。

6. 恢复最近会话：

```bash
python3 -m agents.main --resume
```

会话自动保存；另有 `/compact` 用于上下文压缩，大工具结果会被截断或持久化。

7. 开启 Skills 自进化（在 `.env` 中明确配置，默认 `BEAR_AUTO_SKILL_EVOLUTION` 已开启）：

```env
BEAR_AUTO_SKILL_EVOLUTION=1
BEAR_AUTO_SKILL_TARGET=project
```

含义：`BEAR_AUTO_SKILL_EVOLUTION=1` 启用在线 Skill 自进化；`BEAR_AUTO_SKILL_TARGET=project` 表示自动新增的 Skill 写入当前项目 `.bear/skills/`。若希望沉淀为所有项目共享的个人 Skill：

```env
BEAR_AUTO_SKILL_TARGET=user
```

对应落盘路径：

```text
project: <project>/.bear/skills/<skill_name>/SKILL.md
user:    ~/.bear/skills/<skill_name>/SKILL.md
```

8. 用允许写文件的权限模式启动（后台自动写入 Skill 需要当前权限模式允许写文件）。推荐：

```bash
BEAR_AUTO_SKILL_EVOLUTION=1 \
BEAR_AUTO_SKILL_TARGET=project \
python3 -m agents.main --accept-edits
```

更激进的模式（README 不建议长期默认使用，因为会跳过确认）：

```bash
python3 -m agents.main --yolo
```

9. 给出可沉淀的反馈。只沉淀稳定、明确、未来同类任务仍适用的规则。

不适合沉淀的例子：

```text
帮我写一篇 500 字政府报告。
```

适合沉淀的例子：

```text
以后写政府报告、工作汇报、调研材料时，默认先给可直接使用的初稿，不要连续追问；结构按“标题、背景、主要情况、问题分析、工作举措、下一步计划”组织，语言要正式克制。
```

适合演化已有 Skill 的例子：

```text
以后这类政府报告还要加入关键数据指标，不能只写概念性表述。
```

自进化链路（README 描述，可据此定位排查点）：

```text
第 N 轮用户任务
  -> Agent 输出结果
  -> 保存 pending extraction window
第 N+1 轮用户反馈
  -> 合并进上一轮 window
  -> online_ingest()
  -> Extractor 抽取候选 Skill
  -> Maintainer 判断 add / merge / discard
  -> create_skill_file() 或 evolve_skill_file()
  -> 写入 SKILL.md
  -> 记录 provenance、usage stats 和版本快照
```

对应核心文件：`agents/agent.py`、`agents/online_skill_evolution.py`、`agents/skills.py`、`agents/skill_evolution.py`。审计产物：`.bear/skill-evolution/usage.jsonl`、`online_provenance.jsonl`、`online_skill_provenance.json`、`skill_usage_stats.json`、`history/`。

10. 跑测试（不调用模型）：

```bash
pip install -r requirements.txt pytest
python -m pytest -q
```

README 称测试覆盖权限模式（plan / acceptEdits / dontAsk）、危险命令检测、权限规则优先级、编辑前必须先读和 mtime 校验、Skill 加载优先级与 BM25 检索；CI 在 Python 3.11 和 3.12 上运行。

## 对应的研究问题

**1. 能力发现（AI 已能做哪些还没交给它的工作）**：Skills 自进化会从用户明确反馈中抽取未来可复用的规则，并自动新增或合并到项目级 / 用户级 `SKILL.md` —— 这是一种把“这次怎么做对的”变成“以后默认这么做”的机制，可作为发现可委托工作的抓手。子 Agent 提供 `explore`、`plan`、`general` 及自定义类型；MCP 自研 stdio JSON-RPC Client 把外部 MCP Server 工具包装为 `mcp__server__tool`，用于扩展可调用能力的边界。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**：README 明确 Plan Mode 适合重构、复杂修复、多文件修改，采用“先只读分析＋写计划，用户审批后执行”的协作方式；模型接口按 OpenAI-compatible / Anthropic-compatible 双协议适配，按 `API` 路径自动判定；内置工具覆盖读写文件、精确编辑、搜索、Shell、Skill 调用、子 Agent 和 MCP 工具。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**：需要 Python 3.11+、macOS / Linux、Git、ripgrep（可选）、一个模型接口及对应 key / base URL / model 名；需要 `.env` 承载配置；自进化需要权限模式允许写文件（`--accept-edits`）；Memory 按项目路径 hash 隔离，保存用户偏好、项目背景、历史决策和参考资料；Skills 分项目级 `<project>/.bear/skills/` 与用户级 `~/.bear/skills/`，并可从用户反馈检索与调用。

**4. 主动推进（可由时间、事件或状态触发并持续完成）**：会话自动保存并支持 `--resume`、`/compact`；后台执行 Skill usage tracking 和 online skill evolution；自进化由“第 N 轮任务 + 第 N+1 轮反馈”合并后触发，无需手动整理；大工具结果做截断或持久化，避免上下文被单次结果撑爆。

**5. 效果验证（怎样判断确实改善了结果）**：审计产物 `.bear/skill-evolution/usage.jsonl`、`online_provenance.jsonl`、`online_skill_provenance.json`、`skill_usage_stats.json`、`history/` 可用于查 Skill 的来源、使用统计和版本快照；`python -m pytest -q` 覆盖权限模式、危险命令检测、编辑前必须先读与 mtime 校验、Skill 加载优先级与 BM25 检索；另有 `data/` 评测数据说明，但 README 注明 benchmark 需自行下载，未给出结果。

## 与已有做法的关系

清单中相关条目：**DeepSeek（tool，status: try）**。本项目的 OpenAI-compatible 通用变量示例直接用 `MODEL=deepseek-chat`，说明 MyAgent 可以直接挂到 DeepSeek 这类 OpenAI-compatible 端点上，已有做法可原样复用为它的模型层。其余清单条目没有直接对应关系。

## 证据与局限

- 原文（仓库 README）给出的可核对内容：完整目录结构、端到端运行链路、Skills 自进化链路、审计产物路径、测试覆盖范围与 CI 版本、以及可直接照抄的安装 / `.env` / 启动 / 权限模式 / 反馈写法。
- 属于作者主张、无数据支撑的部分：Runtime “可阅读、可扩展”、适合作为二次开发基础、自进化能稳定沉淀可复用规则等价值判断；README 没有任何 benchmark 分数、任务成功率、耗时或 token 节省数据；没有真实使用案例或前后对比实验；没有展示实际生成 / 合并出的 `SKILL.md` 内容，也没有自进化的命中率或误沉淀率。
- 本次材料仅为仓库 README（source_note 注明“依据仓库 README”），未核对源代码实现，未能验证 README 描述与代码一致。
- 项目规模：36 stars 的个人项目。
- 适用条件：Python 3.11+、macOS 或 Linux；需自备 OpenAI-compatible 或 Anthropic-compatible 接口与 key；自动写 Skill 要求权限模式允许写文件，`--yolo` 会跳过确认，有误改风险；benchmark 需自行下载；测试不调用模型，跑通 pytest 不等于端到端效果已被验证。

## 怎么试、怎么验证

最小试用方式（半天内可完成）：

1. 按“具体做法”第 1–2 步在本机装好并配好 `.env`（没有 Anthropic 接口时，用 DeepSeek 等 OpenAI-compatible 端点，即 `API` + `MODEL=deepseek-chat` 的通用变量写法）。
2. 跑 `python -m pytest -q`，确认权限、危险命令检测、编辑前读与 mtime 校验、Skill 检索等基础行为正常（注意这组测试不调用模型）。
3. 用 `python3 -m agents.main "总结这个项目的目录结构和核心模块"` 跑一个一次性任务，再用 REPL 跑一个自己真实的小任务，人工记录输出质量、是否越权改文件、大致耗时。
4. 用 `python3 -m agents.main --plan "..."` 跑一个多文件 / 重构类任务，确认它确实先只读分析并写计划、审批后才动文件，且 Plan Mode 下写操作和 Shell 被阻断。
5. 开自进化：`BEAR_AUTO_SKILL_EVOLUTION=1 BEAR_AUTO_SKILL_TARGET=project python3 -m agents.main --accept-edits`，用 README 里“以后写政府报告……”式的反馈，然后检查 `<project>/.bear/skills/` 下是否新增 / 合并了 `SKILL.md`，以及 `.bear/skill-evolution/` 下是否留下 provenance、usage stats 和 `history/` 快照。
6. 之后再提一个同类任务，**不重述**已沉淀的规则，看输出是否自动遵守。

判断有没有改善的指标（建议试用前先定好）：

- 过程类：`pytest` 是否全通过；Plan Mode 是否确实阻断写操作；`--resume` 能否恢复上次会话；自进化是否按 add / merge / discard 正确落盘；审计 jsonl 是否新增记录且能对上这一次反馈。
- 结果类：同类任务在“沉淀前 / 沉淀后”的输出是否逐条符合已沉淀规则（按规则逐条人工打分）；重复交代同一规则的次数是否下降；长任务中是否因 `/compact`、结果截断而不再撞上下文上限；越权写文件、误执行危险命令的次数是否为零。
- 注意事项：没有官方评测结果，必须用自己的任务集做前后对比；样本要小但指标要事先固定，避免把一次好结果当成普遍改善；对比时保持模型、任务、提示词不变，只改是否开启自进化这一项。
