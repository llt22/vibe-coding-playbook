# 让编码 agent 少读文件、多写脚本：把工具输出挡在上下文之外

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 常被工具输出塞满上下文，会话压缩后又丢失关键状态；这篇手册用 context-mode 做一次小范围试点，验证能否在真实任务中减少上下文占用且不损害结果。
> 先试这一步：先在 Claude Code 用 MCP-only 方式装 context-mode，跑一个真实编码任务，用 ctx_stats 对比上下文节省和任务结果，再决定是否上完整插件或推广。
> 最近修订：2026-10-01

## 解决什么问题
编码 agent 在真实任务里会调用大量工具：读文件、grep、跑 shell、抓网页。这些工具返回的原始数据直接进上下文窗口，很快就把上下文塞满；会话压缩时，之前的状态又可能丢失，agent 像失忆一样。Context Mode 想解决的就是这两件事：把工具输出挡在上下文窗口之外，并把会话状态索引进 SQLite/FTS5，用检索只取相关内容。它还给了一个工作范式：让模型写脚本做统计、聚合、批量读取，只把结果 `console.log()` 出来，而不是把几十个文件读进上下文再人工数。

## 适用与不适用
适用：
- 你正在用编码代理（Claude Code、Cursor 等）做真实编码任务。
- 任务中本来就会产生大量工具输出（读多个文件、grep、shell、web_fetch）。
- 你会经历会话压缩，或者需要跨会话继续同一个任务。
- 你愿意装 MCP server，必要时改 hook 配置，并接受一次小范围试用。

不适用：
- 你对商用许可敏感。Context Mode 是 ELv2 许可，对商用有限制。
- 你希望直接拿到第三方验证过的 98% 节省、100x 提升。README 的数字是自述，调研报告没有找到第三方验证。
- 你的任务很小，工具输出很少，装 hook 的开销可能不划算。
- 你不想改配置、不想重启客户端。

## 前置条件
- 如果走 Claude Code：Claude Code v1.0.33+，用 `claude --version` 确认。
- Node.js/npm 可用（会用 `npx` 或 `npm install -g context-mode`）。
- 一个真实编码任务，最好本来就有大量工具调用，能对比前后差异。
- 知道 Context Mode 是 ELv2 许可，推广前确认商用合规。
- 如果走完整插件，能修改 `~/.claude/settings.json` 并重启 Claude Code。

## 操作步骤
先选做法。推荐先用做法 A（MCP-only）跑一个真实任务；如果验证有效，再上做法 B（完整插件，带 hook 和自动路由）。如果你不在 Claude Code，做法 C 给出 Cursor 的本地方案；其他客户端见“其他平台”说明。

### 做法 A：MCP-only 轻量试用（推荐先做）
1. 确认 Claude Code 版本。
   ```bash
   claude --version
   ```
   预期：版本不低于 v1.0.33。低于这个版本先升级。

2. 添加 MCP server。
   ```bash
   claude mcp add context-mode -- npx -y context-mode
   ```
   预期：注册 11 个 `ctx_*` 工具。这个方式没有 hook、没有自动路由，只有工具。

3. 重启 Claude Code，让 MCP server 生效。预期：在会话里能调用 `ctx_*` 工具。

4. 准备一个真实编码任务。要求任务里本来就会产生大量工具输出，例如读多个文件、grep、跑 shell。不要用玩具任务，否则看不出节省。

5. 在任务开始前和结束后，输入 `ctx stats` 查看状态。预期：能看到按工具的节省明细、消耗 token、节省比例。

6. 手动提示模型使用 `ctx_*` 工具。因为 MCP-only 没有自动路由，模型不一定会自己用。可以在提示词里明确要求：批量读取、统计、聚合类工作先用 `ctx_execute` 写脚本完成，只输出结果。

7. 记录任务结果：正确率、人工纠正次数、交付时间。最好能和不用 Context Mode 的基线对比。如果没有基线，至少记录这次任务里上下文占用和工具输出的关系。

8. 根据结果决定是否上做法 B，或者是否推广到团队。

### 做法 B：完整插件（自动路由 + hook）
1. 前置：Claude Code v1.0.33+。

2. 添加 marketplace。
   ```
   /plugin marketplace add mksglu/context-mode
   ```

3. 安装插件。
   ```
   /plugin install context-mode@context-mode
   ```

4. 重启 Claude Code，或执行 `/reload-plugins`。然后用 `/context-mode:ctx-doctor` 验证。预期：所有检查为 `[x]`。

5. 可选：加状态栏。一次性编辑 `~/.claude/settings.json`：
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "context-mode statusline"
     }
   }
   ```
   重启后状态栏显示 `$ saved this session · $ saved across sessions · % efficient`。

6. 用斜杠命令查看状态：`ctx-stats`（按工具的节省明细、消耗 token、节省比例）、`ctx-doctor`（诊断运行时/hook/FTS5/注册/版本）、`ctx-index`、`ctx-search`、`ctx-upgrade`、`ctx-purge`、`ctx-insight`。其他平台在聊天里输入 `ctx stats` 等，由模型自动调 MCP 工具。

7. 跑真实任务，对比结果。完整插件会通过 hook 自动拦截会产生大输出的工具，并自动路由到沙箱。

### 做法 C：Cursor 本地方案（插件未上架时）
Cursor 插件仍在审核中，未上架。可以本地安装：
- macOS/Linux：
  ```bash
  ln -s "$PWD/context-mode" ~/.cursor/plugins/local/context-mode
  ```
- Windows 不跟随符号链接，需要用 `robocopy`，排除 `node_modules/.git/build` 等。

或者手动配置：
1. 全局安装：`npm install -g context-mode`。
2. 建 `.cursor/mcp.json` 和 `.cursor/hooks.json`。hooks 里 `preToolUse` 带 matcher `Shell|Read|Grep|WebFetch|Task|MCP:ctx_execute|...`，再加 `postToolUse`、`stop`。
3. 因为 Cursor 缺 SessionStart hook，需要拷规则文件：
   ```bash
   mkdir -p .cursor/rules && cp node_modules/context-mode/configs/cursor/context-mode.mdc .cursor/rules/context-mode.mdc
   ```
4. 注意：项目 `.cursor/hooks.json` 会覆盖 `~/.cursor/hooks.json`；如果旧安装残留条目，会重复触发，doctor 会告警。

### 其他平台（按需）
- Gemini CLI：`npm install -g context-mode`，然后在 `~/.gemini/settings.json` 里同时注册 mcpServers 与四个 hook：`BeforeTool`、`AfterTool`、`PreCompress`、`SessionStart`。`BeforeTool` 的 matcher 为 `run_shell_command|read_file|read_many_files|grep_search|search_file_content|web_fetch|activate_skill|mcp__plugin_context-mode|mcp__context-mode|mcp__(?!.*context-mode)`。命令形如 `context-mode hook gemini-cli beforetool`。重启后 `/mcp list` 应显示 `context-mode: ... - Connected`。可选：`cp node_modules/context-mode/configs/gemini-cli/GEMINI.md ./GEMINI.md`。
- VS Code Copilot：全局安装后，项目根建 `.vscode/mcp.json`（`servers.context-mode.command = context-mode`）；建 `.github/hooks/context-mode.json`，配 `PreToolUse` / `PostToolUse` / `SessionStart`，命令如 `context-mode hook vscode-copilot pretooluse`。重启 VS Code；用 `ctx stats` 验证。可选：拷 `copilot-instructions.md`。
- JetBrains Copilot：Settings > Tools > AI Assistant > Model Context Protocol (MCP) > Add Server，Name `context-mode`、Command `context-mode`；再建 `.github/hooks/context-mode.json`（PreToolUse/PostToolUse/SessionStart，`context-mode hook jetbrains-copilot ...`）；重启 IDE；`ctx stats` 验证。
- GitHub Copilot CLI：推荐 `npm install -g context-mode` 后 `copilot plugin install mksglu/context-mode:configs/copilot-cli`，同时注册 MCP + hooks + 路由 skill。手动：`copilot mcp add context-mode -- context-mode`，再写 `~/.copilot/hooks/context-mode.json`，包含六个扁平事件 preToolUse / postToolUse / preCompact / sessionStart / userPromptSubmitted / agentStop。注意：hook 调用全局 `context-mode`，旧版本 hook 不生效但不会阻塞工具（fail open），需 `npm install -g context-mode@latest`。
- OpenCode / KiloCode：在 `opencode.json` / `kilo.json` 的 `plugin: ["context-mode"]` 一行即可原生注册 11 个工具并启用 hook（in-process，不再起 stdio MCP 子进程）。可选：`cp node_modules/context-mode/configs/opencode/AGENTS.md AGENTS.md`。注意：同时存在 `plugin` 与 `mcp.context-mode` 会导致注册 0 个 `ctx_*` 工具，需 `context-mode upgrade` 清掉遗留 MCP 条目。
- OpenClaw / Pi Agent：克隆仓库后 `npm run install:openclaw`（可用 `-- /path/to/openclaw-state` 指定路径；默认读 `$OPENCLAW_STATE_DIR`，Docker 下为 `/openclaw`）。安装脚本负责 npm install、build、`better-sqlite3` 原生重编译、runtime.json 注册、SIGUSR1 重启网关。原文在此处被截断。

### 核心用法：用代码思考（Think in Code）
不管用哪种做法，关键动作是：让模型写脚本做分析，只 `console.log()` 结果，而不是把 50 个文件读进上下文再数函数。

示例：
```js
// Before: 47 × Read() = 700 KB.  After: 1 × ctx_execute() = 3.6 KB.
ctx_execute("javascript", `
  const files = fs.readdirSync('src').filter(f => f.endsWith('.ts'));
  files.forEach(f => console.log(f + ': ' + fs.readFileSync('src/'+f,'utf8').split('\\n').length + ' lines'));
`);
```
注意：这里的 700 KB / 3.6 KB 是 README 里的说法，未经验证。

## 怎么判断变好了
可观察指标分两类：

工具侧指标：
- `ctx_stats` / `ctx-stats`：按工具的节省明细、消耗 token、节省比例。
- 状态栏：`$ saved this session · $ saved across sessions · % efficient`。
- `ctx_doctor` / `ctx-doctor`：检查运行时、hook、FTS5、注册、版本；所有检查应为 `[x]`。

任务侧指标（调研报告特别提醒：README 只给了上下文占用指标，没有给任务结果质量指标，所以这部分要自己测）：
- 正确率：任务结果是否正确。
- 人工纠正次数：你需要介入纠正 agent 的次数。
- 交付时间：完成任务花了多久。
- 会话连续性：会话压缩后，agent 是否还能检索到之前的状态和决策。

最小试用方式：
- 按做法 A，在 Claude Code 上用 MCP-only 跑一个真实编码任务。
- 任务前后用 `ctx stats` 记录上下文节省。
- 同时记录任务侧指标，和不用 Context Mode 的基线对比。
- 如果任务会触发会话压缩，观察压缩后是否还能检索到之前的状态。

试多久：
- 调研报告没有给出固定时长，建议先做小范围试用，跑一个真实任务，对照 `ctx_stats` 的上下文节省与实际任务结果，再决定是否推广到团队。
- 如果要验证会话连续性，至少覆盖一次会话压缩和一次跨会话继续。

## 常见坑
- README 的 98% 节省、100x 说法、企业 logo 墙都是自述，缺少第三方验证。不要把营销数字当成已证事实。
- ELv2 许可对商用有限制，推广到团队前要确认合规。
- MCP-only 没有 hook、没有自动路由，模型可能不会主动用 `ctx_*` 工具。需要手动提示，或者上完整插件。
- 不传 `--continue` 时，上一次会话数据会立即删除。需要跨会话连续性时注意这个参数。
- Cursor 项目 `.cursor/hooks.json` 会覆盖 `~/.cursor/hooks.json`；旧安装残留条目会重复触发，doctor 会告警。
- OpenCode / KiloCode 同时存在 `plugin` 与 `mcp.context-mode` 会导致注册 0 个 `ctx_*` 工具，需 `context-mode upgrade` 清掉遗留 MCP 条目。
- GitHub Copilot CLI 的 hook 调用全局 `context-mode`，旧版本 hook 不生效但不会阻塞工具（fail open），需 `npm install -g context-mode@latest`。
- 不要加激进的“简洁”提示词。Context Mode 不强制写作风格；作者引用 Moonshot AI 在 `kimi-k2.5` 上的 issue，认为激进的“简洁”提示词会损害编码/推理 benchmark。
- Cursor 缺 SessionStart hook，需要手动拷规则文件；否则模型可能不知道为什么被拦。
- OpenClaw / Pi Agent 的原文在安装步骤处被截断，照做前先核对完整文档。

## 证据与来源
本手册基于 mksglu/context-mode 的 README 与调研报告。其中：

- “把工具输出挡在上下文之外”和“会话连续性用 SQLite/FTS5 检索”来自 README 对 Context Mode 四块组成的说明。README 称 315 KB 变 5.4 KB，减少 98%。
- “用代码思考”来自 README 的范式：让模型写脚本分析、只 `console.log()` 结果，而不是把 50 个文件读进上下文。示例里的 “47 × Read() = 700 KB 变 1 × ctx_execute() = 3.6 KB” 是 README 说法。
- 安装命令、hook 配置、各平台差异来自 README 原文。
- `ctx_stats`、`ctx_doctor`、状态栏指标来自 README 对工具和状态栏的说明。
- “先在 Claude Code（或 Cursor）上用 MCP-only 做小范围试用，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广”来自调研报告的结论。
- “README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证”来自调研报告的结论。
- “ELv2 许可对商用有限制”来自调研报告的结论。
- 仓库指标 24,371 stars（当日 +88）、Hacker News 排名 #1、570+ points 来自调研报告，属于当时的公开指标，不是效果证据。
- 调研报告指出：工具侧有上下文占用指标，但 README 没有给出任务结果质量（正确率、人工纠正次数、交付时间）的衡量方式。因此任务侧指标需要自己测，不能只看节省比例。
- Moonshot AI 在 `kimi-k2.5` 上的 issue 是作者引用，用于支持“不要用激进简洁提示词”的主张，不是本手册的实测结论。

## 依据的调研

- [mksglu/context-mode](../research/radar/2026-10-01/68-mksglu-context-mode.md)：值得一试，建议先在 Claude Code（或 Cursor）上做小范围试用：用 MCP-only 方式跑一个真实编码任务，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广到团队。理由是它直指“工具输出塞满上下文 + 会话压缩后失忆”这两个具体痛点，安装与回退成本低；但 README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证，且 ELv2 许可对商用有限制。
