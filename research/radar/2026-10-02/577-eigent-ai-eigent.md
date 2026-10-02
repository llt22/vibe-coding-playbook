# eigent-ai/eigent

- 结论：**值得一试**。建议小范围试：按 README 给出的命令把 Eigent 桌面端跑起来，先在一个周期性、输入输出明确的任务（如每月汇总 PR 生成报告）上验证「多 agent 并行 + 定时自动化」是否真能减少人工；理由是原文给了可照做的安装与更新命令、明确的单 agent/多 agent 分工和本地部署选项，但完全没有给效果数据，所以不能直接 adopt。
- 原文：https://github.com/eigent-ai/eigent
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T07:28:37.054Z

## 是什么

Eigent 是一个开源（Apache 2.0）的 "Cowork" 桌面应用，基于 CAMEL-AI 的多智能体框架构建，目标是把复杂工作流变成可自动化的任务。核心卖点：多智能体协作（Workforce）、单智能体（Single Agent Harness）、定时自动化（Automation）、本地部署、模型无关（可接云 API、企业网关或本地推理）、MCP 与 Skill 集成、内置浏览器与终端工具包。技术栈：后端 FastAPI + uv + Uvicorn + CAMEL，前端 React + Electron + TypeScript + Tailwind/Radix，流程编辑器用 React Flow。仓库当前约 15,457 stars，README 有中/日/葡等多语言版本。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **快速体验（云端连接模式）**  
   前提：本机已装 Node.js 18–22 和 npm。  
   注意：此模式会连接 Eigent 云端服务，需要注册账号，不是完全本地。
   ```bash
   git clone https://github.com/eigent-ai/eigent.git
   cd eigent
   npm install
   npm run dev
   ```

2. **拉取新代码后同步前后端依赖**（README 专门列出，容易漏）  
   前提：已在项目根目录，后端使用 uv 管理 Python 依赖。
   ```bash
   # 1. Update frontend dependencies (in project root)
   npm install

   # 2. Update backend/Python dependencies (in backend directory)
   cd backend
   uv sync
   ```

3. **本地部署（README 推荐方式）**  
   前提：希望完全独立运行、数据不出本机、不需要云账号。README 只给了入口文档链接，未在正文给出具体命令：  
   `./server/README_EN.md`（Local Deployment Guide）。按 README 描述，这套部署包含：本地后端服务（完整 API）、本地模型集成（vLLM、Ollama、LM Studio 等）、与云服务完全隔离、零外部依赖。**具体命令需打开该文档，本次输入未包含。**

4. **选择协作模式**  
   - 单 agent：聚焦型任务（research、写作、debug、操作），在桌面工作区里直接对话执行。  
   - Workforce（多 agent）：把复杂多步任务拆给多个专门 agent，并行分工执行。  
   依据：README 把二者列为两套并行能力，未给出「何时用哪个」的判定规则，需要自己在试用中定阈值。

5. **接模型（模型无关）**  
   可接三类：云端 API、企业网关、本地推理。已有用例演示了用 Ollama 跑本地模型（DeepSeek）完成月度报告。前提是模型侧自己要准备好（本地要跑起 vLLM/Ollama/LM Studio 之一）。

6. **配置工具与能力入口**  
   README 列出 MCP Integration、Skill Integration、内置 Browser & Terminal Toolkits，但没有给出配置示例或字段说明，需查文档站 `https://docs.eigent.ai`。

7. **设置自动化（Automation）**  
   README 描述为「Schedule recurring workflows and let agents run tasks at the right time」——把周期性工作流排进计划，人离开时任务继续跑。原文未给调度配置的具体格式。

8. **照抄官方用例库里的场景**（原文只给标题+描述+链接，没有步骤，需要点进官网 guide 才能照做）：  
   - 并行建 10 个中文新年主题 HTML5 游戏（含计分、递增难度、重开流程）  
   - 用 Gemini 建 3D Snow Bros 平台跳跃游戏  
   - 用 Ollama 上的 DeepSeek 自动生成月度开发报告：读一个月 GitHub PR → 生成 Word 摘要 → 准备 Slack 发布更新  
   - 整理桌面文件：让 Eigent 检查混乱的桌面并按更有用的结构归类  
   - 用 Gemini 审计 ML CI 失败：多 agent 拉日志、比对 golden values、追溯证据、委派深度推理、产出结构化审计报告  
   - 工单系统集成与报表：把本地工单数据导入浏览器端管理系统，再生成带图表和可视摘要的统计报告

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 的用例库给出了几个「原本不一定会想到交给 AI 的整段工作流」——月度 PR 汇总→Word→Slack 发布链、CI 失败审计、工单数据导入+图表报告、桌面文件整理、批量产出 10 个游戏。这些是「整条流水线交出去」而不是「单点问答」的样本。
- **任务匹配**：原文明确区分单 agent（聚焦任务）与 Workforce 多 agent（复杂多步、并行分工）。模型侧给了三类来源（云 API / 企业网关 / 本地推理），并在月度报告用例里示范了「需要数据不出本地 → 用 Ollama 上的本地模型」。工具侧对应 MCP、Skill、浏览器与终端工具包。
- **条件供给**：本地部署需要自备 Node.js 18–22、npm、Python 依赖（uv sync）；模型要自己接（云 API 密钥、企业网关或本地推理服务）；能力扩展靠 MCP 与 Skill；安全条件是「文件、凭据、上下文留在本机」（本地部署模式下）。
- **主动推进**：有 Automation 模块，按计划触发周期性工作流，agent 在人离开后继续执行；月度开发报告是原文唯一具体的周期触发案例。事件或状态触发的机制原文未说明。
- **效果验证**：原文没有给出任何指标、基准或 A/B 数据。stars 数只反映热度，不是效果证据。这一项是明显缺口，需要自己定义验证方式（见最后一节）。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中有两条相关：

- **DeepSeek（status: try）**：README 的用例「Automate Monthly Dev Reports with DeepSeek via Ollama」把 DeepSeek 作为本地推理模型、Eigent 作为编排与执行壳。二者是互补关系——DeepSeek 提供模型能力，Eigent 提供多 agent 分工、浏览器/终端工具和定时调度。若已在试 DeepSeek，可以把 Eigent 当作它的一个「工作流载体」候选。
- **Context engineering（status: study）**：Eigent 的 Roadmap 明确把 Context Engineering 列为一个专题，子项包括 Prompt caching、System prompt optimize、Toolkit docstring optimize、Context compression。这给「context engineering 在真实 agent 产品中怎么落地」提供了具体观察点，但注意这些是 roadmap 未完成项，不能当成现有能力。
- 其余清单条目无相关。

另外，初筛理由提到它是 Claude Cowork/Codex 的替代或迁移参考。README 只说明定位相似（桌面 Cowork + 多 agent + 本地部署 + 模型无关），未提供任何与 Claude Cowork/Codex 的对比数据、迁移路径或兼容性说明，因此这一点只能作为选型方向，不能当作已证实的结论。

## 证据与局限

**原文给出的证据**：
- 可复制的快速开始命令、依赖更新命令（前端 npm、后端 uv sync）。
- 明确的架构与技术栈（FastAPI / CAMEL / Electron / React / React Flow）。
- Apache 2.0 许可、15,457 stars、多语言 README、官方文档站与用例库链接（每个用例带 demo 视频和 guide 链接）。
- 本地部署的定位描述：本地后端、本地模型集成（vLLM/Ollama/LM Studio）、零外部依赖。

**只是作者主张、没有数据支撑的部分**：
- 「boosts productivity」「exceptional productivity」「turn your most complex workflows into automated tasks」等效果声明，无任何量化。
- 「Zero Setup - No technical configuration required」与后文要求 Node.js 18–22 + npm + uv sync 的实际步骤相互矛盾，应按后者准备环境。
- 用例只有标题、一句描述和链接，没有耗时、成功率、人工介入比例，无法据此判断效果。

**适用条件与局限**：
- 本材料是仓库 README，不是完整文档。本地部署的具体命令在 `server/README_EN.md`，未包含在输入中；MCP/Skill 配置在文档站，也未包含。
- 所有用例的可照做步骤都在官网 guide 页面，本次输入只有链接和一句概括，因此「步骤级」信息只能停留在安装与运行这一层。
- Roadmap 中的 Context Engineering、多 agent 固定工作流、多轮对话、Document Toolkit 动态编辑等均为未完成项，不能算作现有能力。
- 前提条件：需要桌面环境；Node.js 18–22、npm、Python 环境（uv）；使用云端快速开始模式需注册账号。

## 怎么试、怎么验证

**最小试用方式**：
1. 用第 1 步的 Quick Start 命令在单机上跑通（先不折腾本地部署），确认桌面端能启动、能对话、能调用工具。
2. 选一个**周期性、输入输出边界清楚**的任务做单点验证，优先选 README 里已有 demo 的场景（如月度 GitHub PR 汇总→生成 Word→准备 Slack 更新），这样有参照物。
3. 跑通流程后，再把模型换成 Ollama 上的本地模型，验证「数据不出本机」这条是否成立（README 称本地部署模式下文件/凭据/上下文留在本机）。
4. 如果流程有效，再试 Workforce 多 agent 并行模式，对比同一任务在单 agent 下的表现。
5. 最后才试 Automation 定时调度，观察连续几个周期是否可靠触发。

**判断有没有改善的指标**（以下指标是本文建议的，原文未提供任何指标）：
- 人工耗时对比：从「全程自己做」变成「审核产出物」的时间差。
- 首次通过率：agent 的产出需要人工返工或重做的比例。
- 调度可靠性：自动触发是否按计划发生，漏跑/失败次数。
- 数据边界：本地部署模式下，能否确认文件与凭据未被送出本机。
- 失败可诊断性：任务失败时能否从日志/步骤回放定位原因。

**判定标准建议**：只有在第 2 步的周期任务上做到「人工时间明显下降且返工比例可接受」，才考虑把 Eigent 纳入日常工作流；在此之前保持 try 状态，不要写进手册作为推荐做法。
