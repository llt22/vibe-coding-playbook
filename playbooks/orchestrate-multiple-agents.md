# 把多代理的长任务交给可校验的文件状态与心跳

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多代理长任务中，谁在做、卡在哪、何时回收与派发、状态是否自洽，往往只存在于聊天记录里，无法审计也无法恢复；手册给出一套文件状态、心跳派发与一致性校验的编排流程，并保留原有从单次答案竞赛到合入门禁的做法。
> 先试这一步：先在一个低风险项目里建一份最小 state，只跑一次 node conformance/validate.mjs 和只读 monitor，不接真实派发。
> 最近修订：2026-10-20

## 解决什么问题
单个 AI 回答或单条串行 agent 会话，交付的往往是你没有验证过的结果。手册把「不满意就重问一次」升级成一套可执行流程：任务写清、并行分工、独立验证、合入门禁、成本检查与注意力路由。做法 A–Z 覆盖从单次答案竞赛到多项目控制台、再到文件状态 + 心跳编排的不同层级；共同底线是：并行只负责产出，接受与否必须由测试、独立 verifier、校验器或人工复核决定。

做法 A–Z 概览：
- A：把不满意的回答送进锦标赛（arena-skill）。
- B：并行子代理 + 测试合入闸门（clodfarm）。
- C：多 harness、多座位的统一编排与恢复（openrig）。
- D：在同一编码 agent 内用关键字升档（oh-my-openagent）。
- E：搭长时程子代理底座（deer-flow）。
- F：把多步任务固化成角色化流水线（crewAI）。
- G：把 issue → PR → 浏览器实测 → 合并做成一条自动链路（cubefarm）。
- H：worktree 隔离 + 项目记忆文件 + 提交前互评（Offrun 或手工照做）。
- I：用 cmux 把并行 agent 的等待变成可路由通知（macOS）。
- J：把「另一个 agent 在同一 commit 上验证通过才算完成」做成状态机（pullboard）。
- K：把多项目的派工、状态与评审关卡收进一个控制台（claude-console）。
- L：用一个终端 daemon + dashboard 管住并行 agent 的可见性与权限（nsq / neurosquad-cli）。
- M：主 Agent 编排 + 哑子 Agent 只生成（验证集中在主 Agent）。
- N：把商业决策交给一个可复现的专家委员会（roast-room）。
- O：把「代理在等我」变成菜单栏上可一键回答的提醒（Muster，macOS）。
- P：在 tmux 里跑一个有门禁、评审与清理的 Claude 会话团队（hivehouse）。
- Q：在进入下一阶段前先结一次账（/cost 阶段成本检查）。
- R：用并行 /loop 做持续 issue 复现与修复（magpie 工作流复刻）。
- S：用实验性环境变量尝试开启 Claude Code 内置 agent teams，先做基线对照再决定是否采用。
- T：用 git-ai/Graft 在服务端承载大量编码 agent 的并发落库、冲突解决、落库后验证与 agent 权限（先 quickstart，再 shadow 接入）。
- U：用 claude --worktree 给每个并行代理一份独立工作树副本（原文只有一句话加一个命令，先自测再决定是否采用）。
- V：把主会话变成不阻塞的调度器，任务全派后台子代理，用账本文件跟踪状态（orchestrator skill，先在分支上试）。
- W：用 Bot 团队做编排、路由与守门，真正产出交回 Claude Code/Codex（grokbot-gtm-team；先只建 3 个 Bot、先不接执行层）。
- X：用本地控制台看住并调度 Herdr 下的并行 agent，带指令排队、优先级与危机室总断路器（MyTeam；先跑演示安装器与自检）。
- Y：把代码审查按问题类别拆给 5 个独立上下文的子代理并行执行（原文只给安全与性能两类，其余需自补）。
- Z：用 Goal/Task/Agent/Heartbeat/Event 文件状态 + heartbeat 派发 + 一致性校验器编排多代理长任务（AOS-1；先只读观察，再接真实派发）。

## 适用与不适用
**适用（按处境选路径）**
| 你的处境 | 用哪条路径 |
|---|---|
| 只有一个被你拒掉的回答，想确认多策略竞争是否真的更好 | 做法 A |
| 可拆分、有测试的编码任务，想并行落地 | 做法 B |
| 同时跑 Claude Code + Codex 等多套 harness，要座位与恢复 | 做法 C |
| 只想在同一会话里给难任务升档 | 做法 D（先做对照实验） |
| 想自建长时程子代理 + 沙箱 + 记忆的底座 | 做法 E |
| 有固定的多步分工（研究 → 成文），愿意写 Python / 改 JSONC | 做法 F |
| 有 GitHub 上的低风险小仓库，想验证 issue → PR → 浏览器实测 → 合并这条链 | 做法 G |
| 想在一个已有 git 的仓库里轻量隔离多个 agent、把项目记忆落成文件、提交前互评 | 做法 H |
| macOS 上并行跑多个终端型 coding agent，想一眼看到谁在等我 | 做法 I |
| 想让「另一个 agent 在同一 commit 上验证通过才算完成」变成硬约束 | 做法 J |
| 同时照看多个项目的 agent，想在一屏里看到状态、决策与评审关卡 | 做法 K |
| 跨平台并行跑多 CLI agent / 任意长驻命令，想用 daemon + dashboard 统一看状态、回权限、脚本化取成本 | 做法 L |
| 想让子 Agent 只写、验证全部集中在主 Agent | 做法 M（先做对照实验） |
| 有一个真实、可逆的商业/经营决策，想用多个专家视角压测它 | 做法 N（先跑 --quick） |
| macOS 14+ 上并行跑多个 Claude Code / Codex / Cursor，人被卡在审批与多选 | 做法 O |
| 想在 Claude Code 里跑有门禁、评审、清理与无人值守的 tmux 会话团队 | 做法 P（先 relay，后 delegate） |
| 跑多代理 / 分阶段流程，想进下一阶段前先结一次账 | 做法 Q（先跑 2–3 个阶段） |
| 想让 Claude Code 用 /loop 持续处理最近 3 天 issue，并按先复现、先写失败测试、再修的顺序做 | 做法 R（先只跑 triage-github） |
| 使用 Claude Code，想试内置 agent teams 是否真的开启多代理并行，并先确认成本与质量 | 做法 S（先做 30 分钟基线对照） |
| 同时运行大量编码智能体，想验证服务端落库、缓存、多个 agent、一次 land 的完整链路 | 做法 T（先跑 quickstart，再 shadow 接入） |
| 有多个 Claude Code 代理要同时改同一仓库，编辑期互相覆盖、想先隔离 | 做法 U（先自测，再决定是否写进流程） |
| 用 Claude Code，想主会话不阻塞、把 2–3 个独立子任务派给后台子代理并用账本跟踪 | 做法 V（先在新分支上试一次） |
| 做 B2B/GTM 外呼或内容营销，想让「一个 Bot 一件事 + 负责人守门 + Claude Code/Codex 执行」跑起来 | 做法 W（先只建 3 个 Bot、先不接执行层） |
| 已用 Herdr 并行跑多个 agent，想把监控、排队、冻结收进一个本地控制台 | 做法 X（先跑演示安装器，再自检） |
| 中大型代码库，想用 5 个独立上下文的子代理按问题类别并行审查 | 做法 Y（先自己补齐第 3–5 类，再人工复核） |
| 有一个低风险项目、多条长任务要跨会话推进，想把派工、心跳、回收、预算和验收状态落成可校验文件，并接 Claude Code 执行 | 做法 Z（先只读 monitor，再草稿 dispatch，最后接 claude -p） |

**不适用（关键边界）**
- A：任务描述本身就含糊，100 个 agent 会一起含糊；不愿承担 token 成本不要用。
- B：编码任务没有可执行的验证命令，不设 FARM_VERIFY_CMD 等于没有质量门。
- C：原生 Windows 不支持，仅 macOS / Linux。
- D：安装脚本是 curl | bash，只在可弃用环境试。
- E：原文在本地开发前置处被截断，skills / sub-agents / scheduled tasks / memory 只有标题。
- F：不愿写代码、配环境，不要用；这是开发框架。
- G：项目只在本地、没有托管到 GitHub，不要用。
- H：Offrun 仅 Apple Silicon Mac / macOS 14+；希望评审后自动合并，不要用。
- I：仅 macOS；没有第三方性能与收益数据，不宜作为通用默认方案。
- J：原生 Windows 未测试；worktree 身份不是安全边界；没有设 gate 就没有门槛。
- K：不想维护项目注册表和每个项目 STATUS 卡，不要用。
- L：nsq 自标 0.1.0 preview；任意命令没有 hooks，只有 working / finished，永远不会出现 needs you。
- M：任务必须边写边跑测试才能写对，不要把 Build/Test/Typecheck 全部推迟到主 Agent。
- N：决策不可逆、或无法承担一次完整委员会 21 次 sub-agent 运行，不要用。
- O：不是 macOS 14+；主力是 Cursor 时只能跳转、不能代答。
- P：Claude Code 低于 2.1.291，或缺少 tmux / git / jq / perl / shasum，不要用。
- Q：流程无法分阶段，或读不到任何成本 / token 数据，不要用。
- R：原文正文被截断，/loop 完整配置、提示词原文、第三个 loop 均未给出；没有可写失败测试的仓库或 issue 无法复现，不要用。
- S：需要稳定、可写进团队规范或生产流程，不要用；该环境变量含 EXPERIMENTAL。
- T：只跑一两个 agent 的个人或小团队，引入数据库 + 对象存储收益未经验证；不能接受 0.1.0 接口变动，不要用。
- U：单代理串行、或不在 git 仓库里，不要用；想直接照抄成团队规范，不要用。
- V：不用 Claude Code，或项目目录不能写 .claude/，不要用；效果描述全部来自 README 自述。
- W：不是 B2B/GTM 外呼或内容营销场景、不是单人规模、或不用英文平台，不要用；原文只抓到 README，提示词正文需自取。
- X：没有 Herdr 不要用；它本身是监控层而非能力层；24 款工具里只有 Claude Code、Codex、OpenCode 有增强遥测。
- Y：原文只给出安全与性能两类，第 3–5 类被截断；不能自己补齐类别、不能人工判定报告真伪时不要用；小项目收益可能被噪音抵消。
- Z：个人早期项目、macOS-first；Linux 只给 systemd 等价说明，未给 unit；没有成功率、成本节省、可靠性、规模上限或对照实验数据；高风险派发必须加人工审批门禁，不能把规范要求当自动保证。

## 前置条件
- 共同前提：把任务写成独立、自包含的文件。子代理看不到你的聊天记录，任务文件是它唯一的信息源。
- A：Claude Code（需要 spawn 子 agent）+ Python 3.8 以上。
- B：Docker；Claude 订阅或 API key；一个可改的 git 仓库；一条验证命令。
- C：Node.js 22 或 24 + tmux，仅 macOS / Linux。
- D：可弃用的机器或容器；自己的小项目目录；至少一家模型订阅或 API key。
- E：git、Docker Desktop/Engine、Docker Compose v2.24+；仓库要求 Python 3.12+ / Node.js 22+。
- F：Python >= 3.10 且 < 3.14；uv；模型提供商 API key；若用网页搜索另需 Serper.dev key。
- G：Node.js 22+；git；已登录 GitHub CLI；编码 agent 订阅；Google Chrome；项目必须托管在 GitHub 上。
- H：项目在 git 下；至少一个 agent CLI 和账号，有第二个账号更好。若用 Offrun：Apple Silicon Mac、macOS 14 Sonoma 或更高。
- I：仅 macOS；会读取已有 Ghostty 配置；装 hooks 前 agent CLI binary 必须在 PATH 上。
- J：本机有 git 和 Node 22.13 或更新；在一个 git 仓库内；需要 SPEC.md、PRACTICE.md、pullboard.json。
- K：Windows 或 macOS；Claude Code 2.1.289 或更高且支持 mod；每个项目在注册表里有一项、并有 STATUS 文件。
- L：Node.js 22.13 或更新；native 部分预编译；要使用 Claude Code / Codex / OpenCode 之一需该 CLI 已登录。
- M：Claude Code，且能拉起子 Agent；能编辑子 Agent 收到的指令文本。
- N：Claude Code（Claude 套餐即可，不需要 API key）+ Node.js 20 或更新。
- O：macOS 14 或更高；安装后逐代理在 Settings → Answer prompts from Muster 开启；Codex 需先 /hooks 信任一次。
- P：tmux ≥ 3.2；git ≥ 2.31；bash；jq；perl；shasum；Claude Code ≥ 2.1.291；远程运行还需 ssh 和 rsync。
- Q：一个支持分阶段执行、且能显示成本或提供 /cost 的多代理 / 分阶段流程。
- R：Claude Code + Opus；一个 GitHub 仓库；能访问 issue 和 PR；有测试体系可先写会失败的测试；能持续运行 /loop 的会话或调度机制。
- S：已安装 Claude Code CLI，且能正常在终端里运行 claude 并完成一次普通对话；在同一个 shell 会话中操作；能接受实验特性失效、行为变化、以及可能的额外 token 消耗。
- T：Linux 或 macOS 机器，能联网拉依赖；Go 1.26；C 工具链；Meson；Ninja；构建过程会编译一份内置的 Git。若接真实仓库：需要 config.toml（[graft] 段 + 可选 [graft.storage] 段）、数据库与对象存储、给每个 agent 的 token、RPC allowlist、branch policy；存储迁移先 shadow 后 authoritative。版本 0.1.0。
- U：处在 git 仓库中；已装 Claude Code 并能正常在终端里运行 claude；确实有多个代理要同时改同一份代码。--worktree 版本或环境要求原文未给，需自测。
- V：已安装并可使用 Claude Code；环境能运行 npx；项目目录可写 .claude/（账本文件路径为 .claude/orchestrator.md）。
- W：一个 Grok Bot 账号；事先想清楚 5 项答案——你的公司、你的 ICP、你的 GTM 工具、你的第二大脑、Claude Code 和 Codex 跑在哪里；各 Bot 的连接器与权限；一个含语气、素材证据、受众画像的第二大脑与内容 skills；一个 GTM 平台。
- X：Node.js ≥ 22；已安装 Herdr，并在 PATH 上或用 BUREAU_HERDR_PATH 指定绝对路径；Windows / macOS / Linux 均可；无需 npm install；各智能体的工作目录，以及 CHEF.md / AGENTS.md / TODO.md / LESSONS.md 等 Markdown 支柱文件。
- Y：已安装 Claude Code，并在一个真实项目根目录下启动会话；项目最好中大型、你熟悉且有真实问题；你能人工复核报告；需要给子代理读取代码库的权限。
- Z：Node 18+，无需安装依赖；先读 SPEC.md 和 schemas/；state 目录至少包含 goal.json、tasks.json、agents.json、heartbeat.json、events.ndjson；每个 Task 必须有非空 output_contract 和至少一个 acceptance 检查；Task id 唯一，depends_on 必须存在且无环；Goal 必须有 budget；assignee/current_task/goal_id 引用必须能解析；attempts 不超过 max_attempts；events.ndjson 每行一个 JSON，seq 严格递增。Claude Code 插件还需要 Claude Code CLI 和 hooks。项目自述为 macOS-first 的个人项目。

## 操作步骤
先按你的处境选路径，见上表。以下保留 A–Y 的核心做法，并新增 Z。

### 做法 A：把不满意的回答送进锦标赛（arena-skill）
1. 安装三选一：粘贴 `https://github.com/Jakeschincariol/arena-skill` 并说 Install this skill, then confirm /arena works；或 `git clone` 后复制 `skills/arena` 到 `~/.claude/skills/`；或 `/plugin marketplace add` 后安装。
2. 运行前把权限切到 accept-edits（Shift+Tab）。
3. 先算成本：`python3 skills/arena/bracket.py plan --agents 100`。
4. 把任务写具体，检查 `.arena/<run>/task.md`。
5. 跑最小完整形态：`/arena --quick --seed 7 <把任务写具体>`。
6. 需要手工操作时用 bracket.py，状态在 JSON 文件里。
7. 验证工具本身：`python3 -m unittest discover -s tests -v`。
8. 改规则看 strategies.json、rubric.md、SKILL.md。

### 做法 B：并行子代理 + 测试合入闸门（clodfarm）
1. 安装：`curl -fsSL https://raw.githubusercontent.com/matank001/clodfarm/main/scripts/install.sh | sh`。
2. 或裸 Docker：`docker run -d --name clodfarm --restart unless-stopped ghcr.io/matank001/clodfarm`，再 `docker exec -it clodfarm clodfarm login`。
3. 登录 Claude 账号：clodfarm login、claude setup-token、挂载已有 ~/.claude，或 ANTHROPIC_API_KEY + FARM_DAILY_BUDGET_USD。
4. 接真实仓库并设验证闸门：`FARM_REPO_URL=<你的仓库地址>`，`FARM_VERIFY_CMD='pytest -q'`。
5. 派任务：`docker exec clodfarm clodfarm spawn 'Add CSV export' --prompt 'Add CSV export to the report page, with tests.'`；`docker exec clodfarm clodfarm status`。
6. 从手机、Claude Code 远程 MCP、定时任务接入；用 FARM_MAX_WORKERS、FARM_WEEKLY_TARGET、FARM_FIVE_HOUR_CEILING 等节流。

### 做法 C：多 harness、多座位的统一编排与恢复（openrig）
1. 检查前置：`tmux -V`；`claude --version && claude auth status`；`codex --version && codex login status`。
2. 安装并预览：`npm install -g @openrig/cli`；`rig setup --dry-run`。
3. 选 starter：first-project / first-project-claude / first-project-mixed。
4. 启动两座位：进入仓库后 `starter=first-project`，`rig specs preview '$starter' --kind rig`，`rig up '$starter' --cwd . --plan`，`rig up '$starter' --cwd .`，`rig tui --shared`。
5. 就绪检查：`rig ps --nodes --rig '$starter'`。
6. 给 owner 有界结果，并用 `rig queue list` 跟踪。

### 做法 D：在同一编码 agent 内用关键字升档（oh-my-openagent）
1. 安装：`curl -fsSL https://get.omo.dev/install.sh | bash`；`omo`。
2. 进入项目，难任务加 ultrawork 或 ulw；多智能体协作试 mass ulw。
3. 登录：`/login`；迁移先跑 `omo setup`、`omo doctor`。
4. 配置：`~/.omo/omo.jsonc` 或 `<project>/.omo/omo.jsonc`，就近优先。

### 做法 E：搭长时程子代理底座（deer-flow）
1. 最快路径：把 `Help me clone DeerFlow if needed, then bootstrap it for local development by following https://raw.githubusercontent.com/bytedance/deer-flow/main/Install.md` 原样交给编码助手。
2. 手动路径：`git clone https://github.com/bytedance/deer-flow.git`；`cd deer-flow`；`make setup`；`make doctor`。
3. 模型接入写 config.yaml 或 .env。
4. Docker 开发模式：`make docker-init`、`make docker-start`、`make docker-logs`。

### 做法 F：把多步任务固化成角色化流水线（crewAI）
1. 确认 Python >=3.10, <3.14。2. 安装 uv。3. `uv tool install crewai`；`uv tool list`。4. `crewai create crew <project_name>`。5. 编辑 agents/*.jsonc、crew.jsonc，配 .env。6. `crewai install`；`crewai run`。

### 做法 G：把 issue → PR → 浏览器实测 → 合并做成一条自动链路（cubefarm）
1. `npx cubefarm doctor`。2. `npx cubefarm login`。3. 先看 demo：`npx cubefarm --demo`。4. 正式启动：`npx cubefarm`。5. 建公司、搬入 GitHub 项目。6. 让 CEO 规划，观察与介入。7. 控制并发：session limit 先设 1–2。8. 合并门禁：先关闭 auto-merge，人工确认每一份 QA 报告和 PR 差异。

### 做法 H：worktree 隔离 + 项目记忆文件 + 提交前互评（Offrun 或手工照做）
1. 每个 agent 一个 worktree：`git worktree add ../repo-agent1 -b agent1`；`git worktree add ../repo-agent2 -b agent2`。
2. 建项目记忆纯文件：conventions.md、plan.md、dead-ends.md。
3. 让第二个 agent 在提交前读 diff 做评审，结论落到 chat 里由你判断，Nothing merges on its own。
4. 撞限额时切换登录；Build / Planner 模式按需切换。

### 做法 I：用 cmux 把并行 agent 的等待变成可路由通知（macOS）
1. `brew tap manaflow-ai/cmux`；`brew install --cask cmux`。
2. 接入 hooks：`cmux hooks setup`；`cmux hooks setup codex`。
3. 通知：OSC 9/99/777 触发 pane 蓝环、侧栏未读徽标、通知弹窗；⌘⇧U 跳最新未读，⌘I 打开通知面板。
4. 一键跑 Claude Code teammate：`cmux claude-teams`。
5. 远程：`cmux ssh user@remote`。
6. 可关闭自动恢复 agent：`terminal.autoResumeAgentSessions=false`。

### 做法 J：把「另一个 agent 在同一 commit 上验证通过才算完成」做成状态机（pullboard）
1. `npm i -g pullboard`；`pullboard tour`。2. `pullboard init`，提交它写出的文件。3. 写 SPEC.md，一行一个需求。4. 配 pullboard.json 的 gate 和 lanes。5. 手工走：`pullboard add`、`pullboard worktree`、`pullboard next`、`pullboard submit`。6. verifier 必须是另一个没参与构建的 agent，checkout 确切 commit，accept 给证据、reject 给理由。

### 做法 K：把多项目的派工、状态与评审关卡收进一个控制台（claude-console）
1. `claude plugin marketplace add SaM-runtime/claude-console`；`claude plugin install console-status@claude-console`。
2. 先看 demo：`/console demo`；回真实状态：`/console refresh`。
3. 配注册表、STATUS 卡、dispatch.json；执行者解析顺序：面板覆盖 > 注册表 Executor 列 > 全局 executor。
4. 日常动作：v 验证、s 同步、c 继续、r 回覆、d 决定、g 关卡评审、o 打开 STATUS.md、p 打开 PR。
5. 护栏：commandGuard 默认 ask；loopGuard 默认 on。

### 做法 L：用一个终端 daemon + dashboard 管住并行 agent 的可见性与权限（nsq / neurosquad-cli）
1. `npm install -g neurosquad`；`npx neurosquad`。
2. 在 git 仓库里启动 agent：`cd ~/code/my-app`；`nsq run claude 'fix the flaky checkout test' --worktree`；`nsq run codex --name reviewer`；`nsq run -- npm run dev`；`nsq`。
3. dashboard：Enter 全屏，Ctrl+] 回网格，y/a/n 回答权限，s / S 发送提示，q 关闭而 agent 继续跑。
4. 恢复：`nsq down`、`nsq up`。
5. 脚本化：`nsq ls --json`、`nsq send`、`nsq answer`、`nsq peek`、`nsq diff`、`nsq cost --since 7d`。

### 做法 M：主 Agent 编排 + 哑子 Agent 只生成（验证集中在主 Agent）
1. 划清生成与验证边界。2. 给生成型子 Agent 写入硬性禁止项：`不 Build、不 Test、不 Typecheck，早提交早返回。` 3. 子 Agent 返回后，由主 Agent 统一做验证。4. 按正交方式拆解隔离；原文未给判据，需要自己设计。

### 做法 N：把商业决策交给一个可复现的专家委员会（roast-room）
1. `git clone https://github.com/nateherkai/roast-room.git`；`cd roast-room`。2. 可选 `npm start`，打开 http://localhost:4730。3. 在文件夹里打开 claude，输入 `/roast-room <你的决策>`。4. 给全六项信息：决策、选项、数字、限制、成功长什么样、你倾向哪一边。5. 控成本：`/roast-room --quick ...`、`--seats hormozi,buffett ...`、`ask hormozi ...`。6. 校验引用：`python .claude/skills/roast-room/scripts/check_quotes.py sessions/<session>`。

### 做法 O：把「代理在等我」变成菜单栏上可一键回答的提醒（Muster，macOS）
1. `brew install --cask josefchen/tap/muster`。2. 逐个代理开启 Settings → Answer prompts from Muster。3. 快捷键：⌥ Tab 切换会话；⌥ ↩ 允许；⌥ ⌫ 拒绝；⌥ 1–9 选择；⌃ ⌥ Space 看最近三小时 token 与成本。

### 做法 P：在 tmux 里跑一个有门禁、评审与清理的 Claude 会话团队（hivehouse）
1. 检查依赖：tmux ≥3.2、git ≥2.31、jq、perl、shasum、Claude Code ≥2.1.291。2. `claude plugin marketplace add Cleveland-RD/hivehouse`；`claude plugin install hivehouse@hivehouse`。3. 默认 relay 模式，先只对一个项目运行 `/hivehouse:start <task>`。4. delegate 模式仅在只有你能写的 root 文件允许时开启，最多 7 天，且仅在 permission_mode_local=auto 时才 bypassPermissions；push、deploy 和花费留给你。

### 做法 Q：在进入下一阶段前先结一次账（/cost 阶段成本检查）
1. 前提：流程可拆成至少 2–3 个阶段，能读到成本或提供 /cost。2. 进入下一阶段前跑 `/cost`。3. 记录阶段成本、token、代理数与耗时。原文示例：5 个代理、20 秒、4.18 美元；工作 token 从 198,628 增加到 233,055。4. 对无法定价的新代理保持警惕：估不出边际成本就先不加。

### 做法 R：用并行 /loop 做持续 issue 复现与修复（magpie 工作流复刻）
1. 前提：Claude Code + Opus；选定一个 GitHub 仓库；能持续运行 /loop。2. 不要一上来跑 3 个 loop；最小试用只启动 triage-github，处理最近 3 天 issue。3. 把处理顺序写死：先复现问题；先写一个会失败的测试；再修。可把 `处理最近 3 天的 issue，先复现、先写一个会失败的测试，再修` 放进 loop 指令。4. 跑一天后检查产出的 PR 或提交，按复现数、失败测试数、修复后测试通过数、PR 合并/进入 review 数判断。5. 第一个 loop 稳定后再考虑 watch-social；原文截断处不要照搬。6. /loop 启动命令原文未给，不要编造。

### 做法 S：用实验性开关尝试开启 Claude Code 内置 agent teams
1. 前提：已安装 Claude Code CLI；在同一个 shell 会话中操作。2. `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。3. 紧接着 `claude`。4. 原文到此为止；如何指定模型、如何并行、并发数、失败回收均未给，只能自行探索。5. 最小试用 30 分钟：选非关键小仓库，构造多环节固定任务（改函数 + 补测试 + 更新文档）；先不设变量跑基线，再开新终端设变量跑同一任务；对比开关是否生效、成本、质量、稳定性。6. 判定：无效或与基线无差别 → 降级为 watch；有并行但质量或成本变差 → 不写入手册；并行存在、成本下降且质量不掉 → 只作可选实验配置并注明验证日期。

### 做法 T：用 git-ai/Graft 在服务端承载大量编码 agent 的并发落库与验证
1. 准备构建环境：Linux 或 macOS；Go 1.26；C 工具链；Meson；Ninja；构建会编译内置 Git。2. `git clone https://github.com/feder-cr/git-ai.git`；`cd git-ai`；`make build`。3. 跑官方最小端到端示例：`examples/graft/quickstart.sh`。4. 查看 CLI：`./_build/bin/graft`。5. 起自己的 server：改编 `examples/graft/config.toml`，执行 `_build/bin/gitaly serve config.toml`。6. 迁存储：加 `[graft.storage]`，先 shadow 导入，确认无误再切 authoritative；细节在 doc/graft/STORAGE.md。7. 选冲突解决方式：任意 LLM provider、确定性工具或 none；最小试用先 none。8. 开启落库后验证：用 graft-verify 测当前 tip，失败时 bisect 定位并 revert 引入问题的 change。9. 给 agent 配权限：per-agent token、RPC allowlist、branch policy。10. 可选接监控与评审：changeset 流、按组件汇报、Slack；语义审批规则在 doc/graft/REVIEW.md。11. 可选缓存层 graft-cache。12. 深入配置看 doc/graft/ 下各文档。

### 做法 U：给每个并行代理一份独立工作树副本（claude --worktree）
1. 前提：在 git 仓库里，确实有多个代理要同时改同一份代码。2. 进入项目 git 仓库目录。3. 用 `claude --worktree` 启动 Claude Code。4. 对每个要并行的代理重复第 3 步。5. 主工作树保持不变，由人掌握。6. 原文到此为止；版本要求、副本位置、合并回主线、清理方式均需自测，不要照猜。

### 做法 V：把主会话变成不阻塞的调度器，任务全派后台子代理（orchestrator skill）
1. 前提：Claude Code 可用；能运行 npx；项目可写 .claude/。2. `npx skills add olivieropinotti/orchestrator-skill`。3. 在 Claude Code 中 `/orchestrator`。4. 正常提出需求；skill 会把每条消息拆成独立任务并并行分派。5. 查看进度：`status`。6. 停止：`stop <name>`、`stop all`。7. 改变方向：`redirect <name> to ...`。8. 关闭编排：说 `stop orchestrating`。9. 查看账本 `.claude/orchestrator.md`。10. 写需求时给每个 agent 完整 brief（目标、事实、负责文件、不能做什么、完成定义）；判断类用 Opus，紧凑可核对任务用 Sonnet。11. 最小试用：新建分支、确保无未提交改动；提一个含 2–3 个独立子任务的需求并明确文件；结束前核对账本，再说 stop orchestrating。

### 做法 W：把 Bot 团队当编排层，真正产出交回 Claude Code/Codex（grokbot-gtm-team）
1. 前提：一个 Grok Bot 账号。2. 新建 Bot，命名 Chief of Staff。3. 打开仓库 setup-prompt.md，把 prompt 粘贴进这个 Bot 的对话；材料未提供正文，需自取。4. 回答 5 项问题：你的公司、你的 ICP、你的 GTM 工具、你的第二大脑、Claude Code 和 Codex 跑在哪里；它会创建其余 Bot、Content Room 和 1 个 routine。5. 连工具与权限：到 settings 连接对应工具；或手工粘贴 agents/ 下每个文件的 instructions block。6. 可选接执行层：任何 Bot 可往执行层发工作单元，格式为 `outcome / inputs / skill / limits`；持久终端会话、每个任务一个 worktree、内容类跑本机、代码类跑 dev server。7. 可选但影响效果：第二大脑 + 内容技能；GTM 平台；外呼 Bot 按 OXYGEN 及其 CLI 写，用别的平台就换名字。8. 照抄取舍：定时例程从 10 个砍到 1 个；Outbound 从 1 个 Bot 拆成 1 个 lead 路由 + 4 个专才；文案、图形、视频交 Claude Code/Codex。9. 最小试用 2 周：只建 3 个 Bot（Chief of Staff + Outbound Lead + Lead Sourcer），手工粘贴 instructions，删掉 handoff 让 Bot 自己干，只留 1 个例程；第二周再把一个真实工作单元按四要素派给 Claude Code。

### 做法 X：用本地控制台看住并调度并行 agent（MyTeam，依赖 Herdr）
1. 安装：Node.js ≥ 22，已装 Herdr；到 Releases 下载 ZIP 解压。Windows 双击 Installer MyTeam.bat；macOS / Linux 跑 `bash scripts/installer.sh`；已有 Node 可跑 `node scripts/installateur-anime.mjs`。2. 开发者方式：`git clone https://github.com/BlackAngel242/MyTeam.git`；`cd MyTeam`；Windows `powershell -ExecutionPolicy Bypass -File scripts\installer.ps1`；macOS / Linux `bash scripts/installer.sh`。3. 先看演示：`node scripts/installateur-anime.mjs --demo`。4. 安装脚本会校验 Node/Herdr、建 Herdr 2×2 网格、检测 24 种工具、安装主控技能、写指引、建快捷方式、初始化团队工具包；不会装 npm 依赖、不存 key、不静默批准。5. 启动：`node server.mjs`；打开 http://127.0.0.1:4317。6. 首次 6 步：打开 Herdr 和桌面快捷方式；确认 4 面板 2×2；主控面板读 CHEF.md 和 AGENTS.md；从控制台发第一条指令；看「任务」标签核对 TODO.md；找「危机室」按钮（Ctrl+Maj+C）。7. 排队与优先级：忙碌或配额暂停时加入队列；勾选优先可插队；等待超过 30 分钟自动升高优先级；可一键撤回。8. 危机室：Ctrl+Maj+C 冻结所有指令下发（HTTP 423）并挂起队列；POST /api/crise/arret 请求礼貌中断，发 esc 不用 kill；状态写 .bureau/crise.json。9. 群发两段式：勾选可用智能体 → 第一次点发送进入武装状态 → 第二次确认。10. 队长监听中继：在 .bureau/relais.json 开启；队员完成后向队长队列投递中性消息。11. 队长交接：在「团队」标签指定在线智能体当队长，或恢复默认；持久化在 .bureau/direction.json。12. 文件附件：给排队指令附带本地文件（上限 2 个、每个 20 MB）。13. 任务跟踪：进度条按 TODO.md 已勾选任务比值计算。14. 失败写进 LESSONS.md。15. 环境变量：BUREAU_PORT 改端口（原文名称不一致，先确认）；BUREAU_HERDR_PATH 指定 Herdr 绝对路径。16. 自检：`npm test`；`npm run check`；Ctrl+C 停服。17. 键盘：Ctrl+K 命令面板；? 打开引导与快捷键。18. 降打扰：画布暂停；prefers-reduced-motion 时静止；后台标签页每 15 秒轮询。

### 做法 Y：把代码审查按问题类别拆给 5 个独立上下文的子代理并行执行
1. 前提：Claude Code 在真实项目根目录启动；项目不宜过小。2. 自己定 5 类；原文只明确安全（密钥、缺失身份验证、不安全输入处理）和性能（慢查询、浪费的工作、庞大的包），第 3–5 类需自补，例如正确性与错误处理、测试缺口、重复与死代码。3. 粘贴提示词骨架：`并行运行 5 个子代理，每个子代理都从一个全新的上下文开始：1. 安全性：密钥、缺失的身份验证检查、不安全的输入处理 2. 性能：慢查询、浪费的工作、庞大的包 3. 正确性与错误处理：未处理的异常、边界条件、空值 4. 测试缺口：无覆盖的关键路径 5. 重复与死代码。每个子代理只报告「文件路径:行号 + 问题描述 + 严重程度 + 修复建议」，不要贴大段代码。` 4. 汇总去重：主代理按文件行号合并重复报告，按严重程度排序。5. 人工复核后再修改；可对照 linter/SAST 与测试结果。6. 与合入门禁叠加：修复必须走做法 B 的 FARM_VERIFY_CMD、做法 J 的 gate + verifier，或现有测试与评审。7. 最小试用：选 1 万行左右、你熟悉且有真实问题的仓库；同一天先用单会话做全量 review 作基线，再跑 5 个子代理，人工逐条判定。

### 做法 Z：用文件状态 + heartbeat + 校验器编排多代理长任务（AOS-1）
把这条路径当作低风险多代理长任务的候选：原文给出规范、JSON Schema、零依赖校验器、参考 server、看板和 heartbeat runner，可照做；但项目是 macOS-first 的个人早期项目，没有效果数据，高风险派发必须加人工审批门禁。
1. 准备参考实现并跑通校验（前提：Node 18+，无需安装依赖；在仓库目录执行）：
```sh
node server.mjs
node conformance/validate.mjs
node conformance/validate.mjs path/to/state
node conformance/validate.mjs --selftest
```
校验器通过退出 0，不通过退出 1，并打印 `FAIL: <file>: <message>`；stale heartbeat 等 warning 不影响退出码。
2. 按文件状态组织一个目标。先读 SPEC.md 和 schemas/；state 至少包含 goal.json、tasks.json、agents.json、heartbeat.json、events.ndjson。每个 Task 必须有非空 output_contract 和至少一个 acceptance 检查；Task id 唯一，depends_on 必须存在且无环；Goal 必须有 budget；assignee/current_task/goal_id 引用必须能解析；attempts 不超过 max_attempts；events.ndjson 每行一个 JSON，seq 严格递增。每改一次 state 就运行 `node conformance/validate.mjs path/to/state`。
3. 配置 heartbeat 派发命令。前提：命令能由 shell 启动；键名和可用变量以 heartbeat/config.json 和 runner 头注释为准：
```json
{
  "interval_s": 60,
  "dispatch_command": "claude -p \"$AOS_TASK_PROMPT\""
}
```
可以把 dispatch_command 换成任何 shell 能启动的东西：Claude CLI、脚本或 HTTP client。这是接入真实 agent runtime 的唯一位置。SPEC 第 7 节要求：会部署、发消息、花钱或删除东西的命令，必须由记录为 human.* Event 的人工批准来门禁。建议先用只打印/只生成草稿的脚本验证状态流转，再换成真实执行命令。
4. 把 server 和 heartbeat 作为长驻进程运行。quickstart 方式：`nohup node server.mjs > server.log 2>&1 &`。持久方式（macOS）原文给了 launchd plist 模板；保存为 `~/Library/LaunchAgents/dev.aos.server.plist`，改好路径后 `launchctl load ~/Library/LaunchAgents/dev.aos.server.plist`。heartbeat runner 若单独进程，用同一模板换 label 和入口；Linux 可用等价 systemd unit 并设 `Restart=always`，原文未给 unit。heartbeat 文件的 ts 是存活信号；runner 崩溃会先显示 late 再显示 dead。
5. 安装 Claude Code 实时看板插件（前提：Node 18+ 和 Claude Code CLI）：
```sh
make install
make doctor
make
```
打开 http://127.0.0.1:4318；monitor 随会话自动启动，设 `AOS_NO_AUTOSTART=1` 可禁用；新会话会拾取 hooks，已有会话需 `/reload-plugins`。项目分组、告警和 stuck/errored 规则在 monitor 的 `live/config.json` 调整。
6. 用看板/终端/MCP 做观察和复盘。monitor 只绑定 127.0.0.1、只读、无写端点。看板显示 heart -> project hubs -> agents 图、每个 agent 的当前工具、工具流、token、运行时间、模型、文件冲突、错误和告警；`aos-dash --once` 可出终端快照；MCP server 只读查询 monitor；`?debug=1` 打开屏上记录器。数据删除路径：`~/.claude/plugins/data/aos-dashboard-aos-local/live`（或你的 `AOS_LIVE_DIR`）。
7. 最小试用顺序：选一个低风险、边界清楚的项目，建立小 state（一个 Goal、少量有 output_contract 和 acceptance 的 Task、一个或少数 agent）；先只用 monitor 只读观察；再让 dispatch_command 指向只打印/生成草稿的脚本跑心跳；最后才接 `claude -p`。每次改 state 后运行 `node conformance/validate.mjs path/to/state`。

## 怎么判断变好了
**可观察的指标**
- A：最后那次与旧答案的盲评比分；冠军扛过的攻击里有多少条指向你原本没写进要求、但确实在意的缺口；你实际是否采用；实际 token 开销 vs plan --quick 的预估。
- B：合入 main 前的测试通过率；FARM_VERIFY_CMD 失败回注后子代理是否收敛；用量是否被节流在 5 小时窗口 85%、周窗口 80% 以内。
- C：手动切换终端和人工传话次数是否下降；`rig ps --nodes` 是否还有未解决的认证、信任或权限提示。
- D：同一任务三轮对照（普通 prompt / 加 ulw / 加 mass ulw），记录返工次数与人工介入次数。
- E：`make doctor` 是否能无阻断跑完；最小任务是否能跑通。
- F：output/report.md 是否真的落盘、内容能不能直接用；context 是否真的接上；{placeholder} 是否按预期注入。
- G：QA 报告真阳性率；QA 通过的 PR 中人工复核后确实可用的比例；周期时间 vs 自己动手；每个 PR 你要动手改多少。
- H：并行任务时文件互相覆盖/冲突次数；第二个同类会话是否还要重复解释约定；同行评审有效比例和误报率。
- I：从 agent 等待输入到人响应的时间；漏掉通知导致空转的时长；通知环、侧栏未读徽标是否可靠触发。
- J：每条条目是否都有 gate 绿 + verifier 的 accept/reject receipt；越界提交是否被 lane 的 owns 授权拒绝；Needs you 里出现的是不是只有你能做的决定。
- K：● 待决策、◆ 待评审条目从出现到处理完的时间；你实际盯的窗口数 vs 只看面板；关卡是否真的拦住没清空的条目。
- L：从 agent 需要你到人响应的时间；关掉 dashboard 后 agent 是否继续跑；`nsq up` 后是否按各自 session 恢复；`nsq cost` 是否读得到 token。
- M：子 Agent 的平均轮次与工具调用次数是否下降；是否还会越修越乱；主 Agent 一次通过率、交接处返工是否变差。
- N：反方论点命中数；是否改变你的倾向；引用可核验率；成本对账；到期回看 verdict.md。
- O：从代理开始等待到人察觉的时间；从察觉到回答完成的时间；是否出现重复回答或冲突；关掉后设置文件是否精确还原。
- P：安装检查通过；团队是否按计划产出 diff/提交；gate 是否把每一步运行到日志并验证通过；cleanup 是否只移除 manifest 记录的内容。
- Q：进入下一阶段前是否真的能看到该阶段成本；实际总成本 vs 你设的预算；token 增长是否与任务复杂度匹配；新增代理前是否能估出边际成本。
- R：最近 3 天 issue 中有多少被真正复现；有多少修复在改代码前存在会失败的测试；这些测试在修复后是否通过；产出的 PR 有多少被合并或至少进入人工 review；人工返工比例；是否产生误报、重复处理或无关改动；与人工处理同一批 issue 的时间、返工率对比。
- S：开关是否真的生效，能否观察到多个 agent 被创建/并行工作；单位任务总开销是否下降；Opus 侧上下文占用是否明显减少；测试通过率、diff 规模、返工次数是否不劣于基线；是否报错、中途丢失上下文、重复劳动或互相覆盖改动。
- T：单次 land 的端到端耗时；同一分支上并发 land 的成功率与需要人工介入的冲突比例；自动冲突解决被接受且后续没被 revert 的比例；graft-verify 捕获的回归数量、bisect 定位是否准确、自动 revert 是否误伤；权限控制是否真的挡住越权操作；增加服务节点后横向扩展是否如预期。README 未给数值目标，需自建基线。
- U：并行期间是否出现互相覆盖、需要人工解冲突的次数；把各自结果合并回主线所花的时间（对照组：不用 --worktree，两个代理直接在同一工作树里改同样的东西）；主工作树是否被代理污染、副本能否一键丢弃回退；副本目录是否按预期自动创建和清理。
- V：主会话被阻塞的时间——编排前后对比；同一批任务的墙上时间——与串行做一遍相比；返工率——产出需要人工纠正的比例，尤其是文件冲突导致的返工；状态可信度——status 报告的 agent 数量/状态与实际执行是否一致、账本在长会话 compaction 后是否仍然可用；成本——多 agent 并行带来的 token 消耗增量。
- W：你每天亲自处理 GTM/内容事务的时间（对比使用前两周）；rollup 里「需要你自己动手改」的条目占比；派给 Claude Code 的工作单元一次通过 review 的比例，以及失败案例里有多少能定位到 outcome / inputs / skill / limits 缺了哪一项；专才 Bot 与负责人 Bot 之间的往返轮次；反向信号——你在给 Bot 打补丁式加规则，或某个 Bot 的产出你从不采用。
- X：从 agent 需要你到人响应的时间；因并发抢同一工位导致的手工干预次数；队列里自动升为高优先级后是否仍出现长时间等待或饥饿；危机室触发到全部指令真的冻结（HTTP 423）所需的操作次数，以及期间是否发生越权发送；TODO.md 勾选比例与实际完成是否对得上；`npm test` 与 `npm run check` 是否稳定通过；后台标签页轮询与通知是否按预期工作、是否反而更打扰。
- Y：有效问题数——人工确认「真实存在且值得修」的条数，绝对值和每千行代码密度；重复率——同一 文件:行号 被多个子代理重复报出的比例，高于约三成说明分工切得不好（建议阈值，不是数据）；增量发现——并行方案比单代理方案、比现有 linter/SAST 多找出的有效问题条数，这是核心指标，接近 0 则不值得用；噪音比——误报数 / 总报告数；成本——整个流程的耗时与 token 消耗，对比单代理方案。
- Z：合规性——validator 连续退出 0；`--selftest` 能抓住负例；heartbeat 在试用期不出现 late/dead；无依赖环、无引用解析失败、attempts 不超 max_attempts。运行质量——看板中 errored agent 数、file conflict 数、stuck 数、人工干预次数、每任务 token 与 run time、重试次数；回放抽查是否有未审批的高风险动作。结果质量——每个 Task 的 acceptance 通过率、返工率、从创建到验收的周期时间；与同类的单 Claude Code 会话/人工基线对比。原文没有给目标阈值，需在试用前自定并记录。若只看板不改善验收通过率或降低人工干预，就退回只读监控或 study。

**最小试用**
- A：挑 1–2 个真实、不满意的任务，跑 `/arena --quick --seed 7` 并用 baseline 传入旧答案。
- B：单机 + 小仓库 + 一条已有测试命令，先验证 1–2 个编码任务。
- C：`rig setup --dry-run` + 两座位 starter，跑一个有界的实现 + 独立复核任务。
- D：半天内在可弃用机器上跑完三轮对照。
- E：先 `make setup` → `make doctor` → `make docker-start`。
- F：把手头一个多步资料整理 → 成文改写成 researcher + reporting_analyst 两个角色，看 output/report.md 能不能直接用。
- G：doctor → demo → 低风险小仓库，session limit 设 1–2，先关闭 auto-merge，跑 3–5 个真实 issue。
- H：半天到一天，一个仓库，只试隔离、记忆、提交前互评三件事。
- I：macOS 上装 cmux，跑 hooks setup，开 2–3 个终端型 agent，试通知与 ⌘⇧U、⌘I。
- J：先 `pullboard tour`；再选真实小仓库，写 1–3 行 approved SPEC.md，设真实 gate，配 1 条 builder lane + 1 条 review lane，用 2–3 个小条目走完整流程。
- K：装插件 → `/console demo` → `/console refresh` → 挑一两个可回滚项目建注册表和 STATUS 卡 → 走一遍派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审。
- L：装 neurosquad → 在 git 仓库跑 `nsq run claude ... --worktree` 和 `nsq run codex --name reviewer` → 打开 dashboard 试权限回答 → `nsq up` 恢复 → `nsq ls/cost/diff/peek`。
- M：挑一个中等规模编码任务，保留平时做法作对照，正交切成 2–3 块，子 Agent 指令写入禁止项，主 Agent 统一验证。
- N：挑一个真实、可逆、一周内能见效的决策，先跑 `/roast-room --quick`，再跑 check_quotes.py，到成功截止日回看 verdict.md。
- O：macOS 14+ 装 Muster，只对 Claude Code 开代答；开两个并行会话，制造权限请求和多选题，练 ⌥↓、⌥↩、⌥1–9。
- P：非关键项目、本地环境安装；先保持 relay，只对一个项目运行 `/hivehouse:start <task>`。
- Q：下一次多代理任务拆成 2–3 个阶段，每阶段开始前跑一次 `/cost`，记录成本、token、转移次数和耗时。
- R：只选一个自己熟悉的 GitHub 仓库，不要一上来跑 3 个 loop；只启动 triage-github 这一个 loop，处理最近 3 天 issue；强制先复现、写一个会失败的测试、再修；跑一天后检查产出的 PR 或提交。
- S：选一个非关键小仓库，构造一个包含「多环节」的固定任务；先不设变量跑基线；再开新终端执行 `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 后 `claude`，跑同一任务；30 分钟内完成对照。
- T：不改动现有仓库，先构建，然后跑 `examples/graft/quickstart.sh`；用 `./_build/bin/graft` 熟悉 land、changeset、verify 子命令；拿一个非关键真实仓库按 `[graft.storage]` 的 shadow 模式做只读导入，核对一致；确认无误后再切 authoritative；只让少量 agent 走这套流程，暂时不开自动冲突解决。
- U：挑一个不关键的 git 仓库，开两个代理，都用 `claude --worktree` 启动，各派一个改动任务——先试改不同文件，再试改同一文件的不同区域，全程人工记录；对照组是不用 --worktree，两个代理直接在同一工作树里改同样的东西。
- V：在一个 git 仓库上新建分支、确保没有未提交改动；执行 `npx skills add olivieropinotti/orchestrator-skill`，在 Claude Code 中输入 `/orchestrator`；提一个含 2–3 个彼此独立子任务的需求，并明确各自负责的文件；观察主会话是否仍可继续对话、子任务是否真的并行、status 的条目是否与实际 agent 一致、stop/redirect 是否生效；结束前查看 `.claude/orchestrator.md` 核对账本。
- W：先不接执行层，只建 3 个 Bot（Chief of Staff + Outbound Lead + Lead Sourcer），用 agents/ 里对应文件的 instructions block 手工粘贴，只保留那 1 个例程，跑两周；第二周再把一个真实工作单元按 outcome / inputs / skill / limits 四要素派给 Claude Code。
- X：先跑 `node scripts/installateur-anime.mjs --demo` 看安装器会不会改动机器；再用 Releases ZIP 装一遍并确认 SmartScreen 解除锁定流程；起 `node server.mjs`，在 Herdr 里按 2×2 开四个面板，用控制台给队长发一条指令、制造一次目标忙碌看是否自动入队、按一次 Ctrl+Maj+C 看是否真的冻结下发（HTTP 423）；用 `npm test` 与 `npm run check` 自检；结束时 Ctrl+C 停服。
- Y：选一个 1 万行左右、你熟悉的有真实问题的仓库。自己定 5 类（安全、性能、正确性/错误处理、测试缺口、重复代码），按提示词结构跑一次，要求输出 文件:行号 + 严重度 + 建议，然后人工逐条判定。对照基线：同一个仓库、同一天，用单个 Claude Code 会话一次性做全量 review，以及团队已有的 linter/SAST 结果。
- Z：选一个低风险、边界清楚的项目，建立一个小 state（一个 Goal、少量有 output_contract 和 acceptance 的 Task、一个或少数 agent）；先只用 monitor 只读观察；再让 dispatch_command 指向只打印/生成草稿的脚本跑心跳；最后才接 `claude -p`。每次改 state 后运行 `node conformance/validate.mjs path/to/state`。

**试多久、什么时候升级**
- A：若 --quick 在 3 个以上任务上稳定优于 baseline，且攻击确实命中你没考虑到的地方，再升到 --agents 32。
- B/C/D/E：没有量化效果数据，先一到两个任务、可弃用环境为限。
- F：连跑 2–3 次同类任务；若每次都要大改 output/report.md，先退回单 agent 手改。
- G：以 3–5 个真实 issue 为最小样本；若 QA 真阳性率接近零，或人工介入次数没有下降，考虑退回不用。
- H：只在一个 repo、一两个任务上观察两周再决定是否推广。
- I：先在 1–2 个 agent、半天到一天内试用；若通知可靠、漏掉等待的时间下降，再扩大 agent 数。
- J：先在 2–3 个小条目上跑完整闭环，再决定是否固化成日常流程。
- K：先在一两个可回滚项目上跑一到两周。
- L：先在一个 git 仓库、一两个真实任务上试半天到一天。
- M：先在 2–3 个中等任务上做对照；只有子 Agent 轮次下降且主 Agent 侧返工没有明显增加，才算成立。
- N：先在一个可逆决策上跑一次 --quick，看反方论点命中数是否大于 0、引用是否全过校验、结论是否只是附和你的倾向。
- O：先在 1–2 个并行会话、半天到一天内试用。
- P：先在非关键项目、本地环境用 relay 模式跑一个任务；确认无误后再考虑 overnight 或 delegate。
- Q：先在一两次任务上试 2–3 个阶段；只有当事前看见成本真的让你避免了一次异常增长或一次不必要的代理扩容时，才固定成流程里的固定步骤。
- R：跑一天后检查产出的 PR 或提交；如果拿不到可合并或可 review 的产出，或大量 PR 无法通过测试，说明该流程在当前仓库还不适合直接采用。第一个 loop 稳定后再加第二个；第三个 loop 原文缺失，不升级。
- S：只做一次 30 分钟对照不构成采用依据。若开关无效或行为与基线无差别，降级为 watch；若有并行但质量或成本变差，不写入手册或只作谨慎注记；只有并行确实存在、成本下降且质量不掉，才考虑作为可选实验配置，并注明实验性与验证日期。
- T：先以「临时目录 quickstart 跑通 + 非关键仓库 shadow 只读导入 + 少量 agent 且 resolver none」为最小范围；确认单次 land 耗时、并发 land 成功率、人工介入冲突比例、graft-verify 误伤率可接受，再扩大到更多 agent；没有量化对比前不扩大到关键仓库。
- U：先在一个不关键仓库、两个代理、一两个任务上试半天到一天。如果编辑期冲突减少，但合并耗时和人工成本持平甚至更高，那只是把问题挪了个位置；只有在整体耗时或返工明显下降时，才值得写进手册。
- V：先在 1 个仓库、2–3 个独立子任务上试一次。如果返工率或成本明显上升、或 status 与账本不可信，则不宜升级为常规做法；只有主会话阻塞时间下降、墙上时间不劣于串行、且返工没有变多，才可能重复使用。
- W：建议 2 周两阶段——第一周只建 3 个 Bot 且不接执行层、只留 1 个例程，先测出「编排层本身值不值」；第二周再接一个真实工作单元。
- X：先半天到一天，跑通安装、一轮指令队列和一次危机室冻结即可判断「它对你的可见性有没有帮助」。若 `npm test` / `npm run check` 通不过、或界面行为与描述不符，降级为 watch，不要接进日常调度。
- Y：先跑一次，不构成采用依据。只有当「增量有效发现明显 > 0」且「噪音比与重复率在人工可承受范围内」时，才把这条流程固化进手册；否则降级为「值得知道的一种提示词写法」。
- Z：先以「小 state + 只读 monitor + 草稿 dispatch」跑一到两周；validator 连续 0、heartbeat 不 late/dead、看板能降低人工干预或提高 acceptance 通过率，再扩大到真实派发；没有达到就退回只读监控。高风险派发始终保留 human.* Event 人工审批。

## 常见坑
- A：任务含糊，100 个 agent 会一起含糊；任务文件是唯一信息源；judge 也是 Claude，评分有偏差。
- B：不设 FARM_VERIFY_CMD 等于没有质量门；多机共用 farm 需要真实 DynamoDB 表 + 共享仓库。
- C：启动会写入 provider hooks 和 workspace trust 设置，先备份；原生 Windows 不支持。
- D：安装脚本是 curl | bash，只在可弃用环境试；mass ulw 的图如何定义、如何限制并行度、如何统计花费，材料里没有。
- E：抓到的原文在 Option 2 处被截断，skills / sub-agents / scheduled tasks / memory 只有标题。
- F：涉密场景先自己查文档再跑；这是开发框架，不是装完即用的工具。
- G：项目必须已托管在 GitHub 上；auto-merge 只有 README 描述，先关掉它。
- H：Offrun 仅 Apple Silicon Mac；同行评审发现落到 chat 里由你判断，不要自动合并。
- I：仅支持 macOS；装 hooks 前 agent CLI 必须在 PATH 上；本机 local-tmux 活不过 logout、重启、关机或断电。
- J：项目很小，部分功能仍是 planned；worktree 身份不是安全边界；没有设 gate 就没有 submit/push 前的门槛。
- K：强依赖环境与版本；状态和关卡建立在你自建的项目注册表和 STATUS 卡上；设置只影响下一次派工。
- L：0.1.0 preview；`nsq run --` 的任意命令没有 hooks，永远不会出现 needs you；手机端链接携带 pairing token，当密码对待。
- M：原文在「2. 任务拆解：正交隔离」处被截断；只有作者主张、没有数据；不要用做法 M 替代合入门禁。
- N：顾问是模拟人格，不是本人；check_quotes.py 只验证引文是否在 brain 里且有来源，不验证来源是否被正确解释。
- O：仅 macOS 14+；只覆盖 Claude Code / Codex / Cursor；Cursor 只能跳转、不能代答。
- P：工作文件夹绝不能是项目本身；默认 relay 模式每次 start / wake / answer 都等你；delegate 模式涉及 bypassPermissions 和复制 secret 文件到远程的风险。
- Q：推文级材料；只有一组单次观测数据，没有基线、阈值或对照；阶段检查依赖你能读到阶段成本。
- R：正文被截断，/loop 的完整配置、提示词原文、第三个 loop 均未给出；watch-social 只写到「盯 X /」，不要照不完整片段猜。只有作者主张「跑了一天，效果很好」和一个 PR 链接；PR 6796 只能说明有产出。先只跑一个 triage-github loop，不要一上来并行 3 个。
- S：原文只有一行环境变量加启动命令，没有任何效果数据、案例、截图、文档链接或 Anthropic 官方出处；互动量很低（61 赞、3 转发、6 回复）；模型名 Opus 5.5 / Haiku 5.5 与常见版本号命名习惯不符；环境变量名含 EXPERIMENTAL，可能随时改名或移除。不要把它当团队规范或生产流程的稳定依赖。
- T：0.1.0，接口在 1.0 前可能变动；构建要编译内置 Git，依赖较重；已知缺口写在 LIMITATIONS.md；README 未给出与传统 Git 或其他方案的对比数字；banner 图注里的「50 agents on one branch retry and fail with push, rebase, retry」「100 against 200 changes landed」是配图说明，不是可核验的基准结果；只跑一两个 agent 的个人或小团队收益未经验证；存储迁移必须影子模式先导入、确认无误再切 authoritative。
- U：原文只有一句话加一个命令，没有截图、命令输出、版本号；作者称方法来自 Anthropic 的分享但没有给出出处；「让三个代理可以同时编辑同一个代码库而不会冲突」是作者主张；原文未涉及合并成本，存在把冲突从「编辑时」推迟到「合并时」的可能；不要拿它当安全边界，也不要补写原文没给的版本要求、副本位置、合并与清理方式。
- V：本次材料只有 README，不是完整文档；never blocks、3-5 agents work、survives context compaction、follow-up 发给同一主题 agent 以保留上下文，全部是作者自述；必须使用 Claude Code，且项目需可写 .claude/ 目录；并发上限、token 成本、多个 agent 同时改同一文件的冲突处理、失败回收流程，原文均未交代。
- W：本次材料只抓到 README，setup-prompt.md 与 agents/*.md 的实际提示词正文没有出现在输入里，第 3 步和第 5 步的核心内容无法照抄；README 依赖 OXYGEN 及其 CLI，且带 OXYGEN 推广链接、作者是 OXYGEN 联合创始人；适用条件偏具体；没有任何成本与安全/权限边界说明；不要一上来就建 13 个 Bot。
- X：没有 Herdr 就跑不起来；24 款工具里只有 Claude Code、Codex、OpenCode 有增强遥测；环境变量名在文档里不一致（BUREAU_PORT 与 BBUREAU_PORT），默认端口 4317，照抄前先确认；README 中出现的模型名本次无法核对；「100% 本地、零 npm 依赖、无出网、不存 key」「事实真实、不模拟智能体、不发明百分比」都是设计声明，没有第三方审计或测试报告；危机室冻结的是指令下发并请求礼貌中断，不替代测试、评审与合入门禁。
- Y：原文在列举第 3 类问题时被采集截断，5 类问题只知 2 类（安全、性能）；原文完全没有提汇总、去重、误报处理，也没有提 token 成本与耗时；子代理各自独立上下文，天然存在重复报告同一处问题的风险；「新上下文能让审查更干净、5 个并行比 1 个更好」只是作者主张；不要把报告直接当修复清单，先人工复核，再走测试与合入门禁。
- Z：个人早期项目、macOS-first；Linux 只说可用 systemd 等价，未给 unit；截图展示「三个项目、19 个 agent」是合成演示数据，明确没有真实项目或路径；stars 33 只是输入指标，不是效果数据；原文没有成功率、成本节省、可靠性、规模上限或对照实验。validator 只能结构性检查 append-only（seq 单调、行可解析），不能检查历史写入，追加写入靠 writer 自律；heartbeat runner 的具体入口 README 未列出，需查仓库。高风险命令的人工审批是规范要求，不是自动保证。不要只看板不改善验收通过率或降低人工干预就继续扩大。

## 证据与来源
- A 依据调研《Jakeschincariol/arena-skill》。可核对：成本表、bracket.py plan 输出、赛程表、rubric 权重、默认并发 10、单元测试、117 stars。质量提升属作者主张。
- B 依据调研《matank001/clodfarm》。可核对：安装脚本、Docker 启动、四种登录方式、环境变量、多机部署。未给效果量化数据。
- C 依据调研《mvschwarz/openrig》。可核对：Node.js 22/24 与 tmux 要求、仅 macOS/Linux、npm 包名、三套 starter、rig 命令。原文明确早期版本且无量化效果数据。
- D 依据调研《code-yeongyu/oh-my-openagent》。可核对：安装脚本、包名、配置路径、关键字、omo 子命令、许可证。效果描述来自 README 自述或用户好评，没有基准。
- E 依据调研《bytedance/deer-flow》。可核对：make 命令、模型配置示例、部署规格、MIT、Python/Node 版本。原文在本地开发前置处被截断。
- F 依据调研《crewAIInc/crewAI》。可核对：MIT、Python 版本、uv 安装、crew 结构、agents/*.jsonc、crew.jsonc、skills 命令。多角色提升产出质量属作者主张。
- G 依据调研《leonvanzyl/cubefarm》。可核对：命令、前提、五步上手、界面键、session limit、QA 浏览器实测、合并门禁。auto-merge 安全与 QA 把关属作者主张，无成功率/误合并率/成本数字，唯一量化指标 53 stars。
- H 依据调研《Show HN: Offrun》。可核对：安装流程、每 agent 一个 worktree、三个记忆文件、同行评审示例、限额切换提示、数据边界表。50 runs、41→50 等属作者主张；本手册只采用三条可迁移流程。
- I 依据调研《manaflow-ai/cmux》。可核对：仅 macOS、Ghostty 渲染、安装、hooks、OSC 通知、快捷键、claude-teams、ssh、配置项、会话恢复边界。通知改善工作流属作者主张，无第三方性能与收益数据。
- J 依据调研《pullboard-dev/pullboard》。可核对：CLI 命令、SPEC.md、pullboard.json gate 表、tour、状态机、PRACTICE.md、SQLite 看板、Node 22.13+、MIT、41 stars。方法论更好与返工可复现属作者主张；worktree 身份不是安全边界，CI 仅 Linux/macOS。
- K 依据调研《SaM-runtime/claude-console》。可核对：安装命令、demo/refresh、插件配置与默认值、注册表 + STATUS 卡、dispatch.json、执行者解析顺序、动作键、guard 默认值、Git/PR/CI 探测。一个控制台承担跨项目监督属作者主张；仓库 53 stars、0.15.x、UI 繁体中文。
- L 依据调研《glmn-ai/neurosquad-cli》。可核对：安装、nsq run 命令、分支名、dashboard 按键、down/up、ls/send/answer/peek/diff/cost、provider 配置、数据目录、doctor。README 自标 0.1.0 preview，无改善幅度量化指标。
- M 依据调研《@yanhua1010》。可核对：两条规则（子 Agent 不 Build/Test/Typecheck、早提交早返回；任务正交隔离）、架构名称、原样指令文本。剥离验证防止越修越乱属作者主张，无测量方式；原文在正交隔离处截断。
- N 依据调研《nateherkai/roast-room》。可核对：克隆命令、npm start 与端口、/roast-room、--quick/--seats/ask、六项输入、目录结构、check_quotes.py、报告路径、成本量级、114 stars。顾问由公开作品构建、引用有出处是设计声明；辩论提升决策质量无实测。
- O 依据调研《josefchen/muster》。可核对：macOS 14+、brew 安装、逐代理开启、Claude Code 支持类型、Codex /hooks、Cursor 只跳转、快捷键、URL scheme、pricing.json、构建/测试脚本、备份路径、只读会话、资源占用、MIT、73 stars。改善等待时间属作者主张。
- P 依据调研《Cleveland-RD/hivehouse》。可核对：安装命令、依赖版本、claude plugin list、userConfig、hh-hub init/start、技能表、docs-health-check、hh-slot status、delegate 规则、清理范围、测试脚本、30 stars。bin/ 机械动作经过测试与 docs-health-check 是 Unverified here；无任务完成率/成本/质量数据。
- Q 依据调研《@Klonzu》。可核对：别再添加无法定价的代理、下一阶段前检查成本、/cost、演示面板数据（5 个代理、20 秒、4.18 美元；19 次转移；token 198,628→233,055）。数据来自一次演示面板，无基线/阈值/对照。
- R 依据调研《@hwangxin》。可核对：复刻 magpie 并用在 Readest 跑一天；Claude Code + Opus 并行跑 3 个 /loop；triage-github 处理最近 3 天 issue、先复现、先写失败测试再修；watch-social 截断；PR 6796；60 likes、8 reposts、6 replies。效果很好属作者主张，PR 只能说明有产出；/loop 完整配置与第三个 loop 未给。
- S 依据调研《@mirku21》。可核对：唯一命令 `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 和 `claude`；61 赞、3 转发、6 回复；无效果数据、案例、截图、文档链接或 Anthropic 官方出处。Opus 级架构与节省上下文属作者主张；模型名无法确认；变量含 EXPERIMENTAL。
- T 依据调研《feder-cr/git-ai》。可核对：MIT；fork 自 Gitaly；版本 0.1.0；Go 1.26、C 工具链、Meson、Ninja；examples/graft/quickstart.sh 与 config.toml；文档列表。传统 Git 对 agent 是瓶颈无测量；测试覆盖未给数量；banner 图注不是基准；接口可能变、LIMITATIONS.md 有已知缺口、构建重、无对比数字。
- U 依据调研《@thedelost》。可核对：唯一操作是 `claude --worktree`，以及 101 赞/15 转发/8 回复。让三个代理同时编辑不冲突属作者主张，三个代理是举例不是实测；作者称来自 Anthropic 分享但未给出处；命令当前版本是否存在未核实。只列为待自测候选。
- V 依据调研《olivieropinotti/orchestrator-skill》。可核对：安装命令、/orchestrator、status/stop/redirect、关闭方式、账本路径、模型选择规则、MIT、约 38 stars。never blocks、3-5 agents、survives compaction 等属作者主张，无 benchmark/对比/案例/失败模式/成本数据。
- W 依据调研《timscheuerai/grokbot-gtm-team》。可核对：13 Bot + 1 群聊 + 1 例程角色表、四步导入、5 个问题、agents/ 下 instructions block、guides 文件、交接四要素、每任务 1 worktree、内容本机/代码 dev server、MIT、30 stars。让 Bot 带队更有效、文案图形视频质量不够、晨报是 slop、routine 从 10 减到 1 更好属作者主张；只抓到 README，提示词正文需自取；依赖 OXYGEN 且有推广链接。
- X 依据调研《BlackAngel242/MyTeam》。可核对：安装命令与参数、演示模式、默认端口 4317、环境变量、快捷键、HTTP 423 冻结、POST /api/crise/arret、.bureau/ 持久化文件、24 款工具与三款增强遥测、npm test/check、MIT、32 stars。100% 本地、零 npm 依赖、无出网、不存 key、事实真实等属作者主张；材料在作者主张段被截断，模型名无法核对；环境变量名不一致；界面行为只有描述。
- Y 依据调研《@RoundtableSpace》。可核对：5 个子代理、每个全新上下文、按问题类别分工；安全与性能两类检查项；183 赞、10 转发、34 回复。新上下文更干净、5 个并行更好属作者主张，无案例/前后对比；原文在第 3 类处截断；汇总、去重、误报、成本、耗时未给；第 3–5 类、输出格式、汇总去重与人工复核是补充做法。
- Z 依据调研《tomtomsatnav/agent-orchestration-standard》。可核对：SPEC、JSON Schema、零依赖一致性校验器、参考 server、heartbeat runner、Web/Terminal UI、MCP、notifier、make 目标、配置样例、launchd 样例、安全模型；命令与配置可照做。数据/案例：截图展示「三个项目、19 个 agent」的合成演示数据，明确没有真实项目或路径；33 stars 是输入指标；没有成功率、成本节省、可靠性、规模上限或对照实验。作者主张：隐私优先、布局无重叠、粒子流自适应、主题对比度等，部分由自动化测试覆盖但未独立验证。项目状态为个人项目、macOS-first；Linux 仅说可用 systemd 等价，未给 unit。validator 只能结构性检查 append-only，不能检查历史写入，追加写入靠 writer 自律；heartbeat runner 具体入口需查仓库。高风险命令人工审批是规范要求，不是自动保证。

## 依据的调研

- [Jakeschincariol/arena-skill](../research/radar/2026-10-01/13-jakeschincariol-arena-skill.md)：值得一试，先按 README 的安装方式之一装进 Claude Code，用 `/arena --quick`（16 个 agent）对你手头一两道确实不满意的真实任务跑一遍，并把被拒的旧答案作为 baseline 做盲评对比，确认输出确实更好再考虑加大 agent 数；步骤、参数、成本表和自测方式都写得可直接照做，但“更强答案”目前只是作者主张且 token 开销很大。
- [matank001/clodfarm](../research/radar/2026-10-01/14-matank001-clodfarm.md)：值得一试，可以小范围试：clodfarm 给出了一套可照做的 Claude Code 多子代理编排方案——子代理各占一个 git worktree/分支、测试通过才合入 main、按账户真实 5 小时与周用量节流并留 20% 余量；先用单机 + 小仓库 + 已有测试命令验证 1–2 个编码任务再决定是否铺开。
- [mvschwarz/openrig](../research/radar/2026-10-02/67-mvschwarz-openrig.md)：值得一试，建议在单独的实验仓库里小范围试：按 README 的引导路径安装 OpenRig，用两座位 starter（复用已有 Claude Code 或 Codex 账号）跑一个「实现 + 独立复核」的有界任务，看是否真的减少了手动切换终端和人工传话的成本。理由是原文给出了从安装、启动、就绪检查、下发任务到权限与回滚的完整可复制命令，具备照做的条件；但工具仍处早期版本、会改写 provider 信任与 hook 配置、不支持 Windows，且没有任何量化效果数据，因此不宜直接写成手册主推做法。
- [code-yeongyu/oh-my-openagent](../research/radar/2026-10-01/508-code-yeongyu-oh-my-openagent.md)：值得一试，建议在一个可弃用的环境里小范围试用 OmO：按 README 的一行命令安装，用同一个真实小任务分别跑普通 prompt、加 `ulw`、加 `mass ulw`，对比返工次数与人工介入次数。理由是可照做的安装与关键字工作流已经给出（`omo`、`ulw`、`mass ulw`、`omo setup/doctor`、两份 `omo.jsonc` 配置），但全部效果说明都只有作者主张和用户好评，没有可核对的指标。
- [bytedance/deer-flow](../research/radar/2026-10-01/544-bytedance-deer-flow.md)：值得一试，可以按官方 Quick Start 在本地或小团队环境跑通 DeerFlow 2.0（clone → make setup → make doctor → make docker-start），把它作为长时程子代理＋沙箱＋记忆的执行底座试点；理由是原文给出了可直接复制的安装、模型接入、部署选型和安全配置步骤，但 skills、sub-agents、scheduled tasks 等核心能力的用法在抓到的原文里只剩目录标题，需进一步查阅仓库文档才能照做。
- [crewAIInc/crewAI](../research/radar/2026-10-02/549-crewaiinc-crewai.md)：值得一试，建议小范围试：照着 README 的 "uv 安装 → crewai create crew → 改 agents/*.jsonc 与 crew.jsonc → crewai install/run" 链路，先把手头一个"多步资料整理→成文"的工作改成 researcher + reporting_analyst 两个角色的 Crew，并把产物落盘到 output/ 文件；因为原文给出了完整可复制的命令、目录结构和配置示例，可照做，但它本质是需要写代码、配环境的开发框架，效果只有作者主张、没有对比数据，先试一步再决定是否推广。
- [leonvanzyl/cubefarm](../research/radar/2026-10-02/725-leonvanzyl-cubefarm.md)：值得一试，用 npx cubefarm 在低风险仓库上小范围试跑 issue→PR→QA→合并 这条自动链路，重点验证 QA 环节的真实拦截能力；因为它把多 agent 分工、浏览器实测和 auto-merge 门禁写成了可执行流程，但只有 README 级证据（53 stars、无基准与案例数据），不足以直接采用。
- [Show HN: Offrun – manage every coding agent from one workspace](../research/radar/2026-10-04/1066-show-hn-offrun-manage-every-coding-agent-from-one-.md)：值得一试，先在单个有 git 的仓库上小范围试三条可迁移流程——每个 agent 一个 worktree、项目记忆落成 conventions.md/plan.md/dead-ends.md、第二个 agent 在提交前读 diff 做评审——再决定是否长期用 Offrun 本身；理由是这几条流程具体、可照做且不依赖工具存活，而 Offrun 自身的收益（限额自动切换、全 Mac 通知、免费无限）目前只有厂�自述，且限定 Apple Silicon Mac。
- [manaflow-ai/cmux](../research/radar/2026-10-08/1856-manaflow-ai-cmux.md)：值得一试，macOS 上并行跑多个终端型 coding agent 的人，可以照 README 的安装与 hooks 步骤小范围试一套「通知驱动的注意力路由」工作流：装 cmux、跑 `cmux hooks setup`、用 workspace 分屏跑 agent、靠通知环和 ⌘⇧U 跳转；理由是多 agent 并行时「哪个在等我」是可复制的痛点，而这份 README 给出了具体命令与配置键，但它只支持 macOS、性能与收益均无第三方数据，因此不宜作为通用默认方案直接采用。
- [pullboard-dev/pullboard](../research/radar/2026-10-08/2038-pullboard-dev-pullboard.md)：值得一试，建议在小范围试：先用 `pullboard tour` 看一遍闭环，再在一个真实小仓库里把「SPEC 行 → gate → 另一个智能体在同一 commit 上验证」跑通，然后决定是否固化成日常流程；理由是它把「第二个智能体验证通过才算完成」做成了可强制执行的状态机，并给出了可直接复制的命令与配置（MIT、本地运行、不调用模型），但项目很小（41 stars）、Windows 未测试、部分功能仍在 planned，适合先试验证收益。
- [SaM-runtime/claude-console](../research/radar/2026-10-09/2187-sam-runtime-claude-console.md)：值得一试，建议小范围试：先按 README 的两条命令装好插件、用 /console demo 跑通面板，再挑一两个可回滚的项目接入 registry + STATUS 卡，验证「派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审」这条闭环是否真的减少了人工盯盘；理由是它给出了可直接照做的安装命令、配置键表、dispatch.json 结构、动作快捷键和状态卡格式，但仓库仅 53 stars、版本 0.15.x、强依赖特定 Claude Code 版本与自建的注册表/状态卡约定，成熟度还不够直接全量采用。
- [glmn-ai/neurosquad-cli](../research/radar/2026-10-10/2422-glmn-ai-neurosquad-cli.md)：值得一试，先在单个 git 仓库里用 npx neurosquad 跑一两个带 --worktree 的后台 agent，实测“关掉窗口后继续跑 + 状态/成本可观测 + 权限内联回答”是否成立，再决定是否纳入日常；README 给了可直接复制的安装、启动、回答与成本命令，但项目自标 0.1.0 preview、命令与配置在 1.0 前可能变化，不宜直接 adopt。
- [@yanhua1010: 总结一下，推荐收藏](../research/radar/2026-10-12/2630-item.md)：值得一试，建议在 Claude Code 里小范围试：让生成型子 Agent 只写代码、硬性禁止 Build/Test/Typecheck 并要求尽早提交返回，验证工作全部交给主 Agent 统一做；原文给出的这两条约束足够具体、可以直接照做，但原文被截断且只有作者主张、无任何数据。
- [nateherkai/roast-room](../research/radar/2026-10-13/2908-nateherkai-roast-room.md)：值得一试，可以照 README 的步骤在 Claude Code 里跑一次 `--quick` 版决策辩论，用真实但可逆的商业决策做小范围试；因为原文给了完整的安装命令、斜杠命令、输入清单和校验脚本，但没有任何关于结论质量的实测数据，且全量会议要消耗 21 次子代理调用，只适合先低成本验证。
- [josefchen/muster](../research/radar/2026-10-14/3134-josefchen-muster.md)：值得一试，建议小范围试用：在 macOS 14+ 上用 `brew install --cask josefchen/tap/muster` 装好，只对 Claude Code 开启「Answer prompts from Muster」，用「代理开始等待→人察觉→回答完成」的耗时和是否需要切换窗口来判断收益；理由是原文给出了可直接照做的安装命令、逐代理开关、Codex 信任 hook、快捷键与自测脚本，但它只覆盖 macOS 和 Claude Code/Codex/Cursor 三家，改善幅度是作者主张、没有对照数据。
- [Cleveland-RD/hivehouse](../research/radar/2026-10-14/3136-cleveland-rd-hivehouse.md)：值得一试，建议小范围试：在满足依赖的本地环境按 README 安装 hivehouse，先用默认 relay 模式对单个非关键项目运行一个任务，验证多代理编排、门禁、评审与清理流程，再考虑过夜或 delegate 模式；理由是它给出了可复制的安装、配置和权限边界步骤，但项目较新且部分工作流未在真实 Claude Code 会话验证，需控制风险。
- [@Klonzu: 天哪。5 个代理，20 秒内 4.18 美元。别再添加你无法定价的代理了。](../research/radar/2026-10-14/3143-5-20-4-18.md)：值得一试，建议在多代理、分阶段流程中尝试“进入下一阶段前运行 /cost 检查成本”的习惯；理由是原文给出了可照做的检查动作和一组成本/token 观测数据，但工具环境与完整流程不清晰，只适合小范围验证，不能直接 adopt。
- [@hwangxin: 复刻了 ](../research/radar/2026-10-15/3598-item.md)：值得一试，可以小范围试：在单个 GitHub 仓库用 Claude Code + Opus 并行跑两个可辨认的 /loop——一个按最近 3 天窗口做 issue 复现、先写会失败的测试再修，一个盯外部信号；理由是原文给出了可照做的流程骨架，但正文被截断，第三个 loop 和 /loop 的具体配置不完整，所以不宜直接 adopt。
- [@mirku21: 这是绝对他妈的黄金](../research/radar/2026-10-16/3966-item.md)：值得一试，先在一个小仓库里设置该环境变量跑一次同类任务，确认多代理并行是否真的生效、成本是否下降，再决定是否写进手册；理由是可照做的只有一行开关命令，价值可能真实但原文没有任何配置细节和效果证据。
- [feder-cr/git-ai](../research/radar/2026-10-17/4081-feder-cr-git-ai.md)：值得一试，先在临时目录跑通 `examples/graft/quickstart.sh` 验证「服务端落库 + 缓存 + 两个 agent + 一次 land」整条链路，再在非关键仓库以 shadow 模式接入数据库/对象存储做小范围试点；它把大量编码智能体并发落库、自动冲突解决、落库后验证、agent 权限这些协作痛点做成了可跑的开源实现，但仍是 0.1.0、接口可能变且有已知缺口，不宜直接上关键仓库。
- [@thedelost: 这是绝对他妈的绝妙](../research/radar/2026-10-17/4412-item.md)：值得一试，可以小范围试：在 git 仓库里用 `claude --worktree` 给每个并行代理开独立工作树，观察编辑期冲突是否消失、整体合并成本是否下降；理由是命令具体、风险低，但原文只有一句话加一个命令，副本位置、合并回主线、清理方式和版本要求都没写，必须先自测再决定是否写进手册。
- [olivieropinotti/orchestrator-skill](../research/radar/2026-10-18/4625-olivieropinotti-orchestrator-skill.md)：值得一试，可以在 Claude Code 里小范围试装这个 orchestrator skill，用它的“主会话只调度、任务全派后台子代理 + 账本文件跟踪”模式跑 2-3 个可并行的子任务；因为它给出了可照做的安装命令和控制命令，但效果全凭作者自述、无任何数据或案例，所以先试不直接采用。
- [timscheuerai/grokbot-gtm-team](../research/radar/2026-10-19/4708-timscheuerai-grokbot-gtm-team.md)：值得一试，可以小范围试：照 README 的四步（建 Chief of Staff → 粘贴 setup-prompt.md → 回答 5 个问题 → 连工具）搭起「一个 Bot 一件事 + 部门负责人路由守门 + 具体执行交给 Claude Code/Codex」的分工。理由是原文给出了完整的角色表、汇报关系、工作流和四要素交接格式，但真正的提示词正文在 setup-prompt.md/agents/*.md 里没有随材料给出，需自行取用并把 OXYGEN 等专有名词替换掉。
- [BlackAngel242/MyTeam](../research/radar/2026-10-19/4712-blackangel242-myteam.md)：值得一试，若你已经在用 Herdr 并行跑多个 AI 智能体，值得小范围装一套 MyTeam 本地控制台试用，按 README 给出的安装/启动/队列/危机开关流程跑通一轮；理由是本仓库给出了可直接照做的安装命令、端口、环境变量和操作流程，且把「监控—排队—干预—事实核验」做成了具体界面与接口，但它本身是监控层而非能力层，且原文存在若干可疑的模型名称，需先小范围验证可信度。
- [@RoundtableSpace: 让 Claude Code 同时向你的代码库发送 5 个子代理。每个子代理负责搜寻不同类型的问题。](../research/radar/2026-10-20/5041-claude-code-5.md)：值得一试，把「代码审查」按问题类别拆给多个各自拥有独立上下文的 Claude Code 子代理并行执行，这个协作方式值得在真实仓库上小范围试一次；但原文在列举第 3 类问题时被截断，汇总、去重、验证步骤全缺，需要自己补齐后再评估收益。
- [tomtomsatnav/agent-orchestration-standard](../research/radar/2026-10-20/5098-tomtomsatnav-agent-orchestration-standard.md)：值得一试，建议小范围试用：先用 AOS-1 的文件状态、heartbeat 和校验器搭一个低风险项目的多代理看板与调度，再逐步接入 Claude Code 执行；理由是原文给出了可复制的命令、配置和验证流程，但项目仍是 macOS-first 的个人早期项目，且没有效果数据，高风险派发必须加人工审批门禁。
