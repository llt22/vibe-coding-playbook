# 让多个编码 agent 按任务文件交接，并由独立 QA 放行

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决多个编码 agent 协作时状态散在聊天里、角色和审批边界不清、完成没有独立 QA 验收的问题。
> 先试这一步：先用示例工作区跑通 PM→Developer→QA→人工审批，再在一个低风险仓库用共享任务文件做 1–2 个有验收标准的小任务。
> 最近修订：2026-11-12

## 解决什么问题

单个 AI 回答或单条串行 agent 会话，交付的往往是你没有验证过的结果；多个 agent 之间又常常靠人当消息总线——复制 prompt、等待、粘贴结果。手册把“不满意就重问一次”升级成一套可执行流程：任务写清、并行分工、独立验证、合入门禁、成本检查、注意力路由、共享账本核销、叫停与围栏，以及用角色化 fleet 把 spec、实现、独立 QA 分开；跨机器时再用 hub + runner 把会话接成收件箱，让派活、排队、重投和回执有明确语义。做法 A–AO 覆盖从单次答案竞赛到多项目控制台、文件状态+心跳编排、多 agent 共享账本、长时运行骨架、跨会话/跨人的消息交接、把多个编码 agent 编成有频道、有审批闸门的团队、用显式任务图 + epoch 围栏做本地执行控制面、用 coordinator + coder + qa 三角色起步的角色化交付，以及两层治理：AI 用 CTO/PM/工程师三层把任务单和验收证据固化成交接契约；AJ 用 G0–G7 状态机 + 零依赖 CLI 把基线冻结、审批签名、黑盒 QA 和 fail-closed 校验做成可执行的门。做法 AK 不替换 Claude Code、Codex、Cursor 等 agent，而是在它们之上补一层“桌子”协议——bot 提议，受影响的 owner 批准，该 owner 自己的 bot 执行，另一个席位验证；账本状态到 verified 才算完成，bot 自己说 done 只是发言。做法 AL 用 ai-dev-director 把 HEAD（出 ORDER）、BUILDER（整文件 JSON 提案）、REVIEWER（独立审查）三个订阅 CLI 角色串成一条本地流水线，所有构建只发生在隔离 git worktree，Scope Guard 检查允许路径/保护路径/文件数/diff 上限，REVIEWER fail-closed，验证命令外置在 config.yaml。做法 AM 用 myco 的单 Go 二进制 hub + 每台机器一个 runner，把散在多台机器上的 Claude Code、Codex 等 CLI 会话当成网络节点，消息进入目标 agent 收件箱，runner 长轮询取走、用该消息 resume agent 自己的会话，再把最终输出作为回复投回；消息有租约、未确认会过期重投、5 次失败标记失败。做法 AN 用 tri-agent-orchestrator 的 HANDOFF.md 交接契约和 relay 流水线，把 agy（架构/审计）、claude（实现）、codex（测试/构建/PR）串成三阶段接力；第一阶段 agy 在清单里仍属 watch，所以先做两段式降级试点：只装 claude + codex，架构与边界条件由人或 Claude Code 独立会话完成，但必须照样产出 SPEC.md 和 HANDOFF.md，跑通后再决定是否接第三个 CLI。本次新增做法 AO：用 claude-codex-project-os 生成一个项目工作区骨架，把共享 planning 目录、任务文件、决策记录、仓库规则和 PM/Developer/QA/Reviewer 四类角色固化下来；Claude Code 得到 CLAUDE.md，Codex 得到 AGENTS.md、项目 skills 和角色定义，两个客户端共用同一套任务与状态，新会话可读文件继续；同一仓库同一时间只允许一个 writer，QA 在人工审批前逐条核验验收标准，代码获批不等于 commit、push 或部署获批。共同底线不变：并行和交接只负责产出，接受与否必须由测试、独立 verifier、校验器、接收人本人确认或人工复核决定；消息层和编排层只负责把问题送到、把人叫来，不负责证明结果正确。

做法 A–AO 概览：
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
- AH：用 Hermes fleet 的 coordinator + coder + qa 三角色起步，设 spec/design 两道人审门和红测合并门，QA 只报告不改代码（先只启用三角色，在 Windows/Python 本地小工具上试）。
- AI：用 CTO/PM/工程师三层把任务单、验收证据和模型路由固化成交接契约（codex-cto-agent-team；先只出 plan-only，不建 chat）。
- AJ：用 G0–G7 状态机 + gate_runner.py 做基线冻结、审批签名、黑盒 QA 与 fail-closed 校验（先复制规则文件，再跑 init/freeze）。
- AK：用 mcode-agent-table 的共享账本、owner 签名席位和提交网关，把跨 owner 的 propose→approve→execute→verify 做成可 replay 的协议（先离线 demo 和 npm test，再一桌两 owner 小任务）。
- AL：用 ai-dev-director 把 HEAD 出 ORDER、BUILDER 整文件 JSON 提案、REVIEWER 独立审查串成一条本地流水线，构建只发生在隔离 git worktree，Scope Guard 检查路径/文件数/diff 上限，REVIEWER fail-closed（Windows 优先，先 run 再 mission）。
- AM：用 myco 的 hub + 每台机器一个 runner，把跨机器/跨会话的 Claude Code、Codex 等 CLI 接成收件箱；myco message send --wait 一对一派活，myco broadcast send --selector 按标签广播，消息有租约、过期重投、5 次失败上限，附件 SHA-256，权限走 per-agent allow-list 与 runner.access（先单机 2–3 个会话跑一两周）。
- AN：用 tri-agent-orchestrator 的 HANDOFF.md 交接契约和 relay 流水线，把 agy 架构、claude 实现、codex 测试/构建/PR 串成三阶段接力；先两段式降级（claude + codex，人工或独立 Claude 会话做架构），跑通再接 agy。
- AO：用 claude-codex-project-os 生成共享工作区，用任务文件、决策记录、仓库规则和 PM/Developer/QA/Reviewer 四角色把 Claude Code/Codex 的交接、QA 验收和人工审批固定下来；同一仓库单 writer，安全审查与 QA 最多两轮失败循环。

## 适用与不适用

**适用**
- 你有多个 agent，且这些 agent 属于不同 owner，或至少有“提案方”和“受影响方”的区别，需要写清谁批准、谁执行、谁验证。
- 你已经用 Claude Code、Codex、Cursor 等 MCP agent 干活，只想在它们之上补协作层与审批层，不想换掉执行工具。
- 你愿意用共享账本记录提案、批准、执行回执和验证结果，并接受“bot 说 done 不算完成，账本 verified 才算完成”。
- 你想先在一台机器、一张桌子、两个 owner、一个小任务上验证协议本身，而不是一上来铺多机生产。
- 你已有 A–AJ 中某条路径的验证门禁，AK 可作为“跨 owner 动作”的补充协议，不替代测试、独立 verifier 或合入门禁。
- AL 适用于 Windows 10/11、Python 3.9+、Git，以及至少两个已用订阅账号登录的 CLI（claude、codex、agy）；你想把“规划、实现、审查”分给不同角色，并让构建只发生在隔离 worktree。
- AL 适用于一个小仓库或一个明确的小改动：你能把项目级构建/测试命令写进 config.yaml，并接受订阅配额限制。
- AM 适用于你同时使用至少 2 个 agent CLI（且至少一个是 Claude Code 或 Codex），并且存在跨机器或跨会话的派活需求：你受够了人肉复制 prompt、等待、粘贴结果，想把消息送进目标会话并拿回回复。
- AM 适用于你能让 hub 常驻（VPS，或本机 + Cloudflare Tunnel / Tailscale Funnel），机器只出站 HTTPS、不需要公网 IP 和开放端口；你愿意先在一台机器上接 2–3 个已登录会话做最小试用。
- AM 适用于你接受“定时触发要靠外部 cron / GitHub Actions 自己接”，因为编排模板与调度策略在 roadmap 里仍未完成。
- AN 适用于 macOS 或 Linux、本机已安装并登录 agy（Antigravity）、claude（Claude Code）、codex（Codex CLI），有 git 与 GitHub 推送权限，任务复杂到需要架构、实现、测试/PR 多阶段交接。
- AN 适用于你愿意先做两段式降级试点：只装 claude + codex，架构由人或 Claude Code 独立会话完成，但必须产出 SPEC.md 和 HANDOFF.md，再让 Codex 照验证清单写测试并验证。
- AN 适用于把“交接契约”本身当成第一等产物：每个阶段结束都更新 HANDOFF.md，写清做了什么、关键文件、硬约束与决策、交给下一个 agent 的验证清单。
- AO 适用于你同时使用 Claude Code 或 Codex，想让两个客户端共享同一套 planning 目录、任务文件、决策记录和仓库规则，并在步骤之间切换客户端而项目状态仍在一处。
- AO 适用于你需要 PM 写任务和分派、Developer 改代码、QA 独立逐条验收、Reviewer/安全审查，并接受人工审批 Git 操作和部署作为单独决策。
- AO 适用于 Node.js 22+、目标目录是全新的、你接受同一仓库同一时间只允许一个 writer，包括在 Claude Code 和 Codex 之间切换时。
- AO 适用于小范围试点：先用示例工作区跑通，再在一个低风险仓库做 1–2 个有明确 acceptance criteria 的小任务。

**不适用**
- 你只需要单 agent 串行问答，或任务没有跨 owner 的批准/执行/验证分离，AK 的席位和审批会变成额外开销。
- 你不能保管 owner 私钥文件，或会把 tao.owner.json 外传；席位签名和“bot 不能代签”是这套协议的前提。
- 你要求生产级多机、联邦、高可用；调研明确说 AK v0.1 只能在一台 table host 上跑，联邦仍在 roadmap。
- 你不能给每张表写出 termination 终止条件；缺 termination 会直接拒建。
- 你把“多 agent 跑通”当成结果正确性的证明；AK 只负责审批、执行、验证和账本，不证明业务结果对。
- 你需要已经量化过的缓存收益；调研中作者自己承认 prompt 缓存命中率尚未测量和调优，不能把缓存收益当成已验证结论。
- 你要把 AK 直接写进团队生产规范；它仍是 v0.1、生态很早期，建议小范围试用。
- AL 在 macOS/Linux 上代码已备但作者未在真机验证；不要把未验证平台直接当生产方案。
- AL 需要已登录订阅 CLI，不需要也不要使用按量付费 API；只有 1 个 CLI 或没有订阅登录时不要硬套。
- AL 的 BUILDER 用整文件 JSON 提案，大型改动会撞 CLI 输出上限；大改先拆小，或压缩重试、换供应商。
- 你需要跨 owner 审批时仍走 AK；需要 G0–G7 审批/冻结状态机时仍走 AJ；需要 coordinator + coder + qa 三角色 fleet 时仍走 AH。AL 是单机三角色流水线，不替代这些治理层。
- 你的场景只是单机单 agent；AM 的收益接近于零，直接用 Claude Code 或 Codex 即可。
- 你需要内置的编排模板、调度策略、团队/角色、会话 fork 或 MCP endpoint；这些在 myco 的 roadmap 里仍是未完成项，不要当成已有能力。
- 你需要 hub 的高可用、备份、SQLite 规模上限或并发上限数据；README 没有给出，hub 目前是单点。
- 你要在 Windows 上直接上生产：myco 的 Windows 客户端标注 preview 且未代码签名，首次运行需“More info → Run anyway”；不适合作为首个试点。
- 你准备把 Cursor、Gemini、OpenCode 作为首个试点：它们在 myco 里是 preset experimental，属于“两个未成熟叠在一起”，不宜先用。
- 你无法管理 join link 和 per-agent allow-list；这套东西的权限边界靠这两样，不能默认“接进来就安全”。
- 你需要现成的效果 benchmark；myco 的 README 没有任务成功率、延迟或对比实验，必须自建指标。
- AN 不适合小改动或单文件任务：写 HANDOFF.md 的开销可能大于收益；任务复杂度不足以覆盖多阶段交接成本时不要用。
- AN 强依赖 agy，而 Antigravity 在清单里仍处于 watch；如果 agy 不可用，要退化为 claude + codex 两段式，HANDOFF.md 契约本身与 agent 数量无关，可以照常使用。
- AN 没有量化数据、没有对比实验、没有真实项目结果；仓库仅 30 stars，属于早期个人项目，不要把 README 的“preventing hallucination cascades”“delivering production-ready, verified code”当成已验证收益。
- AN 的 workflows/*.md 具体步骤、lib/ 实现质量无法从材料判断；原文只给文件名与用途，不要臆造第 9 步之后的流程。
- AO 不适合小任务或没有多角色收益的任务：任务文件、QA 记录和审批门会增加流程开销。
- AO 的安装器只生成工作区，不启动 agent、不发模型请求；不要把它当成自动调度器。
- AO 需要同一仓库单 writer；如果你要让多个 agent 同时写同一仓库，先用 AL 的隔离 worktree 或 AK 的 owner 协议，不要把 AO 的共享任务文件当成并行写锁。
- AO 只有 README 材料，没有量化效果数据、案例对比、返工率或时间节省数据；不要把它当成已验证的质量收益。
- AO 的 worker cap 只有 lean/standard/heavy，模型偏好记录在 .project-os.json；README 没有给出该 JSON 完整样例，实际以生成文件为准。
- AO 不能自动选择命名角色时，需要 PM 在委派说明中带上该角色的完整指令，手动会话是回退方案。
- AO 不能替代 AK 的 owner 签名、AJ 的 G0–G7、AL 的隔离 worktree/Scope Guard、AN 的 HANDOFF 契约、AH 的三角色 fleet；需要这些治理层时仍走对应路径。

**A–AO 的适用路径选择**：单回答竞赛用 A；可拆分有测试的编码任务用 B；多 harness 用 C；同会话升档用 D；长时程底座用 E；固定多步流水线用 F；GitHub 小仓库自动链路用 G；轻量 worktree 隔离用 H；macOS 通知用 I；同 commit 独立验证用 J；多项目控制台用 K；daemon+dashboard 用 L；主 Agent 集中验证用 M；商业决策委员会用 N；菜单栏审批用 O；tmux 会话团队用 P；阶段成本检查用 Q；持续 issue/PR 值守用 R；实验性 agent teams 用 S；服务端并发落库用 T；worktree 副本用 U；后台子代理调度用 V；Bot 编排层用 W；本地控制台与危机室用 X；按类别并行代码审查用 Y；文件状态+heartbeat 编排用 Z；止损预算用 AA；共享账本核销用 AB；长时运行骨架用 AC；跨会话消息交接用 AD；频道化代理团队用 AE；project+to-dos+自动化用 AF；任务图+epoch 围栏用 AG；三角色 fleet 用 AH；CTO/PM/工程师交接契约用 AI；G0–G7 治理门用 AJ；跨 owner 的 propose→approve→execute→verify 用 AK；Windows 上 HEAD/BUILDER/REVIEWER 三角色 + 隔离 worktree + Scope Guard 用 AL；跨机器/跨会话派活、需要离线排队和重投语义用 AM；macOS/Linux 上 agy/claude/codex 三阶段交接、核心产物是 HANDOFF.md 用 AN；Claude Code/Codex 共享任务文件、PM/Developer/QA/Reviewer 分工、人工审批和单 writer 用 AO。若只是同机跨会话交接，先用 AD 更轻；若需要把别的机器上的会话也接进来、消息要能排队并在机器宕机后重投，用 AM。两者都是消息层，都不证明结果正确。AN 与 AL 都是多 CLI 流水线，但 AL 有隔离 worktree、Scope Guard、验证命令外置和 fail-closed REVIEWER；AN 的核心是 HANDOFF.md 交接契约和 relay workflow，没有这些门禁，不能替代 AL/AK/AJ/AH。AO 是文件化协作与验收层，和 AI 的 CTO/PM/工程师三层相似但不同：AO 用共享 planning 目录、任务文件、决策记录、仓库规则和 PM/Developer/QA/Reviewer 四角色，跨 Claude Code/Codex 共用状态；AI 是任务单和验收证据的交接契约。AO 不替代 AK/AJ/AL/AN/AH。

## 前置条件

- 共同前提：把任务写成独立、自包含的文件；子代理看不到你的聊天记录，任务文件是它唯一的信息源。每条路径先做最小试用，不先上全量。
- AO 前置：Node.js 22 或更高版本；已准备好 Claude Code 或 Codex；目标目录必须是新的；README 说明无需安装 npm 包；安装器不会改动已有仓库和全局客户端设置，也不会启动 agent 或发模型请求；同一仓库同一时间只允许一个 writer；代码获批不等于 commit、push 或部署获批。
- AO 安装与初始化：
```sh
git clone https://github.com/ferhatcore/claude-codex-project-os.git
cd claude-codex-project-os
node scripts/init.mjs --target ../claude-demo --example --runtime claude
node scripts/init.mjs --target ../codex-demo --example --runtime codex
node scripts/init.mjs --target ../shared-demo --example --runtime both
```
用于自己的项目时去掉 --example，并用 --name 指定项目名。预期：生成新的工作区；Claude Code 得到 CLAUDE.md，Codex 得到 AGENTS.md、项目 skills 和四个角色定义；共享 planning 目录、任务文件、决策记录和仓库规则就位。
- AO 示例自检：
```sh
node repos/catalog/catalog.mjs
node --test repos/catalog/catalog.test.mjs
```
预期：Trailboard 示例的小 CLI 和测试可运行。若示例不通过，先不要接真实仓库。
- AO 安装器自检：
```sh
node scripts/check.mjs
node --test scripts/system.test.mjs scripts/smoke.test.mjs scripts/runtimes.test.mjs
node --test examples/trailboard/repos/catalog/catalog.test.mjs
```
预期：安装器检查命令能跑；README 声称覆盖三种 runtime、三种 worker profile、共享任务状态、生成的角色文件、安装拒绝、配置和 fixture 行为，但本材料未展示运行结果或验证记录内容。
- AN 前置：macOS 或 Linux；本机已安装并登录 agy（Antigravity）、claude（Claude Code）、codex（Codex CLI）；有 git 与 GitHub 推送权限；目标项目里能创建 docs/tri-agent/SPEC*.md 和仓库根目录 HANDOFF.md。两段式降级试点只需 claude + codex。
- AN 安装与自检：
```sh
git clone https://github.com/abhigyan6/tri-agent-orchestrator.git
cd tri-agent-orchestrator
./bin/tri-agent doctor
./scripts/install-skill.sh
```
doctor 正常输出应逐行列出三个 agent 的版本号并以 All 3 agent CLIs ... are active and ready! 结尾；任一行不是 ✅ 就先解决该 CLI 的安装问题。install-skill.sh 会安装/软链到 ~/.agents/skills、~/.claude/skills、~/.codex/skills；等价命令为 tri-agent install-skill。
- AK 前置：Node ≥ 22.19；git；npm；一台单机跑 table host；owner 私钥文件必须私有保管；表配置必须包含 termination；MCP agent 跑在 owner 自己的机器上；能力卡来自 owner 侧文件，不来自 agent 自己。
- AK 安装与自检：
```sh
git clone https://github.com/MiniMax-AI/mcode-agent-table
cd mcode-agent-table
npm install
npm test
npm run demo:scripted
```
demo:scripted 离线跑，不需要 API key；npm test 覆盖 core、topologies、tasks、HTTP/SSE、persistence、MCP bridge、Rabbit Hole。
- AL 前置：Windows 10/11（macOS/Linux 代码已备但作者未验证）、Python 3.9+、Git，以及至少两个已用订阅账号登录的 CLI（claude、codex、agy）；不需要 API key（代码会把所有 *_API_KEY 从环境里剔除）；一个 git 仓库（v3.0 起空文件夹也可 greenfield）；config.yaml 中写项目级验证命令；ORDER 中写允许路径、保护路径、文件数、diff 上限；控制台端口/允许项目列表/桥接 token。理想情况下 HEAD/BUILDER/REVIEWER 分属不同供应商；同供应商会被标 REDUCED_INDEPENDENCE。
- AL 安装与自检：
```sh
pip install -r requirements.txt
python -m pytest -q
```
作者称测试套件用桩 CLI 运行、不需要真实 CLI；测试数量在文中出现“604 个测试，约 25 分钟”和“593/596”两种说法，数字有出入，以实际运行为准。
- AM 前置：hub 可达——在自己的 VPS 上用 sslip.io 自动拿真 HTTPS（install-hub.sh --domain auto），或在本机走 Cloudflare Tunnel（myco hub up --tunnel cloudflare --hostname hub.example.com），或走 Tailscale Funnel（myco hub up --tunnel tailscale），也可以用 App 选 Start on this computer / Connect an existing Hub。每台机器能出站访问 HTTPS；runner 和 session 只开 outbound，不需要公网 IP 和开放端口。目标机器上已安装并登录至少一个受支持的 CLI：Claude Code / Codex 为 native stable；Cursor / Gemini / OpenCode 为 preset experimental；Kiro 还需 uv tool install kiro-acp-gateway 且 kiro-cli 已登录。每个 agent 配一份“谁可以给它派活”的 allow-list，runner.access 取 readonly / workspace / full，native harness 会把它映射到该 CLI 自己的权限 flag 上。云端会话不能被 runner spawn，只能用 myco inbox wait 或 waker（webhook / claude_routine / github_dispatch / github_issue）兜底。
- AM 安装与自检：装客户端一行 curl 完成；加机器用 hub 给出的 join link；myco agent list --online 应能看到在线 agent。先只用一台机器、2–3 个已登录会话，不先接生产凭据。
- A–AO 前置：按所选路径检查版本、平台、登录和仓库条件；例如 A 需 Claude Code 可 spawn 子 agent，B 需 Docker 和一条验证命令，J 需 git 与 Node 22.13+，AH 需 Hermes Agent，AJ 需 Python 3 和至少 16 字符签名密钥，AN 需三个 CLI 登录或两段式降级，AO 需 Node 22+、Claude Code/Codex 和全新目标目录。没有对应前置就不要硬套。

## 操作步骤

先按处境选路径。A–AJ 的详细命令保留在索引中；AK、AL、AM、AN、AO 的完整最小路径如下。

### 做法 AO：用共享任务文件 + PM/Developer/QA/Reviewer + 人工审批门做跨客户端交接
1. 确认前提。前提：Node.js 22+；已安装 Claude Code 或 Codex；目标目录是新的；接受同一仓库单 writer。预期：不需要 npm 包；安装器不启动 agent、不发模型请求。
2. 克隆并生成工作区。前提：在 claude-codex-project-os 仓库根目录。
```sh
git clone https://github.com/ferhatcore/claude-codex-project-os.git
cd claude-codex-project-os
node scripts/init.mjs --target ../claude-demo --example --runtime claude
node scripts/init.mjs --target ../codex-demo --example --runtime codex
node scripts/init.mjs --target ../shared-demo --example --runtime both
```
预期：生成三个示例工作区；--runtime claude 生成 CLAUDE.md；--runtime codex 生成 AGENTS.md、项目 skills 和四个角色定义；--runtime both 让两个客户端共享同一套 planning 目录、任务文件、决策和仓库规则。用于自己的项目时去掉 --example，并用 --name 指定项目名。
3. 在客户端里读入口文件。前提：在 Claude Code 或 Codex 中打开生成目录。让 Claude Code 读取 START.md；在 Codex 中也可以调用 $project-os-start。预期：客户端认出 PM、Developer、QA、Reviewer 四类角色和当前任务状态。不能自动选择命名角色时，由 PM 在委派说明中带上该角色的完整指令，手动会话是回退方案。
4. 先跑示例。前提：生成目录已就绪。
```sh
node repos/catalog/catalog.mjs
node --test repos/catalog/catalog.test.mjs
```
预期：本地阅读清单 Trailboard 的小 CLI 和测试能跑通；示例里有一个待做的状态过滤任务，可用于观察任务文件、QA 和审批门。
5. 建任务。任务必须写清 repository、scope、branch、acceptance criteria 和 permissions。工作会话要记录改了什么、检查了什么、从哪里继续。QA 要独立核验每条验收标准；如果范围变化，先改任务再继续。预期：新会话能只读任务文件继续，不需要重新解释背景。
6. 按审批链推进。顺序固定：人给出范围与批准 → PM 写任务和计划 → Developer 修改 → 如需要则安全审查 → QA 验收 → PM 检查完整性 → 人工批准 Git 操作 → 部署作为单独决策。同一仓库同一时间只允许一个 writer，包括在 Claude Code 和 Codex 之间切换时。代码获批不等于 commit、push 或部署获批。安全审查与 QA 合计最多两轮失败循环；第三轮需要新计划与人工批准。预期：每一步都有文件记录，QA 在人工审批前独立指出不符合项。
7. 检查 .project-os.json。前提：工作区已生成。查看所选 runtime、仓库列表、worker cap 和模型偏好。worker cap 可选 lean、standard 或 heavy；模型 tier 默认继承当前活动模型，直到映射到账户中可用的设置。README 没有给出该 JSON 的完整样例，实际以生成文件为准。预期：配置与实际账户能力一致；不一致时先改配置再派任务。
8. 验证安装器本身。前提：你想确认安装器行为。
```sh
node scripts/check.mjs
node --test scripts/system.test.mjs scripts/smoke.test.mjs scripts/runtimes.test.mjs
node --test examples/trailboard/repos/catalog/catalog.test.mjs
```
预期：检查命令能跑；README 声称覆盖三种 runtime、三种 worker profile、共享任务状态、生成的角色文件、安装拒绝、配置和 fixture 行为，但本材料未展示运行结果或验证记录内容。
9. 最小试用。先在临时目录用 --example --runtime both 生成示例工作区，跑 Trailboard 示例和检查命令；再选一个低风险、非关键仓库，用独立的新目标目录初始化，做 1–2 个有明确 acceptance criteria 的小任务。同时用团队现有流程做基线，记录同类任务的时间、返工和上下文重建成本。不要一上来接生产凭据或部署。

### 做法 AK：用共享账本+owner 签名席位做跨 owner 的 propose→approve→execute→verify
1. 环境准备。前提：Node ≥ 22.19，能联网拉依赖。执行上面的 clone、npm install、npm test、npm run demo:scripted。预期：测试通过，离线 demo 能跑完 debate → decision → owner approval → execute → verify。若 demo 不通过，先不要接真实任务。
2. 起一张桌子。终端 1：
```sh
npx tsx src/cli.ts serve --port 7341 --data ./data
```
预期：表主机在 7341 端口提供 HTTP + SSE，账本持久化到 ./data。
3. 生成 owner 密钥并建桌。终端 2：
```sh
npx tsx src/cli.ts keygen tao --out tao.owner.json
npx tsx src/cli.ts create table-config.json
```
table-config.json 必须写 id、topic、owners 的 public_key、topology、termination。public_key 从 tao.owner.json 读取；tao.owner.json 含私钥，不能外传。termination 不能省，缺了会拒建。预期：create 打印 table id 和 admin token。
4. 入座、发言、读投影：
```sh
npx tsx src/cli.ts join my-table --owner tao.owner.json --seat bot-tao --bot my-agent --out tao.seat.json
npx tsx src/cli.ts say --seat tao.seat.json hello-table
npx tsx src/cli.ts read --seat tao.seat.json
```
read 拿到的是本席位投影：稳定前缀（规则、席位、决议）+ 追加式尾部，无时间戳。预期：本席位能看到自己的前缀和尾部，其他席位有各自投影。
5. 接任意 MCP agent。在 Claude Code、Codex、Cursor 等 MCP 配置里设置环境变量 BYOB_URL=http://127.0.0.1:7341、BYOB_TABLE=my-table、BYOB_OWNER_KEY_FILE=指向 tao.owner.json、BYOB_CARD_FILE=指向 owner 侧能力卡。可用工具包括 byob_join、byob_read_projection、byob_say、byob_pass、byob_raise_hand、byob_propose、byob_decide、byob_approve、byob_status、byob_receipt、byob_verify、byob_memory。能力卡永远来自 BYOB_CARD_FILE，不来自 agent 自己；byob_approve 需要 owner 确认，客户端无法提问时直接拒绝；owner 也可以自己跑 byob approve。
6. 走一次跨 owner 动作。顺序固定：bot propose；受影响的 owner 签名 approve；该 owner 自己的 bot 执行并回执；另一个席位 verify。bot 说 done 只是发言，账本状态到 verified 才算完成；沉默任务由 watchdog 标成 stalled。预期：账本里能看到提案、批准、执行回执和验证结果，且验证席位与执行席位不同。
7. 最小试用。选一个低风险、边界清楚的小任务，搭一桌两 owner：一个 owner 提案，另一个 owner 受影响并批准，执行由该 owner 的 bot 完成，验证由另一席位完成。先只跑 1–2 个任务，检查账本 seq 是否 1..n 无缺口、replay 能否重建 floor/seats/tasks/budget、未批准动作是否为 0。不要一上来接生产凭据，也不要让 bot 代签。

### 做法 AL：用 HEAD/BUILDER/REVIEWER 三角色 + 隔离 worktree + Scope Guard 做本地编码流水线
1. 确认前提。前提：Windows 10/11、Python 3.9+、Git，以及至少两个已用订阅账号登录的 CLI（claude、codex、agy）。不需要 API key；代码会把所有 *_API_KEY 从环境里剔除。若某平台没有 agy，把 BUILDER 改成 codex 或 claude，两个 CLI 也能跑。预期：至少两个订阅 CLI 能在终端启动并已登录；不要用按量付费 API 作为后备。
2. 装依赖并跑测试。
```sh
pip install -r requirements.txt
python -m pytest -q
```
前提：在 ai-dev-director 仓库根目录。预期：测试套件用桩 CLI 运行，不需要真实 CLI；耗时较长，先留出时间。若测试不通过，先不要接真实仓库。
3. 启动控制台。Windows：
```powershell
.\start-companion.ps1
.\stop-companion.ps1
```
macOS/Linux（作者标注未验证）：
```sh
chmod +x start-companion.sh stop-companion.sh
./start-companion.sh
./stop-companion.sh
```
前提：依赖已安装。预期：Windows 上控制台起在 http://127.0.0.1:8081（TRINITY 舞台）和 /classic（工作区）；shell 版把 python3 companion_server.py 放后台，PID 写到 data/companion.pid；stop 脚本能停止。
4. 配置 config.yaml。前提：你已选定一个 git 仓库，并能写出该项目的构建/测试命令。设置角色对应供应商（head/builder/reviewer）、超时、安全上限、项目级验证命令、自主模式 autonomy 与档位 quick / standard / deep。关键设计：验证命令放在 config.yaml 而不是项目内，使 BUILDER 无法弱化它。若 HEAD 与 REVIEWER 落到同一供应商，系统会标注 REDUCED_INDEPENDENCE 并放行，独立性会打折。预期：至少两个角色分属不同供应商；验证命令可由 Director 在隔离 worktree 里执行。
5. 单次运行。前提：小仓库、小改动、验证命令已配置。
```sh
python director.py run -p D:/work/my_project -g 'src/calc.py에 add(a, b)를 만들고 테스트를 추가해'
```
预期：HEAD 出 ORDER（写明允许路径、保护路径、文件数、diff 上限）；BUILDER 以整文件 JSON 提交提案；Director 用 Scope Guard 检查；写入 .director_worktrees/ 下的隔离 git worktree；跑构建/测试（Verifier）；REVIEWER 独立审查；HEAD 给 PASS/FAIL/修改指示。原项目目录永不被直接修改。
6. 多里程碑 Mission。前提：单次 run 已跑通，原仓库保持干净。
```sh
python director.py mission -p D:/work/my_project -g '회원가입 흐름을 끝까지 구현'
```
预期：把一句话目标拆成多个里程碑逐步推进；每步从上一个 PASS 快照出发，依据测试/评审证据重新规划。
7. 查看状态、清理隔离工作本。前提：先 dry-run。
```sh
python director.py status
python director.py clean-worktrees -p D:/work/my_project --dry-run
```
预期：status 显示当前运行/任务状态；dry-run 列出将清理的隔离工作本，不实际删除。确认后再去掉 --dry-run。
8. 最小试用与对照。前提：一台 Windows 机器、两个已登录订阅 CLI、一个小仓库，把它的构建/测试命令写进 config.yaml 的 projects 段。先跑 run，观察 ORDER 的路径/文件数/diff 上限是否合理、Scope Guard 是否拦住越界、REVIEWER 是否真的独立于 BUILDER、原项目目录是否未被改动、stop 是否能立刻终止进程树。再对一个中等目标跑 mission。对照设计：选 3–5 个规模相近的任务，一半用 Director 流水线、一半直接单用 Claude Code（或 Codex）完成，任务与验收标准事先固定。预期：若指标没有明显改善，或隔离/评审机制被绕过，降级为 study，只借鉴流程思路，不继续使用该工具本身。

### 做法 AM：用 hub + runner 把跨机器/跨会话的编码 agent 接成收件箱
1. 起 hub。前提：你有一台能常驻的机器（VPS 或本机），能出站 HTTPS。三种方式任选其一：
```sh
curl -fsSLO https://raw.githubusercontent.com/chenhg5/myco/main/deploy/install-hub.sh && sudo bash install-hub.sh --domain auto
```
或本机走 Cloudflare Tunnel：
```sh
myco hub up --tunnel cloudflare --hostname hub.example.com
```
或走 Tailscale Funnel：
```sh
myco hub up --tunnel tailscale
```
也可以直接用图形界面：打开 App 选 Start on this computer，或 Connect an existing Hub 粘贴 app link。预期：hub 给出可用的 app link / join link；hub 是单点，先接受这一点再往下走。
2. 装客户端并把机器加入网络。前提：目标机器能访问 hub。装 CLI：
```sh
curl -fsSL https://raw.githubusercontent.com/chenhg5/myco/main/deploy/install-client.sh | bash
```
加一台机器（link 由 hub 给出）：
```sh
curl -fsSL https://<your-hub>/j/<link> | bash
```
也可以让 agent 自己装——把下面这段原样粘进 Claude Code 或 Codex：
```text
Read https://github.com/chenhg5/myco/blob/main/INSTALL.md
Set up a myco hub for me and connect this session to it.
```
预期：runner 作为后台服务起来，机器完成注册，不需要手工复制 token。
3. 把会话挂上网络。对另一台机器上的会话说一句 join myco: https://<your-hub>/j/<link>；本机会话可在 App 里点 Add node → On this computer，App 会列出最近的 Claude Code / Codex 会话，点一下即加入。需要在已连机器上新开会话时，用 App 选机器和文件夹启动。预期：会话出现在 agent 列表中，后续消息会 resume 这个会话而不是新开一个上下文。
4. 确认在线状态：
```sh
myco agent list --online
```
预期：只看到你刚接入的 2–3 个会话；先不要把所有机器都加进来。
5. 一对一派活并等结果。前提：目标 agent 在线，且你的身份在它的 allow-list 里。
```sh
myco message send --to build-backend --body 'Fix the failing tests in ./pkg/api' --wait 15m
```
预期：--wait 到期返回回复；若 agent 离线，任务排队等它回来；消息有租约，取走未确认（比如机器宕机）会过期重投；5 次后标记失败；CLI 异常退出则任务失败并通知发送方。--wait 超时不一定等于任务失败，先区分“还在排队/运行”和“已失败”。
6. 按标签广播派活。前提：你已给 agent 打过 group / machine 标签。
```sh
myco broadcast send --selector 'group=review' --body 'Review PR #42' --wait 30m
```
selector 支持 group=、machine= 等，如 group=review,machine=vps。预期：一对多发出，回复可逐个追踪；不要让广播变成“谁抢到谁做”的无主任务，回复仍要回到具体派活人。
7. 需要远程执行 shell 而不是让 agent 干活时，用 exec 节点。前提：发件人在 allow-list，命令有审计。
```sh
myco exec --to build-shell --cmd 'df -h'
```
预期：拿到远程命令输出；不要把 exec 当成绕过 agent 权限的通道，它类似 ssh，权限和审计要单独管。
8. 配置权限与信任边界。每个 agent 有一份“谁可以给它派活”的 allow-list；runner.access 取 readonly / workspace / full，native harness 会把它映射到该 CLI 自己的权限 flag 上。加机器时的加入规则由那台机器自己的配置决定（谁能派、在哪个目录、什么权限）。预期：默认给 readonly 或 workspace，不要一上来给 full；join link 当凭据保管，不要发到公共频道。
9. 最小试用。在一台开发机上用 myco hub up --tunnel tailscale（或 App 的 Start on this computer）起 hub，不引入 VPS；只接入 2–3 个已登录的 Claude Code/Codex 会话；用 myco message send --wait 和 broadcast send --selector 替代手工复制 prompt。先跑 1–2 周，观察重投、超时、上下文保持情况，再决定是否扩到多机。不要一上来接生产凭据，也不要把 Windows preview 客户端当第一站。

### 做法 AN：用 HANDOFF.md 交接契约 + relay 流水线做三 CLI 接力，先两段式降级
1. 确认前提并选任务。前提：macOS 或 Linux；本机已安装并登录 agy、claude、codex；有 git 与 GitHub 推送权限。任务选一个中等规模、有明确验收标准的任务，不要选玩具 demo，也不要选核心生产系统。预期：三个 CLI 都能在终端启动并已登录；若 agy 不可用，直接进入两段式降级。
2. 克隆并进入仓库：
```sh
git clone https://github.com/abhigyan6/tri-agent-orchestrator.git
cd tri-agent-orchestrator
```
预期：仓库就绪；原文只给出 lib/agents.py、lib/orchestrator.py、workflows/*.md 的文件名与用途，没有贴出内部实现或 workflow 的具体步骤文本。
3. 体检环境：
```sh
./bin/tri-agent doctor
```
预期：逐行列出三个 agent 的版本号并以 All 3 agent CLIs ... are active and ready! 结尾。任一行不是 ✅ 就先解决该 CLI 的安装问题，不要往下走。示例版本号是示例，不是承诺。
4. 全局注册 skill：
```sh
./scripts/install-skill.sh
```
预期：安装/软链到 ~/.agents/skills、~/.claude/skills、~/.codex/skills，让三个 CLI 都能原生识别这套工作流；等价命令为 tri-agent install-skill。若目录权限或软链失败，先修安装再继续。
5. 先做两段式降级试点（推荐先做）。前提：只装 claude + codex；第 1 阶段架构与边界条件由你自己或 Claude Code 的一个独立会话完成，但必须照样产出 SPEC.md 和 HANDOFF.md；第 2 阶段照抄 README 提示词让 Codex 写测试并验证。预期：在不引入 watch 状态组件的前提下验证交接契约本身是否有效；跑通后再接 agy，对比两段式与三段式的差异。
6. 在目标项目里创建第一份交接契约：
```sh
tri-agent handoff create --feature 'rate-limiter' --completed agy --next claude
```
把 --feature / --completed / --next 换成自己的功能名和实际的上下游 agent。预期：生成 HANDOFF.md 交接契约。两段式降级时不要假装 agy 参与，按实际完成方和下一方填写。
7. 先干跑一次，看清它准备下达哪些命令，再真跑：
```sh
tri-agent run --workflow relay --prompt 'Build file upload component' --dry-run
```
确认无误后去掉 --dry-run：
```sh
tri-agent run --workflow relay --prompt 'Build modern auth middleware with JWT rotation'
```
前提：交接契约已创建，三个 CLI 或降级后的两个 CLI 可用。预期：relay 流水线按阶段推进；dry-run 只展示准备下达的命令，不真正执行。
8. 每个阶段收尾时，把 HANDOFF.md 按下面的结构更新。这是整个方法最值得抄走的部分，模板可直接照用：
```markdown
# Tri-Agent Handoff Contract

## Metadata
- **Workflow ID:** wf-20261110-a9f3b1
- **Active Feature:** auth-middleware
- **Current Phase:** Phase 1: Architecture & Specification
- **Completed By:** agy
- **Next Agent:** claude
- **Timestamp:** 2026-11-10T16:00:00Z

## What Was Done
- Designed RS256 token rotation architecture.
- Outlined CSRF defense and SameSite=Strict cookie invariants.

## Key Files & Artifacts
- Specification: docs/tri-agent/SPEC-auth.md

## Critical Constraints & Decisions
- Token expiration: 15 minutes access, 7 days refresh.
- No third-party heavy dependencies; use native Web Crypto or jose.

## Verification Checklist for Next Agent
- [ ] Implement src/middleware/auth.ts matching SPEC-auth.md.
- [ ] Export AuthRequest and TokenPayload types.
- [ ] Update HANDOFF.md and set Next Agent to codex.
```
预期：下一阶段 agent 能读到“做了什么 / 关键文件 / 硬约束与决策 / 交给下一个 agent 的验证清单”，而不是靠你复述聊天记录。硬约束和验证清单必须写具体，不要只写“已完成”。
9. 最小试用与放弃信号。用 1–2 天、一个中等规模任务，先两段式降级，跑通后再接 agy 对比两段式与三段式。记录：交接后下一阶段首次即通过验证清单项的比例；人工介入纠偏次数与总返工轮次；交接过程中约束被遗漏的次数；最终 PR 评审意见数量与严重级别分布；从开始到 PR 就绪的总耗时。若两段式试点里 HANDOFF.md 的约束遗漏次数并不低于单 agent 基线，说明瓶颈不在模型分工而在任务描述质量，退回优化提示词与 SPEC，不要继续加 agent。

### 做法 A–AJ 的保留路径索引（AK、AL、AM、AN、AO 见上）
- A：装 arena-skill，跑 /arena --quick --seed 7，用 baseline 传入旧答案；看盲评比分和攻击命中。
- B：装 clodfarm，设 FARM_VERIFY_CMD，spawn 子代理；只有验证命令通过才合入。
- C：装 openrig，选 starter 起两座位，用 rig ps 检查就绪；多 harness 可见可恢复。
- D：在可弃用机器装 oh-my-openagent，难任务加 ultrawork 或 ulw，做三轮对照。
- E：clone deer-flow，make setup、make doctor、make docker-start；先跑最小任务。
- F：用 crewAI 建 researcher + reporting_analyst，跑 crewai run，看 output/report.md 能否直接用。
- G：cubefarm doctor、demo、低风险 GitHub 小仓库，session limit 设 1–2，先关 auto-merge。
- H：git worktree 隔离，建 conventions.md、plan.md、dead-ends.md，提交前让第二个 agent 评审。
- I：macOS 装 cmux，跑 hooks setup，开 2–3 个终端型 agent，试通知与未读跳转。
- J：pullboard tour、init，写 SPEC.md 和 gate，builder lane + review lane，verifier 必须在同一 commit 上 accept/reject。
- K：装 claude-console，跑 demo 和 refresh，建项目注册表与 STATUS 卡，走一遍派工和关卡评审。
- L：装 neurosquad，在 git 仓库跑 nsq run claude ... --worktree，打开 dashboard 回答权限，用 nsq cost 看成本。
- M：主 Agent 编排，子 Agent 只生成，禁止 Build/Test/Typecheck；主 Agent 统一验证。
- N：clone roast-room，在文件夹里开 claude，输入 /roast-room --quick 决策，用 check_quotes.py 校验引用。
- O：macOS 14+ 装 Muster，逐代理开启 Answer prompts from Muster，练快捷键代答。
- P：装 hivehouse，先 relay 模式只对一个项目运行 /hivehouse:start 任务，push/deploy 留给人。
- Q：进入下一阶段前跑 /cost，记录阶段成本、token、代理数与耗时；估不出边际成本先不加代理。
- R：先只跑 triage-github 一条 loop，处理最近 3 天 issue，强制先复现、先写失败测试、再修；稳定后再加代码协作、清债、X 反馈。
- S：在同一 shell 先跑基线，再 export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 后跑同一任务，30 分钟对照；无效则降级 watch。
- T：构建 git-ai，跑 examples/graft/quickstart.sh；非关键仓库先 shadow 只读导入，确认后再 authoritative。
- U：在 git 仓库用 claude --worktree 启动多个代理，主工作树保持不变；记录合并成本和副本清理。
- V：装 orchestrator-skill，在 Claude Code 输入 /orchestrator，派 2–3 个独立子任务，查看 status、stop/redirect 和 .claude/orchestrator.md 账本。
- W：先只建 3 个 Bot，不接执行层，只留 1 个例程；第二周再按 outcome/inputs/skill/limits 派一个真实工作单元给 Claude Code。
- X：装 MyTeam，先跑演示安装器，再起 server，在 Herdr 里开 2×2 面板，试指令队列和 Ctrl+Maj+C 危机室冻结。
- Y：用 5 个独立上下文子代理按问题类别审查，输出 文件:行号 + 问题 + 严重度 + 建议，人工复核去重后再修。
- Z：建 goal.json、tasks.json、agents.json、heartbeat.json、events.ndjson，跑 conformance/validate.mjs；先只读 monitor，再草稿 dispatch，最后接 claude -p。
- AA：给单方向 1–2 小时预算，到点无进展就终止并拆 3 个不同方向子 agent；评审类另设最大轮次或连续无新增即停。
- AB：建计划板和带时间戳账本，按“分配者指名→写 RESERVED→接收人直取→本人回报→未确认按未送达”五步核销。
- AC：按六类能力（观察、推理、记忆、行动、发消息、写脚本）和三件套（目录、共享沙盒、DM）体检骨架；先 5 个 agent、30 分钟。
- AD：装 Imbo，接 Claude Code + Codex，互加联系人，先跑跨会话提问和 2–3 会话群组核对；做发送文件/删除/附件的边界测试。
- AE：装 Tucano，建一个频道、2–3 个代理、一个只读 MCP，把 merge/post/email/delete/purchase 设为审批，开一个每周例程扫新 issue。
- AF：建 project，放目标/规则/参考/验收标准，拆 3–5 个 to-do，先手动跑第一项，再只对下一项开 Auto-advance，加一个低风险 connector。
- AG：跑 skein 示例，做停止演练，检查退出码 4、stopped=true、epoch 递增、旧 epoch 迟到完成被拒绝、残留子进程为 0，再迁 3–5 个真实子步骤。
- AH：只启用 coordinator、coder、qa，可选 product 写 SPEC.md；保留 spec 审批门，QA 只写 QA-REPORT.md 和 punch-list，红测阻断合并。
- AI：先 plan-only，不建 chat；任务单写全目标、权限、产出、验收标准、可写资源；再建 1 个 PM + 2–3 个工程师跑真实小任务。
- AJ：先复制 .cursorrules 或 CLAUDE.md，再跑 gate_runner.py init、freeze、approve，让一个编码代理走 approve→编码→check --gate=G5。

## 怎么判断变好了

**AO 的可观察指标**
- 新会话能否只读任务文件、决策记录和仓库规则继续，而无需重新解释背景。
- QA 是否在人工审批前独立发现不符合验收标准的项；验收标准首次通过率是否提高。
- 安全审查与 QA 的失败循环是否不超过两轮；第三轮是否触发新计划与人工批准。
- 范围变更是否先改任务再继续；是否出现未经批准的 commit、push 或部署。
- 同一仓库是否始终只有一个 writer；在 Claude Code 和 Codex 之间切换时是否仍保持单 writer。
- 人工审批耗时是否可接受；是否出现审批变成无脑点允许。
- 最小试用：临时目录示例 both → 低风险仓库 1–2 个有 acceptance criteria 的小任务；同时记录团队现有流程的时间、返工和上下文重建成本。
- 最小成功标准：1–2 个任务都有验收标准和 QA 记录，未发生越权 Git/部署操作，且新会话无需重新解释背景即可继续；若流程开销明显大于收益、QA 只是形式检查，或角色委派无法稳定执行，则停止扩大。

**AN 的可观察指标**
- 交接后下一阶段首次即通过 HANDOFF.md 验证清单项的比例；与“单 agent 一路做到底”的同类任务基线对比。
- 人工介入纠偏的次数与总返工轮次，是否集中在架构决策、验收和发布，而不是反复补交接信息。
- 交接过程中约束被遗漏的次数：如 token 过期时间、禁用重依赖、验证清单项被下一阶段违反。
- 最终 PR 的评审意见数量与严重级别分布；是否出现“实现完成但测试没跑/跑错”的情况。
- 最小试用：1–2 天、一个中等规模有明确验收标准的任务；先两段式降级，只装 claude + codex，强制产出 SPEC.md 和 HANDOFF.md，再跑通 relay 或手工按契约推进；跑通后再接 agy 对比两段式与三段式。
- 放弃信号：如果两段式试点里 HANDOFF.md 的约束遗漏次数并不低于单 agent 基线，说明瓶颈不在模型分工而在任务描述质量，退回优化提示词与 SPEC，不要继续加 agent。

**AM 的可观察指标**
- 手工复制 prompt 的次数是否下降：试用前记录一天里你为转达任务复制/粘贴了几次，试用后用 myco message send --wait / broadcast send --selector 替代，比较同一类任务的转达次数。
- 消息投递语义是否按设计工作：离线 agent 的任务是否排队；取走未确认是否过期重投；重投次数是否到 5 次后标记失败；CLI 异常退出是否通知发送方；--wait 超时与任务失败是否能区分。
- 上下文是否保持：native stable 的 Claude Code/Codex 是否被 resume 到同一个会话，而不是每条消息新开上下文；如果每次都在重置，先查 adapter 和 runner.access 映射。
- 权限是否真的收住：per-agent allow-list 是否只放该放的人；runner.access 是否默认 readonly / workspace 而不是 full；exec 命令是否有审计记录；join link 是否只在私域流转。
- 最小试用：一台机器、2–3 个已登录的 Claude Code/Codex 会话、1–2 周；先看转达次数、重投、超时和上下文保持，再决定是否加第二台机器。README 没有任务成功率、延迟或对比实验，以上指标要你自己记录。

**AK 的可观察指标**
- npm test 是否通过；demo:scripted 是否完整跑通 debate → decision → owner approval → execute → verify。
- 一桌两 owner 小任务中，账本是否出现完整链路：propose、owner 签名 approve、该 owner 的 bot 执行回执、另一席位 verify。
- 账本 seq 是否 1..n 无缺口；replay 能否精确重建 floor、seats、tasks、budget。
- 未批准动作数应为 0；bot 自称 done 但账本未 verified 的条目数应为 0；stalled 任务是否被 watchdog 标出。
- 执行席位与验证席位是否为不同席位；同一席位既执行又验证的比例应为 0。
- 最小试用：1–2 天、一张桌子、两个 owner、一个小任务；先看协议闭环，不先追求吞吐。

**AL 的可观察指标**
- 首次构建即通过测试的比例（第一轮 PASS 率）。
- 人工介入次数与介入原因，是否只剩真正需要人决策的支付/凭据类动作。
- REVIEWER 独立抓出的真实缺陷数，而不是风格挑刺。
- 端到端耗时与订阅配额消耗。
- 原仓库是否始终保持干净（git status 无意外改动）。
- 失败恢复能力：人为制造 JSON 破损、超时、配额耗尽，看是否按设计重试、换供应商、重规划，而不是卡死或误判 PASS。
- 最小试用：Windows 机器 + 两个已登录订阅 CLI + 一个小仓库 + 一个明确小改动；先跑 run，再跑 mission。对照设计选 3–5 个规模相近的任务，一半用 Director、一半直接单用 Claude Code 或 Codex，任务与验收标准事先固定。

**A–AO 的指标**：沿用各路径原有指标，例如 B 看合入前测试通过率，J 看 gate 绿+verifier receipt，AH 看人工介入是否集中在审批门与发布/凭据，AJ 看 freeze 是否拦住空规格和冻结后改契约是否熔断。共同判断是：人工介入是否集中在授权、验收和发布；返工是否下降；验证是否由独立方完成；没有验证证据的“完成”是否被拒绝。AN 还要额外看 HANDOFF.md 的约束遗漏次数和交接后首次通过验证清单项比例；AO 还要额外看跨会话续做、QA 首次发现、验收首次通过率、越权操作和审批耗时。

**试多久、什么时候升级**
- AO 先试 1–2 天示例加 1–2 个低风险小任务；只有跨会话续做、QA 独立发现、验收首次通过和审批边界都成立，才扩大。
- AN 先试 1–2 天、一个中等任务、两段式降级；只有约束遗漏低于单 agent 基线、交接后首次通过比例改善、PR 就绪耗时可接受，才接 agy 或扩到更多任务。
- AM 先试 1–2 周、一台机器、2–3 个会话。只有转达次数下降、重投与超时语义符合预期、上下文保持、权限边界清楚，才考虑加第二台机器或接更多 CLI。
- AK 先试 1–2 天、1–2 个小任务。只有协议闭环稳定、未批准动作为 0、账本可 replay、验证席位独立，才考虑加第三个 owner 或接更多 MCP agent。
- AL 先跑 3–5 个对照任务，不先跑全量 Mission。只有第一轮 PASS 率、人工介入原因、独立缺陷发现、原仓库干净度和失败恢复都相对单代理对照有改善，才考虑扩大任务范围或接更多仓库。
- 如果多 agent 只是热闹、审批变成无脑点允许、或账本 verified 没有独立验证，退回单 agent + 明确测试/评审门禁，只保留“谁批准、谁执行、谁验证”的协议思路。
- AK 从单机扩到多机前，先确认联邦仍在 roadmap，不要假设已经支持。AM 从单机扩到多机前，先确认 hub 单点、备份和 SQLite 规模上限没有现成答案，自己补运维方案。AN 接第三个 CLI 前，先确认 agy 仍可用且两段式试点已经证明交接契约本身有效。AO 扩到多仓库前，先确认单 writer 仍成立；需要并行写同一仓库时改用 AL 的 worktree 或 AK 的 owner 协议。

## 常见坑

- AO 只有 README 材料，没有量化效果数据、案例对比、返工率或时间节省数据；角色分工和 QA 收益主要是作者的设计主张。
- AO 的安装器只生成工作区，不启动 agent、不发模型请求；不要把它当成自动调度器。
- AO 需要同一仓库单 writer；不要把共享任务文件当成并行写锁。
- AO 的 .project-os.json 没有完整样例；模型 tier 默认继承当前活动模型，直到映射到账户中可用设置；实际以生成文件为准。
- AO 不能自动选择命名角色时，由 PM 在委派说明中带完整指令，手动会话是回退方案；不要让角色委派空转。
- AO 的安全审查与 QA 合计最多两轮失败循环；第三轮需要新计划与人工批准。不要无限循环。
- AO 的代码获批不等于 commit、push 或部署获批；部署是单独决策。
- AN 零基准数据、零对比实验、零真实项目结果；README 中 preventing hallucination cascades、delivering production-ready, verified code 均为作者主张，无证据。不要把“三 agent 接力”当成质量证明。
- AN 仓库仅 30 stars，属于早期个人项目；workflows/*.md 的具体内容、lib/ 的实现质量均无法从材料判断。不要拿命令能跑通当生产就绪。
- AN 强依赖 agy，而 Antigravity 在清单里仍处于 watch；第一个试点先用两段式降级，不要把 watch 组件当唯一架构师。
- AN 对小改动或单文件任务不划算：写 HANDOFF.md 的开销可能大于收益；任务复杂度不足以覆盖多阶段交接成本时退回单 agent。
- AN 的 HANDOFF.md 如果只写“做了什么”，不写硬约束和 Verification Checklist for Next Agent，下一阶段仍会丢约束；模板里的约束和清单必须具体、可勾选。
- AM 的项目成熟度很低：32 stars、单作者、部分 harness 标注 experimental、Windows 客户端 preview 且未签名；不要因为“命令能跑”就把它写进生产规范。
- AM 的 hub 是单点；README 未提及高可用、备份、SQLite 规模上限、并发上限。不要假设它天生能扛团队级负载。
- AM 的编排模板与调度策略、MCP endpoint、团队/角色、会话 fork 全在 roadmap 未完成项里；定时触发要靠外部 cron / GitHub Actions 自己接，不要写成“内置调度”。
- AM 的 join link 和 per-agent allow-list 是权限边界；runner.access 默认不要给 full。join link 泄漏等于把派活入口泄漏。
- AM 的 --attach 只做 SHA-256 完整性校验，只有收件方能下载；它不证明文件安全，也不证明来源可信。
- AM 的 --wait 超时不是任务失败的同义词；任务可能还在排队或运行，先看状态再重发，避免重复派活。
- AK 是 v0.1，单机 table host；联邦仍在 roadmap，不要写成已支持多机生产。
- AK 的 prompt 缓存收益未测量：投影设计保住了稳定前缀，但作者明确说还没测量和调优缓存命中率，不要把缓存当已验证收益。
- AK 的能力卡必须来自 owner 侧文件，不能来自 agent 自己；bot 不能代签，也不能自己扩权。byob_approve 通过 MCP elicitation 请 owner 确认；客户端无法提问时直接拒绝，这不是故障，是设计。
- AK 的 bot 说 done 只是发言；账本到 verified 才算完成，且必须由不同席位验证。termination 不能省；缺终止条件的表会被拒建。watchdog 只是兜底，不是主动推进机制。
- AL 是 Windows-first、韩语界面；macOS/Linux 代码齐备但未在真机验证，部分测试假定 Windows 盘符路径（C:/...）。测试数量在文档中出现 604 与 593/596 两种说法，不要拿其中一个数字当验收标准，以实际运行为准。
- AL 的整文件 JSON 提案在大型改动上会撞 CLI 输出上限；先压缩重试，再换供应商，或把任务拆小。AL 完全受各 CLI 订阅配额约束；不要用按量付费 API 绕过。
- HEAD 与 REVIEWER 落到同一供应商时系统会标 REDUCED_INDEPENDENCE 并放行；独立性会打折，不要把这种情况当成独立审查。验证命令必须放在 config.yaml，不要放回项目内让 BUILDER 有机会弱化。
- AL 不替代 AK 的 owner 签名，也不替代 AJ 的审批状态机；跨 owner 任务仍走 AK，需要 G0–G7 门禁仍走 AJ。AN 也不替代 AK/AJ/AH/AL：AN 只提供交接契约和 relay workflow，没有 owner 签名、G0–G7 状态机或隔离 worktree 的 Scope Guard。AO 也不替代 AK/AJ/AH/AL/AN：AO 只提供共享任务文件、角色、QA 和人工审批，没有 owner 签名、G0–G7、隔离 worktree/Scope Guard 或 HANDOFF 接力契约。
- 共同坑不变：消息层和编排层只负责把问题送到、把人叫来，不证明结果正确；没有测试、独立 verifier、校验器或人工复核，不要接受完成。

## 证据与来源

- AO 依据调研《ferhatcore/claude-codex-project-os》。可核对：仓库与面向 Claude Code/Codex 的项目工作区骨架；Node.js 22+；无需安装 npm 包；scripts/init.mjs 的 --target / --example / --runtime claude|codex|both / --name；生成 CLAUDE.md、AGENTS.md、项目 skills 和四个角色定义；.project-os.json 记录 runtime、仓库列表、worker cap（lean/standard/heavy）和模型偏好；示例 Trailboard 的命令 node repos/catalog/catalog.mjs 与 node --test repos/catalog/catalog.test.mjs；检查命令 node scripts/check.mjs、node --test scripts/system.test.mjs scripts/smoke.test.mjs scripts/runtimes.test.mjs、node --test examples/trailboard/repos/catalog/catalog.test.mjs；任务字段 repository、scope、branch、acceptance criteria、permissions；审批链人给范围与批准 → PM 写任务和计划 → Developer 修改 → 如需要安全审查 → QA 验收 → PM 检查完整性 → 人工批准 Git 操作 → 部署单独决策；同一仓库单 writer；安全审查与 QA 合计最多两轮失败循环；代码获批不等于 commit、push 或部署获批；安装器不启动 agent、不发模型请求；Codex 可用 $project-os-start。作者主张或未验证：README 没有量化效果数据、案例对比、返工率或时间节省数据；角色分工和 QA 收益主要是作者设计主张；README 声称检查覆盖三种 runtime、三种 worker profile、共享任务状态、生成的角色文件、安装拒绝、配置和 fixture 行为，并称 GitHub Actions 在 Windows/Linux 的 Node.js 22 上运行测试，但本材料未展示运行结果或验证记录内容；GitHub 指标只有 54 stars；材料只有 README，未包含 QUICKSTART、workflows、customization、troubleshooting、Codex verification record 等链接内容。
- AN 依据调研《abhigyan6/tri-agent-orchestrator》。可核对：仓库与通用 agent skill；三阶段 CLI 分工 agy 架构/审计、claude 实现、codex 测试/构建/PR；./bin/tri-agent doctor；./scripts/install-skill.sh（等价 tri-agent install-skill）；tri-agent handoff create --feature ... --completed ... --next ...；tri-agent run --workflow relay --prompt ... --dry-run；tri-agent handoff status；三个 workflow 文件 workflows/01-relay-pipeline.md、02-parallel-debate.md、03-redteam-audit.md 的名称与定位；HANDOFF.md 模板全文；doctor 示例输出；auth middleware 走查示例文件名。作者主张、无数据支撑：preventing hallucination cascades、delivering production-ready, verified code；没有指标定义、对比基线或结果数据。成熟度：仓库仅 30 stars，早期个人项目；agy 在清单中为 watch；原文只给 lib/agents.py、lib/orchestrator.py、workflows/*.md 的文件名与用途，没有贴出内部实现或 workflow 具体步骤，第 9 步之后无法从材料还原。
- AM 依据调研《chenhg5/myco》。可核对：单 Go 二进制，hub（注册表 + 每 agent 收件箱，SQLite）+ 每台机器一个 runner；runner 只开出站 HTTPS，不需要公网 IP 和开放端口；消息状态机为长轮询 → 租约 → 未确认过期重投 → 5 次失败标记，CLI 异常退出则任务失败并通知发送方；per-agent allow-list；runner.access 三档 readonly / workspace / full 并映射到 CLI 权限 flag；附件逐个 SHA-256 且只有收件方能下载；native macOS 签名公证，Windows 为 preview 且未签名；MIT；32 stars、单作者。命令与配置：deploy/install-hub.sh --domain auto、myco hub up --tunnel cloudflare --hostname hub.example.com、myco hub up --tunnel tailscale、deploy/install-client.sh、join link、myco agent list --online、myco message send --to ... --body ... --wait 15m、myco broadcast send --selector ... --body ... --wait 30m、myco exec --to build-shell --cmd ...、--attach、myco inbox wait、waker（webhook / claude_routine / github_dispatch / github_issue）、--harness template / --harness shell、myco harness list、JSON 输出、带 suggestion 的结构化错误、--dry-run、myco schema。作者主张、无数据支撑：No VPS required、Delegation that scales、Safe by default、won't interrupt a session you are typing in；README 没有 benchmark、用户案例、任务成功率、延迟数据或对比实验。未验证/局限：本次只读 README，未读 INSTALL.md / architecture.md / delivery.md；编排模板与调度策略、MCP endpoint、团队/角色、会话 fork 在 roadmap 未完成；hub 单点，未提 HA、备份、SQLite 规模上限、并发上限；cloud session 不能被 spawn；Cursor/Gemini/OpenCode 为 experimental；Windows 未签名。
- AK 依据调研《MiniMax-AI/mcode-agent-table》。可核对：仓库与 BYOB Table Protocol v0.1；Node ≥ 22.19；npm test 覆盖 core、topologies、tasks、HTTP/SSE、persistence、MCP bridge、Rabbit Hole；npm run demo:scripted 离线跑；npm run demo:mcode 需 mcode ≥ 0.6.3 和 MiniMax API key；npx tsx src/cli.ts serve/keygen/create/join/say/read 命令；table-config.json 的 termination 缺失会拒建；12 个 MCP 工具；byob_approve 的 elicitation 行为；账本 append-only、seq 1..n、replay 重建；watchdog 标 stalled；verified 必须由不同席位完成。作者主张或未验证：prompt 缓存命中率尚未测量和调优；v0.1 单机、联邦在 roadmap；生态很早期，建议小范围试用，不要直接当生产方案。
- AL 依据调研《digilogd-cmd/ai-dev-director》。可核对：Windows 10/11、Python 3.9+、Git；至少两个已用订阅账号登录的 CLI（claude、codex、agy）；不需要 API key，代码会剔除所有 *_API_KEY；pip install -r requirements.txt 与 python -m pytest -q 用桩 CLI 跑测试；start-companion.ps1 / start-companion.sh 启停控制台；python director.py run/mission/do/status/clean-worktrees 命令；config.yaml 分 head/builder/reviewer、autonomy、quick/standard/deep，并把项目级验证命令放在 config.yaml；Scope Guard 检查允许路径/保护路径/文件数/diff 上限；构建只发生在 .director_worktrees/；REVIEWER fail-closed；HEAD 与 REVIEWER 同供应商时标 REDUCED_INDEPENDENCE；停止按钮/stop 立即终止进程树且 Mission 固定 STOPPED；控制台只绑 127.0.0.1，状态变更需本地来源校验 + data/solomon-bridge.token。作者主张或未验证：作者称这是每天在用的代码；2026-11-04 基准 593/596 通过，两个旧 UI 测试期待“拒绝非仓库文件夹”而 v3.0 起支持空文件夹，一个快照排除列表 fixture 漂移；MIT 许可；42 stars；没有“用了它之后代码质量/交付速度提升多少”的量化对比，每日使用是自述；布局说明写“604 tests”，快速开始写“593/596”，数字不一致，以实际运行为准；macOS/Linux 代码齐备但未在真机验证，部分测试假定 Windows 盘符路径；整文件 JSON 提案在大型改动上会撞 CLI 输出上限；完全受订阅配额约束；真实三 CLI 端到端只以 opt-in 标记运行。
- A 依据《Jakeschincariol/arena-skill》；B 依据《matank001/clodfarm》；C 依据《mvschwarz/openrig》；D 依据《code-yeongyu/oh-my-openagent》；E 依据《bytedance/deer-flow》；F 依据《crewAIInc/crewAI》；G 依据《leonvanzyl/cubefarm》；H 依据《Show HN: Offrun》；I 依据《manaflow-ai/cmux》；J 依据《pullboard-dev/pullboard》；K 依据《SaM-runtime/claude-console》；L 依据《glmn-ai/neurosquad-cli》；M 依据《@yanhua1010》；N 依据《nateherkai/roast-room》；O 依据《josefchen/muster》；P 依据《Cleveland-RD/hivehouse》；Q 依据《@Klonzu》；R 合并《@hwangxin》与《@MindfulReturn》；S 依据《@mirku21》；T 依据《feder-cr/git-ai》；U 依据《@thedelost》；V 依据《olivieropinotti/orchestrator-skill》；W 依据《timscheuerai/grokbot-gtm-team》；X 依据《BlackAngel242/MyTeam》；Y 依据《@RoundtableSpace》；Z 依据《tomtomsatnav/agent-orchestration-standard》；AA 依据《@runes_leo》；AB 与 AC 依据《We ran AI agent swarms in Minecraft and Mindustry》；AD 依据《Bearisbug/imbo》；AE 依据《eduwxyz/tucano》；AF 依据《Orkas-AI/Orkas》；AG 依据《Balanov/skein》；AH 依据《SamueleBassoli/hermes-fleet-apps》；AI 依据《StochasticResult/codex-cto-agent-team》；AJ 依据《Over9rowth/O9-RD-MAO-Governance》。这些路径中的效果描述多数是作者主张或 README 自述，具体可核对命令、版本、配置和测试以原调研为准；没有量化数据的地方不要当成已验证收益。

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
- [SamueleBassoli/hermes-fleet-apps](../research/radar/2026-11-03/9950-samuelebassoli-hermes-fleet-apps.md)：值得一试，建议小范围试：先用 Hermes Agent 搭 coordinator、coder、qa 三个角色，在 Windows/Python 本地小工具上跑通两道人审门和绿灯合并，再决定是否扩到七角色；理由是 README 给出了可操作的编排规则，但缺少完整配置与跨平台/非 Python 证据。
- [StochasticResult/codex-cto-agent-team](../research/radar/2026-11-04/10024-stochasticresult-codex-cto-agent-team.md)：值得一试，先只借用它的「任务交接模板（目标/权限/产出/验收/可写资源）+ 模型路由分级 + 验收证据规则」，用 plan-only 提示词和 1 个 PM+2~3 个工程师的最小配置在真实小项目上跑一轮；56 角色全铺开和私有状态机暂缓，因为原文只有设计与流程说明、没有效果数据，且明确声明不带后台调度、未做过客户端实测。
- [Over9rowth/O9-RD-MAO-Governance](../research/radar/2026-11-04/10028-over9rowth-o9-rd-mao-governance.md)：值得一试，建议小范围试用：该仓库提供了可直接复制的规则文件、零依赖 CLI 和 G0–G7 流程，能对多智能体编码工作流施加可验证的治理约束；但项目较新、缺少实际案例，需在团队内先做小规模验证。
- [MiniMax-AI/mcode-agent-table](../research/radar/2026-11-04/10234-minimax-ai-mcode-agent-table.md)：值得一试，先按 README 跑通离线 demo 和测试，再搭一桌两 owner 的小任务，验证「propose→approve→execute→verify」这条审批-执行-验证闭环；这套东西真正可复用的是把「谁批准、谁执行、谁验证、何时必须停」写成协议和账本，而不是多代理框架本身。但它还只是 v0.1、单机运行、缓存收益未测量、生态很早期，建议小范围试用，不要直接当生产方案写进手册。
- [digilogd-cmd/ai-dev-director](../research/radar/2026-11-09/11650-digilogd-cmd-ai-dev-director.md)：值得一试，可以在 Windows 环境下用两个已登录的订阅 CLI 小范围试用，把 HEAD/BUILDER/REVIEWER 分工、隔离 worktree、独立审查、Scope Guard 这套编排流程借鉴到自己的多代理编码验证中；理由是 README 给出了可复制的安装、运行命令与硬性安全规则，但 macOS/Linux 未验证、缺少效果量化数据，尚不宜全面采用。
- [chenhg5/myco](../research/radar/2026-11-09/11723-chenhg5-myco.md)：值得一试，建议先在一台机器上起 hub，接入 2–3 个已登录的 Claude Code/Codex 会话，用 `myco message send --wait` 和 `broadcast send --selector` 替代手工复制 prompt，跑一两周看重投、超时和上下文保持情况再决定是否扩到多机；理由是 README 给出了可直接照抄的安装与派活命令、明确的消息投递语义（租约、重投、5 次失败）和权限档位，形态完整，但项目仅 32 stars、单作者、部分 harness 标注 experimental、Windows 未签名，成熟度不足以上手即采用。
- [abhigyan6/tri-agent-orchestrator](../research/radar/2026-11-11/12505-abhigyan6-tri-agent-orchestrator.md)：值得一试，先照 README 把 `HANDOFF.md` 交接契约和 relay 流水线在一个中等规模任务上跑通（初期可只用 Claude Code + Codex 两个 agent，把 Antigravity 换成人工架构评审），跑通后再决定是否接入第三个 CLI；理由是原文给出了可直接照抄的命令、交接模板、分阶段提示词和目录结构，属于可执行的东西，但完全没有效果数据，且核心依赖之一（Antigravity）在清单里仍处于 watch 状态。
- [ferhatcore/claude-codex-project-os](../research/radar/2026-11-12/12625-ferhatcore-claude-codex-project-os.md)：值得一试，建议小范围试：先用示例工作区跑通 PM→Developer→QA→人工审批，再在一个低风险仓库用共享任务文件做 1–2 个真实任务；它给出了可复制的安装命令、角色分工和验收流程，但材料只有 README 且无效果数据，暂不宜直接 adopt。
