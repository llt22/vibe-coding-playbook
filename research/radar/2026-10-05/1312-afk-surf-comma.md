# AFK-surf/Comma

- 结论：**值得一试**。先用 `make dev`（内置确定性 mock 模型、无需 API key）在本机跑通，再按根目录 compose.yaml 自建单机实例，把一个真实的长周期任务（如仓库/收件箱监控）交给它的 Task+Loop 机制跑一两周；README 给出了可直接照做的部署步骤、完整环境变量表和权限开关，适合作为“常驻代理 + 工具权限供给 + 触发式推进”的试点对象，但它除运行时形式化验证外没有任何任务成功率或效果数据，且栈很重，不宜直接采用。
- 原文：https://github.com/AFK-surf/Comma
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-05T04:46:04.612Z

## 是什么

Comma 是 AFK Inc. 开源的“sessionless（无会话）”个人代理，可托管使用也可从仓库自建实例（AGPL-3.0-only）。

它声称的核心机制：

- **会话只是界面，Task 才是持久执行状态**：记忆、上下文和进行中的 Task 跨设备、跨对话、跨界面延续，新开对话不会丢未完成工作。
- **Relentless**：常开、7×24；Task 被自动转成独立的 agent loop，做 plan → execute → review → verify，直到目标完成，并自行判断 Task 何时算完成。
- **Swarm Intelligence**：把工作分派给不同强项的 agent 和模型；用更小的独立上下文减少上下文压缩、漂移和污染；“你管目标，不管 swarm”。
- **兼容现有 agent**：Codex、Claude Code 等可作为“应用”被调用，也可注册为 Worker 和 Sub-agent。
- **云端干活、设备管身份**：长任务跑在它自己的环境，敏感身份、会话、支付和私密数据留在你自己的设备；需要时把 Task 交回你的电脑或手机继续。

README 列出的具体功能：请求转 Task；需要你决策时 Task 停在 Needs Review；任务看板（Backlog / In progress / Needs Review / Done）；Comma 主动在聊天里说下一步，Routines 可按设定时间给你简报；**Loops** —— agent 自己写的小程序，盯收件箱、仓库或信息流，只在有事时才唤醒 agent，安静的一小时不消耗大模型 token；Salix 连接 Mac，可读文件，开启 Allow operations 后可改文件、跑命令、把活交给 Codex/Claude Code/Pi/Kimi；Mac app 可录制通话、存到 Drive 并启动一个总结 Task；自带模型（BYO API key，或 ChatGPT/Claude 套餐）。

工程实现：运行时主要为 Elixir/OTP，关键系统组件用 Lean，核心分布式协议用 TLA+ 模型检查；每个 agent 是 Erlang VM 上一个独立进程，失败即重启、其余 agent 继续跑；Salix 已接受的消息在重启后仍存活；被中断的写操作不会自动重跑。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 自建单机实例（Docker Compose）

前提：Docker Engine + Compose v2.24 或更高；足够磁盘容纳构建层（首次构建会下载 Lean、Elixir、Go、Node 等公共工具链）；一个可用的模型服务商账号（默认栈**不含** mock 模型，不配就没有真实模型调用）。不需要 Comma 账号，也不需要私有仓库 token。

1. 复制示例配置：

   ```sh
   cp .env.example .env
   ```

2. 把 `COMMA_OWNER_EMAIL` 设成你自己的邮箱——这个账号拿到 Admin 权限。
3. 在 `.env` 里设置模型服务商；或者跳过这步，登录后在 Settings 里配置私有模型。
4. 构建并启动整个栈：

   ```sh
   docker compose up -d --build
   ```

5. 打开 <http://localhost:8080>，用你的邮箱请求登录码。
6. 在本地收件箱 <http://localhost:8025> 读取登录码。

首次启动会生成持久密钥并初始化空存储；默认所有公开端口只绑定 loopback。

### B. 环境变量配置（`.env`）

| 变量 | 用途 |
|---|---|
| `COMMA_OWNER_EMAIL` | 第一个 owner 账号和 Admin 权限 |
| `COMMA_ALLOW_SIGNUP` | 公开注册，默认关闭 |
| `COMMA_LLM_BASE_URL` | 模型服务商端点 |
| `COMMA_LLM_PROTOCOL` | 服务商协议，如 `chat_completions` |
| `COMMA_LLM_MODEL` | 服务商模型 ID |
| `COMMA_LLM_API_KEY` | 服务商凭据 |
| `COMMA_LLM_CONTEXT_TOKENS` | 模型上下文预算 |
| `COMMA_LLM_MAX_TOKENS` | 输出 token 上限 |
| `COMMA_EXA_API_KEY` | 可选，Exa 的 key，用于网页搜索和读页 |
| `COMMA_SMTP_*` | 登录码邮件服务器 |
| `COMMA_PUBLIC_URL`、`COMMA_API_URL`、`COMMA_ADMIN_URL`、`COMMA_SALIX_URL` | 浏览器 origin |

模型调用走你自己的服务商账号，可能产生服务商费用；自建实例不需要 Stripe 或 Comma credits。

### C. 各界面默认地址

| 界面 | 默认地址 |
|---|---|
| Comma Web | <http://localhost:8080> |
| Comma Admin | <http://localhost:8082> |
| Comma Product API | <http://localhost:8081> |
| Salix dashboard | <http://localhost:4000/dash> |
| Local inbox | <http://localhost:8025> |

### D. 对外暴露（仅在确定要公开时做）

1. 把 Comma 放在你自己的 HTTPS 反向代理后面。
2. Web、Admin、Product API 必须是同一可注册域名下的不同 origin，例如 `app.example.com`、`admin.example.com`、`api.example.com`。
3. 换用真实 SMTP 服务器；本地收件箱只能用于 loopback，因为能读到它的人就能用里面的登录码。

### E. 升级与备份（原文给出的硬性操作要求）

1. 升级前先停栈。
2. 一起备份全部五个 named volume：`config`、`postgres`、`objects`、`clickhouse`、`redis`。其中 `config` 卷保存加密密钥和认证密钥，**不要删除、不要重新生成它的密钥**。
3. `docker compose down` 会保留数据；除非确实要删掉实例，否则不要加 `-v`。
4. 公开部署、升级或恢复前先读 [self-hosting guide](systems/DEPLOYMENT.md#self-hosted-compose)。

### F. 本地开发模式（零成本跑通，不需要 key，适合做最小验证）

1. 装客户端依赖（只需一次），然后启动本地后端和 Web 客户端：

   ```sh
   pnpm install
   make dev
   ```

2. `make dev` 使用确定性 mock 模型，不需要模型 key。
3. 以 `comma-local@example.com` 登录，登录码在 Mailpit <http://127.0.0.1:8025> 读取。
4. Mac app 用 `make dev-electron`。
5. 在仓库根目录跑测试：

   ```sh
   make test-clients
   make test-systems
   make test-policy
   ```

### G. 让 Comma 操作你自己电脑的前提

在设备设置里连接这台电脑；需要改文件、跑命令、把活转交给 Codex / Claude Code / Pi / Kimi 时，必须打开 **Allow operations**。群组云电脑需要 Cloudflare 配置；会议（Meetings）和 Agent VMM host 需要的运行时**不包含在本仓库内**。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 已能做哪些还没想到交给它的工作）**
- 把一次通话录下来、存到 Drive、自动起一个总结 Task（Mac app）。
- 按偏好做购物比价、并在受信任设备上完成结账——原文把它作为“个人上下文对齐”的示例。
- 让 agent 自己写一个 Loop 小程序去盯收件箱/仓库/信息流，只在需要时唤醒主 agent。
- 把“一个快速提问”留在聊天里回答，把“更大的活”自动升级成 Task——一种按规模分流的用法。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 明确主张把工作分派给不同强项的模型/agent（Swarm Intelligence），并用更小的独立上下文抑制上下文压缩与漂移。
- 明确主张把已有 agent（Codex、Claude Code 等）当作应用调用，或注册为 Worker / Sub-agent 由 Comma 编排。
- 长周期工作放云端环境，涉及身份、会话、支付和私密数据的部分留在本机/手机，必要时把 Task 交回设备继续。
- 自带模型：BYO API key，或使用 ChatGPT / Claude 套餐。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 模型侧：`COMMA_LLM_BASE_URL` / `PROTOCOL` / `MODEL` / `API_KEY` / `CONTEXT_TOKENS` / `MAX_TOKENS`；可选 `COMMA_EXA_API_KEY` 用于搜索和读页。
- 邮件侧：真实 SMTP（对外）或本地 Mailpit（本机）。
- 设备侧：连接你的 Mac（Salix）；`Allow operations` 是改文件/跑命令/转交其他 agent 的总开关；设备设置里手动连接电脑。
- 反馈侧：Needs Review 状态用于人工决策；Routines 按设定时间给简报；Comma 在聊天里主动提示下一步。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
- Task 被自动转成独立 agent loop，持续 plan/execute/review/verify，直到目标完成并自判完成。
- Loops 由事件触发：盯收件箱、仓库或 feed，只在有事时唤醒 agent；安静时段不消耗大模型 token——这是原文给出的、对“持续监听但不烧钱”的具体做法。
- Routines 由时间触发：在设定时间给你简报。
- 状态触发：Task 进入 Needs Review 时等待你的决定，其余部分自动推进；也可以配置成只起草不执行。

**5. 效果验证（怎样判断确实改善了结果）**
- 任务层面：看板四态 Backlog / In progress / Needs Review / Done；Comma 自查并决定 Task 是否完成。
- 运行时可靠性（Lean 规范 + TLA+ 模型检查的具体性质）：已接受的工作在失败和重启后不会静默丢失；失败的回复不算已完成工作；有副作用的操作在开始前先记录；被中断的变更操作不会被意外执行两次；过期 worker 不能覆盖更新的 agent 状态；数据只在策略允许的边界间流动。
- **原文明确声明**：形式化验证不证明模型判断或任务成功，它只验证“即使出错，运行时仍按我们设计的规则行事”。这一点必须写进手册，避免把运行时可靠误读成结果可靠。

## 与已有做法的关系

清单中相关条目：**Claude Code**（kind: tool，status: adopt）。

- Comma 不替代 Claude Code，而是把它当作被编排对象：Codex、Claude Code 等可“像应用一样被调用”，也可注册为 Worker / Sub-agent。在 Allow operations 打开后，Comma 可以把活转交给 Codex、Claude Code、Pi 或 Kimi。
- 因此二者是互补关系：Claude Code 是清单里已被采用的执行单元，Comma 提供的是**上层编排 + 持久 Task 状态 + 事件/时间触发 + 权限边界**。手册里应把 Comma 描述为“常驻调度层”，而不是又一个编码 agent。
- 其他清单条目在给定材料中未被提及。

## 证据与局限

**原文给出的可核查内容：**
- 完整的自建步骤、环境变量表、界面端口表、备份清单（五个 named volume，`config` 卷含加密密钥不可重生成）、开发命令 `pnpm install` / `make dev` / `make dev-electron` / `make test-clients` / `make test-systems` / `make test-policy`，以及 mock 模型下的登录方式（`comma-local@example.com` + Mailpit 8025）。
- 运行时属性被 Lean 机器检查、核心分布式协议被 TLA+ 模型检查，并列出了六条被检查的性质（见研究问题 5）。
- 许可证 AGPL-3.0-only，修改后对外提供服务需保留 `/source.tar.gz` 下载；贡献需签 AFK AI, Inc. CLA。
- 仓库指标：星标 172（来自本次线索的 metrics）。

**只是作者主张、无数据支撑的部分：**
- “sessionless / relentless / swarm intelligence” 的效果性表述（减少压缩、漂移、上下文污染）、24/7 持续完成目标、“你管目标不管 swarm”等，均无任何成功率、耗时、成本对比数据。
- 示例视频（购物比价与结账、交付工作与生活）在文本中没有对应指标，无法据此判断效果。
- “Loops 让安静的一小时不消耗大模型 token”是设计声明，原文没有给出 token 消耗对比。

**适用条件与硬性局限：**
- 这是基础设施级工具，不是轻量脚本：单机栈包含 Web、Admin、Server、PostgreSQL、Redis、MinIO、ClickHouse、Mailpit，首次构建要下载多个工具链，磁盘与运维成本不低。
- 默认栈没有 mock 模型，真实模型调用走你自己的服务商账号并产生费用。
- 部分能力依赖本仓库之外的运行时：会议（Meetings）、Agent VMM host 不包含在仓库中；群组云电脑需要 Cloudflare 配置。
- 本地收件箱仅限 loopback 使用，对外必须换真实 SMTP；自建实例的公开部署需先读 DEPLOYMENT.md。
- 本次素材是仓库 README（`source_note` 明确为“依据仓库 README”），未做实际部署验证，也没有第三方评测；除运行时形式化验证外，任务成功率完全未被证明。
- 结论仅基于给出的文本，未参考 README 中链接的 `docs/verification.md`、`tla/`、`systems/DEPLOYMENT.md` 等内容。

## 怎么试、怎么验证

**最小试用（零模型成本，1–2 小时）**

1. 跑 `pnpm install` + `make dev`，以 `comma-local@example.com` 登录（登录码在 <http://127.0.0.1:8025>），确认 Task 看板、Needs Review 流转和聊天界面可用。
2. 在 mock 模型下创建 3 个真实形状的 Task，各覆盖一种典型路径：一个“快速提问”（应留在聊天里）、一个需要人工决策的活（应停在 Needs Review）、一个可自动完成的活（应走到 Done）。
3. 配置一个 Loop 盯一个真实但低风险的源（例如一个测试仓库或一个测试邮箱），确认“安静时段不唤醒 agent”。

**单机实测（1–2 周，需模型 key）**

4. 按 A 节 `cp .env.example .env` + `docker compose up -d --build` 起栈，只绑定 loopback，先不对外。
5. 在设备设置里连接一台 Mac，先**不开** Allow operations，跑只读任务；确认可用后再打开 Allow operations，把 Codex / Claude Code 注册为 Worker 或 Sub-agent，跑一个跨工具的任务。
6. 固定一个长周期目标（如“监控某仓库/收件箱，有事才通知我并起草处理方案”），连续跑一周。

**判断有没有改善的指标（都可由看板和日志直接数出来）**

- 人工轮询次数：接入 Loop 前后，你每天主动去看收件箱/仓库的次数变化。
- 安静时段的大模型 token 消耗（对照原文“安静的一小时不使用大模型 token”的声明，实测是否成立）。
- Task 从 Backlog 到 Done 的过程中，人工介入次数与停留在 Needs Review 的次数；Needs Review 里有多少是真正需要人决策、多少是误判。
- 可靠性：失败/重启后 Task 是否继续、有无静默丢失；被中断的变更操作是否出现重复执行；重启后是否需要人工重放。
- 成本：模型服务商账单与任务产出量的比值。
- 权限边界：开 Allow operations 后，实际发生的文件/命令操作是否都在你预期范围内，有无越界。

**止损条件**：若首周内 Needs Review 误判率高、或出现副作用重复执行/数据越界，则把 Allow operations 关回只读，退回 study 级别使用其设计思路（Loops 触发、Task 作为持久状态、权限与身份分离）而不继续投入部署运维。
