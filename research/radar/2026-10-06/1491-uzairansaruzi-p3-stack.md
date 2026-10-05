# uzairansaruzi/p3-stack

- 结论：**值得一试**。值得在 T3 Code 环境里小范围试一次：按 README 的 clone→install.sh→/setup-p3→/p3-mode 四步挂上一个真实小任务，验证它的 playbook 路由和 worktree/PR 监视机制是否真比手动流程省事；但仓库只给了安装与入口命令，编排原语只有名字没有配置细节，也没有任何效果数据，只能算“可试”而非“可采纳”。
- 原文：https://github.com/uzairansaruzi/p3-stack
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-05T22:59:47.072Z

## 是什么

p3-stack 是把 pstack（poteto 在 Cursor 插件生态里的技能集合，定位是“把 agent 变成一支工程团队：一个 mode skill 路由到各 playbook，principle 约束每个决策，verification 严格到可以放心并行”）在 T3 Code 上重写的版本。同样的技能、原则和话术，编排机制换成 T3 Code 的原语：

- Delegation：`delegate_task` 子代理取代 Cursor 的 Task 工具，按角色从 `orchestrator_capabilities` 解析 provider 和 model，跨模型 panel 是原生能力。
- Worktrees：`t3_thread_launch` 把一个 worker 绑到它自己的 worktree 和分支，“一个 worktree 一个写者”由应用强制而不是靠约定。
- Watching：`watch_pull_request` 在检查跑完、有人评论或分支冲突时唤醒线程，不用轮询循环。
- Scheduling：`schedule_task` 在没有活跃回合时也能跑审计和过夜节奏，不需要 `/loop`。
- Memory：`t3_thread_read` / `t3_thread_search` 取代去挖 Cursor 的 transcript 文件。
- Proof：`preview_*` 浏览器工具和 `device_*` 模拟器取代外部控制类技能，截图和录像落回线程里。

仓库附带 skills 目录（architect、arena、automate-me、benchmark-checklist、blast-radius、bro、correct、create-verification-skill、figure-it-out、how、interrogate、maintain-verification-skill、make-bot-ui、no-comments、p3-help、recall、reflect、setup-p3、show-me-your-work、swarm、tdd、teach、technical-writing、typescript-best-practices、unslop、why 等）、24 条 principle 技能，以及 `p3-mode` 的 playbook 路由表（investigation、bug fix、perf issue、hillclimb、runtime forensics、trace forensics、feature、refactoring、prototype、visual parity、authoring a skill、eval、babysit、shipping、autonomous run、orchestrate、autopilot-full、autopilot-stack、session pickup、pause safely、multi-phase plan、worktree cleanup、opening a PR）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：需要一台能跑 T3 Code 的机器（它从 `~/.agents/skills/` 读取 skills），已装 git。以下命令均出自 README。

1. 克隆并全局安装：

```bash
git clone https://github.com/uzairansaruzi/p3-stack.git
cd p3-stack
./install.sh
```

`install.sh` 会把每个 `skills/*` 目录链接进 `~/.agents/skills/`。

2. 如果只想装到某个项目而不是全局（前提：目标 repo 路径存在）：

```bash
./install.sh --project /path/to/repo
```

这会装到该项目的 `.agents/skills/`。

3. 初始化角色→模型的映射：运行 `/setup-p3`。它会读 `orchestrator_capabilities`，写出 `p3-models.md`，把每个角色（code、judgment、review 面板）映射到你实际拥有的 provider 和 model。这是后面跨模型 panel 能跑起来的前提。

4. 正式干活时用 `/p3-mode`。它读请求、挑一个 playbook，并按步骤在需要时调用其它 skill。需要严谨流程的任务都从这里进。

5. 卡住或不确定该用哪个 skill 时，问 `/p3-help`。

6. 机制层面的用法（README 只给了名称和一句话用途，没有给命令语法或配置样例，需要自己到仓库/运行环境里确认）：用 `delegate_task` 派子代理组成跨模型 panel；用 `t3_thread_launch` 给 worker 分配独立 worktree 与分支；用 `watch_pull_request` 替代轮询等待 PR 状态；用 `schedule_task` 挂定时审计和过夜任务；用 `preview_*` / `device_*` 产出截图和录像作为交付证据；用 `t3_thread_read` / `t3_thread_search` 取回线程记忆。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 的 playbook 与 skill 命名本身就是一份“可以交给 AI 的活”的清单——调查（investigation）、修 bug、性能问题、hillclimb（爬坡式优化）、运行时取证、trace 取证、功能开发、重构、原型、视觉对齐（visual parity）、写 skill、eval、babysit（盯 PR）、发布（shipping）、自治运行、编排、会话恢复（session pickup）、安全暂停、多阶段计划、worktree 清理、开 PR。
- **任务匹配**：有明确的角色分工——code / judgment / review 面板各自映射到不同的 provider 和 model（由 `/setup-p3` 依据 `orchestrator_capabilities` 写进 `p3-models.md`）；跨模型 panel 是原生能力；`p3-mode` 负责“先识别请求类型，再选 playbook，再按需调 skill”，这就是它的任务→流程匹配机制。
- **条件供给**：需要提供的工具与权限包括 T3 Code 运行环境、skills 目录（`~/.agents/skills/` 或项目的 `.agents/skills/`）、可用的 provider/model 凭据、git 的 worktree 与分支能力、浏览器与设备模拟器（`preview_*` / `device_*`）。反馈来自 `watch_pull_request` 的事件（检查完成、评论、分支冲突）以及线程记忆（`t3_thread_read` / `t3_thread_search`）。
- **主动推进**：`schedule_task` 让审计和过夜节奏在没有活跃回合时照样运行；`watch_pull_request` 由事件触发唤醒线程，明确替代轮询循环。这两条是原文里最贴“主动推进”的部分。
- **效果验证**：原文只说 verification 严格到“可以放心并行”，并提到用 `preview_*` / `device_*` 把截图和录像落到线程里作为证据。具体判据、阈值、通过标准，README 没有给。

## 与已有做法的关系（对照清单条目）

清单中只有一条相关：**Cursor（tool，状态 watch）**。p3-stack 自称是 pstack（Cursor 插件生态里的一套技能）的 T3 Code 重写，并逐条替换 Cursor 侧的机制：`delegate_task` 替 Task 工具、`t3_thread_launch` 替 worktree 管理、`watch_pull_request` 替轮询、`schedule_task` 替 `/loop`、`t3_thread_read/search` 替挖 transcript 文件、`preview_*/device_*` 替外部控制技能。也就是说，它是同一套技能与原则体系换了个宿主（Cursor → T3 Code）的迁移版。如果团队已经在 Cursor 里用 pstack 类做法，需要评估的其实是“要不要换宿主、值不值得”。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- 证据：仓库 README 自述，来源指标 68 stars。可照做的部分是安装与上手三步（`git clone` + `install.sh`、`install.sh --project`、`/setup-p3`、`/p3-mode`、`/p3-help`），这些是具体的命令。
- 只是名字、没有细节：`delegate_task`、`t3_thread_launch`、`watch_pull_request`、`schedule_task`、`t3_thread_read`、`t3_thread_search`、`preview_*`、`device_*` 全部只有一句用途描述，没有命令语法、配置样例、参数格式或示例输出。`p3-models.md` 的格式也没有展示。
- 作者主张（无数据、无案例、无对比）：“pstack 是对 AI slop code 的回应”“verification 严格到可以放心并行”“一个 worktree 一个写者由应用而非建议保证”。没有任何基准、前后对比、失败案例或用户反馈。
- 适用条件：必须在 T3 Code 环境内使用；上述原语是 T3 Code 提供的，脱离该宿主这套做法不成立。skills 和 24 条原则源自 poteto 的 pstack（MIT），本仓库自己声明只是“重接线”。README 未说明技能内容的完整度、维护活跃度、T3 Code 的获取门槛。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用**：不要一上来就全局 `install.sh`，先用 `./install.sh --project /path/to/repo` 装到一个不重要的真实仓库；跑 `/setup-p3` 看它生成的 `p3-models.md` 是否把 code / judgment / review 角色映射到了你确实有的模型；然后拿一个真实的小任务（一个 bug fix 或一个 feature，规模控制在一次能看完的范围）走 `/p3-mode`，观察它是否按 playbook 走完。注意：没有 T3 Code 环境就无法验证，此时最多只能读它的 skill / playbook 设计思路，不要照搬。

**判断有没有改善的指标**（README 未给，以下是可自设的观察项）：

1. 流程完整度：`/p3-mode` 是否真的按所选 playbook 的步骤推进，而不是跳过步骤或空转。
2. 并行安全性：同时开多个 worker 时，worktree / 分支冲突次数是否为 0（原文声称由应用强制单写者）。
3. 等待成本：用 `watch_pull_request` 后，是否真的不再需要轮询，事件唤醒的延迟能否接受。
4. 无人值守：`schedule_task` 挂的审计/过夜任务，在没有活跃回合时是否照常执行并留下可读结果。
5. 返工率：同一类任务相比你原来的做法，人工修正次数、返工轮次是否下降；交付证据（截图、录像、PR）是否让你少做一轮核对。

只要第 2、4、5 项没有可观察的改善，就说明这套编排只是换了名字的流程包装，应降级为“只读它的 playbook 与 principle 设计”。
