# lowdevco/claude-seo

- 结论：**值得研读**。建议把它当作“用 Claude Code 技能封装 SEO 审计并输出优先级路线图”的案例来研读，而不是直接采用；材料只有 README 的命令清单和功能宣称，缺少技能定义、安装配置、提示词与验证数据，无法照做或判断效果。
- 原文：https://github.com/lowdevco/claude-seo
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T03:18:41.937Z

## 是什么

claude-seo 是面向 Claude Code 的 SEO 技能，宣称把网站审计、技术 SEO、内容质量、结构化数据、AI 搜索优化、本地 SEO 等工作封装成 `/seo` 子命令，并在 Claude 内输出按优先级排序的行动路线。给出的材料只有 README，没有技能文件内容、安装说明或实际审计样例。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

原文不足以还原一套可照做的完整流程。README 只给出调用入口和命令名，未说明如何安装技能、技能文件结构、依赖、权限、提示词、评分规则或输出模板。以下仅列出原文可确认的调用方式：

1. 前提：先把该技能加入 Claude。README 原话是 “Add this skill to Claude”，但没有说明添加方法、文件放置位置或所需权限。
2. 使用完整审计入口，前提是技能已经可用：

```bash
/seo audit https://example.com
```

3. 按需调用单页、技术、内容等子命令，例如：

```bash
/seo page https://example.com
/seo technical https://example.com
/seo content https://example.com
```

4. 读取输出中的优先级路线图。README 宣称会产出 “actionable, prioritized roadmap”，但未给出优先级排序标准、评分维度或输出模板。
5. 若要真正复用，需要自行补齐技能定义、提示词、权限和验证方法；原文没有提供这些内容。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- 能力发现：README 把网站审计和 SEO 诊断拆成多个 `/seo` 子命令，覆盖技术 SEO、内容与 E-E-A-T、结构化数据、AI 搜索与 GEO、本地与电商等方向。这说明作者认为这些审计任务可以交给 Claude 技能完成，但材料没有展示实际分析过程。
- 任务匹配：明确绑定 Claude Code 技能；`audit` 命令宣称使用 “parallel specialist agents”。除此之外，没有说明不同任务应选什么模型、工具或协作方式。
- 条件供给：至少需要目标 URL，以及已经加入 Claude 的技能。原文没有说明是否需要网站抓取权限、API、登录态、robots.txt 访问、搜索数据源、文件读写权限或上下文材料。
- 主动推进：命令表里有 `/seo drift <url>`，描述为 “SEO drift monitoring and baseline comparisons”，暗示可以做基线对比和持续监测；但没有给出触发方式、频率、状态存储或自动执行配置，不能视为可执行的主动推进方案。
- 效果验证：没有给出指标、基准、案例或对比数据。只有 “prioritized roadmap” 和 “drift baseline comparisons” 的概念，无法据此判断审计是否准确、是否改善结果。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中已有 Claude Code，状态为 adopt。claude-seo 是构建在 Claude Code 之上的技能封装，依赖 Claude Code 作为运行环境；清单中没有其他直接相关的 SEO 审计或技能封装条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

证据主要是 README 中的命令表、功能分类和 MIT License；仓库指标显示 30 stars。原文没有给出审计案例、前后对比、准确率、耗时、用户反馈或任何量化数据。“comprehensive website analysis”“actionable, prioritized roadmap”“parallel specialist agents”等均为作者主张，未展示实现细节或验证结果。

局限：材料只有 README，没有技能源码、提示词、安装步骤、依赖说明和输出样例；无法确认它实际能审计到什么程度，也无法复现。适用条件最多只能推测为：已经在用 Claude Code、需要 SEO 审计、并能自行补齐技能安装与验证的团队；但这一点也需要实际仓库内容才能确认。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

建议的最小试用方式：若后续能取得完整技能文件，先在隔离的 Claude Code 环境中安装，选择一个已有手工审计基线的小型网站，运行 `/seo audit <url>`，再用人工清单核对输出。由于当前只有 README，不建议直接把它纳入生产流程。

建议观察的指标：

- 覆盖度：是否覆盖技术 SEO、内容、结构化数据、内链、索引等关键检查项。
- 准确性：输出问题能否被人工复核确认，误报和漏报各有多少。
- 可执行性：路线图是否给出问题证据、影响判断、修复动作和优先级理由。
- 可复现性：同一 URL 多次运行结果是否稳定，基线对比是否有意义。
- 效率：相比人工审计节省的时间，以及是否需要大量返工。

只有这些指标相对人工基线有明确改善，才能判断该技能确实改善了工作方式；当前材料不足以支持这一判断。
