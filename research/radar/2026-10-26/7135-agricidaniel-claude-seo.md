# AgriciDaniel/claude-seo

- 结论：**值得一试**。如果有 SEO 或内容站需求，建议按 README 给出的三条命令装一次，并选一个真实站点跑 `/seo audit`，然后人工抽查前几条建议是否成立；理由是该插件给出了可直接复制的安装与命令流程、明确的模型分配和带验证方法的报告格式，但效果数据为作者自报、无第三方复现，且适用范围仅限 SEO。
- 原文：https://github.com/AgriciDaniel/claude-seo
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T05:50:02.280Z

## 是什么

Claude SEO 是运行在 Claude Code 内的开源（MIT）SEO 审计插件。用作者的话说：「给任意网址，10 到 15 分钟跑一次完整 SEO 审计，然后给你一份按重要性排序的清晰行动计划」。

它把 SEO 顾问的检查清单拆成 **26 个子技能 + 19 个专家 agent**，一次审计最多 **17 个 agent 并行**工作，覆盖：

- 技术 SEO：可爬取性、索引、sitemap、robots.txt、重定向、页面速度与 Core Web Vitals
- 内容质量：E-E-A-T、薄页面、主题覆盖
- 结构化数据：发现、校验、生成 Schema.org 标记
- AI 搜索（GEO）：Google AI Overviews / AI Mode / ChatGPT / Perplexity / Gemini 引用你页面的可能性
- 本地与电商 SEO：Google Business Profile、评论、地图包、商品页、国际化站点

输出为 Markdown / PDF / JSON 文件，保存在本机。作者自述「每条建议都解释为什么重要、以及你怎么知道它奏效」。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：已安装 Claude Code **1.0.33 或更新版本**，本机有 **Python 3.11–3.14**。

### 1. 安装（在 Claude Code 内执行）

```bash
/plugin marketplace add AgriciDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo
/seo setup
```

`/seo setup` 会准备插件自用的独立 Python 环境和 headless 浏览器，README 声称「不会动系统其它部分」。

### 2. 检查运行环境（不改动系统）

```bash
/seo doctor
```

### 3. 手动安装（可选，macOS / Linux）

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

### 4. 手动安装（Windows PowerShell）

```powershell
git clone --depth 1 https://github.com/AgriciDaniel/claude-seo.git
powershell -ExecutionPolicy Bypass -File claude-seo\install.ps1
```

README 明确说明为什么用 `git clone` 而不是 `irm | iex`：后者会被 Claude Code 自带的安全护栏判为供应链风险。

### 5. 跑第一次审计

```bash
claude                                   # start Claude Code

/seo audit https://example.com           # full site audit with a prioritized plan
/seo page https://example.com/pricing    # one page, in depth
/seo geo https://example.com             # how ready you are for AI search
/seo schema https://example.com          # check and generate structured data
/seo local https://example.com           # local SEO and Google Business Profile
```

### 6. （可选）接免费 Google API 拿真实字段数据

```bash
/seo google setup
```

可接 PageSpeed Insights、Chrome UX Report、Search Console、GA4；key 留在本机。README 说明：**不接 key 时，Core Web Vitals 是实验室估计值，索引状态是从页面推断的**。

### 7. 按判断难度分配模型

默认五个需要更多判断的 agent 跑 Opus，其余跑 Sonnet，因此一次全量 `/seo audit` 比单页检查更耗 Claude 额度。要改模型，直接改 `agents/` 下对应 agent 文件。

### 8. 出报告与持续监控

```bash
/seo google report                                  # 把 Markdown 报告转成 PDF
/seo drift baseline | compare | history <url>       # 用 SQLite 快照做 SEO 漂移监控
```

### 9. （可选）扩展

```bash
/seo seranking [command]     # ChatGPT/Gemini/Perplexity/AI Overviews 的 AI Share-of-Voice
/seo profound [command]      # LLM 引用追踪（时间序列）
/seo bing [command] <url>    # Bing Webmaster + IndexNow 即时提交
/seo unlighthouse <url>      # 全站多页 Lighthouse，本地跑
```

### 10. 卸载

```bash
/plugin uninstall claude-seo@agricidaniel-claude-seo
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
原文把「一个好 SEO 顾问会检查的一切」显式清单化并交给 AI，包括多数人不会想到交给 AI 的检查项：AI 搜索引用就绪度（GEO）、面向 AI agent 的可读性（`/seo agentic`：Lighthouse Agentic Browsing X/N、AI agent 访问、llms.txt、Markdown、WebMCP）、Schema 与实际页面内容不一致的比对（报告样例里点名 `founder` 字段缺了联合创始人）。

**2. 任务匹配**
- 同一工作按判断难度分层：5 个 agent 用 Opus，其余 Sonnet，且模型可在 agent 文件里改。
- 并行：最多 17 个 agent 同时跑一个站点。
- 工具选择有明确边界：需要 JS 渲染的页面自动用 headless 浏览器打开；作者也直说「Screaming Frog 这类爬虫爬得更快更深，大型 SEO 套件有自己的外链库」，本插件的差异在解释、按影响排序、覆盖 AI 搜索、可用自然语言追问，并建议两者并用。

**3. 条件供给**
Claude Code ≥1.0.33、Python 3.11–3.14、独立 Python 运行时 + Chromium（由 `/seo setup` 自动装）、可选 Google API key（本机保存）、可选第三方扩展账号（SE Ranking、Profound、Bing、Unlighthouse）。反馈供给方面：每条建议带依据、依赖条件、以及验证方法。

**4. 主动推进**
`/seo drift baseline | compare | history <url>` 用 SQLite 快照做漂移监控，定位为「在季度审计之间发现问题」；`/seo bing` 支持 IndexNow 即时提交。但原文没有说明是否支持定时或事件触发的自动执行，这一层只能算命令层面具备条件。

**5. 效果验证**
- 报告结构本身内建验证：每条建议说明「基于什么、依赖什么、你怎么知道它生效」。
- 报告带量化字段：JSON-LD 块数、Schema 类型、Critical Issues、Warnings、Passed Checks、Overall Grade（样例为 B+）。
- 作者自报其站点 claude-seo.md 从第一天起用本插件审计，前 12 周 10.8K Search Console 点击、324K 展示、移动 PageSpeed 99 分。

## 与已有做法的关系

- **Claude Code（adopt）**：本插件完全构建在 Claude Code 之上，依赖其 plugin marketplace、子代理与命令机制，可视为「在 Claude Code 上做领域技能包」的一个具体范例——把一类复杂工作拆成 26 个技能 + 19 个带角色/模型/命令的 agent。
- **GitHub Trending（try）**：本条即来自该来源，README 内有 Trendshift「GitHub Trending #12 Repository Of The Day」徽章作为热度信号。
- **Trendshift（watch）**：仅作为热度徽章出现，无进一步用法。
- 清单中没有其他 SEO 相关条目。

## 证据与局限

**原文给出的证据**
- 1077 个测试通过的 CI 徽章、MIT 许可、版本徽章。
- 完整的 30 条命令表（分六组）、19 个 agent 的角色/模型/命令对照表。
- 一段真实的 Schema 审计报告 Markdown 样例。
- 「Real results」数据：12 周 10.8K 点击、324K 展示、PageSpeed 移动 99 / SEO 100。
- 一张对比表，列出人工（4–8 小时/次）、外包 agency（1–3 周、$2k–$15k+）、审计软件（10–45 分钟、$99–$999/月）与本插件（10–15 分钟、免费）的差异。

**局限**
- 结果数据是作者对自家站点的自报，没有第三方复现；README 自己给对比价格表标注了「Typical market prices, for illustration」。
- 截图中标注的时间区间为 2026 年 3 月 23 日至 6 月 12 日，与常规时间线不符，引用前需核实。
- 无 Google API key 时，Core Web Vitals 只是实验室估计、索引状态靠推断。
- 「需要滚动或点击后才加载关键内容的页面，结果可能有噪声」。
- 全量审计消耗 Claude 额度明显高于单页检查。
- 数据并未完全本地化：页面与分析内容会发送给 Anthropic 模型；部分检查还会读 Wikipedia、Reddit、Common Crawl 等公开源。
- 大量篇幅是营销式表述（hero 图、credits 图、「rank higher / get cited」），可照做的部分集中在安装命令、命令表和执行流程三处。

**适用条件**：已有 Claude Code、手上有一个需要做 SEO 的站点、愿意自己核对输出而不是直接照单执行。

## 怎么试、怎么验证

**最小试用（半天内可完成）**
1. `/seo setup` → `/seo doctor` 确认环境就绪。
2. 选一个真实站点跑 `/seo audit <url>`，记下耗时。
3. 对同一站点里最关键的一个页面跑 `/seo page <url>` 做深度对照。
4. 人工抽查优先级最高的 5 条建议：每条是否说得出来源、依赖和验证方法？是否与页面实际内容吻合？
5. 用人工检查或现成爬虫（如作者自己提到的 Screaming Frog）对同一批检查项做交叉验证。

**判断有没有改善的指标**
- 效率：单次审计耗时（对照作者宣称的 10–15 分钟 vs 人工 4–8 小时）。
- 质量：前 5 条建议的人工判定「成立/不成立」比例；与人工审计的检查项重合率。
- 闭环：按建议修完后跑 `/seo drift compare <url>`，看对应 Critical Issue 是否消失、评分是否变化。
- 外部结果（需 4 周以上）：Search Console 点击与展示、PageSpeed/CrUX 分数；若接了 Profound 或 SE Ranking，看 AI 引用次数与 Share-of-Voice 的时间序列。
- 成本：一次全量 audit 消耗的 Claude 额度是否可接受；不行就把部分 agent 从 Opus 降到 Sonnet 再对比质量。
