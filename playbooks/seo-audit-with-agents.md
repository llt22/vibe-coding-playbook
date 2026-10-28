# 把站点审计变成能核对、能闭环的修复清单

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：站点审计问题一次来太多、无法核对、改完不知道是否生效；这篇手册给出一套单页起步、人工抽查、漂移对比的闭环流程。
> 先试这一步：先选一个真实站点的一个关键页面跑单页审计（Claude Code 用 /seo page，Codex CLI 用 $seo page），人工核对前 5–10 条建议是否成立，再决定要不要全站审计。
> 最近修订：2026-10-28

## 解决什么问题

站点审计这类工作的难点不是「发现问题」，而是问题一次来太多、没有优先级、也没人说得清哪条真的成立。直接问 AI「帮我看看网站 SEO」，拿到的是笼统清单：无法核对、无法交接、改完不知道有没有用。

这篇手册给一套可照做的流程：在 Claude Code 里用 claude-seo，或在 Codex CLI 里用 codex-seo，先跑单页、再决定是否全站审计；用固定动作抽查并筛掉站不住的建议；修完用快照对比确认是否生效。核心不是某个插件，而是这条纪律——**每条建议都必须说得出依据、依赖条件和验证方法，否则不执行**。

## 适用与不适用

**适用**

- 二选一：已装 Claude Code（1.0.33 或更新）并可用 Python 3.11–3.14；或使用带 skills 支持的 OpenAI Codex CLI 并可用 Python 3.11–3.14。
- 手上有一个真实站点要做 SEO / 内容站，而不是在纸上谈方法论。
- 愿意自己核对输出、而不是照单执行的人。

**不适用**

- 只想让 AI 写几段 SEO 文案：这不是文案工具，它的产出是审计报告。
- 需要外链库、需要深爬全站的场景：作者自己说 Screaming Frog 这类爬虫爬得更快更深，大型 SEO 套件有自己的外链库；本插件的差异在解释、按影响排序、覆盖 AI 搜索、可用自然语言追问，建议两者并用。
- 关键内容要滚动或点击之后才加载的页面：原文说这类页面结果可能有噪声。
- 合规上不能把页面内容发给模型的场景：Claude Code 方案会把页面与分析内容发送给 Anthropic 模型；Codex CLI 方案会发送给 Codex 会话背后的 OpenAI 模型；部分检查还会读 Wikipedia、Reddit、Common Crawl 等公开源。

**做法 A / B 怎么选**

- 已有 Claude Code 使用条件，走做法 A（claude-seo）。
- 已有带 skills 支持的 Codex CLI，走做法 B（codex-seo）。
- 两个都有：先用同一个关键页面各跑一次单页审计，按第 4 步统计前 10 条建议的成立与可落地条数，再选一个跑全站。Codex 版是 claude-seo 上游 v2.5.0 的移植，上游继续演进时可能滞后；维护者规模小（42 stars），长期可用性未经检验。

## 前置条件

- 做法 A：Claude Code **1.0.33 或更新版本**。
- 做法 B：带 skills 支持的 OpenAI Codex CLI。
- 两种做法都需要本机 **Python 3.11–3.14**。
- 一个真实站点 URL。
- （可选）免费 Google API key：PageSpeed Insights、Chrome UX Report、Search Console、GA4，key 留在本机。
- （可选）第三方扩展账号：SE Ranking、Profound、Bing Webmaster、Unlighthouse。

**不接 key 的后果要先知道**：Core Web Vitals 只是实验室估计值，索引状态是从页面推断的。带这两项结论做决策前，先判断自己能否接受这个精度。

**成本要先知道**：全站 audit 比单页检查更耗资源。Codex README 提示全站审计在主会话里跑 17 个角色，token 消耗显著更高；Claude Code 侧一次全量 `/seo audit` 也比单页检查更耗 Claude 额度。先跑单页。

## 操作步骤

### 1. 选做法并安装

**做法 A：在 Claude Code 内装 claude-seo**（默认选这个）

```bash
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo
/seo setup
```

预期：`/seo setup` 准备插件自用的独立 Python 环境和 headless 浏览器，README 声称「不会动系统其它部分」。

需要手动安装或改 `agents/` 下模型配置时：

macOS / Linux：

```bash
git clone --depth 1 https://github.com/AgriciDaniel/claude-seo.git
bash claude-seo/install.sh
```

一键脚本方式（README 要求先看再跑）：

```bash
curl -fsSL https://raw.githubusercontent.com/AgriciDaniel/claude-seo/main/install.sh > install.sh
cat install.sh        # review before running
bash install.sh
rm install.sh
```

Windows PowerShell：

```powershell
git clone --depth 1 https://github.com/AgriciDaniel/claude-seo.git
powershell -ExecutionPolicy Bypass -File claude-seo\install.ps1
```

为什么用 `git clone` 而不是 `irm | iex`：README 明确说明后者会被 Claude Code 自带的安全护栏判为供应链风险。

**做法 B：在 Codex CLI 里装 codex-seo**

macOS / Linux：

```bash
git clone --depth 1 https://github.com/zhtyyx/codex-seo.git
bash codex-seo/install.sh
```

Windows PowerShell：

```powershell
git clone --depth 1 https://github.com/zhtyyx/codex-seo.git
powershell -ExecutionPolicy Bypass -File codex-seo\install.ps1
```

预期：安装器把技能复制到 `~/.agents/skills/`（Codex 从这里发现用户技能），并创建带无头浏览器的隔离 Python 运行时，不动系统全局环境。卸载用 `bash uninstall.sh`。

**怎么选**：日常用 Claude Code 的直接走 A，少一步出错机会；需要离线分发、批量部署或改 `agents/` 下模型配置的走 A 的手动安装。已经在用 Codex CLI 的走 B；不要在两套命令之间混用前缀。

### 2. 环境自检，不过关就别往下跑

做法 A：

```bash
/seo doctor
```

做法 B：

```
codex
$seo setup     # 创建/刷新隔离 Python 运行时和 Chromium
$seo doctor    # 只读体检，不改动系统
```

预期：确认技能被发现、隔离运行时可用、运行环境就绪且不改动系统。自检失败时继续跑审计，后面的报告不可信。

### 3. 先单页，再全站

做法 A：

```bash
claude                                   # start Claude Code

/seo page https://example.com/pricing    # one page, in depth
/seo audit https://example.com           # full site audit with a prioritized plan
/seo geo https://example.com             # how ready you are for AI search
/seo schema https://example.com          # check and generate structured data
/seo local https://example.com           # local SEO and Google Business Profile
```

做法 B：

```
codex
$seo page https://example.com/pricing    # 单页深度分析
$seo audit https://example.com           # 全站审计，输出按优先级排好的行动计划
$seo plan saas                           # 按行业规划：saas / local / ecommerce / publisher / agency
$seo technical https://example.com       # 9 大类技术审计
$seo content https://example.com
$seo schema https://example.com
$seo geo https://example.com              # AI Overviews / 生成式引擎优化
$seo agentic https://example.com          # Lighthouse Agentic Browsing、llms.txt、Markdown、WebMCP
$seo local https://example.com
$seo backlinks https://example.com
$seo ecommerce https://example.com
```

也可以用自然语言触发，例如「帮我做一次 SEO 审计，网址是 …」。

前提：换成一个你真实拥有的站点，别用示例域名。

预期：做法 A 输出 Markdown / PDF / JSON 报告，保存在本机，按重要性排序；一次全量审计最多 17 个 agent 并行工作，作者宣称 10–15 分钟（作者自报，不是你的实测值）。做法 B 默认把报告存为 Markdown，说一句「生成 PDF 报告」即走 `$seo google report`；全站审计在主会话跑 17 个角色，token 消耗显著更高。**把实际耗时记下来；Codex 侧同时记 token 消耗**，这就是你的基线。不要一上来跑全站。

### 4. 人工抽查，再决定改什么

这一步不能跳。做法 A 抽查优先级最高的前 5 条；做法 B 按调研建议取前 10 条。逐条问三个问题：

1. 这条建议说得出来源、依赖条件和「你怎么知道它生效」吗？
2. 它和页面实际内容吻合吗？（插件会把结构化数据和页面内容做比对，样例报告里点名 `founder` 字段缺了联合创始人——这类具体结论要回页面核实）
3. 用人工检查或现成爬虫对同一批检查项交叉验证，对得上吗？做法 B 可手工查 robots.txt / sitemap / 页面源码 / 结构化数据，或用 Search Console、PageSpeed Insights 交叉验证；做法 A 可用人工检查或作者也提到的 Screaming Frog。

预期：得到一份「成立 / 不成立」的判断清单，而不只是一份待办列表。**不成立的那几条，是后面判断工具是否适合你的主要依据。** 做法 B 的最小试用建议统计前 10 条中「成立且能落地」的条数；调研报告给出的门槛是建议 ≥6 条才算可用，这是试用判断门槛，不是实测效果数据。

### 5. （可选）接免费 Google API 换真实数据

做法 A：

```bash
/seo google setup
```

做法 B：

```
$seo google setup
```

前提：愿意把 key 留在本机。

预期：Core Web Vitals 从实验室估计变成真实字段数据，索引状态不再靠推断。如果第 4 步的抽查里，问题集中在速度与索引判断上，这一步的收益最大。

### 6. 控制成本

做法 A：默认五个需要更多判断的 agent 跑 Opus，其余跑 Sonnet。要改模型，直接改 `agents/` 下对应 agent 文件。前提：先知道一次全量 `/seo audit` 比单页检查更耗 Claude 额度。预期：把部分 agent 从 Opus 降到 Sonnet 后重跑，对比第 4 步那 5 条建议的质量是否下降；没下降就保持降级配置，这是最省事的省钱方式。

做法 B：材料没有给出模型分配细节，只给出单页与全站的成本差异。先单页记录耗时与 token；确认输出形态和抽查成立率可接受，再决定是否全站。

### 7. 修完之后做漂移对比，闭合验证

做法 A：

```bash
/seo drift baseline <url>            # 修之前存一个快照
/seo drift compare <url>             # 修之后对比
/seo drift history <url>             # 看历史
/seo google report                   # 把 Markdown 报告转成 PDF
```

做法 B：

```
$seo drift baseline <url>
$seo drift compare <url>
$seo drift history <url>
```

预期：做法 A 对应 Critical Issue 消失、评分变化可查；做法 B 基于 SQLite 快照做漂移对比。挑 2–3 条高优先级且低风险的项修掉，修复前先 baseline，修复后（Codex 调研建议以两周为复查点）跑 compare，看该项是否从告警中消失、且未引入新告警。

注意：原文没有说明支持定时或事件触发的自动执行，所以「自动监控」这一层只能算命令具备、调度没做。Codex README 也未给出定时调度或 CI 集成的具体配置；需要自动就跑 cron 或 CI 之类的你自己的调度，别假设它会自己跑。

### 8. （可选）扩展

做法 A：

```bash
/seo seranking [command]     # ChatGPT/Gemini/Perplexity/AI Overviews 的 AI Share-of-Voice
/seo profound [command]      # LLM 引用追踪（时间序列）
/seo bing [command] <url>    # Bing Webmaster + IndexNow 即时提交
/seo unlighthouse <url>      # 全站多页 Lighthouse，本地跑
```

做法 B：

```
$seo image-gen
$seo seranking [command]     # AI 声量份额
$seo profound [command]      # LLM 引用追踪
$seo bing [command] <url>    # IndexNow 提交
$seo unlighthouse <url>      # 多页 Lighthouse
```

前提：有对应账号。没账号就不用开，不影响主流程。

### 9. 试用无效就卸载

做法 A：

```bash
/plugin uninstall claude-seo@agricidaniel-claude-seo
```

做法 B：

```bash
bash uninstall.sh
```

试用没带来可观察改善就卸掉。留着不用的插件只会让下一次审计多一层不知道从哪来的结论。

## 怎么判断变好了

**最小试用方式（半天内可完成）**

1. 做法 A 跑 `/seo setup` → `/seo doctor`；做法 B 跑 `$seo setup` → `$seo doctor`，确认环境就绪。
2. 选一个真实站点里最关键的一个页面跑单页审计：A 用 `/seo page <url>`，B 用 `$seo page <url>`，记下实际耗时；B 另记 token。
3. 人工抽查：A 前 5 条，B 前 10 条，逐条判「成立 / 不成立」，并统计「成立且能落地」的条数。
4. 用人工检查、现成爬虫、Search Console 或 PageSpeed Insights 对同一批检查项交叉验证。
5. 挑 2–3 条高优先级且低风险的项修掉；A 修前 baseline、修后 compare，B 按两周复查点跑 baseline/compare，看对应告警是否消失且无新告警。

**五类可观察指标**

- **效率**：单次审计耗时；B 另记 token。可对照作者宣称的 10–15 分钟与人工 4–8 小时/次，但那是对比表里的示意数字，只有你自己记的耗时算数。
- **质量**：A 看前 5 条建议的「成立」比例；B 看前 10 条「成立且能落地」的条数，调研建议 ≥6 条才算可用。还要看误报率，尤其是滚动 / 点击加载的页面。
- **闭环**：修完后跑 drift compare，对应 Critical Issue 是否消失、评分是否变化、是否引入新告警。
- **外部结果**（需 4 周以上）：Search Console 点击与展示、PageSpeed / CrUX 分数；若接了 Profound 或 SE Ranking，看 AI 引用次数与 Share-of-Voice 的时间序列。
- **成本**：一次全量 audit 消耗的 Claude 额度或 Codex token 是否可接受；A 可把部分 agent 从 Opus 降到 Sonnet 再对比质量。

**试多久**：内部指标一两天就有结论（跑一次单页 + 一次抽查；全站另算）；外部结果至少留 4 周再下判断，别拿三天的 Search Console 曲线说事。B 的修复闭环按调研建议以两周为复查点。

## 常见坑

- **把作者自报数据当预期**。Claude 侧「前 12 周 10.8K Search Console 点击、324K 展示、移动 PageSpeed 99 分」是作者对自家站点的自报，没有第三方复现；README 的价格对比表自己标了「Typical market prices, for illustration」；截图上标注的时间区间为 2026 年 3 月 23 日至 6 月 12 日，与常规时间线不符，引用前必须核实。Codex 侧的「26 个子技能 / 19 个专家角色 / 最多 17 个角色依次上场 / 42 stars」均为仓库自述，没有基准测试、审计样例报告、误报率、单页耗时或 token 实测值。
- **把 claude-seo 和 codex-seo 当同一版本**。Codex 版是上游 claude-seo v2.5.0 的移植，上游继续演进时可能滞后；维护者规模小，长期可用性未经检验。
- **混用命令前缀**。Claude Code 里是 `/seo ...`，Codex CLI 里是 `$seo ...`；安装位置也不同，Codex 技能在 `~/.agents/skills/`。
- **不接 key 却拿 Core Web Vitals 结论说事**。那只是实验室估计，索引状态是从页面推断的。
- **拿它替代爬虫**。作者自己承认 Screaming Frog 这类爬虫爬得更快更深、大型套件有外链库；把它当「解释层 + 排序层 + AI 搜索覆盖层」，与爬虫并用。
- **对滚动 / 点击后才加载关键内容的页面照单全收**。原文明确说这类页面结果可能有噪声；Codex 版虽会开无头浏览器按访客看到的样子审计，边界仍是可能有噪声。
- **一上来就全量 audit**。Claude 侧额度消耗明显高于单页检查；Codex 侧 README 提示全站审计跑 17 个角色、token 显著更高。先跑 `page` 摸清输出形态，再决定要不要全量。
- **跳过抽查直接改**。报告能点出很具体的问题（如 Schema 中 `founder` 字段缺了联合创始人），但每条建议都依赖页面实际内容；不核对就改，改错的地方不会有人告诉你。
- **以为数据全在本地**。报告文件存本机，但 Claude Code 方案的页面与分析内容会发送给 Anthropic 模型；Codex 方案会发送给 Codex 会话背后的 OpenAI 模型；部分检查还会读 Wikipedia、Reddit、Common Crawl 等公开源。
- **把「有命令」当成「能自动跑」**。漂移监控是命令，不是调度器；自动化的那一半要你自己搭。

## 证据与来源

- **Claude Code 做法**：来自调研《AgriciDaniel/claude-seo》。该报告整理了插件 README 中的 30 条命令表（分六组）、19 个 agent 的角色 / 模型 / 命令对照表、安装命令，以及一段真实的 Schema 审计报告 Markdown 样例；结构性信号包括 MIT 许可、1077 个测试通过的 CI 徽章、版本徽章。报告格式内建「基于什么、依赖什么、你怎么知道它生效」，样例报告带 JSON-LD 块数、Schema 类型、Critical Issues、Warnings、Passed Checks、Overall Grade 等字段（样例为 B+）。这些来自样例报告与 README 描述，非第三方评测。
- **Codex CLI 做法**：来自调研《zhtyyx/codex-seo》。材料只有仓库 README：安装命令、`$seo` 命令清单、技能安装位置 `~/.agents/skills/`、隔离运行时与无头浏览器、单页 / 全站成本差异、SQLite 快照 drift、自然语言触发方式均来自该 README。没有基准测试、审计样例报告、误报率、单页耗时或 token 实测值；「检查的内容和一个合格的 SEO 顾问一样」是作者主张，未提供与人工顾问或其他工具的对照结果。
- **仅是作者主张、未经独立验证**：Claude 侧 12 周 10.8K 点击 / 324K 展示 / 移动 PageSpeed 99 分；「10–15 分钟跑完审计」；人工 4–8 小时/次、外包 agency 1–3 周 $2k–$15k+、审计软件 10–45 分钟 $99–$999/月 的对比表（README 自标 for illustration）；截图上 2026-03-23 至 2026-06-12 的时间区间与常规时间线不符，引用前需核实。Codex 侧 42 stars、26 个子技能、19 个专家角色、最多 17 个角色依次上场，同样只是仓库自述。
- **作者自述的边界**：爬虫速度与深度不如专用工具、外链库欠缺、滚动加载页面噪声、数据非完全本地化、全量审计资源消耗高于单页检查——在 Claude README 与 Codex README 中均有对应自述，属作者主张。Codex 侧还明确：无 Google API key 时 Core Web Vitals 为实验估算、收录状态由页面推断；页面与数据会发送给 OpenAI 模型。
- **「26 个子技能 + 19 个专家 agent、最多 17 个并行」的拆法**：来自调研报告对 claude-seo / codex-seo 结构的归纳；本手册把它当作「把一类复杂工作拆成领域技能包」的范例，而非对其效果的背书。Codex 侧写作「最多 17 个角色依次上场」，与 Claude 侧「最多 17 个 agent 并行」在材料表述上不同，执行时以各自 README 为准。

## 依据的调研

- [AgriciDaniel/claude-seo](../research/radar/2026-10-26/7135-agricidaniel-claude-seo.md)：值得一试，如果有 SEO 或内容站需求，建议按 README 给出的三条命令装一次，并选一个真实站点跑 `/seo audit`，然后人工抽查前几条建议是否成立；理由是该插件给出了可直接复制的安装与命令流程、明确的模型分配和带验证方法的报告格式，但效果数据为作者自报、无第三方复现，且适用范围仅限 SEO。
- [zhtyyx/codex-seo](../research/radar/2026-10-28/7824-zhtyyx-codex-seo.md)：值得一试，先把它装进 Codex CLI，用单个页面跑一次审计并人工核对 10 条建议，确认可执行率和误报率后再决定是否扩大使用；理由是原文给出了完整安装命令、命令清单和“多个专家角色依次审计，并把发现写入文件”，但效果只有仓库自述、没有任何验证数据。
