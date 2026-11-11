# Glen-Web-App/best-memory-plugins

- 结论：**值得研读**。把这份榜单当作“编码智能体记忆插件”的选型检查表和隐私/共享维度对照来读，不要直接用它的排名；因为榜单由 Glen 团队维护且自家产品排第一，检索质量证据多为厂商自报，但其中的捕获方式分层（逐轮 hook > 首提示注入 > 需模型主动调用）和各家的本地/云/权限开关很有参考价值。
- 原文：https://github.com/Glen-Web-App/best-memory-plugins
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-11T13:50:04.002Z

## 是什么

这是一份由 Glen 团队维护的排行榜 README（CC0-1.0），横评 24 款给编码智能体提供“跨会话持久记忆”的插件/扩展：Claude Code、Codex、Cursor、OpenCode、Cline 等。每条给出捕获方式（每轮 hook、首提示注入、还是模型必须主动调用的工具）、存储位置（本地 SQLite/Chroma、自托管 Postgres、厂商云）、团队共享方式、许可、星数、安装命令、优缺点和“适合谁”。

原文自己披露了利益冲突：榜单由 Glen 团队维护，Glen 排第一是“maintainer's pick”；第 2 到 24 名按七条公开标准排序（维护活跃、是否有插件形态、捕获模型、检索质量证据、安装成本、团队共享、许可与定价透明度）。检索质量证据被明确标注为 vendor-reported、权重很低。

注意：抓取文本在第 11 条 MemPalace 中途截断，第 12–24 条只有表格一行信息，没有展开细节。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

以下步骤只从原文明确给出的内容中提取，不补写原文没有的流程。

1. **先用原文的排序标准做检查表，不先看排名。** 逐项问：最近 6 个月有没有提交/发布？是不是装进智能体的插件、hook 或规则模式（只靠通用 MCP 连接的不算）？捕获是每轮 hook、仅会话开始注入，还是要模型自己记得调用？安装是一条命令还是一堆后台服务和 API key？团队共享有没有文档化路径？许可和价格是否透明？前提：这一步只需要 README 和各家文档，不需要安装。

2. **确定部署边界：本地、自托管还是云。** 原文把“默认悄悄把 prompt 发到托管服务”列为扣分项。按此核对候选：claude-mem 默认走 CMEM Pro 托管 observer；Supermemory 默认云、可 `npx supermemory local` 自托管；Hindsight 默认云、可自托管或本地 daemon `127.0.0.1:9077`；Cognee 本地默认、起 `localhost:8011`；agentmemory 本地 `localhost:3111`、查看器 `:3113`，keyless 时不发任何东西；deja-vu 纯本地、零 LLM 调用；projectmem 把 `.projectmem/` 放在仓库里。

3. **单机最小安装。** 前提：已装对应智能体，Node/Python 等运行时满足各家要求。原文给出的命令：

```bash
# claude-mem（前提：Node 20+、Bun、uv）
npx claude-mem install

# agentmemory（本地服务 + Claude Code 插件）
npx -y @agentmemory/agentmemory@latest
/plugin marketplace add rohitg00/agentmemory

# deja-vu（索引磁盘上已有的 43 种智能体 transcript）
deja install --auto

# MemPalace（导入已有 Claude Code 会话）
pip install mempalace
mempalace mine ~/.claude/projects/ --mode convos
```

团队/多智能体场景的命令：

```bash
# Glen（前提：有 Glen 账号和 org；云服务）
npx @tryglen/cli@latest install
# 或手动装 Claude Code 插件
claude plugin marketplace add Glen-Web-App/glen-claude-code-plugin
claude plugin install glen@glen

# Supermemory（四个智能体共用一个容器）
/plugin install supermemory@supermemory-plugins

# Hindsight（一条命令覆盖 13 个智能体）
npx @vectorize-io/hindsight-coding-agents install all

# Mem0（前提：Mem0 Platform API key，云端必需）
claude plugin marketplace add mem0ai/mem0
claude plugin install mem0@mem0-plugins --scope user --config api_key="$MEM0_API_KEY"

# Cognee（本地默认，需自带 LLM key）
/plugin marketplace add topoteretes/cognee-integrations
/plugin install cognee-memory@cognee

# mcp-memory-service（自托管团队同步）
pip install mcp-memory-service
python3 codex/install_hooks.py
```

4. **装完先关掉不该外发的内容。** 原文给出的隐私开关：Glen 的 `glen off` 全停、`glen incognito` 保留召回但不记录、`glen silent` 记录但不注入；claude-mem 用 `--provider host` 或 `CLAUDE_MEM_ONLINE_OPTIN=false` 退出托管 observer，并用 `<private>` 标签屏蔽内容；Cognee 用 `COGNEE_CAPTURE=false` 关捕获，凭证和密钥文件从不捕获；Hindsight 有 `disabled`、`optInOnly` 配 `optInPaths`、`retainSessions: false`，以及可选的 Memory Defense 脱敏/阻断 45 种 secret 和 PII 模式；agentmemory 在存储前剥离 API key、secret 和 `<private>` 内容；Supermemory 会脱敏凭证形状的值，但 README 承认“不能检测所有 secret”。前提：先读各家隐私文档，确认默认是云还是本地。

5. **回填历史，让记忆从第一天就有内容。** 原文明确：`glen import` 回填旧本地会话；`mempalace mine` 导入已存在的 Claude Code transcript；deja-vu 直接索引磁盘上已有的 transcript；Hindsight 在首次提示前用 git 历史和过去会话建 per-repo bank。前提：确认这些历史里没有不该上传的敏感内容，必要时先脱敏或只导入指定目录。

6. **配团队共享（如果需要）。** 原文给出的路径：Glen 一个 org memory、召回时按 observation 做权限检查；claude-mem 的 TeamBrain 是 opt-in、每人选择分享什么；Mem0 分“共享项目池”和“个人记忆”，可用 `namespace` 覆盖成团队容器；mcp-memory-service 用自托管 HTTP 同步；Hindsight 用 `coding-agent::{gitProject}` 一个 bank 给所有智能体；MemPalace 有 docker-compose 团队服务器选项。前提：团队场景才需要，单人用共享记忆价值低（原文对 Glen 的缺点里明确写了这点）。

7. **不要只连 MCP 就以为在记录。** 原文对 Glen 明确写：只连 MCP server 不记录，记录需要插件 hooks；对 mcp-memory-service 写：Claude Code 和 Codex 有 hooks，其他智能体只能通过 MCP 工具连接。前提：装完要确认 hook 真的触发，而不是只看到工具列表。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作。** 原文把“跨会话记住做过什么决定、什么失败过、代码库长什么样”变成默认能力，不需要人每次重新交代。具体可交给它的工作包括：自动记录每轮工具使用并压缩成摘要（claude-mem 六个生命周期 hook）；把代码行追溯到写它的智能体对话（`glen code-search`）；回填旧会话（`glen import`、`mempalace mine`）；后台一个 Letta agent 读文件、搜网页、更新记忆并“whisper back”（Claude Subconscious）；在命令失败或改文件前召回旧会话（deja-vu）。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式。** 这是原文最强的一块。原文给出的匹配逻辑：单人 Claude Code、要自动本地捕获 → claude-mem，但要把 observer 切到本地；在 Claude Code/Codex/Cursor/OpenCode 四个智能体之间切换、要每个 prompt 都召回 → Supermemory；同一个 repo 上用很多编码智能体、想共用一个记忆库 → Hindsight；团队要一个跨所有人智能体的记忆 → Glen；完全不要 LLM、不要云 → deja-vu 或 projectmem；团队要自己控制的服务器 → mcp-memory-service；要图结构记忆 → Cognee；要时间知识图谱 → Zep。捕获方式的分层是原文排序标准第 3 条：每轮 hook 捕获并每 prompt 注入 > 只在会话开始注入 > 模型必须记得调用的存储。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈。** 原文明确需要的条件：Glen 要账号和 org；Mem0 要 Platform API key；Cognee 本地模式要 Python 3.10–3.14 和自带 LLM key；claude-mem 要 Node 20+、Bun、uv、SQLite、Chroma 和后台 worker；Hindsight 可自托管或本地 daemon；mcp-memory-service 要自己托管后端。权限方面：Glen 在召回时按 observation 做访问控制，agent 只拿到其用户本来就有权看的内容；各家提供 `<private>`、`COGNEE_CAPTURE=false`、`optInOnly`、`retainSessions:false`、`LETTA_MODE=off`、`LETTA_SDK_TOOLS` 只读/全开/关闭等开关。原文没有给出“怎样把人的反馈写回记忆”的流程，这是缺口。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成。** 原文有大量触发机制：SessionStart、UserPromptSubmit、PreToolUse、PostToolUse、Stop、SessionEnd 六类 hook；Mem0 每 5 轮对话由后台 worker flush 到平台；Claude Subconscious 在每次回复后异步把 transcript 发给后台 agent；Hindsight 在首次提示前建 bank 并跑 codebase survey，Stop 时写回 transcript；deja-vu 在会话开始、改文件前、执行命令前、命令失败时召回；Glen 在 SessionStart/UserPromptSubmit/Stop 调 CLI。这些是“状态/事件触发、持续完成”的直接依据。

**5. 效果验证：怎样判断确实改善了结果。** 原文只给了厂商自报数字：Glen 声称合并变更快 21%、每任务 token 少 29%；Hindsight 声称 Claude Code 每任务成本从 $0.445 降到 $0.338；MemPalace 声称 LongMemEval 96.6% R@5，但原文自己标注 disputed，并提到有 arXiv 论文和媒体报道质疑其口径（把检索召回率和其他系统的 QA 准确率并列）。原文还明确说这类基准是 vendor-reported、权重很低。因此，原文没有给出可照做的验证流程、基线定义或 A/B 方法，这一项只能自己补。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）**：清单中绝大多数插件都是 Claude Code 插件或 hook（Glen、claude-mem、Supermemory、Hindsight、agentmemory、Mem0、Cognee、Claude Subconscious、mcp-memory-service、deja-vu、MemPalace）。这是最直接相关的一条，可作为 Claude Code 记忆层的选型参考。
- **Cline（watch）**：原文第 24 条是 Cline Memory Bank（`memory-bank/` 六个 Markdown 文件、由你让 Cline 更新、通过 git 共享）；Hindsight 和 agentmemory 的支持列表里也出现 Cline CLI。
- **Cursor（watch）**：多个插件支持 Cursor；原文特别指出 Glen 在 Cursor 只有按需 `glen search`，没有每 prompt 注入；Supermemory 和 MemPalace 也覆盖 Cursor。
- **OpenCode（watch）**：claude-mem、Supermemory、Mem0、agentmemory 的支持列表都包含 OpenCode。
- **DeepSeek（try）**：DeepSeek Harness 出现在 claude-mem、Hindsight、agentmemory 的支持列表；DeepSeek 也作为 Mem0 插件覆盖的智能体出现。
- **Hermes（watch）**：Mem0 和 agentmemory 的支持列表包含 Hermes。
- **OpenClaw（watch）**：claude-mem、Mem0、agentmemory 的支持列表包含 OpenClaw。
- **GitHub Copilot（drop）**：原文提到 Copilot Memory 作为内置记忆被单独比较，Hindsight 和 agentmemory 支持 Copilot CLI；但清单状态是 drop，不必据此投入。
- **vectorize-io/hindsight（watch）**：原文第 4 条给出了安装命令、13 个智能体覆盖、`coding-agent::{gitProject}` bank、本地 daemon 和隐私开关，可作为升级评估的具体材料。
- **Context graph（watch）**：Zep 的 temporal knowledge graph、Cognee 的 graph + vector 与这一概念直接相关。
- **arXiv（try）**：原文引用 arXiv 论文质疑 MemPalace 的基准口径，属于“证据争议”的线索，不是方法论文。
- **Obsidian（drop）**：清单中没有相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**给出的数据/事实：** 24 条条目、七条排序标准、各家的安装命令、hook 列表、存储后端、许可、定价（Supermemory Free $0/$5 credits/1 seat、Pro $19/mo/3 seats、Max $100/mo、Scale $399/mo；Mem0 要 API key；Hindsight 云按用量、自托管 MIT 免费、codebase survey 默认 $2 上限）、星数统计时间 2026-11-03、monorepo 星数会夸大插件使用量（Supermemory 核心 31,522 星 vs 插件 2,798；Cognee 核心 33,043 vs 集成仓库 104）。

**只是作者主张：** “最好的”排名本身；Glen 第一是维护者自选；检索质量基准全部来自厂商；Glen 的 21%/29%、Hindsight 的 $0.445→$0.338、MemPalace 的 96.6% R@5 都没有独立复现，原文自己给 MemPalace 标了 disputed。

**局限：** 维护者与第一名存在利益冲突；原文抓取截断在第 11 条，第 12–24 条只有表格一行，无法判断这些条目的安装细节和隐私默认；没有用户案例、失败率、迁移成本数据；没有给出“装了之后怎么判断有没有变好”的方法；很多条目默认云，原文虽扣分但没有给出统一的合规评估。

**适用条件：** 团队共享记忆 vs 单人本地记忆是两个不同场景；是否接受 prompt 离开本机是硬约束；是否在多个智能体之间切换决定要不要选跨智能体方案；Claude Code 用户的选择面最大，其他智能体的插件成熟度明显更低（原文自己写 Cursor/Codex 插件“young”，35 和 58 星）。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（单人本地，优先零云）：** 在一台机器上装 agentmemory（keyless，本地 `localhost:3111`）或 deja-vu（`deja install --auto`，零 LLM 调用），只用一个 repo、一周时间。前提：先确认 transcript 里没有敏感内容，或先用 `<private>`/脱敏。

**最小试用（团队共享，小范围）：** 选 2–3 人，用 claude-mem 的 TeamBrain opt-in（每人选择分享什么），或自托管 mcp-memory-service；不要一上来全团队铺开。前提：明确谁能读什么，先跑隐私开关。

**基线记录（装之前先记一周）：** 同一 repo 上，统计跨会话重复解释同一决定的次数、每个任务的 token 消耗、从开工到第一个有效编辑的时间、因不知道旧决策而返工的次数。

**装后对比指标：** 跨会话重复解释次数是否下降；每任务 token 是否下降（注意原文的厂商数字不能当基线）；首个有效编辑时间是否缩短；召回内容被采纳 vs 被纠正的比例；是否出现不该上传的 prompt/secret（隐私审计，一次泄漏即否决）；团队场景再加“队友的 agent 是否读到了别人的决定、且没有越权”。

**判断改善：** 至少两项指标同向改善且没有隐私事件，才保留；如果只有“感觉记得更多”但重复解释次数没降，说明召回没有被用上，应换捕获方式（从“模型主动调用”换成“每 prompt 注入”的 hook）或换插件。原文没有给出这套验证流程，这是需要自己补的部分。
