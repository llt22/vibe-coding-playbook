# pedrojaques99/visant-skills-public

- 结论：**值得一试**。先在一个自有前端仓库里安装 visant-killer 并运行 killer-scan，把每条 FAIL 交给人工复核误报率，再决定是否纳入手册；它的安装命令、脚本入口、依赖条件和「脚本做硬性校验 + 模型做判断」的分工都可直接照做，但目前只能看到 README，检测器规则目录与 SKILL.md 正文不可见，效果只有作者自述，因此还不足以采纳。
- 原文：https://github.com/pedrojaques99/visant-skills-public
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T23:56:39.573Z

## 是什么

Visant Labs 开源的 Claude Code Skills 集合（MIT），共 9 个技能，分三组：

- **界面**：`visant-killer`（反「AI 味」UI 审计，是入口）、`visant-frontend`（每个元素必须说清它推动哪个业务变量）、`visant-motion`（CSS / framer-motion 的缓动与时长 token、`motion-lint`）、`visant-refine`（图表、仪表、迷你图、滑块、指标卡共用一套解剖结构）、`visant-copy`（巴西葡语文案 + `copy-lint` 检查中英文 AI 腔）。
- **视频**：`site-reels`（把网站 WebGL hero、滚动、3D 录成 1080p MP4 并做 Remotion 宣传片）、`visant-premiere-editor`（从 JSON 剪辑单生成 Premiere 粗剪）、`visant-video-editor`（原始素材的拆条、不切字的静音剪切、响度、章节）。
- **流程**：`visant-methodology`（9 阶段品牌方法与阶段间依赖）、`visant-preflight`（大项目开工前一轮提问 + 五项前提核查）、`visant-mcp-connect`。

设计上有两个可迁移的要点：

1. **技能先探测目标仓库已有的东西**（gates、primitives、tokens），再决定动作——README 称因此「work in any repo」。
2. **检测器是真脚本，构成硬性校验**：`npm test` 用 fixtures 对每条规则做正反双向验证；`killer-scan` 一次跑 4 个 gate（impeccable / audit:design / copy / noise），输出末尾给出 `gates: 4/4 ran [...]; none skipped` 和 `GATE CLOSED`，并明确「A gate finding becomes a fix, not a proposal」。

README 给了一个完整例子：一个典型 AI 定价卡（`text-purple-500`、`<em>` 斜体标题、display serif + 负字距、`text-white/50 /70 /40 /90` 透明度阶梯、em-dash、en-hype）被 4 个 gate 中的 3 个报错，并注明 `via killer-scan built-in FALLBACK; token layer found (shadcn components.json): palette classes bypass it`。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**步骤 1：确认依赖**。按需要的技能分别准备：

| 技能 | 依赖 |
|---|---|
| 全部检测器 | Node 20+，无需构建步骤 |
| `visant-killer` 的屏幕检查 | Playwright（可选） |
| `site-reels` | Chrome 或 Edge、ffmpeg、Node |
| `visant-premiere-editor` | Premiere Pro + premiere-pro-mcp、Python |
| `visant-video-editor` | bash、ffmpeg、Python、faster-whisper |

前提：只想做界面审计的话，只需 Node 20+，环境门槛很低；视频类技能门槛高，暂不建议作为首次试用。

**步骤 2：安装技能**。前提：有可写的 `~/.claude/skills/`。

```bash
npx skills add pedrojaques99/visant-skills-public                       # pick from the list
npx skills add pedrojaques99/visant-skills-public --skill visant-killer # just one
```

或者直接把技能文件夹复制进 `~/.claude/skills/`。

**步骤 3：先单独跑检测器，不经过模型**。前提：已 clone 仓库、Node 20+。

```bash
npm install
npm test                                              # every detector's self-test, both ways
node visant-killer/scripts/killer-scan.mjs <app/src>  # the whole gate, from any folder
node visant-motion/scripts/motion-lint.mjs <app>
node visant-copy/scripts/copy-lint.mjs <file-or-folder>
bash visant-video-editor/scripts/self-test.sh         # needs ffmpeg
```

前提：`<app/src>` 换成自己项目的源码目录；README 强调可从任意文件夹运行。

**步骤 4：在 Claude Code 里用自然语言触发**。前提：已完成步骤 2。README 给出的触发语（英文或葡语）：

```text
audit this screen
tá com cara de IA
make this smoother
edit this lesson
```

**步骤 5：把 FAIL 当修复项而非建议**。读 `killer-scan` 输出时按它的三条判定口径校准自己的预期：

- palette 类只有在**存在 token 层**时才计为 bypass（找不到 token 层走 built-in FALLBACK）；
- `icons/` 目录下的 SVG 和品牌 logo **不算**手绘图标；
- component **不等于** route；托管结账页 **不算**未埋点的表单。

**步骤 6（可选）：接入组件库**。前提：项目用 shadcn，且有 `components.json`。

```json
// components.json → "registries": { "@visant": "https://ui.visantlabs.com/r/{name}.json" }
```

```bash
npx shadcn@latest add @visant/gauge
```

给 agent 用的索引在 `ui.visantlabs.com/llms.txt`。

**步骤 7（Windows，可选）：把 skills 目录指向本仓库**。前提：git 工作区干净。

```bash
node link.mjs            # Windows: which ~/.claude/skills folders already point here
node link.mjs --apply    # point them here with junctions (needs a clean git tree)
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 明确把这几类原先靠资深设计师肉眼判断的工作交给 Claude Code——AI 味界面审计、动效参数检查、文案 AI 腔检查（中英葡）、图表/仪表解剖结构统一、站点录屏成片、从 JSON 剪辑单生成 Premiere 粗剪、原始素材拆条与静音剪切。定价卡例子是具体的「没想到交出去」的样本。

**2. 任务匹配**：README 给出了明确的分工判断：可枚举的规则交给脚本检测器（作为硬性校验），不可枚举的判断交给模型——「That is only the script half. The skill then judges what no detector sees (does each element move a business variable?), opens the screen in a browser, argues against its own verdict and scores the result.」即：**确定性检查→脚本；语义判断、反方论证、打分、开浏览器验证→模型**。视频类中需要外部软件操作的（Premiere）通过 MCP 接入，属于工具耦合型任务。

**3. 条件供给**：有依据的条件包括——① 项目侧上下文：技能必须先发现仓库的 gates / primitives / tokens 才能正确判定，README 的校准案例（shadcn-ui/taxonomy 的 CSS 变量 token 层、vercel/commerce 的「没有 token 层」）说明「项目有没有设计系统」直接改变结论；② 运行环境：Node 20+、Playwright（可选）、Chrome/Edge、ffmpeg、Python、faster-whisper、Premiere Pro + premiere-pro-mcp；③ 反馈回路：`npm test` 的 fixtures 双向自测、`gates: N/N ran ... none skipped` 的执行完整性统计；④ 权限/安装位置：技能放到 `~/.claude/skills/`。

**4. 主动推进**：README 只支持「事件触发」这一层——审计发生在 **PR 之前**（「how to audit a screen before the PR」）、`npm test` 可作为提交/CI 步骤、本仓库自身每个 commit 过 gitleaks 与客户名检查门禁。**没有**关于时间触发、状态轮询、长期持续运行的描述，这一项依据薄弱，不要据此写「可持续自动推进」。

**5. 效果验证**：有依据的验证手段有三层——① 规则级：`npm test` 对每条规则用 fixtures 验证「两个方向」（既验该报的报，也验不该报的不报），每个校准修复都被 fixture 锁定；② 仓库级：在三个非自家公开 Next.js 项目上从外部跑检测器并校准，README 给出结果表（vercel/commerce：token gate 通过、noise 2 条 `hover-lift`、1 条 LOW；shadcn-ui/taxonomy：token 9 条 palette 绕过、noise 2 条、分发 1 条 HIGH；steven-tey/precedent：token 4 条裸 hex + 1 条 palette-chaos、noise 2 条、分发 clean）；③ 结果级：`killer-scan` 自带打分与魔鬼代言人环节。**但没有任何业务指标**（转化率、缺陷率、返工工时）的前后对比。

## 与已有做法的关系

清单中只有一条相关条目：**Claude Code（tool，status=adopt）**。本仓库不是新工具，而是 Claude Code Skills 机制的一套具体落地样例，可直接用来观察清单里已采纳的 Claude Code 还能怎么用：技能目录组织（`~/.claude/skills/`）、自然语言触发短语、技能内嵌可执行脚本、技能先探测仓库约定再行动。如果要在手册里写「给 Claude Code 装专用技能」，这份 README 提供了可复制的安装与运行命令。除此之外清单中没有相关条目。

## 证据与局限

**原文给出的（可作为依据）**：
- 安装命令、脚本入口、`npm test`、各技能依赖表，均为可复制执行的具体内容。
- 一段完整的 `killer-scan` 输出（含文件名、行号、规则名如 `tailwind-palette`、`em-dash`、`en-hype`、`italic-headline-word`、`display-serif-tight`、`opacity-ladder`）。
- 三个外部仓库的检测结果与数量，以及校准后收窄的三条判定口径（palette 需有 token 层才能算 bypass、`icons/` 与品牌 logo 不算手绘、component 不等于 route、托管结账不算未埋点表单）。
- 出处与致谢清单（impeccable / pbakaus、revenue-centric-design、Emil Kowalski、Vercel agent-skills、premiere-pro-mcp、OpenTimelineIO、Remotion、FFmpeg、auto-editor、faster-whisper、shadcn/Radix/Playwright），MIT 许可，62 stars。

**只是作者主张、未获验证**：
- 「They work in any repo」——跨仓库通用性由三个 Next.js 项目支撑，非前端/非 Tailwind 栈未验证。
- 「calibrated until what remained was defensible」——没有给出误报率、漏报率的任何数字，也没有第三方复核。
- 三个外部仓库的结果来自作者自跑，无对照、无盲评。
- 「skill then judges ... argues against its own verdict and scores the result」——判断质量完全无法从 README 评估。

**材料本身的局限**：抓取到的是仓库 README，**不是** `SKILL.md` 正文，也不是检测器源码。因此「规则清单到底有多长（提到 slop signals 47–57 为作者所加，但目录不可见）」「技能提示词怎么写」「打分如何计算」都无从判断。这份材料只支持「按命令跑起来试一试」，不支持「照抄规则进手册」。

**适用条件**：前端项目，尤其 React + Tailwind + shadcn；`visant-copy` 偏向巴西葡语；界面判断内嵌 Visant 的「收入中心设计」观点（来自 revenue-centric-design），不是中立规范；视频类技能依赖本地 Premiere + MCP，复现成本高。

## 怎么试、怎么验证

**最小试用（1–2 小时，单人可完成）**：

1. 选一个自己熟悉、**已经有 CSS 变量 token 层**的前端仓库（有 token 层才能触发 README 说的那套判定逻辑），先记录当前人工 review 的基线：请一位设计师在不看检测器输出的情况下独立列出同一屏幕的问题清单。
2. 跑 `npm install && npm test`，确认自测通过——这一步同时验证「脚本是真的」。
3. 跑 `node visant-killer/scripts/killer-scan.mjs <app/src>`，保存完整输出。
4. 逐条把 FAIL 标注为「真问题 / 无意义 / 误判」，并把人工清单与检测器清单做差集。
5. 再装技能，用 `audit this screen` 触发，比较「纯脚本」与「脚本 + 模型判断」两轮输出多了什么、错了什么。

**判断有没有改善的指标**：

- **误报率** = 人工判为无意义的 finding ÷ 总 finding。没有现成阈值，但低于约 20–30% 才值得放进 PR 门禁，否则会被绕过。
- **增量覆盖率** = 检测器发现而人工设计师漏掉的真问题数。这是「AI 补位」的核心证据。
- **重合计** = 两者都发现的问题占比，用来判断是否只是重复劳动。
- **执行完整性**：输出里的 `gates: N/N ran ... none skipped`，用于判断本次结果是否完整可信。
- **时间成本**：安装 + 首次审计总耗时 vs 人工审查同一屏耗时，以及稳态后每次审计耗时。
- **门禁效果（若上 CI）**：一个迭代周期内，因门禁失败而修改的 PR 数，以及其中「作者认为改对了」的比例。
- **回归稳定性**：修改项目或升级技能后重跑 `npm test` 与 `killer-scan`，若 finding 数量突变而代码没变，说明规则不稳定。

**升级为 adopt 的前置条件**：读到 `visant-killer/SKILL.md` 与检测器规则目录，确认规则可解释；误报率可接受；至少一个真实仓库跑通一整轮。在此之前保持 try。

> 注：以上全部依据仓库 README，未获取 `SKILL.md` 正文与检测器源码，也未能实际执行任何命令；命令与依赖表照原文抄录，未做补充。
