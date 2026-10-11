# truongfelix/workflow

- 结论：**值得一试**。在一个有多会话、跨天跨机器的长期项目上小范围试：clone 仓库后运行 bin/adopt.sh，先填好 .claude/ground-truth.conf 并把 ground-truth.sh 跑到 GROUND TRUTH: complete，再用 /session-start 和 /handoff 包住每天的工作；理由是它把“上次会话的笔记只是主张、git 与机器状态才是事实”这条规则做成两个技能共用同一个采集脚本的机制，直接针对跨会话记忆失真，但本次材料只到 README，脚本实现与效果未经验证。
- 原文：https://github.com/truongfelix/workflow
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T08:13:44.734Z

## 是什么

`truongfelix/workflow` 是一个 Claude Code 的会话接续模板（MIT，32 stars）。它针对的问题是：每个 Claude Code 会话都从空上下文开始，常见的“笔记文件”做法会在笔记写错时失效——分支标成“已推送”其实没到 remote、任务标成“还在跑”其实凌晨 1 点就死了、待办上周就做完了，而下一次会话会相信这些笔记并在其上继续施工。

它的解法是两个技能加一个脚本：

- `/session-start`：运行 `ground-truth.sh`，从 git、GitHub 和本机读出事实（每个 repo/worktree 与其 remote 的差异、开着的 PR 及其 CI、后台任务），再读上一次的 handoff，**报告两者不一致的地方**，提出当天任务建议，然后等你决定。
- `/handoff`：运行同一个脚本，据此重写 handoff，更新各跟踪文件（开放工作、待你决策的问题、经验教训），并提交。

核心一句话：**handoff 是主张，脚本是事实；读写两侧跑同一个脚本，所以看到的是同一幅图。**

交付物是一组固定文件（由模板拷入项目）：

| 文件 | 存放内容 |
|---|---|
| `notes/handoff.md` | 今天：下一步任务、等你决定的事、后台在跑什么、上次会话。短，每次 handoff 重写 |
| `notes/handoff-archive.md` | 历次 handoff 逐字存档，需要时才搜，启动时不读 |
| `BACKLOG.md` | 只放开放工作，每个 repo 一节。做完的条目**删除而非打勾**，历史交给 git |
| `questions.md` | 只有你能做的决定，每条带选项与建议；以及已定的裁决，防止新会话“改回去” |
| `notes/lessons.md` | 项目踩坑学到的经验，每次会话都加载 |
| `CLAUDE.md` | 项目是什么、规则与命令。不放待办、不放历史 |
| `.claude/ground-truth.conf` | 脚本要检查的 repo，以及永远不能推送的分支 |
| `.claude/skills/` | `/session-start`（含 `ground-truth.sh`）与 `/handoff` |

适用形态：单仓库，或一个装着多个 repo（fork、app、backend）的工作区文件夹，根目录自身是一个只放文档的 repo。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：需要 bash 和 git。可选：GitHub CLI `gh`（读开着的 PR 和 CI）、systemd（后台任务，仅 Linux）。支持 Linux、macOS 和 Windows（在 Git Bash 或 WSL 里跑，CI 三种都测）。开始前先读 `PRINCIPLES.md`。

### A. 快速开始（最小路径）

1. 克隆模板到本机：

```bash
git clone https://github.com/truongfelix/workflow.git
```

2. 把模板拷进你的项目（**只拷贝缺失的文件，绝不覆盖已有文件**）：

```bash
workflow/bin/adopt.sh ~/code/my-project     # copies the template; never overwrites a file
```

3. 在项目里打开 Claude Code，直接给这段提示词：

```
Set up the workflow: follow "Adopt in a new project" in /path/to/workflow/README.md
```

Claude 会替你填空（项目是什么、有哪些 repo、规则是什么），反复运行 ground truth 直到干净，然后跑一次 `/handoff` 写出第一份 handoff。

4. 之后固定动作：坐下时 `/session-start`，收工前 `/handoff`。

### B. 在新项目里采用（README 的 “Adopt in a new project”，写给执行设置的 Claude 会话，也可手动照做）

1. **拿到 workflow**：本机有一份本仓库的 clone。
2. **选形态**：
   - *单仓库*：项目根就是 repo，跟踪文件跟代码一起提交。
   - *多仓库工作区*：一个装着多个代码 repo 的文件夹，根目录另建一个只放文档的 repo（CLAUDE.md、跟踪文件、`notes/`、`.claude/`），用白名单式 `.gitignore` 把嵌套 repo、数据和密钥挡在外面，并且 remote 必须是 **PRIVATE**。
3. **安装**：`bin/adopt.sh <project-root>`（第二种形态加 `--workspace`）。它只拷缺失文件，打印它跳过了哪些并给出 diff 命令，并列出所有 FILL 标记。
4. **按顺序填空**：
   - `.claude/ground-truth.conf`：每个 repo 一行（在 fork 里，算作“已推送”的 remote 是**你自己的**，不是 upstream），以及 KEEP_LOCAL 列出永远不能推送的分支。
   - 反复运行 `bash .claude/skills/session-start/ground-truth.sh`，直到它以 `GROUND TRUTH: complete` 结束。
   - `CLAUDE.md`：项目是什么、规则、**handoff 规则**（`/handoff` 能不能不问就 commit 和 push？）、repo 与目录布局、命令。把里面原有的待办列表搬进 `BACKLOG.md`。
   - `BACKLOG.md`：每个 repo 或文件树一节，从项目已有的追踪物（issue、笔记、旧 TODO）填。每条写：哪里错了或缺什么、指针、什么时候算完成。
   - `questions.md`：所有者尚未做的决定，以及已经做过、但新人会推翻的裁决。
   - 两个技能的 FILL 项（项目特有的检查项，哪些是预期之内、不算新闻）。
5. **仅工作区形态**：在根目录 `git init`；首次提交前检查 `git status --ignored` 和暂存列表；扫密钥（`gitleaks`）；绝不追踪 datadir、密钥或二进制；创建私有 remote，且只在所有者同意后推送。
6. **闭环**：跑一次 `/handoff`，让第一份 `notes/handoff.md` 从 ground truth 写出来。下一次会话用 `/session-start` 开始。

已有自己会话文档的既有项目：照样采用（不会覆盖任何东西），然后手工合并，保留项目的内容、套上模板的结构。

### C. 从本仓升级项目

再跑一次 `bin/adopt.sh <project-root>`，它会列出每个被跳过的文件，并给出与当前模板对比的 `diff -u` 命令。合并通用部分，保留项目自己的 FILL 答案。`.claude/workflow-version` 记录项目上次取用的 commit。

### D. 把改进回馈到上游

当某个项目的会话改进了通用部分（一个技能步骤、一项 ground-truth 检查、一条踩坑得来的原则），把通用部分单独一个 commit 移植回本仓，并写明原因。项目特有的内容不回上游，经验教训也不回：教训留在学到它的那个项目的 `notes/lessons.md` 里。

### E. 内嵌的五条原则（照做时的判据）

- **主张和事实是两回事**：过去会话写的笔记是主张；拿它行动或转述之前，先对着 git 和机器核一遍。
- **做完的事删除，不打勾**：打勾的条目还读起来像真的，会烂掉，还会把开放条目埋掉；历史 git 留着。
- **读不出来的结果叫 UNKNOWN，绝不算通过**：崩掉的检查什么都不打印，看起来像“没发现问题”；脚本打印 UNKNOWN 并以退出码 2 结束。
- **没被点名的东西，不算只存在于一块盘上**：死在笔记本上的未提交工作等于不存在。
- **先建议，再等**：会话只推荐；当天做什么、每次 push/PR/merge 是否批准，由你决定。

## 对应的研究问题

**1. 能力发现（AI 已能做、但常没想到交给它的工作）**
把“跨会话的事实核对”交给 AI：读 git/GitHub/本机状态、比对上一次 handoff、报告不一致。README 给出的样例显示了这类工作通常不会被交给模型——它抓出“backfill 周六 01:12 在第 212/340 批失败，日志是 /var/lib/pantry 的 No space left on device，而 handoff 以为 03:00 左右完成”“feat/offline-list 有 2 个提交从未推送，而 handoff 说分支已推送、编辑队列还没开始”“spike/pwa-cache 只在这台笔记本上，没有任何笔记提到”。同时 AI 还承担：据此提出当天任务清单、把每个任务的“done when”写清楚、把待决策事项整理成带推荐选项的问题、写/重写 handoff、更新跟踪文件。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 确定性事实采集 → bash 脚本（`ground-truth.sh`），不靠模型回忆。
- 比对、叙述、排序、提建议 → Claude Code 会话（slash 命令技能）。
- 判断与授权 → 人：每天做什么由你选，每次 push / PR / merge 需要你批准（“Propose, then wait”）。
- 形态匹配：单仓库 vs 多仓库工作区（后者根目录是纯文档 repo，配白名单 .gitignore 和私有 remote）。
- 工具档位：`gh` 用于开着的 PR 与 CI，systemd 用于后台任务（仅 Linux）。

**3. 条件供给（需要提供的信息、工具、权限、反馈）**
- 信息：`.claude/ground-truth.conf` 里逐个 repo 的 remote（fork 场景下必须写明算数的是自己的 remote）与 KEEP_LOCAL 分支；`CLAUDE.md` 里的项目说明、规则、handoff 规则（能否不问就 commit/push）、布局与命令；`BACKLOG.md` 里每条任务的“完成判据”。
- 权限：push/PR/merge 的授权规则显式写在 CLAUDE.md；工作区形态建私有 remote 且只经所有者同意才推。
- 工具：bash、git 必需；gh、systemd 可选；Windows 走 Git Bash 或 WSL。
- 反馈信号：脚本运行到 `GROUND TRUTH: complete` 才算填完；技能里的 FILL 标记；`bin/adopt.sh` 打印被跳过文件及其 `diff -u` 命令（升级反馈）；CI（模板自己在 Linux/macOS/Windows 三平台跑测试）。

**4. 主动推进（由时间、事件或状态触发并持续完成）**
触发点有两个，都是会话级的：坐下时 `/session-start`，收工前 `/handoff`。脚本每次都会检查后台任务状态、PR 的 CI 状态、以及从未推送的提交/worktree 与 remote 的差异——也就是说，这些状态变化会在下一次会话启动时被主动翻出来（样例中正是如此发现周六失败的 backfill 和两个未推送提交）。需要说明的是：README 没有描述无人值守的后台自动运行，推进发生在会话边界，由脚本采集 + 会话报告驱动。

**5. 效果验证（怎么判断确实改善了结果）**
- 脚本退出码与结束标记：`GROUND TRUTH: complete` 才算干净；结果不可读时打印 UNKNOWN 并且 exit 2，杜绝“没输出当成通过”。
- 任务粒度的可执行判据，样例里的写法可直接照抄格式：“Done when CI is green and you have merged it”“Done when the unit exits 0 and 20 recipes check out on staging”。
- 一致性验证：handoff（主张）与脚本（事实）的不一致条目数——样例里一次性暴露出 3 条 ⚠，且明确指出“只信周五笔记的会话会要求合并一个红灯 PR、报告 backfill 已完成、重写已经存在的代码”。
- 模板自身的验证：`test/run.sh` 测 `adopt.sh` 与 `ground-truth.sh`，CI 在三种系统上跑。

## 与已有做法的关系

清单中相关条目：**Claude Code（tool，状态 adopt）**。本线索是建立在 Claude Code 之上的一层工作流约定（slash 命令技能 + bash 采集脚本 + 固定跟踪文件），不是替代品；它依赖 Claude Code 的 `.claude/skills/` 机制运行。清单中没有与本模板直接对应的会话接续/跨会话记忆条目。

## 证据与局限

**给出的证据**：
- 一份完整的 Monday morning `/session-start` 输出样例（含 3 条与上周五 handoff 的不一致告警、当天 3 项带完成判据的任务、2 条等待你裁决的问题、以及“I'd start with 1... Which one?”的选择请求）。README 称这套场景的全部文件与脚本输出都在 `example/`。
- 明确说明脚本输出被截断的后果：只信笔记的会话会要求合并红灯 PR、报告 backfill 已完成、重写已存在的代码（即反面案例）。
- 仓库自身有 CI 徽章，`test/run.sh` 测 `adopt.sh` 和 `ground-truth.sh`，CI 在 Linux、macOS、Windows 上跑。
- 32 stars。

**只是作者主张、材料未验证的部分**：
- “Every rule in PRINCIPLES.md comes from something that went wrong”——无法从本材料核实。
- `ground-truth.sh`、两个 SKILL.md 的实际内容、`example/` 里的完整文件与输出、`memory/README.md`、`PRINCIPLES.md` 全文，本次都**没有读到**；只依据仓库 README 判断，脚本具体检查了哪些字段、输出格式、退出码细节均未见到。
- `bin/adopt.sh` 的实际行为（真的绝不覆盖？FILL 标记如何列出？）只能按 README 转述。

**适用条件**：
- 用 Claude Code 的项目；项目有 git（最好有 remote，多会话/多机器/跨周运行）。
- 需要 `gh` 才能拿到开着的 PR 与 CI；后台任务检查依赖 systemd，**仅 Linux**；Windows 需 Git Bash 或 WSL。
- 面向“长期项目”，一次性小脚本任务收益有限。
- 多仓库工作区形态要求根目录是私有 remote 的文档 repo，并需处理密钥、datadir、二进制不被追踪。

## 怎么试、怎么验证

**最小试用方式**（半天内可完成，用你已有的一个跨多天项目）：

1. `git clone https://github.com/truongfelix/workflow.git`，然后 `bin/adopt.sh <你的项目根>`。
2. 打开 Claude Code，粘贴 `Set up the workflow: follow "Adopt in a new project" in /path/to/workflow/README.md`，让它把 FILL 填起来；你只需审 `CLAUDE.md` 里的 handoff 规则和 `.claude/ground-truth.conf` 的 repo 列表/KEEP_LOCAL。
3. 反复 `bash .claude/skills/session-start/ground-truth.sh` 直到出现 `GROUND TRUTH: complete`；这一步本身就是验证脚本是否适配你项目的关口。
4. 跑一次 `/handoff` 写下第一份 handoff。
5. 按正常节奏工作一天，第二天用 `/session-start` 开场，观察它报告的不一致条目。

（若不想动现有项目，先用一个单仓库的沙盒项目走一遍。）

**判断有没有改善的指标**：

- **不一致捕获数**：`/session-start` 报出的 ⚠ 条目里，有几条是你自己不知道的（未推送提交、CI 变红、后台任务死掉、只存在本机的分支）。这条最直接对应该工具要解决的问题；连续几次为 0 才说明它没用，反之就是有效。
- **踩到过期笔记的次数**：试用前后各统计一段时间内“因为相信上次记录里的状态而做错/做重”的次数，应下降。
- **待决策是否被前置**：`questions.md` / “Waiting for you” 里的问题是否在开工前就摆出来，且每条带选项与建议。
- **任务完成判据的可执行性**：“Done when …”有多少条是机器可判的（CI 绿、进程 exit 0、staging 上 N 条数据校验通过）。
- **脚本可信度**：是否出现过“无输出被当成通过”；若脚本按设计打印 UNKNOWN 并 exit 2，说明这条防线生效。
- **闭环是否成立**：handoff 是否每次都由同一脚本重写，而不是靠模型自由发挥；不一致项是否在当天被清掉。

**明确的止损点**：如果 `ground-truth.sh` 在你的项目结构下无法跑到 `complete`（例如没有 remote、后台任务不在 systemd 下、或你的核心状态不在 git/GitHub/本机进程里），说明它的“事实层”覆盖不到你需要的部分，此时最多只借它的原则（主张 vs 事实、做完即删、UNKNOWN ≠ 通过、只在一台盘上不算存在、先建议再等），不必整套采用。
