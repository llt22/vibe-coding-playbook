# MXC - a sandboxed code execution system

- 结论：**值得一试**。建议小范围试：在 Linux/macOS 上用 Node SDK 按 README 的片段以 egress 默认 deny + 超时启动容器，跑一段模型生成代码并回收 stdout，先验证越权用例确实被拦。理由是原文给出了可安装的 SDK、可复制的调用片段和 --debug/--audit 诊断命令，但完整策略 JSON 与接入 agent 主循环的做法未给出，故只到 try。
- 原文：https://github.com/microsoft/mxc
- 来源：hn，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-09T10:44:03.631Z

## 是什么

MXC（Microsoft eXecution Container）是一个**沙箱化代码执行系统**，用于在 Windows、Linux、macOS 上运行不可信代码（model output、plugins、tools）。它把从 OS 原生进程沙箱到完整 VM 的多种隔离后端，统一在同一个 containment 模型与带类型的 SDK 之后。

原文 README 列出的能力：

- **跨平台**：Windows / Linux / macOS，各自使用平台适配的 containment 后端
- **JSON 配置**：版本化的容器创建请求与安全策略
- **多后端**：ProcessContainer、Windows Sandbox、LXC、Bubblewrap、Seatbelt、MicroVM (Nanvix)、Hyperlight、IsolationSession、WSLC
- **策略驱动**：文件系统策略（只读、读写、拒绝路径清单）、网络策略（代理、出站控制、按后端的主机过滤）、UI 策略（剪贴板、显示、GUI 访问）
- **状态感知生命周期**：provision、start、execute、stop、deprovision 持久容器
- **Rust / .NET / Node SDK**：支持一次性（one-shot）与状态感知（state-aware）执行
- **诊断**：理解容器内 access-denied 失败的工具

形态是 **SDK 依赖，编译进你的应用**：应用指定容器类型、containment 规则和工作负载命令，MXC 校验请求、选择后端、启动工作负载。

## 具体做法

1. **安装 SDK**（前提：不需要 clone 仓库，按语言用包管理器装）。
   - Rust：`https://crates.io/crates/mxc-sdk`（该 crate 会把 MXC SDK、引擎和所选后端一并编译进调用方应用）
   - .NET：`https://www.nuget.org/packages/Microsoft.Mxc.Sdk`（包内含原生运行时资产）
   - Node：`https://www.npmjs.com/package/@microsoft/mxc-sdk`（包内含原生运行时资产）

2. **在应用里发起一次受控执行**（原样摘自 README 的 Node 片段）：

```typescript
import { spawn, type ContainerRequest } from '@microsoft/mxc-sdk/v1';

const request: ContainerRequest = {
  command: 'node -e "console.log(\'hello from container\')"',
  network: { egress: { default: 'deny' } },
  timeoutMs: 30_000,
};

const child = await spawn(request);
```

   请求至少要给 `command`；`network`、`timeoutMs` 是示例中出现的字段。更完整的可运行样例见仓库 `samples/run-with-io-stdio-streaming/`，API 参考见 `docs/api-reference/`。

3. **对照运行平台选择后端**：

| Runtime platform | Default backend | Other backends | Minimum host OS |
|---|---|---|---|
| Windows 11 x64 / ARM64 | `processcontainer` | `windows_sandbox`\*, `wslc`, `microvm`\*, `hyperlight`\*, `isolation_session` | [Windows OS-version support](docs/backends/process-container/os-version-support.md)|
| Linux x64 / ARM64 | `bubblewrap` | `lxc`, `microvm`, `hyperlight` | - |
| macOS ARM64 / x64 | `seatbelt` | - | - |

   带 \* 的后端为 **experimental**。各后端的前置条件与行为见 `docs/backends/`。

4. **跑不通时打开诊断**（前提：原生 executor 默认把 stdin/stdout/stderr 留给工作负载，所以 MXC 自身的诊断要显式打开）：

```bash
wxc-exec.exe --debug config.json
```

5. **为可信工具反推策略时用审计模式**（前提：仅受支持的 Windows 版本；原文字面警告如下）。

   > **Warning:** `--audit` turns off all sandbox security for the workload being analyzed. Never use it to run untrusted code.

```bash
wxc-exec.exe --audit policy.json
```

   MXC 会记录观察到的访问并产出策略编写工件。给不可信代码补权限应走 `docs/logging-access-denied.md` 里的 deny-and-record 流程，而不是 `--audit`。

6. **需要持久隔离环境时用状态感知生命周期**：provision → start → execute → stop → deprovision（概述见 `docs/container-lifecycle.md`），SDK 提供一次性与状态感知两类 API。

7. **源码构建**（前提：仅在开发 MXC、修改原生运行时、或想用独立 executor 二进制而非打包 SDK 时）。构建前置条件：Rust（由 `src/rust-toolchain.toml` 固定为 **1.93**）、Node.js 24 或更高版本与 npm、所选后端要求的平台工具链与前置条件。

```bash
build.bat --all             # Windows: Release build for current architecture
```

```bash
./build.sh --all            # Linux: Release build
```

```bash
./build-mac.sh --all        # macOS: Release build for native architecture
```

8. **非 SDK 用法**：平台专用 executor 二进制（如 `wxc-exec.exe`）接受 `schemas/stable/` 定义的稳定 schema 的 JSON 容器创建请求，用于测试，或 SDK 无法嵌入应用时。

9. **遥测默认关闭**：需同时满足运行级 opt-in、Windows 用户明示同意、管理策略允许、应用在容器请求中启用遥测选项；管理员只能阻止、不能代用户同意；非 Windows 平台为 no-op，本地开源构建不向 Microsoft 发送。

## 对应的研究问题

1. **能力发现**：原文明确把 model output、plugins、tools 列为要运行的不可信代码——即“让 AI 生成的代码真正跑起来并回收结果”这件事本身可以交给它，而不必每次人工审查后才执行。
2. **任务匹配**：按平台选后端（Windows 默认 `processcontainer`、Linux 默认 `bubblewrap`、macOS 默认 `seatbelt`，另有 LXC / MicroVM / Hyperlight / WSLC 等）；SDK 以进程内方式编译进应用；API 分为一次性与状态感知两类；提供 Rust / .NET / Node 三种语言 SDK。
3. **条件供给**：调用方必须提供容器类型、containment 规则（文件系统 / 网络 / UI 策略）和工作负载命令；请求是版本化 JSON；权限通过策略授予（只读、读写、拒绝路径清单；示例中出站默认 deny）；反馈来自 diagnostics、`--debug` 输出与访问拒绝日志。
4. **主动推进**：原文给出状态感知生命周期（provision / start / execute / stop / deprovision）与持久容器，是可支撑持续运行的机制；但原文没有给出时间、事件或状态触发器的设计。
5. **效果验证**：原文提供诊断工具定位 container 内 access-denied、审计模式记录观察到的访问并产出策略编写工件、logging access-denied 文档；这些是“让执行能跑通”的验证手段，原文没有给出“是否改善了业务结果”的指标。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

- **证据来源**：GitHub 仓库 README（输入注明 source_note 为“依据仓库 README”），属项目一手文档。原文未给性能数字、对比基准或落地案例；“跨平台”“后端清单”“遥测默认关闭”等均为项目自述，无第三方验证数据。
- **原文未给出的关键信息**：完整的策略 JSON 示例、把 MXC 接进 agent 主循环（超时后如何处理、结果回收格式、重试）的做法、各后端实际隔离强度对比。这些需按 README 指向的 `docs/backends/`、`docs/api-reference/`、`schemas/stable/` 继续查证。
- **原文自述的限制**：`windows_sandbox`、`microvm`、`hyperlight` 标注为 experimental；`--audit` 会关闭被分析工作负载的全部沙箱安全，绝不能用于不可信代码；审计模式仅在部分 Windows 版本可用。
- **前置条件较新**：源码构建要求 Rust 1.93（由 `src/rust-toolchain.toml` 固定）、Node.js 24+。
- **适用条件**：需要把执行能力嵌入自己的应用、并愿意按平台挑后端、调策略；若只是偶尔跑一段生成代码，用现成容器/沙箱可能更省事（此句为推论，非原文主张）。

## 怎么试、怎么验证

最小试用（Linux 或 macOS + Node SDK）：

1. 安装 `@microsoft/mxc-sdk`，照 README 的 Node 片段写脚本：`command` 换成一端模型生成的短脚本，保留 `network: { egress: { default: 'deny' } }` 与有限 `timeoutMs`（示例为 30_000）。
2. 跑三组用例：(a) 只读写允许目录的脚本——应成功并回收 stdout；(b) 尝试写被拒路径的脚本——应失败；(c) 尝试出网的脚本——应失败。
3. 对 (b)(c) 的失败用 `wxc-exec.exe --debug config.json` 打开诊断，确认是策略拒绝而非环境没搭好；若要给可信工具补权限，走 `docs/logging-access-denied.md` 的 deny-and-record，不要用 `--audit`。

判断有没有改善的指标：

- **隔离有效性**：越权用例（写系统路径、联网、读敏感文件）被拦比例，目标 100%；同时记录合法用例被误拦的比例与策略返工次数。
- **可用性**：合法工作负载首次运行成功率、修策略后成功率、单次执行延迟与资源占用（与直接在宿主执行对比）。
- **集成效果**：接进“生成代码 → 隔离执行 → 回结果”的循环后，任务端到端成功率、超时/拒绝后的重试次数、人工介入次数（对照不隔离或人工审查的基线）。
