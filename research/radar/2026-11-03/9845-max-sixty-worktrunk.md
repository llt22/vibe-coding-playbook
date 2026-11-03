# max-sixty/worktrunk

- 结论：**值得一试**。建议在一个真实 git 仓库上小范围试用：安装 worktrunk 并执行 `wt config shell install`，用 `wt switch -c -x claude <分支> -- '<任务>'` 给每个并行 agent 开独立 worktree，再用 `wt list` 汇总状态、`wt merge`/`wt remove` 收尾。README 给出了可直接照做的命令与并行 agent 工作流，但证据仅为作者主张和 star 数，没有效果数据，因此先小范围验证冲突与返工是否真的下降。
- 原文：https://github.com/max-sixty/worktrunk
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T05:52:14.559Z

## 是什么

Worktrunk 是一个用 Rust 写的 git worktree 管理 CLI（`wt`），定位是「为并行运行 AI agent 而设计」。它把 git 原生 worktree 的多步操作压缩成接近分支操作的三个核心命令（`wt switch` / `wt list` / `wt merge` / `wt remove`），worktree 用分支名寻址、路径由可配置模板生成，从而让「一个任务 = 一个 worktree = 一个 agent 会话」这种并行方式变得可日常维护。

README 自述的背景前提：Claude Code、Codex 这类 agent 已能较长时间无人值守地跑任务，因此同时管理 5–10 个以上是可行的；原生 `git worktree` 的 UX 太笨（起一个 worktree 要把分支名打三遍：`git worktree add -b feat ../repo.feat` 再 `cd ../repo.feat`），并行一多就难以管理。

注意：这是项目 README（带宣传性质），不是评测报告。hooks、LLM commit、缓存共享等功能的**具体配置细节放在 worktrunk.dev 外部文档**，本条材料里没有，本文只就 README 里给出的命令和描述提炼。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：已有 git 仓库；机器是 macOS / Linux（Windows、Arch、conda 路径另列）；要并行的是 Claude Code 一类可在终端启动的 CLI agent。

**1. 安装并装 shell 集成。** shell 集成是必须的——`wt switch` 需要改变当前 shell 的目录，没有集成只能打印路径。

```bash
brew install worktrunk && wt config shell install
```

或（Rust 工具链）：

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

Windows 另一条路：在 设置 → 应用 → 高级应用设置 → 应用执行别名 里关掉 "Terminal"/"Terminal Preview"，就能直接用 `wt`。

**2. 为单个任务创建 worktree 并进入。** 这一步等价于 `git worktree add -b <branch> <path>` + `cd <path>`：

```console
$ wt switch --create feature-auth
✓ Created branch feature-auth from main and worktree @ ~/repo.feature-auth
```

**3. 并行跑多个 agent：每个任务一个 worktree，`-x` 直接拉起 agent。** `-x` 表示切换后执行某命令，`--` 之后的参数原样传给该命令：

```bash
wt switch -x claude -c feature-a -- 'Add user authentication'
wt switch -x claude -c feature-b -- 'Fix the pagination bug'
wt switch -x claude -c feature-c -- 'Write tests for the API'
```

注意这里三个任务的选取方式：彼此**文件重叠小、可独立验证**（新功能 / 修 bug / 补测试），这是并行不出冲突的前提，不是任意任务都能这样拆。

**4. 用 post-start hooks 把「每个 worktree 都要做一遍」的准备工作自动化。** README 只给了用途，没给配置原文：创建后自动装依赖、起 dev server。对应文档页 `worktrunk.dev/hook/`（hook 类型含 create、pre-merge、post-merge 等）。

**5. 用 `wt list` 汇总所有并行任务的状态，代替逐个 `cd` 过去看。**

```console
$ wt list
  Branch        Status      HEAD±     main↕    main…±    Remote⇅  Commit    Age  Message
@ feature-auth  +   ↑      +27   -8   ↑1       +31                4bc72dc    2h  Add authenticatio…
^ main              ^⇡                                    ⇡1      0e631ad    1d  Initial commit

○ Showing 2 worktrees, 1 with changes, 1 ahead, hidden: Path
```

读法（README 原文）：`@` 当前 worktree；`+` 有已暂存改动；`↑1` 领先 main 1 个提交；`⇡` 有未推送提交。`wt list --full` 还能带 CI 状态和每分支的 AI 生成摘要。

**6. 收尾——两条路径二选一。**

PR 路径：

```bash
wt step commit                    # commit staged changes
gh pr create                      # or glab mr create
wt remove                         # after PR is merged
```

本地合并路径（squash、rebase 到 main、fast-forward 合并、清理，一条命令）：

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

**7. 并行数量上去之后的两个配套（README 提到、细节在外部文档）：**
- 构建缓存共享：`wt step copy-ignored`，让十个 worktree 都有 `target/`、`node_modules/` 而不必各自构建或复制——**仅限 APFS、btrfs、XFS 文件系统**。
- 每个 worktree 一个 dev server：用 `hash_port` 模板过滤器给每个 worktree 分配唯一端口，避免端口撞车。

**8.（可选）其他入口：** `wt switch pr:123` 直接检出 PR 分支；interactive picker 浏览 worktree 并预览 CI 状态、diff、log、PR 和评论；aliases 定义自定义 `wt <name>` 子命令；per-branch 变量供 hook 模板使用。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现** — 依据较弱但有一条：README 主张 agent 已能「长时间无人值守」，因此同时跑 5–10+ 个是可行的；`wt list --full` 提到 AI 生成的每分支摘要。这些都是作者陈述，没有任务清单或案例可抄，不构成「AI 还能做什么」的新增能力边界。

**2. 任务匹配** — 有实质内容：给出了并行化任务的**选取标准**和工具形态。示例里三个并行任务是「加用户认证 / 修分页 bug / 为 API 写测试」，即**改动范围相对独立、各自可验证**的任务；反之共享同一批文件的改造不适合并行。工具形态是终端里的 CLI agent（Claude Code 为例），一个 worktree 一个会话、互不共享工作目录。`-x`/`--` 的用法示范了「用一条命令把任务提示词随会话一起递进去」这一协作方式。

**3. 条件供给** — 这是本条最有价值的部分，且相当具体：
- **隔离的工作目录**：每个 agent 一个 worktree，互不改对方文件，这是并行不踩踏的物理前提；
- **shell 集成**：`wt config shell install`，否则命令无法切目录，agent 启动位置就错了；
- **自动化 hook**：create / pre-merge / post-merge 时跑命令，用来装依赖、起 dev server，把「每个新工作区都要做的准备」变成事件触发而非人工记得；
- **端口与缓存两类资源供给**：`hash_port` 分配唯一端口；`wt step copy-ignored` 让各 worktree 共享被 ignore 的构建产物（受文件系统限制）；
- **权限**：隐含需要 git 分支创建/删除、worktree 增删、push 的权限；`wt merge` 会直接动 main，因此对 main 的写权限要可控。

**4. 主动推进** — 有一点但不强：hooks 是**事件触发**（新建 worktree、合并前、合并后）而非时间/状态触发；`wt merge` 会自动生成 commit message、提交、合并、后台删除 worktree 与分支，属于「一条命令串起一串自动动作」。README 没有描述定时轮询、任务队列、失败重试之类的持续推进机制。

**5. 效果验证** — 有观测手段、缺判断标准。`wt list` 提供每个分支的 ahead/behind、staged、unpushed、CI 状态；`wt list --full` 有 AI 摘要；`wt merge` 输出 diffstat（`2 files changed, 53 insertions(+)`）。这些让「并行任务现在各自到哪了」可观测，但 README 没有给出任何「AI 介入后结果变好」的指标或对照，判定标准要自己定（见末节）。

## 与已有做法的关系

清单中相关条目：**Claude Code（adopt）**。

关系是**互补而非替代**：Worktrunk 不改变 Claude Code 怎么干活，只解决「同时开多个 Claude Code 会话时工作区怎么摆、状态怎么看、怎么收尾」。README 的并行示例直接以 Claude Code 为 `-x` 的目标，也提到 Codex。因此它是把已 adopt 的 Claude Code 从「单会话助手」扩展到「多会话并行」的一层基础设施。

与清单外的原生做法对比（README 自带对照表）：`wt switch feat` ↔ `cd ../repo.feat`；`wt switch -c -x claude feat` ↔ `git worktree add -b feat ../repo.feat && cd ../repo.feat && claude`；`wt remove` ↔ `cd ../repo && git worktree remove ../repo.feat && git branch -d feat`；`wt list` ↔ `git worktree list`（只有路径）。也就是说它的增益主要是**操作成本**和**状态可见性**，不是新能力。

## 证据与局限

**给出的具体物：**完整安装命令（brewed/cargo/winget/pacman/conda/pixi 六条路径）、四条核心命令及其与原生 git 的逐条等价对照、`wt switch`/`wt list`/`wt merge` 的真实终端输出样例（含 `@`、`+`、`↑1`、`⇡` 的含义）、并行三 agent 的完整命令行、`-x` 与 `--` 的语义、缓存共享所支持的文件系统（APFS/btrfs/XFS）、Windows 上 `wt` 与 Terminal 别名冲突及解法。仓库指标：10134 stars，当日 +77。

**只是作者主张、没有证据的：**「已成为最流行的 git worktree 管理器」「built with love (there's no slop)」「agent 可管理 5–10+ 并行」——均无数据、无对照、无失败案例。**没有任何性能、冲突率、返工率、耗时方面的度量。**

**局限：**
- 材料是 README，hooks、LLM commit message、interactive picker、aliases、per-branch 变量、agent handoff 等**只有链接和一句话用途，配置写法不在材料内**，照做会卡在外部文档；
- `wt merge` 会 squash/rebase/fast-forward 直接改 main，属于对仓库有写权的破坏性操作，团队仓库需先确认策略；
- 缓存共享受文件系统限制，非 APFS/btrfs/XFS 环境这条增益拿不到；
- star 数反映关注度，不反映效果；「最流行」是自述；
- 并行收益的前提是任务可切分，README 未讨论任务不可切分时的退化情况。

## 怎么试、怎么验证

**最小试用（约半天）：**
1. 选一个真实仓库（有测试、有 CI 最好），按步骤 1 装好并 `wt config shell install`，确认 `wt switch` 能真的把 shell 切过去。
2. 挑**三个改动范围互不重叠**的任务（照 README 的形态：一个新增功能、一个局部 bug、一个补测试），用 `wt switch -x claude -c <branch> -- '<任务>'` 各开一个。
3. 只在 `wt list` 里看状态、不逐个 `cd`，记录你是否需要额外手段才能知道「哪个跑完了、哪个卡住了」。
4. 收尾统一走 `wt remove`（或先走 PR 路径），记录清理是否一次成功、有无残留 worktree/分支。
5. 再加一步对照：同一批任务改用**单目录串行**做一遍（或换回不用 worktree 的并行方式），比较下列指标。

**判断有没有改善的指标（自定，README 未提供）：**
- 冲突/踩踏次数：并行期间因两个 agent 改同一文件导致的返工次数（期望降到接近 0）；
- 人工协调时间：为「知道各任务进展」而执行的命令数、切目录次数；
- 环境准备时间：新建工作区到 agent 能跑起来的时间（配合 hook 应显著下降）；
- 收尾干净度：合并后残留 worktree/分支数、需要手工补救的次数；
- 结果质量护栏：每个任务的测试通过率 / CI 通过率、合并回 main 后被回滚或补修的比例——这一项若不比串行差，才说明并行没有用速度换质量。

**放弃条件：**任务其实难以切分（大量共享文件）、或团队流程不允许工具直接动 main、或环境不支持缓存共享且环境准备时间成为瓶颈——这几种情况下收益主要剩「少打几个字」，不值得引入新工具。
