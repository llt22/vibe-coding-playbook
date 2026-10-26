# 让 AI 协作留下证据：会话回放、对话导出与决策记录

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：你同时用多个 AI 编码助手，却说不清它干了什么、为什么这么定，也无法把一段会话或一项决策交给下一个代理或同事。
> 先试这一步：先做一次零风险预览：用 `uvx agentplay agents` 或 `python extract.py --list` 确认能读到本机会话，再用一条真实任务试回放或导出；如果你要解决的是“为什么这么定”，先建私有 ADR 仓库并落下第一条记录。
> 最近修订：2026-10-26

## 解决什么问题

你同时用 Claude Code、Cursor、Cline、Aider 等 AI 编码助手，对话历史散落在各自的本地存储里，决策理由则常常只留在聊天记录里。由此带来两类做不成的事：一是说不清“这次 AI 到底干了什么”——它在改这个文件之前读了什么、有什么始终没打开、哪条命令失败了、同一条重试了几次、上下文窗口在哪里填满、这次会话产出了哪些 commit / PR；二是说不清“为什么这么定、后来怎么续接”——AI 提过哪些选项、理由和置信度、什么情况必须推翻、人最终怎么裁决。

这篇手册给四条互补的路线：用 agentplay 把本机已有的会话回放成“地图 + 时间线”做效果取证（做法 A）；用 `nachisama/ai-data-extractor` 把这些本地对话统一导出成规范化 JSONL 做备份、微调或个人使用分析（做法 B）；如果你在用 Claude Code，用内置的 `/export file_name` 把一段会话导成纯文本，交给下一个代理接力或提炼可复用技能（做法 C）；用 ADRs4AI 把 AI 提出的选项、理由、置信度、证伪条件和人的裁决写成可版本化的决策记录，放进 Git 仓库（做法 D）。前三条处理“会话与执行”，第四条处理“审议与决策”；四条路线都强调先做安全预览 / 小范围试用、验证数据源确实能取到数据，再决定是否长期依赖。

## 适用与不适用

适用：

- 做法 A（agentplay 回放取证）：本机至少有一种受支持智能体留下过会话，你想核对 AI 的实际行为、失败点和产出，并且要求全本地、无账号、无 API key。
- 做法 B（ai-data-extractor 导出 JSONL）：本机装过并用过支持来源之一，想把个人 AI 编码对话抽出来做微调、个人使用分析或备份；愿意先跑 `--list` 做安全预览再决定是否提取。
- 做法 C（Claude Code `/export` 导纯文本）：你在用 Claude Code，且当前会话里已经有值得复用的实质内容（一次多轮调试、一次方案设计、一次排错），想把它原样交给另一个代理接着干，或从中提炼自定义技能。一条命令、零安装，是四条路线里最轻的一条。
- 做法 D（ADRs4AI 决策记录）：你有一个持续一段时间的真实项目，需要把 AI 给出的选项、建议、理由、置信度、证伪条件，以及人的 accept / override 固化成可版本化、可检索的 Markdown 记录；你愿意用 Git 仓库承载这些记录，并接受前期有记录开销。
- 四条可以组合：A 与 B 读同一批本地会话，C 只覆盖 Claude Code，D 记录决策而不是会话。A 取不回对话原文，要原文走 B 或 C；D 不替代 A/B/C 的执行取证和原文导出。

不适用：

- 你期望有官方支持、稳定 schema 或完整字段。A、B 两个工具都是第三方工具，字段随来源而异；C 只是一条内置命令，材料里连产物细节都没说全；D 只有作者自述与单项目案例，尚无效果数据。
- 你不想处理密钥或专有代码。四条路线的产物都可能含代码和内部信息。
- 你用的工具不在支持范围内：ai-data-extractor 覆盖 Claude Code、Codex CLI、Cursor、Windsurf、Trae、Continue、Gemini CLI、OpenCode、Cline / Roo Code、Aider；agentplay 覆盖 Claude Code、Codex（CLI/IDE）、Cursor（agent CLI 与 IDE composer）、GitHub Copilot CLI、VS Code 中的 Copilot、OpenCode、Kiro，**明确不支持 Cline**（README 在 Contributing 里把 Cline 和 Gemini CLI、Amp、Roo、Windsurf、Aider 一起列为最想要的第三方 parser）；做法 C 是 Claude Code 内置命令，其他工具没有；做法 D 依赖 GitHub CLI、特定 agent 命令、模板仓库、可选扩展 / iOS 客户端 / MCP。
- 你想要准确的成本数字：agentplay 对 Cursor 会话拿不到 token / cost（Cursor 不把计费用量写盘，工具也不去调 Cursor API），成本是估算。
- 你想省掉自己补细节的功夫：做法 C 的材料只有一条推文，投喂方式和技能提炼流程原文都没给；做法 D 的 crew 自动化（步骤 7–9）只有名称，正文没有可照做的步骤。
- 你想要量化效果或团队合规方案：D 原文没有量化指标、对照实验或第三方复现，默认私有仓库，团队 / 合规场景下记录的可访问性与敏感信息处理未讨论；A/B/C 的材料也未提供提取成功率、速度、字段完整率等实测数字。

## 前置条件

- Python 版本：做法 A 需要 Python 3.11 或更高；做法 B 需要 Python 3.9+（推荐 3.10+）。做法 C、D 不需要 Python。
- 本机至少有一种受支持智能体留下过会话（A、B）。agentplay 默认读取 `~/.claude`、`~/.codex`、`~/.cursor`、`~/.copilot`、`~/.kiro`、`~/.local/share/opencode/opencode.db` 等默认目录。
- 做法 A 的工具本身除标准库外无运行时依赖，可以用 `uvx` / `pipx` 直接跑，不必先克隆仓库。
- 做法 B 需要已把 `nachisama/ai-data-extractor` 仓库代码放到本地，并能进入项目根目录运行 `extract.py`。材料未给出克隆 / 安装命令，这一步需按仓库说明自行补上。
- 如果准备提取 Aider，先知道项目目录位置，因为 Aider 没有中心化会话库。
- 做法 C 的前提：已经在使用 Claude Code，并且当前会话里已有值得复用的实质内容（空会话导出没有意义）。用途 A（跨代理接力）还额外需要一个“把导出文件送进下一个代理”的通道——材料未说明用哪种方式，需按你手上代理的能力自行确定。
- 做法 D 的前提：已安装并登录 GitHub CLI（`gh auth login`），本机有 git，有一个可运行 agent 的终端（原文用 `claude`）；从模板创建私有仓库；打开模板里的 `CLAUDE.md` 填顶部区块（项目目标、当前阶段、已知约束；原文说 messy is fine，写得乱没关系）；准备一份可杂乱的 seed 文本；有 Git 写权限，因为裁决要落成 commit。VS Code 扩展、Open VSX、iOS 客户端、MCP server 都是按需接入，最小试用不需要。
- 做法 D 的检索前提：问题标题统一以 `### QST` 开头，否则 `grep -rn '^### QST' docs/adr/` 捞不全。

## 操作步骤

先决定走哪条路线。四条路线可以同时做，但产物形态、覆盖范围和隐私面都不一样。

- 想回答“AI 这次到底干了什么、错在哪、产出是什么” → 走做法 A。全本地、无账号、无 API key。
- 想把对话原文抽出来做微调、训练或个人备份 → 走做法 B。产物是规范化 JSONL，字段随来源而异。
- 你在用 Claude Code，想把“这一段”会话原样交给另一个代理接着干、或从中沉淀可复用技能 → 走做法 C。产物是一份纯文本会话历史，最轻，但只覆盖 Claude Code，且原文没给投喂 / 提炼细节。
- 想记录“为什么这么定”、让后来的人或 agent 能续接 → 走做法 D。产物是 Git 仓库里的 Markdown 决策记录，靠 `grep`、编辑器树视图或客户端检索，不适合当聊天全文检索。

关键差别：agentplay 的地图按设计不含 prompt 文本、助手文本或推理、工具输入输出、文件内容、命令参数（只记动词），所以取不回对话原文，要原文得走 B 或 C；B 给结构化 JSONL，字段口径要自己统一；C 给未结构化的纯文本，最快拿到手，但后续筛选全靠人看；D 记录的是决策的“为什么”，不是对话全文，也不是向量数据库式记忆或编排平台。

- 想做工具 / 模型横向对比：做法 A 的格式里有可读的调用次数、token、延迟、花费字段，但原文没有给出任何跨模型对比的结论或推荐；做法 B 的 JSONL 只有 `messages`、`source`、`session_id` 三个字段可以始终依赖。两边都得自己设计字段口径。做法 C 材料里完全没有横向对比的依据；做法 D 不解决横向对比。

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
- 每个视图都是 URL，可把“某一刻”的链接发给同机跑着 viewer 的人。

A6. 用 Errors 面板做失败复盘。前提：想定位哪些命令失败、同一条重试了几次。预期：Errors 标签页按类别分组，并按“同一条失败命令连续失败的最长串”排序；点某一行直接把回放定位过去。header 上的 error / PR / subagent 徽章可以同法收窄时间线。

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

Windows 下 `make` 需 Git Bash / MSYS2 / WSL；没有 `make` 时按 README 的 PowerShell 等价步骤（`uv venv python\.venv` → `uv pip install ...` → `corepack pnpm install --frozen-lockfile` → `corepack pnpm run build` → 拷贝 `dist` 到 `python/src/agentplay/viewer` → `.venv\Scripts\agentplay view`）。viewer 需要 `viewer/package.json` 里钉的 pnpm 10.x。不装也能先看效果：在 `viewer/` 里 `pnpm dev` 会加载三个合成 demo 会话；也可以把任意 `agentplay/v1` 文件直接拖到页面上。

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

### 做法 C：把 Claude Code 会话导成纯文本（`/export`）

C1. 先确认前提。前提：你正在用 Claude Code，且当前会话里已经有值得复用的实质内容——一次多轮调试、一次方案设计、一次排错过程。预期：确认值得导出。空会话导出没有意义。

C2. 在需要保留的会话里直接输入命令。预期：生成一个包含该会话历史的纯文本文件。

```
/export file_name
```

原文只说参数写作 `file_name`，未说明是否要带扩展名、是否支持路径，实际以你所用版本的命令提示为准。

C3. 用途 A——跨代理接力。前提：想让另一个代理接手同一件工作。预期：导出文件被当作上下文送进下一个代理，接着往下干活。原文没有给出具体投喂方式（是直接粘贴、还是让代理读取文件路径），这一步需要按你使用的代理能力自己确定。

C4. 用途 B——提炼技能。前提：想把这次会话里的做法沉淀下来。预期：把导出的文本交给模型分析，生成自定义技能（custom skills），用于改进你的 Claude Code 工作流。原文同样没有给出分析用的提示词、技能格式或存放位置，这一步属于需要自行补足的部分。

C5. 投喂前先划定可外发范围。前提：准备把导出文件交给另一个代理或分享。预期：确认里面没有不该外发的代码或内部信息。材料未说明导出内容是否包含工具调用与文件内容、大小上限、敏感信息如何处理；导出会话很可能包含代码和内部信息，跨代理投喂前应先确认可外发的范围。

C6. 小范围验证后再决定长期用。前提：第一次试做法 C。预期：按“怎么判断变好了”里做法 C 的最小试用四步走一遍，用对照任务比较投喂前后的差异，再决定是否纳入常规流程。

做法 C 与 A / B / D 的关系：C 不引入新工具，只是给已采用的 Claude Code 补一条内置命令的用法——把“会话历史”本身当成一份可导出的资产，先导出再决定怎么用。C 与 B 都能拿到原文（C 是纯文本，B 是结构化 JSONL），A 拿不到原文；D 记录决策理由，不提供会话全文。

### 做法 D：把 AI 协作的“为什么”写进 Git（ADRs4AI）

D1. 从模板创建私有仓库。前提：已安装并登录 GitHub CLI（`gh auth login`），本机有 git。预期：创建并进入你的私有仓库副本。

```bash
gh repo create my-project --private --clone --template ADRs4AI/human-ai-collaboration-template-A
cd my-project
```

D2. 填写 `CLAUDE.md` 顶部区块，并在实际工作开始前先提交第一条记录。前提：仓库已克隆。预期：项目目标、当前阶段、已知约束被写进 `CLAUDE.md`；首条 commit 落盘。原文说 messy is fine，写得乱没关系。

```bash
git add -A && git commit -m "chore: the record begins before the building does"
```

D3. 以邀约形式把任务给 agent，允许它拒绝或提出异议。前提：有一个可运行 agent 的终端。预期：agent 阅读任务后明确接受或 pushback。

```bash
claude # or your agent of choice
```

然后把下面这段作为邀约发给它：

```text
Hello — I have a mission for you. Read about it and tell me
if you accept, or any pushback.
```

D4. 产出第一个 seed。前提：有一个真实项目或真实任务。预期：把自己的思考一次性倒进去（口述、杂乱都可以，capture first）；让 AI 把它切成若干 ADR，保留你的原话、考虑过的选项、推理和开放问题。

D5. 回答问题：每条开放问题由 AI 带上选项、建议、理由、置信度、证伪条件，人只做 accept / override 或给出任意形式的答复。前提：AI 已生成开放问题。预期：每条问题都能被一次判断关闭或保留。原文的逐字记录结构可直接当模板用：

```markdown
### QST-<ID>: <问题一句话>
- Status: answered
- Why asking: <为什么现在要问，关联到什么下游需求>
- Need: <需要人做什么判断>

**Options**:

- **A — <选项名>**: <一句话>
- **B — <选项名>**: <一句话>
- **C — <选项名>**: <一句话>

**Recommendation**: (by <模型名>)

**<推荐选项>**

**Rationale**: <理由>

**Confidence**: <高/中高……，并说明哪部分不确定>

**Falsifier**: <出现什么情况就必须推翻或扩展这个决定>

**ANS:** (by <人/设备>)
<最终裁决，一行也行>
```

D6. 随时把全部开放问题捞出来。前提：问题标题统一以 `### QST` 开头。预期：看到全部 QST 条目。每次会话开始时先跑这条命令，只回答状态为 open 的问题；若 AI 没有主动 stake 问题，要求它按 QST 模板补齐后再继续。

```
grep -rn '^### QST' docs/adr/
```

D7. 按需接入工具。前提：想降低操作摩擦。预期：在编辑器里看到 Open Questions 视图、格式诊断、深链，并让 agent 通过 MCP server 查询记录；或从 iOS 客户端登录、导入仓库、一键 Accept 生成 commit。VS Code 扩展也在 Open VSX 上。安装方式按扩展 / 客户端说明操作，材料未给出具体安装命令。

D8.（可选进阶）原文提到“跑一个 crew”——多席位、wake-on-brief、人不再当消息总线——但只说明在 Get started 的第 7–9 步，正文没有给出具体步骤，本手册无法还原，需回原文查。不要在没有步骤的情况下把它当成可实施方案。

D9. 先做最小试点。前提：第一次试做法 D。预期：按“怎么判断变好了”里的 2 周单项目试点跑，只跑 seed → ADRs → accept/override 这一环，不启用 crew、不接手机客户端；在记录里加一个原文没有、但对验证必要的字段：记录裁决后实际被推翻或返工的情况。

## 怎么判断变好了

最小试用（做法 A）：

- 跑 `uvx agentplay agents`，确认本机至少有一种受支持智能体的会话可读。
- 再 `AGENTPLAY_NO_NETWORK=1 uvx agentplay` 跑一次，确认 viewer 在 `http://127.0.0.1:7317/` 打开，且能看到地图和时间线。
- 在地图上核一件事：这次会话改过哪些文件、哪些只是读过没改；在时间线上按 `X` 跳到下一个 error，看失败命令和重试次数是否对得上你的记忆。

最小试用（做法 B）：

- 先运行 `python extract.py --list`，确认它能找到你至少一个已用过的工具的数据目录；再只提取一个来源（例如 `python extract.py --sources claude_code` 或 `cursor` 或 `aider`，Aider 加 `--search-path`），检查 `extracted_data/` 是否生成带时间戳 JSONL，每行一个 JSON 会话。
- 分享或训练前 `detect-secrets scan` 是否可运行并给出扫描结果。

最小试用（做法 C）：

1. 正常完成一次有代表性的多轮工作（例如一次需要反复调试的任务），不要为了试用而试用。
2. 会话结束前执行 `/export file_name`，确认文件生成、内容完整、可读。
3. 开一个新会话（或另一个代理），把该文件作为上下文，让它接着做这件任务的下一步，全程**不额外补充背景说明**。
4. 另找一次同类任务作为对照，不导出、不投喂，直接在新会话里靠人工复述背景继续。

最小试用（做法 D）：

1. 按操作步骤 D1–D3 建仓并立首条 commit；`CLAUDE.md` 顶部只填项目目标、当前阶段、已知约束三项。
2. 只跑“seed → ADRs → accept/override”这一环，不启用 crew、不接手机客户端（降低变量）。
3. 每次会话开始时先跑 `grep -rn '^### QST' docs/adr/`，只回答状态为 open 的问题；若 AI 没有主动 stake 问题，要求它按 QST 模板补齐后再继续。
4. 在记录里加一个原文没有、但对验证必要的字段：记录裁决后实际被推翻或返工的情况。

可观察指标：

- 做法 A：`agents` 是否列出可读会话；viewer 地图是否出现文件与产出（commit / PR / ticket）；时间线是否出现 `err` / `retries` / `compactions`；`outcome` 字段是否落到 `pr_created` 之类的实际产物。
- 做法 B：`--list` 是否报告找到安装或数据；提取产物中是否存在可依赖的 `messages`、`source`、`session_id`；若做横向比较，检查目标工具是否真的提供 `code_context`、token 用量、`project_path`。
- 做法 C（都比较容易手工记）：重建上下文所需的人工提示轮数：投喂文件后是否显著减少；重复解释次数：新会话里还需要你重复说明几次“之前做过什么、为什么这么做”；从“要开始下一步”到“模型真正在做正确的事”之间的时间；导出内容的可用率：文件里有多少内容是无关噪声、需要人工删减（噪声太高说明导出不适合直接投喂，适合先做筛选）；用途 B 的验证更弱一些：可统计从导出文件里提取出的可复用步骤，是否在下一次同类任务中真的被用上。
- 做法 D（都可手工统计）：重复讨论率：同一决策在后续会话中被重新讨论的次数（试用期 vs 之前同类项目）；恢复上下文时间：新会话 / 新接手者从零到能复述“为什么这么定”所需时间与提问次数；问题闭环率与延迟：open → answered 的比例、平均从 stake 到裁决的时间；记录被引用率：后续 ADR 或提交中引用前序 QST 编号的次数（可 grep 统计）；单问题成本：作者回答一个问题平均耗时（若超过几分钟，说明选项 / 理由质量不足或问题过碎）。

试多久：A/B/C 的材料未给出固定试用时长。做法 A 建议以一次 `agents`、一次回放、一次 error 面板核对作为最小试用；做法 B 建议以一次预览、一次单来源提取、一次密钥扫描作为最小试用；做法 C 建议以“一次导出 + 一次投喂接力 + 一次对照任务”作为最小试用——如果减少的轮数和时间都不明显，说明这次会话本身的上下文价值不高，或者对方代理需要的是结构化摘要而不是原始转录，那就把结论降回观察。做法 D 建议 2 周、单个真实项目。判定 D“确有改善”的最低标准：重复讨论率下降、恢复上下文时间缩短，且记录确实被后续工作引用（不是写完就没人看）。若只增加了记录量而没有引用与复用，应退回 watch 或改用轻量替代（只在关键决策上写一条 ADR）。结果可用后再扩大规模（做法 A 到 `build --since` 或全量，做法 B 到 `--all` / `--merge`，做法 C 到常态化导出，做法 D 到更多项目或接入扩展 / 客户端），长期依赖前多跑几次验证稳定性。

## 常见坑

做法 A：

- README 在 Contributing 里把 Cline 和 Gemini CLI、Amp、Roo、Windsurf、Aider 一起列为“最想要的第三方 parser”，也就是说不支持——别指望用它复盘这些工具的会话。
- Cursor 会话拿不到 token / cost，成本是估算，不能当准确账单看。
- 分享 map 前要脱敏：路径模式里 `relative` / `dirs_only` / `hashed` 只影响路径，**任何模式下 repo 名和 remote 都会保留**；remote 敏感就手动删 `repos[].remote`。`hashed` 没设 `AGENTPLAY_HMAC_KEY` 会退回 `dirs_only`。
- 按 README 的隐私契约，地图不含 prompt 文本、助手文本或推理、工具输入输出、文件内容、命令参数（只记动词如 `git log` / `pytest`）。这是它的隐私设计，但也意味着你不能靠它取回对话原文；要原文请走做法 B 或做法 C。
- viewer 首次打开会邀请填 email，这是唯一的网络调用，用 `AGENTPLAY_NO_NETWORK=1` 或 `DO_NOT_TRACK=1` 关掉。
- Windows 下从源码构建需要 Git Bash / MSYS2 / WSL，viewer 依赖 `viewer/package.json` 里钉的 pnpm 10.x。

做法 B：

- README 未给出克隆 / 安装命令，只显示从项目根目录直接运行 `extract.py`；操作前需自行把仓库代码放到本地。
- 字段随来源而异，不是每个工具都记录 `code_context`、token 用量或 `project_path`；只有 `messages`、`source`、`session_id` 三个字段可以始终依赖，横向对比前先统一字段口径。
- 它是第三方工具，且 Windsurf、Trae 等来源使用未公开 schema 和启发式解析；先跑 `--list` 验证能取到数据，再决定是否长期依赖。
- Aider 没有中心化会话库，默认只扫用户主目录和若干常见项目根名；项目在别处时必须用 `--search-path`。
- Cursor/Windsurf 数据库锁定：读取用 `mode=ro`，正常情况下正在运行的编辑器不会阻塞；仍报错就关掉应用重跑。
- Windsurf/Trae 找到了安装目录但 0 条会话，通常是 `common.heuristic_extract_chat_from_kv` 的键名启发式没匹配上；先 `--list` 确认目录已找到，再直接看库里的键并补进 `KEY_HINTS`。
- 报 “No installation found”：工具没装、没有历史、或位置非标准；用 `--search-path` 直指，或改 `extractors/<tool>.py` 的 `SEARCH_DIRS` / `APP_DIR_NAMES` 常量。
- 分享或训练前必须扫密钥，并人工复查专有代码、API key、个人文件路径；`code_context` 和 `tool_use` 最可能命中。不要把 `extracted_data/` 提交到公开仓库；含客户或专有内容时放到加密存储。

做法 C：

- 采集到的只是推文首条，作者承诺的“工作原理”thread 内容缺失，因此**没有**完整的操作步骤、没有示例提示词、没有技能生成流程。别把它当成一份成型的 SOP。
- 没有任何案例、数据、前后对比。两个用途（跨代理接力、提炼技能）都是作者主张，属于“可以这么用”而非“验证过效果更好”。
- 适用条件未说明：Claude Code 的版本要求、导出文件的大小上限、是否包含工具调用与文件内容、导出内容的敏感信息处理，原文均未提及。
- 导出会话很可能包含代码和内部信息，跨代理投喂前应先确认可外发的范围。
- 互动量（点赞 216、转发 24、回复 32）只说明有一定关注度，不构成效果证据。
- 命令参数写法原文只给到 `file_name`，是否带扩展名、是否支持路径都要以你所用版本的命令提示为准。

做法 D：

- 项目刚发布（Show HN 42 分、21 条评论），方法由单一作者日常实践发展而来，无对照实验、无第三方复现；论文被接收不等于方法有效。
- 有明确开销：每个问题都要产出选项、理由、置信度、证伪条件，问题量大时可能变成负担（截图显示单日 75 个问题）。
- 依赖工具链：GitHub CLI、特定 agent 命令、模板仓库名、VS Code / Open VSX 扩展、iOS 客户端；MCP 查询能力需自建或使用其扩展。
- 原文默认私有仓库；团队 / 合规场景下记录的可访问性与敏感信息处理未讨论。
- crew 自动化（步骤 7–9）只有名称，无步骤，不能据此实施。
- 它不是对话存档、不是向量数据库式“记忆”、不是编排平台，也不主张 AI 有持久身份；不要拿它替代 A/B/C 的原文导出或执行取证。
- 若只增加记录量而没有引用与复用，说明记录没有进入后续工作；应退回 watch 或只在关键决策上写一条 ADR。
- 不要编造效果数据；“思考复利”“认知负荷下降”“新手也能用”等只是作者主张。

## 证据与来源

做法 A 的证据基础：调研报告给出 agentplay 的 Apache-2.0 许可、安装与使用方式（一条 `uvx agentplay`、CLI 子命令 `view/build/list/export/import/agents`、完整 flag 表、环境变量表）、`agentplay/v1` 的 JSON 示例与字段含义、JSON Schema 路径与 CI 校验、路径模式与 HMAC 说明、增量构建行为、Windows 构建步骤。报告认为该工具在“效果验证”这一研究问题上证据最强：README 明确把工具定位为回答“改文件前读了什么、哪些命令失败重试了几次、上下文在哪填满、产出了哪些 PR”四类问题，对应字段 `outcome`、`events[].kind`（`read` / `llm` / `verify` 等）、`err` / `errClass` / `exitCode`、`retries`、`delays`、`compactions`、`prs[]`、`totals`（calls / requests / errors / tokens / costUsd）。来源支持度差异（Claude Code 从 `~/.claude/projects/**/*.jsonl` 及 `…/subagents/agent-*.jsonl` 直读、最高保真；Cursor 只拆 main lane 且不记录 token / cost；OpenCode 读 `~/.local/share/opencode/opencode.db`、main lane only、per-turn token；Copilot 覆盖 CLI 与 VS Code 内的 Copilot、main lane only）来自 README。

做法 B 的证据基础：调研报告给出 ai-data-extractor 的 README 声称支持 10 个来源并列出各自存储形态和搜索位置、CLI 参数原文、JSONL 字段示例、稳定性边界（只有 `messages`、`source`、`session_id` 三个字段可始终依赖）、分享/训练前扫密钥的三步建议，以及报错排查路径。其中“值得在你的机器上小范围试一次”是调研结论 / 作者主张，不是实测数据；README 对 10 个来源的支持和存储位置属于工具作者声称；Windsurf、Trae 使用未公开 schema 和启发式解析，稳定性需先用 `--list` 验证。

做法 C 的证据基础：调研报告来自一条推文（@dani_avila7），明确了命令写法 `/export file_name`、产物形态（纯文本会话历史）和两个用途（给另一个代理当上下文、分析后生成自定义技能）；互动量为点赞 216、转发 24、回复 32。采集到的只是推文首条，作者承诺的“工作原理”thread 内容缺失，因此没有完整操作步骤、没有示例提示词、没有技能生成流程，也没有任何案例、数据或前后对比——两个用途都只是作者主张，本手册按“先小范围试”处理。适用条件（版本要求、导出文件大小上限、是否包含工具调用与文件内容、敏感信息处理）原文均未提及，本手册未补造。做法 C 与已有做法的关系是补充而非替代：它不引入新工具，只是给已采用的 Claude Code 增加一条把会话历史变成可移植资产的内置命令用法。

做法 D 的证据基础：调研报告来自 Show HN: ADRs for AI – Deliberation records for human–AI work, versioned in Git。原文给出模板仓库、VS Code 扩展、iOS 客户端、方法边界、建仓 / 种子 / 提问 / 裁决 / 检索流程和 QST 逐字记录模板；实证材料包括一条逐字记录（QST-HISTORICAL-TRUTH：如何在更正历史记录的同时保留“当时被认为为真”的内容，含三个选项、推荐 C、理由、置信度分级、falsifier 和一行人类裁决，来源标注为公开项目 frontier-model-observatory 的仓库原文）、一张扩展截图（显示“当天第 16 题 / 共 75 题”，可作为记录确实被持续使用的弱证据）、两篇论文与模板的 DOI：AAAI 2026 Fall Symposium on Trustworthy Agentic Systems（TAS 2026）接收、Zenodo 10.5281/zenodo.23300579（Deliberative Programming）、模板概念 DOI 10.5281/zenodo.23303469。属于作者主张、没有数据支撑的部分：思考“每次都被蒸发”、“记录会复利”、“认知负荷下降”、“新手也能用”等；论文被接收不等于方法有效。局限与适用条件：项目刚发布（Show HN 42 分、21 条评论），方法由单一作者日常实践发展而来，无对照实验、无第三方复现；有明确开销；依赖工具链；原文默认私有仓库，团队 / 合规场景下记录的可访问性与敏感信息处理未讨论；crew 自动化（步骤 7–9）只有名称，无步骤，不能据此实施。

只算主张、不能当结论用的部分：

- “任务匹配”只提供了字段（`agents[]` 区分 main / subagent、`llm` 事件带 `model` / `in` / `cw` / `cr` / `out` / `latency`），原文没有任何跨模型对比的结论或推荐。
- “条件供给”只能发现问题（MCP server 失败、hook 失败、错误类别、退出码被记录），README 没有给出任何补齐供给的流程或配置模板。
- “能力发现”是从回放里推断的，原文没有对应主张或流程；“主动推进”原文未涉及。做法 C 那条推文提到的“会话历史可导出为资产”属于能力发现，但同样只有主张、没有流程。
- 成本数字：Cursor 会话缺 token / cost，agentplay 的成本为估算。
- 调研材料在列举 agentplay 隐私契约清单时于“subagent 的 promp…”处截断，本手册只写入已给出的部分，未补造其余条目。
- 做法 D 的“记录会复利”“认知负荷下降”等属于作者主张；Show HN 42 分、21 条评论、单日 75 题截图都不是效果证据。

三个原有做法加上做法 D 都缺量化改善证据：材料未提供提取成功率、速度、字段完整率等实测数字，agentplay 原文也只有示意性数据，做法 C 只有一条推文和互动量，做法 D 只有作者自述与单项目案例；本手册未补造这些数字。

## 依据的调研

- [nachisama/ai-data-extractor](../research/radar/2026-10-08/2034-nachisama-ai-data-extractor.md)：值得一试，值得在你的机器上小范围试一次：用它把 Claude Code、Cursor、Cline、Aider 等编码助手的本地对话统一导出成 JSONL，作为"复盘自己怎么用 AI、横向比较不同工具"的数据底座；但它是第三方工具、且部分来源靠启发式解析，先跑 --list 验证能取到数据再决定是否长期依赖。
- [Entelligence-AI/agentplay](../research/radar/2026-10-15/3437-entelligence-ai-agentplay.md)：值得一试，先用 `AGENTPLAY_NO_NETWORK=1 uvx agentplay` 把本机已有的编码智能体会话回放成地图和时间线，把它当作「效果验证」环节的取证工具小范围试用；理由是它一条命令即可跑通、全本地无账号、覆盖 Claude Code / Codex / Cursor / Copilot / OpenCode / Kiro，且能直接回答「读了什么才改这个文件、哪条命令失败重试了几次、上下文在哪填满、产出了哪些 PR」，但原文只有示意性数据、没有量化改善证据，Cursor 会话缺 token/cost、成本为估算，所以先试不建议直接写进手册推广。
- [@dani_avila7: Claude Code 允许您使用 /export file_name 导出整个会话](../research/radar/2026-10-17/4189-claude-code-export-file-name.md)：值得一试，在完成一段有价值的多轮工作后，用 Claude Code 的 `/export file_name` 把会话历史导成纯文本，作为下一个代理的上下文或用于提炼可复用的技能；命令本身可直接照做，但原文只给了这一条命令和两个用途方向，投喂与提炼的具体方式需自行补足，建议先小范围试。
- [Show HN: ADRs for AI – Deliberation records for human–AI work, versioned in Git](../research/radar/2026-10-26/7168-show-hn-adrs-for-ai-deliberation-records-for-human.md)：值得一试，以 Git 仓库为载体的“人机协作决策记录”值得在一个项目上小范围试点：把 AI 提出的选项、理由、置信度和证伪条件固化成 ADR，人只做接受或推翻，并用 grep 检索开放问题来保证可续接。理由是原文给出了可直接复制的建仓、种子、提问、裁决流程和记录格式，但目前只有作者自述与单项目案例，尚无效果数据。
