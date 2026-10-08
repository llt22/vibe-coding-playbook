# 把本地 AI 编码对话导出成可复盘的数据底座

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把散落在 Claude Code、Cursor、Cline、Aider 等本地 AI 编码助手中的对话统一导出成 JSONL，用于复盘、比较或备份，并避免分享/训练时泄漏敏感内容。
> 先试这一步：在装有 Python 3.9+ 的机器上把仓库代码放到本地并进入项目根目录，先运行 `python extract.py --list`，确认它能找到你的数据目录后再提取。
> 最近修订：2026-10-08

## 解决什么问题
你同时用 Claude Code、Cursor、Cline、Aider 等 AI 编码助手时，对话历史散落在各自本地存储里，难以复盘自己怎么用 AI、横向比较工具，或在应用清库前备份。这篇手册给出一套用 `nachisama/ai-data-extractor` 把这些本地对话统一导出成规范化 JSONL 的流程，并说明先验证数据源、再决定是否长期依赖的边界。

## 适用与不适用
适用：你本机装过并用过支持来源之一，想把个人 AI 编码对话抽出来做微调、个人使用分析或备份；愿意先跑 `--list` 做安全预览，再决定是否提取。
不适用：你期望有官方支持、稳定 schema 或完整字段；你不想处理密钥或专有代码；你使用的工具不在材料列出的 10 个来源内，除非按扩展步骤自行加 extractor。

## 前置条件
- 本机装有 Python 3.9+（推荐 3.10+）。
- 至少装过并用过以下支持来源之一：Claude Code、Codex CLI、Cursor、Windsurf、Trae、Continue、Gemini CLI、OpenCode、Cline / Roo Code、Aider。
- 已把 `nachisama/ai-data-extractor` 仓库代码放到本地，并能进入项目根目录运行 `extract.py`。材料未给出克隆/安装命令，这一步需按仓库说明自行补上。
- 如果准备提取 Aider，先知道项目目录位置，因为 Aider 没有中心化会话库。

## 操作步骤
1. 确认 Python 版本和运行位置。前提：代码已放到本地，进入项目根目录。预期：看到 Python 3.9+，推荐 3.10+。
```bash
# No dependencies -- standard library only
python --version   # 3.9+ required, 3.10+ recommended
```

2. 先做安全预览，不落盘。前提：想知道工具是否能找到你的数据目录。预期：只报告每个来源发现了什么，不提取任何内容。这是最该先跑的一步。
```bash
python extract.py --list                    # just show what's installed, don't extract
```

3. 选择提取方式。
做法 A：交互式提取。适合第一次用、想从编号菜单里挑来源。运行后按菜单选择。
```bash
python extract.py
```
做法 B：直接指定来源或全量提取。适合已确定要哪些来源，或想一次全量。预期：在 `extracted_data/` 下生成带时间戳的 JSONL；加 `--merge` 还会生成 `all_conversations.jsonl`。
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

4. 如果提取 Aider，额外指定项目目录。前提：Aider 没有中心化会话库，每个项目目录下各有一份 `.aider.chat.history.md`。预期：能扫到你指定的项目目录。默认会扫用户主目录加若干常见项目根名 `projects`、`code`、`dev`、`repos`、`workspace`、`src`、`Documents`，深度最多 5 层，跳过 `node_modules`、`.git` 等。
```bash
python extract.py --sources aider --search-path ~/client-work --search-path /mnt/data/repos
```

5. 查看产物和字段口径。前提：提取已完成。预期：每次运行在 `extracted_data/` 下生成带时间戳的文件，每行一个 JSON 会话；若加 `--merge` 另有 `all_conversations.jsonl`。提取内容可包括用户消息与助手回复、代码上下文、代码 diff 或建议编辑、工具调用及其结果、时间戳、会话 ID、项目路径、模型名，但字段随来源而异。稳定性边界：不是每个工具都记录 `code_context`、token 用量或 `project_path`；只有 `messages`、`source`、`session_id` 三个字段可以始终依赖。做横向对比前必须按这一点设计字段口径。

6. 单来源调试。前提：某个工具提取异常，想单独排查。预期：直接运行该来源的 extractor。
```bash
python -m extractors.cursor
# 或
python extractors/cursor.py
```

7. 分享或训练前先扫密钥。前提：准备把导出数据分享、提交或用于训练。预期：扫描出疑似密钥，并人工复查专有代码、API key、个人文件路径；`code_context` 和 `tool_use` 最可能命中。
```bash
pip install detect-secrets --break-system-packages
detect-secrets scan extracted_data/*.jsonl
```
不要把 `extracted_data/` 提交到公开仓库（已在 `.gitignore` 里）；含客户或专有内容时要放到加密存储。

8. 后续消费数据。前提：已有 `extracted_data/*.jsonl`。预期：可以按原文示例用 `datasets.load_dataset` 加载 JSON，过滤出含 assistant 消息的会话，再用 tokenizer 的 `apply_chat_template` 处理；该示例需要你自备 tokenizer。

9. 扩展新来源。前提：你用的工具不在支持列表，或想自己加 extractor。预期：照最简模块实现 `find_installations` 和 `extract` 两个函数，再注册到 `extract.py` 的 `REGISTRY`；SQLite/JSON/JSONL 读取器和两个通用启发式都在 `extractors/common.py`。

10. 遇到问题时按原文路径排查。前提：`--list` 或提取报错或数据少。预期：定位到目录、数据库锁定或启发式键名问题。
- 报 "No installation found"：工具没装、没有历史、或位置非标准 → 用 `--search-path` 直指，或改 `extractors/<tool>.py` 的 `SEARCH_DIRS` / `APP_DIR_NAMES` 常量。
- Cursor/Windsurf 数据库锁定：读取是用 `mode=ro` 打开的，正常情况下正在运行的编辑器不会阻塞；仍报错就关掉应用重跑。
- Windsurf/Trae 找到了安装目录但 0 条会话：说明 `common.heuristic_extract_chat_from_kv` 的键名启发式没匹配上，先 `--list` 确认目录已找到，再直接看库里的键并补进 `KEY_HINTS`（材料未给出查看键的具体命令）。

## 怎么判断变好了
- 最小试用：先运行 `python extract.py --list`，确认它能找到你至少一个已用过的工具的数据目录；再只提取一个来源（例如 `python extract.py --sources claude_code` 或 `cursor` 或 `aider`，Aider 加 `--search-path`），检查 `extracted_data/` 是否生成带时间戳 JSONL，每行一个 JSON 会话。
- 可观察指标：`--list` 是否报告找到安装或数据；提取产物中是否存在可依赖的 `messages`、`source`、`session_id`；若做横向比较，检查目标工具是否真的提供 `code_context`、token 用量、`project_path`；分享或训练前 `detect-secrets scan` 是否可运行并给出扫描结果。
- 试多久：材料未给出固定试用时长。建议以一次预览、一次单来源提取、一次密钥扫描作为最小试用；结果可用后再扩大到 `--all` 或 `--merge`，长期依赖前多跑几次验证稳定性。

## 常见坑
- README 未给出克隆/安装命令，只显示从项目根目录直接运行 `extract.py`；操作前需自行把仓库代码放到本地。
- 字段随来源而异，不是每个工具都记录 `code_context`、token 用量或 `project_path`；只有 `messages`、`source`、`session_id` 三个字段可以始终依赖，横向对比前先统一字段口径。
- 它是第三方工具，且 Windsurf、Trae 等来源使用未公开 schema 和启发式解析；先跑 `--list` 验证能取到数据，再决定是否长期依赖。
- Aider 没有中心化会话库，默认只扫用户主目录和若干常见项目根名；项目在别处时必须用 `--search-path`。
- Cursor/Windsurf 数据库锁定：读取用 `mode=ro`，正常情况下正在运行的编辑器不会阻塞；仍报错就关掉应用重跑。
- Windsurf/Trae 找到了安装目录但 0 条会话，通常是 `common.heuristic_extract_chat_from_kv` 的键名启发式没匹配上；先 `--list` 确认目录已找到，再直接看库里的键并补进 `KEY_HINTS`。
- 报 "No installation found"：工具没装、没有历史、或位置非标准；用 `--search-path` 直指，或改 `extractors/<tool>.py` 的 `SEARCH_DIRS` / `APP_DIR_NAMES` 常量。
- 分享或训练前必须扫密钥，并人工复查专有代码、API key、个人文件路径；`code_context` 和 `tool_use` 最可能命中。不要把 `extracted_data/` 提交到公开仓库；含客户或专有内容时放到加密存储。

## 证据与来源
- 本篇依据调研报告《nachisama/ai-data-extractor》。报告给出的数据包括：README 声称支持 10 个来源并列出各自存储形态和搜索位置；CLI 参数原文；JSONL 字段示例；稳定性边界：只有 `messages`、`source`、`session_id` 三个字段可始终依赖；分享/训练前扫密钥三步建议；以及报错排查路径。
- 其中“值得在你的机器上小范围试一次”是调研结论/作者主张，不是本手册实测数据。README 对 10 个来源的支持和存储位置也属于工具作者声称；Windsurf、Trae 使用未公开 schema 和启发式解析，稳定性需先用 `--list` 验证。
- 材料未提供提取成功率、速度、字段完整率等实测数字；本手册未补造这些数字。

## 依据的调研

- [nachisama/ai-data-extractor](../research/radar/2026-10-08/2034-nachisama-ai-data-extractor.md)：值得一试，值得在你的机器上小范围试一次：用它把 Claude Code、Cursor、Cline、Aider 等编码助手的本地对话统一导出成 JSONL，作为"复盘自己怎么用 AI、横向比较不同工具"的数据底座；但它是第三方工具、且部分来源靠启发式解析，先跑 --list 验证能取到数据再决定是否长期依赖。
