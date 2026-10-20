# lovisdotio/motion2code

- 结论：**值得一试**。可在 Claude Code / Cursor 等已装技能的智能体里装这个技能，先用一段 10 秒左右的扁平动效视频跑通“study_video 看片 → 写页面 → frame_diff 逐帧打分 → check_anim --runtime 体检 → side_by_side 出证明视频”这条闭环；它把“看起来对”换成了可打分、可复现的逐帧对照，并给看不见视频的 agent 补上了“眼睛”。但它只覆盖扁平矢量动效、绑定 GSAP 生态、案例全部出自作者自证，所以先小范围试，重点是把这套“确定性 seek + 逐帧对照”的验证方式搬到其他视觉产出任务上。
- 原文：https://github.com/lovisdotio/motion2code
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T22:55:32.417Z

## 是什么

motion2code 是一个分发给编码智能体的“技能（skill）”包：把一段动效设计视频（或 App / 网页录屏）重建为干净、可编辑的代码——内联 SVG 图形 + 一条 GSAP 时间线，可逐帧 seek、无缝循环，并与源视频并排逐帧对照；对录屏类素材还会进一步产出可交互的真实页面（用 GSAP ScrollTrigger 实现真实滚动、按钮、键盘与移动端支持）。

它本身不是模型，而是“流程 + 脚本 + 硬规则 + 安装适配器”的组合，支持 Claude Code、Codex、Cursor、Copilot、Gemini CLI 等（原文称约 70 多个 agent）。

作者对痛点的主张：agent 看不到视频，被要求“复刻这段片子”时只能凭想象写——节拍落在错误的秒数、源片是硬切加过冲却写成 `power1.inOut`、颜色靠记忆、按模型拼错的拼写写文字、循环处跳帧；有的 agent 会悄悄把视频嵌进去或描帧而不是真正重建。该技能的定位就是堵这几个洞：“先看再写”“一个时钟一份契约”“用证明代替‘看起来对’”。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 1. 准备运行环境
前提：本机已有 Python 3.9+ 与 ffmpeg；会开浏览器的脚本还需要 Playwright + chromium。
```bash
# 方式一
uv run --with playwright python ...
# 方式二
pip install playwright && python -m playwright install chromium
```

### 2. 安装技能（按你用的工具选一条）
前提：Claude Code 走插件市场；其他工具走 skills 包或手工拷目录。

Claude Code：
```bash
claude plugin marketplace add lovisdotio/motion2code
```
```bash
claude plugin install motion2code@motion2code
```
或者直接拷技能目录：
```bash
cp -R skills/motion2code ~/.claude/skills/
```

Codex / Cursor / Gemini CLI / Copilot 等（通过 skills 分发）：
```bash
npx skills add lovisdotio/motion2code
```
手工安装：
- **Codex**：把 `skills/motion2code` 拷到 `~/.agents/skills/`
- **Cursor**：拷到 `~/.cursor/skills/`，并加上 `adapters/cursor/` 里的规则
- **Copilot**：`gh skill install lovisdotio/motion2code motion2code`，并加上 `adapters/copilot/`
- **Gemini CLI**：`gemini extensions install https://github.com/lovisdotio/motion2code`
- **Hermes**：拷到 `~/.hermes/skills/`
- **claude.ai**：把 `skills/motion2code` 打包 zip，在 Settings > Capabilities > Skills 里上传
- **ChatGPT、Gemini Gems 等纯聊天工具**：见仓库 `adapters/` 目录

### 3. 准备源片与任务说明（brief）
把要复刻的片段（例如 `clip.mp4`）放好；需要完整 brief 时填写 `prompts/convert-video-prompt.md`（仓库另有“源提示词怎么写”的建议）。然后用自然语言下指令，例如：
> Rebuild clip.mp4 as an SVG + GSAP animation that loops
>
> turn this app screen recording into a real site

### 4. 让 agent 先“看片”，再动手
前提：已完成第 1、2 步；这一步产出的是 agent 能读的“视觉事实”，而不是让模型凭空想象。
```bash
python3 scripts/study_video.py clip.mp4 -o study/
```
输出：每 0.25 s 一帧（按时间命名）、每次检测到的硬切前后帧、一张 contact sheet、精确的扁平调色板、以及源片是否循环的评分，汇总在 `study.json`。
需要单独取色时：
```bash
python3 scripts/palette.py ...
```
（`palette.py` 打印视频或图片的精确扁平色十六进制值及其占画面比例。）

### 5. 写页面：必须满足“页面契约”与硬规则
前提：这是后面所有自动校验的基础，不满足就无法逐帧对照。
页面契约：
```js
window.anim = { tl, duration, seek(t), play(from), pause() }   // seek(t) is a pure function of t
```
- `index.html?t=6.5` 冻结在第 6.5 秒；`?external=1` 等待被外部驱动；不带参数则自动播放并循环。
- 字体加载完、首帧画完后，设置 `<html data-ready="1">`。
- 自包含：内联 SVG、cdnjs 的 GSAP 3、仅在做形变时用 jsdelivr 的 flubber、Google Fonts，其他一律不加。

硬规则（原文 Hard rules）：
- 只用给定的源视频：绝不重新生成、绝不内嵌视频、绝不描帧。
- 文字严格按源提示词里的写法，即使视频里拼错了也照抄。
- 扁平形状用 SVG，颜色从源片采样。
- GSAP 时间线是唯一时钟。
- 循环在代码里完成：`frame(duration)` 等于 `frame(0)`。
- 每个时刻都要和源片并排对照过。

### 6. 逐帧对照打分，定位最差时刻
```bash
python3 scripts/frame_diff.py clip.mp4 index.html -o diff/
```
输出：指定时刻（或某段区间的每一帧）的“源片 | 代码”成对图、全部配对的拼图、每个时刻的差异分数以及最差五处。

### 7. 运行时体检（含循环接缝与 seek 确定性）
```bash
python3 scripts/check_anim.py index.html --runtime
```
检查：页面契约是否满足、脚本白名单、是否混入内嵌位图或视频；加 `--runtime` 后会无头打开页面，检查控制台报错、网络请求、循环接缝、`seek` 是否确定性、页面是否自动播放。

### 8. 逐帧渲染出片
```bash
python3 scripts/render_anim.py index.html -o anim.mp4
```
通过 `anim.seek` 逐帧渲染为 mp4、GIF poster 或 PNG 序列，可用 `--size` 指定任意尺寸——因此不会丢帧或重复帧。

### 9. 出“证明视频”
```bash
python3 scripts/side_by_side.py clip.mp4 anim.mp4 -o side_by_side.mp4 --html index.html
```
把源片与渲染结果叠成一条带标注的对照视频（横屏或竖屏）。

### 10. 查看现成范例的对照页
```bash
python3 -m http.server -d gallery/eye
```
然后打开 `http://127.0.0.1:8000/compare.html`。`gallery/` 下每个文件夹都有 `index.html`（自包含成品）、`compare.html`（源片与代码逐帧同步并排）、`source.mp4`（480p 源片）、`poster.gif`，录屏类另有 `site.html`（可交互真站）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（哪些工作还没想到交给 AI）**
- “看视频并把它还原成代码”本身是一个反直觉的可交付项：输入是一段 mp4，输出是可编辑的 SVG + GSAP 页面，还能升到 4K/8K/16K/32K 仍清晰、体积只有几十 KB。
- 更进一步：把视频模型生成的“假录屏”变成真正可交互的站点（真实滚动 ScrollTrigger、按钮、键盘、移动端）——这件事通常不会被派给 AI。
- 附带发现：agent 在无视觉输入时会“假装看懂”（写错节拍/缓动/颜色/拼写，甚至偷偷嵌视频或描帧），说明“给 agent 造眼睛”本身就是一类可外包的工作。

**2. 任务匹配（什么工作适合什么模型、工具与协作方式）**
- 适合：扁平矢量风格的动效/排版动画/UI 动效录屏 → 代码；这类目标能被 SVG + 单一 GSAP 时间线表达。
- 工具分工明确：agent 负责写页面与判断，脚本负责“看”和“量”（`study_video.py` 采帧与调色板、`frame_diff.py` 打分、`check_anim.py` 体检、`render_anim.py` 出片）。
- 协作方式的关键设计是“一个时钟一份契约”：所有验证都建立在 `seek(t)` 是 t 的纯函数之上，才能做到确定性重放与对比。
- 跨工具可移植：同一技能通过插件市场 / `npx skills add` / 手工目录 / `adapters/` 分发到多种 agent，说明这类能力适合封装成 skill 而不是绑死在某一个模型上。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 信息：源视频本身（且明确“只能用这个源”）、填好的 `prompts/convert-video-prompt.md`、源片里的精确文字（即使拼错也照抄）。
- 工具：Python 3.9+、ffmpeg、Playwright + chromium（无头浏览器）、GSAP/flubber/字体的 CDN 白名单。
- 权限：允许脚本启动无头浏览器、发起网络请求、读写本地帧图与视频文件。
- 反馈：不是“我觉得像”，而是 `frame_diff.py` 的每时刻分数与最差五帧、`check_anim.py --runtime` 的报错/网络/接缝/确定性结果——即把反馈做成机器可读的信号回灌给 agent。

**4. 主动推进（时间/事件/状态触发并持续完成）**
- 原文没有给出定时或事件触发的自动化编排，这一点只能算基础设施已就绪：`?external=1` 让页面等待被外部驱动、`seek(t)` 是纯函数、`frame_diff.py` 直接产出每时刻分数，因此“渲染 → 打分 → 定位最差时刻 → 回去改”可以脚本化成循环；但仓库 README 未声明已实现该循环，属于可推断而非原文事实。
- 原文给出的“状态标记”只有一个是明确的：`<html data-ready="1">` 在字体加载完、首帧画完后置位，可作为下一步动作的触发条件。

**5. 效果验证（怎样判断确实改善了结果）**
这是该仓库最值得抄的部分，方法可概括为“证明，而不是‘看起来对’”：
- 逐帧并排 + 差异分数：`frame_diff.py` 给出每个时刻的分数并排出最差五处，能把“哪一秒不对”量化定位，而不只是整体观感。
- 运行时契约检查：`check_anim.py` 校验页面契约、脚本白名单、是否内嵌位图/视频；`--runtime` 再加控制台报错、网络请求、循环接缝、`seek` 确定性、自动播放。
- 循环质量有专门测量：即使源片本身不循环，也要求最后一刻回到与开场完全相同的帧，接缝由 `check_anim.py` 度量。
- 出片不丢帧：`render_anim.py` 通过 `seek(t)` 逐帧渲染，避免录制式出片的丢帧/重复帧。
- `side_by_side.py` 产出可交付给他人复核的对照视频。

## 与已有做法的关系

- **Claude Code（adopt）**：本技能提供 Claude Code 的插件市场安装路径（`claude plugin marketplace add` / `claude plugin install`）与 `~/.claude/skills/` 手工安装方式，是 Claude Code 技能生态里的一个具体能力包；也可作为“如何给 Claude Code 写一个带脚本与硬规则的技能”的样板。
- **Cursor（watch）**：原文给出 `~/.cursor/skills/` 拷贝安装 + `adapters/cursor/` 规则的做法，说明在 Cursor 下需要额外补一层规则适配，而不是即插即用。
- **Hermes（watch）**：原文支持拷到 `~/.hermes/skills/`，可作为 Hermes 技能目录约定的一个参考样例。
- 清单中没有与“视频转代码 / 逐帧视觉回归”直接对应的条目。

## 证据与局限

**原文给出的可核查材料**
- 6 个重建案例（gallery）：动效排版（10 s，24 KB）、匹配剪辑（10 s，40 KB）、节日站点回放（15 s，52 KB，含 real site）、天气站回放（15 s，60 KB，含 real site）、贴纸作品集回放（15 s，56 KB，含 real site）、播客播放页回放（15 s，36 KB，含 real site）。每个案例都带 `compare.html` 逐帧对照与 480p 源片，可直接自查。
- 源片由 MiniMax H3 Max（fal）生成，由 Claude Opus 5.5 用该技能重建（原文所述）。
- 仓库结构、脚本清单与各脚本输出物、页面契约、硬规则均写死在 README 中；MIT 许可。

**属于作者主张、未见独立验证的部分**
- “agent 会写错节拍/缓动/颜色/拼写、会偷偷嵌视频或描帧、循环处跳帧”——是作者对失败模式的描述，没有给出对照实验或统计。
- “代码在 4K/8K/16K/32K 仍清晰、只有几十 KB、可编辑”——这是矢量方案的属性推论，原文未提供各尺寸的实测。
- 6 个案例全部由作者用同一套技能与同一批模型生成，存在自证偏差；仓库 43 stars，缺第三方评测或生产项目引用。

**适用条件与边界**
- 目标必须能扁平化为 SVG 图形 + 单条 GSAP 时间线；照片级写实、复杂 3D、真人实拍素材不在其描述范围内。
- 输出绑定 GSAP 生态（GSAP 3 + flubber + Google Fonts + 指定 CDN 白名单）；若你的技术栈不允许这些依赖，需要自行改写契约与校验脚本。
- 需要 ffmpeg 与 Playwright/chromium 环境；运行时校验依赖无头浏览器，在受限 CI 环境可能跑不通。
- 对源片质量与“扁平色板”有假设（`palette.py` 输出的是扁平色）；渐变、半透明、噪点较多的素材效果未知。

## 怎么试、怎么验证

**最小试用（半天量级）**
1. 在 Claude Code（或 Cursor，注意加 `adapters/cursor/` 规则）里装好技能，确认 Python/ffmpeg/Playwright 就绪。
2. 选一段 5–10 秒、纯扁平矢量风格、文字量少的动效片作为 `clip.mp4`（不要挑写实素材）。
3. 依次执行：`study_video.py` → 让 agent 按页面契约与硬规则写 `index.html` → `frame_diff.py` → `check_anim.py --runtime` → `render_anim.py` → `side_by_side.py`。
4. 对照仓库自带的 `gallery/` 案例（`python3 -m http.server -d gallery/eye` 打开 `compare.html`）校准你自己的期望值。

**判断有没有改善的指标**
- 过程指标：`study_video.py` 是否成功产出帧/切点/色板/循环评分（没有这些，说明“先看”这一步没走通）；`check_anim.py --runtime` 是否 0 控制台报错、是否出现非白名单网络请求、`seek` 是否判定为确定性、循环接缝是否通过。
- 结果指标：`frame_diff.py` 的每时刻差异分数分布与最差五处——重点看“最差时刻”是否集中在你最在意的转场；对比“不用技能、直接让 agent 复刻”的基线，看最差分数是否下降、最差时刻数量是否减少。
- 产物指标：`index.html` 体积（同类案例原文为 24–60 KB 量级）、是否零内嵌位图/视频（`check_anim.py` 可判）、任意 `--size` 下是否仍清晰。
- 人工复核：看 `side_by_side.mp4`，做盲评（不告知哪边是源片）判断能否区分；这是对机器分数的必要补充。

**迁移验证（更值得做的一步）**
把该仓库的验证模式单独抽出来，套到你自己的视觉产出任务上：给产物定义“确定性重放接口”（类比 `seek(t)`）+ 一个逐帧/逐版本对照打分脚本 + 一组运行时硬检查（报错、外部依赖、接缝/边界一致性）。若这套结构在你的任务上也能把“看起来对”变成可打分的数字，那才是本项目真正可复用的收获。
