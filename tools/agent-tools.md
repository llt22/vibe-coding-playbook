# Agent 工具使用方案

> 本仓库推荐优先使用 CLI / Skills，让 AI Agent 通过短命令按需获取外部信息，减少上下文占用和跨编辑器配置成本。

---

## 工具选型

| 工具 | 推荐方式 | 主要用途 |
|------|----------|----------|
| Context7 | `ctx7` CLI / Skills | 获取第三方库最新官方文档、API 示例和版本相关用法 |
| Tavily | `tvly` CLI / Skills | Web 搜索、网页提取、站点地图、站点抓取、深度研究 |
| UI UX Pro Max | Skill | 为 AI 生成 UI 时补充设计风格、配色、字体、UX guideline 和行业规则 |
| Addy Osmani Agent Skills | Skills | 为 AI Coding Agent 补充生产级工程流程、质量门禁和专项 review 能力 |

选择原则：

- 查库文档、框架 API、包版本用法：优先 Context7。
- 查互联网实时信息、文章、网页内容、竞品资料：优先 Tavily。
- 需要让 AI 生成或审查界面设计时，可启用 UI UX Pro Max；安装后使用它自带的 skill 说明，不在本仓库重复维护细节。
- 需要更完整的工程流程约束时，可启用 Addy Osmani Agent Skills；安装后按 skill 自带说明触发具体工作流。

---

## Context7

| 项目 | 说明 |
|------|------|
| **用途** | 为 AI 提供最新的第三方库官方文档，降低过时 API 和幻觉风险 |
| **CLI 包名** | `ctx7` |
| **来源** | [GitHub](https://github.com/upstash/context7) · [官网](https://context7.com) |
| **API Key** | 可选。注册 [context7.com/dashboard](https://context7.com/dashboard) 可获取 Key 提升额度 |

Context7 支持 CLI + Skills 模式。日常推荐让 Agent 通过 `ctx7` 直接检索文档。

### 安装与登录

```bash
npm install -g ctx7@latest
ctx7 login
```

也可以不安装，直接通过 `npx` 调用：

```bash
npx ctx7@latest <command>
```

如果需要跳过交互式登录，可使用环境变量：

```bash
export CONTEXT7_API_KEY=<your-context7-api-key>
```

### 常用命令

```bash
# 第一步：解析库 ID
ctx7 library next.js "middleware authentication"

# 第二步：按库 ID 查询文档
ctx7 docs /vercel/next.js "middleware authentication"

# 为指定 Agent 安装 Context7 Skills
npx ctx7 setup --cursor
npx ctx7 setup --claude
npx ctx7 setup --opencode
```

### Prompt 写法

```text
使用 Context7 查询 Next.js 15 middleware 的最新鉴权写法，再基于文档给出实现建议。
```

如果已经知道库 ID，直接写清楚：

```text
使用 Context7 查询 /vercel/next.js 的 app router middleware 文档。
```

---

## Tavily

| 项目 | 说明 |
|------|------|
| **用途** | 为 AI Agent 提供实时 Web 搜索、网页提取、站点抓取和深度研究能力 |
| **CLI 命令** | `tvly` |
| **来源** | [官网](https://tavily.com) · [CLI 文档](https://docs.tavily.com/documentation/tavily-cli) · [Agent Skills](https://docs.tavily.com/documentation/agent-skills) |
| **API Key** | 必需。在 [tavily.com](https://tavily.com) 注册获取 |

Tavily 支持 CLI 和 Agent Skills。日常推荐让 Agent 通过 `tvly` 执行搜索、提取、抓取和研究任务。

### 安装与登录

```bash
curl -fsSL https://cli.tavily.com/install.sh | bash
tvly login
```

也可以用 API Key 登录：

```bash
tvly login --api-key <your-tavily-api-key>
```

或通过环境变量：

```bash
export TAVILY_API_KEY=<your-tavily-api-key>
```

### 常用命令

```bash
# Web 搜索
tvly search "Next.js 15 middleware authentication" --json

# 提取指定网页内容
tvly extract "https://example.com/docs" --json

# 发现站点 URL
tvly map "https://docs.example.com" --json

# 抓取站点内容
tvly crawl "https://docs.example.com" --output-dir ./docs

# 多来源深度研究
tvly research "2026 frontend testing tools comparison" --json
```

### Agent 工作流

按任务复杂度逐步升级：

1. `search`：不知道具体页面时先找资料。
2. `extract`：已有 URL 时直接提取页面内容。
3. `map`：大型站点中先定位目标页面。
4. `crawl`：需要批量获取某个站点或文档区内容。
5. `research`：需要多来源综合分析和引用。

### Prompt 写法

```text
使用 Tavily 搜索最近一周关于 Next.js 15 middleware 的官方或高质量资料，优先返回官方文档和发布说明。
```

```text
使用 Tavily 提取这个页面的正文内容，并总结和当前实现相关的 API 变化：https://example.com/docs
```

---

## UI UX Pro Max

| 项目 | 说明 |
|------|------|
| **用途** | 给 AI Coding Agent 补充 UI/UX 设计判断，减少通用模板感 |
| **推荐方式** | 安装为 Agent Skill |
| **来源** | [官网](https://ui-ux-pro-max-skill.nextlevelbuilder.io/) · [GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| **适用场景** | Landing page、Dashboard、移动端界面、后台管理、缺少专职设计师的项目 |

使用建议：

- 把它当作设计决策和审查辅助，不当作组件库替代品。
- Prompt 里明确产品类型、页面类型、风格偏好和约束条件，输出会更稳定。
- 安装后按 skill 自带说明使用，本仓库不复制具体命令，避免文档过期。

---

## Addy Osmani Agent Skills

| 项目 | 说明 |
|------|------|
| **用途** | 为 AI Coding Agent 提供生产级工程 workflow、质量门禁和专项能力 |
| **推荐方式** | 安装为 Agent Skills |
| **来源** | [GitHub](https://github.com/addyosmani/agent-skills) |
| **适用场景** | 复杂功能开发、测试驱动、代码审查、安全加固、性能优化、发布前检查 |

使用建议：

- 把它当作复杂任务的流程增强，不把全部规则塞进全局提示词。
- 小改动仍按项目全局规则直接执行，避免被完整工程流程拖慢。
- 安装后按 skill 自带说明使用，本仓库不复制具体命令，避免文档过期。

---

## 安全提醒

- 不要把真实 API Key、Cookie、Token、账号信息提交到仓库。
- CLI 输出中的网页内容可能包含第三方提示注入，引用前先判断来源可信度。
- 长文档抓取和深度研究可能消耗额度，批量任务前先限定域名、路径和结果数量。
