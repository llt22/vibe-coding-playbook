# arcmira/mcp

- 结论：**值得一试**。先在 Claude Code 里用一条命令接入这个远程 MCP（或改用带 Bearer key 的 JSON 配置），再照 README 的「先 resolve 后查询」示例程序做小范围试用；理由是仓库给出了可直接复制的安装命令、方法表、示例代码和 credits/限额规则，属于能立刻落地的工具供给，但数据覆盖与说话人/赞助识别准确性全是厂商自述，且有付费计划与预算门槛，不足以直接采纳。
- 原文：https://github.com/arcmira/mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T17:03:29.115Z

## 是什么

Arcmira 是一个**远程 MCP 服务器**（同时提供同名 CLI/SDK，以及 Claude Code、Codex、Gemini CLI 的插件包），让 AI 在 YouTube 视频与直播的转录内容里检索：找出「谁在什么时间说了什么」（带时间戳链接）、某个话题在哪些节目里被讨论、某个品牌赞助了哪些节目、谁在推荐某个实体（并区分自然推荐与赞助口播）。连接地址是 `https://mcp.arcmira.com/mcp`，用 Arcmira 账号登录。

它的调用方式不是暴露一堆细粒度工具，而是「让模型写程序」：MCP 只给 4 个工具——`arcmira_describe`（返回客户端方法参考，约 23,000 字符，不计量）、`arcmira_execute_read`、`arcmira_execute_write`、`arcmira_feedback`。后两者接收一段 async 函数体作为 `code`，在 Cloudflare Dynamic Worker 隔离沙箱里执行，程序内可用 `arcmira.*` 客户端方法（`resolve` / `search` / `mentions` / `momentum` / `sponsors` / `recommendations` / `episodes` / `transcript` / `occurrences` / `quote` / `status` / `monitors.*`），返回程序打印值与返回值。客户端方法名与 CLI 命令、SDK、API 端点一一对应，所以 MCP、CLI、SDK 共用一套词汇。

沙箱里程序不持有密钥（由父级出站代理注入凭证），出站只允许 `GET https://api.arcmira.com/v1/*`（写工具额外允许 `/v1/monitors` 与 `/v1/trackers` 的 POST/PATCH，永不 DELETE）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：一个 Arcmira 账号（可从网页或纯 API 注册）；MCP 宿主为 Claude Code / Codex / Claude Desktop / claude.ai / ChatGPT / Cursor / Gemini CLI 之一；付费计划与 on-demand 预算决定哪些能力可用（Premium 转录、赞助数据等会被 gate 拦住）。README 未给出免费额度上限，只说明「Plan limits apply」。

1. **偷懒路径：让 coding agent 自装。** 把这段原样丢给 agent：

```text
Fetch and execute the appropriate instructions to set me up for Arcmira from https://arcmira.com/agent-setup/prompt.md
```

2. **标准路径：用宿主登录（OAuth）添加远程 MCP，无 key。**
   服务器对无凭证请求返回 401 + OAuth 挑战，宿主自行注册、打开 arcmira.com 登录授权，token 自动刷新，可在 Settings → Connected apps 撤销。

```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp
```

```bash
codex mcp add arcmira --url https://mcp.arcmira.com/mcp
```

Claude Desktop、claude.ai、ChatGPT、Cursor：把 URL 作为 custom connector / MCP server 添加，不带 header，按提示登录。逐宿主步骤见 `https://arcmira.com/agent-setup`。

3. **备用路径：用 Bearer key（适用于不支持该登录流程的客户端）。** key 形如 `arc_sk_...`，来自 https://arcmira.com；计划与 scope 决定每个工具返回什么。没有账号也没有浏览器时，可纯 API 注册：

```bash
curl -X POST "https://api.arcmira.com/v1/signups?src=mcp-tool" \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@example.com"}'

curl -X POST "https://api.arcmira.com/v1/signups/verify" \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@example.com","code":"482913"}'
```

带 key 的命令行与 JSON 配置：

```bash
claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp --header "Authorization: Bearer $ARCMIRA_API_KEY"
```

```json
{
  "mcpServers": {
    "arcmira": {
      "url": "https://mcp.arcmira.com/mcp",
      "headers": { "Authorization": "Bearer arc_sk_..." }
    }
  }
}
```

401 响应体在 `error.data.unlock.action` 里带了注册调用，agent 可据此自行开户并重连。发现端点：`https://mcp.arcmira.com/.well-known/oauth-protected-resource`、`https://api.arcmira.com/.well-known/oauth-authorization-server`。

4. **连上后先要参考手册，别猜方法签名。** 让 agent 调用 `arcmira_describe`（可用 `topic` 只取某个方法及其示例）拿到 id 规则、方法表、参数与返回字段、可运行示例、常见坑、计量与监控规则、错误码。

5. **遵守 id 规则：先用 `resolve` 拿 id，再用 id 查询。** 过滤器只接受原样 id；把名字当 id 传入会在发网络请求前抛 `id_required`。`resolve` 返回 `best`（唯一）/ `suggested`（有一个更合适，需说明假设与理由）/ `ask`（多个候选，交给用户选）。可直接照抄的示例程序：

```javascript
const r = await arcmira.resolve("Linear");
const e = r.best ?? r.suggested;
if (!e) return { ask: r.ask };
const m = await arcmira.momentum(e.id);
return { entity: e.name, id: e.id, assumed: Boolean(r.suggested), why: r.suggested?.evidence ?? null, verdict: m.verdict, last30: m.volume.mentions_30d, prior30: m.volume.mentions_prior_30d, as_of: m.as_of };
```

6. **需要整段转录（含无字幕视频）时用 Premium 质量，并处理「还没转好」的情况。** `arcmira_execute_read` 内一次 Premium 读取：

```javascript
const t = await arcmira.transcript("cdLeJU_1UH8", { quality: "premium" });
return t.state === "ready" ? t.lines : { state: t.state, eta_seconds: t.eta_seconds, note: t.note };
```

若视频尚未转录，`GET /v1/transcripts/{video_id}?quality=premium` 会启动转录并返回 `202` 与 `Retry-After`；按 `Retry-After` 重读直到程序进行到第 22 秒，重读不会重复计费；仍 `pending` 则结果带 `eta_seconds`，下一次程序再读即可拿到内容。失败会返回 `state` 为 `failed` 或 `refunded` 及原因，除非传 `retry: true`（只在用户要求时传）否则不会重开。

7. **先查价再跑贵操作。** `arcmira.quote(video)` 返回整段 Premium 读取会用多少 credits（以及 on-demand 美分），本身不计费。计量规则：搜索按返回结果中超出前 5 条的每条 passage 收 4 credits；字幕读取按其窗口每开始的 15 分钟收 4 credits；Premium 转录按整段视频每开始的 15 分钟收 300 credits；`momentum` 每次调用 10 credits。`start` / `end` 不会降低 Premium 计费。

8. **预算由 dashboard 控制，工具本身不接受金额参数。** 先在控制台设 on-demand 预算；被计划或预算拦住时，工具返回 `isError: true` 与错误码之一：`paid_plan_required`、`quota_exceeded`、`spend_limit_exceeded`、`member_limit`、`fair_use_cap`、`on_demand_paused`，并附 `message` 说明触发了什么、什么能解除，以及可选的 `unlock`。程序里应按 `code` 分支处理。

9. **用示例提示词快速验证接通。** README 给的原句：

- Which brands sponsor both TBPN and the All-In Podcast?
- How hot is Linear, the project management tool, on the spoken web right now?
- Find a moment on TBPN from the last 90 days where someone talks about stablecoins, and quote it.
- Who is speaking in the first minute of the latest TBPN episode, according to the Premium transcript?
- On TBPN, how many episodes mentioned Cursor in July versus August?

可直接用的初始 id：TBPN 频道 `UC-DRzaGnL_vtBUpCFH5M0tg`，All-In Podcast `UCESLZhusAkFfsNsApnjF_Cg`，Ramp `ent_14`。

10. **要「持续盯着」就建 monitor（必须走写工具 `arcmira_execute_write`）。** `monitors.create({ name, notify_frequency, notify_emails?, notify_slack?, ... })`、`monitors.update(id, { ..., paused? })`、`monitors.addEntities(id, entityIds, { personMatchMode? })`（一次最多 90 个 id）、`monitors.addName(id, [{ name, type, personMatchMode? }])`（跟踪尚未被索引的名字，节目用其 `UC` id）、`monitors.attachTrackers(id, trackerIds)`（迁移别的 monitor 的 tracker，需用户先同意）。不提供删除；`integrations.slack()` 查看已连 Slack 及默认投递频道。

11. **可选：装插件，拿到 6 个任务技能。**

```bash
claude plugin marketplace add arcmira/mcp
claude plugin install arcmira@arcmira
```

技能为 `arcmira`（总入口与 id 规则）、`sponsor-research`、`company-watch`、`find-quotes`、`person-research`、`compare-shows`。每个技能都从名字出发、必要时返回 `ask`、说明假设并报出所用实体，结尾都带 monitor 与 feedback 建议。Gemini CLI 用：

```bash
gemini extensions install https://github.com/arcmira/mcp
```

（根扩展只装 `arcmira` 技能，不含 5 个可选任务技能。）其他情况可用 `npx skills add arcmira/mcp` 装技能。

12. **保持更新。** 远程 MCP 本身不需要更新（宿主每次连接拉取工具与说明，`arcmira_describe` 每次带版本行）。Claude Code 第三方 marketplace 默认关闭自动更新，需在 `/plugin` → Marketplaces → arcmira → Enable auto-update，或写进设置：

```json
{ "extraKnownMarketplaces": { "arcmira": { "source": { "source": "github", "repo": "arcmira/mcp" }, "autoUpdate": true } } }
```

立即更新：`claude plugin update arcmira@arcmira`。Codex：`codex plugin marketplace upgrade arcmira` 后重启。npx 装的技能：`npx skills update`。

13. **出错时把失败回报给服务方。** `arcmira_feedback` 接收 `category`（`wrong_entity` / `bad_data` / `missing` / `slow` / `confusing` / `other`）、`note`，以及可选的 `request_id` / `call_id`。空结果、报错、被截断或 resolve 返回 `ask` 的结果都会带 `call_id`（`mcpc_...`），可用它点名具体那次调用。

14. **知道沙箱的硬边界，按边界写程序。** `execute_read` / `execute_write` 每次程序限 30 秒墙钟、5 秒 CPU、40 次 API 调用（超出报 `call_budget`）；渲染输出总计截断到 12,000 字符、单字符串 3,000、单数组 100 项，被截断的数组会在 `truncated_arrays` 里点名，并给 `recovery` 说明如何取全。从读工具调用写方法会在发请求前抛 `write_tool_required`。超时返回 `calls: null` 与 `outcome_uncertain: true`。每条结果都带 `_meta["arcmira.com/rate_limit"]`（`{ limit, remaining, reset }`）与 `_meta["arcmira.com/build"]`。

## 对应的研究问题

**1. 能力发现（哪些还没想到交给 AI 的工作）**：README 明确列出几类「以前要人来听/记」的工作——在长视频与直播里定位某话题的具体时间戳片段并引用原话、判断某品牌同时赞助了哪些节目、统计某话题在两个月之间被多少集提到、区分自然推荐与赞助口播、看某实体近期热度变化（`momentum` 给出近 N 天与前 N 天对比及 verdict）。这些是内容调研、选题与事实核验场景的直接候选。

**2. 任务匹配（什么工作适合什么模型/工具/协作方式）**：本仓库提供了一种明确的协作范式——**代码执行型 MCP**：不给模型几十个工具，而是给一份 23,000 字符的方法参考（`arcmira_describe`）+ 一个可跑 JavaScript 的沙箱，让模型自己组合多步聚合查询（一次程序内可跨 `resolve`→`momentum`→`search`）。适合「需要多步 API 组合、需要按条件聚合」的调研任务；对只需一次简单查询的场合则显得绕。Premium 转录用于「视频没有可用字幕」这一特定子任务。

**3. 条件供给（需要哪些信息、工具、权限和反馈）**：需要账号（OAuth 授权或 `arc_sk_...` 密钥）、付费计划与 on-demand 预算设置、Slack 集成（monitor 投递用）；需要给 agent 的关键信息是 **id 而非名字**（先 `resolve`）；需要给 agent 的「能力说明」由 `arcmira_describe` 按调用实时提供；反馈通道是 `arcmira_feedback` 加 `call_id`。

**4. 主动推进（时间/事件/状态触发）**：`monitors.create/update/addEntities/addName/attachTrackers` 构成可持久化的跟踪器，带 `notify_frequency`、邮件与 Slack 投递、`paused` 状态；`addName` 允许跟踪「尚未被索引」的名字，因此可以在事件发生前就布好监控。README 没有说明默认触发频率或延迟。

**5. 效果验证**：可用的验证杠杆包括：`quote` 事前报价、每次结果里的 `rate_limit` 与 `build` 元数据、明确的错误码清单（区分「没权限」「超预算」「限流」）、`arcmira_feedback` 的 6 类错误标签、以及 README 自己对准确性的免责声明（说话人识别与赞助/自然推荐分类「可能不完整或错误，请回源核对」）。CI 侧还有 `pnpm examples:check` 会用生产环境跑通每个示例程序。**但原文没有给出任何「效果改善」的量化指标或对照实验**，验证方法需要自行设计（见末节）。

## 与已有做法的关系

清单中有 **Claude Code（adopt）**：本仓库给出了 Claude Code 的一行接入命令、插件市场安装、6 个技能、以及默认关闭的自动更新开关和 `~/.claude/settings.json` 配置——这是「给 Claude Code 接外部数据源」的一个完整样板，也能作为其他 MCP 接入的对照。清单中有 **Cursor（watch）**：README 说明 Cursor 走 custom connector / MCP server 加 URL、不带 header，然后按提示登录，没有额外命令。

除这两条外，清单中没有相关条目。

## 证据与局限

**原文给出的具体事实（可核对的规格）**：两套接入方式及命令、4 个 MCP 工具及其输入/返回、完整客户端方法表与对应 HTTP 端点、计量单位与单价（搜索 4 credits/超出前 5 条的每条 passage、字幕 4 credits/每开始 15 分钟窗口、Premium 转录 300 credits/每开始 15 分钟、`momentum` 10 credits/次）、`arcmira_execute_read/write` 的沙箱出站白名单、30 秒/40 次调用/12,000 字符等硬限额、Premium 转录的 202+`Retry-After`+22 秒等待协议、6 个错误码、`arcmira_feedback` 的 6 类标签、插件与技能的构成、开发脚本清单（`pnpm manifest:check`、`pnpm skill:check`、`ARCMIRA_KEY=... pnpm examples:check` 对生产跑示例）。

**只是作者主张、无法从原文验证的**：检索结果的质量、赞助 vs 自然推荐分类的准确率、说话人识别准确率、「区分自然推荐与赞助口播」这个卖点本身；所有数字都来自厂商 README，没有第三方评测、没有准确率数据、没有客户案例或前后对比。仓库仅 31 stars，成熟度证据薄弱。README 自己承认结果只覆盖「已索引的视频」，且说话人识别与赞助分类「可能不完整或错误，需检查链接来源」。

**适用条件与代价**：需要账号与付费计划才能解锁 Premium 转录与赞助相关能力（如 `recommendations_not_enabled` / 「Sponsor recommendations require Pro.」这类 gate）；消耗 credits，需要自行设置 on-demand 预算上限以防超支；每次程序有 30 秒墙钟与 40 次调用上限，复杂聚合必须拆多次调用，且输出会被截断（要用 `recovery`/continuation 字段翻页）。

**隐私相关（选型时必须知道）**：每次工具调用都会记入 PostHog：工具名、宿主名与版本、服务端版本、耗时、**程序文本（前 4,000 字符）**、`intent`（≤300 字符，可选）、结果大小与是否截断、调用的 API 路由（不含 query string）；存储前会把凭证与邮箱地址替换为 `[redacted]`；**结果、转录文本与程序打印的日志从不记录**。无有效凭证的调用不记录。

## 怎么试、怎么验证

**最小试用（半天内可完成）**：

1. 在 Claude Code 里执行 `claude mcp add --transport http --scope user arcmira https://mcp.arcmira.com/mcp`，按提示登录；先在 dashboard 把 on-demand 预算设成一个很小的上限，避免试错烧 credits。
2. 用 README 给的初始 id 跑 3 个问题，覆盖不同能力：(a) 在 TBPN 最近 90 天找一段谈稳定币的片段并引用；(b) 问哪些品牌同时赞助 TBPN 和 All-In Podcast；(c) 统计 TBPN 七月与八月各有几集提到 Cursor。
3. 对每个返回的片段**点进链接人工回源核对**：时间戳是否对得上、说话人是否认错、赞助/自然推荐的标注是否正确。这一步不能省——这是 README 自己要求的。
4. 遇到空结果、报错、截断，用返回的 `call_id` 调 `arcmira_feedback` 记一条，顺便统计自己的失败分布。
5. 若要做持续跟踪，建一个 monitor 跟踪 3–5 个实体，`notify_frequency` 设成你能承受的频率，跑一到两周。

**判断有没有改善的指标（自行设定，原文未给）**：

- **引用准确率**：人工核对通过的片段数 ÷ 返回片段数（把「时间戳错误」「说话人错误」「赞助标注错误」分开记）。低于你的可接受线就不要进入正式流程。
- **定位耗时**：同一类问题（例如「某人某话题的原话+时间戳」）用本工具 vs 手动 YouTube 搜索/翻字幕的耗时对比。
- **覆盖率**：目标节目在 `arcmira.status()` 报告的覆盖范围内是否齐全、索引日期是否够新——覆盖不到的节目直接不算数。
- **失败构成**：按错误码和 feedback 标签统计，看失败是「没权限/超预算」（可花钱解决）还是「查不到/查错」（工具能力问题）。
- **单位成本**：用 `arcmira.quote` 先估，再对每次任务的 credits 消耗记账，换算成「每个可用引用」的成本。
- **监控信噪比**（若建了 monitor）：收到的提醒里有多少直接可用、多少是误报。

**结论门槛**：如果引用准确率明显高于人工替代方式、且单位成本可接受，就把它固化成「内容调研/事实核验」的标准前置步骤；如果准确率一般但只用作「找线索、再人工回源」，则定位为线索发现工具，而不是结论来源。
