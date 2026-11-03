# 让 AI 会话接手时先读记忆、宣布完成前先跑测试

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：跨会话、跨代理的记忆会失真，agent 又常在一堆没跑过的测试和坏掉的 hook 上宣布完成；这篇手册给出一套让记忆可查、事实可核、完成有证据的落地做法。
> 先试这一步：挑一个能回滚的测试仓库，写下 `.ecx/test-command`（或等价的完成前必跑命令），先只验证“测试失败时 agent 被拦住并拿到失败输出”这一件事。
> 最近修订：2026-11-03

## 解决什么问题

AI 每次开新会话都要重新交代背景；跨会话、跨代理、跨机器的资料、结论和历史决策无法沉淀。更糟的是，上次的笔记、handoff、memory、历史检索结果或项目地图只是“主张”，直接当事实继续施工，会把已失败的后台任务、未推送的分支、已完成的待办带进新会话。第二大脑建好却没说清 agent 什么时候读、读到的旧结论和用户当下说法冲突时听谁的，也会让它要么没被用上，要么被原样沿用。同一批材料还可能按话题散落在 `MEMORY/`、`notes/`、`people/`、`projects/` 等多个目录；若没有 `CLAUDE.md` 规则，目录只是堆放，不会自动变成可召回的记忆。编码场景还有三类失真：模型训练截止之后依赖库改了 API，agent 不查 changelog 仍按旧 API 写代码；项目文档落后于代码，agent 按旧文档把本来正确的实现改坏；agent 在一堆没跑过的测试和坏掉的 hook 上宣布“完成”。团队里多个人、多个 agent 各记各的，或者记忆只存在某台机器、某份手写笔记里，重复交代和“把旧结论当事实”会同时发生。另一类常见缺口是：过去的决策、试过的死胡同、某日当时的状态、某个文件的变更历史，其实都散落在本机历史聊天和 git 里，但新会话不会自动去翻，于是同一个坑反复踩。

这套做法分十三条路线：A/B/C 先让长期信息在本地 Markdown 落盘并变成可查询的库；D 在会话边界用脚本核对 git/GitHub/本机事实；E 用常驻指令让 agent 每次任务前先读知识库、冲突先问你；F 把捕获、汇总、召回、交接做成常驻管线；G 把依赖库在模型截止后的 API 变更注入给 agent；H 做自托管、按部门/团队/成员隔离的团队记忆；I 在文档与代码冲突时以代码为准并列出冲突点；J 用一条常驻提示词把 Markdown 库变成 Codex 的跨项目记忆；K 用 Mycel 维护一张本地“活的项目地图”；L 用 thenwise 把本机 Claude Code 历史聊天、git 提交、PR、`CLAUDE.md` 和笔记目录汇入本地 SQLite，按需检索并在会话边界按 token 预算自动注入；M 用 ECX 在会话开始加载共享记忆、跑 doctor 体检，并在代理宣布完成前先跑仓库测试命令。A 有三个变体：A-1 用单一 `memory/` 目录加 `CLAUDE.md` 规则；A-2 用 `notes/` 与 `people/` 按材料类型分目录，但原文在 `people/` 处截断；A-3 用 `MEMORY/`、`notes/`、`people/`、`projects/` 按话题分目录，但原文在目录列表处截断，最关键的 `CLAUDE.md` 一行没有保存下来。F/H/J/K/L/M 都仍把记忆、地图、历史或 `hot.md` 当“主张”，不能替代 D 的事实核对；M 的测试闸门只证明“这条命令跑过了”，不证明测试覆盖足够。

## 适用与不适用

适用：

- 已在用 Claude Code 或其他读取 Markdown 的 agent 做真实工作，但每次都要重复交代背景。
- 希望把确认过的长期有效信息落到本地文件；只需要一个长期信息落点时用 A-1 的 `memory/`。
- 材料天然分成事实/研究/想法与人物信息，想试 A-2 的 `notes/` 与 `people/`；注意原文只给到 `people/`。
- 材料按话题分成决定、笔记、人物、项目，想试 A-3 的 `MEMORY/`、`notes/`、`people/`、`projects/`；但原文在目录列表处截断，关键 `CLAUDE.md` 指令缺失，只能当试验，不能照抄当已完成配置。
- 需要让 AI 读取 Gmail、日历、云端硬盘时走 B；原文缺安装与授权细节，必须先查证。
- 想把散落材料变成可提问、带引用、可清洗的库，或找回叫不出名字的历史会话，走 C。
- 长期项目有多个会话、跨天跨机器，上一次笔记可能失真，或有多仓库工作区，走 D。
- 已有可被 AI 读取的知识库，但 AI 不主动读，或把旧结论当事实沿用，走 E。
- 想跨 agent、跨项目、跨机器共享记忆，能接受常驻服务、采集提示词与工具调用，走 F。
- 项目是 JS/TS，依赖有大版本跨越或紧贴发布节奏，走 G。
- 小团队想自托管团队记忆，按部门→团队→成员/agent 隔离，能接受 Docker、git 和一个 LLM 后端，走 H。
- 项目同时维护文档和代码，编码 agent 会读 `CLAUDE.md`/`AGENTS.md`，希望它在文档落后时按代码改并列出冲突点，走 I。
- 跨项目、长期、上下文反复丢失，想用最轻的方式给 Codex 一个外部记忆库，走 J。
- 本机有 Node.js 22+，项目在本地文件系统，愿意让 agent 读代码，并想让人和 agent 共用一张项目地图，走 K；Claude Code 集成最完整，其他 agent 通过 MCP 接入，可先在一个 2 万至 10 万行、自己有测试命令的中型仓库试。
- 已在用 Claude Code，历史主要沉淀在 `~/.claude/projects` 与 git，想少重复交代，或想查“为什么这样决定”“以前试过什么”“某日当时是什么状态”“某文件的历史”，走 L；单机不需要模型或 API key，能接受插件读本地历史。
- 小团队想共享已接受的决策和死胡同，且有一台可自托管的服务器、能配 https 反向代理和 token，走 L 的团队模式；先在单机确认有价值再开。
- 已在用 Claude Code，可能还同时用 Codex，希望会话一开始就加载共享记忆、每次会话开始自动体检 hooks/索引/任务/同步，并且代理说“完成”前必须先跑仓库测试，走 M。M 的测试闸门对单人编码仓库也成立，不依赖双代理。

不适用：

- 还没有安装 Claude Code 或任何可读 Markdown 的 agent，或没有本地文件系统写权限。
- 不能接受把 Gmail、日历、云端硬盘的读取权限交给本地工具，或工作内容高度敏感且没有隔离账号。
- 期待原文给出逐字可抄的命令、配置和规则全文：second-brain 原有第 4 步截断；A-2 在 `people/` 处截断；A-3 在目录列表处截断且 `CLAUDE.md` 关键一行缺失；D 本次材料只到 README；F 的 `ai-memory run --f` 处截断；H 的 `amem` 安装命令未在正文给出；J 只有一段提示词且在“这样你的 Codex”处截断；K 只有 README，且 `open` 与最小试用里的 `start` 不一致。
- 想用 C 全面替换现有做法：作者自评“early”，效果数据只有 n=2 的小样本。
- 想用 D/F/H/K/L/M 完全替代人工判断：它们只推荐、提供记忆层、项目地图、历史检索或完成闸门，每天做什么、每次 push/PR/merge 是否批准，由你决定。
- 没有稳定的知识库，或知识库里本来就是不可信内容：E/F/H/J/M 都会把不可信内容引用、汇总、蒸馏或写回得更正式。
- 工具不会稳定遵守常驻指令，或你不愿让 AI 提议改写知识库：先别把 E 当默认配置。
- 非 JS/TS 项目；多 workspace/monorepo（stalemap 只支持一个 `package.json`）；无自带类型的包只能靠 release note。
- 不能接受把包名与版本发往 npm registry、GitHub、models.dev，或 `--llm`/`--examples`/`--guides` 时把类型 diff、release note 片段、指南文本与导入的 API 名发往 Claude：先别把 G 当默认配置。
- 超过 1 个部门、10 人的组织不想为生产使用付费：AgentMemory 0.4.0 起服务端为 BUSL-1.1。
- 不愿用 Docker/git，或没有可用 LLM 后端：先别上 H；只想要轻量本地 Markdown 记忆，先做 A/E。
- 代理不读取 `CLAUDE.md`/`AGENTS.md`，或项目没有文档与代码并存，或你无法接受“以代码为准”：先别把 I 当默认规则。
- 单项目或短周期工作：J 的“每晚整理、每周复盘”开销可能高于收益；无法确认 Codex 读写权限、无法落实定时触发、不愿人工抽查写回条目时，不要用 J。
- 多人协作、云端或远程团队场景不明确；K 处于 0.22 早期、约 30 stars、单一作者、无量化收益；大仓库下 `context --brief` 的体量与 token 成本无数据；界面仅 EN/RU；地图质量取决于 agent 能力与代码库规模；地图过期会误导 agent，不能替代 D/I。
- `people/` 会沉淀人名与人际信息，团队共享或同步到远端时有隐私问题；多人协作时同一文件易冲突。若不能先接受这两点，别用 A-2/A-3 的 `people/`。
- 不是 Claude Code 工作流，或历史不在 `~/.claude/projects`，L 没有可检索的数据；Node 低于 22.16 也装不上 thenwise。
- 不愿让插件读本地历史、不能接受每日一次 npm 版本检查、或团队模式不愿维护自托管服务器与 https 反代：先别把 L 当默认配置。
- 把作者自测的 93% vs 37% 当成定论，或想用 L 替代 `CLAUDE.md` 常驻规则和 D 的事实核对：先别采用。
- 不在 macOS/Linux、没有 Python 3.9+、不愿让 hooks 在会话开始、消息前、回复后和结束时执行：先别装 M。README 没有把 Windows 列为支持平台。
- 只想用 Claude Code、不用 Codex：M 的双代理同步不适用，但共享记忆和测试闸门仍可单独用。
- 不愿为手机接力维护一个私有 GitHub 仓库，或不能接受关系图检索默认把笔记文本发到 Ollama 云：先别开 M 的 `--with-phone` 与 `--with-search`。
- 需要团队权限、安全审计、多人协作冲突处理：ECX 的 README 没有展开这些，先别把它当团队记忆方案。
- 把 ECX README 的“每天使用 6 个月、支撑 37 个已交付项目、同步低于 0.1 秒、安装 30 秒”当定论：这些是作者自述，未提供测试日志、失败统计或代码审查。

## 前置条件

- A-1：本机已安装并能运行 Claude Code；对目标目录有读写权限。
- A-2：同上；只需 Claude Code 与本地目录写权限，不需要 API key；原文未给启动命令、提示词和更新规则，需自己补读取规则；涉及人物信息先用非敏感材料试。
- A-3：本机已安装并能运行 Claude Code；准备一个空文件夹作为工作根目录；对目录有读写权限；涉及 `people/` 先用非敏感材料。原文称准备这套文件夹约需 5 分钟，并称做法转述自另一条带视频的原帖；这是作者主张，不是验证结果。
- B：在 A 基础上，另需一个 Google 账号，并准备把 Gmail、日历、云端硬盘读取权限交给本地工具。原文没有 GWS CLI 安装命令、包名来源或授权流程，必须先查证官方文档。
- C：本机有 Python 环境（pip/uv/pipx 任一路线）；走 Claude Code 插件路线则不需要 Python。不需要 API key、embedding 模型、向量库或联网。
- D：需要 bash 和 git。可选 GitHub CLI `gh`、systemd（仅 Linux）。支持 Linux、macOS 和 Windows（在 Git Bash 或 WSL 里跑，CI 三种都测）。开始前先读 `PRINCIPLES.md`。适用单仓库，或一个装着多个 repo 的工作区文件夹，根目录自身是一个只放文档的 repo；工作区形态的 remote 必须是 PRIVATE。
- E：已经有一个可被 AI 工具读取的知识库；所用工具支持常驻指令入口，且允许 AI 提出对知识库的写回编辑；你本人愿意做冲突裁决。
- F：能访问 GitHub releases 和 curl（Linux/macOS）；Windows 用 PowerShell，无需管理员，或只考虑 WSL2；Arch/Fedora 走包管理器；macOS 菜单栏 App 需要 Rust 工具链 + Xcode / Swift 6；Docker 路线需要 Docker 或 Podman + 一个支持 MCP 的 agent CLI。先在测试机、单仓库、只接一个 agent 上做第 1 步。
- G：Node 项目；有 lockfile 或 `node_modules` 以确定 pin 的版本；能访问 npm registry 与 GitHub；知道当前会话用的模型（可用 `--model` 指定，或显式传 `--cutoff YYYY-MM-DD`）；可选 GitHub token 或 `gh` 登录；选择 LLM 通道时需 Anthropic API 或 `claude -p`；comment 模式的 CI 需 `pull-requests: write` 权限。
- H：Docker、git；一个 LLM 后端（OpenAI 兼容 API key，或本机可调用的 `claude`、`codex`、`agy` 等 CLI）；默认 SQLite 无需额外安装；多副本才需要 Redis，规模化才需要 PostgreSQL/pgvector；从源码构建需要 Rust MSRV 1.88。生产使用前先看许可证。
- I：确认编码代理会读取项目中的 `CLAUDE.md` 或 `AGENTS.md`；项目允许创建或修改这类代理指令文件；任务附近存在已知的文档与代码不一致点。不需要额外服务或 key。
- J：需要一个固定的知识库目录（Obsidian vault 或任意 Markdown 目录）；确认 Codex 能读写该目录（接入方式原文未给，需自行解决）；确认“每晚十点”和“每周”由谁触发；能提供“当日项目沟通记录”的确定来源；愿意每晚抽查写回条目。
- K：Node.js 22 或更新；一个受支持的可编码 agent（Claude Code 集成最完整）；项目在本地文件系统，且愿意让 agent 读代码；Mycel 建议克隆在项目外（如 `~/mycel`），一个 Mycel 服务本机所有项目；默认监听 `127.0.0.1:4317`，API 写入需要 `.mycel/token` 里的令牌；本地模型走 `mycel chat`，对项目文件只读；跨 VM 需在主机 `node mycel.mjs remote on`，VM 内用安装脚本并要 4 位码，你核对后 Allow。
- L：已在用 Claude Code；Node 22.16+；有 git 仓库；要记忆的历史位于 `~/.claude/projects`；数据目录为 `~/.thenwise` 或 `THENWISE_HOME`。单机不需要模型或 API key；默认不发送遥测，只有每日一次 npm 版本检查默认开启，可用 `thenwise update-check off` 关闭。团队模式另需一台自托管服务器、https 反向代理和 token 管理；客户端除 localhost 外拒绝 plain http。
- M：Claude Code；README 标注 Python 3.9+，支持 macOS/Linux，未列 Windows。要双代理共享记忆还需 Codex；要手机接力需要一个私有 GitHub 仓库；要关系图检索需 Ollama，README 称默认模型在 Ollama 云上，可用 `ECX_LLM_MODEL` 改为本地模型。安装前先备份现有配置，尤其是 `~/.claude`。
- 涉及隐私与凭据安全：先用非敏感账号或受限范围试，不要一上来就接真实收件箱或公司级知识库。F/H/J/K/L/M 会采集、写回、画图、检索历史或执行 hooks，先用测试团队、测试 agent、测试库、测试仓库。A-2/A-3 的 `people/` 先按非敏感材料试。

## 操作步骤

先选路线，十三条路线可以叠加：

- 只需要跨会话记住项目背景，先做 A。A-1 用单一 `memory/` 目录加 `CLAUDE.md` 规则；A-2 用 `notes/` 与 `people/` 按材料类型分目录；A-3 用 `MEMORY/`、`notes/`、`people/`、`projects/` 按话题分目录。目录本身不会自动生效，必须配读取/追加规则。
- 还需要 AI 读取 Gmail、日历、云端硬盘，在 A 之上做 B。原文缺安装与授权细节，必须先查证再操作。
- 想把材料变成可摄入、可提问、可引用、可清洗的库，或想找回叫不出名字的历史会话，做 C。C 可以独立于 A，也可以直接建在 A 的 second-brain 目录上。
- 如果新会话经常把上次笔记当事实、需要跨天跨机器接续长期项目，做 D。D 可以叠加在 A/B/C/F/H/J/K/L/M 上：A 的 memory、C 的 vault、F 的 wiki/handoff、H 的召回结果、J 的知识库、K 的地图、L 的历史检索结果、M 的 `hot.md` 都只是“主张”来源，D 负责在会话边界拿 git/机器事实核对。
- 如果知识库已经存在、但 AI 不主动用、或你说的话和库里记录打架时它自作主张，做 E。E 只写常驻指令，改动成本极低；E 管“你说的话 vs 知识库记录”，D 管“笔记/记忆/历史 vs git、GitHub、本机事实”，两者都要。
- 如果主要痛点是跨 agent、跨项目、跨机器的长期记忆，并且能接受常驻服务和采集提示词与工具调用，试 F。F 可以替代 A 的 memory 骨架和 C 的部分 vault/query 能力，但不能替代 D；E 的冲突裁决指令可以和 F 叠加。
- 如果是 JS/TS 单 `package.json` 项目、依赖有大版本跨越或紧贴发布节奏，加 G。G 可以独立使用，也可以叠加在 A/D/E/F/H/M 上；但它的笔记仍来自 changelog/release note，是“主张”，编辑后 guard 和 CI check 才是编译层的事实核对。
- 如果是小团队、要自托管、要按部门/团队/成员/agent 隔离、要自动捕获和分层召回，做 H。H 可以替代 A 的 memory 骨架和 F 的部分团队共享需求，但它仍把“记忆”当主张，不能替代 D。
- 如果项目同时维护文档和代码、编码 agent 会读 `CLAUDE.md`/`AGENTS.md`，且你希望它在文档落后于代码时按代码改、把冲突点列出来，加 I。I 是一条静态规则，成本最低，但不替代 D，也不证明代码本身正确。
- 如果跨项目的偏好与项目细节反复丢失、又不想引入常驻服务，加 J。J 只是一条提示词加一个 Markdown 知识库，靠固定节律维护；它没有冲突裁决、没有事实核对，必须配人工抽查，仍不能替代 D 和 E。
- 如果本机有 Node 22+、项目在本地、愿意让 agent 读代码，并想让人和 agent 共用一张项目地图，加 K。K 补项目理解与共享上下文，不替代 D/E/I；Claude Code 走插件，其他 agent 走 MCP 条目，本地模型走 `mycel chat` 且只读。
- 如果历史决策、死胡同、某日状态和文件历史散在本机聊天里，而你又不想上常驻服务，加 L。L 补“历史检索 + 会话边界自动注入”，不替代 `CLAUDE.md` 常驻规则、不替代 D 的事实核对、不替代 E 的冲突裁决；它读 `CLAUDE.md`，但不会替你改写它。
- 如果每次会话开始都要自动加载共享记忆、自动体检 hooks/索引/任务/同步，并且代理说“完成”前必须先跑仓库测试，加 M。M 补“完成前证据”和“启动体检”，不替代 D 的事实核对、不替代 I 的“以代码为准”、不替代 E 的冲突裁决；它的 `hot.md` 仍是主张，测试命令也只覆盖你写下的那条命令。

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

1. 创建一个空文件夹作为项目根目录，并在其中打开 Claude Code。原文明确从“创建一个空文件夹”开始。前提：本地写权限。预期：得到一个与日常项目隔离的工作根目录；原文未指定路径。
2. 建立按话题划分的目录：

```bash
mkdir -p MEMORY notes people projects
```

注意：采集到的正文在 `・创建MEMORY/、notes/、people/、projects/` 处被截断，可能还有其它目录；不能把这里当成完整目录清单。预期：得到四个按话题划分的目录。
3. 在根目录创建 `CLAUDE.md`，加入一条常驻指令：让 Claude Code 把本次对话中确定的重要事项，按话题分别写入上面这些目录下的文件。原文最关键的“`CLAUDE.md` 里那一行”没有保存下来，需回原帖或视频补全；下面只是按原文意图自拟的占位，不是原文，不要当成已验证配置照抄：

```markdown
## 记忆
每次对话结束前，把本次确定的重要决定、结论和待办，按话题分别追加写入 MEMORY/、notes/、people/、projects/ 下对应的 Markdown 文件；
每条写清日期与背景，不要覆盖旧内容，同一决定有变更时标注“变更”。
```

前提：自己确认规则目标位置和措辞；原文缺失，只能先小范围试。预期：会话结束前出现按话题写入的动作。
4. 下一次会话开始时先让 Claude 读这些文件，再开始工作。原文未写明这一步，常见配套做法如此；不做这一步，落盘内容不会被自动用上，需自行验证是否必要。预期：新会话能引用上次文件中的决定，而不是重新问一遍。
5. 连续跑 3–5 次真实会话，每次结束人工检查文件是否写对、有无记错；同时做一个对照：同样的任务在不加这条指令的文件夹里跑一遍。预期：能观察重复解释次数是否下降、话题归类是否正确、陈旧/冲突条目是否需要人工清理、Claude 是否真的依据旧决定行动、每周清理花多少分钟。止损线：两周内若没有减少重复解释，或错误记忆造成的返工多于节省的时间，降级为只借鉴“按话题分目录落盘”的思路，不用这套具体配置。

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

原文代码用双引号，这里改为单引号以保持等价；`user_id` 可把记忆按人隔离，而知识仍然共享。
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
7. 填 `BACKLOG.md`：每个 repo 或文件树一节，从项目已有追踪物（issue、笔记、旧 TODO）填。每条写：哪里错了或缺什么、指针、什么时候算完成。做完的条目删除而非打勾，历史交给 git。
8. 填 `questions.md`：所有者尚未做的决定，以及已经做过、但新人会推翻的裁决；每条带选项与建议。
9. 填两个技能的 FILL 项：项目特有的检查项，哪些是预期之内、不算新闻。
10. 仅工作区形态：在根目录 `git init`；首次提交前检查 `git status --ignored` 和暂存列表；扫密钥（`gitleaks`）；绝不追踪 datadir、密钥或二进制；创建私有 remote，且只在所有者同意后推送。
11. 闭环：跑一次 `/handoff`，让第一份 `notes/handoff.md` 从 ground truth 写出来。下一次会话用 `/session-start` 开始。
12. 日常固定动作：坐下时 `/session-start`，收工前 `/handoff`。预期：`/session-start` 运行 `ground-truth.sh`，从 git、GitHub 和本机读出事实，再读上一次的 handoff，报告两者不一致的地方，提出当天任务建议，然后等你决定；`/handoff` 运行同一个脚本，据此重写 handoff，更新各跟踪文件，并提交。
13. 升级：再跑一次 `bin/adopt.sh <project-root>`，它会列出每个被跳过的文件，并给出与当前模板对比的 `diff -u` 命令。合并通用部分，保留项目自己的 FILL 答案。`.claude/workflow-version` 记录项目上次取用的 commit。
14. 照做时的五条判据：主张和事实是两回事；做完的事删除，不打勾；读不出来的结果叫 UNKNOWN，绝不算通过；没被点名的东西，不算只存在于一块盘上；先建议，再等。

### 做法 E：用常驻指令让 agent 每次任务前先读知识库，冲突先问你（@coreyganim）

原文写“完整提示如下”，但采集到的正文只有三条规则要点，完整提示词没有出现在给出的材料里；下面的代码块是按这三条要点整理的草稿，不是原文。

1. 打开所用工具的常驻指令入口（自定义指令 / 项目说明 / 仓库说明文件这一类位置）。前提：你的知识库能被这个工具读到。原文只说要“添加一组自定义指令”，具体落点需按你手头的工具自行确认。预期：指令随每次对话生效。
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

1. 先在测试机上做 Linux / macOS 原生安装。前提：能访问 GitHub releases 和 curl，无需 root。预期：下载对应 release、用发布页公布的 SHA-256 校验、把 `~/.local/bin/ai-memory` 链接好；`setup` 创建带 bearer token、权限为 owner-only 的数据目录，启动 per-user 服务，为它发现的每个 agent 接好 MCP、hooks 和 Agent Skills。

```bash
curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh
ai-memory setup
```

相关开关：`--plan` 只打印计划不做任何改动；`--web` 把计划显示成浏览器页面、勾选后应用；`--yes` 跳过询问；再次运行不会改动任何东西；`--agent` 指定要接的 agent。装完后重启你的 agent，问它一句 “What do you remember about this project?”，如果它通过 ai-memory 回答，就说明接线成功。
2. Windows 走 PowerShell。前提：Windows 环境，或只考虑 WSL2。预期：校验 release zip 的 SHA-256，解到 `%LOCALAPPDATA%` 下的 `Programs/ai-memory` 并加进用户 `PATH`；`setup` 做的事与 Linux/macOS 相同，只是用登录项代替系统服务。README 把“原生 Windows”标为 Experimental，更稳的路子是 WSL2 或 Docker Desktop。

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

5. Docker 路线。前提：Docker 或 Podman + 一个支持 MCP 的 agent CLI。注意：这段官方 quick-start 没有认证——容器没跑 `init`，所以不带 token 启动；服务只绑 loopback（`127.0.0.1:49374`），机器外面的东西够不着，但本机进程和浏览器页面可以。两条接线命令：

```bash
ai-memory install-mcp   --client claude-code --apply
ai-memory install-hooks --agent  claude-code --apply
```

可把 `claude-code` 换成 `codex`、`opencode`、`gemini-cli`、`copilot-cli` 等；完整列表在 `docs/install.md`。
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

前提：Node 项目；有 lockfile 或 `node_modules`；能访问 npm registry 与 GitHub；知道当前会话用的模型（可用 `--model` 指定，或显式传 `--cutoff YYYY-MM-DD`）。预期：看到变更预览和将要写入的笔记块，但不改动文件。
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

预期：guard 把编译错误与匹配到的变更条目一起回给 agent，形成“写错 → 立刻看到原因 → 改正”的闭环。普通 `tsc` 钩子是 guard 的子集，二者不等价。
5. Claude Code 插件（拿到自动注入 + 编辑后 guard）：

```text
/plugin marketplace add Umair/stalemap
/plugin install stalemap@stalemap
```

6. 其他 agent 一键配置：

```bash
stalemap setup --agent cursor
stalemap setup --agent codex --dry-run
```

原文明确提示：尚未在真实 Cursor / Codex / OpenCode 安装中验证过；Cursor 目前不把 `postToolUse` hook 的上下文传给模型，所以 setup 额外加了一个 stop-hook 兜底。
7. 任意 MCP client：

```json
{ "mcpServers": { "stalemap": { "command": "npx", "args": ["-y", "stalemap@latest", "mcp"] } } }
```

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

对应 MCP 工具 `search_changes`（另有 `package_changes`、`project_changes`、`check_notes`）。首次检索建索引，之后离线。
11. 裁剪笔记（可选）：

```bash
stalemap probe
```

原文提醒：probe 任务直接点名旧 API，因此测的是“被指到时知不知道”，比“主动发现”容易。
12. 数据边界：包名与版本会发往 npm registry、GitHub 与 models.dev；源码不上传；使用 `--llm`/`--examples`/`--guides` 时类型 diff、release note 片段、指南文本与导入的 API 名会发往 Claude（不含代码）；`probe` 的提示词发给你选的 provider。
13. 小范围试用：先在一个 JS/TS 单 `package.json` 项目里预览，再写入，CI 加 `check`，Claude Code 侧装插件；观察会话通过率、首次编辑使用过期 API 的比例、单会话成本与时长。

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

更多变量看 `./install.sh --help`。如果数据库在宿主机上，用 `host.docker.internal` 而不是 `localhost`。以后重启只需：

```bash
docker compose up -d
```

4. 不用安装脚本的手动部署：

```bash
cp .env.example .env
# 至少设 AGENT_MEMORY_API_KEY
docker compose up -d --build
curl -s -X POST http://localhost:8420/v3/internal/meta/user/init-admin -H "Authorization: Bearer $AGENT_MEMORY_API_KEY" -H "x-memory-department-id: default" -H "content-type: application/json" -d '{"username":"admin"}'
```

服务地址：memory-core 为 `http://localhost:8420`，memory-panel 为 `http://localhost:8125`。
5. 建立用户、团队和 agent：用 admin user key 登录 Panel（默认 8125）。在 **Metadata** 下创建用户（每个用户拿到只显示一次的 user key）、创建团队、把用户按角色加入团队、创建 agent。客户端只用 user key 认证，不需要 `AGENT_MEMORY_API_KEY`；每次记忆调用都要带用户所属的 `team_id` 和 `agent_id`。
6. 接入客户端：README 没有在正文给出 `amem` 的安装命令，只指向 `docs/REMOTE-CLIENTS.md`。按该文档安装 `amem`，配置 Claude Code、Codex、Antigravity 或 Hermes 的 hooks/MCP 集成。`amem` 会在内容离开本机前做 secret 脱敏，并在服务器不可达时排队。
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
    args: ["-p"]
    promptMode: stdin
    workingDir: ~/projects/my-app
    maxConcurrency: 2
```

对应环境变量是 `AGENT_MEMORY_LLM_PROVIDER=cli`、`AGENT_MEMORY_LLM_CLI_COMMAND`、`AGENT_MEMORY_LLM_CLI_ARGS`、`AGENT_MEMORY_LLM_CLI_PROMPT_MODE`、`AGENT_MEMORY_LLM_CLI_WORKDIR`。CLI 调用不经过 shell，prompt 默认走 stdin；每次调用受 `timeoutMs` 限制。
8. 按规模选择存储和协调后端。默认 SQLite：每个部门一个文件，FTS5 全文检索，`sqlite-vec` 做向量 KNN；扩展加载失败时退化为暴力比较。PostgreSQL：每个部门一个 schema（`am_<hash>`），tsvector + GIN，pgvector HNSW。Redis：管线状态、任务队列和分布式锁，可跑多个 memory-core 副本；队列是 at-least-once，租约默认 15 分钟并自动续期；锁用 `SET NX PX`，默认 TTL 10 分钟；不支持 Redis Cluster。

```text
AGENT_MEMORY_STORAGE_BACKEND=postgres
AGENT_MEMORY_POSTGRES_URL=postgres://user:pass@host:5432/db
AGENT_MEMORY_COORDINATION_BACKEND=redis
AGENT_MEMORY_REDIS_URL=redis://[:password@]host:6379/0
```

从 SQLite 迁到 PostgreSQL 用 `./migrate-to-postgres.sh`。
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
3. 让代理执行一个涉及既有代码修改的小任务，并要求它照常给出最终回复。前提：任务附近存在已知的文档与代码不一致点，便于检查规则是否生效。预期：能看到它是否按代码改、是否列出冲突。
4. 检查最终回复是否列出冲突点，并核对代码修改是否以现有代码为准，而不是按旧文档反向改动。预期：冲突被显式列出，改动遵循现有行为。
5. 若误报太多，先收紧规则措辞或限定“文档”的范围（例如只指 README/设计文档，不含代码注释），再试一次。预期：噪声下降。
6. 小范围试用：选一个有已知“文档落后于代码”问题的小仓库，加规则，做一个小型代码修改任务；与未加规则的同类任务对比返工次数。原文未给试用时长与量化指标。

### 做法 J：用一条常驻提示词把 Obsidian 库变成 Codex 的跨项目记忆，并按固定节律整理（@NIxinhai0）

材料边界：原文只有一段提示词，末尾在“这样你的 Codex”处截断；没有目录结构、没有 Codex 的接入与读写权限配置、没有定时触发实现、没有效果验证。

1. 先有一个固定的知识库目录。原文假定该库已存在，未说明如何创建：在 Obsidian 里新建一个 vault，记住它的绝对路径。不想用 Obsidian 也可以——vault 本质是磁盘上的 Markdown 文件夹。
2. 确认 Codex 能读写该目录。原文未给接入方式（MCP、工作目录还是插件都没说明），需按你用的 Codex 环境自行解决。前提：无法确认读写就不要再往下走。预期：Codex 能在该路径下读文件、写文件。
3. 先定目录结构。原文未规定，但“按需读取”在单文件堆砌下会失效；至少把项目、决策、偏好分开（这是调研报告的建议，不是原文）。预期：后续能按主题读取，而不是每次全量加载。
4. 首次录入：把下面这段提示词原样发给 Codex。

```text
你帮我配置一个 Obsidian 知识库作为 Codex 跨项目永久记忆。
将我长期以来所有偏好、决策习惯、全部项目以及项目细节录入并整理归纳 每日任务前按需读取，每晚十点整理当日项目沟通记录同步更新知识库每周做一次复盘 沉淀项目信息减少冗余读取
```

前提：第 1—3 步已完成。预期：长期偏好、决策习惯、项目清单与细节被写入库中。
5. 明确“当日项目沟通记录”的来源与位置。原文只说“整理当日项目沟通记录”，没说记录从哪来（聊天记录、提交、会议纪要）；不指定来源，这一步会变成让 Codex 凭空总结。预期：每晚同步有确定输入。
6. 落实“每晚十点”和“每周”的触发方式。原文只写了时间点，没写由谁触发；如果你的环境没有定时能力，就改成人工在固定时间发起同一条指令。预期：节律真实发生，而不是停留在提示词里。
7. 每日任务前让 Codex 先检索相关笔记再动手。原文措辞是“按需读取”，不是全量加载；如果它每次都全量读，读取成本会随库增长。预期：只读与当前任务相关的条目。
8. 每周复盘时做去重与压缩，合并重复条目、淘汰过期信息。预期：库不随时间长成噪声堆。
9. 把迭代后的提示词存回库里，形成可复用模板。预期：下次换项目或换机器能直接复用。
10. 必须保留人工抽查。错误或过期的记忆被自动写回，会在后续任务里被反复读取并放大，比没有记忆更糟；至少每晚写回后抽查一批条目，错误率上升就把自动写回改成先审后写。

### 做法 K：用 Mycel 维护一张“活的项目地图”，作为编码 agent 的共享上下文

1. 安装并启动 Mycel。前提：Node.js 22 或更新；克隆在项目外（如 `~/mycel`），一个 Mycel 服务本机所有项目。

```bash
git clone https://github.com/mathew5612/mycel.git
cd mycel
node mycel.mjs open
```

预期：后台启动并打开 `http://127.0.0.1:4317`。Windows 可双击 `Mycel.cmd`；macOS 先 `chmod +x Mycel.command` 再双击。若已有旧版本在跑同一份数据，`open` 会用新版本重启，`.mycel/` 里的地图不动；升级用 `git pull` 后再次 `node mycel.mjs open`。注意：最小试用段原文写的是 `node mycel.mjs start`，与安装段的 `open` 不一致，先以 `node mycel.mjs --help` 和实际可用命令为准。
2. 在你的项目文件夹里让智能体自举：

```text
Read the Mycel guide and follow it: curl -s http://127.0.0.1:4317/agent
```

Windows PowerShell 把 `curl` 换成 `curl.exe`。预期：智能体连接文件夹、完成自我配置（Claude Code 下会安装 Mycel 插件并要求你开一个新会话），然后开始建图。对话始终在智能体自己的窗口里进行，Mycel 没有聊天功能。Mycel 首页顶部的 “For your agent” 一行可直接复制。
3. 按智能体类型选接入方式。Claude Code：

```bash
node <mycel>/mycel.mjs plugin --install
```

预期：装 MCP 工具、追踪被编辑文件的 hooks、把智能体任务列表显示为地图下方进度条、给会话概览。Codex、Cursor、Gemini / Antigravity、VS Code、Windsurf、Cline、Claude Desktop：

```bash
node <mycel>/mycel.mjs plugin --agent <name>
```

预期：打印 MCP 条目及应写入的位置。本地模型（Ollama、LM Studio、llama.cpp、vLLM）：

```bash
node <mycel>/mycel.mjs chat
```

预期：内置 agent，具备全部 Mycel 工具，对项目文件只读；客户端配置用 `plugin --agent lmstudio|continue|goose|opencode|jan|openwebui`。其他：在项目文件夹里跑 CLI（`node <mycel>/mycel.mjs <command>`）、函数定义（`mycel tools --format openai|mcp`、`mycel call <tool> '<json>'`）或 HTTP API。
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

说明：`init` 连接当前文件夹（同一文件夹=同一项目=同一张图）；`context --brief` 把整张图导出为 Markdown，外加用户选了什么、做了什么；`build` 按结构逐步画图并自动布局；`apply` 基于你读到的 revision 批量提交操作；`wait` 阻塞到人在 Mycel 里操作或别人改图；`doing`/`mark` 显示进度与状态（plan/testing/passed/failed/none）；`check` 跑各块配置的测试命令并实时染色；`watch` 文件一变就把对应块标为可能过时；`health` 报 red/outdated/unchecked/planned、TODO 与疑似密钥字符串。全部命令见 `node mycel.mjs --help`。
5. 图上的人机协作规范：空白处右键建块或便签；在块上右键建子块；从块的任一边缘拖到另一个块连线（Alt+拖可从块内任意位置起拖）；双击带子图的块进入，Esc 返回上层；底部滑杆按四档折叠（concept/mechanics/technique/code）；点 “Finish edits” 把你所有改动作为一个事件整体发给智能体；智能体的建议以虚线高亮显示，可 Accept / Reject；你自己新增的块会成为智能体的计划；History 列最近 200 条改动（含作者与原因）；Health 高亮需要处理的项；指令要用“块”而不是“文件”，选中一个块，对它说 “do this here”，智能体能看见你的选择。
6. 跨虚拟机（可选）：主机上 `node mycel.mjs remote on`；VM 内智能体执行：

```bash
curl -fsS http://<host address>:4317/install.sh | sh
```

必要时装 Node.js 和一份 Mycel，然后要一个 4 位码申请接入；你核对 4 位码后在 Mycel 里点 Allow，每台机器一个可随时吊销的 key。默认只在 `127.0.0.1` 监听，VM 访问不开不可用；经 API 写入需要 `.mycel/token` 里的令牌。
7. 与已有做法的关系：K 补的是项目理解与共享上下文层，不替代 A/B/C 的记忆与知识库，不替代 D 的事实核对，不替代 E 的冲突裁决，不替代 I 的代码优先规则，也不替代 L 的历史检索。地图本身也是“主张”：`check` 的绿/红、`health` 的状态和 `watch` 的过时标记是维护信号，不是正确性证明；过期地图会误导 agent。Claude Code 集成最完整；其他 agent 走 MCP 条目；本地模型 chat 只读。

### 做法 L：用 thenwise 把本机 Claude Code 历史变成可检索、可按需注入的记忆库

材料边界：thenwise 的安装命令、`setup`/`doctor`/`status`、七个 `memory_*` 工具、hooks 的 token 上限与触发条件、隐私开关、团队命令、`config.json` 配置项都可核对；效果数字来自作者自述的隐藏答案盲评，材料未包含 `docs/eval.md` 的题目、评分细则和原始数据，不能独立核验。

1. 先做基线，不安装。选一个非关键但历史较丰富的 Claude Code 仓库；准备一组有标准答案的历史问题，覆盖“为什么这样决定”“以前试过什么”“某日当时是什么状态”“某文件的历史”。把答案藏起来，用 plain Claude Code 新会话回答并记录。前提：这个仓库的历史确实在 `~/.claude/projects`，且有 git 提交可查。预期：得到未安装时的答对率、引用来源与耗时基线。
2. 安装插件。前提：已使用 Claude Code；Node 22.16+；有 git 仓库。预期：插件出现在 `/plugin` 列表；Claude Code 2.1.275+ 可用一行安装。

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

安装后开新会话，并在 `/plugin` 中为该 marketplace 打开自动更新。
3. 初始化并检查。打开 Claude Code 会话后，Thenwise 会在后台归档过去聊天并构建存储；也可以主动运行 `setup` 选择项目、笔记位置（独立文件夹或 Obsidian vault）、是否用 `gh` 拉 PR、是否备份。`doctor` 会检查并给每个问题一行修复建议；`status` 看已存内容和上次同步时间。

```bash
thenwise setup
thenwise doctor
thenwise status
```

前提：`~/.claude/projects` 可读；数据目录 `~/.thenwise` 或 `THENWISE_HOME` 可写。预期：项目被收录，数据库开始建立，doctor 没有未处理的错误。
4. 日常把历史检索当作前置步骤。可以直接在 Claude Code 里用命令，也可以让 Claude 自己调用 `memory_*` 工具。

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

对应工具用法：`memory_search` 找相关记录；`memory_current` 问当前设置；`memory_why` 问为什么这样决定；`memory_tried` 问以前试过什么；`memory_asof` 问某日当时是什么状态；`memory_trace` 问某个文件的完整历史；`memory_read` 读完整记录。原文说这些回答都带来源和日期，较新记录覆盖同一问题时会标注。预期：新会话先查历史再动手，而不是重新问一遍。
5. 理解自动注入的默认行为。默认 hooks 会在会话开始后台同步；最近 7 天有会话的仓库会加最多 200 token 的启动简报；压缩后加最多 1,500 token 的 resume brief；问过去的问题最多给 3 个线索（约 300 token），大多数提示不给；打开文件时最多加 600 token 的死胡同和决策，每个文件每会话一次。hook 不会让聊天失败，错误进日志。要关闭其中两类自动提示，在 `config.json` 中写：

```json
"hooks": { "prompt_map": false, "startup_brief": false }
```

前提：先观察自动注入是否真的相关。预期：无关提示多时能关掉，保留手动检索。
6. 控制隐私和删除。某次聊天不记录：在提示开头或结尾加 `[no-memory]`，或单独一行写 `[no-memory]`。删除单条聊天或整个项目：

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

注意：原文称密钥会在写入前替换为 `[secret masked]`，团队服务器再脱敏一次；但也说明会漏掉跨两行折断的 key，且 `process.env.API_KEY` 这类代码仍可读；`forget` 也列出了够不到 Claude Code 自有文件和 Time Machine 副本。不要用真实密钥做测试。
7. 生成可读笔记库。把决策、死胡同、时间线和文件历史写成 Markdown：

```bash
thenwise vault write
```

输出到所选 vault 的 `_thenwise/` 文件夹；可直接用 VS Code、任意文本编辑器、GitHub 或 Obsidian 看。原文强调自己的笔记只读不重写；也可把 vault 放进 Git 或用 folders 备份。预期：历史变成可 grep、可人工复核的 Markdown，而不是只躺在 SQLite 里。
8. 团队版按需再加。前提：团队自己有一台小服务器；网络访问时要 https 反向代理，客户端除 localhost 外拒绝 plain http。先单机用，确认有价值再开团队。

```bash
thenwise team serve --dir ~/team --console <hub build>
thenwise team invite alice --dir ~/team
thenwise team join <url> <token>
thenwise share <note>
thenwise team search <words>
thenwise team share-chats <repo path>
thenwise team unshare-chats <project or session id>
```

原文说共享前会预览和脱敏，聊天原文不离开本机，除非主动共享某个项目的聊天；服务器宕机时共享排队，下次会话开始重试。预期：团队能搜到共享的决策和死胡同，但看不到未共享的聊天原文。
9. 可选自动化，默认关闭。原文给出 `config.json` 的 `team.auto_share`、`team.auto_share_projects`、`capture.auto` 配置项：可自动共享已接受的决策/死胡同，或每天通过 `claude -p` 把新聊天蒸馏成 inbox 提案。建议先不开，等手动流程稳定后再评估。
10. 把 L 放进现有分工。L 管“历史检索 + 会话边界注入”；`CLAUDE.md` 和 Claude 自带记忆仍管常驻规则；A 管手工落盘的长期信息；C 管可摄入/可提问的 vault；F/H 管服务化记忆与团队记忆；D 管 git/GitHub/本机事实核对；E 管“你说的话 vs 知识库记录”的冲突裁决；I 管文档与代码冲突。L 会读 `CLAUDE.md`，但不会替你改写它，也不证明历史记录就是当前事实。
11. 小范围试用与判定。先在一个非关键仓库跑完第 1—5 步，用同一组历史问题盲评；再连续用一到两周，记录重复交代率、历史问题答对率、无关注入比例和 hook 错误数。若答对率没有提升、无关提示明显增多或 hook 拖慢会话，关掉 `prompt_map`/`startup_brief`，只保留手动 `/thenwise:why` 等命令。

### 做法 M：用 ECX 让会话先加载共享记忆、启动时体检、宣布完成前先跑测试（saksham10arora-dotcom/everything-claude-codex）

材料边界：只依据 README，未查看仓库代码、安装脚本和测试日志。README 称包含 17 个 skills、21 个 hooks、3 种库检索方式、双代理共享记忆、手机端接力、启动健康检查和“测试通过才算完成”的约束。以下命令均可从 README 抄出，但“可重复运行、不覆盖已有文件”需安装时验证。

1. 备份并做基础安装。先复制一份笔记库到独立目录，备份 `~/.claude` 等现有配置。前提：Claude Code；Python 3.9+；macOS/Linux；若要多代理共享记忆再装 Codex。预期：安装脚本询问笔记库位置和名字，并声称先保存 `.ecx-bak` 备份、不覆盖已有文件。

```bash
git clone https://github.com/saksham10arora-dotcom/everything-claude-codex ~/ecx
cd ~/ecx && ./install.sh
```

2. 按需装完整栈，不要一上来全开。需要搜索、定时任务和手机模式时：

```bash
./install.sh --vault ~/vault --name Ada --with-search --with-cron --with-phone
```

前提：`~/vault` 是你的笔记库路径；手机模式使用你拥有的私有 GitHub 仓库。预期：在基础安装之上接入检索、定时任务和手机同步。原文没有给出 `--with-cron` 的具体调度实现，需安装后自行确认。

3. 在笔记库中打开 Claude Code，执行 `/boot`。预期：README 称给出 30 秒简报。验证方法：在 `hot.md` 写一个唯一标记，重开会话看首轮是否知道它；不知道就说明共享记忆没有加载。

4. 启用共享记忆。核心是 `hot.md` 保存当前有效信息，hook 在第一条消息前加载它和最近会话；每次 `/compact` 后自动刷新。Codex 通过 `AGENTS.md` 读取相同文件。前提：安装时已接入模板并确认 hook 生效。预期：Claude Code 和 Codex 在新会话开头看到同一份当前有效信息。注意：`hot.md` 仍是“主张”，不是 git 事实。

5. 启用双代理同步（可选）。README 称每次消息前，hook 把另一个代理的最新聊天内容交给当前代理，包括 Codex 语音转录；也可用 `sync.py send` 直接互发，日志在 `agents/AGENT_CHAT.md`。前提：安装 Codex 并启用 agent-sync。预期：对 Codex 说一个唯一标记，再问 Claude 是否知道；检查 `agents/AGENT_CHAT.md` 和同步延迟。只用 Claude Code 时跳过此步。

6. 配置“测试通过才算完成”。在仓库中设置 `.ecx/test-command`，写入该仓库实际测试命令；关闭则写：

```text
off
```

预期：hook 会在 Claude Code 或 Codex 尝试结束时先跑测试，失败就把失败输出送回代理；只在实际有改动时运行；能自动发现 npm、pytest、unittest、cargo、go 和 make 测试；连续失败 3 次后放弃而不是死循环。原文没有给出示例测试命令，必须按你的仓库填写。验证方法：在一个当前测试可通过的仓库里故意制造一个失败测试，确认代理结束时被拦住并收到失败输出；修复后确认能通过；再观察连续失败 3 次是否停止。

7. 启用健康检查。README 称 `doctor` 覆盖 hooks、索引、任务和同步等 16+ 项检查，并在每次 Claude Code/Codex 会话开始时运行；健康时静默，异常时给出警告和修复提示，以及索引最后更新时间。原文未给出单独运行 doctor 的命令，需以安装后的脚本为准。预期：工具故障在调用前暴露，而不是干到一半才发现 hook 或索引坏了。

8. 可选：三种库检索。`--with-search` 后，按 README 包括按语义的 ChromaDB、按关系的 LightRAG 图、按图片的 CLIP 检索，并由 router 选择；每晚重新索引。前提：接受本地/云模型的相应数据边界。注意：关系图默认可能把笔记文本发到 Ollama 云，若不能接受，用 `ECX_LLM_MODEL` 改为本地模型；改完要确认实际调用的是本地端点。

9. 可选：手机接力。每次回复后把笔记和记忆同步到私有 GitHub 仓库；手机端用 Claude app 或 ChatGPT app 在云上操作该仓库；语音捕获落到 `inbox/`，由 GitHub Action 合并，下次打开笔记本时再归档。前提：仓库必须设为私有。预期：手机端能继续同一份记忆，但这条链路会把内容放到 GitHub 云端，先只用非敏感材料试。

10. 与现有做法的关系。M 的 `hot.md` 是“主张”，不替代 D 的 `ground-truth.sh`；M 的测试闸门是“完成前证据”，不替代 I 的“以代码为准并列出冲突点”，也不证明测试覆盖足够；M 的 doctor 只查工具健康，不查结论真假；M 的检索与 C/L 重叠，选一层主用，避免两套记忆互相打架。E 的冲突裁决指令可以和 M 叠加：`hot.md` 与你当下说法冲突时，仍要标记冲突并请你裁决。

11. 小范围试用。先复制笔记库、备份配置，只做基础安装，不开 `--with-phone` 和 `--with-search`；在一个可回滚的测试仓库启用 `.ecx/test-command`，跑 `/boot`、故意制造失败测试、看 doctor 是否静默；若用 Codex，再用唯一标记测一次 `agents/AGENT_CHAT.md` 同步；两周后再决定是否加搜索和手机模式。

## 怎么判断变好了

最小试用方式（A-1/A-2/A-3、B、C、D、F、H）：

1. 建一个 `second-brain` 目录，只放少量非敏感材料，不要一上来就接真实收件箱。
2. B：在本机装好并授权 GWS CLI，先只开一项权限（例如日历只读）跑通；安装与授权命令原文未给，需自行查文档确认后再执行。
3. A-1：在目录下建 `memory` 子目录，并在 `CLAUDE.md` 写一条规则：把每次会话中确认的长期有效信息追加到 `memory` 下的文件中，并在开始新任务前先读取 `memory`。规则内容需自行拟定，原文未给出。
4. A-2：选一个你最近反复解释过的真实项目，建 `second-brain/notes` 与 `second-brain/people`；只放入 notes 内容和你能确认的 people 相关信息；用同一任务做两次对比：一次不提供目录上下文，一次在该目录中让 Claude Code 基于现有材料工作。原文未给具体提示词。
5. A-3：选一个真实小项目，创建一个空文件夹并在其中打开 Claude Code，执行 `mkdir -p MEMORY notes people projects`，在 `CLAUDE.md` 加入按话题写入的常驻指令。原文关键一行缺失，先用自拟占位并人工检查。连续跑 3–5 次会话；每次结束人工检查文件是否写对、有无记错；同时做对照：同样任务在不加这条指令的文件夹里跑一遍。记录重复解释次数、写入准确率、陈旧/冲突条目占比、复用率、每周清理分钟数。两周内若没有减少重复解释，或错误记忆造成的返工多于节省的时间，降级为只借鉴“按话题分目录落盘”的思路。
6. 连续使用 1～2 周，每天在同一目录下开 Claude Code 做真实工作。
7. C：同一模型、同一 vault、同一批问题，唯一变量是有没有装 obsidian-wiki；ground truth 用 networkx 而不是本项目自己的代码。
8. D：clone 后运行 `bin/adopt.sh`，先填好 `.claude/ground-truth.conf` 并把 `ground-truth.sh` 跑到 `GROUND TRUTH: complete`，再用 `/session-start` 和 `/handoff` 包住每天的工作。观察脚本报出的“handoff 与事实不一致”条目数是否下降。
9. F：先在测试机、单仓库、只接一个 agent 的情况下按 README 装上并 `ai-memory setup`，重启 agent 后问 “What do you remember about this project?”；然后连续 1～2 周在同一仓库用 `ai-memory run claude` 或 `ai-memory run codex --yolo` 工作，对比“新会话是否还要重新交代背景”。
10. H：先按第 1—11 步做单团队、SQLite、一个客户端的部署；用 2—3 次真实会话看召回是否减少重复交代，再决定是否扩到第二个成员或第二个 agent。

最小试用方式（E，一次就能跑完）：

1. 按上面的草稿写好常驻指令，只挂在你自己一个人的日常任务上，不要一上来就推给团队或改公司级知识库。
2. 挑 5 个你已知答案的任务，其中至少 2 个故意说一句与知识库内容矛盾的话。
3. 逐个记录：它有没有真的先读库；矛盾有没有被标出并同时引用两个版本；裁决后给出的编辑是否可以直接采纳。

最小试用方式（G）：

1. 选一个 JS/TS 单 `package.json` 项目，先跑 `npx stalemap` 预览，确认笔记块内容与你的依赖变更相关。
2. 再跑 `npx stalemap sync` 写入 `AGENTS.md` 或 `CLAUDE.md`，并在 CI 加 `npx stalemap check`。
3. Claude Code 侧装插件，观察 SessionStart 注入和编辑后 guard 是否触发。
4. 用同一模型、同一批任务、同一项目做对照：一组不装 stalemap，一组装 stalemap；记录会话通过率、首次编辑使用过期 API 的比例、单会话成本与时长。

最小试用方式（I，一次任务到 2—3 个同类任务）：

1. 选一个有已知“文档落后于代码”问题的小仓库。
2. 把规则加入 `CLAUDE.md` 或 `AGENTS.md`。
3. 让代理完成一个小型代码修改任务，要求照常给出最终回复。
4. 与未加规则前的同类任务对比：是否列出冲突点、是否按现有代码改、返工是否减少。

最小试用方式（J，一到两周）：

1. 选一个进行中的项目，建一个最小 vault，只放该项目笔记、个人偏好和决策记录。
2. 按上面的提示词运行，节律保持“任务前读取、每晚整理、周末复盘”；原文没给定时配置，触发方式按你的环境补。
3. 每晚写回后随机抽 10 条，标记准确、过期、错误三类。
4. 试用前后各测一周，对比下面五项指标。

最小试用方式（K，约半天启动，观察一到两周）：

1. 选一个 2 万至 10 万行、你自己有测试命令的中型仓库。
2. 把 Mycel 克隆到项目外，跑 `node mycel.mjs open`（最小试用段原文写的是 `node mycel.mjs start`，先以实际 `--help` 为准）；在项目里对 Claude Code 执行 `plugin --install`，开新会话，让它按 `/agent` 指南建图，记录耗时与你被迫纠正的次数。
3. 把地图做到 concept + mechanics 两档就能讲清“这个产品有哪几部分、各自怎么运作”；给 3–5 个关键块配上测试命令，跑 `node mycel.mjs check`。
4. 之后正常开发一到两周，每天记录 `health` 里 red/outdated/unchecked/planned 的数量。

最小试用方式（L，先单仓库）：

1. 选一个非关键但历史较丰富的 Claude Code 仓库；先不装，准备一组有标准答案的历史问题，覆盖“为什么这样决定”“以前试过什么”“某日当时是什么状态”“某文件的历史”，把答案藏起来，用 plain Claude Code 新会话回答并记录。
2. 安装后开新会话，运行 `thenwise setup`、`thenwise doctor`、`thenwise status`，确认项目被收录、数据目录和 hooks 正常。
3. 用同一组问题在新会话重问；用 `/thenwise:why`、`/thenwise:tried`、`/thenwise:asof` 或让 Claude 调 `memory_*` 工具；盲评答案是否正确、是否引用正确来源和日期。
4. 专测“该不该主动插入”：问一个与历史无关的当前编码问题，看是否被无关记忆打扰；打开一个已知有死胡同的文件，看是否提示；问一个近期项目，看启动简报是否有用；用 `thenwise logs --errors` 看 hook 错误。
5. 测隐私开关：用一条测试聊天加 `[no-memory]`，确认之后搜不到；用 `thenwise forget` 删除测试记录，确认检索不到；不要用真实密钥做测试。
6. 单机有效再评估团队版；团队版另测共享预览、脱敏、token 权限、服务器故障排队和 unshare 回收。

最小试用方式（M，先两周）：

1. 复制一份笔记库到独立目录，备份 `~/.claude`；只跑基础安装，不加 `--with-phone` 和 `--with-search`。
2. 在笔记库开 Claude Code，执行 `/boot`；先在 `hot.md` 写一个唯一标记，重开会话看首轮是否知道它。
3. 在一个测试当前可通过的仓库启用 `.ecx/test-command`，故意制造一个失败测试，确认代理结束时被拦住并收到失败输出；修复后确认能通过；观察连续失败 3 次是否停止。
4. 若使用 Codex，对 Codex 说一个唯一标记，再问 Claude 是否知道，检查 `agents/AGENT_CHAT.md` 和同步延迟；若不使用 Codex，跳过此项。
5. 每次会话开始观察 doctor：健康时是否静默，异常时是否给出可执行修复提示和索引更新时间。
6. 两周后再决定是否加搜索和手机模式；手机模式只用私有仓库测试一条语音捕获到 `inbox/` 的链路。

观察指标（A-1/A-2/A-3、B）：

- 重复交代率：同一背景信息需要重新告诉 AI 的次数是否下降。
- 召回成功率：跨会话提问“上次关于 X 的结论是什么”，能否从 `memory`、`notes`、`people` 或 `projects` 中正确取回。
- 目录是否被实际读取：agent 是否引用 `notes/`、`people/` 或 `projects/` 中的内容；从不引用说明只是堆文件，需要补常驻指令。
- 记忆文件质量：条目里有多少比例确实是长期有用的，多少是噪声。
- A-3 的写入准确率：话题归类是否正确、决定有无被记错（人工抽查每条）。
- A-3 的陈旧/冲突条目占比：需要人工清理的比例；若很高说明方案不划算。
- A-3 的复用率：有多少次 Claude 确实依据文件里的旧决定做出了正确动作，而不是无视文件。
- A-3 的清理成本：每周维护这些文件花多少分钟。
- 越权与泄漏：是否出现过读取到不该读的邮件/文件，或把敏感内容写进记忆文件、人物目录。此项为红线指标，出现即停。
- 对照组：同期在另一个不含 `memory`、`notes`、`people` 与 `CLAUDE.md` 规则的目录里做同类任务。

观察指标（C，逐题对比回答耗时、正确率、工具调用次数、API 成本）：

| 指标 | 普通智能体 | 装了 obsidian-wiki |
|---|---|---|
| 回答耗时 | 81s | 19s（快 4.4×） |
| 正确率 | 44% | 83% |
| 工具调用次数 | 9.9 | 4.6 |
| API 成本 | $0.202 | $0.208（基本不变） |

逐题数据：“How is X connected to Y?” 122s → 18s；“What topic clusters do I have?” 117s → 21s；“Which pages hold my vault together?” 61s → 12s；“What breaks if I delete X?” 26s → 24s（几乎无改善）。收益集中在结构性/图关系类问题上。

观察指标（D）：

- 脚本是否以 `GROUND TRUTH: complete` 结束；出现 UNKNOWN 或退出码 2 时，当作没通过。
- `/session-start` 报告的主张与事实不一致条目数；README 样例一次暴露 3 条 ⚠。
- 每个任务的“done when”是否可执行。
- 后台任务、PR 的 CI 状态、未推送提交是否在下一次 `/session-start` 被翻出来。
- 注意：README 没有描述无人值守的后台自动运行，推进发生在会话边界。

观察指标（E）：

- 读取命中率：需要用到知识库信息的任务里，它主动读取的比例。
- 冲突召回：你预设的矛盾里被标记出来的比例。
- 误报数：把本来不矛盾的内容标成冲突的次数。
- 编辑可采纳率：它给出的“对大脑的确切编辑”中，你能直接照改的比例。
- 成本：每个任务额外的耗时和 token 消耗。

观察指标（F）：

- 接线是否成功：重启 agent 后问 “What do you remember about this project?”，它是否通过 ai-memory 回答。
- 重复交代率：新会话、跨 agent、跨机器时是否还要重新交代。
- 记忆文件质量：wiki 页面是否可 grep、可手工编辑、可 rsync；数据库是否可从文件重建。
- 越权与泄漏：捕获、搜索、handoff 会采集提示词与工具调用，此项是红线指标。
- 对照组：同期在未装 ai-memory 的仓库或另一个 agent 上做同类任务。

观察指标（G）：

- 会话通过率：同一批任务、同一模型，装与不装 stalemap 的通过率差异。调研结论称预注册盲测数据为 89%（stalemap）vs 68%（无辅助）vs 73%（普通 tsc 钩子）；但报告正文在“通过率：”处截断，具体表格无法引用。
- 首次编辑使用过期 API 的比例。
- 单会话成本与时长。
- 天花板对照：把“人工写一行点名变更的提示”当作上限。
- 普通 `tsc` 钩子不能当作 stalemap 的等价物。

观察指标（H）：

- 接线是否成功：下一次会话是否收到 `<relevant-memories>` 或对应的召回块；Panel 的 Monitor 是否显示蒸馏健康。
- 重复交代率：同一团队、同一 agent，新会话是否还要重新交代背景。
- 召回相关性：召回块里有多少是当前任务真正相关的。
- 隔离是否正确：成员 A 的私有对话和 facts 是否没有出现在成员 B 的召回里。
- 越权与泄漏：H 会捕获对话并蒸馏，此项是红线指标。
- 运维成本与许可证：SQLite 单节点是否够用；部门数、成员数是否仍在免费范围。

观察指标（I）：

- 最终回复是否明确列出发现的文档与代码冲突点。
- 代码修改是否遵循现有代码行为。
- 与未加规则前相比，因过时文档导致的返工是否减少。
- 误报冲突数；成本：最终回复变长带来的阅读与核对开销。

观察指标（J）：

1. 每次任务开始前重建上下文的时间（分钟）。
2. 同一背景信息需要向 Codex 重复解释的次数。
3. 每晚整理耗时，以及写回条目的数量。
4. 周末复盘时被合并或删除的冗余条目占比。
5. 人工抽查：随机抽 10 条记忆条目，统计准确、过期、错误的比例。

判断标准：第 1、2 项明显下降，且抽查错误率保持在较低水平，说明这条流程对你的工作有实质改善；整理耗时持续高于节省的上下文重建时间，或错误条目增多，就降级为手动整理，或放弃这套节律。

观察指标（K）：

- 项目理解成本（主指标）：让一个没看过该项目的人或一个全新会话的智能体，只凭 `context --brief` 与地图回答同一组 10 个问题；对照组只给 README。比较正确率与用时。
- 上下文有效性：用“选中块 + do this here”下达的任务，一次就改对文件的比例，对比只用文字描述任务的基线。
- 维护成本 vs 收益：一周内被 `watch` 标为过时、由你手工修正的块数；如果修正成本高于节省的沟通成本，就退回 study，不写进手册。
- 验证闭环：`check` 的通过率变化、失败的块被及时发现的次数。
- 上下文体量：`context --brief` 输出的字符/token 数，以及有多少块真的被智能体引用或改动。
- 反向指标：智能体被过时块误导的次数（改错文件、引用已删除的概念）。出现两次以上就说明先得治地图过期，再谈把它当上下文。

观察指标（L）：

- 历史问题答对率（盲评）是否明显高于未安装时。作者自测个体 93% vs 37%、团队 88% vs 17%，但材料未给出评测题目、评分细则和原始数据，需自行复现。
- 引用来源/日期是否正确，是否把旧记录误当当前事实。
- token 消耗和回答耗时是否下降或至少不恶化。作者自测个体 token 约一半、1.9 倍更快（14 秒 vs 26 秒），团队 token 少 39%、1.5 倍更快（16 秒 vs 24 秒），需自行复现。
- 无关提示被注入的比例、文件打开时提示的命中率。
- `setup`/`doctor`/`logs` 的错误数、hook 是否拖慢会话。作者称 hooks 约 50ms、无记忆聊天只增加约 1% token，需复现。
- 隐私检查是否通过：`[no-memory]` 后搜不到、`thenwise forget` 后检索不到、脱敏是否覆盖真实密钥形态、团队共享边界是否符合预期。
- 对照：同一仓库、同一组问题，未安装 thenwise 的新会话作为基线；不要只凭“感觉记得更多”下结论。

观察指标（M）：

- `/boot` 是否真的加载了 `hot.md`：用唯一标记验证，而不是只看命令回显。
- 新会话是否减少重复交代背景：同一仓库、同一任务，装与不装对照。
- 测试闸门是否拦住失败：故意制造失败测试，统计被拦次数、失败输出是否回到代理、连续失败 3 次是否停止。
- 误拦截与额外等待：测试命令跑得太久或误判时，是否可接受；不可接受就先缩小测试命令范围。
- doctor 是否稳定：健康时静默、异常时给可执行修复；统计每次会话开始的警告数和修复率。
- 双代理同步：唯一标记从 Codex 到 Claude 的可见率、`agents/AGENT_CHAT.md` 是否记录、同步延迟是否影响工作。
- 检索命中：用改写描述找回目标笔记的比例；关系图检索是否把不该发的笔记发到云。
- 手机接力：语音捕获是否落到 `inbox/`、GitHub Action 是否合并、是否只用了私有仓库。
- 反向指标：hooks 拖慢会话、doctor 误报、测试命令与仓库不匹配导致代理反复失败。出现明显拖慢或误报，先关掉对应 hook 或缩到只保留测试闸门。

试多久：A-1/A-2/B 用 1～2 周，重复交代率与召回成功率没有可观察改善就放弃；A-3 连续跑 3–5 次会话，两周内没有减少重复解释或错误记忆造成返工多于节省时间就降级；C 作者自评 early、样本 n=2，先小范围试；D 本次材料只到 README，先小范围试再谈全面采用；E 一次就能跑完（5 个任务），判定标准是冲突召回高、误报低、编辑可采纳率高、成本可接受；F 先单机、单仓库、只接一个 agent 跑 1～2 周；G 原文未给试用时长，先在一个 JS/TS 单 `package.json` 项目小范围试，不要直接 adopt；H 先用 2—3 次真实会话验证接线和召回，再给 1～2 周观察重复交代率；I 一次任务就能看出是否列出冲突，要判断返工是否下降至少跑 2—3 个同类任务；J 按原文给的节律跑一到两周，对照五项指标再决定是否留下；K 约半天启动，正常开发一到两周；如果修正过期块的成本高于节省的沟通成本，就退回只研究、不写进默认流程；L 原文未给固定时长，先用一组有标准答案的历史问题跑完一轮，再在单仓库连续用一到两周；M 先两周基础安装，只验证 `/boot`、测试闸门和 doctor，再加搜索与手机模式。

## 常见坑

- second-brain 原有第 4 步截断，`CLAUDE.md` 规则全文未知，不能直接照抄“所有重要细节”；需要自己界定什么算长期有效信息。
- A-2 原文在 `people/` 处截断，第三个文件夹和后续用法缺失；不能把“建 `notes/` 和 `people/`”当作完整 second-brain 设置。
- A-3 原文在 `・创建MEMORY/、notes/、people/、projects/` 处截断，最关键的 `CLAUDE.md` 那一行没有保存下来；本手册中的 A-3 规则是按原文意图自拟的占位，不是原文，不能当成已验证配置照抄。
- A-3 的完整目录清单可能不止四个；原文只列举到 `projects/` 即截断，别假定没有其它目录。
- A-3 用大写 `MEMORY/`，A-1 用小写 `memory/`；两者可并存，但要在 `CLAUDE.md` 里写清楚哪个目录放什么、何时读，否则会互相矛盾。
- `notes/`、`people/`、`projects/` 只是目录结构，不会自动让 Claude Code 读取；必须配 A-1 的 `CLAUDE.md` 规则或常驻指令。
- `people/` 里放什么、第三目录叫什么、更新规则是什么，A-2 原文都没说；涉及人物信息先按非敏感材料试。A-3 的 `people/` 同样有隐私问题，团队共享或同步到远端前先确认边界。
- A-3 的写入归类靠模型判断，可能记错或记错位置；必须人工抽查，不能只看“写入了”就算成功。
- A-3 的记忆文件会累积陈旧信息，与代码/现实状态脱节，需要定期清理；清理成本持续高于节省的上下文重建时间，就停用。
- A-3 多人协作时同一文件易冲突；如果多人/多 agent 同时写，先约定分工或改用带并发写入控制的方案。
- A-3 只有一条推荐型推文（67 赞、2 转、1 回复），转述另一条带视频的原帖，没有数据、没有前后对比、没有失败案例；“加一行就能按话题自动沉淀决策”“准备约 5 分钟”都是作者主张。
- 传播数据（70 赞、10 转发、24 回复等）只是传播热度，不是效果证据。
- 原文没有 GWS CLI 的安装命令、包名来源和授权流程，不能凭想象执行。
- “所有重要细节”没有界定范围，容易把噪声写进 `memory`，需要人工清理。
- 做法 A 未说明记忆如何被召回：是每次会话自动读取，还是需要显式提示，原文未交代。
- 未说明 GWS CLI 的授权范围、凭证存储方式与撤销方式，存在隐私与凭据风险。
- C 作者自评项目“early”，效果数据只有 n=2 的小样本。
- C 的一个具体失败机制：普通智能体追踪连接关系时会走 `index.md`——它链接到每一页，于是“找到”一条毫无意义的短路径，并据此把 `index` 列为 vault 最重要的页面之一；两次运行都犯同一个错。skill 查询的图排除了这类记账文件，所以正确答案才可达。
- 安装 obsidian-wiki 时，原文明确说不要用 `uvx`；用 `uv tool install` 或 `pipx install`。
- Claude Code 插件路线只带 skills，不带 session hook 和 CLI；要会话开始注入回顾、结束提醒捕获就得走 pip 安装路线。
- 原文只描述了 hook 触发和维护命令，没有给出按时间/状态自动调度的配置。
- Cursor、Hermes、OpenClaw 的支持都只是 README 里的一句话，没有配置细节。
- Obsidian 只是查看器和 Markdown 载体；vault 就是磁盘上的纯 Markdown 文件夹，不想引入 Obsidian 不必放弃做法 C。
- D 本次材料只到 README，脚本实现与效果未经验证；不要把它当作已经证明能减少所有记忆失真。
- D 的推进发生在会话边界，不是无人值守后台；README 没有描述自动调度。
- D 的工作区形态要求根目录 remote 必须是 PRIVATE，首次提交前要检查 `git status --ignored`、扫密钥，且绝不追踪 datadir、密钥或二进制。
- 主张和事实的优先级：A 的 memory、C 的 vault、F 的 wiki/handoff、H 的召回结果、J 的知识库、K 的地图、L 的历史检索结果、M 的 `hot.md` 都可读，但先跑 ground truth；否则可能把旧笔记、过期地图或旧聊天当事实继续施工。
- E 最大的材料缺口：原文写“完整提示如下”，但采集到的正文里没有这段完整提示，本手册中的提示词是按三条要点重写的草稿。
- E 的“不告诉 AI 怎么用第二大脑，它就毫无用处”“修复只要 90 秒”都只是作者主张；101 赞、6 次转发、14 条回复是传播指标。
- E 没提的成本与风险：每次任务前读库带来的 token/时间开销、冲突误报造成的打断、让 AI 直接改写知识库的出错风险。
- E 与 A 的规则可能叠在一起：A 只规定“读和追加”，E 要求“冲突标记 + 裁决 + 确切编辑”；注意不要互相矛盾，也别把 E 的写回编辑当成自动生效的改动。
- F 的所有收益说法都只有项目自述、没有独立验证。
- F 要常驻服务并采集提示词与工具调用；先单机、单仓库、只接一个 agent，用非敏感材料试。
- F 的 Docker quick-start 没有认证——容器没跑 `init`，不带 token 启动；服务只绑 loopback，但本机进程和浏览器页面可以访问。不要把该端口暴露到外网。
- F 的 Windows 原生支持被 README 标为 Experimental，更稳的路子是 WSL2 或 Docker Desktop。
- F 的原文在 `ai-memory run --f` 处截断，不能补全。
- F 的“跨 20 多个 harness、跨项目 profile、跨机器、团队共享、多用户认证、审计日志不是付费档、无 LLM 记忆老化、写入上限约 700/s”都是 README 自称。
- F 不能替代做法 D：它的 handoff 仍是主张。
- G 只支持 JavaScript / TypeScript 项目，且只支持一个 `package.json`，尚无 workspace 遍历。
- G 对无自带类型的包只能靠 release note；`@types/*` 不做 diff。
- G 的预注册盲测数据是作者自测，只测了两个 Claude 模型；报告正文在“通过率：”处截断。
- G 的 Cursor / Codex / OpenCode `setup --agent` 原文明确说尚未在真实安装中验证过；Cursor 目前不把 `postToolUse` hook 的上下文传给模型，只能靠 stop-hook 兜底。
- G 的普通 `tsc` 钩子是 guard 的子集，二者不等价。
- G 的 `npx stalemap check` 会在笔记块缺失或过期时 exit 1；不要忽略这个失败。
- G 把笔记写在 `AGENTS.md` 时，Claude Code 读的是 `CLAUDE.md`；要在 `CLAUDE.md` 里加 `@AGENTS.md`，或用 `--target CLAUDE.md`。
- G 的插件和 hook 走 `npx -y stalemap@latest`，因此始终用最新 npm 版本；要固定版本需自己另做控制。
- G 的 `--budget` 默认 1800 tokens；不要为了塞全量 changelog 把预算撑爆。
- G 的 `probe` 直接点名旧 API，测的是“被指到时知不知道”，比“主动发现”容易。
- G 的 comment 模式需要 `permissions: pull-requests: write`；没有这个权限就不要开。
- G 的数据边界：包名与版本会发往 npm registry、GitHub、models.dev；`--llm`/`--examples`/`--guides` 会把类型 diff、release note 片段、指南文本与导入的 API 名发往 Claude（不含代码）；`probe` 的提示词发给你选的 provider。
- H 的许可证是硬约束：0.4.0 起服务端为 BUSL-1.1，免费范围只到评估、个人、非营利，以及最多 1 个部门、10 个成员的组织。
- H 的 README 没有在正文给出 `amem` 安装命令，只指向 `docs/REMOTE-CLIENTS.md`。
- H 的 README 没有给效果数据。
- H 会捕获每次对话并蒸馏；先用非敏感内容试，并确认成员私有对话、agent 共享 scenes/persona 的隔离符合预期。
- H 的 SQLite 是每部门一个文件，`sqlite-vec` 加载失败会退化为暴力比较；数据量上来后要评估 PostgreSQL/pgvector。
- H 的多副本需要 Redis；队列是 at-least-once，节点崩溃会重投，任务要幂等；Redis 锁 TTL 10 分钟，且不支持 Redis Cluster。
- H 的默认触发不是实时：L2 有 90 秒延迟且至少间隔 900 秒，L3 在冷启动、每 50 条新记忆或 scene 更新时触发；刚聊完立刻问“你还记得吗”可能还没蒸馏完。
- H 的客户端只用 user key，不需要 `AGENT_MEMORY_API_KEY`；每次记忆调用要带 `team_id` 和 `agent_id`。不要把 admin 的 Gateway key 当客户端 key 用。
- H 的 Panel 其他成员默认只读；创建用户、团队、agent 要用 admin user key，且 admin user key 只显示一次。
- H 的手动部署要先 `cp .env.example .env` 并至少设 `AGENT_MEMORY_API_KEY`；数据库在宿主机时用 `host.docker.internal` 而不是 `localhost`。
- H 的 `/health` 的 `stores.vectorIndex` 可能显示 `none`、`brute-force` 等；先确认它符合预期，再判断召回质量。
- H 的 `agy` 作为 CLI 后端时，prompt 作为参数传入，受 Linux 单参数 128 KiB 限制，且需要 CPU 支持 AES-NI。
- I 的原文只有一条规则和一句目的说明，且在“据说Claude”处截断。
- I 的“以代码为准”是一个前提假设：代码本身可能有 bug 或正处于重构中；按代码改之前仍要人复核。
- 规则写进 `AGENTS.md` 而 agent 只读 `CLAUDE.md` 时不会生效。
- 冲突点全列进最终回复会增加噪声；误报频繁时先收紧“文档”的范围和“冲突”的判定。
- I 不能替代做法 D 的事实核对。
- J 的原文只有一段提示词，且在“这样你的 Codex”处截断；目录结构、读写权限接入、定时触发这三项最关键的信息都不在原文里，落地成本高于推文给人的印象。
- J 没有规定知识库结构；直接用单文件堆砌，会让“按需读取”退化成全量加载或干脆读不到。
- J 没有冲突处理规则：它默认把当日内容写回库，写错或过期的条目会在后续任务里被反复读取并放大，比没有记忆更糟。需要叠加 E 的冲突指令，或每晚人工抽查。
- J 的“每晚十点”“每周复盘”只是时间点，原文没说由谁触发；环境没有定时能力时，必须改成人工在固定时间发起，否则节律不会发生。
- J 的“当日项目沟通记录”来源未定义；不指定来源，这一步会变成让 Codex 凭空总结。
- J 不替代 D：库里的内容仍是主张，git/GitHub/本机事实仍要脚本核对。
- J 在单项目、短周期工作里可能开销大于收益；“永久记忆”“减少冗余读取”都只是作者主张，没有数据支撑。
- K 目前只有 README，未看到 `docs/reference.md`、`src/agent-guide.md` 正文，也没有实际跑过；项目 0.22 早期、约 30 stars、单一作者，无生产使用案例。
- K 的安装段用 `node mycel.mjs open`，最小试用段原文写 `node mycel.mjs start`，两者不一致；先以 `node mycel.mjs --help` 和实际可用命令为准。
- K 的 README 说数据在“程序旁的 `.mycel/`”，同时又有 `init` 连接当前文件夹、令牌在 `.mycel/token`；两者关系需查 `reference.md` 确认后再决定把它放在哪、是否纳入版本控制。
- K 的地图质量取决于所用智能体能力与代码库规模；大仓库下 `context --brief` 的体量与 token 成本无数据。
- K 界面仅 EN/RU；地图本身用什么语言由你和智能体决定。
- K 的“地图保持存活”“智能体边看你边画图”“四档层级足以表达一个项目”“不往任何地方发送数据”“不写入你的项目”都是作者主张，未经核验。README 自称唯一出站请求是 `mycel chat` 调你指定的模型服务，以及 VM 安装脚本从 nodejs.org 下载 Node 并校验 SHA-256。
- K 默认只在 `127.0.0.1:4317` 监听；跨 VM 要 `remote on`、4 位码 Allow，每台机器一个可随时吊销的 key；经 API 写入需要 `.mycel/token`。不要把端口暴露到外网。
- K 的本地模型 `mycel chat` 对项目文件只读；它具备全部 Mycel 工具，但不能替代你改代码。
- K 没有聊天功能，对话始终在智能体自己的窗口里；不要把 Mycel 当聊天界面。
- K 的 Claude Code 集成最完整；其他 agent 的 `plugin --agent <name>` 只打印 MCP 条目及应写入的位置，需要你 manual 落到配置里。
- K 的地图过期会误导 agent：被 `watch` 标为过时的块要先修，再让 agent 依据它改代码；出现两次以上被过时块误导，先治地图，再谈把它当上下文。
- K 不能替代 D 的事实核对，也不能替代 I 的“以代码为准并列出冲突点”；地图、代码、文档三者冲突时，仍要人复核。
- L 目前只有 README 和作者自述的隐藏答案盲评数据；`docs/eval.md` 的题目、评分细则和原始数据不在材料里，93% vs 37%、88% vs 17%、14 秒 vs 26 秒等数字不能当定论。项目约 30 stars，不是大规模独立验证过的成熟工具。
- L 有版本门槛：Node 22.16+；一行安装需要 Claude Code 2.1.275+；历史必须在 `~/.claude/projects`。非 Claude Code 工作流或没有历史数据的仓库，装了也检索不到东西。
- L 默认每日一次 npm 版本检查；不想让它联网，用 `thenwise update-check off` 关闭。默认不发送遥测，但“默认”不等于“永远不会”，团队模式另说。
- L 的脱敏会漏掉跨两行折断的 key，`process.env.API_KEY` 这类代码仍可读；不要用真实密钥测试。`thenwise forget` 够不到 Claude Code 自有文件和 Time Machine 副本，彻底停用要 `thenwise uninstall` 并手动删文件。
- L 的自动注入有 token 预算：启动简报最多 200 token、压缩后 resume brief 最多 1,500 token、问过去最多 3 个线索约 300 token、打开文件最多 600 token。无关提示多时，用 `config.json` 关掉 `prompt_map`/`startup_brief`，不要一边嫌吵一边全开。
- L 的 hook 错误不会让聊天失败，但会静默进日志；用 `thenwise logs --errors` 查，不要假设“没报错就是没出错”。
- L 的团队模式要自托管服务器、https 反向代理和 token 管理；客户端除 localhost 外拒绝 plain http；服务器宕机时共享排队，下次会话开始重试。不要把团队服务裸露在公网。
- L 的历史记录是“主张”，不是当前事实：旧记录可能已被较新记录覆盖，也可能当时就记错。涉及分支是否推送、PR 是否合并、后台任务是否还在跑，仍要用 D 的 `ground-truth.sh` 或等价手段核对。
- L 不替代 `CLAUDE.md` 常驻规则；它读取 `CLAUDE.md`，但不会替你维护它。也不替代 E 的冲突裁决：历史说 A、你当下说 B 时，仍要标记冲突并请你裁决。
- L 与 A/F/H 的记忆可能重复：A 是手工落盘、F/H 是服务化捕获、L 是历史检索。先明确哪一层负责“常驻规则”、哪一层负责“历史检索”、哪一层负责“事实核对”，否则两套记忆互相打架。
- L 的团队共享聊天原文默认不离开本机，除非主动共享某个项目的聊天；共享前有预览和脱敏，但仍要人审。`thenwise team unshare-chats` 要能回收，别只共享不回收。
- M 只有 README，未查看代码和安装脚本；“可重复运行、不覆盖已有文件、先保存 `.ecx-bak` 备份”是 README 声称，必须安装时验证。先备份 `~/.claude` 和笔记库副本。
- M 的 hooks 在会话开始、第一条消息前、每次消息前、回复后和结束时执行；如果真实 Claude Code payload 与 hook 预期不匹配，可能静默失败。先用 `/boot` 和唯一标记验证，不要假设“装了就生效”。
- M 的 `doctor` 称覆盖 16+ 项检查并给“精确修复”，但 README 没有给出单独运行命令，也没说明修复具体做什么；异常时先看它给的修复提示，再手动核对。
- M 的 `.ecx/test-command` 必须写仓库真实测试命令；原文没有给示例命令，自动发现 npm、pytest、unittest、cargo、go、make 的准确率也未给数据。多语言或多包仓库先手动写全命令，不要依赖自动发现。
- M 的测试闸门“连续失败 3 次后放弃”是作者说法；如果代理在失败后反复改错，先看失败输出是否真的回到代理，再看测试命令是否本身不稳定。
- M 的双代理同步只对 Claude Code + Codex 成立；只用 Claude Code 时不要开 agent-sync。`agents/AGENT_CHAT.md` 会记录代理间聊天，注意其中是否含敏感内容。
- M 的关系图检索默认可能把笔记文本发到 Ollama 云；用 `ECX_LLM_MODEL` 改本地模型，并确认实际端点。不能接受外部模型时不要开 `--with-search` 的图检索。
- M 的手机接力要求私有 GitHub 仓库；每次回复后同步、语音落 `inbox/`、GitHub Action 合并，这条链路会把内容放到云端。先只用非敏感材料试，并确认仓库确实私有。
- M 的“每天使用 6 个月、支撑 37 个已交付项目、同步低于 0.1 秒、安装 30 秒、27 个测试、21 个 hooks、17 个 skills、16+ 项 doctor 检查”都是 README 自述，没有独立基准、测试日志或失败案例统计。
- M 的“测试通过才算完成”只证明你写下的那条命令跑过了；它不证明测试覆盖足够、不证明代码符合文档、不证明分支已推送。仍要配 D 的事实核对和 I 的冲突列出。
- M 与 F/L 的 hooks 可能同时跑：F 捕获会话、L 注入历史、M 加载 `hot.md` 并跑测试。先明确谁负责启动简报、谁负责完成闸门，避免重复注入和重复跑测试拖慢会话。
- M 与 A/E 的规则可能叠在一起：A 管手工落盘，E 管冲突裁决，M 管 `hot.md` 和测试闸门。若 `hot.md` 与知识库记录冲突，仍按 E 标记冲突并请你裁决，不要直接采信 `hot.md`。

## 证据与来源

- second-brain 原有 `memory/` 规则侧：来源是 @Bober_smart 的推文/调研报告。原文给出 4 步清单，第 4 步在“保存到……”处截断；无命令示例、无规则全文、无效果验证。传播数据为 494 次点赞、79 次转发、28 条回复——这是传播热度，不是效果证据。
- second-brain 目录变体侧：来源是 @kinderlayer 的推文/调研报告（70 赞、10 转发、24 回复）。原文只给出 `second-brain`、`notes/`、`people/` 三个目录中的前两个半，在 `people/` 处截断；除 `mkdir` 外无命令示例、无提示词、无配置、无效果数据。
- A-3 四目录变体侧：来源是 @sumika45379 的推荐型推文（67 赞、2 转、1 回复），转述另一条带视频的原帖。原文称在空文件夹中创建 `MEMORY/`、`notes/`、`people/`、`projects/`，再在 `CLAUDE.md` 加一行让 Claude Code 把上次对话决定按话题写入；但采集正文在目录列表处截断，最关键的 `CLAUDE.md` 指令原文缺失，完整目录清单也可能不全。没有数据、没有前后对比、没有失败案例；“准备约 5 分钟”“加一行就能按话题自动沉淀决策”都是作者主张。只能给 try，不能给 adopt。
- obsidian-wiki 侧：来源是 Ar9av/obsidian-wiki 的 README。作者自评项目“early”，效果数据只有 n=2 的小样本。对照方法为 Claude Sonnet、headless、真实 38 页 vault；问题用自然语言、不提供图定义。ground truth 用 networkx（betweenness 每个节点吻合到 3.5e-18，630 组最短路全部一致）。
- truongfelix/workflow 侧：来源是该仓库 README（MIT，32 stars）。本次材料只到 README，脚本实现与效果未经验证。README 给出一份完整的 `/session-start` 输出样例（含 3 条与上周五 handoff 的不一致告警、当天 3 项带完成判据的任务、2 条等待裁决的问题）。仓库自身有 CI 徽章，`test/run.sh` 测 `adopt.sh` 与 `ground-truth.sh`，CI 在 Linux/macOS/Windows 三种系统上跑。
- @coreyganim 侧：来源是一条推文（101 赞、6 次转发、14 次回复）。原文给出三条指令要点，并主张“建了第二大脑却不告诉 AI 怎么用，它就毫无用处”“修复只要 90 秒”。这些判断没有对照、案例或数据支撑。关键材料缺口：原文写“完整提示如下”，但采集到的正文未包含该完整提示，本手册中的提示词是按三条要点整理的草稿。
- akitaonrails/ai-memory 侧：来源是该仓库 README（MIT，Rust 单二进制）。README 给出 capture→consolidate→recall→handoff 管线、各平台安装方式、`ai-memory run` 启动方式；并称默认路径零 LLM 调用、真相源是 git 托管的 Markdown、数据库可重建、跨 agent 交接是 claim-once 协议。收益说法目前只有项目自述，没有独立验证。
- Umair/stalemap 侧：来源是该仓库 README。调研报告称预注册盲测 held-out v4：66 个任务，按种子从 33 个流行 npm 包在某三个月窗口内发布的所有 breaking / deprecation / behavior change 中抽取；每任务每臂每模式每模型 3 个 session；构建在任何 v4 结果产生前冻结为 `freeze/v4-final`；只有两层 bootstrap（先任务后运行）求出的区间不含 0 才算胜。调研结论给出 89% vs 无辅助 68% vs 普通 tsc 钩子 73%，但报告正文在“通过率：”处截断，具体表格无法引用。只支持 JS/TS 与单个 `package.json`；只测了两个 Claude 模型且为作者自测。
- hsuanshao/AgentMemory 侧：来源是该仓库 README。它描述了自托管、面向团队的长期记忆服务：L0 原始对话、L1 facts、L2 scenes、L3 persona；召回用 BM25 + 向量 + RRF；权限结构是部门→团队→成员/agent。README 给出安装、部署、Panel、LLM 后端、存储选择、默认触发参数、`/health`、升级卸载命令。材料明确说明：没有在正文给出 `amem` 安装命令；没有效果数据；0.4.0 起服务端为 BUSL-1.1，免费范围是最多 1 个部门、10 个成员的组织。
- @ai_database 侧：来源是一条推文/调研报告，建议在 `CLAUDE.md` 和 `AGENTS.md` 中加一条规则：文档与现有代码冲突时以代码为准，并在最后回复中列出所有冲突点。原文在“据说Claude”处截断，没有数据、案例、前后对比或具体实验。
- @NIxinhai0 侧：来源是一条推文/调研报告，互动量为 55 赞、3 转、6 回复，属于个人经验分享。原文只有一段提示词，要求在 Codex 中配置一个 Obsidian 知识库作为跨项目永久记忆：录入长期偏好、决策习惯、全部项目及细节；每日任务前按需读取；每晚十点整理当日项目沟通记录并同步；每周复盘、沉淀项目信息、减少冗余读取。原文末尾在“这样你的 Codex”处截断，没有给出知识库目录结构、Codex 的读写接入方式、定时触发实现，也没有任何效果验证或案例；“永久记忆”“减少冗余读取”都只是作者主张。报告建议：选一个进行中的项目，建最小 vault，按上述节律运行一到两周，用上下文重建时间、重复解释次数、每晚整理耗时、冗余条目占比、抽查错误率五项指标做试用前后对照。
- mathew5612/mycel 侧：来源是该仓库 README。项目 0.22、约 30 stars、单一作者、MIT；命令清单、各智能体接入表、端口 `127.0.0.1:4317`、Node 22+、`.mycel/token` 写令牌、测试命令 `node --test test/*.test.mjs`（UI 测试驱动 headless Chrome，找不到就跳过，可用 `MYCEL_CHROME` 指定路径；无构建步骤）可核实。README 主张智能体能自己连文件夹、读代码、画出并持续维护项目地图；`check` 能按块跑测试命令并染色；`health` 能扫出 TODO 和疑似密钥字符串并只报文件与行号；`watch` 文件一变就把对应块标为可能过时。这些是作者设计主张，无实测。只有 README，未看到 `docs/reference.md`、`src/agent-guide.md` 正文，也没有实际跑过；无生产使用案例；没有任何量化收益。
- dheerajponnaganti/thenwise 侧：来源是该仓库 README 与调研报告。可核对内容：安装命令、`setup`/`doctor`/`status`、七个 `memory_*` 工具、hooks 的 token 上限与触发条件、隐私开关、团队命令、`config.json` 配置项；数据目录 `~/.thenwise` 或 `THENWISE_HOME`；默认不发送遥测，只有每日一次 npm 版本检查默认开启。效果数据来自作者自述的隐藏答案盲评：个体 93% vs 37%、团队 88% vs 17%；个体 token 约一半、1.9 倍更快（14 秒 vs 26 秒），团队 token 少 39%、1.5 倍更快（16 秒 vs 24 秒）；2,500 条聊天安装后 84 秒可记起；hooks 约 50ms；无记忆的聊天只增加约 1% token。原文链接 `docs/eval.md`，但材料未包含评测题目、评分细则和原始数据，无法独立核验。项目约 30 stars，不是大规模独立验证过的成熟工具。
- saksham10arora-dotcom/everything-claude-codex（ECX）侧：来源是该仓库 README。仓库 31 stars、MIT；README 声称 27 个测试覆盖 hooks/installer/doctor，测试于 macOS 和 Linux、Python 3.9 到 3.12；声称 21 个 hooks、17 个 skills、16+ 项 doctor 检查、3 种检索、2 个代理共享记忆；作者自称每天使用 6 个月、支撑 37 个已交付项目；双代理消息同步“低于 0.1 秒”；安装“30 秒”。这些均为 README 自述，未提供独立基准、测试日志、失败案例统计或代码审查结果。可核对的命令只有安装脚本、`/boot`、`.ecx/test-command`、`sync.py send`、`agents/AGENT_CHAT.md`、`ECX_LLM_MODEL` 等 README 明示项；`doctor` 单独运行命令、`--with-cron` 实现、测试命令示例均未给出。适用条件偏个人开发者/知识工作者，默认 macOS/Linux；手机模式依赖私有 GitHub 仓库；关系图检索涉及外部模型数据边界；团队权限、安全审计、多人协作冲突处理未展开。
- 证据强度提示：A-1、B 只有步骤清单和传播数据；A-2 只有目录设置和传播数据，原文截断；A-3 只有一条推荐型推文，原文在目录列表处截断且关键规则缺失，无任何效果数据；C 有对照实验数据，但样本极小且作者自评 early；D 只有 README、样例输出和模板自身 CI；E 只有一条推文和三条指令要点；F 只有 README 和可复制命令；G 有预注册盲测设计，但只支持 JS/TS、只测两个 Claude 模型且为作者自测，报告正文在通过率处截断；H 只有 README，缺少效果数据，且许可证对团队规模有约束；I 只有一条规则和一句目的说明，原文截断；J 只有一段提示词和传播数据，缺三项关键实现信息，无任何效果验证；K 只有 README，项目早期、无量化证据；L 有可核对命令和隐私开关，但效果数字为作者自测，评测材料未给出；M 只有 README，安装脚本、hooks 真实 payload、doctor 修复内容、测试自动发现准确率均未验证。所有数据都不能当作“这套做法一定有效”的证明。
- 作者主张（缺少支撑）：建独立文件夹、接入 GWS CLI、单开 `memory` 子目录、在 `CLAUDE.md` 写死记忆规则；second-brain 目录变体的“可直接复制的第二大脑设置”；A-3 的“加一行就能按话题自动沉淀决策”“准备约 5 分钟”；obsidian-wiki 的“知识是编译而非堆积”、manifest 增量摄入、每条主张打标、查询成本随规模基本不变；workflow 的五条判据；@coreyganim 的“不告诉 AI 怎么用第二大脑就毫无用处”“90 秒修复”；ai-memory 的跨 agent/项目/机器、团队共享、无 LLM 记忆老化、写入上限约 700/s；stalemap 的“训练截止后依赖 API 变化是 agent 默认不知道自己不知道的工作”“普通 tsc 钩子是 guard 的子集”“probe 比主动发现容易”；AgentMemory 的 L0-L3 分层、团队共享 scenes/persona、BM25 + 向量 + RRF、默认触发参数；@ai_database 的“以代码为准能减少按过时文档改代码”；@NIxinhai0 的“配置一个库就能形成跨项目永久记忆”“每晚整理、每周复盘能减少冗余读取”；Mycel 的“地图保持存活”“智能体边看你边画图”“四档层级足以表达一个项目”“不往任何地方发送数据”“不写入你的项目”；thenwise 的“100% 本地运行”“搜索毫秒级”“较新记录覆盖同一问题时会标注”“团队共享前预览和脱敏”；ECX 的“可重复运行、不覆盖已有文件”“测试失败会把代理打回并附失败输出”“doctor 给精确修复”“双代理同步低于 0.1 秒”“安装 30 秒”“每天使用 6 个月、支撑 37 个已交付项目”。
- 调研报告给出的建议（不是原文）：规则示例“把每次会话中确认的长期有效信息追加到 `memory` 下的文件中；开始新任务前先读取 `memory`”；A-3 的占位规则和 3–5 次会话、五项指标、两周止损线；先只开一项权限跑通；重复交代率、召回成功率、记忆文件质量、越权与泄漏、对照组等指标；1～2 周试用期；C 用同一模型、同一 vault、同一批问题做对照；D 在长期项目上小范围试；E 的提示词草稿与 5 个已知答案任务的试用方式；F 先单机、单仓库、只接一个 agent 跑 1～2 周；G 先预览、再写入、CI 加 check、Claude Code 侧装插件；H 先单团队、SQLite、一个客户端，2—3 次真实会话验证；I 把规则原样加入 `CLAUDE.md`/`AGENTS.md` 并在有已知不一致的仓库中小范围试；J 选一个进行中的项目建最小 vault，按“任务前读取、每晚整理、周末复盘”跑一到两周，用五项指标对照后再决定是否留下；K 选一个 2 万至 10 万行、自己有测试命令的中型仓库，克隆到项目外，Claude Code 装插件，建 concept + mechanics 两档地图，给 3–5 个关键块配测试命令，正常开发一到两周记录 `health` 数量，用项目理解成本、上下文有效性、维护成本、验证闭环、上下文体量与反向指标判断是否留下；L 先在单个 Claude Code 仓库小范围试用，按两条命令安装并运行 `thenwise setup`/`doctor`，用隐藏答案的历史问题做前后对比，单机有效再评估团队版；M 先复制笔记库、备份配置，只跑基础安装，在一个可回滚测试仓库启用 `.ecx/test-command`，用 `/boot` 唯一标记、故意失败测试、doctor 静默/警告、双代理唯一标记四周验证，两周后再决定是否加搜索和手机模式。
- 仅为推测的部分：second-brain 原有第 4 步规则的目标位置推测指向 `memory` 目录；原文未界定“重要细节”；未说明记忆召回机制、GWS CLI 授权范围与撤销方式；A-2 的第三个目录、`people/` 内容与更新规则、提示词和效果均缺失；A-3 的完整目录清单、`CLAUDE.md` 指令原文、内容分工、更新规则和效果均缺失，需回原帖补全并自行验证；obsidian-wiki 的 Cursor / Hermes / OpenClaw 支持细节未证实；workflow 的脚本实现与效果未验证；E 中“具体在哪个入口写常驻指令”需按工具确认；F 的 `ai-memory run --f` 处原文截断，Docker quick-start 未包含认证步骤；G 的通过率表格截断；H 的 `amem` 安装命令、TLS 细节和客户端升级流程未在 README 正文展开；I 的“据说Claude”之后内容缺失；J 的目录结构、Codex 读写接入方式、定时触发实现、内容分工与效果数据均缺失，需使用者自行补齐和验证；K 的 `open`/`start` 命令不一致、`.mycel/` 数据位置与 `init` 连接当前文件夹的关系、`context --brief` 在大仓库的 token 成本均未确认；L 的 `docs/eval.md` 评测细节、团队版 hub build 的获取方式、TLS 终止与备份策略未在材料中展开，需自行查证；M 的安装脚本是否真的不覆盖配置、hooks 是否在真实 Claude Code payload 下可靠、doctor 的“精确修复”具体是什么、`.ecx/test-command` 对多语言项目的识别准确率、`--with-cron` 的调度实现、手机模式 GitHub Action 的细节，均未在 README 中展开，需安装后自行验证。

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
