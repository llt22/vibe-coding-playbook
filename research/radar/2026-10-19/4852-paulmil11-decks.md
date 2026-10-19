# paulmil11/decks

- 结论：**值得一试**。建议先拿一个真实的三五页 deck，照 README 的命令装起来，完整跑几轮“批注→智能体改→在幻灯片上回帖→自检→人工复核”的回路，并把你自己的领域规则写进 skill 与 Checks；理由是这套做法把编码智能体接到一个有状态、有反馈渠道、能自检的工作界面上，安装步骤、命令和检查项都可以直接照做，但原文只有作者自述、没有效果数据，而且只支持 macOS/Linux，所以先小范围试而不是全面铺开。
- 原文：https://github.com/paulmil11/decks
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T04:19:55.791Z

## 是什么

Decks 是一个本地运行的幻灯片工作台：每份 deck 是磁盘上一个独立的 HTML 文件（放在自己的文件夹里，带自己的 git 历史），可以在任意浏览器打开、全屏演示、打印成 PDF。核心不是“AI 生成 PPT”，而是一个**批注驱动的协作回路**：

- 人在某张幻灯片下方留批注（或直接在幻灯片上改文字），改动边打边存到磁盘；
- 编码智能体（Claude Code 或 Codex）读取批注和人的手改，修改 HTML 文件；
- 智能体用 `sb reply` **在那张幻灯片上回帖**：做了什么 / 反问一个问题 / 为什么没改；
- 智能体自检：截图、跑审计、导出下一号 PDF、记录一次 round、commit；
- 人复核：`Looks good` 清掉批注，`Reopen` 打回，每张幻灯片在侧栏保留完整的来回历史。

作者是 StrategyU 的咨询技能培训师（前咨询顾问），把咨询叙事的规则（answer first、ghost deck、action titles、纵向/横向 flow、五秒/十秒测试）同时写进了智能体的 skill 和界面的 **Checks** 键位里，所以同一个工具既是执行者也是教练。

## 具体做法

### 1. 装环境并起服务

前提：Python ≥ 3.9、Node.js ≥ 18、git（可选，但 deck 靠它拿版本历史）；**macOS 或 Linux**。

```bash
git clone <this repository> decks
cd decks
./setup.sh
python3 server.py
```

打开 `http://localhost:8790/`。首次启动会在 `~/slide-decks/` 建 deck 注册表 `decks.json` 和一个练习用 demo deck。

服务器本身只需要 Python；截图、审计、PDF 导出、看板缩略图需要 Node.js 与 headless Chrome。`setup.sh` 会把 `playwright-core` 装进 `tools/`，找不到可用 Chrome 时装 Playwright 的 Chromium（约 150 MB）。Linux 上截图/PDF 失败通常是缺系统库：

```bash
(cd tools && sudo npx playwright-core install-deps chromium)
```

### 2. 把智能体的 skill 装到用户级（这样在任意目录都能用）

前提：使用 Claude Code。

```bash
mkdir -p ~/.claude/skills && cp -r .claude/skills/decks ~/.claude/skills/
```

Codex 及其他智能体读本文件夹下的 `AGENTS.md`，它指向同一份 `.claude/skills/decks/SKILL.md`（里面有回合流程、`sb` 命令、deck 文件组织方式、幻灯片风格规则）。README 说明：顶栏的 Ask Claude 提示词**不依赖** skill 也能用，因为提示词自己列了 `sb` 步骤——但 README 没有给出这段提示词的原文，无法照抄。

### 3. 建一份 deck

要么在 dashboard 点 **New deck**（填名称、类型、受众、他们已知什么、要带走的那一个点、可选长度/结构/密度/颜色/标题字体/logo/备注），它会建文件夹与 git 历史、把 brief 写进 `BRIEF.md`、复制一段提示词给你粘给智能体，由智能体产出初稿。

要么命令行：

```bash
./sb templates
./sb new "Q3 pricing review" --template consulting --audience "The leadership team" \
  --point "Raise prices on the middle tier first." --style Navy
```

模板：`consulting`（八页 storyline：封面、exec summary、storyline、假设树、ghost chart、2x2、计划、下一步）、`talk`、`workshop`、`proposal`、`blank`。配色：Navy / Dark / Minimal / Forest / Teal / Plum，主题写进单个 `<style id="deck-theme">` 块，可一处改全篇。

### 4. 跑一个回合（这是最值得照搬的流程）

前提：服务器在跑，deck 在智能体所在的应用内置浏览器里打开（作者的做法是让智能体和你看同一页）。

1. **你批注**：在幻灯片下方写要改什么，或直接点文字自己改。改动边打边存到 deck 旁的 `.slidebuilder/state.json`。
2. **交给智能体**：点顶栏 **Ask Claude** 复制提示词，粘进 Claude Code / Codex；装了 `decks` skill 就可以只说一句 `process changes`。
3. **智能体改并回帖**：读批注与手改，改 deck 文件，然后逐条回帖。
4. **智能体自检**：截图动过的页、跑审计、导出下一个编号的 PDF、记录 round、提交 deck 文件夹。
5. **你复核**：停止打字后页面自动刷新；回帖在各自幻灯片下方，改过的页带角标；`Looks good` 清批注，`Reopen` 打回。

智能体侧的 `sb` 命令（原文表格，可直接照写进 skill）：

```bash
sb decks                                   # 所有 deck，含未结批注与问题
sb comments <deck> [--all]                 # 要处理的批注，按 deck 编号；--all 含草稿
sb edits <deck> [--version v]              # 审阅者在幻灯片上改的文字，以及页面移动
sb working <deck> <slide>                  # 在该页显示 "Claude working"
sb reply <deck> <slide> done|question|skipped "<text>"   # 在该页回帖
sb status <deck> "<text>" [--done N --total M]           # 顶栏实时状态行
sb idle <deck>                             # 清掉状态行
sb shot <deck> [--version v] [--out DIR] <slide> ...     # 截图
sb audit <deck> [--version v]              # 溢出、标签重叠、Guides
sb export <deck> [--version v] [--with-edits]            # 下一个编号的 PDF，旧的移入 _archive/
sb round <deck> --summary S [--changed slide="what changed" ...] [--export vN]  # 记录一回合
sb commit <deck> "<message>"               # 提交 deck 文件夹
sb thumb <deck> / sb url <deck> / sb hide <deck> / sb show <deck> / sb delete <deck> --yes
```

最值得单独拎出来的一条设计：`sb reply` 只允许三种结局 **done / question / skipped**。回帖不是礼貌性汇报，而是强制智能体对每条批注给出“做了 / 我需要你回答 / 我选择不改及原因”，避免静默吞掉批注。

### 5. 可选配置

默认端口 8790、监听 127.0.0.1、decks 在 `~/slide-decks`。复制 `config.example.json` 为 `config.json`，或用环境变量（环境变量优先）：

| 设置 | `config.json` | 环境变量 |
|---|---|---|
| 端口 | `port` | `SB_PORT` |
| 监听地址 | `host` | `SB_HOST` |
| decks 目录（也放 `decks.json`、`settings.json`） | `decks_dir` | `SB_DECKS_DIR` |
| 每日向 GitHub 查一次新版本（`true`） | `check_updates` | `SB_CHECK_UPDATES` |
| 另一个配置文件 | | `SB_CONFIG` |
| `sb` 找服务器的地址 | | `SB_URL` |
| headless 任务用的 Chrome | | `SB_CHROME` |

```bash
python3 server.py --port 8799
```

关掉版本检查：`"check_updates": false` 或 `SB_CHECK_UPDATES=0`（该检查只读一个重定向，不上传 deck 内容）。

### 6. 可选：开机自启

macOS（launchd）：

```bash
sed -e "s|__APP__|$PWD|g" -e "s|__HOME__|$HOME|g" contrib/decks.plist > ~/Library/LaunchAgents/local.decks.plist
launchctl load ~/Library/LaunchAgents/local.decks.plist
```

重启：`launchctl kickstart -k gui/$(id -u)/local.decks`，日志在 `~/Library/Logs/decks.log`。

Linux（systemd user service）：

```bash
mkdir -p ~/.config/systemd/user
sed "s|__APP__|$PWD|g" contrib/decks.service > ~/.config/systemd/user/decks.service
systemctl --user enable --now decks
```

### 7. 把“你的领域规则”写进两处：skill 和检查项

智能体每次写/改幻灯片都遵守的规则（原文清单，可作为写自己 skill 的模板）：

- **Answer first**：先给结论再给证据；只有在受众怀疑时才逐步铺垫。
- **Ghost deck first**：先把所有标题按顺序写完，再动手做任何一页。
- **Action titles**：每个标题是完整句子说明观点（“Q3 revenue grew 22%, driven by enterprise expansion”，而不是“Q3 Revenue”）。
- **Vertical flow**：正文证明标题，底部不放 takeaway 框。
- **Horizontal flow**：只读标题，能讲完整个故事。
- **五秒测试**（讲的页）/ **十秒测试**（读者自己看的页）：一个观点、层级清楚、图表不用研究就能读。
- **“So what?”**：好看但没观点的页不算过。
- **一页一个观点**：需要“and also”就拆成两页。
- **图表证明标题**：柱状/折线，关键数字突出，绝不用饼图。
- **画出关系**：不要一堆同形方框的网格，画流程、光谱或图表。

界面侧把这些做成按键检查（按 C 或数字键；`Help me choose` 会问你“想知道什么”再打开对应检查）：五秒测试、十秒测试（不过关会留一条批注给下一回合）、Horizontal flow（按顺序列出全部标题，可就地编辑）、Vertical flow（先只看标题、说这页要证明什么，再按空格看正文是否做到）、**Guides**（四条：保护边距留 logo/来源/页码；标题最多两行，标题页/章节页/收尾页/陈述页豁免；1000px 画布上文字不小于 12px；一页不超过四种字号）。Guides 只提示不阻断，`Ask Claude to fix` 会把违规项写进批注（`Comment on all` 处理所有被标记的页），下一回合由智能体修；`sb audit` 跑同一套检查外加溢出与标签重叠。

### 8. 交付与留痕

顶栏 ⋯ 菜单里的两个副本：**Client copy**（当前屏幕上的版本，只含幻灯片，图片内嵌，不含备注/批注/引导页/其他版本，源码里也没有；可滚动、可一页一 PDF 打印、可全屏）与 **Editable copy**（含备注与批注，给你自己）。`sb export` 把 deck 打成下一号 PDF；如果浏览器里还有未落盘的编辑，它会提示，`--with-edits` 则打印浏览器当前所示内容。

## 对应的研究问题

**1. 能力发现**
- 把“基本排版/对齐方框”这类过去必须手工做的事交给模型（作者明确主张：他大概再也不会在 PowerPoint 里对齐方框了）。
- 批注本身成为工作入口：一句“这页不成立”就能触发读取、改文件、回帖的完整执行。
- 附带能力：`tools/pptx2native.py` 把 PowerPoint 幻灯片转成可编辑的原生幻灯片（README 只说明它存在、咨询起始模板就是这么做的，未给步骤）。

**2. 任务匹配**
- 模型：作者用 Opus 5.5 或 Sol 6.1，并说明“还没试过别的”——这是明确的能力边界声明，不要外推。
- 工具：Claude Code / Codex；deck 用应用内置浏览器打开，**人和智能体看同一页**，这是这套协作方式的关键前提（共享可视上下文，回复直接贴在页上）。
- 载体选择：一 deck 一 HTML 文件 + 独立 git 历史，让智能体可以直接改文件、逐步提交；相比在线协作套件更适合“智能体直改”。

**3. 条件供给**
- 信息：deck 文件本身、`BRIEF.md`（名称/受众/他们已知什么/要带走的那一个点）、批注与手改（落在 `.slidebuilder/state.json`）。
- 规则：`.claude/skills/decks/SKILL.md` 或 `AGENTS.md`（回合流程、`sb` 命令、文件组织、风格规则）。
- 工具/权限：本地服务器（127.0.0.1:8790）、`sb` CLI、headless Chrome（截图/审计/PDF/缩略图）、git、Node。
- 反馈渠道：`sb reply` 三种结局、`sb status` 顶栏实时状态行、`sb round --summary/--changed` 回合记录、侧栏逐页历史与“改过”角标、`Looks good`/`Reopen` 的人为裁决。
- 安全边界：默认只听 127.0.0.1、数据只在本机（智能体读取的内容会按常规发给模型厂商）、`client` 版本可在录屏时整体隐藏、Client copy 从源码层面剔除备注与批注。

**4. 主动推进**
- 原文**没有**基于时间/事件/状态自动推进的工作流：回合由人点 **Ask Claude** 发起。
- 只有两处接近自动化的东西：页面轮询 `/api/decks/<slug>/pulse` 实现实时刷新；服务器每日一次查 GitHub 最新版本。
- 有一处“状态驱动”的味道：Guides 标记出违规页 → `Comment on all` 一次性生成批注 → 下一回合智能体统一修；以及五秒/十秒测试不过关时自动留一条批注给下一回合。这可以视作“用检查结果触发下一轮任务”的雏形，但不是无人值守的持续推进。

**5. 效果验证**
- 机器可判：`sb audit`（溢出、标签重叠、四条 Guides）、截图、编号 PDF 序列（版本可追溯）、`sb round` 结构化记录（摘要 + 逐页改动说明 + 关联 PDF 版本）、git commit 历史。
- 人可判：五秒/十秒测试、只看标题的 Horizontal flow、先标题后正文的 Vertical flow。
- 缺的是**结果指标**：没有任何“deck 变得更好/更快/更有说服力”的度量。全部是形式与流程层面的可核查项。

## 与已有做法的关系

清单中只有一条相关条目：**Claude Code（adopt）**。Decks 可以看作 Claude Code 的一个具体应用形态，为那条条目补上三样可照搬的东西：

1. 用 `.claude/skills/<name>/SKILL.md` 把某个工种的流程、命令与风格规则固定下来，让智能体每次执行都走同一套（并且可复制到 `~/.claude/skills/` 全局生效）；
2. 给智能体造一个**有状态、能回帖的领域界面**（批注 API + 回帖 API + 状态行），而不是只在聊天窗口里对话；
3. 给智能体配一组**它自己能跑的验收命令**（截图/审计/导出/提交），让“改完了”有可核查的落点。

清单中没有与“批注-回帖协作回路”“幻灯片自动化”直接对应的条目。

## 证据与局限

**原文实际给出的**：完整安装与配置步骤、`sb` 全部命令及参数、五步回合流程、四视图与快捷键、五种模板与六种配色、Guides 的四条量化规则、API 端点清单、`.slidebuilder/state.json` 与 `review.json` 的字段职责、launchd/systemd 自启脚本、MIT 代码 / CC BY 4.0 模板内容的许可。这些是可以直接照做的部分。

**只是作者主张**：Opus 5.5 / Sol 6.1 出现了“tipping point”、笨重的 Google Slides 和 PowerPoint 越来越没意义、“我大概再也不会在 PowerPoint 里对齐方框了”、“这是我的 daily driver”、智能体可以从实习生变成资深协作者（`partner-not-intern` 配图）。没有任何量化证据：仓库 39 stars、单人作者、明确写着“暂不接受外部代码贡献”。

**适用条件**：仅 macOS / Linux（README 只列这两个平台，Windows 未提）；需要 Python + Node + 可用的 Chrome；需要 Claude Code 或 Codex；作者假设使用者是单人操作者或小团队，且已经在做幻灯片这件事。

**具体局限**：审计只覆盖几何与排版层面（溢出、重叠、字号、字号种类、标题行数），无法判断论点是否站得住；回帖质量取决于 skill 里的规则写得有多具体；智能体直接改 HTML，出错要靠 git 和人工复核兜底；作者自述模型适配“还没试过别的”；`Ask Claude` 的提示词原文、`SKILL.md` 正文都不在给出的材料里，无法照抄。

## 怎么试、怎么验证

**最小试用（半天内可完成）**：拿一份真实、三五页、你已经知道哪里不满意的 deck，按第 1、2、3 步装好并建 deck，然后完整跑 3 个回合、每回合 5 条批注。批注要写成可执行的一句（“把标题改成结论句：X 增长 22% 来自企业客户扩张”），而不是“这页不好”。

**记录这五个数（每回合记一次，跨回合看趋势）**：

1. **回帖结局分布**：`done` / `question` / `skipped` 各几条。`question` 与 `skipped` 偏高说明你的批注不够可执行，或规则没写清。
2. **打回率**：`Reopen` 次数 ÷ 已结批注数。这是最贴近“改善”的人判指标。
3. **审计收敛**：`sb audit` 每回合报出的违规页数，是否回合间下降而非来回振荡。
4. **单回合耗时**：从点 Ask Claude 到 `sb commit` 的墙钟时间。
5. **版本留痕**：编号 PDF 与 git commit 是否一回合一条、`sb round --changed` 的描述是否真能说清改了什么（回头能不能只看 round 记录复盘）。

**对照组**：同样的 5 处修改，用你原来的方式（手改 PowerPoint 或让聊天式 AI 生成整页再贴）做一遍，记录耗时与打回次数。

**判断标准（阈值自定，原文没给任何基线）**：若 3 个回合后打回率没有下降、或 `question`+`skipped` 占比过半、或单回合耗时高于手改，则先重写 skill 里的规则与批注写法再试，而不是加功能。另外单独做一次只看标题的通读（Horizontal flow）和一次五秒测试，确认结构调整确实发生，而不只是排版变整齐。

**迁移判断**：这套回路的可迁移部分是三件事——把领域规则写进 skill、给智能体一个能贴回帖的工作界面、给它一组自己能跑的验收命令。先在幻灯片上验证这三件事是否成立，再考虑搬到你的其他交付物（报告、周报、方案）上。
