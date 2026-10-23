# haplollc/Vesalius

- 结论：**值得一试**。在 Apple silicon Mac 上按 README 的四步走（scripts/install-cli.sh → vesalius index → claude mcp add --scope user vesalius -- vesalius mcp → 照常提问）先挑一个有测试的中等仓库做 A/B 小范围试用，用每题 token 数、工具调用次数和清单漏项率判断是否值得推广；作者自测显示典型问题省约一半 token、质量基本持平，但仅支持 Apple silicon macOS、各语言解析深度差别很大、且“功能在哪”类问题质量反而下降，所以先试再定。
- 原文：https://github.com/haplollc/Vesalius
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T17:50:01.720Z

## 是什么

Vesalius 是一个本地运行的代码库索引与代码图谱工具：它扫描仓库，解析声明、调用和引用（Swift 用 SwiftSyntax 全语法树，TypeScript/JavaScript、Python 用 tree-sitter，其余语言做词法级解析），把引用关系按置信度链接成一张存在本机 SQLite 里的图，然后通过 MCP server 向 Claude Code / Codex 之类的编码智能体暴露 **5 个只读工具**（`usages`、`feature_map`、`outline`、`architecture`、`dependency_cycles`），让智能体“一次问清楚”而不是反复 grep、打开文件、再 grep。

同时提供 CLI（29 个命令）、Mac app、VS Code 扩展三种人工使用界面。索引和查询全部在本机完成，不上传代码、不写仓库（唯一例外是从 app 里以“允许编辑”模式启动的 agent run）。

它的核心主张不是“更聪明的搜索”，而是**把项目结构预先算好并以工具形式供给智能体**——这正好对应本项目的“条件供给”和“任务匹配”两个问题。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 前提

- Apple silicon Mac，macOS 15 或更高（作者在 macOS 27 + Xcode 26.6 + Swift 6.3 上测试）。
- 构建 CLI 需要 Xcode 26；需要 git。
- 智能体侧需要 Claude Code；编辑器侧需要 VS Code 1.95+ 与 Node 22+（可选）。
- Windows / Linux 用户目前无法使用这套流程（README 未给出任何非 macOS 路径）。

### 1. 构建并安装 `vesalius` 命令

```bash
git clone https://github.com/haplollc/Vesalius.git
cd Vesalius
scripts/install-cli.sh        # builds a release binary and installs it to ~/.local/bin
vesalius --version            # 2.0.0
```

- 首次构建会下载 SwiftSyntax 和 ArgumentParser（约 47 MB）并以 release 模式编译 SwiftSyntax，耗时数分钟（作者在 M2 上约 6 分钟，机器繁忙时更久）。
- 若 `~/.local/bin` 不在 `PATH`，脚本会打印需要加进 shell profile 的那一行。
- 安装到别处：`scripts/install-cli.sh ~/bin`。

### 2. 给项目建索引

```bash
cd ~/code/your-app
vesalius index
```

作者给出的自索引样例输出（用于对照预期规模与耗时）：

```
Indexed ~/code/Vesalius
  files: 248 scanned · +248 added · ~0 changed · -0 removed · 0 unchanged
  graph: 9,157 symbols · 79,037 references · 2,611 dependency edges
  time:  5.97s · index ~/Library/Application Support/Vesalius/Indexes/vesalius-…/index.v4.sqlite
```

- 这一步可以跳过：Claude Code 的第一次提问会自动建索引。
- 之后每次查询只重读发生变化的文件（作者测得“无变更刷新”0.1–0.25 秒）。

### 3. 把 MCP server 接到 Claude Code

```bash
claude mcp add --scope user vesalius -- vesalius mcp
claude mcp list
```

预期看到：

```
vesalius: vesalius mcp - ✔ Connected
```

按需替换的注册方式（README 明确说每种都会**替换**上一条，需先 `claude mcp remove --scope user vesalius`）：

```bash
# 团队共享（写进 .mcp.json，每人下次启动 Claude Code 时批准一次，未批准时 list 显示 "⏸ Pending approval"）
claude mcp add --scope project vesalius -- vesalius mcp

# Claude Code 找不到 vesalius 时给全路径
claude mcp add --scope user vesalius -- ~/.local/bin/vesalius mcp

# 固定服务某一个仓库（无论 Claude Code 在哪个目录启动）
claude mcp add --scope user vesalius -- vesalius mcp --repo ~/code/your-app

# 所有工具改为按需加载（见下面的 VESALIUS_MCP_PROFILE）
claude mcp add --scope user vesalius -e VESALIUS_MCP_PROFILE=lean -- vesalius mcp
```

任何支持 stdio 的 MCP 客户端都可以运行 `vesalius mcp --repo /path/to/repo`。

### 4. 照常提问，必要时点名一次

直接用日常问法即可，Claude 会自己选工具：

> Who calls `SessionStore.save`, and what would I have to update if I renamed it?
> Where are in-app purchases handled?
> Are there any circular imports under src/?
> What's in PaymentService.swift?

README 的排障条目给出关键操作提示：**如果已连接但没被使用，就点名用一次**，例如 “use vesalius to find who calls X”。

### 5. 自己用命令行核对（不经过智能体也能验证它答得对不对）

```bash
vesalius usages <target>            # 谁调用/使用/导入/依赖某个符号、文件、目录或模块
vesalius feature-map "<question>"   # 某个功能在哪里、怎么实现
vesalius outline <target>           # 文件/类型/目录/函数里有什么
vesalius architecture --v2          # target、package 与分层
vesalius dependency-cycles          # 循环导入，可加 --path src/
vesalius ask "<question>"           # 自然语言问题 → 排序后的文件/符号/行区间
vesalius impact <file or symbol>    # 变更影响面：依赖者、调用点、测试、风险
vesalius health · diagnostics · hotspots · unused   # 健康分与其依据、最高风险文件、疑似死代码
vesalius map                        # 按模块/目录/文件/符号聚类的依赖图
vesalius query "<sql>"              # 对索引做只读 SQL（--schema 看表结构）
vesalius watch                      # 边工作边保持索引最新
```

- `--json` 供脚本消费，`--repo <path>` 指向别的仓库，`--no-refresh` 关闭查询前的自动刷新（对没有索引的仓库会报 `has not been indexed yet`）。
- 每条查询默认会先刷新索引。

### 6. 配置：喂什么、索引放哪、工具怎么暴露

| 变量 | 作用 |
|---|---|
| `VESALIUS_HOME` | 索引存放位置（默认 `~/Library/Application Support/Vesalius`） |
| `VESALIUS_REPO` | 未传 `--repo` 时 `vesalius mcp` 服务的仓库 |
| `VESALIUS_MCP_PROFILE` | `default`（`usages`、`feature_map` 前置加载）/ `lean`（全部按需）/ `full`（额外加 `repo_report`：health、diagnostics、hotspots、unused） |
| `VESALIUS_TRACE` | 把耗时 trace 打到 stderr |

忽略规则：

- 会读各级 `.gitignore`、`.git/info/exclude`、git 全局 ignore（`~/.config/git/ignore` 或 `$XDG_CONFIG_HOME/git/ignore`；不读自定义 `core.excludesFile`），默认跳过构建产物、依赖和 vendored 第三方代码。
- 长期排除请写 `.vesaliusignore`（同 gitignore 语法，可放根目录或任意子目录），这样 Claude Code 和命令行都会遵守；`vesalius index --exclude` 只对当次运行有效。

**仓库选择顺序（容易踩坑，务必记下）**：`--repo` → `$VESALIUS_REPO` → Claude Code 的工作目录（`$CLAUDE_PROJECT_DIR`）→ 当前目录；后两者会取“最近的、已有索引的上级目录”，再退到 git root，再退到该目录本身。所以在 home 目录启动 Claude Code 会把整个 home 建成索引，并**在这个索引下的所有未建索引项目里胜出**——出问题就去 `Indexes` 里删掉，或用 `--repo` 固定。server 写到 stderr 的第一行就是它实际服务的仓库。

### 7.（可选）VS Code 扩展

```bash
cd vscode-extension
npm ci
npm run package                                 # compiles and writes vesalius-1.0.0.vsix
code --install-extension vesalius-1.0.0.vsix    # or Extensions › ⋯ › Install from VSIX… in VS Code
```

前提：已装第 1 步的 `vesalius` 命令；`code` 命令需在 VS Code 里执行过一次 “Shell Command: Install 'code' command in PATH”。VS Code 1.101+ 上它还会把自己注册为 agent mode 的 MCP server。

### 8.（可选）Mac app 的“改完再看分”回路

app 里选中一条 finding 后点 **Improve with Claude Code or Codex…**，它会用证据写出 prompt、以 plan-only 或 edit 模式跑 agent、流式显示过程，然后**重新索引并显示改动前后的 health 分数**。想让 app 与命令行共用一个索引，用 app 的 Settings › Agents › Install for My User 把 `~/.local/bin/vesalius` 链接到 app 自带二进制。

## 对应的研究问题

**1. 能力发现（AI 已经能做哪些还没想到交给它的工作）**
- “重命名/改签名前先算影响面”是一个典型的、原本很少交给智能体的工作：`usages` 支持 `change: rename | signature | remove`，直接给出要改的文件清单和要跑的测试。
- 它能抓到 grep 抓不到的引用。README 给的实例：`SettingsView.swift` 从不出现 `IndexLocation` 这个名字，而是通过 `RepositorySettings.model → AppModel.workspace → Workspace.engine → RepositoryEngine.location` 四层属性到达，Vesalius 仍标为 type-inferred 使用。
- 代码体检类工作（`health` 8 类评分与逐条扣分依据、`dependency_cycles`、`hotspots`、`unused`）原本几乎不会想到交给智能体。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 适合：结构性问题（谁调用、改这个会破坏什么、功能在哪、项目怎么组织、有没有循环导入），一次调用返回 file:line 证据并附完整性说明。
- 不同问题类型的收益差别很大（作者数据）：谁依赖此文件 −71%、循环导入 −74%、谁调用此函数 −56%、变更影响 −42%、功能在哪 −38%、架构 −33%、符号在哪被用 −8%。
- 工具**暴露策略**本身就是匹配问题：`usages` 和 `feature_map` 前置加载（每个会话常驻约 900 tokens，已计入 benchmark 总量），其余三个藏在 Claude Code 的工具检索后面。作者第一版把工具全藏起来，结果 24 次运行里只调用了 2 次——这是“工具可见性决定 agent 是否真的用”的直接证据。
- 语言匹配：Swift/TS/JS/Python 有调用图，其余语言只有词法级的文件、导入、声明与类型引用（**没有调用图**），不要在这些语言上期待同等效果。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 信息：一次本地索引（含 symbols、references、dependency edges）+ `.vesaliusignore` 决定喂给它的边界。
- 工具与接口：一条 `claude mcp add` 注册；5 个**只读**工具；`--repo` 把服务范围钉死，避免“服务错仓库”。
- 反馈：每个工具都返回**完整性检查**（如 `usages` 会说明该名字共出现多少次、多少次解析到目标、多少次是声明或非源码、是否有未解析项），让 agent 知道自己还该去 grep 什么——这是“把不确定性一并交付”的范式。
- 上下文成本可调：`default` / `lean` / `full` 三档 profile。

**4. 主动推进（时间、事件或状态触发）**
- `vesalius watch` 持续保持索引最新；查询前默认自动 refresh，只重读变更文件（无变更 0.1–0.25 秒）。
- Mac app 内“agent 修复 → 自动重新索引 → 前后 health 分数对比”是一个完整的“执行—复检”闭环，是目前较少见的把验证步骤内置进工具的做法。

**5. 效果验证（怎样判断确实改善了结果）**
- 作者做了对照实验：固定 Claude Code 2.1.307、同模型、同 prompt、同只读工具，20 个真实问题 × 6 个代码库，装/不装 Vesalius 各跑一次；由一个 AI judge 对着“已在代码中核实过的答案要点”做盲评。
- 结果：典型问题 **少用 51% token**（95% CI 36%–62%，按每题比值的几何均值；简单均值 204k → 113k，即 −44%），**少 43% 轮次**，**快 41% 完成**；质量整体无可测差异（−0.5 分，0–100 量表，95% CI −1.6 至 +0.8，两边都在 97–98）。
- 泛化检查：8 道“留出题”（在 Vesalius 2 设计之后才写、用的两个代码库的问题和答案从未参与开发）上省 44%（95% CI 12%–65%）。
- 可复现性：harness、问题、分析和完整报告在 `docs/benchmark`，评分 prompt 在 `docs/benchmark/grading_prompt.md`，可在自己代码上跑同一套对比。

## 与已有做法的关系

- 清单中有 **Claude Code（tool，adopt）**。Vesalius 不替代它，而是作为 MCP server 给 Claude Code 补“结构化项目上下文”，替代的是 Claude Code 默认的“grep → 读文件 → 再 grep”循环。作者 benchmark 里，每题搜索/读取/shell 调用从 **7.2 次降到 2.65 次**。
- 部署层面上它是 `.mcp.json` / `claude mcp add` 这条既有 MCP 接入路径的一个具体实现，团队可以用 `--scope project` 一次配置、全组共享。
- 与 Claude Code 自带的 CLAUDE.md 之类的“文字型项目说明”互补：后者靠人写、易过期；Vesalius 是从代码重新算出结构，且随文件变更增量刷新。

## 证据与局限

**原文给出的数据/案例**
- 20 题 × 6 代码库的对照实验及其置信区间；工具调用次数 7.2 → 2.65；轮次 −43%、时间 −41%。
- 分题型收益表（−8% 到 −74%）。
- 第一版失败案例：24 次运行只有 2 次调用 MCP，说明“注册了不等于会用”。
- 自索引规模数据：248 文件 → 9,157 symbols / 79,037 references / 2,611 edges，约 3–6 秒；六个 benchmark 代码库首次索引 2.7–20.5 秒，最大的 16,000 symbols / 143,000 references；warm 后多数答案几十毫秒，`feature_map` 约 1 秒。
- 298 个测试通过（徽章）；作者自述引用由类型/作用域/模块推断而非编译器，每条链接带置信度。

**哪些只是作者主张**
- 单一 AI judge、每题单次运行，作者自己也承认“单题噪声大”（20 题中 4 题反而多耗 token，+2% 到 +19%；质量在 11 题上变动 ≥1 分，3 好 8 差）。
- 20 题中 12 题是“针对它设计过的”，只有 8 题是真留出；6 个代码库中 3 个是作者私有 app，答案要点和运行 transcript 不公开，**无法精确重跑同一实验**。
- “health 分数”的 17 条规则是启发式，作者明说会展示证据但仍是启发式；“possibly unused”在反射、Interface Builder、动态派发场景会误报。
- Swift 引用解析不是编译器级；反射、selector、动态派发这类**从不写出名字**的用法不在完整性统计内。

**适用条件**
- 平台硬限制：Apple silicon + macOS 15+，构建需要 Xcode 26。跨平台团队目前无法统一采用。
- 语言收益不均：Swift / TS / JS / Python 才有调用图；Go、Rust、Java、C/C++、Ruby、PHP、C#、Dart、Shell、SQL 只有词法级信息（无 call graph），`usages` 的价值会明显缩水。
- 项目成熟度：55 stars、版本 2.0.0、单人/小团队项目，长期维护与后续兼容性未知；需要自行从源码构建，升级成本由使用者承担。
- 隐私边界要说清：索引在本地、无网络请求、无遥测，但**工具返回的答案会引用代码，Claude Code 仍会把这部分发给模型**——和 grep 后读文件没有本质区别，但需要在团队规范里写明。
- 已知质量回退：`feature_map` 相关的“功能在哪”类问题质量 **−2.1 分**（95% CI −4.2 至 −0.4），是唯一置信区间不跨零的负项。

## 怎么试、怎么验证

**最小试用（半天量级）**
1. 选一个有测试、几百个文件、语言在 Swift/TS/JS/Python 之内的仓库；准备 5–10 个真实问题，覆盖三类：改名影响面、功能位置、循环依赖/架构。
2. 按第 1–3 步装好并 `vesalius index`，记下索引耗时与 graph 规模；跑一次 `vesalius index` 再跑一次，确认无变更刷新 <1 秒。
3. 先**不注册 MCP**，用 Claude Code 裸跑全部问题，记录每题 token、轮次、搜索/读取/shell 调用次数、耗时、答案要点。
4. 注册 MCP（先用 `default` profile，固定 `--repo`），同一批问题、同一模型、同一 prompt 再跑一遍；确认 `claude mcp list` 为 Connected，并看 server stderr 第一行确认服务的是对的仓库。
5. 用 `vesalius usages` / `dependency-cycles` 的输出当“标准答案”，逐题核对 agent 答案有没有漏调用点。

**判断有没有改善的指标**
- 主指标：**每题 token 比值的几何均值**（照抄作者口径），目标中位数降 ≥30%；辅以轮次、耗时、工具调用次数（作者基线 7.2 → 2.65）。
- 质量指标：rename 场景下“`usages` 给出的改动清单 + 完整性说明中未解析项”与 agent 最终答案的**漏项数**；功能定位题的**首个命中文件是否正确**（这是作者数据里唯一变差的类别，要单独看）。
- 采用指标：agent 是否真的调用——看 `/mcp` 面板与 stderr；若 10 题里调用少于一半，按 README 建议先点名一次再测，仍不调用则说明 tool 暴露策略要换（试 `lean`/`full`）。
- 成本指标：每会话常驻约 900 tokens 的固定开销是否被摊平（问题越少越不划算）。

**止损条件**
- 目标仓库主要语言不在有调用图的那四种之内 → 直接放弃，改用其他方式。
- “功能在哪”类问题质量明显下降且团队高频使用该类问题 → 只在结构性问题上启用（`lean` profile 只留按需工具）。
- 索引落在错误仓库（比如 home 目录）→ 立即用 `--repo` 钉住，并从 `Indexes` 删除错误索引。
