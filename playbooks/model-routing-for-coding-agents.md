# 让编码 agent 在配额耗尽和限流时自动换模型，并用证据验收完成

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多供应商的配额耗尽、限流、死 key 会打断编码流程，模型选择又只能手动切换或一律用最重的模型，本手册给出本地可试的网关回退、按难度路由和证据化验收三条做法。
> 先试这一步：在本机起一个 OpenAI 兼容网关（OmniRoute 和 FlagshipRouter 都默认 localhost:20128，先选一个），只把一个已在用的工具接上去，用一条 curl 打通请求。
> 最近修订：2026-10-07

## 解决什么问题

编码过程中经常遇到三种中断：某个供应商的订阅配额到期没用完、编码到一半被限流、某个 key 死掉导致整条流程卡住。这些事本身没有谁专门负责，于是变成你手动换模型、换 key。另一类问题是模型选择：要么一直用最重最贵的模型，要么靠手动切换；agent 宣布完成时，也可能只看进程退出，不看任务是否真的通过确定性检查。

本手册给出一套本地可试的做法：用 OpenAI 兼容网关统一接多个供应商，并在配额耗尽、供应商失败或成本上升时自动回退；在 Codex 内用 Adaptive Router 按本地难度启发式选择轻/重模型；并用“有证据的验收”判断是否真的完成。OmniRoute 调研把四类痛点明确列为可接管项：订阅配额到期未用完、编码中途被限流、工具输出烧 token、死 key 导致阻塞。agent-smith 的核心主张是：常规工作交给更轻的模型，困难任务才动用重型模型，路由依据是一个本地、未校准的 1.0–10.0 难度启发式。FlagshipRouter 是同一层的另一种接法：本地 OpenAI 兼容网关，把 Claude Code、Cline 等工具接到多家免费供应商的模型表上，用面板统一改配置。三个项目的材料都未说明可以互相集成，先分别试。

## 适用与不适用

适用：

- 你手上有多个供应商或多把订阅/API key，经常因为某一个配额耗尽、限流或失败而中断工作。
- 你愿意在本机长期运行一个本地服务，并且手上的工具支持自定义 OpenAI 兼容 base URL。
- 你使用 Codex，并愿意在 Codex 内装本地插件，用 $adaptive-route 跑日常任务。
- 你想先用离线 benchmark demo 验证路由/评测链路，再上真实任务。
- 你想用一个面板把“哪个工具接哪个模型”集中管起来，并希望工具里的模型以统一前缀显示（FlagshipRouter 的 `flagshiprouter/<model>`）。
- 你只想先在非敏感、非生产任务上小范围试。

不适用或需要谨慎：

- 有合规或数据敏感要求：接入前先看清请求是否会经过第三方免费层。OmniRoute README 自己披露有 13 家供应商因条款风险被标记为 avoid。
- 想直接采信 README 的效果数字：OmniRoute 原文没有给出测量方法、测试集或对照实验；agent-smith 也只有 6 个合成任务、单次尝试的小规模试点；FlagshipRouter 只有 37 stars 这类仓库元信息，没有任何性能、成本或质量数据。
- 想用 OmniRoute 的“生产级”能力（MCP、A2A、guardrails、evals、TLS stealth、key pools 等）：给定材料里只有名词，没有配置步骤。
- 想用 FlagshipRouter 的 Media Models（embedding、image、video、speech、transcription、web fetch & search）和 Agent Skills 页面：README 只提到存在，没有给用法。
- Codex Float 仅 macOS 14+；非 macOS 不能用 Float。agent-smith 的 router 执行需要已有 Codex 登录。
- FlagshipRouter 的默认面板密码是 `123456`，且默认监听 20128；在把它暴露到 localhost 之外以前必须先在 Settings 改密码。

## 前置条件

- OmniRoute：本机可安装 npm 全局包（有 Node.js/npm 环境）；能长期运行一个本地服务；零凭证也能先跑，README 称全新安装无需任何凭证即可先用 auto；要接自有供应商时需要有对应的 API key 或订阅凭证；被接入的工具本身支持自定义 OpenAI 兼容 base URL。README 点名的可接工具包括 Claude Code、Codex、Cursor、Cline、Copilot、Antigravity。README 还提到 Docker、源码、pnpm、Arch 等安装方式，但给定文本未给出对应命令。
- agent-smith：Python 部分只用标准库；路由执行需要已有的 Codex 登录；Float 需要 macOS 14+、/usr/bin/python3 和 Xcode Command Line Tools。以下命令均在克隆后的仓库根目录执行（Float 相关除外）。
- agent-smith 的分发是源码优先，没有预打包 DMG，构建使用 ad-hoc 签名。
- FlagshipRouter：Node.js 20.9 或更高（README 建议 22）；git 与 npm 可用；本地端口 20128 空闲——注意这与 OmniRoute 的默认端口相同，两者不能按默认端口同时启动；要接自有供应商时需要相应凭证，不想注册时可先只用 OpenCode Free 的免注册模型。

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

4. 按任务选模型别名。原文给出的映射可直接用，这是最可照做的一步：

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

**做法 A / B / C 怎么选**

- 主要痛点是跨供应商配额、限流、死 key、工具输出烧 token：先做 A。
- 已经在用 Codex，痛点是“常规任务也调用最重模型”且想用确定性 grader 验收：先做 B。
- 想让多个工具从一个面板统一改配置、按任务换模型，并先拿免注册的免费模型打通：做 C。
- A 和 C 是同一层的本地 OpenAI 兼容网关，功能重叠，且默认端口都是 20128：先选一个跑通，不要同时按默认端口启动。
- 三个项目的材料都未说明可以集成。如果确实要同时装，先把各自跑通，再自行验证请求实际走哪条路径；不要默认叠加。

**暂时不要碰的部分**：OmniRoute README 提到的 MCP（110 个工具）、A2A、memory、guardrails、evals、TLS stealth、key pools 公平配额、AES-256-GCM 加密存 key，在给定材料里只有名词，没有配置步骤。agent-smith 的“多 agent 协作、重试、失败升级带来的收益”需要单独实验，材料未给步骤。FlagshipRouter 的 Media Models 页面和 Agent Skills 页面同样只有存在性描述，没有用法。

## 怎么判断变好了

最小试用：

- OmniRoute（1–2 天，仅限非敏感、非生产任务）：按做法 A 第 1–2 步装好并跑通 curl + model=auto，确认本地端点可用、无需 key 就能返回；只接一个工具（建议先接你已在用的 Cline 或 Claude Code），base URL 指向 http://localhost:20128/v1；连续一周用 auto/coding 做日常编码任务，同时保留一条直连原供应商的对照路径；不启用来源不明的免费供应商，先用自有 key 或已知供应商验证回退逻辑是否按预期工作。
- agent-smith（先零成本离线验证）：克隆仓库 → 按步骤 1–2 安装并检查 → 步骤 6 跑 demo 与 report 两条离线命令，确认基准管道能在自己机器上产出报告（这两条不调用模型，零成本）。确认通过后，准备 5–10 个日常常规 Coding 任务，分成两组：一组用 Use $adaptive-route for this task: …，一组固定用你平时最重的模型。只在这一小批上对比，不要一次性全面切换。
- FlagshipRouter（半天以内，全部本地）：clone + `npm run launch -- --host 127.0.0.1`，先去 Settings 把密码从 `123456` 改掉；在 Models 里挑一个 OpenCode Free 的免注册模型，用第 6 步的 curl 打通一条请求；用 CLI Tools 只给一个当前已在用的工具（例如 Claude Code）写配置，并记录原配置以便回滚；拿一个真实的小任务，分别在原配置和走网关的配置下各跑一遍。

指标（都自己测，不采信 README 的百分比）：

- 中断次数：同一批任务下，因限流/配额耗尽导致的请求失败或人工切换次数，对照直连单供应商。
- 人工干预次数：一周内你手动换模型/换 key 的次数是否下降。
- 任务接受率：用 accepted / rejected / unknown 记录；最好自己写一个确定性检查（测试通过、编译成功、断言满足），而不是看进程是否退出成功。核心门槛是接受率不下降。
- 实际 token 用量：分组对比，注意两组之间的缓存输入 token 差异（原文里 Sol 组有 24,832 缓存 token，其他组为 0，会污染对比）。
- 参考成本：用同一套冻结价格快照计算，且明确它不是你的真实账单。OmniRoute 的成本与 token 要同一提示词做 A/B，而不是引用 15–95%。
- unknown 比例：缺失用量或价格会被记为 unknown；unknown 占比过高说明计量覆盖不足，此时成本对比不可信。
- 延迟：自己记录 p95，别只信 dashboard 的 savings 卡片。
- 配额真实性：把 /dashboard/free-tiers 显示的 used/remaining 与供应商后台账单对照，这直接决定“配额感知回退”是否可信。
- 首次跑通耗时（FlagshipRouter）：从 clone 到第一条成功请求的分钟数，用来判断这个网关本身是否好装好用。
- 切换成本（FlagshipRouter）：按任务换模型是否真的生效（看工具里是否显示 `flagshiprouter/<model>`），以及换一次要几步。
- 稳定性（FlagshipRouter）：Console Log 里的失败请求数、触发限流/额度耗尽的次数；面板另有 Usage 与 Quota 页 `/dashboard/usage`、`/dashboard/quota`。
- 副作用与可回滚（FlagshipRouter）：原工具有没有出现行为变化或配置被覆盖，能否一条命令回滚掉 CLI Tools 写入的配置。
- 质量不下降：用你既有的评测方式（或同一组任务的人工打分）确认换模型后结果没有变差；auto/chaos 并行面板会成倍消耗上游调用，试用时单独计费观察。

试多久、什么情况下停：

- OmniRoute：试三周。若三周后“中断次数 / 人工切换次数”没有下降，或配额显示与实际账单明显不符，就停用并把结论降为 study。
- agent-smith：成功标准建议：在接受率不下降的前提下，参考成本或实际 token 明显下降；若接受率下降或 unknown 比例高，先回到离线 benchmark 检查判分与计量的可靠性，再决定是否继续用。
- FlagshipRouter：先按半天的最小试用跑通，再决定要不要多用几天。只要出现“模型连通但结果明显变差”或“配置互相覆盖且难回滚”，就停止推广，把结论降为 study。

## 常见坑

- 把 README 的自述数字当结论。OmniRoute：省 15–95% token、~1.62B 免费 token/月、“永不停止编码”都没有给出测量方法或对照实验。agent-smith：86.89%/0.75% 来自 6 个合成任务 × 三种策略 × 单次尝试，没有第三方复现记录。FlagshipRouter：只有 37 stars 这类仓库元信息，没有任何性能、成本、质量或用户案例数据。
- 一次把所有工具都切到网关。先只接一个，保留直连对照，否则无法判断是网关起了作用还是任务本身变简单了。
- 端口撞车。OmniRoute 与 FlagshipRouter 默认都监听 localhost:20128，同时按默认端口启动会冲突；FlagshipRouter 可用 `-p` 换端口，OmniRoute 的材料没有给出改端口方式。
- FlagshipRouter 默认面板密码是 `123456`。README 明确说暴露到 localhost 之外以前必须改；建议先用 `--host 127.0.0.1` 只本地监听。
- 把 FlagshipRouter 的测试不全绿当成自己装坏了。README 自陈套件带已知失败：live-provider 测试、缺失的 `cloud/` worker、对时序敏感的 DB 测试；引擎测试还在 `tests/setup/providerPolicy.js` 里把 free-only 策略关掉。
- 拿 README 的示例模型名当真实模型。FlagshipRouter 的 `gpt-6-astra` 只是 README 示例，必须换成你自己 Ready 的模型。
- CLI Tools 页面会代替你写工具配置，可能覆盖原配置。先记录原配置，确认能回滚再往下走。
- 忘记核对免费供应商条款。OmniRoute README 自己披露有 13 家供应商因条款风险被标记为 avoid。
- 把多把第三方 key 交给一个本地服务。OmniRoute README 称 key 本地加密（AES-256-GCM）、本地优先，但没有给出可照做的验证方法。
- auto/chaos 的并行扇出：默认每供应商一个、共 5 个模型面板，会成倍消耗上游调用。
- 只信 dashboard。savings 卡片不等于你自己的 p95 和账单。
- 材料本身是截断的。OmniRoute 原文正文在 19 种路由策略表格第 12 行处被截断，Docker/pnpm 等安装方式、MCP/A2A/guardrails/evals 的配置步骤都不在材料内。
- 名称相近但关系不明。OmniRoute 材料里作为 keyless 免费后端的 “OpenCode Free”（oc/…）与别处提到的 OpenCode 名称相近，但原文没有说明两者是否同一项目，不能确认；FlagshipRouter 也把 OpenCode Free 列为免注册可用模型来源，同样没有说明它与 OmniRoute 那边的 OpenCode Free 是不是同一回事。
- agent-smith 的 USD 数值是“实测用量 × 冻结的 API Standard 参考价”，不是 Codex 订阅账单。
- agent-smith 的难度打分是本地、未校准的启发式；缓存效应与用量覆盖不全（partial usage coverage）会如何影响成本对比，作者自己列为待解决问题。
- agent-smith 除 Astra、6.1 Sol 外，原文没有给出被路由模型清单、支持的任务类型或失败案例。
- agent-smith 分发为源码优先，无预打包 DMG，构建为 ad-hoc 签名；Float 仅 macOS 14+。
- 三个项目材料都未说明可集成；同时安装时不要假设请求一定经过你以为的那一层。

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

- 本次输入只有仓库 README（source_note 标注“依据仓库 README”），没有实际跑过，所有步骤均为未经验证的转述。
- 测试套件带已知失败：live-provider 测试、缺失的 cloud/ worker、对时序敏感的 DB 测试；README 建议与上一个 commit 的运行结果对比，而不是期待全绿；引擎测试在 tests/setup/providerPolicy.js 里把 free-only 策略关掉。
- 依赖免费的第三方供应商及其额度政策，可用性和限流会随上游变化；README 中的示例模型名（如 gpt-6-astra）不能当作真实可用模型。
- 需要 Node.js 20.9+，README 建议 22。

## 依据的调研

- [diegosouzapw/OmniRoute](../research/radar/2026-10-02/531-diegosouzapw-omniroute.md)：值得一试，可以小范围试：先把 OmniRoute 当作本地 OpenAI 兼容网关装起来（npm i -g omniroute → localhost:20128 → 用 model=auto 打通），再把一个编码工具指向它，用它验证「按任务选模型别名 + 配额耗尽自动回退」这一套是否真能减少中断；理由是原文给出了可照抄的安装与调用命令和模型别名清单，但节省比例、免费额度等数字都是项目自述，且原文截断、缺少配置细节，不宜直接采纳。
- [Chengjun023/agent-smith](../research/radar/2026-10-05/1229-chengjun023-agent-smith.md)：值得一试，可以小范围试：按 README 给出的命令装上 Codex 插件、用 $adaptive-route 跑日常任务，并先用离线 benchmark demo 验证流程，理由是全套安装/运行/评测步骤可照抄，但其实证只有 6 个合成任务、单次尝试的小规模试点，路由效果是否在你的任务上成立必须自己复现。
- [theRizwan/FlagshipRouter](../research/radar/2026-10-07/1614-therizwan-flagshiprouter.md)：值得一试，可以小范围试：在本地用 FlagshipRouter 起一个 OpenAI 兼容网关，把 Claude Code、Cline 等已在用的编程工具统一接到一个模型入口、按任务切换模型；但原文只是接线层的 README，没有质量或收益数据，且有已知测试失败和默认密码风险，先局部验证再决定是否写进手册。
