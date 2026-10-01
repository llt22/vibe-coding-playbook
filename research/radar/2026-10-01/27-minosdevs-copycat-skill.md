# minosdevs/copycat-skill

- 结论：**值得一试**。按 README 的安装步骤在本地装好这个 Claude Code skill，先拿自己拥有的站点或一个结构简单的公开页面跑一轮 capture→重建→compare，用 REPORT.md 里的像素差异率和 console 错误数判断效果。它值得试是因为把“从真实页面测量设计令牌 + 用像素 diff 自动闭环验证”写成了可复制的命令和流程，而这套“先测量、再重建、再自动比对”的做法可以迁移到其他有明确对照物的 AI 任务；但项目只有 37 星、指标全由作者自定义，所以先小范围验证再决定是否写进手册。
- 原文：https://github.com/minosdevs/copycat-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T15:26:38.605Z

## 是什么

copycat 是一个 Claude Code skill（仓库 minosdevs/copycat-skill，MIT，37 stars），输入一个 URL，输出一个在布局、字体、颜色、间距、响应式行为、hover 状态和动画上与原站视觉一致的本地复现页面。

它的核心主张是：平均水平的克隆和完美克隆的差别在于**测量**——不猜字体、颜色、边距，全部从浏览器读取；也不用“看起来不错”来判断，而是做像素 diff 并读 console。

README 描述的四步流程：

1. **Capture**（Playwright）：整页截图、桌面/平板/手机逐屏截图、每个 section 一张裁剪图、hover 状态、可选视频。
2. **Extract**：抽取浏览器能暴露的一切——`@font-face` 与字体文件、CSS 变量、调色板、字号体系、容器、断点、sticky 元素、keyframes 与过渡、按渲染尺寸的图片、内联 SVG、meta 标签、console 与网络错误，以及站点真实的 CSS 文件和文本内容。
3. **Rebuild**：按测量值自上而下逐 section 重建（默认静态 HTML/CSS/JS，仓库本身用 Next.js 时用 Next.js）。
4. **Verify**：循环验证——每个视口的像素 diff、最差区域映射回 section、设计 diff（缺失字体/颜色/标题/CTA）、克隆页自身的 console。给出 A–D 评级，目标是不匹配 < 2% 且 0 个 console 错误。

README 还声称处理了懒加载与滚动显现、cookie 横幅（用 CSS 隐藏、绝不点接受）、超出原生截图高度的页面（逐屏拼接）、跨域样式表、CSS 相对路径字体、图片代理（`/_next/image?url=`）和内联 SVG logo。

## 具体做法

以下命令、参数均直接来自 README，可原样复制。

**前提**：Node ≥ 18；使用 Claude Code（skill 形式安装，也可脱离 Claude 直接跑脚本）。

**1. 安装（个人级，所有项目可用）**

```bash
git clone https://github.com/minosdevs/copycat-skill ~/.claude/skills/copycat
```

或项目级：

```bash
git clone https://github.com/minosdevs/copycat-skill .claude/skills/copycat
```

**2. 安装脚本依赖（只需一次）**

```bash
cd ~/.claude/skills/copycat/scripts && npm install && npx playwright install chromium
```

**3. 触发方式 A：在 Claude Code 里直接说**

```
clone https://example.com
```

```
make me exactly the same landing page as https://example.com
```

README 说触发词包括 “copy”“clone”“replicate”“make the same as X”。

**4. 触发方式 B：自己跑脚本（两步）**

```bash
# 1. 抓取原站 → copycat/example.com/REPORT.md
node scripts/capture.mjs https://example.com --out copycat/example.com

# 2. 把克隆与原站对比 → copycat/example.com/compare/REPORT.md
node scripts/compare.mjs --original copycat/example.com --clone http://localhost:3000
```

注意第二步要求克隆已经在本地跑起来（示例中为 `http://localhost:3000`）。

**5. 常用 capture 参数（README 列出的全部）**

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

**6. 只想拿设计令牌（不用装 skill）**

把 `scripts/extract.browser.js` 原样粘进 DevTools 控制台，然后执行：

```js
copy(JSON.stringify(__copycatExtract(), null, 2))
```

页面的设计令牌会进剪贴板。

**7. 关键参考文件**

| 路径 | 作用 |
|---|---|
| `SKILL.md` | Claude 遵循的工作流（capture → read → foundations → sections → verify → deliver） |
| `scripts/capture.mjs` | 拍摄并解剖原站 |
| `scripts/compare.mjs` | 度量克隆 vs 原站（像素 diff、字体、调色板、字号体系、console） |
| `scripts/extract.browser.js` | 页内设计令牌抽取器 |
| `references/fidelity-checklist.md` | 让克隆“看起来假”的 40 个细节 |
| `references/rebuild-recipes.md` | 现成配方：`@font-face`、滚动显现、sticky header、汉堡菜单、logo 跑马灯、FAQ 手风琴等 |
| `references/troubleshooting.md` | 被拦截站点、白屏、404 字体、被代理图片、Lenis 平滑滚动等 |

README 特别说明：skill 的指令（`SKILL.md` 与 `references/`）是法语写的，Claude 能读，回答会用你的语言。

**8. 合规前置条件**

README 的法律段落写明：为了学习、原型或重建**自己的**站点而克隆是常见做法；在生产中复用第三方的 logo、照片、文案或品牌则不行。copycat 不输入凭据、不绕过登录或付费墙，并在克隆不是用于自己站点时提示你把品牌资产换成占位符。使用前先确认目标站点和用途符合这条边界。

## 对应的研究问题

**1. 能力发现**：README 展示了一类常被低估的 AI 任务形态——不是“生成代码”，而是“从一个真实参照物中测量出规格，再按规格重建”。设计令牌抽取（字体、配色、字号体系、断点、sticky、keyframes）本来就是人在 DevTools 里手动抄的活，原文给出的做法是把它整体交给脚本 + Claude。原文只支持到这一层，没有更多延伸案例。

**2. 任务匹配**：适合“存在可机器测量的 ground truth”的任务。工具分工明确：Playwright/Node 脚本负责采集与度量（客观、可重复），Claude 负责读测量结果、逐 section 重建、按 diff 报告修正。默认输出静态 HTML/CSS/JS，仓库本身用 Next.js 时输出 Next.js。

**3. 条件供给**：需要 Node ≥ 18、Playwright chromium；被克隆站点需可正常访问（不绕过登录/付费墙）；反爬站点需 `--channel chrome|msedge` 用真实浏览器；页面需要等待时用 `--wait 3000`；需要特定语言/视口/暗色时用 `--locale`、`--viewports`、`--dark`。验证阶段还需要一个本地运行中的克隆地址（`--clone http://localhost:3000`）。

**4. 主动推进**：README 没有描述时间或事件触发的常驻任务。唯一接近的是 verify 循环——像素 diff → 最差区域映射到 section → 修正 → 再 diff，属于由“比对结果”这一状态驱动的迭代闭环，而不是外部触发。

**5. 效果验证**：这是原文最扎实的部分。验证维度包括：每个视口的像素 diff、最差区域映射回具体 section、设计 diff（缺失字体、颜色、标题、CTA）、克隆页的 console 错误；输出 A–D 评级，目标为不匹配 < 2% 且 0 console 错误。也就是说，验收标准是预先量化好的，不是主观“看着像”。

## 与已有做法的关系

清单中唯一相关条目是 **Claude Code（tool，status: adopt）**。copycat 不是一个独立工具，而是 Claude Code 的一个 skill，必须安装在 `~/.claude/skills/copycat` 或 `.claude/skills/copycat` 下、或直接调用其脚本才能工作。它可以看作对清单里已 adopt 的 Claude Code 的一次能力扩展：给 Claude Code 补上“从浏览器实测规格 + 像素级自动验收”的工具链。除此外清单中没有相关条目。

## 证据与局限

**原文给出的具体内容**：完整安装命令、两个脚本的调用方式、全部 capture 参数、DevTools 抽取代码片段、文件职责表、四步工作流，以及“< 2% 不匹配 + 0 console 错误、A–D 评级”这一验收目标。这些是可照做的部分。

**仅为作者主张、无外部证据的部分**：视觉“indistinguishable”、对懒加载/滚动显现/cookie 横幅/超长页面拼接/跨域样式表/图片代理/内联 SVG 的处理能力，以及 fidelity-checklist 里“40 个细节”的具体内容——原文只列了文件名，没有展开，也没有给出任何示例 REPORT.md、失败案例或对比数据。

**其他局限**：仓库仅 37 stars，属小型个人项目，无第三方评测；“< 2%”和 A–D 评级是作者自定义阈值，未说明算法细节；`SKILL.md` 与 `references/` 为法语，可能影响维护与二次修改；使用范围受法律段落限制（不得复用第三方品牌资产，不绕过登录/付费墙）；本次输入只有 README（source_note 标注“依据仓库 README”），未能核查实际脚本行为。

**适用条件**：有明确参照页面、可本地运行、目标是自己的站点或纯学习/原型场景；反爬严格或需登录的站点不在其承诺范围内。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 选一个**自己拥有**的、结构中等复杂的页面（有 header、若干 section、响应式布局、自定义字体）作为目标，避免一上来选反爬站点。
2. 按上文第 1、2 步安装，确认 `npx playwright install chromium` 成功。
3. 跑 `node scripts/capture.mjs <你的URL> --out copycat/<域名>`，打开生成的 `copycat/<域名>/REPORT.md`，检查抽取到的字体、配色、断点是否完整（这一步本身就能验证“测量”能力，不必等重建）。
4. 让 Claude Code 完成重建并在本地起服务，再跑 `node scripts/compare.mjs --original copycat/<域名> --clone http://localhost:3000`。
5. 打开 `compare/REPORT.md`，记录不匹配率、console 错误数、评级，以及最差区域集中在哪些 section。
6. 如果首轮不达标，按报告修一轮再 compare，记录需要几轮才收敛。

**判断有没有改善的指标**

- 像素不匹配率：是否趋近 README 给出的 < 2% 目标
- console 错误数：是否为 0
- 达到可接受结果所需的人工修正次数与迭代轮数（对比自己手写同一页面的耗时）
- 抽取阶段的设计令牌完整度：字体、配色、断点是否与原站一致，有无明显漏项
- REPORT.md 中“最差区域→section”的映射是否准确——这是判断验证环节本身可不可信的关键

**若试用结果良好再考虑推广**：可把这套“先测量参照物 → 再重建 → 用客观 diff 闭环验收”的结构抽成通用模式，套用到其他有可测量对照物的 AI 任务上；copycat 本身作为网页克隆工具写进手册。若首轮就需要大量人工干预或 REPORT.md 的映射不可信，则降级为 study。
