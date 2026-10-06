# 让 AI 照着参照物重建：先量出规格或写死一份 DESIGN.md，再用机器可比指标验收

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 做“照着某个真实参照物做一遍”的任务时容易靠猜和“看着不错”来验收，这篇手册给一套可照做的流程：先从参照物量出规格或拿到一份写死取值的 DESIGN.md，再重建，最后用机器可比的 diff、加权打分、部署门禁或按同一份规范的复查来卡住交付。
> 先试这一步：挑一个自己拥有或熟悉、结构中等的页面：copycat 先只跑测量那一步，打开 copycat/<域名>/REPORT.md 看字体、配色、断点是否完整；或者把一份现成的 DESIGN.md 拷进项目根目录，用一句“build me a page that looks like this”让智能体生成一个单页，看它是否真的按文件里的取值来。
> 最近修订：2026-10-06

## 解决什么问题

AI 做“照着某个真实参照物做一遍”的任务时，最容易滑向猜：猜字体、猜颜色、猜边距，然后用“看起来不错”当验收标准。这本手册给的是一套可照做的流程——先从参照物里把规格量出来或逆向出来（或直接拿到一份写死取值的 `DESIGN.md`），再按规范重建，最后用机器可比的差异指标、加权打分和部署门禁（以及按同一份规范的复查）自动验收、循环修正。

本次给出三条路径：网页克隆场景（minosdevs/copycat-skill）、App 功能/流程克隆场景（Jakeschincariol/replica-skill），以及用一份被显式约束的 `DESIGN.md` 让 AI 在多次开发中保持一致设计输出的流程。第三条路径本次有两套做法：做法 A 是从你自己的 3–5 个参考设计里让 AI 提炼出规范（来自一条推文，证据强度最低）；做法 B 是直接复制一份现成的第三方 `DESIGN.md` 到项目根目录（来自 VoltAgent/awesome-design-md，仓库自称收录 73 份从真实网站提取的文件）。

前两条共享同一结构：拆成窄任务，用中间产物文件当接口，下一环节读上一环节写下的文件，最后用客观指标卡住交付。第三条路径不依赖这两套工具，补的是“把设计规范写成文件并让 agent 持续遵循”。这个结构本身可以迁移到其他有明确对照物的 AI 任务，但迁移部分原调研并未给案例，属于未验证的外推。

## 适用与不适用

**适用**

- 存在“可机器测量的 ground truth”的任务：网页有一个能打开的参照页面；App 有公开页面、截图、商店列表、帮助中心和你自己账号里的点击过程。
- 目标是自己的站点/App，或纯学习、原型、重建自己站点/App 的场景。
- 需要复用一套已被作者写出的“安装 → 测量/逆向 → 重建 → 比对/打分 → 门禁”工具链，而不是每次手抄 DevTools 或凭感觉验收。
- 反爬站点可在加 `--channel chrome|msedge` 的条件下尝试（copycat）。
- App 克隆中，只想先判断该不该做时，可单独跑 `/replica-entrepreneur` 读真实差评。
- 有稳定视觉取向、需要多轮迭代并保持风格一致性的前端/网页项目：可用路径 3。做法 A 用你自己的 3–5 个参考设计提炼规范（推文场景，无验证）；做法 B 直接拿一份现成的 `DESIGN.md` 放进项目根目录让智能体照着出页面（awesome-design-md），适合想先看看这类文件长什么样、或需要快速获得一套成熟设计语言的情况。

**不适用或需谨慎**

- 在生产中复用第三方的 logo、照片、文案、品牌资产、源代码、专有素材、商标、内容或私有 API——两个仓库都明确划界不行。
- 需要登录、付费墙或凭据的站点/内容：copycat 不输入凭据、不绕过登录或付费墙；replica-skill 不爬登录后内容、不代登他人账号、不越付费墙。
- 没有客观对照物的任务：这套方法的价值几乎全部来自“有个能测量的参照物”。
- 一次性、没有设计一致性要求的单页：路径 3 的收益有限（推文原文也只说“很好”，未给收益数据）。
- 后端、数据、运维类工作：`DESIGN.md` 只解决“项目应该长什么样、什么感觉”，与这些工作无关。
- 把 `DESIGN.md` 当成 Figma 导出或 JSON schema 的替代品：按 awesome-design-md 的说法，它只是一个放进项目根目录的 Markdown 文件，不需要额外工具，也没有校验机制。
- 只有 README、没有第三方评测：copycat 仓库仅 37 stars，属小型个人项目；replica-skill 只有作者自述示例、无第三方验证；路径 3 做法 A 只有一条推文的四步骨架；做法 B 只有清单、章节表和 preview 页面，没有生成结果对比。都属证据弱，先小范围验证再决定是否长期采用。

与已有做法的关系：copycat 是 Claude Code 的一个 skill（安装在 `~/.claude/skills/copycat` 或 `.claude/skills/copycat`，也可脱离 Claude 直接跑脚本），面向网页视觉重建，补上“从浏览器实测规格 + 像素级自动验收”。replica-skill 是 11 个 Claude 技能加 6 个纯标准库 Python 小工具，面向 App 功能与流程重建，补上“用文件当接口 + 加权打分 + 部署门禁”。两者互补，不是替代关系。路径 3 不依赖这两套工具，补的是“把设计规范写成文件并让 agent 持续遵循”；它可以单独用，也可以把路径 1 的 `REPORT.md` 里的设计令牌当成做法 A 的输入，或把 `DESIGN.md` 当成路径 1 重建前的目标描述。做法 A 与做法 B 也可以叠加：把现成文件当模板，按做法 A 的规则改绑成你自己的取值。

另有一条原文明示的分工：`AGENTS.md` 是编码智能体读的、定义“项目怎么构建”；`DESIGN.md` 是设计智能体读的、定义“项目应该长什么样、什么感觉”。

## 前置条件

- Node ≥ 18（copycat）。
- Claude Code（copycat 以 skill 形式安装；也可以不依赖 Claude，直接调用仓库脚本）；replica-skill 可用 Claude 网页/客户端或 Claude Code，完全没有 Claude Code 时可把任意 `SKILL.md` 粘到对话顶部当 mode 运行，代价是失去 Python 工具。
- Playwright chromium（copycat 第 2 步安装）。
- Python 3.8 或更新版本（replica-skill），README 原文 `Nothing to pip install.`，不需要 pip 安装任何东西。
- 被克隆的站点可正常访问，页面能打开；被克隆的 App 有公开页面、截图、商店列表、帮助中心、公开走查，以及你自己账号里的点击过程。
- 验证阶段：copycat 需要一个已经在本地跑起来的克隆地址（示例中为 `http://localhost:3000`）；replica-skill 产物落在项目内 `replica/` 子目录，需要项目目录写入权限。
- replica-skill 的评论分析需要你提供带链接的真实评论数据（`replica/reviews.csv` 每行带 URL）。
- 路径 3 做法 A：3–5 个你确实喜欢的真实设计样本（截图或可访问页面）；所用 AI 能看图或读页面，并能写入项目文件；项目里有、或可新建一份会被 agent 读取的规则文件（推文原话是 `AGENTS.md`）。
- 路径 3 做法 B：能访问网络下载文件或手工复制文本；项目根目录可写；所用 AI 是能读项目文件、产出 UI 的编码或设计智能体（原文明示的承接方包括各类 AI coding agent 与 Google Stitch）。
- 合规前置：先确认目标站点/App 和用途符合两个 README 的法律边界（自己站点/App / 学习 / 原型可以；复用第三方品牌资产、源代码、专有素材、logo、商标、文案、内容或私有 API 不可以）。做法 B 复制的是一份描述第三方网站视觉识别的文件，用于商业产品前需自行判断品牌与法律风险。

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

### 路径 3：用一份显式绑定取值的 DESIGN.md 约束 AI 的设计输出

这一路径有两套做法：做法 A 从你自己的参考设计里提炼规范；做法 B 直接复制一份现成的第三方规范。

#### 做法 A：从自己的参考设计里提炼 DESIGN.md（推文流程，未验证）

来源是一条推文，原文只有四句流程：

1. 先给 AI 看 3 到 5 个你喜欢的真实设计；
2. 让 AI 根据这些设计写一份 DESIGN.md，把颜色、字号、间距、圆角全部绑定；
3. 把 DESIGN.md 引用添加到 AGENTS.md，让它遵循；
4. 开发完成让 AI 再根据 DESIGN 检查一遍。

原文没有给 `DESIGN.md` 的字段模板、`AGENTS.md` 的具体引用写法、可复制的提示词或任何指标。下面按这四步展开，凡原文没有的内容都标为“原文未给”。

##### 1. 收集 3–5 个真实参考设计

前提：你已有明确的审美偏好，并且能拿到 3–5 个真实网页设计（截图或可访问的页面）。
按原文，数量为 3 到 5 个，且必须是“你喜欢的真实设计”，不要用“简洁”“现代”这类风格词代替样本。
预期结果：手上有 3–5 个可交给 AI 看的样本。

##### 2. 让 AI 产出 DESIGN.md，四类值必须绑定

前提：所用 AI 具备看图或读取这些设计的能力，并且能写入项目文件。
按原文要求，输出内容覆盖颜色、字号、间距、圆角四类，并且“全部绑定”——写成确定的取值/规格，而不是形容词。原文未说明这四类之外还该写什么，也未给字段模板；需要你自己定格式，或让 AI 先提一版再由你确认。
预期结果：项目内出现一份 `DESIGN.md`，四类值都是确定取值。
自检：翻一遍文件，只要出现形容词或含糊描述，这一步就没达标。

##### 3. 把 DESIGN.md 接进 AGENTS.md

前提：项目里已有、或可新建 `AGENTS.md` 这类供 AI 遵循的说明文件。
按原文，做法是“把 DESIGN.md 引用添加到 AGENTS.md，让它遵循”，即让后续每一次 AI 开发都读得到这份规范。原文未给出具体的引用写法。
预期结果：后续每次让 AI 改页面时，它都会读到这份规范。
注意：原文只提到 `AGENTS.md`；如果你的工具实际读取的是别的规则文件，需要改成它真正会读的那一份。原文未覆盖这种情况。

##### 4. 开发完成后按 DESIGN.md 复查

前提：本轮开发已经产出可运行的页面或代码。
按原文，开发完成后再让 AI 依据 DESIGN 检查一遍，作为收尾的核对动作。原文未说明复查是人工触发还是自动触发，也未说明发现问题后如何处置。
预期结果：AI 报出与 `DESIGN.md` 不一致的项，你据此修正一轮，再复查。

#### 做法 B：直接复制一份现成的 DESIGN.md（VoltAgent/awesome-design-md）

前提：有一个用 AI 编码智能体协作开发的前端项目，且能访问网络下载文件或手工复制文本。

##### 1. 选一份 DESIGN.md

从仓库 README 的 Collection 列表中挑一个风格接近你目标的站点条目，打开其 `getdesign.md/<site>/design-md` 链接。原文列出的例子有 Linear、Vercel、Stripe、Notion、Supabase 等。仓库自称收录 73 份（README 徽章标注 `DESIGN.md count-73`）。

##### 2. 先打开 preview.html 目视确认

每个站点条目提供三类文件：

```
DESIGN.md            设计系统（智能体读取的文件）
preview.html         视觉目录：色板、字号阶梯、按钮、卡片
preview-dark.html    同上，深色表面版本
```

建议在粘贴前先打开 `preview.html`（需要时再看 `preview-dark.html`）确认风格是否符合预期。预期结果：你对这份文件的配色、字阶、按钮和卡片样式有了直观判断，再决定用不用。

##### 3. 把该文件放到项目根目录

原文原话：

```
Copy a site's DESIGN.md into your project root
```

预期结果：项目根目录下出现 `DESIGN.md`，后续智能体开发时能读到它。

##### 4. 告诉你的 AI 智能体使用它

原文给出的指令原样为：

```
build me a page that looks like this
```

预期结果：智能体按这份文档生成页面；原文的说法是“generate high-quality UI that stays visually consistent with the design language”，但这只是作者主张、没有对比数据。

##### 5. 先读第 9 节 Agent Prompt Guide

每份 `DESIGN.md` 遵循 Stitch DESIGN.md 格式并扩展为 9 个章节：

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

第 9 节本身就是“给智能体的提示词指南”，拿到文件后应先读这一节，看有没有可直接复制的提示词。

##### 6. 可选：申请与反馈

可以对指定网站申请一份 `DESIGN.md`，包括仅交付给你的私有请求：`https://getdesign.md/request`。若发现现有文件有误（错误颜色、缺失 token、描述薄弱），可按 CONTRIBUTING.md 反馈；提 PR 前先开 issue 与维护者讨论。

#### 做法 A / 做法 B 怎么选，以及和路径 1 的组合

- 已有明确审美偏好、想要一份只属于自己项目的规范：走做法 A。
- 想先看看这类文件长什么样、或需要快速拿到一套成熟设计语言：走做法 B。拿到文件后也可以把它当模板，按做法 A 的要求改绑成自己的取值。
- 想要“对着一个具体页面做像素级复刻，并有自动 diff 与 console 门禁”：走路径 1；路径 3 没有 diff 工具和阈值，复查靠同一份 `DESIGN.md`。
- 两边可以叠加：用路径 1 的 capture 产出的 `REPORT.md`（字体、CSS 变量、调色板、字号体系、断点）当成 `DESIGN.md` 的素材；再用 `DESIGN.md` 约束后续开发，最后仍用 `compare.mjs` 做客观验收。也可以把做法 B 的 `preview.html` 直接当人工比对基准。
- 证据强弱不同：路径 1、2 至少有仓库 README 的可复制命令与参数；路径 3 做法 A 只有一条推文的四步骨架和互动数据（22 赞、1 次转发、14 条回复）；做法 B 只有清单、章节表和 preview 页面，没有任何生成结果对比、评分或用户反馈。

### 怎么选路径 1 还是路径 2

- 要重建的是网页视觉：用路径 1。
- 要重建的是 App 的功能、流程、数据模型和产品定位：用路径 2。
- 想先判断该不该克隆某个 App：只跑 `/replica-entrepreneur`。
- 只想拿网页设计令牌：用路径 1 的第 7 步。

## 怎么判断变好了

**最小试用（半天内可完成；App 场景先只跑三步）**

1. 选一个**自己拥有或熟悉**、结构中等复杂的目标：网页场景选有 header、若干 section、响应式布局、自定义字体的页面，避免一上来选反爬站点；App 场景选自己熟悉的一个小 App；路径 3 选一个已有或新建的单页面（组件级也可）。
2. 按对应路径安装，确认依赖成功（copycat：`npx playwright install chromium`；replica-skill：Python 3.8+ 且无需 pip 安装；路径 3 无需安装）。
3. 只跑“测量/逆向/提炼”一步：copycat 跑 capture，打开 `copycat/<域名>/REPORT.md`，检查字体、配色、断点是否完整；replica-skill 跑 `/replica-recon`，人工核对 recon 产物；路径 3 做法 A 准备 3–5 张真实参考设计，走完“生成 `DESIGN.md` → 在 `AGENTS.md` 引用 → 让 AI 改页面 → 让 AI 按 DESIGN 自查”一轮；做法 B 把一份现成 `DESIGN.md` 拷进项目根目录，用 `build me a page that looks like this` 生成一个页面。都记录人工修改次数与耗时。
4. 只跑一次“比对/打分/复查”：copycat 完成重建并跑 `compare.mjs`，打开 `compare/REPORT.md`；replica-skill 先只跑 `recon -> architect -> diff` 三步，用 `parity.py` 或 `/replica-diff` 看一致性分数和缺失清单；路径 3 看 AI 自查报出的问题数量与类型，做法 B 还可以对着 `preview.html` 人工核对。
5. 记录不匹配率、console 错误数、评级、parity 分数、must-have 缺失项、最差区域集中在哪些 section/屏幕，以及路径 3 的复查问题数。
6. 首轮不达标就按报告修一轮再比对，记录需要几轮才收敛。

**路径 3 做法 B 的 A/B 对照试用（推荐补上）**

1. 选一个风格明确、你能判断好坏的单一页面任务（例如一个定价页或设置页），不要一上来改造整个产品。
2. 建两个分支或在同一项目里先后跑两次，只改变一个变量：A 组不提供 `DESIGN.md`，用你平时的方式让智能体生成该页面；B 组把一份 `DESIGN.md` 放到项目根目录，用原文指令让智能体生成同一页面。
3. 同时打开该站点的 `preview.html` 作为参照物，人工核对 B 组输出在颜色、字体层级、按钮状态、间距上是否与文档一致。
4. 记录 B 组是否出现“文档里有但没用上”的 token，以及智能体是否需要额外提醒才会遵守。

**可观察的指标**

- copycat：像素不匹配率是否趋近 README 给出的 < 2% 目标（作者自定义阈值，不是外部基准）；console 错误数是否为 0；达到可接受结果所需的人工修正次数与迭代轮数，和“自己手写同一页面”的耗时对比；抽取阶段的设计令牌完整度；`REPORT.md` 中“最差区域 → section”的映射是否准确。
- replica-skill：`parity.py` 的 must / should / could 加权分加缺失清单，缺 must-have 即不可发布；`imgdiff.py` 的布局差异图是否反映真实布局差异（它忽略颜色）；`contrast.py` 的 WCAG 对比度检查是否通过；`reviews.py` 的每条结论是否带原始链接和计数、小样本是否被标 thin；`listing.py` 的商店字数与关键词检查；`sweep.py` 是否清干净；`/replica-test` 是否没有未关闭的 S1/S2；`/replica-deploy` 的 preflight（测试、一致性、清扫、文案）是否通过并只在通过后发布。
- 路径 3 做法 A（推文四步，原文未给任何指标，下面是可从其描述推导出的观察点，不是作者给的基准）：`DESIGN.md` 里的颜色、字号、间距、圆角是否都是确定取值——出现形容词或含糊描述即未达标；AI 复查报出的问题数量是否随迭代轮次下降（反复出现同类问题说明 `DESIGN.md` 没被真正遵循）；同一批需求下人工返工修改的次数与时长，和不使用 `DESIGN.md` 的做法相比是否减少；连续生成的两三个页面之间颜色/字号/间距/圆角是否保持一致（风格漂移越少越有效）；建议做一次对照：同一需求分别在“有 `DESIGN.md`”和“无 `DESIGN.md`”两种条件下各做一版，比较前四项。
- 路径 3 做法 B（以下指标均可人工统计，不依赖原文未提供的数据）：需要人工返工的次数（同一页面上你手动改颜色/间距/字体的次数，B 组应显著少于 A 组）；一致性命中率（抽样检查文档中明确定义的 token——色值、字号、间距、圆角、阴影——统计输出中实际使用的比例）；首轮可用率（第一版生成后无需调整设计规范、只需改业务逻辑即可接受的比例）；上下文是否被读到（让智能体在生成前先复述第 9 节 Agent Prompt Guide 的内容，能准确复述说明文件确实进入了上下文）；提示词成本（B 组为达到可用状态所消耗的对话轮数，若与 A 组持平甚至更高，说明收益不足）。
- 共同指标：中间产物文件是否可读、可改，下一环节能否直接读取；验证环节的映射/缺失清单是否可信。

**试多久**

网页场景首轮跑通加一到两轮修正，半天量级。App 场景先只取 `recon -> architect -> diff` 三步，在自己熟悉的一个小 App 上跑一遍并人工核对产物质量，再决定是否走完整 11 步链。路径 3 在一个单页面上走完一轮，记录人工修改次数与耗时；做法 B 尽量做完 2–3 次不同页面的 A/B 对照再下结论。若试用结果良好，可把这套“先测量/逆向参照物 → 写成规范 → 重建 → 用客观 diff、加权打分和门禁闭环验收”的结构抽成通用模式，套到其他有可测量对照物的 AI 任务上；若首轮就需要大量人工干预、或 `REPORT.md` 的映射不可信、或 parity 的缺失清单不可信、或 `DESIGN.md` 反复出现形容词、复查问题不收敛，则降级为只做了解（study），不要写进日常流程。做法 B 的止损条件是：若在 2–3 次不同页面的对比中，B 组在上述指标上都没有稳定改善，或频繁出现文档未定义的风格漂移，就把它降级为“读一读 `DESIGN.md` 的章节划分方式、用在自己的 `AGENTS.md` 里”，不再继续采用这份第三方文件。

## 常见坑

- **验收阈值和评分是作者自定义的**：copycat 的 `< 2%` 和 A–D 评级未说明算法细节；replica-skill 的 parity 加权分、可发布门禁、diff 分数也都来自 README，不要当成行业标准或对外承诺。路径 3 做法 A 连指标都没有，只有四步流程。
- **证据强度有限**：copycat 仓库仅 37 stars、小型个人项目、无第三方评测；replica-skill 只有作者自述示例、无第三方验证；路径 3 做法 A 只有一条推文（22 赞、1 次转发、14 条回复）和四句流程，无案例、无对比数据；做法 B 只有清单、章节表与 preview 页面，没有生成结果对比、评分或用户反馈。
- **语言成本**：copycat 的 `SKILL.md` 与 `references/` 为法语，Claude 能读、回答用你的语言，但可能影响维护与二次修改。
- **README 里的能力主张未被验证**：copycat 的视觉 `indistinguishable`、对懒加载与滚动显现、cookie 横幅（用 CSS 隐藏、绝不点接受）、超出原生截图高度的页面（逐屏拼接）、跨域样式表、CSS 相对路径字体、图片代理（`/_next/image?url=`）、内联 SVG logo 的处理，以及 fidelity-checklist 里“40 个细节”的具体内容；replica-skill 的 11 个技能、6 个工具、端到端示例与评分数字；awesome-design-md 的“generate high-quality UI”“Built with real design depth … not surface-level outputs”“any AI coding agent … instantly understands”。原文无示例 REPORT.md、无失败案例、无对比数据，这些只是作者主张。
- **路径 3 做法 A 的关键信息缺失**：`DESIGN.md` 该写哪些字段、用什么格式；`AGENTS.md` 里怎么引用；第 1 步的参考设计是让 AI 看图还是读代码；复查发现问题后怎么处置——原文都没有给。照抄这四步时这些需要自己补，属未验证的外推。
- **规则文件不一定叫 AGENTS.md**：原文只提 `AGENTS.md`；若你用的工具实际读取的是别的规则文件，需要换成它真正会读的那一份。原文未覆盖这种情况。
- **DESIGN.md 被“形容词化”**：只要颜色、字号、间距、圆角里出现“简洁”“现代”这类描述，这份规范就约束不住 AI，复查也会失去基准。这是路径 3 最容易踩的坑，也是做法 A 唯一自带的自检点。
- **现成 DESIGN.md 是第三方视觉识别**：awesome-design-md 声明“We do not claim ownership of any site's visual identity”，文件按 as is 提供、无担保；用于商业产品时需自行判断品牌与法律风险，不要直接拿它当自己产品的身份。
- **现成文件依赖外部链接，且无正文样本**：`DESIGN.md` 本身要通过 `getdesign.md/<site>/design-md` 获取，给定材料里没有它的正文样本，所以无法得知其内部实际写法与提取方式；拿不到文件时只能把它的 9 章结构当成自己写规范的参考。
- **元数据存疑**：原文记录的 star 数（119716）与 README 自述“Ranked #150 globally on GitHub”均为仓库自述、未经核实；README 中还有相当篇幅是赞助商与生态工具推广，不构成证据。
- **合规红线**：为学习、原型或重建自己的站点/App 而克隆是常见做法；在生产中复用第三方的 logo、照片、文案、品牌、源代码、专有素材、商标、内容或私有 API 则不行。copycat 不输入凭据、不绕过登录或付费墙；replica-skill 不爬登录后内容、不代登他人账号、不越付费墙。克隆不是用于自己站点/App 时，要按仓库提示把品牌资产换成占位符；发布前必须完成改名换品牌，`/replica-deploy` 在 sweep 未清干净前不会发布。
- **compare 需要一个跑起来的克隆**：`--clone` 指向的本地服务必须先起好，否则比对无从谈起。
- **反爬与等待**：被拦截的站点用 `--channel chrome|msedge` 走真实安装的浏览器；页面需要等待时用 `--wait 3000`。
- **replica-skill 工具各自有前提**：`imgdiff.py` 要求两张图尺寸/视角大致可比；`parity.py` 要求 `features.csv` 按仓库模板填写；`reviews.py` 会丢掉任何没有链接的评论，主题少于 3 条评论或只有 1 个来源会被标“thin”；`sweep.py` 连 `OriginalAppEmbed` 这种标识符内部也搜。
- **别急着推广**：首轮就大量人工干预，或 `REPORT.md` 的“最差区域→section”映射不可信、parity 的缺失清单不可信、`DESIGN.md` 反复形容词化、复查问题不收敛时，说明验证环节本身不可靠，先降级为 study。

## 证据与来源

- **路径 1 网页视觉克隆（copycat）** 依据调研《minosdevs/copycat-skill》，source_note 标注“依据仓库 README”：完整安装命令、`capture.mjs` 与 `compare.mjs` 的调用方式、全部 capture 参数、DevTools 抽取代码片段、文件职责表、四步工作流（capture → extract → rebuild → verify），以及“< 2% 不匹配 + 0 console 错误、A–D 评级”这一验收目标。
- **路径 2 App 功能/流程克隆（replica-skill）** 依据调研《Jakeschincariol/replica-skill》：11 个 Claude 技能、6 个纯标准库 Python 小工具、三种安装方式、固定顺序 `recon -> architect -> design -> build -> backend -> test -> diff -> entrepreneur -> brand -> launch -> deploy`、各技能职责表、六个工具命令、自检命令、端到端示例、clean-room 边界，以及部署门禁（`parity.py` 缺 must-have 即不可发布、`sweep.py` 未清干净挡住部署、`/replica-test` 以没有未关闭的 S1/S2 为收敛条件、`reviews.py` 给样本量太小的主题打 thin）。
- **路径 3 做法 A（DESIGN.md + AGENTS.md）** 依据调研《@fankaishuoai: 这个让 AI 做网页设计的最佳实践很好，简单来说，就是如下的几步》：四步流程原文、颜色/字号/间距/圆角必须绑定为确定值这一要求本身，以及推文互动数据（22 赞、1 次转发、14 条回复）。`DESIGN.md` 字段模板、`AGENTS.md` 引用写法、可复制提示词与判定指标，原文均未给出。
- **路径 3 做法 B（VoltAgent/awesome-design-md）** 依据调研《VoltAgent/awesome-design-md》：仓库徽章标注的 `DESIGN.md count-73`、每份文件的组成（`DESIGN.md` + `preview.html` + `preview-dark.html`）、9 个章节结构表、复制到项目根目录的原话、指令原样 `build me a page that looks like this`、`https://getdesign.md/request` 与 CONTRIBUTING.md 反馈流程，以及 `AGENTS.md` 与 `DESIGN.md` 的分工对照。其中“generate high-quality UI”“Built with real design depth … not surface-level outputs”“any AI coding agent … instantly understands”属仓库自我描述，原文未提供任何生成结果对比、评分或用户反馈；“extracted from real websites”“design tokens represent publicly visible CSS values”也未说明提取方法与校验方式；star 数（119716）与“Ranked #150 globally on GitHub”为仓库自述、未经核实。做法 B 的 A/B 对照步骤与五项指标是根据原文“怎么试、怎么验证”整理的，原文没有给出基准数值。
- **仅为作者主张、无外部证据**：copycat 的视觉 `indistinguishable`；对懒加载、滚动显现、cookie 横幅、超长页面拼接、跨域样式表、图片代理、内联 SVG 的处理能力；fidelity-checklist 中 40 个细节的具体内容。replica-skill 的 11 个技能/6 个工具效果、端到端示例中的评分与评论数量、各工具的实际行为。路径 3 做法 A 的“最佳实践”“很好”以及“把四类值全部绑定就能带来改善”；做法 B 的“高质量 UI”“保持视觉一致”。以上原文均无示例 REPORT.md、无失败案例、无对比数据。
- **模式外推、未验证**：把“先测量/逆向参照物 → 写成规范 → 重建 → 客观 diff/加权打分/门禁闭环验收”迁移到网页克隆和 App 克隆以外的 AI 任务，是两份调研中的建议方向；原文只支持到这两个场景，没有延伸案例。同理，“若工具不读 AGENTS.md 就换成本工具实际会读的规则文件”也是外推，原文只写了 `AGENTS.md`；把做法 B 的现成文件当模板改绑成自己的取值，是做法 A 与做法 B 的组合方式，原文未涉及。
- **局限记录**：copycat 仓库 37 stars；`< 2%` 与 A–D 为作者自定义阈值且未说明算法；`SKILL.md` 与 `references/` 为法语；replica-skill 无第三方验证；路径 3 做法 A 仅一条推文、互动量小、无模板无指标；做法 B 无文件正文样本、无效果数据，且复制的是第三方网站视觉识别；两者使用范围均受各自 README 法律段落限制。

## 依据的调研

- [minosdevs/copycat-skill](../research/radar/2026-10-01/27-minosdevs-copycat-skill.md)：值得一试，按 README 的安装步骤在本地装好这个 Claude Code skill，先拿自己拥有的站点或一个结构简单的公开页面跑一轮 capture→重建→compare，用 REPORT.md 里的像素差异率和 console 错误数判断效果。它值得试是因为把“从真实页面测量设计令牌 + 用像素 diff 自动闭环验证”写成了可复制的命令和流程，而这套“先测量、再重建、再自动比对”的做法可以迁移到其他有明确对照物的 AI 任务；但项目只有 37 星、指标全由作者自定义，所以先小范围验证再决定是否写进手册。
- [Jakeschincariol/replica-skill](../research/radar/2026-10-04/1117-jakeschincariol-replica-skill.md)：值得一试，先只取 recon→architect→diff 三步，在自己熟悉的一个小 App 上跑一遍并人工核对产物质量，再决定是否走完整 11 步链；真正值得进手册的不是“克隆 App”本身，而是它示范的“每个技能读上一环节写下的产物文件、用客观打分和部署门禁卡住最后一步”这套可迁移做法，但仓库只有作者自述示例、无第三方验证，所以先小范围试。
- [@fankaishuoai: 这个让 AI 做网页设计的最佳实践很好，简单来说，就是如下的几步：](../research/radar/2026-10-06/1510-ai.md)：值得一试，可以用一个小页面照这四步试一遍：先喂 3–5 个真实参考设计，让 AI 产出绑定颜色/字号/间距/圆角的 DESIGN.md，在 AGENTS.md 里引用它，开发后再让 AI 按它自查；理由是该流程可照做且成本低，但原文只有步骤骨架、没有模板与指标，尚不足以直接写进手册。
- [VoltAgent/awesome-design-md](../research/radar/2026-10-06/1545-voltagent-awesome-design-md.md)：值得一试，在一个已有的前端项目里小范围试：把某网站的 DESIGN.md 拷到项目根目录，再让编码智能体按它生成一个页面，用视觉一致性对比来判断是否比不提供设计上下文更好。理由是它给出了可直接照做的两步流程和明确的文件结构，但原文只展示清单与章节表，没有给出任何生成效果或质量数据。
