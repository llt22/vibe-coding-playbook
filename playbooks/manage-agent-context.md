# 让编码代理在长任务里省上下文、守规则、不返工

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码代理在长任务里被工具输出和重复读取塞满上下文、丢失状态、违反团队规则、反复犯同样的错，而规则文件本身也在膨胀、过时、各工具各写一套。
> 先试这一步：先在一个真实项目上运行 /context 量出 token 去向作为基线，然后只选一个痛点做法（例如把“不重复读文件、五步以上先落计划”写进 AGENTS.md）小范围试 2–3 次同类任务。
> 最近修订：2026-11-13

## 解决什么问题

编码代理在长任务里会读大量工具输出、反复加载规则、重复读同一个文件、调用后台摘要，上下文窗口被塞满，压缩时状态丢失，配额被看不见的开销吃掉。规则文件本身也会浪费：CLAUDE.md / AGENTS.md 过长、过时、堆资料；同一纠正反复说却不沉淀；规则不分目录；注释复述代码；知识和能力堆在一起；新仓库没有这份文件，或每换一个工具就重写一套。另一类问题是改动范围失控：代理为几乎不会发生的竞态、边界问题臆测性加防御，或修改任务范围外的文件；还有一类更隐蔽：指令文件写了一种风格，仓库代码实际是另一种风格，代理擅自按指令改写代码。第三类是规则文件需要体检：CLAUDE.md、AGENTS.md、.claude 与 ~/.claude 里的规则、技能和命令可能重复、冲突、过时，且“必须永远遵守”的硬规则常常只写在散文里。第四类问题出现在多客户/多项目场景：会话记录混在一起、项目规则互相污染、新会话不知道上次决策、每个项目都要重新解释背景。第五类是前端代码现代化：代理训练数据里充满 2019 年前后的写法，容易写 polyfill、旧库和过时 API。第六类是每轮重发的静态上下文成本。第七类是仓库没有被组织成代理能导航的工作现场：所有信息塞在提示或一个大文件里，重复流程没有变成 skills，必须自动执行的动作没有变成 hooks，架构和决策文档没有可导航的位置，高风险模块没有局部规则。第八类是团队里同一句纠正反复出现，但规则只存在于个人本地，无法在成员之间同步和表决；第九类是想用一个本地层同时完成按符号读代码、压缩工具输出、执行前拦截风险和保持提示缓存。

本手册把做法 A–AR 合在一起：把工具输出挡在上下文外、把略读判断外包、用持久记忆保状态、把计划写磁盘、把 trace 固化成技能、用录屏口述、共享 AGENTS.md、审查旧指令、审计上下文预算、自动交接、重组和限长 AGENTS.md、调压缩阈值、验证子代理缓存、专用文件夹、增量规则、回看历史会话、目录分层、nomore 规则包、注释准入、关闭后台摘要、skills/docs 条件路由、用 Claude Code 读笔记库生成 CLAUDE.md 初稿、把“不重复读文件”“五步以上先落计划”写进 AGENTS.md、用 devilop 的产品地图和界面草稿供上下文、用 /init 从零生成 AGENTS.md、用一条规则约束防御性代码和改动范围、用 /doctor prompt-audit 给规则文件做体检、用“先 grep 再局部读取”减少整文件读取、用“冲突裁决规则”和“指令文件巡检提示词”处理指令与代码不一致和规则过时、用 modern-web-guidance 把现代 Web 指南和现代化流程注入前端编码代理、用 pxpipe 把每轮重发的静态前缀换成图片计价、用五层结构把仓库整理成 Claude Code 能导航的工作现场、用 PeerHarness 把反复纠正固化成团队投票规则、用 TokenSafe 做本地上下文控制层。核心是任务侧指标验证，不只看节省比例。

## 适用与不适用

**适用（按痛点分组）**
- 上下文膨胀、长任务丢状态：A/B/C（工具输出拦截）、D（略读型批量判断）、E/H/I（跨会话记忆）、F（本地压缩所有 LLM 流量）、J（磁盘计划）、O/P/Q（自动交接）、AE（不重复读、计划落盘）、AJ（先 grep 再局部读取）、AO（静态前缀大、会话轮数多、愿意做同任务账单对照）、AR（想用一个本地 MCP 层同时按符号读代码、净化输出、执行前拦截）。
- 规则文件维护：L（多工具共享一份）、M（审旧提示习惯）、N（上下文预算审计）、R（重组结构）、S（长度预算）、T（压缩阈值）、U（子代理缓存）、V（专用文件夹）、W（增量配置）、X（回看历史会话）、Y（目录分层）、Z（nomore 规则包）、AG（/init 建初稿）、AH（防御性代码与改动范围）、AI（/doctor prompt-audit 体检）、AL（冲突裁决）、AM（指令文件巡检）、AQ（团队多成员、多条跨仓库个人偏好规则要统一，且希望逐人 opt-out）。
- 产品与界面上下文：G（录屏口述）、AF（产品地图 + 界面草稿 + 检查状态）。
- 注释与后台开销：AA（注释准入）、AB（关闭 agent_summary）、AC（skills/docs 条件路由）、AD（读笔记库生成 CLAUDE.md 初稿）。
- 多客户/多项目：AK（独立目录 + AGENTS.md 入口 + rules/docs + 读-做-写决策记录）。
- 前端代码现代化：AN（用 modern-web-guidance 做现代 Web 指南检索、旧模式扫描、现代化命令和轻量降级方案）。
- 每轮重发静态前缀成本高：AO（用 pxpipe 把静态块换成图片计价，先小范围试）。
- 仓库结构混乱、重复流程和自动动作靠提示维持：AP（根 CLAUDE.md + .claude/skills + .claude/hooks + docs + 模块级 CLAUDE.md 五层结构）。
- 团队规则分发：AQ。适合跟人走、跨仓库的偏好型规则（工具链选择、提交信息风格），尤其没有共享仓库或没人管仓库的团队；不适合规则只针对某一个仓库、团队本来就走 PR 评审的场景，那种直接提交 CLAUDE.md 即可。
- 本地上下文控制层：AR。适合已在用 Claude Code、Cursor、Codex 等支持列表内 agent，想按符号读代码、压缩测试日志、拦截硬编码密钥和危险删除、并保持提示缓存前缀稳定的场景。

**不适用（关键边界）**
- 对商用许可敏感：Context Mode 是 ELv2；cognee 单 Postgres 图存储和本地 GLiNER 抽取器是 demo，生产版是授权产品；TokenSafe 团队缓存、托管蒸馏、按席位 ROI 需 TS2 license，开源核心 MIT。不能把内容发给第三方：Quicksilver、mem0 默认依赖 LLM/embedding 供应商、cognee 配 LLM 后会发起 provider 调用、hivemind 默认把会话写进团队共享 workspace；nomore 与 devilop 的本地性部分只是作者声称。
- 希望直接拿到第三方验证过的 98% 节省、100x 提升、约 10x token 节省、TokenSafe 的 92.5%：这些是各自 README、项目自述或推文口号。
- 任务很小、工具输出很少：装 hook / 代理 / 持久记忆 / mod / devilop / pxpipe / 五层结构的开销可能不划算；不想改配置、不想重启客户端、沙箱里跑不了本地进程时不适用。
- 纯后端、无界面、又拍不到：blurt 前提不成立，devilop 的界面草稿收益有限。只用单一 provider 或单一 agent：headroom 跨 provider 收益、做法 L 的多工具共读收益不成立；系统不支持符号链接：做法 L 不适用。
- 不是 Claude Code：/claude-api prompt-audit、/context、/compact、/mcp、/handoff、/doctor prompt-audit 都是 Claude Code 内命令；做法 Q 也是 Claude Code 插件；做法 T、U 依赖 Claude Code 的设置或缓存行为；做法 Z 写 CLAUDE.md 并读 Claude Code 会话历史；做法 AO 目前只在 Claude Code 例子上给出启动命令；做法 AP 也是 Claude Code 的仓库结构做法。
- 对“旧指令拖累新模型”要求现成实验证据：目前只有推文作者主张。CLAUDE.md 很短、也不接 MCP：做法 N 几乎没有可操作空间。
- 用 5 分钟 prompt cache：ctx-handoff 的空闲刷新会失效，需要手动 /handoff refresh off；做法 Q 也可能错过热缓存窗口。Claude Code build 不带 function hooks：做法 O、P 都不适用。
- 要稳定、久经考验的方案：做法 O、P、Q、AF、AI、AL、AM、AO、AQ、AR 的关键行为都尚未被第三方实测；AF 当前版本 0.26.1、40 stars；AI 的命令与 v2.1.283 版本号材料内无法确认；AL 规则正文被截断；AM 流程不完整；AO 只有一条启动命令和一次会话账单；AQ 是 v0.4.0、31 stars、作者自述 early and not audited；AR 是 30 stars、效果数据来自作者自报模拟基准。
- 希望交接能带上图片/附件：做法 O、P、Q 都只写文本。把会话用 wrapper 管道化：claude-auto-handoff 与这种管道不兼容。希望由 mod 自己判断简报写得好不好：判定很宽松。已经用做法 O 或 P 管同一个会话：同一条会话先只加一个。
- 工作目录不是 git 仓库，或不允许插件运行 git status；无法为自定义交接命令预批准工具、不能把会话放在允许写入的权限模式下：做法 Q 不适合。项目很小，或根本没有 AGENTS.md：做法 R、S、X、AE、AJ 没有可操作对象；做法 X 还需要已有 AGENTS.md 和足够历史会话。
- 找不到 /writing-for-agents 时，直接把提示词原文粘贴给智能体；要求做法 R 有现成效果证据：原文只给了互动量。
- 不使用 Codex 或 Claude Code，或项目不依赖 AGENTS.md 类配置文件：做法 S 的长度预算不适用；希望 S 给出“精简 AGENTS.md 的具体方法”或“越长越难遵循”的实验数据，原文也没有。
- 希望做法 T 给出确切的写入方式、配置文件字段、环境变量名或启动参数：原文只给了参数名 autoCompactWindow 和目标值 400k；核对不到就不要照做。打算同时改做法 N 的 60% 和做法 T 的 400k：材料没有说明两者是不是同一个设置，同一条会话先只改一项。
- 子代理调用是连续、高频的：做法 U 的收益只来自跨过 5 分钟闲置的场景。需要 subagentPromptCacheTtl 的取值、配置位置和官方文档出处：原文在设置名之后就被截断，核对不到就不要照做。
- 做法 V：原文只完整给出第 1、2 步，没有命令、配置样例、CLAUDE.md 内容示例和权限边界的实现方式；工作必须跨多个目录或多个仓库、收不进一个文件夹，或者指望做法 V 替代权限配置，不适合。只做一次性任务，或者用的不是 Claude Code：做法 W 的增量配置规则不适用。
- 用的不是 Codex 或同类可回看历史会话的工具，或者没有足够历史会话：做法 X 找不到可归因的样本。用的 AI 工具根本不读取目录级 CLAUDE.md，或者无法从目标目录发起任务：做法 Y 不会生效；目录职责不稳定、任务经常跨多个目录，或希望局部规则自动充当权限隔离时，Y 不适合单独承担。
- 做法 Z：无法读到本机 Claude Code 会话记录；没有可重复历史的新用户；主要用中文会话且要求中文召回可靠（原文只说过滤器针对英语、韩语、印尼语调优）；不能接受 preview 质量（作者自陈约三分之一建议才是真规则）；不愿逐条裁剪规则包；CLAUDE.md 已经很长；需要自动触发或自动维护；要求现成的纠正次数下降数据；规则包内容与技术栈冲突且不愿删；不能接受重新下载规则包会覆盖自定义版本。
- 做法 AA：项目是一次性脚本、教学代码或对外 API 文档，注释主要给人类读；要求这条规则有现成实验数据；不能接受原文在 If the answer isn't 处截断、删除动作是按语义补全而不是原话。
- 做法 AB：macOS 和 Windows 未测，Windows 上 /$bunfs/ 门控很可能不会安装 hook；不能接受非官方 Bun preload、修改客户端运行时行为或可能违反服务条款；不能设置环境变量、不能重启 Claude Code daemon，或不能让 BUN_OPTIONS 继承到 claude -p、cron、CI 和编辑器集成；没有 OpenTelemetry 且需要强验证；要在关键项目上直接全量采用；期望有官方设置或稳定接口直接关闭 agent_summary；不能接受升级后静默失效。
- 做法 AC：文档路径不稳定、触发条件无法枚举，或者任务很少重复、没有稳定流程；希望原文给出 OKF 格式、目录结构或 AGENTS.md 样例；不能接受先盘点、再迁移、再验证的维护成本；要求这条做法有前后对比数据。做法 AD：笔记库包含敏感内容且不能整库交给 agent 读取；希望原文给出第 4 步或完整验证数据（原文在 add one line: 处截断）。
- 做法 AE：工具不读取或不遵循仓库根目录的 AGENTS.md；任务多为一步到位的短改动；代理没有写文件权限（第二条规则无法执行）；要求这两条规则有现成数据或前后对比。做法 AF：不做带界面的产品开发，或项目没有稳定的产品结构可画；不愿安装 Node.js 22+ 并在本地跑服务；用的客户端不支持所需投递通道，且不愿接受只读 batches 协作；要求投递路径已被第三方验证；在 Claude Code 里无法获得会话级 channel 同意或组织策略不允许；希望 Cursor 空闲聊天被外部唤醒；把 devilop 当成通用聊天或第二个 agent。
- 做法 AG：项目规范频繁变化或项目极小，/init 生成的规则很快过时、收益有限；不能或不愿把 AGENTS.md 提交进版本控制；指望这份材料告诉你 Codex 其余 11 个玩法；要求 /init 在不同工具下行为一致的确证；要求“效率直接翻倍”式的效果数据。
- 做法 AH：项目对竞态、安全、边界极其敏感，不能简单禁止防护；不愿在代理提出额外防护时人工确认；用的工具不读取或不遵循 AGENTS.md；要求这条规则有现成效果数据或前后对比。
- 做法 AI：不用 Claude Code；项目里没有任何规则文件（审计对象为空）；要求 v2.1.283 或 /doctor prompt-audit 已被官方文档或第三方实测确认；希望拿到审计输出的解读和逐条修正方法（原文第 4 步截断）；不能接受先跑一次确认命令是否存在。
- 做法 AJ：任务需要通读全文（整体重构、文档校对），先 grep 再局部读取可能反而漏信息；仓库主要是 PDF、图片、二进制等非文本内容；要求这条规则有现成 token 对比数据；用的工具不读取或不遵循 AGENTS.md。
- 做法 AK：只做一个项目、没有跨客户/跨项目切换需求；不愿为每个项目建独立目录或独立用户；无法让代理读写项目目录；要求这套工作流有对照实验数据；团队已经用统一的知识库和交接流程解决了上下文串味问题。
- 做法 AL：某些仓库的指令文件恰恰是用来纠正代码坏味道的（例如“新代码一律用类型标注”），此时“跟随代码”会产生反效果；不能接受用户级配置对所有仓库生效；需要规则有现成实验数据。
- 做法 AM：没有 agent 指令文件；没有人愿意逐条审核；无法把 agent 设为只读或要求修改前批准；需要原文给出完整扫描范围、输出格式和修改流程（原文在 .claude/rules, 处截断）。
- 做法 AN：任务不是 Web 前端，或只是后端、数据处理、文档写作；本机没有 Node.js / npx；无法联网安装或运行 CLI；需要离线/私有环境可用性已被验证；要求这份材料证明支持哪些编码智能体、Node 版本要求、指南更新频率或 legacy-scan 的误报率；要求现成的量化效果对比；项目目标浏览器矩阵很旧，现代 API 不能直接使用且团队不愿做降级；原文特性列表在 Password credentials 处截断；把厂商或客户自报指标当独立验证结果。
- 做法 AO：短会话、一次性问答、静态前缀很短；无法在客户端与模型之间插入本地进程；不能本地把文本渲染成清晰图片；不能接受多一层代理或额外延迟；需要确认提示词缓存是否仍生效、图片是否每轮重传、不同模型图片 token 计价与上限、图片清晰度对工具 schema 识别的影响；要求第三方复现或稳定安装说明；原文只有一条推文、一条启动命令和一次会话账单，仓库链接断行、模型名无法核实，打开仓库发现与实际描述不符或已不存在时应降级为 drop。
- 做法 AP：不是 Claude Code；仓库不能版本控制或团队不接受把流程写成文件；没有测试、formatter 等可自动执行的动作；无法约定敏感目录和必须自动执行的动作；希望原文给出可直接复制的 hook 配置、命令或提示词模板；要求五层结构有对照实验数据。
- 做法 AQ：Windows 不支持；Linux 只有终端、没有弹窗；不能接受本地数据库不加密、会保存输入 prompt 的脱敏副本并默认保留 14 天；不能接受“会话确认不是沙箱”——同用户进程隐藏环境变量即可带 --yes 跑同样命令；不愿人工核对设备指纹、不愿交换 peer id 与团队 root 指纹；不能接受加入团队时安装你还没读过的规则；需要秘密投票、投票截止时间、超过 64 人、或需要后台服务常驻；不愿运行 daemon、不愿在 internet 模式下暴露公钥和 IP；要求现成效果数据；把 PeerHarness 当强安全边界。
- 做法 AR：不在支持列表内的 agent；不愿注册 MCP server 或授予 hooks 执行权；需要 guard 真正拦得住却无法在命令执行前和文件读取前挂钩；不能接受 hook fail-open（内部错误不卡死 agent，只在本地记日志）；不愿为团队缓存、托管蒸馏、按席位 ROI 付费买 TS2 license；要求效果数据来自独立复现而非作者自报模拟基准；需要离线/私有环境且未验证；要求 11 种语言之外的语言或超出 OpenAPI/Prisma/GraphQL/SQL 的结构化切片。

## 前置条件

- 通用：一个真实编码任务，最好本来就有大量工具调用，能对比前后差异；Node.js/npm 或对应运行时可用；能修改配置、重启客户端或接受一次本地进程；先备份 CLAUDE.md / AGENTS.md 和现有配置；一次只加一项，小范围试用。
- A/B/C：Claude Code v1.0.33+；Context Mode 是 ELv2，推广前确认商用合规；Cursor 插件仍在审核，可本地链接；Gemini CLI、Copilot、OpenCode 等按 README 注册 MCP 与 hook。D：Node 18+；到 console.typesafe.ai 申请 Jev key；内容会发到第三方 API。E：Node 20.0.0+；Claude Code 支持插件；标准安装要求浏览器登录，可显式传 --provider、设 CLAUDE_MEM_ONLINE_OPTIN=false 或在 CI 运行。
- F：Python 3.10+；headroom CLI 只在 PyPI 包里，npm 包是库；匿名 beacon 默认开启，可 HEADROOM_BEACON=off。G：能装 skill 或插件；录制端以 macOS 为主；首次运行可能下载约 240 MB 语音模型；前提是能看到问题或用手机拍到。H：mem0 CLI 或库；默认依赖 OpenAI 的 gpt-5-mini 和 text-embedding-3-small；自托管要 Docker。I：uv pip install 'cognee[gliner]'；无 LLM key 时可用本地 GLiNER 与本地 embedding；单 Postgres 图存储是 demo，生产版是授权产品。
- J：宿主支持 hook/插件或 Agent Skills；本机有 Node/npx；状态标记必须保持英文字面量。K：Node >= 22.0.0；需要 Deeplake 账号 token；默认把全部会话 prompt 与工具输出写进团队共享 workspace。L：本机确实同时使用两个及以上支持同类指令文件约定的编码 agent；系统支持符号链接。M：Claude Code 可用；目标项目里已有 CLAUDE.md 或 skills 配置文件；先备份当前 CLAUDE.md。N：Claude Code 可用；有较长的 CLAUDE.md；接入多个 MCP 服务器而多数用不到；对用量/配额敏感，不需要装新工具。
- O：带 function hooks（mods）的 Claude Code build；目标场景是 1M 上下文模型 + 1 小时 prompt cache 的订阅用户；能 clone 并以 --plugin-dir 加载，或能改 ~/.claude/settings.json 的 env。P：带 mods 的 Claude Code 构建；能 clone 并以 --plugin-dir 加载，或能改 ~/.claude/settings.json 的 env；~/.claude/state 与 ~/.claude/auto-handoff/ 可写；可选 Tailscale、jq、终端超链接支持。Q：已安装并运行 Claude Code；能安装插件并在下次会话启动时加载；工作目录是有 git 仓库的目录；能写入 docs/handoffs/；若自定义交接命令，必须给它 allowed-tools 预批准工具，或把会话放在允许写入的权限模式下。
- R：仓库里已有一个作者描述为“一团乱麻”的 AGENTS.md；准备一个可读写的 CODING_STANDARDS.md；使用支持子代理、且能创建 PR 的编程智能体；已配置可用的 /writing-for-agents 命令或技能；没有它就直接把提示词原文粘贴给智能体。S：使用 Codex 或 Claude Code；项目里已有或准备新建 AGENTS.md 这类代理配置文件；能在项目根目录运行 wc -l 与 wc -c；一个你近期 1–2 周会持续使用的项目。T：使用 Claude Code；额度按周统计；能找到与自动压缩阈值相关的项（原文提到的名字是 autoCompactWindow）；能接受一周默认值、一周 400k 的对照，或用同一组固定任务反复跑；能记录额度消耗、自动压缩触发次数、重复交代上下文的次数、因丢失前文导致的返工/重开次数、任务一次做对比例。原文没有给出这个参数写在哪里、怎么写，第 2 步必须自己核对，核对不到就不要照做。
- U：已在使用 Claude Code，且工作流里确实会调用子代理；有修改该配置项的权限；能观测 token 消耗、费用或缓存命中；子代理调用之间确实经常出现超过 5 分钟的空闲。原文提到的设置名是 subagentPromptCacheTtl，但取值、配置位置、生效方式全部缺失，必须先回官方文档核对。V：本机装有 Claude Code；能在本机新建一个专用文件夹；能在该文件夹里启动 Claude Code；能在该文件夹根目录放一份 CLAUDE.md；愿意先拿一个测试文件夹试。W：使用 Claude Code；项目里有一组需要长期遵守的约定；愿意记录 Claude 实际违反了哪些约定、各违反了几次；能检查 CLAUDE.md 行数；原文没有给出检查频率，需自行定一个固定复查点。
- X：使用 Codex 或同类能回看历史会话的智能体；已经存在一份 AGENTS.md 或等价的持久化指令文件；已经积累一定数量的真实会话；能保留修改前后版本，先备份；愿意人工裁决，而不是让模型直接覆盖 AGENTS.md。Y：知识库已经按目录组织，目录职责相对稳定；所用 AI 工具确实会读取目录级 CLAUDE.md；能从目标文件夹启动或指定任务；先备份现有根级 CLAUDE.md。原文没有说明是哪个插件、客户端或命令行工具读取，也没有说明读取顺序。
- Z：已安装 Claude Code；Node 20+；知道项目或全局 CLAUDE.md 的位置；本机能读到 Claude Code 会话记录，工具会遵循 CLAUDE_CONFIG_DIR；已有一份 CLAUDE.md 作为写入目标；愿意逐条 yes/no/edit；先选一个日常最常用的项目、试一周；规则包需要能访问 raw GitHub；可选复现规则包挖掘时需要克隆仓库并装有 pnpm。规则包下载会覆盖同名文件，要长期保留自定义版本就改文件名后导入。CLI 自认是 preview，作者说约三分之一建议才是真规则。
- AA：项目里已有会被 agent 自动加载的 CLAUDE.md 或 AGENTS.md；agent 能对仓库做检索（grep / 读文件 / 跳转定义），否则“多次工具调用”这个判据不成立；选一个中等规模仓库，准备保留前 5 个 PR 的同等长度基线；愿意跑一周或 5 个 PR 并做前后对比。AB：Linux x64；Claude Code 2.1.257–2.1.312；能设置环境变量并重启 Claude Code daemon；脚本放在绝对路径；接受 MIT 许可的非官方 Bun preload 脚本和可能违反服务条款的风险；最好有 OpenTelemetry 做 query_source = agent_summary 检查；先在非关键项目试用；每次升级 Claude Code 后能重跑验证。
- AC：已有团队内部开发用的 harness；skills、docs/、AGENTS.md 可编辑；先备份现有 skills 与 AGENTS.md；能确认或定义 OKF 格式；文档路径稳定、触发条件可枚举；选一个仓库或一条内部开发流程，准备同一批任务做前后对比。AD：本地有 Obsidian 笔记库或结构稳定的目录；已安装并可运行 Claude Code；允许 Claude Code 读取该目录；先备份或使用版本控制；选一个非敏感的小型笔记库副本；原文第 4 步缺失，不要把缺失步骤当已验证。
- AE：使用的编码代理会读取仓库根目录的 AGENTS.md，并实际遵循其中指令；代理有可写的文件系统权限；任务经常超过五步；先备份现有 AGENTS.md，并准备同一类长任务做前后对比（2–3 次）。原文没有说明如何检测“文件已变化”，需要自己补一条限定。AF：Node.js 22+；一个已有项目文件夹；一个已安装并登录的编码代理客户端（Codex / Claude Code / Cursor 等）；devilop 源码检出或版本化安装包；API 写入需要 .devilop/token；Claude Code 还需会话级 channel 同意与组织策略许可；VM 访问默认关闭，需主机核对 4 位码后 Allow。
- AG：有一个本地代码仓库，仓库状态干净或已备份；已安装并使用 Codex CLI、Claude Code 或 Gemini CLI 中的任意一个；项目有相对稳定的规范可写；多人协作时必须把 AGENTS.md 提交进版本控制。AH：项目使用支持 AGENTS.md 或类似项目级指令文件的编码代理；任务以代码修改为主；团队愿意在代理提出额外防护时人工确认；项目本身不是对竞态、安全、边界零容忍到不能人工判断；先备份 AGENTS.md；选需求明确、改动范围小的任务做前后对照；原文只有一条规则摘录，没有完整 AGENTS.md 模板或效果数据。
- AI：Claude Code 已安装；原文要求 v2.1.283+，先 claude update，再用 claude --version 核对（核对步骤是本手册补的）；项目里至少有 CLAUDE.md、AGENTS.md、.claude/ 或 ~/.claude/ 中的一项；先保存完整审计输出，再决定改哪条。AJ：已使用 Claude Code；项目里有 AGENTS.md（没有就新建）；选一个含较大文件的仓库；准备 3–5 个典型任务（查函数调用、改错误处理、解释模块入口等）；能查看 token 用量或至少记录工具调用次数；用新会话避免上下文污染；先备份 AGENTS.md。
- AK：已使用 Claude Code、Codex 或其他支持 AGENTS.md/CLAUDE.md 的代理框架；有读写项目目录的权限；同时服务多个客户或维护多个项目；愿意为每个项目建独立目录；愿意在任务结束时让代理写决策记录；先选一个项目试 1–2 周。AL：已安装 Claude Code 或 Codex，并使用其用户级或项目级指令文件；~/.claude 或 ~/.codex 目录可创建；能对一个小改动做前后对比；接受这条规则的原文被截断、后半句需要自行补全。AM：目标仓库有 agent 指令文件（CLAUDE.md 的本地与导入版本、.claude/rules 等）；使用能读取仓库文件的 coding agent；能把 agent 设为只读或要求任何修改前人工批准；先备份；愿意逐条审核输出。
- AN：本机有可用的 Node.js / npx；有一个前端代码库；有一个能接受外部文本上下文的编码智能体；能联网运行 npx modern-web-guidance@latest；愿意先零安装试跑 search、retrieve、legacy-scan，或先建分支再跑 install/update；原文未给出 Node 版本要求，也未说明支持哪些编码智能体、私有环境或离线可用性、指南更新频率、legacy-scan 的判定规则来源和误报情况；原文特性列表在 Password credentials 处截断，全貌未知。
- AO：已安装并登录 Claude Code；有一个可重复的对照任务（同一仓库、同一提示词、同一模型与轮数上限）；能读到 pxpipe 仓库 README 并按其说明安装；能在客户端与模型之间插入本地进程；能本地把文本渲染成清晰图片；能记录会话账单和输入 token；能观察代理输出/日志里是否报告被替换的静态块和折算后的视觉 token 数。原文未给出安装步骤、配置项、支持模型版本；仓库链接在采集时断行为 github.com/teamchong/pxpi / pe，需自行补全为 https://github.com/teamchong/pxpipe 并以 README 为准；原文出现的模型名 Claude Fable 5.2、Opus 5.5 与已知命名不符，无法核实。
- AP：使用 Claude Code；仓库可版本控制；已有或愿意补测试、formatter 等可自动执行的动作；团队能约定目录、敏感目录和必须自动执行的动作；愿意先在一个中等仓库试 1–2 周。原文没有给出可直接复制的命令、hook 配置或提示词模板，具体配置需按 Claude Code 文档补齐。
- AQ：macOS 优先（README 说 Made for Claude Code on macOS first）；Linux 只能在终端使用、没有弹窗；Windows 不支持；一个受支持的 agent，建议 Claude Code（唯一有 hook 的）；需要 curl，安装脚本会做 SHA256 校验；setup 必须由人本人执行，agent 会被拒绝；其中一个 hook 会保存你输入每条 prompt 的脱敏副本，只在本机，默认保留 14 天，数据库不加密；邀请第二个成员时双方需在聊天之外的渠道人工核对设备指纹；要 node 可达需运行 daemon；internet 模式会把 node 公钥和 IP 暴露给志愿者运行的服务器。
- AR：本地工作站；已装 Node（用 npx）或 Python 3.10+（用 pip）；已在用的编码 agent 在其支持列表内（Claude Code、Cursor、Claude Desktop、Windsurf、OpenAI Codex、Cline/Roo Code、GitHub Copilot、Gemini CLI、ChatGPT 云连接器等）；要挂 hooks 的 agent 需授予 PreToolUse、beforeShellExecution、beforeReadFile 等执行权；团队缓存、托管蒸馏、按席位 ROI 报表需 TS2 license；遥测可用 TOKENSAFE_TELEMETRY_DISABLED=1 关闭，云只收计数器不收源码与提示（作者声明）；所有 hook 适配器 fail-open。

## 操作步骤

先按痛点选做法：
- 只想先省上下文、不想装 hook，且用 Claude Code → A；想自动拦截大输出、自动路由到沙箱 → B；用 Cursor 且插件未上架 → C。主要痛点是“读很多、只判断一点” → D。
- 换会话就失忆、反复交代背景 → E/H/I 三选一先试；需要按 user_id 隔离的持久记忆选 H，需要本地优先、知识图谱、无 LLM 也能检索选 I，想本地统一压缩所有经过 LLM 的流量且要求可逆选 F。不好描述、说不清复现步骤的界面问题 → G。
- 长时编码任务、计划要挺过 /clear 或 compaction → J；只要一条零成本常驻规则就选 AE。团队多 agent、想把重复模式固化成技能 → K。同一台机器上同时用 Claude Code 和 Codex，规则要在多处维护、两边行为还不一致 → L。
- CLAUDE.md / skills 里堆着旧提示习惯 → M。配额/用量限制提前耗尽，CLAUDE.md 很长、MCP 服务器一大堆 → N；这条不用装东西，成本最低，适合在做 A–AR 之前先做一遍。
- 长会话经常撞上下文上限、每次都要手动 /clear 再重述 → O；想用一份可编辑、可落盘的交接简报替换内置 auto-compact → P；经常离开去做别的事、回来发现缓存已失效 → Q。三者同属自动交接，触发条件不同，同一条会话先只加一个。
- AGENTS.md 自己一团乱麻 → R；想给常驻文件设一个可量测的上限 → S（先 wc -l / wc -c 量现状，再压到 200 行以内 / 32 KiB 以内）。S 管长度，R 管结构，M 管内容。
- 额度提前耗尽、频繁触发自动压缩，并且你能找到 autoCompactWindow → T。T 和 N 都在调自动压缩，一个给窗口大小、一个给百分比；材料没说明是否为同一设置，同一条会话先只改一项。
- 子代理只是闲置了一会儿，下一次调用就像失忆一样重写整个上下文 → U（先不动配置，只测一次闲置 6 分钟前后的 token 用量）。每个新会话都要重复粘贴同一段规则/背景 → V。第一天就把配置堆满，真正反复被违反的约定反而没被约束 → W。
- AGENTS.md 里某条规则总让 agent 走偏或返工，而你用 Codex 或同类能回看历史会话 → X。根级 CLAUDE.md 对所有目录一刀切、不同文件夹需要不同只读/编辑/引用规则 → Y。
- 同一句纠正反复说，却总没写进 CLAUDE.md 或想低成本拿到一份通用规则包 → Z。agent 写的注释大量复述代码、评审时反复删注释 → AA。配额被看不见的后台摘要吃掉，且你在 Linux 上用 Claude Code、能看日志或 OpenTelemetry → AB。
- skills 和 AGENTS.md 里堆了太多知识，agent 每次都要读一大段，或不知道何时该查哪份文档 → AC。已有笔记库/项目目录，但缺少描述文件夹结构、链接风格和命名规则的 CLAUDE.md → AD。
- agent 反复重读同一批文件、长任务计划只存在上下文里、一压缩就丢 → AE。界面改一处要人进 IDE，代理不知道在哪改、改完有没有检查，或想把产品结构图、真实界面草稿和完成状态一起交给当前对话 → AF。
- 仓库里根本没有 AGENTS.md、每换一个工具就要重写一遍规则，或不知道这份文件里该写哪几类东西 → AG。
- 代理为几乎不会发生的边界问题加防御、十行需求写百行防御、越界改文件 → AH。与 AE 的差异：AE 管重复读取和计划落盘，AH 管改动范围和防御性代码审批；与 AG 的差异：AG 建文件骨架，AH 是其中禁区/开发规范的一条具体规则。
- 规则文件本身可能重复、冲突、过时，想先做一次全局体检 → AI（先确认 /doctor prompt-audit 在你版本里存在；不存在就降级为定期人工审查规则）。与 M 的差异：M 用 /claude-api prompt-audit 审旧提示习惯，AI 用 /doctor prompt-audit 做全局规则体检；两条命令都未被材料完整验证，不要同时改。
- 代理读大文件时整文件读入，token 消耗大，但很多内容根本不需要 → AJ。与 AE 的差异：AE 管不重复读和五步以上先落计划，AJ 管读之前先检索定位；两者都写进 AGENTS.md，可以分开试。与 AA 的差异：AA 管注释准入，AJ 管读取方式。
- 多个客户/项目之间会话记录串味、规则互相污染、新会话不知道上次决策 → AK。与 L 的差异：L 解决同一份规则文件如何软链给多个 agent；AK 解决多个项目之间如何隔离与恢复上下文。与 Y 的差异：Y 是同一知识库内的目录分层规则；AK 是跨项目/客户的目录隔离与入口文件。
- 指令文件写了一种风格、代码实际是另一种风格，代理擅自按指令改写 → AL。与 AH 的差异：AH 管防御性代码和改动范围，AL 管指令文件与既有代码冲突时的裁决顺序和报告义务。与 AG 的差异：AG 建文件骨架，AL 是其中一条裁决规则。
- 规则文件很久没体检，想知道哪些行过时、哪些硬规则只写在散文里 → AM。与 AI 的差异：AI 用 /doctor prompt-audit 做命令式体检；AM 是人工发起、只读扫描、逐条批准的巡检提示词。与 M 的差异：M 审旧提示习惯，AM 找过时行和只写在散文里的硬规则。三者不互相替代。
- 编码代理总写 2019 年前后的前端写法，堆 polyfill 和旧库，不知道现代 Web 原语怎么写 → AN。先零安装用 search/retrieve 验证指南质量，或按官方 1.0 在分支上 install/update 后跑 /modern-web-guidance Modernize the code in this directory；确认有用才扩大。与 AG/AH/AL 的差异：AN 补的是 Web 领域知识与版本信息，不替代规则文件骨架、改动范围约束或冲突裁决。
- 每轮都重发一大段静态前缀、长会话账单高 → AO。先读 README 确认安装，再用 pxpipe warp -- claude 跑同任务对照；与 A–AN 不互相替代，AO 是 Claude Code 外侧的成本层。短会话、一次性问答不适用。
- 仓库结构乱、重复流程靠提示、必须自动执行的动作总被忘、高风险模块没有局部规则 → AP。先写短根 CLAUDE.md，只放目的、仓库地图、规则与命令；再把一个高频流程做成 skill、一个必须自动执行的动作做成 hook、一个高风险模块加局部 CLAUDE.md；跑 1–2 周对照。AP 是结构层，不替代 S 的长度控制、N 的预算审计、AC 的知识路由、AH 的改动范围约束。
- 团队里同一句纠正反复出现、规则只存在个人本地、想投票通过后自动下发到每个成员且允许逐人 opt-out → AQ。与 Z 的差异：Z 用规则包 + CLI 从个人历史会话挖规则；AQ 是把个人纠正变成团队投票规则并分发。与 L 的差异：L 是同一份文件软链给多个 agent；AQ 是多成员各自持有密钥、各自计票、共享同一套规则。
- 想用一个本地 MCP 层同时做按符号读代码、压缩测试日志、执行前拦截风险、保持提示缓存前缀稳定 → AR。与 A/B/C 的差异：A/B/C 主要拦截工具输出；AR 还管按符号读文件、执行前 guard、缓存友好写入。与 AJ 的差异：AJ 是一条“先 grep 再局部读取”的规则；AR 是把这件事做成工具。

### 做法 A：MCP-only 轻量试用（推荐先做）
1. `claude --version` 确认 ≥ v1.0.33；`claude mcp add context-mode -- npx -y context-mode`。预期注册 11 个 ctx_* 工具，没有 hook、没有自动路由。
2. 重启 Claude Code。任务开始前和结束后运行 `ctx stats`，记录节省明细、消耗 token、节省比例。
3. 手动提示模型使用 ctx_* 工具：批量读取、统计、聚合类工作先用 ctx_execute 写脚本完成，只输出结果。
4. 记录正确率、人工纠正次数、交付时间；最好和不用 Context Mode 的基线对比。根据结果决定是否上做法 B。

### 做法 B：完整插件（自动路由 + hook）
1. `/plugin marketplace add mksglu/context-mode`；`/plugin install context-mode@context-mode`。
2. 重启或 `/reload-plugins`，用 `/context-mode:ctx-doctor` 验证，预期所有检查为 [x]。
3. 可选：在 `~/.claude/settings.json` 加 statusLine，命令为 `context-mode statusline`。用 ctx-stats、ctx-doctor、ctx-index、ctx-search、ctx-upgrade、ctx-purge、ctx-insight 查看状态。
4. 跑真实任务对比结果；完整插件会通过 hook 自动拦截大输出并路由到沙箱。

### 做法 C：其他平台
- Cursor：插件仍在审核。可本地安装：`ln -s` 把仓库链接到 `~/.cursor/plugins/local/context-mode`；Windows 用 robocopy。也可手动建 `.cursor/mcp.json` 和 `.cursor/hooks.json`，并拷 `.cursor/rules/context-mode.mdc`。注意项目 `.cursor/hooks.json` 会覆盖 `~/.cursor/hooks.json`。
- Gemini CLI：`npm install -g context-mode`，在 `~/.gemini/settings.json` 注册 mcpServers 与 BeforeTool、AfterTool、PreCompress、SessionStart 四个 hook；重启后 `/mcp list` 应显示 Connected。
- 其他客户端按 README 注册 MCP 与 hook；注意 OpenCode 同时存在 plugin 与 mcp.context-mode 会注册 0 个 ctx_* 工具，需 `context-mode upgrade`；GitHub Copilot CLI 旧版本 hook fail open。

### 做法 D：把“略读型批量判断”外包给 Jev（Quicksilver）
1. 前提：Node 18+；到 console.typesafe.ai 申请 Jev key；内容会发到第三方 API。
2. 安装：`npx github:UditAkhourii/quicksilver`，装完重启 Claude Code。非交互安装：`npx github:UditAkhourii/quicksilver install --key YOUR_JEV_KEY`。
3. 常用命令：`qs filter 'Does this file handle user sessions?' src`；`qs filter 'Does this line report a failure?' app.log --lines`；`qs classify --labels 'bug,feature,question' --items issues.jsonl`；`qs rank 'where do we issue refunds?' src --top 5`；`qs find 'the retry backoff logic' huge_module.py`；`qs ask 'Does this contract allow termination without notice?' --state @contract.txt`；`qs status`。
4. 大扫描加 `--fast`；一次只问一个窄的、带类型的判断；给兜底标签；不做算术、不涉及日期。
5. 读回执：扫描数、命中数、borderline 数、耗时、Jev token 与成本、约多少 Claude token 没被读。
6. 安全边界：不会发送 `.env*`、私钥、证书、凭据文件；遵守 `.gitignore`；跳过二进制文件和大于 2 MB 的文件。不要用它做写作、编辑、多步推理，以及任何 grep 能精确回答的问题。

### 做法 E：跨会话持久记忆（claude-mem）
1. 前提：Node.js 20.0.0+；Claude Code 支持插件。
2. 标准安装：`npx claude-mem install`；想跳过登录可显式传 `--provider`、设 `CLAUDE_MEM_ONLINE_OPTIN=false`，或在 CI 中运行。
3. 插件市场安装：`/plugin marketplace add thedotmack/claude-mem`、`/plugin install claude-mem`。重启 Claude Code；新会话会自动出现此前会话的上下文。
4. 配置在 `~/.claude-mem/settings.json`；可配模型、worker 端口、数据目录、日志级别、上下文注入。隐私控制：用 `<private>` 标签排除敏感内容。
5. 检索三层：search 约 50–100 tokens/结果；timeline 看时间线；get_observations 按 ID 批量取详情，约 500–1,000 tokens/结果。
6. 注意：`npm install -g claude-mem` 只装 SDK，不注册插件 hook；装插件走 `npx claude-mem install` 或 `/plugin`。

### 做法 F：本地代理压缩所有 LLM 流量（headroom）
1. 安装（任选）：`uv tool install --python 3.13 'headroom-ai[all]'`、`pip install 'headroom-ai[all]'`、`npm install headroom-ai`。注意 CLI 只在 PyPI 包里。
2. 选接入模式：`headroom deploy`；`headroom wrap claude`；`headroom proxy --port 8787`。撤销用 `headroom unwrap <tool>`。
3. 自检：`headroom doctor`；`headroom perf`；`headroom dashboard`。
4. 打开输出 token 削减（默认关闭）：`export HEADROOM_OUTPUT_SHAPER=1`，再 `headroom proxy --port 8787`。
5. 让工具学简洁度：`headroom learn --verbosity`；`headroom learn --verbosity --apply`。
6. 量测输出节省：`headroom output-savings`；想看实测可留 10% 会话作对照：`export HEADROOM_OUTPUT_HOLDOUT=0.1`。关闭遥测：`export HEADROOM_BEACON=off`。回滚：`headroom unwrap <tool>`。

### 做法 G：录屏 + 口述（blurt）
1. 安装：`npx skills add AGIHunt/blurt`；Claude Code 也可 `/plugin marketplace add AGIHunt/blurt`。
2. 触发语：`start blurt` 或 `开始口喷`；首次运行会挑语音模型并安装菜单栏应用。
3. 划定录制区域，倒计时后口述。快捷键：⌥⇧P 暂停、⌥⇧S 完成。点 Finish 后回到工作；agent 本地转写、写出条目、打开评审页。
4. 像刷信息流一样分诊：A 保留、X 丢弃、J/K 上下条、Z 撤销、G 列表、V 总览；然后导出，或对 agent 说 `fix them`。
5. 常驻用法：⌥⇧R 开始录制，再按一次结束；⌥⇧B 打开菜单。录制默认写到 `~/Blurt`。语音模型默认本地 SenseVoice，约 240 MB；Apple Silicon 或 NVIDIA 上可用 Whisper；也可自带 Groq、OpenAI 或 DashScope key。

### 做法 H：mem0 可编程持久记忆
1. CLI 最小验证：`npm install -g @mem0/cli`、`mem0 init --agent --agent-caller claude-code`、`mem0 add 'I am using mem0'`、`mem0 search 'am I using mem0'`。
2. 带用户隔离：`mem0 add 'Prefers dark mode and vim keybindings' --user-id alice`、`mem0 search 'What does Alice prefer?' --user-id alice`。
3. 库方式：`pip install mem0ai`；增强混合检索：`pip install 'mem0ai[nlp]'`；`python -m spacy download en_core_web_sm`。核心模式：取记忆 → 拼进 system prompt → 生成回答 → 把整轮对话写回记忆。
4. 自托管：`cd server && make bootstrap`；`cd server && docker compose up -d`，默认 `http://localhost:3000`。自托管默认开启鉴权。
5. 路线：测试/原型用库；团队自建用自托管；零运维生产用云平台。注意：README 分数反映托管平台，包含开源 SDK 不具备的专有优化；ADD-only 只累积不覆盖，原文未说明如何清理错误记忆。

### 做法 I：cognee 本地知识图谱记忆
1. 安装：`uv pip install 'cognee[gliner]'`。
2. 无 LLM 跑通写入 + 检索：
```python
import asyncio
import cognee

async def main():
    await cognee.remember(
        'Marie Curie was born in Warsaw and worked at the University of Paris.',
        dataset_name='local_quickstart',
    )
    results = await cognee.recall(
        'Where was Marie Curie born?',
        datasets=['local_quickstart'],
    )
    for result in results:
        print(result)

if __name__ == '__main__':
    asyncio.run(main())
```
3. CLI 等价：`cognee-cli remember 'Marie Curie was born in Warsaw.' -d local_quickstart`；`cognee-cli recall 'Where was Marie Curie born?' -d local_quickstart`。无 LLM 时 recall 返回匹配到的源文本片段，不生成答案。
4. 配置 LLM：`os.environ['LLM_API_KEY'] = 'YOUR OPENAI_API_KEY'`。Claude Code 插件：`claude plugin marketplace add topoteretes/cognee-integrations`；`claude plugin install cognee-memory@cognee`。Codex：`codex features enable hooks`；`codex plugin marketplace add topoteretes/cognee-integrations --ref main`；`codex plugin add cognee@cognee`。本地 UI：`cognee-cli -ui`。
5. 单 Postgres 承载整个记忆层是 demo 特性；生产版本是授权产品。

### 做法 J：planning-with-files 磁盘计划
1. 安装：`npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g`；中文版加 `--skill planning-with-files-zh`。状态标记必须保持英文字面量，例如 `**Status:** complete`。
2. 建立三文件结构：`task_plan.md`、`findings.md`、`progress.md`。并行任务用 `.planning/YYYY-MM-DD-slug/`，通过 `.active_plan` 指针选择。默认被 gitignore。
3. 与 Claude Code plan mode 衔接：plan mode 里设计并批准方案；接受后让智能体把方案写成 `task_plan.md` 的 phases，然后在普通模式执行。
4. 依赖 hook 持续注入：UserPromptSubmit hook 每回合重新注入 active-plan；`/clear` 或新会话后从磁盘重读。启用完成门槛：gated 模式下持有停止动作，直到计划报告完成。
5. 命名计划与选择器：两个命名计划时必须显式给 PLAN_ID；可用 PWF_PLAN_ROOT 固定、PLANNING_DISABLED 关闭；PWF_FAST_PATH=0 强制回到 shell 链。
6. 任务结束后：计划文件是工作记忆，不是交付物；值得保留的内容应显式提升到代码、提交或文档。

### 做法 K：hivemind 团队 trace 技能化
1. 安装：`curl -fsSL https://deeplake.ai/hivemind.sh | sh`；Windows 用 `irm https://deeplake.ai/hivemind.ps1 | iex`；npm：`npm i -g @deeplake/hivemind && hivemind install`。
2. 授权：`HIVEMIND_TOKEN=<your-token> hivemind install`；或 `hivemind install --token <your-token>`。只给指定 assistant 安装：`hivemind install --only claude`；或 `hivemind claude install`、`hivemind codex install` 等。
3. 检查接线：`hivemind status`，重启对应 assistant。Codex 首次启动选 2. Trust all and continue；Claude Cowork 要完全退出并重开 Claude Desktop。
4. 可选语义检索：`hivemind embeddings install`；`hivemind install --with-embeddings`。默认关闭，本地嵌入约 600 MB；不开则降级成 ILIKE 词法检索。
5. `.hivemind` 路由或退出：字段 orgId、workspaceId、collect；`.hivemind` 可提交，`.hivemind.local` 不提交且优先；`collect:false` 始终生效；优先级 env > file > login。
6. skillify：`hivemind skillify`；`hivemind skillify scope <me|team>`；`hivemind skillify pull`；`hivemind skillify unpull`。跨 agent 团队规则：`hivemind rules add 'no DROP TABLE on prod creds'`；`hivemind rules list`；`hivemind rules edit <rule-id> '<new text>'`；`hivemind rules done <rule-id>`。卸载：`hivemind uninstall`；`hivemind codex uninstall`。

### 做法 L：一份共享 AGENTS.MD，软链给多个 agent 共读
原文只给了机制，没有给命令、路径或规则文本；涉及具体路径必须自行按各工具当前文档确认。
1. 前提：本机确实同时使用两个及以上支持同类指令文件约定的编码 agent；系统支持符号链接。
2. 建一个单一共享文件夹，写一份 AGENTS.MD，所有 agent 规则集中放这一份；写法同时参考做法 S 的长度预算。
3. 把这份 AGENTS.MD 软链到 Claude Code 和 Codex 各自期望读取的位置。示意形式（路径需按各工具文档确认）：`ln -s /path/to/shared/AGENTS.md /path/to/claude-code/expected/location/AGENTS.md`；另一个工具同理。预期两个工具实际读到同一份内容。
4. 对每个 repo 做同样处理。原文在 Every repo 处截断，完整做法不可知。
5. 先验证链路：放一条可明确观察是否生效的独特规则，用同一个日常任务分别在这两个工具里跑；若任一工具行为没有变化，说明软链路径写错了。
6. 链路确认后再写正式规则；只在一个 repo 上跑一到两周，不铺开到所有 repo。

### 做法 M：审查 CLAUDE.md / skills 里的过时提示习惯（先只记录不改动）
1. 前提：Claude Code 可用；已有 CLAUDE.md 或 skills；先保存副本。
2. 在项目目录下打开 Claude Code 会话，运行 `/claude-api prompt-audit`。
3. 原文在此截断，没有说明输出形式、是否给出修改建议、是否需要人工确认；先只记录，不要预设它会自动改写文件。
4. 逐条复核旧式指令（如逐步思考、仔细检查你的工作），判断保留、改写还是删除。
5. A/B 小范围验证：A 组保留，B 组删除或改写，用同一批 5–10 个真实任务各跑一遍。如果命令运行失败或不存在，降级为定期审查 CLAUDE.md 里的过时指令这一原则。

### 做法 N：先审计上下文预算，再一次只改一项
1. 前提：Claude Code 可用；有较长的 CLAUDE.md；接入多个 MCP 服务器而多数用不到；对用量/配额敏感。
2. 测量现状：运行 `/context`，记下 token 去向作为基线。
3. 只改一项：先禁用当前会话里没有用到的 MCP 服务器，入口命令 `/mcp`。原文在 `/mcp` 处截断，后续操作未知；这一步目前只能当排查入口用。
4. 如果还想继续，再单独试把压缩阈值调早。原文写的是 `/compact` 设置为 60%，而不是 95%；原文只给结论性数字，没有说明对应哪个设置项或命令参数，照做前先在设置里确认。
5. 只有前两项有效之后，最后再回头精简 CLAUDE.md。原文没有给出怎么精简 CLAUDE.md 的具体做法。每改完一项，都用同一个类型的真实任务再跑一遍，并再记录一次 `/context`。一次只改一项。权衡：更早压缩意味着更频繁丢失上下文细节，可能换来更多重述和返工。

### 做法 O：长会话自动交接与沉淀（ctx-handoff，experimental）
1. 前提：需要带 function hooks（mods）的 Claude Code build；版本不符不要继续。
2. 克隆并首次加载：`git clone https://github.com/cablate/ctx-handoff-mod ~/.claude/mods/ctx-handoff`；`claude --plugin-dir ~/.claude/mods/ctx-handoff`。预期会话里能调用 `/handoff`。
3. 跑 `/handoff` 自检；预期输出能看到上下文用量、门槛、刷新计数。想让每个会话都加载，在 `~/.claude/settings.json` 的 env 里加 `CLAUDE_CODE_PLUGIN_DIRS`，指向该目录绝对路径。
4. 按需调参：默认 THRESHOLD 600_000、WINDOW_RATIO 0.8、IDLE_MS 55 min、MAX_REFRESH 3、MIN_TOKENS 30_000；数值在 `hooks/register.ts` 顶部常量。如果你用 5 分钟缓存，必须关掉刷新：`/handoff refresh off`。
5. 正式依赖前，先用 `/handoff dry` 看一次交接成本。常用子命令：`/handoff`、`/handoff now`、`/handoff dry`、`/handoff distill`、`/handoff resume`、`/handoff continue`、`/handoff resend`、`/handoff refresh on|off`、`/handoff distill on|off`。先在单个会话、单个项目上验证；与做法 P、Q 同一条会话先只加一个。

### 做法 P：用结构化交接简报替换内置 auto-compact（claude-auto-handoff，先小范围试）
1. 前提：需要带 mods 的 Claude Code 构建。
2. 克隆并加载：`git clone https://github.com/alexknowshtml/claude-auto-handoff.git ~/claude-auto-handoff`；`claude --plugin-dir ~/claude-auto-handoff`。可选：写进 `~/.claude/settings.json` 的 env，加 `CLAUDE_CODE_PLUGIN_DIRS` 指向该目录。
3. 配置：threshold 默认 160000；maxConsecutiveHandoffs 默认 2；briefTemplate 默认 `~/.claude/auto-handoff/brief.md`；instructionsTemplate 默认 `~/.claude/auto-handoff/instructions.md`；ignoreFiles 默认空；viewer 默认 `tailscale:3846`。环境变量：`AUTO_HANDOFF_TOKENS=60000` 可覆盖阈值；`AUTO_HANDOFF_DISABLE=1` 关闭；`DISABLE_AUTO_COMPACT` 也会关闭它。
4. 改简报结构与规则：改 `~/.claude/auto-handoff/` 下的副本，不要改仓库里的；不要写 files 和 commits 段；不要删掉 `## Last Request from the User` 及其 Status 行。
5. 可选状态栏链接：`statusline/handoff-link.sh`。运行机制：阈值检查、Haiku 写简报、`/clear`、新会话播种、面板、查看器。日志：`~/.claude/state/auto-handoff/auto-handoff.log`。
6. 最小试用：设 `AUTO_HANDOFF_TOKENS=60000`，在一个不那么关键的长会话里跑一次完整交接。与做法 O、Q 同一条会话先只加一个。

### 做法 Q：空闲自动落盘交接（obie/auto-handoff，先小范围试）
1. 前提：已安装并运行 Claude Code；基于 early access 的 function hooks 插件 API。
2. 安装：`/plugin marketplace add obie/auto-handoff`；`/plugin install auto-handoff@auto-handoff`。
3. 可选调整触发条件。默认 minutes 为 50，默认 command 为 `auto-handoff:handoff`；用 `/plugin configure auto-handoff` 调整。若换成自己的交接命令，必须给它 allowed-tools 预批准工具，或把会话放在允许写入的权限模式下。
4. 默认交接行为：写 `docs/handoffs/<timestamp>-<slug>.md`，覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions；运行 date 和 git status，不做任何提交。
5. 触发与取消：空闲计时从主对话 turn 结束开始，任何新 turn 重置；subagent 结束不影响；空闲达到 minutes 后执行 command；每次离开只交接一次；`/clear` 取消待执行；休眠迟到会跳过。
6. 最小试用：在有 git 仓库的真实长任务里安装插件，先用默认配置 minutes=50；做一段有明确目标和未完事项的工作，然后离开/停止交互；检查 `docs/handoffs/` 下是否生成文件并覆盖预期字段；开新会话只读 handoff 看能否接着干。与做法 O、P 同一条会话先只加一个。

### 做法 R：用一条提示词重组 AGENTS.md
1. 前提：仓库里已有一个 AGENTS.md；准备一个可读写的 CODING_STANDARDS.md；使用支持子代理、且能创建 PR 的编程智能体；已配置 `/writing-for-agents`。若没有这个命令，直接把下面提示词原文粘贴给智能体。
2. 在项目根目录启动智能体，发送：
```text
/writing-for-agents 我的 AGENTS.md 简直一团乱麻，提出一系列重组方案，这些方案要：

- 移除空操作
- 使用渐进式披露
- 将指令移至 CODING_STANDARDS.md

将你的工作应用到三个子代理上，每个子代理都比前一个更激进。创建一个单一的 PR。

AGENTS.md
```
3. 让智能体按提示词自行派生三个子代理执行重组，最终汇总为一个 PR。原文没有说明三个子代理是并行还是串行，也没有定义“更激进”具体指什么。
4. 人工审查这个唯一 PR，决定采纳哪一版或如何合并；先备份、只产 PR、暂不合并。判断“更激进”有没有产生信息量：如果三份方案几乎一样，说明这个设计没有起作用。

### 做法 S：给 AGENTS.md 设一个长度预算（200 行 / 32 KiB）
1. 前提：使用 Codex 或 Claude Code；项目里已有或准备新建 AGENTS.md；能在项目根目录跑 wc；准备一个近期 1–2 周会持续使用的项目。
2. 量现状：`wc -l AGENTS.md`、`wc -c AGENTS.md`。前者对应 200 行以内，后者对应 Codex 默认最多读取 32 KiB。中文内容按字节算更容易先撞 32 KiB 线，两条命令都要跑。
3. 判断撞的是哪条线。原文给的两个阈值来源不同：Claude Code 是文档建议 200 行以内；Codex 是默认最多读取 32 KiB、超出被跳过。200 行通常更紧。这一步是推算，原文没有直接比较两条限制。
4. 精简内容。原文只说强烈推荐精简，没有给出具体删减或拆分方法。可以借用做法 R 的重组提示词，或用法 X 先找出真正造成返工的规则再删改。
5. 建立复查动作：每次修改 AGENTS.md 后重跑两条命令，把长度当配额管。原文在关键处截断，读取顺序、叠加规则、超限后的确切行为、是否支持按目录分层加载都未展开；照做前先回官方文档确认。
6. 只改 AGENTS.md 这一个变量做前后对比；记录规则违反次数、重复纠正次数、需要人工介入的回合数、任务一次通过率。

### 做法 T：调低自动压缩阈值（autoCompactWindow 从 1M 到 400k，先小范围试）
1. 前提：Claude Code 可用；额度按周统计；原文提到的参数名是 autoCompactWindow；你能够自己核对它属于配置文件字段、环境变量还是启动参数。原文没有给出写入方式，核对不到就不要照做。
2. 在设置/环境变量/官方文档中查找与自动压缩阈值相关的项。把阈值从默认 1M 改成 400k。原文只给参数名与目标值，写法需按你的版本核对，下面只是示意，不是原文给出的命令：`autoCompactWindow: 400k`。
3. 确认生效方式；原文没有说明改完是否需要重启会话或新开会话才生效。保持其他变量不变：同一模型、同一类任务、同一使用强度。
4. 记录基线：先用默认值 1M 按原强度用满一周，或用同一组固定任务反复跑。切到 400k 再记录一周；用同一口径记录额度消耗，并留意长会话中是否频繁丢失前文。
5. 只有额度明显下降 + 上下文返工没有明显上升时，才保留这个设置。与做法 N 的关系：N 给百分比（95%→60%），T 给窗口大小（1M→400k）；材料没有说明它们是不是同一个设置、能否同时设置；同一条会话先只改一项。

### 做法 U：先验证子代理缓存是不是真的过期（subagentPromptCacheTtl，study / 小范围试）
1. 前提：已在使用 Claude Code，且工作流里确实会调用子代理；有修改该配置项的权限；能观测 token 消耗、费用或缓存命中；子代理调用之间确实经常出现超过 5 分钟的空闲。
2. 先不改配置。跑一个会调用子代理的固定任务，记录第一次调用的 token 用量与费用。让该子代理闲置 6 分钟以上，确保跨过 5 分钟阈值，然后跑完全相同的第二轮，记录 token 用量与费用。如果第二轮 token 本来就没有明显上涨，说明你的工作流不存在 5 分钟闲置问题，可以直接放弃。
3. 只有第 2 步确实观察到暴涨，再去 Claude Code 官方文档核对这个设置项是否存在、合法取值是什么、写在哪里。原文提到的设置名原样如下，注意原文在此处截断：`subagentPromptCacheTtl`。推文给出的目标是把窗口延长到一小时，以秒计约等于 3600，但这只是推文说法，取值必须以上述官方文档为准。
4. 核对不到这个设置项时，本节降级为知道有这回事的 study 级线索，不要照做。确认文档里存在该配置项且取值合法后，在项目级或用户级配置中写入；原文没有说明生效方式，是否需要重启 Claude Code 需自行确认。
5. 重复第 2 步完全相同的流程，对比两轮 token 用量与费用。这一步必须同时检查输出质量：缓存命中的上下文是否与重建出来的等价；如果结果质量下降，或出现陈旧上下文导致的错误，说明省下的 token 是以正确性为代价，不应采用。只有第二轮 token 明显下降 + 输出质量不变时，才把这个配置固化进基线配置。不要和做法 N 的 60%、做法 T 的 400k 一起改。

### 做法 V：专用文件夹 + 根目录 CLAUDE.md 固化规则（study / 小范围试）
1. 前提：本机装有 Claude Code；能在本机新建文件夹；能在该文件夹里启动 Claude Code；愿意先拿一个测试文件夹试。
2. 新建一个专用文件夹。原文称这将是代理唯一能看到的世界；注意这只是一种说法，原文没有给出实现机制。在这个文件夹里面启动 Claude Code。预期会话的工作目录就是这个文件夹。原文到这一步为止是完整的。
3. 在该文件夹根目录放一份 CLAUDE.md，里面写你的规则。原文称它会加载到每一个会话中。原文没有给出 CLAUDE.md 的内容示例，可以先用一条你原本每次会话都会重复粘贴的规则来验证。
4. 验证自动加载：连续开 3–5 个新会话，看这条规则是不是每次都自动生效、是否还需要重复粘贴。这是本条做法里唯一能直接观察的一步。
5. 单独验证权限边界（本手册补的，不是原文给的）：原文称代理只能看到这个文件夹，但没有给出实现方式。在确认之前不要把它当隔离手段。可以试着让 agent 读取该文件夹之外的文件，看是否被拦、以什么方式被拦。
6. 同时看上下文成本：根目录的 CLAUDE.md 会进入每个会话，按做法 S 用 `wc -l` / `wc -c` 量长度，按做法 N 用 `/context` 看它占了多少 token。只有当规则确实在每个新会话里自动生效之后，再考虑用到真实项目上；权限隔离确认不了，就只把它当作规则集中 + 减少重复粘贴。

### 做法 W：按触发条件增量配置 CLAUDE.md（同一约定两次被违反才写入，保持 200 行以内）
1. 前提：使用 Claude Code；项目里存在需要长期遵守的约定；愿意记录 Claude 实际违反了哪些约定、各违反了几次；能检查 CLAUDE.md 行数。原文没有给出检查频率，需自行定一个固定复查点。
2. 第一天不要建全量配置。先让 Claude 在真实任务中工作，观察它实际违反哪些约定。记录基线：把约定内容、违反次数、在哪个任务里违反记下来；不要凭印象直接把所有规则写进 CLAUDE.md。
3. 只有当同一约定累计第二次被违反时，才把该约定写入 CLAUDE.md。原文规则可照抄为检查条件：Claude 两次违反约定？就放到这里。预期：CLAUDE.md 里只沉淀真正反复出问题的规则。
4. 写入 CLAUDE.md 的内容定位为始终开启的规则，不要把它当成按需加载的资料库。按原文要求把 CLAUDE.md 保持在 200 行以下。可定期检查：`wc -l CLAUDE.md`。预期行数低于 200。
5. 不要同时添加其他未给出触发条件的配置。原文只展开到 `01 CLAUDE.md`，`02 Skills` 被截断；没有足够信息时不要根据这条材料补写 Skills 步骤。观察同类约定第三次违反是否减少、因规则缺失导致的重复纠正次数是否下降、CLAUDE.md 是否始终低于 200 行、是否出现为了少写而漏写关键规则。

### 做法 X：回看历史会话，定位 AGENTS.md 里真正造成返工的指令（study / 小范围试）
1. 前提：你在用 Codex 或同类能回看历史会话的智能体；已经存在一份 AGENTS.md 或等价的持久化指令文件；已经积累一定数量的真实会话；先备份当前 AGENTS.md，保留修改前后版本。
2. 在新会话里原样贴入下面这条 prompt：
```text
查看我最近的 Codex 会话，找出一条似乎误导了智能体或导致不必要工作的 AGENTS.md 指令，并选出发生该问题时的原始用户提示词。
```
3. 阅读输出，确认它给出的是指令 + 当时用户提示词这一对证据，而不只是泛泛的改进建议。若只给了建议、没给原始提示词，按原文要求追问。
4. 人工裁决这一条指令：删掉、改窄适用范围、还是补上前置条件。这一步原文没有给 prompt，必须由人完成；不要直接把模型的改写版覆盖进 AGENTS.md。
5. 只改这一条，保留修改前后版本。修改后在新会话里重跑同类任务，看是否还会被同一条指令带偏；若仍复发，回退并换一种改法。若两周内同类返工仍反复出现，说明定位到的指令不是根因，应换一条再试，而不是继续加规则。

### 做法 Y：按目录分层放置 CLAUDE.md，把局部规则放到对应文件夹（study / 小范围试）
1. 前提：知识库已经按目录组织；目录职责相对稳定；AI 工具支持读取目录级 CLAUDE.md；能从目标目录启动或指定任务；先备份现有根级 CLAUDE.md。
2. 先做最小验证：选一个边界清楚的目录（例如日记目录或研究资料目录），只加一条最容易观察的局部规则，例如只读，不总结或每个声明都链接到其源笔记。若工具根本不读取局部文件，后面不用做。
3. 在库根目录保留根级 CLAUDE.md，只放适用于整个库的规则。在需要差异规则的文件夹新增 CLAUDE.md。示例：
```markdown
50_daily/CLAUDE.md
私人日记。只读。除非我要求，否则永不总结。

projects/newsletter/CLAUDE.md
受众、语气、格式。永不编辑过去的期数。

research/CLAUDE.md
每个声明都链接到其源笔记。
```
4. 让 AI 在目标目录上下文中工作：从目标文件夹启动或指定任务，或确认工具会向上查找规则文件。如果工具不会按目录读取，这条做法不会生效。
5. 局部规则只写该目录真正需要的约束：读取边界（只读、不总结）、编辑边界（不编辑过去的期数）、引用规范（声明链接到源笔记）。
6. 处理规则冲突和维护。原文没有说明根规则与局部规则冲突时谁优先，也没有维护流程。试用时需自行约定：局部规则是否覆盖根规则、过期规则如何删除、新增文件夹是否必须补局部规则；先记录约定，不要假设。
7. 先在一个目录跑 3–5 个真实小任务。记录规则违反次数、人工纠正次数、输出可用率、引用覆盖率、跨目录一致性。若工具无法稳定读取局部 CLAUDE.md，或规则违反次数没有下降，不扩大使用。

### 做法 Z：用 nomore 规则包 + CLI 把反复纠正的话固化成 CLAUDE.md 规则（preview / 小范围试）
1. 前提：已装 Claude Code；Node 20+；知道项目或全局 CLAUDE.md 在哪；本机能读到 Claude Code 会话记录，工具会遵循 CLAUDE_CONFIG_DIR；先备份 CLAUDE.md；选一个日常最常用的项目，试一周。
2. 先记录基线：连续 3–5 个会话，每次手动记下我又纠正了 Claude 什么，只记条数和原话。
3. 装规则包：`curl -fsSL https://raw.githubusercontent.com/globalmpc/nomore/main/rules/CLAUDE.md -o nomore-rules.md`。预期得到一份 20 条规则的 Markdown 快照。
4. 在已有的 CLAUDE.md 里加一行导入：`@nomore-rules.md`。若想对所有项目生效，把两个文件都放进 `~/.claude/`。注意重新下载会覆盖 `nomore-rules.md`；要长期保留自定义版本，改文件名后导入。
5. 逐条裁规则包：删掉你不认同的、与项目技术栈或团队约定冲突的，保留 10 条以内。
6. 先只读跑 CLI：`npx nomore`。预期扫描 30 天内活跃会话，列出你反复对 Claude 说的指令。CLI 是 preview，约三分之一建议才是真规则。
7. 只针对单个项目，逐条确认后才写入：`npx nomore --project .`。逐条 yes/no/edit，只接受这确实是长期偏好而不是任务词的条目。写入前先检查 CLAUDE.md 行数预算。要直接进入逐条确认写入时：`npx nomore --apply`。只看汇总数字时：`npx nomore --card`。
8. 之后一周正常干活，继续按同样方式记录纠正条数；周末用 `npx nomore --card` 记录总量趋势。若没有下降，停止扩大。

### 做法 AA：给代码注释加一条准入判据（单仓库试一周）
1. 前提：项目里已经有一个会被 agent 自动加载的指令文件（Claude Code 的 CLAUDE.md、或通用的 AGENTS.md）；agent 能对仓库做检索（grep / 读文件 / 跳转定义）；选一个中等规模仓库，保留前 5 个 PR 的同等长度基线；愿意跑一周或 5 个 PR。
2. 打开仓库根目录的 CLAUDE.md（没有就新建），加入下面这段规则。方括号处按团队情况改写；后半句 `delete the comment` 为按语义补全，原文截断。
```markdown
## Comments

After every code comment you write, ask yourself:
'Is this information the next Claude would spend multiple tool calls trying to understand?'
If the answer isn't clearly yes, delete the comment.

Keep comments that explain *why* (non-obvious constraints, workarounds,
external system quirks, surprising tradeoffs). Delete comments that restate *what*
the next line already says.
```
3. 给判据补两个本地化例子，例子要取自本仓库真实代码：
```markdown
Bad (delete): `// increment counter` above `counter += 1`
Good (keep): `// Stripe rejects idempotency keys older than 24h, so we rotate daily.`
```
4. 明确例外白名单并写进同一条规则：公共 API 的 docstring、生成代码的头部声明、许可证头、必须解释为什么的决策注释，不走这条删除判据。让规则在评审环节闭环：code review 时把无信息量注释和缺关键注释都当作可提意见项。
5. 只在一个中等规模仓库试一周或 5 个 PR，不叠加其他提示词改动，保留前 5 个 PR 基线。判断指标：注释密度下降；无效注释评论数下降；反向指标“这里为什么这么写？”类追问数、因看不懂导致的返工次数不上升；抽 10 个 PR 人工判断关键注释是否仍被保留。前两项下降且反向指标持平或下降才保留；反向指标明显上升，先补例外白名单与正反例再重测一轮。

### 做法 AB：审计并关闭 Claude Code 的隐藏后台摘要 side-query（agent_summary，Linux 小范围试）
1. 前提：原文实测平台为 Linux x64，Claude Code 版本 2.1.257–2.1.312；macOS 和 Windows 未测；需要能设置环境变量、重启 Claude Code daemon，并自行检查修改客户端运行时行为是否违反服务条款。
2. 先用 OpenTelemetry 量基线：按 query_source 分组 `claude_code.api_request` 事件，看 agent_summary 的请求数和花费份额。没有 OTel 时只能用日志和面板状态做弱验证。确认版本：`claude --version`，预期落在 2.1.257–2.1.312 区间内。
3. 把脚本下载到稳定路径：`curl -fsSL https://gist.githubusercontent.com/flamerix-ai/c3905705cc4205e5de3011fa2e74efce/raw/no-agent-summary.js -o ~/.local/share/no-agent-summary.js`。
4. 最小试用时，只在当前 shell 注入 preload：`export BUN_OPTIONS='${BUN_OPTIONS:+$BUN_OPTIONS} --preload $HOME/.local/share/no-agent-summary.js'`。这里用单引号示意，实际要让变量展开需按 shell 规则处理。
5. 重启 daemon 和所有已运行会话：`claude daemon stop --any`。早于环境变量启动的 daemon 会继续产生未挂钩会话。
6. 验证 preload 是否加载（路径必须是绝对路径）：`BUN_OPTIONS='--preload $HOME/.local/share/no-agent-summary.js' CC_AGENT_SUMMARY_LOG=/tmp/nas.log claude --version && cat /tmp/nas.log`。期望日志出现 `preload active mode=off`。
7. 验证摘要定时器是否被抑制：用同样的 BUN_OPTIONS 和 `CC_AGENT_SUMMARY_LOG=/tmp/nas.log`，运行一个后台子代理一到两分钟。日志应出现 `summary timer #1 suppressed (setTimeout, delay=30000)`，并且该 agent 的面板状态停止更新。查 OTel 时 `query_source = agent_summary` 应保持为 0。
8. 做一次 A/B 对照：设置 `CC_AGENT_SUMMARY_MODE=pass` 会加载 hook 但不过滤，摘要会回来；默认是 off。预期 pass 模式下摘要恢复，说明 off 的结果来自 hook。
9. 要永久化，可把同样的 export 写进 `~/.profile`、`~/.bashrc` 或 `~/.zshrc`。前提：每个启动 Claude Code 的进程都必须继承 BUN_OPTIONS，包括 `claude -p`、cron、CI 和编辑器集成。每次升级 Claude Code 后重跑第 6、7 步。原文的失败模式是 fail-open：更新可能重命名日志行或 query-source id、用 `fn.bind(...)` 包装回调、把字符串移到回调外的共享常量，或把定时器移到 `timers/promises`、scheduler loop 等未包裹 API。回滚：移除 BUN_OPTIONS 并重启 daemon。面板状态停止更新、SDK task_progress 没有 summary 属预期；子代理、后台代理、forked skills 和后台会话仍应正常运行。

### 做法 AC：把能力放 skills、知识放 docs/、AGENTS.md 只做条件路由（小范围试）
1. 前提：已有团队内部开发用的 harness；skills、docs/、AGENTS.md 可编辑；先备份；能确认或定义 OKF 格式；文档路径稳定、触发条件可枚举；选一个仓库或一条流程，准备同一批任务做前后对比。
2. 盘点现有内容，按问题二分：能执行动作/能力的归入 skills；属于事实、规范、背景知识的移出 skills。原文原话是区分“我能做”和“我知道”。
3. 把“我知道”类内容整理到对应 docs/ 文件夹。原文称文档格式为 OKF，但没有说明 OKF 的具体定义和模板；不要编造格式，先确认团队已有约定，或先定义一个最小模板再迁移。
4. 把 AGENTS.md 改写成条件路由规则集，表达为“如果 X，就看文档 Y”。前提是文档路径稳定、触发条件可枚举，否则规则会失效。让 AI 在实际任务中按 AGENTS.md 条件查 docs/，skills 只保留可执行能力。
5. 用同一批任务对比改造前后：任务一次通过率、人工纠正次数、AI 找错/漏查文档次数、完成同样任务所需上下文长度或查阅轮次、维护者更新文档的时间。只有当不劣于原 harness 且维护成本可接受时，才扩大到一个以上仓库/流程。

### 做法 AD：让 Claude Code 读笔记库，生成 CLAUDE.md 初稿（小范围试）
1. 前提：本地有 Obsidian 笔记库或结构稳定的目录；已安装并可运行 Claude Code；允许 Claude Code 读取该目录；先备份或使用版本控制；选一个非敏感的小型笔记库副本。
2. 在笔记库根目录打开终端，并在该目录内启动 Claude Code。预期会话工作目录就是 vault 根目录。输入原文提示词：
```text
read my vault and write a CLAUDE.md describing my folders, linking style and naming rules
```
预期生成一份 CLAUDE.md 初稿，覆盖文件夹、链接风格、命名规则三类信息。原文没有展示生成后的 CLAUDE.md 样例。
3. 人工检查生成的 CLAUDE.md，修改它写错的地方。原文只要求 `edit what it gets wrong`，没有给出检查清单。可按三类逐项核对：漏了哪些目录、链接风格判断是否正确、命名规则是否正确；记录错误类型和修改条数。
4. 原文在 `add one line:` 处截断，无法确定要添加哪一行。试用时不要把这一步当作已验证步骤。把生成并校正后的 CLAUDE.md 当作候选上下文文件：按做法 S 用 `wc -l` / `wc -c` 量长度，按做法 N 用 `/context` 看它占多少 token，按做法 M 审内容是否过时，按做法 Y 判断是否需要按目录分层。
5. 验证：用同一批涉及库结构的问题或任务，对比生成前后 Claude Code 回答的错误率；抽样新笔记的命名与链接是否符合规则；记录人工修改条数、修改耗时、目录覆盖率、规则条目准确率。

### 做法 AE：把不重复读文件和五步以上先落计划写进 AGENTS.md（先小范围试）
1. 前提：确认你的工具确实读取并遵循 AGENTS.md。先备份现有 AGENTS.md，并准备同一类长任务做前后对比。
2. 在仓库根目录创建或打开 AGENTS.md。若已存在，把两条规则追加到合适位置（例如工作方式 / Workflow 一节），不要覆盖已有内容。原样粘贴第一条规则：
```text
Don't re-read a file you've already read this session unless it changed.
```
3. 第二条规则的原文在 `so a crash or a compaction never` 处截断。下面是原文可见部分，末尾需要你按语义补全（补全部分不是原文）：
```text
On any task over five steps, write the plan to a file first and update it after each step, so a crash or a compaction never
```
可补成完整句（此为自行补全的建议，非原文）：
```text
On any task over five steps, write the plan to a file first and update it after each step, so a crash or a compaction never loses the plan. Keep the plan file up to date as the single source of truth for progress.
```
4. 可选（原文未给）：在 AGENTS.md 里把计划文件位置固定下来，例如 `PLAN.md`，让多个会话和人都看同一份。这属于配套约定，不是原文内容。补一条与 `unless it changed` 配套的限定，否则会读到旧内容：文件被外部改动、或本轮被别的进程/工具改过时必须重读。原文没有说明如何检测变化，这一步是本手册补的。
5. 提交 AGENTS.md，让团队和后续会话继承同一套约束。与做法 J 的差异：J 用 hook 每回合注入 active-plan，有 gated 完成门槛和三文件结构，约束更强；AE 只是 AGENTS.md 里的一条常驻规则，没有注入机制、没有完成门槛，靠代理自觉。要强约束用 J，要零成本先用 AE。
6. 最小试用：选一个步骤明显超过五步的真实任务（跨多文件重构或加一个带测试的功能），先不加规则跑一次作基线，再按第 2、3 步加规则跑同类任务 2–3 次。任务、模型、工具版本尽量保持一致。与 S/M/W/X 的关系：AE 加的是规则内容，会占用 AGENTS.md 的行数与字节数，加完按做法 S 重跑 `wc -l` / `wc -c`；按做法 M 定期审这两条还适不适用；按做法 W 的触发条件判断要不要继续加规则；按做法 X 用历史会话验证这两条是否真的减少了返工。一次只加一个变量。

### 做法 AF：用 devilop 的产品地图、界面草稿和检查状态给编码代理供上下文（小范围试）
1. 确认 Node 版本：`node --version`。预期 Node.js 22+。以下命令均在项目文件夹内执行，`<devilop>` 指 devilop 安装目录。
2. 启动 devilop（源码检出方式）：`git clone https://github.com/mathew5612/mycel.git devilop`；`cd devilop`；`node devilop.mjs open`。启动后在后台运行并打开 `http://127.0.0.1:4317`。Windows 可双击 `devilop.cmd`；macOS 双击 `devilop.command`（先 `chmod +x devilop.command`）。
3. 在你的项目文件夹里打开代理，给它这一行：`Read the devilop guide and follow it: curl -s http://127.0.0.1:4317/agent`。Windows PowerShell 把 curl 换成 curl.exe。预期代理在同一次对话里连上文件夹并建图。
4. 建立回传到当前对话的通道（不同客户端方式不同）：`node <devilop>/devilop.mjs current connect --client codex`。Claude Code 与 Cursor 用其 MCP 连接上的 `devilop_connect`。Claude 还需会话级 channel 同意与组织策略许可；若原会话启动时未支持 channel，只能交互式恢复该确切会话：`claude --resume <exact-session-id> --dangerously-load-development-channels server:devilop`。不要为绕过同意另开第二个对话。
5. 连接项目并建图（代理侧常用命令）：`node devilop.mjs init`；`node devilop.mjs context --brief`；`node devilop.mjs build map.json`；`node devilop.mjs apply ops.json`；`node devilop.mjs wait`。
6. 手工编辑地图：空白处右键建块/笔记，块上右键建子块；从块任意边缘拖连线（Alt+拖可从块内任意位置起）；双击带子图的块下钻，Esc 返回；底部滑块按层级折叠地图。
7. 绑定并编辑真实界面：选中带 app binding 的块，视图显示相关页面、区域与预置状态；切到 Edit，选元素改文本、受支持的外观或同级顺序。草稿留在地图上，直到 Finish edits 才交给代理应用到源码并检查。界面尚未建好的块保持 planned。
8. 用 Requests 字段把需求写进批次：在块的 Requests 里写期望行为、约束与示例，Save 后留在批次中直到 Finish edits；你后续的新编辑与 Requests 不会被代理覆盖。
9. Finish edits 交付：保存为一个版本化不可变包，唤醒已连接的代理（忙则排队到下一轮）。你可以立刻继续编辑。代理若提出改动，以虚线高亮覆盖层显示，由你 Accept / Reject。
10. 让代理汇报进度、跑检查：`node devilop.mjs doing 'reading server.mjs' --progress 40`；`node devilop.mjs mark cart passed`；`node devilop.mjs check`；`node devilop.mjs watch`；`node devilop.mjs health`；`node devilop.mjs current status`。
11. 可选：独立受管代理（不是你当前对话，需要显式选择），在已连接的项目文件夹内保持进程运行：`node <devilop>/devilop.mjs run --client codex --bind`；装了 ACP 版 CLI 的 Cursor：`node <devilop>/devilop.mjs run --client cursor --bind`。Ctrl+C 停止。
12. 其他客户端接入：`node <devilop>/devilop.mjs setup --agent codex|claude|cursor --install --hooks`；`node <devilop>/devilop.mjs setup --agent <name>`；`node <devilop>/devilop.mjs chat`；`node devilop tools --format openai|mcp`；`node devilop call <tool> '<json>'`。
13. 虚拟机（VMware/VirtualBox/Hyper-V/WSL）里的代理用主机上的 devilop：主机执行 `node devilop.mjs remote on`；VM 内执行 `curl -fsS http://<host address>:4317/install.sh | sh`。会按需装 Node.js 与一份 devilop，并申请 4 位码；主机核对后在 devilop 里点 Allow。
14. 自测与更新：`node --test test/*.test.mjs`；源码检出用 `git pull` 后 `node devilop.mjs open`，旧版本同数据运行时会自动重启，`.devilop/` 不受影响。

安全前提：API 写入需 `.devilop/token`；VM 访问默认关闭；扫描与本地助手跳过 `.env`、密钥与证书。小范围试用建议：先在一个非关键项目里跑通启动 → 连接项目 → 建图 → 改一处界面草稿 → Finish edits → 让代理跑 check/health；不要一上来把整个产品所有界面都绑定。

### 做法 AG：用 /init 生成 AGENTS.md 初稿，再按四类信息补全（小范围试）
1. 前提：有一个本地代码仓库，工作区干净或已备份；已安装并使用 Codex CLI、Claude Code 或 Gemini CLI 中的任意一个。
2. 在该项目根目录启动会话，输入：`/init`。预期由工具自动生成 AGENTS.md。原文未说明 `/init` 在不同工具下行为是否一致，换工具时要重跑一次确认。
3. 人工校对并补全生成结果，确保四类信息都在：技术栈、代码风格、开发规范、禁区。原文没有给出 AGENTS.md 模板或字段示例，这四类只是内容项，具体写法按自己项目填。
4. 把 AGENTS.md 提交进仓库，让团队成员和后续会话都读到同一份规则。
5. 换用其他 AI 编码工具时先沿用同一个 AGENTS.md，不重写规则；但先按做法 L 的验证方式放一条一眼可验的规则，用同一个日常任务在第二个工具里跑，确认它真的读到了。
6. 生成完先量长度：`wc -l AGENTS.md`、`wc -c AGENTS.md`，按做法 S 把 200 行 / 32 KiB 当配额管。超了先按做法 R 重组结构，按做法 X 用历史会话找出真正造成返工的规则再删改。
7. 后续新增规则按做法 W 的触发条件走：同一约定累计两次被违反才写进去。知识类内容按做法 AC 迁到 docs/ 并把 AGENTS.md 改成“如果 X 就看文档 Y”的条件路由。
8. 与做法 L 的差异：L 解决文件放哪、怎么共用；AG 解决从零有没有这份文件、里面写什么。与做法 AE 的关系：AE 是往已有 AGENTS.md 里追加两条成本极低的常驻规则；AG 是建立这份文件的骨架。与做法 AP 的关系：AP 用五层结构把 AGENTS.md、skills、hooks、docs 和局部 CLAUDE.md 放到同一张图上；AG 只负责入口文件初稿。

### 做法 AH：把不要臆测性加防御、加防护前先说明并等确认写进 AGENTS.md（先小范围试）
1. 前提：项目使用支持 AGENTS.md 或类似项目级指令文件的编码代理；任务以代码修改为主；团队愿意在代理提出额外防护时人工确认。
2. 在仓库根目录创建或打开 AGENTS.md。若已有规则，把下面这条放到通用规则/改动范围部分，避免与其他规则冲突。原样复制：
```markdown
不要去猜测几乎不会发生的竞态、边界问题，额外增加复杂度。真要加防护，先说清楚会怎么出错、概率多大、增加多少代码，我同意之后再做，不许私自扩大改动范围。
```
3. 任务开始时明确要求代理先读 AGENTS.md，并在计划中说明是否触发该规则：
```text
先阅读仓库根目录 AGENTS.md。若你认为需要增加竞态/边界防护，先按 AGENTS.md 的规则说明出错场景、发生概率和预计代码增量，等我确认后再改；不要直接扩大改动范围。
```
4. 审查每次 diff：是否出现未被需求要求的防护分支、重试、锁、异常包装；是否修改了任务范围外的文件。出现就要求代理回退并重新说明理由。
5. 团队复用时把这条规则放进项目级 AGENTS.md，不要只放在一次性对话里。原文没有完整 AGENTS.md 模板，只复用这一条。
6. 与做法 AE 的差异：AE 是两条工作方式规则，AH 是改动范围与防御性代码的审批约束；两者都写进 AGENTS.md，但可以分开试。与做法 AG 的关系：AG 建立文件骨架和四类信息，AH 是其中禁区/开发规范的一条具体规则。与 S/W/X 的关系：加完按 S 量长度，按 W 的触发条件决定是否保留，按 X 用历史会话验证是否真的减少返工。

### 做法 AI：用 /doctor prompt-audit 给规则文件做一次全局体检（study / 小范围试）
1. 前提：本机已安装 Claude Code。原文要求升级到 v2.1.283 或更高：`claude update`。原文未给版本核对命令；本手册补：用 `claude --version` 确认已到 v2.1.283 以上。若命令不存在或版本对不上，先停下。
2. 进入一个已有规则文件的项目目录——至少要有 CLAUDE.md、AGENTS.md、.claude/ 中的一项，否则审计对象为空。在该项目里打开 Claude Code 会话。
3. 在会话中运行：`/doctor prompt-audit`。按原文，它会读取项目里的 CLAUDE.md、AGENTS.md、.claude/，以及用户级 `~/.claude/` 中的规则、技能和命令。预期是给出一份审计输出；材料没有输出样例，第一次跑时把完整输出原样保存。
4. 原文第 4 步起截断，没有说明如何解读结果、如何逐条修正、修正后如何复跑。以下是本手册补的试用方式，不是原文：把每条输出标成可执行建议 / 泛泛而谈 / 误报。只挑一条可执行建议去改规则文件，一次只改一条。
5. 改完再跑同一命令，看同一个问题是否不再出现、是否出现新问题。不要因为跑过一次审计就认为规则已经改好；判断标准是复跑时重复指出的问题条数下降、规则文件变短或去重。
6. 若命令不被识别，或输出只有笼统套话、无法定位到具体规则条目，停止使用；降级为定期人工审查 CLAUDE.md/AGENTS.md/.claude 里的过时、重复、冲突规则这一原则。
7. 与其他做法的关系：AI 是体检，M 是审旧提示习惯，S 是量长度，N 是看 token 占比，W 是控制新增，X 是用历史会话验证返工；AI 不替代其中任何一项。与 AG 的差异：AG 从零建 AGENTS.md，AI 是在已有规则上做体检。材料没有说明 AI 与 M 两条 prompt-audit 命令是否同一套实现、能否同时运行；先只跑一条。

### 做法 AJ：在 AGENTS.md 加先 grep 再局部读取，减少整文件读入（小范围试）
1. 前提：已使用 Claude Code；项目里有 AGENTS.md（没有就新建）；选一个含较大文件的仓库；准备 3–5 个典型任务，例如这个函数在哪里被调用、修改某处的错误处理、解释某个模块的入口逻辑；能查看 token 用量或至少记录工具调用次数；用新会话避免上下文污染；先备份 AGENTS.md。
2. 打开项目里的 AGENTS.md，新增一节，把原文给出的完整规则原样写进去：
```markdown
## Save context
- Before reading a whole file, grep first and only read the parts you need.
```
3. 如果想用中文表达同一条指令，可写成（语义等价，非原文）：
```markdown
## 节省上下文
- 读取整个文件前，先用 grep 定位，只读需要的部分。
```
4. 保存后，在新会话里让 Claude Code 处理一个涉及较大文件的任务，观察它是否先搜索再局部读取。不要猜测补全原文缺失的第二条规则；如需理解整个项目的规则，请自行设计并单独验证。
5. 做对照：复制一份 AGENTS.md 作为对照，仅在实验组加入上面那条规则。准备 3–5 个典型任务，分别在加规则前后各跑一遍，使用新会话。记录每次的 token 用量、工具调用次数、任务是否一次做对、需要人工追加“你没看到某文件”这类纠正的次数、单任务往返轮次与耗时。
6. 判定：若 token 明显下降且正确率持平或上升，可保留该规则；若出现漏读导致的错误增加，则把规则收窄为仅在文件超过某行数时先 grep。需要通读全文的任务（整体重构、文档校对）可能反而需要完整读取；PDF、图片、二进制等非文本仓库中 grep first 未必成立。
7. 与 AE 的差异：AE 管不重复读和五步以上先落计划，AJ 管读之前先检索定位；两者都写进 AGENTS.md，可以分开试。与 S/W/X 的关系：AJ 加完会占用 AGENTS.md 行数与字节数，按 S 跑 `wc -l` / `wc -c`；按 W 的触发条件决定是否保留；按 X 用历史会话验证是否真的减少返工。一次只加一个变量。

### 做法 AK：用独立项目目录 + AGENTS.md 入口 + 规则/文档文件夹 + 读-做-写决策记录管理多客户/多项目上下文（小范围试）
1. 为每个客户/项目建立独立工作目录和身份。为每个客户创建独立的系统用户或至少独立的项目根目录。评论者 mceachen 建议：If you have separate clients, I would use a different username/login for each client so session transcripts (like in ~/.claude/...) are segregated. 在每个项目根目录放置 AGENTS.md（或 CLAUDE.md）作为入口文件。该文件只放最小必要信息和到详细文件的链接，避免臃肿。如果使用 Claude Code，可以在项目目录下通过 `claude` 启动，会话记录会自然按目录隔离。
2. 用规则文件夹和文档文件夹组织项目特定上下文。参考结构：
```text
project/
  AGENTS.md
  rules/
    forms-and-dialogs.md
    roles.md
  docs/
    idea/
    plan/
    review/
```
在 AGENTS.md 中写入：
```text
在做任何任务前，先阅读 rules/ 下与任务相关的文件。
新功能或修复的文档写入 docs/idea/、docs/plan/ 或 docs/review/。
```
代理在新功能或 bug 修复中持续更新 rules/；docs/ 分为 idea/、plan/、review/，在实现新功能时创建对应文档。
3. 实施读-做-写循环与决策记录。每轮任务开始时，提示代理：`Read the relevant previous notes in knowledge/ before starting.` 任务结束时，提示代理：
```text
请回顾本轮工作，总结关键发现和决策。将每个决策写成 knowledge/decisions/<date>-<slug>.md，包含：
- 标题
- 状态：approved / rejected / failed
- 背景
- 决策内容
- 后果
然后更新 knowledge/summary.md 的索引。
```
下一轮任务开始时，让代理先读这些决策记录，避免重复被拒绝的方法。评论者 ksajadi 使用该循环 14 个月，维护通用知识和项目特定知识；每个决策有元数据 approved、rejected、failed。
4. 维护主索引文件以加速冷启动。在项目根目录创建 INDEX.md，列出关键文件和一句话说明，例如：
```text
| 文件 | 说明 |
|------|------|
| src/auth.js | 认证逻辑 |
| rules/roles.md | 用户角色规则 |
| docs/plan.md | 当前实现计划 |
```
在 AGENTS.md 中指示：开始新会话时，先读 INDEX.md。评论者 lp92 维护 master index document listing every file along with a brief overview，能显著减少新会话扫描时间。
5. 用 Git 提交纪律保持上下文精简。要求代理在每个实现回合结束时提交（可以是一个或多个 commit），并保持工作树干净。在 AGENTS.md 中明确：每个实现回合必须以 git commit 结束，且 git status 干净。评论者 synapsomorphy 建议：The minimal delta is a commit. Every implementation turn must end with one or multiple, and a clean worktree. 这使上下文可以随时从提交历史恢复，减少对长篇聊天记录的依赖。
6. 可选：使用 ADR 目录记录架构决策。创建 adr/ 目录并加入 .gitignore（如果不想提交）。提示代理：在做出重大架构决策前，先写一个 ADR 到 adr/，格式：标题、状态、背景、决策、后果。同时维护 STATUS.md 记录当前工作状态，新会话先读它。评论者 charlesabarnes 在所有仓库中使用 gitignored 的 ADR 目录，并维护一个 status doc 用于恢复。
7. 可选：用编号系统（如 Johnny.Decimal）统一组织和快速定位。设计一套编号方案（如领域.项目编号），为每个客户/项目分配唯一 ID；在 Obsidian 中为每个 ID 创建笔记，作为该项目的索引和共享记忆；磁盘上创建同名文件夹，放置 AGENTS.md 和项目文件；安装 jd CLI（或自己写一个简单脚本），运行 `jd <ID>` 切换目录并启动代理。评论者 jen729w 说整个设置大约需要半小时，且免费（MCP 服务付费）。
8. 可选：用外部工具管理会话记录和搜索。评论者 cmrx64 使用 cv（https://github.com/emberian/cv）来切割和搜索代理记录，在最近一次评估中节省了 40% 的 token。评论者 hyldmo 使用 farero.ai 将所有聊天存入 SQLite 数据库，并注入 MCP 工具让代理搜索历史决策。这些工具适合需要保留大量历史记录并跨会话搜索的场景；先评估 cv 等开源工具。

最小试用：先选一个最常用的项目，建独立目录和 AGENTS.md 入口；把项目特定规则拆到 rules/，把 idea/plan/review 拆到 docs/；让代理在结束任务时写一条决策记录并在下一轮先读；加一个 INDEX.md；要求每个实现回合 commit 并保持工作树干净。跑 1–2 周，观察重复解释次数、新会话冷启动时间、决策复用次数、上下文串味次数。

### 做法 AL：指令文件与现有代码冲突时，跟随代码并逐条报告不一致（先小范围试）
1. 确定要写入的文件路径（用户级，全局生效）：Claude Code 用 `~/.claude/CLAUDE.md`；Codex 用 `~/.codex/AGENTS.md`。前提：已安装对应工具且使用其用户级配置；目录不存在时先创建：
```bash
mkdir -p ~/.claude ~/.codex
```
2. 把规则写进文件。原文能确认的片段只有：
```text
When an instruction file and the existing code disagree, follow the conventions
```
原文到此为止，后半句（依现有代码约定执行的收尾与报告每处不一致的措辞）未采到。若要落地，需要自行补全，例如补成下面这句——这句补全是推断，不是原文，写入前请按自己的语言习惯改写，并保留“跟随代码 + 逐条报告”两个要点不变：
```text
When an instruction file and the existing code disagree, follow the conventions
of the existing code, and report every mismatch you find instead of silently
rewriting the code.
```
3. 确认写入位置符合使用场景。放在用户级文件意味着对所有仓库生效；如果只在特定仓库需要这条规则，应改为写进该仓库的 CLAUDE.md / AGENTS.md，并纳入版本控制。前提：团队协作场景下，用户级私有配置不会同步给他人。
4. 给规则留例外。某些仓库的指令文件恰恰是用来纠正代码中的坏味道的（例如“新代码一律用类型标注”），此时“跟随代码”会产生反效果。若你的项目属于这种，把规则改成项目级，并显式写一句“指令文件明确要求纠正的坏味道不适用本条”。
5. 验证规则确实被读到：找一处指令文件写了一种风格、仓库代码实际是另一种风格的地方，让智能体做一次小改动，观察它是否按现有代码风格输出，并在回复里列出不一致点。前提：改动要小且可回滚（先提交或 stash）。
6. 记录指标后再决定是否保留：见“怎么判断变好了”中 AL 一节。

### 做法 AM：用一条巡检提示词找出指令文件里的过时行和只写在散文里的硬规则（先小范围试）
1. 前提：目标仓库有 agent 指令文件，例如 CLAUDE.md（含本地和导入的）以及 `.claude/rules` 等；操作者能读取这些文件；使用能读取仓库文件的 coding agent，并设置为只读或要求任何修改前人工批准；先备份。
2. 将原文已给出的提示词交给 agent；由于原文截断，复用前需补全 `<find>` 中的完整文件范围和输出要求：
```text
<task>
Find the stale lines in this repo's agent instruction files, and the rules that must never break but only live in prose. Change nothing until I approve.
</task>

<find>
List every instruction file: every CLAUDE.md, including the local and imported ones, .claude/rules,
```
（原文到此截断，需补全扫描范围后再运行。）
3. 让 agent 先输出清单，不改文件；按原文要求列出每个指令文件，并分别标出疑似过时行和只存在于散文中的硬规则。原文未规定输出格式，试用时建议至少包含：文件名、位置、原文摘录、判断原因、建议动作（保留/改写/删除/提升为明确规则）。
4. 人工审核清单，只批准确实需要修改的条目；未批准前保持 `Change nothing`。若输出只有泛泛建议、无法定位到具体行，退回让 agent 重列。
5. 批准后再让 agent 执行修改，并复查改动是否严格对应清单；原文只说了 approve，未展开修改流程。先只改一条，复跑同一提示词，看同类问题是否减少。
6. 与做法 AI、M 的关系：AI 用 `/doctor prompt-audit` 做命令式体检；M 用 `/claude-api prompt-audit` 审旧提示习惯；AM 是人工发起、只读扫描、逐条批准的巡检提示词。三者不互相替代，也不要同时改。

### 做法 AN：用 modern-web-guidance 把现代 Web 指南和现代化流程送进前端编码代理（小范围试）
**两条路线怎么选**
- 路线 A（官方 1.0 推荐，适合已在项目里装技能/插件、想做现有代码库现代化）：先 install 或 update，再让智能体执行 `/modern-web-guidance Modernize the code in this directory`；需要运行时验证时再配 Chrome DevTools for agents。
- 路线 B（零安装验证，适合先不装东西、用自有任务判断指南质量）：先跑 `search`、`retrieve`、`legacy-scan`，确认有用再 install。
- 如果只想先试一条最轻的命令，推文给的是 `npx modern-web-guidance`；但材料未说明它安装什么、写到哪里，执行前先建分支并审查 git diff。不要把推文的 56%→88% 当已验证。
1. 前提：本机有可用的 Node.js / npx；有一个前端代码库；有一个能接受外部文本上下文的编码智能体；能联网运行 `npx modern-web-guidance@latest`。先建独立分支或复制仓库，记录构建、测试、lint 基线，并选 3–5 个代表性任务或 PR。
2. 路线 A 安装：在项目根目录执行：
```bash
npx modern-web-guidance@latest install
```
预期把指南安装到你的智能体或项目配置中。原文没有给出支持哪些编码智能体、Node 版本要求、私有环境或离线可用性、指南更新频率；安装后先验证 agent 是否真的读到，并检查 git diff 有没有覆盖现有配置。
3. 已装旧版则更新：
```bash
npx modern-web-guidance@latest update
```
预期更新已有安装。原文没有说明更新是否会覆盖自定义规则；更新前先备份项目配置。
4. 让智能体做现有代码库现代化：在智能体会话中执行：
```text
/modern-web-guidance Modernize the code in this directory
```
预期流程会分析 HTML、CSS、JavaScript 和 package.json，寻找安全的现代化机会并引导智能体修改；1.0 先用静态分析覆盖有限模式，结果较可预测。只处理小范围目录或文件，人工审查 diff，运行构建和测试。
5. 可选运行时验证：与 Chrome DevTools for agents 配合。MWG 负责给出写法建议，DevTools for agents 负责运行、调试、性能追踪、动画录屏、减少动态偏好检查和内存检查。原文给出的搭配场景包括：低端 CPU 模拟性能追踪，迭代到长任务不超过 50ms；录制并检查弹窗/对话框动画及 prefers-reduced-motion；检查 SPA 视图缓存是否导致内存无界增长。
6. 路线 B 零安装检索：先不 install，确认指南库里有你要的东西：
```shell
npx modern-web-guidance@latest search 'animate a dialog modal backdrop'
```
预期返回相关指南的 ID 或列表。记录命中条数、是否覆盖你的任务。
7. 按上一步返回的 ID 取完整指南正文：
```shell
npx modern-web-guidance@latest retrieve 'animate-to-from-top-layer'
```
预期输出一份针对性指南，包含现代 Web 原语、浏览器兼容性数据和降级建议。把输出原样保存，作为后面注入 agent 上下文的材料。
8. 扫描现有代码库里的旧模式，得到可改造清单：
```shell
npx modern-web-guidance@latest legacy-scan .
```
预期输出一份哪些地方可以现代化的清单。记录命中点、命中类型；原文未说明判定规则来源和误报情况，先人工抽查。
9. 把指南送进智能体上下文。原文的机制描述是 CLI 把针对性指南直接返回进 agent 的 context window，但没有给出具体的提示词模板或配置文件格式；一种直接做法是把 retrieve 的输出贴进会话上下文或规则文件，再让 agent 动手（此步为操作推断，非原文步骤）。给 agent 的指令可以是：
```text
先阅读下面这份 modern-web-guidance 指南，再按它实现；如果目标浏览器不支持指南里的现代 API，给出轻量 fallback，不要直接上重 polyfill 或旧库。

<把 retrieve 的输出或现代 Web 建议粘贴在这里>
```
10. 让 agent 按指南实现时，同时要求它给出降级方案——原文明确把 Responsible Fallbacks 列为指南的三个重点之一：用轻量 fallback，而不是重 polyfill 或旧库。要求 agent 在回复里写清：用了哪个现代 API、哪些目标浏览器支持、降级路径是什么。
11. 团队 PR 评审场景：原文称 MetaMask 把 MWG 作为每个 PR 的自动评审机器人，配置为三行指令，但原文没有给出这三行指令原文；因此只能照做“自动 PR 评审”的思路，不能照抄其提示词。
12. 特性数量说法不一：当前材料一处为 250 项（CSS 140 / HTML 36 / JS 74），推文说 212 项；官方 1.0 公告未在材料中给出数量。不要用数量当验收标准，以实际 search/retrieve 命中与任务结果为准。
13. 最小试用：选一个小的前端任务（例如带动画的 dialog / popover），先让智能体裸做一次并留底；再用 search + retrieve 取到相关指南后重做，或在独立分支上 install 后执行 `/modern-web-guidance Modernize the code in this directory`；同时对代码库的一个子目录跑 legacy-scan，记下命中点。全程不装东西也能完成，install 放到确认有用之后。
14. 若可用 Chrome DevTools for agents，按第 5 步验证：低端 CPU 性能追踪看长任务是否不超过 50ms；录屏检查动画和 prefers-reduced-motion；检查 SPA 视图缓存内存是否无界增长；检查键盘焦点、表单可访问性等。只有相对基线有改善且无回归，才扩大范围。

### 做法 AO：用 pxpipe 把每轮重发的静态前缀改成图片计价（study / 小范围试）
1. 前提：已安装并登录 Claude Code；有一个可重复的对照任务（同一仓库快照、同一提示词、同一模型、同一轮数上限）；能读到 pxpipe 仓库 README 并按其说明安装；能在客户端与模型之间插入本地进程；能本地把文本渲染成清晰图片；能记录会话账单和输入 token。
2. 取得可信的安装方式：打开仓库 README，确认安装命令、支持的模型/客户端版本、是否需要在本地有图片渲染依赖。原文未给出，勿照搬推测命令。仓库链接原文断行为 github.com/teamchong/pxpi / pe，需自行补全为 https://github.com/teamchong/pxpipe 并以仓库 README 为准。
3. 以代理方式启动 Claude Code（原文唯一给出的可复制命令）：
```text
pxpipe warp -- claude
```
4. 确认拦截生效：观察代理输出/日志里是否报告被替换的静态块和折算后的视觉 token 数（作者称约 2,700/轮）。若日志里看不到替换记录，先别跑长会话。
5. 小额试跑：在一个短会话（几轮）上跑一次，确认对话、工具调用、文件读写都正常，再放大到真实任务。
6. 做对照：同一任务在原样 Claude Code 和 `pxpipe warp -- claude` 下各跑一次，模型与轮数上限保持一致。
7. 记录并判定（见“怎么判断变好了”中 AO 一节），决定是否固定为别名/包装脚本。原文未给出别名写法，需自己按 shell 习惯加。

### 做法 AP：用五层结构把 Claude Code 仓库组织成可导航的工作现场（小范围试）
适用形态：仓库结构乱，所有信息塞在提示或一个大文件里；重复流程靠每次重说；必须自动执行的动作（formatter、测试、敏感目录拦截）总被忘；高风险模块没有局部规则。原文把项目信息分成四类：why（系统做什么）、map（东西在哪里）、rules（允许/禁止什么）、workflows（工作如何完成），落到五个位置：根 CLAUDE.md、`.claude/skills/`、`.claude/hooks/`、`docs/`、关键模块局部 CLAUDE.md。核心主张是“提示是临时的，结构是永久的”，但原文只有结构建议，没有可直接复制的命令、hook 配置或提示词模板。
1. 前提：使用 Claude Code；仓库可版本控制；已有或愿意补测试、formatter 等可自动执行的动作；团队能约定目录、敏感目录和必须自动执行的动作；先在一个中等仓库试 1–2 周。
2. 写根 CLAUDE.md，并保持短。只放三块：Purpose（系统为何存在）、Repo map（项目如何组织）、Rules + commands（Claude 应如何操作）。作者主张文件太长会让模型错过关键信号，清晰比篇幅重要。根文件不要堆架构细节、ADR 全文或 runbook。
3. 建 `.claude/skills/`，把重复工作流做成可复用技能。原文示例：代码审查清单、重构 playbook、调试流程、发布流程。目标是让 Claude 快速切换专家模式，并让不同会话、不同成员得到更一致输出。只放稳定、可复用的流程，不要把它当知识库。
4. 建 `.claude/hooks/`，把必须总是自动发生的动作固化为 hooks。原文示例：编辑后运行 formatter；核心改动后触发测试；阻止敏感目录（auth、billing、migrations）。原文未给具体 hook 配置，需按 Claude Code 文档补齐；先只做一个 hook，确认它可靠触发且不误伤。
5. 建 `docs/` 存放渐进式上下文：架构概览、ADR（工程决策）、运维 runbook。不要把全部信息塞进提示，让 Claude 知道真相在哪里、按需导航。docs 的路径要稳定，否则条件路由会失效。
6. 在隐藏复杂度高的关键模块加局部 CLAUDE.md。原文示例：
```text
src/auth/CLAUDE.md
src/persistence/CLAUDE.md
infra/CLAUDE.md
```
让 Claude 进入这些危险区域时获得局部上下文，从而减少错误。局部文件只写模块特有风险，不要复制根文件规则。
7. 维护原则：CLAUDE.md 保持短；skills 只放稳定、可复用的流程；hooks 只放必须自动执行的动作；docs 作为可导航的事实源；局部文件只覆盖模块特有风险。
8. 最小试用：选一个中等规模、已有测试和 formatter 的仓库，试用一到两周。先写根 CLAUDE.md（只放目的、仓库地图、规则与命令，控制长度），选一个高频流程做成 skill，选一个必须自动执行的动作做成 hook（例如编辑后运行 formatter），再给一个高风险模块加局部 CLAUDE.md。用试用前后相同类型的任务做对照。
9. 与已有做法的关系：AP 是结构层，和 AG（从零生成入口文件）、S（长度预算）、R（重组结构）、AC（知识放 docs、AGENTS 做条件路由）、AH（改动范围约束）、AN（前端领域知识）互补；AP 不替代 N 的预算审计、W 的增量规则、X 的历史会话验证。AP 也不能替代测试、评审或安全审计。原文没有给配置模板和效果数据，先把五层结构搭起来，再逐层验证。

### 做法 AQ：用 PeerHarness 把反复纠正固化成团队投票规则（小范围试）
1. 前提：macOS 优先；Linux 只能终端；Windows 不支持；一个受支持的 agent，建议 Claude Code（唯一有 hook 的）；需要 curl。先明确这条规则是跟人走、跨仓库的偏好型规则；如果只针对某一个仓库、团队本来就走 PR 评审，直接提交 CLAUDE.md 即可，不需要本工具。
2. 安装（可让 agent 执行）：
```bash
curl -fsSL https://raw.githubusercontent.com/aryehlev/peerharness/main/install.sh | sh
```
它会下载对应机器的 release 二进制，对照 `SHA256SUMS` 校验，装进 `~/.local/bin`。不需要 sudo。
3. setup 必须由你本人执行（agent 会被拒绝）：
```bash
~/.local/bin/peerharness setup
```
这一步用于授权“agent 可以替你启动什么”。它生成你的密钥和数据库，把 PeerHarness 接到 Claude Code（两个 hook、一个 skill 及其工具），以及它找到的其他 agent；每处改动先显示再让你确认。注意：其中一个 hook 会保存你输入每条 prompt 的脱敏副本，只在本机，默认保留 14 天，数据库不加密。
4. 新开一个 agent 会话，逐句走通单人全链路：
   - `From now on, use pnpm here, not npm.` → agent 记下规则并告知你。
   - `Keep it.` → 弹窗显示规则原文，点 Proceed，规则只装给你自己的 agent，下次会话生效，不外发。
   - `Create a PeerHarness team called acme.` → 你是唯一成员。
   - `Propose the pnpm rule to acme.` → 弹窗显示将要离开本机的确切文本，点 Proceed 进入投票。
   - `Vote approve on it.` → 弹窗显示选票，点 Proceed，1/1 通过，规则成为团队规则。
每个窗口只有 Cancel 和 Proceed，默认 Cancel，agent 无法替你点。
5. 用 demo 确认计票机制：
```bash
peerharness demo
```
它在临时目录造三个成员加一个外部人，各自独立密钥与数据库，跑出计票、拒绝非成员选票、创始人 root key 也无法绕过投票的结果；不碰你的 home 和 `~/.claude`。
6. 拉第二个成员（双方需在聊天之外人工核对指纹）：
   - Dana 问 `What is my PeerHarness device key, and its fingerprint?`，把公钥发给你（公钥可以走聊天）。
   - 你说 `Invite Dana to acme. Her device key is ed25519:…` → 弹窗显示被接纳设备的指纹；点击前先用电话或当面让 Dana 念一遍她的指纹，一致再点 Proceed；然后把你 node 的 peer id 和团队 root 指纹告诉她。
   - Dana 说 `Join the team. The peer id is 12D3…, the fingerprint is 8e8d-…` → 弹窗显示指纹和成员名单，Proceed 加入。
从此每条规则需要你们两人都投票。注意：join 窗口只显示章程和规则条数，不显示规则全文，加入即安装了你没读过的规则（之后可逐条 opt-out）。
7. 让 node 常驻（否则只有 agent 会话打开时可达）：
```bash
peerharness daemon --internet --sync-every 60
```
macOS 上可加 `--notify`。注意 internet 模式会把你的 node 公钥和 IP 暴露给志愿者运行的服务器。
8. 治理与退出（都需要终端）：
```bash
peerharness circle mode ask --circle <team>        # 规则通过后先问你，再装
peerharness rule opt-out <name> --circle <team>    # 本机退出单条规则
```
移除成员、退队、改投票门槛、废除规则、编辑/驳回已记规则、以及所有被扫描器判为高风险的规则决策，也都在终端完成。
9. 与 Z、L 的差异：Z 用规则包 + CLI 从个人历史会话挖规则；L 是同一份文件软链给多个 agent；AQ 是多成员各自持有密钥、各自计票、共享同一套规则，并允许逐人 opt-out。AQ 不替代 A–AP，它是团队规则分发层。
10. 最小试用：在单人环境下用 `peerharness demo` 或真实纠正各走一次，确认“纠正 → 规则 → 投票 → 下发”链路能跑通，再决定是否让第二个成员加入。不要在没有核对指纹的情况下直接加入生产团队。

### 做法 AR：用 TokenSafe 做本地上下文控制层（小范围试）
1. 前提：本地工作站；已装 Node（用 npx）或 Python 3.10+（用 pip）；已在用的编码 agent 在其支持列表内。先选一个仓库、一个 agent，不要一次铺到团队。
2. 一键安装并接入本机 agent（三选一）：
```bash
# Option 1: Zero-Install via npx (recommended)
npx tokensafe

# Option 2: Python / PyPI
pip install tokensafe && tokensafe

# Option 3: Direct shell script (macOS / Linux)
curl -fsSL https://tokensafe.dev/install.sh | bash
```
安装器会自动探测本机已安装的 agent、注册 TokenSafe MCP server、注入项目规则，并在 agent 支持时挂上 lifecycle hooks。
3. 若不想用安装器，手动注册 MCP（Claude Desktop / Cursor 等，写进对应 MCP 配置文件）：
```json
{
  "mcpServers": {
    "tokensafe": { "command": "npx", "args": ["-y", "tokensafe", "mcp"] }
  }
}
```
4. 按 agent 选择接入方式：Claude Code CLI 走 MCP + SessionStart / UserPromptSubmit / PreToolUse hooks；Cursor 走 MCP + beforeShellExecution / beforeReadFile hooks；Claude Desktop 写 `claude_desktop_config.json`；Windsurf 走 MCP 注册 + 全局规则；OpenAI Codex 写 `~/.codex/config.toml` 中的 MCP（stdio + 云 HTTP）；Cline / Roo Code、GitHub Copilot、Gemini CLI 走 MCP 注册；ChatGPT 走云连接器，四个公开工具无需 key，authentication 设为 None。
5. 审计本机 agent 环境的上下文税：
```bash
tokensafe doctor
```
6. 对仓库做递归安全与卫生审计：
```bash
tokensafe guard audit
```
7. 预览提示压缩效果（把真实任务描述换进去）：
```bash
tokensafe test "fix the validate_token method in src/auth.py to check jwt expiration"
```
8. 多文件改动前先出架构热点图：
```bash
tokensafe graph
```
9. 关掉占上下文的重 MCP server（不改 JSON）：
```bash
tokensafe mcp disable <server>
```
10. 看实时节省面板：
```bash
tokensafe stats
```
输出示例（原文照录）：
```text
⚡ TOKENSAFE CONTEXT OPTIMIZER DASHBOARD
Total Tokens Saved:   4,524,156 tokens
Efficiency Gain:      [████████████████████████░░] 92.5%
Context Traffic:      4,889,255 raw → 370,574 optimized (2,132 events)

• Command Sanitizer (CLI)        :   727,300 tokens saved (263 events)
• Architecture Graph             :   758,256 tokens saved (13 events)
• Multi-turn History Fold        : 2,897,897 tokens saved (471 events)
• Prompt Compactor (local+cache) :    43,502 tokens saved (1,255 events)
```
11. 在 agent 对话中改用专用工具，而不是整文件读取：`smart_read_file` 传目标符号，返回该符号 + 1 跳依赖的骨架；OpenAPI/Prisma/GraphQL/SQL 传 spec 路径 / model / type / table 作为 `symbol`。`smart_bundle` 一次读 3–8 个跨文件相关符号，合并骨架、去重共享 import。`get_architecture_graph` 多文件改动前先拿拓扑，目标 <250 tokens。`get_api_surface` 导出接口的紧凑 markdown 地图。`slice_diff` 切 diff，剔除 lockfile、压缩上下文行。`sanitize_command` 分阶段重写 shell 命令并限输出。`guard_inspect` 命令或代码片段的执行前安全检查。`context_budget` 估算上下文窗口占用并给阈值建议。`compress_prompt` 把冗长提示压成紧凑 S 表达式。`compact_conversation` 把长对话折叠成状态账本。`get_token_savings_metrics` 累计 token / 成本节省。
12. 缓存友好的写法（可迁移原则，不必依赖本工具）：历史前部保持字节稳定，不要在早期轮次里插入时间戳、随机 ID、重排的工具清单；系统提示与工具 schema 顺序固定；把易变内容追加到末尾而不是改写前缀。TokenSafe 的 governor 就是自动化这件事（冻结到上下文窗口 80%）。
13. 可选团队/云端能力：endpoint 为 `https://api.tokensafe.dev/mcp`，请求头 `Authorization: Bearer <TS2. license key>`。不接云端时，四个公开工具与全部本地功能照常可用。生成团队 ROI 周报：`tokensafe digest`。激活 Team / Solo license：`tokensafe activate TS2.eyJlbWFpbCI6...`。关掉遥测同步（保留全部本地功能）：`TOKENSAFE_TELEMETRY_DISABLED=1`。
14. 与 A/B/C、AJ 的差异：A/B/C 主要拦截工具输出；AR 还管按符号读文件、执行前 guard、缓存友好写入。AJ 是一条“先 grep 再局部读取”的规则；AR 是把这件事做成工具。AR 不替代 A–AQ，它是本地上下文控制层。
15. 最小试用：先在一个仓库、一个 agent 上只启用本地 AST 切片、命令净化和 guard 拦截，对比 token 消耗与一次通过率，再决定是否上团队缓存。

## 怎么判断变好了

要分两类指标看：工具侧（省了多少上下文/token/钱）和任务侧（结果有没有变好）。这些项目的 README 普遍只给上下文或成本指标，没有给任务结果质量指标，所以任务侧必须自己测。

工具侧指标：
- A/B/C：ctx stats / ctx-stats；状态栏 `$ saved this session · $ saved across sessions · % efficient`；ctx-doctor 检查运行时、hook、FTS5、注册、版本，所有检查应为 [x]。D：每次运行末尾的回执（扫描数、命中数、borderline 数、耗时、Jev token 与成本、约多少 Claude token 没被读）；qs status 看 key 状态和累计节省 token。
- E：看新会话是否自动注入此前上下文，以及主动检索的命中率；README 只提出三层工作流可带来约 10x token 节省，没有可复核的实验数据。F：headroom doctor、headroom perf、headroom dashboard；headroom output-savings 默认给估计值，想看实测就开 HEADROOM_OUTPUT_HOLDOUT=0.1。
- G：录制到评审页的端到端耗时；每次录制的 token 与实际花费。H：CLI 四步先跑通；再用 search + add 嵌进一个固定 user_id 的重复性任务做 1–2 周小范围试。I：无 LLM 本地 remember / recall 先跑通；再通过插件或 MCP 接进现有 agent 做 1–2 周对照试用。
- J：在同一个长时编码任务上做 A/B，观察 /clear 或 compaction 后的重新定位轮数是否下降。K：先在一个仓库、一个 agent 上小范围试，用 .hivemind 限定捕获范围，再看 skillify 是否真的产出被复用的 SKILL.md。
- L：没有工具侧指标，唯一能用的是行为观察——两个工具是否真的读到了同一份文件、是否遵守同一条规则。M：材料没有给出工具侧指标；推文互动量不是效果证据。N：唯一的工具侧反馈就是 /context 本身——看 CLAUDE.md、聊天记录、MCP 工具三类来源的 token 占比是否下降。
- O：/handoff 显示上下文用量、阈值、刷新与 distill 状态、待处理的 away handoff、交接失败原因、非法 JSONL 样本与原因；/handoff dry 显示交接成本。P：面板的 `✓ handed off · 162k → 45k` 前后 token 对比与 open brief 链接；auto-handoff.log 记录全部动作、失败与 facts-only 回退。
- Q：原文没有给出量化指标；可自行观察是否按预期只触发一次、交接文件是否生成在 docs/handoffs/ 下并覆盖预期字段、新会话只读 handoff 能否接着干。R：AGENTS.md 的体积变化；被删除或合并的空操作条目数量；三个子代理方案的差异度。
- S：唯一的工具侧读数就是 `wc -l AGENTS.md` 和 `wc -c AGENTS.md` 两个数字——精简前后各记一次，看是否落进 200 行 / 32768 字节以内。T：没有工具侧读数能直接看；原文唯一给的指标是每周额度消耗百分比（约 29%），并附带一个定性指标“记忆退化是否严重”，只能把 29% 当乐观参照。
- U：原文没有给任何工具侧读数；可自行记录闲置后那一次子代理调用的输入 token 数与单次任务成本；如果账单或日志里有缓存读取/命中相关的计量，看命中率是否上升。V：没有工具侧读数；能直接观察的只有一件事——开 3–5 个新会话，看根目录 CLAUDE.md 里的规则是不是每个会话都自动生效。
- W：工具侧读数就是 CLAUDE.md 行数（`wc -l CLAUDE.md`）和实际写入的规则条数。X：没有稳定读数；可记录输出是否给出“指令 + 原始用户提示词”一对证据；同一条指令的触发频率是否下降；修改前后 AGENTS.md 版本是否保留。Y：没有工具侧读数；能直接观察的是目标目录里的局部规则是否被读取、是否被遵守。
- Z：npx nomore --card 的汇总数、--project . 建议的采纳数与删除数、规则包保留条数、CLAUDE.md 行数。AA：没有工具侧读数；可记录注释密度、无效注释评论数、反向追问数、关键注释留存；不要用“注释变少了”本身当成功。
- AB：有 OpenTelemetry 时，看 query_source = agent_summary 的请求数和花费份额是否降到 0，且没有其他 side-query 增长来替代；日志是否出现 `preload active mode=off` 与 `summary timer suppressed`；面板状态停止更新属预期副作用；每次升级后复验仍为 0。没有 OTel 时只能用日志和面板状态做弱验证。
- AC：没有工具侧读数；可记录 AGENTS.md 行数/字节数、docs/ 被引用的次数、skills 条目数、AI 查阅文档的轮次。AD：没有工具侧读数；可记录生成初稿的目录覆盖率、规则条目准确率、人工修改条数、人工修改耗时。
- AE：可数同一会话内对同一文件的重复读取次数（从工具调用日志里数）、单任务总 token 与工具调用次数、计划文件的修改记录；AGENTS.md 自身长度按 `wc -l` / `wc -c` 记录。
- AF：health 给出 failed / outdated / unchecked / planned 四类计数，以及 TODO 和疑似密钥；check 实时显示各块测试通过/失败；watch 显示哪些块因文件变更被标记为可能过期；current status 显示真实投递与执行状态；History 列出最近 200 条变更，含作者与原因。读一个包或结束一轮模型输出都不算完成；通过 MCP/CLI/HTTP 读取不会把包标成完成。
- AG：没有工具侧读数；能记录的是 `wc -l AGENTS.md` / `wc -c AGENTS.md` 的长度变化（按 S 的口径）、`/context` 里这份文件占的 token 占比（按 N 的口径），以及第二次换工具时是否需要重新写规则（应趋近于 0）。
- AH：没有工具侧读数；可记录 diff 行数、修改文件数、新增防御性分支/重试/锁/异常包装数量、范围外改动次数；同时看 AGENTS.md 自身长度（`wc -l` / `wc -c`）。
- AI：审计输出中可执行建议的条数；按建议修改后规则文件的行数与条目数变化（预期变短、去重）；复跑时被重复指出的问题条数是否下降。若命令不存在或输出无法定位具体条目，只记录输出分类，不进入效果判断。
- AJ：单任务 token 消耗是否下降；工具调用次数是否下降；任务正确率是否不下降；需要人工追加“你没看到某文件”这类纠正的次数是否减少；单任务往返轮次与耗时。若 token 明显下降且正确率持平或上升，可保留；若漏读错误增加，把规则收窄为仅在文件超过某行数时先 grep。
- AK：新会话冷启动时间；重复解释背景的次数；决策记录被后续会话引用的次数；同一决策被重复讨论的次数；跨项目规则串味次数；INDEX.md 覆盖的关键文件比例；每个实现回合以 commit 结束的比例；工作树干净的比例。HN 讨论中的可验证指标包括节省 token（cmrx64 报告 40%）、减少重复解释时间、减少因上下文丢失导致的返工、代理是否能正确引用规则和决策（marvstazar 说 The agent so far has not failed to reference the above files），是否能复现项目任一阶段（mapontosevenths 说 I could reproduce any stage of my project），但这些都是轶事，缺乏对照实验。
- AL：未经要求的风格改动 diff 行数（格式化、重排、改命名约定）——期望为 0 或显著下降；回复中出现不一致报告的任务比例——期望上升，且报告内容可核对（不是泛泛而谈）；正确性回归：测试通过率、任务一次成型率——不应下降；人工纠正轮次：每个任务需要你追加“别改风格”的次数——期望下降。淘汰判据：若第 1 项无变化，或第 3 项下降（智能体为了跟随代码而沿用了错误写法、该改的没改），说明规则需要加例外条件或退回项目级使用。
- AM：人工确认有效的过时条目数；误报数/误报率；抽查后发现的漏报数；形成可审批清单所需时间；批准后实际修改是否都来自清单、是否出现未经批准的改动。可与人工直接巡检同一小仓库做对比。
- AN：legacy-scan 在同一目录、同参数下的命中数，改造前后的变化；同一任务两次产出的可比项：JS 行数 / 产物体积、是否引入了 polyfill 或旧库、是否改用原生 API、键盘操作与屏幕阅读器可用性；出现“指南里写了但 agent 没用”的次数——这反映的是上下文注入方式的问题（条件供给没做到位），不是指南本身的问题，值得单独记；回归风险：现代 API 的浏览器支持范围是否满足你的目标浏览器矩阵（指南带兼容性数据，应以产品要求核对，不能默认可用）；由于材料未提供自动评分方法，建议把“是否按指南实现”做成人工评审 checklist，逐条勾。官方 1.0 案例指标可作为乐观参照，但都是厂商或客户自报：Pensionbazaar 交付从约 4 天降到几小时、UI 错误降 90% 以上；Policybazaar 手动审计工作量降 92%；WeTV 90% 的失败性能检查可自动诊断解决、调试时间降 87%；note 现代 Web 检查通过率从 61% 到 94%、LCP 图片优先级提升 28%；MetaMask 5 周约 480 个 PR、64 条评论、43 个修复、中位 15 分钟修复。推文的 56%→88% 没有任务集、样本量和评分标准，只能当假设。
- AO：单会话总花费（原文单例 $42.21 → $6.06，按原文数字推算约降 86%，只是单例）；输入 token（原文称约 25,000 → 约 2,700/轮，约 1/9）；代理日志是否报告静态块替换和视觉 token 数；每轮延迟。没有 README、安装说明、issue 或第三方复现时，以上只能当作者主张。
- AP：任务完成率和返工次数；代码审查意见数和重复问题；formatter/测试是否按预期自动触发；敏感目录误改次数；跨会话、跨成员的输出一致性；是否仍需反复在提示里重复同一规则；根 CLAUDE.md 是否过长；`.claude/skills/` 里的技能是否被实际复用；`.claude/hooks/` 是否可靠且不误伤；局部 CLAUDE.md 是否只覆盖模块风险。原文没有给基线，需要自行记录。判断改善的标准可以是：相同任务的人工干预减少、重复错误下降、hook 触发可靠且不误伤。若没有改善或 hooks 不稳定，应降级为 study。
- AQ：规则从纠正到被记下的条数；提案到投票通过的转化率；同一类纠正在团队内的重复次数是否下降；成员 opt-out 的规则数；加入团队后新成员是否真的装上规则、下次会话是否生效；demo 能否复现“计票、拒绝非成员选票、创始人 root key 也无法绕过投票”。README 没有给任何效果指标，这些都需要自己记录。
- AR：`tokensafe stats` 的 Total Tokens Saved、Efficiency Gain、Context Traffic（raw → optimized）与各分项（Command Sanitizer、Architecture Graph、Multi-turn History Fold、Prompt Compactor）；`tokensafe doctor` 报出的 MCP 工具开销与 skills 税；`tokensafe guard audit` 的命中项；单任务 token 与一次通过率；guard 是否真的在写入磁盘或进入 git 暂存区之前拦下硬编码 fallback 密钥、私钥、`verify=False`、拼接 SQL、带凭据的 CORS 通配、`.env` 被 `git add .` 带进暂存区、破坏性删除、`curl -d @.env`。效果数据来自作者自报模拟基准，必须自己复测。

任务侧指标：
- 正确率：任务结果是否正确。Quicksilver 基准里出现过省 85% token 但 F1 从 54% 掉到 23% 的情况。人工纠正次数、交付时间、会话连续性：压缩后 agent 是否还能检索到之前的状态和决策；/clear 或 compaction 后重新定位需要多少轮。
- 可工作轮数/时长（N）：同样配额下能连续工作多久、完成多少轮；重述需求次数、返工与纠正次数（反面指标）是否上升。条目保留率（G）：按 A 保留的条数 / 总条数。团队复用率（K）：skillify 产出的 SKILL.md 是否被其他会话或其他人的 agent 实际拉取并复用。
- 规则生效次数、重复交代次数、行为不一致次数、维护成本、返工次数（L）。一次通过率、人工纠正/追问次数、输出长度与 token 消耗、反向校验（M）。交接后重新定位轮数、同一纠正的重复次数、交接与 distill 成本（O）；新会话能否直接续上、简报事实准确率（P）；新会话恢复时间与手动补充次数、交接 turn 成本对比（Q）。
- 渐进式披露是否真的生效、指令遵循率前后对比（R）。规则违反次数、重复纠正次数、需要人工介入的回合数、任务一次通过率（S）。T：重复交代上下文的次数、因丢失前文导致的返工/重开次数、任务一次做对的比例；判定：额度消耗下降明显（以 29% 为乐观参照），且重复解释与返工次数没有可感知上升，才保留。
- 输出质量（U，必查项）：缓存命中的上下文是否与重建出来的等价；是否出现陈旧上下文导致的错误。若质量下降，不应采用。重复粘贴同一段规则/背景的次数（V，越少越好）；规则在多个新会话里一致生效的比例；代理尝试访问该文件夹之外内容的次数。
- W：同类约定第三次违反是否减少；因规则缺失导致的重复纠正次数是否下降；CLAUDE.md 行数是否始终低于 200 行；是否出现为了少写而漏写关键规则。X：同类任务追加纠正的次数是否下降；智能体走错方向后需要重来的轮数是否下降；被点名的那条指令触发频率是否下降，同时任务完成率不下降。
- Y：规则违反次数（是否出现未经允许的总结、编辑或缺少源链接）；人工纠正次数；输出可用率；引用覆盖率；跨目录一致性。Z：主指标是同类纠正的重复次数，把纠正的话归类，看同一类问题在试用周是否从多次降到 0–1 次；次指标是采纳规则数与被删规则数之比；反指标是规则膨胀。
- AA：注释密度下降；无效注释评论数下降；反向指标“这里为什么这么写？”类追问数、因看不懂导致的返工次数不上升；抽 10 个 PR 人工判断关键注释是否仍被保留。
- AB：主子代理、后台代理、forked skills 和后台会话仍正常；任务完成率、人工纠正次数与不用该脚本时持平；SDK task_progress 没有 summary 属预期副作用。AC：任务一次通过率、人工纠正次数、AI 找错/漏查文档次数、完成同样任务所需上下文长度或查阅轮次、维护者更新文档的时间。
- AD：后续新笔记命名与链接的抽样符合率；Claude Code 回答涉及库结构问题时的错误率；人工修改条数是否随第二次生成下降。AE：加规则前后同一类长任务各跑 2–3 次，对比重复读取次数、token 与工具调用次数（预期下降或持平），压缩/中断后要不要人工复述进度（预期改善），任务一次通过率与人工干预次数（不能变差）。
- AF：用 health 看 failed / outdated / unchecked / planned 是否下降；check 通过率是否上升；同一处界面改动从“人进 IDE 手工改”变成“在 devilop 里改草稿 → Finish edits → 代理应用并跑检查”的往返次数和人工介入次数是否下降；新会话或交接后还能否通过 context --brief 拿到地图和 Requests；代理是否只在真实检查后才 mark passed。
- AG：首轮产出可直接使用的比例；代码评审中风格/规范类意见的数量（应下降）；触犯禁区的次数（应下降）；同一任务的人均修正轮次与耗时；跨工具切换时重复交代规则的次数（应趋近于 0）。
- AH：diff 行数和修改文件数是否更贴近需求；新增防御性分支、重试、锁、异常包装的数量是否下降；范围外改动次数是否下降；人工评审时间和返工次数是否下降；反向指标：是否漏掉真实边界问题、合理防护是否被规则挡住、人工确认次数是否高到影响效率。
- AI：接下来各 5 个任务中，因 AI 未遵守偏好而返工/重复解释的次数（审计前 vs 审计后）；新会话里需要人工补一句“注意 XX”的频率。弃用条件：命令不被识别，或输出只有笼统套话、无法定位到具体规则条目。
- AJ：单任务 token、工具调用次数、任务一次做对比例、人工追加“你没看到某文件”纠正次数、往返轮次与耗时；判定：token 明显下降且正确率持平或上升才保留；漏读错误增加则收窄规则。
- AK：重复解释背景的次数（应下降）；新会话从打开到能开始干活的时间（应下降）；决策记录被引用次数（应上升）；因忘记上次决策导致的返工次数（应下降）；跨项目规则互相污染的次数（应下降）；代理是否能正确引用 rules/ 和 knowledge/ 中的文件（按 marvstazar 的说法 The agent so far has not failed to reference the above files，但这是轶事）；每个实现回合是否以 commit 结束且 git status 干净。
- AN：同一前端任务裸做 vs 用 search + retrieve 后重做、或 install 后跑 `/modern-web-guidance Modernize the code in this directory` 的可比项：JS 行数 / 产物体积、是否引入 polyfill 或旧库、是否改用原生 API、键盘操作与屏幕阅读器可用性；legacy-scan 命中数改造前后变化；agent 是否在回复里写清所用现代 API、目标浏览器支持和降级路径；是否出现“指南里写了但 agent 没用”；回归风险：现代 API 的浏览器支持范围是否满足你的目标浏览器矩阵。人工评审 checklist 逐条勾“是否按指南实现”。若用 Chrome DevTools for agents，记录长任务是否不超过 50ms、动画与 prefers-reduced-motion 检查结果、SPA 视图缓存内存是否无界增长。
- AO：工具调用失败/重试次数、需要人工纠偏的次数不得高于基线；任务是否完成、测试是否通过、最终 diff 是否被接受（人工或 CI）；每轮延迟、代理自身日志是否报错。判定规则：成本明显下降且质量不降 → 小范围默认化（写成 shell 别名或包装脚本，只在长会话任务用）；成本降但错误率上升 → 只在只读/低风险任务用，或放弃；成本没降（疑似被缓存或图片重传抵消） → 放弃，不写进手册。
- AP：同类型任务试用前后各跑 3–5 个，记录完成率、返工次数、人工纠正次数、重复错误数、hook 触发成功率、敏感目录误改次数、跨会话输出一致性、根 CLAUDE.md 行数/字节数、skills 复用次数。若 hook 不稳定或根文件仍在膨胀，先只保留根 CLAUDE.md 和 docs，不要继续加层。
- AQ：同一类纠正被记录成规则的次数；团队投票通过率；规则被 opt-out 的比例；新成员加入后规则是否真的装到其 agent 并在下次会话生效；同一类问题在团队内重复出现的次数是否下降；成员是否仍在聊天里重复口头纠正。README 没有效果度量，这些只能自建。
- AR：`tokensafe stats` 的节省总量与各分项；单任务 token 消耗与一次通过率；guard 拦截的真实风险条数与误报数；`tokensafe graph` 是否真的让多文件改动前少读文件；缓存命中率变化；是否需要人工纠偏。效果数据来自作者自报模拟基准，必须自己复测；团队 ROI 周报需 license，且是厂商口径。

最小试用方式：
1. 按做法 A，在 Claude Code 上用 MCP-only 跑一个真实编码任务；前后用 ctx stats 记录；同时记录任务侧指标。Quicksilver：用少量已标注样本核对后再扩大；先跑一条 qs filter，读回执，再抽查被标 ? 的边界项。
2. E：1 台机器、1 个已有项目、1–2 天，跑 3–5 次带工具调用的会话，开新会话看是否自动注入；再用 `<private>` 包假敏感信息验证。F：先跑 headroom doctor，看 dashboard；开 `HEADROOM_OUTPUT_HOLDOUT=0.1` 拿实测；不满意用 `headroom unwrap <tool>` 回滚。
3. G：选一个有真实小 bug 的 Web 项目，录 5–10 分钟走查，中途跳一次话题、改一次口径；用键盘 A/X/J/K 过一遍；对保留条目说 `fix them`。H/I：先按 CLI 四步或 Python 快速上手路径跑通，再嵌进固定 user_id 的重复性任务或现有 agent，1–2 周小范围试。
4. J：选一个跨多会话的真实长任务，在支持 hook 的宿主上执行，做 A/B。K：先只在一个仓库、一个 agent 上安装，用 `.hivemind` 限定范围，看 SKILL.md 是否被复用。
5. L：挑 1 个最常用 repo，建共享文件夹，写一份 AGENTS.MD；先放一条可观察是否生效的独特规则；按各工具文档软链给 Claude Code 和 Codex；用同一个日常任务分别跑，先确认读到了，再观察正式规则。M：挑一个项目，保存 CLAUDE.md 副本；运行 `/claude-api prompt-audit`，记录条目；把“逐步思考 / 自我检查”一类指令摘出，做 A/B。
6. N：挑一个常做的中等长度真实任务，按平常方式跑，中途运行 `/context`，记录三类占比作为基线；只改一项——先禁用当前会话没用到的 MCP 服务器；跑同类任务，再记录一次 `/context`；如果还想继续，再单独把压缩阈值调早（60%）。
7. O：在单个 Claude Code 会话里小范围试——clone 后以 `--plugin-dir` 加载、跑 `/handoff` 验证状态，先用 `/handoff dry` 观察成本，再在长任务上启用自动交接与 distill。P：clone 后以 `claude --plugin-dir ~/claude-auto-handoff` 在一个不那么关键的长会话里启动；设 `AUTO_HANDOFF_TOKENS=60000` 降低阈值；正常干活直到面板出现；打开简报逐条核对；查日志有无失败与 facts-only 回退。
8. Q：在一个真实的、有 git 仓库的长任务会话里安装插件，先用默认配置 minutes=50；若不想等 50 分钟，可临时调小 minutes；默认值是为匹配一小时缓存设计的。做一段有明确目标和未完事项的工作，然后离开/停止交互，等待触发。检查 `docs/handoffs/` 下是否生成文件并覆盖预期字段。开新会话只读 handoff。
9. R：挑一个 AGENTS.md 已经比较长的仓库，先提交到分支并备份，然后发送提示词，让智能体产出单一 PR；先不合并，只做前后对比。S：挑一个近期会持续用 Codex 或 Claude Code 完成实际任务的项目，跑 `wc -l AGENTS.md` 和 `wc -c AGENTS.md`，记录当前行数与字节数；做一轮精简，压到 200 行以内；前后各跑若干个同类型真实任务；只改 AGENTS.md 这一个变量。
10. T：先解决第 1 步——能不能在你的 Claude Code 里真正找到并改到 autoCompactWindow。改不到，本条就退化为 study 级线索。改得到，就改前一周、改后一周各记录同样几项指标；若无法保证两周工作强度相近，就用同一组固定任务反复跑。
11. U：先不改配置做单次实验（约半小时）——跑一个会调用子代理的固定任务，记录第一次 token；让该子代理闲置 6 分钟以上；再跑同一轮，记录第二轮 token。若第二轮没涨，直接放弃这条；若涨了，再去官方文档核对设置名与取值，然后重复这套流程做前后对比，并同时检查输出质量。
12. V：新建一个测试文件夹，只在这个文件夹里启动 Claude Code，根目录放一份 CLAUDE.md，写入一条你原本每次会话都会重复粘贴的规则；连续开 3–5 个新会话看它是否自动加载；然后单独设计一次测试看权限边界有没有真的被限住。
13. W：选一个正在用 Claude Code 的项目，先记录基线——哪些约定被 Claude 反复违反、各违反了几次；只有当某条约定累计第二次被违反时才写入 CLAUDE.md；持续检查不超过 200 行。
14. X：挑一个你近期反复纠正智能体、或明显多绕了几轮的会话作为样本来源；在新会话里贴入回看 prompt 原样运行；对输出的那一条指令做人工改写（删 / 改窄 / 加条件），只改一条；保留修改前后的 AGENTS.md 版本；在新会话重跑同类任务。
15. Y：选一个边界清楚的目录（日记或研究资料），只加一条最容易验证的局部规则，例如“只读，不总结”或“每个声明都链接到其源笔记”；在同一目录下让 AI 完成 3–5 个真实小任务；记录它是否遵守局部规则、需要人工纠正多少次。
16. Z：选一个日常最常用的项目，先连续 3–5 个会话记录“我又纠正了 Claude 什么”作为基线；装规则包并裁到 10 条以内；在同一项目跑 `npx nomore --project .` 只读观察建议质量，再跑 `--apply` 逐条 yes/no/edit；之后一周正常干活，继续记录纠正条数；周末用 `npx nomore --card` 记录总量趋势。
17. AA：选 1 个中等规模仓库，在 CLAUDE.md 里只加这一条注释准入规则，跑 1 周或 5 个 PR，不叠加其他提示词改动；保留试用前的同等长度基线；前后对比注释密度、无效注释评论数、反向追问数与关键注释留存。
18. AB：在 Linux 单机、非关键项目上，先用当前 shell 的临时 BUN_OPTIONS，不写全局配置；先检查服务条款；按第 2–5 步下载、注入、重启 daemon；用 `CC_AGENT_SUMMARY_LOG=/tmp/nas.log` 确认 `preload active mode=off`；跑一个后台子代理一到两分钟，确认出现 `summary timer suppressed` 且面板状态停止更新。若可用 OTel，`query_source = agent_summary` 应为 0。再做一次 `CC_AGENT_SUMMARY_MODE=pass` 对照。
19. AC：选一个仓库或一条内部开发流程，先盘点 skills 和知识文档；把“我知道”类内容迁到 docs/，保留可执行能力为 skills；把 AGENTS.md 限制为少量“如果 X 就看 docs/Y”的规则；用同一批任务对比改造前后。
20. AD：选一个非敏感的小型笔记库副本，先备份或纳入版本控制；在库根目录启动 Claude Code；粘贴提示词生成 CLAUDE.md；按漏目录、链接风格、命名规则三类人工标注并修正；先不执行原文缺失的第 4 步；用同一批库结构问题对比生成前后错误率。
21. AE：选一个步骤明显超过五步的真实编码任务（跨多文件重构，或加一个带测试的功能），先不加规则跑一次作基线；按第 2、3 步把两条规则写进仓库根目录的 AGENTS.md；再跑同类任务 2–3 次。任务、模型、工具版本保持一致，只改 AGENTS.md 这一个变量。出现“读到旧文件改错代码”或“计划文件写完不更新”时，先补限定条件再重测。
22. AF：选一个非关键、带界面的小项目；确认 Node 22+；启动 devilop；用一个已登录的客户端按第 3 步连上项目；先只画 5–10 个块的产品结构，不要一次画全；绑定一个真实界面区域，改一处文案或同级顺序，写一条 Requests，Finish edits；让代理跑 check 和 health，看它是否在真实检查后才 mark passed；再开一个新会话，用 context --brief 看能否接着干。
23. AG：选一个中等规模、规范相对稳定的仓库，工作区先保持干净；在根目录跑 `/init` 生成 AGENTS.md，按四类补全后提交；选 3–5 个同类任务，每个任务分两次做——一次在没有 AGENTS.md 的分支，一次在有 AGENTS.md 的分支，提示词保持一致；再换一个工具验证同一文件是否被正确遵循。
24. AH：选 3–5 个需求明确、改动范围小的编码任务；先不加规则跑基线，记录 diff 行数、修改文件数、新增防御性分支/重试/锁/异常包装数量、范围外改动次数、人工评审时间和返工次数；再加入上述 AGENTS.md 规则和启动提示，跑同类任务对照。
25. AI：约 15 分钟——`claude update` 并用 `claude --version` 确认版本；选一个 CLAUDE.md 已经比较长的真实项目，运行 `/doctor prompt-audit`，原样保存输出；逐条标可执行建议 / 泛泛而谈 / 误报；只改一条可执行建议，复跑同一命令看问题条目是否减少。命令不存在就停止。
26. AJ：选一个含较大文件的仓库，复制一份 AGENTS.md 作对照；只在实验组加入“读整个文件前先 grep，只读需要的部分”；准备 3–5 个典型任务，分别在加规则前后各跑一遍，使用新会话；记录 token、工具调用次数、一次做对、人工追加“你没看到某文件”纠正次数、往返轮次与耗时；若 token 明显下降且正确率不降，可保留；若漏读错误增加，收窄为“仅在文件超过某行数时先 grep”。
27. AK：选一个最常用的项目，建独立目录；写一份只放链接的 AGENTS.md；把项目规则拆到 rules/，把 idea/plan/review 拆到 docs/；加一个 INDEX.md；让代理在任务结束时写 `knowledge/decisions/<date>-<slug>.md`，并在下一轮先读；要求每个实现回合 commit 并保持工作树干净。跑 1–2 周，记录重复解释次数、冷启动时间、决策引用次数、跨项目串味次数。
28. AL：选 1 个已知指令文件与代码风格不一致的仓库，把补全后的规则写入项目级（或用户级）指令文件；先不加规则跑 5 个有代表性的改代码任务（新增函数、修 bug、重构一小段）留底，再加规则跑同样 5 个任务；记录未经要求的风格改动 diff 行数、不一致报告出现比例、测试通过率、人工“别改风格”纠正次数。
29. AM：选一个小仓库或一个目录，复制上述提示并补全 `<find>` 的扫描范围；把 agent 设为只读或禁止写入，要求它只输出两类清单：疑似过时条目（文件、位置、原因）和仅存在于散文中的硬规则（文件、位置、原文、为何属于硬规则）；人工逐条判断；只批准一条修改，复跑看同类问题是否减少。
30. AN：选一个已有 Web 前端仓库，建分支，记录构建、测试、lint 基线，并选 3–5 个代表性任务或 PR。先按路线 B 零安装试跑 search + retrieve，或按路线 A 执行 `npx modern-web-guidance@latest install` 后跑 `/modern-web-guidance Modernize the code in this directory`。只处理小范围目录或文件，人工审查 diff，运行构建和测试。若可用 Chrome DevTools for agents，按第 5 步验证长任务、动画和 SPA 内存。对比安装/注入前后同一批任务的修改轮次、人工 review 意见、返工次数、现代 Web 检查通过率、polyfill/旧库使用、原生 API 使用、键盘与屏幕阅读器可用性。全程先不 install 也能完成最小验证；确认有用后再扩大。
31. AO：选一个真实小任务（如修一个 bug、加一个小功能），固定仓库快照与提示词；基线用原样 Claude Code 跑一次，记录账单与指标；实验用 `pxpipe warp -- claude` 跑同一任务，同模型、同轮数上限；若两步成本接近或实验更贵，直接停，不必再扩大样本；若成本明显下降且质量不降，再至少换 2–3 个不同规模的任务复测。
32. AP：选一个中等规模、已有测试和 formatter 的仓库，试用一到两周。先写根 CLAUDE.md（只放目的、仓库地图、规则与命令，控制长度），选一个高频流程做成 skill，选一个必须自动执行的动作做成 hook（例如编辑后运行 formatter），再给一个高风险模块加局部 CLAUDE.md。用试用前后相同类型的任务做对照；一次只加一层，先确认根 CLAUDE.md 和 hook 可靠，再加 skills 和 docs。若没有改善或 hooks 不稳定，降级为 study。
33. AQ：在单人环境下用 `peerharness demo` 或真实纠正各走一次，确认“纠正 → 规则 → 投票 → 下发”链路能跑通；再决定是否让第二个成员加入。加入前双方必须用电话或当面核对设备指纹。先不要在没有 opt-out 计划的情况下把大量规则一次性提案。
34. AR：先在一个仓库、一个 agent 上只启用本地 AST 切片、命令净化和 guard 拦截，对比 token 消耗与一次通过率；再决定是否上团队缓存。先用 `tokensafe doctor` 和 `tokensafe guard audit` 看基线，再用 `tokensafe test` 预览压缩效果。

试多久：
- 调研没有给出统一固定时长。建议先做小范围试用，跑一个真实任务，对照工具侧节省与实际任务结果。要验证会话连续性，至少覆盖一次会话压缩和一次跨会话继续；E 建议 1–2 天、3–5 次会话。
- G 只要条目保留率高 + 端到端时间明显短于原方式，就值得固定成输入惯例。F 在长会话、重工具输出的场景下试；短对话、散文类负载不用试。H/I 先用 1–2 周小范围试。J 至少覆盖一次 /clear 或 compaction。K 先在一个仓库一个 agent 上试。
- L 只在一个 repo 上跑一到两周。M 建议 5–10 个真实任务做 A/B。N 一次只改一项，每项至少跑一个同类真实任务再下结论。O 至少覆盖一次自动交接触发，以及一次空闲 55 分钟后的刷新；P 先按 `AUTO_HANDOFF_TOKENS=60000` 在单个会话、单个项目上跑一次完整交接；Q 先在一个有 git 仓库的真实长任务里跑一次完整交接，再开新会话只读 handoff。
- R 文件更短、被移走的规则仍被遵守、人工审查认为可读性提升，才算有效；如果规则被移走后开始违反，说明激进过度。S 原文建议 1–2 周、单个项目；如果精简后规则违反次数和重复纠正次数明显下降，可以把 AGENTS.md ≤200 行写进手册；如果没有变化，降级为注意上限即可。
- T 原文建议用 7 天回溯对比不同阈值开销。最小试用是一周默认值、一周 400k；如果无法保证两周工作强度相近，就用同一组固定任务反复跑。这个对比样本量很小，结论只应作为是否继续投入的依据。U 是单次实验，约半小时；是否长期保留，取决于能不能按官方文档核对到设置项及其合法取值，以及前后两轮 token 与输出质量的对比是否支持它。
- V 先在一个测试文件夹里跑 3–5 个新会话，确认规则自动加载；之后可以放进一个真实项目再用一到两周，看重复粘贴的次数是否真的下降。权限边界必须单独测。W 原文没有给验证周期；建议先在一个项目里跑到至少出现一次同一约定第二次被违反并写入 CLAUDE.md，再持续观察 1–2 周；每次复查都检查行数是否低于 200 行。
- X 原文没有给验证周期；建议先在一个会话里定位、只改一条，再用一个同类任务验证；若想看是否稳定，观察 1–2 周同类返工是否减少。Y 原文没有给验证周期；建议先在一个目录跑 3–5 个真实小任务；只有工具能稳定读取局部 CLAUDE.md、规则违反次数下降，再考虑扩大到第二个目录。
- Z 原文建议约一周、单项目。一周的样本量很小，结论只应作为是否值得继续用的判断。若两周内没有任何一类纠正因规则而消失，或 `--apply` 的建议几乎全是任务词，就只用规则包、弃用 CLI。AA 建议先在一个中等规模仓库跑 1 周或 5 个 PR，保留前 5 个 PR 基线；若反向追问数明显上升，补例外白名单与正反例后重测一轮。
- AB 的验证只需几分钟到一次后台子代理运行；长期是否保留至少跨一次 Claude Code 升级并复验。AC 建议先在一个仓库或一条内部开发流程跑 1–2 周，或同一批固定任务；样本小只作局部经验。AD 建议先在一个小型笔记库副本上跑一次生成 + 人工校正，再用同一批抽样任务验证。
- AE 建议同一类长任务加规则前后各跑 2–3 次，至少覆盖一次上下文压缩或 /clear；重复读取次数与 token 下降、续做能力改善、通过率不变差，才保留。AF 建议先在一个非关键项目跑 1–2 周，或完成 3–5 次改界面草稿 → Finish edits → check/health 的往返；若投递路径不稳定或 health 计数没有改善，不扩大。
- AG 原文只给了 1–2 周的建议，没有给样本量或统计口径；建议先在一个中等规模仓库跑 1–2 周、3–5 个同类任务的有/无对照，再换一个工具验证一次；如果风格类意见和禁区违规没有下降，先细化禁区和代码风格两项再测一轮。AH 原文没有给验证周期；建议用 3–5 个同类小任务做有/无规则对照，至少覆盖一次代理主动提出额外防护的场景。
- AI 先做一次约 15 分钟的体检；若要判断任务侧是否改善，再观察接下来 5 个任务。样本很小，只能作为是否继续投入的依据。AJ 用 3–5 个典型任务、新会话做加规则前后对照；这只是一次小范围试用，不足以证明长期效果。
- AK 建议先在一个常用项目跑 1–2 周，至少覆盖 3 个新会话和一次任务交接；看重复解释次数、冷启动时间、决策复用次数是否改善；HN 讨论没有给统一试用时长，1–2 周是本手册建议。
- AL 建议用 5 个有代表性的改代码任务做有/无规则对照，至少覆盖一次指令文件与代码风格不一致的场景；样本小，只能判断是否继续。AM 先在一个小仓库或一个目录做一次只读巡检，人工核对误报与漏报；若清单质量可接受，再扩大到主仓库，每次只批准一条修改。
- AN 原文没有给试用时长；建议先做一次最小试用（一个前端小任务裸做 vs 用指南重做 + 对子目录跑 legacy-scan），或按官方 1.0 流程在分支上 install 后跑一次现代化命令；若可比项有改善再考虑在 1 个前端项目上跑 1–2 周。不要在没有对照的情况下直接全仓库 install，也不要把厂商自报指标当结论。
- AO 原文没有给试用时长；建议先 2–3 个不同规模任务、每个任务一次基线一次实验；单例只作是否继续投入的依据。
- AP 原文建议试用一到两周；建议先在一个中等仓库跑 1–2 周、3–5 个同类任务，一次只加一层；先确认根 CLAUDE.md 和 hook 可靠，再加 skills 和 docs。没有对照数据时，只把改善当作局部经验。
- AQ 建议先 1–2 天：用 `peerharness demo` 或真实纠正各走一次，确认链路；再决定是否让第二个成员加入。团队规则是否真的改善行为，需要至少跨两周记录同类纠正次数。
- AR 建议先 1–2 周、单仓库单 agent：只启用本地 AST 切片、命令净化和 guard 拦截，记录 token 与一次通过率；团队缓存和 ROI 周报放到确认有用之后。效果数据来自作者自报模拟基准，必须自己复测。

## 常见坑

- A/B/C：README 的 98% 节省、100x 说法、企业 logo 墙都是自述；ELv2 对商用有限制；MCP-only 没有 hook、没有自动路由，模型可能不会主动用 ctx_* 工具；不传 `--continue` 时上一次会话数据会立即删除；Cursor 项目 `.cursor/hooks.json` 会覆盖 `~/.cursor/hooks.json`；OpenCode / KiloCode 同时存在 plugin 与 mcp.context-mode 会注册 0 个 ctx_* 工具；GitHub Copilot CLI 的 hook 调用全局 context-mode，旧版本 fail open；不要加激进的简洁提示词。
- D：准确率不是无条件变好，日志 triage F1 54%→23%、安全审查 shortlist F1 100%→89%，只能当 shortlist 用；主观或团队风格类标签不适合外包；内容是发到第三方 API 的；`--fast` 只在明显场景下有意义；不要用它做写作、编辑、多步推理，以及任何 grep 能精确回答的问题。
- E：约 10x token savings 等只是作者主张；存在商业引导；环境门槛 Node 20+、Bun、uv、Windows PATH 问题；`npm install -g claude-mem` 只装 SDK。F：会接管全部 LLM 流量，不要无条件全量铺开；`headroom wrap` 每次都要用它启动会话才生效；输出压缩默认关闭；匿名 beacon 默认开启；短对话、散文、已经密集的载荷收益很小；沙箱里跑不了本地进程就用不了。
- G：仓库 40 stars、成熟度低；录制端以 macOS 为主，Windows 只有 Tk + ffmpeg；前提是能看到问题或用手机拍到；质量依赖带视觉的强模型；成本不完全看录制时长；首次运行要下载约 240 MB 模型。
- H：托管平台分数包含开源 SDK 不具备的专有优化；所有数字均为厂商自报；ADD-only 抽取意味着记忆只累积不覆盖。I：单 Postgres 图存储是 demo，生产版是授权产品；内置 GLiNER 抽取器是小模型流水线的 demo；无 LLM 时 recall 返回源文本片段；Docker 用 `--rm` 会丢弃容器内数据。
- J：效果数字全部来自项目自述；完成门槛依赖英文状态标记；自动恢复只读项目文件，不读 agent transcript；计划文件默认 gitignore、不自动归档。K：默认把全部会话 prompt 与工具输出写进团队共享 workspace；Node >= 22.0.0；语义检索默认关闭，因为本地嵌入约 600 MB；基准数据是作者自测。
- L：来源是二手转述；原文在 Every repo 处被截断；软链路径写错时 agent 会静默地读不到规则，不会报错，必须先用一条一眼可验的规则确认读到了没有；整条推文没有任何效果数据；需要系统支持符号链接。M：来源是单条推文转述，原文在关键处截断；旧习惯拖累新模型没有对照实验；不要预设它会自动改写文件；先备份、只记录、再小范围 A/B；命令不存在时只保留定期审查原则。
- N：来源是单条推文，传播量低；原文全文没有一个数字、截图或对比实验；`/mcp` 之后怎么做被截断；60% 对应哪个设置项也没写清；怎么精简 CLAUDE.md 原文完全没给；更早压缩意味着更频繁丢失上下文细节，可能换来更多重述和返工；一次只改一项。
- O：作者自标 experimental，基于 early-access function-hooks API；只作用于主会话，子代理回合被忽略；5 分钟缓存用户不关刷新会反复重写整个上下文；交接只暂扣文本，图片/附件必须重新粘贴；阈值 600k 的合理性依据是间接引用；distill 写出的 rule 需要出现 2 次及以上才注入新会话；与做法 P、Q 同一条会话先只加一个。
- P：需要带 mods 的 Claude Code 构建；仓库 39 stars、版本 0.8.x，自测为主；未计量工具输出是可能偏高的估计；viewer 默认只在 Tailscale 网内可达；与把会话管道化的 wrapper 不兼容；简报有效性判定很宽松；不要改仓库里的模板，改 `~/.claude/auto-handoff/` 下的副本；不要往 brief.md 加 files 和 commits 段，不要删掉 `## Last Request from the User` 及其 Status 行；Haiku 失败时用 facts-only 简报兜底；连续交接有守卫，默认 maxConsecutiveHandoffs=2。
- Q：仓库 35 stars、MIT，作者自测为主；默认 50 分钟依赖一小时缓存；交接本身也是一个 turn，其中每个模型请求都付出一次对整段对话的缓存读；计时器活在 Claude Code 进程里，退出即停止；若模型调用了未预批准的工具，该 turn 会停在权限提示上直到你回来；基于 early access 的 function hooks 插件 API；默认只写 `docs/handoffs/<timestamp>-<slug>.md`，不做任何提交；原文没有给出任何量化指标。
- R：来源是单条推文，只有提示词正文；`/writing-for-agents` 是什么、怎么安装，原文没有交代；没有给出重组前后的 AGENTS.md 对比；三个子代理是并行还是串行、什么叫“更激进”，原文都没有说明；规则被移走后智能体可能开始违反，文件变短不等于变好。
- S：原文只给了两个阈值和一句主张，且在关键处被截断；“文件越长，Claude 就越不容易遵循”是作者主张，没有实验数据；两个阈值来源不同：200 行是建议值，32 KiB 是 Codex 默认读取上限、超出被跳过；200 行比 32 KiB 更紧是本手册的推算；中文内容按字节算更容易先撞 32 KiB 线，`wc -l` 看不到；精简方法原文没给；每次改完都要重跑 `wc -l` / `wc -c`。
- T：原文只给参数名 autoCompactWindow 和目标值 400k，没有给写入方式、配置文件字段、环境变量名或启动参数；找不到这个参数时应降级为 study 级线索。原文称默认 1M 触发压缩几乎没有节省，调到 400k 后 7 天回溯实测每周省约 29% 额度，但没有给样本量、模型版本、每天会话数、任务类型、额度计算口径和图表原始数据；“不会出现严重的记忆退化”是定性判断。降低阈值意味着更早就压缩，理论上更容易丢上下文细节；不要和做法 N 的 60% 同时改。
- U：素材是一条社交媒体帖子（140 赞、21 转发、33 回复），正文在关键配置处被截断；设置名之后没有取值、没有配置位置、没有用法，不要凭猜测填 3600；“Anthropic 的指南涵盖这个设置”没有给出文档链接或引用位置；“消耗的 token 是缓存命中的数倍”没有实测数据；收益完全取决于工作模式，连续调用的流程不会因此省钱。不要和做法 N 的 60%、做法 T 的 400k 一起改。
- V：素材是单条推文（728 赞、83 转发、26 回复），正文只完整给出第 1、2 步，第 3 步及之后缺失；没有命令、配置样例、CLAUDE.md 内容示例、权限边界实现方式，也没有案例或效果数据；“这个文件夹是代理唯一能看到的世界”是作者主张；根目录 CLAUDE.md 会进入每个会话，它自己的长度和内容也持续吃配额，要同时看做法 S 与做法 N；把所有工作都收进一个文件夹可能不适合跨目录、跨仓库的任务。
- W：素材是单条推文，声称是 Anthropic 官方针对 Claude Code 的提示，但没有给出官方文档链接或原文出处；正文只完整展开 `01 CLAUDE.md`，`02 Skills` 被截断；“两次违反才写入”和“200 行以下”都是指导性主张；不要第一天把所有配置都设置好；不要为了压到 200 行而漏写关键规则；原文没有规定检查频率。
- X：素材是单条推文，采集到的正文只保留了第 1 条场景及其 prompt；原文只到定位问题这一步，没有改写 prompt 与验证环节；需要 Codex 或同类可回看会话的工具、已有 AGENTS.md、有一定历史会话量；输出可能只给泛泛的改进建议，必须要求“指令 + 当时原始用户提示词”这一对证据；不要直接把模型的改写版覆盖进 AGENTS.md；若两周内同类返工仍反复出现，说明定位到的指令不是根因。
- Y：素材是一条推文和三个目录规则示例，没有完整配置、工具名称、读取机制、操作录屏、案例数据或效果对比；Obsidian 本身是否读取 CLAUDE.md，取决于外部 AI 工具或插件；原文没有说明读取顺序、根规则与局部规则冲突时谁优先、过期规则如何维护；三个示例是摘要式表达，不是完整模板；若工具不读取局部文件，这种方法不会生效；局部规则不能当权限隔离。
- Z：CLI 自认是 preview，作者说约三分之一建议才是真规则，其余多是 commit、continue 这类任务词；规则包是静态快照，重新下载会覆盖 `nomore-rules.md`；规则包每条规则目前只建立在一个 issue 及其点赞数之上；内容偏通用编码/写作习惯，必须逐条裁掉；CLI 的过滤器只针对英语、韩语、印尼语调优，中文会话召回可能偏低；本地运行、不外发数据由作者声称；没有前后对比数据；必须留人在回路，`--apply` 会写入 CLAUDE.md，先备份；规则膨胀是反指标。
- AA：素材是单条推文（206 赞、7 转发、6 回复），只有一条注释准入判据和转述；没有数据、案例、前后对比、仓库名或提交记录；原文正文在 `If the answer isn't` 处截断，`delete the comment` 是按语义补全，不是原文原话；“下一个 Claude 是主要读者”是隐含假设；不适用于教学代码、对外 API 文档、以及必须记录为什么的合规性注释；不要只单向删注释，必须同时把“缺关键注释”当作评审项；不要用“注释变少了”本身当成功。
- AB：方案非官方，可能与服务条款冲突；只在 Linux 实测，macOS/Windows 未测；依赖特定版本的内部字符串，升级后 fail-open；可见代价是面板状态不再更新、SDK task_progress 没有 summary；BUN_OPTIONS 必须到达每个启动 Claude Code 的进程；路径必须是绝对路径；没有出现 `preload active` 就说明没生效；没有 OpenTelemetry 时只能用日志和面板状态做弱验证；原文中的成本是 Claude Code 自身按请求估算的 cost_usd，不是发票。
- AC：来源是单条推文，属于作者团队经验总结，互动量不是效果证据；原文没有给出 OKF 格式、目录结构、AGENTS.md 样例、前后对比数据或失败案例；条件路由依赖文档路径稳定、触发条件可枚举，否则规则会失效或变成新的堆文本；把知识迁到 docs/ 后，agent 可能找不到或漏查；不要同时改 skills 结构、docs/ 迁移和 AGENTS.md 路由三件事。
- AD：素材是单条推文（92 likes、13 reposts、10 replies），正文在 `add one line:` 处截断，第 4 步缺失；原文没有展示生成后的 CLAUDE.md，没有准确率、耗时或案例对比；未说明 Claude Code 版本、库的规模和文件类型、隐私与权限处理、生成错误如何回滚、人工修正的标准；让 agent 读取整个库之前先备份或纳入版本控制，敏感库不要直接跑；生成的是初稿，不要直接当成长期规则；根目录 CLAUDE.md 会进入每个会话，按做法 S 量长度、按做法 N 看 token 占比。
- AE：只有两条祈使句形式的主张，没有数据、没有案例、没有前后对比；原文第二句被截断，完整表述缺失，落地时的补全部分不能算原文依据；依赖代理确实读取并遵循 AGENTS.md；“不要重复读取”在文件被外部改动、或代理需要确认最新状态时会与正确性冲突，原文用 `unless it changed` 做了限定，但没有说明如何检测变化；计划文件写法适合多步、跨上下文压缩的长任务，对一次性小改动是额外开销；AGENTS.md 本身会进入每个会话，加规则前先看做法 S 的长度预算和做法 N 的 token 占比。
- AF：devilop 当前版本 0.26.1、40 stars，除 Codex 同对话投递外多数投递路径作者自认未验证；不能把它当稳定交接方案；Claude Code 需要会话级 channel 同意与组织策略许可，不能为绕过同意另开第二个对话；Cursor 靠有界 receive 调用，空闲 IDE 聊天无法外部投递；queued 不等于 received；读一个包或结束一轮模型输出都不算完成；通过 MCP/CLI/HTTP 读取不会把包标成完成；通用 MCP 连接不能唤醒空闲客户端；VM 访问默认关闭，需要主机核对 4 位码后 Allow；API 写入需 `.devilop/token`；不要一上来绑定整个产品所有界面；devilop 没有 chat，不创建第二个 agent。
- AG：素材是个人推文（约 34 赞、4 次转发），正文只完整看到第 1 条，第 2 条只有标题；不要把 12 个提效玩法当成已评估的结论；“用上一半，效率直接翻倍”是宣传性表述；`/init` 生成的内容质量、四类信息写得全不全，都要人工校对；原文未说明 `/init` 在 Codex、Claude Code、Gemini CLI 下行为是否一致，必须自己用一条可观察的规则验证；不提交进版本控制会导致各人本地文件不一致；生成的文件会进入每个会话，不要往里堆资料。
- AH：素材是单条推文摘录，不是 OpenCode 仓库的完整规范或提交记录；只给了一条规则文本和问题描述，没有完整 AGENTS.md、文件路径、提交记录、模型/项目/团队信息或对照实验；“专治 Codex 老毛病”和“减少防御性代码”是作者主张；若项目对竞态、安全、边界极其敏感，不能简单禁止防护，要保留人工判断；规则可能让代理频繁请求确认，增加摩擦；不读取 AGENTS.md 的工具上这条规则无效。
- AI：素材是单条推文（32 赞、5 转、10 回复），没有截图、输出样例、真实项目前后对比或量化数据；v2.1.283 这个版本号与 `/doctor prompt-audit` 子命令是否真实存在，材料内无法确认；Claude Code 的 `/doctor` 常见用途是环境/安装健康检查，prompt-audit 作为参数需要现场跑一次确认；原文第 4 步截断，输出怎么读、怎么改、怎么复跑完全没有；不要把“跑过审计”当成规则已经改好；命令不存在时只保留定期审查规则原则；一次只改一条，改完复跑；与做法 M 的 `/claude-api prompt-audit` 不要同时改。
- AJ：素材是单条推文（248 赞、8 转发、24 回复），标题说六行，但采集时只完整给出一条规则，第二条只到半句；不能确认整套规则的内容与相互配合方式，不要猜补；没有 token 消耗对比、任务成功率、耗时等任何数据；互动量只是传播信号；“先 grep 再读”是否总优于整文件读取，取决于任务类型——整体重构、文档校对等需要通读全文的任务可能反而需要完整读取；PDF、图片、二进制等非文本/非代码仓库中 grep first 未必成立；规则会占用 AGENTS.md 行数与字节数，加完按 S 跑 `wc -l` / `wc -c`；不要和 W/S/M/X 同时改。
- AK：HN 讨论中的做法来自多位实践者的轶事，没有对照实验；独立目录和独立用户能隔离会话记录，但不会自动共享知识；AGENTS.md 只放链接，细节放 rules/ 和 docs/，否则入口文件重新变臃肿；决策记录需要代理可靠地写文件，否则会漏记；INDEX.md 需要随文件变化更新，否则会过期；Git 提交纪律依赖代理能执行 git commit 且不把未完成工作提交；ADR 目录如果 gitignore 可能不被团队共享；编号系统需要额外维护，项目少时收益有限；外部工具（cv、farero.ai）需要评估隐私和成本；不要把 AK 当成自动交接或持久记忆的替代品，它只是项目级上下文组织方式。
- AL：素材是单条推文（87 赞、0 转发、1 回复），只有规则要点，没有数据、案例或前后对比；原文在 `follow the conventions` 处被截断，补全句是推断，不是原文；用户级配置对所有仓库生效，某些仓库的指令文件恰恰是用来纠正代码坏味道的，此时“跟随代码”会产生反效果；Claude Code 与 Codex 对指令文件的加载范围、优先级未必一致，原文未讨论；规则可能让代理在该改的地方不敢改，必须同时看正确性回归；提及的 paper's fix 没有论文出处，无法核对原始论证。
- AM：素材是单条推文（99 赞、3 转发、1 回复），点赞只是传播数据，不是效果证据；原文在 `.claude/rules,` 处截断，缺少完整文件清单、输出格式、过时条目的判定标准、硬规则提取标准、批准后的修改流程和验证方法；没有案例或数据证明能减少错误；必须把 agent 设为只读或修改前批准，否则可能未经批准改文件；需要人逐条审核，不能把清单直接当结论；不要直接 adopt，先在一个小仓库试。
- AN：Modern Web Guidance 的 README 和官方 1.0 公告本质是产品与宣传材料；“编码智能体常默认老写法，因为训练数据里充满旧代码”“指南 token-efficient，已用 eval 剪掉模型已知内容”“避免臃肿 JS、性能与无障碍更优”都是作者主张，材料未给独立复现实验；官方 1.0 的案例指标（Pensionbazaar、Policybazaar、WeTV、note、MetaMask）均为厂商或客户自报，需自行复测；推文的 56%→88% 没有任务集、样本量、评分标准、基线配置，只能当假设；只适用于 Web 前端，对后端、数据处理、文档写作无依据；依赖 Node/npx，安装需联网；原文未说明支持哪些智能体、Node 版本、私有环境或离线可用性、指南更新频率；legacy-scan 的判定规则来源和误报情况未知；现代化工作流首版只做有限模式的静态分析，“结果较可预测”不等于覆盖全面；MetaMask 的三行指令未给出原文，不能照抄；特性数量说法不一（250 项 vs 212 项），不要用数量当验收标准；install 或 update 前先确认它不会覆盖你现有的规则或技能配置。
- AO：原文只有一条推文，只有一条启动命令 `pxpipe warp -- claude` 和一次会话账单；安装步骤、配置项、支持模型版本均未给出；仓库链接断行，需补全并以 README 为准；模型名 Claude Fable 5.2、Opus 5.5 与已知命名不符，无法核实；$42.21→$6.06 是按原文数字推算约降 86%，只有一例，未说明轮数、模型、仓库规模；约 25,000→约 2,700 token/轮、约 1/9 也是作者说法；“视觉输入不损失工具准确率”只是主张，无对照；静态前缀本可被提示词缓存，换成图片后缓存是否仍生效、图片是否每轮重传，直接决定 9 倍差距能否落到账单；图片渲染清晰度影响工具 schema 识别；不同模型图片 token 计价和上限不同；长会话每轮带图可能增加延迟；内容仍随请求上传，需确认代理不额外留存；短会话、一次性问答不适用；安装前先读 README，若仓库与实际描述不符或不存在，降级为 drop。
- AP：原文只有五类文件/目录及其示例用途，没有代码、配置、提示词模板、数据、案例或对照实验；“仓库乱则 Claude 像聊天机器人、结构化则像开发者”“CLAUDE.md 太长会漏关键信号”“hooks 不会忘记”“局部上下文能显著减少错误”都是作者主张；根 CLAUDE.md 容易重新变成大杂烩；skills 容易变成知识库；hooks 未配置或配置错会静默不触发；docs 不维护会过期；局部 CLAUDE.md 可能与根规则重复或冲突；没有测试和 formatter 时，hook 的收益有限；不要把五层结构当成一次性改造，必须一次只加一层并验证。
- AQ：v0.4.0、31 stars，作者自述 early and not audited；agent 的确认限制不是沙箱——会话靠 agent 设置的环境变量识别，同用户下的进程隐藏该变量即可带 `--yes` 跑同样命令，Antigravity 根本不文档化这个变量；规则是 agent 会执行的文本，风险扫描器和脱敏都是启发式的，要像读脚本一样读规则；加入团队时会安装你没读过的规则；创始人可以不经投票撤销某台设备，被撤销设备的选票作废，可能推翻原本成立的结果；root key 丢失则无人能被接纳或移除；无秘密投票；成员上限 64 人；从不投票的成员会让门槛更难达到；没有截止时间；无后台服务，node 仅 daemon 运行时可达；internet 模式向志愿者服务器暴露公钥和 IP；Windows 不支持；Linux 无窗口，所有决策走终端；不要把它当强安全边界或已审计方案。
- AR：TokenSafe 仅 30 stars，效果数据来自作者自报模拟基准，不是独立复现；`tokensafe stats` 的 92.5% 是示例输出，不是你的项目结果；团队缓存、托管蒸馏、按席位 ROI 需 TS2 license，开源核心 MIT；hook 适配器 fail-open，内部错误不会卡死 agent，但也意味着 guard 可能静默不拦；guard 的规则是确定性的，但覆盖范围有限；`smart_read_file` 需要传目标符号，符号名不对可能返回空或错；OpenAPI/Prisma/GraphQL/SQL 之外的格式不做结构化切片；`tokensafe mcp disable <server>` 会改 MCP 注册，先确认你不再需要那个 server；遥测默认状态需自己确认，`TOKENSAFE_TELEMETRY_DISABLED=1` 只保留本地功能；团队 endpoint 需要 license key；不要把它当完整安全审计或替代测试。

## 证据与来源

- A/B/C（Context Mode）：README 称 315 KB 变 5.4 KB、减少 98%；用代码思考示例里的 47 × Read() = 700 KB 变 1 × ctx_execute() = 3.6 KB 是 README 说法，未经验证。安装命令、hook 配置、平台差异来自 README；小范围试用结论来自调研报告。
- D（Quicksilver）：有 12 任务基准，部分任务准确率下降：日志 triage F1 54%→23%、Claude token −85%；安全审查 shortlist 100%→89%、−74%；在线回执格式来自 README；中位省 82% token 来自调研报告。自动调用可靠性、--fast 快 10 倍、安全排除规则覆盖面只是作者主张。
- E（claude-mem）：事实性内容来自 README；约 10x token savings 等只是作者主张；托管记忆、14 天试用、代币推广来自调研报告。F（headroom）：安装与命令来自 README；基准全部自报；HEADROOM_OUTPUT_HOLDOUT 与 measured 的对应来自 README。G（blurt）：两段真实会话测量来自 README；仓库 40 stars、macOS 为主来自调研报告；“原来两天、现在 30 分钟”等只是作者主张。
- H（mem0）：厂商自报 LoCoMo 71.4→92.5、LongMemEval 67.8→94.4、BEAM 等；关键局限是分数反映托管平台，包含开源 SDK 不具备的专有优化；ADD-only 只累积不覆盖。I（cognee）：事实性内容来自 README；BEAM 100K 0.79、BEAM 10M 0.67 是自报，且两个设置用了不同会话、不同摄取模型、不同检索选型流程。
- J（planning-with-files）：自测数据来自项目自述：基准 96.7% 断言通过（29/30）、3/3 盲测 A/B 获胜、磁盘计划把重新定位从 13.3 回合降到 5.0 回合、hook 单次触发优化后 289ms。需要自己复现。K（hivemind）：事实性内容来自 README；基准数据是作者自测；原文在 rules 一节的命令块未结束。
- L（共享 AGENTS.MD）：有依据的只有机制本身；原文在 Every repo 处截断；路径与规则内容都没有。判定指标和试用范围是本手册补的。M（CLAUDE.md / prompt-audit）：事实性内容来自推文；旧习惯拖累新模型没有对照实验；命令是否存在、输出形式、是否自动改写均未确认；A/B 指标是本手册补的。
- N（上下文预算审计）：事实性内容来自推文；原文没有一个数字、截图或对比实验；`/mcp` 之后怎么做缺失；怎么精简 CLAUDE.md 完全没给；观察指标与“一次只改一项”顺序是本手册补的。
- O（ctx-handoff）：事实性内容来自 README；实测数据包括 102k 对话 fork 中 102,003 token 从缓存读取、distill 在 476k 约 95 秒、800k 约 3 分钟、800k 时交接本身约 28 秒；阈值 600k 的合理性依据是间接引用；空闲缓存刷新等关键行为尚未实测。
- P（claude-auto-handoff）：事实性内容来自 README；一次阈值设 80k 的实际运行，mod 在阈值处拒绝一次读取、写简报、清空，新会话约 7 秒后回到工作、处于 31k；面板文案示例 `✓ handed off · 162k → 45k`；0.8.3 起简报必须写入真实数字，0.8.4 起不在 Handoff Numbers 里的 token 数字被标 `[unverified: not in Handoff Numbers]`。为何不用 auto-compact 是设计论断。
- Q（obie/auto-handoff）：事实性内容来自 README；没有量化数据或对照实验；“缓存过期后重读又慢又贵”“50 分钟默认值合理性”“交接收益”都只是作者主张；默认 50 分钟依赖一小时缓存；插件无法判断会话用的是哪种缓存。
- R（用一条提示词重组 AGENTS.md）：有依据的只有提示词模板本身；`/writing-for-agents` 是什么、怎么安装原文没有交代；三个子代理是并行还是串行、什么叫“更激进”原文未定义；只有互动量 1835 赞、102 转发、92 回复，不是效果证据。
- S（AGENTS.md 长度预算）：有依据的是两个阈值和一句机制：Claude Code 文档建议 200 行以内；Codex 默认最多读取 32 KiB、超出被跳过；两者都会在会话启动时读取 AGENTS.md。原文在此处被截断。“文件越长越不容易遵循”是作者主张，没有实验数据。测量方式、复查动作、四项判定指标、1–2 周单项目试用是本手册补的。
- T（autoCompactWindow，来自 @xiax0603 推文）：有依据的是参数名 autoCompactWindow、目标值 400k、默认 1M 触发压缩、7 天回溯实测每周省约 29% 额度、以及“不会出现严重的记忆退化”这一说法。原文没有给出写入方式、配置文件字段、环境变量名或启动参数，也没有给样本量、模型版本、每天会话数、任务类型、额度计算口径和图表原始数据。本手册补的一周对照记录、任务侧代价指标、与做法 N 的分工，是基于原文推导出的验证方式。
- U（subagentPromptCacheTtl，来自 @rryssf 推文）：有依据的只有断言与一个设置名——子代理提示缓存在闲置 5 分钟后过期；闲置超过 5 分钟的子代理会丢失提示缓存；下一次调用从头重写整个上下文，消耗的 token 是该缓存命中时的数倍；Anthropic 的指南涵盖一个可把窗口延长至一小时的设置；设置名 subagentPromptCacheTtl。原文在设置名之后被截断，取值、配置位置、用法、文档出处全部缺失。“消耗的 token 是缓存命中的数倍”是作者主张，没有实测数据。素材是一条推文（140 赞、21 转发、33 回复）。本手册补的基线测法、输出质量必查项、适用条件判断与单次实验时长，是基于原文推导出的验证方式。
- V（专用文件夹 + 根目录 CLAUDE.md，来自 @ch3nweiii 推文）：有依据的只有第 1、2 步和一句主张——把 CLAUDE.md 放在该文件夹根目录，它会加载到每一个会话。推文互动为 728 赞、83 转发、26 回复。原文第 3 步及之后缺失，没有命令、配置样例、CLAUDE.md 内容示例、权限边界的实现方式，也没有案例或效果数据；“这个文件夹是代理唯一能看到的世界”属于作者主张。本手册补的试用范围、观察指标、权限边界需另行验证。
- W（按触发条件增量配置 CLAUDE.md，来自 @Asteri_eth 推文）：有依据的只有一条增量配置规则和两个阈值性说法——不要在第一天把所有东西都设置好，等触发条件出现再添加；`01 CLAUDE.md` 对应始终开启的规则，当 Claude 两次违反约定时把规则放进去；因为每次会话都会加载，所以保持在 200 行以下。原文声称是 Anthropic 官方针对 Claude Code 的提示，但没有给出官方文档链接或原文出处。正文只完整展开 `01 CLAUDE.md`，`02 Skills` 在“按需使用”的处截断。没有数据、案例、对比实验。本手册补的基线记录、复查动作、任务侧指标、与 S/M/N 的分工，是基于原文推导出的试用方式。
- X（回看历史会话优化 AGENTS.md，来自 @thomaszhou_ 推文）：有依据的只有一条可复制 prompt，以及“这类优化几乎每个人都能用到”的主张。采集到的正文只保留第 1 条“科学优化你的 AGENTS.md”及其 prompt；prompt 让智能体回看最近 Codex 会话，找出一条似乎误导了智能体或导致不必要工作的 AGENTS.md 指令，并选出发生该问题时的原始用户提示词。原文只到定位问题，没有改写与验证步骤；优化后能否真的减少返工、降低多少纠正次数，原文没有任何数据、前后对比或案例。103 点赞 / 20 转发只是传播信号。本手册补的人工裁决、只改一条、保留版本、后续会话验证，是基于原文推导的试用方式。
- Y（按目录分层放置 CLAUDE.md，来自 @cyrilXBT 推文）：有依据的只有一条推文和三个目录规则示例：根文件保存库级规则；可在 `50_daily`、`projects/newsletter`、`research` 等文件夹放局部 CLAUDE.md，分别写“私人日记。只读。除非我要求，否则永不总结”“受众、语气、格式。永不编辑过去的期数”“每个声明都链接到其源笔记”。原文没有给出完整配置、工具名称、读取机制、读取顺序、冲突优先级、维护流程、操作录屏、案例数据或效果对比；Obsidian 本身是否读取 CLAUDE.md 取决于外部 AI 工具或插件。本手册补的最小验证、3–5 个真实小任务、指标与扩大条件，是基于原文推导的试用方式。
- Z（nomore）：有依据的是规则包下载与 @ 导入机制、CLI 命令与参数、README 列出的前 5 条规则，以及作者给出的挖掘过程数字：作者称读了近 10,000 条 issue，过滤后剩 7,994 条，其中标题含词的 7,897 条用于聚类；抓取日期 2026-10-24；排序公式 Σ(1 + reactions)，相似度阈值 0.5，最终人工挑出 20 条；前 5 条规则的背书度为 252、185、121、61、43 reactions；仓库 48 stars。CLI 自认是 preview，作者说团队会话里约三分之一建议才是真规则；规则包每条规则目前只建立在一个 issue 及其点赞数之上；规则挑选是手工的，选择过程不可复现；本地运行、不外发数据由作者声称；过滤器只针对英语、韩语、印尼语调优；没有任何前后对比数据表明装了规则包后纠正次数下降。本手册补的一周单项目试用、基线记录、同类纠正重复次数、采纳/删除比、规则膨胀反指标和停止条件，是基于原文推导的试用方式。
- AA（代码注释准入判据，来自 @davekiss 推文）：有依据的是一条推文正文和一句转述——把“这条信息是不是下一个 Claude 需要花多次工具调用才能搞明白的？”作为写每条代码注释后的自问；若答案不是明确的“是”，就删掉这条注释；保留解释 why 的注释，删除复述 what 的注释。推文作者归因为 Bun 的 CLAUDE.md、@jarredsumner 的测试。原文正文在 `If the answer isn't` 处被截断，本手册中的 `delete the comment` 是按语义补全，不是原文原话。互动量为 206 赞、7 转发、6 回复，只是传播信号；原文没有任何数据、案例、前后对比、仓库名或提交记录。本手册补的正反例、例外白名单、评审闭环、四项指标、1 周或 5 个 PR 的试用方式与判定规则，是基于原文推导的验证方式。
- AB（隐藏后台摘要 agent_summary，来自 flamerix-ai 的 gist）：有依据的是原文给出的 OTel 测量与版本表——DRIM 在 Claude Code OpenTelemetry 导出中发现，agent_summary 曾占全部 Claude Code 花费 16.4%、占全部 API 请求 19.7%，其中 96% 的花费在 Opus 上，输入 token 与输出 token 比约 9000:1；原文还引用 #86879 收集的四个独立测量为 18–26%；版本表给出 2.1.257、2.1.280、2.1.301、2.1.308、2.1.310、2.1.312 的静态检查和动态 fork 计数；周花费份额从 7 月的 3.5–7% 升到 7.3%、11.8%，10 月中约 16%；作者称在 2.1.301 上自 2026-10-26 日常使用以来 agent_summary 请求为 0；启动延迟一次测量为 `claude --version` 从约 10 ms 到约 17 ms。成本是 Claude Code 自身按请求估算的 cost_usd，不是发票。方案非官方、只在 Linux 实测、升级后 fail-open、可见副作用与适用条件来自原文自述。
- AC（harness 组织法，来自 @NahuiGPT 推文）：有依据的只有两条原则和一句效果判断——用“我能做/我知道”区分 skills 与文档；把 AGENTS.md 从一大段文本改成“如果 X 就看文档 Y”的规则规格集；原文称后一做法效果很好，不比 skills 差。原文没有给出 OKF 格式、目录结构、AGENTS.md 样例、命令、配置、前后对比数据或失败案例，且在第三条要点处截断。互动量 126 赞、4 转发、12 回复只是传播信号。本手册补的盘点步骤、最小试用、指标与扩大条件，是基于原文推导的试用方式。
- AD（用 Claude Code 读笔记库生成 CLAUDE.md，来自 @cyrilXBT 推文）：有依据的是前三步和一条可复制提示词——在 vault 根目录启动 Claude Code；输入 `read my vault and write a CLAUDE.md describing my folders, linking style and naming rules`；人工检查并修改它写错的地方。原文在 `add one line:` 处截断，第 4 步及之后缺失；没有展示生成后的 CLAUDE.md，没有准确率、耗时或案例对比；互动量 92 赞、13 转发、10 回复只是传播信号。本手册补的备份要求、三类错误标注、长度与 token 检查、同一批抽样任务对比，是基于原文推导的试用方式。
- AE（AGENTS.md 两条规则，来自 @eng_khairallah1 推文）：有依据的只有两条祈使句——本次会话中已经读过的文件，除非文件发生了变化，否则不要重复读取；任何超过五步的任务，先把计划写到一个文件里，并在每一步之后更新，这样崩溃或上下文压缩都不会丢失进度。原文在第二句结尾 `so a crash or a compaction never` 处被截断，完整表述缺失，本手册给出的补全句是自行补全的建议，不是原文。没有数据、没有案例、没有前后对比，也没有说明验证时用的模型或工具；互动数据 95 点赞、8 转发、33 回复属传播信号。本手册补的最小试用、五项观察指标、与做法 J 的差异说明，是基于原文推导的试用方式。
- AF（devilop，来自 mathew5612/devilop 调研报告）：有依据的是 README/调研报告给出的命令、客户端差异和安全前提——Node.js 22+；`node devilop.mjs open`；给代理 `Read the devilop guide and follow it: curl -s http://127.0.0.1:4317/agent`；Codex 走原生共享队列投递到确切已存在线程，Claude Code 走 opt-in MCP channel，Cursor 靠有界 receive 调用且空闲 IDE 聊天无法外部投递；queued 不等于 received；doing --progress、mark、check、watch、health、current status；`.devilop/token`；VM 访问默认关闭。限制是版本 0.26.1、40 stars，除 Codex 同对话投递外多数投递路径作者自认未验证；原文没有给出效果对比数据。本手册补的小范围试用顺序、指标和常见坑，是基于调研报告推导的试用方式。
- AG（/init 生成 AGENTS.md，来自 @goan999999 推文）：有依据的只有原文第 1 条——在项目根目录运行 `/init` 自动生成 AGENTS.md；把技术栈、代码风格、开发规范和禁区写全；原文称 Claude Code、Gemini CLI 也识别该文件；把文件提交进仓库、换工具时沿用同一份，也是原文第 1 条的做法。原文第 2 条 `codex exec：一行命令出结果` 起正文被截断，其余 11 个玩法无法评估，本手册没有据此补写任何步骤。原文没有给出 AGENTS.md 的模板或字段示例，四类信息只是原文点名的内容项；没有说明 `/init` 在不同工具下行为是否一致，也没有生成质量、案例或前后对比；“用上一半，效率直接翻倍”是宣传性表述，素材为个人推文、约 34 赞、4 次转发。本手册补的 `/init` 后续验证步骤、四类信息的人工补全要求、五项指标、1–2 周试用，以及与做法 S/R/W/X/L/AE/AC 的分工，是基于原文推导的试用方式。
- AH（防御性代码与改动范围规则，来自 @NIxinhai0 推文）：有依据的只有一条推文摘录，声称来自 OpenCode 仓库的 AGENTS.md——不要为几乎不会发生的竞态、边界问题臆测性增加防御代码；真要加防护，先说清楚会怎么出错、概率多大、增加多少代码，得到同意后再做，不得私自扩大改动范围；并配有“十行需求，写出百行防御，满屏假想敌”的问题描述。原文没有给出 OpenCode 仓库 AGENTS.md 的完整内容、文件路径、提交记录或对照实验；没有说明适用模型、项目类型、团队规模；“专治 Codex 老毛病”和“减少防御性代码”均为作者主张，未经数据验证；点赞/转发等互动数据只能说明传播度。本手册补的启动提示、diff 审查、最小试用、指标与停止条件，是基于原文推导的试用方式。
- AI（/doctor prompt-audit，来自 @bozhou_ai 推文）：有依据的只有推文正文——Claude Code 升级到 v2.1.283 或更高后，在已有 CLAUDE.md、AGENTS.md、.claude/ 的项目里运行 `/doctor prompt-audit`；按原文它会读取项目与用户级规则、技能和命令。原文在第 4 步截断，没有输出样例、解读、修正方法、前后对比或量化数据；v2.1.283 与子命令是否真实存在、`/doctor` 是否接受 prompt-audit 参数均未核实；互动量 32 赞、5 转、10 回复只是传播信号。本手册补的 `claude --version` 核对、保存输出、三分类标注、只改一条、复跑、15 分钟试用与停止条件，是基于原文推导的试用方式。
- AJ（先 grep 再局部读取，来自 @Voxyz_ai 推文）：有依据的只有一条完整规则和标题层面的主张——原文标题推荐把这些行加进 AGENTS.md；在读取整个文件之前，先 grep，只读需要的部分；原文在采集时被截断，只完整看到这一条，第二条只写到 `To understand the whole project, send a` 就断了，因此不能当作六条规则清单引用。原文主张“不再大量消耗 token”，但没有给出 token 消耗对比、任务成功率、耗时等任何数据；互动量 248 赞、8 转发、24 回复只是传播信号。适用条件：使用 Claude Code 且项目有 AGENTS.md；对需要通读全文的任务可能反而需要完整读取；非文本/非代码仓库中 grep first 未必成立。本手册补的对照试用、3–5 个典型任务、指标与收窄条件，是基于原文推导的验证方式。
- AK（多项目上下文管理，来自 Hacker News Ask HN 讨论帖）：有依据的是 40 条评论中多位实践者分享的具体做法：mceachen 建议为每个客户用不同用户名/登录隔离会话记录；marvstazar 的项目 CLAUDE.md/AGENTS.md 只做查找，详细规则放 rules/，docs/ 分 idea/plan/review；ksajadi 使用读-做-写循环 14 个月，决策记录带 approved/rejected/failed 状态；lp92 维护 master index 文档减少新会话扫描时间；synapsomorphy 要求每个实现回合以 commit 结束并保持工作树干净；charlesabarnes 使用 gitignored ADR 目录和 status doc；jen729w 用 Johnny.Decimal 编号和 jd CLI；cmrx64 用 cv 节省 40% token；hyldmo 用 farero.ai 把聊天存 SQLite 并注入 MCP 搜索。这些是轶事，没有对照实验；提问者主要痛点是重复解释和上下文丢失。本手册补的最小试用、观察指标和常见坑，是基于该讨论推导出的试用方式，不是原文实验结论。
- AL（指令文件与代码冲突裁决，来自 @LimestoneHQ 推文）：有依据的只有规则的两个要点和可照做的用户级路径——当指令文件与现有代码不一致时，以现有代码的约定为准；把每一处不一致报告出来，而不是默默按指令改写代码；Claude Code 写入 `~/.claude/CLAUDE.md`，Codex 写入 `~/.codex/AGENTS.md`。原文在 `follow the conventions` 处被截断，完整措辞与是否还有附加条件无法确认；本手册给出的补全句是推断，不是原文。原文称这是对某篇论文中 fix 的改写，但没有给出论文名称、链接或实验数据；互动量为 87 赞、0 转发、1 回复，只是传播信号；没有任何数据、案例或前后对比。“减少智能体擅自改风格”是作者及初筛理由的判断，原文未提供验证。用户级配置对所有仓库生效、某些仓库的指令文件恰恰用于纠正坏味道、两个工具加载范围与优先级未必一致，这些是本手册补的风险提示。
- AM（指令文件巡检提示词，来自 @LimestoneHQ 推文）：有依据的是一段可直接复用的任务提示和初始扫描对象——`Find the stale lines in this repo's agent instruction files, and the rules that must never break but only live in prose. Change nothing until I approve.`；扫描对象列出 `every CLAUDE.md, including the local and imported ones, .claude/rules,` 后原文截断。推文有 99 个点赞、3 次转发、1 条回复，但这些只是传播数据，不构成效果证据。原文缺少完整文件清单、输出格式、过时条目的判定标准、硬规则提取标准、批准后的修改流程和验证方法；没有案例或数据证明能减少错误。本手册补的两类清单输出格式、人工逐条裁决、只批准一条、复跑对比，是基于原文推导的试用方式，不是原文实验结论。
- AN（Modern Web Guidance，来自 Chrome 官方 1.0 公告与 @don_tech1 推文）：有依据的是官方公告给出的 1.0 功能清单、安装与更新命令、现代化斜杠命令、与 Chrome DevTools for agents 的具体搭配场景，以及多个公司案例和量化指标：安装 `npx modern-web-guidance@latest install`；更新 `npx modern-web-guidance@latest update`；现代化 `/modern-web-guidance Modernize the code in this directory`；分析 HTML、CSS、JavaScript 和 package.json；首版静态分析覆盖有限模式；DevTools 搭配包括低端 CPU 性能追踪、弹窗/对话框动画与 prefers-reduced-motion 检查、SPA 视图缓存内存检查；Pensionbazaar 交付从约 4 天降到几小时、UI 错误降 90% 以上；Policybazaar 手动审计工作量降 92%；WeTV 90% 的失败性能检查可自动诊断解决、调试时间降 87%；note 现代 Web 检查通过率从 61% 到 94%、LCP 图片优先级提升 28%；MetaMask 5 周约 480 个 PR、64 条评论、43 个修复、中位 15 分钟修复。官方公告还点名 Claude Code、Codex、Cursor、Antigravity、Copilot、WebStorm、Kimi Code、Grok Build 等插件市场，但材料未展开每个市场的安装细节；MetaMask 的三行指令未给出原文。推文给出的可执行物是 `npx modern-web-guidance`、212 个现代 Web 特性、56%→88% 通过率，并声称支持 Claude Code、Codex、Copilot、Antigravity；推文没有任务集、样本量、评分标准、基线配置和复现实验，56%→88% 只能当待验证假设。当前材料对特性数量说法不一：一处为 250 项（CSS 140 / HTML 36 / JS 74），推文说 212 项；官方 1.0 公告未在材料中给出数量。Chrome 官方公告与推文均未提供独立复现实验；案例指标为厂商或客户自报；公共评估面板和 GitHub 仓库未在材料中展开；“数百个知识缺口”“完整评估覆盖”等属于作者主张。本手册补的零安装试用顺序、路线 A/路线 B 选择、前后对照、人工评审 checklist、指标与试用时长，是基于官方公告和推文推导的试用方式，不是原文实验结论。
- AO（pxpipe，来自 @bebuu_ai 推文）：有依据的是原文给出的启动命令 `pxpipe warp -- claude`、机制描述（约 48,000 字符 / 约 25,000 文本 token/轮 → 约 2,700 视觉 token，约 1/9）、单次真实会话账单 $42.21→$6.06（按原文数字推算约降 86%）。原文只有一条推文，没有 README、安装说明、issue 或第三方复现；安装步骤、配置项、支持模型版本均未给出；仓库链接在采集时断行为 `github.com/teamchong/pxpi / pe`，需自行补全为 https://github.com/teamchong/pxpipe 并以仓库 README 为准；原文出现的模型名 Claude Fable 5.2、Opus 5.5 与已知命名不符，无法核实；“视觉输入不损失工具准确率”“该降幅可代表一般情况”只是作者主张，无对照、无任务类型、无失败案例。与提示词缓存的关系、图片清晰度与识别质量、不同模型图片 token 计价与上限、长会话延迟、隐私留存均需实测。本手册补的同任务对照、2–3 个不同规模任务、成本门槛（降幅 >50% 值得继续）和停止条件，是基于原文推导的试用方式，不是原文实验结论。
- AP（五层结构，来自 @swadeshkumar_ 推文）：有依据的是原文给出的五类文件/目录及其示例用途：根 CLAUDE.md 放 Purpose、Repo map、Rules + commands；`.claude/skills/` 示例为代码审查清单、重构 playbook、调试流程、发布流程；`.claude/hooks/` 示例为编辑后 formatter、核心改动后测试、阻止敏感目录（auth、billing、migrations）；`docs/` 放架构概览、ADR、运维 runbook；局部 CLAUDE.md 示例为 `src/auth/CLAUDE.md`、`src/persistence/CLAUDE.md`、`infra/CLAUDE.md`。原文没有代码、配置、提示词模板、数据、案例或对照实验。属于作者主张的内容包括：仓库乱则 Claude 像聊天机器人、结构化则像开发者；CLAUDE.md 太长会漏关键信号；hooks 不会忘记；局部上下文能显著减少错误。这些均未给出量化证据。适用条件：Claude Code 用户；仓库可改造；团队接受把流程写成文件；敏感目录和自动动作需要实际配置 hooks 才能生效。对非编码工作、无法结构化仓库的场景，原文没有证据。本手册补的最小试用、指标、与 AG/S/R/AC/AH/AN 的分工，是基于原文推导的试用方式，不是原文实验结论。
- AQ（PeerHarness，来自 aryehlev/PeerHarness 调研报告）：有依据的是 README 给出的完整安装与 setup 命令、五步单人试用脚本、三步邀请流程、一张投票弹窗原文、`peerharness demo` 的 abridged 输出（Alice 赞成、Carol 以“CI 镜像只有 npm”为由反对并留档、Bob 赞成后 2/3 通过；Mallory 不在名册被拒；创始人 root key 签的章程仍被各节点拒绝）、五条不可关闭的不变量，以及 `docs/terminal.md`、`docs/limits.md`、`docs/checked.md`、`docs/security-model.md` 等文档入口。项目版本 v0.4.0、31 stars、MIT 或 Apache-2.0 双许可，作者自述 2026 年 11 月 9 日至 11 日用 Claude Code 写成。所有关于“更动态更民主”“团队会照着做”的论断、效果层面的任何收益、安全性上的保证都属于作者主张，作者自称 not audited，测试方法只指向 `docs/checked.md`，本次材料未包含该文件。原文自陈的局限包括：agent 的确认限制不是沙箱；规则是 agent 会执行的文本，风险扫描器和脱敏都是启发式的；加入团队时会安装你没读过的规则；创始人可以不经投票撤销某台设备；无秘密投票；成员上限 64 人；从不投票的成员会让门槛更难达到；没有截止时间；无后台服务；internet 模式向志愿者服务器暴露公钥和 IP；Windows 不支持；Linux 无窗口。本手册补的最小试用、指标和常见坑，是基于该调研报告推导的试用方式，不是原文实验结论。
- AR（TokenSafe，来自 tokensafe-dev/tokensafe 调研报告）：有依据的是 README 给出的安装命令（`npx tokensafe`、`pip install tokensafe && tokensafe`、`curl -fsSL https://tokensafe.dev/install.sh | bash`）、MCP 配置 JSON、按 agent 的接入方式表、`tokensafe doctor`、`tokensafe guard audit`、`tokensafe test "..."`、`tokensafe graph`、`tokensafe mcp disable <server>`、`tokensafe stats` 的输出示例、`tokensafe digest`、`tokensafe activate TS2....`、`TOKENSAFE_TELEMETRY_DISABLED=1`、13 个本地 MCP 工具的用途、支持 11 种语言的 AST 骨架化、OpenAPI/Prisma/GraphQL/SQL 切片、命令净化、guard 拦截项、Append-Only Epoch Governor 冻结到上下文窗口 80%、PromptCacheNormalizer 注入 `cache_control` 与 `prompt_cache_key`、区分 measured / estimated、开源核心 MIT、团队缓存与托管蒸馏与按席位 ROI 需 TS2 license、hook 适配器 fail-open。原文自报的 92.5% 等效率数字来自作者自报模拟基准；项目仅 30 stars；团队级能力需付费 license。本手册补的最小试用、指标和常见坑，是基于该调研报告推导的试用方式，不是原文实验结论。

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
- [@rryssf: 人们损失了这么多令牌，却对此一无所知：](../research/radar/2026-10-14/3028-item.md)：值得一试，建议在 Claude Code 里小范围试一下把子代理提示缓存 TTL 从默认 5 分钟延长到 1 小时，用它来省掉闲置后重建上下文的重复 token 开销；但原文的配置片段被截断、取值缺失且无官方出处，必须先核对官方文档再落地。
- [@ch3nweiii: 这变得他妈的危险了：Anthropic 分别记录了这些每一个部分，但没人注意到它们加起来是什么](../research/radar/2026-10-17/4255-anthropic.md)：值得一试，建议小范围试：把 Claude Code 限定在专用项目文件夹，并在根目录用 CLAUDE.md 固化规则，可减少重复粘贴上下文；但原文只给到前两步，权限边界和第3步缺失，不能直接当完整方案采用。
- [@Asteri_eth: Anthropic 官方针对 Claude Code 的提示：不要在第一天就把所有东西都设置好。当触发条件出现时再添加每个部分](../research/radar/2026-10-20/5017-anthropic-claude-code.md)：值得一试，建议小范围试：用“Claude 两次违反约定后才写入 CLAUDE.md，并保持在 200 行以内”这一条增量配置规则，先在一个 Claude Code 项目里跑通；原文只完整展开第 01 条且正文截断，不足以直接 adopt 全套做法。
- [@thomaszhou_: 很有用的最佳实践！AGENTS.md的优化几乎每个人都能用到。](../research/radar/2026-10-23/5999-agents-md.md)：值得一试，可以把这条 prompt 当作给 AGENTS.md 做检查的第一步：在 Codex 里运行一次，找出实际导致智能体被误导或返工的指令及其触发时原始用户提示词，然后人工改写，并用后续会话验证；理由是它给出了可直接复制的 prompt，且针对的是真实历史会话中的证据，但原文只到定位问题这一步，没有改写与验证步骤。
- [@cyrilXBT: 大多数人在他们的 Obsidian 库中放置一个 CLAUDE.md 文件。](../research/radar/2026-10-25/6901-obsidian-claude-md.md)：值得一试，可按目录分层放置 CLAUDE.md：根文件写库级规则，各文件夹写局部只读、编辑和引用规则，先在一个目录小范围试用。原文给出了可照做的目录级规则示例，但没有工具配置细节和效果证据，需先验证所用 AI 工具是否会读取局部规则。
- [globalmpc/nomore](../research/radar/2026-10-27/7487-globalmpc-nomore.md)：值得一试，装规则包，并在单个项目里试运行 `npx nomore --project . --apply`，把反复纠正过的话固化成 CLAUDE.md 规则；这样做的理由是有可直接执行的命令和人工确认环节，但作者说 CLI 仍是 preview、约三分之一的建议才是真规则，只能小范围验证后再决定是否推广。
- [@davekiss: Most of the code comments your agent writes should be deleted](../research/radar/2026-10-28/7841-most-of-the-code-comments-your-agent-writes-should.md)：值得一试，把“这条信息是否值得下一个 Claude 花多次工具调用才能搞明白”这句自问写进 CLAUDE.md/AGENTS.md，先在一个仓库试一周，用注释密度和 review 中因看不懂而产生的追问数双向验证；判据本身一句话可落地、成本极低，但原文在此处被截断且无任何数据支撑，只能小范围试而不能直接定为规范。
- [Claude Code burns ~15–20% of your tokens on a 3-word status line](../research/radar/2026-10-29/8115-claude-code-burns-15-20-of-your-tokens-on-a-3-word.md)：值得一试，建议在 Linux 单机、非关键项目的 Claude Code 上小范围试用：用 Bun preload 关闭 agent_summary，并以日志和 OpenTelemetry 验证 agent_summary 归零且没有替代 side-query。先不要全量默认采用，因为该方案非官方、依赖版本内部字符串、仅 Linux 实测，升级后可能静默失效，并需自行检查服务条款。
- [@NahuiGPT: 本周推进了团队内部开发用的harness改革。](../research/radar/2026-10-31/8731-harness.md)：值得一试，可小范围试用“能力入 skills、知识入 docs/、AGENTS.md 做条件路由”的 harness 组织法，因为它把上下文供给从堆文本改成可检索规则；但原文未给 OKF 格式和 AGENTS.md 样例，需自行补齐并验证。
- [@cyrilXBT: this is pure f*cking gold](../research/radar/2026-10-31/8783-this-is-pure-f-cking-gold.md)：值得一试，建议小范围试：在笔记库副本根目录启动 Claude Code，用原文提示词生成 CLAUDE.md 后人工校正；理由是步骤具体、提示词可复制，但原文第四步被截断且无验证数据，不适合直接 adopt。
- [@eng_khairallah1: Vibecoders, 𝗜'𝗺 𝗯𝗲𝗴𝗴𝗶𝗻𝗴 𝘆𝗼𝘂, add these lines to your AGENTS.md:](../research/radar/2026-11-01/9289-vibecoders-add-these-lines-to-your-agents-md.md)：值得一试，把这两条规则原样加进仓库根目录的 AGENTS.md（已读文件不重复读；超过五步的任务先写计划文件、每步后更新），然后在自己的长任务上前后对比试跑。理由：规则具体、可直接粘贴、成本几乎为零，但原文只是作者的主张，没有给任何数据或案例，且正文在第二句处被截断，只能小范围验证后再定。
- [mathew5612/devilop](../research/radar/2026-11-02/9417-mathew5612-devilop.md)：值得一试，把 devilop 当作“给编码代理供结构与界面上下文”的交接层来小范围试：用一张可分级阅读的产品地图承载上下文，用 Requests/Finish edits 把界面改动打包回当前对话，并用 check/health/watch 把“是否真做完”变成可查状态；理由是命令与客户端差异都写得很具体、可直接照做，但版本仅 0.26.1（40 stars），除 Codex 同对话投递外多数投递路径作者自认未验证，暂不宜直接采用。
- [@goan999999: Codex 这 12 个提效玩法，用上一半，效率直接翻倍！](../research/radar/2026-11-03/9712-codex-12.md)：值得一试，只用得上原文第 1 条：在项目根目录运行 /init 生成 AGENTS.md，并把技术栈、代码风格、开发规范和禁区写全；这份文件 Claude Code、Gemini CLI 也读取，可作为多工具共用的约束文件小范围试用。第 2 条起正文被截断，无法判断其余 11 个玩法，暂不纳入。
- [@NIxinhai0: OpenCode 仓库这份 AGENTS.md，专治 Codex 老毛病：](../research/radar/2026-11-03/10008-opencode-agents-md-codex.md)：值得一试，可以把这条 AGENTS.md 规则原样加入编码代理的项目级指令，在少量代码修改任务上试用，观察是否减少臆测性防护和越界改动；原文只有一条规则摘录，缺少完整配置和效果数据，因此先小范围试，不宜直接采用。
- [@bozhou_ai: 快给你的Claude Code做个体检，官方有一个命令可以全局审计你的CLAUDE.md文件，使用步骤如下:](../research/radar/2026-11-07/11061-claude-code-claude-md.md)：值得一试，可以小范围试：先升级 Claude Code 并运行 /doctor prompt-audit，确认这条命令真实存在、输出什么，再按它指出的问题清理 CLAUDE.md 与 .claude 规则；理由是原文给出了可照做的命令入口，但正文在第 4 步被截断，缺少输出解读与修正方法，效果尚无任何证据。
- [@Voxyz_ai: Highly recommend adding 𝘁𝗵𝗲𝘀𝗲 𝟲 𝗹𝗶𝗻𝗲𝘀 to your AGENTS.md.](../research/radar/2026-11-09/11737-highly-recommend-adding-to-your-agents-md.md)：值得一试，可以把推文中可复制的那条“先 grep 再局部读取”规则加进 AGENTS.md 小范围试用，它给出了明确、可执行的上下文节省指令；但原文被截断，六条只见到一两条，且没有量化数据，不宜整体照搬。
- [Ask HN: How do you manage your AI agents' context across clients and projects?](../research/radar/2026-11-09/11818-ask-hn-how-do-you-manage-your-ai-agents-context-ac.md)：值得一试，建议小范围试：采用“每个客户/项目独立目录 + AGENTS.md 入口 + 规则/文档文件夹 + 读-做-写决策记录”的组合工作流，能明显减少重复解释和上下文丢失。理由：论坛中多位实践者给出了可复制的具体结构和提示词，且已有 Claude Code 等工具支持。
- [@LimestoneHQ: Our version of the paper's fix keeps its two parts: follow the code, and report every mismatch. It g](../research/radar/2026-11-10/12237-our-version-of-the-paper-s-fix-keeps-its-two-parts.md)：值得一试，把“指令文件与现有代码冲突时按代码约定执行、并逐条报告不一致”写进用户级指令文件（~/.claude/CLAUDE.md 或 ~/.codex/AGENTS.md），成本极低，值得先在小范围试行；理由是它能直接约束智能体擅自改风格这一常见失败模式，但原文被截断、规则措辞不完整，且没有任何数据支撑，所以只能小范围试用，不能直接写进手册当标准做法。
- [@LimestoneHQ: <task>](../research/radar/2026-11-10/12238-task.md)：值得一试，建议小范围试：把它作为 agent 指令文件的巡检提示，在只读或审批模式下先列出过时条目和只写在散文里的硬规则，再人工决定是否修改；原文在扫描范围处截断，需补全后再复用。
- [Show HN: Get your coding agent off ~2019 JavaScript, onto modern web primitives](../research/radar/2026-11-11/12363-show-hn-get-your-coding-agent-off-2019-javascript-.md)：值得一试，在前端代码库上小范围试：先用 npx 跑 search/retrieve/legacy-scan 验证指南质量和旧模式命中情况，再决定是否 install 并接入日常编码智能体。理由是指令与流程都现成可照抄，但效果证据只有作者主张，需自行用前后对比验证。
- [Modern Web Guidance 1.0: The web platform expertise your coding agent is missing](../research/radar/2026-11-12/12806-modern-web-guidance-1-0-the-web-platform-expertise.md)：值得一试，建议在 Web 前端项目中小范围试用：按原文命令安装 Modern Web Guidance，并让编码智能体在现有代码库上执行现代化检查，同时用 Chrome DevTools for agents 做运行时验证。理由是原文给出了可复制的安装/更新命令和 agent 工作流，但效果数据主要来自厂商案例，且只适用于 Web 前端任务。
- [@don_tech1: 牛逼！谷歌官方：AI 写前端，默认停在 2019 年水平。](../research/radar/2026-11-12/12852-ai-2019.md)：值得一试，可在一个前端仓库小范围试装 modern-web-guidance，用同一批任务做前后对比；推文只给出一行安装命令和 56%→88% 的二手数字，缺少评测与注入细节，暂不宜直接采纳。
- [@bebuu_ai: A developer built an open-source proxy called pxpipe that cut a real Claude Fable 5.2 coding session](../research/radar/2026-11-13/12919-a-developer-built-an-open-source-proxy-called-pxpi.md)：值得一试，先跑一次同任务的对照会话，验证 pxpipe 的真实降幅和工具调用准确率，再决定是否把它作为 Claude Code 的默认启动方式；原文只给了一条启动命令和一次会话账单，机制说得通，但收益很可能被提示词缓存、图片重传等因素抵消，必须自己测。
- [@swadeshkumar_: Most people think using Claude Code is about writing better prompts.](../research/radar/2026-11-13/12977-most-people-think-using-claude-code-is-about-writi.md)：值得一试，建议小范围试：按原文的五层结构改造一个 Claude Code 仓库，先用短 CLAUDE.md 固定目的、地图和规则，再把重复流程做成 skills、把必须自动执行的动作做成 hooks，并为高风险模块加局部 CLAUDE.md。理由是它把临时提示转成持久上下文和护栏，但原文只有结构建议，没有可直接复制的配置和数据，需要自行验证。
- [aryehlev/PeerHarness](../research/radar/2026-11-13/13028-aryehlev-peerharness.md)：值得一试，如果你使用 Claude Code 且团队有多条跨仓库的个人偏好规则要统一，就照着 README 的五步在单人环境下试一遍（用 `peerharness demo` 或真实纠正各走一次），再决定是否让第二个成员加入；理由是它给出了可照做的安装、试用、投票、治理命令，且纠正→规则→投票→下发整条链路都能跑通，但 v0.4.0 尚未审计、非沙箱、缺效果度量，暂不宜作团队强制标准。
- [tokensafe-dev/tokensafe](../research/radar/2026-11-13/13031-tokensafe-dev-tokensafe.md)：值得一试，建议先在一个仓库、一个 agent 上小范围试用：只启用本地 AST 切片、命令净化和 guard 拦截，对比 token 消耗与一次通过率，再决定是否上团队缓存；理由是安装与 MCP 配置都有可直接照抄的命令，但效果数据来自作者自报的模拟基准，项目仅 30 stars，且团队级能力需付费 license。
