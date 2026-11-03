# albertirgi/replica

- 结论：**值得一试**。建议小范围试用：按 README 的安装命令装好 skill，挑一个页面里的单个组件（如 hero 或卡片）以 faithful 级别跑 3–4 轮 capture/compare，用分数曲线和人工抽检判断闭环是否真能收敛。理由是它把“UI 还原得像不像”从口头判断变成 layout/style/pixels/motion 四轴可复现分数与按收益排序的修复清单，步骤、命令和阈值都可照做；但只覆盖 Web、证据基本来自作者自测，所以先小范围试而非直接采用。
- 原文：https://github.com/albertirgi/replica
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T06:53:37.765Z

## 是什么

Replica 是一个 Agent Skill（面向 Claude Code 等编码 agent），把“照着参考重建 UI”变成可量化的迭代闭环：给 agent 一个在线站点、本地页面、截图或录屏 → 抓取参考并生成机器可读蓝图（设计 token、每个可见元素的精确盒模型与计算样式、断点差异、带拟合缓动的动效时间线）→ agent 在你自己的代码库里重建 → 用四轴打分对比 → 按“修这一条能涨多少分”排序修复 → 达标停止。

作者对痛点的描述是：agent 会写 UI 但不会检查 UI，“瞄一眼截图，写点看着像的东西，然后说做完了”，字号差 8px、错峰动画不对、缓动写成 linear，没人说得出差多少。Replica 的做法是把“够接近了”变成一个数字。

## 具体做法（编号步骤）

**前提**：Node 20+；有 Playwright 的 Chromium，或退回使用本机已装的 Google Chrome；只有视频/GIF 参考才需要 `ffmpeg`；不需要 API key。

1. **安装 skill**。用官方 skills CLI：
   ```bash
   npx skills add albertirgi/replica
   ```
   或手工把仓库里的 `skills/replica` 复制进 agent 的 skills 目录（Claude Code 是 `~/.claude/skills/replica`，或项目内 `.claude/skills/replica`）。

2. **装依赖并自检**（手工安装路径下必须做）：
   ```bash
   npm install --prefix ~/.claude/skills/replica/scripts
   node ~/.claude/skills/replica/scripts/replica.mjs doctor
   ```

3. **用自然语言下任务**，一次说清四件事：参考源、落地文件、级别、自己的内容/资产。README 给的三个样例：
   ```text
   Rebuild the hero from https://example.com in `app/page.tsx` with our copy. Faithful level.
   Make the pricing card hover feel exactly like stripe.com's — pixel-perfect.
   Here's a screen recording of the menu opening (`menu.mov`). Build it in `components/Menu.tsx`.
   ```

4. **让 agent 走它固定的四步**：Scope（确定目标、落点、级别、触发方式）→ Capture（抓进 `.replica/<name>/ref/`：`blueprint.md`、各视口截图、动效帧、filmstrip）→ Build（在你的现有技术栈里按测量值写）→ Compare/Fix/Repeat（每轮产出 `report.md`、`issues.json`、对比图；先修收益最高的 findings，达标即停，否则 8 轮后如实交代剩余差异）。

5. **按需要选级别并接受对应阈值**（这是“能不能算通过”的硬标准）：

   | 级别 | 适用 | gates |
   |---|---|---|
   | `structure` | 同布局同动效、换自己的品牌与内容 | layout ≥ 90 · motion ≥ 85 |
   | `faithful`（默认） | “把这个抄下来” | layout ≥ 95 · style ≥ 95 · pixels ≥ 85 · motion ≥ 90 |
   | `exact` | “像素级”“1:1” | layout ≥ 98 · style ≥ 98 · pixels ≥ 97 · motion ≥ 95 |

6. **也可以自己跑 CLI**（agent 用的就是这套），把参考抓下来：
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

7. **复用了别人资产的元素打标记**：加 `data-replica="placeholder"`，该元素的盒模型仍被检查，但像素不计入像素分，只在报告里列出。前提是你没有该素材的使用权。

8. **读报告按“收益”而不是按“顺眼”修**。报告样例里每条 finding 带问题、差值、能涨多少分，并且会追根因：例如“9 个元素高了 16px，很可能因为 h1 比参考矮 16px（font-size 你 48 / 参考 56，line-height 你 56 / 参考 64），改这个其余跟着对齐”。先修这种根因条目。

9. **长页面分段抓**：静图最高 8000px，长页面用 `--selector` 一节一节抓。需要登录态的站点用 `--storage auth.json`。动效参考用 `--motion <ms> --fps 30` 控制采样。

## 对应的研究问题

**1. 能力发现**：原文明确指出的、通常不交给 AI 的一类活是“UI 还原度的核验”——逐元素把参考和实现配对、逐个比对计算样式、把动效拆成“何时开始/持续多久/位移多少/曲线形状（命名缓动、拟合 cubic-bezier、或弹簧刚度与阻尼）”。这件事过去靠资深前端人眼加经验，现在被写成可自动执行的检查。

**2. 任务匹配**：适配对象是 coding agent（Claude Code 等）在**已有代码库/已有技术栈**里改 UI，而不是从零生成页面。工具侧依赖 Playwright Chromium 或本机 Chrome；视频/GIF 参考需要 ffmpeg。协作方式上，原文强调比对是 **markup 无关**的：`<a><span>Go</span></a>` 等同于 `<a>Go</a>`，任何框​​架、类名、组件结构都行；动效也技术无关，CSS `@keyframes` 与 Web Animations API / Framer Motion 只要时序一致就同样满分。为保证可比，页面跑在虚拟时钟上（冻结 CSS 时间线、固定 `Math.random` 种子、固定时间/语言/DPR，从视口截图而非整页缩放）。

**3. 条件供给**：需要提供给 agent 的信息与权限是可枚举的——参考源（URL / 本地 html / 图片 / 录屏）、落点文件、级别、触发动作（`load|reveal|hover:<css>|click:<css>|scroll:<px>|scrub:<px>`）、视口尺寸、要隐藏的元素（`--hide`）、登录态（`--storage`）、以及合法可用的字体/图片/图标/文案（否则改 placeholder）。反馈供给就是 `report.md` + `issues.json` + 对比图（参考/你的/差异三联，带编号热点，热点可放大、动效逐帧对照）。

**4. 主动推进**：有，但是“状态触发”而非“时间/事件触发”——`compare` 非零退出即触发下一轮修复，agent 自己挑当前收益最高的一条改，改完再比，直到通过；上限 8 轮，超限要如实交代剩余问题。原文没有涉及由时间或外部事件自动启动的机制。

**5. 效果验证**：这是全文最实的一块。四轴各自有定义与容差（layout 逐元素配对、几像素容差；style 比对字体族/字号/字重/行高/字距/颜色/背景/边框/圆角/阴影/透明度/滤镜；pixels 用容忍抗锯齿的 YIQ 感知差异并把热点回指到元素；motion 分段拟合），叠加级别门禁与退出码，就构成可判定的通过/不通过。原文还给了可复现性依据：对同一个线上动画页面抓两次必须 100/100 匹配，所以任何差异都是真差异；嵌套动效只算一次（卡片弹入时内部 12 个元素跟随移动算一条，避免刷分）。

## 与已有做法的关系

清单中只有 **Claude Code（tool，adopt）** 一条相关。Replica 是 Claude Code 的一个 skill（安装到 `~/.claude/skills/replica` 或项目内 `.claude/skills/replica` 后被 agent 调用），属于对已有工具的**能力扩展**而非替代：Claude Code 负责改代码，Replica 负责给出测量、评分和修复优先级。其余条目清单中没有相关条目。

## 证据与局限

**原文给出的证据**：
- demo：把 endcap.design（Awwwards 提名）的动画 hero 交给 agent 重建，第一版“看着做完了”只拿 67.2 分，报告点名到单个动画关键帧，第 4 轮以 98.1 通过，全程 25 秒；声明所有分数、截图、动画帧都来自真实运行，只是 findings 有删减。
- 一份真实报告样例：round 1，faithful 级别，总分 79.8，四轴 63.7 / 94.8 / 71.2 / 89.6，7 条修复建议带分值增益与根因链。
- 自测三套 fixture 及其断言：①hero——参考自身必须正好 100 分；markup 不同且用 JS 驱动动画的克隆必须过 faithful；植入 5 个 bug 的克隆必须不通过且 5 个都被点名。②动画 deploy card——含弹簧、错峰行、弹出圆点、360° 旋转、增长的进度条和变色，蓝图必须逐一还原（弹簧刚度误差在几个百分点内）；按报告重建的克隆必须通过；用通用缓动的克隆必须失败，且弹簧只报一次、缺失的旋转要被点名。③header 下随 resize 压缩的 section——用 placeholder 顶替插画的克隆像素分必须 100，因为静图不触发 resize 且 placeholder 不计像素。

**哪些只是作者主张**：67.2→98.1 的 demo、以及“agent 会糊弄、不会自查”的动机陈述，属于作者自述与演示，仓库 33 stars，没有第三方评测或对照实验。自测是作者自己写的测试，能证明实现与其声明一致，但不等于在别人的项目上同样有效。

**适用条件与已知局限**：仅 Web UI，原生移动端不覆盖；静图最高 8000px；`<video>` 元素冻结在第一帧，Canvas 与 WebGL 只按像素与动效帧判断；YouTube、Loom 这类流媒体链接抓不到，必须自己录屏；参考站点的字体、图片、图标、文案版权归原主，skill 会要求改用你自己的资产或 placeholder，除非你有授权。

## 怎么试、怎么验证

**最小试用方式**（半天内可完成）：
1. 选一个已经有明确参考的**小范围**：一个 hero、一个卡片悬停态，或一段菜单开合录屏。不要一上来做整页。
2. 装好后先跑 `doctor` 确认环境，再让 agent 以 `faithful` 级别做；如果只是要布局和动效对齐、内容换成自己的，用 `structure` 更省事。
3. 手动跑一次 `capture` 抓参考，再跑 `compare`，确认未通过时退出码是 `1`。
4. 让循环跑到通过或到 4 轮，保存每一轮的 `report.md`、`issues.json` 和对比图。

**判断有没有改善的指标**：
- **分数曲线**：每轮四轴分与总分是否单调上升、第几轮穿过门禁；停滞在某一轴说明该轴的反馈对 agent 不可操作。
- **退出码**：`1 → 0` 是硬性通过信号，可直接作为 CI 门禁。
- **报告准确率（人工抽检）**：随机抽 5–10 条 findings，人工看图确认问题真实存在（假阳性）；再人工找 2–3 处明显差异，看报告有没有漏（假阴性）。这是判断“分数可信不可信”的关键一步。
- **可复现性自检**：把参考抓两次互比，应得 100；如果不是 100，说明环境不稳定，后面的分数都不可信。
- **对照实验**：同一个组件，一组用 skill、一组不用，让不知情的同事只看看图猜哪个更像参考——若分不出，说明分数提升没有转化成人的感知改善。
- **成本**：轮数 × 单轮耗时，以及 8 轮上限内是否收敛；反复触顶的组件说明该级别的阈值对它不现实。
