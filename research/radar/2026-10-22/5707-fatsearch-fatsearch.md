# fatsearch/fatsearch

- 结论：**值得一试**。把 fatsearch 装成 Claude Code 的 MCP 工具，在“代理需要读网页或 PDF、但上下文预算敏感”的场景里小范围试用，先用 `fats stats` 和 `dry:true` 自己量 token 与成本，再决定是否推广。因为它给出可直接照抄的安装、MCP 注册和“先看大纲、按节读取”的操作流程，但效果数字全部来自作者自published benchmark，48 stars 的早期项目（v0.2.x），还不足以直接 adopt。
- 原文：https://github.com/fatsearch/fatsearch
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-22T05:50:15.661Z

## 是什么

fatsearch 是一个面向 AI 代理的网页与文档读取命令行工具，命令名是 `fats`，可安装为 CLI，也可以注册为 MCP server。它的做法是：把一个 URL 抓下来 → 清洗成 Markdown → 生成大纲并缓存成一个 id（如 `u1`），代理先只拿大纲，需要细节时再读某一节（`fats u1#3`）或在页内做关键词过滤（`fats u1 price`）。因此进入模型上下文的不是整页 HTML，而是被裁剪过的片段。

几个关键特性（均来自 README）：

- 能读内置 fetch 读不了的页面：JS 渲染页、PDF、带 captcha 或拦截的页面（需自备 Oxylabs / Bright Data / Decodo 之一作为 provider）。
- 抓取分级：先走免费纯 HTTP（自己的 IP），失败再按“最便宜优先、对冲并发”升级到 provider，每次调用都记成本。
- 免费抓取有限速：每个站点每秒最多发起一次请求，页面排队而不是直接花钱。
- 支持网页搜索（需 Oxylabs 或 Bright Data key）、GitHub 仓库按 star 搜索、本地 PDF（每页一节）。
- MCP 只暴露一个工具 `fats(cmd)`，工具卡约 60 token，一个字符串参数。
- 没有账号体系，无 daemon、无浏览器内核；二进制 17–21 MB。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：macOS/Linux 或 Windows；有 Homebrew / npm / cargo 之一，或能跑安装脚本；不需要账号。provider key 可选，但只装免费通道时，遇到 JS 页面、captcha 或拦截页就抓不到内容，网页搜索也用不了。

### 第 1 步：安装 CLI

任选其一：

```sh
brew install fatsearch/tap/fatsearch
```

```sh
curl -fsSL https://fatsearch.com/install.sh | sh
```

```sh
npm i -g fatsearch        # Windows 走这条
```

```sh
cargo install --locked fatsearch
```

注意：包名是 `fatsearch`，命令是 `fats`。Homebrew、npm 和安装脚本会额外加一个 `fatsearch` 别名；`cargo install` 只加 `fats`。

### 第 2 步（可选）：配置 provider key

**在终端里自己操作**：

```sh
fats setup
```

它会打开一个菜单（↑↓ Enter，即上下方向键加回车）：免费抓取、各 provider 及其状态、Settings（agent 连接、缓存、统计、遥测）。选一个 provider，粘贴 key（显示为 `•` 和计数），`fats` 会实时校验后再保存。也可直接跳转：

```sh
fats setup oxy       # 也可 bd / decodo / gh
```

**通过代理配置（key 不进入对话）**：让代理执行 `fats setup oxy`（或 `bd` / `decodo` / `gh`）。它会打印 provider 控制台链接和一个位于 `127.0.0.1` 的一次性表单 URL，有效期 10 分钟；你在浏览器里粘贴 key，而不是粘进聊天。README 给出的代理侧话术原文：

```console
$ fats setup decodo
= setup decodo · waiting for the key at http://127.0.0.1:59802/k/e0c8baba7a5b058947f4fdab97dabb05/decodo · 10 min · $0
tell the user (never ask for the key in chat):
1. open https://dashboard.decodo.com/web-data/playground  (no account yet: https://dashboard.decodo.com/register)
2. Copy the API key shown on the Web Data playground. Do NOT paste it in this chat.
3. open http://127.0.0.1:59802/k/e0c8baba7a5b058947f4fdab97dabb05/decodo , paste the key, press Save
then: fats setup   (when the user says done; end your turn, do not poll · checks it, $0)
browser not on this machine (SSH)? the user runs fats setup decodo in a terminal there and pastes the key
```

**无浏览器的机器（CI / SSH）**：把 key 通过管道输入。

```sh
printf %s "$KEY" | fats setup oxy
```

**环境里已导出 key**：导入一次；它只补“尚未保存”的位置，不覆盖已保存的 key。

```sh
fats setup import-env
```

安全细节（照做即可）：key 写入 key 目录下的 `auth.json`（权限 0600），只发给对应 provider；`auth.json` 是唯一 key 来源，`fats` 不会使用环境变量里的 key；替换 key 时旧文件保留为 `auth.json.bak`（0600）；表单拒绝来自其他源的 POST。

**临时停用某 provider 而不丢 key**：

```sh
fats setup oxy off
fats setup oxy on
```

**完全关掉免费通道**（所有页面都走 provider，每页都花钱）：

```sh
fats setup free off
```

### 第 3 步：接入代理（MCP）

```sh
claude mcp add --scope user fats -- fats mcp                      # Claude Code
codex mcp add fats -- fats mcp                                    # Codex
{"mcpServers": {"fats": {"command": "fats", "args": ["mcp"]}}}   # Cursor, Desktop, …
```

MCP Registry 标识：`mcp-name: io.github.fatsearch/fats`。

### 第 4 步：给代理装入技能说明（推荐，让代理知道“怎么读而不淹上下文”）

```sh
npx skills add fatsearch/fatsearch        # Agent Skills standard: Claude Code, Codex, Cursor, Copilot, Gemini CLI, …
gh skill install fatsearch/fatsearch      # the same through GitHub CLI ≥ 2.90
```

没有上述 CLI 的代理，读取固定到某个 release 的原文（可审阅、不来自网站运行）：

```
https://raw.githubusercontent.com/fatsearch/fatsearch/v0.2.3/skills/fatsearch/SKILL.md
```

给代理看的纯 Markdown 文档：`https://fatsearch.com/llms.txt`。

### 第 5 步：日常使用流程（这是“省 token”的核心操作）

```sh
fats <url>              # 抓取 → 清洗 → 大纲，缓存为 u1
fats u1#3               # 读第 3 节
fats u1 price           # 页内过滤
fats u1 links           # 编号链接
fats l4                 # 跟随第 4 个链接
fats rust async runtime # 网页搜索（需 Oxylabs 或 Bright Data key）
fats gh rust markdown   # GitHub 仓库按 star 搜
fats ./report.pdf       # 本地文件，每页一节
fats stats              # 每次抓取：provider、毫秒、成本、token
```

**先估算再执行**（在每个命令后加修饰符）：

```sh
fats https://www.nytimes.com/ dry:true
```

输出示例（原文）：

```console
$ fats https://www.nytimes.com/ dry:true
nytimes.com/ fetch plain → oxy (after a captcha) → bd ∥ oxyjs after 5s → new u1 · up to $0.0040

$ fats stats
u1 rust-lang.org · Rust Programming Language · plain 230ms $0.0000 · 1.2ktok
u2 en.wikipedia.org · Rust (programming language… · plain 558ms $0.0000 · 40.9ktok
```

其他修饰符：`limit:20` `country:de` `js:true` `wait:30` `fresh:true`（`fresh:true` 用于绕过缓存取新内容）。全部命令一屏看：`fats help`；用法建议：`fats guide`。

### 第 6 步：关掉遥测（如果团队要求）

遥测不上传 URL、搜索词、页面文本、文件、API key、IP 或任何 id，只上传版本、OS、包来源、命令名、错误、provider 可用性、自身崩溃。三种关闭方式：

```sh
fats setup telemetry off
```

```sh
FATS_TELEMETRY=0
```

```sh
DO_NOT_TRACK=1
```

先看清到底发了什么：`fats telemetry show`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
- 把“读一页网页/PDF 并只取其中一段”整体交给代理，而不是让代理自己 curl 或使用内置 WebFetch。README 声称 Claude Code 的 WebFetch 在 npm、Medium、G2 上返回 403，而 `fats` 三页都读到了。
- PDF 按页切节（`fats ./report.pdf`），使“引用 PDF 某一页”变成一次可寻址操作。
- 网页搜索（`fats rust async runtime`）与 GitHub 按 star 搜索（`fats gh rust markdown`）也被纳入同一命令面；搜索需 Oxylabs 或 Bright Data key。

**2. 任务匹配**
- 适合：目标是“从长文档里取一个事实/一段/一个数字”的检索型任务，因为默认只返回大纲，按节读。
- 适合：需要绕过 JS 渲染、captcha、拦截的页面读取；分级回退（免费 HTTP → 最便宜 provider → 对冲）是明确可配置的匹配逻辑。
- 工具面匹配代理调用习惯：MCP 只一个工具、一个字符串参数，工具卡约 60 token，代理不需要学多工具的 schema。
- 不适合（README 自述的边界）：扫描版 PDF（OCR，返回 `! no_text`）、DOCX/XLSX（`! not_in_v1 zip`）、登录墙后的页面、需要语义近似/主题匹配的检索（`match:near`/`match:topic` 需本地模型）。作者没有讨论“必须通读全文才能下结论”的任务是否会被大纲机制削掉信息，这是试用时要专门验的点。

**3. 条件供给**
- 需要供给：本地安装一个二进制或 npm 包；可选一个 provider key；在代理侧注册 MCP（一条命令或一段 JSON）；可选装 Agent Skill 让代理知道正确的读法。
- 权限与凭据的最小化设计可以直接照抄：key 经 `127.0.0.1` 一次性表单（随机 token、10 分钟有效、拒绝跨源 POST、0600 存储、只发往对应 provider）录入，明确要求“不要粘进聊天”；无浏览器场景用管道或 `import-env`。
- 反馈通道：每步都有可见回执——`fats stats` 逐次列出 provider 与成本，`dry:true` 预估花费，缺失能力以 `!` 行显式说明“缺什么、该怎么办”，且“Never silence”（从不静默）。
- 供给不足时的降级路径明确：无 key 时只读纯 HTTP 能读的内容；`fats setup free off` 则全部走付费。

**4. 主动推进**
- README 没有给出任何时间/事件/状态触发的持续运行机制：明确写了“no daemon”。没有 watch、cron、回调、重试队列的描述。
- 唯一的“状态”是缓存与 id 复用（`u1` 可被后续 `u1#3`、`u1 price`、`u1 links` 反复寻址，`fresh:true` 刷新）。这为“多轮持续读同一页面”提供了状态基础，但需要外部调度器来驱动。

**5. 效果验证**
- 自带计量：`fats stats` 输出每次抓取的 provider、毫秒数、美元成本、token 数；`dry:true` 输出将会执行什么、上限花费多少；`fats account` 可核对 Oxylabs 与 Bright Data 的实际消费（Decodo 该 key 无用量回读，其 `$` 只是标价，从未对账——作者明说）。
- 成本口径透明：README 列出各 provider 每页标价（Oxylabs 纯页 $0.0010 / 渲染 $0.0015 / 搜索 $0.0010；Bright Data 渲染与搜索各 $0.0015；Decodo 纯页 $0.0010 / 渲染 $0.0015）。
- 有公开的 benchmark 页面与 `docs/benchmarks.md`，作者声称“losses included”（失败案例也列出）。

## 与已有做法的关系

- **Claude Code（adopt）**：直接给出注册命令 `claude mcp add --scope user fats -- fats mcp`；并给出在 Claude Code 2.1.280 上 51 个任务的对比：FATSEARCH MCP 50/51 正确、Firecrawl MCP 51/51 正确；成本 $15.06 vs $53.48 每千任务；中位 5.3 s vs 6.7 s；最慢十分位 43.8 s vs 21.5 s（即长尾更慢）。另称 Claude Code 的 WebFetch 在 npm、Medium、G2 上 403，fats 三页都能读。
- **Cursor（watch）**：给出 Cursor 可用的 MCP 配置片段 `{"mcpServers": {"fats": {"command": "fats", "args": ["mcp"]}}}`，但没有 Cursor 上的实测数据。
- **Jina Reader（try）**：在“同一 Wikipedia Rust 页面”的成本表中，Jina Reader 为 94,415 tokens、模型账单 $0.19，FATSEARCH 为 918 tokens、$0.002。注意这是作者自建的对比表，不是第三方评测。
- **Tavily（watch）**：出现在两处对比：成本表（Tavily Extract 97,504 tokens、$0.20）与“38 个难页在 1/10/20/60 秒内给出答案”的表（Tavily 9/17/18/19，FATSEARCH 12/19/19/35）。作者同时承认在“能读到的页面上”Firecrawl 与 Tavily 更快（同页中位 23.7 s vs 4.9 s、23.7 s vs 1.0 s），且各 reader 在不同日期运行。
- **Agent skills（adopt）**：仓库内提供 `skills/fatsearch/SKILL.md`，按 Agent Skills 标准分发（`npx skills add fatsearch/fatsearch` 或 `gh skill install fatsearch/fatsearch`）；无 CLI 的代理读取固定到 release tag 的 raw 链接（`.../v0.2.3/skills/fatsearch/SKILL.md`），目的是“代理看到的是可审阅的版本化文本，运行的东西不来自网站”。这与“把操作规程写成代理可读的技能文件”这一已有做法同构。

## 证据与局限

**原文给出的数据/案例（全部来自仓库 README 及其指向的官方 benchmark）**：
- 同一 Wikipedia Rust 页的六方 token 对比：Firecrawl 112,517 / Bright Data Unlocker 103,625 / Oxylabs Web API 102,609 / Tavily Extract 97,504 / Jina Reader 94,415 / FATSEARCH 918；对应模型账单 $0.23 / $0.21 / $0.21 / $0.20 / $0.19 / $0.002。标题处另有一个“1,384 tokens vs 112,517”的版本（同一问题、同一答案、81× 更少上下文），与正文 918 的口径不同，说明不同测试设置下的数字并不统一。
- 38 个“难页”（社交、新闻、商店、旅行、分类广告、搜索，各一次运行）在 1/10/20/60 秒内给出答案的数量：FATSEARCH 0.2.0 为 12/19/19/35，Firecrawl 为 0/22/24/24，Tavily 为 9/17/18/19。
- Claude Code 上 51 任务对比（见上一节）。
- 开源 reader 在同一 Wikipedia 页上：FATSEARCH 1,384 tokens 到答案；mcp-server-fetch、Crawl4AI、mcp-searxng、自托管 Firecrawl 为 75k–117k（整页）。
- 性能：二进制 17–21 MB，原生启动 4 ms，缓存读 5 ms，npm shim 额外加约 40 ms。

**只是作者主张、未在给定材料中被独立验证的**：
- “81×/100× 更省”的营销口径；“loss guard 会数每一个价格、日期、数字”这一保真度声明只出现在文案里，没有给出计数结果或漏检率。
- 所有 benchmark 都由作者自己发布在 fatsearch.com 与 `docs/benchmarks.md`；作者自己承认“readers ran on different days”（不同日期运行，环境不可比），且 Firecrawl/Tavily 在各自能读的页面上更快。
- 表中日期标注为 2026-10-16 至 2026-10-21，比常规时间线靠后，无法据给定材料核实，进一步降低对数字的采信度。
- 仓库 48 stars、版本 0.2.x，属于早期项目；本次只拿到 README，没有代码、issue、第三方复现。

**作者自述的适用条件与不做的事**：`match:near`/`match:topic` 需本地模型；扫描版 PDF 无 OCR（`! no_text`）；不支持 DOCX/XLSX（`! not_in_v1 zip`）；key 存在 `auth.json` 而非 OS keychain；MCP 仅 stdio，无远程；登录墙后的页面读不到。另有免费通道的限速约束（同站每秒最多一次），意味着批量抓同一站点会排队变慢。

## 怎么试、怎么验证

**最小试用（半天到一天，单人可完成）**
1. 在一台机器上按第 1 步安装，先不配 key，只用免费通道。
2. 从你真实工作里挑 8–12 个 URL，覆盖三类：普通文档/博客页、JS 渲染页、带拦截或 captcha 的页（含一两个你已知内置 fetch 会 403 的站点），外加 1 个本地 PDF。
3. 对每个 URL 跑 `fats <url> dry:true` 记下预估，再跑 `fats <url>` + `fats stats`，记录 provider、毫秒、成本、token。
4. 用同一批 URL 跑你当前的做法（Claude Code 内置 WebFetch / Jina Reader / 直接 curl 喂模型），记录同样四项指标。
5. 配一个 provider key（建议先 Oxylabs 或 Bright Data，因为这两家可 `fats account` 对账），只对第 2 步里失败的页面重跑，确认“升级路径”确实救回了页面。
6. 按第 3、4 步接入 Claude Code MCP 并装 Agent Skill，跑 15–20 个真实任务（例如“找出这页的发布日期和定价”“这份 PDF 第 3 页的实验条件是什么”），记录是否答对、用了几个 `fats` 调用、端到端耗时。

**判断“有没有改善”的指标（都用 `fats stats` 与你自己的记录算，不引用 README 数字）**
- 上下文 token / 每答对一题：相对当前做法是否显著下降（这是它的核心卖点，也最容易测）。
- 每任务美元成本：`fats stats` 的 $ 加总 ÷ 任务数；与当前做法（含模型侧 token 成本）对比。
- 难页读取成功率：原本 403 / JS-only / captcha 的页面，现在能读到正文的比例。
- 答案正确率与信息丢失率：对每个任务预先从原文摘出关键数字/日期/价格作为答案键，检查返回片段是否保留；这是对“loss guard”声明的直接检验，也是本工具最大的潜在失败模式。
- 端到端延迟，特别看 p90：作者自己的数据里 FATSEARCH 最慢十分位 43.8 s vs Firecrawl 21.5 s，如果试用中长尾同样明显，就把它限定在非交互的批处理/后台调研，而不是对话中的即时查询。
- 运维面：key 是否确实没出现在聊天记录与代理日志里（抽查日志）；`auth.json` 权限是否 0600；按需关闭遥测后 `fats telemetry show` 是否为空。

**判定规则（建议）**：若“token/成本显著下降 + 难页成功率提升 + 答案正确率不掉（信息丢失率可接受）+ p90 延迟在你的场景可忍”，就把 MCP 注册与“先 `dry:true` 再抓、先大纲后按节读”的操作规范写进手册；若只有 token 下降但信息丢失或长尾延迟明显，则降级为“批处理场景专用”；若难页能力主要依赖付费 provider 且成本对账不清（Decodo 无用量回读），则限定只使用可对账的 provider。回滚很简单：`fats setup <provider> off` 保留 key 停用，或直接从 MCP 配置里删掉 `fats` 条目。
