# codician-team/diffinery

- 结论：**值得一试**。建议在一个非关键仓库上小范围试点,重点不是换掉 GitHub,而是复刻它的协作模式:为编码智能体开独立账号、用服务器强制限制权限、人类审批 PR、CI 全绿后自动合并;理由是 README 给出了可直接执行的部署/安装命令和一份明确的权限限制清单,但项目年轻、无托管服务、需自备 Cloudflare 付费账号,不适合直接作为团队唯一基础设施。
- 原文：https://github.com/codician-team/diffinery
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T11:55:46.487Z

## 是什么

Diffinery 是一个开源(Apache-2.0)的自托管 Git 托管与 CI 平台,整体部署在自己的 Cloudflare 账号上(Workers / Durable Objects + SQLite / D1 / R2 / Queues / Workflows / Containers),定位是 GitHub + GitHub Actions 的替代品:GIt over HTTPS、PR 与评审、合并队列、Issues、Releases、容器镜像仓库,并且按原样运行 `.github/workflows/*.yml`(含 marketplace actions)。

对我们研究更重要的是它的 AI 侧设计,README 称之为 "built for AI coding agents":

- **智能体是独立账号**:由个人或组织拥有,有自己的 token,角色不超过其 owner,不能登录 Web UI,每次提交都记录“代表谁”。
- **服务器强制的权限限制**(不只靠提示词):见下表。
- **Agent 任务**:给一个目标,起一个沙箱(仓库已 checkout),跑 Claude Code / Codex / 自定义命令,流出 transcript,推送分支并以目标作为 `intent` 开 PR;支持 plan first(先出计划待批)、best of N(并行多方案)、verify and land(自己修失败检查,人批准后合并)。
- **Agent 代码评审**:每个 PR 由 agent 在只读沙箱里按 base 分支的 `REVIEW.md` 规则审 bug/安全/逻辑问题,贴行内 findings 与建议修复,并上报一个 **Agent review** check(有 blocking finding 则失败);“Fix it” 把 finding 转成 agent 任务,autofix 可推到 PR 分支。
- **Today 页 / Needs you**:登录首页汇总等你处理的 agent PR、被指派的评审、自己卡住的 PR、agent 在做什么、昨天以来合并/发布/失败的统计;agent 通过 MCP 的 `today` 工具读同一视图,也可作为早间邮件推送。
- **Merge on green**:指定必须通过的检查与允许自动落地的 agent,满足规则即自动合并,但 agent 对 workflow 文件的改动仍需人工合并。
- **接入层**:内置 MCP server(52 个工具,已在官方 MCP Registry)、Claude Code 与 Codex 插件、`diffinery` CLI、`gh` 兼容、VS Code/Cursor/Windsurf/JetBrains 扩展。

权限限制清单(原文表格要点):agent 不能推保护分支;agent 的 PR 至少需要一个人批准(agent 的批准不算);除非规则允许,agent 不能合并保护分支;agent 的检查结果不能满足 required checks(不能自己把 CI 标绿);agent 推送的代码所触发的 workflow 只拿到 job token,拿不到 secrets;agent 无论角色如何都不能改 secrets / environments / 分支保护,push protection 也不可绕过。

## 具体做法(编号步骤;可直接复制的命令、配置、提示词原样放进代码块;写清每步的前提)

### A. 部署一套自己的实例(生产路径)

**前提**:Cloudflare 账号在 **Workers Paid** 计划且启用 R2(Containers、Durable Objects with SQLite、Workflows、Queues 都需要付费计划);该账号下有一个域名(实例挂在根域名,如 `git.example.com`);一个具备文档所列权限的 Cloudflare API token;部署机上有 Node.js 22、pnpm 10、Docker、`jq`、`curl`、`openssl`。

1. 克隆并设置环境变量(token 不要提交):

```sh
git clone https://diffinery.com/codician/diffinery.git   # or the GitHub mirror
cd diffinery

export CLOUDFLARE_API_TOKEN=...            # never commit it
export CLOUDFLARE_ACCOUNT_ID=...
export DIFFINERY_DOMAIN=git.example.com    # your hostname
export BOOTSTRAP_ADMINS=you@example.com    # who becomes site administrator on first sign-in
```

2. 先空跑校验工具、token 与配置(不改动任何资源):

```sh
scripts/setup.sh --dry-run                 # checks tools, token and config without changing anything
```

3. 正式执行(创建缺失的 D1 数据库、R2 桶与生命周期规则、队列、Turnstile、用于邮箱找回的 Cloudflare Access 应用,执行迁移,部署 Worker 与 runner 镜像,生成 Worker 密钥,并检查站点可访问)。原文称每一步可重复执行,同一命令也用于升级:

```sh
scripts/setup.sh                           # creates the Cloudflare resources and deploys
```

4. 成为首个管理员:打开 `https://<your host>/auth/access`,用一次性验证码确认邮箱,然后添加 passkey。

5. (可选)用仓库自带的 Deploy workflow 从 CI 部署:`.github/workflows/deploy.yml`。

### B. 零成本先行验证(本地开发路径,不需要 Cloudflare 账号)

**前提**:Node 22、pnpm 10。

```sh
pnpm install
pnpm -r build && pnpm -r typecheck && pnpm -r test
pnpm --filter @diffinery/app db:migrate:local
pnpm dev                                    # http://localhost:8787, signed in as dev@diffinery.local
pnpm --filter @diffinery/app e2e            # wrangler dev, real git, the runner agent and Chromium
```

说明:本地用 wrangler dev + 本地 D1/R2/队列;e2e 会用真实 `git` 推仓库、跑 workflow、驱动 MCP 与 REST(`@octokit/rest`)、并用 passkey 在 Chromium 登录。

### C. 把智能体接到现有工具链

6. 装 Claude Code 插件(带 OAuth 登录的 MCP server、教 branch → PR → CI → merge 循环与 agent 规则的 skill、`/diffinery:pr-status`、会话钩子):

```sh
claude plugin marketplace add codician-team/diffinery
claude plugin install diffinery@diffinery
```

7. 装 Claude Code 里的实时 CI 条(提示符上方显示本分支 PR 与检查状态,`/diffinery-ci` 面板含 **Fix CI**;云端会话同样生效):

```sh
claude plugin install diffinery-ci@diffinery
```

8. 装 Codex 插件(同样的 MCP server、skills、会话钩子):

```sh
codex plugin marketplace add https://diffinery.com/codician/diffinery.git
codex plugin add diffinery@diffinery
```

9. 其它接入方式(按需):

- MCP server 地址:`https://<your host>/mcp`,用浏览器登录(OAuth 2.1)或 agent token。
- Claude(claude.ai / Desktop / 移动端):Settings → Connectors → Add custom connector,填 `https://diffinery.com/mcp`。
- CLI:`curl -fsSL https://diffinery.com/install | bash`,随后 `diffinery setup`(一次登录并配好 git、`gh` 与两个 Claude Code 插件)。
- 让 `gh` 可用:`diffinery auth setup-gh`。
- JetBrains 插件仓库:`https://diffinery.com/-/jetbrains/updatePlugins.xml`(2024.3+)。

### D. 配置“人机协作”的默认规则

10. 给每个需要动手的智能体建**独立 agent 账号**(由人或组织拥有),分配 token 与限额;不要复用人的账号。理解并依赖服务器强制的限制(见“是什么”中的清单),例如:agent 推保护分支会被拒,只能开 PR。

11. 在仓库中写 `REVIEW.md` 并放在**base 分支**上——这是 agent review 读取的规则来源(原文只说明这一点,未给模板)。把“可 blocking 的问题类型”和“只提建议的问题类型”写清楚,因为 blocking finding 会让 Agent review check 失败。

12. 开启 agent review,并把它加入 required checks(让 blocking finding 真正卡住合并);对 finding 用 **Fix it** 转成任务,或开 autofix 让修复直接推到 PR 分支。注意原文限制:无写权限作者的 PR 不会被自动评审;一个仓库的评审费用由一个 key 支付。

13. 在 **Settings → Merge on green** 中勾选必须通过的检查、指定哪些 agent 的 PR 可自动落地、以及是否仍需人工批准;此后 PR 在检查通过且规则满足时自动合并。注意保留原文中的硬限制:agent 对 workflow 文件的改动仍需人合并。

14. 用 **Projects** 给仓库配 agent 任务看板、对话、项目指令与所有任务共享的记忆;如需把帖子自动变成任务,开 **coordinator** agent 并设定上限。

15. 需要按自己的订阅(而非 API key)跑时,打开 **terminal**(浏览器里的 shell,仓库已 checkout),在其中用自己账号登录 Claude Code / Codex 再交任务。原文说明:API key 不进沙箱,每次运行只拿一个仅被 Diffinery 模型代理接受的 token。

16. 把 **Today** 作为每日入口(可开早间邮件),只处理 “Needs you” 里的项。

## 对应的研究问题(对照上面五个问题逐条说明,只写有依据的)

**1. 能力发现:AI 已经能做哪些还没想到交给它的工作**
- 从一句话目标直接产出 PR(含 `intent` 字段,让评审者知道改动目的);
- 每个 PR 的例行代码评审,带行内 findings 与建议修复,并作为一项可失败的检查参与门禁;
- 先出计划待批(plan first)、同一目标并行多方案(best of N)、自己修失败检查直到可合并(verify and land);
- 把评审 finding 一键转成开发任务并推修复(Fix it / autofix);
- 用 MCP 的 `today` 工具读“今天需要人处理什么”,让 agent 参与待办排序。

**2. 任务匹配:什么工作适合怎样的模型、工具和协作方式**
- 执行体:沙箱内跑 **Claude Code**、**Codex** 或“你自己的命令”,模型 key 自备(平台不卖模型);
- 评审任务:只读沙箱 + base 分支的 `REVIEW.md` 规则,与实现任务分离;
- 有明确验证信号的改动(有 CI 可跑)最适合“目标→PR”模式,因为可以用 checks 作为完成判据;
- 需要人机同屏时用浏览器 terminal(自带 Claude/ChatGPT 订阅),长任务用 sandbox 后台跑;
- 小任务可并行做 best of N 再挑;不确定的方案先 plan first。

**3. 条件供给:需要提供哪些信息、工具、权限和反馈**
- 权限:agent 独立账号 + 自有 token + 角色封顶 + 服务器强制的权限限制(不能推保护分支、不能改 secrets/environments/分支保护、其检查不能算 required check、其代码触发的 workflow 无 secrets);
- 工具:MCP server(52 个工具)、GitHub 兼容 REST/GraphQL、`gh`、CLI、IDE 插件、沙箱(仓库已检出、可 build/test);
- 信息:项目指令与共享记忆(Projects)、`REVIEW.md` 评审规则、面向 agent 的文档(Markdown 页面、`llms.txt`、`llms-full.txt`、OpenAPI 3.1、MCP 的 `search_docs`/`read_docs`);
- 反馈:失败 job 的日志尾(`/diffinery:pr-status`)、CI 条、CI 状态变化时通知 Claude、transcript 流式可见。

**4. 主动推进:哪些工作可由时间、事件或状态触发并持续完成**
- 事件触发:PR 打开 → 自动 agent review;评审出 blocking finding → check 失败;finding → 任务;CI 由 running 变 settled → 通知 Claude;
- 状态触发:**Merge on green**(required checks 通过且规则满足即自动合并),以及 agent 自己修失败检查后重新落地;
- 时间触发:Today 的早间邮件;`on: schedule` 的定时 workflow(由 Cron Triggers 驱动);
- 看板触发:coordinator agent 把项目里的帖子在限定范围内转成任务。

**5. 效果验证:怎样判断确实改善了结果**
- 平台内置的可验证机制:Agent review 作为 required check、有 blocking finding 即失败;agent 的检查结果不能满足 required checks(防止自我批准);agent 的 PR 必须有人批准;提交记录可追溯到“代表谁”;append-only 审计日志;Today 页给出合并/发布/失败计数。
- 局限:原文没有给任何“效率提升 X%”之类的量化结果,验证指标需要自己定义(见下一节)。

## 与已有做法的关系

- **Claude Code(状态:adopt)**:Diffinery 直接提供 Claude Code 插件(`diffinery`)与实时 CI 插件(`diffinery-ci`),把“branch → PR → CI → merge”的循环、PR 状态与失败日志尾、CI 变化通知搬进 Claude Code;还支持在浏览器 terminal 里用自带 Claude 订阅登录后交任务。可以视为 Claude Code 的“执行环境与权限边界”补层,而不是替代品。
- **Cursor(状态:watch)**:README 把 Cursor 的 Bugbot 作为 agent review 的类比,并提供 Cursor 编辑器扩展(从 Diffinery clone、passkey 登录)以及把 Cursor 列为支持的编码智能体之一。除此之外没有更深的 Cursor 集成说明。
- 清单之外,原文对比了 GitHub + GitHub Actions、GitLab、Gitea/Forgejo、Blacksmith/Depot 等 runner 服务,并自称在“AI agent 护栏”与“内置 MCP server”两行上有差异;这些属于作者对比表,详见“证据与局限”。

## 证据与局限

**原文给出的、可核对的材料**
- 具体命令:部署脚本与 dry-run、本地开发与 e2e、Claude Code / Codex 插件安装、CLI 安装、`gh` 配置、MCP 地址——这些是可照着跑的部分。
- 权限限制表:六条,明确说明“服务器在 Git、REST、MCP、沙箱上一律执行同样的规则”。
- 截图来源说明:截图由 `apps/diffinery/scripts/agent-screenshots.mjs` 在本地实例上跑真实的 agent 任务、agent review 与 CI 生成(属作者自述,非第三方复现)。
- 对比表中的竞品信息:作者称来自各家官网与文档,“checked in October 2026”,并在每个对比页列出出处。
- 平台架构映射表(哪个组件用 Cloudflare 哪个产品)、仓库目录结构、CI 运行参数(默认 4 vCPU / 12 GiB,按运行时长计费,6 小时 job 超时)。

**只是作者主张、缺独立验证的部分**
- “GitHub Actions workflow 原样运行”“marketplace actions 可用”:作者称所有已知差异列在 compatibility 页面,但本次输入未包含该页内容,无法核对。
- 性能、成本、比 GitHub 更快的说法:只有 4 vCPU/12 GiB vs 2 vCPU/8 GB 的规格对比,无基准数据。
- 所有关于“agent 护栏有效”的论证是设计层面(服务器强制 vs 提示词),没有攻击面测试或渗透报告。
- 无任何使用量、团队案例或前后对比数据;仓库本身只有 31 stars,作者也自述 “Diffinery is young”。

**原文自陈的硬限制(直接决定适用条件)**
- 托管 runner 只有 Linux x64;macOS / Windows / Arm 需自托管 runner(GPU 同理)。
- Git 只支持 HTTPS,无 SSH。
- **没有 fork**——PR 只能在同仓库的分支之间。
- 无 wiki、discussions、Pages 类站点、Codespaces 类云编辑器、应用市场。
- 评审比 GitHub 简化:无 pending review、无 suggested changes、无线程解决;分支保护无 code-owner review、无签名提交要求。
- 部分 GitHub 事件(如 `issues`、`issue_comment`)在 workflow 中被接受但不会触发运行。
- **没有托管服务**:必须自己部署实例。

**适用条件**:团队已经在用 Claude Code / Codex 等编码智能体,希望把“agent 直接推 main”改成“agent 开 PR + 人审批 + CI 门禁 + 自动合并”,且愿意接受自托管 Cloudflare 付费计划、无 fork、Linux-only 托管 runner 这些约束。不满足这些前提的团队,价值主要在“权限限制清单”这一设计思路上。

## 怎么试、怎么验证

**最小试用(两档,建议先做第一档)**
- 第 0 档(半天,零云成本):本地 `pnpm dev` 起实例,用 e2e 或手工建一个仓库,写一份 `REVIEW.md`,跑一次 agent 任务(goal → PR)和一次 agent review,确认:blocking finding 会让 Agent review check 失败、agent 不能直接推保护分支、agent 的 check 不能满足 required checks、PR 必须有人批准。这一档只验证机制是否如描述那样工作。
- 第 1 档(2–4 周,单仓库试点):部署一个实例或使用 `diffinery.com`,选**一个非关键仓库**,接入 Claude Code 插件 + 实时 CI 插件;开 agent review 并设为 required check;开 Merge on green 但**保留人工批准**;把两三个边界清晰、有 CI 可验证的任务(小 bug 修复、依赖升级、测试补齐)交给 agent 任务。

**判断有没有改善的指标(原文未给基线,需自建对照)**
- 交付:同规模任务从开 PR 到合并的周期;agent PR 被合并的比例(以及被关闭/重写的比例)。
- 质量:agent review 的 blocking finding 数量与其中被人工判定为误报的比例;CI 首次通过率;合并后回滚/修复提交的次数。
- 人的负担:每个 agent PR 平均需要人工改动多少(行数或评审轮次);人工点 Merge 的次数(开 Merge on green 后应下降);Today 里 “Needs you” 的积压趋势。
- 安全:护栏拦截次数(推保护分支被拒、workflow 改动被要求人工合并、push protection 触发);审计日志里 agent 提交是否都能追溯到 owner。
- 成本:Cloudflare 侧 Containers/Workflows 用量与模型侧 token 消耗(按任务计)。
- 退出条件:若误报率高到需要人工复核每条 finding、或人工改动量没有下降,则回退到“agent 只做任务不做评审/不自动合并”。

试用期间同时核对原文未覆盖的两点:`.github/workflows/` 的兼容性清单是否覆盖你们实际用的语法与 marketplace actions;你们依赖的 GitHub 事件(`issues`、`issue_comment`)是否会因此失效。
