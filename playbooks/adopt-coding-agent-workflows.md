# 让编码 agent 按规格、证据和门禁交付改动

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这篇手册解决如何把编码 agent 的重复流程固化成技能与工作流，并用提交门禁、测试自证和项目契约防止「假完成」「假绿」「规则漂移」。
> 先试这一步：先在单个项目里把一条可判定的硬约束做成 pre-commit 门禁，并在一个小任务上试一次先规格后 TDD 的流程。
> 最近修订：2026-10-22

## 解决什么问题

用编码 agent 干活时，一次性对话会在几件事上反复消耗：同一个流程每次重写提示词、上下文质量差导致 agent 跑偏、项目约定散落在多个提示文件里会漂移、「做完了」却没有证据、绿色测试套件可能是代理改测试改出来的假绿、以及「这次怎么做对的」要靠人手工整理成规则。本手册以 Claude Code 为主线，另一条可试路线是自托管的 MyAgent，再加一条叠加在已用 harness 上的 Ryugi 工作流；同时保留提交门禁、测试常驻约束，以及把 AGENTS.md 工程化成可 lint 的项目契约。文件大小门禁用预提交钩子检查暂存文件，按 bytes/4 估算 tokens，单文件超过 5,000 就阻止提交，并在失败输出里给出拆分说明。

这篇手册解决的是：把重复的提示词和流程固化成技能、钩子和子智能体，用固定工作流控制「先探索、再计划、后写代码、最后提交」的节奏，也提供「先批准规格、再逐任务 TDD、最后 UI 验收」的较重路线；把可判定的硬约束从「写在提示文件里靠提醒」搬到「提交时强制门禁」，并用五段式 AGENTS.md + 零依赖 linter + SessionStart 钩子让项目契约可检查、可复用、能在会话开始时自检。同时保留三条证据较弱的试验路线：MyAgent 的「只读计划审批 + 反馈自动沉淀成技能」、Ryugi 的「规格前置 + TDD + UI 验收」、以及「绝不改测试凑绿 + 新测试必须在空实现下失败」的常驻规则。

## 适用与不适用

**适用于流程固化与工作流**

- 手上有真实项目目录，要长期用编码 agent 处理改动。
- 改动能用单元/集成测试验证，或者有视觉稿/截图可以比对。
- 愿意按文件审阅别人给的配置，再放进自己项目。

**适用于先规格后实现（Ryugi）**

- 使用受支持的编码智能体 harness，且愿意按 harness 分别安装。
- 任务从想法走到实现，尤其跨模块、涉及架构、需要 upfront design，或有 UI 验收需求。
- 项目已有或愿意补设计系统、verify、ship 等自有技能；ryugi-artifacts 需要 Node.js。
- 你愿意在写代码前先批准 spec，并能接受比直接改代码更重的流程。

**适用于提交门禁**

- 项目里存在一条能被 diff 文本模式判定的硬约束，例如「禁止绕过内部库直接调用某个模块」。
- 用 git，且有可用的 pre-commit 机制。
- agent 处在「改代码 → 提交 → 读失败输出 → 再改」的循环里，能读到 hook 的 stdout/stderr；具体怎么读到依赖你的工具链，来源没有交代，用之前先确认。

**适用于文件大小门禁**

- 代码库已有或允许加入预提交钩子机制。
- 主要想约束代理生成或代理修改的代码文件，避免单个文件过大。
- 团队能接受按 bytes/4 估算 tokens 的近似方法。
- 你希望只检查本次暂存文件，避免全仓库扫描造成无关干扰。

**适用于反馈自动沉淀与只读计划审批（MyAgent）**

- 你想把「这次怎么做对的」自动沉淀成下次可复用的规则，而不是每次手写 skill 文件。
- 任务属于重构、复杂修复、多文件修改，希望先只读分析、写计划、经你审批后再执行。
- 你想读一个 Python runtime 的实现来理解 agent loop、权限检查、记忆与技能检索。
- 你接受自备模型接口与 key：Anthropic-compatible 或 OpenAI-compatible 都可以。

**适用于测试规则**

- 项目已有可运行的测试框架与测试命令。
- 仓库根目录已有或可新建 AGENTS.md。
- 使用的编码代理会读取 AGENTS.md 作为上下文。
- 代理有读写代码与测试文件的权限；规则同时用来限制它对测试的改动。

**适用于项目契约与开机自检（AntoGA/agents-contract）**

- 项目里有隐性规则：真实费率藏在配置文件里、生成物不许手改、测试命令不是裸 pytest、改完必须写 changelog 之类从代码里推不出来的约定。
- 你希望同一份 AGENTS.md 被 Claude Code、Codex、Cursor、Copilot 等工具复用；Claude Code 通过 CLAUDE.md 里一行 @AGENTS.md 导入。
- 你愿意用 Python 3.9+ 跑一个零依赖 linter，并接受把 lint 接进 CI。
- 你用 Claude Code，想让会话开始或恢复时自动跑 linter、装依赖、跑测试，把结果送进上下文。

**不适用（原有）**

- 只是问一次性问题，不值得固化成 skill。
- 子任务在主会话里放得下，跳过 Subagents；两三个子智能体就够，跳过 Workflows。
- 数据都在本地文件里，跳过 MCP servers。
- 不能接受「脚本以你的权限自动执行」的人，不要配 Hooks。

**不适用（先规格后实现，Ryugi）**

- 只想让 agent 直接写代码，不愿先出规格、再批准。
- 项目没有测试，也没有 UI 验收需求。
- 不愿安装插件，或不能为 ryugi-artifacts 提供 Node.js。
- 你想先要量化收益：原文只有作者主张，没有效果数据。
- 你在 Cursor 或 OpenCode 上想照完整命令安装：原文只给本地插件源或 INSTALL 链接，没有完整命令。

**不适用（提交门禁）**

- 约束没有唯一正确写法，或者只能靠人判断好坏，例如命名风格、抽象设计；模式匹配做不了，必然有误报和漏报。
- 不愿意为规则付维护成本的人：规则固化在 hook 里，每次放宽或收紧都要改代码并 review。

**不适用（文件大小门禁）**

- 代码库没有预提交钩子机制，且你不打算加。
- 主要文件不是代理编写或代理修改的，或者团队不能接受按 bytes/4 近似估算。
- 你希望精确 token 计数：原文只给 bytes/4 的估算方式。
- 原文没有说明如何处理二进制文件、超大文件、不同编码或误报；这些需要你自己先定规则。

**不适用（反馈自动沉淀）**

- 不能用 Python 3.11+，或不在 macOS / Linux 上。
- 不愿自备模型接口与 key。
- 不能接受 --yolo 这种跳过确认的权限模式。
- 想要用 benchmark 证明它有效的人：README 没有任何分数、成功率、耗时或 token 数据。

**不适用（测试规则）**

- 项目没有自动化测试：这条规则无从执行。
- 你想直接采用「7 条规则」：原文在采集时被截断，只完整给出第 1 条，第 2 条起缺失，不要据此推断或复述其余 6 条。
- 你想用它替代提交门禁：这条规则本身没有 hook 实现，目前只能写进 AGENTS.md 靠上下文约束，做不到「违规提交必须失败」。

**不适用（项目契约）**

- 你指望 linter 检查规则是否合理、测试是否真的在验证行为：它只查结构、占位符、路径、命令是否存在、密钥和文件大小，不查语义质量。
- 你想要统计显著的收益结论：作者自己的 A/B 只有 5 次/条件、一个任务、一个小仓库，而且只测了 Claude Code。
- 你想照 README 手写 Cursor / Copilot 的配置：原文只把它们列在「读 AGENTS.md 的工具名单」里，没有配置步骤，也没有实测。
- 你不接受 Python 3.9+，或者不想维护一份会随项目演进的契约。

**范围说明**：原有调研来源在子智能体、动态工作流、Agent Teams、MCP 四节被截断，本手册对这四项只写「什么时候用 / 什么时候跳过」的判定，不给配置步骤。提交门禁做法 A 的来源只有一段第一人称口述，没有代码、没有匹配模式、没有量化数据；第 11 步会逐条标出哪些是实现细节、哪些只是作者主张。文件大小门禁用到的来源是一条推文，只给出 5,000 令牌阈值、bytes/4 估算、只查暂存文件、忽略锁文件和生成文件、错误信息给拆分说明；没有完整钩子代码、框架配置或效果数据，本手册只把它当低成本试验，不当作已验证结论。MyAgent 材料只有仓库 README，未核对源代码，且它的「怎么试、怎么验证」一节在材料里被截断。测试规则材料只有一条推文，只完整给出 7 条中的第 1 条。项目契约材料来自 AntoGA/agents-contract 的 README，约 40 stars、单人维护、俄文，A/B 日期写作 18.10.2026，无法核实，可能是笔误。Ryugi 材料只有 README，47 stars，未验证实际安装后的行为；它是 Superpowers v7.0.0 的 fork，原文没有量化效果数据，以下相关步骤都当小范围试验。

## 前置条件

**Claude Code 路线**

- 系统：macOS / Linux / WSL。Windows 用官方 setup 指南里的 PowerShell 或 CMD 命令。
- 备选安装方式：Homebrew、WinGet、npm；npm 方式要求 Node.js 22+。
- 一个 Anthropic 账号，Pro、Max 或 API key 都可以。
- 项目里可写 .claude/ 目录。
- 如果抄仓库里的 notification.py hook，需要本机有 uv，且 uv 在 PATH 上。
- 提交门禁：一个 git 仓库，且 pre-commit 机制可用：.git/hooks/pre-commit，或在 pre-commit 框架里配置。
- 提交门禁：确认 agent 能读到 hook 的失败输出。来源只说 inject a prompt，没说明注入是走 hook 输出还是走某个 agent harness 的接口，这一条必须先在你的工具链里验证。
- 版本差异用前自己核：auto 成为交互式终端和 VS Code 会话的内置启动模式是 v2.1.283 及以后；/effort ultracode 保留你已有的 effort 等级是 v2.1.284+。

**Ryugi 路线**

- 使用受支持的编码智能体 harness；同时用多个 harness 时，每个里面分别安装。
- 在 Claude Code 里用 plugin marketplace 和 plugin install 安装。
- ryugi-artifacts 需要 Node.js；不用 artifacts 预览可不跑它。
- 项目最好已有设计系统、verify、ship 等自有技能；原文说项目自己的技能在对应步骤优先。
- 需要人批准 spec、在浏览器中通过或拒绝 UI，并最终由人落地。
- Cursor 需把该仓库添加为本地插件源，OpenCode 需按 .opencode/INSTALL.md 安装；原文没有给出这两者的完整命令。

**MyAgent 路线**

- Python 3.11+、macOS / Linux、Git；ripgrep 可选但推荐。
- 一个 OpenAI-compatible 或 Anthropic-compatible 的模型接口：key、base URL、model 名。
- .env：项目会自动读取当前目录或父目录中的 .env。
- 想让自进化自动写入 skill，需要当前权限模式允许写文件；README 推荐 --accept-edits。

**测试规则**

- 项目已有可运行的测试框架与测试命令。
- 仓库根目录已有或可新建 AGENTS.md。
- 使用的编码代理会读取 AGENTS.md 作为上下文。
- 代理有读写代码与测试文件的权限。

**项目契约与开机自检**

- 一个 git 仓库。
- Python 3.9+；linter 零依赖，macOS / Linux / Windows 通用。
- 接 SessionStart 钩子需要 Claude Code；Windows 上没有 Git Bash 时，用仓库里的 PowerShell 变体。
- 接 CI 需要把仓库里的 .github/workflows/agents-lint.yml 放进项目；README 没有贴出其具体内容，不能照 README 手写。
- --check-commands 要求命令已在 PATH 中；-r 需在仓库根运行。

**文件大小门禁**

- 一个 git 仓库，且已有或允许加入预提交钩子。
- 钩子能取到本次暂存文件列表。
- 你能维护排除列表，至少排除锁文件和代码生成文件。
- 你接受 bytes/4 只是估算，不是精确 token 计数。

## 操作步骤

### 1. 安装（Claude Code）

前提：macOS / Linux / WSL。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

这是原文推荐的 native 安装方式，会在后台自更新。预期结果：claude 命令可用。

Windows 用官方 setup 指南里的 PowerShell 或 CMD 命令；备选 Homebrew、WinGet、npm：

```bash
npm install -g @anthropic-ai/claude-code   # 需要 Node.js 22+
```

### 2. 认证

```bash
claude
```

首次运行会打开浏览器登录 Anthropic 账号。预期结果：会话可用。之后可以：

- 会话内：/login 重新认证，/logout 登出。
- shell 里：claude auth login|status|logout。

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

生成项目级指令文件，Claude 每次会话都会读。原文的关键提醒：CLAUDE.md 会成为 prompt 的一部分，所以要像维护常用提示词一样反复迭代，不要一次性堆一大堆内容就不再管。

预期结果：项目约定写进了 CLAUDE.md，而且你会隔一段时间回来改它。

与第 11 步的关系：CLAUDE.md 适合放偏好和背景这类主观约定；能被模式匹配判定的硬约束，更适合搬到提交门禁。与第 17 步的关系：如果采用五段式契约，CLAUDE.md 应只写 @AGENTS.md 一行，避免两份规则漂移。

### 5. 先决定这次要不要调 effort

原文的心智模型：effort 改变的是思考深度、工具调用意愿、回答长度、以及持续推进多步工作的执着程度；更高不等于更聪明，上下文质量往往更重要。

```bash
# 仅本轮：加一个上下文内提示，不改变 API effort
> ultrathink — design the migration strategy

# 仅本会话：不带参数是滑块，带参数是指定等级
/effort xhigh
/effort ultracode               # 自动多智能体工作流；保留你的 effort 等级（v2.1.284+）
/effort auto                    # 重置为模型默认

# 所有会话（low/medium/high/xhigh）：在 .claude/settings.json 的 effortLevel 设为 high
# max 不能存在这里；ultracode 有自己的 ultracode 设置。
```

等级怎么选（原文建议）：

- low：你在实时操控的快速查询，例如改文件名、简单 grep。
- medium：日常编码、小重构、计划明确的自主会话。
- high：多文件重构、复杂调试。
- xhigh：长时间自主 agent 会话。
- max：只用于架构、微妙 bug、安全评审这类真难的问题，且仅限单会话。

API 认识 5 个等级（low 到 max，默认值取决于模型），Claude Code 在其上加了 ultracode 开关。原文还推荐一个模式：用 Opus 规划、用 Sonnet 执行。

预期结果：你用 /effort 能在自己环境里看到当前等级，而不是照抄原报告里那串按模型分的默认值。

### 6. 用「五个扩展点」对照表决定你要建什么

先判断该用哪个，再动手建。原文的对照表：

| 工具 | 什么时候用 | 什么时候跳过 | 存放位置 |
|---|---|---|---|
| Skills（slash 命令） | 同一个 prompt 或流程重复 ≥3 次 | 一次性任务 | .claude/commands/*.md |
| Hooks | 想让代码在工具调用、会话开始等时刻自动跑，含提交时门禁 | 只想手动触发 | .claude/settings.json |
| Subagents | 子任务大到需要独立的隔离上下文 | 任务在主会话里放得下 | .claude/agents/*.md |
| Workflows | 需要的智能体数量超过一次对话能协调的量 | 两三个子智能体就够 | .claude/workflows/*.js |
| MCP servers | 需要 Claude 调用外部工具 | 数据都在本地文件里 | 按项目配置 |

原文强调这五个可以组合，多数打磨过的配置会用到其中 2–3 个。预期结果：你说得出自己这次要用哪 2–3 个，以及另外几个为什么跳过。

### 7. 三条可直接照做的工作流

**做法 A：Explore → Plan → Code → Commit**（什么时候选：复杂问题）

1. Explore：读相关文件、图片、URL，用子智能体做验证。先不要写代码。
2. Plan：让 Claude 出计划。要更深推理就在这句 prompt 里加 ultrathink。原文明确：Claude Code 只识别 ultrathink，think、think hard、think harder 会被当普通提示文本透传。计划可选保存下来。
3. Code：实现方案，边做边判断合理性。
4. Commit：提交、开 PR、更新 README/changelog。

权限模式（Shift + Tab 循环）：共六种：default（界面标为 Manual）、acceptEdits、plan、auto、dontAsk、bypassPermissions；Shift + Tab 在 default → acceptEdits → plan 间循环，可用时后面还有 bypassPermissions 和 auto（dontAsk 从不进入循环）。v2.1.283 及以后，auto 是交互式终端和 VS Code 会话的内置启动模式，可用 --permission-mode 或 permissions.defaultMode 改。

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

原文标注：迭代显著提升产出质量，通常 2–3 轮就够。

预期结果：A 走完之后你手上是「计划 + 提交」，不是一堆没提交的改动；B 的测试在实现之前真的红过一次；C 的截图和稿子对得上。

### 8. 从示例仓库按文件拷贝现成配置（别整目录拷）

```bash
git clone --depth 1 https://github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know /tmp/cc-guide
cp -r /tmp/cc-guide/.claude/commands/pr.md  your-project/.claude/commands/   # take what you want
```

仓库里可抄的东西：

| 路径 | 得到什么 | 什么时候抄 |
|---|---|---|
| .claude/commands/ | 7 个 slash skill：/pr、/review、/tdd、/test、/five、/ux、/todo | 想要 PR 规范和评审严谨度但不想自己写 prompt |
| .claude/skills/ | 一个 Agent Skill /claude-md-review，审计 CLAUDE.md 的含糊表述、死路径、臃肿 | 想要 frontmatter 契约的范例 |
| .claude/agents/ | 5 个子智能体，外加 specialized-agents/ 里 10 个角色提示词 | 不想自己写角色提示词 |
| .claude/workflows/ | 一个动态工作流 /stale-docs-audit | 想先读一个真实脚本再自己写 |
| .claude/hooks/ | 一个 Python hook notification.py，Claude Code 需要你输入时出声提醒 | 想要生命周期自动化，需要 uv |
| .claude/settings.json | 权限 + hook 接线 | 抄 hooks 时一起抄 |

安全警告：Skills、hooks、agents、workflows 都是以你的权限运行的、可执行的指令，包括来自这个仓库的。要一个一个文件复制并阅读，就像 source 一个 shell 脚本之前先读它一样，不要 cp -r 一整个没打开过的 .claude/。

预期结果：你的项目里只多了你读过的文件。

### 9. 三分钟做出第一个 slash skill

前提：项目里可写 .claude/。

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

预期结果：敲 /analyze 就能跑这段提示词。

升级为 Agent Skill 的方式：把它移到 .claude/skills/analyze/SKILL.md，加上 name/description frontmatter。原文明确两种格式现在是同一套系统：.claude/commands/deploy.md 和 .claude/skills/deploy/SKILL.md 都产生 /deploy。区别在于 Slash skill 要你主动敲 /，Agent Skill 只预加载元数据、在描述匹配任务时可由 Claude 自动调用、正文按需读取。

命名冲突解析顺序（先匹配先赢）：企业 > 个人 ~/.claude/ > 项目 .claude/ > 插件（命名空间为 /plugin-name:skill-name）> 内置。本地 skill 会替换同名的内置 skill，或在本地终端会话里替换内置命令，但不替换它的别名；插件 skill 因为带命名空间，会同时加载。

### 10. 按需配 Hooks

前提：你能接受「自动执行的 shell 命令」这件事。

Hooks 是 Claude Code 生命周期上的可编程检查点，脚本检查拟执行的动作并返回 allow / deny / modify。原文「最先说服团队的三类用途」中，本次抓取到的完整两条是：保存后自动格式化；拦截敏感路径。第三类用途来自原有调研：提交时门禁，在 commit 时刻检查 diff，发现违反架构约定的写法就让提交失败，并把纠正指令写进失败输出。文件大小门禁也做成提交时的门禁，做法见第 11 步做法 C。

预期结果：格式化不再靠人提醒；.env 这类路径即使 Claude 想动也动不了；第 11 步配好后，违反硬约束的提交进不去。

### 11. 把一条硬约束做成提交门禁（做法 A / 做法 B / 做法 C）

来源背景（Geoffrey Huntley，经 Simon Willison 博客收录）：智能体不按约定用他的 diagnostics 库时，靠改 AGENTS.md 这类指令文件不管用——仍有落差，而且会漂移；他改成写 pre-commit hook，检查 git diff 里有没有直接调用 observability 模块、绕过 diagnostics 模块，有就 fail 掉提交，并注入「请使用 diagnostics 库」的提示，效果「立刻变成 ten out of ten」。这段是口述，来源没有给出 hook 代码、匹配规则、提示词原文或任何数据。

**做法 A：提交门禁 + 失败提示自纠**（什么时候选：规则能被 diff 文本模式判定，且你希望它必须发生）

前提：第 1 条规则可判定；仓库有可用 pre-commit 机制；agent 能读到 hook 的失败输出。

1. 选一条可判定的硬约束。来源的例子是「不允许绕过 diagnostics 模块直接调用 observability 模块」。前提：这条约束必须能被 diff 文本的模式匹配判定，而不是「代码写得好不好」这类主观标准。
2. 写 pre-commit hook，读取已暂存的 diff。在 .git/hooks/pre-commit 或 pre-commit 框架配置里，取 git diff --cached 的文本作为输入。实现来源未给出。
3. 用模式匹配找出违规调用。实现来源未给出；你需要在本地补齐匹配模式，先用误报可接受的小范围规则试。
4. 失败时非零退出，并把给 agent 的纠正提示写进输出。这是这套做法的核心机制：hook 的失败输出就是 agent 看到的反馈，等于 inject a prompt。注意来源没说明注入是走 hook 输出还是走某个 agent harness 的接口，按你的工具链确认。
5. 让 agent 重跑直到提交通过，而不是人去手工改。门禁失败 → 提示注入 → agent 改写 → 再提交，循环收敛。
6. 把规则本身当代码维护。规则写在 hook 里，显式、可版本化、可 review，不像 AGENTS.md 的散文那样漂移；变更规则时同步更新 hook 与匹配模式。

预期结果：违规提交进不去；agent 读到失败输出后自己改写再提交。

**做法 B：只靠提示文件提醒（AGENTS.md / CLAUDE.md）**（什么时候选：约束是主观的，或只是偏好）

1. 把约定写进 CLAUDE.md（见第 4 步）或 AGENTS.md，让 agent 每次会话读到。
2. 靠上下文里出现这条指令来约束行为。

代价（来源主张，无数据）：指令与实际做法之间有落差，而且会漂移。

**做法 C：文件大小门禁**（什么时候选：你想低成本阻止代理提交过大的单文件）

来源背景：@mattpocockuk 推文建议在提交前检查暂存文件，按 bytes/4 估算 tokens，单文件超过 5,000 就阻止提交；只查暂存文件，忽略锁文件、代码生成文件等非代理编写文件；错误信息里要给出明确的文件拆分说明。作者称这是其代码库中「最简单的投资」，但原文没有完整钩子代码、具体框架配置或效果数据。

前提：已有或允许加入预提交钩子；主要约束代理编写或修改的代码文件；接受 bytes/4 是近似估算。

1. 在预提交钩子里只取本次暂存文件，不对全仓库所有文件运行。示意命令如下，来源未给出具体钩子代码：

```sh
# 示意：取本次新增或修改的暂存文件；具体框架写法自行适配
git diff --cached --name-only --diff-filter=ACM
```

预期结果：钩子拿到的列表只包含本次要提交的文件。

2. 维护排除列表，至少排除锁文件和代码生成文件。原文明确要求忽略非代理编写的文件，如锁文件或代码生成文件；它没有给出具体文件名模式，需要你按项目自定。

3. 对每个待检查文件按字节数估算 tokens：

```text
tokens = bytes / 4
```

4. 当任一暂存文件的估算 tokens 超过 5,000 时，阻止提交，以非零退出。

5. 在错误信息中写清该文件应如何拆分。原文没有给出提示词模板，你要自己写明可执行的拆分建议，例如按职责拆成多个小文件后再提交。

6. 先只观察这道门禁，不动其他提交规范。重点看误报：正常文件是否被频繁拦截；代理收到拆分说明后是否减少单文件过大问题。二进制文件、超大文件、不同编码如何处理，原文没有说明，需要你先定规则或排除。

预期结果：超限的暂存文件被阻止提交；错误信息能让提交者或代理知道怎么拆；锁文件和生成文件不会被误拦。

**怎么选**

- 约束能被 diff 模式判定、并且你希望违规提交直接进不去 → 做法 A。
- 约束是主观的，例如命名风格、抽象设计，或者只是偏好 → 做法 B。
- 你想低成本阻止代理提交过大的单文件，且能接受 bytes/4 近似估算 → 做法 C。
- 做法 A 和 C 可以并存：A 管语义模式，C 管文件规模。两者都是提交时触发的 hook，只是规则不同。
- 门禁管硬约束，提示文件管偏好与背景。但对同一条硬约束，来源建议不要在 AGENTS.md 里重复，试用期故意不重复，才看得出门禁有没有起作用。第 17 步的五段式契约是另一层：它管项目事实与结构性约定，不替代 hook 门禁；同一条硬约束如果同时写进 hook 和 AGENTS.md，要接受两份来源可能漂移。
- 做法 C 与第 17 步的 W101 不是一回事：W101 是 AGENTS.md 超过 32 KiB 时告警，做法 C 是代码文件按 bytes/4 估算超过 5,000 tokens 时阻止提交，不要混用。

### 12. 装 MyAgent 并跑通第一条任务（这条路线的前置步骤）

前提：Python 3.11+、macOS / Linux、Git；已有一个模型接口（key / base URL / model 名）。下面的命令、配置与判断规则全部照抄自仓库 README。

12.1 装依赖（在项目目录内）

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

12.2 配置 .env（项目会自动读取当前目录或父目录中的 .env），三种写法任选：

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

协议判断规则：API 或 --api-base 路径包含 /anthropic 时按 Anthropic-compatible 调用；否则有 OpenAI base URL 时按 OpenAI-compatible 调用；--model 会覆盖 .env 中的 MODEL。

12.3 启动并跑一条任务

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

12.4 先跑不调用模型的测试

```bash
pip install -r requirements.txt pytest
python -m pytest -q
```

README 称测试覆盖权限模式、危险命令检测、权限规则优先级、编辑前必须先读和 mtime 校验、Skill 加载优先级与 BM25 检索；CI 在 Python 3.11 和 3.12 上运行。注意：测试不调用模型，全绿不等于端到端效果已被验证。

### 13. 用 Plan Mode 做只读计划审批

前提：第 12 步已跑通。README 明确 Plan Mode 适合重构、复杂修复和多文件修改：先只读分析和写计划，用户审批后再执行。

```bash
python3 -m agents.main --plan "分析 Skills 检索逻辑应该如何优化"
```

REPL 内也可以直接输入：

```text
/plan
```

关键约束：Plan Mode 下会阻断写操作和 Shell。预期结果：你拿到的是只读分析加一份计划，在你审批之前它动不了文件。

配套会话能力：会话自动保存，python3 -m agents.main --resume 恢复最近会话；/compact 做上下文压缩；大工具结果会被截断或持久化，避免单次结果把上下文撑爆。

怎么选：重构、复杂修复、多文件修改走这条；小改动仍走第 7 步的做法 A/B/C。

### 14. 把反馈自动沉淀成技能（Skills 自进化）

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

BEAR_AUTO_SKILL_EVOLUTION 默认已开启；要显式写进 .env 就是：

```env
BEAR_AUTO_SKILL_EVOLUTION=1
BEAR_AUTO_SKILL_TARGET=project
```

目标选 project 还是 user：BEAR_AUTO_SKILL_TARGET=project 表示自动新增的 Skill 写入当前项目；想沉淀为所有项目共享的个人 Skill 就写 BEAR_AUTO_SKILL_TARGET=user。对应落盘路径：

```text
project: <project>/.bear/skills/<skill_name>/SKILL.md
user:    ~/.bear/skills/<skill_name>/SKILL.md
```

给什么样的反馈：只沉淀稳定、明确、未来同类任务仍适用的规则。

不适合沉淀的例子：

```text
帮我写一篇 500 字政府报告。
```

适合沉淀的例子：

```text
以后写政府报告、工作汇报、调研材料时，默认先给可直接使用的初稿，不要连续追问；结构按标题、背景、主要情况、问题分析、工作举措、下一步计划组织，语言要正式克制。
```

适合演化已有 Skill 的例子：

```text
以后这类政府报告还要加入关键数据指标，不能只写概念性表述。
```

自进化链路（README 描述）：第 N 轮用户任务 → Agent 输出结果 → 保存 pending extraction window；第 N+1 轮用户反馈 → 合并进上一轮 window → online_ingest() → Extractor 抽取候选 Skill → Maintainer 判断 add / merge / discard → create_skill_file() 或 evolve_skill_file() → 写入 SKILL.md → 记录 provenance、usage stats 和版本快照。

对应核心文件：agents/agent.py、agents/online_skill_evolution.py、agents/skills.py、agents/skill_evolution.py。审计产物：.bear/skill-evolution/usage.jsonl、online_provenance.jsonl、online_skill_provenance.json、skill_usage_stats.json、history/。

预期结果：给出一条明确反馈后，.bear/skills/ 下出现或更新了 SKILL.md，并且能在审计产物里查到它的来源与版本。

### 15. 两条路线怎么选

| 维度 | Claude Code 路线 | MyAgent 路线 |
|---|---|---|
| skill 从哪来 | 你手写 .claude/commands/*.md 或 .claude/skills/*/SKILL.md | Runtime 从反馈中抽取候选，自动 add / merge / discard 后写入 .bear/skills/ |
| 触发方式 | Slash 主动敲 /；Agent Skill 按 description 匹配自动调用 | 检索后调用，README 称含 BM25 检索 |
| 计划与执行 | 自己按三条工作流走，权限模式靠 Shift + Tab 切 | 内建 --plan / /plan，只读，阻断写操作和 Shell |
| 硬约束 | pre-commit hook 门禁，必须发生；或提示文件提醒，会漂移 | README 未提等价的门禁机制 |
| 模型层 | Anthropic 账号 | 自备 Anthropic-compatible 或 OpenAI-compatible 接口 |
| 证据强度 | 有可核对的仓库文件与路径；行为主张仍属作者主张 | 只有 README；无 benchmark、无前后对比、未展示实际生成的 SKILL.md |

怎么选：

- 你要的是「违规提交进不去」这种必须发生的约束 → 走 Claude Code + hook 路线，别指望把门禁挪进 runtime。
- 你要的是「反馈别靠人手工整理」 → 按第 12–14 步小范围试 MyAgent，只拿它验证自进化是否真的沉淀出你要的规则。
- 两条可以并存：MyAgent 用来跑只读计划与反馈沉淀试验，硬约束仍放在 git 门禁里——门禁在 git 层，与用哪个 runtime 无关。
- 不要混目录：.claude/skills/ 与 .bear/skills/ 是两套系统的路径，各管各的。

### 16. 用 AGENTS.md 约束「测试凑绿」，并用空实现检查自证

来源背景：一条推文主张做 vibe 编码时应在 AGENTS.md 中加入 7 条规则，用于约束 AI 代理行为。采集到的正文只完整给出第 1 条，第 2 条只出现编号 2. 就中断，其余 6 条内容未知。已给出的第 1 条是：绝不编辑、跳过或删除测试来让测试通过；对自己编写的每个测试，都要确认：如果被测代码什么都不做，这个测试会失败；如果它仍然会通过，就重写这个测试。作者给出的理由是主张，非数据：一个绿色的测试套件是代理最容易伪造的东西。

前提：项目已有可运行的测试框架与测试命令；仓库根目录已有或可新建 AGENTS.md；使用的编码代理会读取 AGENTS.md 作为上下文；代理有读写代码与测试文件的权限。

1. 确认项目的测试命令可正常执行：

```bash
# 替换为本项目实际命令
npm test
# 或
pytest -q
```

预期结果：命令能跑起来，输出当前测试结果。

2. 在仓库根目录的 AGENTS.md 中追加规则块（可直接抄下面的内容）：

```markdown
## Testing rules

1. Never edit, skip, or delete a test to make it pass.
2. For every test you write, verify that it FAILS if the code under test does nothing.
   If it still passes, rewrite the test.
```

预期结果：代理每次会话都能读到这两条规则，新写测试时受其约束。如果同时采用第 17 步的五段式契约，这两条可以放进 Boundaries 或 Lessons，或保留为单独的 Testing rules 小节；linter 只检查结构，不会验证这两条是否被遵守。

3. 让代理新写一个测试后，做一次「空实现检查」：把被测函数临时改成什么都不做，例如直接 return None 或提前返回，重跑该测试。

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

原文未给出上述命令，命令是按规则意图补的最小可执行检查方式，不是推文原文。预期结果：diff 里没有「为了变绿而改测试」的改动；有的话回退并要求代理重写测试。

6. 与第 11 步的关系：这条规则目前走的是做法 B（写进提示文件），不是做法 A（hook 门禁）。推文原文就是把规则写进 AGENTS.md；本手册没有它对应的 hook 实现。若想让它必须发生，需要自己按第 11 步做成能被 diff 判定的门禁——但「测试是否真的在验证行为」通常不是纯文本模式能判定的，空实现检查需要实际运行测试，不是 diff 匹配能覆盖的。

预期结果：代理提交里不再出现改测试凑绿；新写的测试在空实现下确实会失败；你在合并前抽查 diff 时能看到代理没有动测试文件来凑绿。

### 17. 把 AGENTS.md 做成五段式契约，用 linter 和 SessionStart 钩子防漂移

来源背景：AntoGA/agents-contract 把项目说明书工程化成三部分：五段式 AGENTS.md 契约、零依赖 linter、Claude Code SessionStart 钩子。作者称整套约一小时；A/B 只有 5 次/条件、一个任务、一个小仓库，且只测了 Claude Code，所以当小范围试验，不直接全员采用。

前提：一个 git 仓库；Python 3.9+；接钩子需要 Claude Code；Windows 上没有 Git Bash 时用仓库里的 PowerShell 变体。

**做法 A：只上 AGENTS.md + linter（跨工具，先验证契约本身）**（什么时候选：你想先让规则可检查，不想接会话钩子）

1. 复制模板与脚本。macOS / Linux 用 cp：

```bash
git clone https://github.com/AntoGA/agents-contract /tmp/agents-contract
cp /tmp/agents-contract/templates/AGENTS.md /tmp/agents-contract/templates/CLAUDE.md .
mkdir -p scripts .claude
cp /tmp/agents-contract/scripts/* scripts/
# 如果 .claude/settings.json 已存在，不要覆盖它，而是手动把 hooks 块加进去
if [ ! -f .claude/settings.json ]; then cp /tmp/agents-contract/.claude/settings.json .claude/; fi

# 编辑 AGENTS.md，把所有 <...> 填掉
python3 scripts/agents_lint.py   # 应输出“错误 0 条”
```

Windows 用仓库 README 的 PowerShell 命令，并同样注意：已有 .claude/settings.json 时不要覆盖，手动合并 hooks 块。预期结果：模板和 linter 脚本进入项目，AGENTS.md 还有待填的占位符。

2. 填写 AGENTS.md 的五个必填分节：Project（是什么、什么栈）、Commands（安装、构建、测试；测试必须写成 - Test: `...` 这样一行）、Conventions（代码与提交约定）、Boundaries（不许碰什么：生成物、目录、依赖）、Definition of Done（怎样算完成）。可选 Lessons 分节，把智能体每次犯错写成一行。把 <...>、TODO、TBD、FIXME 全部清掉，不要写入任何密钥。预期结果：契约内容具体到能让另一个工具照着做，而不是口号。

3. 每次跑 linter 直到零错误：

```bash
python3 scripts/agents_lint.py                 # 检查当前目录的 AGENTS.md / CLAUDE.md
python3 scripts/agents_lint.py --strict        # 警告也算失败
python3 scripts/agents_lint.py --check-commands # 检查命令是否在 PATH 里
python3 scripts/agents_lint.py --json          # 机器可读输出
python3 scripts/agents_lint.py -r              # 单仓多包：递归检查子目录下所有 AGENTS.md / CLAUDE.md
```

退出码：0 通过，1 有错误（--strict 下警告也算失败），2 调用错误。前置条件：--check-commands 依赖命令已在 PATH 中，-r 需在仓库根运行。预期结果：零错误；--strict 下也没有你不想接受的警告。

4. 让 Claude Code 读同一份文件：CLAUDE.md 的内容就是一行 @AGENTS.md。若两个文件都在但 CLAUDE.md 不导入 AGENTS.md，会得到 W070 警告（两份规则会漂移）。预期结果：没有 W070，规则只有一个来源。

5. 接 CI：把仓库里的 .github/workflows/agents-lint.yml 放进项目。原文说该 CI 在 Ubuntu / Windows / macOS 上跑 linter 测试并做校验；但 README 没有贴出 workflow 的具体内容，必须直接用仓库里的文件，不能照着 README 手写。预期结果：推送时 CI 跑 lint，--strict 下警告也能阻断。

6. 建立维护循环：每次智能体犯错，就在 Lessons 里加一行。原文把这条列为长期收益最大的机制，也是契约不腐坏的配套：linter 只保证结构与事实（占位、路径、命令、密钥、大小）不退化，内容靠 Lessons 增长。预期结果：契约随真实失败变厚，而不是一次性写完就烂掉。

**做法 B：再加 SessionStart 钩子（Claude Code 开机自检）**（什么时候选：你用 Claude Code，想让会话开始或恢复时自动检查环境并跑测试）

1. 复制 .claude/settings.json，用 env 指定安装/测试命令。原文示例的含义是：AGENTS_SETUP 设为 pip install -e .，AGENTS_TEST 设为 python -m pytest -q。AGENTS_SKIP_TESTS=1 可关掉测试。Windows 上没有 Git Bash 时，改用 .claude/settings.windows.example.json；它的命令用相对路径，钩子从项目根启动，因此在任何 shell 下都能跑。预期结果：会话开始或恢复时自动跑 linter、装依赖、跑测试，输出进上下文；钩子永远退出 0，不阻塞会话。

**怎么选**

- 只想让规则可检查、跨工具复用、接 CI → 做法 A。
- 你用 Claude Code，并且想让每次会话开头就知道「契约是否合规、改动前测试是否通过」 → 做法 A + B。
- 你不用 Claude Code → 跳过 B，但 A 的 AGENTS.md 与 linter 仍可用；原文只在工具名单里提到 Cursor / Copilot，没有配置步骤，不要据此写它们的操作。
- 与第 11 步的关系：第 17 步的 linter 查结构、路径、命令、密钥和大小，不查「代码是否绕过了某个库」这类语义；硬约束仍按第 11 步做 hook 门禁。与第 16 步的关系：linter 不验证「空实现下测试必须失败」，测试规则仍要单独执行空实现检查。

预期结果：AGENTS.md 零错误、CLAUDE.md 只有 @AGENTS.md、CI 绿；接钩子后，会话开头能看到 lint / 安装 / 测试结果。

### 18. 用 Ryugi 走「先规格、再 TDD、最后 UI 验收」（可选工作流）

来源背景：Ryugi 是一个面向编码智能体的软件开发工作流，起始于 Superpowers v7.0.0 的 fork，并被重塑为单一工作流。流程是：Idea → brainstorming → artifacts（artboard/document/html）→ Approved spec → executing-specs → per-task TDD → one fresh review → verifying-ui → 人工落地。原文提供安装命令、CLI 命令、工作流步骤和安装验证方法，但没有量化效果数据，只有作者主张；仓库 47 stars。

前提：使用受支持的 harness；同时用多个 harness 时分别安装；ryugi-artifacts 需要 Node.js；项目自己的设计系统、verify、ship 等技能在对应步骤优先。

1. 在 Claude Code 安装：

```text
/plugin marketplace add Innei/ryugi
/plugin install ryugi@ryugi-dev
```

原文还给出部分 harness 命令，使用前按对应 harness 核对：

```text
agy plugin install https://github.com/Innei/ryugi
devin plugins install Innei/ryugi
droid plugin marketplace add https://github.com/Innei/ryugi
droid plugin install ryugi@ryugi
gemini extensions install https://github.com/Innei/ryugi
/plugins install https://github.com/Innei/ryugi
pi install git:github.com/Innei/ryugi
qwen extensions install Innei/ryugi
hermes plugins install Innei/ryugi --enable
muse plugins install ./
muse plugins approve ryugi
```

Cursor 需把该仓库添加为本地插件源，OpenCode 需按 .opencode/INSTALL.md 安装；原文没有给出这两者的完整命令，不要照猜。预期结果：安装后对应 harness 里能看到 Ryugi 工作流。

2. 用干净会话验证安装。发送：

```text
Let's make a react todo list
```

预期结果：正常工作流应在写任何代码前触发 brainstorming。若没有触发，先停下检查安装，不要继续往下写。

3. 进入 brainstorming。让 agent 先问「你真正想做什么、为什么」，一次一个问题；当工作跨模块、涉及架构，或你要求 upfront design 时，问题转入文档，按轮次回答。视觉方案在 Artboard 上一轮轮给出选项；小改动在聊天中确认，项目则产出 builder 可据此实现的设计文档。预期结果：你在写代码前先对齐需求和视觉方向。

4. 批准规格并选择执行方式。批准 spec 后，executing-specs 激活。若你明确说 `just code it`，则跳过该流程直接写代码。预期结果：默认路径是先有已批准 spec，再进入实现；只有你明确要求时才直接写代码。

5. 执行规格。agent 把 spec 切成任务，每个任务在 TDD 下实现；用 ledger 跨 compaction 记录每个判断（ruling）；完成后做一次 fresh review，然后停下并报告如何落地。默认 squash，也支持 rebase、PR、keep；原文明确 never a merge commit。预期结果：每个任务有实现记录，最后只有一次全新复审，并给出落地方式。

6. 每个任务走 TDD。RED-GREEN-REFACTOR：先写失败测试，看它失败，写最小代码，看它通过，提交。预期结果：每个任务都有「失败测试 → 通过」的记录，而不是先写实现再补测试。

7. 遇到 bug 先根因。systematic-debugging 在出现 bug 或意外行为时激活，要求先找根因再修。预期结果：修复前能说清根因，不是靠试错把现象压掉。

8. UI 变更做验收。verifying-ui 在构建结果或修复改变可见界面时激活。把真实截图和录屏与已批准设计（或 before/after）并排放在 Artboard，在浏览器中逐组 pass 或 reject；被拒绝的修到全部通过。预期结果：UI 验收有截图或录屏证据，不是只看代码说完成了。

9. 需要隔离时用 worktree。using-git-worktrees 按你声明的偏好执行；没有偏好时，executing-specs 默认就地工作，只有当工作会与其他 agent 冲突时才开 worktree，例如文件有他人未提交修改、路径被其他 agent 探索、lockfile、切分支或仓库级变更。预期结果：没有冲突风险时不额外开 worktree；有冲突风险时隔离。

10. 浏览项目产物：

```bash
npx ryugi-artifacts
npx ryugi-artifacts /path/to/project
npx ryugi-artifacts --no-open
```

该命令读取项目内 .ryugi/artifacts/，提供预览、类型过滤、标题/id 搜索和排序；同一 CLI 也支持 start、stop、publish。预期结果：你能查看 spec、Artboard、报告等产物，而不是只靠聊天记录。

**怎么选**

- 你要先对齐需求、先批准 spec，再逐任务 TDD，并且有 UI 验收需求 → 试 Ryugi。
- 你只处理小改动，或没有测试和 UI 验收 → 仍用第 7 步的做法 A/B/C，别为小任务套重流程。
- 你已经在用第 7 步的手工工作流 → 二者选一条，不要同时跑两套规格/计划流程；Ryugi 是把类似流程打包成技能，不是额外的 runtime。
- 你想把 Ryugi 叠加在 Claude Code 上 → 按第 18 步安装；它与第 15 步的 Claude Code / MyAgent 路线不冲突，但 MyAgent 没有等价门禁。
- 原文称技能会自动触发、可两小时自主推进且不问 should I continue，这些是作者主张，没有数据；试用时按第 2 步的干净会话验证和人工抽查为准。

预期结果：小任务走完一条完整链路后，你手上有已批准 spec、每任务红绿记录、一次 fresh review、UI 验收记录和落地方式报告；如果没有这些证据，先别扩大使用范围。

## 怎么判断变好了

**流程固化与工作流**

- 触发条件可观察：同一个 prompt 或流程重复 ≥3 次，就该去建 skill，而不是继续手打。
- Plan 阶段真的没写代码：Explore 阶段只读文件、出计划；ultrathink 只出现在需要更深推理的那句计划 prompt 上。
- TDD 的红过：测试在实现之前确实失败过一次，最后全绿才提交。
- 视觉迭代轮数：原文标注通常 2–3 轮就能对齐稿子。
- effort 的自检：别照抄默认值，用 /effort 在自己环境核对；发现自己在常规任务上想开 max 时，原文说约 80% 的情况正解在上游——更锋利的 CLAUDE.md、原子化的计划、点名的文件。
- 最小试用方式：先在自己的项目里小范围试，一次只引入一个扩展点。
- 试多久：视觉迭代以 2–3 轮为一轮试；effort 随时可以 /effort auto 重置回模型默认。

**先规格后实现（Ryugi）**

- 是否在写代码前产出并批准 spec。
- 每个任务是否有「失败测试 → 通过」的记录。
- ledger 是否记录关键判断，避免跨 compaction 丢失。
- 是否只做一次 fresh review，而不是反复零散复审。
- UI 验收的 pass/reject 轮次和返工次数；是否有截图或录屏与已批准设计并排比对。
- 人工干预次数，尤其是否频繁被问 should I continue。
- 最终落地方式是否符合你的选择。
- 最小试用：在 Claude Code 按第 18 步安装，开干净会话发送 `Let's make a react todo list`，确认写代码前触发 brainstorming；然后选一个规模小、带测试和 UI 验收需求的任务，完整走一遍 brainstorm → 批准 spec → executing-specs → 每任务 TDD → fresh review → verifying-ui → 落地报告。
- 怎么判定：与同类任务不用该工作流的基线对比；若 spec 前置、红绿测试、UI 验收和复审减少了返工与遗漏，同时没有显著增加人工协调成本，再考虑扩大使用范围。
- 试多久：原文没有给出时长；以一个任务为一轮，先看是否减少返工和遗漏，不要把作者主张当效果证明。

**提交门禁**

- 违规提交率：hook 触发次数 / 总提交次数，看是否随时间下降。
- 首次提交即通过的比例：反映反馈是否有效，而不是反复来回。
- 每次触发后需要的修复轮数：轮数少说明失败输出里的提示写清楚了。
- 人在 review 中提出同类问题的次数：这是最终的业务指标，直接对应省了多少人工。
- 误报次数：频繁误报说明规则的模式化程度不够，应该先修规则，再判断方案价值。
- 门禁的最小试用：挑一条团队在 code review 中反复提出的硬约束，写一个 pre-commit hook 检测违规、失败输出写明应改成什么；让 agent 在正常提交循环里工作一段时间，期间不要额外在 AGENTS.md 里重复这条规则。
- 建议的对照：同一约束、同一类任务分两组——A 组只靠 AGENTS.md 提示，B 组用 hook 门禁 + 失败提示注入。
- 怎么判定：若 B 组违规提交率下降、人工 review 同类评论减少、误报可控，说明有效；若 hook 频繁误报，或 agent 读不到 / 读不懂失败输出而无法自纠，说明问题出在规则可判定性或反馈通道，先修这两个前提再谈收益。

**文件大小门禁**

- 钩子是否只在暂存文件上触发，是否确实忽略锁文件和生成文件。
- 超限文件是否被阻止提交，错误信息是否能让提交者或代理完成拆分。
- 误报是否可接受，是否出现正常文件被频繁拦截。
- 代理收到拆分说明后，是否能减少单文件过大问题。
- 团队是否认为该钩子降低了提交前检查成本。
- 最小试用：选一个由 AI 代理参与写码的代码库或分支，加入预提交钩子，只检查暂存文件；设置 5,000 令牌阈值；排除锁文件和代码生成文件；超限时阻止提交并输出拆分说明。先观察一段时间，不改动其他提交规范。
- 试多久：来源没有给出固定时长，以若干次提交为一轮先看误报和代理是否按提示拆分；不要把推文的点赞数当效果证据。

**反馈自动沉淀与只读计划**

- Plan Mode 是否真的只读：计划获批之前没有任何写操作或 Shell 执行。
- 自进化是否落盘：<project>/.bear/skills/<skill_name>/SKILL.md 或 ~/.bear/skills/<skill_name>/SKILL.md 出现或更新。
- 能不能查到来源与版本：.bear/skill-evolution/usage.jsonl、online_provenance.jsonl、online_skill_provenance.json、skill_usage_stats.json、history/。
- 沉淀质量只能人工抽查：README 没有命中率、误沉淀率，也没展示实际生成或合并出的 SKILL.md，所以要自己读一遍生成的 skill 是不是你要的那条规则。
- 最小试用方式：按第 12 步 12.1–12.2 装好并配好 .env；没有 Anthropic 接口时用 DeepSeek 这类 OpenAI-compatible 端点；跑 python -m pytest -q 确认权限模式、危险命令检测、编辑前必须先读与 mtime 校验、Skill 检索等基础行为。
- 截断说明：来源材料的这一节在「……Skill 检索等基础行为」处被截断，原本后面还有什么试用步骤，本手册不补写。
- 试多久：README 未给时间跨度。以「给一条可沉淀的反馈 → 看是否落盘 → 人工读一遍生成的 SKILL.md」为一轮，轮数自己定。

**测试规则与空实现检查**

- 代理提交中修改测试文件以使其通过的次数，越少越好。
- 新测试通过空实现检查的比例，越高越好。
- 因测试造假或无效测试而需要人工回退或返工的次数。
- 最小试用方式：只挑一个正在用编码代理的项目，在该项目的 AGENTS.md 中加入上面的 Testing rules 两条；用同一个代理完成若干次「写功能 + 写测试」的任务，每次对新增测试执行一次空实现检查。
- 试多久：持续一两周或若干个任务周期后汇总。
- 若原文其余 6 条后续可见，再用同样方式逐条小范围试，不一次性全部加入；不要凭标题补全。
- 注意：以上指标与试用方式是调研报告给出的可操作化验证建议，不是推文原文；原文只给出一个判据——新测试在「被测代码什么都不做」时必须失败，否则重写。

**项目契约与开机自检**

- linter 是否零错误：结构、占位符、测试命令、路径、密钥、文件大小都过；--strict 下没有你不想接受的警告。
- 是否只有一个规则来源：CLAUDE.md 只有 @AGENTS.md，没有 W070。
- CI 是否在三平台跑绿：Ubuntu / Windows / macOS 的 lint 都过。
- 会话开头是否有自检输出：接 SessionStart 钩子后，会话开始或恢复时能看到 linter、安装、测试结果；钩子不阻塞会话。
- 契约大小是否受控：W101 在文件超过 32 KiB 时告警（Codex 默认在此截断）；原文称典型契约在 1–4 KiB，应压在这个量级。
- linter 速度基线（来源数据，Python 3.13 / Linux / 4 vCPU / 本地盘 / 每档 200 次）：1.3 KiB 文件 check() 中位 0.21 ms、p95 0.36 ms，CLI 冷启动中位 50 ms；15.9 KiB 为 2.04 ms / 53 ms；31.9 KiB 为 3.91 ms / 56 ms；128 KiB 为 15.70 ms / 87 ms，随大小线性增长。加路径检查后在 31.9 KiB 为 7.85 ms；网络盘上路径检查明显变慢，可用 --no-paths 关掉。典型契约 1–4 KiB 本身耗时不到 1 ms，全流程几乎全耗在 Python 启动，约 50 ms。
- A/B 最小试用：用仓库的 bench/ab_test.py --runs 5（Claude Code headless claude -p，默认模型）先复现，再换成自己的 fixture 和任务。原文玩具仓库「增值税计算」含 3 个从任务描述看不出的陷阱：真实费率在 rates.yaml、invoice/generated/rates.py 是生成物不许手改；裸 unittest/pytest 会挂，只能 python3 run_tests.py；改完必须写 CHANGELOG.md。
- 来源给出的 A/B 结果（注意局限）：得分 4.8→5.0；测试通过 5/5=5/5；只改权威来源 5/5=5/5；生成物同步且未手改 5/5=5/5；新增测试 5/5=5/5；写 CHANGELOG 4/5→5/5；平均步数 5.6→3.8，−32%；中位时间 18.2 s→12.9 s，−29%；平均成本 $0.091→$0.084，−8%。
- 怎么判定：如果你自己的 A/B 里，得分不降、步数/时间/成本下降，且主要收益出现在「从代码里推不出来」的规则上，说明契约有用；如果强模型在小仓库上不要契约也能过，别把满分当普遍结论。作者自己说明：5 次/条件远不足以统计显著；只有一个任务、仓库很小；只测了 Claude Code；模型与版本会影响结果；强模型在小仓库上自己能看到 DO NOT EDIT 注释并找到 run_tests.py，真正的质量差异只出现在从代码里根本推不出来的规则（CHANGELOG）上，其余收益是省掉探索步骤与降低时间波动。
- 试多久：作者称整套约一小时落地；A/B 以 5 次/条件为一轮先看方向，不要当统计结论。

## 常见坑

1. 把 think / think hard / think harder 当开关用。Claude Code 只识别 ultrathink，其它会被当普通文本透传。
2. 以为 effort 越高越聪明。原文明确更高不等于更聪明；max 在常规任务上边际收益递减、更容易过度思考，且只限单会话，写不进 settings.json 的 effortLevel。
3. cp -r 整个 .claude/。Skills、hooks、agents、workflows 是以你的权限运行的可执行指令，要逐文件复制并阅读。
4. 把版本时点的数字当事实。原报告的模型名、各模型 effort 默认值和价格无法核验，使用前用 /effort 在自己环境核对。
5. 命名冲突搞错。按企业 > 个人 > 项目 > 插件 > 内置的先匹配先赢；本地 skill 不替换内置命令的别名，插件 skill 会同时加载。
6. 过度上扩展点。任务在主会话放得下就别上子智能体；两三个子智能体够就别上 workflows；数据都在本地就别上 MCP。
7. 拿半截资料硬做。原报告在子智能体、动态工作流、Agent Teams、MCP 四节被截断，这几项本手册只给判定，不给步骤。
8. 拿不可判定的约束上 hook。模式匹配必然有误报和漏报；对没有唯一正确写法的约束不适用，这类只能留在提示文件里。
9. 规则写进 hook 就不管了。规则固化在 hook 里的代价是：每次放宽或收紧都要改代码并 review；规则变更时要同步更新 hook 与匹配模式。
10. 反馈通道没打通。来源没交代 hook 的失败输出怎么被 agent 读到；如果你的工具链里 agent 读不到 stdout/stderr，门禁只会变成提交老是失败，不会自纠。
11. 把 ten out of ten 当数据。那是来源的主观评分，没有定义十分是什么、怎么测量、有没有对照。
12. 以为开了自进化就不用管 skill 了。README 没有命中率、误沉淀率，也没展示实际生成或合并出的 SKILL.md；规则质量要你自己抽查。沉淀只对稳定、明确、未来同类任务仍适用的反馈有意义，一次性任务不适合沉淀。
13. 在 Plan Mode 下等着它改文件。Plan Mode 会阻断写操作和 Shell，它只给只读分析和计划。
14. 用 --yolo 当默认。README 自己也不建议长期默认使用，因为它跳过确认，有误改风险。
15. 把 python -m pytest -q 全绿当端到端有效。测试不调用模型，跑通 pytest 不等于效果已被验证。
16. 把 README 里的示例值当事实。claude-sonnet-4-6、gpt-4o 这类 model 名和按 API 路径是否含 /anthropic 判协议都是 README 的说法，用前自己核对。
17. 目标配错，skill 写错地方。BEAR_AUTO_SKILL_TARGET=project 写 <project>/.bear/skills/，user 写 ~/.bear/skills/；权限模式不允许写文件时，后台写 skill 不会成功。
18. 把审计产物当效果证明。usage.jsonl 等只能说明来源、使用统计和版本快照，不能证明变好了。
19. 拿半截资料硬做（MyAgent）。本次材料只有仓库 README，未核对源代码，且怎么试、怎么验证一节被截断。
20. 把测试改绿当完成。绿色测试套件是代理最容易伪造的东西（作者主张，无数据）；规则要求绝不编辑、跳过或删除测试来让它通过。
21. 空实现检查搞错对象。只对自己新写的测试做空实现检查，不是把全部既有测试重跑一遍；恢复实现后要确认该测试重新变绿。
22. 把 7 条规则当完整清单抄。原文在采集时被截断，只完整给出第 1 条，第 2 条起缺失，不要推断或复述其余 6 条。
23. 没有测试的项目硬套。对没有自动化测试的项目，这条规则无从执行。
24. 误把补写的 git 命令当原文。git diff --stat HEAD~1 HEAD -- '*test*' '*spec*' 是调研报告按规则意图补的最小检查方式，不是推文给出的命令。
25. 以为写进 AGENTS.md 就等于必须发生。它和第 11 步做法 B 一样属于提示文件约束，会漂移；要违规提交进不去得自己做门禁，而测试是否真的在验证行为通常不是 diff 模式能判定的。
26. 把 linter 当语义检查。agents_lint.py 只查结构、占位符、路径、命令是否存在、密钥和文件大小；不查规则是否合理、测试是否有效、代码是否绕过某个库。
27. 覆盖已有 .claude/settings.json。复制模板时如果项目已有这个文件，不要覆盖，手动把 hooks 块合进去。
28. 照 README 手写 CI workflow。原文没贴 .github/workflows/agents-lint.yml 的具体内容，必须直接用仓库里的文件。
29. 把 5 次 A/B 当统计显著。作者自己写明：5 次/条件远不足；只有一个任务、仓库很小；只测了 Claude Code；模型与版本会影响结果。
30. 同时维护 AGENTS.md 和 CLAUDE.md 两份规则。应让 CLAUDE.md 只写 @AGENTS.md，否则 W070 警告提示两份规则会漂移。
31. 把 Cursor / Copilot 当已验证。原文只在哪些 agent 读 AGENTS.md 处提到它们，没有配置、没有实测，不能据此写操作步骤。
32. 忘了 linter 的运行前提。--check-commands 要求命令在 PATH 中；-r 要在仓库根运行；Windows 没有 Git Bash 时用 PowerShell 变体。
33. 把 Lessons 当自动沉淀。它要你在每次 agent 犯错后手工加一行；linter 只保证结构不退化，不生成内容。
34. 把测试规则和契约 linter 混为一谈。linter 不验证空实现下测试必须失败，第 16 步的空实现检查仍要单独做。
35. 文件大小门禁跑全仓库。做法 C 只应检查本次暂存文件，否则无关文件会造成干扰。
36. 忘了排除锁文件和代码生成文件。原文明确要求忽略这类非代理编写文件，漏掉会产生误报。
37. 把 bytes/4 当精确 token 计数。原文只给估算方式，不同编码和内容会影响精度。
38. 超限只报错不给拆分说明。做法 C 要求错误信息里给出明确的文件拆分说明，否则提交者或代理无法自纠。
39. 把 5,000 当普适阈值。它只是来源建议的起点，先在代理参与的分支上小范围观察误报。
40. 把 W101 和做法 C 混为一谈。W101 查 AGENTS.md 超过 32 KiB；做法 C 查暂存代码文件按 bytes/4 估算超过 5,000 tokens。
41. 把推文的 4,084 次点赞当效果证据。互动量只能说明关注度，不能证明该门禁在结果上有效。
42. 把 Ryugi 当已量化验证。材料只有 README、47 stars，没有效果数据；两小时自主推进、自动触发等只是作者主张。
43. 在多个 harness 只装一个。原文要求每个 harness 分别安装；同时用多个 harness 时不要只装一个就以为都生效。
44. 没装 Node.js 却用 ryugi-artifacts。该 CLI 需要 Node.js；不预览产物不影响主流程，但不要误判安装失败。
45. 干净会话里没看到 brainstorming 就继续写代码。应先用 `Let's make a react todo list` 验证触发，没触发就停下检查安装。
46. 忽略项目自有技能。原文说设计系统、verify、ship 等项目技能在对应步骤优先；不要让 Ryugi 覆盖它们。
47. 把 `just code it` 当常态。它会跳过 executing-specs 直接写代码；只有你明确想绕过规格流程时再用。
48. 把默认 squash、从不 merge commit 当团队规范。这是原文作者主张，落地方式要按团队实际选择。
49. UI 验收只看代码不看证据。verifying-ui 要求真实截图或录屏与已批准设计并排 pass/reject；没有证据不要宣布完成。
50. 默认开 worktree。原文说没有偏好时默认就地工作，只有冲突风险才开；不要把隔离当成默认动作。
51. 把 Ryugi 与第 7 步手工工作流同时跑。会重复规格和计划；小任务用第 7 步，需要规格前置和 UI 验收时选 Ryugi。
52. 在 Cursor / OpenCode 照猜完整命令。原文只给本地插件源和 .opencode/INSTALL.md，没有完整命令，不能编造。

## 证据与来源

- **来源一**：GitHub 仓库 wesammustafa/Claude-Code-Everything-You-Need-to-Know 的 README，约 3095 stars，以调研报告形式并入。可核验内容：第 8 步的路径表、7 个 slash skill 名称、/claude-md-review、/stale-docs-audit、notification.py、settings.json 用 CLAUDE_PROJECT_DIR 调 uv run。数据或数字均为原报告所述：约 3095 stars；视觉迭代通常 2–3 轮；同一流程重复 ≥3 次才固化 skill；约 80% 的想开 max 情形正解在上游；5 个子智能体加 10 个角色提示词。属于作者主张、未经本项目验证：五个扩展点的对照表与组合建议、三条工作流的具体步骤、effort 是行为旋钮的心智模型与等级选择建议、Opus 规划 / Sonnet 执行、按模型分的 effort 默认值列表、hooks 的三类团队用途。版本声明用前核对。
- **来源二**：Simon Willison 博客 2026-10-13 收集的一条引言，出自 Geoffrey Huntley 的文章。原文只给了三件事：改 AGENTS.md 不管用，仍有落差而且会漂移；改用 pre-commit hook 检查 git diff 里有没有直接调用 observability 模块、绕过 diagnostics 模块；有就 fail 掉提交并注入请使用 diagnostics 库的提示，效果 ten out of ten。完全没有的：hook 代码、匹配规则、提示词原文、误报率、团队规模、项目类型、时间跨度。ten out of ten 是主观评分，未定义如何测量；做法 A 比做法 B 有效这个结论本身也只是作者主张。
- **来源三**：GitHub 仓库 ztt0216/MyAgent 的 README，36 stars，MIT，一个 Python 实现的通用 Agent Runtime。可核对的内容：完整目录结构、端到端运行链路、Skills 自进化链路、审计产物路径、测试覆盖范围与 CI 版本、可直接照抄的安装 / .env / 启动 / 权限模式 / 反馈写法。属于作者主张、没有证据：Runtime 可阅读、可扩展、适合作为二次开发基础、自进化能稳定沉淀可复用规则等价值判断；README 没有 benchmark 分数、任务成功率、耗时或 token 节省数据，没有真实使用案例或前后对比实验，没有展示实际生成或合并出的 SKILL.md 内容，没有自进化的命中率或误沉淀率。材料仅为 README，未核对源代码；项目是 36 stars 个人项目；材料在怎么试、怎么验证一节被截断。
- **来源四**：一条推文 @kloss_xyz，标题称 vibe 编码时应在 AGENTS.md 中加入 7 条规则。采集时原文被截断：标题说 7 条，正文只完整给出第 1 条，第 2 条只出现编号 2. 就中断。可核对内容：第 1 条的完整文字，即绝不编辑、跳过或删除测试来让测试通过；对自己编写的每个测试，都要确认如果被测代码什么都不做这个测试会失败；如果仍然通过就重写这个测试。数据只有推文互动量：91 赞、4 次转发、31 条回复，没有项目案例、失败率或前后对比数据。一个绿色的测试套件是代理最容易伪造的东西属于作者主张，原文未给出证据。原文被截断，不能据此推断其余 6 条；第 16 步中空实现检查的步骤与 pytest 命令示例来自来源四原文；git diff --stat HEAD~1 HEAD -- '*test*' '*spec*' 是调研报告补写的最小可执行检查方式，不是推文给出的。
- **来源五**：GitHub 仓库 AntoGA/agents-contract 的 README，约 40 stars、单人维护、俄文。可核对的内容：五个必填分节与可选 Lessons；linter 的错误级检查与警告级检查；--json、--strict、--check-commands、-r 与退出码 0/1/2；SessionStart 钩子跑 linter、装依赖、跑测试，输出进上下文，永远退出 0；AGENTS_SETUP / AGENTS_TEST / AGENTS_SKIP_TESTS 环境变量；Windows 用 .claude/settings.windows.example.json。数据：linter 速度基线；A/B 结果得分 4.8→5.0、平均步数 5.6→3.8、中位时间 18.2 s→12.9 s、平均成本 $0.091→$0.084；linter 自身 15 个单元测试，CI 在三平台跑。属于作者主张、没有数据：Cursor / Copilot 也读 AGENTS.md；一小时落地；大仓库上差距应该更大；Lessons 长期收益最大；不绑厂商。A/B 日期写作 18.10.2026，无法核实，可能是笔误。局限：5 次/条件远不足以统计显著；只有一个任务、仓库很小；只测了 Claude Code；模型与版本会影响结果；强模型在小仓库上不要契约也能过；仓库仅约 40 stars、单人维护，未见第三方复现。本手册把它当小范围试验、不直接全员采用。
- **来源六**：@mattpocockuk 的一条推文，建议在小范围代码库试装预提交钩子。可核对的内容：只检查暂存文件；按 tokens = bytes / 4 估算；单文件超过 5,000 就阻止提交；忽略锁文件、代码生成文件等非代理编写文件；错误信息中给出明确的文件拆分说明。属于作者主张、没有数据：这是其代码库中「最简单的投资。太好了。」；推文有 4,084 次点赞、170 次转发、223 条回复，只能说明关注度，不能证明该做法在结果上有效。原文没有完整钩子代码、具体框架配置或实际案例数据；没有说明如何处理二进制文件、超大文件、不同编码或误报，也没有给出拆分错误信息的具体写法。第 11 步做法 C 的步骤与指标是把推文建议落成可操作检查，其中取暂存文件的示意命令和错误信息写法由本手册补写，不是推文原文。
- **来源七**：GitHub 仓库 Innei/ryugi 的 README，47 stars。可核对的内容：Claude Code 安装命令、部分 harness 安装命令、`Let's make a react todo list` 安装验证方法、brainstorming / executing-specs / per-task TDD / one fresh review / verifying-ui 的流程描述、`just code it` 跳过执行规格、ledger 跨 compaction、worktree 触发条件、默认 squash 与 never a merge commit、npx ryugi-artifacts 及 start/stop/publish 子命令。属于作者主张、没有数据：两小时自主推进、不问 should I continue、技能自动触发无需手动 invoke、ledger 能跨 compaction 保留判断、默认落地方式适合所有团队。原文是 README，未验证实际安装后的行为；作为 Superpowers v7.0.0 的 fork，还需关注与上游差异和后续维护；Cursor、OpenCode 没有完整安装命令。本手册把它当可选工作流小范围试，不直接全员采用。
- 调研结论给的取舍：重点抄三个工作流、skills/hooks 的文件级配置步骤和两张对照表；原文在子智能体、动态工作流、Agent Teams、MCP 四节被截断，且 2026 年模型名与价格无法核验，不要照抄具体数字。提交门禁做法的结论是：思路清晰但实现空白，需自行补齐 hook 实现后小范围验证，不要照抄 ten out of ten 这类说法。文件大小门禁的结论是：规则具体、成本低，可先在一个代理参与的分支上试，重点观察误报率以及代理收到拆分说明后是否减少单文件过大问题；原文没有实现代码和效果数据。MyAgent 的结论是：可以小范围试，重点验证 Plan Mode 的只读审批和 Skills 自进化能否把反馈沉淀成可复用规则，但只有作者主张、没有评测数据。测试规则的结论是：把原文唯一完整给出的那条规则抄进单个项目的 AGENTS.md 试一轮；原文只露出 7 条中的第 1 条，不宜直接全面采用。项目契约的结论是：五段式 AGENTS.md + linter + SessionStart 钩子具体可照做、成本约一小时、跨工具复用，但作者自己说明只有 5 次单任务、且只测了 Claude Code，所以先在一个有隐性规则的真实仓库里小范围试，暂不直接全员采用。Ryugi 的结论是：安装命令和工作流步骤足够具体，可以小范围试；但原文只有作者主张，没有量化效果证据，试用时重点看是否先出规格、红绿测试记录、UI 验收轮次和返工次数。

## 依据的调研

- [wesammustafa/Claude-Code-Everything-You-Need-to-Know](../research/radar/2026-10-05/1337-wesammustafa-claude-code-everything-you-need-to-kn.md)：值得一试，把这份仓库当成 Claude Code 的实操手册素材来源，重点抄它的三个工作流（Explore→Plan→Code→Commit、TDD、视觉迭代）、skills/hooks 的文件级配置步骤和「能力发现/任务匹配」两张对照表，先在自己的项目里小范围试；但原文在子智能体、动态工作流、Agent Teams、MCP 四节被截断，且其中大量 2026 年模型名与价格无法核验，不要照抄具体数字。
- [Quoting Geoffrey Huntley](../research/radar/2026-10-13/2961-quoting-geoffrey-huntley.md)：值得一试，把架构约束从 AGENTS.md 这类提示文件搬到 pre-commit hook：提交时检查 git diff，发现绕过内部库（如 diagnostics 模块）的调用就让提交失败，并把纠正指令写进失败输出、交给编码智能体自纠。理由是把“靠提醒”变成“事件触发的强制门禁”，避免规则随上下文漂移；但原文只有一段口述、没有代码与量化数据，需自行补齐实现后小范围验证。
- [ztt0216/MyAgent](../research/radar/2026-10-17/4080-ztt0216-myagent.md)：值得一试，可以小范围试：按 README 用 OpenAI-compatible 接口（示例里就有 deepseek-chat）把 MyAgent 在本地跑起来，重点验证 Plan Mode 的只读审批和 Skills 自进化能否把反馈沉淀成可复用规则；它给了可照抄的安装、.env、权限模式和反馈写法，但只有作者主张、没有评测数据，先在自己的小任务上跑通再决定是否写进手册。
- [@kloss_xyz: 如果你正在进行 vibe 编码，你需要在你的 AGENTS.md 中添加这 7 条规则：](../research/radar/2026-10-17/4151-vibe-agents-md-7.md)：值得一试，把原文唯一完整给出的那条规则（禁止为凑绿而改测试，且每个新测试都要先验证“被测代码什么都不做时会失败”）抄进单个项目的 AGENTS.md 试一轮，因为它是一条可直接落地、可自检的常驻约束；但原文只露出 7 条中的第 1 条，其余被截断，且仅凭作者主张，不宜直接全面采用。
- [AntoGA/agents-contract](../research/radar/2026-10-19/4924-antoga-agents-contract.md)：值得一试，按照 README 的做法，在一个有隐性规则的真实仓库里落地五段式 AGENTS.md、零依赖 linter 和 Claude Code SessionStart 钩子，并把 bench 脚本换成自己的任务做小规模 A/B 验证；这些步骤具体可照做、成本约一小时、跨工具复用，但作者自己说明只有 5 次单任务、且只测了 Claude Code，质量提升也只体现在从代码里推不出来的规则上，所以先小范围试，暂不直接全员采用。
- [@mattpocockuk: 今天的提示：](../research/radar/2026-10-19/4969-item.md)：值得一试，建议在小范围代码库试装这个预提交钩子：只检查暂存文件，按“字节数/4”估算令牌数，单文件超过 5,000 就阻止提交并给出拆分说明；规则具体、成本低，但原文没有实现代码和效果数据，需先验证误报率及对代理写码行为的改善。
- [Innei/ryugi](../research/radar/2026-10-22/5940-innei-ryugi.md)：值得一试，建议在已使用的编码智能体 harness 中小范围试用 Ryugi：选一个带测试和 UI 验收需求的小任务，按“头脑风暴→批准规格→TDD 实现→一次复审→UI 验收”走完，并用是否先出规格、红绿测试记录、UI 验收轮次和返工次数判断效果。理由是安装命令和工作流步骤足够具体，但原文只有作者主张，缺少量化效果证据。
