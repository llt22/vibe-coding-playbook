# N1nEmAn/sapper-v2

- 结论：**值得研读**。建议列为 study：把 sapper-v2 当作多智能体长程协作、分层记忆和看门狗保活的架构案例研读，不要直接照搬这个攻防工具；README 只给了角色分工、三窗口运行结构、模型分层和 Quick Start 命令，缺少可直接复制的提示词与完整配置，且领域是授权渗透测试。
- 原文：https://github.com/N1nEmAn/sapper-v2
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T18:06:33.887Z

## 是什么

sapper-v2 是 README 自述为“自主渗透测试军团”的多智能体系统。它的核心主张不是让单个 agent 更聪明，而是让 AI 军团分工、互相通信、传承知识：一个 AI commander 读板、判断、派活；generals 与 soldiers 并行攻击；一个零策略 watchdog 负责保活。知识沉淀到分层事实图（title / summary / evidence document）。原文称其在第三届腾讯云智能攻防挑战赛线上初赛 634 支队伍中夺冠，80.18/100，8 小时全无人值守；与亚军同样 85 个 flag，快 25 秒，用 1B tokens（对方 4.5B）。注意：这是授权安全测试工具，README 不是完整操作手册。

## 具体做法

原文可直接照做的只有 Quick Start 和运行时结构；提示词、完整环境变量、SKILL.md 正文未在材料中给出。

1. 准备授权与基础设施。前提：仅限书面授权的安全测试；Linux / Docker；模型网关、key pool、预算按 `docker/ENV.md` 配置（原文只给路径，未给变量值）。
2. 安装 CLI。前提：在仓库根目录，stdlib-only、零依赖。

```bash
bash install.sh
```

3. 初始化目标并拉起 agent。前提：`http://target` 在授权范围内；原文未展开 `--agents` 的具体行为。

```bash
sapper setup --goal "assess http://target" --agents
sapper status
```

4. 构建/运行完整军团。前提：先按 `docker/ENV.md` 配好环境变量；下面 run 命令原文用 `...` 省略了参数，不能原样照抄。

```bash
docker build -f docker/Dockerfile.commander -t sapper:latest .
docker run -d --name sapper ... sapper:latest
```

5. 复刻运行时三窗口（原文明确描述的结构，不是代码）：
   - commander：读 board → 判断 → dispatch，自己从不执行攻击；
   - AI legion：generals 与 soldiers 在 tmux panes 中并行；
   - watchdog：纯脚本、零策略，只负责保活；commander 崩溃时用 `--continue` 拉起、轮换 key、到点收尾。
6. 复刻分层事实图。前提：需要一个可写的共享知识库；原文只给设计，未给 schema。
   - 三层：title / summary / evidence document；
   - 读 title 取要点，需要时下钻；
   - 目的：避免单串事实图“一个坏事实污染下游”和“无谓上下文燃烧”；
   - 原则：个体死亡，图存活。
7. 复刻角色与模型分层。前提：至少两种模型档位和可并行的 agent 运行环境。
   - commander / general：GLM-5.3，负责决策与硬目标攻坚；
   - soldier / scout：DeepSeek V4.1 Flash，负责量产执行与 4 分钟侦察；
   - scout 先判断目标难度，再决定派 soldier（mass）还是 general（hard assault + 自雇小队）；
   - commander 可自行创建 signalman、做 performance review、写交接文档、复用战术模板；原文强调这些是零行预编码行为的“涌现”，不是可复制配置。
8. 迭代路径参考（原文 18 版演进，不是逐步教程）：Driver era（固定脚本驱动 AI pane）→ scar tissue（配额死亡自动换 key、上下文饱和自动换 soldier、commander 写交接文档并以继任者身份继续）→ elite task force（scout 4 分钟侦察、general 自雇小队）→ emergence（signalman、performance review、ALL-CAPS 规则、轮换与继承教训、同构迁移）。原文把具体 doctrine 放在 `docker/commander/SKILL.md`（426 行），但正文未附。

## 对应的研究问题

1. **能力发现**：原文展示了可交给 AI 军团的长程无人值守工作，以及系统自行“发明”的角色和规范，例如 signalman 统一收集未提交 flag、对一小时无产出的 soldier 做 performance review、用全大写规则约束工具使用、上下文饱和时轮换并留交接 playbook、识别同构题型并迁移打法。这些是“还没想到交给它”的候选能力，但均为作者自述。
2. **任务匹配**：原文给出了明确的模型分层：commander / general 用 GLM-5.3 做决策与硬目标攻坚，soldier / scout 用 DeepSeek V4.1 Flash 做量产执行与快速侦察；commander 从不亲自执行攻击；scout 先做 4 分钟侦察再决定派 mass 还是 general；watchdog 用纯脚本而不是 LLM，只做保活。这是“什么任务用什么模型、什么工具、怎么协作”的具体样本。
3. **条件供给**：需要提供 tmux 会话与 pane、让 agent 能往彼此输入框打字并回车（Language）、可写的分层事实图（History）、模型网关 / key pool / 预算环境变量、`--continue` 重启能力、交接文档机制，以及书面授权范围。反馈来自 watchdog、performance review 和共享事实图。
4. **主动推进**：原文明确是 8 小时全无人值守。触发包括：watchdog 在 commander 崩溃时用 `--continue` 拉起、配额死亡时轮换 key、到点收尾；soldier 上下文约 260K tokens 饱和时被回收并留下 playbook；调度 doctrine 包括 easy-first 并行、bottleneck-time salvage 半解目标、stop-loss。这些都是时间 / 事件 / 状态触发的具体素材。
5. **效果验证**：原文用比赛记分板、flag 数和 token 消耗验证：80.18/100、85 flags、1.0B tokens、比同 flag 数的亚军快 25 秒、后期每 3 分钟解一题；多阶段深挖链成功率 29.5% 引自行业报告。验证口径是竞赛 oracle，不是通用业务指标。

## 与已有做法的关系

清单中相关条目是 DeepSeek（tool，try）。原文把 DeepSeek V4.1 Flash 放在 soldier / scout 的低成本执行层，把 GLM-5.3 放在 commander / general 的决策层，形成“精英大脑决策、轻量大脑量产”的模型分层；这与清单里把 DeepSeek 作为可试工具的定位一致，可作为“按任务难度分配模型档位”的参考。原文还致谢 Cairn 的 intent-graph 想法，但 Cairn 不在清单中。除此之外，清单中没有相关条目。

## 证据与局限

- 原文给出的数据：634 支队伍、80.18/100、8 小时全无人值守、85 flags、与亚军同 flag 数但快 25 秒、1.0B vs 4.5B tokens；其他前十队伍 1.5–4.5B tokens；soldier 上下文饱和约 260K tokens（原文称实测）；后期速度达每 3 分钟解一题；多阶段深挖链成功率 29.5%（原文注明来自一份行业报告，不是他们自己的测量）；在腾讯 v1bench 上迭代 18 版。
- 案例与主张：signalman、performance review、ALL-CAPS 规则、轮换与继承教训、shellcode 模板、自动 pivot pipeline、同构迁移等“涌现”是作者自述，README 没有给出对照实验、完整日志或消融数据；Nüwa Test、“模型已经比我们更聪明”等是观点；taggant 只是提案，未实现。
- 适用条件：有明确记分板 / flag 的竞赛或授权靶场；可接受 8 小时无人值守；有 key pool、预算、模型网关和 Docker / tmux 基础设施；任务是可并行、可分解、可验证的攻防子任务。真实办公 / 研究场景通常没有这么强的 oracle，且法律与伦理约束不同。
- 材料局限：只拿到 README；`SKILL.md`、`SPEC.md`、`BATTLE-REPORT.md`、`docker/ENV.md` 均未提供，因此无法提炼可直接复制的提示词、完整配置和完整 run 命令。原文的 `docker run ...` 带 `...` 占位，不能原样执行。

## 怎么试、怎么验证

分两条路：

A. 若在授权靶场验证原工具：
- 前提：书面授权、隔离环境、预算 / key、Docker；先读仓库内 `SKILL.md` 与 `docker/ENV.md`，因为 README 没给完整配置。
- 最小试用：选 1–2 个低难度目标，按 Quick Start 安装并执行 `sapper setup --goal "assess http://target" --agents`，用 `sapper status` 观察 board / frontier；记录 2–4 小时内的 flags、token 消耗、人工介入次数、崩溃恢复次数、重复尝试次数。
- 判断指标：与单 agent 或人工基线比，flag / score 是否更高，token / flag 是否更低，无人值守时长是否更长，故障恢复时间是否更短；任一核心指标明显变差就不采用。

B. 更推荐：把架构迁移到非攻防任务做小范围试验（这是基于原文结构的迁移，不是原文给出的步骤）：
- 选一个可分解、有明确验收标准的长程任务（多来源调研、批量数据处理等），设 1 个 commander + 2–3 个 worker + 1 个纯脚本 watchdog；
- 共享三层事实库（title / summary / evidence），commander 只派活不执行，worker 上下文到阈值就写交接文档并轮换，watchdog 负责超时重启和收尾；
- 指标：任务完成率、端到端时间、每完成子任务的 token、重复工作率、worker 故障恢复时间、人工介入次数；与单 agent / 人工基线对比。
- 判断改善：在相同验收标准下，完成率不降且人工介入次数下降，同时 token / 子任务或端到端时间至少一项明显下降；否则只保留“分层事实图 + 看门狗”两个局部做法继续试。
