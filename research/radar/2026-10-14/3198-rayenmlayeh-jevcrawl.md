# RayenMlayeh/jevcrawl

- 结论：**值得一试**。按 README 给出的两条 MCP 配置把 jevcrawl 挂到 Claude Code/Cursor，先用 1–2 个真实的多跳查资料任务与现有抓取方式做对照；理由是它提供了可直接照做的安装命令、参数默认值和输出字段，成本/耗时对比具体，但基准样本小、依赖付费 Jev API、不执行 JavaScript，适合小范围试而非直接替换。
- 原文：https://github.com/RayenMlayeh/jevcrawl
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-14T15:06:00.799Z

## 是什么

jevcrawl 是一个给 AI agent 用的网页爬取工具，同时提供 MCP server 和 CLI（仓库 RayenMlayeh/jevcrawl，Apache-2.0，Python 3.11+，README 页显示 37 stars）。

它的做法与两种常见方案都不同：不让 agent 读下整个页面（答案会被导航和模板文字埋掉、烧 token），也不让 LLM 逐个挑链接（慢且贵）。取而代之的是用一个决策模型 Jev（typesafe.ai）给每个链接和每段文本打相关性分，只把与目标相关的段落返回给 agent 的 LLM。README 的说法是「决策模型只打分、不写文本」，因此返回内容全部逐字来自页面。

三个工具：

| 工具 | 用途 |
|---|---|
| `crawl(goal, start_url, max_pages=30, max_seconds=120, return_tokens=4000, max_decision_usd=0.05)` | 答案可能在几层链接之下，返回相关段落 |
| `scrape(url, goal=None)` | 已知单个页面；带 goal 只返回相关段落，不带 goal 返回全部内容且不调用 Jev |
| `map(start_url, goal, limit=50, max_pages=10)` | 只返回排序后的 URL 列表，用来决定 scrape 哪些 |

返回结构包含 `blocks`（相关段落，按相关性排序，带 `url`、`heading_path`、`char_start`/`char_end`、`relevance`）、`uncertain`（边缘段落）、`pages`（含 `text_sha256`）和 `stats`（`pages_fetched`、`tokens_raw`、`tokens_returned`、`jev_calls`、`cache_hits`、`jev_cost_usd`、`model`、`degraded`、`needs_js_urls`、`stopped_because`、`elapsed_seconds`）。预期失败以 `{"error": "<code>", "message": "<what to do>"}` 返回，不会往 agent 会话里抛异常。

## 具体做法

前提（三步都要）：
- 从 `https://console.typesafe.ai/` 申请一个 Jev API key（付费服务，README 给出 `jev-1.13.0` 输入 token 单价 $0.042/百万）。
- 本机已装 [uv](https://docs.astral.sh/uv/)。
- 页面文本（段落、链接标签、URL）会被发送到 TypeSafe 打分——先确认你的目标站点内容允许外发。

### 1. 装成 Claude Code 的 MCP server

```bash
claude mcp add jevcrawl -e TYPESAFE_API_KEY=<your key> -- uvx jevcrawl
```

### 2. 或写进其他 MCP 客户端的配置文件（Claude Desktop、Cursor 等，`mcpServers` 段）

```json
{
  "mcpServers": {
    "jevcrawl": {
      "command": "uvx",
      "args": ["jevcrawl"],
      "env": { "TYPESAFE_API_KEY": "<your key>" }
    }
  }
}
```

### 3. 自检配置

```bash
uvx jevcrawl doctor
```

### 4. 用一句自然语言提示词验证通路

```
Use jevcrawl to find which Python version added the walrus operator, starting from docs.python.org
```

（README 提到会加载 skills 的 agent 还可以用仓库里的 `skills/jevcrawl/SKILL.md`。）

### 5. 或者不走 MCP，直接用 CLI

```bash
uv tool install jevcrawl
# 或 pip install jevcrawl

jevcrawl crawl https://docs.python.org/3/ --goal "What does the walrus operator do?" [--json]
jevcrawl scrape https://example.com/help/returns [--goal "..."] [--json]
jevcrawl map https://example.com --goal "..." [--limit 20]
jevcrawl doctor
```

### 6. 按需设置环境变量

| 环境变量 | 含义 | 默认值 |
|---|---|---|
| `TYPESAFE_API_KEY` | Jev API key（必需） | 无 |
| `JEVCRAWL_BASE_URL` | Jev 兼容端点 | `https://api.typesafe.ai` |
| `JEVCRAWL_MODEL` | 模型 id | `jev-1.13.0`（固定版本，阈值按版本校准） |
| `JEVCRAWL_CACHE_DIR` | 答案缓存目录 | `~/.jevcrawl/cache` |

其余（阈值、每页链接数、并发）在 `jevcrawl/config.py` 有实测默认值；Python 调用方可以传自己的 `Config`。

### 7. 用预算参数和输出字段做控制与核对

- 每次调用都被 `max_pages`、`max_seconds`、`max_decision_usd`、`return_tokens` 限定；`max_decision_usd` 是硬上限，可能超限的请求根本不会发出，爬取以 `budget` 结束。
- 用 `stopped_because`（`answered` / `frontier_empty` / `max_pages` / `max_seconds` / `budget` / `auth_error`）判断这次是找到了答案还是撞到上限。
- 同一 goal 同一页面的 Jev 结果会缓存到本地，重复不花钱。
- 需要 JS 的页面不会被执行，URL 会列在 `stats.needs_js_urls` 里。

## 对应的研究问题

**1. 能力发现（AI 已能做哪些没想到交给它的工作）**
把「从某个站点里把答案找出来、并带出处引文」这类多跳资料检索整段交给 agent，而不是自己先搜再贴页面。README 的示例是让 agent 从 docs.python.org 出发回答「walrus 运算符是什么、哪个 Python 版本引入」，返回带 `heading_path` 和字符偏移的原文段落。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 适合：答案藏在站内多层链接下方、页面不需要 JavaScript 的调研型问题——`crawl`。
- 已知单页：用 `scrape`；不需要相关性过滤时甚至连 Jev 调用都省掉（`scrape` 不带 goal）。
- 需要先决定抓什么：用 `map` 只取排序后的 URL 列表。
- 接入方式：MCP 客户端（Claude Code、Claude Desktop、Cursor）或 CLI；模型侧只需要 agent 的 LLM 读回相关性过滤后的段落。

**3. 条件供给（需要哪些信息、工具、权限和反馈）**
- 信息：一个明确的 `goal` + `start_url`（`crawl`/`map` 必需）。
- 工具与权限：`TYPESAFE_API_KEY`、uv/uvx、MCP 客户端配置、到 `api.typesafe.ai` 的网络出口；可选覆盖 base URL、模型 id、缓存目录。
- 反馈：`stats` 里的 `tokens_raw` 对 `tokens_returned`、`jev_cost_usd`、`stopped_because`、`degraded`、`needs_js_urls` 构成每次爬取的回执，可直接用来调预算参数。

**4. 主动推进（由时间、事件或状态触发并持续完成）**
原文只给出单次调用的边界与状态（`max_pages`/`max_seconds`/`max_decision_usd`，以及 `answered`、`frontier_empty`、`max_pages`、`max_seconds`、`budget`、`auth_error` 这些停止原因），并说明失败时降级：连续三次 Jev 请求失败后，爬取转为广度优先继续，所有 block 以未打分形式放进 `uncertain`，并置 `stats.degraded`。定时或事件触发的机制，原文没有提到。

**5. 效果验证（怎么判断确实变好了）**
README 的基准设计可直接借用：所有系统从站点首页出发、同样的 30 页预算、同一个问题，抓到的内容交给**同一个回答 LLM**，由**同一个 judge** 打分，只让爬虫这个变量变。指标是「是否抓到含答案的页面」和「答案是否正确」，外加每次任务成本、每个正确答案成本、耗时。工程侧另有 `tokens_raw` vs `tokens_returned` 这一对指标衡量「喂给 LLM 的上下文压缩了多少」。

## 与已有做法的关系

清单中有三个相关条目：

- **Claude Code（tool，adopt）**：jevcrawl 直接以 MCP server 形式接入 Claude Code，一条 `claude mcp add` 命令即可，是给已采用的 Claude Code 加装「站内多跳检索」能力的一条路径。
- **Cursor（tool，watch）**：README 明确支持 Cursor，配置方式就是上面第 2 步的 `mcpServers` JSON。
- **arXiv（source，try）**：基准所用的 WebWalkerQA 来自 arXiv 论文 2501.07572（Wu et al., Alibaba Tongyi Lab, ACL 2025），可作为「网页遍历类 agent 任务」的评测集来源参考。

清单中没有与「jevcrawl 或 Crawl4AI 这类具体爬虫方案」直接对应的条目；README 把 Crawl4AI 的 `BestFirstCrawlingStrategy` + 关键词打分作为对照基线。

## 证据与局限

**原文给出的数据**（可核对，但均为作者自测）：

- 50 个 WebWalkerQA 任务（2026-10-12，回答模型 `claude-opus-5-5`，judge `claude-sonnet-5-5`）：jevcrawl 答对 40%、找到答案页 54%、$0.025/任务；「Claude 逐个挑链接」为 30% / 33% / $0.194；广度优先为 8% / 11% / $0.228。
- 每正确答答案成本：jevcrawl $0.06、Claude 挑链接 $0.65、广度优先 $2.85。
- 与 Crawl4AI 0.9.4 的对照（20 个任务，2026-10-13，只比「是否抓到 gold page」，不接 LLM）：答案页 10 次 vs 5 次；全部答案页 5 vs 2；中位爬取时间 29s vs 43s；站点加载失败 0 vs 3；jevcrawl 找到 6 个 Crawl4AI 错过的答案页，Crawl4AI 找到 1 个 jevcrawl 错过的。
- 演示：docs.python.org 示例抓 6 页，80,034 tokens 压到 1,873 tokens，$0.0069，8.3 秒。

**作者的主张（无独立验证）**：找到答案页的概率约 2 倍于 Crawl4AI、比 LLM 驱动爬取快 2 倍、天然抗 prompt injection（页面文本只作为数据字段被打分，问句是 jevcrawl 写死的固定字符串）、引文逐字可溯源。

**原文自己写出的局限**：
- 50 和 20 个任务的样本都很小；成本差距大而稳定，准确率差距没那么稳定。
- Crawl4AI 驱动真实浏览器，jevcrawl 不执行 JavaScript。
- 不读 `robots.txt`，除了一次抓 4 页外不做限速，站点条款与合规由使用者自负；不登录、不绕付费墙和 CAPTCHA。
- 页面文本会发送到 TypeSafe；API key 只从环境变量读，不落盘、不写日志。

**适用条件**：需要付费 API key 和联网到 `api.typesafe.ai`；只在不需要 JS、不需要登录、非付费墙的站点上工作；模型版本被固定（阈值按版本校准），换模型需重新评估。

## 怎么试、怎么验证

**最小试用（半天内可完成）**：

1. 准备一个真实问题，条件是答案埋在目标站点首页几跳之下、且该站点不依赖 JS 渲染。
2. 记下当前基线：用你现在的方式（让模型自己抓、或现有爬虫如 Crawl4AI）跑同一个问题，保存它喂给 LLM 的原始上下文和最终答案。
3. 按第 1 或第 2 步接好 MCP，用 `uvx jevcrawl doctor` 确认通路，然后跑：

```bash
jevcrawl crawl <start_url> --goal "<你的问题>" --json
```

4. 再换一个「答案就在已知单页上」的问题，跑 `jevcrawl scrape <url> --goal "..."`，确认这种场景不会浪费 Jev 调用、也不需要多页爬。
5. 把两份产出的答案交给同一个评审（人或另一个模型）盲评对错。

**判断有没有改善的指标**：

- 答案是否正确、引文是否真能对上原文（用 `char_start`/`char_end` 配合 `pages` 里的 `text_sha256` 回查）。
- 是否抓到含答案的页面（可以像 README 那样先只比 crawl，不接 LLM）。
- `tokens_raw` 与 `tokens_returned` 的比值：上下文压缩了多少。
- `jev_cost_usd` 与端到端耗时；是否落在 `max_decision_usd` 之内。
- `stopped_because` 是否为 `answered`；`degraded` 是否为 true（true 说明 Jev 三次失败后已降级为广度优先，这次结果不该算数）。
- `needs_js_urls` 是否非空——非空说明这个站点本来就不适合 jevcrawl。

**放大前的门槛建议**：多跑几个（不必到 50 个）不同站点的任务；只有当「找到答案页的比例」和「tokens 压缩比」在你的场景里也稳定优于基线、且每次成本可接受时，才考虑写进手册的推荐方案。
