# cloudflare/cloudflare-os

- 结论：**值得一试**。先在本地跑 `pnpm run-local` 体验，重点把 Gatekeeper 的「按任务引入资源 + 有副作用动作延后批量审批」这套权限流程抄到自己的 agent 工作里，不要照搬整套平台；理由是它仍是 early access、自部署文档未完成，但权限与审批的具体做法可立即小范围验证。
- 原文：https://github.com/cloudflare/cloudflare-os
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-03T17:00:38.300Z

## 是什么

Cloudflare OS 是 Cloudflare 内部孵化、现已开源的「公司级 AI 生产力操作系统」（README 称从工程到销售的大量员工每天使用）。它由三部分组成：

1. 预载公司运作知识的 agent 对话界面，可直接派任务；
2. 沙箱化的应用开发能力，agent 可为你现场生成小型个人应用（称为 Gadget），并安全分享；
3. 一套叫 Gatekeepers 的安全框架，给 agent 和应用加护栏，让非技术用户也能放心乱试。

技术上是 Cloudflare Workers 上的应用（大量使用 Durable Objects、Dynamic Workers、Facets），每个工作区是一个 Durable Object，每个 Gadget 跑在 Dynamic Worker Facet 里，Gatekeeper 也以 facet 形式装进工作区。README 明确说它也能跑在开源的 `workerd` 上、不必绑定 Cloudflare 云。

两个核心概念：

- **Gadget**：每个用户跑自己的一份软件副本，而不是连到中心化的 SaaS。所以既能改代码（让 agent 加功能），又因为沙箱隔离而安全。
- **Gatekeeper**：像「增强版 MCP server」。接入外部服务时创建，负责对该服务提供干净 API、处理 OAuth 授权、把访问范围收窄到用户指定的那一个资源、记录每一个动作、并对有副作用的动作提供人工批准。

## 具体做法（编号步骤）

前提：本地体验需安装 [pnpm](https://pnpm.io/)；部署到云上需自己的 Cloudflare 账号。原文未给出 Node 版本要求。

1. **本地速览**（不用于生产，数据存在 `.wrangler` 子目录）：

   ```
   pnpm run-local
   ```

   然后访问 http://localhost:8787 。

2. **或部署到自己的 Cloudflare 账号**：走 https://os.cloudflare.app/deploy ；若要带自己的 gatekeeper 或改代码，用部署模板仓库 https://github.com/cloudflare/cloudflare-os-starter 。

3. **用官方给的提示词验证能力边界**（原文原样给出）：

   ```
   Make slides for my upcoming meeting with a customer.
   ```
   （会使用内置 slides blueprint）

   ```
   Make a collaborative whiteboard app.
   ```
   （从零创建新应用）

   ```
   Make a tic tac toe game.
   I'll be X and you be O. I've made my first move. Your turn.
   ```

   ```
   Make an issue dashboard for this GitHub repo.
   ```
   （需附加一个 repo，且需先配置 GitHub 集成）

   ```
   Fix the typos in this Google Doc.
   ```
   （需附加一个 doc，且需先配置 Google 集成）

4. **配置外部服务**：多数 Gatekeeper 需要各自的服务配置，包括自行申请该服务的 OAuth client 凭据。原文提醒服务商通常不为非开发者简化这件事。配置说明在各 gatekeeper 包内，原文列出这些路径：

   ```
   packages/gatekeeper-github/README.md
   packages/gatekeeper-google/README.md
   packages/gatekeeper-cloudflare/README.md
   packages/gatekeeper-supabase/README.md
   packages/gatekeeper-notion/README.md
   packages/gatekeeper-confluence/README.md
   packages/gatekeeper-email/README.md
   packages/gatekeeper-homeassistant/README.md
   packages/gatekeeper-slack/README.md
   packages/gatekeeper-spotify/README.md
   packages/gatekeeper-zoominfo/README.md
   ```

   注意：本文只给了链接，**没有给出任何一条 gatekeeper 的具体 OAuth 配置步骤**，要照做必须打开上面对应文件。

5. **开发模式**（两个终端）：

   ```
   pnpm dev-server
   pnpm dev-client
   ```

   访问 http://localhost:3000 。

6. **自建服务器部署**：原文标注 `COMING SOON`。目前需要自己读 workerd 配置文档（https://github.com/cloudflare/workerd/blob/main/src/workerd/server/workerd.capnp ）或让 agent 去读，暂无成文流程。

7. **权限实践（最可迁移的一步）**：不要像多数 agent 框架那样预先挂上 MCP server、让所有服务在整个会话里都「在场」。改成：每个 agent 和 Gadget 默认零权限，必须按当次任务把具体资源「介绍」给它（粘贴链接或点 add resource 选择），agent 也可以主动请求引入某资源，由你批或拒。Gatekeeper 侧负责：包装原生 API、处理 OAuth、把访问限定到用户指定的那一个资源、记录全部动作、对有副作用的动作提供人工批准。

8. **异步审批的具体做法（原文称这是对现状的改进）**：agent 触发需批准的动作时，Gatekeeper 在本地**模拟**该动作结果，告诉 agent 已完成、读回时也给模拟结果，于是 agent 可以继续排队后续动作；等它做完，用户再一次性批量批准或逐条批准，不必盯着屏幕同步点确认。README 认为这优于两种常见做法：卡在第一步等人点确认，或者干脆开 `--dangerously-skip-permissions` 自动放行。

## 对应的研究问题

**1. 能力发现**：原文给出的可直接交给 AI 的任务样例包括——为即将到来的客户会议生成 slides、从零生成协作白板应用、玩井字棋并轮流走子、为某个 GitHub repo 生成 issue 看板、批改 Google Doc 里的错别字。此外还有元能力：agent 现场给 Gadget 加它缺的功能。

**2. 任务匹配**：Cloudflare OS 的编码 agent 本身是通用多用途 agent（Code Mode：写代码片段并立即执行），可以不写代码直接让它干活；可用多家主流模型与自托管模型，且可随时切换。每个 Gadget 的客户端/服务端必须通过 Cap'n Web RPC 通信，因此每个应用天生带一个 agent 友好 API——你让 AI 建完应用后，还能让 AI 在应用内部与你协作，不需要自己写 MCP server 或自定义 agent loop。原文主张：同样的底层模型，在它这种紧集成平台上，编码 agent 往往更快更好、token 更少（无数据支撑）。

**3. 条件供给**：需要 pnpm；云上部署需 Cloudflare 账号；接入外部服务需逐个申请 OAuth client 凭据，并读对应 gatekeeper 包的配置说明。权限供给方式是可迁移的重点：默认不给，按任务引入具体资源，agent 可申请、人可批可拒；Gatekeeper 负责把访问收窄到指定资源并记录所有动作。

**4. 主动推进**：原文**没有**给出由时间、事件或状态触发并持续执行任务的机制。唯一相关的是审批异步化——agent 不必停下等人，可继续推进并把需批准的动作排队（读到的是模拟结果），人稍后批量处理。这是「不中断」，不是「自动触发」。

**5. 效果验证**：原文提供的是可审查性而非效果指标：Gatekeeper 记录 Gadget/agent 的每一个动作供你复查，有副作用的动作进入待批准队列供人逐条或批量裁决。没有任何任务完成质量、耗时、成本的对照数据。仓库指标 10473 stars（当日 +84）只说明热度。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

**原文给出的证据**：项目已开源；README 自述内部大规模使用（工程到销售）；当前是 v2，基于 v1 经验重写；2026 年 8 月版本「很有能力但仍有不少毛边」，定位为 early access；给出本地运行命令、部署入口、开发命令、五个可直接粘贴的提示词、11 个 gatekeeper 包的路径清单；给出 OS 概念映射表（kernel=`packages/workshop-backend`、device drivers=`packages/gatekeeper-*`、shell=`packages/workshop-frontend`、processes=gadgets、executables=blueprints、ACLs=shared permissions）。

**只是作者主张**：同等模型下该平台编码 agent 更快更好更省 token；沙箱让「slide 应用有安全漏洞泄露你的 slides 给攻击者」不可能发生；Blueprint 模式代表云软件传统作法的转变；传统操作系统「应当」对 AI agent 特殊对待。这些都无数据或第三方验证。

**适用条件与限制**：产品处于 heavy development，自建服务器部署文档标注 COMING SOON；本地 `pnpm run-local` 明确不适用于生产；具体 OAuth 配置步骤不在本文内（只有链接），且原文承认服务商有意不简化 OAuth 申请；仓库不接受外部大改动贡献，超过十几行的 PR 会被关闭（只收可轻易验证的小修复），所以不要指望改造上游；Gatekeeper 服务独立部署「细节尚未确定」，目前只能与 OS 实例一起部署。

## 怎么试、怎么验证

**最小试用**：装好 pnpm → `pnpm run-local` → 打开 http://localhost:8787 → 依次跑「做 slides」和「建协作白板应用」两条提示词 → 再配置一个真实资源（GitHub repo 或 Google Doc 各选一个），走完「引入资源 → agent 请求权限 → 审批队列 → 批量批准」的完整链路。整个过程控制在半天内。

**判断是否改善的指标**：

1. 从下提示词到拿到可用产出，需要你中途介入几次；接入真实资源后是否仍需同步守着点确认。
2. 审批能否真的延后批量完成：你离开一段时间后回来，agent 是否已经基于模拟结果继续推进了后续步骤，而不是卡在第一步。
3. Gatekeeper 日志能否让你复盘 agent 对外的每一个动作、以及它被限定在了哪个具体资源上（这正是「最小权限 + 可审计」是否落地的检验）。
4. 同一任务换通用编码 agent 跑一次，对比 token 消耗、失败次数与返工量——原文声称更优，需自行验证。

**不建议现在做**：把整套 Cloudflare OS 当作生产平台上线（early access、自部署文档未完成、无 SLA）。可直接拿走的是第 7、8 步的权限与审批模式，把它移植进你现有的 agent 工作流。
