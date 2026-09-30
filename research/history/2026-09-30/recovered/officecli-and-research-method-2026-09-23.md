# OfficeCLI 与调研方法分层：历史讨论

> 历史材料，归档于 2026-09-30。本文件恢复当时的用户讨论与 AI 回答，未重新核验外部能力、数字、版本或“已测试”声明。安装命令和推荐仅是历史正文，不代表本次执行或当前建议。涉及提问所在项目的限制只属于当时上下文。

阅读上下文：用户随后澄清，想沉淀的是“发现 AI 相关资料的方法”，不是只围绕 OfficeCLI 创建 Skill；见本目录 README 的 09-23 记录。

## OfficeCLI 的实际工作场景

### 历史 AI 回答 · 原会话第 113 行

来源：`~/.codex/sessions/2026/09/23/rollout-2026-09-23T09-46-57-01a0cbf1-d06c-7331-a4a2-46ec9798bdca.jsonl:113`。

OfficeCLI 的核心场景是：

> **让 AI Agent 直接创建、读取、修改和检查 Word、Excel、PowerPoint 文件。**

它不是 Microsoft Office 的 GUI 替代品，更像是给 Codex、Claude Code 这类 Agent 使用的“Office 文件工具箱”。

典型用途：

- **自动制作 PPT**
  - 根据 Markdown、调研资料生成 `.pptx`
  - 修改现有演示文稿的文案、布局、图表和图片
  - 批量套用模板、替换品牌信息

- **处理 Word 文档**
  - 生成报告、合同、方案书
  - 修改段落、表格、页眉页脚、目录、批注
  - 接受或拒绝修订，批量查找替换
  - 把 LaTeX 公式、Mermaid 图放进文档

- **处理 Excel**
  - 创建工作簿、写入数据和公式
  - 修改已有表格、格式和图表
  - 批量生成月报、对账表、数据汇总表

- **Agent 自动化流水线**
  - “读取 CSV → 分析数据 → 生成 Excel → 制作 PPT → 输出报告”
  - “打开客户模板 → 替换数据 → 导出多个客户版本”
  - 接入定时任务或 CI，自动生成周报和交付物

它比较关键的能力是 **渲染检查闭环**：

```text
Agent 修改文件
    ↓
OfficeCLI 渲染成 HTML/PNG
    ↓
Agent 查看实际页面效果
    ↓
发现溢出、错位、遮挡
    ↓
继续修改
```

这比只操作 Office 文件内部 XML 更可靠，因为“文件成功生成”不代表视觉效果正确。

最适合你的场景可能是：

- 让 Codex 直接交付 `.docx/.xlsx/.pptx`，而不是只给 Markdown
- 自动生成项目方案、架构汇报和阶段报告
- 批量修改现有 Office 模板
- 验证 AI 生成文档的最终视觉效果

它不太适合：

- 依赖复杂 VBA、Office 插件或 Excel 宏的文件
- 需要人工精细排版的最终品牌材料
- 把自然语言直接交给 OfficeCLI。它本身主要是 CLI，通常由上层 Agent 负责理解意图和调用命令

简单说，**OfficeCLI 解决的是“Agent 会写内容，但不会可靠操作真实 Office 文件”这个问题。**

## 接入 Agent 与研究方法分层

### 历史 AI 回答 · 原会话第 147 行

来源：`~/.codex/sessions/2026/09/23/rollout-2026-09-23T09-46-57-01a0cbf1-d06c-7331-a4a2-46ec9798bdca.jsonl:147`。

可以，而且与现有架构是契合的，但应定位为**可绑定到 Agent 的 Office Tool 能力**，不是新的 Runtime 或 Office 产品模块。

有两条不同路径：

1. **智能体生成或修改 Office 文件**
   - 作为现有 MCP/OpenAPI/Mastra Tool 接入。
   - Agent 通过 Tool Binding 获得能力。
   - 输入是源文件 Artifact、操作参数；输出是新的 DOCX/XLSX/PPTX Artifact 和预览文件。
   - 每次调用记录 Invocation、错误、耗时和产物。
   - 不覆盖原文件，每次修改产生新 Artifact。

2. **Web 页面在线预览 Office 文件**
   - 作为 Document Convert Adapter。
   - OfficeCLI 负责 DOCX/PPTX/XLSX → HTML/PNG。
   - 原项目只负责 Artifact 输入输出、执行治理和错误呈现。
   - 这正好对应当前计划里的条件候选：current-plan.md（`~/WebstormProjects/private-project/docs/current-plan.md:57`）。

建议向 Agent 暴露窄接口，而不是任意 shell：

```text
office.inspect    读取文档结构和元数据
office.create     创建 DOCX/XLSX/PPTX
office.edit       修改指定文档
office.render     渲染为 HTML/PNG 供视觉检查
office.export     生成最终 Artifact
```

一次典型运行会是：

```text
用户：根据这份数据制作季度汇报
→ Agent 读取源 Artifact
→ 调用 office.create
→ 调用 office.render
→ Agent 检查截图并修正
→ 输出 PPTX + 预览 Artifact
```

接入时必须守住这些边界：

- OfficeCLI 只是外部组件，不成为原项目的第二 Runtime。
- 不新增 `OfficeDocument` 核心资源或独立生命周期。
- 不让 Agent 直接操作任意宿主机路径。
- 临时目录隔离，限制文件类型、大小、超时和输出路径。
- 宏、外部链接、嵌入对象等高风险内容要拒绝或显式标记。
- CLI 失败必须让 Run/Invocation 真实失败，不能只返回一个空文件。
- 原项目只保证文件按合同生成，不判断报告内容是否业务正确，这符合架构基线（`~/WebstormProjects/private-project/docs/architecture-baseline.md:18`）。

所以技术落点很明确：**OfficeCLI 可以同时成为 Agent Tool 的实现候选和 Document Convert Adapter 的实现候选。** 但进入实现前仍需要一个真实任务和对应样例，例如“数字员工每周生成 PPT 汇报”或“研究助手修改客户 DOCX 模板”；当前计划也明确要求有真实格式样例后再启动，不宜先做通用 Office 能力。

### 历史 AI 回答 · 原会话第 159 行

来源：`~/.codex/sessions/2026/09/23/rollout-2026-09-23T09-46-57-01a0cbf1-d06c-7331-a4a2-46ec9798bdca.jsonl:159`。

如果你指的是“让智能体完成调研并输出报告”，**可以有 Research Skill，但不能把整个调研产品都塞进一个 Skill**。

合理分层是：

```text
Tool：搜索、浏览器、知识库、OfficeCLI
Skill：调研方法、来源核验、引用规范、报告结构
Agent / Workflow：执行完整调研任务
Artifact：输出 Markdown、DOCX、PPTX、证据文件
```

其中：

- **OfficeCLI 是 Tool**：提供真实的文件读写、渲染能力。
- **Research Skill 是方法说明**：规定怎么拆问题、搜哪些来源、如何交叉验证、怎样标注不确定性、最后如何调用 OfficeCLI 生成报告。
- **Agent/Workflow 是产品能力**：负责任务步骤、审批、失败恢复和最终交付。
- **Research 不进入 Core**：架构已经明确它是应用路径，不是平台模块，架构基线（`~/WebstormProjects/private-project/docs/architecture-baseline.md:183`）。

例如 Skill 可以描述：

```text
1. 明确调研问题和时间范围
2. 建立候选池
3. 使用浏览器和搜索 Tool 收集来源
4. 至少两个独立来源交叉验证关键结论
5. 区分事实、推断和未知项
6. 保存来源与中间证据
7. 调用 Office Tool 生成 DOCX/PPTX
8. 渲染检查后再交付
```

是否现在创建，取决于复用频率：

- 只做一次 OfficeCLI 选型：不用 Skill，保存调研记录即可。
- 多个 Agent 都要执行相同的技术选型或行业调研：适合抽成 Skill。
- 步骤固定、需要暂停恢复或人工审批：进一步做成 Workflow。
- 只是需要生成 Office 文件：只接 Office Tool，不需要 Research Skill。

所以当前更准确的组合是：**一个受约束的 Office Tool，加一个可选的 Research Skill；不要用 Skill 代替真实工具能力。**
