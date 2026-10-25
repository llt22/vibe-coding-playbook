# 让 AI 跨会话接手时不把旧笔记、旧文档和旧记忆当事实

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 跨会话接手时会把上次的笔记、知识库旧结论、过时文档当成事实继续施工；这套做法让它在动手前先核对事实、冲突先问你，并在文档与代码矛盾时以代码为准、把冲突点列出来。
> 先试这一步：先在你每天用的 `CLAUDE.md`/`AGENTS.md` 里加两句常驻规则：开始任务前先读知识库、与我说法冲突时先标记并问我；文档与现有代码冲突时以代码为准，并在最后回复里列出所有冲突点。
> 最近修订：2026-10-25

## 解决什么问题

AI 每次开新会话都要重新交代背景，跨会话的资料和结论无法沉淀；更糟的是，上次的笔记、handoff 或 memory 只是“主张”，如果直接当作事实继续施工，会把已失败的后台任务、未推送的分支、已完成的待办带进新会话。另一种反向失败是第二大脑已经建好，却没告诉 AI 什么时候读它、读到的旧结论和用户当下说的话冲突时该听谁的，于是它要么没被用上，要么被原样沿用。编码场景还有两类失真：模型训练截止之后依赖库改了 API，agent 不会主动查 changelog，仍按旧 API 写代码；项目文档落后于代码，agent 按旧文档改代码，把本来正确的实现改坏。

当团队里多个人、多个 agent 各记各的，或者记忆只存在某台机器、某份手写笔记里，重复交代和“把旧结论当事实”会同时发生；做法 H 针对的正是这种需要自托管、按部门/团队/成员隔离、自动捕获与召回的记忆层。

这套做法分九层。先让长期信息在本地 Markdown 文件夹落盘（做法 A/B/C）。做法 A 有两个变体：A-1 用单一 `memory/` 目录加 `CLAUDE.md` 规则；A-2 用 `notes/` 与 `people/` 按材料类型分目录，它来自一条新线索，但原文在 `people/` 处截断，第三个目录和后续用法缺失，只能当目录组织变体，不能当完整工作流。再用常驻指令让 agent 每次任务前先读知识库、发现冲突就标记并同时引用两版、等用户裁决后给出对知识库的确切编辑（做法 E）。再用 truongfelix/workflow 在两个会话边界跑同一个事实采集脚本，报告主张与 git/GitHub/本机事实的不一致，然后才决定当天做什么（做法 D）。如果跨 agent、跨机器、跨项目的记忆需求更强，可以加做法 F：用 akitaonrails/ai-memory 把捕获、汇总、召回、交接做成一条常驻管线；它的真相源仍是 git 托管的 Markdown，数据库可重建，默认路径零 LLM 调用，但所有收益说法目前只有项目自述，需要先小范围试。如果项目是 JS/TS，且依赖有大版本跨越或紧贴发布节奏，再加做法 G：用 stalemap 把“模型训练截止前已知的最后一个稳定版”与“项目实际 pin 的版本”之间的差异压缩成短笔记，通过会话开始注入、编辑后 guard 和 MCP 检索交给 agent；它补的是依赖 API 盲区，不替代 A-F 的记忆与事实核对。如果小团队需要自托管的团队记忆，能按部门/团队/成员/agent 隔离，并接受 Docker 和 LLM 后端，加做法 H：用 AgentMemory 把对话捕获、L1 facts、L2 scenes、L3 persona 和召回做成服务；它仍不能替代 D 的事实核对。最后，如果项目同时维护文档和代码，加做法 I：在 `CLAUDE.md`/`AGENTS.md` 里写一条静态规则——文档与现有代码冲突时以代码为准，并在最后回复中列出所有冲突点；它成本最低，但只是一条指令，不替代 D 的事实核对。

## 适用与不适用

适用：
- 已在用 Claude Code 或其他读取 Markdown 的 agent 做真实工作，但每次都要重复交代背景。
- 希望把确认过的长期有效信息落到本地文件，而不是留在单次会话；只需要一个长期信息落点时，用做法 A-1 的 `memory/`。
- 材料天然分成事实/研究/想法与人物信息，想让 Claude Code 在项目上下文里工作，试做法 A-2 的 `notes/` 与 `people/`；注意原文只给到 `people/`，第三个目录和后续用法缺失，不能当作完整设置。
- 需要让 AI 读取 Gmail、日历、云端硬盘时，可走做法 B。
- 想把散落材料变成可提问、带引用、可清洗的库，或找回“叫不出名字的历史会话结论”，走做法 C。
- 长期项目有多个会话、跨天跨机器，上一次笔记可能失真；或有多仓库工作区，需要每次先核对 git/机器事实，走做法 D。
- 已经有一个可被 AI 读取的知识库（文件、仓库、笔记库，或通过 MCP/连接器接入的资料），但 AI 不会主动去读它，或把库里的旧结论当事实沿用；所用工具支持“自定义指令 / 项目指令 / 常驻说明”这类每次对话生效的入口，并允许 AI 提出对知识库的写回编辑（至少是给出编辑内容），走做法 E。
- 想跨 agent（二十多个 harness 共用一个记忆）、跨项目（一份工作习惯 profile 带到每个新仓库）、跨机器（记忆存在自己跑的服务器上），甚至团队共享（多用户认证、按人归属、审计日志，且不是付费档），并且能接受常驻服务和采集提示词与工具调用，走做法 F。
- 项目是 JavaScript / TypeScript，依赖有大版本跨越或紧贴发布节奏；有 lockfile 或 node_modules 以确定 pin 的版本；能访问 npm registry 与 GitHub；愿意把生成的笔记块写进 AGENTS.md/CLAUDE.md，并接受编辑后跑 guard 或 CI 检查，走做法 G。
- 小团队想自托管团队记忆，需要按部门→团队→成员/agent 做权限隔离，并希望自动捕获对话、蒸馏出 facts/scenes/persona、每次提示前召回；能接受 Docker、git 和一个 LLM 后端（OpenAI 兼容端点或本机 CLI），走做法 H。
- 想把原始对话 L0、事实 L1、场景 L2、persona L3 分层，且团队内共用某个 agent 的 scenes/persona；数据可以留在内网，SQLite 或 PostgreSQL 自选，走做法 H。
- 想通过 hooks/MCP 接 Claude Code、Codex、Antigravity、Hermes 或任意 MCP 客户端，走做法 H。
- 项目同时维护文档和代码，且编码 agent 会读取 `CLAUDE.md`/`AGENTS.md`；你希望它在文档落后于代码时按现有代码改，并把冲突点摆出来，走做法 I。

不适用：
- 还没有安装 Claude Code 或任何可读 Markdown 的 agent，或没有本地文件系统写权限。
- 不能接受把 Gmail、日历、云端硬盘的读取权限交给本地工具，或工作内容高度敏感且没有隔离账号可用。
- 期待原文给出逐字可抄的命令、配置和规则全文：second-brain 原有第 4 步截断；second-brain 目录变体在 `people/` 处截断，第三个文件夹和后续用法缺失；做法 D 本次材料只到 README，脚本实现与效果未经验证；做法 F 的 `ai-memory run --f` 处截断；做法 H 的 `amem` 安装命令未在正文给出。
- 想用做法 C 全面替换现有做法：作者自评项目“early”，效果数据只有 n=2 的小样本。
- 想用做法 D 或做法 F 完全替代人工判断：它们只推荐或提供记忆层，每天做什么、每次 push/PR/merge 是否批准，由你决定。
- 没有稳定的知识库，或知识库里本来就是不可信内容：做法 E 只会把不可信内容引用得更正式；做法 F 也会把不可信内容捕获、汇总并交接下去；做法 H 同样会把不可信内容蒸馏并召回。
- 工具不会稳定遵守常驻指令，或你不愿让 AI 提议改写知识库，或不能接受每次任务前读库带来的 token/时间开销：先别把做法 E 当成默认配置。
- 不能接受常驻服务、采集提示词与工具调用，或必须先有独立效果验证：先别把做法 F 当默认配置。
- 非 JS/TS 项目；多 workspace/monorepo（stalemap 只支持一个 package.json，尚无 workspace 遍历）；无自带类型的包只能靠 release note（`@types/*` 不做 diff）。
- 不能接受把包名与版本发往 npm registry、GitHub、models.dev，或使用 `--llm` / `--examples` / `--guides` 时把类型 diff、release note 片段、指南文本与导入的 API 名发往 Claude（不含代码）：先别把做法 G 当默认配置。
- 把做法 G 当作已成熟、可直接推广的做法：它只测了两个 Claude 模型且为作者自测；Cursor/Codex/OpenCode 的 `setup --agent` 原文明确说尚未在真实安装中验证过。
- 超过 1 个部门、10 人的组织不想为生产使用付费：AgentMemory 0.4.0 起服务端为 BUSL-1.1，免费范围是评估、个人、非营利，以及最多 1 个部门、10 个成员的组织。
- 不愿用 Docker/git，或没有可用的 LLM 后端（OpenAI 兼容端点或本机 CLI）：先别上做法 H。
- 只想要轻量本地 Markdown 记忆：做法 H 太重，先做 A/E。
- 需要现成的 `amem` 安装命令：README 没有在正文给出，只指向 `docs/REMOTE-CLIENTS.md`，没查证前不能照抄。
- 需要独立效果验证才采用：做法 H 的 README 没有给效果数据。
- 期待 `notes/` 和 `people/` 一建好就自动生效：它们只是目录结构，不会自动让 agent 读取；必须配常驻规则或 `CLAUDE.md`。
- 代理不读取 `CLAUDE.md`/`AGENTS.md`，或项目没有文档与代码并存，或你无法接受“以代码为准”这个前提（代码本身可能就是错的）：先别把做法 I 当成默认规则。
- 期待做法 I 给出效果数据：原文只有一条规则和一句目的说明，且在“据说Claude”处截断，没有数据、案例或前后对比。

## 前置条件

- 做法 A-1：本机已安装并能运行 Claude Code；对目标目录有读写权限。
- 做法 A-2：同上；只需 Claude Code 与本地目录写权限，不需要 API key；原文未给启动命令、提示词和更新规则，需自己补读取规则。涉及人物信息时先用非敏感材料试。
- 做法 B：在 A 基础上，另需一个 Google 账号，并准备把 Gmail、日历、云端硬盘读取权限交给本地工具。原文没有 GWS CLI 安装命令、包名来源或授权流程，必须先自行查证官方文档。
- 做法 C：本机有 Python 环境（pip / uv / pipx 任一路线）；若走 Claude Code 插件路线则不需要 Python。不需要 API key、embedding 模型、向量库或联网。
- 做法 D：需要 bash 和 git。可选：GitHub CLI `gh`（读开着的 PR 和 CI）、systemd（后台任务，仅 Linux）。支持 Linux、macOS 和 Windows（在 Git Bash 或 WSL 里跑，CI 三种都测）。开始前先读 `PRINCIPLES.md`。适用形态：单仓库，或一个装着多个 repo 的工作区文件夹，根目录自身是一个只放文档的 repo；工作区形态的 remote 必须是 PRIVATE。
- 做法 E：已经有一个可被 AI 工具读取的知识库（本地文件、仓库、笔记库，或通过 MCP/连接器接入的资料）；所用工具支持常驻指令入口，且允许 AI 提出对知识库的写回编辑（至少给出编辑内容）；你本人愿意做冲突裁决——原文明确把这一环留给人。
- 做法 F：能访问 GitHub releases 和 curl（Linux/macOS）；Windows 用 PowerShell，无需管理员，或只考虑 WSL2；Arch/Fedora 走包管理器；macOS 菜单栏 App 需要 Rust 工具链 + Xcode / Swift 6；Docker 路线需要 Docker 或 Podman + 一个支持 MCP 的 agent CLI。先在测试机、单仓库、只接一个 agent 上做第 1 步，确认有效再推到主力环境。要常驻服务并采集提示词与工具调用，先用非敏感账号或受限范围试。
- 做法 G：Node 项目；有 lockfile 或 `node_modules` 以确定 pin 的版本；能访问 npm registry 与 GitHub（读 changelog/releases）；知道当前会话用的模型（可用 `--model` 指定，或依赖 Claude Code / Codex / OpenCode / Gemini CLI 的配置、`$ANTHROPIC_MODEL`；截止日来自 models.dev，也可显式传 `--cutoff YYYY-MM-DD`）；可选 GitHub token 或 `gh` 登录以取 changelog/releases；选择 LLM 通道时需 Anthropic API 或 `claude -p`；comment 模式的 CI 需 `pull-requests: write` 权限。
- 做法 H：Docker、git；一个 LLM 后端（OpenAI 兼容 API key，或本机可调用的 `claude`、`codex`、`agy` 等 CLI）；默认 SQLite 无需额外安装；只有要多副本时才需要 Redis，要规模化或换掉 SQLite 时才需要 PostgreSQL/pgvector；从源码构建需要 Rust MSRV 1.88。生产使用前先看许可证：0.4.0 起服务端为 BUSL-1.1，免费范围是评估、个人、非营利，以及最多 1 个部门、10 个成员的组织。
- 做法 I：确认你的编码代理会读取项目中的 `CLAUDE.md` 或 `AGENTS.md`；项目允许创建或修改这类代理指令文件；任务附近存在已知的文档与代码不一致点，便于检查规则是否生效。不需要额外服务或 key。
- 涉及隐私与凭据安全：先用非敏感账号或受限范围试，不要一上来就接真实收件箱或公司级知识库。做法 H 会捕获每次对话并蒸馏，先用测试团队和测试 agent。

## 操作步骤

先选路线，九条路线可以叠加：
- 只需要跨会话记住项目背景，先做做法 A。A 有两种组织方式：A-1 用单一 `memory/` 目录加 `CLAUDE.md` 规则；A-2 用 `notes/` 与 `people/` 按材料类型分目录。目录本身不会自动生效，必须配读取/追加规则。
- 还需要 AI 读取 Gmail、日历、云端硬盘，在 A 之上做做法 B。原文缺安装与授权细节，必须先查证再操作。
- 想把材料变成可摄入、可提问、可引用、可清洗的库，或想找回想不起名字的历史会话，做做法 C。C 可以独立于 A，也可以直接建在 A 的 second-brain 目录上。
- 如果新会话经常把上次笔记当事实、需要跨天跨机器接续长期项目，做做法 D。D 可以叠加在 A/B/C/F/H 上：A 的 memory、C 的 vault、F 的 wiki/handoff、H 的召回结果都只是“主张”来源，D 负责在会话边界拿 git/机器事实核对。
- 如果知识库已经存在、但 AI 不主动用、或你说的话和库里记录打架时它自作主张，做做法 E。E 只写常驻指令，改动成本极低；可以叠加在 A/B/C/F/H 上，也可以直接用于你已有的公司/个人知识库。E 管“你说的话 vs 知识库记录”，D 管“笔记/记忆 vs git、GitHub、本机事实”，两者都要。
- 如果主要痛点是跨 agent、跨项目、跨机器的长期记忆，并且能接受常驻服务和采集提示词与工具调用，试做法 F。F 可以替代 A 的 memory 骨架和 C 的部分 vault/query 能力，但不能替代 D 的事实核对；E 的冲突裁决指令也可以和 F 叠加。
- 如果是 JS/TS 单 package.json 项目、依赖有大版本跨越或紧贴发布节奏，加做法 G。G 可以独立使用，也可以叠加在 A/D/E/F/H 上：它把依赖变更笔记写进 AGENTS.md/CLAUDE.md，或用插件在会话开始注入；但它的笔记仍来自 changelog/release note，是“主张”，编辑后 guard 和 CI check 才是编译层的事实核对。G 不能替代 D 的 git/机器事实核对。
- 如果是小团队、要自托管、要按部门/团队/成员/agent 隔离、要自动捕获和分层召回，做做法 H。H 可以替代 A 的 memory 骨架和 F 的部分团队共享需求，但它仍把“记忆”当主张，不能替代 D；E 的冲突裁决指令可以叠加在 H 的召回结果上。
- 如果项目同时维护文档和代码、编码 agent 会读 `CLAUDE.md`/`AGENTS.md`，且你希望它在文档落后于代码时按代码改、把冲突点列出来，加做法 I。I 是一条静态规则，成本最低，可以写进 A 的 `CLAUDE.md`，也可以和 E 的常驻指令放在一起；但它不替代 D 的事实核对，也不证明代码本身正确。

### 做法 A：只搭本地记忆骨架

#### 做法 A-1：单一 `memory/` 目录（原有）

1. 创建 `second-brain` 文件夹。前提：本地文件系统写权限。预期：得到一个与日常项目隔离的工作根目录。原文未指定路径，可自选。

```bash
mkdir second-brain
cd second-brain
```

2. 在 `second-brain` 下创建 `memory` 子文件夹。预期：长期信息有固定落点。

```bash
mkdir memory
```

3. 在 `second-brain` 下创建 `CLAUDE.md`，写入一条记忆规则。原文第 4 步截断，规则全文未知；调研报告建议写法如下（这是报告建议，不是原文）：

```text
把每次会话中确认的长期有效信息追加到 memory 下的文件中；开始新任务前先读取 memory。
```

前提：自己确认规则目标位置和措辞。预期：Claude Code 在该目录下工作时按规则读取和追加长期信息。

4. 连续在同一个 `second-brain` 目录下开 Claude Code 做真实工作。前提：先只放少量非敏感材料。预期：积累出可观察的记忆文件。

#### 做法 A-2：`notes/` 与 `people/` 分目录（新线索，原文截断）

1. 创建名为 `second-brain` 的文件夹。

```bash
mkdir second-brain
cd second-brain
```

2. 在 `second-brain` 中打开 Claude Code。原文未给具体启动命令，按本地 Claude Code 方式打开该目录。
3. 添加 `notes/` 文件夹，存放事实、研究、想法。

```bash
mkdir notes
```

4. 添加 `people/` 文件夹；原文在此截断，未说明 `people/` 内放什么、第三个文件夹叫什么。

```bash
mkdir people
```

5. 原文声称这是“可直接复制的第二大脑设置”，但截断导致无法复现完整设置；试用时只把上述目录作为 Claude Code 的项目上下文入口，不把未出现的配置当作原文步骤。必须自己补一条读取规则（可复用 A-1 的 `CLAUDE.md` 规则），否则目录只是材料堆放。预期：Claude Code 在该目录下工作时能读到 `notes/` 和 `people/`，减少重复解释；是否真的自动读取需要验证，原文未给提示词。
6. 选择：如果只需要一个长期信息落点，用 A-1 的 `memory/`；如果材料天然分事实/研究/想法与人物信息，用 A-2 的 `notes/` 和 `people/`；也可以并存，但要在 `CLAUDE.md` 里写清楚哪个目录放什么、何时读。预期：不会因为目录多而让 agent 不知道读哪个。

### 做法 B：在 A 基础上接入 Google 数据源

1. 在 `second-brain` 文件夹中打开 Claude Code，安装 `GWS CLI`，以访问 Gmail、日历和云端硬盘。前提：本机已能运行 Claude Code，且有一个 Google 账号。关键限制：原文只说“安装 GWS CLI”，没有安装命令、包名来源或授权流程；必须先自行查证文档后再执行。
2. 先只开一项权限跑通，例如日历只读。前提：确认该项权限是你愿意交出的最小范围。预期：验证链路可用且不暴露全部数据。
3. 确认没有越权读取、没有把敏感内容写进记忆文件后，再逐步扩大权限。前提：每次扩大权限后都检查记忆文件与读取记录。预期：权限范围随实际需要增长。

### 做法 C：用 obsidian-wiki 把 Markdown 目录变成可摄入、可提问、可清洗的知识库

核心形态：一组 Markdown“skill”文件（README 称共 39 个），Claude Code、Codex、Cursor、Windsurf、Gemini CLI 等智能体读取后以斜杠命令方式执行；外加一个可选的 Python CLI（`obsidian-wiki`）和两个可选 session hook（会话开始注入回顾，会话结束提醒捕获）。知识以纯 Markdown 存盘，可读、可 grep、可 diff。

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

5. 喂数据。原文说“任何文本形态的东西”都可以：文档、PDF、聊天导出、会议转录、截图、URL。

```text
/wiki-ingest ~/research
/wiki-update                        # distill the repo you're standing in (code-graph aware)
/wiki-capture                       # save this conversation
/wiki-history-ingest claude         # mine everything you've ever asked Claude
```

预期：材料进入 vault；manifest 记录已摄入来源，第二次只处理增量。

6. 提问。原文称回答会带 `[[wikilink]]` 引用而不是“感觉”。

```text
/wiki-query what do I know about rate limiting?
/wiki-narrate MCP security          # a cited briefing on a topic
/wiki-digest week                   # what did I learn this week?
```

7. 找回叫不出名字的历史会话（用 CLI，不是斜杠命令）：

```bash
obsidian-wiki sessions-build
obsidian-wiki sessions-query "the auth bug with the weird retry loop"
```

8. 定期清洗 vault：

```text
/wiki-lint            # broken links, orphans, contradictions
/wiki-dedup           # "RSC" and "React Server Components" are one page now
/wiki-status          # what's ingested, what's pending, where the hubs are
```

9. 可选：在 Obsidian 里查看图谱。打开 vault，Cmd/Ctrl+P → “Open graph view”；对智能体说 “color my graph” 会按 tag、category 或 visibility 给节点上色。想先看效果，可克隆仓库后用 Obsidian 的 Open folder as vault 打开 `examples/demo-vault/`。注意：vault 本质是磁盘上的纯 Markdown 文件夹，可以 grep、可以推私有 repo、可以直接删；即便不引入 Obsidian，ingest/query/lint 链路仍然成立。
10. 想从代码里用（无 API key、无 embedding、无向量库、无网络）：

```python
from obsidian_wiki import Memory

memory = Memory("~/brain")
memory.remember("stack", "Python, FastAPI", confidence=0.9)
memory.add("Postgres was chosen over MySQL for partial indexes.")
memory.search("postgres")
memory.recap()                       # inject at session start
```

原作者补充：`user_id` 可把记忆按人隔离，而知识仍然共享。

11. 多智能体并发写入的前提：`index.md`、`log.md`、`hot.md` 以及 `_meta/` 下的 owner profile 与 todo index 都走同一个加锁、原子写入的 writer，原文称因此并行的多个智能体不会互相丢更新。如果你要多智能体同时写，别绕过这个 writer。

### 做法 D：让新会话先核对事实再接手（truongfelix/workflow）

针对的问题是：每个 Claude Code 会话都从空上下文开始，常见的“笔记文件”做法会在笔记写错时失效——分支标成“已推送”其实没到 remote、任务标成“还在跑”其实凌晨 1 点就死了、待办上周就做完了，而下一次会话会相信这些笔记并在其上继续施工。核心一句话：handoff 是主张，脚本是事实；读写两侧跑同一个脚本，所以看到的是同一幅图。

交付物是一组固定文件（由模板拷入项目）：`notes/handoff.md`（今天：下一步任务、等你决定的事、后台在跑什么、上次会话），`notes/handoff-archive.md`（历次 handoff 逐字存档），`BACKLOG.md`（只放开放工作，每个 repo 一节，做完的条目删除而非打勾），`questions.md`（只有你能做的决定，每条带选项与建议；以及已定的裁决），`notes/lessons.md`（项目踩坑经验，每次会话都加载），`CLAUDE.md`（项目是什么、规则与命令，不放待办、不放历史），`.claude/ground-truth.conf`（脚本要检查的 repo，以及永远不能推送的分支），`.claude/skills/`（`/session-start` 含 `ground-truth.sh`，与 `/handoff`）。

1. 克隆模板到本机：

```bash
git clone https://github.com/truongfelix/workflow.git
```

前提：bash 和 git 可用。预期：本机有一份 workflow 的 clone。

2. 把模板拷进项目（只拷贝缺失文件，绝不覆盖已有文件）：

```bash
workflow/bin/adopt.sh ~/code/my-project     # copies the template; never overwrites a file
```

前提：确认项目根目录。预期：模板文件进入项目；脚本打印它跳过了哪些文件并给出 diff 命令，并列出所有 FILL 标记。

3. 在项目里打开 Claude Code，直接给这段提示词：

```text
Set up the workflow: follow "Adopt in a new project" in /path/to/workflow/README.md
```

前提：已 clone workflow。预期：Claude 会替你填空（项目是什么、有哪些 repo、规则是什么），反复运行 ground truth 直到干净，然后跑一次 `/handoff` 写出第一份 handoff。

4. 按顺序填 `.claude/ground-truth.conf`：每个 repo 一行（在 fork 里，算作“已推送”的 remote 是你自己的，不是 upstream），以及 KEEP_LOCAL 列出永远不能推送的分支。前提：知道项目有哪些 repo 和 remote。预期：脚本知道要检查什么。
5. 反复运行：

```bash
bash .claude/skills/session-start/ground-truth.sh
```

直到它以 `GROUND TRUTH: complete` 结束。前提：bash 和 git 可用；可选 `gh`、systemd 决定覆盖范围。预期：事实采集干净。结果不可读时脚本打印 UNKNOWN 并以退出码 2 结束，绝不算通过。

6. 填 `CLAUDE.md`：项目是什么、规则、handoff 规则（`/handoff` 能不能不问就 commit 和 push？）、repo 与目录布局、命令。把里面原有的待办列表搬进 `BACKLOG.md`。预期：上下文与授权规则明确。
7. 填 `BACKLOG.md`：每个 repo 或文件树一节，从项目已有追踪物（issue、笔记、旧 TODO）填。每条写：哪里错了或缺什么、指针、什么时候算完成。做完的条目删除而非打勾，历史交给 git。
8. 填 `questions.md`：所有者尚未做的决定，以及已经做过、但新人会推翻的裁决；每条带选项与建议。
9. 填两个技能的 FILL 项：项目特有的检查项，哪些是预期之内、不算新闻。
10. 仅工作区形态：在根目录 `git init`；首次提交前检查 `git status --ignored` 和暂存列表；扫密钥（`gitleaks`）；绝不追踪 datadir、密钥或二进制；创建私有 remote，且只在所有者同意后推送。
11. 闭环：跑一次 `/handoff`，让第一份 `notes/handoff.md` 从 ground truth 写出来。下一次会话用 `/session-start` 开始。
12. 日常固定动作：坐下时 `/session-start`，收工前 `/handoff`。预期：`/session-start` 运行 `ground-truth.sh`，从 git、GitHub 和本机读出事实（每个 repo/worktree 与其 remote 的差异、开着的 PR 及其 CI、后台任务），再读上一次的 handoff，报告两者不一致的地方，提出当天任务建议，然后等你决定；`/handoff` 运行同一个脚本，据此重写 handoff，更新各跟踪文件，并提交。
13. 升级：再跑一次 `bin/adopt.sh <project-root>`，它会列出每个被跳过的文件，并给出与当前模板对比的 `diff -u` 命令。合并通用部分，保留项目自己的 FILL 答案。`.claude/workflow-version` 记录项目上次取用的 commit。
14. 回馈上游：当某个项目的会话改进了通用部分（一个技能步骤、一项 ground-truth 检查、一条踩坑得来的原则），把通用部分单独一个 commit 移植回本仓，并写明原因。项目特有的内容不回上游，经验教训也不回：教训留在学到它的那个项目的 `notes/lessons.md` 里。
15. 照做时的五条判据：主张和事实是两回事；做完的事删除，不打勾；读不出来的结果叫 UNKNOWN，绝不算通过；没被点名的东西，不算只存在于一块盘上；先建议，再等。

与做法 A/B/C/F/H 的差异：A 的 memory 规则是“开始新任务前先读取 memory”，但 memory 本身仍是笔记/主张；D 要求在读笔记之外先跑事实脚本，报告不一致后再行动。C 的 vault、F 的 wiki/handoff、H 的召回结果都是知识库或记忆层，适合摄入、查询与交接；D 是项目状态核对，二者可叠加，但不要让 vault、记忆服务或召回结果里的旧结论替代 git/机器事实。

### 做法 E：用常驻指令让 agent 每次任务前先读知识库，冲突先问你（@coreyganim）

针对的问题是：第二大脑建好了，但没告诉 AI 该怎么用，这个大脑等于没用。要委托出去的不是内容生产，而是上下文校验这类容易被忽略的元任务：先查知识库再回答、发现你说的话和记录打架时主动指出。原文点名 Claude/Codex 这类支持常驻指令、能读外部资料、能提写回编辑的 agent。注意：原文写“完整提示如下”，但采集到的正文只有三条规则要点，完整提示词没有出现在给出的材料里；下面的代码块是按这三条要点整理的草稿，不是原文。

1. 打开所用工具的常驻指令入口（自定义指令 / 项目说明 / 仓库说明文件这一类位置）。前提：你的知识库能被这个工具读到——读不到就不会有“读取—比对—标记”的行为。原文只说要“添加一组自定义指令”，具体落点需按你手头的工具自行确认。预期：指令随每次对话生效。
2. 把下面这组指令贴进去。

```text
在每个任务开始前，先阅读我的公司大脑（<路径/库名>）和个人大脑（<路径/库名>）。

如果我说的话与大脑中的内容冲突，不要直接采信任何一方：明确标记冲突，并同时引用两个版本（大脑里的版本 + 我这次说的版本）。

然后问我哪一个是对的。等我确认后，给我对大脑的确切编辑内容（要能直接照着改，而不是笼统建议）。
```

前提：你接受“冲突由人裁决、AI 只提议编辑”这个分工。预期：每次任务开始时它先读库，而不是直接回答。

3. 把两个大脑的实际位置/入口填进占位符（路径、库名或连接器名称）。前提：先自己确认 AI 真能读到这些位置。预期：读取动作真实发生。
4. 用一个你已知正确答案的任务试跑一次，确认它确实先读取了知识库，而不是直接回答。预期：能看到读取动作。
5. 故意说一句与知识库内容矛盾的话，看它是否按指令把两个版本都引用出来并请你裁决。预期：标记冲突 + 同时引用两版 + 问你哪个对。
6. 确认裁决后它给出的“大脑编辑”是否精确到可以直接执行（改哪个文件、哪一条）。若不精确，在指令里补充对输出格式的要求。预期：编辑内容可被直接采纳。

与做法 A 的差异：A 第 3 步的规则只说“开始新任务前先读取 memory / 把确认过的长期信息追加到 memory”，没有规定发现冲突怎么办，也没有要求给出对 memory 的确切编辑；做法 E 把这两条补上。两者可叠加：把 E 的指令写进 A 的 `CLAUDE.md` 也能生效（前提是你用的工具读这个文件）。

与做法 C/F/H 的差异：C 提供知识库本体和 `/wiki-query` 这类主动查询命令，F 提供捕获、汇总、召回、交接管线，H 提供团队分层的捕获—蒸馏—召回服务；E 是“怎么用这个库/这层记忆”的常驻指令，触发时机不同——C 是你主动提问，F/H 是钩子捕获与会话注入，E 是每次任务自动先查。

与做法 D 的差异：E 处理“你说的话 vs 知识库记录”的冲突，裁决权在你；D 处理“笔记/记忆 vs git、GitHub、本机事实”的冲突，靠脚本采集事实。E 的通过标准里没有 ground truth 脚本这一环，所以做了 E 不等于可以省掉 D——库里的旧结论同样不能替代 git/机器事实。

### 做法 F：用 akitaonrails/ai-memory 做跨会话长期记忆层

针对的问题是：跨 agent、跨项目、跨机器的长期记忆需要一条固定管线，而手写 memory 或 vault 容易只覆盖单个项目、单个工具、单台机器。ai-memory（akitaonrails/ai-memory，MIT，Rust 单二进制）的 README 管线是 `capture → consolidate → recall → handoff`：agent 工作时通过生命周期钩子发出经过清洗的观察；会话结束时这些观察变成项目 wiki 里的 Markdown 页面（可选由 LLM 撰写，但不配 LLM 也有用）；下一次会话在任何 agent、任何机器上，先收到一段有长度上限的 brief，并且可以检索全部历史。跨 agent 交接是显式的、带类型的 claim-once 协议：每个 handoff 有 owner，只会被领取一次。真相源是 git 托管的普通 `.md` 文件，数据库只是可随时从文件重建的派生索引。默认路径零 LLM 调用：捕获、搜索、handoff 都不需要 API key。

主要卖点（README 自称）：跨 agent、跨项目、跨机器、团队共享、纯 Markdown、静默捕获、无 LLM 记忆老化、可选 LLM“dream”后台重写，以及写入上限约 700/s 的自陈实测。这些收益说法目前只有项目自述，没有独立验证。

1. 先在测试机上做 Linux / macOS 原生安装。前提：能访问 GitHub releases 和 curl，无需 root。预期：下载对应 release、用发布页公布的 SHA-256 校验、把 `~/.local/bin/ai-memory` 链接好；`setup` 创建带 bearer token、权限为 owner-only 的数据目录，启动 per-user 服务（systemd `--user` 或 launchd LaunchAgent），为它发现的每个 agent 接好 MCP、hooks 和 Agent Skills。它会先打印计划、显示每个 agent 是在哪里被找到的，然后询问：答 `y`，或输入要接线的 agent 编号。

```bash
curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh
ai-memory setup
```

相关开关：`--plan` 只打印计划不做任何改动；`--web` 把计划显示成浏览器页面、勾选后应用；`--yes` 跳过询问；再次运行不会改动任何东西；`--agent` 指定要接的 agent。装完后重启你的 agent，问它一句 “What do you remember about this project?”，如果它通过 ai-memory 回答，就说明接线成功。

2. Windows 走 PowerShell。前提：Windows 环境，或只考虑 WSL2。预期：校验 release zip 的 SHA-256，解到 `%LOCALAPPDATA%\Programs\ai-memory` 并加进用户 `PATH`；`setup` 做的事与 Linux/macOS 相同，只是用登录项代替系统服务。README 把“原生 Windows”标为 Experimental，更稳的路子是 WSL2 或 Docker Desktop（见 `docs/windows.md`）。

```powershell
irm https://github.com/akitaonrails/ai-memory/releases/latest/download/install.ps1 | iex
ai-memory setup
```

3. Arch Linux / Fedora 走包管理器。前提：对应发行版。预期：安装预编译或源码包，再跑 `setup` 做数据目录、用户服务、agent 接线和自检。系统级服务装法用 `/var/lib/ai-memory` 与 `/etc/ai-memory/`，细节在 `docs/install.md#arch-linux-native-packages-aur`。

```bash
yay -S ai-memory-bin    # 预编译 Linux x86_64/aarch64 二进制
yay -S ai-memory        # 从源码构建
ai-memory setup         # 数据目录、用户服务、agent、自检
```

```bash
sudo dnf install ./ai-memory-*.rpm
ai-memory setup
```

4. macOS 菜单栏 App。前提：Rust 工具链 + Xcode / Swift 6。预期：构建 App，把它拖到 `/Applications`，在菜单项里点 **Install & Start Server**（无 Dock 图标）。App 会读取 `init` 写进数据目录的 bearer token，状态图标自行变绿。再接 agent 时用 App 自带的二进制，并用 `--no-service` 把服务交给 App 的 LaunchAgent。Wiki、SQLite、config、模型都放在 `~/Library/Application Support/ai-memory`。

```bash
git clone https://github.com/akitaonrails/ai-memory
cd ai-memory
./companions/ai-memory-macos/build.sh
open "companions/ai-memory-macos/dist/AI Memory.app"
```

```bash
BIN="/Applications/AI Memory.app/Contents/Resources/runtime/ai-memory"
"$BIN" setup --no-service
```

5. Docker 路线。前提：Docker 或 Podman + 一个支持 MCP 的 agent CLI。注意：这段官方 quick-start 没有认证——容器没跑 `init`，所以不带 token 启动；服务只绑 loopback（`127.0.0.1:49374`），机器外面的东西够不着，但本机进程和浏览器页面可以。想要零 LLM 模式就删掉 LLM / EMBEDDING 那几行。完整 wrapper 安装、checksum 校验、`docker run` 和环境变量命令较长，按 README 的 Docker quick-start 原样执行；在 Linux/macOS 上，Docker wrapper 会通过校验过 checksum 的原生宿主客户端去跑 `install-hooks`。用 Podman 就把 `docker` 换成 `podman`；wrapper 在没装 Docker 时会自动用 Podman，两者都有时用 `AI_MEMORY_DOCKER=podman` 强制。两条接线命令：

```bash
ai-memory install-mcp   --client claude-code --apply
ai-memory install-hooks --agent  claude-code --apply
```

可把 `claude-code` 换成 `codex`、`command-code`、`devin`、`opencode`、`opencode2`、`gemini-cli`、`grok`、`kimi-code`、`kiro-cli`、`copilot-cli`、`droid`、`muse`、`omp`、`oh-my-pi` 等；完整列表在 `docs/install.md`。

6. 首选启动方式：用 `ai-memory run` 启动 harness。前提：先完成上面的安装。预期：同一个 workstream、本地 Claude 历史 dossier、可复用 profile、恢复最新 managed checkout 都走这条入口。注意：原文在 `ai-memory run --f` 处截断，不能补全；遇到启动器死掉留下 lease 的问题，先查 README 原文。

```bash
ai-memory run claude
ai-memory run codex --yolo   # 同一 workstream + 本地 Claude 历史 dossier
ai-memory run --profile work claude  # 可复用的 config.toml env/account 预设
ai-memory continue           # 恢复最新的 managed checkout
# 启动器死掉留下 lease 时（仅限同一操作者）
# 原文在 ai-memory run --f 处截断，不能照抄补全
```

7. 与现有做法 A-E、G、H 的关系：F 与 A：A 是手写规则 + `memory` 目录；F 是常驻服务 + 钩子捕获 + wiki 页面 + 召回 + handoff，可以替代 A 的骨架但更重。F 与 C：C 是主动 ingest/query/lint 的 vault；F 是自动捕获、会话结束汇总、下次会话注入 brief，并支持跨 agent/机器 handoff。F 与 D：F 的 handoff 仍是 agent 交接协议，仍是“主张”来源；D 的 `ground-truth.sh` 才拿 git/GitHub/本机事实核对。做了 F 不等于省掉 D。F 与 E：E 是常驻指令，F 提供被读的记忆层；两者可叠加，但 F 不会自动替你裁决你与知识库的冲突。F 与 H：F 更偏个人或跨 harness 的常驻管线，H 更偏自托管、按部门/团队/成员隔离的团队记忆服务；两者都提供“主张”来源，不能替代 D。

8. 试用与回滚：先在单机、单仓库、只接一个 agent（Claude Code 或 Codex）的情况下按 README 的两条命令装上并跑一到两周，用“新会话是否还要重新交代背景”来判断是否值得留下。不要一上来推到主力环境或团队共享。

### 做法 G：用 stalemap 把依赖库在模型训练截止后的 API 变更注入给编码 agent

针对的问题是：模型训练截止之后依赖库改了 API，agent 仍按旧 API 写代码。stalemap 是 npm CLI + MCP server + Claude Code 插件，算出每个直接依赖在“模型训练截止日之前至少 30 天发布的最后一个稳定版”与“项目实际 pin 的版本”之间的差异，把差异压缩成一份带排序的短笔记，通过三条通道交给 agent：会话开始时的笔记注入（写进 `AGENTS.md` 或 `CLAUDE.md`，或由插件注入上下文）、每次编辑后运行的 guard（跑项目自己的 `tsc`，把编译错误与对应变更条目一起回给 agent）、`search_changes` MCP 工具（agent 用自己的话检索）。只支持 JavaScript / TypeScript 项目；声明可配 Claude Code、Cursor、Codex、OpenCode 或任意 MCP client。

1. 先预览，不动文件：

```bash
npx stalemap            # preview what changed and the block it would write
```

前提：Node 项目；有 lockfile 或 `node_modules` 以确定 pin 的版本；能访问 npm registry 与 GitHub；知道当前会话用的模型（可用 `--model` 指定，或依赖 Claude Code / Codex / OpenCode / Gemini CLI 的配置、`$ANTHROPIC_MODEL`；截止日来自 models.dev，也可显式传 `--cutoff YYYY-MM-DD`）。预期：看到变更预览和将要写入的笔记块，但不改动文件。

2. 写入笔记块：

```bash
npx stalemap sync       # write the block into AGENTS.md or CLAUDE.md
```

前提：确认要写进哪个文件。预期：笔记块位于 `<!-- stalemap:start -->` 与 `<!-- stalemap:end -->` 之间，块外文字不会被改动。Claude Code 读 `CLAUDE.md`；若笔记写在 `AGENTS.md`，需在 `CLAUDE.md` 里加 `@AGENTS.md`，或用 `--target CLAUDE.md` 指定目标。

3. CI 守门：

```bash
npx stalemap check      # for CI: exit 1 when the block is missing or stale
```

前提：CI 能跑 npm/npx。预期：笔记块缺失或过期时 exit 1，把“依赖变了但笔记没更新”拦在合并前。

4. 手动跑 guard：

```bash
npx stalemap guard src/**/*.ts   # run the guard by hand
```

前提：项目自己的 `tsc` 可运行。预期：guard 把编译错误与匹配到的变更条目一起回给 agent，形成“写错 → 立刻看到原因 → 改正”的闭环。普通 `tsc` 钩子是 guard 的子集，二者不等价。

5. Claude Code 插件（拿到自动注入 + 编辑后 guard）：

```text
/plugin marketplace add Umair/stalemap
/plugin install stalemap@stalemap
```

前提：使用 Claude Code。预期：安装后提供 SessionStart hook（启动时、`/clear` 后、compaction 后把笔记放进上下文，不写文件）、PostToolUse hook（每次 Write/Edit 后跑 guard）、stalemap MCP server 和两个 skill（`/stalemap:sync` 写笔记块；`upgrade` 让 Claude 在使用或升级某包前先查它的变更）。hook 与 MCP server 走 `npx -y stalemap@latest`，因此始终用最新 npm 版本。

6. 其他 agent 一键配置：

```bash
stalemap setup --agent cursor             # or codex, opencode, claude
stalemap setup --agent codex --dry-run    # print the changes, write nothing
```

前提：确认目标 agent。预期：为每个 agent 写笔记、注册 MCP server、把 guard 装成 post-edit hook，产出可提交的项目文件；合并进已有配置、保留非它写入的条目、重复执行不变更。原文明确提示：尚未在真实 Cursor / Codex / OpenCode 安装中验证过；Cursor 目前不把 `postToolUse` hook 的上下文传给模型，所以 setup 额外加了一个 stop-hook 兜底。

7. 任意 MCP client：

```json
{ "mcpServers": { "stalemap": { "command": "npx", "args": ["-y", "stalemap@latest", "mcp"] } } }
```

前提：client 支持 MCP。预期：agent 可以通过 `search_changes` 等工具按需检索依赖变更。

8. GitHub Action：

```yaml
- uses: Umair/stalemap@main
  with:
    model: claude-opus-5-5          # fail CI when the notes are missing or stale
    # mode: comment                 # or comment on PRs that change dependencies
```

前提：CI 使用 GitHub Actions。预期：笔记缺失或过期时失败；comment 模式需要 `permissions: pull-requests: write`，会列出每个变更依赖（模型已知的版本 → 实际 pin 的版本）及其笔记，并在后续 push 时更新同一条评论。

9. 用参数控制成本与覆盖面（按需）：`--all` 检查全部直接依赖（默认只查代码 import 的 + 配置文件配置的）；`--margin` 截止日前多少天视为“模型已知”的版本（默认 30 天）；`--budget` 笔记默认 1800 tokens，超出时优先保留项目实际用到的部分；`--guides` 把升级指南也变成笔记；`--examples` 在置顶笔记下加 Before → After 示例，只有能对 pin 的版本编译通过才保留；`--llm` 用 Claude 生成摘要；环境变量 `STALEMAP_GUARD_TSC=0` 让 guard 只报依赖变更，`STALEMAP_GUARD_DEPRECATIONS=1` 才报 deprecation，`STALEMAP_CACHE` 改缓存目录（默认 `~/.cache/stalemap`），`$STALEMAP_PRECOMPUTED_URL` 使用预计算报告（约 200 个高频变动包，原文注明尚未托管）。

10. 按需检索：

```bash
stalemap search <query>
```

对应 MCP 工具 `search_changes`（另有 `package_changes`、`project_changes`、`check_notes`）。检索范围含全部类型变更、release note 条目、缓存下来的升级指南笔记；排序为 BM25，兼做标识符拆分（`resolveAlias` 能匹配 “resolve alias”），并对项目用到的东西加权。首次检索建索引，之后离线。

11. 裁剪笔记（可选）：

```bash
stalemap probe
```

让模型为每处变更写代码、对 pin 的版本做类型检查，再带笔记重跑；模型本来就会的笔记从笔记块里删掉。原文提醒：probe 任务直接点名旧 API，因此测的是“被指到时知不知道”，比“主动发现”容易。

12. 数据边界（合规前提）：包名与版本会发往 npm registry、GitHub（changelogs/releases，可用 `GITHUB_TOKEN` 或 `gh` 登录）与 models.dev；源码不上传，import 扫描在本地。使用 `--llm` / `--examples` / `--guides` 时，类型 diff、release note 片段、指南文本与导入的 API 名会发往 Claude（Anthropic API 或 `claude -p`），但不含代码；`probe` 的提示词发给你选的 provider；设置 `$STALEMAP_PRECOMPUTED_URL` 时只发包名不发版本。
13. 小范围试用：先在一个 JS/TS 单 package.json 项目里 `npx stalemap` 预览，再 `npx stalemap sync` 写入，CI 加 `npx stalemap check`，Claude Code 侧装插件；观察会话通过率、首次编辑使用过期 API 的比例、单会话成本与时长。不要直接 adopt；原文只测了两个 Claude 模型且为作者自测，非 JS/TS、monorepo、无自带类型的包都不适用。

与做法 A-F、H 的差异：A/E 的 memory 与知识库是用户或项目自己写的长期信息；G 的笔记是从 npm/GitHub 的 changelog/release note 与模型截止日算出来的依赖变更，写入 `AGENTS.md`/`CLAUDE.md` 或由插件注入。D 核对 git/GitHub/本机事实；G 不核对项目状态，只补依赖 API 盲区。F 是跨 agent/机器的记忆管线；H 是团队分层记忆服务；G 是依赖变更通道。G 可以和 A/E/F/H 叠加，但不要把 G 的笔记当作用户确认过的知识库结论；guard 与 CI check 才是它的编译层核对。

### 做法 H：用 hsuanshao/AgentMemory 做自托管、分层的团队记忆

针对的问题是：跨会话记忆如果只靠某个人手写笔记，团队里多个人、多个 agent 会各记各的；如果直接把所有对话都塞进一个共享库，又缺少部门/团队/成员隔离和分层结构。AgentMemory 是自托管、面向团队的 AI agent 长期记忆服务：捕获每次对话，在后台蒸馏为 facts（L1）、scenes（L2）和 persona（L3），并在每次提示前召回相关内容；README 声称可服务 Claude Code、Codex、Antigravity、Hermes 以及任意 MCP 客户端。

核心设计是分层记忆：原始对话 L0 存在 SQLite/FTS5；L1 做上下文分段与 persona/episodic/instruction 抽取；L2 按 team+agent 共享 scenes；L3 汇总为 `persona.md`。召回使用 BM25 + 向量检索 + RRF 融合。数据、数据库乃至蒸馏模型都可放在内网：LLM 可用任意 OpenAI 兼容端点，也可用本机 `claude`、`codex`、`agy` 等 CLI。权限结构是部门→团队→成员/agent；成员对话和事实私有，agent 的 scenes 和 persona 由使用该 agent 的人共享。

1. 准备前提并确认许可证。前提：Docker、git；一个 LLM 后端（OpenAI 兼容 API key，或本机可调用的 CLI）；默认 SQLite 无需额外安装。只有要多副本时才需要 Redis，要规模化或换掉 SQLite 时才需要 PostgreSQL/pgvector。从源码构建需要 Rust MSRV 1.88。生产使用前先看许可证：0.4.0 起服务端为 BUSL-1.1，免费范围是评估、个人、非营利，以及最多 1 个部门、10 个成员的组织。预期：你知道自己是否落在免费范围，以及是否要准备 Docker、LLM key 和数据库。
2. 交互式安装：

```bash
git clone https://github.com/hsuanshao/AgentMemory.git && cd AgentMemory
./install.sh
```

安装器会依次询问：存储后端（SQLite 默认 / 已有 PostgreSQL URL / 用 Docker 启动 PostgreSQL pgvector）；协调后端（单节点默认 / 已有 Redis / 用 Docker 启动 Redis）；LLM（OpenAI 兼容 API / Claude Code CLI / Antigravity CLI / Codex CLI）；CLI 的项目目录和暴露端口。之后它会生成 Gateway API key 和数据库密码，写入权限 600 的 `.env`（含 `COMPOSE_PROFILES`），启动服务并等待健康检查，最后创建第一个 admin 并显示一次性的登录 user key。前提：能运行 Docker Compose。预期：服务起来，你拿到 admin user key；这个 key 只显示一次，先存好。
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
cp .env.example .env        # set at least AGENT_MEMORY_API_KEY
docker compose up -d --build
curl -s -X POST http://localhost:8420/v3/internal/meta/user/init-admin -H "Authorization: Bearer $AGENT_MEMORY_API_KEY" -H "x-memory-department-id: default" -H "content-type: application/json" -d '{"username":"admin"}'
```

也可以分别启动服务：

```bash
docker build -f docker/core.Dockerfile -t memory-core:local .
docker run --rm -p 8420:8420 -e AGENT_MEMORY_API_KEY=change-me -e AGENT_MEMORY_LLM_API_KEY=sk-... -v memory-core-data:/data memory-core:local
docker build -t memory-panel:local panel
docker run --rm -p 8125:8125 -e CORE_URL=http://host.docker.internal:8420 -e CORE_API_KEY=change-me memory-panel:local
```

服务地址：memory-core 为 `http://localhost:8420`，memory-panel 为 `http://localhost:8125`。

5. 建立用户、团队和 agent：用 admin user key 登录 Panel（默认 8125）。在 **Metadata** 下由系统管理员创建用户（每个用户拿到只显示一次的 user key）、创建团队、把用户按角色加入团队、创建 agent。其他成员默认只读 Panel。客户端只用 user key 认证，不需要 `AGENT_MEMORY_API_KEY`；每次记忆调用都要带用户所属的 `team_id` 和 `agent_id`。具体隔离规则看 `docs/COLLABORATION.md` 和 `docs/API.md`。预期：最小团队结构建立，成员和 agent 各有自己的 key/身份。
6. 接入客户端：README 没有在正文给出 `amem` 的安装命令，只指向 `docs/REMOTE-CLIENTS.md`。按该文档安装 `amem`，配置 Claude Code、Codex、Antigravity 或 Hermes 的 hooks/MCP 集成；服务器和 agent 不在同一台机器时，还要按该文档处理 TLS、发 key 和客户端升级。`amem` 会在内容离开本机前做 secret 脱敏，并在服务器不可达时排队。前提：先确认客户端文档里的安装命令和 TLS 步骤。预期：一个客户端能连上你的 memory-core，并带上正确的 `team_id`、`agent_id`。
7. 选择 LLM 后端。用 OpenAI 兼容 HTTP 时，按 README 的变量配置：

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
    command: claude              # or ollama, or any tool that reads stdin and prints a text answer
    args: ["-p"]                 # ollama example: ["run", "llama3.1"]
    promptMode: stdin            # use arg for tools that only take arguments, and put {prompt} in args
    workingDir: ~/projects/my-app
    maxConcurrency: 2
```

对应环境变量是 `AGENT_MEMORY_LLM_PROVIDER=cli`、`AGENT_MEMORY_LLM_CLI_COMMAND`、`AGENT_MEMORY_LLM_CLI_ARGS`、`AGENT_MEMORY_LLM_CLI_PROMPT_MODE`、`AGENT_MEMORY_LLM_CLI_WORKDIR`。CLI 调用不经过 shell，prompt 默认走 stdin，不会出现在进程列表；每次调用受 `timeoutMs` 限制，超时会杀子进程，非零退出或空输出会被当作 LLM 不可用并交给管线重试。`agy` 的 prompt 作为参数传入，受 Linux 单参数 128 KiB 限制，且需要 CPU 支持 AES-NI。预期：蒸馏任务能跑完，Panel 的 Monitor 能看到生成日志和死信。
8. 按规模选择存储和协调后端。默认 SQLite：每个部门一个文件，FTS5 全文检索，`sqlite-vec` 做向量 KNN；扩展加载失败时退化为暴力比较。PostgreSQL：每个部门一个 schema（`am_<hash>`），tsvector + GIN，pgvector HNSW；维度大于 2000 时用精确搜索。Redis：管线状态、任务队列和分布式锁都放 Redis，可跑多个 memory-core 副本；队列是 at-least-once，租约默认 15 分钟并自动续期，节点崩溃后任务会重投；锁用 `SET NX PX`，默认 TTL 10 分钟；不支持 Redis Cluster。配置示例：

```text
AGENT_MEMORY_STORAGE_BACKEND=postgres
AGENT_MEMORY_POSTGRES_URL=postgres://user:pass@host:5432/db
AGENT_MEMORY_COORDINATION_BACKEND=redis
AGENT_MEMORY_REDIS_URL=redis://[:password@]host:6379/0
```

从 SQLite 迁到 PostgreSQL 用 `./migrate-to-postgres.sh`，用户、key、记忆和 skill 会一起迁移，客户端不用改。前提：单节点小团队先用 SQLite；多副本才上 Redis；规模化或要 pgvector 才上 PostgreSQL。预期：你知道自己该选哪一种，不会为了小团队一上来就上多副本。
9. 理解并接受默认触发参数：warm-up 在 1→2→4→每 N 轮，或空闲 600 秒时触发；L1 抽取带 LLM 去重（store/update/merge/skip）；L2 在延迟 90 秒且距上次 L2 至少 900 秒后执行，之后每 3600 秒扫一次；L3 在冷启动、每 50 条新记忆或某个 scene 请求更新时触发；每个 team+agent 最多 15 个 scenes。召回接口 `/v3/recall` 会先剥掉之前注入的块，再做 L1 混合检索（BM25 + 向量 + RRF k=60，无 embedding 时退回 BM25），按阈值、数量和字符预算输出 `<relevant-memories>`，以及 `<user-persona>` 和 `<scene-navigation>`。中文全文检索会把文本切成“重叠 CJK bigram + 拉丁词”再进 FTS5，不需要词典。预期：你知道召回不是“实时全量搜索”，而是按这些触发参数分层生成。
10. 运维和自测：Panel 的 Monitor 提供蒸馏健康、生成日志和死信；失败任务会过期重试，死信列表保留最新 10,000 条。`/health` 的 `stores.vectorIndex` 会报告 `sqlite-vec`、`brute-force`、`pgvector-hnsw`、`pgvector-exact` 或 `none`。升级用 `./upgrade.sh`，卸载客户端用 `./uninstall.sh client`，卸载服务端用 `./uninstall.sh server`，加 `--purge-data` 才删数据。本地测试命令：

```bash
cargo test --workspace
docker run -d --rm --name amem-pg -e POSTGRES_PASSWORD=test -p 25432:5432 pgvector/pgvector:pg16
docker run -d --rm --name amem-redis -p 26379:6379 redis:8.4.0
AGENT_MEMORY_TEST_POSTGRES_URL=postgres://postgres:test@127.0.0.1:25432/postgres AGENT_MEMORY_TEST_REDIS_URL=redis://127.0.0.1:26379 cargo test --workspace
AGENT_MEMORY_LLM_API_KEY=sk-... cargo run -p memory-server
cd panel && npm install && npm run dev
```

11. 最小试用：先以单团队、SQLite、本地 CLI 或 OpenAI 兼容端点做最小部署，只接入一个客户端，用 2—3 次真实会话验证跨会话召回能否减少重复交代。前提：用测试团队、测试 agent、非敏感对话；先不要接真实公司知识库。预期：你能看到召回块被注入，且下一次会话不需要重复交代同一背景。
12. 与做法 A-G 的关系：H 可以替代 A 的 memory 骨架和 F 的部分团队共享需求；H 的 L1/L2/L3 仍是“主张”来源，不能替代 D 的 git/GitHub/本机事实核对；E 的冲突裁决指令可以叠加在 H 的召回结果上，要求 agent 在“召回内容 vs 用户当下说法”冲突时标记并请你裁决；G 的依赖 API 笔记与 H 无关，可单独叠加。

### 做法 I：文档与代码冲突时以代码为准，并在回复里列出冲突点（@ai_database）

针对的问题是：项目文档（README、设计文档、旧说明）落后于代码，编码 agent 按旧文档改代码，把本来正确的实现改坏。原文给出的规则只有一句：当文档与现有代码存在冲突时，以代码为准，并在最后回复中列出所有冲突点。它的目的就是减少代理依据过时文档改代码。注意：原文在“据说Claude”处截断，能确认的只有这条规则及其简要理由；没有数据、案例、前后对比或具体实验。

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

与做法 D/E 的差异：D 是笔记/记忆 vs git/GitHub/本机事实，靠脚本采集；E 是用户当下说法 vs 知识库记录，靠常驻指令 + 人裁决；I 是项目文档 vs 现有代码，靠常驻指令 + 最终回复列出冲突。三者可叠加：I 可以写进 A 的 `CLAUDE.md`，也可以和 E 的规则放在一起，但不要把 I 当成 D 的事实核对替代——代码也可能有 bug，“以代码为准”只是减少按旧文档改坏的概率，不是证明代码正确。

## 怎么判断变好了

最小试用方式（做法 A-1/A-2、B、C、D、F、H）：
1. 建一个 `second-brain` 目录，只放入少量非敏感材料，不要一上来就接真实收件箱。
2. 在本机装好并授权 GWS CLI（做法 B），先只开一项权限（例如日历只读）跑通；安装与授权命令原文未给，需自行查文档确认后再执行。
3. 做法 A-1：在目录下建 `memory` 子目录，并在 `CLAUDE.md` 写一条规则：把每次会话中确认的长期有效信息追加到 `memory` 下的文件中，并在开始新任务前先读取 `memory`。规则内容需自行拟定，原文未给出。
4. 做法 A-2：选一个你最近反复解释过的真实项目，建 `second-brain/notes` 与 `second-brain/people`；只放入原文允许的 notes 内容（事实、研究、想法）和你能确认的 people 相关信息；在 second-brain 中打开 Claude Code，用同一任务做两次对比：一次不提供目录上下文，一次在该目录中让 Claude Code 基于现有材料工作。原文未给具体提示词，因此不要声称复现原文提示词。
5. 连续使用 1～2 周，每天在同一目录下开 Claude Code 做真实工作。
6. 想验证做法 C，按原文的对照方式跑：同一模型、同一 vault、同一批问题，唯一变量是有没有装 obsidian-wiki；ground truth 用 networkx 而不是本项目自己的代码（betweenness 每个节点吻合到 3.5e-18，630 组最短路全部一致）。
7. 想验证做法 D，在长期项目上小范围试：clone 仓库后运行 `bin/adopt.sh`，先填好 `.claude/ground-truth.conf` 并把 `ground-truth.sh` 跑到 `GROUND TRUTH: complete`，再用 `/session-start` 和 `/handoff` 包住每天的工作。观察脚本报出的“handoff 与事实不一致”条目数是否下降。
8. 想验证做法 F，先在测试机、单仓库、只接一个 agent 的情况下按 README 装上并 `ai-memory setup`，重启 agent 后问 “What do you remember about this project?”；如果它通过 ai-memory 回答，说明接线成功。然后连续 1～2 周在同一仓库用 `ai-memory run claude` 或 `ai-memory run codex --yolo` 工作，对比“新会话是否还要重新交代背景”。
9. 想验证做法 H，先按第 1—11 步做单团队、SQLite、一个客户端的部署；用 2—3 次真实会话看召回是否减少重复交代，再决定是否扩到第二个成员或第二个 agent。不要一上来开多副本、接真实收件箱或推给全团队。

最小试用方式（做法 E，一次就能跑完）：
1. 按上面的草稿写好常驻指令，只挂在你自己一个人的日常任务上，不要一上来就推给团队或改公司级知识库。
2. 挑 5 个你已知答案的任务，其中至少 2 个故意说一句与知识库内容矛盾的话。
3. 逐个记录：它有没有真的先读库；矛盾有没有被标出并同时引用两个版本；裁决后给出的编辑是否可以直接采纳。

最小试用方式（做法 G）：
1. 选一个 JS/TS 单 package.json 项目，先跑 `npx stalemap` 预览，确认笔记块内容与你的依赖变更相关。
2. 再跑 `npx stalemap sync` 写入 `AGENTS.md` 或 `CLAUDE.md`，并在 CI 加 `npx stalemap check`。
3. Claude Code 侧装插件：`/plugin marketplace add Umair/stalemap`、`/plugin install stalemap@stalemap`；观察 SessionStart 注入和编辑后 guard 是否触发。
4. 用同一模型、同一批任务、同一项目做对照：一组不装 stalemap，一组装 stalemap；记录会话通过率、首次编辑使用过期 API 的比例、单会话成本与时长。原文未给试用时长；先小范围试，不要直接 adopt。

最小试用方式（做法 I，一次任务到 2—3 个同类任务）：
1. 选一个有已知“文档落后于代码”问题的小仓库。
2. 把规则加入 `CLAUDE.md` 或 `AGENTS.md`。
3. 让代理完成一个小型代码修改任务，要求照常给出最终回复。
4. 与未加规则前的同类任务对比：是否列出冲突点、是否按现有代码改、返工是否减少。

观察指标（做法 A-1/A-2、B）：
- 重复交代率：同一背景信息需要重新告诉 AI 的次数是否下降。
- 召回成功率：跨会话提问“上次关于 X 的结论是什么”，能否从 `memory`、`notes` 或 `people` 中正确取回；错答或答不上来的比例。
- 目录是否被实际读取：agent 是否引用 `notes/` 或 `people/` 中的内容；如果从不引用，说明只是堆文件，需要补常驻指令。
- 记忆文件质量：`memory`/`notes` 里的条目有多少比例确实是长期有用的，多少是噪声；需要人工清理的频率。
- 越权与泄漏：是否出现过读取到不该读的邮件/文件，或把敏感内容写进记忆文件、人物目录的情况。此项为红线指标，出现即停。
- 对照组：同期在另一个不含 `memory`、`notes`、`people` 与 `CLAUDE.md` 规则的目录里做同类任务，比较上面几项。

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
- `/session-start` 报告的主张与事实不一致条目数；README 样例一次暴露 3 条 ⚠。
- 每个任务的“done when”是否可执行。
- 后台任务、PR 的 CI 状态、未推送提交是否在下一次 `/session-start` 被翻出来。
- 注意：README 没有描述无人值守的后台自动运行，推进发生在会话边界，由脚本采集 + 会话报告驱动。

观察指标（做法 E，均可自记，不需要额外工具）：
- 读取命中率：需要用到知识库信息的任务里，它主动读取的比例。
- 冲突召回：你预设的矛盾里被标记出来的比例（漏报几个）。
- 误报数：把本来不矛盾的内容标成冲突的次数——太高说明指令需要收紧。
- 编辑可采纳率：它给出的“对大脑的确切编辑”中，你能直接照改、不改写就用的比例。
- 成本：每个任务额外的耗时和 token 消耗，是否值得。

观察指标（做法 F）：
- 接线是否成功：重启 agent 后问 “What do you remember about this project?”，它是否通过 ai-memory 回答。
- 重复交代率：新会话是否还要重新交代项目背景；跨 agent、跨机器时是否仍要重新交代。
- 记忆文件质量：wiki 页面是否可 grep、可用 Obsidian 打开、可手工编辑、可 rsync；数据库是否可从文件重建。
- 越权与泄漏：捕获、搜索、handoff 会采集提示词与工具调用，此项是红线指标，出现即停。
- 对照组：同期在未装 ai-memory 的仓库或另一个 agent 上做同类任务，比较重复交代率和召回成功率。
- 注意：默认路径零 LLM 调用，捕获、搜索、handoff 都不需要 API key；可选 LLM“dream”后台重写。写入上限约 700/s 是 README 自称的实测值，不是独立验证。

观察指标（做法 G）：
- 会话通过率：同一批任务、同一模型，装与不装 stalemap 的通过率差异。调研结论称预注册盲测数据为 89%（stalemap）vs 68%（无辅助）vs 73%（普通 tsc 钩子）；但报告正文在“通过率：”处截断，具体表格无法引用。
- 首次编辑使用过期 API 的比例：agent 第一次改代码时是否用了训练截止后的旧 API。
- 单会话成本与时长：注入笔记、编辑后 guard、检索带来的额外开销是否值得。
- 天花板对照：把“人工写一行点名变更的提示”当作上限，估计 stalemap 还差多少。
- 普通 `tsc` 钩子不能当作 stalemap 的等价物：原文明确说普通 `tsc` 钩子是 guard 的子集，二者不等价。

观察指标（做法 H）：
- 接线是否成功：按客户端文档接入后，下一次会话是否收到 `<relevant-memories>` 或对应的召回块；Panel 的 Monitor 是否显示蒸馏健康。
- 重复交代率：同一团队、同一 agent，新会话是否还要重新交代背景。
- 召回相关性：召回块里有多少是当前任务真正相关的，多少是噪声；噪声高时先调阈值/数量/字符预算，或收紧触发参数。
- 隔离是否正确：成员 A 的私有对话和 facts 是否没有出现在成员 B 的召回里；agent 的 scenes/persona 是否只在预期共享范围内可见。
- 越权与泄漏：H 会捕获对话并蒸馏，`amem` 会在离开本机前做 secret 脱敏，但仍要先用非敏感内容验证；此项是红线指标，出现即停。
- 运维成本：SQLite 单节点是否够用；什么时候需要 Redis/PostgreSQL；Panel 死信和重试是否可处理。
- 许可证：部门数、成员数是否仍在免费范围；超过 1 个部门、10 个成员的生产使用要付费。

观察指标（做法 I）：
- 最终回复是否明确列出发现的文档与代码冲突点。
- 代码修改是否遵循现有代码行为，而不是按旧文档改坏。
- 与未加规则前的同类任务相比，因过时文档导致的返工是否减少。
- 误报冲突数：把本来不矛盾的内容标成冲突的次数——太高说明规则需要收紧。
- 成本：最终回复变长带来的阅读与核对开销。

试多久：做法 A-1/A-2、B 用 1～2 周。如果重复交代率与召回成功率没有可观察的改善，或噪声清理成本高于收益，则放弃这条做法，退回到把 Claude Code 当作单次会话工具使用。做法 A-2 的原文只给到 `people/`，没有提示词和效果数据；连续 2—3 个真实任务中重复解释和纠正次数下降，且没有新增隐私或权限问题，再考虑扩大；下降不明显就保留为 study。做法 C 作者自评 early、样本 n=2，先小范围试再谈全面采用。做法 D 本次材料只到 README，脚本实现与效果未经验证，先小范围试，再谈全面采用。做法 E 一次就能跑完（5 个任务），判定标准是：冲突召回高、误报低、编辑可采纳率高，且额外成本可接受，就把这组指令固化为默认配置，再考虑推广到团队；如果误报频繁或给的编辑基本用不上，降级为“只在明确要求核对大脑时才启用”。做法 F 先单机、单仓库、只接一个 agent 跑 1～2 周；收益说法只有项目自述，没有独立验证，若“新会话是否还要重新交代背景”没有改善，就不要推到主力环境或团队。做法 G 原文未给试用时长；先在一个 JS/TS 单 package.json 项目小范围试，用会话通过率、首次编辑使用过期 API 的比例、单会话成本与时长判断是否继续，不要直接 adopt。做法 H 先用 2—3 次真实会话验证接线和召回，再给 1～2 周观察重复交代率；README 没有效果数据，先不要扩到多团队、多副本。做法 I 一次任务就能看出是否列出冲突；要判断返工是否下降，至少跑 2—3 个同类任务；原文没有量化指标和试用时长。

## 常见坑

- second-brain 原有第 4 步截断，`CLAUDE.md` 规则全文未知，不能直接照抄“所有重要细节”这种表述；需要自己界定什么算长期有效信息。
- 做法 A-2 的原文在 `people/` 处截断，第三个文件夹和后续用法缺失；不能把“建 `notes/` 和 `people/`”当作完整 second-brain 设置。
- `notes/` 和 `people/` 只是目录结构，不会自动让 Claude Code 读取；必须配 A-1 的 `CLAUDE.md` 规则或常驻指令，否则只是把材料换个地方放。
- `people/` 里放什么、第三目录叫什么、更新规则是什么，原文都没说；涉及人物信息时先按非敏感材料试，别把隐私信息直接放进去。
- 做法 A-2 与 A-1 目录命名不同：`memory/` vs `notes/` + `people/`；两者可并存，但要在规则里写清楚，避免 agent 读错或重复写入。
- 传播数据（70 赞、10 转发、24 回复）只是传播热度，不是效果证据；原文没有效果数据、前后对比或失败案例。
- 原文没有 GWS CLI 的安装命令、包名来源和授权流程，不能凭想象执行；先查证再操作。
- “所有重要细节”没有界定范围，容易把噪声写进 `memory`，需要人工清理。
- 做法 A 未说明记忆如何被召回：是每次会话自动读取，还是需要显式提示，原文未交代；必须自己验证。
- 未说明 GWS CLI 的授权范围、凭证存储方式与撤销方式，存在隐私与凭据风险。
- 做法 C 的作者自评项目“early”，效果数据只有 n=2 的小样本，先试再谈全面采用。
- 做法 C 的一个具体失败机制：普通智能体追踪连接关系时会走 `index.md`——它链接到每一页，于是“找到”一条毫无意义的短路径，并据此把 `index` 列为 vault 最重要的页面之一；两次运行都犯同一个错。skill 查询的图排除了这类记账文件，所以正确答案才可达。
- 安装 obsidian-wiki 时，原文明确说不要用 `uvx`；用 `uv tool install` 或 `pipx install`。
- Claude Code 插件路线只带 skills，不带 session hook 和 CLI；要“会话开始注入回顾、结束提醒捕获”就得走 pip 安装路线。
- 原文只描述了 hook 触发和维护命令，没有给出按时间/状态自动调度（如 cron、定时任务）的配置，这部分不能照搬。
- Cursor、Hermes、OpenClaw 的支持都只是 README 里的一句话，没有配置细节，先按 watch 对待。
- Obsidian 只是查看器和 Markdown 载体；如果因为“不想引入 Obsidian”而放弃做法 C，是没有必要的——vault 就是磁盘上的纯 Markdown 文件夹。
- 做法 D 本次材料只到 README，脚本实现与效果未经验证；不要把它当作已经证明能减少所有记忆失真。
- 做法 D 的推进发生在会话边界，不是无人值守后台；README 没有描述自动调度。
- 做法 D 的工作区形态要求根目录 remote 必须是 PRIVATE，首次提交前要检查 `git status --ignored`、扫密钥，且绝不追踪 datadir、密钥或二进制。
- 主张和事实的优先级：A 的 memory、C 的 vault、F 的 wiki/handoff、H 的召回结果都可读，但先跑 ground truth；否则可能把旧笔记当事实继续施工。
- 做法 E 最大的材料缺口：原文写“完整提示如下”，但采集到的正文里没有这段完整提示，本手册中的提示词是按三条要点重写的草稿；照做后若行为不符合预期，先怀疑草稿与作者实际使用的提示有差异。
- 做法 E 的“不告诉 AI 怎么用第二大脑，它就毫无用处”“修复只要 90 秒”都只是作者主张，没有任何对照、案例或数据支撑；101 赞、6 次转发、14 条回复是传播指标，不是效果指标。
- 做法 E 没提的成本与风险：每次任务前读库带来的 token/时间开销、冲突误报造成的打断、以及让 AI 直接改写知识库的出错风险。误报频繁时先收紧指令，而不是继续让它改库。
- 做法 E 与 A 的规则可能叠在一起：A 只规定“读和追加”，E 要求“冲突标记 + 裁决 + 确切编辑”。两条规则写在同一处时注意不要互相矛盾，也别把 E 的写回编辑当成自动生效的改动。
- 做法 E 假设工具会稳定遵守常驻指令、知识库在冲突时确实可能更对，这两点在原文里没有证据；先用 5 个已知答案任务验证再固化。
- 做法 F 的所有收益说法都只有项目自述、没有独立验证；不要因为 README 写得完整就当作已证明有效。
- 做法 F 要常驻服务并采集提示词与工具调用；先单机、单仓库、只接一个 agent，用非敏感材料试，确认可接受再扩大。
- 做法 F 的 Docker quick-start 没有认证——容器没跑 `init`，不带 token 启动；服务只绑 loopback，机器外部够不着，但本机进程和浏览器页面可以。不要把该端口暴露到外网。
- 做法 F 的 Windows 原生支持被 README 标为 Experimental，更稳的路子是 WSL2 或 Docker Desktop。
- 做法 F 的原文在 `ai-memory run --f` 处截断，不能补全；遇到 lease 问题先查 README。
- 做法 F 的“跨 20 多个 harness、跨项目 profile、跨机器、团队共享、多用户认证、审计日志、不是付费档、无 LLM 记忆老化、写入上限约 700/s”都是 README 自称，缺少独立验证。
- 做法 F 不能替代做法 D：它的 handoff 仍是 agent 交接协议，仍是主张；git/GitHub/本机事实仍要用 `ground-truth.sh` 这类脚本核对。
- 做法 G 只支持 JavaScript / TypeScript 项目，且只支持一个 `package.json`，尚无 workspace 遍历；monorepo 不要直接套。
- 做法 G 对无自带类型的包只能靠 release note；`@types/*` 不做 diff。别把“类型签名没报错”当成依赖没变。
- 做法 G 的预注册盲测数据是作者自测，只测了两个 Claude 模型；报告正文在“通过率：”处截断，具体表格无法引用。不要当作已证明有效。
- 做法 G 的 Cursor / Codex / OpenCode `setup --agent` 原文明确说尚未在真实安装中验证过；Cursor 目前不把 `postToolUse` hook 的上下文传给模型，只能靠 stop-hook 兜底。先按 watch 对待，不要写进团队标准流程。
- 做法 G 的普通 `tsc` 钩子是 guard 的子集，二者不等价；不要用普通 tsc 钩子替代 guard。
- 做法 G 的 `npx stalemap check` 会在笔记块缺失或过期时 exit 1；不要忽略这个失败，否则依赖变了笔记没变。
- 做法 G 把笔记写在 `AGENTS.md` 时，Claude Code 读的是 `CLAUDE.md`；要在 `CLAUDE.md` 里加 `@AGENTS.md`，或用 `--target CLAUDE.md` 指定目标。
- 做法 G 的插件和 hook 走 `npx -y stalemap@latest`，因此始终用最新 npm 版本；要固定版本需自己另做控制，原文没有给固定版本的做法。
- 做法 G 的 `--budget` 默认 1800 tokens，超出时优先保留项目实际用到的部分；不要为了塞全量 changelog 把预算撑爆。
- 做法 G 的 `probe` 任务直接点名旧 API，测的是“被指到时知不知道”，比“主动发现”容易；不要把 probe 结果当成主动发现能力的证明。
- 做法 G 的 GitHub Action comment 模式需要 `permissions: pull-requests: write`；没有这个权限就不要开 comment 模式。
- 做法 G 的数据边界：包名与版本会发往 npm registry、GitHub、models.dev；`--llm` / `--examples` / `--guides` 会把类型 diff、release note 片段、指南文本与导入的 API 名发往 Claude（不含代码）；`probe` 的提示词发给你选的 provider；`$STALEMAP_PRECOMPUTED_URL` 只发包名不发版本。不能接受就别开对应通道。
- 做法 H 的许可证是硬约束：0.4.0 起服务端为 BUSL-1.1，免费范围只到评估、个人、非营利，以及最多 1 个部门、10 个成员的组织；超过就要付费。
- 做法 H 的 README 没有在正文给出 `amem` 安装命令，只指向 `docs/REMOTE-CLIENTS.md`；没有这份文档不能凭想象装客户端。
- 做法 H 的 README 没有给效果数据；不要因为管线图画得完整就当作已证明能减少重复交代。
- 做法 H 会捕获每次对话并蒸馏，`amem` 的 secret 脱敏只是客户端侧的一层；先用非敏感内容试，并确认成员私有对话、agent 共享 scenes/persona 的隔离符合预期。
- 做法 H 的 SQLite 是每部门一个文件，`sqlite-vec` 加载失败会退化为暴力比较；数据量上来后要评估 PostgreSQL/pgvector。
- 做法 H 的多副本需要 Redis；队列是 at-least-once，节点崩溃会重投，任务要幂等；Redis 锁 TTL 10 分钟，且不支持 Redis Cluster。
- 做法 H 的默认触发不是实时：L2 有 90 秒延迟且至少间隔 900 秒，L3 在冷启动、每 50 条新记忆或 scene 更新时触发；刚聊完立刻问“你还记得吗”可能还没蒸馏完。
- 做法 H 的客户端只用 user key，不需要 `AGENT_MEMORY_API_KEY`；每次记忆调用要带 `team_id` 和 `agent_id`。不要把 admin 的 Gateway key 当客户端 key 用。
- 做法 H 的 Panel 其他成员默认只读；创建用户、团队、agent 要用 admin user key。admin user key 只显示一次。
- 做法 H 的手动部署要先 `cp .env.example .env` 并至少设 `AGENT_MEMORY_API_KEY`，再 `docker compose up -d --build`；否则服务起不来或没有认证。
- 做法 H 的 Docker 手动部署如果数据库在宿主机，要用 `host.docker.internal` 而不是 `localhost`。
- 做法 H 的 `/health` 的 `stores.vectorIndex` 可能显示 `none`、`brute-force` 等；先确认它符合你的预期，再判断召回质量。
- 做法 H 的 `amem` 在服务器不可达时会排队，但排队不是无限可靠；远程部署要按 `docs/REMOTE-CLIENTS.md` 处理 TLS、发 key 和客户端升级。
- 做法 H 的 `agy` 作为 CLI 后端时，prompt 作为参数传入，受 Linux 单参数 128 KiB 限制，且需要 CPU 支持 AES-NI；长 prompt 要换后端。
- 做法 I 的原文只有一条规则和一句目的说明，且在“据说Claude”处截断，无法确认后续解释；不要把它当作完整规范。
- 做法 I 的“以代码为准”是一个前提假设：代码本身可能有 bug 或正处于重构中；按代码改之前仍要人复核，别把规则当成“代码永远正确”。
- 规则写进 `AGENTS.md` 而 agent 只读 `CLAUDE.md` 时不会生效；要么写进 `CLAUDE.md`，要么用 `@AGENTS.md` 引入。
- 冲突点全列进最终回复会增加噪声；误报频繁时先收紧“文档”的范围和“冲突”的判定，而不是继续加规则。
- 只写规则不做小任务验证，无法知道它是否生效；至少用一个已知不一致点试一次。
- 做法 I 不能替代做法 D 的事实核对：代码和文档都可能过时，git/机器事实仍要脚本核对。

## 证据与来源

- second-brain 原有 `memory/` 规则侧：来源是 @Bober_smart 的推文/调研报告。原文给出 4 步清单，第 4 步在“保存到……”处截断；无命令示例、无规则全文、无效果验证。传播数据为 494 次点赞、79 次转发、28 条回复——这是传播热度，不是效果证据。
- second-brain 目录变体侧（新增）：来源是 @kinderlayer 的推文/调研报告（70 赞、10 转发、24 回复）。原文只给出 `second-brain`、`notes/`（事实、研究、想法）、`people/` 三个目录中的前两个半，在 `people/` 处截断，第三个文件夹与后续用法缺失；除 `mkdir` 外无命令示例、无提示词、无配置、无效果数据。它只能作为做法 A 的目录组织变体，不能作为完整工作流。
- obsidian-wiki 侧：来源是 Ar9av/obsidian-wiki 的 README。作者自评项目“early”，效果数据只有 n=2 的小样本。对照数据出自该 README；方法细节为 Claude Sonnet、headless、真实 38 页 vault；问题用自然语言、不提供图定义。报告在“普通智能体有”处截断，那一侧的细节无法引用。ground truth 用 networkx（betweenness 每个节点吻合到 3.5e-18，630 组最短路全部一致）。
- truongfelix/workflow 侧：来源是该仓库 README（MIT，32 stars）。本次材料只到 README，脚本实现与效果未经验证。README 给出一份完整的 Monday morning `/session-start` 输出样例（含 3 条与上周五 handoff 的不一致告警、当天 3 项带完成判据的任务、2 条等待裁决的问题），并称这套场景的全部文件与脚本输出都在 `example/`。仓库自身有 CI 徽章，`test/run.sh` 测 `adopt.sh` 与 `ground-truth.sh`，CI 在 Linux/macOS/Windows 三种系统上跑。
- @coreyganim 侧：来源是一条推文（101 赞、6 次转发、14 条回复）。原文给出三条指令要点：任务前先读公司大脑与个人大脑、与大脑冲突就标记并同时引用两版、等用户裁决后给出对大脑的确切编辑；并主张“建了第二大脑却不告诉 AI 怎么用，它就毫无用处”“修复只要 90 秒”。这些判断没有对照、案例或数据支撑。关键材料缺口：原文写“完整提示如下”，但采集到的正文未包含该完整提示，本手册中的提示词是按这三条要点整理的草稿，效果可能与作者实际使用的提示不同。
- akitaonrails/ai-memory 侧：来源是该仓库 README（MIT，Rust 单二进制）。README 给出 capture→consolidate→recall→handoff 管线、Linux/macOS 两条安装命令、Windows PowerShell、Arch/Fedora 包管理器、macOS 菜单栏 App、Docker quick-start、`ai-memory run` 启动方式；并称默认路径零 LLM 调用，捕获、搜索、handoff 都不需要 API key，真相源是 git 托管的普通 `.md` 文件，数据库只是可随时从文件重建的派生索引，跨 agent 交接是显式的、带类型的 claim-once 协议。收益说法（跨二十多个 harness、跨项目、跨机器、团队共享、多用户认证、审计日志不是付费档、纯 Markdown、静默捕获、无 LLM 记忆老化、可选 LLM dream、写入上限约 700/s）目前只有项目自述，没有独立验证。调研结论明确建议：先在单机、单仓库、只接一个 agent（Claude Code 或 Codex）的情况下按 README 的两条命令装上并跑一到两周，用“新会话是否还要重新交代背景”来判断是否值得留下。
- Umair/stalemap 侧：来源是该仓库 README。调研报告称预注册盲测 held-out v4：66 个任务，按种子从 33 个流行 npm 包在某三个月窗口内发布的所有 breaking / deprecation / behavior change 中抽取；每任务每臂每模式每模型 3 个 session；构建在任何 v4 结果产生前冻结为 `freeze/v4-final`；只有两层 bootstrap（先任务后运行）求出的区间不含 0 才算胜。调研结论给出 89% vs 无辅助 68% vs 普通 tsc 钩子 73%，但报告正文在“通过率：”处截断，具体表格无法引用。只支持 JS/TS 与单个 package.json；只测了两个 Claude 模型且为作者自测。Cursor/Codex/OpenCode 的 `setup --agent` 原文明确说尚未在真实安装中验证过；Cursor 目前不把 `postToolUse` hook 的上下文传给模型，需 stop-hook 兜底。数据边界：包名与版本发往 npm registry、GitHub、models.dev；源码不上传；`--llm` / `--examples` / `--guides` 会把类型 diff、release note 片段、指南文本与导入的 API 名发往 Claude（不含代码）；`probe` 提示词发给你选的 provider；`$STALEMAP_PRECOMPUTED_URL` 只发包名不发版本。
- hsuanshao/AgentMemory 侧：来源是该仓库 README。它描述了一个自托管、面向团队的长期记忆服务：捕获每次对话，后台蒸馏为 L1 facts、L2 scenes、L3 persona，并在每次提示前召回；L0 原始对话存 SQLite/FTS5，L1 做上下文分段与 persona/episodic/instruction 抽取，L2 按 team+agent 共享 scenes，L3 汇总为 `persona.md`；召回用 BM25 + 向量 + RRF；权限结构是部门→团队→成员/agent，成员对话和事实私有，agent 的 scenes/persona 由使用该 agent 的人共享。README 给出交互式安装、非交互安装、手动 Docker 部署、Panel 建用户/团队/agent、`amem` 客户端文档入口、OpenAI 兼容或本地 CLI 的 LLM 后端、SQLite/PostgreSQL/Redis 选择、默认触发参数、`/v3/recall` 输出结构、Panel Monitor、`/health`、升级/卸载和本地测试命令。材料明确说明：README 没有在正文给出 `amem` 安装命令，只指向 `docs/REMOTE-CLIENTS.md`；没有效果数据；0.4.0 起服务端为 BUSL-1.1，免费范围是评估、个人、非营利，以及最多 1 个部门、10 个成员的组织。调研结论建议：先以单团队、SQLite、本地 CLI 或 OpenAI 兼容端点做最小部署，接入一个客户端，用 2—3 次真实会话验证跨会话召回能否减少重复交代。
- @ai_database 侧：来源是一条推文/调研报告，建议在 `CLAUDE.md` 和 `AGENTS.md` 中预先加入一条规则：当文档与现有代码冲突时以代码为准，并在最后回复中列出所有冲突点。原文在“据说Claude”处截断，能确认的只有这条规则及其简要理由；没有数据、案例、前后对比或具体实验，推文互动数据只能说明传播情况。适用条件是项目同时维护文档和代码且代理会读取 `CLAUDE.md`/`AGENTS.md`；对非代码工作或没有这类指令文件的项目不能直接套用。
- 证据强度提示：做法 A-1、B 只有步骤清单和传播数据，没有效果验证；做法 A-2 只有目录设置和传播数据，原文截断且无效果验证；做法 C 有对照实验数据，但样本极小且作者自评 early；做法 D 只有 README、样例输出和模板自身 CI，缺少独立效果验证；做法 E 只有一条推文和三条指令要点，推广、成本和风险均无数据；做法 F 只有 README 和可复制命令，收益只有项目自述，缺少独立效果验证；做法 G 有预注册盲测设计，但只支持 JS/TS、只测两个 Claude 模型且为作者自测，报告正文在通过率处截断，缺少独立复现；做法 H 只有 README，缺少效果数据和独立复现，且许可证对团队规模有约束；做法 I 只有一条规则和一句目的说明，原文截断且无效果验证。所有数据都不能当作“这套做法一定有效”的证明。
- 作者主张（缺少支撑）：建独立文件夹、接入 GWS CLI 打通 Gmail/日历/云端硬盘、单开 `memory` 子目录、在 `CLAUDE.md` 写死记忆规则；second-brain 目录变体的“可直接复制的第二大脑设置”；obsidian-wiki 的“知识是编译而非堆积”、manifest 增量摄入、每条主张打标 extracted / inferred / ambiguous、查询成本随规模基本不变；workflow 的“主张和事实是两回事”“做完删除不打勾”“UNKNOWN 绝不算通过”“没被点名的东西不算只存在一块盘上”“先建议再等”；@coreyganim 的“不告诉 AI 怎么用第二大脑就毫无用处”“90 秒修复”；ai-memory 的跨 agent/项目/机器、团队共享、无 LLM 记忆老化、写入上限约 700/s 等；stalemap 的“训练截止后依赖 API 变化是 agent 默认不知道自己不知道的工作”“普通 tsc 钩子是 guard 的子集，二者不等价”“probe 测的是被指到时知不知道，比主动发现容易”；AgentMemory 的 L0-L3 分层、团队共享 scenes/persona、BM25 + 向量 + RRF、默认触发参数和“可服务多种客户端”等；@ai_database 的“文档与代码冲突时以代码为准”能减少代理按过时文档改代码。
- 调研报告给出的建议（不是原文）：规则示例“把每次会话中确认的长期有效信息追加到 `memory` 下的文件中；开始新任务前先读取 `memory`”；先只开一项权限跑通；重复交代率、召回成功率、记忆文件质量、越权与泄漏、对照组等指标；1～2 周试用期；用同一模型、同一 vault、同一批问题做对照验证；在长期项目上小范围试做法 D；做法 E 的提示词草稿、5 个已知答案任务的试用方式，以及读取命中率、冲突召回、误报数、编辑可采纳率、成本五项指标，先只挂在自己日常任务上，不要推给团队或改公司级知识库；做法 F 先单机、单仓库、只接一个 agent 跑 1～2 周，用“新会话是否还要重新交代背景”判断是否留下；做法 G 先 `npx stalemap` 预览、再 `npx stalemap sync` 写入、CI 加 `npx stalemap check`、Claude Code 侧装插件，先在一个 JS/TS 单 package.json 项目小范围试，不要直接 adopt；做法 H 先单团队、SQLite、本地 CLI 或 OpenAI 兼容端点、一个客户端，2—3 次真实会话验证，不要直接推到多团队或多副本；做法 A-2 先选一个最近反复解释过的真实项目，建 `second-brain/notes` 与 `second-brain/people`，用同一任务做“无目录上下文 vs 有目录上下文”对照，连续 2—3 个真实任务观察重复解释和纠正次数；做法 I 把规则原样加入 `CLAUDE.md`/`AGENTS.md`，在一个存在文档与代码不一致的代码库中小范围试用，暂不宜直接采纳为通用规范。
- 仅为推测的部分：second-brain 原有第 4 步规则的目标位置推测指向 `memory` 目录；原文未界定“重要细节”；未说明记忆召回机制、GWS CLI 授权范围、凭证存储与撤销方式；second-brain 目录变体的第三个目录、`people/` 内容与更新规则、提示词和效果均缺失；obsidian-wiki 的 Cursor / Hermes / OpenClaw 支持细节也尚未证实；workflow 的脚本实现与效果未验证；做法 E 中“具体在哪个入口写常驻指令”原文只说要“添加一组自定义指令”，落点需按你手头的工具确认；做法 F 的 `ai-memory run --f` 处原文截断，Docker quick-start 未包含认证步骤；做法 G 的通过率表格在报告正文中截断，无法核对每个任务与每种模式的具体结果；做法 H 的 `amem` 安装命令、TLS 细节和客户端升级流程未在 README 正文展开，需查 `docs/REMOTE-CLIENTS.md`；AgentMemory 的效果数据缺失，默认触发参数是否适合你的团队需要实测；做法 I 的“据说Claude”之后的内容缺失，“以代码为准”在代码本身有错时的边界原文未讨论。

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
