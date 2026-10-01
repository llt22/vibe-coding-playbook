# kostja94/bricks

- 结论：**值得一试**。建议按 README 的安装命令引入 component-builder，并在一个有明确边界的组件任务上小范围试用；它把组件责任、上下文、变体、状态和验证要求前置为契约，能约束 agent 少写脱离项目的 UI 代码，但目前只有作者主张和流程说明，缺少效果数据，不宜直接全量采用。
- 原文：https://github.com/kostja94/bricks
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T15:26:57.599Z

## 是什么
Bricks 是给编码 agent 的组件层 skill，提供“实现感知契约”，让 agent 在写代码前理解组件的责任、上下文、变体、内容、交互状态、技术边界和验证要求。安装后通过 component-builder 技能使用。它不提供固定 React/Vue/CSS 包或通用设计系统，而是让目标产品决定布局、排版、密度、内容和实现。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
前提：使用支持 skills 的编码 agent；目标项目已有代码库、组件、设计令牌、框架、路由和响应式约定；任务是一个命名组件或有界组合，不是整页或整产品。

1. 安装 skill：
```bash
npx skills add kostja94/bricks --skill component-builder
```
2. 给 agent 一个有界组件任务，并把项目上下文和验证要求写进请求。README 给出的完整示例：
```text
Use component-builder to build the footer for this bilingual SaaS site.

Read the existing routes, components, design tokens, framework, and responsive conventions first. Reuse project primitives, include the real product, resource, company, and legal destinations, and verify keyboard access on mobile and desktop.
```
3. 要求 agent 按 component-builder 的六步流程执行：检查页面、邻近组件、令牌、依赖、数据模型、响应式约定和测试；识别组件的规范概念、用户任务、界面和归属边界；只加载匹配的组件参考和共享质量门；从真实内容和上下文选择变体；复用项目原语并实现所需状态和交互；在真实页面中验证组件，而不是只在孤立预览中验证。
4. 对复杂领域行为组件（编辑器、数据网格、图表、日历、可访问性原语），如果项目没有现成方案，要求 agent 使用成熟库。
5. 检查输出边界：不替换项目约定，不引入第二套设计系统，不发明路由/链接/目的地；FAQ 等要暴露答案给辅助技术；Task Input 等要实现加载、取消、无效输入、结果恢复等状态。
6. 若要开发或修改 Bricks 仓库本身，可运行：
```bash
npm test
```
目标项目则应按项目已有测试、lint、类型检查和真实页面交互验证。原文的 npm test 用于校验组件目录、参考路径、schema 期望、页面上下文关系和 component-builder Skill。

## 对应的研究问题
- 能力发现：AI 可承担的不只是“写组件代码”，还包括组件责任界定、上下文和变体选择、项目原语复用、交互状态补齐、集成验证。README 点出 Footer、FAQ、Task Input、Agent Workspace 等容易出错的组件类型。
- 任务匹配：适合一个命名组件或有界组合模式，尤其界面组件；完整页面用 Pagina；复杂域行为组件优先用成熟库；不适合整产品规划、完整网站定义或纯编辑文案。当前 Skill 不维护独立审计或重建流程。
- 条件供给：需要给 agent 读取现有路由、组件、设计令牌、框架、响应式约定、依赖、数据模型和测试的权限/信息；需要真实产品、资源、公司、法律等目标链接和内容；需要明确组件责任、上下文、变体、内容、交互状态、技术边界和验证要求。Bricks 提供 catalog/components.json、references、quality-gates.md、workflow.md 等参考和确定性校验脚本。
- 主动推进：原文没有给出时间、事件或状态触发的持续完成机制；流程是请求驱动，先给有界组件任务再构建。此项无依据。
- 效果验证：六步流程最后一步要求在真实页面中验证，而非孤立预览；仓库有 scripts/validate.mjs 和 npm test 做确定性检查；quality-gates.md 作为组件验收标准。但 README 明确不声称未在目标项目中实际验证的性能、可访问性、合规或转化结果。

## 与已有做法的关系
清单中没有相关条目。原文提到可与 Pagina 配合：Pagina 定义完整页面契约并推荐必需组件概念，Bricks 指导项目原生组件构建，最终代码和设计系统归目标仓库所有；但 Pagina 不在给定清单条目中。

## 证据与局限
原文给出的可操作材料：安装命令、完整示例提示词、六步工作流、仓库结构、组件覆盖分组、catalog/components.json、schema、validate.mjs、npm test、MIT 许可。指标只有 GitHub stars 77，不能证明效果。
原文案例多为主张和举例：Footer 可能发明路由、FAQ 可能对辅助技术隐藏答案、Task Input 可能遗漏加载/取消/无效输入/结果恢复、Agent Workspace 可能缺少对话/工具/工件/用户控制边界。这些说明常见失败模式，但没有量化数据、对照实验或实际项目结果。
未给出：使用 Bricks 前后的成功率、返工次数、时间节省、可访问性/性能/转化验证结果。适用条件：支持 skills 的编码 agent；目标项目已有设计系统和约定；任务边界清晰；复杂域组件不重复造轮子。边界：不规划整产品、不定义完整网站、不拥有纯编辑文案。

## 怎么试、怎么验证
最小试用：选一个现有项目中已有类似实现、边界清晰的组件任务（如 Footer 或 FAQ），先用原示例提示词或仿写请求让 agent 使用 component-builder，再让同一 agent 在不使用 Bricks 的情况下做同样任务作为基线。要求它先读现有 routes、components、design tokens、framework、responsive conventions，并最终在真实页面集成。
判断改善的建议指标：是否复用项目原语；是否引入第二套设计系统或不必要的新库；是否发明路由/链接/目的地；移动端和桌面键盘访问是否通过；响应式问题数量；加载、取消、无效输入、结果恢复等状态覆盖数量；项目测试、lint、类型检查是否通过；人工评审返工轮次和修改量。以上指标是验证方法建议，原文未提供对应量化结果。
