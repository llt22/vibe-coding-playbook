# 让编码 agent 在宣布完成前拿出证据：图表、组件、架构图、UI、特效与 B 端后台

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决编码 agent 交付物“看着完成”却经不起检查的问题，把图表、组件、架构图、前端 UI、终端 QA、实时特效、界面文案、网页设计和 B 端后台页面的验收，从人工事后补查变成 agent 交付前的可执行门禁与证据。
> 先试这一步：先挑一个你最近被 agent 做坏的真实交付物（一张图、一个组件、一个页面或一个 B 端列表页），按对应做法跑一遍基线对照，再决定是否把它固化进流程。
> 最近修订：2026-10-28

## 解决什么问题

编码 agent 交出来的东西常常“看着完成了”：图表用了没说清的对数轴、把 EU 总量和它的成员国排在一起、来源行靠猜或直接写文件名、图上还留着 TODO；组件会发明路由、引入第二套设计系统、漏掉加载/取消/无效输入/结果恢复这类状态；架构图则可能脱离真实系统、与部署漂移、无法增量维护；前端界面则是“所有模型都在同一套 SaaS 模板上训练”，不加指导就产出同样的坏味道——Inter 字体、紫到蓝渐变、卡片套卡片、彩色背景上的灰字、每个标题上方一个圆角方块图标；界面文案里塞满中点“·”分隔符和重复标题含义的解释性描述，把界面弄脏、分散用户注意力；游戏实时特效则可能“代码编译通过、linter 通过”，但没有任何人在真实引擎里看过它长什么样；网页页面还容易落入模型默认套路——每个标题上方的 eyebrow、字距拉开的大写标签、标题里一个彩色词、整页空框或全是照片、hero 撑不满一屏、每页结尾都塞订阅框、表单点“谢谢”却没真提交——重设计时还可能把原有链接、表单字段、事件处理器和标题弄丢。B 端后台页面则容易把组件直接堆上去：不先选页面骨架，一个操作区出现多个 Primary 按钮，金额列没有右对齐，查看详情误用模态而不是抽屉，高危删除弹窗点遮罩就静默关闭，加载不足 1 秒也弹骨架屏，关键报错藏在 Tooltip 里，内外容器圆角不满足同心公式。更麻烦的是，改完前端 UI 或特效后，你往往还要自己开浏览器、起 localhost、开 Godot 窗口、手动点一遍才能确认。网页/UI 改版还容易变成“agent 收到一句提示就直接全量开发”，没有先拿出一个代表性 specimen 让用户审阅；改完只看一张静态截图，不按多宽度和 reduced motion 跑一轮审查；模板痕迹（pill、卡片组、kanban、默认字体、SaaS 配色、emoji、横向溢出、运行时错误、占位文案、减少动态偏好下仍持续动画）没有一份可复测的账本。

这份手册给十条可落地的做法，把“检查”和“展示”从你手里挪到 agent 交付之前：图表过三道检查、组件写代码前先签契约、架构图从真实来源生成并在合并前校验、前端 UI 先固定持久事实再用确定性规则当门禁、让 Claude Code 在终端里直接展示截图/录屏/前后对比 QA、让游戏特效在真实 Godot 视口里渲染成胶片条再交由另一个 agent 独立评审、把两条界面文案规则变成“先检索列清单 → 人工确认 → 再改 → 前后截图对照”的流程、用 Hallmark 的三层门禁 + sloplint + 冷上下文复审 + before/kept 快照验收网页设计与重设计、用 unparalleled-skillset 的设计技能 + 代表性 specimen + Playwright 多宽度截图审查闭环验收 UI/网页改版，以及用 b-end-design-system-skill 的 B 端页面骨架、组件选型否定判据、视觉硬门禁和 15 项检查清单约束后台页面生成。

特效那条的骨架——生成 → 真实渲染验证 → 独立评审 → 防篡改证据绑定到具体构建——不限于特效，可以直接搬到别的交付物；文案那条则是反面补充：规则本身主观，必须留人工确认这一环，不能全自动；Hallmark 那条补的是网页页面级的“可判定检查 + 冷上下文终审 + 不丢功能”的组合；unparalleled-skillset 那条补的是“先 specimen 再全量、按轮次重拍截图并记录修复账本、把页面内选取和补丁交给 IDE agent”的组合；B 端设计系统那条补的是后台页面的“先选骨架 → 按否定判据选组件 → 用硬门禁和检查清单复核”的领域规则层，但它的规则是特定设计主张，必须先小范围试。

## 适用与不适用

**适用：**

- 你已经在用支持 Agent Skills 的编码代理（evident-charts 声明支持 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、Antigravity；Bricks 要求支持 skills 的代理；drawio-skill 声明兼容 Claude Code、Cursor、Copilot、OpenClaw、Codex、Autohand Code、Hermes 等 Agent Skills 格式的智能体；show-your-work 是 Claude Code 插件，要求 Claude Code v2.1.287+；effekseer-vfx 声明支持 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode 等 Agent Skill 宿主；Hallmark 装在 Claude Code、Codex CLI、Cursor、OpenCode 里；unparalleled-skillset 声明支持 Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI、Antigravity、Windsurf、Devin、OpenCode、Cline、Roo Code、Kiro），并且任务落在这些交付物上：
  - 用数据画图：matplotlib、seaborn、pandas `.plot`、ggplot2、Plotly、Vega-Lite/Altair、D3；输出尺寸有博客、X、LinkedIn、Instagram、幻灯片、报告、手机预设。
  - 实现一个有明确边界的命名组件或有界组合（Footer、FAQ、Task Input、Agent Workspace 这类容易翻车的类型）。
  - 架构图/系统图/架构文档维护：从自然语言、代码、Terraform、Kubernetes、docker-compose、SQL DDL、OpenAPI/AsyncAPI/Protobuf/GraphQL、CI 配置生成可编辑 `.drawio`，或对已有图做增量同步、漂移 diff、规则校验。
  - 用 AI 代理做前端/UI 的设计与实现：项目涉及前端，你想让 agent 在一个已经写进仓库的视觉系统里干活，而不是每来一个新会话重新猜风格。
  - 在终端里用 Claude Code 做前端/UI、视频/动画类产出或需要视觉回归验证的修复，且你不想每完成一件事就切到浏览器手动 QA。
  - 用 Godot + Effekseer 做实时游戏特效（火焰、冰、毒、暗四组远程“投射物 + 命中”，加上 hit、slash、charge、shield、heal），或者你想把“真实渲染验证 + 独立评审 + 证据绑定到具体构建”这套闭环搬到别的领域。
  - 清理界面文案：项目有可让 Codex/Claude Code 读写的 UI 代码仓库（组件、模板或页面文件），能截改动前后的对比图，且有人愿意逐条确认为哪些解释性文本真的该删。
  - 做网页/前端页面的新建、重设计或 audit：你想让 agent 避开“AI 味”，把设计验收拆成可执行门禁，并在重设计时用 before/kept 快照防止丢链接、字段、handler、标题。
  - 用 AI 代理做应用型 UI（仪表盘、表格、表单、设置）或公开网站（作品集、落地页、产品故事）的设计与实现：你想让 agent 先出 brief/设计契约/一个代表性 specimen，再全量开发，并按多宽度和 reduced motion 截图审查、记录修复账本。
  - 做 B 端企业后台页面（查询列表、分步/分组表单、单据/高级详情、指标工作台与看板、设置页、异常与结果页），并想让 agent 先选页面骨架、按组件选型否定判据和视觉硬门禁生成，而不是直接堆 Button、Input、Table；可用 Cursor 的 `.cursorrules`、Claude Code/Antigravity/Codex 的 Skill 检索路径，或把通用 Prompt 贴给任意大模型。
- 项目已有代码库、组件、设计令牌、框架、路由和响应式约定（Bricks 的前提），或者项目里已有图表脚本与源数据，或者手上有可导入的真实架构来源（Terraform/K8s 配置、SQL、API 定义、代码目录、白板照片/截图），或者一个有前端界面的项目（Impeccable 的前提），或者一份可重复运行的 Playwright 脚本和能画图的终端环境（show-your-work 的前提），或者一个 Godot 4 游戏项目与 macOS Apple silicon / Windows x64 机器（effekseer-vfx 的构建前提），或者一个信息密度中等、含元信息行和说明文本的真实页面（文案做法的前提），或者一个有可访问页面的网页项目（Hallmark 的前提：Node 18+、项目已有字体/配色/框架/design.md 更好、能提供真实照片/截图/真实数字，跑 `--render` 还需要 Chrome + puppeteer-core），或者一个低风险内部仪表盘/落地页 + Node.js 20+ + 受支持编程助手 + Playwright/浏览器（unparalleled-skillset 的前提），或者一个 B 端企业后台页面任务和可访问的规则文件（做法 J 的前提）。

**不适用：**

- 整产品规划、完整网站定义、纯编辑文案——Bricks 明确不覆盖这些；完整页面它提到用 Pagina（原文提到，但 Pagina 不在本次给定材料里）。
- 复杂领域行为组件（编辑器、数据网格、图表组件、日历、可访问性原语）在项目没有现成方案时，应该用成熟库，而不是让 agent 从零写。
- 架构图如果不想安装 draw.io 桌面 CLI，或没有真实来源/反馈循环，drawio-skill 的核心能力会受限；它也不适合替代手绘风、diagrams-as-code、自由画布（README 建议换同作者家族其他 skill）。
- 前端 UI 的检测规则是确定性的、只覆盖可判定的坏味道；`/impeccable critique` 这类设计评审是 LLM-only 的主观判断，别把它当门禁。Impeccable 也不自带组件库或设计系统，视觉方向要你在持久事实和 `DESIGN.md` 里自己定。
- show-your-work 只支持 macOS 与 Ghostty/kitty；iTerm2、macOS Terminal、VS Code 内置终端目前画不了这类图片；Linux 和 Windows 尚不支持；tmux 内“还不可靠”，可尝试在 tmux 配置里开 `set -g allow-passthrough on`。它也不适合已经工作在 VS Code/Cursor 编辑器里的用户（原文 FAQ 直接这么说）。
- 实时特效这条链路的前提很硬：build 只在 macOS Apple silicon 与 Windows x64 已验证；Windows ARM64 会装上匹配的 .NET 运行时但**未验证**；Linux **只能跑 authoring，build 路径未验证**。如果你不做 Godot + Effekseer，只想复用那套闭环结构，那 F 只是参照，不必装它。沙箱内的 agent（例如 Codex 工作区沙箱）打不开 Godot 窗口，`review`/`preview`/`showcase` 需要用户在桌面终端放行。
- 界面文案做法不适合无人工复核的全自动批量改写，尤其不适合文案涉及合规、错误提示、表单说明的界面；也不适合分隔符真的承担结构作用的场景（英文界面、数据表格、面包屑、元信息行里“·”常是分隔结构的一部分，直接删可能损害可读性）。
- Hallmark 仅覆盖网页/前端设计；README 没有列出 Floor/Reflex/Finish 的具体条目，不能直接把它的验收规范照搬到别的领域；也没有前后对比数据、评测结果、误报/漏报率。
- 没有 Chrome + puppeteer-core 时，Hallmark 的 `--render` 和截图检查会降级为静态检查，别当成完整检查。
- Hallmark 的照片来自 Wikimedia Commons（755 张），需按 CC0/公有领域/CC BY/CC BY-SA 逐张署名；不要用 Unsplash/Pexels/Pixabay（其条款禁止 AI 工具选图）。
- 重设计前要能访问被改页面，`--before`/`--kept` 依赖它；`audit` 只报告不改，`redesign` 不点名就不动手。
- 想要现成的量化改善数据：这些材料都没有给出效果数字，文案那条连案例和前后对比图都没有，只能自己跑基线对照。
- unparalleled-skillset 自述为 first working slice，36 stars，没有客户案例、前后测数据或质量基准，不宜直接全量采用；只适合低风险 UI/网页改版试点。
- unparalleled-skillset 需要 Node.js 20+、受支持的编程助手、项目源码可读写、Playwright/浏览器、可运行页面；Studio 需要本地 server/agent 工具或 MCP，且是“agent 持续轮询”的半主动，不是无人值守自动推进。
- 截图 capture 是独立渲染，不保证等于用户当前标签页；运行时源码映射只是线索；Vite 适配器只能本地 HTTP；浏览器扩展是开发版；npm 发布前要从 GitHub 安装。
- 设计禁令（禁卡片网格、kanban、药丸控件、通用 SaaS 配色等）是作者主张，适合作为约束试点，不是普遍真理。
- B 端设计系统做法只面向 B 端企业后台和 React/TS 模板；C 端营销页、非后台页面不要直接套。材料只有 README，未包含 `SKILL.md`、`.cursorrules`、模板和 `scripts/audit-design-rules.py` 正文，不能把 README 当成完整规范。
- 0.5px 边框、弹窗垂直固定于视口 38.2% 黄金分割位、选项少于 5 个强制单选框等是特定设计主张，需要结合目标产品规范、设备像素比和可访问性要求复核；`100% 严格执行`、`十余年经验` 是作者主张，没有案例或基准测试。
- 15 项检查清单和审计脚本只有路径，README 没给脚本运行命令、依赖和输出格式；拿不到或跑不起来时只能人工按清单复核，不能宣称自动化门禁已生效。

## 前置条件

- 通用：支持 Agent Skills 的编码代理，并且你已经在用它。
- 图表做法（做法 A）：
  - 本机有项目 Python 环境。
  - matplotlib 走原生 lint 脚本；Plotly、Vega-Lite、ggplot2、D3 通过 headless Chrome 导出 SVG 来做代码级检查。没有 Chrome 时只剩图表规格检查和图像复审。
  - 有源数据（如 CSV）、渲染后的 PNG 或生成脚本——批判已有图表时至少要给其中一项。
- 组件做法（做法 B）：
  - 项目已有路由、组件、设计令牌、框架、响应式约定、依赖、数据模型和测试，并且 agent 能读到。
  - 有真实的产品、资源、公司、法律等目标链接和内容可以复用。
  - 任务边界清晰：一个命名组件或有界组合。
  - 请求里写清组件的责任、上下文、变体、内容、交互状态、技术边界和验证要求。
- 架构图做法（做法 C）：
  - draw.io 桌面 CLI ≥ 30（必需，才支持 Mermaid→.drawio 转换与 ELK `--layout`）；Graphviz 可选，仅布局需要；Linux 无头环境需 `xvfb`。
  - 有真实来源文件（Terraform、K8s、docker-compose、SQL DDL、OpenAPI/AsyncAPI/Protobuf/GraphQL、CI 配置、代码仓库），或一张白板照片/截图；抓“实际部署”快照时需要 `terraform show -json`、`docker inspect`、`kubectl get -o json` 的访问权限。
  - 使用支持 Agent Skills 的智能体；也可选 MCP server 供 Claude Desktop、Cursor、VS Code、Codex 等 MCP host 调用。
  - 默认方式渲染 AI/LLM 品牌 logo 时需要网络访问 unpkg CDN；离线用 `--embed`。
- 前端 UI 做法（做法 D）：
  - 项目涉及前端/UI；本地有 Node——只为 `npx` 本身，skill 和 hook 自带引擎二进制，不需要 Node 运行时。
  - 扫 URL 时用本地已装的 Chrome/Chromium/Edge。
  - 想让检测在编辑时自动跑，需要在 Claude Code、Cursor、Codex、GitHub Copilot、Grok Build 这类支持 provider 原生 hook 的 harness 上安装（Codex 装/更新后要打开 `/hooks` 批准项目 hook；Grok Build 需要项目目录信任）。
- 终端内展示做法（做法 E）：
  - macOS；终端为 Ghostty 或 kitty（iTerm2、macOS Terminal、VS Code 内置终端目前画不了这类图片）；Claude Code v2.1.287 或更新。
  - 装 ffmpeg（视频播放需要）：`brew install ffmpeg`。
  - 任务侧需要一份可重复运行的 Playwright 脚本，能产出同一脚本的 before/after 两段录制。
  - 信息侧要提供 `url`、`changes` 的时间戳、`summary` 的检查项与通过数——这三样决定了“随视频打勾”“点击跳转改动”“差异行”这些能力能不能出现。
  - 图片、视频和文件不出本机、也不进模型上下文；匿名遥测可关。
- 实时特效做法（做法 F）：
  - authoring（写 brief/recipe、lint、处理与测量贴图）：Python 3.11+ 或 [uv](https://docs.astral.sh/uv/)；macOS/Linux/Windows 均可（macOS 自带 Python 3.9 太旧）。
  - build（用官方 EffekseerCore 编译 `.efkefc`/`.efk`）：需要 **macOS on Apple silicon** 或 **Windows x64**；首次 setup 需联网，约 250 MB 下载到 `~/.cache/effekseer-vfx`（可用 `EFFEKSEER_VFX_HOME` 改位置）。
  - render（Godot 胶片条评审、Lab、预览、打包）：在以上基础上还需要 PATH 中或 `GODOT` 环境变量指向的 [Godot 4](https://godotengine.org)（Forward+），以及用于参考片段和录制的 `ffmpeg`。
  - 已验证组合：macOS ARM64（Effekseer Core 1.80.7、EffekseerForGodot4 1.80.5.1、Godot 4.7、.NET 9）与 Windows 11 x64（同版本，Godot 4.7.2）。Windows ARM64 由 setup 装上匹配的 .NET 运行时但**未验证**；Linux 只能跑 authoring，其 build 路径**未验证**。
  - Windows 上所有 `sh <skill>/scripts/...` 命令也可在 Git Bash（Claude Code 所用）里跑；在 cmd 或 PowerShell 里，`vfx` 改用 `<skill>\scripts\vfx.cmd`，`setup.sh` 改用 `powershell -NoProfile -ExecutionPolicy Bypass -File <skill>\scripts\setup.ps1`。
  - 一个 Godot 4 游戏项目（技能在**用户自己的游戏项目目录**下运行，不是在自己的目录里凭空造）。
- 界面文案做法（做法 G）：
  - 一个可让 Codex / Claude Code 读写的 UI 代码仓库（前端组件、模板或页面文件）。
  - 能查看改动前后的界面截图。
  - 一个范围很小的试验对象：一个页面或一组组件。
  - 有人工逐条确认清单的环节（这一步不能省）。
  - 一个可写入的 agent 指令文件（如 CLAUDE.md / AGENTS.md 一类持久上下文文件）或代码审查清单，用来把一次性提示变成长期约束。
- 网页设计做法（做法 H）：
  - Node 18+。
  - 要跑浏览器检查（`--render`、截图）还需 `npm i -g puppeteer-core` 和已安装 Chrome；缺了只剩静态检查。
  - 项目已有字体、配色、框架、锁定的 `design.md`（若有），agent 能读到。
  - 开工前一次性提供真实素材：照片、截图、真实数字；Hallmark 明确“Nothing is invented”。
  - 被改页面可访问（`--before` / `--kept` 依赖）。
  - 可选：Claude Code 插件市场安装；编辑时门禁用 `install-hook.mjs`（仅 Claude Code）。
  - 照片授权：755 张 Wikimedia Commons 开放授权照片，按每张的 CC0 / 公有领域 / CC BY / CC BY-SA 逐张署名；不要用 Unsplash/Pexels/Pixabay。
- 设计改版做法（做法 I）：
  - Node.js 20 或更新。
  - 一个受支持的编程助手（Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI、Antigravity、Windsurf、Devin、OpenCode、Cline、Roo Code、Kiro）。
  - 项目源码可读写、有可运行页面；截图审查需要 Playwright 或允许 capture 脚本安装到用户缓存。
  - 可选 Studio：本地 server/agent 工具或 MCP；Vite 项目可加开发适配器（仅本地 HTTP 且 Vite 自己持有 server）。
  - 用户要提供 brief、品牌/既有约束和 specimen 审阅反馈。
- B 端后台做法（做法 J）：
  - 任务是一个 B 端企业后台页面，能明确页面类型（查询列表、分步/分组表单、单据/高级详情、指标工作台与看板、设置页、异常与结果页）。
  - 能访问仓库里的 `.cursorrules`、`SKILL.md`、`components.manifest.json`、`references/`、`scripts/audit-design-rules.py`；材料只给了路径，正文要自己打开确认。
  - Cursor 用 `.cursorrules` 或 `.cursor/rules/` 引用；Claude Code/Antigravity/Codex 把 Skill 放进提示词或 Skill 检索路径；任意大模型可直接粘贴 README 的通用 Prompt。
  - 有一个已有 B 端列表页和一个表单页做基线对照，固定同一模型、同一需求描述和同一评审人。
  - 若运行 `scripts/audit-design-rules.py`，先自行确认依赖、运行方式和输出格式。

## 操作步骤

### 做法 A：让图表在交付前过三道检查

用 evident-charts。它的思路是把“数据核对 → 代码级 lint → 只看渲染图的独立复审”做成自动加载的 Agent Skill。

1. 按你用的代理安装。前提：你已经在用对应代理。预期结果：技能装好，之后代理生成或审阅图表时它会自动加载。

   Claude Code：
   ```text
   /plugin marketplace add rhiever/evident-charts
   /plugin install evident-charts@evident-charts
   ```

   Cursor 及其他 Agent Skills 代理：
   ```text
   npx skills add rhiever/evident-charts
   ```

   GitHub CLI（`--agent` 可选 `claude-code`、`codex`、`cursor`、`gemini`、`github-copilot`、`antigravity`）：
   ```text
   gh skill install rhiever/evident-charts evident-charts --agent claude-code --scope user
   ```

   Codex：
   ```text
   codex plugin marketplace add rhiever/evident-charts
   codex plugin add evident-charts@evident-charts
   ```

   Gemini CLI（`--auto-update` 保持最新）：
   ```text
   gemini extensions install https://github.com/rhiever/evident-charts --auto-update
   ```

2. 确认依赖。技能会在你本机、用你项目的 Python 跑检查脚本：matplotlib 图表需要 matplotlib；其他库通过 headless Chrome 的 SVG 导出检查；没有 Chrome 时只有图表规格检查和图像复审会运行。

3. 照你平时的方式提图表需求即可，技能会自动加载，不用手动调用。原文给的示例提示词：
   ```text
   Chart sales.csv for a LinkedIn post on which regions grew fastest.
   Make one slide showing where our budget went last year.
   Critique this chart and fix it.        (attach the PNG, the script, or both)
   ```

4. 要审已有图表时，把 PNG、脚本或两者一起附上。预期结果：拿到按优先级排序、每条都引用某条规则的修改建议。

5. 知道它会自动做哪些检查——这也直接当你的验收清单：
   - 先查数据：总量与部分混在一起、重复行、占位符代码、未完的月份；
   - 按“想说明的结论”选图形形式：柱、线、表格，或一个大数字；
   - 把结论写成标题，并引用真实发布方而不是文件名；
   - 在代码里 lint 图表（matplotlib 直接做；Plotly、Vega-Lite、ggplot2、D3 通过其 SVG 导出）：文字重叠或被裁切、数据上的标签、不从零开始的柱、双 y 轴、色盲难辨的颜色、对比度过低；
   - 用一个只看得到 PNG 的“新审阅者”复审渲染图，并修掉发现的问题，最多三轮；
   - 对你交给它的任何图表做批判，按优先级排序并引用规则。

6. 让项目风格指南压过默认风格，但有边界。规则带证据等级标签：`[E]` 实验证据、`[P]` 从业者共识、`[T]` 品味或惯例。项目的 style guide 可以覆盖 house look 和任何 `[T]` 规则，但永远不能覆盖 `[E]` 类完整性规则（例如柱状图必须从零开始）。每条规则都在 `references/sources.md` 中被引用。

7. 按安装方式更新：

   | Installed with | Update command |
   |---|---|
   | Claude Code | `claude plugin marketplace update evident-charts && claude plugin update evident-charts@evident-charts` |
   | npx skills | `npx skills update evident-charts` |
   | GitHub CLI | `gh skill update evident-charts` |
   | Codex | `codex plugin marketplace upgrade evident-charts && codex plugin add evident-charts@evident-charts` |
   | Gemini CLI | `gemini extensions update evident-charts`（`--auto-update` 时自动） |

### 做法 B：让组件在写代码前先签契约

用 Bricks 的 component-builder。它的思路是把组件责任、上下文、变体、内容、交互状态、技术边界和验证要求前置成契约，约束 agent 少写脱离项目的 UI 代码。它不提供固定的 React/Vue/CSS 包，也不提供通用设计系统；布局、排版、密度、内容和实现由你的目标产品决定。

1. 安装：
   ```bash
   npx skills add kostja94/bricks --skill component-builder
   ```

2. 给一个有界组件任务，并把项目上下文和验证要求写进请求。原文给的完整示例：
   ```text
   Use component-builder to build the footer for this bilingual SaaS site.

   Read the existing routes, components, design tokens, framework, and responsive conventions first. Reuse project primitives, include the real product, resource, company, and legal destinations, and verify keyboard access on mobile and desktop.
   ```

3. 要求 agent 按六步流程执行：检查页面、邻近组件、令牌、依赖、数据模型、响应式约定和测试；识别组件的规范概念、用户任务、界面和归属边界；只加载匹配的组件参考和共享质量门；从真实内容和上下文选择变体；复用项目原语并实现所需状态和交互；在真实页面中验证组件，而不是只在孤立预览里验证。

4. 对复杂领域行为组件（编辑器、数据网格、图表、日历、可访问性原语），如果项目没有现成方案，要求 agent 使用成熟库。

5. 检查输出边界：不替换项目约定，不引入第二套设计系统，不发明路由/链接/目的地；FAQ 这类要暴露答案给辅助技术；Task Input 这类要实现加载、取消、无效输入、结果恢复等状态。

6. 验证。目标项目按项目已有的测试、lint、类型检查和真实页面交互来验。只有当你是在开发或修改 Bricks 仓库本身时，才运行：
   ```bash
   npm test
   ```

### 做法 C：让架构图从真实来源生成，并在合并前校验

用 Agents365-ai/drawio-skill。它把生成、布局、自检、校验拆开：LLM 负责从自然语言/源文件理解意图与规划，确定性脚本负责布局与结构（`autolayout.py` 的 Graphviz 放置与正交路由、`seqlayout.py` 的时序生命线与激活条、`c4.py` 的多页 C4 模型、`validate.py` 的确定性 lint）。

1. 安装 draw.io 桌面 CLI。前提：本机可装桌面软件；版本 ≥ 30 才支持 Mermaid→.drawio 转换与 ELK `--layout`。预期结果：`drawio --version` 能输出版本。

   macOS：
   ```bash
   brew install --cask drawio
   ```

   Windows：从 [jgraph/drawio-desktop releases](https://github.com/jgraph/drawio-desktop/releases) 下载安装包。

   Linux：从 releases 取 `.deb`/`.rpm`；无头环境需：
   ```bash
   sudo apt install xvfb
   ```

   验证：
   ```bash
   drawio --version
   ```

   WSL2 注意：CLI 实际是 Windows 桌面 exe，经 `/mnt/c` 访问，README 称 skill 会自动识别。

2. 安装 skill。前提：使用支持 Agent Skills 的智能体。预期结果：技能装好，之后代理处理架构图任务时会加载。

   任意智能体（Claude Code、Cursor、Copilot 等）：
   ```bash
   npx skills add Agents365-ai/drawio-skill -g
   ```

   手动安装示例：
   ```bash
   git clone https://github.com/Agents365-ai/drawio-skill.git ~/.claude/skills/drawio-skill
   ```

   更新：`skills update drawio-skill`，手动安装则 `git pull`。

3. 用自然语言出图。前提：完成步骤 1、2。预期结果：得到可编辑 `.drawio`，并经过自检、导出、反馈循环。README 给出的可复制提示词样例：

   ```text
   Create a microservices e-commerce architecture with Mobile/Web/Admin clients,
   API Gateway (auth + rate limiting + routing), Auth/User/Order/Product/Payment
   services, Kafka message queue, Notification service, and User DB / Order DB /
   Product DB / Redis Cache / Stripe API
   ```

   ```text
   Draw a Transformer encoder-decoder for machine translation: 6-layer encoder
   with self-attention, 6-layer decoder with cross-attention, input embeddings
   (batch × 512 × 768), positional encoding, and a final output projection.
   Annotate tensor shapes between layers and color-code by layer type.
   ```

4. 从真实来源导入。前提：手上有源码目录 / Terraform / K8s 配置 / SQL / API 定义；Graphviz 可选。预期结果：生成可编辑 `.drawio`，并可做漂移对比和交互式浏览。

   ```bash
   python3 scripts/tfimports.py ./infra -o graph.json          # Terraform -> 官方 AWS 图标
   python3 scripts/autolayout.py graph.json -o architecture.drawio

   # 两个版本的漂移对比，再导出为一个交互式文件
   python3 scripts/drawiodiff.py v1.drawio v2.drawio -o drift.json
   python3 scripts/drawiohtml.py architecture.drawio -o architecture.html
   ```

   README 表示完整格式与参数见 `references/autolayout.md`、`references/toolbox.md`（本次未提供）。

5. 解析正确的官方图标。前提：无，本地执行。预期结果：拿到形状/样式片段。

   ```bash
   python3 scripts/shapesearch.py "aws lambda" --limit 5
   # → Lambda (77x93)
   #   outlineConnect=0;...;shape=mxgraph.aws3.lambda;fillColor=#F58534;...
   ```

6. AI/LLM 品牌 logo。前提：默认方式渲染时需要网络访问 unpkg CDN；离线用 `--embed`。预期结果：得到 CDN 引用或自包含 data URI。覆盖 321 个 logo（源：lobe-icons，MIT）+ 18 个数据存储品牌（源：simple-icons，CC0）。README 注明 logo 是各所有者的商标，仅用于标识。

   ```bash
   python3 scripts/aiicons.py "claude" --json      # CDN 引用（默认）
   python3 scripts/aiicons.py "openai" --embed     # 内联为自包含 data URI
   ```

7. 自定义样式预设。前提：有一份样板 `.drawio` 或图片。预期结果：学会样式并可在后续图中使用；README 称会先渲染预览、经用户确认后才保存。内置 5 个预设：`default`、`corporate`、`handdrawn`、`colorblind-safe`（Okabe-Ito）、`dark`。

   ```text
   Learn my style from ~/diagrams/brand.drawio as "mybrand"
   ```

   ```text
   Draw a microservices architecture using my "corporate" style
   ```

8. 把校验接入 CI。前提：仓库有 PR 流程；具体 YAML 规则与 Action 配置在 README 未给出，只指向 `docs/CI.md`。预期结果：每个 PR 运行架构规则校验（YAML/JSON 规则，如 Internet 到数据库的访问、环、孤岛、信任边界、对比度）并由官方 GitHub Action 强制执行；PR Action 渲染视觉 diff。可用命令名包括 `diagramctl doctor/build/sync/views/query/test/review/whatif/story/publish/transform`，以及 `validate.py --score` / `--strict`、`prdiff.py`、官方 GitHub Action。具体配置需查看未提供的文档。

   README 称在 CI 中可 regenerate + validate（`--strict` gate）+ headless 渲染。

9. 保留手工布局的增量同步。前提：已有 `diagramctl` 生成的图并做过人工微调。预期结果：`diagramctl sync` 更新变更的节点/关系，保留调好的坐标、样式、注释；删除项默认保留为可评审状态。README 未给出该命令的完整参数。

10. 知道它的自检与反馈循环：先导出草稿 PNG 自检并自动修复（最多 2 轮）重叠、标签被裁剪、堆叠边，再进入最多 5 轮的用户反馈循环，直到确认后最终导出。

### 做法 D：给前端 UI 先固定持久事实，再用确定性规则当门禁

用 pbakaus/impeccable。它的思路是把“耐久事实”和“表层视觉方向”分开写进仓库文件、给 agent 一套共享命令词汇、再用确定性规则做可自动执行的守门人。这三件事可以迁移到任何需要稳定产出的任务。它由四部分组成：1 个 skill（所有命令经 `/impeccable <command> <target>` 调用）、24 条命令、61 条确定性检测规则加 LLM-only 的 critique 检查、以及在支持的 harness 上装 provider 原生 hook。

1. 安装。前提：项目涉及前端；本地有 Node（只为 `npx`）。在项目根目录：
   ```bash
   npx impeccable install
   ```
   安装器会列出检测到的 harness 目录（例如 `~/.claude`、`~/.codex`、`~/.grok`、`~/.hermes`、`~/.veto`，或项目内 `.cursor`），让你保留检测集或自定义 provider，然后问装进当前项目还是全局。脚本化时跳过这两次选择：
   ```bash
   npx impeccable install --providers=claude,codex,cursor,grok,hermes,veto --scope=project|global
   ```
   在 Claude Code、Cursor、Codex、GitHub Copilot、Grok Build 上，它还会为当前项目安装 provider 原生 hook manifest。装完**重载 harness**。刷新已有安装用 `npx impeccable update`。

2. 建立持久上下文（每个新项目一次）。前提：步骤 1 完成。预期结果：写出 `PRODUCT.md`（受众、目的、运行环境、约束、语气、证据），现有或新建的视觉系统单独记录在 `DESIGN.md`。
   ```bash
   /impeccable init
   ```
   `init` 会检查项目、只追问“耐久产品事实”里缺失的部分；访客模式和视觉方向留到每个 surface 再定。这一步是关键做法：把持久事实与表层视觉方向分开存，避免后续命令把两者混淆。

3. 用命令表干活（全部经 `/impeccable` 调用，多数命令可带一个区域参数）：
   ```
   /impeccable craft      # 完整“先定形再构建”流程，带视觉迭代
   /impeccable shape      # 写代码前先规划 UX/UI
   /impeccable critique   # UX 设计评审：层级、清晰度、情感共鸣
   /impeccable audit      # 技术质量检查（a11y、性能、响应式）
   /impeccable polish     # 收尾：对齐设计系统、可发布性
   /impeccable harden     # 错误处理、i18n、文本溢出、边界情况
   /impeccable document   # 从现有代码生成根目录 DESIGN.md
   /impeccable extract    # 把可复用组件与 token 抽进设计系统
   /impeccable live       # 浏览器内逐元素迭代的视觉变体模式
   ```
   带目标的例子：
   ```
   /impeccable audit blog           # 审 blog 首页 + 文章页
   /impeccable critique landing     # UX 设计评审
   /impeccable polish settings      # 发布前收尾
   /impeccable harden checkout      # 加错误处理与边界情况
   /impeccable redo this hero section
   ```
   常用命令可以固定成独立快捷命令：`/impeccable pin audit` 生成 `/audit`。

4. 建立确定性检测基线（不需要 LLM、不需要 API key）：
   ```bash
   npx impeccable detect src/                   # 扫目录
   npx impeccable detect index.html             # 扫单个 HTML
   npx impeccable detect https://example.com    # 扫 URL（用本地已装的 Chrome/Chromium/Edge）
   npx impeccable detect --json .               # CI 友好的 JSON 输出
   npx impeccable detect --no-config src/       # 忽略项目配置的原始扫描
   ```
   退出码语义（做门禁时依赖它）：`0` 扫描完成且无 primary findings；`2` 扫描完成但有 primary findings；`1` 至少一个目标无法扫描（多目标部分失败时操作失败优先）。人类可读的 findings 写 stderr，所以重定向：`npx impeccable detect src/ 2> findings.txt`；机器可读用 `--json` 走 stdout。

5. 把检测接成自动反馈。前提：步骤 1 已在支持的 harness 上安装。预期结果：直接编辑 UI 文件时触发检测。Claude Code / GitHub Copilot / Codex 在编辑后提示（支持时在 Stop 再跑一次更深的 pass），Grok Build 编辑后先扫、在 Stop 才把结果给模型，Cursor 在坏的写入落地前就拦。配套注意：Codex 装或更新后要打开 `/hooks` 批准项目 hook（Codex 按 hook 定义记信任，改了 `.codex/hooks.json` 可能需再次批准）；Grok Build 需要项目目录信任（`/hooks-trust` 或 `--trust`）。

6. 配置检测的忽略与豁免。前提：有已知的合理例外。预期结果：`/impeccable hooks` 和 `npx impeccable detect` 共用同一套配置。忽略规则写在 `.impeccable/config.json` 的 `detector` 键（`detector.ignoreRules`、`detector.ignoreFiles`、`detector.ignoreValues`、`detector.designSystem.enabled`）。命令行方式：
   ```bash
   npx impeccable ignores list
   npx impeccable ignores add-file "src/legacy/**"
   npx impeccable ignores add-value overused-font Inter --reason "Brand font"
   ```
   只想让某个文件豁免，就在文件里写内联注释（任意注释语法均可，作用域是整个文件）：
   ```html
   <!-- impeccable-disable overused-font: exported brand doc -->
   ```
   细到一行用 `impeccable-disable-line` 或 `impeccable-disable-next-line`；`--no-inline-ignores` 或 `--no-config` 会绕过内联豁免。

7. 把产物按“可提交/一次性”分开。前提：准备提交配置。预期结果：共享产物留在版本控制里，一次性输出不进仓库。`.gitignore` 直接复制：
   ```gitignore
   # impeccable-ignore-start
   # Ephemeral output, runtime state, and per-dev overrides.
   # The **/ prefix covers .impeccable at the repo root or in a nested workspace.
   # Shared artifacts stay tracked: config.json, live/config.json,
   # design.json, surfaces/*.md, critique/*.md.
   **/.impeccable/config.local.json
   **/.impeccable/hook.cache.json
   **/.impeccable/hook.pending.json
   **/.impeccable/*.png
   **/.impeccable/review/
   **/.impeccable/questions/
   **/.impeccable/live/server.json
   **/.impeccable/live/sessions/
   **/.impeccable/live/previews/
   **/.impeccable/live/annotations/
   **/.impeccable/live/cache/
   **/.impeccable/live/manual-edit-apply-transaction.json
   **/.impeccable/live/manual-edit-events.jsonl
   **/.impeccable/live/manual-edit-evidence/
   **/.impeccable/live/pending-manual-edits.json
   **/.impeccable/live/deferred-svelte-component-accepts.json
   **/.impeccable/live/*.png
   # impeccable-ignore-end
   ```
   **必须保留跟踪**（共享项目产物，不要加进 `.gitignore`）：`.impeccable/config.json`、`.impeccable/live/config.json`、`.impeccable/design.json`、`.impeccable/surfaces/*.md`（按路由/产物的策略与方向契约）、`.impeccable/critique/*.md`（评审报告）。若一次性文件已被提交，`.gitignore` 不会自动取消跟踪，用 `git rm --cached <path>`。

8. 选构建路径 comp-first 还是 code-first。前提：有图像生成能力时这个选项才出现。`/impeccable init` 问一次并记进 `.impeccable/config.json`：
   ```json
   { "buildPath": "comp" }
   ```
   只读 `comp` 和 `code` 两个值。comp-first 先出高保真稿再对齐构建（更大胆、更慢）；code-first 直接在代码里建、把野心写进 surface brief 的 dev-only 方向契约、收尾时核对（更轻、更快）。单机覆盖写 `.impeccable/config.local.json`（适合你的 harness 没有图像生成时）；monorepo 在仓库根提交一次，个别 workspace 可自设。已有项目不必重跑 `init`：每个决策页脚有切换开关，翻转只作用于当前会话，在没记录过的项目上翻一次后它会问是否保留并写入。

9. 团队用 Git submodule 做版本化安装。前提：想让 Impeccable 跟着 Git 走。预期结果：skill 目录由 submodule 提供，`link` 从 `.impeccable/dist/universal/` 链接单个 skill 目录，不动已有的真实 skill 目录（除非加 `--force`）。
   ```bash
   git submodule add https://github.com/pbakaus/impeccable .impeccable
   npx impeccable link --source=.impeccable --providers=claude,cursor
   git add .gitmodules .impeccable .claude .cursor
   git commit -m "Add Impeccable skills"
   ```
   更新：
   ```bash
   git submodule update --remote .impeccable
   npx impeccable link --source=.impeccable --providers=claude,cursor
   ```

10. 把反模式写成项目规范。预期结果：团队约定里有一份明确禁止项，直接拦掉模型默认的模板口味。skill 自带的明确禁止项包括：不用过度使用的字体（材料里列到 Arial、Inter、系统默认字体，此处被截断），以及前述坏味道——紫到蓝渐变、卡片套卡片、彩色背景上的灰字、每个标题上方一个圆角方块图标。

### 做法 E：让 Claude Code 在终端里展示截图、录屏和前后对比 QA

用 iamumeransari/claude-show-your-work。它的思路是当 Claude 做完一件事，把成果直接显示在终端聊天里：生成页面的截图、用 Playwright 点按应用的录屏，或一次修复的完整 QA（原始版 / 修改版并排对比）。原文的定位是“No browser, no localhost, no manual QA”。它靠两件事成立：Claude Code 的 mods 第一次允许插件改变 Claude Code 内部界面的显示；能画图的终端 Ghostty 和 kitty 支持 kitty graphics protocol。图片和视频不经过 Claude，Claude 只告诉插件该显示哪个文件，原文称几乎不消耗 token。

1. 前提：macOS；终端为 Ghostty 或 kitty；Claude Code v2.1.287 或更新。在 Claude Code 里添加插件市场并安装插件：
   ```text
   /plugin marketplace add https://github.com/iamumeransari/claude-show-your-work.git
   /plugin install show-your-work@iamumeransari
   ```

2. 在你自己的终端里装 ffmpeg（视频播放需要）。预期结果：装完即用，原文称 Claude 会自己开始展示它的工作，不需要额外配置。
   ```bash
   brew install ffmpeg
   ```

3. （可选）关掉每日自动更新。前提：不想每天跟着 GitHub 最新代码走。预期结果：需要手动更新。插件默认每天检查 GitHub 上新版本、自动安装，并提示你重启 Claude Code 才生效：
   ```bash
   SHOW_YOUR_WORK_AUTO_UPDATE=0
   ```
   关掉后手动更新用：
   ```bash
   claude plugin update show-your-work@iamumeransari
   ```

4. （可选）关掉匿名遥测。预期结果：不发送会话、展示类型和按钮使用情况。原文声明不上传文件名、路径、URL、标题、提示词、你输入或 Claude 写出的任何内容。
   ```bash
   SHOW_YOUR_WORK_TELEMETRY=0
   ```
   或 `DO_NOT_TRACK=1`；设置了 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` 时也会自动关闭。

5. 先跑官方 demo 验证环境。前提：完成步骤 1、2。预期结果：得到 before/after 两段录制。`examples/pricing` 是一个计费开关坏掉的定价页，外加一个录制前后对比的脚本：
   ```bash
   cd examples/pricing && npm i playwright
   node qa.cjs before rec-before   # the broken version: 3 checks fail
   node qa.cjs after  rec-after    # the fixed version: all 5 pass
   ```

6. 让 Claude 展示这组对比，提示词原文照抄：
   ```text
   "show me the QA, rec-after vs rec-before"
   ```

7. 用在自己的项目上：让 Claude 用 Playwright 跑一遍改动前的应用并录制，改完再用**同一个脚本**录一遍，然后把两个文件作为前后对比交给 `show_video`。原文给出了 Claude 传给插件的参数结构，可作为“你需要准备哪些信息”的清单：
   ```jsonc
   {
     "path": "qa/after.webm",          // the updated run
     "compare": "qa/before.webm",      // the original run, same script
     "title": "Pricing page",
     "url": "http://localhost:3000/pricing",
     "changes": [                      // what changed, and the second it shows up
       { "title": "Annual toggle sets prices", "at": 3.2 },
       { "title": "Plan buttons line up", "at": 5.4 }
     ],
     "summary": [                      // the test results, at most three lines
       { "label": "Billing: toggle works", "ok": true, "passed": 1, "total": 1 },
       { "label": "Layout: plans, buttons", "ok": true, "passed": 3, "total": 3 }
     ]
   }
   ```
   要点：`compare` 必须是**同一脚本**录的原始版，`changes[].at` 是每处改动出现在视频第几秒（用于点击跳转），`summary` 最多三行测试结果。

8. 只想看单张文件时，可以自己在 Claude Code 里打开：
   ```text
   /img path/to/file.png
   ```

9. （改插件本身时）编辑 `hooks/register.tsx`，然后：
   ```text
   /reload-plugins
   ```
   校验用 `claude plugin validate .` 和 `claude plugin test .`。

10. 知道参数上限：视频用 ffmpeg 切帧，最高 12 帧/秒、960 px 宽、最多 900 帧。QA summary 直接给结果（例 “Form: 8/8 passed”，最多三行）；每条 check 在视频播到被测试的那一刻弹出勾或叉；同一组 checks 会同时显示在原始版和修改版上；Compare 视图把两段录制逐帧对齐，“旧版加载慢的话视频会等它”；视频下方一行给出“此刻的差异”，例 `Annual toggle updates prices · Original ✗ → Updated ✓`；多次修改会保留每一版历史以便回看对比。

### 做法 F：让实时特效在真实引擎里渲染出来，再交给另一个 agent 独立评审

用 kanaworksai-hue/effekseer-vfx-skill（32 stars）。它把“让编码 Agent 用写代码的方式做实时游戏特效”封装成 Agent Skill，自称的循环是 **design brief → textures → Python recipe → EffekseerCore build → real Godot filmstrip → look → fix one thing → repeat → independent review**。仓库含两个技能：`effekseer-vfx`（创作：特效制作规则、经核实的 Effekseer/Godot 引擎约定、约 30 个可组合的图层原语、静态 linter、官方 EffekseerCore 编译器（带保存/打开回读校验）、Godot Lab（把每个特效摆成两个假人之间的交换动作）、带像素标记的胶片条截帧、迭代历史，以及把评审绑定到“它所看到的那次确切构建”的防篡改证据）和 `vfx-review`（由**另一个** Agent 在看不到 recipe 的前提下按固定评分表给胶片条打分——因为作者不给自己打分）。另有 13 个完成态特效示例（火焰、冰、毒、暗四组远程“投射物 + 命中”，加上 hit、slash、charge、shield、heal 各一，以及三个带诊断的 before/after 案例）。

1. 安装技能。README 说最简方式是把这个仓库 URL 交给你的编码 Agent 并让它安装；也可以自己装：

   Claude Code（在 Claude Code 中输入）：
   ```text
   /plugin marketplace add kanaworksai-hue/effekseer-vfx-skill
   /plugin install effekseer-vfx@effekseer-vfx
   ```

   Codex（在 Codex 会话中；技能落在 `~/.codex/skills` 或 `$CODEX_HOME/skills`，从下一轮或新会话生效）：
   ```text
   $skill-installer install https://github.com/kanaworksai-hue/effekseer-vfx-skill/tree/main/skills/effekseer-vfx
   $skill-installer install https://github.com/kanaworksai-hue/effekseer-vfx-skill/tree/main/skills/vfx-review
   ```

   其他 Agent（Cursor、Gemini CLI、Copilot、OpenCode 等）：
   ```sh
   npx skills add kanaworksai-hue/effekseer-vfx-skill
   ```

   或手动把 `skills/effekseer-vfx` 和 `skills/vfx-review` 拷进你 Agent 的 skills 目录（`~/.claude/skills/`、`.agents/skills/` 等），保持目录名不变。注意：**不要拷别的东西**，两个技能目录自带 `LICENSE`（`effekseer-vfx` 另有 `THIRD_PARTY_NOTICES.md`），运行时自包含且只读。

2. 加载并在游戏项目里查机器。若技能列表里还没出现，让用户开个新会话。然后在**用户自己的游戏项目目录**下运行：
   ```sh
   sh <skill>/scripts/vfx doctor
   ```
   （Windows 非 Git Bash：`<skill>\scripts\vfx.cmd doctor`），并按其 `next` 提示操作。注意 `doctor` 里的 `render: true` 只表示“找到了 Godot”。

3. 下载前先征求同意。`sh <skill>/scripts/setup.sh`（Windows 用 `setup.ps1`，确切命令在 `doctor` 的 `next` 里）会把工具链装进 `~/.cache/effekseer-vfx`（macOS ARM64 与 Windows x64 约 250 MB；其他平台用 `--authoring-only`），首次 `vfx init` 还会下载官方 Effekseer Godot 插件（约 34 MB）。setup 需要 Python 3.11+ 或 uv；若 `doctor` 报告两者都没有，先让用户装一个。**Godot 4 从不由它代装**：让用户自己装（或获得允许后代装），若不在 PATH 上则设置 `GODOT`。

4. 在沙箱外跑 Godot。`vfx review`、`preview`、`showcase` 会在用户桌面打开 Godot 窗口；沙箱内的 Agent（例如 Codex 工作区沙箱）打不开，需用户批准后在沙箱外运行，或把确切命令交给用户在桌面终端里跑。若一次评审没有渲染出任何帧，约 90 秒后会以 "rendered no frame" 停止（多半是窗口没打开，检查它附带的 Godot 输出）。

5. 确认可用并跑通第一步。再跑一次 `vfx doctor`（`modes` 应显示本机支持的能力），然后在游戏项目里对 Agent 说：*"Set up the effekseer-vfx skill here and show me the fire example."* 它会执行：
   ```sh
   sh <skill>/scripts/vfx doctor            # what this machine can do, and what to install
   sh <skill>/scripts/setup.sh              # macOS ARM64 / Windows x64; use --authoring-only elsewhere (asks you first)
   sh <skill>/scripts/vfx init              # creates vfx/ with the Godot Lab, materials and math textures
   sh <skill>/scripts/vfx examples add fire
   sh <skill>/scripts/vfx build --ids VFX_Projectile_Fire VFX_Fire_Explosion
   sh <skill>/scripts/vfx review --ids VFX_Projectile_Fire VFX_Fire_Explosion --note "baseline"
   sh <skill>/scripts/vfx showcase          # play the library in the Lab
   ```
   工具链默认在 `~/.cache/effekseer-vfx`，可用 `EFFEKSEER_VFX_HOME` 改位置（见 `skills/effekseer-vfx/references/cli.md`）。

6. 下一条自然语言需求触发完整循环。例如对 Agent 说：
   ```text
   Make a lightning strike for a targeted spell, short and sharp, with a return stroke.
   ```
   技能会让 Agent 写 brief、向你的图像生成工具索取手绘贴图（或直接找你要）、写 recipe、构建、多轮评审胶片条，并在报告 `effect-verify` 通过之前交给独立评审者。**关键约束**：在独立评审被提交且 `vfx overview` 被重跑之前，即使特效渲染正确，`effect-verify` 也会显示 `verified: false`；此时 Agent 应说 "builds and renders" 而不是 "verified"。

7. 贴图来源规则。复杂手绘形状（烟、斩击弧线、火、裂纹、冰、符号）**必须**来自图像生成模型，技能不会用代码伪造；若你的 Agent 有内置或对接的图像工具，它会用，并把提示词记录在 `vfx/texture_prompts.json`；否则它会明确告诉你该生成哪张图、存到哪里。数学形状（辉光、圆环、噪声、渐变、拖尾、畸变图）则程序化生成。

8. 在游戏里使用产出。特效最终是 `.efk` 运行时导出与 `.efkefc` 源文件，外加 `vfx_manifest.json`；生成的 Godot 项目带一个小 API：
   ```gdscript
   var handle = Vfx.play("VFX_Fire_Explosion", position)
   var shot = Vfx.launch("VFX_Projectile_Fire", from, to)
   shot.arrived.connect(func(at): Vfx.play("VFX_Fire_Explosion", at))
   ```
   详见 `skills/effekseer-vfx/references/godot.md`。

9. （可选）自测技能本身。README 给开发者的跑法：
   ```sh
   sh skills/effekseer-vfx/scripts/setup.sh --authoring-only
   ~/.cache/effekseer-vfx/venv/bin/python -m pip install pytest
   ~/.cache/effekseer-vfx/venv/bin/python -m pytest -q tests
   ```
   Windows PowerShell：
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File skills\effekseer-vfx\scripts\setup.ps1 --authoring-only
   ~\.cache\effekseer-vfx\venv\Scripts\python.exe -m pip install pytest   # a venv made by uv: uv pip install --python <that python.exe> pytest
   ~\.cache\effekseer-vfx\venv\Scripts\python.exe -X utf8 -m pytest -q tests
   ```

10. 把这套闭环搬到别的领域。F 真正可迁移的不是 Effekseer，而是这条骨架：**生成 → 在真实环境里渲染/运行 → 截图或截帧成可评审的产物 → 只看产物、看不到生成脚本的第二个 agent 独立评审 → 评审提交前不给 verified**。做法 A 里“只看得到 PNG 的新审阅者”是同一结构在图表上的版本；做法 E 的 before/after 录制是它在 UI 上的版本；做法 H 的 fresh-context 子代理终审也是同一结构。如果你在别的领域要复用，需要自己补三样：一个能把产物落到可观察形态的真实环境、一份固定评分表、一份把评审绑定到“那次确切构建”的证据。

### 做法 G：把界面文案的卫生规则前置成约束，再人工确认

用一条 X 帖子（@ZaynHao）里的两条提示词规则。它的思路是：界面文案层有一类“可判定、低风险”的清理工作——统一分隔符、删掉重复标题含义的解释性文本——不需要模型有设计品味，只需要按明示规则全库检索并替换，适合交给 Codex / Claude Code；但“哪些解释性文本是冗余的”带主观性，必须留一道人工确认。

注意这条与 A–F、H、I、J 的分工：A–F、H、I、J 是“让 agent 拿出证据/过门禁”，G 是“把可判定的规则前置成约束 + 人工逐条确认”，它不是门禁，也不该自动执行。

1. 选定范围很小的试验对象：一个页面或一组组件，最好信息密度中等、含元信息行和说明文本。前提：你有可让 agent 读写的 UI 文件、能看到界面。预期结果：先截一张改动前的界面图作为对照。

2. 把两条规则原样发给 Codex / Claude Code，并限定改动范围。原文的两条规则：
   ```
   不要使用中点“·”作为文案的分隔符。如果有，移除它。
   不要在界面添加冗余的解释性描述文本，这会弄脏 UI 界面，还会浪费用户的注意力。
   ```
   需要时在后面追加一句范围限定（这句是材料里试用时加的工程约束，不是原帖内容）：
   ```
   只修改 src/pages/xxx 下的文件，不要动逻辑与样式变量。
   ```
   预期结果：规则被理解为本次任务的约束，而不是一次性的“帮我改改 UI”。

3. 让智能体**先只做检索，不做修改**。预期结果：它列出该范围内所有包含“·”的文案位置，以及所有它判断为“冗余解释性描述”的文本，交给你确认——是一份清单，不是 diff。

4. 人工逐条确认清单。这是整条做法里不能省的一步：区分真正冗余的解释文本（重复标题含义、解释显而易见的功能、营销式废话）与必要说明（错误提示、权限说明、表单帮助文本、合规文案）。删掉后者会伤到可用性。

5. 确认后再让智能体执行删除或替换，并要求输出 diff，逐条对照第 4 步清单检查，防止顺手改到无关代码。预期结果：diff 只落在文案层。

6. 重新截图，与第 1 步的对照图并排比较。并把“·”替换成什么明确记录下来——空格、竖线、换行、拆成两个字段——形成团队的替代约定。原文只说了“移除”，没给替代方案，不先定这个就会各改各的。

7. 把这两条规则固化进项目的 agent 指令文件（例如 CLAUDE.md / AGENTS.md 一类的持久上下文文件）或代码审查清单，让后续每次 UI 改动都受约束。这一步是把一次性提示变成流程的关键。

8. 原帖第 3 条及之后的 7 条在给定材料里被截断（第 3 条只剩“review”），无法复原。需要完整 10 条就回到原链接重新抓取全文后再评估，不要凭标题推测内容，也不要替作者补写。

### 做法 H：用三层门禁、sloplint 和前后快照验收网页设计

用 Nutlope/hallmark。它的核心不是主题包，而是把设计验收拆成可执行的分层门禁：**Floor（底线）**永不放行——对比度、焦点、减少动效、编造事实、手机布局崩坏；**Reflex（反射）**是模型默认会掉进的套路——每个标题上方的 eyebrow、字距拉开的大写标签、标题里一个彩色词、整页空框或全是照片、hero 撑不满一屏、每页结尾都塞订阅框、表单点“谢谢”却没真提交——有理由可以破例，但要记录在案；**Finish（工艺）**是细节，从不阻断发布。流程上先由 `scripts/theme.mjs` 从 48 个“材质”主题里发三个，再由 `draw` 按页面**要做的事**给出结构；产出自包含 HTML/CSS，并在第一条 CSS 注释里盖戳记录做过的决策；最后由 `scripts/sloplint.mjs` 在真实浏览器里按八种宽度渲染检查，再加一个**全新上下文的复审者**说最后一句话。

1. 安装。前提：Node 18+；全局安装后所有项目可用，去掉 `-g` 只装当前项目。预期结果：技能装好，`/hallmark <prompt>` 可触发。
   ```bash
   npx skills add nutlope/hallmark -g
   ```
   只装一个 harness：
   ```bash
   npx skills add nutlope/hallmark -g --agent claude-code
   ```
   `--agent` 可取 `codex` / `opencode` / `cursor` / `github-copilot`。作为 Claude Code 插件：
   ```text
   /plugin marketplace add nutlope/hallmark
   /plugin install hallmark@hallmark
   ```
   从 clone 安装：
   ```bash
   node skills/hallmark/scripts/install.mjs
   ```
   安装脚本会先校验每个主题和引用再复制。

2. 触发。前提：步骤 1 完成。预期结果：进入 Hallmark 流程；没自动触发就点名。
   ```text
   /hallmark <prompt>
   ```
   Codex CLI 用：
   ```text
   $hallmark <prompt>
   ```
   也可以直接描述要建的页面，例如“use hallmark to build ...”。

3. Pre-flight（必须先做）。前提：项目可读。预期结果：先读项目已有字体、配色、框架、锁定的 `design.md`；**一次性索要素材**：照片、截图、真实数字。原文明确“Nothing is invented”。不要边做边猜素材。

4. 选题材与结构。前提：步骤 3 完成。预期结果：`scripts/theme.mjs deal` 给出三个匹配 prompt 且通过日志的主题；`draw` 按页面的“任务”给出结构。注意**主题只是材质，不是方案**——它不规定页面放什么、什么顺序，所以同一主题两次 prompt 出两个不同页面。一次构建只读一个主题文件（每个 ≤8KB）。

5. 先只建 hero，单独渲染、冷读评审，**再建页面其余部分**。前提：已有题材与结构。预期结果：错误结构不会在整页复制；hero 先过一遍冷读。这是强制隔离步骤。

6. 全页检查。前提：页面已建。预期结果：八种宽度渲染 + 静态检查，然后起一个 fresh-context 子代理复审终审。任何页面都能单独跑：
   ```bash
   node skills/hallmark/scripts/sloplint.mjs <file-or-dir> --render
   ```
   没有 Chrome + puppeteer-core 时，`--render` 和截图检查会降级为静态检查；别把降级结果当成完整检查。

7. 改已有页面——**不点名就不动手**。前提：已有页面可访问。预期结果：先拿报告或先做重设计，不要自作主张改。
   ```text
   /hallmark redesign ./src/app
   /hallmark audit ./index.html
   ```
   全量重设计保留内容与接线，只换系统与布局；说 *keep the layout* 是换皮，说 *polish* 是只去 AI 味。`audit` 只报告不改。

8. 用快照防回归。前提：重设计前页面可访问。预期结果：重设计前先跑 `sloplint --before` 记录每一条链接、字段、handler、标题；改完跑 `sloplint --kept`，**丢一件就判定失败**；交付物是前后并排对比。材料没有给出 `--before` / `--kept` 的完整参数形式，按 `sloplint.mjs` 的实际帮助补路径，不要凭猜写参数。

9. 加编辑时门禁（Claude Code）。前提：步骤 1 已装 Claude Code 版本。预期结果：编辑阶段的 Floor 检查被挂上。运行 `install-hook.mjs`；材料没有给出更完整的命令形式，按仓库脚本帮助执行。

10. 按三层语义裁定，不要把所有检查都变成阻断：Floor 硬阻断；Reflex 可破例但要在第一条 CSS 注释或记录里写明理由；Finish 不阻断发布。README 只给了分类名和例子，没有列出具体条目，所以这份分层规则可以当流程骨架，不能当完整验收清单照搬。

11. 用照片时逐张署名。前提：页面用到 Hallmark 的 755 张 Wikimedia Commons 开放授权照片。预期结果：按每张的 CC0 / 公有领域 / CC BY / CC BY-SA 署名；不要用 Unsplash/Pexels/Pixabay（其条款禁止 AI 工具选图）。

### 做法 I：用设计技能 + 代表性 specimen + 多宽度截图审查闭环验收 UI/网页改版

用 Phantom-Con-Artist/unparalleled-skillset 的两个设计技能（unparalleled-ui 面向应用、仪表盘、表格、表单、设置；unparalleled-website 面向公开网站、作品集、落地页、产品故事）和一个本地 Unparalleled Studio。它的思路是把 UI/网页设计从“给一句提示”推进到产品证据 → 设计契约 → 代表性 specimen → 用户审阅 → 实现 → 截图审查 → 修复 → 复测的闭环；同时用 Playwright 多宽度截图和对比度/token 脚本留下可复测的证据。仓库自述为 first working slice，36 stars，没有效果数据，只适合低风险试点。

1. 安装。前提：Node.js 20+；一个受支持的编程助手。预期结果：技能目录和路由说明被写好，agent 权限不变；装完新开 agent 会话。

   ```bash
   npx github:Phantom-Con-Artist/unparalleled-skillset setup
   npx github:Phantom-Con-Artist/unparalleled-skillset doctor
   ```

   按项目/全局安装：

   ```bash
   npx github:Phantom-Con-Artist/unparalleled-skillset install all
   npx github:Phantom-Con-Artist/unparalleled-skillset install website
   npx github:Phantom-Con-Artist/unparalleled-skillset install ui
   npx github:Phantom-Con-Artist/unparalleled-skillset install all --global
   ```

   用 `agents` 查看检测到的助手，用 `--dry-run` 只看计划。可选：Claude Code 想让每个设计提示自动加结构化 brief 时运行：

   ```bash
   npx github:Phantom-Con-Artist/unparalleled-skillset hook --write
   ```

   `hook --write` 是唯一会改项目 `.claude/settings.json` 的命令，需你主动要求。

2. 按任务选技能：应用/仪表盘/表格/表单/设置选 `unparalleled-ui`；公开网站/作品集/落地页/产品故事选 `unparalleled-website`。让 agent 先产出任务 brief、设计契约和一个代表性 specimen；完整新方向默认要用户审阅后再全量开发，除非明确放弃审阅。预期结果：在写全量代码前，你先看到一个可审阅的 specimen。

3. 做截图审查闭环。前提：Playwright 可用，或允许 capture 脚本安装到用户缓存。Claude Code 可 `/plugin install playwright@claude-plugins-official`，其他可用 `npx @playwright/mcp@latest` 的 MCP server，或让脚本安装：

   ```bash
   node .agents/skills/unparalleled-website/scripts/capture.mjs --install --url ./index.html --out ./shots
   node .agents/skills/unparalleled-website/scripts/capture.mjs --url http://localhost:5173 --out ./shots --round 2 --viewports desktop,phone
   ```

   每轮输出首帧和整页截图及 `report.json`。预期结果：要求 agent 打开每张截图，按严重度/证据/修复/复测记录，修复一批后重拍并做前后对比。

4. 读懂 `report.json` 的定位。它会标记 pill、卡片组、kanban、默认字体、SaaS 配色、emoji、横向溢出、运行时错误、占位文案、减少动态偏好下仍持续动画等模板痕迹。标记需要修复/复测、有证据的误报，或明确用户/品牌要求并做功能/可访问性检查——它不是最终判决。

5. 检查对比度与 token（可选但适合作为验收证据）。前提：准备 `pairs.json` 和 `tokens.json`。预期结果：拿到对比度通过/失败清单和项目特定的 CSS 自定义属性。

   ```bash
   node .agents/skills/unparalleled-website/scripts/check-contrast.mjs --pairs ./pairs.json
   node .agents/skills/unparalleled-website/scripts/generate-tokens.mjs --input ./tokens.json --output ./tokens.css
   ```

   `pairs.json` 是对象数组，每项含 `name`、不透明 sRGB 十六进制 `fg` 和 `bg`、`req`（普通文本 4.5，合格大文本/有意义 UI 图形 3，或有意更高阈值 7）；`tokens.json` 是非空对象，把 CSS 自定义属性名映射到项目特定值。没有默认调色板或字体搭配。

6. （可选）用 Studio 做页面内选取和定向修改。前提：在仓库检出中运行、Studio 正在运行。预期结果：页面里选中的元素和修改指令进入持久请求队列，IDE agent 在同一仓库中通过本地工具读取目标、取请求、读源码、打补丁。

   ```bash
   npm run studio:demo
   npm run studio -- --root /absolute/path/to/site --port 4310
   ```

   ```bash
   npm run studio:agent -- --project /absolute/path/to/site context
   npm run studio:agent -- --project /absolute/path/to/site next --wait 25000
   npm run studio:agent -- --project /absolute/path/to/site inspect --selector '#heading'
   npm run studio:agent -- --project /absolute/path/to/site read --file index.html
   npm run studio:agent -- --project /absolute/path/to/site patch --input /tmp/studio-patch.json
   ```

   补丁要带 `id`、`leaseToken`、`file`、`expectedHash`、`edits`（`search` 必须精确匹配一次，文件哈希必须仍一致）；多文件用 `files`，最多 12 个文件、总计 2 MiB；新建文件用 `create: true`、`expectedHash: null` 和 `content`。所有校验通过才写入，失败会回滚，undo 全有或全无。超过五分钟用 `renew`。

   MCP 可用时：

   ```bash
   claude mcp add unparalleled-studio -- node /path/to/packages/studio-agent-tools/src/mcp.mjs --project /absolute/path/to/site
   ```

   前提是 Studio 正在运行、agent 持续调用 `studio_next`；README 明确说没有东西能唤醒已停止监听的 agent。Vite 项目可加开发适配器：

   ```js
   import { unparalleledStudio } from 'unparalleled/studio/vite';

   export default {
     plugins: [unparalleledStudio()],
     server: { host: '127.0.0.1' }
   };
   ```

   仅本地 HTTP 且 Vite 自己持有 server；不要拿静态服务替代 React/Next/Nuxt 的开发服务器。

7. 技能自身校验（可选，只检查结构）。前提：在仓库检出中。预期结果：知道技能目录结构和本地 Markdown 链接是否完好——它不认证生成网站或 UI。

   ```bash
   npm run validate-all
   ```

8. 保留人工验收。`report.json`、对比度脚本、token 生成都只是证据；README 也承认脚本结果本身不证明设计质量。在低风险内部仪表盘或落地页上，按“brief → 设计契约 → 一个 specimen → 用户审阅 → 实现 → 截图审查”走一遍，只在一个页面/一个组件范围内比较，再决定是否扩大使用。

### 做法 J：让 B 端后台页面先选骨架、再按否定判据和硬门禁生成

用 Ludi-Herry/b-end-design-system-skill。它的思路是把 B 端设计系统、组件规范和交互法则打包成 AI 可执行规则，补“组件库有什么零件”和“页面怎么组装”之间的设计决策约束。材料只有 README，未包含 SKILL.md、.cursorrules、模板和脚本正文，所以下面只能给出 README 明确写出的做法；具体规则文件要你自己打开仓库确认。

1. 先判定页面类型。前提：任务是 B 端企业后台页面。预期结果：从六类骨架里选一个，而不是直接让 agent 堆组件。
   ```text
   查询列表页 / 分步或分组表单页 / 单据或高级详情页 / 指标工作台与看板 / 设置页 / 异常与结果页
   ```
   README 明确这些页面骨架是该 Skill 的主要适用对象。

2. Cursor 用户：把仓库里的 `.cursorrules` 复制到项目根目录，或在 `.cursor/rules/` 下添加指向 `SKILL.md` 的引用。前提：你能访问这些文件；README 只给路径，没有展开 `.cursorrules` 内容。

3. Claude Code / Antigravity / Codex 用户：把 Skill 链接或放置到提示词 / Skill 检索路径下，然后输入：
   ```text
   请严格遵循 b-end-design-system 规范，为我生成一个客户合同管理列表页。
   ```
   前提：该 Skill 已能被对应工具检索到；README 没有给出更细的目录配置命令。

4. 任意大模型用户：直接粘贴 README 给出的通用 Prompt。前提：模型支持较长系统/用户提示词。原文提示词如下：
   ```markdown
   请你扮演一名资深高级 UI/UX 设计专家与前端工程架构师。
   在接下来的页面设计与前端代码生成中，你必须 100% 遵守以下设计系统硬门禁：
   1. 页面骨架：从查询列表、分组表单、高级详情、指标看板六大骨架中精准选型，杜绝组件乱堆；
   2. 浮层选型：查看详情与轻编辑首选侧边抽屉(Drawer)以保留背景上下文；高危删除才使用确认弹窗，且严禁开启点击遮罩静默关闭；
   3. 原子规范：一个操作区最多 1 个 Primary 按钮；Badge 严格坚守 80% 浅底深字黄金法则；数值金额列绝对右对齐；
   4. 视觉质感：使用 0.5px 精细微边框，内外容器遵循同心圆角公式 R_outer = R_inner + Padding，去除所有占位说明废话。
   ```

5. 生成后按仓库给出的检查资产复核：使用 `references/07-design-system-audit-checklist.md` 中的 15 项视觉与交互交付硬门禁，以及 `scripts/audit-design-rules.py` 自动化检查脚本。前提：已取得这些文件；README 未给出脚本运行命令、依赖和输出格式，需要打开脚本确认后再运行。预期结果：拿到硬门禁违规清单，而不是只看页面“像不像后台”。

6. 人工按组件选型七大否定判据自检：
   - 选项少于 5 个优先单选框平铺，选项过多用带搜索下拉；
   - 查看详情首选 Drawer，高危删除才用 ConfirmDialog；
   - 小于 1 秒不展示骨架屏，1—3 秒按钮 Spin，大于 10 秒给百分比和取消出口；
   - 关键报错不要藏在 Tooltip；
   - 原地改状态用 Button，跨路由跳文档用 Link，改动即生效用 Switch，随整表提交用 Checkbox；
   - 高危删除弹窗严禁开启点击遮罩静默关闭；
   - 不要用模态承担所有“查看详情”和轻编辑。

7. 按视觉硬门禁复核：一个独立操作区最多 1 个 Primary 按钮；Badge 使用浅底深字；金额和数值列右对齐；边框使用 0.5px 精细微边框；内外容器圆角满足 `R_outer = R_inner + Padding`；弹窗不要机械垂直居中。注意这些是 README 的特定设计主张，按目标产品规范、设备像素比和可访问性复核后再采用。

8. 用 15 项门禁和返工轮次做验收，不把“看起来更花哨”当改善。预期结果：高危交互错误为 0、硬门禁违规数低于基线、返工轮次不高于基线。若页面只是更花哨但违规数和返工没有下降，就降为 study，不写入常规流程。

9. 把试用后确认有效的条款沉淀进项目自己的规则文件或评审清单，让下一次 B 端页面任务继续受约束。前提：你已经用第 1–8 步跑过基线对照，知道哪些条款适合你的产品；不要直接把 README 的所有主张全量固化。

### 怎么选 A / B / C / D / E / F / G / H / I / J

按交付物分：要的是数据图表，走 A；要的是一个命名组件或有界组合，走 B；要的是架构图/系统图/架构文档维护，走 C；要的是前端界面的设计与实现，走 D；要的是在终端里直接看截图/录屏/前后对比 QA，走 E；要的是在真实 Godot 里可运行的实时特效，或者想把“生成 → 真实渲染验证 → 独立评审 → 证据绑定具体构建”的闭环搬到别的领域，走 F；要的是界面文案层的清理（分隔符统一、删冗余解释文本），走 G；要的是网页页面级的设计、重设计、去 AI 味并防止改版丢功能，走 H；要的是应用型 UI（仪表盘、表格、表单、设置）或公开网站（作品集、落地页、产品故事）的设计与实现，想让 agent 先出 brief/设计契约/代表性 specimen、再做多宽度截图审查和修复账本，走 I；要的是 B 端企业后台页面（查询列表、表单、详情、看板、设置、异常页）的生成与复核，走 J。

A、B、D、E、H、I、J 是请求驱动、在对应事件（生成/审阅图表、收到组件任务、编辑 UI 文件或调用 `/impeccable` 命令、Claude 做完一件事、`/hallmark <prompt>` 或 `/hallmark audit/redesign`、收到 UI/网页设计任务、收到 B 端后台页面任务）时触发，都不是常驻巡检；D 的确定性检测、H 的 `sloplint`、I 的 `capture.mjs`/`report.json` 都能独立于 LLM 跑，适合直接接 CI；H 的 `--before` / `--kept` 是重设计回归快照。C 也是 Agent Skill/MCP 形态，可生成与校验，并可按 README 接入 CI。J 更像规则层：把页面骨架、组件选型否定判据和视觉硬门禁贴进任务，再由人工或脚本复核，不是自动巡检。

D、H、I 有重叠，也有分工：D 用持久事实（`PRODUCT.md` / `DESIGN.md`）+ 61 条确定性规则做持续守门，适合已有前端系统的日常检测；H 用 Floor/Reflex/Finish 三层门禁 + `sloplint` 八宽度渲染 + 冷上下文复审 + before/kept 快照做页面级设计与重设计验收，且明确只覆盖网页设计；I 用设计技能 + 代表性 specimen + Playwright 多宽度截图审查账本 + 可选 Studio 页面内定向修改，覆盖应用型 UI 与公开网站两类。J 是 B 端后台的领域规则层，补页面骨架和组件选型判据；J 可以和 D/H/I 叠，但材料没有给出联动实测，先分别小范围试，不要假设它们能自动合流。

D 和 E 有分工：D 用确定性规则做可自动执行的守门人，E 把视觉验证留在终端、不额外开浏览器；原文没有给出 D 与 E 联动的做法。F 与 A、H、I 最像的是“独立评审”这一环——A 是同一个 skill 里换一个只看到 PNG 的审阅者，F 是另一个 agent、另一个技能，H 是 fresh-context 子代理做终审，I 是让 agent 打开每张截图按严重度/证据/修复/复测记录；F 还有“评审未提交就不给 verified”的硬约束。

G 是唯一一条不建议全自动执行的做法：它的规则来自个人经验、带主观性，所以流程里必须有逐条确认和前后截图对照。G 和 D、H、I、J 可以叠（把文案规则写进持久上下文或代码审查清单，用 D 的 detect、H 的 sloplint、I 的截图审查或 J 的 B 端规则兜底可判定的部分），但材料没有给出联动实测，这一步属于你自己要补的工程拼装。十者都需要你在请求里带足上下文。

## 怎么判断变好了

最小试用：在单个代理上装一次（图表优先 Claude Code，命令最短），用一个已有图表脚本，或一个已有类似实现的组件任务，或一两个真实架构来源，或一个现有前端页面来试；如果符合 macOS + Ghostty/kitty + Claude Code ≥2.1.287，再跑一次 show-your-work 的 examples/pricing；如果你有 Godot 4 游戏项目且机器是 macOS Apple silicon / Windows x64，再跑一次 effekseer-vfx 的 fire 示例；文案做法不需要装任何东西，挑一个真实页面跑一遍第 1–6 步即可；网页设计做法先拿一个已有页面跑 `/hallmark audit <path>` 只出报告，再拿一个新建小页面走完 pre-flight → deal/draw → 单独建 hero 冷读 → `sloplint --render` + 子代理复审，对已有页面做一次 `/hallmark redesign <path>`，前后各跑 `sloplint --before` / `sloplint --kept`；设计改版做法选一个低风险内部仪表盘或一个落地页，装 unparalleled-skillset 的对应技能，按 brief→设计契约→一个 specimen→用户审阅→实现→截图审查走一遍；B 端后台做法选一个已有列表页和一个表单页，先记录不使用该 Skill 的基线输出，再复制 `.cursorrules` 或粘贴通用 Prompt 生成同需求版本。并做基线对照——让同一 agent 在不装技能、不给这两条规则的情况下做同样任务，再比一次。

图表侧可直接观察的指标（都能从一次试用里看到）：

- lint 报出的可判定问题数量和类型：零基线、双 y 轴、文字重叠/裁切、色盲配色、低对比度。这类是代码检查，可复核、不易造假。
- 图像复审能抓出多少“标注数字与数据不符”“来源行靠猜或写成文件名”“图上残留 TODO/confirm”。
- 修正前后，让不看上下文的同事只看 PNG 复述“这张图说明了什么”——标题是否已给出结论、是否还需要图例。
- 三轮复审的实际收敛情况：几轮修完、有没有反复改不好的规则。
- 记录无 Chrome 环境下的降级行为，确认它是否还覆盖你实际用的库。

组件侧：

- 是否复用项目原语；是否引入第二套设计系统或不必要的新库；是否发明路由/链接/目的地。
- 移动端和桌面键盘访问是否通过；响应式问题数量。
- 加载、取消、无效输入、结果恢复等状态覆盖数量。
- 项目测试、lint、类型检查是否通过。
- 人工评审返工轮次和修改量。

架构图侧：

- 从真实来源导入后，生成的 `.drawio` 是否可编辑；节点/关系是否与源一致；漂移 diff 是否标出新增绿、删除红、变更橙。
- `validate.py --score` / `--strict` 是否通过；CI 中架构规则校验是否拦住 Internet 到数据库、环、孤岛、信任边界、对比度等问题。
- 自检修复效果：重叠、标签裁剪、堆叠边是否减少。
- 增量同步是否保留手工布局与注释；删除项是否进入可评审状态。
- PR 视觉 diff 是否让人工审图更快。
- 最小试用方式：按 README 给出的安装与命令，把一两个真实来源（Terraform/K8s 配置、Python 包、SQL DDL、OpenAPI）导入成可编辑 `.drawio`，并把 diff/校验接入一次 PR，验证增量同步与漂移检测是否真能用。

前端 UI 侧：

- 固定基线：同一批文件在装技能前后各跑一次 `npx impeccable detect --json .`，比 primary findings 的数量和类型（例如过度使用的字体、渐变、卡片套卡片、低对比度）。
- 退出码是否能当门禁：无 findings 时 `0`、有 primary findings 时 `2`；如果你在 CI 里多目标扫描，留意 `1` 是“至少一个目标无法扫描”。
- hook 是否真在编辑时触发（Claude Code/Copilot/Codex 编辑后、Grok Build 在 Stop、Cursor 在坏写入落地前），以及一次会话里被动发现的坏味道有多少。
- `critique` / `audit` / `polish` 抓出的层级、清晰度、a11y、性能、响应式问题数量，以及返工轮次。
- `PRODUCT.md` / `DESIGN.md` 是否真的减少了 agent 反复问同样问题、反复换风格的情况。

终端内展示侧（做法 E）：

- 视频是否真的在终端内播放，全程**没有**打开浏览器或播放器（目标：跳出终端次数 = 0）。
- before 是否显示 3 项失败、after 是否显示 5/5 通过，与脚本输出一致。
- 点 “What changed” 里的条目，视频是否跳到对应时间点、被选中的条目是否高亮。
- Compare 视图两段录制是否逐步同步；视频下方的差异行描述与实际差异是否吻合（例：`Annual toggle updates prices · Original ✗ → Updated ✓`）。
- 同一次任务的会话 token 用量与不装插件时相比没有明显上升（对应“几乎不耗 token”的主张）。
- 再上自己的任务：挑一个真实前端 UI 修复，让 Claude 改完并录前后对比，人工看视频判断两类错误——误报（显示通过但实际没修好）和漏报（实际修好但显示失败）。原文没有给准确率数据，所以这一步必须人工兜底；连续 3–5 个任务都没有误判，才值得把“改完自动录一段前后对比 QA”写进常规流程。

实时特效侧（做法 F）：

- `vfx doctor` 的 `modes` 是否显示本机支持的能力；记住 `render: true` 只表示“找到了 Godot”，不代表能构建。
- 官方 fire 示例是否能一次跑通 doctor → setup → init → examples add fire → build → review → showcase，且 `vfx review` 真的渲染出了帧（没帧会在约 90 秒后以 "rendered no frame" 停止）。
- 未提交独立评审时，`effect-verify` 是否如实显示 `verified: false`——这是“证据绑定到具体构建”是否真的生效的关键判据；如果它在你没做独立评审时就显示 verified，这套机制就是假的。
- `vfx-review`（看不到 recipe 的另一个 agent）的评分与你自己看胶片条的结论差多少；同一个特效要返工几轮。
- 复杂手绘贴图是否真的来自图像生成模型，`vfx/texture_prompts.json` 是否记录了提示词。
- 试多久：跑通官方 fire 示例，再用一条自然语言需求（例：带回击的闪电）走一遍完整循环，看它是否在 `effect-verify` 通过前就敢说 “verified”。

界面文案侧（做法 G，指标全部是原文没给、需要你自建的）：

- 可量化：被移除的“·”数量；被删除的解释性文本条数；每个页面的可见文案总字数变化；人工确认清单里被判定为“不该删”的比例——这个比例高说明规则过激，需要收窄。
- 质量对照：改动前后截图并排评审，请 2–3 位未参与改动的人盲选哪版更干净、是否仍能看懂每个字段的含义。
- 回归检查：删除文案后关键操作路径（注册、提交表单、报错状态）是否仍能被理解；错误提示与权限说明是否被误删。如有误删，即为负向信号。
- 流程成本：一轮改动 + 人工确认所花时间，与手动改相比是否真的省时；若人工确认耗时超过手工修改，这条规则只适合当审查清单，不适合自动执行。
- 判定标准：如果“不该删”的比例很低、盲评偏向新版、关键路径无理解障碍，就把这两条固化进项目 agent 指令长期使用；否则只保留“移除中点分隔符”这类低风险规则，弃用“删解释文本”这条主观规则。
- 试多久：原文没给时长。控制在一个 PR 内、只动文案层、挑一个信息密度中等的真实页面跑一遍，就足以判断该不该固化。

网页设计侧（做法 H）：

- 改动前后 sloplint 条目数；`--kept` 缺件数（必须为 0）；八宽度渲染有无布局崩坏；冷读复审列出的问题数；从 prompt 到可发布的耗时与返工轮次。
- Floor 类问题（对比度、焦点、动效、手机布局）在 lint 中归零；重设计后链接/字段/handler/标题一个不少；盲评新旧页面；流程指标返工轮次下降、复审问题数下降。
- 反面信号：为了过 lint 把业务动作牺牲掉（删掉表单、去掉订阅入口），说明门禁被当成了目标而不是底线，需要回到“页面为谁而来做什么”的定义上修，而不是加更多规则。
- 试多久：原文没给时长；按一个已有页面 audit + 一个新建小页面 build + 一次 redesign 快照比对来试，连续几个页面看是否稳定。

UI/网页改版侧（做法 I，指标全部是仓库没给、需要你自建的）：

- 每轮 `report.json` 的 flags 数与类型（pill、卡片组、kanban、默认字体、SaaS 配色、emoji、横向溢出、运行时错误、占位文案、reduced motion 下仍持续动画）。
- 阻塞/重大问题数、从开始到“无 blockers/majors 且实际验收通过”的轮次和耗时。
- 人工返工次数；横向溢出/运行时错误/对比度失败数。
- 用户是否接受 specimen 与最终页面；修复账本里“需要修复/复测/误报/用户要求”的分布。
- 对比度检查的失败数；token 生成是否与项目既有值一致。
- 最小试用：选一个低风险内部仪表盘或一个落地页，安装对应技能，让 agent 按“brief→设计契约→一个 specimen→用户审阅→实现→截图审查”走一遍；只在一个页面/一个组件范围内比较。
- 判定标准：若这些指标相对现有做法没有改善，或 agent 只产出漂亮截图但源码修改不可控，就降级为 study 或停止。保留人工验收，不把脚本通过当成设计质量证明。

B 端后台侧（做法 J，指标需要你自建）：

- 高危违规数：遮罩静默关闭、详情误用模态、操作区出现多个 Primary、金额列未右对齐、Badge 对比不足、小于 1 秒展示骨架屏。
- 15 项硬门禁违规数；若 `scripts/audit-design-rules.py` 可运行，记录 audit 通过率。
- 首次人工评审通过所需返工轮次；达到可交付版本的时间。
- 页面骨架是否选对；是否还在直接堆 Button、Input、Table。
- 最小试用：选一个已有 B 端列表页和一个表单页，固定同一模型、同一需求描述和同一评审人；先记录不使用该 Skill 的基线输出，再复制 `.cursorrules` 或粘贴通用 Prompt 生成同需求版本。
- 判定标准：高危交互错误为 0、硬门禁违规数低于基线、返工轮次不高于基线；若页面只是看起来更花哨但违规数和返工没有下降，降为 study，不写入操作手册。
- 试多久：原文没给时长；按一个列表页 + 一个表单页的一轮基线对照判断。

这些指标是验证方法建议，这些材料都没有给出对应的量化结果。试多久：原文没有给时长，按任务数量定——若干张历史图表、一个边界清晰的组件任务、一两个真实架构来源导入并接入一次 PR、一个现有前端页面的检测基线、一次 show-your-work 的官方 demo 和 3–5 个真实前端修复任务、一次 effekseer-vfx 的 fire 示例和一条真实特效需求、一个真实页面的文案清理 PR、一个已有页面 audit + 一个新建小页面 build + 一次 redesign 快照比对、一个低风险内部仪表盘或一个落地页的 specimen + 截图审查闭环，以及一个 B 端列表页 + 一个表单页的基线对照。

## 常见坑

- 这些材料的兼容性声明和效果描述都来自各自 README、作者自述或一条社交帖子，没有安装实测、没有 issue/失败案例；evident-charts、Bricks、effekseer-vfx 星标分别只有 52、77、32；drawio-skill 同样缺乏第三方验证；show-your-work 只有 36 stars，属早期小项目；界面文案那条只有两条规则和互动数据（304 赞、26 转发、19 回复）；Hallmark 约 3.2 万 stars（当日 +455），但 README 同样没有列出 Floor/Reflex/Finish 的具体条目，也没有前后对比数据、评测结果、误报/漏报率；unparalleled-skillset 只有 36 stars，自述为 first working slice，同样没有客户案例、前后测数据或质量基准；b-end-design-system-skill 只有 35 stars，材料只有 README。先小范围试，不要直接全量采用。
- 没有 headless Chrome 时，非 matplotlib 库的代码级 lint 会直接缺失，只剩规格检查和图像复审——别把降级结果当成完整检查。
- 技能是事件触发（生成/审阅图表、收到组件任务、处理架构图任务、编辑 UI 文件、收到特效需求、`/hallmark <prompt>`、收到 UI/网页设计任务、收到 B 端后台页面任务时加载或运行），不会主动巡检；你不给源数据、PNG、脚本、项目上下文、真实架构来源、游戏项目目录、真实素材或 B 端页面类型，它就没有可查的东西。
- style guide 的覆盖权限只到 `[T]`，别指望用项目风格去关掉柱状图零基线这类 `[E]` 完整性规则。
- 组件任务边界不清（整页、整产品）会跑偏；复杂域组件不要重复造轮子。
- Bricks 明确不声称未在目标项目中实际验证过的性能、可访问性、合规或转化结果。
- drawio-skill 的 draw.io 桌面 CLI ≥ 30 是必需；Linux 无头要 `xvfb`；WSL2 下 CLI 实际是 Windows 桌面 exe，经 `/mnt/c` 访问，README 称 skill 会自动识别。
- Graphviz 只影响布局，其余功能不依赖；但未装 Graphviz 时布局能力会弱一些。
- AI/LLM 品牌 logo 默认走 unpkg CDN，离线要用 `--embed`；logo 是各所有者的商标，仅用于标识。
- drawio-skill 的 CI 规则配置、sync 参数细节在未提供的链接文档里；不要把 README 里的命令名当成完整配置。
- README 列举的平台中未出现 DeepSeek，无法据此判断兼容性；不能想当然认为可用。
- 架构图的增量同步、漂移 diff、时间回放、故障传播模拟等核心卖点多来自作者自述，缺少第三方验证。
- Impeccable 装完必须重载 harness，否则 hook 不会生效；Codex 还要手动打开 `/hooks` 批准项目 hook（改了 `.codex/hooks.json` 可能需再次批准），Grok Build 需要项目目录信任。
- `.gitignore` 不会自动取消跟踪已提交的一次性文件，必须 `git rm --cached <path>`；反过来，`config.json`、`design.json`、`surfaces/*.md`、`critique/*.md` 是要提交的共享产物，别一起 ignore 掉。
- 内联豁免注释的作用域是整个文件（细到一行才用 `impeccable-disable-line` / `impeccable-disable-next-line`）；用 `--no-config` 或 `--no-inline-ignores` 跑出来的结果不能和正常扫描混着比。
- 人类可读的 findings 写 stderr，机器可读才走 stdout；重定向和 CI 解析时别搞混。
- `critique` 是 LLM-only 的主观评审，和 61 条确定性规则不是一回事，别把它当硬门禁。
- Impeccable 的改善效果目前只有作者主张和一个未展开的案例页，缺实测数据。
- show-your-work 适用条件很窄：仅 macOS；仅 Ghostty 和 kitty；iTerm2、macOS Terminal、VS Code 终端不行；tmux 内“还不可靠”，可尝试在 tmux 配置里开 `set -g allow-passthrough on`；Linux 和 Windows 尚不支持。
- show-your-work 默认每天从 GitHub 拉新版本并覆盖安装，接受“始终跟最新代码”就等于接受供应链风险，可关掉自动更新或锁定版本。
- show-your-work 的匿名遥测虽明确不上传文件名/路径/URL/内容，但仍会上报会话、展示类型和按钮使用情况，可用环境变量关闭。
- “几乎不消耗 token”“Claude 自动开始展示”“两段录制逐帧同步”“点击改动跳到视频对应时刻”都是作者主张，机制解释说得通，但没有量化数据支撑。
- 视频参数上限：12 帧/秒、960 px 宽、最多 900 帧；QA summary 最多三行。
- 原文没有给 show-your-work 的准确率数据，必须人工兜底看误报和漏报。
- effekseer-vfx 的构建平台很窄：只在 macOS Apple silicon 与 Windows x64 验证过；Windows ARM64 虽会装上匹配的 .NET 运行时但**未验证**；**Linux 只能跑 authoring，build 路径未验证**。
- macOS 自带 Python 3.9 太旧，authoring 需要 Python 3.11+ 或 uv；`doctor` 报告两者都没有时先让用户装一个。
- **Godot 4 从不由 setup 代装**；不在 PATH 上要设置 `GODOT`；`doctor` 里的 `render: true` 只表示找到了 Godot。
- setup 约 250 MB、首次 `vfx init` 还会下约 34 MB 官方插件，下载前先征求用户同意；非 macOS ARM64 / Windows x64 平台要用 `--authoring-only`。
- 沙箱内的 agent（如 Codex 工作区沙箱）打不开 Godot 窗口，`vfx review`/`preview`/`showcase` 需用户批准后在沙箱外跑，或把确切命令交给用户在桌面终端执行。
- Windows 上命令形式不同：cmd/PowerShell 里 `vfx` 用 `<skill>\scripts\vfx.cmd`，setup 用 `setup.ps1`。
- 手动安装只拷 `skills/effekseer-vfx` 和 `skills/vfx-review` 两个目录，别拷别的东西（`effekseer-vfx` 自带 `LICENSE` 与 `THIRD_PARTY_NOTICES.md`）。
- 在独立评审提交且 `vfx overview` 重跑之前，即使特效渲染正确，`effect-verify` 也一直是 `verified: false`；此时 agent 只能说 "builds and renders"，说 "verified" 就是越界。
- 复杂手绘贴图（烟、斩击弧线、火、裂纹、冰、符号）必须来自图像生成模型，不要接受技能“用代码伪造”这些形状；数学形状才是程序化生成。
- 32 stars 的早期小项目；13 个完成态示例和 3 个 before/after 案例属于仓库自证，没有第三方验证和量化数据。
- 文案两条规则只是原帖 10 条中的 2 条完整规则，第 3 条截断在“review”，其余缺失；不要凭标题推测或替作者补写。
- 作者自己声明“其中一些可能带有个人经验”，即规则来自个人偏好，不是设计规范或可复现实验；互动量只说明传播度，不说明有效性。
- “中点分隔符不能用”“解释性描述都是冗余”是强主张、弱论证：英文界面、数据表格、面包屑、元信息行里分隔符常承担结构作用，直接删可能损害可读性。
- 不适合无人工复核的全自动批量改写，尤其文案涉及合规、错误提示、表单说明的界面；错误提示与权限说明被误删就是负向信号。
- 原文只说“移除”，没给替代方案；不先定替代约定（空格、竖线、换行、拆成两个字段），团队里会各改各的。
- 先只检索再改：跳过“列清单 + 人工确认”直接让 agent 删文案，是最容易造成误删的一步。
- Hallmark 仅网页/前端设计；不要把它当通用验收规范。README 只给 Floor/Reflex/Finish 的分类名和例子，没有具体条目，不能直接照搬。
- Hallmark 的浏览器检查依赖 Chrome + puppeteer-core；缺了只剩静态检查，别把静态结果当成完整检查。
- Hallmark 的 755 张照片需逐张署名；不要用 Unsplash/Pexels/Pixabay（其条款禁止 AI 工具选图）。
- 主题只是材质，不是方案；一次构建只读一个主题文件（≤8KB）；同一主题两次 prompt 出两个不同页面，别把主题当完整设计系统。
- `audit` 只报告不改；`redesign` 不点名就不动手；`keep the layout` 是换皮，`polish` 只去 AI 味。
- `--before` / `--kept` 丢一件就失败；需要页面可访问。为了过 lint 牺牲表单/订阅入口等业务动作是反面信号。
- 三层裁定要照做：Floor 硬阻断、Reflex 可破例但要记录、Finish 不阻断；别把所有检查都变成阻断。
- unparalleled-skillset 自述为 first working slice，36 stars，没有客户案例、前后测数据、质量基准；README 同时把 MCP transport 列为未实现项，与上文 MCP 用法存在文档不一致，实际可用性需核验。
- 截图 capture 是独立渲染，不保证等于用户当前标签页；运行时源码映射只是线索；Vite 适配器有本地 HTTP 限制；浏览器扩展是开发版；npm 发布前要从 GitHub 安装。
- Studio 是“agent 持续轮询”的半主动，不是无人值守自动推进；没有东西能唤醒已停止监听的 agent。
- 补丁的 `search` 必须精确匹配一次、文件哈希必须仍一致；多文件最多 12 个文件、总计 2 MiB；超过五分钟要 `renew`；undo 全有或全无。
- 设计禁令（禁卡片网格、kanban、药丸控件、通用 SaaS 配色等）是作者主张，适合作为约束试点，不是普遍真理。
- `npm run validate-all` 只检查结构和本地 Markdown 链接，不认证生成网站或 UI。
- 不要拿静态服务替代 React/Next/Nuxt 的开发服务器；Vite 适配器仅本地 HTTP 且 Vite 自己持有 server。
- `report.json` 的标记不是最终判决：需要修复/复测，有证据的误报，或明确用户/品牌要求，并做功能/可访问性检查。
- b-end-design-system-skill 的材料只有 README，未包含 `SKILL.md`、`.cursorrules`、模板和 `scripts/audit-design-rules.py` 正文；不能把 README 当成完整规范。
- 35 stars、无案例、无基准、无前后对比；“100% 严格执行”“十余年经验”是作者主张，不能当已验证结论。
- 0.5px 边框、弹窗垂直固定于视口 38.2% 黄金分割位、选项少于 5 个强制单选框是特定设计主张，需结合目标产品规范、设备像素比和可访问性要求复核。
- 15 项检查清单和审计脚本只有路径；README 没给运行命令、依赖和输出格式，先打开脚本确认，跑不起来就只做人工复核。
- B 端做法不适用于 C 端营销页；即使用于后台，也要先选对页面骨架，不能拿六类骨架硬套所有页面。
- 不要把“看起来更花哨”当改善；看高危交互错误、硬门禁违规数和返工轮次。

## 证据与来源

**图表做法：**

- 依据 rhiever/evident-charts 的 README。可操作材料是安装与更新命令、自动检查清单、规则证据分级 `[E]/[P]/[T]`、`references/sources.md` 的引用机制、支持的库与尺寸列表。
- 唯一具体案例是 `examples/hero.png` 的前后对比图：左侧是典型草稿（对数轴上的原始计数、把 EU 总量与自身成员国一起排名、无意义彩虹色），右侧是经批判重建后的同一份数据（按国家的纯电新车份额）。
- 没有量化改善数据：“三轮图像复审能修好问题”“lint 能覆盖这些缺陷”都是作者主张；“编码代理出的图普遍带这些特征”是作者归纳；“Works in Claude Code, Codex, Cursor, and more”来自 README 自述。

**组件做法：**

- 依据 kostja94/bricks 的 README。可操作材料是安装命令、完整示例提示词、六步工作流、仓库结构（`catalog/components.json`、references、`quality-gates.md`、`workflow.md`、确定性校验脚本 `scripts/validate.mjs`、`npm test`）、MIT 许可、77 stars。
- 失败模式举例（Footer 可能发明路由、FAQ 可能对辅助技术隐藏答案、Task Input 可能遗漏加载/取消/无效输入/结果恢复、Agent Workspace 可能缺少对话/工具/工件/用户控制边界）是作者举例，没有量化数据、对照实验或实际项目结果。
- 未给出使用前后的成功率、返工次数、时间节省、可访问性/性能/转化验证结果。

**架构图做法：**

- 依据 Agents365-ai/drawio-skill 的 README。可操作材料是安装与命令、CLI 调用、自然语言提示词样例、从真实来源导入的命令、`shapesearch.py`、`aiicons.py`、自定义样式预设、CI 命令名（`diagramctl doctor/build/sync/views/query/test/review/whatif/story/publish/transform`、`validate.py --score` / `--strict`、`prdiff.py`、官方 GitHub Action）、`raster2drawio.py`、Mermaid→.drawio、支持 6+ 平台。
- 原文给出的具体数据：draw.io 桌面 CLI ≥ 30 才支持 Mermaid→.drawio 转换与 ELK `--layout`；覆盖 321 个 logo（源：lobe-icons，MIT）+ 18 个数据存储品牌（源：simple-icons，CC0）；内置 5 个预设：`default`、`corporate`、`handdrawn`、`colorblind-safe`、`dark`；自检最多 2 轮、用户反馈最多 5 轮；Mermaid 支持 28 种标准类型（含 mindmap、gantt、timeline、journey、pie、sankey、kanban）。
- 作者主张：增量同步不丢弃手工布局、双状态漂移 diff、git 历史时间回放、交互式 HTML 浏览、故障传播模拟、依赖查询、多视图投影、Diagram-as-Test；README 称在 CI 中可 regenerate + validate（`--strict` gate）+ headless 渲染。
- 未提供：CI 规则配置、sync 参数细节在未提供的链接文档里；核心卖点多来自作者自述，缺乏第三方验证；未给出使用前后的成功率、返工次数、时间节省等量化结果。

**前端 UI 做法：**

- 依据 pbakaus/impeccable 的调研材料（作者 Paul Bakaus，Apache 2.0）。可操作材料是 `npx impeccable install` / `update` / `link`、`/impeccable init` 及命令表、`npx impeccable detect` 的若干调用形式与退出码语义、`.impeccable/config.json` 的 `detector` 键与 `ignores` 命令、内联豁免注释、`.gitignore` 片段与必须保留跟踪的产物清单、`buildPath` 配置、Git submodule 安装命令、hook 在各 harness 上的行为差异、`PRODUCT.md` / `DESIGN.md` 的分工。
- 材料给出的具体数字：24 条命令、61 条确定性检测规则；退出码 `0`/`2`/`1` 的语义；覆盖的 harness 包括 Claude Code、Cursor、Codex、GitHub Copilot、Grok Build。
- 作者主张：“所有模型都在同一套 SaaS 模板上训练，不加指导就产出同样的坏味道”、检测规则不需要 LLM 和 API key、hook 能在编辑时把检测结果送回 agent 流程、方法论可迁移到任何需要稳定产出的任务——这些都是作者自述。
- 未提供：没有任何使用前后的成功率、返工次数、时间节省等量化结果；反模式清单在给定材料里被截断（止于“不用过度使用的字体（Arial、Inter、系统”）；改善效果目前只有一个未展开的案例页。

**终端内展示做法：**

- 依据 iamumeransari/claude-show-your-work 的 README。可操作材料是安装与更新命令、环境变量、`examples/pricing` 目录 + 两条可直接执行的命令（before 3 项失败、after 5 项全过）+ 一句提示词、`show_video` 参数结构、`/img`、`/reload-plugins`、`claude plugin validate .` 和 `claude plugin test .`。
- 可当作参数事实的：视频 12 帧/秒、960 px 宽、最多 900 帧；QA summary 最多三行；`show_image` / `show_video` 两个工具的用途划分；前后对比所需字段。
- 只是作者主张的：“几乎不消耗 token”“Claude 自动开始展示”“两段录制逐帧同步”“点击改动跳到视频对应时刻”。机制解释（Claude 不看图、只传文件路径）在逻辑上说得通，但没有量化数据支撑。
- 适用条件很窄：仅 macOS；仅 Ghostty 和 kitty；tmux 内“还不可靠”；Linux 和 Windows 尚不支持。仓库 36 stars，属早期小项目；默认每天从 GitHub 拉新版本并覆盖安装；匿名遥测仍会上报会话、展示类型和按钮使用情况，可关。
- 未提供：没有任何使用前后的成功率、返工次数、时间节省等量化结果；准确率数据缺失，必须人工兜底。

**实时特效做法：**

- 依据 kanaworksai-hue/effekseer-vfx-skill 的 README（32 stars）。可操作材料是安装命令（Claude Code 插件市场、Codex `$skill-installer`、`npx skills add`、手动拷贝两个技能目录）、`doctor`/`setup`/`init`/`examples add`/`build`/`review`/`showcase` 命令序列、Windows 下的 `vfx.cmd` 与 `setup.ps1` 形式、`EFFEKSEER_VFX_HOME`、`vfx/texture_prompts.json`、`Vfx.play` / `Vfx.launch` 的 GDScript 用法、开发者自测的 pytest 跑法、两个技能（`effekseer-vfx` 与 `vfx-review`）的分工。
- 原文给出的具体事实：约 30 个图层原语、13 个完成态特效示例、3 个 before/after 案例、工具链约 250 MB（装到 `~/.cache/effekseer-vfx`）与官方 Godot 插件约 34 MB、build 需 macOS Apple silicon 或 Windows x64、已验证版本组合（Effekseer Core 1.80.7、EffekseerForGodot4 1.80.5.1、Godot 4.7、.NET 9；Windows 11 x64 为 Godot 4.7.2）、评审无帧时约 90 秒停止、authoring 需 Python 3.11+ 或 uv。
- 仓库自证与作者主张：防篡改证据绑定到“那次确切构建”、由另一个 agent 做独立评审（作者不给自己打分）、`effect-verify` 在独立评审提交前显示 `verified: false`、静态 linter 与保存/打开回读校验、Godot Lab 与带像素标记的胶片条截帧——这些都来自本仓库自述，没有第三方验证。
- 未提供：没有使用前后的成功率、返工次数、时间节省等量化结果；Windows ARM64 与 Linux 的 build 路径明确标注未验证。

**界面文案做法：**

- 依据 @ZaynHao 的一条 X 帖子。可操作材料只有两条完整规则——不要使用中点“·”作为文案分隔符（有就移除）、不要在界面添加冗余的解释性描述文本——以及第 3 条截断在“review”的残句。原帖自称分享 10 条提示词，并自我说明“其中一些可能带有个人经验”。
- 帖子给出的互动数据是 304 赞、26 转发、19 回复。这只能说明传播度，不能说明有效性；原文没有任何前后对比图、案例、改版数据或用户测试结果。
- 文中“只修改 src/pages/xxx 下的文件，不要动逻辑与样式变量”是材料里试用时追加的工程约束；盲评 2–3 人、“不该删比例”、关键路径回归、确认耗时对比等指标是使用方自建的验证方法，都不是原帖内容。
- 作者主张（弱论证）：中点分隔符不该用、解释性描述都是冗余。这两条在中文界面里有道理（“作者 · 时间”这类排版常见），但并非普适。
- 未提供：任何量化改善结果；剩下 7 条规则内容未知，无法评估。

**网页设计做法：**

- 依据 Nutlope/hallmark 的 README（Together AI 的设计技能）。可操作材料是安装命令（`npx skills add nutlope/hallmark -g`、`--agent` 选择、Claude Code 插件市场）、`/hallmark <prompt>` / `$hallmark <prompt>` 触发、`scripts/theme.mjs deal`、`draw`、`sloplint.mjs <file-or-dir> --render`、`/hallmark redesign` / `audit`、`sloplint --before` / `--kept`、`install-hook.mjs`。
- 原文给出的具体数据：48 个主题（每个一文件、≤8KB、旁附成品图）、755 张 Wikimedia Commons 开放授权照片、八种宽度渲染检查、三层门禁（Floor 永不放行、Reflex 可破例但要记录、Finish 不阻断）、Node 18+、`--render`/截图需 `npm i -g puppeteer-core` + Chrome、MIT 许可、仓库约 3.2 万 stars（当日 +455）。
- 作者主张：“主题能避免 AI 味”“冷读评审更严”“Floor 拦得住”；README 没有任何前后对比数据、评测结果、误报/漏报率，也没有列出 Floor / Reflex / Finish 的具体条目内容（只有分类名和例子），所以不能直接把它的验收规范照搬到别的领域。
- 适用条件：仅限网页/前端设计；浏览器检查依赖 Chrome 环境；照片使用需按每张的 CC0 / 公有领域 / CC BY / CC BY-SA 逐张署名；主题是一次构建读一个文件，不等于完整设计系统。

**设计改版做法：**

- 依据 Phantom-Con-Artist/unparalleled-skillset 的 README。可操作材料是安装 CLI（setup/doctor/install all/install website/install ui/install all --global/agents/--dry-run/hook --write）、两个技能的分工、capture.mjs 的多宽度截图与 report.json、check-contrast.mjs 与 generate-tokens.mjs 的输入格式、Studio 的启动与 agent 工具命令、补丁的 lease/hash/undo 机制、MCP 用法、Vite 适配器、`npm run validate-all`。
- 原文给出的具体事实：Node.js 20+；12 个受支持助手（Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI、Antigravity、Windsurf、Devin、OpenCode、Cline、Roo Code、Kiro）；多文件补丁最多 12 个文件、总计 2 MiB；lease 超过五分钟用 renew；36 stars；仓库自述为 first working slice。
- 只是作者主张的：设计禁令（禁卡片网格、kanban、药丸控件、通用 SaaS 配色等）、“截图审查能抓住模板痕迹”、“对比度检查适合作为验收证据”；README 也承认脚本结果本身不证明设计质量。
- 未提供：没有客户案例、前后测数据、质量基准；MCP transport 被 README 列为未实现项，与文中 MCP 用法文档不一致；截图 capture 是独立渲染，不保证等于用户当前标签页；运行时源码映射只是线索；Vite 适配器有本地 HTTP 限制；浏览器扩展是开发版。
- 适用条件：低风险 UI/网页改版试点；需要源码可读写、可运行页面、Playwright/浏览器；Studio 需要本地 server/agent 工具或 MCP，且是 agent 持续轮询，不是无人值守自动推进。

**B 端后台做法：**

- 依据 Ludi-Herry/b-end-design-system-skill 的 README。可操作材料是六类 B 端页面骨架（查询列表、分步/分组表单、单据/高级详情、指标工作台与看板、设置页、异常与结果页）、组件选型七大否定判据、视觉硬门禁、Cursor 的 `.cursorrules` 路径、Claude Code/Antigravity/Codex 的 Skill 检索路径、任意大模型的通用 Prompt、`references/07-design-system-audit-checklist.md` 的 15 项检查、`scripts/audit-design-rules.py` 与 `components.manifest.json` 的路径。
- 原文给出的具体数据：35 stars；15 项视觉与交互交付硬门禁；六大页面骨架；七大否定判据；0.5px 微边框、Badge 80% 浅底深字、金额列右对齐、同心圆角公式 `R_outer = R_inner + Padding`、弹窗不机械垂直居中。
- 只是作者主张的：“100% 严格执行”“十余年经验”、0.5px 边框、弹窗垂直固定于视口 38.2% 黄金分割位、选项少于 5 个强制单选框等；材料没有给出 SKILL.md、.cursorrules、模板和审计脚本正文，也没有案例、基准测试、前后对比或量化效果数据。
- 未提供：脚本运行命令、依赖、输出格式；规则在不同设备像素比和可访问性要求下是否成立；B 端规则与 D/H/I 的联动实测。
- 结论：只能作为小范围试验候选，不宜直接 adopt；最小试用是一个已有 B 端列表页加一个表单页，固定同一模型、同一需求、同一评审人，先记基线，再看高危违规数、15 项硬门禁违规数和返工轮次是否下降。

## 依据的调研

- [rhiever/evident-charts](../research/radar/2026-10-01/21-rhiever-evident-charts.md)：值得一试，按 README 给出的安装命令在 Claude Code（或 Cursor/Codex/Gemini CLI）里装上 evident-charts，然后照常提图表需求、让它在出图前自查，是最小可试的用法；理由是它把“数据核对 + 代码级 lint + 渲染图复审”做成了自动加载的 Agent Skill，步骤和检查项都写得很具体，但改善幅度只有作者自述和一张对比图，需要自己跑一遍验证。
- [kostja94/bricks](../research/radar/2026-10-01/35-kostja94-bricks.md)：值得一试，建议按 README 的安装命令引入 component-builder，并在一个有明确边界的组件任务上小范围试用；它把组件责任、上下文、变体、状态和验证要求前置为契约，能约束 agent 少写脱离项目的 UI 代码，但目前只有作者主张和流程说明，缺少效果数据，不宜直接全量采用。
- [Agents365-ai/drawio-skill](../research/radar/2026-10-02/795-agents365-ai-drawio-skill.md)：值得一试，建议先在小范围试：按 README 给出的安装与命令，把一两个真实来源（Terraform/K8s 配置、Python 包、SQL DDL、OpenAPI）导入成可编辑 .drawio，并把 diff/校验接入一次 PR，验证增量同步与漂移检测是否真能用。理由：README 提供了可直接照做的安装命令、CLI 调用和提示词样例，但关键的 CI 规则配置、sync 参数细节都在未提供的链接文档里，且核心卖点多为作者自述，缺乏第三方验证。
- [pbakaus/impeccable](../research/radar/2026-10-02/666-pbakaus-impeccable.md)：值得一试，建议先在前端项目上小范围试：按 `npx impeccable install` + `/impeccable init` 把持久产品事实（PRODUCT.md）和视觉系统（DESIGN.md）固定下来，再用 `npx impeccable detect --json` 建立可量化的基线并把检测接进 hook/CI 当验收门槛；它把“给智能体供给上下文+约束+自动反馈”写成了可照抄的步骤，但改善效果目前只有作者主张和一个未展开的案例页，缺实测数据。
- [iamumeransari/claude-show-your-work](../research/radar/2026-10-11/2567-iamumeransari-claude-show-your-work.md)：值得一试，在 macOS + Ghostty/kitty 的 Claude Code 终端工作流里小范围试装这个插件，先跑官方 examples/pricing 的 before/after 录制、确认 QA 视频、勾选清单和对比视图都能在终端内正常呈现，再把「Claude 改完前端 UI 后录一段前后对比 QA」纳入日常；理由是原文给出了可复制的安装命令、demo 脚本和前后对比的参数结构，能把视觉验证留在终端、不额外开浏览器，但目前只支持 macOS 与两种终端、项目仅 36 stars，属早期工具，不宜直接全量采用。
- [kanaworksai-hue/effekseer-vfx-skill](../research/radar/2026-10-12/2652-kanaworksai-hue-effekseer-vfx-skill.md)：值得一试，若团队做 Godot + Effekseer 实时特效，可按 README 给出的安装与 vfx doctor/setup/init/build/review 命令小范围试装；它的核心可迁移之处是把「生成 → 真实渲染验证 → 独立评审 → 证据绑定到具体构建」做成可复用闭环，即使不做特效也值得把这套结构搬到别的领域。
- [@ZaynHao: 分享 10 条优化界面 UI 的提示词，其中一些可能带有个人经验，发送给你的 Codex 或 Claude Code，立即提升 UI 视觉设计：](../research/radar/2026-10-23/6263-10-ui-codex-claude-code-ui.md)：值得一试，把这两条完整提示词（去掉“·”分隔符、删掉冗余解释文案）当作 UI 审查清单加入 Codex/Claude Code 的日常改界面流程，先在一个页面上小范围试；因为它们只是可直接复制使用的文案约束规则，具体且成本低，但原帖的 10 条只抓取到 2 条完整、第 3 条被截断，也没有任何效果数据。
- [Nutlope/hallmark](../research/radar/2026-10-25/6887-nutlope-hallmark.md)：值得一试，先挑一两个前端页面装上 Hallmark 跑完整流程，重点抄它的结构——三层门禁 + 可判定的自动 lint + 冷上下文终审 + 改动前后快照比对——而不只是用它换主题。它把“验收标准”写成了智能体能执行的文件与脚本，命令、流程、层级都是照做得了的；但原文只有 README，门禁的具体条目和任何效果数据都没给出，且只覆盖网页设计，所以先小范围试。
- [Phantom-Con-Artist/unparalleled-skillset](../research/radar/2026-10-28/7746-phantom-con-artist-unparalleled-skillset.md)：值得一试，建议在低风险的 UI/网页改版中试点：安装对应 agent 技能，按截图审查闭环执行并保留人工验收；它给出了可复制的安装、Studio 请求队列和 Playwright 多宽度审查步骤，但仓库自述为 first working slice 且缺少效果数据，不宜直接全面采用。
- [Ludi-Herry/b-end-design-system-skill](../research/radar/2026-10-28/7818-ludi-herry-b-end-design-system-skill.md)：值得一试，建议小范围试：把该仓库当作 B 端页面生成的领域规则层，在 Cursor、Claude Code 或通用模型中用其提示词和检查清单约束输出，再用 15 项门禁和返工轮次验证；理由是 README 给出了可复制的提示词、页面骨架与否定判据，但未提供完整规则文件内容和效果数据，暂不宜直接 adopt。
