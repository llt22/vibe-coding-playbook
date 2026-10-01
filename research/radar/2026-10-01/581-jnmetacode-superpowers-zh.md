# jnMetaCode/superpowers-zh

- 结论：**值得一试**。可按 README 给出的 `npx superpowers-zh`（或 Claude Code 插件市场）命令，在一个非关键项目里装 superpowers-zh 试用，它把编码智能体的工作流固定为“先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查”。理由是安装/卸载/路径配置具体可复制、覆盖 26 款工具；但原文只有 README、没有 skill 正文和效果数据，实际改善需自己对照验证。
- 原文：https://github.com/jnMetaCode/superpowers-zh
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T13:28:35.986Z

## 是什么

superpowers-zh 是 obra/superpowers（AI 编程 skills 框架）的**简体中文增强版**：把 21 个 skill（15 个翻译 + 4 个中国原创 + 2 个上游历史保留）以可安装的形式提供给 26 款 AI 编程工具。

它的核心主张是把编码智能体从“直接开始写代码”改成按方法论走流程：**头脑风暴（需求分析→设计规格）→ 编写计划 → 执行计划（每步验证）→ TDD → 系统化调试 → 代码审查 → 完成前验证**。README 用一组对比说明这个差异：

- 没装：你说“给用户模块加个批量导出功能”，AI 直接开始写 `export async function exportUsers() {...}`。
- 装了：AI 先问“导出格式是 CSV 还是 Excel？数据量多大？需要异步吗？有权限要求吗？”，给出 2-3 个方案，确认后再动手。

21 个 skill 的清单（README 只给名称和一句话用途，正文不在此次抓取内容中）：头脑风暴、编写计划、执行计划、测试驱动开发、系统化调试、诊断 Superpowers、请求代码审查、接收代码审查、完成前验证、派遣并行 Agent、子 Agent 驱动开发、Git Worktree 使用、完成开发分支、编写 Skills、使用 Superpowers；中国原创 4 个为手动调用的 `/chinese-code-review`、`/chinese-git-workflow`、`/chinese-documentation`、`/chinese-commit-conventions`；另有上游移除后被本 fork 保留的 `mcp-builder`（构建 MCP 服务器）与 `workflow-runner`（多角色 YAML 工作流编排），这两个是自动触发。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：本机有可用的 Node/npm；先 `cd` 到具体项目目录，**不要在用户主目录（`~`）下跑项目级安装**（v1.2.1 起会拒绝，老版本会把 skills 和 `CLAUDE.md` 等写进 home 目录，污染所有项目）。

1. 项目级安装（推荐，装到当前项目，自动检测你项目里用的工具）：

```bash
cd /your/project
npx superpowers-zh
```

2. 全局安装（v1.7.0+，多项目共用，一次装好所有项目可用）：

```bash
npx superpowers-zh --global                 # 自动检测已装工具
npx superpowers-zh --global --tool claude   # 或指定工具
```

   据 README，支持通用全局安装的工具为：Claude Code、Codex CLI、Qoder、Windsurf、Qwen Code、OpenClaw、OpenCode、Crush、Hermes Agent、CodeBuddy、CodeArts、ZCode、DeepSeek Harness、Reasonix；其余工具（Cursor / Kiro / Trae / Aider / DeerFlow / VS Code / Claw / Cline / Kilo Code）规则是项目级或存于应用内设置，`--global` 会提示改用项目级；Gemini CLI / Antigravity 有各自专属全局方式。

3. 自动检测不到工具时显式指定：

```bash
npx superpowers-zh --tool cline
npx superpowers-zh --tool kilocode
npx superpowers-zh --global --tool hermes
npx superpowers-zh --global --tool zcode
```

4. 仅 Claude Code 可走官方插件市场（升级只需一条命令，但只服务 Claude Code 一款工具）：

```bash
claude plugin marketplace add jnMetaCode/superpowers-zh
claude plugin install superpowers-zh@superpowers-zh
```

   装完核对：

```bash
claude plugin list
```

   应看到：

```
  ❯ superpowers-zh@superpowers-zh
    Version: <当前版本>
    Scope: user
    Status: ✔ enabled
```

   升级与卸载：

```bash
claude plugin marketplace update superpowers-zh          # 先刷新 marketplace 缓存
claude plugin update superpowers-zh@superpowers-zh       # 再升级 plugin（需重启生效）
claude plugin uninstall superpowers-zh@superpowers-zh    # 卸载
```

   注意：不要在同一个项目里同时用方式 1 和方式 4 装 Claude Code，否则 skills 会出现两份。

5. 手动安装（**低保版**，只在 npx 不可用的极端无网络环境时用）。它只复制 `skills/` 目录，**不会配置 hooks、不会生成 bootstrap 引导文件**，结果是 skill 物理存在但不会自动触发，需要每次手动喊 “use brainstorming skill” 之类：

```bash
git clone https://github.com/jnMetaCode/superpowers-zh.git

cp -r superpowers-zh/skills /your/project/.claude/skills      # Claude Code / Copilot CLI
cp -r superpowers-zh/skills /your/project/.cursor/skills      # Cursor
cp -r superpowers-zh/skills /your/project/.kiro/skills        # Kiro
cp -r superpowers-zh/skills /your/project/.gemini/skills      # Gemini CLI
cp -r superpowers-zh/skills /your/project/.qoder/skills       # Qoder（阿里 AI IDE）
cp -r superpowers-zh/skills /your/project/.windsurf/skills    # Windsurf
```

   完整路径表（README 提供）：Copilot CLI 用 `.claude/skills/`；Hermes Agent 用 `~/.hermes/skills/` 或项目 `.hermes/skills/`；Codex CLI 项目级 `.agents/skills/`、全局 `~/.agents/skills`；Aider `.aider/skills/`；Trae `.trae/skills/` + `.trae/rules/`；VS Code `.github/superpowers/` + `.github/instructions/`；DeerFlow 2.0 `skills/custom/`；OpenCode `.opencode/skills/`；OpenClaw `skills/`；Qwen Code `.qwen/skills/` + `QWEN.md`；Antigravity `.agents/skills/`；Claw Code `.claw/skills/`；CodeBuddy `.codebuddy/skills/` + `CODEBUDDY.md`；CodeArts `.codeartsdoer/skills/`；Cline `.cline/skills/` + `.clinerules/`；Kilo Code `.kilocode/skills/` + `.kilocode/rules/`；Crush `.crush/skills/`（Windows 全局为 `%LOCALAPPDATA%\crush\skills`）；ZCode 仅全局 `~/.zcode/skills/`；DeepSeek Harness 项目级 `.dsh/skills/`、全局 `~/.dsh/skills/`、引导写 `AGENTS.md`；Reasonix `.reasonix/skills/` + `REASONIX.md`（Windows 全局为 `%APPDATA%\reasonix\skills`）。

6. 在配置文件中引用（方式四）。对应关系：Claude Code / Copilot CLI → `CLAUDE.md`（项目根）；Hermes Agent → `HERMES.md` 或 `.hermes.md`（安装时自动生成）；Kiro → `.kiro/steering/superpowers-zh.md`（索引，`inclusion: always`）+ `.kiro/skills/`；Trae → `.trae/rules/project_rules.md`；Antigravity → `GEMINI.md` 或 `AGENTS.md`；VS Code → `.github/copilot-instructions.md`；Cursor → `.cursor/rules/*.md`；Qwen Code → `.qwen/skills/*/SKILL.md` + `QWEN.md`；Qoder → `.qoder/skills/*/SKILL.md` + `.qoder/rules/superpowers-zh.md`。

7. 手动调用 4 个中国原创 skill（它们不自动触发，需在对话中显式输入）：`/chinese-code-review`、`/chinese-git-workflow`、`/chinese-documentation`、`/chinese-commit-conventions`。README 说明这样设计是“参考资料而非工作流，避免污染上游 skill 的自动调度”。

8. 卸载 / 误装清理（v1.2.1+）：

```bash
cd /your/project          # 或 cd ~ 如果误装到了主目录
npx superpowers-zh@latest --uninstall
```

   会删除装过的 skill 目录与独立 bootstrap 文件（`.trae/rules/superpowers-zh.md`、`.qoder/rules/superpowers-zh.md`、`.agents/rules.md`），并清理追加到 `CLAUDE.md` / `HERMES.md` / `GEMINI.md` / `CONVENTIONS.md` 里的 superpowers-zh 段。追加内容包在 `<!-- superpowers-zh:begin/end -->` 哨兵注释之间，按哨兵精确切除，识别不可靠时跳过 + 警告。

9. 其他参数：`--tool <name>` 显式指定工具；`--force` 允许在主目录（`~`）安装（默认拒绝，README 标注不建议）；`--uninstall` 卸载；`--help` / `--version`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 明确列出了可以交给编码智能体、但日常未必交给它们的活儿——头脑风暴（需求分析→设计规格，不写代码先想清楚）、编写计划、执行计划、系统化调试的四阶段法、请求/接收代码审查、完成前验证、派遣并行 Agent、子 Agent 驱动开发、Git Worktree 隔离式开发、完成开发分支的四选一流程、创建新 skill 的方法论，以及两个非翻译 skill：`mcp-builder`（构建生产级 MCP 服务器）和 `workflow-runner`（在 AI 工具内运行多角色 YAML 工作流）。
- **任务匹配**：README 按工具类型（CLI / IDE / IDE 插件 / Agent 框架）给出每款工具的安装路径、是否支持全局安装、以及 Claude Code 走插件市场、ZCode 仅全局等差异；同时区分自动触发 skill 与需手动 `/chinese-xxx` 调用的 4 个中文 skill。README 未给出“某类任务该配哪个模型”的建议（赞助商区块只提 API 可用模型，不是匹配依据）。
- **条件供给**：安装会写入工具所需的上下文与规则文件（`CLAUDE.md`、`GEMINI.md`、`HERMES.md`、`AGENTS.md`、`QWEN.md`、`CODEBUDDY.md`、`REASONIX.md` 等）与 hooks、rules；前提是工具本身支持 skills 目录或规则文件，且本机有 Node/npm。
- **主动推进**：README 称 hooks（SessionStart 钩子）让 skill 在合适时机自动触发，`workflow-runner` 支持多角色 YAML 编排，`dispatching-parallel-agents` / `subagent-driven-development` 涉及并发与多 agent 接力。但触发条件、调度机制原文未展开。
- **效果验证**：有方法层面的线索——`verification-before-completion` 强调“证据先行，声称完成前必须跑验证”；`diagnosing-superpowers` 在会话跑偏时读 transcript 取证、每条结论带 `path:line`、可整理成 issue；`systematic-debugging` 是定位→分析→假设→修复四阶段。README 没有给出任何量化效果指标。

## 与已有做法的关系（对照给出的清单条目）

- **obra/superpowers（study）**：本项目就是它的完整汉化 + 中国增量，方法论内核一致，区别在语言、工具覆盖数（6 → 26）、安装方式（分散 → 一条 `npx superpowers-zh` 自动识别）、国内 Git/CI 生态（Gitee/Coding/极狐 GitLab/CNB、Gitee Go/Coding CI/极狐 CI/`.cnb.yml`）和中文表达适配。
- **Claude Code（adopt）**：README 给出官方插件市场安装/升级/卸载命令与 `.claude/skills/`、`CLAUDE.md` 路径，是唯一支持 marketplace 的工具。
- **Cline（watch）**：`npx superpowers-zh --tool cline`，装到 `.cline/skills/` + `.clinerules/`。
- **Cursor（watch）**：项目级 `.cursor/skills/`、`.cursor/rules/*.md`。
- **Hermes（watch）**：`npx superpowers-zh --global --tool hermes`，`~/.hermes/skills/`。
- **OpenClaw（watch）**：`skills/` 目录，自动发现，引导用 `HERMES.md`/`.hermes.md` 一类。
- **OpenCode（watch）**：`.opencode/skills/`。
- **DeepSeek Harness（watch）**：新增支持，项目级 `.dsh/skills/` + 全局 `~/.dsh/skills/`，引导写 `AGENTS.md`。
- **DeepSeek（try）**：仅在赞助商区块作为可用模型/API 出现（火山引擎套餐支持 DeepSeek 等），README 没有 DeepSeek 专门的安装或使用说明，这属于广告而非技术内容。
- **ZCode（avoid）**：README 说 ZCode 只做全局安装（`~/.zcode/skills/`），项目级会被明确拒绝而不是猜路径；本项与清单里的 avoid 状态方向一致（仅作路径参考，不建议依赖）。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- 原文给出的**可核对事实/内容**：metrics 显示 8251 stars；README 自述 21 个 skills（15 翻译 + 4 中国原创 + 2 上游保留）、支持 26 款工具、上游 250k+ stars；完整的安装/卸载/参数命令、各工具路径表、`<!-- superpowers-zh:begin/end -->` 哨兵清理机制；最近更新里的具体 issue 编号（#124 插件模式跨技能调用失败、#125 管理员 PowerShell 装进 `C:\Windows\System32`、#122 新增 DeepSeek Harness、#42 新增 Reasonix）和“verify-release 115 → 144”的门禁计数。
- **只是作者主张**：“经过实战验证的工作方法论”“效率翻倍”“让 AI 真正会干活”；装前/装后的对话对比示例是作者构造的示意，不是对照实验；赞助商区块的折扣（1 折、40%—98%、49 元/月、$0.006/张、送额度等）是广告。
- **适用条件**：安装依赖 Node/npm；项目级安装必须在具体项目目录（不能在 `~`，管理员终端会被护栏拒绝）；手动 `cp -r` 只是低保版，不会自动触发 skill；部分工具只能项目级或只能全局；路径与版本随更新可能变化。
- **重大局限**：本次抓取到的只有 README，**没有 skill 正文**，因此无法判断每个 skill 的具体步骤质量，也无法复现其内部方法论细节；无法验证 AI 行为确实被改善；文中对比与效率说法无独立数据支撑。因此只适合小范围试用，不宜直接写进手册的推荐做法。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式**

1. 选一个非关键的中小型项目，`cd` 进去后执行 `npx superpowers-zh`；如果是 Claude Code 独用，可改用 `claude plugin marketplace add jnMetaCode/superpowers-zh` + `claude plugin install superpowers-zh@superpowers-zh`，再用 `claude plugin list` 确认 Status 为 enabled。
2. 复现 README 里的对照场景：让 agent “给用户模块加个批量导出功能”，观察它是否先澄清格式/数据量/权限并给出 2-3 个方案再动手。
3. 再挑一个真实 bug，观察是否按系统化调试流程走（定位→分析→假设→修复），以及声称修复前是否先跑验证。
4. 试用稳定后再考虑 `npx superpowers-zh --global` 覆盖多项目；出问题用 `npx superpowers-zh@latest --uninstall` 清理。

**判断有没有改善的指标**

- 需求澄清轮次与方案数量：同一类需求，装前/装后各跑若干次，看是否从“直接写代码”变为“先问后给方案”。
- 首次实现返工次数（格式、分页、性能等被事后指出的问题数）。
- 测试先行比例：改动前是否先有测试。
- “声称完成”与“实际验证通过”的一致率：对照 `verification-before-completion` 的要求，统计 agent 声称完成时是否附带了验证证据。
- 调试类任务的定位准确度：结论是否带上 `path:line` 这类可核查证据。
- 代码审查意见的采纳与处理质量（是否敷衍）。

建议按任务类型分层做前后对照，而不是只看单次体验，因为 README 的效果说法全部是主张而非数据。
