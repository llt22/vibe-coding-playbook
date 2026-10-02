# crewAIInc/crewAI

- 结论：**值得一试**。建议小范围试：照着 README 的 "uv 安装 → crewai create crew → 改 agents/*.jsonc 与 crew.jsonc → crewai install/run" 链路，先把手头一个"多步资料整理→成文"的工作改成 researcher + reporting_analyst 两个角色的 Crew，并把产物落盘到 output/ 文件；因为原文给出了完整可复制的命令、目录结构和配置示例，可照做，但它本质是需要写代码、配环境的开发框架，效果只有作者主张、没有对比数据，先试一步再决定是否推广。
- 原文：https://github.com/crewAIInc/crewAI
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T06:27:06.738Z

## 是什么

CrewAI 是一个开源（MIT 许可）的 Python 多智能体编排框架，围绕两个互补的抽象：

- **Crews**：角色化 AI 智能体组成的团队，每个 agent 有角色、目标、背景、LLM、工具，通过分工协作完成复杂任务，强调自主决策与动态委派。
- **Flows**：事件驱动的工作流，提供对执行路径的精细控制、任务间状态管理、条件分支，并能把单个 LLM 调用与普通 Python 代码混在一起。

官方定位是"多智能体自动化框架"，支持工具、memory、knowledge、checkpointing、异步执行、MCP/A2A。项目脚手架是 JSON 优先的（`agents/*.jsonc` + `crew.jsonc`），也保留旧式 Python/YAML 脚手架（`--classic`）。本次输入来自仓库 README，原文在 examples 与 FAQ 后半段被截断。

## 具体做法（编号步骤，可直接照抄）

前提：需要 Python >=3.10 且 <3.14，并具备命令行操作和基本 Python 编辑能力。

1. 确认 Python 版本

```bash
python3 --version
```

2. 安装 UV（CrewAI 用它管理依赖）

macOS/Linux：
```shell
curl -LsSf https://astral.sh/uv/install.sh | sh
```
没有 curl 时：
```shell
wget -qO- https://astral.sh/uv/install.sh | sh
```
Windows：
```shell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

3. 安装 CrewAI CLI 并验证

```shell
uv tool install crewai
```
出现 PATH 警告时：
```shell
uv tool update-shell
```
Windows 上若遇 `chroma-hnswlib==0.7.6` 构建错误（`fatal error C1083: Cannot open include file: 'float.h'`），需安装 Visual Studio Build Tools 并勾选 *Desktop development with C++*。验证：
```shell
uv tool list
```
升级全局 CLI：
```shell
uv tool install crewai --upgrade
```
（注意：这条只升级全局 CLI，项目虚拟环境内的版本升级要另看官方 upgrading-crewai 文档。）

4. 创建项目

```shell
crewai create crew <project_name>
```
生成的结构：
```
my_project/
├── .gitignore
├── .env
├── agents/
│   └── researcher.jsonc
├── crew.jsonc
├── knowledge/
├── pyproject.toml
├── README.md
├── skills/
└── tools/
```
需要旧式结构（`crew.py`、`config/agents.yaml`、`config/tasks.yaml`）时：
```shell
crewai create crew <project_name> --classic
```

5. 定义智能体：编辑 `agents/*.jsonc`，写清 role / goal / backstory / llm / tools / settings

```jsonc
{
  "role": "{topic} Senior Data Researcher",
  "goal": "Uncover cutting-edge developments in {topic}",
  "backstory": "You're a seasoned researcher who finds relevant information and presents it clearly.",
  "llm": "openai/gpt-4o",
  "tools": ["SerperDevTool"],
  "settings": {
    "verbose": true
  }
}
```
第二个角色：
```jsonc
{
  "role": "{topic} Reporting Analyst",
  "goal": "Create detailed reports based on {topic} data analysis and research findings",
  "backstory": "You're a meticulous analyst who turns complex data into clear, concise reports.",
  "llm": "openai/gpt-4o",
  "settings": {
    "verbose": true
  }
}
```

6. 定义任务与流程：编辑 `crew.jsonc`。`{placeholder}` 占位符可用在 agent 与 task 文本里，缺值会在 `crewai run` 时被 CLI 提示补全。

```jsonc
{
  "name": "Latest AI Development",
  "agents": ["researcher", "reporting_analyst"],
  "tasks": [
    {
      "name": "research_task",
      "description": "Conduct thorough research about {topic}. Find recent, relevant information.",
      "expected_output": "A list with 10 bullet points of the most relevant information about {topic}.",
      "agent": "researcher"
    },
    {
      "name": "reporting_task",
      "description": "Review the research and expand each topic into a full section for a report.",
      "expected_output": "A markdown report with the main topics, each with a full section of information. No fenced code blocks around the whole document.",
      "agent": "reporting_analyst",
      "context": ["research_task"],
      "output_file": "output/report.md",
      "markdown": true
    }
  ],
  "process": "sequential",
  "verbose": true,
  "inputs": {
    "topic": "AI Agents"
  }
}
```
关键字段：`context` 把上游任务结果喂给下游；`output_file` 指定落盘路径；`markdown: true` 输出 Markdown；`process` 可换成 hierarchical——框架会自动加一个 manager 来规划、委派并验证结果。另有 `tools/` 下的自定义工具（以 `"custom:<name>"` 引用）、`knowledge/` 知识文件、`skills/` 技能文件。

7. 配密钥：在 `.env` 里填模型提供商的 API key；若用网页搜索工具，填 Serper.dev 的 key

```
SERPER_API_KEY=YOUR_KEY_HERE
```

8. 安装依赖并运行（在项目目录内）

```shell
crewai install
crewai run
```
需要额外包用 `uv add <package-name>`。预期：控制台打印执行过程，项目根目录生成 `output/report.md`。模型默认走 OpenAI API，也可按官方 LLM connections 文档接本地模型（Ollama、LM Studio）。

9. 需要精确控制时，把 Crew 包进 Flow 做事件驱动编排

```python
from crewai.flow.flow import Flow, listen, start, router, or_
from crewai import Crew, Agent, Task, Process
from pydantic import BaseModel

class MarketState(BaseModel):
    sentiment: str = "neutral"
    confidence: float = 0.0
    recommendations: list = []

class AdvancedAnalysisFlow(Flow[MarketState]):
    @start()
    def fetch_market_data(self):
        self.state.sentiment = "analyzing"
        return {"sector": "tech", "timeframe": "1W"}

    @listen(fetch_market_data)
    def analyze_with_crew(self, market_data):
        analyst = Agent(role="Senior Market Analyst",
                        goal="Conduct deep market analysis with expert insight",
                        backstory="You're a veteran analyst known for identifying subtle market patterns")
        researcher = Agent(role="Data Researcher",
                           goal="Gather and validate supporting market data",
                           backstory="You excel at finding and correlating multiple data sources")
        # ... 定义 Task 与 Crew(process=Process.sequential) 后 kickoff

    @router(analyze_with_crew)
    def determine_next_steps(self):
        if self.state.confidence > 0.8:
            return "high_confidence"
        elif self.state.confidence > 0.5:
            return "medium_confidence"
        return "low_confidence"

    @listen(or_("medium_confidence", "low_confidence"))
    def request_additional_analysis(self):
        self.state.recommendations.append("Gather more data")
        return "Additional analysis required"
```
组合逻辑：`or_` 任一条件满足就触发，`and_` 全部满足才触发，可与 `@start`、`@listen`、`@router` 搭配。

10. 让 AI 编码助手按 CrewAI 规范写代码（减少瞎猜 API）

Claude Code：
```shell
/plugin marketplace add crewAIInc/skills
/plugin install crewai-skills@crewai-plugins
/reload-plugins
```
Cursor、Codex、Windsurf 等：
```shell
npx skills add crewaiinc/skills
```
装上的四个 skill 分别负责：`getting-started`（脚手架、`LLM.call()`/`Agent`/`Crew`/`Flow` 选型、装配 `crew.jsonc`/`main.py`）、`design-agent`（role/goal/backstory/tools/LLM/memory/guardrails）、`design-task`（任务描述、依赖、结构化输出 `output_pydantic`/`output_json`、人工审核）、`ask-docs`（查 CrewAI 文档 MCP 服务器）。

11. 涉密场景关掉默认遥测

```shell
OTEL_SDK_DISABLED=true
```
默认遥测会收集：框架版本、Python 版本、操作系统、agent 与 task 数量、所用 process、是否用 memory/委派、并行还是顺序执行、所用语言模型、agent 角色、可用工具名。若把 Crew 的 `share_crew` 设为 `True`，还会上报任务的 goal、backstory、context 与 output。

## 对应的研究问题

- **能力发现**：原文可迁移的能力形态是"把一次性问答升级为有角色分工的多步任务"。最直接的样例是 researcher（带 `SerperDevTool` 做检索）+ reporting_analyst（成文）产出 Markdown 报告；官方示例仓库另列出职位描述撰写、旅行规划、股票分析、落地页生成、human input on execution 等场景。共同点是把"发一条提示词"改成"多角色 + 多任务 + 落盘产物"。
- **任务匹配**：需要自主决策、动态委派、灵活解法 → Crews；需要精确执行路径、状态管理、条件分支、与普通 Python 代码混排 → Flows；两者可组合。规模上，`sequential` 适合线性流水线，`hierarchical` 会自动加一个 manager 做规划、委派与结果验证。单次模型调用可用 Flow 内嵌的 `LLM.call()`（在 skill 说明中作为选型项出现）。模型侧默认 OpenAI，可换本地模型。
- **条件供给**：需要提供 —— 每个 agent 的 role/goal/backstory/llm/tools；每个 task 的 description/expected_output/agent/context/output_file/markdown；`tools/` 下的自定义工具（以 `"custom:<name>"` 引用）；`knowledge/` 知识文件与 `skills/` 技能文件；`.env` 中的模型与工具 API key；`{placeholder}` 对应的 `inputs` 默认值。结构化输出用 `output_pydantic`/`output_json`，并支持人工审核（human review / human input on execution）。
- **主动推进**：Flows 提供事件驱动触发——`@start` 启动、`@listen` 监听上游完成、`@router` 按条件路由，`or_`/`and_` 组合多条件；配合 Pydantic 状态模型、memory、checkpointing、异步执行。原文**没有**给出基于时间（定时）或外部事件源的调度配置，只有工作流内部的事件与状态触发，因此"长期持续自动跑"的部分需要另找资料。
- **效果验证**：可用的验证信号有 —— `output_file` 是否在指定路径产出文件（如 `output/report.md`）；`expected_output` 作为任务完成的判定描述；结构化输出可用 Pydantic/JSON schema 校验；支持 human input 做人工把关；checkpointing 便于中断恢复；商业版 AMP Suite 提供 tracing & observability（metrics、logs、traces）与实时分析报告。开源 README 本身没有给出准确率、成本或性能数据。

## 与已有做法的关系

- **Claude Code（adopt）**：原文直接给出 Claude Code 安装 CrewAI 官方 skills 的三条命令（`/plugin marketplace add` → `/plugin install` → `/reload-plugins`），这是清单里 Claude Code 与 CrewAI 的明确结合点——把框架最佳实践预置给编码助手。
- **skills.sh（try）**：原文给出 `npx skills add crewaiinc/skills` 安装官方 CrewAI Skills，用途与 skills.sh 一致（把结构化指令装进编码代理）。
- **Cursor（watch）**：原文把 Cursor 列为可用同一条 `npx skills add` 命令的编码代理之一，没有更多细节。
- **Trendshift（watch）**：原文只嵌入了 Trendshift 的仓库徽章（repositories/11239），属于展示位，无方法内容。

## 证据与局限

原文给出的证据：
- 仓库数据：GitHub stars 59,247（本次输入 metrics）。
- 可照做的操作证据：Python 版本要求、三平台 UV 安装命令、`uv tool install crewai`、`crewai create crew` 的目录树、完整的 `agents/*.jsonc` 与 `crew.jsonc` 示例、`crewai install` / `crewai run` 运行步骤、Flow + Crew 的完整 Python 示例、Claude Code 插件命令、`npx skills add` 命令、关闭遥测的环境变量、Windows 构建错误的具体报错与解法。
- 案例线索：官方示例仓库列出 landing page generator、human input on execution、trip planner、stock analysis、job posting，并附视频链接（本次抓取只保留到部分链接）。
- 输出示例：验证安装时应看到类似 `crewai v0.102.0` 的版本行。

属于作者主张、未独立验证的部分：
- "high performance""production-ready""rapidly becoming the standard" 等性能与地位表述，没有第三方基准或数据。
- "over 100,000 certified developers" 是官方口径，本次只有该说法，无法核对。
- AMP Suite 的企业能力（治理、安全、可观测、24/7 支持）只有功能罗列，没有配置细节，且属商业闭源部分，无法照抄落地。

适用条件与风险：
- 需要 Python 环境、命令行操作与编码能力，不是零代码产品；非技术岗位要靠 `npx skills add` 让编码代理代劳。
- 使用外部工具（如 SerperDevTool）需额外 API key 与费用；默认模型走 OpenAI API，也需要自备 key 或改用本地模型。
- 默认开启匿名遥测，敏感任务需设 `OTEL_SDK_DISABLED=true`，并避免 `share_crew=True`（后者会上报 goal/backstory/context/output）。
- 原文未给定时或常驻调度方案，也没有"多智能体相比单条提示词"的效果对比数据。
- README 抓取不完整（examples 链接与 FAQ 后半段缺失），示例代码中部分 agent 参数以省略形式出现，实际使用时需对照官方文档补全。

## 怎么试、怎么验证

最小试用（目标：半天内跑通一条闭环）：
1. 按"具体做法"1–4 步装好 CLI，`crewai create crew` 建一个项目。
2. 挑一个你本来每周都要做的"多步资料整理→成文"任务作为 `{topic}`，保持两个角色：带 `SerperDevTool` 的 researcher 和 reporting_analyst，`process` 先用 `sequential`。
3. 在 `crew.jsonc` 里把 `expected_output` 写成可核对的硬要求（条目数、格式、不许出现整篇代码块等），`output_file` 指向你实际会去看的路径，打开 `markdown: true`。
4. `crewai install` → `crewai run`，检查文件是否生成、内容是否满足 `expected_output`。
5. 第二轮把 `process` 改成 `hierarchical`，同任务对比任务覆盖度与人工修改量。
6. 第三轮把输出改为 `output_pydantic`/`output_json`，看解析是否稳定。

判断有没有改善的指标：
- 产物是否按预期落盘、`expected_output` 的硬性要求（要点条数、结构）是否满足。
- 与自己做一遍相比，返工量有多大（事实错误、漏要点、格式返工）。
- 总耗时（含配置时间）是否低于自己动手；后续每次运行的时间成本是否更低。
- 结构化输出解析成功率、多次重复运行的失败率与失败原因。
- 成本线索：默认遥测本身会记录所用语言模型、agent/task 数量、并行或顺序执行，可用于粗看；更细的 traces 在商业版 AMP 试用中看。
- 判定标准：如果人的角色从"写"变成"审"，事实错误没有增加、总耗时下降，就算改善；如果仍要逐段重写，通常说明任务拆分或 role/expected_output 写得太泛，先改配置再重新评估。
