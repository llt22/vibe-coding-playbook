# Building effective agent automations

- 结论：**值得一试**。先按文中六条规则和参考实现的文件结构，在“单一来源 + 单一收件人 + 每日一次”的最小场景里试跑一个定时 brief（用 /claude-api managed-agents-onboard 起步、用手动触发而非等排期来验证），因为它给出了可复制的配置、命令和失败模式清单，但仍属 beta 且强依赖 Anthropic 托管平台，幂等性、漏读上报和成本上限都需自己实测。
- 原文：https://claude.dev/blog/building-effective-agent-automations/
- 来源：rss:claude.dev，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T17:33:58.334Z

## 是什么

这是一篇 reference implementation 走查（作者 Lance Martin、CJ Avilla，claude.dev，2026-10-08），用 **Claude Managed Agents（beta）** 搭一个“定时读来源 → 找出变化 → 推送到 Slack”的后台 agent 自动化。

目标形态是：按 cron 排期运行、在后台收集上下文、只把“读者今天会采取行动”的条目推送出去，不需要本机常驻进程（跑在 Anthropic 基础设施上）。文章给出的不是一个观点，而是一套可落地的目录结构、配置文件和 CLI/SDK 命令，并列出六条踩坑规则。文章明确说这是起点，需要按自己的来源、目的地、偏好改写。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 前提

- 一个 Claude API workspace（Managed Agents 处于 beta）。
- 已安装 Claude Code，并能跑 `claude-api` skill。
- 一个 Slack app（按文中提供 manifest 创建）和一个 GitHub token。

### 1. 更新 Claude Code

```shell
claude update
```

### 2. 用 claude-api skill 一键起步（最省事的入口）

在 Claude Code 里运行：

```
/claude-api managed-agents-onboard https://claude.dev/blog/building-effective-agent-automations/
```

该 skill 会读这篇文章、提出一个方案、把文件写到项目里的 `agents/` 目录，并用 `ant apply` 创建资源。文中提示：把这当成起点，再按自己的来源/目的地/记忆偏好定制。

### 3. 认识参考实现的文件结构（`daily-brief/`）

```text
daily-brief/
├── agent.md model, tools, instructions
├── deployment.md schedule, time zone, budget, input message
├── environment.yaml network allowlist
├── memory_store_preferences.yaml user preferences
├── memory_store_state.yaml the agent's bookmarks, ledger, notes, and run records
├── vault.yaml the vault that holds the credentials
├── claude-lock.json resource IDs, written by ant apply
└── slack/manifest.yaml one bot app
```

`ant apply` 读取这些文件、在 Claude API workspace 里创建资源，并把资源 ID 记录进 `claude-lock.json`。

### 4. 建 vault 并把凭据放进去（前提：想清楚 agent 只需要哪些权限）

```shell
ant apply vault.yaml
```

然后用 TypeScript SDK 逐个添加凭据（下面以 Slack 为例；`VAULT_ID` 从 `claude-lock.json` 取）：

```typescript
const vaultId = process.env.VAULT_ID!; // the vault's ID, from claude-lock.json

await client.beta.vaults.credentials.create(vaultId, {
  display_name: "SLACK_BOT_TOKEN",
  auth: {
    type: "environment_variable",
    secret_name: "SLACK_BOT_TOKEN",
    secret_value: process.env.SLACK_BOT_TOKEN!,
    networking: { type: "limited", allowed_hosts: ["slack.com"] },
    injection_location: { header: true },
  },
});
```

机制说明（照抄文中的设计）：GitHub 走 MCP，通过沙箱外的 proxy 调用，proxy 按 URL 匹配 vault 凭据；Slack 走沙箱内的 bash + curl，沙箱里只放占位符 `$SLACK_BOT_TOKEN`，请求离开沙箱时平台对 allowlist 内主机替换成真 token。

### 5. 把 vault 挂到 deployment

把 `claude-lock.json` 里的 vault ID 复制到 `deployment.md` 的 `vault_ids`。

### 6. 用 bookmark 而不是固定时间窗口读来源

不要写“读最近 24 小时”：跑晚了会漏，跑早了会重。改为每个来源一个 bookmark：每次运行结束时，把每个源读到的最新条目的时间戳写进 `bookmarks.json`，形如 `"slack": "2026-09-14T13:02:11Z"`。下次从 bookmark 起算，窗口自动伸缩。

bookmark 放在名为 `state` 的 memory store 里——一个文本文件目录，平台在每次运行时挂载到沙箱 `/mnt/memory/`，并在运行之间保留；agent 用普通文件工具读写，规则写在 `agent.md` 里。

### 7. 处理“读取失败”，别把它当成安静的今天

MCP server 挂了或 token 过期时，运行照样启动，只是没有那个 server 的工具；session log 里有 error，但 agent 那侧什么都看不到，会报“nothing new”。`agent.md` 里三条规则：源失败时 ① 不动该源的 bookmark，② 用其余源照常写简报，③ 在简报末尾用一行点名没读到的东西（"pull requests unavailable this run"）。

### 8. 配置目的地：用 bash + curl 发 Slack

同一个 bot token 既读又发，不做人工审批（内置 bash 工具默认不请求批准），且 `slack.com` 在 environment 的 allowlist 上。

```shell
curl -s https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"channel": "C0123456789", "text": "Daily brief, Tue Sep 15 ..."}'
```

### 9. 确认发帖成功后才记账（幂等三规则）

先查当天标题是否已在该 channel 的近期消息里，已有就不发；只有在 Slack 返回 `"ok": true` 且有 message `ts` 时才算发出；确认之后才更新 ledger 和 bookmark；结果不明确就把这次运行标成 `maybe posted`，其他什么都不改。run record 存在 memory store 的 `runs/<date>.md`，状态先标 `posting`，再标 `posted`（带 message ID）或 `maybe posted`。

### 10. 写 `agent.md`（agent = 模型 + system prompt + 工具的版本化配置）

frontmatter 示例（注意 GitHub 工具集必须设为不请求批准，因为后台没人批准；GitHub token 只读；web 工具关掉）：

```markdown
---
name: Daily brief
model: claude-sonnet-5-5
mcp_servers:
  - type: url
    name: github
    url: https://api.githubcopilot.com/mcp/
tools:
  - type: agent_toolset_20260401
    configs:
      - name: web_search
        enabled: false
      - name: web_fetch
        enabled: false
  - type: mcp_toolset
    mcp_server_name: github
    default_config:
      permission_policy:
        type: always_allow
---
```

正文是运行步骤（文中说仓库里是八条编号步骤，本文只摘录了两条关键步骤原文）：

第 4 条（压住篇幅，只有值得今天行动的条目才成一行）：

```text
4. Decide. An item earns a line when the reader would act on it today, or it changes a decision they are about to make. When unsure, leave it out. Most days that is a few items, sometimes none. A count ("12 open reviews") is not an item; link the ones that are blocked. An item already in the ledger and still open is carried as one marked line ("still waiting, day 3"), not re-reported; a closed item is dropped without comment. Do not bring back a topic the preferences file has retired.
```

第 5 条（发帖前复核，宁缺勿虚）：

```text
5. Verify. The world moved while you read. For every item you will report, re-check its live source just before posting: resolved since you read it, drop it; still open but changed, fix the line; cannot confirm, drop it and list it in the run record's cuts. One stale "still waiting on you" costs more trust than ten missing items, so never hedge an item's status: assert it or drop it. Every link is copied from the source's own link field (a pull request's html_url, a Slack permalink), never assembled by hand.
```

### 11. 写 `deployment.md`（agent 只是配置，deployment 才让它跑起来）

```markdown
---
name: Daily brief
agent: ./agent.md
environment_id: ./environment.yaml
schedule:
  type: cron
  expression: "32 7 * * 1-5"
  timezone: America/New_York
vault_ids: [vlt_...] # the vault you create under Sources
resources:
  - path: ./memory_store_preferences.yaml
    access: read_only
    instructions: The reader's preferences. Re-read them every run. Never write here.
  - path: ./memory_store_state.yaml
    access: read_write
    instructions: Your state. Bookmarks, ledger, notes, proposals, and run records.

---

Write today's brief.
The reader's time zone is America/New_York. Work out every date in that zone.

Follow your run steps in order. Today's edition is titled "Daily brief, <weekday> <month> <day>".
```

注意：`timezone` 只决定什么时候触发，正文里还要显式告诉 agent 用哪个时区算日期，否则会出现把今天早上叫成“昨天”的 bug。

### 12. 部署 + 不等排期手动测试

```shell
ant apply deployment.md
```

```shell
ant beta:deployments run --deployment-id <id>
```

（ID 取自 `claude-lock.json`。）

### 13. 播种 preferences（`ant apply` 建 store 但不建里面的文件）

首次运行前用仓库脚本写入自己的 `preferences.md`，内容包含：读哪些 channel 和 repo、不要什么、长度上限、目的地、什么时候停。

```shell
scripts/seed-preferences.sh
```

要点：preferences 必须每次运行现读，且 agent 不能写。不要把一份 preferences 副本烤进 prompt，否则改过的规则会继续生效；读不到文件时应当停止并说明，而不是按默认值继续。

### 14. 维护 ledger

`ledger.md` 记录每个已报告条目：报告时间、来源、不变的 ID（Slack 消息 ts 或 PR 编号）、最后已知状态。示例格式：

```text
2026-09-09 slack:C0123456789 1788963600.000100 refund thread: customer waiting on a decision
2026-09-11 github 481 review blocked, day 2 (still waiting)
2026-09-11 slack:C0234567891 1789117333.000300 enterprise escalation: owner named, in progress
```

### 15. 上护栏

- 权限：GitHub token 只读，preferences store 只读，environment 只放 allowlist 主机。Slack 是例外——同一个 token 能发帖，所以只把 bot 拉进它需要读/发的频道。
- 成本：`budget` 就是 spending cap。先设成正常一次运行成本的 3–5 倍，看到真实数字后再收紧。触顶的运行会暂停（stop reason `budget_reached`），不是失败——所以 cap 设太低的表现是“简报突然不响了”。注意 `amount` 是字符串、单位是分：

```yaml
budget:
  type: limit
  max_list_cost:
    amount: "500" # a string, in cents: "500" is $5.00
    currency: USD
```

### 16. 文中总结的六条规则（可作为 checklist）

1. 每个来源从 bookmark 读，不用固定时间窗口。
2. 读取失败要报成“读不到”，绝不报成“今天没事”。
3. 发帖前复核每一条。
4. 只有 Slack 确认才算发出，然后才更新 bookmark 和 ledger。
5. 每次运行都重读 preferences，且放在 agent 改不了的 store 里。
6. 只读的地方给只读权限，并给每次运行设花费上限。

## 对应的研究问题

**1. 能力发现（AI 还能做哪些没想到交给它的工作）**
文章给的用例是“后台定时侦察 + 变化检测 + 主动知会”：读 Slack channel 和 GitHub PR、对比上次运行、只推可行动条目。可以推广到任何有“来源 + 变化 + 收件人”的岗位（值班交接、竞品监控、客户升级跟踪、评审阻塞项跟踪）。边界也在文中写明：条目要能被“读者今天会不会据此行动”过滤，计数类信息（"12 open reviews"）不算条目。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
适合：可按 cron 触发、读多写少、输出是简短文本、不需要人在回路里批准每一步的后台任务；模型配置为 `claude-sonnet-5-5`，工具是 agent toolset + GitHub MCP toolset，MCP 权限设 `always_allow`（因为无人审批）。不适合：需要人工批准才能动作的写操作——文章的做法是把写权限压到最小，而不是加审批环节。

**3. 条件供给（需要给哪些信息、工具、权限和反馈）**
- 信息：来源清单与偏好（`preferences.md`，只读）；agent 自己的状态（bookmark、ledger、run record、对来源行为的笔记，如“只返回最新 50 条”）。
- 工具：bash（curl 发 Slack）、GitHub MCP、可关闭的 web_search/web_fetch、普通文件工具读写 `/mnt/memory/`。
- 权限：vault 存凭据（沙箱内只有占位符），environment allowlist，GitHub token 只读。
- 反馈：ledger + run record 构成跨运行记忆；文章特别指出“没有记忆反馈就不生效，但陈旧记忆会让 agent 把已解决的条目继续报成 waiting，或把仍开着的条目当成已报告而丢掉”。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
完全按这个设计：cron 触发（示例 `"32 7 * * 1-5"`，America/New_York），每次触发起一个全新 session；用 bookmark 承担“状态触发”的连续性；无人在场时自动发帖；通过 `ant beta:deployments run` 可手动触发一次来做测试。

**5. 效果验证**
文章没有给指标，但给了可验证的失败模式，等于给了检查项：漏读被误报成 quiet day、重复发帖、bookmark 与 ledger 与实际发布不一致、时区导致日期错、cap 触顶表现为“突然安静”。这些都能直接做成验收清单。

## 与已有做法的关系

- **Claude Code（清单中状态 adopt）**：强相关。文中把 Claude Code 当作配置入口——先用 `claude update` 更新，再在 Claude Code 里跑 `/claude-api managed-agents-onboard <url>`，由 skill 读文章、生成 `agents/` 目录下的文件并用 `ant apply` 建资源。也就是说这条线索的落地路径本身就经过 Claude Code。
- **Claude Code Mods（study）**：文中未提及，无依据关联。
- **Semble（try）**：文中未提及，无依据关联。

## 证据与局限

原文给出的具体材料：完整目录结构、`ant apply` 系列命令、vault 凭据创建的 SDK 片段、Slack 发帖 curl、`agent.md` 与 `deployment.md` 的 frontmatter、budget 配置、ledger 示例、两条 run step 原文。这些是可照抄的部分。

原文主张但无数据支撑的部分：
- 六条规则本身是作者经验总结，没有给出任何量化结果（漏报率、重复率、成本、节省时间）。
- “One stale "still waiting on you" costs more trust than ten missing items” 是价值判断，不是实测结论。
- “先设成正常成本的 3–5 倍”是经验建议，文章没有给出任何一次运行的实际花费。
- 文中说 `agent.md` 正文有八条编号 run steps，但本文只摘录了第 4、5 条，其余在仓库里，本文读者拿不到全文。

适用条件（照抄前必须确认）：
- 依赖 Claude Managed Agents 且为 beta，依赖 Claude API workspace、`ant` CLI、vault / memory store / deployment 这套 Anthropic 专有概念；示例里的资源 ID 都是占位符（`vlt_...`），需要自己创建。
- 需要自建 Slack app 与 GitHub token。
- 安全前提被文章自己点出：agent 读的是别人写的文本，可被当作指令注入；只读 token、只读 preferences、allowlist 能限制破坏面，但**注入仍能改变简报内容**，也能通过 agent 自己的笔记在运行之间传递。

## 怎么试、怎么验证

### 最小试用方式

1. 只做 1 个来源、1 个目的地、1 个收件人：例如一个 Slack channel → 一个 Slack channel，或一个 GitHub repo → 一个 channel。
2. 用 `/claude-api managed-agents-onboard <文章 URL>` 生成骨架后手工删减到单源单目标，preferences 里只写这个源、长度上限、目的地。
3. 用 `ant beta:deployments run --deployment-id <id>` 手动连跑 3–5 次，不要先等 cron。手动跑还能压缩验证周期。
4. 期间人为制造一次故障（例如临时让 GitHub token 失效），看它是报 “pull requests unavailable this run”，还是报“今天没事”。
5. 用 `budget.max_list_cost` 从 3–5 倍正常成本起，跑完一周看实际数字再收紧。

### 判断有没有改善的指标（都能从 ledger 和 Slack channel 历史里数出来）

- **重复率**：channel 里同一标题/同一条目的重复帖次数，目标 0。
- **一致性**：`ledger.md` 的记录与 channel 实际发布是否一一对应；有没有出现 ledger 记了但实际没发（会导致 bookmark 前移、条目永久丢失）的情况。
- **失败可见性**：制造/观察到的读取失败次数中，被明确标为“读不到”的比例，目标 100%（不允许静默）。
- **陈旧率**：简报里发出后被发现其实已解决的条目数（作者主张一条陈旧信息代价高于十条漏报，所以这个指标权重最高）。
- **日期正确性**：简报标题里的日期是否与收件人时区一致，目标 0 次错误。
- **成本**：每次运行实际花费相对 cap 的占比，稳定在 cap 的 1/5–1/3 之间说明 cap 既没白设也没误触发“突然安静”。
- **信噪比**：让收件人给每条 brief 行打“今天会不会据此行动”，不可行动行占比逐周下降即视为改善。

连续跑满一周后，若重复率为 0、没有静默失败、ledger 与 channel 一致、成本稳定，再考虑加第二个来源或第二个目的地。
