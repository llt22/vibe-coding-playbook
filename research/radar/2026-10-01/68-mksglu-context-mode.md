# mksglu/context-mode

- 结论：**值得一试**。建议先在 Claude Code（或 Cursor）上做小范围试用：用 MCP-only 方式跑一个真实编码任务，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广到团队。理由是它直指“工具输出塞满上下文 + 会话压缩后失忆”这两个具体痛点，安装与回退成本低；但 README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证，且 ELv2 许可对商用有限制。
- 原文：https://github.com/mksglu/context-mode
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-09-30T17:24:02.268Z

## 是什么

Context Mode 是一个 MCP server / 客户端插件，宣称解决“上下文问题的另一半”，面向编码代理（coding agent）。它由四块组成：

1. **上下文节省（Context Saving）**：沙箱工具把工具调用的原始数据挡在上下文窗口之外。README 称 315 KB 变 5.4 KB，减少 98%。
2. **会话连续性（Session Continuity）**：每次文件编辑、git 操作、任务、错误和用户决策都记录进 SQLite；会话压缩时不把数据倒回上下文，而是索引进 FTS5，用 BM25 检索只取相关内容。不传 `--continue` 时，上一次会话数据会立即删除。
3. **用代码思考（Think in Code）**：让模型写脚本做分析、只 `console.log()` 结果，而不是把 50 个文件读进上下文再数函数。README 称这是 17 个受支持客户端的强制范式。
4. **不强制写作风格**：只管数据流向，不管模型最终答案的排版/简洁度；作者引用 Moonshot AI 在 `kimi-k2.5` 上的 issue，认为激进的“简洁”提示词会损害编码/推理 benchmark。

形态：提供 11 个 MCP 工具（6 个沙箱类 `ctx_batch_execute`、`ctx_execute`、`ctx_execute_file`、`ctx_index`、`ctx_search`、`ctx_fetch_and_index`；5 个元工具 `ctx_stats`、`ctx_doctor`、`ctx_upgrade`、`ctx_purge`、`ctx_insight`），以及 PreToolUse / PostToolUse / UserPromptSubmit / PreCompact / SessionStart / Stop 六类 hook 事件拦截。许可为 ELv2，仓库指标 24,371 stars（当日 +88），Hacker News 曾排名 #1、570+ points。

## 具体做法（原文里可照做的步骤、配置、提示词、流程，尽量具体）

**Claude Code（README 标为全自动）**
- 前置：Claude Code v1.0.33+（`claude --version`）。
- 安装：`/plugin marketplace add mksglu/context-mode`，然后 `/plugin install context-mode@context-mode`。
- 重启 Claude Code（或 `/reload-plugins`），用 `/context-mode:ctx-doctor` 验证，所有检查应为 `[x]`。
- 可选状态栏（一次性手改 `~/.claude/settings.json`）：
  ```json
  {
    "statusLine": {
      "type": "command",
      "command": "context-mode statusline"
    }
  }
  ```
  重启后显示 `$ saved this session · $ saved across sessions · % efficient`。
- 轻量替代（无 hook、无自动路由，只有 11 个工具）：`claude mcp add context-mode -- npx -y context-mode`。README 建议先用这个“试试看再决定是否上完整插件”。
- 斜杠命令：`ctx-stats`（按工具的节省明细、消耗 token、节省比例）、`ctx-doctor`（诊断运行时/hook/FTS5/注册/版本）、`ctx-index`、`ctx-search`、`ctx-upgrade`、`ctx-purge`、`ctx-insight`。其他平台用聊天里输入 `ctx stats` 等，由模型自动调 MCP 工具。

**Gemini CLI**
- `npm install -g context-mode`。
- 在 `~/.gemini/settings.json` 一个文件里同时注册 mcpServers 与四个 hook：`BeforeTool`（matcher 为 `run_shell_command|read_file|read_many_files|grep_search|search_file_content|web_fetch|activate_skill|mcp__plugin_context-mode|mcp__context-mode|mcp__(?!.*context-mode)`）、`AfterTool`、`PreCompress`、`SessionStart`，命令形如 `context-mode hook gemini-cli beforetool`。
- 重启，`/mcp list` 应显示 `context-mode: ... - Connected`。
- 可选让模型感知路由：`cp node_modules/context-mode/configs/gemini-cli/GEMINI.md ./GEMINI.md`。
- README 解释 matcher 只拦截会产生大输出的工具，避免轻量工具上的 hook 开销。

**VS Code Copilot**
- 全局安装后，项目根建 `.vscode/mcp.json`（`servers.context-mode.command = context-mode`）。
- 建 `.github/hooks/context-mode.json`，配 `PreToolUse` / `PostToolUse` / `SessionStart`，命令如 `context-mode hook vscode-copilot pretooluse`。重启 VS Code；用 `ctx stats` 验证。
- 可选：`cp node_modules/context-mode/configs/vscode-copilot/copilot-instructions.md .github/copilot-instructions.md`。

**JetBrains Copilot**
- Settings > Tools > AI Assistant > Model Context Protocol (MCP) > Add Server，Name `context-mode`、Command `context-mode`；再建 `.github/hooks/context-mode.json`（PreToolUse/PostToolUse/SessionStart，`context-mode hook jetbrains-copilot ...`）；重启 IDE；`ctx stats` 验证。

**GitHub Copilot CLI**
- 推荐一条命令：`npm install -g context-mode` 后 `copilot plugin install mksglu/context-mode:configs/copilot-cli`（同时注册 MCP + hooks + 路由 skill；bundle 里 `.mcp.json` 固定 `CONTEXT_MODE_PLATFORM=copilot-cli`）。
- 手动：`copilot mcp add context-mode -- context-mode`，再写 `~/.copilot/hooks/context-mode.json`，包含六个扁平事件 preToolUse / postToolUse / preCompact / sessionStart / userPromptSubmitted / agentStop。
- 版本提示：hook 调用的是全局 `context-mode`，旧版本 hook 不生效但不会阻塞工具（fail open），需 `npm install -g context-mode@latest`。

**Cursor**
- 插件仍在审核中，未上架；本地方案：macOS/Linux 用 `ln -s "$PWD/context-mode" ~/.cursor/plugins/local/context-mode`，Windows 因不跟随符号链接需用 `robocopy`（排除 node_modules/.git/build 等）。
- 或手动：全局安装后建 `.cursor/mcp.json` 与 `.cursor/hooks.json`（`preToolUse` 带 matcher `Shell|Read|Grep|WebFetch|Task|MCP:ctx_execute|...`、`postToolUse`、`stop`）。
- 因 Cursor 缺 SessionStart hook，需拷规则文件：`mkdir -p .cursor/rules && cp node_modules/context-mode/configs/cursor/context-mode.mdc .cursor/rules/context-mode.mdc`。
- 注意：项目 `.cursor/hooks.json` 覆盖 `~/.cursor/hooks.json`；若旧安装残留条目会重复触发，doctor 会告警。

**OpenCode / KiloCode**
- 在 `opencode.json` / `kilo.json` 的 `plugin: ["context-mode"]` 一行即可原生注册 11 个工具并启用 hook（in-process，不再起 stdio MCP 子进程）。
- 可选拷路由文件：`cp node_modules/context-mode/configs/opencode/AGENTS.md AGENTS.md`。
- 注意：同时存在 `plugin` 与 `mcp.context-mode` 会导致注册 0 个 `ctx_*` 工具，需 `context-mode upgrade` 清掉遗留 MCP 条目。

**OpenClaw / Pi Agent**
- 克隆仓库后 `npm run install:openclaw`（可用 `-- /path/to/openclaw-state` 指定路径；默认读 `$OPENCLAW_STATE_DIR`，Docker 下为 `/openclaw`）。安装脚本负责 npm install、build、`better-sqlite3` 原生重编译、runtime.json 注册、SIGUSR1 重启网关。原文在此处被截断。

**核心用法示例（Think in Code）**
```js
// Before: 47 × Read() = 700 KB.  After: 1 × ctx_execute() = 3.6 KB.
ctx_execute("javascript", `
  const files = fs.readdirSync('src').filter(f => f.endsWith('.ts'));
  files.forEach(f => console.log(f + ': ' + fs.readFileSync('src/'+f,'utf8').split('\\n').length + ' lines'));
`);
```

## 对应的研究问题

**1. 能力发现**：有依据。提出“模型不该当数据处理器，应当当代码生成器”的范式：过去要读 50 个文件数函数，现在让 agent 写脚本数、只输出结果。这类“把批量读取/统计/聚合交给脚本沙箱”的工作，是原本不会想到交给 AI 的用法。

**2. 任务匹配**：有依据。README 按“安装复杂度 / 是否支持 hook”区分平台：支持 hook 的平台自动强制路由，不支持的平台需要一次性拷贝路由文件；并明确给出各客户端的差异（Cursor 缺 SessionStart 且 additional_context 不上传模型、OpenCode/KiloCode 用 experimental 钩子替代、OpenClaw 走原生网关插件而非 MCP）。

**3. 条件供给**：有依据，这是该工具的核心。需要提供的信息/工具/权限：把会产生大输出的工具（shell、read_file、grep、web_fetch 等）纳入拦截范围；注册 MCP 工具；装 hook 获得自动路由与拦截；拷贝 AGENTS.md / CLAUDE.md / GEMINI.md / copilot-instructions.md 规则文件让模型知道为什么被拦；提供 SQLite 持久层承载会话状态；PreToolUse 可阻断命令，形成“允许/阻止哪些命令”的权限面。

**4. 主动推进**：有依据。SessionStart hook 在运行时注入路由指令和上次会话快照（OpenCode/KiloCode 用 `experimental.chat.system.transform` 在系统提示里注入）；PreCompact / `experimental.session.compacting` 在会话压缩时构建 resume snapshot；Cursor 的 `stop` hook 在回合结束后可发跟进消息继续循环；OpenCode/KiloCode 的 `chat.message` 捕获用户提示与决策。这些属于由会话状态/事件触发而非人工逐次提示。

**5. 效果验证**：部分有依据，但不完整。工具侧有 `ctx_stats`（按工具的节省明细、消耗 token、节省比例）与状态栏的 `$ saved / % efficient`，`ctx_doctor` 校验运行时、hook、FTS5、注册与版本。但这些都是“上下文占用”指标，README 没有给出任务结果质量（正确率、人工纠正次数、交付时间）的衡量方法，也没有第三方基准。作者还刻意不管答案风格，所以风格层面的“改善”也不在它的验证范围内。

## 与已有做法的关系

清单中已有 **Context Mode（tool，status: watch）**——本条正是该条目本身，本次是仓库 README 级细节补充，建议从 watch 上调为 try（先小范围试）。

其余相关条目是集成/承载关系而非替代：**Claude Code（adopt）** 是 README 中体验最完整的平台（自动路由 + 全部 hook + 斜杠命令 + 状态栏）；**Cursor（watch）** 在其上以本地插件或手动 hook 方式接入，但插件仍在审核；**OpenCode（watch）** 与 **OpenClaw（watch）** 分别以插件字段和原生网关插件接入；**GitHub Copilot（drop）** 对应 README 中 VS Code Copilot / JetBrains Copilot / Copilot CLI 三条安装路径（README 本身并未评价这些平台的可用性，清单 drop 的原因需另行判断是否与该工具在 Copilot 上的路由限制有关）。

## 证据与局限

**原文给出的数字/案例**
- 仓库指标：24,371 stars、当日 +88；Hacker News #1、570+ points；npm/marketplace 徽章存在。
- 上下文占用示例：一次 Playwright snapshot 56 KB、20 个 GitHub issue 59 KB、一份 access log 45 KB；“30 分钟后 40% 上下文没了”。
- 节省宣称：315 KB → 5.4 KB（98% 减少）；47 × `Read()` = 700 KB 对比 1 × `ctx_execute()` = 3.6 KB（100x）。
- 一条可点击的 YouTube 演示视频。

**只是作者主张、缺少佐证的部分**
- 上述 98% / 100x / 40% 全部为自述，没有公开的测量方法、样本任务或第三方复现。
- “Used across teams at” 下的 Microsoft、Google、Meta、Amazon、IBM、NVIDIA、ByteDance、Stripe、Datadog、Salesforce、GitHub、Red Hat、Supabase、Canva、Notion、Hasura、Framer、Cursor logo 墙没有任何引用、案例或数字支撑，不能当作采用证据。
- “17 supported clients” 的具体名单元文本被截断，无法核实。
- “激进简洁提示词损害 benchmark”是对单个外部 issue 的引用，属他人经验而非本工具验证。

**已知适用条件与限制**
- 主要面向编码代理场景，对非编码工作流（写作、研究、运营）原文未给证据。
- hook 能力越强的客户端体验越完整；不支持的平台需要手动拷贝路由文件，模型不一定会遵守。
- Cursor：插件待审、sessionStart hook 被其 validator 拒绝、`additional_context` 接受但不surface 给模型，路由只能靠 `.mdc` 规则。
- OpenCode/KiloCode：缺真正的 SessionStart，用 experimental 钩子代替；`plugin` 与 `mcp.context-mode` 并存会注册 0 个工具。
- 不传 `--continue` 会立即删除上次会话数据——省空间，但意味着跨会话历史不保留，可能不适合需要长期记忆的场景。
- 许可为 ELv2（非 OSI 认可的开源许可），商用/托管服务有额外限制，团队采用前需确认。
- 原文在 OpenClaw 段被截断，该平台验证步骤不完整。

## 怎么试、怎么验证

**最小试用方式**
1. 选一个中等规模的代码仓库和一类“会产生大输出”的重复任务（例如：统计 src 下各文件行数、跨文件查某个符号的定义、抓取并整理网页文档）。
2. 在 Claude Code 上先用最轻路径 `claude mcp add context-mode -- npx -y context-mode`（仅 MCP 工具、无自动路由），确认工具出现并可调用；再视情况升级到插件版以获得 hook 强制路由。
3. 若团队用 Cursor，按本地方案（`ln -s` 或 `robocopy`）接入，并记得拷 `.cursor/rules/context-mode.mdc`；若用 OpenCode/KiloCode，只加 `plugin` 字段、确认没有遗留 `mcp.context-mode`。
4. 对照设置：同一任务，A 组用原始 Read/Grep/Bash，B 组用 `ctx_execute` / `ctx_batch_execute`；各跑 3–5 次。

**判断有没有改善的指标**
- 工具侧（README 直接提供）：`ctx stats` 的 per-tool savings、消耗 token、节省比例；状态栏 `$ saved this session` / `% efficient`；`ctx doctor` 的 hook 与 FTS5 是否全绿。注意这些只证明“省了上下文”，不等于“结果更好”。
- 会话连续性（可自测）：在一个长任务中途主动触发压缩，看压缩后 agent 是否还记得正在编辑的文件、进行中的任务和上一条指令；这是 README 的核心卖点，也是最直接的验收点。
- 任务结果（README 未给，需自建）：同一任务的完成正确率、需要人工纠正的次数、完成所需回合数、以及是否触发过“上下文不足/遗忘”类失败。只有这一层也改善，才支持从 try 升为 adopt。
- 成本与风险侧：确认 ELv2 许可在你们的使用方式下可接受；确认不传 `--continue` 时数据删除行为符合合规要求。
