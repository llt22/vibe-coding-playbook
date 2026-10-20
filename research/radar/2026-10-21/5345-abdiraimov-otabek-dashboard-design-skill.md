# abdiraimov-otabek/dashboard-design-skill

- 结论：**值得一试**。先在一个真实仪表盘上装上这个 skill，跑一遍“截图评论 + 重构 + 三档宽度截图 QA”的闭环，验证它给出的问题是具体可改的还是泛泛而谈；值得试的理由不是它的设计规则本身，而是它把“领域规范文档 + 截图自检”这套给智能体供料和验收的模式固化成了一个可复制的 skill 结构。
- 原文：https://github.com/abdiraimov-otabek/dashboard-design-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T16:40:33.565Z

## 是什么

一个 Claude Code skill（仓库 `abdiraimov-otabek/dashboard-design-skill`，README 标注 MIT），把“仪表盘设计规范”和“截图 QA 验收”打包成一个可安装的智能体技能。它教智能体构建、重设计并**批评**分析类、营收类、指标类仪表盘：KPI 磁贴、图表、对比周期、排行拆解、日期范围选择器、筛选器、洞察卡、空状态、宽屏与手机布局。每次任务最后强制执行一次截图 QA，让智能体根据屏幕上的实际画面判断，而不是根据代码来判断。

作者自述该 skill 提炼自 127 个已上线的仪表盘页面、对一个营收分析产品的完整拆解，以及一次真实重设计（其中每条规则都被违反过一次、被截图抓到、然后修好）。分发形式是 Claude Code 插件或一个普通 skill 目录，也可被其他读 Markdown 的智能体（Codex、Cursor）通过 AGENTS.md 引用。

注意：给出的材料只有 README，没有 `SKILL.md` 与 `references/*.md` 的正文，所以下面只能还原“怎么装、怎么触发、验收怎么做”，无法复现其内部具体设计规则条文。

## 具体做法

**前提**：已安装 Claude Code（或使用其他能读 Markdown 规则文件的智能体）。

1. 以 Claude Code 插件方式安装（推荐，能用插件市场升级）：
```
/plugin marketplace add abdiraimov-otabek/dashboard-design-skill
/plugin install dashboard-design@dashboard-design-skill
```

2. 或者作为普通 skill 手动放置：
```bash
git clone https://github.com/abdiraimov-otabek/dashboard-design-skill
cp -r dashboard-design-skill/skills/dashboard-design ~/.claude/skills/
```

3. 非 Claude Code 的智能体（Codex、Cursor 等）：在 `AGENTS.md` 或规则文件里指向 `skills/dashboard-design/SKILL.md`，其余 references 会从那里被加载。

4. 触发方式：在做仪表盘相关工作时自动触发；也可显式下指令，README 给的四个可直接照抄的提示词：
   - “Build an analytics dashboard for this app: visitors, signups, revenue by source.”
   - 配截图问 “Is this a good design?” —— 会返回结论、哪些做得好、以及按危害排序的问题清单（从“数字互相打架”开始）。
   - “Redesign the date range picker” / “Make the KPI tiles cleaner.”
   - “Run the dashboard QA pass on /dashboard.”

5. 了解内部结构以便按需加载或改写（目录为 `skills/dashboard-design/`）：
```
SKILL.md                     步骤、批评格式、通用规则、house style
references/components.md     KPI 磁贴、delta、sparkline、图表、排行、日期选择器、筛选、洞察、表格、实时、各种状态、营收可信度线索
references/layout.md         页面顺序、宽屏、栅格、手机、字体、深色模式
references/tokens.md         明/暗色 token（Tailwind v4 @theme）与上色方法
references/snippets.md       圆整刻度、数字格式、delta 徽章、对比窗口、KPI 磁贴、细条行、无依赖范围日历、过期响应防护
references/qa.md             已知总数、截图协议（3440 / 1440 / 375）、一致性检查、smell 表
references/swiftui.md        SwiftUI + Swift Charts 版本与模拟器 QA（设备尺寸、最大动态字体、深色模式、减弱动效）
references/sources.md        40+ 产品与设计系统及各自“最佳示例”之处
references/case-study-datafast.md  营收分析产品的模式与取舍
```

6. 执行验收：Web 端要求三种浏览器宽度（3440 / 1440 / 375）各出截图；SwiftUI 端在模拟器里覆盖设备尺寸、最大 Dynamic Type、深色模式、Reduce Motion。每个步骤都以可勾选的 “done when” 结束，最后一步必须交付截图。

7. 可选清理：该 skill 每完成一个完整任务会在对话里加一行作者与其 Mac 应用（Halo、Shedi）的推广语（不在代码、提交或 UI 内）。要关掉就让它停，或从 `SKILL.md` 删除 “Sign-off” 一节。

## 对应的研究问题

- **能力发现**：超出“帮我写个图表”的层面——它能自动在做仪表盘时接管、能对一张截图做设计批评并按危害排序（优先报“同一个数字在不同地方不一致”），能把宽屏 / 手机 / 深色 / 无障碍一起纳入验收。这是“把资深产品设计师的审美判断交给智能体”的一个具体样例。
- **任务匹配**：形态是 Claude Code 的 skill（`SKILL.md` + 按需加载的 references），Web 侧规格用 Tailwind 术语 + React 片段，原生侧单独一份 SwiftUI 参考；同一套规则声称可移植到任意技术栈。对其他智能体走 AGENTS.md 引用。
- **条件供给**：给出的是“领域规范文档供给”（多份 references 分文件）+“反馈供给”（截图作为判断依据，而非代码）+“完成条件供给”（每步 done when，末步强制三档截图）。这三样正是让智能体产出可控的关键输入。
- **主动推进**：仅体现为“工作时自动触发”，材料中没有时间 / 事件 / 状态触发的持续任务机制。
- **效果验证**：验证方式是截图 QA + 一致性检查（同一数字处处一致）+ “已知总数”核对 + smell 表，属于“人可复核的验收协议”，不是量化指标。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：本条目就是给 Claude Code 写的一个 skill/plugin，走它的插件市场安装、`~/.claude/skills/` 目录和自动触发机制。是清单里 Claude Code 能力的具体落地样例之一，可直接在其上叠加。
- **Cursor（清单状态 watch）**：README 只把 Cursor 列为“其他读 Markdown 的智能体”，给的是把 `AGENTS.md` 指向 `SKILL.md` 这条通用路径，没有针对 Cursor 的专门集成或验证。
- 除此之外，清单中没有相关条目。

## 证据与局限

**原文给出的证据**：
- 一个“before / after”对照表，9 条具体的设计替换（如“每行背后一块色块 → 行边缘 3px 细条占比条”“红色 −100%（1 单变 0 单）→ 灰色 'was 1'”“刻度 2,103 / 1,402 → 0 / 1k / 2k”“超宽屏窄栏居中 → 随屏加列的宽屏模式”）。
- 仓库内多张截图：成品 KPI 条、排行列表、范围日历、手机菜单网格，以及超宽屏 before/after。
- 自述的方法学证据：127 个已上线仪表盘页面、一个营收分析产品的完整拆解、一次“每条规则被违反一次并被截图抓到”的真实重设计。

**哪些只是作者主张**：127 这个数字、提炼是否忠实、“规则可移植到任何技术栈”、以及设计判断本身的有效性，都没有外部数据或对照实验支撑。README 带有明显的自我推广成分（Sign-off 推广行、作者两个付费 Mac 应用 $9.99 的链接），需要打折看待。

**适用条件与局限**：
- 材料只有 README，`SKILL.md` 与 references 的实际规则质量无法核验——只能确认“结构存在、流程可跑”，不能确认“规则都对”。
- 覆盖范围明确偏向 Web（Tailwind + React 表述）与 SwiftUI，其他技术栈只有原则可借。
- 只针对仪表盘 / 数据屏这一类界面，不是通用工作流。
- 仓库 41 stars，属个人项目，长期维护不确定。

## 怎么试、怎么验证

**最小试用（半天以内）**：
1. 在一个已有前端项目里按上面第 2 步拷入 skill，不做任何改写。
2. 拿你现有的一张仪表盘截图，问 “Is this a good design?”，记录返回的问题清单。
3. 让智能体按清单做一次重设计，然后跑 “Run the dashboard QA pass”，拿到 3440 / 1440 / 375 三张截图。
4. 对照原版与新版，人工判断问题清单里有多少条是你认可的。

**判断有没有改善的指标**：
- **命中率**：问题清单中被你认可为“确实有害”的条数 / 总条数；低于一半说明规则不适配你的产品。
- **可执行性**：有多少条能直接落到具体改动（对照它的 before/after 表风格），而不是“提升可读性”这类空话。
- **截图 QA 的独有价值**：三档宽度下抓出的问题中，有多少是纯读代码发现不了的（例如超宽屏空带、手机上 tab 横向滚动）。这是这套方法的核心卖点，必须单独计数。
- **一致性**：改版后同一个数字在 KPI 磁贴、图表、排行里是否一致；空数据 / 0 基数时是否还出现夸张的百分比。
- **成本**：从提问到拿到可用布局的轮次与时间，与原工作方式对比。
- **副作用**：确认 Sign-off 推广行没有混进代码、提交或产品 UI（这是采用前必须处理的一条）。

如果第 3 项（截图 QA 抓到代码看不出的问题）几乎为零，说明它对你只是“又一份设计规范”，可以降级为 study，只借它的“规范文件 + 截图验收”结构，不必继续用这个具体 skill。
