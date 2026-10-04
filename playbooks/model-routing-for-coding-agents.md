# 在配额限流中自动切换模型，并让编码 agent 拿出证据再收工

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决编码过程中因供应商配额耗尽、限流、死 key 或模型选择不当而中断，以及 agent 只凭进程退出就宣布完成的问题。
> 先试这一步：先零成本验证链路：按做法 A 第 1–2 步用 curl 确认 model=auto 能返回，或按做法 B 第 1–2、6 步跑通 agent-smith 的离线 demo 与 report。
> 最近修订：2026-10-05

## 解决什么问题

编码过程中经常遇到三种中断：某个供应商的订阅配额到期没用完、编码到一半被限流、某个 key 死掉导致整条流程卡住。这些事本身没有谁专门负责，于是变成你手动换模型、换 key。另一类问题是模型选择：要么一直用最重最贵的模型，要么靠手动切换；agent 宣布完成时，也可能只看进程退出，不看任务是否真的通过确定性检查。

本手册给出一套本地可试的做法：用 OpenAI 兼容网关统一接多个供应商，并在配额耗尽、供应商失败或成本上升时自动回退；在 Codex 内用 Adaptive Router 按本地难度启发式选择轻/重模型；并用“有证据的验收”判断是否真的完成。OmniRoute 调研把四类痛点明确列为可接管项：订阅配额到期未用完、编码中途被限流、工具输出烧 token、死 key 导致阻塞。agent-smith 的核心主张是：常规工作交给更轻的模型，困难任务才动用重型模型，路由依据是一个本地、未校准的 1.0–10.0 难度启发式。两个项目的材料未说明可以互相集成，先分别试。

## 适用与不适用

适用：

- 你手上有多个供应商或多把订阅/API key，经常因为某一个配额耗尽、限流或失败而中断工作。
- 你愿意在本机长期运行一个本地服务，并且手上的工具支持自定义 OpenAI 兼容 base URL。
- 你使用 Codex，并愿意在 Codex 内装本地插件，用 $adaptive-route 跑日常任务。
- 你想先用离线 benchmark demo 验证路由/评测链路，再上真实任务。
- 你只想先在非敏感、非生产任务上小范围试。

不适用或需要谨慎：

- 有合规或数据敏感要求：接入前先看清请求是否会经过第三方免费层。OmniRoute README 自己披露有 13 家供应商因条款风险被标记为 avoid。
- 想直接采信 README 的效果数字：OmniRoute 原文没有给出测量方法、测试集或对照实验；agent-smith 也只有 6 个合成任务、单次尝试的小规模试点。
- 想用 OmniRoute 的“生产级”能力（MCP、A2A、guardrails、evals、TLS stealth、key pools 等）：给定材料里只有名词，没有配置步骤。
- Codex Float 仅 macOS 14+；非 macOS 不能用 Float。agent-smith 的 router 执行需要已有 Codex 登录。

## 前置条件

- OmniRoute：本机可安装 npm 全局包（有 Node.js/npm 环境）；能长期运行一个本地服务；零凭证也能先跑，README 称全新安装无需任何凭证即可先用 auto；要接自有供应商时需要有对应的 API key 或订阅凭证；被接入的工具本身支持自定义 OpenAI 兼容 base URL。README 点名的可接工具包括 Claude Code、Codex、Cursor、Cline、Copilot、Antigravity。README 还提到 Docker、源码、pnpm、Arch 等安装方式，但给定文本未给出对应命令。
- agent-smith：Python 部分只用标准库；路由执行需要已有的 Codex 登录；Float 需要 macOS 14+、/usr/bin/python3 和 Xcode Command Line Tools。以下命令均在克隆后的仓库根目录执行（Float 相关除外）。
- agent-smith 的分发是源码优先，没有预打包 DMG，构建使用 ad-hoc 签名。

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

**做法 A / B 怎么选**

- 主要痛点是跨供应商配额、限流、死 key、工具输出烧 token：先做 A。
- 已经在用 Codex，痛点是“常规任务也调用最重模型”且想用确定性 grader 验收：先做 B。
- 两者材料未说明可集成。如果要同时装，先把 A 的 base URL 和 B 的 Codex 插件路由分别独立跑通，再自行验证请求实际走哪条路径；不要默认叠加。

**暂时不要碰的部分**：OmniRoute README 提到的 MCP（110 个工具）、A2A、memory、guardrails、evals、TLS stealth、key pools 公平配额、AES-256-GCM 加密存 key，在给定材料里只有名词，没有配置步骤。agent-smith 的“多 agent 协作、重试、失败升级带来的收益”需要单独实验，材料未给步骤。

## 怎么判断变好了

最小试用：

- OmniRoute（1–2 天，仅限非敏感、非生产任务）：按做法 A 第 1–2 步装好并跑通 curl + model=auto，确认本地端点可用、无需 key 就能返回；只接一个工具（建议先接你已在用的 Cline 或 Claude Code），base URL 指向 http://localhost:20128/v1；连续一周用 auto/coding 做日常编码任务，同时保留一条直连原供应商的对照路径；不启用来源不明的免费供应商，先用自有 key 或已知供应商验证回退逻辑是否按预期工作。
- agent-smith（先零成本离线验证）：克隆仓库 → 按步骤 1–2 安装并检查 → 步骤 6 跑 demo 与 report 两条离线命令，确认基准管道能在自己机器上产出报告（这两条不调用模型，零成本）。确认通过后，准备 5–10 个日常常规 Coding 任务，分成两组：一组用 Use $adaptive-route for this task: …，一组固定用你平时最重的模型。只在这一小批上对比，不要一次性全面切换。

指标（都自己测，不采信 README 的百分比）：

- 中断次数：同一批任务下，因限流/配额耗尽导致的请求失败或人工切换次数，对照直连单供应商。
- 人工干预次数：一周内你手动换模型/换 key 的次数是否下降。
- 任务接受率：用 accepted / rejected / unknown 记录；最好自己写一个确定性检查（测试通过、编译成功、断言满足），而不是看进程是否退出成功。核心门槛是接受率不下降。
- 实际 token 用量：分组对比，注意两组之间的缓存输入 token 差异（原文里 Sol 组有 24,832 缓存 token，其他组为 0，会污染对比）。
- 参考成本：用同一套冻结价格快照计算，且明确它不是你的真实账单。OmniRoute 的成本与 token 要同一提示词做 A/B，而不是引用 15–95%。
- unknown 比例：缺失用量或价格会被记为 unknown；unknown 占比过高说明计量覆盖不足，此时成本对比不可信。
- 延迟：自己记录 p95，别只信 dashboard 的 savings 卡片。
- 配额真实性：把 /dashboard/free-tiers 显示的 used/remaining 与供应商后台账单对照，这直接决定“配额感知回退”是否可信。
- 质量不下降：用你既有的评测方式（或同一组任务的人工打分）确认换模型后结果没有变差；auto/chaos 并行面板会成倍消耗上游调用，试用时单独计费观察。

试多久、什么情况下停：

- OmniRoute：试三周。若三周后“中断次数 / 人工切换次数”没有下降，或配额显示与实际账单明显不符，就停用并把结论降为 study。
- agent-smith：成功标准建议：在接受率不下降的前提下，参考成本或实际 token 明显下降；若接受率下降或 unknown 比例高，先回到离线 benchmark 检查判分与计量的可靠性，再决定是否继续用。

## 常见坑

- 把 README 的自述数字当结论。OmniRoute：省 15–95% token、~1.62B 免费 token/月、“永不停止编码”都没有给出测量方法或对照实验。agent-smith：86.89%/0.75% 来自 6 个合成任务 × 三种策略 × 单次尝试，没有第三方复现记录。
- 一次把所有工具都切到网关。先只接一个，保留直连对照，否则无法判断是网关起了作用还是任务本身变简单了。
- 忘记核对免费供应商条款。OmniRoute README 自己披露有 13 家供应商因条款风险被标记为 avoid。
- 把多把第三方 key 交给一个本地服务。OmniRoute README 称 key 本地加密（AES-256-GCM）、本地优先，但没有给出可照做的验证方法。
- auto/chaos 的并行扇出：默认每供应商一个、共 5 个模型面板，会成倍消耗上游调用。
- 只信 dashboard。savings 卡片不等于你自己的 p95 和账单。
- 材料本身是截断的。OmniRoute 原文正文在 19 种路由策略表格第 12 行处被截断，Docker/pnpm 等安装方式、MCP/A2A/guardrails/evals 的配置步骤都不在材料内。
- 名称相近但关系不明。OmniRoute 材料里作为 keyless 免费后端的 “OpenCode Free”（oc/…）与别处提到的 OpenCode 名称相近，但原文没有说明两者是否同一项目，不能确认。
- agent-smith 的 USD 数值是“实测用量 × 冻结的 API Standard 参考价”，不是 Codex 订阅账单。
- agent-smith 的难度打分是本地、未校准的启发式；缓存效应与用量覆盖不全（partial usage coverage）会如何影响成本对比，作者自己列为待解决问题。
- agent-smith 除 Astra、6.1 Sol 外，原文没有给出被路由模型清单、支持的任务类型或失败案例。
- agent-smith 分发为源码优先，无预打包 DMG，构建为 ad-hoc 签名；Float 仅 macOS 14+。
- 两个项目材料未说明可集成；同时安装时不要假设请求一定经过你以为的那一层。

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

## 依据的调研

- [diegosouzapw/OmniRoute](../research/radar/2026-10-02/531-diegosouzapw-omniroute.md)：值得一试，可以小范围试：先把 OmniRoute 当作本地 OpenAI 兼容网关装起来（npm i -g omniroute → localhost:20128 → 用 model=auto 打通），再把一个编码工具指向它，用它验证「按任务选模型别名 + 配额耗尽自动回退」这一套是否真能减少中断；理由是原文给出了可照抄的安装与调用命令和模型别名清单，但节省比例、免费额度等数字都是项目自述，且原文截断、缺少配置细节，不宜直接采纳。
- [Chengjun023/agent-smith](../research/radar/2026-10-05/1229-chengjun023-agent-smith.md)：值得一试，可以小范围试：按 README 给出的命令装上 Codex 插件、用 $adaptive-route 跑日常任务，并先用离线 benchmark demo 验证流程，理由是全套安装/运行/评测步骤可照抄，但其实证只有 6 个合成任务、单次尝试的小规模试点，路由效果是否在你的任务上成立必须自己复现。
