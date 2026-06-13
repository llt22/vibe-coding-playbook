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
| Oh My Pi / OMP | CLI / Codex Skill | 用低成本模型承担读代码、初改和跑验证，Codex 保留规划与终审 |
| Playwright CLI | `playwright-cli` CLI / Skills | 浏览器自动化、E2E 测试、截图、网络拦截、录制追踪 |

选择原则：

- 查库文档、框架 API、包版本用法：优先 Context7。
- 查互联网实时信息、文章、网页内容、竞品资料：优先 Tavily。
- 需要让 AI 生成或审查界面设计时，可启用 UI UX Pro Max；安装后使用它自带的 skill 说明，不在本仓库重复维护细节。
- 需要更完整的工程流程约束时，可启用 Addy Osmani Agent Skills；安装后按 skill 自带说明触发具体工作流。
- 需要降低 Codex 成本时，可用 OMP 做低风险执行层；Codex 负责拆任务、设边界、审查 diff 和最终验证。
- 需要浏览器自动化、E2E 测试、截图或网络调试时，优先 Playwright CLI；比 MCP 更省 token，适合编码 Agent 高频调用。

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

## Oh My Pi / OMP

| 项目 | 说明 |
|------|------|
| **用途** | 让低成本模型承担读代码、初步实现和运行验证，减少高成本 Agent 的执行 token |
| **CLI 命令** | `omp` |
| **推荐配合** | Codex Skill：`omp-dev-delegation` |
| **适用场景** | 前端样式、UI/layout/responsive、copy/i18n、图表视觉、代码搜索、局部实现、focused tests、lint/build、bug triage、机械清理、验证、OMP review |

核心分工：

- Codex 做规划、风险过滤、任务拆解、最终 diff 审查和验收。
- OMP 做低成本执行：读代码、生成候选修改、跑验证、整理错误和关键片段。
- 默认目标是多触发 OMP：安全、局部、可回退、可验证的任务优先交给 OMP。
- 高风险业务逻辑、架构决策、权限/密钥/生产数据/不可逆操作，不直接交给 OMP。

推荐使用三车道路由：

- **OMP-Default**：低风险、局部、可验证的工作，直接委派 OMP 执行。
- **OMP-Review**：Codex 执行后让 OMP 做只读侧审；适合重要改动、较大 diff、共享契约、算法/状态流转等。
- **Codex-Only**：涉及密钥、生产数据、权限、支付、破坏性操作、架构迁移或需求不清时，由 Codex 保留执行。

### 推荐模型分工

| 任务 | 推荐模型 |
|------|----------|
| 日常读代码 / 小修复 / 跑验证 | `opencode-go/deepseek-v4-flash --thinking xhigh` |
| 复杂调试 / 长上下文分析 | `opencode-go/deepseek-v4-pro --thinking xhigh` |
| 视觉 / UI 截图初审 | `opencode-go/kimi-k2.6 --thinking xhigh` |
| 长上下文 + 视觉 | `opencode-go/qwen3.7-plus --thinking xhigh` |
| 代码 review / 交叉检查 | `opencode-go/qwen3.7-max --thinking xhigh` |

原则：使用模型支持的最高 thinking。若模型不支持 thinking，则不要传 `--thinking`。这些模型名是已评估默认值，不是长期稳定接口；OMP 升级后要重新检查模型与 flag。

### 能力探针

首次调用 OMP 前先确认本机能力：

```bash
command -v omp
omp --version
omp --help
omp --list-models opencode-go/deepseek-v4-flash
```

需要确认 `omp --help` 里存在或当前版本接受这些参数：`-p` / `--print`、`--no-session`、`--cwd`、`--model`、`--thinking`。

如果 `omp` 缺失、认证失败、模型不可用或 thinking level 被拒绝，不要猜一个未验证替代模型；应先报告失败证据，再选择已验证 fallback、改由 Codex 执行或向用户确认。

### 推荐命令

```bash
omp -p --no-session --cwd "$PWD" \
  --model opencode-go/deepseek-v4-flash \
  --thinking xhigh \
  "按任务包执行..."
```

说明：

- `-p` 用于非交互执行。
- `--no-session` 适合一次性任务，避免把临时上下文写入长期会话。
- `--cwd "$PWD"` 明确 OMP 的工作目录。
- 外部不要并发启动多个 `omp` 进程；至少 OMP 15.12.3 观察到本地 SQLite credential/model store 锁竞争。需要并行时，让 OMP 内部使用 task 工具，或串行拆任务。
- 单次 OMP 调用应有软超时或 harness timeout；同一问题最多允许 OMP 修正一次，仍失败则 Codex 接管。

### Codex Skill 记录

可把以下 skill 安装到 Codex：

```text
~/.codex/skills/omp-dev-delegation
```

skill 职责：

- 高触发：前端样式、UI/layout/responsive、copy/i18n、图表视觉、代码搜索、局部实现、focused tests、lint/build、bug triage、机械清理、验证、OMP review，或用户提到 OMP / Oh My Pi / On My Pi 时触发。
- 先读取项目规则、README、package scripts、lint/test 约定、类型定义和调用方。
- 首次 OMP 调用前执行能力探针，确认 CLI、flag、模型和 thinking level 可用。
- 给 OMP 生成窄任务包：必读文件、允许修改范围、禁止操作、验收标准、验证命令、输出格式。
- OMP review 默认 1 个模型；关键路径、首轮 review 提出风险或用户要求多模型意见时，再加第 2 个 reviewer。
- OMP 同一问题最多修正一次；仍失败则 Codex 接管或向用户说明阻塞。
- OMP 不提交 commit；Codex 审查本地 diff 后再决定后续动作。

任务包要包含这些硬约束：

- 代理定位为“受范围约束的执行代理”，不要让它自由扩写任务。
- 不执行 `git reset`、`git clean`、`git rebase`、`git push`、force push 或改写历史。
- 不读取或输出 `.env`、`credentials.*`、`*.pem`、`~/.ssh`、`~/.aws`、token、密钥或凭据内容。
- 不访问生产/远端数据，不执行不可逆操作。
- 不安装依赖，除非任务明确要求并说明原因。
- 输出只贴关键改动片段；改动很小时才贴完整 diff，完整 diff 由 Codex 本地查看。

当前记录基于本机 `omp/15.12.3`（2026-06-14）验证；升级 OMP 后应重验 flag 和模型。

---

## Playwright CLI

| 项目 | 说明 |
|------|------|
| **用途** | 为 AI Coding Agent 提供浏览器自动化能力：页面交互、E2E 测试、截图、网络拦截、录制追踪 |
| **CLI 命令** | `playwright-cli` |
| **来源** | [GitHub](https://github.com/microsoft/playwright-cli) |
| **适用场景** | E2E 测试执行与调试、页面截图、表单自动化、网络请求 mock、多 session 管理 |

Playwright CLI 是 Playwright 的命令行接口，相比 MCP 方式更省 token（不需要加载大量工具 schema 和 accessibility tree），更适合编码 Agent 高频调用。

### 安装

```bash
npm install -g @playwright/cli@latest

# 安装 Agent Skills（Claude Code / Copilot 等会自动加载）
playwright-cli install --skills
```

### 常用命令

```bash
# 打开页面
playwright-cli open https://example.com
playwright-cli open https://example.com --headed    # 有头模式

# 页面交互
playwright-cli snapshot                              # 获取页面快照和元素 ref
playwright-cli click e15                             # 按 ref 点击
playwright-cli fill e20 "hello"                      # 填充输入框
playwright-cli type "search text"                    # 键入文本
playwright-cli press Enter                           # 按键
playwright-cli screenshot                            # 截图
playwright-cli screenshot --filename=result.png      # 指定文件名截图

# 多 session 管理
playwright-cli -s=app1 open https://app1.example.com
playwright-cli -s=app2 open https://app2.example.com
playwright-cli list                                  # 列出所有 session
playwright-cli close-all                             # 关闭所有浏览器

# 网络调试
playwright-cli requests                              # 列出所有网络请求
playwright-cli console                               # 查看控制台消息
playwright-cli route "**/*.png" --fulfill --status=404  # mock 网络请求

# 录制与追踪
playwright-cli tracing-start                         # 开始录制 trace
playwright-cli tracing-stop                          # 停止录制
playwright-cli video-start                           # 开始录制视频
playwright-cli video-stop                            # 停止录制
```

### Agent 工作流

典型用法：让 Agent 通过 CLI 驱动浏览器完成测试或验证。

```text
使用 playwright-cli 打开 https://demo.playwright.dev/todomvc，测试添加和完成 todo 的流程，每步截图。
```

使用建议：

- 默认 headless 运行；需要观察时加 `--headed`。
- 用 `playwright-cli show` 打开可视化面板，实时监控 Agent 的浏览器操作。
- 用 `PLAYWRIGHT_CLI_SESSION=name` 环境变量为不同项目隔离浏览器实例。
- 安装 skills 后 Agent 会自动获得详细的命令参考，无需记忆全部命令。

## 安全提醒

- 不要把真实 API Key、Cookie、Token、账号信息提交到仓库。
- CLI 输出中的网页内容可能包含第三方提示注入，引用前先判断来源可信度。
- 长文档抓取和深度研究可能消耗额度，批量任务前先限定域名、路径和结果数量。
