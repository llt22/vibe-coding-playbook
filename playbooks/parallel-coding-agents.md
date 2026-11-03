# 同时开多个编码 agent：一个任务一个工作区，状态一屏看清

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多个编码 agent 挤在同一个工作目录会互相改文件，分开后又看不清各自进度、收尾靠手工；这篇手册把「一个任务 = 一个 worktree = 一个 agent 会话」变成可日常维护的建、跑、看、收流程。
> 先试这一步：在真实仓库上装好 worktrunk 并执行 `wt config shell install`，然后用 `wt switch -x claude -c <分支> -- '<任务>'` 开一个隔离工作区跑一个任务。
> 最近修订：2026-11-03

## 解决什么问题

Claude Code、Codex 这类 agent 已经能较长时间无人值守地跑任务，同时开多个是自然的下一步；但多个会话挤在同一个工作目录会互相改文件，而原生 git worktree 的用法又太笨——起一个工作区要把分支名打三遍（`git worktree add -b feat ../repo.feat`，再 `cd ../repo.feat`），并行一多就不知道谁在哪、各自到哪一步、怎么收尾。这篇手册把「一个任务 = 一个 worktree = 一个 agent 会话」变成可以日常维护的流程：建、跑、看、收。

## 适用与不适用

适用：

- 已有 git 仓库，要并行跑的是可以在终端启动的 CLI agent（材料以 Claude Code 为例，也提到 Codex）。
- 任务彼此文件重叠小、可独立验证：材料里的示例是「加用户认证 / 修分页 bug / 为 API 写测试」。
- macOS / Linux；Windows 与 Arch、conda 另有安装路径（见步骤 1）。

不适用：

- 需要改同一批文件的重构，不适合按这套方式并行，冲突不会因为换了工具就消失。
- 材料只是项目 README（带宣传性质），没有任何性能、冲突率、返工率、耗时数据；不要把它当成「并行一定更快」的证明。
- hooks、LLM commit、缓存共享的具体配置细节在 worktrunk.dev 外部文档，本条材料没有给出原文，本文不编造这些配置。

## 前置条件

- 一个真实的 git 仓库（先在真实仓库小范围试，不要在重要的 main 上直接开试）。
- 终端里可启动的 agent CLI，例如 `claude`。
- 安装 worktrunk：macOS 用 Homebrew，或有 Rust 工具链用 cargo。
- 必须完成 shell 集成（`wt config shell install`）。没有集成时 `wt switch` 只能打印路径，不能改变当前 shell 的目录，agent 就会在错误的位置启动。
- 权限：创建/删除分支、增删 worktree、push；`wt merge` 会直接改动 main，对 main 的写权限要可控。
- 缓存共享 `wt step copy-ignored` 只在 APFS、btrfs、XFS 文件系统上可用。

## 操作步骤

### 1. 安装并装 shell 集成

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

### 2. 给单个任务建工作区并进入

前提：shell 集成已生效。这一步等价于 `git worktree add -b <branch> <path>` 加 `cd <path>`。

```console
$ wt switch --create feature-auth
✓ Created branch feature-auth from main and worktree @ ~/repo.feature-auth
```

预期结果：新建分支和 worktree，当前目录切到新工作区。

### 3. 并行跑多个 agent：一个任务一个 worktree

`-x` 表示切换后执行某条命令，`--` 之后的参数原样传给该命令。前提：三个任务的文件重叠小、各自可独立验证。

```bash
wt switch -x claude -c feature-a -- 'Add user authentication'
wt switch -x claude -c feature-b -- 'Fix the pagination bug'
wt switch -x claude -c feature-c -- 'Write tests for the API'
```

预期结果：三个 agent 分别在 `feature-a`、`feature-b`、`feature-c` 三个工作区里跑，互不改对方文件。任务怎么选是这套做法成立的前提，不是任意任务都能这样拆。

### 4.（可选）用 hook 把每个新工作区都要做的准备自动化

README 只给了用途：创建后自动装依赖、起 dev server；hook 类型含 create、pre-merge、post-merge 等。配置原文在 `worktrunk.dev/hook/`，本条材料没有给出，不要照抄网上的片段。没有把握就先跳过这一步，手工准备。

### 5. 用 `wt list` 看所有并行任务的状态

代替逐个 `cd` 过去看。

```console
$ wt list
  Branch        Status      HEAD±     main↕    main…±    Remote⇅  Commit    Age  Message
@ feature-auth  +   ↑      +27   -8   ↑1       +31                4bc72dc    2h  Add authenticatio…
^ main              ^⇡                                    ⇡1      0e631ad    1d  Initial commit

○ Showing 2 worktrees, 1 with changes, 1 ahead, hidden: Path
```

读法（README 原文）：`@` 是当前 worktree；`+` 有已暂存改动；`↑1` 领先 main 1 个提交；`⇡` 有未推送提交。`wt list --full` 还会带 CI 状态和每个分支的 AI 生成摘要。

### 6. 收尾：两条路径二选一

做法 A：走 PR，适合需要 review 或团队协作的改动。

```bash
wt step commit                    # commit staged changes
gh pr create                      # or glab mr create
wt remove                         # after PR is merged
```

做法 B：本地合并，适合自己就能判断、不需要 review 的改动。一条命令做 squash、rebase 到 main、fast-forward 合并、清理：

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

怎么选：改动要别人看、要走 CI/评审，用 A；改动小且自己能验证、想省掉 PR 往返，用 B——但 B 会直接动 main，前提是 main 的写权限可控。

### 7. 并行数量上去之后的两个配套

- 构建缓存共享：`wt step copy-ignored`，让多个 worktree 都有 `target/`、`node_modules/` 而不必各自构建或复制；仅限 APFS、btrfs、XFS。
- 每个 worktree 一个 dev server：用 `hash_port` 模板过滤器给每个 worktree 分配唯一端口，避免端口撞车。

这两项的具体配置细节在外部文档，材料未给出，先按文档确认再用。

### 8.（可选）其他入口

`wt switch pr:123` 直接检出 PR 分支；interactive picker 浏览 worktree 并预览 CI 状态、diff、log、PR 和评论；aliases 定义自定义 `wt <name>` 子命令；per-branch 变量供 hook 模板使用。

## 怎么判断变好了

材料没有给出任何效果指标，下面是可观察的替代信号，判定标准要自己定。

可观察：

- agent 之间是否还会改到对方的文件（冲突次数、返工次数）——这是这套做法最该改善的一项，但 README 没有数据。
- `wt list` 里每个分支的 ahead/behind、是否有 staged 改动、是否有未推送提交、`--full` 下的 CI 状态，能不能一屏看清「现在各自到哪」。
- `wt merge` 输出的 diffstat（如 `2 files, +53`）是否符合预期，合并是否一次过。
- 收尾后是否还有残留的 worktree 和分支（`wt remove` / `wt merge` 应当清掉）。

最小试用：选两三个文件重叠小、可独立验证的任务，用步骤 3 并行跑一轮，按步骤 5 看状态、按步骤 6 收尾。先完整走完一轮「建—跑—看—合—清」，再决定是否扩到更多并行。

试多久：至少覆盖一个完整任务的周期（从建 worktree 到合并/删 worktree），并记录冲突与返工。README 主张 agent 可以管理 5–10 个以上并行，但没有数据，扩之前先用自己的记录验证。

## 常见坑

- 没装 shell 集成就开跑：`wt switch` 只打印路径，agent 在旧目录启动，等于没隔离。
- 把要改同一批文件的任务并行：工具只隔离目录，不解决语义冲突。
- Windows 上 `wt` 和 Windows Terminal 的别名冲突：装成 `git-wt`，或关掉 Terminal / Terminal Preview 的应用执行别名。
- 直接在 main 上试 `wt merge`：它会自动提交、合并、后台删除 worktree 和分支，main 写权限要先收好。
- PR 路径依赖 `gh` 或 `glab`，没装就走到一半。
- 多个 worktree 各自起 dev server 端口撞车：用 `hash_port` 分配唯一端口；`copy-ignored` 只在 APFS、btrfs、XFS 上可用。
- 把 README 的「最流行」「5–10+ 并行」当成结论：这些是作者主张，没有对照和失败案例。
- 照抄外部文档里的 hook 配置：本条材料没有 hook 配置原文，先看 `worktrunk.dev/hook/` 再写。

## 证据与来源

- 做法与命令依据 max-sixty/worktrunk 的 README：六条安装路径（brew / cargo / winget / pacman / conda / pixi）、`wt switch` / `wt list` / `wt merge` / `wt remove` 四条核心命令、`wt switch`/`wt list`/`wt merge` 的真实终端输出样例、并行三 agent 的完整命令行、`-x` 与 `--` 的语义、`copy-ignored` 支持的文件系统（APFS/btrfs/XFS）、Windows 上 `wt` 与 Terminal 别名冲突及解法。仓库指标：10134 stars，当日 +77。
- README 自带的与原生 git 对照：`wt switch feat` ↔ `cd ../repo.feat`；`wt switch -c -x claude feat` ↔ `git worktree add -b feat ../repo.feat && cd ../repo.feat && claude`；`wt remove` ↔ `cd ../repo && git worktree remove ../repo.feat && git branch -d feat`；`wt list` ↔ `git worktree list`（只有路径）。据此，这套做法的增益主要是操作成本和状态可见性，不是新能力。
- 只是作者主张、没有证据：「已成为最流行的 git worktree 管理器」「built with love (there's no slop)」「agent 可管理 5–10+ 并行」。没有任何性能、冲突率、返工率、耗时方面的度量。
- 材料未覆盖：hooks、LLM commit、缓存共享的具体配置细节在 worktrunk.dev 外部文档，本条材料没有原文，本文只写用途，不写配置。
- 与已有做法的关系：Worktrunk 不改变 Claude Code 怎么干活，只解决同时开多个会话时工作区怎么摆、状态怎么看、怎么收尾；是互补，不是替代。

## 依据的调研

- [max-sixty/worktrunk](../research/radar/2026-11-03/9845-max-sixty-worktrunk.md)：值得一试，建议在一个真实 git 仓库上小范围试用：安装 worktrunk 并执行 `wt config shell install`，用 `wt switch -c -x claude <分支> -- '<任务>'` 给每个并行 agent 开独立 worktree，再用 `wt list` 汇总状态、`wt merge`/`wt remove` 收尾。README 给出了可直接照做的命令与并行 agent 工作流，但证据仅为作者主张和 star 数，没有效果数据，因此先小范围验证冲突与返工是否真的下降。
