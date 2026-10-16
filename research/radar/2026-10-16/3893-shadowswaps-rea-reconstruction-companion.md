# ShadowSwaps/REA-Reconstruction-Companion

- 结论：**值得一试**。建议在本地、项目作用域内小范围试装（先 --integration off 并用 --dry-run/--check 确认改动），用它自带的 Pocket Tasks 参考流程加一个真实小目标跑通“证据→需求→实现→验证”闭环；理由是原文给出了可直接复制的安装命令、安装提示词和成套验证机制，但依赖独立的 REA、全部示例均为维护者自写、无独立评测，且本次只拿到 README。
- 原文：https://github.com/ShadowSwaps/REA-Reconstruction-Companion
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T02:14:51.947Z

## 是什么

REA-Reconstruction-Companion 是一个开源、与模型无关的 Agent Skill（Agent Skills 格式，纯 Markdown，MIT 许可），需配合 REA（一个反向工程工具与证据工作流，独立项目、需单独安装）使用。它把逆向工程得到的证据转成可执行的规格、架构、实现计划和验证流程，作用范围由用户指定：整个应用、一个功能、一个函数、一个接口或一种数据格式。核心 skill 不含模型 SDK、付费 API 要求、Python 依赖、遥测或后台服务。作者给它的定位是“理解—重建—验证”：理解现有软件，规划或实现一个类似的实现。

## 具体做法

前提：宿主 agent 能读写本地文件并执行命令（纯对话客户端只能给指引、不能代装）；Node.js 20 或更新（安装器只用 Node 标准库，不 npm install、不联网）；真正做调查还需要 REA 工具或用户提供的 REA 证据；REA 及目标专用引擎有自己的依赖，需单独安装配置。

1. 先装 REA（按你所用的客户端配置，见 github.com/morluto/rea），再决定是否开启联动。

2. 取包：从 Releases 下载解压 ZIP，或 clone 仓库；所有命令在解压目录或仓库根目录执行（Windows/macOS/Linux 命令相同）。

3. 选安装模式并安装（三选一）：

```sh
# Claude Code，带可选联动
node install.mjs --client claude-code --integration on

# Codex，带可选联动
node install.mjs --client codex --integration on

# 只装 companion，不改 REA
node install.mjs --client claude-code --integration off
```

4. 先预演再落地：任意安装命令加 `--dry-run` 查看路径与改动但不写文件；输出里的 `companionChanges` 会列出相对 companion 目录新增/修改/删除的文件，包含会被移入备份的本地文件。确认后再执行同一命令。

5. 安装后校验：同一命令加 `--check`。集成安装时，REA skill 缺失或选择有歧义，会在装 companion 之前中止。大小写不同但指向同一个 REA 文件视作同一候选；真正独立的多个安装仍需显式选择。

6. 自定义路径（已有安装、项目级 skill、其他 agent）：

```sh
node install.mjs --client generic --integration on --skills-dir "/path/to/skills" --rea-skill "/path/to/reverse-engineer-anything/SKILL.md"
```

`--skills-dir` 接受父级 skills 目录，安装器会在其下创建 `rea-reconstruction-companion`；它优先于客户端默认路径和环境变量；REA 路径必须指向该客户端实际加载的 skill；用了覆盖就关闭广泛自动查找；含空格的路径要加引号；如果安装器运行在 agent 环境之外，必须显式给出该 agent 的真实目录。下载包/检出目录要与安装目标分开，安装器会拒绝源与目标目录重叠、以及 REA 文件落在 companion 目标目录内（含在视作同一位置的文件系统上仅大小写不同的路径）。

7. 默认用户位置（便于确认装到哪）：Claude Code 为 `~/.claude/skills/rea-reconstruction-companion/`，设了自定义配置目录时为 `$CLAUDE_CONFIG_DIR/skills/rea-reconstruction-companion/`，REA 查找也停留在该 profile 内，除非用 `--rea-skill` 另指；Codex 为 `~/.agents/skills/rea-reconstruction-companion/`，设了 `CODEX_HOME` 时为 `$CODEX_HOME/skills/rea-reconstruction-companion/`，定位 REA 时还会查旧的 `~/.codex/skills/`；通用客户端用 `--skills-dir` 指定其文档化的 skills 目录。装完刷新宿主技能或新开一个会话，看不到技能就再查。

8. 让 AI agent 代装：把下面这段原文提示词交给有本地文件与命令权限的 agent，它会自行识别客户端与 skills 目录，并询问联动与更新检查偏好（不需要填任何占位符）：

```text
Install REA-Reconstruction-Companion from:
https://github.com/ShadowSwaps/REA-Reconstruction-Companion

Read README.md and INSTALL.md, identify my AI client and its skills
directory, and follow the documented installation workflow.

Before making installation changes, explain the optional REA integration
rule and ask me to choose:
- Enable: relevant REA reconstruction requests also load the companion,
  sharing evidence, requirements, and validation work.
- Skip: install the companion without changing REA; I can invoke it
  explicitly. This does not remove an integration rule already installed.

Wait for my choice unless I have already provided it. Then install using
that setting, preview changes with --dry-run, preserve existing work and
backups, and verify with --check. Explain any missing prerequisites or
access limitations. Report what was installed, where, and whether the
integration was enabled. Do not claim success unless verified.
Also explain the optional weekly update check (included since v1.2.0)
and ask whether I want it enabled. Keep it off unless I choose it.
This checks on skill use and still asks me before installing an update.
Do not incur additional charges: use existing local tools and do not
activate billing, paid services, metered APIs, or automatic paid usage.
If a step could incur a charge and that cannot be ruled out, stop that
step and explain a no-charge alternative.
```

也可以在这段话里直接带 “Enable integration” 或 “Skip integration” 预先选定。注意 `off` 的含义是“不管理 REA”，不是“移除已装的规则”；要关掉早先的联动，需在所选 REA 的 `SKILL.md` 里删掉 `<!-- rea-reconstruction-companion:begin -->` 与 `<!-- rea-reconstruction-companion:end -->` 之间（含标记）的块，其余保持原样。

9. 用起来（原文给的三个自然语言示例，可直接改用）：

```text
Use REA-Reconstruction-Companion with REA on this application so I can eventually build a similar local tool. Infer the target type and give me an evidence-backed specification and roadmap.
```

```text
Reimplement the decodeFrame function in this library and make it faster for large inputs. Recover its contract, then compare correctness and performance.
```

```text
Continue implementing the app from this project's REA reconstruction specification.
```

在 Codex 里可显式写 `$rea-reconstruction-companion`，在 Claude Code 里写 `/rea-reconstruction-companion`。开启联动后，一个相关的 REA 请求也会让 agent 加载 companion。“理解这个应用以便日后做个类似的”只产出规格与路线图；“现在就做个类似的应用”同时授权实现流程；只问一个函数就只聚焦那个函数。

10.（可选）每周更新检查：v1.2.0 起内置，默认关闭，装完后想用就手动开一次（早于此版本不会自动获得，要先手动装一个 v1.2.0+ 的包）。宿主在 skill 被使用时调用一个本地小助手，满 7 天才联系 GitHub；skill 闲置则什么都不跑。发现新稳定版时 agent 给出“立即更新 / 下周提醒 / 跳过此版本 / 关闭检查”；不回答就不更新；批准绑定到具体 release 和 asset，asset 变了要重新征得同意；本地有自定义改动则不自动替换；更新成功保留备份、验证结果并保留你选定的客户端与 REA 联动设置。不需要 npm 依赖、模型/API key、付费服务、额外模型调用、后台守护进程或调度型 AI 任务。

11. 备份与回滚：重复同一安装是安全的，不会重复写入联动块。companion 文件有差异需加 `--replace`，替换前会整目录备份。REA 的改动只动标记块，块外内容原样保留；更早的预发布规则也能迁移，自定义过的无标记规则需要人工复核。备份与回执放在父级 skills 目录旁的 `.rea-reconstruction-companion-installer/`，安装器会打印确切事务路径。提交失败会分别尝试恢复 REA 与 companion，所以 REA 文件不可读或缺失不会阻碍恢复 companion；检测到并发编辑会保留并报告，而不是覆盖。手工恢复用回执定位路径，把 `companion-before` 恢复到 companion 原位；`rea-before.md` 仅当 REA 没有你需要保留的后续改动时才恢复，否则只移除或修复联动块。若进程被杀留下 `install.lock`，先确认没有安装器在运行，再删掉那个锁文件重试。更新 REA 可能覆盖其技能指令，重跑带 `--check` 的集成命令，需要就重装；没有任何后台监控或改写 REA 的东西。

12.（维护者/自测）开发命令：

```sh
node scripts/manifest.mjs
node --test
python scripts/build_release.py
```

发布构建用 Python 3.10+ 标准库，仅维护者需要，安装和使用不需要。

## 对应的研究问题

- 能力发现：它把“读懂现有软件”从人工活变成可交给 agent 的活——把产品拆成能力、工作流、交互、状态与依赖；定义需求、契约、期望行为以及与证据挂钩的验收标准；把原架构与新实现的设计选择分开；用代表性负载、实测和与真实技术栈相关的研究做性能调查；在连贯增量中指导开发并做集成与端到端验证；把恢复出来的指令当作不可信证据、保留用户最终决定权；在有助于验证重建时选用有界差分模糊测试、定向变异测试和可执行接口契约；记录密码学互操作参数并验证相关独立向量与拒绝用例。这些都属于不常想到交给 AI 的工作。
- 任务匹配：与模型无关，纯 Markdown 技能；Codex 与 Claude Code 都支持文件系统技能，但发现位置与调用语法不同，由安装器处理差异；其他 agent 可通过显式 skills 目录使用同一套核心文件。可用性取决于宿主的文件/工具访问，而不只是模型名。REA 提供反向工程工具与证据工作流，companion 只加重建规划与开发指导，两者在同一任务内同时生效，不会产生两个独立后台 agent。
- 条件供给：需要 REA 已安装并针对你的客户端配置好（REA 与目标专用引擎各有自己的要求）、本地文件与命令权限、明确的技能目录（默认路径，或 `--skills-dir` / `--rea-skill` 覆盖）、以及联动开/关的选择；做实际调查时还要有 REA 工具或用户提供的 REA 证据。反馈面：skill 会记录观察、推断、未知项、决策与检查点供后续使用；证据缺口会从需求/设计或验证阶段回流到 REA 取证。
- 主动推进：有一例事件/状态驱动的持续行为——skill 被使用时才检查更新，且 7 天内最多一次，skill 闲置就不跑。但明确不自动启动 agent、评测或定时任务；没有后台守护进程、没有调度型 AI 任务、不强制并行执行。跨会话继续靠可移植的检查点指南与 resume 评测用例，而不是常驻进程。
- 效果验证：行为评测套件给出可移植任务、原始证据、独立可执行 oracle 和人工评审量表，覆盖窄函数、文件格式、有状态工作流、原有怪癖与批准改进的取舍、含糊的重试、不可访问的后端、互相矛盾的证据、内嵌的敌意指令、密码学边界、成本敏感的工具选择；配对选择任务检查实现是否符合所要求的兼容或改进目标，推理与授权仍需人工复核。v1.3.1 的证据校验加了一个只读 `--verify`，在试验前后检测参考证据缺失或被改，且比对的是原始可信包，改包内哈希也藏不住。参考应用 Pocket Tasks 提供可重复流程：导出独立证据包、记录观察与需求，再用与语言无关的 JSON 过程接口比较经评审的重建（一个独立本地候选通过 16 会话检查器，并重放十个捕获的观察会话）。v1.3.4 的断点续做评测每例做 15 项数据比较。

## 与已有做法的关系

清单中相关条目：Claude Code（tool，adopt）、Agent skills（concept，adopt）。

- 与 Agent skills 概念条目：本仓库正是 Agent Skills 格式的一个具体实例，并把“技能”从概念补成了可安装的包：纯 Markdown 核心 + 安装器 + 备份/回滚 + 行为评测套件 + 参考应用与走查。可作为手册里“一个成熟技能长什么样、怎么装、怎么验”的样例。
- 与 Claude Code 条目：安装器直接支持 Claude Code（默认 `~/.claude/skills/` 或 `$CLAUDE_CONFIG_DIR`），也支持 Codex 与通用客户端。它是叠加在客户端之上的技能，不替代客户端；开启联动后会在相关 REA 请求中自动被加载。
- 与 REA（清单中未列出）：本 skill 依赖 REA 提供反向工程工具与证据流，companion 只加规划与开发指导。清单中没有 REA 条目，要落地需要额外引入并配置 REA。

## 证据与局限

原文（README）给出的可核查内容：MIT 许可；安装器要求 Node.js 20+，只用标准库、不联网；CI 在 Windows/macOS/Linux × Node 20/22/24 上运行，使用标准 runner、跳过私有仓库、不增加模型 API 调用或制品/缓存上传；测试覆盖安装选择、备份、回滚、包完整性和本地行为评测 harness（含故意做错的候选）；版本演进 v1.2.0（更新检查）到 v1.3.4（断点续做评测）；参考应用 Pocket Tasks 的走查含实际 REA 分析、七个记录的运行时场景、一次重放测试，以及一个“保留还是改进某个别扭行为”的决定；重建示例通过 16 会话检查器并重放十个观察会话。仓库指标只有 stars: 43。

属于作者主张、未经独立验证的部分：作者明确声明这些工作记录是维护者自写的示例，不是独立评测或跨宿主/模型的认证；安装器测试不代表对实时模型的兼容性认证；这些检查不证明在每个目标或每个模型上的重建质量都成立；联动是基于指令的集成，不覆盖客户端策略、不授予工具权限、不连接 MCP 服务器、不保证模型遵守、不强制并行执行；“不产生额外费用”是一条指令而非计费强制机制，宿主自身仍可能对 token/用量计费，本地执行也消耗电力，skill 无法保证零总成本或控制别的产品的计费。

本次材料的局限：只有 README 一条来源，`skills/rea-reconstruction-companion/SKILL.md`、INSTALL.md、评测细节与 research-basis 均未取到全文，因此实际提示词、评测脚本与阈值强度无法核对；也没有任何使用者反馈或第三方复现。适用条件：有本地文件与命令权限的 agent（Codex / Claude Code / 通用客户端）且愿意另行安装配置 REA；纯对话客户端或托管上传的 skill ZIP 一般无法直接改本地 REA 安装，不能完成完整流程。

## 怎么试、怎么验证

最小试用（按成本从低到高）：

1. 先只在一台机器、一个项目作用域内装（`--skills-dir` 指向项目目录），初次用 `--integration off`，不动已有的 REA，避免影响现有工作流。
2. 安装前 `--dry-run` 看清会改哪些文件，装完用同一命令 `--check` 确认模式正确；确认备份目录与回执路径。
3. 拿原文自带的 Pocket Tasks 参考流程做一次完整走查（导出独立证据包 → 记录观察 → 写需求 → 用 JSON 过程接口对比重建），这是成本最低、自带对照物的路径。
4. 走查前后各跑一次 `--verify`，确认参考证据没缺、没被改。
5. 再换一个你手上真实的小目标（一个函数或一种数据格式），照第 9 步的写法限定范围跑一遍，并刻意测一个“无法判断”的边界（如不可访问的后端、互相矛盾的证据）。

判断有没有改善的指标：

- 产出是否“需求—代码—测试”可追溯：每条需求能否指回具体证据，验收标准是否与证据挂钩；
- 观察、推断、未知项、决策、检查点是否被显式记录，而不是被编造填满；
- 重建候选能否通过所提供的可执行 oracle / 检查器（参考例中是 16 会话检查器 + 重放十个观察会话）；
- 断点续做时，未变的工作能否被复用、目标变了能否被识别为陈旧结果（参考每例 15 项数据比较）；
- 人工评审量表上的表现，以及是否真的触发了任何付费动作（原文把“不产生额外费用”列为硬约束，可作为验收项之一）。

若以上都通过、且确实省下了“读代码—写规格—验重建”的时间，再考虑用 `--integration on` 把它接进日常 REA 流程。
