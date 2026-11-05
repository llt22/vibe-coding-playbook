# Glen-Web-App/best-agent-memory-mcp

- 结论：**值得一试**。先按清单给出的七条判据（尤其是“自动捕获还是等模型调用写工具”“记忆能否以文件形式读取和版本化”）为编码智能体选一个记忆 MCP，装完连接后务必再安装 hooks，否则只有检索没有记录；理由是该文把 25 个方案在存储形态、捕获模型、团队共享、许可和部署成本上摊在同一张表里，并给出可直接复制的安装命令和若干踩坑提示，足以支撑一次小范围试用，但清单由 Glen 团队维护、Glen 排第一，且效果数字多为厂商自报，不能当作验收依据。
- 原文：https://github.com/Glen-Web-App/best-agent-memory-mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-05T13:02:58.992Z

## 是什么

一份由 Glen 团队维护的横向对比清单，把 25 个“给 AI 智能体做长期记忆”的 MCP 服务器放在同一张表里比较，字段包括：托管还是自托管、记忆以什么形式存储（云分片、Postgres+pgvector、SQLite+FTS5、Markdown 文件、JSONL 知识图谱等）、捕获模型（hooks 自动捕获 / 等模型主动调用写工具）、是否支持团队共享、许可证、star 数。清单前 11 名各有一段条目，含端点地址、认证方式、工具名、定价、优缺点和“最适合谁”；第 12 名以后只有表格摘要（原文在 Engram 处被截断）。

它本身不是“怎么用记忆把活干好”的教程，而是一份**选型决策材料 + 安装入口集合**，正对项目里“条件供给”（给智能体喂什么上下文、开什么权限）和“任务匹配”（什么场景配什么工具）两个问题。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**步骤 0：先确认你的客户端有没有 hooks 能力。**
前提：你用的是 Claude Code / Codex / Cursor 等 MCP 客户端。原文反复强调一个结构性事实：**很多方案的 MCP 连接只负责“检索”，不负责“记录”**——Glen 的 MCP 连接“search only”，要记录得装插件钩子；claude-mem 的 MCP 侧只有四个搜索工具，捕获全靠六个生命周期钩子；Supermemory 也要另装 `claude-supermemory` / `opencode-supermemory` 插件才有自动捕获。所以选型前先问：这个客户端能不能挂 hook。

**步骤 1：用清单的七条判据给自己的场景打分。**
原文的排序判据（可直接抄成评估表）：
1. 是否维护中（近 6 个月有 commit 或 release，归档/停更项目不进榜）。
2. 是否真的提供“记忆”MCP（通用向量库、代码索引、把记忆当附带小功能的编码工具不算）。
3. 捕获模型：hooks / 后台抽取的自动捕获 > 只在模型决定调用写工具时才保存。
4. 检索质量的证据：发表的基准算数，但要注意几乎每个 LoCoMo / LongMemEval 数字都是自报、用的模型和 judge 各不相同，权重低于可复现的评测脚本；有争议的结果要标注。
5. 配置成本：一个 URL 或一条命令 > 需要图数据库 + LLM key + clone 整个 monorepo。
6. 团队共享：有文档化的跨人共享且带访问控制 > 单机文件。
7. 许可与定价透明度：有公开许可证和公开价目表 > “联系销售”或无 license 文件。
（原文另提醒：star 数是弱信号，monorepo 的 star 会高估单个 server 的使用度，个别新仓库涨星速度异常。）

**步骤 2：按场景初选（原文“Short answer”一节的结论）。**
- 团队共享、每个同事的智能体互相 recall → Glen。
- 个人托管记忆 + 免费额度 → Mem0。
- 自托管 + 混合检索 → Hindsight。
- 记忆能当文件读、改、进 git → Basic Memory。
- 零依赖基线 → 官方 memory server。
- 本地自动捕获（Claude Code 场景）→ claude-mem / agentmemory / mcp-memory-service。

**步骤 3：按原文给的命令安装（原样照抄，均为原文所给）。**

前提：Glen 方案需要先有账号和 org。
```text
https://mcp.tryglen.com/mcp
```
```bash
npx @tryglen/cli@latest install
```

Mem0（前提：走客户端浏览器登录流程，或把 API key 当 bearer token）：
```bash
npx mcp-add --name mem0-mcp --type http --url "https://mcp.mem0.ai/mcp" --clients <client>
```

Supermemory（前提：连接时选择允许访问的 space，事后可在控制台 Agents 页吊销）：
```text
https://mcp.supermemory.ai/mcp
```

Zep（前提：企业向认证，默认 Google Workspace 登录，企业版可接 Entra ID / Okta）：
```text
https://api.getzep.com/mcp
```

Hindsight（前提：自托管版本已跑起来，且已建好 bank；MCP 默认开在 `/mcp`，每个 bank 一个端点，需要 LLM key）：
```bash
claude mcp add --transport http hindsight http://localhost:8888/mcp/<bank_id>/
```

mcp-memory-service（前提：本机 Python 环境；推荐 Hybrid 模式，本地读 + 后台云同步；Codex 用户要另跑 hooks 安装脚本）：
```bash
pip install mcp-memory-service
```
```bash
python3 codex/install_hooks.py
```

Basic Memory（前提：用 `uv`；**必须带 `--prerelease=allow`**，原文说否则会静默装到旧版本）：
```bash
uv tool install basic-memory --prerelease=allow
```

claude-mem（前提：想清楚推理跑在哪；原文说安装器会引导登录并默认起一个 30 天试用的托管 observer，试用到期后压缩会回落到你的 Anthropic 套餐，除非订阅；用 `--provider host` 可让推理留在本地）：
```bash
npx claude-mem install
```

agentmemory（前提：Node 20+，无需 key，keyless 模式用 BM25，API 在 `localhost:3111`、viewer 在 `:3113`，均绑回环地址）：
```bash
npx -y @agentmemory/agentmemory@latest
```

Cognee MCP（前提：需要 `LLM_API_KEY`；原文明确 Claude Code 不提供 MCP sampling，所以借不到宿主模型）：
```bash
docker run -e TRANSPORT_MODE=http --env-file ./.env -p 8000:8000 cognee/cognee-mcp:main
claude mcp add cognee -t http http://localhost:8000/mcp
```

**步骤 4：分开验证“能查”和“会记”两条通路。**
装完连接后先做一次检索测试，再做一次“关掉会话重开”的记录测试；如果重开后检索不到刚才的内容，说明只通了检索侧，hook 没装上。原文点名的典型错误：`npm install -g claude-mem` 只装 SDK、**不注册任何钩子**。

**步骤 5：先设隐私与写入边界，再放真实工作内容。**
原文给出的可操作开关：Glen 的 `glen off`、`glen incognito`（能召回但不记录）、`glen silent`（记录但不注入），以及 macOS 菜单栏录制指示器；claude-mem 用 `<private>` 标签把内容排除在存储之外；Zep 管理员可把连接设为只读，并有账号级写入总开关。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现** — 依据较弱，但有几条线索：Glen 的 `glen code-search` 能把代码行追溯到写出它的智能体会话、`glen review` 跑本地 PR 评审，还有“新决策与旧决策冲突时旧的不再被召回”的矛盾检测；这些是把“记忆”从“存聊天记录”扩到“可审计的来源追溯与决策治理”的例子。其余条目基本只讲存储与检索，不涉及新工作类型。

**2. 任务匹配** — 依据充分。原文的核心匹配维度是三组：**(a) 谁用**（单人 vs 团队，团队共享从 Supermemory 的 $19/3 座、Zep 的 $125/5 座起，Glen 按 org 授权）；**(b) 记忆要多“自动”**（显式工具调用 vs hooks 自动捕获，原文把自动捕获排在显式调用之上）；**(c) 记忆要多“可读”**（Markdown 文件 / JSONL 图谱可 diff 进 git vs 云上分片不可见）。此外还给了部署形态的权重：需要图数据库 + LLM key + 克隆 monorepo 的方案在“配置成本”上失分。

**3. 条件供给** — 这是本文最有价值的一条。它把“要给智能体提供什么”具体化为四样东西：**跨会话的事实/决策/历史对话**（记忆本体）、**写入通路**（hook 或工具调用）、**权限**（Glen 按每条 observation 在召回时校验；Zep 的 OAuth 2.1 + PKCE、ABAC、只读连接；Cognee 默认开 `ENABLE_BACKEND_ACCESS_CONTROL` 按用户隔离 dataset；Graphiti 的 group ID “无认证”被列为弱点）、**反馈回路**（会话开始注入、会话结束归档、pre-compaction 检查点——Basic Memory 的 Claude Code 插件就提供 session-start briefing 和 compaction 前检查点）。

**4. 主动推进** — 依据明确。claude-mem 的六个生命周期钩子（SessionStart、UserPromptSubmit、PreToolUse、PostToolUse、Stop、SessionEnd）就是“由事件触发、不需要模型主动发起”的范式；agentmemory 有 12 个自动钩子并支持离线回放；Hindsight 用 `@vectorize-io/hindsight-coding-agents` 从 git 历史和过往会话自动摄入；deja-vu 直接对磁盘上已有的 transcript 自动建索引。原文同时给出反面：只靠模型自己决定调用写工具的方案（Mem0、Cognee、Qdrant、官方 memory server 等），推进的可靠性取决于模型是否想起来。

**5. 效果验证** — 有方法论警示，但没给验证流程。原文第 4 条判据直接说：几乎所有 LoCoMo / LongMemEval 数字都是自报，不同厂商用的模型栈和 judge 不同，因此不可横向比较，权重应低于可复现的 harness；并给出一个具体争议案例（Zep 自报 LoCoMo 94.7%，ByteRover 复跑得到 75.1%）。Glen 自己也标注了“21% faster to a merged change、29% fewer tokens per task（self-reported）”。这套“自报降权、争议标注”的规则可以直接搬进项目的证据分级。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：本文几乎所有自动捕获方案都是围绕 Claude Code 的 hook 体系描述的（claude-mem、mcp-memory-service、Basic Memory 插件、agentmemory、Glen 插件）。可视为对已采纳工具的“上下文供给层”补件。
- **vectorize-io/hindsight（watch）**：本文第 5 名，给了 MIT 许可、Docker/pip/Helm/嵌入式四种自托管方式、`claude mcp add --transport http` 的接入命令、混合检索的具体做法（语义 + BM25 + 图 + 时序四路并行，RRF 融合，cross-encoder 重排）和一条已知短板（MCP 认证默认关闭）。这些足以把它从 watch 推进到可评估状态。
- **Cursor（watch）、OpenCode（watch）、goose（watch）、DeepSeek Harness（watch）、OpenClaw（watch）**：均只作为“文档支持哪些客户端”出现，没有任何实操细节，不足以改变其状态。
- **Context graph（watch）**：与 Zep / Graphiti 的 temporal knowledge graph、Glen 的 shards + observations 模型相关；原文提供了“时序图 + 按组授权”的具体产品形态，可作为该概念落地形态的样本。
- **arXiv（try）**：Hindsight 条目提到 arXiv 2512.12818 论文，并声称 Virginia Tech Sanghani Center 与 The Washington Post 复现过结果——这是一个可追的证据来源，但原文未给出论文内容细节。
- **Obsidian（drop）**：Basic Memory 条目提到适合 Obsidian 用户，但本文没有给出 Obsidian 侧的任何配置步骤，不构成回接理由。
- **Cline**：清单中未出现。

## 证据与局限

**原文给出的可核查事实**：25 个条目的存储形态、捕获模型、团队共享、许可证；各家的端点 URL、认证方式、工具名与数量；公开价目（Mem0 免费档 10,000 adds / 1,000 retrievals 首 30 天，之后 50,000 adds / 10,000 retrievals 需自带 LLM key；Supermemory Free/Pro $19/Max $100/Scale $399；Zep 试用 10,000 credits，Flex $125/5 座；Basic Memory Cloud $15 测试价、常规 $19）；若干版本与日期（Hindsight v1.2.0 于 2026-11-03，mcp-memory-service v12.5.0 于 2026-11-03，Basic Memory v1.0.0 于 2026-10-29，Mem0 自托管 OpenMemory 于 2026-07-29 从 monorepo 移除）；若干已知问题（claude-mem 125 个 open issue、agentmemory 528 个 open issue）。

**只是作者主张或单一来源的**：全部效果数字。Glen 的“快 21%、省 29% token”是自家页面自报；Mem0 的 LoCoMo 92.5% / LongMemEval 94.4% 自报，且原文自己承认各厂商模型栈与 judge 不同；Zep 的 94.7% 有第三方复跑 75.1% 的反例；Supermemory 的 81.6%/85.2% 来自竞争对手 Hindsight 的表格；Hindsight 的 LongMemEval 89.0% 自报（另称有外部复现与论文，未在本文展开）；agentmemory 的“#1 based on real-world benchmarks”原文明确说无法核实。

**结构性偏差**：清单由 Glen 团队维护，Glen 排第一，且明说是“maintainer's pick”；第 2–25 名才按公开判据排序。选型时应对第 1 名额外打折。

**覆盖局限**：原文在条目 11（Engram）处被截断，第 12–25 名只有表格一行摘要，没有安装方式与优缺点；因此“哪些方案最适合你的客户端”只能对前 11 名做判断。另外清单更新于 2026 年 11 月初，价格和端点变动快（Supermemory MCP v1 已废弃、Mem0 自托管代码已删），照抄命令前需回原项目确认。

**适用条件**：主要面向有 MCP 客户端的编码场景（Claude Code / Codex / Cursor）；不适合无 hook 能力的纯聊天客户端（那类只能拿到“检索”，拿不到“自动记录”）；团队共享方案都要求账号/组织与付费档位。

## 怎么试、怎么验证

**最小试用（建议 2–4 周，单仓库、单场景）**
1. 选一个“反复交代背景”的编码任务（例如同一服务里连续做 5 个相关改动），固定同一个人、同一个模型。
2. 基线周：不装任何记忆 MCP，记录指标。
3. 试验周：按步骤 2 选**一个**方案接入。为降低变量，建议第一轮先选可读、低依赖的（Basic Memory 或官方 memory server），确认“记忆能被看懂、能删对”之后，第二轮再换成 hooks 自动捕获型（claude-mem 用 `--provider host`，或 mcp-memory-service）对比“自动 vs 显式”的差别。
4. 每次会话结束做一次记录检查：新会话重开，问三个问题——上个会话定了什么、为什么这么定、哪些被否决了。

**判断有没有改善的指标（都能人工记，不依赖厂商数据）**
- **重复交代成本**：每次会话为恢复上下文打的前置字数 / 轮数（应下降）。
- **重复犯错率**：同一类错误（同一处 API 误用、同一个被否决的方案又被提出）在 N 次会话中出现的次数（应下降）。
- **token 消耗与到合并耗时**：注意 Glen 自报的“-29% token / -21% 时间”只能当假设，不能当基准。
- **记忆精确率**：每周人工抽查 10 条被写入的记忆，判“准确 / 过期 / 错误”（过期和错误合计超过约两成就该收紧写入规则或加矛盾检测）。
- **召回命中率**：检索回来的记忆里，被智能体真正用在输出里的比例。
- **越权与污染**：团队共享方案必须用两个不同权限的账号各跑一次召回，确认没拿到不该看的内容；同时确认旧决策被推翻后不再被召回。

**否决条件**：如果出现“记忆越多回答越差”（过期决策被反复召回、上下文被无关记忆挤占），先回退到手动写入 + 定期清理，再考虑换方案；如果重开会话后检索不到任何上一轮内容，先查 hook 是否真的注册（步骤 4），不要急着判定方案不行。
