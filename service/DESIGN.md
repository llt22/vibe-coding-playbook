# AI 工作方法调研服务：设计

目标：持续发现“怎样在工作中把 AI 用到最好”的新线索，按五个研究问题初筛，交给人决定是否深入。它不替人下结论，只负责不漏、不吵、失败可见。

五个研究问题见 [research/catalog/build.py](../research/catalog/build.py) 的 `QUESTIONS`，服务直接复用。

## 总体结构

```
            ┌──────────── Mac（24 小时开机，第一阶段也是宿主）────────────┐
            │                                                          │
 GitHub ─┐  │  服务进程（Node + SQLite）                                │
 HN     ─┼─►│   采集器 ─► 归一去重 ─► 对照清单 ─► LLM 初筛 ─► 候选池 ─► 网页 │
 RSS    ─┘  │      ▲                                                   │
            │      │ POST /ingest（带 token）                           │
            │   Ego 定时采集 X（本机登录态）                               │
            └──────────────────────────────────────────────────────────┘
```

- **第一阶段全部跑在 Mac 上**，只监听 127.0.0.1。Mac 常开，已有 Ego、claude、codex、omp 登录态和 `~/skills`，没有必要先上服务器。
- **以后迁到服务器时**：网页、数据库、GitHub/HN/RSS 采集搬过去；Mac 退为 worker，只做需要本机登录态的事（X 采集、深度调研），通过出站请求把结果推给服务器。服务器不需要能访问 Mac。
- **X 不在服务器上跑。** 服务器上跑登录态的无头浏览器违反 X 条款，也容易封号。官方 API 按量计费（二手资料称约 $0.005/次读取，需在开发者后台核实）；将来要接，也走同一个 `/ingest` 格式。

## 数据来源（MVP）

| 采集器 | 方式 | 频率 | 说明 |
|---|---|---|---|
| `github-search` | Search API，按关键词/topic，限近 7 天新建且星数过阈值 | 6 小时 | 无 token 每分钟 10 次，够用；设 `GITHUB_TOKEN` 可提高限额 |
| `github-trending` | 解析 github.com/trending 页面 | 每天 | 无官方 API；解析出 0 条视为失败 |
| `hn` | HN Algolia API，按关键词，限分数阈值 | 3 小时 | |
| `rss` | 博客和 newsletter 的 feed | 6 小时 | 每个 feed 单独记成功或失败 |
| `ingest` | 外部推送（X/Ego、以后的官方 API） | 被动 | 记录推送方的最后心跳 |

每次采集都记一条运行记录，GitHub 结果顺带记星数快照，用来算增长。

暂不做（第二阶段）：关注仓库的 Releases、arXiv、Reddit、V2EX、X 采集脚本本身。

## 处理流程

1. **归一**：每条线索有唯一 key。GitHub 仓库统一为 `github:owner/repo`，其余用去掉跟踪参数的 URL。同一 key 只保留一条，后续采集只更新热度。
2. **对照清单**：启动时载入 `research/catalog/catalog.jsonl`。命中已有条目的线索标记为“已在清单”，不重复初筛，页面上显示清单里的状态。
3. **LLM 初筛**：每批 10 条，结构化输出。每条给出：
   - 相关度 0–3（3 = 可能改变工作方式，0 = 无关）
   - 对应的研究问题
   - 一句中文理由，说清楚它能在真实工作里做什么；看不出实际用途的算“花架子”，给低分
   失败（接口错误、拒答、截断）标为“初筛失败”并显示原因，下一轮重试，不当作 0 分。
4. **人工决定**：网页上对每条选“采纳 / 观察 / 放弃”。采纳的由人手动触发深度调研（沿用 `ai-tool-radar` 等 skill），结论写回 catalog.jsonl。

模型用 `TRIAGE_MODEL` 环境变量配置，默认 `claude-opus-5-5`、effort `low`。凭据由 Anthropic SDK 从环境变量读取（`ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`，可选 `ANTHROPIC_BASE_URL`），服务不保存。

## 网页

| 页面 | 内容 |
|---|---|
| 今日需关注 `/` | 近 7 天、未决定、相关度 ≥ 2 的线索，按相关度和热度排序。顶部显示采集异常 |
| 候选池 `/candidates` | 全部线索，可按来源、决定、研究问题筛选 |
| 运行记录 `/runs` | 每个采集器最近的运行、条数、错误；每个推送方的最后心跳 |

**失败必须可见**：某个采集器最近一次失败，或超过两个周期没有成功运行，首页顶部标红。“没有新线索”和“采集失败”在页面上必须能区分开。

鉴权：默认只监听 127.0.0.1。设置 `WEB_PASSWORD` 后才允许监听其他地址，并启用 Basic Auth。`/ingest` 始终要求 `INGEST_TOKEN`。

## 推送接口

```
POST /ingest
Authorization: Bearer $INGEST_TOKEN
{
  "source": "x-ego",          // 推送方名称，也作为心跳
  "items": [{ "url": "...", "title": "...", "summary": "...", "author": "...",
              "published_at": "ISO 时间", "metrics": { "likes": 120 } }]
}
```

返回新增条数。空 `items` 也合法，相当于只报心跳。

## 存储

单个 SQLite 文件（默认 `service/data/radar.db`，不入库），使用 Node 自带的 `node:sqlite`。

- `items`：线索、热度、初筛结果、人工决定
- `runs`：每次采集的开始、结束、状态、条数、错误
- `star_snapshots`：仓库每日星数
- `pushers`：推送方最后心跳

## 技术选择

- Node 24 直接运行 TypeScript（类型擦除），不需要构建步骤；`tsc --noEmit` 只做类型检查。
- 依赖只有 `@anthropic-ai/sdk`、`zod`、`fast-xml-parser`。HTTP 服务用 `node:http`，页面服务端渲染，不引前端框架。
- 调度在进程内：启动时和每分钟检查一次，距离上次成功运行超过周期就执行。重启不丢进度，因为时间取自 `runs` 表。

## 分阶段

1. **MVP（本次）**：上述采集器、初筛、三个页面、推送接口，在 Mac 上用 launchd 常驻。
2. **X 采集**：Mac 上定时用 Ego 抓关注列表和关键词，推到 `/ingest`。
3. **深度调研任务**：网页上“采纳”后生成任务，Mac worker 拉取任务（`GET /jobs/next`、`POST /jobs/:id/result`），调用现有 skill，结论以 Markdown 写回仓库并提交。
4. **到期复查**：清单条目按状态设复查期限，到期重新进入“今日需关注”。
5. **迁服务器**（需要时）：Docker 部署，Mac 转为 worker。

## 运行

```bash
cd service
pnpm install
pnpm collect        # 手动跑一轮全部采集和初筛，有异常时退出码非 0
pnpm start          # http://127.0.0.1:4317，进程内每分钟检查到期任务
pnpm typecheck
```

- **代理**：本机直连 github.com 不稳定。Node 的 fetch 默认不走系统代理，需要 `NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:7897`。
- **推送接口**：设置 `INGEST_TOKEN` 后才启用。
- **常驻**：`launchd/ai-work-radar.plist` 用登录 shell 启动，凭据从 shell 配置读取，不写进文件。启用方式：
  ```bash
  cp launchd/ai-work-radar.plist ~/Library/LaunchAgents/
  launchctl load ~/Library/LaunchAgents/ai-work-radar.plist
  ```
- **费用**：初筛每批 10 条调用一次模型。首轮 176 条约 18 次调用，之后只处理新增。

原始会话日志（Codex、Claude Code、omp）不进入本服务，也不上传服务器。
