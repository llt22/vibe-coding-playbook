# 让编码 agent 的技能包经得起一周对照

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：你已经在用编码 agent，但每次装技能包都凭安装成功就认为有效，这篇手册给出一套可照做的小范围试装、对照验证、按需沉淀技能与路由工作流的流程。
> 先试这一步：选一个非关键项目，只装一个技能包，用同一任务做有/无技能的对照，各跑 3 次并记录返工轮数与人工纠正次数。
> 最近修订：2026-10-06

## 解决什么问题

你已经在用编码 agent，但每次都要重复描述同一套工程规范，或者不确定装一个技能包是否真的减少了返工——甚至因为一次装太多，上下文反而更乱。这篇手册给出一个可照做的流程：先小范围试装一个现成技能包，用同一任务做有/无技能的对照，确认有效后再考虑把自己的重复工作写成 `SKILL.md`，或者把一本反复查阅的技术书、一份内部文档半自动转成按需加载的技能。

它也覆盖一批具体场景：让 agent 代理编码 CLI 跑长任务并拿硬证据验收；给 agent 补一块行业设计知识；把一句模糊想法写成可让 agent 独立跑几小时的任务书；写一个把会话状态嵌进界面的 Claude Code mod；让 agent 把一句话描述／一个代码仓库变成可交互的架构图、工作流图、时序图、数据流图、生命周期图，或者把自然语言需求与已有的 draw.io / Mermaid / Excalidraw 源文件改成自包含的 HTML+SVG 图、并让它长得像你的品牌；让 agent 检索中国金融市场数据；把移动端模拟器与真机画面接进 Codex 聊天；把多步复杂任务拆成三阶段并加门禁；把中英文学术写作去模板化改写，同时用命题级核对保住数字、引文与证据强度（做法 Y）；让路由技能自动选工作流并对 bug 交出失败→通过证据（做法 Z）；按职能只装少量 agent 角色并用真实任务与默认提示对照（做法 AA）；在 T3 Code 里用 p3-stack 按 playbook 路由，并用 worktree 与 PR 监视减少等待和冲突（做法 AB）。

## 适用与不适用

适用：

- 你已经在用 Claude Code、Codex CLI、Cursor、Gemini CLI 或类似编码 agent，有一类反复出现、有明确规范的任务（需求澄清、写计划、TDD、代码审查、完成前验证、文档生成、会话交接等）。
- 愿意在一个非关键项目上做一周对照，而不是安装成功就认为改善。
- 需要给 agent 补一块领域知识：UI/UX 设计（做法 I）、Postgres（O）、Google 产品与技术（S）、中国金融市场数据（T）、移动端模拟器与真机观测（U）、中英文学术写作（Y）。
- 需要把文档站点、仓库、PDF、技术书或内部 `docs/` 变成按需加载的技能（做法 C、M）。
- 有一类多步、有明确交付物的复杂任务，希望分阶段推进、每阶段独立质检（做法 N、Q）。
- 反复写或审中文技术文档（做法 E），或反复改写中英文学术写作并要核对命题（做法 Y）。
- 需要给 agent 补模型端点、工具权限或网页搜索能力（做法 D），或想给 Claude Code 会话加一层界面与拦截能力（做法 G）。
- 需要从一个大插件市场按任务只装一个单元（做法 L），或一次装齐全栈开发技能并按请求自动激活（做法 X）。
- 想让 agent 自己选工作流（复现 → 调查 → 委派修复 → 重跑失败用例）并对 bug 交出失败与通过的证据（做法 Z）。
- 想按职能给 agent 补一个专业角色（代码审查、前端、无障碍、FinOps 等），并且只装少量角色（做法 AA）。
- 已经在 T3 Code 环境里工作，想让路由技能按 playbook 挑流程，并用 worktree、PR 监视、定时任务和线程记忆减少手工轮询与冲突（做法 AB）。

不适用：

- 没有明确重复任务，只想「装个工具看看」；不愿做对照验证，只凭安装成功就认为改善。
- 直接在生产关键项目上全量安装；一次装完整个插件市场。
- 只看 stars、README 徽章或 CI 状态就决定采用。
- 各做法自己的边界见对应小节（例如：E 只针对中文技术文档；F 只针对生物医学论文；M 不适用于无合法访问权的书或打算再分发第三方版权书生成的 skill；O 只在 Postgres / TimescaleDB / PostGIS 任务上有用；P 只对自有或书面授权资产；Q 的领域内容不通用；T 不支持直接驱动交易或投顾建议；U 需要 Apple Silicon Mac + Codex desktop + 私有仓库访问权；X 面向全栈开发，非开发类工作基本用不上；Y 需要能加载完整 Skill 文件夹的环境，且 DOCX 抽取保留不了复杂样式、批注、修订记录、脚注与文本框）。
- Z 的完整工作流定义在未抓取的 `docs/reference.md` 与 `SKILL.md` 中，本次无法核对实际步骤；需要 harness 支持插件/hook，Codex 需额外信任 hook；按角色配 effort 依赖插件自带 agent 存在；skills 会把 session transcripts 等读取内容发往模型 provider。
- AA 只给了角色目录，没给任何一个 agent 文件的内容，也没有效果证据；OpenCode 运行时约 119 个 agent 上限，超出会被静默丢弃。
- AB 必须在 T3 Code 环境内使用；`delegate_task`、`t3_thread_launch`、`watch_pull_request`、`schedule_task`、`t3_thread_read`、`t3_thread_search`、`preview_*`、`device_*` 都只有名称和一句话用途，没有命令语法或配置样例；没有 T3 Code 就最多只能读它的 skill / playbook 设计思路，不要照搬。

## 前置条件

通用：

- Node.js ≥ 18，npm/npx 可用；Git 可用。
- 一个可回滚的非关键项目，不要在主仓库或用户主目录（`~`）下做项目级安装。
- 对目标技能目录有写权限（如 `~/.claude/skills/`、`~/.agents/skills/`、`~/.cursor/skills/`）。
- 走 MCP 时，配置文件里写绝对路径。
- 安装第三方技能前，先通读它的 `SKILL.md`，并跑运行时的 doctor/audit 工具。

各做法额外前置：

- A：无额外。B：一件每周重复、有明文规范的工作。C：`pip install skill-seekers`。
- D：你的提供商端点（`ANTHROPIC_BASE_URL`）与 key，以及你网关实际提供的模型名。
- E：可用的 `npx` 或 `git`；可选装 autocorrect。F：宿主能读 PDF/图像，准备好 PDF、DOI、链接或原文之一。
- G：Claude Code 2.1.287 或更高；先确认 mod 来源可信。H：Cline CLI；Python 3；支持 Agent Skills 规范的宿主；冷启动愿用付费长上下文模型；项目侧已有或愿意先建 memory bank 与 clinerules。
- I：Node/npm 装 CLI；本机 Python 3.x。J：本地 Node 环境；仓库图需 agent 能读到仓库并把证据固定到一个 public commit。K：一个受支持的 Agent Skills 宿主。
- L：Claude Code 或 `gh`/可用 `npx`；Antigravity / OpenCode / Pi 需要 git 与 make；plugin-eval 需要可用的 `uv`。
- M：本机 Python 并能安装抽取器；技术书需 `docling`；扫描件需先 `ocrmypdf`；宿主支持 Agent Skills 标准。
- N：支持 Agent Skills 的 Agent；git、`CLAUDE.md`/`AGENTS.md`、`docs/`；用 leader 时愿意回答最多 5 个必须你拍板的问题。
- O：本机 `npx`；目标 agent 支持 Agent Skills 或 MCP；一个真实但不紧急的 Postgres 任务。P：已装 Claude Code；只对自有或书面授权资产使用；可选 Burp Suite + MCP Server。
- Q：支持本地 Skills 的宿主；可写的 `PROJECT_ROOT` 与只读的 `SKILL_ROOT` 分开；题目附件只读；跑双引擎检索时设 `ANYSEARCH_API_KEY` 或用 `--email`。
- R：支持 agent skills 的编码 agent；两条安装路径只选一条；一个 issue tracker；一组 triage 标签；一个放生成文档的目录。
- S：Node.js/npx，网络可访问 GitHub 和 skills.sh；Google Cloud 账号、项目和权限；已装对应 agent harness。
- T：Node.js 22.20+ / npm；Python 3.9+；可写目录；宿主能执行本地 Python；iwencai 入口自备 `IWENCAI_API_KEY`。
- U：Codex desktop + Apple Silicon Mac；Codex 自带 Node runtime；该仓库当前为 private，需要 GitHub 读权限且本机 Git 认证可用；Xcode 26+（真机 27+）与 simulator runtime、Android SDK platform-tools 与 emulator、已运行的 Metro server、宿主 WebCodecs 支持。
- V：本机已安装 Claude Code；能访问 raw.githubusercontent.com，否则改用 clone + cp。W：Node.js；`SKILL.md`、`references/`、`scripts/` 三部分放在一起；一个共享文件夹放观察日志；能在 `CLAUDE.md`（或平台等价文件）加激活指令或装 session-start hook。
- X：已安装并使用 Claude Code；第 6 步的项目管理工作流额外要求配置 Atlassian MCP server 并具备 Jira / Confluence 使用权。
- Y：Python 3.10+ 与标准库（用于 `validate_package.py` / `content_lock.py`）；PDF 文本抽取需 Poppler `pdftotext`；平台能加载完整 Skill 文件夹并保持 `SKILL.md`、`references/`、可选 `scripts/` 的相对位置；仅文本平台要同时提供 `references/` 等参考文件；准备术语表与作者写作样本；DOCX 抽取不能保留所有样式、批注、修订记录、脚注或文本框，可编辑 Word 交付需要相应文档工具。
- Z：先装好对应 harness（Claude Code / Codex / Pi 之一）；Codex 需先通过 `/hooks` 信任路由 hook；Pi 需要 extension 提供的 subagent、question、wake-up 工具；按角色配 effort 依赖插件自带的 `pstack:effort-<level>` / `pstack:poteto-agent-<level>` agent 存在。
- AA：本地有 git 与 bash；脚本方式需本地有仓库（原文未给 clone 命令，只说明脚本方式需本地有仓库）；app 方式需 macOS/Linux/Windows 桌面环境；已安装目标工具（如 Claude Code 且有 `~/.claude/agents/` 目录）；仓库内有 `strategy/runbooks.json` 且本地有 python3 才能按 runbook 整队安装。
- AB：一台能跑 T3 Code 的机器；T3 Code 从 `~/.agents/skills/` 读取 skills；已装 git；有可用的 provider/model 凭据；git 的 worktree 与分支能力可用；需要浏览器与设备模拟器时，T3 Code 提供 `preview_*` / `device_*`。

## 操作步骤

怎么选：先做做法 A；A 里某个技能确实有效、且你有一件每周重复且规范明确的工作，再做做法 B。其余按场景选：C 多来源知识打包；D 补模型端点/权限/搜索；E 中文技术文档写作与审稿；F 单篇论文精读；G 写一个 Claude Code mod；H 用 Cline CLI 代理长任务拿硬证据验收；I 补 UI/UX 设计知识；J 出带交互的单文件 HTML 图；K 出品牌一致的静态 HTML+SVG 图；L 从大插件市场只装一个单元并按任务档位选模型；M 把书或内部文档转成按需加载技能；N 把模糊想法写成任务书并给破坏性操作加闸门；O 补 Postgres 领域知识与版本化文档检索；P 在授权安全场景按主题加载安全技能库；Q 把多步任务拆成三阶段加门禁；R 装一套小而可组合的工程技能集；S 从 google/skills 按任务只装一个；T 让 agent 检索中国金融市场数据并核对来源与时间戳；U 把移动端模拟器与真机画面接进 Codex 聊天；V 用一行 curl 装单个 Markdown 技能；W 用元技能观察你怎么用技能；X 装一套全栈开发技能包按请求自动激活；Y 把中英文学术写作去模板化改写并用命题核对保住事实；Z 用路由技能自动选工作流并对 bug 交出失败→通过证据；AA 按职能只装少量 agent 角色并用真实任务与默认提示对照；AB 在 T3 Code 里用 p3-stack 按 playbook 路由并用 worktree/PR 监视减少等待与冲突。

几组容易混的：

- J 与 K：J 出带 JavaScript 交互的单文件 HTML，验收靠 `validate`/`deliver` 的机器收据；K 默认出无 JS、无外部图片依赖的静态 HTML+SVG，验收靠品牌 onboarding 阶段的对比度校验和 fidelity receipt。要交互选 J，要品牌一致性和静态可交付选 K。
- N 与 Q：N 解决「怎么把一句模糊想法写清楚」，产出含目标七问的任务书，不绑定领域；Q 解决「多步任务怎么分阶段推进、每阶段什么时候该拦」，产出分阶段的固定交付物加五道门禁。想不清楚先用 N；已经清楚、只是步骤多且容易一步错步步错，用 Q。
- B、R、W：B 是把你自己的重复工作写成单个 `SKILL.md`；R 是先用别人拆好的一整套技能集；W 不替你写技能，也不改你已装的技能——它并行观察你如何使用其它技能，产出观察日志和 staged 更新，由你复核后安装。
- A 与 V：A 走插件市场或 `npx skills add`，装上的是一个技能包（可能带 skill、子代理、命令、hook）；V 只把单个 `SKILL.md` 拷到 `.claude/skills/` 或 `~/.claude/skills/`，不装仓库、不装插件，代价小但收益上限也小，而且必须先打开文件读实际提示词。
- X 与 R / L / I：R 是小而可组合的工程技能集，跨模型可用、每条能单独改，不接管流程；X 是一个 Claude Code 插件，67 个专用技能按请求自动激活，复杂任务按三条预设技能链串起来跑；L 是一个大插件市场，可以按任务只装一个单元、配模型档位、用 plugin-eval 打分筛检；I 补的是 UI/UX 设计知识。
- T 与 A：同样是装一个技能包做对照；需要中国金融数据检索、且宿主能执行本地 Python 时用 T；只能聊天不能执行脚本、要直接驱动交易、或想拿数据做投顾建议时不要用。
- U 与 A：同样是装一个现成插件做对照，区别是绑定 Codex desktop + Apple Silicon Mac + 私有仓库访问权，解决移动端模拟器/真机的观测与诊断，不接管构建、安装、启动。
- W 与 A：同样要按 A 的对照方法验证；区别是 W 的产出不是某类任务的产出改善，而是「哪些摩擦该被沉淀成技能」这份清单，以及一批需要你自己安装才生效的 staged 更新。
- Y 与 E：E 面向中文技术文档（README、设计文档、接口说明、教程），规则来源是中文技术写作规范，装的是 leter/zh-tech-writing；Y 面向中英文学术写作（论文、摘要、讨论、审稿回复），装的是 heise3/academic-deai，且额外提供 `content_lock.py` 做命题级核对。要文档去 AI 腔用 E；要论文去模板化又不敢改数字引文，用 Y。
- Z 与 A：Z 同样走插件市场安装，但核心是 `poteto-mode` 路由技能与按角色配模型/推理强度；A 是通用小范围试装流程，Z 也必须套用 A 的对照方法。
- AA 与 X / R：AA 装的是按职能组织的 agent 角色文件（可只装一个 division 或几个 agent），X 是一个 Claude Code 全栈技能包按请求自动激活，R 是一套小而可组合的工程技能集；AA 没有自动激活机制，需在会话里显式激活角色。
- AB 与 Z：两者都是 pstack 家族。Z 是 `pstack-claude`，把 pstack 移植到 Claude Code、Codex、Pi，核心是 `poteto-mode` 路由技能与按角色配模型/推理强度；AB 是 `p3-stack`，把同一套技能、原则和话术在 T3 Code 上重写，核心编排原语换成 `delegate_task`、`t3_thread_launch`、`watch_pull_request`、`schedule_task`、`t3_thread_read/search`、`preview_*` / `device_*`。已经在 T3 Code 里工作才选 AB；否则先用 Z 或只读 AB 的 playbook 设计。
- E、F、G、H、I、J、K、L、M、N、O、P、Q、R、S、T、U、V、W、X、Y、Z、AA、AB 都必须套用 A 的对照方法，不要跳过验证直接纳入常规流程。

### 做法 A：先用现成技能包做小范围试装（推荐先做）

1. 选定一个非关键项目和一类重复任务。

2. 只选一个技能包、只装一个。可选来源（八选一）：

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

     等价的命令行方式与只挑 1–2 个技能的 npx 方式：

     ```sh
     claude plugin marketplace add feiskyer/claude-code-settings
     claude plugin install claude-code-settings@claude-code-settings
     npx -y skills add -l feiskyer/claude-code-settings
     npx -y skills add feiskyer/claude-code-settings
     ```

     注意：通过 Plugin 安装的技能需要重启会话才能加载；`npx skills add` 装到的版本可能滞后于仓库最新。

   - 中文技术文档写作（做法 E）：

     ```bash
     npx skills add leter/zh-tech-writing -g
     ```

     手动安装：

     ```bash
     git clone https://github.com/leter/zh-tech-writing.git
     cp -r zh-tech-writing/skills/zh-tech-writing ~/.claude/skills/
     ```

   - 生物医学论文精读（做法 F）：

     ```bash
     git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git
     mkdir -p ~/.codex/skills
     git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git ~/.codex/skills/biomedical-paper-reader
     ```

   - Google 产品与技术技能（做法 S）：

     ```bash
     npx skills add google/skills
     claude plugin marketplace add google/skills
     claude plugin install <plugin>@google-plugins
     codex plugin marketplace add google/skills
     agy plugin install https://github.com/google/skills/<plugin-path>
     ```

     只选一个与当前任务最接近的技能，如 BigQuery 优化或 gcloud CLI；使用前进入对应 skill 目录确认权限与配置。

   - 中国金融数据（做法 T）：

     ```bash
     npx --yes skills@latest add clawyi-com/china-market-data -g
     ```

   预期：插件安装成功，或只装上了你点名的技能。同一项目里不要同时用项目级安装和插件市场安装同一个技能包。

3. 验证安装。新开一个会话：

   ```text
   /plugin list
   What skills do you have access to?
   ```

   如果用的是 genspark-claw，先体检再看清单：

   ```bash
   npx genspark-claw doctor
   npx genspark-claw list
   ```

4. 跑通一个最小动作，只选一个你当前最痛的任务。

   - 官方示例技能：`Use the PDF skill to extract the form fields from path/to/some-file.pdf`
   - superpowers-zh：让它先问清需求再写计划，例如「给用户模块加个批量导出功能」。
   - pro-workflow：先跑 `/doctor` 和 `/wrap-up`。
   - feiskyer/claude-code-settings：挑一个技能，比如 `/handoff [下一次会话的重点方向]`；或让 codex-skill 做一次对抗式审查（触发词含 `codex`、`use gpt`、`full-auto`、`adversarial review`、`用codex`、`第二意见`）。
   - leter/zh-tech-writing：先只审不改，`/zh-tech-writing 检查 docs/api.md，只列问题，不要改`。
   - biomedical-paper-reader：拿一篇自己已经读过、心里有底的论文试跑。
   - google/skills：只选一个与当前任务最接近的技能，在隔离环境或测试项目跑一个具体任务。
   - china-market-data：安装初始化后问「贵州茅台现在的价格、PE、PB、市值和换手率」，检查是否包含数据来源、行情时间、抓取时间，以及是否区分缺失值与 0。

5. 做对照。同一任务、同一输入，分别在没有技能和有技能的条件下各跑 3 次，记录差异。试一周，或至少 5 个同类任务。

6. （可选）只照抄一个工作流形态，别整套搬：deep-research 的目录契约（`.research/<name>/` 下 `prompts/`、`child_outputs/`、`logs/`、`raw/`、`final_report.md`）；handoff 把对话压成交接文档输出到 `$TMPDIR/handoff-YYYY-MM-DD-HHMM.md` 并自动脱敏；codex-skill 把编码/评审交给 Codex 非交互执行、只呈现不改码；github-review-pr 的 findings 必须附 `file:line` 与原文引用。

### 做法 B：把自己的重复工作写成 SKILL.md（验证有效后再做）

1. 选一件你每周都在重复、且有明文规范的工作。

2. 建一个自包含文件夹，放 `SKILL.md`，照官方模板：

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

   关键：`description` 必须同时写清「做什么」和「什么时候用」。

3. 拆分结构：主 `SKILL.md` 只放流程与核心规则，细粒度规范拆到 `references/` 按需加载，确定性修正交给外部 CLI 工具。

4. 校验技能：

   ```bash
   npx genspark-claw validate ./my-skills/
   ```

5. 安装到目标 host：

   ```bash
   npx genspark-claw install all --target claude
   ```

   或直接放到 `~/.claude/skills/`。

6. 验证技能可复现：换一个新会话，或让一位不了解背景的同事只凭 `description` 触发该技能。

7. 没有自动触发时逐项排查：路径必须是 `~/.claude/skills/<name>/SKILL.md`（注意大小写）；Plugin 安装的技能需重启会话；检查是否双层嵌套；直接问 `What skills do you have access to?`；`disable-model-invocation: true` 的技能须用 `/skill-name` 手动调用。

### 做法 C：多来源知识打包（可选）

```bash
pip install skill-seekers
skill-seekers create https://docs.djangoproject.com/
skill-seekers package output/django --target claude
skill-seekers install-agent output/react/ --agent cursor
```

README 给出质量门禁 `skill-seekers quality output/react/ --threshold 7`，但没有与人工基线的对照实验，多数效果数字是作者主张。

### 做法 D：用配置模板补齐模型端点、工具权限与搜索能力（可选）

1. 只有你有自建网关、或想用已有订阅走非官方 API 时才做。`settings.json` 不通过 Plugin 配置，必须手动设置。

2. 把 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY` 指向你的提供商端点（作者模板默认 copilot-gateway `http://localhost:4141`）。

3. 替换模型名，换成你网关实际提供的：

   ```text
   ANTHROPIC_DEFAULT_SONNET_MODEL: claude-sonnet-5
   ANTHROPIC_DEFAULT_OPUS_MODEL: claude-opus-5
   ANTHROPIC_DEFAULT_HAIKU_MODEL: claude-haiku-4-5
   ```

4. 权限确认：模板 `defaultMode` 为 `acceptEdits`；想完全跳过确认可改 `bypassPermissions`，但 README 明确提示先了解安全风险。

5. VSCode 扩展（Claude Code 2.0+）在 VSCode `settings.json` 里配置环境变量：

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

6. 解决「API Key 缺失或无效」：在 `~/.claude.json` 里把 key 加入已批准列表：

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

8. 非官方 API 环境补网页搜索：WebSearch 仅限官方 API 环境，其它环境要用 MCP 补（README 列了 Tavily MCP、Brave MCP、Firecrawl MCP、DuckDuckGo Search MCP 四个，只给链接）。

9. 可选的零额外成本路径（已有 GitHub Copilot 订阅）：

   ```sh
   mv ~/.claude ~/.claude.bak
   git clone https://github.com/feiskyer/claude-code-settings.git ~/.claude
   npx copilot-gateway@latest start --proxy-env
   ```

### 做法 E：中文技术文档写作与审稿（按 A 的对照法验证）

1. 装 skill（二选一）：

   ```bash
   npx skills add leter/zh-tech-writing -g
   ```

   或手动拷贝：

   ```bash
   git clone https://github.com/leter/zh-tech-writing.git
   cp -r zh-tech-writing/skills/zh-tech-writing ~/.claude/skills/
   ```

2. （推荐）装 autocorrect：

   ```bash
   brew install autocorrect
   # 或从 Releases 页面下载二进制文件
   # 或 cargo install autocorrect
   autocorrect -V
   ```

3. 第一次只审不改：

   ```text
   /zh-tech-writing 检查 docs/api.md，只列问题，不要改
   ```

   不明确说「只列问题」，它会直接改文件。

4. 再让它改一版：

   ```text
   /zh-tech-writing 改一下 docs/api.md
   ```

   逐条 diff 审阅，重点看有没有「删了空话却没补事实」。

5. 按内置五步流程验收：确定读者与读完能做成什么；按规则写；用 AI 腔清单逐条检查；运行 `autocorrect --fix`；手动检查引号、省略号和破折号。

6. 核心规则：句子逗号隔开的每一截尽量在 20 字以内；多用肯定句和主动语态；直接用动词；语气像给同事讲清楚一件事；每段第一句说重点；标题不跳级；少用四级标题；加粗和列表不滥用。AI 腔清单包括开场和结尾套话、「不是 A，而是 B」句式、硬凑三个排比、宣传腔形容词、黑话、破折号和翻译腔。事实必须来自你的项目。

7. 按需读 references：数字与标点读 `references/typography.md`；产品手册读 `references/manual-structure.md`。

### 做法 F：单篇论文精读（按 A 的对照法验证）

1. 获取技能文件：

   ```bash
   git clone https://github.com/Gaoyuan-0423/biomedical-paper-reader.git
   ```

2. 指定入口：

   ```text
   请使用 ./biomedical-paper-reader/SKILL.md 阅读这份 PDF，生成中文精读报告。
   使用 $biomedical-paper-reader 解析这篇论文：<DOI、链接或附件>。
   ```

3. 补充材料默认只用本地已有文件；不要把「附件缺失」当成「作者未做验证」。

4. 直接复用可读的 PDF 提取结果，不再优先使用 MarkItDown；原 PDF 留作数字与图像核查。

5. 每张主图先概览，必要面板再放大；完整阅读图注，关注核心结论、必要对照、阴性结果及图文冲突。

6. 按默认七段顺序读报告：①开篇导读 ②文章信息 ③研究概述 ④全文逻辑路线图 ⑤逐图 / 逐结果精读 ⑥研究总结与课题借鉴 ⑦数据与复现入口。

7. 检查判定纪律：是否区分独立个体数与细胞/切片数、观察与因果、作者解释与新增假设；是否把未实际执行的代码和数据误标为已复现。

### 做法 G：自己写一个 Claude Code mod，把会话信息嵌进界面（可选）

1. 确认版本：

   ```shell
   claude --version   # 需要 2.1.287 或更高
   ```

2. 选一个「信息看不见」的痛点，例如上下文占用、危险命令拦截、改动回放。

3. 二选一建 mod。做法 G-1（最快）：让 Claude 自己写，粘贴 shortcut 提示词，只描述你想看到什么（例如 token-weather 的天气图标、百分比、最近 12 回合折线、本回合增量）。做法 G-2（想自己看懂）：手工建目录：

   ```text
   token-weather/
   ├── .claude-plugin/
   │   ├── plugin.json
   │   └── types/ (written by Claude Code when it loads the mod)
   ├── hooks/
   │   ├── hooks.json
   │   └── token-weather.mjs
   ├── types/
   │   └── index.d.ts
   └── tests/
       └── token-weather.test.ts
   ```

   `hooks/hooks.json` 只指一个模块：

   ```json
   {
     "modules": ["./token-weather.mjs"]
   }
   ```

4. 先画点东西，prompt 正上方那条带叫 `AbovePrompt`：

   ```javascript
   export function register(on) {
     on("ui.render", { component: "AbovePrompt" }, ($, e, next) => {
       const { Box, Text } = $.ui.resolve(e);
       return Box({ paddingX: 1, children: [Text({ color: "yellow", bold: true, children: "☀ Clear skies" })] });
     });
   }
   ```

   ```shell
   claude --plugin-dir ./token-weather
   ```

5. 读真实数字：`$.session.usage()` 返回 `context.tokens`、`context.window`、`context.percent`。历史必须放 `$.state`，模块级变量在 hot reload 时会重置。

6. 在 `types/index.d.ts` 里声明 `PluginState`，否则 `claude plugin validate` 会报错。

7. 原文 Step 4 的完整模块在本次材料里被截断，需打开原文补全后再复制。

8. 要长期用，就把文件夹复制出去按普通插件安装；安装任何来源不明的 mod 前先确认信任来源。

### 做法 H：让 agent 代理 Cline CLI 跑长任务，并用硬证据验收（可选）

1. 安装：

   ```bash
   npx skills add https://github.com/gongdear/cline-pilot
   mkdir -p ~/.hermes/skills && cp -r cline-pilot ~/.hermes/skills/
   ```

2. 完成首次本地配置，写入 `references/local-config.md`（私有、被 git 忽略）。

3. 过冷启动门禁：在任何 memory bank 启用之前，先把 `assets/global-memory-bank-prompt.md` 逐字放到位。

4. 选冷启动路径：还没有代码，规则由 agent 逐维度询问你后组装；遗留代码，规则基于对代码的扫描落地。

5. 两阶段模型策略：初始化用强的长上下文（付费）模型；稳态切到小的本地模型。同一断言连续失败 3 次，把那一批次升级回更强模型。

6. 派发编码任务：技能激活、挑选合适模式、注入提示词（固定首行 `active memory bank`）、后台运行。

7. 监控进度：

   ```bash
   python3 scripts/session_report.py 15 /path/to/repo
   ```

   示例参数 `15`、`5` 的含义原文未说明，照抄前先确认。

8. 验收后再报完成：走 6 项验收清单；证据优先于自我报告——完成由 git status、测试报告数字、非空产物证明。

9. 维护学习闭环：每次纠正/决策记入 `decision-log.md`（按项目标签类）→ 累计 ≥2 个一致样本 → 蒸馏进 `SKILL.md` 的偏好段。

10. 硬约束动作先问用户：push、删除、写数据库、花钱、改全局配置。

11. 自检命令：

    ```bash
    npx @anthropics/skills-ref validate .
    python3 -m py_compile scripts/session_report.py
    python3 scripts/session_report.py 5 /path/to/repo
    ```

### 做法 I：给 agent 补一块 UI/UX 设计知识（可选）

1. 需要 Node/npm 与 Python 3.x。README 明确要求安装步骤由「人」执行，agent 不应自行在你的机器上安装软件。

2. 全局安装 CLI（包名与命令名不同；旧的 `uipro-cli` 已过期）：

   ```bash
   npm install -g ui-ux-pro-max-cli
   ```

3. 进项目并装到你的 agent，先 dry-run：

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

   Claude Code 也可走插件市场：

   ```text
   /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
   /plugin install ui-ux-pro-max@ui-ux-pro-max-skill
   ```

4. 日常直接用自然语言提 UI/UX 请求；想要特定技术栈就在 prompt 里点名。

5. 直接用设计系统生成器与单域检索：

   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech banking" --design-system -f markdown
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "glassmorphism" --domain style
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "elegant serif" --domain typography
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dashboard" --domain chart
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "error summary validation" --domain ux
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "form validation" --stack react
   ```

6. 落盘成文件（Master + Overrides 模式）：

   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp"
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp" --page "dashboard"
   ```

   页面文件存在时覆盖 Master，不存在时只用 Master。

7. 交付前逐条对检查清单：不用 emoji 当图标；所有可点击元素 cursor-pointer；浅色模式文字对比度 ≥ 4.5:1；键盘导航焦点可见；尊重 prefers-reduced-motion；文本/徽标不裁切；375px、768px、1024px、1440px 响应式。

### 做法 J：让 agent 从一句话或一个仓库产出可交互的架构图（可选）

1. 安装 skill：

   ```bash
   npx skills add tt-a1i/archify -g
   npx -y skills add tt-a1i/archify --skill archify --agent cursor --global --copy --yes
   npx skills use tt-a1i/archify@archify --agent codex
   ```

2. 从描述出图：

   ```text
   Use Archify to diagram a web request: Browser calls the API,
   the API checks Redis, and a cache miss queries PostgreSQL and fills the cache.
   ```

3. 从仓库出图（要源码证据）：

   ```text
   Analyze this repository, then use archify to create a high-level runtime architecture diagram.
   Show 8–12 core components, one primary path, external dependencies, and trust boundaries.
   Put supporting detail in cards instead of adding more edges.
   ```

4. 选对图型并跑完整命令链：

   ```bash
   node archify/bin/archify.mjs guide "Show an API request with Redis cache miss"
   cd archify
   node bin/archify.mjs doctor
   node bin/archify.mjs validate workflow examples/agent-tool-call.workflow.json --quality showcase --json
   node bin/archify.mjs deliver workflow examples/agent-tool-call.workflow.json /tmp/workflow.html --quality showcase --open --json
   ```

5. 失败时按 `diagnostics[]` 的 `supportedFixes` 修，不要盲重试，且限制在两轮修正之内。

6. 改架构前做差异评审：

   ```bash
   node archify/bin/archify.mjs compare architecture base.json head.json architecture-delta.html --json
   ```

   它只给 Before / Delta / After 的机器收据，不推断影响、风险或可合并性。

### 做法 K：把自然语言需求或已有图源改成自包含的 HTML+SVG 图（可选）

1. 按你的宿主各取一条安装命令（原文照抄）：

   ```text
   /plugin marketplace add cathrynlavery/diagram-design
   /plugin install diagram-design@diagram-design
   ```

   ```bash
   codex plugin marketplace add cathrynlavery/diagram-design
   codex plugin add diagram-design@diagram-design
   copilot plugin marketplace add cathrynlavery/diagram-design
   copilot plugin install diagram-design@diagram-design
   droid plugin marketplace add https://github.com/cathrynlavery/diagram-design
   droid plugin install diagram-design@diagram-design --scope user
   pi install https://github.com/cathrynlavery/diagram-design
   ```

   Claude Code 装完要手动打开自动更新：`/plugin` → Marketplaces → diagram-design → Enable auto-update，提示时 `/reload-plugins`。

2. 做品牌 onboarding（约 60 秒）：

   ```text
   onboard diagram-design to https://yoursite.com
   ```

   抓首页 → 提取主色板与字体栈 → 映射到语义角色 `paper / ink / muted / accent / link` → 展示 proposed diff → 你回 `yes, apply it` → 写入 `references/style-guide.md`；写 token 前校验 `ink` 在 `paper` 上的 WCAG AA 对比度。

3. 多客户用命名 profile 隔离，在项目里放内容为 `profile: <slug>` 的 `.diagram-design` 标记文件。

4. 生成第一张图，或从模板起步：

   ```bash
   cp skills/diagram-design/assets/template.html my-diagram.html
   cp skills/diagram-design/assets/template-full.html my-diagram.html
   cp skills/diagram-design/assets/template-motion.html my-diagram.html
   open skills/diagram-design/assets/index.html
   ```

5. 重绘已有图：

   ```text
   /diagram-design:import-drawio platform.drawio
   /diagram-design:import-drawio platform.drawio --size=slide-16x
   ```

   本次材料在导入这一节被截断，导出与后续步骤缺，先打开仓库 README 确认。

### 做法 L：从大插件市场只装一个单元，并按任务档位选模型（可选）

1. Claude Code 安装：

   ```bash
   /plugin marketplace add wshobson/agents
   /plugin install python-development
   ```

2. 只装技能：

   ```bash
   gh skill install wshobson/agents
   gh skill install wshobson/agents python-testing-patterns --agent claude-code
   npx skills add wshobson/agents --skill python-testing-patterns
   ```

3. 其它 harness（Antigravity / OpenCode / Pi 需要 git + make）：

   ```bash
   npx codex-marketplace add wshobson/agents
   gh repo clone wshobson/agents ~/agents && cd ~/agents
   make generate HARNESS=antigravity && make install-antigravity
   make install-opencode
   make generate HARNESS=pi && make install-pi
   ```

4. 按任务层级选模型：Tier 0 Fable 5（长周期自主工作，需 opt-in）；Tier 1 Opus（架构、安全、评审）；Tier 2 inherit（后端、前端、AI/ML）；Tier 3 Sonnet（文档、测试、调试）；Tier 4 Haiku（快速操作、SEO、部署、内容）。

5. 对单个 skill 打分：

   ```bash
   uv run plugin-eval score path/to/skill --depth quick
   uv run plugin-eval certify path/to/skill
   ```

   把它的输出当筛子，不是结论。

### 做法 M：把一本反复查阅的书或一份内部文档变成按需加载的技能（可选）

1. 安装：

   ```bash
   npx skills add virgiliojr94/book-to-skill
   git clone https://github.com/virgiliojr94/book-to-skill.git ~/.claude/skills/book-to-skill
   ```

   各宿主技能目录：Copilot CLI `~/.copilot/skills/`；Amp / 跨代理 `~/.agents/skills/`；Hermes `${HERMES_HOME:-$HOME/.hermes}/skills/<category>/`；OpenClaw `${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/skills/`；OpenCode `~/.agents/skills/`。

2. 检查抽取依赖：

   ```bash
   python3 scripts/extract.py --check
   ```

3. 按书型安装 PDF 抽取器：文本为主用 `pdftotext` (poppler) 或回退 `pypdf` / `pdfminer.six`；技术类（代码、表格、公式）用 `docling`（约 1.5 秒/页）。扫描版 PDF 必须先 OCR：

   ```bash
   ocrmypdf input.pdf output.pdf
   ```

4. 运行转换：

   ```text
   /book-to-skill <path|folder|glob> [skill-name]
   ```

   转换前会问这本书是 technical 还是 text-heavy。生成物固定五类：`SKILL.md`（~4,000 tokens）、`chapters/ch01-*.md`、`glossary.md`、`patterns.md`、`cheatsheet.md`。

5. 使用与校验：

   ```text
   /your-book-slug replication
   ```

   ```bash
   tools/validate_skill.py --lens claude|copilot|amp|hermes|opencode
   ```

   合规：不得再分发第三方版权作品的生成 skill。

### 做法 N：把模糊想法写成可独立跑的任务书，并给破坏性操作加三色闸门（可选）

1. 安装：

   ```text
   帮我安装这个 skill：https://github.com/KKKKhazix/khazix-skills/tree/main/leader
   ```

2. 降级方案：把对应目录的 `SKILL.md` 全文下载当项目规则文件，或贴进对话让 Agent 照着执行——「效果一致」是作者主张。

3. 用 leader 写目标。触发词：`帮我给 agent 写个目标`、`帮我详细拆一下这个目标`、`写个 goal 提示词`、`让 agent 自己跑这个项目`。它先实测调研，问你最多 5 个必须你拍板的问题，写出纯 Markdown 任务书。

4. 按「目标七问」检查（外加第零问）：1 目的；2 完成态；3 证据；4 反作弊；5 地界；6 取舍；7 未知。第零问：海图是自己实测的还是听来的。任何一条没答案，不要丢进目标模式跑长程。

5. 用 storage-analyzer 清磁盘。触发词：`帮我看看存储`、`C 盘满了`、`清理一下磁盘`、`看下电脑空间`、`storage analysis`。安全规则：绿灯可一键清；黄灯只给「在访达打开」和「移废纸篓」；红灯只解释，最多「打开文件夹」，永不给删除按钮；全程只读扫描，删除必须浏览器点按钮 + 弹框二次确认；本地服务跑 127.0.0.1 + 随机端口 + token。

6. 用 neat-freak 收尾：`/neat`、`跑一下洁癖`、`把文档和记忆整理一下`、`新人接手，帮我做个 clean handoff`。它对齐项目根 `CLAUDE.md / AGENTS.md`、`docs/` 和 README、Agent 记忆系统；绝不擅自删东西。

### 做法 O：给 agent 补一块 Postgres 领域知识与版本化文档检索（可选）

1. 装技能：

   ```bash
   npx skills add timescale/pg-aiguide --skill postgres
   npx skills add timescale/pg-aiguide --skill schema-exploration
   ```

2. 接入公共 MCP 端点 `https://mcp.tigerdata.com/docs`，按环境配置（Claude Code 插件 `claude plugin marketplace add timescale/pg-aiguide` + `claude plugin install pg@aiguide`；Codex `codex mcp add --url "https://mcp.tigerdata.com/docs" pg-aiguide`；Cursor 写 `.cursor/mcp.json`；Windsurf 的字段名是 `serverUrl`）。

3. 用具体任务触发，或用 README 演示的 A/B 法自测（原文提示词原样复制）：

   ```text
   Please describe the schema you would create for an e-commerce website two times, first with the tiger mcp server disabled, then with the tiger mcp server enabled. For each time, write the schema to its own file in the current working directory. Then compare the two files and let me know which approach generated the better schema, using both qualitative and quantitative reasons. For this example, only use standard Postgres.
   ```

   单次 A/B 受随机性影响大，重复 3 次以上或换 2–3 个任务再下结论。

### 做法 P：在已获授权的漏洞挖掘场景按主题自动加载安全技能库（可选）

1. 只对自有或书面授权资产使用。插件安装：

   ```text
   /plugin marketplace add elementalsouls/Claude-BugHunter
   /plugin install claude-bughunter@elementalsouls
   ```

   插件路径不含 `hunt` engagement 脚手架；`cbh` CLI 需另行 pipx 安装。

2. 拷贝安装（想要脚手架时）：

   ```bash
   git clone https://github.com/elementalsouls/Claude-BugHunter.git
   cd Claude-BugHunter
   bash scripts/install.sh
   bash scripts/install.sh --all --burp-mcp
   pipx install git+https://github.com/elementalsouls/Claude-BugHunter
   ```

3. 用 `/hunt` 开 engagement；日常用自然语言描述目标，技能按主题自动加载。

4. 提交前必须过 `triage-validation` 的 7-Question Gate——Q3 问资产是否在 scope 内，Q2 问是否在项目认可的 impact 列表内。证据按 `evidence-hygiene` 脱敏。

### 做法 Q：把复杂分析任务拆成「分析 → 实现 → 交付」三阶段，用阶段内只读门禁卡住返工（可选）

1. 安装（二选一）：

   ```bash
   git clone https://github.com/XiaoMaColtAI/math-modeling-skill.git
   npx skills add https://github.com/xiaomacoltai/math-modeling-skill --skill math-modeling
   ```

2. 先约定目录契约：`SKILL_ROOT` 只读；`PROJECT_ROOT` 可写；题目与附件只读。产物结构包括 `data/`、`题目分析报告.md`、`术语表格.md`、代码、`results/`（含 `复现清单.json`）、`figures/`（三类各至少 3 张候选图 + 至少 1 幅总体建模流程图）、`完整论文.docx`。

3. 先用单阶段提示词做最便宜的对照：

   ```text
   只做建模分析，输出题目分析报告和术语表格。
   ```

4. 按门禁顺序推进，不要攒到最后才质检。阶段与门禁：① 建模手 → `题目分析报告.md`、`术语表格.md`，门禁 `M1`；② 编程手 → 代码、结果表格、候选图、`results/复现清单.json`，门禁 `P1`（最小可运行结果）、`P2`；③ 论文手 → 至少 8 幅正式图、`完整论文.docx`，门禁 `W1`（证据大纲）、`W2`。`P1` 必须在全量计算和正式出图之前执行；`W1` 必须在长篇正文和双格式排版之前执行。

5. 阶段反馈回路：任一独立门禁返回 `FAIL`，由原阶段执行者按证据修正并重新派发复验，主 Agent 不得自行覆盖失败结论；修正后从被阻断阶段继续，不重复已通过的阶段。

6. 跑双引擎文献检索与回归验证：

   ```bash
   python tools/paper_search/scripts/hybrid_scholar.py --query "robust optimization vehicle routing" --limit 10 --json
   python -m unittest discover -s tests -v
   python tools/docx/scripts/self_check.py
   ```

### 做法 R：装一套小而可组合的工程技能集，把「动手前对齐」和可复用纪律固化下来（可选）

两条设计经验：用户调用型只有你手输 `/xxx` 才触发，职责是编排；模型调用型可由 agent 在任务匹配时自动调用，承载可复用纪律。用户调用型可以调用模型调用型，不能调用另一个用户调用型。四个失败模式对应四组手段：没做我要的 → 动手前拷问对齐；太啰嗦 → 建共享术语表 `GLOSSARY.md`；代码跑不起来 → 补反馈回路；造出一坨泥 → 每天投资设计。

1. 安装，两条路线只选一条：

   ```bash
   claude plugins install mattpocock-skills
   ```

   或：

   ```bash
   npx skills@latest add mattpocock/skills
   ```

   安装器会让你选择要装哪些技能、装到哪些编码 agent 上；`setup-matt-pocock-skills` 必须被选中。

2. 每个仓库跑一次配置：

   ```text
   /setup-matt-pocock-skills
   ```

   它会被问三件事：用哪个 issue tracker；triage 打什么标签；生成的文档存到哪里。要在用其他工程类技能之前跑。

3. 每次想改动前先对齐：非代码用 `/grill-me`；代码用 `/grill-with-docs`（会内联更新 `GLOSSARY.md` 和 ADR）。

4. 建反馈回路：`/tdd`（红-绿-重构，一次一个垂直切片）、`/diagnosing-bugs`（先建出能对当前 bug 变红的反馈回路 → 最小化 → 提假设 → 插桩 → 修 → 回归测试）。

5. 管设计：`/to-spec`（写规格前先问你会动哪些模块）→ `/to-tickets` → `/implement` 或 `/implement-spec` → `/code-review`（按 Standards 和 Spec 两轴审 diff）；`/improve-codebase-architecture` 每隔几天跑一次，是勘察不是抢救。

### 做法 S：从 google/skills 按任务只装一个 Google 相关技能（可选）

1. 选一个与当前任务最接近的技能（gcloud CLI、BigQuery 优化、GKE 故障排查、IAM 策略管理等），不要一次装全部。

2. 安装（按 harness 选一条）：

   ```bash
   npx skills add google/skills
   claude plugin marketplace add google/skills
   claude plugin install <plugin>@google-plugins
   codex plugin marketplace add google/skills
   agy plugin install https://github.com/google/skills/<plugin-path>
   ```

3. 使用前进入对应 skill 目录确认权限与配置。Google Cloud 技能通常依赖账号、项目、认证和 IAM 权限，可能计费。

4. 在隔离环境或测试项目中跑一个具体任务，记录是否减少查文档或手写命令的时间、命令/配置正确率、需要人工纠正次数、权限申请次数。

### 做法 T：让 agent 检索中国金融市场数据，并核对来源与时间戳（可选）

1. 安装 Skill（交互式全局安装）：

   ```bash
   npx --yes skills@latest add clawyi-com/china-market-data -g
   npx --yes skills@latest add clawyi-com/china-market-data -g -y --agent cursor
   npx --yes skills@latest add clawyi-com/china-market-data --list
   ```

2. 安装 Python 依赖（初始化脚本会在技能目录内创建 `.venv`）：

   ```bash
   SKILL_DIR="$HOME/.agents/skills/china-market-data"
   python3 "$SKILL_DIR/tools/setup_env.py"
   ```

   Windows PowerShell：

   ```powershell
   $SkillDir = "$env:USERPROFILE\.agents\skills\china-market-data"
   py -3 "$SkillDir\tools\setup_env.py"
   ```

   更新技能会整体替换目录、删掉 `.venv`，更新后需再运行一次 `setup_env.py`。

3. 可选把虚拟环境放在技能目录外：

   ```bash
   python3 <技能目录>/tools/setup_env.py --venv ~/.venvs/china-market-data
   ~/.venvs/china-market-data/bin/python <技能目录>/scripts/run.py --check
   ```

4. 直接向 AI 助手提问，例如「贵州茅台现在的价格、PE、PB、市值和换手率」「拉宁德时代近一年前复权日 K 线」「今天涨停池、连板梯队和炸板率怎么样」。只讨论概念或投资观点、不需要实际取数时，技能不会被加载。

5. 也可直接运行 CLI（在技能根目录运行）：

   ```bash
   python3 scripts/tencent_quote.py sh000001 sz000001 510300 --output quotes.json
   python3 scripts/run.py ths_hot_reason.py --output hot.json
   python3 scripts/run.py eastmoney_signals.py board-quotes --board-type concept --period 5d --top-n 20 --output boards.json
   ```

   默认板块接口失败后可显式尝试 `--source dataapi`；它仍属于东财，不是独立供应商。大部分 CLI 把完整返回结构写入 JSON，终端只给预览。

### 做法 U：把移动端模拟器与真机画面接进 Codex 聊天，用日志和性能面板验收（可选）

1. 前提：Codex desktop + Apple Silicon Mac；该仓库当前为 private，安装需要 GitHub 读权限且本机 Git 认证可用。

2. 安装预构建插件：

   ```sh
   codex plugin marketplace add https://github.com/callstackincubator/codex-mobile-dev-plugin.git --ref release/latest
   codex plugin add mobile-dev@mobile-dev
   ```

   安装后新开一个 chat。更新用 `codex plugin marketplace upgrade mobile-dev`。

3. 按平台准备工具：iOS 模拟器需 Xcode 26+；物理 iPhone/iPad 需 Xcode 27+、Developer Mode、HEVC WebCodecs；Android 需 SDK platform-tools 与 emulator、H.264 WebCodecs；Metro 日志需已运行的 Metro server；物理 iOS 的 CPU/内存需 iOS 17.4+、development-signed 带 `get-task-allow`、developer disk image 已挂载、Xcode/LLDB detached；Display FPS 需要 Android 12+ 或 iOS 17.4+ 真机，iOS 模拟器不支持。

4. 从 Codex 侧边栏打开 Mobile Dev，选设备，让 Codex 干活：

   ```text
   Build and run my Expo app in the simulator beside this chat.
   Read the app logs and help me fix this error.
   Record CPU and memory for 30 seconds while I scroll checkout.
   Compare these two performance recordings.
   ```

5. 用面板做检查：Logs / Performance / Screenshot / Select。物理 iOS 只支持点击和拖拽。

6. 按需关闭遥测（插件向 Sentry 上报插件错误、崩溃和聚合性能指标；App 日志、截图、输入内容、工具载荷、设备性能录制被排除）：

   ```sh
   MOBILE_DEV_TELEMETRY=off
   ```

### 做法 V：用一行 curl 把单个 Markdown 技能装进 Claude Code，并验证它按 description 自动加载（可选）

1. 项目级安装单个技能：

   ```bash
   mkdir -p .claude/skills/explain && curl -fsSL https://raw.githubusercontent.com/ARYANK-08/agentic-dev-kit/main/skills/explain/SKILL.md -o .claude/skills/explain/SKILL.md
   ```

2. 想对本人所有项目生效，把 `.claude/skills/explain` 换成 `~/.claude/skills/explain`。

3. 走 clone 路线时用 cp 复制：

   ```bash
   mkdir -p .claude/skills
   cp -r path/to/agentic-dev-kit/skills/<name> .claude/skills/
   cp -r path/to/agentic-dev-kit/skills/<name> ~/.claude/skills/
   ```

4. 重启 Claude Code，提一个「解释这段代码」类型的请求，观察是否自动加载；若没触发，再显式点名该技能——显式能触发而自动不能，说明是 `description` 没匹配上。

5. 推广前必做：打开 `.claude/skills/explain/SKILL.md` 读实际提示词，判断是否值得沉淀成本团队的写法。

### 做法 W：让一个元技能观察你怎么用技能，把重复摩擦沉淀成技能改动（可选）

1. 取文件：`SKILL.md`、`references/`、`scripts/` 三部分必须放在一起；只装 `SKILL.md` 也能跑但会降级。

2. 安装：

   ```bash
   npx skills add rebelytics/one-skill-to-rule-them-all --skill task-observer
   ```

   Claude 应用在 Settings → Customize 上传 `.skill` 包；Claude Code 把文件夹放到 `.claude/skills/task-observer/`。

3. 激活（最容易漏）：把 `references/environments.md` 的激活指令加进 `CLAUDE.md`（或平台等价文件），或安装 session-start hook。仅靠 `description` 匹配会严重欠触发。

4. 在新会话里验证它真的会被调用（在第一次工具调用之前）。

5. 观察日志落在 `[你的共享文件夹]/skill-observations/observation-log/`，建议的技能更新落在 `[你的共享文件夹]/skill-updates/`。几轮真实工作后 `observation-log/` 还不存在，说明激活从未发生。

6. 每次会话结束问一句：

   ```text
   Any observations logged?
   ```

7. 安排定期复核会话（作者排期是周一、周三、周五早上）；交互式复核里你逐条批准，定期复核只应用「不需要你决策」的观察到 staged 副本；在你安装更新包之前，任何改动都不会上线。

8. 平台差异：Cowork（含 Dispatch）和桌面版 Claude Code 是完整体验；Claude.ai web、桌面/手机 Claude Chat 没有文件系统访问，走 handoff doc 模式。

### 做法 X：装一套全栈开发技能包，按请求自动激活并让复杂任务按技能链跑（可选）

1. 添加插件市场：

   ```bash
   /plugin marketplace add jeffallan/claude-skills
   ```

2. 安装技能包：

   ```bash
   /plugin install fullstack-dev-skills@fullstack-dev-skills
   ```

3. 用自然语言触发单个技能（请求里要带具体框架/技术名和具体任务）：

   ```bash
   # Backend Development
   "Implement JWT authentication in my NestJS API"
   → Activates: NestJS Expert → Loads: references/authentication.md

   # Frontend Development
   "Build a React component with Server Components"
   → Activates: React Expert → Loads: references/server-components.md
   ```

4. 用多技能工作流链处理复杂任务：Feature Development: Feature Forge → Architecture Designer → Fullstack Guardian → Test Master → DevOps Engineer；Bug Investigation: Debugging Wizard → Framework Expert → Test Master → Code Reviewer；Security Hardening: Secure Code Guardian → Security Reviewer → Test Master。

5. 用 `/common-ground` 暴露并校验 Claude 对项目的隐藏假设。

6. （可选）启用项目管理工作流：9 个 workflow 命令与 Jira / Confluence 集成，前提是配置好 Atlassian MCP server；按描述由人手动调用，原文没有自动触发机制。

### 做法 Y：把中英文学术写作去模板化改写，并用命题核对保住事实（可选，按 A 的对照法验证）

定位：heise3/academic-deai（v3.1.0，MIT）是一个「模型中立」的 Agent Skill，用于中英文学术编辑：减少空泛开头、重复收尾、机械段落等模板化文风，同时核对并保留事实、数字、引文、术语、证据强度与作者语气。可用于论文校对、语言润色、学术翻译和授权范围内的结构修订。README 声称支持 Codex、Claude Code、Cursor、Gemini CLI、OpenCode 等能加载 Agent Skills 的平台；但作者说明格式兼容性按官方文档核对，实际编辑验证只在本地 Codex 会话中完成。

1. 确认平台支持与安装位置。README 给出的路径示例：

   | 平台 | 完整 Skill 的安装位置示例 |
   |---|---|
   | Codex | `~/.agents/skills/academic-deai/` |
   | Claude Code | `~/.claude/skills/academic-deai/` |
   | Cursor | `.cursor/skills/academic-deai/` |
   | Gemini CLI | `.gemini/skills/academic-deai/` |
   | OpenCode | `.opencode/skills/academic-deai/` |

   前提：平台需支持 Agent Skills，或至少能加载编辑指令与相关资源；仅能读取文本指令的平台必须同时提供 `references/` 等参考文件，不能假定具备脚本或文件编辑能力。

2. 安装（README 给的 Codex 新安装示例，目标目录尚不存在时使用）。复制完整文件夹，保持 `SKILL.md`、`references/` 和可选 `scripts/` 的相对位置：

   ```sh
   git clone https://github.com/heise3/academic-deai.git
   mkdir -p ~/.agents/skills
   cp -R academic-deai ~/.agents/skills/academic-deai
   ```

3. 升级时先备份已有目录，再整体替换，避免合并遗留文件（README 明确提示）。

4. 调用 Skill。显式语法各平台不同；已加载时先用自然语言指定任务。可直接复制的中文提示词：

   ```text
   用 Academic DeAI 润色下面的中文讨论部分。
   减少模板化表达，保留数字、引文、术语和证据强度。
   不要添加新事实，只返回修改后的正文。
   ```

   英文翻译场景提示词：

   ```text
   Use Academic DeAI to translate this manuscript into English.
   Use the terminology list and my writing sample below.
   Preserve substantive claims, citations, section structure, and the requested minimum length.
   Return only the revised text.
   ```

   Codex 可显式使用 `$academic-deai`；其他平台按其 Skill 加载与调用方式执行。校对、语言润色、翻译和结构修订的修改深度由用户指定。

5. 按 README 的编辑规则执行，规则本身可当作验收清单：先看段落功能和证据连接，再处理孤立词语；套话和重复结构需要结合上下文判断；真实比较、负结果、必要总结、合理被动语态和规范术语可以保留；作者样本只用来指导表达习惯，不提供新稿的事实或观点；按任务加载参考和核查工具，不强制固定轮次或额外报告；比较改变的命题：主体、对象、方向、时间、条件和引文支持位置。

6. 可选文本核查工具（需 Python 3.10+ 与标准库）：

   ```sh
   PYTHONDONTWRITEBYTECODE=1 python3 scripts/validate_package.py .
   PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
   python3 scripts/content_lock.py original.md revised.md --strict
   ```

7. 抽取格式的前提：PDF 文本抽取还需 Poppler `pdftotext`；DOCX 正文抽取不能保留所有样式、批注、修订记录、脚注或文本框，可编辑 Word 交付需要相应文档工具。

8. README 明确说明：无需安装 Humanizer，也不自动串联其他编辑器；结构编辑思路参考 Humanizer 3.1.0。

9. 按 A 的对照法验证：用一段自己真实的中文讨论段落（含数字、引文编号、置信区间或不确定性表述），另存为 `original.md`；装好 Skill 后用中文提示词跑一轮，输出另存为 `revised.md`；运行 `python3 scripts/content_lock.py original.md revised.md --strict`，人工逐条核对被标记的命题差异。有条件时做一次不使用 Skill 的同提示词对照，以及一次人工盲评（原文没有提供这两类数据，需自建）。预期：你能说清哪些模板化表达被删掉、哪些数字与引文被保住；说不清就不要保留。

### 做法 Z：让路由技能自动选择工作流，并对 bug 交出「失败→通过」证据（可选，按 A 的对照法验证）

定位：michael-denyer/pstack-claude 把 Lauren Tan 写的 Cursor 插件栈 pstack 移植到 Claude Code、Codex、Pi 及其他 agent harness，核心入口是一个名为 `poteto-mode` 的路由技能：你只告诉它目标，它自行调用合适的工作流，目标是让代码保持精简、简单且经过验证。另有独立插件 agent-formal-verify 处理测试触达不到的并发 bug 与不变量，方式是 TLA+ 模型检查与 Lean 证明。完整工作流定义在未抓取的 `docs/reference.md` 与 `SKILL.md` 中。

1. 前提：先装好对应 harness（Claude Code / Codex / Pi 之一）。

2. 在 Claude Code 内安装：

   ```text
   /plugin marketplace add michael-denyer/pstack-claude
   /plugin install pstack@pstack-claude
   ```

3. 或在终端用 Codex 安装：

   ```shell
   codex plugin marketplace add michael-denyer/pstack-claude
   codex plugin add pstack@pstack-claude
   ```

4. 或在终端用 Pi 安装：

   ```shell
   pi install git:github.com/michael-denyer/pstack-claude
   ```

   Pi 下该包会加载 skills 与 pstack Pi extension，后者提供 skills 所需的 subagent、question、wake-up 工具，并加入 `/loop` 和路由指令；用 `/skill:<name>` 调用具体技能。

5. 配置角色模型与推理强度：运行 `setup-pstack`（Claude Code 中用 `/pstack:setup-pstack`）。可改模型默认值、按角色设定 reasoning effort、或关闭自动路由。README 给的写法示例是 `arena runners: opus @xhigh, fable @max`；Claude Code 通过插件提供的 `pstack:effort-<level>` 或 `pstack:poteto-agent-<level>` agent 派发；未指定 level 的角色沿用当前 session 的 effort，除非配置表的 `default effort` 行另有指定。

6. 处理 hook 信任：插件会在 Claude Code 和 Codex 上安装 routing hook；Codex 需要先通过 `/hooks` 信任它才会运行。

7. 其他 harness：Prime Agent、OpenCode、Gemini CLI，或任意 harness 的 skills-only 安装，参见 `docs/reference.md#shared-skills-installation`（本次未抓到正文）。

8. 使用示例（原文给的入门提示）：

   ```text
   Use poteto-mode to fix the search filter resetting when I change pages.
   ```

   对 bug，它会复现失败，用 `how` 和 `why` 调查，委派修复，再重跑失败用例；若修复跨越函数边界，会在实现前引入 `architect`。你拿到修复，以及失败与通过的证据。

9. 选 playbook：poteto-mode 的 playbooks 覆盖规划、功能开发、重构、性能问题、调查、原型、PR 维护、发布，以及较长周期项目（见 `plugins/pstack/skills/poteto-mode/SKILL.md#playbooks`）。

10. 已知局限：完整工作流定义在未抓取的 `docs/reference.md` 与 `SKILL.md` 中；仓库指标 1345 stars 不能作为效果证据；skills 会把 session transcripts 等读取内容发往模型 provider，涉及隐私与合规时先确认。MIT 许可。

### 做法 AA：按职能只装少量 agent 角色，用真实任务和默认提示对照（可选，按 A 的对照法验证）

定位：msitarzewski/agency-agents 是一个按职能组织的「AI 专业角色」Markdown 集合。每个 agent 是一个文件，原文声明其结构为：身份与性格、核心使命与工作流、带代码示例的技术交付出物、成功指标与沟通风格。角色按 division 分组（材料中可见 Engineering、Design、Paid Media、Sales、Marketing 等），每个角色给两列信息：专长与何时使用。交付形态有三层：原生桌面 app、一套 `scripts/` 安装脚本、纯参考模式。原文还提到 `strategy/runbooks.json` 里的 runbook 有 roster（一组 agent 组成的团队），可整队安装。

1. 前提：本地有 git 与 bash；脚本方式需本地有仓库（原文未给 clone 命令，只说明脚本方式需本地有仓库）；app 方式需 macOS/Linux/Windows 桌面环境。

2. 最省事：装桌面 app，一键写入你已在用的工具：

   ```bash
   brew install --cask msitarzewski/agency-agents/agency-agents
   ```

   或从 releases 页面下载：`https://github.com/msitarzewski/agency-agents-app/releases/latest`。app 会自动更新，省掉后续所有脚本步骤。

3. 用脚本装进 Claude Code（前提：已安装 Claude Code，且本机存在 `~/.claude/agents/` 目录）：

   ```bash
   # 一次装全部 agent 到 Claude Code 目录
   ./scripts/install.sh --tool claude-code

   # 或只手动复制一个 division
   cp engineering/*.md ~/.claude/agents/
   ```

4. 在会话里激活某个角色（前提：第 3 步已把对应 agent 文件放进工具目录）：

   ```text
   Hey Claude, activate Frontend Developer mode and help me build a React component
   ```

5. 装到 Claude Code 以外的工具（前提：目标工具已安装；`convert.sh` 在仓库内执行）：

   ```bash
   # Step 1 -- generate integration files for all supported tools
   ./scripts/convert.sh

   # Step 2 -- install interactively (auto-detects what you have installed)
   ./scripts/install.sh
   ```

   也可以直接指定工具：

   ```bash
   ./scripts/install.sh --tool antigravity
   ./scripts/install.sh --tool gemini-cli
   ./scripts/install.sh --tool opencode
   ./scripts/install.sh --tool copilot
   ./scripts/install.sh --tool openclaw
   ./scripts/install.sh --tool cursor
   ./scripts/install.sh --tool aider
   ./scripts/install.sh --tool windsurf
   ./scripts/install.sh --tool kimi
   ./scripts/install.sh --tool codex
   ./scripts/install.sh --tool osaurus
   ./scripts/install.sh --tool hermes
   ./scripts/install.sh --tool vibe
   ./scripts/install.sh --tool dsh
   ```

6. 只装需要的团队，先看再装：

   ```bash
   ./scripts/install.sh                                    # interactive wizard: pick tools + teams
   ./scripts/install.sh --tool claude-code --division engineering,security
   ./scripts/install.sh --tool cursor --agent frontend-developer,ui-designer
   ./scripts/install.sh --list teams                       # see every team + agent count
   ./scripts/install.sh --tool opencode --division engineering --dry-run
   ```

   说明（原文）：`--agent` / `--agents-file` 接受 agent 的 slug、显示名，或去掉 `.md` 的文件名，也就是 runbook roster 使用的 id。

7. 按 runbook 的名单整队安装（前提：仓库内有 `strategy/runbooks.json`，本地有 python3）：

   ```bash
   python3 -c 'import json, sys
   for r in json.load(open("strategy/runbooks.json"))["runbooks"]:
       if r["slug"] == sys.argv[1]: [print(a) for g in r["roster"] for a in g["agents"]]' startup-mvp > team.txt
   ./scripts/install.sh --tool claude-code --agents-file team.txt
   ```

8. OpenCode 用户注意：运行时上限约 119 个 agent，超出会被静默丢弃；用 `--division` 装子集保持在限制内。

9. 不想装，就当参考用：每个 agent 文件含身份/性格、使命与工作流、带代码示例的交付物、成功指标与沟通风格，可浏览后复制/改编你需要的那些。

10. 已知局限：只给了角色目录，没给任何一个 agent 文件的内容，也没有效果证据；「Production-Ready」「battle-tested workflows」等属宣传语；README 没有给出指标定义、评测方法或对照数据；材料在 Marketing 表格中途被截断。

### 做法 AB：在 T3 Code 里用 p3-stack 按 playbook 路由，并用 worktree/PR 监视减少等待与冲突（可选，按 A 的对照法验证）

定位：uzairansaruzi/p3-stack 是把 pstack（poteto 在 Cursor 插件生态里的技能集合）在 T3 Code 上重写的版本。同一套技能、原则和话术，编排机制换成 T3 Code 的原语：`delegate_task` 子代理取代 Cursor 的 Task 工具；`t3_thread_launch` 把一个 worker 绑到它自己的 worktree 和分支；`watch_pull_request` 在检查跑完、有人评论或分支冲突时唤醒线程；`schedule_task` 在没有活跃回合时也能跑审计和过夜节奏；`t3_thread_read` / `t3_thread_search` 取代去挖 Cursor 的 transcript 文件；`preview_*` 浏览器工具和 `device_*` 模拟器取代外部控制类技能，截图和录像落回线程里。仓库附带 skills 目录、24 条 principle 技能，以及 `p3-mode` 的 playbook 路由表。

前提：需要一台能跑 T3 Code 的机器（它从 `~/.agents/skills/` 读取 skills），已装 git。以下命令均出自 README。

1. 克隆并全局安装：

   ```bash
   git clone https://github.com/uzairansaruzi/p3-stack.git
   cd p3-stack
   ./install.sh
   ```

   `install.sh` 会把每个 `skills/*` 目录链接进 `~/.agents/skills/`。预期：技能目录里出现 p3-stack 的 skills 链接。

2. 如果只想装到某个项目而不是全局（前提：目标 repo 路径存在）：

   ```bash
   ./install.sh --project /path/to/repo
   ```

   这会装到该项目的 `.agents/skills/`。预期：只在该项目内可见，不污染全局。

3. 初始化角色→模型的映射：运行 `/setup-p3`。它会读 `orchestrator_capabilities`，写出 `p3-models.md`，把每个角色（code、judgment、review 面板）映射到你实际拥有的 provider 和 model。这是后面跨模型 panel 能跑起来的前提。预期：打开 `p3-models.md` 能看到 code / judgment / review 三类角色都映射到了你确实有的模型；如果为空或映射到不存在的模型，先修这一步。

4. 正式干活时用 `/p3-mode`。它读请求、挑一个 playbook，并按步骤在需要时调用其它 skill。需要严谨流程的任务都从这里进。预期：它先说明选了哪个 playbook，再按 playbook 步骤推进，而不是直接开始改代码。

5. 卡住或不确定该用哪个 skill 时，问 `/p3-help`。预期：得到当前可用 skill 与 playbook 的说明。

6. 机制层面的用法（README 只给了名称和一句话用途，没有给命令语法或配置样例，需要自己到仓库/运行环境里确认）：用 `delegate_task` 派子代理组成跨模型 panel；用 `t3_thread_launch` 给 worker 分配独立 worktree 与分支；用 `watch_pull_request` 替代轮询等待 PR 状态；用 `schedule_task` 挂定时审计和过夜任务；用 `preview_*` / `device_*` 产出截图和录像作为交付证据；用 `t3_thread_read` / `t3_thread_search` 取回线程记忆。如果这些原语在运行环境里找不到对应命令或参数，先不要继续，说明宿主版本或安装不完整。

7. 按 A 的对照法验证：不要一上来就全局 `install.sh`，先用 `./install.sh --project /path/to/repo` 装到一个不重要的真实仓库；跑 `/setup-p3` 看它生成的 `p3-models.md` 是否把 code / judgment / review 角色映射到了你确实有的模型；然后拿一个真实的小任务（一个 bug fix 或一个 feature，规模控制在一次能看完的范围）走 `/p3-mode`，观察它是否按 playbook 走完。没有 T3 Code 环境就无法验证，此时最多只能读它的 skill / playbook 设计思路，不要照搬。

### 做法 AB 的验收重点

1. 流程完整度：`/p3-mode` 是否真的按所选 playbook 的步骤推进，而不是跳过步骤或空转。
2. 并行安全性：同时开多个 worker 时，worktree / 分支冲突次数是否为 0（原文声称由应用强制单写者）。
3. 等待成本：用 `watch_pull_request` 后，是否真的不再需要轮询，事件唤醒的延迟能否接受。
4. 无人值守：`schedule_task` 挂的审计/过夜任务，在没有活跃回合时是否照常执行并留下可读结果。
5. 返工率：同一类任务相比你原来的做法，人工修正次数、返工轮次是否下降；交付证据（截图、录像、PR）是否让你少做一轮核对。只要第 2、4、5 项没有可观察的改善，就说明这套编排只是换了名字的流程包装，应降级为「只读它的 playbook 与 principle 设计」。

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
- 文档转技能类（做法 M）：拿一本你反复查阅、已知答案的书，转换后用 10 个问题逐个提问：8 个已知答案、1 个书中明确没有的（考幻觉）、1 个跨章节综合的。
- 目标书类（做法 N）：用 leader 生成任务书，检查七问是否全有答案；丢进目标模式跑一次，记录人工介入次数；完成后跑 `/neat`。
- Postgres 知识类（做法 O）：按 README 的 A/B 提示词，同一任务关闭 MCP 生成一份、打开生成一份，逐项对比；重复 3 次以上。
- 安全技能包类（做法 P）：在自建靶场或自有授权小资产上跑一次 `/hunt`，记录加载了哪些技能、7-Question Gate 是否拦下不该提交的发现。
- 复杂分析类（做法 Q）：先只跑单阶段「建模分析」，把 `题目分析报告.md` 和 `术语表格.md` 与人工版本对比；再挑一道小题跑完整三阶段，观察 `P1` 有没有提前拦下不可运行的方案。
- 工程技能集类（做法 R）：先跑 `/setup-matt-pocock-skills`，再只从 `/grill-with-docs` 和 `/tdd` 两个最高频入口开始，记录人工介入次数与返工轮数。
- Google 技能类（做法 S）：在隔离环境或测试项目中只选一个技能，执行一个具体任务，记录是否减少查文档时间、正确率、人工纠正次数、权限申请次数。
- 金融数据类（做法 T）：问「贵州茅台现在的价格、PE、PB、市值和换手率」，检查是否包含数据来源、行情时间、抓取时间，以及是否区分缺失值与 0。
- 移动端调试类（做法 U）：在 Apple Silicon Mac 上装好并新开 chat，选一个模拟器让它启动，让 Codex 执行 `Build and run my Expo app in the simulator beside this chat.`，再打开 Logs 确认能读到 iOS unified logs / Android logcat / Metro console。
- Markdown 技能类（做法 V）：装入 `explain`，重启后提一个解释类请求，观察是否按 `description` 自动加载；再打开文件读实际提示词。
- 元技能类（做法 W）：选一个会连续用几天的项目，装好并在 `CLAUDE.md` 加激活指令，正常干活 3–5 个会话，再安排一次复核会话；先过生效验证，再看产出。
- 全栈技能包类（做法 X）：选一个单点任务和一个链式任务，各先在不装插件的普通 Claude Code 做一次、再装插件做一次；记录激活命中/未命中次数、加载的 reference 是否相关、返工轮次与整链耗时。
- 学术写作类（做法 Y）：用一段自己真实的中文讨论段落（含数字、引文编号、置信区间或不确定性表述），另存为 `original.md`；按第 2 步装好后用中文提示词跑一轮，输出另存为 `revised.md`；运行 `python3 scripts/content_lock.py original.md revised.md --strict`，人工逐条核对被标记的命题差异（主体、对象、方向、时间、条件、引文支持位置）；有条件时做一次不使用 Skill 的同提示词对照，以及一次人工盲评（原文没有提供这两类数据，需自建）。
- 路由类（做法 Z）：装好后用 `Use poteto-mode to fix <该 bug 的现象>` 跑一个当前会失败、且你能独立复现的小 bug，记录是否先复现失败、是否用 `how`/`why` 调查、是否在跨函数边界时引入 `architect`、最终是否交付失败改通过的证据；与「同一 bug 用普通 Claude Code 会话」做对照。
- 角色类（做法 AA）：按 division 只装少量 agent（如 code-reviewer、frontend-developer）进你在用的 Claude Code 或 Cursor，用真实任务跟默认提示做对照，记录激活命中、人工纠正次数、返工轮数。
- T3 Code 编排类（做法 AB）：先用 `./install.sh --project /path/to/repo` 装到一个不重要仓库，跑 `/setup-p3` 检查 `p3-models.md` 映射，再用一个小 bug fix 或小 feature 走 `/p3-mode`；记录流程是否按 playbook 走完、多 worker 的 worktree/分支冲突次数、`watch_pull_request` 是否真的免轮询、`schedule_task` 是否在无人值守时跑完，以及相比原做法的返工轮数。

可观察的指标：

- 通用：人工修改次数 / 返工轮数是否下降；首稿可用率；背景重述次数；输出一致性；单次任务耗时；规则类返工次数。
- 做法 H：该批次测试是否通过、是否产出非空文件、git 是否有预期改动（不采信 agent 自述）；同一断言连续失败次数是否达到 3 次；第二、第三批次的返工量是否低于冷启动前的手动基线。
- 做法 I：交付前检查清单的 8 条是否成立；跨会话复用 `MASTER.md` 后是否还需要反复重说同一套配色、字体和反模式。
- 做法 J：交付是否原子替换；按 `diagnostics[]` 修的轮数；仓库图节点是否带 `SRC n` 并能打开 Git 校验过的文件与行号范围。
- 做法 K：品牌 onboarding 后是否还需要手动改配色和字体；fidelity receipt 里有没有 fallback；产物是不是单个自包含 HTML。
- 做法 L：同一任务的完成时间与返工次数；单次会话加载的组件数量与 token 或费用变化；同一提示重复 3–5 次的结果一致性。
- 做法 M：8 个已知答案题的命中数与引用章节是否对得上；书中明确没有的那题是否被回答「书里没有」，应为 0 幻觉；按需加载与整本塞上下文的 token 对比。
- 做法 N：任务书是否七问全有答案；长程执行中中途纠偏次数；验收时能否逐条贴出实际命令输出；是否出现「指标达成，事一件没干」。
- 做法 O：约束数量（NOT NULL / CHECK / 唯一约束 / 外键）；索引数量与类型；是否用了与目标 PG 版本匹配的现代语法；人工 review 的返工次数；DDL 应用后是否需要补加索引或补约束。
- 做法 P：7-Question Gate 是否在提交前拦下不该提交的发现；技能是否按主题自动加载；evidence-hygiene 是否把截图里的 cookie 与 PII 脱掉。
- 做法 Q：五个门禁的通过/失败记录；门禁拦截率——`P1`/`W1` 提前拦下的问题数 ÷ 总返工问题数；`results/复现清单.json` 是否齐全；回归测试是否通过。
- 做法 R：`/grill-with-docs` 后 `GLOSSARY.md` 与 ADR 是否被内联更新、术语是否一致；`/tdd` 是否按红-绿-重构一次一个垂直切片；`/code-review` 的两个轴是否分开跑。
- 做法 S：任务完成时间、一次性通过率、人工干预次数、错误率、权限范围是否收敛。
- 做法 T：数据获取成功率；输出是否携带报价来源、行情时间和抓取时间；失败时是否明确报错而非返回空数据。
- 做法 U：从「描述问题」到「Codex 指到具体元素或堆栈」的耗时；切换模拟器、IDE 与终端的次数；固定场景前后 CPU、内存、Display FPS、Android jank 的对比。
- 做法 V：是否被自动触发（不显式调用也能加载）；产出是否符合 `description` 描述的形态；同类请求重复多次是否稳定；相比不用技能时自己写的提示词长度是否明显缩短。
- 做法 W：观察条数、被接受并装入的技能改动数、新建技能候选数；同一个坑是否还在多个项目里被反复写进 project memory。
- 做法 X：激活是否命中（被激活的技能是否是你预期的那个、加载的 reference 是否相关）；返工轮次；交付物质量；流程链收益；`/common-ground` 暴露出的、你确实没交代且会影响结果的假设数。
- 做法 Y：模板化表达减少——空泛开头、重复收尾、机械段落的数量是否下降；事实与证据不变——数字、引文编号、置信区间、不确定性表述、术语是否原样保留，`content_lock.py --strict` 是否无未解释的命题变化；无新造事实；作者声音保留——与作者样本/术语表的一致性是否提高；交付质量——修订稿是否仍满足章节结构、篇幅下限等硬性要求。
- 做法 Z：是否产出可核验的失败→通过证据；是否减少人工纠正路由或流程的次数；最终 diff 的规模与新增抽象是否更小；达到通过状态所需往返轮数是否下降；试用 Codex 时 routing hook 信任后是否确实在任务开始时触发路由。
- 做法 AA：角色激活是否命中；同一任务与默认提示相比返工轮数、人工纠正次数、首稿可用率；OpenCode 下是否因 119 上限静默丢弃 agent。
- 做法 AB：`/p3-mode` 是否按 playbook 走完；多 worker 的 worktree/分支冲突次数；`watch_pull_request` 是否真的免轮询；`schedule_task` 是否在无人值守时跑完；同一类任务返工轮数、人工修正次数是否下降；交付证据是否让你少做一轮核对。

反向指标：

- 加了技能后仍要口头纠正同一件事，先改 `SKILL.md` 或 `description`，不要继续加提示。
- 文档改完只是删了空话、没补事实，信息量反而下降，先把代码、配置和真实报错给它读。
- agent 只凭自己的声明就宣布完成，而 git status 和测试报告不支持，回到做法 H 第 8 步作废重跑。
- 某个本地批次同一断言连续失败 3 次还在本地重试，判定为模板/规则缺口，升级到强模型。
- 出图技能每次失败都要盲重试，说明没用上 `diagnostics[].supportedFixes`。
- 装着 diagram-design 却仍每次手动改配色和字体，说明没做品牌 onboarding。
- plugin-eval 分数不错但真实任务没改善，说明把筛子当成了结论。
- book-to-skill 生成的技能被问到书中没有的内容时开始编造，先停用。
- 任务书七个问题有任何一条没答案，别丢进目标模式跑长程。
- 门禁返回 `FAIL` 后主 Agent 直接改掉失败结论、或五个门禁一次也没拦下东西，先只留目录契约和 `P1`。
- 两条安装路径都装了、每个技能出现两份，先卸掉一条（做法 R）。
- `/improve-codebase-architecture` 的候选清单被当成改造方案直接执行，停一下——它是勘察不是抢救。
- google/skills 的技能没减少查文档时间、或权限申请次数反而增加，先只保留那一个。
- china-market-data 更新后 `.venv` 被删、脚本跑不起来，先重新运行 `setup_env.py`；默认板块接口失败后 `--source dataapi` 仍失败，不要当成独立备用源。
- Mobile Dev 装不上，先确认是不是 Apple Silicon Mac + Codex desktop、有没有私有仓库读权限；物理 iOS 不支持键盘与硬件按键、iOS 模拟器不支持 Display FPS，不要当成 bug。
- 装了 `explain` 每次都要显式点名才触发，先改 `description` 或改用法。
- 装完 task-observer 跑了几个会话、`skill-observations/observation-log/` 仍不存在，先补激活指令或 session-start hook。
- 做法 X 里技能没被激活，先检查请求是不是没带具体框架/技术名和具体任务；激活命中率低或返工没下降，按取舍规则降级为 study。
- 做法 Y：如果命题方向被改（例如把「未下降」强化成「保持不变」）却没被 `content_lock.py --strict` 拦下，不要直接采用修订稿，先逐条人工核对。
- 做法 Y：如果它添加了原稿没有的事实或观点，按提示词里「不要添加新事实」的核对项回退。
- 做法 Y：如果 DOCX 交付后样式、批注、修订记录、脚注或文本框丢了，先换文档工具走可编辑 Word 流程，不要把抽取结果当最终交付。
- 做法 Y：如果期待它有盲评、模型间对照或检测器分数——作者自己声明没有，先自建基线和盲评再判断。
- 做法 Z：若产出没有失败→通过证据、或 hook/agent 派发不生效，退回 study，只借鉴「路由 + 复现/调查/委派/重跑失败用例」的流程骨架。
- 做法 AA：把角色目录当效果证据，或一次装全部 agent 导致上下文占用过高；OpenCode 装超 119 个 agent，先卸掉多余角色。
- 做法 AB：如果 `/p3-mode` 没有真正按 playbook 推进、`watch_pull_request` 仍要轮询、`schedule_task` 在无人值守时没有产出，或 worktree/分支冲突不为 0，先降级为只读它的 playbook 与 principle 设计；没有 T3 Code 环境时不要硬装。

注意：`doctor`、`validate`、`npm test`、`claude plugin validate`、`npx @anthropics/skills-ref validate`、`archify doctor`、`validate --json`、`python -m unittest discover -s tests` 这类检查只能证明「技能或 mod 装得上、格式合法、不带危险命令、图能通过校验、回归测试能过」，不能证明「产出更好」。效果必须自己对照。做法 Y 的 `validate_package.py`、`unittest`、`content_lock.py --strict` 同理，作者明确说它们各自只证明其覆盖范围。

## 常见坑

- 整体 adopt：一次装多个技能包，导致上下文过载或规则冲突。先只装一个，做法 A、H、I、J、K、L、N、Q、R、S、T、U、V、X、Y、Z、AA、AB 同理。
- 一次装整个插件市场：94 个插件、202 个 agent、184 个 skill 是目录规模，不是使用建议。
- 重复安装：同一项目里同时用项目级安装和插件市场装同一个技能包，skills 会出现两份。
- 两条安装路径都装（做法 R）：原文明确说两个都装会让每个技能出现两份；只选一条。
- 安装时没勾 `setup-matt-pocock-skills`（做法 R），或跳过仓库级一次性配置，后面没有统一配置落点。
- 把用户调用型和模型调用型混着用（做法 R）：用户调用型不能调用另一个用户调用型。
- 手拷 hooks、在用户主目录安装、只信 README、忽略安全（第三方技能先通读 `SKILL.md` 并跑 doctor/audit；mod 以与 Claude Code 同等权限运行；Mobile Dev 会向 Sentry 上报插件错误、崩溃和聚合性能指标，不想要就设 `MOBILE_DEV_TELEMETRY=off`）。
- `description` 只写「做什么」没写「什么时候用」，技能就不会在合适时机触发。
- 配置模板照抄不动；以为 `settings.json` 靠 Plugin 装；盲目开 `bypassPermissions`。
- 拿 star 数当质量证据：所有列出的 stars 只说明关注度，不说明产出改善幅度。
- 跳过冷启动门禁、把项目架构知识塞进技能包、采信 agent 的自我报告（做法 H）。
- 让 agent 自己装 ui-ux-pro-max 的 CLI、用错包名、不 dry-run 直接 init、搞反 MASTER 与页面文件的优先关系（做法 I）。
- mod 的模块变量会被 hot reload 清空、state 没在类型契约里声明、把教程当稳定 API、只装在临时目录、一个 mod 塞多个模块入口（做法 G）。
- 出图失败就盲重试、把 `compare` 当成影响分析、以为 `meta.locale` 会翻译你写的内容（做法 J）。
- 装完 diagram-design 就当会自动更新、以为托管安装和可编辑安装可以同时改风格指南（做法 K）。
- 拿扫描版 PDF 直接转换、技术书选了纯文本抽取器、把 token 节省数字当结论、把版权书的生成 skill 分发出去（做法 M）。
- 跳过 leader 的实测调研、任务书里没有反作弊条款、让清理类技能直接删、让 neat-freak 删东西、在目标模式里跑还没有完成态的任务书（做法 N）。
- 把 pg-aiguide 的效果证据当结论（只有厂商一次演示）、把 schema 信息发到第三方端点、用单次 A/B 下结论、以为它对所有数据库都管用（做法 O）。
- 在未授权目标上跑 Claude-BugHunter、把插件安装当完整安装、把 `/hunt` 的阶段数当准确描述、把 README 的示例 transcript 当真实结果、把未勾选的路线图项当现有能力（做法 P）。
- 攒到最后才质检、让主 Agent 覆盖门禁的 FAIL 结论、门禁 FAIL 后从头重跑、把 skill 根目录当可写工作区、把题目附件改掉、把领域流程当通用框架搬走、把 math-modeling-skill 的论文直接提交（做法 Q）。
- 把作者主张当效果结论（做法 R）：共享语言减少啰嗦、红-绿-重构「结果代码好得多」、并行子 agent「互不污染」都是作者主张，原文没有指标定义、基线或对照数据。
- 更新 china-market-data 后忘记重新初始化、把东财 `--source dataapi` 当独立备用源、把终端预览条数当全部数据、忽略明文 HTTP 与多 agent 并发、把代码开源当数据开放授权（做法 T）。
- 把 Mobile Dev 当构建工具、在非 Apple Silicon Mac 或非 Codex desktop 上硬装、拿不到私有仓库访问权、以为物理 iOS 支持键盘和硬件按键、以为 iOS 模拟器支持 Display FPS、忽略物理 iOS 的 CPU/内存前置条件（做法 U）。
- 拿 README 的技能表当技能清单、把「装上了」当成「有效」、内网或不能访问 raw.githubusercontent.com 时硬用一行 curl（做法 V）。
- 只安装不激活、在安装的那个会话里验证、把缺失的观察日志当成技能质量差、只装 `SKILL.md`、自己动手改已安装的技能去「接上」观察结果、指望它在技能很少时也划算（做法 W）。
- 请求里不带具体框架和具体任务、把仓库徽章的 CI 状态或 11725 stars 当效果证据、期待 README 给出自动激活的准确率、不问清每个技能还需要什么、没配 Atlassian MCP server 就跑第 6 步、以为工作流会自动推进（做法 X）。
- 把作者自制的合成案例当效果证据（做法 Y）：四组案例是「刻意加入模板化表达的合成演示」，研究、数据、引文编号、投稿改动均为虚构，不能证明一般写作质量提升。
- 把 `content_lock.py` 的通过当「所有含义都不变」（做法 Y）：作者声明这些检查各自只证明其覆盖范围，不能证明所有含义不变或检测器分数。
- 在非 Codex 平台直接照搬调用语法（做法 Y）：README 的兼容性按官方文档核对，实际编辑验证只在本地 Codex 会话完成；非 Codex 平台的安装与调用细节在未提供的 `docs/agent-platforms.md` 里。
- 只装 `SKILL.md` 不装 `references/`（做法 Y）：仅文本平台必须同时提供参考文件，否则规则会缺上下文。
- 用 DOCX 抽取结果当可编辑 Word 交付（做法 Y）：抽取不保留所有样式、批注、修订记录、脚注或文本框。
- 从 PDF 抽取正文却不装 Poppler（做法 Y）：需要 `pdftotext`。
- 期待它自动串联其他编辑器（做法 Y）：README 明确说明不需要装 Humanizer，也不自动串联其他编辑器。
- 做法 Z：Codex 不先 `/hooks` 信任 routing hook 就期待路由触发；Pi 缺少 extension 提供的 subagent / question / wake-up 工具；把仓库 stars（1345）当效果证据；忽略 skills 会把 session transcripts 等读取内容发往模型 provider。
- 做法 AA：一次装全部 agent、把角色目录当效果证据、在 OpenCode 里装超过约 119 个 agent、把 app 的自动更新当成效果改善。
- 做法 AB：没有 T3 Code 环境就硬装；把 `delegate_task`、`t3_thread_launch`、`watch_pull_request`、`schedule_task`、`t3_thread_read/search`、`preview_*`、`device_*` 的名字当命令语法；`install.sh` 直接全局装而不先用 `--project` 试；不跑 `/setup-p3` 就指望跨模型 panel；把 68 stars 或 README 的「verification 严格到可以放心并行」当效果证据；忽略它是 pstack 在 T3 Code 上的重写，与做法 Z 混装两套。

## 证据与来源

- 「技能 = 文件夹 + `SKILL.md`，frontmatter 只需 `name` 和 `description`」来自 anthropics/skills 的官方 README 与模板；README 明确说技能「仅供演示与教育用途」，效果需自测。
- 「先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查」来自 jnMetaCode/superpowers-zh 的 README；没有 skill 正文和效果数据。
- 「自我纠正记忆、`SessionStart` 自动加载、知识平面」来自 rohitg00/pro-workflow 的 README；没有效果数据，且技能/命令数量在文档内自相矛盾。
- 「先小范围试装，不要整体 adopt」来自 genspark-claw、ECC、AAS、awesome-copilot 等材料的共同结论；`doctor`/`validate` 只验证装得上、格式合法，不证明产出更好。
- 「做对照、看返工轮数和首稿可用率」来自 anthropics/skills 的验证建议和 awesome-copilot 的最小试用方式；是方法主张，不是对照实验数据。
- 「第三方技能有供应链风险，先审查」来自 genspark-claw 和 awesome-copilot 的 README 警告。
- 「多来源知识打包」来自 yusufkaraaslan/Skill_Seekers 的 README；质量门禁 `--threshold` 可用，但缺少与人工基线的对照。
- feiskyer/claude-code-settings（MIT，约 1.6k stars）的安装命令、settings.json 模板、Copilot Gateway、VSCode 环境变量、`customApiKeyResponses`、`update-cc-plugins.sh`、四个 WebSearch MCP 与五条技能触发排查，均来自该仓库 README；效果全凭作者描述。
- deep-research 的产出目录、handoff 的交接文档字段与脱敏行为、codex-skill 的触发词与「只呈现不自动改码」、github-review-pr 的 `file:line` 与原文引用要求，均来自 feiskyer/claude-code-settings 的 README 描述，属作者主张。
- mod 路线的全部内容——mod 本质是 hook、以插件形式分发、版本要求 2.1.287+、`plugin.json` 与 `hooks.json`、`AbovePrompt` 与 `$.ui.resolve`/`Box`/`Text`、`$.session.usage()` 的三个字段、`$.state` 跨 hot reload、`types/index.d.ts` 的 `PluginState` 声明、`claude --plugin-dir`、以及「mods API 会随版本变化、mod 以与 Claude Code 同等权限运行、先 try 不要 adopt」——均来自调研《Getting started with Claude Code mods》；材料在完整模块的 `async function ta` 处被截断。
- 中文技术文档路线的安装命令、autocorrect 的三种安装方式与 `autocorrect -V` 验证、三个调用提示词示例、五步写作流程、四类核心规则要点、14 条 AI 腔清单的类别说明，均来自 leter/zh-tech-writing 的 README。规则来源为阮一峰《中文技术文档的写作规范》（public domain），另参考华为《产品手册中文写作规范》、LeanCloud《文档风格指南》、《中文文案排版指北》、Google Developer Documentation Style Guide、GB/T 15835-2011。其中「效果」一节是单个作者挑选的示例，属主张不是评测结果。
- 论文精读路线的全部内容均来自 Gaoyuan-0423/biomedical-paper-reader 的 README（v0.1.2，MIT）；精读质量本身、「不依赖固定 MCP、第三方 skill、Python 库或付费服务」的依赖声明均属作者主张。
- cline-pilot 路线的全部内容均来自调研《gongdear/cline-pilot》（MIT，91 stars）；两阶段策略「在生产 Java 后端上验证过」是作者自述；`session_report.py` 的参数含义原文未说明。该项目与 Cline 强绑定。
- ui-ux-pro-max 路线的全部内容均来自调研《nextlevelbuilder/ui-ux-pro-max-skill》，即该仓库 README。能力数字（192 条行业推理规则、79 种风格其中 50 种 active、192 套配色、74 组字体搭配、25 种图表类型、22 个技术栈指南、119 条 UX 指南）全部为作者自述；演示素材被作者自己标注为非本 skill 产物。
- archify 路线的全部内容均来自调研《tt-a1i/archify》，即该仓库 README（MIT，稳定版 v3.0.1）。它把 `validate --json` / `deliver --json` 的稳定规则码、`diagnostics[]`、两轮修正上限、原子替换交付写进了 README，是本手册里验收信号最具体的一条；但 star 数、Trending 排名、社区案例全部是创作者口径。本次调研在「与已有做法的关系」一节讲 OpenCode 时被截断。
- diagram-design 路线的全部内容均来自调研《cathrynlavery/diagram-design》，即该仓库 README。图型覆盖数量、版式语法数量、三种静态变体的可用性都是作者口径；本次调研在「重绘已有图（导入）」处被截断，导出与后续步骤缺失。
- wshobson/agents 路线的全部内容均来自调研《wshobson/agents》，即该仓库 README。94 插件 / 202 agent / 184 skill / 105 command / 16 orchestrator、40,149 stars 都是作者与指标口径；plugin-eval 的 LLM judge 与 Monte Carlo 层作者自己标注 experimental；GitHub Copilot 这条路径仓库仍声明支持并生成 `.copilot/`，但材料里的清单已判为 drop，两者存在差异。
- book-to-skill 路线的全部内容均来自调研《virgiliojr94/book-to-skill》，即该仓库 README。24×–51× 的 token 节省、Steps 0–10 的完整生成流程都在未提供的 `docs/` 里，属作者主张；输出质量没有第三方验证数据。
- khazix-skills 路线的全部内容均来自调研《KKKKhazix/khazix-skills》，即该仓库 README。本次只拿到 README，六个技能的 `SKILL.md` 正文均未提供；「效果一致」「确实省事」均为作者自述。
- pg-aiguide 路线的全部内容均来自调研《timescale/pg-aiguide》，即该仓库 README（Apache 2.0，1853 stars）。效果数据只有厂商自己的一次 e-commerce schema 演示（约束多 4 倍、索引多 55%、采用 PG17 推荐模式），没有任务集、多次重复、第三方复核，也没说明「更好」的判定细则；README 未说明公共 MCP 服务的可用性保证、速率限制与数据隐私。
- Claude-BugHunter 路线的全部内容均来自调研《elementalsouls/Claude-BugHunter》，即该仓库 README。83 个技能、15 个命令、681 条披露报告模式都是作者口径；README 没有给改善幅度数据；示例 transcript 被作者自己标注为非真实录制；README 列了 5 个阶段名却称 6 阶段。
- math-modeling-skill 路线的全部内容均来自调研《XiaoMaColtAI/math-modeling-skill》，即该仓库 README（版本 1.3.0，1848 stars）。「CUMCM 默认约 15000 字词单位、约 20 页」README 自己注明是非官方要求；「每道子问题最多使用两个独立模型体系」「至少 8 幅正式图」是作者设定的质量基线；全文没有任何「用了它之后结果变好多少」的评测数据。本次材料只有 README，角色规范与门禁判定标准在 `SKILL.md`、`references/roles/*/SKILL.md` 等子文件中。
- mattpocock/skills 路线的全部内容均来自调研《mattpocock/skills》，即该仓库 README。各 `SKILL.md` 的实际提示词内容不在材料里，效果表述全部是作者主张，原文没有给任何指标定义、基线或对照数据；原生 Codex 插件在路线图上，属未实现项。
- google/skills 路线（做法 S）的全部内容均来自调研《google/skills》，即该仓库 README。GitHub 指标显示 20653 stars，不构成有效性证据；原文只有 README，未展示任何具体 skill 的完整步骤、提示词、配置样例。
- china-market-data 路线（做法 T）的全部内容均来自调研《clawyi-com/china-market-data》，即该仓库 README。15 层、87 个端点、34 个数据来源、除 iwencai 外免 API Key 是原文给出的能力数字；作者主张：这不是投顾建议，代码开源不代表数据开放授权，免费或免 Key 不等于可自由商用。局限：Windows 命令未经过完整平台实测；部分接口仍使用明文 HTTP；东财节流主要在单进程内生效；原文未给出与人工查询对比的量化指标。
- Mobile Dev 路线（做法 U）的全部内容均来自调研《callstackincubator/codex-mobile-dev-plugin》，即该仓库 README。所有功能描述都没有配套数据、案例或评测；README 未给出任何性能提升数字或对比基准。仓库当前为 private，star 数 64，属早期项目，只覆盖单机开发者视角。
- agentic-dev-kit 路线（做法 V）的全部内容均来自调研《ARYANK-08/agentic-dev-kit》，即该仓库 README。技能表当前只列出 `explain` 一个技能，且没有展示任何一个 `SKILL.md` 的实际内容，所以「参考其提示与上下文组织方式」在现有材料里没有落地证据。仓库 37 stars，不构成有效性证据。
- task-observer 路线（做法 W）的全部内容均来自调研《rebelytics/one-skill-to-rule-them-all》，即该仓库 README。作者自述在其 81 个技能中记下 1,600+ 条观察、「大部分被转成了技能改进」；skills.sh 报告 9,000+ 次安装（作者注明是下界）。材料只到 README 一层，`SKILL.md`、`references/`、`scripts/` 的内容都未提供，观察质量与误报率无法判断。
- Jeffallan/claude-skills 路线（做法 X）的全部内容均来自调研《Jeffallan/claude-skills》，即该仓库 README。67 个技能、12 个类别、371 个参考文件、9 个工作流命令，版本 0.4.18，MIT 协议，11725 stars。自动激活的实际准确率、误激活率无数据；9 个 workflow 命令的实际效果无数据；仓库徽章里的 CI 状态与技能是否改善使用者的工作结果无关。本次输入只有 README，没有 `SKILL.md`、`references` 内容、`QUICKSTART` 或其他文档的正文。
- academic-deai 路线（做法 Y）的全部内容——用途（论文校对、语言润色、学术翻译、授权范围内结构修订）、各平台安装路径表、clone + `cp -R` 安装命令、升级先备份再整体替换、中英文提示词原文、编辑规则清单、`validate_package.py` / `unittest` / `content_lock.py --strict` 三条验证命令、PDF 需 Poppler、DOCX 抽取的保留范围限制、无需 Humanizer 与不自动串联其他编辑器、结构编辑思路参考 Humanizer 3.1.0——均来自调研《heise3/academic-deai》，即该仓库 README（v3.1.0，MIT）。属作者主张、没有独立验证的是：模型中立、跨平台可用、效果随模型不同；非 Codex 平台的兼容性按官方文档核对，实际编辑只在本地 Codex 会话验证。效果证据只有作者自制的四组合成案例（中文研究短文、English abstract and discussion、技术综述、审稿回复），其研究、数据、引文编号、投稿改动均为虚构；四例用 3.0.0 执行，3.1.0 保留原稿与修订稿并更新展示与平台说明；两个编辑回合读取 Skill 后修订，另一个模型回合提取并核对 41 条原稿命题。作者自述没有独立人工盲评、模型间对照或检测器分数，并声明案例「展示本次修改，不证明一般写作质量提升或其他工具的排名」。局限：需要支持 Agent Skills 的平台或能加载完整参考文本的环境；DOCX 交付能力受限；PDF 抽取需额外安装 Poppler；本次输入只到 README 一层，非 Codex 平台的安装与调用细节在未提供的 `docs/agent-platforms.md` 中。
- pstack-claude 路线（做法 Z）的全部内容——pstack 原为 Lauren Tan 写的 Cursor 插件栈、本仓库移植到 Claude Code/Codex/Pi 及其他 harness、核心入口 `poteto-mode` 路由技能、三条安装命令、`setup-pstack` / `/pstack:setup-pstack` 的用途、reasoning effort 示例 `arena runners: opus @xhigh, fable @max`、Claude Code 通过 `pstack:effort-<level>` / `pstack:poteto-agent-<level>` agent 派发、Codex 需 `/hooks` 信任、Pi 的 extension 与 `/loop`、`/skill:<name>`、poteto-mode 入门提示词、bug 流程交付「修复 + 失败与通过的证据」、playbooks 覆盖范围——均来自调研《michael-denyer/pstack-claude》，即该仓库 README。属作者主张、没有数据支撑的是：「improves agent outcomes」「keeps your code concise, simple and verified」、bug 流程产出「失败与通过证据」；本线索给到的数字只有仓库指标（1345 stars、今日 222 stars），不能作为效果证据。完整工作流定义在未抓取的 `docs/reference.md` 与 SKILL.md 中，无法核对 playbook 的实际步骤；skills 会把 session transcripts 等读取内容发往模型 provider。
- agency-agents 路线（做法 AA）的全部内容——按 division 组织的 agent 角色目录、三层交付形态（桌面 app / 安装脚本 / 纯参考）、各工具安装命令、`--tool` / `--division` / `--agent` / `--agents-file` / `--list teams` / `--dry-run` 参数、`convert.sh` 两步流程、按 runbook 生成 team.txt 的 python 片段、OpenCode 约 119 个 agent 上限——均来自调研《msitarzewski/agency-agents》，即该仓库 README。属作者主张、没有证据的是「Production-Ready」「battle-tested workflows」「可衡量的结果」「成功指标」等；README 没有给出指标定义、评测方法或对照数据。材料在 Marketing 表格中途被截断；只给了角色目录，没给 agent 文件正文。仓库指标 star 数（157,073，今日 595）来自输入元数据而非 README 正文，且数值异常高，不宜作为质量证据引用。
- p3-stack 路线（做法 AB）的全部内容——把 pstack 在 T3 Code 上重写、`delegate_task` 取代 Cursor 的 Task 工具、`t3_thread_launch` 绑定 worktree 与分支、`watch_pull_request` 事件唤醒、`schedule_task` 无人值守、`t3_thread_read/search` 取回线程记忆、`preview_*` / `device_*` 产出截图录像、skills 目录与 24 条 principle、`p3-mode` playbook 路由表、`git clone` + `install.sh`、`./install.sh --project /path/to/repo`、`/setup-p3` 写 `p3-models.md`、`/p3-mode`、`/p3-help`——均来自调研《uzairansaruzi/p3-stack》，即该仓库 README。属作者主张、没有数据支撑的是：「pstack 是对 AI slop code 的回应」「verification 严格到可以放心并行」「一个 worktree 一个写者由应用而非建议保证」；仓库指标 68 stars，不构成有效性证据。只有安装与入口命令可照做；`delegate_task`、`t3_thread_launch`、`watch_pull_request`、`schedule_task`、`t3_thread_read/search`、`preview_*`、`device_*` 都只有名称和一句话用途，没有命令语法、配置样例、参数格式或示例输出；`p3-models.md` 的格式也没有展示。适用条件：必须在 T3 Code 环境内使用；skills 和 24 条原则源自 poteto 的 pstack（MIT），本仓库自己声明只是「重接线」。README 未说明技能内容的完整度、维护活跃度、T3 Code 的获取门槛。
- 文中提到的 star 数（如 anthropics/skills 179219、awesome-copilot 39,568、pro-workflow 2.9k、feiskyer/claude-code-settings 约 1.6k、zh-tech-writing 312、biomedical-paper-reader 31、cline-pilot 91、wshobson/agents 40,149、book-to-skill 33,277、khazix-skills 21,099、pg-aiguide 1853、math-modeling-skill 1848、google/skills 20653、Mobile Dev 64、agentic-dev-kit 37、one-skill-to-rule-them-all 3,115、Jeffallan/claude-skills 11725、p3-stack 68）来自 metrics，不构成有效性证据。

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
