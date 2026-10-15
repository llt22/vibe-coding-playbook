# 复盘 AI 编码会话：先回放取证，再导出备份

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：本机 AI 编码助手的对话散落在各自存储里，你既说不清 AI 这次到底干了什么、错在哪、产出了什么，也无法把它们统一导出用于备份、微调或使用分析。
> 先试这一步：先跑 `uvx agentplay agents` 看本机有哪些会话可读，再 `AGENTPLAY_NO_NETWORK=1 uvx agentplay` 打开本地 viewer 回放一次。
> 最近修订：2026-10-15

## 解决什么问题

你同时用 Claude Code、Cursor、Cline、Aider 等 AI 编码助手，对话历史散落在各自的本地存储里。由此带来两类做不成的事：一是说不清「这次 AI 到底干了什么」——它在改这个文件之前读了什么、有什么始终没打开、哪条命令失败了、同一条重试了几次、上下文窗口在哪里填满、这次会话产出了哪些 commit / PR；二是难以复盘自己怎么用 AI、横向比较工具，或在应用清库前把对话备份下来。

这篇手册给两条互补的路线：先用 agentplay 把本机已有的会话回放成「地图 + 时间线」做效果取证，再用 `nachisama/ai-data-extractor` 把这些本地对话统一导出成规范化 JSONL 做备份、微调或个人使用分析。两条路线都强调先做安全预览、验证数据源确实能取到数据，再决定是否长期依赖。

## 适用与不适用

适用：

- 做法 A（agentplay 回放取证）：本机至少有一种受支持智能体留下过会话，你想核对 AI 的实际行为、失败点和产出，并且要求全本地、无账号、无 API key。
- 做法 B（ai-data-extractor 导出 JSONL）：本机装过并用过支持来源之一，想把个人 AI 编码对话抽出来做微调、个人使用分析或备份；愿意先跑 `--list` 做安全预览再决定是否提取。
- 两者可以一起用：它们读的是同一批本地会话，但产物的隐私面不同（见「操作步骤」开头怎么选）。

不适用：

- 你期望有官方支持、稳定 schema 或完整字段。两个工具都是第三方工具，字段随来源而异。
- 你不想处理密钥或专有代码。
- 你用的工具不在支持范围内：ai-data-extractor 覆盖 Claude Code、Codex CLI、Cursor、Windsurf、Trae、Continue、Gemini CLI、OpenCode、Cline / Roo Code、Aider；agentplay 覆盖 Claude Code、Codex（CLI/IDE）、Cursor（agent CLI 与 IDE composer）、GitHub Copilot CLI、VS Code 中的 Copilot、OpenCode、Kiro，**明确不支持 Cline**（README 在 Contributing 里把 Cline 和 Gemini CLI、Amp、Roo、Windsurf、Aider 一起列为最想要的第三方 parser）。
- 你想要准确的成本数字：agentplay 对 Cursor 会话拿不到 token / cost（Cursor 不把计费用量写盘，工具也不去调 Cursor API），成本是估算。

## 前置条件

- Python 版本：做法 A 需要 Python 3.11 或更高；做法 B 需要 Python 3.9+（推荐 3.10+）。
- 本机至少有一种受支持智能体留下过会话。agentplay 默认读取 `~/.claude`、`~/.codex`、`~/.cursor`、`~/.copilot`、`~/.kiro`、`~/.local/share/opencode/opencode.db` 等默认目录。
- 做法 A 的工具本身除标准库外无运行时依赖，可以用 `uvx` / `pipx` 直接跑，不必先克隆仓库。
- 做法 B 需要已把 `nachisama/ai-data-extractor` 仓库代码放到本地，并能进入项目根目录运行 `extract.py`。材料未给出克隆 / 安装命令，这一步需按仓库说明自行补上。
- 如果准备提取 Aider，先知道项目目录位置，因为 Aider 没有中心化会话库。

## 操作步骤

先决定走哪条路线。两条路线读同一批本地会话，可以同时做。

- 想回答「AI 这次到底干了什么、错在哪、产出是什么」→ 走做法 A。
- 想把对话原文抽出来做微调、训练或个人备份 → 走做法 B。agentplay 的地图按设计不含 prompt 文本、助手文本或推理、工具输入输出、文件内容、命令参数（只记动词），所以取不回对话原文。
- 想做工具 / 模型横向对比：做法 A 的格式里有可读的调用次数、token、延迟、花费字段，但原文没有给出任何跨模型对比的结论或推荐；做法 B 的 JSONL 只有 `messages`、`source`、`session_id` 三个字段可以始终依赖。两边都得自己设计字段口径。

### 做法 A：把会话回放成地图与时间线（agentplay）

A1. 确认 Python 版本。前提：想用做法 A。预期：看到 3.11+。

```bash
python --version   # 3.11+ required
```

A2. 先确认本机有哪些智能体的会话可读。前提：不确定本机哪些工具的会话能被读到。预期：列出可读的智能体。这是做法 A 最该先跑的一步。

```bash
uvx agentplay agents
```

A3. 一条命令跑起来。前提：至少有一种受支持智能体留下过会话。预期：自动找到已有会话、逐个生成脱敏回放、打开本地 viewer。

```bash
uvx agentplay
# 等价写法
pipx run agentplay
pip install agentplay   # 或装进环境
```

A4. 关掉唯一的网络调用。前提：viewer 首次打开会邀请填 email，你不想参与。预期：不再发起该网络调用。

```bash
AGENTPLAY_NO_NETWORK=1 agentplay
# 或
DO_NOT_TRACK=1 agentplay
# PowerShell: $env:AGENTPLAY_NO_NETWORK = "1"   cmd: set AGENTPLAY_NO_NETWORK=1
```

A5. 在 viewer 里读。前提：viewer 已打开，默认地址 `http://127.0.0.1:7317/`。预期：能按下面几种视角定位问题。

- 地图：这次到底碰了哪些 repo、目录、文件（看见 / 读过 / 改过）、shell 动词、MCP server 与工具、skills、subagent、web host、错误类别、模型，以及产出（commit、PR、ticket）。
- 时间线：按 1x / 4x / 16x 回放，lane 覆盖 prompts、errors、delays、outputs、edits、exploration、MCP、skills、tools、model、cost、tokens、subagents、context size，并标出 compaction。
- 快捷键：`Space` 播放 / 暂停，方向键单步、`Shift` 走 10 步，`E` 跳到下一个 edit、`X` 下一个 error、`D` 下一个 delay、`O` 下一个 output、`R` 下一个 retry。
- 作用域：按 task、按 model、或按单个 subagent（agent lens）整体重聚焦。
- task 划分：通常一个 prompt 一个 task，标签取自该 prompt 开头。
- 每个视图都是 URL，可把「某一刻」的链接发给同机跑着 viewer 的人。

A6. 用 Errors 面板做失败复盘。前提：想定位哪些命令失败、同一条重试了几次。预期：Errors 标签页按类别分组，并按「同一条失败命令连续失败的最长串」排序；点某一行直接把回放定位过去。header 上的 error / PR / subagent 徽章可以同法收窄时间线。

A7. 导出与分享（务必先脱敏）。前提：要把某次会话的 map 发给别人或另一台机器。预期：生成 / 导入 `agentplay/v1` JSON。

```bash
agentplay export <session>                  # 写单个会话的 map 到 .json / .json.gz
agentplay build --path-mode dirs_only       # 要公开发布就重建为目录级路径
agentplay import <map 文件>                 # 把同事/另一台机器的 map 加进本地库
```

路径模式（`--path-mode`，用在 `build` 或 `view`）：`relative`（默认，`src/billing/invoice.py`）／`dirs_only`（`src/billing/•a1b2c3`）／`hashed`（每段用 `AGENTPLAY_HMAC_KEY` 做 HMAC-SHA256，没设 key 会退回 dirs_only）。注意：**任何模式下 repo 名和 remote 都会保留**，remote 敏感的话分享前手动删掉 `repos[].remote`。

A8. 控制范围与增量。前提：会话很多，或只想看近期的。预期：builds 是增量的，只重建 transcript 变过的会话。

```bash
agentplay build --since 30d                 # 只处理窗口内变化的会话（12h / 2w / 2026-09-01）
agentplay build --agents claude-code,codex  # 限定智能体
agentplay build --limit 20                  # 最新 N 个
agentplay build --rebuild                   # 连没变的也重建
agentplay list --limit 20 --json            # 机器可读输出
agentplay view --port 7317 --no-open --no-build
agentplay view --no-titles                  # 不留本地标题，并清掉已存的
```

A9. 会话目录不在默认位置时用环境变量覆盖。前提：会话存在别处（WSL 场景常用）。预期：能扫到指定位置。

```bash
AGENTPLAY_CLAUDE_HOMES=~/.claude,/mnt/c/Users/you/.claude agentplay
```

同类变量还有 `AGENTPLAY_CODEX_HOMES`、`AGENTPLAY_CURSOR_HOMES`、`AGENTPLAY_COPILOT_HOMES`、`AGENTPLAY_COPILOT_VSCODE_HOMES`、`AGENTPLAY_OPENCODE_HOMES`、`AGENTPLAY_KIRO_HOMES`、`AGENTPLAY_HOME`（默认 `~/.agentplay`）。

A10.（可选）从源码安装 / Windows。前提：想改 parser 或看 demo 才需要。预期：本地构建出 viewer 并运行。

```bash
git clone https://github.com/Entelligence-AI/agentplay
cd agentplay
make setup        # python venv + viewer node_modules
make viewer       # 构建 web viewer 并拷进 Python package
make run          # agentplay view
```

Windows 下 `make` 需 Git Bash / MSYS2 / WSL；没有 `make` 时按 README 的 PowerShell 等价步骤（`uv venv python\.venv` → `uv pip install ...` → `corepack pnpm install --frozen-lockfile` → `corepack pnpm run build` → 拷贝 `dist` 到 `python/src/agentplay/viewer` → `.venv\Scripts\agentplay view`）。viewer 需要 `viewer/package.json` 里钉的 pnpm 10.x。

不装也能先看效果：在 `viewer/` 里 `pnpm dev` 会加载三个合成 demo 会话；也可以把任意 `agentplay/v1` 文件直接拖到页面上。

### 做法 B：把对话导出成规范化 JSONL（ai-data-extractor）

B1. 确认 Python 版本和运行位置。前提：代码已放到本地，进入项目根目录。预期：看到 Python 3.9+，推荐 3.10+。

```bash
# No dependencies -- standard library only
python --version   # 3.9+ required, 3.10+ recommended
```

B2. 先做安全预览，不落盘。前提：想知道工具是否能找到你的数据目录。预期：只报告每个来源发现了什么，不提取任何内容。这是做法 B 最该先跑的一步。

```bash
python extract.py --list                    # just show what's installed, don't extract
```

B3. 选择提取方式。

做法 B-1：交互式提取。适合第一次用、想从编号菜单里挑来源。运行后按菜单选择。

```bash
python extract.py
```

做法 B-2：直接指定来源或全量提取。适合已确定要哪些来源，或想一次全量。预期：在 `extracted_data/` 下生成带时间戳的 JSONL；加 `--merge` 还会生成 `all_conversations.jsonl`。

```bash
python extract.py --all
python extract.py --sources cursor,claude_code,aider
python extract.py --all --merge             # also write all_conversations.jsonl
```

也可用仓库自带简写脚本：

```bash
./extract_all.sh
```

完整 CLI 参数（原文照抄）：

```text
python extract.py [--all] [--sources ids] [--list] [--output-dir DIR]
                    [--search-path PATH ...] [--merge]

--all                 Extract every supported source, no prompts.
--sources ids         Comma-separated source ids (see table above for names,
                      or run with --list to see them). Skips the menu.
--list                Report what was found for each source without
                      extracting anything -- a fast, safe preview.
--output-dir DIR      Where to write JSONL (default: ./extracted_data)
--search-path PATH    Extra directory to search, on top of the normal OS
                      locations. Repeatable. Mainly useful for:
                        - Aider, which has no fixed app-data folder and
                          needs to know where your projects live
                        - nonstandard install locations for anything else
--merge               After extracting, also concatenate everything into
                      all_conversations.jsonl
```

B4. 如果提取 Aider，额外指定项目目录。前提：Aider 没有中心化会话库，每个项目目录下各有一份 `.aider.chat.history.md`。预期：能扫到你指定的项目目录。默认会扫用户主目录加若干常见项目根名 `projects`、`code`、`dev`、`repos`、`workspace`、`src`、`Documents`，深度最多 5 层，跳过 `node_modules`、`.git` 等。

```bash
python extract.py --sources aider --search-path ~/client-work --search-path /mnt/data/repos
```

B5. 查看产物和字段口径。前提：提取已完成。预期：每次运行在 `extracted_data/` 下生成带时间戳的文件，每行一个 JSON 会话；若加 `--merge` 另有 `all_conversations.jsonl`。提取内容可包括用户消息与助手回复、代码上下文、代码 diff 或建议编辑、工具调用及其结果、时间戳、会话 ID、项目路径、模型名，但字段随来源而异。稳定性边界：不是每个工具都记录 `code_context`、token 用量或 `project_path`；只有 `messages`、`source`、`session_id` 三个字段可以始终依赖。做横向对比前必须按这一点设计字段口径。

B6. 单来源调试。前提：某个工具提取异常，想单独排查。预期：直接运行该来源的 extractor。

```bash
python -m extractors.cursor
# 或
python extractors/cursor.py
```

B7. 分享或训练前先扫密钥。前提：准备把导出数据分享、提交或用于训练。预期：扫描出疑似密钥，并人工复查专有代码、API key、个人文件路径；`code_context` 和 `tool_use` 最可能命中。

```bash
pip install detect-secrets --break-system-packages
detect-secrets scan extracted_data/*.jsonl
```

不要把 `extracted_data/` 提交到公开仓库（已在 `.gitignore` 里）；含客户或专有内容时要放到加密存储。

B8. 后续消费数据。前提：已有 `extracted_data/*.jsonl`。预期：可以按原文示例用 `datasets.load_dataset` 加载 JSON，过滤出含 assistant 消息的会话，再用 tokenizer 的 `apply_chat_template` 处理；该示例需要你自备 tokenizer。

B9. 扩展新来源。前提：你用的工具不在支持列表，或想自己加 extractor。预期：照最简模块实现 `find_installations` 和 `extract` 两个函数，再注册到 `extract.py` 的 `REGISTRY`；SQLite/JSON/JSONL 读取器和两个通用启发式都在 `extractors/common.py`。

B10. 遇到问题时按原文路径排查。前提：`--list` 或提取报错或数据少。预期：定位到目录、数据库锁定或启发式键名问题。

- 报 "No installation found"：工具没装、没有历史、或位置非标准 → 用 `--search-path` 直指，或改 `extractors/<tool>.py` 的 `SEARCH_DIRS` / `APP_DIR_NAMES` 常量。
- Cursor/Windsurf 数据库锁定：读取是用 `mode=ro` 打开的，正常情况下正在运行的编辑器不会阻塞；仍报错就关掉应用重跑。
- Windsurf/Trae 找到了安装目录但 0 条会话：说明 `common.heuristic_extract_chat_from_kv` 的键名启发式没匹配上，先 `--list` 确认目录已找到，再直接看库里的键并补进 `KEY_HINTS`（材料未给出查看键的具体命令）。

## 怎么判断变好了

最小试用（做法 A）：

- 跑 `uvx agentplay agents`，确认本机至少有一种受支持智能体的会话可读。
- 再 `AGENTPLAY_NO_NETWORK=1 uvx agentplay` 跑一次，确认 viewer 在 `http://127.0.0.1:7317/` 打开，且能看到地图和时间线。
- 在地图上核一件事：这次会话改过哪些文件、哪些只是读过没改；在时间线上按 `X` 跳到下一个 error，看失败命令和重试次数是否对得上你的记忆。

最小试用（做法 B）：

- 先运行 `python extract.py --list`，确认它能找到你至少一个已用过的工具的数据目录；再只提取一个来源（例如 `python extract.py --sources claude_code` 或 `cursor` 或 `aider`，Aider 加 `--search-path`），检查 `extracted_data/` 是否生成带时间戳 JSONL，每行一个 JSON 会话。
- 分享或训练前 `detect-secrets scan` 是否可运行并给出扫描结果。

可观察指标：

- 做法 A：`agents` 是否列出可读会话；viewer 地图是否出现文件与产出（commit / PR / ticket）；时间线是否出现 `err` / `retries` / `compactions`；`outcome` 字段是否落到 `pr_created` 之类的实际产物。
- 做法 B：`--list` 是否报告找到安装或数据；提取产物中是否存在可依赖的 `messages`、`source`、`session_id`；若做横向比较，检查目标工具是否真的提供 `code_context`、token 用量、`project_path`。

试多久：材料未给出固定试用时长。做法 A 建议以一次 `agents`、一次回放、一次 error 面板核对作为最小试用；做法 B 建议以一次预览、一次单来源提取、一次密钥扫描作为最小试用。结果可用后再扩大（做法 A 到 `build --since` 或全量，做法 B 到 `--all` / `--merge`），长期依赖前多跑几次验证稳定性。

## 常见坑

做法 A：

- README 在 Contributing 里把 Cline 和 Gemini CLI、Amp、Roo、Windsurf、Aider 一起列为「最想要的第三方 parser」，也就是说不支持——别指望用它复盘这些工具的会话。
- Cursor 会话拿不到 token / cost，成本是估算，不能当准确账单看。
- 分享 map 前要脱敏：路径模式里 `relative` / `dirs_only` / `hashed` 只影响路径，**任何模式下 repo 名和 remote 都会保留**；remote 敏感就手动删 `repos[].remote`。`hashed` 没设 `AGENTPLAY_HMAC_KEY` 会退回 `dirs_only`。
- 按 README 的隐私契约，地图不含 prompt 文本、助手文本或推理、工具输入输出、文件内容、命令参数（只记动词如 `git log` / `pytest`）。这是它的隐私设计，但也意味着你不能靠它取回对话原文；要原文请走做法 B。
- viewer 首次打开会邀请填 email，这是唯一的网络调用，用 `AGENTPLAY_NO_NETWORK=1` 或 `DO_NOT_TRACK=1` 关掉。
- Windows 下从源码构建需要 Git Bash / MSYS2 / WSL，viewer 依赖 `viewer/package.json` 里钉的 pnpm 10.x。

做法 B：

- README 未给出克隆/安装命令，只显示从项目根目录直接运行 `extract.py`；操作前需自行把仓库代码放到本地。
- 字段随来源而异，不是每个工具都记录 `code_context`、token 用量或 `project_path`；只有 `messages`、`source`、`session_id` 三个字段可以始终依赖，横向对比前先统一字段口径。
- 它是第三方工具，且 Windsurf、Trae 等来源使用未公开 schema 和启发式解析；先跑 `--list` 验证能取到数据，再决定是否长期依赖。
- Aider 没有中心化会话库，默认只扫用户主目录和若干常见项目根名；项目在别处时必须用 `--search-path`。
- Cursor/Windsurf 数据库锁定：读取用 `mode=ro`，正常情况下正在运行的编辑器不会阻塞；仍报错就关掉应用重跑。
- Windsurf/Trae 找到了安装目录但 0 条会话，通常是 `common.heuristic_extract_chat_from_kv` 的键名启发式没匹配上；先 `--list` 确认目录已找到，再直接看库里的键并补进 `KEY_HINTS`。
- 报 "No installation found"：工具没装、没有历史、或位置非标准；用 `--search-path` 直指，或改 `extractors/<tool>.py` 的 `SEARCH_DIRS` / `APP_DIR_NAMES` 常量。
- 分享或训练前必须扫密钥，并人工复查专有代码、API key、个人文件路径；`code_context` 和 `tool_use` 最可能命中。不要把 `extracted_data/` 提交到公开仓库；含客户或专有内容时放到加密存储。

## 证据与来源

做法 B 的证据基础：调研报告给出 ai-data-extractor 的 README 声称支持 10 个来源并列出各自存储形态和搜索位置、CLI 参数原文、JSONL 字段示例、稳定性边界（只有 `messages`、`source`、`session_id` 三个字段可始终依赖）、分享/训练前扫密钥的三步建议，以及报错排查路径。其中「值得在你的机器上小范围试一次」是调研结论/作者主张，不是实测数据；README 对 10 个来源的支持和存储位置属于工具作者声称；Windsurf、Trae 使用未公开 schema 和启发式解析，稳定性需先用 `--list` 验证。

做法 A 的证据基础：调研报告给出 agentplay 的 Apache-2.0 许可、安装与使用方式（一条 `uvx agentplay`、CLI 子命令 `view/build/list/export/import/agents`、完整 flag 表、环境变量表）、`agentplay/v1` 的 JSON 示例与字段含义、JSON Schema 路径与 CI 校验、路径模式与 HMAC 说明、增量构建行为、Windows 构建步骤。报告认为该工具在「效果验证」这一研究问题上证据最强：README 明确把工具定位为回答「改文件前读了什么、哪些命令失败重试了几次、上下文在哪填满、产出了哪些 PR」四类问题，对应字段 `outcome`、`events[].kind`（`read` / `llm` / `verify` 等）、`err` / `errClass` / `exitCode`、`retries`、`delays`、`compactions`、`prs[]`、`totals`（calls / requests / errors / tokens / costUsd）。来源支持度差异（Claude Code 从 `~/.claude/projects/**/*.jsonl` 及 `…/subagents/agent-*.jsonl` 直读、最高保真；Cursor 只拆 main lane 且不记录 token / cost；OpenCode 读 `~/.local/share/opencode/opencode.db`、main lane only、per-turn token；Copilot 覆盖 CLI 与 VS Code 内的 Copilot、main lane only）来自 README。

只算主张、不能当结论用的部分：

- 「任务匹配」只提供了字段（`agents[]` 区分 main / subagent、`llm` 事件带 `model` / `in` / `cw` / `cr` / `out` / `latency`），原文没有任何跨模型对比的结论或推荐。
- 「条件供给」只能发现问题（MCP server 失败、hook 失败、错误类别、退出码被记录），README 没有给出任何补齐供给的流程或配置模板。
- 「能力发现」是从回放里推断的，原文没有对应主张或流程；「主动推进」原文未涉及。
- 成本数字：Cursor 会话缺 token / cost，agentplay 的成本为估算。
- 调研材料在列举 agentplay 隐私契约清单时于「subagent 的 promp…」处截断，本手册只写入已给出的部分，未补造其余条目。

两个工具都缺量化改善证据：材料未提供提取成功率、速度、字段完整率等实测数字，agentplay 原文也只有示意性数据；本手册未补造这些数字。

## 依据的调研

- [nachisama/ai-data-extractor](../research/radar/2026-10-08/2034-nachisama-ai-data-extractor.md)：值得一试，值得在你的机器上小范围试一次：用它把 Claude Code、Cursor、Cline、Aider 等编码助手的本地对话统一导出成 JSONL，作为"复盘自己怎么用 AI、横向比较不同工具"的数据底座；但它是第三方工具、且部分来源靠启发式解析，先跑 --list 验证能取到数据再决定是否长期依赖。
- [Entelligence-AI/agentplay](../research/radar/2026-10-15/3437-entelligence-ai-agentplay.md)：值得一试，先用 `AGENTPLAY_NO_NETWORK=1 uvx agentplay` 把本机已有的编码智能体会话回放成地图和时间线，把它当作「效果验证」环节的取证工具小范围试用；理由是它一条命令即可跑通、全本地无账号、覆盖 Claude Code / Codex / Cursor / Copilot / OpenCode / Kiro，且能直接回答「读了什么才改这个文件、哪条命令失败重试了几次、上下文在哪填满、产出了哪些 PR」，但原文只有示意性数据、没有量化改善证据，Cursor 会话缺 token/cost、成本为估算，所以先试不建议直接写进手册推广。
