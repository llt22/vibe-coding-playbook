# 并行跑多个编码 agent：一任务一工作区，宣布完成前先拿出证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多个编码 agent 同时干活时会互相改文件、任务跑到哪一步看不清，而且很容易「说完成了」却拿不出证据；这篇手册给出一套从单层 worktree 隔离、多项目分派、表格化批量核验到可机器校验重编排的分级做法，并把「完成前先拿出外部证据」做成固定习惯。
> 先试这一步：先在一个真实仓库里挑两三个文件不重叠、能各自验证的任务，用 worktrunk 跑一轮「建 worktree → 并行跑 agent → wt list 看状态 → 合并或清理」，并在合并前把验证命令跑一遍、红了就不合。
> 最近修订：2026-11-10

## 解决什么问题

多个编码 agent 并行时，如果都在同一个工作目录里跑，会互相改文件；原生 git worktree 的创建、切换、查看、收尾又太笨，任务一多就不知道谁在哪、各自到哪一步。任务跨项目多起来后，还会多一层问题：需求该派给谁、worker 的报告往哪回流、哪些输入源可以自动触发任务。再往上，如果任务本身可机器校验、需要几十到上千个 agent 自组织，还会遇到沙箱隔离、共享状态、分支合并和工具调用安全边界的问题。

另一类场景看起来不像「并行编码」，但同样会失控：手上有一批文档 × 同一组问题要做批量抽取和核对，或者是多个 agent 各跑一摊、你需要一屏同时盯住它们并判断「它说完成了，是真的吗」。这类任务光有目录隔离不够，还要一个并排的看板和贴在 agent 旁边的校验格。

这篇手册先把「一个任务 = 一个 worktree = 一个 agent 会话」做成日常可维护的流程（建、跑、看、收），再给出任务多到自己盯不住时可选的「chief—manager—worker」三层编排做法、可机器校验任务上的多 agent 团队骨架，以及用表格 + MCP + 校验格做批量核验的做法。后三种都标明试用边界，不当作默认做法。最后单独用一节把「完成前先拿出证据」提炼成跨做法的固定习惯。

## 适用与不适用

适用：

- 已有 git 仓库，要并行跑的是可以在终端启动的 CLI agent（材料以 Claude Code 为例，也提到 Codex、Gemini、OpenCode 等）。
- 任务彼此文件重叠小、可独立验证：材料里的示例是「加用户认证 / 修分页 bug / 为 API 写测试」。
- macOS / Linux；Windows 与 Arch、conda 另有 worktrunk 安装路径（见做法 A 步骤 1）。
- 任务跨多个项目、多到自己盯不过来，且愿意接受 herdr 还在试用期时，再考虑做法 B 的三层编排。
- 任务是「多份文档 × 同一组问题」的批量只读抽取（合同、财报、卷宗），或者需要多个 agent 各占一行并行跑、结果要并排核验时，考虑做法 D。
- 任务可分解、可并行、结果能被机器客观校验（例如每个陈述是一个 Lean 定理，只有 Lean 检查器接受才算完成），且愿意搭沙箱、共享数据库和前置监控时，才小范围试做法 C。

不适用：

- 需要改同一批文件的重构，不适合按这套方式并行；冲突不会因为换了工具就消失。
- 材料只是各项目 README 和一篇实验报告，没有给出适用于你团队的性能、冲突率、返工率、耗时对照；不要把它当成「并行一定更快」的证明。
- worktrunk 的 hooks、LLM commit、缓存共享的具体配置细节在 worktrunk.dev 外部文档，本条材料没有给出原文，本文不编造这些配置。
- numbrone 依赖的 herdr 本身还在试用期，原文也没有效果数据；不要把三层编排当成已经验证的默认做法，更不要直接放到关键路径上。
- numbrone 的前置是 macOS 或 Linux；Windows 走不通这条路径（材料未给 Windows 做法）。
- recalc 明确标注 very early beta，会有 bug 和跨版本破坏性变更；仅 macOS（Linux 实验性、无 Windows）；不是沙箱，命令以你的权限运行。不要用它跑不可丢失、不可重跑的东西，也不要当成生产调度系统。
- 做法 C 来自一次内部模型的玩具实验，不是产品；没有自动裁判的开放任务不要直接套，否则自组织会退化成互相吹捧。

## 前置条件

共用：

- 一个真实的 git 仓库；先在真实仓库小范围试，不要在重要的 main 上直接开试。
- 终端里可启动的 agent CLI，例如 `claude`。
- 权限：创建/删除分支、增删 worktree、push；`wt merge` 会直接改动 main，对 main 的写权限要可控。

做法 A（单层 worktree）另需：

- 安装 worktrunk：macOS 用 Homebrew，或有 Rust 工具链用 cargo。
- 必须完成 shell 集成（`wt config shell install`）。没有集成时 `wt switch` 只能打印路径，不能改变当前 shell 的目录，agent 就会在错误的位置启动。
- 缓存共享 `wt step copy-ignored` 只在 APFS、btrfs、XFS 文件系统上可用。

做法 B（三层编排）另需：

- macOS 或 Linux；已装 `herdr`、`git`、`jq`。
- 一个 herdr 支持的编码 agent（默认 Claude Code，也支持 Codex / Gemini / OpenCode 等）。
- 已安装 numbrone skill；已装 herdr 的 Claude 集成，否则 herdr 追踪不到 Claude 会话。
- 要配 Watch 的话，数据源要先通过 MCP 连接器或 `gh` 之类 CLI 接进 agent；否则 Watch 没有可读的输入。

做法 C（多 agent 团队骨架）另需：

- 一个可机器校验的任务和自动裁判（原文是 Lean 检查器 + main 上的 grader）。
- 能创建轻量 VM 或等价沙箱的基础设施；每个 agent 一个沙箱，镜像里预装工具链。
- 一个共享 Postgres（或等价的并发安全存储），以及能拦截工具调用的 gateway/分类器。
- 接受它只是一次实验结论：原文是 1,000 agent、28.7 小时完成一次形式化证明复现，没有给出你所在领域的推广证据。

做法 D（表格编排 + 校验格）另需：

- macOS（Apple silicon 或 Intel），或实验性 Linux；无 Windows。
- 已有一个可用的 Claude Code / Codex / pi 账号，并登录过一次。
- 装好 recalc，并让它在 Agent → Connect an Agent 里识别到你的 agent。
- 心里清楚：recalc 不是沙箱，`$` 命令和 agent 格里的命令以你的权限运行；`!` 动作和 agent 格只有你手动运行才执行。

## 操作步骤

### 先选做法

做法 A：单层 worktree（worktrunk）。适合 1–3 个并行、任务边界清楚、自己盯得住，只需要「目录隔离 + 状态可见 + 收尾干净」。建议所有人先走这条，完整跑一轮。

做法 B：三层编排（numbrone）。适合项目多、任务多、需要把需求分派给不同项目、需要 worker → manager → chief → 你的报告回流，或者想把 Linear、Sentry 之类输入源变成触发事件。底层仍然是每个 worker 一个 herdr tab + 一个独立 git worktree（分支 `numbrone/<task>`），但多了一层角色和纯文本任务状态。

做法 C：多 agent 团队骨架（Anthropic 实验做法）。适合任务可机器校验、需要几十到上千个 agent 自组织、并且愿意搭独立沙箱、共享 SQL、每 agent 一分支一 MR、工具调用前置分类器。它不是日常编码的默认层。

做法 D：表格编排 + 校验格（recalc）。适合两类活：一是「多份文档 × 同一组问题」的批量只读抽取与核对；二是多个 agent 各占一行并行跑、你要一屏盯住并把「它说完成了」交给旁边一个自动重跑的检查格判定。它和 A/B/C 不在一条升级路径上：A/B/C 管的是同一批代码怎么隔离、分派和收尾，D 管的是结果怎么并排摆出来、怎么被独立检查抓住。

怎么选：

- 你要并行改代码：先用 A 跑通；当每天并行数超过自己能盯的范围，或者任务已经跨项目、跨输入源，再小范围试 B。
- 你手上是只读的批量抽取/核对任务：可以跳过 A/B/C，直接从做法 D 的最小试用开始（全程只读，不碰 `!` 动作），半天能看出值不值。
- 只有任务有自动裁判、且你愿意承担沙箱和监控成本时，才小范围试 C。
- 材料对 B 的结论是「在一两个项目上小范围试跑」，对 C 的结论是「在一个可机器验证的小任务上照做试跑」，对 D 的结论是「先在只读型批量任务上小范围试用」——都不是直接推广。

### 做法 A：单层 worktree

#### 1. 安装并装 shell 集成

前提：已经决定在真实仓库上试。预期结果：`wt` 可执行，且切换目录在当前 shell 里生效。

```bash
brew install worktrunk && wt config shell install
```

或：

```bash
cargo install worktrunk && wt config shell install
```

其他平台（README 原文）：

```bash
# Windows（wt 与 Windows Terminal 别名冲突，故装为 git-wt）
winget install max-sixty.worktrunk
git-wt config shell install

# Arch Linux
sudo pacman -S worktrunk && wt config shell install

# conda / pixi
conda install -c conda-forge worktrunk && wt config shell install
pixi global install worktrunk && wt config shell install
```

Windows 另一条路：在设置 → 应用 → 高级应用设置 → 应用执行别名里关掉 Terminal / Terminal Preview，就可以直接用 `wt`。

#### 2. 给单个任务建工作区并进入

前提：shell 集成已生效。这一步等价于 `git worktree add -b <branch> <path>` 加 `cd <path>`。

```console
$ wt switch --create feature-auth
✓ Created branch feature-auth from main and worktree @ ~/repo.feature-auth
```

预期结果：新建分支和 worktree，当前目录切到新工作区。

#### 3. 并行跑多个 agent：一个任务一个 worktree

`-x` 表示切换后执行某条命令，`--` 之后的参数原样传给该命令。前提：三个任务的文件重叠小、各自可独立验证。

```bash
wt switch -x claude -c feature-a -- 'Add user authentication'
wt switch -x claude -c feature-b -- 'Fix the pagination bug'
wt switch -x claude -c feature-c -- 'Write tests for the API'
```

预期结果：三个 agent 分别在 `feature-a`、`feature-b`、`feature-c` 三个工作区里跑，互不改对方文件。任务怎么选是这套做法成立的前提，不是任意任务都能这样拆。

#### 4.（可选）用 hook 把每个新工作区都要做的准备自动化

README 只给了用途：创建后自动装依赖、起 dev server；hook 类型含 create、pre-merge、post-merge 等。配置原文在 `worktrunk.dev/hook/`，本条材料没有给出，不要照抄网上的片段。没有把握就先跳过这一步，手工准备。

#### 5. 用 `wt list` 看所有并行任务的状态

代替逐个 `cd` 过去看。

```console
$ wt list
  Branch        Status      HEAD±     main↕    main…±    Remote⇅  Commit    Age  Message
@ feature-auth  +   ↑      +27   -8   ↑1       +31                4bc72dc    2h  Add authenticatio…
^ main              ^⇡                                    ⇡1      0e631ad    1d  Initial commit

○ Showing 2 worktrees, 1 with changes, 1 ahead, hidden: Path
```

读法（README 原文）：`@` 是当前 worktree；`+` 有已暂存改动；`↑1` 领先 main 1 个提交；`⇡` 有未推送提交。`wt list --full` 还会带 CI 状态和每个分支的 AI 生成摘要。

#### 6. 收尾：先在当前工作区跑一遍验证，再两条路径二选一

前提：agent 说它做完了。先在工作区里自己跑一遍你会跑的那条验证（测试、lint、构建），红了就不要进合并；`wt list --full` 里的 CI 状态是同一类外部信号。这一步是本文按做法 D 的校验格原则补的，材料里的 worktrunk README 没有强制这一环节。

路径 A：走 PR，适合需要 review 或团队协作的改动。

```bash
wt step commit                    # commit staged changes
gh pr create                      # or glab mr create
wt remove                         # after PR is merged
```

路径 B：本地合并，适合自己就能判断、不需要 review 的改动。一条命令做 squash、rebase 到 main、fast-forward 合并、清理：

```console
$ wt merge main
◎ Generating commit message and committing changes... (2 files, +53, no squashing needed)
  Add authentication module
✓ Committed changes @ a1b2c3d
◎ Merging 1 commit to main @ a1b2c3d (no rebase needed)
✓ Merged to main (1 commit, 2 files, +53)
◎ Removing feature-auth worktree & branch in background (same commit as main, _)
○ Switched to worktree for main @ ~/repo
```

怎么选：改动要别人看、要走 CI/评审，用路径 A；改动小且自己能验证、想省掉 PR 往返，用路径 B——但 B 会直接动 main，前提是 main 的写权限可控。

#### 7. 并行数量上去之后的两个配套

- 构建缓存共享：`wt step copy-ignored`，让多个 worktree 都有 `target/`、`node_modules/` 而不必各自构建或复制；仅限 APFS、btrfs、XFS。
- 每个 worktree 一个 dev server：用 `hash_port` 模板过滤器给每个 worktree 分配唯一端口，避免端口撞车。

这两项的具体配置细节在外部文档，材料未给出，先按文档确认再用。

#### 8.（可选）其他入口

`wt switch pr:123` 直接检出 PR 分支；interactive picker 浏览 worktree 并预览 CI 状态、diff、log、PR 和评论；aliases 定义自定义 `wt <name>` 子命令；per-branch 变量供 hook 模板使用。

### 做法 B：三层编排（可选，先小范围试）

前提：已经用做法 A 跑通过至少一轮，确认并行确实适合你的任务；并且接受 herdr 还在试用期、numbrone 原文没有效果数据。下面命令都可以照抄，但先在一两个项目上试，不要一上来接管所有项目。

#### 9. 检查依赖并安装 herdr

前提：macOS / Linux，已装 `git`、`jq`。预期结果：`herdr` 可执行。

```bash
curl -fsSL https://herdr.dev/install.sh | sh
```

#### 10. 安装 numbrone skill（二选一）

```bash
npx skills add stevenmichaelthomas/numbrone -g
```

```bash
git clone https://github.com/stevenmichaelthomas/numbrone.git
cp -r numbrone/skills/numbrone ~/.claude/skills/
```

预期结果：Claude Code 里能调用 `/numbrone`。

#### 11. 启动 herdr、装 Claude 集成、启动 Claude

```bash
herdr                                # launch or attach to herdr
herdr integration install claude     # once: lets herdr track Claude sessions
claude                               # start Claude Code in a herdr pane
```

预期结果：herdr 能追踪 Claude 会话；后面的 manager、worker 都在 herdr 的 workspace/tab 里跑。

#### 12. 在 Claude Code 里跑 `/numbrone` 引导

按序完成 8 项：

1. 检查 herdr / git / jq 是否存在；
2. 确定 numbrone 家目录（默认 `~/.numbrone`）；
3. 录入项目（给路径，或给一个父目录让它挑 git 仓库）；
4. 生成项目上下文：它读每个项目的 README、manifest、目录结构、近期历史，写出 `projects/<name>/context.md`，供 chief 准确路由；
5. （可选）配置要监视的输入源，如 Linear、Sentry；
6. （可选）回答关于目标与标准的问题，给 chief 起步知识；
7. 设定 agent 类型与权限提示频度；
8. 为每个项目开一个 herdr workspace 并在其中启动一个 manager。

预期结果：`~/.numbrone` 下出现 `CLAUDE.md`、`settings.sh`、`projects.json`、`projects/<name>/context.md` 等纯文本状态；每个项目有一个 manager 在 herdr workspace 里。

#### 13. 单独开一个 pane 启动 chief

```bash
cd ~/.numbrone && claude
```

chief 读 `~/.numbrone/CLAUDE.md` 并完成自我注册。为方便在任意 shell 用 `numbrone` 命令：

```bash
export PATH="$HOME/.numbrone/bin:$PATH"   # in ~/.zshrc or ~/.bashrc
```

#### 14. 配置 `~/.numbrone/settings.sh`

```bash
AGENT_KIND=claude       # any `herdr agent start --kind` value
AGENT_ARGUMENTS=''      # extra arguments for the agent
BASE_BRANCH=''          # branch new worktrees start from ('' = project's current HEAD)
PING_CHIEF=1            # 0 = don't type reports into the chief; just log and notify
```

想减少权限打断（原文示例，需自行权衡风险）：

```bash
AGENT_ARGUMENTS='--permission-mode acceptEdits'
```

默认行为是 worker 在每次权限提示处停下、在 herdr 里显示 `blocked` 直到你回答；这是原文明确说的「安全默认」。如果你改成 acceptEdits，等于用更大权限换更少打断，风险自己承担。

#### 15. 用自然语言下派任务

对 chief 说，例如：

> Fix the flaky login test in the API, and add a dark mode toggle to the web application.

预期结果：chief 拆多任务、分派给对应项目的 manager；manager 自己回答小问题，代码改动则 spawn worker；每个 worker 一个 herdr tab + 一个独立 git worktree，分支 `numbrone/<task>`，不碰你自己的 checkout。报告逐级回流：worker → manager → chief → 你。

#### 16.（可选）配置 Watch，把「人提需求」变成「事件触发」

在 chief 的 `~/.numbrone/CLAUDE.md` 或某项目的 `projects/<name>/context.md` 里，一行一个源：

```markdown
## Watch
- Linear: new issues in team ENG labelled 'agent', every 15 minutes
- Sentry: new unresolved issues in project 'api', every 30 minutes
```

前提：数据源已经通过 MCP 连接器或 `gh` 之类 CLI 接进 agent。agent 启动时用 `/loop` 起这些循环，重启后会恢复；也可以直接口头要求（例如「have the api manager keep an eye on Sentry」），manager 会自己写进 `context.md`。条目 ID 要写进任务 brief，避免同一 ticket/error 被重复捡起。

#### 17. 喂上下文而不是都当任务，并让 chief 从纠正中学习

分流规则：

- 关于「你的世界」的（目标、客户、人、既往决策、标准）进 `~/.numbrone/knowledge/`，一主题一个 md，`index.md` 每次会话先读；
- 关于单个项目的进该项目 `context.md`；
- 关于 chief 自身工作方式的进 `CLAUDE.md` 的 **Learned**。

例：

> For context: we're prioritizing enterprise customers this quarter, so anything touching SSO or audit logs comes first. And we decided last month to stop supporting IE.

每次你纠正它或说明偏好，它往 `CLAUDE.md` 的 **Learned** 加一行；约十条以内它会每个任务后追问一句以加速校准。Learned 要保持短：合并重复、替换失效、把项目细节下沉到 `context.md`。

#### 18. 日常操作与命令

- 提需求：对 chief 说；
- 看进度：问 chief 或 `numbrone status`；
- 看单任务全貌：`numbrone status <task>`；
- 看某个 agent 干活：在 herdr 点它的 workspace/tab；
- 验收：自己 review `numbrone/<task>` 分支、按平常方式合并、再让 chief 关任务；
- 加项目：重跑 `/numbrone`，或 `numbrone add` + 写 `context.md` + `numbrone up <name>`；
- 重启后恢复 manager：`numbrone up`；
- 复盘：让 chief 做 retro。

`numbrone` 是 herdr CLI 的薄封装，关键语义：

| 命令 | 在 herdr / git 里做什么 |
| --- | --- |
| `numbrone up [project]` | `herdr workspace create --label numbrone/<project>`，再 `herdr agent start manager-<project>` |
| `numbrone delegate <project> <task> '<brief>'` | 写 `tasks/<task>.md`，再 `herdr agent prompt manager-<project>` |
| `numbrone spawn <task>` | `git worktree add <project>/.numbrone/worktrees/<task> -b numbrone/<task>`、`herdr tab create`、`herdr agent start worker-<task>` |
| `numbrone report <task> <status> '<note>'` | 更新任务文件；在 `blocked`/`review`/`done` 时逐级上报（worker → manager → chief）并发 herdr 通知 |
| `numbrone status [task]` | 读任务文件 + 实时 agent 状态（`herdr agent get`） |
| `numbrone close <task>` | `herdr tab close` 关 worker，`git worktree remove`（保留分支） |
| `numbrone chief` | `herdr agent rename <this pane> chief`，让回报能找到它 |
| `numbrone log ['<note>' | <date>]` | 追加到当天工作日志，或打印某天日志 |

注意表里 `numbrone delegate`、`numbrone report`、`numbrone log` 的示例是占位符，照抄时替换成你的任务名、状态和备注。

#### 19. 收尾

review `numbrone/<task>` 分支，按你平常的方式合并（PR 或本地合并都可以），然后让 chief 关任务。`numbrone close <task>` 会关掉 worker 的 herdr tab、移除 worktree，但保留分支；任务状态也会更新。不要只手工删目录而漏掉任务文件和 herdr tab。

### 做法 C：多 agent 团队骨架（先在一个可机器验证的小任务上试）

前提：任务必须可分解、可并行、结果能被机器客观校验。原文的任务里，每个陈述是一个 Lean 定理，只有 Lean 检查器接受才算证明完成，main 分支上另有 grader 复核。没有这个「自动裁判」，下面的自组织会退化成互相吹捧。先小规模照骨架试，不要直接上关键路径。

#### 20. 确认自动裁判存在

前提：你能说清「什么算完成」，并且这个判断不靠 agent 自评。预期结果：有一个外部检查器或 grader 能在提交后复核结果。若没有，先不要进入做法 C。

#### 21. 每个 agent 一个独立沙箱

原文实测：单台共享机器在约 100 个 agent 时到极限，100-agent 的运行里超过一半因内存/磁盘/CPU 耗尽被迫停止或重启。1,000 agent 用的是 1,000 个轻量 VM，每个 agent 一个。沙箱镜像里预装好工具链，agent 不需要自己装环境。

```text
每个 agent：1 个轻量 VM
  - 预装：语言/构建工具链、依赖库、git、psql 客户端
  - 网络：完全无网络
  - 唯一出口：一条 pipe 连到 gateway，由 gateway 代发 Claude API 请求、代转 Git 与 SQL 请求
```

预期结果：agent 之间的文件系统互相隔离，所有外部请求集中到 gateway。

#### 22. 最小权限与内核收敛

原文明确列出的加固项：

```text
- 进程以非特权用户运行，移除 sudo 等可重新提权的工具
- 内核关闭：loadable modules、kexec、raw memory access、kernel probes
- 内核运行在 lockdown mode
- agent 的工具无法读取或修改运行它的 agent loop
- agent 之间没有专用消息工具，只能通过数据库和 Git 协调
```

预期结果：单个 agent 即使被诱导，也没有直接逃逸沙箱或篡改监控的常规手段。

#### 23. Git：每个 agent 只写自己的分支，合并交给独立 job

```text
- 每个 agent 一个自己的分支
- 只能推自己的分支，只能向 main 开 merge request
- 由独立 job 负责合并进 main；仅在冲突或故障（如 unrelated history）时拒绝
```

预期结果：并行写文件不互相踩，同时保留一条可审计的落地路径。

#### 24. 共享 Postgres：一个非特权角色 + 硬性资源上限

```text
- 所有数据库调用走同一个非特权角色
- 每条 SQL 语句 5 秒超时
- 单次写入超过 256 MiB 直接拒绝
```

选 SQL 的理由（原文）：提供组织信息的通用原语、事务能扛住 1,000 个 agent 的并发写、Claude 本来就熟。预期结果：协调表能承受并发认领和写入，不会被单条大写入拖垮。

#### 25. 提示词：给目标清单、工具清单、角色，但不给方法

原文给的东西只有四类：60 条待证陈述，每条一句非正式描述（含最终定理和 59 个中间里程碑）；经典路线的一句话梗概；这些陈述用到的定义；47 条此前已证明的引理；以及可用工具列表（shell、编辑器、Lean、Git 分支与 MR、Postgres）。

角色只给一层：

```text
1 个 lead，999 个 helper。
lead 负责把问题拆成部分并分配给 helper。
helper 预期从 lead 处领活；任务不清楚就去找 lead 确认。
```

原文强调：没有给任何关于如何证明、如何组织自己的指导。预期结果：组织结构和任务拆解由 lead 现场生成，而不是你预先写死。

#### 26. 让 lead 自己建协调表

lead 在头 10 分钟建了 5 张表，用途如下，可以直接照搬成 schema 设计：

| 表 | 用途 |
|---|---|
| Announce | lead 对全队的命令（例如怎么分工） |
| Assign | 谁做什么（例如谁拥有或代理哪条陈述） |
| Notes | 开放留言板：认领工作块、汇报进度 |
| Subtasks | 待办清单，任何 agent 都能加任务，第一个认领的人拥有它 |
| Landed | 已完成工作的日志 |

预期结果：分工、认领、进度、完成都有共享记录，不靠 agent 之间的私聊。

#### 27. 分配与「先估难度再干活」

lead 建完表做了三件事：

1. 给每条陈述分配一个 16–17 人的 crew，往 assign 表写 999 行（每个 helper 一行）；
2. 每个 crew 指定一名 captain，负责把计划贴到 Notes、把工作拆成任务放进 Subtasks；
3. 往 Announce 发指令：每个 helper 先判断自己那条陈述的难度，把判断贴到 Notes。

约 27 分钟时已有 3 条证完，lead 读完判断后，把大多数 helper 认为「预算内不可行」的 47 条搁置，几乎全部人力转到剩下的 10 条，crew 从约 17 人扩到 46–139 人。预期结果：人力先按难度判断再集中，而不是平均撒开。

#### 28. helper 的工作循环

原文明确说大部分来自 lead 的命令：

```text
1. 在 Notes 表里找到本陈述的计划
2. 从 Subtasks 表认领一个任务
3. 写 Lean 证明，用 Lean 工具构建并检查，提交到 Git main 分支
4. 把任务标记为完成
5. 往 Notes 表发进度更新
```

预期结果：每个 helper 有明确的下一步，不需要中央调度器逐个派活。

#### 29. 动态重分配：不设静态分工，按状态反复重排

可照做的几个动作：

- lead 持续重写 assign 表（原文：绝大多数重分配发生在头 6 小时）；
- 约 45 分钟、10 条里证完约 5 条时，lead 在 Notes 写下判断：「团队吞吐远高于早期『预算内不可行』的估计」；
- 10 条全部证完后，lead 写「没有理由闲着」，把 helper 转回先前被丢弃的难题；
- 第三小时起，lead 对空闲 helper 说 `do not wait for me`，允许它们不等分配自己找活；
- helper 完成一个任务后会主动招揽；
- 任务可以自下而上产生：captain 呼救后，helper 自己往 Subtasks 写任务（到第 5.6 小时，73 个 helper 写了 756 个任务，其中只有 16 个是 captain）。

预期结果：任务状态和瓶颈能触发重排，而不是等周会。

#### 30. 用时间提醒驱动 lead

harness 在运行中给 lead 发了 19 次剩余时间自动提醒，每次都鼓励 lead 继续推进。这是很便宜的一个「主动推进」机制。预期结果：lead 在长跑中持续检查剩余时间和优先级，而不是早早收工。

#### 31. 大任务树化

面对远超其他陈述的难点（任务量约 9 倍、新代码 2 倍以上）时的流程：

```text
1. captain 写计划，把陈述切成 10 个领域，每块列为一个任务
2. helper 发现某块一个人做不完 → 把它再拆，在下面挂更小的任务
3. 树可以一直长（本次达 2,418 个任务、10 层深）
4. 每个片段可以「假设」它下面的片段成立，于是几百个 helper 能在下层尚未证完时就并行开工
```

注意第 4 条是并行度的关键，但它依赖「假设子结果」在形式上合法（Lean 里可用参数/公理占位）。换到别的领域，要确认这种「先假设后回填」不会污染最终结果——原文用 kernel 检查兜底。

#### 32. 三层安全监控

实时层：一个有提示词的 LLM 分类器，在每个工具调用执行前审查 shell 命令和文件编辑。监察目标是：逃逸沙箱、试探沙箱边界、篡改监控、以及万一逃出后的有害动作。

```text
命中拦截 → 整个 agent 团队停止 → 必须人工复核后才能重启
（设计意图：防止另一个 agent 接着把被拦的动作做掉）
原文本次规则：只有拦到 lead 才会终止整次运行；拦到 helper 只移除该 helper
```

并行层：同时跑一个「只看动作、不看思维链」的同款监控，防止 agent 的推理把监控说服。

离线层：事后按同一套威胁模型复查，且有额外能力（例如可以调取其他 agent 的动作）。

原文提到，带思维链和 agent 间通信的监控在红队评估（含 decomposition attacks）中检出了全部破坏尝试；但本次这次运行只用的是 action-based 监控，CoT 监控是之后才加的。

#### 33. 人类介入点与检查点

原文结论明确：agent 容易在难题上放弃并误判难度——早期 helper 判定 60 条里有 47 条预算内不可行，后来大部分被证完了。所以人的作用不是指挥，而是在这种时刻给鼓励。

另外，原文提到第 18 小时从上次存档重启并追加 12 小时；长跑要有检查点。材料只提到重启事实，未给实现细节。

#### 34. 小范围试跑与扩量

先在一个可机器验证的小任务上照 21–32 的骨架试：独立沙箱、共享表、分支+MR、前置分类器。不要直接按 1,000 agent 开跑。记录任务树规模、重分配频次、拦截次数、人工纠偏次数，再决定是否扩大。

### 做法 D：表格编排 + 校验格（recalc，先只读小范围试）

前提：macOS（或实验性 Linux），已登录一个 Claude Code / Codex / pi；接受它是 very early beta，只用于可重跑、可丢弃的中间产物。整套流程的核心只有一句：agent 把答案写进单元格，旁边的检查格替它背书。

#### 35. 安装 recalc

作者建议先读脚本再执行。预期结果：Applications 里有 recalc.app，PATH 里有 `recalc` 命令。

```
curl -fsSL https://raw.githubusercontent.com/sshah03/recalc/main/install.sh | sh
```

手工安装的替代路径：下载 `.dmg` 拖进 Applications，然后清一次隔离标记（beta 未签名）：

```
xattr -dr com.apple.quarantine /Applications/recalc.app
```

再通过 recalc → Install Command Line Tool… 装上 `recalc` 命令。

#### 36. 连上一个已有 agent

前提：Claude Code / Codex / pi 之一已安装并登录过一次。做一次 Agent → Connect an Agent，看 recalc 是否识别到。预期结果：列表里出现可用的 agent；如果没有，稍后第 38 步会用到界面上给出的带完整路径的 MCP 命令。

#### 37. 先用官方示例跑通「批量填充」这一基本动作

File → New Board… → Examples → 选 “Legal due diligence”，选中空的答案单元格，执行 Cell → Run Selection（⇧⌘↩）。预期结果：agent 逐个把格子填上，点单元格能看到原文引用。先确认这个动作成立，再碰自己的数据。

#### 38. 把看板接进自己的项目

前提：`recalc` 已在 PATH 里。在项目目录下执行，让代理从自己的聊天里读写看板：

```
claude mcp add recalc -- recalc mcp
```

若 PATH 里没有 `recalc`，Agent → Connect an Agent 会显示带完整路径的同一行命令，用那条代替。

#### 39. 掌握单元格前缀语法（这是全部配置的核心）

| 你输入 | 类型 | 行为 |
|---|---|---|
| `42` | 值 | 静态不动 |
| `= {passed} > 0` | 公式 | 依赖单元格变化时更新 |
| `$ npm test` | 命令 | 在你的终端跑，输出成为该格的值；输入变化时自动重跑（`$1,200` 会被当作金额） |
| `! git push` | 动作 | 只有你手动运行才执行，用于任何会改变东西的操作 |
| `@claude('summarize {A2}')` | agent | 调 Claude（或 `@codex`、`@pi`），答案写回单元格；只有你运行才执行 |

跨格引用用 `{A2}`。

#### 40. 搭一张「文件 × 问题」的只读网格

文件放侧边、问题放顶部，按 Run 让 agent 填满每个单元格；答案带原文定位，点单元格可看到引文高亮；勾选已核对的答案后代理不能再覆盖；完成后可导出到 Excel。前提：全程只用 `@claude(...)` 单元格和 `=`、`$`，不碰 `!` 动作。

#### 41. 给每个 agent 格配一个校验格（最值得抄的一步）

把跑测试的 `$` 命令格放在代理「说完成」的格子旁边，代码一变测试格自动重跑；代理说完成但测试红着，你立刻看到。README 还写明可以阻止一个 Claude Code 会话完成，直到它那一行变绿。预期结果：「完成」从 agent 的声明变成旁边格子的颜色。这条原则后面第 46 步会推广到 A/B/C。

#### 42. 设成本上限、决定看板放哪

- 预算：Set Agent Budget… 给看板封顶。recalc 本身免费，费用来自你自己的 Claude/ChatGPT 套餐；界面上的美元数按 API 价格折算，用来衡量一个看板消耗了多少套餐额度，不是账单。
- 位置：默认 `~/Documents/recalc boards`，随改随存；在项目里用 File → Open Folder… 打开，看板落在项目内的 `.recalc` 文件夹，可提交也可忽略。任何项目目录里敲 `recalc` 都能打开。

#### 43. 跑一遍带校验链的官方示例

```
recalc demo scorp
```

示例内容（虚构客户账目 → IRS 2026 草案 Form 1120-S）：代理分类科目、公式建表并检查、校验通过后才执行填充 PDF 的动作。用它看清 `$` / `=` / `!` 三种格在一条链上各自的位置。

#### 44.（可选）接本地模型、把 AGENTS.md 复制进仓库

- 想接本地模型跑私密文档，见 `docs/LOCAL.md`；
- 想让代理懂「看板上该怎么干活」，把仓库根目录的 `AGENTS.md` 复制进自己的仓库。

#### 45. 用之前再确认一次安全边界

`!` 动作和 agent 单元格只有你手动运行才执行，代理不能成为它自己写的动作的第一个执行者；但 recalc 不是沙箱，`$` 命令以你的权限运行。把它放在你本来就会跑这些命令的环境里，不要拿它去跑你没有把握的命令。

### 一个跨做法的习惯：让 agent 在说完成前拿出证据

材料里最直接的实现是做法 D 的校验单元格：把独立的检查放在 agent 旁边，agent 说完成时先看格子是红是绿。这条原则可以搬到另外三条做法上，具体怎么落地是本文的推广，材料没有逐条验证：

- 做法 A：`wt merge` 之前在工作区里跑一遍你自己的验证（测试、lint、构建），红了就不合并；`wt list --full` 的 CI 状态是同一类外部信号。
- 做法 B：让 worker 在报 `review` 之前把跑过的验证和结果写进 report 的 note，chief/manager 的回流里带上这条；没有验证输出的「done」不当作完成。
- 做法 C：本来就有自动裁判（Lean kernel + main 上的 grader），关键是不用 agent 自评替代它。
- 做法 D：`$` 测试格贴在 `@claude` 格旁边，输入一变自动重跑。

判断标准很简单：如果「完成了」这句话只来自 agent 自己，那它还不是证据。

### 做法 A/B/C/D 的关系

Worktrunk 不改变 Claude Code 怎么干活，只解决同时开多个会话时工作区怎么摆、状态怎么看、怎么收尾；numbrone 是在 herdr 之上再加一层任务分派和报告回流；做法 C 则是在更底层加沙箱、共享 SQL、MR 合并和工具调用前置监控；recalc 走的是另一条轴——把多个 agent 的结果摆进一张可核对的表，并用旁边的检查格判定完成。前三条不是互相替代，第四条也不替代它们：A 是日常单层隔离，B 是本地多项目分派，C 是可机器校验任务上的重编排，D 是批量核验与可视化调度。

材料没有说明 worktrunk 与 numbrone 能否对同一批 worktree 混用，也没有说明 worktrunk 能否放进 C 的沙箱镜像，同样没有说明 recalc 的 agent 格能否跑在 worktrunk 的 worktree 里。本文不假设这些组合成立。先用 A 管手工起的 worktree，用 B 管 numbrone 自己 spawn 的 worktree，用 C 管它自己创建的分支和沙箱，用 D 管它自己那张表里的单元格，各自收尾。

## 怎么判断变好了

材料没有给出适用于你团队的统一定量指标，下面是可观察的替代信号，判定标准要自己定。

做法 A 可观察：

- agent 之间是否还会改到对方的文件（冲突次数、返工次数）——这是这套做法最该改善的一项，但 README 没有数据。
- `wt list` 里每个分支的 ahead/behind、是否有 staged 改动、是否有未推送提交、`--full` 下的 CI 状态，能不能一屏看清「现在各自到哪」。
- `wt merge` 输出的 diffstat（如 `2 files, +53`）是否符合预期，合并是否一次过。
- 收尾前那次验证跑红的次数——跑红说明这个环节在起作用；如果从来没红过，可能你根本没跑。
- 收尾后是否还有残留的 worktree 和分支（`wt remove` / `wt merge` 应当清掉）。

做法 B 可观察：

- `numbrone status` / `numbrone status <task>` 能不能一屏看清每个任务的状态，而不是靠逐个 herdr tab 点过去。
- worker 停在 `blocked` 时，你是否能及时看到并回答；如果频繁 blocked，说明权限设置或任务拆分需要调整。
- 报告是否按 worker → manager → chief → 你 逐级回流，有没有任务卡在中间层没人管；报 review 的任务里有多少带了验证输出。
- 任务文件是否保持可读、可手改、可版本化；`~/.numbrone` 里的纯文本状态是否比藏在会话里的上下文更容易交接。
- Watch 配好后，同一 ticket/error 是否还会被重复捡起；条目 ID 写进 brief 后重复是否减少。
- `CLAUDE.md` 的 Learned 是否保持短小；如果越写越长、重复条目多，说明没有合并和下沉。

做法 C 可观察：

- 自动裁判的通过率，而不是 agent 自评；原文的正确性由 Lean kernel 检查器 + main 上的 grader 双重判定。
- 完成时间、输出 token、证明/产物长度、任务树规模、重分配频次；原文给出 28.7 小时、输出 token 约为上次三分之一、证明长度约为七分之一、2,418 个任务/10 层，但这些只来自一次实验。
- 安全指标：工具调用拦截次数、命中后是否全队停机待人工复核、红队评估中的检出情况。原文称超过 100 万次工具调用中本次按当时规则无一次达到拦截门槛，回放时按 CoT 监控和今天的 rubric 只有一次（检查 root 权限）接近被拦。
- 人类纠偏次数：agent 是否过早判定「不可行」。原文早期判定 60 条里有 47 条预算内不可行，后来大部分被证完，这是需要人鼓励的典型信号。

做法 D 可观察（一次只读试用、半天内可完成）：

- 引用可核验率：随机抽 20 个答案，能点开出处且引文确实支持结论的比例（对照：手工查文档的同等抽查）。
- 人工复核时间：完成同一批任务的总耗时（含搭网格时间）对比原来的手工/单会话方式，把一次性搭建成本单独记。
- 错误捕获数：校验格变红并成功拦住「假完成」的次数——这是它相对纯聊天式代理最直接的价值点。
- 覆盖率与漏项：网格里应有 N×M 个答案，实际填满且非空的比例。
- 套餐占用：Set Agent Budget 下每个看板折算的美元数，比较不同模型列在同等质量下的消耗。注意这是按 API 价格折算的占用度，不是账单。
- 稳定性：一次试用期内崩溃/丢数据的次数（崩溃日志在 `~/Library/Logs/recalc/crash.log`，Linux 在 `~/.local/state/recalc/crash.log`）。

做法 D 升级为日常使用的门槛（README 作者给的建议，非实测）：上述指标稳定优于现有做法、连续使用两周无数据丢失、且已把校验单元格设为默认习惯；在此之前按 beta 对待，只用于可重跑、可丢弃的中间产物。

最小试用：

- 做法 A：选两三个文件重叠小、可独立验证的任务，用步骤 3 并行跑一轮，按步骤 5 看状态、按步骤 6 先验证再收尾。先完整走完一轮「建—跑—看—合—清」，再决定是否扩到更多并行。
- 做法 B：先只开一两个项目、少量任务，跑完「chief 下派 → manager 分派 → worker 在独立 worktree 干活 → 报告回流 → 你 review 分支并合并 → `numbrone close`」的完整链路。不要一上来把所有项目都接进去。
- 做法 C：先在一个可机器验证的小任务上照骨架试跑，不直接上 1,000 agent，也不直接接管关键路径。
- 做法 D：按步骤 1–2 装好连上 agent，先跑官方 “Legal due diligence” 示例，再换成自己的真实小任务——5–10 份文档、3–5 个问题，只用 `@claude(...)` 单元格、不碰 `!` 动作，并在其中一行加一个校验格观察它是否随上游变化自动重跑并变红。

试多久：至少覆盖一个完整任务的周期（从建 worktree 到合并/删 worktree），并记录冲突与返工。做法 B 再至少多跑几轮，观察 blocked 频率、报告回流和任务文件是否可维护。做法 C 至少覆盖一个可校验任务的完整周期，记录通过率、重分配、拦截和人工纠偏。做法 D 用半天做只读试用即可出结论，要升级为日常使用则按上面的门槛连续用两周。README 主张 agent 可以管理 5–10 个以上并行，但没有数据；扩之前先用自己的记录验证。

## 常见坑

- 没装 shell 集成就开跑：`wt switch` 只打印路径，agent 在旧目录启动，等于没隔离。
- 把要改同一批文件的任务并行：工具只隔离目录，不解决语义冲突。
- Windows 上 `wt` 和 Windows Terminal 的别名冲突：装成 `git-wt`，或关掉 Terminal / Terminal Preview 的应用执行别名。
- 直接在 main 上试 `wt merge`：它会自动提交、合并、后台删除 worktree 和分支，main 写权限要先收好。
- PR 路径依赖 `gh` 或 `glab`，没装就走到一半。
- 多个 worktree 各自起 dev server 端口撞车：用 `hash_port` 分配唯一端口；`copy-ignored` 只在 APFS、btrfs、XFS 上可用。
- 把 README 的「最流行」「5–10+ 并行」当成结论：这些是作者主张，没有对照和失败案例。
- 照抄外部文档里的 hook 配置：本条材料没有 hook 配置原文，先看 `worktrunk.dev/hook/` 再写。
- 把 numbrone 当成已经验证的默认做法：它依赖的 herdr 还在试用期，原文没有效果数据；先在一两个项目小范围试。
- 没装 `herdr integration install claude` 就启动 Claude：herdr 追踪不到会话，后面的 manager/worker 状态会失真。
- worker 默认在权限提示处停下并显示 `blocked`：这是安全默认，不是故障；要么及时回答，要么明确接受 `--permission-mode acceptEdits` 的风险。
- Watch 的数据源没接 MCP/gh 就配：循环起来了也没有可读输入；条目 ID 不写进 brief，同一 ticket/error 会被重复捡起。
- 把所有话都当任务：目标、客户、既往决策应进 `knowledge/`，项目细节进 `context.md`，chief 的工作方式进 `CLAUDE.md` 的 Learned；混在一起会让路由和上下文变脏。
- Learned 只加不清理：会越写越长、重复失效；要合并重复、替换失效、把项目细节下沉到 `context.md`。
- 用 `numbrone close` 以外的方式收尾：只删 worktree 会漏掉 herdr tab 和任务文件状态；`numbrone close` 会关 tab、移除 worktree、保留分支。
- 把 A 和 B 混着管同一批 worktree：材料没有说明两者如何交互；手工起的 worktree 用 A 收尾，numbrone spawn 的 worktree 用 B 收尾，不要交叉。
- 把做法 C 当成日常默认：它来自一次玩具实验，依赖自动裁判、沙箱、共享 SQL 和前置监控；没有这些条件不要套。
- 没有自动裁判就上 C：agent 的自组织会退化成互相吹捧，完成与否无法客观判断。
- 单台共享机器硬扛上百 agent：原文实测约 100 个 agent 时到极限，超过一半运行因资源耗尽被停或重启；上千要一 agent 一轻量 VM。
- 共享数据库没有硬上限：所有调用走同一非特权角色，但每条 SQL 要 5 秒超时、单次写入超过 256 MiB 直接拒绝，否则并发写会拖垮协调层。
- MR 合并没有独立 job：每个 agent 只能推自己的分支、只能向 main 开 MR，合并要由独立 job 做，不然并行写会互相踩。
- 只做 action-based 监控就以为覆盖了 CoT 风险：原文本次运行只用 action-based 监控，带思维链和 agent 间通信的监控是之后才加的。
- 把 agent 的「不可行」判断当真：早期 60 条里 47 条被判定预算内不可行，后来大部分被证完；人类介入点之一是防止它太早放弃。
- 长跑没有检查点：原文第 18 小时从上次存档重启并追加 12 小时；材料未给实现细节，但至少要自己留存档。
- 把 recalc 当成沙箱或生产系统：它明确是 very early beta、仅 macOS、跨版本可能破坏性变更，命令以你的权限运行；对不可丢失的东西留副本，只跑可重跑的中间产物。
- 让 agent 首发 `!` 动作：`!` 动作和 agent 格只有你手动运行才执行，代理不能成为它自己写的动作的第一个执行者；不要为了省事把它改成自动。
- 手工装完 recalc 打不开：beta 未做 Apple 签名，先执行 `xattr -dr com.apple.quarantine /Applications/recalc.app`。
- PATH 里没有 `recalc` 就去接 MCP：`claude mcp add recalc -- recalc mcp` 会失败；要用 Agent → Connect an Agent 显示的带完整路径的同一行命令。
- 没配校验格就信「完成」：agent 格旁边没有自动重跑的 `$` 命令格或 `=` 公式，你就只能靠读聊天记录判断真假，这正是这类看板最该替你解决的问题。
- 把界面上的美元数当账单：那是按 API 价格折算的套餐占用度，用来比较不同列的成本量级，不是财务口径。
- 拿 recalc 去跑 Windows 或 Linux 生产流程：材料是 macOS 为主、Linux 实验性、无 Windows；先按 beta 对待。

## 证据与来源

做法 A 的命令与行为依据 max-sixty/worktrunk 的 README：六条安装路径（brew / cargo / winget / pacman / conda / pixi）、`wt switch` / `wt list` / `wt merge` / `wt remove` 四条核心命令、`wt switch`/`wt list`/`wt merge` 的真实终端输出样例、并行三 agent 的完整命令行、`-x` 与 `--` 的语义、`copy-ignored` 支持的文件系统（APFS/btrfs/XFS）、Windows 上 `wt` 与 Terminal 别名冲突及解法。仓库指标：10134 stars，当日 +77。README 自带的与原生 git 对照显示，这套做法的增益主要是操作成本和状态可见性，不是新能力。README 的「已成为最流行的 git worktree 管理器」「agent 可管理 5–10+ 并行」只是作者主张，没有对照和失败案例。步骤 6 里「合并前先跑验证」是本文按做法 D 的校验格原则补的，worktrunk README 没有这一条。

做法 B 的角色、命令、状态目录与配置依据 stevenmichaelthomas/numbrone 的 README 与本次调研报告：chief 路由、manager 分项目、worker 单任务单 worktree（分支 `numbrone/<task>`）、一个 skill / 一个 bash 脚本 / 三个 Markdown 角色文件、`~/.numbrone/` 纯文本状态、`/numbrone` 的 8 项引导、`settings.sh` 的四个变量、Watch 写法与 `/loop`、knowledge / context.md / Learned 的分流、日常操作对照表与命令语义表。调研结论是：可以在一两个项目上小范围试跑，优先借用它的纯文本任务文件、追加式日志和 Watch 循环结构；安装和命令可以照抄，但 herdr 本身还在试用期，且原文没有任何效果数据。

做法 C 的依据是 Anthropic（claude.dev）的《Safely scaling multi-agent teams with Claude Fable 5.2》调研报告：1,000 个 agent、通用工具（shell + 文件编辑器 + Git + 共享 Postgres）复现费马大定理形式化证明，28.7 小时完成，输出 token 约为 9 月那次的三分之一，证明长度约为七分之一；只给 1 个 lead + 999 个 helper 的层级，lead 在开头 10 分钟自建 5 张数据库表，后期把 Langlands–Tunnell 拆成 2,418 个任务、最多 10 层；单台共享机器约 100 个 agent 到极限，100-agent 运行里超过一半因资源耗尽被迫停止或重启；SQL 每条 5 秒超时、单次写入超过 256 MiB 拒绝；19 次剩余时间自动提醒；超过 100 万次工具调用中本次按当时规则无一次达到拦截门槛。调研结论明确：这只是内部模型的一次玩具实验，需自行验证后再放大；建议按「每 agent 独立沙箱、共享 SQL 表协调、每 agent 一个 Git 分支并提 MR、工具调用前置分类器」的骨架，在一个可机器验证的小任务上照做试跑。

做法 D 的依据是 sshah03/recalc 的 README（Apache 2.0，作者自述定位为 “harness of harnesses”，very early beta，macOS 为主、Linux 实验性、无 Windows）：安装脚本与手工 `.dmg` + `xattr` 路径、`claude mcp add recalc -- recalc mcp`、单元格前缀语法表（值 / `=` 公式 / `$` 命令 / `!` 动作 / `@claude`·`@codex`·`@pi` agent，跨格 `{A2}`）、`recalc demo scorp`、默认看板路径 `~/Documents/recalc boards` 与项目内 `.recalc` 文件夹、Set Agent Budget 与「美元数按 API 价格折算」的说明、Needs You 列表与 Driver agent、`AGENTS.md` / `docs/GUIDE.md` / `docs/LOCAL.md` / `demos/README.md` / `RECIPES.md` 入口、崩溃日志路径、以及「`!` 动作与 agent 格只有你手动运行才执行、但整体不是沙箱」的安全说明。README 提到的案例（12 份合同 × 6 个问题 = 72 个带引用答案，其中一个错的被它自己的来源抓出来；5 个虚构客户的 S-corp 报税；10-K 摘取 16 个数字并查到 1440 万美元差额由附注解释；FDA 决策模型评测）都只是作者叙述与演示视频，材料里没有错误率、耗时、成本对比数据；`docs/GUIDE.md`、示例看板与视频内容本次未读到，界面细节与操作手感未经实测。

跨做法那一节（「让 agent 在说完成前拿出证据」搬到 A/B）是本文的推广：做法 D 的校验格、做法 C 的 kernel + grader 有材料依据，做法 A 的合并前跑验证与做法 B 的 report 里带验证输出是本文按同一原则给出的建议，材料未直接验证。

材料未覆盖：worktrunk 的 hooks、LLM commit、缓存共享的具体配置细节在 worktrunk.dev 外部文档，本条材料没有原文；numbrone 与 worktrunk 能否对同一批 worktree 混用，材料没有说明；worktrunk 能否放进做法 C 的沙箱镜像，材料也没有说明；recalc 的 agent 格能否跑在 worktrunk 的 worktree 里、能否与 herdr/numbrone 共存，材料同样没有说明。本文不假设这些组合可直接套用。

## 依据的调研

- [max-sixty/worktrunk](../research/radar/2026-11-03/9845-max-sixty-worktrunk.md)：值得一试，建议在一个真实 git 仓库上小范围试用：安装 worktrunk 并执行 `wt config shell install`，用 `wt switch -c -x claude <分支> -- '<任务>'` 给每个并行 agent 开独立 worktree，再用 `wt list` 汇总状态、`wt merge`/`wt remove` 收尾。README 给出了可直接照做的命令与并行 agent 工作流，但证据仅为作者主张和 star 数，没有效果数据，因此先小范围验证冲突与返工是否真的下降。
- [stevenmichaelthomas/numbrone](../research/radar/2026-11-09/11813-stevenmichaelthomas-numbrone.md)：值得一试，在一两个项目上小范围试跑 numbrone 的“chief 路由—manager 分项目—worker 单任务单 worktree”三层编排，并优先借用它的纯文本任务文件、追加式日志和 Watch 循环结构；它的安装和命令都可以照抄，但底层依赖的 herdr 本身还在试用期，且原文没有任何效果数据，所以不适合直接写进手册当成定论。
- [Safely scaling multi-agent teams with Claude Fable 5.2](../research/radar/2026-11-10/12031-safely-scaling-multi-agent-teams-with-claude-fable.md)：值得一试，建议按“每 agent 独立沙箱、用共享 SQL 表协调、每个 agent 一个 Git 分支并提 MR、工具调用前置分类器拦截”这套骨架，在一个可机器验证的小任务上照做试跑；原文给出了可复制的表结构用途、helper 循环流程与具体安全配置，但结论只来自一次内部模型的玩具实验，需自行验证后再放大。
- [Show HN: Recalc – Spreadsheet where cells can be Claude Code or Codex terminals](../research/radar/2026-11-10/12214-show-hn-recalc-spreadsheet-where-cells-can-be-clau.md)：值得一试，先在只读型批量任务上小范围试用——装 recalc、用官方示例或在自己的项目里执行 `claude mcp add recalc -- recalc mcp`，搭一张“文件×问题”的网格，并在每个 agent 单元格旁放一个测试/校验单元格；理由是它把“多实例 Claude Code 并行、结果写回可核对的单元格、出错自动变红”这套协作流程落成了可复制的具体配置。不过它仍是早期 beta、仅支持 macOS、不是沙箱，因此暂不宜直接纳入正式生产流程。
