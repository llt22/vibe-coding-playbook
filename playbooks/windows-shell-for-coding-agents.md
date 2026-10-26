# 在 Windows 上让编码 agent 把命令真正跑通

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在 Windows 上使用编码智能体时，命令失败往往不是模型不会做，而是 shell 与 Windows 的边界把参数、路径、编码、后台进程和缺失工具弄坏了；这篇手册给出用 sill 替换 shell 层并用对照验证的做法。
> 先试这一步：先在一台 Windows 机器上装好 sill，把 Claude Code 的 Bash 工具指向它的 bash.exe，然后拿你最常失败的 3–5 条命令做一次前后对照。
> 最近修订：2026-10-27

## 解决什么问题

在 Windows 上用 Claude Code、Codex CLI、Gemini CLI、opencode 这类编码智能体时，很多失败不在模型推理，而在 shell 与 Windows 的边界：`*` 和引号传给 `.exe`/`.bat` 时被重新展开或破坏，`/c/...` 与 `C:\...` 混用，非英文文本乱码，每条命令弹控制台窗口，后台服务占住输出管道直到超时，`make`/`rg`/`ps`/`lsof` 缺失。sill 是一个 Windows 原生 Bash，可作为 `bash.exe` 替换 shell 层，也可作为 MCP server 接入，让智能体发出的 shell 命令按 Linux 语义在 Windows 程序和文件上执行。这篇手册把“装、接、用、验证”串成一套可照做的流程。

## 适用与不适用

适用：
- 你在 Windows 上使用编码智能体，且已经观察到命令失败集中在 shell 边界，而不是模型不会改代码。
- 你需要 `#!` 脚本、Makefile、`./gradlew`、`npm` 脚本、Unicode 路径、带 `%` 的 `.bat`、后台 dev server、MSVC 构建、`apply_patch` 文件编辑等任务在 Windows 上跑通。
- 你愿意先在一台机器上小范围对照，再决定是否推广。

不适用：
- 非 Windows 环境。
- 现有 WSL 或 Git Bash 已经稳定，且没有上述边界失败；替换只会增加变量。
- 你需要的是 Linux 内核/系统调用层面的能力。原文把 sill 定位为 Windows 原生 Bash/shell 供给层，不是 WSL 的替代品；这类需求不在本文范围。

## 前置条件

- 一台 Windows 机器。
- 至少一个 harness：Claude Code、opencode、Codex CLI、Gemini CLI 或 Claude Desktop。
- 安装路径二选一：已装 Scoop；或能用 PowerShell 运行安装脚本，并已下载 release 的 `sill-windows-x64.zip` 与 `install-windows.ps1`。
- 只有从源码构建才需要：`rust-toolchain.toml` 指定的 Rust，以及 Visual Studio C++ 工具。
- 用 MCP 模式时，客户端允许的工具调用时长要能到 11 分钟；`bash` 自身超时默认 2 分钟、最长 10 分钟。

## 操作步骤

1. 选择安装方式。已经用 Scoop 就走做法 A；想一次性把 PATH 和 Claude Code 接好就走做法 B；如果还要给 Codex CLI、Gemini CLI、Claude Desktop 挂 MCP，在做法 B 上加 `-Mcp codex,gemini,claude`。

做法 A：Scoop 安装（前提：已装 Scoop）

```
scoop bucket add sill https://github.com/lemonadesaltbagel/scoop-sill
scoop install sill/sill
```

预期结果：`sill` 进入 PATH；可直接替换的 `bash.exe` 位于 `~\scoop\apps\sill\current\bash.exe`。

做法 B：PowerShell 安装脚本（前提：已下载 zip 和脚本）

```
powershell -ExecutionPolicy Bypass -File install-windows.ps1 -Zip sill-windows-x64.zip -AddToPath -ClaudeCode
```

预期结果：安装器解包到 `%LOCALAPPDATA%\Programs\sill`。`-AddToPath` 把 sill 加入用户 PATH；`-ClaudeCode` 在 `~\.claude\settings.json` 里把 Claude Code 的 Bash 工具指向 sill，其他设置保留，旧文件存为 `settings.json.bak`。加 `-Mcp codex,gemini,claude` 会把 sill 的 MCP server 合并写入 Codex CLI 的 `~\.codex\config.toml`、Gemini CLI 的 `~\.gemini\settings.json`、Claude Desktop 的 `%APPDATA%\Claude\claude_desktop_config.json`，旧文件存为 `.bak`，审批策略保持客户端里原有设置。原文声明机器上其他东西不会被改动；这是作者主张，装完仍要自己检查配置文件。

2. 记下 `bash.exe` 的路径。Scoop 安装用 `~\scoop\apps\sill\current\bash.exe`；脚本安装到 `%LOCALAPPDATA%\Programs\sill` 下找 `bash.exe`。接 harness 时要用这个路径。

3. 按 harness 接线。做法 A：交互式 CLI 直接换 shell 后端；做法 B：MCP 客户端挂 `--mcp`。怎么选：Claude Code、opencode 这类交互式 CLI 用做法 A；Codex CLI、Gemini CLI、Claude Desktop 或任意 MCP 客户端用做法 B；含后台长任务的流程更适合做法 B。

做法 A：交互式 CLI

| harness | 接法 |
|---|---|
| Claude Code | 设 `CLAUDE_CODE_GIT_BASH_PATH` = `...\sill\bash.exe`（即 `-ClaudeCode` 所做的事） |
| opencode | 设 `SHELL` = `...\sill\bash.exe` |

做法 B：MCP server

| harness | 接法 |
|---|---|
| Codex CLI、Gemini CLI、Claude Desktop | 用安装脚本的 `-Mcp codex,gemini,claude` 合并写入 |
| 任意 MCP 客户端 | 命令 `...\sill\bash.exe`，参数 `--mcp`（stdio）；允许工具调用时长最多到 11 分钟 |

预期结果：新开的 harness 会话把 shell 命令交给 sill。用第 8 步的 `SILL_TRACE` 确认实际调用的是 sill，而不是旧 shell。

4. 用 MCP 模式时，先弄清模型拿到的三个工具（前提：已按做法 B 挂上 `--mcp`）。

- `bash`：执行命令，返回 stdout、stderr 和退出码。工作目录和已 export 的变量会带到下一次调用，函数和 alias 不会。超时默认 2 分钟、最长 10 分钟，超时会结束该命令及其启动的所有程序。带 `run_in_background` 时立即返回 job id，用于启动服务或 watcher。
- `bash_output`：读取后台作业的新输出。
- `bash_kill`：停止后台作业及其启动的所有进程。

预期结果：长任务不会把 harness 的输出管道占死；每条命令在全新的 sill 进程里执行，崩溃或挂死不会带崩 server，命令遗留的程序也无法一直占住调用。

5. 按需调整行为（前提：需要改默认值；已设置的值不会被覆盖）。

| 变量 | 作用 |
|---|---|
| `SILL_NO_ENV_DEFAULTS=1` | 关闭默认值，连 sill 自身消息也不再是英文 |
| `LANG`、`LC_ALL`、`LC_MESSAGES` | 设为非英文时，sill 自身消息保持该语言 |
| `SILL_CONSOLE_CP` | 不可见控制台的代码页（默认 65001，UTF-8） |
| `SILL_TRACE=<file>` | 把每次调用的参数和工作目录以 JSON 行追加到文件，用于审计和复盘 |

面向智能体的默认值包括：UTF-8 Python；无分页器、无提示、无更新提示；遥测关闭；.NET 与 MSBuild 输出英文。这些都能用 `env` 看到。预期结果：不用逐条给智能体解释环境，默认行为已经偏向可自动化。

6. 需要从源码构建时（前提：Windows + `rust-toolchain.toml` 指定的 Rust + Visual Studio C++ 工具）。

```
cargo build --release -p sill
```

预期结果：产物为 `target\release\bash.exe`。捆绑工具在 Linux 上以 mingw-w64 交叉构建，脚本为 `scripts/build-busybox.sh`、`scripts/build-gnu-tools.sh`、`scripts/fetch-tools.sh`（固定版本并校验和）；打包用 `scripts/package-windows.ps1`，发行包校验用 `scripts/dist-check.sh`（在只含 Windows 自身目录的 PATH 上校验）。不需要改源码时跳过这一步。

7. 把候选任务迁到 sill 上试。装好即可验证这些能力：

- `#!` 脚本可直接跑：`./build.sh`、`./gradlew`、`#!/usr/bin/env python3`；`sh` 即 sill。
- 后台作业写法 `server > log 2>&1 &` 不会占住 harness 输出管道；`kill`、`pkill`、`killall` 结束整棵进程树，但不会杀 harness 或 Windows 会话进程。
- `apply_patch` 可从 stdin 或参数接 patch，并保留每个文件的行尾。
- npm、npx、yarn、pnpm 会用 sill 跑 `package.json` 脚本，除非你配置了 script shell；看起来是为 cmd.exe 写的脚本会给一行提示。
- `msvc-env [arch]` 把 Visual Studio 的 C/C++ 环境加载进 shell，带缓存，约 55 ms，对比 `vcvars64.bat` 的 2 s（作者给出的数字）。
- 捆绑工具（全部为原生 Windows 程序）：内置 coreutils（uutils）与 `find`（uutils findutils，打印 `/` 路径，`-exec` 同样）；GNU 构建的 grep、sed、diffutils、make（UTF-8 代码页）；ripgrep、jq、busybox-w32（提供 awk、xargs、patch、gzip 等）；面向 Windows 的 `ps`、`pgrep`、`pkill`、`killall`、`kill`、`lsof`（文件与端口）、`file`、`cygpath`、`nohup`、`setsid`。

预期结果：这些以前“模型本来会做、但被 shell 边界卡掉”的任务重新变成可交给智能体的工作。不要一次全上；先选你日常最常失败的任务。

8. 用 `SILL_TRACE` 和对照任务做验证。前提：已装好并接线；准备一个 Git Bash 对照环境。设 `SILL_TRACE=<file>`，让每次调用的参数和工作目录以 JSON 行追加到文件。选 3–5 个你实际失败过的任务，每个任务在 sill 和 Git Bash 下各跑两次，记录通过数、失败调用次数、耗时。预期结果：你能看到失败是减少了、转移了，还是只是换了一种报错；同时能复盘智能体到底发了哪些命令。

## 怎么判断变好了

可观察的指标：
- 同一任务清单的通过数：以“命令成功完成且产出符合预期”为准，不只看模型说完成。
- 失败调用次数：同一任务里 shell 报错、参数被改写、路径找不到、编码乱码、后台作业超时的次数。
- 耗时：从下发任务到产出可用结果的时间；作者在 18 个端到端任务里同时看通过数、失败调用次数和耗时。
- 过程信号：控制台窗口是否还频繁弹出、非英文文本是否还乱码、后台服务是否还占住输出管道、`make`/`rg`/`ps`/`lsof` 是否还缺。

最小试用方式：
- 先在一台机器、一个 harness 上装，不要全团队推。
- 用你自己的 3–5 个失败任务做前后对照，每个任务跑两次，sill 与 Git Bash 各一组。
- 用 `SILL_TRACE` 留调用记录，避免只凭感觉判断。
- 原文没有给出“试多久”的固定值；以一轮任务清单为最小试用，再根据失败调用次数是否稳定下降决定是否扩大。

作者给出的参考数据：自建一致性套件 56 个用例，在 GitHub `windows-2025` runner（en-US）上 sill 56/56、Git Bash 43/56；18 个带自动检查的端到端任务（含 Makefile 项目、起停 npm dev server、Unicode 路径、带 `%` 的 `.bat`、4000 文件、MSVC 构建），每任务两次，指标同时看通过数、失败调用次数和耗时。这些测试和基准都是作者自建、自报，不能直接当成你环境的结论。

## 常见坑

- 把作者的自测数据当成外部基准。套件和 18 个任务都是作者自建、自报；先小范围验证再推广。
- 安装脚本会改配置文件。`-ClaudeCode` 改 `~\.claude\settings.json`，`-Mcp` 改 `~\.codex\config.toml`、`~\.gemini\settings.json`、`%APPDATA%\Claude\claude_desktop_config.json`；虽然会备份 `.bak`、审批策略保持原设置，仍要打开文件核对。
- MCP 客户端没给够调用时长。`bash` 自身最长 10 分钟，但客户端要允许到 11 分钟；否则长任务会在客户端侧先失败。
- 以为 MCP 模式会保留函数和 alias。工作目录和已 export 的变量会带到下一次调用，函数和 alias 不会；每条命令在全新的 sill 进程里执行。
- 用普通 `&` 起长服务后等输出。超时会结束命令及其启动的所有程序；要起服务或 watcher 时用 `run_in_background`，再用 `bash_output` 读输出、`bash_kill` 收尾。
- 以为路径会被全局重写。`$PWD`、`~`、`$HOME`、`$TMPDIR` 用 `C:/...` 形式，`/c/...` 与 `/tmp` 在 shell 打开文件处可用，但传给其他程序的参数不会被重写；路径混用仍要自己验证。
- 忽略 Claude Code 对 `>nul` 的重写。原文专门处理了 Claude Code 把 `>nul` 改写成 `>/dev/null` 的情况，sill 会读回 `nul`；换其他 harness 时不要假设同样被处理。
- 把环境默认值当成永久生效。`SILL_NO_ENV_DEFAULTS=1` 会关掉默认值；已设置的值不会被覆盖。改之前先用 `env` 看当前值。
- 把 sill 当 WSL 用。原文定位是 Windows 原生 Bash/shell 供给层；需要 Linux 内核能力的工作不在本文范围。
- 只测“能不能跑”，不测“失败调用有没有减少”。作者同时看通过数、失败调用次数和耗时；只看最终结果会漏掉把失败转移给模型重试的情况。

## 证据与来源

本篇操作步骤来自调研《lemonadesaltbagel/sill》。可核对的数据与主张分开看：

- 安装命令、接线表、环境变量表、MCP 三个工具、超时与后台作业行为、源码构建脚本：来自该调研的原文整理，属于可直接照做的部分；其中“机器上其他东西不会被改动”是作者声明，不是独立验证。
- 一致性套件：56 个用例，覆盖原生程序参数、路径、编码、行尾、进程、大小限制、`#!` 脚本、工具、错误，每个用例写明“为什么重要”；在 GitHub `windows-2025` runner（en-US）上 sill 56/56、Git Bash 43/56。这是作者自建、自报的测试，不是第三方基准。
- 端到端任务：18 个带自动检查的任务，含 Makefile 项目、起停 npm dev server、Unicode 路径、带 `%` 的 `.bat`、4000 文件、MSVC 构建，每任务两次；指标为通过数、失败调用次数、耗时。原文用 DeepSeek 的低成本模型跑这组任务，可作为“换模型 + 换 shell 供给”的基线参考，但仍是作者自报。
- `SILL_TRACE=<file>`：把每次调用的 argv 与工作目录落成 JSON 行，用于审计和复盘；这是原文提供的可观察手段。
- 作者主张（尚未在本文独立验证）：给出选择时模型会把 shell 工作迁移到 sill，Gemini CLI 下是全部迁移、Codex 下是大部分；`msvc-env` 约 55 ms，对比 `vcvars64.bat` 的 2 s；超时会结束命令及其启动的所有程序；每条命令独立进程保证崩溃/挂死不带崩 server。
- 中文 locale（code page 936）的对照数据在材料中不完整，本文不引用具体数字；需要中文环境结论时按第 8 步自己复测。

## 依据的调研

- [lemonadesaltbagel/sill](../research/radar/2026-10-27/7309-lemonadesaltbagel-sill.md)：值得一试，在 Windows 上用 Claude Code / Codex / Gemini CLI 这类编码智能体时，先在一台机器上装 sill，并把 harness 接到它（直接指向 bash.exe，或挂它的 MCP server），替换 Git Bash 承担 shell 层。理由是原文提供了可直接复制的安装、接线和环境变量配置，并附了自测对照数据；但测试套件与基准都是作者自建、自报，需要自己小范围验证后再推广。
