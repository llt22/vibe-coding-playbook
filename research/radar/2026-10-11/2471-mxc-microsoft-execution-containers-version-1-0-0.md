# Mxc: Microsoft Execution Containers version 1.0.0

- 结论：**值得一试**。值得在 Windows 11 上小范围试：把 MXC 的 Permissive→Learning→Enforcement 三模式流程用在自主编码/操作智能体上，先观测再收紧权限边界；理由是原文给出了明确的策略域、后端适用场景和三模式行为定义，可直接照着走，但没给任何配置示例，具体 schema 需去 SDK 仓库拿。
- 原文：https://blogs.windows.com/windowsdeveloper/2026/10/07/microsoft-execution-containers-policy-driven-containment-for-ai-agents/
- 来源：hn，初筛相关度 2，依据原文
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T03:12:53.992Z

## 是什么

MXC（Microsoft Execution Containers）是 Windows 平台上的**策略驱动的执行层/容器**，用来隔离"不受信任的代码或动态生成的工作负载"。在智能体场景里，它可以只装住模型生成的输出、插件、工具、agent harness，或者整个 agent。

两个关键性质：

- **策略在 agent 工作负载的控制之外**：agent 或它生成的代码不能给自己追加权限。
- **统一抽象、多后端落地**：开发者用统一的 JSON 配置 schema 和多语言 SDK 声明需求，MXC 把它映射到 Windows / macOS / Linux 上合适的容器后端。

原文举的例子是：一个编码 agent 要更新网站，需要读写仓库、访问构建测试工具、可能需要读生产服务器配置以理解部署方式，但**不应该能改那份配置**。没有执行边界时，agent 可能判断"改配置是最快路径"从而打挂生产站点——从 agent 视角看合理，但超出了开发者本来想授予的权限。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提说明：原文**没有给出任何 JSON 字段名、命令行或 SDK 调用示例**，只说可以从 MXC 仓库获取 SDK、configuration schema、文档和 samples。下面 1–8 步是原文描述的操作流程与决策框架，具体语法必须以 SDK 文档为准。

1. **前提与获取入口**：需要 Windows 11（会话容器、WSL 容器仅 Windows 11；进程容器同时支持 Windows 11 / macOS / Linux）。从原文给出的 MXC 仓库获取 SDK、配置 schema、文档与样例。

2. **先列出任务真正需要的资源**。原文建议按策略域逐项声明：

```
Containment      -> 用哪种隔离环境（process / session / WSL / microVM）
Process          -> 启动工作负载的命令、参数、工作目录、环境变量等
File system      -> 可修改的位置 / 可读不可改的位置 / 完全不可访问的位置
Network          -> 入站与出站连通性，以及能否通过宿主机 loopback 访问服务
User interface   -> 能否访问或操作桌面及相关 UI 资源
```

（以上为原文五个策略域的填空清单；字段名原文未给，以 SDK schema 为准。原文示例：给编码 agent 本地源码仓库的读写权 + Git 等必要开发工具；禁止访问用户 Documents 等个人位置；阻断入站与出站网络连接；禁止访问交互桌面。）

3. **按负载选容器后端**：

| 后端 | 可用平台 | 适合 | 关键特性（原文） |
|---|---|---|---|
| Process container | Windows 11 / macOS / Linux | 需要低延迟响应的负载，含模型生成代码与工具执行 | 用平台对应的进程沙箱：Windows 上 AppContainer、macOS 上 Seatbelt、Linux 上 Bubblewrap |
| Session container | 仅 Windows 11 | 长期运行的 agent 与自动化，需要桌面或更强隔离 | 运行在独立 Windows 账号与会话下，隔离桌面、剪贴板、UI、输入与活动会话 |
| WSL container (WSLc) | 仅 Windows 11 | 依赖 Linux 包与开发生态的 Linux-first 工具链 | 通过 WSL 提供 Linux 执行环境 |
| MicroVM | Windows 11 与 Linux，实验性 | 需要硬件级虚拟化边界的高风险负载 | 硬件强制隔离 + 完整 Linux 负载兼容性 |

原文强调：每个后端的安全属性不同，应逐负载评估适配度。

4. **用低约束模式起草策略，不要一上来就 Enforcement**。首次把 agent 放进 MXC，策略很可能挡掉它合法需要的能力——这些拒绝恰好指出边界该往哪调。

5. **三模式推进（原文给出的行为差异）**：

| 模式 | 未授权访问 | 活动报告 | 用途 |
|---|---|---|---|
| Enforcement | 阻断 | 无 | 按生产策略运行负载 |
| Learning | 阻断并记录 | 有（JSON） | 诊断失败，验证策略只授予了必需访问 |
| Permissive | 放行并记录 | 有（JSON） | 在不强制策略的情况下观测 agent 行为 |

- Learning 模式下边界仍然生效，未授予的操作被阻断并写入 JSON 活动报告，可用于复现越界失败、搞清负载尝试访问了哪些资源。
- Permissive 模式下，策略本会拒绝的访问被记录下来但仍放行——适合授权阶段，任务能跑完，同时攒下资源使用证据。**Permissive 不绕开其他操作系统或组织限制。**

6. **用活动报告收敛成最小权限策略**：每次被拒的操作都暴露一个待调整点，据此只补上真正需要的权限（仅 Windows 的 MXC 进程容器能生成该活动报告）。

7. **让负载优雅处理越界**：开发者应把工作负载设计成能在比默认更严格的边界下运行。如果组织策略挡住了某资源，agent 应当——说明任务无法在现有权限内完成 / 在支持时请求用户或管理员操作 / 选择安全的替代方案，**不应静默失败**。

8. **接入方式**：原文说接入很直接——用你常用的编码 agent 去集成 MXC SDK 并起草初版策略，然后 review、测试、迭代这些控制项。组织侧可叠加管理策略（Intune 策略即将可用于管理 Windows 11 上 MXC 集成 agent 的进程容器，控制 Windows 如何评估 agent 发出的容器创建请求以及容器强制的资源边界），这样同一个 agent 能在不同企业边界内运行，而不用把组织的安全姿态写进应用里。

## 对应的研究问题

1. **能力发现**：原文把"为 agent 起草一份最小权限策略"本身列为可以交给编码 agent 做的工作（用你顺手的编码 agent 集成 SDK、起草初版策略，再由人 review/测试/迭代）。
2. **任务匹配**：给出了按负载选隔离级别的判据——低延迟响应的编码 agent 用进程容器；处理敏感数据或运行不受信任代码用更强隔离；长期运行的自动化用会话容器；Linux 工具链用 WSLc；高风险用 MicroVM。也提示不同工作负载的安全属性不同，需要逐个评估。
3. **条件供给**：明确了要提供什么——文件位置（读/写/禁止）、网络入出站与 loopback 访问、UI/桌面访问、启动命令与参数、工作目录、环境变量；组织侧提供管理策略（Intune）；反馈来自 Permissive/Learning 模式生成的 JSON 活动报告。权限由操作系统强制，模型、生成代码、插件或工具都无法自行提权。
4. **主动推进**：只覆盖了一部分——会话容器面向"长期运行的 agent 和自动化"，且 Windows 365 支持 MXC 已 GA，可在 Cloud PC 上与既有工作并行跑 agent。原文没有给出时间/事件/状态触发器的具体机制。
5. **效果验证**：活动报告是原文给出的唯一验证手段（Learning 复现越界失败、验证策略只授予必需访问；Permissive 收集资源使用证据）。原文没有给任何量化改善指标或基准数据。

## 与已有做法的关系

清单中的相关条目：Claude Code（adopt）、OpenAI Codex（adopt）、GitHub Copilot（drop）、Hermes（watch）、OpenClaw（watch）。

原文的对应信息：

- **已支持 MXC**：GitHub Copilot、OpenClaw、OpenAI Codex、Replit、LM Studio、Unsloth AI。
- **将支持 MXC**：Anthropic Claude Code、Box、Egnyte、Heidi Health、Nous Research 的 Hermes Agent、Manus、Perplexity、Raycast、Simular 等。
- 原文特别点了 GitHub Copilot、Codex、Replit 的编码 agent 场景作为示例，并指向另一篇讲 GitHub Copilot 如何用 MXC 做沙箱执行的博客（该文内容未提供）。
- NVIDIA 把 OpenShell 集成进 MXC，补充了文件与推理服务访问的策略控制、高级网络控制、凭据管理，以及面向企业的 OCSF 审计。

所以定位上，MXC 不是替代清单里的编码 agent，而是给它们**外加一层由平台/组织强制的边界**。注意清单里 Claude Code 是 adopt，但按原文它目前只是"将支持"，尚不可用；Copilot 在清单里是 drop，而原文说它已支持 MXC——两者口径不同，采信哪边取决于项目自身对 Copilot 的评估。

## 证据与局限

**原文给出的信息**：MXC 已 GA；Windows 365 对 MXC 的支持也已 GA；四个后端及各自平台可用性与适配场景（表格）；五个策略域（表格）；三种运行模式的行为差异（表格）；已集成与将集成名单；学习/许可模式会产出 JSON 活动报告，仅 Windows 的进程容器能生成。

**只是作者主张**："agent 不能充当自己的安全权威"这一论断；容器能消除"要么放开要么封死"的二选一；安全收益的定性描述。原文**没有任何性能数据、基准测试、渗透测试结果或事故案例数字**。

**局限与适用条件**：

- 原文**没有一行配置示例、字段名、SDK 调用或命令**，所有"具体做法"都必须回到 SDK 仓库补全，本文的步骤是流程层面的。
- 会话容器与 WSL 容器仅限 Windows 11；MicroVM 标注为实验性，仅 Windows 11 与 Linux。
- Intune 管理策略与 Entra 的 agent 身份区分（在 Microsoft Agent 365 中区分 agent 活动与用户活动）都是"soon / coming soon"，尚不可用；因此"组织统一管控"这条路现在还不能验证。
- 网页日期标注为 2026 年 10 月 7 日，文中"即将可用"的能力可能因时效变化，需自行核对当前状态。
- 结论只能基于这篇发布帖本身；链接的 GitHub Copilot 沙箱博客、MXC 仓库文档均未提供内容，无法据此给出可复制的配置。

## 怎么试、怎么验证

**最小试用（建议在一台 Windows 11 机器上做）**：

1. 从 MXC 仓库拉 SDK 与样例，确认本机版本与后端可用性（先只试进程容器，最轻、跨平台、最容易回滚）。
2. 选一个无害任务作为验证负载，例如让编码 agent 在本地仓库里改一个 README 并跑一次测试。
3. 第一轮用 **Permissive** 跑同一任务，拿到 JSON 活动报告，看清它实际碰了哪些文件、哪些网络目标。
4. 按报告写出最小权限策略：仓库读写、必要的工具/命令、其余一律不授予；再切到 **Learning** 复跑同一任务。
5. 处理 Learning 阶段的每一次拒绝：确认是"确实需要"还是"可以换个安全做法"，只补前者；重复到拒绝清单收敛。
6. 切到 **Enforcement** 跑同一任务，作为生产态基线。
7. 再故意让 agent 触碰一个明确不该碰的资源（如用户文档目录或某个外部网络地址），确认被拦下且 agent 显式报告失败，而不是静默失败。

**判断有没有改善的指标**：

- Enforced 策略下，同一任务的成功率与耗时相比不加容器时没有明显退化。
- 活动报告中出现的资源集合 ⊆ 策略声明的集合；Learning→Enforcement 后不再出现"策略本会拒绝"的条目。
- 越界尝试 100% 被阻断，且 agent 按第 7 步的方式显式说明"权限不足"。
- 策略文本本身可复核：每一条授予都能对应到任务的一个具体需要，没有"图省事全放开"的条目。
- 企业场景下，同一条 agent 在更严格的组织策略下仍能运行或优雅失败，说明它没有把组织安全姿态硬编码进应用。
