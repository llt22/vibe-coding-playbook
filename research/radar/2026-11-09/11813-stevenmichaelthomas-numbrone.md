# stevenmichaelthomas/numbrone

- 结论：**值得一试**。在一两个项目上小范围试跑 numbrone 的“chief 路由—manager 分项目—worker 单任务单 worktree”三层编排，并优先借用它的纯文本任务文件、追加式日志和 Watch 循环结构；它的安装和命令都可以照抄，但底层依赖的 herdr 本身还在试用期，且原文没有任何效果数据，所以不适合直接写进手册当成定论。
- 原文：https://github.com/stevenmichaelthomas/numbrone
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T06:59:13.990Z

## 是什么

numbrone 是一个架在 [herdr](https://herdr.dev) 之上的开源「幕僚长」编排层（README 自称独立社区项目，与 herdr 团队无关，MIT）：你用自然语言对一个 **chief** 提需求，chief 判断属于哪个项目并转给该项目的 **manager**；manager 自己回答小问题，代码改动则 spawn **worker**，每个 worker 一个 herdr tab + 一个独立 git worktree（分支 `numbrone/<task>`），互不干扰也不碰你自己的 checkout。报告逐级回流：worker → manager → chief → 你。

实现上刻意做小：**一个 skill、一个 bash 脚本、三个 Markdown 角色文件**，所有状态是可直接读写编辑的纯文本文件（`~/.numbrone/`）。

```
            you, or sources the chief watches (Linear, GitHub issues, ...)
                        │  "add rate limiting to the api"
                        ▼
                 ┌─────────────┐
                 │    chief    │   routes, delegates, keeps track       ~/.numbrone
                 └──────┬──────┘
           ┌────────────┴─────────────┐
           ▼                          ▼
   ┌───────────────┐          ┌───────────────┐   ◀── sources each manager watches
   │  manager-api  │          │  manager-web  │       (Sentry, Datadog, ...)
   └───────┬───────┘          └───────┬───────┘   one per project: herdr workspace numbrone/<project>
      ┌────┴─────────┐                │
      ▼              ▼                ▼
 worker-rate-   worker-fix-     worker-new-       one per code task: herdr tab and git worktree
 limit          login           navbar                               on branch numbrone/<task>

  reports flow back up:  worker ──▶ manager ──▶ chief ──▶ you
```

## 具体做法

前提：macOS 或 Linux；装有 `herdr`、`git`、`jq`；装有一个 herdr 支持的编码 agent（默认 Claude Code，也支持 Codex / Gemini / OpenCode 等）。

1. **装依赖 herdr**
   ```bash
   curl -fsSL https://herdr.dev/install.sh | sh
   ```

2. **安装 numbrone skill**（二选一）
   ```bash
   npx skills add stevenmichaelthomas/numbrone -g
   ```
   ```bash
   git clone https://github.com/stevenmichaelthomas/numbrone.git
   cp -r numbrone/skills/numbrone ~/.claude/skills/
   ```

3. **启动 herdr 与 agent，并装 herdr 的 Claude 集成**
   ```bash
   herdr                                # launch or attach to herdr
   herdr integration install claude     # once: lets herdr track Claude sessions
   claude                               # start Claude Code in a herdr pane
   ```

4. **在 Claude Code 里跑 `/numbrone` 引导**，按序完成 8 项：
   1. 检查 herdr / git / jq 是否存在；
   2. 确定 numbrone 家目录（默认 `~/.numbrone`）；
   3. 录入项目（给路径，或给一个父目录让它挑 git 仓库）；
   4. 生成项目上下文：它读每个项目的 README、manifest、目录结构、近期历史，写出 `projects/<name>/context.md`，供 chief 准确路由；
   5. （可选）配置要监视的输入源，如 Linear、Sentry；
   6. （可选）回答关于目标与标准的问题，给 chief 起步知识；
   7. 设定 agent 类型与权限提示频度；
   8. 为每个项目开一个 herdr workspace 并在其中启动一个 manager。

5. **单独开一个 pane 启动 chief**
   ```bash
   cd ~/.numbrone && claude
   ```
   chief 读 `~/.numbrone/CLAUDE.md` 并完成自我注册。为方便在任意 shell 用 `numbrone` 命令：
   ```bash
   export PATH="$HOME/.numbrone/bin:$PATH"   # in ~/.zshrc or ~/.bashrc
   ```

6. **用自然语言下派任务**（chief 拆多任务、分派、回报）：
   > Fix the flaky login test in the API, and add a dark mode toggle to the web application.

7. **配置 `~/.numbrone/settings.sh`**
   ```bash
   AGENT_KIND=claude       # any `herdr agent start --kind` value
   AGENT_ARGUMENTS=""      # extra arguments for the agent
   BASE_BRANCH=""          # branch new worktrees start from ("" = project's current HEAD)
   PING_CHIEF=1            # 0 = don't type reports into the chief; just log and notify
   ```
   想减少权限打断（原文示例，需自行权衡风险）：
   ```bash
   AGENT_ARGUMENTS="--permission-mode acceptEdits"
   ```
   默认行为是 worker 在每次权限提示处停下、在 herdr 里显示 `blocked` 直到你回答；这是原文明确说的「安全默认」。

8. **配置监视源（Watch）**，让工作从「你提需求」变成「事件触发」。在 chief 的 `~/.numbrone/CLAUDE.md` 或某项目的 `projects/<name>/context.md` 里，一行一个源：
   ```markdown
   ## Watch
   - Linear: new issues in team ENG labelled "agent", every 15 minutes
   - Sentry: new unresolved issues in project "api", every 30 minutes
   ```
   agent 启动时用 `/loop` 起这些循环，重启后会恢复；也可以直接口头要求（例如「have the api manager keep an eye on Sentry」），manager 会自己写进 `context.md`。数据源要靠 MCP 连接器或 `gh` 之类 CLI 先在你的 agent 里接好；条目 ID 要写进任务 brief，避免同一 ticket/error 被重复捡起。

9. **喂上下文而不是都当任务**。例如：
   > For context: we're prioritizing enterprise customers this quarter, so anything touching SSO or audit logs comes first. And we decided last month to stop supporting IE.

   分流规则：关于「你的世界」的（目标、客户、人、既往决策、标准）进 `~/.numbrone/knowledge/`（一主题一个 md，`index.md` 每次会话先读）；关于单个项目的进该项目 `context.md`；关于 chief 自身工作方式的进 `CLAUDE.md` 的 **Learned**。

10. **让 chief 从纠正中学习**：每次你纠正它或说明偏好，它往 `CLAUDE.md` 的 **Learned** 加一行；约十条以内它会每个任务后追问一句以加速校准；Learned 要保持短——合并重复、替换失效、把项目细节下沉到 `context.md`。

11. **日常操作**（原文对照表要点）：提需求=对 chief 说；看进度=问 chief 或 `numbrone status`；看单任务全貌=`numbrone status <task>`；看某个 agent 干活=在 herdr 点它的 workspace/tab；验收=自己 review `numbrone/<task>` 分支、按平常方式合并、再让 chief 关任务；加项目=重跑 `/numbrone`，或 `numbrone add` + 写 `context.md` + `numbrone up <name>`；重启后恢复 manager=`numbrone up`；复盘=让 chief 做 retro。

12. **脚本命令与她的语义**（`numbrone` 是 herdr CLI 的薄封装）：
    | 命令 | 在 herdr / git 里做什么 |
    | --- | --- |
    | `numbrone up [project]` | `herdr workspace create --label numbrone/<project>`，再 `herdr agent start manager-<project>` |
    | `numbrone delegate <project> <task> "<brief>"` | 写 `tasks/<task>.md`，再 `herdr agent prompt manager-<project>` |
    | `numbrone spawn <task>` | `git worktree add <project>/.numbrone/worktrees/<task> -b numbrone/<task>`、`herdr tab create`、`herdr agent start worker-<task>` |
    | `numbrone report <task> <status> "<note>"` | 更新任务文件；在 `blocked`/`review`/`done` 时逐级上报（worker → manager → chief）并发 herdr 通知 |
    | `numbrone status [task]` | 读任务文件 + 实时 agent 状态（`herdr agent get`） |
    | `numbrone close <task>` | `herdr tab close` 关 worker，`git worktree remove`（保留分支） |
    | `numbrone chief` | `herdr agent rename <this pane> chief`，让回报能找到它 |
    | `numbrone log ["<note>" \| <date>]` | 追加到当天工作日志，或打印某天日志 |

13. **状态目录结构（可手改、可版本化）**
    ```
    ~/.numbrone/
    ├── CLAUDE.md               the chief's instructions (AGENTS.md links to it)
    ├── settings.sh           which agent to run, with which arguments
    ├── projects.json           project index: name → path + one-line summary
    ├── projects/<name>/
    │   └── context.md          what the project is, its commands, which requests belong to it
    ├── tasks/<task>.md         one file per task: brief, status, append-only log
    ├── log/<date>.md           the daily work log (see below)
    ├── knowledge/              what the chief knows about your world, by topic (index.md lists them)
    ├── roles/
    │   ├── manager.md          instructions every manager reads at startup
    │   └── worker.md           instructions every worker reads at startup
    └── bin/numbrone            the script everyone uses
    ```

14. **换 agent**：改 `settings.sh` 的 `AGENT_KIND`（如 `codex`、`gemini`、`opencode`）并装对应 herdr 集成 `herdr integration install codex`；角色文件是纯 Markdown 且有 `AGENTS.md` 符号链接，任何读 `AGENTS.md` 的 agent 都能当 chief。也可手动 `bash skills/numbrone/scripts/numbrone init ~/.numbrone` 后照 `skills/numbrone/SKILL.md` 走。

15. **定制与升级**：改 `roles/manager.md` / `roles/worker.md` 调角色行为；改 `CLAUDE.md` 调 chief；改各项目 `context.md` 里的 "Route here" / "Not here" 段落改善路由。升级=拉仓库后重跑 `numbrone init ~/.numbrone`，只更新 `bin/numbrone`，不会覆盖你改过的 `CLAUDE.md`、`roles/`、`settings.sh`、`projects.json`。

16. **安全边界与排障**：没人合并、推送、部署，除非你明说；`numbrone close` 对未提交改动会拒绝删 worktree，且始终保留分支；worktree 放在 `<project>/.numbrone/worktrees/`，写进仓库本地 `.git/info/exclude`，不会出现在 `git status` 里也不会被提交，且继承你已给该项目的 folder trust。常见故障：找不到 home 就显式 `export NUMBRONE_HOME=~/.numbrone`；`blocked` 就点它的 tab 或 `herdr agent read <name> --source recent-unwrapped --lines 80`；报告到不了 chief 就在 chief 会话里跑 `numbrone chief`；重启后 manager 消失就 `numbrone up`。

## 对应的研究问题

**1. 能力发现（哪些还没想到交给 AI）**
- 需求分派本身交给 AI：chief 把一句话拆成多任务并按项目路由（示例把「修 API flaky 测试 + web 加暗色模式」拆成两个任务给两个 manager）。
- 项目级 triage 交给 manager：小问题（提问、调研）自己答，只有代码改动才开 worker。
- 来源监控转任务：chief 看跨项目的 Linear team / 组织级 GitHub issues / 共享收件箱，manager 看本项目的 Sentry / Datadog / CI 失败。
- 自我改进：chief 从纠正中提炼 Learned，并能做 retro 后提议修改自己的指令、角色文件和项目上下文（需你同意才落）。

**2. 任务匹配（什么工作用什么模型/工具/协作方式）**
- 三级分工按「是否需要动代码」匹配：路由不进代码、manager 做小回答与 review、worker 做改动。
- 并行方式：一个任务一个 herdr tab + 一个 git worktree + 分支 `numbrone/<task>`，明确为了「多任务同时跑且不互相踩、不踩你的 checkout」。
- 模型/工具可换：`AGENT_KIND` 支持 claude / codex / gemini / opencode，角色文件与 `AGENTS.md` 使任何读 AGENTS.md 的 agent 可当 chief。
- 权限粒度：默认每提示停（`blocked`），或用 `--permission-mode acceptEdits` 降摩擦。
- manager 先 review 再上报 ready，形成「执行者—审阅者」配对。

**3. 条件供给（要给哪些信息、工具、权限、反馈）**
- 信息：每项目 `context.md` 必须写清「项目是什么、命令是什么、哪些请求属于/不属于它（Route here / Not here）」；引导步骤 4 明确让它读 README、manifest、布局、近期历史来生成。
- 全局知识：`knowledge/` 按主题一文件 + `index.md` 每会话先读；项目级信息进 `context.md`，工作方式偏好进 Learned。
- 工具：MCP 连接器（Linear、Sentry、Datadog）或 `gh` 等 CLI 需先在 agent 里接好。
- 权限：folder trust（首次信任后 worker 继承，不再问）；`blocked` 时最多等 5 分钟让你在 herdr 回答。
- 反馈：每个任务结束后（约前十条内）主动追问一句校准；纠正写入 Learned；brief 必须携带「why」，因为 manager 只看 brief。

**4. 主动推进（时间/事件/状态触发）**
- 时间触发：Watch 里写频率（示例 `every 15 minutes` / `every 30 minutes`），agent 启动时用 `/loop` 起循环，重启后自动恢复。
- 事件触发：新 Linear issue、新未解决 Sentry issue、CI 失败等被转成任务。
- 去重机制：条目 ID 写进任务 brief，保证同一 ticket/error 不被二次拾取。
- 状态驱动：`queued / blocked / review / done / closed` 状态机；`blocked`/`review`/`done` 自动逐级上报并发 herdr 通知；`status` 表显示 TASK / PROJECT / STATUS / WORKER / LAST UPDATE。
- 可恢复性：`numbrone up` 重启 manager，`numbrone up <name>` 加项目。

**5. 效果验证**
- 任务级：`numbrone status <task>` 给出 brief、状态、完整追加式日志。
- 日级：`~/.numbrone/log/<date>.md` 只记结果不记过程噪音——里程碑（脚本写）、outcome（chief 写：交付了什么、是否返工/阻塞/耗时、一行教训）、决策、你给的反馈与上下文。
- 跨天聚合：`grep -h "outcome:" ~/.numbrone/log/*.md`。
- 回归改进：让 chief 做 retro，读日志指出哪里卡住、返工频率，并提议改自身指令、角色文件或项目上下文。
- 审计性：日志只追加不修改，原文称其为可信的 audit trail。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）**：numbrone 的默认 agent，负责 chief / manager / worker 全部角色；numbrone 不是替代它，而是在其上加了编排层与角色分工、worktree 隔离和状态文件。安装路径也是 `~/.claude/skills/`。
- **Herdr（清单状态：try）**：numbrone 的硬依赖与运行时——workspace/tab/agent 起停、agent 状态查询、通知、`/loop` 都靠它。因此 numbrone 的成熟度上限受 herdr 约束，herdr 还在 try，numbrone 不宜直接 adopt。
- **OpenCode（清单状态：watch）**：可作为 `AGENT_KIND` 的替代值之一（同列为 codex、gemini），但原文只说配置方式，未给验证。
- 清单中没有其他多 agent 编排 / worktree 调度类条目可对照。

## 证据与局限

**原文给出的（可核对）**：完整安装与引导步骤、`settings.sh` 四个配置项、`numbrone` 八个子命令到 herdr/git 命令的映射表、Watch 段落格式与频率写法、状态目录树、任务文件与工作日志的真实样例、故障对照表、卸载方式。仓库 75 stars，MIT。

**只是作者主张、未给证据的**：
- 「chief 像你的延伸、有主见、只把真正的决策带给你并附建议」——行为期望，无对照结果。
- 「the more it knows, the better its work gets」「routes ambiguous requests correctly」——无精度数据。
- 「日志短到一分钟读完」「retro 能指出卡点与返工」——无实际 retro 输出示例。
- 完全没有任何效果指标：没有任务完成时间、返工率、合并成功率、token/成本、并行冲突次数的数据，也没有用户案例。

**适用条件与风险**：
- 仅 macOS / Linux；需 herdr + git + jq + 一个受支持的编码 agent。
- 只适合**多项目、任务可并行、你愿意做最终 review 与合并**的个人或小团队；单项目小任务用它会明显增开销（三层 agent、每任务一个 worktree）。
- 原文明确：agent 以你的身份、在你的机器上跑（"Agents run on your machine with your access"）；`acceptEdits` 是拿权限换流畅，需自行评估。
- 安全默认值可依赖：不自动 merge/push/deploy、`close` 拒绝未提交改动且保留分支、worktree 写进 `.git/info/exclude`。
- 社区项目、单作者、无关联背书，接口（herdr CLI、skill 路径）可能随 herdr 变动。

## 怎么试、怎么验证

**最小试用（1–2 周，1 个项目起步）**
1. 先只在一个项目上装：跑完步骤 1–4，只启动 `manager-<该项目>` 一个 manager，Watch 先留空。
2. 用 2–3 个**真实但低风险**的任务（非生产、非部署相关），一次一个，走「说需求 → manager spawn worker → review → 你合并 → chief close」全流程。
3. 第二个任务起，强制自己只通过 chief 下达，不直接改代码，检验路由与 brief 质量。
4. 第一周末检查 `log/<date>.md`，让 chief 做一次 retro；再决定是否加第二个项目、是否开 Watch 源。
5. 稳定后再加 Watch（先一个源、频率别太密），观察是否产生重复任务或噪音任务。

**判断有没有改善的指标（对照你自己现在用单 agent 手做的同类任务）**
- 周期时间：任务从入队到 `review` 的时长（`status` 的 LAST UPDATE 与任务文件时间戳可算）。
- 返工率：outcome 里出现 rework 的比例 / 每任务平均重做次数。
- 阻塞成本：`blocked` 次数与平均等待时长（默认每提示都停，这一项容易失控，是主要观察点）。
- 人工干预次数：每个任务你需要介入的次数（回答问题、修 brief、纠正路由）。
- 隔离有效性：并行任务间是否出现 worktree/分支冲突（期望 0）、你的工作区是否被污染（`git status` 应为干净）。
- 路由准确率：chief 把请求分给正确项目的比例。
- 上下文收益：喂 `knowledge/` 与 `context.md` 前后，brief 里是否开始自带「why」和验收标准；模糊需求的返工是否下降。
- 日志可用性：你能否在 1 分钟内读懂当天日志并据此做决策（不合格就先砍日志字段，别加功能）。

**不改善就退的信号**：多数任务由你手动纠正 brief、blocked 等待时间超过实际编码时间、或单任务开销大于自己直接做——此时保留「每任务一个 git worktree + 纯文本任务文件 + 追加式日志」这三个做法，卸掉三层 agent。
