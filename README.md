# Vibe Coding Playbook

**用 AI 写代码很快，但写出能维护的代码很难。**

这个仓库解决的问题是：当你用 Cursor / Windsurf / Claude Code 等 AI 编程工具开发时，如何**不让项目在高速迭代中失控**——代码越写越乱、AI 越改越偏、Bug 修了又来。

这里沉淀了一套经过实战验证的**提示词、工作流和协作规范**，帮你：

- **约束 AI 行为**：让它遵守你的代码风格、不擅自重构、不乱删代码
- **控制代码质量**：前后端核心质量问题有章可循（组件结构、状态管理、不变量、可测结构等）
- **高效交付 UI**：有设计稿用工具转码 + AI 重构，没设计稿用组件库 + AI 设计工具
- **管理复杂度**：从项目启动到维护修复，每个阶段都有明确的过程规范

> 所有内容持续迭代中，欢迎提 Issue 或 PR 分享你的 Vibe Coding 经验。

---

## 内容索引

### 研究资料

| 文件 | 说明 |
|------|------|
| [历史会话研究资料（2026-09-30 归档）](research/history/2026-09-30/README.md) | 历史报告、专题讨论、方法快照、阿里手册原 PDF 与 O’Reilly 提取文本；附来源与校验记录，历史结论尚未重新核验 |
| [研究问题与补漏台账](research/history/2026-09-30/supplement-audit.md) | 更早的资料线索、已有实验入口、用户纠正与尚缺原件；为覆盖各种工作场景的 AI 使用研究提供输入 |
| [AI 使用研究候选清单](research/catalog/README.md) | 从历史材料提炼的 690 条工具、方法、案例和信源，标注研究问题、证据强度与建议状态；先看 P1 与待核实清单 |
| [可执行手册](playbooks/README.md) | 按工作场景组织、可照着做的 AI 工作方法：适用条件、编号步骤、判断标准、常见坑。由调研服务自动合并和修订，均未经实测 |
| [调研服务](service/DESIGN.md) | 全自动：从 GitHub、HN、博客、X 采集线索，模型初筛并挑选深入调研，把可照做的结论合并进上面的手册并提交。在本机常驻 |

### 提示词

| 文件 | 说明 |
|------|------|
| [AI IDE 全局规则](prompts/global-rules.md) | 贴入 AI 编程工具的全局约束，控制 AI 行为边界（适用于 Cursor / Windsurf / Claude Code 等） |

> 提示词目录只放直接注入 AI 工具的内容。方法论和流程指南见实战经验。

### 实战经验

| 文件 | 说明 |
|------|------|
| [前端 Vibe 工作流](experiences/frontend-vibe-workflow.md) | 核心原则、组件结构、状态管理、Prompt 写法、审计清单 |
| [后端 Vibe 工作流](experiences/backend-vibe-workflow.md) | 不变量、DoD、LLM 集成、慢 SQL 定位 |
| [复杂度管理与人机协作 SOP](experiences/vibe-coding-sop.md) | 四阶段 SOP：前置基建 → 过程控制 → 质量闸口 → 维护修复 |
| [AI 高质量交付前端 UI](experiences/design-to-code-workflow.md) | 有设计稿 / 无设计稿两种场景的完整方案 |

### 工具配置

| 文件 | 说明 |
|------|------|
| [Agent 工具使用方案](tools/agent-tools.md) | Context7 / Tavily / Oh My Pi（含 Claude 1 小时缓存、Context Mode）/ Playwright CLI / UI UX Pro Max 的 CLI 与 Skills 优先使用方式 |
| [Claude Code 配置（Opus 5.5）](tools/claude-code-opus-config.md) | Opus 5.5 发布后的官方推荐配置、成本原理、1 小时缓存与压缩阈值取舍 |

### Skills

| Skill | 说明 |
|------|------|
| [skill-management](skills/skill-management/SKILL.md) | 统一维护 `~/skills` 正本及各 AI 工具的符号链接 |
| [workflow-learning](skills/workflow-learning/SKILL.md) | 从已验证任务中识别可复用流程并提议沉淀 Skill |
| [herdr-link](skills/herdr-link/SKILL.md) | Herdr 多 Agent 间基于 pane ID 的消息协议 |
| [ai-tool-radar](skills/ai-tool-radar/SKILL.md) | 扫描和验证开发者社区中值得关注的 AI 与 Agent 工具 |
| [paseo-senior-advisor](skills/paseo-senior-advisor/SKILL.md) | 在放弃、缩减范围或将未决工程决策交还用户前咨询 Paseo 高级顾问 |

所有 Skill 采用标准 `<skill-name>/SKILL.md` 结构。安装和注册时先阅读
[`skill-management`](skills/skill-management/SKILL.md)，以 `~/skills` 为唯一正本，
再链接到各 AI 工具的 Skill 目录。

---

## 目录结构

```
vibe-coding-playbook/
├── research/       # 研究资料、历史报告与来源记录
├── prompts/        # 提示词（直接贴入 AI 工具的规则和指令）
├── experiences/    # 实战经验（工作流、方法论、SOP、案例）
├── tools/          # 工具使用方案（CLI / Skills 等）
└── skills/         # 标准 <skill-name>/SKILL.md 工作流
```
