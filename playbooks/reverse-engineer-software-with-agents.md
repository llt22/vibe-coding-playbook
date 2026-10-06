# 在没有源码时，让 agent 有证据地搞懂一个功能再重建

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当需要搞懂没有源码的应用、二进制或前端包（例如要复刻它的离线搜索）时，怎么让编码 agent 按固定流程调查、每步都给出证据和限制，而不是靠猜。
> 先试这一步：先在单个已提取的 JS/Electron 目录上跑一次 `npx -y rea-agents@latest analyze-javascript-application <绝对路径> --json`，不装 Hopper/Ghidra，用一次带 Evidence/limitations 的结果判断这套流程值不值得继续。
> 最近修订：2026-10-07

## 解决什么问题

当目标没有源码——原生二进制、Electron/JS 前端包、.NET 程序集、APK、固件，或一个已经打开的网页——而你需要搞懂它的某个功能是怎么实现的，并在自己的项目里重建，靠“让 agent 随便看看”通常只会得到看着合理但无法核验的猜测。

REA 给出的是一条可以照做的主线：**Decompile（反编译取回可读代码、字符串、符号）→ Understand（顺着调用关系把功能搞懂）→ Recreate（按自己的技术栈、界面和需求重建这个特性）**，并让每条结论带上 Evidence 与 limitations。

注意它的边界：这是一个 agent + MCP 的逆向调查流程，不是通用工作方法；作者明确不声称恢复原始源码，也不自动克隆应用。

## 适用与不适用

**适用**（逆向与互操作场景）：

- 原生二进制：Mach-O、ELF、PE、macOS `.app`，经 Hopper 或 Ghidra
- JavaScript/Electron 应用：含 ASAR、source map、IPC、原生插件，**不运行应用**即可静态映射
- .NET 程序集：元数据、CIL、构建对比
- 网站：通过本机 Chrome 系浏览器的 loopback CDP **被动观察**
- Android APK：Linux + headless JADX，静态
- 固件：Linux 上调用者自备的 Binwalk/Unblob

**不适用**：把它当作通用工作方法推广。调研结论本身就指出，它“应用面局限在逆向与互操作场景，不适合当作通用工作方法推广”。如果你的问题不是“搞懂别人的东西并重建”，这套流程没有用武之地。

分析在本地运行，不上传到托管分析服务。

## 前置条件

- 系统：macOS 12+，或 Ubuntu 24.04+ / Fedora 41+ / 64 位 Arch Linux
- Node.js 22.x（≥22.19）/ 24.x（≥24.11）/ 26+，已装 npm
- 纯静态 JavaScript 检查只需要 Node/npm 运行时
- 原生二进制分析需要 Hopper（独立软件、独立 license，demo 有厂商定义的限额）或 Ghidra（需 **Ghidra 12.1.4** + **64 位 JDK 21**，macOS 上还需带本机架构的 native decompiler）
- 可接入的 agent：Claude Code、Claude Desktop、Codex、Cursor、Gemini CLI、Windsurf、Devin、OpenCode、Antigravity、GitHub Copilot CLI、Command Code、VS Code；其他 agent 可手工配置 MCP

## 操作步骤

### 做法 A：注册到 agent，跑一次完整的“搞懂 + 重建”

1. 跑 setup 注册到 agent。前提：已装 Node/npm。setup 会先展示改动再应用，并备份已有配置；已注册的 agent 默认选中，新检测到的 agent 只有被勾选才会写入；Hopper 是单独的、需要单独同意的选项。预期结果：MCP 注册写入成功，重启 agent 后工具可用。

```bash
npx rea-agents setup
```

2. 重启 agent，用自然语言直接提任务（提示词原文）：

```text
Understand how search works in the Notes app, show me the evidence, and build a
similar feature for my project.
```

也可以一次给完整个任务：

```text
Reverse engineer the Notes app. Find how offline search works, explain it,
and build a version for my project using TypeScript and SQLite.
```

3. 按六步调查流程推进（这是最值得照搬的骨架）。前提：目标已能被 REA 打开。预期结果：每一步产出可回溯的线索，而不是结论式猜测。

| 步骤 | agent 做什么 | 用的 REA 工具 |
| ---: | --- | --- |
| 1 | 打开并识别二进制 | `open_binary`、`binary_overview` |
| 2 | 找离线搜索的线索 | `search_strings`、`search_procedures`、`list_names` |
| 3 | 把线索连到可执行代码 | `find_xrefs_to_name`、`xrefs`、`procedure_callers` |
| 4 | 重建控制流 | `get_call_graph`、`procedure_callees`、`procedure_info` |
| 5 | 反编译相关例程 | `procedure_pseudo_code`、`procedure_assembly`、`batch_decompile` |
| 6 | 在自己的项目里实现该特性 | agent 用自己常规的文件编辑与测试工具完成 |

4. 第 6 步由 agent 用通用编码工具完成，REA 不负责写你的产品代码。预期结果：重建出来的特性能在你自己的技术栈里跑通并有测试。

### 做法 B：不配 MCP、不要 Hopper/Ghidra，先拿一次结果

5. 对已提取的 JavaScript/Electron 目录或 ASAR 跑静态分析，返回内联的 Evidence、恢复出的图、limitations 与 unknowns，且不执行目标应用。前提：目标已经是提取好的目录/ASAR 路径。

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

（Windows 上路径形如 `"D:/apps/example"`。原生应用要先配好对应引擎，再用 `analyze` 传该应用路径。）

### 做法 C：只装 skill、不注册 MCP

6. 本步装的是 agent 指令，不是 MCP 注册或分析引擎。

```bash
npx skills add morluto/rea --skill reverse-engineer-anything
```

它会提示走 skill 里的“按需连接”指引：如果缺注册，先生成一份有范围的 `npx rea-agents setup` 计划，审阅并批准其实际改动，再重启/重连并验证工具是否可用。原文提示：skills.sh 路线用的是仓库指令，可能领先于已发布服务器版本。

### 做法 D：安装 `rea` CLI

7. 任选其一。curl 路线需要本机已有 Node.js 和 npm。

```bash
curl -fsSL https://raw.githubusercontent.com/morluto/rea/main/install.sh | bash
```

```bash
npm install --global rea-agents
rea setup
```

更新用 `rea update`；如果用了 curl 安装，必要时把 `~/.local/bin` 加入 shell 的 `PATH`。

### 怎么选

原文对照表：想让 agent 自己调查并实现特性 → 做法 A；想在终端里查/反编译某个部分 → `rea analyze` / `rea decompile`；想校验、规范化、比较 Evidence → `rea evidence-import` / `evidence-export` / `compare`；想不执行应用就映射本地 JS/Electron 应用 → `rea analyze PATH` 或 `analyze-javascript-application`；想复用不可变分析结果 → 给深层分析命令传 `--snapshot /path/to/analysis.json`；想导入历史源码 → `rea import-reference-source`；想抓取或比较受控进程行为 → 受控浏览器场景 / V8 Inspector。

8. 出问题先诊断，不要盲目重装。`doctor` 只检查主机、依赖、分析工具和 agent 配置，不做修改。

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

9. 接入已有的 Ghidra（Ghidra 与 Java 必须已装好，REA 不下载也不改动它们）：

```bash
export GHIDRA_INSTALL_DIR=/absolute/path/to/ghidra_12.1.4_PUBLIC
export JAVA_HOME=/absolute/path/to/jdk-21 # optional when java and javac resolve from PATH
rea doctor --json
rea setup
rea providers --json
```

注意：打开 Ghidra 目标后的**第一个分析查询**会触发导入和自动分析，可能超过客户端默认的请求超时，原文建议参考其“首查询超时与恢复”文档。REA 分析的是目标的临时副本，会话关闭时删除临时工程。

10. 用 snapshot 固化并复用成功结果：

```bash
rea analyze /absolute/path/to/app --snapshot /absolute/path/to/analysis/app.json
# The same exact query can be answered from that snapshot.
rea analyze /absolute/path/to/app --snapshot /absolute/path/to/analysis/app.json
```

MCP 会话里用 `open_binary` 的 `snapshot_path` 原子导入快照，用 `close_binary` 的 `snapshot_path`（必要时加 `overwrite: true`）在释放 Hopper 资源前原子保存；保存失败时 REA 会故意保持会话打开。

11. 证据的导入 / 导出 / 比较（把结论变成可核验的产物）：

```bash
rea evidence-import /absolute/path/to/evidence/bundle.json
rea evidence-export /absolute/path/to/evidence/bundle.json /absolute/path/to/evidence/canonical.json
rea compare /absolute/path/to/evidence/left.json /absolute/path/to/evidence/right.json
```

导出不会覆盖已存在文件，除非显式加 `--overwrite`。

12. 导入历史源码作为参照（与对当前应用的观察分开保存）：

```bash
rea import-reference-source /absolute/path/to/source
```

文件名不会自动导致省略；文件用哈希和元数据表示。要排除某些路径，设置环境变量 `REA_REFERENCE_SECRET_PATTERNS_JSON` 为 JSON 字符串数组（忽略模式）。

13. 被动观察已打开的浏览器页面（CDP，loopback 端点 + 目标 ID；不导航、不点击、不执行页面 JS；凭据、cookie、授权头、原始 payload 不保留）：

```bash
rea list-browser-targets http://127.0.0.1:9222 --json
rea inspect-web-page http://127.0.0.1:9222 TARGET_ID --json
```

14. 受控浏览器场景（可以真的操作页面，走 Playwright）：

```bash
rea capture-browser-scenario ./scenario.json --json
```

launch 模式自己开临时浏览器 profile 并在结束后删除；connect 模式只接一个精确的 loopback CDP 目标，断开时不关闭外部浏览器。scenario JSON 里只放密钥的引用和环境变量名，绝不放密钥值。

15. Node / Electron 的 V8 Inspector 观察（只记录脚本位置和执行上下文事件，不求值、不设断点）：

```bash
rea list-javascript-runtime-targets http://127.0.0.1:9229 --json
rea observe-javascript-runtime http://127.0.0.1:9229 TARGET_ID \
  --runtime-kind node --json
```

16. 卸载（只移除 REA 自己注册的 MCP 条目和托管 skill，保留 Hopper、Node.js、Evidence 文件、captures、其他 skill 与其他 MCP 服务器；拒绝畸形客户端配置，且 purge 不跟随符号链接）：

```bash
rea uninstall
rea uninstall --purge-data # also removes only ~/.rea/cache and ~/.rea/state
```

## 怎么判断变好了

- **验收口径**：每条结论是否带 Evidence 与 limitations；reconstruction check 是否给出明确的 pass / fail / unknown，而不是“看起来懂了”。出现 unknown 时应当继续调查或明确标注为未知，不能当结论用。
- **最小试用方式**：做法 B。对一个已提取的 JS/Electron 目录跑一次静态分析，不需要 Hopper/Ghidra，不改动目标、不执行目标应用，观察它能否返回内联 Evidence、恢复出的图与 limitations/unknowns。
- **另外两个观察点**：第 6 步重建出的特性能否在你自己的技术栈里通过测试；导出的 Evidence 经 `compare` 后能否复现同一结论。
- **试多久**：调研没有给出时长建议或量化收益数字，因此不要假定成功率、节省时间之类的指标；建议以“一次完整小调查（一个功能点，走完六步）”为观察单位，再决定是否扩大使用范围。

## 常见坑

- 把 REA 当成通用工作方法。调研结论明确说它只适合逆向与互操作场景。
- 以为它会恢复原始源码或自动克隆应用。作者明确声明不声称这两点；REA 也不写你的产品代码。
- doctor 报“缺分析引擎”但文件明明存在：先查共享库解析（`ldd /opt/hopper/bin/Hopper | grep 'not found'`），再重跑 `rea setup`，不要盲目重装。
- Hopper 装在非默认路径却没配显式路径：默认路径 macOS `/Applications/Hopper Disassembler.app/Contents/MacOS/hopper`、Linux `/opt/hopper/bin/Hopper`，显式配置优先，可用 `HOPPER_LAUNCHER_PATH` 指定。
- Ghidra 目标的第一个分析查询会触发导入和自动分析，可能超过客户端默认请求超时；按原文的“首查询超时与恢复”处理。REA 分析的是临时副本，会话关闭即删除临时工程。
- snapshot 只在目标字节、操作、参数、分析工具、设置全部匹配时才能复用；不缓存变更类和游标相关调用；snapshot 文件留在本地、仅属主可读写；保存失败时 REA 会故意保持会话打开。
- `evidence-export` 不会覆盖已存在文件，除非显式加 `--overwrite`。
- `import-reference-source` 的文件名不会自动导致省略，文件用哈希和元数据表示；要排除路径得自己设 `REA_REFERENCE_SECRET_PATTERNS_JSON`。
- 浏览器 scenario JSON 里只放密钥的引用和环境变量名，绝不放密钥值。
- 走 skills.sh 路线时注意：仓库指令可能领先于已发布服务器版本。
- 卸载 `rea uninstall` 只移除 REA 自己注册的 MCP 条目和托管 skill，保留 Hopper、Node.js、Evidence 文件、captures、其他 skill 与其他 MCP 服务器；`--purge-data` 也只删 `~/.rea/cache` 和 `~/.rea/state`。

## 证据与来源

- 本文所有命令、路径、版本要求（macOS 12+ / Ubuntu 24.04+ 等系统要求、Node.js 版本区间、Ghidra 12.1.4 + 64 位 JDK 21）、六步调查流程与所用工具名、snapshot 与 Evidence 的语义、浏览器与 V8 Inspector 的观察边界、卸载行为，均来自调研报告 **morluto/rea**（REA 仓库 README）。
- 作者主张（非实测数据）：不声称恢复原始源码、也不自动克隆应用；分析在本地运行、不上传到托管分析服务；snapshot 的复用条件与不缓存范围；`doctor` 只检查不修改。
- 调研作者对适用面的判断（“应用面局限在逆向与互操作场景，不适合当作通用工作方法推广”）是结论性主张，不是量化数据。
- 材料没有给出成功率、时间节省等任何量化收益数字，本文也不据此做承诺。

## 依据的调研

- [morluto/rea](../research/radar/2026-10-07/1608-morluto-rea.md)：值得一试，如果确实存在“要搞懂无源码的应用/二进制/前端包”这类任务，可以按 README 的 `npx rea-agents setup` + 六步调查流程小范围试，并用 Evidence/limitations 与 reconstruction check 的 pass/fail/unknown 作为验收口径；它给出的是可直接照做的 agent+MCP 逆向调查流程（含命令、提示词、工具链和验证语义），但应用面局限在逆向与互操作场景，不适合当作通用工作方法推广。
