# 把编码 agent 的上下文当成预算来管

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 在真实任务里会被工具输出塞满上下文、跨会话失忆、配额提前耗尽、规则文件冗长重复；这篇手册给出一套可逐项试用的上下文预算管理做法，并把自动压缩阈值也纳入可调参数。
> 先试这一步：先做成本最低的做法 N：在 Claude Code 里运行 /context 看清 token 去向，然后只改一项——先禁用当前会话里用不到的 MCP 服务器。
> 最近修订：2026-10-12

## 解决什么问题

编码 agent 会调用大量工具：读文件、grep、跑 shell、抓网页、扫日志、翻工单。原始数据直接进上下文，很快塞满窗口；会话压缩时状态还可能丢失。另一类浪费是把只需要一个小判断的问题做成全量读取，例如在 187 个文件里找处理 auth 的。还有机器层面的浪费：同一台机器装 Claude Code、Codex，每个工具各维护一份指令文件。还有上下文配置本身的浪费：旧提示习惯可能拖累新模型；CLAUDE.md、完整聊天记录、从不调用的 MCP 工具定义在每条消息里反复重发。长会话交接、AGENTS.md 常驻文件、以及 AGENTS.md 的长度本身，也都会持续吃配额。

本手册把对应做法合在一起：把工具输出挡在上下文之外（Context Mode、headroom）、把略读判断外包给小模型（Quicksilver）、用持久记忆保住跨会话状态（claude-mem、mem0、cognee）、把执行计划写到磁盘并靠 hook 重注入（planning-with-files）、把团队 trace 固化成技能（hivemind）、用录屏口述补上下文和反馈（blurt）、把 agent 规则集中成一份共享 AGENTS.MD 软链给同机多个工具共读（做法 L）、定期审查 CLAUDE.md / skills 里的过时指令（做法 M）、先给上下文预算做一次审计再逐项砍浪费（做法 N）、把长会话的自动交接与沉淀交给工具（做法 O、做法 P）、在你离开会话后自动落盘交接文档（做法 Q）、用一条提示词把 AGENTS.md 本身重组干净（做法 R）、先量出 AGENTS.md 的行数与字节数再压进 200 行 / 32 KiB 的长度预算（做法 S），以及把 Claude Code 自动压缩阈值从默认 1M 调到 400k（做法 T）。核心要求是：不只看节省比例，要用任务侧指标验证结果有没有变好。

## 适用与不适用

适用：

- 你正在用编码代理（Claude Code、Codex、Cursor 等）做真实编码任务，任务中本来就会产生大量工具输出。
- 你会经历会话压缩，或者需要跨会话继续同一个任务。
- 你有一类“读很多、只判断一点”的活：在大量文件、日志、工单里找少数命中项。
- 你有说不清、截图慢的界面问题，需要一个更自然的输入通道。
- 你要做长时编码任务，计划需要挺过 /clear、崩溃和 compaction。
- 你想让团队里多个 agent 复用已解决的问题，或想给 agent 加可编程的持久记忆。
- 你本机同时使用两个及以上支持“项目/全局指令文件”约定的编码 agent，希望同一套规则只维护一份。
- 你在维护 CLAUDE.md 或 skills，里面还残留为旧模型写的提示习惯。
- 你在用 Claude Code，有较长的 CLAUDE.md，接了多个 MCP 服务器而多数用不到，并且对用量/配额敏感。
- 你在长会话里经常撞上下文上限，经常手动 /clear 再重述，或者经常离开后回来发现缓存已失效。
- 你的项目里已经有一份体量不小的 AGENTS.md，想重组结构，或者想给它设一个可量测的长度上限。
- 你在用 Claude Code，额度按周统计，频繁触发自动压缩，并且能在设置/环境变量/官方文档里找到自动压缩阈值相关项；愿意用一周对照记录额度消耗与上下文返工情况。
- 你愿意装 MCP server / 插件 / hook / 本地代理 / skill / mod，并接受一次小范围试用。

不适用：

- 你对商用许可敏感。Context Mode 是 ELv2；cognee 的单 Postgres 图存储和本地 GLiNER 抽取器是 demo，生产版是授权产品。
- 你不能把内容发给第三方。Quicksilver 会把待扫描内容发到 TypeSafe API；mem0 默认依赖 LLM 与 embedding 供应商；cognee 配 LLM 后会发起 provider 调用；hivemind 默认把全部会话 prompt 与工具输出写进团队共享 workspace。
- 你希望直接拿到第三方验证过的 98% 节省、100x 提升、~10x token 节省等数字。这些数字都是各自 README 或项目自述。
- 你的任务很小、工具输出很少，装 hook / 代理 / 持久记忆 / mod 的开销可能不划算。
- 你不想改配置、不想重启客户端，或者沙箱里跑不了本地进程。
- 你的问题是纯后端、无界面、又拍不到；blurt 的前提是能看到问题或用手机拍到。
- 你只用单一 provider 或单一 agent。headroom 跨 provider 收益、做法 L 的多工具共读收益不成立。
- 你的系统不支持符号链接。
- 你不想引入 Postgres demo、Docker、Deeplake 账号或 600 MB 本地嵌入模型。
- 你用的不是 Claude Code：/claude-api prompt-audit、/context、/compact、/mcp、/handoff 都是 Claude Code 内命令；做法 Q 也是 Claude Code 插件。
- 你对“旧指令拖累新模型”要求现成实验证据；目前只有推文作者主张。
- 你的 CLAUDE.md 很短、也不接 MCP：做法 N 几乎没有可操作空间。
- 你用 5 分钟 prompt cache（API key、Bedrock、Vertex 用户，以及进入 usage credits 的订阅用户）。ctx-handoff 的空闲刷新会失效，需要手动 /handoff refresh off；做法 Q 也可能错过热缓存窗口。
- 你的 Claude Code build 不带 function hooks（mods）。ctx-handoff、claude-auto-handoff、obie/auto-handoff 都依赖它。
- 你要的是稳定、久经考验的方案。做法 O、P、Q 的关键行为都尚未被第三方实测。
- 你希望交接能带上图片/附件：做法 O、P、Q 都只写文本，图片必须在交接后重新粘贴。
- 你把会话用 wrapper 管道化：claude-auto-handoff 与这种管道不兼容。
- 你希望由 mod 自己判断简报写得好不好；claude-auto-handoff 的判定很宽松。
- 你已经用做法 O 或做法 P 管同一个会话；同一条会话先只加一个，不要叠加。
- 你的工作目录不是 git 仓库，或者你不允许插件运行 git status；做法 Q 的默认交接 skill 依赖 date 和 git status。
- 你无法为自定义交接命令预批准工具，也不能把会话放在允许写入的权限模式下。
- 你的项目很小，或者根本没有 AGENTS.md：做法 R、做法 S 没有可操作对象。
- 你指望原文告诉你三个子代理是并行还是串行、什么叫“更激进”；原文都没有说明。
- 你找不到 /writing-for-agents 这个命令；原文没有说明来源和安装方式。
- 你要求做法 R 有现成效果证据；原文只给了互动量。
- 你不使用 Codex 或 Claude Code，或者项目不依赖 AGENTS.md 类配置文件；做法 S 的长度预算不适用。
- 你希望做法 S 给出“精简 AGENTS.md 的具体方法”；原文只说“强烈推荐精简”。
- 你希望做法 S 有实验数据支撑“越长越不容易遵循”；原文只有作者主张。
- 你希望知道超限后的确切行为、是否支持按目录分层加载、读取顺序与叠加规则；原文在关键处被截断。
- 你希望做法 T 给出确切的写入方式、配置文件字段、环境变量名或启动参数。原文只给了参数名 autoCompactWindow 和目标值 400k，没有给写法、生效方式、样本口径和验证方法。找不到这个参数时，本条应降级为“知道有这回事”的 study 级线索。
- 你希望做法 T 适用于短会话或额度充裕的用户；原文说默认 1M 触发压缩几乎没有节省，短会话或额度充裕的人可能几乎无感。
- 你要求做法 T 有可复现的统计口径。原文只说 7 天回溯实测每周省约 29% 额度，没有给样本量、模型版本、每天会话数、任务类型和额度计算口径。
- 你打算同时改做法 N 的 60% 和做法 T 的 400k。材料没有说明两者是不是同一个设置、能否同时设置；同一条会话先只改一项。

## 前置条件

- 如果走 Claude Code：Claude Code v1.0.33+（Context Mode 要求），用 claude --version 确认。claude-mem 要求 Claude Code 最新版且支持插件。
- Node.js/npm 可用。Quicksilver 要 Node 18+；claude-mem 要 Node 20.0.0+，Bun 和 uv 缺失时会自动安装，SQLite 3 已捆绑；headroom 要 Python 3.10+；hivemind 要 Node >= 22.0.0；planning-with-files 安装走 npx skills。
- 一个真实编码任务，最好本来就有大量工具调用，能对比前后差异。不要用玩具任务。
- 做法 L 额外需要：本机确实同时使用两个及以上支持同类指令文件约定的编码 agent；系统支持符号链接。
- 做法 M 额外需要：本机已安装并可正常使用 Claude Code；目标项目里已有 CLAUDE.md 或 skills 配置文件；先备份当前 CLAUDE.md。
- 做法 N 额外需要：Claude Code；有较长的 CLAUDE.md；接入了多个 MCP 服务器而其中多数用不到；对用量/配额敏感。做法 N 不需要装任何新工具。
- 做法 O 额外需要：带 function hooks（mods）的 Claude Code build；目标场景是 1M 上下文模型 + 1 小时 prompt cache 的订阅用户；能 clone 并以 --plugin-dir 加载，或能改 ~/.claude/settings.json 的 env。
- 做法 P 额外需要：带 mods 的 Claude Code 构建；能 clone 并以 --plugin-dir 加载，或能改 ~/.claude/settings.json 的 env；~/.claude/state 与 ~/.claude/auto-handoff/ 可写；可选 Tailscale、jq、终端超链接支持。
- 做法 Q 额外需要：已安装并运行 Claude Code；能安装插件并在下次会话启动时加载；工作目录是有 git 仓库的目录；能写入 docs/handoffs/；若自定义交接命令，必须给它 allowed-tools 预批准工具，或把会话放在允许写入的权限模式下。
- 做法 R 额外需要：仓库里已有一个（作者描述为“一团乱麻”）的 AGENTS.md；准备一个可读写的 CODING_STANDARDS.md；使用支持子代理、且能创建 PR 的编程智能体；已配置可用的 /writing-for-agents 命令或技能；没有它就直接把提示词原文粘贴给智能体。
- 做法 S 额外需要：使用 Codex 或 Claude Code；项目里已有（或准备新建）AGENTS.md 这类代理配置文件；能在项目根目录运行 wc -l 与 wc -c；一个你近期 1–2 周会持续使用的项目。做法 S 不需要装任何新工具。
- 做法 T 额外需要：使用 Claude Code；额度按周统计；能在 Claude Code 的设置/环境变量/官方文档中找到与自动压缩阈值相关的项，原文提到的名字是 autoCompactWindow；能接受用一周默认值、一周 400k 的方式做对照，或者用同一组固定任务反复跑；能记录额度消耗、自动压缩触发次数、重复交代上下文的次数、因丢失前文导致的返工/重开次数、任务一次做对比例。原文没有给出这个参数写在哪里、怎么写，第 2 步必须自己核对，核对不到就不要照做。
- 各自的凭据与许可：Quicksilver 到 console.typesafe.ai 申请 Jev key，内容会发到第三方 API；claude-mem 标准安装要求浏览器登录，可显式传 --provider、设 CLAUDE_MEM_ONLINE_OPTIN=false 或在 CI 运行；headroom 匿名 beacon 默认开启，可 HEADROOM_BEACON=off；mem0 默认依赖 OpenAI 的 gpt-5-mini 和 text-embedding-3-small；cognee 无 LLM key 时可用本地 GLiNER 与本地 embedding；planning-with-files 状态标记必须保持英文字面量；hivemind 需要 Deeplake 账号 token；obie/auto-handoff 是 MIT，仓库 35 stars。
- 知道 Context Mode 是 ELv2 许可，推广前确认商用合规。
- 如果走完整插件，能修改 ~/.claude/settings.json 并重启 Claude Code。

## 操作步骤

先选做法：

- 只想先省上下文、不想装 hook，且用 Claude Code → 做法 A（Context Mode MCP-only），推荐先做。
- 想让它自动拦截大输出、自动路由到沙箱 → 做法 B（Context Mode 完整插件）。
- 用 Cursor、插件未上架 → 做法 C。
- 主要痛点是“读很多、只判断一点” → 做法 D（Quicksilver 做批量略读判断）。
- 主要痛点是“换会话就失忆、反复交代背景” → 做法 E（claude-mem）、做法 H（mem0）、做法 I（cognee）三选一先试。
- 想在本地统一压缩所有经过 LLM 的流量，而且要求可逆 → 做法 F（headroom）。
- 痛点是不好描述、说不清复现步骤的界面问题 → 做法 G（blurt 录屏口述）。
- 长时编码任务、计划要挺过 /clear 或 compaction → 做法 J（planning-with-files）。
- 团队多 agent、想把重复模式固化成技能 → 做法 K（hivemind）。
- 需要可编程、按 user_id 隔离的持久记忆 → 做法 H（mem0）。
- 需要本地优先、知识图谱、无 LLM 也能检索 → 做法 I（cognee）。
- 同一台机器上同时用 Claude Code 和 Codex，规则要在多处维护、两边行为还不一致 → 做法 L（共享 AGENTS.MD + 软链）。按“值得小范围试”对待，不要一上来就铺到所有 repo。
- 主要痛点是 CLAUDE.md / skills 里堆着旧提示习惯 → 做法 M（/claude-api prompt-audit，先只记录不改动）。
- 主要痛点是“配额/用量限制提前耗尽”，CLAUDE.md 很长、MCP 服务器一大堆 → 做法 N（先 /context 审计，再逐项砍）。这条不用装东西，成本最低，适合在做 A–T 之前先做一遍。
- 长会话经常撞上下文上限、每次都要手动 /clear 再重述 → 做法 O（ctx-handoff mod，先只跑 /handoff dry 看一次交接成本）。
- 长会话经常撞上下文上限、你想用一份可编辑、可落盘的交接简报替换内置 auto-compact → 做法 P（claude-auto-handoff，先用 AUTO_HANDOFF_TOKENS=60000 跑一次交接）。做法 P 与做法 O 同属“阈值自动交接”，同一条会话里二选一。
- 长会话经常离开去做别的事，回来发现缓存已失效、重读又慢又贵 → 做法 Q（obie/auto-handoff，先用默认 minutes=50 在一个有 git 仓库的真实长任务里试一次）。做法 Q 是“空闲到点就自动交接”，与 O、P 的“阈值触发”不同；同一条会话先只加一个。
- 主要痛点是 AGENTS.md 自己一团乱麻 → 做法 R（一条可复制的提示词 + 三个递进激进的子代理 + 单个 PR）。先把当前文件备份到分支，只产 PR、先不合并。
- 主要痛点是 AGENTS.md 到底多长算超、想给常驻文件设一个可量测的上限 → 做法 S（先 wc -l / wc -c 量现状，再压到 200 行以内 / 32 KiB 以内）。做法 S 管“长度”，做法 R 管“结构”，做法 M 管“内容”。
- 主要痛点是额度提前耗尽、频繁触发自动压缩，并且你能找到 autoCompactWindow → 做法 T（先把阈值从默认 1M 改成 400k，再用一周对照记录额度消耗与上下文返工）。做法 T 和做法 N 都在调自动压缩，但一个给窗口大小、一个给百分比；材料没说明是否为同一设置，同一条会话先只改一项。

这些做法可以叠加，但一次只加一个，否则分不清是哪个起了作用。

### 做法 A：MCP-only 轻量试用（推荐先做）

1. 确认 Claude Code 版本：
   ```bash
   claude --version
   ```
   预期：版本不低于 v1.0.33。低于这个版本先升级。

2. 添加 MCP server：
   ```bash
   claude mcp add context-mode -- npx -y context-mode
   ```
   预期：注册 11 个 ctx_* 工具。这个方式没有 hook、没有自动路由，只有工具。

3. 重启 Claude Code。预期：在会话里能调用 ctx_* 工具。

4. 准备一个真实编码任务，任务里本来就会产生大量工具输出。

5. 任务开始前和结束后输入 ctx stats。预期：能看到按工具的节省明细、消耗 token、节省比例。

6. 手动提示模型使用 ctx_* 工具：批量读取、统计、聚合类工作先用 ctx_execute 写脚本完成，只输出结果。

7. 记录任务结果：正确率、人工纠正次数、交付时间。最好和不用 Context Mode 的基线对比。

8. 根据结果决定是否上做法 B，或者是否推广到团队。

### 做法 B：完整插件（自动路由 + hook）

1. 前置：Claude Code v1.0.33+。
2. 添加 marketplace：
   ```
   /plugin marketplace add mksglu/context-mode
   ```
3. 安装插件：
   ```
   /plugin install context-mode@context-mode
   ```
4. 重启 Claude Code，或执行 /reload-plugins，然后用 /context-mode:ctx-doctor 验证。预期：所有检查为 [x]。
5. 可选：加状态栏。一次性编辑 ~/.claude/settings.json：
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "context-mode statusline"
     }
   }
   ```
   重启后状态栏显示 $ saved this session · $ saved across sessions · % efficient。
6. 用斜杠命令查看状态：ctx-stats、ctx-doctor、ctx-index、ctx-search、ctx-upgrade、ctx-purge、ctx-insight。
7. 跑真实任务，对比结果。完整插件会通过 hook 自动拦截会产生大输出的工具，并自动路由到沙箱。

### 做法 C：其他平台（按 README 配置，先小范围试）

- Cursor 插件仍在审核中。可本地安装：macOS/Linux 用 ln -s "$PWD/context-mode" ~/.cursor/plugins/local/context-mode；Windows 用 robocopy。也可手动建 .cursor/mcp.json 和 .cursor/hooks.json，并拷 .cursor/rules/context-mode.mdc。注意项目 .cursor/hooks.json 会覆盖 ~/.cursor/hooks.json，旧残留会重复触发。
- Gemini CLI：npm install -g context-mode，在 ~/.gemini/settings.json 注册 mcpServers 与 BeforeTool、AfterTool、PreCompress、SessionStart 四个 hook；重启后 /mcp list 应显示 Connected。
- VS Code Copilot、JetBrains Copilot、GitHub Copilot CLI、OpenCode / KiloCode、OpenClaw / Pi Agent：按 README 注册 MCP 与 hook。注意 GitHub Copilot CLI 的 hook 调用全局 context-mode，旧版本 fail open；OpenCode 同时存在 plugin 与 mcp.context-mode 会注册 0 个 ctx_* 工具，需 context-mode upgrade；OpenClaw / Pi Agent 原文在安装步骤处被截断，照做前核对完整文档。

### 做法 D：把“略读型批量判断”外包给 Jev（Quicksilver）

适用形态：一个窄的、带类型的判断，作用在大量条目上。Jev 返回带类型的判定，Claude 只拿回一个 shortlist。

1. 前提：Claude Code 已安装；Node 18+；到 console.typesafe.ai 申请 Jev key。内容会被发送到 TypeSafe 的 API。
2. 交互式安装：
   ```bash
   npx github:UditAkhourii/quicksilver
   ```
   装完重启 Claude Code。之后 Claude 在任务看起来像“读很多来判断一点”时会自行调用这个 skill。
3. 非交互安装：
   ```bash
   npx github:UditAkhourii/quicksilver install --key YOUR_JEV_KEY
   ```
4. 作为 Claude Code 插件安装：
   ```
   /plugin marketplace add UditAkhourii/quicksilver
   /plugin install quicksilver@quicksilver
   ```
5. 常用命令：
   ```bash
   qs filter   "Does this file handle user sessions?" src
   qs filter   "Does this line report a failure?" app.log --lines
   qs classify --labels "bug,feature,question" --items issues.jsonl
   qs rank     "where do we issue refunds?" src --top 5
   qs find     "the retry backoff logic" huge_module.py
   qs ask      "Does this contract allow termination without notice?" --state @contract.txt
   qs status
   ```
6. 大扫描时加 --fast。README 原文：Add --fast to pack items and go about 10× faster on obvious needles。
7. 按 skill 要求改写提问：一次只问一个窄的、带类型的判断；写清边界情况；给兜底标签；不做算术、不涉及日期。
8. 读回执判断值不值：扫描数、命中数、borderline 数、耗时、Jev token 与成本、约多少 Claude token 没被读。
9. 安全边界：不会发送 .env*、私钥、证书、凭据文件；遵守 .gitignore；跳过二进制文件和大于 2 MB 的文件。key 保存在 ~/.quicksilver/config.json。删除 key：
   ```bash
   npx github:UditAkhourii/quicksilver setup --remove
   ```
10. 不要用它做写作、编辑、多步推理，以及任何 grep 能精确回答的问题。

### 做法 E：跨会话持久记忆（claude-mem）

1. 前提：Node.js 20.0.0+；Claude Code 最新版且支持插件。
2. 标准安装：
   ```bash
   npx claude-mem install
   ```
   安装器先完成部署，再要求浏览器登录 claude-mem。
3. 想跳过登录：显式传 --provider，或设 CLAUDE_MEM_ONLINE_OPTIN=false，或在 CI / 非交互 shell 中运行。
4. 插件市场安装：
   ```
   /plugin marketplace add thedotmack/claude-mem
   /plugin install claude-mem
   ```
5. 其他 harness：
   ```bash
   npx claude-mem install --ide opencode
   npx claude-mem install --ide antigravity
   npx claude-mem install --ide omp
   npx claude-mem install --ide grok-bot
   ```
6. OpenClaw 网关安装：
   ```bash
   curl -fsSL https://install.cmem.ai/openclaw.sh | bash
   ```
7. 重启 Claude Code。此后新会话会自动出现此前会话的上下文。
8. 配置写在 ~/.claude-mem/settings.json。可配 AI 模型、worker 端口、数据目录、日志级别、上下文注入设置。
9. 让 SessionStart 上下文包含所有 harness 的观察：设 "CLAUDE_MEM_SESSION_START_INCLUDE_ALL_SOURCES": "true"。
10. 隐私控制：用 <private> 标签把敏感内容排除在存储之外。
11. 检索三层工作流：search 约 50–100 tokens/结果；timeline 看时间线；get_observations 按 ID 批量取完整详情，约 500–1,000 tokens/结果。
12. 注意：npm install -g claude-mem 只安装 SDK，不注册插件 hook。装插件走 npx claude-mem install 或 /plugin。
13. 出问题时：把问题描述给 Claude，troubleshoot skill 会自动诊断；也可 cd ~/.claude/plugins/marketplaces/thedotmack && npm run bug-report。

### 做法 F：本地代理压缩所有 LLM 流量（headroom）

1. 安装（三种方式任选）。前提：Python 3.10+。
   ```bash
   uv tool install --python 3.13 "headroom-ai[all]"
   pip install "headroom-ai[all]"
   npm install headroom-ai
   ```
   注意：headroom CLI 只在 PyPI 包里；npm 包是库。
2. 选接入模式：
   ```bash
   headroom deploy
   headroom wrap claude
   headroom proxy --port 8787
   ```
   撤销用 headroom unwrap <tool>。
3. 自检与看省量：
   ```bash
   headroom doctor
   headroom perf
   headroom dashboard
   ```
4. 打开输出 token 削减（默认关闭）：
   ```bash
   export HEADROOM_OUTPUT_SHAPER=1
   headroom proxy --port 8787
   ```
5. 让工具自己学简洁度：
   ```bash
   headroom learn --verbosity
   headroom learn --verbosity --apply
   ```
6. 量测输出节省：
   ```bash
   headroom output-savings
   ```
   想看实测，留出 10% 会话作未处理对照组：
   ```bash
   export HEADROOM_OUTPUT_HOLDOUT=0.1
   ```
7. 关闭遥测：
   ```bash
   export HEADROOM_BEACON=off
   ```
8. 失败挖掘与回滚：
   ```bash
   headroom learn
   headroom learn --target CLAUDE.md
   headroom unwrap <tool>
   ```

### 做法 G：录屏 + 口述（blurt）

1. 安装 skill：
   ```bash
   npx skills add AGIHunt/blurt
   ```
   Claude Code 也可以用：
   ```
   /plugin marketplace add AGIHunt/blurt
   ```
2. 触发语：“start blurt” / 「开始口喷」。首次运行会自动挑语音模型，并安装 Blurt 菜单栏应用。
3. 划定录制区域：拖选区域、点选窗口，或全屏。
4. 倒计时后开始口述。快捷键：⌥⇧P 暂停、⌥⇧S 完成。
5. 点 Finish 后回到工作，agent 在本地转写、写出条目、打开评审页。
6. 像刷信息流一样逐条分诊：A 保留、X 丢弃、J/K 上下条、Z 撤销、G 列表、V 总览。然后导出，或对 agent 说 fix them。
7. 常驻用法：⌥⇧R 开始录制，再按一次结束；⌥⇧B 打开菜单。录制默认写到 ~/Blurt。
8. 后台自动处理：打开 After recording → Claude Code / Codex。
9. 团队协作：队友从 releases 页下载 Blurt for macOS，首次右键 → Open，按 ⌥⇧R 录制；然后用 Recent recordings → Copy video 贴到 Slack/飞书。
10. 语音模型与语言：默认本地 SenseVoice，约 240 MB；Apple Silicon 或 NVIDIA 上可用 Whisper；也可以自带 Groq、OpenAI 或 DashScope key；默认没有数据离开本机。

### 做法 H：mem0 可编程持久记忆

1. CLI 最小验证：
   ```bash
   npm install -g @mem0/cli      # or: pip install mem0-cli
   mem0 init --agent --agent-caller claude-code
   mem0 add "I am using mem0"
   mem0 search "am I using mem0"
   ```
   带用户隔离：
   ```bash
   mem0 init
   mem0 add "Prefers dark mode and vim keybindings" --user-id alice
   mem0 search "What does Alice prefer?" --user-id alice
   ```
2. 库方式：
   ```bash
   pip install mem0ai
   ```
   增强混合检索：
   ```bash
   pip install mem0ai[nlp]
   python -m spacy download en_core_web_sm
   ```
   核心模式：取记忆 → 拼进 system prompt → 生成回答 → 把整轮对话写回记忆。
3. 自托管服务器：
   ```bash
   cd server && make bootstrap
   cd server && docker compose up -d    # http://localhost:3000
   ```
   自托管默认开启鉴权。旧版升级需设 ADMIN_API_KEY，或仅在本地开发用 AUTH_DISABLED=true。
4. Agent Skills：
   ```bash
   npx skills add https://github.com/mem0ai/mem0 --skill mem0
   npx skills add https://github.com/mem0ai/mem0 --skill mem0-cli
   npx skills add https://github.com/mem0ai/mem0 --skill mem0-vercel-ai-sdk
   npx skills add https://github.com/mem0ai/mem0 --skill mem0-integrate
   npx skills add https://github.com/mem0ai/mem0 --skill mem0-test-integration
   npx skills add https://github.com/mem0ai/mem0 --skill mem0-oss-to-platform
   ```
5. 路线选择：测试/原型用库；团队自建用自托管；零运维生产用云平台。旧版升级见 https://docs.mem0.ai/migration/oss-v2-to-v3。
6. 注意：README 分数反映托管平台，包含开源 SDK 不具备的专有优化；ADD-only 抽取意味着记忆只累积不覆盖，原文未说明如何清理错误记忆。

### 做法 I：cognee 本地知识图谱记忆

1. 安装：
```bash
uv pip install "cognee[gliner]"
```
2. 无 LLM 本地跑通“写入 + 检索”：
```python
import asyncio
import cognee

async def main():
    await cognee.remember(
        "Marie Curie was born in Warsaw and worked at the University of Paris.",
        dataset_name="local_quickstart",
    )
    results = await cognee.recall(
        "Where was Marie Curie born?",
        datasets=["local_quickstart"],
    )
    for result in results:
        print(result)

if __name__ == "__main__":
    asyncio.run(main())
```
CLI 等价写法：
```bash
cognee-cli remember "Marie Curie was born in Warsaw." -d local_quickstart
cognee-cli recall "Where was Marie Curie born?" -d local_quickstart
```
注意：无 LLM 时 recall 返回匹配到的源文本片段，不生成答案。
3. 预置图谱 demo：
```bash
cognee-cli demo
```
4. 配置 LLM：
```python
import os
os.environ["LLM_API_KEY"] = "YOUR OPENAI_API_KEY"
```
5. Claude Code 插件：
```bash
claude plugin marketplace add topoteretes/cognee-integrations
claude plugin install cognee-memory@cognee
```
6. Codex：
```bash
codex features enable hooks
codex plugin marketplace add topoteretes/cognee-integrations --ref main
codex plugin add cognee@cognee
```
或改 ~/.codex/config.toml：
```toml
[features]
hooks = true
```
7. 本地 UI：
```bash
cognee-cli -ui
```
8. Docker 跑 API demo：
```bash
docker run --rm -it -p 8000:8000 \
  -e LLM_API_KEY="sk-..." \
  -e ENABLE_BACKEND_ACCESS_CONTROL=false \
  -v cognee_storage:/cognee-storage \
  cognee/cognee:main
```
9. 从源码跑 API + UI + MCP：
```bash
docker compose --profile ui --profile mcp up
```
10. 单 Postgres 承载整个记忆层是 demo 特性；生产版本是授权产品。

### 做法 J：planning-with-files 磁盘计划

1. 前提：宿主支持 hook/插件或 Agent Skills；本机有 Node/npx。
2. 安装：
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g
```
中文版：
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-zh -g
```
状态标记必须保持英文字面量，例如 **Status:** complete。
3. 建立三文件结构：task_plan.md、findings.md、progress.md。并行任务用 .planning/YYYY-MM-DD-slug/，通过 .active_plan 指针选择。默认被 gitignore。
4. 与 Claude Code plan mode 衔接：plan mode 里设计并批准方案；接受后让智能体把方案写成 task_plan.md 的 phases，然后在普通模式执行。
5. 依赖 hook 持续注入：UserPromptSubmit hook 每回合重新注入 active-plan；/clear 或新会话后从磁盘重读。
6. 启用完成门槛：gated 模式下持有停止动作，直到计划报告完成。
7. 命名计划与选择器：两个命名计划时必须显式给 PLAN_ID；可用 PWF_PLAN_ROOT 固定、PLANNING_DISABLED 关闭；PWF_FAST_PATH=0 强制回到 shell 链。
8. 查看与选择计划：--list。
9. 任务结束后：计划文件是工作记忆，不是交付物；值得保留的内容应显式提升到代码、提交或文档。

### 做法 K：hivemind 团队 trace 技能化

1. 安装（macOS / Linux）：
```bash
curl -fsSL https://deeplake.ai/hivemind.sh | sh
```
Windows：
```powershell
irm https://deeplake.ai/hivemind.ps1 | iex
```
npm：
```bash
npm i -g @deeplake/hivemind && hivemind install
```
2. 授权登录：
```bash
HIVEMIND_TOKEN=<your-token> hivemind install
hivemind install --token <your-token>
```
3. 只给指定 assistant 安装：
```bash
hivemind install --only claude
hivemind claude install
hivemind codex install
hivemind claw install
hivemind cursor install
hivemind hermes install
hivemind pi install
hivemind claude_cowork install
```
4. 检查接线：
```bash
hivemind status
```
5. 重启对应 assistant。Codex 首次启动必须选 2. Trust all and continue；Claude Cowork 要完全退出并重开 Claude Desktop。
6. 可选语义检索：
```bash
hivemind embeddings install
hivemind install --with-embeddings
```
默认关闭，本地嵌入约 600 MB；不开则降级成 ILIKE 词法检索。
7. 关键环境变量：HIVEMIND_CAPTURE、HIVEMIND_WORKSPACE_ID、HIVEMIND_CAPTURE_ONLY_CLI、HIVEMIND_SKILLIFY_EVERY_N_TURNS、HIVEMIND_SUMMARY_EVERY_N_MSGS、HIVEMIND_SUMMARY_EVERY_HOURS、HIVEMIND_WIKI_WORKER、HIVEMIND_GRAPH_ON_STOP、HIVEMIND_DEBUG。
8. .hivemind 路由或退出：字段 orgId、workspaceId、collect；.hivemind 可提交，.hivemind.local 不提交且优先。collect:false 始终生效。优先级 env > file > login。
9. skillify：
```bash
hivemind skillify
hivemind skillify scope <me|team>
hivemind skillify pull
hivemind skillify unpull
```
10. 自然语言搜索 trace 与技能。
11. 代码库图与代码文档：
```bash
hivemind docs sync
hivemind docs list
hivemind docs auto on|off
hivemind docs agent [name]
```
12. 跨 agent 团队规则：
```bash
hivemind rules add "no DROP TABLE on prod creds"
hivemind rules list
hivemind rules edit <rule-id> "<new text>"
hivemind rules done <rule-id>
```
13. 卸载：
```bash
hivemind uninstall
hivemind codex uninstall
```

### 做法 L：一份共享 AGENTS.MD，软链给多个 agent 共读

原文只给了机制，没有给命令、路径或规则文本。涉及具体路径的地方必须自行按各工具当前文档确认。

1. 前提：本机确实同时使用两个及以上支持“项目/全局指令文件”约定的编码 agent；系统支持符号链接。
2. 建立一个单一共享文件夹。
3. 在该文件夹里写一份 AGENTS.MD，所有 agent 规则集中放这一份。写法建议同时参考做法 S 的长度预算。
4. 把这份 AGENTS.MD 软链到 Claude Code 和 Codex 各自期望读取的位置。原文未给出路径，示意形式如下（路径需按各工具文档确认，非原文内容）：
   ```bash
   # 示意，非原文给出的命令
   ln -s /path/to/shared/AGENTS.md /path/to/claude-code/expected/location/AGENTS.md
   ln -s /path/to/shared/AGENTS.md /path/to/codex/expected/location/AGENTS.md
   ```
   预期：两个工具实际读到同一份内容。
5. 对每个 repo 做同样处理。原文在“Every repo”处截断，完整做法不可知。
6. 先验证链路通没通：放一条可明确观察是否生效的独特规则，用同一个日常任务分别在这两个工具里跑。预期：两个工具都在输出里体现这条规则。若任一工具行为没有变化，说明软链路径写错了。
7. 链路确认后再写正式规则，用同一个日常任务分别跑一遍。
8. 只在一个 repo 上跑一到两周，不铺开到所有 repo。

### 做法 M：审查 CLAUDE.md / skills 里的过时提示习惯（先只记录不改动）

1. 前提：Claude Code 可用；已有 CLAUDE.md 或 skills；先保存副本。
2. 在项目目录下打开 Claude Code 会话。
3. 运行：
   ```
   /claude-api prompt-audit
   ```
4. 观察它对 CLAUDE.md 与 skills 的扫描结果。原文在此截断，没有说明输出形式、是否给出修改建议、是否需要人工确认。先只记录，不要预设它会自动改写文件。
5. 逐条复核旧式指令（如“逐步思考”“仔细检查你的工作”），判断保留、改写还是删除。
6. A/B 小范围验证：A 组保留，B 组删除或改写，用同一批 5–10 个真实任务各跑一遍。
7. 如果命令运行失败或不存在，降级为“定期审查 CLAUDE.md 里的过时指令”这一原则。
8. 与做法 L 的关系：先集中，再审查。
9. 与 Context Mode “不要加激进简洁提示词”的关系：两者不是同一类指令，但都说明提示词增减要靠任务侧指标验证。

### 做法 N：先审计上下文预算，再一次只改一项

1. 前提：Claude Code 可用；有较长的 CLAUDE.md；接入了多个 MCP 服务器而多数用不到；对用量/配额敏感。
2. 测量现状，运行：
   ```
   /context
   ```
   预期：能看到 token 去向。把关键数字记下来作为基线。
3. 只改一项，先禁用当前会话里没有用到的 MCP 服务器。入口命令：
   ```
   /mcp
   ```
   注意：原文在 /mcp 处截断，后续操作未知。这一步目前只能当排查入口用。
4. 如果还想继续，再单独试“把压缩阈值调早”。原文写的是“/compact 设置为 60%，而不是 95%”：
   ```
   /compact
   ```
   注意：原文只给了结论性数字，没有说明对应哪个设置项或命令参数。照做前先在设置里确认自动压缩阈值项在哪。
5. 只有前两项有效之后，最后再回头精简 CLAUDE.md。原文没有给出“怎么精简 CLAUDE.md”的具体做法。
6. 每改完一项，都用同一个类型的真实任务再跑一遍，并再记录一次 /context。一次只改一项。
7. 权衡：更早压缩意味着更频繁丢失上下文细节，可能换来更多重述和返工。
8. 与做法 M 的分工：做法 N 看 CLAUDE.md 吃掉多少 token，做法 M 审内容还适不适用。

### 做法 O：长会话自动交接与沉淀（ctx-handoff，experimental）

1. 前提：需要带 function hooks（mods）的 Claude Code build。版本不符时不要继续。
2. 克隆并首次加载：
   ```sh
   git clone https://github.com/cablate/ctx-handoff-mod ~/.claude/mods/ctx-handoff
   claude --plugin-dir ~/.claude/mods/ctx-handoff
   ```
   预期：会话里能调用 /handoff。
3. 跑 /handoff 自检。预期输出能看到上下文用量、门槛、刷新计数。
4. 想让每个会话都加载，在 ~/.claude/settings.json 的 env 里加绝对路径：
   ```json
   "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/home/you/.claude/mods/ctx-handoff" }
   ```
5. 按需调参：数值是 hooks/register.ts 顶部常量。默认 THRESHOLD 600_000、WINDOW_RATIO 0.8、IDLE_MS 55 min、MAX_REFRESH 3、MIN_TOKENS 30_000。
6. 如果你用 5 分钟缓存，必须关掉刷新：
   ```
   /handoff refresh off
   ```
7. 正式依赖前，先用 /handoff dry 看一次交接成本。
8. 常用子命令：/handoff、/handoff now、/handoff dry、/handoff distill、/handoff resume、/handoff continue、/handoff resend、/handoff refresh on|off、/handoff distill on|off。
9. 注意：交接只暂扣文本；distill 输出 JSONL，程序校验并落盘；notes 按项目归档；失败可见可恢复；推迟有硬上限。
10. 开发/自检：
    ```sh
    claude plugin validate .
    claude plugin test .
    tsc -p .
    ```
11. 先在单个会话、单个项目上验证。
12. 与做法 P、Q 的关系：三者都在做自动交接，触发条件不同；同一条会话先只加一个。

### 做法 P：用结构化交接简报替换内置 auto-compact（claude-auto-handoff，先小范围试）

1. 前提：需要带 mods 的 Claude Code 构建。
2. 克隆并加载：
   ```sh
   git clone https://github.com/alexknowshtml/claude-auto-handoff.git ~/claude-auto-handoff
   claude --plugin-dir ~/claude-auto-handoff
   ```
3. 可选：写进 ~/.claude/settings.json 的 env：
   ```json
   { "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-auto-handoff" } }
   ```
4. 配置：threshold 默认 160000；maxConsecutiveHandoffs 默认 2；briefTemplate 默认 ~/.claude/auto-handoff/brief.md；instructionsTemplate 默认 ~/.claude/auto-handoff/instructions.md；ignoreFiles 默认空；viewer 默认 tailscale:3846。环境变量：AUTO_HANDOFF_TOKENS=60000 可覆盖阈值；AUTO_HANDOFF_DISABLE=1 关闭；DISABLE_AUTO_COMPACT 也会关闭它。
5. 改简报结构与规则：改 ~/.claude/auto-handoff/ 下的副本，不要改仓库里的。不要写 files 和 commits 段；不要删掉 ## Last Request from the User 及其 Status 行。
6. 可选状态栏链接：statusline/handoff-link.sh。
7. 运行机制：阈值检查、Haiku 写简报、/clear、新会话播种、面板、查看器。
8. 开发校验：
   ```sh
   claude plugin validate .
   claude plugin test .
   ```
9. 日志：~/.claude/state/auto-handoff/auto-handoff.log。
10. 最小试用：设 AUTO_HANDOFF_TOKENS=60000，在一个不那么关键的长会话里跑一次完整交接。
11. 与做法 O、Q 的关系：同一条会话先只加一个。

### 做法 Q：空闲自动落盘交接（obie/auto-handoff，先小范围试）

1. 前提：已安装并运行 Claude Code。基于 early access 的 function hooks 插件 API。
2. 安装：
   ```
   /plugin marketplace add obie/auto-handoff
   /plugin install auto-handoff@auto-handoff
   ```
3. 可选调整触发条件。默认 minutes 为 50，默认 command 为 auto-handoff:handoff。
   ```
   /plugin configure auto-handoff
   ```
   或：
   ```bash
   echo '{"command": "my-plugin:my-handoff"}' | claude plugin configure auto-handoff@auto-handoff --values-stdin
   ```
4. 若换成自己的交接命令，必须给它 allowed-tools 预批准工具，或把会话放在允许写入的权限模式下。
5. 默认交接行为：写 docs/handoffs/<timestamp>-<slug>.md，覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions；运行 date 和 git status，不做任何提交。
6. 触发与取消规则：空闲计时从主对话 turn 结束开始，任何新 turn 重置；subagent 结束不影响；空闲达到 minutes 后执行 command；每次离开只交接一次；/clear 取消待执行；休眠迟到会跳过。
7. 可选本地开发：
   ```
   git clone https://github.com/obie/auto-handoff ~/projects/auto-handoff
   ln -s ~/projects/auto-handoff ~/.claude/skills/auto-handoff
   ```
   校验：
   ```
   claude plugin validate .
   claude plugin test .
   ```
8. 最小试用：在有 git 仓库的真实长任务里安装插件，先用默认配置 minutes=50；做一段有明确目标和未完事项的工作，然后离开/停止交互；检查 docs/handoffs/ 下是否生成文件并覆盖预期字段；开新会话只读 handoff 看能否接着干。
9. 与做法 O、P 的关系：同一条会话先只加一个。

### 做法 R：用一条提示词重组 AGENTS.md

适用形态：AGENTS.md 已经一团乱麻——空操作指令、一次性细则和真正的项目约定堆在一起。

1. 前提：仓库里已有一个 AGENTS.md；准备一个可读写的 CODING_STANDARDS.md；使用支持子代理、且能创建 PR 的编程智能体；已配置 /writing-for-agents。若没有这个命令，直接把下面提示词原文粘贴给智能体。
2. 在项目根目录启动智能体，发送：
```
/writing-for-agents 我的 AGENTS.md 简直一团乱麻，提出一系列重组方案，这些方案要：

- 移除空操作
- 使用渐进式披露
- 将指令移至 CODING_STANDARDS.md

将你的工作应用到三个子代理上，每个子代理都比前一个更激进。创建一个单一的 PR。

AGENTS.md
```
3. 让智能体按提示词自行派生三个子代理执行重组，最终汇总为一个 PR。原文没有说明三个子代理是并行还是串行，也没有定义“更激进”具体指什么。
4. 人工审查这个唯一 PR，决定采纳哪一版或如何合并。先备份、只产 PR、暂不合并。
5. 判断“更激进”有没有产生信息量：如果三份方案几乎一样，说明这个设计没有起作用。
6. 与做法 L、M、S 的分工：先量（S）、再集中（L）、再重组结构（R）、再逐条审内容（M）。这是本手册建议的顺序。

### 做法 S：给 AGENTS.md 设一个长度预算（200 行 / 32 KiB）

1. 前提：使用 Codex 或 Claude Code；项目里已有（或准备新建）AGENTS.md；能在项目根目录跑 wc；准备一个近期 1–2 周会持续使用的项目。
2. 量现状：
   ```bash
   wc -l AGENTS.md
   wc -c AGENTS.md
   ```
   预期：拿到行数与字节数。前者对应“200 行以内”，后者对应“Codex 默认最多读取 32 KiB”。中文内容按字节算更容易先撞 32 KiB 线，两条命令都要跑。
3. 判断撞的是哪条线。原文给的两个阈值来源不同：Claude Code 是文档建议 200 行以内；Codex 是默认最多读取 32 KiB、超出被跳过。200 行通常更紧。这一步是推算，原文没有直接比较两条限制。
4. 精简内容。原文只说“强烈推荐精简”，没有给出具体删减或拆分方法。可以借用做法 R 的重组提示词。
5. 建立复查动作。每次修改 AGENTS.md 后重跑两条命令，把长度当配额管。
6. 原文在“Codex 和 Claude Code 都会将你的 AGENTS.md”处截断，读取顺序、叠加规则、超限后的确切行为、是否支持按目录分层加载都未展开；照做前先回官方文档确认。
7. 只改 AGENTS.md 这一个变量做前后对比。记录规则违反次数、重复纠正次数、需要人工介入的回合数、任务一次通过率。

### 做法 T：调低自动压缩阈值（autoCompactWindow 从 1M 到 400k，先小范围试）

适用形态：你在用 Claude Code，额度按周统计，频繁触发自动压缩，并且能在设置/环境变量/官方文档里找到与自动压缩阈值相关的项。原文称默认 1M 触发压缩“几乎没有节省”，把阈值调到 400k 后，7 天回溯实测每周可省约 29% 使用额度，且“不会出现严重的记忆退化”。原文只有一段话，没有给出配置文件的写法、生效方式和测试口径。按 study / 小范围试对待。

1. 前提：Claude Code 可用；额度按周统计；原提到的参数名是 autoCompactWindow；你能够自己核对它属于配置文件字段、环境变量还是启动参数。原文没有给出写入方式，核对不到就不要照做。

2. 确认参数存在。在 Claude Code 的设置/环境变量/官方文档中查找与自动压缩阈值相关的项。原文提到的名字是 autoCompactWindow，原文未说明它属于配置文件字段、环境变量还是启动参数。

3. 把阈值从默认的 1M 改成 400k。原文只给了参数名与目标值，写法需按你的版本核对，下面只是示意，不是原文给出的命令：
   ```
   # 原文只给出参数名与取值，以下语法为示意，请按实际版本的写法替换
   autoCompactWindow: 400k
   ```

4. 确认生效方式。原文没有说明改完是否需要重启会话或新开会话才生效，需自行确认。

5. 保持其他变量不变：同一模型、同一类任务、同一使用强度，否则省额度的对比没有意义。

6. 记录基线。先用默认值（1M）按原强度用满一周，记下额度消耗节奏；或者用同一组固定任务反复跑，而不是靠自然使用量对比。

7. 切到 400k 再记录一周。用同一口径记录额度消耗，并留意长会话中是否频繁丢失前文。

8. 只有“额度明显下降 + 上下文返工没有明显上升”时，才把这个设置保留下来。

9. 与做法 N 的关系：两者都在调自动压缩阈值，但做法 N 给的是百分比（95%→60%），做法 T 给的是窗口大小（1M→400k）。材料没有说明它们是不是同一个设置、能否同时设置；同一条会话先只改一项。

10. 与做法 O、P、Q 的关系：自动交接类做法管的是“上下文到阈值时怎么交接”；做法 T 管的是“阈值本身设在哪里”。材料没有说明能否共用；如果同时改，先只改 T 并观察一周，再考虑叠加交接。

## 怎么判断变好了

要分两类指标看：工具侧（省了多少上下文/token）和任务侧（结果有没有变好）。这些项目的 README 普遍只给上下文或成本指标，没有给任务结果质量指标，所以任务侧必须自己测。

工具侧指标：

- Context Mode：ctx_stats / ctx-stats；状态栏 $ saved this session · $ saved across sessions · % efficient；ctx_doctor / ctx-doctor 检查运行时、hook、FTS5、注册、版本，所有检查应为 [x]。
- Quicksilver：每次运行末尾的回执（扫描数、命中数、borderline 数、耗时、Jev token 与成本、约多少 Claude token 没被读）；qs status 看 key 状态和累计节省 token。
- claude-mem：看新会话是否自动注入此前上下文，以及主动检索的命中率；README 只提出三层工作流可带来 ~10x token 节省，没有可复核的实验数据。
- headroom：headroom doctor、headroom perf、headroom dashboard；headroom output-savings 默认给估计值，想看实测就开 HEADROOM_OUTPUT_HOLDOUT=0.1，dashboard 的 Output Tokens Saved 卡片会显示 measured 并带区间。
- blurt：录制到评审页的端到端耗时；每次录制的 token 与实际花费。
- mem0：CLI 四步先跑通；再用 search + add 嵌进一个固定 user_id 的重复性任务做 1–2 周小范围试。
- cognee：无 LLM 本地 remember / recall 先跑通；再通过插件或 MCP 接进现有 agent 做 1–2 周对照试用。
- planning-with-files：在同一个长时编码任务上做 A/B，观察 /clear 或 compaction 后的重新定位轮数是否下降。
- hivemind：先在一个仓库、一个 agent 上小范围试，用 .hivemind 限定捕获范围，再看 skillify 是否真的产出被复用的 SKILL.md。
- 做法 L：没有工具侧指标，唯一能用的是行为观察——两个工具是否真的读到了同一份文件、是否遵守同一条规则。
- 做法 M：材料没有给出工具侧指标；推文互动量不是效果证据。
- 做法 N：唯一的工具侧反馈就是 /context 本身——看 CLAUDE.md、聊天记录、MCP 工具三类来源的 token 占比是否下降。
- 做法 O：/handoff 一次显示上下文用量、阈值、刷新与 distill 状态、待处理的 away handoff、交接失败原因、非法 JSONL 样本与原因；/handoff dry 会显示交接成本。
- 做法 P：面板的 ✓ handed off · 162k → 45k 前后 token 对比与 open brief 链接；auto-handoff.log 记录全部动作、失败与 facts-only 回退。
- 做法 Q：原文没有给出量化指标；可自行观察是否按预期只触发一次、交接文件是否生成在 docs/handoffs/ 下并覆盖预期字段、新会话只读 handoff 能否接着干。
- 做法 R：AGENTS.md 的体积变化；被删除或合并的空操作条目数量；三个子代理方案的差异度。
- 做法 S：唯一的工具侧读数就是 wc -l AGENTS.md 和 wc -c AGENTS.md 两个数字——精简前后各记一次，看是否落进 200 行 / 32768 字节以内。
- 做法 T：没有工具侧读数能直接看。原文唯一给的指标是每周额度消耗百分比（约 29%），并附带一个定性指标“记忆退化是否严重”。原文没有给样本量、模型版本、每天会话数、任务类型、额度计算口径和图表原始数据。只能把 29% 当乐观参照，不是预期值。过程指标可以看自动压缩触发次数、单次会话可用有效上下文长度。

任务侧指标：

- 正确率：任务结果是否正确。Quicksilver 基准里出现过省 85% token 但 F1 从 54% 掉到 23% 的情况。
- 人工纠正次数、交付时间、会话连续性：压缩后 agent 是否还能检索到之前的状态和决策；/clear 或 compaction 后重新定位需要多少轮。
- 可工作轮数/时长（做法 N）：同样配额下能连续工作多久、完成多少轮。
- 重述需求次数（做法 N，反面指标）：同一任务里需要重述需求的次数是否上升。
- 返工与纠正次数（做法 N，反面指标）：同一任务里的返工、纠正次数是否上升。
- 条目保留率（blurt）：按 A 保留的条数 / 总条数。
- 团队复用率（hivemind）：skillify 产出的 SKILL.md 是否被其他会话或其他人的 agent 实际拉取并复用。
- 规则生效次数、重复交代次数、行为不一致次数、维护成本、返工次数（做法 L）。
- 一次通过率、人工纠正/追问次数、输出长度与 token 消耗、反向校验（做法 M）。
- 交接后重新定位轮数、同一纠正的重复次数、交接与 distill 成本（做法 O）。
- 新会话能否直接续上、简报事实准确率（做法 P）。
- 新会话恢复时间与手动补充次数、交接 turn 成本对比（做法 Q）。
- 渐进式披露是否真的生效、指令遵循率前后对比（做法 R）。
- 规则违反次数、重复纠正次数、需要人工介入的回合数、任务一次通过率（做法 S）。
- 做法 T 的任务侧指标：重复交代上下文的次数、因丢失前文导致的返工/重开次数、任务一次做对的比例。判定标准：额度消耗下降明显（以原文的 29% 为乐观参照），且重复解释与返工次数没有可感知上升，才保留该设置；若上下文返工明显变多、省下的额度不足以抵消重做的成本，回到 1M 或取中间阈值再试。

最小试用方式：

1. 按做法 A，在 Claude Code 上用 MCP-only 跑一个真实编码任务；前后用 ctx stats 记录；同时记录任务侧指标。
2. Quicksilver：用少量已标注样本核对后再扩大。先跑一条 qs filter，读回执，再抽查被标 ? 的边界项。
3. claude-mem：1 台机器、1 个已有项目、1–2 天，跑 3–5 次带工具调用的会话，开新会话看是否自动注入；再用 <private> 包假敏感信息验证。
4. headroom：先跑 headroom doctor，看 dashboard；开 HEADROOM_OUTPUT_HOLDOUT=0.1 拿实测；不满意用 headroom unwrap <tool> 回滚。
5. blurt：选一个有真实小 bug 的 Web 项目，录 5–10 分钟走查，中途跳一次话题、改一次口径；用键盘 A/X/J/K 过一遍；对保留条目说 fix them。
6. mem0：按 CLI 四步先跑通，再嵌入固定 user_id 的重复性任务，1–2 周小范围试。
7. cognee：按 Python/CLI 快速上手路径先跑通，再通过插件或 MCP 接进现有 agent，1–2 周对照试用。
8. planning-with-files：选一个跨多会话的真实长任务，在支持 hook 的宿主上执行，做 A/B。
9. hivemind：先只在一个仓库、一个 agent 上安装，用 .hivemind 限定范围，看 SKILL.md 是否被复用。
10. 做法 L：挑 1 个最常用 repo，建共享文件夹，写一份 AGENTS.MD；先放一条可观察是否生效的独特规则；按各工具文档软链给 Claude Code 和 Codex；用同一个日常任务分别跑，先确认读到了，再观察正式规则。
11. 做法 M：挑一个项目，保存 CLAUDE.md 副本；运行 /claude-api prompt-audit，记录条目；把“逐步思考 / 自我检查”一类指令摘出，做 A/B。
12. 做法 N：挑一个常做的中等长度真实任务，按平常方式跑，中途运行 /context，记录三类占比作为基线；只改一项——先禁用当前会话没用到的 MCP 服务器；跑同类任务，再记录一次 /context；如果还想继续，再单独把压缩阈值调早（60%）。
13. 做法 O：在单个 Claude Code 会话里小范围试——clone 后以 --plugin-dir 加载、跑 /handoff 验证状态，先用 /handoff dry 观察成本，再在长任务上启用自动交接与 distill。
14. 做法 P：clone 后以 claude --plugin-dir ~/claude-auto-handoff 在一个不那么关键的长会话里启动；设 AUTO_HANDOFF_TOKENS=60000 降低阈值；正常干活直到面板出现；打开简报逐条核对；查日志有无失败与 facts-only 回退。
15. 做法 Q：在一个真实的、有 git 仓库的长任务会话里安装插件，先用默认配置 minutes=50。若不想等 50 分钟，可临时调小 minutes；注意默认值是为匹配一小时缓存设计的。做一段有明确目标和未完事项的工作，然后离开/停止交互，等待触发。检查 docs/handoffs/ 下是否生成文件并覆盖预期字段。开新会话只读 handoff。
16. 做法 R：挑一个 AGENTS.md 已经比较长的仓库，先提交到分支并备份，然后发送提示词，让智能体产出单一 PR；先不合并，只做前后对比。
17. 做法 S：挑一个近期会持续用 Codex 或 Claude Code 完成实际任务的项目，跑 wc -l AGENTS.md 和 wc -c AGENTS.md，记录当前行数与字节数；做一轮精简，压到 200 行以内；前后各跑若干个同类型真实任务；只改 AGENTS.md 这一个变量。
18. 做法 T：先解决第 1 步——能不能在你的 Claude Code 里真正找到并改到 autoCompactWindow。改不到，本条就退化为“知道有这回事”的 study 级线索，不要写进手册。改得到，就改前一周、改后一周各记录同样几项指标；若无法保证两周工作强度相近，就用同一组固定任务反复跑。

试多久：

- 调研没有给出统一固定时长。建议先做小范围试用，跑一个真实任务，对照工具侧节省与实际任务结果。
- 要验证会话连续性，至少覆盖一次会话压缩和一次跨会话继续；claude-mem 建议 1–2 天、3–5 次会话。
- blurt 只要“条目保留率高 + 端到端时间明显短于原方式”，就值得固定成输入惯例。
- headroom 在长会话、重工具输出的场景下试；短对话、散文类负载不用试。
- mem0 / cognee 先用 1–2 周小范围试。
- planning-with-files 至少覆盖一次 /clear 或 compaction。
- hivemind 先在一个仓库一个 agent 上试。
- 做法 L 只在一个 repo 上跑一到两周。
- 做法 M 建议 5–10 个真实任务做 A/B。
- 做法 N 一次只改一项，每项至少跑一个同类真实任务再下结论。
- 做法 O 至少覆盖一次自动交接触发，以及一次空闲 55 分钟后的刷新（或 away handoff）。
- 做法 P 先按 AUTO_HANDOFF_TOKENS=60000 在单个会话、单个项目上跑一次完整交接。
- 做法 Q 先在一个有 git 仓库的真实长任务里跑一次完整交接，再开新会话只读 handoff。
- 做法 R 文件更短、被移走的规则仍被遵守、人工审查认为可读性提升，才算有效；如果规则被移走后开始违反，说明“激进”过度。
- 做法 S 原文建议 1–2 周、单个项目。如果精简后规则违反次数和重复纠正次数明显下降，可以把“AGENTS.md ≤200 行”写进手册；如果没有变化，降级为“注意上限即可”。
- 做法 T 原文建议用 7 天回溯对比不同阈值开销。最小试用是一周默认值、一周 400k；如果无法保证两周工作强度相近，就用同一组固定任务反复跑。只有在额度明显下降且上下文返工没有明显上升时，才保留该设置。这个对比样本量很小，原文也没有给统计口径，结论只应作为是否继续投入的依据，不能当作定论。

## 常见坑

Context Mode：

- README 的 98% 节省、100x 说法、企业 logo 墙都是自述，缺少第三方验证。
- ELv2 许可对商用有限制。
- MCP-only 没有 hook、没有自动路由，模型可能不会主动用 ctx_* 工具。
- 不传 --continue 时，上一次会话数据会立即删除。
- Cursor 项目 .cursor/hooks.json 会覆盖 ~/.cursor/hooks.json。
- OpenCode / KiloCode 同时存在 plugin 与 mcp.context-mode 会注册 0 个 ctx_* 工具。
- GitHub Copilot CLI 的 hook 调用全局 context-mode，旧版本 fail open。
- 不要加激进的“简洁”提示词。
- OpenClaw / Pi Agent 原文在安装步骤处被截断。

Quicksilver：

- 准确率不是无条件变好。日志 triage F1 54%→23%、安全审查 shortlist F1 100%→89%。只能当 shortlist 用。
- 主观或团队风格类标签不适合外包。
- 内容是发到第三方 API 的；--fast 只在明显场景下有意义。
- 不要用它做写作、编辑、多步推理，以及任何 grep 能精确回答的问题。

claude-mem：

- ~10x token savings 等只是作者主张。
- 存在商业引导：安装后要求浏览器登录、托管记忆 CMEM Pro 免费 14 天。
- README 末节推广 CMEM 代币，与记忆功能无技术关联。
- Grok Bot 的 awareness 推送是 pilot。
- 环境门槛：Node 20+、Bun、uv、Windows PATH 问题；npm install -g claude-mem 只装 SDK。

headroom：

- 会接管全部 LLM 流量，不要无条件全量铺开。
- headroom wrap 每次都要用它启动会话才生效；输出压缩默认关闭。
- 匿名 beacon 默认开启；MCP 客户端不继承交互式 shell PATH。
- 短对话、散文、已经密集的载荷收益很小；沙箱里跑不了本地进程就用不了。

blurt：

- 仓库 40 stars、成熟度低。
- 录制端以 macOS 为主，Windows 只有 Tk + ffmpeg。
- 前提是能看到问题或用手机拍到。
- 质量依赖带视觉的强模型。
- 成本不完全看录制时长；首次运行要下载约 240 MB 模型。
- 浏览器捕获路线图项未完成。

mem0：

- 托管平台分数包含开源 SDK 不具备的专有优化。
- 所有数字均为厂商自报，没有第三方复现。
- 未涉及成本、隐私/合规、多租户隔离、记忆删除与纠错流程。
- ADD-only 抽取意味着记忆只累积不覆盖。
- 本文只拿到 README。

cognee：

- 单 Postgres 图存储是 demo，生产版是授权产品。
- 内置 GLiNER 抽取器是小模型流水线的 demo。
- 无 LLM 时 recall 返回源文本片段。
- Docker 用 --rm 会丢弃容器内数据。
- 不设 ENABLE_BACKEND_ACCESS_CONTROL=false 时 API 默认多租户。
- BEAM 两个分数用了不同会话、不同摄取模型、不同检索选型流程。

planning-with-files：

- 效果数字全部来自项目自述。
- 完成门槛依赖英文状态标记。
- 自动恢复只读项目文件，不读 agent transcript。
- 计划文件默认 gitignore、不自动归档。
- 需要宿主支持 hook/插件或 Agent Skills。

hivemind：

- 默认把全部会话 prompt 与工具输出写进团队共享 workspace。
- Node >= 22.0.0；npm 全局前缀要可写。
- Codex 首次启动必须选 2. Trust all and continue。
- 语义检索默认关闭，因为本地嵌入约 600 MB。
- 原文在 rules 一节的命令块未结束。
- 基准数据是作者自测。

做法 L：

- 来源是二手转述，不是作者原帖。
- 原文在“Every repo”处被截断。
- 软链路径写错时，agent 会静默地读不到规则，不会报错。必须先用一条一眼可验的规则确认“读到了没有”。
- 整条推文没有任何“这样做之后结果变好了”的数据或案例。
- 需要系统支持符号链接；Windows 需另想办法。
- 原文没有说明这套设置与 OpenClaw 本身是什么关系。

做法 M：

- 来源是单条推文转述，原文在关键处截断。
- “旧习惯拖累新模型”没有任何对照实验。
- 不要预设它会自动改写文件；先备份、只记录、再小范围 A/B。
- 如果命令运行失败或不存在，只保留“定期审查”原则。

做法 N：

- 来源是单条推文，传播量低。
- 原文全文没有一个数字、截图或对比实验。
- /mcp 之后怎么做被截断；60% 对应哪个设置项也没写清。
- 怎么精简 CLAUDE.md 原文完全没给。
- 更早压缩意味着更频繁丢失上下文细节，可能换来更多重述和返工。
- 一次只改一项。

做法 O：

- 作者自标 experimental，基于 early-access function-hooks API。
- 只作用于主会话，子代理回合被忽略。
- 5 分钟缓存用户不关刷新会反复重写整个上下文。
- 交接只暂扣文本，图片/附件必须重新粘贴。
- 阈值 600k 的合理性依据是间接引用。
- distill 写出的 rule 需要出现 2 次及以上才注入新会话。
- 失败路径可恢复，但都要你去看 /handoff 才知道。
- 与做法 P、Q：同一条会话先只加一个。

做法 P：

- 需要带 mods 的 Claude Code 构建。
- 仓库 39 stars、版本 0.8.x，自测为主。
- 未计量工具输出是可能偏高的估计，交接可能比预期更早或更晚触发。
- viewer 默认只在 Tailscale 网内可达。
- 与把会话管道化的 wrapper 不兼容。
- 简报有效性判定很宽松。
- 不要改仓库里的模板；改 ~/.claude/auto-handoff/ 下的副本。
- 不要往 brief.md 加 files 和 commits 段；不要删掉 ## Last Request from the User 及其 Status 行。
- Haiku 失败时用 facts-only 简报兜底。
- 连续交接有守卫，默认 maxConsecutiveHandoffs=2。
- 0.8.3 起简报必须写真实数字；0.8.4 起不在 Handoff Numbers 里的 token 数字会被标 [unverified: not in Handoff Numbers]。

做法 Q：

- 仓库 35 stars、MIT，作者自测为主。
- 默认 50 分钟依赖一小时缓存；若会话降级到五分钟缓存，需要把 minutes 调小得多。
- 交接本身也是一个 turn，其中每个模型请求都付出一次对整段对话的缓存读，并让缓存再热一小时。
- 计时器活在 Claude Code 进程里，退出即停止。
- 若模型调用了未预批准的工具，该 turn 会停在权限提示上直到你回来。
- 基于 early access 的 function hooks 插件 API，可能在版本间变化。
- 默认交接 skill 依赖 date 和 git status。
- 默认只写 docs/handoffs/<timestamp>-<slug>.md，不做任何提交。
- 原文没有给出任何量化指标或对照实验。
- 与做法 O、P：同一条会话先只加一个。

做法 R：

- 来源是单条推文，只有提示词正文。
- /writing-for-agents 是什么、怎么安装，原文没有交代。
- 原文没有给出重组前后的 AGENTS.md 对比。
- “移除空操作”“使用渐进式披露”“将指令移至 CODING_STANDARDS.md”三条没有判断标准。
- 只有“创建一个单一的 PR”这一道人工审查关口。
- 三个子代理是并行还是串行、什么叫“更激进”，原文都没有说明。
- 规则被移走后智能体可能开始违反；文件变短不等于变好。

做法 S：

- 原文只给了两个阈值和一句主张，且在关键处被截断。
- “文件越长，Claude 就越不容易遵循”是作者主张，没有实验数据。
- 两个阈值来源不同：200 行是建议值，32 KiB 是 Codex 默认读取上限、超出被跳过。
- “200 行比 32 KiB 更紧”是本手册的推算。
- 中文内容按字节算更容易先撞 32 KiB 线，wc -l 看不到。
- 精简方法原文没给，不要替作者补写删减规则。
- 每次改完都要重跑 wc -l / wc -c。
- 适用条件：使用 Codex 或 Claude Code，且依赖 AGENTS.md 类配置文件。

做法 T：

- 原文只给参数名 autoCompactWindow 和目标值 400k，没有给写入方式、配置文件字段、环境变量名或启动参数。找不到这个参数时，本条应降级为 study 级线索。
- 原文称默认 1M 触发压缩“几乎没有节省”，调到 400k 后 7 天回溯实测每周省约 29% 额度，但没有给样本量、模型版本、每天会话数、任务类型、额度计算口径和图表原始数据。数字很可能来自原文配图，而本次采集到的是推文正文文本，判断依据有限。
- “不会出现严重的记忆退化”是定性判断，原文没给评估标准。
- 降低阈值意味着更早就压缩，理论上更容易丢上下文细节；省额度和保上下文之间存在此消彼长，必须自己测。
- 不要和做法 N 的 60% 同时改，材料没有说明它们是不是同一个设置。
- 短会话或额度充裕的用户可能几乎无感。

## 证据与来源

本手册合并了十八份材料：mksglu/context-mode、UditAkhourii/quicksilver、AGIHunt/blurt、thedotmack/claude-mem、headroomlabs-ai/headroom、mem0ai/mem0、topoteretes/cognee、OthmanAdi/planning-with-files、activeloopai/hivemind、cablate/ctx-handoff-mod、alexknowshtml/claude-auto-handoff、obie/auto-handoff，一条转述 Peter Steinberger（OpenClaw 作者）开源其个人 agent 配置的推文（@oliviscusAI）、一条关于 CLAUDE.md / prompt-audit 的推文（@RoundtableSpace）、一条关于“CLAUDE.md 正在吞噬你的令牌限制”的推文（@thegreatest_sv）、一条关于用提示词重组 AGENTS.md 的推文（@mattpocockuk）、一条关于 AGENTS.md 长度上限的推文（@Voxyz_ai），以及一条关于 Claude Code 自动压缩阈值 autoCompactWindow 的推文（@xiax0603）。

Context Mode：README 称 315 KB 变 5.4 KB、减少 98%；“用代码思考”示例里的 47 × Read() = 700 KB 变 1 × ctx_execute() = 3.6 KB 是 README 说法，未经验证。安装命令、hook 配置、平台差异来自 README；小范围试用结论来自调研报告。

Quicksilver：有 12 任务基准，部分任务准确率下降：日志 triage F1 54%→23%、Claude token −85%；安全审查 shortlist 100%→89%、−74%。在线回执格式来自 README。中位省 82% token 来自调研报告。自动调用可靠性、--fast 快 10 倍、安全排除规则覆盖面只是作者主张。

claude-mem：事实性内容来自 README；~10x token savings 等只是作者主张；托管记忆、14 天试用、代币推广来自调研报告。

headroom：安装与命令来自 README；基准全部自报；HEADROOM_OUTPUT_HOLDOUT 与 measured 的对应来自 README。

blurt：两段真实会话测量来自 README；仓库 40 stars、macOS 为主来自调研报告；“原来两天、现在 30 分钟”等只是作者主张。

mem0：厂商自报 LoCoMo 71.4→92.5、LongMemEval 67.8→94.4、BEAM 等；关键局限是分数反映托管平台，包含开源 SDK 不具备的专有优化。ADD-only 只累积不覆盖，原文未说明清理错误记忆。

cognee：事实性内容来自 README；BEAM 100K 0.79、BEAM 10M 0.67 是自报，且两个设置用了不同会话、不同摄取模型、不同检索选型流程。

planning-with-files：自测数据来自项目自述：基准 96.7% 断言通过（29/30）、3/3 盲测 A/B 获胜、磁盘计划把重新定位从 13.3 回合降到 5.0 回合、hook 单次触发优化后 289ms。需要自己复现。

hivemind：事实性内容来自 README；基准数据是作者自测；原文在 rules 一节的命令块未结束。

共享 AGENTS.MD（做法 L）：有依据的只有机制本身；原文在“Every repo”处截断；路径与规则内容都没有。判定指标和试用范围是本手册补的。

CLAUDE.md / prompt-audit（做法 M）：事实性内容来自推文；旧习惯拖累新模型没有对照实验；命令是否存在、输出形式、是否自动改写均未确认；A/B 指标是本手册补的。

上下文预算审计（做法 N）：事实性内容来自推文；原文没有一个数字、截图或对比实验；/mcp 之后怎么做缺失；怎么精简 CLAUDE.md 完全没给；观察指标与“一次只改一项”顺序是本手册补的。

ctx-handoff（做法 O）：事实性内容来自 README；实测数据包括 102k 对话 fork 中 102,003 token 从缓存读取、distill 在 476k 约 95 秒、800k 约 3 分钟、800k 时交接本身约 28 秒；阈值 600k 的合理性依据是间接引用；空闲缓存刷新等关键行为尚未实测。

claude-auto-handoff（做法 P）：事实性内容来自 README；一次阈值设 80k 的实际运行，mod 在阈值处拒绝一次读取、写简报、清空，新会话约 7 秒后回到工作、处于 31k；面板文案示例 ✓ handed off · 162k → 45k；0.8.3 起简报必须写入真实数字，0.8.4 起不在 Handoff Numbers 里的 token 数字被标 [unverified: not in Handoff Numbers]。为何不用 auto-compact 是设计论断。

obie/auto-handoff（做法 Q）：事实性内容来自 README；没有量化数据或对照实验；“缓存过期后重读又慢又贵”、50 分钟默认值合理性、交接收益都只是作者主张；默认 50 分钟依赖一小时缓存，五分钟缓存需调小 minutes；插件无法判断会话用的是哪种缓存。

用一条提示词重组 AGENTS.md（做法 R）：有依据的只有提示词模板本身；/writing-for-agents 是什么、怎么安装原文没有交代；三个子代理是并行还是串行、什么叫“更激进”原文未定义；只有互动量 1835 赞、102 转发、92 回复，不是效果证据。

AGENTS.md 长度预算（做法 S）：有依据的是两个阈值和一句机制：Claude Code 文档建议 200 行以内；Codex 默认最多读取 32 KiB、超出被跳过；两者都会在会话启动时读取 AGENTS.md。原文在此处被截断。文件越长越不容易遵循是作者主张，没有实验数据。测量方式、复查动作、四项判定指标、1–2 周单项目试用是本手册补的。

自动压缩阈值 autoCompactWindow（做法 T，来自 @xiax0603 推文）：有依据的是参数名 autoCompactWindow、目标值 400k、默认 1M 触发压缩、7 天回溯实测每周省约 29% 额度、以及“不会出现严重的记忆退化”这一说法。原文没有给出写入方式、配置文件字段、环境变量名或启动参数，也没有给样本量、模型版本、每天会话数、任务类型、额度计算口径和图表原始数据。本手册补的一周对照记录、任务侧代价指标、与做法 N 的分工，都是基于原文推导出的验证方式，不是原文给出的内容。

## 依据的调研

- [mksglu/context-mode](../research/radar/2026-10-01/68-mksglu-context-mode.md)：值得一试，建议先在 Claude Code（或 Cursor）上做小范围试用：用 MCP-only 方式跑一个真实编码任务，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广到团队。理由是它直指“工具输出塞满上下文 + 会话压缩后失忆”这两个具体痛点，安装与回退成本低；但 README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证，且 ELv2 许可对商用有限制。
- [UditAkhourii/quicksilver](../research/radar/2026-10-01/15-uditakhourii-quicksilver.md)：值得一试，建议小范围试：按 README 给出的命令把 Quicksilver 装进 Claude Code，让它把「读很多、只判断一点」的批量筛选/分类交给 Jev，Claude 只处理被标 `?` 的边界项；理由是安装与使用步骤可直接照做、12 项可复现基准显示中位省 82% token，但部分任务准确率明显下降且依赖第三方 API，需自己用少量标注核对后才敢扩大使用。
- [AGIHunt/blurt](../research/radar/2026-10-01/26-agihunt-blurt.md)：值得一试，把「录屏+口述」当作给编码 agent 补上下文和反馈的固定通道来试：按 README 装好 skill，在一个真实项目里录一段 5–10 分钟走查，让 agent 拆条目、挑关键帧、写复现步骤，再用评审页逐条取舍。理由是这套流程有可照做的安装命令、快捷键、模型选择和实测成本，属于可落地的做法；但仓库仅 40 stars、以 macOS 为主、除 README 自述外没有可核实的评测，故先小范围验证而非直接采纳。
- [thedotmack/claude-mem](../research/radar/2026-10-01/522-thedotmack-claude-mem.md)：值得一试，可以在 Claude Code 上小范围试用：用 `npx claude-mem install` 装好后重启，让它在真实项目里自动捕获并注入跨会话记忆，再用检索命中率和重复交代背景的次数判断是否值得长期留下；理由是 README 给出了可直接照做的安装、配置和检索步骤，但效果数据（如 ~10x token 节省）只有作者主张，且夹带托管记忆与代币推广，需自行验证。
- [headroomlabs-ai/headroom](../research/radar/2026-10-01/528-headroomlabs-ai-headroom.md)：值得一试，建议在长会话、重工具输出的编码 agent 上小范围试用：装好后用 `headroom wrap <agent>` 包一层，先用 `headroom doctor` / `headroom savings` 读自己流量上的省量，并开 `HEADROOM_OUTPUT_HOLDOUT=0.1` 拿实测的输出节省，再决定是否长期保留。理由是原文给出了可直接照抄的安装、接入、量测、复现基准和回滚（`headroom unwrap`）步骤，但它是一个会接管你全部 LLM 流量的本地代理，收益随数据重复度剧烈变化、基准全部自报，不适合无条件全量铺开。
- [mem0ai/mem0](../research/radar/2026-10-01/547-mem0ai-mem0.md)：值得一试，按 README 的 CLI 四步（安装→agent 注册→add→search）先跑通通路，再把 search+add 嵌进一个固定 user_id 的重复性任务做 1–2 周小范围试；理由是原文给出了可直接复制的安装、CLI、SDK、自托管与 Agent Skills 接入步骤，但性能数字是托管平台自报、开源版明确无法复现同等数字，还不足以作为手册标准做法直接采用。
- [topoteretes/cognee](../research/radar/2026-10-01/570-topoteretes-cognee.md)：值得一试，可以小范围试：按 README 的 Python/CLI 快速上手路径先跑通「跨会话长期记忆」，再通过 Claude Code 插件或 MCP 接进现有 agent 做 1–2 周对照试用，判断能否减少重复交代上下文。理由：原文给出了可直接复制的安装、代码与插件命令，属于可照做的具体流程；但其效果数据为自报基准，且单 Postgres 图存储与本地 GLiNER 抽取器均明确标注为 demo，尚不足以直接写入手册作为推荐配置。
- [OthmanAdi/planning-with-files](../research/radar/2026-10-01/571-othmanadi-planning-with-files.md)：值得一试，先用一条安装命令把 planning-with-files 装进 Claude Code 或 Codex 这类支持 hook 的宿主，在同一个长时编码任务上做 A/B：让智能体把 phases 写进 task_plan.md 并靠 hook 每轮重注入，观察 /clear 或 compaction 后的重新定位轮数是否下降。理由是原文给出了可照做的安装命令、三文件模式与 hook 生命周期，但这些效果数字全部来自项目自测，需要自己复现验证。
- [activeloopai/hivemind](../research/radar/2026-10-01/604-activeloopai-hivemind.md)：值得一试，建议先在一个仓库、一个 agent（如 Claude Code）上小范围试：按 README 的安装命令接入、用 `.hivemind` 限定捕获范围、再看 skillify 是否真的产出被复用的 SKILL.md；它给出了可直接照做的安装/配置/触发步骤，但基准数据是作者自测，且默认把全部会话 prompt 与工具输出写进团队共享 workspace。
- [@oliviscusAI: Peter Steinberger, the creator of OpenClaw, open-sourced his entire agent setup.](../research/radar/2026-10-02/708-peter-steinberger-the-creator-of-openclaw-open-sou.md)：值得一试，值得小范围试：在一台同时使用 Claude Code 和 Codex 的机器上，把 agent 规则集中成一份 AGENTS.MD，软链给两个工具共读，先验证同一条规则能否被两边自动遵守；给 try 而非 adopt，是因为原文只是第三方转述、且在“Every repo”处截断，仓库链接、具体路径和规则内容都没有，需自行按各工具文档补全。
- [@RoundtableSpace: 你的 CLAUDE.md 实际上可能会让 Opus 5.5 变得更糟。](../research/radar/2026-10-04/1053-claude-md-opus-5-5.md)：值得一试，先在 Claude Code 里对现有 CLAUDE.md 与 skills 跑一遍 `/claude-api prompt-audit`，再逐条评估“逐步思考”“仔细检查你的工作”这类旧指令是否该删；因为推文主张这类旧习惯在新模型上反而增加拖累，且给出了一个可直接执行的审查命令，但原文被截断、命令行为与判读方式均未说明，只能小范围试。
- [@thegreatest_sv: 你的 CLAUDE.md 正在他妈的吞噬你的令牌限制。](../research/radar/2026-10-04/1081-claude-md.md)：值得一试，先在 Claude Code 会话里运行 /context 摸清 token 去向，然后一次只改一项——把自动压缩阈值从 95% 降到 60%、关掉从不调用的 MCP 服务器——再跑 /context 对比前后。原文只给了三个方向性命令、末尾还被截断，且没有任何数据支撑，所以适合小范围试而不是直接写进手册。
- [cablate/ctx-handoff-mod](../research/radar/2026-10-04/1185-cablate-ctx-handoff-mod.md)：值得一试，可以直接照 README 的 Quick start 在单个 Claude Code 会话里小范围试：clone 后以 --plugin-dir 加载、跑 /handoff 验证状态，先用 /handoff dry 观察交接成本，再在长任务上启用自动交接与 distill。理由是原文给出了可复制的安装/配置/命令与明确的触发条件，但作者自己标注为 experimental、依赖早期 function-hooks API，且空闲缓存刷新等关键行为尚未实测，所以只建议试不建议直接采用。
- [alexknowshtml/claude-auto-handoff](../research/radar/2026-10-05/1225-alexknowshtml-claude-auto-handoff.md)：值得一试，建议小范围试：先按 README 的安装步骤在支持 mods 的 Claude Code 构建上装好，用 AUTO_HANDOFF_TOKENS=60000 在一个长会话里跑一次交接，检查生成的简报是否准确、新会话能否续接；理由是它给出了完整可照做的安装、配置与模板改法，但依赖尚未普及的 mods 构建、版本仅 0.8.x 且只有作者自测数据，不足以直接 adopt。
- [obie/auto-handoff](../research/radar/2026-10-05/1315-obie-auto-handoff.md)：值得一试，可以在 Claude Code 长会话里小范围试装 auto-handoff，用默认 50 分钟空闲触发 `/auto-handoff:handoff` 把工作状态落成 `docs/handoffs/` 下的交接文件，让新会话能续接；它装法、配置、行为边界都写得很具体，但依赖早期访问的 hooks API、只有作者主张的成本收益，且无法识别会话用的是哪种缓存，所以先试不直接采用。
- [@mattpocockuk: 今天的提示：](../research/radar/2026-10-07/1734-item.md)：值得一试，可以直接把这条提示词抄进支持子代理的编程智能体，用自己的 AGENTS.md 跑一次重组，并用单个 PR 做人工取舍；它给出了可复制的提示文本和多子代理、单 PR 的具体流程，但原文没有任何效果证据，只能小范围试。
- [@Voxyz_ai: 强烈推荐精简你的 AGENTS.md。Claude Code 的文档建议每个文件保持在 𝟮𝟬𝟬 行以内，因为它越长，Claude 就越不容易遵循。Codex 默认最多读取 𝟯𝟮 𝗞𝗶𝗕](../research/radar/2026-10-08/2016-agents-md-claude-code-claude-codex.md)：值得一试，建议小范围试：把项目的 AGENTS.md 压到 200 行以内（Codex 侧不超过 32 KiB），因为它直接决定代理在会话启动时读到的规则量，过长会降低遵循度；原文在此处被截断、且未给验证数据，先在一个项目上做前后对比再决定是否写进手册。
- [@xiax0603: 🚨实测｜Claude Code调400k自动压缩，直接省下29%每周额度](../research/radar/2026-10-12/2647-claude-code-400k-29.md)：值得一试，可以小范围试：先自行核对 `autoCompactWindow` 在所用 Claude Code 版本里的确切配置位置，再把自动压缩阈值从默认 1M 降到 400k，用一周对照记录额度消耗与上下文返工情况；理由是原文给出了参数名、目标值和「省约 29% 每周额度」的实测结论，但没有给写入方式、样本口径和验证方法，只能当作一个待自证的调优项而不是可直接照抄的配置。
