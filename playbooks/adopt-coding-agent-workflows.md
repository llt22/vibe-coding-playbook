# 让编码 agent 先探索、再计划、后写代码，并用门禁和测试自检逼它拿出证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：用编码 agent 干活时，流程每次重写、架构约定会漂移、违规提交拦不住、测试可能被改绿——本手册把这些固化成可照做的技能、钩子、门禁和常驻自检规则。
> 先试这一步：先在一个项目里把「绝不改测试凑绿、新测试必须在空实现下失败」两条写进 AGENTS.md，并对最近一个新写的测试做一次空实现检查。
> 最近修订：2026-10-17

## 解决什么问题

用编码 agent 干活时，一次性对话的方式会在几件事上反复消耗：同一个流程每次重写提示词、上下文质量差导致 agent 跑偏、架构约定写在提示文件里会随上下文漂移、「做完了」却没有证据、绿色测试套件可能是代理改测试改出来的假绿、以及「这次怎么做对的」要靠人手工整理成规则。本手册以 Claude Code 为主线，另一条可试路线是自托管的 MyAgent（本次新增），再加上一条写进 AGENTS.md 的测试常驻约束（本次新增）。

这篇手册解决的是：把重复的提示词和流程固化成技能、钩子和子智能体，用固定的几条工作流控制「先探索、再计划、后写代码、最后提交」的节奏，把可判定的硬约束从「写在提示文件里靠提醒」搬到「提交时强制门禁」——违规就让提交失败，并把纠正指令当作反馈喂回给 agent；同时在一条自托管 runtime 上试「只读计划审批 + 反馈自动沉淀成技能」这条路线（本次新增，来源只有 README，没有任何评测数据）；并用「绝不改测试凑绿 + 新测试必须在空实现下失败」这条常驻规则，堵住代理最容易伪造的「测试全绿」出口（本次新增，来源只有一条推文，且只完整给出 7 条中的第 1 条）。

## 适用与不适用

**适用于流程固化与工作流（原有）**

- 手上有真实项目目录，要长期用编码 agent 处理改动。
- 改动能用单元/集成测试验证，或者有视觉稿/截图可以比对。
- 愿意按文件审阅别人给的配置，再放进自己项目。

**适用于提交门禁（原有）**

- 项目里存在一条能被 diff 文本模式判定的硬约束，例如「禁止绕过内部库直接调用某个模块」。
- 用 git，且有可用的 pre-commit 机制。
- agent 处在「改代码 → 提交 → 读失败输出 → 再改」的循环里，能读到 hook 的 stdout/stderr；具体怎么读到依赖你的工具链，来源没有交代，用之前先确认。

**适用于反馈自动沉淀与只读计划审批（本次新增，MyAgent）**

- 你想把「这次怎么做对的」自动沉淀成下次可复用的规则，而不是每次手写 skill 文件（README 自称的 Skills 自进化）。
- 任务属于重构、复杂修复、多文件修改，希望先只读分析、写计划、经你审批后再执行（README 明确 Plan Mode 的适用范围）。
- 你想读一个 Python runtime 的实现来理解 agent loop、权限检查、记忆与技能检索。
- 你接受自备模型接口与 key：Anthropic-compatible 或 OpenAI-compatible 都可以，README 的通用变量示例直接用 `MODEL=deepseek-chat`。

**适用于测试规则（本次新增）**

- 项目已有可运行的测试框架与测试命令。
- 仓库根目录已有（或可新建）`AGENTS.md`。
- 使用的编码代理会读取 `AGENTS.md` 作为上下文。
- 代理有读写代码与测试文件的权限；规则同时用来限制它对测试的改动。

**不适用（原有）**

- 只是问一次性问题，不值得固化成 skill（原文对照表：一次性任务跳过 Skills）。
- 子任务在主会话里放得下（原文：跳过 Subagents）；两三个子智能体就够（原文：跳过 Workflows）。
- 数据都在本地文件里（原文：跳过 MCP servers）。
- 不能接受「脚本以你的权限自动执行」的人，不要配 Hooks。

**不适用（提交门禁）**

- 约束没有唯一正确写法，或者只能靠人判断好坏（命名风格、抽象设计）——模式匹配做不了，必然有误报和漏报。
- 不愿意为规则付维护成本的人：规则固化在 hook 里，每次放宽或收紧都要改代码并 review。

**不适用（反馈自动沉淀，本次新增）**

- 不能用 Python 3.11+，或不在 macOS / Linux 上。
- 不愿自备模型接口与 key。
- 不能接受 `--yolo` 这种跳过确认的权限模式（README 自己也不建议长期默认使用）。
- 想要用 benchmark 证明它有效的人：README 没有任何分数、成功率、耗时或 token 数据，benchmark 还需自行下载。

**不适用（测试规则，本次新增）**

- 项目没有自动化测试：这条规则无从执行。
- 你想直接采用「7 条规则」：原文在采集时被截断，只完整给出第 1 条，第 2 条起缺失，不要据此推断或复述其余 6 条。
- 你想用它替代第 11 步的提交门禁：这条规则本身没有 hook 实现，目前只能写进 `AGENTS.md` 靠上下文约束，做不到「违规提交必须失败」。

**范围说明**：原有调研来源在子智能体、动态工作流、Agent Teams、MCP 四节被截断，本手册对这四项只写「什么时候用 / 什么时候跳过」的判定，不给配置步骤。新增的提交门禁做法，来源只有一段第一人称口述，没有代码、没有匹配模式、没有量化数据；第 11 步会逐条标出哪些是实现细节、哪些只是作者主张。本次新增的 MyAgent 材料只有仓库 README，未核对源代码，且它的「怎么试、怎么验证」一节在材料里被截断，本手册只写截断前那部分最小试用，不补写后续。本次新增的测试规则材料只有一条推文，只完整给出 7 条中的第 1 条，第 2 条起缺失，证据只有互动量，本手册只写已给出的那条，不补写其余 6 条。

## 前置条件

**Claude Code 路线（原有）**

- 系统：macOS / Linux / WSL（原文推荐的 native 安装路径）。Windows 用官方 setup 指南里的 PowerShell 或 CMD 命令。
- 备选安装方式：Homebrew、WinGet、npm；npm 方式要求 Node.js 22+。
- 一个 Anthropic 账号（Pro、Max 或 API key 都可以）。
- 项目里可写 `.claude/` 目录（建 skill、配 hooks 都要）。
- 如果抄仓库里的 `notification.py` hook，需要本机有 `uv`，且 `uv` 在 PATH 上。
- （提交门禁）一个 git 仓库，且 pre-commit 机制可用：`.git/hooks/pre-commit`，或在 pre-commit 框架里配置。
- （提交门禁）确认 agent 能读到 hook 的失败输出。来源只说「inject a prompt」，没说明注入是走 hook 输出还是走某个 agent harness 的接口，这一条必须先在你的工具链里验证。
- 版本差异（原报告给出的时点声明，用前自己核）：
  - `auto` 成为交互式终端和 VS Code 会话的内置启动模式：v2.1.283 及以后。
  - `/effort ultracode` 保留你已有的 effort 等级：v2.1.284+。

**MyAgent 路线（本次新增）**

- Python 3.11+、macOS / Linux、Git；ripgrep 可选但推荐。
- 一个 OpenAI-compatible 或 Anthropic-compatible 的模型接口：key、base URL、model 名。
- `.env`：项目会自动读取当前目录或父目录中的 `.env`。
- 想让自进化自动写入 skill，需要当前权限模式允许写文件；README 推荐 `--accept-edits`。

**测试规则（本次新增）**

- 项目已有可运行的测试框架与测试命令（例如 `npm test` 或 `pytest -q`）。
- 仓库根目录已有（或可新建）`AGENTS.md`。
- 使用的编码代理会读取 `AGENTS.md` 作为上下文。
- 代理有读写代码与测试文件的权限。

## 操作步骤

### 1. 安装（Claude Code）

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

与第 11 步的关系：`CLAUDE.md` 适合放偏好和背景这类主观约定；能被模式匹配判定的硬约束，更适合搬到提交门禁。

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
| Hooks | 想让代码在工具调用、会话开始等时刻**自动**跑（含提交时门禁） | 只想手动触发 | `.claude/settings.json` |
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

第三类用途来自原有调研：**提交时门禁** —— 在 commit 时刻检查 diff，发现违反架构约定的写法就让提交失败，并把纠正指令写进失败输出。具体做法见第 11 步。

预期结果：格式化不再靠人提醒；`.env` 这类路径即使 Claude 想动也动不了；第 11 步配好后，违反硬约束的提交进不去。

### 11. 把一条硬约束做成提交门禁（做法 A / 做法 B）

来源背景（Geoffrey Huntley，经 Simon Willison 博客收录）：智能体不按约定用他的 diagnostics 库时，靠改 `AGENTS.md` 这类指令文件不管用——「仍有落差，而且会漂移」；他改成写 pre-commit hook，检查 `git diff` 里有没有直接调用 observability 模块、绕过 diagnostics 模块，有就 fail 掉提交，并注入「请使用 diagnostics 库」的提示，效果「立刻变成 ten out of ten」。这段是口述，来源没有给出 hook 代码、匹配规则、提示词原文或任何数据。

**做法 A：提交门禁 + 失败提示自纠**（什么时候选：规则能被 diff 文本模式判定，且你希望它「必须发生」）

前提：第 1 条规则可判定；仓库有可用 pre-commit 机制；agent 能读到 hook 的失败输出。

1. 选一条「可判定」的硬约束。来源的例子是「不允许绕过 diagnostics 模块直接调用 observability 模块」。前提：这条约束必须能被 diff 文本的模式匹配判定，而不是「代码写得好不好」这类主观标准。
2. 写 pre-commit hook，读取已暂存的 diff。在 `.git/hooks/pre-commit` 或 pre-commit 框架配置里，取 `git diff --cached` 的文本作为输入。实现来源未给出。
3. 用模式匹配找出违规调用。实现来源未给出；下面只是把来源描述落成骨架，**不是来源给出的代码**：

```sh
#!/bin/sh
# 示意骨架：由调研报告补写，来源未提供实现
RULE_PATTERN='<绕过 diagnostics、直接 import/调用 observability 模块的模式>'
diff=$(git diff --cached)
if printf '%s' "$diff" | grep -Eq "$RULE_PATTERN"; then
  echo "提交被拒绝：检测到绕过 diagnostics 库的直接调用。"
  echo "请改用 diagnostics 库的接口重写上述调用后再次提交。"
  exit 1
fi
```

4. 失败时非零退出，并把给 agent 的纠正提示写进输出。这是这套做法的核心机制：hook 的失败输出就是 agent 看到的反馈，等于「inject a prompt」。注意来源没说明注入是走 hook 输出还是走某个 agent harness 的接口，按你的工具链确认。
5. 让 agent 重跑直到提交通过，而不是人去手工改。门禁失败 → 提示注入 → agent 改写 → 再提交，循环收敛。
6. 把规则本身当代码维护。规则写在 hook 里，显式、可版本化、可 review，不像 `AGENTS.md` 的散文那样漂移；变更规则时同步更新 hook 与匹配模式。

预期结果：违规提交进不去；agent 读到失败输出后自己改写再提交。

**做法 B：只靠提示文件提醒（`AGENTS.md` / `CLAUDE.md`）**（什么时候选：约束是主观的，或只是偏好）

1. 把约定写进 `CLAUDE.md`（见第 4 步）或 `AGENTS.md`，让 agent 每次会话读到。
2. 靠上下文里出现这条指令来约束行为。

代价（来源主张，无数据）：指令与实际做法之间有「落差（delta）」，而且会漂移。

**怎么选**

- 约束能被 diff 模式判定、并且你希望违规提交直接进不去 → 做法 A。
- 约束是主观的（命名风格、抽象设计），或者只是偏好 → 做法 B。
- 两者可以并存：门禁管硬约束，提示文件管偏好与背景。但对同一条硬约束，来源建议不要在 `AGENTS.md` 里重复（试用期故意不重复，才看得出门禁有没有起作用）。

补充：这套门禁与第 10 步的 Hooks 是同一个机制，只是触发点落在 commit 上、用途从「格式化 / 拦截路径」变成「强制架构约定 + 把失败信息当反馈通道」。

### 12. 装 MyAgent 并跑通第一条任务（本次新增；这条路线的前置步骤）

前提：Python 3.11+、macOS / Linux、Git；已有一个模型接口（key / base URL / model 名）。下面的命令、配置与判断规则全部照抄自仓库 README。

**12.1 装依赖**（在项目目录内）

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**12.2 配置 `.env`**（项目会自动读取当前目录或父目录中的 `.env`），三种写法任选：

Anthropic-compatible 示例：

```env
APIKEY=sk-your-api-key
API=https://your-host/anthropic
MODEL=claude-sonnet-4-6
```

OpenAI-compatible 示例：

```env
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://your-host/v1
MODEL=gpt-4o
```

通用变量示例：

```env
APIKEY=sk-your-api-key
API=https://your-host/v1
MODEL=deepseek-chat
```

协议判断规则（照此决定填哪种变量）：`API` 或 `--api-base` 路径包含 `/anthropic` 时按 Anthropic-compatible 调用；否则有 OpenAI base URL 时按 OpenAI-compatible 调用；`--model` 会覆盖 `.env` 中的 `MODEL`。

**12.3 启动并跑一条任务**

```bash
python3 -m agents.main
```

启动后直接输入任务，例如：

```text
阅读这个项目，告诉我 agent loop 是怎么跑起来的
```

一次性任务：

```bash
python3 -m agents.main "总结这个项目的目录结构和核心模块"
```

预期结果：它对项目给出结构总结，你能看出 tool call 的权限检查与回写过程。

**12.4 先跑不调用模型的测试**

```bash
pip install -r requirements.txt pytest
python -m pytest -q
```

README 称测试覆盖权限模式（plan / acceptEdits / dontAsk）、危险命令检测、权限规则优先级、编辑前必须先读和 mtime 校验、Skill 加载优先级与 BM25 检索；CI 在 Python 3.11 和 3.12 上运行。注意：测试不调用模型，全绿不等于端到端效果已被验证。

### 13. 用 Plan Mode 做只读计划审批（本次新增）

前提：第 12 步已跑通。README 明确 Plan Mode 适合重构、复杂修复和多文件修改：先只读分析和写计划，用户审批后再执行。

```bash
python3 -m agents.main --plan "分析 Skills 检索逻辑应该如何优化"
```

REPL 内也可以直接输入：

```text
/plan
```

关键约束：Plan Mode 下会阻断写操作和 Shell。预期结果：你拿到的是只读分析加一份计划，在你审批之前它动不了文件。

配套会话能力（README 所述）：会话自动保存，`python3 -m agents.main --resume` 恢复最近会话；`/compact` 做上下文压缩；大工具结果会被截断或持久化，避免单次结果把上下文撑爆。

怎么选：重构、复杂修复、多文件修改走这条；小改动仍走第 7 步的做法 A/B/C。

### 14. 把反馈自动沉淀成技能（Skills 自进化，本次新增）

前提：当前权限模式允许写文件——后台自动写入 Skill 需要写权限。README 推荐：

```bash
BEAR_AUTO_SKILL_EVOLUTION=1 \
BEAR_AUTO_SKILL_TARGET=project \
python3 -m agents.main --accept-edits
```

更激进的模式（README 不建议长期默认使用，因为会跳过确认）：

```bash
python3 -m agents.main --yolo
```

`BEAR_AUTO_SKILL_EVOLUTION` 默认已开启；要显式写进 `.env` 就是：

```env
BEAR_AUTO_SKILL_EVOLUTION=1
BEAR_AUTO_SKILL_TARGET=project
```

目标选 project 还是 user：`BEAR_AUTO_SKILL_TARGET=project` 表示自动新增的 Skill 写入当前项目；想沉淀为所有项目共享的个人 Skill 就写 `BEAR_AUTO_SKILL_TARGET=user`。对应落盘路径：

```text
project: <project>/.bear/skills/<skill_name>/SKILL.md
user:    ~/.bear/skills/<skill_name>/SKILL.md
```

**给什么样的反馈**：只沉淀稳定、明确、未来同类任务仍适用的规则。

不适合沉淀的例子：

```text
帮我写一篇 500 字政府报告。
```

适合沉淀的例子：

```text
以后写政府报告、工作汇报、调研材料时，默认先给可直接使用的初稿，不要连续追问；结构按“标题、背景、主要情况、问题分析、工作举措、下一步计划”组织，语言要正式克制。
```

适合演化已有 Skill 的例子：

```text
以后这类政府报告还要加入关键数据指标，不能只写概念性表述。
```

自进化链路（README 描述，可据此定位排查点）：

```text
第 N 轮用户任务
  -> Agent 输出结果
  -> 保存 pending extraction window
第 N+1 轮用户反馈
  -> 合并进上一轮 window
  -> online_ingest()
  -> Extractor 抽取候选 Skill
  -> Maintainer 判断 add / merge / discard
  -> create_skill_file() 或 evolve_skill_file()
  -> 写入 SKILL.md
  -> 记录 provenance、usage stats 和版本快照
```

对应核心文件：`agents/agent.py`、`agents/online_skill_evolution.py`、`agents/skills.py`、`agents/skill_evolution.py`。审计产物：`.bear/skill-evolution/usage.jsonl`、`online_provenance.jsonl`、`online_skill_provenance.json`、`skill_usage_stats.json`、`history/`。

预期结果：给出一条明确反馈后，`.bear/skills/` 下出现或更新了 `SKILL.md`，并且能在审计产物里查到它的来源与版本。

### 15. 两条路线怎么选（本次新增）

| 维度 | Claude Code 路线（原有） | MyAgent 路线（本次新增） |
|---|---|---|
| skill 从哪来 | 你手写 `.claude/commands/*.md` 或 `.claude/skills/*/SKILL.md` | Runtime 从反馈中抽取候选，自动 add / merge / discard 后写入 `.bear/skills/` |
| 触发方式 | Slash 主动敲 `/`；Agent Skill 按 description 匹配自动调用 | 检索后调用（README 称含 BM25 检索） |
| 计划与执行 | 自己按三条工作流走，权限模式靠 `Shift + Tab` 切 | 内建 `--plan` / `/plan`，只读，阻断写操作和 Shell |
| 硬约束 | pre-commit hook 门禁（必须发生）或提示文件提醒（会漂移） | README 未提等价的门禁机制 |
| 模型层 | Anthropic 账号 | 自备 Anthropic-compatible 或 OpenAI-compatible 接口 |
| 证据强度 | 有可核对的仓库文件与路径；行为主张仍属作者主张 | 只有 README；无 benchmark、无前后对比、未展示实际生成的 SKILL.md |

怎么选：

- 你要的是「违规提交进不去」这种必须发生的约束 → 走原有 Claude Code + hook 路线，别指望把门禁挪进 runtime。
- 你要的是「反馈别靠人手工整理」 → 按第 12–14 步小范围试 MyAgent，只拿它验证自进化是否真的沉淀出你要的规则。
- 两条可以并存：MyAgent 用来跑只读计划与反馈沉淀试验，硬约束仍放在 git 门禁里——门禁在 git 层，与用哪个 runtime 无关。
- 不要混目录：`.claude/skills/` 与 `.bear/skills/` 是两套系统的路径，各管各的。

### 16. 用 AGENTS.md 约束「测试凑绿」，并用空实现检查自证（本次新增）

来源背景：一条推文主张做 vibe 编码时应在 `AGENTS.md` 中加入 7 条规则，用于约束 AI 代理行为。采集到的正文只完整给出第 1 条，第 2 条只出现编号「2.」就中断，其余 6 条内容未知。已给出的第 1 条是：绝不编辑、跳过或删除测试来让测试通过；对自己编写的每个测试，都要确认：如果被测代码什么都不做，这个测试会失败；如果它仍然会通过，就重写这个测试。作者给出的理由（属于主张，非数据）：一个绿色的测试套件是代理最容易伪造的东西。

前提：项目已有可运行的测试框架与测试命令；仓库根目录已有（或可新建）`AGENTS.md`；使用的编码代理会读取 `AGENTS.md` 作为上下文；代理有读写代码与测试文件的权限。

1. 确认项目的测试命令可正常执行：

```bash
# 替换为本项目实际命令
npm test
# 或
pytest -q
```

预期结果：命令能跑起来，输出当前测试结果。

2. 在仓库根目录的 `AGENTS.md` 中追加规则块（可直接抄下面的内容）：

```markdown
## Testing rules

1. Never edit, skip, or delete a test to make it pass.
2. For every test you write, verify that it FAILS if the code under test does nothing.
   If it still passes, rewrite the test.
```

预期结果：代理每次会话都能读到这两条规则，新写测试时受其约束。

3. 让代理新写一个测试后，做一次「空实现检查」：把被测函数临时改成什么都不做（例如直接 `return None` / 提前返回），重跑该测试。

```bash
# 临时把被测实现改为空实现后
pytest tests/test_xxx.py::test_yyy -q   # 预期：FAILED
```

预期结果：FAILED。若空实现下仍然通过，按规则重写这个测试。

4. 恢复被测实现，再次运行，确认测试重新变绿：

```bash
pytest tests/test_xxx.py::test_yyy -q   # 预期：PASSED
```

预期结果：PASSED。

5. 在合并前抽查代理的提交，确认它没有通过改动测试文件来凑绿：

```bash
git diff --stat HEAD~1 HEAD -- '*test*' '*spec*'
```

（原文未给出上述命令，命令是按规则意图补的最小可执行检查方式，不是推文原文。）预期结果：diff 里没有「为了变绿而改测试」的改动；有的话回退并要求代理重写测试。

6. 与第 11 步的关系：这条规则目前走的是做法 B（写进提示文件），不是做法 A（hook 门禁）。推文原文就是把规则写进 `AGENTS.md`；本手册没有它对应的 hook 实现。若想让它「必须发生」，需要自己按第 11 步做成能被 diff 判定的门禁——但「测试是否真的在验证行为」通常不是纯文本模式能判定的，空实现检查需要实际运行测试，不是 diff 匹配能覆盖的。

预期结果：代理提交里不再出现改测试凑绿；新写的测试在空实现下确实会失败；你在合并前抽查 diff 时能看到代理没有动测试文件来凑绿。

## 怎么判断变好了

**流程固化与工作流（原有）**

- 触发条件可观察：同一个 prompt 或流程重复 ≥3 次，就该去建 skill，而不是继续手打。
- Plan 阶段真的没写代码：Explore 阶段只读文件、出计划；`ultrathink` 只出现在需要更深推理的那句计划 prompt 上。
- TDD 的红过：测试在实现之前确实失败过一次，最后全绿才提交。
- 视觉迭代轮数：原文标注通常 2–3 轮就能对齐稿子。
- effort 的自检：别照抄默认值，用 `/effort` 在自己环境核对；发现自己在常规任务上想开 `max` 时，原文说约 80% 的情况正解在上游 —— 更锋利的 `CLAUDE.md`、原子化的计划、点名的文件。
- 最小试用方式：先在自己的项目里**小范围试**，一次只引入一个扩展点。
- 试多久：视觉迭代以 2–3 轮为一轮试；effort 随时可以 `/effort auto` 重置回模型默认。

**提交门禁（原有）**

- 违规提交率：hook 触发次数 / 总提交次数，看是否随时间下降（agent 是不是真的学会了）。
- 首次提交即通过的比例：反映反馈是否有效，而不是反复来回。
- 每次触发后需要的修复轮数：轮数少说明失败输出里的提示写清楚了。
- 人在 review 中提出同类问题的次数：这是最终的业务指标，直接对应省了多少人工。
- 误报次数：频繁误报说明规则的模式化程度不够，应该先修规则，再判断方案价值。
- 门禁的最小试用：挑一条团队在 code review 中反复提出的硬约束（不必是 diagnostics 库，任何「禁止 X，必须走 Y」都行），写一个 pre-commit hook 检测违规、失败输出写明「应改成什么」；让 agent 在正常提交循环里工作一周，期间**不要**额外在 `AGENTS.md` 里重复这条规则。
- 建议的对照：同一约束、同一类任务分两组——A 组只靠 `AGENTS.md` 提示，B 组用 hook 门禁 + 失败提示注入。
- 怎么判定：若 B 组违规提交率下降、人工 review 同类评论减少、误报可控，说明有效，可以继续用；若 hook 频繁误报，或 agent 读不到 / 读不懂失败输出而无法自纠，说明问题出在「规则可判定性」或「反馈通道」，先修这两个前提再谈收益。

**反馈自动沉淀与只读计划（本次新增）**

- Plan Mode 是否真的只读：计划获批之前没有任何写操作或 Shell 执行。
- 自进化是否落盘：`<project>/.bear/skills/<skill_name>/SKILL.md` 或 `~/.bear/skills/<skill_name>/SKILL.md` 出现或更新。
- 能不能查到来源与版本：`.bear/skill-evolution/usage.jsonl`、`online_provenance.jsonl`、`online_skill_provenance.json`、`skill_usage_stats.json`、`history/`。
- 沉淀质量只能人工抽查：README 没有命中率、误沉淀率，也没展示实际生成或合并出的 `SKILL.md`，所以要自己读一遍生成的 skill 是不是你要的那条规则。
- 最小试用方式（来源给出，半天内可完成）：按第 12 步 12.1–12.2 装好并配好 `.env`（没有 Anthropic 接口时用 DeepSeek 这类 OpenAI-compatible 端点，即 `API` + `MODEL=deepseek-chat` 的通用变量写法）；跑 `python -m pytest -q` 确认权限模式、危险命令检测、编辑前必须先读与 mtime 校验、Skill 检索等基础行为。
- 截断说明：来源材料的这一节在「……Skill 检索等基础行为」处被截断，原本后面还有什么试用步骤，本手册不补写。
- 试多久：README 未给时间跨度。以「给一条可沉淀的反馈 → 看是否落盘 → 人工读一遍生成的 SKILL.md」为一轮，轮数自己定。

**测试规则与空实现检查（本次新增）**

- 代理提交中修改测试文件以使其通过的次数（越少越好）。
- 新测试通过空实现检查的比例（越高越好）。
- 因测试造假 / 无效测试而需要人工回退或返工的次数。
- 最小试用方式：只挑一个正在用编码代理的项目，在该项目的 `AGENTS.md` 中加入上面的 Testing rules 两条；用同一个代理完成若干次「写功能 + 写测试」的任务，每次对新增测试执行一次空实现检查。
- 试多久：持续一两周或若干个任务周期后汇总。
- 若原文其余 6 条后续可见，再用同样方式逐条小范围试，不一次性全部加入；不要凭标题补全。
- 注意：以上指标与试用方式是调研报告给出的可操作化验证建议，不是推文原文；原文只给出一个判据——新测试在「被测代码什么都不做」时必须失败，否则重写。

## 常见坑

1. 把 `think` / `think hard` / `think harder` 当开关用。Claude Code 只识别 `ultrathink`，其它会被当普通文本透传。
2. 以为 effort 越高越聪明。原文明确更高 ≠ 更聪明；`max` 在常规任务上边际收益递减、更容易过度思考，且只限单会话，写不进 `settings.json` 的 `effortLevel`。
3. `cp -r` 整个 `.claude/`。Skills、hooks、agents、workflows 是以你的权限运行的可执行指令，要逐文件复制并阅读。
4. 把版本时点的数字当事实。原报告的模型名、各模型 effort 默认值（如 v2.1.289 那一串）和价格无法核验，使用前用 `/effort` 在自己环境核对；调研结论也提醒不要照抄具体数字。
5. 命名冲突搞错。按 企业 > 个人 > 项目 > 插件 > 内置 的先匹配先赢；本地 skill 不替换内置命令的别名，插件 skill 会同时加载。
6. 过度上扩展点。任务在主会话放得下就别上子智能体；两三个子智能体够就别上 workflows；数据都在本地就别上 MCP。
7. 拿半截资料硬做。原报告在子智能体、动态工作流、Agent Teams、MCP 四节被截断，这几项本手册只给判定，不给步骤。
8. 拿不可判定的约束上 hook。模式匹配必然有误报和漏报；对「没有唯一正确写法」的约束（命名风格、抽象设计）不适用，这类只能留在提示文件里。
9. 规则写进 hook 就不管了。规则固化在 hook 里的代价是：每次放宽或收紧都要改代码并 review；规则变更时要同步更新 hook 与匹配模式。
10. 反馈通道没打通。来源没交代 hook 的失败输出怎么被 agent 读到；如果你的工具链里 agent 读不到 stdout/stderr，门禁只会变成「提交老是失败」，不会自纠。
11. 把「ten out of ten」当数据。那是来源的主观评分，没有定义「十分」是什么、怎么测量、有没有对照。
12. 以为开了自进化就不用管 skill 了。README 没有命中率、误沉淀率，也没展示实际生成/合并出的 `SKILL.md`；规则质量要你自己抽查。沉淀只对稳定、明确、未来同类任务仍适用的反馈有意义，一次性任务（如「帮我写一篇 500 字政府报告」）不适合沉淀。
13. 在 Plan Mode 下等着它改文件。Plan Mode 会阻断写操作和 Shell，它只给只读分析和计划。
14. 用 `--yolo` 当默认。README 自己也不建议长期默认使用，因为它跳过确认，有误改风险。
15. 把 `python -m pytest -q` 全绿当端到端有效。测试不调用模型，跑通 pytest 不等于效果已被验证。
16. 把 README 里的示例值当事实。`claude-sonnet-4-6`、`gpt-4o` 这类 model 名和「按 `API` 路径是否含 `/anthropic` 判协议」都是 README 的说法，用前自己核对。
17. 目标配错，skill 写错地方。`BEAR_AUTO_SKILL_TARGET=project` 写 `<project>/.bear/skills/`，`user` 写 `~/.bear/skills/`；权限模式不允许写文件时，后台写 skill 不会成功。
18. 把审计产物当效果证明。`usage.jsonl` 等只能说明来源、使用统计和版本快照，不能证明「变好了」。
19. 拿半截资料硬做（MyAgent）。本次材料只有仓库 README，未核对源代码，且「怎么试、怎么验证」一节被截断。
20. 把测试改绿当完成。绿色测试套件是代理最容易伪造的东西（作者主张，无数据）；规则要求绝不编辑、跳过或删除测试来让它通过。
21. 空实现检查搞错对象。只对「自己新写的测试」做空实现检查，不是把全部既有测试重跑一遍；恢复实现后要确认该测试重新变绿。
22. 把「7 条规则」当完整清单抄。原文在采集时被截断，只完整给出第 1 条，第 2 条起缺失，不要推断或复述其余 6 条。
23. 没有测试的项目硬套。对没有自动化测试的项目，这条规则无从执行。
24. 误把补写的 git 命令当原文。`git diff --stat HEAD~1 HEAD -- '*test*' '*spec*'` 是调研报告按规则意图补的最小检查方式，不是推文给出的命令。
25. 以为写进 `AGENTS.md` 就等于「必须发生」。它和第 11 步做法 B 一样属于提示文件约束，会漂移；要「违规提交进不去」得自己做门禁，而测试是否真的在验证行为通常不是 diff 模式能判定的。

## 证据与来源

- **来源一（原有）**：GitHub 仓库 `wesammustafa/Claude-Code-Everything-You-Need-to-Know` 的 README（约 3095 stars，作者 wesammustafa），以调研报告形式并入。该 README 自称「不是一个扩展点的截图，而是一个真能跑的项目」，仓库自带可运行的 `.claude/` 目录（commands、skills、agents、workflows、hooks、settings.json）。
- 来源一可核验的仓库内容（文件与路径）：第 8 步的路径表、7 个 slash skill 名称、`/claude-md-review`、`/stale-docs-audit`、`notification.py`、`settings.json` 用 `$CLAUDE_PROJECT_DIR` 调 `uv run`。
- 来源一的数据/数字（均为原报告所述）：约 3095 stars；视觉迭代通常 2–3 轮；同一流程重复 ≥3 次才固化 skill；约 80% 的「想开 max」情形正解在上游；5 个子智能体 + 10 个角色提示词。
- 来源一属于作者主张、未经本项目验证：五个扩展点的对照表与组合建议、三条工作流的具体步骤、effort 是「行为旋钮」的心智模型与等级选择建议、「Opus 规划 / Sonnet 执行」、按模型分的 effort 默认值列表、hooks 的三类团队用途。
- 来源一版本声明：`auto` 内置启动模式、`/effort ultracode` 保留等级、六种权限模式与 `Shift + Tab` 循环顺序、各模型 effort 默认值，都是原报告在特定版本时点（v2.1.283 / v2.1.284 / v2.1.289 等）的声明，本手册只把它们标为「用前核对」。
- **来源二（原有）**：Simon Willison 博客 2026-10-13 收集的一条引言，出自 Geoffrey Huntley 的文章《nobody should type code by hand anymore. here's what's left.》。原文只给了三件事：改 `AGENTS.md` 不管用（「there's still a delta, and it'll drift」）；改用 pre-commit hook 检查 `git diff` 里有没有直接调用 observability 模块、绕过 diagnostics 模块；有就 fail 掉提交并注入「请使用 diagnostics 库」的提示，效果「ten out of ten」。
- 来源二完全没有的：hook 代码、匹配规则、提示词原文、误报率、团队规模、项目类型、时间跨度。所以第 11 步的第 2–4 条都标了「实现来源未给出」。
- 第 11 步里那段 `sh` 骨架由调研报告补写，**不是来源给出的代码**，只用来展示结构。
- 来源二属于作者主张、没有证据：「there's still a delta, and it'll drift」（对指令文件失效机制的断言，无数据）、「ten out of ten」（主观评分，未定义如何测量），以及「做法 A 比做法 B 有效」这个结论本身。
- 「怎么判断变好了」里门禁部分的指标（违规提交率、首次提交即通过比例、修复轮数、人工 review 同类意见次数、误报次数）和 A/B 对照试用方式，是调研报告给出的可操作化验证建议，不是来源原文。
- **来源三（本次新增）**：GitHub 仓库 `ztt0216/MyAgent` 的 README（36 stars，MIT），一个 Python 实现的通用 Agent Runtime，以调研报告形式并入。
- 来源三可核对的内容：完整目录结构、端到端运行链路（用户输入 → Agent.chat() → 权限检查 → 工具执行 → tool result 回写 → 会话保存 → 后台 skill usage tracking 与 online skill evolution）、Skills 自进化链路、审计产物路径、测试覆盖范围与 CI 版本（Python 3.11 / 3.12）、以及可直接照抄的安装 / `.env` / 启动 / 权限模式 / 反馈写法。
- 来源三属于作者主张、没有证据：Runtime「可阅读、可扩展」、适合作为二次开发基础、自进化能稳定沉淀可复用规则等价值判断；README 没有任何 benchmark 分数、任务成功率、耗时或 token 节省数据；没有真实使用案例或前后对比实验；没有展示实际生成或合并出的 `SKILL.md` 内容；没有自进化的命中率或误沉淀率。
- 来源三的局限：材料仅为仓库 README（source_note 注明「依据仓库 README」），未核对源代码实现，无法验证 README 描述与代码是否一致；项目是 36 stars 的个人项目；材料在「怎么试、怎么验证」一节被截断。
- 来源三与已有清单条目的关系：调研提到清单中的 **DeepSeek（tool，status: try）** 与之直接相关——README 的 OpenAI-compatible 通用变量示例就是 `MODEL=deepseek-chat`，可直接把 DeepSeek 这类端点用作它的模型层；其余清单条目无直接对应。
- 第 12–15 步与「怎么判断变好了」中 MyAgent 部分的命令、`.env` 变量、落盘路径、审计产物路径、反馈示例，均照抄自来源三 README；其中「半天内可完成的最小试用」也是来源给出，但后面被截断。本手册对两条路线的对照表（第 15 步）是把已有做法与来源三的描述并列，属于本手册的整理，不是来源原文结论。
- **来源四（本次新增）**：一条推文（@kloss_xyz），标题称 vibe 编码时应在 `AGENTS.md` 中加入 7 条规则，以调研报告形式并入。采集时原文被截断：标题说 7 条，正文只完整给出第 1 条，第 2 条只出现编号「2.」就中断，其余 6 条内容未知。
- 来源四可核对的内容：第 1 条的完整文字（绝不编辑、跳过或删除测试来让测试通过；对自己编写的每个测试，都要确认如果被测代码什么都不做，这个测试会失败；如果仍然通过就重写这个测试）。
- 来源四的数据：只有推文互动量（91 赞、4 次转发、31 条回复），没有任何项目案例、失败率或前后对比数据。
- 来源四属于作者主张、没有证据：「一个绿色的测试套件是代理最容易伪造的东西」是作者主张，原文未给出证据。
- 来源四的局限：原文被截断，无法据此推断或复述其余 6 条；适用条件是项目已有测试、代理会运行测试且有能力改动测试文件，对没有自动化测试的项目这条规则无从执行。
- 第 16 步中「空实现检查」的步骤与 `pytest` 命令示例来自来源四原文；`git diff --stat HEAD~1 HEAD -- '*test*' '*spec*'` 是调研报告补写的最小可执行检查方式，不是推文给出的。
- 「怎么判断变好了」里测试规则部分的指标（改测试文件的提交次数、空实现检查通过率、返工次数）和最小试用方式（一个项目、一两周或若干任务周期、逐条小范围试），是调研报告给出的可操作化验证建议，不是来源原文；原文只给了「空实现必须失败」这一个判据。
- 调研结论给的取舍：重点抄三个工作流、skills/hooks 的文件级配置步骤和两张对照表；原文在子智能体、动态工作流、Agent Teams、MCP 四节被截断，且 2026 年模型名与价格无法核验，不要照抄具体数字。提交门禁做法的结论是：思路清晰但实现空白，需自行补齐 hook 实现后小范围验证，不要照抄「ten out of ten」这类说法。MyAgent 的结论是：可以小范围试，重点验证 Plan Mode 的只读审批和 Skills 自进化能否把反馈沉淀成可复用规则，但只有作者主张、没有评测数据，先在自己的小任务上跑通再决定是否写进手册。测试规则的结论是：把原文唯一完整给出的那条规则（禁止为凑绿而改测试，且每个新测试都要先验证「被测代码什么都不做时会失败」）抄进单个项目的 AGENTS.md 试一轮，因为它是一条可直接落地、可自检的常驻约束；但原文只露出 7 条中的第 1 条，其余被截断，且仅凭作者主张，不宜直接全面采用。

## 依据的调研

- [wesammustafa/Claude-Code-Everything-You-Need-to-Know](../research/radar/2026-10-05/1337-wesammustafa-claude-code-everything-you-need-to-kn.md)：值得一试，把这份仓库当成 Claude Code 的实操手册素材来源，重点抄它的三个工作流（Explore→Plan→Code→Commit、TDD、视觉迭代）、skills/hooks 的文件级配置步骤和「能力发现/任务匹配」两张对照表，先在自己的项目里小范围试；但原文在子智能体、动态工作流、Agent Teams、MCP 四节被截断，且其中大量 2026 年模型名与价格无法核验，不要照抄具体数字。
- [Quoting Geoffrey Huntley](../research/radar/2026-10-13/2961-quoting-geoffrey-huntley.md)：值得一试，把架构约束从 AGENTS.md 这类提示文件搬到 pre-commit hook：提交时检查 git diff，发现绕过内部库（如 diagnostics 模块）的调用就让提交失败，并把纠正指令写进失败输出、交给编码智能体自纠。理由是把“靠提醒”变成“事件触发的强制门禁”，避免规则随上下文漂移；但原文只有一段口述、没有代码与量化数据，需自行补齐实现后小范围验证。
- [ztt0216/MyAgent](../research/radar/2026-10-17/4080-ztt0216-myagent.md)：值得一试，可以小范围试：按 README 用 OpenAI-compatible 接口（示例里就有 deepseek-chat）把 MyAgent 在本地跑起来，重点验证 Plan Mode 的只读审批和 Skills 自进化能否把反馈沉淀成可复用规则；它给了可照抄的安装、.env、权限模式和反馈写法，但只有作者主张、没有评测数据，先在自己的小任务上跑通再决定是否写进手册。
- [@kloss_xyz: 如果你正在进行 vibe 编码，你需要在你的 AGENTS.md 中添加这 7 条规则：](../research/radar/2026-10-17/4151-vibe-agents-md-7.md)：值得一试，把原文唯一完整给出的那条规则（禁止为凑绿而改测试，且每个新测试都要先验证“被测代码什么都不做时会失败”）抄进单个项目的 AGENTS.md 试一轮，因为它是一条可直接落地、可自检的常驻约束；但原文只露出 7 条中的第 1 条，其余被截断，且仅凭作者主张，不宜直接全面采用。
