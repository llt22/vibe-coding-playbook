# lemonadesaltbagel/sill

- 结论：**值得一试**。在 Windows 上用 Claude Code / Codex / Gemini CLI 这类编码智能体时，先在一台机器上装 sill，并把 harness 接到它（直接指向 bash.exe，或挂它的 MCP server），替换 Git Bash 承担 shell 层。理由是原文提供了可直接复制的安装、接线和环境变量配置，并附了自测对照数据；但测试套件与基准都是作者自建、自报，需要自己小范围验证后再推广。
- 原文：https://github.com/lemonadesaltbagel/sill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T19:56:17.652Z

## 是什么

sill 是一个面向编码智能体的 Windows 原生 Bash：一个可直接替换的 `bash.exe`（Bash 解释器 fork 自 brush，外加一层 Windows 适配），不需要 Git、MSYS2 或 WSL。它既可以作为 Claude Code、opencode 的 shell 后端，也可以作为 MCP server 挂到 Codex CLI、Gemini CLI、Claude Desktop 上，让智能体发出的 shell 命令在 Windows 自己的程序和文件上按 Linux 语义执行。

要解决的问题是：在 Windows 上，智能体大量失败的命令发生在 shell 与 Windows 的边界上，不在模型推理里，包括参数（`*`、引号）在传给 `.exe` / `.bat` 时被重新展开或破坏、`/c/...` 与 `C:\...` 路径混用、非英文文本乱码、每条命令弹一个控制台窗口、后台服务占住 harness 的输出管道直到超时、`make`/`rg`/`ps`/`lsof` 缺失。sill 对每一项分别处理，并各配一个测试。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：Windows 机器；按原文，安装路径有二选一（Scoop 或安装脚本），构建源码另需 Rust 与 Visual Studio C++ 工具。

**1. 用 Scoop 安装（前提：已装 Scoop）**

```
scoop bucket add sill https://github.com/lemonadesaltbagel/scoop-sill
scoop install sill/sill
```

这会把 `sill` 放到 PATH。作为可直接替换的 `bash.exe` 位于 `~\scoop\apps\sill\current\bash.exe`。

**2. 或用安装脚本（前提：PowerShell；已下载 `sill-windows-x64.zip` 与 `install-windows.ps1`）**

1. 从 latest release 下载 `sill-windows-x64.zip` 和 `install-windows.ps1`。
2. 在 PowerShell 运行：

```
powershell -ExecutionPolicy Bypass -File install-windows.ps1 -Zip sill-windows-x64.zip -AddToPath -ClaudeCode
```

安装器解包到 `%LOCALAPPDATA%\Programs\sill`。选项含义：
- `-AddToPath` 把 sill 加入用户 PATH。
- `-ClaudeCode` 在 `~\.claude\settings.json` 里把 Claude Code 的 Bash 工具指向 sill；其他设置保留，旧文件存为 `settings.json.bak`。
- `-Mcp codex,gemini,claude` 把 sill 的 MCP server 加进 Codex CLI（`~\.codex\config.toml`）、Gemini CLI（`~\.gemini\settings.json`）、Claude Desktop（`%APPDATA%\Claude\claude_desktop_config.json`）；均为合并写入，旧文件存为 `.bak`，审批策略保持客户端里原有设置。

原文声明：机器上其他东西不会被改动。

**3. 按 harness 接线（前提：上一步已装好，知道 `bash.exe` 路径）**

| harness | 接法 |
|---|---|
| Claude Code | 设 `CLAUDE_CODE_GIT_BASH_PATH` = `...\sill\bash.exe`（即 `-ClaudeCode` 所做的事） |
| opencode | 设 `SHELL` = `...\sill\bash.exe` |
| Codex CLI、Gemini CLI、Claude Desktop | 作为 MCP server 接入：`-Mcp codex,gemini,claude` |
| 任意 MCP 客户端 | 命令 `...\sill\bash.exe`，参数 `--mcp`（stdio）；允许工具调用时长最多到 11 分钟 |

**4. 用 MCP server 模式时，了解模型拿到的三个工具（前提：已按上一步挂上 `--mcp`）**

- `bash`：执行命令，返回 stdout、stderr 和退出码。工作目录和已 export 的变量会带到下一次调用，函数和 alias 不会。超时默认 2 分钟、最长 10 分钟，超时会结束该命令及其启动的所有程序。带 `run_in_background` 时立即返回 job id，用于启动服务或 watcher。
- `bash_output`：读取后台作业的新输出。
- `bash_kill`：停止后台作业及其启动的所有进程。

每条命令在全新的 sill 进程里执行，因此崩溃或挂死不会带崩 server，命令遗留的程序也无法一直占住调用不放。

**5. 按需调整行为（前提：需要改默认值；已设置的值不会被覆盖）**

| 变量 | 作用 |
|---|---|
| `SILL_NO_ENV_DEFAULTS=1` | 关闭下述默认值，连 sill 自身消息也不再是英文 |
| `LANG`、`LC_ALL`、`LC_MESSAGES` | 设为非英文时，sill 自身消息保持该语言 |
| `SILL_CONSOLE_CP` | 不可见控制台的代码页（默认 65001，UTF-8） |
| `SILL_TRACE=<file>` | 把每次调用的参数和工作目录以 JSON 行追加到文件（可用于审计和复盘） |

面向智能体的默认值：UTF-8 Python；无分页器、无提示、无更新提示；遥测关闭；.NET 与 MSBuild 输出英文。这些都能用 `env` 看到。

**6. 需要从源码构建时（前提：Windows + `rust-toolchain.toml` 指定的 Rust + Visual Studio C++ 工具）**

```
cargo build --release -p sill
```

产物为 `target\release\bash.exe`。捆绑工具在 Linux 上以 mingw-w64 交叉构建，脚本：`scripts/build-busybox.sh`、`scripts/build-gnu-tools.sh`、`scripts/fetch-tools.sh`（固定版本并校验和）。`scripts/package-windows.ps1` 打 zip，`scripts/dist-check.sh` 在只含 Windows 自身目录的 PATH 上校验发行包。

**7. 上手后立刻可用的能力（前提：安装完成）**

- `#!` 脚本可直接跑：`./build.sh`、`./gradlew`、`#!/usr/bin/env python3`；`sh` 即 sill。
- 后台作业写法 `server > log 2>&1 &` 不会占住 harness 输出管道；`kill`、`pkill`、`killall` 结束整棵进程树，但不会杀 harness 或 Windows 会话进程。
- `apply_patch`（Codex 模型训练时用的文件编辑命令）可从 stdin 或参数接 patch，并保留每个文件的行尾。
- 包管理器：npm、npx、yarn、pnpm 会用 sill 跑 `package.json` 脚本，除非你配置了 script shell；看起来是为 cmd.exe 写的脚本会给一行提示。
- `msvc-env [arch]` 把 Visual Studio 的 C/C++ 环境加载进 shell，带缓存，约 55 ms，对比 `vcvars64.bat` 的 2 s。
- 捆绑工具（全部为原生 Windows 程序）：内置 coreutils（uutils）与 `find`（uutils findutils，打印 `/` 路径，`-exec` 同样）；GNU 构建的 grep、sed、diffutils、make（UTF-8 代码页）；ripgrep、jq、busybox-w32（提供 awk、xargs、patch、gzip 等）；面向 Windows 的 `ps`、`pgrep`、`pkill`、`killall`、`kill`、`lsof`（文件与端口）、`file`、`cygpath`、`nohup`、`setsid`。

## 对应的研究问题

**1. 能力发现（AI 已能做哪些还没想到交给它的工作）**
原文给出的、以往在 Windows 上容易被放弃而交给模型的活儿：`#!` 脚本（`./gradlew` 这类）、Makefile 项目、用 `&` 起停 npm dev server、Unicode 路径、带 `%` 参数的 `.bat`、4000 文件规模的操作、MSVC 构建、`apply_patch` 文件编辑。这些都是“模型本来会做，但被 shell 边界卡掉”的任务，sill 把它们重新变成可交给智能体的工作。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
原文区分了两种接入形态：交互式 CLI harness（Claude Code、opencode）直接把 shell 后端指向 `bash.exe`；MCP 客户端（Codex CLI、Gemini CLI、Claude Desktop）则走 `bash.exe --mcp`，拿到 `bash` / `bash_output` / `bash_kill` 三件套，更适合含后台长任务的流程。原文还观察到：给出选择时，模型会把 shell 工作迁移到 sill，Gemini CLI 下是全部迁移，Codex 下是大部分。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
这是原文着墨最多的部分：PATH 与 `CLAUDE_CODE_GIT_BASH_PATH` / `SHELL` 的接线；不可见 UTF-8 控制台（不再每条命令弹窗，Windows 消息可读）；系统错误改用 POSIX 措辞；`$PWD`、`~`、`$HOME`、`$TMPDIR` 用 `C:/...` 形式且 `/c/...` 与 `/tmp` 在 shell 打开文件处可用（但不重写传给其他程序的参数）；长参数列表通过 args file 绕过 32,767 字符上限；捆绑缺失的 `make`/`rg`/`ps`/`lsof`；面向智能体的默认值（UTF-8 Python、无分页器/提示/更新提示、遥测关、.NET 与 MSBuild 英文输出）；MCP 的工具调用时长需允许到 11 分钟。

**4. 主动推进（哪些工作可由时间、事件或状态触发并持续完成）**
原文提供的是基础件而非触发器：`bash` 的 `run_in_background` 立即返回 job id，用于起服务或 watcher；`bash_output` 读新输出；`bash_kill` 停整棵进程树；超时（默认 2 分钟、最长 10 分钟）会结束命令及其启动的所有程序；每命令独立进程保证崩溃/挂死不带崩 server，遗留程序也占不住调用。原文没有内置定时或事件触发机制，需要由 harness 侧组合。

**5. 效果验证（怎样判断确实改善了结果）**
原文给了三类可复用的验证方法：自建一致性套件（`sill-bash-tests`，56 个用例，覆盖原生程序参数、路径、编码、行尾、进程、大小限制、`#!` 脚本、工具、错误，且每个用例写明“为什么重要”），同时通过 `bash.exe -c` 与 MCP server 两条路各跑一遍（各 56/56）；18 个带自动检查的端到端任务（含 Makefile 项目、起停 npm dev server、Unicode 路径、带 `%` 的 `.bat`、4000 文件、MSVC 构建），每任务两次；指标同时看通过数、失败调用次数和耗时。另有 `SILL_TRACE=<file>` 可把每次调用的 argv 与工作目录落成 JSON 行，用于事后审计。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：sill 直接提供其 Windows 侧的 shell 供给——`-ClaudeCode` 会把 `CLAUDE_CODE_GIT_BASH_PATH` 写进 `~\.claude\settings.json`（保留其他设置、备份 `.bak`）；原文还专门处理了 Claude Code 把 `>nul` 改写成 `>/dev/null` 的情况，sill 会读回 `nul`；`crates/sill` 中还有“回放 Claude Code shell 契约”的测试。
- **OpenCode（清单状态 watch）**：通过 `SHELL` 环境变量接 sill。
- **DeepSeek（清单状态 try）**：原文的 18 个端到端任务就是用 DeepSeek 的低成本模型跑的，可作为“换模型 + 换 shell 供给”组合的基线参考。
- **Semble（清单状态 try）**：与本文无关。
- 清单中没有与 sill 同类的“Windows 原生 Bash 供给层”条目。

## 证据与局限

**原文给出的数据**（均在 Windows 11 上，以 Git for Windows 自带的 Git Bash 为对照）：
- 一致性套件 56 例：GitHub `windows-2025` runner（en-US）上 sill 56/56、Git Bash 43/56；中文 locale（code page 936）笔记本上 sill 56/56、Git Bash 39/56；sill 在 `bash.exe -c` 与 MCP server 两条路上都是 56/56。
- 18 个端到端任务（每任务两次，中文 locale 笔记本）：Claude Code 下 sill 34/36 通过、120 次调用失败 1 次、493 s；Git Bash 35/36、154 次失败 8 次、637 s；PowerShell 35/36、141 次失败 9 次、777 s。opencode 下 sill 35/36、104 次失败 3 次、403 s；Git Bash 35/36、149 次失败 18 次、622 s；PowerShell 29/36、132 次失败 15 次、904 s。Codex CLI 下 sill 36/36、136 次失败 6 次、634 s；Git Bash 36/36、172 次失败 22 次、846 s；PowerShell 35/36、208 次失败 44 次、1094 s。
- MCP server 形态：Codex CLI 36/36、119 次失败 10 次、501 s（仅 PowerShell 时 35/36、208 次失败 44 次、1094 s）；Gemini CLI 36/36、90 次失败 5 次、335 s（仅 PowerShell 时 31/36、150 次失败 5 次、1195 s）。
- Bash 本身：brush 兼容套件以 Git Bash 为参照，Windows 上 2,911 个可运行用例通过 2,428 个（83%）。
- `msvc-env` 约 55 ms 对比 `vcvars64.bat` 的 2 s。

**属于作者主张、未经外部验证的部分**：一致性套件 `sill-bash-tests` 与全部端到端基准都由作者自建、自报，没有第三方复现；“pass counts are close, the difference is in the failed calls and the time” 是作者的解读；“模型会把 shell 工作迁移到 sill”基于一次实验的观察；`msvc-env` 的耗时是单点测量。仓库仅 41 stars，属早期项目。

**适用条件与限制**：仅 Windows；Bash 兼容性不是 100%，未覆盖的主要是 Unix 信号与作业控制（Windows 无等价物）、`coproc`、调试选项（`extdebug`、`functrace`）和少用的 `declare` 形式、以及 Git Bash 自身的差异（如 `/usr/bin` 路径）。原文“Known limits”另列出：Windows 无信号，INT/TERM 的 trap 会被接受并列出但只有 `EXIT`、`ERR`、`DEBUG`、`RETURN` 真正执行；不支持 `coproc`、Ctrl+Z 后的 `fg`、向程序传大于 2 的描述符、`exec -a`、`cp <(cmd) file`；进程替换传的是命名管道 `\\.\pipe\...`；提权运行时看不到普通会话映射的网络驱动器；没有 `sudo`、`apt`、`systemctl`，这些命令会失败并提示对应的 Windows 做法。MCP 客户端需把工具调用时长放宽到 11 分钟。非 Windows 环境对本条无意义。

## 怎么试、怎么验证

**最小试用（约半天，一台 Windows 机器）**
1. 记录基线：用现有 Git Bash（或 PowerShell）跑 3–5 个你日常真实任务，其中至少包含一个中文/Unicode 路径、一个 `package.json` 脚本或 npm dev server 起停、一个 `#!` 脚本或 Makefile、一个 `.bat`。记录失败调用次数、总耗时、需要人工介入的次数。
2. 用 Scoop 或安装脚本装 sill，先用 `-ClaudeCode`（或按 harness 表设 `SHELL`）接一个 harness，不要一次铺开。
3. 打开 `SILL_TRACE`，重跑同一批任务：

```
set SILL_TRACE=%USERPROFILE%\sill-trace.jsonl
```

4. 若流程里含后台服务，另开一轮把 harness 改成 MCP 形态（`-Mcp codex,gemini`），把工具调用时长上限设到 11 分钟，用 `bash` + `run_in_background` / `bash_output` / `bash_kill` 走完起停流程。

**判断有没有改善的指标**
- 失败调用次数与失败调用占比（原文最看重的正是这个，而不是通过率）；
- 端到端总耗时（wall clock）；
- 人工介入/重试次数；
- 乱码、路径错、参数被展开这三类错误是否归零；
- 是否还有控制台窗口闪出、后台服务是否还占住输出直到超时；
- 对照基线：同一批任务在 Git Bash / PowerShell 下的同项数值。

**回滚**：安装脚本对 `settings.json`、`config.toml` 等都是合并写入并存 `.bak`，出问题直接还原 `.bak`；Scoop 安装则 `scoop uninstall sill`。

**结论口径**：只有当失败调用次数和耗时同时下降、且原有的人工绕行步骤可以删掉时，才把 sill 写进手册作为 Windows 场景的标准配置；否则降级为“在含大量 shell 操作或非英文路径的 Windows 项目里试用”。
