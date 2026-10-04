# Chengjun023/agent-smith

- 结论：**值得一试**。可以小范围试：按 README 给出的命令装上 Codex 插件、用 $adaptive-route 跑日常任务，并先用离线 benchmark demo 验证流程，理由是全套安装/运行/评测步骤可照抄，但其实证只有 6 个合成任务、单次尝试的小规模试点，路由效果是否在你的任务上成立必须自己复现。
- 原文：https://github.com/Chengjun023/agent-smith
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-04T16:51:29.223Z

## 是什么

Agent Smith 是一个独立的个人项目，包含两个组件：

| 组件 | 版本 | 作用 |
| --- | --- | --- |
| Adaptive Router | 0.3.0 | 本地模型选择、偏好设置、有证据的验收（evidence-backed acceptance）、可复现基准 |
| Codex Float | 0.5.0 | macOS 原生浮窗，显示本地 Codex 任务、agent、用量与参考成本 |

核心主张：常规工作交给更轻的模型，困难任务才动用重型模型（README 的比喻是“最贵的模型不必出现在每一场庭审里”）。路由依据是一个本地、未校准的 1.0–10.0 难度启发式（步长 0.1）；打分、计量、价格比较都不额外调用模型。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：Python 部分只用标准库；路由执行需要已有的 Codex 登录；Float 需要 macOS 14+、`/usr/bin/python3` 和 Xcode Command Line Tools。以下命令均在克隆后的仓库根目录执行（Float 相关除外）。

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

README 指出，具体模式（modes）、偏好设置和显式固定模型（explicit model pins）见 router 指南（`router/README.md`）。

4. （仅 macOS）构建并打开 Float：

```sh
cd float
sh scripts/build.sh
open "build/Codex Float.app"
```

构建使用 ad-hoc 签名；分发是源码优先，没有预打包 DMG。

5. 想复现截图里的合成演示数据，在 `float/` 下改用 demo 构建，打开旧名字的 `build/Token Inspector Demo.app`（其独立的 app 身份与 fixtures 让 demo 偏好保持稳定，且不接触实时任务读取器）：

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

注意：使用全新的输出目录；`demo` 用合成答案和合成用量，`replay` 对已记录产物重新评分，两者都不调用模型。README 称导入时基线为 130 个 router 测试、50 个 Float 测试，并说明命令随覆盖率演进而以当前命令为准。

7. 设置偏好：路由会问两个可选偏好问题——你的优先项（质量、均衡、成本或速度）和你通常的工作类型。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：路由器可以按 TTL 从 models.dev 发现新条目，保留一份 last-good 快照，并依据本地价格、能力、endpoint、host 证据接纳候选模型。但“发现不等于授予执行权限”——当前执行只用 Codex，其它 provider 只是目录元数据。这提供了“有哪些模型、各是什么价格/能力”的发现机制，而不是“AI 能做什么工作”的能力发现。
- **任务匹配**：匹配逻辑是本地、未校准的 1.0–10.0 难度启发式（步长 0.1）；常规工作给更轻模型，困难场景再上重型模型。任务启用后，会把独立的工作块（independent work blocks）通过原生 subagent 路由；一个 skill 无法在生成中途切换主任务的模型。
- **条件供给**：需要已有 Codex 登录；需要回答两个偏好问题（优先项 + 通常工作类型）。Float 以只读方式打开官方 Codex 数据库，另写自己的数值型 SQLite 账本，记录 thread/request ID 与读取检查点，用于跨重启和日志轮转去重；对话正文和推理文本不进入该账本；缺失的用量或价格保持 unknown，每个计量请求保留其原始价格快照。
- **主动推进**：能自动做的是按 TTL 刷新模型目录、以及用量计量的持续去重（通过账本检查点跨重启/日志轮转）。README 未描述工作本身由时间/事件/状态触发并持续推进的机制。
- **效果验证**：把 dispatch 与 acceptance 分离，`accepted` / `rejected` / `unknown` 有各自的证据语义；用确定性 grader 判分，而不是把“进程干净退出”当成成功；基准反馈保留在生产学习之外。这是一套可直接借用的“怎么算成功”的约定。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

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

## 怎么试、怎么验证

最小试用（不依赖任何真实任务，先确认链路通）：克隆仓库 → 按上面步骤 1–2 安装并检查 → 步骤 6 跑 `demo` 与 `report` 两条离线命令，确认基准管道能在自己机器上产出报告（这两条不调用模型，零成本）。确认通过后再决定是否用真实任务。

小范围真实试用：准备 5–10 个你日常的常规 Coding 任务，分成两组：一组用 `Use $adaptive-route for this task: …`，一组固定用你平时最重的模型。只在这一小批上对比，不要一次性全面切换。

判断有没有改善的指标（沿用原文的语义，另加你自己的 grader）：

- **任务接受率**：用 `accepted` / `rejected` / `unknown` 记录，最好自己写一个确定性检查（测试通过、编译成功、断言满足），而不是看进程是否退出成功。核心门槛是接受率不下降。
- **实际 token 用量**：分组对比，注意两组之间的缓存输入 token 差异（原文里 Sol 组有 24,832 缓存 token，其他组为 0，会污染对比）。
- **参考成本**：用同一套冻结价格快照计算，且明确它不是你的真实账单。
- **unknown 比例**：缺失用量或价格会被记为 unknown，unknown 占比过高说明计量覆盖不足，此时成本对比不可信。

成功标准建议：在接受率不下降的前提下，参考成本或实际 token 明显下降；若接受率下降或 unknown 比例高，先回到离线 benchmark 检查判分与计量的可靠性，再决定是否继续用。
