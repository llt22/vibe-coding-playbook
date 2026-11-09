# 把书和重复工作变成 agent 能调用、可验收的技能

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：你装了不少技能、读了不少书，但 agent 仍会编造、返工，你无法判断技能是否真的改善了工作。
> 先试这一步：先在一个非关键项目上选一类重复任务，用同一输入做 3 次有/无技能对照，记录人工修改次数和返工轮数。
> 最近修订：2026-11-10

## 解决什么问题

你已经在用编码 agent、写作 agent 或通用 agent，但经常遇到这些问题：每次都要重复描述同一套规范；装了一个技能包也不确定是否真的减少返工；同类排障反复出现，踩过的坑没有变成下一次可直接调用的经验；让 agent 复刻动效视频或 UI 录屏时，它只能凭想象写节拍、缓动、颜色和文字；读过的技术书或内部文档无法按需变成 agent 能调用的知识；编码 agent 过度工程，重复造轮子、写占位符或注释代码、自测失败却不回去修；要把线上内容站迁成静态 Astro 站，却担心 URL、内容、SEO、重定向、媒体路径和三档视觉不一致；要让 agent 先出设计图、人工审图，再照图建站；要把某个领域的团队约定、公开权威来源和交付前检查清单打包成可安装、可自动触发的技能；要在做一人公司的 AI 产品时按阶段路由到对应子技能；要让编码 agent 在后端默认处理鉴权作用域、幂等键和 schema 迁移。

本版新增一个协作问题：你一个人总控多个长期 AI 助手，活派出去没人收、说做好了其实没核过、给新手的步骤只有自己看得懂、同一个坑踩两遍。做法 BH 给出一条可照着走的闭环：派活前写一行“待收”登记，到点记“已接单”，收到成果记“已收到成果”并写明结果在哪，核过才记“已验收”；只有“已验收”或授权取消才从未完清单里拿掉。它不带定时、不带叫醒、不带自动回执，到点查要靠宿主定时能力或人。

本版还新增一个“让书变成可调用技能”的具体问题：你读过一本方法论书或内部文档，想让 agent 忠实调用书里的框架和流程，而不是让模型自由发挥、把书里没讲的内容编出来。做法 BI 用 BookLeme 把书编译成两类可安装产物：knowledge_pack（知识包：Topic Index 路由表 + 按需加载的框架分片 + 决策速查 + 出处清单）和 behavior_skill（行为技能：角色 + 硬约束 + 状态机 + 具名输出契约 + 反模式 + 情绪护栏）。它明确拒绝做读书笔记；书里没讲必须拒答；并用 7 个忠实度指标、负例拒答和 6 条版权硬门验收。当前项目处于 M0–M3，coverage_score 0.667 未达标、LLM judge 未接入，只能先小范围试。

本版还保留一个基础问题：你打算把重复工作写成技能，但不确定技能应该怎么组织，才能让 agent 启动时只看到名称和描述、任务匹配后再读完整说明、执行时再按需运行脚本或加载引用材料。Agent Skills 的 README 给出了一个轻量格式：技能是一个文件夹，至少包含 SKILL.md，里面写 metadata（至少有 name 和 description）和 instructions；可选 scripts/、references/、assets/。它用渐进披露分三阶段加载：启动时只读每个技能的 name 和 description；任务匹配后读取完整 SKILL.md；执行时按需运行附带代码或加载引用文件。这个格式值得先小范围试，但 README 不是完整规范。

本版还新增一个具体场景：编码 agent 写后端时，默认不做登录限流、查询按调用者作用域过滤、扣费或发送类操作的幂等键、迁移的 expand-contract、并发建索引、分批回填和 down migration。做法 BG 用 backendskills 把这三类后端安全默认值装进 agent，并用 agent 看不到的隐藏检查做有/无对照，避免只看它自己说完成。

这篇手册的主线是：先用做法 A 在一个非关键项目上试装一个现成技能包，用同一任务做有/无技能对照；确认有效后，再用做法 B 把自己的重复工作写成 SKILL.md，并按 Agent Skills 的 scripts/references/assets 结构和渐进披露机制自检；需要领域权威规范时用做法 BE，先写 SKILL.md 和 references/，再建 evals 做装/不装对照；重复排障用做法 AX 写成按现象触发的经验卡；动效复刻用做法 BA 先看片、再按页面契约写代码、逐帧打分；技术书或内部文档转技能用做法 M 先做小范围试用，要求更高时用做法 BI 的编译流水线和忠实度指标；站点静态迁移用做法 BC 跑到 PR + noindex staging 再验收；先出图再建站用做法 BD；一人公司 AI 产品按阶段路由用做法 BF；后端安全默认值用做法 BG，先挑 2–3 个后端任务、每个任务跑 5 次有/无对照；一个人带多个 AI 助手派活收不回来，用做法 BH 先装两支技能、用一行登记跑完一件小活。专门场景保留为索引，统一要求先小范围对照再采用。

## 适用与不适用

适用：

- 你已经在用 Claude Code、Codex CLI、Cursor、Gemini CLI 或类似 agent，有一类反复出现、有明确规范或多步流程的任务。
- 你愿意在一个非关键项目上做一周对照，而不是安装成功就认为改善。
- 你要把高频、多步、输入输出相对稳定的工作封装成技能，并希望 agent 能按 description 自动发现、按需加载脚本和参考资料。
- 你有重复性排障任务，且 agent 会读 AGENTS.md、CLAUDE.md 或等价指令文件，愿意把踩过的坑写成短卡并按现象检索（做法 AX）。
- 你需要给 agent 补一块领域知识：UI/UX 设计、Postgres、Google 产品与技术、中国金融市场数据、移动端模拟器观测、中英文学术写作、SwiftUI、工作写作、AI 研究、Go 终端 UI、Elixir/Phoenix、Android 开发、Rust 等领域规范。
- 你需要把文档站点、仓库、PDF、技术书或内部 docs 变成按需加载的技能；其中把技术书或内部文档转成技能先按做法 M 做小范围试用；要求可校验、可验收时按做法 BI 试用。
- 你有一本有权使用的技术书、方法论书或内部文档，想把书里的工作方式（提问顺序、判断条件、证据规则、证伪条件）编译成可调用技能，并愿意用负例拒答、逐字溯源和 7 个指标验收（做法 BI）。
- 你需要给多步、有明确交付物的复杂任务分阶段推进，或在编码 agent 里立行为约束、做路由、做审查回路。
- 你需要安装或分发以 SKILL.md 为载体的技能到多个编码代理，或把团队规范同步给多人。
- 你需要给 agent 补仪表盘/数据屏设计规范，并希望验收落在三档截图而不是代码自检（做法 AY）。
- 你需要 BA/PO 规格文档、用户故事、验收标准、测试用例和追溯矩阵，且宿主支持 Agent Skills（做法 AZ）。
- 你要把扁平矢量动效、排版动画或 UI 动效录屏复刻成内联 SVG + GSAP 时间线，并希望用逐帧对照而不是口头判断验收（做法 BA）。
- 你发现编码 agent 过度工程，愿意在带测试的代码库上做 3–5 个任务对照（做法 BB）。
- 你要把一个 HTTP 可访问的内容站迁移成静态 Astro 站，且站点没有站内搜索、评论、购物车、登录、UGC 等静态站做不到的功能（做法 BC）。
- 你要让 agent 先产出落地页分区视觉稿、App 屏幕与流程或品牌规范板，人工审图后再建站（做法 BD）。
- 你要把某个领域的权威来源、团队约定和交付前检查清单打包成可安装、可自动触发的技能，并愿意为它写 3 个左右真实任务和断言式评测（做法 BE）。
- 你在用 Codex 或 Claude Code，正在做一人公司的 AI 产品，需要按阶段判断下一步并路由到对应子技能（做法 BF）。
- 你在维护后端仓库，使用 Claude Code、读取 AGENTS.md 的 agent 或 Cursor，希望 agent 默认处理鉴权作用域、幂等键和 schema 迁移（做法 BG）。
- 你一个人总控多个长期 AI 助手，活派出去经常没人收、说做好了其实没核过、同一个坑踩两遍，愿意用一行登记把状态分开记，并且能接受“定时靠宿主或人补”（做法 BH）。

不适用：

- 没有明确重复任务，只想装个工具看看；不愿做对照验证，只凭安装成功就认为改善。
- 直接在生产关键项目上全量安装，或一次装完整个插件市场。
- 只看 stars、README 徽章或 CI 状态就决定采用。
- Agent Skills 的 README 没有给出完整 SKILL.md schema、必填字段格式、安全模型、版本兼容性和客户端名单；不要把它当成完整规范或安全审查结论。它的跨产品复用、上下文占用小、领域专长可封装都只是作者主张，没有量化案例或对比数据。
- 不要一次性建很多技能。先选一个高频多步流程，建一个最小技能并做对照。
- 做法 AX 不适合把全部经验常驻注入；不适合没有明确失败现象、不会复发的任务；也不适合不愿维护短卡、不愿对入库和删卡做人审的团队。
- 做法 M 目前只适合先小范围试用：原文只给了一条 /book-to-skill ./my-book.pdf 示例命令、项目名和 GitHub 链接卡片，没有安装命令、生成后的文件结构或调用命令、实际转换案例、准确率、耗时和失败场景；不得再分发第三方版权书生成的 skill。
- 做法 BI 只适合先小范围试用：项目处于 M0–M3，coverage_score 0.667 未达标，LLM judge 未接入，groundedness 恒为 null，professional_analysis 和 decision_checklist 两个插件仍在 M4，evals/baseline.json 要到 M5 才出。它只处理可解析的文本型书籍文件，扫描件、封面不可提交；只处理自有/授权/公版材料；第三方书籍生成的技能默认私有、不得分发。MIT 只覆盖转换器代码，不覆盖任何书籍。
- 做法 AY 只针对仪表盘/数据屏，偏 Web 与 SwiftUI；材料只有 README，不能确认内部规则质量；它的 Sign-off 推广语会出现在对话里，采用前要处理。
- 做法 AZ 适合愿意维护 Markdown 规格、按阶段调用命令的团队；不需要规格文档、只想快速写代码的团队价值有限；Windows 安装需另行适配。
- 做法 BA 只覆盖扁平矢量风格的动效/排版动画/UI 动效录屏到代码，绑定 GSAP 生态；不适合实拍、复杂 3D、需要保留原始视频或逐帧描摹的任务。
- 做法 BB 当前材料只有 README，没有完整文档、配置说明或独立复现；更适合有现成代码库和测试的编码任务。
- 做法 BC 只适合内容型、可通过 HTTP 只读拿到内容的站点；需要 macOS 或 Linux；不支持 Windows；需要 Node 22/24；一次只跑一个站；像素一致不等于功能一致。
- 做法 BD 当前只有 README，未拿到 SKILL.md 正文，无法核实技能内部提示词、参数与判定标准；人工审图应作为闸门。
- 做法 BE 当前样例只覆盖 Rust + Claude Code；评测只有 3 个任务、每个任务约 10 条断言，且 grader 由作者自己编写，存在自评偏差。
- 做法 BF 目前只适合先小范围试用：材料只有 README，没有各子 skill 的具体步骤、提示词、配置或模板；政策、注册与合规内容主要针对中国大陆，且会过期。
- 做法 BG 只覆盖电商/支付域常见的鉴权、并发、迁移三类风险；不覆盖批处理、搜索、缓存一致性；每任务仅 5 次运行，样本小；Cursor 通过 rules 适配不等价于原生 skill；Haiku 在乱序 webhook 上仍失败，payment-webhook 一栏出现 1/5→2/5 的反向波动；迁移建议能否迁移到你的技术栈未知。
- 做法 BH 不适合指望开箱即自动组队或自动催办的场景：它 hooks: {}，不带定时、叫醒和自动回执；也不适合不愿维护一份共享记录、没人按点查的团队。文档自标 v0.9-draft，没有对照实验；Claude Code 侧原文明确“结构已备、走通待补”，不能当已支持。

## 前置条件

通用：

- Node.js ≥ 18，npm 或 npx 可用；Git 可用。
- 一个可回滚的非关键项目，不要在主仓库或用户主目录下做项目级安装。
- 对目标技能目录有写权限，如 ~/.claude/skills/、~/.agents/skills/、~/.cursor/skills/。
- 走 MCP 时，配置文件里写绝对路径。
- 安装第三方技能前，先通读它的 SKILL.md，并跑运行时的 doctor 或 audit 工具。

做法 A 和 B 额外前置：

- A：一个非关键项目和一类重复任务；只选一个技能包。
- B：一件每周重复、有明文规范或多步流程的工作；能建一个自包含技能文件夹并写入目标 host 的技能目录；如果你要按 Agent Skills 格式做，确认所用 agent 客户端支持该格式，但 README 没有列出客户端名单，需要自行确认。

做法 B 的 Agent Skills 格式额外前置：

- 你能维护一个版本化文件夹，至少包含 SKILL.md。
- 你能写清 name 和 description；description 要说明该技能什么时候适用，因为启动时只加载 name 和 description 做发现。
- 你能把可执行代码放进 scripts/，把参考文档放进 references/，把模板和资源放进 assets/。
- 你接受先在一个真实流程上试，不要一次性建很多技能。
- 你需要自行审查脚本权限、敏感数据和外部资源访问范围，因为 README 没有给安全模型。

做法 M 额外前置：

- 一本结构清晰、章节明确的技术书、PDF 或内部文档，且本地路径可被工具读取；原文示例为 ./my-book.pdf。
- 已安装并使用 Claude Code，并按仓库说明获取或安装 book-to-skill；原文没有给出安装命令。
- 先准备一组覆盖不同章节的基线问题，并保存不用技能时的回答。
- 只处理自有或已获书面授权的文档；不要把第三方版权书生成的 skill 再分发。

做法 BI 额外前置：

- Python ≥ 3.9、git；核心零第三方依赖。
- 一本你有权使用的书（建议 10 万字内），格式为 PDF / EPUB / DOCX / MD / HTML / RTF / MOBI，且是可解析的文本型文件，不是扫描件或只有封面。
- 启动时能声明 --user-rights owned|licensed|public_domain|unknown。
- 接受产物默认私有；公开分发必须显式 --public --confirm-public PUBLISH，且第三方书籍生成的技能不得分发。
- 准备至少 1 个负例问题（书里明确没讲的框架）和 5 条随机引文，用于拒答测试和逐字溯源。

做法 AX 额外前置：

- 一个 agent 会读 AGENTS.md、CLAUDE.md 或等价指令文件的工作区。
- 一类有明确失败现象、会复发的排障任务。
- 对工作区 procedures/ 目录和全局指令文件有写权限。

做法 AY 额外前置：

- Claude Code，或其他能读 Markdown 规则文件的智能体；一个已有前端项目或一张现有仪表盘截图。
- 能安装插件或写 ~/.claude/skills/；走 SwiftUI 版时需有模拟器。

做法 AZ 额外前置：

- 支持 Agent Skills 的宿主，如 Claude Code、Hermes Agent、Antigravity、OpenAI Codex、Cursor 或 Windsurf。
- 本地已有仓库路径；Unix-like shell 用于 symlink，Windows 需另行适配。
- python3 用于渲染 Mermaid；一个真实但范围小的功能需求。

做法 BA 额外前置：

- Python 3.9+ 与 ffmpeg；会开浏览器的脚本还需要 Playwright + chromium。
- 一段要复刻的扁平动效视频或 UI 录屏，以及填好的 brief；明确只能用这个源片。
- 允许脚本启动无头浏览器、发起网络请求、读写本地帧图与视频文件。
- Claude Code、Codex、Cursor、Gemini CLI、Copilot 等之一，能装技能或把技能目录拷到对应 skills 目录。

做法 BB 额外前置：

- 一个带测试的代码库和 3–5 个有代表性、带测试的编码任务；同一代理和模型下做有/无对照。
- 项目正在使用受支持的编码代理；代理需要能访问 lessloc 给出的安装 URL。
- 能记录新增/删除代码行数、改动文件数、token 或成本、测试通过率、review 评论数、返工次数、是否出现占位符/注释代码/备份文件、任务完成时间。

做法 BC 额外前置：

- Node 22.23.4+ 或 24.22.1+；Node 20 已 EOL，工具会拒绝运行。
- git；若想让它自动建 repo 与 PR，需要 GitHub 账号且 gh 已登录。
- Vercel 或 Cloudflare 账号；Playwright 的 Chromium；macOS 或 Linux。
- 一个低流量站点或 20–50 页的子目录/子站；对目标站只需只读访问。
- 明确不许碰 DNS；表单先指向测试 endpoint；只跑到 PR + noindex staging。

做法 BD 额外前置：

- 本机可用 npx，或能用 Claude Code / Codex 的插件市场。
- 纯出图技能要配一个能生成图片的智能体；image-to-code 要配一个既能生成图片又能写代码的智能体。
- Codex 安装后必须新开一个会话，技能才会被加载。
- 仓库只提供 README，未提供 SKILL.md 正文；装好后需自行读 skills/*/SKILL.md 确认内部提示词和判定标准。

做法 BE 额外前置：

- Claude Code CLI；本次样例只处理 Rust 相关任务；在 claude.ai 上使用需先开启 code execution。
- 一个真实但范围小的 Rust 任务，以及不装技能时的基线输出。
- 一个领域至少有 3–5 份可引用的权威来源或团队明文规范。
- 能运行 claude plugin eval . --allow-tools Write,Edit,Bash --scaffold；评测会真实调用模型并产生费用。
- 已确认来源许可。

做法 BF 额外前置：

- 使用支持 Agent Skills 的工具；README 明确支持 Codex 和 Claude Code。
- git 和 shell；运行结构校验需要 python3。
- 一个真实 AI 产品想法，能说清在做什么产品、已经做到哪一步。
- 愿意保存每一步产出，并在下一步调用时把上一步产出附上。
- 政策、注册、合规、平台获客相关任务，需要能点开官方原文核对最新版本。

做法 BG 额外前置：

- 一个后端仓库；使用 Claude Code，或会读 AGENTS.md 的 agent，或 Cursor。
- 能执行 npx skills add globalmpc/backendskills；或能手动把 dist/AGENTS.md 追加到项目 AGENTS.md，或把 dist/cursor/ 复制到项目 .cursor/rules/。
- 能填每个技能末尾的 Make it yours，至少写清错误格式和 API 文档约定；不填时 agent 跟随仓库已有做法。
- 能写 agent 看不到的隐藏检查；若要复现评测，能按 bench/ 产出 runs.jsonl。

做法 BH 额外前置：

- 你一个人总控多个长期 AI 助手，至少有一个宿主已装好并能正常登录。
- 对目标技能目录有写权限；手动拷贝时必须整目录拷，不能只拷 SKILL.md。
- 一份共享记录（表、记事本或表格都行），以及一个会按点查看的人；宿主自带定时能力就用，没有就人工查。
- DeepSeek Harness 需自备 DeepSeek 账号或 API，本技能包不提供密钥；dsh plugin add 不是装技能正文的办法。
- Cursor CLI 做非交互运行时，对自己新建的工作区可能要加 --trust；这是信任该工作区，不是关安全开关。
- 能接受先只装两台技能、只跑一件两周内能收的小活；不指望它自动派工或自动催办。

专门做法 C–BH 另有前置，按索引条目和对应仓库 README 准备；不要跳过 A 的对照方法直接纳入常规流程。

## 操作步骤

怎么选：先做做法 A；A 里某个技能确实有效、且你有一件每周重复且规范明确的工作，再做做法 B。做法 B 优先按 Agent Skills 的轻量格式组织：一个技能文件夹，至少一个 SKILL.md；需要执行代码就放 scripts/，需要参考资料就放 references/，需要模板资源就放 assets/。建好后用渐进披露自检：启动时是否只暴露名称和描述；任务匹配时是否读取完整 SKILL.md；执行时是否只加载所需脚本或引用文件。如果你有一批领域权威来源和交付前检查清单，做做法 BE；如果你有一类重复排障任务，做做法 AX；如果你要约束编码 agent 过度工程，做做法 BB；如果你要把技术书、PDF 或内部文档变成按需加载技能，先做做法 M 的最小试用，要求可校验和忠实度指标时做做法 BI 的半天试用；如果你要做仪表盘/数据屏，先做 AY 的半天试用；如果你要 BA/PO 规格链，先做 AZ 的一个小需求试用；如果你要把动效视频复刻成代码，先做 BA 的 10 秒小片闭环；如果你要把内容站迁成静态 Astro 站，先做 BC 的低流量站点或 20–50 页子站试用；如果你要先出设计图再建站，先做 BD 的一个真实落地页需求对照；如果你在做一人公司的 AI 产品，先做 BF 的一次总入口 + 一次直接点名对照；如果你要给后端 agent 补鉴权、幂等和迁移安全默认值，先做 BG 的 2–3 个任务、每个任务 5 次有/无对照；如果你一个人带多个 AI 助手、派出去的活收不回来，先做 BH 的一次单宿主、单件小活闭环。以上都套用 A 的对照方法，其余按场景从专门做法索引里选。

### 做法 A：先用现成技能包做小范围试装（推荐先做）

1. 选定一个非关键项目和一类重复任务。前提是失败可回滚，不碰生产关键路径。预期结果是你能拿到一组基线输出。
2. 只选一个技能包、只装一个。可选来源包括官方示例技能、jnMetaCode/superpowers-zh、rohitg00/pro-workflow、feiskyer/claude-code-settings、leter/zh-tech-writing、google/skills、clawyi-com/china-market-data、android/skills 等；不要一次装多个来源。
3. 验证安装。新开一个会话，运行 /plugin list，并问 What skills do you have access to?。预期结果是能看到该技能，而不是只在安装日志里看到成功。
4. 跑通一个最小动作，只选你当前最痛的任务。预期结果是产出一份可评审的结果，而不是只证明命令能执行。
5. 做对照。同一任务、同一输入，分别在没有技能和有技能的条件下各跑 3 次，记录差异。试一周，或至少覆盖 5 个同类任务。
6. 可选：只照抄一个工作流形态，别整套搬。

### 做法 B：把自己的重复工作写成 SKILL.md，并按 Agent Skills 格式自检

1. 选一件你每周都在重复、且有明文规范或多步流程的工作。前提是它有相对稳定的输入输出。预期结果是你能定义技能边界，而不是把所有事情塞进一个技能。
2. 建一个自包含文件夹，至少放 SKILL.md。按 Agent Skills README，可选增加 scripts/、references/、assets/。结构如下：

```text
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

3. 在 SKILL.md 中写 metadata（至少有 name 和 description）以及 instructions。description 必须同时写清做什么和什么时候用，因为 agent 启动时只加载 name 和 description 做发现。主 SKILL.md 只放流程与核心规则，细粒度规范拆到 references/ 按需加载。
4. 把可执行代码放进 scripts/，把参考文档放进 references/，把模板和资源放进 assets/；在 instructions 中写清何时执行代码、何时读取引用。预期结果是执行时只加载所需脚本或引用文件，而不是把全部材料塞进上下文。
5. 用渐进披露机制自检三件事：启动时是否只暴露名称和描述；任务匹配时是否读取完整 SKILL.md；执行时是否只加载所需脚本或引用文件。若 agent 不加载，先改 description、instructions 和资源组织，不要先堆更多内容。
6. 校验技能：

```bash
npx genspark-claw validate ./my-skills/
```

7. 安装到目标 host：

```bash
npx genspark-claw install all --target claude
```

或直接把技能目录放到 ~/.claude/skills/。

8. 换一个新会话，或让一位不了解背景的同事只凭 description 触发该技能。预期结果是它能被自动发现，而不是每次都要手动点名。
9. 没有自动触发时逐项排查路径、重启、嵌套目录、手动调用标记，先改 description 和触发条件，不要急着加内容。
10. 做最小试用与判定。选一个当前反复人工处理的多步流程，只写一个 SKILL.md 和必要脚本或模板；在支持 skills 的 agent 中跑若干真实任务。同一批任务比较不用技能和用技能的结果；记录任务完成率、人工修改次数、完成时间、步骤一致性、是否在正确时机触发、是否只加载所需资源。若触发准确、执行步骤更一致、人工返工减少，再扩大；若 agent 不加载、加载后不遵循或脚本无法执行，先修 description、instructions 和资源组织。

### 做法 BE：把领域权威规范打包成可安装技能，并用断言式评测对照

定位：morganlinton/BeautifulRust 是一个 Claude Code 插件，只含一个 skill：rust-best-practices。价值不在 Rust 本身，而在于示范一个可复用做法：把某个领域的团队约定、权威来源和交付前检查清单，外加断言式评测，打包成可安装、可版本化、可自动触发的智能体技能。

1. 选一个真实但范围小的领域任务，先记录基线。预期结果是拿到不装技能时的输出和可比较的断言通过数。
2. 安装样例技能。个人级安装：

```bash
claude plugin install beautiful-rust --marketplace morganlinton/BeautifulRust
```

若想让当前仓库所有协作者都用上，加 --scope project；每位协作者仍需各自执行一次安装：

```bash
claude plugin install beautiful-rust --marketplace morganlinton/BeautifulRust --scope project
```

或在 Claude Code 会话内安装：

```text
/plugin marketplace add morganlinton/BeautifulRust
/plugin install beautiful-rust@beautiful-rust
```

不想安装、只想单次会话试用时：

```bash
git clone https://github.com/morganlinton/BeautifulRust
claude --plugin-dir ./BeautifulRust
```

需要显式调用时：

```text
/beautiful-rust:rust-best-practices
```

3. 在 claude.ai 上使用：把 skill 目录打成 zip（zip 根目录就是该文件夹），再到 Customize > Skills 上传：

```bash
cd skills && zip -r ../rust-best-practices.zip rust-best-practices -x '*.DS_Store'
```

4. 如果要替换成自己团队的规范，按原文结构改写 SKILL.md：把约 500 行的规范组织成 13 节，每份来源在 references/ 下放一份摘要；来源冲突时明确选择一方并给出理由。13 节顺序如下：

```text
1. Mindset: Rust-shaped code, invalid states unrepresentable, application vs library
2. Pre-handback checklist: fmt, clippy with -D warnings, test, doc; lint policy
3. Ownership and borrowing
4. Types and API design
5. Errors and panics
6. Everyday idioms
7. Concurrency and async
8. Unsafe and FFI
9. Crates, modules, dependencies
10. Documentation and comments
11. Tests
12. Performance, in order
13. Final checklist
```

5. 插件自身的目录布局如下；plugin.json 是清单，marketplace.json 让仓库可以充当自己的 marketplace：

```text
BeautifulRust/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── skills/
│   └── rust-best-practices/
│       ├── SKILL.md
│       └── references/
│           ├── google-rust-style-guide.md
│           ├── rust-api-guidelines.md
│           ├── effective-rust.md
│           ├── rust-design-patterns.md
│           └── microsoft-rust-guidelines.md
└── README.md
```

6. 建评测用例：skills/rust-best-practices/evals/ 下放三个用例（库 API 设计、应用 CLI、带输入文件的重构模块），每个用例包含 prompt、一段好结果应是什么样的描述，以及 graders/ 下每个文件一条断言。
7. 在 skill 目录下运行评测（会真实调用模型并产生费用）：

```bash
claude plugin eval . --allow-tools Write,Edit,Bash --scaffold
```

分别在装有 skill 和未装 skill 时各跑一次，对比断言通过数。

8. 更新分发：修改 skill → 修改 .claude-plugin/plugin.json 里的 version → 提交推送；已安装用户执行：

```bash
claude plugin update beautiful-rust
```

推送前先校验：

```bash
claude plugin validate .
```

9. 做最小试用与判定：用 --plugin-dir 单会话试用，避免影响他人；选 3 个真实任务（一个库 API、一个 CLI/脚本、一个重构），每个任务在装 skill 和不装 skill 下各跑一次，共 6 次，尽量固定 prompt。参照原文 eval 结构给每个任务写 graders；没有 eval 工具时改人工盲评。可观察指标：断言通过率、cargo fmt --check / cargo clippy -- -D warnings / cargo test / cargo doc 四个命令的一次通过率、token 成本增量、人工 review 的返工轮次和评论条数。原文量级是有 skill 时 29/30、无 skill 时 24/30，token 约多三分之一；这是作者自述且样本很小，提升不到 2 条断言可视为噪声，通过率提升低于 10% 就不值得长期维护。

### 做法 M：把技术书或内部文档变成按需加载的技能（先做小范围试用）

1. 选一本结构清晰、章节明确的技术书或内部 PDF，先记录基线。建议准备 10 到 20 个覆盖不同章节的问题，其中包含需要定位具体章节、步骤和条件的问题。
2. 按仓库说明获取或安装 book-to-skill。原文只给出 GitHub 仓库链接卡片，没有给出安装命令；若使用既有索引里的 virgiliojr94/book-to-skill 路线，可先按旧材料保留的安装与自检命令准备：

```bash
npx skills add virgiliojr94/book-to-skill
python3 scripts/extract.py --check
```

3. 指向一个文件并运行原文给出的示例命令：

```bash
/book-to-skill ./my-book.pdf
```

原文称执行后会把文档转化为 AI 代理工作时可用的技能；需要在 Claude Code 中按该技能实际暴露方式调用，并检查它能否针对书内内容作答。原文未给出生成后的具体文件结构或调用命令。
4. 用同一组问题分别问基线会话和生成技能后的会话。预期结果不是转换成功，而是回答在事实、定位和完整性上有可比较差异。
5. 处理版权与分发边界。只处理自有或已获书面授权的文档；不得再分发第三方版权书生成的 skill。
6. 做判定。只有在一本真实文档上跑通，并且事实准确率、定位能力、完整性、稳定性、人工查找时间或失败率相对基线有改善，才值得把该流程写入手册或纳入常规；否则保留为待验证候选。

### 做法 BI：把书编译成可校验的技能，并用忠实度和负例拒答验收（先做小范围试用）

定位：bookleme/bookleme（读了么）是一个把书/文档编译成可安装 Agent Skill 的 Python 工具链（MIT，核心零第三方依赖，Python ≥ 3.9，输入支持 PDF / EPUB / DOCX / MD / HTML / RTF / MOBI）。它明确拒绝做读书笔记，而是产出两类可安装、可调用、可验证的产物：knowledge_pack 是结构化知识库，装 Topic Index 路由表 + 按需加载的框架分片 + 决策速查 + 出处清单，典型用法是问“这本书里 X 框架怎么用？”，书里没讲必须拒答；behavior_skill 是可运行的流程与状态机，装角色 + 硬约束 + 状态机 + 具名输出契约 + 反模式 + 情绪护栏，典型用法是“陪我做一次完整的人生设计对话”，可中断续聊。编译走 S0–S9 流水线：S0 输入登记 → S1 确定性提取 → S2 中文分段 →（S3 体裁路由 ∥ S4 原子能力抽取）→ S5 忠实度校验 → S6 双引擎渲染 → S7 四重校验 → S8 幂等安装 → S9 冒烟评测。两引擎共享 S1/S2/S4/S5 中间表示，只有 S6 分流。

1. 拉取并确认可运行。前提是 Python ≥ 3.9、git；核心零第三方依赖。预期结果是能看到版本号。

```bash
git clone https://github.com/bookleme/bookleme.git
cd bookleme
python3 -m bookleme --version
```

2. 用仓库自带样例做一次端到端编译，先确认“书 → Skill”能跑通。预期结果是生成一个可校验的产物目录。

```bash
python3 -m bookleme run --input evals/cases/synthetic/coach_book.md --title "我的第一本书"
```

3. 校验产物。官方校验器 + 自有 lint + 版权硬门三重；不要只看 run 成功。

```bash
python3 -m bookleme validate examples/coach
```

4. 跑回归测试，确认环境与抽取器行为一致。

```bash
python3 -m unittest discover -s tests -v
```

5. 用自己的书时，按需指定引擎、体裁与使用权。默认 auto 按 12 个确定性体裁特征自动路由；不满意再用 --genre 强制。

```bash
--engine auto|knowledge_pack|behavior_skill|both   # 引擎选择
--genre <plugin_id>                                # 强制指定体裁
--no-router                                        # 关闭路由，双引擎全出
--install                                          # 写入技能真源（默认关闭）
--user-rights owned|licensed|public_domain|unknown # 使用权声明
```

6. 公开分发必须显式裸词确认。产物默认私有；第三方书籍生成的 Skill 不得分发。

```bash
--public --confirm-public PUBLISH
```

7. 新增体裁 = 写一个插件文件，零改核心。插件必须声明以下字段，缺一即拒绝加载：state_machine、output_contract、hard_constraints、anti_patterns、voice_calibration（语气 / 称谓 / 禁用语 / 结论归属）、copyright_profile、trigger_words（3–5 个中文触发词）、eval_prompts（必须含至少 1 个负例）。

```text
bookleme/plugins/user/<genre_id>.py
```

内置可参考的已实现插件：coach_dialogue（教练/自我对话）、knowledge_reference（框架速查）；professional_analysis、decision_checklist 尚在 M4。

8. 提交或扩展前跑规范校验，这是作者写进 CONTRIBUTING 的红线检查。

```bash
python3 -m unittest discover -s tests -v
python3 -m bookleme schema --state
python3 -m bookleme plugin validate bookleme/plugins/builtin/coach_dialogue.py
```

9. 落地前先读四份规范：docs/ARCHITECTURE.md（流水线与幂等模型）、docs/PLUGIN_SPEC.md（16 个必填字段与安全扫描）、docs/FIDELITY.md（7 指标与未验证假设表）、docs/EVALS.md（评测集设计与 22 条硬验收清单）。README 只是入口，真正的可照做细节在这些文档里。

10. 把 6 条版权硬门当作自己产物的验收清单，任一失败即不安装、不发布：单条引文 ≤150 字且逐字可追溯；总引文比 ≤0.03；连续复制 ≤150 字；13 字 shingle 重叠 ≤0.10；产物不含全文/切片；contains_original_text = false。

11. 做最小试用与判定。选一本你熟悉、且有权使用的书（10 万字内），转成 md/epub/pdf；跑 run --input <你的书> --title "..." --user-rights owned，观察是否自动路由到合理体裁，不满意再用 --genre 强制；跑 validate <产物目录>，记录 7 个指标的实测值，尤其看 coverage_score 与 shingle_overlap_max；人工做三组对抗测试：负例拒答（问书里明确没讲的框架，必须拒答）、逐字溯源（随机抽 5 条引文回原文核对是否是精确子串）、触发词（用插件声明的 3–5 个中文触发词各触发一次）；最后把产物装进你日常用的 Agent，用 3 个真实工作任务跑一遍，记录不用 Skill 与用 Skill 的差异。

### 做法 AX：把重复踩坑写成按现象触发的经验卡

1. 在工作区建目录。放入 INDEX.md（只做易混现象消歧）、_模板.md，建议再加 _inbox.md。README 指向仓库 templates/INDEX.template.md、templates/card-template.md；本次只拿到 README，未见模板文件本身，需以仓库实际文件为准。
2. 写卡片骨架。每张卡控制在 2 KB 以内，保留命令、参数、路径、报错原文、判据和证据，删掉叙述。模板如下：

```markdown
# 分类-现象

> **触发**：<任务里会出现的现象>
> **验证**：<怎么确认这次真的成了——别拿「没报错」当成了>

## 首选
<可直接复制的那一条：命令 / 参数 / 路径。不带解释。>

## 被挡时
<首选被挡时的兜底，1~2 条，按方便程度排。>

## 别再来
| 弯路 | 为什么不通 |
| --- | --- |
| <真试过并失败的> | <报错原文 / 为什么不成立> |

## 注意
- <为什么会错 —— 这条最贵>
- <判据是什么>

证据：<会话 id / commit / 文件路径>
```

3. 挂钩子。把下面 4 条约定写进全局指令文件，让所有工作区共享机制；钩子约 0.6 KB，是整套机制唯一常驻内容。

```markdown
## 经验流程（procedures）

各工作区 `procedures/` 存踩过的坑，不常驻注入，按需读。

- **动手前**：任务撞上「网页抓不到正文 / 插件改了不生效」这类现象，先**搜**触发词，别凭记忆答：
  拿任务里的现象词搜 `procedures/*.md`（Windows：`Select-String -Path procedures/*.md -Pattern '<现象词>'`），
  命中哪张 read 哪张。卡少或搜不动时，列目录看文件名挑卡，一样算数。
- **踩到坑的当时**：只要不是「照着卡做就顺了」而是又试错了几轮 → 立刻往 `procedures/_inbox.md` 记一行。
  **别等收尾** —— 收尾要靠回忆，回忆不可靠。**记一行也算数。**
  **记 inbox 是记笔记、不是动手改文件** —— 就算被要求「只读 / 先别动手」，也照记不误。
- **收尾时（是检查，不是回忆）**：看 `_inbox.md` —— 够格的照 `_模板.md` 整理成卡
  （**文件名就是索引**：`分类-现象`），小意外留着下次。
- **不扫描、不复制**：不做启动式全库扫描；检索一律**定向** —— 拿现象词去搜，命中几张读几张。
```

4. 可选：从历史会话挖第一批素材。前提是使用 DeepSeek Harness 等兼容会话日志。

```bash
node tools/scan-sessions.mjs calls <workspace> '<关键词正则>'
```

按复发筛选：同一现象在多个会话出现过才优先成卡。
5. 写第一批卡。从最近 2–3 个坑开始，不要一次写十几张；每张不超过 2 KB，六段结构，删叙述，保留命令、参数、路径、报错原文、判据、证据。
6. 踩坑当下记 inbox，收尾只检查。入库和出库都建议人审，不把写卡权限完全交给 agent。
7. 验证钩子是否生效。能用 tools/procedures-probe.mjs 监控，或人工观察；问 3–5 个分属不同卡片的现象，看是否出现 <<< HIT 或是否去读 procedures/。没有触发时先改钩子位置、措辞和触发词。
8. 定期体检。攒到十几张卡以后运行：

```bash
node tools/procedures-audit.mjs
```

该命令只出清单，不写、不删、不改卡；退出码 1 表示有 P0/P1，可接 CI。删卡或并卡要 agent 出清单、人审后才动。
9. 做最小试用。选 1 个重复排障多的仓库，建 procedures/，写全局钩子，只写 2–3 张复发卡；用 3–5 个现象问题新开会话验证是否读卡。记录重复试错轮次、同类坑复发次数、读卡命中率、无关读卡或乱翻次数、每张卡体积和维护耗时。

### 做法 AY：用截图评论、重设计和三档截图 QA 验收仪表盘

1. 选一个已有前端项目或一张现有仪表盘截图，非关键页面。预期结果是拿到原始截图和一组可对照的问题清单。
2. 以 Claude Code 插件方式安装：

```bash
/plugin marketplace add abdiraimov-otabek/dashboard-design-skill
/plugin install dashboard-design@dashboard-design-skill
```

3. 或作为普通 skill 手动放置：

```bash
git clone https://github.com/abdiraimov-otabek/dashboard-design-skill
cp -r dashboard-design-skill/skills/dashboard-design ~/.claude/skills/
```

4. 非 Claude Code 的智能体：在 AGENTS.md 或规则文件里指向 skills/dashboard-design/SKILL.md。
5. 触发方式可直接照抄提示词：

```text
Build an analytics dashboard for this app: visitors, signups, revenue by source.
```

配截图问：

```text
Is this a good design?
```

还可以用：

```text
Redesign the date range picker
Make the KPI tiles cleaner.
Run the dashboard QA pass on /dashboard.
```

6. 按问题清单做一次重设计。只改你认可的具体项，不要照单全收。
7. 跑 QA 验收。Web 端要求三种浏览器宽度（3440 / 1440 / 375）各出截图；SwiftUI 端在模拟器里覆盖设备尺寸、最大 Dynamic Type、深色模式、Reduce Motion。
8. 收尾检查推广行。该 skill 每完成一个完整任务会在对话里加一行作者与其 Mac 应用的推广语；要关掉就让它停，或从 SKILL.md 删除 Sign-off 一节。
9. 做对照。保存原版和新版截图、问题清单；先按半天最小试用人工计数。不要拿插件安装成功当效果证据。

### 做法 AZ：把需求脑暴到测试用例跑成可追溯的规格链

1. 选一个真实但范围小的功能需求，同时保留团队原有流程做对照。
2. 获取仓库并确定本地路径。下文用 /path/to/ba-kit-open 代替实际路径。
3. 安装到 Claude Code：

```bash
mkdir -p ~/.claude/skills
ln -s /path/to/ba-kit-open/skills/* ~/.claude/skills/
```

4. 安装到 Hermes Agent / Antigravity / Codex：

```bash
mkdir -p ~/.hermes/skills
ln -s /path/to/ba-kit-open/skills/* ~/.hermes/skills/
```

Windows 环境没有给出对应命令，需另行适配。
5. 用斜杠命令跑完整 BA 流程：

```text
09:00  /brainstorm      Elicit requirements and define project boundaries
09:40  /srs             Draft IEEE 830 specification (FR, BR, ERR, NFR)
10:30  /sequence + /erd Model interaction sequences and entity relationships
10:45  /render-diagrams Compile diagrams into editorial HTML & vector SVGs
11:00  /wireframe-html  Generate clickable, standalone HTML prototypes
14:00  /userstory + /ac Slice INVEST user stories with Gherkin scenarios
16:00  /test-cases      Generate comprehensive test suites mapped to Error Matrix
16:45  /preview         Assemble the single-page stakeholder review bundle
```

6. 渲染 Mermaid 图：

```bash
python3 scripts/render_diagrams.py docs/{feature}/srs/flows.md
python3 scripts/render_diagrams.py docs/{feature}/
```

7. 处理变更与治理。用 /cr、/gap、/doc-drift、/dashboard、/kg 等治理命令。
8. 交付评审包。用 /preview 生成单页交互式文档门户，供干系人浏览、评审和签收。
9. 做对照与判定。统计歧义词数量、追溯覆盖率、评审轮次和返工、图与原型可用性、变更影响完整性。若文档变多但追溯、评审和返工没有改善，降级为 study/watch。

### 做法 BA：先让 agent 看片，再用逐帧对照交证明

1. 准备运行环境。前提：本机已有 Python 3.9+ 与 ffmpeg；会开浏览器的脚本还需要 Playwright + chromium。

```bash
pip install playwright && python -m playwright install chromium
```

2. 安装技能。Claude Code：

```bash
claude plugin marketplace add lovisdotio/motion2code
claude plugin install motion2code@motion2code
```

或者直接拷技能目录：

```bash
cp -R skills/motion2code ~/.claude/skills/
```

其他工具：

```bash
npx skills add lovisdotio/motion2code
```

3. 准备源片与任务说明。用自然语言下指令，例如：

```text
Rebuild clip.mp4 as an SVG + GSAP animation that loops
turn this app screen recording into a real site
```

4. 让 agent 先看片：

```bash
python3 scripts/study_video.py clip.mp4 -o study/
```

输出：每 0.25 s 一帧、硬切前后帧、contact sheet、扁平调色板、源片是否循环的评分，汇总在 study.json。
5. 写页面：必须满足页面契约：

```js
window.anim = { tl, duration, seek(t), play(from), pause() }
```

硬规则：只用给定的源视频，绝不重新生成、绝不内嵌视频、绝不描帧；文字严格按源提示词里的写法；扁平形状用 SVG，颜色从源片采样；GSAP 时间线是唯一时钟；循环在代码里完成：frame(duration) 等于 frame(0)；每个时刻都要和源片并排对照过。
6. 逐帧对照打分：

```bash
python3 scripts/frame_diff.py clip.mp4 index.html -o diff/
```

7. 运行时体检：

```bash
python3 scripts/check_anim.py index.html --runtime
```

8. 逐帧渲染出片：

```bash
python3 scripts/render_anim.py index.html -o anim.mp4
```

9. 出证明视频：

```bash
python3 scripts/side_by_side.py clip.mp4 anim.mp4 -o side_by_side.mp4 --html index.html
```

10. 做最小试用与判定。先拿一段 10 秒左右的扁平动效视频跑完整闭环，保存 study/、diff/、side_by_side.mp4 和最终 index.html。若素材不是扁平矢量、项目不用 GSAP，或 frame_diff 的最差五处无法被有效收敛，先降级为 study。

### 做法 BB：给编码 agent 加最少代码约束

1. 选定一个带测试的代码库和 3–5 个有代表性、带测试的编码任务。
2. 先跑基线组：不安装 lessloc，用同一代理和模型完成任务。记录新增/删除代码行数、改动文件数、token 或成本、测试通过率、review 评论数、返工次数、是否出现占位符/注释代码/备份文件、任务完成时间。
3. 安装 lessloc。Claude Code：

```text
/plugin marketplace add https://get.lessloc.org/claude/lessloc.git
/plugin install lessloc@lessloc
```

其他受支持代理：

```text
Install lessloc for this project by following https://lessloc.org/install.md
```

4. 安装后按平常方式让代理完成同一批任务，任务顺序可交替以减少偏差。检查它是否复用现有代码、是否产生占位符/注释代码/备份文件，以及任务结束时自测失败是否会继续修复。
5. 做对照判定。重点看测试结果不下降的前提下，代码量和成本是否下降；可先以代码改动量中位数下降 15% 作为观察阈值（这是试用建议，不是 lessloc 原文数据）。若测试通过率下降或 review 返工明显增加，停用或仅保留为研究项。
6. 如需移除：

```text
Remove lessloc by following https://lessloc.org/remove.md
```

### 做法 BC：把内容站迁成静态 Astro 站，并用门禁与三宽度截图验收

1. 选一个低流量站点或 20–50 页的子目录/子站，确认它是内容型、可通过 HTTP 只读拿到内容。静态化后不能有站内搜索、评论、购物车、登录、UGC。
2. 装技能包：

```bash
npx skills add ethanplusai/astro-conversion-kit
```

Claude Code 插件市场：

```text
/plugin marketplace add ethanplusai/astro-conversion-kit
/plugin install astro-conversion@astro-conversion-kit
```

或克隆下来：

```bash
git clone https://github.com/ethanplusai/astro-conversion-kit
cd astro-conversion-kit
npm install
npx playwright install chromium
node skills/convert-site/scripts/preflight.mjs
```

3. 用一句话发起整件事：

```text
Convert https://example.com to Astro with https://github.com/ethanplusai/astro-conversion-kit
```

4. 让它按八个阶段跑：Intake、Capture、Plan、Scaffold + baseline、Build、Gates、Visual review、Launch checks。每个阶段都有产出物和门禁证据。
5. 停在 PR + noindex staging，不碰 DNS。看 PR 里附的门禁输出、各项计数、每一条例外与提案，以及 contact sheet 与 docs/suggestions.md。
6. 明确它拒绝做的事：在 EOL 的 Node 上跑；在线上站提交表单或登录；碰 DNS；往 main 提交除脚手架以外的任何东西；放宽任何一道门禁；一次只做一个站。
7. 按可观察指标验收。门禁通过率、重定向覆盖、SEO 保真、媒体保真、三宽度视觉、人工成本。

### 做法 BD：先出设计图、人工审图，再让编码 agent 照图建站

1. 选一个真实但范围小的落地页需求或一组 App 屏幕流程，同时保留不用设计图、直接让同一编程智能体建站的基线。
2. 装单个技能，把 --skill 的值换成 imagegen-frontend-web、imagegen-frontend-mobile、brandkit 或 image-to-code 之一：

```bash
npx skills add https://github.com/Leonxlnx/imagegen-skills --skill 'imagegen-frontend-web'
```

3. Claude Code 插件市场：

```text
/plugin marketplace add Leonxlnx/imagegen-skills
/plugin install imagegen-skills@imagegen-skills
```

Codex：

```bash
codex plugin marketplace add Leonxlnx/imagegen-skills
codex plugin add imagegen-skills@imagegen-skills
```

装完必须新开一个 Codex 会话。
4. 按目标选型。只要设计图，选 imagegen-frontend-web、imagegen-frontend-mobile 或 brandkit 之一，配一个能出图的智能体；要图到代码闭环，选 image-to-code，配一个既能出图又能写代码的智能体。
5. 跑流水线：先逐张生成设计图，人工看过图之后，再让编程智能体照图实现。
6. 做对照与判定。可观察指标：审图通过率、从图到可运行页面的返工轮次、分区之间的风格一致性、文字可读性硬问题数、端到端总耗时。

### 做法 BF：用总入口按创业阶段路由，并把上一步产出交给下一步

1. 选一个真实 AI 产品想法或一个真实任务，先写下你自己的阶段判断和下一步。
2. 克隆仓库：

```bash
git clone https://github.com/huaxialucaicaizi/ai-startup-skills.git
```

3. 安装到 Codex 用户技能目录 ~/.agents/skills：

```bash
mkdir -p ~/.agents/skills
cp -R ai-startup-skills/skills/* ~/.agents/skills/
cp -R ai-startup-skills ~/.agents/skills/ai-startup-skills
```

4. 或安装到 Claude Code 用户技能目录 ~/.claude/skills：

```bash
mkdir -p ~/.claude/skills
cp -R ai-startup-skills/skills/* ~/.claude/skills/
cp -R ai-startup-skills ~/.claude/skills/ai-startup-skills
```

只选一个工具安装，不要同一客户端重复装。
5. 可选：跑结构校验：

```bash
python3 scripts/validate.py
```

它只说明 frontmatter 和案例引用完整，不证明子 skill 的方法有效。
6. 先用总入口判断阶段：

```text
用 ai-startup-skills 帮我看看我现在在创业的哪一步、下一步该做什么：___（在做什么产品、已经做到哪一步）
```

7. 再用直接点名子 skill 的方式跑一次作为对照。例如定价：

```text
用 opc-pricing-sales 帮我给这个 AI 产品定价：___
```

8. 按默认顺序推进，并把上一步产出作为下一步输入。新创业者默认顺序是 1 → 2 → 3 / 7 → 4 → 5 → 6；第 3 步和第 7 步可同时做，申请政策前通常要先注册主体。
9. 更新子 skill 时先同步再校验：

```bash
./scripts/sync.sh
python3 scripts/validate.py
```

10. 使用政策、注册与合规内容时，点开官方原文确认最新版本。
11. 做最小试用与判定。只装到 Codex 或 Claude Code 中的一个工具；先用总入口跑一次，记录阶段判断、追问的问题数、调用的子 skill；再用直接点名同一子 skill 的方式跑一次作为对照；把每一步产出保存下来，下一步调用时附上。

### 做法 BG：用后端安全默认技能，并用隐藏检查验收

1. 选一个后端仓库，挑 2–3 个任务，尽量覆盖三类风险：一个登录或高成本接口（是否限流）；一个按 id 读取资源的接口（是否按调用者作用域过滤）；一次列重命名迁移（是否 expand-contract、是否带 down migration）。为每个任务写一份 agent 看不到的隐藏检查，例如并发下单是否超卖、A 用户能否读到 B 用户的订单、旧版本应用在新 schema 下是否报错。
2. 安装到 Claude Code，在项目里执行：

```sh
npx skills add globalmpc/backendskills
```

3. 安装到 Codex 及其他读取 AGENTS.md 的 agent：把仓库的 dist/AGENTS.md 追加到项目的 AGENTS.md。前提是 agent 会读取 AGENTS.md；追加而非覆盖，避免清掉已有约定。
4. 安装到 Cursor：把 dist/cursor/ 下的内容复制到项目 .cursor/rules/。这是 rules 适配，不是原生 skill 机制；原文只说复制到 .cursor/rules/，未说明两者行为是否完全等价。
5. 填团队约定：打开每个技能末尾的 Make it yours，例如 skills/api-endpoint/SKILL.md、skills/data-integrity/SKILL.md、skills/db-migration/SKILL.md，写明错误格式、API 文档要求。不填时 agent 跟随仓库已有做法。
6. 按三条清单做代码验收：api-endpoint 检查查询是否带调用者作用域、非法输入是否返回 4xx、登录和高成本路由是否限流；data-integrity 检查 read-then-write 是否用锁或条件更新、是否加 UNIQUE 约束、扣费或发送类操作是否有幂等键；db-migration 检查是否 expand-then-contract、是否并发建索引并设 lock timeout、回填是否分批、是否有 down migration。
7. 做有/无对照。同一 prompt 各跑 5 次：一次不装技能做基线，一次按上面步骤装好技能并填完 Make it yours 做试验组。逐次记录是否触发 critical mistake、是否漏 down migration 或 API 文档；检查放在 agent 上下文之外，只在跑完后执行。
8. 复现或自建评测。仓库 bench/ 下有任务集、每次运行的原始记录和重跑方法；结果表由脚本生成：

```sh
node bench/summarize.mjs bench/results/<date>/runs.jsonl
```

前提是按 bench/ 的方式产出 runs.jsonl。
9. 改技能后重建分发产物：编辑 skills/ 下的文件，然后运行：

```sh
node scripts/build-dist.mjs
```

10. 技能仍失效时反馈：开 issue，附上原始 prompt 和 agent 产生的 diff，这也是收集自己团队失败样本的入口。
11. 做最小试用与判定：3 个任务、每个任务各 5 次；主指标是 critical mistake 的运行占比，按任务分别看，不要只看总和；次指标是团队约定遗漏数（down migration、API 文档）；成本侧记录达到同一结果的轮数、token 或耗时、人工 review 问题数、回滚和返工次数。若 3 个任务上 critical mistake 至少减半、约定遗漏下降、成本无明显恶化，再扩大；若只在部分任务有效，按任务类型裁剪技能，只保留 login-rate-limit、rename-column 这类已被原文证明有增量的部分。出现 payment-webhook 那样的负向变化，或 agent 为满足规则写出过度复杂代码（如无条件加锁）时，记录并回退对应技能条款。

### 做法 BH：用一行登记把派给 agent 的活收到“已验收”（先做单宿主、单件小活）

定位：dabingfy-dot/solo-to-team-skills 是一套面向“一个人总控 + 多个长期 AI 助手”的协作技能包（MIT，文档自标 v0.9-draft）。它给的是 4 支技能 + 1 个登记行模板 + 教学示例 + 2 份脱敏案例，核心是一条流程线：提目标 → 分工 → 交接 → 核对 → 判断。本手册只要求先装其中两支，跑通一件小活。

1. 先只启用两支：dispatch-accept-verify（分工＋交接）和 evidence-before-done（交活前取证）。前提是宿主已登录、你对技能目录有写权限。预期结果是新开会话后能按名调用，并打出一行可读的“待收”登记行。dispatch-accept-verify 的“已验收”一步依赖 evidence-before-done，两支一起装；另外两支 beginner-ops-writing、ops-case-notes 是可选搭配，不装不影响主流程。
2. 取得技能目录。拿到 skills/ 下四个子目录，每个里一个 SKILL.md。手动拷贝时整目录拷，不要只拷 SKILL.md；dispatch-accept-verify 必须连它的 templates/ 一起拷，否则登记行模板会丢。宿主只收一份正文时（如 Grok Bot），把模板一并贴进去。
3. Codex 安装。前提是已装 Codex 并能正常登录；以本机目录作源，正式建仓前不要填 GitHub URL：

```bash
cd /path/to/solo-to-team-skills
codex plugin marketplace add "$(pwd)"
codex plugin add solo-to-team-skills@solo-to-team-skills
```

非 0 退出就停，检查是否指到含 .agents/plugins/marketplace.json 的包根；装完新开一次会话。撤回命令：

```bash
codex plugin remove solo-to-team-skills@solo-to-team-skills
codex plugin marketplace remove solo-to-team-skills
```

4. 目录拷入型宿主，把整目录放到下列路径之一（以各宿主官方当日文档为准）：
   - WorkBuddy：~/.workbuddy/skills/<技能名>/ 或项目 .workbuddy/skills/<技能名>/，也可界面上传 zip。
   - DeepSeek Harness：.dsh/skills/、~/.dsh/skills/ 或 .agents/skills/；需自备 DeepSeek 账号或 API，本包不提供密钥；dsh plugin add 不是装技能正文的办法。
   - Cursor：~/.cursor/skills/<技能名>/。
   - CodeBuddy：~/.codebuddy/skills/<技能名>/ 或项目 .codebuddy/skills/<技能名>/。
   - 千问办公 QwenWork：~/.qwenworkcn/skills/<技能名>/。
   - Kimi Work（桌面端）：~/Library/Application Support/kimi-desktop/daimon-share/daimon/skills/<技能名>/（社区路径，官方另支持上传 zip／md 或商店）。
   - Grok Bot：不走一键安装，在对话里把某支 SKILL.md 正文 Save 为私有技能，四支分别存；存 dispatch-accept-verify 时把 templates/登记行模板.md 一起贴进去。
   - Claude Code：结构已备（.claude-plugin/），原文明确“走通待补”，不纳入首发支持。

   易混点：CodeBuddy ≠ WorkBuddy；千问办公 ≠ 通义灵码；Kimi Work ≠ Kimi Code CLI；通义灵码/TRAE/Comate 未验证。
5. 按名调用，确认能出活。前提是技能已拷入、会话已新开或刷新。Codex 非交互示例：

```bash
codex exec -s workspace-write --skip-git-repo-check -C "$(pwd)" '请使用技能 dispatch-accept-verify，写一行待收登记到 T044_dispatch_line.md'
```

Cursor 的 CLI 形态如 cursor agent --print；对自己新建的工作区做非交互运行可能要加 --trust（这是信任该工作区，不是关安全开关）。判据是能打出一行可读的“待收”登记行，而不是只看到安装成功。
6. 派活前先登记一行“待收”。用 templates/task-register-line.md，或先用记事本/表格手写；原文另一处写作 templates/登记行模板.md，两处名称不一致，以仓库实际文件为准。一行至少写清：做什么、结果放哪、几点交、谁在干、谁来收、谁到点查。
7. 交接时三态分开记，只有一种能划掉。到点去查 → 记“已接单” → 收到成果记“已收到成果”并写明结果在哪 → 核过记“已验收”。只有“已验收”或授权取消才从未完清单里拿掉；没人接就升级、续期。前提是原文明确 hooks: {}——本包不带定时、不带叫醒、不带自动回执；到点查由宿主自带定时能力做，宿主没有就由人按点查。最低配置是“一份共享记录 + 一个会按时查看的人”。
8. 宣布完成前先取证。说“做好了”之前，拿到对得上当前版本的有效证据：打开文件看、重算、照原步骤再走一遍。改过或失败过的部分补核，没变的部分可复用上一回的核验结论；核过才记“已验收”。
9. 划边界：危险动作与拍板权。花钱、发出、删除、登录、付款确认这类只写“请本人来”，不写代做办法；收下/退回/改方向由人拍板。beginner-ops-writing 用来写这类说明，原则是一次一步、点名唯一、写清做完会看到什么。
10. 完整跟做一遍，并故意走一次退回。照 examples/walkthrough-meeting-notes/ 走“给定输入 → 成果 → 证据 → 验收”，人为触发一次退回，看退回后状态是否还看得见。注意：该 walkthrough 是作者写的教学样例，不是实测记录。
11. 做最小试用与判定。一人、一宿主、一件两周内能收的真实小活（可直接复刻原文的会议转写题）；派前写“待收”，到点人工去查；走完 待收 → 已接单 → 已收到成果（写明结果在哪）→ 取证 → 已验收；跑满两周，期间不加新字段，避免把记账负担也算成收益。若“说完成了但核不过的比例”和“超期到被发现的天数”都没有下降，说明多出来的只是记账，应停用或砍字段。

### 专门做法索引（C–BI）

下表保留各专门做法的用途和入口；完整边界以对应仓库 README 和本手册的判断原则为准。所有条目都先套用做法 A 的对照方法。

| 做法 | 什么时候用 | 入口与关键动作 |
| --- | --- | --- |
| C | 多来源知识打包 | pip install skill-seekers；skill-seekers create https://docs.djangoproject.com/；skill-seekers package output/django --target claude；质量门禁可试但不等于效果证明 |
| D | 自建网关或想用已有订阅走非官方 API | 手动设置 settings.json；把 ANTHROPIC_BASE_URL 和 ANTHROPIC_API_KEY 指向你的端点；非官方 API 环境用 MCP 补网页搜索 |
| E | 中文技术文档写作与审稿 | npx skills add leter/zh-tech-writing -g；第一次只审不改；再改一版逐条 diff |
| F | 单篇生物医学论文精读 | clone Gaoyuan-0423/biomedical-paper-reader；指定其 SKILL.md 阅读 PDF；检查判定纪律 |
| G | 写一个 Claude Code mod | Claude Code 2.1.287 或更高；hooks/hooks.json 只指一个模块；读 session.usage 的真实数字 |
| H | 用 Cline CLI 跑长任务并拿硬证据验收 | npx skills add https://github.com/gongdear/cline-pilot；用 session_report.py 监控；6 项验收清单；证据优先于自我报告 |
| I | 给 agent 补 UI/UX 设计知识 | npm install -g ui-ux-pro-max-cli；先 uipro init --dry-run；交付前逐条对检查清单 |
| J | 出可交互架构图、工作流图、时序图 | npx skills add tt-a1i/archify -g；按 guide、doctor、validate、deliver 命令链走 |
| K | 出品牌一致的静态 HTML 加 SVG 图 | 按宿主安装 diagram-design；做品牌 onboarding；多客户用命名 profile 隔离 |
| L | 从大插件市场只装一个单元并按任务档位选模型 | /plugin marketplace add wshobson/agents；/plugin install python-development；plugin-eval 只当筛子 |
| M | 把反复查阅的书或内部文档变成按需加载技能 | 见做法 M；npx skills add virgiliojr94/book-to-skill；python3 scripts/extract.py --check；/book-to-skill ./my-book.pdf；不得再分发第三方版权书生成的 skill |
| N | 把模糊想法写成任务书并给破坏性操作加闸门 | 安装 leader 或用降级方案；按目标七问检查；用 storage-analyzer 的三色闸门 |
| O | 补 Postgres 领域知识与版本化文档检索 | npx skills add timescale/pg-aiguide --skill postgres；可接公共 MCP 端点；单次 A/B 不足以下结论 |
| P | 已获授权的漏洞挖掘场景按主题加载安全技能库 | /plugin marketplace add elementalsouls/Claude-BugHunter；/plugin install claude-bughunter@elementalsouls；提交前过 7-Question Gate |
| Q | 把复杂分析任务拆成分析、实现、交付三阶段并加门禁 | 安装 math-modeling-skill；约定 SKILL_ROOT 只读、PROJECT_ROOT 可写 |
| R | 装一套小而可组合的工程技能集 | claude plugins install mattpocock-skills 或 npx skills@latest add mattpocock/skills；/setup-matt-pocock-skills；从 /grill-with-docs 和 /tdd 开始 |
| S | 从 google/skills 按任务只装一个 Google 相关技能 | 选一个最接近当前任务的技能；按 harness 安装；在隔离环境记录查文档时间、正确率、人工纠正次数、权限申请次数 |
| T | 检索中国金融市场数据并核对来源与时间戳 | npx --yes skills@latest add clawyi-com/china-market-data -g；python3 $SKILL_DIR/tools/setup_env.py；更新后重跑 setup_env.py |
| U | 把移动端模拟器与真机画面接进 Codex 聊天 | Codex desktop 加 Apple Silicon Mac；私有仓库读权限；安装预构建插件 |
| V | 用一行 curl 把单个 Markdown 技能装进 Claude Code | mkdir -p .claude/skills/explain；curl -fsSL 到 .claude/skills/explain/SKILL.md；重启后观察是否按 description 自动加载 |
| W | 让元技能观察你怎么用技能 | npx skills add rebelytics/one-skill-to-rule-them-all --skill task-observer；把激活指令加进 CLAUDE.md 或 session-start hook |
| X | 装一套全栈开发技能包并按请求自动激活 | /plugin marketplace add jeffallan/claude-skills；/plugin install fullstack-dev-skills@fullstack-dev-skills；请求里带具体框架、技术名和任务 |
| Y | 中英文学术写作去模板化并用命题核对保住事实 | clone heise3/academic-deai；调用 Skill；用 scripts/content_lock.py original.md revised.md --strict 核对命题 |
| Z | 让路由技能自动选工作流并对 bug 交出失败→通过证据 | 安装 michael-denyer/pstack-claude；运行 setup-pstack；Codex 先 /hooks 信任；用 poteto-mode 处理 bug |
| AA | 按职能只装少量 agent 角色 | 用 msitarzewski/agency-agents；只装需要的团队；OpenCode 约 119 个 agent 上限 |
| AB | 在 T3 Code 里用 p3-stack 按 playbook 路由 | clone uzairansaruzi/p3-stack；./install.sh 或 ./install.sh --project /path/to/repo；/setup-p3；/p3-mode |
| AC | 审计并改进自己的 SKILL.md | clone robonuggets/skill-creator-plus 到 ~/.claude/skills/skill-creator-plus；用 AUDIT、NEW、REFINE 三种模式 |
| AD | 让 agent 把结论、方案对比与流程解释渲染成一页可离线打开的 HTML | 安装 QingYunA/answer-me-with-html；用 TCP 三次握手问题验证安装 |
| AE | 校验、打包并分发自己的 SKILL.md | 用 ishuagrawal/skills 的目录规范；frontmatter 只保留允许字段；python3 scripts/check_skills.py；claude plugin validate . --strict |
| AF | 给 agent 补 SwiftUI 领域知识 | npx skills add https://github.com/twostraws/swiftui-agent-skill --skill swiftui-pro；先不用技能审同一段代码做基线 |
| AG | 给工作写作去 AI 腔并保住事实与承诺强度 | 复制 phuryn/work-humanizer 到 skills 目录；用 Use work-humanizer on this 或 Interview mode |
| AH | 把开放式研究做成迷宫地图、证据分级与独立裁判循环 | clone nasqret/labyrinth-exploration 到 skills 目录；论断带 T1–T6；低于 T3 不作事实引用 |
| AI | 按 PM 工作流只装 1–2 个 pm-skills 插件 | claude plugin marketplace add phuryn/pm-skills；claude plugin install pm-product-discovery@pm-skills；用 /discover 跑真实想法 |
| AJ | 给编码 agent 立四条硬约束 | 安装 forrestchang/andrej-karpathy-skills 插件，或把 CLAUDE.md 写进项目；四条原则是 Think Before Coding、Simplicity First、Surgical Changes、Goal-Driven Execution |
| AK | 给 agent 补 AI 研究全流程知识 | npx @orchestra-research/ai-research-skills；只装当前任务对应的 1 个类别；用真实研究任务做有/无对照 |
| AL | 把多阶段长流程打包成 skill 并用状态文件断点续做 | 安装 Julian-Ivanov/website-bauen；/website-bauen start；进度写入 WEBSITE-STATUS.md |
| AM | 把某个人的工作方式蒸馏成 Person Profile 技能 | 安装 titanwings/distilly 到名为 distilly 的目录；按 colleague、relationship、celebrity 选素材优先级 |
| AN | 把领域方法论拆成细粒度 SKILL.md 并按对话触发词按需加载 | 可 clone SnailSploit/claude-red 看结构；用稀疏检出只装单个类别；只在合法合规范围内使用 |
| AO | 给写 Go 终端 UI 的编码 agent 补 Charm 生态知识 | npx skills add tpscloud/charmedimsure；只装 1–2 个；go run ./charmed-bubbletea/counter 验证环境 |
| AP | 把真实 UI 组件拆成绘制层并自动出规格表 | npx skills add diip3sh/exploded；/exploded document 或 /exploded spec sheet；node scripts/audit.mjs examples/gallery/index.html --out shots |
| AQ | 给 Elixir/Phoenix 项目补工程规范 | npx skills@1.7.2 add singularityhacker/Estack --skill '*' --agent cursor；先让 estack-doctor 做只读检查 |
| AR | 用 vercel-labs/skills CLI 安装、临时使用、列出、更新、卸载和生成模板 | npx skills add vercel-labs/agent-skills --list；按项目作用域安装；只想试一次用 npx skills use；npx skills init 生成 SKILL.md |
| AS | 用小团队注册表把团队 SKILL.md 分发到每个人的多种编码代理 | 安装 yoanbernabeu/skillcrew；skillcrew registry init；skillcrew skill new；skillcrew validate |
| AT | 给 Android 开发 agent 补官方弱项技能 | android skills add r8-analyzer --project=.；或 android skills add --all；Claude Code 用 /plugin install android-skills --marketplace android/skills |
| AU | 把外语论文 PDF 翻成韩语并尽量保住版式 | 安装 maenjh/ko-paper；ko-paper doctor 看到 kopaper ready 只证明装得上；输出固定为韩语 |
| AV | 让 Codex 少说废话、直接动手改代码 | 在非关键仓库让 Codex 自行安装 JuliusBrussee/caveman；材料里的安装提示词被截断，不能当完整提示词使用 |
| AW | 用 Claude Code 执行、Codex 定时审查并按判据收敛 | 把 ajogalekar/claude-codex-loop symlink 到客户端 skill 目录；起始提示写 goal、success_criteria、max_rounds、max_hours、max_no_progress_reviews |
| AY | 做仪表盘/数据屏，想让 agent 按截图验收 | 安装 abdiraimov-otabek/dashboard-design-skill；跑截图评论、重设计、三档宽度截图 QA |
| AZ | 做 BA/PO 规格文档、需求追溯与测试用例 | 安装 spmtitsolution/OpenBA-Kit；按 /brainstorm→/srs→/userstory→/ac→/test-cases→/preview 跑 |
| BA | 把扁平动效视频或 UI 录屏复刻成 SVG + GSAP 代码 | 安装 lovisdotio/motion2code；先跑 study_video 看片；按页面契约写页面；用 frame_diff 打分；用 check_anim --runtime 体检 |
| BB | 给编码 agent 加只写满足需求的最少代码约束 | 安装 rextail-ai/lessloc；在带测试代码库上做 3–5 个任务有/无对照；测试通过率不下降再看代码量、成本、review 返工 |
| BC | 把内容站迁成静态 Astro 站，并用门禁与三宽度截图验收 | 安装 ethanplusai/astro-conversion-kit；跑 preflight.mjs；按八阶段跑到 PR + noindex staging；十类门禁逐提交对照 baseline |
| BD | 先出设计图、人工审图，再让编码 agent 照图建站 | 安装 Leonxlnx/imagegen-skills；纯出图选 imagegen-frontend-web、imagegen-frontend-mobile 或 brandkit；图到代码选 image-to-code |
| BE | 把领域权威规范打包成可安装技能，并用断言式评测对照 | 安装 morganlinton/BeautifulRust；按 13 节写 SKILL.md 和 references/；建 evals 后做装/不装对照 |
| BF | 用总入口按创业阶段路由到 7 个子技能，并把上一步产出交给下一步 | 克隆 huaxialucaicaizi/ai-startup-skills；把 skills/* 和总入口拷到 ~/.agents/skills 或 ~/.claude/skills；用总入口和直接点名做对照 |
| BG | 给后端编码 agent 补鉴权、幂等、迁移安全默认值 | npx skills add globalmpc/backendskills；AGENTS.md 追加 dist/AGENTS.md；Cursor 复制 dist/cursor/ 到 .cursor/rules/；填 Make it yours；用隐藏检查做有/无对照；node bench/summarize.mjs 聚合 runs.jsonl |
| BH | 一个人带多个 AI 助手，派活要能收回、核过再算完成 | 安装 dabingfy-dot/solo-to-team-skills 的 dispatch-accept-verify + evidence-before-done 两支；整目录拷并带上 templates/；派前写“待收”登记，按 待收→已接单→已收到成果→已验收 三态推进；用说完成但核不过的比例、超期到被发现的天数验收 |
| BI | 把一本有权使用的书编译成可校验的知识包或行为技能，并要拒答书外问题 | 见做法 BI；git clone bookleme/bookleme；python3 -m bookleme run --input <书> --user-rights owned；python3 -m bookleme validate <产物目录>；看 7 个指标、负例拒答和 6 条版权硬门；coverage_score 未达标前只小范围试 |

## 怎么判断变好了

做法 A 的最小试用方式：同一任务、同一输入，有技能和无技能各跑 3 次；至少覆盖 5 个同类任务，或持续一周。可观察指标是人工修改次数、返工轮数、首稿可用率、背景重述次数、输出一致性、单次任务耗时、规则类返工次数。不要拿安装成功或 doctor 通过当效果证据。

做法 B 的最小试用方式：换一个新会话，让不了解背景的人只凭 description 触发；或让同事只读 description 判断什么时候会用。指标是该技能被正确触发的次数、触发后返工轮数、你手动补充规范的次数。按 Agent Skills 的渐进披露再增加三项：启动时是否只暴露名称和描述；任务匹配时是否读取完整 SKILL.md；执行时是否只加载所需脚本或引用文件。若 agent 不加载、加载后不遵循或脚本无法执行，先修 description、instructions 和资源组织。

做法 BE 的最小试用方式：用 --plugin-dir 单会话试用，避免影响他人；选 3 个真实任务（一个库 API、一个 CLI/脚本、一个重构），每个任务在装 skill 和不装 skill 下各跑一次，共 6 次，尽量固定 prompt。参照原文 eval 结构给每个任务写 graders；没有 eval 工具时改人工盲评。可观察指标：断言通过率；cargo fmt --check、cargo clippy -- -D warnings、cargo test、cargo doc 四个命令的一次通过率；token 成本增量；人工 review 的返工轮次和评论条数。原文量级是有 skill 时 29/30、无 skill 时 24/30，token 约多三分之一；这是作者自述且样本很小，提升不到 2 条断言可视为噪声，通过率提升低于 10% 就不值得长期维护。

做法 M 的最小试用方式：选一本结构清晰、章节明确的技术书或内部 PDF，先记录不用技能时 Claude Code 回答书中问题的基线；再运行 /book-to-skill 生成技能，在相同问题上对比。建议准备 10 到 20 个覆盖不同章节的问题，其中包含需要定位具体章节、步骤和条件的问题。可观察指标是：事实准确率、定位能力、完整性、稳定性、人工查找时间、失败率。只有在一本真实文档上跑通，并且上述指标相对基线有改善，才值得把该流程写入手册；否则保留为待验证候选。

做法 BI 的最小试用方式：半天内选一本你熟悉、且有权使用的书（10 万字内），转成 md/epub/pdf；跑 run --input <你的书> --title "..." --user-rights owned，观察是否自动路由到合理体裁；跑 validate <产物目录>，记录 7 个指标的实测值；人工做三组对抗测试：负例拒答、逐字溯源 5 条、触发词各触发一次；再把产物装进日常 Agent，用 3 个真实工作任务比较不用 Skill 与用 Skill 的差异。硬指标（有则必看）：negative_refusal_rate = 1.00、verbatim_violation_rate = 0.00、citation_resolution_rate = 1.00，任一不达标即说明忠实链路有洞。及格线指标：trigger_hit_rate ≥ 0.90、shingle_overlap_max ≤ 0.10、artifact_compliance_rate = 1.00。需自行观察：coverage_score 作者自测仅 0.667，目标 ≥0.85，试用时若低于 0.85，说明该书的关键框架没被抽全，应降低对该产物的信任或换体裁插件重跑。业务指标：同一批真实任务上，有 Skill 相比直接把书丢给长上下文模型，是否减少了事实性返工、是否减少了人工查证次数；这一项 README 没有数据，只能自测。不建议现在依赖的：groundedness 等 judge 类指标，未接入，恒为 null。

做法 AX 的最小试用方式：选 1 个重复排障多的仓库，建 procedures/，写全局钩子，只写 2–3 张复发卡；用 3–5 个现象问题新开会话验证是否读卡。试运行一段时间，记录重复试错轮次是否下降、同类坑复发次数是否下降、读卡命中率、无关读卡或乱翻次数、每张卡体积和维护耗时。可用 tools/procedures-probe.mjs 观察是否出现 <<< HIT，或用 tools/procedures-audit.mjs 检查结构缺段、断链、体积、触发词覆盖、对象失效和结论偏旧。判定门槛是同一现象第二次出现时能直接命中首选或别再来，且没有把大量未使用卡塞进上下文。

做法 AY 的最小试用方式：半天内按步骤装好，拿现有仪表盘截图问 Is this a good design?，记录返回的问题清单；让 agent 按清单做一次重设计，再跑 dashboard QA pass 拿 3440 / 1440 / 375 三张截图；对照原版和新版人工判断。可观察指标是：命中率、可执行性、截图 QA 的独有价值、一致性、成本、副作用。如果截图 QA 抓到代码看不出的问题几乎为零，降级为 study。

做法 AZ 的最小试用方式：选一个真实但范围小的功能需求，在 Claude Code 中按 Option A 挂载技能，或把仓库放进项目工作区按 Option C 使用；按 README 的一天流程跑一遍，同时保留团队原有流程做对照。可观察指标是：歧义词数量、追溯覆盖率、评审效率、图与原型可用性、变更影响完整性。

做法 BA 的最小试用方式：选一段 10 秒左右的扁平动效视频或 UI 动效录屏，先跑 study_video 生成 study.json、调色板和硬切前后帧；按页面契约写 index.html，再依次跑 frame_diff、check_anim --runtime、render_anim、side_by_side，保存 diff/ 的最差五处、运行时体检结果和对照视频。可观察指标是：frame_diff 的每时刻分数与最差五处是否下降；check_anim --runtime 是否还有控制台报错、意外网络请求、循环接缝不闭合、seek 不确定；页面是否混入内嵌位图或视频；render_anim 是否因走 anim.seek 而没有丢帧或重复帧。

做法 BB 的最小试用方式：选一个代码库和 3–5 个有代表性、带测试的编码任务；同一代理和模型下，分别跑未安装基线组和安装试验组，任务顺序可交替以减少偏差；先在一名开发者、一个项目内试用，不要一开始全团队铺开。记录新增/删除代码行数、改动文件数、token 或成本、测试通过率、review 评论数、返工次数、是否出现占位符/注释代码/备份文件、任务完成时间。若测试通过率下降或 review 返工明显增加，应停用或仅保留为研究项。

做法 BC 的最小试用方式：选一个低流量站点或 20–50 页子目录/子站，先把 preflight.mjs 跑通；用发起提示词跑到 PR + noindex staging 就停，不上线。判断指标：门禁通过率、重定向覆盖、SEO 保真、媒体保真、三宽度视觉、人工成本。

做法 BD 的最小试用方式：装 imagegen-frontend-web，拿一个真实落地页需求让智能体逐区出图；装 image-to-code，对同一需求跑完整流水线；设基线：同一需求、同一编程智能体，不用任何设计图直接建站。判断指标：审图通过率、图到页面返工轮次、风格一致性、文字可读性硬问题数、端到端总耗时。

做法 BF 的最小试用方式：只装到 Codex 或 Claude Code 中的一个工具；选一个真实 AI 产品想法或一个真实任务；先用总入口跑一次，记录阶段判断、追问的问题数、调用的子 skill；再用直接点名同一子 skill 的方式跑一次作为对照；把每一步产出保存下来，下一步调用时附上。可观察指标：路由准确性、产出可用性、交接完整性、引用可靠性、结构校验、效率对比。若连续几次都出现路由错误、产出无法进入下一步或引用不可靠，就降级为 study。

做法 BG 的最小试用方式：选 3 个后端任务，尽量覆盖登录/高成本接口、按 id 读取资源、列重命名迁移；每个任务写一份 agent 看不到的隐藏检查；同一 prompt 不装技能和装好技能各跑 5 次。主指标是 critical mistake 的运行占比，按任务分别看；次指标是团队约定遗漏数（down migration、API 文档）；成本侧记录轮数、token 或耗时、人工 review 问题数、回滚/返工次数。原文量级：15 个后端任务，Sonnet 5.5 与 Haiku 5.5 各跑 5 次/任务；critical mistake 无技能 25/150、有技能 2/150；Haiku 12/75→2/75，Sonnet 13/75→0/75；约定遗漏 30→4；login-rate-limit 和 rename-column 两模型均 5/5→0/5；多数任务本来 0/5→0/5，对总量贡献为零。Haiku 在乱序 webhook 上仍失败，payment-webhook 一栏 1/5→2/5 反向波动。这些是作者自测，样本小，需自行复验。

做法 BH 的最小试用方式：一人、一宿主、一件两周内能收的小活。只装 dispatch-accept-verify 和 evidence-before-done 两支，连 templates/ 整目录拷；建一张表当共享记录，用登记行模板；派前写“待收”，到点人工去查（本包不叫醒）；走完 待收 → 已接单 → 已收到成果（写明结果在哪）→ 取证 → 已验收，过程中人为触发一次退回，看退回后状态是否还看得见。跑满两周，期间不加新字段。可观察指标：说“完成了”但核不过的比例（目标下降）；超期未接单/未收的活数量，以及从超期到被发现的天数（目标显著缩短）；同一类错误重复出现的次数；每件活的返工轮次与从派到验收的总时长；登记行里“已验收”占比与“待收”积压量。停用判据：若“核不过比例”和“超期发现延迟”两项都没有下降，说明多出来的只是记账，应停用或砍字段；若降不下来是因为宿主没有定时能力而人也没按点查，那是流程执行问题，先把“谁到点查”这一个责任人补上再复测。原文数据是 Cursor CLI 约 29.6 秒打出登记行（不含装宿主、注册、手动打字时间），八家宿主各有“能装能调”记录和一份有限任务验收，队内日更主链跑了约两周余、复盘 3 次；没有对照实验，不表示每家四个技能都逐一被调用。

专门做法 C–BI 的统一试用方式：选一个与所装技能对应的真实小任务，先在不装该技能的会话里做一次并保存输出，再装上做一次；同一任务至少跑 3 次，或换 2–3 个任务再下结论。通用指标是首稿可用率、人工修改次数、返工轮数、查文档时间、命令或配置正确率、权限申请次数、耗时和成本。各条目的特别指标按索引执行。

反向指标：加了技能后仍要口头纠正同一件事，先改 SKILL.md 或 description；文档改完只是删空话没补事实，先把代码、配置和真实报错给它读；agent 只凭自己的声明就宣布完成，而 git status 和测试报告不支持，作废重跑；同一断言连续失败 3 次还在本地重试，升级到强模型；出图技能每次失败都盲重试，说明没用上 diagnostics；plugin-eval 分数不错但真实任务没改善，说明把筛子当成了结论；AX 跑几个会话后 observation-log 或读卡行为仍不存在，先补钩子、触发词或探针，不要先加卡；M 只跑通 /book-to-skill 但同组问题的事实准确率、定位能力和完整性没有改善，就保留为待验证候选；BI 只看 run 成功、不看 coverage_score、负例拒答和逐字溯源，或把 coverage_score 0.667 当达标，就降级为 study；AY 三档截图 QA 抓不出代码看不出的问题，就降级为 study；AZ 只是文档变多而追溯和评审返工没改善，就降级为 study/watch；BA 的 frame_diff 只给出整体分数却定位不到最差时刻，或 agent 仍在偷偷内嵌视频、描帧、改文字，先修契约和硬规则；BB 只在代码变少上看效果，不看测试通过率和 review 返工，先停用或只保留为研究项；BC 只看转换成功或像素一致，不检查重定向、SEO、媒体和 staging 功能，就降级为 study；BD 只看生成的图好看，不看审图通过率、图到页面的返工轮次和文字可读性硬问题，就降级为 study；BE 只看技能装上了、断言通过数比基线多 1–2 条，就宣布有效，或忽略 token 多三分之一和 grader 自评偏差，就降级为待验证候选；BF 只看装上、validate.py 通过或总入口说得头头是道，不看路由是否正确、产出能否交给下一步、政策引用是否可点开官方原文，就降级为 study；BG 只看 32 stars 或 25/150→2/150 的总和，不看按任务分布、约定遗漏、负向波动和过度复杂代码，就降级为 study；BH 只看“装上了、能调用”或一篇教学 walkthrough，不看核不过比例、超期发现天数和退回后状态是否还看得见，就降级为 study。

## 常见坑

- 整体 adopt：一次装多个技能包，导致上下文过载或规则冲突。先只装一个。
- 一次装整个插件市场：目录规模不是使用建议。
- 重复安装：同一项目里同时用项目级安装和插件市场装同一个技能包，skills 会出现两份；同一客户端只用一种安装方式。
- description 只写做什么没写什么时候用，技能就不会在合适时机触发。
- 拿 star 数、CI 状态、doctor 通过、validate 通过当效果证据；这些只证明装得上、格式合法或测试能过。
- Agent Skills：只看到 SKILL.md 就以为它是完整规范；README 没有给出完整 schema、必填字段格式、安全边界、版本兼容性和客户端名单。
- Agent Skills：把所有内容都塞进 SKILL.md，不利用 scripts/、references/、assets/ 和渐进披露，导致上下文过载或执行时不按需加载。
- Agent Skills：description 写得太泛或只写做什么，启动时 agent 无法判断何时匹配。
- Agent Skills：一次建很多技能；README 建议先在一个真实流程上试，不要一次性建很多技能。
- Agent Skills：忽略脚本权限、敏感数据和外部资源访问范围；README 没有给安全模型，需自行审查。
- Agent Skills：把跨产品复用、上下文占用小、领域专长可封装当成已被量化证明；这些只是作者主张。
- 做法 BE：把 173 stars、29/30 对 24/30、500 行 SKILL.md 当独立证据；这些是作者自述，grader 由作者自己编写，样本只有 3 个任务。
- 做法 BE：只装技能不看断言通过率；应做装/不装各跑一次，并记录四个命令的一次通过率和 token 成本。
- 做法 BE：忽略 token 约多三分之一的成本；先核算是否可接受，再决定是否长期维护。
- 做法 BE：把公开来源摘要直接再分发；先确认许可，例如 Effective Rust 在线版是 CC BY-NC-ND 4.0，仓库自身是 MIT。
- 做法 M：把 35.7K 星标、一条 /book-to-skill ./my-book.pdf 命令或转换成功当效果证据；先在真实文档上做基线对照。
- 做法 M：没有准备跨章节问题，只问一个泛泛总结就判断有效；应准备 10 到 20 个覆盖不同章节、步骤和条件的问题。
- 做法 M：把第三方版权书生成的技能再分发；只处理自有或已获书面授权的文档。
- 做法 BI：把 run 成功、validate 能跑或生成目录存在当效果证据；必须看 7 个指标的实测值、负例拒答和逐字溯源。
- 做法 BI：把 coverage_score 0.667 当达标；作者自己标的目标是 ≥0.85，低于 0.85 应降低对该产物的信任或换体裁插件重跑。
- 做法 BI：把 groundedness 当已有指标；LLM judge 未接入，当前恒为 null，V2/V3 也为 null。
- 做法 BI：把第三方版权书生成的技能再分发；只处理自有/授权/公版材料，公开分发必须 --public --confirm-public PUBLISH。
- 做法 BI：只跑 --install 不跑 validate；先 validate，确认版权硬门和指标，再决定是否装进日常 Agent。
- 做法 BI：插件缺字段；state_machine、output_contract、hard_constraints、anti_patterns、voice_calibration、copyright_profile、trigger_words、eval_prompts 缺一即拒绝加载。
- 做法 BI：把 BookLeme 当成 book-to-skill 的替代；两者路线不同，M 轻量、只有示例命令、无校验器；BI 有 stage DAG 和指标，但 coverage_score 未达标、两个插件仍在 M4，不能当稳定生产依赖。
- 做法 BI：提交扫描件或只有封面的文件；输入需为可解析的文本型书籍文件，且只处理自有/授权/公版材料。
- 做法 AX：把 procedures/ 当成启动时全量扫描的注入库；正确做法是钩子常驻、按现象定向搜卡。
- 做法 AX：等到收尾才回忆补卡；踩坑当下记 inbox 更可靠。
- 做法 AX：一次写十几张卡；先从最近 2–3 个复发坑开始，每张不超过 2 KB。
- 做法 AX：卡片写成复盘报告，缺少命令、参数、路径、报错原文、判据和证据。
- 做法 AX：agent 不读卡时先加卡；应先查钩子位置、措辞和触发词，再用探针验证。
- 做法 AY：只装插件不验证自动触发；把问题清单照单全收；把 Sign-off 推广行带进代码、提交或产品 UI；把截图 QA 当成代码审查的替代。
- 做法 AZ：把 56 个技能、19 条规则、47 个模板或 36 stars 当效果证据；只跑新流程不做原流程对照；Windows 直接照抄 ln -s。
- 做法 BA：跳过 study_video 直接让 agent 写页面，等于又让它凭想象猜节拍、缓动、颜色和文字。
- 做法 BA：不满足页面契约就急着跑 frame_diff；seek(t) 不是纯函数、没有设置 data-ready 标记、字体未加载完就截图，后面的逐帧对照都不可信。
- 做法 BA：违反硬规则，偷偷内嵌视频、描帧或重新生成源片；check_anim 会查脚本白名单和是否混入内嵌位图或视频。
- 做法 BA：只跑 frame_diff 看整体分数，不看最差五处。
- 做法 BA：不跑 check_anim --runtime，漏掉控制台报错、意外网络请求、循环接缝和 seek 确定性。
- 做法 BB：把 README 的 117 个真实变更、27% 代码减少、23% 成本降低当独立证据；材料没有实验设计、任务分布、模型版本、成本计算方式和原始结果。
- 做法 BB：只在无测试或非编码任务上试 lessloc；它更适合有现成代码库和测试的编码任务。
- 做法 BB：安装后不看测试通过率，只看代码变少。
- 做法 BC：把像素一致当功能一致；第三方脚本、表单 endpoint、重定向规则依赖托管商配置，必须在 staging 实测。
- 做法 BC：在 Windows 上硬跑或使用 EOL 的 Node 20；本版本要求 macOS/Linux 和 Node 22/24。
- 做法 BC：让 agent 碰 DNS、在线上站提交表单或登录、直接推 main、放宽门禁。
- 做法 BD：没装 SKILL.md 正文就宣称技能内部提示词和判定标准已验证；本次只有 README。
- 做法 BD：把出图当终点，不安排人工审图就进入实现；审图通过率是必要闸门。
- 做法 BF：把 230 stars、MIT 许可或 validate.py 通过当效果证据；它只校验 frontmatter 和案例引用。
- 做法 BF：把政策、注册、合规、平台获客的摘要当最终依据；这些内容主要针对中国大陆，规则会过期，必须点开官方原文确认最新版本。
- 做法 BF：只跑总入口不停留产出，下一步没有输入；应保存每一步产出并在下一步调用时附上。
- 做法 BG：把 32 stars、25/150→2/150 当独立证据；这是作者自建任务和隐藏检查，无第三方复现。
- 做法 BG：只看 critical mistake 总和，不看按任务分别看；多数任务基线本来就是 0/5，总和会掩盖差异。
- 做法 BG：每任务只跑 5 次就当结论；像 payment-webhook 1/5→2/5 这类单格波动不足以判断方向。
- 做法 BG：忽略 Haiku 在乱序 webhook 上仍失败、payment-webhook 出现反向波动。
- 做法 BG：把 Cursor 的 rules 适配当成与原生 skill 完全等价；原文未说明两者行为是否完全等价。
- 做法 BG：不写 agent 看不到的隐藏检查，只用 agent 自测或 review 当验收。
- 做法 BG：agent 为满足规则写出过度复杂代码，例如无条件加锁，却不记录、不回退对应技能条款。
- 做法 BG：不填 Make it yours 却期望 agent 遵守团队错误格式和 API 文档约定；不填时它会跟随仓库已有做法。
- 做法 BG：把电商/支付域的任务结论直接外推到批处理、搜索、缓存一致性；这些类型未被材料覆盖。
- 做法 BH：只拷 SKILL.md 不拷 templates/，dispatch-accept-verify 的登记行模板会丢；手动拷贝必须整目录拷。
- 做法 BH：把“装上了、能按名调用”当效果证据；原文自标 v0.9-draft，没有对照实验，只有八家各一例有限任务和一份教学 walkthrough。
- 做法 BH：指望它自动催办、自动叫醒或自动回执；原文明确 hooks: {}，到点查要靠宿主定时或人。
- 做法 BH：把“已收到成果”当“已验收”直接划掉；只有“已验收”或授权取消才能从未完清单里拿掉。
- 做法 BH：等到收尾才回忆补记；派前写“待收”、到点记“已接单/已收到成果”更可靠。
- 做法 BH：混淆宿主：CodeBuddy ≠ WorkBuddy，千问办公 ≠ 通义灵码，Kimi Work ≠ Kimi Code CLI；通义灵码/TRAE/Comate 未验证。
- 做法 BH：把 Claude Code 当已支持；原文明确“结构已备、走通待补”，不纳入首发支持。
- 做法 BH：把 examples/walkthrough-meeting-notes/ 当实测记录；它是作者写的教学样例。
- 做法 BH：把 README 里的日期和发起人传播量数字当采用依据；本材料内无法核实。
- 做法 BH：Cursor CLI 非交互运行时忘加 --trust 跑不动，或把 --trust 误当关安全开关；它只是信任该工作区。
- 其他专门做法的坑按索引条目和对应 README 执行。

## 证据与来源

Agent Skills 格式来自本次调研《agentskills/agentskills》README。可核查信息包括：技能是一个文件夹，至少包含 SKILL.md；metadata 至少有 name 和 description；instructions 说明如何完成特定任务；可选 scripts/、references/、assets/；渐进披露三阶段为启动时只读 name 和 description、任务匹配后读取完整 SKILL.md、执行时按需运行附带代码或加载引用文件；README 给出 my-skill/ 的目录结构示例；仓库有 26,958 stars；格式最初由 Anthropic 开发并作为开放标准发布；README 声称已被越来越多 agent 产品采用，但正文没有列出客户端名单；README 指向 Client Showcase，但正文没有具体名单；没有给出完整 SKILL.md schema、必填字段格式、安全模型、版本兼容性和实际触发准确率。领域专长、可重复流程、跨产品复用、上下文占用小均没有量化案例或对比数据，只是作者主张。本手册把 Agent Skills 作为做法 B 的格式与自检依据，并要求先在一个真实多步流程上试，不把 star 数或格式存在当成效果证据。

做法 A 和 B 的核心方法来自本手册现有正文所合并的 anthropics/skills、genspark-claw、awesome-copilot 等材料：技能是文件夹加 SKILL.md，frontmatter 至少写 name 和 description；先小范围试装，不要整体 adopt；doctor 或 validate 只验证装得上、格式合法，不证明产出更好。这些是方法主张，不是对照实验数据。

做法 BE 来自本次调研《morganlinton/BeautifulRust》。可核查信息包括安装命令、--scope project、会话内 /plugin marketplace add 与 /plugin install、git clone + claude --plugin-dir、显式调用路径、claude.ai 上传 zip、评测命令、更新与校验命令；插件目录包含 .claude-plugin/plugin.json、marketplace.json、skills/rust-best-practices/SKILL.md 与 5 份 references；SKILL.md 约 500 行、13 节；evals 下 3 个用例，每个用例有 prompt、期望结果描述和 graders/ 每文件一条断言。原文给出的数据：173 stars；有 skill 时通过 29/30 条断言，没有时通过 24/30 条；token 约多三分之一。这些数字、grader 的有效性、技能对 Rust 代码质量的普遍提升都来自作者自述，没有第三方复现；样本只有 3 个任务、每个任务约 10 条断言，存在自评偏差。许可提示：Effective Rust 在线版是 CC BY-NC-ND 4.0，仓库自身是 MIT。

做法 M 来自调研《@RoundtableSpace: 你曾经读过一本很棒的书。三个月后，你甚至记不起第7章的存在。》。可核查信息只有：项目名 book-to-skill、GitHub 仓库链接卡片、示例命令 /book-to-skill ./my-book.pdf、原文称可把技术书 PDF 转成 Claude Code skill、也支持文档文件夹但没有文件夹用法示例、互动数据 265 点赞 / 26 转发 / 8 回复，以及 35.7K 星标的作者主张。原文没有给出安装命令、生成后的具体文件结构或调用命令、实际转换案例、准确率、耗时、失败场景或验证方法。本版同时保留既有索引 M 中的 npx skills add virgiliojr94/book-to-skill 和 python3 scripts/extract.py --check，那来自旧材料，不是本次新调研新增的证据。

做法 BI 来自本次调研《bookleme/bookleme》。可核查信息包括：MIT、核心零第三方依赖、Python ≥ 3.9、输入支持 PDF / EPUB / DOCX / MD / HTML / RTF / MOBI；两类产物 knowledge_pack 与 behavior_skill；S0–S9 流水线与两引擎共享 S1/S2/S4/S5 中间表示的说明；git clone、python3 -m bookleme --version、run --input evals/cases/synthetic/coach_book.md --title、validate examples/coach、python3 -m unittest discover -s tests -v、schema --state、plugin validate、--engine、--genre、--no-router、--install、--user-rights、--public --confirm-public PUBLISH 等命令与参数；插件必填字段清单；6 条版权硬门；7 个忠实度指标与 22 条硬验收清单；docs/ARCHITECTURE.md、docs/PLUGIN_SPEC.md、docs/FIDELITY.md、docs/EVALS.md 四份规范。原文给出的本批评测数据：citation_resolution_rate 1.00、verbatim_violation_rate 0.00、negative_refusal_rate 1.00、trigger_hit_rate 1.00（目标 ≥0.90）、artifact_compliance_rate 1.00、shingle_overlap_max 0.084（目标 ≤0.10）、coverage_score 0.667（目标 ≥0.85，未达标，作者如实保留）、groundedness 为 null（LLM judge 未接入）。仓库有 CI badge、37 stars、MIT。作者自陈的边界：S4 当前为确定性抽取器，LLM 抽取器只是接口占位；LLM judge 未接入，groundedness / V2 / V3 为 null；coverage_score 未达标；professional_analysis、decision_checklist 两个插件尚在 M4；evals/baseline.json 实测数要到 M5 才出。三条设计原理（编译期/运行期分离、渐进式披露三级、确定性提取与概率性生成解耦）被作者自己标为 UNVERIFIED，「提炼结构而非摘要」也只是设计选择而非已验证结论。「一本书不会被读两遍」的共享 IR 收益、插件零改核心的可扩展性、双引擎自动路由的准确率，README 未给出对应数字，只是主张。适用条件：单机 Python 环境；输入需为可解析的文本型书籍文件，扫描件、封面不可提交；只处理自有/授权/公版材料；第三方书籍产物默认私有、不可分发；MIT 只覆盖转换器代码，不覆盖任何书籍。

做法 AX 全部来自调研《MiHjy12138/DSH-agent-procedures》README。可核查信息包括：procedures/ 目录、INDEX.md、_模板.md、_inbox.md、卡片六段模板、四条全局钩子、templates/INDEX.template.md 与 templates/card-template.md 的指向、tools/scan-sessions.mjs、tools/procedures-probe.mjs、tools/procedures-audit.mjs、退出码 1 表示有 P0/P1。README 给出的自测数据是：新会话首轮查 procedures，5 题命中 5/5，对照题不命中不乱翻，读 6 张卡约 12 KB；索引从 5.2 KB 降到约 0.8 KB；13 张卡从 77.8 KB 压到 26.6 KB，约减 65%；38 张卡精简时一次移出 9 张，约 24%；两次收尾补卡实测未自发，而踩坑当下记 inbox 自发发生。这些多为作者自测，样本和统计口径有限。

做法 AY 来自调研《abdiraimov-otabek/dashboard-design-skill》README。可核查信息包括：Claude Code 插件安装命令、普通 skill 手动放置命令、非 Claude Code 用 AGENTS.md 指向 SKILL.md、四个可直接照抄的提示词、Web 端 3440 / 1440 / 375 三档截图 QA、SwiftUI 模拟器覆盖设备尺寸和最大 Dynamic Type 与深色模式与 Reduce Motion、Sign-off 推广行。README 给的 before/after 对照表列了 9 条具体设计替换；作者自述方法学证据是 127 个已上线的仪表盘页面、对一个营收分析产品的完整拆解、一次每条规则被违反一次并被截图抓到的真实重设计。这些数字、规则可移植性和设计判断有效性没有外部数据或对照实验支撑。

做法 AZ 来自调研《spmtitsolution/OpenBA-Kit》README。可核查信息包括：README 自述 56 个 Agent Skills、19 条需求工程规则、47 个模板、9 个 SDLC 阶段、45 种图类型；安装命令包括 mkdir -p ~/.claude/skills 与 ln -s 挂载 skills/，Hermes 示例用 ~/.hermes/skills；斜杠命令表与一天工作流；scripts/render_diagrams.py 的两条命令；追溯矩阵 Idea → PRD → SRS → Flows → User Stories → AC → Test Cases；外部指标只有 36 stars。README 说可自动化完整软件规格生命周期、能消除歧义、避免幻觉假设和 bug 与返工及失败 sprint，这些都没有附 benchmark、客户案例、前后对比数据或失败案例。

做法 BA 来自调研《lovisdotio/motion2code》。可核查信息包括：Claude Code 的 claude plugin marketplace add 与 claude plugin install motion2code@motion2code、手工 cp -R skills/motion2code ~/.claude/skills/、npx skills add lovisdotio/motion2code、Codex/Cursor/Copilot/Gemini CLI/Hermes/claude.ai 的适配路径；scripts/study_video.py、palette.py、frame_diff.py、check_anim.py --runtime、render_anim.py、side_by_side.py 的命令与输出说明；页面契约 window.anim = { tl, duration, seek(t), play(from), pause() }；硬规则包括只用源视频、不内嵌视频、不描帧、文字照抄、SVG 采样颜色、GSAP 单一时间线、frame(duration) 等于 frame(0)。gallery 有 6 个重建案例，每个案例带 compare.html 逐帧对照与 480p 源片。原文称支持约 70 多个 agent、能堵住 agent 看不到视频时凭想象写节拍/缓动/颜色/拼写甚至偷偷嵌视频或描帧的问题，但案例全部出自作者自证，没有独立 benchmark。

做法 BB 来自调研《rextail-ai/lessloc》README。可核查信息包括：项目为 Apache-2.0 开源工具层；README 把 Claude Code、Codex、OpenCode、GitHub Copilot、Gemini CLI、Cursor 列为支持工具；Claude Code 安装命令为 /plugin marketplace add https://get.lessloc.org/claude/lessloc.git 与 /plugin install lessloc@lessloc；其他受支持代理的安装提示词为 Install lessloc for this project by following https://lessloc.org/install.md，移除提示词为 Remove lessloc by following https://lessloc.org/remove.md；README 声称无需账号、API key、依赖和网络调用，但安装步骤本身要求代理访问链接。README 给出的基准数字是：最多减少 36% 代码、降低 26% 成本且结果相同；在 3 个开源项目的 117 个真实变更上，以隐藏测试判定，代码少 27%、成本低 23%、结果相同；每个测试项目减少 23%–36% 代码、降低成本 15%–26%。这些是项目方自述，材料中没有实验设计、任务分布、模型版本、成本计算方式和原始结果。

做法 BC 来自调研《ethanplusai/astro-conversion-kit》README。可核查信息包括：MIT 许可；npx skills add ethanplusai/astro-conversion-kit、Claude Code 的 /plugin marketplace add 与 /plugin install、克隆后 npm install、npx playwright install chromium、node skills/convert-site/scripts/preflight.mjs；发起提示词；八阶段流程与十类门禁；390/768/1440 三宽度像素 diff 与 computed-style 检查；PR + noindex staging + 上线 runbook；pre-launch、launch-audit、post-launch、npm run verify；明确拒绝碰 DNS、在线上站提交表单或登录、放宽门禁、一次做多个站。原文给出的数据/案例：45 个 WordPress 站完成转换，平均耗时 83 分钟；45/45 通过三个宽度的像素一致性复核；Google PageSpeed 移动端 74→98、桌面端 87→99；三个公开 demo 为 sxsw.com、harvard.edu、angrybirds.com。这些均来自 README，门禁具体实现和各脚本不在材料内。

做法 BD 来自调研《Leonxlnx/imagegen-skills》README。可核查信息包括：MIT 许可；四个技能 imagegen-frontend-web、imagegen-frontend-mobile、brandkit、image-to-code 的分工；npx skills add 命令；Claude Code 与 Codex 插件命令；Codex 装完必须新开一个会话；前三个只产出图片，要配能出图的智能体，image-to-code 要配既能出图又能写代码的智能体；README 一句话描述流水线是 generate the design images, study them, then build the website to match。原文没有第三方评测、对比数据、客户案例或生成图示例；仓库 30 stars 来自搜索元数据；本次只拿到 README，未拿到 SKILL.md 正文。

做法 BF 来自调研《huaxialucaicaizi/ai-startup-skills》README。可核查信息包括：7 个子 skill 的名称与一句话用途加一个总入口；总入口最多问两个问题再路由；默认推进顺序 1 → 2 → 3 / 7 → 4 → 5 → 6；git clone、mkdir -p ~/.agents/skills / ~/.claude/skills 与 cp -R 安装命令；python3 scripts/validate.py 校验 frontmatter 和案例引用；./scripts/sync.sh 从 7 个独立仓库重新拉取；两条可直接照抄的提示词；原则是不编数据、政策法规只引官方来源、信息参考不构成法律或税务意见。原文给出的元数据是 230 stars、MIT 许可。原文没有给出各子 skill 的具体步骤、提示词、配置或模板，也没有结果数据、用户反馈或对照实验。

做法 BG 来自本次调研《globalmpc/backendskills》。可核查信息包括：32 stars、MIT；三个技能 api-endpoint、data-integrity、db-migration 及各自默认行为；每个技能末尾有 Make it yours 段落；Claude Code 安装命令 npx skills add globalmpc/backendskills；Codex/AGENTS.md 类 agent 追加 dist/AGENTS.md；Cursor 复制 dist/cursor/ 到 .cursor/rules/；review 清单；bench/ 任务集、原始记录和重跑方法；node bench/summarize.mjs bench/results/<date>/runs.jsonl；node scripts/build-dist.mjs。原文数据：15 个后端任务，Sonnet 5.5 与 Haiku 5.5 各跑 5 次/任务；critical mistake 无技能 25/150、有技能 2/150；Haiku 12/75→2/75，Sonnet 13/75→0/75；团队约定遗漏 30→4；login-rate-limit 与 rename-column 两模型均 5/5→0/5；多数任务 0/5→0/5；Haiku 在乱序 webhook 事件上仍失败；payment-webhook 一栏 Haiku 1/5→2/5 反向波动。这些是作者自建任务与隐藏检查，无第三方复现；任务集偏电商/支付域；每任务仅 5 次；README 未说明评测所用语言/框架/数据库；critical mistake 定义来自作者写的隐藏检查，换一套检查口径结论可能变化；部分任务基线已是 0/5，说明技能并非对所有任务都有增量，收益高度依赖任务是否踩在这些风险点上。

做法 BH 来自本次调研《dabingfy-dot/solo-to-team-skills》。可核查信息包括：MIT，文档自标 v0.9-draft；4 支技能 dispatch-accept-verify、evidence-before-done、beginner-ops-writing、ops-case-notes 的分工；1 个登记行模板和 2 份脱敏案例；Codex 的 codex plugin marketplace add "$(pwd)" 与 codex plugin add solo-to-team-skills@solo-to-team-skills 安装命令，以及撤回命令；八家宿主的目录路径和 Grok Bot 的“Save 为私有技能”做法；Cursor CLI 非交互可能要 --trust；Codex 非交互示例命令；三态登记 待收 → 已接单 → 已收到成果 → 已验收；原文明确 hooks: {}，不带定时、叫醒、自动回执。原文数据：Cursor CLI 实测约 0.5 分钟（29.6 秒）从拷入技能到打出可读“待收”行，不含装宿主、注册、手动打字时间；八家宿主“能装能调”均有走通记录，另各有一例有限任务验收，部分宿主受阻重跑或退回修订后才通过；队内日更主链跑了约两周余、复盘 3 次。作者主张但未证实的是：全队错误率是否下降、催办是否变少，没有对照实验；不表示每家四个技能都逐一被调用；部分宿主未保留技能加载的原始轨迹；主示例 walkthrough 是教学样例而非实测。材料局限：本次只抓到 README，四支 SKILL.md 正文、登记行模板原文、两个案例正文都未取到，技能内部的具体提示词与字段格式无法核对；README 中的日期与发起人传播量数字在本材料内无法核实，不应作为采用依据；Claude Code 侧原文明确“走通待补”，不能当已支持；Codex 正式建仓前不要填 GitHub URL。

做法 C–BG 的证据与局限按本手册现有正文所合并的各篇调研保留；本版新增了 Agent Skills 的可核查格式、渐进披露机制、star 数、作者主张与局限，也新增了 BookLeme 的流水线、7 个指标、6 条版权硬门、coverage_score 0.667 未达标和插件 M4 边界；但没有新增其独立效果数据，也没有把它升级为已验证结论。文中提到的 star 数来自 metrics 或作者主张，不构成有效性证据。

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
- [tpscloud/charmedimsure](../research/radar/2026-10-13/2912-tpscloud-charmedimsure.md)：值得一试，可以在 Go 终端 UI 相关的编码代理工作中小范围试用：按 README 给出的 skills CLI 命令把 Charm 生态技能包装进 Claude Code/Codex，再对比装上前后代理写 Bubble Tea/Lip Gloss 代码的返工情况。之所以只给 try 而不是 adopt，是因为原文的安装和运行步骤确实可照做，但全部效果主张（技能质量高、能改善代理表现）都没有对照数据支撑，且适用范围局限在 Go + Charm 生态。
- [diip3sh/exploded](../research/radar/2026-10-14/3014-diip3sh-exploded.md)：值得一试，先用 npx skills add diip3sh/exploded 在本地、CSS 同源的前端项目上对一两个组件跑一次规格表生成与审计，验证它能否替代手工标注；理由是仓库给了完整可照做的安装、调用、运行时和审计步骤，但只有 README 与 35 stars，效果未经独立验证，且对跨源 CSS、Shadow DOM/canvas 有明确不覆盖。
- [singularityhacker/Estack](../research/radar/2026-10-14/3076-singularityhacker-estack.md)：值得一试，建议在 Elixir/Phoenix 项目中对 AI 编码代理做小范围试用：先用固定命令安装 Estack 完整技能包，从 estack-doctor 只读检查开始，再用 estack-eval 做配对任务验证；README 给出了可照做的安装、调用和工作流，但尚未证明能普遍提升代理表现。
- [vercel-labs/skills](../research/radar/2026-10-14/3077-vercel-labs-skills.md)：值得一试，建议在一个真实代码仓库里小范围试：用 `npx skills add` 把 1–2 个技能按项目作用域安装到你实际使用的 agent（默认落到 `./.claude/skills/` 等目录），随仓库提交给团队共用。理由是 README 给出了完整可复制的命令、作用域/路径表、SKILL.md 模板与环境变量，能立刻照做；但文中没有任何效果数据，技能是否真的改善结果必须自己对照验证。
- [yoanbernabeu/skillcrew](../research/radar/2026-10-16/3745-yoanbernabeu-skillcrew.md)：值得一试，Skillcrew 用一条命令把团队的 SKILL.md 注册表分发到每个人、每种 AI 编程代理，并用 session 启动 hook + 每小时定时器做到无需人工更新，值得在一个小团队、一个私有 Git 仓库上小范围试；但它自述处于 early development（v1 前会有 breaking change），且多数 agent 的同步触发尚未实测，所以先试不建议直接采用。
- [android/skills](../research/radar/2026-10-17/4228-android-skills.md)：值得一试，做 Android 开发的话，可按 README 给出的命令在当前项目或全局安装部分 skill（如 r8-analyzer），让智能体在相关任务中自动调用；理由是原文给出了可直接执行的安装、更新、激活流程，并把技能范围明确限定在“评估显示 LLM 表现较弱”的工作流上，但仓库只公开了安装方式，没有技能全清单和效果数据，所以先小范围试、用自己项目的结果来判断。
- [maenjh/ko-paper](../research/radar/2026-10-17/4354-maenjh-ko-paper.md)：值得一试，先小范围试：按 README 把 ko-paper 装成 Claude Code / Codex 的 skill，用一篇 2 页公开论文验证版式、公式、术语一致性与 token 消耗，再决定是否把「PDF 版式保持翻译」这类流程纳入自己的文档处理链路。理由：原文给出了可直接复制的安装命令、CLI/网页用法、术语表 CSV 格式和缓存/并发等参数，属于可照做的具体流程，但输出语言固定为韩语、证据全部来自作者自述，因此不宜直接 adopt。
- [@goan999999: 用上 Caveman，我的 Codex 终于不说废话了！](../research/radar/2026-10-18/4666-caveman-codex.md)：值得一试，可以小范围试装：在你自己的非关键仓库里，把原文那段提示词原样贴给 Codex，让它自行安装 caveman，然后用安装前后同一个改 Bug 任务对比输出长度与一次成功率。理由是可照做的部分只有这条安装提示词，正文没有给出仓库内容、配置细节和任何验证数据，必须自行实测才能判断是否值得写进手册。
- [ajogalekar/claude-codex-loop](../research/radar/2026-10-20/5012-ajogalekar-claude-codex-loop.md)：值得一试，建议小范围试：把 claude-codex-loop 装成 Codex skill，用一个有明确可验证判据的长任务跑 5 轮以内，重点看它能否在无人盯盘时收敛且不误报成功；理由是原文给出了可直接照抄的安装命令、启动提示、配置字段与每轮核对/停止规则，但端到端可靠性只有模拟测试支撑，尚未在真实客户端上验证。
- [MiHjy12138/DSH-agent-procedures](../research/radar/2026-10-20/5271-mihjy12138-dsh-agent-procedures.md)：值得一试，建议在 1 个有重复性排障任务的工作区小范围试点：先建 procedures/、写全局钩子、从 2~3 张复发卡开始，并观察 agent 是否真的在动手前读卡。理由是 README 给出了可复制的文件结构、钩子、卡模板和体检命令，但触发依赖 agent 自律，证据主要来自作者自测，适合先试再决定推广。
- [abdiraimov-otabek/dashboard-design-skill](../research/radar/2026-10-21/5345-abdiraimov-otabek-dashboard-design-skill.md)：值得一试，先在一个真实仪表盘上装上这个 skill，跑一遍“截图评论 + 重构 + 三档宽度截图 QA”的闭环，验证它给出的问题是具体可改的还是泛泛而谈；值得试的理由不是它的设计规则本身，而是它把“领域规范文档 + 截图自检”这套给智能体供料和验收的模式固化成了一个可复制的 skill 结构。
- [spmtitsolution/OpenBA-Kit](../research/radar/2026-10-21/5347-spmtitsolution-openba-kit.md)：值得一试，建议小范围试：按 README 的 Agent Skills 方式把 skills/ 挂到 Claude Code（或把仓库放进工作区），选一个真实小需求跑 /brainstorm→/srs→/userstory→/ac→/test-cases→/preview，并用歧义词、追溯覆盖率、评审返工等指标做前后对比；理由是它给出了可复制的安装命令、斜杠命令和 Mermaid 渲染脚本，但效果只有 README 自述，缺少独立验证。
- [lovisdotio/motion2code](../research/radar/2026-10-21/5453-lovisdotio-motion2code.md)：值得一试，可在 Claude Code / Cursor 等已装技能的智能体里装这个技能，先用一段 10 秒左右的扁平动效视频跑通“study_video 看片 → 写页面 → frame_diff 逐帧打分 → check_anim --runtime 体检 → side_by_side 出证明视频”这条闭环；它把“看起来对”换成了可打分、可复现的逐帧对照，并给看不见视频的 agent 补上了“眼睛”。但它只覆盖扁平矢量动效、绑定 GSAP 生态、案例全部出自作者自证，所以先小范围试，重点是把这套“确定性 seek + 逐帧对照”的验证方式搬到其他视觉产出任务上。
- [@RoundtableSpace: 你曾经读过一本很棒的书。三个月后，你甚至记不起第7章的存在。](../research/radar/2026-10-23/6274-7.md)：值得一试，建议小范围试用：用一本结构清晰的技术书或内部文档跑通 `/book-to-skill`，再把生成的技能接入 Claude Code 对比问答效果。原文只给了单条命令和星标数，缺少安装、输出格式与验证细节，暂不宜直接写成成熟手册流程。
- [rextail-ai/lessloc](../research/radar/2026-10-23/6306-rextail-ai-lessloc.md)：值得一试，建议在现有编码代理流程中做小范围试用：先用 Claude Code 插件命令或让代理按 install.md 安装，在受控任务上对比代码量、成本和测试通过率。理由是 README 给出了可复制的安装方式和带隐藏测试的基准数字，但材料仅限 README，缺少配置细节与独立验证，暂不宜直接全面采用。
- [ethanplusai/astro-conversion-kit](../research/radar/2026-10-24/6510-ethanplusai-astro-conversion-kit.md)：值得一试，挑一个低流量站点或 20–50 页的子站，按 README 用一条提示词跑到「PR + noindex staging」为止、不要动 DNS，同时把它「环境预检 → 冻结基线 → 逐提交门禁 → 只出 PR → 留 verify 命令」的技能包骨架参考为自建 Agent Skill 的模板。理由是安装命令、发起提示词、八阶段流程与验收门禁都写得具体、可照做；但 45 站 / 83 分钟 / 45-45 像素一致这类成效全部来自作者自述且未经独立验证，具体门禁实现与其余文档也不在抓取到的材料里，所以先小范围试而不是直接采用。
- [Leonxlnx/imagegen-skills](../research/radar/2026-10-24/6511-leonxlnx-imagegen-skills.md)：值得一试，先把 imagegen-frontend-web 与 image-to-code 装进现有的 Claude Code 或 Codex 工作流，在真实落地页需求上按“先出图、审图、再按图建站”走一遍，再和“直接写代码”的基线比返工轮次；理由是安装与调用步骤在原文里给全了，且流水线思路明确，但技能内部提示词（SKILL.md）未提供，只能小范围试。
- [morganlinton/BeautifulRust](../research/radar/2026-10-25/6797-morganlinton-beautifulrust.md)：值得一试，可直接照抄它的安装命令和评测流程，在自己的 Rust 仓库里对比跑一轮；但先小范围试，别急着推广——它只覆盖 Rust 一个领域，评测只有 3 个任务、由作者自评（有 skill 时通过 29/30，没有时 24/30 条断言通过，token 约多三分之一），迁移价值在于方法不在这个插件本身。
- [huaxialucaicaizi/ai-startup-skills](../research/radar/2026-10-26/7126-huaxialucaicaizi-ai-startup-skills.md)：值得一试，建议小范围试用它的“总入口 + 子 skill”安装与阶段路由层：在 Codex 或 Claude Code 中装入总入口和 7 个子 skill，用真实项目走一遍“阶段判断→子 skill→产出交接”，再决定是否保留；理由是 README 给出了可复制的安装命令、调用提示词和默认顺序，但各子 skill 的具体步骤与效果证据未在原文中展开，暂不宜直接 adopt。
- [agentskills/agentskills](../research/radar/2026-11-05/10578-agentskills-agentskills.md)：值得一试，建议小范围试：先用一个高频多步流程，按 SKILL.md 文件夹格式封装成技能，并验证 agent 能否按 description 触发、按需加载脚本和参考材料。README 只给出格式与渐进披露机制，缺少完整规范和案例，暂不宜直接全面采用。
- [globalmpc/backendskills](../research/radar/2026-11-06/10952-globalmpc-backendskills.md)：值得一试，建议小范围试：按 README 装的 `npx skills add globalmpc/backendskills`（或把 dist/AGENTS.md、dist/cursor 分别接入 Codex/Cursor），挑 2–3 个后端任务做“隐藏检查”对照实验，同时对比有无技能时的 critical mistake 数和团队约定遗漏数；理由是仓库给出了可直接执行的安装方式、三条具体到规则的技能定义（鉴权作用域、幂等键、expand-contract 迁移），以及可重跑的评测脚手架，但证据目前只有作者自测（15 任务、2 个模型、每任务 5 次），且原文自己指出 Haiku 在 webhook 乱序上仍失败、payment-webhook 一栏 1/5→2/5 出现反向波动，需自行复验。
- [dabingfy-dot/solo-to-team-skills](../research/radar/2026-11-07/11237-dabingfy-dot-solo-to-team-skills.md)：值得一试，建议小范围试：先在一个宿主（Cursor 或 Codex）装 `dispatch-accept-verify` 与 `evidence-before-done` 两支，用登记行把一件小活从「待收」跑到「已验收」，再决定是否扩到四支技能和多宿主。理由是原文给出了可直接照做的安装命令、各宿主目录路径和三态登记字段，方法本身不依赖具体产品；但它自认 v0.9-draft、无对照实验、定时催办要宿主或人来补，效果必须自己测。
- [bookleme/bookleme](../research/radar/2026-11-10/12030-bookleme-bookleme.md)：值得一试，建议小范围试：用一本你有权使用的书跑通 `run` → `validate` → 冒烟评测，重点验证 7 个忠实度指标与负例拒答，再决定是否纳入工作流。理由是仓库给出了可直接执行的命令、产物契约和评测口径，但项目处于 M0–M3，coverage_score 0.667 未达标、LLM judge 未接入、两个插件仍在 M4，尚不足以直接作为稳定生产依赖。
