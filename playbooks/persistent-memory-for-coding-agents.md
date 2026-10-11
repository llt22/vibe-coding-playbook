# 让新会话先核对事实再接手工作

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 每次开新会话都会把上次笔记当作事实继续施工，这篇手册解决如何把长期信息落盘，并在接手前用 git 与机器状态核对主张与事实。
> 先试这一步：先 clone truongfelix/workflow，跑通 ground-truth.sh 到 `GROUND TRUTH: complete`，下一次会话用 /session-start 开始。
> 最近修订：2026-10-11

## 解决什么问题

AI 每次开新会话都要重新交代背景，跨会话的资料和结论无法沉淀；更糟的是，上次的笔记、handoff 或 memory 只是“主张”，如果直接当作事实继续施工，会把已失败的后台任务、未推送的分支、已完成的待办带进新会话。这套做法分四层：先让长期信息在本地 Markdown 文件夹落盘（做法 A/B/C），再用 truongfelix/workflow 在两个会话边界跑同一个事实采集脚本，报告主张与 git/GitHub/本机事实的不一致，然后才决定当天做什么（做法 D）。

## 适用与不适用

适用：
- 已在用 Claude Code 或其他读取 Markdown 的 agent 做真实工作，但每次都要重复交代背景。
- 希望把确认过的长期有效信息落到本地文件，而不是留在单次会话。
- 需要让 AI 读取 Gmail、日历、云端硬盘时，可走做法 B。
- 想把散落材料变成可提问、带引用、可清洗的库，或找回“叫不出名字的历史会话结论”，走做法 C。
- 长期项目有多个会话、跨天跨机器，上一次笔记可能失真；或有多仓库工作区，需要每次先核对 git/机器事实，走做法 D。

不适用：
- 还没有安装 Claude Code 或任何可读 Markdown 的 agent，或没有本地文件系统写权限。
- 不能接受把 Gmail、日历、云端硬盘的读取权限交给本地工具，或工作内容高度敏感且没有隔离账号可用。
- 期待原文给出逐字可抄的命令、配置和规则全文：second-brain 原文第 4 步截断；做法 D 本次材料只到 README，脚本实现与效果未经验证。
- 想用做法 C 全面替换现有做法：作者自评项目“early”，效果数据只有 n=2 的小样本。
- 想用做法 D 完全替代人工判断：它只推荐，每天做什么、每次 push/PR/merge 是否批准，由你决定。

## 前置条件

- 做法 A：本机已安装并能运行 Claude Code；对目标目录有读写权限。
- 做法 B：在 A 基础上，另需一个 Google 账号，并准备把 Gmail、日历、云端硬盘读取权限交给本地工具。原文没有 GWS CLI 安装命令、包名来源或授权流程，必须先自行查证官方文档。
- 做法 C：本机有 Python 环境（pip / uv / pipx 任一路线）；若走 Claude Code 插件路线则不需要 Python。不需要 API key、embedding 模型、向量库或联网。
- 做法 D：需要 bash 和 git。可选：GitHub CLI `gh`（读开着的 PR 和 CI）、systemd（后台任务，仅 Linux）。支持 Linux、macOS 和 Windows（在 Git Bash 或 WSL 里跑，CI 三种都测）。开始前先读 `PRINCIPLES.md`。适用形态：单仓库，或一个装着多个 repo 的工作区文件夹，根目录自身是一个只放文档的 repo；工作区形态的 remote 必须是 PRIVATE。
- 涉及隐私与凭据安全：先用非敏感账号或受限范围试，不要一上来就接真实收件箱。

## 操作步骤

先选路线，四条路线可以叠加：
- 只需要跨会话记住项目背景，先做做法 A（最轻，一条手写规则 + 一个 memory 目录）。
- 还需要 AI 读取 Gmail、日历、云端硬盘，在 A 之上做做法 B。原文缺安装与授权细节，必须先查证再操作。
- 想把材料变成可摄入、可提问、可引用、可清洗的库，或想找回想不起名字的历史会话，做做法 C。C 可以独立于 A，也可以直接建在 A 的 second-brain 目录上。
- 如果新会话经常把上次笔记当事实、需要跨天跨机器接续长期项目，做做法 D。D 可以叠加在 A/B/C 上：A 的 memory 和 C 的 vault 都只是“主张”来源，D 负责在会话边界拿 git/机器事实核对。

### 做法 A：只搭本地记忆骨架

1. 创建 `second-brain` 文件夹。前提：本地文件系统写权限。预期：得到一个与日常项目隔离的工作根目录。原文未指定路径，可自选。

2. 在 `second-brain` 下创建 `memory` 子文件夹。预期：长期信息有固定落点。

3. 在 `second-brain` 下创建 `CLAUDE.md`，写入一条记忆规则。原文第 4 步截断，规则全文未知；调研报告建议写法如下（这是报告建议，不是原文）：

```text
把每次会话中确认的长期有效信息追加到 memory 下的文件中；开始新任务前先读取 memory。
```

前提：自己确认规则目标位置和措辞。预期：Claude Code 在该目录下工作时按规则读取和追加长期信息。

4. 连续在同一个 `second-brain` 目录下开 Claude Code 做真实工作。前提：先只放少量非敏感材料。预期：积累出可观察的记忆文件。

### 做法 B：在 A 基础上接入 Google 数据源

5. 在 `second-brain` 文件夹中打开 Claude Code，安装 `GWS CLI`，以访问 Gmail、日历和云端硬盘。前提：本机已能运行 Claude Code，且有一个 Google 账号。关键限制：原文只说“安装 GWS CLI”，没有安装命令、包名来源或授权流程；必须先自行查证文档后再执行。

6. 先只开一项权限跑通，例如日历只读。前提：确认该项权限是你愿意交出的最小范围。预期：验证链路可用且不暴露全部数据。

7. 确认没有越权读取、没有把敏感内容写进记忆文件后，再逐步扩大权限。前提：每次扩大权限后都检查记忆文件与读取记录。预期：权限范围随实际需要增长。

### 做法 C：用 obsidian-wiki 把 Markdown 目录变成可摄入、可提问、可清洗的知识库

核心形态：一组 Markdown“skill”文件（README 称共 39 个），Claude Code、Codex、Cursor、Windsurf、Gemini CLI 等智能体读取后以斜杠命令方式执行；外加一个可选的 Python CLI（`obsidian-wiki`）和两个可选 session hook（会话开始注入回顾，会话结束提醒捕获）。知识以纯 Markdown 存盘，可读、可 grep、可 diff。

8. 安装并初始化 vault。把 `~/brain` 换成你想放知识的文件夹。

```bash
pip install obsidian-wiki
obsidian-wiki setup --vault ~/brain
```

用 uv 或 pipx 时等价命令（原文明确说不要用 `uvx`）：

```bash
uv tool install obsidian-wiki
pipx install obsidian-wiki
```

前提：本机有 Python 环境。预期：vault 目录建立，默认注册两个 session hook。

9. 如果不想装 session hook，在 setup 时加 `--no-hooks`。预期：关掉 hook 后，记忆的注入与捕获需要手动触发。

10. 在智能体里打开任意项目，说一句：

```text
set up my wiki
```

不想碰终端时，直接把这一行交给智能体：

```text
https://github.com/Ar9av/obsidian-wiki — set up my wiki
```

11. 如果用 Claude Code，可以改走插件路线（不需要 Python，但插件只带 skills，不带 session hook 和 `obsidian-wiki` CLI）：

```text
/plugin marketplace add Ar9av/obsidian-wiki
/plugin install obsidian-wiki@obsidian-wiki
```

插件内的 skill 带命名空间，例如 `/obsidian-wiki:wiki-ingest`。

12. 喂数据。原文说“任何文本形态的东西”都可以：文档、PDF、聊天导出、会议转录、截图、URL。

```text
/wiki-ingest ~/research
/wiki-update                        # distill the repo you're standing in (code-graph aware)
/wiki-capture                       # save this conversation
/wiki-history-ingest claude         # mine everything you've ever asked Claude
```

预期：材料进入 vault；manifest 记录已摄入来源，第二次只处理增量。

13. 提问。原文称回答会带 `[[wikilink]]` 引用而不是“感觉”。

```text
/wiki-query what do I know about rate limiting?
/wiki-narrate MCP security          # a cited briefing on a topic
/wiki-digest week                   # what did I learn this week?
```

14. 找回叫不出名字的历史会话（用 CLI，不是斜杠命令）：

```bash
obsidian-wiki sessions-build
obsidian-wiki sessions-query "the auth bug with the weird retry loop"
```

15. 定期清洗 vault：

```text
/wiki-lint            # broken links, orphans, contradictions
/wiki-dedup           # "RSC" and "React Server Components" are one page now
/cross-linker         # weave new pages into the graph
/wiki-status          # what's ingested, what's pending, where the hubs are
```

16. 可选：在 Obsidian 里查看图谱。打开 vault，Cmd/Ctrl+P → “Open graph view”；对智能体说 “color my graph” 会按 tag、category 或 visibility 给节点上色。想先看效果，可克隆仓库后用 Obsidian 的 Open folder as vault 打开 `examples/demo-vault/`（原文称是 18 页关于构建可靠 LLM 智能体的示例 vault）。图谱还可导出为 `graph.json`、GraphML（Gephi/yEd）、Neo4j Cypher、Postgres SQL 或自包含的 `graph.html`。注意：vault 本质是磁盘上的纯 Markdown 文件夹，可以 grep、可以推私有 repo、可以直接删；即便不引入 Obsidian，ingest/query/lint 链路仍然成立。

17. 想从代码里用（无 API key、无 embedding、无向量库、无网络）：

```python
from obsidian_wiki import Memory

memory = Memory("~/brain")
memory.remember("stack", "Python, FastAPI", confidence=0.9)
memory.add("Postgres was chosen over MySQL for partial indexes.")
memory.search("postgres")
memory.recap()                       # inject at session start
```

原作者补充：`user_id` 可把记忆按人隔离，而知识仍然共享。

18. 多智能体并发写入的前提：`index.md`、`log.md`、`hot.md` 以及 `_meta/` 下的 owner profile 与 todo index 都走同一个加锁、原子写入的 writer，原文称因此并行的多个智能体不会互相丢更新。如果你要多智能体同时写，别绕过这个 writer。

### 做法 D：让新会话先核对事实再接手（truongfelix/workflow）

针对的问题是：每个 Claude Code 会话都从空上下文开始，常见的“笔记文件”做法会在笔记写错时失效——分支标成“已推送”其实没到 remote、任务标成“还在跑”其实凌晨 1 点就死了、待办上周就做完了，而下一次会话会相信这些笔记并在其上继续施工。核心一句话：handoff 是主张，脚本是事实；读写两侧跑同一个脚本，所以看到的是同一幅图。

交付物是一组固定文件（由模板拷入项目）：

| 文件 | 存放内容 |
|---|---|
| `notes/handoff.md` | 今天：下一步任务、等你决定的事、后台在跑什么、上次会话。短，每次 handoff 重写 |
| `notes/handoff-archive.md` | 历次 handoff 逐字存档，需要时才搜，启动时不读 |
| `BACKLOG.md` | 只放开放工作，每个 repo 一节。做完的条目删除而非打勾，历史交给 git |
| `questions.md` | 只有你能做的决定，每条带选项与建议；以及已定的裁决，防止新会话“改回去” |
| `notes/lessons.md` | 项目踩坑学到的经验，每次会话都加载 |
| `CLAUDE.md` | 项目是什么、规则与命令。不放待办、不放历史 |
| `.claude/ground-truth.conf` | 脚本要检查的 repo，以及永远不能推送的分支 |
| `.claude/skills/` | `/session-start`（含 `ground-truth.sh`）与 `/handoff` |

19. 克隆模板到本机：

```bash
git clone https://github.com/truongfelix/workflow.git
```

前提：bash 和 git 可用。预期：本机有一份 workflow 的 clone。

20. 把模板拷进项目（只拷贝缺失文件，绝不覆盖已有文件）：

```bash
workflow/bin/adopt.sh ~/code/my-project     # copies the template; never overwrites a file
```

前提：确认项目根目录。预期：模板文件进入项目；脚本打印它跳过了哪些文件并给出 diff 命令，并列出所有 FILL 标记。

21. 在项目里打开 Claude Code，直接给这段提示词：

```text
Set up the workflow: follow "Adopt in a new project" in /path/to/workflow/README.md
```

前提：已 clone workflow。预期：Claude 会替你填空（项目是什么、有哪些 repo、规则是什么），反复运行 ground truth 直到干净，然后跑一次 `/handoff` 写出第一份 handoff。

22. 按顺序填 `.claude/ground-truth.conf`：每个 repo 一行（在 fork 里，算作“已推送”的 remote 是你自己的，不是 upstream），以及 KEEP_LOCAL 列出永远不能推送的分支。前提：知道项目有哪些 repo 和 remote。预期：脚本知道要检查什么。

23. 反复运行：

```bash
bash .claude/skills/session-start/ground-truth.sh
```

直到它以 `GROUND TRUTH: complete` 结束。前提：bash 和 git 可用；可选 `gh`、systemd 决定覆盖范围。预期：事实采集干净。结果不可读时脚本打印 UNKNOWN 并以退出码 2 结束，绝不算通过。

24. 填 `CLAUDE.md`：项目是什么、规则、handoff 规则（`/handoff` 能不能不问就 commit 和 push？）、repo 与目录布局、命令。把里面原有的待办列表搬进 `BACKLOG.md`。预期：上下文与授权规则明确。

25. 填 `BACKLOG.md`：每个 repo 或文件树一节，从项目已有追踪物（issue、笔记、旧 TODO）填。每条写：哪里错了或缺什么、指针、什么时候算完成。做完的条目删除而非打勾，历史交给 git。

26. 填 `questions.md`：所有者尚未做的决定，以及已经做过、但新人会推翻的裁决；每条带选项与建议。

27. 填两个技能的 FILL 项：项目特有的检查项，哪些是预期之内、不算新闻。

28. 仅工作区形态：在根目录 `git init`；首次提交前检查 `git status --ignored` 和暂存列表；扫密钥（`gitleaks`）；绝不追踪 datadir、密钥或二进制；创建私有 remote，且只在所有者同意后推送。

29. 闭环：跑一次 `/handoff`，让第一份 `notes/handoff.md` 从 ground truth 写出来。下一次会话用 `/session-start` 开始。

30. 日常固定动作：坐下时 `/session-start`，收工前 `/handoff`。预期：`/session-start` 运行 `ground-truth.sh`，从 git、GitHub 和本机读出事实（每个 repo/worktree 与其 remote 的差异、开着的 PR 及其 CI、后台任务），再读上一次的 handoff，报告两者不一致的地方，提出当天任务建议，然后等你决定；`/handoff` 运行同一个脚本，据此重写 handoff，更新各跟踪文件，并提交。

31. 升级：再跑一次 `bin/adopt.sh <project-root>`，它会列出每个被跳过的文件，并给出与当前模板对比的 `diff -u` 命令。合并通用部分，保留项目自己的 FILL 答案。`.claude/workflow-version` 记录项目上次取用的 commit。

32. 回馈上游：当某个项目的会话改进了通用部分（一个技能步骤、一项 ground-truth 检查、一条踩坑得来的原则），把通用部分单独一个 commit 移植回本仓，并写明原因。项目特有的内容不回上游，经验教训也不回：教训留在学到它的那个项目的 `notes/lessons.md` 里。

33. 照做时的五条判据：
- 主张和事实是两回事：过去会话写的笔记是主张；拿它行动或转述之前，先对着 git 和机器核一遍。
- 做完的事删除，不打勾：打勾的条目还读起来像真的，会烂掉，还会把开放条目埋掉；历史 git 留着。
- 读不出来的结果叫 UNKNOWN，绝不算通过：崩掉的检查什么都不打印，看起来像“没发现问题”；脚本打印 UNKNOWN 并以退出码 2 结束。
- 没被点名的东西，不算只存在于一块盘上：死在笔记本上的未提交工作等于不存在。
- 先建议，再等：会话只推荐；当天做什么、每次 push/PR/merge 是否批准，由你决定。

与做法 A/B/C 的差异：A 的 memory 规则是“开始新任务前先读取 memory”，但 memory 本身仍是笔记/主张；D 要求在读笔记之外先跑事实脚本，报告不一致后再行动。C 的 vault 是知识库，适合摄入与查询；D 是项目状态核对，二者可叠加，但不要让 vault 里的旧结论替代 git/机器事实。

## 怎么判断变好了

最小试用方式：
1. 建一个 `second-brain` 目录，只放入少量非敏感材料，不要一上来就接真实收件箱。
2. 在本机装好并授权 GWS CLI（做法 B），先只开一项权限（例如日历只读）跑通；安装与授权命令原文未给，需自行查文档确认后再执行。
3. 在目录下建 `memory` 子目录。
4. 在目录下建 `CLAUDE.md`，写一条规则：把每次会话中确认的长期有效信息追加到 `memory` 下的文件中，并在开始新任务前先读取 `memory`。规则内容需自行拟定，原文未给出。
5. 连续使用 1～2 周，每天在同一目录下开 Claude Code 做真实工作。
6. 想验证做法 C，按原文的对照方式跑：同一模型、同一 vault、同一批问题，唯一变量是有没有装 obsidian-wiki；ground truth 用 networkx 而不是本项目自己的代码（betweenness 每个节点吻合到 3.5e-18，630 组最短路全部一致）。
7. 想验证做法 D，在长期项目上小范围试：clone 仓库后运行 `bin/adopt.sh`，先填好 `.claude/ground-truth.conf` 并把 `ground-truth.sh` 跑到 `GROUND TRUTH: complete`，再用 `/session-start` 和 `/handoff` 包住每天的工作。观察脚本报出的“handoff 与事实不一致”条目数是否下降。

观察指标（做法 A/B）：
- 重复交代率：同一背景信息需要重新告诉 AI 的次数是否下降。
- 召回成功率：跨会话提问“上次关于 X 的结论是什么”，能否从 `memory` 中正确取回；错答或答不上来的比例。
- 记忆文件质量：`memory` 里的条目有多少比例确实是长期有用的，多少是噪声；需要人工清理的频率。
- 越权与泄漏：是否出现过读取到不该读的邮件/文件，或把敏感内容写进记忆文件的情况。此项为红线指标，出现即停。
- 对照组：同期在另一个不含 `memory` 与 `CLAUDE.md` 规则的目录里做同类任务，比较上面几项。

观察指标（做法 C，逐题对比回答耗时、正确率、工具调用次数、API 成本）：

| 指标 | 普通智能体 | 装了 obsidian-wiki |
|---|---|---|
| 回答耗时 | 81s | 19s（快 4.4×） |
| 正确率 | 44% | 83% |
| 工具调用次数 | 9.9 | 4.6 |
| API 成本 | $0.202 | $0.208（基本不变） |

逐题数据："How is X connected to Y?" 122s → 18s；"What topic clusters do I have?" 117s → 21s；"Which pages hold my vault together?" 61s → 12s；"What breaks if I delete X?" 26s → 24s（这一题几乎无改善）。收益集中在结构性/图关系类问题上，删除影响类问题别期待明显改善。

观察指标（做法 D）：
- 脚本是否以 `GROUND TRUTH: complete` 结束；出现 UNKNOWN 或退出码 2 时，当作没通过。
- `/session-start` 报告的主张与事实不一致条目数；README 样例一次暴露 3 条 ⚠，并指出只信周五笔记的会话会要求合并一个红灯 PR、报告 backfill 已完成、重写已经存在的代码。
- 每个任务的“done when”是否可执行，样例写法："Done when CI is green and you have merged it""Done when the unit exits 0 and 20 recipes check out on staging"。
- 后台任务、PR 的 CI 状态、未推送提交是否在下一次 `/session-start` 被翻出来。
- 注意：README 没有描述无人值守的后台自动运行，推进发生在会话边界，由脚本采集 + 会话报告驱动。

试多久：1～2 周。如果重复交代率与召回成功率没有可观察的改善，或噪声清理成本高于收益，则放弃这条做法，退回到把 Claude Code 当作单次会话工具使用。做法 D 本次材料只到 README，脚本实现与效果未经验证，先小范围试，再谈全面采用。

## 常见坑

- second-brain 原文第 4 步截断，`CLAUDE.md` 规则全文未知，不能直接照抄“所有重要细节”这种表述；需要自己界定什么算长期有效信息。
- 原文没有 GWS CLI 的安装命令、包名来源和授权流程，不能凭想象执行；先查证再操作。
- “所有重要细节”没有界定范围，容易把噪声写进 `memory`，需要人工清理。
- 做法 A 未说明记忆如何被召回：是每次会话自动读取，还是需要显式提示，原文未交代；必须自己验证。
- 未说明 GWS CLI 的授权范围、凭证存储方式与撤销方式，存在隐私与凭据风险。
- 传播数据（494 次点赞、79 次转发、28 条回复）只是传播热度，不是效果证据；原文没有效果数据、前后对比或失败案例。
- 做法 C 的作者自评项目“early”，效果数据只有 n=2 的小样本，先试再谈全面采用。
- 做法 C 的一个具体失败机制：普通智能体追踪连接关系时会走 `index.md`——它链接到每一页，于是“找到”一条毫无意义的短路径，并据此把 `index` 列为 vault 最重要的页面之一；两次运行都犯同一个错。skill 查询的图排除了这类记账文件，所以正确答案才可达。这也是“结构性/图关系类问题不要交给裸 agent 硬做”的直接依据。
- 安装 obsidian-wiki 时，原文明确说不要用 `uvx`；用 `uv tool install` 或 `pipx install`。
- Claude Code 插件路线只带 skills，不带 session hook 和 CLI；要“会话开始注入回顾、结束提醒捕获”就得走 pip 安装路线。
- 原文只描述了 hook 触发和维护命令，没有给出按时间/状态自动调度（如 cron、定时任务）的配置，这部分不能照搬。
- Cursor、Hermes、OpenClaw 的支持都只是 README 里的一句话，没有配置细节，先按 watch 对待。
- Obsidian 只是查看器和 Markdown 载体；如果因为“不想引入 Obsidian”而放弃做法 C，是没有必要的——vault 就是磁盘上的纯 Markdown 文件夹。
- 做法 D 本次材料只到 README，脚本实现与效果未经验证；不要把它当作已经证明能减少所有记忆失真。
- 做法 D 的推进发生在会话边界，不是无人值守后台；README 没有描述自动调度。
- 做法 D 的工作区形态要求根目录 remote 必须是 PRIVATE，首次提交前要检查 `git status --ignored`、扫密钥，且绝不追踪 datadir、密钥或二进制。
- 主张和事实的优先级：A 的 memory 和 C 的 vault 都可读，但先跑 ground truth；否则可能把旧笔记当事实继续施工。

## 证据与来源

- second-brain 侧：来源是 @Bober_smart 的推文/调研报告。原文给出 4 步清单，第 4 步在“保存到……”处截断；无命令示例、无规则全文、无效果验证。传播数据为 494 次点赞、79 次转发、28 条回复——这是传播热度，不是效果证据。
- obsidian-wiki 侧：来源是 Ar9av/obsidian-wiki 的 README。作者自评项目“early”，效果数据只有 n=2 的小样本。
- 对照数据来源：上表与逐题数据出自该 README。方法细节为 Claude Sonnet、headless、真实 38 页 vault；问题用自然语言、不提供图定义。报告在“普通智能体有”处截断，那一侧的细节无法引用。ground truth 用 networkx（betweenness 每个节点吻合到 3.5e-18，630 组最短路全部一致）。
- truongfelix/workflow 侧：来源是该仓库 README（MIT，32 stars）。本次材料只到 README，脚本实现与效果未经验证。README 给出一份完整的 Monday morning `/session-start` 输出样例（含 3 条与上周五 handoff 的不一致告警、当天 3 项带完成判据的任务、2 条等待裁决的问题），并称这套场景的全部文件与脚本输出都在 `example/`。仓库自身有 CI 徽章，`test/run.sh` 测 `adopt.sh` 与 `ground-truth.sh`，CI 在 Linux/macOS/Windows 三种系统上跑。
- 证据强度提示：做法 A、B 只有步骤清单和传播数据，没有效果验证；做法 C 有对照实验数据，但样本极小且作者自评 early；做法 D 只有 README、样例输出和模板自身 CI，缺少独立效果验证。所有数据都不能当作“这套做法一定有效”的证明。
- 作者主张（缺少支撑）：建独立文件夹、接入 GWS CLI 打通 Gmail/日历/云端硬盘、单开 `memory` 子目录、在 `CLAUDE.md` 写死记忆规则；obsidian-wiki 的“知识是编译而非堆积”、manifest 增量摄入、每条主张打标 extracted / inferred / ambiguous、查询成本随规模基本不变；workflow 的“主张和事实是两回事”“做完删除不打勾”“UNKNOWN 绝不算通过”“没被点名的东西不算只存在一块盘上”“先建议再等”。
- 调研报告给出的建议（不是原文）：规则示例“把每次会话中确认的长期有效信息追加到 `memory` 下的文件中；开始新任务前先读取 `memory`”；先只开一项权限跑通；重复交代率、召回成功率、记忆文件质量、越权与泄漏、对照组等指标；1～2 周试用期；用同一模型、同一 vault、同一批问题做对照验证；在长期项目上小范围试做法 D。
- 仅为推测的部分：第 4 步规则的目标位置推测指向 `memory` 目录；原文未界定“重要细节”；未说明记忆召回机制、GWS CLI 授权范围、凭证存储与撤销方式；obsidian-wiki 的 Cursor / Hermes / OpenClaw 支持细节也尚未证实；workflow 的脚本实现与效果未验证。

## 依据的调研

- [@Bober_smart: 1. 在您的电脑上创建一个名为 ⁠second-brain⁠ 的文件夹  ](../research/radar/2026-10-02/839-1-second-brain.md)：值得一试，可以照这条推文搭一个最小版“第二大脑”：建独立文件夹、在 Claude Code 里接入 GWS CLI 打通 Gmail／日历／云端硬盘、单开 memory 子目录并在 CLAUDE.md 里写死记忆规则；理由是它把「权限供给 + 持久化目录 + 规则文件」三件事凑成了可复制的骨架，但原文第 4 步被截断、无命令示例也无效果验证，只能小范围试。
- [Ar9av/obsidian-wiki](../research/radar/2026-10-03/1004-ar9av-obsidian-wiki.md)：值得一试，可以直接照 README 的安装和斜杠命令小范围试一遍：把常用工作目录设成 vault、跑 ingest/query/lint 三步，验证跨会话记忆和结构性提问是否真的省时；但作者自评项目「early」，效果数据只有 n=2 的小样本，先试再谈全面采用。
- [truongfelix/workflow](../research/radar/2026-10-11/2508-truongfelix-workflow.md)：值得一试，在一个有多会话、跨天跨机器的长期项目上小范围试：clone 仓库后运行 bin/adopt.sh，先填好 .claude/ground-truth.conf 并把 ground-truth.sh 跑到 GROUND TRUTH: complete，再用 /session-start 和 /handoff 包住每天的工作；理由是它把“上次会话的笔记只是主张、git 与机器状态才是事实”这条规则做成两个技能共用同一个采集脚本的机制，直接针对跨会话记忆失真，但本次材料只到 README，脚本实现与效果未经验证。
