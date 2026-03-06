# Vibe Coding Playbook

> Vibe Coding 实战手册：经验、提示词、模板的集中管理库。

## 目录结构

```
vibe-coding-playbook/
├── prompts/        # 提示词集合（系统提示词、工作流提示词、审计提示词等）
├── experiences/    # 实战经验（踩坑记录、最佳实践、案例复盘等）
├── templates/      # 可复用模板（Prompt 模板、项目脚手架配置等）
└── tools/          # 工具配置与脚本（AI IDE 配置、MCP 配置等）
```

## 使用方式

- **prompts/**：存放经过验证的提示词，按前端/后端/通用分类
- **experiences/**：记录 vibe coding 过程中的经验教训
- **templates/**：可直接复用的模板文件
- **tools/**：辅助工具和配置

## 内容索引

### 提示词

| 文件 | 说明 |
|------|------|
| [AI IDE 全局规则](prompts/global-rules.md) | AI IDE 的全局行为约束与协作规范（适用于 Windsurf / Cursor 等） |
| [前端 Vibe 工作流](prompts/frontend-vibe-workflow.md) | 前端 AI 协作的铁律、质量门、组件结构、审计清单 |
| [后端 Vibe 工作流](prompts/backend-vibe-workflow.md) | 后端 AI 协作的不变量、DoD、LLM 集成、慢 SQL 定位 |

### 实战经验

| 文件 | 说明 |
|------|------|
| [复杂度管理与人机协作 SOP](experiences/vibe-coding-sop.md) | 四阶段 SOP：前置基建 → 过程控制 → 质量闸口 → 维护修复 |
| [AI 高质量交付前端 UI](experiences/design-to-code.md) | 有设计稿：工具转码 → AI 重构；无设计稿：组件库 / AI 设计工具方案 |

### 工具配置

| 文件 | 说明 |
|------|------|
| [MCP 服务配置](tools/mcp-servers.json) | MCP Server 配置模板（Context7 / Exa / Tavily / Ace Tool），需自行填入 API Key |
| [MCP 服务说明](tools/mcp-servers.md) | 每个 MCP Server 的用途、核心能力、获取密钥方式及配置说明 |
