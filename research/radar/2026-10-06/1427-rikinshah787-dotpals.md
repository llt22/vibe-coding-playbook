# Rikinshah787/dotpals

- 结论：**值得一试**。建议在已有测试套件的小项目上按 README 一条命令装起来小范围试：用 dotpals 读取测试输出、识别“伪造通过”，并在 Claude Code 试图收尾/commit/push 时把失败测试回推给它修。理由是它给出了完整可照做的安装、MCP 接入和自定义 agent 事件接口，且自带一份逐条人工核对的准确率数据；但项目很新（31 stars、v0.10），强制回修只支持 Claude Code，其余 agent 只能事后观察，需先验证再决定是否长期用。
- 原文：https://github.com/Rikinshah787/dotpals
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-05T17:37:51.797Z

## 是什么
dotpals 是一个本地运行的桌面小工具（浮动 pal + 屏幕顶部 notch + dashboard），用来观察编码智能体到底做了什么。它通过 Claude Code 的 hook/transcript、Codex 的 session 日志、其他 agent 的 hook 或插件、以及通用的 `POST /event` 接口收集事件，把工具调用、文件改动、命令输出汇总成「故事」（如 *Changed 5 files +42 −7 · Tests failed twice, then passed · Committed and pushed*），而不是几百条工具日志。

核心能力是**读测试输出而不是听 agent 自称**：判断测试是否真通过（jest、vitest、mocha、node:test、pytest、go、cargo、dotnet、Maven、Gradle、PHPUnit、RSpec 等）、说明失败原因（"expected 3, got -1 (test/math.test.js:5)"）、识别「伪造通过」（改测试去掉断言、加 skip、改期望值），并在 Claude Code 试图结束、commit 或 push 时把失败测试回推给它修。另提供 MCP server，让任意助手查询「真的做了什么」的证据而不是 agent 的说法。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 1. 一键安装（前提：Node 20 或更新）
```bash
npx dotpals@latest setup
```
从 GitHub 直装：
```bash
npx --allow-git=all github:rikinshah787/dotpals setup
```
这一步会：把桌面 pal 装到 `~/.dotpals` 并下载 runtime（Electron，约 100 MB，一次）；若装了 Claude Code 就加插件；若装了 Codex 自动接管；启动 pal、开启「登录时打开」、打开 dashboard。
可选参数：`--no-claude`（跳过插件）、`--no-login`（不要开机自启）、`--no-start`。随时重跑即可更新。

### 2. 只装 Claude Code 插件
在 Claude Code 里：
```
/plugin marketplace add rikinshah787/dotpals
/plugin install dotpals@dotpals
```
重启 Claude Code，然后运行 `/dotpals:pals`。首次会询问是否下载桌面窗口的 runtime；之后每个 Claude Code 会话启动时 pal 自动出现。

### 3. Codex（无需安装）
dotpals 跟随 Codex 的会话日志 `~/.codex/sessions`，CLI、IDE 扩展和 app 都会显示。保持 pal 运行（托盘里勾 *Open when I log in*）。用 `DOTPALS_CODEX=0` 可关掉。

### 4. 接入其他 agent
打开 dashboard 的 **Agents** 页，对要用的 agent 按 **Connect**。Connect 会先备份原文件、合并而非覆盖、读不了的文件不动；**Disconnect** 只移除 dotpals 加的内容；**Send a test event** 会跑真实命令，收到则有个 pal 打招呼。Connect 会改动这些文件：

| Agent | Connect 改动的文件 |
| ----- | -------------------- |
| Cursor | `~/.cursor/hooks.json`（保存即重载） |
| Gemini CLI | `~/.gemini/settings.json`（需 Gemini CLI 0.26+，且在你信任的目录里） |
| OpenCode | 新增 `~/.config/opencode/plugins/dotpals.js`（需重启 OpenCode） |
| GitHub Copilot CLI | 新增 `~/.copilot/hooks/dotpals.json` |

每个集成也可以在 `~/.dotpals/config.json` 里用 `{ "agents": { "cursor": false } }` 关掉，id 为 `claude`、`codex`、`cursor`、`gemini`、`opencode`、`copilot`、`generic`。

### 5. 接任何自定义 agent（POST JSON）
前提：本地 bridge 在跑，监听 `127.0.0.1:5175`。同一个 `id` 的行会被合并，所以可以在工具调用开始时发一次、结束时再发一次：
```bash
# a tool call starts…
curl -s localhost:5175/event -d '{
  "session": "run-42", "harness": "my-agent", "label": "my-project",
  "state": "working", "text": "Running tests",
  "activity": { "id": "call-1", "kind": "run", "tool": "shell", "title": "Run the tests",
                "status": "running", "body": { "command": "npm test" } }
}'

# …and finishes
curl -s localhost:5175/event -d '{
  "session": "run-42", "harness": "my-agent", "state": "thinking",
  "activity": { "id": "call-1", "status": "ok", "ms": 5120, "body": { "output": "42 passing" } }
}'

# a file edit, with its diff
curl -s localhost:5175/event -d '{
  "session": "run-42", "harness": "my-agent",
  "activity": { "id": "call-2", "kind": "edit", "tool": "write_file", "title": "src/app.js", "status": "ok",
                "files": [{ "path": "/abs/path/src/app.js", "change": "edit" }],
                "body": { "patch": "-const a = 1;\n+const a = 2;" } }
}'
```
字段：`activity.kind` 取 `prompt`/`read`/`edit`/`write`/`run`/`search`/`web`/`agent`/`mcp`/`skill`/`plan`/`tool`/`done`/`error`；`activity.status` 取 `running`/`waiting`/`ok`/`failed`/`stopped`/`info`；`activity.files` 为 `[{ path, change: "read"|"edit"|"write"|"delete" }]`；`activity.body` 为 `{ command?, patch?, output?, args? }`。要新增一个 agent，在 `bridge/adapters/` 写同形状的模块（`id`、`name`、`detect()`、`connect()`、`disconnect()`、`apply()`）并在 `index.js` 里登记。

### 6. 让任意助手通过 MCP 问 dotpals
Claude Code：
```bash
claude mcp add dotpals -- npx dotpals mcp
```
Codex，写进 `~/.codex/config.toml`：
```toml
[mcp_servers.dotpals]
command = "npx"
args = ["dotpals", "mcp"]
```
Cursor 等：命令 `npx`，参数 `dotpals mcp`。前提是 dotpals 在跑（MCP 只读本地 pal）。可用工具：`agents_now`、`test_status`、`ready_to_merge`、`recap`、`today`、`risky_steps`、`handoff_note`、`check_my_work`。可以直接问「What are my agents doing?」「Is this really tested?」「Is feat/login ready to merge?」「What did Codex change in billing this morning?」。项目默认取助手所在的目录，按 agent 真实工作的文件夹匹配（同名文件夹、monorepo 包、git worktree 会区分开）。

### 7. 打开「让 agent 修失败测试」
Claude Code 上默认开启，可在 Settings 或 notch 里的齿轮关掉。行为：测试失败即刻告知 Claude 并说明原因；当它测试失败或最后一次改动后没跑测试却想结束/commit/push 时，回推去修，**每个请求最多两次**，之后可以停下并由 pal 告诉你。没改代码的请求（「跑测试告诉我结果」）只报告失败；Claude 动手前就已失败的测试只报告、不强制它修；输出被 `| tail` 之类切断而无法判读时让它重跑，仍读不出就请你人工看。无测试的项目不会被拦住。

### 8. 判读不清时的二次复核
`Settings → Set up Laya` 或 `dotpals laya`（需 Python 3.10+）在本地复核；或 `Settings → Double-check unclear test results` 选云端 TypeSafe Jev（默认关，需要你的 key，会发送去除密码/密钥/邮箱/IP 后的测试输出尾部）。

### 9. 常用命令与快捷键
```bash
dotpals start       # open the floating pal
dotpals dashboard   # open the dashboard
dotpals status      # what's running and connected
dotpals doctor      # no pal or notch? checks and fixes it (setup runs the same check at the end)
dotpals bridge      # only the bridge, e.g. on a machine without a desktop; dashboard at http://127.0.0.1:5175/dashboard
dotpals mcp         # an MCP server, so any assistant can ask dotpals what your agents did (see below)
dotpals statusline  # Claude Code 只有通过 status line 才共享用量上限，运行一次即可
dotpals notch --auto | --off
```
快捷键：`Ctrl+Alt+P`（macOS `⌘⌥P`）显示/隐藏 pal；批准卡显示时 `Ctrl+Alt+N` / `Ctrl+Alt+Y`（macOS `⌘⌥N` / `⌘⌥Y`）拒绝/允许。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（还有哪些工作没想过交给 AI）**
- 把「验证 agent 有没有真做完」本身交给工具：读测试输出判定通过/失败、给出失败原因、区分 `✅ ran successfully` / `❌ failed` / `❔ unclear` / `⚪ not run`。
- 自动识别「伪造通过」：测试变绿只是因为有人删了断言、加了 skip 或改了期望值。
- 自动生成可交付文本：`today` + **Copy today** 直接产出 standup 便条；**Copy recap** 把任一请求导出成 PR 描述或 commit message；`handoff_note` 把会话交接给另一个 agent。
- 风险步骤巡检：`risky_steps` 列出 force push、递归删除、`.env` 改动等。

**2. 任务匹配（什么工作适合怎样的模型、工具、协作方式）**
- 适合长跑、多步、会跑测试、会 commit/push 的编码任务；对「改了代码但测试通过后又改文件」这类时点问题特别有用（显示 *Changed 2 files after the tests passed: not tested since*）。
- 按 agent 分档：只有 Claude Code 具备 hook + transcript 的完整观测和**强制回推修复**；Cursor / Gemini CLI / OpenCode / GitHub Copilot CLI 只挂只读 hook（原文明确「none of them can approve or block anything」），只能事后观察和提醒；Codex 走日志跟随，零安装。
- 协作方式：用 MCP 让一个助手去问另一个助手「真的做了什么」——`check_my_work` 用于 agent 说 done 之前自检，`ready_to_merge` 用于合并前的复核清单。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 运行环境：Node 20+，首次约 100 MB Electron runtime；本地 bridge 只监听 `127.0.0.1:5175`。
- 观测输入：Claude Code 的 hook 事件与 `~/.claude/projects` 下的 transcript；Codex 的 `~/.codex/sessions`；其他 agent 的 hook/插件配置写入权限（Connect 会备份并合并）。
- 前提条件：项目要有测试套件（无测试的项目不会被拦住）；只统计 agent 自己跑的测试，看不到你手跑的或 CI。
- 可选：Python 3.10+（Laya 本地复核）、云端 Jev 的 API key。
- 反馈通道：notch 上的批准卡（Deny/Allow，可键盘操作）、通知与提示音、桌面通知；`Settings` 里控制保留多久历史（默认 7 天，存 `~/.dotpals/history.json`，`DOTPALS_HISTORY=0` 可关）。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
- 事件触发：hook/日志事件实时喂给 bridge，pal 与 dashboard 实时读取；agent 需要批准时 notch 自动弹出；完成/失败卡片 5 秒和 8 秒后自动关闭；离开 3 分钟后 notch 缩为细条。
- 状态触发：测试失败即时告知；agent 在测试失败或最后一次改动后未跑测试却想结束/commit/push 时自动回推（每请求最多两次）；输出被判读不清时自动要求重跑。
- 常驻：安装时开启开机自启（`--no-login` 可关），历史跨重启保留，`dotpals bridge` 可在无桌面机器上只跑服务。

**5. 效果验证（怎样判断确实改善了结果）**
- 这是该工具的主职：从测试输出的自带摘要判读结果，来源可追溯（测试输出摘要或 *(exit code only)*）；0 个测试或只有 skip 一律读作 *Tests unclear: no tests actually ran*，绝不当成通过；标注「最后一次改动之后是否测试过」「最后一次 commit 是否被测试过」。
- `ready_to_merge` 复现评审者会做的检查：最后一次改动后跑过测试且通过（不是靠改测试通过的）、没有遗留失败、没有风险动作、工作已提交。
- 工具自身也做了效果验证：见下节准确率表，并提供 `npm run accuracy` 与 `node scripts/accuracy-capture.mjs` 让你加自己的用例。

## 与已有做法的关系（对照给出的清单条目）
- **Claude Code（adopt）**：dotpals 以插件 + hook + transcript 深度对接，是唯一支持「失败测试强制回推修复」和「伪造通过回推」的 agent；`dotpals statusline` 还需为 Claude Code 单独跑一次来显示用量上限。
- **Cursor（watch）**、**OpenCode（watch）**、**GitHub Copilot（drop）**：dotpals 为它们提供只读 hooks/插件接入（Copilot 特指 GitHub Copilot CLI），只能观察和提醒，不能拦截。
- **Laya（watch）**：被 dotpals 收作可选组件，用于在本地二次复核判读不清的测试结果（`Settings → Set up Laya`，需 Python 3.10+）。
- **Cline（watch）**：原文没有提到。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
**给出的数据**：`test/accuracy/cases` 放了 36 个真实请求（去掉路径、密钥、提示词），21 个来自开发 dotpals 本身，15 个来自一个植入 bug 的练习项目（让 Claude 跑测试、加代码、伪造一次通过的测试）。逐条人工核对 255 条 claim，结果：243 正确（95.3%）、5 错、7 unsure。分项：测试结果 99 条中 91 对 1 错 7 unsure；风险步骤 14/14；重试 15 中 14 对 1 错；ready to merge 36 中 35 对 1 错；为什么停下 36 中 35 对 1 错；改了什么（git）10 中 9 对 1 错；「改测试以通过」20/20（抓到 3 次伪造，其余 17 次正确保持沉默）；为什么测试失败 25/25。
**案例**：练习项目中 Claude 被要求伪造通过的测试，dotpals 抓到 3 次伪造。
**性质说明**：这些是作者自测、自建样本，不是独立第三方评测；unsure 被明确定义为「缺答案而非错答案」。
**原文自陈的局限**：
- 强制回推修复只覆盖 Claude Code；其他 agent 只能事后观察。
- 只看得到 agent 自己跑的测试，看不到你手跑的或 CI 的。
- git 无法判断是谁改的文件，所以你在某请求期间 reset 的文件会被算作该 agent 改动。
- 已知 5 条错判：一条测试结果和一条 ready_to_merge 因为 bridge 存了被截断的长命令（新请求已修）；一条重试和一条「为什么停下」因为同一渲染两次失败后换参数成功而没被关联。
- Linux 下小窗口无法让空白区域的点击穿透（平台限制）。
- 隐私默认全本地，唯一例外是可选云端 Jev（会发送去除疑似密码/密钥/邮箱/IP 后的输出尾部）；默认开启的「让 agent 修失败测试」会把 Claude 自己的测试结果短注加进其上下文。
- 项目状态：31 stars、v0.10，比较新、小众；README 在「Any event the pal already underst…」处被截断，`Agent states`、在自有 app 中使用 pal（`registerCustom(...)` / `<dot-pal character="custom">`）等后续内容没有拿到。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
**最小试用（建议 1 天）**：
1. 选一个**有测试套件的小项目**，装：`npx dotpals@latest setup --no-login`。
2. 先用只读能力：让 Claude Code 跑一次测试，看 pal/dashboard 报的是不是与你预期一致。
3. 做两次受控实验：
   - 故意让 Claude 改坏一个测试再让它「收尾」，看它是否被立即告知失败、是否在试图 commit/push 时被回推（以及是否止于最多两次）。
   - 让它用「删断言 / 加 skip / 改期望值」的方式把测试变绿，看是否被抓出并被告知。
4. 接入 `dotpals mcp`（`claude mcp add dotpals -- npx dotpals mcp`），用 `check_my_work` 和 `ready_to_merge` 对同一份工作做一次判断。
5. 如果主要 agent 不是 Claude Code，先只用观察面（Cursor/OpenCode/Copilot CLI 的 Connect），别指望拦截。

**判断有没有改善的指标**：
- 回推后最终修复率，以及「最多两次」是否够用（不够说明你的任务粒度太大）。
- 伪造通过的捕获数 vs 你人工复查的结果（对得上才算有用）。
- 「测试通过后又改了文件」这类标记与实际 diff 的一致率。
- `ready_to_merge` 的结论与你作为评审者的判断是否一致（原文自报 35/36，可在自己项目上复核）。
- 一周内 **Copy today / Copy recap** 产出的 standup、PR 描述有多少能直接用、需要改多少。
- 误报/漏报清单：哪些 claim 明显不对，是否符合原文那 5 类已知错误模式。

**风险控制**：先在非关键仓库试；注意默认开启的「让 agent 修失败测试」会写入 Claude 的上下文，不想要就关掉；要保留更短历史可设 `DOTPALS_HISTORY=0`。
