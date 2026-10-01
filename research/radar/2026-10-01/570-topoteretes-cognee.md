# topoteretes/cognee

- 结论：**值得一试**。可以小范围试：按 README 的 Python/CLI 快速上手路径先跑通「跨会话长期记忆」，再通过 Claude Code 插件或 MCP 接进现有 agent 做 1–2 周对照试用，判断能否减少重复交代上下文。理由：原文给出了可直接复制的安装、代码与插件命令，属于可照做的具体流程；但其效果数据为自报基准，且单 Postgres 图存储与本地 GLiNER 抽取器均明确标注为 demo，尚不足以直接写入手册作为推荐配置。
- 原文：https://github.com/topoteretes/cognee
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T13:26:32.268Z

## 是什么

Cognee 是一个开源 AI 记忆平台，为 agent 提供跨会话的持久长期记忆：把文档、代码、会话转成自托管的知识图谱，供 agent 检索复用。核心操作有四个：`remember`（写入永久记忆或指定 session 的会话记忆）、`recall`（检索上下文与答案，可自动路由或指定检索策略）、`improve`（富化记忆、应用反馈、把会话知识桥接进图谱）、`forget`（删除单条或整个 dataset）。

它可以在**不配 LLM key 的情况下本地运行**：用本地 GLiNER 模型做抽取、本地 embedding 模型做向量化（首次使用时下载），依赖 CPU；文本摄取、检索、会话存储在无 LLM 时可用，依赖 LLM 的改进阶段会自动跳过。生成式回答、视觉/转写类媒体处理需要额外配置 LLM。

接入面覆盖：Claude Code 插件、Codex 插件、OpenClaw 插件、Cursor/Cline 等 MCP 客户端、Python/TypeScript/Rust SDK、REST API。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提：Python 3.10–3.14。以下 1–2 步不需要任何 API key。**

### 1. 安装

```bash
uv pip install "cognee[gliner]"
```

`gliner` extra 提供未配置 LLM key 时使用的本地抽取模型。也可用 pip 或其它 Python 包管理器安装。

### 2. 无 LLM 本地跑通「写入 + 检索」

前提：第 1 步已完成；首次运行会下载本地抽取与 embedding 模型。保存为 `quickstart.py` 后 `python quickstart.py`：

```python
import asyncio

import cognee


async def main():
    # Extract a knowledge graph and embed the text with local models.
    await cognee.remember(
        "Marie Curie was born in Warsaw and worked at the University of Paris.",
        dataset_name="local_quickstart",
    )

    # Retrieve the matching source text; no LLM generates an answer.
    results = await cognee.recall(
        "Where was Marie Curie born?",
        datasets=["local_quickstart"],
    )
    for result in results:
        print(result)


if __name__ == "__main__":
    asyncio.run(main())
```

同一流程的 CLI 等价写法：

```bash
cognee-cli remember "Marie Curie was born in Warsaw." -d local_quickstart
cognee-cli recall "Where was Marie Curie born?" -d local_quickstart
```

注意：无 LLM 时 `recall` 返回的是匹配到的源文本片段，不生成答案。

### 3. 不下载模型，先看预置图谱 demo

前提：基础 `pip install cognee` 即可，无需 API key。

```bash
cognee-cli demo
```

该命令加载内置样例数据、跑关键词检索。要看自己数据建的图，回到第 2 步。

### 4.（可选）配置 LLM 以得到生成式回答

```python
import os

os.environ["LLM_API_KEY"] = "YOUR OPENAI_API_KEY"
```

或按仓库 `.env.template` 建 `.env`。设了 key 之后，Cognee 默认用 OpenAI 做语言模型与 embedding，处理与回答会发起 provider 调用。其它 provider、本地 Ollama 模型见官方文档。

### 5. 给已有 agent 接上记忆（Claude Code）

```bash
claude plugin marketplace add topoteretes/cognee-integrations
claude plugin install cognee-memory@cognee
```

之后按插件配置指南选择本地或远程记忆。

### 6. 给已有 agent 接上记忆（Codex）

先打开 hooks，用 CLI：

```bash
codex features enable hooks
```

或改 `~/.codex/config.toml`：

```toml
[features]
hooks = true
```

再加 marketplace 与插件：

```bash
codex plugin marketplace add topoteretes/cognee-integrations --ref main
codex plugin add cognee@cognee
```

### 7.（可选）本地 UI 查看安装

```bash
cognee-cli -ui
```

前提：UI 启动器需要 Node.js/npm；其 MCP 服务需要 Docker。

### 8.（可选）Docker 跑 API demo

```bash
docker run --rm -it -p 8000:8000 \
  -e LLM_API_KEY="sk-..." \
  -e ENABLE_BACKEND_ACCESS_CONTROL=false \
  -v cognee_storage:/cognee-storage \
  cognee/cognee:main
```

要点：`ENABLE_BACKEND_ACCESS_CONTROL=false` 是单用户/本地姿态；不设它时 API 默认多租户，每个 `/api/v1` 调用都需要已认证用户。想保留鉴权则设 `DEFAULT_USER_PASSWORD`。`--rm` 会在退出时丢弃容器内数据，`-v cognee_storage:/cognee-storage` 命名卷用于跨运行保存记忆。该镜像内置 GLiNER 运行时，无 LLM key 也能做文本摄取与检索；想要生成式回答再设 `LLM_API_KEY`。

### 9.（可选）从源码跑 API + UI + MCP

前提：已 clone 仓库并进入目录，已把 `.env.template` 复制为 `.env` 并配置好 provider。

```bash
docker compose --profile ui --profile mcp up
```

默认端口：API 8000、UI 3000、MCP 8001。超出本地 demo 的部署需自行配置鉴权、持久化存储与兼容后端。

### 10.（可选，谨慎）单 Postgres 承载整个记忆层

自 cognee 1.0 起，关系型元数据、PGVector、图状态可跑在一个 Postgres 实例里，省掉图数据库 + 向量库 + Redis + 关系库的多组件栈。但原文明确警告：**用 Postgres 作图存储目前是 demo 特性，生产版本是授权产品**。仅建议在 demo 场景验证。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**
原文给出的、平时未必交给 AI 的做法：把文档、会话、工单、代码、agent 工作记录汇入同一份共享记忆，构建「Company Brain」（公司大脑），让团队和 agent 能把一个决策与背后的讨论、实现关联起来；以及把会话中学到的有用经验「蒸馏」成持久知识，供另一个会话检索（session distillation）。跨运行保留项目上下文、历史决策、修复方案与学到的规则。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
- 只要检索到证据、不需要生成答案 → 无 LLM 本地模式即可（本地 GLiNER 抽取 + 本地 embedding，CPU 运行）。
- 要生成式回答、要处理需要视觉或转写模型的内容 → 必须配置 LLM（默认 OpenAI，也支持其它 provider 和本地 Ollama）。
- 已在用 Claude Code / Codex / Cursor / Cline / OpenClaw → 走对应插件或 MCP 接入，而不是自己从 API 拼。
- 自己写 Python / TypeScript / Rust 应用或走 HTTP → 分别用对应 SDK / REST API。
- 原文明确区分：内置 GLiNER 抽取器是小模型流水线的 demo，更高精度、更广标签覆盖的生产版需要联系厂商；单 Postgres 图存储也是 demo，生产版是授权产品。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
- 供给内容：文档、代码、会话（以及原文提到的工单、会议记录、数据库导出等多来源）。
- 组织方式：`dataset_name` 划定记忆集合，检索时用 `datasets=[...]` 指定；带 session ID 时写入会话记忆而非永久记忆；可用自定义数据模型与本体（ontology）把记忆结构化到应用需要的实体与关系上。
- 环境条件：Python 3.10–3.14；无 LLM 时需能下载本地抽取与 embedding 模型；Docker/Postgres 视部署方式；持久卷（如 `cognee_storage`）保证跨运行不丢记忆；多租户场景需要开启访问控制并配置已认证用户或 `DEFAULT_USER_PASSWORD`。
- 反馈回路：`improve` 负责富化记忆、应用反馈、把会话知识桥接进图谱；`forget` 用于删除特定条目或 dataset；`external_metadata` 会打到每个 chunk 上并出现在混合检索中，可用来携带来源信息。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
原文没有给出时间/事件/状态触发的具体规则或调度配置。能对应上的只有两点：Codex 侧需要先打开 **hooks** 才能装记忆插件，说明存在事件钩子入口；以及 `improve` 把会话中「被接受的」经验固化进永久记忆这一流程隐含一个可自动化的沉淀动作。触发频率、触发条件、失败重试等原文均未说明，需要自行设计。

**5. 效果验证：怎样判断确实改善了结果**
原文给出 BEAM 评测（用合成长上下文对话 + LLM judge 测会话记忆）：

| BEAM 上下文 | 报告分数(0–1) | 范围 |
| --- | --- | --- |
| 100K tokens | 0.79 | 固定混合检索；对一段留出会话的 20 个问题做四轮评测 |
| 10M tokens | 0.67 | 探索性结果；按问题类型路由，在同一问题集上选型并打分，五轮平均 |

原文同时声明：两个设置用了不同会话、不同摄取模型、不同检索选型流程，比较前必须先读方法论、模型、局限与复现说明；报告还记录了 10M 分布式摄取尚存的复现差距。也就是说，这两个分数不能直接当作「用了 Cognee 就更好」的证据，只能作为自己搭评测时的参照。

## 与已有做法的关系（对照给出的清单条目）

清单中有相关条目，且主要是**互补/接入关系**，不是替代关系：

- **Claude Code（adopt）**：Cognee 提供官方 Claude Code 记忆插件（`claude plugin marketplace add topoteretes/cognee-integrations` + `claude plugin install cognee-memory@cognee`），用给 Claude Code 补上跨会话记忆。可视为对现有 adopt 条目的能力扩展。
- **Cursor（watch）、Cline（watch）**：通过 Cognee MCP 接入，属于 MCP 客户端接入路径。
- **OpenClaw（watch）**：有对应插件 `@cognee/cognee-openclaw`（npm）。
- **arXiv（try）**：Cognee 官方研究论文即为 Markovic et al. 2025, arXiv:2505.24478《Optimizing the Interface Between Knowledge Graphs and LLMs for Complex Reasoning》，与该 source 条目同源。
- **Trendshift（watch）**：README 中的 Trendshift 徽章只是榜单展示，无实质研究信息。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的可核对证据**
- 可直接复制的命令与代码：安装命令、`quickstart.py` 全文、CLI 等价命令、`cognee-cli demo`、Claude Code 与 Codex 插件安装命令、Codex hooks 的两处配置、`docker run` 完整参数、`docker compose` 启动方式、`cognee-cli -ui`、默认端口（API 8000 / UI 3000 / MCP 8001）。
- 四个核心操作的定义与文档链接（remember / recall / improve / forget）。
- BEAM 评测分数表（100K = 0.79，10M = 0.67）及其范围说明。
- 一条同行评审性质的产出：arXiv:2505.24478 论文与 BibTeX。
- 版本发布事实：v1.6.0（2026-09-18）无 key 工作流与管线恢复；v1.6.1（2026-09-24）Google Drive/Gmail OAuth 连接器、大图 `/visualize/json` 分块流式、GLiNER 安装器移出事件循环。
- 可运行的示例清单（Company Brain 两个 demo、从 Mem0/Letta/Zep/Graphiti 迁移的 COGX 格式、本地 Ollama、图可视化、示例目录、Docker Compose 与部署模板）。

**只是作者主张、原文未量化或未验证的部分**
- 「给 agent 持久长期记忆」「把决策与其讨论和实现连起来」等价值陈述，没有对比实验或用户数据支撑。
- BEAM 分数为自报，且原文自己声明两个设置不可直接比较、10M 存在复现差距。
- 「运行本地免费、无需 API key」成立的前提是要能下载模型并接受 CPU 推理；未给出延迟、内存占用、吞吐等成本数据。
- 未给出与「不使用任何记忆层」的对照效果，也未给出记忆污染、错误记忆的比率。
- 31250 stars 是仓库热度指标，不是效果证据。

**明确的适用条件与风险**
- 版本跨度与破坏性变更：`dlt` 已成为核心依赖，手工管理依赖时需注意。
- 单 Postgres 图存储是 demo，生产版为授权产品；本地 GLiNER 抽取器是 demo，生产版需联系厂商。两者是「能跑通」与「能上线」之间的明确分界。
- 无 LLM 模式只返回检索到的文本，不生成答案；依赖 LLM 的改进阶段在无 key 时被跳过，意味着记忆质量提升受限。
- 多租户默认开启鉴权，单机 demo 需显式关掉访问控制或配置默认账号密码。
- Docker 不加命名卷则退出即丢数据。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**阶段一：单机跑通（半天）**
1. `uv pip install "cognee[gliner]"`，跑通 `quickstart.py`，确认 `remember` 后 `recall` 能取回原文。
2. 换一段自己的真实材料（如项目决策记录、代码库说明），用 `dataset_name` 建第二个 dataset，重复写入与检索。
3. 跑 `cognee-cli demo` 确认基础包环境正常；跑 `cognee-cli -ui` 看图谱结构是否符合预期。
4. 加 LLM key，对比同一问题在「无 LLM 检索片段」与「有 LLM 生成答案」下的差别，确认生成答案是否忠实于检索到的证据。

**阶段二：接进真实工作流（1–2 周小范围）**
5. 在 Claude Code（或 Codex，需先 `codex features enable hooks`）装插件，指向本地记忆；或对 Cursor/Cline 走 MCP。
6. 选 1–2 个真实的长周期任务（跨会话、需要反复回溯历史决策的任务），前一周不启用记忆，后一周启用，记录差异。

**判断有没有改善的指标**
- 上下文重复成本：新会话中需要重新交代背景的次数/字数是否下降。
- 检索相关性：`recall` 返回的片段中被人工判定为「确实相关且正确」的比例（可抽 20–50 次查询人工打分）。
- 记忆污染率：检索结果里出现过时、错误或来自其它 dataset 的内容的比例（用于判断 `forget`、dataset 隔离、`external_metadata` 是否真的起作用）。
- 会话蒸馏有效性：`improve` 后有价值的会话结论是否可被后续会话稳定召回；把「同一结论问 5 次」作为稳定性抽样。
- 删除正确性：执行 `forget` 后相关内容是否确实不再被召回。
- 成本与延迟：加记忆前后的单次任务耗时、模型调用量变化（无 LLM 模式与有 LLM 模式分开记录）。
- 若要做更严格的对照，用 BEAM 报告（`cognee/eval_framework/beam/REPORT.md`）的方法论、模型、局限与复现说明搭建自己的评测，并如实记录自己的检索配置与问题集，不要直接引用 0.79/0.67 作为自己的结论。
