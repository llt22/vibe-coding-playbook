# 同时开多个编码 agent：一个任务一个工作区，任务多了再加一层编排

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多个编码 agent 并行时会互相改文件、状态看不清、收尾容易漏；任务跨项目多起来后，还需要知道谁在做什么、报告怎么回流。
> 先试这一步：先在一个真实仓库里装好 worktrunk 和 shell 集成，选两三个文件重叠小、可独立验证的任务，各建一个 worktree 并行跑一轮，完整走完建—跑—看—合—清。
> 最近修订：2026-11-09

## 解决什么问题

多个编码 agent 并行时，如果都在同一个工作目录里跑，会互相改文件；原生 git worktree 的创建、切换、查看、收尾又太笨，任务一多就不知道谁在哪、各自到哪一步。任务跨项目多起来后，还会多一层问题：需求该派给谁、worker 的报告往哪回流、哪些输入源可以自动触发任务。这篇手册先把「一个任务 = 一个 worktree = 一个 agent 会话」做成日常可维护的流程（建、跑、看、收），再给出任务多到自己盯不住时可选的「chief—manager—worker」三层编排做法，并标明后者的试用边界。

## 适用与不适用

适用：

- 已有 git 仓库，要并行跑的是可以在终端启动的 CLI agent（材料以 Claude Code 为例，也提到 Codex、Gemini、OpenCode 等）。
- 任务彼此文件重叠小、可独立验证：材料里的示例是「加用户认证 / 修分页 bug / 为 API 写测试」。
- macOS / Linux；Windows 与 Arch、conda 另有 worktrunk 安装路径（见做法 A 步骤 1）。
- 任务跨多个项目、多到自己盯不过来，且愿意接受 herdr 还在试用期时，再考虑做法 B 的三层编排。

不适用：

- 需要改同一批文件的重构，不适合按这套方式并行；冲突不会因为换了工具就消失。
- 材料只是项目 README（带宣传性质），没有任何性能、冲突率、返工率、耗时数据；不要把它当成「并行一定更快」的证明。
- worktrunk 的 hooks、LLM commit、缓存共享的具体配置细节在 worktrunk.dev 外部文档，本条材料没有给出原文，本文不编造这些配置。
- numbrone 依赖的 herdr 本身还在试用期，原文也没有效果数据；不要把三层编排当成已经验证的默认做法，更不要直接放到关键路径上。
- numbrone 的前置是 macOS 或 Linux；Windows 走不通这条路径（材料未给 Windows 做法）。

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

## 操作步骤

### 先选做法

做法 A：单层 worktree（worktrunk）。适合 1–3 个并行、任务边界清楚、自己盯得住，只需要「目录隔离 + 状态可见 + 收尾干净」。建议所有人先走这条，完整跑一轮。

做法 B：三层编排（numbrone）。适合项目多、任务多、需要把需求分派给不同项目、需要 worker → manager → chief → 你的报告回流，或者想把 Linear、Sentry 之类输入源变成触发事件。底层仍然是每个 worker 一个 herdr tab + 一个独立 git worktree（分支 `numbrone/<task>`），但多了一层角色和纯文本任务状态。

怎么选：先用 A 跑通；当你每天并行数超过自己能盯的范围，或者任务已经跨项目、跨输入源，再小范围试 B。材料对 B 的结论是「在一两个项目上小范围试跑」，不是直接推广。

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

#### 6. 收尾：两条路径二选一

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
AGENT_ARGUMENTS=""      # extra arguments for the agent
BASE_BRANCH=""          # branch new worktrees start from ("" = project's current HEAD)
PING_CHIEF=1            # 0 = don't type reports into the chief; just log and notify
```

想减少权限打断（原文示例，需自行权衡风险）：

```bash
AGENT_ARGUMENTS="--permission-mode acceptEdits"
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
- Linear: new issues in team ENG labelled "agent", every 15 minutes
- Sentry: new unresolved issues in project "api", every 30 minutes
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
| `numbrone delegate <project> <task> "<brief>"` | 写 `tasks/<task>.md`，再 `herdr agent prompt manager-<project>` |
| `numbrone spawn <task>` | `git worktree add <project>/.numbrone/worktrees/<task> -b numbrone/<task>`、`herdr tab create`、`herdr agent start worker-<task>` |
| `numbrone report <task> <status> "<note>"` | 更新任务文件；在 `blocked`/`review`/`done` 时逐级上报（worker → manager → chief）并发 herdr 通知 |
| `numbrone status [task]` | 读任务文件 + 实时 agent 状态（`herdr agent get`） |
| `numbrone close <task>` | `herdr tab close` 关 worker，`git worktree remove`（保留分支） |
| `numbrone chief` | `herdr agent rename <this pane> chief`，让回报能找到它 |
| `numbrone log ["<note>" \| <date>]` | 追加到当天工作日志，或打印某天日志 |

注意表里 `numbrone delegate`、`numbrone report`、`numbrone log` 的示例含双引号占位符，照抄时替换成你的任务名、状态和备注。

#### 19. 收尾

review `numbrone/<task>` 分支，按你平常的方式合并（PR 或本地合并都可以），然后让 chief 关任务。`numbrone close <task>` 会关掉 worker 的 herdr tab、移除 worktree，但保留分支；任务状态也会更新。不要只手工删目录而漏掉任务文件和 herdr tab。

### 做法 A 与做法 B 的关系

Worktrunk 不改变 Claude Code 怎么干活，只解决同时开多个会话时工作区怎么摆、状态怎么看、怎么收尾；numbrone 则是在 herdr 之上再加一层任务分派和报告回流。两者是互补，不是替代。材料没有说明两者能否对同一批 worktree 混用，本文不假设；先用 A 管手工起的 worktree，用 B 管 numbrone 自己 spawn 的 worktree，各自收尾。

## 怎么判断变好了

材料没有给出任何效果指标，下面是可观察的替代信号，判定标准要自己定。

做法 A 可观察：

- agent 之间是否还会改到对方的文件（冲突次数、返工次数）——这是这套做法最该改善的一项，但 README 没有数据。
- `wt list` 里每个分支的 ahead/behind、是否有 staged 改动、是否有未推送提交、`--full` 下的 CI 状态，能不能一屏看清「现在各自到哪」。
- `wt merge` 输出的 diffstat（如 `2 files, +53`）是否符合预期，合并是否一次过。
- 收尾后是否还有残留的 worktree 和分支（`wt remove` / `wt merge` 应当清掉）。

做法 B 可观察：

- `numbrone status` / `numbrone status <task>` 能不能一屏看清每个任务的状态，而不是靠逐个 herdr tab 点过去。
- worker 停在 `blocked` 时，你是否能及时看到并回答；如果频繁 blocked，说明权限设置或任务拆分需要调整。
- 报告是否按 worker → manager → chief → 你 逐级回流，有没有任务卡在中间层没人管。
- 任务文件是否保持可读、可手改、可版本化；`~/.numbrone` 里的纯文本状态是否比藏在会话里的上下文更容易交接。
- Watch 配好后，同一 ticket/error 是否还会被重复捡起；条目 ID 写进 brief 后重复是否减少。
- `CLAUDE.md` 的 Learned 是否保持短小；如果越写越长、重复条目多，说明没有合并和下沉。

最小试用：

- 做法 A：选两三个文件重叠小、可独立验证的任务，用步骤 3 并行跑一轮，按步骤 5 看状态、按步骤 6 收尾。先完整走完一轮「建—跑—看—合—清」，再决定是否扩到更多并行。
- 做法 B：先只开一两个项目、少量任务，跑完「chief 下派 → manager 分派 → worker 在独立 worktree 干活 → 报告回流 → 你 review 分支并合并 → `numbrone close`」的完整链路。不要一上来把所有项目都接进去。

试多久：至少覆盖一个完整任务的周期（从建 worktree 到合并/删 worktree），并记录冲突与返工。做法 B 再至少多跑几轮，观察 blocked 频率、报告回流和任务文件是否可维护。README 主张 agent 可以管理 5–10 个以上并行，但没有数据；扩之前先用自己的记录验证。

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

## 证据与来源

- 做法 A 的命令与行为依据 max-sixty/worktrunk 的 README：六条安装路径（brew / cargo / winget / pacman / conda / pixi）、`wt switch` / `wt list` / `wt merge` / `wt remove` 四条核心命令、`wt switch`/`wt list`/`wt merge` 的真实终端输出样例、并行三 agent 的完整命令行、`-x` 与 `--` 的语义、`copy-ignored` 支持的文件系统（APFS/btrfs/XFS）、Windows 上 `wt` 与 Terminal 别名冲突及解法。仓库指标：10134 stars，当日 +77。
- README 自带的与原生 git 对照：`wt switch feat` ↔ `cd ../repo.feat`；`wt switch -c -x claude feat` ↔ `git worktree add -b feat ../repo.feat && cd ../repo.feat && claude`；`wt remove` ↔ `cd ../repo && git worktree remove ../repo.feat && git branch -d feat`；`wt list` ↔ `git worktree list`（只有路径）。据此，这套做法的增益主要是操作成本和状态可见性，不是新能力。
- 做法 B 的角色、命令、状态目录与配置依据 stevenmichaelthomas/numbrone 的 README 与本次调研报告：chief 路由、manager 分项目、worker 单任务单 worktree（分支 `numbrone/<task>`）、一个 skill / 一个 bash 脚本 / 三个 Markdown 角色文件、`~/.numbrone/` 纯文本状态、`/numbrone` 的 8 项引导、`settings.sh` 的四个变量、Watch 写法与 `/loop`、knowledge / context.md / Learned 的分流、日常操作对照表与命令语义表。调研结论是：可以在一两个项目上小范围试跑，优先借用它的纯文本任务文件、追加式日志和 Watch 循环结构；安装和命令可以照抄，但 herdr 本身还在试用期，且原文没有任何效果数据。
- 只是作者主张、没有证据：worktrunk README 的「已成为最流行的 git worktree 管理器」「built with love (there's no slop)」「agent 可管理 5–10+ 并行」；numbrone 原文也没有给出性能、冲突率、返工率、耗时方面的度量。
- 材料未覆盖：worktrunk 的 hooks、LLM commit、缓存共享的具体配置细节在 worktrunk.dev 外部文档，本条材料没有原文；numbrone 与 worktrunk 能否对同一批 worktree 混用，材料没有说明，本文不假设。
- 与已有做法的关系：Worktrunk 不改变 Claude Code 怎么干活，只解决同时开多个会话时工作区怎么摆、状态怎么看、怎么收尾；numbrone 是 herdr 之上的编排层，负责分派和报告回流。两者都是互补，不是替代。

## 依据的调研

- [max-sixty/worktrunk](../research/radar/2026-11-03/9845-max-sixty-worktrunk.md)：值得一试，建议在一个真实 git 仓库上小范围试用：安装 worktrunk 并执行 `wt config shell install`，用 `wt switch -c -x claude <分支> -- '<任务>'` 给每个并行 agent 开独立 worktree，再用 `wt list` 汇总状态、`wt merge`/`wt remove` 收尾。README 给出了可直接照做的命令与并行 agent 工作流，但证据仅为作者主张和 star 数，没有效果数据，因此先小范围验证冲突与返工是否真的下降。
- [stevenmichaelthomas/numbrone](../research/radar/2026-11-09/11813-stevenmichaelthomas-numbrone.md)：值得一试，在一两个项目上小范围试跑 numbrone 的“chief 路由—manager 分项目—worker 单任务单 worktree”三层编排，并优先借用它的纯文本任务文件、追加式日志和 Watch 循环结构；它的安装和命令都可以照抄，但底层依赖的 herdr 本身还在试用期，且原文没有任何效果数据，所以不适合直接写进手册当成定论。
