# nachisama/ai-data-extractor

- 结论：**值得一试**。值得在你的机器上小范围试一次：用它把 Claude Code、Cursor、Cline、Aider 等编码助手的本地对话统一导出成 JSONL，作为"复盘自己怎么用 AI、横向比较不同工具"的数据底座；但它是第三方工具、且部分来源靠启发式解析，先跑 --list 验证能取到数据再决定是否长期依赖。
- 原文：https://github.com/nachisama/ai-data-extractor
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T10:52:58.799Z

## 是什么

`nachisama/ai-data-extractor` 是一个纯标准库（无第三方依赖）的 Python 工具包，把 **你自己机器上** 各类 AI 编码助手的本地对话历史，统一抽取成一种规范化 JSONL 格式，用途写明了三种：微调、个人使用分析、以及在应用清库前做备份。

README 声称支持 10 个来源并给出各自的存储方式和搜索位置：

| 工具 | 存储形态 | 搜索位置 |
|---|---|---|
| Claude Code | JSONL，每会话一个文件 | `~/.claude/projects/**/*.jsonl` |
| Codex CLI | JSONL "rollout" 文件 | `~/.codex/sessions/**/rollout-*.jsonl` |
| Cursor | SQLite (`state.vscdb`) | `~/…/Cursor/User/{global,workspace}Storage` |
| Windsurf | SQLite，未公开 schema（启发式） | `~/…/Windsurf/User/{global,workspace}Storage` |
| Trae | SQLite + JSONL，未公开（启发式） | `~/…/Trae` |
| Continue | JSON，每会话一个文件 | `~/.continue/sessions/*.json` |
| Gemini CLI | JSON，每对话一个文件 | `~/.gemini/tmp/<hash>/chats/*.json` |
| OpenCode | JSON（session/message/part 树） | `~/.local/share/opencode/storage/` |
| Cline / Roo Code | JSON，每任务一个文件夹 | `<editor>/User/globalStorage/<ext-id>/tasks/` |
| Aider | 每项目一份 Markdown 记录 | `<project>/.aider.chat.history.md` |

提取内容包含：用户消息与助手回复、代码上下文（文件路径、选中片段）、代码 diff / 建议编辑（若该工具记录了）、工具调用及其结果、时间戳、会话 ID、项目路径、模型名——即"各工具存储里实际有什么就取什么"。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提确认**：本机装有 Python 3.9+（推荐 3.10+），且至少装过并用过上面 10 个工具中的一个。README 未给出克隆/安装命令，只显示从项目根目录直接运行 `extract.py`，因此需先把仓库代码放到本地（该步骤原文缺失，属于操作前需自行补上的一环）。

   ```bash
   # No dependencies -- standard library only
   python --version   # 3.9+ required, 3.10+ recommended
   ```

2. **先做安全预览，不落盘**（这是最该先跑的一步，用于确认工具真的找到了你的数据目录）：

   ```bash
   python extract.py --list                    # just show what's installed, don't extract
   ```

3. **交互式提取**（从编号菜单里选要提取的来源）：

   ```bash
   python extract.py
   ```

4. **直接指定来源或全量提取**：

   ```bash
   python extract.py --all
   python extract.py --sources cursor,claude_code,aider
   python extract.py --all --merge             # also write all_conversations.jsonl
   ```

   或使用仓库自带简写脚本：

   ```bash
   ./extract_all.sh
   ```

   完整 CLI 参数（原文照抄）：

   ```
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

5. **Aider 需要额外指定项目目录**（它没有中心化会话库，每项目目录下各有一份 `.aider.chat.history.md`；默认会扫用户主目录加若干常见项目根名 `projects`、`code`、`dev`、`repos`、`workspace`、`src`、`Documents`，深度最多 5 层，跳过 `node_modules`、`.git` 等）：

   ```bash
   python extract.py --sources aider --search-path ~/client-work --search-path /mnt/data/repos
   ```

6. **查看产物**：每次运行在 `extracted_data/` 下生成带时间戳的文件，每行一个 JSON 会话，若加 `--merge` 另有 `all_conversations.jsonl`。字段结构原文示例：

   ```json
   {
     "messages": [
       {
         "role": "user",
         "content": "How do I fix this TypeScript error?",
         "code_context": [
           {"file": "/Users/you/project/ai-data-extractor/index.ts", "code": "const x: string = 123;"}
         ],
         "timestamp": "2026-01-16T14:30:22Z"
       },
       {
         "role": "assistant",
         "content": "The error occurs because you're assigning a number to a string type...",
         "tool_use": [{"name": "edit_file", "input": {"path": "src/index.ts"}}],
         "timestamp": "2026-01-16T14:30:25Z"
       }
     ],
     "source": "cursor-composer",
     "session_id": "c1a2b3...",
     "project_path": "/Users/you/ai-data-extractor",
     "name": "TypeScript Type Error Fix",
     "created_at": 1705414222000
   }
   ```

   **稳定性边界**：字段随来源而异，不是每个工具都记录 `code_context`、token 用量或 `project_path`；只有 `messages`、`source`、`session_id` 三个字段可以始终依赖。做横向对比前必须按这一点设计字段口径。

7. **单来源调试**（在排查某个工具时用）：

   ```bash
   python -m extractors.cursor
   # 或
   python extractors/cursor.py
   ```

8. **分享或训练前先扫密钥**（原文强制建议的三步）：

   ```bash
   pip install detect-secrets --break-system-packages
   detect-secrets scan extracted_data/*.jsonl
   ```

   另两步：人工复查专有代码、API key、个人文件路径（`code_context` 和 `tool_use` 最可能命中）；不要把 `extracted_data/` 提交到公开仓库（已在 `.gitignore` 里），含客户或专有内容时要放到加密存储。

9. **后续消费数据**（原文给的微调用例）：

   ```python
   from datasets import load_dataset

   dataset = load_dataset("json", data_files="extracted_data/*.jsonl", split="train")
   dataset = dataset.filter(lambda x: any(m["role"] == "assistant" for m in x["messages"]))

   def format_chat(example):
       return {"text": tokenizer.apply_chat_template(example["messages"], tokenize=False)}

   dataset = dataset.map(format_chat)
   ```

10. **扩展新来源**（照抄最简模块 `continue_ext.py`，填两个函数，再注册到 `extract.py` 的 `REGISTRY`；SQLite/JSON/JSONL 读取器和两个通用启发式都在 `extractors/common.py`）：

    ```python
    DISPLAY_NAME = "My Tool"
    SOURCE_ID = "my_tool"

    def find_installations(extra_paths: list[Path] | None = None) -> list[Path]:
        """Return the directories/files worth scanning."""

    def extract(installations: list[Path]) -> list[dict]:
        """Return a list of conversation dicts matching the schema above."""
    ```

11. **遇到问题时的原文排查路径**：
    - 报 "No installation found"：工具没装、没有历史、或位置非标准 → 用 `--search-path` 直指，或改 `extractors/<tool>.py` 的 `SEARCH_DIRS` / `APP_DIR_NAMES` 常量。
    - Cursor/Windsurf 数据库锁定：读取是用 `mode=ro` 打开的，正常情况下正在运行的编辑器不会阻塞；仍报错就关掉应用重跑。
    - Windsurf/Trae 找到了安装目录但 0 条会话：说明 `common.heuristic_extract_chat_from_kv` 的键名启发式没匹配上，先 `--list` 确认目录已找到，再直接看库里的键（原文命令）并补进 `KEY_HINTS`：

      ```bash
      sqlite3 state.vscdb "SELECT key FROM ItemTable"
      ```

**工作原理（理解它的可靠性来源）**：① 探测操作系统并列出候选数据根目录（`Application Support`、`.config`、`.local/share`、`%APPDATA%` 等）；② 在各根目录搜索工具的已知文件夹名；③ 按类型读取——JSONL 逐行、SQLite 用只读连接、或 JSON 树；④ 归一化成统一 `messages[]`；⑤ 写入 `extracted_data/`。它从不用写模式打开数据库，且每个读取器都有异常包裹，单个损坏或锁定的文件不会让整轮失败——会得到部分结果而不是堆栈报错。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：部分有依据——它揭示了一个此前容易被忽略的事实：你的 AI 使用痕迹本来就完整躺在本地（用户消息、助手回复、代码上下文、工具调用、diff），是可被程序化取用的。这属于"还有哪些数据可以交给 AI 处理"的一类发现，但没有涉及 AI 能力的扩展。
- **任务匹配**：有依据，但方式间接。它支持同时导出多个工具的历史，使"同一类任务在不同工具上的真实表现"第一次有可比数据；同时 README 明确各工具记录字段不同（不是每个都记 `code_context`、token 用量、`project_path`），这本身就是选择工具时要考虑的口径差异。原文没有给出任何"什么任务配什么工具"的结论。
- **条件供给**：有依据。要让抽取跑起来，需要提供的是：本机对目标应用数据目录的文件读取权限、各工具的实际安装路径（非标准位置用 `--search-path`）、Aider 场景下你的项目目录位置；对 SQLite 采用只读连接以避免与运行中的应用互相阻塞；正式提取前用 `--list` 做零风险探测。这些都是可写进手册的"前置条件清单"。
- **主动推进**：无依据。README 没有任何定时、事件或状态触发的机制（无 cron、无 watch、无 daemon），只能手动运行；`./extract_all.sh` 也只是"一次全量提取"的简写，不是周期任务。
- **效果验证**：核心相关，但只提供了原料而非方法。它产出时间戳、会话 ID、项目路径、模型名、工具调用记录，足以支撑"我自己到底怎么用 AI"的复盘与跨工具对比；README 举的落地例子是微调数据集构建。原文没有定义任何"效果是否改善"的指标。

## 与已有做法的关系（对照给出的清单条目）

清单中的四个条目全部是该工具的支持来源：

- **Claude Code（adopt）**：来源 #1，读取 `~/.claude/projects/**/*.jsonl`（每会话一个 JSONL）。这是清单中状态最高的一项，意味着可以直接对它的真实会话做抽取与复盘。
- **Cline（watch）**：来源 #9，与 Roo Code 一起支持，按任务存 Anthropic 原生格式消息数组；README 明确点出"它的提取器同时也是解析该格式的最简示例"，对你自建其他工具适配器有参考价值。
- **Cursor（watch）**：来源 #3，SQLite `state.vscdb`。README 特别说明 Cursor schema 至少变过三种形态（workspace `ItemTable` chat、inline composer、split `bubbleId` composer），`cursor.py` 三种都显式实现了。
- **OpenCode（watch）**：来源 #8，`~/.local/share/opencode/storage/` 下的 session/message/part 树结构。

另外覆盖了清单里没有的 Codex CLI、Windsurf、Trae、Continue、Gemini CLI、Aider。整体上，它与"逐工具单独用某助手"是互补关系：给已有做法补上一层跨工具的统一数据视图。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的具体内容**：10 个来源的表格式清单（含确切搜索路径）、完整 CLI 参数说明、输出 JSON 示例与字段稳定性说明、工作原理五步、Aider 的默认扫描目录名单与深度、隐私三步（含 `detect-secrets` 命令）、微调代码片段、三条 troubleshooting 处置路径、MIT 许可（明确允许用于训练 ML 模型）。这些都是可照抄的操作信息。

**仅为作者主张、无外部验证的部分**："Cline 和 Aider 是最常用的开源 agent 扩展 / 终端结对工具"属于作者判断；"读取用 mode=ro 所以运行中的应用不会阻塞"、"单文件损坏不会导致整轮失败"是设计声明，README 未给测试数据或失败率；"heuristic 是最诚实的最好努力"是自述。

**明确的适用条件与脆弱点**（原文自己承认）：
- Windsurf、Trae 没有公开 schema，用的是通用启发式（`extractors/common.py::heuristic_extract_chat_from_kv`，扫描 chat 相关 key 并遍历 JSON 找 role+text 形状），**属最佳努力而非文档化格式**——未来版本改结构就可能失配，需要自己改 `KEY_HINTS` 或提 PR。
- Cursor schema 已变更多次，虽然三种形态都实现了，但第四种形态出现时同样会失效。
- 字段不齐：`messages`、`source`、`session_id` 之外都不能保证存在，跨工具比较要按此设口径。
- Aider 必须有项目路径输入，否则可能漏掉。
- 仅处理"你自己账户下的本地数据"，作者把合规责任（数据权利、敏感信息处理、各工具 ToS）明确交回给使用者。
- 仓库仅 52 stars，属第三方小项目，README 是唯一材料来源，本次调研未审阅其代码实现。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（约 15 分钟，只在一台机器上做）**：
1. 选 2–3 个你本机确实用过、且有历史记录的工具（例如清单里已有的 Claude Code + Cursor + Cline），先跑 `python extract.py --list`，只确认"找到了哪些安装"，不落盘。
2. 跑 `python extract.py --sources claude_code,cursor,cline --merge`，检查 `extracted_data/` 下是否每个来源都生成了非空文件，以及 `all_conversations.jsonl` 是否可逐行 `json.loads` 解析。
3. 抽 3–5 条记录人工比对：`messages` 里角色与内容是否与你记忆中的真实对话一致；该工具本应记录的 `code_context` / `tool_use` 是否真的出现了。
4. 跑一次密钥扫描，确认 `code_context` / `tool_use` 字段里没有把 API key 或客户代码带出来：

   ```bash
   pip install detect-secrets --break-system-packages
   detect-secrets scan extracted_data/*.jsonl
   ```

**判断有没有改善的指标**（前两组可由工具输出直接计算，第三组需你自己定义口径，README 未提供）：
- **可用性**：每个来源的抽取会话数是否 > 0；与你在该工具中的实际会话数是否大致吻合（差值说明漏抽）；启发式来源（Windsurf/Trae）的命中率是否为 0——为 0 就等于该来源不可用。
- **数据质量**：`messages` / `source` / `session_id` 三个保证字段的缺失率应为 0；含 `code_context` 或 `tool_use` 的会话占比；JSONL 逐行解析失败行数应为 0。
- **对工作的改善**（需自建口径）：例如"同一类任务（如修 TypeScript 类型错误）在 A 工具与 B 工具下的往返轮次与返工次数"，用导出的时间戳和消息序列统计；或在每次任务后回看会话，标记哪些提问方式一次就得到可用结果。建议先手动复盘 20–30 条会话，确定指标是否真的能区分好坏，再谈自动化。
- **止损条件**：若 `--list` 找不到你主要使用的工具、或找到但抽取为 0 条、或需要频繁改 `KEY_HINTS` 才能维持，就不值得把它作为长期依赖，退回到单工具自身的导出/复制方式。
