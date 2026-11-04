# 把编码 agent 的工作流程固化成可检查、可回退的团队资产

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决编码 agent 重复消耗提示词、流程漂移、完成无证据、配置不可复制和权限不可见的问题。
> 先试这一步：先选一个每周重复至少 3 次的流程做成 skill，并给一条能被 diff 判定的硬约束加提交门禁；配置层方案先在隔离环境试装并跑校验。
> 最近修订：2026-11-04

## 解决什么问题

用编码 agent 干活时，一次性对话会反复消耗：同一流程重写提示词、上下文差导致跑偏、项目约定散落漂移、做完了没证据、绿色测试可能是改测试改出来的、这次怎么做对的靠人整理。本手册以 Claude Code 为主线，把重复提示词和流程固化成技能、钩子、子智能体，用固定工作流控制先探索再计划后写代码最后提交；把可判定的硬约束从提示文件搬到提交门禁；用五段式 AGENTS.md + 零依赖 linter + SessionStart 钩子让项目契约可检查。MyAgent、Ryugi、claude-howto、Tenex、Skill Recorder、tstack、dev-quality-gates、Claude-Code-Game-Studios 是可选路线。

roost 路线把产品想法塑形成 epic，按切片逐块构建，再走 review、close-out、release QA 和 rollout；agent 干活，但在命名检查点停下来让人做决定，发布命令由人自己执行。它补的是带人工检查点的端到端规格驱动流程，不替代提交门禁、测试真实性检查、项目契约 linter 和最小多角色模板。

本次新增 ai-config 路线：它把 Claude Code 与 Codex 的配置、技能、角色、工作流和 hooks 做成版本化配置层，安装后跑清单与单元测试校验，确认“装对了、没漂移”；但它 macOS-first，Codex 默认是高权限，必须先在隔离环境试装并复核权限与隐私。

## 适用与不适用

适用于流程固化：有真实项目、改动可用测试或截图验证、愿意按文件审阅配置。适用于提交门禁：存在能被 diff 文本模式判定的硬约束，有 pre-commit，agent 能读到失败输出；不适用于只能靠人判断好坏的约束。适用于文件大小门禁：有预提交钩子、主要约束代理编写的代码文件、接受 bytes/4 估算；不适用没有钩子或要求精确 token。适用于 MyAgent：想自动沉淀反馈、先只读计划再审批、能读 Python 3.11+、自备模型接口；不适用不能自备 key 或不愿接受 --yolo 风险。适用于测试规则：已有测试框架和 AGENTS.md、代理会读 AGENTS.md；不适用没有自动化测试。适用于项目契约：有隐性规则、希望多工具复用 AGENTS.md、愿意跑 Python 3.9+ linter；不适用指望 linter 检查规则合理性。适用于 claude-howto：已在用 Claude Code 2.1+，想做两周单项目模板试用；不适用想一键安装或要 ROI 数据。适用于 Tenex：多人多项目、需要长期维护和交代决策、愿意签入计划与决策；不适用单人单项目或流程不存在。适用于 Skill Recorder：任务步骤稳定、每周至少 3 次、单次 5–15 分钟、以点击和终端命令为主；不适用一次性任务或含敏感数据未确认落盘。适用于 tstack：工作在 GitHub PR 流程、有 CI 和 review bot、已认证 gh；不适用非 GitHub 或没有 CI。适用于 dev-quality-gates：有真实代码库、愿意先让代理出计划、只选匹配门禁并逐个证明能失败；不适用想全部安装或材料未给完整配置就照猜。适用于 Claude-Code-Game-Studios：有 1–2 天能完成但需要多角色协作的小项目，愿意在项目根目录启动 Claude Code、保留默认 hooks 和权限规则、用 minimal 严谨度起步、用运行截图/观察证据关闭玩家可见内容；不适用于想整仓照搬到非游戏业务、不愿装 Python/Bash/jq、在子目录启动、只靠测试绿灯关闭任务，或要求外部复现数据。

roost 适用于：单仓库、单个小型 epic，团队使用 Claude Code，且 tracker 是 Jira（Atlassian MCP）或 GitHub Issues（gh），测试管理是 Xray（Cucumber）或 repo 里的 eval cases，代码在 GitHub 且 gh 可用，堆叠 PR 时 gh stack 可用；如果是 app，还要 Playwright MCP 和一条命令能起来的本地栈（Aspire、Docker Compose 或自己的脚本），库或插件项目不需要这两项。它适合愿意在计划审批、切片检查点、close-out 和 runbook 每一步停下来做决定的人。不适用于：没有 tracker 或测试工具、没有 GitHub/gh、不能提供环境变量凭据、期望 agent 自动 merge/deploy、要求完整 Cursor/Codex/Copilot/Gemini CLI 支持、或只凭 30 stars 和作者自述就要全团队 adopt。roost 目前强绑定 Claude Code + Jira/Xray/gh stack，Cursor 只有部分 skill 可用。

ai-config 适用于：macOS-first 环境，已装 Bash、Git、Python 3.11+，需要 bundled writing tools 和 shadcn MCP 时已装 Node.js 18+，Claude Code、Codex 已另行安装，希望把共享技能、8 个 agent 角色、工作流提示、hooks 和设计标准版本化，并愿意把凭据、本地设置、个人上下文、记忆、会话留在本地。不适用于：非 macOS 环境、不能接受 Codex 默认 danger-full-access 与 approval policy never、不愿修改本机链接和配置、没有隔离环境做试装、要求效果数据或一键生产接入、或不愿读配置与隐私文档就直接接真实仓库。

## 前置条件

Claude Code：macOS/Linux/WSL，Windows 用官方 PowerShell/CMD；Anthropic 账号；项目可写 .claude/；提交门禁需 git 和 pre-commit；agent 能读 hook 输出。MyAgent：Python 3.11+、macOS/Linux、Git、模型接口 key/base URL/model；自进化写 skill 需写权限。测试规则：可运行测试命令、根目录 AGENTS.md、代理有读写权限。项目契约：git、Python 3.9+；SessionStart 需 Claude Code；CI 用仓库里的 agents-lint.yml，不能照 README 手写。claude-howto：Claude Code 2.1+、项目目录、MCP 凭据、hooks 可执行权限；已有 settings.json 手动合并。Tenex：多人 git 仓库、2–3 人 1 仓 4 周试点、能写一页纸流程、agent 有写权限、两个模型入口读同一仓库、有故事点或等价单位。Skill Recorder：先到仓库确认安装、停止录制、产物形态、支持代理和触发方式；录制可能含敏感信息，先确认落盘与清除。tstack：gh auth login、python3、仓库 push/PR/merge 权限；council/sol-loop 需要能调用其他厂商模型 subagent 的 harness。dev-quality-gates：从仓库根目录开始，代理能读 GitHub 原始文件、改仓库、跑命令；人工审阅计划后才改；用 mise/hk 时能安装；CI 跑全量检查，因为 hook 可被 --no-verify 绕过；材料只有 README，adopt.md/patterns.md 正文未包含。游戏工作室模板：Git、Claude Code、Python 3、Bash，推荐 jq；项目根目录含 CLAUDE.md 和 project.yaml；Windows 用 Git Bash；缺 Python 会静默回退到默认设置，提交暂存数据 JSON 时会被阻止；必须在根目录启动，否则跳过 hooks、deny 规则和 ask-first 权限模式；保留默认 hooks 和 settings.json 权限规则；游戏测试放 tests/，模板自检用 studio-tests。

roost 前置：Claude Code，每个 repo 一个 session；tracker 为 Jira（走 Atlassian MCP）或 GitHub Issues（走 gh CLI）；测试管理为 Xray（Cucumber 场景）或 repo 里的 eval cases；GitHub + gh CLI，堆叠 PR 还要 gh stack 扩展；app 需 Playwright MCP + 一条命令能起来的本地栈，库/插件项目不需要这两项。凭据只通过环境变量提供：Jira 用 JIRA_EMAIL、JIRA_API_TOKEN；Xray 用 XRAY_CLIENT_ID、XRAY_CLIENT_SECRET。README 明确警告：某个 skill 所需工具缺失时安装会静默失败，所以先按 README 的 What each skill needs 表核对，再开工。README 的 examples/config.example.yml 和 config-schema.md 不在本次材料正文，实施时必须打开读。

ai-config 前置：README 说明这是 macOS-first，需要 Bash、Git、Python 3.11+；Node.js 18+ 用于 bundled writing tools 和 shadcn MCP；Claude Code、Codex 需另行安装，Bun 可选。安装前先读 docs/configuration.md#public-defaults-and-private-state 和 docs/privacy.md，确认能接受 README 明确写出的 Codex 默认值：danger-full-access 与 approval policy never。若不能接受，不要直接接入真实仓库、凭据或生产环境。先备份现有 ~/.claude 与 ~/.config/codex，在隔离的 macOS 用户或一次性环境中试装。第三方技能保留各自许可证，aside-browser 因上游无再分发许可只保留在本地、不在仓库中分发。材料只有 README，docs/skills.md、docs/configuration.md、docs/privacy.md 的具体内容未提供。

## 操作步骤

### 1. 安装与认证 Claude Code

macOS/Linux/WSL：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

备选 npm 需 Node.js 22+：

```bash
npm install -g @anthropic-ai/claude-code
```

运行 claude 首次浏览器登录。预期：claude 命令可用，会话可用。

### 2. 给提示并生成 CLAUDE.md

在项目目录运行 claude，试：

```text
explain what this codebase does
add a README section about installation
find and fix the failing test in src/api.test.ts
```

然后 /init 生成项目级 CLAUDE.md。CLAUDE.md 会成为 prompt 一部分，要持续迭代。硬约束更适合搬到提交门禁；若用五段式契约，CLAUDE.md 只写 @AGENTS.md 一行。

### 3. 决定要不要调 effort

```text
> ultrathink — design the migration strategy
/effort xhigh
/effort ultracode
/effort auto
```

Claude Code 只识别 ultrathink；think/think hard 是普通文本。更低 effort 用于快查询，medium 日常编码，high 多文件重构，xhigh 长时间自主，max 只用于架构、微妙 bug、安全评审且仅限单会话。用 /effort 在自己环境核对，不要照抄默认值。

### 4. 按任务形态决定建什么

同一 prompt 或流程重复 ≥3 次 → Skills（.claude/commands/*.md 或 .claude/skills/*/SKILL.md）；想自动跑 → Hooks（.claude/settings.json）；子任务需隔离上下文 → Subagents（.claude/agents/*.md）；智能体数量超过一次对话能协调 → Workflows；需外部工具 → MCP；跨会话团队规范 → Memory；成套流程 → 本地插件 claude --plugin-dir；复杂实现先出计划 → Planning Mode；长任务 → Background Tasks；高风险试验 → /rewind Checkpoints。多数配置只用到 2–3 个，不要过度上扩展点。

### 5. 三条工作流

做法 A（复杂问题）：Explore 只读文件和计划 → Plan 出计划（需要更深推理加 ultrathink）→ Code → Commit/PR/更新文档。做法 B（可测试改动）：先写测试并确认失败 → 提交测试 → 写代码到测试通过 → 提交代码。做法 C（有视觉稿）：给截图/视觉稿 → 实现、截图、对比迭代 → 满意后提交。迭代通常 2–3 轮。权限模式 Shift+Tab 在 default→acceptEdits→plan 间循环，可用时还有 bypassPermissions 和 auto；v2.1.283+ auto 是内置启动模式。

### 6. 按文件拷贝现成配置

```bash
git clone --depth 1 https://github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know /tmp/cc-guide
cp -r /tmp/cc-guide/.claude/commands/pr.md your-project/.claude/commands/
```

仓库有 /pr、/review、/tdd、/test、/five、/ux、/todo 等 slash skill，/claude-md-review Agent Skill，5 个子智能体加 10 个角色提示词，/stale-docs-audit 工作流，notification.py hook。安全警告：Skills、hooks、agents、workflows 是以你的权限运行的可执行指令，要逐文件复制并阅读，不要 cp -r 整个 .claude/。

### 7. 三分钟做出第一个 slash skill

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
claude
```

输入 /analyze 运行。升级为 Agent Skill：移到 .claude/skills/analyze/SKILL.md 并加 name/description frontmatter。Slash skill 主动敲 /；Agent Skill 可按 description 自动调用。命名冲突先匹配先赢：企业 > 个人 > 项目 > 插件 > 内置。

### 8. 按需配 hooks

Hooks 是生命周期检查点，脚本返回 allow/deny/modify。先只启用一个低风险 hook：保存后自动格式化；拦截 .env 等敏感路径；提交时门禁见第 9 步。不要一次配 33 个事件。

### 9. 把硬约束做成提交门禁

做法 A（推荐，规则能被 diff 文本模式判定）：选一条硬约束；写 pre-commit 读取 git diff --cached；用模式匹配找违规调用；失败时非零退出并把给 agent 的纠正提示写进输出；让 agent 重跑直到提交通过；规则写在 hook 里当代码维护。来源是 Geoffrey Huntley 口述：改 AGENTS.md 不管用，改用 pre-commit 检查绕过 diagnostics 模块，失败输出注入提示，效果作者称 ten out of ten；没有 hook 代码、匹配规则、提示词原文或数据。

做法 B（主观约束或偏好）：写进 CLAUDE.md/AGENTS.md，靠上下文提醒；代价是会有落差并漂移。

做法 C（文件大小门禁）：预提交只取本次暂存文件：

```sh
git diff --cached --name-only --diff-filter=ACM
```

排除锁文件和代码生成文件；按 tokens = bytes/4 估算；单文件超过 5,000 阻止提交；错误信息写清如何拆分。先只观察误报，不改其他提交规范。注意 W101 是 AGENTS.md 超过 32 KiB 告警，与做法 C 不是一回事。

### 10. MyAgent：只读计划与反馈自动沉淀

装依赖并配 .env（三种写法任选）：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m agents.main
```

.env 示例：

```env
APIKEY=sk-your-api-key
API=https://your-host/anthropic
MODEL=claude-sonnet-4-6
```

协议规则：API 路径含 /anthropic 按 Anthropic-compatible，否则有 OpenAI base URL 按 OpenAI-compatible；--model 覆盖 MODEL。Plan Mode：

```bash
python3 -m agents.main --plan "分析 Skills 检索逻辑应该如何优化"
```

Plan Mode 阻断写操作和 Shell。自进化：

```bash
BEAR_AUTO_SKILL_EVOLUTION=1 BEAR_AUTO_SKILL_TARGET=project python3 -m agents.main --accept-edits
```

目标 project 写 <project>/.bear/skills/<skill_name>/SKILL.md，user 写 ~/.bear/skills/<skill_name>/SKILL.md。只沉淀稳定、明确、未来同类任务仍适用的规则；审计产物在 .bear/skill-evolution/。先跑 python -m pytest -q，但测试不调用模型，全绿不等于端到端有效。

### 11. 用 AGENTS.md 约束测试凑绿，并做空实现检查

在根目录 AGENTS.md 追加：

```markdown
## Testing rules

1. Never edit, skip, or delete a test to make it pass.
2. For every test you write, verify that it FAILS if the code under test does nothing.
   If it still passes, rewrite the test.
```

让代理新写测试后，把被测函数临时改成空实现，重跑该测试：

```bash
pytest tests/test_xxx.py::test_yyy -q
```

预期 FAILED；恢复实现后预期 PASSED。合并前抽查：

```bash
git diff --stat HEAD~1 HEAD -- '*test*' '*spec*'
```

该 git 命令是调研报告补的最小检查方式，不是推文原文。这条规则走提示文件，不是 hook 门禁；测试是否真的验证行为通常不是 diff 能判定的。

### 12. 把 AGENTS.md 做成五段式契约，用 linter 和 SessionStart 防漂移

做法 A（跨工具，先验证契约）：

```bash
git clone https://github.com/AntoGA/agents-contract /tmp/agents-contract
cp /tmp/agents-contract/templates/AGENTS.md /tmp/agents-contract/templates/CLAUDE.md .
mkdir -p scripts .claude
cp /tmp/agents-contract/scripts/* scripts/
if [ ! -f .claude/settings.json ]; then cp /tmp/agents-contract/.claude/settings.json .claude/; fi
python3 scripts/agents_lint.py
```

填写五个必填分节：Project、Commands（测试写成 - Test: 一行）、Conventions、Boundaries、Definition of Done；可选 Lessons。清掉 <...>、TODO、TBD、FIXME，不写密钥。linter 命令：

```bash
python3 scripts/agents_lint.py --strict
python3 scripts/agents_lint.py --check-commands
python3 scripts/agents_lint.py --json
python3 scripts/agents_lint.py -r
```

退出码 0 通过，1 有错误（--strict 警告也算失败），2 调用错误。CLAUDE.md 只写 @AGENTS.md，否则 W070 警告。CI 用仓库里的 .github/workflows/agents-lint.yml，不能照 README 手写。做法 B：加 SessionStart 钩子，设 AGENTS_SETUP、AGENTS_TEST，AGENTS_SKIP_TESTS=1 可关测试；Windows 用 settings.windows.example.json；钩子永远退出 0。每次 agent 犯错在 Lessons 加一行。

### 13. Ryugi：先规格、再 TDD、最后 UI 验收（可选）

Claude Code 安装：

```text
/plugin marketplace add Innei/ryugi
/plugin install ryugi@ryugi-dev
```

干净会话发 Let's make a react todo list 验证 brainstorming 是否触发；没触发先停下检查安装。流程：brainstorming → 批准 spec → executing-specs 切任务 → 每任务 TDD（RED-GREEN-REFACTOR）→ one fresh review → verifying-ui 用真实截图/录屏并排 pass/reject → 人工落地。默认 squash，从不 merge commit；没有偏好时就地工作，只有冲突风险才开 worktree。npx ryugi-artifacts 预览 .ryugi/artifacts/。原文只有 README 和 47 stars，两小时自主推进等是作者主张。

### 14. claude-howto：两周单项目最小试用（可选）

做法 A 最小三件套：

```bash
git clone https://github.com/luongnv89/claude-howto.git
mkdir -p /path/to/your-project/.claude/commands
cp 01-slash-commands/optimize.md /path/to/your-project/.claude/commands/
cp 02-memory/project-CLAUDE.md /path/to/your-project/CLAUDE.md
cp -r 03-skills/code-review-specialist /path/to/project/.claude/skills/
```

用 /optimize 和代码审查跑 5 次真实工作，记录耗时、返工、有效问题/误报、测试通过率。做法 B 加低风险 hook：复制 06-hooks/*.sh 并 chmod +x，在 settings.json 的 PostToolUse Write matcher 先只启用 format-code.sh，再加 security-scan.sh，已有 settings.json 手动合并。做法 C 用 /rewind、claude -p 运行提示词、--output-format json、/self-assessment、/lesson-quiz。做法 D 需要外部数据再配 MCP，不要硬编码凭据。插件用 claude --plugin-dir 本地加载，仓库没有 marketplace，/plugin install 不适用。README 的 90% 能力没用上、10x productivity 是作者主张。

### 15. Tenex：把计划、决策和验收标准签入仓库（可选）

先确认流程存在：一页纸写清从需求到上线。建最小文档层：

```text
repo/
  docs/
    plan.md
    decisions/
    readouts/
  src/
```

这是本手册按原文要素拼的最小示意，不是原文模板。让 agent 把在做什么、为什么写回仓库；每条决策一个文件，写背景、选了什么、否掉了什么、证据；PR 必须带上。重复三次以上的周边动作再包 CLI。做法 B：主力模型写，第二个模型只评审、不改代码；评审意见原样存 docs/decisions/。做法 C：每季度校准故事点；看人均月故事点趋势、返工率、上下文供给、评审实质问题数、token/人力支出。2–3 人 1 仓 4 周试点；单人单项目可能 overkill。企业非工程场景先解决数据权限/RBAC。

### 16. Skill Recorder：把人工示范录成可复跑技能（可选）

先到仓库确认安装、停止录制、产物形态、支持代理和触发方式；材料只有推文。选每周至少 3 次、单次 5–15 分钟、步骤稳定的任务，避开敏感数据。录制快捷键：macOS ⌘⇧R，Windows Ctrl+Shift+R。边做边大声讲解判断依据。录完先人工回看是否覆盖关键步骤，再让代理复跑 3 次，每次同样初始状态；同一任务自己手工做 3 次对照。3 次里至少 2 次无需人工接管且含检查时间总耗时低于手工，才考虑纳入日常。

### 17. tstack：把 PR 生命周期交给窄技能（可选）

前置：gh auth login、python3、仓库权限；council/sol-loop 需要能调用其他厂商模型 subagent 的 harness。安装：

```bash
git clone https://github.com/t3dotgg/tstack
cp -R tstack/skills/* ~/.claude/skills/
cp -R tstack/skills/* ~/.codex/skills/
```

依赖图：full-send 依赖 sol-loop、file-pr、babysit-pr；full-stop 依赖 full-send；takeover 依赖 modernize、file-pr、babysit-pr、leaving-pr-comments；file-pr、babysit-pr、modernize 依赖 leaving-pr-comments。个人配置写进 CLAUDE.md/AGENTS.md，不要改技能本体。做法 A 只启用 file-pr 和 babysit-pr（连带 leaving-pr-comments），合并权留人；做法 B 加 full-stop，仍人工点合并；做法 C 仅在 CI 能拦住、改动可回滚、非生产关键路径试 1–2 次 full-send，出现一次需 revert 就回退。跑 2–3 个真实 PR，记录首段是否先讲问题、CI 修复轮数、误报比例、评论是否可直接发、人工总耗时。

### 18. dev-quality-gates：让代理先出计划、再接入少量门禁（可选）

从目标仓库根目录向编码代理发 README 提示词：

```text
Apply https://github.com/mokevnin/dev-quality-gates to this repository.
Read and follow https://raw.githubusercontent.com/mokevnin/dev-quality-gates/main/docs/adopt.md.
Show me the plan before you change anything.
```

审阅计划：只选与项目语言和跨切面风险匹配的条目，不全部安装，优先能非零退出、对代理友好的工具，诚实标出没有可靠推荐的类别。计划确认后再改。若采用 mise/hk：

```text
mise use hk
hk check
hk fix
hk check --all
```

对每个新门禁制造一次已知违规，确认返回非零退出码并阻断 CI；只出报告不算完成。先只覆盖一个主语言加一个跨切面风险类别；至少一个门禁捕获真实问题或成功拦截构造违规，且误报和 CI 延迟可接受，再扩大。材料只有 README，adopt.md/patterns.md 正文未包含，不能照猜完整安装命令或配置。

### 19. Claude-Code-Game-Studios：多角色协作与证据门禁（可选）

来源背景：Donchitos/Claude-Code-Game-Studios 是 MIT 模板仓库，README 声称 49 个代理、74 个 skills、15 个 hooks、14 条路径规则、62 个文档模板；代理分导演层、部门主管层、专家层；协作协议是先提问、再给 2–4 个带优劣的选项、用户决定、出草稿、用户批准才落盘。它不是自动驾驶员。

做法 A（推荐起点：minimal 闭环）

1. 确认前置：Git、Claude Code、Python 3、Bash，推荐 jq；必须在项目根目录启动，目录包含 CLAUDE.md 和 project.yaml。克隆：

```bash
git clone https://github.com/Donchitos/Claude-Code-Game-Studios.git my-game
cd my-game
claude
```

预期：从根目录启动，hooks、deny 规则和 ask-first 权限模式生效。

2. 用 /start 做入口，它会问当前阶段再引导；已知需求可直接跳转：

```text
/start
/brainstorm
/setup-engine godot 4.7
/project-stage-detect
```

3. 先跑 minimal 闭环：/start → /setup-engine → /brainstorm（一页 brief）→ /create-stories → /dev-story ↔ /story-done。项目变大再加 /create-epics、/sprint-plan、/design-review、/code-review、/qa-plan、/gate-check。

```text
/start
/setup-engine
/brainstorm
/create-stories
/dev-story
/story-done
```

4. 用 /settings 调严谨度。project.yaml 是单一事实源，modes.rigor 有 minimal、standard、full，默认 minimal；它覆盖 workflow、docs.density、qa.level、story_granularity、review_mode、team.size。写 project.yaml 是团队级，--local 写 project.local.yaml 是个人级；review_mode 和 team.size 可个人覆盖。

```text
/settings
/settings modes.review_mode
/settings modes.rigor=full
/settings --local modes.review_mode=solo
```

5. 需要多代理共同做功能时用团队编排 skills：/team-combat、/team-narrative、/team-ui、/team-release、/team-polish、/team-audio、/team-level、/team-live-ops、/team-qa。代理层级是角色资历，不是计费方案；README 说三个导演代理在 frontmatter 要求 Opus，lead-programmer 和十五个专家指定 Sonnet，其余继承会话模型。

6. 保留默认 hooks 和权限规则。validate-commit.sh 提交前检查硬编码值、TODO 格式、JSON 有效性和设计文档章节；validate-push.sh 对受保护分支推送、打 tag、merge、发布给警告；validate-read.sh 拒绝整文件读取超过 40 KB 的设计文档；validate-write.sh 只警告；validate-assets.sh 检查数据 JSON 和资源命名；detect-gaps.sh 会话开始发现新项目缺设计文档；log-agent.sh 记录子代理审计轨迹；validate-agent-artifact.sh 在子代理停止但没写简报指定文件时警告。注意 git 规则会在命令文本中匹配 push 后跟 + 或 -f、clean 后跟 -f、reset 后跟 --hard，提交信息里出现类似片段也可能被拒绝。

7. 用证据门槛关闭故事：任何改变玩家可见内容的故事，不能只靠测试通过就关闭；必须启动游戏、观察、截图并保存到 production/qa/evidence/。解析检查不等于运行；minimal 可以豁免自动测试，但不能豁免看一眼。

8. 修改模板后用 studio-tests 验证框架本身，游戏测试放 tests/：

```text
/skill-test static [name]
/skill-test category [name]
/skill-test spec [name]
/skill-test audit
/skill-improve [name]
```

/skill-test static 做 7 项结构合规检查；category 做分类质量 rubric；spec 做行为规格断言；audit 做覆盖报告；/skill-improve 走测试—修复—复测循环，按分数变化决定保留或回退。

做法 B（按需升档）：minimal 稳定后，再对需要更严格流程的项目用 /settings modes.rigor=full 或单独调 review_mode/team.size；不要一上来 full。README 的作者自测：同一 brief 用 minimal 与 standard 构建，minimal 在写第一行游戏代码前只有 1 份文档、耗时 0 分钟；standard 有 30 份文档、耗时 58 分钟；两者都产出可运行且测试过的游戏，但两名盲审和一次真人试玩把 standard 版本排在最后。作者据此认为多出的 29 份文档买到的是可追溯性，不是更好的游戏；这是内部比较，不是外部复现，且表格只展示两档。

怎么选：第一次试这个模板 → 做法 A，只跑 minimal 闭环，保留默认 hooks；minimal 稳定且你需要更严格评审/文档 → 做法 B 升档；你想整仓照搬到非游戏业务 → 不要这样做，README 没有给出迁移步骤；你要硬约束必须发生 → 仍用第 9 步提交门禁；要测试真实 → 第 11 步空实现检查；要项目契约可检查 → 第 12 步 linter；要 PR 尾巴 → 第 17 步 tstack。

### 20. roost：从 epic 到发布 QA 的规格驱动闭环（可选）

来源背景：Beakpoint-Insights/roost 是 MIT 的 Claude Code 插件式 skills 集合，不是独立 agent，本身不托管服务；README 约 30 stars，作者自称每天用于自家产品，未见第三方数据。它主张规格驱动不能停在写完代码，要继续走 review、close-out、release QA 和 rollout。人机分工是：agent 干活，但在命名检查点停下来让人做决定；rollout 的每条命令由人自己执行。

做法 A（推荐起点：单仓库、单小型 epic 跑完整闭环）

1. 核对前置：Claude Code，每个 repo 一个 session；tracker 为 Jira（Atlassian MCP）或 GitHub Issues（gh）；测试管理为 Xray（Cucumber）或 repo eval cases；GitHub + gh，堆叠 PR 还要 gh stack；app 需 Playwright MCP + 一条命令能起来的本地栈（Aspire、Docker Compose 或自己的脚本），库/插件项目不需要这两项。凭据用环境变量：JIRA_EMAIL、JIRA_API_TOKEN、XRAY_CLIENT_ID、XRAY_CLIENT_SECRET。先按 README 的 What each skill needs 表核对；README 警告缺工具时安装会静默失败。预期：所有必需工具可用，凭据只从环境变量取。

2. 安装插件：

```text
/plugin marketplace add Beakpoint-Insights/roost
/plugin install roost@roost
```

装后 skill 以 roost:<skill> 形式可用。预期：在 Claude Code 里能看到 roost 的 skill。

3. 写团队配置：

```text
/roost:setup
```

它要么链接已有共享配置，要么逐个询问后生成。配置查找顺序：你显式指定的路径 > $ROOST_CONFIG > 当前 repo 的 .roost/config.yml > ~/.claude/roost/config.yml。多团队或单机多配置时，orchestrator 看不到 repo 内配置，要用 ROOST_CONFIG=<that team's config> claude 启动。机器级差异写到 ~/.claude/roost/local/<team.name>.yml，只在本机覆盖团队共享配置。团队共享配置可放私有 repo，再链接到 ~/.claude/roost/config.yml。配置永不存密钥，只写从哪里取。README 可见 key：tracker.kind、tests.kind、vcs.stacking、vcs.host、repos、stack，deploy/design/qa 可选，roadmap.skill。当前支持 Jira/GitHub Issues、Xray/repo eval cases、gh stack/普通 PR、GitHub；Linear、Graphite、GitLab、Gherkin 文件、Cursor 完整支持、Codex、Copilot、Gemini CLI 在 roadmap。examples/config.example.yml 和 config-schema.md 不在本次材料正文，必须打开读。

4. 搭会话拓扑：每个 repo 一个 worker session，例如后端 API session、前端 UI session；orchestrator 在任意位置打开，它从不编辑任何 repo，只把活分发给其他 session 并把结果带回来。预期：orchestrator 不产生代码改动。

5. 塑形 epic：

```text
/roost:shape-epic New customers should be able to send data within minutes of signing up.
```

它跑七个阶段：problem、epic、design、slices、tests、build guide、handoff，每个阶段结束都与你确认。产物落到 epic 上：含问题、目标、范围描述的 epic；基于设计系统的原型；按切片拆的有序 stories；每个 story 的测试；build guide 与 tech lead prompt。预期：每个 story 小到能独立交付。

6. 规划构建并审批：在 orchestrator 里说 Build PROJ-1234。build-epic 不提问直接开跑，先做规划：把 epic 的 tech lead prompt 发给 lead repo 的 session，后者在新开的 gh stack 上写实现计划；你审批计划或要求修改；计划末尾固定有 Rollout needed: yes or no，合并+部署不够时填 yes；lead session 为每个 repo 在每个 story 上贴 kickoff comment，在 epic 上贴 Release order comment；需要 rollout 时创建 deploy ticket 并跑 write-runbook，runbook 每个阶段成为该 ticket 的子任务，编号与名称一一对应。预期：没有你的计划批准，不进入构建。

7. 逐切片构建：build-epic 用 run-slice 按顺序构建每个 story。各 repo 的 session 按配置顺序、依据自己的 kickoff comment 构建自己那部分；stack 的 owner 在它们之间启动本地栈，使后建 repo 对着前一个 repo 的真实成果构建。持有 e2e 套件的 session 用 verify-slice-tests 核对该 story 的测试，每个 session 对自己的 stack 跑 /code-review。检查点会收到汇总的测试结果与评审发现，每条带建议（现在修 / 之后开票 / 跳过），由你拍板。session 对现在修的项以测试先行方式修复；e2e session 在真实浏览器里手工验证该切片，发现的 bug 以同样方式回到你面前。slice-handoff 把剩余项归入下一个切片/发布前/以后，归置结果由你确认，跑一遍 epic 到目前为止的全部测试，并按实际建成的东西重写下一个 story 的 kickoff comment。然后下一个 story 自动开始。每个 repo 在每个切片的部分、每个 bug 修复，都是 epic stack 上独立的 PR，Release order comment 列出全部 PR 的合并顺序。预期：每个检查点都有人做决定，而不是全自动推进。

8. 发布前收口：修完发布前项（bug 走 run-bug 与 bug-bash），epic 的全部测试再跑一遍。review-epic：每个 session 对 main 做整 epic 的 /code-review（高 effort），服务端代码额外做 /security-review，重点盯没有任何切片评审看过的代码，每条发现由你决定。close-out-epic：每张未关 ticket 都要有归宿（发布前修 / 移到后续 epic / 独立），由你确认；发布后检查生产确实跑了这个 epic，并主动提议起草 release note。e2e session 跑 release-qa：完整 e2e、探索性测试、给出发布结论。预期：没有未关 ticket 悄悄消失。

9. 发布：roost 不替你 merge、不替你 deploy。对它说：

```text
let's run the PROJ-1234 runbook together
```

pair-runbook 带着你一次一步地走 deploy ticket 的 runbook：给你命令和预期结果，你自己执行并粘贴输出，它校验结果、填写本次运行记录、关闭该步子任务；每个阶段的门禁都停下来等你放行。合 stack 也是 runbook 的一步，stacked-prs 协助解冲突。预期：每条发布命令都有人执行并留下输出。

10. 沉淀团队自有 skill：只对你们团队有意义的 skill（公司格式的 roadmap、给董事会的报告）放进自己的私有插件，与配置文件放在一起。roost 的 skill 可以调用它们，例如 shape-epic 会调用 roadmap.skill 指定的 skill 把 epic 放到 roadmap 上。新增 tracker 或测试工具时，加一个 adapter 文件并更新支持表。预期：团队流程不写进 roost 本体。

做法 B（Cursor 里用，能力受限）：先 clone 再链接：

```bash
git clone https://github.com/Beakpoint-Insights/roost.git ~/src/roost
~/src/roost/scripts/link-skills.sh
```

换目录用 scripts/link-skills.sh ~/.agents/skills；撤销用 scripts/link-skills.sh --remove。配置放 ~/.claude/roost/config.yml 或设 ROOST_CONFIG。注意：run-slice、build-epic、run-bug、review-epic 不能用（它们要给别的 Claude Code session 发消息，Cursor 做不到）；retro 不能用（读 Claude Code transcript）；slice-handoff 部分可用（排序、tracker 更新、stack 检查可用，epic 测试那一步要手动在各 repo 跑）；shape-epic 部分可用（问题陈述、切片、测试可用，原型/artifact/tech lead 交接要在 Claude Code 里跑）。预期：只把 Cursor 当部分入口，不指望完整闭环。

怎么选：第一次试 roost → 做法 A，单仓库、单小型 epic 跑完整闭环；只要提交门禁/测试真实性/项目契约 → 用第 9、11、12 步，不装 roost；非 GitHub/Jira/Claude Code 为主 → 不要硬套；要 agent 自动 merge/deploy → 不适合 roost；材料只有 README，成熟度只有作者自述和 30 stars，先试用不要直接全团队 adopt。

### 21. ai-config：把配置、技能和权限做成可版本化资产（本次新增，可选）

来源背景：salexandr0s/ai-config 是面向 Claude Code 与 Codex 的版本化配置仓库，README 声称含 78 个 bundled skills、2 个 assistant、46 个 Claude bindings 和 74 个 Codex bindings，并提供 8 个 agent 角色、工作流提示、hooks、设计标准、安装器和校验脚本。公共默认配置放在仓库，凭据、本地设置、个人上下文、记忆、会话等私有状态留在本地。它不是替代 Claude Code，而是叠加在现有助手之上的配置层；README 约 50 stars，未附效果数据。

做法 A（推荐起点：隔离环境默认安装，先证明装对没漂移）

1. 前提与安全复核（必须先做）：确认 macOS-first，Bash、Git、Python 3.11+；需要 bundled writing tools 和 shadcn MCP 时确认 Node.js 18+；Claude Code、Codex 已另行安装，Bun 可选。先读 docs/configuration.md#public-defaults-and-private-state 和 docs/privacy.md，确认能接受 README 明确写出的 Codex 默认值：danger-full-access 与 approval policy never。若不能接受，不要直接接入真实仓库、凭据或生产环境。先备份现有 ~/.claude 与 ~/.config/codex，在隔离的 macOS 用户或一次性环境中试装。预期：知道默认权限风险，已有可回退点。

2. 默认安装：在仓库目录执行安装器。README 说明默认会链接配置、skills、commands、workflows，不构建 browser daemon，也不启动后台任务；被替换的 tool-link 会备份，Codex 配置会合并、校验并重新生成，私有 overlay 会保留。

```sh
git clone https://github.com/salexandr0s/ai-config.git
cd ai-config
./install.sh
```

预期：安装完成，链接和配置生成无异常。

3. 按需启用可选组件：需要浏览器守护进程时用 Bun 构建；需要在 macOS 上做每周 memory rotation 时启用 LaunchAgent。

```sh
./install.sh --with-browse
./install.sh --with-launchagent
```

预期：只启用你真正需要的组件；默认安装不启用它们。

4. 指定工作区位置：如果工作区不在已有的 ~/GitHub，用参数指定。

```sh
./install.sh --workspace "$HOME/Projects"
```

预期：工作区路径按你的实际目录生效。

5. 把私有状态留在 Git 外：README 给出的对应关系是：claude/settings.json 对应 ~/.claude/settings.local.json；codex/config.base.toml 对应 ~/.config/codex/config.local.toml；空白 claude/user/ 模板对应 ~/.claude/USER/ 个人上下文。凭据、本地设置、可信项目路径、个人身份文件、memory、sessions、caches、session journals 都不要放进仓库。预期：私有状态不进入版本库。

6. 调用工作流：在 Claude Code 中可直接使用 slash commands。

```text
/workflow-feature add a settings page
/workflow-bugfix investigate a failed save
/workflow-review-only review the authentication module
```

在 Codex CLI 中可直接调用已安装的 prompt templates。

```sh
codex '$config-editor audit the current configuration'
codex "Follow $HOME/.codex/workflows/feature.md to implement a settings page"
```

预期：Claude Code 与 Codex 都能调用对应工作流。

7. 安装后校验：进入仓库后运行以下命令。--installed 只报告差异，不替换本地 skills。

```sh
python3 scripts/skills-inventory.py --check
python3 scripts/skills-inventory.py --installed
python3 -B scripts/verify-avoid-ai-writing.py
python3 -B -m unittest discover -s tests -v
```

预期：安装层无异常；清单、已安装差异、写作技能验证、hooks/配置/安装/技能打包的单元测试都通过。注意这些校验只证明“装对了、没漂移”，不能证明工作结果改善。

8. 有意修改技能后的维护：先审查来源与 notices，再刷新清单；然后重跑安装器刷新链接，私有 overlay 会保留。

```sh
python3 scripts/skills-inventory.py --refresh
./install.sh
```

预期：清单与链接刷新，私有状态仍留在本地。

9. 最小试用：在低风险仓库用 /workflow-review-only 做一次代码审查，用 /workflow-feature 做一个小功能。先设基线：同一任务用普通 Claude Code/Codex 会话或人工审查完成，对照记录完成时间、人工修改次数、返工轮次、测试通过情况、评审发现问题数与误报数、是否发生越权或隐私暴露、是否需要回滚。安装层以校验命令通过、私有 overlay 未进入 Git、Codex 权限符合预期为门槛；任务层至少要求结果不差于基线且有一项明确改善，才进入下一轮。若出现权限或隐私问题，立即停止并回退。

做法 B（按需启用可选组件）：默认安装稳定后，再根据实际需要加 --with-browse 或 --with-launchagent；不要一上来全开。怎么选：第一次试 ai-config → 做法 A，隔离环境、默认安装、只跑安装层校验和一个小功能/一次 review-only；需要浏览器守护进程或每周 memory rotation → 做法 B 按需加；不能接受 Codex 高权限默认 → 不接入真实仓库，或先不采用；要效果数据 → 当前材料没有，先按基线对照试用。

## 怎么判断变好了

流程固化：同一 prompt 重复 ≥3 次就建 skill；Plan 阶段没写代码，Explore 只读；TDD 测试在实现前真的红过一次；视觉迭代 2–3 轮对齐；用 /effort 在自己环境核对。提交门禁：违规提交率下降、首次提交即通过比例上升、每次触发后修复轮数减少、人工 review 同类问题减少、误报可控；对照 A 组只靠 AGENTS.md，B 组 hook 门禁 + 失败提示。文件大小门禁：只在暂存文件触发、忽略锁文件和生成文件、超限被阻止、错误信息能指导拆分、误报可接受。MyAgent：Plan Mode 获批前无写操作/Shell；SKILL.md 出现或更新；审计产物可查来源与版本；人工读生成的 skill。测试规则：改测试凑绿次数少、空实现检查通过比例高、返工少。项目契约：linter 零错误、--strict 无可接受警告、CLAUDE.md 只有 @AGENTS.md 无 W070、CI 三平台绿、会话开头有自检输出、W101 在 32 KiB 告警；linter 速度基线引用来源数据，A/B 5 次/条件不是统计显著。Tenex：人均周故事点/任务数趋势，前 4 周基线 vs 后 4 周；返工率防刷量；为什么这么改的解答耗时；评审实质问题数和采纳比例；token/人力支出。claude-howto：两周单项目，三件套跑 5 次，记录耗时、返工、有效问题/误报、测试通过率；三件套无明显收益先不要加 hooks/MCP。Skill Recorder：3 次复跑至少 2 次无需人工接管且含检查时间总耗时低于手工；记录完成率、接管次数、耗时比、失败集中点。tstack：1 周只启用 file-pr 和 babysit-pr，跑 2–3 个真实 PR；看首段是否先讲问题、CI 修复轮数、误报/噪声比例、评论可直接发、人工总耗时；再加 full-stop 看人工干预次数/PR，3 次以上不升级；full-send 仅在 CI 能拦住、可回滚、非关键仓库试 1–2 次，出现 revert 即回退。dev-quality-gates：选真实仓库，先只覆盖一个主语言加一个跨切面风险类别；记录推荐数、接入数、成功证明能失败数、误报数、CI 时长变化、修复一个违规所需时间；核心是违规能否被稳定阻断。游戏工作室模板：用 1–2 天小任务、独立仓库/分支，先跑 minimal 闭环；记录闭环是否完成、关闭故事是否有 production/qa/evidence/ 截图或观察记录、review_mode 人数是否符合需要、/skill-test audit 是否通过、是否出现子目录启动丢 hooks、git 规则误伤提交信息；minimal 与 standard 的 1 vs 30 份文档、0 vs 58 分钟、盲审排名只是作者自测，不要当统计结论。

roost：建议在单个仓库、单个小型 epic 上安装后跑一遍完整流程（shape-epic → 计划审批 → 逐切片构建 → 发布 QA → pair-runbook），只跑一个 epic 或 1–2 个切片就停。记录人工介入次数、计划返工轮数、漏到 release-qa 的缺陷数、检查点是否真的改变了决定、runbook 是否每一步都有执行输出、orchestrator 是否始终没有编辑 repo。如果 shape-epic 阶段反复卡住，或计划审批后仍频繁返工，先别扩大。30 stars 和作者自述不是成熟度证据，不能当作 adopt 依据。

ai-config：先在一个低风险仓库做一轮最小试用，不设固定时长，满足门槛再进入下一轮。安装层看四条校验命令是否通过、--installed 是否只报告差异、私有 overlay 是否未进入 Git、Codex 权限是否符合预期；任务层用一次 /workflow-review-only 和一次 /workflow-feature 与普通会话或人工基线对照，记录完成时间、人工修改次数、返工轮次、测试通过情况、评审发现问题数与误报数、是否发生越权或隐私暴露、是否需要回滚。安装层只是“装对没漂移”，任务层至少不差于基线且有一项明确改善才继续；出现权限或隐私问题立即停止并回退。50 stars、78 skills、8 roles、46/74 bindings 都是 README 自述，不是效果证据，不能当作全团队 adopt 依据。

## 常见坑

1. 把 think/think hard/think harder 当开关；只识别 ultrathink。2. 以为 effort 越高越聪明；更高不等于更聪明，max 仅单会话且写不进 settings.json。3. cp -r 整个 .claude/；Skills/hooks/agents/workflows 是以你的权限运行的可执行指令，要逐文件读。4. 把版本时点数字当事实；用 /effort 自己核对。5. 命名冲突搞错；企业 > 个人 > 项目 > 插件 > 内置，本地 skill 不替换内置命令别名。6. 过度上扩展点；主会话放得下就别上子智能体。7. 拿半截资料硬做；材料截断处不补步骤。8. 拿不可判定约束上 hook；模式匹配会误报漏报。9. 规则写进 hook 就不管；变更时要同步 hook 与匹配模式。10. 反馈通道没打通；agent 读不到失败输出就只会提交失败。11. 把 ten out of ten 当数据。12. 以为开了自进化就不用管 skill；要人工抽查生成的 SKILL.md。13. Plan Mode 下等它改文件；它阻断写操作和 Shell。14. 用 --yolo 当默认；README 也不建议长期默认。15. 把 pytest 全绿当端到端有效；测试不调用模型。16. 把 README 示例 model 名当事实。17. 目标配错，skill 写错地方；project 写 .bear/skills/，user 写 ~/.bear/skills/。18. 把审计产物当效果证明。19. 拿半截 MyAgent 资料硬做。20. 把测试改绿当完成。21. 空实现检查搞错对象；只对新写测试做，恢复后确认变绿。22. 把 7 条规则当完整清单抄；原文只完整给第 1 条。23. 没有测试的项目硬套。24. 误把补写的 git 命令当原文。25. 以为写进 AGENTS.md 就等于必须发生。26. 把 linter 当语义检查；它只查结构、占位、路径、命令、密钥、大小。27. 覆盖已有 .claude/settings.json。28. 照 README 手写 CI workflow。29. 把 5 次 A/B 当统计显著。30. 同时维护 AGENTS.md 和 CLAUDE.md 两份规则。31. 把 Cursor/Copilot 当已验证。32. 忘 linter 运行前提。33. 把 Lessons 当自动沉淀。34. 把测试规则和契约 linter 混为一谈。35. 文件大小门禁跑全仓库。36. 忘排除锁文件和生成文件。37. 把 bytes/4 当精确 token。38. 超限只报错不给拆分说明。39. 把 5,000 当普适阈值。40. 把 W101 和做法 C 混为一谈。41. 把推文点赞当效果证据。42. 把 Ryugi 当已量化验证。43. 多 harness 只装一个。44. 没装 Node.js 却用 ryugi-artifacts。45. 干净会话没看到 brainstorming 就继续写代码。46. 忽略项目自有技能。47. 把 just code it 当常态。48. 把默认 squash、从不 merge commit 当团队规范。49. UI 验收只看代码不看证据。50. 默认开 worktree。51. 把 Ryugi 与第 5 步手工工作流同时跑。52. 在 Cursor/OpenCode 照猜完整命令。53. 把 claude-howto 当新工具或一次全装。54. 照 README 用 /plugin install 装 claude-howto 插件。55. 注册 hooks 覆盖已有 settings.json。56. 一次配 33 个 hook 事件。57. 把 /self-assessment 和 /lesson-quiz 当效果证明。58. 把仓库自身 pytest/ruff/bandit/mypy/coverage 当使用效果。59. MCP 命令硬编码 PAT 或提交凭据。60. 把 README 的 90% 能力没用上、10x productivity 当数据。61. 把 checkpoints 当版本控制替代。62. 在材料截断处补写指标。63. 自动化一个不存在的流程。64. 把 MetaHarness 当现成模板照搬。65. 让评审模型改代码。66. 把第二个模型当形式。67. 只给 agent 人写摘要，不把原始记录落 repo。68. 把故事点当绝对真理。69. 只看人均故事点上涨不看返工率。70. 单人单项目小团队照搬重结构。71. 企业非工程场景没解决 RBAC 就上生产智能体。72. 照抄播客模型名。73. 把 2 倍产出当统计结论。74. 把文档签入当自动推进。75. 把 MetaHarness 和提交门禁、测试规则、项目契约混为一谈。76. 把 readouts 直接当客户交付物。77. 把 Skill Recorder 推文当完整文档。78. 录制前不确认敏感数据落盘位置。79. 拿一次性任务去录制。80. 录完不读一遍就交给代理。81. 只装 full-send 不装依赖。82. 一上来就用 full-send。83. 改技能本体来放个人配置。84. 以为 council/sol-loop 在任何 harness 都能用。85. 把每天在用当效果证据。86. 在非 GitHub、非 PR 式协作硬套 tstack。87. 把 full-send 用在生产关键路径。88. 只触发 file-pr 就以为 PR 描述合格。89. 把 dev-quality-gates 当通用技术栈全量安装。90. 跳过证明能失败。91. 材料未提供 adopt.md/patterns.md 时照猜配置。92. 让代理一次改太多。93. 把本地 hook 当 CI 替代。94. 把清单策展声明当效果证明。95. 在子目录启动游戏工作室模板；会跳过 hooks、deny 规则和 ask-first 权限模式。96. 缺 Python 3 硬跑；所有设置会静默回退，提交暂存数据 JSON 会被阻止。97. 把代理层级当计费方案；那是角色资历。98. 一上来把 modes.rigor 升到 full；先用 minimal 闭环，项目变大再升。99. 只看测试绿灯关闭玩家可见故事；必须启动、观察、截图存 production/qa/evidence/。100. 把游戏工作室模板整仓照搬到非游戏业务；README 没有迁移步骤。101. 把作者自测的 1 vs 30 份文档、0 vs 58 分钟当外部复现；表格只展示两档。102. 忽略 git 规则误伤提交信息；提交信息出现 push +、clean -f、reset --hard 类似片段可能被拒绝。103. 把 /settings 写错层级；写 project.yaml 是团队级，--local 写个人级。104. 改模板后不跑 /skill-test 和 /skill-improve；框架本身会腐坏。105. 把 49/74/15/14/62 当已核对源码；材料只依据 README，未审阅源码。

106. 缺工具硬装 roost；README 说会静默失败，先按 What each skill needs 表核对。107. 把 roost 当自动驾驶员；它不替你 merge、不替你 deploy，rollout 每条命令由人执行。108. 让 orchestrator 编辑 repo；它只分发和回收结果，不产生代码改动。109. 在 roost 配置里写密钥；配置只写密钥从哪里取。110. 不读 examples/config.example.yml 和 config-schema.md 就猜 key；本次材料未包含这两份正文。111. 多团队不设 ROOST_CONFIG；orchestrator 在 repo 外运行，看不到 repo 内 .roost/config.yml。112. 在 Cursor 里用 run-slice、build-epic、run-bug、review-epic、retro；这些要么不能用，要么只能部分替代。113. 跳过计划审批或切片检查点；roost 的设计就是让人在命名检查点拍板。114. 让 release-qa 结论替代人工 runbook；发布命令仍由人执行并粘贴输出。115. 把 30 stars 和作者自述当 adopt 证据。116. 把 roadmap 里的 Linear、Graphite、GitLab、Codex 等当已支持。117. 把 roost 和提交门禁、测试空实现检查、项目契约混为一谈；它补流程，不补硬约束。

118. 直接接入真实仓库、凭据或生产，没先读 ai-config 的配置与隐私文档、没确认 Codex 默认 danger-full-access 与 approval policy never。119. 把 ai-config 当跨平台通用配置；README 说它是 macOS-first。120. 缺 Python 3.11+、Node.js 18+ 或 Codex 硬跑；先补前置。121. 把私有状态提交进 Git；settings.local、config.local、USER、memory、sessions 等应留在本地。122. 把 ai-config 的四条校验命令当效果证明；它们只证明装对没漂移。123. 把 78 skills、8 roles、46/74 bindings 当已核对源码或效果数据；README 自述，50 stars。124. 一上来就启用 --with-browse 或 --with-launchagent；先默认安装，按需再开。125. 忽略第三方技能许可证；aside-browser 因上游无再分发许可只保留在本地。126. 改技能后不 refresh 清单、不重跑安装器；链接和清单会漂移。127. 把 Codex 默认高权限当团队规范；不能接受就不要接入。128. 把 --installed 当自动修复；它只报告差异，不替换本地 skills。

## 证据与来源

- 来源一：wesammustafa/Claude-Code-Everything-You-Need-to-Know README，约 3095 stars。可核对：路径表、7 个 slash skill、/claude-md-review、/stale-docs-audit、notification.py、settings.json。数字：约 3095 stars；视觉迭代 2–3 轮；同一流程重复 ≥3 次才固化；约 80% 想开 max 的正解在上游；5 个子智能体加 10 个角色提示词。作者主张：扩展点对照表、三条工作流、effort 心智模型、Opus 规划/Sonnet 执行、按模型 effort 默认值、hooks 三类用途。
- 来源二：Simon Willison 博客 2026-10-13 收集的 Geoffrey Huntley 引言。只有三件事：改 AGENTS.md 不管用、会漂移；改用 pre-commit hook 检查 diff 绕过 diagnostics 模块；失败并注入提示，作者称 ten out of ten。没有 hook 代码、匹配规则、提示词原文、误报率、团队规模等；ten out of ten 是主观评分。
- 来源三：ztt0216/MyAgent README，36 stars，MIT，Python 通用 Agent Runtime。可核对：目录结构、运行链路、Skills 自进化、审计产物路径、测试覆盖与 CI、安装/.env/启动/权限/反馈写法。作者主张：可阅读可扩展、适合二次开发、自进化能稳定沉淀；无 benchmark、成功率、耗时、token 节省、实际 SKILL.md、命中率或误沉淀率。材料仅 README，未核对源码，验证一节被截断。
- 来源四：@kloss_xyz 推文，标题称 vibe 编码 7 条规则，正文只完整给第 1 条，第 2 条起中断。可核对：第 1 条完整文字，即绝不编辑/跳过/删除测试；每个新测试要确认被测代码什么都不做时会失败，否则重写。互动量 91 赞、4 转发、31 回复；无项目案例、失败率或前后对比。绿色测试套件是代理最容易伪造的东西是作者主张。空实现检查步骤与 pytest 命令来自原文；git diff --stat HEAD~1 HEAD -- '*test*' '*spec*' 是调研报告补写。
- 来源五：AntoGA/agents-contract README，约 40 stars、单人维护、俄文。可核对：五个必填分节与 Lessons；linter 错误/警告；--json、--strict、--check-commands、-r 与退出码 0/1/2；SessionStart 跑 linter/装依赖/跑测试，输出进上下文，永远退出 0；AGENTS_SETUP/AGENTS_TEST/AGENTS_SKIP_TESTS；Windows 用 settings.windows.example.json。数据：linter 速度基线；A/B 得分 4.8→5.0、平均步数 5.6→3.8、中位时间 18.2 s→12.9 s、平均成本 $0.091→$0.084；15 个单元测试，三平台 CI。作者主张：Cursor/Copilot 也读 AGENTS.md、一小时落地、大仓库差距更大、Lessons 长期收益最大、不绑厂商。A/B 5 次/条件远不足统计显著，只测 Claude Code，仓库小，模型版本影响结果。
- 来源六：@mattpocockuk 推文。可核对：只查暂存文件；tokens = bytes/4；单文件超过 5,000 阻止提交；忽略锁文件和生成文件；错误信息给拆分说明。作者主张：这是其代码库最简单的投资；4,084 赞、170 转发、223 回复只说明关注度。没有完整钩子代码、框架配置、实际案例；二进制/超大文件/编码/误报未说明。第 9 步做法 C 的示意命令和错误信息写法由本手册补写。
- 来源七：Innei/ryugi README，47 stars。可核对：Claude Code 安装命令、部分 harness 命令、Let's make a react todo list 验证、brainstorming/executing-specs/per-task TDD/one fresh review/verifying-ui、just code it、ledger 跨 compaction、worktree 触发条件、默认 squash 与 never merge commit、npx ryugi-artifacts。作者主张：两小时自主推进、不问 should I continue、技能自动触发、ledger 保留判断、默认落地适合所有团队。未验证实际安装后行为；Cursor/OpenCode 无完整安装命令。
- 来源八：luongnv89/claude-howto README，MIT，版本标注 v2.1.302，兼容 Claude Code 2.1+。可核对：10 个模块、/optimize、project-CLAUDE.md、directory-api-CLAUDE.md、personal-CLAUDE.md、code-review-specialist、04-subagents、05-mcp、06-hooks 脚本与 settings.json、07-plugins 的 --plugin-dir、/rewind 六个选项、claude -p/-r/--output-format json、/self-assessment 与 /lesson-quiz、claude mcp add。数据：10 个模块、完整学习路径 11–13 小时、15 分钟第一个 slash command、1 小时 essential setup、hooks 5 种类型/33 个事件/4 个类别、43,460 stars、今日 177 stars。作者主张：90% 能力没用上、10x productivity、production-ready templates、Trusted by Developers；无基准测试或客户案例。仓库自身 pytest/ruff/bandit/mypy/coverage 是维护指南脚本的测试，不是使用效果。
- 来源九：Alex Lieberman & CJ Hess 关于 Tenex 的播客转写，经 Latent Space。可核对：Tenex 约 75 人、约 90% 工程师或 AI 策略师；客户约一半 Fortune 2000、一半营收 1–5 亿美元中型企业；MetaHarness 由共享技能集、标准化项目文档和外层 CLI 组成；计划/决策/验收标准/证据随代码签入 Git；agent 写回仓库；双模型 Opus 驱动 + Codex 评审；每季度校准故事点；主指标人均月故事点；企业非工程先解决数据权限/RBAC。数据：工程师薪酬差距约 4 倍；token/人力支出约 1:1 到 2:1；大多数公司每人 10–200 美元，AI 原生公司约折合人力支出 10%；约 100 家在谈企业落地阶梯；今年工程师产出约 2 倍；Kill My SaaS 72 份提交中人类评委第一名在 AI 评委排行榜第 19。作者主张：2 倍产出是口头估计；Opus 覆盖全区间、Codex 做 review 效果最好是个人偏好；阶梯百分比来自 Tenex 自身客户样本；上下文全进 repo 能让 agent 自己推进是机制解释。转写稿模型名无法核实；MetaHarness 无模板/目录/CLI/提示词；权限网关处截断；单公司无对照。
- 来源十：@RoundtableSpace 推文，称微软开源 Skill Recorder，仓库 microsoft/skill-recorder，Release v0.7.0，4.3K 星。可核对：录制快捷键 macOS ⌘⇧R、Windows Ctrl+Shift+R；捕获点击、应用/窗口切换、页面、终端命令；录制本机进行；可边做边讲解；137 赞/16 转发/15 回复。作者主张：教会你的 AI 代理为你执行它，无复跑成功率/案例/失败场景；本机进行是产品侧隐私表述。材料仅推文，仓库文档、输出格式、支持代理、平台覆盖、停止录制方式、触发方式缺失；v0.7.0 早期迭代。
- 来源十一：t3dotgg/tstack README，MIT，约 32 stars。可核对：9 个技能名称、口头触发词与作用；安装 git clone 后 cp -R 到 ~/.claude/skills/ 和 ~/.codex/skills/；前置 gh auth login、python3、council/sol-loop 需要能调用其他厂商模型 subagent 的 harness；依赖图；个人配置写 CLAUDE.md/AGENTS.md；先 full-stop 后 full-send 的保守起步建议。作者主张：每天在用是作者自述；无 benchmark、PR 数量、合并成功率或前后对比；约 32 stars 个人工作流仓库；技能本体不在材料中；部分依赖 T3 Code 的 delegate_task。第 17 步 1 周/2 周试用顺序和指标是调研报告建议，不是 tstack 数据。
- 来源十二：mokevnin/dev-quality-gates README。可核对：按任务推荐一个质量门禁工具（少数两个）、说明为什么选和不适用；原则包括按任务选一个工具、覆盖优先于数量、优先快速原生工具链、必须能阻断构建（非零退出码）而不只是出报告、对 AI 编码代理友好、没有可靠推荐就留空；README 代理提示词；推荐 mise.toml 固定版本、hk.pkl 让本地 hook 和 CI 跑同一套检查；命令 mise use hk、hk check、hk fix、hk check --all；要求证明能失败；明确不是通用技术栈、不要全部安装。作者主张：采用后代码质量改善量化数据没有；adopt.md、patterns.md、tools.json 和 research 正文未包含；Under review 表格处截断；2026-10-23 一次 sweep 不是独立评审；多个推荐工具较新/pre-1.0/单一维护者。第 18 步试用顺序、指标和先覆盖一个主语言加一个跨切面类别是调研报告建议，不是原文效果证明。
- 来源十三：Donchitos/Claude-Code-Game-Studios README，MIT 模板仓库。可核对：README 声称 49 个代理、74 个 skills、15 个 hooks、14 条路径规则、62 个文档模板；代理分导演层、部门主管层、专家层；协作协议先提问、给 2–4 个带优劣选项、用户决定、出草稿、用户批准才落盘；不是自动驾驶员；安装 git clone 后 cd my-game；必须在项目根目录启动，否则跳过项目 hooks、deny 规则和 ask-first 权限模式；/start、/settings、/settings modes.review_mode、/settings modes.rigor=full、/settings --local modes.review_mode=solo；modes.rigor 有 minimal/standard/full，默认 minimal，覆盖 workflow、docs.density、qa.level、story_granularity、review_mode、team.size；minimal 链路 /start→/setup-engine→/brainstorm→/create-stories→/dev-story↔/story-done；团队编排 skills /team-combat 等；hooks 列表与触发条件；权限规则自动允许测试、阻止 force push/rm -rf/读 .env；git 规则可能误伤提交信息；改变玩家可见内容的故事必须启动、观察、截图存 production/qa/evidence/；/skill-test static/category/spec/audit 和 /skill-improve；studio-tests 测框架，游戏测试放 tests/。作者自测：同一 brief 用 minimal 与 standard 构建，minimal 写第一行游戏代码前 1 份文档、0 分钟；standard 30 份文档、58 分钟；两者都产出可运行且测试过的游戏，但两名盲审和一次真人试玩把 standard 排最后；作者认为多出的 29 份文档买到可追溯性，不是更好的游戏；表格只展示两档，另外两档无法核对。属于作者主张/未验证：模板可定制、可迁移到非游戏项目但没有具体迁移步骤；49/74/15/14/62 计数未与源码核对；强游戏领域绑定；主开发环境 Windows 10 + Git Bash，hooks 也在 macOS/Linux 测试，notify.sh 在非 Windows 是 no-op；缺 Python 会静默回退。本手册只建议单个小型项目小范围试用，不整仓照搬到非游戏工作。
- 来源十四：Beakpoint-Insights/roost README，MIT，Claude Code 插件式 skills 集合，不是独立 agent。可核对：/plugin marketplace add Beakpoint-Insights/roost 与 /plugin install roost@roost；/roost:setup；配置查找顺序、ROOST_CONFIG、~/.claude/roost/local/<team.name>.yml、团队共享配置私有 repo、配置不存密钥；可见配置 key；支持 Jira/GitHub Issues、Xray/repo eval cases、gh stack/普通 PR、GitHub；Linear/Graphite/GitLab/Gherkin/Cursor 完整支持/Codex/Copilot/Gemini CLI 在 roadmap；每 repo 一个 session 的会话拓扑与 orchestrator 不编辑 repo；shape-epic 七阶段；build-epic 计划审批、Rollout needed、kickoff comment、Release order、deploy ticket 与 runbook；run-slice、verify-slice-tests、/code-review、切片检查点、测试先行修复、真实浏览器验证、slice-handoff；review-epic、/security-review、close-out-epic、release-qa；pair-runbook 由人执行命令并粘贴输出；Cursor link-skills 与能力差异；团队自有 skill 和 adapter。数据：README 约 30 stars；作者自称每天用于自家产品；无第三方数据、无 merge 成功率、无缺陷泄漏率、无对照实验。限制：examples/config.example.yml 和 config-schema.md 不在本次材料正文；强绑定 Claude Code + Jira/Xray/gh stack；Cursor 只有部分 skill；README 对成熟度和可迁移性的说法属于作者主张。本手册第 20 步的试用顺序和判断指标是建议，不是 roost 原文效果证明。
- 来源十五（本次新增）：salexandr0s/ai-config README，约 50 stars，macOS-first 的 Claude Code 与 Codex 版本化配置仓库。可核对：默认安装命令、--with-browse、--with-launchagent、--workspace "$HOME/Projects"；私有状态对应关系 claude/settings.json→~/.claude/settings.local.json、codex/config.base.toml→~/.config/codex/config.local.toml、claude/user/→~/.claude/USER/；Claude Code 的 /workflow-feature、/workflow-bugfix、/workflow-review-only；Codex 的 $config-editor 与 $HOME/.codex/workflows/feature.md 调用；四条安装后校验命令；--refresh 后重跑 ./install.sh；README 明确 Codex 默认 danger-full-access 与 approval policy never；第三方技能许可证与 aside-browser 不再分发；README 声称 78 个 bundled skills、2 个 assistant、46 个 Claude bindings、74 个 Codex bindings、8 个 agent 角色。作者主张/未验证：50 stars 只是外部信号；无案例、前后对比或效率指标；docs/skills.md、docs/configuration.md、docs/privacy.md 正文未提供；校验只证明安装与配置完整性，不证明工作结果改善；本手册第 21 步的隔离试装顺序、基线对照和判断门槛是建议，不是原文效果证明。

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
- [Donchitos/Claude-Code-Game-Studios](../research/radar/2026-10-30/8503-donchitos-claude-code-game-studios.md)：值得一试，建议把它当作“多角色 + 工作流 + 事件钩子 + 可调严谨度”的复杂项目协作模板，在单个小型项目上试跑，不要直接整仓照搬到非游戏工作；因为 README 给出了可执行的安装、配置和校验流程，但效果证据主要是作者自测，且强依赖游戏开发场景。
- [Beakpoint-Insights/roost](../research/radar/2026-11-01/9205-beakpoint-insights-roost.md)：值得一试，建议在单个仓库、单个小型 epic 上安装 roost 跑一遍完整流程（shape-epic → 计划审批 → 逐切片构建 → 发布 QA → pair-runbook），以“人工介入次数、计划返工轮数、漏到 release-qa 的缺陷数”作为是否保留的判断依据；它给出了可直接照抄的安装命令、配置查找顺序、会话拓扑与人工检查点，但成熟度证据只有作者自述与 30 stars，且强绑定 Claude Code + Jira/Xray/gh stack，尚不足以直接 adopt。
- [salexandr0s/ai-config](../research/radar/2026-11-04/10232-salexandr0s-ai-config.md)：值得一试，建议在隔离环境小范围试装，并先复核 Codex 的高权限默认值；它给出了可复制的安装、技能绑定、工作流和校验命令，但属于个人化 macOS 配置，且没有效果数据。
