# Ar9av/obsidian-wiki

- 结论：**值得一试**。可以直接照 README 的安装和斜杠命令小范围试一遍：把常用工作目录设成 vault、跑 ingest/query/lint 三步，验证跨会话记忆和结构性提问是否真的省时；但作者自评项目「early」，效果数据只有 n=2 的小样本，先试再谈全面采用。
- 原文：https://github.com/Ar9av/obsidian-wiki
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-03T07:25:53.420Z

## 是什么

obsidian-wiki 是一个把「AI 智能体的长期记忆」落在纯 Markdown 文件夹（Obsidian vault）里的工具。核心思路来自 Karpathy 的 LLM Wiki 设想：知识编译一次并持续更新，而不是每次重新问 LLM 或重跑 RAG。

具体形态是：

- 一组 Markdown「skill」文件（README 称共 39 个），Claude Code、Codex、Cursor、Windsurf、Gemini CLI 等智能体读取后以斜杠命令方式执行；
- 一个可选的 Python CLI（`obsidian-wiki`）；
- 可选的两个 session hook：会话开始时注入回顾（你是谁、有哪些未完成的线索），结束时提醒捕获可复用内容。

原文强调的三个特性：知识是「编译」而非「堆积」（新知识合并进已有页面、标出矛盾、不重复）；用 manifest 记录已摄入来源，第二次只处理增量；每条主张被打标为 extracted / inferred / ambiguous，lint 会把滑向猜测的页面标出来。知识以纯 Markdown 存盘，可读、可 grep、可 diff，无需 API key、向量库或联网。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：本机有 Python 环境（或使用 Claude Code 插件路线则不需要 Python）。

1. 安装并初始化 vault。`~/brain` 换成你想放知识的文件夹。

```bash
pip install obsidian-wiki
obsidian-wiki setup --vault ~/brain
```

用 uv 或 pipx 时等价命令（注意原文明确说不要用 `uvx`）：

```bash
uv tool install obsidian-wiki
pipx install obsidian-wiki
```

2. 如果不想装 session hook，加 `--no-hooks`。默认 setup 会注册两个 session hook（会话开始注入、会话结束捕获）。

3. 在智能体里打开任意项目，说一句：

```text
set up my wiki
```

4. 不想碰终端时，直接把这一行交给智能体，让它自己完成整套配置：

```text
https://github.com/Ar9av/obsidian-wiki — set up my wiki
```

5. 如果用 Claude Code，可以改走插件路线（不需要 Python，但插件只带 skills，不带 session hook 和 `obsidian-wiki` CLI）：

```text
/plugin marketplace add Ar9av/obsidian-wiki
/plugin install obsidian-wiki@obsidian-wiki
```

插件内的 skill 带命名空间，例如 `/obsidian-wiki:wiki-ingest`。

6. 喂数据。原文说「任何文本形态的东西」都可以：文档、PDF、聊天导出、会议转录、截图、URL。

```text
/wiki-ingest ~/research
/wiki-update                        # distill the repo you're standing in (code-graph aware)
/wiki-capture                       # save this conversation
/wiki-history-ingest claude         # mine everything you've ever asked Claude
```

7. 提问。原文称回答会带 `[[wikilink]]` 引用而不是「感觉」。

```text
/wiki-query what do I know about rate limiting?
/wiki-narrate MCP security          # a cited briefing on a topic
/wiki-digest week                   # what did I learn this week?
```

8. 找回叫不出名字的历史会话（用 CLI，不是斜杠命令）：

```bash
obsidian-wiki sessions-build
obsidian-wiki sessions-query "the auth bug with the weird retry loop"
```

9. 定期清洗 vault：

```text
/wiki-lint            # broken links, orphans, contradictions
/wiki-dedup           # "RSC" and "React Server Components" are one page now
/cross-linker         # weave new pages into the graph
/wiki-status          # what's ingested, what's pending, where the hubs are
```

10. 在 Obsidian 里查看图谱：打开 vault，Cmd/Ctrl+P → "Open graph view"；对智能体说 "color my graph" 会按 tag、category 或 visibility 给节点上色。想先看效果，可克隆仓库后用 Obsidian 的 *Open folder as vault* 打开 `examples/demo-vault/`（原文称是 18 页关于构建可靠 LLM 智能体的示例 vault）。图谱还可导出为 `graph.json`、GraphML（Gephi/yEd）、Neo4j Cypher、Postgres SQL 或自包含的 `graph.html`。

11. 想从代码里用（无 API key、无 embedding、无向量库、无网络）：

```python
from obsidian_wiki import Memory

memory = Memory("~/brain")
memory.remember("stack", "Python, FastAPI", confidence=0.9)
memory.add("Postgres was chosen over MySQL for partial indexes.")
memory.search("postgres")
memory.recap()                       # inject at session start
```

原作者补充：`user_id` 可把记忆按人隔离，而知识仍然共享。

12. 并发写入的注意事项：`index.md`、`log.md`、`hot.md` 以及 `_meta/` 下的 owner profile 与 todo index 都走同一个加锁、原子写入的 writer，原文称因此并行的多个智能体不会互相丢更新。若你要多智能体同时写，这是需要保留的设计前提。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
- 挖掘历史会话：`/wiki-history-ingest claude`（原文列出的来源还包括 Codex、Copilot、Hermes、OpenClaw、Pi），以及 `sessions-build` + `sessions-query` 用自然语言找回「那个重试逻辑很怪的 auth bug」——这类「想不起会话名但想找回结论」的检索，通常不会交给 AI。
- 结构性提问：原文指出「X 和 Y 怎么连起来」「哪些页面撑起了我的 vault」「删掉这页会坏什么」是普通智能体最不擅长的题。
- `/wiki-digest week`（我这周学到了什么）、`/wiki-narrate <主题>`（带引用的简报）属于生成型能力。

**2. 任务匹配**
- 适合的场景特征：知识以纯文本呈现、需要跨会话复用、需要引用可追溯、vault 会随规模增长。原文声称「查询成本随规模基本不变」——因为先读标题、标签、摘要，再读正文，20 页和 2000 页成本大致相同。
- 匹配的协作方式：skill 是可被多种智能体读取的 Markdown，一个 `.skills/` 目录 symlink 到各智能体；不需要运行时、不需要 API key、不绑定厂商。
- 明确不适合交给普通 agent 硬做的：结构性/图关系类问题（见证据部分的对照组数据）。

**3. 条件供给**
- 需要一个可写的文件夹作为 vault（`--vault ~/brain`）、以及写入权限。
- 需要注册 session hook（默认开启，可 `--no-hooks` 关掉）才能拿到「会话开始注入回顾、结束捕获」的效果。
- 需要 manifest 记录已摄入来源，才能做增量处理（第二次只跑 delta）。
- 不需要：API key、embedding 模型、向量库、网络。
- 输入源需要提供：docs、PDF、聊天导出、会议转录、截图、URL 等文本形态材料。

**4. 主动推进**
- 事件触发：session 生命周期钩子——会话开始注入 vault 记忆（你是谁、哪些线索未闭合、最近改了什么），会话结束前提示捕获可复用内容；这就是「上下文关闭前自动收割」的机制。
- 状态触发：manifest 驱动的增量摄入；`/wiki-status` 报告什么已摄入、什么待处理、hub 在哪；`/wiki-lint`、`/wiki-dedup`、`/cross-linker` 属于周期性维护动作。
- 原文给出了一个具体失败模式的反面理由：周二解决的问题，三个月后在另一个 repo 里从零再解一遍——因为答案躺在找不到的聊天记录里。
- 局限：原文只描述了 hook 触发和维护命令，没有给出按时间/状态自动调度（如 cron、定时任务）的配置，这部分不能照搬。

**5. 效果验证**
- 原文给出了一组对照测量与具体指标（见下一节），可作为验证方案的模板：回答耗时、正确率、工具调用次数、API 成本，逐题对比。
- 验证前提写得比较清楚：同一模型、同一 vault、同一批问题，唯一变量是有没有装 obsidian-wiki；ground truth 用 networkx 而非本项目自己的代码（betweenness 每个节点吻合到 3.5e-18，630 组最短路全部一致）。

## 与已有做法的关系

清单中的相关条目及状态：Claude Code（adopt）、Cursor（watch）、Hermes（watch）、Obsidian（drop）、OpenClaw（watch）。

- **Claude Code（adopt）**：obsidian-wiki 提供专用插件安装路径，插件 skill 走命名空间（`/obsidian-wiki:wiki-ingest`），但插件不带 session hook 和 CLI；要 hook 就得走 pip 安装。这是与现有 adopt 条目直接集成的一条线。
- **Obsidian（drop）**：这里的关系需要说清楚——Obsidian 在本项目中只是「查看器和 Markdown 格式载体」，vault 本质是磁盘上的纯 Markdown 文件夹，可以 grep、可以推私有 repo、可以直接删。也就是说，即便不引入 Obsidian 这个工具，只要接受 Markdown 目录形态，obsidian-wiki 的 ingest/query/lint 链路仍然成立。这可能是原有 drop 判断需要重新审视的点。
- **Cursor / Hermes / OpenClaw（均 watch）**：原文把 Cursor 列入支持矩阵，把 Hermes、OpenClaw 列入可挖掘的历史会话来源（与 Claude、Codex、Copilot、Pi 并列）。这三条目前都只是 README 里的一句话，没有配置细节，可先按 watch 对待。
- 此外 README 还提到 Windsurf、Gemini CLI 等「十几个」智能体，以及与 desktop LLM-wiki 应用、MCP memory server、单 skill LLM wiki 的对比表（知识存放位置、兼容范围、安装内容、能否挖掘历史会话、是否有自清洗机制）。

## 证据与局限

**原文给出的数据/案例：**

| 指标 | 普通智能体 | 装了 obsidian-wiki |
|---|---|---|
| 回答耗时 | 81s | 19s（快 4.4×） |
| 正确率 | 44% | 83% |
| 工具调用次数 | 9.9 | 4.6 |
| API 成本 | $0.202 | $0.208（基本不变） |

逐题数据："How is X connected to Y?" 122s → 18s；"What topic clusters do I have?" 117s → 21s；"Which pages hold my vault together?" 61s → 12s；"What breaks if I delete X?" 26s → 24s（这一题几乎无改善）。

失败机制也写得很具体：普通智能体追踪连接关系时会走 `index.md`——它链接到每一页，于是「找到」一条毫无意义的短路径，并据此把 `index` 列为 vault 最重要的页面之一；两次运行都犯同一个错。skill 查询的图排除了这类记账文件，所以正确答案才可达。

**方法细节：**Claude Sonnet，headless，真实 38 页 vault；问题用自然语言、不提供图定义；普通智能体有 `Read`/`Grep`/`Glob`/`Bash`，它甚至自己实现了中心性算法；4 问 × 2 条件 × 2 次重复，串行运行避免抢 CPU；基准真值来自 networkx。数据在 PR #175。

**局限（原文自己承认的）：**
- 小样本：每个 cell n=2，只在单一 38 页 vault 上做，精确百分比只能当参考。
- 耗时差距（3–6×）远大于运行间波动，相对可信；正确率数字样本更少，更弱。
- "with" 组有一次运行完全失败：模型忽略 CLI、手动 grep，结果答错。
- 项目自述「This is early」，作者仍在征集更好的交叉引用、去重、更大 vault、新摄入源。
- 原文中「查询成本随规模不变」「20 页或 2000 页成本大致相同」「第二次只处理 delta」等说法，README 未附测量数据（缩放测量被指向 PR #175，但本文档中未给出数字）。
- 本报告只依据 README 本身，文档目录下的 installation / skills / memory / architecture / python-api 等页面均未抓取；因此「39 个 skill」的完整清单、多 vault 配置、QMD 语义搜索、GitHub 同步等细节无法核实。

**适用条件：**知识以文本形态存在、你愿意长期维护一个 Markdown 知识目录、且主要用对话式智能体（Claude Code / Codex / Cursor / Gemini CLI 等）工作。若你的知识主要是二进制、结构化数据库或强时效的实时数据，本文档没有覆盖。

## 怎么试、怎么验证

**最小试用（建议 1–2 小时）：**
1. 选一个真实但小的 vault 目录（例如某一项目的 20–40 页笔记/文档），`pip install obsidian-wiki && obsidian-wiki setup --vault <该目录>`，保留默认 hook。
2. `/wiki-ingest` 一个你熟悉的资料文件夹，然后跑 `/wiki-status` 看摄入结果是否符合预期。
3. 记录 4 个你自己关心的结构性问题的答案（「A 和 B 怎么关联」「主题聚类有哪些」「哪些页面是枢纽」「删掉 X 会坏什么」）。
4. 对照组：在同目录用同一个智能体、不开 obsidian-wiki（或用纯 Read/Grep/Glob），问同样的 4 个问题。
5. 再跑第二遍 ingest，验证 manifest 增量是否真的只处理新增文件；跑 `/wiki-lint`、`/wiki-dedup` 看它们能否发现你已知的重复/坏链。
6. 想验证跨会话记忆：关掉会话，新开一个，检查是否自动带入了 owner profile 和未闭合线索；隔几天在另一个项目里再问一次同类问题，看是否复用已有页面而不是从零推理。

**判断有没有改善的指标（照搬原文的测量口径）：**
- 每题回答耗时（wall-clock），重点看结构性问题的相对差距；
- 正确率——但必须用外部真值判定，例如用 networkx 算出的中心性/最短路，不要用工具自己的输出当真值；
- 工具调用次数（原文 9.9 → 4.6 是明显的方向性指标）；
- API 成本是否基本持平（原文认为不增加）；
- 增量摄入是否真的省掉了重复处理；
- 反面指标：是否出现「忽略 CLI、退回手动 grep」的失败模式（原文中确有一次）——如果经常发生，说明 hook/skill 没被智能体正确识别。

**淘汰条件建议：**如果结构性问题的正确率没有提升、或智能体频繁绕过 skill，就不要铺开到生产 vault，退回到 study 观察后续版本。

**注意：**以上试用方式中的安装命令、斜杠命令、Python 调用均直接来自原文；而「用 networkx 做真值」「第二遍 ingest 验证增量」是照着原文的方法描述设计的试用流程，不是原文给出的操作步骤。
