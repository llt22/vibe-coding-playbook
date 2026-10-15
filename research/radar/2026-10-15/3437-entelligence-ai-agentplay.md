# Entelligence-AI/agentplay

- 结论：**值得一试**。先用 `AGENTPLAY_NO_NETWORK=1 uvx agentplay` 把本机已有的编码智能体会话回放成地图和时间线，把它当作「效果验证」环节的取证工具小范围试用；理由是它一条命令即可跑通、全本地无账号、覆盖 Claude Code / Codex / Cursor / Copilot / OpenCode / Kiro，且能直接回答「读了什么才改这个文件、哪条命令失败重试了几次、上下文在哪填满、产出了哪些 PR」，但原文只有示意性数据、没有量化改善证据，Cursor 会话缺 token/cost、成本为估算，所以先试不建议直接写进手册推广。
- 原文：https://github.com/Entelligence-AI/agentplay
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-15T03:06:52.111Z

## 是什么

agentplay 是 Entelligence 开源的本地工具（Apache-2.0），把本机编码智能体已经写下的会话记录，回放成两样东西：

- **地图**：一次会话碰过的 repo、目录、文件（看见 / 读过 / 改过）、shell 动词、MCP server 与工具、skills、subagent、web host、错误类别、模型，以及产出（commit、PR、ticket）。
- **时间线**：按 1x / 4x / 16x 回放，lane 覆盖 prompts、errors、delays、outputs、edits、exploration、MCP、skills、tools、model、cost、tokens、subagents、context size，并标出 compaction。

支持从 Claude Code、Codex（CLI/IDE）、Cursor（agent CLI 与 IDE composer）、GitHub Copilot CLI、VS Code 中的 Copilot、OpenCode、Kiro 的默认目录读取。数据全本地处理：无账号、无 API key、无 telemetry、无 session 上传，viewer 只服务在 `127.0.0.1`。产物是 `agentplay/v1` 的 JSON（有 JSON Schema，CI 校验），可 export / import 给同事。

## 具体做法

1. **前提**：Python 3.11 或更高；本机至少有一种受支持智能体留下过会话（默认目录如 `~/.claude`、`~/.codex`、`~/.cursor`、`~/.copilot`、`~/.kiro`、`~/.local/share/opencode/opencode.db`）。工具本身除标准库外无运行时依赖。

2. **先确认本机有哪些智能体的会话可读**：

```bash
uvx agentplay agents
```

3. **一条命令跑起来**（会自动找到已有会话、逐个生成脱敏回放、打开本地 viewer）：

```bash
uvx agentplay
# 等价写法
pipx run agentplay
pip install agentplay   # 或装进环境
```

4. **关掉唯一的网络调用**（viewer 首次打开会邀请填 email，不想参与就关）：

```bash
AGENTPLAY_NO_NETWORK=1 agentplay
# 或
DO_NOT_TRACK=1 agentplay
# PowerShell: $env:AGENTPLAY_NO_NETWORK = "1"   cmd: set AGENTPLAY_NO_NETWORK=1
```

5. **在 viewer 里读**（默认地址 `http://127.0.0.1:7317/`）：
   - 地图：定位这次到底碰了哪些文件、哪些只是看过没改、哪些 MCP/skill/subagent 被调用。
   - 时间线：`Space` 播放/暂停，方向键单步、`Shift` 走 10 步，`E` 跳到下一个 edit、`X` 下一个 error、`D` 下一个 delay、`O` 下一个 output、`R` 下一个 retry。
   - 作用域：按 task、按 model、或按单个 subagent（agent lens）整体重聚焦。
   - task 划分：通常一个 prompt 一个 task，标签取自该 prompt 开头。
   - 每个视图都是 URL，可把「某一刻」的链接发给同机跑着 viewer 的人。

6. **用 Errors 面板做失败复盘**：Errors 标签页按类别分组，并按「同一条失败命令连续失败的最长串」排序；点某一行直接把回放定位过去。header 上的 error / PR / subagent 徽章可以同法收窄时间线。

7. **导出与分享（务必先脱敏）**：

```bash
agentplay export <session>                  # 写单个会话的 map 到 .json / .json.gz
agentplay build --path-mode dirs_only       # 要公开发布就重建为目录级路径
agentplay import <map 文件>                 # 把同事/另一台机器的 map 加进本地库
```

路径模式（`--path-mode`，用在 `build` 或 `view`）：`relative`（默认，`src/billing/invoice.py`）／`dirs_only`（`src/billing/•a1b2c3`）／`hashed`（每段用 `AGENTPLAY_HMAC_KEY` 做 HMAC-SHA256，没设 key 会退回 dirs_only）。注意：**任何模式下 repo 名和 remote 都会保留**，remote 敏感的话分享前手动删掉 `repos[].remote`。

8. **控制范围与增量**（builds 是增量的，只重建 transcript 变过的会话）：

```bash
agentplay build --since 30d                 # 只处理窗口内变化的会话（12h / 2w / 2026-09-01）
agentplay build --agents claude-code,codex  # 限定智能体
agentplay build --limit 20                  # 最新 N 个
agentplay build --rebuild                   # 连没变的也重建
agentplay list --limit 20 --json            # 机器可读输出
agentplay view --port 7317 --no-open --no-build
agentplay view --no-titles                  # 不留本地标题，并清掉已存的
```

9. **会话目录不在默认位置时用环境变量覆盖**（WSL 场景常用）：

```bash
AGENTPLAY_CLAUDE_HOMES=~/.claude,/mnt/c/Users/you/.claude agentplay
```

同类变量还有 `AGENTPLAY_CODEX_HOMES`、`AGENTPLAY_CURSOR_HOMES`、`AGENTPLAY_COPILOT_HOMES`、`AGENTPLAY_COPILOT_VSCODE_HOMES`、`AGENTPLAY_OPENCODE_HOMES`、`AGENTPLAY_KIRO_HOMES`、`AGENTPLAY_HOME`（默认 `~/.agentplay`）。

10. **从源码安装 / Windows**（可选，想改 parser 或看 demo 时才需要）：

```bash
git clone https://github.com/Entelligence-AI/agentplay
cd agentplay
make setup        # python venv + viewer node_modules
make viewer       # 构建 web viewer 并拷进 Python package
make run          # agentplay view
```

Windows 下 `make` 需 Git Bash / MSYS2 / WSL；没有 `make` 时 README 给了完整 PowerShell 等价步骤（`uv venv python\.venv` → `uv pip install ...` → `corepack pnpm install --frozen-lockfile` → `corepack pnpm run build` → 拷贝 `dist` 到 `python/src/agentplay/viewer` → `.venv\Scripts\agentplay view`）。viewer 需要 `viewer/package.json` 里钉的 pnpm 10.x。

11. **不装也能先看效果**：在 `viewer/` 里 `pnpm dev` 会加载三个合成 demo 会话；也可以把任意 `agentplay/v1` 文件直接拖到页面上。

## 对应的研究问题

**5. 效果验证（原文的主要落点，证据最强）**
README 明确把工具定位为回答四类问题：agent 在改这个文件之前读了什么、有什么它始终没打开；哪些命令失败了、同一条重试了几次；上下文窗口在哪里填满、subagent 带回了什么；这次会话产出了哪些 PR、commit、ticket。对应到格式里是可直接读取的字段：`outcome`（如 `pr_created`）、`events[].kind`（`read` / `llm` / `verify` 等）、`err` / `errClass` / `exitCode`、`retries`、`delays`、`compactions`、`prs[]`、以及 `totals` 里的 calls / requests / errors / tokens / costUsd。这是把「AI 到底干了什么」变成可核对记录的现成手段。

**2. 任务匹配（部分，需自己补验证）**
地图的作用域可以按 model 或单个 subagent 重聚焦，格式里 `agents[]` 区分 main / subagent（含 `subagentType`），`llm` 事件带 `model`、`in` / `cw` / `cr` / `out`、`latency`。也就是说「同一任务下不同模型/子智能体的调用次数、token、延迟、花费」是可以被读出来的。但原文只提供了字段，没有给出任何跨模型对比的结论或推荐，所以这只能作为做对比实验的素材，不能当结论用。

**3. 条件供给（弱，只能发现问题）**
MCP server 的失败、hook 的失败（地图记下哪个 hook 失败、失败后它跑了什么）、错误类别、退出码都被记录，因此可以用来定位「这次会话是不是因为缺某个工具、权限或反馈而卡住」。但 README 没有给出任何「补齐供给」的流程或配置模板。

**1. 能力发现（很弱，仅有间接线索）**
回放能让你看到 agent 实际读过的文件、用过的 skill / MCP / subagent，可能由此发现它可以承担但你没交给它的工作。这是使用者的推断，原文没有对应的主张或流程。

**4. 主动推进（无依据）**
原文未涉及时间/事件/状态触发或持续执行。唯一相关的是构建过程本身是增量的（后续运行只重建 transcript 变过的会话），这属于工具实现，不是被委托工作的自动推进。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：直接相关，且是支持度最高的一档。README 写明 Claude Code 从 `~/.claude/projects/**/*.jsonl` 及 `…/subagents/agent-*.jsonl` 直读，「最高保真」，含 hooks、compactions、stop reasons、latency、per-request token、subagent lane。可作为已采用的 Claude Code 的配套验证工具。
- **Cursor（watch）**：支持，但只拆 main lane，且**不记录 token / cost**（Cursor 不把计费用量写盘，工具也不去调 Cursor API）；SQLite store 是本地只读拷贝解码。可在观察 Cursor 时作为取证手段，但拿不到成本数据。
- **OpenCode（watch）**：支持，读 `~/.local/share/opencode/opencode.db`，本地解码，main lane only，per-turn token。
- **GitHub Copilot（清单状态 drop）**：agentplay 支持 Copilot CLI（`~/.copilot/session-state/**`）和 VS Code 里的 Copilot（`User/workspaceStorage/*/chatSessions`，覆盖 Code / Insiders / VSCodium），main lane only、per-turn token「where recorded」。这提供了重新审视 Copilot 的取证能力，但不构成改变其 drop 状态的依据。
- **Cline（watch）**：**不支持**。README 在 Contributing 里把 Cline 和 Gemini CLI、Amp、Roo、Windsurf、Aider 一起列为最想要的第三方 parser。
- 另外，README 提到该格式刻意独立于工具本身，任何 agent / 可观测性产品 / transcript 工具都可以产出或读取 `agentplay/v1` 并复用 viewer。

## 证据与局限

**原文给出的、可核对的东西**：
- 安装与使用方式（一条 `uvx agentplay`、CLI 子命令 `view/build/list/export/import/agents`、完整 flag 表、环境变量表）。
- 数据格式：`agentplay/v1` 的 JSON 示例、字段含义、JSON Schema 路径、CI 会对每张 map 做 schema 校验。
- 隐私契约的具体清单：map **不含** prompt 文本、助手文本或推理、工具输入输出、文件内容、命令参数（只记动词如 `git log` / `pytest`）、subagent 的 prompt 或描述、用户消息文本（只记长度和图片/链接数）；map **包含** repo 名与 remote、repo 相对路径、工具 / MCP server / skill / 模型名、token 数、时序、错误类别、退出码，repo 外的路径会塌缩为 `~/Downloads`、`outside-repo` 之类粗桶。

**只是作者主张、材料内无法验证的**：
- 「会话数据永不离开本机」「只有 email 注册这一次网络调用」「Cursor 计费查询被故意禁用」——都只有 README 自述，附了 `account.py` 和 `grep -rn urllib.request python/src/` 的查证路径，但未在材料中实际验证。
- 测试规模（Python 约 1000 个测试、viewer 250+ 个测试）、CI 校验、跨 agent parser 正确性，均无法在材料内核实。
- 所有数字都是示意性的：命令输出里 412 个会话那段被 README 自己标为 “Illustrative counts”，截图是 synthetic demo data。**原文没有给出任何真实的量化改善数据或案例。**

**原文自陈的局限（直接影响适用条件）**：
- Cursor 会话没有 token 和花费数字。
- map 是会话结束后才构建的，因此无法可靠区分 `Write` 是新建还是覆盖；只有当会话此前已经见过该文件时才记为 edit。
- 成本是按 `_core/pricing.py` 里的公开标价估算，不含 plan / enterprise / batch 价。
- 单个 map 上限 20,000 个事件（超出标记 `truncated`），transcript 超过 512 MB 会被跳过。
- Windows 由 parser 支持但测试少于 macOS/Linux，home 之外的路径（如 Copilot in VS Code 的 `%APPDATA%`）覆盖更少。
- 商业化部分（宿主团队版）才有的能力：把 review 评论追溯回造成它的那次编辑、跨工程师视图、团队级建议、adoption 度量；开源版不含，README 承诺开源版不会被削弱来卖它。

**适用条件小结**：适合已经在本机跑编码智能体、需要复盘单次会话的工程场景；不适合需要跨机器汇总（要靠 export/import 手动搬）、需要精确成本核算、或完全不能暴露 repo 名与 remote 的场合。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 在一台跑过 Claude Code（保真度最高）的机器上，只取最近少量会话跑一次：

```bash
AGENTPLAY_NO_NETWORK=1 uvx agentplay --since 7d --limit 10
```

2. 挑一个你印象里「卡了很久」或「改错了地方」的会话，用 Errors 标签页加 `R` / `X` 键逐条跳到失败与重试处，记录三件事：失败的 shell 动词、同一命令连续失败的次数、compaction 发生的位置（第几个事件）。
3. 用同一个会话回答并写下答案，作为对照组：它改 X 之前读过哪些文件？哪些相关文件它始终没打开？有没有 subagent 空手而归？会话的 `outcome` 是什么（有没有落到 `pr_created`）？
4. 换用你日常的方式（翻原始 transcript 或凭印象）回答同样三个问题，记录各自花的时间。
5. 一周后再跑一次同样的命令（增量重建），对比同一批指标。

**判断有没有改善的指标**

- 定位耗时：回答「这次会话为什么失败/低效」所需的时间（人工翻 transcript vs 用地图）。
- 过程量：单会话 errors 数、同一失败命令的最长重试串、retries 数、compactions 次数、tokens / costUsd（Cursor 会话无这两项）。
- 结果量：`outcome` 分布（如 `pr_created` 占比）、单会话产出的 commit / PR / ticket 数。
- 协作量：`agentplay export --path-mode dirs_only` 后让别人 `agentplay import`，看对方能否在没有你口头解释的情况下复现你的复盘结论。
- 隐私检查：导出前先看 export 报告的 repo 名与路径数，确认可公开；remote 敏感就手删 `repos[].remote`。

**容易踩的坑**：上述指标原文没有基线，只能做自己的前后对比，不能据此推断「AI 被用得更好了」；成本是估算值，不要用于计费口径；单次结果受会话长度影响，20,000 事件封顶和 512 MB 跳过都可能让大盘子看不到全貌。
