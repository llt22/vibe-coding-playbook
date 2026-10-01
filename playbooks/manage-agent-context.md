# 让编码 agent 在长任务里少读废话、别失忆

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 在长任务里把大量工具输出读进上下文、会话压缩后丢状态、还花大价钱做「读很多只判断一点」的略读；本手册给出压缩、分流、持久记忆和补上下文的具体做法，并要求用任务侧指标验证是否真的变好。
> 先试这一步：先在一个本来就会产生大量工具输出的 Claude Code 真实任务上，按做法 A 用 MCP-only 装 Context Mode，任务前后各跑一次 `ctx stats`，同时记录正确率、人工纠正次数和交付时间。
> 最近修订：2026-10-02

## 解决什么问题

编码 agent 在真实任务里会调用大量工具：读文件、grep、跑 shell、抓网页、扫日志、翻工单。这些工具返回的原始数据直接进上下文窗口，很快就把上下文塞满；会话压缩时，之前的状态又可能丢失，agent 像失忆一样。还有一类更隐蔽的浪费：为了回答「哪些文件处理 auth」这种只需要一个小判断的问题，把 187 个文件全读进上下文。

本手册把对应这几类浪费的四组做法合在一起：把工具输出挡在上下文窗口之外（Context Mode、headroom）、把「读很多、只判断一点」的略读外包给小模型（Quicksilver）、用持久记忆保住跨会话状态（claude-mem）、用录屏口述补上下文和反馈（blurt）。核心要求是：不只看节省比例，要用任务侧指标验证结果有没有变好。

## 适用与不适用

适用：

- 你正在用编码代理（Claude Code、Codex、Cursor 等）做真实编码任务。
- 任务中本来就会产生大量工具输出（读多个文件、grep、shell、日志、web_fetch）。
- 你会经历会话压缩，或者需要跨会话继续同一个任务。
- 你有一类「读很多、只判断一点」的活：在 187 个文件里找处理 auth 的、在 3000 行日志里找真失败、在 200 张工单里找退款请求。
- 你有说不清、截图慢的界面问题，需要一个更自然的输入通道。
- 你愿意装 MCP server / 插件 / hook / 本地代理，并接受一次小范围试用。

不适用：

- 你对商用许可敏感。Context Mode 是 ELv2 许可，对商用有限制。
- 你不能把内容发给第三方。Quicksilver 会把待扫描内容发到 TypeSafe 的 API（`api.typesafe.ai`）。
- 你希望直接拿到第三方验证过的 98% 节省、100x 提升、~10x token 节省。这些数字都是各自 README 的自述，调研没有找到第三方验证或实验数据。
- 你的任务很小、工具输出很少，装 hook / 代理的开销可能不划算。headroom 原文也写了：短对话、散文、已经密集的载荷收益很小甚至为零，小于 `min_input_words` 的块原样返回。
- 你不想改配置、不想重启客户端，或者沙箱里跑不了本地进程（headroom 需要本机进程和端口）。
- 你的问题是纯后端、无界面、又拍不到。blurt 的前提是能看到问题或用手机拍到（终端、TUI、桌面应用可以）。
- 你只用单一 provider、也不需要跨 agent 记忆——headroom 的这部分收益对你不成立。

## 前置条件

- 如果走 Claude Code：Claude Code v1.0.33+（Context Mode 要求），用 `claude --version` 确认。claude-mem 要求 Claude Code 最新版且支持插件。
- Node.js/npm 可用。Quicksilver 要 Node 18+；claude-mem 要 Node 20.0.0+，Bun 和 uv 缺失时会自动安装，SQLite 3 已捆绑；headroom 要 Python 3.10+。
- 一个真实编码任务，最好本来就有大量工具调用，能对比前后差异。不要用玩具任务，否则看不出节省。
- 各自的凭据与许可：
  - Quicksilver：到 `console.typesafe.ai` 申请一个 Jev key。内容会被发送到 TypeSafe 的 API，所以不要拿它处理不能给第三方的数据。
  - claude-mem：标准安装会要求浏览器登录（邮箱 magic link，无需信用卡）；不想要账号交互就显式传 `--provider`、设 `CLAUDE_MEM_ONLINE_OPTIN=false`，或在 CI / 非交互 shell 里运行。
  - headroom：匿名 beacon 默认开启，上报压缩比例、计数、provider 与 model ID、OS 与架构，不上报 prompt、补全、代码或文件路径；合规需要时用 `HEADROOM_BEACON=off`。
- 知道 Context Mode 是 ELv2 许可，推广前确认商用合规。
- 如果走完整插件，能修改 `~/.claude/settings.json` 并重启 Claude Code。

## 操作步骤

先选做法：

- 只想先省上下文、不想装 hook，且用 Claude Code → 做法 A（Context Mode MCP-only），推荐先做。
- 想让它自动拦截大输出、自动路由到沙箱 → 做法 B（Context Mode 完整插件）。
- 用 Cursor、插件未上架 → 做法 C。
- 主要痛点是「读很多、只判断一点」→ 做法 D（Quicksilver 做批量略读判断）。
- 主要痛点是「换会话就失忆、反复交代背景」→ 做法 E（claude-mem 持久记忆）。
- 想在本地统一压缩所有经过 LLM 的流量，而且要求可逆 → 做法 F（headroom）。
- 痛点是不好描述、说不清复现步骤的界面问题 → 做法 G（blurt 录屏口述）。

这些做法可以叠加，但一次只加一个，否则分不清是哪个起了作用。

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

4. 准备一个真实编码任务，任务里本来就会产生大量工具输出，例如读多个文件、grep、跑 shell。

5. 在任务开始前和结束后，输入 `ctx stats` 查看状态。预期：能看到按工具的节省明细、消耗 token、节省比例。

6. 手动提示模型使用 `ctx_*` 工具。因为 MCP-only 没有自动路由，模型不一定会自己用。可以在提示词里明确要求：批量读取、统计、聚合类工作先用 `ctx_execute` 写脚本完成，只输出结果。

7. 记录任务结果：正确率、人工纠正次数、交付时间。最好能和不用 Context Mode 的基线对比；没有基线就至少记录这次任务里上下文占用和工具输出的关系。

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

### 做法 D：把「略读型批量判断」外包给 Jev（Quicksilver）

适用形态：一个窄的、带类型的判断，作用在大量条目上——「187 个文件里哪几个处理 auth」「3000 行日志里哪些是真失败」「200 张工单里哪些是退款请求」。Jev 返回带类型的判定，Claude 只拿回一个 shortlist。

1. 准备前提：Claude Code 已安装；Node 18+；到 `console.typesafe.ai` 申请一个 Jev key。内容会被发送到 TypeSafe 的 API（`api.typesafe.ai`），所以不要拿它去处理不能给第三方的数据。

2. 交互式安装（会复制 skill 到 `~/.claude/skills/quicksilver`，并只问一次 Jev key）：
   ```bash
   npx github:UditAkhourii/quicksilver
   ```
   装完**重启 Claude Code**。之后 Claude 在任务看起来像「读很多来判断一点」时会自行调用这个 skill。

3. 非交互安装（CI、dotfiles 场景），或用环境变量传 key（`JEV_API_KEY` 或 `TYPESAFE_API_KEY`）：
   ```bash
   # pass the key non-interactively (CI, dotfiles)
   npx github:UditAkhourii/quicksilver install --key YOUR_JEV_KEY
   ```

4. 作为 Claude Code 插件安装（替代方式）：
   ```bash
   /plugin marketplace add UditAkhourii/quicksilver
   /plugin install quicksilver@quicksilver
   ```

5. 从克隆安装：
   ```bash
   git clone https://github.com/UditAkhourii/quicksilver && cd quicksilver && ./install.sh   # or .\install.ps1
   ```

6. 在会话里直接下指令（六类命令，按任务形态选）：
   ```bash
   qs filter   "Does this file handle user sessions?" src           # which files matter
   qs filter   "Does this line report a failure?" app.log --lines    # log triage, repeats collapsed
   qs classify --labels "bug,feature,question" --items issues.jsonl # bulk routing
   qs rank     "where do we issue refunds?" src --top 5              # relevance ranking
   qs find     "the retry backoff logic" huge_module.py              # locate lines in huge files
   qs ask      "Does this contract allow termination without notice?" --state @contract.txt
   qs status                                                          # key check + lifetime tokens saved
   ```

7. 大扫描时加 `--fast`：把条目打包处理，在「明显是针」的场景下约快 10 倍（README 原文：`Add --fast to pack items and go about 10× faster on obvious needles.`）。

8. 按 skill 的要求改写提问方式（这部分是免费的提示工程收益）：一次只问**一个窄的、带类型的判断**——一个 yes/no 条件、一组封闭标签，或一个评分标准；写清确切的边界情况；给一个兜底标签；不做算术、不涉及日期。把问题变成一个可复用、可测试的单元，而不是一种「感觉」。

9. 读回执判断这次调用值不值。每次运行结束都会打印回执：
   ```
   — 3000 scanned · 6 matched · 0 borderline · 64.2s · jev 1.0M tok ($0.0436) · ~56k Claude tokens not read
   ```

10. 安全边界（由工具自身执行，但要知道它做了什么）：不会发送 `.env*`、私钥、证书、凭据文件；遵守 `.gitignore`；跳过二进制文件和大于 2 MB 的文件。key 保存在 `~/.quicksilver/config.json`（仅用户权限）。删除 key：
    ```bash
    npx github:UditAkhourii/quicksilver setup --remove
    ```

11. 明确不要用它做的事：写作、编辑、多步推理，以及任何 `grep` 能精确回答的问题。

### 做法 E：跨会话持久记忆（claude-mem）

适用形态：一个要连续做很多天的项目，你不想每次都重新交代背景。

1. 前提：Node.js 20.0.0+；Claude Code 最新版且支持插件；Bun 和 uv 缺失时会自动安装；SQLite 3 已捆绑。

2. 标准安装（Claude Code）。运行后安装器先完成部署，再要求你在浏览器登录 claude-mem（邮箱 magic link，无需信用卡）。
   ```bash
   npx claude-mem install
   ```

3. 想跳过登录/账号交互：显式传 `--provider`，或设置 `CLAUDE_MEM_ONLINE_OPTIN=false`，或在 CI / 非交互 shell 中运行——安装器会不经过任何账号交互直接完成。

4. 改用插件市场安装（在 Claude Code 内）：
   ```bash
   /plugin marketplace add thedotmack/claude-mem

   /plugin install claude-mem
   ```

5. 安装到其他 harness（README 给出的入口）：
   ```bash
   npx claude-mem install --ide opencode
   npx claude-mem install --ide antigravity
   npx claude-mem install --ide omp
   npx claude-mem install --ide grok-bot
   ```
   注意：Grok Bot 没有 host hook，所以改为监听 chat log 文件；默认用托管记忆 CMEM Pro，本地 observer 需显式 `--provider host` 才启用；装该插件**不会**顺带安装 Cursor。

6. OpenClaw 网关上安装（一条命令完成依赖、插件、AI provider 配置、worker 启动，可选把观察实时推送到 Telegram/Discord/Slack）：
   ```bash
   curl -fsSL https://install.cmem.ai/openclaw.sh | bash
   ```

7. 重启 Claude Code。此后新会话会自动出现此前会话的上下文。

8. 配置写在 `~/.claude-mem/settings.json`（首次运行自动创建默认值），可配 AI 模型、worker 端口、数据目录、日志级别、上下文注入设置。

9. 设置工作流模式与语言（同时控制工作流行为和生成观察所用语言）：
   ```json
   {
     "CLAUDE_MEM_MODE": "code--zh"
   }
   ```
   `code--zh`（简体中文）已内置，无需额外安装或更新插件；改完需重启 Claude Code 生效。语言模式遵循 `code--[lang]` 命名（如 `zh`、`ja`、`es`）。查看本地可用模式：
   ```bash
   ls ~/.claude/plugins/marketplaces/thedotmack/plugin/modes/
   ```

10. 让 SessionStart 上下文包含所有 harness 的观察（默认 `"false"`，只限当前 harness）：在 `~/.claude-mem/settings.json` 中设 `"CLAUDE_MEM_SESSION_START_INCLUDE_ALL_SOURCES": "true"`，或在 viewer 设置里打开 **Include all sources at session start**。观察条数上限仍对所选来源整体生效。

11. 隐私控制：用 `<private>` 标签把敏感内容排除在存储之外。

12. 检索三层工作流（MCP 工具，先便宜后昂贵）：
    ```typescript
    // Step 1: Search for index
    search(query="authentication bug", type="bugfix", limit=10)

    // Step 2: Review index, identify relevant IDs (e.g., #123, #456)

    // Step 3: Fetch full details
    get_observations(ids=[123, 456])
    ```
    4 个 MCP 工具：`search`（全文检索索引，可按 type/date/project 过滤，约 50–100 tokens/结果）、`timeline`（某条 observation 或查询前后的时间线上下文）、`get_observations`（按 ID 批量取完整详情，约 500–1,000 tokens/结果，务必批量）。

13. 关闭 Grok Bot 的 awareness 推送时使用：
    ```bash
    CLAUDE_MEM_GROK_BOT_AWARENESS_ENABLED=false
    ```
    README 声明该推送不写 `profile.md`、user-memory 或 project memory。

14. 注意：`npm install -g claude-mem` 只安装 **SDK/库**，不注册插件 hook、不搭建 worker 服务。装插件一律走 `npx claude-mem install` 或上面的 `/plugin` 命令。

15. 出问题时：直接把问题描述给 Claude，troubleshoot skill 会自动诊断并给修复；也可生成完整 bug 报告：
    ```bash
    cd ~/.claude/plugins/marketplaces/thedotmack
    npm run bug-report
    ```

16. Windows 提示：若报 `npm : The term 'npm' is not recognized`，确认 Node.js/npm 已安装并加入 PATH，从 nodejs.org 装最新版后重启终端。

### 做法 F：本地代理压缩所有 LLM 流量（headroom）

适用形态：你不想逐个改客户端，想让一个本地代理接管提示、工具输出、日志、RAG 结果、文件和对话历史的压缩，而且压缩可逆（原文缓存在本地，模型需要全文时用 `headroom_retrieve` 取回）。

1. 安装（三种方式任选）。前提：Python 3.10+，能起本地进程。
   ```bash
   uv tool install --python 3.13 "headroom-ai[all]"  # CLI 装在隔离环境里，推荐
   pip install "headroom-ai[all]"                    # Python，自带 headroom CLI
   npm install headroom-ai                           # 只有 TypeScript SDK，没有 CLI
   ```
   注意：`headroom` CLI 只在 PyPI 包里；npm 包是库（`import { compress } from 'headroom-ai'`），不提供命令行。macOS 上如果默认 `python3` 比当前 wheel 支持的新，加 `--python 3.13`。

2. 选接入模式：
   ```bash
   headroom deploy                # 一站式本地部署 + agent 配置
   headroom wrap claude           # 包裹一个编码 agent
   headroom proxy --port 8787     # 即插即用代理，零代码改动
   ```
   内联用法（Python，可放进任意应用）：
   ```python
   from headroom import compress
   from openai import OpenAI

   messages = [{"role": "user", "content": "Analyze these results"}]
   result = compress(messages, model="gpt-4o")

   client = OpenAI()
   response = client.chat.completions.create(model="gpt-4o", messages=result.messages)
   print(f"Saved {result.tokens_saved} tokens ({result.compression_ratio:.0%})")
   ```
   `headroom wrap` 每次都要用它来启动会话才会生效：它会起本地代理、为语义代码导航装 Serena、再按「路由到 Headroom」的方式启动 agent。Claude Code 场景下 Serena 只注册到被包裹的那个项目（写进 `~/.claude.json` 的 `local`-scope MCP server）；要全局可用加 `--code-memory-scope user`，要跳过加 `--code-memory none`。撤销用 `headroom unwrap <tool>`（`claude`、`copilot`、`codex`、`grok`、`kimi`、`omp`、`opencode`、`openclaw`、`zcode`）。

3. 自检与看省量：
   ```bash
   headroom doctor    # 健康检查，确认路由生效
   headroom perf
   headroom dashboard # 实时省量（代理需在运行）
   ```
   `headroom doctor --network` 可以看上游证书是谁签的、Headroom 是否信任、是否有网关拦截页。

4. 打开输出 token 削减（默认关闭）：
   ```bash
   export HEADROOM_OUTPUT_SHAPER=1     # off by default
   headroom proxy --port 8787
   ```
   两个机制：verbosity steering 在 system prompt 末尾追加一句「简洁点、别复述上下文」的说明（加在末尾是为了不破坏 prompt cache）；effort routing 在「模型只是接着工具结果往下走」的轮次（读文件、测试通过）下调思考强度，新问题和报错仍用满强度。两条路径都支持：Anthropic `/v1/messages`，以及 OpenAI 兼容的 `/v1/chat/completions` 和 `/v1/responses`；分别通过 OpenAI 的 `reasoning_effort` 和 Anthropic 的 `thinking.budget_tokens` / `output_config.effort` 实现。
   已有一个在跑的代理时要注意：这些开关是每次请求实时读的，但 `headroom wrap` 复用（而非新建）的代理，其环境变量是启动时快照的。`headroom wrap` 会通过 loopback 的 `POST /admin/runtime-env` 把当前设置热同步给运行中的代理，不用重启、不丢请求。共享代理上这些覆盖是全局的，最后一个显式设置生效。

5. 让工具自己学简洁度：
   ```bash
   headroom learn --verbosity            # dry run — 先看它发现了什么
   headroom learn --verbosity --apply    # 保存，代理会读取
   ```

6. 量测输出节省：
   ```bash
   headroom output-savings
   # Reduction: 31.7%  (95% CI 27.7% … 35.7%)   [estimated]
   ```
   想要实测数而不是估计数，留出 10% 会话作为未处理的对照组：
   ```bash
   export HEADROOM_OUTPUT_HOLDOUT=0.1
   ```
   之后 dashboard 的 **Output Tokens Saved** 卡片会显示 `measured` 并带区间。

7. 自己复现官方基准：
   ```bash
   uv run python benchmarks/index_proof_table.py --seed 20260902
   python -m headroom.evals suite --tier 1
   ```

8. MCP client 配置（Codex 等不继承交互式 shell PATH 的客户端），用 `command -v headroom` 拿到的绝对路径：
   ```toml
   [mcp_servers.headroom]
   command = "/Users/you/.local/bin/headroom"
   args = ["mcp", "serve"]
   ```
   `command = "headroom"` 只有在客户端启动时的 PATH 已包含 uv 工具目录时才行。MCP 原生客户端也可以直接 `headroom mcp install`。

9. 失败挖掘与回滚：
   ```bash
   headroom learn                        # 挖失败会话，默认写 CLAUDE.local.md（gitignored）
   headroom learn --target CLAUDE.md     # 写团队共享文件，也可写 AGENTS.md / GEMINI.md / GROK.md
   headroom unwrap <tool>                # 撤销持久化包裹
   ```

10. 关闭遥测（如合规需要）：
    ```bash
    export HEADROOM_BEACON=off   # 或用 DO_NOT_TRACK=1，或 --offline
    ```

11. 几个有前提的针对性开关：Anthropic `/v1/messages` 路径上用 `--mode cache` 会跳过自动的 `--memory` 上下文注入，以保持 provider 前缀稳定；OpenAI chat/responses 和 Gemini 会把 memory 追加到 live-zone 尾部；需要在 Anthropic 路径上带自动 memory 上下文时改用 `--mode token`。Copilot CLI 订阅模式：
    ```bash
    headroom copilot-auth login
    headroom wrap copilot --subscription -- --model gpt-4o
    ```
    GitHub Enterprise Server 或自定义域名部署，启动前设置其一（两个都设时 URL 优先）：
    ```bash
    export GITHUB_COPILOT_ENTERPRISE_DOMAIN=ghe.example.com
    export GITHUB_COPILOT_ENTERPRISE_URL=https://ghe.example.com
    ```

### 做法 G：录屏 + 口述，把上下文和复现步骤一次性录进去（blurt）

适用形态：你能看到问题、但不值得手打一份复现步骤；或者问题由不写代码的同事（PM、设计、运营、客户）发现。

1. 安装 skill。前提：已有能跑 skills 的编码 agent（README 明确支持 Claude Code、Codex 及任何运行 skills 的 agent）。
   ```bash
   npx skills add AGIHunt/blurt
   ```
   Claude Code 也可以用：
   ```
   /plugin marketplace add AGIHunt/blurt
   ```
   或者直接把仓库 URL 贴给 agent，让它自己装。

2. 在任意项目中让 agent 启动。触发语（原文）：
   ```
   "start blurt" / 「开始口喷」
   ```
   首次运行会自动为你的机器挑选语音模型，并安装 Blurt 菜单栏应用。

3. 划定录制区域：拖选一个区域、点选某个窗口，或全屏。README 说明 Tabs、书签等界面外内容不会进画面。

4. 倒计时 3-2-1 后开始口述。悬浮小条显示时间与麦克风电平，带 ⏸ 暂停、↺ 重录、Finish。悬浮条本身不会被录进视频。快捷键：`⌥⇧P` 暂停、`⌥⇧S` 完成。

5. 点 Finish 后回到工作，agent 在本地转写、写出条目、打开评审页（评审页就绪后自动弹出）。

6. 像刷信息流一样逐条分诊，全部为键盘操作：
   ```
   A 保留 · X 丢弃 · J/K 上一条/下一条 · Z 撤销 · G 列表 · V 总览
   ```
   然后导出，或对 agent 说「fix them」。

7. 常驻用法（菜单栏应用）：`⌥⇧R` 在任意位置开始录制，再按一次 `⌥⇧R` 结束；`⌥⇧B` 打开菜单。录制默认写到工作区 `~/Blurt`，也可以绑定到某个项目目录，好让 agent「带着代码」处理。

8. 后台自动处理：打开 *After recording → Claude Code / Codex*，此后每次录完都在后台被处理，评审页准备好后弹出。

9. 团队协作（无仓库的人也能参与）：队友从 releases 页下载 Blurt for macOS，解压后第一次右键 → Open，按 `⌥⇧R` 录制；然后用 *Recent recordings → Copy video* 把视频贴到 Slack/飞书里；或者绑定一个共享项目文件夹。条目会保留录制者姓名，导出落到团队已有的表格和列名上。

10. 语音模型与语言（首次运行会挑，也可以自带 key）：
    - 默认本地语音识别 SenseVoice（经 sherpa-onnx），约 240 MB，CPU 上很快，中英混说处理好；
    - Apple Silicon 或 NVIDIA 上可用 Whisper；
    - 也可以自带 Groq、OpenAI 或 DashScope 的 key；
    - 默认情况下没有任何数据离开本机；
    - SenseVoice 覆盖中、英、日、韩、粤语；德法西等 99 种语言用本地 Whisper 或云端 key；输入什么语言，条目就用什么语言输出；
    - 录制器用 macOS 的 ScreenCaptureKit，音视频同步误差在一帧以内；可以打开系统音频，它走单独音轨，因此转写能区分「你」和「对方」的话。

11. 录制对象不限于网页应用：终端、TUI、桌面应用同样录制和框选；手机用自带录屏并把麦克风打开；硬件类用手机拍下来，然后把视频交给 agent 说 `process this video`。一次录制可以混合多种类型，由 agent 判断每条是什么。团队还可以加自己的 lens（如 `ux-research`、`sales-call`、`sop`），参考 `skills/blurt/reference/schema.md#custom-lenses`。

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
注意：这里的 700 KB / 3.6 KB 和 47×Read() 是 README 里的说法，未经验证。

## 怎么判断变好了

要分两类指标看：**工具侧**（省了多少上下文/token）和**任务侧**（结果有没有变好）。调研报告特别提醒：这些项目的 README 普遍只给了上下文或成本指标，没有给任务结果质量指标，所以任务侧必须自己测。

工具侧指标：

- Context Mode：`ctx_stats` / `ctx-stats`（按工具的节省明细、消耗 token、节省比例）；状态栏 `$ saved this session · $ saved across sessions · % efficient`；`ctx_doctor` / `ctx-doctor` 检查运行时、hook、FTS5、注册、版本，所有检查应为 `[x]`。
- Quicksilver：每次运行末尾的回执（扫描数、命中数、borderline 数、耗时、Jev token 与成本、「约多少 Claude token 没被读」）；`qs status` 看 key 状态和累计节省 token。
- claude-mem：看新会话是否自动注入此前上下文，以及主动检索的命中率；README 只提出三层工作流可带来 ~10x token 节省，没有可复核的实验数据。
- headroom：`headroom doctor`、`headroom perf`、`headroom dashboard`；`headroom output-savings` 默认给估计值（原文示例 `Reduction: 31.7% (95% CI 27.7% … 35.7%) [estimated]`），想看实测就开 `HEADROOM_OUTPUT_HOLDOUT=0.1`，dashboard 的 Output Tokens Saved 卡片会显示 `measured` 并带区间。
- blurt：录制到评审页的端到端耗时；每次录制的 token 与实际花费（README 给的是 ~142k/19k、~$2 这一档）。

任务侧指标：

- 正确率：任务结果是否正确。Quicksilver 的基准里就出现过省 85% token 但 F1 从 54% 掉到 23% 的情况，所以不能只看省量。
- 人工纠正次数：你需要介入纠正 agent 的次数。
- 交付时间：完成任务花了多久。
- 会话连续性：会话压缩后，agent 是否还能检索到之前的状态和决策。
- 条目保留率（blurt）：按 A 保留的条数 / 总条数；以及保留条目里「不需要再补上下文就能直接开工」的比例、代码定位命中率。

最小试用方式：

1. 按做法 A，在 Claude Code 上用 MCP-only 跑一个真实编码任务；任务前后用 `ctx stats` 记录上下文节省；同时记录任务侧指标，和不用 Context Mode 的基线对比；如果任务会触发会话压缩，观察压缩后是否还能检索到之前的状态。
2. Quicksilver：用少量你已标注的样本核对后再扩大。先跑一条 `qs filter`，读回执，再抽查几个被标 `?` 的边界项，确认 Claude 复查后结果对不对。README 的 12 项基准里有部分任务准确率明显下降（日志 triage F1 54%→23%、安全审查 shortlist F1 100%→89%），所以必须用自己的数据核对。
3. claude-mem：1 台机器、1 个已有项目、1–2 天。跑 3–5 次带工具调用的会话（含一次 bug 修复），开一个新会话看是否自动注入此前项目上下文；再让模型用 `search` → `get_observations` 主动回查历史，例如 `search(query="<你的 bug 关键词>", type="bugfix")`；最后用 `<private>` 包一段假敏感信息，验证它没有进入存储。
4. headroom：先跑 `headroom doctor` 确认路由生效，看 dashboard 在你自己的流量上省了多少；开 `HEADROOM_OUTPUT_HOLDOUT=0.1` 拿实测输出节省；不满意用 `headroom unwrap <tool>` 回滚。
5. blurt：选一个有真实小 bug 的 Web 项目，录一段 5–10 分钟走查，一边点页面一边口述，故意在中途跳一次话题、改一次口径，看拆分是否混乱；等评审页弹出后全程只用键盘 A/X/J/K 过一遍，记录保留与丢弃各多少；对保留的条目说「fix them」，看 agent 是否照着复现步骤改对；第二段换一个不写代码的同事录，验证跨人交接这一环。

试多久：

- 调研没有给出统一固定时长。建议先做小范围试用，跑一个真实任务，对照工具侧节省与实际任务结果，再决定是否推广到团队。
- 要验证会话连续性，至少覆盖一次会话压缩和一次跨会话继续；claude-mem 建议 1–2 天、3–5 次会话。
- blurt 只要「条目保留率高 + 端到端时间明显短于原方式」，就值得固定成一种输入惯例；如果条目需要大量返工或代码定位经常错，先退回参考。
- headroom 在长会话、重工具输出的场景下试；短对话、散文类负载不用试，收益接近零。

## 常见坑

Context Mode：

- README 的 98% 节省、100x 说法、企业 logo 墙都是自述，缺少第三方验证。不要把营销数字当成已证事实。
- ELv2 许可对商用有限制，推广到团队前要确认合规。
- MCP-only 没有 hook、没有自动路由，模型可能不会主动用 `ctx_*` 工具。需要手动提示，或者上完整插件。
- 不传 `--continue` 时，上一次会话数据会立即删除。需要跨会话连续性时注意这个参数。
- Cursor 项目 `.cursor/hooks.json` 会覆盖 `~/.cursor/hooks.json`；旧安装残留条目会重复触发，doctor 会告警。
- OpenCode / KiloCode 同时存在 `plugin` 与 `mcp.context-mode` 会导致注册 0 个 `ctx_*` 工具，需 `context-mode upgrade` 清掉遗留 MCP 条目。
- GitHub Copilot CLI 的 hook 调用全局 `context-mode`，旧版本 hook 不生效但不会阻塞工具（fail open），需 `npm install -g context-mode@latest`。
- 不要加激进的「简洁」提示词。Context Mode 不强制写作风格；作者引用 Moonshot AI 在 `kimi-k2.5` 上的 issue，认为激进的「简洁」提示词会损害编码/推理 benchmark。
- Cursor 缺 SessionStart hook，需要手动拷规则文件；否则模型可能不知道为什么被拦。
- OpenClaw / Pi Agent 的原文在安装步骤处被截断，照做前先核对完整文档。

Quicksilver：

- 准确率不是无条件变好。基准里日志 triage 的 F1 从 54% 掉到 23%，安全审查 shortlist 的 F1 从 100% 掉到 89%；这类结果只能当 shortlist 用，由 Claude 复查被标 `?` 的边界项（README 自己也把 p≈0.5–0.65 的项标 `?`）。
- 主观或团队风格类标签不适合外包：commit 类型 `perf` vs `refactor`，Quicksilver 76% vs Claude 83%；编码了「没写下来的政策」的标签更差（BGL 超算日志 alert 标签，Claude 单独 54% F1，Quicksilver 只有 23%）。
- 内容是发到第三方 API 的；`--fast` 只在「明显是针」的场景下有意义；超大扫描（几千次 Jev 调用）墙钟时间和 Claude 差不多——那里赢的是 token 和上下文，不是速度。
- 不要用它做写作、编辑、多步推理，以及任何 `grep` 能精确回答的问题。

claude-mem：

- `~10x token savings`、「get up to 100% more usage from your plan」、「seamlessly preserves context」、自动运行的可靠性，都只是作者主张，README 没有给基准或对照实验。
- 存在商业引导：安装后要求浏览器登录、签发 memory key、托管记忆 CMEM Pro 免费 14 天，到期后若不订阅会「自动回落到你的 Anthropic plan」。
- README 末节推广 CMEM 代币并给出 BASE 合约地址，与记忆功能无技术关联，是需要警惕的噪音。
- Grok Bot 的 awareness 推送被明确标注为 pilot，且声明不写 profile.md / user-memory / project memory。
- 环境门槛：Node 20+、Bun、uv、Windows 上的 PATH 问题；`npm install -g claude-mem` 只装 SDK，是常见踩坑点。

headroom：

- 它是一个会接管你全部 LLM 流量的本地代理，别无条件全量铺开；收益随数据重复度剧烈变化，基准全部自报。
- `headroom wrap` 每次都要用它启动会话才生效；输出压缩默认关闭，需要显式开 `HEADROOM_OUTPUT_SHAPER=1`。
- `headroom wrap` 复用（而非新建）的代理，环境变量是启动时快照的，虽然 `wrap` 会热同步；共享代理上的覆盖是全局的，最后一个显式设置生效。
- 匿名 beacon 默认开启（可用 `HEADROOM_BEACON=off` / `DO_NOT_TRACK=1` / `--offline` 关）；MCP 客户端不继承交互式 shell PATH，需要写绝对路径。
- 短对话、散文、已经密集的载荷收益很小甚至为零；沙箱里跑不了本地进程就用不了。

blurt：

- 仓库 40 stars、成熟度低，只有 README 自述，没有第三方评测、没有基准数据。
- 录制端以 macOS 为主，Windows 只有 Tk + ffmpeg，路线图里的 Windows 托盘应用尚未完成。
- 前提是能看到问题或用手机拍到；纯后端/无界面的问题需要另想办法。
- 质量依赖带视觉的强模型，弱模型产出会明显下降。
- 成本不完全看录制时长：除条目数外，还取决于当前对话已有多长（缓存读取 ~4–5M tokens）。
- 首次运行要下载约 240 MB 模型，或自备 Groq/OpenAI/DashScope key。
- 路线图里「浏览器捕获（把 console 报错和网络失败对齐到视频）」还没做，目前拿不到浏览器内部错误。
- 团队用法要求无仓库的同事手动下载、解压、首次右键打开。

## 证据与来源

本手册合并了五份材料：mksglu/context-mode、UditAkhourii/quicksilver、AGIHunt/blurt、thedotmack/claude-mem、headroomlabs-ai/headroom。以下逐条标注依据和性质。

Context Mode（来自 README 与调研报告）：

- 「把工具输出挡在上下文之外」和「会话连续性用 SQLite/FTS5 检索」来自 README 对 Context Mode 四块组成的说明。README 称 315 KB 变 5.4 KB，减少 98%。
- 「用代码思考」来自 README 的范式：让模型写脚本分析、只 `console.log()` 结果，而不是把 50 个文件读进上下文。示例里的「47 × Read() = 700 KB 变 1 × ctx_execute() = 3.6 KB」是 README 说法，未经验证。
- 安装命令、hook 配置、各平台差异来自 README 原文；`ctx_stats`、`ctx_doctor`、状态栏指标来自 README 对工具和状态栏的说明。
- 「先在 Claude Code（或 Cursor）上用 MCP-only 做小范围试用，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广」来自调研报告的结论。
- 「README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证」「ELv2 许可对商用有限制」来自调研报告的结论。
- 仓库指标 24,371 stars（当日 +88）、Hacker News 排名 #1、570+ points 来自调研报告，属于当时的公开指标，不是效果证据。
- 调研报告指出：工具侧有上下文占用指标，但 README 没有给出任务结果质量（正确率、人工纠正次数、交付时间）的衡量方式，因此任务侧指标需要自己测。
- Moonshot AI 在 `kimi-k2.5` 上的 issue 是作者引用，用于支持「不要用激进简洁提示词」的主张，不是本手册的实测结论。

Quicksilver（来自 README 调研）：

- 有数据的部分：12 任务基准，其中 8 个用真实公开数据（一台超算的日志、Banking77、UCI SMS Spam、SST-2、Hono 代码库及其 git 历史、lodash）；每个任务由「按常规方式工作的 Claude Code subagent（Read/Grep/Glob）」和「Claude + Quicksilver」分别完成，都对照隐藏 ground truth 打分，指标是 F1 / accuracy / hit@k，基准可复现（`bench/`）。关键读数：日志 triage F1 54%→23%、Claude token −85%；噪声日志找针 100%→100%、−95%；工单路由 100%→99%、−82%；垃圾短信 97%→92%、−79%；情感 97%→96%、−85%；代码库发现（Hono 187 文件）100%→100%、−91%；安全审查 shortlist 100%→89%、−74%。
- 在线回执（扫描数、命中数、borderline、耗时、Jev 成本、Claude 未读 token）来自 README 的实际输出格式；README 称 Claude 侧 token 已扣除用对照任务测出的固定 subagent 开销，并把每次任务加载 SKILL.md、每条命令、Claude 读回的每个字节都计入成本。
- 中位省 82% token 这一说法来自调研报告的结论。
- 只是作者主张或未验证的：「Claude 会自动调用该 skill」的触发可靠性、`--fast` 快 10 倍、安全排除规则的实际覆盖面。

claude-mem（来自 README 调研）：

- 事实性内容：版本 13.28.0；Apache-2.0；Node >= 20；系统依赖 Bun/uv/SQLite 3；5 个生命周期 hook + 6 个 hook 脚本；4 个 MCP 工具；三层检索工作流；设置文件 `~/.claude-mem/settings.json`；`code--zh` 已内置；各 IDE 安装参数；仓库指标 95,042 stars（来源 metrics）。
- 只是作者主张、没有实验支撑的：`~10x token savings`、「get up to 100% more usage from your plan」、「seamlessly preserves context」、自动运行的可靠性。README 没有基准测试、对照实验或用户案例数据。
- 托管记忆、14 天试用后回落 Anthropic plan、代币推广、Grok Bot pilot，均来自调研报告对 README 的描述。
- 本材料仅来自仓库 README，未包含代码、issue 或第三方评测。

headroom（来自 README 调研）：

- 事实性内容：安装三种方式、接入形态、`wrap`/`unwrap` 命令、内容类型分工（JSON → SmartCrusher、源码 → CodeCompressor/AST、散文 → Kompress-v2-base）、CCR 可逆检索、输出侧两个机制及生效路径、`HEADROOM_OUTPUT_HOLDOUT` 与 `measured` 的对应关系、遥测字段范围、MCP 绝对路径要求。
- `headroom output-savings` 的示例输出 `Reduction: 31.7% (95% CI 27.7% … 35.7%) [estimated]` 来自 README。
- 基准全部自报，README 提供了复现命令，但没有第三方验证。

blurt（来自 README 调研）：

- 给出数据的部分：两段真实会话的测量——7.0 分钟录制 / 2.8 分钟语音 / 9 条 / 本地转写 4 秒 / 录制到评审页 ~4 分钟 / ~142k 输入 19k 输出 token / 按 API 价格 ~$2；8.6 分钟录制 / 5.0 分钟语音 / 20 条 / 转写 5 秒 / ~5 分钟 / ~150k、~20k / ~$2。另注明还要加上当前对话的缓存读取（~4–5M tokens，按输入价 1/20 计，已含在上表中）。两段会话用 Claude Code + Opus 5.5 + 生产 Web 应用。
- 只是作者主张、没有对应数据的：「原来两天、现在 30 分钟」；「能挑对每一帧并框准位置」；「能把跳跃、自我纠正的口述拆干净」；「条目里包含可能是哪段代码负责」的准确率。
- 其他事实性内容：默认本地识别、视频不入模、模型约 240 MB、音视频同步误差一帧以内、SenseVoice 覆盖 5 种语言、Whisper 覆盖 99 种语言。
- 仓库 40 stars、macOS 为主、路线图项未完成，均来自调研报告的局限说明。

## 依据的调研

- [mksglu/context-mode](../research/radar/2026-10-01/68-mksglu-context-mode.md)：值得一试，建议先在 Claude Code（或 Cursor）上做小范围试用：用 MCP-only 方式跑一个真实编码任务，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广到团队。理由是它直指“工具输出塞满上下文 + 会话压缩后失忆”这两个具体痛点，安装与回退成本低；但 README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证，且 ELv2 许可对商用有限制。
- [UditAkhourii/quicksilver](../research/radar/2026-10-01/15-uditakhourii-quicksilver.md)：值得一试，建议小范围试：按 README 给出的命令把 Quicksilver 装进 Claude Code，让它把「读很多、只判断一点」的批量筛选/分类交给 Jev，Claude 只处理被标 `?` 的边界项；理由是安装与使用步骤可直接照做、12 项可复现基准显示中位省 82% token，但部分任务准确率明显下降且依赖第三方 API，需自己用少量标注核对后才敢扩大使用。
- [AGIHunt/blurt](../research/radar/2026-10-01/26-agihunt-blurt.md)：值得一试，把「录屏+口述」当作给编码 agent 补上下文和反馈的固定通道来试：按 README 装好 skill，在一个真实项目里录一段 5–10 分钟走查，让 agent 拆条目、挑关键帧、写复现步骤，再用评审页逐条取舍。理由是这套流程有可照做的安装命令、快捷键、模型选择和实测成本，属于可落地的做法；但仓库仅 40 stars、以 macOS 为主、除 README 自述外没有可核实的评测，故先小范围验证而非直接采纳。
- [thedotmack/claude-mem](../research/radar/2026-10-01/522-thedotmack-claude-mem.md)：值得一试，可以在 Claude Code 上小范围试用：用 `npx claude-mem install` 装好后重启，让它在真实项目里自动捕获并注入跨会话记忆，再用检索命中率和重复交代背景的次数判断是否值得长期留下；理由是 README 给出了可直接照做的安装、配置和检索步骤，但效果数据（如 ~10x token 节省）只有作者主张，且夹带托管记忆与代币推广，需自行验证。
- [headroomlabs-ai/headroom](../research/radar/2026-10-01/528-headroomlabs-ai-headroom.md)：值得一试，建议在长会话、重工具输出的编码 agent 上小范围试用：装好后用 `headroom wrap <agent>` 包一层，先用 `headroom doctor` / `headroom savings` 读自己流量上的省量，并开 `HEADROOM_OUTPUT_HOLDOUT=0.1` 拿实测的输出节省，再决定是否长期保留。理由是原文给出了可直接照抄的安装、接入、量测、复现基准和回滚（`headroom unwrap`）步骤，但它是一个会接管你全部 LLM 流量的本地代理，收益随数据重复度剧烈变化、基准全部自报，不适合无条件全量铺开。
