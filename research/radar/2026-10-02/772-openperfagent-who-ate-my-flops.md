# OpenPerfAgent/who-ate-my-flops

- 结论：**值得一试**。在有可重复启动命令、能给出正确性判据的单个 PyTorch 训练/推理任务上小范围试用：安装插件后先跑 init 把优化目标、约束、正确性要求写进 contract.md，再用 diagnose 做一次「测量—定位—验证」，用 benchmark.csv 对比基线加速比。理由是 README 给出了完整可照做的安装命令与工作流闭环，但版本仅 v0.1.0、加速数据全部来自作者主张，尚未独立验证，所以不宜直接 adopt。
- 原文：https://github.com/OpenPerfAgent/who-ate-my-flops
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T13:27:35.443Z

## 是什么

`who-ate-my-flops` 是给 Claude Code 和 Codex 用的小插件，用来诊断和优化 PyTorch 训练/推理任务的端到端性能。它提供的不是单个性能分析工具，而是一套「harness（脚手架）」：

- 提供工作负载上下文和 profiling 分析，作为 agent 推理的输入
- 提供正确性检查，用来评估改动是否可接受
- 引导 agent 主动提问，弄清用户的目标和约束

优化范围可以从配置改动，到 Python 代码改动，再到 GPU kernel。插件面向的是「单次训练或推理 job」，且该 job 有一条可重复执行的启动命令（例如通过 Slurm 提交的 job）。

## 具体做法（编号步骤）

前提条件（README 明确要求，缺一不可）：
- 手上有要优化的代码仓库
- 有一条能启动该训练/推理 job 的命令
- 能访问空闲的 GPU 环境
- 在要优化的仓库目录下启动 Claude Code 或 Codex
- 运行 `init` 之前，在 Claude Code 里开启 **Auto mode**，或在 Codex 里开启 **Approve for me**，以减少 agent 被打断

步骤 1：安装插件（三选一）

方式 A，直接让 agent 装，对 Claude Code 或 Codex 说：
```text
Install the who-ate-my-flops plugin from
https://github.com/OpenPerfAgent/who-ate-my-flops
for this client. Follow the installation instructions in its README.
```

方式 B，Claude Code 手动安装，在 Claude Code 中运行：
```text
/plugin marketplace add OpenPerfAgent/who-ate-my-flops
/plugin install who-ate-my-flops@openperfagent
```

方式 C，Codex 手动安装，在终端运行：
```bash
codex plugin marketplace add OpenPerfAgent/who-ate-my-flops
codex plugin add who-ate-my-flops@openperfagent
```

步骤 2：建立工作负载与契约（init）

把启动命令和 GPU 环境告诉 agent。agent 会询问你的优化目标、约束和正确性要求，并把这些记录到 `contract.md`。

| Claude Code | Codex |
|---|---|
| `/who-ate-my-flops:init` | `$who-ate-my-flops:init` |

步骤 3：诊断或优化（二选一）

- `diagnose`：做一次调查，并给出一个经过测量的修复
- `optimize`：让 agent 连续推进多个改进

| | Claude Code | Codex |
|---|---|---|
| Diagnose | `/who-ate-my-flops:diagnose` | `$who-ate-my-flops:diagnose` |
| Optimize | `/who-ate-my-flops:optimize` | `$who-ate-my-flops:optimize` |

步骤 4：等待并审查结果

等 agent 跑完后，先看 `latest-report.md`。所有报告和实验记录都在 `workspace-who-ate-my-flops/` 目录下：

```text
workspace-who-ate-my-flops/
├── latest-report.md   # Results, correctness checks, and reproduction commands
├── benchmark.csv      # Baseline and optimization measurements
├── contract.md        # Agreed goals and constraints
├── records/           # Process records and planning notes
├── tools/             # Helper scripts
├── runs/              # Run outputs
└── commits/           # Profiling traces and diagnoses by commit
```

步骤 5：验证

- 用 `benchmark.csv` 对比基线与优化后的测量值
- 用 `latest-report.md` 中的 correctness checks 确认改动没有破坏正确性
- 用 `latest-report.md` 中的 reproduction commands 复现结果
- 用 `commits/` 里每次提交对应的 profiling trace 和诊断回溯「为什么这么改」

## 对应的研究问题

**1. 能力发现**：把通常由性能工程师手工承担的端到端优化链路（profiling → 定位瓶颈 → 改配置/改 Python/改 GPU kernel → 验证正确性）交给以代码仓库为工作面的 coding agent；此外 agent 会主动提问以澄清用户目标与约束。这两点在 README 中有明确描述，但只到「插件提供这种能力」的层面，没有展开具体案例过程。

**2. 任务匹配**：适配条件是「单个训练或推理 job + 一条可重复的启动命令」（例如 Slurm 提交的 job）+ 空闲 GPU；客户端是 Claude Code 或 Codex；协作方式有两种粒度——`diagnose` 对应一次调查加一个修复，`optimize` 对应多轮改进。README 没有说明不同模型规模或任务类型该怎么选。

**3. 条件供给**：需要提供代码仓库、可复现的启动命令、GPU 环境、优化目标/约束/正确性要求（由 init 写入 `contract.md`）、以及 Auto mode / Approve for me 权限。反馈回路来自 profiling traces、`benchmark.csv` 的测量值和 correctness checks。

**4. 主动推进**：README 只体现了 `optimize` 模式会让 agent 连续完成多个改进这一「多轮持续推进」形态；没有提到时间、事件或状态触发的机制，`commits/` 按提交记录 profiling trace 算是一种状态留痕，但原文未说明其触发逻辑。此问题依据不足。

**5. 效果验证**：`contract.md` 固定目标与约束（事前对齐判据），`benchmark.csv` 记录基线与优化测量（对比），`latest-report.md` 含 correctness checks 与复现命令（可重跑），`commits/` 按提交保存 profiling trace 与诊断（可归因）。这是 README 中证据最实的一部分，因为它把「怎么验证」变成了固定的产物结构。

## 与已有做法的关系

清单中已有条目：**Claude Code（tool，status: adopt）**。本插件是 Claude Code 的扩展插件（同时支持 Codex），依赖 Claude Code 已有环境，把它的能力从通用编码扩展到 PyTorch 性能优化这一具体场景——可以理解为在已 adopt 的 Claude Code 上叠加一个领域 harness。

清单中没有性能剖析、GPU kernel 优化或 ML 训练效率相关的其他条目。

## 证据与局限

**原文给出的证据**：
- README 声称「用该插件开发的优化已合入 FunASR、FastVideo、gsplat、Ultralytics、Unsloth、SGLang，在测试工作负载上测得最高 3.6× 加速」
- 有 v0.1.0 release、Apache 2.0 许可、1 分钟演示视频、可引用的 blog 条目
- 产物结构明确（`latest-report.md`、`benchmark.csv`、`contract.md`、`commits/` 等）

**这些只是作者主张**：
- 3.6× 是「up to」的上界，没有给出每个项目的具体数字、基线定义、硬件配置和测量方法
- 无法核实「合入上游仓库」与「插件产出」之间的因果关系
- 本次输入只包含仓库 README（source_note 标注「依据仓库 README」），blog 正文不在材料内，无法核对方法与实验细节

**成熟度与适用条件局限**：
- 版本为 v0.1.0，Roadmap 三项（NVIDIA Nsight Systems skills、与用户意图进一步对齐、按需递归委派给 kernel 优化 agent）全部未完成
- 适用条件严格：必须是 PyTorch 负载、单个 job、有可重复启动命令、有空闲 GPU、用户能给出正确性判据。非 PyTorch、无 GPU、或启动过程不可重复的任务不适用
- 仓库 34 stars，社区采用度低，缺少第三方复现报告

## 怎么试、怎么验证

**最小试用方式**（建议只跑 diagnose，不要一上来跑 optimize）：
1. 挑一个当前有明显性能痛点、且能用一条命令重复启动的 PyTorch 训练或推理 job
2. 在空闲 GPU 上，于该代码仓库目录中按上面步骤 1 安装插件
3. 跑 `init`，把优化目标、约束、正确性判据写清；检查生成的 `contract.md` 是否真的准确反映了你的意图（这一步本身就是对「agent 能否澄清意图」的验证）
4. 先手工跑 2–3 次基线，确认任务耗时波动范围，再把同一个启动命令交给 agent
5. 跑一次 `diagnose`，等结束后读 `latest-report.md` 与 `benchmark.csv`
6. 用报告里的 reproduction commands 自己重跑一次，独立确认结果

**判断有没有改善的指标**：
- 端到端耗时/吞吐相对基线的加速比（来自 `benchmark.csv`），要求 > 1 且超出你自己测的基线波动范围
- `latest-report.md` 中的 correctness checks 是否全部通过
- 按 reproduction commands 重跑，结果是否稳定复现（不可复现即不算改善）
- 改动落在哪一层（配置 / Python 代码 / GPU kernel），是否可维护、可回滚（`commits/` 有记录）
- 与人工做同样优化所花的时间做对比
- 辅助指标：`contract.md` 是否覆盖了你的真实目标和约束，agent 的提问是否发现了你一开始没说出口的约束

**止损条件**：加速比接近 1、correctness checks 失败、或结果无法用复现命令稳定重现，就说明该任务当前不适配这个插件，不要继续投入；此时降级为「了解其测量—定位—验证闭环思路」即可。
