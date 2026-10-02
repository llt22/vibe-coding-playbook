# nextlevelbuilder/ui-ux-pro-max-skill

- 结论：**值得一试**。先在单个真实前端项目上按 README 的命令装一遍（npm 装 ui-ux-pro-max-cli → uipro init --ai <你的 agent>），并用 --design-system --persist 生成 MASTER.md + pages 覆盖的分层检索方式试一个页面：原文给出了可直接复制的安装命令、search.py 参数、检索提示词和提交前检查清单，属于本项目中少见的“给 agent 补一块专业知识”的可照做做法；但所有能力数字均为作者自述、演示素材被作者自己标注为非本 skill 产物，且页面大量篇幅是付费版与自家产品推广，所以先小范围试、别全面铺开。
- 原文：https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T04:28:23.696Z

## 是什么

UI UX Pro Max 是一个“技能包”（skill），装进编码智能体后，让它在做 UI/UX 工作时自动获得设计知识库与推荐逻辑。README 自述包含：192 条行业推理规则、79 种可检索 UI 风格（其中 50 种 active）、192 套配色、74 组字体搭配、25 种图表类型、22 个技术栈指南、119 条 UX 指南。

实现形态：
- 一个 npm CLI（包名 `ui-ux-pro-max-cli`，命令名 `uipro`）把模板文件写进各 agent 的技能目录（如 `.claude/skills/`、`.cursor/skills/`、`.zcode/skills/`、`.agents/skills/`）。
- 核心是一个纯标准库的 Python 脚本 `scripts/search.py`，读 CSV 数据，用 BM25 排序做风格/配色/字体/图表/UX/技术栈检索，并能一次性输出完整设计系统。
- 技能激活方式分两类：多数平台在你说到 UI/UX 任务时自动激活；Kiro / GitHub Copilot / Roo Code / KiloCode 走 slash command `/ui-ux-pro-max`。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提检查**：需要 Node/npm 装 CLI；需要本机有 Python 3.x（脚本只用标准库、不装依赖、不联网）。
   ```
   python3 --version
   ```
   README 明确要求：这些安装步骤是给“人”的，agent 不应自行在用户机器上安装软件，应向你询问——这是原文明说的权限边界。

2. **全局安装 CLI**（注意包名与命令名不同；README 明说旧的 `uipro-cli` 已过期不要用）：
   ```bash
   npm install -g ui-ux-pro-max-cli
   ```

3. **进项目并装到你的 agent**（先 dry-run 看会写哪些文件，避免污染仓库）：
   ```bash
   cd /path/to/your/project
   uipro init --dry-run
   uipro init --ai claude      # Claude Code
   uipro init --ai cursor      # Cursor
   uipro init --ai copilot     # GitHub Copilot
   uipro init --ai opencode    # OpenCode
   uipro init --ai zcode       # ZCode
   uipro init --ai universal   # .agents/skills/ 通用目录
   uipro init --ai all         # 全部
   ```
   可选全局安装（所有项目可用）：
   ```bash
   uipro init --ai claude --global   # ~/.claude/skills/
   uipro init --ai cursor --global   # ~/.cursor/skills/
   uipro init --ai universal --global # ~/.agents/skills/
   ```
   Claude Code 也可走插件市场：
   ```
   /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
   /plugin install ui-ux-pro-max@ui-ux-pro-max-skill
   ```
   Trae 需先切到 SOLO 模式；Kiro / Copilot / Roo Code / KiloCode 用 `ui-ux-pro-max <你的请求>` 这种 slash command。

4. **日常用法**：直接用自然语言提 UI/UX 请求即可（build / design / create / implement / review / fix / improve 触发）。原文示例：
   ```
   Build a landing page for my SaaS product
   Create a dashboard for healthcare analytics
   Design a portfolio website with dark mode
   Make a mobile app UI for e-commerce
   Build a fintech banking app with dark theme
   ```
   想要特定技术栈就在 prompt 里点名，不写默认 HTML + Tailwind。

5. **直接调用设计系统生成器**（绕过对话，拿到确定输出；注意 Continue/Droid/ZCode 的目录名要替换为 `.continue/skills/`、`.factory/skills/`、`.zcode/skills/`）：
   ```bash
   # ASCII 输出
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"
   # Markdown 输出
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech banking" --design-system -f markdown
   ```
   README 给出的输出结构：Pattern（落地页结构 + 转化策略 + 区块顺序）、Style、Colors（含 hex 与用途）、Typography（含 Google Fonts 链接）、Key Effects、AVOID（行业反模式）、PRE-DELIVERY CHECKLIST。

6. **单域检索**（查规则而不是要整套系统）：
   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "glassmorphism" --domain style
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "elegant serif" --domain typography
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dashboard" --domain chart
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "error summary validation" --domain ux
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "badge chip label wraps to second line" --domain ux
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "icon button accessible label" --domain icons
   ```

7. **按技术栈检索**：
   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "form validation" --stack react
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "responsive layout" --stack html-tailwind
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "tableview binding" --stack javafx
   ```
   原文说明：Web 栈检索是有版本意识的，不提旧主版本时只返回当前有效指南；显式写旧版本（如 `Svelte 4`、`Next.js 15`）只返回带 Status/Applies To 标注的 legacy 行，没有命中就不返回，不混代。

8. **把设计系统落盘成文件（Master + Overrides 模式）**——这是原文里最适合跨会话复用的做法：
   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp"
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp" --page "dashboard"
   ```
   生成结构：
   ```
   design-system/
   └── myapp/
       ├── MASTER.md           # 全局唯一真源（颜色、字体、间距、组件）
       └── pages/
           └── dashboard.md    # 仅记录对 Master 的偏离
   ```

9. **后续每次建页都用同一段检索提示词**（原文原样给出，可直接复制）：
   ```
   I am building the [Page Name] page. Please read design-system/[project-slug]/MASTER.md.
   Also check if design-system/[project-slug]/pages/[page-name].md exists.
   If the page file exists, prioritize its rules.
   If not, use the Master rules exclusively.
   Now, generate the code...
   ```
   规则是：页面文件存在则覆盖 Master，不存在则只用 Master。

10. **交付前逐条对检查清单**（原文 PRE-DELIVERY CHECKLIST 原文条目）：
    - [ ] No emojis as icons (use SVG: Heroicons/Lucide)
    - [ ] cursor-pointer on all clickable elements
    - [ ] Interaction timing follows the platform, component, and user preference
    - [ ] Light mode: text contrast 4.5:1 minimum
    - [ ] Focus states visible for keyboard nav
    - [ ] prefers-reduced-motion respected
    - [ ] Text, chips, and badges reflow without clipping or broken labels
    - [ ] Responsive: 375px, 768px, 1024px, 1440px

11. **维护/卸载**（可选）：
    ```bash
    uipro versions
    uipro update            # 或 uipro update --global
    uipro uninstall --ai claude
    uipro init --offline    # 兼容位，装内置模板
    ```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
原文的立论就是“把 UI/UX 设计决策交给 agent”。具体可交给它的：按产品/行业类型生成整套设计系统（Pattern + Style + Colors + Typography + Effects + 反模式）；按关键词检索风格/字体/图表/UX 规则；按技术栈检索该栈的布局与表单实践；对已写好的 UI 做 review / fix / improve（触发词里明确包含 review、fix、improve）。README 把“行业反模式”（如银行别用 AI 紫粉渐变）单列为一项能力，这类知识通常是团队口头约定，现在变成了可检索条目。

**2. 任务匹配**
原文给了明确的分派口径：
- 按平台分：多数 agent 是“自动激活”，Kiro / Copilot / Roo Code / KiloCode 必须用 slash command；Trae 要先切 SOLO。
- 按技术栈分：22 个栈各自有独立指南文件（React / Next.js / shadcn/ui / Vue / Nuxt / Nuxt UI / Angular / Laravel / Svelte / Astro / Three.js / JavaFX / WPF / WinUI 3 / Avalonia / Uno / UWP / SwiftUI / Jetpack Compose / React Native / Flutter / HTML+Tailwind），并说明 Web 栈检索按版本分流。
- 按任务形态分：整套设计系统生成（`--design-system`）vs 单点查询（`--domain` / `--stack`）vs 跨会话持久化（`--persist`）。

**3. 条件供给**
- 环境：Node/npm、Python 3.x（脚本无依赖、不联网——这一点降低了权限风险）。
- 上下文：必须告诉它产品/项目类型和项目名（`-p`），做页面级覆盖还要给页面名（`--page`）；要指定栈（`--stack`）否则默认 HTML + Tailwind。
- 持久化的信息：落盘 `design-system/<slug>/MASTER.md` 与 `pages/*.md`，再用固定检索提示词把它喂回给 agent——这是“把一次性对话结论变成长期上下文”的具体供给方式。
- 权限边界：README 明确 agent 不得自行装软件，需向人类确认。

**4. 主动推进**
有跨会话的可持续性机制：设计系统写文件、规则是“先查 page 覆盖、再退到 Master”，因此后续每个新页面都能被同一份真源约束，不必每次重述风格。此外 skill 在检测到 UI/UX 请求时自动激活（无需人工调用）。原文**没有**提供时间/事件/状态触发的自动化（如 CI 定时检查、watch 文件变化），这部分无依据。

**5. 效果验证**
- pre-delivery checklist 是一份可逐条勾选的产物验收表（对比度 4.5:1、focus 可见、respects prefers-reduced-motion、四个断点 375/768/1024/1440、图标不用 emoji、chip/badge 不裁剪不换行错乱）。
- UX 指南里对“文本韧性”给了可测口径：长 token/URL 在窄宽、浏览器缩放、文字缩放、用户自定义间距下不得裁剪；chip 集合应换行或用可操作的 `+n`；截断必须提供可访问的完整值路径；徽章含义不得只靠颜色。
- 仓库侧有数据校验命令（`npm --prefix cli run verify:data`、`validate:catalog-summary`），但那是校验它自己的目录数据与快照哈希，**不是**校验你产出的 UI 质量。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：原文支持，且是最顺的一条路——插件市场两条命令即可，或 `uipro init --ai claude`，skill 自动激活，脚本固定在 `.claude/skills/ui-ux-pro-max/scripts/search.py`。
- **Cursor（watch）**：原文支持，`uipro init --ai cursor`，默认写 `.cursor/skills/`，自动激活。
- **GitHub Copilot（drop）**：原文仍把 Copilot 列为 workflow mode（`/ui-ux-pro-max ...`）。这与清单里给出的 drop 状态不一致，可作为复核点，但本文不据此推翻清单结论。
- **OpenCode（watch）**：原文列在自动激活支持名单里，`uipro init --ai opencode`。
- **ZCode（avoid）**：原文有 `uipro init --ai zcode`、`~/.zcode/skills/` 全局安装和目录替换说明。清单给 avoid 而原文给支持，属于需要留意的冲突。
- 清单中没有的其他平台：Windsurf、Antigravity、Kiro、Codex CLI、Qoder、Roo Code、Gemini CLI、Trae、Continue、CodeBuddy、Droid (Factory)、KiloCode、Warp、Augment、CodeWhale，以及通用目录 `.agents/skills/`（`--ai universal`）。

## 证据与局限

**原文给出的具体内容（可作为依据）**：完整安装命令与参数、22 个平台的分派方式、`search.py` 的各类调用示例、Master/Overrides 的目录结构与检索优先级规则、可直接复制的检索提示词、8 条交付前检查清单、文本韧性的可测口径、以及一个完整的设计系统输出样例（Serenity Spa：Soft UI Evolution、#E8B4B8/#A8D5BA/#D4AF37/#FFF5F5/#2D3436、Cormorant Garamond + Montserrat）。

**只是作者主张、无独立验证的部分**：
- 所有能力数字（192 规则、79 风格/50 active/29 supplemental/9 deprecated、192 调色板、74 字体配对、25 图表、22 栈、119 UX 指南、1,934 Google Fonts、105 图标行、1,512 上游图标清单）全部来自 README 自述，没有第三方评测或对比数据。
- 没有任何“用了之后 UI 质量提升多少”的前后对比、任务成功率或人工评分。
- 提供的 star 数（132103）与该仓库体量与常见同类项目明显不成比例，可信度需自行核实。
- README 有相当篇幅是付费 Premium 版升级引导（uupm.cc）与自家其他产品推广（NextLevelBuilder、GoClaw、AgentKit、TOSE、3dviz-pro-max），属于营销内容，阅读时需剥离。
- 关键反证：README 自己标注 3dviz 的演示是 “author-supplied project recorded before this skill existed”“visual inspiration, not a benchmark”——即那段演示并非本 skill 的产物。
- 部分表述含糊、不可直接执行，例如 “Interaction timing follows the platform, component, and user preference”“Accessibility: risk:conditional; verify requirements”，只有对比度 4.5:1 是硬阈值。

**适用条件**：面向 UI/UX 相关工作（建页面、做设计系统、review 前端界面）；需要 Node 环境和 Python 3.x；依赖各 agent 平台的技能目录约定，换平台要重装/换目录；数据驱动型检索，对“行业 + 产品类型”这类输入的匹配质量影响很大。

## 怎么试、怎么验证

**最小试用（建议半天内完成）**：
1. 选一个真实的小前端项目、一个还没做的页面，选你已在用的 agent（清单里 Claude Code 是 adopt，优先它）。
2. 先 `uipro init --dry-run` 看它要写哪些文件，确认不覆盖你已有的 agent 配置，再正式 `uipro init --ai claude`。
3. **对照组**：同一句 prompt（例如 “Build a landing page for X”）在装 skill 之前跑一次，装之后跑一次，两次都留档。
4. 用 `search.py "<你的行业/产品>" --design-system --persist -p "Demo"` 落盘 `design-system/demo/MASTER.md`，然后建第二个页面，用第 9 步那段检索提示词，看它是否真的按 Master 走。

**判断有没有改善的指标（都可人工核对，不依赖作者自述）**：
- 交付物是否给出了明确的配色 hex、字体、间距与区块结构；两次对照是否差异明显。
- 逐条过 pre-delivery checklist：对比度是否 ≥ 4.5:1（用任意对比度工具实测）、键盘 focus 是否可见、`prefers-reduced-motion` 是否生效、375/768/1024/1440 四个断点是否可用、图标是否仍是 emoji、chip/badge 在窄宽下是否裁剪或标签错乱。
- 返工轮次：从“生成完”到“你愿意合入”之间你改了几轮、改了什么类型的问题（风格类 vs 功能类）。
- 一致性验证（针对持久化机制）：第二个页面是否复用 MASTER 的颜色/字体，还是重新发明了一套；两者冲突时它有没有按“page 覆盖 master”的规则处理。
- 成本与安全：装后上下文/token 占用增加多少；断网跑一次 `search.py` 确认确实不联网；确认 agent 没有在未经你同意时安装任何软件。

**结论用法**：若在 checklist 的可验证项上明显改善、且返工轮次下降，再考虑把它升级为 adopt 并写进手册（配合清单里 Claude Code 的 adopt 状态）；若只是“看起来更花哨”但 checklist 项没有实质改善，维持 try 或降为 study。
