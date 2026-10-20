# 让编码 agent 复刻动效视频前先看片，并用逐帧对照交证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这篇手册解决 agent 在重复任务和视觉动效任务中凭想象交付、缺少对照证据的问题：先用小范围对照验证技能，再把踩坑写成按现象触发的经验卡，最后用逐帧打分验收动效复刻。
> 先试这一步：先在一个非关键项目上只装一个技能包，用同一任务做有/无各 3 次对照；若要做动效视频复刻，先拿一段 10 秒左右的扁平动效片跑 study_video → 写页面 → frame_diff → check_anim --runtime → side_by_side 闭环。
> 最近修订：2026-10-21

## 解决什么问题

你已经在用编码 agent、写作 agent 或通用 agent，但经常遇到三类问题：一是每次都要重复描述同一套规范，装了一个技能包也不确定是否真的减少返工；二是同类排障反复出现，agent 每次都从头试错，踩过的坑没有变成下一次可直接调用的经验；三是让 agent 复刻一段动效视频或 UI 录屏时，它看不到画面，只能凭想象写节拍、缓动、颜色和文字，最后用“看起来对”交差。

这篇手册给出一套可照做的流程：先用做法 A 在一个非关键项目上试装一个现成技能包，用同一任务做有/无技能对照；确认有效后再把自己的重复工作写成 SKILL.md；同时用做法 AX 把重复踩坑写成短经验卡，放在 procedures/ 目录，用全局钩子让 agent 在动手前按现象定向读卡；动效视频复刻用做法 BA，先让 agent 看片，再按页面契约写代码，用 frame_diff 逐帧打分、check_anim --runtime 体检、side_by_side 出证明视频。专门场景（仪表盘截图验收、BA/PO 规格追溯、Android、SwiftUI、Elixir/Phoenix、Go 终端 UI、论文翻译、学术写作、长任务监督等）保留为索引，统一要求先小范围对照再采用。

## 适用与不适用

适用：

- 你已经在用 Claude Code、Codex CLI、Cursor、Gemini CLI 或类似 agent，有一类反复出现、有明确规范的任务。
- 你愿意在一个非关键项目上做一周对照，而不是安装成功就认为改善。
- 你有重复性排障任务，且 agent 会读 AGENTS.md、CLAUDE.md 或等价指令文件，愿意把踩过的坑写成短卡并按现象检索（做法 AX）。
- 你需要给 agent 补一块领域知识：UI/UX 设计、Postgres、Google 产品与技术、中国金融市场数据、移动端模拟器观测、中英文学术写作、SwiftUI、工作写作、AI 研究、Go 终端 UI、Elixir/Phoenix、Android 开发。
- 你需要把文档站点、仓库、PDF、技术书或内部 docs 变成按需加载的技能。
- 你需要给多步、有明确交付物的复杂任务分阶段推进，或在编码 agent 里立行为约束、做路由、做审查回路。
- 你需要安装或分发以 SKILL.md 为载体的技能到多个编码代理，或把团队规范同步给多人。
- 你需要给 agent 补仪表盘/数据屏设计规范，并希望验收落在三档截图而不是代码自检（做法 AY）。
- 你需要 BA/PO 规格文档、用户故事、验收标准、测试用例和追溯矩阵，且宿主支持 Agent Skills（做法 AZ）。
- 你要把扁平矢量动效、排版动画或 UI 动效录屏复刻成内联 SVG + GSAP 时间线，并希望用逐帧对照而不是口头判断验收（做法 BA）。

不适用：

- 没有明确重复任务，只想装个工具看看；不愿做对照验证，只凭安装成功就认为改善。
- 直接在生产关键项目上全量安装，或一次装完整个插件市场。
- 只看 stars、README 徽章或 CI 状态就决定采用。
- 做法 AX 不适合把全部经验常驻注入；不适合没有明确失败现象、不会复发的任务；也不适合不愿维护短卡、不愿对入库和删卡做人审的团队。
- 做法 AX 的触发依赖 agent 自律和触发词匹配；跨工作区不自动共享；工具层可能随宿主升级失效；卡片会过期，淘汰需要人判断。
- 做法 AY 只针对仪表盘/数据屏，偏 Web（Tailwind + React 表述）与 SwiftUI；材料只有 README，不能确认内部规则质量；仓库 41 stars，属个人项目，长期维护不确定；它的 Sign-off 推广语会出现在对话里，采用前要处理。
- 做法 AZ 适合愿意维护 Markdown 规格、按阶段调用命令的团队；不需要规格文档、只想快速写代码的团队价值有限；Windows 安装需另行适配；README 只有自述效果，没有独立验证。
- 做法 BA 只覆盖扁平矢量风格的动效/排版动画/UI 动效录屏到代码，绑定 GSAP 生态；不适合实拍、复杂 3D、需要保留原始视频或逐帧描摹的任务；没有 Python 3.9+、ffmpeg、Playwright + chromium 的环境不要硬上；案例全部出自作者自证，没有独立 benchmark。
- 各专门做法的边界见索引条目：E 只针对中文技术文档；F 只针对生物医学论文；M 不得再分发第三方版权书生成的 skill；P 只对自有或书面授权资产；T 不支持直接驱动交易或投顾建议；U 需要 Apple Silicon Mac 加 Codex desktop 加私有仓库访问权；AU 输出语言固定为韩语；AV 只有一条推文和一段被截断的安装提示词；AW 只有隔离模拟测试，不能当成真实客户端端到端可靠。

## 前置条件

通用：

- Node.js ≥ 18，npm 或 npx 可用；Git 可用。
- 一个可回滚的非关键项目，不要在主仓库或用户主目录下做项目级安装。
- 对目标技能目录有写权限，如 ~/.claude/skills/、~/.agents/skills/、~/.cursor/skills/。
- 走 MCP 时，配置文件里写绝对路径。
- 安装第三方技能前，先通读它的 SKILL.md，并跑运行时的 doctor 或 audit 工具。

做法 A 和 B 额外前置：

- A：一个非关键项目和一类重复任务；只选一个技能包。
- B：一件每周重复、有明文规范的工作；能建一个自包含技能文件夹并写入目标 host 的技能目录。

做法 AX 额外前置：

- 一个 agent 会读 AGENTS.md、CLAUDE.md 或等价指令文件的工作区。
- 一类有明确失败现象、会复发的排障任务。
- 对工作区 procedures/ 目录和全局指令文件有写权限。
- 可选：使用 DeepSeek Harness 等兼容会话日志的工具链，且工具未因宿主升级失效；没有工具也可以人工从最近踩坑记录开始写卡。

做法 AY 额外前置：

- Claude Code，或其他能读 Markdown 规则文件的智能体；一个已有前端项目或一张现有仪表盘截图。
- 能安装插件或写 ~/.claude/skills/；走 SwiftUI 版时需有模拟器。

做法 AZ 额外前置：

- 支持 Agent Skills 的宿主，如 Claude Code、Hermes Agent、Antigravity、OpenAI Codex、Cursor 或 Windsurf。
- 本地已有仓库路径，下文用 /path/to/ba-kit-open 代替实际路径；Unix-like shell 用于 symlink，Windows 需另行适配。
- python3 用于渲染 Mermaid；一个真实但范围小的功能需求。

做法 BA 额外前置：

- Python 3.9+ 与 ffmpeg；会开浏览器的脚本还需要 Playwright + chromium。
- 一段要复刻的扁平动效视频或 UI 录屏（例如 clip.mp4），以及填好的 brief；明确只能用这个源片。
- 允许脚本启动无头浏览器、发起网络请求、读写本地帧图与视频文件。
- Claude Code、Codex、Cursor、Gemini CLI、Copilot 等之一，能装技能或把技能目录拷到对应 skills 目录。

专门做法 C–AZ 另有前置，按索引条目和对应仓库 README 准备；不要跳过 A 的对照方法直接纳入常规流程。

## 操作步骤

怎么选：先做做法 A；A 里某个技能确实有效、且你有一件每周重复且规范明确的工作，再做做法 B；如果你有一类重复排障任务，先做做法 AX。如果你要做仪表盘/数据屏，先做 AY 的半天试用；如果你要 BA/PO 规格链，先做 AZ 的一个小需求试用；如果你要把动效视频复刻成代码，先做 BA 的 10 秒小片闭环，并套用 A 的有/无对照方法。其余按场景从专门做法索引里选，且 C–BA 都必须套用 A 的对照方法。

### 做法 A：先用现成技能包做小范围试装（推荐先做）

1. 选定一个非关键项目和一类重复任务。前提是失败可回滚，不碰生产关键路径。预期结果是你能拿到一组基线输出。
2. 只选一个技能包、只装一个。可选来源包括官方示例技能、jnMetaCode/superpowers-zh、rohitg00/pro-workflow、feiskyer/claude-code-settings、leter/zh-tech-writing、google/skills、clawyi-com/china-market-data、android/skills 等；不要一次装多个来源。
3. 验证安装。新开一个会话，运行 /plugin list，并问 What skills do you have access to?。预期结果是能看到该技能，而不是只在安装日志里看到成功。
4. 跑通一个最小动作，只选你当前最痛的任务。预期结果是产出一份可评审的结果，而不是只证明命令能执行。
5. 做对照。同一任务、同一输入，分别在没有技能和有技能的条件下各跑 3 次，记录差异。试一周，或至少覆盖 5 个同类任务。
6. 可选：只照抄一个工作流形态，别整套搬。

### 做法 B：把自己的重复工作写成 SKILL.md（验证有效后再做）

1. 选一件你每周都在重复、且有明文规范的工作。
2. 建一个自包含文件夹，放 SKILL.md。description 必须同时写清做什么和什么时候用。
3. 主 SKILL.md 只放流程与核心规则，细粒度规范拆到 references/ 按需加载。
4. 校验技能：

```bash
npx genspark-claw validate ./my-skills/
```

5. 安装到目标 host：

```bash
npx genspark-claw install all --target claude
```

或直接把技能目录放到 ~/.claude/skills/。

6. 换一个新会话，或让一位不了解背景的同事只凭 description 触发该技能。预期结果是它能被自动发现，而不是每次都要手动点名。
7. 没有自动触发时逐项排查路径、重启、嵌套目录、手动调用标记，先改 description 和触发条件，不要急着加内容。

### 做法 AX：把重复踩坑写成按现象触发的经验卡（按 A 的对照法验证）

定位：MiHjy12138/DSH-agent-procedures 是一套文件化经验库。它不是技能、记忆插件、知识库或 RAG，核心是钩子常驻、索引消歧、卡片按需读，并强调反面清单（试过且失败的路）而不是只写正向流程。

1. 在工作区建目录。前提是每个需要它的工作区各建一份。放入 INDEX.md（只做易混现象消歧，不逐卡列）、_模板.md，建议再加 _inbox.md。README 指向仓库 templates/INDEX.template.md、templates/card-template.md；本次只拿到 README，未见模板文件本身，需以仓库实际文件为准。
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

4. 可选：从历史会话挖第一批素材。前提是使用 DeepSeek Harness 等兼容会话日志，且工具未因宿主升级失效。

```bash
node tools/scan-sessions.mjs calls <workspace> '<关键词正则>'
```

按复发筛选：同一现象在多个会话出现过才优先成卡。

5. 写第一批卡。前提是先有真实踩坑记录。从最近 2–3 个坑开始，不要一次写 13 张；每张不超过 2 KB，六段结构，删叙述，保留命令、参数、路径、报错原文、判据、证据。自查是否写成了复盘报告。
6. 踩坑当下记 inbox，收尾只检查。不要指望收尾回忆；踩到坑时立刻在 procedures/_inbox.md 记一行现象加一句话解法。收尾时看 inbox，够格的（复发的、代价大的）按模板整理成卡，小意外留着。入库和出库都建议人审，不把写卡权限完全交给 agent。
7. 验证钩子是否生效。能新开会话并观察工具调用时，用 tools/procedures-probe.mjs 监控，或人工观察；问 3–5 个分属不同卡片的现象，看是否出现 <<< HIT 或是否去读 procedures/。没有触发时先改钩子位置、措辞和触发词，不要急着加卡。预期结果是 agent 在动手前定向读卡，而不是启动时全库扫描。
8. 定期体检。攒到十几张卡以后运行：

```bash
node tools/procedures-audit.mjs
```

该命令只出清单，不写、不删、不改卡；退出码 1 表示有 P0/P1，可接 CI。删卡或并卡要 agent 出清单、人审后才动。
9. 做最小试用。选 1 个重复排障多的仓库，建 procedures/，写全局钩子，只写 2–3 张复发卡；用 3–5 个现象问题新开会话验证是否读卡。连续试运行一段时间，记录重复试错轮次、同类坑复发次数、读卡命中率、无关读卡或乱翻次数、每张卡体积和维护耗时。
10. 判定与止损。同一现象第二次出现时能直接命中首选或别再来，且没有把大量未使用卡塞进上下文，才算初步有效；若完全不读卡，先查钩子和触发词，不要用全量注入掩盖。

### 做法 AY：用截图评论、重设计和三档截图 QA 验收仪表盘（先做半天试用）

定位：abdiraimov-otabek/dashboard-design-skill 是一个 Claude Code skill，把仪表盘设计规范和截图 QA 验收打包在一起，教 agent 构建、重设计并批评分析类、营收类、指标类仪表盘。它的核心不是再给一份设计规范，而是把领域规范文档、截图自检和每步 done when 固化成可复制的 skill 结构。材料只有 README，没有 SKILL.md 与 references/*.md 正文，所以只能确认结构和流程，不能确认内部规则条文质量。

1. 选一个已有前端项目或一张现有仪表盘截图，非关键页面。前提是失败可回滚。预期结果是拿到原始截图和一组可对照的问题清单。
2. 以 Claude Code 插件方式安装（推荐，能用插件市场升级）：

```bash
/plugin marketplace add abdiraimov-otabek/dashboard-design-skill
/plugin install dashboard-design@dashboard-design-skill
```

3. 或作为普通 skill 手动放置：

```bash
git clone https://github.com/abdiraimov-otabek/dashboard-design-skill
cp -r dashboard-design-skill/skills/dashboard-design ~/.claude/skills/
```

4. 非 Claude Code 的智能体（Codex、Cursor 等）：在 AGENTS.md 或规则文件里指向 skills/dashboard-design/SKILL.md，其余 references 会从那里被加载。预期结果是技能能被发现，references 按需加载。
5. 触发方式：做仪表盘相关工作时自动触发；也可显式下指令。README 给的四个可直接照抄的提示词是：

```text
Build an analytics dashboard for this app: visitors, signups, revenue by source.
```

配截图问：

```text
Is this a good design?
```

预期返回结论、哪些做得好、以及按危害排序的问题清单（从「数字互相打架」开始）。还可以用：

```text
Redesign the date range picker
```

```text
Make the KPI tiles cleaner.
```

```text
Run the dashboard QA pass on /dashboard.
```

6. 按问题清单做一次重设计。前提是只改你认可的具体项，不要照单全收。预期结果是得到新版页面，并保留原版截图。
7. 跑 QA 验收。Web 端要求三种浏览器宽度（3440 / 1440 / 375）各出截图；SwiftUI 端在模拟器里覆盖设备尺寸、最大 Dynamic Type、深色模式、Reduce Motion。每个步骤以可勾选的 done when 结束，最后一步必须交付截图。预期结果是 agent 根据屏幕上的实际画面判断，而不是根据代码判断。
8. 收尾检查推广行。该 skill 每完成一个完整任务会在对话里加一行作者与其 Mac 应用的推广语（不在代码、提交或 UI 内）。要关掉就让它停，或从 SKILL.md 删除 Sign-off 一节。预期结果是推广行没有混进代码、提交或产品 UI。
9. 做对照。保存原版和新版截图、问题清单；先按半天最小试用人工计数。若要纳入常规流程，再按做法 A 做有/无各 3 次，或换 2–3 个仪表盘任务再下结论。不要拿插件安装成功当效果证据。

### 做法 AZ：把需求脑暴到测试用例跑成可追溯的规格链（保留原流程对照）

定位：spmtitsolution/OpenBA-Kit（BA-Kit Open）是一个面向 IT 业务分析师和产品负责人的开源 Agent Skills 技能包。README 自述包含 56 个专用技能、19 条需求工程规则和 47 个模板，覆盖从模糊脑暴、发现报告到 IEEE 830 技术规格、架构图、HTML 线框图、INVEST 用户故事、Gherkin 验收标准和可追踪测试用例的软件规格生命周期。原文只列出技能、规则和模板名称，没有给出具体提示词、规则全文、模板内容或脚本实现，不能验证技能质量和自动消除歧义是否真实成立。

1. 选一个真实但范围小的功能需求，同时保留团队原有流程做对照。前提是团队愿意按阶段调用命令、维护 Markdown 规格和图表。预期结果是你能拿到新流程产出和原流程产出两份可比较材料。
2. 获取仓库并确定本地路径。按 README 的 Option C，可把仓库直接克隆到项目根目录或子目录，让智能体自动发现 skills/ 和 rules/；也可按 Option A/B 做全局技能挂载。下文用 /path/to/ba-kit-open 代替实际路径。
3. 安装到 Claude Code（Option A）。前提是使用 Unix-like shell，并把路径替换为实际仓库路径：

```bash
mkdir -p ~/.claude/skills
ln -s /path/to/ba-kit-open/skills/* ~/.claude/skills/
```

4. 安装到 Hermes Agent / Antigravity / Codex（Option B）。README 给出的 Hermes 示例命令如下；前提同上：

```bash
mkdir -p ~/.hermes/skills
ln -s /path/to/ba-kit-open/skills/* ~/.hermes/skills/
```

Windows 环境没有给出对应命令，需另行适配，不要直接照抄 ln -s。

5. 用斜杠命令跑完整 BA 流程。README 给出的「AI BA 的一天」可直接作为小需求试跑顺序。前提是技能已安装或被工作区发现，并在对应项目上下文中调用：

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

6. 渲染 Mermaid 图。前提是已安装 python3，且 Markdown 中包含 Mermaid 块（如 sequenceDiagram、stateDiagram-v2、flowchart、erDiagram）：

```bash
# Scan and render a single markdown file:
python3 scripts/render_diagrams.py docs/{feature}/srs/flows.md

# Scan and render all documentation in a feature folder:
python3 scripts/render_diagrams.py docs/{feature}/
```

README 称输出为可双击打开的独立 .html、纯 .svg 矢量文件，以及交互式 index.html 画廊。预期结果是图和原型能被非技术干系人直接打开。

7. 处理变更与治理。README 列出 /cr（变更请求与爆炸半径影响分析）、/gap、/doc-drift、/dashboard、/kg 等治理命令；前提是已有规格文档，并在客户范围变化或文档漂移时显式调用。原文没有给出这些命令的详细参数，只能按技能名和阶段表使用。
8. 交付评审包。用 /preview 生成单页交互式文档门户，供干系人浏览、评审和签收。前提是前面已生成 PRD/SRS/流程图/用户故事/验收标准等文档。预期结果是拿到可评审的一页材料，而不是把生成评审包本身当成签收。
9. 做对照与判定。统计歧义词数量、追溯覆盖率、评审轮次和返工、图与原型可用性、变更影响完整性。若文档变多但追溯、评审和返工没有改善，降级为 study/watch，不要仅凭 56 个技能、19 条规则、47 个模板或 36 stars 就纳入常规。

### 做法 BA：先让 agent 看片，再用逐帧对照交证明（新增，先做 10 秒小片试用）

定位：lovisdotio/motion2code 是一个分发给编码智能体的技能包，把一段动效设计视频或 App/网页录屏重建为干净、可编辑的代码——内联 SVG 图形加一条 GSAP 时间线，可逐帧 seek、无缝循环，并与源视频并排逐帧对照；对录屏类素材还会进一步产出可交互的真实页面（用 GSAP ScrollTrigger 实现真实滚动、按钮、键盘与移动端支持）。它本身不是模型，而是“流程 + 脚本 + 硬规则 + 安装适配器”的组合，支持 Claude Code、Codex、Cursor、Copilot、Gemini CLI 等（原文称约 70 多个 agent）。核心闭环是 study_video 看片 → 按页面契约写页面 → frame_diff 逐帧打分 → check_anim --runtime 体检 → side_by_side 出证明视频。

适用前提与边界：适合扁平矢量风格的动效、排版动画、UI 动效录屏到代码；目标能被 SVG 加单一 GSAP 时间线表达。不适合实拍、复杂 3D、必须保留原始视频或逐帧描摹的任务。案例全部出自作者自证，没有独立 benchmark；先小范围试，重点是把“确定性 seek + 逐帧对照”的验证方式搬到其他视觉产出任务上。

1. 准备运行环境。前提：本机已有 Python 3.9+ 与 ffmpeg；会开浏览器的脚本还需要 Playwright + chromium。

```bash
# 方式一
uv run --with playwright python ...
# 方式二
pip install playwright && python -m playwright install chromium
```

2. 安装技能（按你用的工具选一条）。前提：Claude Code 走插件市场；其他工具走 skills 包或手工拷目录。

Claude Code：

```bash
claude plugin marketplace add lovisdotio/motion2code
```

```bash
claude plugin install motion2code@motion2code
```

或者直接拷技能目录：

```bash
cp -R skills/motion2code ~/.claude/skills/
```

Codex / Cursor / Gemini CLI / Copilot 等（通过 skills 分发）：

```bash
npx skills add lovisdotio/motion2code
```

手工安装：

- **Codex**：把 `skills/motion2code` 拷到 `~/.agents/skills/`
- **Cursor**：拷到 `~/.cursor/skills/`，并加上 `adapters/cursor/` 里的规则
- **Copilot**：`gh skill install lovisdotio/motion2code motion2code`，并加上 `adapters/copilot/`
- **Gemini CLI**：`gemini extensions install https://github.com/lovisdotio/motion2code`
- **Hermes**：拷到 `~/.hermes/skills/`
- **claude.ai**：把 `skills/motion2code` 打包 zip，在 Settings > Capabilities > Skills 里上传
- **ChatGPT、Gemini Gems 等纯聊天工具**：见仓库 `adapters/` 目录

3. 准备源片与任务说明（brief）。把要复刻的片段（例如 clip.mp4）放好；需要完整 brief 时填写 prompts/convert-video-prompt.md，仓库另有“源提示词怎么写”的建议。然后用自然语言下指令，例如：

```text
Rebuild clip.mp4 as an SVG + GSAP animation that loops

turn this app screen recording into a real site
```

4. 让 agent 先“看片”，再动手。前提：已完成第 1、2 步；这一步产出的是 agent 能读的“视觉事实”，而不是让模型凭空想象。

```bash
python3 scripts/study_video.py clip.mp4 -o study/
```

输出：每 0.25 s 一帧（按时间命名）、每次检测到的硬切前后帧、一张 contact sheet、精确的扁平调色板、以及源片是否循环的评分，汇总在 study.json。需要单独取色时：

```bash
python3 scripts/palette.py ...
```

（palette.py 打印视频或图片的精确扁平色十六进制值及其占画面比例。）

5. 写页面：必须满足“页面契约”与硬规则。前提：这是后面所有自动校验的基础，不满足就无法逐帧对照。页面契约：

```js
window.anim = { tl, duration, seek(t), play(from), pause() }   // seek(t) is a pure function of t
```

- index.html?t=6.5 冻结在第 6.5 秒；?external=1 等待被外部驱动；不带参数则自动播放并循环。
- 字体加载完、首帧画完后，设置 `<html data-ready=\"1\">`。
- 自包含：内联 SVG、cdnjs 的 GSAP 3、仅在做形变时用 jsdelivr 的 flubber、Google Fonts，其他一律不加。

硬规则（原文 Hard rules）：

- 只用给定的源视频：绝不重新生成、绝不内嵌视频、绝不描帧。
- 文字严格按源提示词里的写法，即使视频里拼错了也照抄。
- 扁平形状用 SVG，颜色从源片采样。
- GSAP 时间线是唯一时钟。
- 循环在代码里完成：frame(duration) 等于 frame(0)。
- 每个时刻都要和源片并排对照过。

6. 逐帧对照打分，定位最差时刻。

```bash
python3 scripts/frame_diff.py clip.mp4 index.html -o diff/
```

输出：指定时刻（或某段区间的每一帧）的“源片 | 代码”成对图、全部配对的拼图、每个时刻的差异分数以及最差五处。

7. 运行时体检（含循环接缝与 seek 确定性）。

```bash
python3 scripts/check_anim.py index.html --runtime
```

检查：页面契约是否满足、脚本白名单、是否混入内嵌位图或视频；加 --runtime 后会无头打开页面，检查控制台报错、网络请求、循环接缝、seek 是否确定性、页面是否自动播放。

8. 逐帧渲染出片。

```bash
python3 scripts/render_anim.py index.html -o anim.mp4
```

通过 anim.seek 逐帧渲染为 mp4、GIF poster 或 PNG 序列，可用 --size 指定任意尺寸——因此不会丢帧或重复帧。

9. 出“证明视频”。

```bash
python3 scripts/side_by_side.py clip.mp4 anim.mp4 -o side_by_side.mp4 --html index.html
```

把源片与渲染结果叠成一条带标注的对照视频（横屏或竖屏）。

10. 查看现成范例的对照页。

```bash
python3 -m http.server -d gallery/eye
```

然后打开 http://127.0.0.1:8000/compare.html。gallery/ 下每个文件夹都有 index.html（自包含成品）、compare.html（源片与代码逐帧同步并排）、source.mp4（480p 源片）、poster.gif，录屏类另有 site.html（可交互真站）。

11. 做最小试用与判定。先拿一段 10 秒左右的扁平动效视频跑完整闭环，保存 study/、diff/、side_by_side.mp4 和最终 index.html；再按做法 A 的思路做有/无对照，或换 2–3 个同类小片再下结论。不要拿安装成功或 gallery 案例当效果证据；若素材不是扁平矢量、项目不用 GSAP，或 frame_diff 的最差五处无法被有效收敛，先降级为 study，不要把 BA 纳入常规流程。

### 专门做法索引（C–BA）

下表保留各专门做法的用途和入口，完整边界以对应仓库 README 和本手册的判断原则为准。所有条目都先套用做法 A 的对照方法。

| 做法 | 什么时候用 | 入口与关键动作 |
| --- | --- | --- |
| C | 多来源知识打包 | pip install skill-seekers；skill-seekers create https://docs.djangoproject.com/；skill-seekers package output/django --target claude；质量门禁可试但不等于效果证明 |
| D | 自建网关或想用已有订阅走非官方 API | 手动设置 settings.json；把 ANTHROPIC_BASE_URL 和 ANTHROPIC_API_KEY 指向你的端点；非官方 API 环境用 MCP 补网页搜索 |
| E | 中文技术文档写作与审稿 | npx skills add leter/zh-tech-writing -g；第一次只审不改；再改一版逐条 diff |
| F | 单篇生物医学论文精读 | clone Gaoyuan-0423/biomedical-paper-reader；指定其 SKILL.md 阅读 PDF；检查判定纪律 |
| G | 写一个 Claude Code mod | Claude Code 2.1.287 或更高；hooks/hooks.json 只指一个模块；读 session.usage 的真实数字 |
| H | 用 Cline CLI 跑长任务并拿硬证据验收 | npx skills add https://github.com/gongdear/cline-pilot；用 session_report.py 监控；6 项验收清单；证据优先于自我报告 |
| I | 给 agent 补 UI/UX 设计知识 | npm install -g ui-ux-pro-max-cli；先 uipro init --dry-run；交付前逐条对检查清单 |
| J | 出可交互架构图、工作流图、时序图 | npx skills add tt-a1i/archify -g；按 guide、doctor、validate、deliver 命令链走；失败按 diagnostics 的 supportedFixes 修 |
| K | 出品牌一致的静态 HTML 加 SVG 图 | 按宿主安装 diagram-design；做品牌 onboarding；多客户用命名 profile 隔离；默认无 JS、无外部图片依赖 |
| L | 从大插件市场只装一个单元并按任务档位选模型 | /plugin marketplace add wshobson/agents；/plugin install python-development；plugin-eval 只当筛子 |
| M | 把反复查阅的书或内部文档变成按需加载技能 | npx skills add virgiliojr94/book-to-skill；python3 scripts/extract.py --check；不得再分发第三方版权书生成的 skill |
| N | 把模糊想法写成任务书并给破坏性操作加闸门 | 安装 leader 或用降级方案；按目标七问检查；用 storage-analyzer 的三色闸门；用 neat-freak 收尾且不擅自删东西 |
| O | 补 Postgres 领域知识与版本化文档检索 | npx skills add timescale/pg-aiguide --skill postgres；可接公共 MCP 端点；单次 A/B 不足以下结论 |
| P | 已获授权的漏洞挖掘场景按主题加载安全技能库 | /plugin marketplace add elementalsouls/Claude-BugHunter；/plugin install claude-bughunter@elementalsouls；提交前过 7-Question Gate |
| Q | 把复杂分析任务拆成分析、实现、交付三阶段并加门禁 | 安装 math-modeling-skill；约定 SKILL_ROOT 只读、PROJECT_ROOT 可写；按 M1、P1、P2、W1、W2 顺序推进 |
| R | 装一套小而可组合的工程技能集 | claude plugins install mattpocock-skills 或 npx skills@latest add mattpocock/skills；/setup-matt-pocock-skills；从 /grill-with-docs 和 /tdd 开始 |
| S | 从 google/skills 按任务只装一个 Google 相关技能 | 选一个最接近当前任务的技能；按 harness 安装；在隔离环境记录查文档时间、正确率、人工纠正次数、权限申请次数 |
| T | 检索中国金融市场数据并核对来源与时间戳 | npx --yes skills@latest add clawyi-com/china-market-data -g；python3 $SKILL_DIR/tools/setup_env.py；更新后重跑 setup_env.py |
| U | 把移动端模拟器与真机画面接进 Codex 聊天 | Codex desktop 加 Apple Silicon Mac；私有仓库读权限；安装预构建插件；用 Logs、Performance、Screenshot、Select 验收；可用 MOBILE_DEV_TELEMETRY=off |
| V | 用一行 curl 把单个 Markdown 技能装进 Claude Code | mkdir -p .claude/skills/explain；curl -fsSL 到 .claude/skills/explain/SKILL.md；重启后观察是否按 description 自动加载；推广前读实际提示词 |
| W | 让元技能观察你怎么用技能 | npx skills add rebelytics/one-skill-to-rule-them-all --skill task-observer；把激活指令加进 CLAUDE.md 或 session-start hook；观察日志和更新建议分别落盘 |
| X | 装一套全栈开发技能包并按请求自动激活 | /plugin marketplace add jeffallan/claude-skills；/plugin install fullstack-dev-skills@fullstack-dev-skills；请求里带具体框架、技术名和任务；用 /common-ground 暴露假设 |
| Y | 中英文学术写作去模板化并用命题核对保住事实 | clone heise3/academic-deai；调用 Skill；用 scripts/content_lock.py original.md revised.md --strict 核对命题；DOCX 抽取不保留所有样式 |
| Z | 让路由技能自动选工作流并对 bug 交出失败→通过证据 | 安装 michael-denyer/pstack-claude；运行 setup-pstack；Codex 先 /hooks 信任；用 poteto-mode 处理 bug，检查是否复现失败、调查、修复、重跑失败用例 |
| AA | 按职能只装少量 agent 角色 | 用 msitarzewski/agency-agents；最省事装桌面 app，或用脚本装进 Claude Code；只装需要的团队；OpenCode 约 119 个 agent 上限 |
| AB | 在 T3 Code 里用 p3-stack 按 playbook 路由 | clone uzairansaruzi/p3-stack；./install.sh 或 ./install.sh --project /path/to/repo；/setup-p3；/p3-mode；用 worktree、PR 监视、定时任务和线程记忆减少手工轮询 |
| AC | 审计并改进自己的 SKILL.md | clone robonuggets/skill-creator-plus 到 ~/.claude/skills/skill-creator-plus；用 AUDIT、NEW、REFINE 三种模式；先拿机械检查基线 |
| AD | 让 agent 把结论、方案对比与流程解释渲染成一页可离线打开的 HTML | 安装 QingYunA/answer-me-with-html；用 TCP 三次握手问题验证安装；需要 always-on 时把规则写进 rules 文件；用 slash command 或 am 改配置 |
| AE | 校验、打包并分发自己的 SKILL.md | 用 ishuagrawal/skills 的目录规范；frontmatter 只保留允许字段；python3 scripts/check_skills.py；claude plugin validate . --strict；./scripts/release.sh 发布 |
| AF | 给 agent 补 SwiftUI 领域知识 | npx skills add https://github.com/twostraws/swiftui-agent-skill --skill swiftui-pro；或用 Claude Code 插件市场；/swiftui-pro 或 $swiftui-pro；先不用技能审同一段代码做基线 |
| AG | 给工作写作去 AI 腔并保住事实与承诺强度 | 复制 phuryn/work-humanizer 到 skills 目录；用 Use work-humanizer on this 或 Interview mode；尽量喂自己的笔记或转写；可用 check.py 做机械扫描 |
| AH | 把开放式研究做成迷宫地图、证据分级与独立裁判循环 | clone nasqret/labyrinth-exploration 到 skills 目录；从研究项目目录运行；先跑 triangle-counts 示例；论断带 T1–T6；低于 T3 不作事实引用；dashboard 注意隐私 |
| AI | 按 PM 工作流只装 1–2 个 pm-skills 插件 | claude plugin marketplace add phuryn/pm-skills；claude plugin install pm-product-discovery@pm-skills；用 /discover 跑真实想法；Codex 上用自然语言而不是等 slash 命令 |
| AJ | 给编码 agent 立四条硬约束 | 安装 forrestchang/andrej-karpathy-skills 插件，或把 CLAUDE.md 写进项目；四条原则是 Think Before Coding、Simplicity First、Surgical Changes、Goal-Driven Execution；把命令式任务改写成带验证目标 |
| AK | 给 agent 补 AI 研究全流程知识 | npx @orchestra-research/ai-research-skills；只装当前任务对应的 1 个类别；用真实研究任务做有/无对照；可抄它的 SKILL.md 加 references 目录规范 |
| AL | 把多阶段长流程打包成 skill 并用状态文件断点续做 | 安装 Julian-Ivanov/website-bauen；/website-bauen start；进度写入 WEBSITE-STATUS.md；继续时在项目文件夹新开对话并说 Mach mit dem Skill website-bauen weiter；外部账号放到真正需要的阶段 |
| AM | 把某个人的工作方式蒸馏成 Person Profile 技能 | 安装 titanwings/distilly 到名为 distilly 的目录；给自己或别人建 profile；按 colleague、relationship、celebrity 选素材优先级；用纠正层和增量合并维护 |
| AN | 把领域方法论拆成细粒度 SKILL.md 并按对话触发词按需加载 | 可 clone SnailSploit/claude-red 看结构；用稀疏检出只装单个类别；也可自建 Skills/<类别>/<技能名>/SKILL.md；只在合法合规范围内使用 |
| AO | 给写 Go 终端 UI 的编码 agent 补 Charm 生态知识 | npx skills add tpscloud/charmedimsure；只装 1–2 个；go run ./charmed-bubbletea/counter 验证环境；符号链接安装后不要移动 checkout |
| AP | 把真实 UI 组件拆成绘制层并自动出规格表 | npx skills add diip3sh/exploded；/exploded document 或 /exploded spec sheet；node scripts/audit.mjs examples/gallery/index.html --out shots；跨源 CSS、Shadow DOM、canvas 读不到时退回人工 |
| AQ | 给 Elixir/Phoenix 项目补工程规范 | npx skills@1.7.2 add singularityhacker/Estack --skill '*' --agent cursor；先让 estack-doctor 做只读检查；再用 estack-debug 或 estack-review；同一客户端只用一种安装方式 |
| AR | 用 vercel-labs/skills CLI 安装、临时使用、列出、更新、卸载和生成模板 | npx skills add vercel-labs/agent-skills --list；按项目作用域安装；只想试一次用 npx skills use；npx skills init 生成 SKILL.md；内部技能用 metadata: internal: true 和 INSTALL_INTERNAL_SKILLS=1 |
| AS | 用小团队注册表把团队 SKILL.md 分发到每个人的多种编码代理 | 安装 yoanbernabeu/skillcrew；skillcrew registry init；skillcrew skill new；skillcrew validate；开发者用 skillcrew init 加入；用 blocked 作 kill switch；项目级技能不要交给它 |
| AT | 给 Android 开发 agent 补官方弱项技能 | android skills add r8-analyzer --project=.；或 android skills add --all；Claude Code 用 /plugin install android-skills --marketplace android/skills；不要手动点名技能，直接描述任务并检查是否自动触发 |
| AU | 把外语论文 PDF 翻成韩语并尽量保住版式 | 安装 maenjh/ko-paper；ko-paper doctor 看到 kopaper ready 只证明装得上；用 skill 或 CLI 翻译；输出固定为韩语；同一文件再翻确认术语复用和 token 下降；Windows 被 Smart App Control 拦截时走简易模式或 WSL，不要关 SAC |
| AV | 让 Codex 少说废话、直接动手改代码 | 在非关键仓库让 Codex 自行安装 JuliusBrussee/caveman；材料里的安装提示词被截断，不能当完整提示词使用；安装前先审阅第三方仓库；同一 Bug 任务做安装前后对照 |
| AW | 用 Claude Code 执行、Codex 定时审查并按判据收敛 | 把 ajogalekar/claude-codex-loop symlink 到客户端 skill 目录；起始提示写 goal、success_criteria、max_rounds、max_hours、max_no_progress_reviews；每轮用 ledger、哈希、claim 结转和止损；误报成功一次即停用 |
| AY | 做仪表盘/数据屏，想让 agent 按截图验收 | 安装 abdiraimov-otabek/dashboard-design-skill；跑截图评论、重设计、三档宽度截图 QA；非 Claude Code 用 AGENTS.md 指向 SKILL.md；采用前处理 Sign-off 推广行 |
| AZ | 做 BA/PO 规格文档、需求追溯与测试用例 | 安装 spmtitsolution/OpenBA-Kit；按 /brainstorm→/srs→/userstory→/ac→/test-cases→/preview 跑；用追溯矩阵和歧义词检查；保留原流程对照 |
| BA | 把扁平动效视频或 UI 录屏复刻成 SVG + GSAP 代码，并用逐帧对照验收 | 安装 lovisdotio/motion2code；先跑 study_video 看片；按页面契约写页面；用 frame_diff 打分；用 check_anim --runtime 体检；用 render_anim 和 side_by_side 出证明视频；先做 10 秒小片试用 |

## 怎么判断变好了

做法 A 的最小试用方式：同一任务、同一输入，有技能和无技能各跑 3 次；至少覆盖 5 个同类任务，或持续一周。可观察指标是人工修改次数、返工轮数、首稿可用率、背景重述次数、输出一致性、单次任务耗时、规则类返工次数。不要拿安装成功或 doctor 通过当效果证据。

做法 B 的最小试用方式：换一个新会话，让不了解背景的人只凭 description 触发；或让同事只读 description 判断什么时候会用。指标是该技能被正确触发的次数、触发后返工轮数、你手动补充规范的次数。

做法 AX 的最小试用方式：选 1 个重复排障多的仓库，建 procedures/，写全局钩子，只写 2–3 张复发卡；用 3–5 个现象问题新开会话验证是否读卡。试运行一段时间，记录重复试错轮次是否下降、同类坑复发次数是否下降、读卡命中率、无关读卡或乱翻次数、每张卡体积和维护耗时。可用 tools/procedures-probe.mjs 观察是否出现 <<< HIT，或用 tools/procedures-audit.mjs 检查结构缺段、断链、体积、触发词覆盖、对象失效和结论偏旧。判定门槛是同一现象第二次出现时能直接命中首选或别再来，且没有把大量未使用卡塞进上下文；若完全不读卡，先查钩子和触发词，不要用全量注入掩盖。

做法 AY 的最小试用方式：半天内按步骤装好，拿现有仪表盘截图问 Is this a good design?，记录返回的问题清单；让 agent 按清单做一次重设计，再跑 dashboard QA pass 拿 3440 / 1440 / 375 三张截图；对照原版和新版人工判断。可观察指标是：命中率，即问题清单中被你认可为确实有害的条数除以总条数，低于一半说明规则不适配你的产品；可执行性，即有多少条能直接落到具体改动，而不是提升可读性这类空话；截图 QA 的独有价值，即三档宽度下抓出的纯读代码发现不了的问题数，例如超宽屏空带、手机上 tab 横向滚动，这是这套方法的核心卖点，必须单独计数；一致性，即同一个数字在 KPI 磁贴、图表、排行里是否一致，空数据或 0 基数时是否还出现夸张的百分比；成本，即从提问到拿到可用布局的轮次与时间；副作用，即确认 Sign-off 推广行没有混进代码、提交或产品 UI。如果截图 QA 抓到代码看不出的问题几乎为零，说明它对你只是又一份设计规范，降级为 study，只借规范文件加截图验收的结构，不必继续用这个具体 skill。

做法 AZ 的最小试用方式：选一个真实但范围小的功能需求，在 Claude Code 中按 Option A 挂载技能，或把仓库放进项目工作区按 Option C 使用；按 README 的一天流程跑一遍 /brainstorm → /srs → /sequence + /erd → /render-diagrams → /wireframe-html（可选）→ /userstory + /ac → /test-cases → /preview，同时保留团队原有流程做对照，不要只跑新流程就下结论。可观察指标是：歧义词数量，统计 SRS 和用户故事中 fast、secure、user-friendly 等定性词出现次数，看是否被替换为可量化指标和 FR-、BR-、ERR- 命名；追溯覆盖率，检查 Idea → PRD → SRS → Flows → User Stories → AC → Test Cases 是否每层都能追到，尤其是每个 FR-/BR-/ERR- 是否有对应测试用例；评审效率，记录生成 /preview 评审包所需时间、干系人评审轮次和返工次数，与原流程对比；图与原型可用性，检查 Mermaid 是否成功渲染为独立 HTML/SVG，非技术干系人能否直接打开并理解，线框图是否可点击；变更影响完整性，模拟一次范围变更，用 /cr 看是否产出影响矩阵，并人工核对遗漏项。判断标准是：如果歧义词显著减少、追溯链完整、评审轮次或返工减少，再把 BA-Kit 纳入手册；如果只是文档变多但追溯、评审和返工没有改善，则降级为 study/watch。以上 AY 和 AZ 的指标是试用指标，不是原文给出的实验数据。

做法 BA 的最小试用方式：选一段 10 秒左右的扁平动效视频或 UI 动效录屏，先跑 study_video 生成 study.json、调色板和硬切前后帧；按页面契约写 index.html，再依次跑 frame_diff、check_anim --runtime、render_anim、side_by_side，保存 diff/ 的最差五处、运行时体检结果和对照视频。可观察指标是：frame_diff 的每时刻分数与最差五处是否下降；check_anim --runtime 是否还有控制台报错、意外网络请求、循环接缝不闭合、seek 不确定；页面是否混入内嵌位图或视频；render_anim 是否因走 anim.seek 而没有丢帧或重复帧；side_by_side 是否能让另一个人直接复核。若最差五处反复落在同一类节拍、缓动、颜色或文字错误上，回到页面契约和硬规则改，不要只凭观感重跑。先做 1 个小片闭环，再换 2–3 个同类小片；不要拿安装成功、gallery 里作者自证案例或 check_anim 通过当效果结论。若素材不是扁平矢量、项目不用 GSAP，或逐帧对照无法定位和收敛问题，降级为 study。

专门做法 C–AZ 的统一试用方式：选一个与所装技能对应的真实小任务，先在不装该技能的会话里做一次并保存输出，再装上做一次；同一任务至少跑 3 次，或换 2–3 个任务再下结论。通用指标是首稿可用率、人工修改次数、返工轮数、查文档时间、命令或配置正确率、权限申请次数、耗时和成本。各条目的特别指标按索引执行：H 看测试是否通过、非空文件、git 改动；I 看交付前检查清单；J 看按 diagnostics 修的轮数；Y 看命题核对是否拦下方向改变；Z 看失败→通过证据；AH 看 tier 计数与 frontier 已解决比例；AI 看 /discover 是否产出假设清单与实验设计；AJ 看 diff 是否只含被请求改动；AK 看真实研究任务的前后差异；AP 看审计是否通过和 token 溯源比例；AQ 看 estack-doctor 是否只读并给出带证据的改进；AR 看技能是否按预期作用域安装和更新卸载；AS 看技能是否自动同步、blocked 是否下次同步移除；AT 看一次通过率、返工轮数和触发可靠性；AU 看图表公式位置、术语一致性、第二次翻译是否复用术语；AV 看动手前轮数和输出长度是否同时保住一次成功率；AW 看误报成功次数是否为 0、blocking objection 每轮关闭数、预算触顶是否记为未完成停止；AY 看问题清单命中率、可执行性、截图 QA 独有价值、数字一致性和 Sign-off 副作用；AZ 看歧义词数量、追溯覆盖率、评审轮次与返工、图与原型可用性、变更影响完整性；BA 看 frame_diff 最差五处、运行时体检、循环接缝、seek 确定性、是否内嵌视频或位图、渲染丢帧与并排对照视频。

反向指标：加了技能后仍要口头纠正同一件事，先改 SKILL.md 或 description；文档改完只是删空话没补事实，先把代码、配置和真实报错给它读；agent 只凭自己的声明就宣布完成，而 git status 和测试报告不支持，作废重跑；同一断言连续失败 3 次还在本地重试，升级到强模型；出图技能每次失败都盲重试，说明没用上 diagnostics；plugin-eval 分数不错但真实任务没改善，说明把筛子当成了结论；AX 跑几个会话后 observation-log 或读卡行为仍不存在，先补钩子、触发词或探针，不要先加卡；AY 三档截图 QA 抓不出代码看不出的问题，就降级为 study；AZ 只是文档变多而追溯和评审返工没改善，就降级为 study/watch；BA 的 frame_diff 只给出整体分数却定位不到最差时刻，或 agent 仍在偷偷内嵌视频、描帧、改文字，说明页面契约和硬规则没被遵守，先修契约和硬规则，不要继续盲出片。

## 常见坑

- 整体 adopt：一次装多个技能包，导致上下文过载或规则冲突。先只装一个。
- 一次装整个插件市场：目录规模不是使用建议。
- 重复安装：同一项目里同时用项目级安装和插件市场装同一个技能包，skills 会出现两份；同一客户端只用一种安装方式。
- description 只写做什么没写什么时候用，技能就不会在合适时机触发。
- 拿 star 数、CI 状态、doctor 通过、validate 通过当效果证据；这些只证明装得上、格式合法或测试能过。
- 做法 AX：把 procedures/ 当成启动时全量扫描的注入库；正确做法是钩子常驻、按现象定向搜卡。
- 做法 AX：等到收尾才回忆补卡；实测收尾补卡不容易自发发生，踩坑当下记 inbox 更可靠。
- 做法 AX：一次写十几张卡；先从最近 2–3 个复发坑开始，每张不超过 2 KB。
- 做法 AX：卡片写成复盘报告，缺少命令、参数、路径、报错原文、判据和证据。
- 做法 AX：agent 不读卡时先加卡；应先查钩子位置、措辞和触发词，再用探针验证。
- 做法 AX：把写卡和删卡权限完全交给 agent；入库和出库都建议人审。
- 做法 AX：忽略卡片会过期、工具层会随宿主升级失效、跨工作区不自动共享这些限制。
- 做法 AY：只装插件不验证自动触发；把问题清单照单全收，不先算命中率和可执行性；把 Sign-off 推广行带进代码、提交或产品 UI；把截图 QA 当成代码审查的替代；材料只有 README 就宣称内部规则质量已验证；仓库 41 stars 属个人项目，长期维护不确定。
- 做法 AZ：把 56 个技能、19 条规则、47 个模板或 36 stars 当效果证据；只跑新流程不做原流程对照；把文档变多当改善；Windows 直接照抄 ln -s；把 /preview 生成评审包当成签收本身；README 没有展示规则全文和提示词，不能确认自动消除歧义真的成立。
- 做法 BA：跳过 study_video 直接让 agent 写页面，等于又让它凭想象猜节拍、缓动、颜色和文字。
- 做法 BA：不满足页面契约就急着跑 frame_diff；seek(t) 不是纯函数、没有设置 data-ready、字体未加载完就截图，后面的逐帧对照都不可信。
- 做法 BA：违反硬规则，偷偷内嵌视频、描帧或重新生成源片；check_anim 会查脚本白名单和是否混入内嵌位图或视频，不要绕过。
- 做法 BA：只跑 frame_diff 看整体分数，不看最差五处；应按时段定位最差时刻，再回去改时间线。
- 做法 BA：不跑 check_anim --runtime，漏掉控制台报错、意外网络请求、循环接缝和 seek 确定性。
- 做法 BA：用录屏式出片代替 render_anim；render_anim 通过 anim.seek 逐帧渲染，才能避免丢帧或重复帧。
- 做法 BA：把 gallery 里作者自证案例当效果证据；案例覆盖有限，必须拿自己的 10 秒小片跑闭环。
- 做法 BA：把非扁平矢量、复杂 3D、实拍素材硬套到 SVG + GSAP；先判断目标是否能被单一时间线表达，不适合就降级。
- 做法 AV：把作者的一条推文当效果结论；材料里的安装提示词被截断，不能照抄成完整提示词；不要直接让 Codex 自行安装未经审阅的第三方仓库。
- 做法 AW：把 28 个本地测试通过、skill validator 通过或隔离模拟 UI 测试当成真实客户端端到端可用；误报成功一次就说明验证环节不可靠。
- 其他专门做法的坑按索引条目和对应 README 执行；例如 AU 不要把 kopaper ready 当翻译质量证据，AT 不要把 evaluations 当成公开评测集，AS 不要把 skillcrew doctor 通过当团队工作变好。

## 证据与来源

- 做法 A 和 B 的核心方法来自本手册现有正文所合并的 anthropics/skills、genspark-claw、awesome-copilot 等材料：技能是文件夹加 SKILL.md，frontmatter 至少写 name 和 description；先小范围试装，不要整体 adopt；doctor 或 validate 只验证装得上、格式合法，不证明产出更好。这些是方法主张，不是对照实验数据。
- 做法 AX 全部来自调研《MiHjy12138/DSH-agent-procedures》，即该仓库 README。可核查信息包括：procedures/ 目录、INDEX.md、_模板.md、_inbox.md、卡片六段模板、四条全局钩子、templates/INDEX.template.md 与 templates/card-template.md 的指向、tools/scan-sessions.mjs、tools/procedures-probe.mjs、tools/procedures-audit.mjs、退出码 1 表示有 P0/P1。README 给出的自测数据是：新会话首轮查 procedures，5 题命中 5/5，对照题不命中不乱翻，读 6 张卡约 12 KB；索引从 5.2 KB 降到约 0.8 KB；13 张卡从 77.8 KB 压到 26.6 KB，约减 65%；38 张卡精简时一次移出 9 张，约 24%；两次收尾补卡实测未自发，而踩坑当下记 inbox 自发发生。局限是这些多为作者自测，样本和统计口径有限；触发依赖 agent 自律，触发词匹配模糊；跨工作区不自动共享；工具层会随宿主升级失效；卡片会过期，淘汰需人判断；本次只拿到 README，未验证仓库模板和脚本的实际可用性。因此只把 AX 列为先试再决定推广，不把作者自测当成通用效果结论。
- 做法 AY 来自调研《abdiraimov-otabek/dashboard-design-skill》README。可核查信息包括：Claude Code 插件安装命令、普通 skill 手动放置命令、非 Claude Code 用 AGENTS.md 指向 SKILL.md、skills/dashboard-design/ 下的 SKILL.md 与 references 文件列表、四个可直接照抄的提示词、Web 端 3440 / 1440 / 375 三档截图 QA、SwiftUI 模拟器覆盖设备尺寸和最大 Dynamic Type 与深色模式与 Reduce Motion、Sign-off 推广行。README 给的 before/after 对照表列了 9 条具体设计替换；作者自述方法学证据是 127 个已上线的仪表盘页面、对一个营收分析产品的完整拆解、一次每条规则被违反一次并被截图抓到的真实重设计。哪些只是作者主张：127 这个数字、提炼是否忠实、规则可移植到任何技术栈、设计判断本身的有效性，都没有外部数据或对照实验支撑；README 带有自我推广成分，作者两个付费 Mac 应用链接需要打折看待；仓库 41 stars，属个人项目，长期维护不确定。材料只有 README，没有 SKILL.md 与 references 正文，只能确认结构存在、流程可跑，不能确认规则都对。
- 做法 AZ 来自调研《spmtitsolution/OpenBA-Kit》README。可核查信息包括：README 自述 56 个 Agent Skills、19 条需求工程规则、47 个模板、9 个 SDLC 阶段、45 种图类型、diagram-design 为 v2.6；安装命令包括 mkdir -p ~/.claude/skills 与 ln -s 挂载 skills/，Hermes 示例用 ~/.hermes/skills；斜杠命令表与一天工作流；scripts/render_diagrams.py 的两条命令；追溯矩阵 Idea → PRD → SRS → Flows → User Stories → AC → Test Cases；外部指标只有 36 stars。作者主张而非证据：README 说可自动化完整软件规格生命周期、能消除歧义、避免幻觉假设和 bug 与返工及失败 sprint、能一键交接干系人，这些都没有附 benchmark、客户案例、前后对比数据或失败案例。关键内容未展示：原文只列出技能、规则和模板名称，没有给出具体提示词、规则全文、模板内容或脚本实现，因此无法验证技能质量、规则是否真的能自动检测歧义、渲染脚本是否稳定。适用条件是适合需要规范化 BA/PO 文档且团队愿意按阶段调用命令、维护 Markdown 规格和图表，宿主需支持 Agent Skills；README 的安装示例是 mkdir 和 ln -s，未给 Windows 命令，Windows 环境需另行适配；对只需要快速写代码、没有规格文档流程的团队价值有限。手册中的 AZ 指标是基于其可检查产出提出的试用指标，不是原文效果数据。
- 做法 BA 来自调研《lovisdotio/motion2code》。可核查信息包括：Claude Code 的 claude plugin marketplace add 与 claude plugin install motion2code@motion2code、手工 cp -R skills/motion2code ~/.claude/skills/、npx skills add lovisdotio/motion2code、Codex/Cursor/Copilot/Gemini CLI/Hermes/claude.ai 的适配路径；scripts/study_video.py、palette.py、frame_diff.py、check_anim.py --runtime、render_anim.py、side_by_side.py 的命令与输出说明；页面契约 window.anim = { tl, duration, seek(t), play(from), pause() }，?t=6.5、?external=1、data-ready 标记；硬规则包括只用源视频、不内嵌视频、不描帧、文字照抄、SVG 采样颜色、GSAP 单一时间线、frame(duration) 等于 frame(0)、每个时刻并排对照。原文给出的 gallery 有 6 个重建案例：动效排版 10 s、24 KB；匹配剪辑 10 s、40 KB；节日站点回放 15 s、52 KB，含 real site；天气站回放 15 s、60 KB，含 real site；贴纸作品集回放 15 s、56 KB，含 real site；播客播放页回放 15 s、36 KB，含 real site。每个案例带 compare.html 逐帧对照与 480p 源片。哪些只是作者主张：原文称支持约 70 多个 agent、能堵住 agent 看不到视频时凭想象写节拍/缓动/颜色/拼写甚至偷偷嵌视频或描帧的问题，但案例全部出自作者自证，没有独立 benchmark、第三方复现或失败案例统计；只覆盖扁平矢量风格并绑定 GSAP 生态，不能证明可推广到实拍、复杂 3D 或其他动画技术栈；原文没有给出定时或事件触发的自动化编排，?external=1、纯函数 seek 与 frame_diff 分数只是让“渲染 → 打分 → 定位最差时刻 → 回去改”可脚本化，仓库 README 未声明已实现该循环。手册中的 BA 指标是基于其可检查产出提出的试用指标，不是原文效果数据。
- 做法 C–AZ 的证据与局限按本手册现有正文所合并的各篇调研保留；本版新增了 BA 的可核查命令、作者主张与局限，但没有新增 BA 的独立效果数据，也没有把它升级为已验证结论。各条目的可照做命令、作者主张、无效果数据的部分，均以对应仓库 README 和原文限制为准。
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
