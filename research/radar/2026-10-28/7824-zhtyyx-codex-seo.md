# zhtyyx/codex-seo

- 结论：**值得一试**。先把它装进 Codex CLI，用单个页面跑一次审计并人工核对 10 条建议，确认可执行率和误报率后再决定是否扩大使用；理由是原文给出了完整安装命令、命令清单和“多个专家角色依次审计，并把发现写入文件”，但效果只有仓库自述、没有任何验证数据。
- 原文：https://github.com/zhtyyx/codex-seo
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-28T05:51:12.012Z

## 是什么

Codex SEO 是一个开源技能包，移植自 Agrici Daniel 的 claude-seo（Claude Code 版，基于上游 v2.5.0 基线），把 26 个 SEO 子技能和 19 个专家角色剧本装进 OpenAI Codex CLI。给它一个网址，它会像“一个合格的 SEO 顾问”那样做体检：技术 SEO（可抓取性、收录、sitemap、robots.txt、重定向、速度、Core Web Vitals）、内容质量与 E-E-A-T、结构化数据、AI 搜索/GEO 就绪度、本地与电商 SEO。输出结果是按优先级排序的行动计划，而不是一堆告警。MIT 协议、无按站计费。

真正值得研究的不是“SEO”这个垂直领域本身，而是它的编排方式：拆成多个专家角色，按顺序依次审计，每个角色完成即写入自己的发现文件留存记录，最后汇总成带“为什么重要 + 怎么验证生效”的计划；以及一个工具生态里的技能包被迁移到另一个工具生态的现成样本。

## 具体做法

前提：使用带 skills 支持的 OpenAI Codex CLI，以及 Python 3.11–3.14（README 明确要求）。

1. 克隆并安装（macOS/Linux）：

```bash
git clone --depth 1 https://github.com/zhtyyx/codex-seo.git
bash codex-seo/install.sh
```

Windows（PowerShell）：

```powershell
git clone --depth 1 https://github.com/zhtyyx/codex-seo.git
powershell -ExecutionPolicy Bypass -File codex-seo\install.ps1
```

安装器把技能复制到 `~/.agents/skills/`（Codex 从这里发现用户技能），并创建带无头浏览器的隔离 Python 运行时，不动系统全局环境；卸载用 `bash uninstall.sh`。

2. 进 Codex 后先自检，不要直接开跑：

```
codex
$seo setup     # 创建/刷新隔离 Python 运行时和 Chromium
$seo doctor    # 只读体检，不改动系统
```

3. 第一次审计建议从单页开始（README 提示全站审计在主会话里跑 17 个角色，token 消耗显著更高）：

```
$seo page https://example.com/pricing    # 单页深度分析
$seo audit https://example.com           # 全站审计，输出按优先级排好的行动计划
```

也可以直接用自然语言触发，例如「帮我做一次 SEO 审计，网址是 …」。

4. 按需调用细分命令（全部以 `$seo` 开头）：

```
# 审计与规划
$seo plan <type>              # 按行业规划：saas / local / ecommerce / publisher / agency

# 技术 SEO
$seo technical <url>          # 9 大类技术审计
$seo sitemap <url | generate>
$seo images <url>
$seo hreflang <url>
$seo programmatic <url>
$seo google [command]         # GSC、PageSpeed、CrUX、Indexing、GA4、PDF 报告

# 内容与 E-E-A-T
$seo content <url>
$seo content-brief <topic>    # 目标关键词、大纲、内链
$seo cluster <keyword>        # 基于 SERP 的语义聚类
$seo sxo <url>
$seo competitor-pages <url>

# 结构化数据与 AI 搜索
$seo schema <url>
$seo geo <url>                # AI Overviews / 生成式引擎优化
$seo agentic <url>            # Lighthouse Agentic Browsing、llms.txt、Markdown、WebMCP

# 本地、外链、电商
$seo local <url>
$seo maps [command]
$seo backlinks <url>
$seo ecommerce <url>
```

5. （可选）接真实字段数据：`$seo google setup` 接入免费的 Google API（PageSpeed Insights、Chrome UX Report、Search Console、GA4、Indexing），密钥只保存在本机。不接也能用。

6. （可选）出 PDF：报告默认存为 Markdown，说一句「生成 PDF 报告」即走 `$seo google report`。

7. 想做持续监控，用 SQLite 快照做漂移对比：

```
$seo drift baseline <url>
$seo drift compare <url>
$seo drift history <url>
```

8. （可选扩展，需自带账号）`$seo image-gen`、`$seo seranking`（AI 声量份额）、`$seo profound`（LLM 引用追踪）、`$seo bing`（IndexNow 提交）、`$seo unlighthouse`（多页 Lighthouse）。

## 对应的研究问题

**1. 能力发现**：它把“SEO 顾问式的多维度体检 → 出排好序的行动计划”整段交给 AI，且覆盖了几类容易被漏掉的检查项——GEO/AI 搜索可引用性、`$seo agentic` 检查 llms.txt / Markdown / WebMCP / AI agent 可访问性。这说明可以主动把“定期体检类”工作交给 AI，而不只是让它写文案。

**2. 任务匹配**：适合“需要多视角、结论要留证据”的审查型任务——多角色按顺序上场、每个角色写自己的发现文件、最后汇总打分排优先级。粒度选择上有明确取舍：单页检查成本低、17 角色全站审计 token 高；对 JS 站会自动开无头浏览器，按访客看到的样子审计。

**3. 条件供给**：需要 Codex CLI（带 skills 支持）+ Python 3.11–3.14；安装器提供技能目录（`~/.agents/skills/`）、隔离运行时和无头浏览器权限；想要真实字段数据必须接 Google API key，否则 Core Web Vitals 是实验估算、收录状态靠页面推断。

**4. 主动推进**：`$seo drift baseline | compare | history` 基于 SQLite 快照做漂移监控，天然适合“状态触发/周期触发”的回归检查——每次改版后 compare 一次。README 未给出定时调度或 CI 集成的具体配置，这一步需要自己补。

**5. 效果验证**：机制上做了设计——每条建议都写明依据是什么、依赖什么、怎么验证生效；报告落盘为 Markdown/PDF，配合 drift 快照可做前后对比。但“验证是否真的改善了排名/流量”原文没有给数据。

## 与已有做法的关系

清单中已有 **Claude Code（adopt）** 和 **OpenAI Codex（adopt）**。本仓库正是 claude-seo（Claude Code 技能包）到 Codex CLI 的移植，是一个现成的“跨工具迁移”样本：技能安装位置改为 `~/.agents/skills/`，调用方式统一成 `$技能名` + 自然语言双通道；上游的方法论与脚本原样复用，只做运行环境适配。清单中没有 SEO 垂直领域条目，也没有“漂移监控/基线快照”类条目，这两块是新增信息。

## 证据与局限

- 材料只有仓库 README：没有基准测试、审计样例报告、误报率、单页耗时或 token 实测值。“26 个子技能 / 19 个专家角色 / 最多 17 个角色依次上场 / 42 stars”均为仓库自述。
- “检查的内容和一个合格的 SEO 顾问一样”是作者主张，未提供与人工顾问或与其他工具的对照结果。
- README 主动说明的边界：没有 Google API key 时 Core Web Vitals 为实验估算、收录状态由页面推断；关键内容靠滚动或点击才加载的页面结果可能有噪音。
- 隐私边界：被分析的页面与数据会发送给 Codex 会话背后的 OpenAI 模型；除被审计网站外，部分检查会读取 Wikipedia、Reddit、Common Crawl 等公开来源。
- 这是对上游 v2.5.0 的移植，上游继续演进时可能滞后；维护者规模小（42 stars），长期可用性未经检验。
- 适用条件：已有 Codex CLI 使用条件、目标站点可公开访问、能接受全站审计的 token 成本。

## 怎么试、怎么验证

最小试用（半天内可完成）：

1. 按上面第 1、2 步安装并跑 `$seo doctor`，确认技能被发现、隔离运行时可用。
2. 只对一个已知情况的小站或单个页面跑 `$seo page <url>`，不要一上来跑 `$seo audit`。记录耗时与 token 消耗。
3. 从输出行动计划里取前 10 条建议，逐条人工核对：手工查 robots.txt / sitemap / 页面源码 / 结构化数据，或用 Search Console、PageSpeed Insights 交叉验证。统计成立条数与误报条数。
4. 挑 2–3 条高优先级且低风险的项修掉，两周后用 `$seo drift baseline` 建档、`$seo drift compare` 复查该项是否从告警中消失。

判断是否改善的指标：

- 建议可执行率：10 条中“成立且能落地”的条数（建议 ≥6 条才算可用）。
- 误报率与噪音：靠滚动/点击加载的页面上误报是否明显增多。
- 成本：单页耗时、token 消耗；对比自己人工审计同一页所需时间。
- 修复闭环：修完的条目在 drift compare 中是否消失，且未引入新告警。
- 结果指标（需接真实 API）：GSC 收录/展现、CWV 字段数据在修复后是否变化。

若第 3 步可执行率低或误报明显，就降到 study：把它当“多角色顺序编排 + 逐角色落盘 + 带验证方法的行动计划”这一模式的参考，不必实际使用这个仓库。
