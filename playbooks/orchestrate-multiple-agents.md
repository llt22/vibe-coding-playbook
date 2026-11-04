# 让多 agent 的跨 owner 动作先批准、由本人执行、再由另一席位验证

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多 agent 协作里，提案、批准、执行和验证混在一起时，没人能说清谁授权、谁执行、凭什么算完成；手册用共享账本、席位协议和独立验证把这条链固定下来。
> 先试这一步：先跑 mcode-agent-table 的离线 demo 和 npm test，再搭一桌两 owner 的小任务走一次 propose→approve→execute→verify。
> 最近修订：2026-11-04

## 解决什么问题
单个 AI 回答或单条串行 agent 会话，交付的往往是你没有验证过的结果。手册把“不满意就重问一次”升级成一套可执行流程：任务写清、并行分工、独立验证、合入门禁、成本检查、注意力路由、共享账本核销、叫停与围栏，以及用角色化 fleet 把 spec、实现、独立 QA 分开。做法 A–AJ 覆盖从单次答案竞赛到多项目控制台、文件状态+心跳编排、多 agent 共享账本、长时运行骨架、跨会话/跨人的消息交接、把多个编码 agent 编成有频道、有审批闸门的团队、用显式任务图 + epoch 围栏做本地执行控制面、用 coordinator + coder + qa 三角色起步的角色化交付，以及两层治理：AI 用 CTO/PM/工程师三层把任务单和验收证据固化成交接契约；AJ 用 G0–G7 状态机 + 零依赖 CLI 把基线冻结、审批签名、黑盒 QA 和 fail-closed 校验做成可执行的门。

本次新增做法 AK：它不替换 Claude Code、Codex、Cursor 等 agent，而是在它们之上补一层“桌子”协议——bot 提议，受影响的 owner 批准，该 owner 自己的 bot 执行，另一个席位验证；账本状态到 verified 才算完成，bot 自己说 done 只是发言。共同底线不变：并行只负责产出，接受与否必须由测试、独立 verifier、校验器、接收人本人确认或人工复核决定；消息层和编排层只负责把问题送到、把人叫来，不负责证明结果正确。

做法 A–AJ 概览：
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

## 适用与不适用
**适用**
- 你有多个 agent，且这些 agent 属于不同 owner，或至少有“提案方”和“受影响方”的区别，需要写清谁批准、谁执行、谁验证。
- 你已经用 Claude Code、Codex、Cursor 等 MCP agent 干活，只想在它们之上补协作层与审批层，不想换掉执行工具。
- 你愿意用共享账本记录提案、批准、执行回执和验证结果，并接受“bot 说 done 不算完成，账本 verified 才算完成”。
- 你想先在一台机器、一张桌子、两个 owner、一个小任务上验证协议本身，而不是一上来铺多机生产。
- 你已有 A–AJ 中某条路径的验证门禁，AK 可作为“跨 owner 动作”的补充协议，不替代测试、独立 verifier 或合入门禁。

**不适用**
- 你只需要单 agent 串行问答，或任务没有跨 owner 的批准/执行/验证分离，AK 的席位和审批会变成额外开销。
- 你不能保管 owner 私钥文件，或会把 tao.owner.json 外传；席位签名和“bot 不能代签”是这套协议的前提。
- 你要求生产级多机、联邦、高可用；调研明确说 v0.1 只能在一台 table host 上跑，联邦仍在 roadmap。
- 你不能给每张表写出 termination 终止条件；缺 termination 会直接拒建。
- 你把“多 agent 跑通”当成结果正确性的证明；AK 只负责审批、执行、验证和账本，不证明业务结果对。
- 你需要已经量化过的缓存收益；调研中作者自己承认 prompt 缓存命中率尚未测量和调优，不能把缓存收益当成已验证结论。
- 你要把 AK 直接写进团队生产规范；它仍是 v0.1、生态很早期，建议小范围试用。

**A–AJ 的适用路径选择**：仍按原路径表按处境选：单回答竞赛用 A；可拆分有测试的编码任务用 B；多 harness 用 C；同会话升档用 D；长时程底座用 E；固定多步流水线用 F；GitHub 小仓库自动链路用 G；轻量 worktree 隔离用 H；macOS 通知用 I；同 commit 独立验证用 J；多项目控制台用 K；daemon+dashboard 用 L；主 Agent 集中验证用 M；商业决策委员会用 N；菜单栏审批用 O；tmux 会话团队用 P；阶段成本检查用 Q；持续 issue/PR 值守用 R；实验性 agent teams 用 S；服务端并发落库用 T；worktree 副本用 U；后台子代理调度用 V；Bot 编排层用 W；本地控制台与危机室用 X；按类别并行代码审查用 Y；文件状态+heartbeat 编排用 Z；止损预算用 AA；共享账本核销用 AB；长时运行骨架用 AC；跨会话消息交接用 AD；频道化代理团队用 AE；project+to-dos+自动化用 AF；任务图+epoch 围栏用 AG；三角色 fleet 用 AH；CTO/PM/工程师交接契约用 AI；G0–G7 治理门用 AJ。

## 前置条件
- 共同前提：把任务写成独立、自包含的文件；子代理看不到你的聊天记录，任务文件是它唯一的信息源。每条路径先做最小试用，不先上全量。
- AK 前置：Node ≥ 22.19；git；npm；一台单机跑 table host；owner 私钥文件必须私有保管；表配置必须包含 termination；MCP agent 跑在 owner 自己的机器上；能力卡来自 owner 侧文件，不来自 agent 自己。
- AK 安装与自检：
```bash
git clone https://github.com/MiniMax-AI/mcode-agent-table
cd mcode-agent-table
npm install
npm test
npm run demo:scripted
```
`demo:scripted` 离线跑，不需要 API key；`npm test` 覆盖 core、topologies、tasks、HTTP/SSE、persistence、MCP bridge、Rabbit Hole。
- A–AJ 前置：按所选路径检查版本、平台、登录和仓库条件；例如 A 需 Claude Code 可 spawn 子 agent，B 需 Docker 和一条验证命令，J 需 git 与 Node 22.13+，AH 需 Hermes Agent，AJ 需 Python 3 和至少 16 字符签名密钥。没有对应前置就不要硬套。

## 操作步骤
先按处境选路径。A–AJ 的详细命令保留在原做法中；本次新增 AK 的完整最小路径如下。

### 做法 AK：用共享账本+owner 签名席位做跨 owner 的 propose→approve→execute→verify
1. 环境准备。前提：Node ≥ 22.19，能联网拉依赖。执行上面的 clone、npm install、npm test、npm run demo:scripted。预期：测试通过，离线 demo 能跑完 debate → decision → owner approval → execute → verify。若 demo 不通过，先不要接真实任务。
2. 起一张桌子。终端 1：
```bash
npx tsx src/cli.ts serve --port 7341 --data ./data
```
预期：表主机在 7341 端口提供 HTTP + SSE，账本持久化到 ./data。
3. 生成 owner 密钥并建桌。终端 2：
```bash
npx tsx src/cli.ts keygen tao --out tao.owner.json
npx tsx src/cli.ts create table-config.json
```
table-config.json 必须写 id、topic、owners 的 public_key、topology、termination。public_key 从 tao.owner.json 读取；tao.owner.json 含私钥，不能外传。termination 不能省，缺了会拒建。预期：create 打印 table id 和 admin token。
4. 入座、发言、读投影：
```bash
npx tsx src/cli.ts join my-table --owner tao.owner.json --seat bot-tao --bot my-agent --out tao.seat.json
npx tsx src/cli.ts say --seat tao.seat.json hello-table
npx tsx src/cli.ts read --seat tao.seat.json
```
read 拿到的是本席位投影：稳定前缀（规则、席位、决议）+ 追加式尾部，无时间戳。预期：本席位能看到自己的前缀和尾部，其他席位有各自投影。
5. 接任意 MCP agent。在 Claude Code、Codex、Cursor 等 MCP 配置里设置环境变量 BYOB_URL=http://127.0.0.1:7341、BYOB_TABLE=my-table、BYOB_OWNER_KEY_FILE=指向 tao.owner.json、BYOB_CARD_FILE=指向 owner 侧能力卡。可用工具包括 byob_join、byob_read_projection、byob_say、byob_pass、byob_raise_hand、byob_propose、byob_decide、byob_approve、byob_status、byob_receipt、byob_verify、byob_memory。能力卡永远来自 BYOB_CARD_FILE，不来自 agent 自己；byob_approve 需要 owner 确认，客户端无法提问时直接拒绝；owner 也可以自己跑 byob approve。
6. 走一次跨 owner 动作。顺序固定：bot propose；受影响的 owner 签名 approve；该 owner 自己的 bot 执行并回执；另一个席位 verify。bot 说 done 只是发言，账本状态到 verified 才算完成；沉默任务由 watchdog 标成 stalled。预期：账本里能看到提案、批准、执行回执和验证结果，且验证席位与执行席位不同。
7. 可选：跑真实三方会话。前提：mcode ≥ 0.6.3 在 PATH 上，且有 MiniMax API key。设置 MINIMAX_BENCH_KEY 后运行：
```bash
npm run demo:mcode
```
场景是 bot-tao 正方、bot-jenny 反方且持有团队 taskboard 和私有记忆、judge 只看到双方发言，外加确定性 checker 占第四席；judge 的决议要动 Jenny 的 taskboard，因此等 Jenny 签名批准；Jenny 自己的 MCode 改文件并回执；checker 验证。账本、transcript、每轮 token 用量在 demo/out/。
8. 最小试用。选一个低风险、边界清楚的小任务，搭一桌两 owner：一个 owner 提案，另一个 owner 受影响并批准，执行由该 owner 的 bot 完成，验证由另一席位完成。先只跑 1–2 个任务，检查账本 seq 是否 1..n 无缺口、replay 能否重建 floor/seats/tasks/budget、未批准动作是否为 0。不要一上来接生产凭据，也不要让 bot 代签。

### 做法 A–AJ 的保留路径索引
- A：装 arena-skill，跑 `/arena --quick --seed 7`，用 baseline 传入旧答案；看盲评比分和攻击命中。
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
- N：clone roast-room，在文件夹里开 claude，输入 `/roast-room --quick 决策`，用 check_quotes.py 校验引用。
- O：macOS 14+ 装 Muster，逐代理开启 Answer prompts from Muster，练快捷键代答。
- P：装 hivehouse，先 relay 模式只对一个项目运行 `/hivehouse:start 任务`，push/deploy 留给人。
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
**AK 的可观察指标**
- npm test 是否通过；demo:scripted 是否完整跑通 debate → decision → owner approval → execute → verify。
- 一桌两 owner 小任务中，账本是否出现完整链路：propose、owner 签名 approve、该 owner 的 bot 执行回执、另一席位 verify。
- 账本 seq 是否 1..n 无缺口；replay 能否精确重建 floor、seats、tasks、budget。
- 未批准动作数应为 0；bot 自称 done 但账本未 verified 的条目数应为 0；stalled 任务是否被 watchdog 标出。
- 执行席位与验证席位是否为不同席位；同一席位既执行又验证的比例应为 0。
- 最小试用：1–2 天、一张桌子、两个 owner、一个小任务；先看协议闭环，不先追求吞吐。
- 缓存收益暂不作为指标：调研作者自己说尚未测量和调优缓存命中率，不能用“前缀稳定”推断成本一定下降。

**A–AJ 的指标**：沿用各路径原有指标，例如 B 看合入前测试通过率，J 看 gate 绿+verifier receipt，AH 看人工介入是否集中在审批门与发布/凭据，AJ 看 freeze 是否拦住空规格和冻结后改契约是否熔断。共同判断是：人工介入是否集中在授权、验收和发布；返工是否下降；验证是否由独立方完成；没有验证证据的“完成”是否被拒绝。

**试多久、什么时候升级**
- AK 先试 1–2 天、1–2 个小任务。只有协议闭环稳定、未批准动作为 0、账本可 replay、验证席位独立，才考虑加第三个 owner 或接更多 MCP agent。
- 如果多 agent 只是热闹、审批变成无脑点允许、或账本 verified 没有独立验证，退回单 agent + 明确测试/评审门禁，只保留“谁批准、谁执行、谁验证”的协议思路。
- AK 从单机扩到多机前，先确认联邦仍在 roadmap，不要假设已经支持。

## 常见坑
- AK 是 v0.1，单机 table host；联邦仍在 roadmap，不要写成已支持多机生产。
- prompt 缓存收益未测量：投影设计保住了稳定前缀，但作者明确说还没测量和调优缓存命中率，不要把缓存当已验证收益。
- 能力卡必须来自 owner 侧文件，不能来自 agent 自己；bot 不能代签，也不能自己扩权。
- byob_approve 通过 MCP elicitation 请 owner 确认；客户端无法提问时直接拒绝，这不是故障，是设计。owner 也可以自己跑 byob approve。
- bot 说 done 只是发言；账本到 verified 才算完成，且必须由不同席位验证。
- termination 不能省；缺终止条件的表会被拒建。watchdog 只是兜底，不是主动推进机制。
- tao.owner.json 含私钥，不能外传；被 deny 规则拦下的发言根本到不了桌面，不要以为发出去后被过滤。
- 不要一上来接生产凭据、不要一桌铺很多 owner；先用两 owner 小任务验证协议。
- 共同坑不变：消息层和编排层只负责把问题送到、把人叫来，不证明结果正确；没有测试、独立 verifier、校验器或人工复核，不要接受完成。

## 证据与来源
- AK 依据调研《MiniMax-AI/mcode-agent-table》。可核对：仓库与 BYOB Table Protocol v0.1；Node ≥ 22.19；`npm test` 覆盖 core、topologies、tasks、HTTP/SSE、persistence、MCP bridge、Rabbit Hole；`npm run demo:scripted` 离线跑；`npm run demo:mcode` 需 mcode ≥ 0.6.3 和 MiniMax API key；`npx tsx src/cli.ts serve/keygen/create/join/say/read` 命令；table-config.json 的 termination 缺失会拒建；12 个 MCP 工具；byob_approve 的 elicitation 行为；账本 append-only、seq 1..n、replay 重建；watchdog 标 stalled；verified 必须由不同席位完成。作者主张或未验证：prompt 缓存命中率尚未测量和调优；v0.1 单机、联邦在 roadmap；生态很早期，建议小范围试用，不要直接当生产方案。
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
