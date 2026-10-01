# 让编码 agent 交付图表和组件前，先按契约自查

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决编码 agent 产出的数据图表和 UI 组件“看着完成了、其实没核对”——图表数据没核、来源靠猜、图上留 TODO，组件发明路由、塞进第二套设计系统、缺交互状态。
> 先试这一步：先在一个已有图表脚本的项目里装上 evident-charts，用现成数据重画一张你过去出过的图，再附上 PNG 和脚本让它批判并修一遍。
> 最近修订：2026-10-02

## 解决什么问题

编码 agent 交出来的东西常常“看着完成了”：图表用了没说清的对数轴、把 EU 总量和它的成员国排在一起、来源行靠猜或直接写文件名、图上还留着 TODO；组件则会发明路由、引入第二套设计系统、漏掉加载/取消/无效输入/结果恢复这类状态。这份手册给两条可落地的做法，把“检查”从你手里挪到 agent 交付之前。

## 适用与不适用

**适用：**

- 你已经在用支持 Agent Skills 的编码代理（evident-charts 声明支持 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、Antigravity；Bricks 要求支持 skills 的代理），并且任务落在两类交付物上：
  - 用数据画图：matplotlib、seaborn、pandas `.plot`、ggplot2、Plotly、Vega-Lite/Altair、D3；输出尺寸有博客、X、LinkedIn、Instagram、幻灯片、报告、手机预设。
  - 实现一个有明确边界的命名组件或有界组合（Footer、FAQ、Task Input、Agent Workspace 这类容易翻车的类型）。
- 项目已有代码库、组件、设计令牌、框架、路由和响应式约定（Bricks 的前提），或者项目里已有图表脚本与源数据。

**不适用：**

- 整产品规划、完整网站定义、纯编辑文案——Bricks 明确不覆盖这些；完整页面它提到用 Pagina（原文提到，但 Pagina 不在本次给定材料里）。
- 复杂领域行为组件（编辑器、数据网格、图表组件、日历、可访问性原语）在项目没有现成方案时，应该用成熟库，而不是让 agent 从零写。
- 想要现成的量化改善数据：两份材料都没有给出效果数字，只能自己跑基线对照。

## 前置条件

- 支持 Agent Skills 的编码代理，并且你已经在用它。
- 图表做法（做法 A）：
  - 本机有项目 Python 环境。
  - matplotlib 走原生 lint 脚本；Plotly、Vega-Lite、ggplot2、D3 通过 headless Chrome 导出 SVG 来做代码级检查。没有 Chrome 时只剩图表规格检查和图像复审。
  - 有源数据（如 CSV）、渲染后的 PNG 或生成脚本——批判已有图表时至少要给其中一项。
- 组件做法（做法 B）：
  - 项目已有路由、组件、设计令牌、框架、响应式约定、依赖、数据模型和测试，并且 agent 能读到。
  - 有真实的产品、资源、公司、法律等目标链接和内容可以复用。
  - 任务边界清晰：一个命名组件或有界组合。
  - 请求里写清组件的责任、上下文、变体、内容、交互状态、技术边界和验证要求。

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

### 怎么选 A / B

按交付物分：要的是数据图表，走 A；要的是一个命名组件或有界组合，走 B。两者都是请求驱动、在对应事件（生成/审阅图表、收到组件任务）时自动加载，都不是常驻巡检，都需要你在请求里带足上下文。原文没有给出两者联动的做法。

## 怎么判断变好了

最小试用：在单个代理上装一次（图表优先 Claude Code，命令最短），用一个已有图表脚本，或一个已有类似实现的组件任务试。并做基线对照——让同一 agent 在不装技能的情况下做同样任务，再比一次。

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

这些指标是验证方法建议，两份材料都没有给出对应的量化结果。试多久：原文没有给时长，按任务数量定——若干张历史图表加一个边界清晰的组件任务。

## 常见坑

- 两份材料的兼容性声明和效果描述都来自各自 README 的作者自述，没有安装实测、没有 issue/失败案例；星标分别只有 52 和 77，社区验证有限。先小范围试，不要直接全量采用。
- 没有 headless Chrome 时，非 matplotlib 库的代码级 lint 会直接缺失，只剩规格检查和图像复审——别把降级结果当成完整检查。
- 技能是事件触发（生成/审阅图表、收到组件任务时加载），不会主动巡检；你不给源数据、PNG、脚本或项目上下文，它就没有可查的东西。
- style guide 的覆盖权限只到 `[T]`，别指望用项目风格去关掉柱状图零基线这类 `[E]` 完整性规则。
- 组件任务边界不清（整页、整产品）会跑偏；复杂域组件不要重复造轮子。
- Bricks 明确不声称未在目标项目中实际验证过的性能、可访问性、合规或转化结果。

## 证据与来源

**图表做法：**

- 依据 rhiever/evident-charts 的 README。可操作材料是安装与更新命令、自动检查清单、规则证据分级 `[E]/[P]/[T]`、`references/sources.md` 的引用机制、支持的库与尺寸列表。
- 唯一具体案例是 `examples/hero.png` 的前后对比图：左侧是典型草稿（对数轴上的原始计数、把 EU 总量与自身成员国一起排名、无意义彩虹色），右侧是经批判重建后的同一份数据（按国家的纯电新车份额）。
- 没有量化改善数据：“三轮图像复审能修好问题”“lint 能覆盖这些缺陷”都是作者主张；“编码代理出的图普遍带这些特征”是作者归纳；“Works in Claude Code, Codex, Cursor, and more”来自 README 自述。

**组件做法：**

- 依据 kostja94/bricks 的 README。可操作材料是安装命令、完整示例提示词、六步工作流、仓库结构（`catalog/components.json`、references、`quality-gates.md`、`workflow.md`、确定性校验脚本 `scripts/validate.mjs`、`npm test`）、MIT 许可、77 stars。
- 失败模式举例（Footer 可能发明路由、FAQ 可能对辅助技术隐藏答案、Task Input 可能遗漏加载/取消/无效输入/结果恢复、Agent Workspace 可能缺少对话/工具/工件/用户控制边界）是作者举例，没有量化数据、对照实验或实际项目结果。
- 未给出使用前后的成功率、返工次数、时间节省、可访问性/性能/转化验证结果。

## 依据的调研

- [rhiever/evident-charts](../research/radar/2026-10-01/21-rhiever-evident-charts.md)：值得一试，按 README 给出的安装命令在 Claude Code（或 Cursor/Codex/Gemini CLI）里装上 evident-charts，然后照常提图表需求、让它在出图前自查，是最小可试的用法；理由是它把“数据核对 + 代码级 lint + 渲染图复审”做成了自动加载的 Agent Skill，步骤和检查项都写得很具体，但改善幅度只有作者自述和一张对比图，需要自己跑一遍验证。
- [kostja94/bricks](../research/radar/2026-10-01/35-kostja94-bricks.md)：值得一试，建议按 README 的安装命令引入 component-builder，并在一个有明确边界的组件任务上小范围试用；它把组件责任、上下文、变体、状态和验证要求前置为契约，能约束 agent 少写脱离项目的 UI 代码，但目前只有作者主张和流程说明，缺少效果数据，不宜直接全量采用。
