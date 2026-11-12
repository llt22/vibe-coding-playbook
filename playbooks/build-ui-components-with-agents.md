# 让编码 agent 在交付前把边界状态和渲染结果拿出证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 常把 demo 条件下能跑当成完成；本手册给出可落地的检查、门禁和前后证据，让边界状态、像素缺陷和还原度在交付前暴露。
> 先试这一步：在干净分支上选一个已知缺边界状态的页面，用做法 R 的提示词只跑 1–3 个组件，人工审 diff 并跑构建与测试。
> 最近修订：2026-11-12

## 解决什么问题

编码 agent 交出来的东西常常“看着完成了”：图表用了没说清的对数轴、把 EU 总量和成员国排在一起、来源行靠猜或直接写文件名、图上还留着 TODO；组件会发明路由、引入第二套设计系统、漏掉加载/取消/无效输入/结果恢复这类状态；架构图会脱离真实系统、与部署漂移、无法增量维护，或者从仓库/文章生成后布局重叠、文字溢出、连线穿过方框、标签被遮挡；前端界面容易落入模型默认套路——Inter 字体、紫到蓝渐变、卡片套卡片、彩色背景上的灰字、每个标题上方一个圆角方块图标，或者所有块视觉权重相同、用文字解释图、重复动作、把渐变/玻璃/发光当装饰，每个元素说不出用户能感知的存在理由；界面文案里塞满中点“·”和重复标题含义的解释性描述；游戏实时特效“代码编译通过、linter 通过”，但没有任何人在真实引擎里看过它长什么样；网页页面容易落入模型默认套路——每个标题上方的 eyebrow、字距拉开的大写标签、标题里一个彩色词、整页空框或全是照片、hero 撑不满一屏、每页结尾都塞订阅框、表单点“谢谢”却没真提交；B 端后台页面则直接把组件堆上去——不先选页面骨架、一个操作区出现多个 Primary 按钮、金额列没有右对齐、查看详情误用模态而不是抽屉、高危删除弹窗点遮罩就静默关闭、加载不足 1 秒也弹骨架屏、关键报错藏在 Tooltip 里、内外容器圆角不满足同心公式。照着参考图或录屏重建 UI 时，agent 还会“瞄一眼截图，写点看着像的东西，然后说做完了”，字号差 8px、错峰动画不对、缓动写成 linear，却说不出差多少。

更底下还有一层：这些产物都是“渲染出来才成立”的东西，而渲染结果往往没人看。TypeScript、ESLint、单元测试、axe、Lighthouse 都只能证明代码合法，证明不了像素——文字溢出卡片或被 `overflow:hidden` 截断、灰底灰字对比度不足、图表标签重叠、只在 1024px 才坏的布局、`$undefined`/`NaN%`/`Invalid Date` 占位文本、emoji 当图标、图片变形、下拉箭头压在边框上、复选框离标签太远、缺焦点环、tap target 太小、`href="#"` 死链、hydration 报错、404、被登录页挡住的页面。改完前端 UI 或特效后，你往往还要自己开浏览器、起 localhost、开 Godot 窗口、手动点一遍才能确认。更麻烦的是，改完 UI 后你手上没有一份可重复的前后对比：不知道哪些错误被修掉了、哪些是新增加的、哪些因为条件变了仍然没被验证。

这份手册给十八条可落地的做法，把“检查”和“展示”从你手里挪到 agent 交付之前：图表过三道检查、组件写代码前先签契约、架构图从真实来源生成并在合并前校验（drawio-skill）或从仓库/文章生成并做布局自检（arch-diagram-skill）、前端 UI 先固定持久事实再用确定性规则当门禁、让 Claude Code 在终端里直接展示截图/录屏/前后对比 QA、让游戏特效在真实 Godot 视口里渲染成胶片条再交给另一个 agent 独立评审、把两条界面文案规则变成“先检索列清单 → 人工确认 → 再改 → 前后截图对照”的流程、用 Hallmark 的三层门禁 + sloplint + 冷上下文复审 + before/kept 快照验收网页设计与重设计、用 unparalleled-skillset 的设计技能 + 代表性 specimen + Playwright 多宽度截图审查闭环验收 UI/网页改版、用 b-end-design-system-skill 的 B 端页面骨架和硬门禁约束后台页面生成、用 visant-killer 的 killer-scan 把界面 AI 味审计拆成脚本硬门禁 + 模型判断、用 renderlint 在无头 Chromium 里按手机/平板/桌面多视口真实渲染页面并用 37 条确定性规则抓像素级缺陷、用 replica 把“照着参考重建 UI”变成 layout/style/pixels/motion 四轴可复现分数与按收益排序的修复清单、用 flawless-ui-ux 的技能 + context/inspect/verify 给 UI/UX 修正留下前后对比证据、用 cook 把视觉构建任务压成一条“参考图定标 → 每维门槛 → 零上下文评审 → 每轮对比图 → 人工只把最终渲染关”的长跑循环、用 antislop-ui-ux-skill 的 gosto.md/receitas.md + 先问后做 + 灰度线框 + outside look 给界面去 AI 味，以及用一条提示词系统找 happy-path debt，按组件补齐慢加载、失败、空列表、长文案、窄屏五类状态（做法 R）。

几条骨架值得单独记住：特效那条——生成 → 真实渲染验证 → 独立评审 → 防篡改证据绑定到具体构建——不限于特效，可以直接搬到别的交付物；文案那条是反面补充：规则本身主观，必须留人工确认这一环；Hallmark 补的是网页页面级的“可判定检查 + 冷上下文终审 + 不丢功能”；unparalleled-skillset 补的是“先 specimen 再全量、按轮次重拍截图并记录修复账本”；B 端设计系统补的是后台页面的“先选骨架 → 按否定判据选组件 → 用硬门禁和检查清单复核”；arch-diagram-skill 补的是架构图的另一条路线（仓库/文章 → `<slug>.spec.json` → `check` → 多格式导出），和 drawio-skill 是按交付物选择而不是互相替代；visant 补的是“技能先探测目标仓库已有的 gates、primitives、tokens，再决定动作”；renderlint 补的是最硬的一层——不靠模型看图猜，靠确定性规则在真实浏览器里按像素和几何量，退出码 1 就能同时挂住构建、CI 和 Claude Code 的回合；replica 补的是“有明确参考的 UI 还原”这一窄层——四轴分数、级别门禁、`compare` 退出码和按收益排序的 findings，但它只覆盖 Web，且证据主要来自作者自测；cook 补的是“有参考图的视觉构建可以长时间自己迭代”，但必须用人工估分校准 critic 自评，并给成本设硬上限；flawless-ui-ux 补的是“技能指导 + 可重复检查/验证 CLI”这一层：`context` 收集项目语境，`inspect` 保存修改前基线，`verify` 对比 persistent / new / no-longer-observed，但 CLI 自述不覆盖完整 WCAG、完整键盘旅程、业务正确性和视觉质量；antislop 补的是“项目品味文件 + 先问后做”这一层：先读 `gosto.md`/`receitas.md`，指出 slop 信号，提问并给出灰度线框，之后才实现，最后做 outside look 和 second pass；参考只取概念，不复制调色板/字体/字面布局。做法 R 补的是“边界状态债务”这一层：提示词直接点名五个条件——数据加载快、不失败、列表非空、文案短、屏幕宽——要求代理按组件补齐缺失状态与布局断裂，不改设计、不破坏功能，并按文件汇报 before vs. now。

## 适用与不适用

**适用：**

- 你已经在用支持 Agent Skills 的编码代理，并且任务落在下面这些交付物上。
- 用数据画图：matplotlib、seaborn、pandas `.plot`、ggplot2、Plotly、Vega-Lite/Altair、D3；输出尺寸有博客、X、LinkedIn、Instagram、幻灯片、报告、手机预设。
- 实现一个有明确边界的命名组件或有界组合（Footer、FAQ、Task Input、Agent Workspace 这类容易翻车的类型）。
- 架构图/系统图/架构文档维护：从自然语言、代码、Terraform、Kubernetes、docker-compose、SQL DDL、OpenAPI/AsyncAPI/Protobuf/GraphQL、CI 配置生成可编辑 `.drawio`，或对已有图做增量同步、漂移 diff、规则校验。
- 把 GitHub 仓库、技术文章、PDF 或本地项目转成深色“终端蓝图”风格架构图，或需要导出交互式 HTML、PNG、MP4、GIF、Mermaid。
- 用 AI 代理做前端/UI 的设计与实现：项目涉及前端，你想让 agent 在一个已经写进仓库的视觉系统里干活。
- 在终端里用 Claude Code 做前端/UI、视频/动画类产出或需要视觉回归验证的修复，且你不想每完成一件事就切到浏览器手动 QA。
- 用 Godot + Effekseer 做实时游戏特效，或者你想把“真实渲染验证 + 独立评审 + 证据绑定到具体构建”这套闭环搬到别的领域。
- 清理界面文案：项目有可让 Codex/Claude Code 读写的 UI 代码仓库，能截改动前后的对比图，且有人愿意逐条确认。
- 做网页/前端页面的新建、重设计或 audit：你想让 agent 避开“AI 味”，把设计验收拆成可执行门禁，并在重设计时用 before/kept 快照防止丢链接、字段、handler、标题。
- 用 AI 代理做应用型 UI（仪表盘、表格、表单、设置）或公开网站（作品集、落地页、产品故事）的设计与实现。
- 做 B 端企业后台页面（查询列表、分步/分组表单、单据/高级详情、指标工作台与看板、设置页、异常与结果页）。
- 你想给 Claude Code 装专用技能，用脚本检测器做界面 AI 味、动效参数、文案 AI 腔的硬门禁，再由模型做语义判断；任务落在前端界面审计，尤其 Tailwind/shadcn 栈。
- 你有一个能在浏览器里渲染的前端项目，Node >= 18.17，并且能启动 dev server 或产出静态构建目录；想让“UI 改动后必须 0 error”成为一条机器执行的门禁。
- 你有一个 Web UI 参考（在线站点、本地 HTML、截图或录屏），想在已有代码库里按参考重建单个组件、hero 或菜单开合，并接受 `structure` / `faithful` / `exact` 的分数门禁。
- 你有可对照的参考图/视频，想把代码实现的 3D 世界、影片、发布视频、游戏或 UI 交给 agent 长时间迭代，并且愿意每轮看静帧、用人工估分校准评分、给成本设上限。
- 你想让 agent 按创建、重设计、精修、评审流程做 UI/UX，并用 `context` / `inspect` / `verify` 留下修改前后的检查记录；你的前端项目能启动 dev server，且你接受“CLI 只覆盖可判定的采样问题，不证明完整 WCAG、键盘流程、业务正确性和视觉质量”。
- 用 Claude Code/Codex/OpenCode 做 UI 原型或界面评审，想让 agent 先问清屏幕角色、视觉和优先级，给出灰度线框，再实现，并做 outside look 和 second pass；项目愿意填写 `gosto.md` / `receitas.md`。
- 你有一个能在本地跑起来、工作区干净的界面代码库，想系统性找出“只在 demo 条件下正常”的 happy-path debt，并接受按组件小步推进、每轮人工审 diff（做法 R）。

**不适用：**

- 整产品规划、完整网站定义、纯编辑文案——Bricks 明确不覆盖这些。
- 复杂领域行为组件（编辑器、数据网格、图表组件、日历、可访问性原语）在项目没有现成方案时，应该用成熟库，而不是让 agent 从零写。
- 架构图如果不想安装 draw.io 桌面 CLI，或没有真实来源/反馈循环，drawio-skill 的核心能力会受限；它也不适合替代手绘风、diagrams-as-code、自由画布。
- arch-diagram-skill 不适合需要可编辑 `.drawio`、漂移 diff、CI 规则校验、增量同步的场景，这些优先用 drawio-skill；它的 `check` 只覆盖布局层面的元素重叠、文字溢出、连线穿过方框、标签被遮挡，不证明图的内容结构一定正确。
- 前端 UI 的检测规则是确定性的、只覆盖可判定的坏味道；`/impeccable critique` 这类设计评审是 LLM-only 的主观判断，别把它当门禁。
- show-your-work 只支持 macOS 与 Ghostty/kitty；iTerm2、macOS Terminal、VS Code 内置终端目前画不了这类图片；Linux 和 Windows 尚不支持；tmux 内“还不可靠”。
- 实时特效这条链路的前提很硬：build 只在 macOS Apple silicon 与 Windows x64 已验证；Windows ARM64 会装上匹配的 .NET 运行时但未验证；Linux 只能跑 authoring。沙箱内的 agent 打不开 Godot 窗口。
- 界面文案做法不适合无人工复核的全自动批量改写，尤其不适合文案涉及合规、错误提示、表单说明的界面；也不适合分隔符真的承担结构作用的场景。
- Hallmark 仅覆盖网页/前端设计；README 没有列出 Floor/Reflex/Finish 的具体条目，不能直接把它的验收规范照搬到别的领域。
- unparalleled-skillset 自述为 first working slice，36 stars，没有客户案例、前后测数据或质量基准，不宜直接全量采用；只适合低风险 UI/网页改版试点。
- B 端设计系统做法只面向 B 端企业后台和 React/TS 模板；C 端营销页不要直接套。0.5px 边框、弹窗垂直固定于视口 38.2% 黄金分割位、选项少于 5 个强制单选框等是特定设计主张。
- visant-skills-public 的材料只有 README，检测器规则目录和 `SKILL.md` 正文不可见；跨仓库通用性只由三个 Next.js 项目支撑，非前端/非 Tailwind 栈未验证。
- renderlint 目前未发布到 npm，只能从 GitHub 安装；它检查的是浏览器里渲染出来的像素和几何，不能判断业务语义对不对、交互逻辑合不合理；需要真实登录且无法用 token + mock 绕过的页面接入成本会明显上升。
- replica 仅覆盖 Web UI，不覆盖原生移动端；静图最高 8000px；`<video>` 元素冻结在第一帧，Canvas 与 WebGL 只按像素与动效帧判断；YouTube、Loom 这类流媒体链接抓不到，必须自己录屏；参考站点的字体、图片、图标、文案版权归原主，skill 会要求改用你自己的资产或 placeholder，除非你有授权；8 轮上限内不收敛要如实交代剩余差异。
- cook 不适用于纯文本或没有参考图/视频的工作；目标场景是视觉构建（3D 世界、影片、发布视频、游戏、UI）。README 只到 README 层面，critic 的具体提示词、rubric、intake 问题清单在 `references/` 下未展开；门槛分数由 critic 给出、由人校准，主观性强。成本量级高，小任务必须自己设硬上限。
- flawless-ui-ux 的 CLI 自述不覆盖完整 WCAG 合规、完整键盘旅程、业务流正确或视觉质量；采样不能代替真实设备与浏览器矩阵；检查不编辑文件、不启动服务器、不下载浏览器、不提交表单；缺失的已确认目标和变化过的条件仍属未验证。README 只到 README 层面，没有效果数据、案例研究或基准结果。
- antislop-ui-ux-skill 的材料只有 README，未包含 `SKILL.md`、`estetica-ia.md`、`gosto.md`、`receitas.md` 的实际内容；安装命令写的 `skills/deslop` 与目录树里的 `deslop/` 不一致，执行前先确认仓库实际路径。它只面向 UI/UX 屏幕；没有量化前后对比、用户研究或失败案例；不适合无人工评审的全自动批量改写。
- 做法 R 的原文只是一条推文：一段提示词 + 一句论断，没有前后对比、案例、截图、代码库规模或技术栈说明；“happy-path debt”是作者自造说法，外延由提示词里那五个条件界定；没有说明适用的框架、语言，是否适用于非界面代码也未知。一次性要求“全应用扫描 + 逐个修复 + 汇报”，在较大代码库上很可能超出单轮上下文或做不完。
- 想要现成的量化改善数据：这些材料都没有给出效果数字，只能自己跑基线对照；replica 的 demo 分数是作者自述，不是第三方评测。

## 前置条件

- 通用：支持 Agent Skills 的编码代理，并且你已经在用它。
- 图表做法（A）：本机有项目 Python 环境；matplotlib 走原生 lint 脚本，Plotly、Vega-Lite、ggplot2、D3 通过 headless Chrome 导出 SVG 做代码级检查；有源数据、渲染后的 PNG 或生成脚本。
- 组件做法（B）：项目已有路由、组件、设计令牌、框架、响应式约定、依赖、数据模型和测试，并且 agent 能读到；有真实的产品、资源、公司、法律等目标链接和内容可以复用；任务边界清晰。
- 架构图做法（C）：draw.io 桌面 CLI ≥ 30；Graphviz 可选；Linux 无头环境需 `xvfb`；有真实来源文件或白板照片/截图；抓“实际部署”快照时需要 `terraform show -json`、`docker inspect`、`kubectl get -o json` 的访问权限；默认渲染 AI/LLM 品牌 logo 需要网络访问 unpkg CDN，离线用 `--embed`。
- 架构图做法（K）：Node ≥ 18；Chrome、Chromium 或 Edge；输出视频和 GIF 还需要 `ffmpeg`；有安装权限并重启 Claude Code/Codex；准备源材料（GitHub 仓库 URL、技术文章 URL、PDF 或本地项目）；接受 `<slug>.spec.json` 作为中间产物和修正入口。
- 前端 UI 做法（D）：项目涉及前端/UI；本地有 Node；扫 URL 时用本地已装的 Chrome/Chromium/Edge；想让检测在编辑时自动跑，需要支持 provider 原生 hook 的 harness。
- 终端内展示做法（E）：macOS；终端为 Ghostty 或 kitty；Claude Code v2.1.287 或更新；装 ffmpeg；任务侧需要一份可重复运行的 Playwright 脚本，能产出同一脚本的 before/after 两段录制。
- 实时特效做法（F）：authoring 需要 Python 3.11+ 或 uv；build 需要 macOS Apple silicon 或 Windows x64，首次 setup 约 250 MB 下载到 `~/.cache/effekseer-vfx`；render 还需要 Godot 4（Forward+）和 `ffmpeg`；一个 Godot 4 游戏项目。
- 界面文案做法（G）：一个可让 Codex / Claude Code 读写的 UI 代码仓库；能查看改动前后的界面截图；一个范围很小的试验对象；有人工逐条确认清单的环节。
- 网页设计做法（H）：Node 18+；要跑浏览器检查还需 `npm i -g puppeteer-core` 和已安装 Chrome；项目已有字体、配色、框架、锁定的 `design.md`；开工前一次性提供真实素材；被改页面可访问。
- 设计改版做法（I）：Node.js 20 或更新；一个受支持的编程助手；项目源码可读写、有可运行页面；截图审查需要 Playwright 或允许 capture 脚本安装到用户缓存。
- B 端后台做法（J）：任务是一个 B 端企业后台页面，能明确页面类型；能访问仓库里的 `.cursorrules`、`SKILL.md`、`components.manifest.json`、`references/`、`scripts/audit-design-rules.py`；有一个已有 B 端列表页和一个表单页做基线对照。
- 界面硬门禁做法（L）：只想做界面审计时只需 Node 20+，无需构建步骤；`visant-killer` 的屏幕检查可选 Playwright；有可写的 `~/.claude/skills/`；已 clone 仓库并安装依赖；若接 shadcn 组件库，项目需有 `components.json`。
- 渲染后像素门禁做法（M）：Node >= 18.17；项目能在浏览器里渲染；能启动 dev server 或产出静态构建目录；一个可用的无头 Chromium；需要覆盖登录态时，准备 token 存在哪个 storage key，或登录凭据（`RENDERLINT_USER` / `RENDERLINT_PASSWORD` 环境变量），以及 API mock 的 fixtures。
- UI 还原度做法（O）：Node 20+；有 Playwright 的 Chromium，或退回使用本机已装的 Google Chrome；只有视频/GIF 参考才需要 `ffmpeg`；不需要 API key；一个已有代码库/已有技术栈；参考源（URL、本地 HTML、截图或录屏）、落点文件、级别、触发动作、视口和合法可用的字体/图片/图标/文案。
- 视觉构建长跑做法（N）：Node 18+；`ffmpeg` 在 PATH 上；手上有一组参考图，给了运动参考时还要能逐帧分析；能接受长时间自主运行；能打开仓库 `references/` 下的 intake、critic、rules、ship 文件；小任务要自己设硬上限。
- UI/UX 检查与验证做法（P）：Node 22.12+，在项目目录中运行；一个受支持的宿主（Codex、OpenCode、Antigravity、Kiro、Cursor、Kilo Code、GitHub Copilot CLI、Claude Code、Pi、Grok Build、Devin CLI、DeepSeek Harness）；项目已有可启动的前端页面和入口源码文件；要检查运行中的界面时，需要兼容 Chromium 和 Playwright Chromium；输出目录的父目录必须存在；如果只是评审而不改文件，需要给 agent 明确的“只报告不改文件”约束。
- 界面去 AI 味做法（Q）：已有 Claude Code/Codex/OpenCode 项目；确认项目的技能目录；能填写项目级 `gosto.md` 和 `receitas.md`；有浏览/截图能力（用于参考和 outside look）；愿意保留人工评审。
- 边界状态债务做法（R）：代码库能在本地跑起来；工作区干净；先开分支以便回滚；编码代理（原文点名 Claude Code 或 Codex）已能读写该仓库；原文未要求任何额外配置、插件或文件。

## 操作步骤

### 做法 A：让图表在交付前过三道检查

用 evident-charts。思路是把“数据核对 → 代码级 lint → 只看渲染图的独立复审”做成自动加载的 Agent Skill。

1. 按代理安装。Claude Code：
   ```text
   /plugin marketplace add rhiever/evident-charts
   /plugin install evident-charts@evident-charts
   ```
   Cursor 及其他 Agent Skills 代理：
   ```text
   npx skills add rhiever/evident-charts
   ```
   Codex：
   ```text
   codex plugin marketplace add rhiever/evident-charts
   codex plugin add evident-charts@evident-charts
   ```
   Gemini CLI：
   ```text
   gemini extensions install https://github.com/rhiever/evident-charts --auto-update
   ```
2. 确认依赖：matplotlib 图表需要 matplotlib；其他库通过 headless Chrome 的 SVG 导出检查；没有 Chrome 时只有图表规格检查和图像复审会运行。
3. 照平时方式提图表需求，技能会自动加载：
   ```text
   Chart sales.csv for a LinkedIn post on which regions grew fastest.
   Critique this chart and fix it.        (attach the PNG, the script, or both)
   ```
4. 要审已有图表时，把 PNG、脚本或两者一起附上。预期：拿到按优先级排序、每条都引用某条规则的修改建议。
5. 验收清单：先查数据（总量与部分混在一起、重复行、占位符代码、未完的月份）；按“想说明的结论”选图形形式；把结论写成标题，并引用真实发布方而不是文件名；在代码里 lint 图表（文字重叠或被裁切、数据上的标签、不从零开始的柱、双 y 轴、色盲难辨的颜色、对比度过低）；用一个只看得到 PNG 的“新审阅者”复审渲染图，最多三轮；对任何图表做批判并按优先级排序。
6. 项目风格指南可覆盖 house look 和 `[T]` 规则，但永远不能覆盖 `[E]` 类完整性规则（例如柱状图必须从零开始）。

### 做法 B：让组件在写代码前先签契约

用 Bricks 的 component-builder。它把组件责任、上下文、变体、内容、交互状态、技术边界和验证要求前置成契约。

1. 安装：
   ```bash
   npx skills add kostja94/bricks --skill component-builder
   ```
2. 给一个有界组件任务，并把项目上下文和验证要求写进请求：
   ```text
   Use component-builder to build the footer for this bilingual SaaS site.

   Read the existing routes, components, design tokens, framework, and responsive conventions first. Reuse project primitives, include the real product, resource, company, and legal destinations, and verify keyboard access on mobile and desktop.
   ```
3. 要求 agent 按六步流程执行：检查页面、邻近组件、令牌、依赖、数据模型、响应式约定和测试；识别组件的规范概念、用户任务、界面和归属边界；只加载匹配的组件参考和共享质量门；从真实内容和上下文选择变体；复用项目原语并实现所需状态和交互；在真实页面中验证组件。
4. 对复杂领域行为组件（编辑器、数据网格、图表、日历、可访问性原语），如果项目没有现成方案，要求 agent 使用成熟库。
5. 检查输出边界：不替换项目约定，不引入第二套设计系统，不发明路由/链接/目的地；FAQ 这类要暴露答案给辅助技术；Task Input 这类要实现加载、取消、无效输入、结果恢复等状态。
6. 验证：目标项目按项目已有的测试、lint、类型检查和真实页面交互来验。只有开发或修改 Bricks 仓库本身时才运行 `npm test`。

### 做法 C：让架构图从真实来源生成，并在合并前校验

用 Agents365-ai/drawio-skill。LLM 负责理解意图与规划，确定性脚本负责布局与结构。

1. 安装 draw.io 桌面 CLI ≥ 30。macOS：
   ```bash
   brew install --cask drawio
   ```
   Windows 从 jgraph/drawio-desktop releases 下载；Linux 取 `.deb`/`.rpm`，无头环境需 `sudo apt install xvfb`。验证：
   ```bash
   drawio --version
   ```
2. 安装 skill：
   ```bash
   npx skills add Agents365-ai/drawio-skill -g
   ```
3. 用自然语言出图。示例：
   ```text
   Create a microservices e-commerce architecture with Mobile/Web/Admin clients,
   API Gateway (auth + rate limiting + routing), Auth/User/Order/Product/Payment
   services, Kafka message queue, Notification service, and User DB / Order DB /
   Product DB / Redis Cache / Stripe API
   ```
4. 从真实来源导入：
   ```bash
   python3 scripts/tfimports.py ./infra -o graph.json
   python3 scripts/autolayout.py graph.json -o architecture.drawio
   python3 scripts/drawiodiff.py v1.drawio v2.drawio -o drift.json
   python3 scripts/drawiohtml.py architecture.drawio -o architecture.html
   ```
5. 解析官方图标：
   ```bash
   python3 scripts/shapesearch.py "aws lambda" --limit 5
   ```
   AI/LLM 品牌 logo：
   ```bash
   python3 scripts/aiicons.py "claude" --json
   python3 scripts/aiicons.py "openai" --embed
   ```
6. 自定义样式预设：内置 `default`、`corporate`、`handdrawn`、`colorblind-safe`、`dark`。
7. 把校验接入 CI：README 称可 regenerate + validate（`--strict` gate）+ headless 渲染；具体 YAML 规则与 Action 配置在未提供的 `docs/CI.md` 里，不要把 README 命令名当完整配置。
8. 增量同步：`diagramctl sync` 更新变更的节点/关系，保留调好的坐标、样式、注释；删除项默认保留为可评审状态。README 未给出完整参数。
9. 自检与反馈循环：先导出草稿 PNG 自检并自动修复（最多 2 轮）重叠、标签被裁剪、堆叠边，再进入最多 5 轮用户反馈循环。

### 做法 K：让架构图从仓库或文章生成，并用 check 做布局自检

用 bassnova42/arch-diagram-skill。输入 GitHub 仓库、技术文章、PDF 或本地项目，由模型读懂结构后生成深色“终端蓝图”风格架构图，支持导出交互式 HTML、PNG、MP4、GIF 和 Mermaid。

1. 确认前提：Node ≥ 18，以及 Chrome、Chromium 或 Edge；输出视频和 GIF 还需要 `ffmpeg`。
2. 用 npm 安装：
   ```bash
   npx @rokoai/arch-diagram install
   ```
   默认装到 `~/.claude/skills/arch-diagram`；加 `--project` 装到当前项目；存在 `~/.codex` 时会同时装到 `~/.codex/skills/arch-diagram`。卸载：
   ```bash
   npx @rokoai/arch-diagram uninstall
   ```
3. 或用插件安装。Claude Code：
   ```text
   /plugin marketplace add bassnova42/arch-diagram-skill
   /plugin install arch-diagram@arch-diagram
   ```
   Codex CLI：
   ```bash
   codex plugin marketplace add bassnova42/arch-diagram-skill
   codex plugin add arch-diagram@arch-diagram
   ```
4. 用自然语言触发：
   ```text
   把 https://github.com/plausible/analytics 画成架构图
   这篇文章画成流程图：<URL>，输出成视频，30 秒
   把刚才的图输出成图片
   输出成 mermaid
   ```
5. 图的源文件是 `<slug>.spec.json`。要调整时让 Claude Code 或 Codex 改 spec，再重新生成。
6. 用 CLI 直接构建、检查和导出：
   ```bash
   npx @rokoai/arch-diagram build  my.spec.json my.html
   npx @rokoai/arch-diagram check  my.html
   npx @rokoai/arch-diagram export my.html my.png my.mp4 --seconds 30
   ```
7. 利用自检结果修正：README 说会用无头 Chrome 检查元素重叠、文字溢出、连线穿过方框、标签被遮挡，有问题就改到干净为止。
8. 控制输出语言：用什么语言写提示词，图里的标题、说明、标签和 log 就用什么语言；代码标识符、路径、命令保持原样。
9. 人工核对语义：`check` 只覆盖布局层面，不证明图的内容结构一定正确。对照源材料核对模块、连线方向、分组关系。若要可编辑 `.drawio`、漂移 diff、CI 规则校验、增量同步，优先用做法 C。

### 做法 D：给前端 UI 先固定持久事实，再用确定性规则当门禁

用 pbakaus/impeccable。它把“耐久事实”和“表层视觉方向”分开写进仓库文件、给 agent 一套共享命令词汇、再用确定性规则做可自动执行的守门人。

1. 安装。在项目根目录：
   ```bash
   npx impeccable install
   ```
   脚本化时：
   ```bash
   npx impeccable install --providers=claude,codex,cursor,grok,hermes,veto --scope=project|global
   ```
   装完重载 harness。刷新用 `npx impeccable update`。
2. 建立持久上下文：
   ```bash
   /impeccable init
   ```
   写出 `PRODUCT.md`（受众、目的、运行环境、约束、语气、证据），视觉系统单独记录在 `DESIGN.md`。
3. 用命令表干活：`/impeccable craft`、`shape`、`critique`、`audit`、`polish`、`harden`、`document`、`extract`、`live`。示例：
   ```text
   /impeccable audit blog
   /impeccable critique landing
   /impeccable polish settings
   /impeccable harden checkout
   ```
4. 建立确定性检测基线：
   ```bash
   npx impeccable detect src/
   npx impeccable detect index.html
   npx impeccable detect https://example.com
   npx impeccable detect --json .
   npx impeccable detect --no-config src/
   ```
   退出码：`0` 无 primary findings；`2` 有 primary findings；`1` 至少一个目标无法扫描。
5. 把检测接成自动反馈：在支持的 harness 上安装 hook；Codex 装/更新后要打开 `/hooks` 批准项目 hook；Grok Build 需要项目目录信任。
6. 配置忽略与豁免：`.impeccable/config.json` 的 `detector` 键；命令行 `npx impeccable ignores list`、`add-file`、`add-value`；内联注释 `impeccable-disable` 作用域是整个文件，细到一行用 `impeccable-disable-line` 或 `impeccable-disable-next-line`。
7. 把产物按“可提交/一次性”分开：必须保留跟踪 `.impeccable/config.json`、`.impeccable/live/config.json`、`.impeccable/design.json`、`.impeccable/surfaces/*.md`、`.impeccable/critique/*.md`。已提交的一次性文件用 `git rm --cached <path>`。
8. 把反模式写成项目规范：不用过度使用的字体、紫到蓝渐变、卡片套卡片、彩色背景上的灰字、每个标题上方一个圆角方块图标等。`critique` 是 LLM-only 主观评审，别当硬门禁。

### 做法 E：让 Claude Code 在终端里展示截图、录屏和前后对比 QA

用 iamumeransari/claude-show-your-work。靠 Claude Code mods 和 Ghostty/kitty 的 kitty graphics protocol 成立。

1. 前提：macOS；Ghostty 或 kitty；Claude Code v2.1.287+。安装：
   ```text
   /plugin marketplace add https://github.com/iamumeransari/claude-show-your-work.git
   /plugin install show-your-work@iamumeransari
   ```
2. 装 ffmpeg：
   ```bash
   brew install ffmpeg
   ```
3. 可选关自动更新：`SHOW_YOUR_WORK_AUTO_UPDATE=0`；手动更新用 `claude plugin update show-your-work@iamumeransari`。
4. 跑官方 demo：
   ```bash
   cd examples/pricing && npm i playwright
   node qa.cjs before rec-before
   node qa.cjs after  rec-after
   ```
5. 让 Claude 展示对比：
   ```text
   "show me the QA, rec-after vs rec-before"
   ```
6. 用在自己的项目上：让 Claude 用 Playwright 跑改动前应用并录制，改完用同一个脚本录一遍，把两个文件作为前后对比交给 `show_video`。`compare` 必须是同一脚本录的原始版，`changes[].at` 是改动出现在视频第几秒，`summary` 最多三行测试结果。
7. 只看单张文件：`/img path/to/file.png`。
8. 参数上限：视频最高 12 帧/秒、960 px 宽、最多 900 帧；QA summary 最多三行。

### 做法 F：让实时特效在真实引擎里渲染出来，再交给另一个 agent 独立评审

用 kanaworksai-hue/effekseer-vfx-skill。循环是 design brief → textures → Python recipe → EffekseerCore build → real Godot filmstrip → look → fix one thing → repeat → independent review。

1. 安装。Claude Code：
   ```text
   /plugin marketplace add kanaworksai-hue/effekseer-vfx-skill
   /plugin install effekseer-vfx@effekseer-vfx
   ```
   Codex：
   ```text
   $skill-installer install https://github.com/kanaworksai-hue/effekseer-vfx-skill/tree/main/skills/effekseer-vfx
   $skill-installer install https://github.com/kanaworksai-hue/effekseer-vfx-skill/tree/main/skills/vfx-review
   ```
   其他 Agent：
   ```sh
   npx skills add kanaworksai-hue/effekseer-vfx-skill
   ```
2. 在用户自己的游戏项目目录下运行：
   ```sh
   sh <skill>/scripts/vfx doctor
   ```
   按其 `next` 提示操作。`doctor` 里的 `render: true` 只表示“找到了 Godot”。
3. 下载前先征求同意。`setup.sh` 会把工具链装进 `~/.cache/effekseer-vfx`（约 250 MB；其他平台用 `--authoring-only`），首次 `vfx init` 还会下载官方 Effekseer Godot 插件（约 34 MB）。Godot 4 从不由它代装。
4. 在沙箱外跑 Godot。`vfx review`、`preview`、`showcase` 会打开 Godot 窗口；沙箱内 agent 打不开，需用户批准或把命令交给桌面终端。若评审没有渲染出任何帧，约 90 秒后会以 "rendered no frame" 停止。
5. 跑通第一步：对 agent 说 "Set up the effekseer-vfx skill here and show me the fire example." 它会执行：
   ```sh
   sh <skill>/scripts/vfx doctor
   sh <skill>/scripts/setup.sh
   sh <skill>/scripts/vfx init
   sh <skill>/scripts/vfx examples add fire
   sh <skill>/scripts/vfx build --ids VFX_Projectile_Fire VFX_Fire_Explosion
   sh <skill>/scripts/vfx review --ids VFX_Projectile_Fire VFX_Fire_Explosion --note "baseline"
   sh <skill>/scripts/vfx showcase
   ```
6. 关键约束：在独立评审被提交且 `vfx overview` 被重跑之前，即使特效渲染正确，`effect-verify` 也会显示 `verified: false`；此时 agent 应说 "builds and renders" 而不是 "verified"。
7. 贴图来源规则：复杂手绘形状（烟、斩击弧线、火、裂纹、冰、符号）必须来自图像生成模型，提示词记录在 `vfx/texture_prompts.json`；数学形状程序化生成。
8. 在游戏里使用产出：`.efk` 运行时导出与 `.efkefc` 源文件，外加 `vfx_manifest.json`；Godot API 示例：
   ```gdscript
   var handle = Vfx.play("VFX_Fire_Explosion", position)
   var shot = Vfx.launch("VFX_Projectile_Fire", from, to)
   shot.arrived.connect(func(at): Vfx.play("VFX_Fire_Explosion", at))
   ```
9. 可迁移的骨架：生成 → 在真实环境里渲染/运行 → 截图或截帧成可评审产物 → 只看产物、看不到生成脚本的第二个 agent 独立评审 → 评审提交前不给 verified。做法 A 的“只看得到 PNG 的新审阅者”、做法 E 的 before/after 录制、做法 H 的 fresh-context 子代理终审都是同一结构。

### 做法 G：把界面文案的卫生规则前置成约束，再人工确认

用一条 X 帖子（@ZaynHao）里的两条提示词规则。它处理“可判定、低风险”的界面文案清理，但“哪些解释性文本是冗余的”带主观性，必须留人工确认。

1. 选定范围很小的试验对象：一个页面或一组组件，先截改动前界面图。
2. 把两条规则原样发给 Codex / Claude Code，并限定范围：
   ```text
   不要使用中点“·”作为文案的分隔符。如果有，移除它。
   不要在界面添加冗余的解释性描述文本，这会弄脏 UI 界面，还会浪费用户的注意力。
   ```
   需要时追加工程约束：
   ```text
   只修改 src/pages/xxx 下的文件，不要动逻辑与样式变量。
   ```
3. 让智能体先只做检索，不做修改。预期结果：列出范围内所有包含“·”的文案位置，以及所有它判断为“冗余解释性描述”的文本，交给你确认——是一份清单，不是 diff。
4. 人工逐条确认清单。区分真正冗余的解释文本（重复标题含义、解释显而易见的功能、营销式废话）与必要说明（错误提示、权限说明、表单帮助文本、合规文案）。
5. 确认后再让智能体执行删除或替换，并要求输出 diff，逐条对照清单检查。
6. 重新截图，与第 1 步对照图并排比较。把“·”替换成什么明确记录下来——空格、竖线、换行、拆成两个字段——形成团队替代约定。
7. 把两条规则固化进项目的 agent 指令文件或代码审查清单，让后续每次 UI 改动都受约束。
8. 原帖第 3 条及之后的 7 条在给定材料里被截断，无法复原。不要凭标题推测或替作者补写。

### 做法 H：用三层门禁、sloplint 和前后快照验收网页设计

用 Nutlope/hallmark。核心是把设计验收拆成可执行分层门禁：Floor（底线）永不放行——对比度、焦点、减少动效、编造事实、手机布局崩坏；Reflex（反射）是模型默认套路——每个标题上方的 eyebrow、字距拉开的大写标签、标题里一个彩色词、整页空框或全是照片、hero 撑不满一屏、每页结尾都塞订阅框、表单点“谢谢”却没真提交——有理由可破例但要记录；Finish（工艺）是细节，从不阻断发布。

1. 安装。Node 18+：
   ```bash
   npx skills add nutlope/hallmark -g
   npx skills add nutlope/hallmark -g --agent claude-code
   ```
   作为 Claude Code 插件：
   ```text
   /plugin marketplace add nutlope/hallmark
   /plugin install hallmark@hallmark
   ```
2. 触发：`/hallmark <prompt>` 或 Codex CLI 的 `$hallmark <prompt>`。
3. Pre-flight：先读项目已有字体、配色、框架、锁定的 `design.md`；一次性索要素材：照片、截图、真实数字。原文明确“Nothing is invented”。
4. 选题材与结构：`scripts/theme.mjs deal` 从 48 个主题里发三个；`draw` 按页面要做的事给出结构。主题只是材质，不是方案；一次构建只读一个主题文件（≤8KB）。
5. 先只建 hero，单独渲染、冷读评审，再建页面其余部分。
6. 全页检查：八种宽度渲染 + 静态检查，然后起一个 fresh-context 子代理复审终审：
   ```bash
   node skills/hallmark/scripts/sloplint.mjs <file-or-dir> --render
   ```
   没有 Chrome + puppeteer-core 时，`--render` 和截图检查降级为静态检查。
7. 改已有页面：不点名就不动手。
   ```text
   /hallmark redesign ./src/app
   /hallmark audit ./index.html
   ```
   全量重设计保留内容与接线，只换系统与布局；`keep the layout` 是换皮，`polish` 只去 AI 味。`audit` 只报告不改。
8. 用快照防回归：重设计前先跑 `sloplint --before` 记录每一条链接、字段、handler、标题；改完跑 `sloplint --kept`，丢一件就判定失败；交付物是前后并排对比。
9. 加编辑时门禁（Claude Code）：运行 `install-hook.mjs`。
10. 按三层语义裁定：Floor 硬阻断；Reflex 可破例但要在第一条 CSS 注释或记录里写明理由；Finish 不阻断发布。
11. 用照片时逐张署名 CC0 / 公有领域 / CC BY / CC BY-SA；不要用 Unsplash/Pexels/Pixabay。

### 做法 I：用设计技能 + 代表性 specimen + 多宽度截图审查闭环验收 UI/网页改版

用 Phantom-Con-Artist/unparalleled-skillset 的两个设计技能（`unparalleled-ui` 面向应用、仪表盘、表格、表单、设置；`unparalleled-website` 面向公开网站、作品集、落地页、产品故事）和一个本地 Unparalleled Studio。闭环是：产品证据 → 设计契约 → 代表性 specimen → 用户审阅 → 实现 → 截图审查 → 修复 → 复测。

1. 安装。Node.js 20+：
   ```bash
   npx github:Phantom-Con-Artist/unparalleled-skillset setup
   npx github:Phantom-Con-Artist/unparalleled-skillset doctor
   npx github:Phantom-Con-Artist/unparalleled-skillset install all
   npx github:Phantom-Con-Artist/unparalleled-skillset install ui
   npx github:Phantom-Con-Artist/unparalleled-skillset install website
   ```
2. 按任务选技能，让 agent 先产出任务 brief、设计契约和一个代表性 specimen；完整新方向默认要用户审阅后再全量开发。
3. 做截图审查闭环：
   ```bash
   node .agents/skills/unparalleled-website/scripts/capture.mjs --install --url ./index.html --out ./shots
   node .agents/skills/unparalleled-website/scripts/capture.mjs --url http://localhost:5173 --out ./shots --round 2 --viewports desktop,phone
   ```
   每轮输出首帧和整页截图及 `report.json`。要求 agent 打开每张截图，按严重度/证据/修复/复测记录，修复一批后重拍并做前后对比。
4. 读懂 `report.json`：标记 pill、卡片组、kanban、默认字体、SaaS 配色、emoji、横向溢出、运行时错误、占位文案、减少动态偏好下仍持续动画等模板痕迹。标记需要修复/复测、有证据的误报，或明确用户/品牌要求——它不是最终判决。
5. 检查对比度与 token（可选）：
   ```bash
   node .agents/skills/unparalleled-website/scripts/check-contrast.mjs --pairs ./pairs.json
   node .agents/skills/unparalleled-website/scripts/generate-tokens.mjs --input ./tokens.json --output ./tokens.css
   ```
6. 可选用 Studio 做页面内选取和定向修改；补丁要带 `id`、`leaseToken`、`file`、`expectedHash`、`edits`；多文件最多 12 个文件、总计 2 MiB；超过五分钟用 `renew`；undo 全有或全无。
7. 技能自身校验：`npm run validate-all` 只检查结构和本地 Markdown 链接，不认证生成网站或 UI。
8. 保留人工验收：`report.json`、对比度脚本、token 生成都只是证据；README 也承认脚本结果本身不证明设计质量。

### 做法 J：让 B 端后台页面先选骨架、再按否定判据和硬门禁生成

用 Ludi-Herry/b-end-design-system-skill。它补“组件库有什么零件”和“页面怎么组装”之间的设计决策约束。材料只有 README，具体规则文件要自己打开仓库确认。

1. 先判定页面类型：查询列表页 / 分步或分组表单页 / 单据或高级详情页 / 指标工作台与看板 / 设置页 / 异常与结果页。
2. Cursor 用户：把 `.cursorrules` 复制到项目根目录，或在 `.cursor/rules/` 下添加指向 `SKILL.md` 的引用。
3. Claude Code / Antigravity / Codex 用户：把 Skill 链接或放置到提示词 / Skill 检索路径下，然后输入：
   ```text
   请严格遵循 b-end-design-system 规范，为我生成一个客户合同管理列表页。
   ```
4. 任意大模型用户：直接粘贴 README 给出的通用 Prompt：
   ```markdown
   请你扮演一名资深高级 UI/UX 设计专家与前端工程架构师。
   在接下来的页面设计与前端代码生成中，你必须 100% 遵守以下设计系统硬门禁：
   1. 页面骨架：从查询列表、分组表单、高级详情、指标看板六大骨架中精准选型，杜绝组件乱堆；
   2. 浮层选型：查看详情与轻编辑首选侧边抽屉(Drawer)以保留背景上下文；高危删除才使用确认弹窗，且严禁开启点击遮罩静默关闭；
   3. 原子规范：一个操作区最多 1 个 Primary 按钮；Badge 严格坚守 80% 浅底深字黄金法则；数值金额列绝对右对齐；
   4. 视觉质感：使用 0.5px 精细微边框，内外容器遵循同心圆角公式 R_outer = R_inner + Padding，去除所有占位说明废话。
   ```
5. 生成后按 `references/07-design-system-audit-checklist.md` 的 15 项硬门禁和 `scripts/audit-design-rules.py` 复核。README 未给出脚本运行命令、依赖和输出格式。
6. 人工按组件选型七大否定判据自检：选项少于 5 个优先单选框平铺，选项过多用带搜索下拉；查看详情首选 Drawer，高危删除才用 ConfirmDialog；小于 1 秒不展示骨架屏，1—3 秒按钮 Spin，大于 10 秒给百分比和取消出口；关键报错不要藏在 Tooltip；原地改状态用 Button，跨路由跳文档用 Link，改动即生效用 Switch，随整表提交用 Checkbox；高危删除弹窗严禁开启点击遮罩静默关闭。
7. 按视觉硬门禁复核：一个独立操作区最多 1 个 Primary 按钮；Badge 使用浅底深字；金额和数值列右对齐；边框使用 0.5px 精细微边框；内外容器圆角满足 `R_outer = R_inner + Padding`；弹窗不要机械垂直居中。这些是特定设计主张，按目标产品规范、设备像素比和可访问性复核后再采用。
8. 用 15 项门禁和返工轮次做验收，不把“看起来更花哨”当改善。若页面只是更花哨但违规数和返工没有下降，就降为 study。
9. 把试用后确认有效的条款沉淀进项目自己的规则文件或评审清单。

### 做法 L：用脚本门禁 + 模型判断审计界面 AI 味与业务变量

用 pedrojaques99/visant-skills-public。它是一组 Claude Code Skills（MIT，9 个技能），入口是 `visant-killer`（反 AI 味 UI 审计），另有 `visant-frontend`（每个元素必须说清它推动哪个业务变量）、`visant-motion`（CSS / framer-motion 的缓动与时长 token、`motion-lint`）、`visant-refine`（图表、仪表、迷你图、滑块、指标卡共用解剖结构）、`visant-copy`（巴西葡语文案 + `copy-lint` 检查中英文 AI 腔），以及视频和流程类技能。

1. 确认依赖。只想做界面审计时，只需 Node 20+，无需构建步骤；`visant-killer` 的屏幕检查可选 Playwright；视频类技能依赖更高，首次试用先不要上视频类。
2. 安装技能。前提：有可写的 `~/.claude/skills/`。
   ```bash
   npx skills add pedrojaques99/visant-skills-public
   npx skills add pedrojaques99/visant-skills-public --skill visant-killer
   ```
3. 先单独跑检测器，不经过模型：
   ```bash
   npm install
   npm test
   node visant-killer/scripts/killer-scan.mjs <app/src>
   node visant-motion/scripts/motion-lint.mjs <app>
   node visant-copy/scripts/copy-lint.mjs <file-or-folder>
   ```
   预期：`npm test` 对每条规则用 fixtures 做正反双向验证；`killer-scan` 一次跑 4 个 gate，输出末尾给出 `gates: 4/4 ran [...]; none skipped` 和 `GATE CLOSED`，并明确“A gate finding becomes a fix, not a proposal”。
4. 在 Claude Code 里用自然语言触发。README 给出的触发语：
   ```text
   audit this screen
   tá com cara de IA
   make this smoother
   edit this lesson
   ```
   预期：技能先探测仓库已有的 gates、primitives、tokens，再决定动作；然后模型判断每个元素是否推动业务变量、打开屏幕、反驳自己的结论并打分。
5. 把 FAIL 当修复项，不是建议。按三条判定口径校准预期：palette 类只有在存在 token 层时才计为 bypass；`icons/` 目录下的 SVG 和品牌 logo 不算手绘图标；component 不等于 route；托管结账页不算未埋点的表单。
6. 可选接入 shadcn 组件库。前提：项目用 shadcn，且有 `components.json`。
   ```json
   // components.json → "registries": { "@visant": "https://ui.visantlabs.com/r/{name}.json" }
   ```
   ```bash
   npx shadcn@latest add @visant/gauge
   ```
7. 采纳边界：材料只有 README，检测器规则目录和 `SKILL.md` 正文不可见；效果只有作者自述。先在一个自有前端仓库安装并运行 `killer-scan`，把每条 FAIL 交给人工复核误报率，再决定是否纳入常规流程。

### 做法 M：把渲染后的像素检查变成交付门禁

用 ngocanhnckh/renderlint。它在无头 Chromium 中打开真实页面，在手机/平板/桌面多视口（含暗色模式）下渲染，用 37 条规则抓 TypeScript 与 ESLint 看不见的像素级缺陷，输出给 agent 读的纯文本，并在有 error 时以退出码 1 失败。做法 A~R 大多在“生成之前”或“页面之外”约束 agent，这一条是“渲染之后、交付之前”的机器判定。

1. 确认前提：Node >= 18.17；项目能在浏览器里渲染；能启动 dev server 或产出静态构建目录。
2. 最省事的方式：把下面这段原样丢给编码代理：
   ```text
   Set up renderlint in this project: run `npx -y github:ngocanhnckh/renderlint init`, then follow the "UI quality gate: renderlint" section it adds to AGENTS.md: after every UI change run `npx renderlint` and fix every reported error until it shows 0 errors.
   ```
3. 或手动执行（注意：目前未发布到 npm，必须从 GitHub 安装）：
   ```bash
   npx -y github:ngocanhnckh/renderlint init   # one-time setup: config, build gate, agent instructions, Claude Code hook
   npx renderlint                              # check: exits 1 if any error is found
   ```
   预期：第一次跑就能拿到带元素选择器、源文件与行号、带标注截图和一条具体修复建议的清单；有 error 时退出码为 1。
4. 先看 `init` 改了什么再决定留哪些：加 renderlint 为 dev dependency；写 `renderlint.config.json`；加 `lint:ui` script 并把检查追加到 `build`（`--no-build` 可跳过）；把 agent 工作流写进 `AGENTS.md` 并创建/追加 `CLAUDE.md`；在 `.claude/settings.json` 装 Claude Code 的 `Stop` hook（`--no-hook` 可跳过）；把 `.renderlint/` 加进 `.gitignore` 并确保有可用的无头 Chromium。`init` 是幂等的。
5. 按项目定制 `renderlint.config.json`：配置 `serve`、`pages`、`viewports`、`colorSchemes`、`rules`、`ignore`、`states`、`mock` 等键。
6. 把业务上限显式声明出来：
   ```html
   <h3 data-renderlint-maxlength="60">{project.name}</h3>
   ```
7. 登录后的页面用 token + mock 进来，不需要真实凭据：配置 `auth.storage` 写入 `sessionStorage` 或 `localStorage`，用 `mock` 映射 API 响应；也可以走登录表单一次（`auth.login`、`${RENDERLINT_USER}`、`${RENDERLINT_PASSWORD}`）或跑脚本处理 SSO；hash 路由会被当作独立页面爬取，登出链接不会被跟随。
8. 让菜单、弹窗、表单、空/失败状态也进检查（默认只检查加载完成时的页面）：用配置里的 `states` 点开菜单、填表单、喂空或失败 API 响应。
9. 接成门禁，让缺陷发不出去。构建脚本可接 `vite build && renderlint dist` 或 `next build && renderlint --serve ...`；Vite 插件 `import renderlint from 'renderlint/vite'`；Claude Code 的 `Stop` hook（`init` 已装，`npx renderlint hook`）：UI 文件有错时 Claude 不能结束回合，最多重试 4 次。CI 用 `npx renderlint --format github`。
10. 常用命令：
    ```bash
    npx renderlint http://localhost:3000
    npx renderlint dist
    npx renderlint index.html about.html
    npx renderlint --serve "npm run preview" --url http://localhost:4173
    npx renderlint --pages /,/pricing,/dashboard --viewports 360,768,1440
    npx renderlint --sweep 1024,1366
    npx renderlint explain contrast
    ```
11. 对确认是故意的缺陷做显式豁免，必须写理由：
    ```html
    <div data-renderlint-ignore="emoji" data-renderlint-reason="user-generated chat">…</div>
    <p data-renderlint-ignore>…</p>
    ```
    ```css
    .watermark { --renderlint-ignore: contrast; }
    ```
    或按选择器/页面忽略：配置 `ignore` 数组。agent 指令要求先修根因，忽略必须带 reason。
12. 跑通后的循环：改 UI → `npx renderlint` → 按报告里的元素、文件:行号、截图和 fix 提示逐条修 → 直到 0 error。每轮产物落在 `.renderlint/report.json`、`.renderlint/report.md`、`.renderlint/screens/`。

### 做法 O：把 UI 还原度变成四轴分数和退出码，再进入修复循环

用 albertirgi/replica。它把“照着参考重建 UI”变成可量化的迭代闭环：抓取参考并生成机器可读蓝图（设计 token、每个可见元素的精确盒模型与计算样式、断点差异、带拟合缓动的动效时间线），agent 在已有代码库里重建，用四轴打分对比，按“修这一条能涨多少分”排序修复，达标停止。

1. 安装 skill。用官方 skills CLI：
   ```bash
   npx skills add albertirgi/replica
   ```
   或手工把仓库里的 `skills/replica` 复制进 agent 的 Skills 目录（Claude Code 是 `~/.claude/skills/replica`，或项目内 `.claude/skills/replica`）。
2. 手工安装路径下，装依赖并自检：
   ```bash
   npm install --prefix ~/.claude/skills/replica/scripts
   node ~/.claude/skills/replica/scripts/replica.mjs doctor
   ```
3. 用自然语言下任务，一次说清四件事：参考源、落地文件、级别、自己的内容/资产。README 给的三个样例：
   ```text
   Rebuild the hero from https://example.com in `app/page.tsx` with our copy. Faithful level.
   Make the pricing card hover feel exactly like stripe.com's — pixel-perfect.
   Here's a screen recording of the menu opening (`menu.mov`). Build it in `components/Menu.tsx`.
   ```
4. 让 agent 走它固定的四步：Scope（确定目标、落点、级别、触发方式）→ Capture（抓进 `.replica/<name>/ref/`：`blueprint.md`、各视口截图、动效帧、filmstrip）→ Build（在你的现有技术栈里按测量值写）→ Compare/Fix/Repeat（每轮产出 `report.md`、`issues.json`、对比图；先修收益最高的 findings，达标即停，否则 8 轮后如实交代剩余差异）。
5. 按需要选级别并接受对应阈值：

   | 级别 | 适用 | gates |
   |---|---|---|
   | `structure` | 同布局同动效、换自己的品牌与内容 | layout ≥ 90 · motion ≥ 85 |
   | `faithful`（默认） | “把这个抄下来” | layout ≥ 95 · style ≥ 95 · pixels ≥ 85 · motion ≥ 90 |
   | `exact` | “像素级”“1:1” | layout ≥ 98 · style ≥ 98 · pixels ≥ 97 · motion ≥ 95 |

6. 也可以自己跑 CLI（agent 用的就是这套），把参考抓下来：
   ```bash
   node skills/replica/scripts/replica.mjs capture <url|file.html|image|video> --out .replica/hero/ref \
     [--selector "#hero"] [--viewports 1440x900,390x844] [--action load|reveal|hover:<css>|click:<css>|scroll:<px>|scrub:<px>] \
     [--motion 1500] [--fps 30] [--level structure|faithful|exact] [--hide "<css>"] [--storage auth.json]
   ```
   再拿本地实现去比：
   ```bash
   node skills/replica/scripts/replica.mjs compare .replica/hero/ref http://localhost:3000 [--selector "#my-hero"]
   ```
   退出码即判定：`0` 通过，`1` 未通过，`2` 出错。可直接接进脚本或 CI 做门禁。
7. 复用了别人资产的元素打标记：加 `data-replica="placeholder"`，该元素的盒模型仍被检查，但像素不计入像素分，只在报告里列出。前提是你没有该素材的使用权。
8. 读报告按“收益”而不是按“顺眼”修。报告样例里每条 finding 带问题、差值、能涨多少分，并且会追根因：例如“9 个元素高了 16px，很可能因为 h1 比参考矮 16px（font-size 你 48 / 参考 56，line-height 你 56 / 参考 64），改这个其余跟着对齐”。先修这种根因条目。
9. 长页面分段抓：静图最高 8000px，长页面用 `--selector` 一节一节抓。需要登录态的站点用 `--storage auth.json`。动效参考用 `--motion <ms> --fps 30` 控制采样。

### 做法 P：用技能 + 检查/验证 CLI 给 UI/UX 修正留下前后证据

用 smokeeaasd/flawless-ui-ux。它把 UI/UX 工作拆成两层：技能文件负责把产品语境、内容与视觉识别连接到布局、排版、颜色、密度、图像和交互；检查 CLI 负责收集项目上下文、检查源码或运行中的界面，并在修正后对比结果。README 明确说“你的 agent 做修改，CLI 提供观察并记录实际检查了什么”，因此它不是替代 agent 的自动改码工具。

1. 确认前提：Node 22.12+，在项目目录中运行；支持 12 个宿主（Codex、OpenCode、Antigravity、Kiro、Cursor、Kilo Code、GitHub Copilot CLI、Claude Code、Pi、Grok Build、Devin CLI、DeepSeek Harness）；MIT 许可。
2. 安装。按包管理器选择，交互式选择项目级或全局范围、一个或多个 agent，并确认目标路径后再写入；Ctrl+C 可在写文件前取消：
   ```bash
   npx flawless-ui-ux@latest install
   # 或
   pnpm dlx flawless-ui-ux@latest install
   # 或
   bunx flawless-ui-ux@latest install
   ```
3. 或用显式参数跳过菜单；`--yes` 在无其他参数时使用默认值（当前项目内所有支持的 agent）：
   ```bash
   npx flawless-ui-ux install --codex
   npx flawless-ui-ux install --codex --devin
   npx flawless-ui-ux install --claude-code --global
   npx flawless-ui-ux install --project ./app
   npx flawless-ui-ux install --yes
   ```
4. 备选安装：通过 skills.sh；或用仓库 checkout 的 Bash 脚本（本地安装必须带 `--project`，Windows 需 Git Bash 或 WSL）：
   ```bash
   npx skills add smokeeaasd/flawless-ui-ux --skill flawless-ui-ux
   bash /absolute/path/flawless-ui-ux/install.sh --codex --project
   ```
5. 触发技能。安装后如宿主未发现技能，开新会话。用自然语言点名技能，并在同一对话中持续迭代。Codex 用 `$flawless-ui-ux`，支持斜杠命令的宿主用 `/flawless-ui-ux`，Pi 用 `/skill:flawless-ui-ux`：
   ```text
   Use the flawless-ui-ux skill to build a financial dashboard for freelancers.
   ```
6. 收集上下文并检查源码；`--source` 可重复，或用 `--selector` 检查局部：
   ```bash
   npx flawless-ui-ux context --project . --format json
   npx flawless-ui-ux inspect --project . --source src/App.tsx --format json
   ```
7. 检查运行中的界面。前提：应用已启动、已准备兼容 Chromium、输出目录的父目录存在。先安装 Playwright Chromium，再按实际开发服务器 URL 检查并保存基线。默认采样视口为 1440×900 和 390×844，可用 `--viewport WIDTHxHEIGHT` 重复指定其他视口：
   ```bash
   npx playwright@1.64.1 install chromium
   npx flawless-ui-ux inspect --project . --source src/App.tsx --url http://localhost:5173 --output ../app-before --format json
   ```
8. 让 agent 做一次有边界的评审或精修，然后验证。前提：agent 已完成修正，且基线 `run.json` 存在。对保存的范围重复验证，并比较 persistent、new、no-longer-observed 三类结果；缺失的已确认目标和变化过的条件仍属未验证：
   ```bash
   npx flawless-ui-ux verify ../app-before/run.json --output ../app-after --format json
   ```
9. 评审而不改文件时，直接给 agent 明确只报告不改文件的任务：
   ```text
   Review this dashboard for readability, navigation, accessibility, and repeated generic patterns. Report findings without editing files.
   ```
10. 读退出码判断覆盖状态：`0` 表示完成覆盖且无确认错误；`1` 表示完成覆盖但有确认错误；`2` 表示输入无效或请求的覆盖不完整；安装器在用户拒绝确认时返回 `0`，提示中断时返回 `130`。
11. 按 CLI 的实际覆盖解读结果：它采集选定 axe 对比度和可访问名称规则、采样宽度下的计算字号与水平溢出、可见破图与未捕获 JS 错误、重复短语和箭头提示、源码中的字面像素字号等；采样不能证明完整 WCAG 合规、完整键盘旅程、业务流正确或视觉质量，小字号和重复内容需要结合语境判断。

### 做法 Q：用项目品味文件、先问后做和 outside look 给界面去 AI 味

用 gustavo-henriq/antislop-ui-ux-skill。它面向 Claude Code、Codex、OpenCode，把“去 AI 味”做成一套项目级流程：先读项目品味与配方，指出 slop 信号，先提问并给灰度线框，之后才实现，最后做 outside look 和 second pass。材料只有 README，下面步骤里凡是原文没给出的，都按“先确认仓库”处理。

1. 前提：已有 Claude Code/Codex/OpenCode 项目，并确认项目的技能目录。把仓库中的 skill 文件夹复制到项目里。README 给出的 Claude Code 命令是：
   ```bash
   cp -r skills/deslop my-app/.claude/skills/deslop
   ```
   注意：README 的目录树显示根目录有 `deslop/`，但安装命令写的是 `skills/deslop`，执行前先确认仓库实际路径。
2. 前提：skill 已复制到项目。按 README 要求填写项目级的两个文件：`gosto.md`（项目品味：选择和拒绝）与 `receitas.md`（调色板、表面和组件）。原文说它们是模板，但材料里没有给出模板正文，需要从仓库中取得后填写。
3. 前提：选定一个已有屏幕或新屏幕。使用 skill 的两种模式：对已有屏幕做 de-slop（app、Figma 或刚做出的原型），或从零构建新屏幕。原文没有给出具体调用提示词，调用时使用宿主 agent 的技能调用方式，不要照抄不存在的提示词。
4. 前提：已确定屏幕和项目模板。按 README 描述的循环执行：先读 `gosto.md` 和 `receitas.md`；就地指出 slop 信号；先提问并给出灰度线框，之后才实现；产出 self-contained HTML 原型（base64 图片、真实状态）；最后做 double check、outside look、second pass，并报告发现了什么。
5. 前提：需要外部参考且有浏览/截图权限。可用便宜的子代理搜索 curated sources、截图，只返回大纲；主 agent 负责决定和应用。README 把这称为 anti-token protocol。
6. 前提：使用参考时。遵守 README 的 golden rule：参考只取概念（层级、节奏、隐喻），不复制调色板、字体或字面布局。
7. 保留人工评审：README 列出 20 组正反例画廊，可作为人工对照；但材料没有给出指标定义或量化结果。把 signal audit 标记出的 slop 信号、冗余区块、装饰性渐变/玻璃/发光逐条交给人确认。
8. 如果仓库实际没有 README 所说的检查清单、模板或技能内容，或安装后无法按循环执行，把结论降为 study，不要写入手册作为可复制流程。

### 做法 R：用一条提示词系统找 happy-path debt，按组件补齐边界状态

用一条写给 Claude Code / Codex 的英文提示词。它让代理在既有应用里系统找出“happy-path 债务”：那些只有在数据加载快、不报错、列表非空、文案短、屏幕宽时才正常的界面，然后逐个组件补齐缺失状态与布局断裂，要求不改设计、不破坏现有功能，并按文件给出“改动前 vs 现在”的对照总结。原文没有额外配置、插件或文件要求。

1. 前提：代码库能在本地跑起来、工作区干净，先开分支以便回滚。预期：后续每轮改动都可回退、可对照。
   ```bash
   git checkout -b happy-path-debt
   ```
2. 前提：编码代理（原文点名 Claude Code 或 Codex）已能读写该仓库。原样粘贴提示词。预期：代理开始按屏幕/组件找五类边界状态问题，并按“一个组件”为单位修复。
   ```text
   Find all the happy-path debt in my app: every screen that only works when data loads fast, nothing fails, lists aren't empty, text is short, and the screen is wide. Fix missing states and layout breaks, one component at a time, without changing my design and without breaking anything. Summarize by file: what happened before vs. how it works now.
   ```
3. 按“一个组件”为单位分批推进。中大型仓库一轮很可能做不完；可按屏幕分批，在提示词后追加限定（此句为落地建议，非原文）。预期：每轮只审一个可界定的 diff。
4. 对照原文列出的五个条件逐个检查该组件的改动是否覆盖：加载慢/加载中、请求失败、列表为空、文案过长、屏幕变窄。预期：五类状态逐项有处理或明确说明为什么不适用。
5. 审每一轮 diff：确认只是新增状态分支与布局兜底，没有改动设计基线（配色、间距、字体等），对应原文的 without changing my design。预期：与状态无关的样式/设计改动为 0。
6. 每轮结束后跑构建与现有测试，对应原文的 without breaking anything；不要靠代理自述“没破坏”。预期：构建与测试全绿；若有失败，先修再进入下一组件。
7. 用原文要求的汇报格式做验收清单：按文件列 before / after，与实际 diff 抽查对照。预期：汇报里每一条都能在 diff 中找到对应改动。

### 怎么选 A / B / C / D / E / F / G / H / I / J / K / L / M / N / O / P / Q / R

按交付物分：数据图表走 A；命名组件或有界组合走 B；架构图/系统图/架构文档维护走 C，尤其是需要可编辑 `.drawio`、真实来源导入、漂移 diff、CI 规则校验、增量同步时；把 GitHub 仓库、技术文章、PDF 或本地项目转成深色“终端蓝图”风格架构图，或需要导出 HTML/PNG/MP4/GIF/Mermaid 时走 K；前端界面的设计与实现走 D；在终端里直接看截图/录屏/前后对比 QA 走 E；在真实 Godot 里可运行的实时特效，或想把“生成 → 真实渲染验证 → 独立评审 → 证据绑定具体构建”的闭环搬到别的领域，走 F；界面文案层的清理走 G；网页页面级的设计、重设计、去 AI 味并防止改版丢功能走 H；应用型 UI 或公开网站的设计与实现，想让 agent 先出 brief/设计契约/代表性 specimen、再做多宽度截图审查和修复账本走 I；B 端企业后台页面的生成与复核走 J；界面 AI 味、动效参数、文案 AI 腔的脚本硬门禁 + 模型判断走 L；项目能在浏览器里渲染、你想让“UI 改动后 0 error”成为机器门禁时走 M；有明确 Web 参考、想把“像不像”变成可复现四轴分数和退出码时走 O；有参考图/视频的视觉构建任务，想让 agent 对着参考图长时间迭代、每轮静帧交人工关卡时走 N；想让 agent 按创建/重设计/精修/评审流程做 UI/UX，并用 `context` / `inspect` / `verify` 留下修改前后对比记录时走 P；用 Claude Code/Codex/OpenCode 做 UI 原型或界面评审，想让 agent 先读 `gosto.md`/`receitas.md`、指出 slop 信号、提问并给灰度线框，再实现并做 outside look 时走 Q；已有界面代码库、想系统清掉“只在 demo 条件下正常”的边界状态债务，按组件小步改、每轮人工审 diff 时走 R。

C 和 K 的差异：C 的核心产物是可编辑 `.drawio`，强在真实来源导入、漂移 diff、规则校验、CI 和增量同步；K 的核心产物是深色终端蓝图风格架构图，强在读仓库/文章/PDF/本地项目、以 `<slug>.spec.json` 修正、`check` 做布局自检、导出 HTML/PNG/MP4/GIF/Mermaid。K 的 `check` 只查布局，不查语义。要把架构图纳入 CI 门禁，优先 C；要快速把仓库或文章变成可展示的图/视频，优先 K。

D、H、I、L、M、O、P、Q、R 都碰界面，但层次不同：D 用持久事实 + 61 条确定性规则做持续守门；H 用 Floor/Reflex/Finish 三层门禁 + `sloplint` 八宽度渲染 + 冷上下文复审 + before/kept 快照做页面级设计与重设计验收；I 用设计技能 + 代表性 specimen + Playwright 多宽度截图审查账本；L 补界面 AI 味审计和动效/文案 lint 的落地样例；M 补“真实浏览器里的像素事实”这一层——37 条规则、按几何算溢出与遮挡、按真实像素算对比度、退出码可直接挂构建和 Claude Code 回合；O 补“对着明确参考的还原度”这一层——四轴分数、级别阈值、`compare` 退出码、按收益排序的 findings；P 补“技能指导 + 可重复检查/验证 CLI”这一层——`context` 收集项目语境、`inspect` 保存 before、`verify` 对比 persistent / new / no-longer-observed，但 CLI 自述只覆盖可判定的采样问题；Q 补“项目品味文件 + 先问后做”这一层——读 `gosto.md`/`receitas.md`，指出 slop 信号，提问并给灰度线框，之后才实现，最后做 outside look 和 second pass，参考只取概念；R 补“边界状态债务”这一层——用提示词点名五类 happy-path 条件，按组件补齐缺失状态与布局断裂，不改设计、不破坏功能，并按文件汇报 before/after。M 不替代 D/H/I/L/O/P/Q/R：M 管“渲染出来有没有坏”，D/H/I/L 管“该不该这么设计、有没有 AI 味、改版有没有丢功能”，O 管“和参考差多少”，P 管“这次修正前后，可判定的检查项有没有减少、有没有新增回归、哪些仍然没被验证”，Q 管“每个元素有没有用户能感知的存在理由、参考有没有被抄成另一种套路”，R 管“只在 demo 条件下正常的边界状态有没有被补齐”。O 也不替代视觉设计判断，它只证明还原度分数，不证明设计本身好。P、Q、R 也不证明设计本身好，它们只留下检查证据、流程约束或边界状态修复。

N 和 F 都靠“真实渲染 + 独立评审”，但 N 是对着参考图做长跑视觉迭代，适用 3D 世界、影片、发布视频、游戏、UI；F 是实时特效在 Godot 里渲染成胶片条再交给 `vfx-review`。N 与 A/H/I/O/P/R 共享“独立评审/前后证据”结构：A 是只看 PNG 的新审阅者，F 是另一个 agent、另一个技能，H 是 fresh-context 子代理终审，I 是让 agent 打开每张截图按严重度/证据/修复/复测记录，O 是 `compare` 四轴分数和报告，P 是 `inspect` 存基线、`verify` 分 persistent / new / no-longer-observed，R 是按文件 before/after 汇报并与 diff 抽查对照。N 的成本量级高，先用小任务、2–3 张参考图、2–3 轮试，不要一上来复制作者的高成本 demo。

A、B、D、E、H、I、J、K、L、M、N、O、P、Q、R 都是事件触发，不是常驻巡检；D 的确定性检测、H 的 `sloplint`、I 的 `capture.mjs`/`report.json`、L 的 `killer-scan`、M 的 `npx renderlint`、O 的 `capture`/`compare`、P 的 `context`/`inspect`/`verify` 都能独立于 LLM 跑，适合直接接 CI。N 的运行状态落在 `cook/`，上下文重置或换 agent 后可续跑。Q 是任务内循环，不是定时巡检；它依赖 agent 先问、先画灰度线框、再实现，所以要有一次人工确认或明确约束，不能让 agent 跳过提问直接改。R 是一次性人工调用，原文没有涉及触发方式或持续运行；要按组件分批，不要指望一轮扫完整个中大型仓库。

## 怎么判断变好了

最小试用：在单个代理上装一次，用一个已有图表脚本、一个已有类似实现的组件任务、一两个真实架构来源、一个公开仓库 + 一篇公开技术文章、一个现有前端页面、一个 Godot 4 游戏项目、一个真实页面文案清理、一个已有页面 audit、一个低风险内部仪表盘或落地页、一个 B 端列表页 + 一个表单页、一个自有前端仓库的 `killer-scan`、一个前端项目从 `renderlint init` 到 0 error、一个带参考的 UI 组件以 `faithful` 跑 3–4 轮、一个视觉构建小任务（2–3 张参考图跑 2–3 轮）、一个前端页面用 flawless-ui-ux 从 `context`/`inspect` 到 `verify` 跑一轮，一个低风险 UI 页面或原型用 antislop-ui-ux-skill 从填写 `gosto.md`/`receitas.md` 到跑一轮 de-slop 或新建屏幕，以及一个已知边界状态欠缺的页面用做法 R 只跑 1–3 个组件，分别试。全程做基线对照——让同一 agent 在不装技能、不给规则的情况下做同样任务，再比一次。

图表侧：lint 报出的可判定问题数量和类型（零基线、双 y 轴、文字重叠/裁切、色盲配色、低对比度）；图像复审能抓出多少“标注数字与数据不符”“来源行靠猜或写成文件名”“图上残留 TODO/confirm”；修正前后让不看上下文的同事只看 PNG 复述“这张图说明了什么”；三轮复审的实际收敛情况。

组件侧：是否复用项目原语；是否引入第二套设计系统或不必要的新库；是否发明路由/链接/目的地；移动端和桌面键盘访问是否通过；加载、取消、无效输入、结果恢复等状态覆盖数量；项目测试、lint、类型检查是否通过；人工评审返工轮次和修改量。

架构图侧（C）：从真实来源导入后生成的 `.drawio` 是否可编辑；节点/关系是否与源一致；漂移 diff 是否标出新增绿、删除红、变更橙；`validate.py --score` / `--strict` 是否通过；CI 中架构规则校验是否拦住 Internet 到数据库、环、孤岛、信任边界、对比度等问题；自检修复效果；增量同步是否保留手工布局与注释。

架构图侧（K）：`check` 是否能通过，或报出的布局问题是否能在少量修改 spec 后消除；图中模块、连线方向、分组关系是否与源材料一致；提示词语言与图内语言是否一致；从安装到产出第一版图的时间与人工修正 spec 的次数；HTML 交互、PNG 清晰度、MP4/GIF 循环和 Mermaid 导出是否满足实际交付要求。

前端 UI 侧（D）：固定基线，同一批文件在装技能前后各跑一次 `npx impeccable detect --json .`，比 primary findings 的数量和类型；退出码是否能当门禁；hook 是否真在编辑时触发；`critique` / `audit` / `polish` 抓出的问题数量与返工轮次；`PRODUCT.md` / `DESIGN.md` 是否真的减少 agent 反复问同样问题、反复换风格。

终端内展示侧（E）：视频是否真的在终端内播放，全程没有打开浏览器或播放器；before 是否显示 3 项失败、after 是否显示 5/5 通过；点 “What changed” 里的条目，视频是否跳到对应时间点；Compare 视图两段录制是否逐步同步；同一次任务的会话 token 用量与不装插件时相比没有明显上升。

实时特效侧（F）：`vfx doctor` 的 `modes` 是否显示本机支持的能力；官方 fire 示例是否能一次跑通 doctor → setup → init → examples add fire → build → review → showcase，且 `vfx review` 真的渲染出了帧；未提交独立评审时，`effect-verify` 是否如实显示 `verified: false`；`vfx-review` 的评分与你自己的结论差多少；同一个特效要返工几轮。

界面文案侧（G，指标需自建）：被移除的“·”数量；被删除的解释性文本条数；每个页面的可见文案总字数变化；人工确认清单里被判定为“不该删”的比例；改动前后截图并排评审，请 2–3 位未参与改动的人盲选哪版更干净；删除文案后关键操作路径是否仍能被理解；错误提示与权限说明是否被误删。

网页设计侧（H）：改动前后 sloplint 条目数；`--kept` 缺件数（必须为 0）；八宽度渲染有无布局崩坏；冷读复审列出的问题数；从 prompt 到可发布的耗时与返工轮次；Floor 类问题在 lint 中归零；重设计后链接/字段/handler/标题一个不少。

UI/网页改版侧（I，指标需自建）：每轮 `report.json` 的 flags 数与类型；阻塞/重大问题数；从开始到“无 blockers/majors 且实际验收通过”的轮次和耗时；人工返工次数；横向溢出/运行时错误/对比度失败数；用户是否接受 specimen 与最终页面。

B 端后台侧（J，指标需自建）：高危违规数（遮罩静默关闭、详情误用模态、操作区出现多个 Primary、金额列未右对齐、Badge 对比不足、小于 1 秒展示骨架屏）；15 项硬门禁违规数；若 `scripts/audit-design-rules.py` 可运行，记录 audit 通过率；首次人工评审通过所需返工轮次；页面骨架是否选对。

界面硬门禁侧（L，指标需自建）：先在一个自有前端仓库安装 `visant-killer` 并运行 `killer-scan`，把每条 FAIL 交给人工复核误报率；记录 `gates: N/N ran ... none skipped` 是否完整、`npm test` 是否通过；每条 FAIL 的人工判定（真问题/误报/品牌或用户要求/无法判断）。

渲染后像素门禁侧（M，指标需自建）：第一轮 `npx renderlint` 的 error 数，以及按类型分布；修到 0 error 用了几轮；只在 `--sweep` 的额外宽度才暴露的问题数；`states` 打开后新增的 error 数；每条 `data-renderlint-ignore` 的理由是否站得住；`Stop` hook 是否真的拦住 Claude 的回合、重试是否停在 4 次以内；CI 里 `--format github` 的注解数与人工复核后的误报数之比；从接入到第一轮 0 error 的耗时。

UI 还原度侧（O，指标需自建）：每轮四轴分与总分是否单调上升、第几轮穿过门禁；停滞在某一轴说明该轴的反馈对 agent 不可操作；`compare` 退出码 `1 → 0` 是硬性通过信号，可直接作为 CI 门禁；随机抽 5–10 条 findings 人工看图确认问题真实存在，再人工找 2–3 处明显差异看报告有没有漏，这是判断“分数可信不可信”的关键一步；把参考抓两次互比应得 100，如果不是 100，说明环境不稳定，后面的分数都不可信；同一个组件一组用 skill、一组不用，让不知情的同事只看看图猜哪个更像参考；记录轮数 × 单轮耗时，以及 8 轮上限内是否收敛。

视觉构建长跑侧（N，指标需自建）：`ROUNDS.md` 里最弱维度的分数是否逐轮上升；达到你设定的门槛需要几轮；最终交付前你自己动手改的比例或次数（对照基线同样统计）；并排图上构图/光照/颜色/材质/远近细节/运动的明显不一致处，每轮计数；耗时、token、API 等价花费；中途人为做一次上下文重置，看它能否从 `cook/` 续跑。最小试用：选一个小任务，配 2–3 张参考图，只跑 2–3 轮，把时间上限压到远低于 8h 的 demo 下限；每轮收静帧、并排对比图和 `cook/ROUNDS.md`，你自己独立给每维打一次分，用来对照 critic 打分。

UI/UX 检查与验证侧（P，指标需自建）：`context` 和 `inspect` 是否能稳定产出 before；`verify` 后 persistent、new、no-longer-observed 各有多少条；确认错误数是否下降、有没有新增回归；退出码是 `0`、`1` 还是 `2`，`2` 出现在哪一步、是输入无效还是覆盖不完整；采样视口之外的问题是否仍然存在；人工抽检键盘操作、业务流程、视觉质量，记录 CLI 没覆盖到的缺陷数；完成同一界面任务的时间、返工轮次；内容或行为是否被意外改变。只有在小样本里看到可重复的确认错误减少且无新增回归，才考虑扩大适用范围。

界面去 AI 味侧（Q，指标需自建）：先做基线——同一 agent 不装 skill 生成/改造一版，再装 skill、填写 `gosto.md`/`receitas.md` 生成/改造第二版；统计 signal audit 标记出的 slop 信号数量是否下降；重复动作和冗余区块是否减少；装饰性渐变/玻璃/发光是否减少；每个元素能否说出用户可感知的存在理由；请 1–2 名评审者在不知道版本来源的情况下选择更可用的一版；记录 outside look 之后的返工次数和耗时。材料没有给出指标定义或量化结果，这些是验证方法建议。

边界状态债务侧（R，指标需自建）：状态覆盖率——该页面 5 类状态（慢加载 / 失败 / 空列表 / 长文案 / 窄屏）试前试后各有几个有处理，用清单打勾对比；回归——构建与现有测试是否全绿，diff 中与状态无关的样式/设计改动应为 0；成本——审 diff 与返工耗时，对比手写这些状态所需时间；汇报可信度——按文件的 before / after 总结与实际 diff 是否对得上，抽查即可。若覆盖率明显上升且回归为 0，再扩大到整页乃至整个应用，并按组件拆成多批执行。最小试用：选一个已知边界状态欠缺的页面，只取其中 1–3 个组件，在新分支上原样跑一次提示词，人工审 diff 后跑构建与测试。

这些指标是验证方法建议，这些材料都没有给出对应的量化结果。试多久按任务数量定：若干张历史图表、一个边界清晰的组件任务、一两个真实架构来源导入并接入一次 PR、一个公开仓库 + 一篇公开文章、一个现有前端页面的检测基线、一次 show-your-work 的官方 demo 和 3–5 个真实前端修复任务、一次 effekseer-vfx 的 fire 示例和一条真实特效需求、一个真实页面的文案清理 PR、一个已有页面 audit + 一个新建小页面 build + 一次 redesign 快照比对、一个低风险内部仪表盘或一个落地页的 specimen + 截图审查闭环、一个 B 端列表页 + 一个表单页的基线对照、一个自有前端仓库的 `killer-scan` + 人工复核 FAIL、一个前端项目从 `renderlint init` 到 0 error 再连跑几个 UI 改动、一个带参考的 hero 或卡片以 `faithful` 跑 3–4 轮、一个视觉构建小任务的 2–3 轮迭代、一个前端页面用 flawless-ui-ux 的 `context`/`inspect`/`verify` 跑一轮并人工抽检 CLI 未覆盖项、一个低风险 UI 页面或原型用 antislop-ui-ux-skill 跑一轮 de-slop 或新建屏幕并做人工盲选、一个已知边界状态欠缺的页面用做法 R 只跑 1–3 个组件并逐项打勾五类状态。

## 常见坑

- 这些材料的兼容性声明和效果描述都来自各自 README、作者自述或一条社交帖子，没有安装实测、没有 issue/失败案例；先小范围试，不要直接全量采用。
- 没有 headless Chrome 时，非 matplotlib 库的代码级 lint 会直接缺失，只剩规格检查和图像复审——别把降级结果当成完整检查。
- 技能是事件触发，不会主动巡检；你不给源数据、PNG、脚本、项目上下文、真实架构来源、游戏项目目录、真实素材、B 端页面类型或前端源码目录，它就没有可查的东西。
- style guide 的覆盖权限只到 `[T]`，别指望用项目风格去关掉柱状图零基线这类 `[E]` 完整性规则。
- 组件任务边界不清（整页、整产品）会跑偏；复杂域组件不要重复造轮子；Bricks 明确不声称未在目标项目中实际验证过的性能、可访问性、合规或转化结果。
- drawio-skill 的 draw.io 桌面 CLI ≥ 30 是必需；Linux 无头要 `xvfb`；AI/LLM 品牌 logo 默认走 unpkg CDN，离线要用 `--embed`；logo 是各所有者的商标，仅用于标识。
- arch-diagram-skill 的 `check` 只覆盖布局：元素重叠、文字溢出、连线穿过方框、标签被遮挡；它不证明模块、连线方向、分组关系正确。修改要通过 `<slug>.spec.json`，不要直接手改导出物。
- Impeccable 装完必须重载 harness，否则 hook 不会生效；Codex 还要手动打开 `/hooks` 批准项目 hook；`.gitignore` 不会自动取消跟踪已提交的一次性文件，必须 `git rm --cached <path>`；内联豁免注释的作用域是整个文件。`critique` 是 LLM-only 的主观评审，别当硬门禁。
- show-your-work 适用条件很窄：仅 macOS；仅 Ghostty 和 kitty；iTerm2、macOS Terminal、VS Code 终端不行；tmux 内“还不可靠”；Linux 和 Windows 尚不支持。视频参数上限：12 帧/秒、960 px 宽、最多 900 帧；QA summary 最多三行。
- effekseer-vfx 的构建平台很窄：只在 macOS Apple silicon 与 Windows x64 验证过；Windows ARM64 未验证；Linux 只能跑 authoring。macOS 自带 Python 3.9 太旧；Godot 4 从不由 setup 代装；沙箱内的 agent 打不开 Godot 窗口。在独立评审提交且 `vfx overview` 重跑之前，即使渲染正确也只说 "builds and renders"。
- 文案两条规则只是原帖 10 条中的 2 条完整规则，第 3 条截断在“review”，其余缺失；不要凭标题推测或替作者补写。“中点分隔符不能用”“解释性描述都是冗余”是强主张、弱论证；先只检索再改，跳过“列清单 + 人工确认”直接让 agent 删文案，是最容易造成误删的一步。
- Hallmark 仅网页/前端设计；README 只给 Floor/Reflex/Finish 的分类名和例子，不能照搬成完整验收清单。浏览器检查依赖 Chrome + puppeteer-core；缺了只剩静态检查。`audit` 只报告不改；`redesign` 不点名就不动手；`--before` / `--kept` 丢一件就失败。
- unparalleled-skillset 自述为 first working slice，36 stars，没有客户案例、前后测数据、质量基准；`report.json` 的标记不是最终判决。Studio 是“agent 持续轮询”的半主动；补丁的 `search` 必须精确匹配一次、文件哈希必须仍一致；多文件最多 12 个文件、总计 2 MiB；undo 全有或全无。
- b-end-design-system-skill 的材料只有 README，未包含 `SKILL.md`、`.cursorrules`、模板和 `scripts/audit-design-rules.py` 正文；不能把 README 当成完整规范。0.5px 边框、弹窗固定 38.2% 黄金分割位、选项少于 5 个强制单选框是特定设计主张，需结合目标产品规范复核。
- visant-skills-public 的材料只有 README，不是 `SKILL.md` 正文，也不是检测器源码；跨仓库通用性只由三个 Next.js 项目支撑；没有误报率、漏报率数字。`npm test` 的正反 fixtures 和 `killer-scan` 的 `gates: N/N ran` 只证明执行完整性，不等于效果验证。
- renderlint 未发布到 npm，安装必须写 `npx -y github:ngocanhnckh/renderlint init`，不要写成 `npx renderlint init` 之类的裸包名。`init` 会改 6 处，跑完先 review diff。它默认只检查页面加载完成时的状态，菜单、弹窗、空态、失败态必须靠 `states` 与 `mock` 才会进检查。豁免必须带 `data-renderlint-reason`，不要把它当消错按钮。exit code 1 会挂住构建和 Claude Code 的回合，接入前先确认团队能接受这个硬门禁。37 条规则之外的问题它一概不管。
- replica 只覆盖 Web UI；静图最高 8000px；`<video>` 只冻结在第一帧，Canvas/WebGL 只按像素与动效帧判断；YouTube、Loom 流媒体抓不到，要自己录屏。参考站点的字体、图片、图标、文案版权归原主，先换成自己的资产或 placeholder。`data-replica="placeholder"` 只跳过像素分，不跳过盒模型。`compare` 退出码 `1` 是未通过，不是出错；`2` 才是出错。8 轮上限内不收敛要如实交代剩余差异，不要把它当成“已经 100%”。它的 demo 和自测来自作者，33 stars，没有第三方评测；先人工抽检 findings 的假阳性和假阴性，再决定是否把分数当门禁。
- cook 的证据只有作者自述一次高成本 demo（约 $1.8k–$2.3k、约 45h、约 11M 输出 token），没有第三方复现、没有与“不用 cook”的对照基线，也没有“成品是否被外部认可”的客观指标。门槛分数（99.9%、9/10）由 critic 给出、由人校准，主观性强，“达到 99.9%”不等于客观质量。README 只到 README 层面，critic 提示词、rubric、intake 问题清单在 `references/` 下未展开。纯文本或没有参考物的工作不适用；小任务必须自己设硬上限，不要复制 demo 的 8h 下限。模型给自己打分偏高，每次评分要用你自己的估计去校准。
- flawless-ui-ux 的 README 只有安装、调用、CLI 和退出码，没有效果数据、案例研究或基准结果；64 stars。CLI 自述的检查范围有限：采样不能证明完整 WCAG 合规、完整键盘旅程、业务流正确或视觉质量；小字号和重复内容要结合语境判断；检查不编辑文件、不启动服务器、不下载浏览器、不提交表单；缺失的已确认目标和变化过的条件仍属未验证。`verify` 的 persistent / new / no-longer-observed 只说明可判定项的变化，不等于设计变好了。不要因为退出码 `0` 就认为页面没问题；退出码 `1` 是“有确认错误”，不是“检查失败”；退出码 `2` 是输入无效或覆盖不完整，先修覆盖再谈结果。
- antislop-ui-ux-skill 的材料只有 README，未包含 `SKILL.md`、`estetica-ia.md`、`gosto.md`、`receitas.md` 的实际内容；安装命令写的 `skills/deslop` 与目录树里的 `deslop/` 不一致，执行前先确认仓库实际路径。原文没有给出具体调用提示词，不要照抄不存在的提示词；调用时用宿主 agent 的技能调用方式。它只面向 UI/UX 屏幕；20 组正反例画廊和 12 信号清单是人工对照材料，不是量化效果证据；34 stars 只是仓库指标。没有量化前后对比、用户研究或失败案例；先只做小范围试用，跳过“先问后做 + 灰度线框 + 人工确认”直接让 agent 改，是最容易把屏幕改成另一种套路的一步。如果仓库实际没有 README 所说的检查清单、模板或技能内容，或安装后无法按循环执行，应把结论降为 study，不要写入手册作为可复制流程。
- 做法 R 的原文只是一条推文：一段提示词 + 一句论断，没有任何前后对比、案例、截图、代码库规模或技术栈说明；互动量很低（71 赞、1 转发、20 回复），不构成效果证据。“happy-path debt”是作者自造的说法，其外延完全由提示词里那五个条件界定（快加载、不失败、非空、短文案、宽屏）。“代理写 demo 代码”是作者主张，未提供验证。一次性要求“全应用扫描 + 逐个修复 + 汇报”，在较大代码库上很可能超出单轮上下文或做不完；按组件分批是落地建议，不是原文。 “不改设计”依赖代理对现有样式约定的理解，容易走样，需要人审兜底。原文未说明适用的框架、语言，是否适用于非界面代码也未知。

## 证据与来源

**图表做法：** 依据 rhiever/evident-charts 的 README。可操作材料是安装与更新命令、自动检查清单、规则证据分级 `[E]/[P]/[T]`、`references/sources.md` 的引用机制、支持的库与尺寸列表。唯一具体案例是 `examples/hero.png` 的前后对比图。没有量化改善数据：“三轮图像复审能修好问题”“lint 能覆盖这些缺陷”都是作者主张。

**组件做法：** 依据 kostja94/bricks 的 README。可操作材料是安装命令、完整示例提示词、六步工作流、仓库结构、确定性校验脚本 `scripts/validate.mjs`、`npm test`、MIT 许可、77 stars。失败模式举例是作者举例，没有量化数据、对照实验或实际项目结果。

**架构图做法（drawio-skill）：** 依据 Agents365-ai/drawio-skill 的 README。可操作材料是安装与命令、CLI 调用、自然语言提示词样例、从真实来源导入的命令、`shapesearch.py`、`aiicons.py`、自定义样式预设、CI 命令名、`raster2drawio.py`、Mermaid→.drawio。原文给出的具体数据：draw.io 桌面 CLI ≥ 30；覆盖 321 个 logo + 18 个数据存储品牌；内置 5 个预设；自检最多 2 轮、用户反馈最多 5 轮；Mermaid 支持 28 种标准类型。作者主张包括增量同步不丢弃手工布局、双状态漂移 diff、git 历史时间回放等。

**架构图做法（arch-diagram-skill）：** 依据 bassnova42/arch-diagram-skill 的 README。可操作材料是 npm 安装、插件安装、手动拷贝、自然语言触发、`<slug>.spec.json` 源文件、CLI 的 `build`/`check`/`export` 用法、支持的输出格式。原文给出的具体事实：Node ≥ 18；需要 Chrome/Chromium/Edge；视频/GIF 需要 ffmpeg；`check` 用无头 Chrome 检查元素重叠、文字溢出、连线穿过方框、标签被遮挡。未提供语义准确率、成功率、平均耗时数据。

**前端 UI 做法：** 依据 pbakaus/impeccable 的调研材料。可操作材料是安装/更新/link、`/impeccable init` 及命令表、`npx impeccable detect` 的调用形式与退出码语义、`.impeccable/config.json` 的 `detector` 键与 `ignores` 命令、内联豁免注释、必须保留跟踪的产物清单。具体数字：24 条命令、61 条确定性检测规则；退出码 `0`/`2`/`1` 的语义。作者主张包括“所有模型都在同一套 SaaS 模板上训练”。未提供使用前后的成功率、返工次数、时间节省等量化结果。

**终端内展示做法：** 依据 iamumeransari/claude-show-your-work 的 README。可操作材料是安装与更新命令、环境变量、`examples/pricing` 目录 + 两条可直接执行的命令 + 一句提示词、`show_video` 参数结构、`/img`。可当作参数事实的：视频 12 帧/秒、960 px 宽、最多 900 帧；QA summary 最多三行。只是作者主张的：“几乎不消耗 token”“Claude 自动开始展示”“两段录制逐帧同步”。

**实时特效做法：** 依据 kanaworksai-hue/effekseer-vfx-skill 的 README（32 stars）。可操作材料是安装命令、`doctor`/`setup`/`init`/`examples add`/`build`/`review`/`showcase` 命令序列、Windows 下的 `vfx.cmd` 与 `setup.ps1` 形式、`EFFEKSEER_VFX_HOME`、`vfx/texture_prompts.json`、`Vfx.play` / `Vfx.launch` 的 GDScript 用法。原文给出的具体事实：约 30 个图层原语、13 个完成态特效示例、3 个 before/after 案例、工具链约 250 MB 与官方 Godot 插件约 34 MB、build 需 macOS Apple silicon 或 Windows x64、评审无帧时约 90 秒停止、authoring 需 Python 3.11+ 或 uv。Windows ARM64 与 Linux 的 build 路径明确标注未验证。

**界面文案做法：** 依据 @ZaynHao 的一条 X 帖子。可操作材料只有两条完整规则——不要使用中点“·”作为文案分隔符、不要在界面添加冗余的解释性描述文本——以及第 3 条截断在“review”的残句。原帖自称分享 10 条提示词，并自我说明“其中一些可能带有个人经验”。帖子给出的互动数据是 304 赞、26 转发、19 回复。没有任何前后对比图、案例、改版数据或用户测试结果。

**网页设计做法：** 依据 Nutlope/hallmark 的 README。可操作材料是安装命令、`/hallmark <prompt>` / `$hallmark <prompt>` 触发、`scripts/theme.mjs deal`、`draw`、`sloplint.mjs <file-or-dir> --render`、`/hallmark redesign` / `audit`、`sloplint --before` / `--kept`、`install-hook.mjs`。原文给出的具体数据：48 个主题、755 张 Wikimedia Commons 开放授权照片、八种宽度渲染检查、三层门禁、Node 18+、`--render`/截图需 `puppeteer-core` + Chrome、MIT 许可、仓库约 3.2 万 stars。README 没有任何前后对比数据、评测结果、误报/漏报率，也没有列出 Floor / Reflex / Finish 的具体条目内容。

**设计改版做法：** 依据 Phantom-Con-Artist/unparalleled-skillset 的 README。可操作材料是安装 CLI、两个技能的分工、capture.mjs 的多宽度截图与 report.json、check-contrast.mjs 与 generate-tokens.mjs 的输入格式、Studio 的启动与 agent 工具命令、补丁的 lease/hash/undo 机制、`npm run validate-all`。原文给出的具体事实：Node.js 20+；12 个受支持助手；多文件补丁最多 12 个文件、总计 2 MiB；lease 超过五分钟用 renew；36 stars；仓库自述为 first working slice。设计禁令、“截图审查能抓住模板痕迹”是作者主张。

**B 端后台做法：** 依据 Ludi-Herry/b-end-design-system-skill 的 README。可操作材料是六类 B 端页面骨架、组件选型七大否定判据、视觉硬门禁、Cursor 的 `.cursorrules` 路径、通用 Prompt、`references/07-design-system-audit-checklist.md` 的 15 项检查、`scripts/audit-design-rules.py` 与 `components.manifest.json` 的路径。原文给出的具体数据：35 stars；15 项视觉与交互交付硬门禁；六大页面骨架；七大否定判据；0.5px 微边框、Badge 80% 浅底深字、金额列右对齐、同心圆角公式 `R_outer = R_inner + Padding`。只是作者主张的：“100% 严格执行”、弹窗固定 38.2% 黄金分割位、选项少于 5 个强制单选框。

**界面硬门禁做法（visant-skills-public）：** 依据 pedrojaques99/visant-skills-public 的 README。可操作材料是安装命令、`npm test`、`node visant-killer/scripts/killer-scan.mjs <app/src>`、`node visant-motion/scripts/motion-lint.mjs <app>`、`node visant-copy/scripts/copy-lint.mjs <file-or-folder>`、自然语言触发语、`components.json` 的 `registries` 配置。原文给出的具体事实：MIT 许可、62 stars、9 个技能；`npm test` 用 fixtures 对每条规则做正反双向验证；`killer-scan` 一次跑 4 个 gate 并输出 `gates: 4/4 ran [...]; none skipped` 和 `GATE CLOSED`。三个外部仓库结果来自作者自跑，无对照、无盲评，不足以直接采纳。

**渲染后像素门禁做法（renderlint）：** 依据 ngocanhnckh/renderlint 的调研报告。可操作材料是 `npx -y github:ngocanhnckh/renderlint init` 与 `npx renderlint`、`init` 的 6 项改动与 `--no-build` / `--no-hook`、`renderlint.config.json` 的配置、`data-renderlint-maxlength`、`data-renderlint-ignore` 与 `data-renderlint-reason`、构建脚本接法、Vite 插件、Claude Code 的 `Stop` hook（最多重试 4 次）、`--format github`、`--sweep` / `--no-sweep`、`explain` 命令。原文给出的具体数字：Node >= 18.17；37 条规则；13 档宽度（320–1920px）加每个断点两侧扫描、文本加长 50%、长单词替换成 36+ 字符无断点串、KPI/价格/计数器多三位数字；有 error 时退出码为 1；报告落在 `.renderlint/report.json`、`.report.md`、`.screens/`。作者主张包括“代码是合法的，坏的是像素”。材料没有给出误报率、漏报率、耗时数据，工具尚未发布到 npm。

**UI 还原度做法（replica）：** 依据 albertirgi/replica 的 README。可操作材料是 `npx skills add albertirgi/replica`、手工安装到 `~/.claude/skills/replica` 或项目内 `.claude/skills/replica`、`npm install --prefix ~/.claude/skills/replica/scripts`、`doctor`、`capture`/`compare` CLI、`data-replica="placeholder"`、三档级别阈值和 `report.md` / `issues.json` / 对比图。原文给出的具体数字与案例：Node 20+；只有视频/GIF 参考才需要 ffmpeg；`structure` 为 layout ≥ 90 · motion ≥ 85，`faithful` 为 layout ≥ 95 · style ≥ 95 · pixels ≥ 85 · motion ≥ 90，`exact` 为 layout ≥ 98 · style ≥ 98 · pixels ≥ 97 · motion ≥ 95；`compare` 退出码 `0` 通过、`1` 未通过、`2` 出错；8 轮上限；静图最高 8000px；demo 从 67.2 分在第 4 轮到 98.1，作者称全程 25 秒；报告样例 round 1 总分 79.8，四轴 63.7 / 94.8 / 71.2 / 89.6；自测三套 fixture。作者主张包括“agent 会写 UI 但不会检查 UI”“对同一个线上动画页面抓两次必须 100/100 匹配”。仓库 33 stars，没有第三方评测或对照实验；自测是作者自己写的测试，能证明实现与其声明一致，但不等于在别人的项目上同样有效。

**视觉构建长跑做法（cook）：** 依据 Leonxlnx/cook 的 README。可操作材料是安装命令、`/cook` / `$cook` 调用、一次性 intake、`templates/brief.md`、`templates/ROUNDS.md`、`scripts/side-by-side.mjs`、`references/` 下的 intake/target-and-bar/loop-and-critics/rules/ship 文件结构、`cook/` 状态目录。原文给出的具体数据：Node 18+、`ffmpeg` 在 PATH；主案例 Athenaion 对照 9 张 AI 生成参考图、无外部素材，约 45h、55 个子 agent（最多 12 个并行）、约 45k 行 JavaScript、约 11M 输出 token、API 等价成本约 $1.8k–$2.3k、4K 渲染在集成显卡 AMD Radeon 780M 上完成；另外列出 4 个 demo 但本材料只有链接和名称。作者主张：参考图是下限不是灵感、模型给自己打分太高、2h 就做完说明有问题、99.9% / 9/10 门槛、8h 下限、用量节奏、slop 禁列、颜色“不发灰也不过饱和”。限制：案例数字全部为作者自述，无第三方复现、无对照基线、无“成品是否被外部认可”的客观指标；README 只到 README 层面，critic 提示词、rubric、intake 问题清单在 `references/` 下未展开；门槛由 critic 给出、由人校准，主观性强。

**UI/UX 检查与验证做法（flawless-ui-ux）：** 依据 smokeeaasd/flawless-ui-ux 的 README。可操作材料是安装命令（npx/pnpm/bun）、显式宿主参数（`--codex`、`--devin`、`--claude-code --global`、`--project ./app`、`--yes`）、skills.sh 与 Bash 脚本安装、触发方式（`$flawless-ui-ux`、`/flawless-ui-ux`、`/skill:flawless-ui-ux`）、CLI 的 `context` / `inspect` / `verify` 命令、`--source` 与 `--selector`、`--viewport` 默认 1440×900 与 390×844、`npx playwright@1.64.1 install chromium`、输出 before/after 目录与 `run.json`、退出码 `0`/`1`/`2` 与安装器 `0`/`130`。原文给出的具体事实：Node 22.12+；MIT 许可；12 个受支持宿主；检查采集选定 axe 对比度和可访问名称规则、采样宽度下的计算字号与水平溢出、可见破图与未捕获 JS 错误、重复短语和箭头提示、源码中的字面像素字号等。作者主张包括“技能引导设计与实现”“精修发展预期特征”；README 没有效果数据、案例研究或基准结果。CLI 自述不覆盖完整 WCAG 合规、完整键盘旅程、业务流正确或视觉质量。64 stars，未读取 docs、evals 和实际代码，不能确认安装后在各宿主上的真实可用性和跨版本稳定性。

**界面去 AI 味做法（antislop-ui-ux-skill）：** 依据 gustavo-henriq/antislop-ui-ux-skill 的 README。可操作材料是安装命令 `cp -r skills/deslop my-app/.claude/skills/deslop`、项目级 `gosto.md`/`receitas.md`、两种模式（de-slop 已有屏幕 / 从零建屏）、先问后做 + 灰度线框 + self-contained HTML 原型 + double check / outside look / second pass 的循环、anti-token protocol、golden rule、20 组正反例画廊、10 类 80+ 模式、12 信号清单、curated sources。原文没有给出检查清单/模板正文、具体调用提示词、量化前后对比、用户研究或失败案例；34 stars 只是仓库指标。作者主张包括：ask before deciding 是主要差异化；便宜子代理和 anti-token protocol 能省 token；分层检查能提升质量。安装路径在 README 中不完全一致。

**边界状态债务做法（happy-path debt）：** 依据 @Voxyz_ai 的一条推文。可操作材料只有一段英文提示词全文和一句论断——“代理是照着 demo 写的，demo 里一切顺利，真实使用不是”。原文没有步骤、配置、案例、截图、代码库规模或技术栈说明。帖子互动数据是 71 赞、1 转发、20 回复。效果验证只有“按文件总结 before vs. now”的定性对照汇报，没有指标或判定标准。“happy-path debt”是作者自造的说法，其外延完全由提示词里五个条件界定（快加载、不失败、非空、短文案、宽屏）。“代理写 demo 代码”是作者主张，未提供验证。是否适用于非界面代码、具体框架和语言，原文未说明。

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
- [bassnova42/arch-diagram-skill](../research/radar/2026-10-29/8160-bassnova42-arch-diagram-skill.md)：值得一试，建议小范围试用：按 README 将 arch-diagram 安装到 Claude Code/Codex，选一个公开仓库或技术文章生成架构图，并用 check 自检加人工语义对照验证。理由是它给出了安装、提示词、spec 编辑和 build/check/export 的完整可照做流程，但现有材料只有 README，缺少准确率、效率提升等独立证据。
- [pedrojaques99/visant-skills-public](../research/radar/2026-10-30/8396-pedrojaques99-visant-skills-public.md)：值得一试，先在一个自有前端仓库里安装 visant-killer 并运行 killer-scan，把每条 FAIL 交给人工复核误报率，再决定是否纳入手册；它的安装命令、脚本入口、依赖条件和「脚本做硬性校验 + 模型做判断」的分工都可直接照做，但目前只能看到 README，检测器规则目录与 SKILL.md 正文不可见，效果只有作者自述，因此还不足以采纳。
- [ngocanhnckh/renderlint](../research/radar/2026-10-31/8762-ngocanhnckh-renderlint.md)：值得一试，建议在一个前端项目里小范围试用：按原文把 init 跑起来，并把“UI 改动后 npx renderlint 必须 0 error”设为门禁；原因是原文给出了可直接复制的命令、配置、代理提示词和量化验证口径，但效果数据全部来自作者自测、工具尚未发布到 npm，误报率与耗时需自行验证。
- [Leonxlnx/cook](../research/radar/2026-11-03/9673-leonxlnx-cook.md)：值得一试，先按 README 把 cook 安装为 Claude Code / Codex 的 skill，再用一个只有 2–3 张参考图的小型视觉任务跑 2–3 轮，验证“参考图定标 + 每维分数门槛 + 零上下文评审打分 + 每轮对比图 + 人工只把最终渲染关”这条循环是否真的减少返工。值得试的理由是它给出了可直接复制的安装命令、调用方式、8 步循环、状态目录和对比脚本；不能直接 adopt 的理由是证据只有作者自述的一次高成本 demo（约 $1.8k–2.3k），且场景限于视觉构建。
- [albertirgi/replica](../research/radar/2026-11-03/9853-albertirgi-replica.md)：值得一试，建议小范围试用：按 README 的安装命令装好 skill，挑一个页面里的单个组件（如 hero 或卡片）以 faithful 级别跑 3–4 轮 capture/compare，用分数曲线和人工抽检判断闭环是否真能收敛。理由是它把“UI 还原得像不像”从口头判断变成 layout/style/pixels/motion 四轴可复现分数与按收益排序的修复清单，步骤、命令和阈值都可照做；但只覆盖 Web、证据基本来自作者自测，所以先小范围试而非直接采用。
- [smokeeaasd/flawless-ui-ux](../research/radar/2026-11-07/11125-smokeeaasd-flawless-ui-ux.md)：值得一试，建议小范围试用：在现有前端项目中安装该技能，让编程智能体按创建、重设计、精修、评审流程工作，并用 context、inspect、verify 做前后对比。理由是安装、调用和检查命令具体可照做，但 README 没有给出效果数据，CLI 也不覆盖完整可访问性、键盘流程、业务正确性和视觉质量。
- [gustavo-henriq/antislop-ui-ux-skill](../research/radar/2026-11-12/12725-gustavo-henriq-antislop-ui-ux-skill.md)：值得一试，建议在一个小型 UI 页面或原型上小范围试用：按 README 安装 skill，先填写项目的 gosto.md 和 receitas.md，再走“定位 slop 信号→提问并给灰度线框→实现→多层检查”的循环；理由是安装命令和流程较明确，但原文未提供检查清单/模板正文和效果数据，暂不宜直接 adopt。
- [@Voxyz_ai: If you still think Claude Code and Codex 𝘀𝘂𝗰𝗸 𝗮𝘁 𝗽𝗼𝗹𝗶𝘀𝗵, try this:](../research/radar/2026-11-12/12888-if-you-still-think-claude-code-and-codex-try-this.md)：值得一试，把这条提示词原样用在一个干净分支上，按组件小步跑、每轮人工审 diff——它把“界面只在 demo 条件下才正常”这类隐性缺陷变成了可以直接交给编码代理的检查清单和修复任务，但依据只有一条推文，没有案例或数据，先小范围试再决定是否写进手册。
