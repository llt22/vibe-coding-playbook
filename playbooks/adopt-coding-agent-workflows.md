# 让编码 agent 的改动在提交前被可验证的门禁拦住

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：用编码 agent 干活时，如何把重复流程固化成技能、把硬约束做成门禁，并让每次「做完了」都有可验证的证据。
> 先试这一步：挑一条团队在 code review 中反复提出的硬约束，先按第 11 步做成 pre-commit 门禁；或按第 23 步让代理先出质量门禁计划，只接入 2–3 个能失败的门禁。
> 最近修订：2026-10-25

## 解决什么问题

用编码 agent 干活时，一次性对话会在几件事上反复消耗：同一个流程每次重写提示词、上下文质量差导致 agent 跑偏、项目约定散落在多个提示文件里会漂移、「做完了」却没有证据、绿色测试套件可能是代理改测试改出来的假绿、以及「这次怎么做对的」要靠人手工整理成规则。

本手册以 Claude Code 为主线，把重复的提示词和流程固化成技能、钩子和子智能体，用固定工作流控制「先探索、再计划、后写代码、最后提交」的节奏；把可判定的硬约束从「写在提示文件里靠提醒」搬到「提交时强制门禁」；并用五段式 AGENTS.md + 零依赖 linter + SessionStart 钩子让项目契约可检查、可在会话开始时自检。MyAgent、Ryugi、claude-howto、Tenex、Skill Recorder、tstack 是可选路线，分别补自动沉淀、规格前置、教程模板、团队文档层、人工示范录制和 PR 生命周期托管。

本次新增 dev-quality-gates 路线：它是一份按任务推荐质量门禁工具的清单，不追求每种语言都列全，而是要求代理按 README 提示词先出计划，只挑与项目栈匹配的少量条目，接入 hooks 和 CI，并逐个证明门禁能失败。它补的是「从清单挑门禁并验证阻断能力」，不替代第 11 步的提交门禁、第 16 步的测试真实性检查或第 17 步的项目契约 linter。材料只有 README，adopt.md、patterns.md 正文未包含，所以只建议在单个代码库小范围试用。

本次也保留 tstack 路线：它把「提 PR → 盯 CI → 处理 review → 合并」拆成 9 个窄技能，用口头触发词调用，技能之间有显式依赖图。它补的是代码写完之后那段尾巴，不替代提交门禁、测试真实性检查和项目契约。

## 适用与不适用

**适用于流程固化与工作流**：手上有真实项目目录，要长期用编码 agent 处理改动；改动能用单元/集成测试验证，或有视觉稿/截图可比对；愿意按文件审阅别人给的配置再放进项目。

**适用于先规格后实现（Ryugi）**：使用受支持的编码智能体 harness，且愿意按 harness 分别安装；任务跨模块、涉及架构、需要 upfront design 或有 UI 验收；项目已有或愿意补设计系统、verify、ship 等自有技能；ryugi-artifacts 需要 Node.js；你愿意在写代码前先批准 spec。不适用：只想让 agent 直接写代码、没有测试也没有 UI 验收、不愿装插件、想先要量化收益、在 Cursor 或 OpenCode 上想照完整命令安装。

**适用于提交门禁**：项目存在一条能被 diff 文本模式判定的硬约束，例如禁止绕过内部库直接调用某个模块；用 git 且有可用 pre-commit；agent 能读到 hook 的失败输出。不适用：约束没有唯一正确写法、只能靠人判断好坏，例如命名风格和抽象设计；也不适用不愿为规则付维护成本的人。

**适用于文件大小门禁**：代码库已有或允许加入预提交钩子；主要约束代理生成或代理修改的代码文件；团队能接受按 bytes/4 估算 tokens；只检查本次暂存文件。不适用：没有钩子机制、主要文件不是代理编写、要求精确 token 计数、二进制/超大文件/编码/误报规则未定。

**适用于反馈自动沉淀与只读计划审批（MyAgent）**：想把「这次怎么做对的」自动沉淀成下次可复用的规则；任务属于重构、复杂修复、多文件修改，希望先只读分析、写计划、经你审批后再执行；你能读 Python runtime 实现；接受自备模型接口与 key。不适用：不能用 Python 3.11+、不在 macOS/Linux、不愿自备 key、不能接受 --yolo 这类跳过确认的模式、想要 benchmark 证明有效。

**适用于测试规则**：项目已有可运行的测试框架与测试命令；仓库根目录已有或可新建 AGENTS.md；使用的编码代理会读取 AGENTS.md；代理有读写代码与测试文件的权限。不适用：项目没有自动化测试；你想直接采用「7 条规则」，原文只完整给出第 1 条；你想用它替代提交门禁。

**适用于项目契约与开机自检（AntoGA/agents-contract）**：项目里有隐性规则，例如真实费率藏在配置文件、生成物不许手改、测试命令不是裸 pytest、改完必须写 changelog；希望同一份 AGENTS.md 被 Claude Code、Codex、Cursor、Copilot 等工具复用；愿意用 Python 3.9+ 跑零依赖 linter 并接进 CI；用 Claude Code 并想在会话开始或恢复时自动跑 linter、装依赖、跑测试。不适用：指望 linter 检查规则是否合理或测试是否真的验证行为；想要统计显著收益结论；想照 README 手写 Cursor/Copilot 配置；不接受 Python 3.9+ 或不想维护会演进的契约。

**适用于 claude-howto 教程层**：已经在用 Claude Code 2.1+，想按文件取用模板和配置参考，而不是引入新 runtime；想先验证一个 slash command、一个项目 CLAUDE.md 和一个 code-review-specialist skill 是否值得进项目；能接受先只做两周、单项目、三类任务的小范围试用。不适用：想把它当新工具或完整工作流一键安装；希望先看到生产力、缺陷率或 ROI 数据；打算一次装完 10 个模块；不能提供 MCP 凭据或不能接受 hooks 脚本以本地权限执行。

**适用于把计划与决策签入仓库（Tenex）**：多人、多项目、需要长期维护、需要向客户或同事交代决策的工程团队；团队已有可复述的开发流程，愿意先写一页纸的当前流程；能给 agent 仓库写权限并约定固定写入位置；愿意让第二个模型只评审，且两个模型入口都能读同一仓库；能接受故事点或等价工作量单位并每季度校准。不适用：单人单项目小团队；流程本身不存在或不稳定；想要现成模板、目录结构或 CLI 命令；想靠它替代提交门禁、测试真实性检查或项目契约；企业非工程场景尚未解决数据权限/RBAC；想照抄播客里的模型名；期待 2 倍产出有统计证明。

**适用于 Skill Recorder**：想先用手动示范把桌面或终端任务录成技能，再让代理复跑；任务步骤稳定、每周至少重复 3 次、单次约 5–15 分钟、以点击和终端命令为主；能接受录制过程在本机进行，并愿意先到仓库确认安装方式、停止录制方式、技能产物形态和代理接入方式。不适用：一次性任务；含敏感凭证或客户数据且未确认录制数据落盘位置与清除方式；依赖外部不可控界面；不愿承担 v0.7.0 早期版本接口变动；把推文里的「教会你的 AI 代理」当成已验证能力。

**适用于 tstack**：你的工作在 GitHub PR 流程里；仓库有可用的 CI 和 review bot；已安装并认证 GitHub CLI；有 python3；愿意先把合并权留在人手里，只让 agent 提 PR 和盯 CI。不适用：非 GitHub、非 PR 式协作；仓库没有 CI，或改动不可回滚却想用 full-send；要用 council/sol-loop 但 harness 不能调用其他厂商模型；想先看到合并成功率、PR 数量或前后对比数据。

**适用于质量门禁清单（dev-quality-gates，本次新增）**：有真实代码库；编码代理能读取 GitHub 原始文件、检查项目文件、修改仓库并运行项目命令；已有或愿意接入 Git hooks 和 CI；你愿意先让代理只出计划，人工审阅后只选与项目语言和跨切面风险匹配的少量门禁；愿意对每个新门禁制造一次已知违规，确认它返回非零退出码并阻断构建。不适用：想「全部安装」；项目没有 hooks/CI 或不愿接入；不愿逐个验证门禁能否失败；材料只有 README，adopt.md 和 patterns.md 正文未包含，不能照抄完整安装命令或配置；小项目全量套用会过重。

## 前置条件

**Claude Code 路线**：macOS / Linux / WSL；Windows 用官方 setup 指南里的 PowerShell 或 CMD 命令；备选 Homebrew、WinGet、npm，npm 方式要求 Node.js 22+；一个 Anthropic 账号，Pro、Max 或 API key 都可以；项目里可写 .claude/ 目录；如果抄仓库里的 notification.py hook，需要本机有 uv 且在 PATH 上；提交门禁需要一个 git 仓库和可用的 pre-commit 机制；确认 agent 能读到 hook 的失败输出。版本差异用前自己核：auto 成为交互式终端和 VS Code 会话的内置启动模式是 v2.1.283 及以后；/effort ultracode 保留已有 effort 等级是 v2.1.284+。

**Ryugi 路线**：使用受支持的编码智能体 harness，同时用多个 harness 时每个里面分别安装；在 Claude Code 里用 plugin marketplace 和 plugin install 安装；ryugi-artifacts 需要 Node.js；项目最好已有设计系统、verify、ship 等自有技能；需要人批准 spec、在浏览器中通过或拒绝 UI，并最终由人落地；Cursor 需把该仓库添加为本地插件源，OpenCode 需按 .opencode/INSTALL.md 安装，原文没有给出这两者的完整命令。

**MyAgent 路线**：Python 3.11+、macOS / Linux、Git；ripgrep 可选但推荐；一个 OpenAI-compatible 或 Anthropic-compatible 的模型接口，含 key、base URL、model 名；项目会自动读取当前目录或父目录中的 .env；想让自进化自动写入 skill，需要当前权限模式允许写文件，README 推荐 --accept-edits。

**测试规则**：项目已有可运行的测试框架与测试命令；仓库根目录已有或可新建 AGENTS.md；使用的编码代理会读取 AGENTS.md 作为上下文；代理有读写代码与测试文件的权限。

**项目契约与开机自检**：一个 git 仓库；Python 3.9+，linter 零依赖，macOS / Linux / Windows 通用；接 SessionStart 钩子需要 Claude Code，Windows 上没有 Git Bash 时用仓库里的 PowerShell 变体；接 CI 需要把仓库里的 .github/workflows/agents-lint.yml 放进项目，README 没有贴出具体内容，不能照 README 手写；--check-commands 要求命令已在 PATH 中，-r 需在仓库根运行。

**文件大小门禁**：一个 git 仓库，且已有或允许加入预提交钩子；钩子能取到本次暂存文件列表；你能维护排除列表，至少排除锁文件和代码生成文件；你接受 bytes/4 只是估算，不是精确 token 计数。

**claude-howto 教程层**：Claude Code 2.1+，README 版本标注为 v2.1.302，但实际用前核对当前 Claude Code 版本、hook 事件和模型兼容性；本地有一个项目目录；MCP 步骤需要相应凭据，例如 GitHub PAT 和 DATABASE_URL，不要硬编码凭据，不要提交敏感数据；hooks 脚本按 README 是 shell 脚本，需要可执行权限；注册 hooks 要改 settings.json，已有文件时手动合并，不要覆盖；插件以本地目录方式加载，README 明确说仓库没有 marketplace，/plugin install 不适用。

**Tenex 路线**：一个多人协作的 git 仓库，2–3 人、1 个仓库、4 周即可试点；团队能写出一页纸的当前流程，并能说清从需求到上线的实际步骤；agent 有仓库写权限，约定 docs/plan.md、docs/decisions/、docs/readouts/ 等固定写入位置；两个模型入口都能读同一仓库，评审模型只出意见、不改代码；有故事点或等价工作量单位，愿意每季度校准评分标准；若上非工程场景，先有数据权限/RBAC 控制，原文在权限网关处截断，不能照补实现。

**Skill Recorder 路线**：先装好 Skill Recorder 应用；原文只给 GitHub Release 链接卡片，安装方式、系统要求、停止录制快捷键、技能产物形态、支持哪些代理、如何触发复跑均未说明，必须到仓库确认；录制时需要本机点击、窗口切换、页面和终端命令的观察权限；需要一次干净、可重复的执行环境；录制内容可能含敏感信息，先确认落盘位置与清除方式；原文提到录制过程在本机进行，但这是产品侧表述，未经第三方核对。

**tstack 路线**：安装并完成认证的 GitHub CLI，先跑 `gh auth login`；python3，因为 babysit-pr 的 pr-wait 脚本需要它；若要用 council 或 sol-loop，需要一个能调用其他厂商模型 subagent 的 harness，T3 Code 用 delegate_task 实现，其他 harness 必须自己能跑这些模型，否则这两个技能不可用；仓库需要 push / PR / merge 权限，full-send 的合并动作隐含这一点；CI 结果与 review bot 评论要能被 agent 读到，作为 babysit-pr 的输入信号。

**质量门禁清单路线（dev-quality-gates，本次新增）**：从目标仓库根目录开始；编码代理需要能读取 GitHub 原始文件、检查项目文件、修改仓库并运行项目命令；人工审阅计划后才允许修改；若使用 README 推荐的 toolchain 与 hooks 组合，需要能安装 mise 和 hk；CI 中要能运行全量检查，因为本地 hook 可被 `--no-verify` 绕过；材料未包含 adopt.md 和 patterns.md 正文，不能从原文提取完整安装命令或配置。

## 操作步骤

### 1. 安装 Claude Code

前提：macOS / Linux / WSL。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

这是原文推荐的 native 安装方式，会在后台自更新。预期结果：claude 命令可用。Windows 用官方 setup 指南里的 PowerShell 或 CMD 命令；备选 Homebrew、WinGet、npm：

```bash
npm install -g @anthropic-ai/claude-code   # 需要 Node.js 22+
```

### 2. 认证

```bash
claude
```

首次运行会打开浏览器登录 Anthropic 账号。预期结果：会话可用。之后可以：会话内 /login 重新认证，/logout 登出；shell 里 claude auth login|status|logout。

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

生成项目级指令文件，Claude 每次会话都会读。CLAUDE.md 会成为 prompt 的一部分，所以要像维护常用提示词一样反复迭代，不要一次性堆一大堆内容就不再管。预期结果：项目约定写进了 CLAUDE.md，而且你会隔一段时间回来改它。与第 11 步的关系：CLAUDE.md 适合放偏好和背景这类主观约定；能被模式匹配判定的硬约束，更适合搬到提交门禁。与第 17 步的关系：如果采用五段式契约，CLAUDE.md 应只写 @AGENTS.md 一行，避免两份规则漂移。

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

等级怎么选（原文建议）：low 用于实时操控的快速查询，例如改文件名、简单 grep；medium 用于日常编码、小重构、计划明确的自主会话；high 用于多文件重构、复杂调试；xhigh 用于长时间自主 agent 会话；max 只用于架构、微妙 bug、安全评审这类真难的问题，且仅限单会话。预期结果：你用 /effort 能在自己环境里看到当前等级，而不是照抄原报告里那串按模型分的默认值。

### 6. 用「任务形态」对照表决定你要建什么

先判断该用哪个，再动手建。多数打磨过的配置会用到其中 2–3 个。前五行走原 Claude Code 教程；后五行走 claude-howto README 的 Feature Comparison，模板正文未展开，先用小任务验证。

| 形态 | 什么时候用 | 什么时候跳过 | 存放/做法 |
|---|---|---|---|
| Skills（slash 命令） | 同一个 prompt 或流程重复 ≥3 次 | 一次性任务 | .claude/commands/*.md |
| Hooks | 想让代码在工具调用、会话开始等时刻自动跑，含提交时门禁 | 只想手动触发 | .claude/settings.json |
| Subagents | 子任务大到需要独立的隔离上下文 | 任务在主会话里放得下 | .claude/agents/*.md |
| Workflows | 需要的智能体数量超过一次对话能协调的量 | 两三个子智能体就够 | .claude/workflows/*.js |
| MCP servers | 需要 Claude 调用外部工具 | 数据都在本地文件里 | 按项目配置 |
| Memory | 跨会话的团队/项目规范 | 只影响本轮会话 | 项目 CLAUDE.md、目录级或个人级 CLAUDE.md |
| Plugins | 需要成套流程，且愿意用本地目录加载 | 单个 skill 就够 | claude --plugin-dir ./插件目录 |
| Planning Mode | 复杂实现、需要先出计划 | 小改动、直接可做 | 会话内先规划；对应第 7 步做法 A 或 MyAgent 的 /plan |
| Background Tasks | 长运行任务，不想一直盯着 | 短任务 | 按 README 的背景任务用法，原文未展开细节 |
| Checkpoints | 高风险试验，想随时回退 | 已有干净 git 分支且不需要对话回退 | /rewind 选择恢复代码、对话或两者 |

预期结果：你说得出自己这次要用哪 2–3 个，以及另外几个为什么跳过。

### 7. 三条可直接照做的工作流

**做法 A：Explore → Plan → Code → Commit**（什么时候选：复杂问题）

1. Explore：读相关文件、图片、URL，用子智能体做验证。先不要写代码。
2. Plan：让 Claude 出计划。要更深推理就在这句 prompt 里加 ultrathink。Claude Code 只识别 ultrathink，think、think hard、think harder 会被当普通提示文本透传。
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

原文标注：迭代显著提升产出质量，通常 2–3 轮就够。预期结果：A 走完之后你手上是「计划 + 提交」，不是一堆没提交的改动；B 的测试在实现之前真的红过一次；C 的截图和稿子对得上。

### 8. 从示例仓库按文件拷贝现成配置（别整目录拷）

```bash
git clone --depth 1 https://github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know /tmp/cc-guide
cp -r /tmp/cc-guide/.claude/commands/pr.md  your-project/.claude/commands/   # take what you want
```

仓库里可抄的东西：.claude/commands/ 有 7 个 slash skill：/pr、/review、/tdd、/test、/five、/ux、/todo；.claude/skills/ 有一个 Agent Skill /claude-md-review，审计 CLAUDE.md 的含糊表述、死路径、臃肿；.claude/agents/ 有 5 个子智能体，外加 specialized-agents/ 里 10 个角色提示词；.claude/workflows/ 有一个动态工作流 /stale-docs-audit；.claude/hooks/ 有一个 Python hook notification.py，Claude Code 需要你输入时出声提醒；.claude/settings.json 有权限与 hook 接线。安全警告：Skills、hooks、agents、workflows 都是以你的权限运行的、可执行的指令，包括来自这个仓库的。要一个一个文件复制并阅读，就像 source 一个 shell 脚本之前先读它一样，不要 cp -r 一整个没打开过的 .claude/。预期结果：你的项目里只多了你读过的文件。

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

预期结果：敲 /analyze 就能跑这段提示词。升级为 Agent Skill 的方式：把它移到 .claude/skills/analyze/SKILL.md，加上 name/description frontmatter。原文明确两种格式现在是同一套系统：.claude/commands/deploy.md 和 .claude/skills/deploy/SKILL.md 都产生 /deploy。区别在于 Slash skill 要你主动敲 /，Agent Skill 只预加载元数据、在描述匹配任务时可由 Claude 自动调用、正文按需读取。命名冲突解析顺序（先匹配先赢）：企业 > 个人 ~/.claude/ > 项目 .claude/ > 插件（命名空间为 /plugin-name:skill-name）> 内置。本地 skill 会替换同名的内置 skill，或在本地终端会话里替换内置命令，但不替换它的别名；插件 skill 因为带命名空间，会同时加载。

### 10. 按需配 Hooks

前提：你能接受「自动执行的 shell 命令」这件事。Hooks 是 Claude Code 生命周期上的可编程检查点，脚本检查拟执行的动作并返回 allow / deny / modify。原文「最先说服团队的三类用途」中，本次抓取到的完整两条是：保存后自动格式化；拦截敏感路径。第三类用途来自原有调研：提交时门禁，在 commit 时刻检查 diff，发现违反架构约定的写法就让提交失败，并把纠正指令写进失败输出。文件大小门禁也做成提交时的门禁，做法见第 11 步做法 C。claude-howto README 补充了 hooks 的范围：5 种类型、33 个事件、4 个类别，包括 PreToolUse、PostToolUse、PostToolUseFailure、SessionStart、Stop、TaskCompleted、TaskCreated、FileChanged、PreCompact、PostCompact、PreModelSwitch、Notification 等，可按事件或状态自动执行命令/HTTP/prompt/mcp_tool/agent。这些是 README 声称，未逐一核对；不要一次全配，先只启用一个低风险 hook。预期结果：格式化不再靠人提醒；.env 这类路径即使 Claude 想动也动不了；第 11 步配好后，违反硬约束的提交进不去。

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
2. 靠上下文里出现这条指令来约束行为。代价（来源主张，无数据）：指令与实际做法之间有落差，而且会漂移。

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

**怎么选**：约束能被 diff 模式判定、并且你希望违规提交直接进不去 → 做法 A；约束是主观的，例如命名风格、抽象设计，或者只是偏好 → 做法 B；你想低成本阻止代理提交过大的单文件，且能接受 bytes/4 近似估算 → 做法 C。做法 A 和 C 可以并存：A 管语义模式，C 管文件规模。门禁管硬约束，提示文件管偏好与背景；对同一条硬约束，来源建议不要在 AGENTS.md 里重复，试用期故意不重复，才看得出门禁有没有起作用。第 17 步的五段式契约是另一层：它管项目事实与结构性约定，不替代 hook 门禁。做法 C 与第 17 步的 W101 不是一回事：W101 是 AGENTS.md 超过 32 KiB 时告警，做法 C 是代码文件按 bytes/4 估算超过 5,000 tokens 时阻止提交。

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

关键约束：Plan Mode 下会阻断写操作和 Shell。预期结果：你拿到的是只读分析加一份计划，在你审批之前它动不了文件。配套会话能力：会话自动保存，python3 -m agents.main --resume 恢复最近会话；/compact 做上下文压缩；大工具结果会被截断或持久化，避免单次结果把上下文撑爆。怎么选：重构、复杂修复、多文件修改走这条；小改动仍走第 7 步的做法 A/B/C。

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

给什么样的反馈：只沉淀稳定、明确、未来同类任务仍适用的规则。不适合沉淀的例子：

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

自进化链路（README 描述）：第 N 轮用户任务 → Agent 输出结果 → 保存 pending extraction window；第 N+1 轮用户反馈 → 合并进上一轮 window → online_ingest() → Extractor 抽取候选 Skill → Maintainer 判断 add / merge / discard → create_skill_file() 或 evolve_skill_file() → 写入 SKILL.md → 记录 provenance、usage stats 和版本快照。对应核心文件：agents/agent.py、agents/online_skill_evolution.py、agents/skills.py、agents/skill_evolution.py。审计产物：.bear/skill-evolution/usage.jsonl、online_provenance.jsonl、online_skill_provenance.json、skill_usage_stats.json、history/。预期结果：给出一条明确反馈后，.bear/skills/ 下出现或更新了 SKILL.md，并且能在审计产物里查到它的来源与版本。

### 15. 两条路线怎么选

| 维度 | Claude Code 路线 | MyAgent 路线 |
|---|---|---|
| skill 从哪来 | 你手写 .claude/commands/*.md 或 .claude/skills/*/SKILL.md | Runtime 从反馈中抽取候选，自动 add / merge / discard 后写入 .bear/skills/ |
| 触发方式 | Slash 主动敲 /；Agent Skill 按 description 匹配自动调用 | 检索后调用，README 称含 BM25 检索 |
| 计划与执行 | 自己按三条工作流走，权限模式靠 Shift + Tab 切 | 内建 --plan / /plan，只读，阻断写操作和 Shell |
| 硬约束 | pre-commit hook 门禁，必须发生；或提示文件提醒，会漂移 | README 未提等价的门禁机制 |
| 模型层 | Anthropic 账号 | 自备 Anthropic-compatible 或 OpenAI-compatible 接口 |
| 证据强度 | 有可核对的仓库文件与路径；行为主张仍属作者主张 | 只有 README；无 benchmark、无前后对比、未展示实际生成的 SKILL.md |

怎么选：你要的是「违规提交进不去」这种必须发生的约束 → 走 Claude Code + hook 路线，别指望把门禁挪进 runtime；你要的是「反馈别靠人手工整理」 → 按第 12–14 步小范围试 MyAgent，只拿它验证自进化是否真的沉淀出你要的规则；两条可以并存：MyAgent 用来跑只读计划与反馈沉淀试验，硬约束仍放在 git 门禁里——门禁在 git 层，与用哪个 runtime 无关；不要混目录：.claude/skills/ 与 .bear/skills/ 是两套系统的路径，各管各的。

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

6. 与第 11 步的关系：这条规则目前走的是做法 B（写进提示文件），不是做法 A（hook 门禁）。推文原文就是把规则写进 AGENTS.md；本手册没有它对应的 hook 实现。若想让它必须发生，需要自己按第 11 步做成能被 diff 判定的门禁——但「测试是否真的在验证行为」通常不是纯文本模式能判定的，空实现检查需要实际运行测试，不是 diff 匹配能覆盖的。预期结果：代理提交里不再出现改测试凑绿；新写的测试在空实现下确实会失败；你在合并前抽查 diff 时能看到代理没有动测试文件来凑绿。

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

2. 填写 AGENTS.md 的五个必填分节：Project（是什么、什么栈）、Commands（安装、构建、测试；测试必须写成 - Test: 这样一行）、Conventions（代码与提交约定）、Boundaries（不许碰什么：生成物、目录、依赖）、Definition of Done（怎样算完成）。可选 Lessons 分节，把智能体每次犯错写成一行。把 <...>、TODO、TBD、FIXME 全部清掉，不要写入任何密钥。预期结果：契约内容具体到能让另一个工具照着做，而不是口号。

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

复制 .claude/settings.json，用 env 指定安装/测试命令。原文示例的含义是：AGENTS_SETUP 设为 pip install -e .，AGENTS_TEST 设为 python -m pytest -q。AGENTS_SKIP_TESTS=1 可关掉测试。Windows 上没有 Git Bash 时，改用 .claude/settings.windows.example.json；它的命令用相对路径，钩子从项目根启动，因此在任何 shell 下都能跑。预期结果：会话开始或恢复时自动跑 linter、装依赖、跑测试，输出进上下文；钩子永远退出 0，不阻塞会话。

**怎么选**：只想让规则可检查、跨工具复用、接 CI → 做法 A；你用 Claude Code，并且想让每次会话开头就知道「契约是否合规、改动前测试是否通过」 → 做法 A + B；你不用 Claude Code → 跳过 B，但 A 的 AGENTS.md 与 linter 仍可用；原文只在工具名单里提到 Cursor / Copilot，没有配置步骤，不要据此写它们的操作。与第 11 步的关系：第 17 步的 linter 查结构、路径、命令、密钥和大小，不查「代码是否绕过了某个库」这类语义；硬约束仍按第 11 步做 hook 门禁。与第 16 步的关系：linter 不验证「空实现下测试必须失败」，测试规则仍要单独执行空实现检查。

### 18. 用 Ryugi 走「先规格、再 TDD、最后 UI 验收」（可选工作流）

来源背景：Ryugi 是一个面向编码智能体的软件开发工作流，起始于 Superpowers v7.0.0 的 fork，并被重塑为单一工作流。流程是：Idea → brainstorming → artifacts（artboard/document/html）→ Approved spec → executing-specs → per-task TDD → one fresh review → verifying-ui → 人工落地。原文提供安装命令、CLI 命令、工作流步骤和安装验证方法，但没有量化效果数据，只有作者主张；仓库 47 stars。

前提：使用受支持的 harness；同时用多个 harness 时分别安装；ryugi-artifacts 需要 Node.js；项目自己的设计系统、verify、ship 等技能在对应步骤优先。

1. 在 Claude Code 安装：

```text
/plugin marketplace add Innei/ryugi
/plugin install ryugi@ryugi-dev
```

原文还给出部分 harness 命令，使用前按对应 harness 核对。Cursor 需把该仓库添加为本地插件源，OpenCode 需按 .opencode/INSTALL.md 安装；原文没有给出这两者的完整命令，不要照猜。预期结果：安装后对应 harness 里能看到 Ryugi 工作流。

2. 用干净会话验证安装。发送：

```text
Let's make a react todo list
```

预期结果：正常工作流应在写任何代码前触发 brainstorming。若没有触发，先停下检查安装，不要继续往下写。

3. 进入 brainstorming。让 agent 先问「你真正想做什么、为什么」，一次一个问题；当工作跨模块、涉及架构，或你要求 upfront design 时，问题转入文档，按轮次回答。视觉方案在 Artboard 上一轮轮给出选项；小改动在聊天中确认，项目则产出 builder 可据此实现的设计文档。预期结果：你在写代码前先对齐需求和视觉方向。

4. 批准规格并选择执行方式。批准 spec 后，executing-specs 激活。若你明确说 just code it，则跳过该流程直接写代码。预期结果：默认路径是先有已批准 spec，再进入实现；只有你明确要求时才直接写代码。

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

**怎么选**：你要先对齐需求、先批准 spec，再逐任务 TDD，并且有 UI 验收需求 → 试 Ryugi；你只处理小改动，或没有测试和 UI 验收 → 仍用第 7 步的做法 A/B/C，别为小任务套重流程；你已经在用第 7 步的手工工作流 → 二者选一条，不要同时跑两套规格/计划流程；你想把 Ryugi 叠加在 Claude Code 上 → 按第 18 步安装，它与第 15 步的 Claude Code / MyAgent 路线不冲突，但 MyAgent 没有等价门禁。原文称技能会自动触发、可两小时自主推进且不问 should I continue，这些是作者主张，没有数据；试用时按第 2 步的干净会话验证和人工抽查为准。

### 19. 用 claude-howto 做两周单项目最小试用（可选教程层）

来源背景：luongnv89/claude-howto 是一个 MIT 许可的 Claude Code 教程仓库，README 声称包含 10 个模块，覆盖 slash commands、memory、skills、subagents、MCP、hooks、plugins、checkpoints、advanced features 和 CLI，并提供可复制的配置/模板与 15 分钟、1 小时和 11–13 小时学习路径。它不是新工具，而是把 Claude Code 已有功能组合成工作流的教程层。README 中的「90% 的能力没用上」「10x productivity」「production-ready templates」「Trusted by Developers」属于作者主张，没有基准测试、前后对比或客户案例数据。材料只读到 README，模板正文未展开。

前提：Claude Code 2.1+；本地有一个项目目录；下文用 /path/to/your-project 代替实际路径；MCP 步骤需要相应凭据；hooks 脚本按 README 是 shell 脚本，需可执行权限；已有 settings.json 时手动合并，不要覆盖。

**做法 A：只装最小三件套（推荐起点）**（什么时候选：你第一次试这个教程层，想先验证模板质量）

1. 克隆指南仓库。

```bash
git clone https://github.com/luongnv89/claude-howto.git
cd claude-howto
```

2. 复制一个 slash command 到项目，建立最小闭环。

```bash
mkdir -p /path/to/your-project/.claude/commands
cp 01-slash-commands/optimize.md /path/to/your-project/.claude/commands/
```

在 Claude Code 中输入：

```text
/optimize
```

3. 放入项目记忆，让后续会话自动加载团队/项目规范。

```bash
cp 02-memory/project-CLAUDE.md /path/to/your-project/CLAUDE.md
```

需要目录级或个人级记忆时：

```bash
cp 02-memory/directory-api-CLAUDE.md /path/to/project/src/api/CLAUDE.md
cp 02-memory/personal-CLAUDE.md ~/.claude/CLAUDE.md
```

4. 安装一个可自动调用的 skill。

```bash
cp -r 03-skills/code-review-specialist ~/.claude/skills/
```

或装到项目内：

```bash
cp -r 03-skills/code-review-specialist /path/to/project/.claude/skills/
```

5. 用 /optimize 和代码审查任务跑 5 次真实工作。每次记录：耗时、返工次数、审查发现的有效问题数/误报数、测试通过率。预期结果：你能判断这三个模板是否值得留在项目里；如果没有明显收益或误报太多，先不要加 hooks/MCP。

**做法 B：再加一个低风险 hook**（什么时候选：做法 A 稳定，你想试自动格式化与安全扫描）

1. 复制 hooks 脚本并赋权：

```bash
mkdir -p ~/.claude/hooks
cp 06-hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

2. 在 ~/.claude/settings.json 注册。先只启用 format-code.sh，确认不会破坏文件；再加 security-scan.sh，记录每次扫描耗时（原文此处截断，不要编造指标）。README 给出的配置是在 PostToolUse 的 Write matcher 上挂这两个脚本；已有 settings.json 时手动合并，不覆盖。预期结果：格式化不再靠人提醒；安全扫描没有产生你无法处理的误报；现有文件没有被破坏。

**做法 C：用 checkpoints、CLI 和自评做试验与验证**（什么时候选：你想回退试验、把 Claude Code 放进脚本/CI，或找知识缺口）

1. 用 /rewind 做安全试验。Claude Code 中执行：

```text
/rewind
```

然后按 README 的六个选项选择：恢复代码和对话、只恢复对话、只恢复代码、从此处总结、总结到此处、取消。预期结果：你能在不污染主分支的情况下比较不同实现方案。注意：checkpoints 不是 git 的替代。

2. 用 headless/CLI 方式把 Claude Code 放进脚本或 CI：

```bash
claude -p "Run tests and generate report"
cat error.log | claude -p "explain this error"
claude -p --output-format json "list functions"
claude -r "feature-auth" "continue implementation"
```

预期结果：命令能在无交互环境下返回结果；需要机器可读输出时用 --output-format json。

3. 用内置自评和测验找差距：

```text
/self-assessment
/lesson-quiz hooks
```

预期结果：你知道自己缺哪一块，而不是把「看完 README」当掌握。注意：这是学习自评，不是生产力或效果证明。

**做法 D：需要外部数据时再配 MCP（可选）**

前提：有 GitHub PAT；数据库示例需要 DATABASE_URL。不要硬编码凭据，不要提交敏感数据。

```bash
export DATABASE_URL="postgresql://..."
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer YOUR_GITHUB_PAT"
```

README 也允许手动写入项目 .mcp.json，示例在 05-mcp/。预期结果：Claude 能调用外部工具；如果只是本地文件任务，跳过 MCP。

**按需加载成套插件**：README 明确说仓库没有 marketplace，/plugin install 不适用。要用成套流程时，以本地插件目录方式加载：

```bash
claude --plugin-dir ./07-plugins/pr-review
claude --plugin-dir ./07-plugins/devops-automation
claude --plugin-dir ./07-plugins/documentation
```

预期结果：插件只在这次会话加载；不要把 /plugin install 当成这个仓库的安装方式。

**怎么选**：第一次试 → 做法 A，只装三件套，跑两周；A 稳定且你需要自动格式化/安全扫描 → 做法 B，先 format-code.sh 再加 security-scan.sh；需要脚本/CI、回退试验或自评 → 做法 C；需要外部数据 → 做法 D，否则跳过 MCP；需要成套流程且接受本地目录加载 → 按需用 --plugin-dir，不要用 /plugin install。与第 8 步的关系：第 8 步是从另一个示例仓库按文件拷贝命令、agents、hooks；第 19 步是教程层的最小三件套。二者都按文件读、按文件拷，不要整目录复制。

### 20. 把计划、决策和验收标准签入仓库，并用第二个模型评审（Tenex 路线，可选）

来源背景：Tenex 是一家应用 AI 公司，约 75 人，约 90% 是工程师或 AI 策略师；客户约一半 Fortune 2000、一半营收 1–5 亿美元的中型企业。它内部把技能集合、标准化项目文档和一层 CLI 合称 MetaHarness；计划、决策、验收标准、证据和代码一起签入 Git，让智能体回到任务时能读到「建了什么」和「为什么这么建」。原文是播客自动转写，只有流程轮廓，没有模板、目录结构、CLI 命令或提示词；2 倍产出是作者口头估计，不是对照实验。所以本节只做小范围试用，不直接全员采用。

前提：一个多人协作的 git 仓库；2–3 人、1 个仓库、4 周即可试点；团队能写出一页纸的当前流程；agent 有仓库写权限；两个模型入口都能读同一仓库；有故事点或等价工作量单位；若推到非工程场景，先有数据权限/RBAC 控制。

**做法 A：最小文档层（先只做这一步）**

1. 先确认流程确实存在。用一页纸写清当前从需求到上线的实际步骤。原文原话是「你不能自动化一个不存在的流程」。预期结果：团队能照着这张纸复述流程，而不是每人一套说法。
2. 建一份权威计划文档，签入 Git。至少覆盖计划、验收标准、决策、证据四类。原文说随着模型变强，他们对文档结构的强制反而在减少，所以起步不要设计重模板，先固定字段名。可先建：

```text
repo/
  docs/
    plan.md
    decisions/
    readouts/
  src/
```

这是本手册按原文要素拼装的最小示意，不是原文模板，可直接改。预期结果：计划与验收标准不再只存在于聊天或某个人脑子里。

3. 让 agent 把正在做什么、为什么这么做写回仓库。约定固定写入位置：每条决策一个文件，至少写背景、选了什么、否掉了什么、证据；每个任务结束追加一条，PR 里必须带上。人工只检查「有没有写、写得对不对」，不代写。预期结果：agent 回到任务时能读到上次的判断，而不是重新猜。
4. 把重复三次以上的流程周边动作固定下来。原文说他们把写计划、生成可视化、出客户 readout 做成模型可调用的 CLI；前提是这些动作每周重复三次以上，否则包 CLI 不划算。原文没有给命令细节，需要自建；不要照抄不存在的命令。预期结果：这些环节自动且标准化地发生，而不是每次靠人提醒。

**做法 B：加双模型「驱动 + 评审」**

5. 主力模型写，第二个模型只评审。原文配置是以 Opus 作主力驱动，用 Codex 做 review，让两者在同一台机器上来回工作；跑云端时用 AMP 的 orb 环境，可以开另一个 orb 去看前一个 orb 的产出并评审。前提：两个模型入口都能读同一个仓库；评审模型只出意见、不改代码，避免互相覆盖。注意：播客里的模型名无法独立核实，不要把模型名当可执行配置照抄；你要用自己的两个模型入口复现这个分工。预期结果：每轮拿到一份评审意见，而不是一个模型既写又判。
6. 把评审意见原样存进 docs/decisions/，再让主力模型按意见改。预期结果：评审不是一次性聊天，而是随代码留下的证据；以后能查到为什么改。

**做法 C：加计量与校准**

7. 每季度校准一次故事点值多少钱。原文明确说至少每季度坐下来评估：评故事点的标准是什么、项目怎么估。原因是模型变强后，同样一个点代表的产出在变。若没有故事点，用等价工作量单位也可以，但口径要固定。预期结果：激励不被「点贬值」扭曲。
8. 用一个趋势指标判定流程是否生效：全公司工程师人均每月故事点是否在上升；没有故事点时，用人均每周完成任务数的趋势替代，并同时看返工率。预期结果：4 周试点有前 4 周基线 vs 后 4 周的对比，而不是凭感觉。

**企业非工程场景**

9. 往非工程场景推之前，先解决数据权限与 RBAC。原文点名企业第二大痛点是权限与 RBAC：人人都有 Claude 或 Codex，但「谁能读什么」没有可用的统一网关/控制面板，CIO 和 CISO 极难管理。原文在权限网关部分被截断，不要照补实现。预期结果：权限没解决前，不上生产级智能体。

**怎么选**：多人、多项目、需要长期维护、需要向客户交代决策 → 试第 20 步；先 2–3 人、1 个仓库、4 周。单人单项目、任务小 → 继续第 7 步的三条工作流；原文自己说 MetaHarness 对一个小团队的一个项目可能是 overkill。你要的是违规提交进不去 → 第 11 步 hook 门禁；要测试真实 → 第 16 步空实现检查；要项目契约可检查 → 第 17 步 linter；要规格前置 → 第 18 步 Ryugi。第 20 步是文档与评审层，可以叠加，但不替代这些。第二个模型长期提不出实质问题 → 停掉评审，省 token；原文说 Codex 做 review 效果最好是个人使用偏好，不是对比实验。与第 8、19 步的关系：第 8、19 步是按文件抄现成配置或教程模板；第 20 步是团队流程与文档层，原文没有现成模板，需要自己设计。预期结果：你手上有签入 Git 的计划、验收标准、决策记录和评审意见；4 周后能用主指标、返工率、上下文供给和评审有效性判断是否继续。

### 21. 用 Skill Recorder 把人工示范录成可复跑技能（可选）

来源背景：@RoundtableSpace 的推文称微软开源了 Skill Recorder（仓库 microsoft/skill-recorder，原文提到最新 Release 为 v0.7.0，4.3K 星）。它观察你手动执行一次任务，把过程记录成技能，再让你的 AI 代理照着执行；捕获点击、应用切换、页面和终端命令；录制过程全部在本机进行；录制时可以边做边大声讲解。材料只有推文正文，约三句话加一个 GitHub 链接卡片，没有仓库 README、文档或实测数据。下文凡涉及导入代理、触发方式、支持平台的内容，原文均未说明，必须自行到仓库确认，不要当已知事实。

1. 先确认工具细节。到仓库确认安装方式、系统要求、停止录制快捷键、技能产物形态与存放位置、支持哪些代理、如何接入与触发。原文只给了 Release 链接卡片，这些都没有说明。前提：你能接受先去读仓库文档再动手。预期结果：你知道产物怎么被代理读取，以及录完后怎么停、存在哪里。若仓库文档也说不清，先不要把它纳入日常流程。
2. 选一个值得移交的任务。建议条件：你每周至少做 3 次、单次 5–15 分钟、以点击和终端命令为主、步骤基本固定。避开含敏感凭证或客户数据的任务。预期结果：你有一个干净、可重复、值得录制的目标任务。
3. 开始录制。快捷键：

```text
macOS:  ⌘⇧R
Windows: Ctrl+Shift+R
```

预期结果：工具进入录制状态。原文未说明停止录制的快捷键，停止方式到仓库确认。

4. 正常执行你要移交的那一次任务。期间工具会捕获鼠标点击、应用/窗口切换、页面、终端命令。预期结果：关键步骤被记录下来，尤其留意窗口切换和终端命令有没有漏。
5. 边做边大声讲解。说明你在每一步的判断依据，让「为什么点这里、为什么敲这条命令」进入记录，而不只是动作序列。预期结果：技能里除了动作，还有你口述的判断规则。
6. 结束录制并取得技能产物。原文未说明停止方式与产物形态；到仓库确认文件格式、存放位置、如何被代理读取。预期结果：你手上有一个可交给代理的技能对象。
7. 把技能交给你的代理复跑。原文只说到「教会你的 AI 代理为你执行它」，未给出接入哪个代理、如何接入、如何触发。每次从同样的初始状态出发，复跑 3 次，记录每次表现。预期结果：3 次里至少 2 次无需人工接管完成，且含检查时间后的总耗时低于你手工做，才考虑纳入日常；否则保留为特定任务专用，或等版本成熟。
8. 同一任务你自己手工做 3 次，作为对照。记录完成情况、耗时、需要人工接管的次数。预期结果：你有代理复跑与手工执行的对照，而不是只看一次演示。
9. 与已有技能路线区分。手写 slash skill 是你把流程写成提示词；MyAgent 的 Skills 自进化是从反馈中抽取候选并写入 .bear/skills/；Skill Recorder 是录制人工操作再让代理复跑。三者可以并存，但不要混目录、混来源。录制产物要先人工读一遍，不要直接全量信任。预期结果：你知道这个技能是人示范录出来的，还是手写或自动沉淀的，出了问题能回到源头修。

### 22. 用 tstack 把 PR 生命周期交给窄技能（可选）

来源背景：t3dotgg/tstack 是 Theo 把自己每天在 Claude Code 和 Codex 上使用的 agent skills 整理成的公开仓库（MIT，约 32 stars）。共 9 个技能，围绕「把一个改动一路推进成合并的 PR」组织：full-send（无人值守推到 merged PR）、full-stop（同 full-send 但停在可合并，由人点合并）、council（三个不同 provider 的模型评审到一致）、sol-loop（用 GPT Sol 循环评审到两个 agent 一致）、file-pr（提简短 PR，开头先讲问题）、takeover（接手别人的 PR、分支或 agent 线程，保留原作者署名）、babysit-pr（盯 CI 和 review bot，只修真正的问题）、modernize（给老 PR rebase 并判断是否还该存在）、leaving-pr-comments（格式化 agent 代你发布的 PR 评论，自动触发）。材料只有 README，技能本体不在材料里，也没有任何量化数据，所以只做小范围试用。

前提：安装并完成认证的 GitHub CLI，先跑 `gh auth login`；python3，babysit-pr 的 pr-wait 脚本需要；若要用 council 或 sol-loop，需要一个能调用其他厂商模型 subagent 的 harness，T3 Code 用 delegate_task 实现，其他 harness 必须自己能跑这些模型，否则这两个技能不可用；仓库有 push / PR / merge 权限；CI 结果与 review bot 评论可作为输入信号。

**做法 A：最小试用，只启用 file-pr 和 babysit-pr（推荐起点）**（什么时候选：你第一次试 tstack，想把合并权留在人手里）

1. 确认前置：`gh auth login` 已完成，`python3` 在 PATH 上。预期结果：`gh` 能操作 PR，python3 可用。

2. 克隆并复制到两个 harness 的 skills 目录（原文命令，原样可复制）：

```bash
git clone https://github.com/t3dotgg/tstack
cp -R tstack/skills/* ~/.claude/skills/   # Claude Code
cp -R tstack/skills/* ~/.codex/skills/    # Codex
```

预期结果：两个目录下出现 tstack 的技能。只用其中一个 harness 时，只复制对应目录。

3. 按依赖图补齐技能，缺一个会调用失败。原文明确给出：full-send 依赖 sol-loop、file-pr、babysit-pr；full-stop 依赖 full-send；takeover 依赖 modernize、file-pr、babysit-pr、leaving-pr-comments；file-pr、babysit-pr、modernize 依赖 leaving-pr-comments。也就是说，想用 full-stop，至少要装 full-send + sol-loop + file-pr + babysit-pr + leaving-pr-comments。预期结果：你打算调用的技能，其依赖链上的技能都已安装。

4. 不直接改技能本体，把个人配置写进 CLAUDE.md / AGENTS.md。原文建议：技能只是起点，应当修改；但像「哪几个模型组成 council」这类个人设置要放进 CLAUDE.md 或 AGENTS.md，这样更新技能时不会把配置覆盖掉。预期结果：你的模型组合、项目约定和技能本体分离，升级技能不丢配置。

5. 保守起步：只触发 file-pr 和 babysit-pr（连带 leaving-pr-comments），不要调用 full-send 或 full-stop，合并权限仍由人掌握。在对话里说触发词，例如 file a PR、babysit。预期结果：agent 帮你提 PR、盯 CI，但不会自己合并。

6. 跑 2–3 个真实 PR。每次记录：PR 描述首段是否先讲问题；每个 PR 需要几轮修复才让 CI 变绿；babysit-pr 提交的修复里被人工判定为误报/噪声的比例；agent 代发的评论是否可直接发给同事；人工总耗时与不用技能时相比。预期结果：你能判断这两个技能在你的代码库里有没有接住任务。

**做法 B：加入 full-stop，保留人工点合并**（什么时候选：做法 A 稳定，你想让 agent 把 PR 推到可合并）

7. 先补齐 full-stop 的依赖链：full-send、sol-loop、file-pr、babysit-pr、leaving-pr-comments。注意 full-send 依赖 sol-loop，所以你的 harness 必须能跑外部模型；不能跑时，full-stop 也不可用。预期结果：依赖齐全，调用不会缺技能。

8. 在对话里说 full stop，让 agent 把改动推进到可合并，但最后由你点合并。核心指标是人工干预次数/PR：如果每个 PR 仍需你介入 3 次以上，说明技能在你的代码库里没有真正接住任务，不应升级到 full-send。预期结果：大多数 PR 只需你最后点一次合并，而不是全程盯着。

**做法 C：谨慎验证 full-send**（什么时候选：CI 能拦住问题、改动可回滚、仓库不是生产关键路径）

9. 仅在低风险、有 CI、可回滚的仓库里试 1–2 次 full send，记录是否出现需要 revert 的合并。出现一次即回退到 full-stop。原文自述 full-send 是「没人看着」直接合并；不具备 CI 兜底、review bot、可回滚条件时不要使用。预期结果：你拿到了 full-send 在你仓库里的真实风险，而不是凭 README 决定。

**触发方式**：安装后在对话里直接说触发词，例如 full send、full stop、council、sol loop、file a PR、take over、babysit、modernize；leaving-pr-comments 无需口头触发。

**怎么选**：你只想让 agent 提 PR、盯 CI，合并仍由人做 → 做法 A，先只启用 file-pr 和 babysit-pr；你想让 agent 推进到可合并、但保留最后一道人工合并 → 做法 B；你有完整 CI 和 review bot 兜底、改动可回滚、仓库非关键路径 → 才考虑做法 C。与第 7 步的关系：第 7 步管写代码前后的节奏，tstack 管代码写完之后 PR 的尾巴，可以叠加，但不要因此跳过测试和门禁。与第 11 步的关系：tstack 的 babysit-pr 只修 CI 和 review bot 报出的问题，不替代你的提交门禁；硬约束仍按第 11 步做 hook。与第 20 步的关系：Tenex 的双模型评审是团队文档层，tstack 的 council/sol-loop 是 PR 评审循环，二者可以并存，但都要自己验证评审质量。

### 23. 用 dev-quality-gates 清单让代理先出计划、再接入少量门禁（可选，本次新增）

来源背景：mokevnin/dev-quality-gates 是一份有明确取舍的开发质量门禁工具清单：每个任务推荐一个工具（少数两个），说明为什么选、哪里不适用；原则包括按任务选一个工具、覆盖优先于数量、优先快速原生工具链、必须能阻断构建（非零退出码）而不只是出报告、对 AI 编码代理友好（非交互、机器可读输出、安全自动修复）、没有可靠推荐就留空。README 明确说这不是通用技术栈，不要全部安装。材料只有 README，adopt.md、patterns.md、tools.json 和 research 目录正文未包含，原文还在 Under review 表格处被截断，因此无法核对完整接入步骤和逐条配置。

前提：从目标仓库根目录开始；编码代理需要能读取 GitHub 原始文件、检查项目文件、修改仓库并运行项目命令；先让代理只出计划，不改文件；人工审阅计划后才允许修改；若采用 README 推荐的 toolchain 与 hooks 组合，需要能安装 mise 和 hk；CI 中运行全量检查，因为本地 hook 可被 `--no-verify` 绕过。

**做法 A：让代理按 README 提示词先出计划（推荐起点）**（什么时候选：你第一次试这个清单，想先看它会给你的项目挑什么门禁）

1. 确认前置：你从目标仓库根目录开始；代理能读取 GitHub 原始文件、检查项目文件、修改仓库并运行项目命令。预期结果：代理能看到仓库结构，也能访问清单。

2. 在仓库根目录向编码代理原样发送 README 给出的提示词：

```text
Apply https://github.com/mokevnin/dev-quality-gates to this repository.
Read and follow https://raw.githubusercontent.com/mokevnin/dev-quality-gates/main/docs/adopt.md.
Show me the plan before you change anything.
```

预期结果：代理先返回一份计划，不修改文件。

3. 审阅计划，不直接放行。按 README 原则检查：是否只选了与项目语言和跨切面风险匹配的条目；是否避免「全部安装」；是否优先能非零退出、对代理友好的工具；是否诚实标出没有可靠推荐的类别。预期结果：你手里有一份范围受控、理由清楚的计划；若代理倾向安装过多工具，先要求它缩小到主语言加一个跨切面风险类别。

4. 计划确认后再让代理修改。README 描述的预期行为是：代理检查项目、只挑适合条目、把检查接入 hooks 和 CI，并证明每个检查都能失败。预期结果：仓库里只多出你批准的门禁配置，没有全量安装。

5. 若手工执行：按语言和跨切面类别从清单中挑条目，再使用 README 指向的 `docs/patterns.md` 中的 setup patterns。注意：本次材料没有包含 adopt.md 和 patterns.md 的正文，因此无法从原文提取完整安装命令或配置；不要凭猜测补写。预期结果：你只使用材料中能确认的提示词和原则，未确认的配置到仓库原文核对。

6. 若采用 README 推荐的 toolchain 与 hooks 组合：用 `mise.toml` 固定工具版本，用 `hk.pkl` 让本地 hook 和 CI 跑同一套检查；CI 中运行全量检查，因为 hook 可被 `--no-verify` 绕过。原文给出的相关命令包括：

```text
mise use hk
hk check
hk fix
hk check --all
```

预期结果：本地和 CI 使用同一套检查入口；hook 快速反馈，CI 做全量兜底。

7. 对每个新接入的门禁做一次「能否失败」的验证：制造或选择一个已知违规，确认该检查返回非零退出码并阻断 CI；只出报告、不阻断的检查不算完成。预期结果：每个门禁都至少失败过一次，而且你能看到非零退出码。

**做法 B：小范围扩展类别**（什么时候选：做法 A 已稳定，你想覆盖更多跨切面风险）

8. 先只覆盖一个主语言加一个跨切面风险类别（例如密钥扫描或依赖漏洞），不要全量安装。预期结果：门禁范围可控，误报和 CI 延迟可观察。

9. 若至少一个门禁捕获了真实问题或成功拦截构造违规，且误报和 CI 延迟可接受，再扩大到更多类别；若代理倾向安装过多工具、或门禁无法失败，则停止推广，只保留已验证的单个工具。预期结果：扩展由证据驱动，不是按清单从头装到尾。

**怎么选**：你第一次试这个清单 → 做法 A，只让代理出计划并批准 2–3 个最匹配的门禁；做法 A 稳定且你需要覆盖更多风险类别 → 做法 B；你想一次装完清单 → 不要这样做，README 明确说不是通用技术栈。与第 11 步的关系：第 11 步是把一条你能判定的硬约束做成 pre-commit 门禁；第 23 步是用清单挑出现成门禁工具并接入 hooks/CI，两者可以并存，但都要验证「违规时是否非零退出并阻断」。与第 17 步的关系：第 17 步的 linter 查 AGENTS.md 结构与事实，第 23 步接的是代码质量门禁工具，不互相替代。与第 16 步的关系：第 23 步的门禁能阻断构建，但不验证「测试是否真的在验证行为」，测试真实性仍按第 16 步做空实现检查。

## 怎么判断变好了

**流程固化与工作流**：同一个 prompt 或流程重复 ≥3 次，就该去建 skill，而不是继续手打；Plan 阶段真的没写代码，Explore 阶段只读文件、出计划，ultrathink 只出现在需要更深推理的那句计划 prompt 上；TDD 的测试在实现之前确实失败过一次，最后全绿才提交；视觉迭代通常 2–3 轮就能对齐稿子；effort 别照抄默认值，用 /effort 在自己环境核对，发现自己在常规任务上想开 max 时，原文说约 80% 的情况正解在上游——更锋利的 CLAUDE.md、原子化的计划、点名的文件。最小试用：先在自己的项目里小范围试，一次只引入一个扩展点。

**提交门禁**：违规提交率，即 hook 触发次数 / 总提交次数，看是否随时间下降；首次提交即通过的比例，反映反馈是否有效；每次触发后需要的修复轮数，轮数少说明失败输出里的提示写清楚了；人在 review 中提出同类问题的次数，这是最终的业务指标；误报次数，频繁误报说明规则的模式化程度不够。最小试用：挑一条团队在 code review 中反复提出的硬约束，写一个 pre-commit hook 检测违规、失败输出写明应改成什么；让 agent 在正常提交循环里工作一段时间，期间不要额外在 AGENTS.md 里重复这条规则。对照：同一约束、同一类任务分两组——A 组只靠 AGENTS.md 提示，B 组用 hook 门禁 + 失败提示注入。若 B 组违规提交率下降、人工 review 同类评论减少、误报可控，说明有效；若 hook 频繁误报，或 agent 读不到/读不懂失败输出而无法自纠，先修规则可判定性或反馈通道。

**文件大小门禁**：钩子是否只在暂存文件上触发，是否确实忽略锁文件和生成文件；超限文件是否被阻止提交，错误信息是否能让提交者或代理完成拆分；误报是否可接受；代理收到拆分说明后，是否能减少单文件过大问题。最小试用：选一个由 AI 代理参与写码的代码库或分支，加入预提交钩子，只检查暂存文件；设置 5,000 令牌阈值；排除锁文件和代码生成文件；超限时阻止提交并输出拆分说明。先观察一段时间，不改动其他提交规范。来源没有给出固定时长，以若干次提交为一轮先看误报和代理是否按提示拆分；不要把推文的点赞数当效果证据。

**反馈自动沉淀与只读计划**：Plan Mode 是否真的只读，计划获批之前没有任何写操作或 Shell 执行；自进化是否落盘，<project>/.bear/skills/<skill_name>/SKILL.md 或 ~/.bear/skills/<skill_name>/SKILL.md 出现或更新；能不能查到来源与版本，看 .bear/skill-evolution/usage.jsonl、online_provenance.jsonl、online_skill_provenance.json、skill_usage_stats.json、history/；沉淀质量只能人工抽查，README 没有命中率、误沉淀率，也没展示实际生成或合并出的 SKILL.md，所以要自己读一遍生成的 skill 是不是你要的那条规则。最小试用：按第 12 步装好并配好 .env；没有 Anthropic 接口时用 DeepSeek 这类 OpenAI-compatible 端点；跑 python -m pytest -q 确认权限模式、危险命令检测、编辑前必须先读与 mtime 校验、Skill 检索等基础行为。来源材料的这一节在「……Skill 检索等基础行为」处被截断，本手册不补写。以「给一条可沉淀的反馈 → 看是否落盘 → 人工读一遍生成的 SKILL.md」为一轮。

**测试规则与空实现检查**：代理提交中修改测试文件以使其通过的次数，越少越好；新测试通过空实现检查的比例，越高越好；因测试造假或无效测试而需要人工回退或返工的次数。最小试用：只挑一个正在用编码代理的项目，在该项目的 AGENTS.md 中加入上面的 Testing rules 两条；用同一个代理完成若干次「写功能 + 写测试」的任务，每次对新增测试执行一次空实现检查。持续一两周或若干个任务周期后汇总。若原文其余 6 条后续可见，再用同样方式逐条小范围试，不一次性全部加入；不要凭标题补全。注意：以上指标与试用方式是调研报告给出的可操作化验证建议，不是推文原文；原文只给出一个判据——新测试在「被测代码什么都不做」时必须失败，否则重写。

**项目契约与开机自检**：linter 是否零错误，结构、占位符、测试命令、路径、密钥、文件大小都过，--strict 下没有你不想接受的警告；是否只有一个规则来源，CLAUDE.md 只有 @AGENTS.md，没有 W070；CI 是否在三平台跑绿；会话开头是否有自检输出，接 SessionStart 钩子后能看到 linter、安装、测试结果，钩子不阻塞会话；契约大小是否受控，W101 在文件超过 32 KiB 时告警（Codex 默认在此截断），原文称典型契约在 1–4 KiB。linter 速度基线（来源数据，Python 3.13 / Linux / 4 vCPU / 本地盘 / 每档 200 次）：1.3 KiB 文件 check() 中位 0.21 ms、p95 0.36 ms，CLI 冷启动中位 50 ms；15.9 KiB 为 2.04 ms / 53 ms；31.9 KiB 为 3.91 ms / 56 ms；128 KiB 为 15.70 ms / 87 ms，随大小线性增长。加路径检查后在 31.9 KiB 为 7.85 ms；网络盘上路径检查明显变慢，可用 --no-paths 关掉。A/B 最小试用：用仓库的 bench/ab_test.py --runs 5（Claude Code headless claude -p，默认模型）先复现，再换成自己的 fixture 和任务。来源给出的 A/B 结果（注意局限）：得分 4.8→5.0；测试通过 5/5=5/5；只改权威来源 5/5=5/5；生成物同步且未手改 5/5=5/5；新增测试 5/5=5/5；写 CHANGELOG 4/5→5/5；平均步数 5.6→3.8，−32%；中位时间 18.2 s→12.9 s，−29%；平均成本 $0.091→$0.084，−8%。作者自己说明：5 次/条件远不足以统计显著；只有一个任务、仓库很小；只测了 Claude Code；模型与版本会影响结果；强模型在小仓库上自己能看到 DO NOT EDIT 注释并找到 run_tests.py，真正的质量差异只出现在从代码里根本推不出来的规则（CHANGELOG）上。试多久：作者称整套约一小时落地；A/B 以 5 次/条件为一轮先看方向，不要当统计结论。

**把计划与决策签入仓库（Tenex）**：主指标是人均每周完成任务数或故事点的趋势，前 4 周基线 vs 后 4 周；原文用的是全公司工程师人均每月故事点。防刷量看返工率——同一任务被重开的次数、上线后 2 周内被回滚或返修的比例；主指标涨、返工率也涨，说明在刷量。上下文供给看「为什么这么改」这类问题的平均解答耗时是否下降；新人上手到能独立提交第一个 PR 的天数。评审有效性看第二个模型每轮提出的实质问题数（不是风格问题）及被采纳比例；长期接近 0 说明在浪费 token。成本看 token 支出 / 人力支出；原文参照区间是 1:1 到 2:1，起步阶段明显低于此属正常。最小试用：2–3 人、1 个仓库、4 周。第 1 天写一页纸流程，建 docs/plan.md 与 docs/decisions/；第 1 周把一个需求写成计划 + 验收标准并签入，跑一次「主力模型写、第二个模型只评审」的完整回合，评审意见原样存进 docs/decisions/；之后每周每个任务结束要求 agent 追加一条决策记录，PR 必须带上；第 4 周拿基线对比，并开一次 30 分钟的故事点校准会。停止条件：文档没人读、agent 不引用，先修写入位置或颗粒度；4 周后主指标无变化而文档维护成本明显上升，按原文自己的说法这套结构对你们的规模就是 overkill，应及时收手。2 倍产出是作者口头估计，没有测量方法和口径；单公司、无对照实验，不要把这个试点当效果证明。

**claude-howto 最小试用**：基线是选一个真实代码仓库，记录 3 类任务（代码审查、PR 准备、API 文档）各做 3 次的耗时、返工次数、审查发现的有效问题数/误报数、测试通过率。只装三样：optimize.md slash command、project-CLAUDE.md、code-review-specialist skill；用 /optimize 和代码审查任务跑 5 次真实工作。再加一个低风险 hook：先只启用 format-code.sh，确认不会破坏文件；再加 security-scan.sh，记录每次扫描耗时（原文此处截断）。看返工是否减少、有效问题数是否增加、误报是否可接受、测试通过率是否稳定；如果三件套没有明显收益，先不要加 hooks/MCP/插件。不要拿 README 的「90% 能力没用上」「10x productivity」「production-ready templates」「Trusted by Developers」当效果数据；也不要拿仓库自身的 pytest、ruff、bandit、mypy、coverage 当使用效果。建议两周、单项目，不要一次性全装。

**Skill Recorder**：完成率——3 次复跑中有几次完整走到预期终态；人工接管次数——中途需要你接手（含被卡住、点错要回退）的次数，这是最关键的指标；耗时比——代理复跑耗时 / 手工耗时，包含你事后检查与返工的时间；录制成本回收周期——录一次加修一次技能花的时间，除以每次节省的时间；失败集中点——记录卡在什么动作上，例如弹窗、等待加载、窗口焦点切换，这些就是该工具当前的能力边界。最小试用（半天内可完成）：选一个你每周至少做 3 次、单次 5–15 分钟、以点击和终端命令为主、步骤基本固定的任务，避开含敏感凭证或客户数据的任务；到仓库确认安装方式、停止录制的方式、技能产物形态与代理接入方式；录一次，全程口述判断规则，回看记录是否覆盖关键步骤；让代理用该技能复跑 3 次，每次都从同样的初始状态出发；同一任务你自己手工做 3 次作为对照。判定建议：3 次里至少 2 次无需人工接管完成，且含检查时间后的总耗时低于手工，可以考虑纳入日常；否则保留为特定任务专用，或等版本成熟。材料只有推文，没有成功率、耗时或案例数据，以上验证方法需自建。

**tstack**：最小试用 1 周，选一个低风险、有 CI 的仓库，只启用 file-pr 和 babysit-pr（连带 leaving-pr-comments），跑 2–3 个真实 PR，合并权仍由人掌握。观察：file-pr 的 PR 描述首段是否真的先讲问题而不是罗列改动，可直接人工判 yes/no；babysit-pr 每个 PR 需要几轮修复才让 CI 变绿；它提交的修复里被人工判定为误报/噪声的比例；leaving-pr-comments 代发的评论是否可直接发给同事、不需改写；人工总耗时与不用技能时相比是增是减。第二步 2 周，加入 full-stop，仍保留人工点合并，核心指标是人工干预次数/PR，每个 PR 仍需你介入 3 次以上就不升级。第三步仅在「CI 能拦住问题 + 改动可回滚 + 非关键仓库」范围内试 1–2 次 full-send，记录是否出现需要 revert 的合并，出现一次即回退到 full-stop。开始试之前，先把 council 的模型组合、项目约定写进 CLAUDE.md/AGENTS.md，否则后续更新技能会丢掉配置，导致前后结果不可比。注意：原文没有给出任何验证指标或数据，以上是调研报告建议的自建验证方式，不是 tstack 的效果证明。

**质量门禁清单（dev-quality-gates，本次新增）**：选一个真实仓库，先只覆盖一个主语言加一个跨切面风险类别，不要全量安装。在可回滚的工作分支上运行 README 提示词，要求代理只输出计划；审阅计划是否满足「只选匹配条目、能非零退出、先证明能失败」。先批准 2 到 3 个最匹配的门禁，让代理接入 hooks 和 CI；对每个门禁制造一次已知违规，确认本地 hook 或 CI 确实失败。记录指标：计划中推荐数、实际接入数、成功证明能失败的数量、误报数量、CI 时长变化、修复一个违规所需时间。核心判断是「违规能否被稳定阻断」，而不是「报告是否好看」。若至少一个门禁捕获了真实问题或成功拦截构造违规，且误报和 CI 延迟可接受，再扩大到更多类别；若代理倾向安装过多工具、或门禁无法失败，则停止推广，只保留已验证的单个工具。试多久：材料没有给出固定时长，建议以 1–2 周或若干次提交为一轮，先看误报和阻断可靠性，不要拿 README 的策展声明当效果数据。

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
45. 干净会话里没看到 brainstorming 就继续写代码。应先用 Let's make a react todo list 验证触发，没触发就停下检查安装。
46. 忽略项目自有技能。原文说设计系统、verify、ship 等项目技能在对应步骤优先；不要让 Ryugi 覆盖它们。
47. 把 just code it 当常态。它会跳过 executing-specs 直接写代码；只有你明确想绕过规格流程时再用。
48. 把默认 squash、从不 merge commit 当团队规范。这是原文作者主张，落地方式要按团队实际选择。
49. UI 验收只看代码不看证据。verifying-ui 要求真实截图或录屏与已批准设计并排 pass/reject；没有证据不要宣布完成。
50. 默认开 worktree。原文说没有偏好时默认就地工作，只有冲突风险才开；不要把隔离当成默认动作。
51. 把 Ryugi 与第 7 步手工工作流同时跑。会重复规格和计划；小任务用第 7 步，需要规格前置和 UI 验收时选 Ryugi。
52. 在 Cursor / OpenCode 照猜完整命令。原文只给本地插件源和 .opencode/INSTALL.md，没有完整命令，不能编造。
53. 把 claude-howto 当新工具或一次全装。它是 Claude Code 的教程/模板层，不是替代品；先只装 /optimize、项目 CLAUDE.md、code-review-specialist 三件套。
54. 照 README 用 /plugin install 装 claude-howto 的插件。仓库没有 marketplace，/plugin install 不适用；要用 claude --plugin-dir 本地目录加载。
55. 注册 hooks 时覆盖已有 settings.json。应手动合并 hooks 块，尤其团队已有其他钩子时。
56. 一次把 33 个 hook 事件全配上。先只启用 PostToolUse + Write 的 format-code.sh，确认不破坏文件，再加 security-scan.sh。
57. 把 /self-assessment 和 /lesson-quiz 当效果证明。它们是学习自评和测验，不是生产力、缺陷率或 ROI 数据。
58. 把 claude-howto 仓库自身的 pytest、ruff、bandit、mypy、coverage 当使用效果。那是维护指南脚本的测试，不是使用该指南后工作改善的证据。
59. MCP 命令里硬编码 PAT 或提交凭据。README 提醒不要硬编码凭据、不要提交敏感数据；用环境变量或本地配置。
60. 把 README 的「90% 的能力没用上」「10x productivity」「production-ready templates」「Trusted by Developers」当数据。这些是作者主张，没有基准测试或客户案例。
61. 把 checkpoints 当版本控制替代。/rewind 用于高风险试验回退，不是 git 的替代。
62. 在材料截断处补写指标。claude-howto 的 security-scan.sh 说明在「记录每次扫描耗」处截断，不要编造耗时阈值或误报率。
63. 自动化一个不存在的流程。原文说不能自动化不存在的流程；先写一页纸现状，再谈文档和 CLI。
64. 把 MetaHarness 当现成模板照搬。原文只有流程描述，没有模板、目录结构、CLI 命令或提示词；第 20 步的 docs 结构是本手册示意，不是原文。
65. 让评审模型改代码。评审模型只出意见、不改代码，否则和主力模型互相覆盖。
66. 把第二个模型当形式。长期提不出实质问题就停掉，别为「双模型」烧 token；原文说 Codex 做 review 效果最好是个人偏好。
67. 只给 agent 人写的摘要，不把原始记录落进 repo。原文强调把客户能说的全部说出来，把这一整份东西直接交给模型，才更接近 90% 的解法。
68. 把故事点当绝对真理。至少每季度校准一次评分标准，否则模型变强后点贬值，激励失真。
69. 只看人均故事点上涨，不看返工率。主指标涨、返工也涨，是在刷量，不是真改善。
70. 单人单项目小团队照搬重结构。原文自己说 MetaHarness 对一个小团队的一个项目可能是 overkill。
71. 企业非工程场景没解决 RBAC 就上生产智能体。原文点名权限与 RBAC 是企业第二大痛点，且材料在权限网关处截断。
72. 照抄播客里的模型名。Opus 5.5 等名字来自自动转写，无法独立核实，不要把模型名当配置。
73. 把 2 倍产出当统计结论。作者原话 roughly，没有测量方法和口径，也没有对照实验。
74. 把文档签入当自动推进。原文没有讲定时触发、事件驱动或状态机式自动推进，只能算间接支撑；不要据此写自动化调度步骤。
75. 把 MetaHarness 和提交门禁、测试规则、项目契约混为一谈。它管计划、决策、验收标准和评审，不保证违规提交失败，也不验证测试是否真的在验证行为。
76. 把 readouts 直接当客户交付物。原文只说有面向客户的可视化小册子并签入，没有给模板和审阅流程；对外使用前要自己定审阅。
77. 把 Skill Recorder 的推文当完整文档。材料只有三句话加链接卡片，安装方式、停止录制、产物格式、支持代理、触发方式、平台覆盖均未说明；先到仓库确认，不要凭推测操作。
78. 录制前不确认敏感数据落盘位置。原文说录制过程在本机进行，但这是产品侧表述，未经第三方核对；含敏感凭证或客户数据的任务先确认录制数据的落盘位置与清除方式。
79. 拿一次性任务去录制。录制式技能适合步骤稳定、重复频率高的桌面或终端任务；一次性任务不值得录，也不适合沉淀。
80. 录完不读一遍就把技能交给代理。录制产物可能漏掉窗口切换、终端命令或判断规则；先人工回看记录是否覆盖关键步骤，再让代理复跑。
81. 只装 full-send 不装依赖。full-send 依赖 sol-loop、file-pr、babysit-pr，full-stop 依赖 full-send，缺一个会调用失败；按第 22 步的依赖图补齐。
82. 一上来就用 full-send。原文自述是「没人看着」直接合并；先用 file-pr 和 babysit-pr，再加 full-stop，最后才在低风险仓库试 full-send。
83. 改技能本体来放个人配置。像 council 用哪几个模型这类设置要写进 CLAUDE.md / AGENTS.md，否则更新技能时会被覆盖。
84. 以为 council / sol-loop 在任何 harness 都能用。它们需要能调用其他厂商模型 subagent 的 harness；没有等价能力时这两个技能不可用。
85. 把「每天在用」当效果证据。tstack 材料没有 benchmark、PR 数量或合并成功率；约 32 stars 是个人工作流仓库，成熟度未经外部检验。
86. 在非 GitHub、非 PR 式协作里硬套 tstack。整套东西假设你的工作在 GitHub PR 流程里，且愿意把 PR 生命周期交给 agent。
87. 把 full-send 用在生产关键路径。至少要有能拦住的 CI、review bot、改动可回滚；不具备时不要用，出现一次需要 revert 的合并就回退到 full-stop。
88. 只触发 file-pr 就以为 PR 描述合格。要人工判首段是否先讲问题，而不是罗列改动；不合格就改技能或提示。
89. 把 dev-quality-gates 当通用技术栈全量安装。README 明确说不是通用技术栈，不要全部安装；先只覆盖一个主语言加一个跨切面风险类别。
90. 跳过「证明能失败」这一步。只出报告、不阻断的检查不算完成；每个新门禁都要制造一次已知违规，确认非零退出并阻断 CI。
91. 在材料未提供 adopt.md / patterns.md 正文时照猜配置。本次材料只有 README，原文还在 Under review 表格处截断；完整安装命令和配置要到仓库原文核对，不能编造。
92. 让代理一次改太多。先要求代理只出计划，人工审阅后再改；如果代理倾向安装过多工具，先缩小范围。
93. 把本地 hook 当 CI 的替代。hook 可被 `--no-verify` 绕过，CI 中仍要运行全量检查。
94. 把清单的策展声明当效果证明。README 说所有条目在 2026-10-23 做过一次检查，但这是一次 sweep，不是独立评审；没有给出采用后代码质量改善的量化数据。

## 证据与来源

- **来源一**：GitHub 仓库 wesammustafa/Claude-Code-Everything-You-Need-to-Know 的 README，约 3095 stars，以调研报告形式并入。可核验内容：第 8 步的路径表、7 个 slash skill 名称、/claude-md-review、/stale-docs-audit、notification.py、settings.json 用 CLAUDE_PROJECT_DIR 调 uv run。数据或数字均为原报告所述：约 3095 stars；视觉迭代通常 2–3 轮；同一流程重复 ≥3 次才固化 skill；约 80% 的想开 max 情形正解在上游；5 个子智能体加 10 个角色提示词。属于作者主张、未经本项目验证：五个扩展点的对照表与组合建议、三条工作流的具体步骤、effort 是行为旋钮的心智模型与等级选择建议、Opus 规划 / Sonnet 执行、按模型分的 effort 默认值列表、hooks 的三类团队用途。版本声明用前核对。
- **来源二**：Simon Willison 博客 2026-10-13 收集的一条引言，出自 Geoffrey Huntley 的文章。原文只给了三件事：改 AGENTS.md 不管用，仍有落差而且会漂移；改用 pre-commit hook 检查 git diff 里有没有直接调用 observability 模块、绕过 diagnostics 模块；有就 fail 掉提交并注入请使用 diagnostics 库的提示，效果 ten out of ten。完全没有的：hook 代码、匹配规则、提示词原文、误报率、团队规模、项目类型、时间跨度。ten out of ten 是主观评分，未定义如何测量；做法 A 比做法 B 有效这个结论本身也只是作者主张。
- **来源三**：GitHub 仓库 ztt0216/MyAgent 的 README，36 stars，MIT，一个 Python 实现的通用 Agent Runtime。可核对的内容：完整目录结构、端到端运行链路、Skills 自进化链路、审计产物路径、测试覆盖范围与 CI 版本、可直接照抄的安装 / .env / 启动 / 权限模式 / 反馈写法。属于作者主张、没有证据：Runtime 可阅读、可扩展、适合作为二次开发基础、自进化能稳定沉淀可复用规则等价值判断；README 没有 benchmark 分数、任务成功率、耗时或 token 节省数据，没有真实使用案例或前后对比实验，没有展示实际生成或合并出的 SKILL.md 内容，没有自进化的命中率或误沉淀率。材料仅为 README，未核对源代码；项目是 36 stars 个人项目；材料在怎么试、怎么验证一节被截断。
- **来源四**：一条推文 @kloss_xyz，标题称 vibe 编码时应在 AGENTS.md 中加入 7 条规则。采集时原文被截断：标题说 7 条，正文只完整给出第 1 条，第 2 条只出现编号 2. 就中断。可核对内容：第 1 条的完整文字，即绝不编辑、跳过或删除测试来让测试通过；对自己编写的每个测试，都要确认如果被测代码什么都不做这个测试会失败；如果仍然通过就重写这个测试。数据只有推文互动量：91 赞、4 次转发、31 条回复，没有项目案例、失败率或前后对比数据。一个绿色的测试套件是代理最容易伪造的东西属于作者主张，原文未给出证据。原文被截断，不能据此推断其余 6 条；第 16 步中空实现检查的步骤与 pytest 命令示例来自来源四原文；git diff --stat HEAD~1 HEAD -- '*test*' '*spec*' 是调研报告补写的最小可执行检查方式，不是推文给出的。
- **来源五**：GitHub 仓库 AntoGA/agents-contract 的 README，约 40 stars、单人维护、俄文。可核对的内容：五个必填分节与可选 Lessons；linter 的错误级检查与警告级检查；--json、--strict、--check-commands、-r 与退出码 0/1/2；SessionStart 钩子跑 linter、装依赖、跑测试，输出进上下文，永远退出 0；AGENTS_SETUP / AGENTS_TEST / AGENTS_SKIP_TESTS 环境变量；Windows 用 .claude/settings.windows.example.json。数据：linter 速度基线；A/B 结果得分 4.8→5.0、平均步数 5.6→3.8、中位时间 18.2 s→12.9 s、平均成本 $0.091→$0.084；linter 自身 15 个单元测试，CI 在三平台跑。属于作者主张、没有数据：Cursor / Copilot 也读 AGENTS.md；一小时落地；大仓库上差距应该更大；Lessons 长期收益最大；不绑厂商。A/B 日期写作 18.10.2026，无法核实，可能是笔误。局限：5 次/条件远不足以统计显著；只有一个任务、仓库很小；只测了 Claude Code；模型与版本会影响结果；强模型在小仓库上不要契约也能过；仓库仅约 40 stars、单人维护，未见第三方复现。本手册把它当小范围试验、不直接全员采用。
- **来源六**：@mattpocockuk 的一条推文，建议在小范围代码库试装预提交钩子。可核对的内容：只检查暂存文件；按 tokens = bytes / 4 估算；单文件超过 5,000 就阻止提交；忽略锁文件、代码生成文件等非代理编写文件；错误信息中给出明确的文件拆分说明。属于作者主张、没有数据：这是其代码库中「最简单的投资。太好了。」；推文有 4,084 次点赞、170 次转发、223 条回复，只能说明关注度，不能证明该做法在结果上有效。原文没有完整钩子代码、具体框架配置或实际案例数据；没有说明如何处理二进制文件、超大文件、不同编码或误报，也没有给出拆分错误信息的具体写法。第 11 步做法 C 的步骤与指标是把推文建议落成可操作检查，其中取暂存文件的示意命令和错误信息写法由本手册补写，不是推文原文。
- **来源七**：GitHub 仓库 Innei/ryugi 的 README，47 stars。可核对的内容：Claude Code 安装命令、部分 harness 安装命令、Let's make a react todo list 安装验证方法、brainstorming / executing-specs / per-task TDD / one fresh review / verifying-ui 的流程描述、just code it 跳过执行规格、ledger 跨 compaction、worktree 触发条件、默认 squash 与 never a merge commit、npx ryugi-artifacts 及 start/stop/publish 子命令。属于作者主张、没有数据：两小时自主推进、不问 should I continue、技能自动触发无需手动 invoke、ledger 能跨 compaction 保留判断、默认落地方式适合所有团队。原文是 README，未验证实际安装后的行为；作为 Superpowers v7.0.0 的 fork，还需关注与上游差异和后续维护；Cursor、OpenCode 没有完整安装命令。本手册把它当可选工作流小范围试，不直接全员采用。
- **来源八**：GitHub 仓库 luongnv89/claude-howto 的 README，MIT 许可，版本标注 v2.1.302，兼容 Claude Code 2.1+。可核对的内容：10 个模块的目录与用途、/optimize、project-CLAUDE.md、directory-api-CLAUDE.md、personal-CLAUDE.md、code-review-specialist、04-subagents、05-mcp、06-hooks 脚本与 settings.json JSON、07-plugins 的 --plugin-dir 用法、/rewind 六个选项、claude -p / -r / --output-format json、/self-assessment 与 /lesson-quiz、claude mcp add 命令。数据：README 称 10 个模块；完整学习路径 11–13 小时；15 分钟可完成第一个 slash command；1 小时 essential setup；hooks 有 5 种类型、33 个事件、4 个类别；GitHub 指标为 43,460 stars、今日 177 stars。属于作者主张、没有数据或未展开：模板正文与脚本质量未在材料中展开；90% 的能力没用上、10x productivity、production-ready templates、Trusted by Developers 属于作者主张，没有基准测试、前后对比或客户案例；示例工作流只有流程描述，没有实际输出和失败率；模型列表在材料末尾被截断。仓库自身的 pytest、ruff、bandit、mypy、coverage 是维护该指南脚本的测试，不是使用该指南后工作改善的证据。本手册只把第 19 步当两周单项目小范围试用，不直接全员采用；MCP 与 hooks 的安全前提按 README 提醒执行，未展开的部分不补写。
- **来源九**：播客转写 Alex Lieberman & CJ Hess 关于 Tenex 的访谈，经 Latent Space 渠道。可核对内容：Tenex 约 75 人，约 90% 为工程师或 AI 策略师；客户约一半 Fortune 2000、一半营收 1–5 亿美元中型企业；MetaHarness 由共享技能集、标准化项目文档和外层 CLI 组成；计划、决策、验收标准、证据随代码签入 Git；agent 把决策和进度写回仓库；双模型 Opus 驱动 + Codex 评审，同一台机器来回，云端用 AMP orb；每季度校准故事点评分；主指标为全公司工程师人均月故事点；企业非工程场景先解决数据权限/RBAC。数据：工程师之间薪酬差距约 4 倍（作者否定 10 倍说法）；token 支出 : 人力支出 ≈ 1:1 到 2:1；大多数公司每人 10–200 美元，AI 原生公司约折合人力支出 10%；约 100 家在谈企业的落地阶梯为通用 LLM 90%、培训赋能 60%、工程团队编码代理约 50%、非工程生产级智能体约 5%；今年工程师产出约 2 倍；Kill My SaaS 72 份提交中人类评委第一名在 AI 评委排行榜只排第 19，被替换工具年费 4.3 万美元。属于作者主张、没有数据：2 倍产出是 CJ 的口头估计；Opus 覆盖全区间、Codex 做 review 效果最好是个人偏好；各阶梯百分比来自 Tenex 自身在谈客户样本，作者是卖 AI 转型服务的利益相关方；上下文全进 repo 就能让 agent 自己推进是机制解释，没有对照数据。局限：原文是自动转写播客稿，开头声明可能有误、说话人未标注；模型名无法独立核实；MetaHarness 没有模板、目录结构、CLI 命令、提示词；文本在 Is there anythi 处截断，权限网关后续缺失；单公司、无对照实验。第 20 步的 docs 目录和决策记录字段是本手册按原文要素拼装的最小示意，不是原文内容。
- **来源十**：@RoundtableSpace 的推文，称微软开源 Skill Recorder（仓库 microsoft/skill-recorder，原文提到最新 Release 为 v0.7.0，4.3K 星）。可核对的信息：录制快捷键 macOS 为 ⌘⇧R、Windows 为 Ctrl+Shift+R；捕获鼠标点击、应用/窗口切换、页面、终端命令；录制过程在本机进行；支持边做边大声讲解；推文互动 137 赞 / 16 转发 / 15 回复。属于作者主张、未见数据：「教会你的 AI 代理为你执行它」没有复跑成功率、演示案例或失败场景说明；「都在你的机器上进行」是产品侧隐私表述，未经第三方核对。局限：材料仅一条推文，仓库文档、输出格式、支持的代理、平台覆盖、停止录制方式、触发方式全部缺失；v0.7.0 属于早期迭代，接口与行为可能变动。本手册第 21 步只把它当小范围试用，不当作已验证的日常流程。
- **来源十一**：GitHub 仓库 t3dotgg/tstack 的 README，MIT，约 32 stars。可核对的内容：9 个技能的名称、口头触发词与作用；安装命令 git clone 后 cp -R 到 ~/.claude/skills/ 和 ~/.codex/skills/；前置条件 gh auth login、python3、council/sol-loop 需要能调用其他厂商模型 subagent 的 harness；技能依赖图（full-send 依赖 sol-loop、file-pr、babysit-pr；full-stop 依赖 full-send；takeover 依赖 modernize、file-pr、babysit-pr、leaving-pr-comments；file-pr、babysit-pr、modernize 依赖 leaving-pr-comments）；把个人配置写进 CLAUDE.md / AGENTS.md；先 full-stop 后 full-send 的保守起步建议。属于作者主张、没有数据：「每天在用」是作者自述；没有 benchmark、PR 数量、合并成功率或前后对比；约 32 stars 是个人工作流仓库，成熟度未经外部检验；技能本体（提示词、脚本、pr-wait 实现）不在材料中，无法核验它怎么拆解任务、怎么配置、质量如何；部分技能依赖 T3 Code 的 delegate_task，没有等价 harness 时 council / sol-loop 不可用。局限：原文是 README，未验证实际安装后的行为；接口和文件随时可能变。本手册第 22 步的 1 周/2 周试用顺序和观测指标是调研报告建议的自建验证方式，不是 tstack 原文的数据或效果证明。
- **来源十二（本次新增）**：GitHub 仓库 mokevnin/dev-quality-gates 的 README。可核对的内容：按任务推荐一个质量门禁工具（少数两个）、说明为什么选和不适用；核心原则包括按任务选一个工具、覆盖优先于数量、优先快速原生工具链、必须能阻断构建（非零退出码）而不只是出报告、对 AI 编码代理友好、没有可靠推荐就留空；README 给出的代理提示词（Apply https://github.com/mokevnin/dev-quality-gates to this repository. Read and follow ... Show me the plan before you change anything.）；推荐用 mise.toml 固定工具版本、hk.pkl 让本地 hook 和 CI 跑同一套检查；命令包括 mise use hk、hk check、hk fix、hk check --all；要求对每个门禁证明能失败；清单按语言和跨切面类别组织，并明确说不是通用技术栈、不要全部安装。属于作者主张、没有数据或未展开：采用后代码质量改善的量化数据没有给出；主要论据是设计原则、工具限制说明和少量实测标注；adopt.md、patterns.md、tools.json 和 research 目录正文未包含，原文还在 Under review 表格处截断，因此无法核对完整接入步骤、具体配置和逐条研究证据；README 说所有条目在 2026-10-23 做过一次检查，但这是一次 sweep，不是独立评审；多个推荐工具较新、pre-1.0 或由单一维护者维护，部分工具未验证退出码、部分需要额外插件或付费能力。局限：材料只有 README，未验证实际安装后的行为；第 23 步的试用顺序、指标和「先覆盖一个主语言加一个跨切面风险类别」是调研报告建议的自建验证方式，不是 dev-quality-gates 原文的效果证明。

## 依据的调研

- [wesammustafa/Claude-Code-Everything-You-Need-to-Know](../research/radar/2026-10-05/1337-wesammustafa-claude-code-everything-you-need-to-kn.md)：值得一试，把这份仓库当成 Claude Code 的实操手册素材来源，重点抄它的三个工作流（Explore→Plan→Code→Commit、TDD、视觉迭代）、skills/hooks 的文件级配置步骤和「能力发现/任务匹配」两张对照表，先在自己的项目里小范围试；但原文在子智能体、动态工作流、Agent Teams、MCP 四节被截断，且其中大量 2026 年模型名与价格无法核验，不要照抄具体数字。
- [Quoting Geoffrey Huntley](../research/radar/2026-10-13/2961-quoting-geoffrey-huntley.md)：值得一试，把架构约束从 AGENTS.md 这类提示文件搬到 pre-commit hook：提交时检查 git diff，发现绕过内部库（如 diagnostics 模块）的调用就让提交失败，并把纠正指令写进失败输出、交给编码智能体自纠。理由是把“靠提醒”变成“事件触发的强制门禁”，避免规则随上下文漂移；但原文只有一段口述、没有代码与量化数据，需自行补齐实现后小范围验证。
- [ztt0216/MyAgent](../research/radar/2026-10-17/4080-ztt0216-myagent.md)：值得一试，可以小范围试：按 README 用 OpenAI-compatible 接口（示例里就有 deepseek-chat）把 MyAgent 在本地跑起来，重点验证 Plan Mode 的只读审批和 Skills 自进化能否把反馈沉淀成可复用规则；它给了可照抄的安装、.env、权限模式和反馈写法，但只有作者主张、没有评测数据，先在自己的小任务上跑通再决定是否写进手册。
- [@kloss_xyz: 如果你正在进行 vibe 编码，你需要在你的 AGENTS.md 中添加这 7 条规则：](../research/radar/2026-10-17/4151-vibe-agents-md-7.md)：值得一试，把原文唯一完整给出的那条规则（禁止为凑绿而改测试，且每个新测试都要先验证“被测代码什么都不做时会失败”）抄进单个项目的 AGENTS.md 试一轮，因为它是一条可直接落地、可自检的常驻约束；但原文只露出 7 条中的第 1 条，其余被截断，且仅凭作者主张，不宜直接全面采用。
- [AntoGA/agents-contract](../research/radar/2026-10-19/4924-antoga-agents-contract.md)：值得一试，按照 README 的做法，在一个有隐性规则的真实仓库里落地五段式 AGENTS.md、零依赖 linter 和 Claude Code SessionStart 钩子，并把 bench 脚本换成自己的任务做小规模 A/B 验证；这些步骤具体可照做、成本约一小时、跨工具复用，但作者自己说明只有 5 次单任务、且只测了 Claude Code，质量提升也只体现在从代码里推不出来的规则上，所以先小范围试，暂不直接全员采用。
- [@mattpocockuk: 今天的提示：](../research/radar/2026-10-19/4969-item.md)：值得一试，建议在小范围代码库试装这个预提交钩子：只检查暂存文件，按“字节数/4”估算令牌数，单文件超过 5,000 就阻止提交并给出拆分说明；规则具体、成本低，但原文没有实现代码和效果数据，需先验证误报率及对代理写码行为的改善。
- [Innei/ryugi](../research/radar/2026-10-22/5940-innei-ryugi.md)：值得一试，建议在已使用的编码智能体 harness 中小范围试用 Ryugi：选一个带测试和 UI 验收需求的小任务，按“头脑风暴→批准规格→TDD 实现→一次复审→UI 验收”走完，并用是否先出规格、红绿测试记录、UI 验收轮次和返工次数判断效果。理由是安装命令和工作流步骤足够具体，但原文只有作者主张，缺少量化效果证据。
- [luongnv89/claude-howto](../research/radar/2026-10-23/6224-luongnv89-claude-howto.md)：值得一试，建议小范围试：先在单个项目复制 `/optimize`、项目 `CLAUDE.md` 和 `code-review-specialist` skill，再按需加 hooks/MCP；理由是 README 给出了可照抄的安装命令、hooks 配置和 CLI 用法，但模板正文与效果数据未在材料中展开，需先验证再推广。
- [AI for the Fortune 2000: How Tenex Builds an AI-Native SDLC — Alex Lieberman & CJ Hess](../research/radar/2026-10-23/6323-ai-for-the-fortune-2000-how-tenex-builds-an-ai-nat.md)：值得一试，建议小范围试：在一个多人协作的代码仓库里照搬 Tenex 的 MetaHarness 最小版——把计划、决策和验收标准随代码一起签入 Git，并要求智能体把过程写回仓库，再配一套“主力模型驱动 + 第二个模型评审”双模型互查，用每月人均故事点趋势判断是否有效。理由是原文给出了可照做的流程轮廓和衡量口径，但没有模板与命令，2 倍产出也只是作者口头估计，所以先在一个项目上验证，再决定是否铺开。
- [@RoundtableSpace: 微软开源了一款应用，它可以观察你执行一次任务，然后教会你的 AI 代理为你执行它。4.3K 星。](../research/radar/2026-10-24/6644-ai-4-3k.md)：值得一试，先用快捷键录一遍你自己反复做的桌面或终端任务，把录下来的技能交给代理复跑 3 次，并对照手工执行结果，再决定是否纳入日常流程；理由是这条线索把“人示范一次”直接转换成“代理可复用技能”，正好对应任务移交与条件供给问题，但原文只有三步概述，产物格式、触发方式和可靠性都需到仓库和实测中确认。
- [t3dotgg/tstack](../research/radar/2026-10-25/6799-t3dotgg-tstack.md)：值得一试，先把 tstack 装到单个低风险仓库，只用 file-pr 和 babysit-pr 跑两三个真实 PR，暂不给自动合并权限；因为 README 给出了可直接复制的安装命令、技能依赖图和明确的前置条件，但技能本体内容不在材料里，效果没有数据支撑。
- [mokevnin/dev-quality-gates](../research/radar/2026-10-25/6885-mokevnin-dev-quality-gates.md)：值得一试，建议在单个代码库小范围试用：在仓库根目录让编码代理按 README 的提示词先出计划，只接入与项目栈匹配的少量质量门禁，并逐个证明能失败。理由是该仓库给出了可复制的代理提示词和按任务选工具的清单，但 adopt.md、patterns.md 未包含在材料中，且清单明确声明不是通用栈，需要先验证再推广。
