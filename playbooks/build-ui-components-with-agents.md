# 把检查挪到 agent 交付之前：图表、组件、架构图和前端界面

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 交出来的东西常常“看着完成了”，问题要等人来发现；这份手册给四条可落地的做法，让图表、组件、架构图和前端界面在交付前先过一遍可自动执行的检查。
> 先试这一步：挑一类你最近返工最多的交付物，装上对应技能跑一次真实任务，并在不装技能的情况下让同一个 agent 做同样任务，做一次基线对照；前端项目可以先跑 `npx impeccable install` 加 `npx impeccable detect --json src/` 拿到一份可量化的检测基线。
> 最近修订：2026-10-02

## 解决什么问题

编码 agent 交出来的东西常常“看着完成了”：图表用了没说清的对数轴、把 EU 总量和它的成员国排在一起、来源行靠猜或直接写文件名、图上还留着 TODO；组件会发明路由、引入第二套设计系统、漏掉加载/取消/无效输入/结果恢复这类状态；架构图则可能脱离真实系统、与部署漂移、无法增量维护；前端界面则是“所有模型都在同一套 SaaS 模板上训练”，不加指导就产出同样的坏味道——Inter 字体、紫到蓝渐变、卡片套卡片、彩色背景上的灰字、每个标题上方一个圆角方块图标。这份手册给四条可落地的做法，把“检查”从你手里挪到 agent 交付之前：图表过三道检查、组件写代码前先签契约、架构图从真实来源生成并在合并前校验、前端 UI 先固定持久事实再用确定性规则当门禁。

## 适用与不适用

**适用：**

- 你已经在用支持 Agent Skills 的编码代理（evident-charts 声明支持 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、Antigravity；Bricks 要求支持 skills 的代理；drawio-skill 声明兼容 Claude Code、Cursor、Copilot、OpenClaw、Codex、Autohand Code、Hermes 等 Agent Skills 格式的智能体），并且任务落在四类交付物上：
  - 用数据画图：matplotlib、seaborn、pandas `.plot`、ggplot2、Plotly、Vega-Lite/Altair、D3；输出尺寸有博客、X、LinkedIn、Instagram、幻灯片、报告、手机预设。
  - 实现一个有明确边界的命名组件或有界组合（Footer、FAQ、Task Input、Agent Workspace 这类容易翻车的类型）。
  - 架构图/系统图/架构文档维护：从自然语言、代码、Terraform、Kubernetes、docker-compose、SQL DDL、OpenAPI/AsyncAPI/Protobuf/GraphQL、CI 配置生成可编辑 `.drawio`，或对已有图做增量同步、漂移 diff、规则校验。
  - 用 AI 代理做前端/UI 的设计与实现：项目涉及前端，你想让 agent 在一个已经写进仓库的视觉系统里干活，而不是每来一个新会话重新猜风格。
- 项目已有代码库、组件、设计令牌、框架、路由和响应式约定（Bricks 的前提），或者项目里已有图表脚本与源数据，或者手上有可导入的真实架构来源（Terraform/K8s 配置、SQL、API 定义、代码目录、白板照片/截图），或者一个有前端界面的项目（Impeccable 的前提）。

**不适用：**

- 整产品规划、完整网站定义、纯编辑文案——Bricks 明确不覆盖这些；完整页面它提到用 Pagina（原文提到，但 Pagina 不在本次给定材料里）。
- 复杂领域行为组件（编辑器、数据网格、图表组件、日历、可访问性原语）在项目没有现成方案时，应该用成熟库，而不是让 agent 从零写。
- 架构图如果不想安装 draw.io 桌面 CLI，或没有真实来源/反馈循环，drawio-skill 的核心能力会受限；它也不适合替代手绘风、diagrams-as-code、自由画布（README 建议换同作者家族其他 skill）。
- 前端 UI 的检测规则是确定性的、只覆盖可判定的坏味道；`/impeccable critique` 这类设计评审是 LLM-only 的主观判断，别把它当门禁。Impeccable 也不自带组件库或设计系统，视觉方向要你在持久事实和 `DESIGN.md` 里自己定。
- 想要现成的量化改善数据：四份材料都没有给出效果数字，只能自己跑基线对照。

## 前置条件

- 通用：支持 Agent Skills 的编码代理，并且你已经在用它。
- 图表做法（做法 A）：
  - 本机有项目 Python 环境。
  - matplotlib 走原生 lint 脚本；Plotly、Vega-Lite、ggplot2、D3 通过 headless Chrome 导出 SVG 来做代码级检查。没有 Chrome 时只剩图表规格检查和图像复审。
  - 有源数据（如 CSV）、渲染后的 PNG 或生成脚本——批判已有图表时至少要给其中一项。
- 组件做法（做法 B）：
  - 项目已有路由、组件、设计令牌、框架、响应式约定、依赖、数据模型和测试，并且 agent 能读到。
  - 有真实的产品、资源、公司、法律等目标链接和内容可以复用。
  - 任务边界清晰：一个命名组件或有界组合。
  - 请求里写清组件的责任、上下文、变体、内容、交互状态、技术边界和验证要求。
- 架构图做法（做法 C）：
  - draw.io 桌面 CLI ≥ 30（必需，才支持 Mermaid→.drawio 转换与 ELK `--layout`）；Graphviz 可选，仅布局需要；Linux 无头环境需 `xvfb`。
  - 有真实来源文件（Terraform、K8s、docker-compose、SQL DDL、OpenAPI/AsyncAPI/Protobuf/GraphQL、CI 配置、代码仓库），或一张白板照片/截图；抓“实际部署”快照时需要 `terraform show -json`、`docker inspect`、`kubectl get -o json` 的访问权限。
  - 使用支持 Agent Skills 的智能体；也可选 MCP server 供 Claude Desktop、Cursor、VS Code、Codex 等 MCP host 调用。
  - 默认方式渲染 AI/LLM 品牌 logo 时需要网络访问 unpkg CDN；离线用 `--embed`。
- 前端 UI 做法（做法 D）：
  - 项目涉及前端/UI；本地有 Node——只为 `npx` 本身，skill 和 hook 自带引擎二进制，不需要 Node 运行时。
  - 扫 URL 时用本地已装的 Chrome/Chromium/Edge。
  - 想让检测在编辑时自动跑，需要在 Claude Code、Cursor、Codex、GitHub Copilot、Grok Build 这类支持 provider 原生 hook 的 harness 上安装（Codex 装/更新后要打开 `/hooks` 批准项目 hook；Grok Build 需要项目目录信任）。

## 操作步骤

### 做法 A：让图表在交付前过三道检查

用 evident-charts。它的思路是把“数据核对 → 代码级 lint → 只看渲染图的独立复审”做成自动加载的 Agent Skill。

1. 按你用的代理安装。前提：你已经在用对应代理。预期结果：技能装好，之后代理生成或审阅图表时它会自动加载。

   Claude Code：
   ```text
   /plugin marketplace add rhiever/evident-charts
   /plugin install evident-charts@evident-charts
   ```

   Cursor 及其他 Agent Skills 代理：
   ```text
   npx skills add rhiever/evident-charts
   ```

   GitHub CLI（`--agent` 可选 `claude-code`、`codex`、`cursor`、`gemini`、`github-copilot`、`antigravity`）：
   ```text
   gh skill install rhiever/evident-charts evident-charts --agent claude-code --scope user
   ```

   Codex：
   ```text
   codex plugin marketplace add rhiever/evident-charts
   codex plugin add evident-charts@evident-charts
   ```

   Gemini CLI（`--auto-update` 保持最新）：
   ```text
   gemini extensions install https://github.com/rhiever/evident-charts --auto-update
   ```

2. 确认依赖。技能会在你本机、用你项目的 Python 跑检查脚本：matplotlib 图表需要 matplotlib；其他库通过 headless Chrome 的 SVG 导出检查；没有 Chrome 时只有图表规格检查和图像复审会运行。

3. 照你平时的方式提图表需求即可，技能会自动加载，不用手动调用。原文给的示例提示词：
   ```text
   Chart sales.csv for a LinkedIn post on which regions grew fastest.
   Make one slide showing where our budget went last year.
   Critique this chart and fix it.        (attach the PNG, the script, or both)
   ```

4. 要审已有图表时，把 PNG、脚本或两者一起附上。预期结果：拿到按优先级排序、每条都引用某条规则的修改建议。

5. 知道它会自动做哪些检查——这也直接当你的验收清单：
   - 先查数据：总量与部分混在一起、重复行、占位符代码、未完的月份；
   - 按“想说明的结论”选图形形式：柱、线、表格，或一个大数字；
   - 把结论写成标题，并引用真实发布方而不是文件名；
   - 在代码里 lint 图表（matplotlib 直接做；Plotly、Vega-Lite、ggplot2、D3 通过其 SVG 导出）：文字重叠或被裁切、数据上的标签、不从零开始的柱、双 y 轴、色盲难辨的颜色、对比度过低；
   - 用一个只看得到 PNG 的“新审阅者”复审渲染图，并修掉发现的问题，最多三轮；
   - 对你交给它的任何图表做批判，按优先级排序并引用规则。

6. 让项目风格指南压过默认风格，但有边界。规则带证据等级标签：`[E]` 实验证据、`[P]` 从业者共识、`[T]` 品味或惯例。项目的 style guide 可以覆盖 house look 和任何 `[T]` 规则，但永远不能覆盖 `[E]` 类完整性规则（例如柱状图必须从零开始）。每条规则都在 `references/sources.md` 中被引用。

7. 按安装方式更新：

   | Installed with | Update command |
   |---|---|
   | Claude Code | `claude plugin marketplace update evident-charts && claude plugin update evident-charts@evident-charts` |
   | npx skills | `npx skills update evident-charts` |
   | GitHub CLI | `gh skill update evident-charts` |
   | Codex | `codex plugin marketplace upgrade evident-charts && codex plugin add evident-charts@evident-charts` |
   | Gemini CLI | `gemini extensions update evident-charts`（`--auto-update` 时自动） |

### 做法 B：让组件在写代码前先签契约

用 Bricks 的 component-builder。它的思路是把组件责任、上下文、变体、内容、交互状态、技术边界和验证要求前置成契约，约束 agent 少写脱离项目的 UI 代码。它不提供固定的 React/Vue/CSS 包，也不提供通用设计系统；布局、排版、密度、内容和实现由你的目标产品决定。

1. 安装：
   ```bash
   npx skills add kostja94/bricks --skill component-builder
   ```

2. 给一个有界组件任务，并把项目上下文和验证要求写进请求。原文给的完整示例：
   ```text
   Use component-builder to build the footer for this bilingual SaaS site.

   Read the existing routes, components, design tokens, framework, and responsive conventions first. Reuse project primitives, include the real product, resource, company, and legal destinations, and verify keyboard access on mobile and desktop.
   ```

3. 要求 agent 按六步流程执行：检查页面、邻近组件、令牌、依赖、数据模型、响应式约定和测试；识别组件的规范概念、用户任务、界面和归属边界；只加载匹配的组件参考和共享质量门；从真实内容和上下文选择变体；复用项目原语并实现所需状态和交互；在真实页面中验证组件，而不是只在孤立预览里验证。

4. 对复杂领域行为组件（编辑器、数据网格、图表、日历、可访问性原语），如果项目没有现成方案，要求 agent 使用成熟库。

5. 检查输出边界：不替换项目约定，不引入第二套设计系统，不发明路由/链接/目的地；FAQ 这类要暴露答案给辅助技术；Task Input 这类要实现加载、取消、无效输入、结果恢复等状态。

6. 验证。目标项目按项目已有的测试、lint、类型检查和真实页面交互来验。只有当你是在开发或修改 Bricks 仓库本身时，才运行：
   ```bash
   npm test
   ```

### 做法 C：让架构图从真实来源生成，并在合并前校验

用 Agents365-ai/drawio-skill。它把生成、布局、自检、校验拆开：LLM 负责从自然语言/源文件理解意图与规划，确定性脚本负责布局与结构（`autolayout.py` 的 Graphviz 放置与正交路由、`seqlayout.py` 的时序生命线与激活条、`c4.py` 的多页 C4 模型、`validate.py` 的确定性 lint）。

1. 安装 draw.io 桌面 CLI。前提：本机可装桌面软件；版本 ≥ 30 才支持 Mermaid→.drawio 转换与 ELK `--layout`。预期结果：`drawio --version` 能输出版本。

   macOS：
   ```bash
   brew install --cask drawio
   ```

   Windows：从 [jgraph/drawio-desktop releases](https://github.com/jgraph/drawio-desktop/releases) 下载安装包。

   Linux：从 releases 取 `.deb`/`.rpm`；无头环境需：
   ```bash
   sudo apt install xvfb
   ```

   验证：
   ```bash
   drawio --version
   ```

   WSL2 注意：CLI 实际是 Windows 桌面 exe，经 `/mnt/c` 访问，README 称 skill 会自动识别。

2. 安装 skill。前提：使用支持 Agent Skills 的智能体。预期结果：技能装好，之后代理处理架构图任务时会加载。

   任意智能体（Claude Code、Cursor、Copilot 等）：
   ```bash
   npx skills add Agents365-ai/drawio-skill -g
   ```

   手动安装示例：
   ```bash
   git clone https://github.com/Agents365-ai/drawio-skill.git \
     ~/.claude/skills/drawio-skill
   ```

   更新：`skills update drawio-skill`，手动安装则 `git pull`。

3. 用自然语言出图。前提：完成步骤 1、2。预期结果：得到可编辑 `.drawio`，并经过自检、导出、反馈循环。README 给出的可复制提示词样例：

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

4. 从真实来源导入。前提：手上有源码目录 / Terraform / K8s 配置 / SQL / API 定义；Graphviz 可选。预期结果：生成可编辑 `.drawio`，并可做漂移对比和交互式浏览。

   ```bash
   python3 scripts/tfimports.py ./infra -o graph.json          # Terraform -> 官方 AWS 图标
   python3 scripts/autolayout.py graph.json -o architecture.drawio

   # 两个版本的漂移对比，再导出为一个交互式文件
   python3 scripts/drawiodiff.py v1.drawio v2.drawio -o drift.json
   python3 scripts/drawiohtml.py architecture.drawio -o architecture.html
   ```

   README 表示完整格式与参数见 `references/autolayout.md`、`references/toolbox.md`（本次未提供）。

5. 解析正确的官方图标。前提：无，本地执行。预期结果：拿到形状/样式片段。

   ```bash
   python3 scripts/shapesearch.py "aws lambda" --limit 5
   # → Lambda (77x93)
   #   outlineConnect=0;...;shape=mxgraph.aws3.lambda;fillColor=#F58534;...
   ```

6. AI/LLM 品牌 logo。前提：默认方式渲染时需要网络访问 unpkg CDN；离线用 `--embed`。预期结果：得到 CDN 引用或自包含 data URI。覆盖 321 个 logo（源：lobe-icons，MIT）+ 18 个数据存储品牌（源：simple-icons，CC0）。README 注明 logo 是各所有者的商标，仅用于标识。

   ```bash
   python3 scripts/aiicons.py "claude" --json      # CDN 引用（默认）
   python3 scripts/aiicons.py "openai" --embed     # 内联为自包含 data URI
   ```

7. 自定义样式预设。前提：有一份样板 `.drawio` 或图片。预期结果：学会样式并可在后续图中使用；README 称会先渲染预览、经用户确认后才保存。内置 5 个预设：`default`、`corporate`、`handdrawn`、`colorblind-safe`（Okabe-Ito）、`dark`。

   ```text
   Learn my style from ~/diagrams/brand.drawio as "mybrand"
   ```

   ```text
   Draw a microservices architecture using my "corporate" style
   ```

8. 把校验接入 CI。前提：仓库有 PR 流程；具体 YAML 规则与 Action 配置在 README 未给出，只指向 `docs/CI.md`。预期结果：每个 PR 运行架构规则校验（YAML/JSON 规则，如 Internet 到数据库的访问、环、孤岛、信任边界、对比度）并由官方 GitHub Action 强制执行；PR Action 渲染视觉 diff。可用命令名包括 `diagramctl doctor/build/sync/views/query/test/review/whatif/story/publish/transform`，以及 `validate.py --score` / `--strict`、`prdiff.py`、官方 GitHub Action。具体配置需查看未提供的文档。

   README 称在 CI 中可 regenerate + validate（`--strict` gate）+ headless 渲染。

9. 保留手工布局的增量同步。前提：已有 `diagramctl` 生成的图并做过人工微调。预期结果：`diagramctl sync` 更新变更的节点/关系，保留调好的坐标、样式、注释；删除项默认保留为可评审状态。README 未给出该命令的完整参数。

10. 知道它的自检与反馈循环：先导出草稿 PNG 自检并自动修复（最多 2 轮）重叠、标签被裁剪、堆叠边，再进入最多 5 轮的用户反馈循环，直到确认后最终导出。

### 做法 D：给前端 UI 先固定持久事实，再用确定性规则当门禁

用 pbakaus/impeccable。它的思路是把“耐久事实”和“表层视觉方向”分开写进仓库文件、给 agent 一套共享命令词汇、再用确定性规则做可自动执行的守门人。这三件事可以迁移到任何需要稳定产出的任务。它由四部分组成：1 个 skill（所有命令经 `/impeccable <command> <target>` 调用）、24 条命令、61 条确定性检测规则加 LLM-only 的 critique 检查、以及在支持的 harness 上装 provider 原生 hook。

1. 安装。前提：项目涉及前端；本地有 Node（只为 `npx`）。在项目根目录：
   ```bash
   npx impeccable install
   ```
   安装器会列出检测到的 harness 目录（例如 `~/.claude`、`~/.codex`、`~/.grok`、`~/.hermes`、`~/.veto`，或项目内 `.cursor`），让你保留检测集或自定义 provider，然后问装进当前项目还是全局。脚本化时跳过这两次选择：
   ```bash
   npx impeccable install --providers=claude,codex,cursor,grok,hermes,veto --scope=project|global
   ```
   在 Claude Code、Cursor、Codex、GitHub Copilot、Grok Build 上，它还会为当前项目安装 provider 原生 hook manifest。装完**重载 harness**。刷新已有安装用 `npx impeccable update`。

2. 建立持久上下文（每个新项目一次）。前提：步骤 1 完成。预期结果：写出 `PRODUCT.md`（受众、目的、运行环境、约束、语气、证据），现有或新建的视觉系统单独记录在 `DESIGN.md`。
   ```bash
   /impeccable init
   ```
   `init` 会检查项目、只追问“耐久产品事实”里缺失的部分；访客模式和视觉方向留到每个 surface 再定。这一步是关键做法：把持久事实与表层视觉方向分开存，避免后续命令把两者混淆。

3. 用命令表干活（全部经 `/impeccable` 调用，多数命令可带一个区域参数）：
   ```
   /impeccable craft      # 完整“先定形再构建”流程，带视觉迭代
   /impeccable shape      # 写代码前先规划 UX/UI
   /impeccable critique   # UX 设计评审：层级、清晰度、情感共鸣
   /impeccable audit      # 技术质量检查（a11y、性能、响应式）
   /impeccable polish     # 收尾：对齐设计系统、可发布性
   /impeccable harden     # 错误处理、i18n、文本溢出、边界情况
   /impeccable document   # 从现有代码生成根目录 DESIGN.md
   /impeccable extract    # 把可复用组件与 token 抽进设计系统
   /impeccable live       # 浏览器内逐元素迭代的视觉变体模式
   ```
   带目标的例子：
   ```
   /impeccable audit blog           # 审 blog 首页 + 文章页
   /impeccable critique landing     # UX 设计评审
   /impeccable polish settings      # 发布前收尾
   /impeccable harden checkout      # 加错误处理与边界情况
   /impeccable redo this hero section
   ```
   常用命令可以固定成独立快捷命令：`/impeccable pin audit` 生成 `/audit`。

4. 建立确定性检测基线（不需要 LLM、不需要 API key）：
   ```bash
   npx impeccable detect src/                   # 扫目录
   npx impeccable detect index.html             # 扫单个 HTML
   npx impeccable detect https://example.com    # 扫 URL（用本地已装的 Chrome/Chromium/Edge）
   npx impeccable detect --json .               # CI 友好的 JSON 输出
   npx impeccable detect --no-config src/       # 忽略项目配置的原始扫描
   ```
   退出码语义（做门禁时依赖它）：`0` 扫描完成且无 primary findings；`2` 扫描完成但有 primary findings；`1` 至少一个目标无法扫描（多目标部分失败时操作失败优先）。人类可读的 findings 写 stderr，所以重定向：`npx impeccable detect src/ 2> findings.txt`；机器可读用 `--json` 走 stdout。

5. 把检测接成自动反馈。前提：步骤 1 已在支持的 harness 上安装。预期结果：直接编辑 UI 文件时触发检测。Claude Code / GitHub Copilot / Codex 在编辑后提示（支持时在 Stop 再跑一次更深的 pass），Grok Build 编辑后先扫、在 Stop 才把结果给模型，Cursor 在坏的写入落地前就拦。配套注意：Codex 装或更新后要打开 `/hooks` 批准项目 hook（Codex 按 hook 定义记信任，改了 `.codex/hooks.json` 可能需再次批准）；Grok Build 需要项目目录信任（`/hooks-trust` 或 `--trust`）。

6. 配置检测的忽略与豁免。前提：有已知的合理例外。预期结果：`/impeccable hooks` 和 `npx impeccable detect` 共用同一套配置。忽略规则写在 `.impeccable/config.json` 的 `detector` 键（`detector.ignoreRules`、`detector.ignoreFiles`、`detector.ignoreValues`、`detector.designSystem.enabled`）。命令行方式：
   ```bash
   npx impeccable ignores list
   npx impeccable ignores add-file "src/legacy/**"
   npx impeccable ignores add-value overused-font Inter --reason "Brand font"
   ```
   只想让某个文件豁免，就在文件里写内联注释（任意注释语法均可，作用域是整个文件）：
   ```html
   <!-- impeccable-disable overused-font: exported brand doc -->
   ```
   细到一行用 `impeccable-disable-line` 或 `impeccable-disable-next-line`；`--no-inline-ignores` 或 `--no-config` 会绕过内联豁免。

7. 把产物按“可提交/一次性”分开。前提：准备提交配置。预期结果：共享产物留在版本控制里，一次性输出不进仓库。`.gitignore` 直接复制：
   ```gitignore
   # impeccable-ignore-start
   # Ephemeral output, runtime state, and per-dev overrides.
   # The **/ prefix covers .impeccable at the repo root or in a nested workspace.
   # Shared artifacts stay tracked: config.json, live/config.json,
   # design.json, surfaces/*.md, critique/*.md.
   **/.impeccable/config.local.json
   **/.impeccable/hook.cache.json
   **/.impeccable/hook.pending.json
   **/.impeccable/*.png
   **/.impeccable/review/
   **/.impeccable/questions/
   **/.impeccable/live/server.json
   **/.impeccable/live/sessions/
   **/.impeccable/live/previews/
   **/.impeccable/live/annotations/
   **/.impeccable/live/cache/
   **/.impeccable/live/manual-edit-apply-transaction.json
   **/.impeccable/live/manual-edit-events.jsonl
   **/.impeccable/live/manual-edit-evidence/
   **/.impeccable/live/pending-manual-edits.json
   **/.impeccable/live/deferred-svelte-component-accepts.json
   **/.impeccable/live/*.png
   # impeccable-ignore-end
   ```
   **必须保留跟踪**（共享项目产物，不要加进 `.gitignore`）：`.impeccable/config.json`、`.impeccable/live/config.json`、`.impeccable/design.json`、`.impeccable/surfaces/*.md`（按路由/产物的策略与方向契约）、`.impeccable/critique/*.md`（评审报告）。若一次性文件已被提交，`.gitignore` 不会自动取消跟踪，用 `git rm --cached <path>`。

8. 选构建路径 comp-first 还是 code-first。前提：有图像生成能力时这个选项才出现。`/impeccable init` 问一次并记进 `.impeccable/config.json`：
   ```json
   { "buildPath": "comp" }
   ```
   只读 `comp` 和 `code` 两个值。comp-first 先出高保真稿再对齐构建（更大胆、更慢）；code-first 直接在代码里建、把野心写进 surface brief 的 dev-only 方向契约、收尾时核对（更轻、更快）。单机覆盖写 `.impeccable/config.local.json`（适合你的 harness 没有图像生成时）；monorepo 在仓库根提交一次，个别 workspace 可自设。已有项目不必重跑 `init`：每个决策页脚有切换开关，翻转只作用于当前会话，在没记录过的项目上翻一次后它会问是否保留并写入。

9. 团队用 Git submodule 做版本化安装。前提：想让 Impeccable 跟着 Git 走。预期结果：skill 目录由 submodule 提供，`link` 从 `.impeccable/dist/universal/` 链接单个 skill 目录，不动已有的真实 skill 目录（除非加 `--force`）。
   ```bash
   git submodule add https://github.com/pbakaus/impeccable .impeccable
   npx impeccable link --source=.impeccable --providers=claude,cursor
   git add .gitmodules .impeccable .claude .cursor
   git commit -m "Add Impeccable skills"
   ```
   更新：
   ```bash
   git submodule update --remote .impeccable
   npx impeccable link --source=.impeccable --providers=claude,cursor
   ```

10. 把反模式写成项目规范。预期结果：团队约定里有一份明确禁止项，直接拦掉模型默认的模板口味。skill 自带的明确禁止项包括：不用过度使用的字体（材料里列到 Arial、Inter、系统默认字体，此处被截断），以及前述坏味道——紫到蓝渐变、卡片套卡片、彩色背景上的灰字、每个标题上方一个圆角方块图标。

### 怎么选 A / B / C / D

按交付物分：要的是数据图表，走 A；要的是一个命名组件或有界组合，走 B；要的是架构图/系统图/架构文档维护，走 C；要的是前端界面的设计与实现，走 D。A、B、D 是请求驱动、在对应事件（生成/审阅图表、收到组件任务、编辑 UI 文件或调用 `/impeccable` 命令）时触发，都不是常驻巡检；D 的确定性检测还能独立于 LLM 跑，适合直接接 CI。C 也是 Agent Skill/MCP 形态，可生成与校验，并可按 README 接入 CI。四者都需要你在请求里带足上下文。原文没有给出四者联动的做法。

## 怎么判断变好了

最小试用：在单个代理上装一次（图表优先 Claude Code，命令最短），用一个已有图表脚本，或一个已有类似实现的组件任务，或一两个真实架构来源，或一个现有前端页面来试。并做基线对照——让同一 agent 在不装技能的情况下做同样任务，再比一次。

图表侧可直接观察的指标（都能从一次试用里看到）：

- lint 报出的可判定问题数量和类型：零基线、双 y 轴、文字重叠/裁切、色盲配色、低对比度。这类是代码检查，可复核、不易造假。
- 图像复审能抓出多少“标注数字与数据不符”“来源行靠猜或写成文件名”“图上残留 TODO/confirm”。
- 修正前后，让不看上下文的同事只看 PNG 复述“这张图说明了什么”——标题是否已给出结论、是否还需要图例。
- 三轮复审的实际收敛情况：几轮修完、有没有反复改不好的规则。
- 记录无 Chrome 环境下的降级行为，确认它是否还覆盖你实际用的库。

组件侧：

- 是否复用项目原语；是否引入第二套设计系统或不必要的新库；是否发明路由/链接/目的地。
- 移动端和桌面键盘访问是否通过；响应式问题数量。
- 加载、取消、无效输入、结果恢复等状态覆盖数量。
- 项目测试、lint、类型检查是否通过。
- 人工评审返工轮次和修改量。

架构图侧：

- 从真实来源导入后，生成的 `.drawio` 是否可编辑；节点/关系是否与源一致；漂移 diff 是否标出新增绿、删除红、变更橙。
- `validate.py --score` / `--strict` 是否通过；CI 中架构规则校验是否拦住 Internet 到数据库、环、孤岛、信任边界、对比度等问题。
- 自检修复效果：重叠、标签裁剪、堆叠边是否减少。
- 增量同步是否保留手工布局与注释；删除项是否进入可评审状态。
- PR 视觉 diff 是否让人工审图更快。
- 最小试用方式：按 README 给出的安装与命令，把一两个真实来源（Terraform/K8s 配置、Python 包、SQL DDL、OpenAPI）导入成可编辑 `.drawio`，并把 diff/校验接入一次 PR，验证增量同步与漂移检测是否真能用。

前端 UI 侧：

- 固定基线：同一批文件在装技能前后各跑一次 `npx impeccable detect --json .`，比 primary findings 的数量和类型（例如过度使用的字体、渐变、卡片套卡片、低对比度）。
- 退出码是否能当门禁：无 findings 时 `0`、有 primary findings 时 `2`；如果你在 CI 里多目标扫描，留意 `1` 是“至少一个目标无法扫描”。
- hook 是否真在编辑时触发（Claude Code/Copilot/Codex 编辑后、Grok Build 在 Stop、Cursor 在坏写入落地前），以及一次会话里被动发现的坏味道有多少。
- `critique` / `audit` / `polish` 抓出的层级、清晰度、a11y、性能、响应式问题数量，以及返工轮次。
- `PRODUCT.md` / `DESIGN.md` 是否真的减少了 agent 反复问同样问题、反复换风格的情况。

这些指标是验证方法建议，四份材料都没有给出对应的量化结果。试多久：原文没有给时长，按任务数量定——若干张历史图表、一个边界清晰的组件任务、一两个真实架构来源导入并接入一次 PR，再加一个现有前端页面的检测基线。

## 常见坑

- 四份材料的兼容性声明和效果描述都来自各自 README 或作者自述，没有安装实测、没有 issue/失败案例；evident-charts 和 Bricks 星标分别只有 52 和 77，drawio-skill 同样缺乏第三方验证。先小范围试，不要直接全量采用。
- 没有 headless Chrome 时，非 matplotlib 库的代码级 lint 会直接缺失，只剩规格检查和图像复审——别把降级结果当成完整检查。
- 技能是事件触发（生成/审阅图表、收到组件任务、处理架构图任务、编辑 UI 文件时加载或运行），不会主动巡检；你不给源数据、PNG、脚本、项目上下文或真实架构来源，它就没有可查的东西。
- style guide 的覆盖权限只到 `[T]`，别指望用项目风格去关掉柱状图零基线这类 `[E]` 完整性规则。
- 组件任务边界不清（整页、整产品）会跑偏；复杂域组件不要重复造轮子。
- Bricks 明确不声称未在目标项目中实际验证过的性能、可访问性、合规或转化结果。
- drawio-skill 的 draw.io 桌面 CLI ≥ 30 是必需；Linux 无头要 `xvfb`；WSL2 下 CLI 实际是 Windows 桌面 exe，经 `/mnt/c` 访问，README 称 skill 会自动识别。
- Graphviz 只影响布局，其余功能不依赖；但未装 Graphviz 时布局能力会弱一些。
- AI/LLM 品牌 logo 默认走 unpkg CDN，离线要用 `--embed`；logo 是各所有者的商标，仅用于标识。
- drawio-skill 的 CI 规则配置、sync 参数细节在未提供的链接文档里；不要把 README 里的命令名当成完整配置。
- README 列举的平台中未出现 DeepSeek，无法据此判断兼容性；不能想当然认为可用。
- 架构图的增量同步、漂移 diff、时间回放、故障传播模拟等核心卖点多来自作者自述，缺少第三方验证。
- Impeccable 装完必须重载 harness，否则 hook 不会生效；Codex 还要手动打开 `/hooks` 批准项目 hook（改了 `.codex/hooks.json` 可能需再次批准），Grok Build 需要项目目录信任。
- `.gitignore` 不会自动取消跟踪已提交的一次性文件，必须 `git rm --cached <path>`；反过来，`config.json`、`design.json`、`surfaces/*.md`、`critique/*.md` 是要提交的共享产物，别一起 ignore 掉。
- 内联豁免注释的作用域是整个文件（细到一行才用 `impeccable-disable-line` / `impeccable-disable-next-line`）；用 `--no-config` 或 `--no-inline-ignores` 跑出来的结果不能和正常扫描混着比。
- 人类可读的 findings 写 stderr，机器可读才走 stdout；重定向和 CI 解析时别搞混。
- `critique` 是 LLM-only 的主观评审，和 61 条确定性规则不是一回事，别把它当硬门禁。
- Impeccable 的改善效果目前只有作者主张和一个未展开的案例页，缺实测数据。

## 证据与来源

**图表做法：**

- 依据 rhiever/evident-charts 的 README。可操作材料是安装与更新命令、自动检查清单、规则证据分级 `[E]/[P]/[T]`、`references/sources.md` 的引用机制、支持的库与尺寸列表。
- 唯一具体案例是 `examples/hero.png` 的前后对比图：左侧是典型草稿（对数轴上的原始计数、把 EU 总量与自身成员国一起排名、无意义彩虹色），右侧是经批判重建后的同一份数据（按国家的纯电新车份额）。
- 没有量化改善数据：“三轮图像复审能修好问题”“lint 能覆盖这些缺陷”都是作者主张；“编码代理出的图普遍带这些特征”是作者归纳；“Works in Claude Code, Codex, Cursor, and more”来自 README 自述。

**组件做法：**

- 依据 kostja94/bricks 的 README。可操作材料是安装命令、完整示例提示词、六步工作流、仓库结构（`catalog/components.json`、references、`quality-gates.md`、`workflow.md`、确定性校验脚本 `scripts/validate.mjs`、`npm test`）、MIT 许可、77 stars。
- 失败模式举例（Footer 可能发明路由、FAQ 可能对辅助技术隐藏答案、Task Input 可能遗漏加载/取消/无效输入/结果恢复、Agent Workspace 可能缺少对话/工具/工件/用户控制边界）是作者举例，没有量化数据、对照实验或实际项目结果。
- 未给出使用前后的成功率、返工次数、时间节省、可访问性/性能/转化验证结果。

**架构图做法：**

- 依据 Agents365-ai/drawio-skill 的 README。可操作材料是安装与命令、CLI 调用、自然语言提示词样例、从真实来源导入的命令、`shapesearch.py`、`aiicons.py`、自定义样式预设、CI 命令名（`diagramctl doctor/build/sync/views/query/test/review/whatif/story/publish/transform`、`validate.py --score` / `--strict`、`prdiff.py`、官方 GitHub Action）、`raster2drawio.py`、Mermaid→.drawio、支持 6+ 平台。
- 原文给出的具体数据：draw.io 桌面 CLI ≥ 30 才支持 Mermaid→.drawio 转换与 ELK `--layout`；覆盖 321 个 logo（源：lobe-icons，MIT）+ 18 个数据存储品牌（源：simple-icons，CC0）；内置 5 个预设：`default`、`corporate`、`handdrawn`、`colorblind-safe`、`dark`；自检最多 2 轮、用户反馈最多 5 轮；Mermaid 支持 28 种标准类型（含 mindmap、gantt、timeline、journey、pie、sankey、kanban）。
- 作者主张：增量同步不丢弃手工布局、双状态漂移 diff、git 历史时间回放、交互式 HTML 浏览、故障传播模拟、依赖查询、多视图投影、Diagram-as-Test；README 称在 CI 中可 regenerate + validate（`--strict` gate）+ headless 渲染；Architecture Studio showcase“每个产物由一个脚本再生成，并在测试套件中验证”属于仓库自证。
- 未提供：CI 规则配置、sync 参数细节在未提供的链接文档里；核心卖点多来自作者自述，缺乏第三方验证；未给出使用前后的成功率、返工次数、时间节省等量化结果。

**前端 UI 做法：**

- 依据 pbakaus/impeccable 的调研材料（作者 Paul Bakaus，Apache 2.0）。可操作材料是 `npx impeccable install` / `update` / `link`、`/impeccable init` 及命令表、`npx impeccable detect` 的若干调用形式与退出码语义、`.impeccable/config.json` 的 `detector` 键与 `ignores` 命令、内联豁免注释、`.gitignore` 片段与必须保留跟踪的产物清单、`buildPath` 配置、Git submodule 安装命令、hook 在各 harness 上的行为差异、`PRODUCT.md` / `DESIGN.md` 的分工。
- 材料给出的具体数字：24 条命令、61 条确定性检测规则、321/18 之外的 logo 数据不属于本篇；退出码 `0`/`2`/`1` 的语义；覆盖的 harness 包括 Claude Code、Cursor、Codex、GitHub Copilot、Grok Build。
- 作者主张：“所有模型都在同一套 SaaS 模板上训练，不加指导就产出同样的坏味道”、检测规则不需要 LLM 和 API key、hook 能在编辑时把检测结果送回 agent 流程、方法论可迁移到任何需要稳定产出的任务——这些都是作者自述。
- 未提供：没有任何使用前后的成功率、返工次数、时间节省等量化结果；反模式清单在给定材料里被截断（止于“不用过度使用的字体（Arial、Inter、系统”）；改善效果目前只有一个未展开的案例页。

## 依据的调研

- [rhiever/evident-charts](../research/radar/2026-10-01/21-rhiever-evident-charts.md)：值得一试，按 README 给出的安装命令在 Claude Code（或 Cursor/Codex/Gemini CLI）里装上 evident-charts，然后照常提图表需求、让它在出图前自查，是最小可试的用法；理由是它把“数据核对 + 代码级 lint + 渲染图复审”做成了自动加载的 Agent Skill，步骤和检查项都写得很具体，但改善幅度只有作者自述和一张对比图，需要自己跑一遍验证。
- [kostja94/bricks](../research/radar/2026-10-01/35-kostja94-bricks.md)：值得一试，建议按 README 的安装命令引入 component-builder，并在一个有明确边界的组件任务上小范围试用；它把组件责任、上下文、变体、状态和验证要求前置为契约，能约束 agent 少写脱离项目的 UI 代码，但目前只有作者主张和流程说明，缺少效果数据，不宜直接全量采用。
- [Agents365-ai/drawio-skill](../research/radar/2026-10-02/795-agents365-ai-drawio-skill.md)：值得一试，建议先在小范围试：按 README 给出的安装与命令，把一两个真实来源（Terraform/K8s 配置、Python 包、SQL DDL、OpenAPI）导入成可编辑 .drawio，并把 diff/校验接入一次 PR，验证增量同步与漂移检测是否真能用。理由：README 提供了可直接照做的安装命令、CLI 调用和提示词样例，但关键的 CI 规则配置、sync 参数细节都在未提供的链接文档里，且核心卖点多为作者自述，缺乏第三方验证。
- [pbakaus/impeccable](../research/radar/2026-10-02/666-pbakaus-impeccable.md)：值得一试，建议先在前端项目上小范围试：按 `npx impeccable install` + `/impeccable init` 把持久产品事实（PRODUCT.md）和视觉系统（DESIGN.md）固定下来，再用 `npx impeccable detect --json` 建立可量化的基线并把检测接进 hook/CI 当验收门槛；它把“给智能体供给上下文+约束+自动反馈”写成了可照抄的步骤，但改善效果目前只有作者主张和一个未展开的案例页，缺实测数据。
