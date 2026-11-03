# 让多个编码 agent 并行干活，验证通过才算完成、叫停就能真停

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多个 AI agent 并行干活时，如何分工、验证、合入、控成本，并且在叫停时真的停住，不让旧任务的迟到结果混进交付。
> 先试这一步：先给你手上一个可拆分、有测试命令的小任务设一道合入闸门（例如 FARM_VERIFY_CMD='pytest -q'），再并行派 2 个子代理。
> 最近修订：2026-11-03

## 解决什么问题
单个 AI 回答或单条串行 agent 会话，交付的往往是你没有验证过的结果。手册把“不满意就重问一次”升级成一套可执行流程：任务写清、并行分工、独立验证、合入门禁、成本检查、注意力路由、共享账本核销、叫停与围栏，并在探索卡住时按预算止损。做法 A–AG 覆盖从单次答案竞赛到多项目控制台、文件状态+心跳编排、多 agent 共享账本、长时运行骨架、跨会话/跨人的消息交接、把多个编码 agent 编成有频道、有审批闸门的团队，以及用显式任务图 + epoch 围栏做本地执行控制面。共同底线是：并行只负责产出，接受与否必须由测试、独立 verifier、校验器、接收人本人确认或人工复核决定；消息层和编排层只负责把问题送到、把人叫来，不负责证明结果正确。新增的做法 AG 补的是另一层：任务要能随时安全收手——叫停后旧 epoch 的排队任务失效、迟到完成被拒绝、进程树被终结，而不是只把任务标成 canceled；它同样不证明结果正确。

做法 A–AG 概览：
- A：把不满意的回答送进锦标赛（arena-skill）。
- B：并行子代理+测试合入闸门（clodfarm）。
- C：多 harness、多座位的统一编排与恢复（openrig）。
- D：在同一编码 agent 内用关键字升档（oh-my-openagent）。
- E：搭长时程子代理底座（deer-flow）。
- F：把多步任务固化成角色化流水线（crewAI）。
- G：把 issue → PR → 浏览器实测 → 合并做成一条自动链路（cubefarm）。
- H：worktree 隔离+项目记忆文件+提交前互评（Offrun 或手工照做）。
- I：用 cmux 把并行 agent 的等待变成可路由通知（macOS）。
- J：把“另一个 agent 在同一 commit 上验证通过才算完成”做成状态机（pullboard）。
- K：把多项目的派工、状态与评审关卡收进一个控制台（claude-console）。
- L：用一个终端 daemon + dashboard 管住并行 agent 的可见性与权限（nsq / neurosquad-cli）。
- M：主 Agent 编排+哑子 Agent 只生成（验证集中在主 Agent）。
- N：把商业决策交给一个可复现的专家委员会（roast-room）。
- O：把“代理在等我”变成菜单栏上可一键回答的提醒（Muster，macOS）。
- P：在 tmux 里跑一个有门禁、评审与清理的 Claude 会话团队（hivehouse）。
- Q：在进入下一阶段前先结一次账（/cost 阶段成本检查）。
- R：用并行 /loop 做持续 issue/PR 值守与修复（Magpie 运维的两个复刻版本）。
- S：用实验性环境变量尝试开启 Claude Code 内置 agent teams，先做基线对照再决定是否采用。
- T：用 git-ai/Graft 在服务端承载大量编码 agent 的并发落库、冲突解决、落库后验证与 agent 权限（先 quickstart，再 shadow 接入）。
- U：用 claude --worktree 给每个并行代理一份独立工作树副本（原文只有一句话加一个命令，先自测再决定是否采用）。
- V：把主会话变成不阻塞的调度器，任务全派后台子代理，用账本文件跟踪状态（orchestrator skill，先在分支上试）。
- W：用 Bot 团队做编排、路由与守门，真正产出交回 Claude Code/Codex（grokbot-gtm-team；先只建 3 个 Bot、先不接执行层）。
- X：用本地控制台看住并调度 Herdr 下的并行 agent，带指令排队、优先级与危机室总断路器（MyTeam；先跑演示安装器与自检）。
- Y：把代码审查按问题类别拆给 5 个独立上下文的子代理并行执行（原文只给安全与性能两类，其余需自补）。
- Z：用 Goal/Task/Agent/Heartbeat/Event 文件状态+heartbeat 派发+一致性校验器编排多代理长任务（AOS-1；先只读观察，再接真实派发）。
- AA：给单个探索方向设 1–2 小时止损预算，到点无进展就终止并拆 3 个各走不同新方向的子 agent；评审类循环另设停止条件。
- AB：用共享账本+“预约—直取—本人确认”核销协议，压掉多 agent 重复认领与错发（来自 Minecraft 蜂群实验）。
- AC：给长时运行的 agent 骨架配齐六类能力与三件套（agent 目录、共享沙盒、DM），把失败写进日志，并显式指定角色。
- AD：用 Imbo 在多个编码 agent 会话、机器或人之间发消息、交接和群组同步，把消息送进正在工作的会话并唤醒空闲会话（先在非生产、只读任务上试）。
- AE：把多个编码代理编成有频道、有角色、按代理授权工具的团队，写操作先过人工审批（Tucano；先一个频道、2–3 个代理、一个只读连接器）。
- AF：用 project + to-dos + Auto-advance + scheduled automations 把多 agent 工作流固定下来，并接入本机 Claude Code、Codex 等 CLI agent（Orkas；先手动跑一项待办，再只对下一项开 Auto-advance）。
- AG：用显式任务图 + epoch 围栏做本地执行控制面，叫停后旧 epoch 排队任务失效、迟到完成被拒绝、进程树被终结（skein；先跑示例和停止演练）。

## 适用与不适用
**适用（按处境选路径）**
| 你的处境 | 用哪条路径 |
|---|---|
| 只有一个被你拒掉的回答，想确认多策略竞争是否真的更好 | A |
| 可拆分、有测试的编码任务，想并行落地 | B |
| 同时跑 Claude Code + Codex 等多套 harness，要座位与恢复 | C |
| 只想在同一会话里给难任务升档 | D（先做对照实验） |
| 想自建长时程子代理+沙箱+记忆的底座 | E |
| 有固定的多步分工（研究 → 成文），愿意写 Python / 改 JSONC | F |
| 有 GitHub 上的低风险小仓库，想验证 issue → PR → 浏览器实测 → 合并这条链 | G |
| 想在一个已有 git 的仓库里轻量隔离多个 agent、把项目记忆落成文件、提交前互评 | H |
| macOS 上并行跑多个终端型 coding agent，想一眼看到谁在等我 | I |
| 想让“另一个 agent 在同一 commit 上验证通过才算完成”变成硬约束 | J |
| 同时照看多个项目的 agent，想在一屏里看到状态、决策与评审关卡 | K |
| 跨平台并行跑多 CLI agent / 任意长驻命令，想用 daemon + dashboard 统一看状态、回权限、脚本化取成本 | L |
| 想让子 Agent 只写、验证全部集中在主 Agent | M（先做对照实验） |
| 有一个真实、可逆的商业/经营决策，想用多个专家视角压测它 | N（先跑 --quick） |
| macOS 14+ 上并行跑多个 Claude Code / Codex / Cursor，人被卡在审批与多选 | O |
| 想在 Claude Code 里跑有门禁、评审、清理与无人值守的 tmux 会话团队 | P（先 relay，后 delegate） |
| 跑多代理 / 分阶段流程，想进下一阶段前先结一次账 | Q（先跑 2–3 个阶段） |
| 想让 Claude Code 用 /loop 持续处理最近 3 天 issue，并按先复现、先写失败测试、再修的顺序做 | R1（先只跑 triage-github） |
| 有稳定 issue/PR、Discord 或 X 外部输入，想按“代码协作 / 舆情筛选 / 定时清债”三条互不干扰的 loop 常驻值守 | R2（先只跑代码协作一条，稳定后再加） |
| 使用 Claude Code，想试内置 agent teams 是否真的开启多代理并行，并先确认成本与质量 | S（先做 30 分钟基线对照） |
| 同时运行大量编码智能体，想验证服务端落库、缓存、多个 agent、一次 land 的完整链路 | T（先跑 quickstart，再 shadow 接入） |
| 有多个 Claude Code 代理要同时改同一仓库，编辑期互相覆盖、想先隔离 | U（先自测，再决定是否写进流程） |
| 用 Claude Code，想主会话不阻塞、把 2–3 个独立子任务派给后台子代理并用账本跟踪 | V（先在新分支上试一次） |
| 做 B2B/GTM 外呼或内容营销，想让“一个 Bot 一件事+负责人守门+Claude Code/Codex 执行”跑起来 | W（先只建 3 个 Bot、先不接执行层） |
| 已用 Herdr 并行跑多个 agent，想把监控、排队、冻结收进一个本地控制台 | X（先跑演示安装器，再自检） |
| 中大型代码库，想用 5 个独立上下文的子代理按问题类别并行审查 | Y（先自己补齐第 3–5 类，再人工复核） |
| 有一个低风险项目、多条长任务要跨会话推进，想把派工、心跳、回收、预算和验收状态落成可校验文件，并接 Claude Code 执行 | Z（先只读 monitor，再草稿 dispatch，最后接 claude -p） |
| 有一个会长时间跑但迟迟不出结果的探索/评审任务，想给止损和停止条件 | AA（先做 A/B 对照） |
| 多个 agent（或人+agent）会重复认领同一件事、同一份稀缺资源被多次领走 | AB（先在一件会被重复认领的事上跑两周） |
| 想搭或体检一个长时运行、要读写共享产物、要能互相发消息的 agent 骨架 | AC（先 5 个 agent、30 分钟） |
| 两个编码 agent 会话、两台机器或两个人之间需要提问、交接或群组同步，且消息要落进正在运行的会话、还能唤醒空闲会话 | AD（先在非生产、只读任务上试 1–2 周） |
| 手上有 2–3 个编码代理（Claude Code / Codex / OpenCode / Pi），想让它们在频道里互相 @ 交接与评审，且合并、外发、删除这类写操作必须先经人审批 | AE（先一个频道、2–3 个代理、一个只读连接器） |
| 想把多 agent 工作流固定成“项目+待办+自动推进+定时自动化”，并让本机 Claude Code、Codex、OpenCode 等 CLI agent 参与，但不想一上来全自动 | AF（先手动跑一项待办，再只对下一项开 Auto-advance） |
| 有一组本地、有依赖、需要可中断的多步子任务，想验证“叫停就真停、旧任务不会偷偷完成” | AG（先跑示例 + 停止演练，再迁真实任务图） |

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
- R：没有可写失败测试的仓库或 issue 无法复现，不要用；原文没有给出 /loop 的完整配置、提示词原文与第三个 loop 的细节，不要编造；三条常驻 loop + Opus 的 token 成本可能高于单人小项目收益；自动拉黑、自动评论有误判风险，loop 内部的人工审核点需自己加；PR 不拉下来真跑就判断，等于没有验证。
- S：需要稳定、可写进团队规范或生产流程，不要用；该环境变量含 EXPERIMENTAL。
- T：只跑一两个 agent 的个人或小团队，引入数据库+对象存储收益未经验证；不能接受 0.1.0 接口变动，不要用。
- U：单代理串行、或不在 git 仓库里，不要用；想直接照抄成团队规范，不要用。
- V：不用 Claude Code，或项目目录不能写 .claude/，不要用；效果描述全部来自 README 自述。
- W：不是 B2B/GTM 外呼或内容营销场景、不是单人规模、或不用英文平台，不要用；原文只抓到 README，提示词正文需自取。
- X：没有 Herdr 不要用；它本身是监控层而非能力层；24 款工具里只有 Claude Code、Codex、OpenCode 有增强遥测。
- Y：原文只给出安全与性能两类，第 3–5 类被截断；不能自己补齐类别、不能人工判定报告真伪时不要用；小项目收益可能被噪音抵消。
- Z：个人早期项目、macOS-first；Linux 只给 systemd 等价说明，未给 unit；没有成功率、成本节省、可靠性、规模上限或对照实验数据；高风险派发必须加人工审批门禁，不能把规范要求当自动保证。
- AA：必须一次连续完成、无法中途换分支的任务不要用；无法观测中间产出，或重启成本高于继续死钻，不要用；原文只是单条推文经验、无命令与数据，不能当硬规范或团队制度。
- AB：协作对象只有一个 agent、或没人会因为重复认领而损失，不要用；共享存储对某个 agent 只读时协议会退化成空写；真实工作里失败有成本，不能照搬游戏里“死亡只掉装备”的宽松设定。
- AC：目标环境没有可脚本化 API、也没有共享文件系统时不要硬套；50 个 agent 的规模与约 5,900 条消息意味着很高成本，原文没给成本数据，不要直接照规模复刻；游戏里学到的是策略倾向，不是可直接迁移的行为规范。
- AD：Windows 不支持；项目很新（31 stars，0.x）；默认要登录 imbo.dev 托管服务，会话元数据经第三方；安装器会给 Imbo 工具免逐次审批，且 agent 可能不先问你即回复；不能接受供应链风险、不能做边界测试，或需要稳定生产规范，不要用；它只是胶水层，不能替代测试、独立 verifier 或合入门禁。
- AE：不在受支持的桌面系统上（macOS Apple silicon、Linux x64/ARM64、Windows 10/11 x64），或一个 harness 都没装好并登录，不要用；Windows 安装包未代码签名，公司电脑可能被 IT 阻止；只有项目自述、没有独立效果数据，不要把它当高安全场景的唯一控制，也不要指望它替代测试与合入门禁——它只是编排层，底层 harness 仍是 Claude Code / Codex / OpenCode / Pi。
- AF：只想要一次性问答、不能保持电脑唤醒且 Orkas 运行、不能接受打包应用登录或源码版无共享项目/云同步/web-app publishing，不要用；没有明确交付物和人工验收人，不要开 Auto-advance；把 16 个内置 agent 的能力、DeepResearcher 的 verified sources、ProductDeveloper 的 verifiable results 当独立验证结果，不要用。
- AG：需要跨机/分布式调度、沙箱隔离、鉴权、外部副作用恰好一次或崩溃后自动恢复，不要用；manifest 的完整 schema 不在 README，要先读 docs/INTEGRATION.md；0.2.0 单作者项目，基准只在作者单机、单一 OS 测得，社区验证有限；它只管调度与停止，不证明结果正确。

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
- R：Claude Code + 官方 Opus；一个自己维护的 GitHub 仓库，有 issue/PR 流；能访问 Discord 或同类讨论区、X 账号接收反馈；一个便宜模型接口用于 X 反馈预筛；能本地 fetch 并运行 PR 分支的构建与测试；有测试体系可先写会失败的测试；能持续运行 /loop 的会话或调度机制。原文未给 /loop 完整配置、循环间隔、筛选标准与 prompt 原文，这些需自补。
- S：已安装 Claude Code CLI，且能正常在终端里运行 claude 并完成一次普通对话；在同一个 shell 会话中操作；能接受实验特性失效、行为变化、以及可能的额外 token 消耗。
- T：Linux 或 macOS 机器，能联网拉依赖；Go 1.26；C 工具链；Meson；Ninja；构建过程会编译一份内置的 Git。若接真实仓库：需要 config.toml（[graft] 段+可选 [graft.storage] 段）、数据库与对象存储、给每个 agent 的 token、RPC allowlist、branch policy；存储迁移先 shadow 后 authoritative。版本 0.1.0。
- U：处在 git 仓库中；已装 Claude Code 并能正常在终端里运行 claude；确实有多个代理要同时改同一份代码。--worktree 版本或环境要求原文未给，需自测。
- V：已安装并可使用 Claude Code；环境能运行 npx；项目目录可写 .claude/（账本文件路径为 .claude/orchestrator.md）。
- W：一个 Grok Bot 账号；事先想清楚 5 项答案——你的公司、你的 ICP、你的 GTM 工具、你的第二大脑、Claude Code 和 Codex 跑在哪里；各 Bot 的连接器与权限；一个含语气、素材证据、受众画像的第二大脑与内容 skills；一个 GTM 平台。
- X：Node.js ≥ 22；已安装 Herdr，并在 PATH 上或用 BUREAU_HERDR_PATH 指定绝对路径；Windows / macOS / Linux 均可；无需 npm install；各智能体的工作目录，以及 CHEF.md / AGENTS.md / TODO.md / LESSONS.md 等 Markdown 支柱文件。
- Y：已安装 Claude Code，并在一个真实项目根目录下启动会话；项目最好中大型、你熟悉且有真实问题；你能人工复核报告；需要给子代理读取代码库的权限。
- Z：Node 18+，无需安装依赖；先读 SPEC.md 和 schemas/；state 目录至少包含 goal.json、tasks.json、agents.json、heartbeat.json、events.ndjson；每个 Task 必须有非空 output_contract 和至少一个 acceptance 检查；Task id 唯一，depends_on 必须存在且无环；Goal 必须有 budget；assignee/current_task/goal_id 引用必须能解析；attempts 不超过 max_attempts；events.ndjson 每行一个 JSON，seq 严格递增。Claude Code 插件还需要 Claude Code CLI 和 hooks。项目自述为 macOS-first 的个人项目。
- AA：能观测 agent 的中间产出；任务可中断、可重启；能同时运行多个子 agent；愿意记录对照数据。原文未给具体工具要求。
- AB：有多个 agent（或人+agent）会读写同一份共享状态；有一处所有参与者都能读写的共享存储（共享目录、共享文件、共享工单表）；你愿意把“谁领了什么、领到没有”写成文件而不是口头传达。原文来自 Minecraft 蜂群实验，工具无关，不需要安装任何东西。
- AC：目标环境有可脚本化 API（原文用 Minecraft 的 Mineflayer）；有一份开源 harness 可参照（github.com/yc-software/minecraft-agent-harness），但原文没给安装命令与完整代码，安装配置需按仓库 README 自行补足。
- AD：macOS 或 Linux，arm64 或 x86_64；需要一个邮箱接收登录码；要有一台常开的机器跑 daemon；安装时勾选并连接目标工具（Claude Code 用 plugin，Codex / opencode 用 MCP server，Cursor CLI / ZCode 用 MCP + hooks，MiniMax Code 用带 hooks 的 plugin）；联系人需对方 account ID 并 accept；群只能邀请联系人、入群要选接收会话；附件落到接收方 ~/.imbo/files/。自托管需域名、证书、SMTP，可选外部 PostgreSQL。
- AE：macOS Apple silicon（M1 或更新）、Linux x64/ARM64、或 Windows 10/11 x64；至少安装并登录一个 harness（Claude Code / Codex / OpenCode / Pi）；Docker 和 Chrome 是可选项；Windows 还需 Git for Windows，因为代理命令由 Git Bash 执行。Linux 上保存密码依赖系统 keyring。
- AF：macOS 12+（Apple Silicon/Intel）或 Windows 10+ 可直接用打包安装包；Linux 源码运行需 glibc 2.34+ 的 x64/arm64，且不支持 Alpine/musl。源码方式需要 Node 22.12+；保留 Python 3 和 C/C++ 构建工具链，用于少数原生模块回退编译。打包应用首次启动需登录，自带 500 credits；也可以用自己的 provider key。源码工作区在 macOS/Linux 的 ~/.orkas/，Windows 下在最小非系统盘符的 .orkas 目录。
- AG：Linux / macOS / Windows，amd64 或 arm64；或本机有 Go 1.26+ 用于源码构建；一个持久状态目录（示例用 .skein）；要迁真实任务时，先读 docs/INTEGRATION.md 的 manifest 契约。

## 操作步骤
先按上表选路径。以下保留 A–AG 的核心操作。每条都先做最小试用，不先上全量；验证与接受仍走测试、独立 verifier、校验器、接收人本人确认或人工复核。

### 做法 A：把不满意的回答送进锦标赛（arena-skill）
1. 前提：Claude Code 可 spawn 子 agent，Python 3.8+；任务已写成独立文件。安装三选一：粘贴仓库地址说 Install this skill, then confirm /arena works；或 clone 后复制 skills/arena 到 ~/.claude/skills/；或 /plugin marketplace add 后安装。
2. 先算成本并跑最小完整形态：
```sh
python3 skills/arena/bracket.py plan --agents 100
/arena --quick --seed 7 <把任务写具体>
```
3. 检查 .arena/<run>/task.md；需要手工操作时用 bracket.py，状态在 JSON 文件里。预期：得到可盲评的赛程与冠军，是否能采用仍由你判断。

### 做法 B：并行子代理+测试合入闸门（clodfarm）
1. 前提：Docker、Claude 订阅或 API key、可改 git 仓库、一条验证命令。安装并登录：
```sh
curl -fsSL https://raw.githubusercontent.com/matank001/clodfarm/main/scripts/install.sh | sh
docker exec -it clodfarm clodfarm login
```
2. 接仓库并设闸门：
```sh
FARM_REPO_URL=<你的仓库地址>
FARM_VERIFY_CMD='pytest -q'
docker exec clodfarm clodfarm spawn 'Add CSV export' --prompt 'Add CSV export to the report page, with tests.'
docker exec clodfarm clodfarm status
```
3. 用 FARM_MAX_WORKERS、FARM_WEEKLY_TARGET、FARM_FIVE_HOUR_CEILING 节流。预期：子代理产出，只有 FARM_VERIFY_CMD 通过才合入。

### 做法 C：多 harness、多座位的统一编排与恢复（openrig）
1. 前提：Node.js 22 或 24 + tmux，仅 macOS/Linux；已登录 Claude/Codex。检查并安装：
```sh
tmux -V
claude --version && claude auth status
codex --version && codex login status
npm install -g @openrig/cli
rig setup --dry-run
```
2. 选 starter 启动两座位：starter=first-project，rig specs preview '$starter' --kind rig，rig up '$starter' --cwd . --plan，rig up '$starter' --cwd .，rig tui --shared。
3. rig ps --nodes --rig '$starter' 检查就绪。预期：多 harness 座位可见、可恢复，人工切换减少。

### 做法 D：在同一编码 agent 内用关键字升档（oh-my-openagent）
1. 前提：可弃用机器或容器；自己的小项目；至少一家模型订阅或 API key。安装：curl -fsSL https://get.omo.dev/install.sh | bash；omo。
2. 进入项目，难任务加 ultrawork 或 ulw；多智能体协作试 mass ulw；/login；迁移先跑 omo setup、omo doctor。
3. 配置 ~/.omo/omo.jsonc 或 <project>/.omo/omo.jsonc，就近优先。预期：同一会话内难任务升档；先做三轮对照再决定。

### 做法 E：搭长时程子代理底座（deer-flow）
1. 前提：git、Docker Desktop/Engine、Docker Compose v2.24+；Python 3.12+ / Node.js 22+。最快路径把帮助文本交给编码助手；手动：git clone、cd deer-flow、make setup、make doctor。
2. 模型接入写 config.yaml 或 .env；Docker 开发：make docker-init、make docker-start、make docker-logs。预期：doctor 无阻断、最小任务跑通。

### 做法 F：把多步任务固化成角色化流水线（crewAI）
1. 前提：Python >=3.10,<3.14；uv；模型 API key；网页搜索另需 Serper.dev key。uv tool install crewai；uv tool list；crewai create crew <project_name>。
2. 编辑 agents/*.jsonc、crew.jsonc，配 .env；crewai install；crewai run。预期：output/report.md 落盘且能直接用。

### 做法 G：把 issue → PR → 浏览器实测 → 合并做成一条自动链路（cubefarm）
1. 前提：Node.js 22+、git、已登录 GitHub CLI、编码 agent 订阅、Chrome、项目在 GitHub。npx cubefarm doctor；npx cubefarm login；先看 demo：npx cubefarm --demo；正式：npx cubefarm。
2. 建公司、搬入 GitHub 项目；让 CEO 规划；session limit 先设 1–2；先关闭 auto-merge，人工确认每份 QA 报告和 PR 差异。预期：issue→PR→浏览器实测→合并链路可观察，合入仍由人把关。

### 做法 H：worktree 隔离+项目记忆文件+提交前互评（Offrun 或手工照做）
1. 前提：项目在 git 下；至少一个 agent CLI 和账号，有第二个更好；Offrun 需 Apple Silicon Mac / macOS 14+。每 agent 一个 worktree：
```sh
git worktree add ../repo-agent1 -b agent1
git worktree add ../repo-agent2 -b agent2
```
2. 建项目记忆纯文件：conventions.md、plan.md、dead-ends.md。
3. 让第二个 agent 在提交前读 diff 做评审，结论落到 chat 里由你判断，Nothing merges on its own。预期：编辑期冲突和重复解释减少。

### 做法 I：用 cmux 把并行 agent 的等待变成可路由通知（macOS）
1. 前提：仅 macOS；会读取已有 Ghostty 配置；装 hooks 前 agent CLI binary 在 PATH。brew tap manaflow-ai/cmux；brew install --cask cmux；cmux hooks setup；cmux hooks setup codex。
2. 用 OSC 9/99/777 触发 pane 蓝环、侧栏未读徽标、通知弹窗；⌘⇧U 跳最新未读，⌘I 打开通知面板；cmux claude-teams；cmux ssh user@remote。预期：agent 等待输入到人响应的空转时间下降。

### 做法 J：把“另一个 agent 在同一 commit 上验证通过才算完成”做成状态机（pullboard）
1. 前提：git、Node 22.13+、在 git 仓库内；需要 SPEC.md、PRACTICE.md、pullboard.json。npm i -g pullboard；pullboard tour；pullboard init，提交它写出的文件。
2. 写 SPEC.md，一行一个需求；配 pullboard.json 的 gate 和 lanes；手工走 pullboard add、pullboard worktree、pullboard next、pullboard submit。
3. verifier 必须是另一个没参与构建的 agent，checkout 确切 commit，accept 给证据、reject 给理由。预期：每条完成都有 gate 绿+verifier receipt。

### 做法 K：把多项目的派工、状态与评审关卡收进一个控制台（claude-console）
1. 前提：Windows 或 macOS；Claude Code 2.1.289+ 且支持 mod；每个项目在注册表里有一项、并有 STATUS 文件。claude plugin marketplace add SaM-runtime/claude-console；claude plugin install console-status@claude-console。
2. 先 /console demo，再 /console refresh；配注册表、STATUS 卡、dispatch.json；执行者解析顺序：面板覆盖 > 注册表 Executor 列 > 全局 executor。
3. 日常用 v 验证、s 同步、c 继续、r 回覆、d 决定、g 关卡评审、o 打开 STATUS.md、p 打开 PR；commandGuard 默认 ask；loopGuard 默认 on。预期：待决策/待评审条目处理时间缩短。

### 做法 L：用一个终端 daemon + dashboard 管住并行 agent 的可见性与权限（nsq / neurosquad-cli）
1. 前提：Node.js 22.13+；要使用 Claude Code / Codex / OpenCode 需该 CLI 已登录。npm install -g neurosquad；npx neurosquad。
2. 在 git 仓库里启动：
```sh
cd ~/code/my-app
nsq run claude 'fix the flaky checkout test' --worktree
nsq run codex --name reviewer
nsq run -- npm run dev
nsq
```
3. dashboard：Enter 全屏，Ctrl+] 回网格，y/a/n 回答权限，s / S 发送提示，q 关闭而 agent 继续跑；nsq down、nsq up 恢复；脚本化用 nsq ls --json、nsq send、nsq answer、nsq peek、nsq diff、nsq cost --since 7d。预期：权限回答和状态可见性不再靠翻终端。

### 做法 M：主 Agent 编排+哑子 Agent 只生成（验证集中在主 Agent）
1. 前提：Claude Code 能拉起子 Agent；能编辑子 Agent 收到的指令文本。划清生成与验证边界。
2. 给生成型子 Agent 写入硬性禁止项：不 Build、不 Test、不 Typecheck，早提交早返回。
3. 子 Agent 返回后，由主 Agent 统一做验证；按正交方式拆解隔离，原文未给判据，需要自己设计。预期：子 Agent 轮次下降，主 Agent 一次通过率不劣化。

### 做法 N：把商业决策交给一个可复现的专家委员会（roast-room）
1. 前提：Claude Code（Claude 套餐即可）+ Node.js 20+。git clone https://github.com/nateherkai/roast-room.git；cd roast-room；可选 npm start，打开 http://localhost:4730。
2. 在文件夹里打开 claude，输入 /roast-room <你的决策>；给全六项信息：决策、选项、数字、限制、成功长什么样、你倾向哪一边。
3. 控成本：/roast-room --quick ...、--seats hormozi,buffett ...、ask hormozi ...；校验引用：python .claude/skills/roast-room/scripts/check_quotes.py sessions/<session>。预期：反方论点命中、引用可核验，是否改变倾向由你判断。

### 做法 O：把“代理在等我”变成菜单栏上可一键回答的提醒（Muster，macOS）
1. 前提：macOS 14+；安装后逐代理在 Settings → Answer prompts from Muster 开启；Codex 需先 /hooks 信任一次。brew install --cask josefchen/tap/muster。
2. 快捷键：⌥ Tab 切换会话；⌥ ↩ 允许；⌥ ⌫ 拒绝；⌥ 1–9 选择；⌃ ⌥ Space 看最近三小时 token 与成本。预期：代理等待到人察觉、再到回答完成的时间下降。

### 做法 P：在 tmux 里跑一个有门禁、评审与清理的 Claude 会话团队（hivehouse）
1. 前提：tmux ≥3.2、git ≥2.31、bash、jq、perl、shasum、Claude Code ≥2.1.291；远程还需 ssh 和 rsync。claude plugin marketplace add Cleveland-RD/hivehouse；claude plugin install hivehouse@hivehouse。
2. 默认 relay 模式，先只对一个项目运行 /hivehouse:start <task>；delegate 仅在只有你能写的 root 文件允许时开启，最多 7 天，且仅在 permission_mode_local=auto 时才 bypassPermissions；push、deploy 和花费留给你。预期：团队按计划产出 diff/提交，gate 每步验证通过，cleanup 只移除 manifest 记录内容。

### 做法 Q：在进入下一阶段前先结一次账（/cost 阶段成本检查）
1. 前提：流程可拆成至少 2–3 个阶段，能读到成本或提供 /cost。进入下一阶段前跑 /cost。
2. 记录阶段成本、token、代理数与耗时；原文示例：5 个代理、20 秒、4.18 美元；工作 token 从 198,628 增加到 233,055。
3. 对无法定价的新代理保持警惕：估不出边际成本就先不加。预期：事前看见异常增长，避免不必要扩容。

### 做法 R：用并行 /loop 做持续 issue/PR 值守与修复（Magpie 运维的两个复刻版本）
1. 前提：Claude Code + 官方 Opus；一个自己维护的 GitHub 仓库，有 issue/PR 流；能访问 Discord 或同类讨论区、X 账号接收反馈；一个便宜模型接口用于 X 反馈预筛；能本地 fetch 并跑 PR 分支的构建与测试；有测试体系可先写会失败的测试；能持续运行 /loop 的会话或调度机制。原文没有给出 /loop 的完整配置、提示词原文、循环间隔和 X 筛选标准，这些必须自补；不同版本不要混成一条大循环。
2. 先选版本。R1 是单 loop 先跑 triage-github，重点在任务顺序：先复现、先写会失败的测试、再修，适合第一次照做；R2 是三条互不干扰的常驻 loop 分工：代码协作面、舆情面、内部质量面，适合已有稳定外部输入、技术债在累积的维护场景。两者不冲突：先用 R1 跑通一条 loop，再把 R2 的分工逐条加上。
3. R1 起步：不要一上来跑 3 个 loop。只启动 triage-github 这一条，处理最近 3 天 issue。把处理顺序写死：先复现；先写一个会失败的测试；再修。可把“处理最近 3 天的 issue，先复现、先写一个会失败的测试，再修”放进 loop 指令。跑一天后检查产出的 PR 或提交，按复现数、失败测试数、修复后测试通过数、PR 合并/进入 review 数判断；第一个 loop 稳定后再考虑扩展。/loop 启动命令原文未给，不要编造。预期：拿得到可 review 的修复产出。
4. R2 第一条：起代码协作值守 loop。用 Claude Code + Opus 起一个 /loop，职责是盯 GitHub issue/PR 与 Discord。关键约束：PR 不能只看 diff 就判，必须先把该 PR 分支 fetch 到本地，跑构建与测试，再依据实际结果给结论或评论。原文未给间隔与 prompt，先用较长间隔，人工检查几轮输出后再收紧。
5. R2 第二条：起 X 反馈筛选 loop。职责是盯 X 上的用户反馈。关键约束：前面先用便宜模型拦一道，把大量噪声挡在 Opus 之外，只把有价值的反馈送进主模型，以省 token。筛选标准、如何把便宜模型输出传给 Opus，原文未给，需自行补齐。
6. R2 第三条：起定时清债 loop。定时做三件事：清理技术债、把教训写下来、拉黑低质提交。周期原文未给，需自定。教训建议落成仓库内可被后续 loop 读到的文本，否则沉淀无法回流。自动拉黑与自动评论先加人工复核，观察误伤。
7. 三条 loop 并行常驻，各自独立运转，不合并成一条大循环。人工保留 UI/UX 环节：审美与交互决策不外派，其余交给循环。这一步是整套方法能成立的前提。
8. 预期：issue/PR 首次响应时间下降；你本人每天花在非 UI/UX 事务上的时长下降；loop 给出的 PR 判断被事后推翻的比例下降；token 与 API 成本可见。注意这些是检验点，不是原文已给出的效果数据。

### 做法 S：用实验性开关尝试开启 Claude Code 内置 agent teams
1. 前提：已安装 Claude Code CLI，能在终端正常运行 claude；在同一个 shell 会话中操作。export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1；紧接着 claude。
2. 原文到此为止；如何指定模型、如何并行、并发数、失败回收均未给，只能自行探索。最小试用 30 分钟：选非关键小仓库，构造多环节固定任务（改函数+补测试+更新文档）；先不设变量跑基线，再开新终端设变量跑同一任务。
3. 判定：无效或与基线无差别 → 降级为 watch；有并行但质量或成本变差 → 不写入手册；并行存在、成本下降且质量不掉 → 只作可选实验配置并注明验证日期。预期：确认开关是否真的开启多代理并行。

### 做法 T：用 git-ai/Graft 在服务端承载大量编码 agent 的并发落库与验证
1. 前提：Linux 或 macOS；Go 1.26；C 工具链；Meson；Ninja；构建会编译内置 Git。git clone https://github.com/feder-cr/git-ai.git；cd git-ai；make build；跑 examples/graft/quickstart.sh；查看 ./_build/bin/graft。
2. 起自己的 server：改编 examples/graft/config.toml，执行 _build/bin/gitaly serve config.toml；迁存储加 [graft.storage]，先 shadow 导入，确认无误再切 authoritative；冲突解决最小试用先 none。
3. 开启落库后验证：用 graft-verify 测当前 tip，失败时 bisect 定位并 revert 引入问题的 change；给 agent 配 per-agent token、RPC allowlist、branch policy；可选接 changeset 流、按组件汇报、Slack、graft-cache。预期：并发 land 成功、验证与权限可控。

### 做法 U：给每个并行代理一份独立工作树副本（claude --worktree）
1. 前提：在 git 仓库里，确实有多个代理要同时改同一份代码。进入项目 git 仓库目录，用 claude --worktree 启动 Claude Code；对每个要并行的代理重复。
2. 主工作树保持不变，由人掌握。原文到此为止；版本要求、副本位置、合并回主线、清理方式均需自测，不要照猜。预期：编辑期互相覆盖减少；同时记录合并成本。

### 做法 V：把主会话变成不阻塞的调度器，任务全派后台子代理（orchestrator skill）
1. 前提：Claude Code 可用；能运行 npx；项目可写 .claude/。npx skills add olivieropinotti/orchestrator-skill；在 Claude Code 中 /orchestrator。
2. 正常提出需求；skill 会把每条消息拆成独立任务并并行分派。查看进度：status；停止：stop <name>、stop all；改变方向：redirect <name> to ...；关闭编排：说 stop orchestrating；查看账本 .claude/orchestrator.md。
3. 写需求时给每个 agent 完整 brief（目标、事实、负责文件、不能做什么、完成定义）；判断类用 Opus，紧凑可核对任务用 Sonnet。预期：主会话不阻塞，账本可核对。

### 做法 W：把 Bot 团队当编排层，真正产出交回 Claude Code/Codex（grokbot-gtm-team）
1. 前提：一个 Grok Bot 账号；事先想清楚公司、ICP、GTM 工具、第二大脑、Claude Code 和 Codex 跑在哪里；各 Bot 的连接器与权限；第二大脑与内容 skills；一个 GTM 平台。新建 Bot，命名 Chief of Staff；打开仓库 setup-prompt.md，把 prompt 粘贴进对话；材料未提供正文，需自取。
2. 回答 5 项问题；它会创建其余 Bot、Content Room 和 1 个 routine。连工具与权限：到 settings 连接对应工具；或手工粘贴 agents/ 下每个文件的 instructions block。
3. 可选接执行层：任何 Bot 可往执行层发工作单元，格式为 outcome / inputs / skill / limits；持久终端会话、每个任务一个 worktree、内容类跑本机、代码类跑 dev server。最小试用只建 3 个 Bot（Chief of Staff + Outbound Lead + Lead Sourcer），删掉 handoff，只留 1 个例程。预期：先测编排层本身值不值，再决定接执行层。

### 做法 X：用本地控制台看住并调度并行 agent（MyTeam，依赖 Herdr）
1. 前提：Node.js ≥22；已装 Herdr，并在 PATH 上或用 BUREAU_HERDR_PATH 指定绝对路径；Windows/macOS/Linux；无需 npm install。到 Releases 下载 ZIP 解压；Windows 双击 Installer MyTeam.bat；macOS/Linux 跑 bash scripts/installer.sh；已有 Node 可跑 node scripts/installateur-anime.mjs。
2. 先看演示：node scripts/installateur-anime.mjs --demo；启动：node server.mjs；打开 http://127.0.0.1:4317。首次 6 步：打开 Herdr 和桌面快捷方式；确认 4 面板 2×2；主控面板读 CHEF.md 和 AGENTS.md；从控制台发第一条指令；看“任务”标签核对 TODO.md；找“危机室”按钮（Ctrl+Maj+C）。
3. 排队与优先级：忙碌或配额暂停时加入队列；勾选优先可插队；等待超过 30 分钟自动升高优先级；可一键撤回。危机室：Ctrl+Maj+C 冻结所有指令下发（HTTP 423）并挂起队列；POST /api/crise/arret 请求礼貌中断，发 esc 不用 kill；状态写 .bureau/crise.json。自检：npm test；npm run check。预期：可见性提升，冻结可用；通不过测试就降级为 watch。

### 做法 Y：把代码审查按问题类别拆给 5 个独立上下文的子代理并行执行
1. 前提：Claude Code 在真实项目根目录启动；项目不宜过小；你能人工复核报告。自己定 5 类；原文只明确安全（密钥、缺失身份验证、不安全输入处理）和性能（慢查询、浪费的工作、庞大的包），第 3–5 类需自补，例如正确性与错误处理、测试缺口、重复与死代码。
2. 粘贴提示词骨架：并行运行 5 个子代理，每个子代理都从一个全新的上下文开始：1. 安全性：密钥、缺失的身份验证检查、不安全的输入处理 2. 性能：慢查询、浪费的工作、庞大的包 3. 正确性与错误处理：未处理的异常、边界条件、空值 4. 测试缺口：无覆盖的关键路径 5. 重复与死代码。每个子代理只报告「文件路径:行号 + 问题描述 + 严重程度 + 修复建议」，不要贴大段代码。
3. 汇总去重：主代理按文件行号合并重复报告，按严重程度排序；人工复核后再修改；修复必须走做法 B 的 FARM_VERIFY_CMD、做法 J 的 gate + verifier，或现有测试与评审。预期：增量有效发现大于 0，噪音与重复可承受。

### 做法 Z：用文件状态+heartbeat+校验器编排多代理长任务（AOS-1）
1. 前提：Node 18+，无需安装依赖；在仓库目录执行。先跑通校验：
```sh
node server.mjs
node conformance/validate.mjs
node conformance/validate.mjs path/to/state
node conformance/validate.mjs --selftest
```
校验器通过退出 0，不通过退出 1，并打印 FAIL: <file>: <message>；stale heartbeat 等 warning 不影响退出码。
2. 按文件状态组织一个目标。先读 SPEC.md 和 schemas/；state 至少包含 goal.json、tasks.json、agents.json、heartbeat.json、events.ndjson。每个 Task 必须有非空 output_contract 和至少一个 acceptance 检查；Task id 唯一，depends_on 必须存在且无环；Goal 必须有 budget；assignee/current_task/goal_id 引用必须能解析；attempts 不超过 max_attempts；events.ndjson 每行一个 JSON，seq 严格递增。每改一次 state 就运行 node conformance/validate.mjs path/to/state。
3. 配置 heartbeat 派发命令：在 heartbeat/config.json 设置 interval_s 和 dispatch_command，命令能由 shell 启动；键名和可用变量以 heartbeat/config.json 和 runner 头注释为准。可以把 dispatch_command 换成任何 shell 能启动的东西：Claude CLI、脚本或 HTTP client；这是接入真实 agent runtime 的唯一位置。SPEC 第 7 节要求：会部署、发消息、花钱或删除东西的命令，必须由记录为 human.* Event 的人工批准来门禁。建议先用只打印/只生成草稿的脚本验证状态流转，再换成真实执行命令。
4. 把 server 和 heartbeat 作为长驻进程运行。quickstart 方式：nohup node server.mjs > server.log 2>&1 &。持久方式 macOS 原文给了 launchd plist 模板；保存为 ~/Library/LaunchAgents/dev.aos.server.plist，改好路径后 launchctl load ~/Library/LaunchAgents/dev.aos.server.plist；heartbeat runner 若单独进程，用同一模板换 label 和入口；Linux 可用等价 systemd unit 并设 Restart=always，原文未给 unit。heartbeat 文件的 ts 是存活信号；runner 崩溃会先显示 late 再显示 dead。
5. 安装 Claude Code 实时看板插件（前提：Node 18+ 和 Claude Code CLI）：make install；make doctor；make；打开 http://127.0.0.1:4318；monitor 随会话自动启动，设 AOS_NO_AUTOSTART=1 可禁用；新会话会拾取 hooks，已有会话需 /reload-plugins。项目分组、告警和 stuck/errored 规则在 monitor 的 live/config.json 调整。
6. 用看板/终端/MCP 做观察和复盘。monitor 只绑定 127.0.0.1、只读、无写端点。看板显示 heart → project hubs → agents 图、每个 agent 的当前工具、工具流、token、运行时间、模型、文件冲突、错误和告警；aos-dash --once 可出终端快照；MCP server 只读查询 monitor；?debug=1 打开屏上记录器。数据删除路径：~/.claude/plugins/data/aos-dashboard-aos-local/live（或你的 AOS_LIVE_DIR）。
7. 最小试用顺序：选一个低风险、边界清楚的项目，建立小 state（一个 Goal、少量有 output_contract 和 acceptance 的 Task、一个或少数 agent）；先只用 monitor 只读观察；再让 dispatch_command 指向只打印/生成草稿的脚本跑心跳；最后才接 claude -p。每次改 state 后运行 node conformance/validate.mjs path/to/state。预期：validator 连续 0、heartbeat 不 late/dead，再看板是否降低人工干预或提高 acceptance 通过率。

### 做法 AA：给卡住的探索设止损，到点无进展就拆三个新方向
1. 前提：有一类会长时间跑但迟迟不出结果的任务（长链路调试、大范围重构、代码评审、检索式研究等），能观测 agent 的中间产出，且任务可中断、重启成本低于继续死钻。原文未给具体工具要求。
2. 给单次探索设方向预算：同一目标方向最多 1–2 小时（或等价的 token/轮次预算），开始时记录起点时间与当前假设。
3. 定义“无结果”的判定：没有产出可验收的中间物（补丁、通过的测试、结论段落），且最近若干轮没有新增信息（重复同一尝试、反复回退）。
4. 到点或触发判定即终止该 agent，不追加“再试一次”的指令。
5. 拆出 3 个子 agent，每个分配一个不同的新方向（例如换假设、换定位手段、换复现路径），而不是同一方向的三次重试；具体如何切分方向需自己设计，原文没有给。
6. 对评审/多 agent 互看类任务另设停止条件：最大轮次、最大时长，或连续 N 轮无新增问题/无新增修改即收敛退出。原文未给 N 的具体值。
7. 记录每次触发的数据：卡住时长、终止后哪几路有产出、总耗时与成本，用于校准 1–2 小时这个阈值是否适合自己的任务。预期：首次可验收产出时间缩短，卡死率下降；若 3 路长期只有 0–1 路有效，先改方向切分方式，而不是继续加 agent。

### 做法 AB：用共享账本+“预约—直取—本人确认”核销重复认领（来自 Minecraft 蜂群实验）
1. 前提：多个 agent（或人+agent）会重复认领同一件稀缺资源、同一个工单；有一处所有参与者都能读写的共享存储。这条协议与工具无关，不需要安装任何东西。
2. 建两份共享文件。第一份是计划/事实板，原文结构可直接照抄：
```
Primary storage Greta: (1526,70,1507), crafting table (1526,70,1505).
Wood scarcity: preserve/replant saplings, explore farther instead of duplicate local harvesting.
Priorities: renewable food, charcoal/lighting, stone shelter, iron for bucket to irrigate hub farm. Avoid redundant new storage.
```
换成研发场景就是：产物在哪、什么是稀缺的、当前优先级、哪些动作禁止重复做。
3. 第二份是账本/队列，必须带时间戳并显式声明新快照覆盖旧值。原文片段：
```
## Ration calculation (hunger target18; verify before serving)
Cooked beef/pork restore8; cooked chicken/mutton restore6; bread5; apple4.
- Basil food5: deficit13 -> 2 beef/pork or 3 chicken/mutton.
...
## Update time4387 (supersedes older values)
```
三条硬规则：写的是“报告值”不是实时值；未确认发放不算已发；新快照 supersede 旧值。
4. 把发放流程写死成五步，顺序不能省：
   1. 分配者先在私信里指名：给谁、从哪取、取几个；
   2. 在共享账本里写 RESERVED 并标明接收人，其他人不得动该份；
   3. 接收人本人到指定位置直取并使用；
   4. 接收人本人回报新状态，才把该条标记为 served/confirmed；
   5. 没收到本人确认的，一律按“未送达”处理。
原文明确的两条禁令是 Tool pickup attribution alone is insufficient（工具层面的拿取记录不足以证明送达）和 never tossing into crowded refuge（不要把稀缺物资丢进人群）。原文的反例：Esme 误取了本该给 Noor 的鸡肉，直到 ## Correction time13207 才由 Noor 本人“没有鸡肉、仍是 HP9 food4”纠正回来。
5. 失败也落一行日志。原文里每次 agent 死亡就向 death_log.md 写一行，是最轻量的效果信号来源。
6. 把优先级调整写成文件，而不是口头传达。原文里 Ada 在第三夜后写下并执行：
```
Stop optional bulk excavation/building and distant scouting. Idle in lit closed shelters until assigned short productive tasks.
```
可迁移点：备忘录要给出可执行的边界条件——停做什么、做什么、什么时候做。
7. 预期：同一件稀缺资源/工单不再被多人重复认领；账本里标 served 的条目绝大多数有本人确认；高危对象从被记为缺口到真正被服务的时间缩短。

### 做法 AC：照“六类能力+三件套”搭长时运行的 agent 骨架
1. 前提：目标环境有可脚本化 API（原文用 Minecraft 的 Mineflayer）。harness 本身已开源（github.com/yc-software/minecraft-agent-harness），但原文没给安装命令与完整代码，装法按仓库 README 自行补足，不要编造。
2. 用六项能力清单给骨架做体检，缺哪项补哪项：观察（observe）、推理（reason）、记忆（remember）、行动（act）、发消息（message）、编写并执行脚本（write/execute scripts）。换到办公/研发场景的映射是：读取状态、计划、持久记忆、调用工具、发通知、写脚本。
3. 给每个 agent 配齐三件套，缺一项协调就会退化：agent directory（谁是谁、顺序如何）；shared sandbox（共享文件系统和公共存储）；DM（点对点私信通道）。
4. 显式指定角色，或随机化目录顺序。原文里层级按 directory 顺序形成，排第一的 Ada 成了事实上的领导者，其他 agent 向她申请批准——这是评测设计带来的伪影，不是你想要的“涌现管理”。
5. 检查反馈信号的强度，因为它会直接改变 agent 的行为策略：原文首夜 22 死（占全程 34 死的大多数）之后，agent 普遍变得过度保守、放弃原定任务，Ada 因此下令停止可选的大规模挖掘与远距离侦察。真实工作里失败有成本，不能照搬游戏里“死亡只掉装备加一行日志”的设定；配反馈时要考虑你希望 agent 冒险还是保守。
6. 最小试用：按仓库 README 装好后，先用远小于 50 的规模（例如 5 个 agent）、短时长（例如 30 分钟），跑一个必须协作才能完成的目标，复现“共享文件+DM+目录”三件套，观察是否自发出现分工。预期：分工与交接在共享文件里看得见；重复劳动和相互覆盖可由账本追溯。原文的 50 agent / 3 小时 / 约 5,900 条消息只作上限参照，不要一次复刻。

### 做法 AD：用 Imbo 在多个编码 agent 会话、机器或人之间做提问、交接和群组同步
1. 前提：macOS 或 Linux，arm64 或 x86_64；一个邮箱接收登录码；一台常开机器跑 daemon；安装时勾选并连接目标工具。安装并登录（安装器会把 imbo 放到 ~/.local/bin，用邮箱验证码登录，启动后台 daemon，并让你勾选要连接的工具）：
```sh
curl -fsSL https://imbo.dev/install | sh
```
安装器会列出它改了哪些设置，并允许 Imbo 自己的工具运行时不每次都弹审批；imbo uninstall 可撤销。
2. 确认本机状态与会话：
```sh
imbo status
imbo whoami
```
3. 加联系人。对方要先拿到你的 account ID；对方侧需要接受：
```sh
imbo contact add 30713956 --note 'bob, api team'
imbo contact requests
imbo contact accept 1
imbo contact list
imbo send bob/api 'hi'
```
4. 建群并让消息广播到多个会话。建群时要选自己哪些会话接收消息；只能邀请联系人：
```sh
imbo group create launch
imbo group invite launch 24441842
imbo group join 3
imbo send launch 'v2.3 is tagged. Check your side and reply here.'
```
群消息会到达每个成员的所有接收会话，群里的回复也回到所有这些会话；没内容可补的会话不会回复。
5. 发文件。附件保存在接收方 ~/.imbo/files/；接收方 agent 把附件当数据处理，未经其用户同意不会执行里面的指令或程序：
```sh
imbo send bob/api 'Spec v2 attached. Diff it against /users.' --file api-spec.md
imbo inbox
```
6. 在会话内让 agent 自己用工具：agent 侧暴露 send、inbox、contacts、groups、accept 五个工具，直接用自然语言指派，例如“问 bob/api 的 GET /users 是否分页”“在 launch 群里让大家核对 v2.3”。
7. 更新与自托管（可选）：
```sh
imbo update
```
0.2.11 之前的版本没有该子命令，需重跑安装命令。自托管服务端：
```sh
docker run -d -p 443:443 -v imbo:/data -e IMBO_DOMAIN=imbo.example.com -e IMBO_ACME_EMAIL=you@example.com -e IMBO_SMTP_URL='smtps://user:pass@smtp.example.com' ghcr.io/bearisbug/imbo-server:latest
```
关键变量：IMBO_DOMAIN（公网域名，启用 Let's Encrypt HTTPS，TLS-ALPN，443 端口）、IMBO_SMTP_URL（登录码邮件）、IMBO_MAIL_FROM（发件人，默认 Imbo <login@your-domain>）、DATABASE_URL（外部 PostgreSQL；不设则在 IMBO_DATA_DIR 用内置库）、IMBO_SIGNUP_EMAIL_DOMAINS（允许注册的邮箱域，不设则任何人可注册）、IMBO_LISTEN（默认有域名时 0.0.0.0:443，否则 0.0.0.0:8080）。客户端指向自建服务：
```sh
imbo setup --server https://imbo.example.com
```
8. 从源码构建（需要 Rust 工具链）：
```sh
cargo build --release
cargo test --workspace
```
9. 最小试用顺序：选两台机器（或同一台的两个会话），只接 Claude Code + Codex 两个工具，先不接清单标 avoid 的 ZCode；互加联系人后先跑一次跨会话提问——在 A 会话让 agent 发问，B 会话保持空闲，观察是否被唤醒并回复；再建 2–3 个会话的群，让各自核对自己那一侧后回帖；单独做一次边界测试：故意让 agent 被要求发送一个本地文件或删除文件，确认它是否按原文所述先来问你；再发一个带指令的附件，确认接收侧把它当数据而非执行。预期：人工转述次数下降，跨会话确认端到端耗时下降，空闲会话被唤醒并产出有效改动；但这些都是自建指标，原文只有 demo 描述。

### 做法 AE：把多个编码 agent 编成有频道、有角色、有审批闸门的团队（Tucano）
1. 前提核对：macOS Apple silicon（M1 或更新）、Linux x64/ARM64、或 Windows 10/11 x64；至少安装并登录一个 harness；Docker 和 Chrome 可选；Windows 还需 Git for Windows，因为代理命令由 Git Bash 执行。Tucano 是编排层，不替代底层 harness：它把 Claude Code、Codex、OpenCode、Pi 组织成有名字、角色、工具和记忆的团队。
2. 装 harness 并登录。Claude Code：
```bash
curl -fsSL https://claude.ai/install.sh | bash
claude auth login
```
Windows PowerShell：
```powershell
irm https://claude.ai/install.ps1 | iex
claude auth login
```
Codex：
```bash
npm install -g @openai/codex
```
README 说明 Codex 要在 Tucano 内登录一次。
3. 装 Tucano。Mac 下载 .dmg 后拖入 Applications；Ubuntu/Debian：
```bash
sudo apt install ./tucano-linux-amd64.deb
```
AppImage 先加执行权限：
```bash
chmod +x tucano-linux-x86_64.AppImage
```
Windows PowerShell：
```powershell
irm https://github.com/eduwxyz/tucano/releases/latest/download/install.ps1 | iex
```
Mac 或 Linux 终端也可：
```bash
curl -fsSL https://github.com/eduwxyz/tucano/releases/latest/download/install.sh | sh
```
4. 首次运行按向导配置：选语言和姓名；勾选代理可用的 harness，每一项有 Test now 可以发一个真实问题；选路由频道和保存记忆用的模型；填写每个代理都应知道的背景；工具和技能可跳过；创建第一个代理，可选模板或从零开始。完成后进入 #general。
5. 建频道和团队：新建频道，加入代理。提问时可用 @ 指定代理，不指定则由路由器选谁回答。代理之间用 @ 交接，形成调查 → 修复 → 评审的链路。预期：一条请求自己从调查走到修复和评审，每一步在频道里留痕。
6. 接工具：Connectors → Add，粘贴 MCP server 地址；OAuth 服务会打开浏览器，其他服务填 token。随后在每个代理页面按连接器设置 no access、read 或 read and write。先只接一个只读或低风险的连接器（例如 GitHub 或 GitLab 读 issue），不要一上来给写权限。
7. 设审批与限额：有影响的写操作等待确认；可选 approve once、always allow safe one、或 refuse with reason，拒绝理由会被代理读到。Settings → Phone and GitHub 可接 Telegram 机器人，在手机上审批。给每个代理设月度 token 限额和单次回复上限；需要时用 Pause everything 一次停掉所有代理。预期：未授权的写操作次数为 0，审批卡上能看到 exact call 与参数。
8. 管记忆和技能：在 Memory 页查看、批准、编辑、遗忘每条记忆；代理反复走同一路径时会提议 skill，即整个团队可照做的书面配方；Claude Code 和 Codex 已有 skills 可一键导入。预期：同类任务在记忆/技能复用后时间下降。
9. 设例程：Routines 可按日期时间触发，也可按连接器事件触发，例如新 issue、监控失败、邮件。周日历显示每次运行结果；quiet hours 可以保持夜间安静。关闭窗口后 Tucano 留在托盘，例程和触发继续运行。最小试用先开一个每周例程扫新 issue。
10. 给代理电脑/浏览器（可选）：可给 Docker 隔离的 Linux 环境，或选择本机；借出文件夹或仓库；给独立 Chrome，可实时观看，并在需要登录时接管。
11. 看回执和报告：每条回复显示 searched、read、ran、edited，以及 token 和时间回执；Usage and limits 看每个代理月度用量和订阅窗口；weekly Report 看每个 issue 花了多少 token、多少回复、时间去了哪里。
12. 最小试用组合：选一个真实但低风险的小任务（例如修一个非关键 bug）。建一个频道，放 2–3 个代理：一个用 Claude Code 修复，一个用 Codex 评审，可选一个做调查或路由；只接一个只读或低风险 MCP 连接器；只借出一个仓库文件夹；把 merge、post、email、delete、purchase 设为审批；开一个每周例程扫新 issue。预期：拿得到可评审的 PR，危险写操作全部被审批拦下；效果仍需与单人 Claude Code 基线对照。

### 做法 AF：用 project + to-dos + Auto-advance + scheduled automations 固定多 agent 工作流（Orkas）
1. 前提：macOS 12+（Apple Silicon/Intel）或 Windows 10+ 可直接用打包安装包；Linux 源码运行需 glibc 2.34+ 的 x64/arm64，且不支持 Alpine/musl。源码方式需要 Node 22.12+；保留 Python 3 和 C/C++ 构建工具链，用于少数原生模块回退编译。打包应用首次启动需登录，自带 500 credits；也可以用自己的 provider key。
2. 从源码运行：
```bash
git clone https://github.com/Orkas-AI/Orkas.git
cd Orkas
./run.sh
```
Windows 使用：
```bash
run.cmd
```
前提：首次启动会安装锁定的 npm 依赖，并准备 pinned Python、uv、Node、embedding model（约 95 MB）、OfficeCLI、FFmpeg、whisper.cpp 和多语言语音模型资源；需要网络和磁盘空间。工作区在 macOS/Linux 的 ~/.orkas/，Windows 下在最小非系统盘符的 .orkas 目录。
3. 配置模型。打包应用到 Settings → AI Providers 添加 API key 或 OAuth；支持 Claude、OpenAI、Gemini、DeepSeek、Kimi、GLM、Qwen、MiniMax、Doubao，或本地 OpenAI-compatible endpoint。
4. 配置本地模型。已有 Ollama、LM Studio 等本地 OpenAI-compatible 或 Anthropic-compatible 服务时，到 Account settings → Models → Chat → Add model → Custom，选择 OpenAI-compatible 或 Anthropic-compatible，填入 base URL、exact model ID、API key，然后在任务的模型控件中选择保存的模型。
5. 建一个 project。先准备目标说明、工作规则、约束、参考文件和验收标准；在应用内创建 project，把目标、规则、记忆和文件放进去，让后续每次对话都从同一上下文开始，不必反复交代背景。
6. 拆 to-dos，并谨慎开启 Auto-advance。每个 to-do 有明确交付物和人工验收人。先把工作拆成人或 agent 可执行的待办，先手动运行并复核一轮；确认质量后再开启 Auto-advance，让团队自动接下一个待办并把完成结果交回复核。README 只说明有该功能，未给出具体开关路径。
7. 设定 scheduled automations。前提：电脑保持唤醒且 Orkas 正在运行；它不能在电脑关机时继续工作。对例行任务设置 hourly、daily、weekly 或 monthly 自动运行。README 说明从 v1.9 起，电脑唤醒或 Orkas 启动后，每个自动化会在 12 小时内补跑最近一次错过的运行。
8. 连接 connectors。只给最小必要权限，并保留默认确认。可连接 Gmail、Google Calendar、Sheets、Drive、Notion、Slack、Shopify、Stripe 等；README 明确默认在发送、发布或删除任何东西之前询问用户。
9. 接入外部 CLI agent。前提：本机已经安装并可使用 Claude Code、Codex、OpenCode、OpenClaw、Hermes-Agent。Orkas 把它们作为本地会话运行，由 Commander 把任务分给更合适的 agent；外部 CLI agent 保留自己的模型设置。README 还说明 Commander 通过 dispatch_to、hand_off_to、run_worker 做任务路由，但未给出用户侧配置步骤。
10. 视频参考复刻可直接用这条提示词：
```text
Use reference.mp4 as a reference for a 30-second vertical promo. Keep its hook, typography and pacing, replace the content with my product and screen recordings, and show me the breakdown and plan first.
```
前提：reference.mp4 是可被 agent 读取的视频文件；README 明确不支持社交平台分享链接直接下载。适合 motion-graphic explainer、SaaS/app demo、用现有素材做的产品广告；精确运镜、真人表演和逐帧匹配不保证。
11. 原生依赖出错时，在仓库 checkout 内执行：
```bash
npm run native:repair
```
只检查不安装时执行：
```bash
npm run native:check
```
前提：使用 Node.js 24 LTS，最低 22.12.0。该命令会恢复可选包、修复 Electron 的 SQLite、准备隔离图像处理用的 bundled Node，并检查 SQL、sqlite-vec 和 sharp。
12. 最小试用：选一个边界清楚、交付物明确的流程，例如“每周研究简报+幻灯片”或“一条 30 秒产品推广视频”。先记录当前人工/单 agent 做法的基线。安装打包应用或从源码运行，配置一个模型 provider，建一个 project，放入目标、规则、参考文件和验收标准；拆 3–5 个 to-dos，先手动跑第一项并复核，再只对下一项开启 Auto-advance。加一个 daily 或 weekly 的 scheduled automation，连接一个低风险 connector，并保持默认发送/发布/删除前确认。若本机已有 Claude Code 或 Codex，可让一个 agent 做实现、另一个做复核，与单 agent 做法对比。视频场景直接用上面的提示词，要求先给 breakdown 和 plan。预期：拿得到可复核的产出；是否扩大范围由指标决定，不由“看起来自动化”决定。

### 做法 AG：用显式任务图 + epoch 围栏做本地执行控制面（skein）
1. 前提：Linux / macOS / Windows，amd64 或 arm64；或本机有 Go 1.26+ 用于源码构建；你有一组本地、有依赖、需要可中断的多步子任务。Skein 是执行控制面，不是 agent 框架或模型运行时：它管调度、停止、围栏和进程树终结，不管模型调用质量。
2. 安装二选一。Linux、macOS：
```sh
curl -fsSL https://raw.githubusercontent.com/Balanov/skein/main/install.sh | sh
```
Windows PowerShell：
```powershell
irm https://raw.githubusercontent.com/Balanov/skein/main/install.ps1 | iex
```
两个脚本会按当前 OS/架构选二进制，用 SHA256SUMS 校验后装进用户目录；用 SKEIN_INSTALL_DIR 可改安装位置。也可从 releases 下载，或源码构建：
```sh
go build -trimpath -o bin/skein ./cmd/skein
```
3. 先用仓库自带示例任务图跑基线（状态目录 .skein，2 个 worker）：
```sh
skein run --state .skein --workers 2 --include-tasks examples/fanout.json
```
预期：跑完后 .skein/runs/<run-id>/ 下有 report.json、events.jsonl、lease 与 payload 数据；先记录这份基线。
4. 做停止演练，验证三件事：
```sh
skein stop --state .skein --reason "manual emergency stop"
skein status --state .skein   # {"stopped":true,"epoch":2}
skein reset --state .skein    # inspect first; epoch is never reused
```
预期：旧 epoch 的排队工作失效；旧 epoch 的迟到完成被拒绝，而不是记成普通 canceled；被跟踪的进程树被终结、子进程心跳被冻结。reset 前先检查，epoch 永不复用——这是围栏语义成立的前提。
5. 用退出码分流，把“失败”和“被停止”分开处理：
```text
0  成功
3  某个任务失败
4  运行被停止
1  运行/运维错误
2  用法错误
```
预期：停止演练返回 4，而不是 3 或 0；不要把 4 当失败重跑。
6. 迁自己的任务图前先读 docs/INTEGRATION.md。README 只给概述、没给完整 schema；已知要点：JSON 格式；argv 数组、没有隐式 shell；依赖图；可复用的多趟（multi-pass）块；worker 与 pass 上限；每趟超时。把现在用脚本/对话串行跑的 3–5 个子步骤写成 manifest，其中至少一个步骤是真实子进程，再重复第 4 步的停止演练。
7. 需要嵌进自己的程序时，用 Go 嵌入 API：import skein "github.com/Balanov/skein"，可运行示例在 examples/embed-go/。
8. 从源码构建后自检：
```sh
go test -count=1 ./...
go vet ./...
go test -race -count=1 ./... # requires CGO and a C compiler
```
预期：测试与 vet 通过；race 检查需要 CGO 和 C 编译器。
9. 边界：外部系统要认它的 lease，必须另做会校验 lease 的网关；lease 是 fencing token，不是凭证；manifest 里的命令沿用当前 OS 用户权限，不可信负载要另用 OS 沙箱。它明确不覆盖沙箱化、鉴权或签名 lease、agent 输出语义校验、外部副作用恰好一次、崩溃后自动恢复、分布式共识、远程作业。

## 怎么判断变好了
**可观察的指标**
- A：盲评比分；冠军扛过的攻击里有多少条指向你原本没写进要求、但确实在意的缺口；是否实际采用；token 开销 vs plan --quick 的预估。
- B：合入 main 前的测试通过率；FARM_VERIFY_CMD 失败回注后子代理是否收敛；用量是否被节流在 5 小时窗口 85%、周窗口 80% 以内。
- C：手动切换终端和人工传话次数是否下降；rig ps --nodes 是否还有未解决的认证、信任或权限提示。
- D：同一任务三轮对照（普通 prompt / 加 ulw / 加 mass ulw），记录返工次数与人工介入次数。
- E：make doctor 是否能无阻断跑完；最小任务是否能跑通。
- F：output/report.md 是否真的落盘、内容能不能直接用；context 是否真的接上；{placeholder} 是否按预期注入。
- G：QA 报告真阳性率；QA 通过的 PR 中人工复核后确实可用的比例；周期时间 vs 自己动手；每个 PR 你要动手改多少。
- H：并行任务时文件互相覆盖/冲突次数；第二个同类会话是否还要重复解释约定；同行评审有效比例和误报率。
- I：从 agent 等待输入到人响应的时间；漏掉通知导致空转的时长；通知环、侧栏未读徽标是否可靠触发。
- J：每条条目是否都有 gate 绿+verifier 的 accept/reject receipt；越界提交是否被 lane 的 owns 授权拒绝；Needs you 里出现的是不是只有你能做的决定。
- K：● 待决策、◆ 待评审条目从出现到处理完的时间；你实际盯的窗口数 vs 只看面板；关卡是否真的拦住没清空的条目。
- L：从 agent 需要你到人响应的时间；关掉 dashboard 后 agent 是否继续跑；nsq up 后是否按各自 session 恢复；nsq cost 是否读得到 token。
- M：子 Agent 的平均轮次与工具调用次数是否下降；是否还会越修越乱；主 Agent 一次通过率、交接处返工是否变差。
- N：反方论点命中数；是否改变你的倾向；引用可核验率；成本对账；到期回看 verdict.md。
- O：从代理开始等待到人察觉的时间；从察觉到回答完成的时间；是否出现重复回答或冲突；关掉后设置文件是否精确还原。
- P：安装检查通过；团队是否按计划产出 diff/提交；gate 是否把每一步运行到日志并验证通过；cleanup 是否只移除 manifest 记录的内容。
- Q：进入下一阶段前是否真的能看到该阶段成本；实际总成本 vs 你设的预算；token 增长是否与任务复杂度匹配；新增代理前是否能估出边际成本。
- R：R1 看最近 3 天 issue 中有多少被真正复现；有多少修复在改代码前存在会失败的测试；这些测试在修复后是否通过；产出的 PR 有多少被合并或至少进入人工 review；人工返工比例；是否产生误报、重复处理或无关改动。R2 看 issue/PR 首次响应时间（人工介入前）；你本人每天花在非 UI/UX 事务上的时长；每天/每周 token 与 API 成本，与人工时薪对照；loop 给出的 PR 判断中事后被推翻的比例，用来衡量“拉下来真跑”降低了多少误判；定时清债清掉了多少、教训文档是否被后续 loop 实际读取；被拉黑提交的误伤比例。
- S：开关是否真的生效，能否观察到多个 agent 被创建/并行工作；单位任务总开销是否下降；Opus 侧上下文占用是否明显减少；测试通过率、diff 规模、返工次数是否不劣于基线；是否报错、中途丢失上下文、重复劳动或互相覆盖改动。
- T：单次 land 的端到端耗时；同一分支上并发 land 的成功率与需要人工介入的冲突比例；自动冲突解决被接受且后续没被 revert 的比例；graft-verify 捕获的回归数量、bisect 定位是否准确、自动 revert 是否误伤；权限控制是否真的挡住越权操作；增加服务节点后横向扩展是否如预期。README 未给数值目标，需自建基线。
- U：并行期间是否出现互相覆盖、需要人工解冲突的次数；把各自结果合并回主线所花的时间（对照组：不用 --worktree，两个代理直接在同一工作树里改同样的东西）；主工作树是否被代理污染、副本能否一键丢弃回退；副本目录是否按预期自动创建和清理。
- V：主会话被阻塞的时间——编排前后对比；同一批任务的墙上时间——与串行做一遍相比；返工率——产出需要人工纠正的比例，尤其是文件冲突导致的返工；状态可信度——status 报告的 agent 数量/状态与实际执行是否一致、账本在长会话 compaction 后是否仍然可用；成本——多 agent 并行带来的 token 消耗增量。
- W：你每天亲自处理 GTM/内容事务的时间（对比使用前两周）；rollup 里“需要你自己动手改”的条目占比；派给 Claude Code 的工作单元一次通过 review 的比例，以及失败案例里有多少能定位到 outcome / inputs / skill / limits 缺了哪一项；专才 Bot 与负责人 Bot 之间的往返轮次；反向信号——你在给 Bot 打补丁式加规则，或某个 Bot 的产出你从不采用。
- X：从 agent 需要你到人响应的时间；因并发抢同一工位导致的手工干预次数；队列里自动升为高优先级后是否仍出现长时间等待或饥饿；危机室触发到全部指令真的冻结（HTTP 423）所需的操作次数，以及期间是否发生越权发送；TODO.md 勾选比例与实际完成是否对得上；npm test 与 npm run check 是否稳定通过；后台标签页轮询与通知是否按预期工作、是否反而更打扰。
- Y：有效问题数——人工确认“真实存在且值得修”的条数，绝对值和每千行代码密度；重复率——同一 文件:行号 被多个子代理重复报出的比例，高于约三成说明分工切得不好（建议阈值，不是数据）；增量发现——并行方案比单代理方案、比现有 linter/SAST 多找出的有效问题条数；噪音比——误报数 / 总报告数；成本——整个流程的耗时与 token 消耗，对比单代理方案。
- Z：合规性——validator 连续退出 0；--selftest 能抓住负例；heartbeat 在试用期不出现 late/dead；无依赖环、无引用解析失败、attempts 不超 max_attempts。运行质量——看板中 errored agent 数、file conflict 数、stuck 数、人工干预次数、每任务 token 与 run time、重试次数；回放抽查是否有未审批的高风险动作。结果质量——每个 Task 的 acceptance 通过率、返工率、从创建到验收的周期时间；与同类的单 Claude Code 会话/人工基线对比。原文没有给目标阈值，需在试用前自定并记录。若只看板不改善验收通过率或降低人工干预，就退回只读监控或 study。
- AA：首次可验收产出的时间；任务总时长与总 token 成本；卡死率——超过预算仍无产出的任务占比；3 路并行中有产出的分支数；人工介入次数；评审类任务的收敛轮次与“来回互评不收敛”的发生率。A/B 各跑 5–10 次同类任务。
- AB：错配率——误领/重复领取次数 ÷ 总发放次数；核销确认率——账本里标 served 且附本人确认的条目 ÷ 全部标 served 的条目；重复劳动率——同一资源被两个 agent 重复采集/重复建造的次数；未服务高危对象的滞留时长；过度保守倾向——大规模失败后任务放弃率是否异常升高；失败事件日志密度。
- AC：是否自发出现分工与交接（在共享文件里看得见）；六项能力缺哪项最常卡住；三件套去掉一项后协调是否明显退化；重复劳动率与文件互相覆盖次数；单位协作产出的消息量与耗时（原文 50 agent 3 小时约 5,900 条消息，可作规模参照，不是目标值）。
- AD：跨会话/跨人一次确认的端到端耗时（人工转述 vs Imbo 直达）；人工转述次数是否降到 0；交接遗漏率——需要对方核对的事项中实际得到回复的比例；空闲会话利用率——原本等人来叫的会话被消息唤醒并产出有效改动的次数；打扰成本——每个会话因消息被中断的次数，以及“无内容可补故不回复”的比例（过高说明群组广播过宽）；安全指标（应为 0）——未经你确认的外发文件/数据次数、越权触碰生产或删除的次数、把附件内容当指令执行的次数。
- AE：任务完成率——派进去的小任务有多少拿到可评审 PR；从开始到可评审 PR 的时间；评审轮次与返工次数；人工介入次数与审批等待时间；每个完成任务的 token 成本（看 Usage and limits 与 weekly Report）；未授权的写操作次数（应为 0）；被审批拦下的危险调用条数；记忆或技能复用后同类任务时间是否下降；反向信号——你不断给代理补规则、或某个代理的产出你从不采用。
- AF：与基线相比看首次草稿时间、总周转时间、人工修改次数、返工率、遗漏或重复操作次数、权限误操作次数、credits/API 成本、引用准确率、自动化按时运行率、复核通过率。若时间下降且返工和权限风险没有上升，可继续扩大范围；若主要收益只是“看起来自动化”但复核成本更高，则退回 study，只保留其 project/to-dos/权限门控的设计思路。
- AG：停止后仍然存活的子进程数——应为 0（原文自证 160/160，你的负载上要自己复现）；迟到完成被接受的比例——应为 0；从 skein stop 到全部终结的时延——对照原文中位 141.663 ms，看你的机器与子进程形态；同一图多次运行的 report.json 一致性；与自写脚本 / asyncio 在同一张任务图上的端到端耗时对比（原文显示 100 个独立任务时 asyncio 中位 0.740 ms 反而快于 Skein 1.040 ms，别假设它一定更快）。

**最小试用**
- A：挑 1–2 个真实、不满意的任务，跑 /arena --quick --seed 7 并用 baseline 传入旧答案。
- B：单机+小仓库+一条已有测试命令，先验证 1–2 个编码任务。
- C：rig setup --dry-run + 两座位 starter，跑一个有界的实现+独立复核任务。
- D：半天内在可弃用机器上跑完三轮对照。
- E：先 make setup → make doctor → make docker-start。
- F：把手头一个多步资料整理 → 成文改写成 researcher + reporting_analyst 两个角色，看 output/report.md 能不能直接用。
- G：doctor → demo → 低风险小仓库，session limit 设 1–2，先关闭 auto-merge，跑 3–5 个真实 issue。
- H：半天到一天，一个仓库，只试隔离、记忆、提交前互评三件事。
- I：macOS 上装 cmux，跑 hooks setup，开 2–3 个终端型 agent，试通知与 ⌘⇧U、⌘I。
- J：先 pullboard tour；再选真实小仓库，写 1–3 行 approved SPEC.md，设真实 gate，配 1 条 builder lane + 1 条 review lane，用 2–3 个小条目走完整流程。
- K：装插件 → /console demo → /console refresh → 挑一两个可回滚项目建注册表和 STATUS 卡 → 走一遍派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审。
- L：装 neurosquad → 在 git 仓库跑 nsq run claude ... --worktree 和 nsq run codex --name reviewer → 打开 dashboard 试权限回答 → nsq up 恢复 → nsq ls/cost/diff/peek。
- M：挑一个中等规模编码任务，保留平时做法作对照，正交切成 2–3 块，子 Agent 指令写入禁止项，主 Agent 统一验证。
- N：挑一个真实、可逆、一周内能见效的决策，先跑 /roast-room --quick，再跑 check_quotes.py，到成功截止日回看 verdict.md。
- O：macOS 14+ 装 Muster，只对 Claude Code 开代答；开两个并行会话，制造权限请求和多选题，练 ⌥↓、⌥↩、⌥1–9。
- P：非关键项目、本地环境安装；先保持 relay，只对一个项目运行 /hivehouse:start <task>。
- Q：下一次多代理任务拆成 2–3 个阶段，每阶段开始前跑一次 /cost，记录成本、token、转移次数和耗时。
- R：只选一个自己熟悉的 GitHub 仓库，不要一上来跑 3 个 loop；先只启动 triage-github 这一个 loop，处理最近 3 天 issue，强制先复现、写一个会失败的测试、再修；跑一天后检查产出的 PR 或提交。若这条稳定，再按 R2 加代码协作值守 loop，规定 PR 必须 fetch 到本地跑构建与测试；然后加定时清债 loop，教训落成仓库内文本；最后才加 X 反馈 loop，并在前面用便宜模型粗筛。
- S：选一个非关键小仓库，构造一个包含“多环节”的固定任务；先不设变量跑基线；再开新终端执行 export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 后 claude，跑同一任务；30 分钟内完成对照。
- T：不改动现有仓库，先构建，然后跑 examples/graft/quickstart.sh；用 ./_build/bin/graft 熟悉 land、changeset、verify 子命令；拿一个非关键真实仓库按 [graft.storage] 的 shadow 模式做只读导入，核对一致；确认无误后再切 authoritative；只让少量 agent 走这套流程，暂时不开自动冲突解决。
- U：挑一个不关键的 git 仓库，开两个代理，都用 claude --worktree 启动，各派一个改动任务——先试改不同文件，再试改同一文件的不同区域，全程人工记录；对照组是不用 --worktree，两个代理直接在同一工作树里改同样的东西。
- V：在一个 git 仓库上新建分支、确保没有未提交改动；执行 npx skills add olivieropinotti/orchestrator-skill，在 Claude Code 中输入 /orchestrator；提一个含 2–3 个彼此独立子任务的需求，并明确各自负责的文件；观察主会话是否仍可继续对话、子任务是否真的并行、status 的条目是否与实际 agent 一致、stop/redirect 是否生效；结束前查看 .claude/orchestrator.md 核对账本。
- W：先不接执行层，只建 3 个 Bot（Chief of Staff + Outbound Lead + Lead Sourcer），用 agents/ 里对应文件的 instructions block 手工粘贴，只保留那 1 个例程，跑两周；第二周再把一个真实工作单元按 outcome / inputs / skill / limits 四要素派给 Claude Code。
- X：先跑 node scripts/installateur-anime.mjs --demo 看安装器会不会改动机器；再用 Releases ZIP 装一遍并确认 SmartScreen 解除锁定流程；起 node server.mjs，在 Herdr 里按 2×2 开四个面板，用控制台给队长发一条指令、制造一次目标忙碌看是否自动入队、按一次 Ctrl+Maj+C 看是否真的冻结下发（HTTP 423）；用 npm test 与 npm run check 自检；结束时 Ctrl+C 停服。
- Y：选一个 1 万行左右、你熟悉的有真实问题的仓库。自己定 5 类（安全、性能、正确性/错误处理、测试缺口、重复代码），按提示词结构跑一次，要求输出 文件:行号 + 严重度 + 建议，然后人工逐条判定。对照基线：同一个仓库、同一天，用单个 Claude Code 会话一次性做全量 review，以及团队已有的 linter/SAST 结果。
- Z：选一个低风险、边界清楚的项目，建立一个小 state（一个 Goal、少量有 output_contract 和 acceptance 的 Task、一个或少数 agent）；先只用 monitor 只读观察；再让 dispatch_command 指向只打印/生成草稿的脚本跑心跳；最后才接 claude -p。每次改 state 后运行 node conformance/validate.mjs path/to/state。
- AA：挑一类已知会卡住的任务（跨多文件 bug 定位，或 agent 互评式代码评审），A 组不设止损，B 组设 1–2 小时方向预算、到点无进展终止并拆 3 个不同方向子 agent；评审类额外设“最大轮次+连续无新增问题即停”；各跑 5–10 次同类任务。
- AB：选一件会被多人/多 agent 重复认领的事（领取稀缺资源、认领工单、占用同一台测试机），落地“预约—直取—本人确认”五步协议和带时间戳、带 supersede 的共享账本，跑两周。不需要任何工具安装，先用手工方式验证协议本身。
- AC：按仓库 README 装好 harness，先用 5 个 agent、30 分钟跑一个必须协作才能完成的目标，配齐 agent 目录+共享沙盒+DM；目录顺序至少随机一次或显式指定角色，再比较分工是否不同。
- AD：选两台机器（或同一台的两个会话），只接 Claude Code + Codex；互加联系人后跑一次跨会话提问，让对方空闲会话被唤醒并回复；再建 2–3 个会话的群，做一次只读的 spec 对照 diff；单独做一次边界测试：要求发送本地文件、删除文件、发带指令的附件，确认 agent 是否先来问你、接收侧是否把附件当数据；附件只放非敏感内容；试用期内不改生产凭据、不开生产权限。
- AE：先在一个低风险真实小任务上跑一遍（例如修一个非关键 bug）：一个频道、2–3 个代理（Claude Code 修复+Codex 评审，可选一个调查/路由）、一个只读 MCP（GitHub/GitLab 读 issue）、只借出一个仓库文件夹、merge/post/email/delete/purchase 全部设为审批、开一个每周例程扫新 issue。对照基线：同一类任务先用单人 Claude Code 或人工流程做 1–2 次，记录同样的指标（完成率、到可评审 PR 的时间、评审轮次、人工介入次数、token 成本）。
- AF：选一个边界清楚、交付物明确的流程，例如“每周研究简报+幻灯片”或“一条 30 秒产品推广视频”。先记录当前人工/单 agent 做法的基线。安装打包应用或从源码运行，配置一个模型 provider，建一个 project，放入目标、规则、参考文件和验收标准；拆 3–5 个 to-dos，先手动跑第一项并复核，再只对下一项开启 Auto-advance。加一个 daily 或 weekly 的 scheduled automation，连接一个低风险 connector，并保持默认发送/发布/删除前确认。若本机已有 Claude Code 或 Codex，可让一个 agent 做实现、另一个做复核，与单 agent 做法对比。视频场景直接用上面的提示词，要求先给 breakdown 和 plan。对照基线：同类流程先用人工或单 agent 做 1–2 次，记录首次草稿时间、总周转时间、人工修改次数、返工率、credits/API 成本。
- AG：跑示例 → 做一次停止演练 → 把 3–5 个真实子步骤写成 manifest 再演练一次；半天内可做完。先记录 .skein/runs/<run-id>/report.json 与 events.jsonl 作为基线，再检查退出码是否为 4、status 是否为 stopped true 且 epoch 递增、旧 epoch 的迟到结果是否被拒绝、停止后残留子进程是否为 0。

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
- R：先只跑代码协作值守这一条 loop，一到两周；若 issue/PR 首次响应时间下降、你本人花在非 UI/UX 事务上的时长下降、PR 判断被事后推翻的比例可接受，再加定时清债 loop；定时清债稳定后再加 X 反馈 loop。若两周内人工审核 loop 输出所花的时间接近自己直接做的时间，说明输入量不足或判断标准没调好，退回单条 loop 或放弃。三条同时上是原文形态，但首轮验证没必要承担三倍成本。
- S：只做一次 30 分钟对照不构成采用依据。若开关无效或行为与基线无差别，降级为 watch；若有并行但质量或成本变差，不写入手册或只作谨慎注记；只有并行确实存在、成本下降且质量不掉，才考虑作为可选实验配置，并注明实验性与验证日期。
- T：先以“临时目录 quickstart 跑通+非关键仓库 shadow 只读导入+少量 agent 且 resolver none”为最小范围；确认单次 land 耗时、并发 land 成功率、人工介入冲突比例、graft-verify 误伤率可接受，再扩大到更多 agent；没有量化对比前不扩大到关键仓库。
- U：先在一个不关键仓库、两个代理、一两个任务上试半天到一天。如果编辑期冲突减少，但合并耗时和人工成本持平甚至更高，那只是把问题挪了个位置；只有在整体耗时或返工明显下降时，才值得写进手册。
- V：先在 1 个仓库、2–3 个独立子任务上试一次。如果返工率或成本明显上升、或 status 与账本不可信，则不宜升级为常规做法；只有主会话阻塞时间下降、墙上时间不劣于串行、且返工没有变多，才可能重复使用。
- W：建议 2 周两阶段——第一周只建 3 个 Bot 且不接执行层、只留 1 个例程，先测出“编排层本身值不值”；第二周再接一个真实工作单元。
- X：先半天到一天，跑通安装、一轮指令队列和一次危机室冻结即可判断“它对你的可见性有没有帮助”。若 npm test / npm run check 通不过、或界面行为与描述不符，降级为 watch，不要接进日常调度。
- Y：先跑一次，不构成采用依据。只有当“增量有效发现明显 > 0”且“噪音比与重复率在人工可承受范围内”时，才把这条流程固化进手册；否则降级为“值得知道的一种提示词写法”。
- Z：先以“小 state + 只读 monitor + 草稿 dispatch”跑一到两周；validator 连续 0、heartbeat 不 late/dead、看板能降低人工干预或提高 acceptance 通过率，再扩大到真实派发；没有达到就退回只读监控。高风险派发始终保留 human.* Event 人工审批。
- AA：先跑 5–10 次同类任务；若 B 组在首次可验收产出时间、卡死率、评审收敛轮次上稳定优于 A 且成本可接受，再把阈值和时间盒写进流程；否则先调整方向切分方式，再判断这条经验是否成立。
- AB：先在共享仓库、共享库存这类场景跑两周，只观察错配率、核销确认率、未服务高危对象滞留时长三项。若错配率明显下降且账本状态可信，再把它写进所有派工流程；若账本开始被随手覆盖、或确认率低于一半，先修协议（三态、时间戳、本人确认）而不是加 agent 数量。
- AC：先 5 个 agent、30 分钟跑一次；能观察到自发分工与可追溯的交接，才把它扩到更长时间和更多 agent。扩之前至少对比一次“随机化目录顺序 vs 固定顺序”，确认你看到的管理行为不是顺序伪影。
- AD：先试 1–2 周，只在非生产、只读任务上使用。若跨会话确认的端到端耗时和人工转述次数明显下降、交接遗漏率下降，且安全指标为 0，再考虑扩大到更多会话或自托管；若消息投递出现不可解释的丢失/延迟、安全指标不为 0，或团队仍靠人工转述兜底，就退回人工转述+清单内已有的单会话做法。
- AE：先按最小组合跑 1–2 周、2–3 个代理、一次一个真实小任务。若任务完成率不降、到可评审 PR 的时间缩短或返工减少，且未授权的写操作始终为 0、审批等待没有把节奏拖死，再考虑加代理、开第二个连接器写权限或接例程自动化；若只是频道热闹、PR 你从不采用，或审批变成无脑点“允许”，就退回单人 Claude Code+明确的测试/评审门禁，只保留其按代理授权与审批的思路。
- AF：先试 1–2 周，只做一条流程、3–5 个 to-do、一个 daily 或 weekly automation、一个低风险 connector。若首次草稿时间或总周转时间下降，且人工修改次数、返工率、权限误操作次数没有上升，再考虑对下一项开启 Auto-advance、增加 automation 或接入更多外部 CLI agent；若复核成本更高、自动化按时运行率低、或 credits/API 成本不可接受，退回手动跑 to-do，只保留 project 和权限门控的设计思路。
- AG：先在你自己的工作负载上验证停止证明，再用于生产；三项安全指标（残留子进程 0、迟到完成被接受 0、停止时延可接受）成立，且任务确实是“本地 + 有依赖 + 需要可中断”，再扩大；涉及外部写入、不可信命令或跨机调度，按原文的“不覆盖”清单另补沙箱、网关和幂等层。

## 常见坑
- A：任务含糊，100 个 agent 会一起含糊；任务文件是唯一信息源；judge 也是 Claude，评分有偏差。
- B：不设 FARM_VERIFY_CMD 等于没有质量门；多机共用 farm 需要真实 DynamoDB 表+共享仓库。
- C：启动会写入 provider hooks 和 workspace trust 设置，先备份；原生 Windows 不支持。
- D：安装脚本是 curl | bash，只在可弃用环境试；mass ulw 的图如何定义、如何限制并行度、如何统计花费，材料里没有。
- E：抓到的原文在 Option 2 处被截断，skills / sub-agents / scheduled tasks / memory 只有标题。
- F：涉密场景先自己查文档再跑；这是开发框架，不是装完即用的工具。
- G：项目必须已托管在 GitHub 上；auto-merge 只有 README 描述，先关掉它。
- H：Offrun 仅 Apple Silicon Mac；同行评审发现落到 chat 里由你判断，不要自动合并。
- I：仅支持 macOS；装 hooks 前 agent CLI 必须在 PATH 上；本机 local-tmux 活不过 logout、重启、关机或断电。
- J：项目很小，部分功能仍是 planned；worktree 身份不是安全边界；没有设 gate 就没有 submit/push 前的门槛。
- K：强依赖环境与版本；状态和关卡建立在你自建的项目注册表和 STATUS 卡上；设置只影响下一次派工。
- L：0.1.0 preview；nsq run -- 的任意命令没有 hooks，永远不会出现 needs you；手机端链接携带 pairing token，当密码对待。
- M：原文在“2. 任务拆解：正交隔离”处被截断；只有作者主张、没有数据；不要用做法 M 替代合入门禁。
- N：顾问是模拟人格，不是本人；check_quotes.py 只验证引文是否在 brain 里且有来源，不验证来源是否被正确解释。
- O：仅 macOS 14+；只覆盖 Claude Code / Codex / Cursor；Cursor 只能跳转、不能代答。
- P：工作文件夹绝不能是项目本身；默认 relay 模式每次 start / wake / answer 都等你；delegate 模式涉及 bypassPermissions 和复制 secret 文件到远程的风险。
- Q：推文级材料；只有一组单次观测数据，没有基线、阈值或对照；阶段检查依赖你能读到阶段成本。
- R：两次调研都是推文级或二手总结，没有给出 /loop 完整配置、提示词原文、循环间隔、X 筛选标准和任何量化数据；R1 的 watch-social 片段被截断，第三个 loop 细节缺失，不要照不完整片段猜。R2 的“PR 拉下来真跑”是明确可照做的约束，“人晚上只铲 UI/UX”是作者对效果的主张，不是已验证结论。常驻循环 + Opus 的 token 消耗要单独记账；自动拉黑与自动评论有误判风险，原文未提 loop 内部如何设人工审核，必须自己加；三条同时上是原文形态，首轮验证先只跑一条。
- S：原文只有一行环境变量加启动命令，没有任何效果数据、案例、截图、文档链接或 Anthropic 官方出处；互动量很低（61 赞、3 转发、6 回复）；模型名 Opus 5.5 / Haiku 5.5 与常见版本号命名习惯不符；环境变量名含 EXPERIMENTAL，可能随时改名或移除。不要把它当团队规范或生产流程的稳定依赖。
- T：0.1.0，接口在 1.0 前可能变动；构建要编译内置 Git，依赖较重；已知缺口写在 LIMITATIONS.md；README 未给出与传统 Git 或其他方案的对比数字；banner 图注里的“50 agents on one branch retry and fail with push, rebase, retry”“100 against 200 changes landed”是配图说明，不是可核验的基准结果；只跑一两个 agent 的个人或小团队收益未经验证；存储迁移必须影子模式先导入、确认无误再切 authoritative。
- U：原文只有一句话加一个命令，没有截图、命令输出、版本号；作者称方法来自 Anthropic 的分享但没有给出处；“让三个代理可以同时编辑同一个代码库而不会冲突”是作者主张；原文未涉及合并成本，存在把冲突从“编辑时”推迟到“合并时”的可能；不要拿它当安全边界，也不要补写原文没给的版本要求、副本位置、合并与清理方式。
- V：本次材料只有 README，不是完整文档；never blocks、3-5 agents work、survives context compaction、follow-up 发给同一主题 agent 以保留上下文，全部是作者自述；必须使用 Claude Code，且项目需可写 .claude/ 目录；并发上限、token 成本、多个 agent 同时改同一文件的冲突处理、失败回收流程，原文均未交代。
- W：本次材料只抓到 README，setup-prompt.md 与 agents/*.md 的实际提示词正文没有出现在输入里，第 3 步和第 5 步的核心内容无法照抄；README 依赖 OXYGEN 及其 CLI，且带 OXYGEN 推广链接、作者是 OXYGEN 联合创始人；适用条件偏具体；没有任何成本与安全/权限边界说明；不要一上来就建 13 个 Bot。
- X：没有 Herdr 就跑不起来；24 款工具里只有 Claude Code、Codex、OpenCode 有增强遥测；环境变量名在文档里不一致（BUREAU_PORT 与 BBUREAU_PORT），默认端口 4317，照抄前先确认；README 中出现的模型名本次无法核对；“100% 本地、零 npm 依赖、无出网、不存 key”“事实真实、不模拟智能体、不发明百分比”都是设计声明，没有第三方审计或测试报告；危机室冻结的是指令下发并请求礼貌中断，不替代测试、评审与合入门禁。
- Y：原文在列举第 3 类问题时被采集截断，5 类问题只知 2 类（安全、性能）；原文完全没有提汇总、去重、误报处理，也没有提 token 成本与耗时；子代理各自独立上下文，天然存在重复报告同一处问题的风险；“新上下文能让审查更干净、5 个并行比 1 个更好”只是作者主张；不要把报告直接当修复清单，先人工复核，再走测试与合入门禁。
- Z：个人早期项目、macOS-first；Linux 只说可用 systemd 等价，未给 unit；截图展示“三个项目、19 个 agent”是合成演示数据，明确没有真实项目或路径；stars 33 只是输入指标，不是效果数据；原文没有成功率、成本节省、可靠性、规模上限或对照实验。validator 只能结构性检查 append-only（seq 单调、行可解析），不能检查历史写入，追加写入靠 writer 自律；heartbeat runner 的具体入口 README 未列出，需查仓库。高风险命令的人工审批是规范要求，不是自动保证。不要只看板不改善验收通过率或降低人工干预就继续扩大。
- AA：原文是单条推文、转述他人经验，点赞 48、转发 8、回复 6；1–2 小时和 3 个子 agent 都是经验值；“多数时候立刻见效”是主观判断；“两个 agent 能互相忙一整晚”是引述的二手结论；原文在“我给自己的 AI”处截断，没有命令、配置、提示词或实现细节；并行会抬高 token 成本，需看是否被时长下降抵消；3 路长期只有 0–1 路有效，说明方向切分方式有问题，而不是阈值本身；不适用于必须一次连续完成、无法观测中间产出、重启成本高于继续死钻的任务。
- AB：工具层的“拿取记录”不等于送达——原文明确 Tool pickup attribution alone is insufficient，必须由接收人本人回报才能标 served；不要把稀缺物资“丢进人群”让别人自取；账本里“报告值”不是实时值，未确认发放不算已发，没有 supersede 规则多人写同一份状态会互相覆盖；原文的反例 Esme/Noor 一次误领直到 time13207 才被本人纠正，说明没有确认环节时错误会长时间存活；另外原文的死亡几乎无代价（只掉装备加一行日志），真实工作里失败有成本，行为策略不可直接照搬。
- AC：目录顺序会造出伪层级——原文里排第一的 Ada 成了事实上的领导者，这是评测设计带来的伪影，迁移时应主动随机化顺序或显式指定角色；首夜 22 死（占全程 34 死的大多数）之后 agent 普遍变得过度保守、放弃原定任务，说明反馈信号强度直接改变策略，配反馈时要想清楚你希望它冒险还是保守；50 个 agent、约 5,900 条消息意味着巨大 token 与时间成本，原文没给成本数据，不要一次复刻；原文是项目介绍页不是教程，harness 的安装、配置、提示词要看仓库；Mindustry 部分在抓取时已截断，不能据此下结论。
- AD：项目很新（31 stars）、仍在 0.x，原文只有作者自述文档，没有安全审计、第三方评测或真实团队使用案例；默认走 imbo.dev 托管服务并用邮箱注册，会话元数据经第三方；curl | sh 安装方式引入供应链风险；安装器会给 Imbo 工具免逐次审批，等于扩大 agent 的自主动作面；agent 可能不先问你即回复，多 agent 环路上存在信息外泄与被诱导风险——原文只做了“发送文件/数据、删除、对外发送、花钱、碰生产前先问”的约束声明，必须自己做边界测试；消息“在两次工具调用之间落地”“回复唤醒空闲会话”“没内容可补的会话不回复”来自 README 的 GIF 说明文字，没有延迟数据、成功率、并发上限、失败重试语义、消息持久化/离线补投行为的说明；平台不含 Windows；自托管需要域名、证书、SMTP，运维成本不低；它只是胶水层，不能替代测试、独立 verifier 或合入门禁。
- AE：材料只有 README，没有独立复现；仓库 36 stars，采用规模有限，多代理协作效果、审批体验、长期记忆质量、例程可靠性都未量化，没有 benchmark、任务成功率、成本对比或安全审计。README 里的 Iris 在 Datadog 找到错误、Leo 修复并开 merge request、Nico 评审并请求合并审批只是产品说明中的示例，不是独立测评。“数据留在本机、无 Tucano 服务器、密码不进数据库、每轮隔离、工具按代理授权”都是作者主张，需要自行验证。Claude Code 只读 ~/.claude/settings.json 的 env 和 apiKeyHelper，hooks、插件和权限不进入 Tucano；Codex 用独立 home，避免个人 skills、AGENTS.md 和插件泄漏——这两条意味着你在原 CLI 里配好的 hooks/权限不会自动生效，别以为换个壳就继承了旧防护。Windows 安装包未代码签名，公司电脑可能被 IT 阻止，Windows 还需 Git for Windows。审批一旦变成无脑点“允许”，等于没有闸门；它只是编排层，不能替代测试、独立 verifier 或合入门禁。
- AF：README 主要是产品说明，没有独立基准、客户案例数据或前后对比；16 个 agent 的能力、DeepResearcher 的“verified sources”、ProductDeveloper 的“verifiable results”都是作者主张。项目/待办/自动化的按钮级操作步骤没有给出，任务路由的具体判定标准也没有展开。打包应用需要登录，内置模型走 Orkas 管理服务；源码版不支持共享项目、云同步和 web-app 发布。自动化依赖电脑唤醒和 Orkas 运行，不能关机后继续。视频复刻不支持社交平台分享链接下载，也不保证精确运镜、真人表演和逐帧匹配。后台学习 review 也可能判断没有值得保存的内容。不要一上来建 13 个 Bot 或全量开 Auto-advance；先把 project、to-dos、权限确认和人工复核跑顺。
- AG：0.2.0 早期版本，单作者项目，社区验证有限；基准全部在作者单机、单一 OS 上测得，无第三方复现；100 个独立任务时 asyncio 中位更低（0.740 ms vs 1.040 ms），Skein 并非处处领先；manifest 完整契约不在 README，需读 docs/INTEGRATION.md；lease 是 fencing token 不是凭证，外部系统要认它必须另做校验网关；manifest 命令沿用当前 OS 用户权限，不可信负载要另用 OS 沙箱；它不覆盖沙箱、鉴权、agent 输出语义校验、外部副作用恰好一次、崩溃后自动恢复、分布式共识、远程或脱离本机的作业；不要把“叫停”当成结果正确性的证明——它只保证旧任务不偷偷完成，不保证结果对。

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
- K 依据调研《SaM-runtime/claude-console》。可核对：安装命令、demo/refresh、插件配置与默认值、注册表+STATUS 卡、dispatch.json、执行者解析顺序、动作键、guard 默认值、Git/PR/CI 探测。一个控制台承担跨项目监督属作者主张；仓库 53 stars、0.15.x、UI 繁体中文。
- L 依据调研《glmn-ai/neurosquad-cli》。可核对：安装、nsq run 命令、分支名、dashboard 按键、down/up、ls/send/answer/peek/diff/cost、provider 配置、数据目录、doctor。README 自标 0.1.0 preview，无改善幅度量化指标。
- M 依据调研《@yanhua1010》。可核对：两条规则（子 Agent 不 Build/Test/Typecheck、早提交早返回；任务正交隔离）、架构名称、原样指令文本。剥离验证防止越修越乱属作者主张，无测量方式；原文在正交隔离处截断。
- N 依据调研《nateherkai/roast-room》。可核对：克隆命令、npm start 与端口、/roast-room、--quick/--seats/ask、六项输入、目录结构、check_quotes.py、报告路径、成本量级、114 stars。顾问由公开作品构建、引用有出处是设计声明；辩论提升决策质量无实测。
- O 依据调研《josefchen/muster》。可核对：macOS 14+、brew 安装、逐代理开启、Claude Code 支持类型、Codex /hooks、Cursor 只跳转、快捷键、URL scheme、pricing.json、构建/测试脚本、备份路径、只读会话、资源占用、MIT、73 stars。改善等待时间属作者主张。
- P 依据调研《Cleveland-RD/hivehouse》。可核对：安装命令、依赖版本、claude plugin list、userConfig、hh-hub init/start、技能表、docs-health-check、hh-slot status、delegate 规则、清理范围、测试脚本、30 stars。bin/ 机械动作经过测试与 docs-health-check 是 Unverified here；无任务完成率/成本/质量数据。
- Q 依据调研《@Klonzu》。可核对：别再添加无法定价的代理、下一阶段前检查成本、/cost、演示面板数据（5 个代理、20 秒、4.18 美元；19 次转移；token 198,628→233,055）。数据来自一次演示面板，无基线/阈值/对照。
- R 合并两条调研：R1 来自《@hwangxin》，可核对：复刻 magpie 并用在 Readest 跑一天；Claude Code + Opus 并行跑 3 个 /loop；triage-github 处理最近 3 天 issue、先复现、先写失败测试再修；watch-social 截断；PR 6796；60 likes、8 reposts、6 replies；效果很好属作者主张，PR 只能说明有产出，/loop 完整配置与第三个 loop 未给。R2 来自《@MindfulReturn》，是对 yetone 维护 Magpie 所用方法的二手总结，可核对：三条互不干扰的常驻循环分工（GitHub issue/PR 与 Discord；X 反馈；定时技术债、教训沉淀、低质提交拉黑）；Claude Code + 官方 Opus 为主力；X 反馈前用便宜模型粗筛；PR 不能只看 diff，必须拉下来真跑；人晚上只铲 UI/UX。局限：只有推文长度总结，无 prompt 原文、无 loop 间隔、无判断标准、无任何量化数据；“人晚上只铲 UI/UX”是作者对效果的主张；常驻循环 + Opus 的 token 消耗、自动拉黑与自动评论的误判风险都需自行控制；原文未提 loop 内部人工审核点。本手册把 R 写成两阶段：先跑 R1 单 loop，再按 R2 加代码协作、定时清债、X 反馈三条，最小试用与指标是据此补充的试用设计，不是原文数据。
- S 依据调研《@mirku21》。可核对：唯一命令 export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 和 claude；61 赞、3 转发、6 回复；无效果数据、案例、截图、文档链接或 Anthropic 官方出处。Opus 级架构与节省上下文属作者主张；模型名无法确认；变量含 EXPERIMENTAL。
- T 依据调研《feder-cr/git-ai》。可核对：MIT；fork 自 Gitaly；版本 0.1.0；Go 1.26、C 工具链、Meson、Ninja；examples/graft/quickstart.sh 与 config.toml；文档列表。传统 Git 对 agent 是瓶颈无测量；测试覆盖未给数量；banner 图注不是基准；接口可能变、LIMITATIONS.md 有已知缺口、构建重、无对比数字。
- U 依据调研《@thedelost》。可核对：唯一操作是 claude --worktree，以及 101 赞/15 转发/8 回复。让三个代理同时编辑不冲突属作者主张，三个代理是举例不是实测；作者称来自 Anthropic 分享但未给出处；命令当前版本是否存在未核实。只列为待自测候选。
- V 依据调研《olivieropinotti/orchestrator-skill》。可核对：安装命令、/orchestrator、status/stop/redirect、关闭方式、账本路径、模型选择规则、MIT、约 38 stars。never blocks、3-5 agents、survives compaction 等属作者主张，无 benchmark/对比/案例/失败模式/成本数据。
- W 依据调研《timscheuerai/grokbot-gtm-team》。可核对：13 Bot + 1 群聊 + 1 例程角色表、四步导入、5 个问题、agents/ 下 instructions block、guides 文件、交接四要素、每任务 1 worktree、内容本机/代码 dev server、MIT、30 stars。让 Bot 带队更有效、文案图形视频质量不够、晨报是 slop、routine 从 10 减到 1 更好属作者主张；只抓到 README，提示词正文需自取；依赖 OXYGEN 且有推广链接。
- X 依据调研《BlackAngel242/ MyTeam》。可核对：安装命令与参数、演示模式、默认端口 4317、环境变量、快捷键、HTTP 423 冻结、POST /api/crise/arret、.bureau/ 持久化文件、24 款工具与三款增强遥测、npm test/check、MIT、32 stars。100% 本地、零 npm 依赖、无出网、不存 key、事实真实等属作者主张；材料在作者主张段被截断，模型名无法核对；环境变量名不一致；界面行为只有描述。
- Y 依据调研《@RoundtableSpace》。可核对：5 个子代理、每个全新上下文、按问题类别分工；安全与性能两类检查项；183 赞、10 转发、34 回复。新上下文更干净、5 个并行更好属作者主张，无案例/前后对比；原文在第 3 类处截断；汇总、去重、误报、成本、耗时未给；第 3–5 类、输出格式、汇总去重与人工复核是补充做法。
- Z 依据调研《tomtomsatnav/agent-orchestration-standard》。可核对：SPEC、JSON Schema、零依赖一致性校验器、参考 server、heartbeat runner、Web/Terminal UI、MCP、notifier、make 目标、配置样例、launchd 样例、安全模型；命令与配置可照做。数据/案例：截图展示“三个项目、19 个 agent”的合成演示数据，明确没有真实项目或路径；33 stars 是输入指标；没有成功率、成本节省、可靠性、规模上限或对照实验。作者主张：隐私优先、布局无重叠、粒子流自适应、主题对比度等，部分由自动化测试覆盖但未独立验证。项目状态为个人项目、macOS-first；Linux 仅说可用 systemd 等价，未给 unit。validator 只能结构性检查 append-only，不能检查历史写入，追加写入靠 writer 自律；heartbeat runner 具体入口需查仓库。高风险命令人工审批是规范要求，不是自动保证。
- AA 依据调研《@runes_leo: Yifan 的经验：agent 往一个方向钻 1–2 小时还没结果，基本就是进死胡同了》。可核对：单条推文、48 赞、8 转发、6 回复；1–2 小时方向预算、拆 3 个子 agent 各想一个新方向、评审要有停止条件；原文在“我给自己的 AI”处截断。原文没有命令、配置、提示词、样本量、失败案例或成本对比；“多数时候立刻见效”是作者主观判断；“两个 agent 会互相来回忙一整晚”是引述的二手结论；止损预算、3 路不同方向、评审停止条件的具体落地是按原文主张做的合理落地，不是原文原文。
- AB 依据调研《We ran AI agent swarms in Minecraft and Mindustry》（YC Labs 与 Olam Labs 的蜂群实验）。可核对：Civ50 用 50 个 agent 在生存模式 Minecraft 跑 3 小时、目标“Build a thriving civilization”、约 5,900 条消息；首 90 秒内把出生点附近的树几乎砍完；层级按 directory 顺序形成、排第一的 Ada 成为事实上的领导者；首夜 22 死、全程 34 死；plans/settlement.md 与 notes/food-queue.md 的原文片段；一次误领（Esme 吃了给 Noor 的鸡肉）与一次“已 pickup 但接收人无库存”的纠正；death_log.md 每死一次写一行；Ada 第三夜后写下的停工备忘录原文。协议本身（预约—直取—本人确认、三态账本、时间戳与 supersede）来自原文明确陈述与反例，属可核对部分；“多智能体动态是 AI alignment 最紧迫问题之一”“千 agent 蜂群解决数百开放数学问题”等是动机论述，不是本文实验数据；Minecraft 之外只提到也在 Mindustry 做了实验，抓取正文在该部分之前已截断。
- AC 依据同一篇调研的架构描述与实验记录。可核对：六类能力（observe / reason / remember / act / message / write-execute scripts）、三件套（agent directory、shared sandbox、DM）、基于 Mineflayer 的脚本工具、核心 agentic loop 用 Pi 运行、harness 已开源（github.com/yc-software/minecraft-agent-harness）、正在跑的 25 个 agent 新殖民地（Twitch 直播，正文未给结果）。原文自比 Hermes、OpenClaw、QM，属作者定位；harness 的安装、配置、提示词需看仓库，本文不臆造；“50 个 agent 规模”与“约 5,900 条消息”是这一场的观测，不是推荐规模；另有一个 25 agent 的实验无结果数据。
- AD 依据调研《Bearisbug/imbo》。可核对：安装命令与安装器行为（写入 ~/.local/bin、邮箱码登录、launchd/systemd user service、勾选工具、列出改动、imbo uninstall 回滚）；六种工具的接入方式对照表；CLI 命令样例（whoami、contact add/requests/accept/list、group create/invite/join、send、inbox、status、update）；附件路径 ~/.imbo/files/；agent 侧五个工具名；授权边界清单（外发文件、删除、花钱、碰生产前先问）；自托管 docker 命令与六个环境变量语义；cargo build --release / cargo test --workspace；License Apache-2.0；平台 macOS/Linux、arm64/x86_64；31 stars，0.2.11 之前无 imbo update。只是作者主张、无独立证据的部分：消息“在两次工具调用之间落地”“回复唤醒空闲会话”“没内容可补的会话不回复”，均来自 README 的 GIF 说明文字，没有延迟数据、成功率、并发上限、失败重试语义、消息持久化/离线补投行为的说明；没有安全审计、没有第三方评测、没有真实团队使用案例与前后对比指标。风险：默认托管服务、curl | sh、安装器免审批、agent 可能不先问即回复；不能替代测试与合入门禁。
- AE 依据调研《eduwxyz/tucano》。可核对：README 给出的平台要求（macOS Apple silicon、Linux x64/ARM64、Windows 10/11 x64）、各平台安装命令、首次运行向导步骤、Connectors 与按代理的 no access / read / read and write 授权、审批模型（approve once / always allow safe one / refuse with reason）、Telegram 手机审批、月度 token 限额、Pause everything、Memory 页与 skill 提议、Routines 的定时与连接器事件触发、quiet hours、托盘常驻、Docker/浏览器借出、searched/read/ran/edited 回执与 weekly Report、Claude Code 只读 settings.json 的 env 与 apiKeyHelper、Codex 独立 home、仓库 36 stars。属产品说明示例、非独立测评：Iris/Leo/Nico 那条 Datadog → 修复 → merge request → 评审 → 审批的链路。“数据留在本机、无 Tucano 服务器、密码不进数据库、每轮隔离、工具按代理授权”是作者主张；没有 benchmark、用户数、任务成功率、成本对比或安全审计，多代理协作效果、审批体验、长期记忆质量、例程可靠性均未量化。本手册中的最小试用组合与判断指标是据此补充的试用设计，不是原文数据。
- AF 依据调研《Orkas-AI/Orkas》。可核对：MIT 许可；源码运行命令 git clone https://github.com/Orkas-AI/Orkas.git、cd Orkas、./run.sh，Windows 用 run.cmd；macOS 12+/Windows 10+ 打包安装，Linux 源码需 glibc 2.34+ x64/arm64 且不支持 Alpine/musl；源码需 Node 22.12+；首次启动准备 pinned Python、uv、Node、embedding model（约 95 MB）、OfficeCLI、FFmpeg、whisper.cpp 和多语言语音模型资源；工作区 ~/.orkas/；Settings → AI Providers 配置模型；Account settings → Models → Chat → Add model → Custom 配置本地 OpenAI-compatible 或 Anthropic-compatible endpoint；支持 Claude、OpenAI、Gemini、DeepSeek、Kimi、GLM、Qwen、MiniMax、Doubao；project 保存目标、规则、记忆和文件；to-dos 与 Auto-advance；scheduled automations 支持 hourly/daily/weekly/monthly，v1.9 起错过后 12 小时内补跑；connectors 默认在发送、发布或删除前询问；外部 CLI agent 通过本地会话接入，Commander 用 dispatch_to、hand_off_to、run_worker 路由；视频复刻提示词原文；npm run native:repair 与 npm run native:check，Node.js 24 LTS 最低 22.12.0；GitHub 显示 6785 stars、当日 1044 stars。属作者主张、无独立验证：16 个内置 agent 的能力、DeepResearcher 的 verified sources、ProductDeveloper 的 verifiable results、后台 review 会更新自我评估与学习技能；没有准确率、返工率、成本或前后对比数据；项目/待办/自动化的按钮级操作步骤和任务路由判定标准未给出；打包应用需登录并走 Orkas 管理服务；源码版不支持共享项目、云同步和 web-app publishing；自动化依赖电脑唤醒和 Orkas 运行；视频复刻不支持社交平台分享链接下载，也不保证精确运镜、真人表演和逐帧匹配。本手册中的最小试用与判断指标是据此补充的试用设计，不是原文数据。
- AG 依据调研《Balanov/skein》。可核对：install.sh 与 install.ps1、SHA256SUMS 校验、SKEIN_INSTALL_DIR、源码构建命令 go build -trimpath -o bin/skein ./cmd/skein、skein run/stop/status/reset、退出码 0/3/4/1/2、.skein/runs/<run-id>/ 下的 report.json 与 events.jsonl、examples/fanout.json、examples/embed-go、docs/INTEGRATION.md、manifest 要点（JSON、argv 数组、无隐式 shell、依赖图、multi-pass、worker/pass 上限、每趟超时）、Go 1.26+、MIT、0.2.0。数据：Windows 11 / Ryzen 9 5950X 上 1000 节点图三种形态的耗时（Independent 1.580 ms、Serial chain 3.272 ms、Fan-out/join 2.080 ms；对照 Python asyncio 与 LangGraph）；冷进程 24 个真实 Python SHA-256 worker、15 次全新进程，Skein 中位 156.463 ms，asyncio 288.644 ms，LangGraph 998.010 ms，360/360 结果校验通过；停止证明 160/160 父子进程树被终结、160/160 子进程心跳被冻结，20 次运行中位 141.663 ms。作者主动承认 100 个独立任务时 asyncio 中位更快（0.740 ms vs 1.040 ms），并声明这些是本地观测，不是通用排名，也不是模型质量结果。明确不覆盖：任意命令沙箱化、鉴权或签名 lease、agent 输出语义校验、外部副作用恰好一次、崩溃后自动恢复、分布式共识、远程或脱离本机的作业、已经越过外部边界的副作用。256 stars、单作者项目，社区验证有限；0.2.0 早期版本，作者要求先在工作负载上验证停止证明再用于生产。

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
- [@runes_leo: Yifan 的经验：agent 往一个方向钻 1–2 小时还没结果，基本就是进死胡同了。这时候停掉它，拆出 3 个子 agent 各想一个新方向，多数时候立刻见效。他引的 Claude Code 团队](../research/radar/2026-10-21/5652-yifan-agent-1-2-3-agent-claude-code.md)：值得一试，建议小范围试：给 agent 的单个探索方向设定 1–2 小时时间预算，到点仍无进展就终止，拆成 3 个各走不同新方向的子 agent，并给评审类循环预设停止条件；理由是这条经验把“什么时候该放弃”变成了可执行规则，但原文只是一条从业者经验、无数据和实现细节，需自己量化验证。
- [We ran AI agent swarms in Minecraft and Mindustry](../research/radar/2026-10-30/8443-we-ran-ai-agent-swarms-in-minecraft-and-mindustry.md)：值得一试，把两个可直接借鉴的做法小范围试用：一是“共享文件 + 预约—直取—本人确认”的多智能体协作与核销协议；二是这套已开源的 Minecraft agent harness，用于搭建长时运行、能记忆和写脚本的 agent。理由是原文给出了可直接参照的协调产物模板和分配规则，但安装与配置细节在仓库而不在正文，因此先试不直接采用。
- [Bearisbug/imbo](../research/radar/2026-10-30/8508-bearisbug-imbo.md)：值得一试，建议小范围试用：用 Imbo 在两个编码 agent 会话（或两台机器、两个人）之间做提问、交接和群组同步，因为它提供了可照做的安装、联系人、群组、附件与自托管步骤，并把消息送进正在工作的会话、还能唤醒空闲会话；但项目很新（31 stars）、只有作者自述文档、需要登录其托管服务，且 agent 可能不先问你即回复，因此应先在非生产、只读任务上验证。
- [eduwxyz/tucano](../research/radar/2026-10-31/8661-eduwxyz-tucano.md)：值得一试，建议小范围试用：先用 2–3 个编码代理在一个频道里跑真实小任务，并把合并、发布、删除等写操作设为人工审批；理由是 README 给出了可照做的安装、连接器、权限和定时触发步骤，但只有项目自述、缺少独立效果数据，暂不宜直接 adopt。
- [Orkas-AI/Orkas](../research/radar/2026-11-01/9199-orkas-ai-orkas.md)：值得一试，建议小范围试用 Orkas 的“项目 + 待办 + 自动推进 + 定时自动化”工作流，把它当作多智能体协作的编排层；理由是 README 给出了可运行的安装/配置步骤、外部 CLI 接入方式和明确的复核/权限机制，但缺少效果数据和按钮级操作步骤，不宜直接全面采用。
- [@MindfulReturn: yetone 这套 Magpie 运维看着朴素，总结下来的方法如下：Claude Code + 官方 Opus，并行三条 /loop——一条盯 GitHub issue/PR 和 Discord（PR](../research/radar/2026-11-02/9530-yetone-magpie-claude-code-opus-loop-github-issue-p.md)：值得一试，先在一个仓库上照搬“三条并行 loop + PR 必须拉下来真跑 + 便宜模型先拦截 X 杂音”这套骨架，跑一两周再决定是否扩展；它的价值不在工具新奇，而在于把 issue/PR 值守、舆情筛选、技术债清理拆成三个互不干扰的常驻循环，人工只留下 UI/UX 决策，分工清晰、可小成本验证。
- [Balanov/skein](../research/radar/2026-11-03/9850-balanov-skein.md)：值得一试，先装好，用示例任务图跑一次，再用 `skein stop` 演练“旧 epoch 排队任务失效 + 迟到完成被拒绝 + 进程树被终结”，验证通过后再考虑把你自己的多步子任务迁到显式任务图上；它给出了可照做的安装、运行、停止命令和明确的退出码语义，但仍是 0.2.0 早期版本、单机自测基准，且明确不覆盖沙箱、鉴权和外部副作用恰好一次。
