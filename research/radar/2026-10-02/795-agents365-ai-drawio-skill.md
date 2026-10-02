# Agents365-ai/drawio-skill

- 结论：**值得一试**。建议先在小范围试：按 README 给出的安装与命令，把一两个真实来源（Terraform/K8s 配置、Python 包、SQL DDL、OpenAPI）导入成可编辑 .drawio，并把 diff/校验接入一次 PR，验证增量同步与漂移检测是否真能用。理由：README 提供了可直接照做的安装命令、CLI 调用和提示词样例，但关键的 CI 规则配置、sync 参数细节都在未提供的链接文档里，且核心卖点多为作者自述，缺乏第三方验证。
- 原文：https://github.com/Agents365-ai/drawio-skill
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T07:27:06.297Z

## 是什么

drawio-skill 是一个 Agent Skill（以 SKILL.md 为主，另有可选 MCP server），让智能体把两类输入转成可编辑的 `.drawio` 架构模型：

- **自然语言**：描述即出图，skill 负责规划布局、生成 `.drawio` XML、导出、自检并自动修复（重叠、标签被裁剪、堆叠边），再进入用户反馈循环。
- **真实系统来源**：代码 import 图（Python / JS-TS / Go / Rust）、Python 类继承、Terraform / Kubernetes / docker-compose 配置（含从 `terraform show -json`、`docker inspect`、`kubectl get -o json` 抓取“实际部署”快照）、SQL DDL → ERD、OpenAPI → API 图、AsyncAPI → 事件驱动图、Protobuf → 消息/服务图、GraphQL SDL → 实体图、GitHub Actions / GitLab CI → 流水线 DAG。

除生成与导出外，还宣称支持：增量同步而不丢弃手工布局、从单一模型投影多个视图（executive / system / deployment / data-flow / security）、架构规则校验（Diagram-as-Test）、依赖查询、故障传播模拟、双状态漂移 diff、git 历史时间回放、交互式 HTML 浏览、PPT/动画 SVG/Markdown 等多种再加工。声明兼容 Claude Code、Cursor、Copilot、OpenClaw、Codex、Autohand Code、Hermes 等 Agent Skills 格式的智能体。

## 具体做法（编号步骤，含前提）

**步骤 1：安装 draw.io 桌面 CLI（前提：本机可装桌面软件；版本 ≥ 30 才支持 Mermaid→.drawio 转换与 ELK `--layout`）**

- macOS：`brew install --cask drawio`
- Windows：从 [jgraph/drawio-desktop releases](https://github.com/jgraph/drawio-desktop/releases) 下载安装包
- Linux：从 releases 取 `.deb`/`.rpm`；无头环境需 `sudo apt install xvfb`
- 验证：`drawio --version`
- WSL2 注意：CLI 实际是 Windows 桌面 exe，经 `/mnt/c` 访问，README 称 skill 会自动识别

**步骤 2：安装 skill（前提：使用支持 Agent Skills 的智能体）**

```bash
# 任意智能体（Claude Code、Cursor、Copilot 等）
npx skills add Agents365-ai/drawio-skill -g
```

```bash
# 手动安装示例
git clone https://github.com/Agents365-ai/drawio-skill.git \
  ~/.claude/skills/drawio-skill
```

更新：`skills update drawio-skill`，手动安装则 `git pull`。

**步骤 3：用自然语言出图（前提：完成步骤 1、2）**

直接描述即可，README 给出的可复制提示词样例：

```text
Create a microservices e-commerce architecture with Mobile/Web/Admin clients,
API Gateway (auth + rate limiting + routing), Auth/User/Order/Product/Payment
services, Kafka message queue, Notification service, and User DB / Order DB /
Product DB / Redis Cache / Stripe API
```

```text
Draw a Transformer encoder-decoder for machine translation: 6-layer encoder
with self-attention, 6-layer decoder with cross-attention, input embeddings
(batch × 512 × 768), positional encoding, and a final output projection.
Annotate tensor shapes between layers and color-code by layer type.
```

**步骤 4：从真实来源导入（前提：手上有源码目录 / Terraform / K8s 配置 / SQL / API 定义；Graphviz 可选）**

```bash
python3 scripts/tfimports.py ./infra -o graph.json          # Terraform -> 官方 AWS 图标
python3 scripts/autolayout.py graph.json -o architecture.drawio

# 两个版本的漂移对比，再导出为一个交互式文件
python3 scripts/drawiodiff.py v1.drawio v2.drawio -o drift.json
python3 scripts/drawiohtml.py architecture.drawio -o architecture.html
```

布局依赖 Graphviz（`brew install graphviz` / `apt install graphviz`），README 称仅布局需要，其余功能不依赖它。README 表示完整格式与参数见 `references/autolayout.md`、`references/toolbox.md`（本次未提供）。

**步骤 5：解析正确的官方图标（前提：无，本地执行）**

```bash
python3 scripts/shapesearch.py "aws lambda" --limit 5
# → Lambda (77x93)
#   outlineConnect=0;...;shape=mxgraph.aws3.lambda;fillColor=#F58534;...
```

**步骤 6：AI/LLM 品牌 logo（前提：默认方式渲染时需要网络访问 unpkg CDN；离线用 `--embed`）**

```bash
python3 scripts/aiicons.py "claude" --json      # CDN 引用（默认）
python3 scripts/aiicons.py "openai" --embed     # 内联为自包含 data URI
```

覆盖 321 个 logo（源：lobe-icons，MIT）+ 18 个数据存储品牌（源：simple-icons，CC0）。README 注明 logo 是各所有者的商标，仅用于标识。

**步骤 7：自定义样式预设（前提：有一份样板 .drawio 或图片）**

```text
Learn my style from ~/diagrams/brand.drawio as "mybrand"
```

```text
Draw a microservices architecture using my "corporate" style
```

内置 5 个预设：`default`、`corporate`、`handdrawn`、`colorblind-safe`（Okabe-Ito）、`dark`。README 称会先渲染预览、经用户确认后才保存。

**步骤 8：把校验接入 CI（前提：仓库有 PR 流程；具体 YAML 规则与 Action 配置在 README 未给出，只指向 `docs/CI.md`）**

README 提到的可用命令名为 `diagramctl doctor/build/sync/views/query/test/review/whatif/story/publish/transform`，以及 `validate.py --score` / `--strict`、`prdiff.py`、官方 GitHub Action。具体配置需查看未提供的文档。

**步骤 9：保留手工布局的增量同步（前提：已有 `diagramctl` 生成的图并做过人工微调）**

`diagramctl sync` 更新变更的节点/关系，保留调好的坐标、样式、注释；删除项默认保留为可评审状态。README 未给出该命令的完整参数。

## 对应的研究问题

**1. 能力发现**
把通常手工完成的“架构文档／图维护”整块交给 AI：自然语言直接生成可编辑图、从代码与 IaC 反向出图、白板照片/截图经视觉抽取后由 `raster2drawio.py` 还原为可编辑 `.drawio`、Mermaid 文本转原生 `.drawio`（28 种标准类型，含 mindmap、gantt、timeline、journey、pie、sankey、kanban）。这些在 README 之前很多人不会想到交给 AI。

**2. 任务匹配**
- 以 Agent Skills 形式交付，声明兼容 6 个以上平台（Claude Code、Cursor、Copilot、OpenClaw、Codex、Autohand Code、Hermes），也有可选 MCP server 供 Claude Desktop、Cursor、VS Code、Codex 等 MCP host 调用。
- 任务分工上，README 明显区分两类引擎：LLM 负责从自然语言/源文件理解意图与规划；确定性脚本负责布局与结构（`autolayout.py` 的 Graphviz 放置与正交路由、`seqlayout.py` 的时序生命线与激活条、`c4.py` 的多页 C4 模型、`validate.py` 的确定性 lint）。这提示“生成类任务交给模型、几何与规则类任务交给确定性代码”的匹配方式。

**3. 条件供给**
- 工具/权限：draw.io 桌面 CLI ≥ 30（必需）、Graphviz（布局可选）、`xvfb`（Linux 无头）、`terraform show -json` / `docker inspect` / `kubectl get -o json` 的访问权限（用于抓真实部署状态）。
- 信息：真实来源文件（Terraform、K8s、docker-compose、SQL DDL、OpenAPI/AsyncAPI/Protobuf/GraphQL、CI 配置、代码仓库），或一张白板照片/截图。
- 反馈：设计上内建自我纠错与人工反馈——先导出草稿 PNG 自检并自动修复（最多 2 轮），再进入最多 5 轮的用户反馈循环，直到确认后最终导出。

**4. 主动推进**
README 给出的事件/状态触发场景：CI 中每个 PR 运行架构规则校验（YAML/JSON 规则，如 Internet 到数据库的访问、环、孤岛、信任边界、对比度）并由官方 GitHub Action 强制执行；PR Action 渲染视觉 diff；`drawiodiff.py` 对比两次真实快照（新增绿、删除红、变更橙）做漂移检测；`timelapse.py` 把 git 历史回放成 HTML 播放器、`buildup.py` 做自绘播放。

**5. 效果验证**
- `validate.py` 提供 `--score` 与 `--strict` 门禁；README 称在 CI 中可 regenerate + validate（`--strict` gate）+ headless 渲染。
- `prdiff.py` 在 CI 渲染 PR 视觉差异，便于人工审图。
- 自检环节以读回导出的 PNG 为依据自动修复重叠、裁剪标签、堆叠边。
- README 提到维护中的 Architecture Studio showcase“每个产物由一个脚本再生成，并在测试套件中验证”，属于仓库自证，不是外部评测。

## 与已有做法的关系

清单中的相关条目：

- **Agent skills（adopt）**：本仓库是 Agent Skills 格式的一个具体、功能面很宽的实现，可作为该概念在“架构图/文档维护”场景的落地样例。
- **Claude Code（adopt）**：README 明确列出支持，并给出 `~/.claude/skills/drawio-skill` 的手动安装路径。
- **Cursor（watch）**、**OpenClaw（watch）**、**Hermes（watch）**：README 均明确列为兼容平台。
- **DeepSeek（try）**：README 列举的平台中未出现 DeepSeek，无法据此判断兼容性；不能想当然认为可用。
- 同类替代：README 对比了官方 jgraph/drawio-mcp（Claude Code 插件 `/plugin install drawio@drawio`）及 bahayonghang/drawio-skills、GBSOSS/ai-drawio，并给出“需要代码/IaC/SQL/OpenAPI 导入、AI 品牌 logo、确定性时序与 C4 生成、自检+评审循环、交互式 HTML 时选本工具”的取舍标准；同时指出需要手绘风、diagrams-as-code、自由画布时可换同作者家族的其他 skill。

## 证据与局限

**原文给出的数据/案例：**
- metrics 显示 9,790 stars。
- 自检 2 轮、用户反馈 5 轮；11 种图类型预设；Mermaid 28 种类型；10,000+ 官方 draw.io shape；321 个 AI/LLM logo + 18 个数据存储品牌；transitive reduction 使 asyncio 图从 149 条边降到 46 条；tube-map 示例 JSON 约 20 行。
- 示例图均由该 skill 自己生成（微服务电商、Python logging 类继承、星型/分层/环型拓扑、kanban 路线图、地铁图、serverless AWS、多 provider LLM 应用）。
- 维护中的 `examples/architecture-studio/` 覆盖 code → IR → .drawio、保留手工布局的冲突感知同步、架构 → policy/views/what-if/accessibility Story。

**只是作者主张、未独立验证的部分：**
- 与竞品对比表中的各项“✅”（多平台、自检+自动修复、5 轮评审、官方 shape 搜索本地化等）均由作者自述，无第三方测评或基准。
- “增量同步不破坏手工布局”“漂移检测”“架构规则强制”等关键卖点，在本次提供的 README 中没有给出规则文件格式、`diagramctl sync` 参数或 GitHub Action 的 YAML，只能看到指向 `docs/CI.md`、`references/*.md` 的链接。

**原文内部不一致（需注意）：**
- Highlights 称“11 diagram type presets”，而对比表中写“Diagram presets ✅ 7 types”。具体数量需以仓库文档为准。

**适用条件与风险：**
- 强依赖 draw.io 桌面 CLI，且推荐 ≥ 30 版本；≤ 29 缺失 Mermaid 转换与 ELK 布局。
- Linux 无头需 xvfb；WSL2 需经 `/mnt/c` 调用 Windows exe，作者称自动识别但没有在本文档给出验证方法。
- `aiicons.py` 默认走 unpkg CDN，渲染时需要网络；离线需 `--embed`。品牌 logo 为各公司商标，仅限标识用途。
- Graphviz 仅布局需要，可作为可选依赖。
- 本报告只依据 README，未读取 docs/USAGE.md、docs/CI.md、references/toolbox.md 等实现细节，因此高级能力的可操作性无法完全确认；也没有失败案例、性能数据或成本数据。

## 怎么试、怎么验证

**最小试用（建议 1 天内完成）：**

1. 按步骤 1 装 draw.io CLI 并 `drawio --version` 确认 ≥ 30；按步骤 2 装 skill。
2. 选一个真实但小的目标：一个 Terraform 模块，或一个 10 个文件以内的 Python 包。
3. 跑 `python3 scripts/tfimports.py ./infra -o graph.json` + `python3 scripts/autolayout.py graph.json -o architecture.drawio`（或对 Python 项目用 import 图/类继承），导出 PNG 看一眼。
4. 手工在图里挪动几个节点、加两条注释，保存为 v1。
5. 改一处源码（例如新增一个依赖、删除一个服务），重新生成，再跑 `drawiodiff.py v1.drawio v2.drawio -o drift.json`，看漂移是否只标出这一处变更。
6. 跑 `drawiohtml.py` 生成交互 HTML，给一位同事试用，记录他能否自己找到目标组件和依赖路径。

**判断有没有改善的指标（先记基线再比）：**

- **产出速度**：从“决定要画图”到“评审者认可的可用图”的耗时，对比手工 draw.io / Visio 的基线。
- **漂移检出**：人为做 N 处架构变更，看 diff/校验能检出几处（召回），以及报了几处其实没变的（误报）。
- **同步保真**：`diagramctl sync` 之后，人工调过的坐标/样式/注释是否保留（按被改动的节点数计）。
- **门禁有效性**：故意造一条违反规则的关系（如 Internet → 数据库），确认 `validate.py --strict` 或 CI Action 能拦住 PR。
- **可用性**：生成的 PR 视觉 diff 是否让评审者在 1 分钟内看懂改了什么。
- **成本**：每张图的模型 token/时间开销，以及是否需要人工返工。

**升级为 adopt 的条件**：拿到 `docs/CI.md` 与 `references/toolbox.md` 后，能在自己的仓库里完整复现一条“源 → 图 → 规则校验 → PR 拦截 → 漂移 diff”的流水线，并且在上述指标上相对手工流程有可量化改善，再考虑写进手册。
