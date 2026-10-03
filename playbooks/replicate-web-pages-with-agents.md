# 让 AI 照着参照物重建：先测量/逆向，再用产物文件与客观打分验收

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 做“照着某个真实参照物做一遍”的任务时容易靠猜和感觉验收；这本手册给出可照做的流程：先从参照物量出或逆向出规格，再重建，最后用客观 diff、加权打分和部署门禁闭环修正。
> 先试这一步：先选一个自己拥有或熟悉的小目标，只跑“测量/逆向 + 比对”两步——网页用 copycat 的 capture/compare，App 用 replica-recon 加 parity.py 或 imgdiff.py——人工核对产物质量，再决定是否走完整链路。
> 最近修订：2026-10-04

## 解决什么问题

AI 做“照着某个真实参照物做一遍”的任务时，最容易滑向猜：猜字体、猜颜色、猜边距，然后用“看起来不错”当验收标准。这本手册给的是一套可照做的流程——先从参照物里把规格量出来或逆向出来，再按规格重建，最后用机器可比的差异指标、加权打分和部署门禁自动验收、循环修正。

本次给出两个完整抓手：网页克隆场景（minosdevs/copycat-skill）和 App 功能/流程克隆场景（Jakeschincariol/replica-skill）。两者共享同一结构：拆成窄任务，用中间产物文件当接口，下一环节读上一环节写下的文件，最后用客观指标卡住交付。这个结构本身可以迁移到其他有明确对照物的 AI 任务，但迁移部分原调研并未给案例，属于未验证的外推。

## 适用与不适用

**适用**

- 存在“可机器测量的 ground truth”的任务：网页有一个能打开的参照页面；App 有公开页面、截图、商店列表、帮助中心和你自己账号里的点击过程。
- 目标是自己的站点/App，或纯学习、原型、重建自己站点/App 的场景。
- 需要复用一套已被作者写出的“安装 → 测量/逆向 → 重建 → 比对/打分 → 门禁”工具链，而不是每次手抄 DevTools 或凭感觉验收。
- 反爬站点可在加 `--channel chrome|msedge` 的条件下尝试（copycat）。
- App 克隆中，只想先判断该不该做时，可单独跑 `/replica-entrepreneur` 读真实差评。

**不适用或需谨慎**

- 在生产中复用第三方的 logo、照片、文案、品牌资产、源代码、专有素材、商标、内容或私有 API——两个仓库都明确划界不行。
- 需要登录、付费墙或凭据的站点/内容：copycat 不输入凭据、不绕过登录或付费墙；replica-skill 不爬登录后内容、不代登他人账号、不越付费墙。
- 没有客观对照物的任务：这套方法的价值几乎全部来自“有个能测量的参照物”。
- 只有 README、没有第三方评测：copycat 仓库仅 37 stars，属小型个人项目；replica-skill 只有作者自述示例、无第三方验证。先小范围验证再决定是否长期采用。

与已有做法的关系：copycat 是 Claude Code 的一个 skill（安装在 `~/.claude/skills/copycat` 或 `.claude/skills/copycat`，也可脱离 Claude 直接跑脚本），面向网页视觉重建，补上“从浏览器实测规格 + 像素级自动验收”。replica-skill 是 11 个 Claude 技能加 6 个纯标准库 Python 小工具，面向 App 功能与流程重建，补上“用文件当接口 + 加权打分 + 部署门禁”。两者互补，不是替代关系。

## 前置条件

- Node ≥ 18（copycat）。
- Claude Code（copycat 以 skill 形式安装；也可以不依赖 Claude，直接调用仓库脚本）；replica-skill 可用 Claude 网页/客户端或 Claude Code，完全没有 Claude Code 时可把任意 `SKILL.md` 粘到对话顶部当 mode 运行，代价是失去 Python 工具。
- Playwright chromium（copycat 第 2 步安装）。
- Python 3.8 或更新版本（replica-skill），README 原文“Nothing to pip install.”，不需要 pip 安装任何东西。
- 被克隆的站点可正常访问，页面能打开；被克隆的 App 有公开页面、截图、商店列表、帮助中心、公开走查，以及你自己账号里的点击过程。
- 验证阶段：copycat 需要一个已经在本地跑起来的克隆地址（示例中为 `http://localhost:3000`）；replica-skill 产物落在项目内 `replica/` 子目录，需要项目目录写入权限。
- replica-skill 的评论分析需要你提供带链接的真实评论数据（`replica/reviews.csv` 每行带 URL）。
- 合规前置：先确认目标站点/App 和用途符合两个 README 的法律边界（自己站点/App / 学习 / 原型可以；复用第三方品牌资产、源代码、专有素材、logo、商标、文案、内容或私有 API 不可以）。

## 操作步骤

### 路径 1：网页视觉克隆（copycat）

#### 1. 安装 skill（选一个安装位置）

个人级，所有项目可用：

```bash
git clone https://github.com/minosdevs/copycat-skill ~/.claude/skills/copycat
```

或项目级：

```bash
git clone https://github.com/minosdevs/copycat-skill .claude/skills/copycat
```

预期结果：对应目录下出现 copycat 的内容。**怎么选**：只在一个项目里做实验选项目级；想在所有项目里复用选个人级。

#### 2. 安装脚本依赖（只需一次）

```bash
cd ~/.claude/skills/copycat/scripts && npm install && npx playwright install chromium
```

预期结果：npm 依赖装好，chromium 下载成功。若选的是项目级安装，把 `cd` 的路径换成 `.claude/skills/copycat/scripts`。

#### 3. 先只做“测量”——capture 原站

```bash
node scripts/capture.mjs https://example.com --out copycat/example.com
```

前提：脚本依赖已装好。预期结果：生成 `copycat/example.com/REPORT.md`，其中包含抽取到的 `@font-face` 与字体文件、CSS 变量、调色板、字号体系、容器、断点、sticky 元素、keyframes 与过渡、按渲染尺寸的图片、内联 SVG、meta 标签、console 与网络错误，以及站点真实的 CSS 文件和文本内容。

**这一步本身就是一次验收**：不必等重建完成，先看抽取到的字体、配色、断点是否完整，就能判断“测量”环节可不可信。

#### 4. 触发重建（两种做法，按需选）

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

#### 5. 把克隆跑起来，做自动比对

```bash
# 1. 抓取原站 → copycat/example.com/REPORT.md（同第 3 步）
node scripts/capture.mjs https://example.com --out copycat/example.com

# 2. 把克隆与原站对比 → copycat/example.com/compare/REPORT.md
node scripts/compare.mjs --original copycat/example.com --clone http://localhost:3000
```

前提：第二步要求克隆已经在本地跑起来（示例中为 `http://localhost:3000`）。预期结果：`copycat/example.com/compare/REPORT.md` 里给出每个视口的像素 diff、最差区域映射回具体 section、设计 diff（缺失字体/颜色/标题/CTA）、克隆页自身的 console，以及 A–D 评级。README 给的目标是不匹配 < 2% 且 0 个 console 错误。

#### 6. 按 diff 报告修正，循环

流程是：像素 diff → 最差区域映射到 section → 修正 → 再 diff。这是由“比对结果”这一状态驱动的迭代闭环，不是外部事件触发。预期结果：不匹配率逐步下降、console 错误清零，并记录需要几轮才收敛。

#### 7. 可选：只想拿设计令牌，不装 skill

把 `scripts/extract.browser.js` 原样粘进 DevTools 控制台，然后执行：

```js
copy(JSON.stringify(__copycatExtract(), null, 2))
```

预期结果：页面的设计令牌进入剪贴板。

#### 8. 常用 capture 参数（README 列出的全部）

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

#### 9. 关键参考文件

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

### 路径 2：App 功能/流程克隆（replica-skill）

#### 1. 安装（三选一）

方式 A，直接粘进 Claude 对话：

```
https://github.com/Jakeschincariol/replica-skill

install skill
```

方式 B，作为 Claude Code 插件（此时技能带命名空间前缀，如 `/replica-skill:replica-recon`）：

```
/plugin marketplace add Jakeschincariol/replica-skill
/plugin install replica-skill@replica-skill
```

方式 C，要保留不带前缀的 `/replica-recon` 这种裸命令，就复制文件夹：

```bash
git clone https://github.com/Jakeschincariol/replica-skill.git
cp -r replica-skill/replica-* ~/.claude/skills/
```

只想在单个项目里用（而不是全局）：把同样的文件夹复制进你仓库的 `.claude/skills/`。

预期结果：对应技能可被调用；方式 B 的命令带 `replica-skill:` 前缀，方式 C 的命令为 `/replica-recon` 这类裸命令。

#### 2. 按固定顺序运行，产物落到项目内的 `replica/` 目录

README 的顺序（每个技能读上一个技能写下的文件）：

```
recon -> architect -> design -> build -> backend -> test -> diff -> entrepreneur -> brand -> launch -> deploy
```

各个技能做什么（README 原文表述）：

| 命令 | 做什么 |
| --- | --- |
| `/replica-recon` | 逆向任意 App：屏幕、流程、组件、数据模型。来源是公开页面、截图、商店列表和你自己的账号。 |
| `/replica-architect` | 规划技术栈、数据库 schema 和 API。 |
| `/replica-design` | 重建设计系统：颜色、字体、间距、组件；产出 token，配你自己的素材。 |
| `/replica-build` | 按 recon 得到的地图逐屏重建。 |
| `/replica-backend` | 认证、数据库、支付与集成。 |
| `/replica-test` | 逐条流程点过去测 bug。 |
| `/replica-diff` | 把你的克隆版和原版对比：给一致性分数和缺失清单。 |
| `/replica-entrepreneur` | 读该 App 用户的真实差评，转成修复项和定位角度。 |
| `/replica-brand` | 给你的版本命名、换品牌，让它成为你自己的。 |
| `/replica-launch` | 落地页、定价、App Store 文案。 |
| `/replica-deploy` | 部署到你自己的域名上。 |

也可以只单独跑其中一个。README 明确建议：“拿 `/replica-entrepreneur` 跑一个你只是在考虑要不要克隆的 App，是判断该不该做的很好的方式。”

预期结果：每一步在项目内 `replica/` 下写出中间产物，下一环节读取上一环节的文件，人也能直接看和改。

#### 3. 六个工具命令（纯标准库 Python，均不联网，原样可跑）

```bash
python3 replica-diff/imgdiff.py original.png clone.png --out diff.png   # layout diff, ignores colour
python3 replica-diff/parity.py replica/features.csv                     # parity score + missing list
python3 replica-entrepreneur/reviews.py replica/reviews.csv             # what users hate, ranked, linked
python3 replica-design/contrast.py replica/design/tokens.json           # WCAG contrast on your tokens
python3 replica-brand/sweep.py . --avoid "Original App"                 # anything of the original left?
python3 replica-launch/listing.py replica/launch/listing.json           # store limits + copycat checks
```

各自的行为（README 描述，可用于判断该在什么任务上用哪个）：

- `imgdiff.py`：不用任何库读 PNG，把两张截图转成边缘图后比较“东西在哪”，因此新配色不会算作差异；输出差异区域，坐标用原图的像素。**前提：两张图尺寸/视角大致可比。**
- `parity.py`：对 must / should / could 加权，partial 记半分，且**故意不做的项和你自己新增的项都不计分**；缺 must-have 就判为不可发布，并会明说。**前提：`features.csv` 按仓库模板填写。**
- `reviews.py`：丢掉任何没有链接的评论；打印的每句引用都来自你给的那一行，并带该行 URL；主题少于 3 条评论或只有 1 个来源会被标为“thin”。**前提：`replica/reviews.csv` 里每行带 URL。**
- `sweep.py`：在代码里搜原版的名字、域名、颜色，连 `OriginalAppEmbed` 这种标识符内部也搜，**不清干净就挡住部署**。
- `listing.py`：检查 App Store 与 Google Play 的字数限制、标题里的排名声明、浪费的关键词字符，以及你 listing 里有没有出现原版名字。
- `contrast.py`：对 `replica/design/tokens.json` 做 WCAG 对比度检查。

#### 4. 自检工具本身

```bash
python3 -m unittest discover -s tests -v
```

预期结果：仓库自带测试跑通，用于确认 Python 小工具本身可用。

#### 5. README 给的一个端到端示例（照它的走法可以复现流程结构）

以克隆一个“分享链接让人来预约时间”的日程 App 为例，README 描述各步产出：recon 产出 `replica/recon.md`，含 18 个屏幕、7 条流程（访客约、房主设可用时段、访客改约…）、组件、推断出的数据模型（users、event types、availability、bookings）和 `features.csv`；architect 选 Next.js + Postgres + Stripe + Resend，写 schema（带约束保证两个访客不能订同一时段）并排定构建顺序（先把预约流程端到端跑通）；design 把截图量成 token（颜色角色、字阶、8px 间距、日期选择器和时段按钮规格），图标用开源、字体用开源、文案用自己的；build 按 `features.csv` 逐条勾掉；backend 加注册、走 Google 自家 API 用你自己的 key 接 Google Calendar、Stripe 收付费预约、提醒邮件；test 从 7 条流程写测试计划，写 Playwright 规格覆盖 happy path 和边界（时区、预约中途时段被占、重复提交），按严重度记 bug，直到没有未关闭的 S1/S2；diff 打分（功能 86，must-have 全做完，预约页布局 91），缺失项是团队轮询分配和网站嵌入；entrepreneur 读 140 条来自 App Store、G2、Capterra、Reddit 的真实评论，主要抱怨是每席位涨价、没有短信提醒、访客被时区搞晕，每条带计数和引用链接，修复计划是统一价、短信提醒、加一步时区确认，定位角度是“讨厌按席位收费的小团队的预约链接”；brand 命名（含要跑的商标和域名检查）、给新配色、logo brief 和语气，然后扫代码直到不剩原版痕迹；launch 围绕定位写落地页、对标原版公开页定价、lint 商店文案；deploy 跑预检（测试、一致性、清扫、文案），配生产环境，给你域名的 DNS 记录，等你说 go 才发。

#### 6. 怎么选路径 1 还是路径 2

- 要重建的是网页视觉：用路径 1。
- 要重建的是 App 的功能、流程、数据模型和产品定位：用路径 2。
- 想先判断该不该克隆某个 App：只跑 `/replica-entrepreneur`。
- 只想拿网页设计令牌：用路径 1 的第 7 步。

## 怎么判断变好了

**最小试用（半天内可完成；App 场景先只跑三步）**

1. 选一个**自己拥有或熟悉**、结构中等复杂的目标：网页场景选有 header、若干 section、响应式布局、自定义字体的页面，避免一上来选反爬站点；App 场景选自己熟悉的一个小 App。
2. 按对应路径安装，确认依赖成功（copycat：`npx playwright install chromium`；replica-skill：Python 3.8+ 且无需 pip 安装）。
3. 只跑“测量/逆向”一步：copycat 跑 capture，打开 `copycat/<域名>/REPORT.md`，检查字体、配色、断点是否完整；replica-skill 跑 `/replica-recon`，人工核对 recon 产物。
4. 只跑一次“比对/打分”：copycat 完成重建并跑 `compare.mjs`，打开 `compare/REPORT.md`；replica-skill 先只跑 `recon -> architect -> diff` 三步，用 `parity.py` 或 `/replica-diff` 看一致性分数和缺失清单。
5. 记录不匹配率、console 错误数、评级、parity 分数、must-have 缺失项，以及最差区域集中在哪些 section/屏幕。
6. 首轮不达标就按报告修一轮再比对，记录需要几轮才收敛。

**可观察的指标**

- copycat：像素不匹配率是否趋近 README 给出的 < 2% 目标（作者自定义阈值，不是外部基准）；console 错误数是否为 0；达到可接受结果所需的人工修正次数与迭代轮数，和“自己手写同一页面”的耗时对比；抽取阶段的设计令牌完整度；`REPORT.md` 中“最差区域 → section”的映射是否准确。
- replica-skill：`parity.py` 的 must / should / could 加权分加缺失清单，缺 must-have 即不可发布；`imgdiff.py` 的布局差异图是否反映真实布局差异（它忽略颜色）；`contrast.py` 的 WCAG 对比度检查是否通过；`reviews.py` 的每条结论是否带原始链接和计数、小样本是否被标 thin；`listing.py` 的商店字数与关键词检查；`sweep.py` 是否清干净；`/replica-test` 是否没有未关闭的 S1/S2；`/replica-deploy` 的 preflight（测试、一致性、清扫、文案）是否通过并只在通过后发布。
- 共同指标：中间产物文件是否可读、可改，下一环节能否直接读取；验证环节的映射/缺失清单是否可信。

**试多久**

网页场景首轮跑通加一到两轮修正，半天量级。App 场景先只取 `recon -> architect -> diff` 三步，在自己熟悉的一个小 App 上跑一遍并人工核对产物质量，再决定是否走完整 11 步链。若试用结果良好，可把这套“先测量/逆向参照物 → 再重建 → 用客观 diff、加权打分和门禁闭环验收”的结构抽成通用模式，套到其他有可测量对照物的 AI 任务上；若首轮就需要大量人工干预、或 REPORT.md 的映射不可信、或 parity 的缺失清单不可信，则降级为只做了解（study），不要写进日常流程。

## 常见坑

- **验收阈值和评分是作者自定义的**：copycat 的 `< 2%` 和 A–D 评级未说明算法细节；replica-skill 的 parity 加权分、可发布门禁、diff 分数也都来自 README，不要当成行业标准或对外承诺。
- **证据强度有限**：copycat 仓库仅 37 stars、小型个人项目、无第三方评测；replica-skill 只有作者自述示例、无第三方验证；本次输入只有两份 README/调研，未能核查实际脚本行为。
- **语言成本**：copycat 的 `SKILL.md` 与 `references/` 为法语，Claude 能读、回答用你的语言，但可能影响维护与二次修改。
- **README 里的能力主张未被验证**：copycat 的视觉“indistinguishable”、对懒加载与滚动显现、cookie 横幅（用 CSS 隐藏、绝不点接受）、超出原生截图高度的页面（逐屏拼接）、跨域样式表、CSS 相对路径字体、图片代理（`/_next/image?url=`）、内联 SVG logo 的处理，以及 fidelity-checklist 里“40 个细节”的具体内容；replica-skill 的 11 个技能、6 个工具、端到端示例与评分数字。原文无示例 REPORT.md、无失败案例、无对比数据，这些只是作者主张。
- **合规红线**：为学习、原型或重建自己的站点/App 而克隆是常见做法；在生产中复用第三方的 logo、照片、文案、品牌、源代码、专有素材、商标、内容或私有 API 则不行。copycat 不输入凭据、不绕过登录或付费墙；replica-skill 不爬登录后内容、不代登他人账号、不越付费墙。克隆不是用于自己站点/App 时，要按仓库提示把品牌资产换成占位符；发布前必须完成改名换品牌，`/replica-deploy` 在 sweep 未清干净前不会发布。
- **compare 需要一个跑起来的克隆**：`--clone` 指向的本地服务必须先起好，否则比对无从谈起。
- **反爬与等待**：被拦截的站点用 `--channel chrome|msedge` 走真实安装的浏览器；页面需要等待时用 `--wait 3000`。
- **replica-skill 工具各自有前提**：`imgdiff.py` 要求两张图尺寸/视角大致可比；`parity.py` 要求 `features.csv` 按仓库模板填写；`reviews.py` 会丢掉任何没有链接的评论，主题少于 3 条评论或只有 1 个来源会被标“thin”；`sweep.py` 连 `OriginalAppEmbed` 这种标识符内部也搜。
- **别急着推广**：首轮就大量人工干预，或 REPORT.md 的“最差区域→section”映射不可信、parity 的缺失清单不可信时，说明验证环节本身不可靠，先降级为 study。

## 证据与来源

- **路径 1 网页视觉克隆（copycat）** 依据调研《minosdevs/copycat-skill》，source_note 标注“依据仓库 README”：完整安装命令、`capture.mjs` 与 `compare.mjs` 的调用方式、全部 capture 参数、DevTools 抽取代码片段、文件职责表、四步工作流（capture → extract → rebuild → verify），以及“< 2% 不匹配 + 0 console 错误、A–D 评级”这一验收目标。
- **路径 2 App 功能/流程克隆（replica-skill）** 依据调研《Jakeschincariol/replica-skill》：11 个 Claude 技能、6 个纯标准库 Python 小工具、三种安装方式、固定顺序 `recon -> architect -> design -> build -> backend -> test -> diff -> entrepreneur -> brand -> launch -> deploy`、各技能职责表、六个工具命令、自检命令、端到端示例、clean-room 边界，以及部署门禁（`parity.py` 缺 must-have 即不可发布、`sweep.py` 未清干净挡住部署、`/replica-test` 以没有未关闭的 S1/S2 为收敛条件、`reviews.py` 给样本量太小的主题打 thin）。
- **仅为作者主张、无外部证据**：copycat 的视觉“indistinguishable”；对懒加载、滚动显现、cookie 横幅、超长页面拼接、跨域样式表、图片代理、内联 SVG 的处理能力；fidelity-checklist 中 40 个细节的具体内容。replica-skill 的 11 个技能/6 个工具效果、端到端示例中的评分与评论数量、各工具的实际行为。原文无示例 REPORT.md、无失败案例、无对比数据。
- **模式外推、未验证**：把“先测量/逆向参照物 → 重建 → 客观 diff/加权打分/门禁闭环验收”迁移到网页克隆和 App 克隆以外的 AI 任务，是两份调研中的建议方向；原文只支持到这两个场景，没有延伸案例。
- **局限记录**：copycat 仓库 37 stars；`< 2%` 与 A–D 为作者自定义阈值且未说明算法；`SKILL.md` 与 `references/` 为法语；replica-skill 无第三方验证；两者使用范围均受各自 README 法律段落限制。

## 依据的调研

- [minosdevs/copycat-skill](../research/radar/2026-10-01/27-minosdevs-copycat-skill.md)：值得一试，按 README 的安装步骤在本地装好这个 Claude Code skill，先拿自己拥有的站点或一个结构简单的公开页面跑一轮 capture→重建→compare，用 REPORT.md 里的像素差异率和 console 错误数判断效果。它值得试是因为把“从真实页面测量设计令牌 + 用像素 diff 自动闭环验证”写成了可复制的命令和流程，而这套“先测量、再重建、再自动比对”的做法可以迁移到其他有明确对照物的 AI 任务；但项目只有 37 星、指标全由作者自定义，所以先小范围验证再决定是否写进手册。
- [Jakeschincariol/replica-skill](../research/radar/2026-10-04/1117-jakeschincariol-replica-skill.md)：值得一试，先只取 recon→architect→diff 三步，在自己熟悉的一个小 App 上跑一遍并人工核对产物质量，再决定是否走完整 11 步链；真正值得进手册的不是“克隆 App”本身，而是它示范的“每个技能读上一环节写下的产物文件、用客观打分和部署门禁卡住最后一步”这套可迁移做法，但仓库只有作者自述示例、无第三方验证，所以先小范围试。
