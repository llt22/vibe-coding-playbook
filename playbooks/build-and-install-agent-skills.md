# 给编码 agent 装技能：一次只装一个，用对照验证再决定留下

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决「想给编码 agent 补规范，但整包采用后上下文更乱、也无法判断是否真的减少了返工」的问题。
> 先试这一步：选一个非关键项目和一类重复任务，只装一个现成技能（做法 A；只想要一个 Markdown 技能可用做法 V 的一行 curl），同一任务做有技能／无技能的对照，一周后再决定是否留下。
> 最近修订：2026-10-03

## 解决什么问题

你已经在用编码 agent，但每次都要重复描述同一套工程规范，或者不确定装一个技能包是否真的减少了返工——甚至因为一次装太多，上下文反而更乱。这篇手册给出一个可照做的流程：先小范围试装一个现成技能包（可以从一个大插件市场里只装一个单元，也可以只装一个技能），用同一任务做有/无技能的对照，确认有效后再考虑把自己的重复工作写成 `SKILL.md`，或者把一本反复查阅的技术书、一份内部文档半自动转成按需加载的技能；让 agent 代理编码 CLI 跑长任务并拿硬证据验收；给 agent 补一块行业设计知识；把一句模糊想法写成可让 agent 独立跑几小时的任务书；写一个把会话状态嵌进界面的 Claude Code mod；让 agent 把一句话描述／一个代码仓库变成可交互的架构图、工作流图、时序图、数据流图、生命周期图，或者把自然语言需求与已有的 draw.io / Mermaid / Excalidraw 源文件改成自包含的 HTML+SVG 图、并让它长得像你的品牌。

如果你只需要给 Claude Code 装一个 Markdown 技能，还可以走更小的一条路（做法 V）：按 README 给的一行 curl 命令把某个 `skills/<name>/SKILL.md` 装进项目的 `.claude/skills/` 或全局的 `~/.claude/skills/`，重启会话后用一次解释类请求验证它是否按 `description` 自动加载；装完先打开这个 `SKILL.md` 读实际提示词，再决定值不值得沉淀成本团队的写法。

同一套对照方法也适用于中文技术文档的写作与审稿、单篇论文的精读。给 agent 补一块 Postgres 领域知识与版本化官方文档检索（做法 O）；在已获授权的漏洞挖掘或外部红队场景里，按主题自动加载一套安全技能库，并在提交任何发现之前过 7-Question Gate（做法 P）；把读题分析、代码实现、文档撰写这类多步复杂任务拆成三个阶段，每阶段绑定固定交付物和阶段内只读门禁，不许攒到最后才质检（做法 Q）；用一套小而可组合的工程技能集，把「动手前先对齐、建共享语言、建反馈回路、管设计」做成可重复实践（做法 R）；需要 Google 产品与技术（Cloud、AI/ML、基础设施、数据库与分析、开发者工具、管理工具、安全与身份、Web/应用托管、广告、分析等）的技能时，从 google/skills 按任务只装一个（做法 S）；需要让 agent 检索中国金融市场数据时，装 china-market-data 并检查数据来源与时间戳（做法 T）；需要把 iOS/Android 模拟器与真机画面接进 Codex 聊天、让 Codex 直接读日志和性能数据时，装 Mobile Dev（做法 U）；需要只装一个 Markdown 技能、并用一次解释类请求验证它是否按 `description` 自动加载时，装 agentic-dev-kit 的 `explain`（做法 V）。如果你还需要给 agent 补模型端点、权限或搜索能力，再用配置模板单独补，而不是整包采用。

如果反复出现的是这四类失败——agent 没做我要的、agent 太啰嗦、代码跑不起来、造出一坨泥——做法 R 的对应手段分别是：动手前用拷问对齐、建一份共享术语表、补反馈回路（静态类型 / 浏览器访问 / 自动化测试）、每天投资设计。

## 适用与不适用

适用：

- 你已经在用 Claude Code、Codex CLI 或类似编码 agent；
- 有一类反复出现、有明确规范的任务（需求澄清、写计划、TDD、代码审查、完成前验证、文档生成、会话交接等）；
- 反复写或审中文技术文档（README、设计文档、接口说明、教程），希望它读起来像工程师写的、没有 AI 腔；
- 需要把单篇生物医学论文读成结构化精读报告；
- 愿意在一个非关键项目上做一周对照；
- 需要给 agent 补模型端点、工具权限或网页搜索能力，且愿意手动填自己的网关信息；
- 想让 Claude Code 会话多一层界面或拦截能力（上下文占用、危险命令拦截、改动回放），愿意照教程先在本机小范围试；
- 已经在用 Cline CLI，想让 agent 代理派发任务、后台运行、持续监控，并在拿到硬证据之后才报完成（做法 H）；
- 要给 agent 补一块 UI/UX 设计知识（做法 I）；
- 有一类反复的“讲清系统结构”的工作，需要用一张可交互的图反复讲给别人听（做法 J）；
- 需要把自然语言需求或已有的 draw.io / Mermaid / Excalidraw 源文件改成自包含的 HTML+SVG 图，并且希望产物长得像自己公司或客户的品牌（做法 K）；
- 面对一个很大的插件市场，你想按目录逐条试装、并按任务类型匹配模型档位（做法 L）；
- 有一本反复打开到希望自己背下来的技术书，或一份反复查阅的内部 `docs/`，想转成按需加载的技能（做法 M）；
- 想把一句模糊想法变成可让 agent 独立跑数小时的任务书，或需要给磁盘清理这类破坏性操作加闸门、给项目文档与 Agent 记忆做一次收尾对齐（做法 N）；
- 经常写 Postgres DDL 或设计 schema，想让 agent 按最佳实践生成、少在事后补索引补约束（做法 O）；
- 在已获授权的漏洞挖掘或外部红队场景里（自有资产、书面授权、CTF、赏金 in-scope），想让 agent 按主题自动加载安全技能库，并在提交前过闸门（做法 P）；
- 有一类多步、有明确交付物的复杂分析任务，希望 agent 分阶段推进、每阶段有独立质检（做法 Q）；
- 已经在用支持 agent skills 的编码 agent，并且反复出现「agent 没做我要的 / 太啰嗦 / 代码跑不起来 / 造出一坨泥」这四类失败，想用一套小而可组合的技能集把工程基本功固化下来（做法 R）；
- 你使用 Google Cloud、BigQuery、GKE、IAM、SecOps、Google Ads 等 Google 产品与技术，想给 agent 补一块可安装的 Google 相关技能（做法 S）；
- 需要中国股票市场数据检索与初步整理，且宿主能执行本地 Python（Cursor、Claude Code、Codex 等），愿意按数据边界核对来源与时间戳（做法 T）；
- 在 Apple Silicon Mac 上用 Codex desktop，想把 iOS/Android 模拟器或真机画面接进聊天，让 Codex 读日志、检查元素、录制并对比性能（做法 U）；
- 已在用 Claude Code，想只装一个 Markdown 技能（做法 V：agentic-dev-kit）、用一次解释类请求验证它是否按 `description` 自动加载，并且愿意装完先打开 `SKILL.md` 读实际提示词再判断。

不适用：

- 没有明确重复任务，只想“装个工具看看”；
- 不愿做对照验证，只凭安装成功就认为改善；
- 直接在生产关键项目上全量安装；
- 不知道自己网关提供哪些模型名，却原样照抄配置模板；
- 写英文文档（`zh-tech-writing` 只针对中文技术文档）；
- 非生物医学领域的论文精读；
- 不接受 mods API 会随版本变化、不想核对当前版本写出的类型声明；
- 不确认 mod 来源就安装；
- 不用 Cline CLI（做法 H 与 Cline 强绑定）；
- 不愿先 dry-run 就让工具往仓库里写文件，或者不想为界面任务维护一份 `MASTER.md`（做法 I）；
- 想找通用绘图编辑器、想换 Mermaid 主题（Archify 明确排除）；
- 想一次装完整个插件市场，或者只看 stars 与规模数字就决定采用（做法 L、S）；
- 不做本地生成就去装 Antigravity / OpenCode / Pi（需要 git + make）；
- 没有合法访问权的书，或者打算把第三方版权书的生成 skill 再分发出去（做法 M）；
- 只有扫描件却不愿先做 OCR，或者技术书想省掉 `docling` 的抽取时间（做法 M）；
- 期待降级方案“效果一致”，或把 24×–51× 的 token 节省当成已核验结论（做法 M）；
- 不打算回答 leader 提出的最多 5 个拍板问题，或不愿意给任务书写完成态、证据和反作弊条款（做法 N）；
- 想让磁盘清理类技能一键删文件、不接受删除必须二次确认（做法 N）；
- 不用 Postgres / TimescaleDB / PostGIS（做法 O 只在这些任务上有用）；
- 只做防御性开发、不愿接触攻击性安全工具链，或没有可授权的目标（做法 P）；
- 期待 math-modeling-skill 是一个通用分析框架（做法 Q）；
- 想让技能接管整个开发流程、替你规划一切（做法 R）；
- 两条安装路径都想装——原文明确说两个都装会让每个技能出现两份，做法 R 只选一条；
- 想一次安装 google/skills 全部技能，或只看 star 数决定采用（做法 S）；
- 不想进入具体 skill 目录确认权限、配置和前提（做法 S）；
- 在正式环境直接试高权限技能（做法 S）；
- 没有 Google Cloud 账号、项目、认证与 IAM 权限却要装依赖它们的技能（做法 S）；
- 期待 README 给出每个技能的完整步骤和效果数据（google/skills 只给列表和链接，做法 S）；
- 只能聊天、不能执行本地脚本的宿主，或想直接驱动交易（做法 T）；
- 想拿中国金融数据做投顾建议，或把代码开源当成数据开放授权、把免 Key 当成可自由商用（做法 T）；
- 非 Apple Silicon Mac、非 Codex desktop，或拿不到该私有仓库访问权、没有对应 Xcode 版本（做法 U）；
- 期待 Mobile Dev 接管 App 构建、安装、启动，或指望它给出现成的性能提升数字（做法 U）；
- 期待 README 展示技能正文或效果数据（agentic-dev-kit 的 README 只列了一个 `explain` 技能，没有展示任何一个 `SKILL.md` 的内容，做法 V）；
- 不能访问 raw.githubusercontent.com 又不愿改用 clone + cp 方式安装（做法 V）；
- 想一次装完一整套覆盖 SDLC 各阶段的技能（README 的技能表当前只有一个 `explain`，别的技能名会 404，做法 V）。

## 前置条件

- Node.js ≥ 18，npm/npx 可用；Claude Code 2.1+ 或 Codex CLI 已安装。
- Git 可用。
- 一个可回滚的非关键项目，不要在主仓库或用户主目录（`~`）下做项目级安装。
- 对目标技能目录有写权限（如 `~/.claude/skills/`、`~/.cursor/skills/`）。
- 走 MCP 时，配置文件里写绝对路径。
- 安装第三方技能前，先通读它的 `SKILL.md`，并跑运行时的 doctor/audit 工具。
- 走配置模板路线时额外准备：你的提供商端点地址（`ANTHROPIC_BASE_URL`）和 key，以及你网关实际提供的模型名。
- 走中文技术文档路线（做法 E）时额外准备：可用的 `npx` 或 `git`；可选装 autocorrect。
- 走论文精读路线（做法 F）时额外准备：宿主助手支持文件读取，并能读取 PDF/图像；准备好 PDF、DOI、链接或原文之一，以及本地已有的补充材料。
- 走 mod 路线（做法 G）时额外准备：Claude Code 2.1.287 或更高；先确认这个 mod 的来源可信。
- 走 cline-pilot 路线（做法 H）时额外准备：Cline CLI；Python 3；一个支持 Agent Skills 规范的宿主；冷启动阶段愿意使用付费的长上下文模型；稳态阶段有本地模型运行条件；项目侧已有或愿意先建立 memory bank 与 clinerules。
- 走 UI/UX 设计知识路线（做法 I）时额外准备：Node/npm 用于装 CLI；本机 Python 3.x。README 明确要求这些安装步骤是给“人”做的，agent 不应自行在你的机器上安装软件，应向你询问。
- 走 archify 路线（做法 J）时额外准备：本地 Node 环境；要出带源码证据的仓库图，需要 agent 能读到仓库并把证据固定到一个 public commit；用 `deployment-ownership` profile 时，owner、区域位置、私有数据库范围与具名跨界项必须由你 authored 提供。
- 走 diagram-design 路线（做法 K）时额外准备：一个受支持的 Agent Skills 宿主；走 Claude Code 时要记得第三方 marketplace 的自动更新默认关闭；走可编辑安装时只建你用得到的那些 skills 根目录。
- 走 wshobson/agents 路线（做法 L）时额外准备：已装 Claude Code 并能在会话内执行斜杠命令，或装了 `gh` / 可用 `npx`；走 Antigravity / OpenCode / Pi 需要 git 与 make；用 plugin-eval 需要可用的 `uv`。
- 走 book-to-skill 路线（做法 M）时额外准备：本机 Python 环境并能安装对应抽取器；技术书需要 `docling`；扫描件需要先 `ocrmypdf`；宿主支持 Agent Skills 标准。
- 走 khazix-skills 路线（做法 N）时额外准备：一个支持 Agent Skills 标准的 Agent；项目里有 git、`CLAUDE.md`/`AGENTS.md`、`docs/`；用 leader 时愿意回答它提出的最多 5 个必须你拍板的问题。
- 走 pg-aiguide 路线（做法 O）时额外准备：本机可用 `npx`，目标 agent 支持 Agent Skills 或 MCP；一个真实但不紧急的 Postgres schema 设计或重构任务；如果团队不允许把 schema 信息发往第三方端点，需要先评估或改为自建。
- 走 Claude-BugHunter 路线（做法 P）时额外准备：已装 Claude Code；只对你自己拥有、或有书面授权评估的资产使用；可选 Burp Suite + MCP Server 扩展；若做授权的攻击性安全工作，按 README 指引申请 CVP。
- 走 math-modeling-skill 路线（做法 Q）时额外准备：一个支持本地 Skills 或 Agent 工作流的宿主；一个可写的 `PROJECT_ROOT` 题目目录，与只读的 `SKILL_ROOT` 分开；题目附件保持只读；跑双引擎文献检索时设置 `ANYSEARCH_API_KEY` 或用 `--email`。
- 走 mattpocock/skills 路线（做法 R）时额外准备：一个支持 agent skills 的编码 agent；想改技能源码的走 `npx skills@latest add mattpocock/skills`，只想要作者更新、不改的走 Claude Code 插件路线（两条只选一条）；一个 issue tracker；一组 triage 标签；一个放生成文档的目录；如果要用 `/grill-with-docs`，需要接受它会写 `GLOSSARY.md` 和 ADR；如果要用 `/tdd` 和 `/diagnosing-bugs`，需要静态类型、浏览器访问和自动化测试这些常规设施。
- 走 google/skills 路线（做法 S）时额外准备：本机有 Node.js/npx，网络可访问 GitHub 和 skills.sh；使用 Google Cloud 相关技能需要相应的 Google Cloud 账号、项目和权限；插件安装需已安装对应 agent harness（Claude Code、Codex、Antigravity CLI）。README 只给列表和链接，具体每个技能需要的信息、工具、权限和配置要进入对应 skill 目录查看。
- 走 china-market-data 路线（做法 T）时额外准备：Node.js 22.20+ / npm；Python 3.9+；网络可访问数据源；一个可写目录输出 JSON；目标宿主能执行本地 Python；iwencai 入口需要自备 `IWENCAI_API_KEY`，配置方法见 `SKILL.md#prerequisites`；不要把 Key、Cookie 或会话文件提交到仓库。
- 走 Mobile Dev 路线（做法 U）时额外准备：Codex desktop，运行在 Apple Silicon Mac 上；使用 Codex 自带 Node runtime，不需要插件构建或 `npm install`；该仓库当前为 private，安装需要 GitHub 读权限且本机 Git 认证可用；按平台准备 Xcode 26+（真机 27+）与 simulator runtime、Android SDK platform-tools 与 emulator、已运行的 Metro server、宿主 WebCodecs 支持；部分性能能力还要 iOS 17.4+/Android 12+、development-signed 且带 `get-task-allow`、developer disk image 已挂载、Xcode/LLDB detached。
- 走 agentic-dev-kit 路线（做法 V）时额外准备：本机已安装 Claude Code；走一行 curl 安装时需能访问 raw.githubusercontent.com，否则改用 clone + cp；一个可回滚的小项目，项目级安装要在项目根目录执行。

## 操作步骤

怎么选：先做做法 A；A 里某个技能确实有效、且你有一件每周重复且规范明确的工作，再做做法 B；需要把外部文档变成智能体知识资产时用做法 C；需要给 Claude Code 补模型端点、权限、网页搜索时用做法 D；要写或审中文技术文档用做法 E；要精读单篇论文用做法 F；要给自己写一个把会话状态嵌进界面的 Claude Code mod 时用做法 G；已经在用 Cline CLI、想让 agent 代理长任务并用证据验收时用做法 H；要给 agent 补一块 UI/UX 设计知识时用做法 I；需要把一句话描述或一个代码仓库变成可交互的单文件 HTML 图时用做法 J；需要把自然语言需求或已有的 draw.io / Mermaid / Excalidraw 源文件改成自包含的 HTML+SVG 图、并让它长得像你的品牌时用做法 K；面对一个很大的插件市场、想按任务类型匹配模型档位并用现成评测做筛检时用做法 L；要把一本反复查阅的技术书或一份内部文档变成按需加载的技能时用做法 M；要把模糊想法写成可独立跑的任务书，或给破坏性操作加闸门、给文档与记忆做收尾对齐时用做法 N；要给 agent 补 Postgres 领域知识与版本化文档检索时用做法 O；在已获授权的漏洞挖掘或外部红队场景里，要让 agent 按主题自动加载安全技能库并在提交前过闸门时用做法 P；要把一道多步复杂任务拆成“分析 → 实现 → 交付”三阶段、每阶段过门禁再往下走时用做法 Q；想要一套小而可组合、跨模型可用的工程技能集时用做法 R；需要给 agent 补 Google 产品与技术（Cloud、AI/ML、基础设施、数据库与分析、开发者工具、管理工具、安全与身份、Web/应用托管、广告、分析等）的技能时用做法 S；需要中国金融数据检索与初步整理、且宿主能执行本地 Python 时用做法 T；在 Apple Silicon Mac 上用 Codex desktop、想把移动端模拟器或真机画面接进聊天时用做法 U；只需要给 Claude Code 装一个 Markdown 技能、并用一次解释类请求验证它是否按 `description` 自动加载时用做法 V。

做法 J 与 K 都出图，区别是：J 出带 JavaScript 交互的单文件 HTML，验收靠 `validate`/`deliver` 的机器收据；K 默认出无 JS、无外部图片依赖的静态 HTML+SVG，验收靠品牌 onboarding 阶段的对比度校验和 fidelity receipt，以及你自己看产物能不能交付。要交互选 J，要品牌一致性和静态可交付选 K。

做法 N 与 Q 都涉及“把任务交给 agent 跑长程”，区别是：N 解决的是“怎么把一句模糊想法写清楚”，产出物是一份含目标七问的任务书，不绑定具体领域；Q 解决的是“多步任务怎么分阶段推进、每阶段什么时候该拦”，产出物是分阶段的固定交付物加五道门禁，并带一套现成的目录契约和复现清单。任务本身还在想不清楚的阶段先用 N；任务已经清楚、只是步骤多且容易一步错步步错，用 Q。

做法 B 与 R 都涉及“自己组织技能”，区别是：B 是把你自己的重复工作写成单个 `SKILL.md`；R 是先用别人已经拆好的一套技能集。只有一件重复工作先用 B；有一整类跨会话的工程习惯要先固化，先用 R。

做法 A 与 V 都涉及“装一个别人的技能做对照”，区别是：A 走插件市场或 `npx skills add`，装上的是一个技能包（可能带 skill、子代理、命令、hook）；V 只把单个 `SKILL.md` 拷到 `.claude/skills/` 或 `~/.claude/skills/`，不装仓库、不装插件，代价小但收益上限也小，而且必须先打开文件读实际提示词，才谈得上是否按 B 沉淀成团队写法。想验证“这类技能到底有没有用”先做 A；只想先看一个 Markdown 技能长什么样、或想给自己写第一个 `SKILL.md` 找参照，用 V。

做法 T 与 A 的关系：同样是装一个技能包做对照。需要中国金融数据检索、且宿主能执行本地 Python 时用 T；只能聊天不能执行脚本、要直接驱动交易、或想拿数据做投顾建议时不要用。

做法 U 与 A 的关系：它同样是装一个现成插件做对照，区别是绑定 Codex desktop + Apple Silicon Mac + 私有仓库访问权，解决的是移动端模拟器/真机的观测与诊断，不接管构建、安装、启动。

E、F、G、H、I、J、K、L、M、N、O、P、Q、R、S、T、U、V 都必须套用 A 的对照方法，不要跳过验证直接纳入常规流程。

### 做法 A：先用现成技能包做小范围试装（推荐先做）

1. 选定一个非关键项目和一类重复任务。前提：你已经在用 Claude Code 或 Codex CLI；项目不是生产关键。预期：明确一个可对照的任务。

2. 只选一个技能包，只装一个，不要全装。以下八选一（其它现成来源见做法 L、M、N、Q、R、S、T、U）：

   - 官方示例技能（Claude Code）：

     ```text
     /plugin marketplace add anthropics/skills
     /plugin install example-skills@anthropic-agent-skills
     ```

   - 中文编码工作流（Claude Code）：

     ```text
     claude plugin marketplace add jnMetaCode/superpowers-zh
     claude plugin install superpowers-zh@superpowers-zh
     ```

   - 自我纠正记忆与知识平面（Claude Code）：

     ```text
     /plugin marketplace add rohitg00/pro-workflow
     /plugin install pro-workflow@pro-workflow
     ```

   - 配置集合：技能 + 子代理 + settings 模板（Claude Code）：

     ```text
     /plugin marketplace add feiskyer/claude-code-settings
     /plugin install claude-code-settings
     ```

     等价的命令行方式：

     ```sh
     claude plugin marketplace add feiskyer/claude-code-settings
     claude plugin install claude-code-settings@claude-code-settings
     ```

     注意：通过 Plugin 安装的技能需要重启会话才能加载。这个仓库包含 12 个技能、6 个子代理和 11 套 settings 模板，它的 README FAQ 明确建议精选技能；所以建议改用 npx skills 只挑你要的 1–2 个：

     ```sh
     npx -y skills add -l feiskyer/claude-code-settings
     npx -y skills add feiskyer/claude-code-settings
     ```

     该方式的版本可能滞后于仓库最新。

   - 中文技术文档写作（Claude Code 或其他支持 Agent Skills 的工具）：

     ```bash
     npx skills add leter/zh-tech-writing -g
     ```

     手动安装：

     ```bash
     git clone https://github.com/leter/zh-tech-writing.git
     cp -r zh-tech-writing/skills/zh-tech-writing ~/.claude/skills/
     ```

   - 生物医学论文精读：

     ```bash
     git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git
     ```

     装成本地技能（可选，让客户端能发现）：

     ```bash
     mkdir -p ~/.codex/skills
     git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git ~/.codex/skills/biomedical-paper-reader
     ```

   - Google 产品与技术技能（做法 S，详见下文）：

     ```bash
     npx skills add google/skills
     ```

     Claude Code：

     ```bash
     claude plugin marketplace add google/skills
     claude plugin install <plugin>@google-plugins
     ```

     Codex：

     ```bash
     codex plugin marketplace add google/skills
     ```

     Antigravity CLI：

     ```bash
     agy plugin install https://github.com/google/skills/<plugin-path>
     ```

     注意只选一个与当前任务最接近的技能，如 BigQuery 优化或 gcloud CLI；使用前进入对应 skill 目录确认权限与配置。

   - 中国金融数据（做法 T，详见下文）：

     ```bash
     npx --yes skills@latest add clawyi-com/china-market-data -g
     ```

   预期：插件安装成功，或只装上了你点名的技能。注意同一项目里不要同时用项目级安装和插件市场安装同一个技能包，否则 skills 会出现两份。

3. 验证安装。前提：新开一个 Claude Code 会话。

   ```text
   /plugin list
   ```

   应看到对应插件为 enabled。也可以直接问 Claude：

   ```text
   What skills do you have access to?
   ```

   用来确认技能是否真的加载。如果用的是 genspark-claw，则先体检再看清单：

   ```bash
   npx genspark-claw doctor
   npx genspark-claw list
   ```

   预期：环境体检通过，能看到内置技能列表。

4. 跑通一个最小动作。不要一次试用全部功能，只选一个你当前最痛的任务。

   - 官方示例技能：`Use the PDF skill to extract the form fields from path/to/some-file.pdf`
   - superpowers-zh：让它先问清需求再写计划，例如“给用户模块加个批量导出功能”，观察它是否先问“导出格式是 CSV 还是 Excel？数据量多大？需要异步吗？有权限要求吗？”并给出 2-3 个方案。
   - pro-workflow：先跑 `/doctor` 和 `/wrap-up`，确认 SQLite 存储、hooks、skills 能加载。
   - feiskyer/claude-code-settings：挑一个技能，比如 `/handoff [下一次会话的重点方向]`；或者让 codex-skill 做一次「对抗式审查」（触发词含 `codex`、`use gpt`、`full-auto`、`adversarial review`、`用codex`、`第二意见`），注意它只呈现审查结果、不自动改码。
   - leter/zh-tech-writing：先只审不改，`/zh-tech-writing 检查 docs/api.md，只列问题，不要改`，看它按「原句 → 改后 → 原因」列出的问题是否成立。
   - biomedical-paper-reader：拿一篇自己已经读过、心里有底的论文试跑，逐项对照自己的理解。
   - google/skills：只选一个与当前任务最接近的技能，例如 BigQuery 优化或 gcloud CLI，在隔离环境或测试项目跑一个具体任务。
   - china-market-data：安装初始化后，直接问“贵州茅台现在的价格、PE、PB、市值和换手率”，检查返回结果是否包含数据来源、行情时间、抓取时间，以及是否区分缺失值与 0。

   预期：技能被触发，或在需要时以斜杠命令出现。

5. 做对照。同一任务、同一输入，分别在没有技能和有技能的条件下各跑 3 次，记录差异。试一周，或至少 5 个同类任务。预期：你能说清技能是否减少了返工，而不是只说“装上了”。

6. （可选）只照抄一个工作流形态，别整套搬：

   - deep-research：把调研目标拆成可并行子目标 → 通过 `claude -p` 子进程执行 → 聚合 → 逐章精修与来源验证。产出目录固定为：

     ```text
     .research/<name>/
     ├── prompts/           # 子任务 prompt
     ├── child_outputs/     # 子进程输出
     ├── logs/              # 执行日志
     ├── raw/               # 原始数据缓存
     └── final_report.md    # 最终报告
     ```

   - handoff：`/handoff [下一次会话的重点方向]`，把当前对话压成交接文档，输出到 `$TMPDIR/handoff-YYYY-MM-DD-HHMM.md`，内容含背景与目标、已完成工作、当前状态、待办事项、推荐技能、关键上下文；引用已有产物用路径/URL 避免重复；自动对 API key、密码、PII 脱敏；对话过短时提示无需生成。

   - codex-skill：把编码、代码审查、计划审查交给 OpenAI Codex 非交互执行；审查结果只呈现不自动改码；Codex 调用失败时如实报告而非代答；支持 JSON 结构化输出与 `resume --last` 增量恢复。依赖 Codex CLI（`npm i -g @openai/codex` 或 `brew install codex`）。

   - github-review-pr：并行子代理多角度分析（含安全维度）+ 对抗式验证——质疑者需在 head SHA 处复读代码，findings 必须附 `file:line` 与原文引用；支持置信度评分、误报过滤、去重与一致性计数、增量复审、批量行内评论、干净 PR 自动 LGTM。

   预期：你能说清这个形态里哪一步减少了你自己的返工；说不清就不要保留。

### 做法 B：把自己的重复工作写成 SKILL.md（验证有效后再做）

1. 选一件你每周都在重复、且有明文规范的工作。例如“按公司模板出文档”“按团队规范写单测”“代码审查”。前提：你已经确认现成技能包对你有帮助，或者你有一个特别明确的返工点。

2. 建一个自包含文件夹，放 `SKILL.md`。照官方模板：

   ```markdown
   ---
   name: my-skill-name
   description: A clear description of what this skill does and when to use it
   ---

   # My Skill Name

   [Add your instructions here that Claude will follow when this skill is active]

   ## Examples
   - Example usage 1
   - Example usage 2

   ## Guidelines
   - Guideline 1
   - Guideline 2
   ```

   关键：`description` 必须同时写清“做什么”和“什么时候用”；正文写步骤、示例、准则。

3. 拆分结构：主 `SKILL.md` 只放流程与核心规则，细粒度规范拆到 `references/` 里按需加载，确定性修正交给外部 CLI 工具而不是让模型做。

4. 校验技能。可以用 genspark-claw 的校验器：

   ```bash
   npx genspark-claw validate ./my-skills/
   ```

   预期：通过 schema 校验和安全审计，标记 `curl | bash`、base64 载荷和破坏性命令。如果没有通过，先改 `SKILL.md`，不要继续安装。

5. 安装到目标 host。以 Claude Code 为例：

   ```bash
   npx genspark-claw install all --target claude
   ```

   或者直接放到 `~/.claude/skills/`。注意：如果已经用插件市场装了同一个技能，不要再手动拷贝。

6. 验证技能可复现。换一个新会话，或让一位不了解背景的同事只凭 `description` 触发该技能，看能否得到同类结果。预期：不需要重新粘贴同样的规范与上下文，就能得到稳定输出。

7. 技能没有自动触发时，照这些条目逐项排查：路径必须是 `~/.claude/skills/<name>/SKILL.md`（注意大小写）；Plugin 安装的技能需重启会话；检查是否双层嵌套；直接问 `What skills do you have access to?`；`disable-model-invocation: true` 的技能须用 `/skill-name` 手动调用。

### 做法 C：多来源知识打包（可选，适合需要领域知识时）

如果你需要把文档站点、GitHub 仓库、本地代码库、PDF 等转成智能体可用的知识资产，可以用 Skill Seekers：

```bash
pip install skill-seekers
skill-seekers create https://docs.djangoproject.com/
skill-seekers package output/django --target claude
skill-seekers install-agent output/react/ --agent cursor
```

预期：生成 `SKILL.md` 和参考文件，可安装到 Claude Code、Cursor 等。注意：README 给出质量门禁 `skill-seekers quality output/react/ --threshold 7`，但它没有与人工基线的对照实验，多数效果数字是作者主张，需要你自己验证。

### 做法 D：用配置模板补齐模型端点、工具权限与搜索能力（可选）

只有在你有自建网关、或想用已有订阅走非官方 API 时才做这一步。

1. 前提：已装好 Claude Code，并能访问 Anthropic 官方 API 或自建网关。注意 `settings.json` 不通过 Plugin 配置，必须手动设置。

2. 把模板里的两个变量指向你的提供商端点：`ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY`。作者模板默认指向 copilot-gateway 代理（`http://localhost:4141`）；换 LiteLLM Proxy 等网关就把 `ANTHROPIC_BASE_URL` 改为对应地址（如 `http://localhost:4000`）。

3. 替换模型名。作者模板里的模型名是作者网关的模型，需按你网关实际提供的模型替换：

   ```text
   ANTHROPIC_DEFAULT_SONNET_MODEL: claude-sonnet-5
   ANTHROPIC_DEFAULT_OPUS_MODEL: claude-opus-5
   ANTHROPIC_DEFAULT_HAIKU_MODEL: claude-haiku-4-5
   ```

   预期：新开会话能正常起来，并且你选的模型确实是你网关提供的模型。

4. 权限确认。模板中 `defaultMode` 为 `acceptEdits`。想进一步减少确认，在 `settings.json` 的 `permissions.allow` 里配允许列表；完全跳过确认可改为 `bypassPermissions`，但 README 明确提示「请了解其安全风险后再启用」。

5. VSCode 扩展（Claude Code 2.0+，不走 Claude.ai 订阅）时，在 VSCode `settings.json` 中配置环境变量：

   ```json
   {
     "claude-code.environmentVariables": [
       { "name": "ANTHROPIC_BASE_URL", "value": "http://localhost:4000" },
       { "name": "ANTHROPIC_AUTH_TOKEN", "value": "sk-dummy" },
       { "name": "ANTHROPIC_MODEL", "value": "opusplan" },
       { "name": "ANTHROPIC_DEFAULT_SONNET_MODEL", "value": "claude-sonnet-5" },
       { "name": "ANTHROPIC_DEFAULT_OPUS_MODEL", "value": "claude-opus-5" },
       { "name": "ANTHROPIC_DEFAULT_HAIKU_MODEL", "value": "gpt-5-mini" },
       { "name": "DISABLE_TELEMETRY", "value": "1" }
     ]
   }
   ```

   同时需要 `~/.claude/config.json` 的内容来跳过 claude.ai 登录。

6. 解决「API Key 缺失或无效」：在 `~/.claude.json` 中把 key 加入已批准列表：

   ```json
   {
     "customApiKeyResponses": {
       "approved": ["sk-dummy"],
       "rejected": []
     }
   }
   ```

7. 一键更新已装插件：

   ```sh
   bash ~/.claude/scripts/update-cc-plugins.sh
   ```

8. 非官方 API 环境补网页搜索：WebSearch 是 Anthropic 专有工具、仅限官方 API 环境。在其它环境要通过 MCP 服务器补齐，README 列了 Tavily MCP、Brave MCP、Firecrawl MCP、DuckDuckGo Search MCP 四个（只给链接，未给安装步骤），需要你自己按 MCP 的接入方式配置。

9. 可选的零额外成本路径（已有 GitHub Copilot 订阅、且接受手动安装方式）：

   ```sh
   mv ~/.claude ~/.claude.bak
   git clone https://github.com/feiskyer/claude-code-settings.git ~/.claude
   npx copilot-gateway@latest start --proxy-env
   ```

   首次启动会提示设备认证：`Please visit https://github.com/login/device and enter code XXXX-XXXX to authenticate.`

   认证过期/401 时，重跑 `npx copilot-gateway@latest start --proxy-env` 重新完成设备认证。

预期：配置改完后能正常开新会话；因为已经备份 `~/.claude`，每一步都能回滚。

### 做法 E：中文技术文档写作与审稿（按 A 的对照法验证）

1. 前提：使用 Claude Code 或支持 Agent Skills 的工具。装 skill（二选一，命令同做法 A）：

   ```bash
   npx skills add leter/zh-tech-writing -g
   ```

   或手动拷贝：

   ```bash
   git clone https://github.com/leter/zh-tech-writing.git
   cp -r zh-tech-writing/skills/zh-tech-writing ~/.claude/skills/
   ```

   预期：`~/.claude/skills/zh-tech-writing/SKILL.md` 存在，`references/` 一起装上。

2. （推荐，非必需）装 autocorrect。三条安装路径：

   ```bash
   brew install autocorrect
   # 或从 Releases 页面下载二进制文件
   # 或 cargo install autocorrect
   ```

   验证安装：

   ```bash
   autocorrect -V
   ```

   预期：能看到版本号即成功。没装的话，第 5 步的自动修正会跳过。

3. 第一次只审不改，先看它列的问题是否成立：

   ```text
   /zh-tech-writing 检查 docs/api.md，只列问题，不要改
   ```

   预期：按「原句 → 改后 → 原因」的格式列问题，不动文件。不明确说“只列问题”，它会直接改文件。

4. 再让它改一版。写 / 改中文技术文档时 skill 通常自动加载，也可手动调用：

   ```text
   /zh-tech-writing 改一下 docs/api.md
   ```

   预期：逐条 diff 审阅，重点看有没有「删了空话却没补事实」导致信息丢失。按 README 说法，skill 找不到事实时会删掉空话或直接问你，检查它是否真的问了。

5. 按它内置的五步写作流程验收：

   1. 先确定读者是谁，读完要能做成什么事。
   2. 按规则写：句子、语气、段落与结构、排版。
   3. 用「AI 腔清单」逐条检查全文，命中的地方全部改掉。
   4. 运行 `autocorrect --fix`，修正空格和标点。
   5. 手动检查 autocorrect 不管的引号、省略号和破折号。

6. 写 / 审稿时对照核心规则：句子逗号隔开的每一截尽量在 20 字以内；多用肯定句和主动语态；直接用动词；语气像给同事讲清楚一件事；每段第一句说重点；标题不跳级；少用四级标题；加粗和列表不滥用。AI 腔清单包括开场和结尾套话、「不是 A，而是 B」句式、硬凑三个排比、宣传腔形容词、黑话、破折号和翻译腔。关键约束：事实必须来自你的项目。

7. 按需读 references：涉及数字与标点细则时读 `references/typography.md`；写产品手册时读 `references/manual-structure.md`。注意：本次材料只给了 README，`SKILL.md` 与两个 references 的完整内容未提供，14 条 AI 腔清单只给了类别、没有逐条文本，具体执行细则要打开仓库文件确认。

### 做法 F：单篇论文精读（按 A 的对照法验证）

1. 前提：宿主助手支持文件读取，并能读取 PDF/图像。获取技能文件：

   ```bash
   git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git
   ```

2. 指定入口。路径相对于你的工作目录，必要时改用 `SKILL.md` 的绝对路径：

   ```text
   请使用 ./biomedical-paper-reader/SKILL.md 阅读这份 PDF，生成中文精读报告。
   ```

   装成本地技能后可以直接按名字调用：

   ```text
   使用 $biomedical-paper-reader 解析这篇论文：<DOI、链接或附件>。
   ```

   预期：生成一份结构化精读报告 `report.md`（必要时附 `assets/` 图像），默认中文输出。

3. 准备输入与附加材料。补充材料默认只用本地已有文件；没有补充文件就只用正文完成报告，并说明哪些判断未核查附件；只有你明确要求补取时才联网下载。不要因附件缺失就断言作者未做验证。

4. 处理文本：直接复用可读的 PDF 提取结果，不再优先使用 MarkItDown，也不要求先生成 Markdown 底稿；原 PDF 留作数字与图像核查。

5. 看图：每张主图先概览，必要面板再放大；完整阅读图注，关注核心结论、必要对照、阴性结果及图文冲突。报告要区分「概览」和「具体核查范围」。

6. 按默认七段顺序读报告：①开篇导读 ②文章信息 ③研究概述 ④全文逻辑路线图 ⑤逐图 / 逐结果精读 ⑥研究总结与课题借鉴 ⑦数据与复现入口。

7. 检查判定纪律：是否先建立原文章节、图表和主张索引；是否把独立个体数与细胞 / 切片数、观察与因果、作者解释与新增假设分别处理；是否把未实际执行的代码和数据误标为已经复现。

8. 交付与调整：有文件工具时在独立论文目录下交付 `report.md`，必要图像放 `assets/`；没有文件工具时直接输出文本。补充研究方向可获得更贴合的迁移建议；要求速读时压缩篇幅。

   预期：报告里每张主图都被讲到、图注被引用、没有遗漏面板；说不清某类论文是否适用时，就限定使用范围并把不适用处记下来。

### 做法 G：自己写一个 Claude Code mod，把会话信息嵌进界面（可选，先 try 不要 adopt）

mod 与做法 A、B 的关系：技能是给 agent 加规范，mod 是给会话加界面与拦截能力。两者都套用同一套对照方法——教程完整可照做，但 mods API 会随版本变化，且 mod 以与 Claude Code 同等权限在本机运行，所以先试一个，不要直接纳入日常。

1. 确认版本。mods 默认开启，无需打开开关。

   ```shell
   claude --version   # 需要 2.1.287 或更高
   ```

   预期：版本号 ≥ 2.1.287。低版本先升级 Claude Code。

2. 选一个“信息看不见”的痛点当第一个目标，例如上下文占用、危险命令拦截、改动回放。

3. 二选一建 mod。

   做法 G-1（最快）：让 Claude 自己写。开一个 session，粘贴原文的 shortcut 提示词，只描述你想看到什么：

   ```text
   Make me a Claude Code mod called token-weather: a live forecast of my context window, shown in the band above the prompt.

   What it should show, on one line:
   - A weather icon and word for how full the context window is: under 25% ☀ Clear (yellow), 25–49% ☁ Cloudy (cyan), 50–74% ☂ Showers (blue), 75–89% ☇ Storm (magenta), 90% and up ↯ Compact soon (red).
   - The percentage used, then the tokens used out of the window, like "134.4k / 200k".
   - A small chart of the last 12 turns, drawn with ▁▂▃▄▅▆▇█.
   - How much the last turn added, like "▲ +98.3k last turn".

   It should update after every turn.
   ```

   前提与预期：Claude 会问一次是否为本次会话打开 hot reloading，允许它，band 就会在 Claude 回合结束时出现在 prompt 上方。这个 mod 只在当前会话加载，目录之后会被清理，要保留就把文件夹复制出去，按第 8 步当普通插件安装。

   做法 G-2（想自己看懂或检查 Claude 写了什么时走这条）：手工建目录。

   ```text
   token-weather/
   ├── .claude-plugin/
   │   ├── plugin.json
   │   └── types/ (written by Claude Code when it loads the mod)
   ├── hooks/
   │   ├── hooks.json
   │   └── token-weather.mjs
   ├── types/
   │   └── index.d.ts (added in step 3)
   └── tests/
       └── token-weather.test.ts (added in step 5)
   ```

   `.claude-plugin/plugin.json`（标准插件 manifest）：

   ```json
   {
     "name": "token-weather",
     "version": "0.1.0",
     "description": "A live forecast of the context window, drawn above the prompt.",
     "author": { "name": "You" }
   }
   ```

   `hooks/hooks.json` 指向模块，一个 mod 只能有一个：

   ```json
   {
     "modules": ["./token-weather.mjs"]
   }
   ```

   注意：每次加载 mod，Claude Code 会把类型声明写进该 mod 的 `.claude-plugin/types/` 文件夹，那份声明是你这个版本的权威依据。

4. 先画点东西。prompt 正上方那条带叫 `AbovePrompt`。

   ```javascript
   // hooks/token-weather.mjs
   export function register(on) {
     on("ui.render", { component: "AbovePrompt" }, ($, e, next) => {
       const { Box, Text } = $.ui.resolve(e);
       return Box({
         paddingX: 1,
         children: [Text({ color: "yellow", bold: true, children: "☀ Clear skies" })],
       });
     });
   }
   ```

   带插件启动会话：

   ```shell
   claude --plugin-dir ./token-weather
   ```

   预期：prompt 上方出现你画的那条带。

5. 读真实数字，把历史放进 `$.state`。`$.session.usage()` 返回与状态行相同的数字：`context.tokens`、`context.window`、`context.percent`。

   ```javascript
   on("session.start", async ($, e, next) => {
     const result = await next(e);
     await takeReading($);
     return result;
   });

   on("turn.complete", async ($, e, next) => {
     const result = await next(e);
     if (!e.agentId) {
       await takeReading($);
     }
     return result;
   });
   ```

   关键坑：模块级变量在 hot reload 时会重置，历史必须放 `$.state`。

   ```javascript
   const readings = { plugin: "token-weather", key: "readings" };

   async function takeReading($) {
     const { context } = await $.session.usage();
     if (!context?.window) return;
     const tokens = context.tokens ?? 0;
     const percent = context.percent ?? Math.round((tokens / context.window) * 100);
     const { value: history = [] } = await $.state.get(readings);
     await $.state.set(readings, [...history, { tokens, window: context.window, percent }].slice(-HISTORY));
   }
   ```

6. 在类型契约里声明 state。新建 `types/index.d.ts`：

   ```typescript
   export type TokenWeatherReading = { tokens: number; window: number; percent: number };

   declare module "claude-code" {
     interface PluginState {
       "token-weather": { readings: TokenWeatherReading[] };
     }
   }
   ```

   前提：把 `"types": "./types/index.d.ts"` 加进 `plugin.json`。跳过这步，`claude plugin validate` 会报错。

7. 补完完整模块。原文 Step 4 给了可整段复制的完整模块，但本次材料在 `async function ta` 处被截断，不能照抄半截代码，需打开原文补全后再复制。

8. 决定是否保留。要长期用，就把文件夹复制出去，按普通插件安装。安装任何来源不明的 mod 前先确认信任来源。预期：你能说清这个 mod 让你提前看见了什么、或拦下了哪一次返工；说不清就不要保留。

### 做法 H：让 agent 代理 Cline CLI 跑长任务，并用硬证据验收（可选，按 A 的对照法验证）

适用前提：你在用 Cline CLI，且宿主支持 Agent Skills 规范。它声明的能力是：派发任务 → 非交互或交互地运行 Cline → 从会话文件 + 硬证据（git / 测试报告）监控进度 → 用固定「四要素格式」把决策点回报给你 → 报告完成前按 6 项验收清单核对 → 按项目标签类学习你的偏好，逐步替你决定。README 明确划了边界：技能本身不持有项目架构知识，也不做单方面技术决策——push、删除、写 DB、花钱、改全局配置这类硬约束动作一律先问你。

1. 安装。前提：目标 agent 支持 Agent Skills 规范。

   ```bash
   npx skills add https://github.com/gongdear/cline-pilot
   mkdir -p ~/.hermes/skills && cp -r cline-pilot ~/.hermes/skills/
   ```

   预期：技能装在你点名的目录下。注意目标目录按你实际使用的宿主替换，不要四个都拷。

2. 完成首次本地配置。前提：先想清楚自己的开发环境。agent 会询问 conda / python 环境名、工具链如何进入 PATH、任务分支的命名方式，并写入 `references/local-config.md`。预期：配置只落在本机，不进入仓库。

3. 过冷启动门禁。前提：任何 memory bank 被启用之前。必须先把默认的全局 memory-bank 提示词放到位，模板在 `assets/global-memory-bank-prompt.md`，README 强调要逐字使用。

4. 选冷启动路径：还没有代码，规则由 agent 逐维度询问你后组装；遗留代码，规则基于对代码的扫描落地。

5. 采用两阶段模型策略：初始化阶段用强的长上下文（付费）模型；稳态阶段切到小的本地模型跑任务循环。经验法则：前沿模型买一次规则，本地模型每天跑纪律。若某个本地批次同一断言连续失败 3 次，把那一个批次升级回更强模型。

6. 派发编码任务：把指向 Cline CLI 的任务交给 agent，技能激活、挑选合适模式、注入提示词（固定首行 `active memory bank`）、后台运行。

7. 监控进度：用只读脚本读取会话消息与 git / surefire 证据。

   ```bash
   python3 scripts/session_report.py 15 /path/to/repo
   ```

   注意：示例参数 `15`、`5` 的含义原文未说明，照抄命令前先自行确认参数语义。

8. 验收后再报完成：走 6 项验收清单；原则是证据优先于自我报告——完成由 git status、测试报告数字、非空产物证明，绝不采信 agent 自己的声明。

9. 维护学习闭环：每次纠正/决策记入 `decision-log.md`（按项目标签类）→ 累计 ≥2 个一致样本 → 蒸馏进 `SKILL.md` 的偏好段。预期：同类决策落到「无先例」的比例下降。

10. 硬约束动作先问用户：push、删除、写数据库、花钱、改全局配置，一律先确认。

11. 自检命令（前提：装好 skill 与 Python 3）：

    ```bash
    npx @anthropics/skills-ref validate .
    python3 -m py_compile scripts/session_report.py
    python3 scripts/session_report.py 5 /path/to/repo
    ```

预期：技能包采用渐进披露——`SKILL.md`（<150 行）仅在激活时加载，`references/*` 按需加载，`scripts/session_report.py` 是确定性代码。验收标准是你能说清哪一批次拿到了硬证据；说不清就不要保留。

### 做法 I：给 agent 补一块 UI/UX 设计知识（可选，按 A 的对照法验证）

定位：装进编码智能体后，让它做 UI/UX 工作时自动拿到一块可检索的设计知识库。README 自述包含 192 条行业推理规则、79 种可检索 UI 风格（其中 50 种 active）、192 套配色、74 组字体搭配、25 种图表类型、22 个技术栈指南、119 条 UX 指南——这些均为作者主张，需自己验证。

1. 前提检查：需要 Node/npm 装 CLI；需要本机有 Python 3.x。README 明确要求：这些安装步骤是给“人”的，agent 不应自行在用户机器上安装软件，应向你询问。

   ```bash
   python3 --version
   ```

2. 全局安装 CLI。注意包名与命令名不同；README 明说旧的 `uipro-cli` 已过期不要用。

   ```bash
   npm install -g ui-ux-pro-max-cli
   ```

3. 进项目并装到你的 agent。先 dry-run 看会写哪些文件：

   ```bash
   cd /path/to/your/project
   uipro init --dry-run
   uipro init --ai claude
   uipro init --ai cursor
   uipro init --ai copilot
   uipro init --ai opencode
   uipro init --ai zcode
   uipro init --ai universal
   uipro init --ai all
   ```

   可选全局安装：

   ```bash
   uipro init --ai claude --global
   uipro init --ai cursor --global
   uipro init --ai universal --global
   ```

   Claude Code 也可走插件市场：

   ```text
   /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
   /plugin install ui-ux-pro-max@ui-ux-pro-max-skill
   ```

   预期：技能文件落到你点名的 agent 目录；多数平台在你提到 UI/UX 任务时自动激活。

4. 日常用法：直接用自然语言提 UI/UX 请求即可。想要特定技术栈就在 prompt 里点名，不写默认 HTML + Tailwind。

5. 直接调用设计系统生成器：

   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech banking" --design-system -f markdown
   ```

6. 单域检索：

   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "glassmorphism" --domain style
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "elegant serif" --domain typography
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dashboard" --domain chart
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "error summary validation" --domain ux
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "badge chip label wraps to second line" --domain ux
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "icon button accessible label" --domain icons
   ```

7. 按技术栈检索：

   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "form validation" --stack react
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "responsive layout" --stack html-tailwind
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "tableview binding" --stack javafx
   ```

8. 把设计系统落盘成文件（Master + Overrides 模式）：

   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp"
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp" --page "dashboard"
   ```

   生成结构：

   ```text
   design-system/
   └── myapp/
       ├── MASTER.md           # 全局唯一真源（颜色、字体、间距、组件）
       └── pages/
           └── dashboard.md    # 仅记录对 Master 的偏离
   ```

9. 后续每次建页都用同一段检索提示词：

   ```text
   I am building the [Page Name] page. Please read design-system/[project-slug]/MASTER.md.
   Also check if design-system/[project-slug]/pages/[page-name].md exists.
   If the page file exists, prioritize its rules.
   If not, use the Master rules exclusively.
   Now, generate the code...
   ```

10. 交付前逐条对检查清单：No emojis as icons；cursor-pointer on all clickable elements；Interaction timing follows the platform, component, and user preference；Light mode: text contrast 4.5:1 minimum；Focus states visible for keyboard nav；prefers-reduced-motion respected；Text, chips, and badges reflow without clipping or broken labels；Responsive: 375px, 768px, 1024px, 1440px。

11. 维护/卸载（可选）：

    ```bash
    uipro versions
    uipro update
    uipro uninstall --ai claude
    uipro init --offline
    ```

预期：你能说清哪一条检索结果改变了你的页面决策；说不清就不要保留。

### 做法 J：让 agent 从一句话或一个仓库产出可交互的架构图（可选，按 A 的对照法验证）

定位：Archify（仓库 `tt-a1i/archify`，MIT 许可，README 标注当前稳定版 `v3.0.1`）是一个 agent skill，也带一个零依赖 CLI。它把“一句话描述”或“一个代码仓库”转成可交互的单文件 HTML 图，支持五种图型：架构、工作流、时序、数据流、生命周期。它的工作管线是 Generate → Validate → Preview → Deliver → Iterate。与做法 A、B 的关系：它同样是一个技能包的试装，所以套用同一套对照方法；区别是它的验收信号更硬——`validate --json` 与 `deliver --json` 返回规则码、精确 subject、实测证据和只含受支持修复手段的 `diagnostics[]`，可以直接数返工轮次。

1. 前提检查。本地有 Node.js；README 的不同集成对版本要求不同。

2. 安装 skill（全局）。

   ```bash
   npx skills add tt-a1i/archify -g
   ```

   Cursor 的非交互安装：

   ```bash
   npx -y skills add tt-a1i/archify --skill archify --agent cursor --global --copy --yes
   ```

   不想安装先试用：

   ```bash
   npx skills use tt-a1i/archify@archify --agent codex
   ```

   预期：技能落到你点名的目录。

3. 从描述出图（不需要仓库）。把下面这段原样发给 agent：

   ```text
   Use Archify to diagram a web request: Browser calls the API,
   the API checks Redis, and a cache miss queries PostgreSQL and fills the cache.
   ```

   预期：agent 生成 typed JSON IR，经校验后交付一个可打开的单文件 HTML。

4. 从仓库出图（要源码证据）。在打开仓库的会话里发：

   ```text
   Analyze this repository, then use archify to create a high-level runtime architecture diagram.
   Show 8–12 core components, one primary path, external dependencies, and trust boundaries.
   Put supporting detail in cards instead of adding more edges.
   ```

   前提：agent 能读取仓库，并把证据固定到一个 public commit 的文件与行号。预期：带证据的架构节点会标 `SRC n`。

5. 在对话里迭代。用聚焦请求继续改，例如 `add Redis`、`move auth to the left`、`highlight the rollback path`。

6. 选对图型。按 README 的对照表把类型写进提示词：Architecture、Workflow、Sequence、Data Flow、Lifecycle。拿不准用哪种时问 CLI：

   ```bash
   node archify/bin/archify.mjs guide "Show an API request with Redis cache miss"
   node archify/bin/archify.mjs guide "Map Kafka topics, consumer groups, replay, and DLQ" --json
   ```

7. 在仓库里跑完整命令链：

   ```bash
   cd archify
   node bin/archify.mjs doctor
   node bin/archify.mjs demo /tmp/archify-demo
   node bin/archify.mjs guide "Show CI/CD checks, approval, deploy, and rollback"
   node bin/archify.mjs validate workflow examples/agent-tool-call.workflow.json --quality showcase --json
   node bin/archify.mjs preview workflow examples/agent-tool-call.workflow.json /tmp/workflow.html --quality showcase
   node bin/archify.mjs deliver workflow examples/agent-tool-call.workflow.json /tmp/workflow.html --quality showcase --open --json
   ```

   预期：只有通过全部门禁的最新候选才刷新，失败时还是上一份 last-good 产物。

8. 失败时按收据修，不要盲重试。`validate --json` 与 `deliver --json` 失败时只输出一个 JSON 对象，只应用 `diagnostics[]` 各 subject 的 `supportedFixes`，且限制在 skill 的两轮修正之内。

9. 改架构前做差异评审：

   ```bash
   node archify/bin/archify.mjs compare architecture base.json head.json architecture-delta.html --json
   ```

   对比经过校验的 Before / Delta / After 快照；README 明确它不推断影响、风险或可合并性。

10. 设置输出元信息（放进源的 `meta` 里）：

    ```json
    {
      "meta": {
        "locale": "en",
        "animation": "trace",
        "visual_preset": "signal-flow"
      }
    }
    ```

11. 交付与查看。产物是一个 HTML 文件，下载后浏览器直接打开即可用。查看侧快捷键：`?`、`/`、`R`/`PATH`、`L`/`LENS`、`M`/`MAP`、`F`、`S`/`T`/`E`、`+`/`-`/`0`。稳定链接可带 `#focus=<id>`、`#focus=<id>&reach=upstream|downstream`、`#relation=<id>`、`#route=<source>~<target>`、`#lens=<kind>~<kind>`。

12. （可选）其他集成：

    ```bash
    hermes skills install skills-sh/tt-a1i/archify/archify -y
    ```

    ```text
    dsh plugin --profile web add @tt-a1i/archify-dsh@0.1.0
    ```

13. 更新检查可关。设 `ARCHIFY_UPDATE_CHECK_DISABLED=1` 可关闭联网与提醒状态写入。

预期：你能说清哪一张图减少了你解释系统结构的轮次；说不清就不要保留。

### 做法 K：把自然语言需求或已有图源改成自包含的 HTML+SVG 图（可选，按 A 的对照法验证）

定位：`cathrynlavery/diagram-design` 是一个 Agent Skill，装上后让 agent 把自然语言需求或已有的 draw.io / Mermaid / Excalidraw 源文件改成自包含的 HTML + SVG 图。README 声明：无构建步骤、无 JavaScript、无外部图片依赖，静态变体可直接在浏览器打开；每种图型提供三种静态变体（minimal light / minimal dark / full-editorial）；默认静态 HTML，可选 `reveal / step / loop` 无障碍动效。2.5.10 新增十种版式语法。与做法 J 的区别：J 出可交互单文件 HTML 且验收靠机器收据，K 默认出无 JS 的静态 HTML+SVG，验收靠品牌 onboarding 的对比度校验和 fidelity receipt。

1. 前提：你需要一个受支持的编码智能体宿主（Claude Code、Codex、Factory Droid、Pi、GitHub Copilot、Kiro、OpenCode 等）。

2. 安装（按你的宿主各取一条，命令原文照抄）。

   Claude Code：

   ```text
   /plugin marketplace add cathrynlavery/diagram-design
   /plugin install diagram-design@diagram-design
   ```

   然后启用更新：运行 `/plugin` → 打开 **Marketplaces** → 选中 **diagram-design** → 选 **Enable auto-update**；提示时运行 `/reload-plugins`。

   Codex：

   ```bash
   codex plugin marketplace add cathrynlavery/diagram-design
   codex plugin add diagram-design@diagram-design
   ```

   GitHub Copilot：

   ```bash
   copilot plugin marketplace add cathrynlavery/diagram-design
   copilot plugin install diagram-design@diagram-design
   ```

   Factory Droid：

   ```bash
   droid plugin marketplace add https://github.com/cathrynlavery/diagram-design
   droid plugin install diagram-design@diagram-design --scope user
   ```

   Pi：

   ```bash
   pi install https://github.com/cathrynlavery/diagram-design
   ```

   Kiro：导入仓库子目录 URL：

   ```text
   https://github.com/cathrynlavery/diagram-design/tree/main/skills/diagram-design
   ```

   OpenCode：把 `skills/diagram-design/` 拷或软链到项目的 `.opencode/skills/diagram-design`，或全局 `~/.config/opencode/skills/diagram-design`。

   预期：技能装在你点名的宿主上，并且你清楚它下一次怎么更新。

3. （可选）可编辑安装——准备改风格指南时走这条：

   ```bash
   git clone git@github.com:cathrynlavery/diagram-design.git ~/code/diagram-design
   ln -s ~/code/diagram-design/skills/diagram-design ~/.claude/skills/diagram-design
   ```

   注意：只建你用得到的那几个根目录。前提：托管安装可能覆盖你对 `references/style-guide.md` 的直接修改；`~/.diagram-design/profiles/` 里的 profile 与带 `.diagram-design` 标记的项目不受更新影响。

4. 做品牌 onboarding（README 称约 60 秒）。对智能体说：

   ```text
   onboard diagram-design to https://yoursite.com
   ```

   流程：抓首页 → 提取主色板与字体栈 → 映射到语义角色 `paper / ink / muted / accent / link` → 展示 proposed diff → 你回 `yes, apply it` → 写入 `references/style-guide.md`。写 token 前它会校验 `ink` 在 `paper` 上的 WCAG AA 对比度。品牌匹配还会产出 fidelity receipt。

5. 知道首次使用会被拦一次。在一个新项目里第一次用时，技能检查 `style-guide.md` 是否被定制过；没有就停下来问。

6. 多客户用命名 profile 隔离。给每个品牌 onboard 一次并存成命名 profile，在项目里放一个内容为 `profile: <slug>` 的 `.diagram-design` 标记文件。

7. 生成第一张图。直接自然语言提需求。或者从模板起步：

   ```bash
   cp skills/diagram-design/assets/template.html my-diagram.html
   cp skills/diagram-design/assets/template-full.html my-diagram.html
   cp skills/diagram-design/assets/template-motion.html my-diagram.html
   ```

   浏览全部图型：

   ```bash
   open skills/diagram-design/assets/index.html
   xdg-open skills/diagram-design/assets/index.html
   ```

   预期：得到一份能直接在浏览器打开、不依赖 JS 和外部图片的 HTML+SVG。

8. 重绘已有图（导入）。README 给了这两条命令原文：

   ```text
   /diagram-design:import-drawio platform.drawio
   /diagram-design:import-drawio platform.drawio --size=slide-16x
   ```

   注意：本次材料在导入这一节被截断，导出与后续步骤在给定材料里没有，要用前先打开仓库 README 确认完整流程。

9. 验收产物。README 里可核对的硬信号只有 onboarding 阶段的对比度校验与 fidelity receipt；图型覆盖数量等只是作者主张。预期：你能说清哪一次出图减少了你向别人解释结构的时间；说不清就不要保留。

### 做法 L：从大插件市场只装一个单元，并按任务档位选模型（可选，按 A 的对照法验证）

定位：wshobson/agents 是一个 agentic 插件市场仓库：单一 Markdown 源生成 6 个 harness 的本地化产物，Claude Code 为 source-of-truth。README 自述 94 个插件、202 个 agent、184 个 skill、105 个 command、16 个 orchestrator。每个插件自包含且可组合；安装一个插件只把它自己的组件加载进上下文，而不是整个市场。与做法 A、I 的关系：它就是 A 里“装一个现成技能包做对照”的一个更大来源，区别是它附带了 plugin-eval 这个现成评测工具。

1. Claude Code 安装（前提：已装 Claude Code，能在会话内执行斜杠命令）。

   ```bash
   /plugin marketplace add wshobson/agents
   /plugin install python-development
   ```

   预期：只装上你点名的那一个插件，而不是整个市场。

2. 只装技能（前提：已装 `gh` 或可用 `npx`）。

   ```bash
   gh skill install wshobson/agents
   gh skill install wshobson/agents python-testing-patterns --agent claude-code
   npx skills add wshobson/agents --skill python-testing-patterns
   ```

   预期：只有你点名的技能进目录。

3. 其它 harness。前提：Codex / Cursor 从仓库已提交的 registry 原生安装；Antigravity / OpenCode / Pi 需要 git + make。

   ```bash
   npx codex-marketplace add wshobson/agents
   gh repo clone wshobson/agents ~/agents && cd ~/agents
   make generate HARNESS=antigravity && make install-antigravity
   make install-opencode
   make generate HARNESS=pi && make install-pi
   ```

   预期：产物落到你点名的 harness。注意 GitHub Copilot 这条路径仓库仍声明支持并生成 `.copilot/`，但材料里的清单已把它判为 drop，两者存在差异，先别在这条路径上投入。

4. 批量生成与结构自检（前提：在仓库根目录）。

   ```bash
   make generate-all
   make validate
   make garden
   ```

   预期：通过结构检查；`garden` 会检出漂移、死链与上限问题。

5. 按任务层级选模型（插件内的模型配置策略，照原文表格）。

   | Tier | Model | 用途 |
   |---|---|---|
   | 0 | Fable 5 | 最长周期的自主工作——大规模迁移、数小时运行（需 opt-in，成本高） |
   | 1 | Opus | 架构、安全、代码评审、生产关键路径 |
   | 2 | inherit | 用户自选——后端、前端、AI/ML、专门领域 |
   | 3 | Sonnet | 文档、测试、调试、API 参考 |
   | 4 | Haiku | 快速操作类任务、SEO、部署、内容 |

   预期：架构、安全、评审类任务走高档位，文档、测试、调试走中档，SEO、部署、内容走低档。

6. 对单个 skill 打分（前提：可用 `uv`）。

   ```bash
   uv run plugin-eval score path/to/skill --depth quick
   uv run plugin-eval certify path/to/skill
   ```

   注意：plugin-eval 分三层——静态层是确定性 lint；LLM judge 由 Haiku 和 Sonnet 按 4 个维度打分，标注为实验性；Monte Carlo 在生成提示上跑 50 或 100 次，同样标注实验性。把它的输出当筛子，不是结论。

7. 按 A 的对照法验证。只选一个与当前工作直接相关的单元，优先走 skills-only 安装；在一个真实小任务上跑一遍，保留装插件前的同任务结果作为基线。预期：你能说清哪一项指标变了；没有明确改善、或内容与团队既有约定冲突，就退回只用 skill 层。

### 做法 M：把一本反复查阅的书或一份内部文档变成按需加载的技能（可选，按 A 的对照法验证）

定位：book-to-skill（MIT 许可）是一个转换器加 Agent Skill 定义，把技术书 PDF/EPUB/DOCX/HTML/RTF/MOBI、文档文件夹或一组来源，转换成一个符合 Agent Skills 开放标准的 skill，落到用户级跨代理技能目录 `~/.agents/skills/<slug>/`。生成物固定为五类文件：`SKILL.md`（~4,000 tokens）、`chapters/ch01-*.md`（每个 ~1,000 tokens）、`glossary.md`（~1,500 tokens）、`patterns.md`（~2,000 tokens）、`cheatsheet.md`（~1,000 tokens）。关键设计：章节文件按需加载，未被问到的章节不计入 skill 预算。官方声明在真实书籍上测得的 token 消耗比把整本书塞进上下文少 24×–51×——这是作者主张，要自己测。与做法 A、B 的关系：A 是装别人的技能，B 是自己写 `SKILL.md`，M 是把你已有的资料半自动生成成 `SKILL.md` 加章节文件；产物可以直接当 B 的输入，也必须照 A 做对照。

1. 安装（前提：能执行 npx 或 git，且宿主支持 Agent Skills 标准）。

   ```bash
   npx skills add virgiliojr94/book-to-skill
   git clone https://github.com/virgiliojr94/book-to-skill.git ~/.claude/skills/book-to-skill
   ```

   各宿主技能目录：Copilot CLI `~/.copilot/skills/`；Amp / 跨代理 `~/.agents/skills/`；Hermes Agent `${HERMES_HOME:-$HOME/.hermes}/skills/<category>/`；OpenClaw `${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/skills/`；OpenCode `~/.agents/skills/`。

2. 检查抽取依赖（不需要文件）。

   ```bash
   python3 scripts/extract.py --check
   ```

   预期：打印每种格式已安装的抽取器，以及缺失项对应的确切安装命令。

3. 按书型安装 PDF 抽取器：文本为主用 `pdftotext` (poppler) 或回退 `pypdf` / `pdfminer.six`；技术类（代码、表格、公式）用 `docling`（约 1.5 秒/页）。其它格式：EPUB 用 `ebooklib beautifulsoup4` 或内置 `zipfile`；DOCX 用 `python-docx`；HTML 用 `beautifulsoup4`；RTF 用 `striprtf`；MOBI 用 Calibre `ebook-convert`。

4. 扫描版 PDF 必须先 OCR：

   ```bash
   ocrmypdf input.pdf output.pdf
   ```

5. 运行转换。

   ```text
   /book-to-skill <path|folder|glob> [skill-name]
   ```

   例：`/book-to-skill ./my-book.pdf`。转换开始前会问这本书是 **technical** 还是 **text-heavy**，据此自动选抽取器。预期：生成物落到技能目录，五类文件齐全。

6. 使用生成的 skill。

   ```text
   /your-book-slug replication
   ```

   预期：代理只读对应章节，从真实内容回答，而不是通读整本 PDF。

7. 校验与（可选）发布。

   ```bash
   tools/validate_skill.py --lens claude|copilot|amp|hermes|opencode
   ```

   注意：Claude Code 下运行时转换器会尝试在 `~/.claude/skills/<slug>/` 建符号链接；Hermes 按类别分区、不扫描跨代理根目录。

8. 合规前提。工具不自带任何书籍内容，抽取与分析在本机完成、不上传文件；产出被定位为“你自己的结构化笔记”，官方要求不得再分发第三方版权作品的生成 skill。

### 做法 N：把模糊想法写成可独立跑的任务书，并给破坏性操作加三色闸门（可选，按 A 的对照法验证）

定位：khazix-skills 是作者把自己日常在用的 6 个技能开源出来的合集，遵循 Agent Skills 开放标准。六个技能分别是：leader（把一句模糊想法定义成清晰目标，产出可让 AI 独立跑数小时到完成的任务书）、storage-analyzer（一句话扫描整机磁盘，出交互式 HTML 报告，三色分级给清理决策）、aihot（让 Agent 一句话拿到 aihot.news 的 AI 日报与动态）、neat-freak（干完活跑 `/neat`，对齐项目文档、CLAUDE.md/AGENTS.md、Agent 记忆并审计规则执行）、hv-analysis（对产品/公司/概念做纵向+横向分析）、khazix-writer（按作者口吻与禁忌词写公众号长文）。建议只装 1–2 个，优先 leader 与 neat-freak。与做法 A 的关系：它同样是装一个现成技能包，区别是它额外给出两样可照抄的规则——leader 的「目标七问」和 storage-analyzer 的三色分级安全模型。

1. 安装（前提：你的 Agent 支持 Agent Skills 标准）。在 Agent 里直接说：

   ```text
   帮我安装这个 skill：https://github.com/KKKKhazix/khazix-skills/tree/main/leader
   ```

   预期：Agent 自己 clone 到对应目录。

2. 降级方案（前提：Agent 不支持 Skill）。把对应目录的 `SKILL.md` 全文下载下来，当成项目规则文件，或直接贴进对话让 Agent 照着执行——README 称“效果一致”，这是作者主张。

3. 用 leader 写目标。触发词：`帮我给 agent 写个目标`、`帮我详细拆一下这个目标`、`写个 goal 提示词`、`让 agent 自己跑这个项目`。流程：先说一句想法 → 它先实测调研 → 问你最多 5 个必须你拍板的问题 → 写出纯 Markdown 任务书。拿到后粘进目标模式。

4. 按「目标七问」检查任务书（外加第零问）：1 目的；2 完成态；3 证据；4 反作弊；5 地界；6 取舍；7 未知。第零问：海图是自己实测的还是听来的。预期：七问里任何一条没答案，就不要丢进目标模式跑长程，先补任务书。

5. 用 storage-analyzer 清磁盘。触发词：`帮我看看存储`、`C 盘满了`、`清理一下磁盘`、`看下电脑空间`、`storage analysis`。它扫完整机后在浏览器打开交互式 HTML 报告。照抄它的安全规则：绿灯可让 Agent 一键清；黄灯只给「在访达打开」和「移废纸篓」；红灯只解释，最多「打开文件夹」，永不给删除按钮；铁律：全程只读扫描，删除必须浏览器点按钮 + 弹框二次确认；本地服务跑 127.0.0.1 + 随机端口 + token，白名单分级。

6. 用 neat-freak 收尾。每次在 Agent 里干完一件事后跑：`/neat`、`跑一下洁癖`、`把文档和记忆整理一下`、`新人接手，帮我做个 clean handoff`。它对齐三层：项目根 `CLAUDE.md / AGENTS.md`、`docs/` 和 README、Agent 记忆系统。两条底线：小项目走轻量路径；绝不擅自删东西。注意它不会响应纯代码任务、整理数据 / 周报类请求。

7. 其余三个按需：aihot 免 Key、免 MCP；hv-analysis 适合竞品分析，不适合单纯查名词解释；khazix-writer 有强烈个人风格立场，目标读者不吃这一套时不要用。

8. 按 A 的对照法验证。拿一个真实的、你原本打算自己盯着的多步任务，用触发词生成任务书，检查它是否覆盖目标七问；把任务书丢进目标模式跑一次，记录你需要人工介入的次数；任务完成后跑 `/neat`，看它对文档 / 规则 / 记忆提出的变更摘要是否合理；另拿一个同量级、不装技能的任务作为对照。预期：你能说清人工介入了多少次、哪一次干预避免了返工；说不清就不要保留。

### 做法 O：给 agent 补一块 Postgres 领域知识与版本化文档检索（可选，按 A 的对照法验证）

定位：pg-aiguide 是 Timescale（TigerData）开源的 PostgreSQL 知识包（Apache 2.0，README 标注 1853 stars），由三部分组成：对官方 PostgreSQL 手册（按版本区分）、TimescaleDB、PostGIS 文档做语义检索，通过公共 MCP server 暴露 `search_docs`；把有倾向性的 Postgres 最佳实践固化成 agent 可自动调用的技能。三种接入形态：Agent Skills、公共 MCP server、Claude Code 插件。与做法 A 的关系：同样是装一个技能包做对照；区别是它把可照抄的 A/B 提示词直接给了出来，而且效果证据只有厂商自己一次演示，更要自己做对照。

1. 前提：本机可用 `npx`，目标 agent 支持 Agent Skills 或 MCP。

2. 装技能（二选一或都装）：

   ```bash
   npx skills add timescale/pg-aiguide --skill postgres
   npx skills add timescale/pg-aiguide --skill schema-exploration
   ```

   预期：`postgres` 与 `schema-exploration` 落到你点名的技能目录。

3. 接入 MCP server（前提：agent 支持 MCP）。公共端点 `https://mcp.tigerdata.com/docs`，通用 JSON 配置：

   ```json
   {
     "mcpServers": {
       "pg-aiguide": {
         "url": "https://mcp.tigerdata.com/docs"
       }
     }
   }
   ```

   按环境分别配置：Claude Code 插件方式：

   ```bash
   claude plugin marketplace add timescale/pg-aiguide
   claude plugin install pg@aiguide
   ```

   Codex：

   ```bash
   codex mcp add --url "https://mcp.tigerdata.com/docs" pg-aiguide
   ```

   Gemini CLI：

   ```bash
   gemini mcp add -s user pg-aiguide "https://mcp.tigerdata.com/docs" -t http
   ```

   Cursor（写入 `.cursor/mcp.json`）：

   ```json
   {
     "mcpServers": {
       "pg-aiguide": {
         "url": "https://mcp.tigerdata.com/docs"
       }
     }
   }
   ```

   Windsurf（写入 `~/.codeium/windsurf/mcp_config.json`，字段名是 `serverUrl`）：

   ```json
   {
     "mcpServers": {
       "pg-aiguide": {
         "serverUrl": "https://mcp.tigerdata.com/docs"
       }
     }
   }
   ```

   OpenCode（写入 `~/.config/opencode/opencode.json` 或项目级 `opencode.json`）：

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "mcp": {
       "pg-aiguide": {
         "type": "remote",
         "url": "https://mcp.tigerdata.com/docs"
       }
     }
   }
   ```

   VS Code：

   ```bash
   code --add-mcp '{"name":"pg-aiguide","type":"http","url":"https://mcp.tigerdata.com/docs"}'
   ```

4. 用具体任务触发它。简单：

   ```text
   Create a Postgres table schema for storing usernames and unique email addresses.
   ```

   复杂：

   ```text
   You are a senior software engineer. You are given a task to generate a Postgres schema for an IoT device company.
   The devices collect environmental data on a factory floor. The data includes temperature, humidity, pressure, as
   the main data points as well as other measurements that vary from device to device. Each device has a unique id
   and a human-readable name. We want to record the time the data was collected as well. Analysis for recent data
   includes finding outliers and anomalies based on measurements, as well as analyzing the data of particular devices for ad-hoc analysis. Historical data analysis includes analyzing the history of data for one device or getting statistics for all devices over long periods of time.
   ```

5. 用 README 演示的 A/B 法自测（原文提供的验证提示词，原样复制）：

   ```text
   Please describe the schema you would create for an e-commerce website two times, first with the tiger mcp server disabled, then with the tiger mcp server enabled. For each time, write the schema to its own file in the current working directory. Then compare the two files and let me know which approach generated the better schema, using both qualitative and quantitative reasons. For this example, only use standard Postgres.
   ```

   预期：拿到两份可逐项对比的 DDL。注意：单次 A/B 结果受提示词与模型随机性影响很大，同一任务重复 3 次以上、或换 2–3 个任务再下结论。

6. 只在真实但不紧急的任务上长期开启。不要用线上迁移做首次试验。

### 做法 P：在已获授权的漏洞挖掘场景按主题自动加载安全技能库（可选，按 A 的对照法验证）

定位：Claude-BugHunter（仓库 `elementalsouls/Claude-BugHunter`）是一个面向漏洞挖掘与外部红队的 Claude Code 技能包。README 自述含 83 个技能、15 个 slash 命令、681 条已披露报告模式，覆盖 24 类核心漏洞。关键机制是技能按主题自动加载，不用按名字调用——用自然语言描述你在测什么，相关技能自动载入。与做法 A 的关系：同样是装一个技能包做对照；区别是它的边界更强——只对自有或书面授权资产使用，且知识层可移植、slash 命令与 `/hunt` 引擎只在 Claude Code 可用。

1. 前提：已装 Claude Code；只对你自己拥有、或有书面授权评估的资产使用。可选：Burp Suite + MCP Server 扩展。不要用 Claude-BugHunter 去做未授权目标。

2. 方式 A（推荐）——作为 Claude Code 插件安装：

   ```text
   /plugin marketplace add elementalsouls/Claude-BugHunter
   /plugin install claude-bughunter@elementalsouls
   ```

   预期：83 个技能 + 15 个命令以 `claude-bughunter:` 命名空间加载。注意：此路径不含 `hunt` engagement 脚手架；`cbh` CLI 需另行 pipx 安装。

3. 方式 B——拷贝安装（没有插件系统，或想钉住某个 clone 时）：

   ```bash
   git clone https://github.com/elementalsouls/Claude-BugHunter.git
   cd Claude-BugHunter
   bash scripts/install.sh
   pwsh ./scripts/install.ps1
   ```

   三条路径的差别按 README 的表：插件路径不含 scaffolder；copy install 含 `cbh` CLI 与 `hunt` scaffolder。

4. 多 harness 一次装全（前提：技能是标准 Agent Skills `SKILL.md` 格式）：

   ```bash
   bash scripts/install.sh --all --burp-mcp
   pwsh ./scripts/install.ps1 -All -BurpMcp
   ```

   边界：知识层可移植到全部五个 harness；slash 命令与 `/hunt` 引擎按设计只在 Claude Code 可用。

5. 装 `cbh` CLI：

   ```bash
   pipx install git+https://github.com/elementalsouls/Claude-BugHunter
   ```

6. 开一个 engagement：用 `/hunt` 建 engagement 目录结构、状态与编排。注意 README 强调 `/hunt` 会在第一轮就声明 engagement 背景。随后按 README 自述的 6 阶段非线性流程走——原文列出的阶段名是 `recon → map & rank → hunt → validate → report`（原文如此，使用前以仓库内 `docs/architecture.md` 为准）；scope 由代码强制。

7. 日常用法：自然语言描述目标，技能自动加载。

8. 提交前过闸门：`triage-validation` 的 7-Question Gate 必须在提交任何东西之前过——其中 Q3 问资产是否在 scope 内，Q2 问是否在项目认可的 impact 列表内。证据按 `evidence-hygiene` 脱敏。报告按平台分流。

9. 授权与运行时注意事项：若做授权的攻击性安全工作，按 README 指引申请 Anthropic 免费的 Cyber Verification Program（CVP）。另有一条容易忽略的现象：Opus 5 对 exploit generation 一类更高风险请求会回落到 Opus 4.8 而非拒绝，若只是不想要自动切换，可在 Settings → Capabilities 关掉。

10. 按 A 的对照法验证：拿一个自建靶场或一个你自己拥有的小资产，跑一次 `/hunt` 加一个明确的自然语言目标，看它加载了哪些技能、给出的攻击面排序是否合理、7-Question Gate 是否真的拦下不该提交的发现；保留不装技能时的同任务结果作为基线。预期：你能说清哪一次闸门拦下了不该提交的发现；说不清就不要保留。注意 README 没有给改善幅度数据。

### 做法 Q：把复杂分析任务拆成“分析 → 实现 → 交付”三阶段，用阶段内只读门禁卡住返工（可选，按 A 的对照法验证）

定位：math-modeling-skill（仓库 `XiaoMaColtAI/math-modeling-skill`，版本 1.3.0，1848 stars）是一个 Agent Skill 仓库，把数学建模任务拆成 **建模分析 → 代码实现 → 论文撰写** 三个阶段。每个阶段绑定三类东西：

| 阶段 | 角色 | 固定交付物 | 独立门禁 |
|:--:|---|---|---|
| ① | 建模手 | `题目分析报告.md`、`术语表格.md` | `M1` 建模终检 |
| ② | 编程手 | 代码、结果表格、三类各至少 3 张候选图、至少 1 幅总体建模流程图、`results/复现清单.json` | `P1` 最小可运行结果、`P2` 编程终检 |
| ③ | 论文手 | 至少 8 幅正式图、默认 `完整论文.docx`；显式要求时加 LaTeX 源码/PDF/哈希清单 | `W1` 证据大纲、`W2` 论文终检 |

质检由阶段内的**只读 Subagent**执行，不是第四个固定角色。与做法 N 的关系：N 解决“想不清楚”，Q 解决“步骤多、容易一步错步步错”。可迁移到非建模任务的只有骨架（三阶段切分、只读门禁、目录契约、复现清单），领域内容不通用。

1. 前提与安装。前提：一个支持本地 Skills 或 Agent 工作流的宿主。二选一：

   ```bash
   git clone https://github.com/XiaoMaColtAI/math-modeling-skill.git
   ```

   ```bash
   npx skills add https://github.com/xiaomacoltai/math-modeling-skill --skill math-modeling
   ```

   预期：技能能被宿主加载，你清楚它落在哪个目录。

2. 先约定目录契约，再跑任何东西。`SKILL_ROOT` 为本仓库根目录、只读；`PROJECT_ROOT` 为你的题目目录，所有运行产物只写这里；题目与附件保持只读。典型产物结构：

   ```text
   PROJECT_ROOT/
   ├── data/                         # 题目附件，只读
   ├── 题目分析报告.md
   ├── 术语表格.md
   ├── 问题1_求解.py 或 问题1_求解.m
   ├── results/
   │   ├── 问题1_结果.csv
   │   └── 复现清单.json
   ├── figures/
   │   ├── raw_q1_*.svg / raw_q1_*.png
   │   ├── process_q1_*.svg / process_q1_*.png
   │   ├── result_q1_*.svg / result_q1_*.png
   │   ├── flow_overall_model.svg / .png     # 总体建模流程图（必须）
   │   └── _qa/                       # 自动生成的灰度质检预览
   └── 完整论文.docx                 # 默认交付的 Word 论文
   ```

3. 先用单阶段提示词做最便宜的对照——只跑建模分析，不跑代码、不出图。原文给出的可直接抄的示例：

   ```text
   使用数学建模 Skill 完成这道题，默认生成 Word 论文。
   使用数学建模 Skill 完成这道题，额外启用附件盘点、文献调研和算法原型 Subagent。
   使用数学建模 Skill 完成这道题，除固定质检外不使用其他 Subagent。
   只做建模分析，输出题目分析报告和术语表格。
   只实现现有模型，使用 MATLAB 运行并生成全部结果和图。
   根据现有代码结果生成完整论文.docx。
   ```

   预期：拿到 `题目分析报告.md` 和 `术语表格.md`，与你的人工版本逐项对照。

4. 按门禁顺序推进，不要攒到最后再质检。`P1`（最小可运行结果）必须在全量计算和正式出图之前执行；`W1`（论文证据大纲）必须在长篇正文和双格式排版之前执行；原文明确“禁止等全流程结束后才首次质检”。

5. 走阶段反馈回路。编程手发现公式、约束或参数无法实现时，携带实际报错返回建模手修正；论文手发现关键结论缺少真实结果、图表或文献支撑时，返回对应阶段补齐；任一独立门禁返回 `FAIL`，由原阶段执行者按证据修正并重新派发复验，**主 Agent 不得自行覆盖失败结论**；修正后从被阻断阶段继续，不重复已通过的阶段。

6. 按需调用集成工具：科研可视化、双引擎论文搜索、DOCX 工具、LaTeX 工具、Excel 工具、PDF 工具。

7. 跑双引擎文献检索：

   ```bash
   python tools/paper_search/scripts/hybrid_scholar.py --query "robust optimization vehicle routing" --limit 10 --json
   ```

   OpenAlex 可用 `--email` 提供礼貌池邮箱；AnySearch 需要密钥时设置环境变量 `ANYSEARCH_API_KEY`。

8. 动态依赖检查，只检查实际用到的功能：

   ```bash
   python references/roles/编程手/scripts/check_env.py --features data visualization optimization
   ```

   ```matlab
   addpath("references/roles/编程手/scripts");
   report = check_matlab_env(["data", "visualization", "optimization"]);
   ```

9. 算法资料渐进式加载：先读算法索引，再按问题类型加载对应资料；每道子问题最多使用两个独立模型体系。

10. 跑回归验证：

    ```bash
    python -m unittest discover -s tests -v
    python tools/docx/scripts/self_check.py
    python -m compileall -q tools references/roles/编程手/scripts
    ```

11. （可选）装 DeepSeek Harness 预设。把整个 `dsh-plugin/math-modeling-agent/` 目录复制到本机 dsh 预设根目录；新建会话选预设「数学建模 Workbench」，即可用 `mm_project_init` / `mm_phase_enter` / `mm_todo` / `mm_gate` / `mm_check_deliverables` / `mm_complete` / `mm_state` 等工具。

12. 把骨架平移到自己的任务上做一次压力测试。把“建模分析 → 代码实现 → 论文撰写”换成你领域的“分析 → 实现 → 交付”三段，把五个门禁换成自己领域的检查点，看两个机制是否仍然成立：只读根目录 + 可写项目目录的目录契约，以及阶段内只读质检。预期：至少能说出哪一道门禁真的拦下了后面才会暴露的问题；说不出就说明这套骨架对你不成立，不要硬搬。

### 做法 R：装一套小而可组合的工程技能集，把「动手前对齐」和可复用纪律固化下来（可选，按 A 的对照法验证）

定位：`mattpocock/skills`（作者 Matt Pocock）是一套面向编码智能体的技能集合。作者自述这是他每天用来做真实工程开发、而不是 vibe coding 的配置；技能被设计成**小而可组合、跨模型可用**，每条都能单独改动。它不接管流程，而是把工程基本功压缩成可重复实践。和做法 A 的关系：同样是一个技能包的试装，套用同一套对照方法；区别是它给了两条明确的安装路径、一条仓库级一次性配置，以及一条「用户调用型 / 模型调用型」的分工规则。和做法 B 的关系见前面「怎么选」——B 是写单个 `SKILL.md`，R 是先用别人拆好的一整套。

先理解它的两条设计经验：

- 分工轴：**用户调用型**只有你手输 `/xxx` 才会触发，职责是**编排**；**模型调用型**你可以手动调用，agent 也可以在任务匹配时自动调用，承载**可复用的纪律**。用户调用型可以调用模型调用型，但不能调用另一个用户调用型。
- 四个失败模式对应四组手段：agent 没做我要的 → 用拷问在动手前对齐；agent 太啰嗦 → 建一份共享语言文档（术语表 `GLOSSARY.md`）；代码跑不起来 → 补反馈回路（静态类型、浏览器访问、自动化测试，测试走红-绿-重构）；造出一坨泥 → 每天投资设计。

1. 前提：一个支持 agent skills 的编码 agent（Claude Code、Codex 等）。安装技能，两条路线**只选一条**——原文明确说两个都装会让每个技能出现两份。

   路线 A：Claude Code 插件：

   ```bash
   claude plugins install mattpocock-skills
   ```

   或在一个会话内：

   ```text
   /plugin install mattpocock-skills
   ```

   路线 B：Codex 及其他 agent（可选技能、可编辑）：

   ```bash
   npx skills@latest add mattpocock/skills
   ```

   前提与注意：安装器会让你**选择要装哪些技能、装到哪些编码 agent 上**；原文特意强调 **`setup-matt-pocock-skills` 必须被选中**。

   想拉作者最新改动时：

   ```bash
   npx skills update
   ```

2. 每个仓库跑一次配置。在你的 agent 里运行：

   ```text
   /setup-matt-pocock-skills
   ```

   前提：每个仓库跑一次，且要在用其他工程类技能**之前**跑。它会被问三件事：你要用哪个 issue tracker；你在 triage 工单时打什么标签；你希望生成的文档存到哪里。

3. 每次想改动前先对齐。非代码用途用 `/grill-me`；代码用途用 `/grill-with-docs`：同样是拷问，但会顺带建项目的领域模型、打磨术语，**内联更新 `GLOSSARY.md` 和 ADR**。前提：`/grill-with-docs` 需要你愿意让它写 `GLOSSARY.md` 和 ADR 文件。

4. （可选，但作者说这是最值钱的一步）建共享语言。用 `/grill-with-docs` 或模型调用型 `/domain-modeling`：挑战术语是否与术语表一致，用边界场景压力测试，内联更新 `GLOSSARY.md` 和 ADR。

5. 建反馈回路。`/tdd`：红-绿-重构循环，一次做一个垂直切片。`/diagnosing-bugs`：针对难 bug 和性能回归的纪律化诊断环，分阶段把关——先建一个能对当前 bug 变红的反馈回路 → 最小化 → 提假设 → 插桩 → 修 → 回归测试。前提：原文说这类反馈回路依赖「静态类型、浏览器访问、自动化测试」这些常规设施。

6. 管设计，别让它烂掉。`/to-spec`：把当前对话整理成规格并发到 issue tracker；它会在写规格前先问你会动哪些模块。`/improve-codebase-architecture`：扫描代码库里的「深化机会」，以可视化 HTML 报告交出候选，然后对选定的一项做拷问；作者建议**每隔几天**在代码库上跑一次，并提醒这是**勘察不是抢救**。

7. 串起完整工作流：`/to-spec` → `/to-tickets` → `/implement` 或 `/implement-spec` → `/code-review` 后才提交。

   - `/to-tickets`：把任何计划/规格/对话拆成一组 tracer-bullet 工单。
   - `/implement`：按规格或工单建东西，在事先约定的接缝处驱动 `/tdd`。
   - `/implement-spec`：在一个集成分支上实现整个 spec。
   - `/code-review`：按两个轴审 diff——**Standards** 和 **Spec**。
   - `/wayfinder`：为超过一个 agent 会话容量的大块工作，在 issue tracker 上建一张决策工单共享地图。
   - `/pr`：规定 PR 正文该长什么样。
   - `/retro`：会话结束后，按严重程度从高到低，提出对编码 agent 环境的改进建议。
   - `/handoff`：把当前对话压缩成交接文档。
   - `/research`：作为后台 agent 运行，对着高可信一手来源调查一个问题。
   - `/wizard`：生成交互式 bash 向导。
   - `ask-matt`：用户调用型技能之上的路由器。
   - `writing-for-agents`：一条元技能，管「怎么写 agent 读的文档」。

8. 按做法 A 的对照法验证。只挑一两个最高频入口开始（原文给的两个是 `/grill-with-docs` 和 `/tdd`），在一个真实仓库上跑，记录人工介入次数、返工轮数、首稿可用率；保留不装技能时的同任务结果作为基线。预期：你能说清哪一个入口减少了你自己的返工；说不清就不要保留。

注意：原文**没有给任何指标定义、基线或对照数据**，所有效果表述都是作者主张；各 `SKILL.md` 的实际提示词内容也不在本次材料里，要用前先打开仓库确认。

### 做法 S：从 google/skills 按任务只装一个 Google 相关技能（可选，按 A 的对照法验证）

定位：google/skills 是 Google 维护的 Agent Skills 仓库，收录面向 Google 产品与技术的技能，包括 Google Cloud、AI/ML、基础设施、数据库与分析、开发者工具、管理工具、安全与身份、Web/应用托管、广告、分析等。README 提供 skills.sh 安装命令，也支持作为 Claude Code、Codex、Antigravity CLI 的插件市场安装。技能列表以链接形式指向具体 skill 目录。与做法 A、L 的关系：它同样是装一个现成技能包做对照的来源；区别是它按 Google 产品与技术分类，且通过 skills.sh 安装，与已有 Agent Skills 实践直接相关。

1. 前提检查。本机有 Node.js/npx，网络可访问 GitHub 和 skills.sh；使用 Google Cloud 相关技能需要相应的 Google Cloud 账号、项目和权限。插件安装需已安装对应 agent harness。

2. 选一个与当前任务最接近的技能。从 README 的 Available Skills 列表按类别查找，例如 gcloud CLI Skill for AI Agents、BigQuery Optimization Workflow、GKE 故障排查、IAM 策略管理等。先选一个与当前任务最接近的技能，不要一次安装全部。

3. 安装（按你的 harness 选一条，命令原文照抄）。

   通用 skills.sh：

   ```bash
   npx skills add google/skills
   ```

   从 npx install 命令中可选择本仓库中的具体 skills 安装。

   Claude Code：

   ```bash
   claude plugin marketplace add google/skills
   claude plugin install <plugin>@google-plugins
   ```

   将 `<plugin>` 替换为要安装的插件名。

   Codex：

   ```bash
   codex plugin marketplace add google/skills
   ```

   然后在 Codex 中从 `/plugins` 浏览器安装。

   Antigravity CLI：

   ```bash
   agy plugin install https://github.com/google/skills/<plugin-path>
   ```

   将 `<plugin-path>` 替换为具体插件路径。

   预期：只装一个 Google 相关技能，而不是整个仓库。

4. 使用前确认前提和权限。README 只给出列表和链接，具体每个技能需要哪些信息、工具、权限和配置，需要进入对应 skill 目录查看；Google Cloud 技能通常依赖账号、项目、认证和 IAM 权限。预期：你清楚这个技能会用到哪些权限、是否可能计费。

5. 在隔离环境或测试项目中跑一个具体任务。例如 BigQuery 优化或 gcloud CLI 任务。记录是否减少查文档或手写命令的时间、命令/配置正确率、需要人工纠正次数、权限申请次数。预期：拿到可对照的结果；不要在正式环境直接试高权限技能。

6. 套用做法 A 的对照法：同一任务、同一输入，无技能和有技能各跑 3 次，或至少 5 个同类任务/一周。记录任务完成时间、一次性通过率、人工干预次数、错误率、权限范围是否收敛。预期：你能说清技能是否减少了返工；说不清就不要保留。

### 做法 T：让 agent 检索中国金融市场数据，并核对来源与时间戳（可选，按 A 的对照法验证）

定位：`clawyi-com/china-market-data` 是一个面向中国市场的金融数据 Skill，让 Cursor、Claude Code、Codex 等 AI Agent 通过可运行的 Python CLI 获取 A 股行情、研报、资金、公告、打板、期权、期货、宏观等真实数据。它提供 15 层能力、87 个端点、34 个数据来源，除 iwencai 外全部免 API Key。数据直接取回本机并写入 JSON，不经过第三方中转服务。原文声明它不是投顾建议，也不是付费数据商 SDK。与做法 A 的关系：它同样是装一个现成技能包做对照；区别是领域特定、依赖本地 Python，且存在数据授权与接口稳定性限制。

1. 前提：Node.js 22.20+ / npm。安装 Skill（交互式全局安装，自动识别已安装的 Agent）：

   ```bash
   npx --yes skills@latest add clawyi-com/china-market-data -g
   ```

   指定宿主并跳过确认：

   ```bash
   npx --yes skills@latest add clawyi-com/china-market-data -g -y --agent cursor
   ```

   只查看仓库中可安装的技能：

   ```bash
   npx --yes skills@latest add clawyi-com/china-market-data --list
   ```

2. 前提：Python 3.9+。安装 Python 依赖。初始化脚本会在技能目录内创建 `.venv`、安装依赖并执行离线检查；全局安装的副本默认位于 `~/.agents/skills/china-market-data`。

   macOS / Linux：

   ```bash
   SKILL_DIR="$HOME/.agents/skills/china-market-data"
   python3 "$SKILL_DIR/tools/setup_env.py"
   ```

   Windows PowerShell：

   ```powershell
   $SkillDir = "$env:USERPROFILE\.agents\skills\china-market-data"
   py -3 "$SkillDir\tools\setup_env.py"
   ```

   注意：`npx skills update` 或重新安装会整体替换技能目录，目录内的 `.venv` 也会被删除；更新后需再运行一次 `setup_env.py`。

3. 可选：把虚拟环境放在技能目录外，避免更新技能时重建。之后一律用该解释器运行脚本：

   ```bash
   python3 <技能目录>/tools/setup_env.py --venv ~/.venvs/china-market-data
   ~/.venvs/china-market-data/bin/python <技能目录>/scripts/run.py --check
   ```

   Windows 对应为 `py -3 <技能目录>\tools\setup_env.py --venv $env:USERPROFILE\.venvs\china-market-data`，解释器位于其中的 `Scripts\python.exe`。结果文件写到当前目录，请在可写目录下运行，或用 `--output` 指定路径。

4. 装好后直接向 AI 助手提问。原文给出的示例问法包括：

   - “贵州茅台现在的价格、PE、PB、市值和换手率”
   - “拉宁德时代近一年前复权日 K 线”
   - “今天涨停池、连板梯队和炸板率怎么样”
   - “今天有哪些强势股，分别是什么题材”
   - “北向资金今天的分钟流向”“概念板块近 5 日主力资金流入排名”
   - “今天全市场龙虎榜净买入排名，以及某只股票的买卖席位”
   - “比亚迪最近的券商研报和机构一致预期 EPS”
   - “查某公司最新公告 PDF”“公司在互动易上怎么回应这个传闻”
   - “300ETF 期权 T 型报价、隐含波动率和希腊字母”
   - “螺纹钢主力连续日 K”“上期所持仓前 20 名”
   - “最新 LPR、FR007 和中债国债收益率曲线”
   - “本周新股申购”“可转债转股溢价率”
   - “把这些代码转成聚宽格式，并拉申万行业历史归属”

   只讨论概念或投资观点、不需要实际取数时，技能不会被加载。

5. 也可直接运行 CLI（在技能根目录运行；输出文件需使用新文件名）：

   ```bash
   # 实时行情：裸 000001 是平安银行；上证指数用 sh000001
   python3 scripts/tencent_quote.py sh000001 sz000001 510300 --output quotes.json

   # 当日强势股与来源给出的题材标签
   python3 scripts/run.py ths_hot_reason.py --output hot.json

   # 概念板块最近 5 日涨幅；与主力资金流排名不同
   python3 scripts/run.py eastmoney_signals.py board-quotes --board-type concept --period 5d --top-n 20 --output boards.json

   # 查看某个命令的参数
   python3 scripts/run.py eastmoney_signals.py board-quotes --help
   ```

   默认板块接口失败后，可显式尝试 `--source dataapi`。它仍属于东财，不是独立供应商，也不保证能绕开同源故障。大部分 CLI 将完整返回结构写入 JSON，终端只给预览；需要读取实际文件，不能把预览条数当成全部数据。

6. iwencai 入口需要用户自己的 `IWENCAI_API_KEY`，配置方法见 SKILL.md#prerequisites。不要把 Key、Cookie 或会话文件提交到仓库。

7. 开发者安装（需要修改代码或保留完整 Git 历史时）：

   ```bash
   git clone https://github.com/clawyi-com/china-market-data.git
   cd china-market-data
   python3 tools/setup_env.py
   ```

   手动复制或解压时，目标目录必须命名为 `china-market-data`，并保留 `SKILL.md`、`scripts/`、`references/`、`requirements.txt`、`LICENSE`、`NOTICE` 和 `UPSTREAM.md`；不能只复制一个 Markdown 文件。

8. 开发验证（离线，不请求实时行情）：

   ```bash
   python3 -m compileall -q scripts tools tests
   python3 -m unittest discover -s tests -v
   python3 tools/build_release.py
   npx --yes skills@latest add . --list
   ```

   这些检查不请求实时行情；离线测试通过不证明上游数据源此刻可用。

预期：你能说清数据获取成功率、输出是否携带报价来源、行情时间和抓取时间；说不清就不要保留。

### 做法 U：把移动端模拟器与真机画面接进 Codex 聊天，用日志和性能面板验收（可选，按 A 的对照法验证）

定位：Mobile Dev 是给 Codex 桌面版用的插件（callstackincubator/codex-mobile-dev-plugin），把 iOS 模拟器、Android 模拟器以及已连接的 iPhone/iPad/Android 真机的画面放到 Codex 聊天旁边，并让 Codex 通过 MCP 工具检查可访问性元素、控制 App、读取日志、录制性能。支持 Expo、React Native、SwiftUI 以及其他原生移动项目。插件自带设备面板、检查、日志和性能工具；App 的构建、安装、启动仍然由项目自己的工具链完成，这是一个明确的分工。

1. 确认前提（不满足则无法安装/运行）：

   - Codex desktop，运行在 Apple Silicon Mac 上；
   - 使用 Codex 自带的 Node runtime（来自其 workspace dependency cache），不需要插件构建或 `npm install`；
   - 仓库当前为 private，安装需要 GitHub 读权限且本机 Git 认证可用。

2. 安装预构建插件（在终端执行）：

   ```sh
   codex plugin marketplace add https://github.com/callstackincubator/codex-mobile-dev-plugin.git --ref release/latest
   codex plugin add mobile-dev@mobile-dev
   ```

   安装后新开一个 chat。

3. 更新已有安装：

   ```sh
   codex plugin marketplace upgrade mobile-dev
   ```

   更新后同样要新开一个 chat。

4. 按用到的平台准备工具（来自原文需求表）：

   - iOS 模拟器：Xcode 26 或更高，且已安装 simulator runtime。
   - 物理 iPhone/iPad：Xcode 27 或更高、已配对并开启 Developer Mode 的设备、USB 或 Wi-Fi 连接；屏幕镜像需要宿主支持 HEVC WebCodecs。
   - Android：Android SDK platform-tools 与 emulator，以及已授权的 USB/无线调试的 AVD 或真机；屏幕串流需要宿主支持 H.264 WebCodecs。
   - Metro 日志与 React Native 检查：需要一个已在本地运行的 Metro server，且 App 有兼容的 inspector target。
   - 物理 iOS 的 CPU/内存：iOS 17.4 或更高、运行 development-signed 且带 `get-task-allow` 的 App、已挂载 developer disk image、Xcode/LLDB 处于 detached 状态。
   - Display FPS：Android 12 或更高（需 FrameTimeline 支持），或运行 iOS 17.4+ 的物理 iOS 设备；iOS 模拟器不支持 Display FPS。

5. 启动：从 Codex 侧边栏打开 Mobile Dev，或直接让 Codex 在聊天旁边打开模拟器。在工具栏选设备——选中一个已停止的模拟器或 AVD 会自动启动它。用 iOS / Android 开关选择只显示某一端或两端并排显示。

6. 让 Codex 干活（原文给出的示例指令，可直接复制）：

   ```text
   Build and run my Expo app in the simulator beside this chat.
   Read the app logs and help me fix this error.
   Record CPU and memory for 30 seconds while I scroll checkout.
   Compare these two performance recordings.
   ```

7. 用面板做检查：打开 Logs 或 Performance 查看所选设备；用 Screenshot 把截图附到下一条消息；用 Select 标注某个元素或屏幕区域并留一条指令（在可用时会带上 React Native 组件与源码信息）。日志区可同时读 iOS unified logs、Android logcat 和 Metro console，可跟随前台 App、搜索过滤，并把一个错误及其堆栈发进聊天。注意物理 iOS 只支持点击和拖拽，键盘和硬件按键控制不可用。

8. 按需关闭遥测（插件会向 Sentry 上报插件错误、崩溃和聚合性能指标；App 日志、截图、输入内容、工具载荷、设备性能录制被排除）：在 MCP 启动环境里设置

   ```sh
   MOBILE_DEV_TELEMETRY=off
   ```

预期：你能说清哪一次日志或性能对比减少了你排查移动端问题的轮次；说不清就不要保留。

### 做法 V：用一行 curl 把单个 Markdown 技能装进 Claude Code，并验证它按 description 自动加载（可选，按 A 的对照法验证）

定位：agentic-dev-kit（仓库 `ARYANK-08/agentic-dev-kit`，37 stars）是一套面向 Claude Code 的 Markdown 技能集，目标是改善 SDLC 的各阶段——编码、架构、评审、测试、发布。每个技能是仓库 `skills/` 下的一个文件夹，文件夹里有一个 `SKILL.md`。装载位置决定作用范围：项目级放 `.claude/skills/<name>/SKILL.md`（随 git 共享给协作者），全局级放 `~/.claude/skills/<name>/SKILL.md`（对本人所有项目生效）。重启 Claude Code 后，技能在「请求与其 `description` 匹配」时自动加载。与做法 A、B 的关系：它是 A 里「装一个现成技能包做对照」的一个更小的安装来源——不装插件、不装仓库，只把单个 `SKILL.md` 拷到一个目录；装完必须按 B 的思路把这个文件读一遍，才谈得上是否值得沉淀成团队写法。

1. 项目级安装单个技能（不 clone 仓库）。前提：本机已安装 Claude Code；在项目根目录执行；能访问 raw.githubusercontent.com。预期：`explain` 的 `SKILL.md` 落到项目的 `.claude/skills/explain/` 下。

   ```bash
   mkdir -p .claude/skills/explain && curl -fsSL https://raw.githubusercontent.com/ARYANK-08/agentic-dev-kit/main/skills/explain/SKILL.md -o .claude/skills/explain/SKILL.md
   ```

2. 想让它对本人所有项目生效，把上一条命令里的 `.claude/skills/explain` 换成 `~/.claude/skills/explain`。预期：技能落到用户级目录，对所有项目可见。

3. 想装别的技能，把命令里的 `explain` 换成对应技能名。注意：README 的技能表当前只列出 `explain` 一个，换成别的名字多半会拿到 404。

4. 走 clone 路线时用 cp 复制。前提：已经拿到仓库目录。项目级：

   ```bash
   mkdir -p .claude/skills
   cp -r path/to/agentic-dev-kit/skills/<name> .claude/skills/
   ```

   全局级：

   ```bash
   cp -r path/to/agentic-dev-kit/skills/<name> ~/.claude/skills/
   ```

   预期：不依赖 raw.githubusercontent.com 也能装上，适合内网或需要钉住某个版本时用。

5. 重启 Claude Code。之后当你的请求与技能 `description` 匹配时，技能会被加载。预期：不显式点名技能，它也能在解释类请求里被触发。

6. 最小试用并区分两种失败。在一个小项目里提一个「解释这段代码」类型的请求，观察它是否自动加载；若没触发，再在请求里显式点名该技能——显式点名能触发而自动不能，说明是 `description` 没匹配上，不是没装成。

7. 推广前必做：打开安装下来的 `.claude/skills/explain/SKILL.md` 读实际提示词，判断它是否值得沉淀成本团队的写法。只有这一步有正面结果，才考虑按做法 B 把团队自己的流程（架构、评审、测试、发布）写成新的 `SKILL.md`，逐个装入并各用一个小任务验证。

8. 自建技能（README 给出的流程）：创建 `skills/<name>/SKILL.md`，frontmatter 中包含 `name` 和 `description` 两个字段，然后在技能表里加一行。注意：README 未给出 frontmatter 的完整示例格式。

预期：你能说清这个技能是被自动触发的还是被你点名触发的、它的产出是否符合 `description` 描述的形态；说不清就不要保留。

## 怎么判断变好了

最小试用方式：

- 同一任务、同一输入，有技能和无技能各跑 3 次；
- 至少覆盖 5 个同类任务，或持续一周；
- 换一个新会话，让不了解背景的人只凭 `description` 触发，检查可复现性；
- 文档类任务：挑一篇已有的中文文档，先建分支或备份，先只审不改，再改一版逐条 diff；
- 论文类任务：用一篇自己已读过、心里有底、含多张主图（或主表）的论文生成精读报告，逐项对照自己的理解；再对一篇只有摘要或片段可得的论文试一次，看它是否正确声明覆盖范围与暂定判断；
- mod 类任务：开一个 session，用 `claude --plugin-dir ./token-weather` 带插件跑几个回合，看它是否在回合结束时刷新；再把文件夹复制出去重装一次，确认能长期加载；
- 代理类任务（做法 H）：在一个已有小仓库上，一周内跑通一次「装技能 → 首次配置生成 `references/local-config.md` → 放好全局 memory-bank 提示词 → 强模型做一次代码扫描产出规则种子和 1~2 个模板测试 → 本地模型跑 1~2 个 spec 明确的小批次 → 用 `session_report.py` 监控、用 git status 和测试报告验收」的闭环，并至少往 decision-log 记一次纠正；
- 设计知识类（做法 I）：在单个真实前端项目上先 `uipro init --dry-run`，再按你的 agent 装一次；用一个页面跑 `--design-system --persist`，生成 `MASTER.md` 和 pages 覆盖文件，下一次建页时复用第 9 步的检索提示词，看它是否还反复重问同一套配色和字体；
- 出图类任务（做法 J）：用同一段描述提示词和同一段仓库提示词各跑一次，记录从 `validate --json` 到 `deliver --json` 成功之间按 `diagnostics[]` 修了几轮；把产出的 HTML 发给一个不了解这个系统的人，看他能否只靠图说清主路径；
- 出图类任务（做法 K）：拿自己的站点跑一次 `onboard diagram-design to https://yoursite.com`，检查 proposed diff 是否可接受、对比度不达标时提出的调整值是否合理；再跑一遍生成 → 导入，看产物能否在没装任何东西的机器上直接用浏览器打开，并逐项核对 fidelity receipt 里的字体是不是站点字体、有没有 fallback；
- 插件市场类（做法 L）：只选一个与当前工作直接相关的单元（一个插件或一个 skill），在一个真实小任务上跑一遍，保留装之前的同任务结果作为基线；用 `uv run plugin-eval score <skill> --depth quick` 和 `make validate` 做筛检；记录单次会话加载的 skill/agent 数量与上下文占用；
- 文档转技能类（做法 M）：拿一本你反复查阅、且已知道答案的书，或一份内部 `docs/` 目录（避开扫描件；若必须用，先 `ocrmypdf`），转换后用 10 个问题逐个提问：8 个你已知答案、1 个书中明确没有的（考幻觉）、1 个跨章节综合的；
- 目标书类（做法 N）：拿一个你原本打算自己盯着的多步任务，用 leader 生成任务书，检查七问是否全有答案；丢进目标模式跑一次，记录人工介入次数；完成后跑 `/neat` 看变更摘要是否合理；另拿一个不装技能的同量级任务做对照；
- Postgres 知识类（做法 O）：按 README 的 A/B 提示词，同一任务关闭 MCP 生成一份、打开生成一份，两份都落到文件，逐项对比；重复 3 次以上或换 2–3 个任务再下结论；
- 安全技能包类（做法 P）：在一个自建靶场或自有授权小资产上跑一次 `/hunt`，记录加载了哪些技能、攻击面排序是否合理、7-Question Gate 是否拦下了不该提交的发现；另拿不装技能时的同任务结果做基线。注意 README 没有改善幅度数据；
- 复杂分析类（做法 Q）：先只跑单阶段“建模分析”，把 `题目分析报告.md` 和 `术语表格.md` 与你当初的人工版本对比（这一步不跑代码、不出图，最便宜）；再挑一道小题跑完整三阶段，重点观察 `P1` 有没有在全量计算和正式出图之前真的拦下不可运行的方案；最后换一道小题复跑一次，看第二、第三次的返工量是否低于第一次；
- 工程技能集类（做法 R）：在一个真实仓库上先跑一次 `/setup-matt-pocock-skills`（定 issue tracker、triage 标签、文档目录），然后只从两个最高频入口开始——对一次真实改动先跑 `/grill-with-docs`，对一个小功能或 bug 跑 `/tdd`；记录人工介入次数与返工轮数，另拿同量级、不装技能的任务作对照；
- Google 技能类（做法 S）：在隔离环境或测试项目中，用 `npx skills add google/skills` 只选一个与当前工作最相关的技能（如 BigQuery 优化或 gcloud CLI）；若用 Claude Code，按插件方式只安装一个插件。执行一个具体任务，记录是否减少查文档或手写命令的时间、命令/配置正确率、需要人工纠正次数、权限申请次数；与未使用技能时做对照；若没有对照，至少记录使用前后同一类任务的耗时和返工次数。不要在正式环境直接试高权限技能；
- 金融数据类（做法 T）：在支持本地 Python 执行的 Agent（如 Claude Code 或 Cursor）中按第 1–2 步安装并初始化，然后直接问：“贵州茅台现在的价格、PE、PB、市值和换手率”，检查返回结果是否包含数据来源、行情时间、抓取时间，以及是否区分缺失值与 0。也可在技能根目录直接运行 `python3 scripts/tencent_quote.py sh000001 sz000001 510300 --output quotes.json`，然后查看 `quotes.json` 是否包含上述字段；
- 移动端调试类（做法 U）：在一台 Apple Silicon Mac 上装好 Xcode 26+ 与一个模拟器 runtime，确认能访问该私有仓库后执行安装命令，新开 chat，从侧边栏打开 Mobile Dev，选一个模拟器让它启动，然后让 Codex 执行 `Build and run my Expo app in the simulator beside this chat.`，再打开 Logs 确认能读到 iOS unified logs / Android logcat / Metro console。建议先拿一个 RN/Expo 或 SwiftUI 的小项目试，不要直接上主力项目；若拿不到仓库访问权或没有 Apple Silicon Mac，就跳过；
- Markdown 技能类（做法 V）：在一个小项目里按第 1 步装入 `explain`，重启 Claude Code，提一个「解释这段代码」类型的请求，观察技能是否按 `description` 自动加载；若没触发，再显式点名该技能，以区分「没匹配上」和「技能没装成」；然后打开 `.claude/skills/explain/SKILL.md` 读实际提示词，只有这一步有正面结果才考虑推广。

可观察的指标：

- 人工修改次数 / 返工轮数：有技能时是否下降。
- 首稿可用率：第一次输出即达到可交付标准的比例。
- 背景重述次数：每次任务是否还需要重新粘贴同样的规范与上下文。
- 输出一致性：多次运行结果在格式与关键字段上是否稳定。
- 单次任务耗时：从提出到可交付的总时长。
- 规则类返工次数：代码评审里关于风格、规范、命名的意见条数是否下降。
- 代理类任务（做法 H）：该批次测试是否通过、是否产出非空文件、git 是否有预期改动（不采信 agent 自述）；同一断言连续失败次数是否达到 3 次；需要你处理的决策点回报次数是否下降；第二、第三批次的返工量是否明显低于冷启动前的手动基线；decision-log 中稳定偏好条目是否增长。
- 设计知识类（做法 I）：交付前检查清单的 8 条是否在成稿里成立；跨会话复用 `MASTER.md` 之后，是否还需要反复重说同一套配色、字体和反模式。
- 出图类（做法 J）：交付是否原子替换；同一张图从首次验证到交付成功需要按 `diagnostics[]` 修的轮数；仓库图的节点是否带 `SRC n` 并能打开 Git 校验过的文件与行号范围；架构变更评审是否拿到机器收据，且没有被当成影响分析。
- 出图类（做法 K）：品牌 onboarding 之后，出图是否还需要你手动改配色和字体；fidelity receipt 里有没有 fallback、原因是什么；重绘已有的 draw.io 源文件后是否需要手工重排；产物是不是单个自包含 HTML。
- 插件市场类（做法 L）：同一任务的完成时间与返工次数（装前 / 装后各一次）；测试通过率、代码评审意见条数、lint 或安全扫描发现数；单次会话加载的组件数量与 token 或费用变化；同一提示重复 3–5 次的结果一致性。
- 文档转技能类（做法 M）：8 个已知答案题的命中数与引用章节是否对得上；书中明确没有的那题是否被明确回答“书里没有”，这一项应为 0 幻觉；用 `tools/discovery_tax.py` 或自行对比“整本塞上下文”与“按需加载章节”回答同一问题的 token 数；记录单次问答的耗时。
- 目标书类（做法 N）：任务书是否七问全有答案；长程执行中你需要中途纠偏的次数（越少越好）；验收时能否逐条贴出实际命令输出而不是口头结论；是否出现「指标达成，事一件没干」；`/neat` 提出的变更摘要你是否认可。
- Postgres 知识类（做法 O）：约束数量（NOT NULL / CHECK / 唯一约束 / 外键）；索引数量与类型；是否使用了与目标 PG 版本匹配的现代语法；人工 review 的返工次数与修改条数；DDL 应用后是否需要补加索引或补约束；对同一版本问题，答案是否与官方手册一致。
- 安全技能包类（做法 P）：7-Question Gate 是否在提交前拦下了不该提交的发现；技能是否按主题自动加载、加载得对不对；攻击面排序是否合理；evidence-hygiene 是否把截图里的 cookie 与 PII 脱掉；README 没有时间节省、误报率、有效率的前后对比，这些要自己记录。
- 复杂分析类（做法 Q）：五个门禁的通过 / 失败记录（`M1`、`P1`、`P2`、`W1`、`W2`）；门禁拦截率——`P1`/`W1` 提前拦下的问题数 ÷ 总返工问题数；`results/复现清单.json` 是否齐全；LaTeX 侧是否做到资源—源码—产物哈希绑定；回归测试套件是否通过；换到非建模任务后，目录契约与只读质检这两个机制是否仍然成立。
- 工程技能集类（做法 R）：`/grill-with-docs` 之后 `GLOSSARY.md` 与 ADR 是否真的被内联更新、术语是否在后续命名中一致；`/tdd` 是否按红-绿-重构一次一个垂直切片推进；`/diagnosing-bugs` 是否真的先建出能对当前 bug 变红的反馈回路再动手改；`/to-spec` 是否在写规格前先问你会动哪些模块；`/code-review` 的两个轴是否分开跑、有没有互相污染；`/improve-codebase-architecture` 每隔几天跑一次后，候选清单是否还有真东西。注意这些都是从原文职责描述推出的可观察项，原文没有给指标定义、基线或对照数据。
- Google 技能类（做法 S）：任务完成时间、一次性通过率、人工干预次数、错误率、权限范围是否收敛；是否减少查文档或手写命令的时间、命令/配置正确率、需要人工纠正次数、权限申请次数。
- 金融数据类（做法 T）：数据获取成功率（能成功返回 JSON 而非报错）；输出是否携带报价来源、行情时间和抓取时间；失败时是否明确报错而非返回空数据；更新技能后按提示重新初始化能否恢复正常；对同一标的，与官方来源（如交易所或腾讯财经页面）抽样比对关键字段是否一致（原文未提供自动比对工具，需人工核对）。
- 移动端调试类（做法 U）：从“描述问题”到“Codex 指到具体元素或堆栈”的耗时；从提出修错请求到拿到可用修复的轮次/耗时；在模拟器、IDE 与终端之间切换的次数；用 Performance 面板记录的 CPU、内存、Display FPS、Android jank 统计在改动前后的对比——录制场景和时长保持一致（例如固定“滚动 checkout 30 秒”），并用“比较两次录制”复核；插件自身的稳定性（崩溃/报错频率，可用遥测或直接观察）。
- Markdown 技能类（做法 V）：是否被自动触发（不显式调用也能加载），触发率低就是 `description` 写法需要调整；产出是否符合描述中的形态（简化英语、ELI13 语气、图示、HTML 页面）；同类请求重复多次是否稳定，而不是碰运气；相比不用技能时，你自己写的提示词长度是否明显缩短。
- 文档审稿：它列出的问题里你认可并采纳的比例；修改后的事实密度；AI 腔清单类别是否还有残留；让没参与写作的同事只读成稿，能否说出「读完能做成什么事」。
- 论文精读：每张主图是否都被讲到、图注是否被引用、有无遗漏面板；是否区分独立个体数与细胞 / 切片数、观察与因果、作者解释与新增假设；是否列出「已读与未获取材料」；第⑥节是否给出可迁移环节与待验证设计；人工精读耗时 vs 生成加核对的耗时。
- 工作流形态的产物是否稳定出现：例如 deep-research 是否每次都在 `.research/<name>/` 下留出 `prompts/`、`child_outputs/`、`logs/`、`raw/`、`final_report.md`。
- 交接是否可用：一次 `/handoff` 之后，新会话不靠你再口述背景就能继续推进。
- mod 是否让你看见或拦下原本要靠运气的事：上下文占用是否在压缩前就被看到、危险命令是否在会话里被拦下、改动回放是否能替代事后翻日志。这类指标比“装上了”更接近效果，但教程本身没有对照数据。

反向指标：

- 如果加了技能后仍然每次都要口头纠正同一件事，说明 `description` 或正文指令没写到位，应先改 `SKILL.md`，而不是继续加提示。
- 如果文档改完只是删了空话、却没有补上事实，信息量反而下降，说明它没有拿到项目事实，先把代码、配置和真实报错给它读。
- 如果论文报告把未实际执行的代码和数据标成已复现，或漏掉主图面板，停止用在这类论文上。
- 如果 mod 每次改完都丢掉历史、或升级 Claude Code 后 mod 直接不加载，说明你在跟会变的 API 较劲，先按当前版本写出的类型声明对齐，再决定是否继续。
- 如果 agent 只凭自己的声明就宣布完成，而 git status 和测试报告不支持，回到做法 H 第 8 步的证据优先原则，把这一批次的结论作废重跑。
- 如果某个本地批次同一断言连续失败 3 次还在本地重试，判定为模板/规则缺口，把那一批次升级到强模型。
- 如果装了 UI/UX 技能后，`uipro init --dry-run` 显示它要往一堆你不用的 agent 目录里写文件，或者你仍然每次口头重说同一套界面规范，先缩小到单个 agent 目录再用。
- 如果出图技能每次失败都要你盲重试，而不是按 `diagnostics[].supportedFixes` 修，说明没用上它的收据机制。
- 如果装着 diagram-design 却仍然每次手动改配色和字体，说明你没做那 60 秒的品牌 onboarding，先跑一次再判断要不要留。
- 如果你要的是通用绘图编辑器或 Mermaid 主题，先换工具，不要在这个技能上继续加提示。
- 如果 plugin-eval 的分数不错但真实任务没有改善，说明你把筛子当成了结论；回到同一任务的前后对照。
- 如果 book-to-skill 生成的技能被问到书中没有的内容时开始编造，先停用，不要推广。
- 如果任务书七个问题里有任何一条没答案，别丢进目标模式跑长程，先补任务书。
- 如果磁盘清理类技能给出的删除建议你无法在点确认前看懂「删了会怎样」，不要点。
- 如果装了插件市场的内容后与团队既有约定冲突、返工反而增加，退回只用 skill 层，不引入 agent / command / hook。
- 如果 pg-aiguide 的 A/B 结果只有一次正向、换任务就消失，说明你把一次演示当成了稳定收益，先重复 3 次以上再判断。
- 如果团队不允许把 schema 信息发往第三方端点，就改用本地自建或不要开启公共 MCP。
- 如果在未授权目标上使用 Claude-BugHunter，或把它改写成“防御性”措辞去绕分类器，立即停用。
- 如果装了 Claude-BugHunter 的插件方式却发现 `/hunt` 脚手架缺失，别以为是没装好——脚手架只在 clone 路径里。
- 如果发现 Opus 5 在高风险安全请求上“变差”，先确认是不是回落到了 Opus 4.8，而不是直接换工具。
- 如果门禁返回 `FAIL` 后主 Agent 直接把失败结论改掉、或者五个门禁一次也没拦下过东西，说明这套骨架在你这里只是装饰，先只留目录契约和 `P1` 一个门禁再试。
- 如果生成的论文要直接提交、而你没有按目标竞赛当届官方规则和模板核对过，停手——技能的产物明确“仅供参考”。
- 如果装了工程技能集之后 agent 仍然先动手再问，说明你没在改动前跑 `/grill-me` 或 `/grill-with-docs`，先改用法再判断要不要留（做法 R）。
- 如果两条安装路径都装了、每个技能出现两份，先卸掉一条——原文明确说只选一条（做法 R）。
- 如果 `/improve-codebase-architecture` 的候选清单被当成改造方案直接执行，停一下：原文说它是勘察不是抢救（做法 R）。
- 如果一周内没有任何一项指标变化，或安装的插件与仓库实际规范冲突导致返工增加，就回到“只借鉴组织方式、不装具体内容”的用法。
- 如果 google/skills 的技能在测试项目里没有减少查文档或手写命令的时间，或权限申请次数反而增加，先只保留那一个技能，不要扩大到其他 Google 技能（做法 S）。
- 如果 china-market-data 更新技能后 `.venv` 被删、脚本跑不起来，先按提示重新运行 `setup_env.py`，或改用技能目录外的虚拟环境（做法 T）。
- 如果默认板块接口失败，显式 `--source dataapi` 仍失败，不要把它当成独立备用源；它仍属于东财（做法 T）。
- 如果只看到终端预览条数就当成全部数据，回到技能根目录读完整 JSON 文件（做法 T）。
- 如果 Mobile Dev 装不上，先确认是不是 Apple Silicon Mac + Codex desktop、以及有没有该私有仓库的 GitHub 读权限（做法 U）。
- 如果物理 iOS 上发现键盘和硬件按键控制不可用，不要当成 bug；原文明确只支持点击和拖拽（做法 U）。
- 如果 iOS 模拟器上看不到 Display FPS，不要继续调；原文说不支持（做法 U）。
- 如果装了 `explain` 之后每次都要显式点名才触发，先改 `description` 或改用法，不要急着把它推广成团队规范（做法 V）。
- 如果除 README 之外看不到任何 `SKILL.md` 正文，就不要把「参考其提示与上下文组织方式」当成已经拿到的收益——先打开装下来的文件读完再判断（做法 V）。
- 如果 `curl` 安装拿不到文件（例如内网不能访问 raw.githubusercontent.com），先改用 clone + cp 的第 4 步，不要怀疑是技能本身有问题（做法 V）。

注意：`doctor`、`validate`、`npm test`、`claude plugin validate`、`npx @anthropics/skills-ref validate`、`archify doctor`、`validate --json`、`copilot skill list`、`python -m unittest discover -s tests` 这类检查只能证明“技能或 mod 装得上、格式合法、不带危险命令、图能通过校验、技能被宿主发现、回归测试能过”，不能证明“产出更好”。效果必须自己对照。

## 常见坑

- 整体 adopt：一次装多个技能包，导致上下文过载或规则冲突。AAS 提到 Antigravity 会因监控的 skill 目录过载上下文，需要选择性激活；feiskyer/claude-code-settings 的 FAQ 也建议精选技能，不要全装。做法 H、I、J、K、L、N、Q、R、S、T、U、V 同理，先只装一个。
- 一次装整个插件市场：94 个插件、202 个 agent、184 个 skill 是目录规模，不是使用建议；一次只装一个插件或一个 skill，能走 `gh skill install` / `npx skills add` 的 skills-only 路径就别走全量。
- 一次安装 google/skills 全部技能（做法 S）：README 只给列表和链接，没有效果数据；先只选一个与当前任务最接近的技能。
- 不进入具体 skill 目录确认权限和配置（做法 S）：README 只给列表和链接，具体每个技能需要哪些信息、工具、权限和配置要自己看。
- 在正式环境试高权限技能（做法 S）：Google Cloud 技能依赖账号、项目、认证和 IAM 权限，可能计费；先在隔离环境或测试项目试。
- 把 20653 stars 当质量证据（做法 S）：star 数只说明关注度，不说明产出改善。
- 期待 README 给出每个技能的完整步骤和效果数据（做法 S）：它没有；需要进入对应 skill 目录查看。
- 重复安装：在同一个项目里同时用项目级安装和 Claude Code 插件市场装同一个技能包，skills 会出现两份。
- 两条安装路径都装（做法 R）：原文明确说 `claude plugins install mattpocock-skills` 和 `npx skills@latest add mattpocock/skills` 两个都装会让每个技能出现两份；只选一条。
- 安装时没勾 `setup-matt-pocock-skills`（做法 R）：原文特意强调它必须被选中，否则后面没有统一的配置落点。
- 跳过仓库级一次性配置（做法 R）：`/setup-matt-pocock-skills` 要在用其他工程类技能**之前**跑，每个仓库跑一次；跳过它，`/triage` 没有标签、`/to-spec` 没有 tracker 可写。
- 把用户调用型和模型调用型混着用（做法 R）：用户调用型不能调用另一个用户调用型，只有用户调用型能调用模型调用型；搞反了编排链会断。
- 想用 `/improve-codebase-architecture` 解泥球（做法 R）：原文明确它是勘察不是抢救，在老代码库上能找到真候选，但不会替你解开泥球。
- 把 `/to-spec` 当成新一轮访谈（做法 R）：它不再访谈，只是把你说过的东西综合成规格；要问清楚应该在更早的 `/grill-*` 阶段。
- 手拷 hooks：把仓库里的 `hooks/hooks.json` 直接拷进 `~/.claude/settings.json` 或 `~/.claude/hooks/hooks.json`，会导致重复执行和跨平台 hook 冲突；hooks 必须用安装器写。
- 在用户主目录安装：项目级安装应在具体项目目录执行；v1.2.1 起 superpowers-zh 会拒绝在主目录安装，老版本会把 skills 写进 home 目录，污染所有项目。
- 只信 README：很多技能包的 README 没有贴出 `SKILL.md` 正文，质量无法核验；只有安装命令和自述，没有效果数据。feiskyer/claude-code-settings、zh-tech-writing、biomedical-paper-reader、cline-pilot、ui-ux-pro-max、archify、diagram-design、wshobson/agents、book-to-skill、khazix-skills、pg-aiguide、Claude-BugHunter、math-modeling-skill、mattpocock/skills、google/skills、china-market-data、Mobile Dev、agentic-dev-kit 都存在这个局限。
- 把 README 当完整流程：book-to-skill 的 Steps 0–10、analyze-only / generate-from-analysis / update / fold-in 的具体用法都在未提供的 `docs/` 里；khazix-skills 的六个 `SKILL.md` 正文也没给；wshobson/agents 没有单个插件的质量数据；Claude-BugHunter 的 6 阶段流程在 README 里列了 5 个名字却称 6 阶段，要对照仓库内 `docs/architecture.md`；pg-aiguide 是否支持本地自建只在未提供的 `DEVELOPMENT.md` 里提到；math-modeling-skill 的角色规范与门禁判定标准也无法从 README 核验；google/skills 未展示任何具体 skill 的完整步骤、提示词、配置样例；china-market-data 的 Windows 命令未经过完整平台实测；Mobile Dev 的 README 只覆盖单机开发者视角，未提及团队权限、CI 或多人协作；agentic-dev-kit 的技能表当前只有一个 `explain`，且未展示任何一个 `SKILL.md` 的实际内容。用前先打开仓库确认。
- 忽略安全：安装任何第三方技能前先通读它的 `SKILL.md`，并跑自己运行时的 doctor/audit 工具。`genspark-claw validate` 会标记 `curl | bash`、base64 载荷和破坏性命令。mod 的风险面更大：它以与 Claude Code 同等权限在本机运行，且能改写或拒绝命令，安装前必须确认来源可信。cline-pilot 以代理身份驱动 Cline 跑任务，安装前同样先读它自己的说明。Mobile Dev 会向 Sentry 上报插件错误、崩溃和聚合性能指标；App 日志、截图、输入内容、工具载荷、设备性能录制被排除；不想要就设 `MOBILE_DEV_TELEMETRY=off`。
- 规则全量加载：rules 是始终加载的上下文，从 `rules/common` 加一个你实际使用的语言/框架包开始，不要全抄。
- 技能描述没写清：`description` 只写“做什么”没写“什么时候用”，技能就不会在合适时机触发。
- 配置模板照抄不动：作者模板默认指向 copilot-gateway（`http://localhost:4141`），模型名写的是 `claude-sonnet-5` 等；不按自己网关实际提供的模型替换，端点或模型对不上就用不起来。
- 以为 settings.json 靠 Plugin 装：`settings.json` 不通过 Plugin 配置，必须手动设置，仓库根目录的只是作者模板。
- 技能没有自动触发：先按五条排查——路径必须是 `~/.claude/skills/<name>/SKILL.md`（注意大小写）；Plugin 安装的技能需重启会话；检查双层嵌套 `skills/name/name/SKILL.md` 并上移一层；直接问 `What skills do you have access to?`；`disable-model-invocation: true` 的技能（如 grill-me、handoff）不自动触发，要用 `/skill-name` 手动调用。
- 依赖具体工具：Agent Skills 要在支持它的工具上才能自动加载，不支持的工具上用不了；装技能的目录也随客户端变化（例如论文精读给了 `~/.codex/skills/` 的路径，cline-pilot 给了 `~/.hermes/skills/`、`~/.cline/skills/` 等，diagram-design 在 Kiro 会给 `.kiro/skills/`、在 OpenCode 要用 `.opencode/skills/`，book-to-skill 在 Hermes 还要按类别落到 `skills/<category>/`，math-modeling-skill 的加载方式要按各宿主当前文档来，china-market-data 全局安装默认落在 `~/.agents/skills/china-market-data`，agentic-dev-kit 只区分项目级 `.claude/skills/` 与全局级 `~/.claude/skills/`）。
- 没装 autocorrect：第 5 步的格式修正会被跳过，空格与标点只能人工处理；另外材料里只提到 `autocorrect --fix` 这一个子命令，其他子命令是否存在要查该工具文档后再用。
- 没说清只审不改：想只要意见时必须明说「只列问题，不要改」，否则它会直接动文件。
- 删空话不补事实：审稿后逐条 diff，看它是否把形容词换成了数字、命令或报错原文。按 `zh-tech-writing` 的 README 说法，缺事实时它应该反问，检查它是否真的问了。
- 论文精读的取材误判：不要因附件缺失就断言作者未做验证；补充材料默认只用本地已有文件，不自动联网下载，缺附件时报告里要说明哪些判断未核查。
- 文本处理反复换工具：可读的 PDF 提取结果直接复用，不要求先生成 Markdown 底稿；原 PDF 留作数字与图像核查，只有提取质量确实影响解读时才换方式。
- 看图只看概览：每张主图先概览，必要面板要放大；报告不区分「概览」和「具体核查范围」，验收时无法判断核查到哪一层。
- 盲目开 `bypassPermissions`：它能让你完全跳过确认，但 README 明确提示要先了解安全风险；更稳的做法是先在 `permissions.allow` 里配允许列表。
- 在非官方 API 环境找不到网页搜索：WebSearch 只限官方 API 环境，其它环境要用 MCP 补；README 只给了四个 MCP 的链接，没有安装步骤。
- 用 `npx skills add` 装到的版本可能滞后于仓库最新，挑技能时注意这一点。
- 拿 star 数当质量证据：`zh-tech-writing` 的 312 stars、`biomedical-paper-reader` 的 31 stars、cline-pilot 的 91 stars、wshobson/agents 的 40,149、book-to-skill 的 33,277、khazix-skills 的 21,099、pg-aiguide 的 1853、math-modeling-skill 的 1848、google/skills 的 20,653、Mobile Dev 的 64、agentic-dev-kit 的 37 都只说明关注度，不说明产出改善幅度。
- 跳过冷启动门禁：做法 H 要求在任何 memory bank 启用之前，先把 `assets/global-memory-bank-prompt.md` 提示词逐字放到位；跳过这步，后面的规则种子没有统一落点。
- 把项目架构知识塞进技能包：cline-pilot 明确不持有项目架构知识，那属于项目自己的 memory bank + clinerules；指望技能包记住架构事实，会得到互相矛盾的建议。
- 采信 agent 的自我报告：做法 H 的原则是证据优先于自我报告，完成必须由 git status、测试报告数字、非空产物证明。只看到「已完成」三个字就收工，等于放弃验收。
- 在本地模型上死磕同一断言：同一断言连续失败 3 次就是模板/规则的缺口信号，应把那一批次升级回强模型，并记录这次升级是否解决问题。
- 把 `references/local-config.md` 提交进仓库：它是私有文件、被 git 忽略，里面写的是你的 conda/python 环境名、PATH 方式和分支命名。
- 照抄没解释的参数：`python3 scripts/session_report.py 15 /path/to/repo` 里的 `15`（以及自检里的 `5`）含义原文未说明，直接用前先确认。
- 让 agent 自己装 ui-ux-pro-max 的 CLI：README 明确说安装步骤是给人做的，agent 不应自行在用户机器上安装软件，应向你提问。
- 用错了包名：CLI 的包名是 `ui-ux-pro-max-cli`，命令名是 `uipro`；旧的 `uipro-cli` 已过期，别装错。
- 不 dry-run 直接 init：`uipro init` 会往 agent 技能目录写文件，先跑 `uipro init --dry-run` 看清落点，避免污染仓库或一次写进多个不用的目录。
- 搞反 MASTER 与页面文件的优先关系：页面文件存在时它的规则覆盖 Master，不存在时才只用 Master；写反了会让页面级偏离失效。
- 把界面规范一次性铺到全项目：先用一个页面跑 `--design-system --persist`，确认检索结果真的改变了你的决策，再考虑推广。
- mod 的模块变量会被 hot reload 清空：`register` 会重跑、`session.start` 会再次触发，模块级数组每次都重置；历史必须放 `$.state`。
- state 没在类型契约里声明：`plugin.json` 不写 `"types"` 或 `types/index.d.ts` 不声明 `PluginState`，`claude plugin validate` 会直接报错，先别继续装。
- 把教程当稳定 API：mods API 会随版本变化，教程照做能跑通，但每次加载时写进 `.claude-plugin/types/` 的类型声明才是你这个版本的权威依据，升级后要重新核对。
- 只装在临时目录：让 Claude 自己写的 mod 只在当前会话加载、目录之后会被清理，要长期用必须把文件夹复制出去按普通插件安装。
- 一个 mod 塞多个模块入口：`hooks/hooks.json` 的 `modules` 只指一个模块，多写不会变成多个 mod。
- 出图失败就盲重试：`validate --json` / `deliver --json` 的失败输出是一个 JSON 对象，正确做法是只应用 `diagnostics[]` 中各 subject 的 `supportedFixes`，而且限制在两轮修正之内；视觉审查是另一件事，不要混在一起。
- 把 `compare` 当成影响分析：Architecture Delta 只给 Before / Delta / After 的机器收据，README 明确它不推断影响、风险或可合并性；要判断风险得另外做。
- 以为 `meta.locale` 会翻译你写的内容：它只本地化页面标题、Legend、状态/错误、a11y 和 HTML/SVG 的 `lang`；非内置语言（如 `es`）要提供 `meta.translations`，否则渲染器回退英文并披露这一事实。
- 以为看图的同事也要装 Archify：产物是单个自包含 HTML，浏览器直接打开即可；但外链和地图链接需要联网。
- 架构图用 `deployment-ownership` profile 却缺 authored 字段：owner、区域位置、私有数据库范围、具名跨界项缺任一项就 fail closed，不会隐式补全，也不检查真实基础设施。
- 忽略出图技能的更新检查联网：它可能 GET 固定的 stable manifest 以显示可选更新提醒（自己不下载也不安装），成功后约 24 小时再查，失败后 6 / 24 小时重试；不想联网就设 `ARCHIFY_UPDATE_CHECK_DISABLED=1`。
- 在 DSH 集成里用 Web Produced Files：DSH 集成要求 shell 文件使用精确的工作区路径。
- 装完 diagram-design 就当会自动更新：Claude Code 对第三方 marketplace 默认关闭自动更新，要自己跑 `/plugin` → Marketplaces → 选中 diagram-design → Enable auto-update，提示时再 `/reload-plugins`。
- 以为托管安装和可编辑安装可以同时改风格指南：托管安装可能覆盖你对 `references/style-guide.md` 的直接修改；要长期改风格就走可编辑安装，并记住 `~/.diagram-design/profiles/` 和带 `.diagram-design` 标记的项目不受更新影响。
- 一次建齐所有宿主的软链目录：可编辑安装里的 `mkdir -p` 只建你用得到的根目录，全建只是多出一堆没人读的目录，还会让后续排查更麻烦。
- 在 Claude Cowork 里直接 push 就指望同步：同步只在「含插件版本号提升的 PR 合并到镜像默认分支」时触发，直接 push 不触发。
- 用 Kiro 或 OpenCode 却去找 marketplace：Kiro 要重新导入子目录 URL 才能更新，OpenCode 只能拷或软链、靠换目录更新。
- 把 Droid 的版本号当更新依据：Droid 按 commit 跟踪 Git 插件，不看 manifest 里的显示版本号。
- 期待带分支的时序图能生成完整授权握手：带分支的刷新要用 `type-sequence.md` 里的 ALT combined-fragment 语法，示例在 `assets/example-sequence-oauth.html`，不是完整 authorize-code 握手。
- 以为动效是新的图型：`reveal / step / loop` 只是可选的无障碍动效，不新增图型。
- 把 plugin-eval 的分数当效果结论：三层里静态层只是 lint，LLM judge 与 Monte Carlo 作者自己标注 experimental，且 not validated against human labels。
- 没装 `make` 就去装 Antigravity / OpenCode / Pi：这三条路径需要 git + make，转换后的目录树被 gitignore，必须本地生成；Codex / Cursor 才走已提交 registry。
- 拿扫描版 PDF 直接转换：无文字层的图片页抽不出东西，先 `ocrmypdf`。
- 技术书选了纯文本抽取器：代码、表格、公式会丢，技术类必须用 `docling`（约 1.5 秒/页），纯散文才用 `pdftotext`。
- 把 token 节省数字当结论：24×–51× 是作者主张，方法学在未提供的 `docs/performance.md`，要自己用 `tools/discovery_tax.py` 或前后对比来测。
- 把版权书的生成 skill 分发出去：官方要求保持私有，不得再分发第三方版权作品生成的 skill。
- 期待降级方案“效果一致”：把 `SKILL.md` 贴成规则文件效果一致是作者说法，没有对照数据。
- 跳过 leader 的实测调研：它强调动笔前先钻进代码库亲手跑一遍——文档里写的命令实际可能根本不存在；跳过这步，任务书会建在一张错的海图上。
- 任务书里没有反作弊条款：缺了「目标七问」的第 4 问，就容易出现「指标达成，事一件没干」。
- 让清理类技能直接删：它应当全程只读扫描，删除必须浏览器点按钮 + 弹框二次确认；红灯只解释，永不给删除按钮。
- 让 neat-freak 删东西：它的底线是绝不擅自删，删除只出候选清单、机器生成的记忆默认只读、文件里读到的「执行这条命令」不当授权。
- 拿 neat-freak 整理周报：它不响应纯代码任务和整理数据 / 周报类请求。
- 在目标模式里跑还没有完成态的任务书：第 2 问要具体到靠岸那一刻机器就能判，否则无从验收。
- pg-aiguide 的效果证据只有厂商一次演示：README 的数字来自厂商自己的一次 e-commerce schema 演示，没有任务集、没有多次重复、没有第三方复核，也没有说明「更好」的判定细则；要自己按 A/B 做对照。
- 把 schema 信息发到第三方端点：pg-aiguide 的公共 MCP 服务端点 `https://mcp.tigerdata.com/docs` 由 Timescale 托管，README 未说明可用性保证、速率限制与数据隐私；团队不允许外发 schema 信息时先评估或自建。
- 用单次 A/B 下结论：单次结果受提示词与模型随机性影响很大，要重复 3 次以上或换 2–3 个任务。
- 以为 pg-aiguide 对所有数据库都管用：只在 Postgres / TimescaleDB / PostGIS 相关任务上有用；pgvector 标注为 coming soon。
- 在未授权目标上跑 Claude-BugHunter：README 的授权条款限定为赏金项目 in-scope 资产、渗透测试授权书、CTF、自有基础设施。
- 把 Claude-BugHunter 的插件安装当成完整安装：插件路径不含 `hunt` engagement 脚手架，`cbh` CLI 也要单独 `pipx install`；要脚手架就走 clone 路径。
- 把 `/hunt` 的阶段数当准确描述：README 列了 5 个阶段名却称 6 阶段，使用前以仓库内 `docs/architecture.md` 为准。
- 把 README 的示例 transcript 当真实结果：作者自己标注为示意 transcript，非真实录制。
- 把未勾选的路线图项当现有能力：per-engagement memory、program-rules-parser、HackerOne MCP 都是 README 里未勾选的路线图项。
- 把 Opus 5 的回落当模型变差：高风险安全请求会回落到 Opus 4.8 而非拒绝，长 agentic 运行中会滚动过去；若只是不想要自动切换，可在 Settings → Capabilities 关掉。
- 为绕分类器改写措辞：不要把攻击性 engagement 改写成“防御性”措辞；授权工作按 README 指引申请 CVP。
- 攒到最后才质检：math-modeling-skill 明确“禁止等全流程结束后才首次质检”，`P1` 要在全量计算和正式出图之前跑，`W1` 要在长篇正文和双格式排版之前跑；把质检放到最后，门禁就白设了。
- 让主 Agent 覆盖门禁的 FAIL 结论：任一独立门禁返回 `FAIL` 时，必须由原阶段执行者按证据修正并重新派发复验；主 Agent 自行改掉失败结论，等于把门禁变成装饰。
- 门禁 FAIL 后从头重跑：正确做法是从被阻断阶段继续，不重复已通过的阶段；从头重跑既费时又会让已通过的结论失去一致性。
- 把 skill 根目录当可写工作区：`SKILL_ROOT` 是只读的，角色规范、算法资料、脚本、模板都从这里读；产物只能写 `PROJECT_ROOT`。要改模板就先复制一份到 `PROJECT_ROOT`。
- 把题目附件改掉：`data/` 下的题目附件保持只读，后面所有核对都依赖它的原始状态。
- 把领域流程当通用框架搬走：可迁移的只有三阶段切分、只读门禁、目录契约和复现清单这几条骨架；换个领域后，门禁要换成自己领域的检查点，直接照搬五个门禁不会成立。
- 把 math-modeling-skill 的论文直接提交：原文反复声明生成的论文仅供参考，论文结构与格式必须以目标竞赛当届官方规则和官方模板为准，流程本身不保证合规。
- 把作者设定的质量基线当硬要求：「CUMCM 默认约 15000 字词单位、约 20 页」「每道子问题最多使用两个独立模型体系」「至少 8 幅正式图」「三类各至少 3 张候选图」都是作者设定的基线，README 自己注明前一条是非官方要求，没有说明依据，按自己的任务调整。
- 拿作者主张当效果结论（做法 R）：共享语言减少啰嗦、让命名一致、让代码库更好导航、让 agent 少花 token 思考，以及红-绿-重构「结果代码好得多」、并行子 agent「互不污染」，都是作者主张；原文没有指标定义、基线或对照数据。
- 把材料当完整文档：本次调研在「与已有做法的关系」一节讲到 OpenCode 时被截断，Archify 在 OpenCode 上的支持细节没有给全；diagram-design 的调研在「重绘已有图（导入）」的 `import-drawio platform.drawio --size=slide-16x` 之后被截断，导出与后续步骤缺失；book-to-skill 的 docs 全部未包含在材料中；khazix-skills 的六个 `SKILL.md` 正文也没给；pg-aiguide 的 `DEVELOPMENT.md` 未读到；Claude-BugHunter 的 `SKILL.md`、`references/*` 与 `docs/architecture.md` 也未提供；math-modeling-skill 只到 README 一层，角色规范与门禁判定标准在 `SKILL.md`、`references/roles/*/SKILL.md`、`references/Subagent调度.md`、`tools/*/SKILL.md` 里；mattpocock/skills 同样只到 README 一层，各 `SKILL.md` 的实际提示词未提供；google/skills 只到 README 一层，未展示具体 skill 的完整步骤、提示词、配置样例；china-market-data 的 Windows 命令未经过完整平台实测；Mobile Dev 的 README 只覆盖单机开发者视角，未提及团队权限、CI 或多人协作；agentic-dev-kit 只到 README 一层，技能表只有一个 `explain`，任何 `SKILL.md` 的实际内容都未提供。都要用前自己打开仓库确认。
- 更新 china-market-data 后忘记重新初始化：`npx skills update` 或重新安装会整体替换技能目录，`.venv` 也被删除；更新后需再运行一次 `setup_env.py`（做法 T）。
- 把东财 `--source dataapi` 当独立备用源：它仍属于东财，不是独立供应商，也不保证绕开同源故障（做法 T）。
- 把终端预览条数当全部数据：大部分 CLI 将完整返回结构写入 JSON，终端只给预览；要读实际文件（做法 T）。
- 忽略明文 HTTP 与多 agent 并发：部分接口仍使用明文 HTTP；东财节流主要在单进程内生效，多 agent 并发不会自动获得跨进程全局限流（做法 T）。
- 把代码开源当数据开放授权：免费或免 Key 不等于可自由商用；本项目没有逐项取得再分发授权（做法 T）。
- 只讨论概念或投资观点时仍指望技能加载：不需要实际取数时，技能不会被加载（做法 T）。
- 把 Mobile Dev 当构建工具：插件的分工是设备面板、检查、日志、性能；App 的构建、安装、启动仍然由项目自己的工具链完成（做法 U）。
- 在非 Apple Silicon Mac 或非 Codex desktop 上硬装 Mobile Dev：前提不满足就装不上（做法 U）。
- 拿不到私有仓库访问权：仓库当前为 private，安装需要 GitHub 读权限且本机 Git 认证可用；外部用户可能根本装不上（做法 U）。
- 以为物理 iOS 支持键盘和硬件按键：原文明确只支持点击和拖拽（做法 U）。
- 以为 iOS 模拟器支持 Display FPS：不支持（做法 U）。
- 忽略物理 iOS 的 CPU/内存前置条件：需要 iOS 17.4+、development-signed 且带 `get-task-allow`、developer disk image 已挂载、Xcode/LLDB detached（做法 U）。
- 不想上报遥测但不动配置：插件会向 Sentry 上报插件错误、崩溃和聚合性能指标；不想要就设 `MOBILE_DEV_TELEMETRY=off`（做法 U）。
- 拿 README 的技能表当技能清单：agentic-dev-kit 的 README 标题声称改善 SDLC 的编码/架构/评审/测试/发布各阶段，但技能表里当前只有一个 `explain`，把命令里的技能名换成别的多半会 404（做法 V）。
- 把「装上了」当成「有效」：agentic-dev-kit 没有展示任何一个 `SKILL.md` 的实际内容，也没有效果数据、案例或对比；必须先读文件、再按 A 做对照（做法 V）。
- 内网或不能访问 raw.githubusercontent.com 时硬用一行 curl：改用 clone + cp 的第 4 步（做法 V）。
- 以为 README 写清了 frontmatter 格式：它只说 frontmatter 里要有 `name` 和 `description` 两个字段，没有给完整示例；技能命名冲突怎么解、`description` 怎么写才容易被匹配、适用的 Claude Code 版本也都没说明（做法 V）。

## 证据与来源

- “技能 = 文件夹 + `SKILL.md`，frontmatter 只需 `name` 和 `description`”来自 anthropics/skills 的官方 README 与模板；该仓库是 Anthropic 对 Claude 技能的官方实现，安装命令和模板可直接照抄，但 README 明确说技能“仅供演示与教育用途”，效果需自测。
- “先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查”来自 jnMetaCode/superpowers-zh 的 README；它给出了 `npx superpowers-zh` 和 Claude Code 插件市场的可复制命令，但没有 skill 正文和效果数据，实际改善需自己对照。
- “自我纠正记忆、`SessionStart` 自动加载、知识平面”来自 rohitg00/pro-workflow 的 README；给出了 `/learn-rule`、`/wrap-up`、`/wiki init` 等命令，但全文没有效果数据，且技能/命令数量在文档内自相矛盾，所以只建议先跑通三个动作。
- “先小范围试装，不要整体 adopt”来自 genspark-claw、ECC、AAS、awesome-copilot 等材料的共同结论；其中 genspark-claw 的 `doctor`/`validate` 能验证装得上、格式合法，ECC 和 AAS 的组件规模极大但均为作者自述，AAS 的 `stack validate` 只检查 manifest，不证明语义适配或运行安全。
- “做对照、看返工轮数和首稿可用率”来自 anthropics/skills 的验证建议和 awesome-copilot 的最小试用方式；这些是方法主张，不是经过对照实验的数据。
- “第三方技能有供应链风险，先审查”来自 genspark-claw 和 awesome-copilot 的 README 警告；awesome-copilot 明确要求安装任何 agent 前先检查它和它的文档。
- “多来源知识打包”来自 yusufkaraaslan/Skill_Seekers 的 README；给出了 `pip install skill-seekers`、`create`、`package`、`install-agent` 等命令，质量门禁 `--threshold` 可用，但缺少与人工基线的对照，多数效率数字为作者主张。
- feiskyer/claude-code-settings（MIT，约 1.6k stars）的安装命令、npx skills 选装方式、settings.json 模板、Copilot Gateway、VSCode 环境变量、`customApiKeyResponses`、`update-cc-plugins.sh`、四个 WebSearch MCP 与五条技能触发排查，均来自该仓库 README，步骤具体可复制；但技能效果全凭作者描述，且模板中的模型名需按自己网关实际提供情况替换，所以只建议按需选装 1–2 个技能做小范围试用。
- deep-research 的产出目录、handoff 的交接文档字段与脱敏行为、codex-skill 的触发词与“只呈现不自动改码”、github-review-pr 的 `file:line` 与原文引用要求，均来自 feiskyer/claude-code-settings 的 README 描述，属作者主张，没有对照实验数据。
- mod 路线的全部内容——mod 本质是 hook、以插件形式分发、加载一次常驻会话、可观察/改写/回答三种做法、版本要求 2.1.287+ 且 mods 默认开启、Claude Code 自身也有功能由 mod 实现（AGENTS.md 支持、`/diff` 面板）且源码在 `anthropics/claude-code` 的 `mods/` 下、`plugin.json` 与 `hooks.json` 内容、`AbovePrompt` 与 `$.ui.resolve`/`Box`/`Text`、`$.session.usage()` 的 `context.tokens`/`context.window`/`context.percent`、`$.state` 跨 hot reload 保留历史、`types/index.d.ts` 的 `PluginState` 声明、`claude --plugin-dir` 启动与保存即重载、`claude plugin validate` 的报错文本、以及“mods API 会随版本变化、mod 以与 Claude Code 同等权限运行、先 try 不要 adopt”——均来自调研《Getting started with Claude Code mods》。该教程步骤完整、命令可复制，但没有给出效果对照数据，属作者主张；且材料在完整模块的 `async function ta` 处被截断，`HISTORY`/`BARS`/`FORECAST` 之后的代码需打开原文确认，不要照抄半截模块。
- 中文技术文档路线的安装命令（`npx skills add leter/zh-tech-writing -g`、git clone + cp）、autocorrect 的三种安装方式与 `autocorrect -V` 验证、三个调用提示词示例、五步写作流程、四类核心规则要点、14 条 AI 腔清单的类别说明，以及一组前后对比文本，均来自 leter/zh-tech-writing 的 README。规则来源为阮一峰《中文技术文档的写作规范》（public domain），另参考华为《产品手册中文写作规范》、LeanCloud《文档风格指南》、《中文文案排版指北》、Google Developer Documentation Style Guide、GB/T 15835-2011；autocorrect 为 MIT 许可，项目自身为 MIT。作者对原规范做了三处调整：破折号统一为 `——`、省略号统一为 `……`；数字与中文之间统一定为加空格以与 autocorrect 一致；把“不使用非正式语言”放宽为“可口语化但不用网络流行语”。其中“效果”一节是单个作者挑选的示例，属主张不是评测结果；“skill 找不到事实时会删空话或直接问你”是对行为的描述，材料中无法验证。
- 论文精读路线的 clone 命令、SKILL.md 入口提示词与 `$biomedical-paper-reader` 调用方式、`~/.codex/skills/` 安装路径、补充材料只用本地文件、复用 PDF 提取结果、逐图先概览后放大、七段报告骨架、判定纪律与交付形式，均来自 Gaoyuan-0423/biomedical-paper-reader 的 README（v0.1.2，MIT）。README 列出了 `SKILL.md`、`references/report-template.md`、`references/evidence-rules.md`、`references/study-checks.md`、`references/material-handling.md`、`agents/openai.yaml`、`evals/`、`examples/`、`CHANGELOG.md` 的文件组织，两篇真实试读论文入口（DOI `10.1186/s12943-026-02682-x`、`10.1038/s41588-026-02673-0`）和三份明确标注为虚构的短材料；仓库含 `evals/cases.md`、`evals/fixtures/` 与 `evals/RESULTS.md`，但验收结论的实际内容在本次材料中看不到。精读质量本身、判定规则是否稳定执行、“不依赖固定 MCP、第三方 skill、Python 库或付费服务”的依赖声明，均属作者主张。README 自述借鉴了 `nature-reader` 的原文定位/图文联读思想与 `paper-deep-note` 的来源覆盖声明思想，未复制其实现文件。
- “主 SKILL.md 放流程与规则、细则拆到 `references/` 按需加载、确定性格式修正交给外部 CLI”来自 leter/zh-tech-writing 的目录组织与写法，属可观察的仓库结构；“按需加载能减少上下文占用”是据此推断，材料没有对照数据。
- cline-pilot 路线的全部内容——安装命令（`npx skills add https://github.com/gongdear/cline-pilot`、四种宿主 skills 目录的 `mkdir -p` + `cp -r`）、首次配置写入私有的 `references/local-config.md`、`assets/global-memory-bank-prompt.md` 冷启动门禁、两条冷启动路径、两阶段模型策略（初始化用强的长上下文付费模型，稳态切本地小模型）、`qwen3.8:27b` 与「7 模块 Java 后端交付 50+ 测试类」、`python3 scripts/session_report.py 15 /path/to/repo` 监控、证据优先于自我报告、decision-log 与 ≥2 个一致样本的蒸馏阈值、push/删除/写 DB/花钱/改全局配置先问、`npx @anthropics/skills-ref validate .` 与 `python3 -m py_compile` 自检、渐进披露布局——均来自调研《gongdear/cline-pilot》。该仓库为 MIT，91 stars；README 称两阶段策略「在生产 Java 后端上验证过」，但这些验证数据均为作者自述，仓库内没有可核对的基准、对比数据或第三方复现记录。「固定四要素格式」的逐字格式、6 项验收清单的具体条目、冷启动门禁与两条路径的逐字内容都在 `SKILL.md` 与 `references/*` 中，本次材料只到 README 一层；`session_report.py` 的参数含义原文未说明。该项目与 Cline 强绑定，若不用 Cline CLI，主要只能借鉴其设计原则（确定性脚本优先、证据优先于自述、学习闭环）。
- ui-ux-pro-max 路线的全部内容——`npm install -g ui-ux-pro-max-cli`（旧的 `uipro-cli` 已过期）、`uipro init --dry-run` 与各 `--ai` 目标、`--global` 与插件市场两种装法、Trae 的 SOLO 模式与 Kiro/Copilot/Roo Code/KiloCode 的 slash command、自然语言调用示例、`scripts/search.py` 的 `--design-system`/`-f markdown`/`--domain`/`--stack` 参数与示例命令、Web 栈的版本意识规则、`--persist` 生成的 `design-system/<project>/MASTER.md` 与 `pages/*.md` 结构、第 9 步的检索提示词原文、8 条 PRE-DELIVERY CHECKLIST 原文、`uipro versions`/`update`/`uninstall`/`init --offline`——均来自调研《nextlevelbuilder/ui-ux-pro-max-skill》，即该仓库 README。其中的能力数字（192 条行业推理规则、79 种风格其中 50 种 active、192 套配色、74 组字体搭配、25 种图表类型、22 个技术栈指南、119 条 UX 指南）全部为作者自述，没有对照数据；演示素材被作者自己标注为非本 skill 产物；页面大量篇幅是付费版与自家产品推广。README 明确要求安装步骤由人执行、agent 应询问，以及脚本「只用标准库、不装依赖、不联网」，同样属作者声明。
- archify 路线的全部内容——`npx skills add tt-a1i/archify -g`、Cursor 的非交互安装、`npx skills use tt-a1i/archify@archify --agent codex` 先试用、两段提示词原文、五种图型与选型对照表、`node archify/bin/archify.mjs guide` 的两种调用、`doctor`/`demo`/`validate`/`preview`/`deliver` 命令链与 `--quality showcase`/`--json`/`--open`/`--no-open`、preview 的回环监听与失败保留 last-good、`compare architecture base.json head.json architecture-delta.html --json`、`meta.locale` 与 `meta.translations` 的本地化范围、查看侧快捷键与 `#focus=`/`#route=` 等稳定链接、`hermes skills install skills-sh/tt-a1i/archify/archify -y` 与 `dsh plugin --profile web add @tt-a1i/archify-dsh@0.1.0` 两个社区集成、更新检查的 24 小时 / 6 小时 / 24 小时节奏与 `ARCHIFY_UPDATE_CHECK_DISABLED=1`——均来自调研《tt-a1i/archify》，即该仓库 README（MIT，README 标注稳定版 `v3.0.1`）。它把 `validate --json` / `deliver --json` 的稳定规则码、精确 subject、实测证据与只含受支持修复手段的 `diagnostics[]`、两轮修正上限、原子替换交付、官方 Proof Lab 的 11 个已检入场景及其 JSON 源和验证收据写进了 README，是本手册里验收信号最具体的一条；但 star 数、Trending 排名、社区案例全部是创作者口径，缺独立验证，`preview` 与 `compare` 的持续产出能力、`deployment-ownership` profile 的 fail-closed 行为也只有 README 描述。本次调研在「与已有做法的关系」一节讲 OpenCode 时被截断，该部分内容不完整。
- diagram-design 路线的全部内容——支持的宿主列表、无构建步骤/无 JS/无外部图片依赖、三种静态变体、可选的 `reveal / step / loop` 无障碍动效、2.5.10 新增的十种版式语法与 README 展示的全部图型、可重绘 draw.io / Mermaid / Excalidraw、各宿主的安装与更新命令、Claude Code 第三方 marketplace 自动更新需手动打开、Claude Cowork 组织 marketplace 的镜像与「含版本号提升的 PR 合并才同步」规则、可编辑安装的 clone 与软链命令、`onboard diagram-design to https://yoursite.com` 的品牌 onboarding 流程与提取映射表、`ink` 在 `paper` 上的 WCAG AA 对比度校验、fidelity receipt 的字段、手工编辑 `references/style-guide.md` 的替代路径、首次使用拦截、命名 profile 与 `.diagram-design` 标记文件、三段自然语言提示词示例与 ALT combined-fragment 说明、模板拷贝与 `assets/index.html` 浏览命令、`import-drawio` 命令——均来自调研《cathrynlavery/diagram-design》，即该仓库 README。README 声明的「官方构建只出自本仓库」「网络行为见 PRIVACY.md」属作者声明，本次材料没有展开 PRIVACY.md 的内容；图型覆盖数量、版式语法数量、三种静态变体的可用性、可重绘质量都是作者口径，没有独立验证或对照数据。本次调研在「重绘已有图（导入）」的 `import-drawio platform.drawio --size=slide-16x` 处被截断，导出与后续步骤缺失，需打开仓库确认后再照做。
- wshobson/agents 路线的全部内容——`/plugin marketplace add wshobson/agents` 与单插件安装、`/plugin install python-development`、`gh skill install wshobson/agents [skill] --agent claude-code` 与 `npx skills add wshobson/agents --skill ...`（可加 `-a`/`-g`）、`npx codex-marketplace add wshobson/agents`、Antigravity / OpenCode / Pi 的 `make generate` + `make install-*`、`make generate-all` / `make validate` / `make garden`、Tier 0–4 模型档位表、`uv run plugin-eval score` 与 `certify`——均来自调研《wshobson/agents》，即该仓库 README。94 插件 / 202 agent / 184 skill / 105 command / 16 orchestrator、40,149 stars 都是作者与指标口径，没有交叉验证；plugin-eval 的 LLM judge 与 Monte Carlo 层作者自己标注 experimental 且 not validated against human labels；没有单个插件的质量数据、没有基准对比、没有“用了之后改善多少”的案例；README 的“production-ready”“idiomatic, harness-native artifacts”“one source-of-truth, six target harnesses”属作者主张；GitHub Copilot 这条路径仓库仍声明支持并生成 `.copilot/`，但材料里的清单已判为 drop，两者存在差异；Antigravity/OpenCode/Pi 需要 git + make。
- book-to-skill 路线的全部内容——`npx skills add virgiliojr94/book-to-skill` 与手动 clone、各宿主技能目录（Copilot CLI / Amp / Hermes / OpenClaw / OpenCode）、`python3 scripts/extract.py --check`、逐格式的抽取器与安装命令表、`ocrmypdf` 先 OCR 的要求、`/book-to-skill <path|folder|glob> [skill-name]` 与 technical / text-heavy 的选择、五类生成文件及各自 token 预算、`tools/validate_skill.py --lens <宿主>`、`tools/discovery_tax.py`、MIT 许可与“不得再分发第三方版权作品生成 skill”的合规要求——均来自调研《virgiliojr94/book-to-skill》，即该仓库 README。24×–51× 的 token 节省、Steps 0–10 的完整生成流程、analyze-only / generate-from-analysis / update / fold-in 各模式的具体用法、FAQ 与架构文档都在未提供的 `docs/` 里，属作者主张；输出质量（抽取准确度、章节切分是否合理、是否幻觉）没有任何第三方验证数据；stars=33277 来自给定指标，不构成有效性证据。
- khazix-skills 路线的全部内容——六个技能各自的一句话作用、一句话安装命令、不支持 Agent Skills 时的降级方案、leader 的触发词与“约 12 分钟”、目标七问表（含第零问）、storage-analyzer 的触发词与三色分级 + 只读扫描 + 二次确认 + 127.0.0.1/随机端口/token 的安全模型、neat-freak 的触发词与三层对齐 + 两条底线 + 不响应纯代码任务/周报、aihot 的免 Key 免 MCP、hv-analysis 与 khazix-writer 的触发词与不适用场景、21099 stars——均来自调研《KKKKhazix/khazix-skills》，即该仓库 README。本次只拿到 README，六个技能的 `SKILL.md` 正文均未提供，内部完整指令无法照抄；“效果一致”“确实省事”“10,000–30,000 字 PDF”、模型搭配（Claude Fable 5 规划 + GPT-5.6 Sol 执行、Kimi K3 / GLM-5.2）均为作者自述，无基准或对比测试；README 带推广性质；storage-analyzer 的 Windows 支持只写“代码就绪（多盘符已支持）”，未称实测；aihot 依赖第三方服务 aihot.news 在线可用。
- pg-aiguide 路线的全部内容——`npx skills add timescale/pg-aiguide --skill postgres` / `--skill schema-exploration`、公共 MCP 端点 `https://mcp.tigerdata.com/docs` 与各环境配置（Claude Code 插件 `claude plugin marketplace add timescale/pg-aiguide` + `claude plugin install pg@aiguide`、Codex、Gemini CLI、Cursor 的 `.cursor/mcp.json`、Windsurf 的 `serverUrl`、OpenCode、VS Code `code --add-mcp`）、简单与复杂两段示例提示词、A/B 自测提示词——均来自调研《timescale/pg-aiguide》，即该仓库 README（Apache 2.0，1853 stars）。README 自述的技能覆盖范围（schema/对象探查、schema 设计、索引策略、数据类型、数据完整性与约束、命名规范、性能调优、现代 Postgres 特性）、扩展生态（TimescaleDB、PostGIS，pgvector coming soon）、以及「技能会被 AI agent 自动使用」都属作者声明。效果数据只有厂商自己的一次 e-commerce schema 演示（约束多 4 倍、索引多 55%、采用 PG17 推荐模式、使用 `GENERATED ALWAYS AS IDENTITY` / `NULLS NOT DISTINCT`），没有任务集、多次重复、第三方复核，也没说明「更好」的判定细则；“dramatically better”“more robust, performant, maintainable”属宣传性表述。README 未说明公共 MCP 服务的可用性保证、速率限制与数据隐私（查询内容会发送到 Timescale 托管的端点）；是否支持本地自建只在未提供的 `DEVELOPMENT.md` 里提到。
- Claude-BugHunter 路线的全部内容——`/plugin marketplace add elementalsouls/Claude-BugHunter` 与 `/plugin install claude-bughunter@elementalsouls`、clone + `bash scripts/install.sh` / `pwsh ./scripts/install.ps1`、三条路径的能力差异表、`--all` / `--burp-mcp` 与五个 harness 的技能目录映射、`pipx install git+https://github.com/elementalsouls/Claude-BugHunter`、`/hunt` 第一轮声明授权背景、6 阶段流程、自然语言示例与示意输出、7-Question Gate 的 Q2/Q3、evidence-hygiene 的脱敏范围、报告分流、CVP 与 Opus 5 回落 Opus 4.8——均来自调研《elementalsouls/Claude-BugHunter》，即该仓库 README。83 个技能、15 个命令、681 条披露报告模式（433 条单独引用）都是作者口径，没有第三方验证；README 没有给改善幅度数据（没有时间节省、误报率、有效率的前后对比），只有两次 engagement 暴露的能力缺口清单；示例 transcript 被作者自己标注为非真实录制；Atlas Cloud 是赞助商推广位；per-engagement memory、program-rules-parser、HackerOne MCP 都是未勾选的路线图项；README 列了 5 个阶段名却称 6 阶段，需以仓库内 `docs/architecture.md` 为准。
- math-modeling-skill 路线的全部内容——两选一的安装命令（`git clone https://github.com/XiaoMaColtAI/math-modeling-skill.git`、`npx skills add https://github.com/xiaomacoltai/math-modeling-skill --skill math-modeling`）与 ZIP 解压方式、三阶段与角色对应（建模手 / 编程手 / 论文手）、各阶段固定交付物（`题目分析报告.md`、`术语表格.md`；代码、结果表格、三类各至少 3 张候选图、至少 1 幅总体建模流程图、`results/复现清单.json`；至少 8 幅正式图、默认 `完整论文.docx`、显式要求时的 LaTeX 源码/PDF/哈希清单）、五道独立门禁（`M1`、`P1`、`P2`、`W1`、`W2`）及触发时机、阶段内只读 Subagent 做质检而不是第四个固定角色、`SKILL_ROOT` 只读 + `PROJECT_ROOT` 可写 + 附件只读的目录契约与典型产物结构、六条可直接抄的提示词、阶段反馈回路（FAIL 由原阶段执行者修正并重新派发复验、主 Agent 不得自行覆盖失败结论、从被阻断阶段继续）、集成工具清单（科研可视化、双引擎论文搜索、DOCX、LaTeX、Excel、PDF）、`hybrid_scholar.py` 双引擎检索命令与 `--email` / `ANYSEARCH_API_KEY`、Python 与 MATLAB 两版动态依赖检查、算法资料渐进式加载与「每道子问题最多两个独立模型体系」、三条回归验证命令、dsh 预设的复制位置与 `mm_*` 工具、以及 1.3.0 版本更新说明——均来自调研《XiaoMaColtAI/math-modeling-skill》，即该仓库 README（版本 1.3.0，1848 stars）。原文给出的可核查内容只有这些：安装与运行命令、目录结构、五个门禁的定义与触发时机、集成工具清单、回归测试命令、版本语义化策略与 1.3.0 更新说明、2025 年国赛 A 题（烟幕干扰弹投放策略）和 B 题（碳化硅外延层厚度确定）的示例图。属作者主张、没有数据支撑的是：「CUMCM 默认以约 15000 字词单位、约 20 页作为完整度质量目标」（README 自己注明是非官方要求）、「每道子问题最多使用两个独立模型体系」「至少 8 幅正式图」「三类各至少 3 张候选图」（作者设定的质量基线，未说明依据），以及全文没有任何“用了它之后结果变好多少”的评测数据、对比实验或用户案例。局限：领域特定，面向 CUMCM、MCM/ICM、APMCM、MathorCup、认证杯、数维杯等竞赛与一般建模项目，不是通用分析框架；原文反复声明生成的论文仅供参考，结构格式必须以目标竞赛当届官方规则和官方模板为准；本次材料只有 README，真正的做法细节在 `SKILL.md`、`references/roles/*/SKILL.md`、`references/Subagent调度.md`、`tools/*/SKILL.md` 等子文件中，未包含在输入里，更细的角色规范与门禁判定标准无法核验；跨工具的可移植性未经验证。
- mattpocock/skills 路线的全部内容——两条安装路线（`claude plugins install mattpocock-skills` 与 `/plugin install mattpocock-skills`、`npx skills@latest add mattpocock/skills`，以及两者只选一条、都装会让每个技能出现两份）、安装器里 `setup-matt-pocock-skills` 必须被选中、想改技能的人用同一安装器并 `npx skills update` 拉更新、`/setup-matt-pocock-skills` 在每个仓库跑一次且要在其他工程类技能之前、它问的三件事（issue tracker / triage 标签 / 文档存放位置）、用户调用型与模型调用型的分层规则（用户调用型负责编排、模型调用型承载可复用纪律；用户调用型可调用模型调用型，不可调用另一个用户调用型）、工程类与生产力类的完整技能清单、四个失败模式与对应手段、`/grill-me` 与 `/grill-with-docs` 的用途与后者内联更新 `GLOSSARY.md` 和 ADR、共享语言的 before/after 例子、`/tdd` 的红-绿-重构与一次一个垂直切片、`/diagnosing-bugs` 的六阶段（先建能对当前 bug 变红的反馈回路 → 最小化 → 提假设 → 插桩 → 修 → 回归测试）、`/to-spec` 写规格前先问模块且不再访谈、`/improve-codebase-architecture` 的可视化 HTML 报告与「每隔几天」和「勘察不是抢救」、`/to-spec` → `/to-tickets` → `/implement` 或 `/implement-spec` → `/code-review` 的链路、`/code-review` 的 Standards / Spec 双轴与并行子 agent、`/wayfinder`、`/pr`（单向门/双向门 + 爆炸半径）、`/retro`、`/handoff`、`/research`（后台 agent、带引用的 Markdown）、`/wizard`（交互式 bash 向导）、`ask-matt` 与 `writing-for-agents` 的定位——均来自调研《mattpocock/skills》，即该仓库 README。原文提供了可复制的安装命令、一次性配置的交互项、完整技能清单与每个技能的职责，以及一条清晰的能力分类轴；但各 `SKILL.md` 的实际提示词内容不在材料里，效果表述（共享语言减少啰嗦、让命名一致、让代码库更好导航、让 agent 少花 token 思考；红-绿-重构「给 agent 一致的反馈水平，结果代码好得多」；并行子 agent「互不污染」）全部是作者主张，原文**没有给任何指标定义、基线或对照数据**，也没有第三方复现记录，所以只能当 try 而不是 adopt。原文提到原生 Codex 插件在路线图上，属未实现项。
- google/skills 路线（做法 S）的全部内容——`npx skills add google/skills`、`claude plugin marketplace add google/skills` + `claude plugin install <plugin>@google-plugins`、`codex plugin marketplace add google/skills` 与 `/plugins` 浏览器安装、`agy plugin install https://github.com/google/skills/<plugin-path>`、按任务从 Available Skills 列表选一个（如 gcloud CLI、BigQuery 优化、GKE 故障排查、IAM 策略管理）、使用前进入对应 skill 目录确认权限与配置、Google Cloud 技能依赖账号/项目/认证/IAM 权限——均来自调研《google/skills》，即该仓库 README。GitHub 指标显示 20653 stars、今日 78 stars，不构成有效性证据。局限：原文只有 README，未展示任何具体 skill 的完整步骤、提示词、配置样例；未提供使用案例、效果数据或对比；不同 agent harness 的插件安装命令未在 README 中给出完整插件名或路径；npx 和插件安装需要网络及运行环境。仓库主张这些技能可用，但未在材料中验证实际改善，所以只能小范围试，不能直接全面采用。
- china-market-data 路线（做法 T）的全部内容——`npx --yes skills@latest add clawyi-com/china-market-data -g` 及指定宿主、`--list`、`tools/setup_env.py` 的 macOS/Linux 与 Windows 命令、外置虚拟环境 `--venv`、自然语言问法清单、`scripts/tencent_quote.py` / `scripts/run.py ths_hot_reason.py` / `eastmoney_signals.py board-quotes` 示例、`--source dataapi` 的说明、`IWENCAI_API_KEY` 配置要求、开发者 clone 安装与手动复制目录必须保留的文件、离线开发验证命令——均来自调研《clawyi-com/china-market-data》，即该仓库 README。15 层、87 个端点、34 个数据来源、除 iwencai 外免 API Key 是原文给出的能力数字；原文也给出了数据边界说明（时间戳、降级、缺失值处理、明文 HTTP 风险等）。作者主张：这不是投顾建议，也不是付费数据商 SDK；代码开源不代表数据开放授权；免费或免 Key 不等于可自由商用；本项目没有逐项取得再分发授权。局限：Windows 命令未经过完整平台实测；部分接口仍使用明文 HTTP；东财节流主要在单进程内生效，多 agent 并发不会自动获得跨进程全局限流；接口可能限流、认证变化、缺失、延迟或下线；部分历史数据只有本地已保存记录，不能承诺补齐；更新后需重新初始化 `.venv`；只讨论概念或投资观点、不需要实际取数时技能不会被加载。原文未给出与人工查询对比的量化指标。
- Mobile Dev 路线（做法 U）的全部内容——安装与更新命令、平台/功能需求表、起步流程、4 条可直接复制的示例指令、隐私与遥测开关说明——均来自调研《callstackincubator/codex-mobile-dev-plugin》，即该仓库 README。可照做内容包括：`codex plugin marketplace add ... --ref release/latest`、`codex plugin add mobile-dev@mobile-dev`、`codex plugin marketplace upgrade mobile-dev`、Xcode 26/27 与 Android SDK 要求、Metro 与 WebCodecs 前提、物理 iOS 的 CPU/内存前置条件、Display FPS 支持范围、`MOBILE_DEV_TELEMETRY=off`。属产品说明/作者主张的是：所有功能描述（并排显示设备、元素检查、日志聚合、性能图表）都没有配套数据、案例或评测；README 未给出任何性能提升数字或对比基准。适用条件与硬性限制：仅限 Apple Silicon Mac 上的 Codex desktop；仓库当前为 private，安装需要 GitHub 读权限和可用的 Git 认证，外部用户可能根本装不上；Xcode 版本要求较高（26/27）；物理 iOS 不支持键盘与硬件按键控制；iOS 模拟器不支持 Display FPS；物理 iOS 的 CPU/内存监控有一串前置条件。成熟度信号：star 数 64，属早期项目；README 只覆盖单机开发者视角，未提及团队权限、CI 或多人协作场景。
- agentic-dev-kit 路线（做法 V）的全部内容——一行 `curl` 安装单个技能的命令、`cp -r` 的两种复制方式、项目级 `.claude/skills/<name>/SKILL.md` 与全局级 `~/.claude/skills/<name>/SKILL.md` 的作用域差异、重启 Claude Code 后按 `description` 匹配触发、自建技能要写 `name` 与 `description` 两个 frontmatter 字段——均来自调研《ARYANK-08/agentic-dev-kit》，即该仓库 README。可照做的部分只有安装命令、目录结构、作用域与触发机制；README 标题声称改善 SDLC 的编码/架构/评审/测试/发布各阶段，但技能表当前只列出 `explain` 一个技能，且**没有展示任何一个 `SKILL.md` 的实际内容**，所以“参考其提示与上下文组织方式”在现有材料里没有落地证据，也没有效果数据、案例或对比。未说明的事项：适用的 Claude Code 版本、frontmatter 的完整格式、技能命名冲突如何解决、`description` 怎么写才容易被匹配、curl 安装对 raw.githubusercontent.com 的依赖。仓库 37 stars，不构成有效性证据。
- 文中提到的 star 数（如 anthropics/skills 179219、awesome-copilot 39,568、pro-workflow 2.9k、feiskyer/claude-code-settings 约 1.6k、zh-tech-writing 312、biomedical-paper-reader 31、cline-pilot 91、wshobson/agents 40,149、book-to-skill 33,277、khazix-skills 21,099、pg-aiguide 1853、math-modeling-skill 1848、google/skills 20653、Mobile Dev 64、agentic-dev-kit 37）来自 metrics，不构成有效性证据。

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
