# claynicholson/copper-kicad-mcp

- 结论：**值得一试**。先在一块非关键的两层小板上小范围试：装好 KiCad 10，用 `npx -y copper-kicad setup --demo` 看完整流程，再把 Copper 接入现有 MCP 客户端跑一遍“需求→原理图→选型→布线→ERC/DRC→fab 包”，以 ERC/DRC 零错误、fab 文件可直接下单为验收；理由是 README 给出了可照抄的安装命令、配置片段和设计流程，但佐证只有作者自制的六块板，且 macOS/Linux 路径尚未充分验证。
- 原文：https://github.com/claynicholson/copper-kicad-mcp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T14:35:22.160Z

## 是什么

Copper（`copper-kicad-mcp`）是一个本地运行的 MCP 服务器，把 AI 应用接到 KiCad 上，让模型直接做可下单的 PCB 设计：原理图、立创商城（LCSC）选型、PCB 布局布线、调用 KiCad 自带的 ERC/DRC、渲染图，以及嘉立创（JLCPCB）生产文件。README 称其有 31 个工具，兼容任意 MCP 应用和任意模型——**服务器本身不调用任何语言模型**，模型由你的 AI 应用提供。

它的设计取向值得注意：AI 干活的方式被约束成工程师的方式，而不是让模型自由画图。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：先安装 KiCad 10。不同客户端的接入方式不同，按下面选一条。

1. **（可选，建议先做）看一眼再决定**：用一次性文件夹跑演示版安装页，不动你的真实环境。
   ```sh
   npx -y copper-kicad setup --demo
   ```

2. **接入你的 AI 应用**（按客户端选一条）：
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

3. **跑 setup**：它会自动找到 KiCad、带上你已有的库和设置、连上 AI 应用、发一次测试调用；每一步都会先问、并且备份所有改动。

4. **出问题时先诊断再排查**：
   ```sh
   npx -y copper-kicad doctor
   ```
   （Windows 或一行安装之后也可用 `copper doctor`。）

5. **用自然语言下设计需求**，README 给的示例可直接照用：
   ```text
   Design a USB-C powered ESP32-C3 board with a status LED, 30 x 40 mm
   ```
   然后让 AI 按 README 描述的流程推进（这是它应有的行为，可作为验收清单）：
   - 按**网络名**而不是坐标连引脚（`U1.PA9 → USB_DP`）；
   - 在 LCSC/JLCPCB 搜真实器件（优先 Basic 件、看实时库存），导入符号、封装，EasyEDA 有 3D 模型时一并导入；
   - **每次改动后重跑 KiCad 的 ERC 和 DRC**，每条问题附带现成修复；
   - 摆放与布线：分阶段布线器，支持长度匹配、差分对、线宽类、铺铜，以及 Freerouting；
   - 回看自己的成果：原理图、分层图和光线追踪 3D 渲染图回传给模型；
   - 输出 Gerber、钻孔、BOM、坐标文件，按 JLCPCB（或 PCBWay、OSH Park、通用）打包成 zip。

6. **授权联网（需要时）**：搜索/下载器件走 LCSC、JLCPCB、EasyEDA（备用镜像 `jlcsearch.tscircuit.com`）；`setup`/`doctor` 期间会查 KiCad 新版本（可用 `COPPER_NO_UPDATE_CHECK=1` 关掉）；请求自动布线时从 GitHub 下载 Freerouting 和 Java 运行时，约 120 MB，一次性。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 列出了一批通常不会想到交给 AI 的硬件工作——按网络名连原理图、按实时库存选型并导入符号/封装/3D 模型、布局布线（含长度匹配与差分对）、跑 ERC/DRC 并给修复建议、读渲染图自检、产出可下单的 fab 包。这是一个把“整条交付链”而非单点任务交给 AI 的具体样本。

**2. 任务匹配**：分工被写得很清楚——工具层（Copper）提供确定性操作和 KiCad 原生校验，模型负责决策与调度；服务器不调用模型，因此模型可换、客户端可换。安装路径上区分了 Windows（端到端测试过）与 macOS/Linux（新路径，可能失败需要开 issue），说明不同环境的成熟度不同，任务匹配要考虑平台条件。

**3. 条件供给**：需要给足的东西很具体——KiCad 10、Node.js 18+（npx 路线）、MCP 配置入口、对外网络访问（LCSC/JLCPCB/EasyEDA 及镜像）、自动布线时约 120 MB 的下载、以及对文件和设置改动的授权（setup 每步询问并备份）。反馈通道是关键供给：ERC/DRC 每次改动后重跑，渲染图回传模型，形成“改—验—看”的闭环。

**4. 主动推进**：有明确依据的只有一条——**ERC 和 DRC 在每次变更后自动重跑**。这是状态触发式的持续校验。至于按时间或其他事件触发的推进，README 未提及。

**5. 效果验证**：README 给出的验收口径是 KiCad 10 的 ERC 和 DRC 结果为 **0 errors、0 unconnected items**，且能产出可下单的 fab 文件；并列出六块已完成板（例如 ESP32-C3 USB-C：30×40 mm、2 层、15 件；RP2040 Macropad：66×90 mm、2 层、65 件），声称全部通过。这是可用、可自动判定的指标，不是主观评价。

## 与已有做法的关系

清单中的 **Claude Code（adopt）** 和 **Cursor（watch）** 都在这份 README 里被直接支持：Claude Code 走两条 `claude plugin` 命令安装，Cursor 可用 `npx -y copper-kicad setup` 或粘贴 `mcpServers` 配置项（README 还给了 Cursor / VS Code 的一键安装链接）。也就是说，这条线索不是新工具，而是已有 MCP 客户端在**硬件 EDA** 领域的一个具体接线方案，其价值在于演示“MCP 客户端 + 领域工具服务器 + 原生校验器”这种组合能把 AI 推到可交付成果。清单中没有更贴近的硬件设计类条目。

## 证据与局限

**原文给出的证据**：六块自制板的规格（尺寸、层数、元件数）与“全部通过 KiCad 10 ERC/DRC，0 错误 0 未连接项”；fab 文件与层图公开在 coppereda.com；安装脚本、配置片段、示例需求都是可直接执行的；隐私边界写得具体（本地运行、无遥测、逐一列出联网点与下载体积）。

**只是作者主张、未经原文数据支撑的**：AI “像工程师一样”推进流程；每条 ERC/DRC 问题“都带现成修复”；“任何 MCP 应用和任何模型”都能用（未给测试矩阵）；31 个工具的具体能力和边界（README 未列工具清单，也未给提示词模板或失败案例）。

**适用条件与风险**：强依赖 KiCad 10 这一版本；Windows 端到端验证过，macOS/Linux 是新增路径，作者自己提示可能失败；选型依赖 LCSC/JLCPCB 生态，对不用这些供应商的项目价值下降；自动布线需额外下载约 120 MB；项目 star 数仅 41，属于小众早期项目，长期维护与 KiCad 版本跟进存在不确定性；六块板均为作者自制，缺第三方复现记录。

**材料局限**：本报告只依据仓库 README，未读 `docs/` 下的安装、配置、架构、兼容性文档，因此对工具粒度、失败模式、参数化配置的判断有限。

## 怎么试、怎么验证

**最小试用（半天内可完成）**：
1. 在一台装有 KiCad 10 的机器上跑 `npx -y copper-kicad setup --demo`，先确认安装页能走通、能找到 KiCad（此步不改动真实环境）。
2. 用 `npx -y copper-kicad setup` 正式接入你现有的 MCP 客户端（Claude Code 或 Cursor 都行），确认测试调用成功；失败先跑 `doctor`。
3. 选一块**非关键、两层、元件少**的板子做试点。最省事的做法是直接照 README 的示例需求（USB-C 供电的 ESP32-C3 + 状态 LED，30×40 mm）走一遍，再换成你自己的真实小板。
4. 全程记录：AI 每轮改了什么、ERC/DRC 报了什么、修复建议是否需要人工改写。

**判断有没有改善的指标**：
- 硬指标：最终 ERC/DRC 是否达到 **0 errors / 0 unconnected items**；Gerber、钻孔、BOM、坐标文件是否齐全且 JLCPCB 预览能通过；BOM 中器件是否都有实时库存、Basic 件占比多少。
- 过程指标：从需求到可下单 fab 包的耗时；人工介入修改的次数与类型（连线错误、选型不可用、封装不匹配）；每条 ERC/DRC 问题的修复建议被直接采纳的比例。
- 对照：同一需求用你原来的手工流程做一次，比较耗时与错误数；若 AI 路线的返工次数没有明显下降，就只把它当“草图与选型助手”，不要指望一次成型。
- 稳定性观察：同一需求重跑 2–3 次，看结果方差有多大；方差大说明目前适合放在探索阶段而非交付阶段。
