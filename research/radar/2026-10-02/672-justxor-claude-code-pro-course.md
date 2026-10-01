# justxor/claude-code-pro-course

- 结论：**值得一试**。建议小范围试：先把 README 里可直接复制的片段（短 CLAUDE.md、permissions 的 allow/ask/deny、PostToolUse 自动格式化 hook、subagent 与 skill 定义、Plan mode 工作流）在单个真实项目上落地，再决定是否引入其 starter-kit 安装脚本与 CI 集成；理由是这些配置具体到可照抄、覆盖了上下文供给与自动化触发两条主线，但仓库自带的 install.sh／labs／starter-kit 具体内容与任何效果数据都未在原文中给出，不足以直接判定为成熟可采用的成品。
- 原文：https://github.com/justxor/claude-code-pro-course
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T17:27:16.136Z

## 是什么

`justxor/claude-code-pro-course` 是一个俄语的 Claude Code 实战课程仓库（README 声称有 12 个模块、8 个实验、starter-kit、13 类任务的提示词库、插件示例和 GitHub Actions 示例，109 stars）。它的 README 本身就是一份可照抄的配置手册，覆盖 CLAUDE.md、settings/permissions、skills、subagents、hooks、MCP、插件、headless 模式与 CI。

核心主张：Claude Code 是 agent 而不是代码补全，它自己决定读哪些文件、跑哪些命令，循环执行“动作 → 校验”直到任务完成；使用者的工作是给它目标、上下文和验证结果的手段。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 1. 安装与起步（前提：macOS / Linux / WSL）

```bash
# 1. 安装 Claude Code
curl -fsSL https://claude.ai/install.sh | bash     # macOS / Linux / WSL
# 或: npm install -g @anthropic-ai/claude-code

# 2. 把 starter-kit 装进你的项目
git clone https://github.com/justxor/claude-code-pro-course.git
bash claude-code-pro-course/install.sh ~/path/to/my-project

# 3. 启动
cd ~/path/to/my-project && claude
> /context          # 看上下文里装了什么
> /onboard          # starter-kit 的 skill：项目概览
```

注意：`install.sh` 的脚本内容在原文中没有展示，执行前应先审查。也可以跳过 starter-kit，直接手写下面几项配置。

### 2. 写一个短而具体的 `CLAUDE.md`（项目记忆）

原文给的可直接改用的模板：

```markdown
# Проект: магазин на Next.js + PostgreSQL

## Команды
- npm run dev — запуск
- npm test — тесты (Vitest), npm run lint — линтер
- npm run db:migrate — миграции (только с подтверждения!)

## Архитектура
- src/app — роуты, src/lib — бизнес-логика, src/db — доступ к БД
- Вся работа с БД только через src/db, не из компонентов

## Правила
- TypeScript strict, без any
- Новый код — с тестами, баг — сначала падающий тест
- Не трогать src/legacy без явной просьбы
- Перед завершением задачи: npm test && npm run lint
```

原则（原文明确）：命令、风格、禁令，短；细节放到 `.claude/rules/` 和 skills；超过几百行会让重点淹没并浪费上下文。`/init` 可自动生成，`/memory` 可编辑。

### 3. 用 allowlist 管权限，而不是 bypassPermissions

`.claude/settings.json`：

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run test:*)",
      "Bash(npm run lint)",
      "Bash(git status)",
      "Bash(git diff:*)"
    ],
    "ask": [
      "Bash(git push:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(rm -rf:*)",
      "Bash(curl:*)"
    ]
  }
}
```

检查顺序是 deny → ask → allow，deny 永远优先。原文的安全清单：密钥用 deny 关掉且不写进 CLAUDE.md；`git push`、部署、迁移必须确认；无人值守运行（`-p`、CI、`--dangerously-skip-permissions`）只在无生产访问的容器/沙箱里；把外部与 MCP 数据当作数据而非指令，防提示注入；提交前看 `git diff`，不要“全部接受”。

### 4. 加 PostToolUse hook，让格式化“必然发生”

原文说法：CLAUDE.md 是请求，hook 是规则，hook 可以阻断动作。

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write" }
        ]
      }
    ]
  }
}
```

事件与用途对照（原文表）：`SessionStart` 载入当前分支和待办；`UserPromptSubmit` 给每条提示补上下文；`PreToolUse` 拦 `rm -rf`、`.env` 和迁移文件（`exit 2` + stderr 说明原因即阻断）；`PostToolUse` 跑格式化、lint、针对改动文件的测试；`Notification` 桌面提醒；`Stop` 收尾检查（测试绿了才允许结束）；`PreCompact` 在压缩上下文前保存要点。

### 5. 定义 subagent，把“嘈杂”的活儿隔离出去

`.claude/agents/reviewer.md`：

```markdown
---
name: reviewer
description: Ревью изменений перед коммитом. Используй после любой заметной правки.
tools: Read, Grep, Glob, Bash
model: sonnet
---
Ты строгий ревьюер. Проверь git diff на баги, пограничные случаи,
утечки секретов и нарушения стиля из CLAUDE.md.
Отвечай списком: файл:строка — проблема — как исправить.
```

子代理在独立上下文窗口工作，只把结论返回主会话（如 explorer 只回摘要、test-runner 只回失败用例、security-reviewer 只回发现列表）。

### 6. 把重复三次以上的流程写成 skill

`.claude/skills/release-notes/SKILL.md`：

```markdown
---
name: release-notes
description: Готовит release notes по коммитам с последнего тега. Используй, когда просят релиз, changelog или заметки к версии.
---
1. Найди последний тег: git describe --tags --abbrev=0
2. Собери коммиты: git log <тег>..HEAD --oneline
3. Сгруппируй: ✨ Новое, 🐛 Исправления, ⚙️ Внутреннее
4. Пиши для пользователей, а не для разработчиков
5. Добавь блок в начало CHANGELOG.md
```

调用 `/release-notes`，或由 Claude 按 description 自动触发。

### 7. 接 MCP，接上外部系统

```bash
# 浏览器，用于验证 UI 和截图
claude mcp add playwright -- npx @playwright/mcp@latest

# 查看已连接的 server 及其状态
claude mcp list
```

团队共用的 `.mcp.json` 放在仓库根：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

不用的 MCP server 要关掉——工具描述本身也占上下文。

### 8. headless / 脚本 / CI 里跑

```bash
# 脚本或 CI 里的单次请求
claude -p "Найди причину падения сборки" --output-format json < build.log

# push 前审自己的 diff
git diff main | claude -p "Сделай ревью: баги, пограничные случаи, безопасность"

# 限制工具与步数
claude -p "Обнови CHANGELOG по последним коммитам" --allowedTools "Read,Edit,Bash(git log:*)" --max-turns 10

# 批量迁移：逐文件
for f in $(git ls-files 'src/**/*.js'); do
  claude -p "Переведи $f на TypeScript, не меняя поведения" --allowedTools "Read,Edit,Bash(npx tsc:*)"
done
```

GitHub 集成最快的做法是在 Claude Code 里执行 `/install-github-app`，之后可直接在 issue / PR 里写：

```text
@claude реализуй эту задачу и открой PR
@claude сделай ревью этого PR с фокусом на безопасность
```

### 9. 主工作流：Explore → Plan → Code → Verify → Commit

- 任何超过一个文件的改动，先用 Plan mode（`Shift+Tab` 循环切换：普通 → auto-accept edits → plan）。
- 先只读、出计划（文件、步骤、风险、怎么验证），人改计划，再让它实现。
- 每轮实现后跑测试/lint/构建，未绿继续循环。
- 结束后看 diff，再让它提交、开 PR。
- 一个任务一个会话：`/clear` 开新任务，长任务 `/compact`（可带指令，如“只保留 API 相关决策”）。`/rewind` 或 `Esc Esc` 回退到上一步，而不是在错误上叠第三条消息。
- 上下文注入：`@src/api/client.ts` 直接放文件，`!git status` 放命令输出，截图和日志可粘贴或管道 `cat error.log | claude`。
- 长任务让它维护 `PLAN.md` / `NOTES.md`，`/clear` 后能接着做。

### 10. 让它能自己验证（原文称为最强的质量杠杆）

- 测试和类型检查：`npm test`、`pytest`、`tsc --noEmit`；
- lint 和格式化（最好走 hook，保证每次都跑）；
- 通过浏览器 MCP 截 UI 图对比（Playwright / Chrome）；
- 参考输出：“脚本必须恰好打印这些内容”。

### 11. 并行与互审

```bash
git worktree add ../app-auth -b feature/auth
cd ../app-auth && claude
```

每个会话在自己的目录和分支里工作。Writer / Reviewer 模式：一个 Claude 写，另一个在干净会话里审，第一个按意见改——新上下文能看到“被看习惯而忽略”的问题。

### 12. 提示词写法

公式：**目标 + 去哪里找 + 约束 + 怎么验证**。原文给的“模糊 → 具体”改写示例：

| 模糊 | 具体 |
|---|---|
| “修个 bug” | “当 email 为空时 `signup()` 抛 TypeError。先写一个可复现的测试，再修，然后跑 `npm test`。” |
| “加点测试” | “用测试覆盖 `parseDate`：月份边界、时区、非法输入。不要 mock，风格照 `utils.test.ts`。” |
| “重构一下” | “把 `orders.ts` 里的数据库操作抽到 repository。公开 API 不变，现有测试必须不改就能通过。” |
| “弄好看点” | “按截图实现布局，用浏览器 MCP 截图对比，修到一致。” |

原文还给了一批可直接套用的任务配方（在 Plan mode 下使用）：不熟悉项目的架构梳理（要求末尾给“新手最容易踩坑的 5 个地方”）、按 stack trace 定位根因并先写失败测试、TDD 加功能（先写测试含边界 4999/5000/0/负数、确认失败、提交，再实现且不改测试）、安全重构（每步跑测试和 tsc，测试不够先补特征测试）、严格 senior 风格 review（输出格式：文件:行 — 问题 — 严重度 — 怎么修）、flaky 测试（跑 30 次、收集统计、找非确定性来源）、依赖升级（先按 changelog 出迁移计划，逐模块迁移，每步跑构建和测试）、按设计稿切图、性能优化（找 N+1 等瓶颈，给 2–3 个方案和收益估计，实现后测前后差异）、用子代理做 OWASP Top 10 审计（未获同意不得修）、按 git log 和 diff 写 PR 描述与 CHANGELOG、事故复盘（时间线、根因、影响、改进）。

### 13. 反模式对照（原文表）

一条会话用一整天 → 任务之间 `/clear`，笔记写文件；不说计划就“做个功能” → 先 Plan mode 对齐；没有测试和校验 → 把测试、lint、截图放进循环；CLAUDE.md 500 行 → 短文件 + `.claude/rules/` + skills；规则只写在 CLAUDE.md → 关键项用 hook 和 `permissions.deny`；用 `bypassPermissions` 图省事 → allowlist + 沙箱；在同一个错误上连续第三条消息 → `Esc Esc` / `/rewind` 后重述；不看 diff 就接受 → 人工看 diff 或子代理 review。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 已经能做哪些还没想到交给它的工作）**
原文列出的、容易被低估可交给 agent 的活儿：在独立上下文里做代码库探查和只回摘要的搜索（explorer 子代理）、反复重跑 flaky 测试并做统计定位非确定性来源、逐文件批量把 JS 迁到 TypeScript、按日志生成事故时间线与 postmortem、按 git log/diff 生成 release notes 和 PR 描述、用 OWASP Top 10 清单做安全审计并只出报告不改代码、用 `--max-turns` 限制步数的短任务（如按最近提交更新 CHANGELOG）。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
原文给了选择工具的决策树：必须无例外地发生 → hook；需要外部系统或数据 → MCP server；任务嘈杂、需要独立上下文 → subagent；可重复的流程或提示 → skill；否则 → CLAUDE.md 或普通提示。模型按任务选（`/model`）：强模型做架构和复杂 bug，快模型做例行和搜索。协作方式给了三种：Plan mode 先计划再实现、Writer/Reviewer 双会话互审、git worktree 多会话并行。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 信息：短而具体的 `CLAUDE.md`（栈、构建/测试命令、风格、禁令）、`.claude/rules/` 按路径的规则、`@文件` 直接注入、`!命令` 注入输出、截图和日志进上下文、让它写 `PLAN.md`/`NOTES.md`。
- 工具：MCP（Playwright 浏览器、GitHub、数据库、自建 server）、`.mcp.json` 团队共享、关掉不用的 server。
- 权限：`permissions.allow/ask/deny` 的 allowlist 模式，deny 优先；危险命令走确认。
- 反馈：这是原文最强调的一条——必须给 agent 自我验证的手段（测试、类型检查、lint、浏览器截图对比、参考输出），否则它只能猜；hook 提供“确定性保障”而不是请求。
- 上下文体量管理：`/context` 查占用、`/clear` 清、`/compact` 压、把检索放到 subagent。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
- hook 按事件触发：`SessionStart`（载入分支和待办）、`UserPromptSubmit`（每条提示补上下文）、`PreToolUse`（拦截危险操作）、`PostToolUse`（格式化/lint/测试）、`Notification`（等待人工时提醒）、`Stop`（收尾校验）、`PreCompact`（压缩前保存要点）。
- headless：`claude -p` 可在脚本、管道（`stdin` 接日志）、CI 中运行，可用 `--output-format json`、`--allowedTools`、`--max-turns` 约束；批量迁移用 shell 循环逐文件跑。
- CI / GitHub：`/install-github-app` 后在 issue / PR 里 `@claude` 触发实现或评审，仓库里有现成 workflow 和自动 PR review。
- 用 `claude --continue` / `claude --resume` 接续会话。

**5. 效果验证（怎样判断确实改善了结果）**
原文的验证逻辑是内建在循环里的：测试、类型检查、lint、构建、浏览器截图对比、参考输出作为“绿/不绿”的判据，agent 迭代到通过为止；`Stop` hook 可强制“测试绿了才允许结束”。上下文与成本侧用 `/context` 和 `/cost` 观察 token 去向。原文没有给出任何量化效果数据。

## 与已有做法的关系

清单中有 **Claude Code（tool，状态 adopt）**。本条目不是另一个工具，而是围绕 Claude Code 的配置与流程合集，可直接作为该条目的落地补充：starter-kit（8 skills、5 subagents、4 hooks、rules、statusline、output style，一条命令安装）、permissions allowlist 模板、PostToolUse 格式化 hook、subagent 与 SKILL.md 定义模板、headless 与 GitHub Actions 集成、以及按工具决策树。仓库结构里还列出 `course/`（12 模块 + cheatsheet + faq）、`labs/`（8 个实验，每个带“完成”判据）、`recipes/prompts.md`、`plugin-example/`、`scripts/validate.py`、`.github/workflows/`，这些文件的内容原文未展示。

## 证据与局限

**给出的可核查材料**：可直接复制的多份配置（`postToolUse` hook 的 JSON、`permissions` 的 JSON、`.mcp.json`、`reviewer.md`、`SKILL.md`、`CLAUDE.md` 模板）、可直接执行的命令（安装、`claude mcp add/list`、`claude -p` 四种用法、`git worktree add`、`/install-github-app`）、可直接套用的提示词（4 组改写示例 + 12 个任务配方）、以及若干对照表（工具决策树、hook 事件表、反模式表、常见问题表、快捷键表、上下文省钱表）。

**只是作者主张、没有数据支撑的部分**：“hook 是规则、CLAUDE.md 是请求”的说法、“给它自我验证手段是最强的质量杠杆”、子代理让主会话更干净、Writer/Reviewer 能发现被忽略的问题、`/clear` 省钱等，均无前后对比数据、样本量或案例量化。原文没有任何效果测量（如测试通过率、返工率、耗时变化）。

**无法验证的部分**：`install.sh`、`starter-kit/`（8 skills、5 subagents、4 hooks、rules、output-style、statusline）、`labs/`、`recipes/prompts.md`、`plugin-example/`、`.github/workflows/` 的具体内容全部未在原文出现；仓库 109 stars、MIT 许可、有 CI 校验 badge，但这些不能证明配置本身有效。

**噪声**：README 顶部和底部夹带了多个 Telegram 频道推广链接，与研究无关。

**适用条件**：使用者必须已经在用 Claude Code（编码场景）；命令和字段随版本变化，原文自己也提示要对照 `/help` 和官方文档；无人值守运行必须在容器/沙箱且无生产访问；部分示例假定 Vitest/Next.js/PostgreSQL、`jq` 与 `npx prettier` 可用。

## 怎么试、怎么验证

**最小试用（不跑 install.sh，只取三件最低成本的事）**
1. 在**一个**真实小项目里写 15 行以内的 `CLAUDE.md`：构建、测试、lint 命令 + 风格 + 禁令（照第 2 节模板改）。
2. 加 `.claude/settings.json` 的 `permissions.allow/deny`（照第 3 节，`deny` 里至少放 `.env` 和 `rm -rf`）。
3. 加 `PostToolUse` 格式化 hook（照第 4 节，把 `prettier` 换成本项目实际的格式化器），用 `/hooks` 确认 matcher 生效，并手动跑一次脚本确认 exit code。

然后选一个同类型的小任务，固定用 Explore→Plan→Code→Verify→Commit 走一遍：先 Plan mode 出计划并人工改计划，实现，跑到测试/类型检查通过，`/rewind` 不要用、错了就回退，最后看 diff 再提交。

**可选第二步**（要验证更重的部分时）：先 fork 或本地读一遍 `install.sh`，在**临时仓库或容器**里执行，检查它往项目里写了哪些文件（`settings.json`、hooks、skills、agents、rules）再决定要不要用；CI 部分先在 fork 的分支上开 `@claude`，不要直接接到主分支。

**判断有没有改善的指标（原文未给数据，需自建对照）**
- 人工介入次数：同类任务从下达到完成，需要人补充说明/纠正的次数。
- 权限询问次数：配 allowlist 前后，每任务弹出确认的次数。
- 返工与范围外改动：最终 diff 里有多少是任务未要求的文件；`git diff` 中被人工回退的比例。
- 一次通过率：第一次跑 `npm test && npm run lint` 就绿的占比。
- 上下文与成本：同类任务的 `/context` 占用和 `/cost`（可对比“任务间不 `/clear`”与“`/clear`”两组）。
- 自动化确定性：格式化/lint hook 是否每次都触发（统计触发次数 vs 改动次数）。
- 子代理收益：把搜索/日志分析放子代理后，主会话的上下文占用与任务完成质量是否变化。

做法：选 2–3 个同类型任务，在“只装 CLAUDE.md”和“CLAUDE.md + permissions + hook”两种配置下各做几次，比较上面指标；任何一项没有改善或出现新的阻塞（如 hook 误伤、deny 过严导致正常操作被拦），就退回该单项配置，不要整体照搬。
