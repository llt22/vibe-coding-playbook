# 让 agent 交付的图表、组件和架构图先通过检查再宣布完成

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 交出的图表、组件和架构图常常看着完成，但存在数据错误、脱离项目约定或与真实系统漂移；这份手册给出在交付前自动检查、契约约束和从真实来源生成/校验的做法。
> 先试这一步：选你手头最常交付的一类（数据图表、命名组件或架构图），在单个代理上只装对应技能，用真实任务做一次基线对照。
> 最近修订：2026-10-02

## 解决什么问题

编码 agent 交出来的东西常常“看着完成了”：图表用了没说清的对数轴、把 EU 总量和它的成员国排在一起、来源行靠猜或直接写文件名、图上还留着 TODO；组件则会发明路由、引入第二套设计系统、漏掉加载/取消/无效输入/结果恢复这类状态；架构图则可能脱离真实系统、与部署漂移、无法增量维护。这份手册给三条可落地的做法，把“检查”从你手里挪到 agent 交付之前：图表过三道检查、组件写代码前先签契约、架构图从真实来源生成并在合并前校验。

## 适用与不适用

**适用：**

- 你已经在用支持 Agent Skills 的编码代理（evident-charts 声明支持 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、Antigravity；Bricks 要求支持 skills 的代理；drawio-skill 声明兼容 Claude Code、Cursor、Copilot、OpenClaw、Codex、Autohand Code、Hermes 等 Agent Skills 格式的智能体），并且任务落在三类交付物上：
  - 用数据画图：matplotlib、seaborn、pandas `.plot`、ggplot2、Plotly、Vega-Lite/Altair、D3；输出尺寸有博客、X、LinkedIn、Instagram、幻灯片、报告、手机预设。
  - 实现一个有明确边界的命名组件或有界组合（Footer、FAQ、Task Input、Agent Workspace 这类容易翻车的类型）。
  - 架构图/系统图/架构文档维护：从自然语言、代码、Terraform、Kubernetes、docker-compose、SQL DDL、OpenAPI/AsyncAPI/Protobuf/GraphQL、CI 配置生成可编辑 `.drawio`，或对已有图做增量同步、漂移 diff、规则校验。
- 项目已有代码库、组件、设计令牌、框架、路由和响应式约定（Bricks 的前提），或者项目里已有图表脚本与源数据，或者手上有可导入的真实架构来源（Terraform/K8s 配置、SQL、API 定义、代码目录、白板照片/截图）。

**不适用：**

- 整产品规划、完整网站定义、纯编辑文案——Bricks 明确不覆盖这些；完整页面它提到用 Pagina（原文提到，但 Pagina 不在本次给定材料里）。
- 复杂领域行为组件（编辑器、数据网格、图表组件、日历、可访问性原语）在项目没有现成方案时，应该用成熟库，而不是让 agent 从零写。
- 架构图如果不想安装 draw.io 桌面 CLI，或没有真实来源/反馈循环，drawio-skill 的核心能力会受限；它也不适合替代手绘风、diagrams-as-code、自由画布（README 建议换同作者家族其他 skill）。
- 想要现成的量化改善数据：三份材料都没有给出效果数字，只能自己跑基线对照。

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

### 怎么选 A / B / C

按交付物分：要的是数据图表，走 A；要的是一个命名组件或有界组合，走 B；要的是架构图/系统图/架构文档维护，走 C。A 和 B 是请求驱动、在对应事件（生成/审阅图表、收到组件任务）时自动加载，都不是常驻巡检；C 也是 Agent Skill/MCP 形态，可生成与校验，并可按 README 接入 CI。三者都需要你在请求里带足上下文。原文没有给出三者联动的做法。

## 怎么判断变好了

最小试用：在单个代理上装一次（图表优先 Claude Code，命令最短），用一个已有图表脚本，或一个已有类似实现的组件任务，或一两个真实架构来源试。并做基线对照——让同一 agent 在不装技能的情况下做同样任务，再比一次。

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

这些指标是验证方法建议，三份材料都没有给出对应的量化结果。试多久：原文没有给时长，按任务数量定——若干张历史图表、一个边界清晰的组件任务，再加一两个真实架构来源导入并接入一次 PR。

## 常见坑

- 三份材料的兼容性声明和效果描述都来自各自 README 的作者自述，没有安装实测、没有 issue/失败案例；evident-charts 和 Bricks 星标分别只有 52 和 77，drawio-skill 同样缺乏第三方验证。先小范围试，不要直接全量采用。
- 没有 headless Chrome 时，非 matplotlib 库的代码级 lint 会直接缺失，只剩规格检查和图像复审——别把降级结果当成完整检查。
- 技能是事件触发（生成/审阅图表、收到组件任务、处理架构图任务时加载），不会主动巡检；你不给源数据、PNG、脚本、项目上下文或真实架构来源，它就没有可查的东西。
- style guide 的覆盖权限只到 `[T]`，别指望用项目风格去关掉柱状图零基线这类 `[E]` 完整性规则。
- 组件任务边界不清（整页、整产品）会跑偏；复杂域组件不要重复造轮子。
- Bricks 明确不声称未在目标项目中实际验证过的性能、可访问性、合规或转化结果。
- drawio-skill 的 draw.io 桌面 CLI ≥ 30 是必需；Linux 无头要 `xvfb`；WSL2 下 CLI 实际是 Windows 桌面 exe，经 `/mnt/c` 访问，README 称 skill 会自动识别。
- Graphviz 只影响布局，其余功能不依赖；但未装 Graphviz 时布局能力会弱一些。
- AI/LLM 品牌 logo 默认走 unpkg CDN，离线要用 `--embed`；logo 是各所有者的商标，仅用于标识。
- drawio-skill 的 CI 规则配置、sync 参数细节在未提供的链接文档里；不要把 README 里的命令名当成完整配置。
- README 列举的平台中未出现 DeepSeek，无法据此判断兼容性；不能想当然认为可用。
- 架构图的增量同步、漂移 diff、时间回放、故障传播模拟等核心卖点多来自作者自述，缺少第三方验证。

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

## 依据的调研

- [rhiever/evident-charts](../research/radar/2026-10-01/21-rhiever-evident-charts.md)：值得一试，按 README 给出的安装命令在 Claude Code（或 Cursor/Codex/Gemini CLI）里装上 evident-charts，然后照常提图表需求、让它在出图前自查，是最小可试的用法；理由是它把“数据核对 + 代码级 lint + 渲染图复审”做成了自动加载的 Agent Skill，步骤和检查项都写得很具体，但改善幅度只有作者自述和一张对比图，需要自己跑一遍验证。
- [kostja94/bricks](../research/radar/2026-10-01/35-kostja94-bricks.md)：值得一试，建议按 README 的安装命令引入 component-builder，并在一个有明确边界的组件任务上小范围试用；它把组件责任、上下文、变体、状态和验证要求前置为契约，能约束 agent 少写脱离项目的 UI 代码，但目前只有作者主张和流程说明，缺少效果数据，不宜直接全量采用。
- [Agents365-ai/drawio-skill](../research/radar/2026-10-02/795-agents365-ai-drawio-skill.md)：值得一试，建议先在小范围试：按 README 给出的安装与命令，把一两个真实来源（Terraform/K8s 配置、Python 包、SQL DDL、OpenAPI）导入成可编辑 .drawio，并把 diff/校验接入一次 PR，验证增量同步与漂移检测是否真能用。理由：README 提供了可直接照做的安装命令、CLI 调用和提示词样例，但关键的 CI 规则配置、sync 参数细节都在未提供的链接文档里，且核心卖点多为作者自述，缺乏第三方验证。
