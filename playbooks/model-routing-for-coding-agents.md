# 在编码会话里试用“主模型执行 + 强模型顾问”前，先做对照

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决是否值得把贵模型降为只在关键判断介入的顾问，以及如何用可观察指标验证的问题。
> 先试这一步：先跑 `claude --help` 确认 `--advisor` 是否存在，再用同一批真实任务对照 `claude --model sonnet` 与 `claude --model sonnet --advisor opus`。
> 最近修订：2026-11-06

## 解决什么问题

编码过程中经常遇到几类浪费与中断：某个供应商的订阅配额到期没用完、编码到一半被限流、某个 key 死掉导致整条流程卡住、工具输出烧 token。另一类浪费是模型分工：要么所有任务都用最重最贵的模型，要么靠手动切换；贵模型把大量 token 花在样板代码、写测试、跨文件改代码上，而这些活本可以交给廉价模型，只要贵模型先把任务写清楚，并用测试当裁判。还有一种 Claude Code 内的具体做法是：让 Sonnet 主跑、Opus 只在困难判断上做顾问，目标是“以 Sonnet 的价格获得 Opus 的判断”。本手册给出一组本地可试的做法：用网关按配额/失败/成本回退；用路由或编排把任务分给不同 harness/模型/effort；用“有证据的验收”判断是否真的完成；以及先在 Claude Code 内用对照实验验证“主模型执行 + 强模型顾问”是否值得。

本次新增材料只有一条推文：给出 `claude --model sonnet --advisor opus`，并主张“Sonnet builds, Haiku swarms, Opus advises”。原文正文在 here's 处截断，Haiku swarms 没有任何命令或配置；推文互动量 58 赞、8 次转发、6 条回复，不是效果证据。因此把它当作“值得小范围对照的候选做法”，而不是已验证流程。

## 适用与不适用

适用：

- 你用 Claude Code，任务属于中等规模（新功能或真实 bug，跨几个文件），项目已有能跑、能覆盖改动的测试。
- 你愿意把代码发给第三方廉价模型 provider，并能按项目执行 /cheapag:allow 授权、审 diff 后自己提交。
- 你想让 Opus 只做规划和决策，廉价模型写码，Sonnet 作为失败兜底。
- 你手上有多个供应商或多把订阅/API key，经常因为某一个配额耗尽、限流或失败而中断工作。
- 你愿意在本机长期运行一个本地服务，并且手上的工具支持自定义 OpenAI 兼容 base URL。
- 你使用 Codex，并愿意在 Codex 内装本地插件，用 $adaptive-route 跑日常任务。
- 你想用一个面板把“哪个工具接哪个模型”集中管起来。
- 你已经装了多个编码 agent，想在同一终端框架里并排开会话，并为每次会话选 harness/model/effort。
- 你想先在 Python 代码里用同一个函数调不同供应商，再决定要不要上网关。
- 你使用 Claude Code，且版本支持 /advisor 或 --advisor；主模型已设为日常主力，同时还有另一个模型的可用配额；或账号允许在 Sonnet、Opus、Haiku 等模型之间切换，想对成本敏感的代码编辑任务做 A/B。
- 你长期在 Claude Code 里工作，模型设置全局绑定所有终端窗口，想按窗口/会话切 provider；你有至少一个备用的 Anthropic 兼容端点。
- 你遇到 Anthropic 429 用量上限，想自动转到备用 provider 并钉住会话。
- 你使用 Claude Code、Codex、Cursor 或 Gemini，愿意试 cedr 的按工作类型路由、verdict 回填和 cedr.lock 固定 skill/MCP。
- 你以 Claude Code 为主要编码入口，手上有 2 个以上可并行推进的任务，愿意按“改动是否涉及架构”给任务打标签，并在长上下文换模型前先 /compact。
- 你只想先在非敏感、非生产任务上小范围试。

不适用或需要谨慎：

- 项目没有可运行测试或测试覆盖不足：Cheap Agent 的机制依赖测试裁判，不要用。
- 极小任务（几行代码、从零写一个小应用）：作者自己说没有收益；最难一档 bug 作者自报 6/9 对 7/9，可能略差。
- 合规或数据敏感：Cheap Agent 会把代码发给第三方 provider；OmniRoute 接入前也要看清请求是否会经过第三方免费层，README 自己披露有供应商因条款风险被标记为 avoid，本次材料点名 Kiro。
- Windows 上用 Cheap Agent：beta，CI 测过但无真实用户验证，需要 Git for Windows。
- 期望 Cheap Agent 自动 commit/push：它从不 commit 或 push，改动以未提交形式落地，必须人工审 diff。
- 想把 Cheap Agent 与 model-relay、cedr 等 Claude Code 扩展叠加：材料未说明可集成，先分开试。
- 想直接采信 README 的效果数字：OmniRoute、agent-smith、FlagshipRouter、Gluon、LiteLLM、model-relay、cedr、Cheap Agent 的数字大多没有可复现测量方法或第三方复核。
- 想用 OmniRoute 的生产级能力（MCP 110 工具、A2A、memory、guardrails、evals、TLS stealth、key pools 等）：给定材料里只有名词或概述，没有配置步骤。
- 想把 OmniRoute 的 combo 策略表直接照抄：本次原文在策略表第 3 条处被截断，round-robin 及后续策略的语义不完整；安装/首次运行章节也没有完整抓到。
- 以为新装 OmniRoute 一定有 keyless 免费目标：新调研明确提醒，全新安装可能没有任何可用的 keyless 目标，某些 keyless provider 也会拒绝第三方客户端。
- 想把 OmniRoute 当无单点风险的生产网关：网关是单点，它挂了所有客户端一起挂。
- Codex Float 仅 macOS 14+；agent-smith 的 router 执行需要已有 Codex 登录。
- FlagshipRouter 默认面板密码是 123456，默认监听 20128；暴露到 localhost 之外前必须改密码。
- 想在同一个 Python 环境里同时装 litellm 和 litellm-core：只能装一个。
- 想让 LiteLLM 的 MCP OAuth 一路走通：可能需要预注册 OAuth app 并配置 credentials。
- 生产环境想用明文 ALB 长跑：allow_plaintext_alb = true 按 README 只限 dev/trial。
- 想直接照抄 Claude Code 的 /advisor（F1）、Sonnet 主跑 + Opus 顾问（F2a）、`claude --model sonnet --advisor opus`（F2b 写法 1）、`claude --model sonnet --advisor`（F2b 写法 2）、`CLAUDE_CODE_SUBAGENT_MODEL=haiku claude`（F3）：原文都在关键处截断或没有版本号，执行前必须确认命令/参数/环境变量存在；模型名无法核实。
- 想把 `--advisor` 不带模型名当成“自动选顾问”或等同于 `--advisor opus`：材料没有说明顾问用哪个模型、何时触发、如何配置；两种写法先分开对照。
- 想把 F1、F2a、F2b、F3 混着抄，或与 A–I 的网关/路由自动叠加：材料都未说明可集成，先分开试。
- 想给整个组织做多租户云代理：model-relay 作者自己说那种场景应该用 LiteLLM；它是单人本地守护进程。
- 只有 OpenAI Chat Completions 格式的 provider：model-relay 要求 provider 能接 Anthropic /v1/messages；只会说 OpenAI Chat Completions 的服务需要本地翻译层。
- 想在已经跑着 Claude Code 的 shell 里 export key 就生效：key 由 router 进程从它继承的环境里读，要写成永久变量并开新终端。
- 想装完 model-relay 就自动把请求导出去：不加 alias，haiku 及所有请求默认留在 Claude，不会外流。
- 想把 model-relay 的 proxy mode 当无感隧道：HTTPS_PROXY 写进 settings.json 的 env，Claude Code 跑的命令也会走 relay 当盲隧道，router 挂了 git/curl/gh 会失败；proxy 模式下 router 停了 Claude Code 连不上。
- 想从 0.6 及更早版本升级 model-relay 只更新插件：0.7+ 只读 "format": 2，要迁移。
- 想让 cedr 直接当团队标准：它处于 preview，1.0 前命令与文件格式仍可能变；用量接入只具体说明 claude-statusline 与 codex 两种 kind；Council 的 reviewer 报告格式、quorum 默认值、merge 输入形态需读 docs/council.md；cedr route sync 会把历史与路由上传到 cedr.dev，默认应不开。
- 想让 cedr 的 cedr lock 无副作用：只有传 --introspect 时才会真正运行 MCP server，运行前会先警告；若不允许执行第三方 server，就不要加这个参数。
- 想拿 cedr 的效果当结论：没有效果数据、案例研究、对比实验或用户反馈；示例输出里的百分比是演示样例，不是实测结论。
- 原文在“- 不用”处被截断，只有个人经验、没有数据；Fable/Opus 模型名、Herdr 的安装与命令都需自行核对，不能照抄。
- 你的任务高度耦合、无法拆成独立 session，或你不常做架构判断：J 的收益不明。
- 你不能接受 /compact 丢失上下文细节：长途换模型前先压缩这条要谨慎，压缩前把关键约束写到文件或消息里。
- 把本次推文的“Sonnet builds, Haiku swarms, Opus advises”当成完整方案：Haiku swarms 没有给命令、配置或触发方式，正文在 here's 处截断，不能照做。

## 前置条件

- Cheap Agent：已安装 Claude Code；Node.js 20+；一个充值了几美元的 API key，来自 OpenRouter / DeepSeek / OpenCode Go；支持 macOS 和 Linux，Windows 为 beta（CI 测过但无真实用户验证，且需要 Git for Windows）；项目里有能跑、能覆盖改动的测试套件；每个项目执行一次 /cheapag:allow 授权；API key 存在本地凭据库，不进聊天。
- OmniRoute：本机可安装 npm 全局包，或可用 Docker 镜像 diegosouzapw/omniroute；能长期运行一个本地服务；默认监听 20128；至少有一个你自己有权使用的 provider 账号或 API key；客户端支持自定义 OpenAI 兼容 base URL；从 Dashboard → Endpoints 取 OmniRoute key；v3.8.53+ 的材料提到可用无界面模式 serve --headless 放服务器常驻，但没有给完整启动命令。本次材料的安装/首次运行章节被截断，npm i -g omniroute 只作为线索，执行前回 README Quick Start 补齐。
- agent-smith：Python 部分只用标准库；路由执行需要已有的 Codex 登录；Float 需要 macOS 14+、/usr/bin/python3 和 Xcode Command Line Tools。以下命令均在克隆后的仓库根目录执行（Float 相关除外）。
- FlagshipRouter：Node.js 20.9 或更高（README 建议 22）；git 与 npm 可用；本地端口 20128 空闲——与 OmniRoute 默认端口相同，不能按默认端口同时启动；要接自有供应商时需要相应凭证，不想注册时可先只用 OpenCode Free 的免注册模型。
- Gluon：至少一个受支持编程智能体的 API key 或订阅；Linux、macOS、WSL 或 Windows；在本地 git 仓库目录中操作。安装需要能访问 GitHub release，或用 Bun 从 release tarball 安装。
- LiteLLM：Python 环境 + uv；装 SDK 用 uv add litellm，同一环境只能装 litellm 或 litellm-core 之一；起网关用 uv tool install 'litellm[proxy]'，本机 4000 端口可用；接 MCP 需要 master key 或虚拟 key；跑 harness 需要 starlette、uvicorn 以及对应 agent 的 CLI；走 A2A SDK 需 a2a-sdk>=1.1.0；从源码构建 core 包需要 Git、uv 和 Rust 工具链。
- Claude Code /advisor（F1）：原文只给出两个命令；执行前先确认版本存在 /advisor；已把主力模型设为原文所称的 Opus 5.5；另有一个模型的可用配额（原文称 Fable 5.1）；某些计划下需要先执行 /model fable 接受按使用信用计费的确认。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a）：本机已安装并可运行 Claude Code CLI；账号/方案支持在 Sonnet、Opus 等模型之间切换；额度允许调用 Opus；已对照官方文档核对 /model、advisor 相关开关以及 Haiku 的用法。原文只给出一行箭头写法。
- Claude Code 启动参数分层（F2b）：本机已安装并可运行 Claude Code CLI；先在终端运行 claude --help，或在会话内用 /help，确认存在 --model 与 --advisor，并确认 --advisor 是“可带模型名”还是“只当开关”；账号/方案允许在 sonnet、opus、haiku 等模型之间切换；额度允许调用 opus；原文没有给出支持该参数的版本号。本次推文只给 `claude --model sonnet --advisor opus` 一条命令，并称 “Sonnet builds, Haiku swarms, Opus advises”，但正文在 here's 处截断，Haiku swarms 没有配置。
- Claude Code 子代理固定为 Haiku（F3）：本机已安装并可运行 Claude Code；当前版本支持 CLAUDE_CODE_SUBAGENT_MODEL 环境变量（原文未给版本要求，需自行确认）；任务可以拆出子代理；你愿意让较弱模型处理子任务，并接受用同一批任务做质量对照。
- model-relay：Node.js 20+；Claude Code 2.1.287 或更新（作者在 Node.js 22.23.2 与 Claude Code 2.1.306 上测过）；至少一个备用的 Anthropic 兼容端点（内置 preset：zai、deepseek、kimi、minimax、openrouter，或用 --url 指定自己的网关）；接受这是单用户本机工具，不是团队共享代理；先设好 BACKUP_API_KEY 等环境变量，再启动 Claude Code；手动路径下 node tools/setup.mjs 要在插件安装目录里跑：~/.claude/plugins/cache/model-relay/model-relay/<version>/（设了 CLAUDE_CONFIG_DIR 时是 $CLAUDE_CONFIG_DIR/plugins/cache/model-relay/model-relay/<version>/）；默认端口 8950，Claude Code settings.json 的 ANTHROPIC_BASE_URL 会指向 http://127.0.0.1:8950。
- cedr：Linux 需要 glibc 2.34 或更新（Ubuntu 22.04、Debian 12、RHEL 9 及以上），或使用对应平台发布包；不想用二进制时本机要有较新的稳定版 Rust 工具链；写入 ~/.config/cedr/routes.toml；使用 Claude Code 时要挂 statusLine；要固定 skill/MCP 时仓库里要有 agent 配置；要接 agent 时 agent 需支持 MCP。README 声明 cedr 不读 agent 凭据、不代你调用厂商 API；用量来自 agent 自己的状态行与 CLI，或你指定的 feed；pick、verdict、stats 留在本机，只有加了 [sync] 段和 cedr.dev API key 后 cedr route sync 才上传。
- 做法 J：已安装并登录 Claude Code CLI；有 2 个以上互不干扰、可并行推进的编码任务；确认你的环境里存在原文所称的 Fable、Opus 或等价模型（原文未给版本与可用性）；确认 /compact 与 /model 命令存在；Herdr 的安装与命令原文未给，需查其文档。

## 操作步骤

**做法 A：本机 OpenAI 兼容网关，按任务选模型并自动回退（OmniRoute）**

1. 安装并启动网关。前提：本机有 Node.js/npm，或可用 Docker；能长期运行一个本地服务。本次材料能确认的 npm 命令是 npm i -g omniroute；Docker 镜像名是 diegosouzapw/omniroute。安装/首次运行章节在本次材料中被截断，执行前回仓库 README Quick Start 补齐。预期结果：服务默认监听 localhost:20128；v3.8.53+ 的材料提到可用无界面模式 serve --headless 放服务器常驻，但没有给完整启动命令。

```bash
npm i -g omniroute
```

2. 连接 provider。前提：有至少一个你自己有权使用的 provider 账号或 API key。在 Dashboard 里绑定账号或 key；被标记 tos: avoid 的 provider（本次材料点名 Kiro）默认被排除在自动路由之外，即使连上账号也不会覆盖该设置。预期结果：Dashboard 里出现可用 provider；先接 2–3 个（1 个付费主力 + 1 个免费备用），不要一上来铺满。

3. 取网关密钥。Dashboard → Endpoints 复制 OmniRoute key。预期结果：你拿到一个本地网关 key。早期材料说零凭证也能先跑；新调研的 README 明确要 Authorization 头，且全新安装可能没有可用 keyless 目标。两者冲突时，以你当前版本的实际行为为准；先用第 4 步带 key 的写法。

4. 验证端点通不通。前提：第 1 步服务在跑，第 2 步至少一个 provider 可用，第 3 步拿到 key。

```bash
curl http://localhost:20128/v1/chat/completions -H "Authorization: Bearer YOUR_OMNIROUTE_KEY" -H "Content-Type: application/json" -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'
```

预期结果：拿到模型回复。若返回 401/403，检查 key；若提示无可用路由，说明 auto 没有可用目标，先回 Dashboard 接 provider 或换 auto/subscription/具体别名。早期材料还给过一条不带 Authorization 的 curl，它只在存在 keyless 免费后端时可能可用，不能当成必然。

5. 只把一个工具指向端点。前提：该工具支持自定义 OpenAI 兼容 base URL。把 base URL 设为 http://localhost:20128/v1，API key 填 OmniRoute key，模型名填第 6 步的别名。建议先接你日均用得最多的那个工具，只接一个；写入前记录原配置。预期结果：该工具的请求开始经过网关，另一个直连路径保留作对照。

6. 按任务选 auto 别名。原文映射可直接用：

| 模型 ID | 用途 |
| --- | --- |
| auto | 均衡默认，粘住上次可用的好 provider（LKGP） |
| auto/coding | 代码生成，质量权重优先 |
| auto/fast | 最低延迟优先 |
| auto/cheap | 每 token 最便宜优先 |
| auto/subscription | 只用已付费订阅额度，失败即停，绝不回退到会产生账单的通道 |
| auto/thrifty | 先用套餐额度，再一级一级降到最便宜的付费选项，套餐重置后自动回到套餐 |
| auto/offline | 选配额/限流余量最大的 |
| auto/smart | 质量优先 + 10% 探索 |
| auto/lkgp | 显式粘住 last-known-good provider |
| auto/chaos | 并行 fan-out 到一个模型面板（默认每 provider 一个、共 5 个），返回一个答案；不是故障注入，会成倍消耗上游调用 |

预期结果：你能按任务换别名，而不用改代码。预算红线先用 auto/subscription 跑一天，确认它真的“失败即停”而不产生账单。

7. 需要精细控制时自建 combo。前提：auto 不够用，且你愿意回 README 查策略语义。原文把 combo 描述为一条模型链，配额耗尽、provider 故障或成本飙升时自动切到下一个健康目标；自建 combo + 自动回退分四层：Subscription → API Key → Cheap → Free。每一步挑一种策略；本次材料只确认了 priority、fill-first、round-robin 等名称，round-robin 及后续策略在原文中被截断，不要照抄未确认的语义。

8. 看看板与遥测。打开 /dashboard/free-tiers 看免费额度池的已用/剩余；用 live analytics 看用量、配额、节省额、p95 延迟。材料称 circuit breaker、key cooldown、model lockout 三层机制处理死 key；但没有给配置步骤，只当成提示。

9. 做 A/B，保留直连。前提：非敏感、非生产任务。同一批任务一路走网关、一路直连原 provider，记录中断次数、人工切换次数、单位任务 token 成本、p95 延迟和返工率。

**做法 B：在 Codex 内装 Adaptive Router，按难度路由并保留证据验收（agent-smith）**

前提：已克隆 agent-smith 仓库；路由执行需要已有 Codex 登录；以下命令在仓库根目录执行（Float 相关除外）。

1. 注册本地 marketplace 并安装路由插件：

```sh
codex plugin marketplace add .
codex plugin add adaptive-router@agent-smith
```

2. 不调用模型，先检查路由器和模型注册表：

```sh
python3 router/scripts/router.py --help
python3 router/scripts/model_registry.py show
```

3. 在一个新的 Codex 任务里启用：

```text
Use $adaptive-route for this task: …
```

预期结果：路由器按本地 1.0–10.0 难度启发式（步长 0.1）选择模型；常规工作给更轻模型，困难场景再上重型模型。验收语义用 accepted / rejected / unknown；最好自己写确定性检查（测试通过、编译成功、断言满足），而不是看进程是否退出成功。

4. （仅 macOS）构建并打开 Float：

```sh
cd float
sh scripts/build.sh
open "build/Codex Float.app"
```

前提：macOS 14+、/usr/bin/python3 和 Xcode Command Line Tools。预期结果：打开浮窗，显示本地 Codex 任务、agent、用量与参考成本。

5. 想复现截图里的合成演示数据，在 float/ 下改用 demo 构建：

```sh
sh scripts/build.sh --demo
```

6. 在仓库根目录跑回归测试或离线基准演示：

```sh
python3 -m unittest discover -s router/tests -q
python3 -m unittest discover -s float/tests -q
python3 router/benchmarks/benchmark.py demo --run-dir /tmp/agent-smith-demo
python3 router/benchmarks/benchmark.py report --run-dir /tmp/agent-smith-demo --output /tmp/agent-smith-demo-report
```

前提：使用全新的输出目录。预期结果：demo 用合成答案和合成用量，replay 对已记录产物重新评分，两者都不调用模型；得到基准报告。

**做法 C：带面板的本地网关，用一张模型表统一给工具改配置（FlagshipRouter）**

前提：Node.js 20.9+（README 建议 22）；本地端口 20128 空闲。注意做法 A 与做法 C 默认用同一个端口，先确定只跑其中一个。

1. 克隆并启动。首次构建要几分钟。

```bash
git clone https://github.com/theRizwan/FlagshipRouter.git
cd FlagshipRouter
npm run launch
```

2. 用只监听本机的方式启动，并先改掉默认密码。

```bash
npm run launch -- --host 127.0.0.1
```

3. （可选）想在任何目录直接用 flagshiprouter 命令，先链接一次 CLI 包：

```bash
cd cli && npm link
```

4. （可选）开发模式带热重载：

```bash
npx next dev --port 20128
```

5. 建 key、选模型、接工具：打开 Endpoint & Key 创建 API key；打开 Models 选一个标为 Ready 的模型（OpenCode Free 的模型不需要注册即可用），或先连接某个供应商；把工具指向 http://localhost:20128/v1 并填入该 key；或直接用 CLI Tools 页面为 Claude Code、Codex、OpenCode、Cline、Copilot 等写入配置。模型在这些工具里显示为 flagshiprouter/<model>。只接一个你已经在用的工具，并在写入前记录它原来的配置。

6. 验证连通。README 示例里的模型名 gpt-6-astra 来自 README，不是真实可用模型，必须换成你实际 Ready 的那个。

```bash
curl http://localhost:20128/v1/chat/completions -H "Authorization: Bearer $FLAGSHIPROUTER_KEY" -H "Content-Type: application/json" -d '{"model": "gpt-6-astra", "messages": [{"role": "user", "content": "Hello"}]}'
```

7. （可选）集中改品牌与命名：编辑仓库根目录的 brand.json，改完运行：

```bash
npm run brand:sync
```

8. （可选）调整免费供应商策略。README 原样给出的配置：

```json
"providers": {
  "freeOnly": true,
  "categories": ["free", "freeTier"],
  "includeHasFree": true,
  "include": [],
  "exclude": ["antigravity", "gemini", "gemini-cli"],
  "customEndpoints": false
}
```

9. （可选）跑测试。README 自陈套件带已知失败，建议与上一个 commit 的运行结果对比，而不是期待全绿：

```bash
npm install --prefix /tmp/vitest-runner --legacy-peer-deps vitest@4
ln -sfn /tmp/vitest-runner/node_modules tests/node_modules
cd tests && npx vitest run
```

**做法 D：用控制平台为每个会话选 harness/model/effort，并看成本与上下文（Gluon）**

前提：已有至少一个受支持编程智能体的 API key 或订阅；使用 Linux、macOS、WSL 或 Windows；在本地 git 仓库目录中操作。

1. 安装最新 release。Linux、macOS、WSL：

```sh
curl -fsSL https://github.com/fidipro/gluon/releases/latest/download/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://github.com/microsoft/gluon/releases/latest/download/install.ps1 | iex
```

2. 进入仓库并启动：

```sh
cd your-repo && gluon
```

3. 首次运行时按引导连接你的 agent。

4. 描述这次会话是做什么的。预期结果：intake agent 读取你的仓库、问几个问题，并提出一个 agent、model 和 effort，以及一份 spec。

5. 按 Enter，在该 agent 自己的 UI 中启动会话，会话运行在 Gluon 的 frame 内。按一个键回到主界面，可以继续启动更多会话。

6. 需要配置路由规则时查文档，不要照抄本文。

7. 用 Gluon 查看各会话的成本与上下文可观测性和分析。

**做法 E：用 LiteLLM 统一多供应商，并按项目看成本（LiteLLM）**

前提：有可用的 Python 环境与 uv。先做 E1，觉得需要虚拟密钥、多租户成本追踪、管理后台再上 E2。

*路线 E1：先在 SDK 层做最小验证*

1. 安装 SDK：

```shell
uv add litellm
```

注意：另有一个独立的 litellm-core 发行版；同一环境只能装一个 SDK 发行版。

2. 配置各 provider 的 API Key（环境变量）：

```python
import os
os.environ['OPENAI_API_KEY'] = 'your-openai-key'
os.environ['ANTHROPIC_API_KEY'] = 'your-anthropic-key'
```

3. 用同一个函数调不同模型：

```python
from litellm import completion

response = completion(model='openai/gpt-4o', messages=[{'role': 'user', 'content': 'Hello!'}])
response = completion(model='anthropic/claude-sonnet-4-20250514', messages=[{'role': 'user', 'content': 'Hello!'}])
```

*路线 E2：起本地 AI Gateway*

4. 安装并启动 proxy：

```shell
uv tool install 'litellm[proxy]'
litellm --model gpt-4o
```

预期结果：本机起一个 AI Gateway，默认监听 4000 端口。

5. 用标准 OpenAI SDK 指向网关：

```python
import openai

client = openai.OpenAI(api_key='anything', base_url='http://0.0.0.0:4000')
response = client.chat.completions.create(
    model='gpt-4o',
    messages=[{'role': 'user', 'content': 'Hello!'}]
)
```

6. （生产）用 Terraform 模块部署到 AWS / GCP。README 同时提示：生产环境要提供 ACM 证书，没有证书则设 allow_plaintext_alb = true（仅限 dev/trial）；稳定版用带 -stable 标签的 docker 镜像。注意：抓到的原文在 Terraform 输出段被截断，云部署部分只有前半段可依据。

*路线 E3：把工具（MCP）接到模型上*

7. 网关侧先登记 MCP Server。前提：MCP server 已可用；持有 master key 或虚拟 key。

8. 通过 /chat/completions 调 MCP 工具：

```bash
curl -X POST 'http://0.0.0.0:4000/v1/chat/completions' -H 'Authorization: Bearer <your-master-key>' -H 'Content-Type: application/json' -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Summarize the latest open PR"}], "tools": [{"type": "mcp", "server_url": "litellm_proxy/mcp/github", "server_label": "github_mcp", "require_approval": "never"}]}'
```

9. 在 Cursor IDE 里直接用网关的 MCP 端点：

```json
{
  "mcpServers": {
    "LiteLLM": {
      "url": "http://localhost:4000/mcp/",
      "headers": {
        "x-litellm-api-key": "Bearer <your-master-key>"
      }
    }
  }
}
```

**做法 F：在 Claude Code 里做多模型分层——先确认命令，再小范围 A/B（Claude Code）**

四个变体都只动 Claude Code 会话、启动参数或环境变量，不碰网关；模型名与命令语法在给定材料里都无法核实。执行前先确认你所用的 Claude Code 版本确实存在相应命令、参数或环境变量，否则以下步骤不成立。

*变体 F1：主模型 Opus，顾问挂另一个闲置配额模型*

1. 仅在“某些计划”下需要这一步——先执行一次 /model fable，以接受按使用信用计费的确认。

```text
/model fable
```

2. 把次要模型置于“顾问/通话”状态：

```text
/advisor fable
```

3. 之后照常用主模型推进工作。

4. 做一次 A/B：同一任务开顾问 vs. 不开顾问，记录返工次数、被采纳的评审意见数、最终产出差异，以及多出的计费额度与响应延迟。

*变体 F2a：Sonnet 主跑，Opus 做顾问（会话内命令写法）*

原文给出的配置是一行箭头写法：

```text
claude -> model sonnet -> advisor opus
```

按原文箭头还原的最简尝试形态（语法待核对，不要照抄）：

```text
claude
/model sonnet
/advisor opus
```

1. 前提：本机已安装并可运行 Claude Code CLI；账号/方案支持在 Sonnet、Opus 等模型之间切换，且额度允许调用 Opus。
2. 先在 Anthropic 官方文档核对 /model、advisor 相关开关以及 Haiku 的用法。
3. 把会话主模型设为 Sonnet。
4. 打开 Opus 作为顾问。
5. （材料不明，先不要自己补）把轻量任务交给 Haiku：原文只剩“Haiku 5.5”几个字，负责哪类任务、怎么配置都没写清。
6. 跑一个真实任务，观察实际触发了几次 Opus，再决定是否把这个配置固化成默认。

*变体 F2b：用启动参数做分层——两种写法，先核对参数再跑三组对照*

原文给出过两种写法，执行前都必须先核对参数是否真实存在：

写法 1（指定顾问模型）：

```bash
claude --model sonnet --advisor opus
```

写法 2（不指定顾问模型）：

```bash
claude --model sonnet --advisor
```

两者的差别：写法 1 明确把 opus 作为顾问；写法 2 只打开顾问，材料没有说明顾问用哪个模型、何时触发、如何配置，也没有给出 --advisor 是否接受模型名参数。不要默认写法 2 等价于写法 1。

本次新增推文 @0xVeyyro 同样给出写法 1，并主张“Sonnet builds, Haiku swarms, Opus advises”。但原文正文在 here's 处截断，Haiku swarms 没有任何命令或配置；推文互动量 58 赞、8 次转发、6 条回复，不是效果证据。因此只把写法 1 当作候选对照，不把 Haiku swarms 当步骤。

原文给出的分工（仅写法 1 有，照抄原文表述）：

- sonnet 5.5 运行主会话并编辑代码
- 只读 haiku 5.5（此处原文被截断，后续内容缺失）
- 只有在真正需要决策时才引入 opus

要照做，按这个顺序走：

1. 先确认参数：在终端运行 `claude --help`（或在会话内用 `/help`）查找 `--advisor`，并看清它是“可带模型名”还是“只当开关”。原文没有说明它从哪个版本起可用；如果不存在，这条命令无法照抄，只能退回到“贵模型只用于决策点”的分配原则。
2. 按 help 的提示选写法：help 显示 `--advisor` 可接模型名 → 用写法 1；只显示布尔开关 → 用写法 2，并接受“顾问是谁”暂时不可知。
3. 建立基线：挑 2–3 个你手上真实、有明确对错标准的任务，用同一条提示词跑：

```bash
claude --model sonnet
```

记录输出、token、耗时。

4. 跑实验组：同样任务、同样提示词，改用：

```bash
claude --model sonnet --advisor opus
```

若 help 只显示布尔开关，这一步换成 `claude --model sonnet --advisor`。

5. 对照组（可选）：再用 `claude --model opus` 跑一遍，确认“Sonnet+顾问”是否真的接近“全程强模型”的质量。

6. 记录：每次运行后抄下 `/cost`（或等价的用量显示）与最终产物，填入同一张表：任务 / 配置 / 是否一次通过 / 人工返工次数 / token 或费用 / 耗时 / 顾问是否实际介入 / 需要人工升级到 Opus 的次数。

7. 判定：只有当“Sonnet+advisor”在同质量下明显省钱，或同成本下明显少返工时，才把它写进你的默认工作流；否则保持单模型。若命令不存在、或质量下降且成本未降，就停止。

8. 按原文分工，把文件阅读、检索、批量机械修改这类只读/低判断量的活交给 haiku。具体怎么在 Claude Code 里指定 haiku 只读，原文被截断没有给出，需要自己在你的版本里找等价做法。

9. 决策点才切 opus：原文只说“只有在真正需要决策时才引入 opus”，没有给出切换判据，需自行定义（例如架构选型、跨模块改动方案、反复失败后的重新规划）。

*变体 F3：用环境变量把子代理固定为 Haiku*

原文给出的唯一可照做配置：

```bash
CLAUDE_CODE_SUBAGENT_MODEL=haiku claude
```

原文声称：同时运行 Sonnet 5.5、Haiku 5.5、Opus 5.5，让每个模型只做最擅长的任务，从而获得更好输出并显著减少 token。但原文没有说明主模型如何设为 Sonnet 或 Opus、三类任务如何划分、子代理如何触发，因此不能把这一条命令等同于完整三模型协作方案。

核对顺序：

1. 先确认环境变量在你的版本里存在：运行 claude --help 或查官方文档；不存在就停。
2. 用原文命令启动。
3. 在会话中按 Claude Code 原有方式使用子代理或子任务。
4. 做最小试用：选 5–10 个有代表性的 Claude Code 任务，同一提示词分别跑默认配置与设置 CLAUDE_CODE_SUBAGENT_MODEL=haiku 的配置；记录总 token/费用、任务完成率、输出被人工修改的比例、返工次数、延迟和主观质量评分。
5. 只有在 token 明显下降且质量不下降或可接受时，才把该配置纳入日常流程；若质量下降，则只对低风险子任务使用。

*F1、F2a、F2b、F3 怎么选*

- 目标不同：F1 是“别让另一份闲置配额白白浪费”，主模型仍是重模型；F2a/F2b 是“不为不需要 Opus 的工作付 Opus 的价格”，主模型换成轻模型；F3 是“只把子代理固定为更轻的 Haiku”，不改变主模型和顾问。不要混着抄。
- 入口不同：F2a 是会话内命令，F2b 是启动参数，F3 是启动时的环境变量。F2b 内部还有两种写法：能指定顾问模型就写 `--advisor opus`；只显示开关就写 `--advisor`。
- 先运行 claude --help：如果 --advisor 存在，优先按 F2b 的最小对照试；如果只有 /advisor 存在，退回 F2a；如果只想让子任务少花 token，先试 F3；如果都不存在，只保留“贵模型只用在决策点”这一条分配原则。
- 模型名与命令语法在给定材料里都无法核实；先确认命令或环境变量存在，再小范围试。
- 材料未说明它们能与 A–I 的网关/路由自动集成，也未说明 F1/F2a/F2b/F3 之间可以叠加；先分开试。

**做法 G：在 Claude Code 内按窗口/别名路由，并把 429 故障转移钉住（model-relay）**

前提：Node.js 20+，Claude Code 2.1.287+；至少一个备用 Anthropic 兼容端点；接受这是单人本机守护进程。

1. 先把 API key 设进环境变量，再启动 Claude Code：

```sh
export BACKUP_API_KEY="your-api-key"
setx BACKUP_API_KEY "your-api-key"
```

2. 安装插件：

```sh
claude plugin marketplace add cablate/model-relay
claude plugin install model-relay@model-relay
```

3. 让 Claude 陪你完成配置：

```text
/provider setup
```

或直接带目标：

```text
/provider setup use deepseek for haiku
```

4. 手动路径：

```text
/provider init
```

然后加 provider：

```bash
node tools/setup.mjs add <name> --preset <preset> --model <model id> --token env:<VAR>
```

前提：node tools/setup.mjs 要在插件安装目录里跑，即 ~/.claude/plugins/cache/model-relay/model-relay/<version>/；在别处要用该目录下 tools/setup.mjs 的完整路径。改完重启 Claude Code。

5. 自检：

```text
/provider doctor --ping
```

期望看到 Config OK、provider 出现在 Providers 下、Upstream ping 下有一个 ✓。

6. 把 haiku 类请求导到便宜/备用 provider：

```bash
node tools/setup.mjs alias
node tools/setup.mjs alias haiku backup
node tools/setup.mjs alias haiku claude
node tools/setup.mjs alias subagent sonnet
```

7. 给单个 provider 配专属子代理。在 ~/.claude/model-relay.json 里：

```json
"providers": {
  "backup": {
    "model": "your-model-id",
    "agent": {
      "description": "Use for routine, well-scoped tasks: code search, summaries, small edits.",
      "effort": "medium",
      "maxTurns": 40
    }
  }
}
```

8. 配 429 故障转移链：

```bash
node tools/setup.mjs providers
node tools/setup.mjs add local --url http://127.0.0.1:4000 --model your-local-model-id --token env:LOCAL_GATEWAY_TOKEN
node tools/setup.mjs set failover.chain backup,local
node tools/setup.mjs set providers.local.fallback none
```

相关默认值：failover.enabled 默认 true；failover.chain 默认空；failover.cooldownMs 默认 600000（10 分钟）；retry.attempts 默认 3；retry.delayMs 默认 2000；retry.backoff 默认 2；retry.maxDelayMs 默认 10000；retry.failover 默认 false。

9. 把状态接进自己的 statusline。

10. （可选）用 Remote Control 又不想丢掉路由：

```bash
node tools/setup.mjs proxy enable --go
node tools/setup.mjs rc
```

11. 从 0.6 及更早版本升级的额外动作：

```text
/provider setup upgrade my model-relay config
```

或手动（node tools/setup.mjs migrate → migrate --go → /provider restart）。

**做法 H：按工作类型路由并固定 skill/MCP 版本，先用 verdict 记录结果（cedr）**

前提：cedr 处于 preview，1.0 前命令与文件格式仍可能变；先只准备 2 个 harness（如 Claude + Codex），只定义 2 条 route，不铺开。

1. 安装 CLI。Linux x86_64 示例：

```sh
curl -fsSL https://github.com/Sheernox/cedr/releases/latest/download/cedr-x86_64-unknown-linux-gnu.tar.gz | tar -xz
install -m 755 cedr-x86_64-unknown-linux-gnu/cedr ~/.local/bin/cedr
cedr --version
```

不想用二进制时：

```sh
cargo install --locked --git https://github.com/Sheernox/cedr cedr
```

2. 描述“计划”和“路由”，写入 ~/.config/cedr/routes.toml：

```toml
version = 1

[orchestrator]
harness = "claude"
model = "opus"

[harnesses.claude]
expect = ["five_hour", "seven_day"]
effort_option = "effort"

[harnesses.codex]
expect = ["primary"]
effort_option = "reasoningEffort"

[[readings]]
kind = "claude-statusline"
harness = "claude"

[[readings]]
kind = "codex"
harness = "codex"

[routes."review.code"]
work = "Independent review"
role = "review"
candidates = [
  { target = "codex/sol", effort = "high", tier = 1 },
  { target = "claude/sonnet", effort = "high", tier = 1 },
  { target = "self" },
]
```

3. 让 cedr 读到 Claude Code 的计划用量。写入 ~/.claude/settings.json：

```json
{ "statusLine": { "type": "command", "command": "cedr route statusline" } }
```

4. 选取，并回填结果：

```console
$ cedr route pick review.code
$ cedr route verdict p-979e77351990 accepted
```

cedr route stats 会显示每类工作上哪个模型表现最好。verdict 取值为 accepted、reworked、redone、rejected。辅助命令：cedr route pools、cedr route list。

5. 多厂商评审门禁：

```sh
cedr council plan <route>
cedr council merge <reports>...
```

6. 固定技能与 MCP server：

```sh
cedr lint
cedr lock
cedr verify
```

注意：cedr lock 只有在传 --introspect 时才会真正运行 MCP server。

7. 从 agent 里直接调用：

```sh
claude mcp add cedr -- cedr mcp
codex mcp add cedr -- cedr mcp
```

8. 凭据与数据边界：默认不要开 sync。

9. 最小试用：建议 1 人 × 2 周，不铺开。只装 CLI，只配 2 个 harness，只定义 2 条 route；第一周只用 pick + verdict。

**做法 I：贵模型规划、廉价模型写码、测试当裁判（Cheap Agent）**

前提：已安装 Claude Code；Node.js 20+；一个充值了几美元的 API key；macOS/Linux（Windows beta，需要 Git for Windows）；项目里有能跑、能覆盖改动的测试套件。未执行 /cheapag:allow 前不会外发代码。

1. 让 Claude Code 代为安装（最省事路径）。把下面这段原样贴进 Claude Code：

```text
Set up Cheap Agent (npm: cheap-agent) for me.
1. Ask me: which provider (OpenRouter recommended, DeepSeek or OpenCode Go), and which models (balanced is the default; cheapest, strongest, or my own provider/model).
2. Check that node is 20+ and the claude CLI is installed.
3. If I picked my own model, save {"models":{"implement":"<model>"}} in ~/.config/cheapag/config.json, keeping what else is there.
4. Give me the command to run in my terminal: npx cheap-agent login --preset <my choice, or custom>, and which number to pick for my provider.
5. When I say done, check `claude mcp list` shows cheapag, then tell me to run /cheapag:allow in a new Claude Code session in my project.
```

2. 或手动安装：

```bash
npx cheap-agent
```

3. 在每个项目里授权一次：

```text
/cheapag:allow
```

4. （可选）项目级配置。在项目根放 cheapag.json：

| 设置 | 默认值 | 作用 |
| --- | --- | --- |
| takeover | "sonnet" | 廉价模型做不完的步骤由谁接手：Sonnet 助手，或 "self"（Opus 自己做，上限 15 次工具调用） |
| limits.max_turns | 25 | 廉价模型每一步最多可用轮数 |
| models | 安装时的选择 | 使用哪些廉价模型 |

5. 照平常方式提需求。常用命令：

| 命令 | 作用 |
| --- | --- |
| /cheapag:allow | 授权本项目代码发给廉价模型，每个项目一次 |
| /cheapag:status | 查看近期任务和廉价模型已花费金额 |
| /cheapag:hook on | 强制 Claude 必须把代码改动交给廉价模型，不许自己动手 |
| /cheapag:clean | 清理旧的任务目录 |

6. 人工审 diff 并自行提交。工具从不 commit 或 push。

7. 更新与卸载：

```bash
npx cheap-agent@latest
claude plugin uninstall cheapag@cheapag
claude mcp remove -s user cheapag
```

**做法 J：按“是否动架构”选模型，长途换模型前先 /compact（Claude Code + Herdr）**

前提：已安装并登录 Claude Code CLI；有 2 个以上可并行推进的编码任务；确认你的环境里存在原文所称的 Fable、Opus 或等价模型；确认 /compact 与 /model 命令存在；Herdr 的安装与命令原文未给，需查其文档。

1. 收敛工具面：把编码工作集中到 Claude Code 一个入口。
2. 用 Herdr 管多会话：把并行任务拆成多个 session。
3. 动手前给任务打标签：会改变模块边界、接口、数据流 → `动架构`；否则 → `不动架构`。
4. 按标签派模型：原文规则是涉及架构的改动用 Fable，与架构无关的动作用 Opus；模型名先在你的环境里核对。
5. 中途需要换模型时分两种情况处理上下文：上下文已经很长 → 先 `/compact` 再 `/model`；上下文还短 → 直接 `/model`。
6. 做 1–2 周最小试用：选 5–8 个真实编码任务，动手前打标签；记录中途换模型次数、换模型后需要重新交代背景的次数、单任务墙钟时间、返工轮次、架构类改动的事后返工率。

**做法 A / B / C / D / E / F / G / H / I / J 怎么选**

- 主要痛点是跨供应商配额、限流、死 key、工具输出烧 token：先做 A。预算红线先用 auto/subscription；想先榨干套餐额度再降最便宜付费选项用 auto/thrifty；auto/chaos 会成倍消耗上游调用，除非你就是要多模型交叉验证。
- 已经在用 Codex，痛点是“常规任务也调用最重模型”且想用确定性 grader 验收：先做 B。
- 想让多个工具从一个面板统一改配置、按任务换模型，并先拿免注册的免费模型打通：做 C。
- 痛点是“同一任务不知道该交给哪个 harness/模型/effort”，或者想按会话看成本与上下文：先做 D。
- 想先在 Python 代码里把多 provider 的调用收敛成一个函数，或者需要按项目/用户的成本追踪、虚拟密钥、Terraform 云部署：做 E。E1 只动代码、零运维，E2 起网关后才会碰端口和密钥。
- 日常用 Claude Code、主模型已就位、另有闲置模型配额：先做 F1。
- 日常用 Claude Code、对成本敏感、主要任务是代码编辑，想让贵模型只出现在判断点上：先试 F2b（启动参数），用 claude --help 确认 --advisor；不存在则试 F2a（会话内命令）。F2b 能指定顾问模型就写 `--advisor opus`；只显示开关就写 `--advisor`，后者要自己观察顾问是谁、是否介入。
- 日常用 Claude Code、只想让子任务用更轻的模型，且能接受输出质量对照：先试 F3。
- 日常用 Claude Code、痛点是“模型设置全局绑定所有窗口”或 429 限流，且你有备用 Anthropic 兼容端点：先试 G。
- 你已经在 Claude Code、Codex、Cursor 或 Gemini 之间分配工作，想把“哪类工作交给哪个 agent/模型/effort”写成规则：先试 H 的 route pick + verdict。
- 日常用 Claude Code，任务中等规模、项目有可运行测试，想让 Opus 只做规划和决策、廉价模型写码：先做 I。
- 日常用 Claude Code、同时推进多个互不干扰的任务，想按“是否动架构”选模型并管理换模型时的上下文：先试 J。
- A 和 C 是同一层的本地 OpenAI 兼容网关，功能重叠，且默认端口都是 20128：先选一个跑通。E 默认 4000，model-relay 默认 8950，不撞端口；端口不撞不代表能自动叠加。
- G 是 Claude Code 插件 + 本机 127.0.0.1:8950 的 Anthropic 兼容路由守护进程，和 A/C、E 不是同一层。
- H 是叠在 harness 之上的编排与门禁层，不是请求转发网关。
- I 是 Claude Code 内的插件/MCP 扩展，改变的是 Claude Code 内部“谁写代码”的分工。
- J 是 Claude Code 内的人工使用规则，不是插件、不是网关，也不是编排层。
- 所有项目都未说明可以互相集成。如果确实要同时装，先把各自跑通，再自行验证请求实际走哪条路径；不要默认叠加。

**暂时不要碰的部分**：OmniRoute README 提到的 MCP（110 个工具）、A2A、memory、guardrails、evals、TLS stealth、key pools 公平配额，在给定材料里只有名词，没有配置步骤；安装/首次运行章节、combo 完整策略语义、压缩的具体配置项也不在本次材料里。agent-smith 的“多 agent 协作、重试、失败升级带来的收益”需要单独实验。FlagshipRouter 的 Media Models 页面和 Agent Skills 页面没有用法。Gluon 的 routing.yaml、权限与工具供给、安全隐私、成本分析示例、故障排查都不在给定材料里。LiteLLM 的 MCP 登记细节、Docker 快速上手、E2E 教程都在 docs。Claude Code /advisor 的顾问介入方式、效果说明、与网关集成都未在原文中展开；F2b 那一支的原文连 Haiku 只读怎么配都没写全，本次推文又只给了一条命令和一句 “Haiku swarms”，没有配置；F3 只给了一条环境变量。model-relay 的调研正文在“对应研究问题”处被截断。cedr 的 Council 报告格式、quorum 默认值、merge 输入形态未展开；最小试用第二周具体动作在原文“第二周在 2–3”处截断。Cheap Agent 本次材料只有 README，未查看源码。Herdr 的安装、配置与命令，以及 J 原文第 5 条都不在材料里。

## 怎么判断变好了

最小试用：

- Claude Code 顾问模式（F2b，先做这一条，成本最低）：先跑 `claude --help` 确认 `--advisor` 存在并看清它是开关还是可带模型名。挑 2–3 个真实、有明确对错标准的任务（有测试覆盖的 bug 最好），用同一提示词跑三组：`claude --model sonnet`（基线）、`claude --model sonnet --advisor opus`（实验组；若 help 只显示开关则换成 `claude --model sonnet --advisor`）、`claude --model opus`（对照组，可选）。每次记录 `/cost` 或等价用量、是否一次通过、人工返工次数、耗时、顾问是否实际介入、需要人工升级到 Opus 的次数。只有同质量下明显省钱，或同成本下明显少返工，才写进默认工作流；命令不存在、或质量下降且成本未降，就停。本次推文的建议也是小范围试、记录成本与返工，不能直接采纳为完整流程。
- Cheap Agent（先一个中等规模任务）：选一个中等规模的真实任务（新功能或真实 bug，跨几个文件），确认项目现有测试能在本地跑通。先用纯 Claude Code 记录基线：Opus token 用量、轮数、最终测试通过数。装好 Cheap Agent，在项目内执行一次 /cheapag:allow，保持默认 takeover="sonnet"、limits.max_turns=25。用同一条提示词重跑同类任务，记录同样指标，并额外记录 /cheapag:status 里的廉价模型花费。开 /cheapag:hook on 再跑一轮。
- OmniRoute（先 1–2 天跑通，再 1–2 周对照；早期材料建议试三周，可作为上限）：只接 2–3 个 provider（1 个付费主力 + 1 个免费备用）；只改一个客户端的 base URL；模型先用 auto 和 auto/coding 两个别名；有预算红线就用 auto/subscription 跑一天；同一批真实任务一半走网关、一半直连原 provider。
- agent-smith（先零成本离线验证）：克隆仓库 → 按步骤 1–2 安装并检查 → 步骤 6 跑 demo 与 report 两条离线命令。确认通过后，准备 5–10 个日常常规 Coding 任务，分成两组：一组用 Use $adaptive-route for this task: …，一组固定用你平时最重的模型。
- FlagshipRouter（半天以内，全部本地）：clone + npm run launch -- --host 127.0.0.1，先去 Settings 把密码从 123456 改掉；在 Models 里挑一个 OpenCode Free 的免注册模型，用 curl 打通一条请求；用 CLI Tools 只给一个当前已在用的工具写配置，并记录原配置以便回滚。
- Gluon（非关键、已纳入版本控制的仓库）：装好，cd your-repo && gluon 启动；选一个边界清晰的小任务，让 intake agent 推荐 agent/model/effort，记录它给出的 spec；再手动用第二个 harness 或模型做同一任务，比较结果。
- LiteLLM（分两半，先 SDK 后网关）：先用 uv add litellm，用同一个 completion() 分别调 openai/gpt-4o 和 anthropic/claude-sonnet-4-20250514；再用 uv tool install 'litellm[proxy]' + litellm --model gpt-4o，用 OpenAI SDK 片段把 base_url 指向 http://0.0.0.0:4000 打通一条请求；只接 1–2 个模型，连续几天看成本追踪与失败率。
- Claude Code /advisor（F1，单个项目、单个会话）：按做法 F1 执行 /model fable（如提示计费则确认）与 /advisor fable，然后照常完成一个日常任务，全程记录顾问模型是否真的产出了可见内容。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a）：先在官方文档或 claude --help 核对命令语法，再挑一个真实的中等复杂度改动任务跑两次——A 组按本配置，B 组全程用 Opus 或你原本的默认方式。
- Claude Code 子代理固定为 Haiku（F3，5–10 个有代表性的任务）：同一提示词分别跑默认配置与 CLAUDE_CODE_SUBAGENT_MODEL=haiku claude；记录总 token 或费用、任务完成率、输出被人工修改的比例、返工次数、延迟和主观质量评分。
- model-relay（先一个别名、一个备用 provider）：先设好永久环境变量并开新终端；装插件；用 /provider setup 或 /provider init + add 只加一个备用 provider；用 /provider doctor --ping 看到 Config OK 与 Upstream ping ✓；先只做 alias haiku backup；再挑一次真实 429 或配额耗尽，确认会话被钉到 failover.chain 第一个 provider。
- cedr（1 人 × 2 周，只配 2 个 harness 和 2 条 route）：第一天接 statusline 并确认 cedr route pools 能读到真实剩余量，读不到就停。第一周只用 cedr route pick 和 cedr route verdict，不启用 Council、不加 sync；每类工作积累 15–20 次 pick 与 verdict 后用 cedr route stats 看分布。
- 按“是否动架构”选模型 + /compact（J，1–2 周）：选 5–8 个真实编码任务，动手前各打 `动架构`/`不动架构` 标签；动架构走 Fable，不动架构走 Opus（模型名先确认在你环境里存在）。一旦发现派错，记录当前会话大致长度：长则 `/compact` 再 `/model`，短则直接 `/model`。

要记录的指标：

1. 任务是否完成、需不需要人工返工；
2. 返工/追问的轮数；
3. 该次会话的 token 消耗与费用（用 Claude Code 自带的 `/cost` 或等价用量/费用查看方式）；
4. 复杂决策点上 Opus 被实际调用的次数与效果；
5. “后悔没用 opus”的次数（决策被顾问模型纠正或放行的次数）；
6. 子代理相关调用的 token 是否下降（F3），以及子任务输出被人工修改的比例；
7. 顾问是否真的介入、介入了几次（F1、F2a、F2b 两种写法都看这一条）；
8. OmniRoute 的中断次数：一周内因 rate limit/额度耗尽导致的任务失败或等待次数；
9. OmniRoute 的单位任务成本：同一批任务的 token 数与花费，网关组 vs 直连组；
10. OmniRoute 的 p95 延迟：看板里的 p95 与实际体感；
11. OmniRoute 的压缩收益：挑 3 个“工具输出很长”的典型任务，记录开启压缩前后的输入 token 数；
12. 质量对照：同批任务两组的返工率/一次通过率；
13. 稳定性：网关自身宕机时长、回退触发次数与回退后的成功率；
14. 人工干预次数：一周内你手动换模型/换 key 的次数是否下降；
15. 任务接受率：用 accepted / rejected / unknown 记录；最好自己写确定性检查；
16. unknown 比例：缺失用量或价格会被记为 unknown；unknown 占比过高说明计量覆盖不足；
17. 配额真实性：把 /dashboard/free-tiers 显示的 used/remaining 与供应商后台账单对照；
18. 首次跑通耗时、切换成本、副作用与可回滚（FlagshipRouter）；
19. 单位任务成本与上下文占用、选择成本与补问次数、任务完成质量（Gluon）；
20. 供应商切换成本、每项目/用户成本、失败率与重试/回退次数（LiteLLM）；
21. 顾问是否真实介入（F1）、贵模型实际被调用几次（F2a/F2b）、子代理 token 占比与子任务质量（F3）；
22. 429 中断与自动故障转移、按窗口切换是否真的隔离、钉住与冷却、别名路由是否精确、重试与最终成功率、proxy 模式副作用、成本与质量对照（model-relay）；
23. cedr 的 route × model 统计：用 cedr route verdict 回填 accepted/reworked/redone/rejected 后，看 cedr route stats；观察 cedr route pools 与真实计划用量是否一致；观察 cedr verify 的退出码；
24. Cheap Agent 的 Opus token 与轮数是否下降、廉价模型花费、测试通过数是否不降、Sonnet 接手次数、/cheapag:hook on 后的质量、diff 被人工修改比例；
25. 中途换模型次数 / 每任务（J）；
26. 换模型后需要重新交代背景的次数（J）；
27. 单任务墙钟时间与返工轮次（J）；
28. 架构类改动的事后返工率（J）；
29. 多 session 并行时的任务串味/冲突次数（J）。

试多久、什么情况下停：

- Claude Code 顾问模式（F2b）：先按 2–3 个任务、三组对照（sonnet / sonnet+advisor / opus）跑一轮；若 `--advisor` 不存在、质量下降且成本未降、或顾问全程不介入，就停用并把结论降为 study。本次推文没有给试用时长，这一批任务就是最小试用；只有成本下降且质量不降，或质量提升足以抵消成本，才扩大使用。
- Cheap Agent：先按一个中等规模任务、同一条提示词、默认配置 vs 开启 Cheap Agent 做一轮；再开 /cheapag:hook on 做一轮。若测试跑不起来或覆盖不足、质量下降、Opus token 不降、廉价模型花费反而更高、或合规不允许代码外发，就停用。
- OmniRoute：先用 1–2 天跑通并确认 auto/subscription 真的失败即停，再连续 1–2 周做对照；早期材料建议观察三周。若中断次数/人工切换次数没有下降，或配额显示与实际账单明显不符，或压缩导致答案质量下降，或免费 provider 出现条款风险，或网关本身成为新的不稳定源，就停用。
- agent-smith：成功标准建议：在接受率不下降的前提下，参考成本或实际 token 明显下降；若接受率下降或 unknown 比例高，先回到离线 benchmark 检查判分与计量的可靠性。
- FlagshipRouter：先按半天的最小试用跑通，再决定要不要多用几天。只要出现“模型连通但结果明显变差”或“配置互相覆盖且难回滚”，就停止推广。
- Gluon：材料没有给出试用时长建议，只建议小范围试。若质量明显下降，或成本/上下文没有可见改善，就停用。
- LiteLLM：SDK 最小验证半天内做完，网关最小验证再半天。若两天内你还说不清“换 provider 省了几步、成本数字是否可信”，就停在 SDK 层，不要上网关和 Terraform。
- Claude Code /advisor（F1）：先按单个项目、单个会话判断；若 /advisor 不存在、顾问全程不介入，或多次任务中开/不开顾问没有可观察差异，就停用。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a）：先按单个任务、单个会话、单个中等复杂度改动判断；若命令或参数不存在、语法对不上、质量下降、或顾问调用次数高到费用接近全程 Opus，就退回原方式。
- Claude Code 子代理固定为 Haiku（F3）：先按 5–10 个任务的一批判断；若 token 没有明显下降或质量下降，就停用或只限低风险子任务。
- model-relay：先只接一个备用 provider、只开 haiku alias，至少覆盖一次真实 429 或配额耗尽事件；若 429 中断/人工切换次数没有下降，或按窗口切换没有隔离，或 alias 没有按预期路由，或 proxy 模式让 git/curl/gh 变得不稳定，就停用。
- cedr：原文建议 1 人 × 2 周不铺开，但第二周动作在材料中截断。若 cedr route pools 读不到真实剩余量、pick/verdict 15–20 次后仍看不出分布、cedr verify 误报或漏报、锁文件导致无法维护、Council 的 quorum/报告格式无法落地，就停用或只保留 lint/lock/verify 中确实有用的部分。
- J：1–2 周后若中途换模型次数、重新交代背景次数、返工轮次都没有改善，或 /compact 导致的重复解释代价大于换模型收益，就降级为 study，只保留“按架构相关性选模型”这一思路。

## 常见坑

- 把 `--advisor` 不带模型名当成与 `--advisor opus` 等价。材料没有说明不带模型名时代替的是哪个顾问、何时触发、如何配置；两种写法先分开对照。
- 把本次推文的“Sonnet builds, Haiku swarms, Opus advises”当成完整方案。Haiku swarms 没有命令、配置或触发方式，正文在 here's 处截断；只能把 `claude --model sonnet --advisor opus` 当候选命令做小范围对照。
- 把推文里的“效果更好、token 省很多”当结论。该推文只给了一条启动命令，没有数据、案例或对比；可核实互动量只有 58 赞、8 次转发、6 条回复。
- 把“Anthropic 刚分享”当出处。推文没有给链接，正文约 100 字，且疑似在命令行后截断。
- 把“Haiku 5.5 / Opus 5.5”当可核实版本名。它们只是材料里的说法，没有版本来源；执行前以你环境里的模型列表为准。
- 只跑实验组、不跑基线。没有 `claude --model sonnet` 的基线，就无法判断“sonnet+advisor”省在哪里；至少还要留一个 `claude --model opus` 对照组。
- 忘记记 `/cost` 和耗时。顾问介入可能拖慢速度，只看 token 不看墙钟时间会漏掉代价。
- 把 Cheap Agent 当“装上就省钱”。它依赖可运行测试和书面短任务；无测试、极小任务、最难 bug 可能无收益或略差。
- 未执行 /cheapag:allow 就以为代码已外发，或反过来没注意已经授权。
- 把 API key 粘到聊天里。用 npx cheap-agent login 在终端输入；setup 提示明确 never ask for my key。
- 忽略代码外发合规。Cheap Agent 会把代码发给第三方 provider；敏感项目先过审。
- 把 takeover="self" 当默认。默认是 "sonnet"；self 是 Opus 自己接手，上限 15 次工具调用。
- 把 max_turns=25 当无限循环。它是每步上限。
- 以为 Cheap Agent 会 commit/push。它从不 commit 或 push，改动未提交，必须人工审 diff。
- 在 Windows 上按稳定版期待 Cheap Agent。Windows 为 beta，首次任务可能约 2 分钟；引擎崩溃可能留下 opencode.exe；廉价模型在其项目副本里读不到 node_modules 这类依赖目录。
- 把 Cheap Agent 的作者自报数字当结论。demo、SWE-bench、Windows 自举都是单方单次对照，没有样本量/重复次数/随机性控制。
- 把 Cheap Agent 与 model-relay/cedr 等叠加。材料未说明可集成；先分开试。
- 把 README 的自述数字当结论。OmniRoute、agent-smith、FlagshipRouter、Gluon、LiteLLM、model-relay、cedr、Cheap Agent 的数字大多没有可复现测量方法或第三方复核。
- 以为零凭证一定能 curl 通 OmniRoute。新调研的 README 要 Authorization 头，且全新安装可能没有可用 keyless 目标。
- 照抄 OmniRoute 的安装命令。本次材料在安装/首次运行章节被截断，npm i -g omniroute 和 Docker 镜像名只是线索；执行前回 README Quick Start 补齐。
- 照抄 OmniRoute 的 combo 策略表。本次原文在策略表第 3 条处被截断，round-robin 及后续策略语义不完整。
- 把 auto/subscription 和 auto/thrifty 混用。有预算红线就用 subscription。
- 把 auto/chaos 当故障注入。它是并行 fan-out，会成倍消耗配额。
- 忘记 OmniRoute 是单点。它挂了，所有客户端一起挂；保留直连回退路径。
- 忘记核对免费供应商条款。OmniRoute README 自己披露有供应商因条款风险被标记为 avoid，本次材料点名 Kiro。
- 把多把第三方 key 交给一个本地服务。OmniRoute README 称 key 本地加密，但没有给出可照做的验证方法。
- 只信 dashboard。savings 卡片不等于你自己的 p95 和账单；把 /dashboard/free-tiers 的 used/remaining 与供应商后台对照。
- 一次把所有工具都切到网关。先只接一个，保留直连对照。
- 端口撞车。OmniRoute 与 FlagshipRouter 默认都监听 localhost:20128；LiteLLM 默认 4000，model-relay 默认 8950。
- FlagshipRouter 默认面板密码是 123456。建议先用 --host 127.0.0.1 只本地监听。
- 把 FlagshipRouter 的测试不全绿当成自己装坏了。README 自陈套件带已知失败。
- 拿 README 的示例模型名当真实模型。FlagshipRouter 的 gpt-6-astra 只是示例。
- CLI Tools 页面会代替你写工具配置，可能覆盖原配置。先记录原配置，确认能回滚再往下走。
- 照抄 Gluon 的路由配置。给定材料是 README landing page，细节在 docs。
- 把 Gluon 的安装方式当成有校验的安装。原文给的是管道执行远端脚本，材料没有给出校验步骤。
- 用 Gluon 时忽略代码库的权限与数据边界。先在非关键、已纳入版本控制的仓库里试。
- 以为 Gluon 会自动触发任务。多会话仍需人工切换推进。
- 把 Gluon 当成 OmniRoute / FlagshipRouter 的替代。D 是会话层控制平台，A/C/E 是请求层网关。
- LiteLLM 的 litellm 与 litellm-core 不能同环境同装。
- LiteLLM 的 MCP OAuth：上游可能宣称支持动态客户端注册，但实际用 HTTP 401/403 拒绝请求；可能需要预注册 OAuth app 并配置 credentials。
- LiteLLM 的生产部署别用明文。没有 ACM 证书时 allow_plaintext_alb = true 按 README 只限 dev/trial。
- 照抄 LiteLLM 的 Terraform。抓到的原文在 Terraform 输出段被截断。
- 把 LiteLLM 的 A2A / MCP Bridge 当现成能力。原文在这两处被截断。
- 把 Claude Code 的 /advisor 当必然存在。执行前先确认版本支持，命令不存在就停。
- 照抄 /advisor fable 和 /model fable 里的模型名。不同计划的计费确认方式可能不同。
- 以为挂上顾问就会自动介入。必须观察它是否真的给出可读建议。
- 把 claude -> model sonnet -> advisor opus 当一条 shell 命令抄。原文用箭头书写，很可能表示会话内依次执行的命令。
- 把 `claude --model sonnet --advisor opus` 当跨版本通用命令。执行前必须用 claude --help 或 /help 确认参数存在。
- 照抄 F2a/F2b/F3 里的模型名。Sonnet、Opus、Fable 5.1、Haiku 5.5 都无法从给定材料核实。
- 自己脑补 Haiku 那一环的配置。F2a/F2b 原文都在 Haiku 处被截断，本次推文也只给了一句口号。
- 把 CLAUDE_CODE_SUBAGENT_MODEL=haiku claude 当成完整三模型协作方案。F3 原文只给这一条环境变量。
- 以为设置子代理模型就等于“只读 Haiku”。它只指定子代理用哪个模型，不规定只读权限。
- 把 F3 与 F2b 叠加。材料未说明可叠加，先分开试。
- 原文没有给 CLAUDE_CODE_SUBAGENT_MODEL 的版本要求；执行前先确认环境变量在你的版本里存在。
- 把“更好的输出，消耗的 token 少得多”当结论。F3 原文没有给对比数据。
- 把“不为不需要 Opus 的工作付 Opus 的价格”当成效果结论。原文只有成本主张，没有数据、基准、案例或成本对比。
- 以为 F2a/F2b 一定省钱。顾问触发过于频繁会把成本优势吃掉；触发过少，复杂改动的质量可能下降。
- 把 F2a/F2b 写进团队默认流程。原文被截断、没有文档链接和版本号，先在个人、单项目、单会话里试。
- 把 F1、F2a、F2b、F3 混着抄。四者目标不同，模型分工和入口也不同。
- 把“别让配额白白浪费”当成效果结论。F1 的原文没有给出任何成本、效果或对比数据。
- 把 /advisor、--advisor 或 CLAUDE_CODE_SUBAGENT_MODEL 与 A–I 的网关/路由混为一谈。材料未说明可集成；先分开试。
- 以为装了 model-relay 就自动把请求导出去。新配置下 haiku 及所有请求默认留在 Claude，不加 alias 不会外流。
- 在已经跑着 Claude Code 的 shell 里 export key。key 由 router 进程从它继承的环境里读；要写成永久变量并开新终端。
- 在任意目录直接跑 node tools/setup.mjs。手动路径要在插件安装目录里跑。
- 把 key 粘到聊天里。用 /provider setup 时，setup 工具会替你跑，不会让你把 key 粘到聊天里。
- 拿只会 OpenAI Chat Completions 的端点直接接 model-relay。model-relay 要求 provider 能接 Anthropic /v1/messages。
- 把 429 故障转移理解成“全局切换”。429 时只把请求转给 failover.chain 第一个 provider，并把这个会话钉住 7 天。
- 把 proxy 模式当无感隧道。Claude Code 跑的命令也会走 relay 当盲隧道，router 挂了它们就失败。
- 从 0.6 及更早版本升级只更新插件。0.7+ 只读 "format": 2，要迁移。
- 把 doctor 当成会自动修。doctor 默认只报告、不改动；加 --fix 才让它自己修。
- 把 /provider 面板当成全局切换。它切的是“当前这个窗口”。
- 把 model-relay 当团队多租户代理。作者自己说那种场景应该用 LiteLLM。
- 把 cedr 当稳定标准。它处于 preview，1.0 前命令与文件格式仍可能变。
- 以为 cedr 能自己拿到所有 harness 的用量。原文只具体说明了 claude-statusline 与 codex 两种 kind。
- 把 cedr Council 当开箱即用。reviewer 报告格式、quorum 默认值、merge 的输入形态原文未给，需读 docs/council.md。
- 忘记 cedr route sync 会外发数据。默认不要开。
- 让 cedr lock 执行了第三方 MCP server。只有传 --introspect 时才真正运行 MCP server。
- 把 cedr.lock 当成不会误报。server 的工具、描述或网络主机变化会让 verify 失败。
- 把 cedr 的示例输出百分比当实测。balanced:31%<claude=64% 等是演示用输出样例。
- 材料本身是截断的。OmniRoute 本次原文在策略表第 3 条处被截断；Gluon 的给定文本也只是 README landing page；Claude Code 的三支原文都在关键处中断；本次推文在命令行结束后也疑似截断；F3 只给了一条环境变量；model-relay 的调研正文在“对应研究问题”处被截断；cedr 的最小试用原文在“第二周在 2–3”处截断；Cheap Agent 本次材料只有 README。
- 名称相近但关系不明。OmniRoute 材料里作为 keyless 免费后端的 “OpenCode Free”（oc/…）与别处提到的 OpenCode 名称相近，但原文没有说明两者是否同一项目；FlagshipRouter 也把 OpenCode Free 列为免注册可用模型来源；Cheap Agent 原文说廉价模型的执行引擎是 OpenCode，但同样没有说明关系。
- agent-smith 的 USD 数值是“实测用量 × 冻结的 API Standard 参考价”，不是 Codex 订阅账单。
- agent-smith 的难度打分是本地、未校准的启发式；缓存效应与用量覆盖不全会影响成本对比。
- agent-smith 除 Astra、6.1 Sol 外，原文没有给出被路由模型清单、支持的任务类型或失败案例。
- agent-smith 分发为源码优先，无预打包 DMG，构建为 ad-hoc 签名；Float 仅 macOS 14+。
- 把 Fable/Opus 当确定模型名照抄。Fable 不是常见公开模型名，可能是笔误或内部别名。
- 把原文当成完整清单。J 在“- 不用”处被截断，第 5 条缺失。
- 换模型前无脑 /compact。/compact 会丢细节；压缩前把接口签名、报错、决策理由写到文件或消息里。
- 以为 Herdr 会自动并行推进。原文只提到用它管理多个 session，没有安装、配置或自动触发细节。
- 把“按架构选模型”当效果结论。原文只有个人几个月习惯，69 赞、8 回复，没有数据、案例或对比实验。
- 把 J 与 F/G/H/I 叠加。材料未说明可集成，先分开试。
- 这些项目、F3 这条推文、J 这条推文、本次 @0xVeyyro 推文以及各 Claude Code 扩展的材料都未说明可集成；同时安装或叠加配置时不要假设请求一定经过你以为的那一层。

## 证据与来源

本节区分可照做的操作、项目自述数据和材料边界。

**Cheap Agent**：可照做的操作性内容包括 npm 包 cheap-agent、npx cheap-agent、Claude Code 代为安装的提示词、npx cheap-agent login --preset、/cheapag:allow、/cheapag:status、/cheapag:hook on、/cheapag:clean、cheapag.json 的 takeover/limits.max_turns/models、更新与卸载命令。作者自报但无第三方复核的数据：demo 同一提示下纯 Claude Code 233k Opus token，加 Cheap Agent 132k，廉价模型花费 $0.007；同一功能同一提示纯 Claude Code 154k Opus token / 5 轮，加 Cheap Agent 57k / 2 轮（少 63%），廉价模型花费半美分，两者都通过全部测试；SWE-bench Verified 日常 7 个 bug 1.6M→655k（少 59%），双方 7/7；最难 9 个 3.0M→1.3M（少 55%），6/9 对 7/9，剩余由 Sonnet 助手完成；Windows 原生支持 36 文件、+753/−278 行、30 个 job、$0.29。作者承认的局限：最难一档略逊、极小任务没有收益、只在“真实代码里的真实功能和真实修复”这段中间地带有效、Windows 为 beta、首次任务可能约 2 分钟、引擎崩溃会留下 opencode.exe、廉价模型在其项目副本里读不到 node_modules 这类依赖目录；所有数字都是作者单方、单次运行的对照，没有说明样本量、重复次数与随机性控制，SWE-bench 数字未给可复现脚本；本次材料只有 README，未查看源码，无法核实 worktree 隔离、hook 阻止逻辑和凭据存储的实现细节；代码会发送给第三方 provider，合规敏感场景需先过审。

**OmniRoute**：可照做的操作性内容包括 npm 包 omniroute、Docker 镜像 diegosouzapw/omniroute、默认端点 http://localhost:20128/v1、Dashboard → Endpoints 取 key、带 Authorization 的 curl、auto 别名表、combo 四层、/dashboard/free-tiers 与 live analytics、tos: avoid 的 provider 默认排除。项目自述但未验证的有 375 个 provider、1475 个 chat 模型 ID、37 个集成、MCP 110 工具、56,000+ 静态测试、~1.62B 免费 token/月、压缩省 15–95% 等；材料在策略表第 3 条处截断，安装/首次运行、combo 完整策略和压缩配置不完整。

**agent-smith**：可照做的有 codex plugin marketplace add .、codex plugin add adaptive-router@agent-smith、router.py --help、model_registry.py show、Use $adaptive-route for this task: …、离线 benchmark demo/report、unittest 命令、Float 构建。原文给出 6 个公开合成任务 × 三种策略 × 单次尝试、18/18 通过确定性 grader 的表：Fixed Astra 102,162 token / $1.237460；Fixed 6.1 Sol 105,285 / $0.1921092；Local router 101,392 / $0.1621807。作者称相对 Fixed Astra 参考成本少 86.89%、实际 token 少 0.75%，但这是单次选择器实验，USD 是冻结参考价，不是 Codex 订阅账单；缓存输入 token 差异会污染对比。

**FlagshipRouter**：可照做的有 git clone、npm run launch、--host 127.0.0.1、-p、--no-browser、Endpoint & Key、Models、CLI Tools、brand.json 与 npm run brand:sync、providers 策略 JSON、测试命令。只有 37 stars 等仓库元信息，没有性能、成本、质量或用户案例数据；测试套件带已知失败，示例模型名 gpt-6-astra 不是真实可用模型。

**Gluon**：可照做的有 install.sh/install.ps1、bun add -g、cd your-repo && gluon、intake agent 生成 agent/model/effort 与 spec、按 Enter 在 frame 内启动、多会话人工切换。给定文本是 README landing page，routing.yaml、权限、工具供给、安全隐私、成本分析示例、故障排查都在 docs；没有效果数据。

**LiteLLM**：可照做的有 uv add litellm、OPENAI_API_KEY/ANTHROPIC_API_KEY、completion(model=…)、uv tool install 'litellm[proxy]'、litellm --model gpt-4o、OpenAI SDK 指向 4000、Terraform 模块、MCP 的 tools type mcp 请求体与 Cursor mcpServers JSON、litellm.agent 的 Harness 用法、A2AClient 片段。100+ 提供商、虚拟密钥、多租户成本追踪、A2A Agent 网关、MCP 工具网关等是项目自述；Terraform 输出段、A2A 与 MCP Bridge 在材料中截断，Docker/E2E/MCP 登记细节在 docs。

**Claude Code /advisor 第一种挂法（F1）**：可照做的有 /model fable（某些计划下接受计费确认）与 /advisor fable；原文称 Opus 5.5 继续工作、Fable 5.1 作为顾问，但正文在关键处中断，顾问何时介入未给出。模型名与文档地址无法核实；“别浪费另一个模型配额”是作者主张，可核实互动量只有 70 赞、8 次转发、14 条回复。

**Claude Code 顾问模式第二种挂法（F2a）**：可照做的原文配置行是 claude -> model sonnet -> advisor opus；按箭头还原的尝试形态是 claude、/model sonnet、/advisor opus，但确切语法待核对。原文称 Sonnet 跑会话并编辑代码、Opus 作为顾问；没有文档链接、版本号或确切语法，Haiku 那一环在「Haiku 5.5」处截断。可核实互动量 120 赞、13 次转发、17 条回复；“不为不需要 Opus 的工作付 Opus 的价格”是作者主张。

**Claude Code 多模型分层第三种挂法（F2b）**：可照做的原文有两种写法——早期材料给 `claude --model sonnet --advisor opus`，分工为 sonnet 5.5 运行主会话并编辑代码、只读 haiku 5.5（截断）、只有真正需要决策时才引入 opus；本次 @0xVeyyro 推文同样给出 `claude --model sonnet --advisor opus`，并主张 “Sonnet builds, Haiku swarms, Opus advises”，但正文在 here's 处截断，Haiku swarms 没有命令或配置；另有材料只给 `claude --model sonnet --advisor`，未说明 `--advisor` 用什么模型、何时触发、如何配置。执行前必须用 claude --help 或 /help 确认 --advisor 存在、并看清它是否接受模型名；原文没有版本号。早期材料可核实互动量 37 赞、5 转发、10 回复；本次推文可核实互动量 58 赞、8 次转发、6 条回复。两处关于顾问是谁、效果的描述都只是作者主张，没有对比数据或测量方法；推文所称“Anthropic 刚分享”没有出处链接，“Haiku 5.5 / Opus 5.5”版本名也无法核实。建议小范围对照：记录成本、返工、首次通过、耗时、顾问介入次数、需要人工升级到 Opus 的次数；只有成本下降且质量不降，或质量提升足以抵消成本，才值得扩大使用；若命令不支持或无法稳定复现，则降级为思路研读。

**Claude Code 子代理固定为 Haiku（F3）**：可照做的原文命令是 CLAUDE_CODE_SUBAGENT_MODEL=haiku claude；原文声称同时运行 Sonnet 5.5、Haiku 5.5、Opus 5.5，但只给子代理模型这一个配置，没有主模型设置、任务划分和子代理触发方式。没有版本要求与对比数据；“更好的输出，消耗的 token 少得多”是作者主张。

**model-relay**：可照做的有安装插件、/provider setup、/provider init、node tools/setup.mjs add、/provider doctor --ping、alias 命令、providers.<name>.agent 的 description/effort/maxTurns、429 failover.chain 与默认值、statusline 文件格式、proxy enable/disable、0.6 升级迁移。定位是单人本地守护进程；provider 必须能接 Anthropic /v1/messages；给定调研正文在“对应研究问题”处截断，没有成本、质量、稳定性或用户案例数据。

**cedr**：可核对的操作性内容有安装命令与平台矩阵、glibc 版本要求、routes.toml 完整样例、Claude Code statusLine 的 JSON、cedr route pick/verdict 的真实命令与示例输出、cedr route stats/pools/list、cedr council plan/merge、cedr lint/lock/verify 与 --introspect 警告、claude mcp add cedr -- cedr mcp、SHA256SUMS/gh attestation verify、以及指向 docs/route.md、docs/council.md、docs/design.md 的规格说明。只是作者主张、没有证据的是：路由“挑得对”、Council 能提高评审质量、锁文件能防住真实风险；原文没有效果数据、案例研究、对比实验或用户反馈，仓库仅 42 stars、单一组织维护、preview 阶段，示例输出里的百分比是演示样例。材料边界：1.0 前命令与文件格式可能变；用量接入只具体说明 claude-statusline 与 codex 两种 kind；Council 报告格式、quorum、merge 输入形态未给；cedr route sync 会外发数据；跨机器/团队共享路由是付费计划功能；最小试用第二周在“第二周在 2–3”处截断。

**按“是否动架构”选模型 + /compact（J）**：可照做的有把编码收敛到 Claude Code 一个入口、用 Herdr 管多个 session（原文未给 Herdr 命令）、动手前按“动架构/不动架构”打标签、动架构用 Fable、不动架构用 Opus、长途换模型前先 /compact 再 /model、短上下文直接 /model。原文在“- 不用”处截断，第 5 条缺失；Fable/Opus 的名称、版本、可用性无法核实；Herdr 的安装与配置未给。只有作者个人几个月的工作习惯陈述，推文 69 赞、8 回复，没有指标、对比或结果数据；“按架构相关性选模型”和“换模型前先 compact”都是作者主张，/compact 丢细节是未验证的风险点。

**材料边界**：所有效果数字都需要自测；本手册只把可复制的命令、配置和提示词当作操作依据，把项目自述数字和作者主张当作待验证信息。这些项目、F3 这条推文、J 这条推文、本次 @0xVeyyro 推文以及各 Claude Code 扩展的材料都未说明可以互相集成；同时安装或叠加配置时不要假设请求一定经过你以为的那一层。

## 依据的调研

- [diegosouzapw/OmniRoute](../research/radar/2026-10-02/531-diegosouzapw-omniroute.md)：值得一试，可以小范围试：先把 OmniRoute 当作本地 OpenAI 兼容网关装起来（npm i -g omniroute → localhost:20128 → 用 model=auto 打通），再把一个编码工具指向它，用它验证「按任务选模型别名 + 配额耗尽自动回退」这一套是否真能减少中断；理由是原文给出了可照抄的安装与调用命令和模型别名清单，但节省比例、免费额度等数字都是项目自述，且原文截断、缺少配置细节，不宜直接采纳。
- [Chengjun023/agent-smith](../research/radar/2026-10-05/1229-chengjun023-agent-smith.md)：值得一试，可以小范围试：按 README 给出的命令装上 Codex 插件、用 $adaptive-route 跑日常任务，并先用离线 benchmark demo 验证流程，理由是全套安装/运行/评测步骤可照抄，但其实证只有 6 个合成任务、单次尝试的小规模试点，路由效果是否在你的任务上成立必须自己复现。
- [theRizwan/FlagshipRouter](../research/radar/2026-10-07/1614-therizwan-flagshiprouter.md)：值得一试，可以小范围试：在本地用 FlagshipRouter 起一个 OpenAI 兼容网关，把 Claude Code、Cline 等已在用的编程工具统一接到一个模型入口、按任务切换模型；但原文只是接线层的 README，没有质量或收益数据，且有已知测试失败和默认密码风险，先局部验证再决定是否写进手册。
- [fidipro/gluon](../research/radar/2026-10-09/2068-fidipro-gluon.md)：值得一试，建议小范围试：在非关键仓库按 README 的安装命令安装，然后 cd your-repo && gluon 启动，让 intake agent 为同一任务推荐并对比不同 harness/model/effort，同时记录成本与上下文。理由是原文给出了可照做的安装与启动流程，并把任务匹配和成本/上下文可观测做成了产品能力，但 README 未展开 routing.yaml、权限配置和效果数据，需要自行验证。
- [BerriAI/litellm](../research/radar/2026-10-10/2267-berriai-litellm.md)：值得一试，值得小范围试：照 README 给的命令先在本地起一个 LiteLLM 网关（uv tool install 'litellm[proxy]' + litellm --model gpt-4o），把 1–2 个模型统一成 OpenAI 格式并开启花费追踪，用自己的成本和失败率数据决定是否推广；它给出了可复制的安装与调用步骤，但整体是特性索引+宣传，实际收益需自测。
- [@polydao: Claude Code 提示：一旦 Opus 5.5 成为你的主要模型，就别让你的 Fable 5.1 配额白白浪费了](../research/radar/2026-10-12/2641-claude-code-opus-5-5-fable-5-1.md)：值得一试，可以小范围试：在支持 /advisor 的 Claude Code 里先用 /model fable 接受计费、再 /advisor fable 把次要模型挂成顾问，让主模型继续干活；理由是原文给了可照抄的命令，但正文在关键处被截断、模型名与文档地址都无法核实，只能先自测确认命令真实存在再考虑写进手册。
- [@rvaniaaaa: 这太他妈的棒了。Anthropic 的文档描述了运行 Opus 最聪明的方法之一](../research/radar/2026-10-14/3029-anthropic-opus.md)：值得一试，建议在 Claude Code 里小范围试一遍「Sonnet 主跑 + Opus 顾问」的分工，用成本和质量双指标对比后再常规化；理由是原文给出了可直接照做的模型分工配置思路，但推文被截断、命令确切语法和 Haiku 那一环都没写全，不足以直接采纳。
- [@sector_sol: 停止支付 opus 来做 haiku 的家庭作业。这个 claude 代码设置简直是黄金。](../research/radar/2026-10-16/3761-opus-haiku-claude.md)：值得一试，先在本地确认 Claude Code 是否支持 --advisor，再用 `claude --model sonnet --advisor opus` 做一次分层对照（sonnet 主会话、opus 只在决策点介入、haiku 承担只读杂活），验证成本与返工率是否改善；思路明确可试，但原文只有一条命令加几句分工、正文还被截断，没有任何成本或质量数据，参数与模型名也无法从材料内核实。
- [@skunzu: 这是一个真正他妈的金矿](../research/radar/2026-10-22/5773-item.md)：值得一试，可小范围试：用 CLAUDE_CODE_SUBAGENT_MODEL=haiku 启动 Claude Code，把子代理固定为 Haiku，并对比 token 消耗与输出质量；但原文只给了一条环境变量，没有给出 Sonnet、Opus、Haiku 的完整分工和触发方式，不能当作完整多模型方案照搬。
- [cheaper-inference/OmniRoute](../research/radar/2026-10-22/5842-cheaper-inference-omniroute.md)：值得一试，建议小范围试：在本地启动 OmniRoute，把 Claude Code 或 Cursor 的 base URL 指向 http://localhost:20128/v1，模型用 auto/subscription 或 auto/coding 跑一到两周，对比中断次数、单位任务 token 成本和 p95 延迟，再决定是否常态化。理由是它给出了可照做的接入方式与回退/路由配置，但省 token、免费额度等关键数字均为项目自述，且依赖第三方 provider 条款，必须先自测。
- [cablate/model-relay](../research/radar/2026-10-23/6217-cablate-model-relay.md)：值得一试，如果你长期在 Claude Code 里工作，可以小范围试用：先只把 haiku 这类子任务和 429 故障转移接到一个备用 provider，用 /provider doctor --ping 确认链路通，再按窗口逐步放开。理由是 README 给出了可直接复制的安装、配置和自检命令，并有默认保守的开关；但它仍是单人用的本地守护进程，缺少效果数据，先小范围试、别急着全量替换。
- [Sheernox/cedr](../research/radar/2026-10-30/8398-sheernox-cedr.md)：值得一试，可以用小范围试点的方式接入 cedr：先只做“按工作类型路由、记录结果”和“把 skill/MCP 版本固定进锁文件”两件事，再考虑多厂商评审门禁；理由是 README 给出了可直接照做的安装命令、routes.toml 样例、statusline 配置和完整命令表，但项目处于 preview 阶段、缺少任何效果数据，暂不宜直接定为团队标准。
- [muaaz9329/cheap-ag](../research/radar/2026-10-31/8887-muaaz9329-cheap-ag.md)：值得一试，可以在有一个中等规模任务、并且已有可运行测试套件的项目里小范围试：用 npx cheap-agent 接入 Claude Code，让 Claude 只负责规划、廉价模型负责写码、测试充当裁判；理由是该仓库 README 给出了完整的安装、授权、配置和回退流程，并且用测试结果作为唯一验收标准，但所有效果数据均为作者自报，且在最难任务和极小任务上没有收益甚至略有倒退。
- [@aliez_ren: 最近几个月我是这样用 AI 写代码的：](../research/radar/2026-11-03/9706-ai.md)：值得一试，可以小范围照做的是“按任务是否涉及架构改动来选模型 + 长途切换模型前先 /compact”这套分工与切换规则，因为它给出了可直接执行的操作顺序；但原文被截断、只有个人经验无数据，Herdr 与具体模型名需自行核对后再落地。
- [@HeLi8866: 这真的是一座金矿！](../research/radar/2026-11-06/10642-item.md)：值得一试，把 `claude --model sonnet --advisor` 作为一个小范围对照实验来跑：让便宜的 Sonnet 承担主循环，只在需要时让更强的模型介入，再用同样的任务对比效果和 token 消耗。推文只给了一行启动命令，没有任何机制说明或数据，所以不能直接采用（adopt），但它给出了一条可照抄的具体配置，值得试用。
- [@0xVeyyro: THIS IS AN ACTUAL F*CKING GOLDMINE](../research/radar/2026-11-06/10741-this-is-an-actual-f-cking-goldmine.md)：值得一试，建议小范围试：在 Claude Code 中用 Sonnet 主跑、Opus 顾问的命令做对照，记录成本与返工；原因是原文只给出一条具体命令且正文截断，不足以直接采纳为完整流程。
