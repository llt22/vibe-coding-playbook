# morluto/rea

- 结论：**值得一试**。如果确实存在“要搞懂无源码的应用/二进制/前端包”这类任务，可以按 README 的 `npx rea-agents setup` + 六步调查流程小范围试，并用 Evidence/limitations 与 reconstruction check 的 pass/fail/unknown 作为验收口径；它给出的是可直接照做的 agent+MCP 逆向调查流程（含命令、提示词、工具链和验证语义），但应用面局限在逆向与互操作场景，不适合当作通用工作方法推广。
- 原文：https://github.com/morluto/rea
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T16:33:14.207Z

## 是什么

REA（Reverse Engineer Anything）是一个 MCP 服务器 + CLI，把智能体接到逆向工程工具上，覆盖：原生二进制（Mach-O、ELF、PE、macOS `.app`，经 Hopper 或 Ghidra）、JavaScript/Electron 应用（含 ASAR、source map、IPC、原生插件，不运行应用即可静态映射）、.NET 程序集（元数据、CIL、构建对比）、网站（通过本机 Chrome 系浏览器的 loopback CDP 被动观察）、Android APK（Linux + headless JADX，静态）、固件（Linux 上调用者自备的 Binwalk/Unblob）。

它的核心模型是三段式：**Decompile（反编译取回可读代码、字符串、符号）→ Understand（顺着调用关系把功能搞懂）→ Recreate（按自己的技术栈、界面和需求重建这个特性）**。分析在本地运行，不上传到托管分析服务；每条结论带 Evidence 与 limitations，作者明确声明不声称恢复原始源码、也不自动克隆应用。

支持接入的 agent 包括 Claude Code、Claude Desktop、Codex、Cursor、Gemini CLI、Windsurf、Devin、OpenCode、Antigravity、GitHub Copilot CLI、Command Code、VS Code；其他 agent 可手工配置 MCP。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提（Requirements）：macOS 12+，或 Ubuntu 24.04+/Fedora 41+/64 位 Arch Linux；Node.js 22.x（≥22.19）/24.x（≥24.11）/26+；已装 npm。纯静态 JavaScript 检查只需要 Node/npm 运行时；原生二进制分析需要 Hopper（独立软件、独立 license，demo 有厂商定义的限额）或 Ghidra（需 **Ghidra 12.1.4** + **64 位 JDK 21**，macOS 上还需带本机架构的 native decompiler）。

1. **注册到 agent（推荐入口）**。先跑 setup，它会先展示改动再应用，并备份已有配置；已注册的 agent 默认选中，新检测到的 agent 只有被勾选才会写入；Hopper 是单独的、需要单独同意的选项。

```bash
npx rea-agents setup
```

2. **重启 agent，用自然语言直接提任务**（提示词原文）：

```text
Understand how search works in the Notes app, show me the evidence, and build a
similar feature for my project.
```

也可以一次给完整个任务：

```text
Reverse engineer the Notes app. Find how offline search works, explain it,
and build a version for my project using TypeScript and SQLite.
```

3. **不配置 MCP、不要 Hopper/Ghidra，也想先拿到一次结果**：对已提取的 JavaScript/Electron 目录或 ASAR 跑静态分析，返回内联的 Evidence、恢复出的图、limitations 与 unknowns，且不执行目标应用。

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

（Windows 上路径形如 `"D:/apps/example"`。原生应用要先配好对应引擎，再用 `analyze` 传该应用路径。）

4. **安装 `rea` CLI**（任选其一）。curl 路线需要本机已有 Node.js 和 npm：

```bash
curl -fsSL https://raw.githubusercontent.com/morluto/rea/main/install.sh | bash
```

```bash
npm install --global rea-agents
rea setup
```

更新用 `rea update`；如果用了 curl 安装，必要时把 `~/.local/bin` 加入 shell 的 `PATH`。

5. **只装 skill、不注册 MCP**（本步装的是 agent 指令，不是 MCP 注册或分析引擎）：

```bash
npx skills add morluto/rea --skill reverse-engineer-anything
```

它提示要走 skill 里的“按需连接”指引：如果缺注册，就先生成一份有范围的 `npx rea-agents setup` 计划，审阅并批准其实际改动，再重启/重连并验证工具是否可用。原文提示 skills.sh 路线用的是仓库指令，可能领先于已发布服务器版本。

6. **出问题先诊断，不要盲目重装**。`doctor` 只检查主机、依赖、分析工具和 agent 配置，不做修改：

```bash
npx -y rea-agents@latest doctor
```

Linux 上 Hopper 装在别处时显式指定后重跑 doctor：

```bash
export HOPPER_LAUNCHER_PATH=/absolute/path/to/Hopper
rea doctor --json
```

若 doctor 报“缺分析引擎”但文件存在，查共享库解析：

```bash
ldd /opt/hopper/bin/Hopper | grep 'not found'
```

装好缺的包后重跑 `rea setup`。默认路径：macOS `/Applications/Hopper Disassembler.app/Contents/MacOS/hopper`，Linux `/opt/hopper/bin/Hopper`；显式配置优先。

7. **接入已有的 Ghidra**（Ghidra 与 Java 必须已装好，REA 不下载也不改动它们）：

```bash
export GHIDRA_INSTALL_DIR=/absolute/path/to/ghidra_12.1.4_PUBLIC
export JAVA_HOME=/absolute/path/to/jdk-21 # optional when java and javac resolve from PATH
rea doctor --json
rea setup
rea providers --json
```

注意：打开 Ghidra 目标后的**第一个分析查询**会触发导入和自动分析，可能超过客户端默认的请求超时，原文建议参考其“首查询超时与恢复”文档。REA 分析的是目标的临时副本，会话关闭时删除临时工程。

8. **六步调查流程（把“搞懂一个功能”拆成可复用的步骤）**，这是最值得照搬的流程骨架：

| 步骤 | agent 做什么 | 用的 REA 工具 |
| ---: | --- | --- |
| 1 | 打开并识别二进制 | `open_binary`、`binary_overview` |
| 2 | 找离线搜索的线索 | `search_strings`、`search_procedures`、`list_names` |
| 3 | 把线索连到可执行代码 | `find_xrefs_to_name`、`xrefs`、`procedure_callers` |
| 4 | 重建控制流 | `get_call_graph`、`procedure_callees`、`procedure_info` |
| 5 | 反编译相关例程 | `procedure_pseudo_code`、`procedure_assembly`、`batch_decompile` |
| 6 | 在自己的项目里实现该特性 | agent 用自己常规的文件编辑与测试工具完成 |

关键分工：步骤 1–5 由 REA 承担，步骤 6 由 agent 用通用编码工具做——REA 不负责写你的产品代码。

9. **用 snapshot 固化并复用成功结果**（仅在目标字节、操作、参数、分析工具、设置全部匹配时复用；不缓存变更类和游标相关调用；snapshot 文件留在本地、仅属主可读写）：

```bash
rea analyze /absolute/path/to/app --snapshot /absolute/path/to/analysis/app.json
# The same exact query can be answered from that snapshot.
rea analyze /absolute/path/to/app --snapshot /absolute/path/to/analysis/app.json
```

MCP 会话里用 `open_binary` 的 `snapshot_path` 原子导入快照，用 `close_binary` 的 `snapshot_path`（必要时加 `overwrite: true`）在释放 Hopper 资源前原子保存；保存失败时 REA 会故意保持会话打开。

10. **证据的导入 / 导出 / 比较**（把结论变成可核验的产物）：

```bash
rea evidence-import /absolute/path/to/evidence/bundle.json
rea evidence-export /absolute/path/to/evidence/bundle.json /absolute/path/to/evidence/canonical.json
rea compare /absolute/path/to/evidence/left.json /absolute/path/to/evidence/right.json
```

导出不会覆盖已存在文件，除非显式加 `--overwrite`。

11. **导入历史源码作为参照**（与对当前应用的观察分开保存）：

```bash
rea import-reference-source /absolute/path/to/source
```

文件名不会自动导致省略；文件用哈希和元数据表示。要排除某些路径，设置环境变量 `REA_REFERENCE_SECRET_PATTERNS_JSON` 为 JSON 字符串数组（忽略模式）。

12. **被动观察已打开的浏览器页面**（CDP，loopback 端点 + 目标 ID；不导航、不点击、不执行页面 JS；凭据、cookie、授权头、原始 payload 不保留）：

```bash
rea list-browser-targets http://127.0.0.1:9222 --json
rea inspect-web-page http://127.0.0.1:9222 TARGET_ID --json
```

13. **受控浏览器场景**（可以真的操作页面，走 Playwright）：

```bash
rea capture-browser-scenario ./scenario.json --json
```

launch 模式自己开临时浏览器 profile 并在结束后删除；connect 模式只接一个精确的 loopback CDP 目标，断开时不关闭外部浏览器。scenario JSON 里只放密钥的引用和环境变量名，绝不放密钥值。

14. **Node / Electron 的 V8 Inspector 观察**（只记录脚本位置和执行上下文事件，不求值、不设断点）：

```bash
rea list-javascript-runtime-targets http://127.0.0.1:9229 --json
rea observe-javascript-runtime http://127.0.0.1:9229 TARGET_ID \
  --runtime-kind node --json
```

15. **卸载**（只移除 REA 自己注册的 MCP 条目和托管 skill，保留 Hopper、Node.js、Evidence 文件、captures、其他 skill 与其他 MCP 服务器；拒绝畸形客户端配置，且 purge 不跟随符号链接）：

```bash
rea uninstall
rea uninstall --purge-data # also removes only ~/.rea/cache and ~/.rea/state
```

CLI 与 agent 的路由选择（原文对照表）：想让 agent 自己调查并实现特性 → 跑 setup、重启、描述任务；想在终端里查/反编译某个部分 → `rea analyze` / `rea decompile`；想校验、规范化、比较 Evidence → `rea evidence-import` / `evidence-export` / `compare`；想不执行应用就映射本地 JS/Electron 应用 → `rea analyze PATH` 或 `analyze-javascript-application`；想复用不可变分析结果 → 给深层分析命令传 `--snapshot /path/to/analysis.json`；想导入历史源码 → `rea import-reference-source`；想抓取或比较受控进程行为 → `rea capture-process` / `compare-process-captures`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1）能力发现——哪些工作还没想到交给 AI。** 原文给出了一份可当候选清单的“agent 能做什么”：调查一个你喜欢的特性并重建为自有产品版本；在源码不可得时解释功能如何工作；重建认证、存储、更新、网络流；恢复足够结构以记录未文档化的格式或接口；从一个字符串或符号追到实现该行为的代码；把恢复出的行为转成产品特性、测试、迁移说明、移植或可互操作替代品；分析 Swift 和 Objective-C 元数据而不必手工拆解每个名字修饰；在 Hopper 里留下名字、注释和书签，让人工与 agent 分析互相加强。工具族与数量（原生检查 41、调查工作流 14、原生 macOS 工具 7、artifact graph 5、托管 PE/CLI 7、固件 2、Android APK 5、浏览器观察 9、Electron 分析 5、JavaScript 运行时 2、应用工作流 7、工作区与观察 21）也是能力边界的直接刻度。

**2）任务匹配——什么工作配什么模型、工具、协作方式。** 原文明确区分了四种协作方式：agent+MCP（推荐）、CLI 单点操作、只装 skill 不注册 MCP、以及“只求一次终端结果”。并给出能力—依赖的对应关系：静态 JS 检查只需要 Node/npm；原生分析需要 Hopper 或 Ghidra；Ghidra 需要 12.1.4 + 64 位 JDK 21；Android 静态 APK 需要单独提供的 headless JADX JAR 和 Java，不用模拟器也不执行 APK；固件要用调用者自备的 Binwalk/Unblob。六步表中的明确边界——REA 做 1–5 步，第 6 步由 agent 用自己的编码/测试工具完成——是“工具分工”最直接的一条依据。

**3）条件供给——需要提供哪些信息、工具、权限和反馈。** 需要准备/提供：setup 时的 agent 选择与改动批准；Hopper 安装的单独同意或 `HOPPER_LAUNCHER_PATH`；`GHIDRA_INSTALL_DIR` 和可选 `JAVA_HOME`；目标路径（目录 / `.asar` / 二进制）；浏览器场景的 CDP 端点、target ID、scenario JSON（内含密钥引用和环境变量名，不含密钥值）；snapshot 路径；以及 `REA_REFERENCE_SECRET_PATTERNS_JSON` 排除模式。反馈层面：Evidence bundle（含 artifact 身份、provider、位置、置信度、limitations）、以及 open questions（未解决发现、矛盾、后续探测）。

**4）主动推进——哪些工作可由时间、事件或状态触发并持续完成。** 原文支持的是“状态驱动”的部分：snapshot 在五项要素匹配时自动复用已成功的分析结果；open questions 用来跟踪未解决发现、矛盾和后续探测；`rea compare` / 进程/浏览器/Electron 场景比较用来做回归式对照。Roadmap 里写着“把更多静态提取器和运行时观察接入 feature traces”“扩展 .NET 分析（混淆程序集比较）”“扩展进程、协议、文件系统、重连和版本比较覆盖”。但原文**没有给出任何定时任务、事件钩子或常驻监听的配置**，所以这一条只能算部分成立，不能当作可直接照做的自动化调度方案。

**5）效果验证——怎样判断确实改善了结果。** 原文给出的验证口径相当具体且可照做：`doctor` 检查主机/依赖/分析工具/agent 配置（可用 `--json`）；Evidence 带 artifact 身份、provider、位置、置信度和 limitations；`rea compare` 比较两份证据；reconstruction checks 明确报 pass / fail / unknown，**不把缺失证据当成 pass**；受控场景比较中，“缺失或被截断的观察不能证明两次运行行为一致”；snapshot 只在目标字节、操作、参数、分析工具、设置全部匹配时复用。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：原文把 Claude Code 列为 setup 支持的 agent 之一；setup 会为其加入 MCP 访问和 REA 的引导工作流。可以直接和清单里已有的 Claude Code 用法叠加。
- **Cursor（watch）**、**OpenCode（watch）**：原文均列为支持的 agent。
- **GitHub Copilot（drop）**：原文列出 GitHub Copilot CLI 和 VS Code 支持，可据此复核清单里该项的 drop 判断是否过时。
- **skills.sh（try）**：原文给出 `npx skills add morluto/rea --skill reverse-engineer-anything`，并提示该路线使用仓库指令、可能领先于已发布 npm 版本。
- **Semble（try）**：原文未提及，无法对照。
- **Trendshift（watch）**：原文中只是一个徽章链接，无实质内容可对照。

## 证据与局限

**原文给出的、可核对的数字与事实**：工具族数量表（原生检查 41、调查工作流 14、原生 macOS 工具 7、artifact graph 5、托管 PE/CLI 7、固件 2、Android APK 5、浏览器观察 9、Electron 分析 5、JS 运行时 2、应用工作流 7、工作区与观察 21）；Windows x64 Ghidra P0 支持本地 NTFS 上原生、非托管、非 DLL 的 x86-64 PE 应用，共 **25 个只读操作**（Windows P0 无写入权限，Linux/macOS 的 Ghidra 额外支持会话内的函数名与入口注释原子编辑）；Ghidra 要求 12.1.4 与 64 位 JDK 21；平台与 Node 版本要求；引导式工作流有 6 个 MCP 调查工作流；`annotate_native_function` 只改会话数据库中的名字和入口注释，不修改可执行字节。指标给出的 7,776 stars、今日 2,963，来自仓库趋势指标而非原文正文。

**作者自己的主张（非第三方验证）**：“分析在本地运行”“不把应用上传到托管分析服务”“凭据、cookie、授权头、原始 payload 不保留”“结果包含每条结论背后的证据与局限”。原文没有给出第三方评测、准确率数字或人工对照实验。

**作者主动声明的局限**：不声称恢复原始源代码、不自动克隆应用；反编译产出的是伪代码而非原始源码；动态和含糊的关系仍保持未解决；被动浏览器观察不导航、不点击、不求值页面 JS，且无法观察它接入之前发生的活动；V8 Inspector 观察不推断 import 关系、事件活动、IPC、进程身份或 Electron 角色；缺失观察不能证明两次运行行为一致；GitHub 仓库 main 可能领先于 npm 发布版（期望某个能力前要先看发布边界）。

**适用条件**：Windows 只在 P0 范围支持有限的原生 PE 只读分析；静态 Android APK 只在 Linux 上经 headless JADX 验证；固件分析只在 Linux 且需自备 Binwalk/Unblob；macOS DMG 遍历还依赖主机原生挂载支持；原生分析需要 Hopper 或 Ghidra，二者都是有额外许可/安装成本的独立软件；Linux 上的 Hopper demo 需要 Xvfb、Python 3、X11、XTEST。

## 怎么试、怎么验证

**最小试用（不需要 Hopper/Ghidra，不执行目标应用）**：在一台 macOS 或受支持 Linux 上装好 Node 22+，选一个**你自己拥有或已获授权**的 JavaScript/Electron 应用目录或 `.asar`，跑：

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

先判断三件事：（a）返回的调用图/模块/路由/IPC 结构是否与你已知的事实一致；（b）内联 Evidence 是否足以支撑结论（人能否按它复核）；（c）limitations 与 unknowns 是否诚实（有没有把未知写成已知）。

**第二步（接入 agent，验证端到端流程）**：`npx rea-agents setup` 选定清单里 adopt 的 Claude Code，重启后用原文提示词让 agent 解释某一个具体功能并重建一个最小特性，观察它是否按六步走、是否在第 6 步正确切回通用编码工具。

**判断有没有改善的指标**：
- 从提出“这个功能怎么实现的”到能给出可核验解释的耗时（对照不用 REA、纯人工读码/搜索的基线）；
- 结论可被 Evidence 支持的比例，以及被人工复核推翻的比例；
- unknowns/limitations 是否被如实标出（出现“把缺失证据当 pass”即为失败信号）；
- 重建出来的特性在自有测试集上的通过率，以及 reconstruction check 的 pass/fail/unknown 分布；
- 同一查询第二次运行时 snapshot 是否按五项要素匹配命中，复用时是否省下重跑引擎的时间；
- `rea doctor --json` 输出在试用前后是否稳定（环境可复现性）。

**红线**：只对已获授权、你有权分析的目标使用；CDP / Inspector 观察会接触到运行中的浏览器与 Node 进程，先确认不违反所在环境的合规要求；不要用 `rea import-reference-source` 导入无权限的源码。
