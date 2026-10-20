# spmtitsolution/OpenBA-Kit

- 结论：**值得一试**。建议小范围试：按 README 的 Agent Skills 方式把 skills/ 挂到 Claude Code（或把仓库放进工作区），选一个真实小需求跑 /brainstorm→/srs→/userstory→/ac→/test-cases→/preview，并用歧义词、追溯覆盖率、评审返工等指标做前后对比；理由是它给出了可复制的安装命令、斜杠命令和 Mermaid 渲染脚本，但效果只有 README 自述，缺少独立验证。
- 原文：https://github.com/spmtitsolution/OpenBA-Kit
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T16:40:59.956Z

## 是什么
BA-Kit Open 是一个面向 IT 业务分析师（BA）和产品负责人（PO）的开源 Agent Skills 技能包，README 声称包含 56 个专用技能、19 条需求工程规则和 47 个模板，可把 Claude Code、Antigravity、OpenAI Codex、Hermes Agent、Cursor、Windsurf 等编码智能体改造成“高级 IT BA / 技术 PO”。它覆盖从模糊脑暴、发现报告到 IEEE 830 技术规格、架构图、HTML 线框图、INVEST 用户故事、Gherkin 验收标准和可追踪测试用例的软件规格生命周期。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. **确认宿主智能体**：前提是已有 Claude Code、Hermes Agent、Antigravity、OpenAI Codex、Cursor 或 Windsurf 之一，且该宿主支持 Agent Skills 标准。README 把这类工具统称为 AI Coding Agent。
2. **获取仓库并确定本地路径**：按 README 的 Option C，可把仓库直接克隆到项目根目录或子目录，让智能体自动发现 `skills/` 和 `rules/`；也可按 Option A/B 做全局技能挂载。前提是本地已有仓库目录，下文用 `/path/to/ba-kit-open` 代替实际路径。
3. **安装到 Claude Code（Option A）**：前提是使用 Unix-like shell，并把路径替换为实际仓库路径。
```bash
mkdir -p ~/.claude/skills
ln -s /path/to/ba-kit-open/skills/* ~/.claude/skills/
```
4. **安装到 Hermes Agent / Antigravity / Codex（Option B）**：README 给出的 Hermes 示例命令如下；前提同上。
```bash
mkdir -p ~/.hermes/skills
ln -s /path/to/ba-kit-open/skills/* ~/.hermes/skills/
```
5. **用斜杠命令跑完整 BA 流程**：README 给出的“AI BA 的一天”可直接作为小需求试跑顺序。前提是技能已安装或被工作区发现，并在对应项目上下文中调用。
```text
09:00  /brainstorm      Elicit requirements and define project boundaries
09:40  /srs             Draft IEEE 830 specification (FR, BR, ERR, NFR)
10:30  /sequence + /erd Model interaction sequences and entity relationships
10:45  /render-diagrams Compile diagrams into editorial HTML & vector SVGs
11:00  /wireframe-html  Generate clickable, standalone HTML prototypes
14:00  /userstory + /ac Slice INVEST user stories with Gherkin scenarios
16:00  /test-cases      Generate comprehensive test suites mapped to Error Matrix
16:45  /preview         Assemble the single-page stakeholder review bundle
```
6. **渲染 Mermaid 图**：前提是已安装 `python3`，且 Markdown 中包含 Mermaid 块（如 `sequenceDiagram`、`stateDiagram-v2`、`flowchart`、`erDiagram`）。README 给出的命令：
```bash
# Scan and render a single markdown file:
python3 scripts/render_diagrams.py docs/{feature}/srs/flows.md

# Scan and render all documentation in a feature folder:
python3 scripts/render_diagrams.py docs/{feature}/
```
README 称输出为可双击打开的独立 `.html`、纯 `.svg` 矢量文件，以及交互式 `index.html` 画廊。
7. **处理变更与治理**：README 列出 `/cr`（变更请求与爆炸半径影响分析）、`/gap`、`/doc-drift`、`/dashboard`、`/kg` 等治理命令；前提是已有规格文档，并在客户范围变化或文档漂移时显式调用。原文没有给出这些命令的详细参数，只能按技能名和阶段表使用。
8. **交付评审包**：用 `/preview` 生成单页交互式文档门户，供干系人浏览、评审和签收。前提是前面已生成 PRD/SRS/流程图/用户故事/验收标准等文档。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
1. **能力发现**：README 明确说可自动完成“从模糊脑暴和发现报告到 IEEE 830 技术规格、编辑级架构图、交互式 HTML 线框图、INVEST 待办列表、Gherkin 验收标准、可追踪测试用例”的软件规格生命周期；还列了 56 个技能覆盖 9 个 SDLC 阶段。也就是说，除了写代码，AI 还可被指派做需求澄清、规格撰写、图模设计、线框原型、验收标准、测试用例、变更影响分析和文档治理。
2. **任务匹配**：README 把适用宿主列为 Claude Code、Antigravity、OpenAI Codex、Hermes Agent、Cursor、Windsurf，并按阶段给出 `/prd`、`/brainstorm`、`/srs`、`/sequence`、`/render-diagrams`、`/wireframe-html`、`/userstory`、`/ac`、`/test-cases`、`/preview` 等斜杠命令。原文没有给出不同模型/工具之间的效果对比，因此只能判断“适合 BA/PO 规格文档类任务 + 支持 Agent Skills 的编码智能体”，不能判断哪个模型最好。
3. **条件供给**：需要提供仓库中的 `skills/`、`rules/`、`_templates/` 文件；需要让宿智能体发现这些文件（全局 symlink 或放进工作区）；需要 `python3` 来跑 `scripts/render_diagrams.py`；需要 Markdown 文档和 Mermaid 图作为输入；需要可写技能目录的权限。反馈条件方面，README 提到 `/cr` 做变更影响矩阵、`/gap` 和 `/doc-drift` 做治理、`/preview` 做干系人评审，但未展开具体反馈闭环。
4. **主动推进**：README 主要展示用户显式调用 slash command 的工作流，没有说明定时、事件或状态触发的自动持续执行。仅有 `/cr` 可对应“客户范围变化”这一事件后的影响分析，属于事件驱动的手动工作流，而非自动推进。
5. **效果验证**：README 提出追溯矩阵 `Idea → PRD → SRS → Flows → User Stories → AC → Test Cases`，并声称 19 条规则会自动检测并消除“fast”“secure”“user-friendly”等定性词，替换为可量化指标和 `FR-`、`BR-`、`ERR-` 错误状态。这给出了可检查的验证对象：追溯链是否完整、歧义词是否被替换、验收标准与测试用例是否覆盖错误矩阵。但原文没有给出实际项目的前后对比数据。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
清单中没有与 BA-Kit Open 同名的条目。它与清单中的 **Agent skills**（concept，adopt）直接相关：README 明确说遵循 Agent Skills 标准，并以 `skills/` 目录和斜杠命令组织技能。它可挂在 **Claude Code**（tool，adopt）和 **OpenAI Codex**（tool，adopt）上使用，也列出 **Hermes**（tool，watch）和 **Cursor**（tool，watch）作为宿主；后两者在清单中仍是 watch，成熟度风险会传导到 BA-Kit 的使用体验。README 还链接了 `skills.sh`，对应清单中的 **skills.sh**（source，try）。**Semble**（tool，try）在原文中没有出现，无法判断直接关系。总体看，它不是替代某个工具，而是叠加在编码智能体上的 BA/PO 领域技能包和工作流。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
- **原文给出的可核对信息**：仓库 README 自述包含 56 个 Agent Skills、19 条需求工程规则、47 个模板、9 个 SDLC 阶段、45 种图类型，`diagram-design` 为 v2.6，并给出安装命令、斜杠命令表、Mermaid 渲染脚本命令和一天工作流示例；外部指标只有 36 stars。
- **作者主张而非证据**：README 说可“自动化完整软件规格生命周期”、能“消除歧义”、避免“幻觉假设、bug 和返工、失败 sprint”，并能“一键交接干系人”。这些都没有附 benchmark、客户案例、前后对比数据或失败案例。
- **关键内容未展示**：原文只列出技能、规则和模板的名称，没有给出具体提示词、规则全文、模板内容或脚本实现；因此无法验证技能质量、规则是否真的能自动检测歧义、渲染脚本是否稳定。
- **适用条件**：适合需要规范化 BA/PO 文档的软件项目，且团队愿意按阶段调用命令、维护 Markdown 规格和图表；宿主需支持 Agent Skills。README 的安装示例是 `mkdir`/`ln -s`，未给 Windows 命令，Windows 环境需另行适配。对只需要快速写代码、没有规格文档流程的团队，价值有限。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
**最小试用方式**：选一个真实但范围小的功能需求，在 Claude Code 中按 Option A 挂载技能，或把仓库放进项目工作区按 Option C 使用；然后按 README 的一天流程跑一遍：`/brainstorm` → `/srs` → `/sequence` + `/erd` → `/render-diagrams` → `/wireframe-html`（可选）→ `/userstory` + `/ac` → `/test-cases` → `/preview`。同时保留团队原有流程做对照，不要只跑新流程就下结论。

**建议观察的指标**（原文没有给指标，以下是基于其可检查产出的试用指标）：
- **歧义词数量**：统计 SRS/用户故事中“fast、secure、user-friendly”等定性词出现次数，看是否被替换为可量化指标和 `FR-`、`BR-`、`ERR-` 命名。
- **追溯覆盖率**：检查 `Idea → PRD → SRS → Flows → User Stories → AC → Test Cases` 是否每层都能追到，尤其是每个 `FR-`/`BR-`/`ERR-` 是否有对应测试用例。
- **评审效率**：记录生成 `/preview` 评审包所需时间、干系人评审轮次和返工次数，与原有流程对比。
- **图与原型可用性**：检查 Mermaid 是否成功渲染为独立 HTML/SVG，非技术干系人能否直接打开并理解；线框图是否可点击。
- **变更影响完整性**：模拟一次范围变更，用 `/cr` 看是否产出影响矩阵，并人工核对遗漏项。

**判断标准**：如果上述指标相对原有流程有明显改善（例如歧义词显著减少、追溯链完整、评审轮次或返工减少），再把 BA-Kit 纳入手册；如果只是文档变多但追溯、评审和返工没有改善，则降级为 study/watch。
