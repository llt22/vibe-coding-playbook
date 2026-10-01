# rhiever/evident-charts

- 结论：**值得一试**。按 README 给出的安装命令在 Claude Code（或 Cursor/Codex/Gemini CLI）里装上 evident-charts，然后照常提图表需求、让它在出图前自查，是最小可试的用法；理由是它把“数据核对 + 代码级 lint + 渲染图复审”做成了自动加载的 Agent Skill，步骤和检查项都写得很具体，但改善幅度只有作者自述和一张对比图，需要自己跑一遍验证。
- 原文：https://github.com/rhiever/evident-charts
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T05:26:16.146Z

## 是什么

evident-charts 是 Randy Olson 发布的一个 Agent Skill / 插件（MIT，52 stars），作用是教会 AI 编码代理产出清晰、诚实的图表，并在图表交到你手里之前先做检查。README 声明它可在 Claude Code、Codex、Cursor 及其他支持 Agent Skills 的代理中使用。

它的对比图说明了自己的定位：左侧是“典型草稿”——原始电动车计数放在从未说明的对数轴上、把 EU 总量混进其成员国一起排名、用无意义的彩虹配色；右侧是 evident-charts 批判并重建后的同一份数据（按国家的纯电新车份额）。

README 列出的图表“通病”正是它要拦截的对象：标题只写主题（"Revenue by region"）而不说数据说明了什么；能用数据标签却用图例、彩虹色无含义；柱状图不从零开始或一张图用两个 y 轴；标注里的数字从未和数据核对过；来源行靠猜，或直接拿文件名当来源；图上残留 "TODO"、"confirm" 之类便签。

## 具体做法（编号步骤）

1. **按所用代理安装插件。** 前提：你已经在用对应代理。

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

2. **确认环境依赖。** 代理会在你本机用你项目的 Python 运行该技能的检查脚本：
   - matplotlib 图表需要 matplotlib；
   - 其他库通过 headless Chrome 的 SVG 导出检查（Plotly 的图片导出本身就会装一个 Chrome）；
   - 没有 Chrome 时，只有图表规格检查（chart-spec checks）和图像复审会运行。

3. **照你平时的方式提图表需求即可**，技能会在代理生成或审阅图表时自动加载。README 给的示例提示词：
   ```text
   Chart sales.csv for a LinkedIn post on which regions grew fastest.
   Make one slide showing where our budget went last year.
   Critique this chart and fix it.        (attach the PNG, the script, or both)
   ```

4. **要审已有图表时，把 PNG、脚本或两者一起附上**，它会给出按优先级排序、且每条都引用某条规则的修改建议。

5. **知道它会自动做哪些检查**（这也是验收时的清单）：
   - 先查数据：总量与部分混在一起、重复行、占位符代码、未完的月份；
   - 按“想说明的结论”选图形形式：柱、线、表格，或一个大数字；
   - 把结论写成标题，并引用真实发布方而不是文件名；
   - 在代码里 lint 图表（matplotlib 直接做；Plotly、Vega-Lite、ggplot2、D3 通过其 SVG 导出）：文字重叠或被裁切、数据上的标签、不从零开始的柱、双 y 轴、色盲难辨的颜色、对比度过低；
   - 用一个只看得到 PNG 的“新审阅者”复审渲染图，并修掉发现的问题，最多三轮；
   - 对你交给它的任何图表做批判，按优先级排序并引用规则。

6. **让项目风格指南压过默认风格。** 规则带证据等级标签：`[E]` 实验证据、`[P]` 从业者共识、`[T]` 品味或惯例。项目的 style guide 可以覆盖 house look 和任何 `[T]` 规则，但永远不能覆盖 `[E]` 类完整性规则（例如柱状图必须从零开始）。每条规则都在 `references/sources.md` 中被引用。

7. **按安装方式更新：**

   | Installed with | Update command |
   |---|---|
   | Claude Code | `claude plugin marketplace update evident-charts && claude plugin update evident-charts@evident-charts` |
   | npx skills | `npx skills update evident-charts` |
   | GitHub CLI | `gh skill update evident-charts` |
   | Codex | `codex plugin marketplace upgrade evident-charts && codex plugin add evident-charts@evident-charts` |
   | Gemini CLI | `gemini extensions update evident-charts`（`--auto-update` 时自动） |

8. **支持的库与尺寸。** 库：matplotlib（默认，带 helper 和 lint 脚本）、seaborn、pandas `.plot`、ggplot2、Plotly、Vega-Lite/Altair、D3；后四者的 house theme 在 `assets/themes/`。尺寸：博客、X、LinkedIn、Instagram、幻灯片、报告、手机均有预设。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现：** README 明确把“出图后自查”这件通常不交给 AI 的事交给代理——数据先核对、代码级 lint、再看渲染图复审，还能批判你已有的图表。可照做的部分就是上面第 5 步那份检查清单。
- **任务匹配：** 面向“用编码代理画数据图”的场景；matplotlib 走原生 lint，其余库走 SVG 导出路径；跨 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、Antigravity；输出尺寸有平台预设（博客/X/LinkedIn/Instagram/幻灯片/报告/手机）。
- **条件供给：** 需要项目 Python 环境、matplotlib；非 matplotlib 库还需要 headless Chrome 才能做 SVG 检查（没有就只剩规格检查和图像复审）；要提供源数据（如 CSV）、渲染后的 PNG 或脚本；项目 style guide 可作为覆盖规则输入；反馈环节是“审阅者只看 PNG、最多修三轮”。
- **主动推进：** 技能在“代理生成或审阅图表时”自动加载，属于事件触发，不需要每次手动调用；`--auto-update`（Gemini CLI）保证规则随仓库更新。README 没有提到基于时间或状态轮询的持续任务。
- **效果验证：** 验证手段是内建的——一批可在代码里判定的规则（文字重叠/裁切、零基线、双轴、色盲可辨色、低对比度），加上只看渲染图的独立复审；规则按 `[E]/[P]/[T]` 标注证据强度，且有 `references/sources.md` 逐一引用。但 README 没有给出任何量化改善数据。

## 与已有做法的关系

清单中已有三条相关条目，本条与之关系如下：

- **Agent skills（concept，adopt）：** 本条就是一个具体的 Agent Skill 实现，README 展示了技能包的组织方式（`skills/evident-charts/references/sources.md`、`assets/themes/`、`AGENTS.md` 描述测试与规则格式），可作为“技能该怎么写、怎么带规则分级”的范本。
- **Claude Code（tool，adopt）：** README 给出 Claude Code 的具体 marketplace/plugin 安装与更新命令，属于可直接落地的配置。
- **Cursor（tool，watch）：** README 列出 Cursor 通过 `npx skills add` 安装，也把 Cursor 列为 `gh skill install --agent cursor` 的选项，可作为观察 Cursor 技能生态的一个样本。

## 证据与局限

**原文给出的证据：**
- 一张前后对比图（`examples/hero.png`）及说明文字：左侧为典型草稿（对数轴上的原始计数、把 EU 总量与自身成员国一起排名、无意义彩虹色），右侧为经 evident-charts 批判重建后的版本（按国家的纯电新车份额）。这是唯一的具体案例。
- 规则证据分级：`[E]` 实验证据、`[P]` 从业者共识、`[T]` 品味或惯例，每条规则在 `references/sources.md` 中被引用——说明规则有出处机制，但报告本身没有引用具体研究结论。
- 明确的适用条件：本机 Python、matplotlib；其他库需要 headless Chrome 才能做 SVG 检查，否则只跑规格检查和图像复审。

**只是作者主张、未见独立验证的部分：**
- “编码代理出的图普遍带有这些特征”是作者归纳，没有数据支撑。
- 三轮图像复审能修好问题、lint 能覆盖这些缺陷，均无成功率或效果幅度数据。
- 兼容性声明（“Works in Claude Code, Codex, Cursor, and more”）来自 README 自述。

**局限：** 本次材料只有仓库 README，没有安装实测、没有 issue/失败案例、没有版本与最近提交信息；星标数仅 52，社区验证有限。因此不宜直接给 adopt，建议先小范围试。

## 怎么试、怎么验证

**最小试用：** 在单个代理（优先 Claude Code，命令最短）和一个已有图表脚本的项目里装一次；先用现成数据重画一张你过去出过的图，再用 `Critique this chart and fix it`（附 PNG 和脚本）跑一遍批判流程；保留你项目原有 style guide 以检验“指南覆盖 `[T]`、不覆盖 `[E]`”这条规则是否真的生效。

**判断有没有改善的指标（都可从一次试用中直接观察）：**
- 在若干张历史图表上，lint 报出的可判定问题数量与类型（零基线、双轴、文字重叠/裁切、色盲配色、低对比度）——这类是代码检查，可复核、不易造假。
- 图像复审能抓出多少“标注数字与数据不符”“来源行靠猜或写成文件名”“图上残留 TODO/confirm”。
- 修正前后，让不看上下文的同事只看 PNG 复述“这张图说明了什么”——标题是否已给出结论、是否还需要图例。
- 三轮复审的实际收敛情况：几轮修完、有没有反复改不好的规则，以判断该技能在你自己项目上的稳定性。
- 记录技能在无 Chrome 环境下的降级行为，确认它是否仍能覆盖你实际用的库。
