# 把专家经验蒸馏成可复用技能：从一个人到一套领域方法论

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当你反复需要某个人的判断方式，或反复需要一套成体系的领域方法论时，把它固化成可按需加载的技能，并用真实任务做带／不带技能的对照，而不是凭安装成功就当成改善。
> 先试这一步：挑一位同事，只喂他本人的设计文档或评审意见，用 Distilly 生成一份 colleague profile，再用 3–5 个他平时会被问到的真实问题做「带 Skill / 不带 Skill」对照。
> 最近修订：2026-10-13

## 解决什么问题

你已经在用编码 agent、写作 agent 或通用 agent，但每次都要重复描述同一套规范，或者不确定装一个技能包是否真的减少了返工——甚至因为一次装太多，上下文反而更乱。这篇手册给出一个可照做的流程：先小范围试装一个现成技能包，用同一任务做有/无技能的对照，确认有效后再考虑把自己的重复工作写成 `SKILL.md`，或者把一本反复查阅的技术书、一份内部文档、或一套 AI 研究全流程知识转成按需加载的技能。

它也覆盖一批具体场景：让 agent 代理编码 CLI 跑长任务并拿硬证据验收；给 agent 补行业设计知识；把一句模糊想法写成可让 agent 独立跑几小时的任务书；写一个把会话状态嵌进界面的 Claude Code mod；让 agent 把一句话描述／一个代码仓库变成可交互的架构图、工作流图、时序图、数据流图、生命周期图；让 agent 检索中国金融市场数据；把移动端模拟器与真机画面接进 Codex 聊天；把多步复杂任务拆成三阶段并加门禁；把中英文学术写作去模板化改写并用命题级核对保住数字、引文与证据强度；让路由技能自动选工作流并对 bug 交出失败→通过证据；按职能只装少量 agent 角色并用真实任务与默认提示对照；在 T3 Code 里用 p3-stack 按 playbook 路由并用 worktree 与 PR 监视减少等待和冲突；审计并改进自己的 `SKILL.md`；让 agent 把结论、方案对比、多步流程、仓库模块、逐句批注、时间线和一段历史渲染成一页可离线打开的单文件 HTML；把自己的 `SKILL.md` 校验、打包并分发到多端；给 agent 补一块 SwiftUI 领域知识并按需触发审查；给工作写作去 AI 腔并保住事实与承诺强度；把产品经理的重复流程交给 agent 跑成命令链；给编码 agent 立四条硬约束；让 agent 按阶段从零建一个网站，并在中途停下后仅凭状态文件继续（做法 AL）；以及给 agent 补 AI 研究全流程知识（微调、推理服务、分布式训练、评估、论文写作等）。

新增做法 AK：当你需要给 agent 补 AI 研究全流程知识，或想抄一套可迁移的技能目录规范来整理内部知识时，用 `Orchestra-Research/AI-Research-SKILLs`，按类别只装 1 个技能，在真实研究任务上做有/无技能对照；同时把它的 `skill-name/SKILL.md + references/` 目录规范抄来整理自己的文档。

新增做法 AL：当你有一条多阶段、跨多天、会中途停下的长流程（典型是从零建一个网站：名称与 Logo → 用真实搜索数据做调研 → 文案 → 设计方向 → 构建 → 检查 → 上线 → 上线后在 Google 和 ChatGPT 里复测），用 `Julian-Ivanov/website-bauen` 这类「skill + 状态文件 + 按阶段接工具」的打包方式试一次：只跑到调研／设计方向阶段就叫停，检查每阶段产出物能否直接用，再用 `WEBSITE-STATUS.md` 断点续做一次。即使你不需要建站，也可以只借鉴这套打包思路，把进度写进一个状态文件、外部工具放到真正需要它的阶段才接入。

新增做法 AM：当某位同事（或导师、上下游）的判断方式、评审标准和表达习惯反复出现在你的工作里，想把它固化成可反复调用的技能时，用 `titanwings/distilly` 按「选家族 → 按素材优先级喂一手素材 → 生成 Person Profile → 用真实问题做带/不带对照」试一次：先只喂他本人的长文写作或评审意见（最高优先级素材），生成 colleague profile，再拿 3–5 个他平时会被问到的真实问题对照。同时把它三条维护机制（追加文件增量合并不覆盖、对话纠正写入 Correction 层立即生效、每次更新自动归档可回滚）当成你自建技能时的参考。

新增做法 AN：当你有一套成体系的领域方法论（代码评审、故障排查、合规检查等）要交给 agent，并希望「不用就不占上下文」时，照 `SnailSploit/claude-red` 的交付方式做一次：把你的方法论拆成细粒度的 `Skills/<类别>/<技能名>/SKILL.md`，按对话触发词按需加载；需要时用 `claude --system-file -` 把某份 `SKILL.md` 注入，或在 Claude.ai 项目里手工粘贴。该仓库自带的是进攻性安全技能，只在授权红队、漏洞赏金、安全研究、CTF 等合法场景使用；它的价值是交付模板与粒度设计，不是内容本身。

## 适用与不适用

适用：

- 你已经在用 Claude Code、Codex CLI、Cursor、Gemini CLI 或类似 agent，有一类反复出现、有明确规范的任务。
- 愿意在一个非关键项目上做一周对照，而不是安装成功就认为改善。
- 需要给 agent 补一块领域知识：UI/UX 设计、Postgres、Google 产品与技术、中国金融市场数据、移动端模拟器与真机观测、中英文学术写作、SwiftUI / Apple 平台开发、工作写作去 AI 腔、AI 研究全流程（做法 AK）。
- 需要把文档站点、仓库、PDF、技术书或内部 `docs/` 变成按需加载的技能。
- 有一类多步、有明确交付物的复杂任务，希望分阶段推进、每阶段独立质检。
- 反复写或审中文技术文档，或反复改写中英文学术写作并要核对命题。
- 需要给 agent 补模型端点、工具权限或网页搜索能力，或想给 Claude Code 会话加一层界面与拦截能力。
- 需要从一个大插件市场按任务只装一个单元，或一次装齐全栈开发技能并按请求自动激活。
- 想让 agent 自己选工作流并对 bug 交出失败与通过的证据。
- 想按职能给 agent 补一个专业角色，并且只装少量角色。
- 已经在 T3 Code 环境里工作，想让路由技能按 playbook 挑流程，并用 worktree、PR 监视、定时任务和线程记忆减少手工轮询与冲突。
- 已经在写自己的 `SKILL.md`，想审计它、校验它、打包并分发到多端。
- 经常需要把结论、方案对比、多步流程、仓库结构、逐句批注、时间线或一段历史讲成一页带图表的说明。
- 做 SwiftUI / iOS 开发，希望 agent 写或审代码时自动带上现代 API、无障碍、性能与状态管理常识。
- 工作写作需要去 AI 腔，又不能让承诺、条件、道歉语气被改写掉。
- 做开放式研究，有边界清楚、能判定对错的小型开放问题，愿意让 agent 维护地图、证据分级并接受独立裁判。
- 做产品管理工作：有一句真实想法要拆成假设与实验、要写 PRD、要定北极星指标、要规划一次发布，且你用的 agent 能装插件或能拷 skills 目录。
- 经常把非琐碎的代码改动、重构或修 bug 交给 Claude Code 或 Cursor，希望它先写假设、不猜、不顺手重构、按可验证目标跑完（做法 AJ）。
- 要做 AI 研究相关任务（微调 Llama 3、优化 vLLM 推理延迟、扩到 100 GPU、评估模型等），想让 agent 带上对应类别的技能和深度文档（做法 AK）。
- 想抄一套 `SKILL.md` 加 `references/` 的技能目录规范，用来整理自己已有的内部知识（做法 AK）。
- 有一条多阶段、跨多天的长流程，希望把它打包成技能、用状态文件跨会话续做、并且只在需要它的阶段才去配置外部工具和账号（做法 AL）。
- 想小范围试一次「从零建站」的前半程，验证「skill + 状态文件 + 阶段化接工具」这套形态是否成立（做法 AL）。
- 想把某位同事、导师或上下游的判断方式、评审标准与表达习惯固化成可反复调用的技能，并愿意用真实问题做带/不带对照（做法 AM）。
- 需要把一套成体系的领域方法论拆成细粒度技能文件，做到按需加载、不用不占上下文，并能在 Claude Code、Claude.ai 等不同通道交付（做法 AN）。

不适用：

- 没有明确重复任务，只想“装个工具看看”；不愿做对照验证，只凭安装成功就认为改善。
- 直接在生产关键项目上全量安装；一次装完整个插件市场。
- 只看 stars、README 徽章或 CI 状态就决定采用。
- 只是想改拼写或一行显然的改动，却套整套四条原则；不备份直接覆盖项目原有 CLAUDE.md；把四条原则或 stars 当效果证据（做法 AJ）。
- 只有 README、没有 skill 本体细节和效果数据，却直接把它当成熟流程全量采用；或第一次试用就走完上线环节（做法 AL）。
- 各做法自己的边界见对应小节。例如：E 只针对中文技术文档；F 只针对生物医学论文；M 不适用于无合法访问权的书或打算再分发第三方版权书生成的 skill；O 只在 Postgres / TimescaleDB / PostGIS 任务上有用；P 只对自有或书面授权资产；Q 的领域内容不通用；T 不支持直接驱动交易或投顾建议；U 需要 Apple Silicon Mac + Codex desktop + 私有仓库访问权；X 面向全栈开发；Y 需要能加载完整 Skill 文件夹的环境，且 DOCX 抽取保留不了复杂样式、批注、修订记录、脚注与文本框；AF 只覆盖 SwiftUI / Apple 平台开发；AG 的材料没有覆盖合同或其他法律文件，也不承诺通过 AI 检测器；AH 主要面向数学/理论科学/算法类开放式研究；AI 的材料只有 README；AJ 只面向会读 CLAUDE.md 的编码智能体；AK 的材料只有 README，单个技能的 `SKILL.md` 正文没随材料给出，技能数在 README 内自相矛盾（标题 98，Roadmap 写 87），效果必须自测；AL 的材料只有 README，skill 本体的阶段步骤、提示词与检查标准都看不到，README 未给任何案例、耗时或成功率数字，且含 DataForSEO 联盟链接，要走完全程还需第三方付费账号（DataForSEO、webhosting）；AM 的材料只有 README，项目自述仍是 demo 版，`INSTALL.md` / `INSTALL_EN.md` 与 `SKILL.md` 实现细节都没给到，三个 demo 都是挑选过的对话展示、无对照组无评测数字，且素材涉及他人聊天记录与个人信息而原文完全没有讨论授权与隐私；AN 的材料只有 README，没有任何一份 `SKILL.md` 的实际内容、frontmatter 示例或撰写模板（模板在未随材料给出的 `CONTRIBUTING.md` 里），也没有任何评测数据，且内容属进攻性安全领域、适用范围受授权条件限制。

## 前置条件

通用：

- Node.js ≥ 18，npm/npx 可用；Git 可用。
- 一个可回滚的非关键项目，不要在主仓库或用户主目录下做项目级安装。
- 对目标技能目录有写权限，如 `~/.claude/skills/`、`~/.agents/skills/`、`~/.cursor/skills/`。
- 走 MCP 时，配置文件里写绝对路径。
- 安装第三方技能前，先通读它的 `SKILL.md`，并跑运行时的 doctor/audit 工具。

各做法额外前置（压缩保留）：

- A：无额外。B：一件每周重复、有明文规范的工作。C：`pip install skill-seekers`。D：你的提供商端点与 key，以及你网关实际提供的模型名。E：可用的 `npx` 或 `git`；可选装 autocorrect。F：宿主能读 PDF/图像。G：Claude Code 2.1.287 或更高。H：Cline CLI；Python 3；支持 Agent Skills 规范的宿主。I：Node/npm 装 CLI；本机 Python 3.x。J：本地 Node 环境。K：一个受支持的 Agent Skills 宿主。L：Claude Code 或 `gh`/可用 `npx`。M：本机 Python 并能安装抽取器。N：支持 Agent Skills 的 Agent；git、`CLAUDE.md`/`AGENTS.md`、`docs/`。O：本机 `npx`；目标 agent 支持 Agent Skills 或 MCP。P：已装 Claude Code；只对自有或书面授权资产使用。Q：支持本地 Skills 的宿主；可写的 `PROJECT_ROOT` 与只读的 `SKILL_ROOT` 分开。R：支持 agent skills 的编码 agent。S：Node.js/npx；Google Cloud 账号、项目和权限。T：Node.js 22.20+ / npm；Python 3.9+。U：Codex desktop + Apple Silicon Mac；Xcode 26+ 与 simulator runtime。V：本机已安装 Claude Code。W：Node.js；`SKILL.md`、`references/`、`scripts/` 三部分放在一起。X：已安装并使用 Claude Code。Y：Python 3.10+；PDF 文本抽取需 Poppler。Z：先装好对应 harness；Codex 需先通过 `/hooks` 信任路由 hook。AA：本地有 git 与 bash。AB：一台能跑 T3 Code 的机器。AC：Claude Code 环境或 claude.ai 账号；本地 Python 3.8+。AD：Node.js ≥ 20；agent 能执行 shell 命令。AE：用现成技能需要 Claude Code 或支持 Agent Skills 的 agent；用这套流程分发自己的技能，只需 Claude Code + Python 3。AF：用支持 Agent Skills 的编程助手；安装需要 Node/npx，或用 Claude Code 插件市场。AG：一个能加载 skills 的 agent（Claude Code、Codex 或其他）；要处理的文本；最好有作者自己的笔记、语音转写或自写粗稿；跑 `check.py` 需要 Python 和能执行代码的 agent 环境。AH：装有 Codex 或 Claude Code；Python 3.9 或更新；一个浏览器；可选获授权的 Slurm 集群、LaTeX、私有 dashboard 目的地。AI：能访问 GitHub；Cowork 路线需要桌面端 Claude；Claude Code / Codex 路线需要先装好对应 CLI 并登录；其它助手路线只需对目标 skills 目录有写权限。AJ：Claude Code 或 Cursor；一个非琐碎的代码任务；项目级写入 CLAUDE.md 的权限，或能装 Claude Code 插件；Cursor 用户需使用仓库自带的 `.cursor/rules/karpathy-guidelines.mdc`。
- AK：本地有 Node.js 才能用 `npx`；至少一个被支持的编码智能体（README 列出 Claude Code、Hermes Agent、OpenCode、Qoder、Cursor、Gemini CLI 等）；能访问 npm 与 GitHub；有权限写入 `~/.orchestra/skills/` 并把技能 symlink 到各 agent 目录。
- AL：一个支持 skill 机制的编程智能体（Claude Code 或 Codex）；一个空的项目文件夹；设计插件 `impeccable`（skill 会在开始时和你一起配置）；DataForSEO 账号与 webhosting 由 skill 在真正需要它们的那个阶段才来配置，不必提前准备。
- AM：一个受支持的本地 agent host（README 列出 Claude Code、Hermes、OpenClaw、Codex、DeepSeek Harness、Pi、Grok Build、OpenCode，其中 Grok Bot 仅列为「saved Skill · 预览」，官方文档未描述直接导入本地 `SKILL.md`）；Python 3.9+；知道该 host 的 Skills 目录；素材可能涉及他人聊天记录与个人信息，原文完全没有讨论授权与隐私，实际试用前须自行解决；`INSTALL_EN.md` 里的 host 具体路径、迁移、Windows、生成 profile 的安装与凭据配置，本次材料未给出内容。
- AN：一个 Claude 使用环境（Claude Skills 系统 / Claude Code / Claude.ai 项目）；使用范围合法合规（README 限定为授权红队、漏洞赏金、安全研究、CTF 等场景）；对 `~/.claude/skills` 有写权限；迁移到自己领域所需的 frontmatter 标准与技能模板在 `CONTRIBUTING.md`，本次材料未包含。

## 操作步骤

怎么选：先做做法 A；A 里某个技能确实有效、且你有一件每周重复且规范明确的工作，再做做法 B。其余按场景选：C 多来源知识打包；D 补模型端点/权限/搜索；E 中文技术文档写作与审稿；F 单篇论文精读；G 写一个 Claude Code mod；H 用 Cline CLI 代理长任务拿硬证据验收；I 补 UI/UX 设计知识；J 出带交互的单文件 HTML 图；K 出品牌一致的静态 HTML+SVG 图；L 从大插件市场只装一个单元并按任务档位选模型；M 把书或内部文档转成按需加载技能；N 把模糊想法写成任务书并给破坏性操作加闸门；O 补 Postgres 领域知识与版本化文档检索；P 在授权安全场景按主题加载安全技能库；Q 把多步任务拆成三阶段加门禁；R 装一套小而可组合的工程技能集；S 从 google/skills 按任务只装一个；T 让 agent 检索中国金融市场数据并核对来源与时间戳；U 把移动端模拟器与真机画面接进 Codex 聊天；V 用一行 curl 装单个 Markdown 技能；W 用元技能观察你怎么用技能；X 装一套全栈开发技能包按请求自动激活；Y 把中英文学术写作去模板化改写并用命题核对保住事实；Z 用路由技能自动选工作流并对 bug 交出失败→通过证据；AA 按职能只装少量 agent 角色并用真实任务与默认提示对照；AB 在 T3 Code 里用 p3-stack 按 playbook 路由并用 worktree/PR 监视减少等待和冲突；AC 审计并改进自己的 SKILL.md；AD 让 agent 把结论、方案对比与流程解释渲染成一页可离线打开的 HTML；AE 把自己的 SKILL.md 校验、打包并分发到多端；AF 给 agent 补一块 SwiftUI 领域知识并按需触发审查；AG 给工作写作去 AI 腔并保住事实与承诺强度；AH 把开放式研究做成迷宫地图、证据分级与独立裁判循环；AI 装 1–2 个 PM 插件并用 `/discover` 跑一个真实想法；AJ 给编码 agent 立四条行为约束并把任务改写成带验证标准的目标；AK 给 agent 补 AI 研究全流程知识，按类别只装一个技能并用真实研究任务对照；AL 把多阶段、跨天的长流程（如从零建站）打包成 skill，用状态文件断点续做、按阶段按需接外部工具；AM 把某个人的工作方式蒸馏成可复用 Person Profile 技能，按其素材优先级喂一手素材并用真实问题做对照；AN 把一套领域方法论拆成细粒度、按对话触发词按需加载的技能文件，并在自动加载、`--system-file` 注入、手工粘贴 system prompt 三条通道里选一条。

几组容易混的：

- J 与 K：J 出带 JavaScript 交互的单文件 HTML，验收靠 `validate`/`deliver` 的机器收据；K 默认出无 JS、无外部图片依赖的静态 HTML+SVG，验收靠品牌 onboarding 阶段的对比度校验和 fidelity receipt。要交互选 J，要品牌一致性和静态可交付选 K。
- N 与 Q：N 解决“怎么把一句模糊想法写清楚”，产出含目标七问的任务书，不绑定领域；Q 解决“多步任务怎么分阶段推进、每阶段什么时候该拦”，产出分阶段的固定交付物加五道门禁。想不清楚先用 N；已经清楚、只是步骤多且容易一步错步步错，用 Q。
- B、R、W：B 是把自己的重复工作写成单个 `SKILL.md`；R 是先用别人拆好的一整套技能集；W 不替你写技能，也不改你已装的技能——它并行观察你如何使用其它技能，产出观察日志和 staged 更新，由你复核后安装。
- A 与 V：A 走插件市场或 `npx skills add`，装上的是一个技能包；V 只把单个 `SKILL.md` 拷到 `.claude/skills/` 或 `~/.claude/skills/`。
- X 与 R / L / I：R 是小而可组合的工程技能集；X 是一个 Claude Code 插件，67 个专用技能按请求自动激活；L 是一个大插件市场，可以按任务只装一个单元；I 补的是 UI/UX 设计知识。
- T 与 A：需要中国金融数据检索、且宿主能执行本地 Python 时用 T。
- U 与 A：U 绑定 Codex desktop + Apple Silicon Mac + 私有仓库访问权。
- W 与 A：W 的产出是“哪些摩擦该被沉淀成技能”的清单，以及一批需要你自己安装才生效的 staged 更新。
- Y 与 E：E 面向中文技术文档；Y 面向中英文学术写作，且额外提供 `content_lock.py` 做命题级核对。
- Z 与 A：Z 同样走插件市场安装，但核心是 `poteto-mode` 路由技能与按角色配模型/推理强度；A 是通用小范围试装流程，Z 也必须套用 A 的对照方法。
- AA 与 X / R：AA 装的是按职能组织的 agent 角色文件；X 是全栈技能包按请求自动激活；R 是可组合工程技能集。
- AB 与 Z：两者都是 pstack 家族。Z 是 `pstack-claude`；AB 是 `p3-stack`，在 T3 Code 上重写。已经在 T3 Code 里工作才选 AB。
- AC 与 B/R/W：AC 审计你已有的 `SKILL.md`，不替你写新技能，也不观察你。
- AD 与 J / K：J 出交互图，K 出品牌静态图，AD 出“一页结论／解释／对比”的单文件 HTML。
- AE 与 B / AC：B 写技能；AC 审计技能；AE 校验、打包、发布和跨 agent 分发。
- AF 与 I / E / Y / S / O / T / AG：都是给 agent 补一块领域知识。AF 是 SwiftUI；AG 是工作写作去 AI 腔并保住事实与承诺强度。
- AH 与 A：AH 也是一个可装成 skill 的流程，同样建议先小范围试；但它的效果验证更依赖 T1–T6 证据分级、frontier 已解决比例、独立裁判逐条修正。
- AI 与 A：都是先小范围试装一个技能来源。区别在粒度：A 的默认是「只装一个技能包」，AI 的 README 建议「装整个插件而不是挑单个 skill」，理由是一个工作流通常依赖同一插件里一起发布的多个 skill。两条同时遵守的做法是：A 管「只引入一个新来源」，AI 管「在这个来源内部装一个插件」——仍然只装 1 个插件做对照。
- AJ 与 B / R / W / AA：AJ 是往编码 agent 里写一份行为约束，不装技能包、不审计已有 SKILL.md、不观察你怎么用技能。
- AK 与 C / M：C 是把外部文档打包成技能；M 是把书或内部文档转成按需加载技能；AK 是现成的 AI 研究技能库，并给你一套可抄的 `SKILL.md + references/` 目录规范。要补研究流程用 AK，要打包自己的书或文档用 C/M。
- AL 与 B / M / Q / N：B 是把自己的一件重复工作写成单个 `SKILL.md`；M 是把书或内部文档转成按需加载技能；N 是把一句模糊想法写成任务书；Q 是把复杂分析任务拆成三阶段并加五道门禁；AL 是把一条长流程（从零建站）整体打包成 skill，进度写进 `WEBSITE-STATUS.md` 跨会话续做，外部工具按阶段才接入。要打包流程本身用 AL，要打包文档用 C/M，要拆分析任务用 Q。
- AL 与 A：A 的默认是「只装一个技能包」并做有/无对照；AL 同样必须先套用 A 的对照方法，只跑到调研／设计方向阶段就停，不要因为阶段顺序看起来完整就默认它有效。
- AM 与 AA / AJ：AA 装的是现成的、按职能组织的 agent 角色库；AM 蒸馏的是你身边具体某个人的判断方式，产出留在本地的 profile，并自带 Correction 层与「增量合并不覆盖」；AJ 是往编码 agent 里写行为约束，不涉及素材采集。
- AM 与 B / M：B 把你自己的一件重复工作写成 `SKILL.md`；M 把书或内部文档转成按需加载技能；AM 把一个人的判断、表达与做事方法变成可调用的 profile，需要先有此人的一手素材。
- AN 与 P：P 是现成的安全技能库（Claude-BugHunter，按主题自动加载并有 7-Question Gate）；AN 的核心是「领域专长怎么拆成细粒度 `SKILL.md`、怎么按需加载或注入」这套交付模板，它自带的内容属进攻性安全，只在授权场景使用。
- AN 与 AK：AK 是按类别只装一个现成的 AI 研究技能并做对照；AN 是把自有方法论拆成多个细粒度技能，按对话触发词按需加载或按需注入。
- AN 与 V：V 用一行 curl 装单个 Markdown 技能并验证它按 `description` 自动加载；AN 讲的是把一套方法论拆成多个细粒度技能，并在 Skills 目录自动加载、`claude --system-file -` 注入、Claude.ai 手工粘贴三条通道里选一条。

E、F、G、H、I、J、K、L、M、N、O、P、Q、R、S、T、U、V、W、X、Y、Z、AA、AB、AC、AD、AE、AF、AG、AH、AI、AJ、AK、AL、AM、AN 都必须套用 A 的对照方法，不要跳过验证直接纳入常规流程。

### 做法 A：先用现成技能包做小范围试装（推荐先做）

1. 选定一个非关键项目和一类重复任务。
2. 只选一个技能包、只装一个。可选来源：官方示例技能、`jnMetaCode/superpowers-zh`、`rohitg00/pro-workflow`、`feiskyer/claude-code-settings`、`leter/zh-tech-writing`、`Gaoyuan-0423/biomedical-paper-reader`、`google/skills`、`clawyi-com/china-market-data`。
3. 验证安装。新开一个会话：`/plugin list`，`What skills do you have access to?`。
4. 跑通一个最小动作，只选一个你当前最痛的任务。
5. 做对照。同一任务、同一输入，分别在没有技能和有技能的条件下各跑 3 次，记录差异。试一周，或至少 5 个同类任务。
6. 可选：只照抄一个工作流形态，别整套搬。

### 做法 B：把自己的重复工作写成 SKILL.md（验证有效后再做）

1. 选一件你每周都在重复、且有明文规范的工作。
2. 建一个自包含文件夹，放 `SKILL.md`。`description` 必须同时写清“做什么”和“什么时候用”。
3. 主 `SKILL.md` 只放流程与核心规则，细粒度规范拆到 `references/` 按需加载。
4. 校验技能：`npx genspark-claw validate ./my-skills/`。
5. 安装到目标 host：`npx genspark-claw install all --target claude`，或直接放到 `~/.claude/skills/`。
6. 换一个新会话，或让一位不了解背景的同事只凭 `description` 触发该技能。
7. 没有自动触发时逐项排查路径、重启、嵌套、手动调用标记。

### 做法 C：多来源知识打包（可选）

`pip install skill-seekers`；`skill-seekers create https://docs.djangoproject.com/`；`skill-seekers package output/django --target claude`；`skill-seekers install-agent output/react/ --agent cursor`。质量门禁可试 `skill-seekers quality output/react/ --threshold 7`，但没有与人工基线的对照实验。

### 做法 D：用配置模板补齐模型端点、工具权限与搜索能力（可选）

只有你有自建网关、或想用已有订阅走非官方 API 时才做。`settings.json` 不通过 Plugin 配置，必须手动设置。把 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY` 指向你的提供商端点。权限确认：模板 `defaultMode` 为 `acceptEdits`；想完全跳过确认可改 `bypassPermissions`，但先了解安全风险。非官方 API 环境补网页搜索：用 MCP 补 Tavily / Brave / Firecrawl / DuckDuckGo Search MCP。

### 做法 E：中文技术文档写作与审稿（按 A 的对照法验证）

装 skill：`npx skills add leter/zh-tech-writing -g`，或 clone + cp 到 `~/.claude/skills/`。推荐装 autocorrect。第一次只审不改：`/zh-tech-writing 检查 docs/api.md，只列问题，不要改`。再让它改一版并逐条 diff 审阅。核心规则：句子逗号隔开的每一截尽量在 20 字以内；多用肯定句和主动语态；直接用动词；每段第一句说重点；标题不跳级；少用四级标题；加粗和列表不滥用。

### 做法 F：单篇论文精读（按 A 的对照法验证）

`git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git`。指定入口：`请使用 ./biomedical-paper-reader/SKILL.md 阅读这份 PDF，生成中文精读报告。`。补充材料默认只用本地已有文件；每张主图先概览，必要面板再放大；完整阅读图注。检查判定纪律：是否区分独立个体数与细胞/切片数、观察与因果、作者解释与新增假设。

### 做法 G：自己写一个 Claude Code mod，把会话信息嵌进界面（可选）

确认版本：`claude --version` 需要 2.1.287 或更高。二选一建 mod：G-1 让 Claude 自己写；G-2 手工建目录，`hooks/hooks.json` 只指一个模块。读真实数字：`$.session.usage()` 返回 `context.tokens`、`context.window`、`context.percent`。历史必须放 `$.state`。在 `types/index.d.ts` 里声明 `PluginState`。原文 Step 4 的完整模块在本次材料里被截断，需打开原文补全后再复制。

### 做法 H：让 agent 代理 Cline CLI 跑长任务，并用硬证据验收（可选）

安装：`npx skills add https://github.com/gongdear/cline-pilot`，`mkdir -p ~/.hermes/skills && cp -r cline-pilot ~/.hermes/skills/`。完成首次本地配置，写入 `references/local-config.md`。过冷启动门禁。两阶段模型策略：初始化用强的长上下文模型；稳态切到小的本地模型；同一断言连续失败 3 次，把那一批次升级回更强模型。派发编码任务。监控进度：`python3 scripts/session_report.py 15 /path/to/repo`。验收后再报完成：走 6 项验收清单；证据优先于自我报告。自检命令：`npx @anthropics/skills-ref validate .`、`python3 -m py_compile scripts/session_report.py`、`python3 scripts/session_report.py 5 /path/to/repo`。

### 做法 I：给 agent 补一块 UI/UX 设计知识（可选）

全局安装 CLI：`npm install -g ui-ux-pro-max-cli`。进项目并先 dry-run：`uipro init --dry-run`，再按 `--ai claude` / `cursor` / `copilot` / `opencode` / `zcode` / `universal` / `all` 安装。日常直接用自然语言提 UI/UX 请求。落盘成文件：`--design-system --persist -p "MyApp"`。交付前逐条对检查清单：不用 emoji 当图标；所有可点击元素 cursor-pointer；浅色模式文字对比度 ≥ 4.5:1；键盘导航焦点可见；尊重 prefers-reduced-motion；文本/徽标不裁切；375px、768px、1024px、1440px 响应式。

### 做法 J：让 agent 从一句话或一个仓库产出可交互的架构图（可选）

安装 skill：`npx skills add tt-a1i/archify -g`。命令链：`node archify/bin/archify.mjs guide ...`，`node bin/archify.mjs doctor`，`node bin/archify.mjs validate workflow ... --quality showcase --json`，`node bin/archify.mjs deliver workflow ... /tmp/workflow.html --quality showcase --open --json`。失败时按 `diagnostics[]` 的 `supportedFixes` 修，限制在两轮修正之内。改架构前做差异评审：`node archify/bin/archify.mjs compare architecture base.json head.json architecture-delta.html --json`。

### 做法 K：把自然语言需求或已有图源改成自包含的 HTML+SVG 图（可选）

按宿主各取一条安装命令。Claude Code 装完要手动打开自动更新。做品牌 onboarding：`onboard diagram-design to https://yoursite.com`。多客户用命名 profile 隔离。生成第一张图或从模板起步；重绘已有图用 `/diagram-design:import-drawio platform.drawio`。本次材料在导入这一节被截断，先打开仓库 README 确认。

### 做法 L：从大插件市场只装一个单元，并按任务档位选模型（可选）

Claude Code 安装：`/plugin marketplace add wshobson/agents`，`/plugin install python-development`。只装技能：`gh skill install wshobson/agents` 或 `npx skills add wshobson/agents --skill python-testing-patterns`。按任务层级选模型：Tier 0 Fable 5；Tier 1 Opus；Tier 2 inherit；Tier 3 Sonnet；Tier 4 Haiku。对单个 skill 打分：`uv run plugin-eval score path/to/skill --depth quick`，`uv run plugin-eval certify path/to/skill`。把它的输出当筛子，不是结论。

### 做法 M：把一本反复查阅的书或一份内部文档变成按需加载的技能（可选）

安装：`npx skills add virgiliojr94/book-to-skill`，或 clone 到 `~/.claude/skills/book-to-skill`。检查抽取依赖：`python3 scripts/extract.py --check`。按书型安装 PDF 抽取器。运行转换：`/book-to-skill <path|folder|glob> [skill-name]`。使用与校验：`/your-book-slug replication`；`tools/validate_skill.py --lens claude|copilot|amp|hermes|opencode`。合规：不得再分发第三方版权作品的生成 skill。

### 做法 N：把模糊想法写成可独立跑的任务书，并给破坏性操作加三色闸门（可选）

安装 leader。降级方案：把 `SKILL.md` 全文当项目规则文件，或贴进对话。按「目标七问」检查：目的、完成态、证据、反作弊、地界、取舍、未知。任何一条没答案，不要丢进目标模式跑长程。用 storage-analyzer 清磁盘，遵守绿灯/黄灯/红灯规则。用 neat-freak 收尾：`/neat` 等；它绝不擅自删东西。

### 做法 O：给 agent 补一块 Postgres 领域知识与版本化文档检索（可选）

装技能：`npx skills add timescale/pg-aiguide --skill postgres`，`npx skills add timescale/pg-aiguide --skill schema-exploration`。接入公共 MCP 端点 `https://mcp.tigerdata.com/docs`。用具体任务触发，或按 README 的 A/B 法自测。单次 A/B 受随机性影响大，重复 3 次以上或换 2–3 个任务再下结论。

### 做法 P：在已获授权的漏洞挖掘场景按主题自动加载安全技能库（可选）

只对自有或书面授权资产使用。插件安装：`/plugin marketplace add elementalsouls/Claude-BugHunter`，`/plugin install claude-bughunter@elementalsouls`。用 `/hunt` 开 engagement。提交前必须过 `triage-validation` 的 7-Question Gate；证据按 `evidence-hygiene` 脱敏。

### 做法 Q：把复杂分析任务拆成「分析 → 实现 → 交付」三阶段，用阶段内只读门禁卡住返工（可选）

安装：`git clone https://github.com/XiaoMaColtAI/math-modeling-skill.git` 或 `npx skills add ...`。先约定目录契约：`SKILL_ROOT` 只读；`PROJECT_ROOT` 可写；题目与附件只读。按门禁顺序推进：建模手 → `题目分析报告.md`、`术语表格.md`，门禁 `M1`；编程手 → 代码、结果表格、候选图、`results/复现清单.json`，门禁 `P1`、`P2`；论文手 → 至少 8 幅正式图、`完整论文.docx`，门禁 `W1`、`W2`。`P1` 必须在全量计算和正式出图之前执行；`W1` 必须在长篇正文和双格式排版之前执行。

### 做法 R：装一套小而可组合的工程技能集，把「动手前对齐」和可复用纪律固化下来（可选）

两条设计经验：用户调用型只有你手输 `/xxx` 才触发；模型调用型可由 agent 自动调用。安装两条路线只选一条：`claude plugins install mattpocock-skills` 或 `npx skills@latest add mattpocock/skills`。每个仓库跑一次配置：`/setup-matt-pocock-skills`。非代码用 `/grill-me`；代码用 `/grill-with-docs`。建反馈回路：`/tdd`、`/diagnosing-bugs`。管设计：`/to-spec` → `/to-tickets` → `/implement` 或 `/implement-spec` → `/code-review`。

### 做法 S：从 google/skills 按任务只装一个 Google 相关技能（可选）

选一个与当前任务最接近的技能，不要一次装全部。安装按 harness 选一条。使用前进入对应 skill 目录确认权限与配置。在隔离环境或测试项目中跑一个具体任务，记录是否减少查文档或手写命令的时间、命令/配置正确率、需要人工纠正次数、权限申请次数。

### 做法 T：让 agent 检索中国金融市场数据，并核对来源与时间戳（可选）

安装 Skill：`npx --yes skills@latest add clawyi-com/china-market-data -g`。安装 Python 依赖：`python3 "$SKILL_DIR/tools/setup_env.py"`。更新技能会整体替换目录、删掉 `.venv`，更新后需再运行一次 `setup_env.py`。直接向 AI 助手提问，例如贵州茅台的价格、PE、PB、市值和换手率。默认板块接口失败后可显式尝试 `--source dataapi`；它仍属于东财，不是独立供应商。

### 做法 U：把移动端模拟器与真机画面接进 Codex 聊天，用日志和性能面板验收（可选）

前提：Codex desktop + Apple Silicon Mac；仓库为 private，需要 GitHub 读权限。安装预构建插件。从 Codex 侧边栏打开 Mobile Dev，选设备，让 Codex 干活。用面板做检查：Logs / Performance / Screenshot / Select。按需关闭遥测：`MOBILE_DEV_TELEMETRY=off`。

### 做法 V：用一行 curl 把单个 Markdown 技能装进 Claude Code，并验证它按 description 自动加载（可选）

项目级安装单个技能：`mkdir -p .claude/skills/explain && curl -fsSL ... -o .claude/skills/explain/SKILL.md`。想对本人所有项目生效，替换为 `~/.claude/skills/explain`。重启 Claude Code，提一个解释类请求，观察是否自动加载；若没触发，再显式点名该技能。推广前必做：打开 `.claude/skills/explain/SKILL.md` 读实际提示词。

### 做法 W：让一个元技能观察你怎么用技能，把重复摩擦沉淀成技能改动（可选）

取文件：`SKILL.md`、`references/`、`scripts/` 三部分必须放在一起。安装：`npx skills add rebelytics/one-skill-to-rule-them-all --skill task-observer`。激活最容易漏：把 `references/environments.md` 的激活指令加进 `CLAUDE.md`，或安装 session-start hook。观察日志落在共享文件夹的 `skill-observations/observation-log/`，建议更新落在 `skill-updates/`。每次会话结束问一句：`Any observations logged?`。

### 做法 X：装一套全栈开发技能包，按请求自动激活并让复杂任务按技能链跑（可选）

添加插件市场：`/plugin marketplace add jeffallan/claude-skills`。安装技能包：`/plugin install fullstack-dev-skills@fullstack-dev-skills`。用自然语言触发单个技能（请求里要带具体框架/技术名和具体任务）。用多技能工作流链处理复杂任务。用 `/common-ground` 暴露并校验 Claude 对项目的隐藏假设。

### 做法 Y：把中英文学术写作去模板化改写，并用命题核对保住事实（可选，按 A 的对照法验证）

定位：heise3/academic-deai（v3.1.0，MIT）是模型中立 Agent Skill。安装：`git clone https://github.com/heise3/academic-deai.git`，`mkdir -p ~/.agents/skills`，`cp -R academic-deai ~/.agents/skills/academic-deai`。调用 Skill，用中文或英文提示词。可选文本核查工具：`python3 scripts/validate_package.py .`、`python3 -m unittest discover -s tests -v`、`python3 scripts/content_lock.py original.md revised.md --strict`。PDF 抽取需 Poppler `pdftotext`；DOCX 正文抽取不能保留所有样式。

### 做法 Z：让路由技能自动选择工作流，并对 bug 交出「失败→通过」证据（可选，按 A 的对照法验证）

定位：michael-denyer/pstack-claude 把 pstack 移植到 Claude Code、Codex、Pi，核心入口是 `poteto-mode` 路由技能。安装命令。配置角色模型与推理强度：运行 `setup-pstack`。处理 hook 信任：Codex 需要先通过 `/hooks` 信任。使用示例：`Use poteto-mode to fix the search filter resetting when I change pages.` 对 bug，它会复现失败，用 `how` 和 `why` 调查，委派修复，再重跑失败用例；若修复跨越函数边界，会在实现前引入 `architect`。

### 做法 AA：按职能只装少量 agent 角色，用真实任务和默认提示对照（可选，按 A 的对照法验证）

定位：msitarzewski/agency-agents 是按职能组织的 AI 专业角色 Markdown 集合。最省事：装桌面 app。用脚本装进 Claude Code。在会话里激活某个角色。只装需要的团队，先看再装。OpenCode 用户注意：运行时上限约 119 个 agent，超出会被静默丢弃。

### 做法 AB：在 T3 Code 里用 p3-stack 按 playbook 路由，并用 worktree/PR 监视减少等待与冲突（可选，按 A 的对照法验证）

定位：uzairansaruzi/p3-stack 是把 pstack 在 T3 Code 上重写的版本。克隆并全局安装：`git clone https://github.com/uzairansaruzi/p3-stack.git`，`cd p3-stack`，`./install.sh`。如果只想装到某个项目：`./install.sh --project /path/to/repo`。初始化角色→模型的映射：运行 `/setup-p3`。正式干活时用 `/p3-mode`。卡住或不确定该用哪个 skill 时，问 `/p3-help`。机制层面的用法：`delegate_task`、`t3_thread_launch`、`watch_pull_request`、`schedule_task`、`preview_*` / `device_*`、`t3_thread_read` / `t3_thread_search`。

### 做法 AC：用 skill-creator-plus 审计并改进自己的 SKILL.md（可选，按 A 的对照法验证）

定位：robonuggets/skill-creator-plus 是一个免费的 Claude 技能审计/构建/改进工具。安装到 Claude Code：`git clone https://github.com/robonuggets/skill-creator-plus ~/.claude/skills/skill-creator-plus`。要在 claude.ai 上用：把 `SKILL.md`、`references/`、`scripts/`、`LICENSE` 打成 zip，在 claude.ai 设置的 Skills 里上传。用自然语言触发，三种模式：AUDIT、NEW、REFINE。先拿机械检查的基线，再动手改。

### 做法 AD：让 agent 把结论、方案对比与流程解释渲染成一页可离线打开的 HTML（可选，按 A 的对照法验证）

定位：QingYunA/answer-me-with-html 是一个 agent skill。前提：装 Node.js 20 或更新版本，不需要 `npm install`。让 agent 自己装：把 `Install Answer me with HTML: read https://raw.githubusercontent.com/QingYunA/answer-me-with-html/main/INSTALL.md and follow it.` 原样贴进 agent。或走 Claude Code 插件、`npx skills add`、手动 clone + cp。验证安装：用 TCP 三次握手的问题问一次。开启 always-on：把规则原文贴给 agent，让它写进 rules 文件。改配置：用 slash command 或 `am`。

### 做法 AE：把自己的 SKILL.md 校验、打包并分发到多端（可选，按 A 的对照法验证）

定位：`ishuagrawal/skills` 是一个开源的 Agent Skills 集合（MIT，33 stars），同时把自己做成 Claude Code 插件市场。每个技能 = 一个文件夹，含 `SKILL.md` 加它需要的 `scripts/`、`references/`、`assets/`。

做法 AE-1：安装现成技能。

Claude Code：

```text
/plugin marketplace add ishuagrawal/skills
/plugin install skills@ishuagrawal
/reload-plugins
```

其他 agent：

```bash
npx skills add ishuagrawal/skills
```

做法 AE-2：用这套流程分发你自己的技能。

1. 新建 `skills/<name>/SKILL.md`。frontmatter 的 `name` 必须和文件夹名一致；`description` 最多 1024 字符；只保留 `name`、`description`、`license`、`compatibility`、`metadata`、`allowed-tools`。
2. 在 README 的技能表格里加一行。
3. 校验：

```bash
python3 scripts/check_skills.py
```

```bash
claude plugin validate . --strict
```

4. 发布：

```bash
./scripts/release.sh 1.1.0
```

5. 打包给 claude.ai / API 上传时，用 `scripts/package_skills.sh` 生成 `dist/<skill>.zip`。
6. 到第二个环境验证：`npx skills add <你的仓库>`，或走插件市场添加与安装。

### 做法 AF：给 agent 补一块 SwiftUI 领域知识，按需触发审查（可选，按 A 的对照法验证）

定位：twostraws/SwiftUI-Agent-Skill（技能名 SwiftUI Pro，MIT，5300 stars）是一个 Agent Skill。

1. 前提：支持 Agent Skills 的编程助手；目标是 SwiftUI / Apple 平台项目。
2. 安装（二选一）：

```bash
npx skills add https://github.com/twostraws/swiftui-agent-skill --skill swiftui-pro
```

Claude Code 插件市场：

```text
/plugin marketplace add twostraws/SwiftUI-Agent-Skill
/plugin install swiftui-pro@swiftui-agent-skill
```

3. 触发。Claude Code：`/swiftui-pro`；Codex：`$swiftui-pro`；限定只审一部分：`/swiftui-pro Check for deprecated API`、`$swiftui-pro Focus on accessibility`；自然语言：`Use the SwiftUI Pro skill to look for performance problems in this project.`。
4. 做对照。先不用技能审同一段代码，记录问题列表；再用技能审同一段代码，人工区分真实问题与误报。采纳修复后重新编译、跑测试。

### 做法 AG：给工作写作去 AI 腔，同时保住事实与承诺强度（可选，按 A 的对照法验证）

定位：`phuryn/work-humanizer` 是一个 Agent Skill（一份 `SKILL.md` 加两个辅助文件，另含 `check.py`），用来去掉工作写作里的 AI 腔，同时保持事实、承诺和限定条件的强度不变。适用的工作是销售邮件、营销文案、客服回复、HR 通知、法务信函这类「字面即承诺」的文本。

1. 安装。把 `skills/work-humanizer` 文件夹复制进 agent 的 skills 目录：

| Agent | 目录 |
|---|---|
| Claude Code | `~/.claude/skills/work-humanizer`（所有项目）或 `.claude/skills/work-humanizer`（单个项目） |
| Codex | `~/.codex/skills/work-humanizer` |
| 其他 agent | 该 agent 自己的 skills 目录 |

或者用 Skills CLI：

```text
npx skills add phuryn/work-humanizer
```

2. 调用。三种用法：

```text
Use work-humanizer on this: <paste text>
Use work-humanizer on this and interview me first: <paste draft>
Use work-humanizer on docs/launch-post.md
```

3. 尽量喂自己的原始素材。粘贴你的笔记、语音转写，或你自己写的粗稿。
4. 判断要不要走 Interview mode。如果这篇草稿能被任何拿到同一句话要求的人写出来，编辑救不了它，缺的是真实的例子、数字、哪里出了错、作者本人怎么想。此时用第 2 步第二种写法触发；它会问最多 5 个「回答成本很低」的问题，然后按你的回答重建全文。
5. Rewrite mode（默认路径）。它会先列出每一条事实及其确定程度，然后以作者本人的声音重新写。它按 AI 痕迹的强弱优先修，最后给一份逐句事实审计。
6. 可选的机械扫描：

```text
python skills/work-humanizer/check.py draft.md
```

7. 需要更短版本时，在有理由的情况下它会另外给一个约一半长度的选项，并列出会删掉什么；它绝不自行删减，删不删由你决定。

### 做法 AH：把开放式研究做成迷宫地图，用证据分级和独立裁判推进（新增）

定位：`nasqret/labyrinth-exploration` 是给 Codex 和 Claude Code 用的 skill，面向开放式研究——数学、理论科学、算法，以及任何「目标是弄清什么是仍然未知的」场景。它把研究计划当作迷宫探索：agent 维护一张精确地图，标出哪些走廊已探明、哪些已被封死、哪些门看得见但还没进、哪里还是黑暗。

1. 前提。装有 Codex 或 Claude Code；Python 3.9 或更新；一个浏览器；可选获授权的 Slurm 集群、LaTeX、私有 dashboard 目的地。
2. 安装整仓为 skill。

```bash
mkdir -p "$HOME/.agents/skills"
git clone https://github.com/nasqret/labyrinth-exploration "$HOME/.agents/skills/labyrinth-exploration"
```

Claude Code 改为 clone 到 `$HOME/.claude/skills/labyrinth-exploration`。
3. 从研究项目目录运行客户端，而不是从安装后的 skill 目录运行。Codex 调用 `$labyrinth-exploration`；Claude Code 调用 `/labyrinth-exploration`。
4. 先看一张完整地图。跑仓库自带 triangle-counts 示例，确认 `lab.py check` 与 `lab.py build` 能生成 dashboard。这一步只是环境验证，不是效果验证。
5. 用自己的问题启动。在客户端里描述研究计划，agent 会在你的仓库里建立 `labyrinth/`。
6. 迭代循环：每轮挑 1–3 扇门，同时用多个工具族探索；提出带测试的猜想，跑测试、记录、交独立裁判、更新地图。
7. 地图不再变化时启用升级梯：换工具、换参数、取极端值、放松假设、反转问题、引入另一社区方法，或发动广泛攻击。
8. 门多到一轮处理不完时跑 campaign：每条猜想配 attack agent，报告交独立裁判，writer 起草精确改动，coordinator 整合。
9. 产物文件：`labyrinth/knowledge.json`、`events.jsonl`、`frontier.json`、`sota.json`、`dashboard/index.html`、`research/agents/<name>/`。
10. 分级制度：每个论断带 T1–T6 层级；低于 T3 不作事实引用；T2/T3 额外带评审状态。
11. 隐私：dashboard 和笔记通常含未发表结果，留在本地或私下发布；未经同意不放公开物。更新用 `git pull`。

### 做法 AI：按 PM 工作流只装 1–2 个 pm-skills 插件，用 /discover 跑一个真实想法（新增，按 A 的对照法验证）

定位：`phuryn/pm-skills`（MIT，26,862 stars）是面向产品经理的 AI 插件市场。9 个插件、69 个 skills、42 条链式命令。

1. 前提：能访问 GitHub；Cowork 路线需要桌面端 Claude；Claude Code / Codex 路线需要先装好 CLI 并登录；其它助手路线只需对目标 skills 目录有写权限。
2. 选入口：非开发者用 Cowork；开发者用 Claude Code CLI；OpenAI 侧用 Codex CLI；Gemini CLI / OpenCode / Cursor / Kiro 只能拿 skills，没有 slash 命令。
3. 装（Cowork）：打开 Customize → Browse plugins → Personal → + → Add marketplace from GitHub → `phuryn/pm-skills`。
4. 装（Claude Code CLI）：

```bash
claude plugin marketplace add phuryn/pm-skills
claude plugin install pm-product-discovery@pm-skills
```

只挑 1–2 个执行，不要 9 行全跑。
5. 装（Codex CLI）：

```bash
codex plugin marketplace add phuryn/pm-skills
codex plugin add pm-product-discovery@pm-skills
```

Codex 上 `/slash` 命令装得上但跑不起来，要用自然语言描述流程。
6. 装（其它助手，仅 skills）：把 `skills/*/SKILL.md` 拷到对应位置。
7. 按 PM 工作流入门：新想法 → `/discover`；策略 → `/strategy`；PRD → `/write-prd`；发布 → `/plan-launch`；指标 → `/north-star`。
8. 做对照。同一句想法，先在没装插件的会话里让模型自由发挥一次，再装 1 个插件跑 `/discover <真实想法>`，比较是否产出显式假设清单、优先级和实验设计。至少跑 3 次或换 2–3 个想法。
9. 需要压过模型通用知识时强制加载：`/plugin-name:skill-name` 或 `/skill-name`。

### 做法 AJ：给编码 agent 立四条硬约束，把命令式任务改写成带验证标准的目标（新增，按 A 的对照法验证）

定位：forrestchang/andrej-karpathy-skills（MIT）是一份单文件 `CLAUDE.md` 行为约束，四条原则：Think Before Coding、Simplicity First、Surgical Changes、Goal-Driven Execution。

1. 前提：至少有非琐碎的代码任务交给 Claude Code 或 Cursor。琐碎任务不必套全套。
2. 安装为 Claude Code 插件：

```text
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

3. 或写进项目级 CLAUDE.md。新项目：

```bash
curl -o CLAUDE.md https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md
```

已有项目追加：

```bash
echo "" >> CLAUDE.md
curl https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md >> CLAUDE.md
```

4. 与项目特定规则合并。
5. Cursor 用户：使用仓库自带的 `.cursor/rules/karpathy-guidelines.mdc`。
6. 四条原则：Think Before Coding 显式写假设；Simplicity First 不加没要求的功能；Surgical Changes 不顺手改善；Goal-Driven Execution 把命令式任务改写成带验证目标。
7. 任务改写表：`Add validation` → `Write tests for invalid inputs, then make them pass`；`Fix the bug` → `Write a test that reproduces it, then make it pass`；`Refactor X` → `Ensure tests pass before and after`。
8. 多步任务先给带验证点的简短计划。
9. 做对照：同一非琐碎任务，先不写这份 CLAUDE.md 跑一次，再装上并改写成带验证目标跑一次，对比 diff 是否只含被请求改动、澄清是否发生在实现之前。

### 做法 AK：用 AI-Research-SKILLs 给 agent 补 AI 研究全流程知识，按类别只装一个并用真实研究任务对照（新增，按 A 的对照法验证）

定位：`Orchestra-Research/AI-Research-SKILLs`（MIT，输入 metrics 显示 13,433 stars）把 AI 研究全流程拆成 98 个可安装技能，分 23 类：Autoresearch、Ideation、ML Paper Writing、Model Architecture、Fine-Tuning、Post-Training、Distributed、Optimization、Inference、Evaluation、Agents、RAG、Prompt Engineering、MLOps、Observability、Multimodal、Emerging Techniques、Agent-Native Research Artifact 等。每个技能是一个目录，含一份 50–150 行的 `SKILL.md` 快速参考和 300KB+ 的 `references/` 深度文档。

1. 前提：本地有 Node.js（要用 `npx`）；已安装至少一个被支持的编码智能体（README 列出 Claude Code、Hermes Agent、OpenCode、Qoder、Cursor、Gemini CLI 等）；能访问 npm 与 GitHub；有权限写入 `~/.orchestra/skills/` 并把技能 symlink 到各 agent 目录。
2. 交互式安装（推荐路径）：

```bash
npx @orchestra-research/ai-research-skills
```

安装器会自动检测已装的编码智能体，把技能装到 `~/.orchestra/skills/` 并对每个 agent 建符号链接（Windows 上退化为复制）。可选全部、quickstart 包、按类别或单个技能。不要一次装全部。

3. 或让 agent 自助安装：

```text
Read https://www.orchestra-research.com/ai-research-skills/welcome.md and follow the instructions to install and use AI Research Skills.
```

4. 日常管理：

```bash
npx @orchestra-research/ai-research-skills list
npx @orchestra-research/ai-research-skills update
```

5. 在 Claude Code 里按类别装（替代路径，前提是已用 Claude Code CLI）：

```bash
/plugin marketplace add orchestra-research/AI-research-SKILLs
/plugin install fine-tuning@ai-research-skills
```

只装你当前任务对应的 1 个类别，例如微调用 `fine-tuning`，推理服务用 `inference-serving`，分布式训练用 `distributed-training`。

6. 抄它的技能目录规范整理自己的知识：

```
skill-name/
├── SKILL.md                    # 快速参考 50-150 行
│   ├── Metadata (name, description, version)
│   ├── When to use this skill
│   ├── Quick patterns & examples
│   └── Links to references
├── references/                 # 深度文档 300KB+
│   ├── README.md
│   ├── api.md
│   ├── tutorials.md
│   ├── issues.md
│   ├── releases.md
│   └── file_structure.md
├── scripts/                    # 可选
└── assets/                     # 可选
```

配套质量要求：`SKILL.md` 只放 50–150 行快速参考，细节进 `references/`；文档来源要求是官方仓库、真实 GitHub issue、生产工作流；必须写清「When to use this skill」；必须列 breaking changes。

7. 用真实研究任务做对照。选一个与所装类别对应的具体任务，例如微调 Llama 3 用 `03-fine-tuning/axolotl/`，优化推理延迟用 `12-inference-serving/vllm/`，扩到 100 GPU 用 `08-distributed-training/deepspeed/`。先在不装该技能的会话里让 agent 做一次，记录查文档时间、命令/配置正确率、人工纠正次数、权限申请次数、是否减少返工；再装上对应技能做一次。同一任务至少跑 3 次，或换 2–3 个任务再下结论。

8. 可选：用编排层跑长任务。autoresearch 技能用双循环架构串起文献综述、构思、实验到写论文，并按需路由给领域技能；README 称支持 Claude Code 的 `/loop` 和 OpenClaw heartbeat，但只有一句陈述，没有配置细节，需自己验证。

9. 验证安装只证明装上了：`npx @orchestra-research/ai-research-skills list` 能看到技能，不等于研究产出更好。效果必须按第 7 步做对照。

### 做法 AL：把多阶段长流程（从零建站）打包成 skill，用状态文件断点续做（新增，按 A 的对照法验证）

定位：`Julian-Ivanov/website-bauen`（30 stars）是一个给 Claude Code / Codex 用的 skill，用德语描述从零到上线建一个网站的完整流程：名称与 Logo → 用真实搜索数据做调研 → 文案 → 设计方向 → 构建 → 检查 → 上线 → 上线后在 Google 和 ChatGPT 里复测。README 明确说即使还没有名称和 Logo 也能用。它最值得抄的不是建站本身，而是「skill + 状态文件 + 按阶段调工具」这套打包形态。

1. 前提：一个支持 skill 机制的编程智能体（Claude Code 或 Codex），以及一个空的项目文件夹。
2. 项目级安装（只对当前项目生效），把仓库链接交给智能体，由它自己放置 skill：

```
Installiere den Skill von https://github.com/Julian-Ivanov/website-bauen in diesem Projekt.
```

3. 或全局安装（所有项目可用）：

```
Installiere den Skill von https://github.com/Julian-Ivanov/website-bauen global, damit er in jedem Projekt verfügbar ist.
```

4. 安装后如果 skill 没有立刻出现，重启一次智能体（README 原话即为需重启）。
5. 启动。Claude Code 在空项目文件夹里输入：

```
/website-bauen start
```

其他智能体则用自然语言：

```
Starte den Skill website-bauen.
```

6. 按阶段准备外部依赖。必需的是一个 AI 智能体；`impeccable`（免费设计插件）由 skill 在开始时和你一起配置；调研阶段的 DataForSEO 账号和上线阶段的 webhosting 都由 skill 在真正需要它们的那个阶段才来配置，不必提前准备。注意：README 里的 DataForSEO 注册链接是作者的联盟链接，走该链接可得 5 美元初始额度（对使用者无额外费用），判断时留意推荐动机。
7. 断点续做。进度保存在项目里的 `WEBSITE-STATUS.md`。几天后继续时，在项目文件夹新开一个对话：

```
Mach mit dem Skill website-bauen weiter
```

Claude Code 中也可用：

```
/website-bauen weiter
```

8. 更新 skill 版本，让智能体从 GitHub 重新拉取：

```
Aktualisiere den Skill website-bauen von GitHub.
```

9. 把阶段顺序当检查清单用：名称与 Logo → 用真实搜索数据做调研 → 文案 → 设计方向 → 构建 → 检查 → 上线 → 在 Google 和 ChatGPT 中复测。注意 README 只给出使用层的步骤，skill 内部每个阶段的具体步骤、提示词和检查标准都没出现，所以这只是一张阶段框架，不能据此复现细节。
10. 做对照。新建一个空文件夹，按第 2 步装、第 5 步启动，只跑到「调研／设计方向」阶段即主动叫停，检查命名与 Logo 方案、带真实搜索数据的调研结果、文案初稿、设计方向说明这些产出物是否可直接使用；对比你自己手工做同一件事的耗时与返工次数。不要第一次就走完上线，以免被账号和部署环节带偏。
11. 如果你不需要建站，只借它的形态：把一条自己多阶段、跨天的流程写成 skill，把进度写进一个状态文件（对应 `WEBSITE-STATUS.md`），外部工具和账号放到真正需要它们的阶段才接入。

降级条件：如果关键阶段拿不出可核查的产出、或大量步骤仍需人工补做，说明 README 之外的 skill 本体并未兑现承诺，应从「试用这个 skill」降为「只借鉴 skill + 状态文件 + 阶段化接工具的思路」。

### 做法 AM：把某个人的工作方式蒸馏成可复用 Person Profile 技能（新增，按 A 的对照法验证）

定位：`titanwings/distilly`（前身 Colleague Skill / colleague-skill）是一个把某个人的经验、判断、表达方式和做事方法蒸馏成可复用 Person Profile、并打包为 Agent Skill 的创建器。流程是：消息记录 / 文档 / 访谈 / 公开资料 → Distilly → Person Profile → Agent / Bot。它有三个「人物家族」，各有素材采集策略、分析维度和 profile 结构：`colleague`（同事/导师/上下游）、`relationship`（伴侣/家人/朋友）、`celebrity`（公众人物/创作者/虚构角色）。生成的 Skill 名为 `{character}-{slug}`，可安装到支持原生本地 Skill 发现的 host：Claude Code、Hermes、OpenClaw、Codex、DeepSeek Harness、Pi、Grok Build、OpenCode（Grok Bot 仅列为「saved Skill · 预览」）。MIT 许可，Python 3.9+；引用技术报告 COLLEAGUE.SKILL（arXiv 2605.31264），该论文只覆盖 colleague 家族（前身）。

1. 前提：一个受支持的本地 agent host；Python 3.9+；知道该 host 的 Skills 目录。素材可能涉及他人聊天记录与个人信息，原文完全没有讨论授权与隐私，实际试用前须自行解决。
2. 安装（两种方式二选一）。让 agent 自己装，在任意受支持的本地 host 里发：

```
Install Distilly from `https://github.com/titanwings/distilly`, then verify that this host can discover it.
```

或人工 clone 到 host 的 Skills 目录：

```bash
git clone https://github.com/titanwings/distilly <DISTILLY_SKILL_DIR>
```

注意：创建者 Skill 的规范名是 `distilly`，要装在名为 `distilly` 的目录下。host 具体路径、迁移、Windows、生成 profile 的安装、凭据配置在 `INSTALL_EN.md`（本材料未给出其内容）。
3. 给自己建 profile（刚上手个人 agent 时）：

```
Use Distilly to set up my profile.
```

它会访谈约 5 分钟，展示 profile，然后把一段短摘要写进 agent 每次会话都读的文件（Claude Code 是 `~/.claude/CLAUDE.md`，OpenClaw 是 `USER.md`），完整 profile 留在本地 `~/.distilly/owner/profile.md`。
4. 给别人建 profile：

```
Use Distilly to create a Person Profile for `<person>`.
```

然后 ① 选 `colleague` / `relationship` / `celebrity`；② 加描述或素材（每个字段都可选）；③ 审阅结果，让 Distilly 生成 profile。
5. 按家族选择素材优先级（原文给的排序，高 → 低）：
   - `colleague`：本人的长文写作（设计文档 / 评审意见）> 决策性回复 > 日常群聊
   - `relationship`：完整聊天记录 > 信件 / 社交帖 / 日记 > 第三方描述（时间跨度越长越好，最好同时包含冲突与修复）
   - `celebrity`：第一人称书籍 / 博客 / 长访谈 > 决策记录（发布、commit、问答）> 可核实的第一人称短帖 > 第三方评论（避免只喂二手解读）
6. 可选：用自动采集通道替代手工上传。可用来源与前置条件：
   - Lark：消息走 API、文档/Wiki 支持，只要输入名字即可自动采集；需要把 App bot 加进相关群。
   - DingTalk：文档支持，消息只能走浏览器（其 API 不支持消息历史）。
   - Slack：消息走 API；需要管理员安装 Bot，免费版仅 90 天。
   - X 公开帖：走 API，可选，经计量型第三方服务 Xquik 做有边界的名人研究候选。
   - 微信聊天记录：SQLite；需先用 WeChatMsg 或 PyWxDump 导出。
   - 手工上传：PDF/图片/截图、Lark JSON 导出、`.eml`/`.mbox` 邮件、Markdown 或直接粘贴。
7. 持续维护（三条机制）：
   - 追加文件 → 自动分析增量 → 合并进相关小节，不覆盖已有结论。
   - 对话纠正：说“他不会这样，他会 xxx” → 写入 Correction 层，立即生效。
   - 每次更新自动归档，可回滚到任一历史版本。
8. 做对照。挑一位同事，只喂其设计文档/评审意见（按原文最高优先级素材），生成 colleague profile；准备 3–5 个该同事平时会被问到的真实问题（如“评审这个 API 设计”），分别问「不带 Skill 的通用 agent」和「装了该 Skill 的 agent」，自己看输出能不能直接用。同一批问题再只喂群聊素材重建一次，对照两次输出，验证原文的素材优先级排序是否成立。追加一份新文档，确认旧结论没被覆盖；再用一句“他不会这样，他会 xxx”纠正，确认立即生效且可回滚。

判断有没有改善的指标（原文未给，需自定并记录基线）：直接采纳率（生成结果被直接用／小改后用的比例，对照无 Skill 版本）；格式合规（输出是否符合团队既有规范、是否先追问影响面）；纠正轮数（需要“他不会这样”纠正的次数，应随使用下降）；稳定性（同一问题重复询问，关键判断是否一致）；可溯源性（输出中的判断能否指回所提供的原文素材，出现编造即视为失败）。

淘汰条件：若纠正轮数不下降、或输出无法溯源到素材（出现编造），则退回到只借鉴「Persona + 家族模块 + Correction 层 + 增量合并不覆盖」的结构，不实际使用该工具。

### 做法 AN：把领域专家方法论拆成细粒度 SKILL.md，按对话触发词按需加载（新增，按 A 的对照法验证）

定位：`SnailSploit/claude-red` 是一个面向 Claude Skills 系统的进攻性安全技能库，每个技能是一份结构化的 `SKILL.md`，把某类攻击面（如 SQL 注入、EDR 规避、ADCS 滥用）的专家方法论预先注入 Claude。README 称其包含 78 个技能、23 个类别，目标约 130 个技能，MIT 许可。对本书读者真正有价值的不是这些安全技能本身，而是它演示的交付方式：把领域专长拆成细粒度、可单独安装、按对话触发词自动加载的技能文件，从而做到「不用就不占上下文」。

1. 前提：已有一个 Claude 使用环境（Claude Skills 系统 / Claude Code / Claude.ai 项目），且使用范围合法合规（README 明确限定为授权红队、漏洞赏金、安全研究、CTF 等场景）。
2. 整库安装到 Claude Skills 目录（README 称此为推荐方式）：

```bash
git clone https://github.com/SnailSploit/claude-red ~/.claude/skills/claude-red
```

README 说明：Claude 会根据对话触发词自动加载匹配的技能，例如提到 SQL injection 会加载 `offensive-sqli`；未使用的技能不占用上下文。
3. 只安装单个类别（稀疏检出）：

```bash
git clone --filter=blob:none --sparse https://github.com/SnailSploit/claude-red
cd claude-red && git sparse-checkout set Skills/web Skills/active-directory
```

4. 使用仓库自带安装脚本：

```bash
./install.sh                           # interactive
./install.sh --target ~/.claude/skills # explicit target
./install.sh --category web            # single category
```

5. 在 Claude Code 中把技能当作 system file 注入：

```bash
cat Skills/web/offensive-sqli/SKILL.md | claude --system-file -

cat Skills/active-directory/**/SKILL.md | claude --system-file -
```

6. Claude.ai 手动方式：把某份 `SKILL.md` 的内容粘贴进 Project 的 system prompt，或直接前置到对话开头。
7. 迁移到自己的领域（这是把该仓库变成通用做法的关键一步）：按它的目录约定自建 `Skills/<类别>/<技能名>/SKILL.md`，技能粒度保持「单一任务面」，README 在 Contributing 一节明确说「偏好聚焦的单一表面技能，而非大而全的综述」；frontmatter 标准与技能模板在 `CONTRIBUTING.md`（本次输入未包含该文件内容，需到仓库查看）。
8. 做对照。选一个自己工作里反复出现、依赖成体系方法论的任务（例如代码评审、故障排查、合规检查）：先不要技能，让 Claude 处理 3–5 个真实任务并记录输出；再按第 7 步自建一份 `SKILL.md`，把任务需要的技术要点、可用工具、常见边界情况、何时该升级/求助写进去，安装或注入；用同样输入再跑一次，逐条对比；只在这一类任务上小范围用，不扩张到其它任务，直到显示出稳定差异。

建议观察的指标（均可自行计数）：首次输出即可用的比例；为得到可用结果所需的纠正轮数；专家检查清单中被遗漏项的条数（对照你自己的清单逐项打勾）；完成同一任务的时间；上下文占用（未加载技能与加载技能时同一任务的 token/长度差异，用来验证「按需加载省上下文」这一主张）。

淘汰条件：如果这些指标在多个任务上都没有稳定改善，说明该模式对你这套工作不成立，应降级为只借鉴「细粒度切分 + 按需加载」的思路。

## 怎么判断变好了

最小试用方式：

- 同一任务、同一输入，有技能和无技能各跑 3 次；至少覆盖 5 个同类任务，或持续一周。
- 换一个新会话，让不了解背景的人只凭 `description` 触发，检查可复现性。
- 文档类任务（做法 E）：挑一篇已有的中文文档，先建分支或备份，先只审不改，再改一版逐条 diff。
- 论文类任务（做法 F）：用一篇自己已读过、含多张主图的论文生成精读报告，逐项对照自己的理解。
- 代理类任务（做法 H）：一周内跑通「装技能 → 首次配置 → 放好全局 memory-bank 提示词 → 强模型扫描产规则 → 本地模型跑 1~2 个小批次 → 用 `session_report.py` 监控、用 git status 和测试报告验收」的闭环。
- 设计知识类（做法 I）：先 `uipro init --dry-run`，再用一个页面跑 `--design-system --persist`，下一次建页复用检索提示词。
- 出图类（做法 J / K）：J 记录从 `validate --json` 到 `deliver --json` 成功之间按 `diagnostics[]` 修了几轮；K 跑一次 `onboard diagram-design to https://yoursite.com`，检查 proposed diff 与 fidelity receipt。
- 插件市场类（做法 L）：只选一个单元在真实小任务上跑一遍，保留装之前的基线，用 `uv run plugin-eval score <skill> --depth quick` 做筛检。
- 文档转技能类（做法 M）：拿一本你反复查阅、已知答案的书，转换后用 10 个问题逐个提问：8 个已知答案、1 个书中明确没有的、1 个跨章节综合的。
- 目标书类（做法 N）：用 leader 生成任务书，检查七问是否全有答案；丢进目标模式跑一次，记录人工介入次数；完成后跑 `/neat`。
- Postgres 知识类（做法 O）：按 README 的 A/B 提示词，同一任务关闭 MCP 生成一份、打开生成一份，逐项对比；重复 3 次以上。
- 安全技能包类（做法 P）：在自建靶场或自有授权小资产上跑一次 `/hunt`，记录加载了哪些技能、7-Question Gate 是否拦下不该提交的发现。
- 复杂分析类（做法 Q）：先只跑单阶段「建模分析」，把 `题目分析报告.md` 和 `术语表格.md` 与人工版本对比；再挑一道小题跑完整三阶段，观察 `P1` 有没有提前拦下不可运行的方案。
- 工程技能集类（做法 R）：先跑 `/setup-matt-pocock-skills`，再只从 `/grill-with-docs` 和 `/tdd` 两个最高频入口开始，记录人工介入次数与返工轮数。
- Google 技能类（做法 S）：在隔离环境或测试项目中只选一个技能，执行一个具体任务，记录是否减少查文档时间、正确率、人工纠正次数、权限申请次数。
- 金融数据类（做法 T）：问「贵州茅台现在的价格、PE、PB、市值和换手率」，检查是否包含数据来源、行情时间、抓取时间，以及是否区分缺失值与 0。
- 移动端调试类（做法 U）：在 Apple Silicon Mac 上装好并新开 chat，选一个模拟器让它启动，让 Codex 执行 `Build and run my Expo app in the simulator beside this chat.`，再打开 Logs 确认能读到 iOS unified logs / Android logcat / Metro console。
- Markdown 技能类（做法 V）：装入 `explain`，重启后提一个解释类请求，观察是否按 `description` 自动加载；再打开文件读实际提示词。
- 元技能类（做法 W）：选一个会连续用几天的项目，装好并在 `CLAUDE.md` 加激活指令，正常干活 3–5 个会话，再安排一次复核会话。
- 全栈技能包类（做法 X）：选一个单点任务和一个链式任务，各先在不装插件的普通 Claude Code 做一次、再装插件做一次；记录激活命中/未命中次数、加载的 reference 是否相关、返工轮次与整链耗时。
- 学术写作类（做法 Y）：用一段自己真实的中文讨论段落，另存为 `original.md`；装好后用中文提示词跑一轮，输出另存为 `revised.md`；运行 `python3 scripts/content_lock.py original.md revised.md --strict`，人工逐条核对被标记的命题差异。
- 路由类（做法 Z）：装好后用 `Use poteto-mode to fix <该 bug 的现象>` 跑一个当前会失败、且你能独立复现的小 bug，记录是否先复现失败、是否用 `how`/`why` 调查、是否在跨函数边界时引入 `architect`、最终是否交付失败改通过的证据。
- 角色类（做法 AA）：按 division 只装少量 agent（如 code-reviewer、frontend-developer）进你在用的 Claude Code 或 Cursor，用真实任务跟默认提示做对照。
- T3 Code 编排类（做法 AB）：先用 `./install.sh --project /path/to/repo` 装到一个不重要仓库，跑 `/setup-p3` 检查 `p3-models.md` 映射，再用一个小 bug fix 或小 feature 走 `/p3-mode`；记录流程是否按 playbook 走完、多 worker 的 worktree/分支冲突次数、`watch_pull_request` 是否真的免轮询、`schedule_task` 是否在无人值守时跑完。
- 审计类（做法 AC）：挑 1–2 个你已经在用的 Claude 技能，装好后跑 `python3 scripts/validate_skill.py --all ~/.claude/skills` 和 `--json` 存基线；只对其中一个技能说 Audit 并改 2–3 条，复跑同一命令；另一个技能不动作对照。
- 结论页类（做法 AD）：在能执行 shell 的 agent 上装好，先用两三个复杂问题对比「直接让模型写 HTML」与「模型写 Markdown 草稿 + CLI 渲染」的输出 token、耗时和页面可读性；再挑一个真实的多步流程或选型问题，看它是否按规则出页、是否不打断回复；最后再考虑开 always-on。
- 分发类（做法 AE）：路径 A 用现成技能；路径 B 照做法 AE-2 建一个自己的 `skills/<name>/SKILL.md`，跑 `python3 scripts/check_skills.py` 和 `claude plugin validate . --strict`，通过后 `./scripts/release.sh 0.1.0`，再到另一台机器上 `npx skills add <你的仓库>` 装上。
- SwiftUI 领域技能类（做法 AF）：选一个已有 SwiftUI 项目或小 demo。先不用技能，让同一个 agent 审查同一段代码并记录问题列表；再用 `/swiftui-pro`（Codex 用 `$swiftui-pro`）审查同一段代码，记录问题列表；也可以只审一项做对照。
- 工作写作类（做法 AG）：挑 3–5 篇手头真实的 AI 起草文本，保留原始 AI 草稿。A 版直接让模型改写得更像人写的；B 版装好 work-humanizer 后按第 2 步调用，尽量给作者自己的笔记或转写。两版都跑 `check.py`，记录机械项通过情况。让 2–3 位同事盲看，问哪个更像熟练的人写的、哪个你会真的发出去。逐条比对承诺、条件、道歉语气有没有被改动。
- 开放式研究类（做法 AH）：先按第 2 步安装，从自己的研究项目目录按第 3 步启动，用 `$labyrinth-exploration` 或 `/labyrinth-exploration` 触发一次，确认 skill 被识别；跑通 triangle-counts 示例；再选一个自己领域里边界清楚、能判定对错的小型开放问题，走 2–3 轮完整循环，观察地图是否更新、被反驳的论断是否变成死胡同并附教训、独立裁判是否给出可套用的修正、frontier 已解决比例是否变化。
- PM 工作流类（做法 AI）：只装 1–2 个插件（推荐先 `pm-product-discovery`）。选一句你手头真实的产品想法，先在没装插件的会话里让模型自由发挥一次，保存输出；再跑 `/discover <你的真实想法>`；再跑一次 `/write-prd <同一想法>`，看它会不会按 README 说的提示你进入下一条命令。同一想法至少跑 3 次，或换 2–3 个想法。
- 编码 agent 行为约束类（做法 AJ）：在一个已有项目里按第 3 步追加 CLAUDE.md，或先只在单个项目装插件，不要全局铺开。挑一个非琐碎的改动任务，按第 7 步把命令式要求改写成「先写失败测试→改到通过」，让智能体自行跑完，再 review diff。
- AI 研究技能类（做法 AK）：只装 1 个类别，例如 `fine-tuning` 或 `inference-serving`。选一个与类别对应的真实小任务，先在不装该技能的会话里让 agent 做一次，记录查文档时间、命令/配置正确率、人工纠正次数；再装上该技能做一次。至少跑 3 次或换 2–3 个任务。同时用它的目录规范整理一份自己的内部知识，检查 `SKILL.md` 是否控制在 50–150 行、细节是否进 `references/`、是否写了「When to use this skill」和 breaking changes。
- 建站长流程类（做法 AL）：新建一个空文件夹，项目级装好 skill 后用 `/website-bauen start` 跑到「调研／设计方向」阶段即主动叫停，逐项检查命名与 Logo 方案、带真实搜索数据的调研结果、文案初稿、设计方向说明是否可直接使用；然后新开一个对话用 `/website-bauen weiter`，看能否仅凭 `WEBSITE-STATUS.md` 正确恢复上下文。
- 个人经验蒸馏类（做法 AM）：在 Claude Code 上装好 distilly 并确认 host 能发现该 Skill；只喂一位同事的设计文档/评审意见生成 colleague profile；用 3–5 个该同事平时会被问到的真实问题分别问「不带 Skill 的通用 agent」和「装了该 Skill 的 agent」，看输出能不能直接用；同一批问题再只喂群聊素材重建一次做对照；追加一份新文档确认旧结论未被覆盖；用一句纠正确认 Correction 层立即生效且可回滚。
- 领域方法论技能包类（做法 AN）：先不用技能，让 Claude 处理 3–5 个自己工作里的真实任务并留存输出；按第 7 步自建一份 `Skills/<类别>/<技能名>/SKILL.md`（写清技术要点、可用工具、边界情况、何时升级/求助）；安装或注入后用同样输入再跑一次，逐条对比；只在自建的那一类任务上使用，不扩张。

可观察的指标：

- 通用：人工修改次数 / 返工轮数是否下降；首稿可用率；背景重述次数；输出一致性；单次任务耗时；规则类返工次数。
- 做法 AK：是否减少查文档时间；命令/配置正确率；人工纠正次数；权限申请次数；是否只装一个类别；是否把目录规范用于内部知识；不要拿 13,433 stars、98/87 技能数、demo 数字当效果证据。
- 做法 AL：到「可用初稿」的墙钟时间对比手工；人工返工次数；中途断开对话后 `/website-bauen weiter` 能否仅凭 `WEBSITE-STATUS.md` 正确恢复上下文；调研阶段的数据是否真来自外部搜索数据源而不是模型编造；若走完上线，Google 与 ChatGPT 复测中是否出现可观测、可记录的变化。不要拿 30 stars、阶段顺序本身或「有检查、有复测环节」当效果证据。
- 做法 AM：直接采纳率（对照无 Skill 版本）；输出是否符合团队既有规范、是否先追问影响面；需要「他不会这样」纠正的次数是否下降；同一问题重复询问时关键判断是否一致；输出中的判断能否指回所喂素材（出现编造即失败）。不要拿三个 demo（Karpathy、字节 L2-1 后端、暗恋对象）或 25,547 stars 当效果证据。
- 做法 AN：首次输出即可用的比例；为得到可用结果所需的纠正轮数；专家检查清单中被遗漏项的条数；完成同一任务的时间；未加载技能与加载技能时同一任务的 token/长度差异是否符合「按需加载省上下文」的预期。不要拿 7,460 stars 或 README 对覆盖完整度的自述当效果证据。
- 其余做法指标保留：H 看测试是否通过、非空文件、git 改动；I 看交付前 8 条检查清单；J 看按 `diagnostics[]` 修的轮数；K 看品牌 onboarding 后是否还需手动改配色字体；L 看完成时间与返工次数；M 看 8 个已知答案题命中数与 0 幻觉；N 看七问是否全有答案；O 看约束数量与 PG 版本匹配；P 看 7-Question Gate；Q 看五道门禁通过/失败记录；R 看 `GLOSSARY.md` 与 ADR 是否更新；S 看任务完成时间与权限收敛；T 看数据来源、行情时间、抓取时间；U 看从描述问题到 Codex 指到具体元素的耗时；V 看是否自动触发；W 看观察条数与被接受改动数；X 看激活命中与返工轮次；Y 看模板化表达减少与事实不变；Z 看失败→通过证据；AA 看角色激活命中与返工；AB 看 playbook 是否走完与冲突次数；AC 看 validator 退出码与 warning 数；AD 看输出 token 与页面可读性；AE 看校验是否 0 错误与分发效率；AF 看弃用 API 检出数量与误报率；AG 看「愿意发出」比例与意义改动条数；AH 看 tier 计数与 frontier 已解决比例；AI 看 `/discover` 是否产出假设清单与实验设计；AJ 看 diff 是否只含被请求改动；AL 看到「可用初稿」的墙钟时间与人工返工次数、断点续做能否恢复上下文、调研数据是否来自外部搜索源。

反向指标：

- 加了技能后仍要口头纠正同一件事，先改 `SKILL.md` 或 `description`。
- 文档改完只是删了空话、没补事实，先把代码、配置和真实报错给它读。
- agent 只凭自己的声明就宣布完成，而 git status 和测试报告不支持，回到做法 H 第 8 步作废重跑。
- 某个本地批次同一断言连续失败 3 次还在本地重试，升级到强模型。
- 出图技能每次失败都要盲重试，说明没用上 `diagnostics[].supportedFixes`。
- 装着 diagram-design 却仍每次手动改配色和字体，说明没做品牌 onboarding。
- plugin-eval 分数不错但真实任务没改善，说明把筛子当成了结论。
- book-to-skill 生成的技能被问到书中没有的内容时开始编造，先停用。
- 任务书七个问题有任何一条没答案，别丢进目标模式跑长程。
- 门禁返回 `FAIL` 后主 Agent 直接改掉失败结论、或五个门禁一次也没拦下东西，先只留目录契约和 `P1`。
- 两条安装路径都装了、每个技能出现两份，先卸掉一条（做法 R）。
- `/improve-codebase-architecture` 的候选清单被当成改造方案直接执行，停一下——它是勘察不是抢救。
- google/skills 的技能没减少查文档时间、或权限申请次数反而增加，先只保留那一个。
- china-market-data 更新后 `.venv` 被删、脚本跑不起来，先重新运行 `setup_env.py`。
- Mobile Dev 装不上，先确认是不是 Apple Silicon Mac + Codex desktop、有没有私有仓库读权限。
- 装了 `explain` 每次都要显式点名才触发，先改 `description` 或改用法。
- 装完 task-observer 跑了几个会话、`skill-observations/observation-log/` 仍不存在，先补激活指令或 session-start hook。
- 做法 X 里技能没被激活，先检查请求是不是没带具体框架/技术名和具体任务。
- 做法 Y：如果命题方向被改却没被 `content_lock.py --strict` 拦下，不要直接采用修订稿，先逐条人工核对。
- 做法 Y：如果它添加了原稿没有的事实或观点，按提示词里「不要添加新事实」的核对项回退。
- 做法 Y：如果 DOCX 交付后样式、批注、修订记录、脚注或文本框丢了，先换文档工具走可编辑 Word 流程。
- 做法 Z：若产出没有失败→通过证据、或 hook/agent 派发不生效，退回 study。
- 做法 AA：把角色目录当效果证据，或一次装全部 agent 导致上下文占用过高；OpenCode 装超 119 个 agent，先卸掉多余角色。
- 做法 AB：如果 `/p3-mode` 没有真正按 playbook 推进、`watch_pull_request` 仍要轮询、`schedule_task` 在无人值守时没有产出，或 worktree/分支冲突不为 0，先降级为只读它的 playbook 与 principle 设计。
- 做法 AC：把 `validate_skill.py` 的退出码 0 当成效果结论——它只证明格式与规则合规。
- 做法 AD：开了 always-on 但每句话都出页、或页面对结论没有增量，先按规则里跳过的情形收紧。
- 做法 AE：把 `check_skills.py` 或 `claude plugin validate . --strict` 的 0 错误当成效果结论——它们只证明格式与规范合规。
- 做法 AF：把 5300 stars 或「built on thousands of hours」当效果证据。
- 做法 AG：把「AI 评委同意」当成「人类读者同意」；不要指望它把文本变成能通过 AI 检测器；不要把结论外推到合同或其他法律文件；不要直接重写信息不全的 AI 草稿却不走 Interview mode。
- 做法 AH：把 T4–T6 的直觉或猜测当成事实引用；把 dashboard 里的 tier 计数当成效果结论；把跑通 triangle-counts 示例当成研究质量提升；未发表结果未经同意就公开；在缺 subagent 委派能力的环境里硬跑 campaign。
- 做法 AI：把 26,862 stars 或 README 的 9 插件 / 69 skills / 42 commands 当效果证据；照着安装清单把 9 个插件一次全装；在 Codex 上等 `/discover` 自己跑起来；在 OpenCode / Cursor / Gemini CLI / Kiro 上期待 slash 命令。
- 做法 AJ：对拼写修正、显而易见的一行改动也套全套四条原则；把四条原则、stars 或「Karpathy 说的」当效果证据。
- 做法 AL：`/website-bauen weiter` 无法仅凭 `WEBSITE-STATUS.md` 恢复上下文，或调研阶段的数据看不出外部搜索来源，先降级为只借鉴「skill + 状态文件 + 阶段化接工具」的形态。
- 做法 AK：一次装全部 98/87 个技能；没看权限说明就把技能 symlink 到所有 agent 目录；把 13,433 stars、98/87 技能数、demo 里的 r=-0.99、95.6% recovery、1.9× 压缩仅 1.3% ppl 损失、两篇论文完全由 agent 写成当成效果证据；没读单个技能的 `SKILL.md` 正文就下结论；把 `npx @orchestra-research/ai-research-skills list` 能列出技能当成研究产出变好。
- 做法 AM：纠正轮数一直不下降，或输出里的判断无法指回所喂素材（出现编造），退回 study，只借鉴「Persona + 家族模块 + Correction 层 + 增量合并不覆盖」的结构；只给二手解读不给一手素材却指望 profile 像本人；把他人聊天记录直接喂进去而不先解决授权与隐私；把三个 demo 当效果证据；把 Grok Bot 的「saved Skill · 预览」当成能直接导入本地 `SKILL.md`；在 README 未列出的 host 上硬装。
- 做法 AN：在未获授权的目标上使用这些进攻性技能；把「像领域专家一样行为」「不用就不付上下文成本」当成已验证结论；期待 README 提供 `SKILL.md` 撰写模板（模板在未随材料给出的 `CONTRIBUTING.md`）；把 7,460 stars 当效果证据；在多个任务上都看不到稳定改善时仍把它写进常规流程。

注意：`doctor`、`validate`、`npm test`、`claude plugin validate`、`npx @anthropics/skills-ref validate`、`archify doctor`、`validate --json`、`python -m unittest discover -s tests`、`validate_skill.py`、`check.py` 这类检查只能证明「技能或 mod 装得上、格式合法、不带危险命令、图能通过校验、回归测试能过、技能符合规则表」，不能证明「产出更好」。效果必须自己对照。做法 AK 的 `npx @orchestra-research/ai-research-skills list` 同理；做法 AM 里「host 能发现该 Skill」也只证明装上了。

## 常见坑

- 整体 adopt：一次装多个技能包，导致上下文过载或规则冲突。先只装一个。
- 一次装整个插件市场：目录规模不是使用建议。
- 重复安装：同一项目里同时用项目级安装和插件市场装同一个技能包，skills 会出现两份。
- 安装时没勾一次性配置，或跳过仓库级配置，后面没有统一配置落点。
- 把用户调用型和模型调用型混着用。
- 手拷 hooks、在用户主目录安装、只信 README、忽略安全。
- `description` 只写「做什么」没写「什么时候用」，技能就不会在合适时机触发。
- 配置模板照抄不动；以为 `settings.json` 靠 Plugin 装；盲目开 `bypassPermissions`。
- 拿 star 数当质量证据：所有列出的 stars 只说明关注度，不说明产出改善幅度。
- 跳过冷启动门禁、把项目架构知识塞进技能包、采信 agent 的自我报告（做法 H）。
- 让 agent 自己装 ui-ux-pro-max 的 CLI、用错包名、不 dry-run 直接 init、搞反 MASTER 与页面文件的优先关系（做法 I）。
- mod 的模块变量会被 hot reload 清空、state 没在类型契约里声明、把教程当稳定 API、只装在临时目录、一个 mod 塞多个模块入口（做法 G）。
- 出图失败就盲重试、把 `compare` 当成影响分析、以为 `meta.locale` 会翻译你写的内容（做法 J）。
- 装完 diagram-design 就当会自动更新、以为托管安装和可编辑安装可以同时改风格指南（做法 K）。
- 拿扫描版 PDF 直接转换、技术书选了纯文本抽取器、把 token 节省数字当结论、把版权书的生成 skill 分发出去（做法 M）。
- 跳过 leader 的实测调研、任务书里没有反作弊条款、让清理类技能直接删、在目标模式里跑还没有完成态的任务书（做法 N）。
- 把 pg-aiguide 的效果证据当结论、把 schema 信息发到第三方端点、用单次 A/B 下结论（做法 O）。
- 在未授权目标上跑 Claude-BugHunter、把插件安装当完整安装、把 README 的示例 transcript 当真实结果（做法 P）。
- 攒到最后才质检、让主 Agent 覆盖门禁的 FAIL 结论、门禁 FAIL 后从头重跑、把 skill 根目录当可写工作区、把题目附件改掉、把领域流程当通用框架搬走（做法 Q）。
- 把作者主张当效果结论（做法 R）。
- 更新 china-market-data 后忘记重新初始化、把东财 `--source dataapi` 当独立备用源、把终端预览条数当全部数据（做法 T）。
- 把 Mobile Dev 当构建工具、在非 Apple Silicon Mac 或非 Codex desktop 上硬装、拿不到私有仓库访问权（做法 U）。
- 拿 README 的技能表当技能清单、把「装上了」当成「有效」、内网或不能访问 raw.githubusercontent.com 时硬用一行 curl（做法 V）。
- 只安装不激活、在安装的那个会话里验证、把缺失的观察日志当成技能质量差、只装 `SKILL.md`（做法 W）。
- 请求里不带具体框架和具体任务、把仓库徽章的 CI 状态当效果证据、不问清每个技能还需要什么、没配 Atlassian MCP server 就跑第 6 步（做法 X）。
- 把作者自制的合成案例当效果证据（做法 Y）；把 `content_lock.py` 的通过当「所有含义都不变」；在非 Codex 平台直接照搬调用语法；只装 `SKILL.md` 不装 `references/`；用 DOCX 抽取结果当可编辑 Word 交付；从 PDF 抽取正文却不装 Poppler；期待它自动串联其他编辑器。
- 做法 Z：Codex 不先 `/hooks` 信任 routing hook 就期待路由触发；Pi 缺少 extension 提供的 subagent / question / wake-up 工具；把仓库 stars 当效果证据。
- 做法 AA：一次装全部 agent、把角色目录当效果证据、在 OpenCode 里装超过约 119 个 agent。
- 做法 AB：没有 T3 Code 环境就硬装；把 `delegate_task`、`t3_thread_launch`、`watch_pull_request`、`schedule_task`、`t3_thread_read/search`、`preview_*`、`device_*` 的名字当命令语法；`install.sh` 直接全局装而不先用 `--project` 试。
- 做法 AC：把 `validate_skill.py` 的退出码 0 当成效果结论；跳过基线直接改；把 NM1–NM5 等关于新模型的论断当事实；只装 `SKILL.md` 不装 `references/` 与 `scripts/`；把 `--ban-em-dash` 当成必选项；在 claude.ai 上没开代码执行就跑 validator。
- 做法 AD：把 README 的 token 比例当成本项目的实测收益；开了 always-on 却不写跳过规则；以为装完会自动更新、以为 Claude Code plan mode 下也会出页面；手改配置文件去调 `open` / `theme` / `mode` / `style`；不满足 Node.js 20+ 或在不允许执行 shell 的宿主上硬装。
- 做法 AE：把 `check_skills.py` 或 `claude plugin validate . --strict` 的 0 错误当成效果结论；frontmatter 写多余字段；`name` 与文件夹名不一致或用了大写字母、下划线、空格；`description` 超过 1024 字符或只写「做什么」没写「什么时候用」；不用 `./scripts/release.sh` 发布；把整仓库手动压成 zip 上传；在 claude.ai 或 API 沙箱里期待 `video-by-reference` 渲染视频。
- 做法 AF：把 5300 stars 或「built on thousands of hours」当效果证据；不做基线直接审一遍就把新增发现全当真实问题；修完不重新编译、不跑测试；把它的 SwiftUI 检查规则搬到别的领域；自己写领域技能时整段重复 LLM 已知内容；在缺少 Node/npx 又没装插件市场的环境里硬装。
- 做法 AG：只给 AI 草稿、不给自己的笔记或转写，然后期待它写出像你的东西；把 Interview mode 当成必选；让它自行删减；只跑 `check.py` 就宣布完成；把作者自测的小样本结果当成独立第三方结论。
- 做法 AH：把「It scales」、campaign 更有效、独立裁判能真正纠正错误、dashboard 让进展可见当成已验证结论；从安装后的 skill 目录运行客户端，而不是从研究项目目录运行；Codex 没出现就忘了重启；Claude Code 安装后没开新会话；把 T4–T6 的直觉或猜测作为事实引用；把未发表结果直接公开或放进共享 skill；把示例依赖浏览器从 CDN 加载 d3 和字体当成离线可复现条件；缺 subagent 委派能力时仍把结果从 under review 改成已验证。
- 做法 AI：把 26,862 stars 或「9 插件 / 69 skills / 42 commands」当效果证据；照着安装清单把 9 个插件一次全跑一遍；在 Codex 上装完 slash 命令却一直等它触发；在 Codex 上把「让 Codex 把命令文件改写成 skill」当成等价移植；把 README 的 Windows PowerShell 监视任务当成官方修复；没跑过任何一条命令就判断「这个市场没用」。
- 做法 AJ：不备份直接覆盖项目原有 CLAUDE.md；对琐碎任务套整套四条原则；在非 Claude Code / Cursor 的环境里照搬 `.cursor/rules/karpathy-guidelines.mdc`；把四条原则或 stars 当效果证据；忘了 Goal-Driven Execution 需要先有测试或可验证标准。
- 做法 AK：把材料里「98 Skills」和 Roadmap 的「87 current」当成确定技能数——两者矛盾；一次装全部；忽略 README 没有权限、沙箱或安全说明就 symlink 到所有 agent 目录；把 demo 结果（r=-0.99、95.6%、1.9× 压缩仅 1.3% ppl 损失、两篇论文完全由 agent 写成）当成第三方复现；把 13,433 stars 当效果证据；不看单个技能的 `SKILL.md` 正文就判断技能质量；把 `npx @orchestra-research/ai-research-skills list` 能列出技能当成研究产出变好。
- 做法 AL：把 README 的阶段顺序当成可以复现的细节；第一次试用就走完上线，被 DataForSEO、webhosting 账号和部署环节带偏；把「有检查、有复测环节」当成效果证据；忽略 README 里的 DataForSEO 联盟链接；在非 Claude Code / Codex 或不支持 skill 机制的宿主上硬装；断点续做时不在项目文件夹里开新对话，导致读不到 `WEBSITE-STATUS.md`；把 30 stars 当效果证据。
- 做法 AM：只给二手解读、不给一手素材，却指望 profile 像本人；把他人聊天记录直接喂进工具而不先解决授权与隐私；把三个 demo（Karpathy、字节 L2-1 后端、暗恋对象）当效果证据；把「素材质量 = profile 质量」「不克隆本人、只做 source-grounded 建模」当成已验证结论；把创建者 Skill 装在非 `distilly` 的目录名下；在 README 未列出的 host 上硬装；把 Grok Bot 的「saved Skill · 预览」当成能直接导入本地 `SKILL.md`；忽略 Lark 需 bot 入群、Slack 需管理员且免费版仅 90 天、DingTalk 消息历史只能走浏览器、微信需先导出的硬约束；把 `INSTALL_EN.md`（本材料未给出）里的内容当成已知。
- 做法 AN：在未授权目标上使用这些进攻性技能；把「像领域专家一样行为」「触发词自动加载的实际命中效果」「不用就不占上下文」当成已验证结论；期待 README 给出 `SKILL.md` 的实际内容、frontmatter 示例或撰写模板（它只在 `CONTRIBUTING.md`，本次材料未包含）；把 7,460 stars 当效果证据；一次性把所有类别都装上；把它的目录结构当成可以跨领域直接复制的通用框架，而不做粒度调整。

## 证据与来源

- 「技能 = 文件夹 + `SKILL.md`，frontmatter 只需 `name` 和 `description`」来自 anthropics/skills 的官方 README 与模板；README 明确说技能「仅供演示与教育用途」，效果需自测。
- 「先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查」来自 jnMetaCode/superpowers-zh 的 README；没有 skill 正文和效果数据。
- 「自我纠正记忆、`SessionStart` 自动加载、知识平面」来自 rohitg00/pro-workflow 的 README；没有效果数据。
- 「先小范围试装，不要整体 adopt」来自 genspark-claw、ECC、AAS、awesome-copilot 等材料的共同结论；`doctor`/`validate` 只验证装得上、格式合法，不证明产出更好。
- 「做对照、看返工轮数和首稿可用率」来自 anthropics/skills 的验证建议和 awesome-copilot 的最小试用方式；是方法主张，不是对照实验数据。
- 「第三方技能有供应链风险，先审查」来自 genspark-claw 和 awesome-copilot 的 README 警告。
- 「多来源知识打包」来自 yusufkaraaslan/Skill_Seekers 的 README；质量门禁 `--threshold` 可用，但缺少与人工基线的对照。
- feiskyer/claude-code-settings（MIT，约 1.6k stars）的安装命令、settings.json 模板、Copilot Gateway、VSCode 环境变量、`customApiKeyResponses`、`update-cc-plugins.sh`、四个 WebSearch MCP 与五条技能触发排查，均来自该仓库 README；效果全凭作者描述。
- deep-research 的产出目录、handoff 的交接文档字段与脱敏行为、codex-skill 的触发词与「只呈现不自动改码」、github-review-pr 的 `file:line` 与原文引用要求，均来自 feiskyer/claude-code-settings 的 README 描述，属作者主张。
- mod 路线的全部内容均来自调研《Getting started with Claude Code mods》；材料在完整模块的 `async function ta` 处被截断。
- 中文技术文档路线的安装命令、autocorrect 的三种安装方式与 `autocorrect -V` 验证、三个调用提示词示例、五步写作流程、四类核心规则要点、14 条 AI 腔清单的类别说明，均来自 leter/zh-tech-writing 的 README。规则来源为阮一峰《中文技术文档的写作规范》（public domain），另参考华为《产品手册中文写作规范》、LeanCloud《文档风格指南》、《中文文案排版指北》、Google Developer Documentation Style Guide、GB/T 15835-2011。其中「效果」一节是单个作者挑选的示例，属主张不是评测结果。
- 论文精读路线的全部内容均来自 Gaoyuan-0423/biomedical-paper-reader 的 README（v0.1.2，MIT）；精读质量本身、「不依赖固定 MCP、第三方 skill、Python 库或付费服务」的依赖声明均属作者主张。
- cline-pilot 路线的全部内容均来自调研《gongdear/cline-pilot》（MIT，91 stars）；两阶段策略「在生产 Java 后端上验证过」是作者自述；`session_report.py` 的参数含义原文未说明。
- ui-ux-pro-max 路线的全部内容均来自调研《nextlevelbuilder/ui-ux-pro-max-skill》，即该仓库 README。能力数字全部为作者自述；演示素材被作者自己标注为非本 skill 产物。
- archify 路线的全部内容均来自调研《tt-a1i/archify》，即该仓库 README（MIT，稳定版 v3.0.1）。它把 `validate --json` / `deliver --json` 的稳定规则码、`diagnostics[]`、两轮修正上限、原子替换交付写进了 README，是本手册里验收信号最具体的一条；但 star 数、Trending 排名、社区案例全部是创作者口径。
- diagram-design 路线的全部内容均来自调研《cathrynlavery/diagram-design》，即该仓库 README。图型覆盖数量、版式语法数量、三种静态变体的可用性都是作者口径；本次调研在「重绘已有图（导入）」处被截断。
- wshobson/agents 路线的全部内容均来自调研《wshobson/agents》，即该仓库 README。94 插件 / 202 agent / 184 skill / 105 command / 16 orchestrator、40,149 stars 都是作者与指标口径；plugin-eval 的 LLM judge 与 Monte Carlo 层作者自己标注 experimental。
- book-to-skill 路线的全部内容均来自调研《virgiliojr94/book-to-skill》，即该仓库 README。24×–51× 的 token 节省、Steps 0–10 的完整生成流程都在未提供的 `docs/` 里，属作者主张；输出质量没有第三方验证数据。
- khazix-skills 路线的全部内容均来自调研《KKKKhazix/khazix-skills》，即该仓库 README。本次只拿到 README，六个技能的 `SKILL.md` 正文均未提供；「效果一致」「确实省事」均为作者自述。
- pg-aiguide 路线的全部内容均来自调研《timescale/pg-aiguide》，即该仓库 README（Apache 2.0，1853 stars）。效果数据只有厂商自己的一次 e-commerce schema 演示，没有任务集、多次重复、第三方复核。
- Claude-BugHunter 路线的全部内容均来自调研《elementalsouls/Claude-BugHunter》，即该仓库 README。83 个技能、15 个命令、681 条披露报告模式都是作者口径；README 没有给改善幅度数据；示例 transcript 被作者自己标注为非真实录制。
- math-modeling-skill 路线的全部内容均来自调研《XiaoMaColtAI/math-modeling-skill》，即该仓库 README（版本 1.3.0，1848 stars）。「CUMCM 默认约 15000 字词单位、约 20 页」README 自己注明是非官方要求；全文没有任何「用了它之后结果变好多少」的评测数据。
- mattpocock/skills 路线的全部内容均来自调研《mattpocock/skills》，即该仓库 README。各 `SKILL.md` 的实际提示词内容不在材料里，效果表述全部是作者主张。
- google/skills 路线的全部内容均来自调研《google/skills》，即该仓库 README。GitHub 指标显示 20653 stars，不构成有效性证据。
- china-market-data 路线的全部内容均来自调研《clawyi-com/china-market-data》，即该仓库 README。15 层、87 个端点、34 个数据来源、除 iwencai 外免 API Key 是原文给出的能力数字；作者主张：这不是投顾建议，代码开源不代表数据开放授权。
- Mobile Dev 路线的全部内容均来自调研《callstackincubator/codex-mobile-dev-plugin》，即该仓库 README。所有功能描述都没有配套数据、案例或评测。
- agentic-dev-kit 路线的全部内容均来自调研《ARYANK-08/agentic-dev-kit》，即该仓库 README。技能表当前只列出 `explain` 一个技能，且没有展示任何一个 `SKILL.md` 的实际内容。
- task-observer 路线的全部内容均来自调研《rebelytics/one-skill-to-rule-them-all》，即该仓库 README。作者自述在其 81 个技能中记下 1,600+ 条观察、「大部分被转成了技能改进」；skills.sh 报告 9,000+ 次安装（作者注明是下界）。
- Jeffallan/claude-skills 路线的全部内容均来自调研《Jeffallan/claude-skills》，即该仓库 README。67 个技能、12 个类别、371 个参考文件、9 个工作流命令，版本 0.4.18，MIT 协议，11725 stars。自动激活的实际准确率、误激活率无数据。
- academic-deai 路线的全部内容均来自调研《heise3/academic-deai》，即该仓库 README（v3.1.0，MIT）。效果证据只有作者自制的四组合成案例。
- pstack-claude 路线的全部内容均来自调研《michael-denyer/pstack-claude》，即该仓库 README。属作者主张、没有数据支撑的是：「improves agent outcomes」「keeps your code concise, simple and verified」、bug 流程产出「失败与通过证据」。
- agency-agents 路线的全部内容均来自调研《msitarzewski/agency-agents》，即该仓库 README。属作者主张、没有证据的是「Production-Ready」「battle-tested workflows」「可衡量的结果」「成功指标」等；README 没有给出指标定义、评测方法或对照数据。
- p3-stack 路线的全部内容均来自调研《uzairansaruzi/p3-stack》，即该仓库 README。属作者主张、没有数据支撑的是：「pstack 是对 AI slop code 的回应」「verification 严格到可以放心并行」「一个 worktree 一个写者由应用而非建议保证」。只有安装与入口命令可照做。
- skill-creator-plus 路线的全部内容均来自调研《robonuggets/skill-creator-plus》，即该仓库 README（MIT，31 stars）。属作者主张、没有独立验证的是：46 条规则本身、NM1–NM5、规则于 2026-10-05 对照 Anthropic 页面检查。材料只有 README，没有源码、`references/` 与 `examples/` 正文。
- 结论页路线的全部内容均来自调研《QingYunA/answer-me-with-html》，即该仓库 README。属作者主张、没有独立验证的是：约 50 ms 的渲染时间、手写 HTML 的 token 比例与「用 skill 后只写 21%」的结论；本次调研的结论明确说证据主要来自作者自测的 9 个页面样本。
- ishuagrawal/skills 路线的全部内容均来自调研《ishuagrawal/skills》，即该仓库 README。属作者主张、没有测试数据或案例支撑的是：「Claude 会在请求匹配时自动选用技能」、其他 agent「任何支持开放 Agent Skills 格式的 agent 都能用」、claude.ai/API 沙箱无法渲染。主要局限：本次只抓到 README，`video-by-reference` 的 `SKILL.md` 正文没有抓到；仓库 33 stars、1 个技能、单一作者，成熟度低。
- SwiftUI Pro 路线的全部内容均来自调研《twostraws/SwiftUI-Agent-Skill》，即该仓库 README。属作者经验或主张、没有量化证据的是：「built on thousands of hours」「targeting the mistakes LLMs actually make」、各审查规则本身的效果。主要局限：只有 README，没有基准测试、对照实验或具体项目效果数据；`SKILL.md` 的具体检查规则未读到；适用范围限于 SwiftUI / Apple 平台开发。
- work-humanizer 路线的全部内容均来自调研《phuryn/work-humanizer》，即该仓库 README 与作者自测证据。原文给出的数据与案例：12 篇新的 AI 写作文本，每个工具在同一模型上改写，由来自不同公司的四个 AI 模型盲评，每一处意义改动都与原文核对；评委「会发出去」的选择率：work-humanizer 48%，blader/humanizer 20%，单行提示 1%，Emulate-1 0%；意义改动：12 篇里 work-humanizer 18 处，blader/humanizer 33 处，单行提示 42 处，Emulate-1 120 处；在五个测试集共 56 篇改写文本中 work-humanizer 没有编造事实；单行提示在「更像人写」这一项上以 90% 胜过 AI 初稿、work-humanizer 为 75%，但它改写自由、会加作者没说过的东西；Pangram：work-humanizer、blader/humanizer 和单行提示的重写版都仍被判定为 AI（2–4% human）；给作者本人的笔记时，work-humanizer 的版本在 4 篇里 4 篇 Pangram 得 100% human；只有 work-humanizer 会向你索要缺失的信息：16 篇里它在 9 篇上发问，用掉了作者 39 条事实，编造 0 条，评委愿意发出的比例 69%（blader/humanizer 22%）。属作者主张：「保住每一条事实、承诺和限定条件的强度」是设计目标与自测结论，不是独立第三方验证过的性质；「拒绝造假」是技能文本里的约束声明，原文没有给出对抗性测试结果；Interview mode 里「作者」是模拟的，由 AI 按一份作者已知事实清单代为回答——真人场景未测。原文自陈的局限：样本小（scoreboard 12 篇，全部集合 56 篇，notes 结果 4 篇）；文本类型只有销售、营销、客服、产品和内部写作，没有合同或其他法律文件；评委是 AI 不是人，且评委之间对「human」是什么有分歧；每篇每工具只有一个样本；Pangram 只测了一个版本、一天；interview mode 里的是模拟作者；测试由开发该 skill 的人设计。适用条件：工作场景的对外/对内文本重写；有作者自己的素材（笔记、转写、自写粗稿）时收益最大；不要指望它把文本变成能通过 AI 检测；不要把结论外推到合同类法律文件、外推到「AI 评委同意就等于人类读者同意」。
- labyrinth-exploration 路线的全部内容均来自调研《nasqret/labyrinth-exploration》，即该仓库 README。原文给出的证据：仓库带一个可运行的公开示例（n 顶点图的三角形计数），README 给出完整可复制命令，并称「数秒构建、只需 Python 3」；有 `tests/`（引擎测试和 skill 内部一致性测试）以及 `tests.yml` 的 GitHub Actions 徽章；方法自述开发于 2026 年 9–10 月的一个纯数学研究计划，并把该计划的 lessons 收进 skill；仓库有 30 stars；MIT 许可。只是作者主张、没有量化支撑的部分：「It scales」（能扩展到多个开放问题）、campaign 流程更有效、独立裁判能真正纠正错误、dashboard 让进展可见——README 没有给出任何数字、对比实验或成功案例统计。局限与适用条件：材料只到 README 这一层，`references/lessons.md`、`docs/tutorial.md`、`references/campaigns.md` 里的具体内容看不到，真正的可照做细节要装好之后自己读；方法主要面向数学/理论科学/算法这类开放式研究，能否迁移到日常工程、运营类工作没有证据；依赖 Codex 或 Claude Code 的 subagent 委派能力，缺了这个能力结果只能停在 under review；示例依赖浏览器从 CDN 加载 d3 和字体；隐私约束意味着未发表结果不能直接公开复用。
- pm-skills 路线的全部内容均来自调研《phuryn/pm-skills》，即该仓库 README（MIT，26,862 stars）。9 插件 / 69 skills / 42 commands 是 README 明细口径（其中 pm-ai-shipping 标题写 3 个 skill，正文实际列 2 个）；Cowork 自动全装、Claude Code 与 Codex 的安装命令、其它助手拷 skills 目录、Start Here 命令对照表、示例提示词、Windows 用 PowerShell 计划任务监视 CoworkVMService（README 称解决 90% 的问题）都来自该 README。属作者主张、没有依据的是：Codex「原生读同一份 marketplace 文件、无需转换」、让 Codex 把命令文件改写成 skill 是可行替代、skills「兼容其它 AI 助手」。主要局限：本次只拿到 README，没有任何一个 skill 或 command 的正文，也没有任何效果数据、对照实验或成功案例；所以只能按本手册做法 A 试装 1–2 个插件并用真实想法对照，不能直接采用。
- andrej-karpathy-skills 路线的全部内容均来自调研《multica-ai/andrej-karpathy-skills》，即该仓库 README 与 CLAUDE.md。证据：原文直接引用 Karpathy 推文三段，作为四类问题的来源；给出四条可照做的行为规则和一张任务改写对照表；「How to Know It's Working」给出四条可观察信号。属作者主张、没有对照实验或量化数据的是：四条原则本身、四条「working」信号、以及「强成功标准能让 LLM 独立循环」的机制解释。适用条件：偏向谨慎而非速度，对琐碎任务价值低；面向会读 CLAUDE.md 的编码智能体（Claude Code / Cursor），其他形态需自己迁移规则。仓库 MIT 许可。
- AI-Research-SKILLs 路线的全部内容均来自调研《Orchestra-Research/AI-Research-SKILLs》，即该仓库 README。证据：README 自述了技能结构（每个技能含 50–150 行 `SKILL.md` 快速参考和 300KB+ `references/` 深度文档）、质量标准（官方仓库、真实 GitHub issue、生产工作流、必须写「When to use this skill」、必须列 breaking changes）、三条安装方式（npx 交互式安装器、Claude Code 插件市场、让 agent 读 welcome.md 自助安装）、日常管理 `list`/`update`、7 个 demo；输入 metrics 显示 13,433 stars；README 称平均每技能 420 行、总文档约 130,000 行、65 个 gold standard 技能、覆盖 23 类。局限与矛盾：正文标题写「98 Skills」，Roadmap 统计表却写「Skills 87（current）」，实际技能数无法确定；作者人数为 1（Contributors: 1，target 100+），基本没有第三方交叉验证；材料只有 README 且结尾被截断，单个技能的 `SKILL.md` 正文完全没出现，因此「production-ready」「battle-tested」只能算作者主张；demo 结果（r=-0.99、95.6% recovery、1.9× 压缩/1.3% ppl 损失、「两篇论文完全由 agent 写成」）均为作者自述，材料未给第三方复现或评测方法；「autoresearch 支持 Claude Code /loop 和 OpenClaw heartbeat」只有一句陈述，没有配置细节。适用条件：给编码智能体补 AI 研究全流程知识，或抄技能目录规范整理内部知识；必须按本手册做法 A 只装一个类别并在真实研究任务上对照，不能直接采用。
- website-bauen 路线的全部内容均来自调研《Julian-Ivanov/website-bauen》，即该仓库 README。可照做的部分：两条德语安装提示词、`/website-bauen start` 与 `/website-bauen weiter`、续做方式、更新方式、状态文件 `WEBSITE-STATUS.md`、阶段顺序、依赖清单与「按阶段配置依赖」的规则。属作者主张、没有数据的是：标题层面的「一步步带你完成整站建设」「即使还没有名称和 Logo 也能用」；README 未给任何案例、成品网站、耗时、成功率或用户反馈，全文没有任何数字支撑效果，只有 30 stars 这一外部指标。主要局限：输入只有 README，skill 本体的具体步骤、提示词与检查标准都看不到，无法核实各阶段究竟做什么、能否复现；README 含 DataForSEO 联盟链接，存在推荐动机；原文为德语，非德语使用者需确认语言处理是否顺滑；要走完全程需要第三方付费账号（DataForSEO、webhosting）。适用条件：仅对支持 skill 机制的智能体有效；对不需要建站的工作，价值主要落在「skill 打包 + 状态文件续做 + 阶段化接工具」这套方法上，而非建站本身。
- Distilly 路线的全部内容均来自调研《titanwings/distilly》，即该仓库 README。原文给出的可核实内容：可复制的安装命令与提示词；素材来源表及其前置条件；三家族的 profile 结构与 Work Skill 模块；三条维护机制（增量合并不覆盖、对话纠正写 Correction 层、更新自动归档可回滚）；三个演示样例（Karpathy、字节 L2-1 后端、暗恋对象）以及作者自述的 20K ⭐ 里程碑（本次元数据记为 25,547 stars）；MIT 许可，Python 3.9+；引用技术报告 COLLEAGUE.SKILL（arXiv 2605.31264）。只是作者主张：三个 demo 都是挑选过的对话展示，无对照组、无评测数字；「不克隆本人、只做 source-grounded 建模」「素材优先级排序」「素材质量 = profile 质量」均为作者经验判断且无数据。局限与适用条件：本材料只是仓库 README，`INSTALL.md` / `INSTALL_EN.md` 与 `SKILL.md` 的实现细节都没给到，无法核对；README 自述仍是 demo 版；Grok Bot 的安装路径未验证；DingTalk 消息历史只能走浏览器、Slack 免费版仅 90 天，都是硬约束；素材涉及他人聊天记录与个人信息，原文完全没有讨论授权与隐私问题，实际试用前须自行解决。
- Claude-Red 路线的全部内容均来自调研《SnailSploit/claude-red》，即该仓库 README。原文给出的可核实内容：安装与调用命令、目录与类别结构（23 类别、78 技能、目标约 130）、各类别技能清单与一句话描述、Roadmap 各阶段状态、MIT 许可、致谢（原始检查清单来自 Sahar Shlichov 的 offensive-checklist 集合）。指标方面仅有 stars 7460（来自本次线索的 metrics，不在 README 正文中）。仅为作者主张、无法从本次材料验证的：技能能让 Claude「像领域专家一样行为」、触发词自动加载的实际命中效果、「不用就不付上下文成本」的收益、78 个技能的覆盖完整度与质量。明显局限：README 只是目录与安装说明，没有任何一份 `SKILL.md` 的实际内容、frontmatter 示例、撰写模板或对照评测结果，因此只能提炼「怎么安装/怎么注入/怎么组织结构」，无法提炼「技能文件内部该怎么写」；内容属进攻性安全领域，适用范围受授权条件限制。
- 文中提到的 star 数来自 metrics，不构成有效性证据。

## 依据的调研

- [breakstageaxe61/genspark-claw](../research/radar/2026-10-02/39-breakstageaxe61-genspark-claw.md)：值得一试，先小范围试它这套打包方式——SKILL.md 约定 + 一行安装 + MCP 暴露 + validate 安全校验，是把技能批量供给智能体的现成骨架，可直接照做；但五个内置技能的 SKILL.md 正文原文一条都没贴出来，其质量无法核验，因此不建议整体 adopt，只建议试装并用真实任务对比后再取舍。
- [affaan-m/ECC](../research/radar/2026-10-01/509-affaan-m-ecc.md)：值得一试，建议在单个非关键项目、单个 harness（优先 Claude Code）上按 README 的 guided setup 做小范围试装，只取 rules/common 加一个语言包和核心工作流，并保留一键回滚；理由是原文给出了可照抄的安装命令、settings.json 配置片段和安装校验命令，但组件规模极大、全部能力均为作者自述、没有任何效果数据，且 README 混有商业推广与供应链风险警告。
- [sickn33/agentic-awesome-skills](../research/radar/2026-10-01/553-sickn33-agentic-awesome-skills.md)：值得一试，可以把 AAS Core 当作「按任务找现成 SKILL.md 并受控安装」的试用入口：先按 README 给出的命令在单一 host（Codex 或 Claude）上配置本地 MCP，让 agent 选出少量 skill ID，validate + plan 预览后再 dry-run 安装；之所以只建议试，是因为 README 只给出安装/预览级步骤，apply 与 recovery 仍属实验性，且 2610+ 技能库本身没有质量与语义适配的证据。
- [anthropics/skills](../research/radar/2026-10-01/557-anthropics-skills.md)：建议采用，直接照官方 README 走：在 Claude Code 里加 marketplace 装 example-skills 摸清形态，再照 SKILL.md 模板把一件自己反复做的工作打包成技能，用返工轮数和首稿可用率验证。理由是这个仓库给出了可原样复制的安装命令和技能的最小结构（文件夹 + 带 name/description 的 SKILL.md），是把指令、脚本、资源打包供给智能体的官方一手参照。
- [github/awesome-copilot](../research/radar/2026-10-01/567-github-awesome-copilot.md)：值得一试，如果你在用 GitHub Copilot，可以按 README 给出的两条命令注册 marketplace 并安装现成插件，用社区打包好的 agent/instruction/skill 给助手补上下文和工具；但抓到的只有 README 索引，具体插件内容与效果无法核实，所以先小范围试一个插件并对照验证，不必整体照搬。
- [jnMetaCode/superpowers-zh](../research/radar/2026-10-01/581-jnmetacode-superpowers-zh.md)：值得一试，可按 README 给出的 `npx superpowers-zh`（或 Claude Code 插件市场）命令，在一个非关键项目里装 superpowers-zh 试用，它把编码智能体的工作流固定为“先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查”。理由是安装/卸载/路径配置具体可复制、覆盖 26 款工具；但原文只有 README、没有 skill 正文和效果数据，实际改善需自己对照验证。
- [yusufkaraaslan/Skill_Seekers](../research/radar/2026-10-01/585-yusufkaraaslan-skill-seekers.md)：值得一试，建议小范围试用：用 Skill Seekers 把一份项目文档或本地代码库自动转成 Claude Skill/IDE 上下文，先验证质量门禁和在真实任务中的效果，再决定是否纳入手册。理由：README 给出了完整的 CLI 步骤（安装、create、package、install-agent、MCP），但质量与效率数据多为作者自述，需自行验证。
- [rohitg00/pro-workflow](../research/radar/2026-10-01/596-rohitg00-pro-workflow.md)：值得一试，先在单个项目上装 Claude Code 原生插件，只跑通 /doctor、/learn-rule、/wrap-up 三个动作，确认纠正能被持久化并在新会话自动加载后再考虑启用 wiki 与自动研究循环；理由是 README 给出了可直接复制的安装与命令流程、可把重复纠正转成可检索的持久规则，但全文没有任何效果数据，且技能/命令数量在文档内自相矛盾，不足以直接采用。
- [feiskyer/claude-code-settings](../research/radar/2026-10-01/602-feiskyer-claude-code-settings.md)：值得一试，可以照抄它的安装命令和 settings 模板，但只按需选装 1–2 个技能做小范围试用，不要整包采用——理由：安装/配置步骤具体可复制，但技能效果全凭作者描述、且其中模型名需按自己网关实际提供情况替换。
- [leter/zh-tech-writing](../research/radar/2026-10-02/57-leter-zh-tech-writing.md)：建议采用，直接装上这个 Agent Skill，把中文技术文档的写作与审稿交给它执行，因为 README 给出了可复制的安装命令、调用提示词和一套五步写作流程；配套的 autocorrect 负责中英文空格与全角标点，属于无需模型的确定性修正。
- [Gaoyuan-0423/biomedical-paper-reader](../research/radar/2026-10-02/63-gaoyuan-0423-biomedical-paper-reader.md)：值得一试，按 README 提供的方式在本地 clone 这个 skill，先用一篇自己已熟悉的论文试跑一次精读报告，再决定是否纳入常规流程；它的价值在于给出了一套可照做的“逐图理解 + 证据边界判别 + 固定报告骨架”的精读流程，但核心规则在看不到的 SKILL.md 与 references 文件里，且仅面向生物医学论文。
- [Getting started with Claude Code mods](../research/radar/2026-10-02/720-getting-started-with-claude-code-mods.md)：值得一试，可以照原文从零搭一个约 80 行的 Claude Code mod（Token Weather），在本机小范围试，验证它能否把上下文占用、危险命令拦截、改动回放这类信息嵌进会话；给 try 而不是 adopt，是因为教程本身完整可照做，但 mods API 会随版本变化，且 mod 以与 Claude Code 同等权限在本机运行，需要先确认信任来源。
- [gongdear/cline-pilot](../research/radar/2026-10-02/488-gongdear-cline-pilot.md)：值得一试，建议小范围试：照 README 给出的安装命令、首次环境配置和「冷启动用强模型、稳态用本地小模型」的两阶段流程，在一个已有小仓库上跑通一次「冷启动→小批次任务→脚本监控→证据验收」的闭环。理由是可照做的命令与流程在原文中已经比较具体，但 4 段回报格式、6 项验收清单等核心内容位于 SKILL.md 和 references/*，本次只拿到 README，且验证数据均为作者自述。
- [nextlevelbuilder/ui-ux-pro-max-skill](../research/radar/2026-10-02/515-nextlevelbuilder-ui-ux-pro-max-skill.md)：值得一试，先在单个真实前端项目上按 README 的命令装一遍（npm 装 ui-ux-pro-max-cli → uipro init --ai <你的 agent>），并用 --design-system --persist 生成 MASTER.md + pages 覆盖的分层检索方式试一个页面：原文给出了可直接复制的安装命令、search.py 参数、检索提示词和提交前检查清单，属于本项目中少见的“给 agent 补一块专业知识”的可照做做法；但所有能力数字均为作者自述、演示素材被作者自己标注为非本 skill 产物，且页面大量篇幅是付费版与自家产品推广，所以先小范围试、别全面铺开。
- [tt-a1i/archify](../research/radar/2026-10-02/527-tt-a1i-archify.md)：值得一试，先把它当作“把设计沟通做成可复用技能”的小范围试用对象：按 README 给出的安装命令和两段提示词，分别跑一次“从描述出图”和“从仓库出图”，并用 validate/deliver 的 JSON 收据衡量返工轮次是否下降。理由：安装、提示词、CLI 校验-预览-交付流程都是可直接照抄的，但全部证据来自项目自述（star 数、Trending 排名、案例均为创作者口径），缺少独立验证，不宜直接 adopt。
- [cathrynlavery/diagram-design](../research/radar/2026-10-02/565-cathrynlavery-diagram-design.md)：值得一试，建议小范围试：在 Claude Code（或 Codex/Pi）里装上这个 Agent Skill，先用自己的站点做一次品牌 onboarding，再跑一遍生成→导入→导出，用它自带的保真账本和对比度校验判断产物是否真能交付。理由：原文给的是可照抄的安装命令、四档参数、语义 token 与校验产出，不是只讲理念；但它本质是一个绘图技能，收益取决于你是否经常出图，且质量主张缺少独立证据。
- [wshobson/agents](../research/radar/2026-10-02/566-wshobson-agents.md)：值得一试，先按 README 的最小路径小范围试用——Claude Code 用 `/plugin marketplace add` + 安装单个插件，或走 skills-only 的 `gh skill install` / `npx skills add` 只装技能，再用其自带的 `plugin-eval` 与 `make validate` 做质量筛检后再决定是否扩大；它给的是可直接复制的安装、生成与评测命令以及任务类型到模型档位的映射，但质量评测方法自认未经人工标注验证，规模数字也仅为自述，不宜直接全量采用。
- [virgiliojr94/book-to-skill](../research/radar/2026-10-02/569-virgiliojr94-book-to-skill.md)：值得一试，把反复查阅的技术书/内部文档用 book-to-skill 转成 Agent Skill，让代理按需读取章节而不是整本塞上下文——安装与运行命令齐备、产物结构明确，但完整流程和 24×–51× 的省 token 数据都在未提供的 docs 里，属于作者主张，建议先拿一本自己的文档小范围试并自测正确率与幻觉率再决定是否推广。
- [KKKKhazix/khazix-skills](../research/radar/2026-10-02/573-kkkkhazix-khazix-skills.md)：值得一试，建议先小范围试装其中 1–2 个技能（优先 leader 与 neat-freak），按 README 给的一句话安装命令装进支持 Agent Skills 的 Agent，再用它给的触发词跑真实任务对照效果；因为原文提供了可照抄的安装流程、降级方案、触发词，以及目标七问、三色分级等可直接复用的规则，但各 SKILL.md 正文和效果数据均未给出，只到小范围验证的程度。
- [elementalsouls/Claude-BugHunter](../research/radar/2026-10-02/590-elementalsouls-claude-bughunter.md)：值得一试，在已获授权的漏洞挖掘/外部红队场景中，按 README 的插件方式小范围装这套技能包，用 `/hunt` 跑一个自建靶场并按 7-Question Gate 校验产出；它把「技能包分层 + 按主题自动加载 + 阶段化流程 + 提交前闸门 + 证据脱敏」这套可复制的工作流给全了（含可照抄的安装命令和多 harness 目录映射），但仅凭 README 无法验证 83 个技能的实际质量，且覆盖范围被明确限定在外部攻击面。
- [timescale/pg-aiguide](../research/radar/2026-10-02/599-timescale-pg-aiguide.md)：值得一试，按 README 给出的命令给 AI 编码助手装上 pg-aiguide 的 Postgres 技能与文档 MCP，然后用它的开/关对照法在一个真实 Postgres schema 任务上小范围验证收益。理由是安装与配置步骤完整可直接照做、覆盖多种主流 agent，但效果证据只有厂商自己的一次演示，尚不足以直接 adopt。
- [XiaoMaColtAI/math-modeling-skill](../research/radar/2026-10-02/600-xiaomacoltai-math-modeling-skill.md)：值得一试，把这个 skill 的三阶段拆分（建模分析→代码实现→论文撰写）加上「阶段内只读门禁 + 复现清单 + 目录契约」的骨架，小范围试用到自己的复杂分析任务上；它是可直接安装运行的完整 skill（含具体命令与配置），但面向数学建模竞赛，通用性来自流程结构而非领域内容，且原文未给出效果数据，所以先试不建议直接全盘采用。
- [mattpocock/skills](../research/radar/2026-10-03/73-mattpocock-skills.md)：值得一试，值得在一个真实仓库里小范围试：按原文两条安装路径之一装上技能集，先跑 /setup-matt-pocock-skills 配好 issue tracker、triage 标签和文档目录，再从 /grill-with-docs + /tdd 这两个最高频入口开始用；理由是原文给出了可直接复制的安装命令、一次性配置项和每个技能的职责清单，但效果只有作者主张，需要自建指标验证。
- [google/skills](../research/radar/2026-10-03/854-google-skills.md)：值得一试，建议小范围试：用 npx skills add google/skills 或对应 agent harness 的插件市场，按当前任务只安装一个 Google 相关技能，并先在测试项目验证；README 给出了可复制的安装流程和大量技能分类，但未展开单个技能的具体步骤与效果数据，暂不宜直接全面采用。
- [clawyi-com/china-market-data](../research/radar/2026-10-03/920-clawyi-com-china-market-data.md)：值得一试，建议小范围试用：在 Claude Code 或 Cursor 等可执行本地 Python 的宿主中安装该 Skill，用于中国金融数据检索类任务；理由是它提供了可照做的安装、调用和验证步骤，但属于特定领域且存在数据授权与接口稳定性限制。
- [callstackincubator/codex-mobile-dev-plugin](../research/radar/2026-10-03/921-callstackincubator-codex-mobile-dev-plugin.md)：值得一试，在符合条件的 Apple Silicon Mac 上按原文两条命令装上 Mobile Dev 小范围试用：把 iOS/Android 模拟器与真机画面、控制、日志和性能面板接进 Codex 聊天，让 Codex 直接读日志、检查元素、录制并对比性能；理由是原文给出了完整可照做的安装命令、平台依赖表和起步指令，但目前仓库为私有、只支持 Apple Silicon Mac + Codex desktop，且没有任何效果数据，所以先试不宜直接采用。
- [ARYANK-08/agentic-dev-kit](../research/radar/2026-10-03/984-aryank-08-agentic-dev-kit.md)：值得一试，按 README 给的一行 curl 命令把某个 skills/<name>/SKILL.md 装到项目的 .claude/skills/ 或全局的 ~/.claude/skills/，重启 Claude Code 后用一次解释类请求验证它是否按 description 自动加载；可以试是因为安装和自建技能的步骤具体可复制，但 README 里没有任何技能正文，实际收益必须装完读文件再判断。
- [rebelytics/one-skill-to-rule-them-all](../research/radar/2026-10-03/1005-rebelytics-one-skill-to-rule-them-all.md)：值得一试，值得在一个活跃的 Claude Code 项目里小范围试：按 README 的命令安装，并务必在 CLAUDE.md 补上激活指令，跑几轮真实会话后用 observation-log 目录是否出现来确认它真的在跑。理由：仓库给出了可直接照做的安装、激活、验证和定期复核流程，但给到的材料只有 README，看不到技能本体、观察格式和改进质量，收益目前主要是作者自述。
- [Jeffallan/claude-skills](../research/radar/2026-10-04/1164-jeffallan-claude-skills.md)：值得一试，建议先在 Claude Code 中按 README 给出的两条插件命令安装 fullstack-dev-skills，挑 1–2 个具体开发任务（如加认证、写组件）验证技能是否按预期自动激活、工作流链是否真的串起来；理由是原文只提供了安装方式与使用模式，没有效果数据或验证方法，属于值得小范围试而非直接采用。
- [heise3/academic-deai](../research/radar/2026-10-04/1188-heise3-academic-deai.md)：值得一试，建议小范围试：按仓库给出的路径把 academic-deai 装成 Agent Skill，用它的自然语言提示词做论文润色／翻译／结构修订，再用 content_lock.py 做命题级核对；理由是安装、提示词、验证命令都可直接照抄，但效果证据只有作者自制的合成案例，且作者自述没有盲评、模型间对照或检测器分数。
- [michael-denyer/pstack-claude](../research/radar/2026-10-06/1417-michael-denyer-pstack-claude.md)：值得一试，可以在 Claude Code（或 Codex/Pi）上按 README 给出的两条命令安装 pstack，再用 poteto-mode 跑一个已知小 bug，验证它是否真的复现失败、委派修复并交出通过证据；理由是仓库提供了可直接复制的安装命令、路由入口和按角色配置模型/推理强度的 setup 语法，但完整工作流定义在未被抓取的 docs/reference.md 与 SKILL.md 中，需小范围试用后再固化。
- [msitarzewski/agency-agents](../research/radar/2026-10-06/1421-msitarzewski-agency-agents.md)：值得一试，建议小范围试：按 division 只装少量 agent（如 code-reviewer、frontend-developer）进你在用的 Claude Code 或 Cursor，用真实任务跟默认提示做对照。理由是原文给出了可直接照抄的安装、筛选和激活命令，但只给了角色目录，没给任何一个 agent 文件的内容，也没有任何效果证据，值不值得用只能自己验。
- [uzairansaruzi/p3-stack](../research/radar/2026-10-06/1491-uzairansaruzi-p3-stack.md)：值得一试，值得在 T3 Code 环境里小范围试一次：按 README 的 clone→install.sh→/setup-p3→/p3-mode 四步挂上一个真实小任务，验证它的 playbook 路由和 worktree/PR 监视机制是否真比手动流程省事；但仓库只给了安装与入口命令，编排原语只有名字没有配置细节，也没有任何效果数据，只能算“可试”而非“可采纳”。
- [robonuggets/skill-creator-plus](../research/radar/2026-10-06/1582-robonuggets-skill-creator-plus.md)：值得一试，建议小范围试：按 README 的安装命令把它装进 Claude Code 的 skills 目录，先对现有技能跑 validate_skill.py --all 拿到基线，再按审计报告改 2–3 条并复跑对比，理由是它给了可直接执行的命令和 46 条可逐条勾选的规则，能把“技能写得好不好”变成可复核的检查项；但材料只有 README、规则和模型相关论断均为作者主张，先验证再决定是否纳入手册。
- [QingYunA/answer-me-with-html](../research/radar/2026-10-08/2001-qingyuna-answer-me-with-html.md)：值得一试，先在一个能执行 shell 的 agent（如 Claude Code）上装这个 skill 并开启 always-on，用两三个复杂问题对比“直接让模型写 HTML”与“模型写 Markdown 草稿 + CLI 渲染”的输出 token、耗时和页面可读性，再决定是否写进手册。理由是它把“模型只写内容、CLI 负责布局”这条分工约定固化成了可复制的安装命令、配置命令和一条可直接粘贴的规则提示词，并附了可复现的 token 基准，但证据主要来自作者自测的 9 个页面样本。
- [ishuagrawal/skills](../research/radar/2026-10-09/2192-ishuagrawal-skills.md)：值得一试，建议小范围试：把它的「写 SKILL.md → check_skills.py / claude plugin validate --strict → release.sh 打包发布 → 插件市场或 npx skills 分发」这套技能生产与分发流程照抄用来做自己的技能；自带的 video-by-reference 因 SKILL.md 正文未抓到、仓库仅 33 stars 且只有一个技能，只当线索看。理由是安装、校验、发布命令都是可直接复制的具体步骤，而技能本身的内容与效果在材料里没有依据。
- [twostraws/SwiftUI-Agent-Skill](../research/radar/2026-10-10/2269-twostraws-swiftui-agent-skill.md)：值得一试，如果你用 Claude Code、Codex、Cursor 等做 SwiftUI 开发，按 README 的 npx 或插件市场步骤安装 swiftui-pro，并在写/审 SwiftUI 代码时显式触发；更一般地，可借鉴其“领域技能包 + 按需触发 + 只写 LLM 边界知识”的模式为其他工作补上下文。理由是安装与触发步骤明确、可直接照做，但效果证据主要是作者经验，且适用范围限于 SwiftUI。
- [phuryn/work-humanizer](../research/radar/2026-10-10/2323-phuryn-work-humanizer.md)：值得一试，把 phuryn/work-humanizer 作为标准 SKILL.md 装进 Claude Code / Codex 的 skills 目录，用「改写 + 先访谈」流程处理工作写作，并优先喂自己的笔记或粗稿，而不是直接重写 AI 草稿；理由是安装路径、调用提示词和 check.py 都可照抄，且它以「不改动事实与承诺强度」为核心约束（12 篇里 18 处意义改动，对比 blader/humanizer 33、单行提示 42、Emulate-1 120），但这些证据来自作者自设的小样本 AI 盲评、真人与合同类文本未测，所以先小范围试用。
- [nasqret/labyrinth-exploration](../research/radar/2026-10-10/2372-nasqret-labyrinth-exploration.md)：值得一试，先在 Claude Code 或 Codex 里按 README 的 git clone 方式把它装成 skill，跑通 triangle-counts 示例后，拿一个自己领域里边界清楚的小型开放问题走 2–3 轮完整循环再决定是否推广；理由是它给出了可复制的安装/运行命令和一整套可操作的证据分级、独立裁判、地图更新流程，但材料只到 README 层，效果只有作者主张、没有量化证据。
- [phuryn/pm-skills](../research/radar/2026-10-10/2391-phuryn-pm-skills.md)：值得一试，建议小范围试：按 README 给出的 CLI 命令装 1–2 个插件（如 pm-product-discovery），用 /discover 跑一个真实想法，检验产出是否是结构化流程而非泛泛文本；理由是安装步骤与命令示例可直接照抄，但原文只有宣传性主张、没有 skill 内容和任何效果数据，不足以直接采用。
- [multica-ai/andrej-karpathy-skills](../research/radar/2026-10-11/2466-multica-ai-andrej-karpathy-skills.md)：建议采用，直接在编码智能体项目里落一份 CLAUDE.md（或装 Claude Code 插件），把四条原则当成硬约束，并把命令式任务改写成带验证标准的目标；理由是原文给了可复制的安装命令、四条可照做的行为规则和一张任务改写对照表，属于拿到就能用的配置，而非泛泛观点。
- [Orchestra-Research/AI-Research-SKILLs](../research/radar/2026-10-11/2507-orchestra-research-ai-research-skills.md)：值得一试，建议小范围试用：先用 npx 安装器或 Claude Code 的 /plugin 命令装一两个类别，在真实任务上跑一遍，同时把它的 skill-name/SKILL.md + references/ 目录规范抄来整理自己已有的内部知识；理由是原文给出了可直接复制的安装命令和技能打包结构，但单个技能的正文没有随材料给出，宣称的效果只能自测。
- [Julian-Ivanov/website-bauen](../research/radar/2026-10-12/2728-julian-ivanov-website-bauen.md)：值得一试，可以把 Claude Code 的“agent skill + 状态文件 + 按阶段调工具”这套打包方式小范围试一遍，用它跑一次从零建站的前半程；理由是原文给出了可直接复制的安装/启动/续跑指令和明确的阶段顺序，但 skill 本体内容和实测效果未在材料中给出，只能算小范围验证。
- [titanwings/distilly](../research/radar/2026-10-13/2901-titanwings-distilly.md)：值得一试，可按 README 给出的最小流程在受支持的 host（建议先用 Claude Code）小范围试：安装 distilly Skill，选一位同事，按其素材优先级（本人长文/评审意见 > 决策性回复 > 群聊）生成 colleague profile，再用真实问题做“带 Skill / 不带 Skill”对照。理由是它把“个人工作方式”固化成可反复调用的 Skill，并给出对话纠正、增量合并不覆盖、版本回滚三条可操作的维护机制；但材料只是 README、项目自述为 demo 版，且没有任何效果数据，所以只值得小范围试，不能直接进手册作为既定做法。
- [SnailSploit/Claude-Red](../research/radar/2026-10-13/2904-snailsploit-claude-red.md)：值得一试，建议小范围试：把 claude-red 当作“领域专家方法论 → 可注入技能包”的可复制模板，照它的安装/加载命令在自己领域复现一次技能加载，再决定是否写进手册；理由是 README 给出了具体可执行的安装与注入命令、以及技能粒度设计，但没给 SKILL.md 撰写模板和任何效果数据。
