# shanselman/sandbox-mcp

- 结论：**值得一试**。建议小范围试用：在符合 Windows 11 Pro/Enterprise 条件、且确有 Windows 桌面应用干净机验证需求的团队，先按 README 跑通 doctor 和内置样例，再接入编码智能体。原因是它给出了可复制的 CLI/MCP 配置、沙箱流程和证据链，但环境限制明显，当前只适合 Windows 桌面测试这一窄场景。
- 原文：https://github.com/shanselman/sandbox-mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-07T13:42:52.531Z

## 是什么
sandbox-mcp 是 Windows Sandbox 的 CLI 和可选 MCP 适配器：给 AI agent 一台一次性、真实、可销毁的 Windows 11 机器，完成启动、部署应用、用 UI Automation 驱动控件、抓崩溃、保留证据、销毁机器。它使用真实 Windows 桌面，不是假装成 Windows 的容器；CLI 可独立使用，MCP 只是给需要工具 schema 和内联截图的客户端。适合 Windows 应用的干净机冒烟测试、安装/卸载审计、离线行为、不可信文件 detonate、UI 自动化与证据收集。前提是 Windows 11 24H2（build 26100）或更高，Pro/Enterprise/Education，开启虚拟化；Home/Server 不支持；同一时间只能跑一个沙箱。

## 具体做法
1. 开启 Windows Sandbox。前提：管理员 PowerShell、Windows 11 24H2+ Pro/Enterprise/Education、UEFI/BIOS 已开虚拟化。运行后重启；重启后从开始菜单打开一次 Windows Sandbox 再关闭，以安装 `wsb`。
```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All
```
2. 下载 portable ZIP（Windows x64），先用相邻 `.sha256` 校验再解压；ZIP 自带 Node.js、`sbx`、MCP server、guest agent 和 skills。前提：无需安装 Node/npm。解压后在 PowerShell 运行只读检查：
```powershell
./sbx.cmd doctor
```
`doctor` 只解释缺什么和怎么修，不自动开功能、不提权、不改 PATH、不重启。
3. 用系统自带程序跑通最小闭环。前提：doctor 通过。运行后应在 `%LOCALAPPDATA%/sandbox-mcp/runs/<timestamp>` 留下 `report.md`、`report.json`、截图和 `audit.jsonl`。
```powershell
./sbx.cmd run C:/Windows/System32/charmap.exe --open
```
4. 对自有 Windows 应用做干净机冒烟测试。前提：应用能在 Windows Sandbox 运行；测试脚本存在时用 `--test`；默认不安装任何运行时。命令会启动全新 guest、部署/启动、观察、收集、销毁并出报告。
```powershell
./sbx.cmd run ./dist/YourApp.exe --network off --test ./test/smoke.ps1 --open
```
如果失败并提示缺 VC++/.NET/Windows App Runtime，可显式选择自动补齐；这会把报告标记为 `PROVISIONED (not a clean-machine test)`，不能当作干净机通过。
```powershell
./sbx.cmd run ./dist/YourApp.exe --provision auto --open
```
也可先用只读静态诊断：
```powershell
./sbx.cmd deps ./dist/YourApp.exe
```
5. 测安装器和卸载残留。前提：有安装包和可选测试脚本。报告会列出安装器新增、卸载器遗漏的文件、注册表、服务、计划任务、自启动项。
```powershell
./sbx.cmd install-test ./setup.msi --test ./test/after-install.ps1 --fail-on-leftovers --open
```
6. 不可信文件在无网沙箱中 detonate。前提：只在一次性 guest 中运行；默认无网。报告会列进程、域名查询、连接尝试、持久化和文件变化。
```powershell
./sbx.cmd detonate ./suspicious.ps1 --network off --open
```
7. 需要反复改代码时用 warm sandbox 快循环。前提：目标目录专用，guest 中该目录的多余文件会被删除；`deploy` 只传变更并用 SHA256 校验。先 `start`，再 build/deploy/shot，改完重复，最后 `stop`。
```powershell
./sbx.cmd start --network off
./samples/HelloSandbox/build.ps1
./sbx.cmd deploy ./samples/HelloSandbox/bin C:/apps/HelloSandbox --launch HelloSandbox.exe --restart
./sbx.cmd shot --window 'Hello Sandbox'
./sbx.cmd stop
```
8. 让 agent 直接走 CLI 或接 MCP。前提：agent 能执行 shell 时优先直接用 `sbx`/`sbx.cmd`，不必配 MCP；只有需要可发现工具 schema、结构化结果和内联截图时才配 MCP。VS Code `.vscode/mcp.json` 形状如下，路径替换为解压目录，且用绝对路径：
```json
{
  "servers": {
    "windows-sandbox": {
      "type": "stdio",
      "command": "C:/Users/you/Downloads/sandbox-mcp/node.exe",
      "args": ["C:/Users/you/Downloads/sandbox-mcp/src/server.js"]
    }
  }
}
```
GitHub Copilot CLI 的 `%USERPROFILE%/.copilot/mcp-config.json` 用 `mcpServers` 顶层键并加 `tools`；Claude Desktop 用 `mcpServers` 且省略 `type` 和 `tools`。重载客户端后，可让 agent 执行“build it, test it on a clean machine, look at the screenshot, fix it, repeat”。
9. 可选：安装 agent skills/plugin。前提：Node.js 20+；只用 CLI 时不需要。skills 覆盖 setup、干净机运行、交互 UI 测试、安装器测试、不可信文件 detonate。
```powershell
copilot plugin marketplace add shanselman/sandbox-mcp
copilot plugin install sandbox-mcp@sandbox-mcp
```
也可把 `skills/` 中需要的目录复制到 agent 的 skills 文件夹，例如 `~/.copilot/skills/`。

## 对应的研究问题
- 能力发现：README 明确给出可交给 agent 的新工作：干净机冒烟测试、安装/卸载差异审计、UI Automation 驱动真实控件、离线行为观察、不可信文件 detonate、收集截图/录屏/报告/审计日志，以及“build→clean-machine test→看截图→修→重复”的闭环。
- 任务匹配：适合 Windows 桌面应用（Win32、WinForms、WPF、WinUI、console、PyInstaller、Electron 等）的干净机验证、GUI 测试、安装器和不可信文件；不适合需要 Linux、持久环境、多机并行或 ARM64 打包的场景。CLI 适合能跑 shell 的 agent；MCP 适合需要工具 schema、结构化结果和内联截图的客户端。
- 条件供给：需要 Windows 11 24H2+ Pro/Enterprise/Education、虚拟化、管理员开功能并重启、首次手动打开一次 Windows Sandbox；portable ZIP 自带 Node；MCP 配置需要绝对路径；部署目标必须是专用目录；网络可设为 off/firewall/on；反馈通过退出码、报告、截图、录屏、事件日志、快照 diff 和审计日志提供。
- 主动推进：可被 agent 循环调用；`sandbox_ui_wait`/`sbx ui wait` 等待控件或对话框出现，`--wait` 等待应用，`--duration`/`--every` 用于 detonate 的持续观察，`sandbox_app_errors` 抓崩溃/挂起/.NET 未处理异常。README 没有说它自带调度器；时间/事件触发需要外层 agent 或 CI 来编排。
- 效果验证：每次运行保留 `report.md`、`report.json`、截图、可选录屏、`audit.jsonl`；有进程退出码、崩溃事件、依赖诊断、安装器残留 diff、快照 diff；`deploy` 报告 added/changed/removed/unchanged、传输字节、耗时和 `verified: true`；provision 会记录来源与校验并标记非干净机来源，避免把补齐运行时后的通过误判为干净机通过。

## 与已有做法的关系
清单中相关条目是 Agent skills（adopt）和 GitHub Copilot（drop）。sandbox-mcp 与 Agent skills 是互补关系：它把“干净机测试、UI 驱动、安装器审计、detonate”做成可执行 CLI/MCP 工具，并自带 skills 和 plugin，可把上述流程固化成 agent skill。GitHub Copilot 在本清单中为 drop，因此不应把方案价值建立在 Copilot 集成上；README 中的 Copilot CLI/VS Code 配置只是可选客户端，CLI 可完全独立使用。清单中没有其他直接相关条目。

## 证据与局限
原文给出的是仓库 README，不是独立第三方评测。可核对的数据/案例包括：GUI 样例端到端约 40–50 秒；干净机运行 `NativeProof.exe` 29.8 秒失败，退出码 -1073741515，诊断为缺 VC++ redistributable；显式 provision 后另一台新 guest 30.9 秒通过，安装器为 Microsoft 签名 14.51.36247.0，guest 网络保持 off；兼容性矩阵覆盖七种配置，WinUI/WPF/Win32 有真实离线 guest 截图；build 26100.9882 的可选组件基线记录在 `test/fixtures/sandbox-26100.9882.json`。这些是作者仓库内的实测记录，不是对所有 Windows 应用或未来 guest 镜像的保证。
局限：仅 Windows 11 24H2+ Pro/Enterprise/Education；Home/Server 不支持；需要虚拟化和管理员操作；同一时间只能一个沙箱，不支持并行；ARM64 当前未打包；不适合 Linux 或持久环境；`deps` 是保守静态扫描，不证明所有动态依赖存在；WebView2 等可选组件必须在真实 guest 中检查；provision 后的通过不是干净机通过；不是所有 Windows 应用或依赖硬件的负载都能在 Sandbox 工作；录 MP4 需要 host 上有 ffmpeg，但不会静默安装。原文在 CLI 段落被截断，部分命令选项只能按已给内容判断。

## 怎么试、怎么验证
最小试用：在一台符合前提的 Windows 11 24H2 Pro/Enterprise 开发机上，按步骤 1–3 跑通 `doctor` 和 `charmap`；再跑仓库自带样例：`HelloSandbox` 正常测试应通过，`--args --crash` 应失败并给出崩溃证据，`LeakyApp` 应报告卸载残留，`Suspicious` 应报告模拟恶意行为。然后用一个真实 Windows 应用做 3 次 `sbx run --network off --test ... --open`，记录每次 pass/fail、耗时、截图/报告是否齐全、是否发现只在干净机出现的问题。
接入 agent 后做 A/B：同一批 3–5 个已知问题，比较“不用沙箱”和“用沙箱闭环”的修复成功率、首次诊断时间、人工介入次数、证据完整性、误判为通过的比例、单次运行成本。判断改善的指标：干净机通过率、干净机专属失败发现数、从失败到定位缺依赖/崩溃原因的时间、安装器残留发现数、agent 需要人手动操作桌面的次数、报告和截图可复现率。若团队没有 Windows 桌面应用测试需求，或机器不满足 Windows 11 24H2 Pro/Enterprise，则不值得采用，最多作为思路研读。
