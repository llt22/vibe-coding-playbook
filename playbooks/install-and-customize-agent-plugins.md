# 让 AI 按你团队的流程干活、不漏事、长任务不掉线，并拿出证据说明有没有变好

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：你已经在用 Claude Code 或 Cowork，但每次让 AI 做某个职能的活都要重新解释领域知识和公司上下文，AI 中途问的问题、发现的 bug 和失败的测试会淹没在对话里，长任务跨上下文窗口时没人交接、没人唤醒、没人拍板，而且你说不清装了一堆插件到底有没有变好。
> 先试这一步：先记录 2–3 次基线（完成时间、返工次数、补齐上下文的次数），然后只装一个和你当前工作最贴近的职能插件或技能包，跑通一个斜杠命令，再打开它的 skills/ 把一条指令改成你团队的真实流程。
> 最近修订：2026-10-17

## 解决什么问题

你已经在用 Claude Code 或 Cowork，但每次让 AI 做某个职能的活（写 SQL、准备客户通话、审合同、对账、做 3D 资产、写 PRD、画论文示意图等），都要重新解释领域知识、反复交代公司上下文、手动把外部工具的数据贴进去，而且 AI 给出的流程往往是教科书做法，不是你团队实际的做法。另外两个常见缺口：AI 在会话中途问你的问题、顺手发现的 bug、失败的测试，过一会儿就淹没在对话里，要你自己翻回去捞；装完一堆插件后，你说不清到底有没有变好。第三个缺口在长任务上最扎眼：任务跑得比一个上下文窗口更久时，交接由谁做、新上下文有没有接住前面的进度、你离开两小时后 run 怎么被唤醒、需要你拍板的选择会不会把整个 run 卡住——过去都靠人守着。

本手册用四层叠加来补：官方插件市场层、职能层、收口层、观测层（广/深）、交接层。官方市场 `anthropics/claude-plugins-official` 给出标准入口：`/plugin > Discover` 浏览、`/plugin install {plugin-name}@claude-plugins-official` 安装，并定义插件目录结构、marketplace 条目的不可变 slug、以及只有 SKILL.md 的 skill 包如何声明。但原文没有列出任何具体插件——它解决的是从哪装、按什么格式打包，不保证装了就有效果。

职能层除了 Anthropic 的 11 个知识工作插件（`anthropics/knowledge-work-plugins`），还有独立 Agent Skills 仓库，目前三个实例：

- `EL4CTEO/blender-skills`：20 个 Blender 工作流（建模、UV、PBR、烘焙、绑定、动画、优化、导出、渲染、模拟、资产 QA）。
- `deanpeters/Product-Manager-Skills`：77 个 PM 技能 + 6 个命令式工作流，可被能读结构化 Markdown 的多种代理使用。
- `lgwrightlab/schematic-figure`（本次新增）：科研论文示意图与专利附图。产出可逐处编辑的矢量图（SVG、PDF）并同时给出绘制代码；用 look（风格：flat / in 3D / render it in Blender / photoreal）、size（Width 89 mm 单栏、183 mm 双栏）、depth（draft / standard / full 三档检查强度）三个旋钮控制出图；可并行跑三个 agent 出三种设计再合并。原文明确它不替代设计图的人，科学内容与细节仍需人工检查与微调。

三者与 knowledge-work-plugins 解决同一类问题：把领域知识、工具连接和固定动作预打包，让代理在相关时自动取用。但三个仓库的材料都只到 README，技能内部提示词、脚本与 QA 规则未展示，必须先小范围实测。

收口层 `petekp/inbox` 把会话里散落的问题、任务、议题和机会收进一个与会话并排的面板，并在 Claude 声称测试通过、但上次运行失败或改动后没再跑过时叫停。观测层（广）`whyashthakker/awesome-claude-code-mods` 里的 Session 观测类 mod，能把上下文占用、工具失败次数、工具延迟、每轮时长变成会话里可对比的数字。观测层（深）`YeonwooSung/my-claude-code-mods`：`agent-profiler` 看一次会话的时间去向并可导出 OTLP trace；`context-inspector` 分析上下文浪费；`time-machine` 用 shadow-git 快照记录每一次工具调用；`loop-detective` 检测重复失败和 edit/retry 循环；`pin-memo` 固定备忘和 todo；`model-effort-band` 显示模型与 effort。交接层 `Arjun0014/project-sentinel` 是长时间 Claude Code 运行的任务控制台：状态栏 HUD、Control Room 面板、Autopilot 自动交接、Watchers 定时唤醒、Mission Queue 边界投递、Decision Inbox 收集需要你拍板的选择，以及 Cache Guardian、Cold Resume Guard、Run Budget、Machine load 等护栏。

要解决的问题因此是七件事叠加：如何从官方插件市场发现并安装插件；如何选一个职能插件或独立 Agent Skills 包（Blender、PM、科研示意图等）、装好、跑通、按团队真实流程改一条；如何让 AI 把没收口的事交出来；如何用数字判断改造有没有效果（观测层有两个来源，还要决定选哪个、怎么量它自身开销）；长跑任务跨上下文窗口时如何让交接、等待和拍板都不掉线；以及三个技能包都只到 README 时，怎么用最小试用判断它们值不值得留。

## 适用与不适用

**官方插件市场**：适用——本机已安装并运行 Claude Code、能访问该 marketplace；想先浏览再决定装哪个；想按官方规范打包团队能力并分发；愿意安装前检查插件主页和来源，确认信任其包含的 MCP server 和文件访问。不适用——没在用 Claude Code；需要先看到具体插件名单、评价或效果数据（原文只有 README，未收录任何具体插件）；期望 Anthropic 替你审核插件行为（原文明确不控制插件里的 MCP server、文件或其他软件，也无法验证它们会按预期工作或不会变化）；不能接受插件访问文件与外部服务（应从单机、非敏感任务开始，不要一上手就接入生产凭据）。

**其余各层（职能、收口、观测、交接）**：适用前提是团队已用 Claude Code（有 `claude` CLI）或可用 claude.com/plugins 的 Cowork；所需外部工具能通过 MCP 接入；有人愿意读插件的 `skills/` 并按本团队流程改写；你希望把某职能的领域知识、工具连接和固定动作预打包复用；你愿意多花一步装观测类 mod 来让「有没有变好」有数字支撑。逐层额外前提：观测层（广）Claude Code 2.1.287+，在 CLI 或 Claude Desktop 的 Code tab 里用；观测层（深）具备官方 Mods 机制环境，并接受每个 mod 的安装命令与配置项要进各自 README 读；收口层 Claude Code 2.1.292，PRs 标签页还需已安装并登录的 `gh`；交接层 Claude Code 2.1.289 或更新且带 function-hooks 插件 API，运行面为终端 CLI 或 Claude Desktop 的 Code tab 本地会话，README 只在 Windows 11 和 Claude Code 2.1.289 / 2.1.293 / 2.1.295 上验证过。

**独立 Agent Skills 实例**：

- Blender：Blender 5.2 LTS+；代理环境支持 Agent Skills（Claude Code 插件或 `.agents/skills` 目录）；可选 Blender MCP server；愿意在隔离环境用示例提示词跑一个真实资产任务，并导出到 Unreal / Unity / Roblox 做一次实际检查。
- PM：能读结构化 Markdown 的代理（Claude Code、Claude Desktop/Web、OpenAI Codex、ChatGPT、Cursor、Windsurf、n8n、LangFlow、CrewAI、Gemini 等）；愿意用真实 PM 任务跑一遍并与裸提示对照；可选 Python 环境跑本地 playground。
- 科研示意图：你在写论文或报告，需要一张示意图或专利附图；本机有 Node.js 22+ 与 Chromium；可选 Blender（3D 渲染）与 RDKit（分子图）；有一个项目文件夹当工作区；愿意人工复核科学内容与细节。

**不适用**：

- 只看 README 就指望复现技能内部的提示词、脚本、配置或 QA 规则：三个仓库材料都只到 README。Blender 未展示各技能内部的提示词、脚本、配置文件或 QA 规则；PM 材料末尾被截断在 “worth a bookmark if you work”，77 个技能正文质量无从验证；示意图仓库只有 README 与作者自制演示，没有量化评测。
- Blender：没有 Blender 5.2+ 或无法确认 MCP server 可用性；无法接受 42 stars 的单仓库风险；需要先看到性能数据、前后对比案例或失败模式。
- PM：需要先看到 77 技能正文质量与效果数据；不能接受 CC BY-NC-SA 4.0 许可限制（尤其商用）；指望 README 直接给效果验证方法。
- 示意图：指望它替你做设计（原文明确不替代设计图的人，只提供快速初稿与设计想法，科学内容与细节仍需人工检查与微调）；只看作者自制的五篇论文对比演示（发表版图 / Opus 5.5 无技能 / Opus 5.5 有技能）就当作效果数据（没有量化评分、盲评或通过率，也没有定义「更好」的标准）；要它自己按时间或事件持续推进（原文未给出这类机制，只有在同一文件夹里人工接续改图）；商用发布前不确认字体授权（内置 Latin Modern 字体是 GUST 字体许可，不同于代码的 MIT）。
- 其余各层：不具备上述条件只能停在看看；期望开箱即用、不做定制就大幅改善（职能插件原文自称 these plugins are generic starting points）；需要先看到官方效果数据、案例或 benchmark 才决定采用；无头或非面板场景（VS Code 聊天面板和 `claude -p` 会执行 hooks，但不显示 mod 面板）；敏感项目上装第三方 mod；会话很短且你本来就很少漏事（收口层每轮一次的额外调用摊得更重）；任务在单个上下文窗口内就做完（交接层的状态栏和 Autopilot 阈值用不上）；用远程（云）会话（交接层 README 明示尚未测试）；机器不是 Windows 11 或 Claude Code 版本不在作者验证过的范围里（先按「未在你的环境验证」对待）。

## 前置条件

1. 能使用 Claude Code（有 `claude` CLI）或访问 claude.com/plugins 的 Cowork。原文未说明 Cowork 的开放范围、价格或区域限制。
2. 观测层（广）要求 Claude Code 2.1.287+。mod 默认启用，不需要早期的 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` 之类环境变量开关。
3. 收口层（inbox）用 Claude Code 2.1.292 构建和测试；PRs 标签页需已安装并登录的 GitHub CLI `gh`；测试/构建要由 Claude 作为独立命令运行，插件才能拿到确切结果。
4. 交接层（Project Sentinel）要求 Claude Code 2.1.289 或更新且带 function-hooks 插件 API（mods），用 `claude --version` 检查；运行面为终端 CLI 或 Claude Desktop 的 Code tab 本地会话；远程（云）会话尚未测试；当前版本 1.6.3，MIT 许可，无运行时依赖、无构建步骤。
5. 自行确认仓库许可协议后再用于生产。knowledge-work-plugins 原文未说明许可协议；awesome-claude-code-mods 自称 70 个 MIT 打包插件，但社区条目属未审计的第三方项目；YeonwooSung/my-claude-code-mods 是建立在官方 mod 机制上的第三方扩展；Blender 是 MIT；PM 是 CC BY-NC-SA 4.0；schematic-figure 代码是 MIT，但内置 Latin Modern 字体是 GUST 字体许可，不同于代码许可。
6. 若要换 connector，需要知道自家工具栈的 MCP 接入方式，或已有 MCP server。
7. 能读懂 markdown 和 JSON 文件，愿意按团队真实流程改 skill 指令。
8. 准备一个非敏感、小体量的现有项目做试用。
9. 观测层（广）的 mod 无需运行时依赖、无需构建步骤。若要装 Git 类 mod，Git 要在 PATH 上；包类查看器要求项目里有 `package.json`，或手动指定路径。
10. 建议先记录 2–3 次基线（同一任务的完成时间、返工次数、补齐上下文的次数），再装插件对照；交接层另外记同类长任务的上下文溢出/被迫压缩次数，以及你手动守着 run 的次数。
11. 各层版本口径错开：观测层（广）2.1.287+、收口层在 2.1.292 上构建、交接层 ≥2.1.289。同时用多层前先 `claude --version` 核对；升级 Claude Code 后先 `/reload-plugins`，确认各面板还在。
12. 从 1.4.0 之前的 Control Room 升上来时，先确认两处行为变化：`Allow` 权限状态被移除（已保存的 Allow 读作 Default）；点 Kit 不再打开面板（改用状态栏按钮）。
13. 想用 Decision Inbox 那类「需要你拍板但不该停工」的机制，你要能在会话里看到 Claude Code 自己的对话框并作答；插件从不代你回答权限提示。
14. 观测层（深）建立在官方 Mods 机制之上。官方文档入口：`https://code.claude.com/docs/en/plugins/mods/overview` 与 `https://code.claude.com/docs/en/plugins/mods/create`。安装机制按官方文档使用 `plugin@marketplace`；本仓库原文只给了「Add this marketplace once」的机制描述，没有给出具体命令行。
15. 观测层（深）本地开发/测试前提：Node 22.19.0 或更高；依赖已用 `package-lock.json` 锁定；`npm run typecheck` 需要每个 `.claude-plugin/types` 下由引擎生成的声明；测试引擎侧需要 `CLAUDE_BIN` 指向 claude 可执行文件。
16. 要做开销对照实验：用一个一次性的大型代表性仓库并固定在一个 commit，保持相同的 Claude 引擎/模型/权限设置，用 `--plugin-dir` 显式加载这些 mod，同时禁用其他已安装插件。
17. 观测层（深）兼容版本口径：原始三套 engine 测试套件、Pin Memo、Model Effort Band 在 Claude Code 2.1.292 验证过；Loop Detective 在 2.1.280 验证过；2.1.280 早期访问版下 profiler 可用，但 Context Inspector 缺少 `session.append`，Time Machine 的 per-test 选项会被忽略。不同版本下的行为不要混着比较。
18. 官方插件市场：本机已安装并运行 Claude Code 且能访问该 marketplace。安装/更新/使用前先确认你信任这个插件；原文明确 Anthropic 不控制插件里的 MCP server、文件或其他软件，也无法验证它们会按预期工作或不会变化。
19. 如果你是插件作者：发布前定好 `name`，之后不要改——marketplace 条目里的 `name` 是不可变 slug，用户按这个 slug 安装，改名会让他们的安装报 `plugin-not-found`；要改 UI 显示名改 `displayName`；确实必须改名时在 `.claude-plugin/marketplace.json` 顶层加 `renames` 映射。
20. 如果源仓库只有 `SKILL.md`、没有 `.claude-plugin/plugin.json`，就在 marketplace 条目里用 `strict: false` + 显式 `skills` 数组声明；每个路径相对 `source.path`，指向包含 `SKILL.md` 的目录；注册为 `<plugin-name>:<skill-name>`。
21. Blender 技能包：需要 Blender 5.2 LTS+；支持 Claude Code、Codex、OpenCode、Gemini CLI、GitHub Copilot、Cursor；Claude Code 走插件市场，其他代理通过 `.agents/skills` 读取；可选 Blender MCP server；MIT 协议；仓库 metrics 显示 42 stars；作者声称 “Every script is tested in a real Blender.”，但材料只到 README。
22. PM 技能包：截至 v0.84（标注日期 2026-08-10）共 77 个技能 + 6 个命令式工作流；可被 Claude Code、Claude Desktop/Web、OpenAI Codex、ChatGPT、Cursor、Windsurf、n8n、LangFlow、CrewAI、Gemini 等能读结构化 Markdown 的代理使用；许可 CC BY-NC-SA 4.0；GitHub star 数 7421；每个技能是一个 `SKILL.md`，固定结构：Frontmatter（`name`/`description`/`type`/`intent`/`best_for`/`scenarios`）、Purpose、Input、Key Concepts、Application、Examples、Common Pitfalls、References；技能分三层：Workflow 19、Interactive 27、Component 24。
23. PM 本地 playground 前提：本机有 Python 环境；API key 只通过环境变量提供，应用内不支持填 key；多 provider 支持 Anthropic、OpenAI、Ollama。
24. 往 PM 技能库加自己的技能时遵守约定：每个技能必须有 `## Input` 段落；不要用 `$ARGUMENTS` 模板，它只在 Claude Code 展开，在 Claude Desktop/Web、Codex、Streamlit playground 里会原样显示；校验器会强制这一约定，缺 Input 段落或正文里有裸 `$ARGUMENTS` 的技能会失败。
25. 示意图技能（schematic-figure）：需要 Node.js 22 或更高版本 + Chromium 浏览器；Blender 与 RDKit 为可选项（分别用于 3D 渲染与分子图）；导出 TIFF/EPS/PowerPoint 这类其他格式时，还需要 Python 3 加 Pillow、python-pptx、lxml，并安装了 `pdftops` 或 Ghostscript；需要一个项目文件夹作为工作区。
26. 示意图技能的 agent 在它被启动的目录工作，图写到 `figure/out/`，格式为 SVG、PDF、PNG，有时放在以图名命名的子文件夹里。先建好项目文件夹，再在其中启动 agent。
27. 在 Codex 中使用示意图技能，需要在提示里写出 `SKILL.md` 的路径。
28. 用示意图技能前先备好：详细技术描述（新概念必须给详细描述，短请求只对众所周知的概念有效）、一张同风格样例图（可选，作者推荐用于对齐配色/线宽/细节度）、目标宽度。

## 操作步骤

### 第 0 步：用官方插件市场发现并安装插件（做法 A / 做法 B）

**做法 A：作为使用者，先浏览再装**（前提：本机已安装并运行 Claude Code，且能访问该 marketplace）

1. 进入 Discover 页面挑选：

```text
/plugin > Discover
```

2. 用 marketplace 限定名安装：

```text
/plugin install {plugin-name}@claude-plugins-official
```

3. 安装/更新/使用前先确认信任这个插件。原文明确警告：Anthropic 不控制插件里包含哪些 MCP server、文件或其他软件，也无法验证它们会按预期工作或不会变化；细节看插件自己的主页。这一步不是可选步骤，而是安装前的前置检查。

**预期结果**：插件安装成功，可在低风险任务上试用。**失败处理**：若安装后调用失败/报错，先检查插件主页和来源；若一周内没有任何指标变好，卸载，并把结论记为「该插件无实质增益」而非「插件机制无效」。

**做法 B：作为插件作者，按标准结构组织**

4. 统一目录结构（原文参考实现 `/plugins/example-plugin`）：

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json      # Plugin metadata (required)
├── .mcp.json            # MCP server configuration (optional)
├── commands/            # Slash commands (optional)
├── agents/              # Agent definitions (optional)
├── skills/              # Skill definitions (optional)
└── README.md            # Documentation
```

5. 如果源仓库只有 `SKILL.md`、没有 `.claude-plugin/plugin.json`，就在 marketplace 条目里用 `strict: false` + 显式 `skills` 数组声明：

```json
{
  "name": "example-bundle",
  "description": "Brief description of the bundled skills.",
  "author": { "name": "Author Name" },
  "category": "development",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/example-org/sdk.git",
    "path": "packages/agent-skills",
    "ref": "main",
    "sha": "<commit sha>"
  },
  "strict": false,
  "skills": [
    "./skill-a",
    "./skill-b",
    "./skill-c"
  ],
  "homepage": "https://github.com/example-org/sdk"
}
```

`skills` 里每个路径都相对于 `source.path`，指向包含 `SKILL.md` 的目录；路径可以更深（如 `["./libA/skill-1", "./libB/skill-2"]`）。每个 skill 在 Claude Code 中注册为 `<plugin-name>:<skill-name>`。schema 细节见官方 marketplace 文档的 Strict mode 一节。

6. 发布前定好 `name`，之后不要改。要改 UI 显示名改 `displayName`；确实必须改名时在 `.claude-plugin/marketplace.json` 顶层加 `renames` 映射：

```json
"renames": {
  "old-name": "new-name"
}
```

Claude Code 插件加载器会读这个映射，在用户下次同步时把旧 slug 透明改写成新 slug。

（第三方想收录，走原文给出的 plugin directory submission form；外部插件需通过质量与安全标准审核，但原文未给出标准内容、审核流程或通过率。）

**怎么选**：只想发现和安装插件、不想先动职能插件 → 做法 A；要自己打包团队能力并分发 → 做法 B。官方市场与 knowledge-work-plugins 是并列入口：官方市场是标准发现与安装入口，knowledge-work-plugins 是一批具体职能插件的来源；原文没有说明后者是否在官方市场中，因此两者都写，按你的入口选择。

### 第 1 步：选一个与你当前工作最接近的职能插件

原文列出 11 个插件及各自声称的用途：productivity（任务/日历/日常流程/个人上下文）、sales（客户调研、通话准备、pipeline 复盘、外联起草、竞品 battlecard）、customer-support（工单分类、回复起草、升级打包、客户背景调研、把已解决问题转成知识库文章）、product-management（写 spec、路线图、用户研究综合、干系人同步、竞品跟踪）、marketing（内容起草、活动规划、品牌语气、竞品 brief、跨渠道效果汇报）、legal（合同审查、NDA 分类、合规、风险评估、会议准备、模板化回复）、finance（分录准备、对账、报表生成、差异分析、结账管理、审计支持）、data（写 SQL、统计分析、搭看板、分享前自检）、enterprise-search（跨邮件/聊天/文档/wiki 一次查询）、bio-research（临床前研究工具与数据库：文献检索、基因组分析、靶点优先级）、cowork-plugin-management（为组织定制或新建插件）。

**做法**：数据岗选 data，销售选 sales，法务选 legal，以此类推。只挑一个，不要一次装多个。

**如果你的职能不在上面，或需要跨运行时使用**：去看独立 Agent Skills 仓库，例如 Blender、PM、科研示意图。具体在第 4 步之二。

**预期结果**：你有一个明确的插件名或技能包名，后面命令里会替换。

### 第 2 步：安装职能插件（做法 A / 做法 B）

**做法 A：用 Claude Code 安装**

```bash
# Add the marketplace first
claude plugin marketplace add anthropics/knowledge-work-plugins
```

```bash
# Then install a specific plugin
claude plugin install sales@knowledge-work-plugins
```

把 `sales` 换成你第 1 步选的插件名。**预期结果**：原文称安装后插件自动激活——Skills fire when relevant, and slash commands are available in your session。

**做法 B：用 Cowork 安装**：直接从 https://claude.com/plugins/ 安装，或在 GitHub 浏览完整集合。原文未说明 Cowork 的开放范围、价格或区域限制，选之前自行确认。

**怎么选**：已经在用 Claude Code → 做法 A；用 Cowork → 做法 B。

### 第 3 步：验证职能插件已激活

在会话里确认对应斜杠命令出现，例如 `/sales:call-prep`、`/data:write-query`、`/finance:reconciliation`、`/product-management:write-spec`。

**预期结果**：命令出现并能成功执行。**失败处理**：命令不出现说明插件未生效，先回到第 2 步检查 marketplace 是否添加成功，不要继续往下做。

### 第 4 步：读懂插件结构，按团队真实流程改一条

原文给出的统一结构：

```
plugin-name/
├── .claude-plugin/plugin.json   # Manifest
├── .mcp.json                    # Tool connections
├── commands/                    # Slash commands you invoke explicitly
└── skills/                      # Domain knowledge Claude draws on automatically
```

对应关系：`skills/` 放领域知识和工作流，Claude 在相关时自动取用；`commands/` 放你显式触发的动作；`connectors`（`.mcp.json`）通过 MCP server 接外部工具；`plugin.json` 是清单。

四个定制方向：
1. **换 connector**：编辑 `.mcp.json`，指向你自己的工具栈（前提：知道自家工具栈的 MCP 接入方式或已有 MCP server）。
2. **加公司上下文**：把术语、组织结构、流程写进 skill 文件。
3. **调工作流**：改 skill 指令，让流程匹配团队实际做法，而不是教科书做法。
4. **建新插件**：用 `cowork-plugin-management` 插件，或照上面的目录结构为未覆盖的角色/流程新建。

**注意**：原文只给了总体步骤和目录结构，没有收录任何单个插件的具体 skill 内容、提示词全文或命令清单。要照做必须自己打开仓库对应目录去读。官方市场也定义了统一结构（第 0 步做法 B），并额外给出 `strict: false`、`renames`、`displayName` 等发布约束；两者结构相似，具体以各自仓库为准。

**预期结果**：Claude 在相关交互中自动取用你改过的知识和流程；用斜杠命令触发时，输出更贴近团队实际做法。这一步是价值所在——开箱插件只是通用起点。

### 第 4 步之二：用独立 Agent Skills 包落地一个具体职能（Blender / PM / 科研示意图）

适用前提：你的职能不在 knowledge-work-plugins 的 11 个里，或你希望在多个代理运行时之间复用同一套技能（`.agents/skills`），或你想先拿一个具体技能包验证「Agent Skills 到底能不能减少手工步骤」。一次只装 1–2 个技能，不要一次装全部。

**做法 A：Blender 技能包（3D 资产、建模、绑定、渲染、导出、QA）**

前提：安装 Blender 5.2+；选择要接入的代理：Claude Code，或 Codex / OpenCode / Gemini CLI / GitHub Copilot / Cursor。

1. Claude Code 插件安装：

```
/plugin marketplace add EL4CTEO/blender-skills
/plugin install blender-agent-skills@blender-agent-skills
```

2. 通用安装：克隆仓库并运行安装脚本。

macOS / Linux：

```bash
git clone https://github.com/EL4CTEO/blender-skills
./blender-skills/install/install.sh
```

Windows：

```powershell
git clone https://github.com/EL4CTEO/blender-skills
.\blender-skills\install\install.ps1
```

3. 选择安装目标：默认安装到 `~/.claude/skills` 和 `~/.agents/skills`。`.agents/skills` 可被 Codex、OpenCode、Gemini CLI、Copilot 和 Cursor 读取。可用选项：

```
--agent claude|codex|opencode|gemini|copilot|cursor|all
--project DIR   # 安装到单个项目
--uninstall     # 卸载
```

4. 可选配置 MCP 协作：希望代理直接操作你已打开的 Blender，就配置 Blender MCP server；不配则代理在后台启动 Blender 运行。

5. 用自然语言任务调用技能。README 示例提示词可直接复制：

```
Make a game-ready crate for Unreal with baked normals and LODs.
```

```
Rig this character with Rigify and export it to Unity with a walk cycle.
```

```
Check this model for z-fighting and floating parts, then export it for Roblox.
```

6. 开发与验证（若 fork 或修改技能包）：

```bash
python tools/validate_skills.py   # spec + token budget checks
python tools/run_tests.py         # 43 headless Blender tests (BLENDER_EXE to override)
```

前提：具备 Python 环境；Blender 可执行路径可通过 `BLENDER_EXE` 环境变量覆盖。

7. 技能清单中的路由入口：从 `blender-core` 开始，它负责运行代码、路由任务和 5.x API 规则。其余技能覆盖场景设置、硬表面建模、雕刻、重拓扑/UV、PBR 材质、纹理烘焙、几何节点、角色绑定、面部形态键、动画、游戏优化、导出管线、渲染、灯光 Lookdev、模拟、插件开发、管线自动化、资产 QA 和完整工作流配方。

**预期结果**：代理能调用 Blender 技能执行任务，产出可导入目标引擎的资产，`blender-asset-qa` 能报出 z-fighting、浮空部件、坏法线或权重问题，`validate_skills.py` 和 `run_tests.py` 能给出通过/失败信号。**注意**：材料只到 README，未展示各技能内部提示词、脚本、配置文件或 QA 规则；无法验证 43 个测试是否全部通过、是否真在 Blender 5.2+ 实测；42 stars 不能说明社区验证强度。

**做法 B：Product-Manager-Skills（产品管理：问题框定、发现、路线图、PRD、EOL、AI 产品）**

前提：已确定你在哪个代理运行时上工作；能读结构化 Markdown；可选本机 Python 环境。

1. 选平台并安装：

| 你的环境 | 安装方式 |
|---|---|
| Claude Code | 插件市场 |
| Claude Desktop / Web | 下载 starter pack，解压后逐个上传 skill ZIP |
| Codex | 下载 codex 包，安装 `.agents/skills` 和 `AGENTS.md` |
| 不确定 | 先用 starter pack |

Claude Code 两条命令：

```bash
/plugin marketplace add deanpeters/Product-Manager-Skills
/plugin install product-manager-skills@pm-skills
```

README 说明也可以只装单个技能。下载入口（GitHub Releases / 仓库 `dist/` 目录）：`pm-skills-starter-pack.zip`、`pm-skills-codex.zip`、`99-all-skills-pack.zip`，以及主题包 `02-discovery-pack` / `03-strategy-pack` / `04-delivery-pack` / `05-ai-pm-pack` / `06-market-intel-pack` / `07-lifecycle-eol-pack`。

2. 不想动代理配置时先跑本地 playground：

```bash
pip install -r app/requirements.txt
streamlit run app/main.py
```

三个功能：Learn、Find My Skill、Run Skills。多 provider：Anthropic、OpenAI、Ollama。API key 只通过环境变量提供，应用内不支持填 key。

3. 按「你这周像哪一句」选路线，第一句提示词可直接粘贴后替换细节。原文可用的提示词：

```text
Frame this problem: field sales reps 'don't use the CRM' and leadership wants gamification.
```

```text
My VP DM'd me: "Any chance the dashboard redesign lands next sprint? Board's asking." Analyze this before I reply.
```

```text
Run a market landscape scan on [your market], and tell me the decision it should support.
```

```text
Run a positioning workshop for our API monitoring tool — we keep getting compared to Datadog and losing.
```

```text
Build a PRD for self-serve workspace provisioning — here are my discovery notes and the OKR it ladders to.
```

```text
Help me decide what to do with [product]. Here's what makes me think it's fading: [signals].
```

```text
I'm 60 days into a Director role and my old peers now report to me — it's awkward and I'm still doing PM work. Coach me.
```

技能路线的顺序逻辑（作者给的，明确说可以故意打破）：想法 → 问题 → 人 → 探针；请求 → 解码 → 铺人 → 决策；市场 → 对手 → SWOT；定位 → 路线图；PRD → epic → story；老化产品 → play → readiness → process。启动时也可以直接问：

```text
Which of these skills fits what's on my desk this week?
```

4. 理解交互技能的行为：Interactive 技能走 Adaptive Decision Ladder——先问 3-5 个与你具体处境相关的问题，再给出编号推荐，每条带一个 use this when 的理由，你选一条，它执行并解释为什么。

5. 往库里加自己的技能时遵守约定：每个技能必须有 `## Input` 段落；不要用 `$ARGUMENTS` 模板，它只在 Claude Code 展开，在其他运行时里会原样显示。校验器会强制这一约定：缺 Input 段落或正文里有裸 `$ARGUMENTS` 的技能会失败。

6. 主动推进类技能：`autonomous-investigation`（v0.83 引入）包含问题预算、搜索计划 gate、每条断言标 Fact / Inference / Assumption、do-not-invent 列表、可稳定 diff 的 schema；监控类技能有 `competitive-intel-watch`、`pestel-delta-monitor`、`pricing-packaging-tracker`、`voice-of-customer-miner`；`company-intel` 的 Executive Signal Refresh 复用模式（Then/Now 差异 + 领导者不再说什么）；情报链 `market-landscape-scan → competitive-research-snapshot → competitive-intel-watch → battle-card-builder` 明确说每个消费前一个的 schema；`eol-checklist` 是 phase-gated、每一项都有 owner。

**预期结果**：你能用真实 PM 任务跑通 1–2 个技能，拿到可粘贴路线的输出，或至少得到编号推荐与理由。**注意**：README 没有给出效果验证的方法或数据；7421 star、两个月内从 v0.80 到 v0.84 的连续发版、每个技能标注的时长区间都是作者主张或间接信号，不是结果证据；材料只有 README 且末尾被截断在 “worth a bookmark if you work”，77 个技能正文的实际质量无从验证。

**做法 C：schematic-figure（科研论文示意图、专利附图）**

前提：Node.js 22 或更高版本 + Chromium 浏览器；Blender 与 RDKit 为可选项；导出 TIFF/EPS/PowerPoint 需要 Python 3 加 Pillow、python-pptx、lxml，并装了 `pdftops` 或 Ghostscript；一个项目文件夹作为工作区。

1. 安装技能到 agent 的 skills 目录（原文命令）：

```bash
git clone https://github.com/lgwrightlab/schematic-figure.git
mkdir -p ~/.claude/skills
cp -r schematic-figure/.claude/skills/* ~/.claude/skills/
```

也可以直接让 agent 自己安装；在 Codex 中需要在提示里写出 `SKILL.md` 的路径。

2. 在一个项目文件夹里启动 agent。agent 在它被启动的目录工作，图会写到 `figure/out/`，格式为 SVG、PDF、PNG，有时会放在以图名命名的子文件夹里。

3. 用提示词模板下需求。原文给出的四个模板可直接复制：

```text
Use the schematic-figure skill to design Fig. 1 for our paper [attach technical description].
```

```text
Use the schematic-figure skill. Follow the colours and line weights of the attached figure from our last paper [attach example figure]. Draw our new device in the same style [attach technical description].
```

```text
Use the schematic-figure skill. Make three different designs of this figure with three parallel agents for our paper [attach technical description] and combine them in a single sheet to show me.
```

```text
Use the schematic-figure skill. Draw a lithium-ion cell while charging, in 3D. Width 89 mm, depth draft.
```

作者经验（属作者主张）：新概念必须给详细技术描述，短请求只对众所周知的概念有效；给一张喜欢的样式图可指定配色、线宽和细节程度；常并行跑三个 agent 拿三种设计，再挑最好的部分合成一张。

4. 用小词控制三个旋钮（技能会自己选并说明选了哪个，也可自行指定）：
   - **Look（风格）**：`flat` 干净的 2D 图；`in 3D` 技能自带的矢量 3D；`render it in Blender` 渲染 3D 物体（需装 Blender）；`photoreal` 用玻璃、金属等摄影材质做 Blender 渲染。
   - **Size（尺寸）**：`Width 89 mm` 期刊单栏，`Width 183 mm` 双栏。
   - **Depth（检查深度）**：`draft` 只跑一遍加自动检查，出稿更快更省；`standard` 会把你描述中的每个计数、方向和连接都核对一遍，并冷读结果；默认 `full` 还会画两个版本、留更好的那个并查错。

5. 改图：在同一个文件夹里让 agent 修改即可；技能同时输出绘制代码，可逐处编辑。

6. 需要其他格式时显式让 agent 导出；前提是 Python 3 加 Pillow、python-pptx、lxml，并装了 `pdftops` 或 Ghostscript。

**预期结果**：`figure/out/` 下出现可编辑的 SVG/PDF（以及 PNG），并且你能在 SVG/PDF 里直接改动任意元素。**注意**：证据只有作者自制的五篇论文对比演示（发表版图 / Opus 5.5 无技能 / Opus 5.5 有技能），属定性证据；没有量化评分、盲评或通过率，也没有定义「更好」的标准；原文明确该技能不替代设计图的人，科学内容与细节仍需人工检查和微调；许可为 MIT，但内置 Latin Modern 字体是 GUST 字体许可，不同于代码的 MIT，商用发布前应确认字体授权随附情况。

**怎么选（独立技能包之间）**：3D/Blender 任务 → 做法 A；产品管理任务 → 做法 B；科研论文示意图或专利附图 → 做法 C；如果 knowledge-work-plugins 已有对应职能（sales、legal、finance、data 等），优先用第 1–4 步的职能插件；如果要在 Codex、Gemini CLI、Copilot、Cursor 等运行时之间复用同一套技能，优先看支持 `.agents/skills` 的包。

### 第 5 步：加一层收口，让 AI 把没收口的事交出来（inbox）

职能层解决知识复用，观测层解决有没有变好，中间夹着一个缺口：AI 在会话中途问你的问题、顺手发现的 bug、失败的测试和构建、当前分支上等你处理的 PR review 评论——这些散在对话里，过一会儿就得你翻回去找。`petekp/inbox` 把它们收进一个和会话并排的面板。

**前提**：已安装并运行 Claude Code（作者在 2.1.292 上构建和测试）；PRs 标签页需要已安装并登录的 `gh`；测试/构建要作为独立命令运行，插件才能知道确切结果。

**安装**（在 Claude Code 会话内）：

```text
/plugin install inbox --marketplace petekp/inbox
```

出现提示时回答 `y` 添加 marketplace，然后选择一个 scope。安装后在该会话即开始工作。

**先看 demo，再回自己的数据**：

```text
/inbox demo
```

再运行一次 `/inbox` 返回自己的数据。

**打开面板**：

```text
/inbox
```

三个标签页：Needs you（Claude 问你的问题、只有你能做的任务、失败的测试或构建）、Findings（Claude 在任务之外注意到的 bug、风险和想法）、PRs（来自本会话和当前分支的 pull request、各自的阻塞项、等你处理的 review 评论）。

面板快捷键：

```text
1 / 2 / 3   切换标签页
j / k       上下移动
动作字母     执行该动作
ctrl+x      在面板与会话之间切换
```

也可以鼠标点击。要回答某个问题，按答案旁的字母，答案会作为你的消息发给 Claude。当前标签页为空、而别处有新项到达时，面板会自动切过去。

**插件还会核对测试/构建状态**：Claude 把每个测试或构建作为独立命令运行，插件据此知道结果；如果 Claude 说某件事通过了，但上次运行失败、或改动后没再跑过，插件会要求 Claude 重跑，或声明该改动未经测试。

**空闲时自动摘要**：会话空闲 15 分钟，或恢复会话时，提示符上方那行会自动展开成一段简短的状态摘要。

**更新插件**：

```text
claude plugin update inbox
```

然后在任何已打开的会话里运行 `/reload-plugins`。

**从克隆的源码开发/调试**：

```sh
claude --plugin-dir /path/to/inbox
```

改动文件后会话会自动重载该 mod。跑检查脚本：

```sh
./scripts/check.sh
```

该脚本依次运行 Prettier、`claude plugin validate`、类型检查和测试。类型检查依赖 Claude Code 第一次加载 mod 时写入 `.claude-plugin/types/` 的类型文件。

**成本预期**（原文口径）：每次 Claude 回复后触发一次轻量（Sonnet）调用，3–4k 输入（其中约 2k 命中缓存）、100–250 输出，约 0.5¢/回复；空闲 5 分钟后约 1¢；插件自身的指令与工具约 1,350 token（缓存），每次请求不到 0.1¢。作者称一次较长的 Opus 会话中这部分约占总成本 1%，会话越短或越便宜占比越高；在 Claude 套餐下计入用量限额。

**预期结果**：`/inbox` 能打开面板，Needs you 里出现你本来会漏掉的待办或失败测试，Findings 里出现任务之外的问题记录。

**怎么选**：收口层是别漏事，观测层是看数字，交接层是别掉线。经常被 AI 反问、经常要自己回头翻测试结果 → 先装这一层；主要想知道改造后有没有变快变准 → 第 6 步的观测 mod；任务是长跑、要跨上下文窗口 → 第 7 步。

### 第 6 步：加一层观测 mod（广），把「有没有变好」变成数字（做法 A / 做法 B / 做法 C）

**前提**：Claude Code 2.1.287+（作者在 2.1.288 上测试过）；在一个非敏感、小体量的现有项目里做；在 CLI 或 Claude Desktop 的 Code tab 中使用（VS Code 聊天面板和 `claude -p` 不显示面板）。README 明确说明：这些是可执行的 mod，不是提示词或 skill 清单。

**做法 A：从 marketplace 装（长期用，推荐先装 1–2 个 Session 观测类）**

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install context-meter@awesome-claude-code-mods
claude plugin install tool-timing@awesome-claude-code-mods
```

会话已经开着的话，先重载插件再打开面板：

```text
/reload-plugins
/context-meter
```

把 `context-meter` 换成任意 mod 名（如 `error-inbox`）即可；可以独立安装多个，命令里用各自 mod 名。README 给的「不到一分钟起步」示例用的是 `task-board`：

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install task-board@awesome-claude-code-mods
```

```text
/reload-plugins
/task-board
```

**做法 B：不注册 marketplace，直接从源码试单个 mod**

```sh
git clone https://github.com/whyashthakker/awesome-claude-code-mods.git
cd awesome-claude-code-mods
claude --plugin-dir ./mods/context-meter
```

然后运行 `/context-meter`。把 `context-meter` 换成目录里的任意 mod 名。

**做法 C：Claude Desktop 看图**

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install desktop-usage-strip@awesome-claude-code-mods
```

在 Claude Desktop 里打开本地 Code 会话，必要时 `/reload-plugins`，再 `/desktop-usage-strip`。若 marketplace 已注册，先更新：

```text
claude plugin marketplace update awesome-claude-code-mods
```

该 strip 显示配额/重置、上下文、观测到的 token 总量和上报的会话 USD，带隐藏/显示控件；缺失的数字会标注；成本不等于订阅账单。

**怎么选**：只想验证效果、不想污染环境 → 做法 B；已经决定要长期用 → 做法 A；用 Claude Desktop 想看图表 → 做法 C。只装 1–2 个观测类 mod，建议 `context-meter` 配 `tool-timing` 或 `error-inbox`。

**选型参考**：仓库 README 把 mod 分成 7 类——Session（8 个：Context Meter、Quota Watch、Cache Inspector、Tool Timing、Error Inbox、Edit Heatmap、Turn Timeline、Agent Board）、Git（8 个：分支/上游/脏文件、暂存 diff 审阅、最近 20 条提交、stash、worktree、冲突标记计数、blame 前 80 行、ignore 规则解释）、Repository（10 个：文件树、npm scripts、依赖表、TODO/FIXME/HACK 查找、Markdown 标题大纲、JSON 键摘要、CSV 预览、小日志尾 60 行、env 示例变量、两文件逐行对比）、Workspace（8 个：Scratchpad、Task Board、Decision Log、Snippet Shelf、Link Shelf、Prompt Shelf、Release Checklist、Handoff Notes）、Utilities（10 个：正则测试、JSON 格式化、URL 拆解、Base64、时间戳转换、哈希、颜色对比度、UUID、文本计数、ASCII 动画）、Workflow（6 个：25 分钟专注倒计时、秒表、测试/构建命令台账、最近 40 条 Bash 命令历史、越出指定路径前缀时告警的 Scope Watch、可开关的只读模式守卫）、Desktop（20 个：把观测项做成图表/面板，如 Desktop Usage Strip、Desktop Context Map、Desktop Cost Watch、Desktop Review Desk、Desktop Prompt Builder、Desktop Session Brief、Desktop Checklist Desk 等）。

**额外：社区 mod 要各自单独装（可选）**。从各作者的 marketplace 安装，例如 README 给出的示例：

```text
/plugin marketplace add jarrodwatts/claude-image-view
/plugin install image-view
```

注意：README 对社区 14 个条目只做了文档审查（2026-10-03 对照作者文档核查），作者没有安装、没有运行、没有做安全审计。部分社区 mod 需要特定终端（kitty 图形协议、Unicode placeholders 等）、macOS/Linux、`gh` 认证、浏览器二进制，甚至特定硬件。

**预期结果**：会话里能打开对应面板并看到数字。README 声明：截图是 Claude Code 测试套件用 fixture 数据捕获的 mod 渲染树，在浏览器预览里绘制，不是 Claude Code 原生 app 截图，所以面板长什么样以你本地实际为准。

### 第 6 步之二：加一层观测 mod（深）——时间去向、上下文浪费、编辑时间线（做法 A / 做法 B）

第二个集合 `YeonwooSung/my-claude-code-mods`（486 stars，6 个 mod）解决的问题不一样：不是「给我一块面板看数字」，而是「把一次会话拆开复盘」。它建立在官方 Mods 机制之上，是第三方扩展而不是替代方案。

**每个 mod 干什么（原文都只有一句话概括，没有实测数据）**：

| mod | 看什么 |
| --- | --- |
| `agent-profiler` | 一次会话的时间去向（模型等待、工具调用、子代理、重复读取），可导出 OTLP trace 给 Jaeger/Tempo |
| `context-inspector` | 上下文浪费：窗口被什么占满、重复读取、近乎重复的输出、compaction 保留了哪些内容，并给出建议 |
| `time-machine` | 用 shadow-git 快照在分叉时间线上记录每一次工具调用；回看任意步骤时文件的原貌、定位哪次编辑弄坏了测试、恢复、分支、比较不同运行、重跑某一步 |
| `loop-detective` | 重复的 Bash 失败和 edit/retry 循环，附证据、调查提示词、实时案例面板和有界历史 |
| `pin-memo` | 把备忘和可点击的 todo 固定在输入框上方，同文件夹/会话恢复时自动还原 |
| `model-effort-band` | 提示框上方用彩色条显示当前选中的模型和观察到的主线程 effort |

**做法 A：使用者路径——先装一个 mod（建议先做这一步）**

1. 按上面的表挑一个与你当下最痛的场景直接对应的 mod，只装一个，不要一次装全部。
2. 把本仓库的 marketplace 添加一次。原文只给了机制描述（Add this marketplace once），没有给出具体命令行；具体命令以官方 Mods 文档为准：

```text
https://code.claude.com/docs/en/plugins/mods/overview
https://code.claude.com/docs/en/plugins/mods/create
```

3. 按目标 mod 自己的 README 安装该 mod。原文对 6 个 mod 各自都指向 `agent-profiler/README.md`、`context-inspector/README.md`、`time-machine/README.md`、`loop-detective/README.md`、`pin-memo/README.md`、`model-effort-band/README.md`；安装机制按官方文档使用 `plugin@marketplace`，具体安装命令和配置项要进各自 README 读，本手册不替它编。
4. 在一个真实任务上连续用一段时间（原文没有给建议时长，此处不编造）。期间用 `--plugin-dir` 显式控制加载、禁用其他插件，保持引擎/模型/权限设置固定。

**怎么选哪个 mod**：反复出现同类失败 → `loop-detective`；上下文经常被塞满、重复读取多 → `context-inspector`；想知道时间到底花在哪 → `agent-profiler`；要定位「哪次编辑弄坏了测试」并能回退/分支/比较 → `time-machine`；只想让备忘和 todo 跨会话不丢 → `pin-memo`。

**做法 B：开发者路径——本地跑测试、量开销**

**前提**：Node 22.19.0 或更高；依赖已用 `package-lock.json` 锁定。核心测试不需要安装 Claude Code、也不需要账号。

```sh
npm ci --ignore-scripts
npm test                  # core logic, no Claude Code installation/account required
CLAUDE_BIN=/path/to/claude npm run test:adapters  # full engine suites, including adapters
npm run typecheck         # requires engine-generated declarations in each .claude-plugin/types
```

**边界（原文明示，别越界解读）**：`npm test` 把核心测试里的 `claude-code/testing` import 映射到 Node 的 test runner 和 Jest 的 `expect`，它不模拟引擎事件；测试文件串行执行，以免已有的性能断言与其他测试进程争抢资源；CI 只跑这套独立核心测试。engine 的 type declarations 是本地生成、不入版本库的，要用与被测引擎对应的那份声明。

**量 mod 自身开销：四配置对照实验（原文方法，可照抄）**

1. 用一个一次性的大型代表性仓库、固定在一个 commit，并保持相同的 Claude 引擎/模型/权限设置。
2. 在四种配置下跑同一份工作负载：无 mod、仅 profiler、仅 Time Machine、以及三个 mod 全上。
3. 用 `--plugin-dir` 显式加载这些 mod，同时禁用其他已安装插件。
4. 在计时区间之外重置文件和 recorder 存储。
5. 每种配置做 warm-up，并至少做 5 次测量；交替运行顺序。
6. 记录：wall time、tool-call 数量、model tokens、snapshot 平均值；工作负载要包含「无改动的 mutating 调用」和「真实编辑」。
7. 报告 median/p95，并把模型延迟与 snapshot/hook 时间分开报告。

**预期结果**：选定的 mod 能在会话里产出它自己那类输出（时间去向分布 / 窗口占用构成与重复读取 / 重复失败与循环的证据 / 可回溯的编辑时间线）。多 mod 同时运行的合并开销，原文没有给结果，别拿单元测试通过当作性能可接受的证据。

**怎么选（两个观测集合之间）**：要广度（Session / Git / Repository / Workspace / Utilities / Workflow / Desktop 七类，含 Desktop 图表）→ 第 6 步的 `whyashthakker/awesome-claude-code-mods`；要深度（时间去向剖析、上下文浪费剖析、shadow-git 时间线回溯、循环检测、跨会话备忘）→ 第 6 步之二的 `YeonwooSung/my-claude-code-mods`。两边的「上下文类」「失败类」mod 功能有重叠，而原文明确多 mod 同时运行需要另做一次交互式集成运行、单元套件不能证明 UI 兼容性，所以先只在一边装一个 mod，不要两边同类一起上。

### 第 7 步：长任务跨上下文时，加一层交接控制台（Project Sentinel，做法 A / 做法 B / 做法 C / 做法 D）

**前提**：Claude Code 2.1.289 或更新、且带 function-hooks 插件 API；在一个非敏感的现有项目里试。

**做法 A：装到终端（决定长期用）**

```bash
claude plugin marketplace add Arjun0014/project-sentinel
```

```bash
claude plugin install project-sentinel@control-room
```

注意：marketplace 名仍是 `control-room`，里面的插件才是 `project-sentinel`。也可以在会话内一步完成（Claude Code 2.1.275 或更新）：

```text
/plugin install project-sentinel --marketplace Arjun0014/project-sentinel
```

**做法 B：从本地 clone 装（要改插件本身时）**

```bash
claude plugin marketplace add /path/to/project-sentinel
```

终端会直接从该文件夹读已安装的 folder marketplace，所以拉取改动后在会话里运行 `/reload-plugins` 即可。注意 Desktop 的 Code tab 可能加载安装时 Claude Code 复制的那一份，因此新版本后要 `claude plugin update project-sentinel@control-room`，再开新会话。

**做法 C：不安装地试一个会话（建议先做这一步）**

```bash
claude --plugin-dir /path/to/project-sentinel/plugins/project-sentinel
```

不安装任何东西，插件只对该会话生效，改动可热加载。这是本次调研结论建议的最小试用方式。

**做法 D：在 Claude Desktop（Code tab）加载工作副本**

把文件夹名写进 `~/.claude/settings.json` 的 `env` 块：

```json
{
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/project-sentinel/plugins/project-sentinel" }
}
```

多个文件夹用平台的路径列表分隔符（Windows 用 `;`，其他平台用 `:`）。

**怎么选**：只想验证它到底有没有减少上下文溢出和人工盯守 → 做法 C；已经决定长期用 → 做法 A；要改插件本身 → 做法 B；在 Claude Desktop 里用 → 做法 D。

**从旧版 Control Room 迁移**（1.4.0 之前装成 `control-room@control-room`）：

```bash
claude plugin marketplace update control-room
```

marketplace 会把旧名映射到新名，更新会连带移动你的安装（含 `enabledPlugins` 项）；下次会话加载 Project Sentinel 时，它会一次性读取旧 store（多个时取最后写入的那个），把设置、运行、Quest log 和学到的提示缓存信息复制过去，旧文件保持原样。更新期间开着的会话继续用 Control Room，Project Sentinel 在旁边待命，两者不会同时动作。

**更新**：`claude plugin update project-sentinel@control-room`；或打开 `/plugin` 里的 Marketplaces，选中 `control-room`，选 Enable auto-update（对自行添加的 marketplace 默认关闭）。

**卸载**：

```bash
claude plugin uninstall project-sentinel@control-room
```

**预期结果**：命令执行成功后，该会话（或 Desktop 的本地 Code 会话）里能打开 `/cr` 面板。

### 第 8 步：打开 Control Room，先开 Autopilot

打开面板：

```text
/cr
```

六节：Overview / Context / Behavior / Guardrails / Activity / Setup。README 中出现的其它命令：

```text
/cr status
/cr cache
/cr decisions
/cr decide D-2
/cr diagnostics
```

终端里所有控件都能点击或用 Tab+Enter 操作，且没有会卡住的弹窗。

**开 Autopilot（默认 Off）**：在 Context 里设一个阈值（窗口的百分比，或 token 数；README 截图里出现过 70% 与 80% 的 handoff 刻度，那只是截图示例，不是推荐值）。到阈值时 Claude 先做完当前步骤，然后执行交接：记录 run 的里程碑、更新项目文档、CLAUDE.md 只留持久指令、跑一次最小验证、用自己的话写 `NEXT_SESSION_PROMPT.md`；Project Sentinel 接着运行 `/clear`，用 run 的里程碑和目标播种新上下文，Claude 自行继续。

三条要记住的边界：每一步都在下一轮开始或结束时推进，绝不按定时器走；交接轮结束时若它启动的后台工作（渲染、测试）还在跑，会等 Claude Code 报告的结果，把结果写进 notes，再清空并自行继续；靠近阈值启动的新上下文会先获得工作空间，之后才允许再次交接。压缩（compaction）是选项，或清空被拒时的兜底（Desktop 和其它 SDK 会话里以 `/compact` 执行）。交接中途重载插件会继续这次交接，不会起第二次。

**预期结果**：状态栏 HUD 能替你说清 run 现在在「工作 / 思考 / 跑检查 / 等你 / 等一个会自己来的结果 / 受阻 / 交接中 / 完成」中的哪个状态；交接后 Handoff Health 能告诉你交接留下了什么、新上下文接住了什么。

### 第 9 步：把等待、「以后再做」和需要拍板的事交出去

**Watchers：把 run 停到某个时间再唤醒**

```text
/cr watch in 2h S-002 result
```

也支持 `at 14:00`、`tomorrow at 9am`；含糊的 `at 2:30` 会被询问而不是猜。三种策略：Keep warm 用 Keep warm 保住对话缓存到唤醒点；Fresh 不花缓存钱，从交接 notes 在新上下文里唤醒；Smart 自己选并说明理由。若 run 在装了 watcher 之后已经移动过，watcher 不会清空它，而是提示 Watcher due 并给出 Check now / Reschedule / Dismiss。Fresh 唤醒需要健康的 resume 状态；Watchers 只在 Claude Code 运行时工作（不安装守护进程），关闭期间到点的 watcher 会在会话重开后等你。

**Mission Queue：投递「以后再做」的工作**

Activity → Operations 的 Add work for later（并指定何时投递），或：

```text
/cr queue <text>
```

每项只在边界投递：下一个安全边界（当前里程碑完成或本轮结束）、本轮之后、当前里程碑之后，或下一个新上下文。绝不插进某一轮的推理中间：轮中到点的项随下一批工具结果走，否则在本轮结束时作为独立提示。可编辑、重排、立刻投递、删除；跨 `/clear`、交接、重载和恢复会话与 run 一起保留，只投递一次。

**Decision Inbox：让需要你拍板的选择不阻塞工作**

插件给 Claude 一个 `decision_request` 工具（选择方案、是否删除生成文件、CI 过了是否发布）。它停在 Activity → Operations → Needs review，带选项和一个写自己话的输入框：

```text
/cr decisions
/cr decide D-2
```

`/cr decide` 用 Claude Code 自己的对话框提问。答复随 Claude 下一批工具结果送达；若 run 正等它，就作为独立提示；否则随你下一条消息。Claude Code 自己的权限提示和确认永远不会被这里延后。

**和 inbox 收口层怎么选**：两者都在收「本来要你自己翻回去捞的事」，但机制不同——inbox 是一个与会话并排的面板，每次 Claude 回复后触发一次轻量调用，并且会核对测试是不是真跑过、改动后有没有再跑；Decision Inbox 是插件给的 `decision_request` 工具，选项停在面板里、答复随工具结果回到 Claude，另外还带 Mission Queue 的边界投递和 Watchers 的定时唤醒。如果你最痛的是「Claude 谎报测试通过」，先上 inbox；如果最痛的是长跑任务里你被反复叫去拍板、或者要等到某个时间点才继续，先用交接层。材料未说明两者同时装会不会互相干扰，先只用一个。

**预期结果**：watcher 到点后 run 按你选的策略继续；Mission Queue 里的项在边界投递且只投一次；Needs review 里的选择你能在工作间隙答掉，run 不因此停住。

### 第 10 步：按需开关护栏、选 profile

以下默认值来自 README，都是按需项，建议一次只开一个并观察一段时间。

- **Run Budget（默认 Off）**：设成本、墙钟时间和交接次数上限，80% 时提示一次；到上限时可选只通知 / 自行开工前先问 / 让 Claude 做完当前里程碑再暂停。它不会中断正在进行的工具调用或轮次。命令示例：

```text
/cr budget $30
```

- **Machine load（默认 Off）**：给 CPU 和内存的建议上限（Low / Medium / High / Custom）。它不是 OS 配额，只能停 Claude 自己启动的后台任务。
- **Cache Guardian（默认 On）**：会在会重发 100k+ 热 token 的模型切换前先确认；热缓存（20k token 起）时模型路由不再降级对话；缓存热时设置变更以 notes 形式送达，而不是重写被缓存的系统提示。Keep warm（默认 Off）在你离开时于缓存过期前不久重发一次最后请求（transcript 看不到），上限由你设的闲置时长决定——这是明确的成本项，开之前先评估。
- **Cold Resume Guard（默认 On）**：向大上下文（默认 100k token）发送消息且缓存确定已失效时，Claude Code 自己的对话框先问：Continue full session / Start fresh from resume state / Compact first / Cancel。
- **权限策略**：按类别给 Default / Ask / Deny（包安装、网络、下载、项目内编辑、项目外编辑、删文件、commit、push、force push 与 reset、部署发布、危险命令）。Ask 即使在不会问的权限模式下也先问你；插件从不代你回答权限提示、从不放宽 deny、plan mode 或组织设置。
- **选 profile 而不是逐项配**：Normal、Frontier Max、Low Resource、Release / QA 和自定义；Setup 页显示相对所选 profile 究竟改了什么。Frontier Max 下模型路由不降级对话，模型 id 不硬编码。
- **Answer styles**：Standard / Brief / Plain technical（按 ASD-STE100 的简化技术英语规则）/ Mission control（GO、NO-GO、HOLD；GO 只给已验证的）/ Quest log。只影响对你说的话，不影响代码、文件或提交信息；你自己选的 Claude Code output style 优先级更高。

**预期结果**：Setup 页能说清你相对所选 profile 改了什么；护栏在你设定的边界上提醒你，而不是突然掐断正在跑的工作。

### 第 11 步：贡献回仓库（可选）

职能层原文说插件就是 markdown 文件，fork 后改，提 PR。交接层是 MIT、无构建步骤的 TypeScript，Claude Code 直接加载，所以按做法 B 在本地 clone 里改、用 `/reload-plugins` 热加载即可。Blender 技能包是 MIT，可 fork 后运行 `validate_skills.py` 和 `run_tests.py` 验证；PM 技能包是 CC BY-NC-SA 4.0，fork 和再分发要遵守该许可，且添加技能时要遵守 `## Input` 和 `$ARGUMENTS` 约定；示意图技能是 MIT（内置 Latin Modern 字体为 GUST 字体许可），仓库内部的 `patent-drawing` 复用 `schematic-figure` 引擎，是「一个引擎、多个技能」的复用样板。官方市场层如果是自己打包插件，按第 0 步做法 B 的目录结构与发布约束组织；第三方想收录，走原文给出的 plugin directory submission form，外部插件需通过质量与安全标准审核（标准内容、审核流程或通过率原文未给出）。

## 怎么判断变好了

先分清来源：职能插件原文没有给出任何验证方法或指标，只有 better and more consistent outcomes、spend less time enforcing processes 这类主张，属作者主张、无数据支撑；收口层原文只给了成本口径，同样没有效果数据；交接层原文只有机制描述，同样没有「减少了多少上下文溢出和人工盯守」的数据；观测层（深）的原文明确声明没有给出四配置的性能结果，6 个 mod 的功能描述都只是一句话；Blender、PM、示意图三个技能包的材料也都只到 README，没有效果验证数据。下面按层列出可用的最小试用与指标。

**官方插件市场的最小试用（约 1–2 小时 + 一周观察）**
1. 在 Claude Code 里执行 `/plugin > Discover`，从 marketplace 里挑 1 个和当前日常工作最贴合的插件。
2. 安装前检查它的主页和来源，确认你信任它包含的 MCP server 和文件访问。
3. 用 `/plugin install {plugin-name}@claude-plugins-official` 安装，先只在低风险任务上跑。
4. 记录一周内该任务的使用情况。

**判断有没有改善的指标（官方市场）**：同一任务完成时间、来回轮次是否下降；原本需要手工在工具之间切换的步骤是否被插件替代；插件调用失败/报错的比例，以及是否出现需要额外人工复核的意外行为；是否出现了「以前根本不会交给 AI、现在会交」的新任务——这是能力发现层面最直接的改善信号。若一周内没有任何一项变好，就卸载，并把结论记为「该插件无实质增益」而非「插件机制无效」。**风险控制**：插件可访问文件与外部服务，务必从单机、非敏感任务开始，不要一上手就接入生产凭据。

**可观察的指标（职能插件层，装插件前后各记一次）**：同一任务的完成时间；返工次数（你需要手动修正、重写输出的次数是否下降）；补齐上下文的次数（是否还需要反复解释同样背景）；命令是否真的可用——`/xxx:yyy` 在会话中是否出现并成功执行，这是最硬的通过/不通过信号。

**可观察的指标（收口层，原文没有提供，需自测）**：每个会话里被你漏掉、事后才发现的待办/问题数量是否下降；你手动追问 Claude「刚才那个测试过了吗」的次数是否下降；会话中途切换窗口/翻记录的次数是否下降；成本侧对照 API 账单或用量限额，看每会话新增开销占比是否可接受（作者示例：长会话约占总成本 1%，会话越短或越便宜占比越高）。若几轮下来「漏掉的待办数」和「手动追问测试是否通过的次数」都没有改善，说明价值抵不过每轮一次的额外调用，直接卸载回原生 Claude Code。

**可采集的指标（观测层「广」）**：工具失败/被拒调用次数（Error Inbox / Tool Timing）；单次工具延迟（Tool Timing）；上下文占用与剩余 token（Context Meter）；每轮时长/token/中断（Turn Timeline）；cache 读/写/未缓存输入（Cache Inspector）。

**可采集的指标（观测层「深」）**：`agent-profiler` 会话时间去向分布（模型等待 vs 工具 vs 子代理 vs 重复读取）；`context-inspector` 窗口占用构成、重复读取次数、近重复输出、compaction 保留了什么；`loop-detective` 重复 Bash 失败与 edit/retry 循环的次数及证据；`time-machine` 任意步骤的文件原貌、哪次编辑弄坏了测试、snapshot 平均值；对照实验指标（原文明确可测）：wall time、tool-call 数量、model tokens、snapshot 平均值；按 median/p95 报告，模型延迟与 snapshot/hook 时间分开。反面判据（原文自认）：20k span/item 的测试只界定分析成本上限，不测量引擎综合开销；没有给出四配置的性能结果。不要拿单元测试通过当作性能可接受的证据；多 mod 同时运行还要另做一次交互式集成运行。

**可观察的指标（交接层，原文没有提供，需自测）**：Handoff Health（交接留下了什么、新上下文接住了什么）；跨交接的里程碑连续性（Autopilot 交接后，新上下文是否从 run 的里程碑和目标继续，而不是重来一遍）；上下文溢出、被迫压缩的次数，以及你手动 `/clear`、`/compact` 的次数是否下降；你守着 run 的时间是否下降；Activity 里「需要看的」东西是否比试用前更早被你看到；Watchers 是否真的按时间唤醒 run；Mission Queue 的项是否都在边界投递、只投递一次、没有插进某一轮推理中间；Decision Inbox 是否让需要拍板的选择不再阻塞 run，同时你没有漏掉 Claude Code 自己的权限提示。若几次交接后里程碑仍连续、Handoff Health 没有明显空洞，且你手动清理上下文和守时的次数下降，才算有价值；否则不装——尤其因为它建立在仍处 early access 的插件 API 上，不要先定为团队标准。

**可观察的指标（独立 Agent Skills 实例）**：

- Blender：隔离环境装 Blender 5.2+；按 README 的 Claude Code 插件方式或通用安装脚本安装；选一个具体任务，例如 “Make a game-ready crate for Unreal with baked normals and LODs.”；同时手工记录不用技能包时完成同类任务的步骤数和耗时；导出资产并导入目标引擎（Unreal / Unity / Roblox）做一次实际检查。指标：任务完成时间（技能包 vs 手工/普通代理）；人工干预次数；导出资产能否通过目标引擎导入检查；`blender-asset-qa` 是否报出 z-fighting、浮空部件、坏法线或权重问题；`validate_skills.py` 和 `run_tests.py` 是否通过。验证命令：`python tools/validate_skills.py` 和 `python tools/run_tests.py`。若失败，记录错误并检查 `BLENDER_EXE` 设置；若通过，再用一个真实项目资产做端到端导出。
- PM：按 README 的安装命令装入 1–2 个技能，用你自己手上的真实 PM 任务跑一遍并与裸提示做对照。可观察：完成时间、返工次数、是否减少重复解释上下文、输出是否可被工程/干系人直接使用、你是否真的会重复用它。注意：README 没有给出效果验证的方法或数据；7421 star、发版记录、技能标注时长都是作者主张或间接信号，不是结果证据。
- 科研示意图：最小试用方式——挑一篇自己正在写的论文或报告，选其中 1 张示意图；装好技能（Node.js 22+、Chromium），新建一个项目文件夹并在其中启动 agent；用标准模板给出详细技术描述并附一张同风格样例图，指定 `Width 89 mm` 与 `depth standard`；再用提示模板开三个并行 agent 出三版设计，人工挑取合并；最后检查输出的 SVG/PDF 是否可编辑，并让 agent 导出自己实际投稿需要的格式。指标：从提出需求到拿到可用初稿的时间（与上次手工画同类图对比）；需要人工调整的轮次或元素数量；能否在 SVG/PDF 中直接改动任意元素；按 `standard` 口径人工复核每个计数、方向与连接，看漏检比例；字体与素材授权（Latin Modern 的 GUST 许可）是否满足投稿要求。判据：若初稿耗时明显下降且人工复核未发现科学错误，则保留为常用做法；若复核频繁出错、或最终仍需从头重画，则降级为仅研读其「给 agent 封装可复用能力 + 用 depth 控制检查强度 + 并行多设计」的思路。

**最小试用方式（半天内可完成）**：
1. 选一个和你当前工作最贴近的职能插件，按第 2 步装上。
2. 只做两件事：跑一个对应斜杠命令（如 `/data:write-query`），以及观察一次技能是否在相关提问时自动触发。
3. 打开该插件的 `skills/` 目录读一遍，挑其中一条指令，改成你团队的真实流程，再跑一次同样的任务。
4. 如果你常漏事：按第 5 步装上 inbox，先 `/inbox demo` 看面板行为，再在一个有测试/构建、且需要你中途做决定的任务里跑一次，看 Needs you / Findings 有没有抓到你本来会漏的东西。
5. 如果你想先弄清「时间花在哪」「上下文被什么占满」，按第 6 步之二做法 A 只装一个深度观测 mod（反复同类失败选 `loop-detective`，上下文被塞满选 `context-inspector`），在单个真实任务上用，不要一次装全部。
6. 如果你的任务跑得比一个上下文窗口更久：按第 7 步做法 C，用 `claude --plugin-dir` 不安装地跑一个长任务会话，打开 `/cr`、设 Autopilot 阈值，看一次交接前后的 Handoff Health 与里程碑连续性。
7. 如果你的职能是 Blender、PM 或科研示意图：按第 4 步之二只装 1–2 个技能，用一个真实任务和裸提示对照，记录完成时间、人工干预、导出检查或 QA 报错；示意图按上面的最小试用方式走一遍。

**对照试用（建议一两周）**：先用一周不开观测 mod 正常干活，记下同类任务上的工具失败次数、平均延迟、上下文溢出/压缩次数；再开一周用面板（第 6 步做法 A 或 C），比较同一类任务上的同一批数字。收口层可以在同一周里对比：开着 inbox 的一周，漏掉的待办数和手动追问测试是否通过的次数是否比之前少。交接层在同一周里做同类长任务，比较交接前后的 Handoff Health、跨交接里程碑连续性，以及你手动守时/手动清理上下文的次数。若你想量「观测 mod 本身要不要花代价」，按第 6 步之二做法 B 的四配置对照实验跑一遍。

**判断**：若职能插件层指标没有可感知改善，说明开箱插件对你不合适，价值在定制，应把精力放到第 4 步而不是继续试更多插件。若观测数据里工具失败次数、平均延迟、中断次数、上下文重述次数在同类任务上下降，或单位任务的 token 更可预测，才算真的变好；用深度观测时，如果 `context-inspector` 报的重复读取与窗口占用构成没有改善、`loop-detective` 报的重复失败仍在同类任务上反复出现，说明你装的那个 mod 没带来实际收益，换一个或卸掉。

## 常见坑

- 官方市场原文没有收录任何具体插件：只有 README，没有插件名称、功能或评价，无法据此判断插件生态的实际价值密度。
- 官方市场没有效果数据：全篇没有使用者案例、前后对比数据或效果指标。
- Anthropic 不控制也不验证插件内容：原文明确表示不控制插件里包含哪些 MCP server、文件或其他软件，也无法验证它们会按预期工作或不会变化；安装前必须自己检查插件主页和来源。
- marketplace 条目的 `name` 是不可变 slug：一旦发布就不能变；改名会让用户安装报 `plugin-not-found`；要改显示名改 `displayName`，必须改名时用 `renames` 映射。
- `strict: false` 声明 skill 包时路径相对于 `source.path`：每个路径指向包含 `SKILL.md` 的目录，注册为 `<plugin-name>:<skill-name>`；schema 细节看官方 marketplace 文档。
- 外部插件审核标准未给出：原文说需通过质量与安全标准审核，但没有标准内容、审核流程或通过率。
- 仓库热度不是效果：39,182 stars、当日 +307 只反映关注度；Blender 的 42 stars、PM 的 7421 stars、schematic-figure 的 31 stars 同样只反映关注度。
- 材料可能被截断：抓取内容只有 README，没有插件列表本身；PM 仓库 README 末尾被截断在 “worth a bookmark if you work”；交接层材料在 Lazy-exit guard（默认 Off）处被截断，未给出的行为不要照抄。
- 职能插件原文只有 README：不含任何单个插件的 skill 正文、提示词、命令清单，无法据此判断实际质量，也无法照抄具体提示词。要照做必须自己打开仓库对应目录去读。
- 三个独立 Agent Skills 实例也都只到 README：Blender 未展示技能内部的提示词、脚本、配置文件或 QA 规则；PM 的 77 个技能正文质量无从验证；示意图只有 README 和作者自制演示。
- 开箱效果有限：原文自称 these plugins are generic starting points，价值取决于你是否投入定制。
- 没有官方效果数据：职能插件原文只有「更好、更一致」等主张；收口层只有成本表；交接层只有机制描述；观测层（深）没有四配置性能结果；Blender、PM、示意图都没有效果验证数据。
- 命令不出现 = 未生效：先回到第 2 步检查 marketplace，不要继续往下做。
- 可用性与许可未说明：Cowork 的开放范围、价格、区域限制原文未说明；各仓库许可协议都要自行确认后再用于生产。Blender 是 MIT；PM 是 CC BY-NC-SA 4.0；schematic-figure 代码是 MIT，内置 Latin Modern 字体是 GUST 字体许可。
- 不要一次装多个职能插件或技能：先挑一个跑通、改一条，再考虑扩展。Blender/PM/示意图也建议只装 1–2 个技能。
- 观测面板有硬边界：必须在 CLI 或 Claude Desktop 的 Code tab 里用；VS Code 聊天面板和 `claude -p` 会执行 hooks 但不显示面板；版本要在 2.1.287+，作者只在 2.1.288 上测试过。
- 装 mod = 在会话里跑第三方代码：mods 仓库的社区部分作者自己声明未安装、未运行、未做安全审计；要装只从各作者自己的 marketplace 装，别把整个社区列表照单全收。inbox 是单作者仓库（33 stars），无第三方评测、无用户案例；Project Sentinel 也是单作者插件，建立在仍处 early access 的 function-hooks 插件 API 上；YeonwooSung/my-claude-code-mods 也是第三方扩展，按未审计的第三方代码对待。
- 观测层（深）的 README 只有概览：每个 mod 的具体安装命令与配置项要进各自 README；原文对 marketplace 只给了「Add this marketplace once」的机制描述，没有给出命令行——不要照抄一份「看起来像」的命令。
- 观测层（深）没有合并开销数据：原文明确 no four-mode performance result is claimed here；20k span/item 的测试只界定分析成本上限。单元测试通过 ≠ UI 兼容 ≠ 性能可接受；多 mod 同时运行要另做一次交互式集成运行，Model Effort Band 的 live pixels 未验证。
- 观测层（深）对引擎版本敏感：2.1.280 早期访问版下 profiler 可用，但 Context Inspector 缺少 `session.append`、Time Machine 的 per-test 选项会被忽略；原始三套 engine 测试套件 / Pin Memo / Model Effort Band 是在 2.1.292 验证的，Loop Detective 是在 2.1.280 验证的。别把不同版本下的行为混着比较。
- 收口层每轮都要花钱：每次 Claude 回复后触发一次轻量调用，短会话的额外开销占比会明显更高；没减少遗漏就卸载。
- 各层版本口径错开：观测层（广）2.1.287+、收口层在 2.1.292 上构建、交接层 ≥2.1.289 且要带 function-hooks API。同时用多层前先 `claude --version` 核对；升级 Claude Code 后先跑 `/reload-plugins`。
- 交接层的验证范围很窄：只在 Windows 11 和 Claude Code 2.1.289 / 2.1.293 / 2.1.295 上验证过，远程（云）会话尚未测试；它建立在 early access 的插件 API 上，不宜直接定为团队标准。
- 重命名迁移有副作用：从 1.4.0 之前的 Control Room 升上来，`Allow` 权限状态被移除（已保存的 Allow 读作 Default），点 Kit 不再打开面板。
- Autopilot 不是定时器：每一步都在下一轮开始或结束时推进；交接轮结束时若后台工作还在跑，会等 Claude Code 报告的结果再清空并继续。
- Watchers 只在 Claude Code 运行时工作：不安装守护进程，关闭期间到点的 watcher 会在会话重开后等你。
- Keep warm 是成本项：会在你离开时于缓存过期前不久重发一次最后请求（transcript 看不到），上限由你设的闲置时长决定；不在意成本不要随手开。
- Run Budget 和 Machine load 都不能掐断进行中的工作：它们不会中断正在进行的工具调用或轮次；Machine load 也不是 OS 配额。
- Decision Inbox 只管插件自己的决定请求：Claude Code 自己的权限提示和确认永远不会被延后，插件也不代你回答权限提示、不放宽 deny、plan mode 或组织设置。
- 两个收口机制可能重叠：inbox 的 Needs you 与交接层的 Decision Inbox 都在收「需要你的事」，材料未说明两者同时装会不会互相干扰，先只用一个。
- 两个观测集合不要同类一起上：`context-meter` 与 `context-inspector`、`error-inbox` 与 `loop-detective` 都在看相近的东西；先只在一边装一个。
- 数字口径要看清：观测 mod 的截图不是原生 app 截图，而是测试套件用 fixture 数据捕获的渲染树；缺失值会被标注而非补全；Desktop Usage Strip 的 USD 不是订阅账单；部分 mod 的 forecast 和 token 计算是估算。Autopilot 阈值截图里的 70% / 80% 只是截图示例，不是推荐值。
- 别把观测当目标：观测面板不改变 Claude Code 的基本用法，它只是在既有的插件层之上叠加一层「给你对比用的底座」。
- Blender 技能包的环境和验证边界：需要 Blender 5.2 LTS+；MCP server 可用性需自行确认；43 个 headless Blender 测试是否全部通过、是否真在 Blender 5.2+ 实测无法从材料验证；作者声称每个脚本在真实 Blender 测试过，但这只是作者主张。
- PM 技能包的许可与效果：CC BY-NC-SA 4.0，商用和再分发要遵守；README 没有效果验证方法或数据；7421 star、两个月内 v0.80 到 v0.84 的发版、技能标注时长都是作者主张或间接信号；README 末尾截断，77 技能正文未展示。
- PM 技能添加约定：必须有 `## Input` 段落；不要用 `$ARGUMENTS` 模板，它跨运行时不可移植，校验器会强制。
- 示意图技能不替代设计图的人：原文明确它只提供快速初稿和设计想法，科学内容与细节仍需人工检查与微调。
- 示意图技能的证据是定性的：只有作者自制的五篇论文对比演示（发表版图 / Opus 5.5 无技能 / Opus 5.5 有技能），没有量化评分、盲评或通过率，也没有定义「更好」的标准；"publication-quality" 只是作者主张。
- 示意图技能的字体许可与代码不同：代码是 MIT，内置 Latin Modern 字体是 GUST 字体许可，商用发布前要确认授权随附情况。
- 示意图技能没有主动推进机制：原文未给出由时间、事件或状态触发并持续执行的机制，只有在同一文件夹里继续让 agent 改图这种人工接续的迭代方式。
- 示意图技能与清单里的 Mole 关系不明：原文完全没提到 Mole，无法判断两者关系；仓库内部只有 `patent-drawing` 复用 `schematic-figure` 引擎这一明确关系。
- 在 Codex 中用示意图技能要在提示里写 `SKILL.md` 路径；agent 在它被启动的目录工作，先建好项目文件夹再启动。
- 跨运行时安装路径：`.agents/skills` 可被 Codex、OpenCode、Gemini CLI、Copilot、Cursor 读取，但 README 未提供 Copilot 上的实际验证，且与清单中 Copilot 的 drop 状态不一致；不要默认所有代理行为一致。

## 证据与来源

**官方插件市场层（来自调研《anthropics/claude-plugins-official》所引原文 README）**：安装与发现命令、插件统一目录结构、参考实现 `/plugins/example-plugin`、`strict: false` + 显式 `skills` 数组的 marketplace 条目示例、路径相对 `source.path`、注册为 `<plugin-name>:<skill-name>`、`name` 不可变 slug、`displayName`、`renames` 映射均来自原文 README；仓库热度 39,182 stars、当日 +307 来自抓取指标；第三方收录走 plugin directory submission form、外部插件需通过质量与安全标准审核来自原文，但标准内容、审核流程、通过率未给出；Anthropic 不控制插件里的 MCP server、文件或其他软件、也无法验证它们来自原文明确警告；没有收录任何具体插件、没有使用者案例或效果指标，来自调研报告对原文的解读与局限说明。

**职能插件层（来自调研《anthropics/knowledge-work-plugins》所引原文 README）**：安装命令、统一目录结构、Making Them Yours 的四个定制方向、11 个插件及用途来自原文；插件自动激活、Skills fire when relevant 是原文主张；Star 数据 27360、今日 +309 为可核信息，只反映关注度；效果主张（「更好、更一致」「少花时间执行流程」等）是原文作者主张，无数据、案例、benchmark 或对比支撑；适用条件与局限（README 不含单个插件具体内容；Cowork 开放范围/价格/区域限制未说明；仓库许可未说明；原文自称通用起点；材料可能被截断）来自调研报告对原文的解读。

**收口层（来自调研《petekp/inbox》所引原文 README）**：安装与更新命令、源码调试方式、检查脚本来自原文，可直接照做；三个标签页、面板快捷键、自动切换、空闲摘要来自原文；测试/构建核对行为来自原文描述，实际可靠性没有数据支撑；成本表来自原文自述数字，未经第三方验证；版本依赖（作者在 Claude Code 2.1.292 上构建和测试）、33 stars、单作者仓库来自原文与调研报告；intelligently manages 属作者主张，原文没有说明分类准确率、误报漏报情况。

**观测层「广」（来自调研《whyashthakker/awesome-claude-code-mods》所引原文 README）**：可执行命令、7 个分类与各类 mod 名单、版本前提 2.1.287+、作者在 2.1.288 测试、mod 默认启用、VS Code 聊天面板与 `claude -p` 不显示面板、无运行时依赖无构建步骤、Git 类与包类 mod 的依赖均来自原文 README 明示的前提；可采集的量化指标来自原文 README 的 Session 类 mod 说明；仓库 33 stars、声称 70 个 MIT 打包插件、社区 14 条于 2026-10-03 对照作者文档核查、截图是测试套件用 fixture 数据捕获的渲染树而非原生 app 截图、社区条目未经安装运行与安全审计来自原文的可核声明与明确限制；各 mod 的准确性（forecast 与 token 计算为估算、Desktop Usage Strip 的 USD 不是订阅账单、缺失值只标注不补全）属作者主张或作者自认的局限。

**观测层「深」（来自调研《YeonwooSung/my-claude-code-mods》所引原文 README）**：6 个 mod 的名称与一句话用途、仓库 486 stars、官方 Mods 文档入口、安装机制按官方文档使用 `plugin@marketplace`、各 mod README 路径来自原文与线索元数据；原文对添加 marketplace 只给了机制描述，没有给出具体命令行；开发/测试命令块来自原文，可原样复制；`npm test` 不模拟引擎事件、测试文件串行执行、CI 只跑独立核心测试、engine type declarations 本地生成不入版本库来自原文前提说明；四配置对照实验方法来自原文；前提与兼容性对照表来自原文；「没有给出四配置的性能结果」「20k span/item 测试只界定分析成本上限、不测量合并引擎开销」「UI 只验证了 render trees，未验证 live pixels」「每个 mod 的具体安装与配置要进各自 README」来自原文明确声明，属作者自认局限；6 个 mod 的功能描述本身没有实测数据、成功率或案例数字。

**交接层（来自调研《Arjun0014/project-sentinel》所引原文 README 与调研结论）**：安装、会话内安装、本地 clone 安装、不安装试跑、Desktop 的 `CLAUDE_CODE_PLUGIN_DIRS` 配置、迁移、更新、卸载命令与 `/cr` 系列命令来自原文 README，可直接照做；六节面板、状态栏 HUD 状态字样、Activity 排序规则、Handoff Health、Quest log 的 XP 规则、`milestones` 工具、`decision_request` 工具、按类别的权限策略、Autopilot 交接步骤、Watchers 三种策略、Mission Queue 边界投递规则、Run Budget / Machine load / Cache Guardian / Keep warm / Cold Resume Guard 的默认值与行为、profiles 与 Answer styles 来自原文 README；版本 1.6.3、MIT、无运行时依赖无构建步骤、Claude Code 2.1.289 或更新且需 function-hooks 插件 API、只在 Windows 11 与 2.1.289 / 2.1.293 / 2.1.295 上验证过、远程会话未测试、1.4.0 更名与两处行为变化来自原文 README 与调研结论；「减少了多少上下文溢出和人工盯守」原文没有量化数据，只有机制描述；调研结论因此建议先用 `claude --plugin-dir` 在单个长任务会话里试跑，用 Handoff Health 与跨交接的里程碑连续性作判据；Autopilot 阈值截图里的 70% / 80% 是截图示例，不是推荐值。

**Blender 技能包（来自调研《EL4CTEO/blender-skills》所引原文 README）**：安装命令、支持代理列表、20 个技能名称与一句话描述、三条示例提示词、开发验证命令、43 个 headless Blender 测试、MIT 协议来自原文；仓库 metrics 显示 42 stars；作者声称 “Every script is tested in a real Blender.”，并称技能为 Blender 5.2 LTS+ 构建，属作者主张；局限：只看到 README，没有看到各技能内部的提示词、脚本、配置文件或 QA 规则，无法复现具体 Blender 工作流；无法验证 43 个测试是否全部通过、是否真在 Blender 5.2+ 实测；README 没有性能数据、前后对比案例或失败模式。

**PM 技能包（来自调研《deanpeters/Product-Manager-Skills》所引原文 README）**：安装命令、下载包、本地 playground 命令与功能、技能文件标准结构、技能三层分类与数量、8 条路线与可粘贴提示词、版本发布记录（v0.80 2026-06-19 → v0.81 07-04 → v0.82 07-08 → v0.83 07-17 → v0.84 08-10）、license CC BY-NC-SA 4.0、star 数 7421 来自原文；`## Input` 段落与不用 `$ARGUMENTS` 的约定、校验器强制来自原文；`autonomous-investigation`、监控类技能、情报链、`eol-checklist` 来自原文；局限：材料只有 README 且末尾被截断在 “worth a bookmark if you work”，77 个技能正文质量无从验证；“77 battle-tested skills”“do PM work at a professional level”“Adaptive Decision Ladder 的效果”“各技能 1-1.5 小时 / 2-4 天 / 3-4 周”的时长估计全部没有对照实验、案例数据或用户结果指标支撑，属作者主张。

**示意图技能包（来自调研《lgwrightlab/schematic-figure》所引原文 README）**：安装命令、两个 skill 文件夹与 `patent-drawing` 复用 `schematic-figure` 引擎、四条提示词模板、look / size / depth 三个旋钮及各自取值、输出写到 `figure/out/`（SVG、PDF、PNG）、Codex 需写 `SKILL.md` 路径、Node.js 22+ 与 Chromium 前提、Blender 与 RDKit 可选、导出其他格式的 Python 依赖与 `pdftops`/Ghostscript、MIT 许可与内置 Latin Modern 字体的 GUST 字体许可来自原文；仓库 31 stars 来自抓取指标；证据只有 README 顶部幻灯片里五篇论文的发表版图 / Opus 5.5 无技能 / Opus 5.5 有技能对比、作者博客《Automating schematic figure making》、五篇均为 CC BY 授权，均为定性证据；没有量化评测、盲评、失败率或返工率；"publication-quality"、「提供快速初稿和大量设计想法」、「并行三个 agent 再合并取优」属作者主张；原文自述局限：不替代设计图的人，仍需检查科学与细调细节；原文未给出由时间、事件或状态触发并持续执行的机制，只有人工接续的迭代方式；原文完全没有提到 Mole，无法判断二者关系。

**属于本次调研作者建议、非原文数据**：官方市场的最小试用路径（1–2 小时 + 一周观察，只挑 1 个插件、检查来源、低风险任务、记录完成时间/轮次/手工切换/失败比例/新任务，一周无改善则卸载并记为「该插件无实质增益」）来自调研报告建议；职能插件层的自测指标（完成时间、返工次数、补齐上下文次数、命令可用性）原文没有官方指标，是调研报告建议的自测方式；收口层的自测指标（漏掉的待办数、手动追问测试是否通过的次数、切换窗口次数）与最小试用步骤是调研报告建议的自测方式；观测层「广」的最小试用路径（只装 1–2 个观测类 mod、先一周基线再一周开面板做同类任务对比）是调研报告给出的建议；观测层「深」的试用路径（先装单个 mod、优先 loop-detective 或 context-inspector、按其四配置方法量开销、不要在单元测试通过后就下性能结论）来自调研结论；两个观测集合之间的选择建议（要广度用 awesome-claude-code-mods，要深度用 YeonwooSung/my-claude-code-mods）来自调研结论的整理；交接层的试用路径（不安装试跑、只在单个长任务会话里试、用 Handoff Health 与跨交接的里程碑连续性判断）来自调研结论；Blender、PM 与示意图的最小试用与指标（隔离环境、安装、示例任务、记录完成时间与人工干预、导出检查、QA 报错、validate/run_tests、示意图按 standard 口径复核与字体授权检查）来自三篇调研报告的「怎么试、怎么验证」部分，不是原文效果数据。

## 依据的调研

- [anthropics/knowledge-work-plugins](../research/radar/2026-10-09/2061-anthropics-knowledge-work-plugins.md)：值得一试，先挑一个与本职最接近的插件（如数据岗用 data、销售岗用 sales），按原文两条命令装好、跑通一个斜杠命令，再打开它的 skills/ 文件按团队真实流程改一条；因为原文给出了可直接复制的安装命令和明确的插件目录结构，属于可照做的最小动作，但 README 只有“更好更一致”的主张、没有任何效果数据，不足以直接 adopt。
- [whyashthakker/awesome-claude-code-mods](../research/radar/2026-10-09/2191-whyashthakker-awesome-claude-code-mods.md)：值得一试，可以小范围试：先注册 marketplace，再挑 1–2 个 Session 观测类 mod（Context Meter、Tool Timing、Error Inbox）在现有项目里跑一两周，用它们的计数指标做开启前后对比；理由是 README 给出了可直接复制的安装命令与明确版本前提，且观测类 mod 恰好产出「效果验证」需要的量化数据，但这是第三方未审计的插件集合、截图也非原生捕获，不适合整体照单全收。
- [petekp/inbox](../research/radar/2026-10-11/2454-petekp-inbox.md)：值得一试，可以小范围装上试：在 Claude Code 里用 `/plugin install inbox --marketplace petekp/inbox` 安装后跑 `/inbox demo` 观察它能否捕获你本来会漏的待办与失败测试，理由是原文给出了可直接照做的安装、更新、面板操作与成本数据，但除作者自述外没有任何效果验证，且每轮回复都会产生额外 Sonnet 调用成本。
- [Arjun0014/project-sentinel](../research/radar/2026-10-11/2568-arjun0014-project-sentinel.md)：值得一试，先用 `claude --plugin-dir` 不安装地在单个长任务会话里试跑，打开 Autopilot、状态栏和 Activity，用 Handoff Health 与跨交接的里程碑连续性判断是否真的减少了上下文溢出和人工盯守。理由是 README 给出了可直接复制的安装、Desktop 配置和斜杠命令，但它建立在仍处 early access 的 function-hooks 插件 API 上、只在 Windows 11 和 Claude Code 2.1.289/2.1.293/2.1.295 上验证过，不宜直接定为团队标准。
- [YeonwooSung/my-claude-code-mods](../research/radar/2026-10-14/3008-yeonwoosung-my-claude-code-mods.md)：值得一试，建议在 Claude Code 上小范围试装并验证，优先从单个 mod（如 loop-detective 或 context-inspector）入手，并用原文给出的四配置对照法测开销；理由是这份 README 给出了 6 个可安装的真实 mod、统一的安装路径（plugin@marketplace）和一套可照做的验证方法，但每个 mod 的具体安装与配置细节要进各自 README，且原文明确声明尚未给出多 mod 合并的性能结论。
- [anthropics/claude-plugins-official](../research/radar/2026-10-16/3896-anthropics-claude-plugins-official.md)：值得一试，把 Claude Code 的官方插件市场作为扩展 AI 能力的标准入口用起来——先用 `/plugin` 浏览并安装与当前工作直接相关的插件，理由是该仓库给出了可直接复制的安装命令和插件/marketplace 条目的完整声明结构，是目前少见的、可照做的扩展配置入口。
- [EL4CTEO/blender-skills](../research/radar/2026-10-16/3982-el4cteo-blender-skills.md)：值得一试，建议小范围试用：按 README 给出的安装步骤把 blender-skills 装到 Claude Code 或通用 agents 目录，用示例提示词驱动 Blender 任务，验证其 20 个技能是否真能减少手工步骤。理由是仓库提供了可复制的安装、调用和测试命令，但 README 未展示各技能内部的具体提示词、脚本和 QA 规则，需实测确认效果。
- [deanpeters/Product-Manager-Skills](../research/radar/2026-10-16/3987-deanpeters-product-manager-skills.md)：值得一试，按 README 给出的安装命令装入 1-2 个技能，用你自己手上的真实 PM 任务跑一遍并与裸提示做对照——仓库给出了可直接复制的安装命令、技能文件结构和按情境的可粘贴起始提示词，具备小范围试的条件；但材料只到 README，77 个技能正文的实际质量无从验证，所以先试不宜直接采用。
- [lgwrightlab/schematic-figure](../research/radar/2026-10-17/4172-lgwrightlab-schematic-figure.md)：值得一试，按 README 给出的安装命令和提示词模板，在自己论文里挑一张真实示意图小范围试用该技能（含 look/size/depth 参数与三 agent 并行出多版设计），因为它提供了可直接复制的安装步骤、提示模板和输出目录约定；但证据只有作者自制的对比演示、无量化评测，且原文明确仍需人工把关科学性与细节，故先试不直接采用。
