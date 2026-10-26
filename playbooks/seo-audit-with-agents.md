# 让 AI 做站点审计时，每条建议都带出处和验证方法

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 一次能给你几十条站点优化建议，但没人知道哪条成立；这篇手册给出一套半天内可跑完、且能逐条核对的审计做法。
> 先试这一步：在 Claude Code 里跑 `/plugin marketplace add AgriciDaniel/claude-seo` 和 `/plugin install claude-seo@agricidaniel-claude-seo`，用 `/seo doctor` 确认环境后，拿一个真实站点跑一次 `/seo audit`。
> 最近修订：2026-10-26

## 解决什么问题

站点审计这类工作的难点不是「发现问题」，而是问题一次来太多、没有优先级、也没人说得清哪条真的成立。直接问 AI「帮我看看网站 SEO」，拿到的是笼统清单：无法核对、无法交接、改完不知道有没有用。

这篇手册给一套可照做的流程：用 Claude Code 里的 claude-seo 插件跑一次带优先级的审计，用固定动作抽查并筛掉站不住的建议，修完再用快照对比确认是否生效。核心不是这个插件，而是这条纪律——**每条建议都必须说得出依据、依赖条件和验证方法，否则不执行**。

## 适用与不适用

**适用**

- 已装 Claude Code（1.0.33 或更新）和 Python 3.11–3.14。
- 手上有一个真实站点要做 SEO / 内容站，而不是在纸上谈方法论。
- 愿意自己核对输出、而不是照单执行的人。

**不适用**

- 只想让 AI 写几段 SEO 文案：这不是文案工具，它的产出是审计报告。
- 需要外链库、需要深爬全站的场景：作者自己说 Screaming Frog 这类爬虫爬得更快更深，大型 SEO 套件有自己的外链库；本插件的差异在解释、按影响排序、覆盖 AI 搜索、可用自然语言追问，作者建议两者并用。
- 关键内容要滚动或点击之后才加载的页面：原文说这类页面结果可能有噪声。
- 合规上不能把页面内容发给模型的场景：数据并未完全本地化，页面与分析内容会发送给 Anthropic 模型，部分检查还会读 Wikipedia、Reddit、Common Crawl 等公开源。

## 前置条件

- Claude Code **1.0.33 或更新版本**。
- 本机 **Python 3.11–3.14**。
- 一个真实站点 URL。
- （可选）免费 Google API key：PageSpeed Insights、Chrome UX Report、Search Console、GA4，key 留在本机。
- （可选）第三方扩展账号：SE Ranking、Profound、Bing Webmaster、Unlighthouse。

**不接 key 的后果要先知道**：Core Web Vitals 只是实验室估计值，索引状态是从页面推断的。带这两项结论做决策前，先判断自己能否接受这个精度。

## 操作步骤

### 1. 安装

**做法 A：在 Claude Code 内装插件**（默认选这个）

```bash
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo
/seo setup
```

预期：`/seo setup` 准备插件自用的独立 Python 环境和 headless 浏览器，README 声称「不会动系统其它部分」。

**做法 B：手动安装**（要装多台机器、或打算改 agent 文件时用）

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

**怎么选**：日常用 Claude Code 的直接走 A，少一步出错机会；需要离线分发、批量部署或改 `agents/` 下模型配置的走 B。

### 2. 环境自检，不过关就别往下跑

```bash
/seo doctor
```

预期：确认运行环境就绪且不改动系统。自检失败时继续跑审计，后面的报告不可信。

### 3. 跑第一次审计（先全站，再单页对照）

```bash
claude                                   # start Claude Code

/seo audit https://example.com           # full site audit with a prioritized plan
/seo page https://example.com/pricing    # one page, in depth
/seo geo https://example.com             # how ready you are for AI search
/seo schema https://example.com          # check and generate structured data
/seo local https://example.com           # local SEO and Google Business Profile
```

前提：换成一个你真实拥有的站点，别用示例域名。

预期：输出 Markdown / PDF / JSON 报告，保存在本机，按重要性排序。一次全量审计最多 17 个 agent 并行工作，作者宣称 10–15 分钟（此为作者自报，不是你的实测值）。**把实际耗时记下来**，这就是你的基线。

### 4. 人工抽查前 5 条，再决定改什么

这一步不能跳。逐条问三个问题：

1. 这条建议说得出来源、依赖条件和「你怎么知道它生效」吗？
2. 它和页面实际内容吻合吗？（插件会把结构化数据和页面内容做比对，样例报告里点名 `founder` 字段缺了联合创始人——这类具体结论要回页面核实）
3. 用人工检查或现成爬虫（比如作者自己也提到的 Screaming Frog）对同一批检查项交叉验证，对得上吗？

预期：得到一份「成立 / 不成立」的判断清单，而不只是一份待办列表。**不成立的那几条，是后面判断工具是否适合你的主要依据。**

### 5. （可选）接免费 Google API 换真实数据

```bash
/seo google setup
```

前提：愿意把 key 留在本机。

预期：Core Web Vitals 从实验室估计变成真实字段数据，索引状态不再靠推断。如果第 4 步的抽查里，问题集中在速度与索引判断上，这一步的收益最大。

### 6. 按判断难度分配模型，控制额度

默认五个需要更多判断的 agent 跑 Opus，其余跑 Sonnet。要改模型，直接改 `agents/` 下对应 agent 文件。

前提：先知道一次全量 `/seo audit` 比单页检查更耗 Claude 额度。

预期：把部分 agent 从 Opus 降到 Sonnet 后重跑，对比第 4 步那 5 条建议的质量是否下降；没下降就保持降级配置，这是最省事的省钱方式。

### 7. 修完之后做漂移对比，闭合验证

```bash
a/seo drift baseline <url>            # 修之前存一个快照
/seo drift compare <url>              # 修之后对比
/seo drift history <url>              # 看历史
/seo google report                    # 把 Markdown 报告转成 PDF
```

预期：对应 Critical Issue 消失、评分变化可查。原文把它定位为「在季度审计之间发现问题」。注意：原文没有说明支持定时或事件触发的自动执行，所以「自动监控」这一层只能算命令具备、调度没做——需要自动就跑 cron 之类的你自己的调度，别假设它会自己跑。

### 8. （可选）扩展

```bash
/seo seranking [command]     # ChatGPT/Gemini/Perplexity/AI Overviews 的 AI Share-of-Voice
/seo profound [command]      # LLM 引用追踪（时间序列）
/seo bing [command] <url>    # Bing Webmaster + IndexNow 即时提交
/seo unlighthouse <url>      # 全站多页 Lighthouse，本地跑
```

前提：有对应账号。没账号就不用开，不影响主流程。

### 9. 卸载

```bash
/plugin uninstall claude-seo@agricidaniel-claude-seo
```

试用没带来可观察改善就卸掉。留着不用的插件只会让下一次审计多一层不知道从哪来的结论。

## 怎么判断变好了

**最小试用方式（半天内可完成）**

1. `/seo setup` → `/seo doctor`，确认环境就绪。
2. 选一个真实站点跑 `/seo audit <url>`，记下实际耗时。
3. 对同一站点里最关键的一个页面跑 `/seo page <url>` 做深度对照。
4. 人工抽查优先级最高的 5 条建议，逐条判「成立 / 不成立」。
5. 用人工检查或现成爬虫对同一批检查项交叉验证。

**五类可观察指标**

- **效率**：单次审计耗时。可对照作者宣称的 10–15 分钟与人工 4–8 小时/次，但那是对比表里的示意数字，只有你自己记的耗时算数。
- **质量**：前 5 条建议的「成立」比例；与人工审计的检查项重合率。
- **闭环**：按建议修完后跑 `/seo drift compare <url>`，对应 Critical Issue 是否消失、评分是否变化。
- **外部结果**（需 4 周以上）：Search Console 点击与展示、PageSpeed / CrUX 分数；若接了 Profound 或 SE Ranking，看 AI 引用次数与 Share-of-Voice 的时间序列。
- **成本**：一次全量 audit 消耗的 Claude 额度是否可接受；不行就把部分 agent 从 Opus 降到 Sonnet 再对比质量。

**试多久**：内部指标一两天就有结论（跑一次全量 + 一次单页 + 5 条抽查）；外部结果至少留 4 周再下判断，别拿三天的 Search Console 曲线说事。

## 常见坑

- **把作者自报数据当预期**。「前 12 周 10.8K Search Console 点击、324K 展示、移动 PageSpeed 99 分」是作者对自家站点的自报，没有第三方复现；README 的价格对比表自己标了「Typical market prices, for illustration」。而且截图上标注的时间区间为 2026 年 3 月 23 日至 6 月 12 日，与常规时间线不符，引用前必须核实。
- **不接 key 却拿 Core Web Vitals 结论说事**。那只是实验室估计，索引状态是从页面推断的。
- **拿它替代爬虫**。作者自己承认 Screaming Frog 这类爬虫爬得更快更深、大型套件有外链库；把它当「解释层 + 排序层 + AI 搜索覆盖层」，与爬虫并用。
- **对滚动 / 点击后才加载关键内容的页面照单全收**。原文明确说这类页面结果可能有噪声。
- **一上来就全量 audit**。额度消耗明显高于单页检查；先跑 `page` 摸清输出形态，再决定要不要全量。
- **跳过抽查直接改**。报告能点出很具体的问题（如 Schema 中 `founder` 字段缺了联合创始人），但每条建议都依赖页面实际内容；不核对就改，改错的地方不会有人告诉你。
- **以为数据全在本地**。报告文件存本机，但页面与分析内容会发送给 Anthropic 模型，部分检查还会读 Wikipedia、Reddit、Common Crawl 等公开源。
- **把「有命令」当成「能自动跑」**。漂移监控是命令，不是调度器；自动化的那一半要你自己搭。

## 证据与来源

- **全部操作步骤、命令、版本要求、模型分配方式、无 key 时的行为差异、卸载命令**：均来自调研报告《AgriciDaniel/claude-seo》。该报告整理了插件 README 中的 30 条命令表（分六组）、19 个 agent 的角色 / 模型 / 命令对照表、安装命令，以及一段真实的 Schema 审计报告 Markdown 样例。
- **结构性信号（原文证据）**：MIT 许可、1077 个测试通过的 CI 徽章、版本徽章。
- **报告格式内建验证**：每条建议说明「基于什么、依赖什么、你怎么知道它生效」；报告带量化字段（JSON-LD 块数、Schema 类型、Critical Issues、Warnings、Passed Checks、Overall Grade，样例为 B+）。这来自样例报告与 README 描述，非第三方评测。
- **仅为作者主张、未经独立验证**：12 周 10.8K 点击 / 324K 展示 / 移动 PageSpeed 99 分；「10–15 分钟跑完审计」；人工 4–8 小时/次、外包 agency 1–3 周 $2k–$15k+、审计软件 10–45 分钟 $99–$999/月 的对比表（README 自标「for illustration」）；截图上 2026-03-23 至 2026-06-12 的时间区间与常规时间线不符，引用前需核实。
- **作者自述的边界**：爬虫速度与深度不如专用工具、外链库欠缺、滚动加载页面噪声、数据非完全本地化、全量审计额度消耗高于单页检查——均出自 README 自述，属作者主张。
- **「26 个子技能 + 19 个专家 agent、最多 17 个并行」的拆法**：来自调研报告对插件结构的归纳，本手册把它当作「把一类复杂工作拆成领域技能包」的范例，而非对其效果的背书。

## 依据的调研

- [AgriciDaniel/claude-seo](../research/radar/2026-10-26/7135-agricidaniel-claude-seo.md)：值得一试，如果有 SEO 或内容站需求，建议按 README 给出的三条命令装一次，并选一个真实站点跑 `/seo audit`，然后人工抽查前几条建议是否成立；理由是该插件给出了可直接复制的安装与命令流程、明确的模型分配和带验证方法的报告格式，但效果数据为作者自报、无第三方复现，且适用范围仅限 SEO。
