# 让 AI 按工程师流程做一块可下单的小板：从需求到 ERC/DRC 零错误

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决把 AI 接入 KiCad 后，如何用可执行的安装、设计流程和 ERC/DRC 验收，把一块非关键小板从需求推进到可下单 fab 包的问题。
> 先试这一步：先在一块非关键两层小板上，用 `npx -y copper-kicad setup --demo` 走通安装页并确认能找到 KiCad，再接入现有 MCP 客户端跑完整流程。
> 最近修订：2026-11-13

## 解决什么问题

把 AI 应用通过 MCP 接到 KiCad，让模型按工程师的交付链路做板：理解需求、画原理图、选真实器件、布局布线、跑 KiCad 原生 ERC/DRC、导出可下单的 fab 包。关键不是“AI 会不会画”，而是每一步有没有可检查的证据；最终以 ERC/DRC 零错误、零未连接项和 fab 文件可下单为验收。Copper 是本地运行的 MCP 服务器，服务器本身不调用语言模型，模型由你的 AI 应用提供。

## 适用与不适用

适用：有 KiCad 10；愿意在非关键、两层、元件少的小板上试点；供应链主要用 LCSC/JLCPCB，或至少能接受这套选型与生产文件打包；使用支持 MCP 的客户端，如 Claude Code、Cursor、VS Code、Windsurf、Codex、Zed、Claude Desktop 等。Windows 路径作者端到端测试过。

不适用或需谨慎：关键板、不能返工的项目；没有 KiCad 10；主要不用 LCSC/JLCPCB 生态；依赖 macOS/Linux 且不能接受新路径失败风险（作者提示可能失败、需要开 issue）；期望 AI 全自动一次成型、不做人工复核。项目 star 数仅 41，属于早期小众项目，长期维护和 KiCad 版本跟进有不确定性。

## 前置条件

- KiCad 10。
- Node.js 18+（走 npx 路线时）。
- 一个 MCP 客户端；Claude Code、Cursor 等均可。
- 网络访问：LCSC、JLCPCB、EasyEDA；备用镜像 `jlcsearch.tscircuit.com`。`setup`/`doctor` 期间会查 KiCad 新版本，可用 `COPPER_NO_UPDATE_CHECK=1` 关掉。
- 自动布线需从 GitHub 下载 Freerouting 和 Java 运行时，约 120 MB，一次性。
- 允许 setup 修改文件与设置：它会每一步先问，并备份所有改动；仍建议在非关键环境先试。
- 最好有一块非关键两层小板，并保留原来的手工流程作对照。

## 操作步骤

1. 确认 KiCad 10 已安装，并选一块非关键、两层、元件少的小板作为试点。预期：后续 setup 能找到 KiCad；不要拿关键板做第一次试验。

2. （建议先做）用 demo 安装页走一遍，不改真实环境。
```sh
npx -y copper-kicad setup --demo
```
前提：Node.js 18+。预期：能看到完整流程、确认安装页能走通、能找到 KiCad。此步用一次性文件夹，不动你的真实环境。

3. 接入你的 AI 应用，按客户端选一条。

- Claude Code：
```sh
claude plugin marketplace add claynicholson/copper-kicad-mcp
claude plugin install copper@copper
```

- Windows（任意 AI 应用）：从 latest release 运行 `Copper-for-KiCad-1.1.0-Setup.exe`，勾选要接的 AI 应用。

- Claude Desktop：双击 latest release 里的 `copper-1.1.0.mcpb`。

- Cursor / VS Code / Windsurf / Codex / Zed：先确认 Node.js 18+，然后执行
```sh
npx -y copper-kicad setup
```
也可以手工粘贴配置（Cursor、Claude Desktop、Windsurf 可用此条；其余见 `docs/INSTALL.md`）：
```json
{ "mcpServers": { "copper": { "command": "npx", "args": ["-y", "copper-kicad"] } } }
```

- 终端一行安装：
```powershell
# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/claynicholson/copper-kicad-mcp/main/installer/install.ps1 | iex"
```
```sh
# macOS / Linux
curl -LsSf https://raw.githubusercontent.com/claynicholson/copper-kicad-mcp/main/installer/install.sh | sh
```
预期：客户端里出现 Copper 的 MCP 配置。macOS/Linux 是新增路径，作者提示可能失败，失败时开 issue 或先改用已验证的 Windows 路径。

4. 正式跑 setup，让它自动找 KiCad、带上你已有的库和设置、连上 AI 应用，并发一次测试调用。
```sh
npx -y copper-kicad setup
```
前提：已装 KiCad 10、已选客户端。预期：测试调用成功；每一步改动前它会询问并备份。若测试调用失败，先做下一步诊断，不要直接开始设计。

5. 出问题先诊断再排查。
```sh
npx -y copper-kicad doctor
```
Windows 或一行安装之后也可用：
```sh
copper doctor
```
预期：先定位 KiCad 路径、客户端连接或环境问题，再决定是否重装。

6. 用自然语言下设计需求，并要求 AI 按下面的流程推进。示例需求可直接照用：
```text
Design a USB-C powered ESP32-C3 board with a status LED, 30 x 40 mm
```
然后把下面这份清单当作过程验收：
- 按网络名而不是坐标连引脚，例如 `U1.PA9 → USB_DP`。
- 在 LCSC/JLCPCB 搜真实器件，优先 Basic 件、看实时库存；导入符号、封装，EasyEDA 有 3D 模型时一并导入。
- 每次改动后重跑 KiCad 的 ERC 和 DRC；每条问题要求附带现成修复。
- 摆放与布线走分阶段布线器，支持长度匹配、差分对、线宽类、铺铜，以及 Freerouting。
- 回看原理图、分层图和光线追踪 3D 渲染图，让模型基于图自检。
- 输出 Gerber、钻孔、BOM、坐标文件，按 JLCPCB（或 PCBWay、OSH Park、通用）打包成 zip。

预期：每个阶段都有可检查产物；不要只听模型说“完成了”，要看 ERC/DRC 和 fab 预览。

7. 需要联网时放行对应请求：搜索/下载器件走 LCSC、JLCPCB、EasyEDA（备用镜像 `jlcsearch.tscircuit.com`）；自动布线时下载 Freerouting 和 Java 运行时，约 120 MB，一次性；`setup`/`doctor` 的 KiCad 版本检查可用 `COPPER_NO_UPDATE_CHECK=1` 关闭。预期：选型和自动布线能跑通；不需要时不要额外开放权限。

## 怎么判断变好了

先做最小试用：半天内完成 demo、正式接入和一块非关键两层小板的完整流程；记录 AI 每轮改了什么、ERC/DRC 报了什么、修复建议是否需要人工改写。然后同一需求重跑 2–3 次看方差。

硬指标：
- 最终 ERC/DRC 达到 0 errors、0 unconnected items。
- Gerber、钻孔、BOM、坐标文件齐全，JLCPCB 预览能通过。
- BOM 中器件都有实时库存；记录 Basic 件占比。

过程指标：
- 从需求到可下单 fab 包的耗时。
- 人工介入修改的次数与类型：连线错误、选型不可用、封装不匹配。
- 每条 ERC/DRC 问题的修复建议被直接采纳的比例。

对照：同一需求用原来的手工流程做一次，比较耗时与错误数。如果 AI 路线的返工次数没有明显下降，就只把它当“草图与选型助手”，不要指望一次成型。稳定性：同一需求重跑 2–3 次，方差大说明目前适合放在探索阶段而非交付阶段。

## 常见坑

- 把关键板当第一次试点。先做非关键、两层、元件少的小板。
- 只听模型说“完成”。必须看 ERC/DRC 是否 0 errors、0 unconnected items，以及 fab 文件能否直接下单。
- 平台差异：Windows 端到端验证过；macOS/Linux 是新增路径，作者自己提示可能失败，需要开 issue。
- 强依赖 KiCad 10；版本不匹配时先解决环境，不要怪模型。
- 选型依赖 LCSC/JLCPCB 生态；不用这些供应商时价值下降。
- 自动布线要额外下载约 120 MB；网络受限时这一步会失败。
- setup 会改文件和设置；虽然每步询问并备份，仍建议在非关键环境先试。
- README 的“任何 MCP 应用和任何模型”没有测试矩阵；“每条 ERC/DRC 问题都带现成修复”是作者主张；31 个工具的具体边界未列清单。需要人工复核，不能当保证。
- 六块板均为作者自制，缺第三方复现记录；项目 star 数仅 41，长期维护和 KiCad 版本跟进有不确定性。

## 证据与来源

安装命令、MCP 配置片段、`setup --demo`、`doctor`、示例需求 “Design a USB-C powered ESP32-C3 board with a status LED, 30 x 40 mm”、按网络名连引脚、LCSC/JLCPCB 选型、每次改动后重跑 ERC/DRC、分阶段布线器、渲染图回传、fab 打包，均来自 `claynicholson/copper-kicad-mcp` 的 README，属于可直接执行的说明或作者描述。验收口径“ERC/DRC 0 errors、0 unconnected items，fab 文件可下单”和六块板规格（如 ESP32-C3 USB-C 30×40 mm、2 层、15 件；RP2040 Macropad 66×90 mm、2 层、65 件）是 README 给出的数据；但六块板均为作者自制，缺第三方复现。Windows 端到端测试过、macOS/Linux 路径未充分验证、自动布线约 120 MB、项目 star 数 41 来自 README/仓库现状。AI“像工程师一样推进”、每条 ERC/DRC 问题“都带现成修复”、“任何 MCP 应用和任何模型”都能用，属于作者主张，未给测试矩阵或工具清单；本手册把它们标为需要人工复核的部分。报告只依据 README，未读 `docs/` 下的安装、配置、架构、兼容性文档，因此对工具粒度、失败模式、参数化配置的判断有限。

## 依据的调研

- [claynicholson/copper-kicad-mcp](../research/radar/2026-11-13/13163-claynicholson-copper-kicad-mcp.md)：值得一试，先在一块非关键的两层小板上小范围试：装好 KiCad 10，用 `npx -y copper-kicad setup --demo` 看完整流程，再把 Copper 接入现有 MCP 客户端跑一遍“需求→原理图→选型→布线→ERC/DRC→fab 包”，以 ERC/DRC 零错误、fab 文件可直接下单为验收；理由是 README 给出了可照抄的安装命令、配置片段和设计流程，但佐证只有作者自制的六块板，且 macOS/Linux 路径尚未充分验证。
