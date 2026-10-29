# 让编码 agent 按工作类型选模型，并拿出可验收的证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多个供应商、模型和编码 agent 混用时，如何按工作类型路由、在限流或配额故障时回退，并用确定性证据而不是进程退出判断任务完成。
> 先试这一步：先只给一个最常用的工具接上一条路由或一个备用 provider，保留原直连路径作对照，并用同一批真实任务记录中断次数、人工切换次数、返工率和 token 成本。
> 最近修订：2026-10-30

## 解决什么问题

编码过程中经常遇到几种中断：某个供应商的订阅配额到期没用完、编码到一半被限流、某个 key 死掉导致整条流程卡住、工具输出烧 token。这些事本身没有谁专门负责，于是变成你手动换模型、换 key。另一类问题是模型选择：要么一直用最重最贵的模型，要么靠手动切换；agent 宣布完成时，也可能只看进程退出，不看任务是否真的通过确定性检查。还有一种浪费是：主力模型已经成为日常，另一个模型的配额一直闲置，却没有把它挂进当前会话。

Claude Code 里还有两个更具体的中断：模型设置会全局绑定所有终端窗口，切 provider 会影响全部会话；Anthropic 返回 429 用量上限时，整条会话卡住，只能手动换 key 或等冷却。model-relay 用一个本机 127.0.0.1:8950 的路由守护进程把“按窗口切模型、按别名路由、429 自动故障转移、provider 重试”接过来；它要求 provider 能接 Anthropic 的 /v1/messages 格式，定位是单人本地守护进程，不是团队多租户代理。

本手册给出一套本地可试的做法：用 OmniRoute 这类 OpenAI 兼容网关统一接多个供应商，并按配额、失败或成本自动回退；在 Codex 内用 Adaptive Router 按本地难度启发式选择轻/重模型；用“有证据的验收”判断是否真的完成；用 Gluon 为每次会话选择 harness × model × effort 并观察成本与上下文；用 LiteLLM 的 SDK 或网关把多家供应商统一成 OpenAI 格式，并做按项目/用户的成本追踪；Claude Code 内还有一条线：把次要模型挂成顾问，避免贵模型全程主持。再加一条 Claude Code 内的本地路由线：用 model-relay 按窗口/别名切 provider，并在 429 时自动转到备用端点。最后新增 cedr：它按工作类型路由 agent/模型/effort，回填 accepted/reworked/redone/rejected 结果，并可为 skill 与 MCP server 生成 cedr.lock 做漂移校验；它还能做多厂商评审门禁，但 Council 的细节在材料中指向 docs，未完整展开。

所有效果数字都要自测。七个项目、F3 这条推文、model-relay 和 cedr 的材料都未说明可以互相集成；先分别试。

## 适用与不适用

适用：

- 你手上有多个供应商或多把订阅/API key，经常因为某一个配额耗尽、限流或失败而中断工作。
- 你愿意在本机长期运行一个本地服务，并且手上的工具支持自定义 OpenAI 兼容 base URL。
- 你想把“模型选择、配额管理、故障回退、成本控制”这类元工作从人身上拿掉，交给网关自动做。
- 你使用 Codex，并愿意在 Codex 内装本地插件，用 $adaptive-route 跑日常任务。
- 你想先用离线 benchmark demo 验证路由/评测链路，再上真实任务。
- 你想用一个面板把“哪个工具接哪个模型”集中管起来，并希望工具里的模型以统一前缀显示（FlagshipRouter 的 flagshiprouter/<model>）。
- 你已经装了多个编码 agent（Claude Code、Codex、Antigravity、Grok Build、OpenCode、Kimi Code 中至少一个），想在同一终端框架里并排开会话，并为每次会话选 harness/model/effort。
- 你想按会话看到成本与上下文占用，用来比较不同选择；并且能在 Linux/macOS/WSL/Windows 的本地 git 仓库里跑终端命令。
- 你想先在 Python 代码里用同一个函数调不同供应商（换模型只改 model 字符串），再决定要不要上网关。
- 你需要在本地网关侧做按项目/用户的成本追踪与虚拟密钥，或想把 Claude Code / Codex / OpenCode / Deep Agents 作为 harness 跑在自己的网关上。
- 你使用 Claude Code，且版本支持 /advisor 或 --advisor；主模型已设为日常主力，同时还有另一个模型的可用配额（F1）。
- 你使用 Claude Code，账号/计划允许在 Sonnet、Opus、Haiku 等模型之间切换，主要任务是代码编辑、对成本敏感，并愿意先在一个 1–2 小时的中等复杂度改动上做 A/B（F2a/F2b）。
- 你使用 Claude Code，任务可以拆出子代理，愿意让较弱模型处理子任务，并愿意用同一批任务做 token 与质量的对照（F3）。
- 你长期在 Claude Code 里工作，模型设置全局绑定所有终端窗口，想按窗口/会话切 provider。
- 你有至少一个备用的 Anthropic 兼容端点（内置 preset：zai、deepseek、kimi、minimax、openrouter，或用 --url 指定自己的网关），想把 haiku/sonnet/opus 别名或某个子代理导到别的 provider。
- 你遇到 Anthropic 429 用量上限，想自动转到备用 provider 并钉住会话 7 天；愿意接受 Node.js 20+、Claude Code 2.1.287+、单人本机守护进程。
- 你使用 Claude Code、Codex、Cursor 或 Gemini，愿意试 cedr 的按工作类型路由、verdict 回填和 cedr.lock 固定 skill/MCP；你能接受 preview 阶段命令与文件格式在 1.0 前可能变。
- 你只想先在非敏感、非生产任务上小范围试。

不适用或需要谨慎：

- 有合规或数据敏感要求：接入前先看清请求是否会经过第三方免费层。OmniRoute README 自己披露有供应商因条款风险被标记为 avoid，本次材料点名 Kiro；早期材料称有 13 家，以你当前 README 标记为准。
- 想直接采信 README 的效果数字：OmniRoute 的 375 个 provider、1475 个 chat 模型 ID、20 种路由策略、37 个集成、约 1.62B 免费 token/月、压缩省 15–95%（平均约 89%）都没有给出可复现的测量方法、测试集或对照实验，且免费额度每两周会双向波动。agent-smith 只有 6 个合成任务、单次尝试；FlagshipRouter 只有仓库元信息；Gluon 没有效果数据；LiteLLM 是特性索引 + 宣传；cedr 没有效果数据且只有 42 stars、preview 阶段。
- 想用 OmniRoute 的生产级能力（MCP 110 工具、A2A、memory、guardrails、evals、TLS stealth、key pools 等）：给定材料里只有名词或概述，没有配置步骤。
- 想把 OmniRoute 的 combo 策略表直接照抄：本次原文在策略表第 3 条处被截断，round-robin 及后续策略的语义不完整；安装/首次运行章节也没有完整抓到。
- 以为新装 OmniRoute 一定有 keyless 免费目标：新调研明确提醒，全新安装可能没有任何可用的 keyless 目标，某些 keyless provider 也会拒绝第三方客户端。
- 想把 OmniRoute 当无单点风险的生产网关：网关是单点，它挂了所有客户端一起挂；需要评估是否值得为省成本引入这个依赖。
- 想用 FlagshipRouter 的 Media Models 和 Agent Skills 页面：README 只提到存在，没有给用法。
- 想直接照抄 Gluon 的 routing.yaml：具体写法、权限与工具供给、安全隐私、成本分析示例、故障排查都在文档站点，给定材料没展开。
- Codex Float 仅 macOS 14+；agent-smith 的 router 执行需要已有 Codex 登录。
- FlagshipRouter 默认面板密码是 123456，默认监听 20128；暴露到 localhost 之外前必须改密码。
- 想在同一个 Python 环境里同时装 litellm 和 litellm-core：只能装一个。
- 想让 LiteLLM 的 MCP OAuth 一路走通：可能需要预注册 OAuth app 并配置 credentials。
- 生产环境想用明文 ALB 长跑：allow_plaintext_alb = true 按 README 只限 dev/trial。
- 想直接照抄 Claude Code 的 /advisor（F1）：原文唯一依据是文档地址，且被截断；模型名无法核实。
- 想直接照抄 Sonnet 主跑 + Opus 顾问（F2a）：原文只有一行箭头写法，没有给出文档链接、版本号或确切命令语法。
- 想直接照抄 F2b 的 claude --model sonnet --advisor opus：原文没有说明 --advisor 从哪个版本起可用；执行前必须用 claude --help 或 /help 确认参数存在。参数不存在就停止照抄命令。
- 想把 Haiku 只读那一环当现成配置：F2b 原文在“→ 只读 haiku 5.5”处截断，怎么在 Claude Code 里指定 Haiku 只读、给什么权限，原文没有给出。
- 想把 CLAUDE_CODE_SUBAGENT_MODEL=haiku claude 当成完整三模型协作方案（F3）：原文只给这一条环境变量，没有说明主模型如何设为 Sonnet 或 Opus、三类任务如何划分、子代理如何触发。
- 想把 F3 与 F2b 叠加：F3 是环境变量，F2b 是启动参数；材料未说明可叠加，先分开试。
- 想把“停止支付 opus 来做 haiku 的家庭作业”“简直是黄金”“不为不需要 Opus 的工作付 Opus 的价格”当结论：都是作者主张，原文没有数据、基准、案例或成本对比。
- 想把 F1、F2a、F2b、F3 混着抄，或把 /advisor、--advisor、CLAUDE_CODE_SUBAGENT_MODEL 与 A–E 的网关/路由自动叠加：材料都未说明可集成，先分开试。
- 想给整个组织做多租户云代理：model-relay 作者自己说那种场景应该用 LiteLLM；它是单人本地守护进程。
- 只有 OpenAI Chat Completions 格式的 provider：model-relay 要求 provider 能接 Anthropic /v1/messages；只会说 OpenAI Chat Completions 的服务需要本地翻译层。
- 想在已经跑着 Claude Code 的 shell 里 export key 就生效：key 由 router 进程从它继承的环境里读，要写成永久变量并开新终端。
- 想装完就自动把请求导出去：不加 alias，haiku 及所有请求默认留在 Claude，不会外流。
- 想把 proxy mode 当无感隧道：HTTPS_PROXY 写进 settings.json 的 env，Claude Code 跑的命令也会走 relay 当盲隧道，router 挂了 git/curl/gh 会失败；proxy 模式下 router 停了 Claude Code 连不上。
- 想从 0.6 及更早版本升级只更新插件：0.7+ 只读 "format": 2，要迁移。
- 想让 cedr 直接当团队标准：它处于 preview，1.0 前命令与文件格式仍可能变；用量接入在原文中只具体说明 claude-statusline 与 codex 两种 kind；Council 的 reviewer 报告格式、quorum 默认值、merge 输入形态需读 docs/council.md；cedr route sync 会把历史与路由上传到 cedr.dev，默认应不开；跨机器/团队共享路由属于付费计划功能。
- 想让 cedr 的 cedr lock 无副作用：只有传 --introspect 时才会真正运行 MCP server，运行前会先警告；若不允许执行第三方 server，就不要加这个参数。
- 想拿 cedr 的效果当结论：没有效果数据、案例研究、对比实验或用户反馈；示例输出里的百分比是演示样例，不是实测结论。

## 前置条件

- OmniRoute：本机可安装 npm 全局包，或可用 Docker 镜像 diegosouzapw/omniroute；能长期运行一个本地服务；默认监听 20128；至少有一个你自己有权使用的 provider 账号或 API key；客户端支持自定义 OpenAI 兼容 base URL；从 Dashboard → Endpoints 取 OmniRoute key；v3.8.53+ 的材料提到可用无界面模式 serve --headless 放服务器常驻，但没有给完整启动命令。本次材料的安装/首次运行章节被截断，npm i -g omniroute 只作为线索，执行前回 README Quick Start 补齐。README 点名的可接工具包括 Claude Code、Codex、Cursor、Cline、Copilot、Antigravity；原文把 Copilot 列为 drop，不必为它单独接。
- agent-smith：Python 部分只用标准库；路由执行需要已有的 Codex 登录；Float 需要 macOS 14+、/usr/bin/python3 和 Xcode Command Line Tools。以下命令均在克隆后的仓库根目录执行（Float 相关除外）。
- FlagshipRouter：Node.js 20.9 或更高（README 建议 22）；git 与 npm 可用；本地端口 20128 空闲——与 OmniRoute 默认端口相同，不能按默认端口同时启动；要接自有供应商时需要相应凭证，不想注册时可先只用 OpenCode Free 的免注册模型。
- Gluon：至少一个受支持编程智能体的 API key 或订阅；Linux、macOS、WSL 或 Windows；在本地 git 仓库目录中操作。安装需要能访问 GitHub release，或用 Bun 从 release tarball 安装。
- LiteLLM：Python 环境 + uv；装 SDK 用 uv add litellm，同一环境只能装 litellm 或 litellm-core 之一；起网关用 uv tool install 'litellm[proxy]'，本机 4000 端口可用；接 MCP 需要 master key 或虚拟 key；跑 harness 需要 starlette、uvicorn 以及对应 agent 的 CLI；走 A2A SDK 需 a2a-sdk>=1.1.0；从源码构建 core 包需要 Git、uv 和 Rust 工具链。
- Claude Code /advisor（F1）：原文只给出两个命令；执行前先确认版本存在 /advisor；已把主力模型设为原文所称的 Opus 5.5；另有一个模型的可用配额（原文称 Fable 5.1）；某些计划下需要先执行 /model fable 接受按使用信用计费的确认。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a）：本机已安装并可运行 Claude Code CLI；账号/方案支持在 Sonnet、Opus 等模型之间切换；额度允许调用 Opus；已对照官方文档核对 /model、advisor 相关开关以及 Haiku 的用法。原文只给出一行箭头写法。
- Claude Code 启动参数分层（F2b）：本机已安装并可运行 Claude Code CLI；先在终端运行 claude --help，或在会话内用 /help，确认存在 --model 与 --advisor；账号/方案允许在 sonnet、opus、haiku 等模型之间切换；额度允许调用 opus；原文没有给出支持该参数的版本号。
- Claude Code 子代理固定为 Haiku（F3）：本机已安装并可运行 Claude Code；当前版本支持 CLAUDE_CODE_SUBAGENT_MODEL 环境变量（原文未给版本要求，需自行确认）；任务可以拆出子代理；你愿意让较弱模型处理子任务，并接受用同一批任务做质量对照。原文只给出一条启动命令，没有给主模型和顾问的配置方式。
- model-relay：Node.js 20+；Claude Code 2.1.287 或更新（作者在 Node.js 22.23.2 与 Claude Code 2.1.306 上测过）；至少一个备用的 Anthropic 兼容端点（内置 preset：zai、deepseek、kimi、minimax、openrouter，或用 --url 指定自己的网关）；接受这是单用户本机工具，不是团队共享代理；先设好 BACKUP_API_KEY 等环境变量，再启动 Claude Code；手动路径下 node tools/setup.mjs 要在插件安装目录里跑：~/.claude/plugins/cache/model-relay/model-relay/<version>/（设了 CLAUDE_CONFIG_DIR 时是 $CLAUDE_CONFIG_DIR/plugins/cache/model-relay/model-relay/<version>/）；默认端口 8950，Claude Code settings.json 的 ANTHROPIC_BASE_URL 会指向 http://127.0.0.1:8950。
- cedr：Linux 需要 glibc 2.34 或更新（Ubuntu 22.04、Debian 12、RHEL 9 及以上），或使用对应平台发布包；不想用二进制时本机要有较新的稳定版 Rust 工具链；写入 ~/.config/cedr/routes.toml；使用 Claude Code 时要挂 statusLine；要固定 skill/MCP 时仓库里要有 agent 配置；要接 agent 时 agent 需支持 MCP。README 声明 cedr 不读 agent 凭据、不代你调用厂商 API；用量来自 agent 自己的状态行与 CLI，或你指定的 feed；pick、verdict、stats 留在本机，只有加了 [sync] 段和 cedr.dev API key 后 cedr route sync 才上传。

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

预期结果：拿到模型回复。若返回 401/403，检查 key；若提示无可用路由，说明 auto 没有可用目标，先回 Dashboard 接 provider 或换 auto/subscription/具体别名。早期材料还给过一条不带 Authorization 的 curl：

```bash
curl http://localhost:20128/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'
```

它只在存在 keyless 免费后端（如材料所称 oc/…）时可能可用，不能当成必然。

5. 只把一个工具指向端点。前提：该工具支持自定义 OpenAI 兼容 base URL。把 base URL 设为 http://localhost:20128/v1，API key 填 OmniRoute key，模型名填第 6 步的别名。原文给出 Python、Node.js、PHP、cURL 的 quickstart 脚本在 examples/quickstart/。建议先接你日均用得最多的那个工具，只接一个；写入前记录原配置。预期结果：该工具的请求开始经过网关，另一个直连路径保留作对照。

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

7. 需要精细控制时自建 combo。前提：auto 不够用，且你愿意回 README 查策略语义。原文把 combo 描述为一条模型链，配额耗尽、provider 故障或成本飙升时自动切到下一个健康目标；自建 combo + 自动回退分四层：Subscription → API Key → Cheap → Free。每一步挑一种策略；本次材料只确认了 priority、fill-first、round-robin 等名称，round-robin 及后续策略在原文中被截断，不要照抄未确认的语义。预期结果：你得到一条按自己配额和预算排序的链；先只接 2–3 个目标，确认回退顺序符合预期。

8. 看看板与遥测。打开 /dashboard/free-tiers 看免费额度池的已用/剩余；用 live analytics 看用量、配额、节省额、p95 延迟。材料称 circuit breaker、key cooldown、model lockout 三层机制处理死 key；但没有给配置步骤，只当成提示。预期结果：你能看到配额与用量，但 savings 卡片不等于你的真实账单，必须和 provider 后台对照。

9. 做 A/B，保留直连。前提：非敏感、非生产任务。同一批任务一路走网关、一路直连原 provider，记录中断次数、人工切换次数、单位任务 token 成本、p95 延迟和返工率。预期结果：你能判断是网关起了作用，还是任务本身变简单。不要一次把所有工具都切过去。

**做法 B：在 Codex 内装 Adaptive Router，按难度路由并保留证据验收（agent-smith）**

前提：已克隆 agent-smith 仓库；路由执行需要已有 Codex 登录；以下命令在仓库根目录执行（Float 相关除外）。

1. 注册本地 marketplace 并安装路由插件：

```sh
codex plugin marketplace add .
codex plugin add adaptive-router@agent-smith
```

预期结果：插件装好。具体模式、偏好设置和显式固定模型见 router/README.md。

2. 不调用模型，先检查路由器和模型注册表：

```sh
python3 router/scripts/router.py --help
python3 router/scripts/model_registry.py show
```

预期结果：看到路由器帮助和模型注册表。此步不调用模型，零成本。

3. 在一个新的 Codex 任务里启用：

```text
Use $adaptive-route for this task: …
```

预期结果：路由器按本地 1.0–10.0 难度启发式（步长 0.1）选择模型；常规工作给更轻模型，困难场景再上重型模型。一个 skill 无法在生成中途切换主任务的模型；任务启用后，会把独立的工作块通过原生 subagent 路由。验收语义用 accepted / rejected / unknown；最好自己写确定性检查（测试通过、编译成功、断言满足），而不是看进程是否退出成功。

4. （仅 macOS）构建并打开 Float：

```sh
cd float
sh scripts/build.sh
open "build/Codex Float.app"
```

前提：macOS 14+、/usr/bin/python3 和 Xcode Command Line Tools。预期结果：打开浮窗，显示本地 Codex 任务、agent、用量与参考成本。Float 以只读方式打开官方 Codex 数据库，另写自己的数值型 SQLite 账本，记录 thread/request ID 与读取检查点，用于跨重启和日志轮转去重；对话正文和推理文本不进入该账本。

5. 想复现截图里的合成演示数据，在 float/ 下改用 demo 构建：

```sh
sh scripts/build.sh --demo
```

打开旧名字的 build/Token Inspector Demo.app。预期结果：其独立的 app 身份与 fixtures 让 demo 偏好保持稳定，且不接触实时任务读取器。

6. 在仓库根目录跑回归测试或离线基准演示：

```sh
python3 -m unittest discover -s router/tests -q
python3 -m unittest discover -s float/tests -q
python3 router/benchmarks/benchmark.py demo --run-dir /tmp/agent-smith-demo
python3 router/benchmarks/benchmark.py report --run-dir /tmp/agent-smith-demo --output /tmp/agent-smith-demo-report
```

前提：使用全新的输出目录。预期结果：demo 用合成答案和合成用量，replay 对已记录产物重新评分，两者都不调用模型；得到基准报告。README 称导入时基线为 130 个 router 测试、50 个 Float 测试，并说明命令随覆盖率演进而以当前命令为准。

7. 设置偏好：路由会问两个可选偏好问题——你的优先项（质量、均衡、成本或速度）和你通常的工作类型。预期结果：影响后续路由选择。

**做法 C：带面板的本地网关，用一张模型表统一给工具改配置（FlagshipRouter）**

前提：Node.js 20.9+（README 建议 22）；本地端口 20128 空闲。注意做法 A 与做法 C 默认用同一个端口，先确定只跑其中一个。

1. 克隆并启动。首次构建要几分钟。

```bash
git clone https://github.com/theRizwan/FlagshipRouter.git
cd FlagshipRouter
npm run launch
```

预期结果：依赖装好、应用构建完成、CLI 启动，服务跑在端口 20128，浏览器自动打开面板，终端保留一个小菜单（打开浏览器 UI、终端 UI、隐藏到托盘、退出）。后续启动只需几秒，且在源码或 brand.json 变化时自动重建。

2. 用只监听本机的方式启动，并先改掉默认密码。前提：你不想让面板暴露到 localhost 之外；README 明确要求在暴露前改掉默认密码 123456。

```bash
npm run launch -- --host 127.0.0.1
```

预期结果：只在本机监听；打开面板进 Settings 把密码从 123456 改掉。需要 CLI 参数时写在 -- 之后，例如换端口 npm run launch -- -p 20130、不自动开浏览器 npm run launch -- --no-browser。

3. （可选）想在任何目录直接用 flagshiprouter 命令，先链接一次 CLI 包：

```bash
cd cli && npm link
```

4. （可选）开发模式带热重载：

```bash
npx next dev --port 20128
```

5. 建 key、选模型、接工具（前提：服务已在跑）：

   1. 打开 Endpoint & Key，创建一个 API key。
   2. 打开 Models，选一个标为 Ready 的模型（OpenCode Free 的模型不需要注册即可用），或先连接某个供应商以解锁更多模型。
   3. 把工具指向 http://localhost:20128/v1 并填入该 key；或直接用 CLI Tools 页面为 Claude Code、Codex、OpenCode、Cline、Copilot 等写入配置。模型在这些工具里显示为 flagshiprouter/<model>。
   4. 只接一个你已经在用的工具，并在写入前记录它原来的配置，以便回滚。

6. 验证连通。README 示例里的模型名 gpt-6-astra 来自 README，不是真实可用模型，必须换成你实际 Ready 的那个。

```bash
curl http://localhost:20128/v1/chat/completions -H "Authorization: Bearer $FLAGSHIPROUTER_KEY" -H "Content-Type: application/json" -d '{"model": "gpt-6-astra", "messages": [{"role": "user", "content": "Hello"}]}'
```

预期结果：拿到模型回复，说明端点与 key 可用。

7. （可选）集中改品牌与命名：编辑仓库根目录的 brand.json。name 控制面板、终端 UI、托盘、页面标题、翻译里的产品名；slug 控制 npm 包名、CLI 命令、数据目录（~/.<slug>）、请求头、MITM 证书名；modelPrefix 控制写进 CLI 工具配置的供应商前缀（模型显示为 <modelPrefix>/<model>）；tagline/description 控制页面标题与 web app manifest；repository/branch 控制链接、changelog 和 agent-skill URL；updateCheck 控制 npm 更新提示（包还没以该 slug 发布前保持 false）；providers 控制免费供应商策略。改完运行：

```bash
npm run brand:sync
```

预期结果：更新两个 package.json（包名、CLI bin），其余在运行时或构建时读取 brand.json。

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

规则：某个供应商可用，当它的注册表条目（open-sse/providers/registry/<id>.js）有列出的 category，或者被标为 hasFree 且 includeHasFree 为开；include 和 exclude 填 provider id。该策略在面板、管理 API、连接存储和路由时都被强制执行。customEndpoints 打开后允许用户自定义 OpenAI/Anthropic 兼容端点；把 freeOnly 设为 false 会恢复完整的上游供应商列表。

9. （可选）跑测试。README 自陈套件带已知失败，建议与上一个 commit 的运行结果对比，而不是期待全绿：

```bash
npm install --prefix /tmp/vitest-runner --legacy-peer-deps vitest@4
ln -sfn /tmp/vitest-runner/node_modules tests/node_modules
cd tests && npx vitest run
```

**做法 D：用控制平台为每个会话选 harness/model/effort，并看成本与上下文（Gluon）**

前提：已有至少一个受支持编程智能体的 API key 或订阅；使用 Linux、macOS、WSL 或 Windows；在本地 git 仓库目录中操作。以下步骤全部来自原文 README；routing.yaml 等细节原文指向文档站点，未在给定文本中展开。

1. 安装最新 release。Linux、macOS、WSL：

```sh
curl -fsSL https://github.com/fidipro/gluon/releases/latest/download/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://github.com/fidipro/gluon/releases/latest/download/install.ps1 | iex
```

原文还给出 Bun/源码方式的线索：从 release 下载 npm 风格 tarball gluon-<version>.tgz，然后 bun add -g "$PWD/gluon-<version>.tgz"（Linux、macOS）；从 checkout 构建见 CONTRIBUTING.md。校验与所有安装选项见其 install guide。预期结果：gluon 命令可用。

2. 进入仓库并启动：

```sh
cd your-repo && gluon
```

预期结果：在当前仓库里进入 Gluon 终端框架。

3. 首次运行时按引导连接你的 agent。预期结果：走一遍 connecting your agents。具体连接步骤在文档站点，给定 README 未展开。

4. 描述这次会话是做什么的。预期结果：intake agent 读取你的仓库、问几个问题，并提出一个 agent、model 和 effort，以及一份 spec。

5. 按 Enter，在该 agent 自己的 UI 中启动会话，会话运行在 Gluon 的 frame 内。按一个键回到主界面，可以继续启动更多会话。预期结果：多会话并排，由你人工在会话间切换推进。

6. 需要配置路由规则时查文档，不要照抄本文。原文说 Gluon 先和你确定 spec，再按可配置规则路由；Reference 文档包含 CLI、config、routing.yaml、environment、models。给定文本没有给出 routing.yaml 的具体内容。

7. 用 Gluon 查看各会话的成本与上下文可观测性和分析。原文没有给出具体命令或面板操作步骤，只能按 UI 自行摸索，并把结果与自己记的账对照。

**做法 E：用 LiteLLM 统一多供应商，并按项目看成本（LiteLLM）**

前提：有可用的 Python 环境与 uv。以下命令来自 README；Docker 快速上手、E2E 教程、MCP 具体配置都在 docs，本页未展开。先做 E1，觉得需要虚拟密钥、多租户成本追踪、管理后台再上 E2。

*路线 E1：先在 SDK 层做最小验证*

1. 安装 SDK。前提：Python 环境 + uv。

```shell
uv add litellm
```

预期结果：import litellm 可用。README 明确提示：另有一个独立的 litellm-core 发行版，提供相同 import litellm API 但没有可选 extras、CLI 入口和内置 dashboard；同一环境只能装一个 SDK 发行版，因为两者会写重叠的 Python 文件。要用 proxy/CLI/可选 extras 就装 litellm。

（可选，从源码构建 core 包；前提是装了 Git、uv 和 Rust 工具链，且要在没有 litellm 的全新环境里安装：）

```shell
python scripts/build_core_distribution.py --out-dir dist/core
python -m pip install dist/core/litellm_core-*.whl
```

2. 配置各 provider 的 API Key（环境变量）。前提：你至少有一个 provider 的 key。

```python
import os
os.environ['OPENAI_API_KEY'] = 'your-openai-key'
os.environ['ANTHROPIC_API_KEY'] = 'your-anthropic-key'
```

3. 用同一个函数调不同模型。预期结果：把原来多个 SDK 的调用收敛成一处，换模型只改 model 字符串。

```python
from litellm import completion

# OpenAI
response = completion(model='openai/gpt-4o', messages=[{'role': 'user', 'content': 'Hello!'}])

# Anthropic
response = completion(model='anthropic/claude-sonnet-4-20250514', messages=[{'role': 'user', 'content': 'Hello!'}])
```

*路线 E2：起本地 AI Gateway（成本追踪/虚拟密钥的入口）*

4. 安装并启动 proxy。前提：装的是带 [proxy] extra 的发行版；本机 4000 端口可用。

```shell
uv tool install 'litellm[proxy]'
litellm --model gpt-4o
```

预期结果：本机起一个 AI Gateway，默认监听 4000 端口。

5. 用标准 OpenAI SDK 指向网关。前提：已在网关侧配置好上游 key 与虚拟密钥（README 指向 docs 的 E2E 教程与 Docker 快速上手，本页未展开）。

```python
import openai

client = openai.OpenAI(api_key='anything', base_url='http://0.0.0.0:4000')
response = client.chat.completions.create(
    model='gpt-4o',
    messages=[{'role': 'user', 'content': 'Hello!'}]
)
```

预期结果：业务代码零改造，只换 base_url。

6. （生产）用 Terraform 模块部署到 AWS / GCP。前提：AWS 账号 + CloudShell（或在自有 root 配置里调用模块）。README 称 AWS 布局为 ECS Fargate + Aurora + ElastiCache + ALB；GCP 同样有模块，模块发布在公开 Terraform Registry 上、无需额外认证。

```bash
git clone https://github.com/BerriAI/litellm.git
cd litellm/terraform/litellm/aws/examples/default
cp terraform.tfvars.example terraform.tfvars   # edit region/tenant/env
terraform init && terraform apply
```

或从自己的 root config 调用：

```hcl
# main.tf
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.60" }
  }
}

provider "aws" {
  region = "us-west-2"
}

module "litellm" {
  source  = "BerriAI/litellm/aws"
  version = "~> 1.89"

  region = "us-west-2"
  azs    = ["us-west-2a", "us-west-2b"]
  tenant = "acme"
  env    = "prod"

  # Production: provide an ACM cert. Without one, set allow_plaintext_alb = true
  # (dev/trial only).
  # acm_certificate_arn = "arn:aws:acm:us-west-2:111122223333:certificate/..."
  allow_plaintext_alb = true
}
```

README 同时提示：生产环境要提供 ACM 证书，没有证书则设 allow_plaintext_alb = true（仅限 dev/trial）；稳定版用带 -stable 标签的 docker 镜像，这些镜像发布前经过 12 小时负载测试。注意：抓到的原文在 Terraform 输出段被截断，云部署部分只有前半段可依据。

*路线 E3：把工具（MCP）接到模型上*

7. 网关侧先登记 MCP Server。前提：MCP server 已可用；持有 master key 或虚拟 key。README 指向 docs 的 “Adding your MCP” 步骤，本页未展开配置细节。

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

预期结果：工具通过网关调用 MCP。README 特别提醒的 OAuth 坑见“常见坑”。

*路线 E4：让 coding agent 跑在你的网关上*

10. 用 harness 指定 agent 与模型。前提：安装 starlette、uvicorn 以及对应 agent 的 CLI（claude、codex 或 opencode）；用 Deep Agents 则装 deepagents langchain-litellm。

```python
import litellm
from litellm import Harness, sandbox

result = litellm.agent(
    Harness.CLAUDE_CODE,  # or Harness.CODEX, Harness.OPENCODE, Harness.DEEPAGENTS
    'Find why tests/test_router.py is flaky and fix it.',
    sandbox=sandbox.local('./repo'),
    model='litellm_proxy/claude-sonnet-4-5',  # a model group on your AI Gateway
)

print(result.text, result.cost, [f.path for f in result.files])
```

预期结果：设置 LITELLM_PROXY_API_BASE 和 LITELLM_PROXY_API_KEY 后，agent 的每一次模型调用都会走你的网关，并打上 harness,claude_code 标签；去掉 litellm_proxy/ 前缀则直接调 provider。

*路线 E5：A2A（材料不完整）*

11. 材料给出 A2AClient 直连 agent 的片段：

```python
from litellm.a2a_protocol import A2AClient
from a2a.types import SendMessageRequest, MessageSendParams
from uuid import uuid4

client = A2AClient(base_url='http://localhost:10001')

request = SendMessageRequest(
    id=str(uuid4()),
    params=MessageSendParams(
        message={
            'role': 'user',
            'parts': [{'kind': 'text', 'text': 'Hello!'}],
            'messageId': uuid4().hex,
        }
    )
)
response = await client.send_message(request)
```

前提：网关侧已把 agent 加入（按 agent 设 protocolVersion 为 1.0 或 0.3）；走 A2A SDK 需 a2a-sdk>=1.1.0。支持的 agent 来源：LangGraph、Vertex AI Agent Engine、Azure AI Foundry、Bedrock AgentCore、Pydantic AI。注意：抓到的原文在这里（from mcp import ClientSessio）被截断，MCP Bridge 部分没有可依据的内容。

**做法 F：在 Claude Code 里做多模型分层——先确认命令，再小范围 A/B（Claude Code）**

四个变体都只动 Claude Code 会话、启动参数或环境变量，不碰网关；模型名与命令语法在给定材料里都无法核实。执行前先确认你所用的 Claude Code 版本确实存在相应命令、参数或环境变量，否则以下步骤不成立。

*变体 F1：主模型 Opus，顾问挂另一个闲置配额模型*

前提：Claude Code 中已把主力模型设为原文所称的 Opus 5.5，且你还有另一个模型的可用配额（原文称 Fable 5.1）。

1. 仅在“某些计划”下需要这一步——先执行一次 /model fable，以接受按使用信用计费的确认。若你的计划没有该提示，可跳过。

```text
/model fable
```

预期结果：按原文，这是某些计划下的计费确认；若命令不存在或计划无此提示，先停。

2. 把次要模型置于“顾问/通话”状态：

```text
/advisor fable
```

预期结果：原文称把 Fable 5.1 置于顾问状态；原文未说明顾问在什么时机、以什么形式产出内容，这一步需要自行观察。

3. 之后照常用主模型推进工作。原文：Opus 5.5 继续工作，Fable 5.1 作为顾问。预期结果：顾问是否实际介入并给出可读建议，需要你自己在会话里观察。

4. 做一次 A/B：同一任务开顾问 vs. 不开顾问。前提：在单个项目、单个会话里试。记录返工次数、被采纳的评审意见数、最终产出差异，以及多出的计费额度与响应延迟。放弃条件：/advisor 不存在、顾问全程不介入，或多次任务中没有可观察差异。

*变体 F2a：Sonnet 主跑，Opus 做顾问（会话内命令写法）*

原文给出的配置是一行箭头写法：

```text
claude -> model sonnet -> advisor opus
```

调研的解读是：这很可能表示在 Claude Code 会话里依次执行的命令，而不是一条 shell 命令。按原文箭头还原的最简尝试形态（语法待核对，不要照抄）：

```text
claude
/model sonnet
/advisor opus
```

1. 前提：本机已安装并可运行 Claude Code CLI；账号/方案支持在 Sonnet、Opus 等模型之间切换，且额度允许调用 Opus。
2. 先在 Anthropic 官方文档核对 /model、advisor 相关开关以及 Haiku 的用法。原文被截断，没有给出文档链接、版本号或确切语法。
3. 把会话主模型设为 Sonnet（负责跑会话、改代码）。原文写法为 claude -> model sonnet，对应会话内的模型切换命令，实际写法以文档为准。
4. 打开 Opus 作为顾问，即只在需要判断/兜底时调用 Opus，而不是让它全程主持会话。原文写法为 advisor opus，命令确切形式原文未给。
5. （材料不明，先不要自己补）把轻量任务交给 Haiku：原文只剩“Haiku 5.5”几个字，负责哪类任务、怎么配置都没写清。去官方文档核对后再决定是否使用。
6. 跑一个真实任务，观察实际触发了几次 Opus，再决定是否把这个配置固化成默认。

*变体 F2b：用启动参数 claude --model sonnet --advisor opus 做分层*

原文只给出一条启动命令和三条分工，没有更多配置步骤。原文给出的部分（可原样复制，但执行前必须先核对参数）：

```bash
claude --model sonnet --advisor opus
```

原文给出的分工（照抄原文表述）：

- sonnet 5.5 运行主会话并编辑代码
- 只读 haiku 5.5（此处原文被截断，后续内容缺失）
- 只有在真正需要决策时才引入 opus

要照做，按这个核对顺序走（以下步骤是核对顺序，不是原文内容）：

1. 先确认本机 Claude Code 版本是否真的支持 --advisor：终端运行 claude --help（或在会话内用 /help）查找该参数。原文没有说明它从哪个版本起可用；如果不存在，这条命令无法照抄，只能退回到“贵模型只用于决策点”的分配原则。
2. 确认参数可用后，在项目目录用原文命令启动：

```bash
claude --model sonnet --advisor opus
```

3. 按原文分工，把文件阅读、检索、批量机械修改这类只读/低判断量的活交给 haiku。具体怎么在 Claude Code 里指定 haiku 只读，原文被截断没有给出，需要自己在你的版本里找等价做法（例如子代理配置或权限只读设置），不要凭猜测写进流程。
4. 决策点才切 opus：原文只说“只有在真正需要决策时才引入 opus”，没有给出切换判据，需自行定义（例如架构选型、跨模块改动方案、反复失败后的重新规划）。
5. 做一个 1–2 小时能做完的真实小任务，用默认模型跑一遍，再用 claude --model sonnet --advisor opus 跑一遍同类任务；任务、提示词、仓库状态保持一致。
6. 每次记录：账单/token 消耗、完成所需的重试次数、你手动接手修改的次数、以及“后悔没用 opus”的次数（决策被顾问模型纠正或放行的次数）。

*变体 F3：用环境变量把子代理固定为 Haiku*

前提：已安装并可运行 Claude Code；当前版本支持 CLAUDE_CODE_SUBAGENT_MODEL 环境变量（原文未给版本要求，需自行确认）；任务可以拆出子代理；你愿意让较弱模型处理子任务，并接受质量对照。

原文给出的唯一可照做配置：

```bash
CLAUDE_CODE_SUBAGENT_MODEL=haiku claude
```

原文声称：同时运行 Sonnet 5.5、Haiku 5.5、Opus 5.5，让每个模型只做最擅长的任务，从而获得更好输出并显著减少 token。但原文没有说明主模型如何设为 Sonnet 或 Opus、三类任务如何划分、子代理如何触发，因此不能把这一条命令等同于完整三模型协作方案。

要照做，按这个核对顺序走（以下是核对顺序，不是原文内容）：

1. 先确认环境变量在你的版本里存在：运行 claude --help 或查官方文档；原文没有给版本要求。不存在就停。
2. 用原文命令启动：

```bash
CLAUDE_CODE_SUBAGENT_MODEL=haiku claude
```

预期结果：子代理模型被指定为 Haiku；主模型仍是你的默认模型，原文没有给主模型设置方式。
3. 在会话中按 Claude Code 原有方式使用子代理或子任务。原文没有给出如何同时指定 Sonnet 5.5 和 Opus 5.5、如何把具体任务路由给不同模型的步骤，不能补写。
4. 做最小试用：选 5–10 个有代表性的 Claude Code 任务，同一提示词分别跑默认配置与设置 CLAUDE_CODE_SUBAGENT_MODEL=haiku 的配置；记录总 token/费用、任务完成率、输出被人工修改的比例、返工次数、延迟和主观质量评分。
5. 只有在 token 明显下降且质量不下降或可接受时，才把该配置纳入日常流程；若质量下降，则只对低风险子任务使用。

*F1、F2a、F2b、F3 怎么选*

- 目标不同：F1 是“别让另一份闲置配额白白浪费”，主模型仍是重模型；F2a/F2b 是“不为不需要 Opus 的工作付 Opus 的价格”，主模型换成轻模型；F3 是“只把子代理固定为更轻的 Haiku”，不改变主模型和顾问。不要混着抄。
- 入口不同：F2a 是会话内命令，F2b 是启动参数，F3 是启动时的环境变量。先运行 claude --help：如果 --advisor 存在，优先按 F2b 的最小对照试；如果只有 /advisor 存在，退回 F2a；如果只想让子任务少花 token，先试 F3；如果都不存在，只保留“贵模型只用在决策点”这一条分配原则。
- 三者模型名（Opus 5.5、Fable 5.1、Sonnet、Haiku 5.5）与命令语法在给定材料里都无法核实；F2a/F2b 的原文都在关键处被截断，F3 原文只给一条环境变量。先确认命令或环境变量存在，再小范围试。
- 材料未说明它们能与 A–E 的网关/路由自动集成，也未说明 F1/F2a/F2b/F3 之间可以叠加；先分开试。

**做法 G：在 Claude Code 内按窗口/别名路由，并把 429 故障转移钉住（model-relay）**

前提：Node.js 20+，Claude Code 2.1.287+；至少一个备用 Anthropic 兼容端点；接受这是单人本机守护进程，不是团队多租户代理。

1. 先把 API key 设进环境变量，再启动 Claude Code。前提：key 由 router 进程从它继承的环境里读，你在已经跑着 Claude Code 的 shell 里 export 是看不到的。要写成永久变量，然后开新终端。

```sh
export BACKUP_API_KEY="your-api-key"      # macOS/Linux，写进 ~/.zshrc
setx BACKUP_API_KEY "your-api-key"        # Windows
```

预期结果：新开的 Claude Code 进程能继承到 key；旧终端里的 export 不会补进已启动的 router。

2. 安装插件。前提：如果 Claude Code 之前已经开着，先执行 /reload-plugins。

```sh
claude plugin marketplace add cablate/model-relay
claude plugin install model-relay@model-relay
```

预期结果：插件装好，后续可使用 /provider 命令。

3. 让 Claude 陪你完成配置。

```text
/provider setup
```

原文说明：setup 工具会替你跑，不会让你把 key 粘到聊天里，改 ~/.claude/settings.json 之前会征求同意。可以直接带目标，例如：

```text
/provider setup use deepseek for haiku
```

预期结果：在输入框上方的 /provider 交互面板里，你可以把“当前这个窗口”切到某个 provider，其他窗口不受影响。

4. 手动路径（不想用交互 setup 时）。先执行：

```text
/provider init
```

这会创建 ~/.claude/model-relay.json（先不含任何 provider，所以所有请求仍走 Claude），并把 ~/.claude/settings.json 里的 ANTHROPIC_BASE_URL 指向 relay。然后加 provider：

```bash
node tools/setup.mjs add <name> --preset <preset> --model <model id> --token env:<VAR>
```

前提：node tools/setup.mjs 要在插件安装目录里跑，即 ~/.claude/plugins/cache/model-relay/model-relay/<version>/（设了 CLAUDE_CONFIG_DIR 时是 $CLAUDE_CONFIG_DIR/plugins/cache/model-relay/model-relay/<version>/，ls 一下看版本号）；在别处要用该目录下 tools/setup.mjs 的完整路径。presets 子命令列内置 preset。改完重启 Claude Code。

5. 自检，这一步是关键，别跳。

```text
/provider doctor --ping
```

期望看到 Config OK、provider 出现在 Providers 下、Upstream ping 下有一个 ✓。原文给的样例输出：

```text
Config OK (~/.claude/model-relay.json)
  Port: 8950
  Providers: backup -> your-model-id
  Failover: backup (back to Claude after 10 min)    Retry: on
  Aliases:  none (run "node tools/setup.mjs alias haiku <provider>" to route haiku)
  Claude settings: ✓ settings.json ANTHROPIC_BASE_URL=http://127.0.0.1:8950
  Router health: ✓ up on 127.0.0.1:8950 (pid 38780, <version>, pinned sessions: 0, 429 failover: idle, proxy off (0 routed / 0 tunnelled))
  Upstream ping:
    ✓ backup     (your-model-id) -> answers, first byte after 640 ms
```

doctor 默认只报告、不改动；加 --fix 才让它自己修能修的问题。doctor --json 给同样的结论，每条带修复参数（fix）和是否需要你确认（needsConsent），适合挂脚本。

6. 把 haiku 类请求导到便宜/备用 provider。前提：新配置下 haiku 及所有请求默认都留在 Claude，不加 alias 就不会外流。这一步是显式打开。

```bash
node tools/setup.mjs alias                        # 查看 haiku / sonnet / opus / subagent 默认
node tools/setup.mjs alias haiku backup           # 同时改 settings.json 与 model-relay.json
node tools/setup.mjs alias haiku claude           # 改回 Anthropic Claude
node tools/setup.mjs alias subagent sonnet        # 设 CLAUDE_CODE_SUBAGENT_MODEL=sonnet
```

原文解释了两处联动：settings.json 里写 env.ANTHROPIC_DEFAULT_HAIKU_MODEL = "your-model-id[1m]"，让 Claude Code 自己把 haiku 别名解析成该模型；model-relay.json 里给 providers.backup.matchModels 加 "haiku"，接住 Claude Code 内部硬编码 claude-haiku-* 的调用。预期结果：haiku 请求走 backup，其他窗口/别名不受影响。

7. 给单个 provider 配专属子代理。前提：router 会为每个 provider 动态注册全能力 Agent 类型 model-relay:<name>，不用写 .claude/agents/*.md，也不用重启会话。在 ~/.claude/model-relay.json 里：

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

description 是 Claude 在挑子代理时读到的那行，要写清“什么时候选它”——这是把任务类型和模型对上号的关键字段。改 agent 从下一条消息起生效。原文列了实测限制：permissionMode 无法松动或收紧处于 bypassPermissions 的父会话；initialPrompt 对 Agent 工具起的子代理不生效；memory 无效。

8. 配 429 故障转移链。前提：需要一个能接 Anthropic /v1/messages 的本地或远端端点；原文示例 local 指向 http://127.0.0.1:4000，若该端点只会 OpenAI Chat Completions，需要翻译层。

```bash
node tools/setup.mjs providers
node tools/setup.mjs add local --url http://127.0.0.1:4000 --model your-local-model-id --token env:LOCAL_GATEWAY_TOKEN
node tools/setup.mjs set failover.chain backup,local
node tools/setup.mjs set providers.local.fallback none
```

相关默认值（原文配置表）：failover.enabled 默认 true；failover.chain 默认空（空则 429 原样返回；add 会把新配置的第一个 provider 放进来）；failover.cooldownMs 默认 600000（10 分钟，允许 60000–7200000）；retry.attempts 默认 3（0 = 无限重试）；retry.delayMs 默认 2000；retry.backoff 默认 2；retry.maxDelayMs 默认 10000；retry.failover 默认 false（显式打开后，重试耗尽才转下一个 provider，且不会转回已试过的）。本地网关可设 launch: { command, args }，端口关着时 router 自动拉起。预期结果：Anthropic 返回 429 时，请求转给 failover.chain 里的第一个 provider，并把这个会话钉住 7 天；冷却期后新会话再回去试 Claude，已钉住的会话保持不动。

9. 把状态接进自己的 statusline。前提：每个窗口把状态写到 ~/.claude/model-relay-status/<session id>，一行 kind<TAB>label；session_id 就是 Claude Code 传给 statusLine 命令的那个 id。kind 取值：claude / pinned / failover / limit / offline / direct。一周没更新的文件 router 会删。

10. （可选）用 Remote Control 又不想丢掉路由：

```bash
node tools/setup.mjs proxy enable --go
node tools/setup.mjs rc
```

前提与代价（原文明确写了）：HTTPS_PROXY 写在 settings.json 的 env 里，所以 Claude Code 跑的命令（git、curl、gh）也会走 relay 当盲隧道，router 挂了它们就失败；proxy 模式下 router 停了 Claude Code 连不上，得 node tools/setup.mjs rc 重启；proxy disable --go 可逆，旧 settings 保留为 settings.json.model-relay-backup，但已在 proxy 模式的会话要重启才能恢复。

11. 从 0.6 及更早版本升级的额外动作。只更新插件不够，0.7+ 只读 "format": 2。要么：

```text
/provider setup upgrade my model-relay config
```

要么手动（node tools/setup.mjs migrate → migrate --go → /provider restart）。不迁移的话，后台跑着的 0.6 router 会一直跑旧代码。

**做法 H：按工作类型路由并固定 skill/MCP 版本，先用 verdict 记录结果（cedr）**

前提：cedr 处于 preview，1.0 前命令与文件格式仍可能变；先只准备 2 个 harness（如 Claude + Codex），只定义 2 条 route，不铺开。

1. 安装 CLI。Linux x86_64 示例：

```sh
curl -fsSL https://github.com/Sheernox/cedr/releases/latest/download/cedr-x86_64-unknown-linux-gnu.tar.gz | tar -xz
install -m 755 cedr-x86_64-unknown-linux-gnu/cedr ~/.local/bin/cedr
cedr --version
```

其他平台对应 cedr-aarch64-unknown-linux-gnu.tar.gz、cedr-aarch64-apple-darwin.tar.gz、cedr-x86_64-apple-darwin.tar.gz、cedr-x86_64-pc-windows-msvc.zip。需要溯源校验时，每个 release 带 SHA256SUMS 和签名的构建来源，可用 gh attestation verify <archive> --repo Sheernox/cedr 检查。不想用二进制、本机有较新的稳定版 Rust 工具链时：

```sh
cargo install --locked --git https://github.com/Sheernox/cedr cedr
```

2. 描述“计划”和“路由”。先明确你手上有哪几个 harness（如 claude、codex）、各自用量读数从哪来。写入 ~/.config/cedr/routes.toml（README 提到 cedr.dev 的 Route 页面可生成此文件）：

```toml
version = 1

[orchestrator]                  # the agent you work in; it keeps work no one else should take
harness = "claude"
model = "opus"

[harnesses.claude]
expect = ["five_hour", "seven_day"]
effort_option = "effort"

[harnesses.codex]
expect = ["primary"]
effort_option = "reasoningEffort"

[[readings]]                    # where plan usage comes from
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

要点：work 描述这类工作是什么，role 是角色，candidates 按 tier 列出候选 target 与 effort，self 表示留给你正在用的 orchestrator。

3. 让 cedr 读到 Claude Code 的计划用量。使用 Claude Code 时，把 cedr 设为状态行，写入 ~/.claude/settings.json：

```json
{ "statusLine": { "type": "command", "command": "cedr route statusline" } }
```

已有自定义状态行要保留，就在命令后追加 -- <your command>。

4. 选取，并回填结果：

```console
$ cedr route pick review.code
[route review.code -> codex/gpt-6.1-sol high | balanced:31%<claude=64% | codex s22% w31%; claude s64% w48% | rules 770517e | pick p-979e77351990]
  codex/gpt-6.1-sol role=review

$ cedr route verdict p-979e77351990 accepted
```

cedr route stats 会显示每类工作上哪个模型表现最好。verdict 取值为 accepted、reworked、redone、rejected（来自命令表说明）。辅助命令：cedr route pools 看各计划剩余空间与 cedr 会用哪些，cedr route list 列出路由与每个路由会尝试的模型。

5. 多厂商评审门禁。前提：每个厂商的 reviewer 需要能产出报告；README 未给出报告格式细节，只指向 docs/council.md。

```sh
cedr council plan <route>     # 指定每个厂商起一个 reviewer，以及 quorum
cedr council merge <reports>...  # 合并报告并决定是否放行
```

6. 固定技能与 MCP server：

```sh
cedr lint      # 找仓库 agent 配置里的问题
cedr lock      # 把每个 skill 和 MCP server 钉进 cedr.lock
cedr verify    # 配置不再匹配 cedr.lock 时失败（离线）
```

前提：cedr lock 只有在传 --introspect 时才会真正运行 MCP server，运行前会先警告——若不允许执行第三方 server，就不要加这个参数。

7. 从 agent 里直接调用。前提：agent 支持 MCP。cedr mcp 通过 stdio 暴露 Route 与 Council 工具。

```sh
claude mcp add cedr -- cedr mcp
codex mcp add cedr -- cedr mcp
```

8. 凭据与数据边界：README 声明 cedr 不读 agent 凭据、不代你调用厂商 API；用量来自 agent 自己的状态行与 CLI，或你指定的 feed；pick、verdict、stats 留在本机，只有加了 [sync] 段和 cedr.dev API key 后 cedr route sync 才上传。默认不要开 sync。

9. 最小试用：建议 1 人 × 2 周，不铺开。只装 CLI，只配 2 个 harness（Claude + Codex），只定义 2 条 route：一条 review.code，一条你日常最重复的实现类工作。用 1 天完成 statusline 接入，确认 cedr route pools 能显示出真实的计划剩余量；如果读不到数，直接停，不要继续。第一周只用 pick + verdict，不启用 Council、不加 sync。每类工作至少积累 15–20 次 pick 与 verdict 再看得出的分布。原文在“第二周在 2–3”处截断，第二周具体动作不可依据；先按第一周做，Council 和 Guard 只做独立小试。

**做法 A / B / C / D / E / F / G / H 怎么选**

- 主要痛点是跨供应商配额、限流、死 key、工具输出烧 token：先做 A。预算红线先用 auto/subscription；想先榨干套餐额度再降到最便宜付费选项用 auto/thrifty；auto/chaos 会成倍消耗上游调用，除非你就是要多模型交叉验证，否则别日常开。
- 已经在用 Codex，痛点是“常规任务也调用最重模型”且想用确定性 grader 验收：先做 B。
- 想让多个工具从一个面板统一改配置、按任务换模型，并先拿免注册的免费模型打通：做 C。
- 痛点是“同一任务不知道该交给哪个 harness/模型/effort”，或者想按会话看成本与上下文：先做 D。
- 想先在 Python 代码里把多 provider 的调用收敛成一个函数，或者需要按项目/用户的成本追踪、虚拟密钥、Terraform 云部署：做 E。E1 只动代码、零运维，E2 起网关后才会碰端口和密钥。
- 日常用 Claude Code、主模型已就位、另有闲置模型配额：先做 F1。F1 只动 Claude Code 会话内的两个命令，不碰网关；但必须先确认命令真实存在。
- 日常用 Claude Code、对成本敏感、主要任务是代码编辑，想让贵模型只出现在判断点上：先试 F2b（启动参数），用 claude --help 确认 --advisor；不存在则试 F2a（会话内命令）。两者都必须先核对官方文档或 help。
- 日常用 Claude Code、只想让子任务用更轻的模型，且能接受输出质量对照：先试 F3。用 CLAUDE_CODE_SUBAGENT_MODEL=haiku claude 启动，先用 5–10 个任务对比 token 与质量；不要把 F3 当成完整三模型方案，也不要默认它能与 F2b 叠加。
- 日常用 Claude Code、痛点是“模型设置全局绑定所有窗口”或 429 限流，且你有备用 Anthropic 兼容端点：先试 G。先只给 haiku 别名接一个备用 provider，用 /provider doctor --ping 确认链路，再按窗口逐步放开；不要一上来把所有别名和故障转移链都打开。
- 你已经在 Claude Code、Codex、Cursor 或 Gemini 之间分配工作，想把“哪类工作交给哪个 agent/模型/effort”写成规则，并用 accepted/reworked/redone/rejected 回填结果：先试 H 的 route pick + verdict。你想固定 skill 和 MCP server 版本、在 CI 里发现漂移：再试 H 的 lint/lock/verify。你想做多厂商评审门禁：先读 docs/council.md，再小范围试 council plan/merge。
- A 和 C 是同一层的本地 OpenAI 兼容网关，功能重叠，且默认端口都是 20128：先选一个跑通，不要同时按默认端口启动。E 也是请求层网关，但默认 4000 端口，与 A/C 不撞；端口不撞不代表能自动叠加，材料没有说明它们可以集成。
- A/C/E 与 D 不是同一层：A/C/E 在请求层按供应商/模型别名路由；D 在会话层把已有 harness 并排跑起来，按 harness × model × effort 路由。E 的 harness 抽象能在自己的网关上跑 Claude Code / Codex / OpenCode / Deep Agents，与 D 的“并排多个 harness”语义不同。两者材料都未说明可互相集成。
- B 与 D 都涉及 Codex：B 是在 Codex 内装插件按难度选模型，D 是把 Codex 当作可并排的一个 harness；材料未说明两者关系。
- F（F1/F2a/F2b/F3）与 A–E 不是同一层：F 是 Claude Code 内部命令、启动参数或环境变量，材料未说明能与网关/路由自动集成；先单独试。
- G 是 Claude Code 插件 + 本机 127.0.0.1:8950 的 Anthropic 兼容路由守护进程，和 A/C 的 OpenAI 兼容网关（20128）、E 的 AI Gateway（默认 4000）不是同一层。G 可以用 --url 指向本地/远端端点，但该端点必须能接 Anthropic /v1/messages；只会 OpenAI Chat Completions 的端点需要翻译层。材料未说明 G 能与 A–F 自动集成，先分开试。
- H 是叠在 Claude Code、Codex、Cursor、Gemini 等 harness 之上的编排与门禁层：它依赖 Claude Code 状态行/CLI 或 Codex 提供用量读数；它不是 A–G 的替代，也不是请求转发网关。材料未说明 H 能与 A–G 自动集成；先把各自跑通，再自行验证请求实际走哪条路径。
- 所有项目都未说明可以互相集成。如果确实要同时装，先把各自跑通，再自行验证请求实际走哪条路径；不要默认叠加。D 会把多个 harness 接到同一框架里，建议先在一个非关键、已纳入版本控制的仓库里试；G 和 H 也建议先在非关键仓库、只接一个备用 provider 或一个 route。

**暂时不要碰的部分**：OmniRoute README 提到的 MCP（110 个工具）、A2A、memory、guardrails、evals、TLS stealth、key pools 公平配额，在给定材料里只有名词，没有配置步骤；安装/首次运行章节、combo 完整策略语义、压缩的具体配置项也不在本次材料里。agent-smith 的“多 agent 协作、重试、失败升级带来的收益”需要单独实验，材料未给步骤。FlagshipRouter 的 Media Models 页面和 Agent Skills 页面同样只有存在性描述，没有用法。Gluon 的 routing.yaml、权限与工具供给、安全隐私、成本分析示例、故障排查都不在给定材料里。LiteLLM 的 MCP 登记细节、Docker 快速上手、E2E 教程都在 README 指向的 docs 里，本页未展开；A2A 与 MCP Bridge 的原文被截断。Claude Code /advisor 的顾问介入方式、效果说明、与网关集成都未在原文中展开；F2b 那一支的原文连 Haiku 只读怎么配都没写全；F3 只给了一条环境变量，主模型和任务划分未展开。model-relay 的调研正文在“对应研究问题”处被截断，效果数据、与 A–F 的集成方式、团队多租户用法都不在给定材料里。cedr 的 Council 报告格式、quorum 默认值、merge 输入形态未展开；最小试用第二周具体动作在原文“第二周在 2–3”处截断。

## 怎么判断变好了

最小试用：

- OmniRoute（先 1–2 天跑通，再 1–2 周对照；早期材料建议试三周，可作为上限）：本地或一台小服务器起 OmniRoute（先试 Docker，便于回滚）；只接 2–3 个 provider（1 个付费主力 + 1 个免费备用）；只改一个客户端的 base URL（选你日均用得最多的那个，如 Claude Code），模型先用 auto 和 auto/coding 两个别名；有预算红线就用 auto/subscription 跑一天，确认它真的“失败即停”而不产生账单；同一批真实任务一半走网关、一半直连原 provider。不要启用来源不明的免费供应商，先用自有 key 或已知供应商验证回退逻辑是否按预期工作。
- agent-smith（先零成本离线验证）：克隆仓库 → 按步骤 1–2 安装并检查 → 步骤 6 跑 demo 与 report 两条离线命令，确认基准管道能在自己机器上产出报告（这两条不调用模型，零成本）。确认通过后，准备 5–10 个日常常规 Coding 任务，分成两组：一组用 Use $adaptive-route for this task: …，一组固定用你平时最重的模型。只在这一小批上对比，不要一次性全面切换。
- FlagshipRouter（半天以内，全部本地）：clone + npm run launch -- --host 127.0.0.1，先去 Settings 把密码从 123456 改掉；在 Models 里挑一个 OpenCode Free 的免注册模型，用第 6 步的 curl 打通一条请求；用 CLI Tools 只给一个当前已在用的工具（例如 Claude Code）写配置，并记录原配置以便回滚；拿一个真实的小任务，分别在原配置和走网关的配置下各跑一遍。
- Gluon（非关键、已纳入版本控制的仓库）：按做法 D 的安装命令装好，cd your-repo && gluon 启动；选一个边界清晰的小任务，先用默认/交互方式让 intake agent 推荐 agent/model/effort，记录它给出的 spec；再手动用第二个 harness 或模型做同一任务，比较结果。如果要从路由规则开始，先查文档中的 routing.yaml 写法，不要照搬本文。
- LiteLLM（分两半，先 SDK 后网关）：先用 uv add litellm，用同一个 completion() 分别调 openai/gpt-4o 和 anthropic/claude-sonnet-4-20250514，确认换模型只改一个字符串；再用 uv tool install 'litellm[proxy]' + litellm --model gpt-4o，用上面的 OpenAI SDK 片段把 base_url 指向 http://0.0.0.0:4000 打通一条请求；只接 1–2 个模型，连续几天看成本追踪与失败率，而不是看 README 的能力清单。如果 SDK 层就够用（不需要虚拟密钥、多租户成本追踪、管理后台），不必起网关。
- Claude Code /advisor（F1，单个项目、单个会话）：按做法 F1 执行 /model fable（如提示计费则确认）与 /advisor fable，然后照常完成一个日常任务（例如修一个 bug 或做一次代码审查），全程记录顾问模型是否真的产出了可见内容。原文未给试用时长建议；先按单个任务/单会话判断，若 /advisor 不存在、顾问不介入，或多次任务中没有可观察差异，就停用并把结论降为 study。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a/F2b，单个真实的中等复杂度代码改动）：先在官方文档或 claude --help 核对命令语法，再挑一个真实的中等复杂度改动任务跑两次——A 组按本配置（Sonnet 主跑 + Opus 顾问），B 组全程用 Opus（或你原本的默认方式）；任务、提示词、仓库状态保持一致。F2b 的具体操作：先用 claude --help 确认 --advisor，再挑一个 1–2 小时能做完的真实小任务，用默认模型跑一遍，再用 claude --model sonnet --advisor opus 跑一遍同类任务。
- Claude Code 子代理固定为 Haiku（F3，5–10 个有代表性的任务）：同一提示词分别跑默认配置与 CLAUDE_CODE_SUBAGENT_MODEL=haiku claude；记录总 token 或费用、任务完成率、输出被人工修改的比例、返工次数、延迟和主观质量评分。原文没有给试用时长建议；先按这一批任务判断。只有在 token 明显下降且质量不下降或可接受时，才纳入日常；若质量下降，只对低风险子任务使用。若环境变量不存在或命令报错，停止并把结论降为 study。
- model-relay（先一个别名、一个备用 provider）：先设好永久环境变量并开新终端；装插件；用 /provider setup 或 /provider init + add 只加一个备用 provider；用 /provider doctor --ping 看到 Config OK 与 Upstream ping ✓；先只做 alias haiku backup，不动 sonnet/opus；用 /provider 面板确认只有当前窗口切了 provider，其他窗口仍走 Claude；再挑一次真实 429 或配额耗尽，确认会话被钉到 failover.chain 第一个 provider，冷却后新会话回 Claude。原文未给试用时长；先以一次真实 429/配额耗尽事件和一周内人工切换次数为观察窗口，不要一上来开 proxy 模式。
- cedr（1 人 × 2 周，只配 2 个 harness 和 2 条 route）：第一天接 statusline 并确认 cedr route pools 能读到真实剩余量，读不到就停。第一周只用 cedr route pick 和 cedr route verdict，不启用 Council、不加 sync；每类工作积累 15–20 次 pick 与 verdict 后用 cedr route stats 看分布。第二周原文被截断，先不要按未给出的第二周动作执行；Guard 可单独在仓库里跑 cedr lint、cedr lock、cedr verify，观察 verify 是否在配置漂移时失败；Council 先读 docs/council.md 再小范围试。

要记录的指标：

1. 任务是否完成、需不需要人工返工；
2. 返工/追问的轮数；
3. 该次会话的 token 消耗与费用（用 Claude Code 自带的用量/费用查看方式，具体命令以文档为准）；
4. 复杂决策点上 Opus 被实际调用的次数与效果（是帮上忙，还是白花钱）；
5. “后悔没用 opus”的次数（决策被顾问模型纠正或放行的次数）；
6. 子代理相关调用的 token 是否下降（F3），以及子任务输出被人工修改的比例；
7. OmniRoute 的中断次数：一周内因 rate limit/额度耗尽导致的任务失败或等待次数（核心指标）；
8. OmniRoute 的单位任务成本：同一批任务的 token 数与花费，网关组 vs 直连组；
9. OmniRoute 的 p95 延迟：看板里的 p95 与实际体感；auto/fast 是否真的更快；
10. OmniRoute 的压缩收益：挑 3 个“工具输出很长”的典型任务，记录开启压缩前后的输入 token 数，验证 15–95% 的宣传在你这里落在哪个区间；
11. 质量对照：同批任务两组的返工率/一次通过率，防止“省了钱但答案变差”；
12. 稳定性：网关自身宕机时长、回退触发次数与回退后的成功率；
13. 人工干预次数：一周内你手动换模型/换 key 的次数是否下降；
14. 任务接受率：用 accepted / rejected / unknown 记录；最好自己写一个确定性检查（测试通过、编译成功、断言满足），而不是看进程是否退出成功；核心门槛是接受率不下降；
15. unknown 比例：缺失用量或价格会被记为 unknown；unknown 占比过高说明计量覆盖不足，此时成本对比不可信；
16. 配额真实性：把 /dashboard/free-tiers 显示的 used/remaining 与供应商后台账单对照，这直接决定“配额感知回退”是否可信；
17. 首次跑通耗时、切换成本、副作用与可回滚（FlagshipRouter）：从 clone 到第一条成功请求的分钟数；按任务换模型是否真的生效（看工具里是否显示 flagshiprouter/<model>）；Console Log 里的失败请求数、触发限流/额度耗尽的次数；原工具有没有出现行为变化或配置被覆盖，能否一条命令回滚掉 CLI Tools 写入的配置；
18. 单位任务成本与上下文占用、选择成本与补问次数、任务完成质量（Gluon）：按会话比较不同 harness/model/effort 的 token 或费用、上下文占用；从任务描述到开始执行的耗时、会话间切换耗时、需要人工补问的次数；人工评分、测试通过率或 review 意见数——四个项目都没给质量指标，要自己定；
19. 供应商切换成本、每项目/用户成本、失败率与重试/回退次数（LiteLLM）：在 SDK 或网关侧换一个 provider 要改几处（理想是只改 model 字符串或一处配置），以及换完要不要重启服务；README 列出的多租户成本追踪没有给面板位置与操作步骤，需自己确认在哪里看、数字能不能对上账单；SDK 侧 Router 支持跨多个部署重试与回退，但需自测触发条件和成功率；
20. 顾问是否真实介入（F1）、贵模型实际被调用几次（F2a/F2b）、子代理 token 占比与子任务质量（F3）；
21. 429 中断与自动故障转移、按窗口切换是否真的隔离、钉住与冷却、别名路由是否精确、重试与最终成功率、proxy 模式副作用、成本与质量对照（model-relay）；
22. cedr 的 route × model 统计：用 cedr route verdict 回填 accepted/reworked/redone/rejected 后，看 cedr route stats 中每类工作上哪个模型表现最好；观察 cedr route pools 显示的剩余量与真实计划用量是否一致；观察 cedr verify 的退出码是否在配置漂移时失败；Council 的门禁规则是 P0/P1 阻断、报告过少不静默放行，但报告格式与 quorum 需先读 docs。

试多久、什么情况下停：

- OmniRoute：先用 1–2 天跑通并确认 auto/subscription 真的失败即停，再连续 1–2 周做对照；早期材料建议观察三周。若“中断次数 / 人工切换次数”没有下降，或配额显示与实际账单明显不符，或压缩导致答案质量下降，或免费 provider 出现条款风险，或网关本身成为新的不稳定源，就停用并把结论降为 study。
- agent-smith：成功标准建议：在接受率不下降的前提下，参考成本或实际 token 明显下降；若接受率下降或 unknown 比例高，先回到离线 benchmark 检查判分与计量的可靠性，再决定是否继续用。
- FlagshipRouter：先按半天的最小试用跑通，再决定要不要多用几天。只要出现“模型连通但结果明显变差”或“配置互相覆盖且难回滚”，就停止推广，把结论降为 study。
- Gluon：材料没有给出试用时长建议，只建议小范围试。在非关键仓库试到你能判断“推荐是否真的更省钱或省上下文”为止；若质量明显下降，或成本/上下文没有可见改善，就停用并把结论降为 study。
- LiteLLM：SDK 最小验证半天内做完，网关最小验证再半天。若两天内你还说不清“换 provider 省了几步、成本数字是否可信”，就停在 SDK 层，不要上网关和 Terraform。
- Claude Code /advisor（F1）：原文没有试用时长建议。先按单个项目、单个会话判断；若 /advisor 不存在、顾问全程不介入，或多次任务中开/不开顾问没有可观察差异，就停用并把结论降为 study。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a/F2b）：原文没有试用时长建议，先按单个任务、单个会话、单个中等复杂度改动判断；若命令或参数不存在、语法对不上、质量下降、或顾问调用次数高到费用接近全程 Opus，就退回原方式并把结论降为 study。
- Claude Code 子代理固定为 Haiku（F3）：原文没有试用时长建议，先按 5–10 个任务的一批判断；若 token 没有明显下降或质量下降，就停用或只限低风险子任务，并把结论降为 study。
- model-relay：原文没有试用时长建议。先只接一个备用 provider、只开 haiku alias，至少覆盖一次真实 429 或配额耗尽事件；若 429 中断/人工切换次数没有下降，或按窗口切换没有隔离，或 alias 没有按预期路由，或 proxy 模式让 git/curl/gh 变得不稳定，就停用并把结论降为 study。
- cedr：原文建议 1 人 × 2 周不铺开，但第二周动作在材料中截断。若 cedr route pools 读不到真实剩余量、pick/verdict 15–20 次后仍看不出分布、cedr verify 误报或漏报、锁文件导致无法维护、Council 的 quorum/报告格式无法落地，就停用或只保留 lint/lock/verify 中确实有用的部分，并把结论降为 study；不要把 preview 阶段写进团队标准。

## 常见坑

- 把 README 的自述数字当结论。OmniRoute：375 个 provider、1475 个 chat 模型 ID、20 种路由策略、37 个集成、MCP 110 工具、56,000+ 静态测试声明、~1.62B 免费 token/月（首月含注册赠送最高 ~2.22B）、压缩省 15–95%（平均约 89%）、$0 起步，都没有给出可复现的测量方法或对照实验；免费额度数字依赖第三方条款，原文承认每两周重新审计、会双向波动；provider 数量与“可用”是两回事，新装可能没有可用 keyless 目标。agent-smith：86.89%/0.75% 来自 6 个合成任务 × 三种策略 × 单次尝试，没有第三方复现记录。FlagshipRouter：只有 37 stars 这类仓库元信息，没有任何性能、成本、质量或用户案例数据。Gluon：同样没有任何效果数据、对比实验或用户案例。LiteLLM：README 是特性索引 + 宣传。model-relay：给定调研没有效果数据，正文还在“对应研究问题”处被截断。cedr：没有效果数据、案例研究、对比实验或用户反馈；仓库仅 42 stars，单一组织维护，preview 阶段；示例输出里的百分比是演示样例。
- 以为零凭证一定能 curl 通 OmniRoute。新调研的 README 要 Authorization 头，且全新安装可能没有可用 keyless 目标；早期材料里的无 key curl 只在存在 keyless 免费后端时可能可用。先用 Dashboard → Endpoints 的 key 走通，再决定要不要试 keyless。
- 照抄 OmniRoute 的安装命令。本次材料在安装/首次运行章节被截断，npm i -g omniroute 和 Docker 镜像名只是线索；执行前回 README Quick Start 补齐。
- 照抄 OmniRoute 的 combo 策略表。本次原文在策略表第 3 条处被截断，round-robin 及后续策略语义不完整；不要凭名字猜。
- 把 auto/subscription 和 auto/thrifty 混用。auto/subscription 只用已付费订阅额度，失败即停，绝不回退到会产生账单的通道；auto/thrifty 会先用套餐额度，再一级一级降到最便宜的付费选项，套餐重置后自动回到套餐。有预算红线就用 subscription。
- 把 auto/chaos 当故障注入。它是并行 fan-out 到一个模型面板（默认每 provider 一个、共 5 个），返回一个答案；每个面板模型各发一次上游调用，会成倍消耗配额。
- 忘记 OmniRoute 是单点。它挂了，所有客户端一起挂；先评估是否值得为省成本引入这个依赖，并保留直连回退路径。
- 忘记核对免费供应商条款。OmniRoute README 自己披露有供应商因条款风险被标记为 avoid，本次材料点名 Kiro；早期材料称 13 家，以当前标记为准。用免费额度做生产有封号/断供风险。
- 把多把第三方 key 交给一个本地服务。OmniRoute README 称 key 本地加密（AES-256-GCM）、本地优先，但没有给出可照做的验证方法；网关 key 也不要泄露。
- 只信 dashboard。savings 卡片不等于你自己的 p95 和账单；把 /dashboard/free-tiers 的 used/remaining 与供应商后台对照。
- 一次把所有工具都切到网关。先只接一个，保留直连对照，否则无法判断是网关起了作用还是任务本身变简单了。
- 端口撞车。OmniRoute 与 FlagshipRouter 默认都监听 localhost:20128，同时按默认端口启动会冲突；FlagshipRouter 可用 -p 换端口，OmniRoute 的材料没有给出改端口方式。LiteLLM 默认 4000，与上面两个不撞；model-relay 默认 8950，也不撞，但材料没有说明任何两家能叠加使用。cedr 不是请求网关，不占这些端口；但它依赖的 statusline/CLI 读数要单独接。
- FlagshipRouter 默认面板密码是 123456。README 明确说暴露到 localhost 之外以前必须改；建议先用 --host 127.0.0.1 只本地监听。
- 把 FlagshipRouter 的测试不全绿当成自己装坏了。README 自陈套件带已知失败：live-provider 测试、缺失的 cloud/ worker、对时序敏感的 DB 测试；引擎测试还在 tests/setup/providerPolicy.js 里把 free-only 策略关掉。
- 拿 README 的示例模型名当真实模型。FlagshipRouter 的 gpt-6-astra 只是 README 示例，必须换成你自己 Ready 的模型。
- CLI Tools 页面会代替你写工具配置，可能覆盖原配置。先记录原配置，确认能回滚再往下走。
- 照抄 Gluon 的路由配置。给定材料是 README landing page，原文自己注明细节在 docs/；routing.yaml、权限、工具供给、安全隐私、成本分析示例、故障排查都不在材料里。
- 把 Gluon 的安装方式当成有校验的安装。原文给的是管道执行远端脚本（curl … | sh、irm … | iex），材料没有给出校验步骤；原文提到校验与所有安装选项见 install guide，需要自己去看。
- 用 Gluon 时忽略代码库的权限与数据边界。多个 harness 并排意味着同一个仓库要交给多个第三方 agent，各自用自己的 key 或订阅；原文没有展开权限配置，先在非关键、已纳入版本控制的仓库里试。
- 以为 Gluon 会自动触发任务。它的会话由“描述本次会话目的”启动，多会话并排和会话管理只支持人工切换推进，原文没有给出自动触发或持续完成的机制。
- 把 Gluon 当成 OmniRoute / FlagshipRouter 的替代。D 是会话层控制平台，A/C/E 是请求层网关，材料未说明可集成。
- LiteLLM 的 litellm 与 litellm-core 不能同环境同装，会写重叠的 Python 文件；要用 proxy/CLI/可选 extras 就装 litellm。
- LiteLLM 的 MCP OAuth：上游可能宣称支持动态客户端注册，但实际用 HTTP 401/403 拒绝请求；若 provider 要求预注册 OAuth app，需在该 MCP server 上配置 credentials.client_id，必要时配 credentials.client_secret，以跳过网关登录流程里的动态注册；且 provider 必须批准该 app 用于 MCP 访问——能打开授权页不代表登录或工具调用会成功。
- LiteLLM 的生产部署别用明文。没有 ACM 证书时 allow_plaintext_alb = true 按 README 只限 dev/trial。“-stable 镜像发布前经过 12 小时负载测试”是 README 自述，没给测试方法。
- 照抄 LiteLLM 的 Terraform。抓到的原文在 Terraform 输出段被截断，云部署只有前半段可依据；Docker 快速上手、E2E 教程、MCP 登记步骤都在 docs，本页没有。
- 把 LiteLLM 的 A2A / MCP Bridge 当现成能力。原文在这两处被截断，没有可照做的完整步骤。
- 把 Claude Code 的 /advisor 当必然存在。原文唯一依据是文档地址 code.claude.com/docs/en/advisor，且该链接在原文中被截断；执行前先确认版本支持，命令不存在就停。
- 照抄 /advisor fable 和 /model fable 里的模型名。原文称 Opus 5.5、Fable 5.1，但给定材料无法核实这些模型名和文档地址；不同计划的计费确认方式可能不同，不要把这套命令当成跨版本通用。
- 以为挂上顾问就会自动介入。原文正文在关键处中断，未说明顾问在什么时机、以什么形式产出内容；必须观察它是否真的给出可读建议。
- 把 claude -> model sonnet -> advisor opus 当一条 shell 命令抄。原文用箭头书写，很可能表示会话内依次执行的命令；调研给出的 /model sonnet、/advisor opus 只是按箭头还原的写法，原文未给确切语法，执行前必须对照 Anthropic 官方文档核对。
- 把 claude --model sonnet --advisor opus 当跨版本通用命令。新材料没有说明 --advisor 从哪个版本起可用；执行前必须用 claude --help 或 /help 确认参数存在。参数不存在就停止照抄命令，退回“贵模型只用在决策点”或 F2a。
- 照抄 F2a/F2b/F3 里的模型名。Sonnet、Opus、Fable 5.1、Haiku 5.5，以及新材料里的 “sonnet 5.5 / haiku 5.5”，都无法从给定材料核实；「Haiku 5.5」指的是模型版本还是别的，也确认不了。
- 自己脑补 Haiku 那一环的配置。F2a/F2b 原文都在「Haiku 5.5」或“→ 只读 haiku 5.5”处被截断，它负责哪类任务、怎么配、给什么只读权限都没写；先去文档确认，不要自行加配置。
- 把 CLAUDE_CODE_SUBAGENT_MODEL=haiku claude 当成完整三模型协作方案。F3 原文只给这一条环境变量，没有给主模型设置、任务划分和子代理触发方式；不能把“设置子代理模型”等同于“同时运行三个模型”。
- 以为设置子代理模型就等于“只读 Haiku”。它只指定子代理用哪个模型，不规定只读权限；F2b 原文的“只读 haiku 5.5”环节仍被截断，两者不是一回事。
- 把 F3 与 F2b 叠加。F3 是环境变量，F2b 是启动参数；材料未说明可叠加，先分开试。
- 原文没有给 CLAUDE_CODE_SUBAGENT_MODEL 的版本要求；执行前先确认环境变量在你的版本里存在（claude --help 或官方文档），不存在就停。
- 把“更好的输出，消耗的 token 少得多”当结论。F3 原文没有给对比数据、任务案例或评测方法；这是作者主张。
- 把“不为不需要 Opus 的工作付 Opus 的价格”或“停止支付 opus 来做 haiku 的家庭作业”当成效果结论。原文只有这些成本主张，没有数据、基准、案例或成本对比；F2a 可核实的互动量只有 120 赞、13 次转发、17 条回复，F2b 只有 37 赞、5 转发、10 回复。
- 以为 F2a/F2b 一定省钱。顾问触发过于频繁会把成本优势吃掉；触发过少，复杂改动的质量可能下降。原文没有给阈值，先自己记录 Opus 被实际调用的次数。
- 把 F2a/F2b 写进团队默认流程。原文被截断、没有文档链接和版本号，先在个人、单项目、单会话里试。
- 把 F1、F2a、F2b、F3 混着抄。四者目标不同，模型分工和入口也不同；材料未说明可叠加。
- 把“别让配额白白浪费”当成效果结论。F1 的原文没有给出任何成本、效果或对比数据；可核实的互动量只有 70 赞、8 次转发、14 条回复。
- 把 /advisor、--advisor 或 CLAUDE_CODE_SUBAGENT_MODEL 与 A–E 的网关/路由混为一谈。前者是 Claude Code 内部命令、启动参数或环境变量，材料未说明能与本地网关、Adaptive Router、Gluon 或 LiteLLM 集成；先分开试。
- 以为装了 model-relay 就自动把请求导出去。新配置下 haiku 及所有请求默认留在 Claude，不加 alias 不会外流；先 /provider doctor --ping，再显式 alias haiku backup。
- 在已经跑着 Claude Code 的 shell 里 export key。key 由 router 进程从它继承的环境里读，旧 shell 的 export 补不进去；要写成永久变量并开新终端。
- 在任意目录直接跑 node tools/setup.mjs。手动路径要在插件安装目录里跑，即 ~/.claude/plugins/cache/model-relay/model-relay/<version>/；否则用该目录下 tools/setup.mjs 的完整路径。
- 把 key 粘到聊天里。用 /provider setup 时，setup 工具会替你跑，不会让你把 key 粘到聊天里，改 settings.json 前会征求同意；不要自己绕过这个流程。
- 拿只会 OpenAI Chat Completions 的端点直接接 model-relay。model-relay 要求 provider 能接 Anthropic /v1/messages；只会说 OpenAI Chat Completions 的服务需要本地翻译层。原文第 8 步的 --url http://127.0.0.1:4000 只是示例，前提是该端点能接 Anthropic 格式。
- 把 429 故障转移理解成“全局切换”。429 时只把请求转给 failover.chain 第一个 provider，并把这个会话钉住 7 天；冷却期（默认 10 分钟）后新会话再回去试 Claude，已钉住的会话保持不动。
- 把 proxy 模式当无感隧道。HTTPS_PROXY 写在 settings.json 的 env 里，Claude Code 跑的命令（git、curl、gh）也会走 relay 当盲隧道，router 挂了它们就失败；proxy 模式下 router 停了 Claude Code 连不上，得 node tools/setup.mjs rc 重启；proxy disable --go 可逆，但已在 proxy 模式的会话要重启才能恢复。
- 从 0.6 及更早版本升级只更新插件。0.7+ 只读 "format": 2，不迁移的话后台跑着的 0.6 router 会一直跑旧代码；用 /provider setup upgrade my model-relay config 或 migrate → migrate --go → /provider restart。
- 把 doctor 当成会自动修。doctor 默认只报告、不改动；加 --fix 才让它自己修能修的问题；--json 给修复参数和是否需要确认。
- 把 /provider 面板当成全局切换。它切的是“当前这个窗口”，其他窗口不受影响；这正是它和全局模型设置的区别。
- 把 model-relay 当团队多租户代理。作者自己说那种场景应该用 LiteLLM；它是单人本地守护进程。
- 把 cedr 当稳定标准。它处于 preview，1.0 前命令与文件格式仍可能变；写进团队流程会有迁移成本。
- 以为 cedr 能自己拿到所有 harness 的用量。原文只具体说明了 claude-statusline 与 codex 两种 kind；其他 harness 如何提供读数未说明。读不到 cedr route pools 就不要继续。
- 把 cedr Council 当开箱即用。reviewer 报告格式、quorum 默认值、merge 的输入形态原文未给，需读 docs/council.md；报告数量不足时不会静默放行，P0/P1 会阻断，但先要能产出合格报告。
- 忘记 cedr route sync 会外发数据。只有加了 [sync] 段和 cedr.dev API key 后 cedr route sync 才上传；默认不要开。
- 让 cedr lock 执行了第三方 MCP server。cedr lock 只有在传 --introspect 时才真正运行 MCP server，运行前会先警告；若不允许执行第三方 server，就不要加这个参数。
- 把 cedr.lock 当成不会误报。它固定 skill 与 MCP server 后，server 的工具、描述或网络主机变化会让 verify 失败；先确认这是你要的漂移告警，再挂 CI。
- 把 cedr 的示例输出百分比当实测。balanced:31%<claude=64%、codex s22% w31% 等是演示用输出样例，不是实测结论。
- 材料本身是截断的。OmniRoute 本次原文在策略表第 3 条处被截断，安装/首次运行章节不完整；早期材料曾称在 19 种策略表第 12 行处截断，说明版本不同。Gluon 的给定文本也只是 README landing page。Claude Code 的三支原文都在关键处中断：F1 停在“Opus 5.5 继续工作 / Fable 5.1”；F2a 停在「Haiku 5.5」；F2b 停在“→ 只读 haiku 5.5”，没有文档链接、版本号和确切命令语法。F3 只给了一条环境变量，主模型与任务划分未展开。model-relay 的调研正文在“对应研究问题”处被截断。cedr 的最小试用原文在“第二周在 2–3”处截断，Council 细节只在 docs 指向中。
- 名称相近但关系不明。OmniRoute 材料里作为 keyless 免费后端的 “OpenCode Free”（oc/…）与别处提到的 OpenCode 名称相近，但原文没有说明两者是否同一项目，不能确认；FlagshipRouter 也把 OpenCode Free 列为免注册可用模型来源，同样没有说明它与 OmniRoute 那边的 OpenCode Free 是不是同一回事。
- agent-smith 的 USD 数值是“实测用量 × 冻结的 API Standard 参考价”，不是 Codex 订阅账单。
- agent-smith 的难度打分是本地、未校准的启发式；缓存效应与用量覆盖不全（partial usage coverage）会如何影响成本对比，作者自己列为待解决问题。
- agent-smith 除 Astra、6.1 Sol 外，原文没有给出被路由模型清单、支持的任务类型或失败案例。
- agent-smith 分发为源码优先，无预打包 DMG，构建为 ad-hoc 签名；Float 仅 macOS 14+。
- 七个项目、F3 这条推文、model-relay 和 cedr 的材料都未说明可集成；同时安装或叠加配置时不要假设请求一定经过你以为的那一层。

## 证据与来源

本节区分可照做的操作、项目自述数据和材料边界。

**OmniRoute**：可照做的操作性内容包括 npm 包 omniroute、Docker 镜像 diegosouzapw/omniroute、默认端点 http://localhost:20128/v1、Dashboard → Endpoints 取 key、带 Authorization 的 curl、auto 别名表、combo 四层、/dashboard/free-tiers 与 live analytics、tos: avoid 的 provider 默认排除。项目自述但未验证的有 375 个 provider、1475 个 chat 模型 ID、37 个集成、MCP 110 工具、56,000+ 静态测试、~1.62B 免费 token/月、压缩省 15–95% 等；材料在策略表第 3 条处截断，安装/首次运行、combo 完整策略和压缩配置不完整。

**agent-smith**：可照做的有 codex plugin marketplace add .、codex plugin add adaptive-router@agent-smith、router.py --help、model_registry.py show、Use $adaptive-route for this task: …、离线 benchmark demo/report、unittest 命令、Float 构建。原文给出 6 个公开合成任务 × 三种策略 × 单次尝试、18/18 通过确定性 grader 的表：Fixed Astra 102,162 token / $1.237460；Fixed 6.1 Sol 105,285 / $0.1921092；Local router 101,392 / $0.1621807。作者称相对 Fixed Astra 参考成本少 86.89%、实际 token 少 0.75%，但这是单次选择器实验，USD 是冻结参考价，不是 Codex 订阅账单；缓存输入 token 差异会污染对比。

**FlagshipRouter**：可照做的有 git clone、npm run launch、--host 127.0.0.1、-p、--no-browser、Endpoint & Key、Models、CLI Tools、brand.json 与 npm run brand:sync、providers 策略 JSON、测试命令。只有 37 stars 等仓库元信息，没有性能、成本、质量或用户案例数据；测试套件带已知失败，示例模型名 gpt-6-astra 不是真实可用模型。

**Gluon**：可照做的有 install.sh/install.ps1、bun add -g、cd your-repo && gluon、intake agent 生成 agent/model/effort 与 spec、按 Enter 在 frame 内启动、多会话人工切换。给定文本是 README landing page，routing.yaml、权限、工具供给、安全隐私、成本分析示例、故障排查都在 docs；没有效果数据。

**LiteLLM**：可照做的有 uv add litellm、OPENAI_API_KEY/ANTHROPIC_API_KEY、completion(model=…)、uv tool install 'litellm[proxy]'、litellm --model gpt-4o、OpenAI SDK 指向 4000、Terraform 模块、MCP 的 tools type mcp 请求体与 Cursor mcpServers JSON、litellm.agent 的 Harness 用法、A2AClient 片段。100+ 提供商、虚拟密钥、多租户成本追踪、A2A Agent 网关、MCP 工具网关等是项目自述；Terraform 输出段、A2A 与 MCP Bridge 在材料中截断，Docker/E2E/MCP 登记细节在 docs。

**Claude Code /advisor 第一种挂法（F1）**：可照做的有 /model fable（某些计划下接受计费确认）与 /advisor fable；原文称 Opus 5.5 继续工作、Fable 5.1 作为顾问，但正文在关键处中断，顾问何时介入未给出。模型名与文档地址无法核实；“别浪费另一个模型配额”是作者主张，可核实互动量只有 70 赞、8 次转发、14 条回复。

**Claude Code 顾问模式第二种挂法（F2a）**：可照做的原文配置行是 claude -> model sonnet -> advisor opus；按箭头还原的尝试形态是 claude、/model sonnet、/advisor opus，但确切语法待核对。原文称 Sonnet 跑会话并编辑代码、Opus 作为顾问；没有文档链接、版本号或确切语法，Haiku 那一环在「Haiku 5.5」处截断。可核实互动量 120 赞、13 次转发、17 条回复；“不为不需要 Opus 的工作付 Opus 的价格”是作者主张。

**Claude Code 多模型分层第三种挂法（F2b）**：可照做的原文命令是 claude --model sonnet --advisor opus；分工为 sonnet 5.5 运行主会话并编辑代码、只读 haiku 5.5（截断）、只有真正需要决策时才引入 opus。执行前必须用 claude --help 或 /help 确认 --advisor 存在；原文没有版本号。可核实互动量 37 赞、5 转发、10 回复；标题和“简直是黄金”是作者主张。

**Claude Code 子代理固定为 Haiku（F3）**：可照做的原文命令是 CLAUDE_CODE_SUBAGENT_MODEL=haiku claude；原文声称同时运行 Sonnet 5.5、Haiku 5.5、Opus 5.5，但只给子代理模型这一个配置，没有主模型设置、任务划分和子代理触发方式。没有版本要求与对比数据；“更好的输出，消耗的 token 少得多”是作者主张。

**model-relay**：可照做的有安装插件、/provider setup、/provider init、node tools/setup.mjs add、/provider doctor --ping、alias 命令、providers.<name>.agent 的 description/effort/maxTurns、429 failover.chain 与默认值、statusline 文件格式、proxy enable/disable、0.6 升级迁移。定位是单人本地守护进程；provider 必须能接 Anthropic /v1/messages；给定调研正文在“对应研究问题”处截断，没有成本、质量、稳定性或用户案例数据。

**cedr**：可核对的操作性内容有安装命令与平台矩阵、glibc 版本要求、routes.toml 完整样例、Claude Code statusLine 的 JSON、cedr route pick/verdict 的真实命令与示例输出、cedr route stats/pools/list、cedr council plan/merge、cedr lint/lock/verify 与 --introspect 警告、claude mcp add cedr -- cedr mcp、SHA256SUMS/gh attestation verify、以及指向 docs/route.md、docs/council.md、docs/design.md 的规格说明。只是作者主张、没有证据的是：路由“挑得对”、Council 能提高评审质量、锁文件能防住真实风险；原文没有效果数据、案例研究、对比实验或用户反馈，仓库仅 42 stars、单一组织维护、preview 阶段，示例输出里的百分比是演示样例。材料边界：1.0 前命令与文件格式可能变；用量接入只具体说明 claude-statusline 与 codex 两种 kind；Council 报告格式、quorum、merge 输入形态未给；cedr route sync 会外发数据；跨机器/团队共享路由是付费计划功能；最小试用第二周在“第二周在 2–3”处截断。

**材料边界**：所有效果数字都需要自测；本手册只把可复制的命令、配置和提示词当作操作依据，把项目自述数字和作者主张当作待验证信息。七个项目、F3 这条推文、model-relay 和 cedr 的材料都未说明可以互相集成；同时安装或叠加配置时不要假设请求一定经过你以为的那一层。

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
