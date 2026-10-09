# 用小范围对照把 agent 技能装进工作流，而不是装完就信

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决“装了技能但不确定是否真的改善工作”的问题：给出小范围试装、对照验证、再固化或分发的工作方法。
> 先试这一步：挑一个非关键项目和一类重复任务，只装一个技能包（如 work-humanizer 或做法 A 里的任一），同一任务有/无技能各跑 3 次做对照。
> 最近修订：2026-10-10

## 解决什么问题

你已经在用编码 agent、写作 agent 或通用 agent，但每次都要重复描述同一套规范，或者不确定装一个技能包是否真的减少了返工——甚至因为一次装太多，上下文反而更乱。这篇手册给出一个可照做的流程：先小范围试装一个现成技能包，用同一任务做有/无技能的对照，确认有效后再考虑把自己的重复工作写成 `SKILL.md`，或者把一本反复查阅的技术书、一份内部文档半自动转成按需加载的技能。

它也覆盖一批具体场景：让 agent 代理编码 CLI 跑长任务并拿硬证据验收；给 agent 补一块行业设计知识；把一句模糊想法写成可让 agent 独立跑几小时的任务书；写一个把会话状态嵌进界面的 Claude Code mod；让 agent 把一句话描述／一个代码仓库变成可交互的架构图、工作流图、时序图、数据流图、生命周期图；让 agent 检索中国金融市场数据；把移动端模拟器与真机画面接进 Codex 聊天；把多步复杂任务拆成三阶段并加门禁；把中英文学术写作去模板化改写并用命题级核对保住数字、引文与证据强度；让路由技能自动选工作流并对 bug 交出失败→通过证据；按职能只装少量 agent 角色并用真实任务与默认提示对照；在 T3 Code 里用 p3-stack 按 playbook 路由并用 worktree 与 PR 监视减少等待和冲突；审计并改进自己的 `SKILL.md`；让 agent 把结论、方案对比、多步流程、仓库模块、逐句批注、时间线和一段历史渲染成一页可离线打开的单文件 HTML；把自己的 `SKILL.md` 校验、打包并分发到多端；给 agent 补一块 SwiftUI 领域知识并按需触发审查。

新增做法 AG：当你写的是销售邮件、营销文案、客服回复、HR 通知、法务信函这类“字面即承诺”的工作文本，用 `phuryn/work-humanizer` 去掉 AI 腔，同时用事实审计、承诺强度检查和 Interview mode 保住事实、承诺与限定条件。它优先喂你自己的笔记、语音转写或自写粗稿；如果只给 AI 草稿，它只把草稿当要点清单。

## 适用与不适用

适用：

- 你已经在用 Claude Code、Codex CLI、Cursor、Gemini CLI 或类似 agent，有一类反复出现、有明确规范的任务。
- 愿意在一个非关键项目上做一周对照，而不是安装成功就认为改善。
- 需要给 agent 补一块领域知识：UI/UX 设计、Postgres、Google 产品与技术、中国金融市场数据、移动端模拟器与真机观测、中英文学术写作、SwiftUI / Apple 平台开发、工作写作去 AI 腔。
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

不适用：

- 没有明确重复任务，只想“装个工具看看”；不愿做对照验证，只凭安装成功就认为改善。
- 直接在生产关键项目上全量安装；一次装完整个插件市场。
- 只看 stars、README 徽章或 CI 状态就决定采用。
- 各做法自己的边界见对应小节。例如：E 只针对中文技术文档；F 只针对生物医学论文；M 不适用于无合法访问权的书或打算再分发第三方版权书生成的 skill；O 只在 Postgres / TimescaleDB / PostGIS 任务上有用；P 只对自有或书面授权资产；Q 的领域内容不通用；T 不支持直接驱动交易或投顾建议；U 需要 Apple Silicon Mac + Codex desktop + 私有仓库访问权；X 面向全栈开发；Y 需要能加载完整 Skill 文件夹的环境，且 DOCX 抽取保留不了复杂样式、批注、修订记录、脚注与文本框；AF 只覆盖 SwiftUI / Apple 平台开发；AG 的材料没有覆盖合同或其他法律文件，也不承诺通过 AI 检测器，且 Interview mode 里的作者是模拟的。

## 前置条件

通用：

- Node.js ≥ 18，npm/npx 可用；Git 可用。
- 一个可回滚的非关键项目，不要在主仓库或用户主目录下做项目级安装。
- 对目标技能目录有写权限，如 `~/.claude/skills/`、`~/.agents/skills/`、`~/.cursor/skills/`。
- 走 MCP 时，配置文件里写绝对路径。
- 安装第三方技能前，先通读它的 `SKILL.md`，并跑运行时的 doctor/audit 工具。

各做法额外前置：

- A：无额外。B：一件每周重复、有明文规范的工作。C：`pip install skill-seekers`。
- D：你的提供商端点与 key，以及你网关实际提供的模型名。
- E：可用的 `npx` 或 `git`；可选装 autocorrect。F：宿主能读 PDF/图像。G：Claude Code 2.1.287 或更高。H：Cline CLI；Python 3；支持 Agent Skills 规范的宿主。I：Node/npm 装 CLI；本机 Python 3.x。J：本地 Node 环境。K：一个受支持的 Agent Skills 宿主。L：Claude Code 或 `gh`/可用 `npx`。M：本机 Python 并能安装抽取器。N：支持 Agent Skills 的 Agent；git、`CLAUDE.md`/`AGENTS.md`、`docs/`。O：本机 `npx`；目标 agent 支持 Agent Skills 或 MCP。P：已装 Claude Code；只对自有或书面授权资产使用。Q：支持本地 Skills 的宿主；可写的 `PROJECT_ROOT` 与只读的 `SKILL_ROOT` 分开。R：支持 agent skills 的编码 agent。S：Node.js/npx；Google Cloud 账号、项目和权限。T：Node.js 22.20+ / npm；Python 3.9+。U：Codex desktop + Apple Silicon Mac；Xcode 26+ 与 simulator runtime。V：本机已安装 Claude Code。W：Node.js；`SKILL.md`、`references/`、`scripts/` 三部分放在一起。X：已安装并使用 Claude Code。Y：Python 3.10+；PDF 文本抽取需 Poppler。Z：先装好对应 harness；Codex 需先通过 `/hooks` 信任路由 hook。AA：本地有 git 与 bash。AB：一台能跑 T3 Code 的机器。AC：Claude Code 环境或 claude.ai 账号；本地 Python 3.8+。AD：Node.js ≥ 20；agent 能执行 shell 命令。AE：用现成技能需要 Claude Code 或支持 Agent Skills 的 agent；用这套流程分发自己的技能，只需 Claude Code + Python 3。AF：用支持 Agent Skills 的编程助手；安装需要 Node/npx，或用 Claude Code 插件市场。AG：一个能加载 skills 的 agent（Claude Code、Codex 或其他）；要处理的文本；最好有作者自己的笔记、语音转写或自写粗稿；跑 `check.py` 需要 Python 和能执行代码的 agent 环境。

## 操作步骤

怎么选：先做做法 A；A 里某个技能确实有效、且你有一件每周重复且规范明确的工作，再做做法 B。其余按场景选：C 多来源知识打包；D 补模型端点/权限/搜索；E 中文技术文档写作与审稿；F 单篇论文精读；G 写一个 Claude Code mod；H 用 Cline CLI 代理长任务拿硬证据验收；I 补 UI/UX 设计知识；J 出带交互的单文件 HTML 图；K 出品牌一致的静态 HTML+SVG 图；L 从大插件市场只装一个单元并按任务档位选模型；M 把书或内部文档转成按需加载技能；N 把模糊想法写成任务书并给破坏性操作加闸门；O 补 Postgres 领域知识与版本化文档检索；P 在授权安全场景按主题加载安全技能库；Q 把多步任务拆成三阶段加门禁；R 装一套小而可组合的工程技能集；S 从 google/skills 按任务只装一个；T 让 agent 检索中国金融市场数据并核对来源与时间戳；U 把移动端模拟器与真机画面接进 Codex 聊天；V 用一行 curl 装单个 Markdown 技能；W 用元技能观察你怎么用技能；X 装一套全栈开发技能包按请求自动激活；Y 把中英文学术写作去模板化改写并用命题核对保住事实；Z 用路由技能自动选工作流并对 bug 交出失败→通过证据；AA 按职能只装少量 agent 角色并用真实任务与默认提示对照；AB 在 T3 Code 里用 p3-stack 按 playbook 路由并用 worktree/PR 监视减少等待和冲突；AC 审计并改进自己的 SKILL.md；AD 让 agent 把结论、方案对比与流程解释渲染成一页可离线打开的 HTML；AE 把自己的 SKILL.md 校验、打包并分发到多端；AF 给 agent 补一块 SwiftUI 领域知识并按需触发审查；AG 给工作写作去 AI 腔并保住事实与承诺强度。

几组容易混的：

- J 与 K：J 出带 JavaScript 交互的单文件 HTML，验收靠 `validate`/`deliver` 的机器收据；K 默认出无 JS、无外部图片依赖的静态 HTML+SVG，验收靠品牌 onboarding 阶段的对比度校验和 fidelity receipt。要交互选 J，要品牌一致性和静态可交付选 K。
- N 与 Q：N 解决“怎么把一句模糊想法写清楚”，产出含目标七问的任务书，不绑定领域；Q 解决“多步任务怎么分阶段推进、每阶段什么时候该拦”，产出分阶段的固定交付物加五道门禁。想不清楚先用 N；已经清楚、只是步骤多且容易一步错步步错，用 Q。
- B、R、W：B 是把自己的重复工作写成单个 `SKILL.md`；R 是先用别人拆好的一整套技能集；W 不替你写技能，也不改你已装的技能——它并行观察你如何使用其它技能，产出观察日志和 staged 更新，由你复核后安装。
- A 与 V：A 走插件市场或 `npx skills add`，装上的是一个技能包；V 只把单个 `SKILL.md` 拷到 `.claude/skills/` 或 `~/.claude/skills/`，不装仓库、不装插件。
- X 与 R / L / I：R 是小而可组合的工程技能集；X 是一个 Claude Code 插件，67 个专用技能按请求自动激活；L 是一个大插件市场，可以按任务只装一个单元；I 补的是 UI/UX 设计知识。
- T 与 A：需要中国金融数据检索、且宿主能执行本地 Python 时用 T。
- U 与 A：U 绑定 Codex desktop + Apple Silicon Mac + 私有仓库访问权，解决移动端模拟器/真机的观测与诊断。
- W 与 A：W 的产出是“哪些摩擦该被沉淀成技能”的清单，以及一批需要你自己安装才生效的 staged 更新。
- Y 与 E：E 面向中文技术文档，装的是 leter/zh-tech-writing；Y 面向中英文学术写作，装的是 heise3/academic-deai，且额外提供 `content_lock.py` 做命题级核对。要文档去 AI 腔用 E；要论文去模板化又不敢改数字引文，用 Y。
- Z 与 A：Z 同样走插件市场安装，但核心是 `poteto-mode` 路由技能与按角色配模型/推理强度；A 是通用小范围试装流程，Z 也必须套用 A 的对照方法。
- AA 与 X / R：AA 装的是按职能组织的 agent 角色文件；X 是全栈技能包按请求自动激活；R 是可组合工程技能集。
- AB 与 Z：两者都是 pstack 家族。Z 是 `pstack-claude`；AB 是 `p3-stack`，在 T3 Code 上重写。已经在 T3 Code 里工作才选 AB。
- AC 与 B/R/W：AC 审计你已有的 `SKILL.md`，不替你写新技能，也不观察你。
- AD 与 J / K：J 出交互图，K 出品牌静态图，AD 出“一页结论／解释／对比”的单文件 HTML。
- AE 与 B / AC：B 写技能；AC 审计技能；AE 校验、打包、发布和跨 agent 分发。
- AF 与 I / E / Y / S / O / T / AG：都是给 agent 补一块领域知识。AF 是 SwiftUI；AG 是工作写作去 AI 腔并保住事实与承诺强度。
- E、F、G、H、I、J、K、L、M、N、O、P、Q、R、S、T、U、V、W、X、Y、Z、AA、AB、AC、AD、AE、AF、AG 都必须套用 A 的对照方法，不要跳过验证直接纳入常规流程。

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

只有你有自建网关、或想用已有订阅走非官方 API 时才做。`settings.json` 不通过 Plugin 配置，必须手动设置。把 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_API_KEY` 指向你的提供商端点。权限确认：模板 `defaultMode` 为 `acceptEdits`；想完全跳过确认可改 `bypassPermissions`，但先了解安全风险。非官方 API 环境补网页搜索：用 MCP 补 Tavily / Brave / Firecrawl / DuckDuckGo Search MCP。可选零额外成本路径：已有 GitHub Copilot 订阅时，`mv ~/.claude ~/.claude.bak`，`git clone https://github.com/feiskyer/claude-code-settings.git ~/.claude`，`npx copilot-gateway@latest start --proxy-env`。

### 做法 E：中文技术文档写作与审稿（按 A 的对照法验证）

装 skill：`npx skills add leter/zh-tech-writing -g`，或 clone + cp 到 `~/.claude/skills/`。推荐装 autocorrect。第一次只审不改：`/zh-tech-writing 检查 docs/api.md，只列问题，不要改`。再让它改一版并逐条 diff 审阅。核心规则：句子逗号隔开的每一截尽量在 20 字以内；多用肯定句和主动语态；直接用动词；每段第一句说重点；标题不跳级；少用四级标题；加粗和列表不滥用。按需读 `references/typography.md` 和 `references/manual-structure.md`。

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

定位：`phuryn/work-humanizer` 是一个 Agent Skill（一份 `SKILL.md` 加两个辅助文件，另含 `check.py`），用来去掉工作写作里的 AI 腔，同时保持事实、承诺和限定条件的强度不变。适用的工作是销售邮件、营销文案、客服回复、HR 通知、法务信函这类「字面即承诺」的文本。它可以在任何加载 `SKILL.md` 的 agent 里跑，原文点名 Claude Code、Codex、Cursor。

它区别于「叫 AI 改得自然点」的地方：不加错别字、不硬塞俚语、不编轶事；保留承诺强度；草稿缺了只有作者知道的东西时，先问你几个问题再写。

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

第二种用于草稿信息不全、需要它先访谈你的场景；第三种直接给文件路径。

3. 尽量喂自己的原始素材。粘贴你的笔记、语音转写，或你自己写的粗稿。它会以你的论证、你的顺序为主干，能保留的句子就保留；如果你同时给了一份 AI 草稿，它只把草稿当作要点清单用。

4. 判断要不要走 Interview mode。判断标准：这篇草稿能不能被任何拿到同一句话要求的人写出来？如果能，编辑救不了它，缺的是真实的例子、数字、哪里出了错、作者本人怎么想。此时用第 2 步第二种写法触发；它会问最多 5 个「回答成本很低」的问题，然后按你的回答重建全文。

5. Rewrite mode（默认路径）。它会先列出每一条事实及其确定程度，然后以作者本人的声音重新写，而不是在 AI 句子上打补丁。它按 AI 痕迹的强弱优先修，最后给一份逐句事实审计。它针对的痕迹包括：没人主张过的对比、停顿指路句、复述式结尾、堆叠格言、替读者思考的句子、夸大和泛泛而谈、位置错误的模糊限定、整齐划一的句长、什么也没说的标签、把破折号改道成分号、装饰、聊天残留。

6. 可选的机械扫描。前提：agent 能跑代码，或你本地有 Python。原文说 agent 能执行代码时会把这一步当作最后检查：

```text
python skills/work-humanizer/check.py draft.md
```

它检查破折号、分号、AI 常用词、填充式过渡、停顿指路句、句长区间。

7. 需要更短版本时。在有理由的情况下它会另外给一个约一半长度的选项，并列出会删掉什么；它绝不自行删减，删不删由你决定。

仓库结构：`skills/work-humanizer/`（`SKILL.md`、`tells.md` 词表、`check.py`）、`examples/`、`evidence/`、`tests/`。许可证 MIT。

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
- 分发类（做法 AE）：路径 A 用现成技能，在本地 Claude Code 里执行 `npx skills add ishuagrawal/skills --skill video-by-reference` 或走插件市场命令；路径 B 更推荐：照做法 AE-2 建一个自己的 `skills/<name>/SKILL.md`，跑 `python3 scripts/check_skills.py` 和 `claude plugin validate . --strict`，通过后 `./scripts/release.sh 0.1.0`，再到另一台机器上 `npx skills add <你的仓库>` 装上。
- SwiftUI 领域技能类（做法 AF）：选一个已有 SwiftUI 项目或小 demo。先不用技能，让同一个 agent 审查同一段代码并记录问题列表；再用 `/swiftui-pro`（Codex 用 `$swiftui-pro`）审查同一段代码，记录问题列表；也可以用 `/swiftui-pro Check for deprecated API` 或 `$swiftui-pro Focus on accessibility` 只审一项做对照。
- 工作写作类（做法 AG）：挑 3–5 篇手头真实的 AI 起草文本（例如一封销售邮件、一条客服回复、一篇内部通知），保留原始 AI 草稿。每篇做两个版本。A 版：直接对同一个模型说「改写得更像人写的」。B 版：装好 work-humanizer 后按第 2 步调用；如果能拿到自己的笔记或转写，就按第 3 步一起给；草稿信息明显不全的，按第 4 步走 interview 路径。A、B 两版都跑一遍 `python skills/work-humanizer/check.py`，记录机械项通过情况。让 2–3 位同事盲看，问和原文同样的两个问题：哪个更像熟练的人写的（把原始 AI 草稿混进候选里），哪个你会真的发出去（把原始 AI 草稿当作「作者本意」展示给他）。逐条比对 A、B 相对原稿删了什么、改了什么、加了什么，重点看承诺、条件、道歉语气有没有被改动。

可观察的指标：

- 通用：人工修改次数 / 返工轮数是否下降；首稿可用率；背景重述次数；输出一致性；单次任务耗时；规则类返工次数。
- 做法 H：该批次测试是否通过、是否产出非空文件、git 是否有预期改动；同一断言连续失败次数是否达到 3 次。
- 做法 I：交付前检查清单的 8 条是否成立；跨会话复用 `MASTER.md` 后是否还需要反复重说同一套配色、字体和反模式。
- 做法 J：交付是否原子替换；按 `diagnostics[]` 修的轮数；仓库图节点是否带 `SRC n` 并能打开 Git 校验过的文件与行号范围。
- 做法 K：品牌 onboarding 后是否还需要手动改配色和字体；fidelity receipt 里有没有 fallback；产物是不是单个自包含 HTML。
- 做法 L：同一任务的完成时间与返工次数；单次会话加载的组件数量与 token 或费用变化；同一提示重复 3–5 次的结果一致性。
- 做法 M：8 个已知答案题的命中数与引用章节是否对得上；书中明确没有的那题是否被回答「书里没有」，应为 0 幻觉；按需加载与整本塞上下文的 token 对比。
- 做法 N：任务书是否七问全有答案；长程执行中中途纠偏次数；验收时能否逐条贴出实际命令输出；是否出现「指标达成，事一件没干」。
- 做法 O：约束数量；索引数量与类型；是否用了与目标 PG 版本匹配的现代语法；人工 review 的返工次数。
- 做法 P：7-Question Gate 是否在提交前拦下不该提交的发现；技能是否按主题自动加载；evidence-hygiene 是否把截图里的 cookie 与 PII 脱掉。
- 做法 Q：五个门禁的通过/失败记录；门禁拦截率；`results/复现清单.json` 是否齐全；回归测试是否通过。
- 做法 R：`/grill-with-docs` 后 `GLOSSARY.md` 与 ADR 是否被内联更新、术语是否一致；`/tdd` 是否按红-绿-重构一次一个垂直切片；`/code-review` 的两个轴是否分开跑。
- 做法 S：任务完成时间、一次性通过率、人工干预次数、错误率、权限范围是否收敛。
- 做法 T：数据获取成功率；输出是否携带报价来源、行情时间和抓取时间；失败时是否明确报错而非返回空数据。
- 做法 U：从「描述问题」到「Codex 指到具体元素或堆栈」的耗时；切换模拟器、IDE 与终端的次数；固定场景前后 CPU、内存、Display FPS、Android jank 的对比。
- 做法 V：是否被自动触发；产出是否符合 `description` 描述的形态；同类请求重复多次是否稳定；相比不用技能时自己写的提示词长度是否明显缩短。
- 做法 W：观察条数、被接受并装入的技能改动数、新建技能候选数；同一个坑是否还在多个项目里被反复写进 project memory。
- 做法 X：激活是否命中；返工轮次；交付物质量；流程链收益；`/common-ground` 暴露出的、你确实没交代且会影响结果的假设数。
- 做法 Y：模板化表达减少；事实与证据不变；无新造事实；作者声音保留；交付质量。
- 做法 Z：是否产出可核验的失败→通过证据；是否减少人工纠正路由或流程的次数；最终 diff 的规模与新增抽象是否更小；达到通过状态所需往返轮数是否下降。
- 做法 AA：角色激活是否命中；同一任务与默认提示相比返工轮数、人工纠正次数、首稿可用率；OpenCode 下是否因 119 上限静默丢弃 agent。
- 做法 AB：`/p3-mode` 是否按 playbook 走完；多 worker 的 worktree/分支冲突次数；`watch_pull_request` 是否真的免轮询；`schedule_task` 是否在无人值守时跑完；同一类任务返工轮数、人工修正次数是否下降。
- 做法 AC：validator 退出码是否从 `1` 变 `0`；该技能 error 数是否归零、warning 数是否下降；description 改成第三人称并写清 what + when 后触发正确率是否提高；REFINE 后 `SKILL.md` 是否更短。
- 做法 AD：同一问题的输出 token 与耗时；页面是否单文件、可离线打开；agent 是否只在相关概念/多步流程/多方案对比时出页；always-on 后常规回答是否稳定在 2–4 个面板、页面不自动弹开、回复末尾有 `file://` 链接。
- 做法 AE：安装成功率；校验结果是否 0 错误通过；分发效率；任务收益；更新链路是否能拿到新版本。
- 做法 AF：弃用 API 检出数量与修复数量；VoiceOver / 无障碍问题检出数量；性能反模式检出数量；人工确认的有效问题占比与误报率；修复后编译通过率、测试通过率、代码复杂度或行数变化。
- 做法 AG：「愿意发出」的选择比例——对照原文，work-humanizer 48% 对单行提示 1%，如果 B 版明显高于 A 版，说明有效。每篇的意义改动条数——对照原文约 1.5 处/篇（18 处 / 12 篇），blader/humanizer 约 2.75 处/篇（33 处 / 12 篇）。编造事实数——原文在五个测试集共 56 篇改写文本中 work-humanizer 没有编造事实。机械项——`check.py` 的检查项通过情况。承诺与条件强度——逐条看有没有把「知悉」升格成「道歉」、给 offer 附加条件、把责任推给客户。

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
- 做法 AC：跳过基线直接改，先跑 `--all` 和 `--json` 存基线，再改 2–3 条并复跑对比。
- 做法 AD：开了 always-on 但每句话都出页、或页面对结论没有增量，先按规则里跳过的情形收紧。
- 做法 AE：把 `check_skills.py` 或 `claude plugin validate . --strict` 的 0 错误当成效果结论——它们只证明格式与规范合规。
- 做法 AE：不用 `./scripts/release.sh` 发布，只手动改文件或打 tag，导致 `version` 字符串没变，Claude Code 不把这次 push 当成新版本。
- 做法 AF：把 5300 stars 或「built on thousands of hours」当效果证据。
- 做法 AF：不做基线就直接 `/swiftui-pro` 审一遍，然后把所有新增发现都当真实问题。
- 做法 AF：修完不重新编译、不跑测试，只看建议读起来对不对。
- 做法 AG：把「AI 评委同意」当成「人类读者同意」；材料里的评委是 AI 不是人，且评委之间对「human」有分歧。
- 做法 AG：指望它把文本变成能通过 AI 检测器；原文自己的 Pangram 数据说 work-humanizer 的重写版仍被判定为 AI（2–4% human）。
- 做法 AG：把结论外推到合同或其他法律文件；原文样本里没有合同或其他法律文件。
- 做法 AG：直接重写一份信息不全的 AI 草稿，却不走 Interview mode；原文的判断标准是：如果这篇草稿能被任何拿到同一句话要求的人写出来，编辑救不了它。
- 做法 AG：把 Interview mode 里模拟作者的流程当成真人场景已测；原文自陈这是局限。

注意：`doctor`、`validate`、`npm test`、`claude plugin validate`、`npx @anthropics/skills-ref validate`、`archify doctor`、`validate --json`、`python -m unittest discover -s tests`、`validate_skill.py`、`check.py` 这类检查只能证明「技能或 mod 装得上、格式合法、不带危险命令、图能通过校验、回归测试能过、技能符合规则表」，不能证明「产出更好」。效果必须自己对照。做法 Y 的 `validate_package.py`、`unittest`、`content_lock.py --strict` 同理。做法 AC 的 `validate_skill.py` 只覆盖它那 46 条规则。做法 AE 的 `check_skills.py` 与 `claude plugin validate . --strict` 只证明规范与格式。做法 AG 的 `check.py` 只检查机械项（破折号、分号、AI 常用词、填充式过渡、停顿指路句、句长区间），不检查承诺强度、事实是否被改动，也不检查人类读者是否愿意发出。

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
- 把作者自制的合成案例当效果证据（做法 Y）：四组案例是「刻意加入模板化表达的合成演示」，不能证明一般写作质量提升。
- 把 `content_lock.py` 的通过当「所有含义都不变」（做法 Y）。
- 在非 Codex 平台直接照搬调用语法（做法 Y）。
- 只装 `SKILL.md` 不装 `references/`（做法 Y）。
- 用 DOCX 抽取结果当可编辑 Word 交付（做法 Y）。
- 从 PDF 抽取正文却不装 Poppler（做法 Y）。
- 期待它自动串联其他编辑器（做法 Y）。
- 做法 Z：Codex 不先 `/hooks` 信任 routing hook 就期待路由触发；Pi 缺少 extension 提供的 subagent / question / wake-up 工具；把仓库 stars 当效果证据。
- 做法 AA：一次装全部 agent、把角色目录当效果证据、在 OpenCode 里装超过约 119 个 agent。
- 做法 AB：没有 T3 Code 环境就硬装；把 `delegate_task`、`t3_thread_launch`、`watch_pull_request`、`schedule_task`、`t3_thread_read/search`、`preview_*`、`device_*` 的名字当命令语法；`install.sh` 直接全局装而不先用 `--project` 试。
- 做法 AC：把 `validate_skill.py` 的退出码 0 当成效果结论；跳过基线直接改；把 NM1–NM5 等关于新模型的论断当事实；只装 `SKILL.md` 不装 `references/` 与 `scripts/`；把 `--ban-em-dash` 当成必选项；在 claude.ai 上没开代码执行就跑 validator。
- 做法 AD：把 README 的 token 比例当成本项目的实测收益；开了 always-on 却不写跳过规则；以为装完会自动更新、以为 Claude Code plan mode 下也会出页面；手改配置文件去调 `open` / `theme` / `mode` / `style`；不满足 Node.js 20+ 或在不允许执行 shell 的宿主上硬装。
- 做法 AE：把 `check_skills.py` 或 `claude plugin validate . --strict` 的 0 错误当成效果结论；frontmatter 写多余字段；`name` 与文件夹名不一致或用了大写字母、下划线、空格；`description` 超过 1024 字符或只写「做什么」没写「什么时候用」；不用 `./scripts/release.sh` 发布；把整仓库手动压成 zip 上传；在 claude.ai 或 API 沙箱里期待 `video-by-reference` 渲染视频。
- 做法 AF：把 5300 stars 或「built on thousands of hours」当效果证据；不做基线直接审一遍就把新增发现全当真实问题；修完不重新编译、不跑测试；把它的 SwiftUI 检查规则搬到别的领域；自己写领域技能时整段重复 LLM 已知内容；在缺少 Node/npx 又没装插件市场的环境里硬装。
- 做法 AG：只给 AI 草稿、不给自己的笔记或转写，然后期待它写出像你的东西；原文明确说给作者本人笔记时收益最大。
- 做法 AG：把 Interview mode 当成必选；只有草稿缺真实例子、数字、哪里出了错、作者真实看法时才需要。
- 做法 AG：让它自行删减；只有在你要求或它给出理由时才另给短版，删不删由你决定。
- 做法 AG：只跑 `check.py` 就宣布完成；它只查机械项，承诺强度、事实审计和人类读者盲评都要另做。
- 做法 AG：把作者自测的小样本结果当成独立第三方结论；原文自陈样本小（scoreboard 12 篇，全部集合 56 篇，notes 结果 4 篇），评委是 AI，测试由开发该 skill 的人设计。

## 证据与来源

- 「技能 = 文件夹 + `SKILL.md`，frontmatter 只需 `name` 和 `description`」来自 anthropics/skills 的官方 README 与模板；README 明确说技能「仅供演示与教育用途」，效果需自测。
- 「先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查」来自 jnMetaCode/superpowers-zh 的 README；没有 skill 正文和效果数据。
- 「自我纠正记忆、`SessionStart` 自动加载、知识平面」来自 rohitg00/pro-workflow 的 README；没有效果数据，且技能/命令数量在文档内自相矛盾。
- 「先小范围试装，不要整体 adopt」来自 genspark-claw、ECC、AAS、awesome-copilot 等材料的共同结论；`doctor`/`validate` 只验证装得上、格式合法，不证明产出更好。
- 「做对照、看返工轮数和首稿可用率」来自 anthropics/skills 的验证建议和 awesome-copilot 的最小试用方式；是方法主张，不是对照实验数据。
- 「第三方技能有供应链风险，先审查」来自 genspark-claw 和 awesome-copilot 的 README 警告。
- 「多来源知识打包」来自 yusufkaraaslan/Skill_Seekers 的 README；质量门禁 `--threshold` 可用，但缺少与人工基线的对照。
- feiskyer/claude-code-settings（MIT，约 1.6k stars）的安装命令、settings.json 模板、Copilot Gateway、VSCode 环境变量、`customApiKeyResponses`、`update-cc-plugins.sh`、四个 WebSearch MCP 与五条技能触发排查，均来自该仓库 README； эффект全凭作者描述。
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
- work-humanizer 路线的全部内容均来自调研《phuryn/work-humanizer》，即该仓库 README 与作者自测证据。原文给出的数据与案例：12 篇新的 AI 写作文本，每个工具在同一模型上改写，由来自不同公司的四个 AI 模型盲评，每一处意义改动都与原文核对；评委「会发出去」的选择率：work-humanizer 48%，blader/humanizer 20%，单行提示 1%，Emulate-1 0%；意义改动：12 篇里 work-humanizer 18 处，blader/humanizer 33 处，单行提示 42 处，Emulate-1 120 处；在五个测试集共 56 篇改写文本中 work-humanizer 没有编造事实；单行提示在「更像人写」这一项上以 90% 胜过 AI 初稿、work-humanizer 为 75%，但它改写自由、会加作者没说过的东西；Pangram：work-humanizer、blader/humanizer 和单行提示的重写版都仍被判定为 AI（2–4% human）；给作者本人的笔记时，work-humanizer 的版本在 4 篇里 4 篇 Pangram 得 100% human；只有 work-humanizer 会向你索要缺失的信息：16 篇里它在 9 篇上发问，用掉了作者 39 条事实，编造 0 条，评委愿意发出的比例 69%（blader/humanizer 22%）。属作者主张： 「保住每一条事实、承诺和限定条件的强度」是设计目标与自测结论，不是独立第三方验证过的性质；「拒绝造假」是技能文本里的约束声明，原文没有给出对抗性测试结果；Interview mode 里「作者」是模拟的，由 AI 按一份作者已知事实清单代为回答——真人场景未测。原文自陈的局限：样本小（scoreboard 12 篇，全部集合 56 篇，notes 结果 4 篇）；文本类型只有销售、营销、客服、产品和内部写作，没有合同或其他法律文件；评委是 AI 不是人，且评委之间对「human」是什么有分歧；每篇每工具只有一个样本；Pangram 只测了一个版本、一天；interview mode 里的是模拟作者；测试由开发该 skill 的人设计。适用条件：工作场景的对外/对内文本重写；有作者自己的素材（笔记、转写、自写粗稿）时收益最大；不要指望它把文本变成能通过 AI 检测；不要把结论外推到合同类法律文件、外推到「AI 评委同意就等于人类读者同意」。
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
