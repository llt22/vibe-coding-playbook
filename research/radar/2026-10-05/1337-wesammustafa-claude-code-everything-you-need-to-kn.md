# wesammustafa/Claude-Code-Everything-You-Need-to-Know

- 结论：**值得一试**。把这份仓库当成 Claude Code 的实操手册素材来源，重点抄它的三个工作流（Explore→Plan→Code→Commit、TDD、视觉迭代）、skills/hooks 的文件级配置步骤和「能力发现/任务匹配」两张对照表，先在自己的项目里小范围试；但原文在子智能体、动态工作流、Agent Teams、MCP 四节被截断，且其中大量 2026 年模型名与价格无法核验，不要照抄具体数字。
- 原文：https://github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-05T07:07:18.823Z

## 是什么

这是一份 Claude Code 从入门到高阶的实操指南仓库 README（约 3095 stars），作者 wesammustafa。内容分五块：安装与首个 prompt、提示工程工作流、effort 推理等级、slash 命令/Skills、Hooks，以及目录中列出的子智能体、动态工作流、Agent Teams、MCP（后四节在本次抓取的文本里被截断，只看到目录引用和 MCP 配置「Configured per project」一句）。

它不是资讯综述，而是一份带可运行示例的工程化指南：仓库自带一个可跑的 `.claude/` 目录（commands、skills、agents、workflows、hooks、settings.json），作者明确说「不是一个扩展点的截图，而是一个真能跑的项目」，可以直接复制到自己的项目里。

作者给的核心心智模型是「五个扩展点」对照表：

| 工具 | 什么时候用 | 什么时候跳过 | 存放位置 |
|---|---|---|---|
| Skills（slash 命令） | 同一个 prompt 或流程重复 ≥3 次 | 一次性任务 | `.claude/commands/*.md` |
| Hooks | 想让代码在工具调用、会话开始等时刻**自动**跑 | 只想手动触发 | `.claude/settings.json` |
| Subagents | 子任务大到需要独立的隔离上下文 | 任务在主会话里放得下 | `.claude/agents/*.md` |
| Workflows | 需要的智能体数量超过一次对话能协调的量 | 两三个子智能体就够 | `.claude/workflows/*.js` |
| MCP servers | 需要 Claude 调用**外部**工具（浏览器、数据库、API） | 数据都在本地文件里 | 按项目配置 |

原文强调这五个可以组合，多数打磨过的配置会用到其中 2–3 个。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 1. 安装（前提：macOS / Linux / WSL）

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

这是推荐的 native 安装方式，会在后台自更新。Windows 用官方 setup 指南里的 PowerShell 或 CMD 命令；备选方式有 Homebrew、WinGet 和 npm（`npm install -g @anthropic-ai/claude-code`，npm 方式要求 Node.js 22+）。

### 2. 认证

```bash
claude
```

首次运行会打开浏览器登录 Anthropic 账号（Pro、Max 或 API key 都可以）。之后可在会话里用 `/login` 重新认证、`/logout` 登出，或在 shell 里用 `claude auth login|status|logout`。

### 3. 跑第一条提示（前提：任意项目目录）

```bash
cd ~/your-project
claude
```

原文给的三个起步提示：
- `explain what this codebase does` — 让 Claude 读仓库并总结。
- `add a README section about installation` — 基于项目内容生成。
- `find and fix the failing test in src/api.test.ts` — 就地诊断并修改。

### 4. 生成 CLAUDE.md

```
/init
```

生成项目级指令文件，Claude 每次会话都会读。原文的关键提醒：`CLAUDE.md` 会成为 prompt 的一部分，所以要像维护常用提示词一样反复迭代，不要一次性堆一大堆内容就不再管。

### 5. 复制仓库里现成的配置（前提：先逐文件读，别整目录拷）

```bash
git clone --depth 1 https://github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know /tmp/cc-guide
cp -r /tmp/cc-guide/.claude/commands/pr.md  your-project/.claude/commands/   # take what you want
```

仓库里可抄的东西：

| 路径 | 得到什么 | 什么时候抄 |
|---|---|---|
| `.claude/commands/` | 7 个 slash skill：`/pr`、`/review`、`/tdd`、`/test`、`/five`、`/ux`、`/todo` | 想要 PR 规范和评审严谨度但不想自己写 prompt |
| `.claude/skills/` | 一个 Agent Skill `/claude-md-review`，审计 `CLAUDE.md` 的含糊表述、死路径、臃肿 | 想要 frontmatter 契约的范例 |
| `.claude/agents/` | 5 个子智能体，外加 `specialized-agents/` 里 10 个角色提示词 | 不想自己写角色提示词；这些也可当 Agent Teams 队友 |
| `.claude/workflows/` | 一个动态工作流 `/stale-docs-audit`，把 agent 扇出到文档上再自我反驳结论 | 想先读一个真实脚本再自己写 |
| `.claude/hooks/` | 一个 Python hook `notification.py`，Claude Code 需要你输入时出声提醒 | 想要生命周期自动化（需要 `uv`） |
| `.claude/settings.json` | 权限 + hook 接线 | 抄 hooks 时一起抄（脚本用 `$CLAUDE_PROJECT_DIR` 调 `uv run`，`uv` 只需在 PATH 上） |

原文的安全警告必须一起抄：Skills、hooks、agents、workflows 都是**以你的权限运行的、可执行的指令**，包括来自这个仓库的。要一个一个文件复制并阅读，就像 source 一个 shell 脚本之前先读它一样，不要 `cp -r` 一整个没打开过的 `.claude/`。

### 6. 三个可直接照做的工作流

**工作流 A：Explore → Plan → Code → Commit**（适合复杂问题）
1. Explore：读相关文件/图片/URL，用子智能体做验证。**先不要写代码**。
2. Plan：让 Claude 出计划。要更深推理就在这句 prompt 里加 `ultrathink`。原文明确：Claude Code **只识别 `ultrathink`**，`think`、`think hard`、`think harder` 会被当普通提示文本透传。计划可选保存下来。
3. Code：实现方案，边做边判断合理性。
4. Commit：提交、开 PR、更新 README/changelog。

权限模式（`Shift + Tab` 循环）：共六种 —— `default`（界面标为 Manual）、`acceptEdits`、`plan`、`auto`、`dontAsk`、`bypassPermissions`；`Shift + Tab` 在 `default` → `acceptEdits` → `plan` 间循环，可用时后面还有 `bypassPermissions` 和 `auto`（`dontAsk` 从不进入循环）。v2.1.283 及以后，`auto` 是交互式终端和 VS Code 会话的内置启动模式，可用 `--permission-mode` 或 `permissions.defaultMode` 改。

**工作流 B：测试驱动（写测试 → 写代码 → 提交）**（适合能用单测/集成测试验证的改动）
1. 写测试：按预期输入/输出写测试，标成 TDD。
2. 跑测试并让它失败：确认失败，此时还没有实现。
3. 提交测试：满意后先提交测试。
4. 写代码：实现到测试通过，用子智能体做验证迭代。
5. 提交代码：全部测试通过后最终提交。

**工作流 C：视觉迭代（代码 → 截图 → 迭代 → 提交）**
1. 给出截图或视觉稿。
2. 实现代码、截图、对比，迭代到输出与稿子一致。
3. 满意后提交。原文标注：迭代显著提升产出质量，**通常 2–3 轮就够**。

### 7. 调 effort 等级（前提：理解它是行为旋钮，不是 token 预算）

原文的心智模型：effort 改变的是思考深度、工具调用意愿、回答长度、以及持续推进多步工作的执着程度；**更高 ≠ 更聪明**，上下文质量往往更重要。API 认识 5 个等级（`low` → `max`，默认值取决于模型），Claude Code 在其上加了 `ultracode` 开关。

```bash
# 仅本轮 —— 加一个上下文内提示（不改变 API effort）
> ultrathink — design the migration strategy

# 仅本会话 —— 不带参数是滑块，带参数是指定等级
/effort xhigh
/effort ultracode               # 自动多智能体工作流；保留你的 effort 等级（v2.1.284+）
/effort auto                    # 重置为模型默认

# 所有会话（low/medium/high/xhigh）—— 在 .claude/settings.json 加：
#   "effortLevel": "high"
# max 不能存在这里；ultracode 有自己的 "ultracode" 设置。
```

等级选择：`low` 用于你在实时操控的快速查询（改文件名、简单 grep）；`medium` 用于日常编码、小重构、计划明确的自主会话；`high` 用于多文件重构、复杂调试；`xhigh` 用于长时间自主 agent 会话；`max` 只用于架构、微妙 bug、安全评审这类真难的问题，且仅限单会话。

两个作者点名的坑：`max` 在常规任务上边际收益递减、更容易过度思考；**上下文质量常常胜过加 effort** —— 如果你在一个本不该需要 max 的任务上想开 max，约 80% 的情况下正解在上游：更锋利的 `CLAUDE.md`、原子化的计划、点名的文件。

原文推荐的一个模式：**用 Opus 规划 / 用 Sonnet 执行** —— 在 Opus（xhigh 或 max）上做规划，把原子化、零歧义的计件交给 Sonnet 在较低 effort 下执行；计划足够锋利时，便宜的执行为不会跑偏。

> 注意：原文给的默认值（v2.1.289：Opus 5.5 和 Sonnet 5.5 → `medium`；Opus 4.7 → `xhigh`；Fable 5.1、Opus 4.8、Sonnet 5 → `high`；Haiku 4.5 没有 effort 设置）以及 `/effort` 自查命令，属于该版本时点的声明，使用前请用 `/effort` 在你自己的环境里核对。

### 8. 三分钟做出第一个 slash skill（前提：项目里可写 `.claude/`）

```bash
mkdir -p .claude/commands

cat > .claude/commands/analyze.md << 'EOF'
# Code Analysis

Analyze the current code for:
- Potential bugs and edge cases
- Performance optimizations
- Code quality improvements
- Security vulnerabilities

Provide specific, actionable recommendations.
EOF

claude       # then type: /analyze
```

升级为 Agent Skill 的方式：把它移到 `.claude/skills/analyze/SKILL.md`，加上 `name`/`description` frontmatter。原文明确两种格式现在是同一套系统：`.claude/commands/deploy.md` 和 `.claude/skills/deploy/SKILL.md` 都产生 `/deploy`。区别在于 Slash skill 要你主动敲 `/`，Agent Skill 只预加载元数据、在描述匹配任务时可由 Claude 自动调用、正文按需读取。

命名冲突解析顺序（先匹配先赢）：企业 > 个人 `~/.claude/` > 项目 `.claude/` > 插件（命名空间为 `/plugin-name:skill-name`）> 内置。本地 skill 会替换同名的内置 skill，或有本地终端会话里替换内置命令，但**不替换它的别名**；插件 skill 因为带命名空间，会同时加载。

### 9. 配 Hooks（前提：能接受「自动执行的 shell 命令」这件事）

Hooks 是 Claude Code 生命周期上的可编程检查点，脚本检查拟执行的动作并返回 allow / deny / modify。原文最先说服团队的三类用途：

| 用例 | hook 做什么 |
|---|---|
| 保存后自动格式化 | 每次 Edit 后跑 `prettier` / `ruff` / `gofmt`，让 Claude 的产出符合风格 |
| 拦截敏感路径 | 无论 Claude 想做什么，都拒绝改 `.env`、`secrets/`、`infra/prod/` |
| 动作审计日志 | 把每次工具调用记到文件里 —— 留下 Claude 做了什么、什么时候做的记录 |

设置范围（后者覆盖前者）：用户级 `~/.claude/settings.json`；项目级（提交进仓库）`.claude/settings.json`；项目本地（gitignore）`.claude/settings.local.json`；企业托管策略（平台相关）。

**最快的做法**（不碰 JSON）：

```bash
/hooks    # browse, enable, configure hooks without touching JSON
```

**手动做法（复制本仓库的 hook 脚本）**：
1. 把 `.claude/hooks/` 复制到项目的 `.claude/` 下。
2. 删掉不需要的 hook 脚本，其余的留着。
3. 装 [`uv`](https://docs.astral.sh/uv/getting-started/installation/)（跑 Python hook 脚本必需）。
4. 把 `.claude/settings.json` 复制到项目的 `.claude/` 下。
5. 确保 `uv` 在 `PATH` 上：`settings.json` 里的 hook 命令跑的是 `uv run "$CLAUDE_PROJECT_DIR"/.claude/hooks/...`，所以不需要改路径。

```text
project-root/
└── .claude/
    ├── hooks/
    │   ├── notification.py
    │   └── utils/
    └── settings.json
```

**常用 hook 事件**（原文说截至 2026-10-04 完整目录有 33 个事件）：
- `PreToolUse`：Claude 生成工具参数之后、真正处理工具调用之前运行。
- `PostToolUse`：工具成功完成后立即运行。
- `Notification`：Claude Code 发通知时运行，比如需要授权使用某工具、或 prompt 输入闲置时。
- `UserPromptSubmit`：用户提交提示、Claude 处理之前运行。
- `Stop`：主 agent 回答完毕时运行（用户中断不触发）。
- `SubagentStop`：子智能体（Task 工具调用）回答完毕时运行。
- `SessionEnd` / `SessionStart` / `PreCompact`：会话结束 / 开始或恢复 / 即将 compact 前运行。
- `TeammateIdle`：Agent Teams 里队友空转时运行，**退出码 2 会把队友送回干活**。
- `TaskCompleted`：任务被标为完成时运行，**退出码 2 会阻止完成**。

**Hook 输入**：通过 stdin 收 JSON。每个事件都带 `session_id`、`transcript_path`、`cwd`；事件专有字段如 `PreToolUse` 给 `tool_name`、`tool_input`，`PostToolUse` 多给 `tool_response`，`UserPromptSubmit` 给 `prompt`，`PreCompact` 给 `trigger`、`custom_instructions`，`SessionStart` 给 `source`，`SessionEnd` 给 `reason`。

**Hook 输出**：退出码或 stdout JSON 两条路。

| 退出码 | 效果 |
|---|---|
| `0` | stdout 在 transcript 模式（CTRL-R）可见；对 `UserPromptSubmit` / `SessionStart`，stdout 会加入 Claude 上下文 |
| `2` | stderr 回给 Claude（或展示给你）以阻止动作；`PreToolUse` 里停掉工具调用，`UserPromptSubmit` 里停掉提示处理 |
| 其他 | 展示 stderr，继续执行 |

结构化输出：`PreToolUse` 可返回 `permissionDecision`: `"allow"` / `"deny"` / `"ask"`，以及 `updatedInput` 修改工具参数；`PostToolUse` 和 `UserPromptSubmit` 可返回 `decision`: `"block"`，并可附 `additionalContext`；`Stop`/`SubagentStop` 可返回 `decision`: `"block"`；`SessionStart` 可返回 `additionalContext`。

**执行细节**：默认超时按 hook 类型不同（`command`/`http`/`mcp_tool` 600s，`prompt` 30s，`agent` 60s，某些事件会调低，例如 `UserPromptSubmit` 的 command hook 只有 30s），可按 hook 配置；所有匹配的 hook 并行运行，完全相同的 handler 会自动去重；在 Claude Code 启动时快照 hook 配置，会话中途变更会告警。

**安全实践（作者列的最佳实践，照抄）**：校验并清洗 stdin JSON 的所有输入；shell 变量加引号（`"$var"` 而不是 `$var`）；阻止路径穿越（`..`、项目外的绝对路径）；调用脚本用绝对路径以免 PATH 攻击改向；显式跳过敏感文件（`.env`、`.git/`、`secrets/`）。原文提醒：hooks 以你的用户权限**自动跑任意 shell 命令**，能读改删任何你能动的文件。

## 对应的研究问题（对照五个问题逐条说明，只写有依据的）

### 1. 能力发现：AI 已经能做哪些还没想到交给它的工作

- 不要贴代码片段，直接让 Claude **读整个仓库** —— 它看文件树、跑 `grep`、顺着 import 走，答案建立在真实上下文上。
- **就地改文件并跑你的测试** —— diff 感知的编辑，然后当场跑 `pytest`/`vitest`/`go test` 验证。
- **开 PR、更新 README/changelog** 被列进标准工作流的 Commit 阶段，说明这是默认可交付动作，而不是人工收尾。
- 子智能体被用作**验证器**（Explore 阶段和 Code 阶段各一次），这是一个容易被忽略的、独立的用法。
- hook 层能做三类「人想不到要手动做」的事：每次编辑后自动格式化、无差别拦截敏感路径、把每次工具调用记成审计日志。
- 文中提到 `/dataviz`、`/debug`、`/keybindings-help` 等内置 skill，以及社区技能 `skill-creator`、`systematic-debugging`、`pair-programming`、`github-code-review`、`pptx`、`market-research-reports`、`senior-data-engineer` 等 —— 说明「给非编程任务写技能」也已在生态里被覆盖。

### 2. 任务匹配：什么工作适合怎样的模型、工具和协作方式

- 原文给了明确的工具选择阈值：同一 prompt/流程**重复 ≥3 次**就做成 skill；需要**自动**触发就用 hook；子任务大到需要**独立上下文**就用子智能体；需要的 agent 数量超过一次对话能协调的，才上 workflows；数据不在本地文件里才上 MCP。
- 模型选择表（Sonnet 5.5 日常编码、Opus 5.5 复杂推理/大重构/编排 agent、Fable 5.1 真正难的问题、Haiku 4.5 快速轻量任务）—— 具体模型名与价格无法核验，但「按任务难度与是否编排 agent 分层选模型」这个结构可借鉴。
- effort 与任务的对应关系给得很细：`low` 改文件名/简单 grep；`medium` 日常编码、小重构、计划明确的长会话；`high` 多文件重构、复杂调试；`xhigh` 长时间自主 agent 会话；`max` 只留给架构、微妙 bug、安全评审。
- 协作模式：**plan-with-Opus / execute-with-Sonnet**，以及 Explore/Plan/Code/Commit 里「先只读、不写代码」的阶段切分。
- 权限模式也算任务匹配的一部分：复杂探索期用 `plan`，改动密集期用 `acceptEdits`。

### 3. 条件供给：需要提供哪些信息、工具、权限和反馈

- **信息**：`CLAUDE.md` 作为项目「house rules」，每次会话都读；作者强调它要像常用 prompt 一样迭代，而不是堆内容。
- **工具**：uv（hooks 必需）、`uv` 在 PATH 上（脚本用 `$CLAUDE_PROJECT_DIR` 定位）、Anthropic 账号（Pro/Max/API key 均可）。
- **权限**：六种 permission mode；hook 可通过 `permissionDecision` 返回 allow/deny/ask，或用退出码 2 阻止；`.claude/settings.json` 同时承载权限与 hook 接线。
- **反馈回路**：TDD 工作流把「测试失败 → 实现 → 测试通过」做成硬反馈；视觉迭代把截图对比做成硬反馈；Explore 阶段用子智能体做验证。
- **上下文质量**：作者把「更锋利的 CLAUDE.md、原子化的计划、点名的文件」列为比调高 effort 更有效的上游手段。

### 4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成

这是原文最硬的一块，全部围绕事件驱动的 hooks：

- 触发点覆盖会话开始/结束（`SessionStart`/`SessionEnd`）、提示提交前后（`UserPromptSubmit`/`PreToolUse`）、工具完成（`PostToolUse`）、回答结束（`Stop`/`SubagentStop`）、compact 前（`PreCompact`）。
- 状态触发：`TeammateIdle`（队友空转就退出码 2 把它送回干活）、`TaskCompleted`（退出码 2 阻止任务完成）。这两个是把「持续完成」做成闭环的钩子。
- 会话级：Claude Code 在启动时快照 hook 配置，会话中途变更会告警。
- 动态工作流 `/stale-docs-audit` 是「扇出多个 agent 扫文档、再自我反驳结论」的示例，属于让流程自己跑完的模式（但这一节被截断，无法提取更多）。
- 仓库自带的 `notification.py` 是「需要你输入时出声提醒」的事件驱动通知。

### 5. 效果验证：怎样判断确实改善了结果

- **测试从红到绿**：TDD 工作流的显式判据 —— 先确认测试失败、提交测试、再实现到通过。
- **视觉对稿**：截图与 mock 对比迭代，作者给出「通常 2–3 轮」的经验值。
- **审计日志**：hook 把每次工具调用写文件，形成「Claude 做了什么、什么时候做的」的证据链。
- **PR 流程**：`/pr`、`/review` 属于把评审规范内置化，但原文没给评审质量的量化指标。
- **用量观测**：`/usage`（v2.1.118 起合并了 `/cost` 和 `/stats`）用于跟踪 token 与套餐用量。
- 需要说明：原文没有给「改善了百分之多少」这类数字，验证手段以流程内建的硬反馈为主。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：这份材料就是它的使用指南，属于对已有条目的直接补充 —— 把「装了」推进到「怎么配、怎么串起来」。它给的是可复制的文件路径、命令和 hook 输入输出契约。
- **Agent skills（concept，adopt）**：原文直接支持并细化了这个条目 —— `.claude/commands/<name>.md` 与 `.claude/skills/<name>/SKILL.md` 生成同一个 `/<name>`；skill 遵循开放的 agentskills.io 标准，被 Claude Code 之外的约 40 个产品（Codex、Copilot、Cursor、Gemini CLI 等）采用；附带了命名冲突解析顺序和「`allowed-tools` 是**授予**权限而不是限制权限」这条容易踩坑的说明。
- **skills.sh（source，try）**：原文把它列为技能市场/检索入口之一（与 SkillHub、SkillsMP、Smithery、anthropics/skills、两个 awesome 列表并列），可用于找现成 Agent Skill。
- **SkillHub（study）**：同上，原文只把它列为可搜索的市场，没有给出使用步骤，因此维持 study 是合理的。
- **Cursor（watch）**：原文只做类比 —— 「如果你用过 Copilot 或 Cursor，可以把 Claude Code 看作它们在终端里的 agent 同伴，同样的思路、不同的界面、不锁定编辑器」。这不能作为 Cursor 本身的证据。
- **goose、Obsidian、Tavily**：在本次提供的原文片段中没有出现，清单中没有相关条目（注意原文在 `CLAUDE_P` 处被截断，MCP 一节只看到「按项目配置」一句，后面的内容无法判断）。

## 证据与局限

**原文给出的可核对信息（均属作者主张，未做第三方验证）**：
- 仓库约 3095 stars，被 awesome-claude-code 收录。
- 具体的安装命令、认证命令、示例 `.claude/` 目录清单（7 个 slash skill、1 个 Agent Skill、5 个子智能体 + 10 个角色提示词、1 个动态工作流、1 个 Python hook）。
- 版本化的默认值与限制：`/usage` 合并于 v2.1.118；`auto` 成为默认启动模式在 v2.1.283+；`ultracode` 在 v2.1.284+；effort 默认值标注为 v2.1.289；hooks 完整目录 33 个事件（截至 2026-10-04）；`team_name` 字段自 v2.1.178 起弃用。
- hooks 超时默认：command/http/mcp_tool 600s、prompt 30s、agent 60s。
- 视觉迭代「通常 2–3 轮足够」；「max 在本不该需要它的任务上，约 80% 的情况问题在上游」。

**哪些只是作者主张**：
- 「Built around clear mental models and real examples, not marketing」是自我定位，没有第三方评测支撑。
- 「研究先行和规划显著提升复杂任务表现」「迭代显著提升产出质量」没有附带实验数据或对照数字。
- effort 等级与能力的对应关系（如 xhigh 适合长时间自主会话）是经验性建议。

**重要局限**：
1. **文本被截断**：抓取在 `CLAUDE_P`（应为 `CLAUDE_PROJECT_DIR` 相关说明）处中断。子智能体、动态工作流、Agent Teams、MCP 四节和 FAQ、更新与弃用等章节只有目录引用，**无法从中提炼步骤**。因此本报告只覆盖安装、提示工程工作流、effort、skills、hooks 五块。
2. **模型名与价格不可核验且高度可疑**：原文大量出现 2026 年的日期与模型名（Opus 4.8 / Opus 5 / Opus 5.5、Fable 5.1、Mythos 5/Mythos 5.1、Sonnet 5.5、Haiku 4.5）以及具体价格（$2/$10、$4/$20、$10/$50、$1/$5）和「1M 上下文标准、128K 最大输出」「Mythos 5 通过 Project Glasswing 邀请制」等描述。这些在给定的材料里没有任何外部佐证，**不要写进手册当作事实**；需要时以官方模型配置文档为准。
3. **版本号密集**：v2.1.117/118/178/280/283/284/289 等默认值与行为，换一个版本可能就变了，使用前应在自己的环境里用 `/effort`、`/usage`、`/help` 复核。
4. **安全风险是真实且双向的**：hooks 以用户权限自动跑任意 shell 命令，skills/agents/workflows 都是可执行指令。作者自己也要求「一个一个文件读，不要 `cp -r` 整个 `.claude/`」。这是采用这份材料时必须一并继承的约束。

**适用条件**：Claude Code CLI 用户；macOS、Linux 或 WSL（Windows 需另走官方安装方式）；需要 Anthropic 账号；hooks 需要安装 `uv` 并在 PATH 上；仓库内容按作者说法每几个月复核一次（徽章标注 Reviewed July 2026, corrected Oct 2026），存在过时风险。

## 怎么试、怎么验证

### 最小试用（建议 1–2 天，在一个真实项目上做，不要额外造 demo）

1. **装 + 建规矩**：装 Claude Code，在项目里跑 `/init` 生成 `CLAUDE.md`，然后**只挑 3 条你最常重复的提示**写成 `.claude/commands/*.md`（用第 8 步的 heredoc 模板）。前提：该项目有版本控制，方便回滚。
2. **跑一次 TDD 闭环**：挑一个能用单测验证的小改动，严格走「写测试 → 看着它失败 → 提交测试 → 写实现 → 测试通过 → 提交」。记录从红到绿用了几轮对话。
3. **只加两个 hook**（不要一上来全装）：一个「编辑后自动格式化」，一个 `PreToolUse` 拦截 `.env` / `secrets/`。前提：装好 `uv` 并在 PATH 上。验证方式：故意让 Claude 去改 `.env`，看是否被拦。
4. **对照一次 effort**：同一个任务，先用默认 `/effort` 跑一遍，再用 `/effort low` 跑一遍，看是否真的需要更高等级。前提：任务可重复（例如同一段代码的分析）。
5. **抄现成资产要逐个读**：从仓库复制 `.claude/commands/pr.md` 或 `.claude/skills/claude-md-review/` 时，一个文件一个文件复制并读完再放进去，绝不 `cp -r`。

### 判断有没有改善的指标

| 指标 | 怎么采 | 改善的判据 |
|---|---|---|
| 同一任务的对话轮次 | 手动记录或用 `/usage` 的消耗变化 | 把重复提示固化成 skill 后，轮次下降 |
| 返工次数 | 同一改动被推翻/重做的次数 | TDD 流程下，返工集中到写测试阶段而非实现阶段 |
| 测试红→绿的迭代次数 | TDD 过程里跑测试的次数 | 相比直接写实现更少次达到稳定 |
| 视觉迭代轮数 | 截图对比轮数 | 与作者说的 2–3 轮量级相当 |
| 越权写文件被拦次数 | hook 拦截日志 | 拦截生效且没有误拦正常编辑 |
| 审计日志完整性 | 每会话工具调用是否都有记录 | 每条工具调用都有对应记录，无缺口 |
| 上下文质量 | CLAUDE.md 审查前后重跑同一任务 | 减少「含糊指令被误解」导致的澄清来回 |

**决策规则**：如果连续 2–3 个真实任务上，轮次或返工确实下降、且没有出现权限/安全事件，就把对应的技能与 hook 配置固化成手册条目；如果主要成本落在配置维护、收益说不清，就把该部分降到 study，只保留「重复 ≥3 次的提示固化成 skill」和「hook 拦截敏感路径」这两条零维护成本的做法。
