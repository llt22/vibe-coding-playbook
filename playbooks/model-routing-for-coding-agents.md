# 让编码 agent 只在需要时用贵模型，并在完成前拿出证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决多供应商/多模型编码时配额闲置、限流与死 key 中断、贵模型全程主持、以及 agent 未经验收就宣布完成的问题。
> 先试这一步：如果你用 Claude Code，先在终端运行 `claude --help` 确认存在 `--advisor`，再用一个真实中等复杂度任务做 A/B：默认方式跑一遍，`claude --model sonnet --advisor opus` 跑一遍；参数不存在就退回“贵模型只用在决策点”，或先做做法 A 的本地网关最小验证。
> 最近修订：2026-10-16

## 解决什么问题

编码过程中经常遇到几种中断：某个供应商的订阅配额到期没用完、编码到一半被限流、某个 key 死掉导致整条流程卡住、工具输出烧 token。这些事本身没有谁专门负责，于是变成你手动换模型、换 key。另一类问题是模型选择：要么一直用最重最贵的模型，要么靠手动切换；agent 宣布完成时，也可能只看进程退出，不看任务是否真的通过确定性检查。还有一种浪费是：主力模型已经成为日常，另一个模型的配额一直闲置，却没有把它挂进当前会话。本次新增一条同层做法：在 Claude Code 启动时用 `--model` / `--advisor` 做多模型分层，让 Sonnet 主跑、Opus 只在决策点介入、Haiku 承担只读杂活；但原文在“→ 只读 haiku 5.5”处被截断，Haiku 配置待核对。

本手册给出一套本地可试的做法：用 OpenAI 兼容网关统一接多个供应商，并在配额耗尽、供应商失败或成本上升时自动回退；在 Codex 内用 Adaptive Router 按本地难度启发式选择轻/重模型；用“有证据的验收”判断是否真的完成；再用一层控制平台，为每次会话选择 harness × model × effort 并观察成本与上下文；以及用 LiteLLM 的 SDK 或网关把 100+ 供应商统一成 OpenAI 格式，并做按项目/用户的成本追踪。Claude Code 内还有一条线：把次要模型挂成顾问，避免贵模型全程主持。目前材料里有三种挂法：F1 是主模型用重模型（原文称 Opus 5.5）、把另一个闲置配额模型（原文称 Fable 5.1）挂成顾问；F2a 是用会话内命令让轻模型（原文称 Sonnet）主跑并改代码，把重模型（原文称 Opus）挂在顾问位；F2b 是本次新增的启动参数写法 `claude --model sonnet --advisor opus`，并提到只读 Haiku 承担杂活。三者的模型名与命令语法在给定材料里都无法核实，先分开小范围试。

OmniRoute 调研把四类痛点明确列为可接管项：订阅配额到期未用完、编码中途被限流、工具输出烧 token、死 key 导致阻塞。agent-smith 的核心主张是：常规工作交给更轻的模型，困难任务才动用重型模型，路由依据是一个本地、未校准的 1.0–10.0 难度启发式。FlagshipRouter 是同一层的另一种接法：本地 OpenAI 兼容网关，把 Claude Code、Cline 等工具接到多家免费供应商的模型表上，用面板统一改配置。Gluon 在会话层：把 Claude Code、Codex、Antigravity、Grok Build、OpenCode、Kimi Code 并排跑在同一个终端框架里，把 agent 定义为 harness × model × effort，先和你确定 spec 再按可配置规则路由，并提供成本与上下文可观测性。LiteLLM 提供 SDK 和 AI Gateway 两种用法。Claude Code 的 `/advisor` 是另一条线；F2b 的新材料只给出一条启动命令和三条分工，正文在“→ 只读 haiku 5.5”处截断。七个项目的材料都未说明可以互相集成，先分别试。

## 适用与不适用

适用：

- 你手上有多个供应商或多把订阅/API key，经常因为某一个配额耗尽、限流或失败而中断工作。
- 你愿意在本机长期运行一个本地服务，并且手上的工具支持自定义 OpenAI 兼容 base URL。
- 你使用 Codex，并愿意在 Codex 内装本地插件，用 $adaptive-route 跑日常任务。
- 你想先用离线 benchmark demo 验证路由/评测链路，再上真实任务。
- 你想用一个面板把“哪个工具接哪个模型”集中管起来，并希望工具里的模型以统一前缀显示（FlagshipRouter 的 `flagshiprouter/<model>`）。
- 你已经装了多个编码 agent（Claude Code、Codex、Antigravity、Grok Build、OpenCode、Kimi Code 中至少一个），想在同一终端框架里并排开会话，并为每次会话选 harness/model/effort。
- 你想按会话看到成本与上下文占用，用来比较不同选择；并且能在 Linux/macOS/WSL/Windows 的本地 git 仓库里跑终端命令。
- 你想先在 Python 代码里用同一个函数调不同供应商（换模型只改 `model` 字符串），再决定要不要上网关。
- 你需要在本地网关侧做按项目/用户的成本追踪与虚拟密钥，或想把 Claude Code / Codex / OpenCode / Deep Agents 作为 harness 跑在自己的网关上。
- 你使用 Claude Code，且版本支持 `/advisor` 或 `--advisor`；主模型已设为日常主力，同时还有另一个模型的可用配额（F1）。
- 你使用 Claude Code，账号/计划允许在 Sonnet、Opus、Haiku 等模型之间切换，主要任务是代码编辑、对成本敏感，并愿意先在一个 1–2 小时的中等复杂度改动上做 A/B（F2a/F2b）。
- 你只想先在非敏感、非生产任务上小范围试。

不适用或需要谨慎：

- 有合规或数据敏感要求：接入前先看清请求是否会经过第三方免费层。OmniRoute README 自己披露有 13 家供应商因条款风险被标记为 avoid。
- 想直接采信 README 的效果数字：OmniRoute 原文没有给出测量方法、测试集或对照实验；agent-smith 只有 6 个合成任务、单次尝试；FlagshipRouter 只有仓库元信息；Gluon 没有效果数据；LiteLLM 是特性索引 + 宣传。
- 想用 OmniRoute 的“生产级”能力（MCP、A2A、guardrails、evals、TLS stealth、key pools 等）：给定材料里只有名词，没有配置步骤。
- 想用 FlagshipRouter 的 Media Models 和 Agent Skills 页面：README 只提到存在，没有给用法。
- 想直接照抄 Gluon 的 `routing.yaml`：具体写法、权限与工具供给、安全隐私、成本分析示例、故障排查都在文档站点，给定材料没展开。
- Codex Float 仅 macOS 14+；agent-smith 的 router 执行需要已有 Codex 登录。
- FlagshipRouter 默认面板密码是 `123456`，默认监听 20128；暴露到 localhost 之外前必须改密码。
- 想在同一个 Python 环境里同时装 litellm 和 litellm-core：只能装一个。
- 想让 LiteLLM 的 MCP OAuth 一路走通：可能需要预注册 OAuth app 并配置 credentials。
- 生产环境想用明文 ALB 长跑：`allow_plaintext_alb = true` 按 README 只限 dev/trial。
- 想直接照抄 Claude Code 的 `/advisor`（F1）：原文唯一依据是文档地址，且被截断；模型名无法核实。
- 想直接照抄 Sonnet 主跑 + Opus 顾问（F2a）：原文只有一行箭头写法 `claude -> model sonnet -> advisor opus`，没有给出文档链接、版本号或确切命令语法。
- 想直接照抄 F2b 的 `claude --model sonnet --advisor opus`：原文没有说明 `--advisor` 从哪个版本起可用；执行前必须用 `claude --help` 或 `/help` 确认参数存在。参数不存在就停止照抄命令。
- 想把 Haiku 只读那一环当现成配置：F2b 原文在“→ 只读 haiku 5.5”处截断，怎么在 Claude Code 里指定 Haiku 只读、给什么权限，原文没有给出。
- 想把“停止支付 opus 来做 haiku 的家庭作业”“简直是黄金”“不为不需要 Opus 的工作付 Opus 的价格”当结论：都是作者主张，原文没有数据、基准、案例或成本对比。
- 想把 F1、F2a、F2b 混着抄，或把 `/advisor`、`--advisor` 与 A–E 的网关/路由自动叠加：材料都未说明可集成，先分开试。

## 前置条件

- OmniRoute：本机可安装 npm 全局包；能长期运行一个本地服务；零凭证也能先跑；要接自有供应商时需要有对应的 API key 或订阅凭证；被接入的工具支持自定义 OpenAI 兼容 base URL。README 点名的可接工具包括 Claude Code、Codex、Cursor、Cline、Copilot、Antigravity。Docker、源码、pnpm、Arch 等安装方式在给定文本未给出命令。
- agent-smith：Python 部分只用标准库；路由执行需要已有的 Codex 登录；Float 需要 macOS 14+、/usr/bin/python3 和 Xcode Command Line Tools。以下命令均在克隆后的仓库根目录执行（Float 相关除外）。
- FlagshipRouter：Node.js 20.9 或更高（README 建议 22）；git 与 npm 可用；本地端口 20128 空闲——与 OmniRoute 默认端口相同，不能按默认端口同时启动；要接自有供应商时需要相应凭证，不想注册时可先只用 OpenCode Free 的免注册模型。
- Gluon：至少一个受支持编程智能体的 API key 或订阅；Linux、macOS、WSL 或 Windows；在本地 git 仓库目录中操作。安装需要能访问 GitHub release，或用 Bun 从 release tarball 安装。
- LiteLLM：Python 环境 + `uv`；装 SDK 用 `uv add litellm`，同一环境只能装 litellm 或 litellm-core 之一；起网关用 `uv tool install 'litellm[proxy]'`，本机 4000 端口可用；接 MCP 需要 master key 或虚拟 key；跑 harness 需要 `starlette`、`uvicorn` 以及对应 agent 的 CLI；走 A2A SDK 需 `a2a-sdk>=1.1.0`；从源码构建 core 包需要 Git、`uv` 和 Rust 工具链。
- Claude Code `/advisor`（F1）：原文只给出两个命令；执行前先确认版本存在 `/advisor`；已把主力模型设为原文所称的 Opus 5.5；另有一个模型的可用配额（原文称 Fable 5.1）；某些计划下需要先执行 `/model fable` 接受按使用信用计费的确认。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a）：本机已安装并可运行 Claude Code CLI；账号/方案支持在 Sonnet、Opus 等模型之间切换；额度允许调用 Opus；已对照官方文档核对 `/model`、advisor 相关开关以及 Haiku 的用法。原文只给出一行箭头写法。
- Claude Code 启动参数分层（F2b，本次新增）：本机已安装并可运行 Claude Code CLI；先在终端运行 `claude --help`，或在会话内用 `/help`，确认存在 `--model` 与 `--advisor`；账号/方案允许在 sonnet、opus、haiku 等模型之间切换；额度允许调用 opus；原文没有给出支持该参数的版本号。

## 操作步骤

**做法 A：本机 OpenAI 兼容网关，按任务选模型并自动回退（OmniRoute）**

1. 安装并启动网关。前提：有 Node.js/npm 环境。

```bash
npm i -g omniroute
```

预期结果：README 说明安装后服务在本机 localhost:20128 启动。

2. 零凭证验证连通。前提：上一步的服务已在跑。

```bash
curl http://localhost:20128/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'
```

预期结果：拿到模型回复，说明本地端点可用、无需 key 就能返回。如果只想指定这个免费后端，可直接调 oc/…（OpenCode Free），跑通后再改用 auto 让它自己挑。

3. 只把一个工具指向这个端点。前提：该工具支持自定义 OpenAI 兼容 base URL。把 base URL 设为 http://localhost:20128/v1，模型名填第 4 步的别名。建议先接一个你已经在用的工具，不要一次全换。

4. 按任务选模型别名。原文给出的映射可直接用：

| 模型 ID | 用途 |
| --- | --- |
| auto | 均衡默认，粘住上次可用的好供应商（LKGP） |
| auto/coding | 代码生成，质量权重优先 |
| auto/fast | 最低延迟优先 |
| auto/cheap | 每 token 最便宜优先 |
| auto/offline | 剩余配额/限流余量最多优先 |
| auto/smart | 质量优先 + 10% 探索 |
| auto/lkgp | 显式“上次已知良好供应商”粘性 |
| auto/chaos | 并行发到一个模型面板（默认每供应商一个、共 5 个），返回一个答案 |

5. 连续试用并保留对照路径。同一批任务下，一路走网关、一路直连原供应商，记录中断次数和人工切换次数。

6. 看配额与用量。打开 /dashboard/free-tiers 看已用/剩余。README 称该页每两周对照实时目录重审，还称 dashboard 有 usage、quota、savings、p95 延迟的实时分析，但没有给操作步骤，所以只把它当成提示，别当成依据。

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

预期结果：路由器按本地 1.0–10.0 难度启发式（步长 0.1）选择模型；常规工作给更轻模型，困难场景再上重型模型。一个 skill 无法在生成中途切换主任务的模型；任务启用后，会把独立的工作块通过原生 subagent 路由。

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

2. 用只监听本机的方式启动，并先改掉默认密码。前提：你不想让面板暴露到 localhost 之外；README 明确要求在暴露前改掉默认密码 `123456`。

```bash
npm run launch -- --host 127.0.0.1
```

预期结果：只在本机监听；打开面板进 Settings 把密码从 `123456` 改掉。需要 CLI 参数时写在 `--` 之后，例如换端口 `npm run launch -- -p 20130`、不自动开浏览器 `npm run launch -- --no-browser`。

3. （可选）想在任何目录直接用 `flagshiprouter` 命令，先链接一次 CLI 包：

```bash
cd cli && npm link
```

4. （可选）开发模式带热重载：

```bash
npx next dev --port 20128
```

5. 建 key、选模型、接工具（前提：服务已在跑）：

   1. 打开 **Endpoint & Key**，创建一个 API key。
   2. 打开 **Models**，选一个标为 **Ready** 的模型（OpenCode Free 的模型不需要注册即可用），或先连接某个供应商以解锁更多模型。
   3. 把工具指向 `http://localhost:20128/v1` 并填入该 key；或直接用 **CLI Tools** 页面为 Claude Code、Codex、OpenCode、Cline、Copilot 等写入配置。模型在这些工具里显示为 `flagshiprouter/<model>`。
   4. 只接一个你已经在用的工具，并在写入前记录它原来的配置，以便回滚。

6. 验证连通。README 示例里的模型名 `gpt-6-astra` 来自 README，不是真实可用模型，必须换成你实际 Ready 的那个。

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer $FLAGSHIPROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-6-astra", "messages": [{"role": "user", "content": "Hello"}]}'
```

预期结果：拿到模型回复，说明端点与 key 可用。

7. （可选）集中改品牌与命名：编辑仓库根目录的 `brand.json`。`name` 控制面板、终端 UI、托盘、页面标题、翻译里的产品名；`slug` 控制 npm 包名、CLI 命令、数据目录（`~/.<slug>`）、请求头、MITM 证书名；`modelPrefix` 控制写进 CLI 工具配置的供应商前缀（模型显示为 `<modelPrefix>/<model>`）；`tagline`/`description` 控制页面标题与 web app manifest；`repository`/`branch` 控制链接、changelog 和 agent-skill URL；`updateCheck` 控制 npm 更新提示（包还没以该 `slug` 发布前保持 `false`）；`providers` 控制免费供应商策略。改完运行：

```bash
npm run brand:sync
```

预期结果：更新两个 `package.json`（包名、CLI bin），其余在运行时或构建时读取 `brand.json`。

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

规则：某个供应商可用，当它的注册表条目（`open-sse/providers/registry/<id>.js`）有列出的 `category`，或者被标为 `hasFree` 且 `includeHasFree` 为开；`include` 和 `exclude` 填 provider id。该策略在面板、管理 API、连接存储和路由时都被强制执行。`customEndpoints` 打开后允许用户自定义 OpenAI/Anthropic 兼容端点；把 `freeOnly` 设为 `false` 会恢复完整的上游供应商列表。

9. （可选）跑测试。README 自陈套件带已知失败，建议与上一个 commit 的运行结果对比，而不是期待全绿：

```bash
npm install --prefix /tmp/vitest-runner --legacy-peer-deps vitest@4
ln -sfn /tmp/vitest-runner/node_modules tests/node_modules
cd tests && npx vitest run
```

**做法 D：用控制平台为每个会话选 harness/model/effort，并看成本与上下文（Gluon）**

前提：已有至少一个受支持编程智能体的 API key 或订阅；使用 Linux、macOS、WSL 或 Windows；在本地 git 仓库目录中操作。以下步骤全部来自原文 README；`routing.yaml` 等细节原文指向文档站点，未在给定文本中展开。

1. 安装最新 release。Linux、macOS、WSL：

```sh
curl -fsSL https://github.com/fidipro/gluon/releases/latest/download/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://github.com/fidipro/gluon/releases/latest/download/install.ps1 | iex
```

原文还给出 Bun/源码方式的线索：从 release 下载 npm 风格 tarball `gluon-<version>.tgz`，然后 `bun add -g "$PWD/gluon-<version>.tgz"`（Linux、macOS）；从 checkout 构建见 CONTRIBUTING.md。校验与所有安装选项见其 install guide。预期结果：`gluon` 命令可用。

2. 进入仓库并启动：

```sh
cd your-repo && gluon
```

预期结果：在当前仓库里进入 Gluon 终端框架。

3. 首次运行时按引导连接你的 agent。预期结果：走一遍 connecting your agents。具体连接步骤在文档站点，给定 README 未展开。

4. 描述这次会话是做什么的。预期结果：intake agent 读取你的仓库、问几个问题，并提出一个 agent、model 和 effort，以及一份 spec。

5. 按 Enter，在该 agent 自己的 UI 中启动会话，会话运行在 Gluon 的 frame 内。按一个键回到主界面，可以继续启动更多会话。预期结果：多会话并排，由你人工在会话间切换推进。

6. 需要配置路由规则时查文档，不要照抄本文。原文说 Gluon 先和你确定 spec，再按可配置规则路由；Reference 文档包含 CLI、config、`routing.yaml`、environment、models。给定文本没有给出 `routing.yaml` 的具体内容。

7. 用 Gluon 查看各会话的成本与上下文可观测性和分析。原文没有给出具体命令或面板操作步骤，只能按 UI 自行摸索，并把结果与自己记的账对照。

**做法 E：用 LiteLLM 统一多供应商，并按项目看成本（LiteLLM）**

前提：有可用的 Python 环境与 `uv`。以下命令来自 README；Docker 快速上手、E2E 教程、MCP 具体配置都在 docs，本页未展开。先做 E1，觉得需要虚拟密钥、多租户成本追踪、管理后台再上 E2。

*路线 E1：先在 SDK 层做最小验证*

1. 安装 SDK。前提：Python 环境 + `uv`。

```shell
uv add litellm
```

预期结果：`import litellm` 可用。README 明确提示：另有一个独立的 `litellm-core` 发行版，提供相同 `import litellm` API 但没有可选 extras、CLI 入口和内置 dashboard；同一环境只能装一个 SDK 发行版，因为两者会写重叠的 Python 文件。要用 proxy/CLI/可选 extras 就装 `litellm`。

（可选，从源码构建 core 包；前提是装了 Git、`uv` 和 Rust 工具链，且要在没有 `litellm` 的全新环境里安装：）

```shell
python scripts/build_core_distribution.py --out-dir dist/core
python -m pip install dist/core/litellm_core-*.whl
```

2. 配置各 provider 的 API Key（环境变量）。前提：你至少有一个 provider 的 key。

```python
import os
os.environ["OPENAI_API_KEY"] = "your-openai-key"
os.environ["ANTHROPIC_API_KEY"] = "your-anthropic-key"
```

3. 用同一个函数调不同模型。预期结果：把原来多个 SDK 的调用收敛成一处，换模型只改 `model` 字符串。

```python
from litellm import completion

# OpenAI
response = completion(model="openai/gpt-4o", messages=[{"role": "user", "content": "Hello!"}])

# Anthropic  
response = completion(model="anthropic/claude-sonnet-4-20250514", messages=[{"role": "user", "content": "Hello!"}])
```

*路线 E2：起本地 AI Gateway（成本追踪/虚拟密钥的入口）*

4. 安装并启动 proxy。前提：装的是带 `[proxy]` extra 的发行版；本机 4000 端口可用。

```shell
uv tool install 'litellm[proxy]'
litellm --model gpt-4o
```

预期结果：本机起一个 AI Gateway，默认监听 4000 端口。

5. 用标准 OpenAI SDK 指向网关。前提：已在网关侧配置好上游 key 与虚拟密钥（README 指向 docs 的 E2E 教程与 Docker 快速上手，本页未展开）。

```python
import openai

client = openai.OpenAI(api_key="anything", base_url="http://0.0.0.0:4000")
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
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

README 同时提示：生产环境要提供 ACM 证书，没有证书则设 `allow_plaintext_alb = true`（仅限 dev/trial）；稳定版用带 `-stable` 标签的 docker 镜像，这些镜像发布前经过 12 小时负载测试。注意：抓到的原文在 Terraform 输出段被截断，云部署部分只有前半段可依据。

*路线 E3：把工具（MCP）接到模型上*

7. 网关侧先登记 MCP Server。前提：MCP server 已可用；持有 master key 或虚拟 key。README 指向 docs 的 “Adding your MCP” 步骤，本页未展开配置细节。

8. 通过 `/chat/completions` 调 MCP 工具：

```bash
curl -X POST 'http://0.0.0.0:4000/v1/chat/completions' \
  -H 'Authorization: Bearer <your-master-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Summarize the latest open PR"}],
    "tools": [{
      "type": "mcp",
      "server_url": "litellm_proxy/mcp/github",
      "server_label": "github_mcp",
      "require_approval": "never"
    }]
  }'
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

10. 用 harness 指定 agent 与模型。前提：安装 `starlette`、`uvicorn` 以及对应 agent 的 CLI（`claude`、`codex` 或 `opencode`）；用 Deep Agents 则装 `deepagents langchain-litellm`。

```python
import litellm
from litellm import Harness, sandbox

result = litellm.agent(
    Harness.CLAUDE_CODE,  # or Harness.CODEX, Harness.OPENCODE, Harness.DEEPAGENTS
    "Find why tests/test_router.py is flaky and fix it.",
    sandbox=sandbox.local("./repo"),
    model="litellm_proxy/claude-sonnet-4-5",  # a model group on your AI Gateway
)

print(result.text, result.cost, [f.path for f in result.files])
```

预期结果：设置 `LITELLM_PROXY_API_BASE` 和 `LITELLM_PROXY_API_KEY` 后，agent 的每一次模型调用都会走你的网关，并打上 `harness,claude_code` 标签；去掉 `litellm_proxy/` 前缀则直接调 provider。

*路线 E5：A2A（材料不完整）*

11. 材料给出 A2AClient 直连 agent 的片段：

```python
from litellm.a2a_protocol import A2AClient
from a2a.types import SendMessageRequest, MessageSendParams
from uuid import uuid4

client = A2AClient(base_url="http://localhost:10001")

request = SendMessageRequest(
    id=str(uuid4()),
    params=MessageSendParams(
        message={
            "role": "user",
            "parts": [{"kind": "text", "text": "Hello!"}],
            "messageId": uuid4().hex,
        }
    )
)
response = await client.send_message(request)
```

前提：网关侧已把 agent 加入（按 agent 设 `protocolVersion` 为 `1.0` 或 `0.3`）；走 A2A SDK 需 `a2a-sdk>=1.1.0`。支持的 agent 来源：LangGraph、Vertex AI Agent Engine、Azure AI Foundry、Bedrock AgentCore、Pydantic AI。注意：抓到的原文在这里（`from mcp import ClientSessio`）被截断，MCP Bridge 部分没有可依据的内容。

**做法 F：在 Claude Code 里做多模型分层——先确认命令，再小范围 A/B（Claude Code）**

三个变体都只动 Claude Code 会话或启动参数，不碰网关；模型名与命令语法在给定材料里都无法核实。执行前先确认你所用的 Claude Code 版本确实存在相应命令或参数，否则以下步骤不成立。

*变体 F1（原有记录）：主模型 Opus，顾问挂另一个闲置配额模型*

前提：Claude Code 中已把主力模型设为原文所称的 Opus 5.5，且你还有另一个模型的可用配额（原文称 Fable 5.1）。

1. 仅在“某些计划”下需要这一步——先执行一次 `/model fable`，以接受按使用信用计费的确认。若你的计划没有该提示，可跳过。

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

4. 做一次 A/B：同一任务开顾问 vs. 不开顾问。前提：在单个项目、单个会话里试。记录返工次数、被采纳的评审意见数、最终产出差异，以及多出的计费额度与响应延迟。放弃条件：`/advisor` 不存在、顾问全程不介入，或多次任务中没有可观察差异。

*变体 F2a（原有记录）：Sonnet 主跑，Opus 做顾问（会话内命令写法）*

原文给出的配置是一行箭头写法：

```text
claude -> model sonnet -> advisor opus
```

调研的解读是：这很可能表示在 Claude Code 会话里依次执行的命令，而不是一条 shell 命令。按原文箭头还原的最简尝试形态（**语法待核对，不要照抄**）：

```text
claude
/model sonnet
/advisor opus
```

1. 前提：本机已安装并可运行 Claude Code CLI；账号/方案支持在 Sonnet、Opus 等模型之间切换，且额度允许调用 Opus。
2. 先在 Anthropic 官方文档核对 `/model`、advisor 相关开关以及 Haiku 的用法。原文被截断，没有给出文档链接、版本号或确切语法。
3. 把会话主模型设为 Sonnet（负责跑会话、改代码）。原文写法为 `claude -> model sonnet`，对应会话内的模型切换命令，实际写法以文档为准。
4. 打开 Opus 作为顾问，即只在需要判断/兜底时调用 Opus，而不是让它全程主持会话。原文写法为 `advisor opus`，命令确切形式原文未给。
5. （材料不明，先不要自己补）把轻量任务交给 Haiku：原文只剩「Haiku 5.5」几个字，负责哪类任务、怎么配置都没写清。去官方文档核对后再决定是否使用。
6. 跑一个真实任务，观察实际触发了几次 Opus，再决定是否把这个配置固化成默认。

*变体 F2b（本次新增）：用启动参数 `claude --model sonnet --advisor opus` 做分层*

原文只给出一条启动命令和三条分工，没有更多配置步骤。原文给出的部分（可原样复制，但执行前必须先核对参数）：

```bash
claude --model sonnet --advisor opus
```

原文给出的分工（照抄原文表述）：

- sonnet 5.5 运行主会话并编辑代码
- 只读 haiku 5.5（此处原文被截断，后续内容缺失）
- 只有在真正需要决策时才引入 opus

要照做，按这个核对顺序走（以下步骤是核对顺序，不是原文内容）：

1. 先确认本机 Claude Code 版本是否真的支持 `--advisor`：终端运行 `claude --help`（或在会话内用 `/help`）查找该参数。原文没有说明它从哪个版本起可用；如果不存在，这条命令无法照抄，只能退回到“贵模型只用于决策点”的分配原则。
2. 确认参数可用后，在项目目录用原文命令启动：

```bash
claude --model sonnet --advisor opus
```

3. 按原文分工，把文件阅读、检索、批量机械修改这类只读/低判断量的活交给 haiku。**具体怎么在 Claude Code 里指定 haiku 只读，原文被截断没有给出**，需要自己在你的版本里找等价做法（例如子代理配置或权限只读设置），不要凭猜测写进流程。
4. 决策点才切 opus：原文只说“只有在真正需要决策时才引入 opus”，没有给出切换判据，需自行定义（例如架构选型、跨模块改动方案、反复失败后的重新规划）。
5. 做一个 1–2 小时能做完的真实小任务，用默认模型跑一遍，再用 `claude --model sonnet --advisor opus` 跑一遍同类任务；任务、提示词、仓库状态保持一致。
6. 每次记录：账单/token 消耗、完成所需的重试次数、你手动接手修改的次数、以及“后悔没用 opus”的次数（决策被顾问模型纠正或放行的次数）。

*F1、F2a、F2b 怎么选*

- 目标不同：F1 是“别让另一份闲置配额白白浪费”，主模型仍是重模型；F2a/F2b 是“不为不需要 Opus 的工作付 Opus 的价格”，主模型换成轻模型。不要混着抄。
- 入口不同：F2a 是会话内命令，F2b 是启动参数。先运行 `claude --help`：如果 `--advisor` 存在，优先按 F2b 的最小对照试；如果只有 `/advisor` 存在，退回 F2a；如果两者都不存在，只保留“贵模型只用在决策点”这一条分配原则。
- 三者模型名（Opus 5.5、Fable 5.1、Sonnet、Haiku 5.5）与命令语法在给定材料里都无法核实；F2a/F2b 的原文都在关键处被截断。先确认命令存在，再小范围试。
- 材料未说明它们能与 A–E 的网关/路由自动集成；先分开试。

**做法 A / B / C / D / E / F 怎么选**

- 主要痛点是跨供应商配额、限流、死 key、工具输出烧 token：先做 A。
- 已经在用 Codex，痛点是“常规任务也调用最重模型”且想用确定性 grader 验收：先做 B。
- 想让多个工具从一个面板统一改配置、按任务换模型，并先拿免注册的免费模型打通：做 C。
- 痛点是“同一任务不知道该交给哪个 harness/模型/effort”，或者想按会话看成本与上下文：先做 D。
- 想先在 Python 代码里把多 provider 的调用收敛成一个函数，或者需要按项目/用户的成本追踪、虚拟密钥、Terraform 云部署：做 E。E1 只动代码、零运维，E2 起网关后才会碰端口和密钥。
- 日常用 Claude Code、主模型已就位、另有闲置模型配额：先做 F1。F1 只动 Claude Code 会话内的两个命令，不碰网关；但必须先确认命令真实存在。
- 日常用 Claude Code、对成本敏感、主要任务是代码编辑，想让贵模型只出现在判断点上：先试 F2b（启动参数），用 `claude --help` 确认 `--advisor`；不存在则试 F2a（会话内命令）。两者都必须先核对官方文档或 help。
- A 和 C 是同一层的本地 OpenAI 兼容网关，功能重叠，且默认端口都是 20128：先选一个跑通，不要同时按默认端口启动。E 也是请求层网关，但默认 4000 端口，与 A/C 不撞；端口不撞不代表能自动叠加，材料没有说明它们可以集成。
- A/C/E 与 D 不是同一层：A/C/E 在请求层按供应商/模型别名路由；D 在会话层把已有 harness 并排跑起来，按 harness × model × effort 路由。E 的 harness 抽象能在自己的网关上跑 Claude Code / Codex / OpenCode / Deep Agents，与 D 的“并排多个 harness”语义不同。两者材料都未说明可互相集成。
- B 与 D 都涉及 Codex：B 是在 Codex 内装插件按难度选模型，D 是把 Codex 当作可并排的一个 harness；材料未说明两者关系。
- F（F1/F2a/F2b）与 A–E 不是同一层：F 是 Claude Code 内部命令或启动参数，材料未说明能与网关/路由自动集成；先单独试。
- 七个项目的材料都未说明可以集成。如果确实要同时装，先把各自跑通，再自行验证请求实际走哪条路径；不要默认叠加。D 会把多个 harness 接到同一框架里，建议先在一个非关键、已纳入版本控制的仓库里试。

**暂时不要碰的部分**：OmniRoute README 提到的 MCP（110 个工具）、A2A、memory、guardrails、evals、TLS stealth、key pools 公平配额、AES-256-GCM 加密存 key，在给定材料里只有名词，没有配置步骤。agent-smith 的“多 agent 协作、重试、失败升级带来的收益”需要单独实验，材料未给步骤。FlagshipRouter 的 Media Models 页面和 Agent Skills 页面同样只有存在性描述，没有用法。Gluon 的 `routing.yaml`、权限与工具供给、安全隐私、成本分析示例、故障排查都不在给定材料里。LiteLLM 的 MCP 登记细节、Docker 快速上手、E2E 教程都在 README 指向的 docs 里，本页未展开；A2A 与 MCP Bridge 的原文被截断。Claude Code `/advisor` 的顾问介入方式、效果说明、与网关集成都未在原文中展开；F2b 那一支的原文连 Haiku 只读怎么配都没写全。

## 怎么判断变好了

最小试用：

- OmniRoute（1–2 天，仅限非敏感、非生产任务）：按做法 A 第 1–2 步装好并跑通 curl + model=auto，确认本地端点可用、无需 key 就能返回；只接一个工具（建议先接你已在用的 Cline 或 Claude Code），base URL 指向 http://localhost:20128/v1；连续一周用 auto/coding 做日常编码任务，同时保留一条直连原供应商的对照路径；不启用来源不明的免费供应商，先用自有 key 或已知供应商验证回退逻辑是否按预期工作。
- agent-smith（先零成本离线验证）：克隆仓库 → 按步骤 1–2 安装并检查 → 步骤 6 跑 demo 与 report 两条离线命令，确认基准管道能在自己机器上产出报告（这两条不调用模型，零成本）。确认通过后，准备 5–10 个日常常规 Coding 任务，分成两组：一组用 Use $adaptive-route for this task: …，一组固定用你平时最重的模型。只在这一小批上对比，不要一次性全面切换。
- FlagshipRouter（半天以内，全部本地）：clone + `npm run launch -- --host 127.0.0.1`，先去 Settings 把密码从 `123456` 改掉；在 Models 里挑一个 OpenCode Free 的免注册模型，用第 6 步的 curl 打通一条请求；用 CLI Tools 只给一个当前已在用的工具（例如 Claude Code）写配置，并记录原配置以便回滚；拿一个真实的小任务，分别在原配置和走网关的配置下各跑一遍。
- Gluon（非关键、已纳入版本控制的仓库）：按做法 D 的安装命令装好，`cd your-repo && gluon` 启动；选一个边界清晰的小任务，先用默认/交互方式让 intake agent 推荐 agent/model/effort，记录它给出的 spec；再手动用第二个 harness 或模型做同一任务，比较结果。如果要从路由规则开始，先查文档中的 `routing.yaml` 写法，不要照搬本文。
- LiteLLM（分两半，先 SDK 后网关）：先用 `uv add litellm`，用同一个 `completion()` 分别调 `openai/gpt-4o` 和 `anthropic/claude-sonnet-4-20250514`，确认换模型只改一个字符串；再用 `uv tool install 'litellm[proxy]'` + `litellm --model gpt-4o`，用上面的 OpenAI SDK 片段把 base_url 指向 `http://0.0.0.0:4000` 打通一条请求；只接 1–2 个模型，连续几天看成本追踪与失败率，而不是看 README 的能力清单。如果 SDK 层就够用（不需要虚拟密钥、多租户成本追踪、管理后台），不必起网关。
- Claude Code `/advisor`（F1，单个项目、单个会话）：按做法 F1 执行 `/model fable`（如提示计费则确认）与 `/advisor fable`，然后照常完成一个日常任务（例如修一个 bug 或做一次代码审查），全程记录顾问模型是否真的产出了可见内容。原文未给试用时长建议；先按单个任务/单会话判断，若 `/advisor` 不存在、顾问不介入，或多次任务中没有可观察差异，就停用并把结论降为 study。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a/F2b，单个真实的中等复杂度代码改动）：先在官方文档或 `claude --help` 核对命令语法，再挑一个真实的中等复杂度改动任务跑两次——A 组按本配置（Sonnet 主跑 + Opus 顾问），B 组全程用 Opus（或你原本的默认方式）；任务、提示词、仓库状态保持一致。F2b 的具体操作：先用 `claude --help` 确认 `--advisor`，再挑一个 1–2 小时能做完的真实小任务，用默认模型跑一遍，再用 `claude --model sonnet --advisor opus` 跑一遍同类任务。
- 要记录的指标：
  1. 任务是否完成、需不需要人工返工；
  2. 返工/追问的轮数；
  3. 该次会话的 token 消耗与费用（用 Claude Code 自带的用量/费用查看方式，具体命令以文档为准）；
  4. 复杂决策点上 Opus 被实际调用的次数与效果（是帮上忙，还是白花钱）；
  5. “后悔没用 opus”的次数（决策被顾问模型纠正或放行的次数）。
- 判断改善的标准：在完成质量和返工轮数不明显变差的前提下，费用明显下降；或同等质量下花更少轮次。若质量下降，或顾问调用次数高到费用接近全程 Opus，说明这个配置在你当前的工作类型上不成立，先退回原方式。若 `--advisor` 不可用，只保留“贵模型只用在决策点”这一条分配原则单独验证。原文没有给试用时长建议，先按单个任务/单会话判断。

指标（都自己测，不采信 README 的百分比）：

- 中断次数：同一批任务下，因限流/配额耗尽导致的请求失败或人工切换次数，对照直连单供应商。
- 人工干预次数：一周内你手动换模型/换 key 的次数是否下降。
- 任务接受率：用 accepted / rejected / unknown 记录；最好自己写一个确定性检查（测试通过、编译成功、断言满足），而不是看进程是否退出成功。核心门槛是接受率不下降。
- 实际 token 用量：分组对比，注意两组之间的缓存输入 token 差异（原文里 Sol 组有 24,832 缓存 token，其他组为 0，会污染对比）。
- 参考成本：用同一套冻结价格快照计算，且明确它不是你的真实账单。OmniRoute 的成本与 token 要同一提示词做 A/B，而不是引用 15–95%。
- unknown 比例：缺失用量或价格会被记为 unknown；unknown 占比过高说明计量覆盖不足，此时成本对比不可信。
- 延迟：自己记录 p95，别只信 dashboard 的 savings 卡片。
- 配额真实性：把 /dashboard/free-tiers 显示的 used/remaining 与供应商后台账单对照，这直接决定“配额感知回退”是否可信。
- 首次跑通耗时（FlagshipRouter）：从 clone 到第一条成功请求的分钟数。
- 切换成本（FlagshipRouter）：按任务换模型是否真的生效（看工具里是否显示 `flagshiprouter/<model>`），以及换一次要几步。
- 稳定性（FlagshipRouter）：Console Log 里的失败请求数、触发限流/额度耗尽的次数；面板另有 Usage 与 Quota 页 `/dashboard/usage`、`/dashboard/quota`。
- 副作用与可回滚（FlagshipRouter）：原工具有没有出现行为变化或配置被覆盖，能否一条命令回滚掉 CLI Tools 写入的配置。
- 单位任务成本与上下文占用（Gluon）：按会话比较不同 harness/model/effort 的 token 或费用、上下文占用，看推荐的组合是否真的更省。
- 选择成本与补问次数（Gluon）：从任务描述到开始执行的耗时、会话间切换耗时、需要人工补问的次数。
- 任务完成质量（Gluon）：人工评分、测试通过率或 review 意见数——四个项目都没给质量指标，要自己定。
- 供应商切换成本（LiteLLM）：在 SDK 或网关侧换一个 provider 要改几处（理想是只改 `model` 字符串或一处配置），以及换完要不要重启服务。
- 每项目/用户成本（LiteLLM）：README 列出的能力是“按项目/用户的多租户成本追踪与花费管理”，但没有给面板位置与操作步骤，需自己确认在哪里看、数字能不能对上你的账单。
- 失败率与重试/回退次数（LiteLLM）：SDK 侧 Router 支持跨多个部署（如 Azure/OpenAI）重试与回退，但需自测触发条件和成功率。
- 质量不下降：用你既有的评测方式（或同一组任务的人工打分）确认换模型后结果没有变差；auto/chaos 并行面板会成倍消耗上游调用，试用时单独计费观察。
- 顾问是否真实介入（Claude Code `/advisor`，F1）：命令是否真实存在、是否报错；顾问模型是否在会话中实际介入并给出可读建议，而不是只挂名；开顾问 vs. 不开顾问的返工次数、被采纳的评审意见数、最终产出差异；多出的计费额度与响应延迟是否值得换来上述差异。
- 贵模型实际被调用几次（Claude Code，F2a/F2b）：复杂决策点上 Opus 被实际调用的次数与效果；这个数字过高会把成本优势吃掉，过低则复杂改动的质量可能下降。

试多久、什么情况下停：

- OmniRoute：试三周。若三周后“中断次数 / 人工切换次数”没有下降，或配额显示与实际账单明显不符，就停用并把结论降为 study。
- agent-smith：成功标准建议：在接受率不下降的前提下，参考成本或实际 token 明显下降；若接受率下降或 unknown 比例高，先回到离线 benchmark 检查判分与计量的可靠性，再决定是否继续用。
- FlagshipRouter：先按半天的最小试用跑通，再决定要不要多用几天。只要出现“模型连通但结果明显变差”或“配置互相覆盖且难回滚”，就停止推广，把结论降为 study。
- Gluon：材料没有给出试用时长建议，只建议小范围试。在非关键仓库试到你能判断“推荐是否真的更省钱或更省上下文”为止；若质量明显下降，或成本/上下文没有可见改善，就停用并把结论降为 study。
- LiteLLM：SDK 最小验证半天内做完，网关最小验证再半天。若两天内你还说不清“换 provider 省了几步、成本数字是否可信”，就停在 SDK 层，不要上网关和 Terraform。
- Claude Code `/advisor`（F1）：原文没有试用时长建议。先按单个项目、单个会话判断；若 `/advisor` 不存在、顾问全程不介入，或多次任务中开/不开顾问没有可观察差异，就停用并把结论降为 study。
- Claude Code “Sonnet 主跑 + Opus 顾问”（F2a/F2b）：原文没有试用时长建议，先按单个任务、单个会话、单个中等复杂度改动判断；若命令或参数不存在、语法对不上、质量下降、或顾问调用次数高到费用接近全程 Opus，就退回原方式并把结论降为 study。

## 常见坑

- 把 README 的自述数字当结论。OmniRoute：省 15–95% token、~1.62B 免费 token/月、“永不停止编码”都没有给出测量方法或对照实验。agent-smith：86.89%/0.75% 来自 6 个合成任务 × 三种策略 × 单次尝试，没有第三方复现记录。FlagshipRouter：只有 37 stars 这类仓库元信息，没有任何性能、成本、质量或用户案例数据。Gluon：同样没有任何效果数据、对比实验或用户案例，“选择最具性价比的 agent”“成本与上下文可观测性”只是项目主张。LiteLLM：README 是特性索引 + 宣传，A2A agent 网关、MCP 工具网关、harness 跑任意模型、多租户成本追踪都只有概述，没有数据或对照实验。
- 一次把所有工具都切到网关。先只接一个，保留直连对照，否则无法判断是网关起了作用还是任务本身变简单了。
- 端口撞车。OmniRoute 与 FlagshipRouter 默认都监听 localhost:20128，同时按默认端口启动会冲突；FlagshipRouter 可用 `-p` 换端口，OmniRoute 的材料没有给出改端口方式。LiteLLM 默认 4000，与上面两个不撞，但材料没有说明三家网关能叠加使用。
- FlagshipRouter 默认面板密码是 `123456`。README 明确说暴露到 localhost 之外以前必须改；建议先用 `--host 127.0.0.1` 只本地监听。
- 把 FlagshipRouter 的测试不全绿当成自己装坏了。README 自陈套件带已知失败：live-provider 测试、缺失的 `cloud/` worker、对时序敏感的 DB 测试；引擎测试还在 `tests/setup/providerPolicy.js` 里把 free-only 策略关掉。
- 拿 README 的示例模型名当真实模型。FlagshipRouter 的 `gpt-6-astra` 只是 README 示例，必须换成你自己 Ready 的模型。
- CLI Tools 页面会代替你写工具配置，可能覆盖原配置。先记录原配置，确认能回滚再往下走。
- 忘记核对免费供应商条款。OmniRoute README 自己披露有 13 家供应商因条款风险被标记为 avoid。
- 把多把第三方 key 交给一个本地服务。OmniRoute README 称 key 本地加密（AES-256-GCM）、本地优先，但没有给出可照做的验证方法。
- auto/chaos 的并行扇出：默认每供应商一个、共 5 个模型面板，会成倍消耗上游调用。
- 只信 dashboard。savings 卡片不等于你自己的 p95 和账单。
- 照抄 Gluon 的路由配置。给定材料是 README landing page，原文自己注明细节在 docs/；`routing.yaml`、权限、工具供给、安全隐私、成本分析示例、故障排查都不在材料里。
- 把 Gluon 的安装方式当成有校验的安装。原文给的是管道执行远端脚本（`curl … | sh`、`irm … | iex`），材料没有给出校验步骤；原文提到校验与所有安装选项见 install guide，需要自己去看。
- 用 Gluon 时忽略代码库的权限与数据边界。多个 harness 并排意味着同一个仓库要交给多个第三方 agent，各自用自己的 key 或订阅；原文没有展开权限配置，先在非关键、已纳入版本控制的仓库里试。
- 以为 Gluon 会自动触发任务。它的会话由“描述本次会话目的”启动，多会话并排和会话管理只支持人工切换推进，原文没有给出自动触发或持续完成的机制。
- 把 Gluon 当成 OmniRoute / FlagshipRouter 的替代。D 是会话层控制平台，A/C/E 是请求层网关，材料未说明可集成。
- LiteLLM 的 `litellm` 与 `litellm-core` 不能同环境同装，会写重叠的 Python 文件；要用 proxy/CLI/可选 extras 就装 `litellm`。
- LiteLLM 的 MCP OAuth：上游可能宣称支持动态客户端注册，但实际用 HTTP 401/403 拒绝请求；若 provider 要求预注册 OAuth app，需在该 MCP server 上配置 `credentials.client_id`，必要时配 `credentials.client_secret`，以跳过网关登录流程里的动态注册；且 provider 必须批准该 app 用于 MCP 访问——能打开授权页不代表登录或工具调用会成功。
- LiteLLM 的生产部署别用明文。没有 ACM 证书时 `allow_plaintext_alb = true` 按 README 只限 dev/trial。“`-stable` 镜像发布前经过 12 小时负载测试”是 README 自述，没给测试方法。
- 照抄 LiteLLM 的 Terraform。抓到的原文在 Terraform 输出段被截断，云部署只有前半段可依据；Docker 快速上手、E2E 教程、MCP 登记步骤都在 docs，本页没有。
- 把 LiteLLM 的 A2A / MCP Bridge 当现成能力。原文在这两处被截断，没有可照做的完整步骤。
- 把 Claude Code 的 `/advisor` 当必然存在。原文唯一依据是文档地址 `code.claude.com/docs/en/advisor`，且该链接在原文中被截断；执行前先确认版本支持，命令不存在就停。
- 照抄 `/advisor fable` 和 `/model fable` 里的模型名。原文称 Opus 5.5、Fable 5.1，但给定材料无法核实这些模型名和文档地址；不同计划的计费确认方式可能不同，不要把这套命令当成跨版本通用。
- 以为挂上顾问就会自动介入。原文正文在关键处中断，未说明顾问在什么时机、以什么形式产出内容；必须观察它是否真的给出可读建议。
- 把 `claude -> model sonnet -> advisor opus` 当一条 shell 命令抄。原文用箭头书写，很可能表示会话内依次执行的命令；调研给出的 `/model sonnet`、`/advisor opus` 只是按箭头还原的写法，原文未给确切语法，执行前必须对照 Anthropic 官方文档核对。
- 把 `claude --model sonnet --advisor opus` 当跨版本通用命令。本次新增材料没有说明 `--advisor` 从哪个版本起可用；执行前必须用 `claude --help` 或 `/help` 确认参数存在。参数不存在就停止照抄命令，退回“贵模型只用在决策点”或 F2a。
- 照抄 F2a/F2b 里的模型名。Sonnet、Opus、Fable 5.1、Haiku 5.5，以及新材料里的 “sonnet 5.5 / haiku 5.5”，都无法从给定材料核实；「Haiku 5.5」指的是模型版本还是别的，也确认不了。
- 自己脑补 Haiku 那一环的配置。F2a/F2b 原文都在「Haiku 5.5」或“→ 只读 haiku 5.5”处被截断，它负责哪类任务、怎么配、给什么只读权限都没写；先去文档确认，不要自行加配置。
- 把“不为不需要 Opus 的工作付 Opus 的价格”或“停止支付 opus 来做 haiku 的家庭作业”当成效果结论。原文只有这些成本主张，没有数据、基准、案例或成本对比；F2a 可核实的互动量只有 120 赞、13 次转发、17 条回复，F2b 只有 37 赞、5 转发、10 回复。
- 以为 F2a/F2b 一定省钱。顾问触发过于频繁会把成本优势吃掉；触发过少，复杂改动的质量可能下降。原文没有给阈值，先自己记录 Opus 被实际调用的次数。
- 把 F2a/F2b 写进团队默认流程。原文被截断、没有文档链接和版本号，先在个人、单项目、单会话里试。
- 把 F1、F2a、F2b 混着抄。三者目标不同，模型分工和入口也不同；材料未说明可叠加。
- 把“别让配额白白浪费”当成效果结论。F1 的原文没有给出任何成本、效果或对比数据；可核实的互动量只有 70 赞、8 次转发、14 条回复。
- 把 `/advisor` 或 `--advisor` 与 A–E 的网关/路由混为一谈。前者是 Claude Code 内部命令或启动参数，材料未说明能与本地网关、Adaptive Router、Gluon 或 LiteLLM 集成；先分开试。
- 材料本身是截断的。OmniRoute 原文正文在 19 种路由策略表格第 12 行处被截断。Gluon 的给定文本也只是 README landing page。Claude Code 的三支原文都在关键处中断：F1 停在“Opus 5.5 继续工作 / Fable 5.1”；F2a 停在「Haiku 5.5」；F2b 停在“→ 只读 haiku 5.5”，没有文档链接、版本号和确切命令语法。
- 名称相近但关系不明。OmniRoute 材料里作为 keyless 免费后端的 “OpenCode Free”（oc/…）与别处提到的 OpenCode 名称相近，但原文没有说明两者是否同一项目，不能确认；FlagshipRouter 也把 OpenCode Free 列为免注册可用模型来源，同样没有说明它与 OmniRoute 那边的 OpenCode Free 是不是同一回事。
- agent-smith 的 USD 数值是“实测用量 × 冻结的 API Standard 参考价”，不是 Codex 订阅账单。
- agent-smith 的难度打分是本地、未校准的启发式；缓存效应与用量覆盖不全（partial usage coverage）会如何影响成本对比，作者自己列为待解决问题。
- agent-smith 除 Astra、6.1 Sol 外，原文没有给出被路由模型清单、支持的任务类型或失败案例。
- agent-smith 分发为源码优先，无预打包 DMG，构建为 ad-hoc 签名；Float 仅 macOS 14+。
- 七个项目材料都未说明可集成；同时安装时不要假设请求一定经过你以为的那一层。

## 证据与来源

本节区分可照做的操作、项目自述数据和材料边界。

**OmniRoute（调研《diegosouzapw/OmniRoute》）**

可当证据、可照做的操作性内容：

- 安装命令 npm i -g omniroute，服务在本机 localhost:20128 启动。
- 端点 http://localhost:20128/v1 与 model=auto 的连通性 curl。
- auto 系列模型别名表（auto、auto/coding、auto/fast、auto/cheap、auto/offline、auto/smart、auto/lkgp、auto/chaos）。
- 12 条路由策略的名称与含义（priority 到 reset-aware），以及“自建 combo + 自动回退分四层：Subscription → API Key → Cheap → Free”的机制描述。

只是项目自述、未经验证的主张：

- 357 家供应商、1,312 个唯一 chat 模型 ID、489 条免费额度条目/35 个可复用池键、~1.62B 免费 token/月（首月含注册额度最高 ~2.22B）、150+ 免费层、19 种路由策略。
- RTK + Caveman 省 token 15–95%（均值约 89%）。
- MCP 110 个工具、39,000+ 静态测试声明 / 5,100+ 测试文件、67 种语言文档、600 位贡献者、stars 71,844。
- “永不停止编码”“TLS stealth”“AI 校验的合并流水线”“生产级 guardrails/evals”——只有名词，没有步骤或数据。

原文自己给出的限制说明：

- 免费额度数字每两周对照实时目录重新审计，且“双向变化”。
- 13 家供应商因条款风险被标记为 avoid。

材料局限：

- 给定原文是 README 的营销化开头，正文在 19 种路由策略表格第 12 行处被截断。
- 全文含大量 affiliate/推荐链接和赞助位，营销色彩重，README 自称“The Free AI Gateway”并引导点 star。

**agent-smith（调研《Chengjun023/agent-smith》）**

可当证据、可照做的操作性内容：

- 安装：codex plugin marketplace add .、codex plugin add adaptive-router@agent-smith。
- 检查：python3 router/scripts/router.py --help、python3 router/scripts/model_registry.py show。
- 启用提示词：Use $adaptive-route for this task: …。
- 离线基准：python3 router/benchmarks/benchmark.py demo --run-dir /tmp/agent-smith-demo、python3 router/benchmarks/benchmark.py report --run-dir /tmp/agent-smith-demo --output /tmp/agent-smith-demo-report。
- 回归测试：python3 -m unittest discover -s router/tests -q、python3 -m unittest discover -s float/tests -q。
- 验收语义：accepted / rejected / unknown 有各自的证据语义；用确定性 grader 判分，而不是把“进程干净退出”当成成功；基准反馈保留在生产学习之外。
- Float 构建：sh scripts/build.sh；demo 构建：sh scripts/build.sh --demo。

原文给出的数据（六个公开合成任务 × 三种策略 × 单次尝试，18/18 全部通过确定性 grader）：

| 策略 | Accepted | 实际 token | API Standard 参考成本 USD |
| --- | ---: | ---: | ---: |
| Fixed Astra | 6/6 | 102,162 | $1.237460 |
| Fixed 6.1 Sol | 6/6 | 105,285 | $0.1921092 |
| Local router | 6/6 | 101,392 | $0.1621807 |

作者结论：相对 Fixed Astra，路由器在该试点中参考成本少 86.89%、实际 token 少 0.75%。同时作者自己指出：Fixed 6.1 Sol 有 24,832 个缓存输入 token，其他两组为 0，读成本对比时必须注意缓存暴露。

局限（多为作者自述或原文信息边界）：

- 这是一次性的选择器实验（one-shot selector experiment），只测了那六个合成任务；更广的质量等价性，以及多 agent 协作、重试、失败升级带来的收益，需要单独实验。
- USD 数值是“实测用量 × 冻结的 API Standard 参考价”，不是 Codex 订阅账单。
- 难度打分是本地、未校准的启发式。
- 缓存效应与用量覆盖不全（partial usage coverage）会如何影响成本对比，作者自己列为待解决问题。
- “130 个 router 测试 + 50 个 Float 测试”是导入基线；分发为源码优先，无预打包 DMG，构建为 ad-hoc 签名。
- 除 Astra、6.1 Sol 外，原文没有给出被路由模型清单、支持的任务类型或失败案例。
- 全文是项目自述，86.89%/0.75% 等数字没有第三方复现记录；作者也承认规则式难度分应让位于“实测工作量证据”的边界尚不清晰。

**FlagshipRouter（调研《theRizwan/FlagshipRouter》）**

可当证据、可照做的操作性内容：

- 安装与启动：git clone https://github.com/theRizwan/FlagshipRouter.git、npm run launch；首次构建要几分钟，服务跑在端口 20128，浏览器自动打开面板，终端保留小菜单；后续启动只需几秒，源码或 brand.json 变化时自动重建。
- CLI 参数写法：npm run launch -- --host 127.0.0.1、npm run launch -- -p 20130、npm run launch -- --no-browser。
- 可选：cd cli && npm link；开发模式 npx next dev --port 20128。
- 接入流程：Endpoint & Key 建 key → Models 选 Ready 模型（OpenCode Free 免注册）→ 工具指向 http://localhost:20128/v1，模型显示为 flagshiprouter/<model>；CLI Tools 页面可代写配置。
- 连通性 curl（示例模型名 gpt-6-astra 来自 README，需换成实际 Ready 的模型）。
- brand.json 字段含义与 npm run brand:sync。
- providers 免费供应商策略 JSON 与判定规则（category / hasFree / includeHasFree / include / exclude / customEndpoints）。
- 测试命令及其已知失败说明。
- 数据目录 ~/.<slug>；默认密码 123456，必须在暴露到 localhost 之外前改掉。

只是项目自述、未经验证的主张：

- “Free AI models for every coding tool”、Models 页面的一键测试、统一模型命名带来的便利，均无对照实验或量化结果支持。
- 仓库元信息只有 37 stars；没有性能、成本、质量或用户案例数据。
- Media Models（embedding、image、video、speech、transcription、web fetch & search）与 Agent Skills 等页面的能力描述，README 没有给用法。

原文自己给出的限制说明与材料局限：

- 本次输入只有仓库 README，没有实际跑过，所有步骤均为未经验证的转述。
- 测试套件带已知失败：live-provider 测试、缺失的 cloud/ worker、对时序敏感的 DB 测试；README 建议与上一个 commit 的运行结果对比，而不是期待全绿；引擎测试在 tests/setup/providerPolicy.js 里把 free-only 策略关掉。
- 依赖免费的第三方供应商及其额度政策，可用性和限流会随上游变化；README 中的示例模型名（如 gpt-6-astra）不能当作真实可用模型。
- 需要 Node.js 20.9+，README 建议 22。

**Gluon（调研《fidipro/gluon》）**

可当证据、可照做的操作性内容：

- 安装命令：Linux/macOS/WSL `curl -fsSL https://github.com/fidipro/gluon/releases/latest/download/install.sh | sh`；Windows PowerShell `irm https://github.com/fidipro/gluon/releases/latest/download/install.ps1 | iex`；Bun 方式 `bun add -g "$PWD/gluon-<version>.tgz"`（从 release 下载 npm 风格 tarball，Linux、macOS）；从 checkout 构建见 CONTRIBUTING.md；校验与所有安装选项见 install guide。
- 启动：`cd your-repo && gluon`。
- 首次运行连接 agent；描述本次会话目的；intake agent 读取仓库、问几个问题并给出 agent/model/effort 与 spec；按 Enter 在该 agent 自己的 UI 中启动，会话运行在 Gluon frame 内；按一个键回到主界面继续开新会话。
- 支持的 harness：Claude Code、Codex、Antigravity、Grok Build、OpenCode、Kimi Code；平台 Linux、macOS、Windows（README 另提 WSL）。
- 仓库为 Apache-2.0，有 CI 和 release；原文显示 35 stars。

只是项目自述、未经验证的主张：

- “在单个 harness 内或跨多个 harness 为每次会话挑选最具性价比的 agent”“成本与上下文可观测性和分析”，均无对照实验或量化结果支持。

原文自己给出的限制说明与材料局限：

- 给定文本是 README landing page，原文注明细节在 docs/；`routing.yaml`、CLI/config/environment/models 的参考内容、权限、工具供给、安全隐私、成本分析示例、故障排查均未展开。
- 没有给出质量评估指标、对照实验或用户案例。
- 会话不是由时间、事件或状态自动触发，而是由“描述本次会话目的”启动；多会话并排与会话管理只支持人工持续切换与推进。
- 适用前提：已有受支持的编程智能体账号或 API key，能在本地仓库跑终端命令；需自行查文档确认各 harness 连接方式与路由配置，并注意把代码库交给多个第三方 agent 时的权限与数据边界。调研给出的建议是先在非关键仓库小范围试，记录成本与上下文。

**LiteLLM（调研《BerriAI/litellm》）**

可当证据、可照做的操作性内容：

- SDK 安装：uv add litellm；同一环境只能装 litellm 或 litellm-core 之一。
- 环境变量：OPENAI_API_KEY、ANTHROPIC_API_KEY。
- SDK 调用：completion(model="openai/gpt-4o", …)、completion(model="anthropic/claude-sonnet-4-20250514", …)。
- 网关安装与启动：uv tool install 'litellm[proxy]'、litellm --model gpt-4o。
- 用标准 OpenAI SDK 指向 http://0.0.0.0:4000，api_key 填任意值。
- Terraform 模块（AWS/GCP）的 clone 路径、terraform init && terraform apply 以及 HCL 调用示例；source 为 BerriAI/litellm/aws，version ~> 1.89。
- MCP：/chat/completions 的 tools type mcp 请求体；Cursor 的 mcpServers JSON。
- Harness：litellm.agent(Harness.CLAUDE_CODE / CODEX / OPENCODE / DEEPAGENTS, …, sandbox=sandbox.local("./repo"), model="litellm_proxy/…")，以及 LITELLM_PROXY_API_BASE / LITELLM_PROXY_API_KEY。
- A2A：A2AClient 片段，protocolVersion 1.0 或 0.3，a2a-sdk>=1.1.0。
- 从源码构建 core 包：python scripts/build_core_distribution.py --out-dir dist/core + pip install。

只是项目自述、未经验证的主张：

- 100+ LLM 提供商、虚拟密钥与鉴权授权、按项目/用户的多租户成本追踪与花费管理、日志/guardrails/缓存定制、管理后台 UI、A2A Agent 网关、MCP 工具网关、把 Claude Code / Codex / OpenCode / Deep Agents 跑在任意模型上。
- SDK 侧 Router 的跨部署重试与回退、应用级负载均衡、OpenAI 兼容错误处理、可观测性回调（Lunary、MLflow、Langfuse 等）。
- “-stable 标签的 docker 镜像发布前经过 12 小时负载测试”。

原文自己给出的限制说明与材料局限：

- 抓取到的原文在 Terraform 输出段被截断（停在 `output "litellm_url" { va`），云部署部分只有前半段可依据。
- README 大量内容是指向 docs 的链接，本身不是完整教程；Docker 快速上手、E2E 教程、Adding your MCP 的配置细节都不在本页。
- 生产要用 ACM 证书，没有则 allow_plaintext_alb = true 仅限 dev/trial。
- MCP OAuth 上游可能实际用 401/403 拒绝动态客户端注册；需预注册 OAuth app 并配置 credentials，且 provider 必须批准该 app。
- A2A 与 MCP Bridge 部分在材料中被截断。

调研结论：值得小范围试——照 README 给的命令先在本地起一个 LiteLLM 网关，把 1–2 个模型统一成 OpenAI 格式并开启花费追踪，用自己的成本和失败率数据决定是否推广；它给出了可复制的安装与调用步骤，但整体是特性索引 + 宣传，实际收益需自测。

**Claude Code `/advisor` 的第一种挂法（调研《@polydao: Claude Code 提示：一旦 Opus 5.5 成为你的主要模型，就别让你的 Fable 5.1 配额白白浪费了》，对应做法 F1）**

可当证据、可照做的操作性内容：

- 在某些计划下先执行 `/model fable` 接受按使用信用（usage credit）计费的确认。
- 把次要模型置于顾问状态：`/advisor fable`。
- 原文称主模型 Opus 5.5 继续工作，Fable 5.1 作为顾问；但正文在“Opus 5.5 继续工作 / Fable 5.1”处中断，顾问如何介入未给出。
- 文档入口为 `code.claude.com/docs/en/advisor`；原文中该链接被截断。

只是作者主张、未经验证：

- “一旦主模型就位，就别浪费另一个模型的配额”是作者的成本利用主张，没有给出成本、效果或对比数据。
- 可核实的互动量只有 70 赞、8 次转发、14 条回复。

原文自己给出的限制说明与材料局限：

- 原文正文在关键处被截断，看不到顾问模型实际做什么、何时被调用、有无效果说明；链接也只剩半截。
- 文中出现的模型名（Opus 5.5、Fable 5.1）与文档地址均无法从给定材料中验证，本手册不对其真实性做判断。
- 适用条件：仅在你所使用的 Claude Code 版本支持 `/advisor`、且你的订阅计划允许挂载第二个模型时成立；不同计划的计费确认方式可能不同。
- 调研结论：可以小范围试——先用 `/model fable`（如提示计费则确认）与 `/advisor fable` 确认命令真实存在，再观察顾问是否实际介入；若不存在、不介入或多次任务无可观察差异，则不写进长期流程。

**Claude Code 顾问模式的第二种挂法（调研《@rvaniaaaa: 这太他妈的棒了。Anthropic 的文档描述了运行 Opus 最聪明的方法之一》，对应做法 F2a）**

可当证据、可照做的操作性内容：

- 原文给出的配置行：`claude -> model sonnet -> advisor opus`。
- 按原文箭头还原的最简尝试形态（**命令确切语法待核对**）：`claude`、`/model sonnet`、`/advisor opus`。
- 一条分工描述：Sonnet 运行会话并编辑代码，Opus 作为顾问介入。
- 试用与验证方式：挑一个真实的中等复杂度改动任务跑两次——A 组按本条配置（Sonnet 主跑 + Opus 顾问），B 组全程用 Opus（或原本默认方式），任务、提示词、仓库状态保持一致；记录任务是否完成/是否需人工返工、返工轮数、该次会话 token 与费用、复杂决策点上 Opus 被实际调用的次数与效果。

只是作者主张、未经验证：

- 三个模型各做“成本最低的部分”、让贵模型只出现在真正需要它的判断点上，没有配数据、基准、案例或成本对比。
- “你不再为不需要 Opus 的工作支付 Opus 的价格”是断言，没有量化。

原文自己给出的限制说明与材料局限：

- 推文正文在「Haiku 5.5」处被截断，Haiku 承担哪类工作、怎么配置都没写；「Haiku 5.5」指模型版本还是别的也无法确认。
- 没有给出 Anthropic 文档链接、版本号或确切命令语法，本手册无法保证照抄能跑通。
- 文中出现的模型名（Sonnet、Opus、Haiku 5.5）与文档地址均无法从给定材料中验证，本手册不对其真实性做判断。
- 适用条件：已在用 Claude Code，账号允许在 Sonnet/Opus 等模型间切换，对成本敏感、以代码编辑为主要任务；若顾问触发过于频繁，成本优势可能被吃掉；触发过少，复杂改动的质量可能下降。
- 可核实的互动量：120 赞、13 次转发、17 条回复。
- 调研结论：建议在 Claude Code 里小范围试一遍“Sonnet 主跑 + Opus 顾问”的分工，用成本和质量双指标对比后再常规化；理由是原文给出了可直接照做的模型分工配置思路，但推文被截断、命令确切语法和 Haiku 那一环都没写全，不足以直接采纳。在确认真实语法前，不要把这条写进团队默认流程。

**Claude Code 多模型分层的第三种挂法（调研《@sector_sol: 停止支付 opus 来做 haiku 的家庭作业。这个 claude 代码设置简直是黄金。》，对应做法 F2b）**

可当证据、可照做的操作性内容：

- 原文只给出一条启动命令和三条分工，没有更多配置步骤。原文命令：`claude --model sonnet --advisor opus`。
- 原文给出的分工：sonnet 5.5 运行主会话并编辑代码；只读 haiku 5.5（此处原文被截断，后续内容缺失）；只有在真正需要决策时才引入 opus。
- 要照做，先核对 `--advisor` 是否存在：终端运行 `claude --help`（或在会话内用 `/help`）查找该参数；原文没有说明它从哪个版本起可用。
- 若参数存在，在项目目录用原文命令启动；再按“文件阅读、检索、批量机械修改这类只读/低判断量的活交给 haiku”的方向找等价做法——具体怎么在 Claude Code 里指定 haiku 只读，原文未给出，需自行在版本里找子代理配置或权限只读设置等。
- 决策点才切 opus；原文只说“只有在真正需要决策时才引入 opus”，没有给出切换判据，需自行定义，例如架构选型、跨模块改动方案、反复失败后的重新规划。
- 最小试用：挑一个 1–2 小时能做完的真实小任务，用默认模型跑一遍，再用 `claude --model sonnet --advisor opus` 跑一遍同类任务；每次记录账单/token 消耗、完成所需的重试次数、你手动接手修改的次数、以及“后悔没用 opus”的次数（决策被顾问模型纠正或放行的次数）。

只是作者主张、未经验证：

- 标题“停止支付 opus 来做 haiku 的家庭作业”和“这个 claude 代码设置简直是黄金”都是作者主张，没有数据、案例、账单对比或前后测。
- 社区验证弱：该条互动为 37 赞、5 转发、10 回复，不足以视为被验证的做法。

原文自己给出的限制说明与材料局限：

- 内容不完整：正文被截断，“围绕这个分工构建其余设置”的后续内容（尤其是 haiku 只读怎么配）缺失，无法据此完整复现。
- 可核实性存疑：`--advisor` 参数以及 “sonnet 5.5 / haiku 5.5” 的命名，在给出的材料内都无法核实；若参数不存在，命令不可执行。
- 隐含前提：成本敏感、按量计费、且 opus 单价明显高于 sonnet/haiku 的 Claude Code 使用场景。这个价格关系在常识层面成立，但原文未给出任何数字。
- 调研结论：先在本地确认 Claude Code 是否支持 `--advisor`，再用 `claude --model sonnet --advisor opus` 做一次分层对照（sonnet 主会话、opus 只在决策点介入、haiku 承担只读杂活），验证成本与返工率是否改善；思路明确可试，但原文只有一条命令加几句分工、正文还被截断，没有任何成本或质量数据，参数与模型名也无法从材料内核实。

**材料边界**

- 七个项目的材料都未说明可以互相集成；同时安装时不要假设请求一定经过你以为的那一层。
- 所有效果数字都需要自测；本手册只把可复制的命令、配置和提示词当作操作依据，把项目自述数字和作者主张当作待验证信息。

## 依据的调研

- [diegosouzapw/OmniRoute](../research/radar/2026-10-02/531-diegosouzapw-omniroute.md)：值得一试，可以小范围试：先把 OmniRoute 当作本地 OpenAI 兼容网关装起来（npm i -g omniroute → localhost:20128 → 用 model=auto 打通），再把一个编码工具指向它，用它验证「按任务选模型别名 + 配额耗尽自动回退」这一套是否真能减少中断；理由是原文给出了可照抄的安装与调用命令和模型别名清单，但节省比例、免费额度等数字都是项目自述，且原文截断、缺少配置细节，不宜直接采纳。
- [Chengjun023/agent-smith](../research/radar/2026-10-05/1229-chengjun023-agent-smith.md)：值得一试，可以小范围试：按 README 给出的命令装上 Codex 插件、用 $adaptive-route 跑日常任务，并先用离线 benchmark demo 验证流程，理由是全套安装/运行/评测步骤可照抄，但其实证只有 6 个合成任务、单次尝试的小规模试点，路由效果是否在你的任务上成立必须自己复现。
- [theRizwan/FlagshipRouter](../research/radar/2026-10-07/1614-therizwan-flagshiprouter.md)：值得一试，可以小范围试：在本地用 FlagshipRouter 起一个 OpenAI 兼容网关，把 Claude Code、Cline 等已在用的编程工具统一接到一个模型入口、按任务切换模型；但原文只是接线层的 README，没有质量或收益数据，且有已知测试失败和默认密码风险，先局部验证再决定是否写进手册。
- [fidipro/gluon](../research/radar/2026-10-09/2068-fidipro-gluon.md)：值得一试，建议小范围试：在非关键仓库按 README 的安装命令安装，然后 cd your-repo && gluon 启动，让 intake agent 为同一任务推荐并对比不同 harness/model/effort，同时记录成本与上下文。理由是原文给出了可照做的安装与启动流程，并把任务匹配和成本/上下文可观测做成了产品能力，但 README 未展开 routing.yaml、权限配置和效果数据，需要自行验证。
- [BerriAI/litellm](../research/radar/2026-10-10/2267-berriai-litellm.md)：值得一试，值得小范围试：照 README 给的命令先在本地起一个 LiteLLM 网关（uv tool install 'litellm[proxy]' + litellm --model gpt-4o），把 1–2 个模型统一成 OpenAI 格式并开启花费追踪，用自己的成本和失败率数据决定是否推广；它给出了可复制的安装与调用步骤，但整体是特性索引+宣传，实际收益需自测。
- [@polydao: Claude Code 提示：一旦 Opus 5.5 成为你的主要模型，就别让你的 Fable 5.1 配额白白浪费了](../research/radar/2026-10-12/2641-claude-code-opus-5-5-fable-5-1.md)：值得一试，可以小范围试：在支持 /advisor 的 Claude Code 里先用 /model fable 接受计费、再 /advisor fable 把次要模型挂成顾问，让主模型继续干活；理由是原文给了可照抄的命令，但正文在关键处被截断、模型名与文档地址都无法核实，只能先自测确认命令真实存在再考虑写进手册。
- [@rvaniaaaa: 这太他妈的棒了。Anthropic 的文档描述了运行 Opus 最聪明的方法之一](../research/radar/2026-10-14/3029-anthropic-opus.md)：值得一试，建议在 Claude Code 里小范围试一遍「Sonnet 主跑 + Opus 顾问」的分工，用成本和质量双指标对比后再常规化；理由是原文给出了可直接照做的模型分工配置思路，但推文被截断、命令确切语法和 Haiku 那一环都没写全，不足以直接采纳。
- [@sector_sol: 停止支付 opus 来做 haiku 的家庭作业。这个 claude 代码设置简直是黄金。](../research/radar/2026-10-16/3761-opus-haiku-claude.md)：值得一试，先在本地确认 Claude Code 是否支持 --advisor，再用 `claude --model sonnet --advisor opus` 做一次分层对照（sonnet 主会话、opus 只在决策点介入、haiku 承担只读杂活），验证成本与返工率是否改善；思路明确可试，但原文只有一条命令加几句分工、正文还被截断，没有任何成本或质量数据，参数与模型名也无法从材料内核实。
