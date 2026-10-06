# VoltAgent/awesome-design-md

- 结论：**值得一试**。在一个已有的前端项目里小范围试：把某网站的 DESIGN.md 拷到项目根目录，再让编码智能体按它生成一个页面，用视觉一致性对比来判断是否比不提供设计上下文更好。理由是它给出了可直接照做的两步流程和明确的文件结构，但原文只展示清单与章节表，没有给出任何生成效果或质量数据。
- 原文：https://github.com/VoltAgent/awesome-design-md
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T06:51:07.279Z

## 是什么

`VoltAgent/awesome-design-md` 是一个 curated 仓库，收集了 73 份从真实网站提取的 `DESIGN.md` 文件（README 徽章标注 `DESIGN.md count-73`）。

`DESIGN.md` 是 Google Stitch 提出的概念：一份纯文本（Markdown）设计系统文档，AI 智能体读取它来生成视觉一致的 UI。原文把它与 `AGENTS.md` 作对照：

| 文件 | 谁读 | 定义什么 |
|------|------|----------|
| `AGENTS.md` | 编码智能体 | 项目怎么构建 |
| `DESIGN.md` | 设计智能体 | 项目应该长什么样、什么感觉 |

它的定位是“上下文供给”：不需要 Figma 导出、JSON schema 或额外工具，只是一个放进项目根的 Markdown 文件。README 列举了覆盖 AI/LLM、开发者工具、后端与 DevOps、生产力 SaaS、设计工具、金融科技、电商、消费科技、汽车，以及 1990s 复古网站等分类的条目，每条对应 `getdesign.md/<site>/design-md` 链接。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：有一个用 AI 编码智能体（原文明示的场景包括各类 AI coding agent 与 Google Stitch）协作开发的前端项目，且能访问网络下载文件或手工复制文本。

1. 选一份 `DESIGN.md`。从 README 的 Collection 列表中挑一个风格接近你目标的站点条目，打开其 `getdesign.md/<site>/design-md` 链接。例如原文列出的 `Linear`、`Vercel`、`Stripe`、`Notion`、`Supabase` 等。

2. 把该文件放到项目根目录。原文原话：

```
Copy a site's DESIGN.md into your project root
```

仓库为每个站点提供三类文件：

```
DESIGN.md            设计系统（智能体读取的文件）
preview.html         视觉目录：色板、字号阶梯、按钮、卡片
preview-dark.html    同上，深色表面版本
```

建议在粘贴前先打开 `preview.html` 目视确认风格是否符合预期。

3. 告诉你的 AI 智能体使用它。原文给出的指令原样为：

```
build me a page that looks like this
```

（原文说明：`Copy a DESIGN.md into your project, tell your AI agent "build me a page that looks like this," and generate high-quality UI that stays visually consistent with the design language.`）

4. 按需向仓库提需求。README 提到可以对指定网站申请一份 DESIGN.md，包括仅交付给你的私有请求：`https://getdesign.md/request`。

5. 若发现现有文件有误，可按 CONTRIBUTING.md 反馈：修正错误颜色、缺失 token、描述薄弱处；提 PR 前先开 issue 与维护者讨论。

每份 DESIGN.md 遵循 Stitch DESIGN.md 格式并扩展为 9 个章节（原文表格）：

| # | 章节 | 记录内容 |
|---|------|----------|
| 1 | Visual Theme & Atmosphere | 情绪、密度、设计哲学 |
| 2 | Color Palette & Roles | 语义名 + hex + 功能角色 |
| 3 | Typography Rules | 字体族、完整层级表 |
| 4 | Component Stylings | 按钮、卡片、输入、导航及各种状态 |
| 5 | Layout Principles | 间距尺度、网格、留白哲学 |
| 6 | Depth & Elevation | 阴影系统、表面层级 |
| 7 | Do's and Don'ts | 设计护栏与反模式 |
| 8 | Responsive Behavior | 断点、触控目标、折叠策略 |
| 9 | Agent Prompt Guide | 快速颜色参考、可直接使用的提示词 |

注意第 9 节本身就是“给智能体的提示词指南”，如果拿到文件，应先读这一节看有没有可直接复制的提示词。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：把“定义 UI 视觉规范”这件事交给智能体，前提是先供给一份结构化设计文档。原文的价值主张是：不给设计上下文只能得到“surface-level outputs”，给了则能生成“high-quality UI that stays visually consistent with the design language”。这提示了一类容易忽略的任务——让智能体负责风格一致性，而不只是功能实现。
- **任务匹配**：面向“设计智能体”与编码智能体两类读物（DESIGN.md vs AGENTS.md），适用于前端 UI 生成场景。原文明示的承接方为各类 AI coding agent 和 Google Stitch。
- **条件供给**：这是原文最实的部分——供给物是一个放在项目根的 Markdown 文件，内容包含色板语义角色、字体层级、组件状态、间距尺度、阴影层级、断点、护栏与提示词指南。无需 Figma 导出或 JSON schema。
- **主动推进**：原文没有涉及触发机制或持续执行。
- **效果验证**：原文只给出定性说法（视觉一致、非表层输出），没有给出任何指标、对比实验或案例数据。`preview.html` / `preview-dark.html` 可以作为人工比对基准使用，但原文并未把它描述为验证手段。

## 与已有做法的关系

清单中有两条相关条目：

- **Cursor**（状态 watch）：属于原文所说的“AI coding agent”范畴，是 DESIGN.md 的目标读者之一，README 的 Collection 里也直接收录了 Cursor 的设计文档条目。
- **OpenCode**（状态 watch）：同上，README 的 Collection 中也收录了 OpenCode AI 的条目。

此外原文明确区分了 `AGENTS.md`（定义怎么构建）与 `DESIGN.md`（定义长什么样），可视为对现有项目级上下文文件做法的一次分工细化。除此之外，清单中没有其他直接相关条目。

## 证据与局限

**原文给出的可核验信息**：
- 仓库徽章标注 `DESIGN.md count-73`（73 份文件），以及 last-commit 徽章。
- 每份文件的具体组成（DESIGN.md + preview.html + preview-dark.html）与 9 个章节结构表。
- 每个分类下大量具体站点清单及其风格描述（如 Linear “Ultra-minimal, precise, purple accent”，Stripe “Signature purple gradients, weight-300 elegance”）。
- 系统提供的元数据显示 star 数为 119716。README 自述 “Ranked #150 globally on GitHub”。

**只是作者主张、没有数据的部分**：
- “generate high-quality UI”“Built with real design depth … not surface-level outputs”属于仓库自我描述，原文未提供任何生成结果对比、评分或用户反馈。
- “any AI coding agent … instantly understands”属于断言，没有测试证据。
- 仓库自称“extracted from real websites”且“design tokens represent publicly visible CSS values”，但没有说明提取方法与校验方式。

**适用条件与风险**：
- 只适用于有 UI 产出需求的项目，与后端、数据、运维类工作无关。
- 依赖外部链接 `getdesign.md/*` 获取文件本身；给定材料中没有 DESIGN.md 的正文样本，所以本章无法给出其内部实际写法。
- 复制的是第三方网站（Airbnb、Apple、Stripe、Ferrari 等）的视觉识别，README 声明“We do not claim ownership of any site's visual identity”，并说明文件按 “as is” 提供、无担保。用于商业产品时需要自行判断品牌与法律风险。
- README 中有相当篇幅是赞助商与生态工具推广（EveryFeed、launchkit、mobile starter kit、赞助位），与研究主题无关，不构成证据。

## 怎么试、怎么验证

**最小试用方式**

1. 选一个风格明确、你能判断好坏的单一页面任务（例如一个定价页或设置页），不要一上来改造整个产品。
2. 建两个分支或在同一项目里先后跑两次，只改变一个变量：
   - A 组：不提供 DESIGN.md，用你平时的方式让智能体生成该页面。
   - B 组：把一份 DESIGN.md 放到项目根目录，用原文指令让智能体生成同一页面。
3. 同时打开该站点的 `preview.html` 作为参照物，人工核对 B 组输出在颜色、字体层级、按钮状态、间距上是否与文档一致。
4. 记录 B 组是否出现“文档里有但没用上”的 token，以及智能体是否需要额外提醒才会遵守。

**判断有没有改善的指标（全部可人工统计，不依赖原文未提供的数据）**

- 需要人工返工的次数：同一页面上你手动改颜色/间距/字体的次数，B 组应显著少于 A 组。
- 一致性命中率：抽样检查文档中明确定义的 token（色值、字号、间距、圆角、阴影），统计输出中实际使用的比例。
- 首轮可用率：第一版生成后无需调整设计规范、只需改业务逻辑即可接受的比例。
- 上下文是否被读到：让智能体在生成前先复述第 9 节 Agent Prompt Guide 的内容，能准确复述说明文件确实进入了上下文。
- 提示词成本：B 组为达到可用状态所消耗的对话轮数，若与 A 组持平甚至更高，说明收益不足。

**止损条件**

若在 2–3 次不同页面的对比中，B 组在上述指标上都没有稳定改善，或频繁出现文档未定义的风格漂移，则把它降级为“读一读 DESIGN.md 的章节划分方式、用在自己的 AGENTS.md 里”，而不必继续采用这份第三方文件。
