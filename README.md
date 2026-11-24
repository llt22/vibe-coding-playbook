# Vibe Coding Playbook

**用 AI 写代码很快，但写出能维护的代码很难。**

这个仓库解决的问题是：当你用 Cursor / Windsurf / Claude Code 等 AI 编程工具开发时，如何**不让项目在高速迭代中失控**——代码越写越乱、AI 越改越偏、Bug 修了又来。

这里沉淀了一套经过实战验证的**提示词、工作流和协作规范**，帮你：

- **约束 AI 行为**：全局提示词规定验证、错误处理、测试和提交的底线
- **指挥多个会话**：用指挥者模式派活、验收，人只在关键点拍板
- **复用工作流**：写作、会话整理、Skill 管理等现成 Skill

> 所有内容持续迭代中，欢迎提 Issue 或 PR 分享你的 Vibe Coding 经验。

---

## 内容索引

### 相关仓库

方法论和自动调研分在两个仓库：这边只放人写的、经过实测的东西；机器产出的调研报告、候选清单和自动合并的手册在另一个仓库。

| 仓库 | 内容 |
|---|---|
| [ai-work-radar](https://github.com/llt22/ai-work-radar)（私有） | 自动调研流水线：从 GitHub/HN/博客/X 采集线索、模型初筛、深度调研、合并成手册并每周修订；同时存 690 条候选清单和 2026-09-30 的历史归档 |

### 提示词

| 文件 | 说明 |
|------|------|
| [AI IDE 全局规则](prompts/global-rules.md) | 贴入 AI 编程工具的全局约束，控制 AI 行为边界（适用于 Cursor / Windsurf / Claude Code 等） |

> 提示词目录只放直接注入 AI 工具的内容。方法论和流程指南见实战经验。

### 实战经验

| 文件 | 说明 |
|------|------|
| [指挥者模式](experiences/commander-mode.md) | 一个指挥会话管目标、派活、验收，执行会话各做一件事；附 Paseo 指挥者 Skill 原文 |

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
| [paseo-tidy](skills/paseo-tidy/SKILL.md) | 整理 Paseo 会话：按主线改名、归档、合并及分工作区，附摘要与移动脚本 |
| [human-writing](skills/human-writing/SKILL.md) | 中文说人话写作、去 AI 味与翻译腔，包含静态检查脚本和回归评测 |

所有 Skill 采用标准 `<skill-name>/SKILL.md` 结构。安装和注册时先阅读
[`skill-management`](skills/skill-management/SKILL.md)，以 `~/skills` 为唯一正本，
再链接到各 AI 工具的 Skill 目录。

---

## 目录结构

```
vibe-coding-playbook/
├── prompts/        # 提示词（直接贴入 AI 工具的规则和指令）
├── experiences/    # 实战经验（工作流、方法论、SOP、案例）
├── tools/          # 工具使用方案（CLI / Skills 等）
├── skills/         # 标准 <skill-name>/SKILL.md 工作流
└── research/       # 博客选题审计（证据在 ai-work-radar 的调研报告里）
```
