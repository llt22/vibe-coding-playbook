# 照着参照物重建页面：先测量规格，再重建，用像素 diff 闭环验收

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：让 AI 做“照着某个真实页面复刻一遍”这类任务时，不再靠猜字体、颜色和间距，也不再靠“看起来差不多”验收，而是从参照物里量出规格、按规格重建、用机器可比的差异指标反复收敛。
> 先试这一步：选一个你自己拥有的、结构中等复杂的页面（有 header、若干 section、响应式布局、自定义字体），按安装步骤装好 copycat 后先只跑 capture，打开生成的 REPORT.md，看抽到的字体、配色、断点是否完整——这一步不用等重建就能判断“测量”环节可不可信。
> 最近修订：2026-10-02

## 解决什么问题

AI 做“照着某个真实参照物做一遍”的任务时，最容易滑向猜：猜字体、猜颜色、猜边距，然后用“看起来不错”当验收标准。这本手册给的是一套可照做的流程——先从参照物里把规格量出来，再按规格重建，最后用机器可比的差异指标自动比对、循环修正。本次给出的完整抓手是网页克隆场景（minosdevs/copycat-skill）；“先测量、再重建、再自动比对”这个结构本身可以迁移到其他有明确对照物的 AI 任务，但迁移部分原调研并未给案例，属于未验证的外推。

## 适用与不适用

**适用**

- 存在“可机器测量的 ground truth”的任务：有一个能打开的参照页面，规格可以从浏览器里读出来。
- 目标是自己的站点，或纯学习、原型、重建自己站点的场景。
- 需要复用一套已被验证的“安装 → 抓取 → 重建 → 比对”工具链，而不是每次都手抄 DevTools。
- 反爬站点可在加 `--channel chrome|msedge` 的条件下尝试。

**不适用或需谨慎**

- 在生产中复用第三方的 logo、照片、文案或品牌资产——README 明确说不行。
- 需要登录、付费墙或凭据的站点：copycat 不输入凭据、不绕过登录或付费墙。
- 没有客观对照物的任务：这套方法的价值几乎全部来自“有个能测量的参照物”。
- 只有 README、没有第三方评测：仓库仅 37 stars，属小型个人项目，先小范围验证再决定是否长期采用。

与已有做法的关系：copycat 不是独立工具，而是 Claude Code 的一个 skill（安装在 `~/.claude/skills/copycat` 或 `.claude/skills/copycat`，也可脱离 Claude 直接跑脚本）。可以把它理解为给 Claude Code 补上“从浏览器实测规格 + 像素级自动验收”的工具链。

## 前置条件

- Node ≥ 18。
- Claude Code（skill 形式安装；也可以不依赖 Claude，直接调用仓库脚本）。
- Playwright chromium（第 2 步里安装）。
- 被克隆的站点可正常访问，页面能打开。
- 验证阶段需要一个已经在本地跑起来的克隆地址（示例中为 `http://localhost:3000`）。
- 合规前置：先确认目标站点和用途符合 README 的法律边界（自己站点 / 学习 / 原型可以；复用第三方品牌资产不可以）。

## 操作步骤

### 1. 安装 skill（选一个安装位置）

个人级，所有项目可用：

```bash
git clone https://github.com/minosdevs/copycat-skill ~/.claude/skills/copycat
```

或项目级：

```bash
git clone https://github.com/minosdevs/copycat-skill .claude/skills/copycat
```

预期结果：对应目录下出现 copycat 的内容。**怎么选**：只在一个项目里做实验选项目级；想在所有项目里复用选个人级。

### 2. 安装脚本依赖（只需一次）

```bash
cd ~/.claude/skills/copycat/scripts && npm install && npx playwright install chromium
```

预期结果：npm 依赖装好，chromium 下载成功。若选的是项目级安装，把 `cd` 的路径换成 `.claude/skills/copycat/scripts`。

### 3. 先只做“测量”——capture 原站

```bash
node scripts/capture.mjs https://example.com --out copycat/example.com
```

前提：脚本依赖已装好。预期结果：生成 `copycat/example.com/REPORT.md`，其中包含抽取到的 `@font-face` 与字体文件、CSS 变量、调色板、字号体系、容器、断点、sticky 元素、keyframes 与过渡、按渲染尺寸的图片、内联 SVG、meta 标签、console 与网络错误，以及站点真实的 CSS 文件和文本内容。

**这一步本身就是一次验收**：不必等重建完成，先看抽取到的字体、配色、断点是否完整，就能判断“测量”环节可不可信。

### 4. 触发重建（两种做法，按需选）

**做法 A：在 Claude Code 里直接用自然语言触发**，由 Claude 走完整流程（capture → read → foundations → sections → verify → deliver）。

```
clone https://example.com
```

```
make me exactly the same landing page as https://example.com
```

README 说触发词包括 “copy”“clone”“replicate”“make the same as X”。

**做法 B：自己跑脚本、自己控制重建环节**，只用脚本的客观采集与度量能力，第 3 步的 capture 加上第 5 步的 compare，重建按测量值自上而下逐 section 做。

**怎么选**：想让 Claude 接管从采集到交付的整条链路，用做法 A；只想要脚本的测量与比对、重建想自己掌控，用做法 B。

预期结果（两种做法相同）：得到一个在布局、字体、颜色、间距、响应式行为、hover 状态和动画上与原站视觉一致的本地复现页面。默认输出静态 HTML/CSS/JS；仓库本身用 Next.js 时用 Next.js。

### 5. 把克隆跑起来，做自动比对

```bash
# 1. 抓取原站 → copycat/example.com/REPORT.md（同第 3 步）
node scripts/capture.mjs https://example.com --out copycat/example.com

# 2. 把克隆与原站对比 → copycat/example.com/compare/REPORT.md
node scripts/compare.mjs --original copycat/example.com --clone http://localhost:3000
```

前提：第二步要求克隆已经在本地跑起来（示例中为 `http://localhost:3000`）。预期结果：`copycat/example.com/compare/REPORT.md` 里给出每个视口的像素 diff、最差区域映射回具体 section、设计 diff（缺失字体/颜色/标题/CTA）、克隆页自身的 console，以及 A–D 评级。README 给的目标是不匹配 < 2% 且 0 个 console 错误。

### 6. 按 diff 报告修正，循环

流程是：像素 diff → 最差区域映射到 section → 修正 → 再 diff。这是由“比对结果”这一状态驱动的迭代闭环，不是外部事件触发。预期结果：不匹配率逐步下降、console 错误清零，并记录需要几轮才收敛。

### 7. 可选：只想拿设计令牌，不装 skill

把 `scripts/extract.browser.js` 原样粘进 DevTools 控制台，然后执行：

```js
copy(JSON.stringify(__copycatExtract(), null, 2))
```

预期结果：页面的设计令牌进入剪贴板。

### 8. 常用 capture 参数（README 列出的全部）

- `--depth 1`：抓取导航里的页面，配 `--max-pages 8` 限页数
- `--viewports desktop,mobile` 或 `--viewports large:1920x1080,desktop`
- `--scale 2`
- `--dark`
- `--locale en-US`
- `--wait 3000`
- `--videos`
- `--channel chrome|msedge`（用真实安装的浏览器，应对有反爬保护的站点）
- `--headed`
- `--no-hover`

### 9. 关键参考文件

| 路径 | 作用 |
|---|---|
| `SKILL.md` | Claude 遵循的工作流（capture → read → foundations → sections → verify → deliver） |
| `scripts/capture.mjs` | 拍摄并解剖原站 |
| `scripts/compare.mjs` | 度量克隆 vs 原站（像素 diff、字体、调色板、字号体系、console） |
| `scripts/extract.browser.js` | 页内设计令牌抽取器 |
| `references/fidelity-checklist.md` | 让克隆“看起来假”的 40 个细节 |
| `references/rebuild-recipes.md` | 现成配方：`@font-face`、滚动显现、sticky header、汉堡菜单、logo 跑马灯、FAQ 手风琴等 |
| `references/troubleshooting.md` | 被拦截站点、白屏、404 字体、被代理图片、Lenis 平滑滚动等 |

注意：`SKILL.md` 与 `references/` 是法语写的，Claude 能读，回答会用你的语言。

## 怎么判断变好了

**最小试用（半天内可完成）**

1. 选一个**自己拥有**的、结构中等复杂的页面作为目标（有 header、若干 section、响应式布局、自定义字体），避免一上来选反爬站点。
2. 按第 1、2 步安装，确认 `npx playwright install chromium` 成功。
3. 跑 capture，打开 `copycat/<域名>/REPORT.md`，检查字体、配色、断点是否完整——这一步不用等重建。
4. 完成重建并在本地起服务，跑 `compare.mjs`，打开 `compare/REPORT.md`。
5. 记录不匹配率、console 错误数、评级，以及最差区域集中在哪些 section。
6. 首轮不达标就按报告修一轮再 compare，记录需要几轮才收敛。

**可观察的指标**

- 像素不匹配率：是否趋近 README 给出的 < 2% 目标（注意这是作者自定义阈值，不是外部基准）。
- console 错误数：是否为 0。
- 达到可接受结果所需的人工修正次数与迭代轮数：和“自己手写同一页面”的耗时对比。
- 抽取阶段的设计令牌完整度：字体、配色、断点是否与原站一致，有无明显漏项。
- `REPORT.md` 中“最差区域 → section”的映射是否准确——这是判断验证环节本身可不可信的关键。

**试多久**

首轮跑通加一到两轮修正，半天量级。若试用结果良好，可把这套“先测量参照物 → 再重建 → 用客观 diff 闭环验收”的结构抽成通用模式，套到其他有可测量对照物的 AI 任务上；若首轮就需要大量人工干预、或 REPORT.md 的映射不可信，则降级为只做了解（study），不要写进日常流程。

## 常见坑

- **验收阈值是作者自定义的**：`< 2%` 和 A–D 评级未说明算法细节，不要当成行业标准或对外承诺。
- **证据强度有限**：仓库仅 37 stars、小型个人项目、无第三方评测；本次输入只有 README，未能核查实际脚本行为。
- **语言成本**：`SKILL.md` 与 `references/` 为法语，Claude 能读、回答用你的语言，但可能影响维护与二次修改。
- **README 里的能力主张未被验证**：视觉“indistinguishable”、对懒加载与滚动显现、cookie 横幅（用 CSS 隐藏、绝不点接受）、超出原生截图高度的页面（逐屏拼接）、跨域样式表、CSS 相对路径字体、图片代理（`/_next/image?url=`）、内联 SVG logo 的处理，以及 fidelity-checklist 里“40 个细节”的具体内容——原文只列了文件名，没有展开，也没有给出任何示例 REPORT.md、失败案例或对比数据。这些只是作者主张。
- **合规红线**：为学习、原型或重建自己的站点而克隆是常见做法；在生产中复用第三方的 logo、照片、文案或品牌则不行。copycat 不输入凭据、不绕过登录或付费墙；克隆不是用于自己站点时会提示把品牌资产换成占位符。
- **compare 需要一个跑起来的克隆**：`--clone` 指向的本地服务必须先起好，否则比对无从谈起。
- **反爬与等待**：被拦截的站点用 `--channel chrome|msedge` 走真实安装的浏览器；页面需要等待时用 `--wait 3000`。
- **别急着推广**：首轮就大量人工干预，或 REPORT.md 的“最差区域→section”映射不可信时，说明验证环节本身不可靠，先降级为 study。

## 证据与来源

- **可直接照做的部分**（依据调研《minosdevs/copycat-skill》，source_note 标注“依据仓库 README”）：完整安装命令、`capture.mjs` 与 `compare.mjs` 的调用方式、全部 capture 参数、DevTools 抽取代码片段、文件职责表、四步工作流（capture → extract → rebuild → verify），以及“< 2% 不匹配 + 0 console 错误、A–D 评级”这一验收目标。
- **仅为作者主张、无外部证据**：视觉“indistinguishable”；对懒加载、滚动显现、cookie 横幅、超长页面拼接、跨域样式表、图片代理、内联 SVG 的处理能力；fidelity-checklist 中 40 个细节的具体内容。原文无示例 REPORT.md、无失败案例、无对比数据。
- **模式外推、未验证**：把“先测量参照物 → 重建 → 客观 diff 闭环验收”迁移到网页克隆以外的 AI 任务，是调研中的建议方向；原文只支持到网页克隆这一层，没有延伸案例。
- **局限记录**：仓库 37 stars；`< 2%` 与 A–D 为作者自定义阈值且未说明算法；`SKILL.md` 与 `references/` 为法语；使用范围受 README 法律段落限制。

## 依据的调研

- [minosdevs/copycat-skill](../research/radar/2026-10-01/27-minosdevs-copycat-skill.md)：值得一试，按 README 的安装步骤在本地装好这个 Claude Code skill，先拿自己拥有的站点或一个结构简单的公开页面跑一轮 capture→重建→compare，用 REPORT.md 里的像素差异率和 console 错误数判断效果。它值得试是因为把“从真实页面测量设计令牌 + 用像素 diff 自动闭环验证”写成了可复制的命令和流程，而这套“先测量、再重建、再自动比对”的做法可以迁移到其他有明确对照物的 AI 任务；但项目只有 37 星、指标全由作者自定义，所以先小范围验证再决定是否写进手册。
