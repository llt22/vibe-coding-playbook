# TedHaley/pensieve

- 结论：**值得一试**。建议小范围试用：在 1–2 个中型以上代码库上装 Pensieve，把 Claude Code/Cursor 等通过 MCP 接上并加上 instructions block 与两个 hook，再用仓库自带的 bench 对比 grep 与 guided 两臂的任务解决率、工具调用数和 token 消耗；原因是 README 给出了完整的安装、MCP 连接、作用域、钩子和评测命令，可照做，但全部效果数据都是作者自测，且完整能力（搜索面板）仅限 Apple Silicon Mac。
- 原文：https://github.com/TedHaley/pensieve
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-12T14:12:11.567Z

## 是什么

Pensieve 是一个本地运行的语义检索层：把本机文件、文件夹、git 仓库和 AI agent 会话记录（Claude Code / Codex / Qwen Code 的 transcripts）统一索引到 `~/.pensieve`，向人和 agent 提供「按语义找文件/代码片段」而不是让 agent 满盘 grep。

- 人类侧：macOS 搜索面板，按 **Control+Shift** 呼出，支持 `"精确词组"`、`-排除`、`kind:file|doc|code|session|folder|repo|person`、`by:某人`、`ext:pdf`、`in:路径` 等查询语法。
- Agent 侧：以 MCP server 形式接入，每个连接有一个 **scope**（索引切片，默认是 agent 所在仓库），并附带一组「谁懂这块」「知识缺口」「未被探索区域」的工具。
- 索引内容：文本/Markdown/Office/PDF/邮件/代码等按内容索引；图片、音视频只按文件名索引且不上图。
- 技术栈：`Qwen3-Embedding-0.6B` 做嵌入，SQLite（trigram 全文索引做精确匹配）+ turbovec 做向量索引；AI 摘要与洞察可选（内置 Qwen 3.5 9B、LM Studio、Claude Code 或 Codex）。

## 具体做法

### 1. 安装（前提：Apple Silicon Mac，完整功能；Linux/Intel Mac 只能装后端，无搜索面板）

```bash
curl -fsSL https://tedhaley.ca/pensieve/install.sh | sh
```

脚本会下载最新 `Pensieve.dmg` 并把 app 拷到 Applications，再用 app 内安装器装 `pensieve` 后端。不需要 git、Xcode tools 或 Python。在终端里由 agent 运行这个脚本时只安装、不启动 app。

首次运行会下载嵌入模型（约 1.2 GB），随后后台索引，搜索和 Map 随索引进度逐步可用。

手动安装（需 Xcode tools）：

```bash
uv tool install git+https://github.com/TedHaley/pensieve   # 后端: `pensieve`
git clone https://github.com/TedHaley/pensieve && pensieve/mac/build.sh --install   # Mac app
```

Linux / Intel Mac 上脚本会装 uv 并从源码装后端，然后启动后端并在浏览器打开 Map。

### 2. 连接 agent（前提：后端已安装）

```bash
pensieve integrate recommended
```

该命令扫描本机的 Claude Code、Codex、Cursor、Gemini CLI、Qwen Code、Windsurf、Claude Desktop、VS Code，逐一登记为 MCP server。

只接 Claude Code 时：

```bash
claude mcp add --scope user pensieve -- pensieve mcp   # stdio；scope "auto" = agent 启动时所在仓库
claude mcp add pensieve -- pensieve mcp --scope payments
claude mcp add --transport http pensieve "http://127.0.0.1:8765/mcp?scope=payments"
```

只支持 stdio 的 agent 用 JSON 配置：

```json
{"mcpServers": {"pensieve": {"command": "pensieve", "args": ["mcp"]}}}
```

`pensieve mcp` 在后端未运行时会自动拉起后端。`--scope user` 让 Pensieve 在所有项目可用；不加则只对运行命令时的目录生效。

### 3. 完成 setup（不做完，索引为空，MCP 连接会额外拿到 setup 工具）

App 打开后按向导走：了解功能 → 选择使用方式（软件开发 / AI coding agents / 文档办公 / 研究笔记）→ 让 Pensieve 在相应文件夹里找来源（macOS 会弹权限）→ 勾选要索引的内容、补充没找到的文件夹或仓库 → 选洞察引擎或稍后再说 → 开始索引。

终端等价操作：

```bash
pensieve setup                  # 列出发现的 agent 会话、文件夹、仓库、应用及其大小
pensieve setup recommended      # 索引被标记为 [x] 的
pensieve setup agents/claude repos//Users/me/code/app   # 或精确指定
```

agent 也能在对话里完成同样的 setup，它会拿到 `setup_guide`、`setup_scan`、`setup_add_source`、`setup_start` 四个工具，按 `setup_guide` 给出的顺序提问。

### 4. 让 agent 真正改用搜索而不是 grep（可选 add-on，README 标为 recommended）

```bash
pensieve integrate                    # 查看有哪些 add-on、已装哪些
pensieve integrate recommended        # 每台机器上每个 agent 的 MCP server + instructions block；
                                      # Claude Code 还会装 pensieve-search skill 和两个 hook
pensieve integrate cursor-mcp codex   # 只装指定项
pensieve integrate pensieve-teammates pensieve-plan
pensieve integrate claude --remove    # 精确移除已装内容
```

- **instructions block**：往 `~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md`、`~/.gemini/GEMINI.md` 或 `~/.qwen/QWEN.md` 里插一段「先搜索再 grep」的说明，包在 `<!-- pensieve:start -->` 标记之间。其他 agent（Cursor、Windsurf）需手动贴进规则文件。
- **`claude-hook`**：`~/.claude/settings.json` 里的 `PostToolUse` 钩子，每次 Edit/Write 后把改动路径发给 Pensieve，使下一次搜索一定能搜到新代码（即使文件系统事件延迟）。每次编辑增加约 50 ms。
- **`claude-repo-check`**：`SessionStart` 钩子。在未索引的仓库开会话时，Claude 只问一次是否索引：是则跑 `pensieve repo index`，否则跑 `pensieve repo skip` 并在该仓库改用 grep；答案会存成 Settings → Sources 里的开关，不再重复询问。
- **`pensieve-search` skill**：查询写法、什么时候回落 grep、写新代码前找相似代码、回忆历史会话。
- **`pensieve-teammates`**：根据 git blame 建议该问谁，并替你起草问题（不会真的发消息）。
- **`pensieve-plan`**：规划新代码时列出可复用的先例、早先的尝试、要拉进来的人和知识风险。

### 5. 用 scope 控制 agent 能看到什么

- `auto`（`pensieve mcp` 默认）：用 agent 的工作目录——命中第一个包含该仓库的命名 scope，否则就限定为该仓库及其 worktree 和其中的 agent 会话；不在任何仓库内 = 全部。在 Pensieve 未索引的仓库里，搜索会告诉 agent 改用 grep，不会把别的仓库代码返回给它。HTTP 连接看不到 agent 目录，必须显式指定 scope（不写 `?scope` = 全部）。
- 命名 scope 是一组来源的列表，例如 `payments = repos/~/code/billing + repos/~/code/ledger + files/~/Documents/specs`，可在 Settings → Scopes 或 `save_scope` 工具里建。只有一个索引，scope 只做过滤，不会重复嵌入。
- search、read、similar、who_knows、list_repos、team、unexplored 全部受 scope 约束，scope 外的条目会被拒绝。
- 搜索面板和 Map 使用 `default_scope`（空 = 全部）。

### 6. 了解 agent 默认能调哪些工具

默认 11 个：`search`、`read`、`similar`、`who_knows`、`knowledge_gaps`、`list_repos`、`team`、`unexplored`、`open`、`current_scope`、`index_path`。工具描述每轮都会发给 agent，所以默认只暴露这些。需要让 agent 管理 Pensieve 自己时，用 HTTP 的 `?tools=all` 或 `pensieve mcp --all-tools`，额外获得 `show_search`、`show_visualizer`、`status`、`list_scopes`、`save_scope`、`delete_scope`、`list_sources`、`set_source`、`add_folder`、`remove_folder`、`get_settings`、`update_settings`、`reindex`。

`index_path` 允许你在对话里让 agent 索引一个文件夹（git 仓库、仓库目录、agent 会话目录或文档），Pensieve 自行判断类型。

### 7. 关键配置（`~/.pensieve/settings.json`，或 Map → Settings，或 `update_settings`）

| 设置 | 默认值 |
|---|---|
| `folders` | `~/Documents`、`~/Desktop`、`~/Downloads` |
| `chunk_chars`, `max_chunks` | 1500、2000（0 = 不限） |
| `sweep_roots`, `sweep_depth` | `~`、4 |
| `max_repo_files` | 5000（只对扫描发现的仓库生效） |
| `exclude` | 永不进入的目录名（`node_modules`、`Library` 等） |
| `exclude_files` | 永不索引的文件名 glob（密钥类） |
| `scopes`, `default_scope` | agent 的命名索引切片 |
| `ai`, `builtin_model`, `agent_model` | `auto`、`mlx-community/Qwen3.5-9B-MLX-4bit`、`haiku` |
| `hotkey` | `ctrl+shift` |
| `editor` | `default`/`vscode`/`cursor`/`zed`（设为后代码结果直接跳到匹配行） |
| `llm_url`, `llm_model` | `http://localhost:1234/v1`、`qwen/qwen3.5-9b` |

安全相关：看起来像密钥的文件（密码管理器应急包、keys、`.env`、凭据）永不索引，由 `exclude_files` 控制。所有数据存在 `~/.pensieve`，删掉该目录即重来。

### 8. 自测效果（bench）

```bash
uv run python bench/agent_search.py gen --repo ~/code/myrepo -n 40 --tasks tasks-v2.jsonl
uv run python bench/exact_tasks.py                      # 追加 name / error-string / mixed 查询
uv run python bench/agent_search.py find --repo all --tasks tasks-v2.jsonl --styles query,desc,mixed,ident,literal
uv run python bench/agent_search.py run --repo ~/code/myrepo --tasks tasks-v2.jsonl --arms grep,guided
```

任务由你自己的代码生成（把一段代码用白话描述，或用它定义的名字、它里面的错误字符串、或混合方式），Claude Sonnet 无头运行，比较开/关 Pensieve 时能否答出正确的文件。

## 对应的研究问题

**1. 能力发现**
- 让 agent 检索「过去的 agent 会话」而不是只检索代码：Claude Code（`~/.claude/projects`）、Codex（`~/.codex/sessions`）、Qwen Code（`~/.qwen/projects`）的 transcripts 默认就索引，可 `kind:session` 查询。
- `who_knows`、`knowledge_gaps`、`unexplored`、`team` 把「该问谁」「这块代码是不是只由已离开的人写过」「我工作旁边还有哪些没碰过的区域」变成可查询项——这类组织性判断通常不会想到交给 AI。
- 日常计算与换算（`2^10`、`15% of 240`、`3 ft in cm`）也由搜索面板承担，属于顺手可接管的小任务。

**2. 任务匹配**
- 匹配场景：文件数多、需要跨仓库/跨文档找「相关内容」而不是精确字符串的场景；尤其大 monorepo（README 在 34,847 文件仓库里效果最好）。
- 工具匹配：MCP stdio（本地 agent CLI）或 MCP HTTP（`http://127.0.0.1:8765/mcp?scope=...`）；Claude Code、Codex、Cursor、Gemini CLI、Qwen Code、Windsurf、Claude Desktop、VS Code 均有集成项。
- 嵌入模型固定为 `Qwen3-Embedding-0.6B`，Apple Silicon 上走 MLX，其他平台走 sentence-transformers + PyTorch（CUDA 或 CPU，安装体积多约 650 MB）。
- 洞察引擎可按隐私/成本选：本机 MLX 内置 Qwen 3.5 9B、本机 LM Studio/OpenAI 兼容服务、Claude Code（文本上传 Anthropic，且不做逐块摘要以压低调用量）、Codex（上传 OpenAI）、或关闭。
- 协作方式：用 scope 把 agent 限定在它正在做的仓库/切片上，避免把别的仓库代码塞进上下文。

**3. 条件供给**
- 前置条件：安装后端、完成 setup（选来源 → 授权文件夹 → 开始索引）、把 agent 接成 MCP server；不完成 setup 索引为空，连接会退化为 setup 工具。
- 关键信息供给：instructions block（「先搜索再 grep」）写进 `CLAUDE.md`/`AGENTS.md`/`GEMINI.md`/`QWEN.md`；其他 agent 需手动贴进 rules。
- 新鲜度供给：`claude-hook` 在每次 Edit/Write 后推送改动路径（约 50 ms 开销）；`claude-repo-check` 在会话开始时一次性解决「这个仓库要不要索引」。
- 权限供给：搜索面板 Control+Shift 敲击需要「辅助功能」权限（系统设置 → 隐私与安全性 → 辅助功能 → Pensieve），Control+Shift+Space 组合键不需要；Apple Notes 索引需要额外授权。
- 成本供给：首次索引能耗高，Apple Silicon 约每分钟 500 个代码文件，35,000 文件仓库约一个多小时；Settings → Sources 可看同步进度。

**4. 主动推进**
- 事件触发：FSEvents 监听文件夹、仓库、worktree 与 agent transcripts，最后一次保存后约 0.5 秒索引变更；搜索前会先把待处理变更索引掉，所以编辑后马上搜索能搜到新文本。
- 定时触发：仍在写入的会话每 30 秒更新一次；每 5 分钟一次全量扫描兜底。
- 状态触发：`SessionStart` 钩子在未索引仓库里自动询问是否索引并记住答案；`index_path` 让你在对话中按需触发索引；未提交改动、linked worktree（含 `.claude/worktrees`）里的差异文件也会被索引并按分支标记，worktree 删除后消失。
- 结果自愈：搜索结果会与磁盘文件比对——文件删了就移除结果，文件改了则重新索引并重跑搜索；期间不能完成时标记为「已编辑」，代码结果给出文本现在所在的行号。

**5. 效果验证**
- 仓库自带 `bench/`，用 Claude Code 自身在用户自己的仓库上跑 A/B（grep/glob/read 臂 vs Pensieve + instructions block 臂）。
- README 报告的指标：任务解决数、每次查找工具调用数、每次查找成本、tokens、耗时；作者报告 72 个 held-out 任务、4 个仓库（504–34,847 文件）、每个跑两次、同一批次内对比。
- 另有检索命中率指标（正确文件排第一的比例，按查询类型分：名称、错误字符串、名称+描述混合、纯描述）。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）**：Pensieve 是它的上下文供给外挂。集成方式明确——`claude mcp add --scope user pensieve -- pensieve mcp`，外加 instructions block、`pensieve-search` skill 和 `PostToolUse`/`SessionStart` 两个钩子。对已把 Claude Code 列为 adopt 的项目，这是可叠加的补充，而不是替代。
- **Cursor（清单状态：watch）**：集成列表含 `cursor-mcp`，可在 Cursor 的 MCP 配置里加 Pensieve；instructions 需手动贴进 Cursor 规则。与清单中 Cursor 的 watch 状态一致，属于有待验证的接入方式。
- **Obsidian（清单状态：drop）**：Pensieve 支持索引 Obsidian vault（默认开启）。若项目已放弃 Obsidian，这条集成项对本项目无直接价值。
- 除上述三条外，清单中没有与 Pensieve 同类（本地语义检索 + MCP 上下文供给 + 知识缺口分析）的条目。

## 证据与局限

**原文给出的具体数据/命令（可核对）**
- 基准表（72 个 held-out 任务 × 4 个仓库 × 各跑两次，Pensieve 0.5.6）：任务解决 123/144（85%）→ 131/144（91%）；每次查找工具调用 3.44 → 1.97（−43%）；每次查找成本 $0.050 → $0.041（−18%）；每次查找 tokens 67k → 57k（−16%）；每次查找耗时 10.9 s → 8.6 s（−21%）。分仓库：504 文件仓库省 15%；1,783 与 2,383 文件仓库省 6–14%；34,847 文件 monorepo 省 28% 且工具调用少 47%。144 次运行中有 82 次 agent 一次搜索就作答。
- 命中率：正确文件排第一——名称 94%、错误字符串 88%、名称+描述混合 74%、纯描述 58%；单次 grep 对应为 54%、92%、0%、0%。
- 性能：搜索约 0.1–0.2 秒，在 35,000 文件仓库中和索引进行时同样如此（搜索会让索引暂停片刻）。首次索引约 500 代码文件/分钟，35,000 文件仓库约一个多小时。
- 全部安装、集成、scope、bench 命令均原样给出，可照抄执行。

**只是作者主张、需要自行验证**
- 全部基准数字来自作者自述，README 未给出第三方复现结果；bench 代码虽在仓库里，但要自己跑一遍才算数。
- 成本数字依赖 Claude 的 prompt cache 冷热，README 自己声明「只能在同一批次内比较」。
- 「agent 习惯性 grep」这一动机是作者论断，需要在你自己的 agent 上观察。
- 「约 50 ms 的 hook 开销」「0.5 秒索引延迟」「每 30 秒 / 每 5 分钟」这些时序数字同样只有作者口径。

**适用条件与限制**
- 仓库 37 stars，早期项目，接口（工具名、add-on 名、设置键）可能变动。
- 完整产品形态（搜索面板 app）仅 macOS；Apple Silicon 才有 MLX 嵌入与内置洞察模型（MLX 路径需 16 GB 内存，内置模型首次约 5 GB 下载，嵌入模型约 1.2 GB）。Linux / Intel Mac 只有后端 + 浏览器 Map，需从源码装，多约 650 MB 依赖。
- 首次索引有明显时间与能耗成本；扫描发现的仓库超过 5,000 个受跟踪文件时默认跳过，需要手动开。
- 长文档默认每 1,500 字符切块、每文档最多读 2,000 块（约 1,000 页），超出部分不索引，改设置会触发重新读取。
- 用云端洞察引擎（Claude Code / Codex）意味着索引内容会发到对应云服务；敏感仓库应改用本地引擎或关闭洞察。
- 搜索质量对「纯描述型」查询只有 58% 命中第一，这类查询仍可能需要人工或 grep 兜底。

## 怎么试、怎么验证

**最小试用（半天量级）**
1. 在一台 Apple Silicon Mac 上装：`curl -fsSL https://tedhaley.ca/pensieve/install.sh | sh`。
2. 只挑一个中型以上仓库 + 一个文档目录做来源，完成 setup 并等首次索引结束（看 Settings → Sources 进度）。
3. 接 Claude Code：`claude mcp add --scope user pensieve -- pensieve mcp`，然后 `pensieve integrate claude`（含 instructions block、`pensieve-search` skill、`claude-hook`、`claude-repo-check`）。
4. 日常用一个真实任务试一周：同一类「找相关代码」的需求，分别在有/无 Pensieve 的连接下让 agent 做，记录过程。

**量化验证（用仓库自带 bench，在同一批次内比较）**

```bash
uv run python bench/agent_search.py gen --repo ~/code/myrepo -n 40 --tasks tasks-v2.jsonl
uv run python bench/exact_tasks.py
uv run python bench/agent_search.py run --repo ~/code/myrepo --tasks tasks-v2.jsonl --arms grep,guided
```

判断指标（任一改善才算有效，最好同时看方向一致）：
- 任务解决率：`guided` 臂不低于 `grep` 臂（作者口径是更高）。
- 每次查找的工具调用数：期望明显下降（作者口径 −43%）。
- 每次查找的 tokens 与成本：期望下降，且两组必须在同一批次内比较，否则 prompt cache 冷热会让数字失真。
- 每次查找耗时：期望下降。
- 检索命中率：用 `find --styles query,desc,mixed,ident,literal` 看正确文件排第一的比例，特别是你自己库里常见的查询类型。

**日常观察指标**
- agent 在一次提问里自己搜到正确文件的比例（README 提到 144 次运行中 82 次一次搜索即答）。
- 你手动纠正 agent「找错文件」的次数是否下降。
- 首次索引时间与磁盘占用（`~/.pensieve` 大小）是否可接受。
- 若在纯描述型查询上表现差（作者口径 58%），确认回落 grep 的工作流是否顺畅，instructions block 与 skill 是否覆盖了这种情况。

**止损条件**
- 索引时间或能耗超出可接受范围；
- 在自己的仓库上解决率或 token 没有改善；
- 涉及敏感代码而无法使用本地洞察引擎。
满足任一条即可回退：`pensieve integrate claude --remove` 移除集成，删除 `~/.pensieve` 清空索引。
