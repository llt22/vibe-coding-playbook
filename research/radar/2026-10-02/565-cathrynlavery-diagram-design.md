# cathrynlavery/diagram-design

- 结论：**值得一试**。建议小范围试：在 Claude Code（或 Codex/Pi）里装上这个 Agent Skill，先用自己的站点做一次品牌 onboarding，再跑一遍生成→导入→导出，用它自带的保真账本和对比度校验判断产物是否真能交付。理由：原文给的是可照抄的安装命令、四档参数、语义 token 与校验产出，不是只讲理念；但它本质是一个绘图技能，收益取决于你是否经常出图，且质量主张缺少独立证据。
- 原文：https://github.com/cathrynlavery/diagram-design
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T06:28:26.465Z

## 是什么

`cathrynlavery/diagram-design` 是一个 **Agent Skill（技能包）**，面向 Claude Code、Codex、Factory Droid、Pi、GitHub Copilot、Kiro、OpenCode 等 Agent Skills 兼容宿主：把自然语言需求或已有图源（draw.io / Mermaid / Excalidraw）改造成**自包含的 HTML + SVG 编辑级图表**。

关键性质（均出自 README）：

- 无构建步骤、无 JavaScript、无外部图片依赖；任意静态变体可直接在浏览器打开。
- 每种图型提供三种静态变体：minimal light / minimal dark / full-editorial。
- 默认静态 HTML；可选 `reveal / step / loop` 无障碍动效，动效不新增图型。
- 2.5.10 新增十种版式语法：Sankey、fishbone、Wardley map、kanban、user journey、deployment、dependency graph、UML class、story map、database schema；README 展示的图型覆盖架构、IT 现状、流程图、时序、状态机、ER、时间线、泳道、四象限、雷达、飞轮（Loop）、嵌套、树、组织图、层叠、Venn、金字塔/漏斗、柱状、树图、折线、甘特、散点、High-Level、Process、Medallion、数据流、DP integration、DP security matrix、极坐标、瀑布、架构 delta 等。
- 可**重绘**既有 draw.io / Mermaid / Excalidraw 源文件，按指定 format / size / detail / audience 输出。

它同时是一份「约束式提示词 + 产物约束」的范本：语义角色 token（用 `accent` 而不是 `#eb6c36`）、语义模式先于版式、首次使用拦截、保真账本。

## 具体做法

前提：你需要一个受支持的编码智能体宿主。README 声明官方构建只出自本仓库，其它同名 listing 为非官方拷贝；网络行为见 PRIVACY.md（原文未展开）。

**1. 安装（按宿主各取一条，命令原文照抄）**

Claude Code：

```text
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design
```

然后启用更新：运行 `/plugin` → 打开 **Marketplaces** → 选中 **diagram-design** → 选 **Enable auto-update**（Claude Code 对第三方 marketplace 默认关闭自动更新）；提示时运行 `/reload-plugins`。

Codex：

```bash
codex plugin marketplace add cathrynlavery/diagram-design
codex plugin add diagram-design@diagram-design
```

要立即拉更新：`codex plugin marketplace upgrade diagram-design`，然后新开会话。

GitHub Copilot：

```bash
copilot plugin marketplace add cathrynlavery/diagram-design
copilot plugin install diagram-design@diagram-design
```

用 `copilot skill list`（或交互式会话里的 `/skills`）确认技能已被发现；更新：`copilot plugin marketplace update diagram-design` 再 `copilot plugin update diagram-design@diagram-design`。

Factory Droid：

```bash
droid plugin marketplace add https://github.com/cathrynlavery/diagram-design
droid plugin install diagram-design@diagram-design --scope user
```

前提：Droid 按 commit 跟踪 Git 插件，不看 manifest 里的显示版本号；更新用 `droid plugin marketplace update diagram-design` + `droid plugin update diagram-design@diagram-design --scope user`，再新开会话。

Pi：

```bash
pi install https://github.com/cathrynlavery/diagram-design
```

在已打开的 Pi 会话里运行 `/reload`；显式调用用 `/skill:diagram-design`；更新用 `pi update --extensions`。

Kiro：导入仓库子目录 URL：

```text
https://github.com/cathrynlavery/diagram-design/tree/main/skills/diagram-design
```

Kiro 会把技能拷进 `.kiro/skills/`（工作区）或 `~/.kiro/skills/`（全局），更新需重新导入该 URL。

OpenCode：把 `skills/diagram-design/` 拷或软链到项目的 `.opencode/skills/diagram-design`，或全局 `~/.config/opencode/skills/diagram-design`；没有 marketplace 包，只能换目录更新。

Claude Cowork（组织 marketplace）：先把公开仓库镜像到你组织自己的私有/内部仓库 → **Organization settings → Plugins → Add plugin → GitHub** 连接该镜像 → 在 marketplace 菜单勾 **Sync automatically**。同步只在「含插件版本号提升的 PR 合并到镜像默认分支」时触发，直接 push 不触发。

**2. 可编辑安装（准备改风格指南时用）**

```bash
git clone git@github.com:cathrynlavery/diagram-design.git ~/code/diagram-design

# Pi：把 checkout 注册为本地包
pi install ~/code/diagram-design

# Claude Code：软链内部技能
ln -s ~/code/diagram-design/skills/diagram-design ~/.claude/skills/diagram-design

# 其他 Agent Skills 宿主：只建你用得到的根目录
mkdir -p ~/.agents/skills ~/.cursor/skills ~/.cline/skills ~/.kiro/skills ~/.config/opencode/skills ~/.copilot/skills
ln -s ~/code/diagram-design/skills/diagram-design ~/.agents/skills/diagram-design
ln -s ~/code/diagram-design/skills/diagram-design ~/.cursor/skills/diagram-design
ln -s ~/code/diagram-design/skills/diagram-design ~/.cline/skills/diagram-design
ln -s ~/code/diagram-design/skills/diagram-design ~/.kiro/skills/diagram-design
ln -s ~/code/diagram-design/skills/diagram-design ~/.config/opencode/skills/diagram-design
ln -s ~/code/diagram-design/skills/diagram-design ~/.copilot/skills/diagram-design
```

前提：托管安装可能覆盖你对 `references/style-guide.md` 的直接修改；`~/.diagram-design/profiles/` 里的 profile 与带 `.diagram-design` 标记的项目不受更新影响。

**3. 品牌 onboarding（约 60 秒，让它长得像你的品牌）**

对智能体说（原文示例）：

```text
onboard diagram-design to https://yoursite.com
```

流程：抓首页 → 提取主色板与字体栈 → 映射到语义角色 `paper / ink / muted / accent / link` → 展示 proposed diff → 你回 yes, apply it → 写入 `references/style-guide.md`。

提取映射（README 表格）：`<body>` 背景→`paper`；主文字色→`ink`；次级/说明文字→`muted`；卡片或容器→`paper-2`；最常用品牌色（CTA/link/heading）→`accent`；`<h1>` 字体→`title`；`<body>` 字体→`node-name`；`<code>/<pre>` 字体→`sublabel`。

写 token 前会校验 `ink` 在 `paper` 上的 WCAG AA 对比度：若站点颜色在 9–12px 图表字号下不达标，会提出调整值并解释原因。品牌匹配还会产出 fidelity receipt（采样 URL、精确颜色角色、字体族与字重、字体来源 URL、以及任何 fallback）；公开站字体直接用并在渲染后校验，而不是悄悄换成通用系统字体。

手工替代：直接编辑 `skills/diagram-design/references/style-guide.md` 的表格，下游（每张图、注释图元、gallery）全部读语义角色名。

首次使用拦截：在一个新项目里第一次用时，技能检查 `style-guide.md` 是否被定制过；没有就停下来问，大意是：这是本项目第一张图、风格指南仍是默认值，要跑 onboarding、手工粘贴 token，还是就用默认？（详见 `references/onboarding.md`）

多客户：给每个品牌 onboard 一次并存成命名 profile，在项目里放一个内容为 `profile: <slug>` 的 `.diagram-design` 标记文件；标记项目直接读 `~/.diagram-design/profiles/<slug>.md`，并行工作区可用不同品牌而不覆盖共享的 `style-guide.md`。profile 库在 Claude Code、Codex、Factory Droid、Pi 间共享；Claude Code 用 `/diagram-design:profile`，Factory Droid 或 Pi 用 `/profile`。

**4. 生成第一张图**

直接自然语言提需求（原文示例）：

```text
Make me an architecture diagram of my app: frontend, backend, database, Redis cache.
I need a quadrant showing Q2 projects by impact vs effort.
Give me a sequence of a bearer call with token refresh on 401.
```

（带分支的刷新用 `type-sequence.md` 里的 ALT combined-fragment 语法，参考 `skills/diagram-design/assets/example-sequence-oauth.html`，不是完整 authorize-code 握手。）

或从模板起步：

```bash
cp skills/diagram-design/assets/template.html my-diagram.html        # minimal light
cp skills/diagram-design/assets/template-full.html my-diagram.html   # 带摘要卡的编辑风
cp skills/diagram-design/assets/template-motion.html my-diagram.html # 可选无障碍动效
```

浏览全部图型：

```bash
open skills/diagram-design/assets/index.html       # macOS
xdg-open skills/diagram-design/assets/index.html  # Linux
```

**5. 重绘已有图（导入）**

```text
/diagram-design:import-drawio platform.drawio
/diagram-design:import-drawio platform.drawio --size=slide-16x9 --detail=simplified --audience=executive
/diagram-design:import-drawio platform.drawio --detail=faithful --format=png --page=all
/diagram-design:import-mermaid README.md --diagram=all
/diagram-design:import-mermaid architecture.mmd --size=slide-16x9 --detail=simplified
/diagram-design:import-excalidraw whiteboard.excalidraw --size=slide-16x9 --detail=simplified
```

也可自然语言：redraw this drawio file for my deck / make this Mermaid block editorial / make this whiteboard sketch presentable。

接受的输入：draw.io 的 `.drawio`、`.drawio.xml`、`.drawio.png`（内嵌图）、`.drawio.svg`；Mermaid 的 `.mmd`、`.mermaid`、以及 Markdown 里一个或多个 mermaid 围栏块；Excalidraw 的 `.excalidraw`、`.excalidraw.json`（不支持 `.excalidraw.png/.svg` 导出件）。只解析文本：不渲染、不跑 JavaScript、不用浏览器、不联网、不跟随点击目标。

四个旋钮（原文表格）：

- **Format**：`html` · `svg` · `png` · `html+png` —— 交付物。SVG 给 Figma，PNG 给幻灯片，HTML 给网页。
- **Size**：`doc-inline` · `doc-wide` · `slide-16x9` · `slide-4x3` · `social-og` · `social-square` · `print-a4-landscape` · `print-a3-landscape` · `print-letter-landscape` · `fit` —— 改 viewBox **和字号阶梯**（投屏幻灯片用 16px 节点名，不是 12px）。
- **Detail**：`faithful`（≤24 节点，分区）· `balanced`（≤12）· `simplified`（≤7）—— 按固定降级梯：先装饰、再重复、再叶簇、最后基础设施。
- **Audience**：`engineer` · `mixed` · `executive` —— 只改措辞，不改数量（`Auth Service / JWT · RS256 · :8443` → `Auth Service / token check` → `Sign-in`）。

每次导入以 fidelity ledger 收尾，原文示例：

```text
Detail: balanced · 12 source nodes → 8 drawn
Collapsed: "Token valid?" decision → edge label on Gateway → Auth
Dropped:   1 sticky note ("legacy path, to be retired") — unconnected in source
Kept in full: the request path (Web/Mobile → Gateway → Orders → Postgres)
```

不继承：源或渲染器坐标、源配色、源字体、draw.io 斜连线、Mermaid 自动布局、Excalidraw 手绘几何。一定继承：组件、关系、分组、方向。

**6. 导出 PNG / SVG**

Pi：

```text
/export-diagram path/to/diagram.html
/export-diagram path/to/diagram.html --svg-only
/export-diagram path/to/diagram.html --png-only --scale=3
/export-diagram path/to/diagram.html --registry
```

Claude Code 用 `/diagram-design:export-diagram …`（同名参数），或自然语言：Export this diagram as SVG and PNG。

前提：PNG 走 Playwright 在 2× 下栅格化，需一次性安装：

```bash
pip install playwright && playwright install chromium
```

SVG 会抽出 `<svg>` 节点并注入 Google Fonts，便于在浏览器、Figma、Illustrator 里独立渲染。两种格式都只含图，不含 `-full` 变体的编辑卡片与页眉（要整版截图就用浏览器打印成 PDF 或整页截图）。`--registry` 对使用 traceable block decomposition 语义模式的图，额外输出 `<basename>.registry.json`，把所有 block 的 `data-block-*` 元数据投影成结构化文件。动效图导出时按最终状态导出（原文此处被截断）。

**7. 内容约束（可直接复用的提示词原则）**

原文给出的写作纪律：`The highest-quality move is usually deletion.` 每个节点都要挣得自己的位置；强调色只留给读者应该先看的 1–2 个东西；目标信息密度 4/10。

**8. 语义模式与动效（可选）**

行为重要时，先选语义模式，再选视觉类型。九个已路由模式：fan-in 队列与瓶颈、重复阶段槽位、非结构化输入转换、成对策略轨迹、安全铺装路（secure paved roads）、治理目录、补偿性安全层、可追踪块分解、生命周期阶段图。每个模式定义触发器、图元、预算、反模式、静态回退与最近视觉类型（见 `semantic-patterns.md`）。

动效模式为 `none` / `reveal` / `step` / `loop`，必须有完整静态首帧、确定性时序、可交互时提供控件；reduced-motion 输出显示完整静态帧并隐藏或禁用播放控件；动效 HTML 只能用 `template-motion.html` 里那份经审查的控制器，任意或修改过的内联脚本、远程资源、CSS import、可执行 HTML 属性都会被拒绝。默认是 `none`。

## 对应的研究问题

**1. 能力发现**
把「我要一张架构图 / 四象限 / 带 401 刷新的时序图」这类需求，从 Figma 手绘或 Mermaid 默认布局里剥离出来交给编码智能体；两个更不常想到的能力是：**从网站提取品牌**（配色 + 字体 → 语义 token），以及**重绘既有 draw.io / Mermaid / Excalidraw 源文件**。此外它把「行为语义」（队列、策略轨迹、信任边界）独立于版式来描述，因此可以在不新增图型的前提下表达新概念。

**2. 任务匹配**
按宿主选安装方式（Claude Code / Codex / Copilot / Factory Droid / Pi / Kiro / OpenCode / Cowork）；按去处选格式（SVG→Figma，PNG→幻灯片，HTML→网页）；按观众选 `audience`，按承载量选 `detail`，按场景选 `size`；静态是默认，动效只在需要有序解释时开。README 也给了「什么时候不用」：只有属性差异的对比仍用表格，单张快照用 Architecture，架构对比才用 Architecture delta 的 Before · Changes · After。

**3. 条件供给**
需要装插件/技能，并（GitHub 系宿主）打开 marketplace 自动更新；要品牌匹配就提供站点 URL，或手工改 `style-guide.md`；多客户场景要准备命名 profile 与 `.diagram-design` 标记文件；导出 PNG 要先装 Playwright 与 Chromium；导入要提供源文件路径与容器格式；每次请求最好显式给出 format / size / detail / audience。技能还会主动索取反馈：首次使用拦截会问你跑 onboarding、手工粘 token，还是用默认。

**4. 主动推进**
原文涉及的「自动发生」只有两类：marketplace 自动更新（Claude Code 需一次性打开开关；Cowork 由含版本号提升的 PR 合并触发同步，直接 push 不触发），以及首次使用时的拦截提问。原文**没有**给出按时间、事件或状态持续运行的编排，这一项无依据。

**5. 效果验证**
可检查的产出包括：fidelity receipt（采样 URL、颜色角色、字体族与字重、字体来源 URL、fallback）；WCAG AA 对比度校验（不达标会给出调整值并解释）；导入后的 fidelity ledger（列出合并、折叠、丢弃了什么，示例为 12 源节点→8 绘制）；无障碍契约（`role="img"`、可解析的 `aria-labelledby`、首子元素 `<title>/<desc>`、按图与变体加前缀的 ID，避免同页多 SVG ID 冲突）；`--registry` 输出的结构化 `data-block-*` 投影。这些都能回答「有没有做对」；但原文没有任何关于省时或质量提升幅度的量化数据。

## 与已有做法的关系

- **Agent skills（清单状态 adopt）**：这条正是 Agent Skills 的一个成熟实例，可直接当作「怎么写好一个技能」的样本——语义角色 token 而非硬编码颜色、`references/` 与 `assets/` 分层、首次使用拦截、静态回退、反模式清单、保真账本。技能本体位于 `skills/diagram-design/`。
- **Claude Code（adopt）**：README 给出 Claude Code 的 marketplace + plugin 安装、`/plugin` 里的自动更新开关、`/reload-plugins`、以及 `/diagram-design:*` 斜杠命令族，可作为这个已 adopt 条目的具体用法补充。
- **Cursor（watch）**：仅在可编辑安装里出现 `~/.cursor/skills/diagram-design` 软链路径（归在「其他 Agent Skills 兼容宿主」），安装章节没有 Cursor 的正式步骤。
- **Cline（watch）**：同上，只在可编辑安装里出现 `~/.cline/skills/diagram-design`。
- **OpenCode（watch）**：README 有明确段落（拷或软链到 `.opencode/skills/diagram-design` 或 `~/.config/opencode/skills/diagram-design`），并说明没有 marketplace 包、只能替换目录更新。
- **GitHub Copilot（清单状态 drop）**：README 把 Copilot 列为受支持宿主并给出完整安装与更新命令，还提到会安装共享技能及其 doctor、export、import、profile 能力。清单状态是 drop，二者不一致，值得回头核对当初判 drop 的理由是否仍成立。
- **Hermes（watch）**：README 未提及，清单中没有对应依据。
- **Trendshift（watch）**：README 顶部挂有本仓库的 Trendshift 徽章（trendshift.io/repositories/26141），只是来源标识，不含方法内容。

## 证据与局限

材料来源为仓库 README（抓取在导出章节末尾被截断，最后一句 For motion-enabled HTML, export the explicit final state: open 不完整），以及给定指标 stars=42926。

原文可核对的具体数据：

- 版本与新增能力：2.0 的 Loop（共享记忆枢纽的飞轮，虚线是回写）；2.3 的语义系统模式与可选无障碍动效；2.5.10 的十种新版式。
- `detail` 三档节点上限：faithful ≤24 节点且分区、balanced ≤12、simplified ≤7。
- 导入示例：12 节点的 draw.io 文件按 `balanced` 重绘，源的六种粉彩填充变成一个强调色，手工拖拽坐标变成 4px 网格；fidelity ledger 示例 12 源节点→8 绘制。
- 对比度按 9–12px 图表字号校验 WCAG AA；目标信息密度 4/10；强调色留给 1–2 个焦点。

**只是作者主张、没有证据的部分**：所谓 editorial quality、No Mermaid slop、No generic rounded boxes、最高质量的动作通常是删除，以及「60 秒完成品牌匹配」「不必再花 30 分钟挑颜色」——没有对照实验、时间测量或第三方评测；stars 数不代表质量。

**适用条件**：只适用于受支持的 Agent Skills 宿主，且使用者在做图（架构、流程、数据模型、定位图等）。动效只在需要有序解释时才开，默认静态。导入只解析文本，不渲染、不联网。Excalidraw 的 png/svg 导出件不支持。`-full` 变体的编辑卡片与页眉不进 PNG/SVG 导出。PNG 导出依赖 Playwright 与 Chromium。托管安装可能覆盖对 `references/style-guide.md` 的直接修改。

**未验证或未提供**：PRIVACY.md 的网络行为细节；这些命令在各自客户端当前版本上是否可用；中文或长文本下的排版表现；「改善」的量化证据。原文均未给出或未展开。

## 怎么试、怎么验证

最小试用（半天内可跑完）：

1. 只在一个宿主上装（推荐 Claude Code，命令最短）：`/plugin marketplace add cathrynlavery/diagram-design` → `/plugin install diagram-design@diagram-design` → 打开 auto-update 开关。
2. 用自己的站点跑一次 `onboard diagram-design to https://yoursite.com`，**先看它提出的 diff 再确认**，核对 `paper / ink / muted / accent` 是否与设计稿一致；故意用一个低对比度的站点色，看它是否真的提出调整值并解释原因。
3. 提三个覆盖不同选型路径的需求：架构图（组件+连接）、四象限（两轴定位）、带 401 刷新的时序图（走 ALT combined-fragment 语法）。
4. 拿一个已有的 draw.io 或 Mermaid 文件做两次导入，一次 `--audience=executive --detail=simplified`，一次 `--detail=faithful`，对比两次的 fidelity ledger 与画出的节点数。
5. 分别导出 SVG（给 Figma）和 PNG（`--scale=3`，给幻灯片），检查是否真的只含图、不含编辑卡片。

判断有没有改善（都能从产物直接读出）：

- **保真账本是否诚实**：拿 ledger 逐条对源文件，核对合并、折叠、丢弃的节点是否与实际一致；漏报即不可信，这是最关键的否决项。
- **降级是否可预测**：同一源在 faithful / balanced / simplified 下节点数是否分别落在 ≤24 / ≤12 / ≤7，丢弃顺序是否按「装饰→重复→叶簇→基础设施」。
- **品牌是否真落地**：fidelity receipt 里的颜色角色与字体是否与你站点一致；生成的 HTML 里强调色是否只用在 1–2 个焦点；信息密度是否接近 4/10（数节点与标注）。
- **无障碍是否达标**：SVG 是否有 `role="img"`、可解析的 `aria-labelledby`、首子元素 `<title>/<desc>`；同页内联两个 SVG 是否出现重复 ID；reduced-motion 下是否显示完整静态帧。
- **人工返工量**：从提需求到可交付改了几处（颜色、字号、节点增删、连线），与你现在在 Figma 或 Mermaid 里的基线相比。
- **可复现性**：同一提示词重跑一次，看它选的语义模式与视觉类型是否稳定，而不是每次换一种版式。

任一项明显不达标（尤其保真账本不诚实、对比度校验不生效），就把结论降为 study：只借鉴它「语义角色 token + 首次使用拦截 + 保真账本 + 降级梯」这套约束写法，不必继续用这个具体技能。
