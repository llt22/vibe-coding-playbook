# 让新会话先核对事实，再把纠正沉淀成规则：跨会话记忆的落盘、召回与纠错

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 每次开新会话都要重新交代背景，而它读到的笔记、记忆、历史检索和项目地图又都只是“主张”，直接当事实施工就会把旧结论、未推送分支和已完成的待办带进新任务。
> 先试这一步：先在一个真实项目里建最小记忆落点：建 `memory/` 目录，在 `CLAUDE.md` 写一条“开始任务前先读 memory、会话中确认的长期信息追加进去”的规则，连续跑 3–5 次会话，看重复交代有没有减少。
> 最近修订：2026-11-11

## 解决什么问题

AI 每次开新会话都要重新交代背景；跨会话、跨代理、跨机器的资料、结论和历史决策无法沉淀。更糟的是，上次的笔记、handoff、memory、历史检索结果或项目地图只是“主张”，直接当事实继续施工，会把已失败的后台任务、未推送的分支、已完成的待办带进新会话。第二大脑建好却没说清 agent 什么时候读、读到的旧结论和用户当下说法冲突时听谁的，也会让它要么没被用上，要么被原样沿用。同一批材料还可能按话题散落在 `MEMORY/`、`notes/`、`people/`、`projects/` 等多个目录；若没有 `CLAUDE.md` 规则，目录只是堆放，不会自动变成可召回的记忆。编码场景还有三类失真：模型训练截止之后依赖库改了 API，agent 不查 changelog 仍按旧 API 写代码；项目文档落后于代码，agent 按旧文档把本来正确的实现改坏；agent 在一堆没跑过的测试和坏掉的 hook 上宣布“完成”。团队里多个人、多个 agent 各记各的，或者记忆只存在某台机器、某份手写笔记里，重复交代和“把旧结论当事实”会同时发生。另一类常见缺口是：过去的决策、试过的死胡同、某日当时的状态、某个文件的变更历史，其实都散落在本机历史聊天和 git 里，但新会话不会自动去翻，于是同一个坑反复踩。

还有一类最容易被忽略的失真：你对 agent 的纠正本身没有被沉淀。同一句“先别 push”“我问的是为什么，不是让你改”“这个数不是表里的”，下周还要再说一遍；纠正只存在于那一次对话里，既没变成规则，也没附上当时说这话的上下文。

这套做法分十六条路线：A/B/C 先让长期信息在本地 Markdown 落盘并变成可查询的库；D 在会话边界用脚本核对 git/GitHub/本机事实；E 用常驻指令让 agent 每次任务前先读知识库、冲突先问你；F 把捕获、汇总、召回、交接做成常驻管线；G 把依赖库在模型截止后的 API 变更注入给 agent；H 做自托管、按部门/团队/成员隔离的团队记忆；I 在文档与代码冲突时以代码为准并列出冲突点；J 用一条常驻提示词把 Markdown 库变成 Codex 的跨项目记忆；K 用 Mycel 维护一张本地“活的项目地图”；L 用 thenwise 把本机 Claude Code 历史聊天、git 提交、PR、`CLAUDE.md` 和笔记目录汇入本地 SQLite，按需检索并在会话边界按 token 预算自动注入；M 用 ECX 在会话开始加载共享记忆、跑 doctor 体检，并在代理宣布完成前先跑仓库测试命令；N 先按七条判据选一个记忆 MCP，再分开验证“能查”和“会记”；O 按 Anthropic 的记忆组件做持久目录、会话笔记、小型注入索引、按需搜索、dreaming 离线校正和 wiki 表示；P 用 learn-from-lessons 从本机历史对话里挖出你纠正 agent 的时刻，转成带原文引用的 lesson，人工筛后注入 `CLAUDE.md`/`AGENTS.md`。A 有三个变体：A-1 用单一 `memory/` 目录加 `CLAUDE.md` 规则；A-2 用 `notes/` 与 `people/` 按材料类型分目录，但原文在 `people/` 处截断；A-3 用 `MEMORY/`、`notes/`、`people/`、`projects/` 按话题分目录，但原文在目录列表处截断，最关键的 `CLAUDE.md` 一行没有保存下来。F/H/J/K/L/M/N/O/P 都仍把记忆、地图、历史、`hot.md`、MCP 召回、注入索引或 lesson 当“主张”，不能替代 D 的事实核对；M 的测试闸门只证明“这条命令跑过了”，不证明测试覆盖足够；N 的 MCP 连接可能只负责检索，不负责记录，必须另验钩子或插件；O 的 wiki 和记忆笔记也可能过期或错误，必须靠 dreaming 校正、人工抽查和 D 的事实核对；P 的 lesson 是对过去某次对话的归纳，可能过窄、过度概括或当时就记错，必须回查原文引用并靠 D 核对当前事实。

## 适用与不适用

适用：

- 已在用 Claude Code 或其他读取 Markdown 的 agent 做真实工作，但每次都要重复交代背景。
- 希望把确认过的长期有效信息落到本地文件；只需要一个长期信息落点时用 A-1 的 `memory/`。
- 材料天然分成事实/研究/想法与人物信息，想试 A-2 的 `notes/` 与 `people/`；注意原文只给到 `people/`。
- 材料按话题分成决定、笔记、人物、项目，想试 A-3 的 `MEMORY/`、`notes/`、`people/`、`projects/`；但原文在目录列表处截断，关键 `CLAUDE.md` 指令缺失，只能当试验。
- 需要让 AI 读取 Gmail、日历、云端硬盘时走 B；原文缺安装与授权细节，必须先查证。
- 想把散落材料变成可提问、带引用、可清洗的库，或找回叫不出名字的历史会话，走 C。
- 长期项目有多个会话、跨天跨机器，上一次笔记可能失真，或有多仓库工作区，走 D。
- 已有可被 AI 读取的知识库，但 AI 不主动读，或把旧结论当事实沿用，走 E。
- 想跨 agent、跨项目、跨机器共享记忆，能接受常驻服务、采集提示词与工具调用，走 F。
- 项目是 JS/TS，依赖有大版本跨越或紧贴发布节奏，走 G。
- 小团队想自托管团队记忆，按部门→团队→成员/agent 隔离，能接受 Docker、git 和一个 LLM 后端，走 H。
- 项目同时维护文档和代码，编码 agent 会读 `CLAUDE.md`/`AGENTS.md`，希望它在文档落后时按代码改并列出冲突点，走 I。
- 跨项目、长期、上下文反复丢失，想用最轻的方式给 Codex 一个外部记忆库，走 J。
- 本机有 Node.js 22+，项目在本地文件系统，愿意让 agent 读代码，并想让人和 agent 共用一张项目地图，走 K。
- 已在用 Claude Code，历史主要沉淀在 `~/.claude/projects` 与 git，想少重复交代，或想查“为什么这样决定”“以前试过什么”“某日当时是什么状态”“某文件的历史”，走 L。
- 已在用 Claude Code，可能还同时用 Codex，希望会话一开始就加载共享记忆、每次会话开始自动体检，并且代理说“完成”前必须先跑仓库测试，走 M。
- 已在用支持 MCP 的 Claude Code/Codex/Cursor 等客户端，想从托管/自托管、捕获模型、团队共享、文件可读性和许可成本之间选一个记忆工具，走 N。
- 任务跨会话、长程、有可验证反馈或评分，需要 agent 自己积累经验、从错误中形成规则、离线整理笔记，走 O。O 适合多文档问答、重复数据库查询、游戏推进、法律 brief 等；强模型可给判断空间，弱模型需更明确的“先读记忆、检验理论”提示。
- 本机已用 Claude Code / Codex / opencode 留下过较长历史，且你确实反复纠正过 agent；想把“每次纠正”变成可复用的规则，走 P。P 最值钱的场景是同一类纠正你已经说过不止一次。

不适用：

- 还没有安装 Claude Code 或任何可读 Markdown 的 agent，或没有本地文件系统写权限。
- 不能接受把 Gmail、日历、云端硬盘的读取权限交给本地工具，或工作内容高度敏感且没有隔离账号。
- 期待原文给出逐字可抄的命令、配置和规则全文：second-brain 原有第 4 步截断；A-2 在 `people/` 处截断；A-3 在目录列表处截断且 `CLAUDE.md` 关键一行缺失；D 本次材料只到 README；F 的 `ai-memory run --f` 处截断；H 的 `amem` 安装命令未在正文给出；J 只有一段提示词且在“这样你的 Codex”处截断；K 只有 README；O 原文没有给出可直接复制的命令、配置或逐字提示词。
- 想用 C 全面替换现有做法：作者自评“early”，效果数据只有 n=2 的小样本。
- 想用 D/F/H/K/L/M/N/O/P 完全替代人工判断：它们只推荐、提供记忆层、项目地图、历史检索、完成闸门、选型清单、记忆设计或教训注入，每天做什么、每次 push/PR/merge 是否批准，由你决定。
- 没有稳定的知识库，或知识库里本来就是不可信内容：E/F/H/J/M/N/O/P 都会把不可信内容引用、汇总、蒸馏、写回、注入或以规则形式固化。
- 工具不会稳定遵守常驻指令，或你不愿让 AI 提议改写知识库：先别把 E 当默认配置。
- 非 JS/TS 项目；多 workspace/monorepo；无自带类型的包只能靠 release note：先别把 G 当默认配置。
- 不能接受把包名与版本发往 npm registry、GitHub、models.dev，或 `--llm`/`--examples`/`--guides` 时把类型 diff、release note 片段、指南文本与导入的 API 名发往 Claude：先别把 G 当默认配置。
- 超过 1 个部门、10 人的组织不想为生产使用付费：AgentMemory 0.4.0 起服务端为 BUSL-1.1。
- 不愿用 Docker/git，或没有可用 LLM 后端：先别上 H；只想要轻量本地 Markdown 记忆，先做 A/E。
- 代理不读取 `CLAUDE.md`/`AGENTS.md`，或项目没有文档与代码并存，或你无法接受“以代码为准”：先别把 I 当默认规则。
- 单项目或短周期工作：J 的“每晚整理、每周复盘”开销可能高于收益。
- 多人协作、云端或远程团队场景不明确；K 处于 0.22 早期、约 30 stars、单一作者、无量化收益。
- `people/` 会沉淀人名与人际信息，团队共享或同步到远端时有隐私问题；多人协作时同一文件易冲突。
- 不是 Claude Code 工作流，或历史不在 `~/.claude/projects`，L 没有可检索的数据；Node 低于 22.16 也装不上 thenwise。
- 不在 macOS/Linux、没有 Python 3.9+、不愿让 hooks 在会话开始、消息前、回复后和结束时执行：先别装 M。
- 只想用 Claude Code、不用 Codex：M 的双代理同步不适用，但共享记忆和测试闸门仍可单独用。
- 需要团队权限、安全审计、多人协作冲突处理：ECX 的 README 没有展开这些，先别把它当团队记忆方案。
- 客户端不能挂 hook，但你需要自动记录：先别选只有 MCP 连接的方案。
- 想靠厂商自报的 LoCoMo/LongMemEval 数字验收：不要用；这些数字几乎都是自报、模型栈和 judge 不同，不能横向比较。
- 每轮都能从屏幕直接读到状态，或只需单文档文本检索：O 的记忆和 wiki 收益有限；单文档检索用搜索即可，不必强行建 wiki。
- 没有持久记忆目录、没有保留 session transcript/log、没有文件搜索、没有评分反馈、也没有额外 compute 跑 dreaming：先别把 O 当默认配置。
- 本机没有历史对话、历史里纠正很少、或主要用 Cursor/Cline/Gemini CLI：先别把 P 当默认做法。P 的读取器目前明确支持 Claude Code、Codex、opencode，Cursor/Cline 的读取器 README 说还在找人写。
- 不愿让 `lessons dream` 调用你本机的 `claude`/`codex` CLI 并把对话内容送进模型：先别用 P 的自动提炼，最多手工整理 lesson。
- 期待 P 自带定时触发或自动注入：README 只说 scan/dream/view/inject 这些手动命令，没有 cron、watch、hook。

## 前置条件

- A-1：本机已安装并能运行 Claude Code；对目标目录有读写权限。
- A-2：同上；只需 Claude Code 与本地目录写权限，不需要 API key；原文未给启动命令、提示词和更新规则；涉及人物信息先用非敏感材料试。
- A-3：本机已安装并能运行 Claude Code；准备一个空文件夹作为工作根目录；对目录有读写权限；涉及 `people/` 先用非敏感材料。
- B：在 A 基础上，另需一个 Google 账号，并准备把 Gmail、日历、云端硬盘读取权限交给本地工具。原文没有 GWS CLI 安装命令、包名来源或授权流程，必须先查证官方文档。
- C：本机有 Python 环境（pip/uv/pipx 任一路线）；走 Claude Code 插件路线则不需要 Python。不需要 API key、embedding 模型、向量库或联网。
- D：需要 bash 和 git。可选 GitHub CLI `gh`、systemd（仅 Linux）。支持 Linux、macOS 和 Windows（在 Git Bash 或 WSL 里跑）。开始前先读 `PRINCIPLES.md`。适用单仓库，或一个装着多个 repo 的工作区文件夹，根目录自身是一个只放文档的 repo；工作区形态的 remote 必须是 PRIVATE。
- E：已经有一个可被 AI 工具读取的知识库；所用工具支持常驻指令入口，且允许 AI 提出对知识库的写回编辑；你本人愿意做冲突裁决。
- F：能访问 GitHub releases 和 curl（Linux/macOS）；Windows 用 PowerShell，无需管理员，或只考虑 WSL2；Arch/Fedora 走包管理器；macOS 菜单栏 App 需要 Rust 工具链 + Xcode / Swift 6；Docker 路线需要 Docker 或 Podman + 一个支持 MCP 的 agent CLI。
- G：Node 项目；有 lockfile 或 `node_modules` 以确定 pin 的版本；能访问 npm registry 与 GitHub；知道当前会话用的模型（可用 `--model` 指定，或显式传 `--cutoff YYYY-MM-DD`）；可选 GitHub token 或 `gh` 登录；选择 LLM 通道时需 Anthropic API 或 `claude -p`；comment 模式的 CI 需 `pull-requests: write` 权限。
- H：Docker、git；一个 LLM 后端（OpenAI 兼容 API key，或本机可调用的 `claude`、`codex`、`agy` 等 CLI）；默认 SQLite 无需额外安装；多副本才需要 Redis，规模化才需要 PostgreSQL/pgvector；从源码构建需要 Rust MSRV 1.88。生产使用前先看许可证。
- I：确认编码代理会读取项目中的 `CLAUDE.md` 或 `AGENTS.md`；项目允许创建或修改这类代理指令文件；任务附近存在已知的文档与代码不一致点。不需要额外服务或 key。
- J：需要一个固定的知识库目录（Obsidian vault 或任意 Markdown 目录）；确认 Codex 能读写该目录；确认“每晚十点”和“每周”由谁触发；能提供“当日项目沟通记录”的确定来源；愿意每晚抽查写回条目。
- K：Node.js 22 或更新；一个受支持的可编码 agent（Claude Code 集成最完整）；项目在本地文件系统，且愿意让 agent 读代码；Mycel 建议克隆在项目外；默认监听 `127.0.0.1:4317`，API 写入需要 `.mycel/token` 里的令牌。
- L：已在用 Claude Code；Node 22.16+；有 git 仓库；要记忆的历史位于 `~/.claude/projects`；数据目录为 `~/.thenwise` 或 `THENWISE_HOME`。单机不需要模型或 API key；默认不发送遥测，只有每日一次 npm 版本检查默认开启，可用 `thenwise update-check off` 关闭。团队模式另需一台自托管服务器、https 反向代理和 token 管理。
- M：Claude Code；README 标注 Python 3.9+，支持 macOS/Linux，未列 Windows。要双代理共享记忆还需 Codex；要手机接力需要一个私有 GitHub 仓库；要关系图检索需 Ollama。安装前先备份现有配置，尤其是 `~/.claude`。
- N：一个支持 MCP 的客户端；先确认客户端能不能挂 hook 或装插件，否则只能选“模型主动调用写工具”的方案；Glen 需账号和 org；Mem0 走浏览器登录或把 API key 当 bearer token；Supermemory 连接时选允许访问的 space；Zep 企业向认证；Hindsight 要自己跑起自托管版本并建好 bank，需要 LLM key；mcp-memory-service 要本机 Python 环境；Basic Memory 用 `uv`；claude-mem 先想清楚推理跑在哪；agentmemory 要 Node 20+，无需 key；Cognee 要 Docker 和 `LLM_API_KEY`。
- O：需要能跨会话读取的持久记忆目录；保留原始 session transcript/log；有文件搜索或按需读取能力；有正确答案、评分反馈或可验证的推进信号；愿意为 dreaming 留额外 compute；控制注入层大小，例如只注入 `MEMORY.md` 前 200 行或 25KB 作为索引。原文没有给出可直接复制的命令、配置或完整提示词。
- P：Python 3.9+，有 pipx；本机已留下 Claude Code / Codex / opencode 的对话记录；本机有可用的 `claude` 或 `codex` CLI 及其额度（`lessons dream` 要调用它）；对目标 `CLAUDE.md`/`AGENTS.md` 有写权限。全部命令在本地跑，但要先想清楚 `dream` 会把对话内容送进模型。
- 涉及隐私与凭据安全：先用非敏感账号或受限范围试，不要一上来就接真实收件箱或公司级知识库。F/H/J/K/L/M/N/O/P 会采集、写回、画图、检索历史、执行 hooks、注入记忆或固化规则，先用测试团队、测试 agent、测试库、测试仓库、测试项目。

## 操作步骤

先选路线，十六条路线可以叠加：

- 只需要跨会话记住项目背景，先做 A。A-1 用单一 `memory/` 目录加 `CLAUDE.md` 规则；A-2 用 `notes/` 与 `people/` 按材料类型分目录；A-3 用 `MEMORY/`、`notes/`、`people/`、`projects/` 按话题分目录。目录本身不会自动生效，必须配读取/追加规则。
- 还需要 AI 读取 Gmail、日历、云端硬盘，在 A 之上做 B。原文缺安装与授权细节，必须先查证再操作。
- 想把材料变成可摄入、可提问、可引用、可清洗的库，或想找回叫不出名字的历史会话，做 C。
- 如果新会话经常把上次笔记当事实、需要跨天跨机器接续长期项目，做 D。D 可以叠加在 A/B/C/F/H/J/K/L/M/N/O/P 上：记忆、vault、wiki/handoff、召回结果、知识库、地图、历史检索、`hot.md`、MCP 召回、O 的索引、P 的 lesson 都只是“主张”来源，D 负责在会话边界拿 git/机器事实核对。
- 如果知识库已经存在、但 AI 不主动用、或你说的话和库里记录打架时它自作主张，做 E。E 管“你说的话 vs 知识库记录”，D 管“笔记/记忆/历史 vs git、GitHub、本机事实”，两者都要。
- 如果主要痛点是跨 agent、跨项目、跨机器的长期记忆，并且能接受常驻服务和采集提示词与工具调用，试 F。F 不能替代 D；E 的冲突裁决指令可以和 F 叠加。
- 如果是 JS/TS 单 `package.json` 项目、依赖有大版本跨越或紧贴发布节奏，加 G。G 的笔记仍来自 changelog/release note，是“主张”，编辑后 guard 和 CI check 才是编译层的事实核对。
- 如果是小团队、要自托管、要按部门/团队/成员/agent 隔离、要自动捕获和分层召回，做 H。H 仍把“记忆”当主张，不能替代 D。
- 如果项目同时维护文档和代码、编码 agent 会读 `CLAUDE.md`/`AGENTS.md`，且你希望它在文档落后于代码时按代码改、把冲突点列出来，加 I。I 不替代 D，也不证明代码本身正确。
- 如果跨项目的偏好与项目细节反复丢失、又不想引入常驻服务，加 J。J 只是一条提示词加一个 Markdown 知识库，靠固定节律维护；它没有冲突裁决、没有事实核对，必须配人工抽查。
- 如果本机有 Node 22+、项目在本地、愿意让 agent 读代码，并想让人和 agent 共用一张项目地图，加 K。K 补项目理解与共享上下文，不替代 D/E/I。
- 如果历史决策、死胡同、某日状态和文件历史散在本机聊天里，而你又不想上常驻服务，加 L。L 补“历史检索 + 会话边界自动注入”，不替代 `CLAUDE.md` 常驻规则、D 的事实核对、E 的冲突裁决。
- 如果每次会话开始都要自动加载共享记忆、自动体检 hooks/索引/任务/同步，并且代理说“完成”前必须先跑仓库测试，加 M。M 补“完成前证据”和“启动体检”，不替代 D/I/E。
- 如果你正在选记忆 MCP，或已经装了 MCP 但只会查不会记，做 N。N 补“记忆工具选型 + 记录通路验证”，不替代 A/D/E/I/M。
- 如果任务跨会话、长程、有反馈，且你愿意维护持久记忆目录、保留 transcript、跑离线反思，加 O。O 补“记忆分层设计”：会话笔记、小型注入索引、按需搜索、dreaming 校正、wiki 表示。O 不替代 A 的手工落盘、C 的 vault 摄入、D 的事实核对、E 的冲突裁决、L 的历史检索、M 的完成闸门。
- 如果你已经在同一类问题上反复纠正 agent，想让纠正变成规则、又不想上常驻服务，加 P。P 补“从历史纠正里挖规则并附原文证据”，不替代 A 的手工落盘、D 的事实核对、E 的冲突裁决、I 的代码优先规则。

### 做法 A：只搭本地记忆骨架

#### 做法 A-1：单一 `memory/` 目录

1. 创建 `second-brain` 文件夹。前提：本地文件系统写权限。预期：得到一个与日常项目隔离的工作根目录。原文未指定路径，可自选。

```bash
mkdir second-brain
cd second-brain
mkdir memory
```

2. 在 `second-brain` 下创建 `CLAUDE.md`，写入一条记忆规则。原文第 4 步截断，规则全文未知；调研报告建议写法如下（这是报告建议，不是原文）：

```text
把每次会话中确认的长期有效信息追加到 memory 下的文件中；开始新任务前先读取 memory。
```

前提：自己确认规则目标位置和措辞。预期：Claude Code 在该目录下工作时按规则读取和追加长期信息。

3. 连续在同一个 `second-brain` 目录下开 Claude Code 做真实工作。前提：先只放少量非敏感材料。预期：积累出可观察的记忆文件。

#### 做法 A-2：`notes/` 与 `people/` 分目录（原文截断）

1. 创建目录：

```bash
mkdir second-brain
cd second-brain
mkdir notes
mkdir people
```

2. 原文在此截断，未说明 `people/` 内放什么、第三个文件夹叫什么。必须自己补一条读取规则（可复用 A-1 的 `CLAUDE.md` 规则），否则目录只是材料堆放。预期：Claude Code 在该目录下工作时能读到 `notes/` 和 `people/`；是否真的自动读取需要验证，原文未给提示词。
3. 选择：只需要一个长期信息落点，用 A-1 的 `memory/`；材料天然分事实/研究/想法与人物信息，用 A-2 的 `notes/` 和 `people/`；也可以并存，但要在 `CLAUDE.md` 里写清楚哪个目录放什么、何时读。

#### 做法 A-3：`MEMORY/`、`notes/`、`people/`、`projects/` 按话题分目录（原文截断）

1. 创建一个空文件夹作为项目根目录，并在其中打开 Claude Code。前提：本地写权限。预期：得到一个与日常项目隔离的工作根目录。
2. 建立按话题划分的目录：

```bash
mkdir -p MEMORY notes people projects
```

注意：采集到的正文在“创建MEMORY/、notes/、people/、projects/”处被截断，可能还有其它目录；不能把这里当成完整目录清单。
3. 在根目录创建 `CLAUDE.md`，加入一条常驻指令：让 Claude Code 把本次对话中确定的重要事项，按话题分别写入上面这些目录下的文件。原文最关键的“`CLAUDE.md` 里那一行”没有保存下来，需回原帖或视频补全；下面只是按原文意图自拟的占位，不是原文：

```markdown
## 记忆
每次对话结束前，把本次确定的重要决定、结论和待办，按话题分别追加写入 MEMORY/、notes/、people/、projects/ 下对应的 Markdown 文件；
每条写清日期与背景，不要覆盖旧内容，同一决定有变更时标注“变更”。
```

前提：自己确认规则目标位置和措辞；原文缺失，只能先小范围试。预期：会话结束前出现按话题写入的动作。
4. 下一次会话开始时先让 Claude 读这些文件，再开始工作。原文未写明这一步；不做这一步，落盘内容不会被自动用上。预期：新会话能引用上次文件中的决定，而不是重新问一遍。
5. 连续跑 3–5 次真实会话，每次结束人工检查文件是否写对、有无记错；同时做一个对照：同样的任务在不加这条指令的文件夹里跑一遍。止损线：两周内若没有减少重复解释，或错误记忆造成的返工多于节省的时间，降级为只借鉴“按话题分目录落盘”的思路。

### 做法 B：在 A 基础上接入 Google 数据源

1. 在 `second-brain` 文件夹中打开 Claude Code，安装 `GWS CLI`，以访问 Gmail、日历和云端硬盘。前提：本机已能运行 Claude Code，且有一个 Google 账号。关键限制：原文只说“安装 GWS CLI”，没有安装命令、包名来源或授权流程；必须先自行查证文档后再执行。
2. 先只开一项权限跑通，例如日历只读。前提：确认该项权限是你愿意交出的最小范围。预期：验证链路可用且不暴露全部数据。
3. 确认没有越权读取、没有把敏感内容写进记忆文件后，再逐步扩大权限。预期：权限范围随实际需要增长。

### 做法 C：用 obsidian-wiki 把 Markdown 目录变成可摄入、可提问、可清洗的知识库

1. 安装并初始化 vault。把 `~/brain` 换成你想放知识的文件夹。

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
2. 如果不想装 session hook，在 setup 时加 `--no-hooks`。预期：关掉 hook 后，记忆的注入与捕获需要手动触发。
3. 在智能体里打开任意项目，说一句：

```text
set up my wiki
```

不想碰终端时，直接把这一行交给智能体：

```text
https://github.com/Ar9av/obsidian-wiki — set up my wiki
```

4. 如果用 Claude Code，可以改走插件路线（不需要 Python，但插件只带 skills，不带 session hook 和 `obsidian-wiki` CLI）：

```text
/plugin marketplace add Ar9av/obsidian-wiki
/plugin install obsidian-wiki@obsidian-wiki
```

插件内的 skill 带命名空间，例如 `/obsidian-wiki:wiki-ingest`。
5. 喂数据：

```text
/wiki-ingest ~/research
/wiki-update
/wiki-capture
/wiki-history-ingest claude
```

预期：材料进入 vault；manifest 记录已摄入来源，第二次只处理增量。
6. 提问：

```text
/wiki-query what do I know about rate limiting?
/wiki-narrate MCP security
/wiki-digest week
```

7. 找回叫不出名字的历史会话（用 CLI，不是斜杠命令）：

```bash
obsidian-wiki sessions-build
obsidian-wiki sessions-query 'the auth bug with the weird retry loop'
```

8. 定期清洗 vault：

```text
/wiki-lint
/wiki-dedup
/wiki-status
```

9. 可选：在 Obsidian 里查看图谱。vault 本质是磁盘上的纯 Markdown 文件夹，可以 grep、可以推私有 repo、可以直接删；即便不引入 Obsidian，ingest/query/lint 链路仍然成立。
10. 想从代码里用（无 API key、无 embedding、无向量库、无网络）：

```python
from obsidian_wiki import Memory

memory = Memory('~/brain')
memory.remember('stack', 'Python, FastAPI', confidence=0.9)
memory.add('Postgres was chosen over MySQL for partial indexes.')
memory.search('postgres')
memory.recap()
```

11. 多智能体并发写入的前提：`index.md`、`log.md`、`hot.md` 以及 `_meta/` 下的 owner profile 与 todo index 都走同一个加锁、原子写入的 writer；如果你要多智能体同时写，别绕过这个 writer。

### 做法 D：让新会话先核对事实再接手（truongfelix/workflow）

核心一句话：handoff 是主张，脚本是事实；读写两侧跑同一个脚本，所以看到的是同一幅图。

1. 克隆模板到本机：

```bash
git clone https://github.com/truongfelix/workflow.git
```

2. 把模板拷进项目（只拷贝缺失文件，绝不覆盖已有文件）：

```bash
workflow/bin/adopt.sh ~/code/my-project
```

预期：模板文件进入项目；脚本打印它跳过了哪些文件并给出 diff 命令，并列出所有 FILL 标记。
3. 在项目里打开 Claude Code，直接给这段提示词：

```text
Set up the workflow: follow 'Adopt in a new project' in /path/to/workflow/README.md
```

4. 按顺序填 `.claude/ground-truth.conf`：每个 repo 一行（在 fork 里，算作“已推送”的 remote 是你自己的，不是 upstream），以及 KEEP_LOCAL 列出永远不能推送的分支。
5. 反复运行：

```bash
bash .claude/skills/session-start/ground-truth.sh
```

直到它以 `GROUND TRUTH: complete` 结束。结果不可读时脚本打印 UNKNOWN 并以退出码 2 结束，绝不算通过。
6. 填 `CLAUDE.md`：项目是什么、规则、handoff 规则、repo 与目录布局、命令。把里面原有的待办列表搬进 `BACKLOG.md`。
7. 填 `BACKLOG.md`：每个 repo 或文件树一节，从项目已有追踪物填。每条写：哪里错了或缺什么、指针、什么时候算完成。做完的条目删除而非打勾，历史交给 git。
8. 填 `questions.md`：所有者尚未做的决定，以及已经做过、但新人会推翻的裁决；每条带选项与建议。
9. 填两个技能的 FILL 项：项目特有的检查项，哪些是预期之内、不算新闻。
10. 仅工作区形态：在根目录 `git init`；首次提交前检查 `git status --ignored` 和暂存列表；扫密钥（`gitleaks`）；绝不追踪 datadir、密钥或二进制；创建私有 remote，且只在所有者同意后推送。
11. 闭环：跑一次 `/handoff`，让第一份 `notes/handoff.md` 从 ground truth 写出来。下一次会话用 `/session-start` 开始。
12. 日常固定动作：坐下时 `/session-start`，收工前 `/handoff`。预期：`/session-start` 运行 `ground-truth.sh`，从 git、GitHub 和本机读出事实，再读上一次的 handoff，报告两者不一致的地方，提出当天任务建议，然后等你决定；`/handoff` 运行同一个脚本，据此重写 handoff，更新各跟踪文件，并提交。
13. 升级：再跑一次 `bin/adopt.sh <project-root>`，它会列出每个被跳过的文件，并给出与当前模板对比的 `diff -u` 命令。合并通用部分，保留项目自己的 FILL 答案。`.claude/workflow-version` 记录项目上次取用的 commit。
14. 照做时的五条判据：主张和事实是两回事；做完的事删除，不打勾；读不出来的结果叫 UNKNOWN，绝不算通过；没被点名的东西，不算只存在于一块盘上；先建议，再等。

### 做法 E：用常驻指令让 agent 每次任务前先读知识库，冲突先问你（@coreyganim）

原文写“完整提示如下”，但采集到的正文只有三条规则要点，完整提示词没有出现在给出的材料里；下面代码块是按这三条要点整理的草稿，不是原文。

1. 打开所用工具的常驻指令入口（自定义指令 / 项目说明 / 仓库说明文件这一类位置）。前提：你的知识库能被这个工具读到。预期：指令随每次对话生效。
2. 把下面这组指令贴进去。

```text
在每个任务开始前，先阅读我的公司大脑（<路径/库名>）和个人大脑（<路径/库名>）。

如果我说的话与大脑中的内容冲突，不要直接采信任何一方：明确标记冲突，并同时引用两个版本（大脑里的版本 + 我这次说的版本）。

然后问我哪一个是对的。等我确认后，给我对大脑的确切编辑内容（要能直接照着改，而不是笼统建议）。
```

3. 把两个大脑的实际位置/入口填进占位符。前提：先自己确认 AI 真能读到这些位置。预期：读取动作真实发生。
4. 用一个你已知正确答案的任务试跑一次，确认它确实先读取了知识库，而不是直接回答。预期：能看到读取动作。
5. 故意说一句与知识库内容矛盾的话，看它是否按指令把两个版本都引用出来并请你裁决。预期：标记冲突 + 同时引用两版 + 问你哪个对。
6. 确认裁决后它给出的“大脑编辑”是否精确到可以直接执行（改哪个文件、哪一条）。若不精确，在指令里补充对输出格式的要求。预期：编辑内容可被直接采纳。

### 做法 F：用 akitaonrails/ai-memory 做跨会话长期记忆层

1. 先在测试机上做 Linux / macOS 原生安装。前提：能访问 GitHub releases 和 curl，无需 root。

```bash
curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh
ai-memory setup
```

相关开关：`--plan` 只打印计划不做任何改动；`--web` 把计划显示成浏览器页面；`--yes` 跳过询问；`--agent` 指定要接的 agent。装完后重启你的 agent，问它一句 “What do you remember about this project?”，如果它通过 ai-memory 回答，就说明接线成功。
2. Windows 走 PowerShell。前提：Windows 环境，或只考虑 WSL2。README 把“原生 Windows”标为 Experimental，更稳的路子是 WSL2 或 Docker Desktop。

```powershell
irm https://github.com/akitaonrails/ai-memory/releases/latest/download/install.ps1 | iex
ai-memory setup
```

3. Arch Linux / Fedora 走包管理器。

```bash
yay -S ai-memory-bin
# 或从源码构建：yay -S ai-memory
ai-memory setup
```

```bash
sudo dnf install ./ai-memory-*.rpm
ai-memory setup
```

4. macOS 菜单栏 App。前提：Rust 工具链 + Xcode / Swift 6。

```bash
git clone https://github.com/akitaonrails/ai-memory
cd ai-memory
./companions/ai-memory-macos/build.sh
open 'companions/ai-memory-macos/dist/AI Memory.app'
```

```bash
BIN='/Applications/AI Memory.app/Contents/Resources/runtime/ai-memory'
'$BIN' setup --no-service
```

5. Docker 路线。前提：Docker 或 Podman + 一个支持 MCP 的 agent CLI。注意：这段官方 quick-start 没有认证——容器没跑 `init`，所以不带 token 启动；服务只绑 loopback（`127.0.0.1:49374`）。两条接线命令：

```bash
ai-memory install-mcp   --client claude-code --apply
ai-memory install-hooks --agent  claude-code --apply
```

可把 `claude-code` 换成 `codex`、`opencode`、`gemini-cli`、`copilot-cli` 等。
6. 首选启动方式：用 `ai-memory run` 启动 harness。

```bash
ai-memory run claude
ai-memory run codex --yolo
ai-memory run --profile work claude
ai-memory continue
# 原文在 ai-memory run --f 处截断，不能照抄补全
```

7. 与现有做法的关系：F 可以替代 A 的骨架但更重；F 是自动捕获与会话注入，C 是主动 ingest/query/lint 的 vault；F 的 handoff 仍是“主张”来源；E 的常驻指令可以和 F 叠加；H 更偏团队记忆服务；J 是提示词节律，F 是服务化管线；L 是本地历史检索，F 是会话捕获与交接，两者可以并存，但都要靠 D 核对事实。
8. 试用与回滚：先在单机、单仓库、只接一个 agent 的情况下按 README 的两条命令装上并跑一到两周，用“新会话是否还要重新交代背景”来判断是否值得留下。

### 做法 G：用 stalemap 把依赖库在模型训练截止后的 API 变更注入给编码 agent

1. 先预览，不动文件：

```bash
npx stalemap
```

前提：Node 项目；有 lockfile 或 `node_modules`；能访问 npm registry 与 GitHub；知道当前会话用的模型。预期：看到变更预览和将要写入的笔记块，但不改动文件。
2. 写入笔记块：

```bash
npx stalemap sync
```

预期：笔记块位于 `<!-- stalemap:start -->` 与 `<!-- stalemap:end -->` 之间，块外文字不会被改动。Claude Code 读 `CLAUDE.md`；若笔记写在 `AGENTS.md`，需在 `CLAUDE.md` 里加 `@AGENTS.md`，或用 `--target CLAUDE.md` 指定目标。
3. CI 守门：

```bash
npx stalemap check
```

4. 手动跑 guard：

```bash
npx stalemap guard src/**/*.ts
```

预期：guard 把编译错误与匹配到的变更条目一起回给 agent。普通 `tsc` 钩子是 guard 的子集，二者不等价。
5. Claude Code 插件：

```text
/plugin marketplace add Umair/stalemap
/plugin install stalemap@stalemap
```

6. 其他 agent 一键配置：

```bash
stalemap setup --agent cursor
stalemap setup --agent codex --dry-run
```

原文明确提示：尚未在真实 Cursor / Codex / OpenCode 安装中验证过；Cursor 目前不把 `postToolUse` hook 的上下文传给模型。
7. 任意 MCP client：配置命令 `npx -y stalemap@latest mcp`。
8. GitHub Action：

```yaml
- uses: Umair/stalemap@main
  with:
    model: claude-opus-5-5
    # mode: comment
```

comment 模式需要 `permissions: pull-requests: write`。
9. 用参数控制成本与覆盖面：`--all`、`--margin`（默认 30 天）、`--budget`（默认 1800 tokens）、`--guides`、`--examples`、`--llm`；环境变量 `STALEMAP_GUARD_TSC=0`、`STALEMAP_GUARD_DEPRECATIONS=1`、`STALEMAP_CACHE`、`$STALEMAP_PRECOMPUTED_URL`。
10. 按需检索：

```bash
stalemap search <query>
```

11. 裁剪笔记（可选）：

```bash
stalemap probe
```

原文提醒：probe 任务直接点名旧 API，因此测的是“被指到时知不知道”，比“主动发现”容易。
12. 数据边界：包名与版本会发往 npm registry、GitHub 与 models.dev；源码不上传；使用 `--llm`/`--examples`/`--guides` 时类型 diff、release note 片段、指南文本与导入的 API 名会发往 Claude（不含代码）；`probe` 的提示词发给你选的 provider。

### 做法 H：用 hsuanshao/AgentMemory 做自托管、分层的团队记忆

1. 准备前提并确认许可证：0.4.0 起服务端为 BUSL-1.1，免费范围是评估、个人、非营利，以及最多 1 个部门、10 个成员的组织。
2. 交互式安装：

```bash
git clone https://github.com/hsuanshao/AgentMemory.git && cd AgentMemory
./install.sh
```

安装器会依次询问：存储后端（SQLite 默认 / 已有 PostgreSQL URL / 用 Docker 启动 PostgreSQL pgvector）；协调后端（单节点默认 / 已有 Redis / 用 Docker 启动 Redis）；LLM（OpenAI 兼容 API / Claude Code CLI / Antigravity CLI / Codex CLI）；CLI 的项目目录和暴露端口。最后创建第一个 admin 并显示一次性的登录 user key；这个 key 只显示一次，先存好。
3. 非交互安装（前提：已确定后端）：

```bash
INSTALL_STORAGE=postgres-docker INSTALL_COORDINATION=redis-docker ./install.sh --non-interactive
```

如果数据库在宿主机上，用 `host.docker.internal` 而不是 `localhost`。以后重启只需：

```bash
docker compose up -d
```

4. 不用安装脚本的手动部署：

```bash
cp .env.example .env
# 至少设 AGENT_MEMORY_API_KEY
docker compose up -d --build
curl -s -X POST http://localhost:8420/v3/internal/meta/user/init-admin -H 'Authorization: Bearer $AGENT_MEMORY_API_KEY' -H 'x-memory-department-id: default' -H 'content-type: application/json' -d '{"username":"admin"}'
```

服务地址：memory-core 为 `http://localhost:8420`，memory-panel 为 `http://localhost:8125`。
5. 建立用户、团队和 agent：用 admin user key 登录 Panel（默认 8125）。在 **Metadata** 下创建用户、创建团队、把用户按角色加入团队、创建 agent。客户端只用 user key 认证，不需要 `AGENT_MEMORY_API_KEY`；每次记忆调用都要带用户所属的 `team_id` 和 `agent_id`。
6. 接入客户端：README 没有在正文给出 `amem` 的安装命令，只指向 `docs/REMOTE-CLIENTS.md`。按该文档安装 `amem`，配置 Claude Code、Codex、Antigravity 或 Hermes 的 hooks/MCP 集成。
7. 选择 LLM 后端。用 OpenAI 兼容 HTTP 时：

```text
AGENT_MEMORY_LLM_PROVIDER=openai
AGENT_MEMORY_LLM_BASE_URL=...
AGENT_MEMORY_LLM_API_KEY=...
AGENT_MEMORY_LLM_MODEL=...
```

用本地 CLI 时，配置 `memory-core.yaml`：

```yaml
llm:
  provider: cli
  timeoutMs: 180000
  cli:
    command: claude
    args:
      - -p
    promptMode: stdin
    workingDir: ~/projects/my-app
    maxConcurrency: 2
```

8. 按规模选择存储和协调后端。默认 SQLite：每个部门一个文件，FTS5 全文检索，`sqlite-vec` 做向量 KNN；扩展加载失败时退化为暴力比较。PostgreSQL：每个部门一个 schema，tsvector + GIN，pgvector HNSW。Redis：管线状态、任务队列和分布式锁，可跑多个 memory-core 副本；队列是 at-least-once，租约默认 15 分钟并自动续期；锁用 `SET NX PX`，默认 TTL 10 分钟；不支持 Redis Cluster。
9. 理解并接受默认触发参数：warm-up 在 1→2→4→每 N 轮，或空闲 600 秒时触发；L1 抽取带 LLM 去重；L2 在延迟 90 秒且距上次 L2 至少 900 秒后执行，之后每 3600 秒扫一次；L3 在冷启动、每 50 条新记忆或某个 scene 请求更新时触发；每个 team+agent 最多 15 个 scenes。召回接口 `/v3/recall` 会先剥掉之前注入的块，再做 L1 混合检索（BM25 + 向量 + RRF k=60，无 embedding 时退回 BM25）。
10. 运维和自测：Panel 的 Monitor 提供蒸馏健康、生成日志和死信；`/health` 的 `stores.vectorIndex` 会报告 `sqlite-vec`、`brute-force`、`pgvector-hnsw`、`pgvector-exact` 或 `none`。升级用 `./upgrade.sh`，卸载客户端用 `./uninstall.sh client`，卸载服务端用 `./uninstall.sh server`，加 `--purge-data` 才删数据。
11. 最小试用：先以单团队、SQLite、本地 CLI 或 OpenAI 兼容端点做最小部署，只接入一个客户端，用 2—3 次真实会话验证跨会话召回能否减少重复交代。

### 做法 I：文档与代码冲突时以代码为准，并在回复里列出冲突点（@ai_database）

1. 确认你的编码代理会读取项目中的 `CLAUDE.md` 或 `AGENTS.md`。前提：项目允许创建或修改这类代理指令文件。预期：规则会在每次任务中生效。
2. 在对应文件中加入以下原文规则：

```text
当文档与现有代码存在冲突时，应遵循代码的写法，并在最后回复中列出发现的所有冲突点。
```

前提：确认写进哪个文件。Claude Code 读 `CLAUDE.md`；若规则写在 `AGENTS.md`，需在 `CLAUDE.md` 里加 `@AGENTS.md` 或用对应机制引入。预期：规则随每次任务生效。
3. 让代理执行一个涉及既有代码修改的小任务，并要求它照常给出最终回复。前提：任务附近存在已知的文档与代码不一致点。预期：能看到它是否按代码改、是否列出冲突。
4. 检查最终回复是否列出冲突点，并核对代码修改是否以现有代码为准，而不是按旧文档反向改动。预期：冲突被显式列出，改动遵循现有行为。
5. 若误报太多，先收紧规则措辞或限定“文档”的范围（例如只指 README/设计文档，不含代码注释），再试一次。预期：噪声下降。
6. 小范围试用：选一个有已知“文档落后于代码”问题的小仓库，加规则，做一个小型代码修改任务；与未加规则的同类任务对比返工次数。原文未给试用时长与量化指标。

### 做法 J：用一条常驻提示词把 Obsidian 库变成 Codex 的跨项目记忆，并按固定节律整理（@NIxinhai0）

材料边界：原文只有一段提示词，末尾在“这样你的 Codex”处截断；没有目录结构、没有 Codex 的接入与读写权限配置、没有定时触发实现、没有效果验证。

1. 先有一个固定的知识库目录。原文假定该库已存在，未说明如何创建：在 Obsidian 里新建一个 vault，记住它的绝对路径。不想用 Obsidian 也可以——vault 本质是磁盘上的 Markdown 文件夹。
2. 确认 Codex 能读写该目录。原文未给接入方式，需按你用的 Codex 环境自行解决。前提：无法确认读写就不要再往下走。预期：Codex 能在该路径下读文件、写文件。
3. 先定目录结构。原文未规定，但“按需读取”在单文件堆砌下会失效；至少把项目、决策、偏好分开（这是调研报告的建议，不是原文）。预期：后续能按主题读取，而不是每次全量加载。
4. 首次录入：把下面这段提示词原样发给 Codex。

```text
你帮我配置一个 Obsidian 知识库作为 Codex 跨项目永久记忆。
将我长期以来所有偏好、决策习惯、全部项目以及项目细节录入并整理归纳 每日任务前按需读取，每晚十点整理当日项目沟通记录同步更新知识库每周做一次复盘 沉淀项目信息减少冗余读取
```

前提：第 1—3 步已完成。预期：长期偏好、决策习惯、项目清单与细节被写入库中。
5. 明确“当日项目沟通记录”的来源与位置。原文只说“整理当日项目沟通记录”，没说记录从哪来；不指定来源，这一步会变成让 Codex 凭空总结。预期：每晚同步有确定输入。
6. 落实“每晚十点”和“每周”的触发方式。原文只写了时间点，没写由谁触发；如果你的环境没有定时能力，就改成人工在固定时间发起同一条指令。预期：节律真实发生，而不是停留在提示词里。
7. 每日任务前让 Codex 先检索相关笔记再动手。原文措辞是“按需读取”，不是全量加载；如果它每次都全量读，读取成本会随库增长。预期：只读与当前任务相关的条目。
8. 每周复盘时做去重与压缩，合并重复条目、淘汰过期信息。预期：库不随时间长成噪声堆。
9. 把迭代后的提示词存回库里，形成可复用模板。预期：下次换项目或换机器能直接复用。
10. 必须保留人工抽查。错误或过期的记忆被自动写回，会在后续任务里被反复读取并放大；至少每晚写回后抽查一批条目，错误率上升就把自动写回改成先审后写。

### 做法 K：用 Mycel 维护一张“活的项目地图”，作为编码 agent 的共享上下文

1. 安装并启动 Mycel。前提：Node.js 22 或更新；克隆在项目外（如 `~/mycel`），一个 Mycel 服务本机所有项目。

```bash
git clone https://github.com/mathew5612/mycel.git
cd mycel
node mycel.mjs open
```

预期：后台启动并打开 `http://127.0.0.1:4317`。Windows 可双击 `Mycel.cmd`；macOS 先 `chmod +x Mycel.command` 再双击。注意：最小试用段原文写的是 `node mycel.mjs start`，与安装段的 `open` 不一致，先以 `node mycel.mjs --help` 和实际可用命令为准。
2. 在你的项目文件夹里让智能体自举：

```text
Read the Mycel guide and follow it: curl -s http://127.0.0.1:4317/agent
```

Windows PowerShell 把 `curl` 换成 `curl.exe`。预期：智能体连接文件夹、完成自我配置，然后开始建图。
3. 按智能体类型选接入方式。Claude Code：

```bash
node <mycel>/mycel.mjs plugin --install
```

Codex、Cursor、Gemini / Antigravity、VS Code、Windsurf、Cline、Claude Desktop：

```bash
node <mycel>/mycel.mjs plugin --agent <name>
```

本地模型（Ollama、LM Studio、llama.cpp、vLLM）：

```bash
node <mycel>/mycel.mjs chat
```

4. 智能体侧常用命令（在项目文件夹内执行）：

```bash
node mycel.mjs init
node mycel.mjs context --brief
node mycel.mjs build map.json
node mycel.mjs apply ops.json
node mycel.mjs wait
node mycel.mjs doing 'reading server.mjs' --progress 40
node mycel.mjs mark cart passed
node mycel.mjs check
node mycel.mjs watch
node mycel.mjs health
```

说明：`init` 连接当前文件夹；`context --brief` 把整张图导出为 Markdown；`build` 按结构逐步画图并自动布局；`apply` 基于你读到的 revision 批量提交操作；`wait` 阻塞到人在 Mycel 里操作或别人改图；`doing`/`mark` 显示进度与状态；`check` 跑各块配置的测试命令并实时染色；`watch` 文件一变就把对应块标为可能过时；`health` 报 red/outdated/unchecked/planned、TODO 与疑似密钥字符串。
5. 图上的人机协作规范：空白处右键建块或便签；在块上右键建子块；从块的任一边缘拖到另一个块连线；双击带子图的块进入；底部滑杆按四档折叠；点 “Finish edits” 把你所有改动作为一个事件整体发给智能体；智能体的建议以虚线高亮显示，可 Accept / Reject；History 列最近 200 条改动；Health 高亮需要处理的项；指令要用“块”而不是“文件”。
6. 跨虚拟机（可选）：主机上 `node mycel.mjs remote on`；VM 内智能体执行：

```bash
curl -fsS http://<host address>:4317/install.sh | sh
```

必要时装 Node.js 和一份 Mycel，然后要一个 4 位码申请接入；你核对 4 位码后在 Mycel 里点 Allow。默认只在 `127.0.0.1` 监听；经 API 写入需要 `.mycel/token` 里的令牌。
7. 与已有做法的关系：K 补的是项目理解与共享上下文层，不替代 A/B/C 的记忆与知识库，不替代 D 的事实核对，不替代 E 的冲突裁决，不替代 I 的代码优先规则，也不替代 L 的历史检索。地图本身也是“主张”。

### 做法 L：用 thenwise 把本机 Claude Code 历史变成可检索、可按需注入的记忆库

材料边界：安装命令、`setup`/`doctor`/`status`、七个 `memory_*` 工具、hooks 的 token 上限与触发条件、隐私开关、团队命令、`config.json` 配置项都可核对；效果数字来自作者自述的隐藏答案盲评，材料未包含 `docs/eval.md` 的题目、评分细则和原始数据，不能独立核验。

1. 先做基线，不安装。选一个非关键但历史较丰富的 Claude Code 仓库；准备一组有标准答案的历史问题，覆盖“为什么这样决定”“以前试过什么”“某日当时是什么状态”“某文件的历史”。把答案藏起来，用 plain Claude Code 新会话回答并记录。预期：得到未安装时的答对率、引用来源与耗时基线。
2. 安装插件。前提：已使用 Claude Code；Node 22.16+；有 git 仓库。

```text
/plugin marketplace add dheerajponnaganti/thenwise
/plugin install thenwise@thenwise
```

或：

```text
/plugin install thenwise --marketplace dheerajponnaganti/thenwise
```

如果要在终端直接用 `thenwise` 命令：

```bash
npm install -g thenwise
```

3. 初始化并检查：

```bash
thenwise setup
thenwise doctor
thenwise status
```

预期：项目被收录，数据库开始建立，doctor 没有未处理的错误。
4. 日常把历史检索当作前置步骤：

```text
/thenwise:status
/thenwise:resume [topic]
/thenwise:why <words>
/thenwise:tried <words>
/thenwise:asof <date> <words>
/thenwise:deadend <what failed>
/thenwise:decide <what was decided>
/thenwise:backup
/thenwise:inbox
```

对应工具：`memory_search`、`memory_current`、`memory_why`、`memory_tried`、`memory_asof`、`memory_trace`、`memory_read`。预期：新会话先查历史再动手。
5. 理解自动注入的默认行为。默认 hooks 会在会话开始后台同步；最近 7 天有会话的仓库会加最多 200 token 的启动简报；压缩后加最多 1,500 token 的 resume brief；问过去的问题最多给 3 个线索（约 300 token）；打开文件时最多加 600 token 的死胡同和决策，每个文件每会话一次。要关闭其中两类自动提示，在 `config.json` 中写：

```json
"hooks": { "prompt_map": false, "startup_brief": false }
```

6. 控制隐私和删除。某次聊天不记录：在提示开头或结尾加 `[no-memory]`。删除单条聊天或整个项目：

```bash
thenwise forget <session id>
thenwise forget <project folder>
```

暂停/恢复某项目：

```bash
thenwise off [--project <folder>]
thenwise on [--project <path>]
```

彻底停用并列出手动删除文件：

```bash
thenwise uninstall
```

注意：原文称密钥会在写入前替换为 `[secret masked]`，团队服务器再脱敏一次；但也说明会漏掉跨两行折断的 key，且 `process.env.API_KEY` 这类代码仍可读。
7. 生成可读笔记库：

```bash
thenwise vault write
```

输出到所选 vault 的 `_thenwise/` 文件夹。预期：历史变成可 grep、可人工复核的 Markdown。
8. 团队版按需再加。前提：团队自己有一台小服务器；网络访问时要 https 反向代理。

```bash
thenwise team serve --dir ~/team --console <hub build>
thenwise team invite alice --dir ~/team
thenwise team join <url> <token>
thenwise share <note>
thenwise team search <words>
thenwise team share-chats <repo path>
thenwise team unshare-chats <project or session id>
```

9. 可选自动化，默认关闭。原文给出 `config.json` 的 `team.auto_share`、`team.auto_share_projects`、`capture.auto` 配置项；建议先不开，等手动流程稳定后再评估。
10. 把 L 放进现有分工。L 管“历史检索 + 会话边界注入”；`CLAUDE.md` 和 Claude 自带记忆仍管常驻规则；A 管手工落盘；C 管可摄入/可提问的 vault；F/H 管服务化记忆与团队记忆；D 管事实核对；E 管冲突裁决；I 管文档与代码冲突。
11. 小范围试用与判定。先在一个非关键仓库跑完第 1—5 步，用同一组历史问题盲评；再连续用一到两周，记录重复交代率、历史问题答对率、无关注入比例和 hook 错误数。

### 做法 M：用 ECX 让会话先加载共享记忆、启动时体检、宣布完成前先跑测试（saksham10arora-dotcom/everything-claude-codex）

材料边界：只依据 README，未查看仓库代码、安装脚本和测试日志。以下命令均可从 README 抄出，但“可重复运行、不覆盖已有文件”需安装时验证。

1. 备份并做基础安装。先复制一份笔记库到独立目录，备份 `~/.claude` 等现有配置。前提：Claude Code；Python 3.9+；macOS/Linux；若要多代理共享记忆再装 Codex。

```bash
git clone https://github.com/saksham10arora-dotcom/everything-claude-codex ~/ecx
cd ~/ecx && ./install.sh
```

2. 按需装完整栈，不要一上来全开：

```bash
./install.sh --vault ~/vault --name Ada --with-search --with-cron --with-phone
```

前提：`~/vault` 是你的笔记库路径；手机模式使用你拥有的私有 GitHub 仓库。
3. 在笔记库中打开 Claude Code，执行 `/boot`。预期：README 称给出 30 秒简报。验证方法：在 `hot.md` 写一个唯一标记，重开会话看首轮是否知道它。
4. 启用共享记忆。核心是 `hot.md` 保存当前有效信息，hook 在第一条消息前加载它和最近会话；每次 `/compact` 后自动刷新。Codex 通过 `AGENTS.md` 读取相同文件。注意：`hot.md` 仍是“主张”，不是 git 事实。
5. 启用双代理同步（可选）。README 称每次消息前，hook 把另一个代理的最新聊天内容交给当前代理；也可用 `sync.py send` 直接互发，日志在 `agents/AGENT_CHAT.md`。只用 Claude Code 时跳过此步。
6. 配置“测试通过才算完成”。在仓库中设置 `.ecx/test-command`，写入该仓库实际测试命令；关闭则写：

```text
off
```

预期：hook 会在 Claude Code 或 Codex 尝试结束时先跑测试，失败就把失败输出送回代理；只在实际有改动时运行；能自动发现 npm、pytest、unittest、cargo、go 和 make 测试；连续失败 3 次后放弃。验证方法：在一个当前测试可通过的仓库里故意制造一个失败测试，确认代理结束时被拦住并收到失败输出。
7. 启用健康检查。README 称 `doctor` 覆盖 hooks、索引、任务和同步等 16+ 项检查，并在每次 Claude Code/Codex 会话开始时运行；健康时静默，异常时给出警告和修复提示。
8. 可选：三种库检索。`--with-search` 后，按 README 包括按语义的 ChromaDB、按关系的 LightRAG 图、按图片的 CLIP 检索，并由 router 选择；每晚重新索引。注意：关系图默认可能把笔记文本发到 Ollama 云，若不能接受，用 `ECX_LLM_MODEL` 改为本地模型。
9. 可选：手机接力。每次回复后把笔记和记忆同步到私有 GitHub 仓库；手机端用 Claude app 或 ChatGPT app 在云上操作该仓库；语音捕获落到 `inbox/`，由 GitHub Action 合并。前提：仓库必须设为私有。
10. 与现有做法的关系。M 的 `hot.md` 是“主张”，不替代 D 的 `ground-truth.sh`；M 的测试闸门是“完成前证据”，不替代 I 的“以代码为准并列出冲突点”，也不证明测试覆盖足够；M 的 doctor 只查工具健康，不查结论真假。

### 做法 N：先按七条判据选一个记忆 MCP，再分开验证“能查”和“会记”

材料边界：这是一份由 Glen 团队维护的 25 个记忆 MCP 横向清单；原文只详细写到前 11 名，第 12 名以后只有表格摘要，并在 Engram 处截断。清单由 Glen 维护、Glen 排第一，star 数和效果数字都是弱信号；不要把它当成独立评测。

1. 先确认客户端有没有 hooks 能力。原文反复强调：很多方案的 MCP 连接只负责“检索”，不负责“记录”——Glen 的 MCP 连接“search only”，要记录得装插件钩子；claude-mem 的 MCP 侧只有四个搜索工具，捕获全靠六个生命周期钩子；Supermemory 也要另装插件才有自动捕获。预期：如果你需要自动记录但客户端不能挂 hook，就不要选“只有 MCP 连接”的方案。
2. 用七条判据给场景打分：是否维护中；是否真的提供“记忆” MCP；捕获模型（hooks/后台抽取的自动捕获 > 只在模型决定调用写工具时才保存）；检索质量的证据（注意几乎每个 LoCoMo/LongMemEval 数字都是自报、用的模型和 judge 各不相同，权重低于可复现的评测脚本）；配置成本；团队共享；许可与定价透明度。另：star 数是弱信号。预期：得到一张自己的候选表，而不是只看排名。
3. 按场景初选：团队共享、每个同事的智能体互相 recall → Glen；个人托管记忆 + 免费额度 → Mem0；自托管 + 混合检索 → Hindsight；记忆要能当文件读、改、进 git → Basic Memory；本地自动捕获（Claude Code 场景）→ claude-mem / agentmemory / mcp-memory-service。预期：先选 1 个候选，不要一次装多个自动捕获器。
4. 按原文命令安装（原样照抄；每条命令的前提写在前面）。Glen（前提：先有账号和 org）：`https://mcp.tryglen.com/mcp`；`npx @tryglen/cli@latest install`。Mem0（前提：走客户端浏览器登录流程，或把 API key 当 bearer token）：`npx mcp-add --name mem0-mcp --type http --url "https://mcp.mem0.ai/mcp" --clients <client>`。Supermemory：`https://mcp.supermemory.ai/mcp`。Zep：`https://api.getzep.com/mcp`。Hindsight：`claude mcp add --transport http hindsight http://localhost:8888/mcp/<bank_id>/`。mcp-memory-service：`pip install mcp-memory-service`；Codex 用户另跑 `python3 codex/install_hooks.py`。Basic Memory：`uv tool install basic-memory --prerelease=allow`。claude-mem：`npx claude-mem install`。agentmemory：`npx -y @agentmemory/agentmemory@latest`。Cognee：`docker run -e TRANSPORT_MODE=http --env-file ./.env -p 8000:8000 cognee/cognee-mcp:main`；`claude mcp add cognee -t http http://localhost:8000/mcp`。预期：只装一个候选，记下它的端点、认证方式、是否带 hook/插件。
5. 分开验证“能查”和“会记”两条通路。装完连接后先做一次检索测试，再做一次“关掉会话重开”的记录测试；如果重开后检索不到刚才的内容，说明只通了检索侧，hook 没装上。原文点名的典型错误：`npm install -g claude-mem` 只装 SDK、不注册任何钩子。预期：两条通路都通过才留下。
6. 先设隐私与写入边界，再放真实工作内容。原文给出的可操作开关：Glen 的 `glen off`、`glen incognito`、`glen silent`，以及 macOS 菜单栏录制指示器；claude-mem 用 `<private>` 标签把内容排除在存储之外；Zep 管理员可把连接设为只读，并有账号级写入总开关。预期：先用非敏感材料，确认开关有效再扩大范围。
7. 放进现有分工：N 只解决“选哪个记忆 MCP、怎么装、怎么验证记录通路”；它不替代 A 的手工落盘、D 的事实核对、E 的冲突裁决、I 的代码优先规则、M 的完成前测试闸门。

### 做法 O：按记忆组件做持久目录、会话笔记、小型注入索引、按需搜索和 dreaming

材料边界：来源是一篇 Anthropic 文章，原文没有给出可直接复制的命令、配置或逐字提示词。以下步骤按原文描述整理，落地时需按所用 agent 框架改写。

1. 建立跨会话记忆目录。让每个新会话可以读取一个持久文件夹；会话开始时可以是 fresh session，但能检索该目录中的文件。原文在 CL-Bench 中仅告诉 Claude“有记忆文件夹可用”，强模型即可有效使用。前提：运行环境支持跨会话持久目录；预期：新会话能读到旧会话写入的笔记。
2. 让模型在会话中按显著性写笔记，而非预设过细规则。对强模型，给“何时值得记”的判断空间；固定规则（如只记录失败）可能削弱记忆带来的提升。原文建议对前沿 Claude 只给简单指导：当人要求或明显值得记住时创建记忆笔记，判断交给模型。原文中的记忆笔记示例（可作为“写什么”的样例，不是提示词模板）：

```text
If 3+ balls fail in a row, VARY the timing (insert extra wait presses between menu steps) - the catch landed right after doing this.
```

3. 对旧模型增加“读记忆、检验假设”的引导。原文发现 Sonnet 4.6 常不读记忆目录、也不检验错误理论；提示它回答前先读记忆文件、显式检验理论后，基准分数接近翻倍。新模型（Sonnet 5）多数会自行读取。预期：旧模型在回答前出现读取与检验动作。
4. 把错误转化为学习循环。任务有正确答案/评分反馈时，让 agent 记录失败、提出错误原因的理论、测试理论、把验证过的规则写回记忆；成功答案也标记为 confirmed，错误答案写 correction。原文中强模型最终把规则、规则依据、旧题答案和陷阱警告 consolidated 到记忆。预期：同一错误不再被反复继承。
5. 定期运行 dreaming（离线反思）。保留原始 session transcript/log，在交互空闲或会话之间让 Claude 对照 transcript 检查记忆笔记，修正错误、生成新笔记/表示、把重要笔记提升到顶层。前提：有额外 compute，且原始日志可读。预期：错误笔记被纠正，重要笔记出现在更靠前的位置。
6. 为大语料构建 wiki 作为记忆表示。让 Claude 增量创建/修改带链接的 wiki 页面，合并重复、对照来源检查主张；多 agent 时用共享日志协调，每个 session 基于前序进度继续。原文用约 350,000 个文件、约 420M token 的内部文档语料，经 128 个 session 构建 wiki。注意 wiki 可能变得比原文还大，需修剪。
7. 把 wiki 与搜索工具结合。原文中搜索+wiki 在多文档综合题上优于单独搜索；wiki 单独使用也有帮助，但最佳组合是搜索负责定位、wiki 负责结构化知识。
8. 控制注入层大小。每会话预加载的记忆要少；可只加载 `MEMORY.md` 的前 200 行或 25KB 作为索引，显示“知道什么、去哪里找”，其余按需读取/搜索。原文提醒注入错误笔记会污染每个会话，且更长的指令文件会降低遵循度。预期：注入层保持小，按需读取发生。
9. 按任务目标定制记忆生长指令。合同任务中，最初多 agent 同时写共享合同条款表，导致 57 条中仅 41 条保留；改为每份合同一个页面、单 agent 写、逐字引用条款后，57/57 条保留，基于 wiki 的 brief 评分从 72% 升到 100%。说明记忆结构应围绕任务最关键事实设计。
10. 用第二次 dreaming 补链接和缺口。原文示例中第二次 dreaming 找到 9 个指向缺失页面的链接并改指到已有页面，还新增 3 个页面（含索引）。预期：链接缺口被补上，索引页更新。
11. 与现有做法的关系：O 是记忆设计层，可叠加 A（手工落盘骨架）、C（vault 摄入与查询）、E（冲突裁决）、D（事实核对）、L（历史检索）、M（完成闸门）。O 的会话笔记、注入索引和 wiki 仍是“主张”，不能替代 D；E 负责“你说的话 vs 记忆记录”的冲突；A 负责最小落盘；C 负责可摄入/可提问的库；L 负责本机历史检索；M 负责“完成前跑测试”。
12. 最小试用：选一个跨会话、有标准答案/可评分的长程任务（如多文档问答或重复数据库查询），保留原始 transcript，挂载一个持久记忆目录。先跑无记忆基线；再只开 memory notes；再加一次 dreaming 校正；最后加 wiki+搜索。每一步用同一组任务和同一评分标准对比。指标见下节。

### 做法 P：用 learn-from-lessons 把本机历史纠正提炼成 lesson，筛过再注入

材料边界：README 很短，没有 lesson 的实际文本样例、没有 `dream` 用的提示词、没有注入后的样子、没有配置项字段、没有 lesson 存储路径；效果数据只有作者一人的自评（one person's data so far）。以下命令来自 README 原文，步骤与筛选标准是本手册按原文意图整理的。

1. 先确认素材量。前提：Python 3.9+、有 pipx、本机已留下 Claude Code / Codex / opencode 的对话记录。选一个你确实反复纠正过 agent 的项目，只在这一个项目上试。先备份现有 `CLAUDE.md`（或 `AGENTS.md`）。

```bash
pipx install git+https://github.com/assassin808/learn-from-lessons
```

2. 盘点本机有多少可提炼的纠正：

```bash
lessons scan
```

预期：输出本机的 session 数与纠正数。这两个数是后面所有步骤的素材基线；纠正数很少就先停，不要往下推。

3. 把纠正提炼成 lesson。前提：本机有可用的 `claude` 或 `codex` CLI 及其额度——README 明确说这一步用你自己的 CLI。注意这一步会把相关对话内容送进模型。

```bash
lessons dream
```

预期：产出 lesson；每条带来源对话与原文引用。

4. 人工过一遍产出，这一步不能省：

```bash
lessons view
```

按列表、关系图、原文证据三种视角看。只保留同时满足三条的条目：附了原文引用；你认可它的表述；能写成“遇到 X 就做 Y”。泛泛而谈、过度概括、原文引用对不上的，删掉。README 没有给 lesson 样例，只能靠你自己判断。

5. 不要一次全量注入。先按场景限定范围，再写入：

```bash
lessons index --scenario writing-paper
lessons inject --target CLAUDE.md --apply
```

前提：确认目标文件路径；`--apply` 会写入，先备份。预期：`CLAUDE.md` 里出现一小段 lesson 索引，而不是全部 lesson 正文。若注入进的是 `AGENTS.md`，Claude Code 读的是 `CLAUDE.md`，要在 `CLAUDE.md` 里加 `@AGENTS.md`，或用对应机制引入。

6. 按当前上下文检索相关 lesson（README 的例子：写论文时不该加载 git push 相关的教训）：

```bash
lessons search "about to launch the eval runs" --context "$(git log -1)"
```

预期：只召回与当前场景相关的条目，而不是把整个 lesson 库塞进上下文。

7. 选择接入方式，按你用的 agent 挑一个：

- Claude Code：用仓库自带的 `skill/SKILL.md`。
- Codex / opencode：用仓库自带的 `integrations/AGENTS.md` 片段。
- 任意支持 MCP 的客户端：

```bash
lessons mcp
```

8. 落地前读两份文档：`docs/GUIDE.md` 和 `docs/LESSON_FORMAT.md`。README 指向它们，但正文没有展开 lesson 格式与索引机制；不读就无法判断注入内容和存储位置是否符合预期。

9. 与现有做法的关系：P 补的是“从历史纠正里挖规则并附原文证据”，不替代 A 的手工落盘、D 的事实核对、E 的冲突裁决、I 的代码优先规则。lesson 是对过去某次对话的归纳，是“主张”：涉及分支是否推送、PR 是否合并、接口是否真的改了，仍要用 D 或等价手段核对当前事实。

10. 不要指望它自动跑。README 没有提供任何基于时间、事件或状态的自动触发机制（没有 cron、watch、hook 的说明）；scan / dream / view / inject 全是手动命令。要么你按节律手动跑，要么自己另做调度。

11. 最小试用：只在一个历史较长的项目上，按第 1—5 步走一遍，保留注入前的 `CLAUDE.md` 作 A/B 对照；注入后取 10–20 个新任务，统计“同一类纠正”被你重复说了几次。

## 怎么判断变好了

通用最小试用：选一个非敏感项目、一个 agent、一个记忆层，连续用一到两周；同时保留一个不装该记忆层的同类任务作对照。记录重复交代率、召回成功率、无关注入比例、错误记忆造成的返工、隐私开关是否有效、hook 错误数。出现越权读取或敏感内容被写入，立即停。

- A-1/A-2/A-3/B：建 `second-brain`，只放少量非敏感材料；A-1 写 `CLAUDE.md` 规则；A-2 建 `notes/` 与 `people/`；A-3 建四目录并加常驻写入规则，连续跑 3–5 次会话，人工检查写入准确率、陈旧/冲突条目占比、复用率、每周清理分钟数。两周内没有减少重复解释，或错误记忆返工多于节省时间，降级为只借鉴“按话题分目录落盘”。B 先只开一项权限跑通。
- C：同一模型、同一 vault、同一批问题，唯一变量是有没有装 obsidian-wiki；ground truth 用 networkx 而不是本项目自己的代码。原文对照数据：回答耗时 81s → 19s、正确率 44% → 83%、工具调用 9.9 → 4.6、API 成本 $0.202 → $0.208；收益集中在结构性/图关系类问题。样本 n=2，作者自评 early。
- D：clone 后运行 `bin/adopt.sh`，先填好 `.claude/ground-truth.conf` 并把 `ground-truth.sh` 跑到 `GROUND TRUTH: complete`，再用 `/session-start` 和 `/handoff` 包住每天的工作。观察脚本报出的“handoff 与事实不一致”条目数是否下降；出现 UNKNOWN 或退出码 2 时当作没通过。
- E：一次就能跑完。挑 5 个已知答案的任务，其中至少 2 个故意说一句与知识库矛盾的话；记录读取命中率、冲突召回、误报数、编辑可采纳率、额外耗时和 token。
- F：先在测试机、单仓库、只接一个 agent 的情况下按 README 装上并 `ai-memory setup`，重启 agent 后问 “What do you remember about this project?”；连续 1～2 周对比“新会话是否还要重新交代背景”。
- G：先在一个 JS/TS 单 `package.json` 项目跑 `npx stalemap` 预览，再 `npx stalemap sync` 写入，CI 加 `npx stalemap check`，Claude Code 侧装插件；同一模型、同一批任务做装与不装对照，记录会话通过率、首次编辑使用过期 API 的比例、单会话成本与时长。
- H：先按第 1—11 步做单团队、SQLite、一个客户端的部署；用 2—3 次真实会话看召回是否减少重复交代，再决定是否扩到第二个成员或第二个 agent。记录召回相关性、隔离是否正确、越权与泄漏、运维成本与许可证。
- I：选一个有已知“文档落后于代码”问题的小仓库，加规则，做一个小型代码修改任务；与未加规则前对比是否列出冲突点、是否按现有代码改、返工是否减少。至少跑 2—3 个同类任务。
- J：选一个进行中的项目，建最小 vault，按“任务前读取、每晚整理、周末复盘”跑一到两周；每晚写回后随机抽 10 条，标记准确、过期、错误。对比上下文重建时间、重复解释次数、每晚整理耗时、冗余条目占比、抽查错误率。
- K：选一个 2 万至 10 万行、自己有测试命令的中型仓库；约半天启动，正常开发一到两周；记录 `health` 里 red/outdated/unchecked/planned 的数量、项目理解成本、上下文有效性、维护成本、验证闭环、上下文体量和被过时块误导的次数。修正过期块的成本高于节省的沟通成本，就退回只研究。
- L：先做基线，不安装；用一组有标准答案的历史问题盲评。安装后跑 `thenwise setup`、`thenwise doctor`、`thenwise status`，用同一组问题重问；再测“该不该主动插入”、隐私开关和 hook 错误（`thenwise logs --errors`）。作者自测个体 93% vs 37%、团队 88% vs 17%，个体 token 约一半、1.9 倍更快（14 秒 vs 26 秒），团队 token 少 39%、1.5 倍更快（16 秒 vs 24 秒），但材料未给出评测题目、评分细则和原始数据，需自行复现。
- M：先两周基础安装，只验证 `/boot` 唯一标记、测试闸门、doctor 静默/警告和双代理唯一标记；故意制造失败测试，统计被拦次数、失败输出是否回到代理、连续失败 3 次是否停止；两周后再决定是否加搜索和手机模式。
- N：先只装一个候选，用一次检索测试和一次“关会话重开”的记录测试判断它是否真的会记；再连续用几次真实会话，记录重复交代率、召回相关性、无关注入比例、hook/插件错误、隐私开关是否按预期工作。不要用厂商自报的 LoCoMo/LongMemEval 数字做验收。
- O：用同一组跨会话、有标准答案/可评分的任务做四段对照：无记忆基线 → 只开 memory notes → 加一次 dreaming → 加 wiki+搜索。记录任务得分或满足评分标准的比例、重复错误率、错误笔记被后续会话读取的次数、记忆文件数、注入层大小（若采用 Claude Code 式注入，是否控制在约 200 行/25KB 量级）、每问 token 消耗、需要人工纠错的次数、完成时间、wiki 是否比源文档还大、是否出现失效链接。原文报告：文档语料 25 题中，dreaming 从 2 到 128 sessions 使 graded criteria 从 13% 到 48%；搜索+wiki 从 54% 到 61%，搜索单独 53%，仅 wiki 最佳 48%，每问约省 20,000 tokens；Harvey LAB 多文档题 87% vs 73%；合同任务 41/57→57/57，brief 72%→100%。这些是原文数据，不是你的验收结论。判断改善：同一任务集上得分高于基线，且 token/时间不显著恶化；或达到同等得分但 token 明显下降；错误规则能被 dreaming 修正而不是被反复继承。若 wiki 在单文档检索任务没有增益，应保留搜索而不强行建 wiki。
- P：先看第 2 步的素材量——`lessons scan` 扫出的 session 与纠正数太少，后面不会有好结果。注入前后各取 10–20 个新任务，统计同一类纠正被重复说了几次，这是最直接的指标，也对应该工具 47 个新情境实验的口径。再看：`lessons view` 里带原文引用、可直接执行的 lesson 占比（低于一半就不要往下推）；注入后 `CLAUDE.md` 增长了多少、每次会话多花多少 token；agent 是否开始频繁追问、拒绝本来可以做的事（原文特意声明“without becoming over-cautious elsewhere”，这正是要盯的反向指标）；注入的 lesson 有多少条在新会话里真的被触发过、触发后是否真的避免了纠正。淘汰条件：扫不出足够纠正、或 lesson 大多没有可追溯的原文引用、或注入后同类纠正次数没有下降，就停在研究阶段，只借鉴它“从历史纠正里挖规则并附证据”的思路。

试多久：A-1/A-2/B 用 1～2 周；A-3 连续跑 3–5 次会话，两周止损；C 先小范围试；D 先小范围试再谈全面采用；E 一次 5 个任务；F 单机单仓库 1～2 周；G 先在一个 JS/TS 单 `package.json` 项目小范围试；H 先用 2—3 次真实会话验证接线和召回，再观察 1～2 周；I 至少 2—3 个同类任务；J 一到两周；K 约半天启动、观察一到两周；L 先跑完一轮历史问题，再在单仓库连续用一到两周；M 先两周基础安装；N 先一个候选、几次真实会话；O 先跑完一轮四段对照，再连续用一到两周；P 先在一个项目上走完 scan → dream → view → inject，再用 10–20 个新任务对比同类纠正次数，持续一到两周。

## 常见坑

- second-brain 原有第 4 步截断，`CLAUDE.md` 规则全文未知，不能直接照抄“所有重要细节”；需要自己界定什么算长期有效信息。
- A-2 原文在 `people/` 处截断，第三个文件夹和后续用法缺失；不能把“建 `notes/` 和 `people/`”当作完整 second-brain 设置。
- A-3 原文在“创建MEMORY/、notes/、people/、projects/”处截断，最关键的 `CLAUDE.md` 那一行没有保存下来；本手册中的 A-3 规则是按原文意图自拟的占位，不是原文。完整目录清单也可能不止四个。
- A-3 用大写 `MEMORY/`，A-1 用小写 `memory/`；两者可并存，但要在 `CLAUDE.md` 里写清楚哪个目录放什么、何时读。
- `notes/`、`people/`、`projects/` 只是目录结构，不会自动让 Claude Code 读取；必须配 A-1 的 `CLAUDE.md` 规则或常驻指令。
- `people/` 有隐私问题；团队共享或同步到远端前先确认边界。A-3 的写入归类靠模型判断，可能记错或记错位置，必须人工抽查；记忆文件会累积陈旧信息，需要定期清理。
- A-3 多人协作时同一文件易冲突；如果多人/多 agent 同时写，先约定分工或改用带并发写入控制的方案。
- 原文没有 GWS CLI 的安装命令、包名来源和授权流程，不能凭想象执行；也未说明授权范围、凭证存储方式与撤销方式。
- “所有重要细节”没有界定范围，容易把噪声写进 `memory`，需要人工清理。做法 A 未说明记忆如何被召回：是每次会话自动读取，还是需要显式提示。
- C 作者自评项目“early”，效果数据只有 n=2 的小样本。C 的一个具体失败机制：普通智能体追踪连接关系时会走 `index.md`——它链接到每一页，于是“找到”一条毫无意义的短路径，并据此把 `index` 列为 vault 最重要的页面之一；两次运行都犯同一个错。skill 查询的图排除了这类记账文件，所以正确答案才可达。
- 安装 obsidian-wiki 时，原文明确说不要用 `uvx`；用 `uv tool install` 或 `pipx install`。Claude Code 插件路线只带 skills，不带 session hook 和 CLI；要会话开始注入回顾、结束提醒捕获就得走 pip 安装路线。
- D 本次材料只到 README，脚本实现与效果未经验证；不要把它当作已经证明能减少所有记忆失真。D 的推进发生在会话边界，不是无人值守后台；README 没有描述自动调度。
- D 的工作区形态要求根目录 remote 必须是 PRIVATE，首次提交前要检查 `git status --ignored`、扫密钥，且绝不追踪 datadir、密钥或二进制。
- 主张和事实的优先级：A 的 memory、C 的 vault、F 的 wiki/handoff、H 的召回结果、J 的知识库、K 的地图、L 的历史检索结果、M 的 `hot.md`、N 的 MCP 召回、O 的索引、P 的 lesson 都可读，但先跑 ground truth；否则可能把旧笔记、过期地图、旧聊天或过窄的教训当事实继续施工。
- E 最大的材料缺口：原文写“完整提示如下”，但采集到的正文里没有这段完整提示，本手册中的提示词是按三条要点重写的草稿。E 的“不告诉 AI 怎么用第二大脑，它就毫无用处”“修复只要 90 秒”都只是作者主张；传播数据是传播指标，不是效果证据。E 没提的成本与风险：每次任务前读库带来的 token/时间开销、冲突误报造成的打断、让 AI 直接改写知识库的出错风险。
- F 的所有收益说法都只有项目自述、没有独立验证；F 要常驻服务并采集提示词与工具调用，先单机、单仓库、只接一个 agent。F 的 Docker quick-start 没有认证——容器没跑 `init`，不带 token 启动；服务只绑 loopback，但本机进程和浏览器页面可以访问。不要把该端口暴露到外网。
- F 的 Windows 原生支持被 README 标为 Experimental，更稳的路子是 WSL2 或 Docker Desktop。F 的原文在 `ai-memory run --f` 处截断，不能补全。F 不能替代做法 D：它的 handoff 仍是主张。
- G 只支持 JavaScript / TypeScript 项目，且只支持一个 `package.json`，尚无 workspace 遍历。G 对无自带类型的包只能靠 release note；`@types/*` 不做 diff。G 的预注册盲测数据是作者自测，只测了两个 Claude 模型；报告正文在“通过率：”处截断。
- G 的 Cursor / Codex / OpenCode `setup --agent` 原文明确说尚未在真实安装中验证过；Cursor 目前不把 `postToolUse` hook 的上下文传给模型。普通 `tsc` 钩子是 guard 的子集，二者不等价。
- G 的 `npx stalemap check` 会在笔记块缺失或过期时 exit 1；不要忽略这个失败。笔记写在 `AGENTS.md` 时，Claude Code 读的是 `CLAUDE.md`；要在 `CLAUDE.md` 里加 `@AGENTS.md`，或用 `--target CLAUDE.md`。
- G 的插件和 hook 走 `npx -y stalemap@latest`，因此始终用最新 npm 版本；要固定版本需自己另做控制。`--budget` 默认 1800 tokens；不要为了塞全量 changelog 把预算撑爆。`probe` 直接点名旧 API，测的是“被指到时知不知道”，比“主动发现”容易。comment 模式需要 `permissions: pull-requests: write`。
- G 的数据边界：包名与版本会发往 npm registry、GitHub、models.dev；`--llm`/`--examples`/`--guides` 会把类型 diff、release note 片段、指南文本与导入的 API 名发往 Claude（不含代码）；`probe` 的提示词发给你选的 provider。
- H 的许可证是硬约束：0.4.0 起服务端为 BUSL-1.1，免费范围只到评估、个人、非营利，以及最多 1 个部门、10 个成员的组织。H 的 README 没有在正文给出 `amem` 安装命令，只指向 `docs/REMOTE-CLIENTS.md`；也没有给效果数据。
- H 会捕获每次对话并蒸馏；先用非敏感内容试，并确认成员私有对话、agent 共享 scenes/persona 的隔离符合预期。SQLite 是每部门一个文件，`sqlite-vec` 加载失败会退化为暴力比较；数据量上来后要评估 PostgreSQL/pgvector。
- H 的多副本需要 Redis；队列是 at-least-once，节点崩溃会重投，任务要幂等；Redis 锁 TTL 10 分钟，且不支持 Redis Cluster。默认触发不是实时：L2 有 90 秒延迟且至少间隔 900 秒，L3 在冷启动、每 50 条新记忆或 scene 更新时触发；刚聊完立刻问“你还记得吗”可能还没蒸馏完。
- H 的客户端只用 user key，不需要 `AGENT_MEMORY_API_KEY`；每次记忆调用要带 `team_id` 和 `agent_id`。不要把 admin 的 Gateway key 当客户端 key 用。Panel 其他成员默认只读；admin user key 只显示一次。手动部署要先 `cp .env.example .env` 并至少设 `AGENT_MEMORY_API_KEY`；数据库在宿主机时用 `host.docker.internal` 而不是 `localhost`。`/health` 的 `stores.vectorIndex` 可能显示 `none`、`brute-force` 等；先确认它符合预期，再判断召回质量。
- I 的原文只有一条规则和一句目的说明，且在“据说Claude”处截断。“以代码为准”是一个前提假设：代码本身可能有 bug 或正处于重构中；按代码改之前仍要人复核。规则写进 `AGENTS.md` 而 agent 只读 `CLAUDE.md` 时不会生效。冲突点全列进最终回复会增加噪声；误报频繁时先收紧“文档”的范围和“冲突”的判定。
- J 的原文只有一段提示词，且在“这样你的 Codex”处截断；目录结构、读写权限接入、定时触发这三项最关键的信息都不在原文里。J 没有规定知识库结构；直接用单文件堆砌，会让“按需读取”退化成全量加载或干脆读不到。
- J 没有冲突处理规则：它默认把当日内容写回库，写错或过期的条目会在后续任务里被反复读取并放大。“每晚十点”“每周复盘”只是时间点，原文没说由谁触发；环境没有定时能力时，必须改成人工在固定时间发起。“当日项目沟通记录”来源未定义；不指定来源，这一步会变成让 Codex 凭空总结。
- K 目前只有 README，未看到 `docs/reference.md`、`src/agent-guide.md` 正文，也没有实际跑过；项目 0.22 早期、约 30 stars、单一作者，无生产使用案例。安装段用 `node mycel.mjs open`，最小试用段原文写 `node mycel.mjs start`，两者不一致；先以 `node mycel.mjs --help` 和实际可用命令为准。
- K 的地图质量取决于所用智能体能力与代码库规模；大仓库下 `context --brief` 的体量与 token 成本无数据。K 默认只在 `127.0.0.1:4317` 监听；跨 VM 要 `remote on`、4 位码 Allow，每台机器一个可随时吊销的 key；经 API 写入需要 `.mycel/token`。不要把端口暴露到外网。
- K 的本地模型 `mycel chat` 对项目文件只读；它具备全部 Mycel 工具，但不能替代你改代码。K 没有聊天功能，对话始终在智能体自己的窗口里；不要把 Mycel 当聊天界面。地图过期会误导 agent：被 `watch` 标为过时的块要先修，再让 agent 依据它改代码。
- L 目前只有 README 和作者自述的隐藏答案盲评数据；`docs/eval.md` 的题目、评分细则和原始数据不在材料里，93% vs 37%、88% vs 17%、14 秒 vs 26 秒等数字不能当定论。L 有版本门槛：Node 22.16+；一行安装需要 Claude Code 2.1.275+；历史必须在 `~/.claude/projects`。非 Claude Code 工作流或没有历史数据的仓库，装了也检索不到东西。
- L 默认每日一次 npm 版本检查；不想让它联网，用 `thenwise update-check off` 关闭。脱敏会漏掉跨两行折断的 key，`process.env.API_KEY` 这类代码仍可读；不要用真实密钥测试。`thenwise forget` 够不到 Claude Code 自有文件和 Time Machine 副本。
- L 的自动注入有 token 预算：启动简报最多 200 token、压缩后 resume brief 最多 1,500 token、问过去最多 3 个线索约 300 token、打开文件最多 600 token。无关提示多时，用 `config.json` 关掉 `prompt_map`/`startup_brief`。hook 错误不会让聊天失败，但会静默进日志；用 `thenwise logs --errors` 查。团队模式要自托管服务器、https 反向代理和 token 管理；客户端除 localhost 外拒绝 plain http；服务器宕机时共享排队。
- L 的历史记录是“主张”，不是当前事实：旧记录可能已被较新记录覆盖，也可能当时就记错。涉及分支是否推送、PR 是否合并、后台任务是否还在跑，仍要用 D 的 `ground-truth.sh` 或等价手段核对。L 不替代 `CLAUDE.md` 常驻规则；它读取 `CLAUDE.md`，但不会替你维护它。也不替代 E 的冲突裁决。
- M 只有 README，未查看代码和安装脚本；“可重复运行、不覆盖已有文件、先保存 `.ecx-bak` 备份”是 README 声称，必须安装时验证。先备份 `~/.claude` 和笔记库副本。M 的 hooks 在会话开始、第一条消息前、每次消息前、回复后和结束时执行；如果真实 Claude Code payload 与 hook 预期不匹配，可能静默失败。先用 `/boot` 和唯一标记验证。
- M 的 `doctor` 称覆盖 16+ 项检查并给“精确修复”，但 README 没有给出单独运行命令，也没说明修复具体做什么。`.ecx/test-command` 必须写仓库真实测试命令；原文没有给示例命令，自动发现 npm、pytest、unittest、cargo、go、make 的准确率也未给数据。
- M 的测试闸门“连续失败 3 次后放弃”是作者说法；如果代理在失败后反复改错，先看失败输出是否真的回到代理，再看测试命令是否本身不稳定。双代理同步只对 Claude Code + Codex 成立；只用 Claude Code 时不要开 agent-sync。`agents/AGENT_CHAT.md` 会记录代理间聊天，注意其中是否含敏感内容。
- M 的关系图检索默认可能把笔记文本发到 Ollama 云；用 `ECX_LLM_MODEL` 改本地模型，并确认实际端点。手机接力要求私有 GitHub 仓库；这条链路会把内容放到云端。先只用非敏感材料试。M 的“每天使用 6 个月、支撑 37 个已交付项目、同步低于 0.1 秒、安装 30 秒、27 个测试、21 个 hooks、17 个 skills、16+ 项 doctor 检查”都是 README 自述。它的“测试通过才算完成”只证明你写下的那条命令跑过了；不证明测试覆盖足够、不证明代码符合文档、不证明分支已推送。
- N 的最大误解：装了一个 MCP 连接就以为会记录。原文反复说很多方案只负责检索；Glen 的 MCP 连接 search only，要记录得装插件钩子；claude-mem 的 MCP 侧只有搜索工具，捕获靠六个生命周期钩子；Supermemory 要另装插件。`npm install -g claude-mem` 只装 SDK、不注册任何钩子；必须用安装器并验证记录通路。
- Basic Memory 用 `uv` 安装时必须带 `--prerelease=allow`，否则会静默装到旧版本。Cognee 需要 `LLM_API_KEY`；原文明确 Claude Code 不提供 MCP sampling，所以借不到宿主模型。claude-mem 安装器会引导登录并默认起一个 30 天试用的托管 observer；试用到期后压缩会回落到你的 Anthropic 套餐，除非订阅。用 `--provider host` 可让推理留在本地。mcp-memory-service 的 Codex 用户要另跑 `python3 codex/install_hooks.py`；只装 Python 包不等于 Codex 会自动记录。
- Zep 自报 LoCoMo 94.7%，ByteRover 复跑得到 75.1%；原文把它作为“自报数字不可横向比较”的争议案例。Glen 清单由 Glen 团队维护、Glen 排第一；star 数是弱信号，monorepo 的 star 会高估单个 server 的使用度。原文只详细写到前 11 名，第 12 名以后只有表格摘要，并在 Engram 处截断；不要把它当作完整 25 项评测。
- 记忆 MCP 的权限要逐个看：Glen 按每条 observation 在召回时校验；Zep 有 OAuth 2.1 + PKCE、ABAC、只读连接；Cognee 默认开 `ENABLE_BACKEND_ACCESS_CONTROL` 按用户隔离 dataset；Graphiti 的 group ID “无认证”被列为弱点。不要把“有 team 字段”当成有权限控制。
- O 原文没有给出可直接复制的命令、配置或逐字提示词；本手册只能按设计描述整理步骤，落地要自己改写。注入层不能大：只加载 `MEMORY.md` 前 200 行或 25KB 作为索引；更长指令文件会降低遵循度，注入错误笔记会污染每个会话。
- O 的 wiki 可能膨胀到比源文档还大；需要修剪、合并重复、检查失效链接。单文档检索任务里 wiki 没有明显增益，搜索即可。dreaming 需要额外 compute，且原文把“何时创建记忆”“dreaming 频率”列为开放问题；不要假设跑一次就永久有效。
- O 对强模型可给判断空间；固定规则（如只记录失败）可能削弱记忆带来的提升。弱模型需要更明确的“先读记忆、显式检验理论”提示。合同任务教训：多 agent 同时写共享条款表会丢条目；改为每份合同一个页面、单 agent 写、逐字引用条款。O 的数据多来自 Anthropic 自家 Claude 模型与 Managed Agents 环境，部分对比是单次运行或特定任务，不能直接外推；需要在自己的任务上验证。
- P 目前只有作者一人的数据、30 stars，属于早期个人项目；README 没有 lesson 文本样例、没有 `dream` 提示词、没有注入后样子、没有配置项字段、没有 lesson 存储路径。这些都要读 `docs/GUIDE.md` 和 `docs/LESSON_FORMAT.md` 才能落地。
- P 的素材完全依赖你已有的历史对话质量与数量；新用户、新项目或很少纠正 agent 的人，`lessons scan` 可能扫不出足够的纠正，后面几步就无从谈起。
- P 的“全本地运行”是 README 声明，没有给数据流向说明；`lessons dream` 会调用你本机的 `claude`/`codex` CLI，这部分内容实际上会进模型。是否算“纯本地”要自己确认，敏感仓库先别跑。
- P 的 lesson 三层结构（principle / rules / cases）和“被观察到两次即 verified”是设计主张，原文只给了设计理由（引用 Anthropic 的 agent memory 文章），没有对照数据。不要因为标了 verified 就当事实。
- P 没有自动触发：scan / dream / view / inject 全是手动命令，README 没有 cron、watch、hook 的说明。指望它自己“越用越懂你”会落空。
- P 的 lesson 是对过去某次对话的归纳，可能过窄（只在那一个 repo 成立）、过度概括（把一次例外当通则）或当时就记错。注入前必须回查原文引用；注入后仍要用 D 核对当前事实。
- P 的注入会增加 `CLAUDE.md` 体积与每次会话的 token 成本，也可能让 agent 变得过度谨慎、频繁追问。原文特意声明“without becoming over-cautious elsewhere”，这正说明它是需要盯的风险。
- P 的读取器目前只明确支持 Claude Code、Codex、opencode；README 在 Contributing 里说正在找人写 Cursor、Aider、Gemini CLI、Cline 的读取器。用这几个工具的，先别指望 P。

## 证据与来源

- second-brain 原有 `memory/` 规则侧：来源是 @Bober_smart 的推文/调研报告。原文给出 4 步清单，第 4 步在“保存到……”处截断；无命令示例、无规则全文、无效果验证。传播数据为 494 次点赞、79 次转发、28 条回复——这是传播热度，不是效果证据。
- second-brain 目录变体侧：来源是 @kinderlayer 的推文/调研报告（70 赞、10 转发、24 回复）。原文只给出 `second-brain`、`notes/`、`people/` 三个目录中的前两个半，在 `people/` 处截断；除 `mkdir` 外无命令示例、无提示词、无配置、无效果数据。
- A-3 四目录变体侧：来源是 @sumika45379 的推荐型推文（67 赞、2 转、1 回复），转述另一条带视频的原帖。原文称在空文件夹中创建 `MEMORY/`、`notes/`、`people/`、`projects/`，再在 `CLAUDE.md` 加一行让 Claude Code 把上次对话决定按话题写入；但采集正文在目录列表处截断，最关键的 `CLAUDE.md` 指令原文缺失。只能给 try，不能给 adopt。
- obsidian-wiki 侧：来源是 Ar9av/obsidian-wiki 的 README。作者自评项目“early”，效果数据只有 n=2 的小样本。对照方法为 Claude Sonnet、headless、真实 38 页 vault；ground truth 用 networkx。原文对照数据：回答耗时 81s → 19s、正确率 44% → 83%、工具调用 9.9 → 4.6、API 成本 $0.202 → $0.208。
- truongfelix/workflow 侧：来源是该仓库 README（MIT，32 stars）。本次材料只到 README，脚本实现与效果未经验证。README 给出一份完整的 `/session-start` 输出样例（含 3 条与上周五 handoff 的不一致告警、当天 3 项带完成判据的任务、2 条等待裁决的问题）。仓库自身有 CI 徽章，`test/run.sh` 测 `adopt.sh` 与 `ground-truth.sh`，CI 在 Linux/macOS/Windows 三种系统上跑。
- @coreyganim 侧：来源是一条推文（101 赞、6 次转发、14 次回复）。原文给出三条指令要点，并主张“建了第二大脑却不告诉 AI 怎么用，它就毫无用处”“修复只要 90 秒”。这些判断没有对照、案例或数据支撑。关键材料缺口：原文写“完整提示如下”，但采集到的正文未包含该完整提示，本手册中的提示词是按三条要点整理的草稿。
- akitaonrails/ai-memory 侧：来源是该仓库 README（MIT，Rust 单二进制）。README 给出 capture→consolidate→recall→handoff 管线、各平台安装方式、`ai-memory run` 启动方式；并称默认路径零 LLM 调用、真相源是 git 托管的 Markdown、数据库可重建、跨 agent 交接是 claim-once 协议。收益说法目前只有项目自述，没有独立验证。
- Umair/stalemap 侧：来源是该仓库 README。调研报告称预注册盲测 held-out v4：66 个任务，按种子从 33 个流行 npm 包在某三个月窗口内发布的所有 breaking / deprecation / behavior change 中抽取；每任务每臂每模式每模型 3 个 session；构建在任何 v4 结果产生前冻结为 `freeze/v4-final`；只有两层 bootstrap 求出的区间不含 0 才算胜。调研结论给出 89% vs 无辅助 68% vs 普通 tsc 钩子 73%，但报告正文在“通过率：”处截断，具体表格无法引用。只支持 JS/TS 与单个 `package.json`；只测了两个 Claude 模型且为作者自测。
- hsuanshao/AgentMemory 侧：来源是该仓库 README。它描述了自托管、面向团队的长期记忆服务：L0 原始对话、L1 facts、L2 scenes、L3 persona；召回用 BM25 + 向量 + RRF；权限结构是部门→团队→成员/agent。README 给出安装、部署、Panel、LLM 后端、存储选择、默认触发参数、`/health`、升级卸载命令。材料明确说明：没有在正文给出 `amem` 安装命令；没有效果数据；0.4.0 起服务端为 BUSL-1.1，免费范围是最多 1 个部门、10 个成员的组织。
- @ai_database 侧：来源是一条推文/调研报告，建议在 `CLAUDE.md` 和 `AGENTS.md` 中加一条规则：文档与现有代码冲突时以代码为准，并在最后回复中列出所有冲突点。原文在“据说Claude”处截断，没有数据、案例、前后对比或具体实验。
- @NIxinhai0 侧：来源是一条推文/调研报告，互动量为 55 赞、3 转、6 回复，属于个人经验分享。原文只有一段提示词，要求在 Codex 中配置一个 Obsidian 知识库作为跨项目永久记忆；原文末尾在“这样你的 Codex”处截断，没有给出知识库目录结构、Codex 的读写接入方式、定时触发实现，也没有任何效果验证或案例。
- mathew5612/mycel 侧：来源是该仓库 README。项目 0.22、约 30 stars、单一作者、MIT；命令清单、各智能体接入表、端口 `127.0.0.1:4317`、Node 22+、`.mycel/token` 写令牌、测试命令 `node --test test/*.test.mjs` 可核实。README 主张智能体能自己连文件夹、读代码、画出并持续维护项目地图；`check` 能按块跑测试命令并染色；`health` 能扫出 TODO 和疑似密钥字符串；`watch` 文件一变就把对应块标为可能过时。这些是作者设计主张，无实测。
- dheerajponnaganti/thenwise 侧：来源是该仓库 README 与调研报告。可核对内容：安装命令、`setup`/`doctor`/`status`、七个 `memory_*` 工具、hooks 的 token 上限与触发条件、隐私开关、团队命令、`config.json` 配置项；数据目录 `~/.thenwise` 或 `THENWISE_HOME`；默认不发送遥测，只有每日一次 npm 版本检查默认开启。效果数据来自作者自述的隐藏答案盲评：个体 93% vs 37%、团队 88% vs 17%；个体 token 约一半、1.9 倍更快（14 秒 vs 26 秒），团队 token 少 39%、1.5 倍更快（16 秒 vs 24 秒）；2,500 条聊天安装后 84 秒可记起；hooks 约 50ms。原文链接 `docs/eval.md`，但材料未包含评测题目、评分细则和原始数据，无法独立核验。
- saksham10arora-dotcom/everything-claude-codex（ECX）侧：来源是该仓库 README。仓库 31 stars、MIT；README 声称 27 个测试覆盖 hooks/installer/doctor，测试于 macOS 和 Linux、Python 3.9 到 3.12；声称 21 个 hooks、17 个 skills、16+ 项 doctor 检查、3 种检索、2 个代理共享记忆；作者自称每天使用 6 个月、支撑 37 个已交付项目；双代理消息同步“低于 0.1 秒”；安装“30 秒”。这些均为 README 自述，未提供独立基准、测试日志、失败案例统计或代码审查结果。
- Glen-Web-App/best-agent-memory-mcp 侧：来源是 Glen 团队维护的 25 个记忆 MCP 横向清单。清单把 25 个方案在存储形态、捕获模型、团队共享、许可和部署成本上摊在同一张表里；原文反复强调很多 MCP 连接只负责检索，记录要靠插件钩子或生命周期钩子；并给出七条判据、场景初选、安装命令、隐私开关和“分开验证能查/会记”的方法。局限：清单由 Glen 团队维护、Glen 排第一；star 数和效果数字多为厂商自报；几乎每个 LoCoMo/LongMemEval 数字都是自报，模型栈和 judge 不同，不能横向比较；Zep 自报 94.7%，ByteRover 复跑得到 75.1%。
- Anthropic “The components of agent memory” 侧：来源是一篇 Anthropic 文章，调研结论建议小范围试：用持久记忆目录、会话日志、小型注入索引和按需搜索搭建基础，再用 dreaming 离线校正并逐步构建 wiki；原文给出了可操作的设计模式和评测数据，但缺少可直接复制的命令或提示词，需在自己的任务上验证。原文把智能体记忆定义为 Claude 从经验中获得、跨会话保留并可读取的上下文知识；不包括改权重、单次会话内学习、压缩摘要。组件包括：会话内写 memory notes；离线 dreaming 回看日志/transcript 来纠错、生成笔记、构建表示、把笔记提升到记忆层级顶部；用 wiki 等表示组织大量知识；用小型注入层（如 MEMORY.md 前 200 行/25KB）做索引，其余按需搜索。数据/案例：CL-Bench 数据库任务；Pokémon Red 中 Sonnet 3.7 写 413 个文件/225 个文件夹、得 1 枚徽章，Fable 5 写 9 个文件/2 个文件夹+global.md、得 4 枚徽章；Opus 5.5 用小型笔记通关。文档语料约 350,000 文件/420M token，25 题，dreaming 从 2 到 128 sessions 使 graded criteria 从 13% 到 48%；搜索+wiki 从 54% 到 61%，搜索单独 53%，仅 wiki 最佳 48%，每问约省 20,000 tokens；Harvey LAB 多文档题 87% vs 73%；合同任务 41/57→57/57，brief 72%→100%。作者主张：dreaming 有用；强模型给判断空间比固定规则好；注入层必须小；wiki 需要维护否则会膨胀/产生错误。局限：多为 Anthropic 自家 Claude 模型与 Managed Agents 环境；部分对比是单次运行或特定任务，不能直接外推；原文没有给出可直接复制的命令/配置/完整提示词，只指向 cookbooks；dreaming 需要额外 compute，频率和“何时创建记忆”仍未解决；wiki 在单文档检索任务无增益，且可能大于源文档；长指令降低遵循度。
- assassin808/learn-from-lessons 侧：来源是该仓库 README。可核对内容：`pipx install git+https://github.com/assassin808/learn-from-lessons`；`lessons scan` / `dream` / `view` / `inject --target CLAUDE.md --apply` / `index --scenario` / `search ... --context` / `mcp`；随仓库提供 Claude Code skill（`skill/SKILL.md`）和给 Codex/opencode 的 `integrations/AGENTS.md`；细节文档在 `docs/GUIDE.md`、`docs/LESSON_FORMAT.md`。README 自述：读取 Claude Code、Codex、opencode 的已有对话记录；把“你纠正 agent 的时刻”转成带原文引用的 lesson；lesson 分 principle / rules / cases 三层；每条标注来源对话，被观察到两次后标记 verified；默认只加载一个小索引。效果数据：47 个与 lesson 来源不同的“新情境”上，agent 遵循用户规则的比例无 lesson 时 85%、有 lesson 时 98–100%，且声称“在其他地方没有变得过度谨慎”；测试在仓库 `eval/` 目录，但材料没有给出 eval 内容。作者自陈是“one person's data so far”，30 stars，属于早期个人项目。作者主张（缺原文数据支撑）：“Every time you correct your coding agent, it should learn”；三层结构与“两次即 verified”的有效性只给了设计理由（引用 Anthropic 的 agent memory 文章），没有对照数据；「全本地运行」是 README 声明，未给出数据流向说明，而 `lessons dream` 会调用本机 claude / codex CLI，这部分内容实际上会进模型。README 在 Contributing 里明确说正在找人写 Cursor、Aider、Gemini CLI、Cline 的读取器，即当前尚不支持这几个。
- 证据强度提示：A-1、B 只有步骤清单和传播数据；A-2 只有目录设置和传播数据，原文截断；A-3 只有一条推荐型推文，原文在目录列表处截断且关键规则缺失，无任何效果数据；C 有对照实验数据，但样本极小且作者自评 early；D 只有 README、样例输出和模板自身 CI；E 只有一条推文和三条指令要点；F 只有 README 和可复制命令；G 有预注册盲测设计，但只支持 JS/TS、只测两个 Claude 模型且为作者自测，报告正文在通过率处截断；H 只有 README，缺少效果数据，且许可证对团队规模有约束；I 只有一条规则和一句目的说明，原文截断；J 只有一段提示词和传播数据，缺三项关键实现信息；K 只有 README，项目早期、无量化证据；L 有可核对命令和隐私开关，但效果数字为作者自测；M 只有 README，安装脚本、hooks 真实 payload、doctor 修复内容、测试自动发现准确率均未验证；N 有可复制的安装入口、七条判据和隐私开关，但清单由厂商维护、排名有利益冲突、效果数字多为自报，且原文只详细写到前 11 名；O 有设计模式和评测数据，但无命令/提示词，且多为 Anthropic 自家环境；P 有可复制的命令链和一份 47 情境自评，但只有作者一人数据、README 极短、关键格式与提示词均未给出。所有数据都不能当作“这套做法一定有效”的证明。
- 作者主张（缺少支撑）：建独立文件夹、接入 GWS CLI、单开 `memory` 子目录、在 `CLAUDE.md` 写死记忆规则；second-brain 目录变体的“可直接复制的第二大脑设置”；A-3 的“加一行就能按话题自动沉淀决策”“准备约 5 分钟”；obsidian-wiki 的“知识是编译而非堆积”、manifest 增量摄入、每条主张打标、查询成本随规模基本不变；workflow 的五条判据；@coreyganim 的“不告诉 AI 怎么用第二大脑就毫无用处”“90 秒修复”；ai-memory 的跨 agent/项目/机器、团队共享、无 LLM 记忆老化、写入上限约 700/s；stalemap 的“训练截止后依赖 API 变化是 agent 默认不知道自己不知道的工作”“普通 tsc 钩子是 guard 的子集”“probe 比主动发现容易”；AgentMemory 的 L0-L3 分层、团队共享 scenes/persona、BM25 + 向量 + RRF、默认触发参数；@ai_database 的“以代码为准能减少按过时文档改代码”；@NIxinhai0 的“配置一个库就能形成跨项目永久记忆”“每晚整理、每周复盘能减少冗余读取”；Mycel 的“地图保持存活”“智能体边看你边画图”“四档层级足以表达一个项目”“不往任何地方发送数据”“不写入你的项目”；thenwise 的“100% 本地运行”“搜索毫秒级”“较新记录覆盖同一问题时会标注”“团队共享前预览和脱敏”；ECX 的“可重复运行、不覆盖已有文件”“测试失败会把代理打回并附失败输出”“doctor 给精确修复”“双代理同步低于 0.1 秒”“安装 30 秒”“每天使用 6 个月、支撑 37 个已交付项目”；Glen 清单的“前 11 名排序”“每个 LoCoMo/LongMemEval 数字可横向比较”“star 数能代表使用度”；Anthropic 文章的“dreaming 有用”“强模型给判断空间比固定规则好”“注入层必须小”“wiki 需要维护否则会膨胀/产生错误”；learn-from-lessons 的“每次纠正都该让 agent 学会”、三层 lesson 结构、两次即 verified、全本地运行、注入后不会过度谨慎。
- 调研报告给出的建议（不是原文）：规则示例“把每次会话中确认的长期有效信息追加到 `memory` 下的文件中；开始新任务前先读取 `memory`”；A-3 的占位规则和 3–5 次会话、五项指标、两周止损线；先只开一项权限跑通；重复交代率、召回成功率、记忆文件质量、越权与泄漏、对照组等指标；C 用同一模型、同一 vault、同一批问题做对照；D 在长期项目上小范围试；E 的提示词草稿与 5 个已知答案任务的试用方式；F 先单机、单仓库、只接一个 agent 跑 1～2 周；G 先预览、再写入、CI 加 check、Claude Code 侧装插件；H 先单团队、SQLite、一个客户端，2—3 次真实会话验证；I 把规则原样加入 `CLAUDE.md`/`AGENTS.md` 并在有已知不一致的仓库中小范围试；J 选一个进行中的项目建最小 vault，按“任务前读取、每晚整理、周末复盘”跑一到两周；K 选一个 2 万至 10 万行、自己有测试命令的中型仓库，克隆到项目外，Claude Code 装插件，建 concept + mechanics 两档地图，给 3–5 个关键块配测试命令，正常开发一到两周；L 先在单个 Claude Code 仓库小范围试用，用隐藏答案的历史问题做前后对比；M 先复制笔记库、备份配置，只跑基础安装，在一个可回滚测试仓库启用 `.ecx/test-command`；N 先按七条判据给场景打分，只装一个候选，用一次检索测试和一次“关会话重开”的记录测试验证记录通路；O 选一个跨会话、有标准答案/可评分的长程任务，保留原始 transcript，挂持久记忆目录，按“无记忆基线 → memory notes → 一次 dreaming → wiki+搜索”四段对照，用任务得分、重复错误率、注入层大小、每问 token、人工纠错次数、完成时间、wiki 体积和失效链接判断；P 先在一个反复纠正过 agent 的项目上跑 scan 看素材量，再 dream、逐条人工审核、按场景限定后 inject，保留注入前的 `CLAUDE.md` 做 A/B，用“同一类纠正次数、带引用的 lesson 占比、过度谨慎率、上下文成本”判断。
- 仅为推测的部分：second-brain 原有第 4 步规则的目标位置推测指向 `memory` 目录；原文未界定“重要细节”；未说明记忆召回机制、GWS CLI 授权范围与撤销方式；A-2 的第三个目录、`people/` 内容与更新规则、提示词和效果均缺失；A-3 的完整目录清单、`CLAUDE.md` 指令原文、内容分工、更新规则和效果均缺失；obsidian-wiki 的 Cursor / Hermes / OpenClaw 支持细节未证实；workflow 的脚本实现与效果未验证；E 中“具体在哪个入口写常驻指令”需按工具确认；F 的 `ai-memory run --f` 处原文截断，Docker quick-start 未包含认证步骤；G 的通过率表格截断；H 的 `amem` 安装命令、TLS 细节和客户端升级流程未在 README 正文展开；I 的“据说Claude”之后内容缺失；J 的目录结构、Codex 读写接入方式、定时触发实现、内容分工与效果数据均缺失；K 的 `open`/`start` 命令不一致、`.mycel/` 数据位置与 `init` 连接当前文件夹的关系、`context --brief` 在大仓库的 token 成本均未确认；L 的 `docs/eval.md` 评测细节、团队版 hub build 的获取方式、TLS 终止与备份策略未在材料中展开；M 的安装脚本是否真的不覆盖配置、hooks 是否在真实 Claude Code payload 下可靠、doctor 的“精确修复”具体是什么、`.ecx/test-command` 对多语言项目的识别准确率、`--with-cron` 的调度实现、手机模式 GitHub Action 的细节，均未在 README 中展开；N 的完整 25 项只详细写到前 11 名，第 12 名以后只有表格摘要并在 Engram 处截断；O 的原文没有给出可复制命令/配置/提示词，dreaming 频率和“何时创建记忆”仍是开放问题，wiki 维护成本与修剪策略需自行试验；P 的 lesson 实际文本、`dream` 用的提示词、注入后 `CLAUDE.md` 的样子、lesson 存储路径与索引机制、`eval/` 的具体内容均未在 README 中给出，需读 `docs/GUIDE.md` 与 `docs/LESSON_FORMAT.md` 确认。

## 依据的调研

- [@Bober_smart: 1. 在您的电脑上创建一个名为 ⁠second-brain⁠ 的文件夹  ](../research/radar/2026-10-02/839-1-second-brain.md)：值得一试，可以照这条推文搭一个最小版“第二大脑”：建独立文件夹、在 Claude Code 里接入 GWS CLI 打通 Gmail／日历／云端硬盘、单开 memory 子目录并在 CLAUDE.md 里写死记忆规则；理由是它把「权限供给 + 持久化目录 + 规则文件」三件事凑成了可复制的骨架，但原文第 4 步被截断、无命令示例也无效果验证，只能小范围试。
- [Ar9av/obsidian-wiki](../research/radar/2026-10-03/1004-ar9av-obsidian-wiki.md)：值得一试，可以直接照 README 的安装和斜杠命令小范围试一遍：把常用工作目录设成 vault、跑 ingest/query/lint 三步，验证跨会话记忆和结构性提问是否真的省时；但作者自评项目「early」，效果数据只有 n=2 的小样本，先试再谈全面采用。
- [truongfelix/workflow](../research/radar/2026-10-11/2508-truongfelix-workflow.md)：值得一试，在一个有多会话、跨天跨机器的长期项目上小范围试：clone 仓库后运行 bin/adopt.sh，先填好 .claude/ground-truth.conf 并把 ground-truth.sh 跑到 GROUND TRUTH: complete，再用 /session-start 和 /handoff 包住每天的工作；理由是它把“上次会话的笔记只是主张、git 与机器状态才是事实”这条规则做成两个技能共用同一个采集脚本的机制，直接针对跨会话记忆失真，但本次材料只到 README，脚本实现与效果未经验证。
- [@coreyganim: 如果你构建了一个第二大脑，但没有告诉 Claude/Codex 如何使用它，它就毫无用处。](../research/radar/2026-10-14/3145-claude-codex.md)：值得一试，先照原文那三条规则，给 Claude/Codex 加一组自定义指令（任务前读公司大脑与个人大脑、与大脑冲突就标记并引用两版、让你裁决后给出大脑的确切编辑），小范围试跑若干任务；因为这三条规则本身可以直接落地、改动成本极低，但原文承诺的“完整提示”并未出现在采集到的正文里，也没有任何效果数据，是否真有效必须自己验证。
- [akitaonrails/ai-memory](../research/radar/2026-10-18/4553-akitaonrails-ai-memory.md)：值得一试，先在单机、单仓库、只接一个 agent（Claude Code 或 Codex）的情况下按 README 的两条命令装上并跑一到两周，用「新会话是否还要重新交代背景」来判断是否值得留下；因为原文确实给出了可直接复制的安装、接线、启动和回滚命令，但所有收益说法都只有项目自述、没有独立验证，且要常驻服务并采集提示词与工具调用，必须先小范围试。
- [Umair/stalemap](../research/radar/2026-10-21/5613-umair-stalemap.md)：值得一试，在 JS/TS 项目里小范围试用：先 `npx stalemap` 预览、再 `npx stalemap sync` 把变更笔记写进 AGENTS.md/CLAUDE.md，CI 加 `npx stalemap check`，Claude Code 侧装插件拿到 SessionStart 注入和编辑后 guard。理由是原文给出了可直接复制的安装、配置、CI 与 MCP 步骤，并有预注册盲测数据（89% vs 无辅助 68% vs 普通 tsc 钩子 73%）；但仅支持 JS/TS 与单个 package.json、只测了两个 Claude 模型且为作者自测，所以先试不直接 adopt。
- [hsuanshao/AgentMemory](../research/radar/2026-10-23/6218-hsuanshao-agentmemory.md)：值得一试，建议先以单团队、SQLite、本地 CLI 或 OpenAI 兼容端点做最小部署，接入一个客户端，用 2—3 次真实会话验证跨会话召回能否减少重复交代；README 给出了可照做的安装、配置和触发参数，但缺少效果数据，且 BUSL 对超过 1 个部门、10 人的生产使用收费。
- [@kinderlayer: 这太他妈的牛逼了。](../research/radar/2026-10-24/6540-item.md)：值得一试，建议小范围试：按原文先搭 second-brain/notes 与 people/，在 Claude Code 中用真实项目材料验证能否减少重复解释；但原文截断，第三个目录和完整用法缺失，不能直接 adopt。
- [@ai_database: 研究人员表示，建议在CLAUDE.md和AGENTS.md中预先添加以下一句话。](../research/radar/2026-10-25/6845-claude-md-agents-md.md)：值得一试，建议把这句话原样加入项目的 CLAUDE.md/AGENTS.md，并在一个存在文档与代码不一致的代码库中小范围试用；它是可直接复制的冲突处理规则，但原文只有一句建议且内容被截断，缺少效果证据，暂不宜直接采纳为通用规范。
- [@NIxinhai0: 给 Codex 装永久记忆： ](../research/radar/2026-10-28/7855-codex.md)：值得一试，可以直接拿这条提示词做小范围试点：让 Codex 把一个 Obsidian 库当作跨项目记忆，按“每日任务前读取、每晚十点同步、每周复盘”的节奏运行；但原文只有提示词、且被截断，没有说明如何配置读写权限与定时触发，也没有验证方法，所以只适合先在一个项目上试用，并自行定义验收指标。
- [mathew5612/mycel](../research/radar/2026-10-30/8579-mathew5612-mycel.md)：值得一试，值得小范围试：把 Mycel 克隆到项目外启动，用 Claude Code 插件把一张“活的项目地图”接成编码智能体的共享上下文，同时盯住 check/health/watch 这条维护闭环；理由是 README 给出的命令、各智能体接入方式和图上操作流程完整可照做，但项目仅 0.22、约 30 stars、无任何量化证据，收益必须自己量出来再决定是否写进手册。
- [@sumika45379: 【保存推荐】](../research/radar/2026-10-30/8638-item.md)：值得一试，建议小范围试：新建空目录并建立 MEMORY/notes/people/projects 分区，在 CLAUDE.md 中加一条“把上次对话的决定按话题写入对应文件”的常驻指令，跑几次会话，看是否真的减少重复解释；但采集文本在目录列表处被截断，最关键的 CLAUDE.md 那一行没有保存下来，需回原帖或视频补全后才能照抄。
- [dheerajponnaganti/thenwise](../research/radar/2026-11-03/9674-dheerajponnaganti-thenwise.md)：值得一试，建议先在单个 Claude Code 仓库小范围试用：按两条命令安装并运行 thenwise setup/doctor，用隐藏答案的历史问题做前后对比；理由是它把历史记忆检索、自动注入和隐私控制做成了可照做流程，但效果数字来自作者自测，需自行验证后再推广。
- [saksham10arora-dotcom/everything-claude-codex](../research/radar/2026-11-03/9849-saksham10arora-dotcom-everything-claude-codex.md)：值得一试，建议小范围试：在独立笔记库和一个可回滚的代码仓库中按 README 安装，先启用共享记忆、doctor 与“测试通过才算完成”，再判断是否值得长期采用；理由是 README 给出了安装命令和关键配置入口，但证据主要是作者自述，未提供可核验的完整实现与效果数据。
- [Glen-Web-App/best-agent-memory-mcp](../research/radar/2026-11-05/10612-glen-web-app-best-agent-memory-mcp.md)：值得一试，先按清单给出的七条判据（尤其是“自动捕获还是等模型调用写工具”“记忆能否以文件形式读取和版本化”）为编码智能体选一个记忆 MCP，装完连接后务必再安装 hooks，否则只有检索没有记录；理由是该文把 25 个方案在存储形态、捕获模型、团队共享、许可和部署成本上摊在同一张表里，并给出可直接复制的安装命令和若干踩坑提示，足以支撑一次小范围试用，但清单由 Glen 团队维护、Glen 排第一，且效果数字多为厂商自报，不能当作验收依据。
- [The components of agent memory](../research/radar/2026-11-08/11382-the-components-of-agent-memory.md)：值得一试，建议小范围试：用持久记忆目录、会话日志、小型注入索引和按需搜索搭建基础，再用 dreaming 离线校正并逐步构建 wiki；原文给出了可操作的设计模式和评测数据，但缺少可直接复制的命令或提示词，需在自己的任务上验证。
- [assassin808/learn-from-lessons](../research/radar/2026-11-11/12347-assassin808-learn-from-lessons.md)：值得一试，先拿自己的历史对话跑一遍 lessons scan → dream → view，人工筛掉低质条目后再 inject 进 CLAUDE.md（或 AGENTS.md），因为这条命令链可直接照做、能把“每次纠正”沉淀成可复用的规则；但证据只有作者一人的自评、README 也没给出 lesson 格式样例和注入内容示例，所以只值得小范围试，不宜直接全面铺开。
