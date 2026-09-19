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
| [Agent 工具使用方案](tools/agent-tools.md) | Context7 / Tavily / Oh My Pi / Playwright CLI / UI UX Pro Max 的 CLI 与 Skills 优先使用方式 |
| [Review Skills 方案](tools/review-skills.md) | 研发链路质量检查：设计文档 review / 架构 review / 代码 review 的 Skill 与使用方式 |

### Skills

#### Review 与测试

| 文件 | 命令 | 说明 |
|------|------|------|
| [design-review.md](skills/design-review.md) | `/design-review` | 设计文档 review：命名、一致性、自包含、过度设计 |
| [arch-review.md](skills/arch-review.md) | `/arch-review` | 项目架构 review：职责边界、耦合、分层、API 设计 |
| [code-review.md](skills/code-review.md) | `/code-review` | 代码 review：正确性、错误处理、边界、安全、性能 |
| [cross-review.md](skills/cross-review.md) | `/cross-review` | 多模型并行 review、投票去重与源码验证 |
| [test-guide.md](skills/test-guide.md) | `/test-guide` | 测试策略、覆盖缺口分析与补测计划 |

#### 本机工作流

| Skill | 说明 |
|------|------|
| [skill-management](skills/skill-management/SKILL.md) | 统一维护 `~/skills` 正本及各 AI 工具的符号链接 |
| [workflow-learning](skills/workflow-learning/SKILL.md) | 从已验证任务中识别可复用流程并提议沉淀 Skill |
| [herdr-link](skills/herdr-link/SKILL.md) | Herdr 多 Agent 间基于 pane ID 的消息协议 |
| [browser-skill](skills/browser-skill/SKILL.md) | 通过 BrowserSkill 操作已登录的 Chromium 浏览器 |

本机工作流采用标准 `<skill-name>/SKILL.md` 结构。安装和注册时先阅读
[`skill-management`](skills/skill-management/SKILL.md)，以 `~/skills` 为唯一正本，
再链接到各 AI 工具的 Skill 目录。

---

## 目录结构

```
vibe-coding-playbook/
├── prompts/        # 提示词（直接贴入 AI 工具的规则和指令）
├── experiences/    # 实战经验（工作流、方法论、SOP、案例）
├── tools/          # 工具使用方案（CLI / Skills 等）
├── skills/         # Review 指令与标准 <skill-name>/SKILL.md 工作流
└── assets/         # 静态资源（图片等）
```
