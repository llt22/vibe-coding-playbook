# matank001/clodfarm

- 结论：**值得一试**。可以小范围试：clodfarm 给出了一套可照做的 Claude Code 多子代理编排方案——子代理各占一个 git worktree/分支、测试通过才合入 main、按账户真实 5 小时与周用量节流并留 20% 余量；先用单机 + 小仓库 + 已有测试命令验证 1–2 个编码任务再决定是否铺开。
- 原文：https://github.com/matank001/clodfarm
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T05:25:42.180Z

## 是什么

clodfarm 是一个跑在单个容器里的 Claude Code 智能体集群（"农场"）：多个 Claude 账户/多台机器组成一个 farm，共享一个 git 仓库和一个状态存储（单机用 SQLite 文件，多机用 DynamoDB 表）。它把大任务拆成子代理，每个子代理是一个无头 `claude -p`，跑在自己的 git worktree/分支上；子代理完成后分支 rebase 到 `main`，只有 `FARM_VERIFY_CMD`（如 `pytest -q`）通过才真正合入，否则把失败输出回注给该子代理续跑。每个账户的并发由 "budget governor" 按该账户真实的 5 小时/周用量节流。

它的定位是 Claude Code 的运维层：README 明确对比 `while true; claude -p` 循环的缺陷（不记上下文、不能拆活、手机够不着、烧光配额）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **准备前提**：一台装了 Docker 的机器（Linux 服务器或本地均可）；一个 Claude 订阅账号（或 API key）；一个你愿意让它改的 git 仓库（建议先小仓库）。

2. **一行安装并启动**（默认单容器、无数据库、无配置）：

```bash
curl -fsSL https://raw.githubusercontent.com/matank001/clodfarm/main/scripts/install.sh | sh
```

启动后打开登录流程：出现一个 URL，在任意设备上批准后把 code 粘回。UI 在 `http://localhost:8080`。

3. **（替代方式）用裸 Docker 启动**：

```bash
docker run -d --name clodfarm --restart unless-stopped \
  -v clodfarm_claude-home:/home/farm/.claude -v clodfarm_workspace:/workspace \
  ghcr.io/matank001/clodfarm
docker exec -it clodfarm clodfarm login
```

或 clone 仓库后 `docker compose up -d`（`.env` 可选，从 `.env.example` 复制）。状态存在 workspace 卷里的 SQLite 文件。

4. **登录 Claude 账号**（README 给了四种，按场景选）：
   - A. `clodfarm login`：服务器默认方式，URL + 粘 code；
   - B. `claude setup-token` 得到 token，在 `.env` 设 `CLAUDE_CODE_OAUTH_TOKEN=...`（适合 headless worker / CI）；
   - C. 挂载已有的 Linux `~/.claude`（macOS 存在 Keychain，不能用 C）；
   - D. `ANTHROPIC_API_KEY` + `FARM_DAILY_BUDGET_USD`（团队、按 token 付费）。
   UI 里也可以点蛋（egg），打开 Claude 登录链接把 code 粘回。

5. **把它接到真实仓库并设验证闸门**（这一步是整套流程的关键，不设就等于没有质量门）：

> Point it at a real repo with `FARM_REPO_URL` (plus a deploy key) and set `FARM_VERIFY_CMD="pytest -q"`. The farm clones the repo, and every sub-agent's work lands on `main` only when your tests pass.

6. **派任务**（命令行，与 agent 内部用的是同一个命令）：

```bash
docker exec clodfarm clodfarm spawn "Add CSV export" --prompt "Add CSV export to the report page, with tests."
docker exec clodfarm clodfarm status
```

`--on NAME` 可把子代理钉在指定 Claude 的账户上；不指定时由 governor 决定谁能跑。

7. **从手机下指令**：Claude app → Code → `[clodfarm] clodfarm`，直接说 "add CSV export to the report page"、"have gil's Claude review it"、"every morning at 9, triage new issues"。

8. **从笔记本上的 Claude Code 接进来**（远程 MCP，OAuth 2.1 + PKCE）：

```bash
claude mcp add --transport http --scope user farm http://localhost:8080/mcp   # or https://<your farm>/mcp
```

然后在 Claude Code 里跑 `/mcp` 登录，就能问 "what's the farm doing?"、"have the farm add CSV export, on gil"。断开用 `clodfarm disconnect`。

9. **设定时任务**（cron / 固定间隔 / 一次性；每个 box 都会检查，触发时原子领取，只跑一次）：

```bash
clodfarm schedule add TITLE (--cron ... [--tz ...] | --every 2h | --at ...)   # 还有 list / remove ID
```

默认时区由 `FARM_TZ` 决定（默认 UTC）。

10. **配置节流与并发**（全部是环境变量，`.env.example` 有全量说明；关键几个）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `FARM_MAX_WORKERS` | `3` | 单个 Claude 同时能跑的子代理数上限（governor 另有决定权） |
| `FARM_WEEKLY_TARGET` | `0.80` | 到达周窗口 80% 就停 |
| `FARM_FIVE_HOUR_CEILING` | `0.85` | 5 小时窗口最多用到 85% |
| `FARM_USAGE_REFRESH` | `300` | 空闲 Claude 每隔这么多秒重新测一次用量（0 = 只按运行中测） |
| `FARM_DAILY_BUDGET_USD` | `0` | API key 模式下的每日上限（0 = 不限） |
| `FARM_MODEL` / `FARM_EFFORT` | `opus` / 默认 | 所有 agent 的模型与 effort |
| `FARM_CLAUDE_UPDATE` | `3600` | 每隔这么久把 Claude Code 升到最新版（0 = 从不） |
| `FARM_REPO_URL` / `FARM_VERIFY_CMD` | 空 | 工作仓库 / 落地前必须通过的检查 |

11. **让多台机器共用一个 farm**（多 seat、各自按自己的额度节流）：需要真实 DynamoDB 表 + 所有 box 都能 push 的共享仓库（`--workspace-repo` / `FARM_REPO_URL`）：

```bash
# box 1 建 farm（表名 clodfarm）
deploy/aws/deploy.sh up --workspace-repo git@github.com:you/repo.git && deploy/aws/deploy.sh login

# 同一账号再加机器：更多算力，不额外用额度
STACK=farm-2 deploy/aws/deploy.sh up --table clodfarm --workspace-repo git@github.com:you/repo.git
STACK=farm-2 deploy/aws/deploy.sh login

# 同事的机器，登录他自己的账号：多一个 seat，自己一份预算
STACK=farm-gil deploy/aws/deploy.sh up --table clodfarm --workspace-repo git@github.com:you/repo.git
STACK=farm-gil deploy/aws/deploy.sh login

clodfarm budget   # 每个 seat：用量条、它的机器、现在允许跑什么
```

任意 Docker 主机加入已有 farm 的做法：`.env` 里设 `FARM_STORE=dynamodb`、`FARM_TABLE=<table>`、`AWS_REGION=<region>`、`FARM_REPO_URL=<shared repo>`，给该 box 表权限的 AWS 凭证，然后 `docker compose up -d && docker exec -it clodfarm clodfarm login`。

12. **（可选）让 agent 自己在 AWS 上建应用并上线**：默认不给任何 AWS 权限，需要时显式加 apps role：

```bash
deploy/aws/deploy.sh apps-role --email you@example.com --budget 50              # 与 farm 同一 AWS 账号
APPS_PROFILE=my-apps-account deploy/aws/deploy.sh apps-role --email you@example.com \
  --budget 50 --domain apps.example.com --regions us-east-1,eu-central-1         # 推荐：独立账号
deploy/aws/deploy.sh apps-down                                                  # 关掉
```

围栏：只允许 serverless（Lambda/API Gateway/DynamoDB/S3/CloudFront 等，无 EC2/RDS/容器）；所有角色必须命名 `farm-app-*` 并带 permissions boundary；月度 AWS Budget 在 50%/80% 告警、100% 时 AWS 自动给该角色挂 deny-all（已运行的应用继续服务）；禁 IAM 用户/access key、禁 SES、禁买域名等。README 推荐用独立 AWS 账号（`APPS_PROFILE`）+ SCP。

13. **观测与运维**：`clodfarm status`（有哪些 Claude、预算、在跑的子代理）、`clodfarm agents`（每个 Claude 的用量百分比）、`clodfarm budget [--refresh]`、`clodfarm events [-f]`（子代理、合并、检查、消息、暂停、限流的日志）、`clodfarm sessions`/`session ID`、`clodfarm pause [reason]`/`resume`、`clodfarm login / whoami / doctor`；所有命令都支持 `--json`。Dashboard：

```bash
clodfarm dashboard push NAME --file spec.json
clodfarm dashboard push NAME --run CMD --every 1h
clodfarm metric NAME KEY VALUE
```

14. **消息与协作**：`clodfarm msg <name 或 sub-agent id> "..."`（`--urgent` 打断正在跑的子代理，`--wake` 唤醒闲置会话），`clodfarm inbox`；同一台机器上 agent 之间用 Claude Code 自带的 `SendMessage`。

## 对应的研究问题

**1. 能力发现（AI 能做但没想到交给它的活）**
- 把一个大开发任务拆成多个子代理并行做，每个子代理一个 git worktree/分支（README 的 "Sub-agents you can see"）。
- 从手机上的 Claude app 直接派活和追问（Remote Control）。
- Claude 之间互发消息、把活转给还有余额的账户（"Claudes that work together"）。
- Agent 自己维护展示业务指标的 dashboard（sign-ups、revenue、ad spend、cost per customer）。
- 在农场自带的、已登录的浏览器里以你的身份操作站点（LinkedIn、后台管理面板）。
- 在 Slack 里 DM 或 @ 它，由子代理在 thread 里回答。
- 通过 Blender MCP 建场景/游戏资产、做动画、渲染、导出。
- 周期性地做三件事（例："每个工作日 9 点 triage 新 issue"）。

**2. 任务匹配（什么活适合什么模型/工具/协作方式）**
- 可拆分、且能被测试验证的编码任务 → 多子代理并行（每支一个分支），合入门槛是测试。
- 规格明确的任务 → 可转给跑免费/本地模型（OpenRouter、Ollama）的 bot，不占用 Claude 额度（docs/bots.md）。
- 周期、可预定义的任务 → 用 `clodfarm schedule`（cron / 每 N 分钟 / 一次性），而不是常驻会话。
- 账户额度紧张时 → 按 "谁有余量谁跑" 路由，或 `--on <name>` 指定账户。
- 需要外部系统的活 → 用一次性配置的连接器（Stripe、Google Ads、Blender MCP、AWS apps role）。
- 需要目标驱动的长期推进 → 打开带 goal 的 planner，它按周期跑、把活委派给工具和预算合适的 Claude，并自己造需要的工具。

**3. 条件供给（信息、工具、权限、反馈）**
- 身份：Claude 账号登录（四种方式之一）、`clodfarm login`。
- 工作对象：`FARM_REPO_URL` + deploy key，多机时共享可推的仓库。
- 质量门：`FARM_VERIFY_CMD="pytest -q"` —— 这条命令决定什么能落到 main。
- 外部系统：Stripe / Google Ads / Blender 连接器各配一次；AWS 需要 apps role + 预算 + 权限边界（README 建议独立账号 + SCP）。
- 浏览器态：在农场浏览器里登录一次，之后所有 Claude 以你的身份工作。
- 反馈闭环：用量从 Claude Code 自己的 `rate_limit_event`、登录时的 one-word probe、空闲后按 `FARM_USAGE_REFRESH` 重新测量；子代理失败时把它 resume 起来并回注失败输出；`clodfarm events` 记录子代理、合并、检查、消息、暂停、限流。

**4. 主动推进（由时间、事件或状态触发并持续）**
- 时间触发：`schedule add --cron / --every / --at`，每个 box 都检查、触发时原子领取保证只跑一次。
- 目标驱动：planner 按周期持续工作。
- 状态触发：governor 按每个 seat 的周窗口和 5 小时窗口决定当前允许多少子代理，到达阈值就暂停，窗口重置后自动恢复；周节奏用 "target × 本周已过比例 + 5%" 的 pace line 平摊。
- 事件触发：失败和用量上限推到 ntfy / Slack / Discord；idle 会话可被消息唤醒（`--wake`）。
- 鲁棒性：崩溃、重启、超时不丢工作，Claude 回来后从断点继续；`clodfarm upgrade` 替换代码和 UI 时正在跑的 agent 和手机会话不中断。

**5. 效果验证**
- 硬门：子代理分支 rebase 到 main、跑 `FARM_VERIFY_CMD`，只有通过才 `main` 前移；不通过就把失败输出交给该子代理续跑。README 的对比表把 "Merge only when tests pass" 列为一行。
- 指标可视化：`clodfarm dashboard push` / `metric`，dashboard 在 `/dashboards/<name>`；业务侧给了 sign-ups、revenue、ad spend、cost per customer 的例子。
- 过程审计：`clodfarm events`、`clodfarm sessions/session ID`（整个对话）。
- 资源侧验证：`clodfarm agents`（每个 Claude 的用量百分比，类似 Claude 的用量页）、`clodfarm budget`（每个 seat 现在允许跑什么）。

## 与已有做法的关系

- 清单中目前只有 **Claude Code（tool，status: adopt）**。clodfarm 不是替代品，而是 Claude Code 之上的编排/运维层：它调用无头 `claude -p`、用 Claude Code 自带的 messaging（`SendMessage`）和 `rate_limit_event`，并让笔记本上的 Claude Code 通过 MCP 接入同一个 farm。手册里若已有 Claude Code 条目，clodfarm 可作为 "多代理 + 配额治理 + 无人值守" 的进阶做法接在其后。
- README 自己的对比表提到 ralph、continuous-claude 两个同类项目（清单中没有相关条目）。它对 `while true; claude -p` 循环的批评可以直接用作手册里的 "反面基线"。

## 证据与局限

**原文给出的可核查信息**
- 安装/运行/登录/派活/定时/多机/AWS 部署的具体命令与脚本路径（`scripts/install.sh`、`deploy/aws/deploy.sh up|login|status|down|apps-role|apps-down`、`deploy/aws/apps-role.yaml`）。
- 完整的环境变量表与默认值（`FARM_MAX_WORKERS=3`、`FARM_WEEKLY_TARGET=0.80`、`FARM_FIVE_HOUR_CEILING=0.85`、`FARM_USAGE_REFRESH=300`、`FARM_CLAUDE_UPDATE=3600` 等）。
- Budget governor 的规则被写成了明确算法：周窗口在 `FARM_WEEKLY_TARGET`(80%) 停；之前用 pace line（`target × fraction of the week elapsed + 5%`）平摊，快于该线就减速或停、慢于该线就全并发；5 小时窗口不超过 `FARM_FIVE_HOUR_CEILING`(85%)；被拒或已付费 overage 的 seat 停到 Claude 报告的重置时间；API key 模式按 `FARM_DAILY_BUDGET_USD` 日限。README 称它是纯函数且有单元测试（`clodfarm/governor.py`、`docs/budget.md`）。
- AWS apps role 的围栏条款具体：只允许 serverless 服务清单；角色必须 `farm-app-*` + permissions boundary；月度 Budget 50%/80% 告警、100% 自动 deny-all；硬禁 IAM 用户/access key、SES、买域名、Marketplace/Savings Plans、改自身 stack。
- 仓库元信息：MIT、Python 3.10+、Docker、CI badge、99 stars。

**只是作者主张、原文没有数据支撑的部分**
- "works on it day and night: it builds the app, ships it, charges for it and brings people to it"、"stays in budget"、"ships tested code" 等效果描述只有配图说明，没有实测数据、没有客户案例、没有第三方评测。
- "A hundred Claudes and a crowd watching stay quick"、"crashes, restarts and timeouts don't lose work"、"upgrades that stop nothing" 都是声明，没有基准或故障注入结果。
- 对比表（vs `while` loop、ralph、continuous-claude）是作者自评，未给出评测方法。

**适用条件与风险**
- 需要 Claude 订阅或 API key，且农场会用掉整个账户的额度（governor 覆盖包括你自己聊天在内的全账户用量），意味着它可能挤占你本人的 Claude 使用。
- 多机模式需要真实 DynamoDB 和所有 box 都能 push 的共享仓库；AWS 部署需要 AWS CLI v2 + Session Manager 插件。
- macOS 的 `~/.claude` 存在 Keychain，登录方式 C 不可用，只能用 A 或 B。
- AWS apps role 涉及让 agent 在你账号里创建资源，虽然有多层围栏，README 自己也建议放到独立账号 + SCP。
- UI 默认没有 admin 密码，能访问 `http://localhost:8080` 的人都能看；第一个 Claude 的人是 manager，可以移交并把农场设为私有。
- **原文被抓取截断**：文本在配置表 `FARM_VERIFY_CMD` 一行的说明中途结束，后面的环境变量、FAQ、related projects 等内容没有看到，本报告只覆盖可见部分。所有内容来自仓库 README 单一来源，未做独立验证（source_note 也写明 "依据仓库 README"）。

## 怎么试、怎么验证

**最小试用（建议半天以内）**
1. 在一台有 Docker 的机器上跑一行安装（或裸 Docker 启动），用 `clodfarm login` 登录一个你愿意让它消耗额度的 Claude 账号。
2. 指一个**小仓库**：设 `FARM_REPO_URL` + deploy key，并把 `FARM_VERIFY_CMD` 设成该仓库本来就有的测试命令（如 `pytest -q`）。
3. 保守起步：`FARM_MAX_WORKERS=1`，保留默认 `FARM_WEEKLY_TARGET=0.80`、`FARM_FIVE_HOUR_CEILING=0.85`。
4. 只派 1–2 个**规格明确、且能被测试判真伪**的任务，例如 README 给的例子：

```bash
docker exec clodfarm clodfarm spawn "Add CSV export" --prompt "Add CSV export to the report page, with tests."
```

5. 全程用 `clodfarm events -f` 和 `clodfarm status` 观察，用 `clodfarm budget` 看用量曲线。

**判断有没有改善的指标**

| 指标 | 怎么看 | 期望 |
|---|---|---|
| 未经测试的代码合入 main 的次数 | `clodfarm events` 里的 merge / check 记录 | 应为 0（这是最硬的指标） |
| 测试失败后是否自动续跑并最终通过 | events + `clodfarm subagents --all`、`result ID --wait` | 失败能回注给原会话继续修 |
| 端到端时长（派活 → 合入） | 与你自己手动做同一任务对比 | 不慢于手动，或人工时间明显下降 |
| 人工介入次数 | 你自己被打断/需要亲自推进的次数 | 下降 |
| 账户用量是否守住 | `clodfarm agents`、`clodfarm budget` | 周用量停在 80% 附近，不产生 overage；同时记录你自己的 Claude 是否被挤 |
| 崩溃/重启后是否续跑 | 手动 `docker restart clodfarm` 后看 `clodfarm status` | 原任务恢复而不是从头再来 |
| 定时任务是否只跑一次 | 设一个 `--every 10m` 的轻任务，数 events 里的触发次数 | 每次触发只有一条 |

**放大或退出的判据**
- 若上面 7 项都符合，再逐步放大：`FARM_MAX_WORKERS` 提到 2–3、加第二个 seat（同事账号或第二台机器）、再考虑 apps role / Stripe / Google Ads 等连接器。
- 若出现未经测试合入、失败后不续跑、或明显挤占你本人用量，则退回单 worker、收紧 `FARM_WEEKLY_TARGET`，或只把它的 "子代理各占一分支 + 测试通过才合入" 这个模式搬到你自己的流程里，而不部署整套农场。
