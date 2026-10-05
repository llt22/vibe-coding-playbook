# 把编码 agent 的一次性对话改成可复用的工程工作流

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎么用五个扩展点和三条工作流，把编码 agent 的重复提示词与流程固化成技能、钩子和子智能体，让每次改动都有探索、有计划、有测试或有截图，并且提交得出去。
> 先试这一步：今天先只跑一遍 Explore → Plan → Code → Commit：让它先把相关文件读完并出计划，你确认计划后再允许写代码。
> 最近修订：2026-10-05

## 解决什么问题

用编码 agent（本手册以 Claude Code 为例）干活时，一次性对话的方式会在三件事上反复消耗：同一个流程每次重写提示词、上下文质量差导致 agent 跑偏、以及「做完了」却没有证据。这篇手册解决的是：怎么把重复的提示词和流程固化成技能、钩子和子智能体，并用固定的几条工作流控制「先探索、再计划、后写代码、最后提交」的节奏。

## 适用与不适用

适用：

- 手上有真实项目目录，要长期用 Claude Code 处理改动。
- 改动能用单元/集成测试验证，或者有视觉稿/截图可以比对。
- 愿意按文件审阅别人给的配置，再放进自己项目。

不适用：

- 只是问一次性问题，不值得固化成 skill（原文对照表：一次性任务跳过 Skills）。
- 子任务在主会话里放得下（原文：跳过 Subagents）；两三个子智能体就够（原文：跳过 Workflows）。
- 数据都在本地文件里（原文：跳过 MCP servers）。
- 不能接受「脚本以你的权限自动执行」的人，不要配 Hooks。

范围说明：本次调研来源在子智能体、动态工作流、Agent Teams、MCP 四节被截断，所以本手册对这四项只写「什么时候用 / 什么时候跳过」的判定，不给配置步骤。

## 前置条件

- 系统：macOS / Linux / WSL（原文推荐的 native 安装路径）。Windows 用官方 setup 指南里的 PowerShell 或 CMD 命令。
- 备选安装方式：Homebrew、WinGet、npm；npm 方式要求 Node.js 22+。
- 一个 Anthropic 账号（Pro、Max 或 API key 都可以）。
- 项目里可写 `.claude/` 目录（建 skill、配 hooks 都要）。
- 如果抄仓库里的 `notification.py` hook，需要本机有 `uv`，且 `uv` 在 PATH 上。
- 版本差异（原报告给出的时点声明，用前自己核）：
  - `auto` 成为交互式终端和 VS Code 会话的内置启动模式：v2.1.283 及以后。
  - `/effort ultracode` 保留你已有的 effort 等级：v2.1.284+。

## 操作步骤

### 1. 安装

前提：macOS / Linux / WSL。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

这是原文推荐的 native 安装方式，会在后台自更新。预期结果：`claude` 命令可用。

Windows 用官方 setup 指南里的 PowerShell 或 CMD 命令；备选 Homebrew、WinGet、npm：

```bash
npm install -g @anthropic-ai/claude-code   # 需要 Node.js 22+
```

### 2. 认证

```bash
claude
```

首次运行会打开浏览器登录 Anthropic 账号。预期结果：会话可用。之后可以：

- 会话内：`/login` 重新认证，`/logout` 登出。
- shell 里：`claude auth login|status|logout`。

### 3. 跑第一条提示，确认链路是通的

前提：任意项目目录。

```bash
cd ~/your-project
claude
```

原文给的三个起步提示：

```text
explain what this codebase does
add a README section about installation
find and fix the failing test in src/api.test.ts
```

预期结果：第一个能读到你的仓库并总结；第三个能就地诊断并修改。

### 4. 生成并持续迭代 CLAUDE.md

```text
/init
```

生成项目级指令文件，Claude 每次会话都会读。原文的关键提醒：`CLAUDE.md` 会成为 prompt 的一部分，所以要像维护常用提示词一样反复迭代，不要一次性堆一大堆内容就不再管。

预期结果：项目约定写进了 `CLAUDE.md`，而且你会隔一段时间回来改它。

### 5. 先决定这次要不要调 effort

原文的心智模型：effort 改变的是思考深度、工具调用意愿、回答长度、以及持续推进多步工作的执着程度；**更高 ≠ 更聪明**，上下文质量往往更重要。

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

等级怎么选（原文建议）：

- `low`：你在实时操控的快速查询（改文件名、简单 grep）。
- `medium`：日常编码、小重构、计划明确的自主会话。
- `high`：多文件重构、复杂调试。
- `xhigh`：长时间自主 agent 会话。
- `max`：只用于架构、微妙 bug、安全评审这类真难的问题，且仅限单会话。

API 认识 5 个等级（`low` → `max`，默认值取决于模型），Claude Code 在其上加了 `ultracode` 开关。原文还推荐一个模式：**用 Opus 规划 / 用 Sonnet 执行** —— 在 Opus（xhigh 或 max）上做规划，把原子化、零歧义的计件交给 Sonnet 在较低 effort 下执行。

预期结果：你用 `/effort` 能在自己环境里看到当前等级，而不是照抄原报告里那串按模型分的默认值。

### 6. 用「五个扩展点」对照表决定你要建什么

先判断该用哪个，再动手建。原文的对照表：

| 工具 | 什么时候用 | 什么时候跳过 | 存放位置 |
|---|---|---|---|
| Skills（slash 命令） | 同一个 prompt 或流程重复 ≥3 次 | 一次性任务 | `.claude/commands/*.md` |
| Hooks | 想让代码在工具调用、会话开始等时刻**自动**跑 | 只想手动触发 | `.claude/settings.json` |
| Subagents | 子任务大到需要独立的隔离上下文 | 任务在主会话里放得下 | `.claude/agents/*.md` |
| Workflows | 需要的智能体数量超过一次对话能协调的量 | 两三个子智能体就够 | `.claude/workflows/*.js` |
| MCP servers | 需要 Claude 调用**外部**工具（浏览器、数据库、API） | 数据都在本地文件里 | 按项目配置 |

原文强调这五个可以组合，多数打磨过的配置会用到其中 2–3 个。预期结果：你说得出自己这次要用哪 2–3 个，以及另外几个为什么跳过。

### 7. 三条可直接照做的工作流

**做法 A：Explore → Plan → Code → Commit**（什么时候选：复杂问题）

1. Explore：读相关文件/图片/URL，用子智能体做验证。**先不要写代码**。
2. Plan：让 Claude 出计划。要更深推理就在这句 prompt 里加 `ultrathink`。原文明确：Claude Code **只识别 `ultrathink`**，`think`、`think hard`、`think harder` 会被当普通提示文本透传。计划可选保存下来。
3. Code：实现方案，边做边判断合理性。
4. Commit：提交、开 PR、更新 README/changelog。

权限模式（`Shift + Tab` 循环）：共六种 —— `default`（界面标为 Manual）、`acceptEdits`、`plan`、`auto`、`dontAsk`、`bypassPermissions`；`Shift + Tab` 在 `default` → `acceptEdits` → `plan` 间循环，可用时后面还有 `bypassPermissions` 和 `auto`（`dontAsk` 从不进入循环）。v2.1.283 及以后，`auto` 是交互式终端和 VS Code 会话的内置启动模式，可用 `--permission-mode` 或 `permissions.defaultMode` 改。

**做法 B：测试驱动（写测试 → 写代码 → 提交）**（什么时候选：改动能用单测/集成测试验证）

1. 写测试：按预期输入/输出写测试，标成 TDD。
2. 跑测试并让它失败：确认失败，此时还没有实现。
3. 提交测试：满意后先提交测试。
4. 写代码：实现到测试通过，用子智能体做验证迭代。
5. 提交代码：全部测试通过后最终提交。

**做法 C：视觉迭代（代码 → 截图 → 迭代 → 提交）**（什么时候选：有视觉稿或界面可比对）

1. 给出截图或视觉稿。
2. 实现代码、截图、对比，迭代到输出与稿子一致。
3. 满意后提交。

原文标注：迭代显著提升产出质量，**通常 2–3 轮就够**。

预期结果：A 走完之后你手上是「计划 + 提交」，不是一堆没提交的改动；B 的测试在实现之前真的红过一次；C 的截图和稿子对得上。

### 8. 从示例仓库按文件拷贝现成配置（别整目录拷）

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

安全警告（必须一起抄）：Skills、hooks、agents、workflows 都是**以你的权限运行的、可执行的指令**，包括来自这个仓库的。要一个一个文件复制并阅读，就像 source 一个 shell 脚本之前先读它一样，不要 `cp -r` 一整个没打开过的 `.claude/`。

预期结果：你的项目里只多了你读过的文件。

### 9. 三分钟做出第一个 slash skill

前提：项目里可写 `.claude/`。

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

预期结果：敲 `/analyze` 就能跑这段提示词。

升级为 Agent Skill 的方式：把它移到 `.claude/skills/analyze/SKILL.md`，加上 `name`/`description` frontmatter。原文明确两种格式现在是同一套系统：`.claude/commands/deploy.md` 和 `.claude/skills/deploy/SKILL.md` 都产生 `/deploy`。区别在于 Slash skill 要你主动敲 `/`，Agent Skill 只预加载元数据、在描述匹配任务时可由 Claude 自动调用、正文按需读取。

命名冲突解析顺序（先匹配先赢）：企业 > 个人 `~/.claude/` > 项目 `.claude/` > 插件（命名空间为 `/plugin-name:skill-name`）> 内置。本地 skill 会替换同名的内置 skill，或在本地终端会话里替换内置命令，但**不替换它的别名**；插件 skill 因为带命名空间，会同时加载。

### 10. 按需配 Hooks

前提：你能接受「自动执行的 shell 命令」这件事。

Hooks 是 Claude Code 生命周期上的可编程检查点，脚本检查拟执行的动作并返回 allow / deny / modify。原文「最先说服团队的三类用途」中，本次抓取到的完整两条是：

| 用例 | hook 做什么 |
|---|---|
| 保存后自动格式化 | 每次 Edit 后跑 `prettier` / `ruff` / `gofmt`，让 Claude 的产出符合风格 |
| 拦截敏感路径 | 无论 Claude 想做什么，都拒绝改 `.env` |

预期结果：格式化不再靠人提醒；`.env` 这类路径即使 Claude 想动也动不了。

## 怎么判断变好了

- 触发条件可观察：同一个 prompt 或流程重复 ≥3 次，就该去建 skill，而不是继续手打。
- Plan 阶段真的没写代码：Explore 阶段只读文件、出计划；`ultrathink` 只出现在需要更深推理的那句计划 prompt 上。
- TDD 的红过：测试在实现之前确实失败过一次，最后全绿才提交。
- 视觉迭代轮数：原文标注通常 2–3 轮就能对齐稿子。
- effort 的自检：别照抄默认值，用 `/effort` 在自己环境核对；发现自己在常规任务上想开 `max` 时，原文说约 80% 的情况正解在上游 —— 更锋利的 `CLAUDE.md`、原子化的计划、点名的文件。
- 最小试用方式：按调研结论的建议，先在自己的项目里**小范围试**，一次只引入一个扩展点。
- 试多久：视觉迭代以 2–3 轮为一轮试；effort 随时可以 `/effort auto` 重置回模型默认。

## 常见坑

1. 把 `think` / `think hard` / `think harder` 当开关用。Claude Code 只识别 `ultrathink`，其它会被当普通文本透传。
2. 以为 effort 越高越聪明。原文明确更高 ≠ 更聪明；`max` 在常规任务上边际收益递减、更容易过度思考，且只限单会话，写不进 `settings.json` 的 `effortLevel`。
3. `cp -r` 整个 `.claude/`。Skills、hooks、agents、workflows 是以你的权限运行的可执行指令，要逐文件复制并阅读。
4. 把版本时点的数字当事实。原报告的模型名、各模型 effort 默认值（如 v2.1.289 那一串）和价格无法核验，使用前用 `/effort` 在自己环境核对；调研结论也提醒不要照抄具体数字。
5. 命名冲突搞错。按 企业 > 个人 > 项目 > 插件 > 内置 的先匹配先赢；本地 skill 不替换内置命令的别名，插件 skill 会同时加载。
6. 过度上扩展点。任务在主会话放得下就别上子智能体；两三个子智能体够就别上 workflows；数据都在本地就别上 MCP。
7. 拿半截资料硬做。原报告在子智能体、动态工作流、Agent Teams、MCP 四节被截断，这几项本手册只给判定，不给步骤。

## 证据与来源

- 唯一来源：GitHub 仓库 `wesammustafa/Claude-Code-Everything-You-Need-to-Know` 的 README（约 3095 stars，作者 wesammustafa），以调研报告形式并入。该 README 自称「不是一个扩展点的截图，而是一个真能跑的项目」，仓库自带可运行的 `.claude/` 目录（commands、skills、agents、workflows、hooks、settings.json）。
- 可核验的仓库内容（文件与路径）：第 8 步的路径表、7 个 slash skill 名称、`/claude-md-review`、`/stale-docs-audit`、`notification.py`、`settings.json` 用 `$CLAUDE_PROJECT_DIR` 调 `uv run`。
- 数据/数字（均为原报告所述）：约 3095 stars；视觉迭代通常 2–3 轮；同一流程重复 ≥3 次才固化 skill；约 80% 的「想开 max」情形正解在上游；5 个子智能体 + 10 个角色提示词。
- 属于作者主张、未经本项目验证：五个扩展点的对照表与组合建议、三条工作流的具体步骤、effort 是「行为旋钮」的心智模型与等级选择建议、「Opus 规划 / Sonnet 执行」、按模型分的 effort 默认值列表、hooks 的三类团队用途。
- 版本声明：`auto` 内置启动模式、`/effort ultracode` 保留等级、六种权限模式与 `Shift + Tab` 循环顺序、各模型 effort 默认值，都是原报告在特定版本时点（v2.1.283 / v2.1.284 / v2.1.289 等）的声明，本手册只把它们标为「用前核对」。
- 调研结论给的取舍：重点抄三个工作流、skills/hooks 的文件级配置步骤和两张对照表；原文在子智能体、动态工作流、Agent Teams、MCP 四节被截断，且 2026 年模型名与价格无法核验，不要照抄具体数字。

## 依据的调研

- [wesammustafa/Claude-Code-Everything-You-Need-to-Know](../research/radar/2026-10-05/1337-wesammustafa-claude-code-everything-you-need-to-kn.md)：值得一试，把这份仓库当成 Claude Code 的实操手册素材来源，重点抄它的三个工作流（Explore→Plan→Code→Commit、TDD、视觉迭代）、skills/hooks 的文件级配置步骤和「能力发现/任务匹配」两张对照表，先在自己的项目里小范围试；但原文在子智能体、动态工作流、Agent Teams、MCP 四节被截断，且其中大量 2026 年模型名与价格无法核验，不要照抄具体数字。
