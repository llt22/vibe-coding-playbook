# 让 AI 操作界面前，先用可验证回路和小范围对照选对路线

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在把浏览器、桌面、终端或手机界面交给 AI 操作之前，用成本递增的步骤验证反馈回路、验收标准和安全边界，并把「高效」变成同批任务上的可比较数字。
> 先试这一步：先跑做法 A 的两条安装命令确认参考解 reward 为 1.0；若已有 agent 和浏览器，再按做法 I 的 doctor 与 3–5 个真实任务和现有做法做同任务对照。
> 最近修订：2026-10-20

## 解决什么问题

在把浏览器、桌面、终端或手机界面交给 AI 操作之前，用成本递增的步骤先验证它的反馈回路、验收标准和安全边界，并把「高效」变成同批任务上的可比较数字，避免装完一堆组件却不知道能不能用。浏览器路线现在有四种可选形态：dsh 的文本快照路线、Chrome Relay 借用真实登录态后台标签页、qz 本地优先浏览器扩展、axuse 的 MCP + 无障碍树 + diff 路线；桌面/终端/iOS 有 Cua 生态与 AutoCua；安卓有 ADB 技能。选哪条取决于你已有的 agent、操作系统、是否要复用登录态、是否需要成对基准或独立评测。qz 的调研结论要求：先在个人 Chrome/Edge 上装扩展、接一个自带 API key 的模型，跑 2–3 个真实的多源调研与登录态数据抽取任务，逐条核对来源后，再把跑通的流程存成 Skill 复用；它的可靠性目前只有作者自述、没有独立评测，仓库采用度也低，不宜直接全量采用。axuse 的调研结论要求：先按 README 把 axuse 以 MCP 方式接入 Claude Code 或 Codex，只用于表单填写、滚动查找、批量打开 URL 这类浏览器任务，与现有做法做同任务对照；它仅在非商业许可下免费使用，基准数据由作者自行报告且统计口径有疑点，桌面控制也只有 Windows 经过验证。

## 适用与不适用

**适用：**
- 你希望 agent 真的去读和操作浏览器标签页：dsh 桌面端 + MV3 扩展的文本快照路线。
- 你希望 agent 能操作 GUI 桌面，或在 API 不通时改走界面；你要给「计算机使用」类 agent 建评测、导出 trajectory。
- 你需要隔离的批量桌面操作（gVisor 容器沙箱）或本地 macOS/Linux VM。
- 你已有 Claude Code / Codex / Cursor / OpenClaw 等 agent，想通过 MCP 或 skill 接上界面操作能力。
- 你已有 agent，想让它通过 ADB 操控一台已授权的安卓测试机：打开 App、查找页面、点击/滑动/长按/输入文字，查看授权范围内的界面信息、处理有限列表、复现测试操作、准备消息草稿（明确授权后才执行发送）。
- 你在 macOS + Google Chrome + Node.js 20+，希望编码 agent（Claude Code / Codex / Cursor / Paseo）借用你已登录的 Chrome 后台标签页做网页操作，且不抢焦点、不弹对话框。
- 你要在 macOS / Windows / Linux 上让 agent 操作真实桌面，或驱动你自己的 Chrome（复用已登录 profile）或无人模式通过调试端口，或进入真实终端，或在 macOS 宿主上操作 iOS 模拟器/已配对 iPhone/iPad：AutoCua 的 `computer use` / `web use` / `shell use` / `mobile use, ios`。
- 你想用一个 pip 包和一次 `run_agent(...)` 调用同时覆盖上述几种界面，并接受先在可控机器上小范围验证。
- 你在 Chrome 或 Edge 上，希望用一句话让浏览器智能体跨站执行、翻页、滚动加载并抽取数据；你要在已登录的站点上做多源调研、对比表、带来源的报告，不想另起无状态浏览器。
- 你愿意自带模型 API key（或 ChatGPT 账号/Codex 登录），并接受按 README 声明数据只发给你选的模型和你访问的网站。
- 你想让 Claude Code / Codex / pi / Grok Bot 这类编码 agent 通过 CLI 或 MCP 把网页任务转交给 qz；你想把跑通的一次性调研固化成 Skill，下次一句话复用。
- 你希望用 MCP 接入 Claude Code / Codex / OpenCode 等宿主，让 agent 在浏览器里用无障碍树 + diff 操作，而不是截图循环猜坐标；任务以表单填写、滚动查找、批量打开 URL 为主，并愿意先与现有做法做同任务对照：axuse。

**不适用 / 先别用：**
- 团队不在用 dsh 桌面端：浏览器路线完全绑定 dsh 生态（桥接是 dsh 插件，配置写在桌面 profile 的 `cordis.patch.yml` 里）；手机或平板也不支持 dsh 浏览器方案。
- 你要的是成熟稳定的 1.0 产品：Cua Spaces 为 0.1.0，Pro/Teams 标注「即将推出」；CUA-S1 是早期源码研究版；dsh 扩展在 Chrome / Firefox 均标注 not yet listed；android-adb-control 作者自述「本版本已做文档审查和静态检查，尚未完成修订版真机端到端验收」。
- 你的机器不满足硬性条件：Spaces 需 macOS 26+，Lume 需 Apple Silicon；dsh 需 Node ≥ 20、桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0；Chrome Relay 仅 macOS + Google Chrome + Node.js 20+；AutoCua 需 Python 3.10+；axuse 需 Node.js 22+ 且机器上装有 Chrome、Edge、Chromium 或 Chrome for Testing 之一。
- 你要做对外托管或商用集成：Cua 的许可不是单一的；dsh 方案 README 通篇没有给出基准实测结果；Chrome Relay 的 0.15s/命令、2 分钟 setup 也只是作者自述；axuse 是 PolyForm Noncommercial 1.0.0，商业使用需单独授权。
- 你想用安卓路线绕过锁屏、验证码、支付验证或企业策略，或做无人值守监控、自动交易、无限重试：android-adb-control 明确排除这些用途；云端会话或远程容器也不会自动获得本地 USB 设备。
- 你打算把手里的主力机（承载凭据的设备）当试验田：ADBKeyboard 的部分实现允许其他本地应用发送控制广播，应优先用于可信测试设备，不用于凭据输入。
- 你不在 macOS 或不用 Google Chrome，或你的 agent 不在 Claude Code / Codex / Cursor / Paseo 四类之内：Chrome Relay 不适用。
- 你指望 Chrome Relay 防住「已以你身份运行的恶意软件」：作者明确说它不是这种安全边界，那种程序能读 secret、伪造标记。
- 你不接受在每个希望 agent 使用的 Chrome profile 里手动 Load unpacked 扩展：Chrome Relay 不会替你装扩展。
- 你要用 AutoCua 操作安卓手机：`mobile use, android` 尚不可用；你不在 macOS 宿主却想用 `mobile use, ios`：iOS 模式仅 macOS 宿主，模拟器需要完整 Xcode，真机需要一次性配对和 Team ID 签名。
- 你不满足 AutoCua 的 Linux 条件：x86_64 + GNOME 桌面，Wayland 已测，X11 未测；KDE 需换 portal 包；Fedora/Arch/openSUSE 包名不同。
- 你想把 AutoCua 的 Python 包直接 pip 进系统 Python（Ubuntu/Debian 会拒绝）：需要在存放 `main.py` 和 `.env` 的目录用发行版自带 python3（3.10–3.14）建 venv。
- 你的模型名不在 AutoCua 仓库的 `model_list.txt` 里：会原样转发并返回 404；模型名区分大小写。示例里的 `gemini-3.8-flash` 也需要先核对。
- 你想把 AutoCua 的 Interception 驱动随 wheel 分发或商用：它是 LGPL-3.0 非商业 / 付费商业双许可。
- 你用 Firefox：qz 明确不支持。
- 你需要 qz 做定时调度、事件监听或状态触发：README 没有给出这些机制；周期性任务仍需人或外部 agent 再次发起。
- 你需要独立评测或高采用度背书：qz 仓库仅 46 stars，README 没有准确率、耗时、成功率数据；对比表是作者按公开文档自评。
- 你不愿给浏览器扩展读取所有已登录站点的权限：材料只指向 `docs/permissions.md`，未给出具体权限内容，使用前需自行核查。
- 你的模型不支持 tool calling，或你要接外部 agent 但 Node.js 低于 22，或要从源码构建但 Node.js 不是 24 LTS：先补条件。
- 你想把 qz 当成恶意软件安全边界或无人值守自动推进系统：材料没有这种承诺。
- 你要把 axuse 用于商业用途：PolyForm Noncommercial 1.0.0 免费仅限非商业（个人、研究、教育、慈善、公共机构），商业使用需向 CTOL Digital Solutions 单独授权。
- 你主要以纯视觉判断（canvas、图表）为主，或需要绕过反爬：axuse 不适用；它不实现流量标注和反爬交接，指纹识别自动化的站点仍可能拦。
- 你在 Linux 上要桌面控制：axuse 无桌面驱动（浏览器工具仍可用）。
- 你需要成熟稳定、高采用度背书：axuse 47 stars、单一公司维护，基准为作者自建自评且统计口径有疑点。
- 你需要在 extension backend 下进入 OOPIF 帧：只能列出、不能进入（CDP backend 可以）。
- 你不愿手动 Load unpacked 扩展来用 bridge 模式：bridge 需要这一步。
- 你要定时/事件触发的常驻调度：axuse 原文只有原语级依据（`ax_wait_for`、`ax_scroll {until}`、`ax_events`），没有常驻调度方案。

## 前置条件

按路线分：

- 浏览器路线（dsh）：dsh 桌面端；Node ≥ 20（开发构建用 Node 22 + pnpm 11）；桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0；手机与平板不支持。
- 评测回路（Cua Bench）：Python 3.12 或 3.13，并安装 uv；该任务不需要 VM、Docker 或模型 API key。
- 桌面 Driver 路线：已有 Claude Code / Codex / Cursor / OpenClaw 等 agent。
- Cua Spaces 应用：macOS 26 或更高版本；Lume：Apple Silicon；Windows 下只有 Driver 有 PowerShell 安装脚本。
- 安卓 ADB 路线：本机有 ADB 可执行权限；一台已解锁并确认 RSA 授权的安卓测试机（`adb devices -l` 显示 `device`）；正确的技能安装目录与调用方式；明确的授权边界；截图与 UI XML 的数据与日志策略；任务预算（默认 30 个状态变更动作 / 5 分钟）。自绘界面还需截图工具与视觉模型；中文输入可选 ADBKeyboard；跑静态检查需要 Bash、Git 和 uv。
- Chrome Relay：macOS、Google Chrome、Node.js 20+、`agent-browser`；每个希望 agent 使用的 Chrome profile 需手动加载扩展；`bin/chrome-relay setup` 会生成密钥、装后台服务、生成身份映射、把 `chrome-relay` 放进 PATH，并把 Claude Code skill 链进去；连接只放行 Claude Code、Codex、Cursor、Paseo 四类 agent 应用。
- AutoCua：Python 3.10+；写 `main.py` 并安装 `pip install AutoCua`；模型密钥写 `.env` 文件或在桌面应用 Settings 里粘贴；模型名从仓库 `model_list.txt` 选且区分大小写；代理保存的一切落在运行 Python 目录下的 `AutoCua_data/`。Windows UAC 可选：从源码检出目录运行 `setup_windows.bat`；Linux 需 x86_64 + GNOME 桌面和发行版绑定，首次 computer-use 需在 GNOME 屏幕共享同意里打开 Allow Remote Interaction；iOS 需完整 Xcode 和 git。
- qz：Chrome 或 Edge；扩展已安装并打开侧边栏；一个支持 tool calling 的模型 provider 或兼容本地模型服务，或一个 ChatGPT 账号；模型 API key（若用 ChatGPT 账号/Codex 设备码则不需要 API key）；外部 agent 桥接需 Node.js 22+；源码构建需 Node.js 24 LTS 与 npm；本机有仓库 checkout；使用前核查 `docs/permissions.md`（材料只给链接，未给内容）。
- axuse：Node.js 22+；机器上装有 Chrome、Edge、Chromium 或 Chrome for Testing 之一（浏览器不在默认位置时设 `AXUSE_BROWSER=/path/to/chrome`）；宿主 CLI（Codex / Claude Code / OpenCode 等）；bridge 模式需手动在 Chrome/Edge 开发者模式 Load unpacked 指向 `bridge/extension`，并注册 native messaging host（Edge 还要求 host manifest 里有 `allowed_origins`）；macOS 桌面控制需 `AXUSE_ENABLE_MACOS_CUA=1` 和系统设置授予 Accessibility 与 Screen Recording；商业使用需获得 CTOL Digital Solutions 授权。

## 操作步骤

下面按路线分组。**建议先做做法 A**；如果团队已在用 dsh 桌面端，做法 B 是最短的一条「模型真的读浏览器」的路；如果你已有 agent 和一台可信安卓测试机，做法 E 是最短的一条「agent 真的操作手机」的路；如果你在 macOS + Chrome + 编码 agent 环境，做法 F 是最短的一条「agent 用你真实登录态读网页」的路；如果你要一个统一入口覆盖桌面、自己的 Chrome、真实终端和 iOS 手机，做法 G 是最短的一条「先用 pip 包和一次 `run_agent(...)` 验证」的路；如果你在 Chrome/Edge 上、想用一句话在已登录站点做跨站任务，做法 H 是最直接的一条本地优先浏览器路线；如果你要 MCP 接入、用无障碍树 + diff 而不是截图循环，并且接受非商业许可，做法 I 是新增的一条可对照路线。

### 做法 A：只跑评测回路，不碰界面（最便宜的入口）

前提：Python 3.12/3.13 + uv。预期结果：建一个小任务，跑它的参考解，确认评测器给出的 reward 为 `1.0`。

1. 安装 Cua Bench（带 browser 扩展）：

```bash
uv tool install 'cua-bench[browser]'
```

2. 安装 Chromium：

```bash
uv tool run --from 'cua-bench[browser]' playwright install chromium
```

3. 建一个小任务，跑它的参考解，确认 evaluator 返回 `1.0`。
4. 然后你自己再手动做一遍同一任务，作为对照。

做到这一步，你已经验证了「评测器能打出 1.0」这个反馈回路，而且不需要 VM、Docker 或模型 API key。

### 做法 B：浏览器路线——用文本快照代替截图（dsh 生态）

前提：dsh 桌面端、Node ≥ 20；桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0。预期结果：模型拿到的是带编号的可操作控件清单，用同一个编号就能点，不需要坐标；成对基准能跑出两个后端的同批任务对比。

1. 装桥接插件：

```sh
dsh plugin --profile desktop add dsh-browser-crossplatform   # dsh web 用 --profile web

git clone https://github.com/youbaiyun/dsh-browser-crossplatform
dsh plugin --profile desktop add link:<clone>/packages/bridge
```

前提：有 `dsh` 命令行；是否装好请按仓库 `docs/INSTALL.md` 的逐步说明确认。

2. 装浏览器扩展：从扩展商店安装（README 标注 Chrome / Firefox 均 not yet listed），或加载未打包构建。插件无法替你装扩展：命令行加载只维持一个会话、关掉浏览器就没了；Chrome 137+ 的品牌版 Chrome/Edge 已忽略 `--load-extension`。所以要在 profile 里装一次。

3. 从源码构建（开发用）：

```sh
pnpm install
pnpm -r run typecheck
pnpm -r run test
pnpm --filter dsh-browser-extension run build               # Chrome → extension/dist
pnpm --filter dsh-browser-extension run build:firefox       # Firefox → extension/dist-firefox
pnpm --filter dsh-browser-extension run build:store         # Chrome，无 manifest key
pnpm --filter dsh-browser-extension run build:store:firefox # Firefox，无 key
pnpm --filter dsh-browser-extension run package             # 出全部归档
pnpm --filter dsh-browser-crossplatform run build           # 桥接插件 → packages/bridge/lib
```

前提：开发构建用 Node 22 + pnpm 11。上架要传 `-store` 包：普通构建带 manifest `key`，Chrome Web Store 会拒收。

4. 验证「模型真的看得到」：调用 `browser_snapshot`，页面以文本形式返回——标题/URL/正文 + 编号交互清单（含 ARIA role 控件）+ 表单字段（含 masked/checked/required），支持 delta 增量与 region 局部快照。工具面共 17 个：`browser_snapshot` / `click` / `type` / `press` / `scroll` / `navigate` / `open_tab` / `list_tabs` / `follow_tab` / `close_tab` / `back` / `forward` / `reload` / `get_text` / `wait` / `launch` / `describe_image`；位置信息来自 DOM，所以模型不需要坐标。

5. 决定动手前是否询问：`unrestrictedBrowserAccess` 开关出厂为开（新装不做询问）；关掉才恢复动手前的提示，并支持 trusted origins、allow-once。注意该开关打开时还会覆盖「读页面前先问」的选择。

6. 收紧回环免鉴权（可选）：桥接默认用 bearer token 鉴权，但来自扩展自身的回环连接可跳过以便零配置发现；豁免不是「任何 `chrome-extension://` 来源」，而是与 `extensionId`（逗号分隔白名单）精确匹配。自建构建要把自己的 id 加进去，或设 `extensionId: ''` 让所有连接（含回环）都要求 token。

7. 需要看图时再开图像识别（默认关；一旦开启，你询问的那张图会离开本机交给所配模型）。两条路二选一：

- 桌面中转（推荐）。在桌面 profile 的 `cordis.patch.yml` 里给桥接插件加配置：

```yaml
- id: bridge-browser
  disabled: false
  config:
    visionApiKey: <key>
    visionModel: deepseek-flash
```

地址与模型已有默认值（`https://api.deepseek.com/v1` / `deepseek-flash`），thinking 默认关。

- 扩展直连（面板没有入口，直接写扩展存储）：

```js
chrome.storage.local.set({ dshSettings: { visionEndpoint: 'https://…/v1', visionModel: '…', visionApiKey: '…' } })
```

8. 跑成对基准，把「高效」变成数字：

```sh
pnpm --dir benchmark install-browser
node benchmark/run.mjs --dry-run --smoke
node benchmark/run.mjs --smoke
node benchmark/run.mjs
node benchmark/run.mjs --tasks order_lookup,contact_form --seeds 1-5 --trials 2
```

三个前提：① 有一个接受 `--profile web --patch … -- --no-open --port N` 的 dsh 命令行（独立 workspace 要自己指路：`BENCHMARK_DSH_COMMAND="node D:/path/to/dsh.mjs"`）；② Windows 上用 `pnpm.cmd`；③ 用 Chrome for Testing 或 Chromium。基准里拿 `playwright`（基线，只暴露任务真正需要的 8 个工具）对比 `extension`（17 个工具），比的是同一批任务而不是同一工具面。

9. 跑桥接插件的 e2e（可选）：需要一个仍认 `--load-extension` 的浏览器，先 `node benchmark/lib/browser-install.mjs chromium`，再把 `PLAYWRIGHT_CHROMIUM_PATH` 设成 `node benchmark/lib/chromium-path.mjs` 打印的路径。

### 做法 C：只装 Driver，做一个可判对错的任务（已有自己的 agent 时最省事）

前提：已有 Claude Code / Codex / Cursor / OpenClaw 等 agent。预期结果：agent 在计算器里算出 6 × 7，并验证应用显示 42。

1. macOS / Linux 安装 Driver：

```sh
/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"
```

2. Windows（PowerShell）安装 Driver：

```powershell
irm https://cua.ai/driver/install.ps1 | iex
```

3. 按原文 Driver 教程走平台设置、权限和 agent 连接。
4. 让你的 agent 在计算器里算 6 × 7，并**验证应用显示 42**。
5. 接进你现有的 agent：通过 MCP / skill 接上 Cua Driver。原文点名 Claude Code、Codex、Cursor、OpenClaw 等。

### 做法 D：装整套 / 沙箱 / 本地 VM（接受安装器改动本机时再用）

前提：只想先看全貌，接受安装器会改动本机。预期结果：`cua` CLI、Cua Spaces 应用、cua-driver MCP 和 skill 就位，并能选择性地把本机作为宿主。

1. macOS / Linux 装整套：

```sh
curl -fsSL https://cua.ai/install.sh | sh
```

2. 登录并决定是否把 cua skills 和 cua MCP server 装进你的 AI 编程 agent：

```sh
cua auth login
```

3. 只想预选某几项时：

```sh
sh -s -- --select cua-driver
```

跳过清单：

```sh
--only cua-driver
```

4. 用沙箱做隔离的批量操作（前提：已装好 `cua` CLI）：

```sh
cua sb create ubuntu --name dev          # a gVisor container, set up on first use
cua sb exec dev uname -a
cua sb screenshot dev
cua sb rm dev
```

同一个沙箱的 Python 写法（`pip install cua`）：

```python
from cua_sandbox import Image, Sandbox

async with Sandbox.ephemeral(Image.linux(), local=True) as sb:
    print((await sb.shell.run("uname -a")).stdout)
```

要点：沙箱内不需要装 agent，就绪状态来自运行时和可选的端口探测；镜像若带 cua-spacesd（端口 3211），才额外提供进程、文件、截图、经 cua-driver 的输入，以及低延迟音视频流。

5. 把自己的机器接进来（无需端口转发）：

```sh
cua host setup
```

6. 要本地 VM 时装 Lume（前提：Apple Silicon）：

```bash
/bin/bash -c "$(curl -fsSL https://cua.ai/lume/install.sh)"
```

首个结果：从 Apple 恢复镜像创建一个干净的 macOS Tahoe VM、启动、用 SSH 连上。

### 做法 E：安卓手机——用 ADB 技能做「观察—一步操作—验证」

这是一个 instruction-only 的 Agent Skill，不是独立程序、不是 MCP Server、不是后台服务：让已有 Agent 通过 ADB 操控安卓手机，观察界面、执行一步、验证结果，再决定下一步。

前提：本机有 ADB；一台已解锁、已确认 RSA 授权的安卓测试机；技能装到对应宿主目录。预期结果：`adb devices -l` 显示 `device`，宿主能发现并调用该技能，并且只读任务能跑完而不改动任何设置。

1. 确认本机 ADB：

```bash
command -v adb
adb version
```

2. 缺失时安装 Android SDK Platform-Tools。macOS 可用：

```bash
brew install --cask android-platform-tools
```

Windows 需使用官方 Platform-Tools 并适配路径、引号和截图输出（原文只给了 macOS 命令）。

3. 安装技能（先审阅仓库）。Pi、Codex、OpenCode 可共用一份：

```bash
mkdir -p "$HOME/.agents/skills"
git clone https://github.com/robbin/android-adb-control.git "$HOME/.agents/skills/android-adb-control"
```

前提与注意：目标已存在时先检查，不要覆盖。

4. 只用 Claude Code 时的安装方式：把目标目录改为 `~/.claude/skills/android-adb-control`；若已装共享版本，可建兼容链接：

```bash
mkdir -p "$HOME/.claude/skills"
ln -s "$HOME/.agents/skills/android-adb-control" "$HOME/.claude/skills/android-adb-control"
```

注意：OpenCode 也会扫描 `.claude/skills`，兼容链接可能引起同名告警；确认最终加载路径，不要再安装第二份副本。

5. 项目内安装（可选）：只想在项目内使用时，装到项目的 `.agents/skills/android-adb-control/`；Claude Code 用 `.claude/skills/android-adb-control/`。不要无意重复安装用户级和项目级技能。父项目已有 Git 时，按团队规范处理嵌套仓库或子模块。

6. 让宿主发现技能：Pi 执行 `/reload`；其他宿主若未发现技能，检查技能权限并重开会话。OpenCode 的技能不一定注册为同名斜杠命令。各宿主的调用方式：

| Agent | 用户级目录 | 调用方式 |
|---|---|---|
| Pi Agent | `~/.agents/skills/android-adb-control/` | `/skill:android-adb-control` |
| Codex CLI / IDE | `~/.agents/skills/android-adb-control/` | `$android-adb-control` 或 `/skills` |
| Claude Code | `~/.claude/skills/android-adb-control/` | `/android-adb-control` |
| OpenCode | `~/.agents/skills/android-adb-control/` | 请求加载同名技能，由原生 `skill` 工具调用 |

7. 连接手机（前提：设备已获授权）。在手机上开启开发者选项和 USB 调试，用数据线连接，手动解锁并确认电脑的 RSA 授权，然后运行：

```bash
adb devices -l
```

设备应显示为 `device`。多个设备时明确指定目标；遇到 `unauthorized`、`offline` 或 Linux `no permissions`，先解决连接问题。无线调试是可选项，见 references/troubleshooting.md。不要将 ADB 端口暴露到公网。

8. 从低风险任务开始调用。例如 Pi：

```text
/skill:android-adb-control 打开系统设置首页，确认页面，不修改设置。
```

也可用自然语言请求加载技能，再描述目标和边界——尤其要把「停在哪个动作之前」写清楚：

```text
使用 android-adb-control，在指定测试联系人会话里输入「我稍后回复」，
停在发送前。不要点击发送，也不要按可能触发发送的回车。
```

```text
查看这个测试列表的前 20 个项目，只记录名称和可见编号。
同名项目不要直接合并；到 20 个或预算用完就停止。
```

9. 遵守默认预算与安全约束：默认最多 30 个设备状态变更动作、5 分钟，并为恢复操作预留预算；长任务提前约定有限预算和检查点；发送状态不明时不会自动重发。只操作获授权的设备、Android 用户和 App；发送、购买、删除、安装、导出个人资料及修改安全/网络设置需要明确授权；截图和 UI XML 可能含私人内容，交给云端模型前应确认数据与日志策略；ADBKeyboard 优先用于可信测试设备，不用于凭据输入；默认不改休眠时间、不切换 VPN、不安装辅助 App；无法验证或恢复时停止并报告。技能规则不是技术沙箱，仍需宿主权限控制与人工监督。

10. 静态检查与更新（前提：需要 Bash、Git 和 uv；静态检查不连接手机）：

```bash
uv run --no-project python scripts/check_docs.py
```

更新前检查安装目录的本地修改，确认可接受上游变更后再运行 `git pull --ff-only`，然后刷新 Agent 会话。

### 做法 F：用 Chrome Relay 借用已登录的 Chrome 后台标签页（macOS + Chrome + 四类 agent）

前提：macOS、Google Chrome、Node.js 20+，以及 `agent-browser`。预期结果：`chrome-relay doctor` 自检通过；在单个 Chrome profile 加载扩展后，agent 能用 `chrome-relay url <你的邮箱>` → `open` → `snapshot -i` → `click @e5` → `close` 走完一个需登录站点的四步流程，中途不手动登录；`chrome-relay audit` 能复盘这次会话。

1. 安装 agent-browser：

```bash
npm i -g agent-browser
```

2. 克隆仓库并执行 setup（最省事的替代方案：把 https://agent-chrome-relay.aindeev.com/setup-prompt.txt 粘进 Claude Code / Codex / Cursor，让 agent 自己装）：

```bash
git clone https://github.com/aindeev/agent-chrome-relay
cd agent-chrome-relay
bin/chrome-relay setup     # secret, background service, identities, `chrome-relay` on PATH, Claude Code skill
```

setup 会生成密钥、装后台服务、生成身份映射、把 `chrome-relay` 放进 PATH，并把 Claude Code skill 链进去。链路结构：`agent-browser (CLI) ──ws──▶ relay (127.0.0.1:9333, LaunchAgent) ──ws──▶ Chrome Relay extension ──chrome.debugger──▶ agent tab`。

3. **在每个希望 agent 使用的 Chrome profile 里**加载扩展：打开 `chrome://extensions`，打开 Developer mode，点 Load unpacked，选中你 clone 下来的 `extension` 文件夹。

4. 自检：

```bash
chrome-relay doctor
```

5. 告诉 agent 怎么用这个 skill：Claude Code 由 `setup` 自动把 `skill/SKILL.md` 链到 `~/.claude/skills/chrome-relay`；Codex、Cursor 等把同一个文件指给它们，例如在全局 `~/.codex/AGENTS.md` 里写一行：For any browser step that needs my logins, follow `<path>/agent-chrome-relay/skill/SKILL.md`. 某个仓库的 `CLAUDE.md`/`AGENTS.md` 只需一行指向该 skill。

6. 典型用法（在 agent 里或命令行）：

```bash
agent-browser --cdp "$(chrome-relay url you@company.com)" open https://app.example.com/
agent-browser snapshot -i
agent-browser click @e5
agent-browser close
```

7. 日常维护：`git pull` 之后跑 `chrome-relay update`（重启 relay，并在每个 profile 重载扩展）。卸载：`chrome-relay uninstall`，然后每个 profile 里手动移除扩展。

8. 排查与审计：`chrome-relay logs`（日志在 `~/.chrome-relay/relay.log`）；`chrome-relay audit` 读 `~/.chrome-relay/audit/YYYY-MM-DD.jsonl`；`chrome-relay identities` 管身份映射。环境变量 `CHROME_RELAY_HOME`、`CHROME_RELAY_PORT` 可覆盖数据目录和端口。改扩展要编辑 `extension/` 后跑 `chrome-relay update`。

9. 谁可以连（两道校验，属配置前提）：本机 secret 在 `~/.chrome-relay/token`（权限 600），嵌在 `chrome-relay url` 打印的 URL 里；允许的 agent 应用必须来自 Claude Code、Codex、Cursor 或 Paseo——relay 用 `lsof`、`ps` 查进程，并检查这些应用在子进程里设的标记（`CLAUDECODE`、`CODEX_*`、`CURSOR_*`、`PASEO_AGENT_ID`）及其父进程；带浏览器 `Origin` 头的连接即使有 secret 也被拒；扩展连接还需 `Origin: chrome-extension://<id>`，且 id 由 setup 记到 `~/.chrome-relay/config.json`，连接进程必须是 Chrome。

10. 登录态（`~/.chrome-relay/identities.json`，用 `chrome-relay identities` 管理）：agent 从不输入凭据。当站点跳到 Google 且对应账号已登录时，扩展会替它点账号并点 Continue/Allow；遇到密码、passkey、两步验证或未登录账号，就停下，agent 收到 `SIGN-IN NEEDED`，让你在自己的窗口里登录。站点用哪个 Google 账号来自 identities.json：Chrome profile（setup 填好）、可选的 `sites.rules`、以及 relay 每次成功跳转后自己填的 `sites.learned`。默认用 profile 自己的账号。

11. 自动行为边界：沉默 30 分钟的 agent 标签页会被关闭；relay 重启时扩展会关掉它开过的标签页（按 tab id 追踪，不动你自己的标签组）；登录跳转中的 Continue/Allow 会自动点击。原文没有描述按时间/事件持续跑的自主任务循环。工作期间 Chrome 会显示「Chrome Relay started debugging this browser」。

### 做法 G：AutoCua——用一个 `run_agent(...)` 覆盖桌面、自己的 Chrome、真实终端和 iOS 手机

前提：Python 3.10+；一台可控机器；模型密钥；若要 iOS 则 macOS 宿主 + 完整 Xcode。预期结果：`pip install AutoCua` 成功，`python main.py` 能让 agent 按 `mode` 驱动对应界面，并且模型只从编号元素里选（未展示过的编号会被拒绝）。调研结论：需要在一台可控机器上小范围验证稳定性和安全边界后再进生产；原文只有作者自述的演示时长、没有第三方复现，且示例里的模型名与现有命名不符，需要先核对 `model_list.txt`。建议先用低风险桌面任务（原文示例 `task="check the version of macOS."`）试跑。

1. 安装包：

```bash
pip install AutoCua
```

2. 在 `main.py` 中写入调用：

```python
from AutoCua.agent_launcher import run_agent

run_agent(mode="web use", provider="openrouter", model="gemini-3.8-flash",
          task="Open wikipedia.org and summarise today's featured article.")
```

`mode` 取值与含义：`computer use` 驱动桌面（macOS / Windows / Linux，自动检测）；`shell use` 让编码代理进入真实终端；`web use` 通过 AutoCua 扩展驱动用户自己的 Chrome，无人模式用调试端口；`mobile use, ios` 驱动 iOS 模拟器或已配对的 iPhone/iPad（macOS 宿主）；`mobile use, android` 尚不可用。注意 `model` 名必须来自仓库的 `model_list.txt`（大小写敏感），不在清单里的名字会被原样转发、返回 404；示例中的 `gemini-3.8-flash` 需要先核对。

3. 运行：

```bash
python main.py
```

4. 配置模型密钥：写入 `.env` 文件，或在桌面应用的 Settings 里粘贴。

5. 首次运行注意：加 `ui=True` 可打开桌面应用；首次会询问是否下载 Electron（120–160 MB，一次），回复 `y` 下载，`n` 表示不要且不再问，回车表示暂不；拒绝则在 pywebview 打开。也可随时 `python -m AutoCua.utils.electron` 拉取，不需要 Node.js。代理保存的一切落在运行 Python 目录下的 `AutoCua_data/`。

6. Windows 上处理 UAC 提权弹窗（可选，不做也能用，只是遇到提权提示会停住）。前提：从源码检出目录运行：

```bat
setup_windows.bat
```

该脚本会先询问，然后下载固定版本、校验 SHA-256、安装、只绑定内置键盘，重启前再询问。Windows 用户态 `SendInput` 到不了 UAC 安全桌面，只有内核态能应答；不装它所有模式照样能用，只是丢掉 UAC 处理能力。驱动 pip 装不了（wheel 只解包不执行、pip 不以提权身份运行、驱动只在开机时绑定输入槽）。原因：Interception 驱动是 LGPL-3.0 非商业 / 付费商业双许可，不能随 wheel 分发。

7. Linux 上安装发行版绑定（前提：x86_64 + GNOME 桌面，Wayland 已测，X11 未测）：

```bash
sudo apt install python3-gi python3-cairo python3-gi-cairo python3-venv gir1.2-atspi-2.0 gir1.2-gtk-3.0 \
                 gir1.2-webkit2-4.1 at-spi2-core xdg-desktop-portal xdg-desktop-portal-gnome \
                 gir1.2-gstreamer-1.0 gstreamer1.0-pipewire gstreamer1.0-plugins-base \
                 libglib2.0-bin libgtk-3-bin xdg-utils
```

KDE 用户把 `xdg-desktop-portal-gnome` 换成 `xdg-desktop-portal-kde`。Fedora/Arch/openSUSE 包名不同，仓库里的 `setup_linux.sh` 列了对应名称。

8. Linux 上用虚拟环境（前提：Ubuntu/Debian 拒绝向系统 Python pip 安装；venv 必须建在存放 `main.py` 和 `.env` 的目录里，且用发行版自带 python3，版本 3.10–3.14）：

```bash
cd my-agent
python3 -m venv .venv
source .venv/bin/activate
pip install AutoCua
python main.py
```

9. Linux 首次 computer-use 运行：GNOME 会请求屏幕共享同意，点 Share 前务必打开 **Allow Remote Interaction**（GNOME 默认关闭）。选择会保存在 `AutoCua_data/`。首次扫描还会下载 PP-OCRv6 模型。

10. 从源码运行：

```bash
git clone https://github.com/AutoCua/AutoCua.git
cd AutoCua

bash setup_mac.sh            # macOS
setup_windows.bat            # Windows, 自行提权，安装内核驱动前会询问

cp .env.example .env         # add your provider key
python main.py
```

11. 常用可选参数直接写进 `run_agent(...)`：`ui`、`save_conversation`、`speed`、`external_terminal`、`headless`、`browser_port`、`browser_profile`、`extra_tasks`、`device`、`ios_version`、`sim_device`、`app_build`、`api_key`、`os`。完整文档在仓库的 `agent_capabilities.md`。

12. 分别单独调用子代理：

```bash
python -m AutoCua.mac.agent.coder   --task "refactor the auth module in /Users/me/projects/api" --provider anthropic --model claude-sonnet-5
python -m AutoCua.mac.agent.minions --task "where is _validate_token defined in /Users/me/projects/api and who calls it?" --provider anthropic --model claude-sonnet-5
```

注意：它们从自己的工作目录启动，处理已有项目时要给绝对路径。

13. iOS 使用：选择模拟器或真机：

```python
run_agent(
    mode="mobile use, ios",
    provider="anthropic", model="claude-sonnet-5",
    device="simulation",        # or "hardware"
    ios_version=None,           # e.g. "26.5"; None picks the newest usable runtime
    sim_d
)
```

材料中该示例到 `sim_d` 处截断，完整参数见仓库 `agent_capabilities.md`。`device="simulation"`（默认）跑在 Mac 上的 iOS 模拟器，用 `xcrun simctl` + 一次未签名的 `xcodebuild test`；需要完整 Xcode，不需要 Apple ID、签名或配对；可用 `app_build="MyApp-Simulator.ipa"` 预设安装自己的构建。`device="hardware"` 是已配对的 iPhone/iPad，通过 pymobiledevice3 + USB 转发 + XCUITest 启动；需要一次性配对和 Team ID 签名；不支持 `app_build`，传了会直接报错停止。首次运行会自动克隆 WebDriverAgent，需要完整 Xcode 和 git。

14. 验证 AutoCua 是否按设计工作：模型看到的是一棵元素树（操作系统无障碍树 + OCR 融合）和一张打了编号框的截图，模型只能从编号元素里选，未展示过的编号会被拒绝。桌面输入走操作系统输入层（macOS 的 `kCGHIDEventTap`、Windows 的 `SendInput` / Interception 内核驱动），不打开调试端口。作者声明：无遥测，除所选模型提供方和用户自连的 Telegram 外不发送数据。

15. 效果自证：coder agent 的操作流程内置 VERIFY，且要求「任何含逻辑的改动都要在 `./.AutoCua_verify/` 下写一次性测试并真正运行、记录输出、退出前删除」；`replace` 写入前后各校验一次，行号过期会报 mismatch at line X。除此之外，效果验证更多依赖用户自己定义的任务完成信号（`done`），文档未提供系统性的效果度量方法。

16. 更多工程细节：父子代理分工（父 agent 管屏幕、coder agent 14 个工具、minions 只读侦察兵 6 个工具不可递归，只回 `path:line` 锚定结论）；长任务用独立压缩 agent 把 handoff 摘要拼进 transcript；工具结果预算（单次 200 行或 15,000 字符，`shell` 只留 50 行尾部，`view` 上限 2,000 行，`grep` 上限 8 MB），只消化工具结果的那一步完全跳过屏幕扫描；并行有 `extra_tasks` 和「把并行 agent 钉到某个标签页」两种做法，钉住的 agent 只有 15 个工具；`scrape` 模式不接模型给的 CSS 选择器，而是按页面「形状」找记录，一次读三屏、约 8k token，索引存成 JSON，进入 scraping 模式后工具白名单收缩成 6 个；AppleScript 是一等工具，模型给出完整的 `tell application` 块，运行时负责启动、前台化和 30 秒上限；web agent 有 `speed="fast"` 和 quality 模式，但 6.1 秒等数字是作者视频示例声称，不是第三方实测。

### 做法 H：本地优先的浏览器智能体——在个人 Chrome/Edge 里用 qz 跑真实登录态任务

前提：Chrome 或 Edge；已登录目标站点；模型支持 tool calling；有 API key 或 ChatGPT 账号。预期结果：侧边栏里用一句话跑完一个跨站任务，输出表格/文件/带来源的报告；跑通后可保存为 Skill，下次一句话复用。调研结论要求：先在个人 Chrome/Edge 上跑 2–3 个真实的多源调研与登录态数据抽取任务，逐条核对来源，再把跑通的流程存成 Skill；可靠性目前只有作者自述、没有独立评测，仓库采用度也低，不宜直接全量采用。

1. 安装扩展（商店路径）。在 Chrome Web Store 点 Add to Chrome，点工具栏 qz 图标打开侧边栏。前提：Chrome 或 Edge；Firefox 不支持。预期结果：侧边栏能打开并进入 Settings。

2. 商店不可达时手动安装：从 latest release 下载 ZIP 并解压；打开 `chrome://extensions`，开启 Developer mode；点 Load unpacked，选择解压出的 `qz-browser-agent-extension` 文件夹；打开侧边栏，按下一步配置模型。预期结果：扩展出现在列表里且侧边栏可用。

3. 接入模型：打开 Settings，选择 provider（README 列出的预设包括 OpenAI Codex、OpenRouter、DeepSeek、Kimi For Coding、OpenCode Go、OpenCode Zen、Fireworks AI 等），粘贴 API key 并保存。若用 ChatGPT 账号：选择 OpenAI Codex，按 `auth.openai.com` 的设备码流程登录，回到 qz 选模型并保存，无需 API key。前提：模型支持 tool calling；或使用兼容协议的本地模型服务。预期结果：保存后侧边栏能发起任务，不报模型/鉴权错误。

4. 跑第一个任务。前提：已登录目标站点。在侧边栏输入：

```text
Find this year's Nobel Prize winners in every category and put them in a table with source links.
```

多源对比型任务示例：

```text
Compare the major open-weight LLMs released in the last 6 months, one per row: release date, parameters, context length, license, and key benchmarks, with official sources.
```

预期结果：侧边栏实时可见每一步，可随时介入或停止；输出带来源链接；对未核实项按提示词要求标注。

5. 把跑通的流程固化为 Skill。前提：任务已成功跑完一次，输出结构符合预期。先跑通：

```text
Find 10 arXiv papers on browser agents from the past month, with titles, one-line takeaways, and links.
```

然后对 qz 说「Save this as a Skill」；下次用一句话触发复用（README 示例：说「This week's browser agent papers」）。注意：材料没有给出跨站点改版、跨时间的复用稳定性数据。预期结果：第二次能用一句话触发同类任务。

6. 可选：让外部 agent 把网页任务交给 qz。前提：Node.js 22 或更高；本机默认浏览器已装 qz。先安装 Skill 并配对：

```bash
npx skills add alibaba/qz-browser-agent -g
npx qz-browser-agent@latest connect
```

然后用自然语言对 agent 下指令，例如：

```text
Use qz to compare open-weight LLMs released in the last 6 months and put them in a table with sources.
```

直接用 CLI 或 MCP：

```bash
npx qz-browser-agent@latest create "your task" --stream
npx qz-browser-agent@latest mcp
```

`--stream` 会显示进度、qz 需要你回答的问题，以及最终结果；MCP 客户端使用 `mcp` 返回的 HTTP URL。可全局安装：`npm install --global qz-browser-agent`，之后用 `qz` 代替 `npx qz-browser-agent@latest`。多浏览器配对、追问、导出见 `docs/cli.md`。预期结果：外部 agent 能把任务转交 qz 并拿到回传结果。

7. 可选：从源码构建与调试。前提：Node.js 24 LTS 与 npm；本地有仓库 checkout。

```bash
npm ci
npm run build
```

然后在 `chrome://extensions` 开启 Developer mode，Load unpacked 选择 `dist/extension/`。开发与验证：

```bash
npm run dev       # Rebuild on source changes
npm test          # Run the default test suites
npm run verify    # Type-check and run all automated suites with coverage
```

每次重新构建后需在 `chrome://extensions` 重新加载扩展并重开侧边栏。要新增工具、视图、设置或 provider，参考 `src/capabilities/README.md`。

8. 最小试用顺序按调研结论：先在个人 Chrome/Edge 上跑 2–3 个真实的多源调研与登录态数据抽取任务，逐条核对来源；只把跑通的流程存成 Skill；再考虑让外部 agent 调用或扩大使用范围。预期结果：来源核对通过、未核实项有标注、Skill 复用一次成功。

### 做法 I：用 MCP + 无障碍树 + diff 做浏览器操作（axuse，新增）

前提：Node.js 22+；机器上装有 Chrome、Edge、Chromium 或 Chrome for Testing 之一；宿主支持 MCP（Codex / Claude Code / OpenCode 等）。预期结果：`node src/cli.js doctor` 找到浏览器、启动并做一次快照；宿主能调用 `ax_open` 拿全量快照，之后每个动作只返回 diff；用一句自然语言任务能打开 `https://example.com` 并找到指定链接。调研结论要求：先小范围试用，按 README 接入 Claude Code 或 Codex，只用于表单填写、滚动查找、批量打开 URL 这类浏览器任务，与现有做法做同任务对照；它仅在非商业许可下免费使用，基准数据由作者自行报告且统计口径有疑点，桌面控制也只有 Windows 经过验证。

1. 准备环境并自检（前提：Node.js 22+，机器上装有 Chrome、Edge、Chromium 或 Chrome for Testing 之一）：

```bash
git clone https://github.com/ctoldigital/axuse.git
cd axuse
node src/cli.js doctor        # 找到浏览器、启动、做一次快照
```

浏览器不在默认位置时设 `AXUSE_BROWSER=/path/to/chrome`。预期结果：doctor 能完成一次快照，不报浏览器缺失。

2. 接入宿主（前提：有对应宿主的 CLI；把 `<path>` 换成 `src/cli.js` 的绝对路径）：

```bash
# Codex
codex mcp add axuse -- node /abs/path/axuse/src/cli.js mcp

# Claude Code
claude mcp add --scope user axuse -- node /abs/path/axuse/src/cli.js mcp
```

其他宿主先打印配置块再粘贴：

```bash
node src/cli.js print-config --harness opencode   # 或 agy | generic
```

按 README：Codex 可把打印出的 `[mcp_servers.axuse]` 追加到 `~/.codex/config.toml`，OpenCode 把 `mcp` 块并入 `opencode.json`，Antigravity 或任何 MCP 宿主用打印出的 `mcpServers` 块。预期结果：宿主能连上 axuse MCP server。

3. 把使用约定交给模型（前提：宿主有 skill 或系统提示机制）：仓库根目录的 `SKILL.md` 是面向模型的使用约定，把它指向宿主的 skill 系统或系统提示。预期结果：模型知道按 `ax_open`、`ax_observe`、`ax_fill` 等工具面行动，而不是截图猜坐标。

4. 首次验证（前提：步骤 2 已完成）：用一句自然语言任务触发：

```text
Open https://example.com, find the "More information" link and tell me where it goes.
```

模型会调 `ax_open` 拿全量快照，之后每个动作只返回 diff。预期结果：能找到链接并给出目标地址；每一步只返回相对上次观测的差异。

5. 要登录态或真实浏览器时用 bridge（前提：能手动在 Chrome/Edge 开发者模式 Load unpacked）：

```bash
node src/cli.js setup --browser chrome --harness codex   # 注册 native host、开扩展页、打印要加载的目录和 harness 配置
node src/cli.js bridge verify
```

或分步：

```bash
axuse bridge install        # 注册 native messaging host（Chrome + Edge）
axuse bridge                # 启动 hub（也会随 MCP server 按需拉起）
```

在扩展页 Load unpacked 指向 `bridge/extension`，然后用 `ax_open { url, backend: "extension" }`。`ax_close` 只关 axuse 自己开的标签页。预期结果：bridge verify 通过，agent 能驱动你已登录的 Chrome/Edge。

6. 可选环境变量（写进 MCP server 配置）：

| 变量 | 作用 |
|---|---|
| `AXUSE_HEADLESS=1` | 无窗口启动（服务器、CI） |
| `AXUSE_BROWSER` | 浏览器可执行文件路径 |
| `AXUSE_PROFILE_DIR` | 临时浏览器 profile 目录（默认系统临时目录，退出时删除） |
| `AXUSE_BRIDGE_DIR` | bridge 本地状态目录（macOS 默认 `~/Library/Application Support/axuse`） |
| `AXUSE_ENABLE_MACOS_CUA=1` | 开启 macOS 桌面工具（仍需授予 Accessibility 与 Screen Recording） |
| `AXUSE_BRIDGE_DEBUG=1` | 追踪扩展 bridge 消息 |

7. 非 MCP 的批量抓取（前提：有一份 URL 列表或含链接的 Markdown）：

```bash
node src/cli.js open-urls sources.md --backend extension --output report.md
```

报告只含页面标题、访问状态和有界的 AX 文本摘录，不做语义编造。预期结果：得到一份有界报告，不额外生成原文没有的结论。

8. 自测与回归（前提：想验证环境或改代码）：

```bash
node --test test/diff.test.js test/browser.test.js test/mcp.test.js test/desktop.test.js test/oopif.test.js test/bridge.test.js test/plugin.test.js
```

macOS 桌面能力需显式开启：`AXUSE_ENABLE_MACOS_CUA=1 AXUSE_TEST_MACOS_DESKTOP=1 npm test`，并在系统设置授予 Accessibility 与 Screen Recording。跳过项用 `node tools/skip-audit.mjs` 审计，缺登记即失败，CI 强制执行。预期结果：测试通过；跳过项都有登记。

9. 把错误处理写进提示词（可直接抄这段结构）：

```json
{ "code": "REF_NOT_FOUND",
  "hint": "Refs are per-observation. Call ax_observe, then act on fresh refs.",
  "retry": "reobserve" }
```

按 `retry` 字段决定 reobserve / retry / never，`action_sent` 表示动作是否已经发出（是否需要清理副作用）。预期结果：模型遇到失效引用时先重新观测，而不是拿旧 ref 硬点。

10. 优先用省步骤的工具（来自 README 的工具面）：

- `ax_fill`：一次调用设完整个表单（文本、下拉、复选、单选、开关、自定义下拉、自动补全），可顺带点提交。
- `ax_observe {find:"text"}`：大页面只回匹配行。
- `ax_scroll {until:"text"}`：在页面或滚动面板里滚到目标文本出现。
- `ax_upload`：给文件输入设文件；点到会弹文件选择框时报出来而不是挂住。
- `ax_open_many`：有界 URL 列表顺序打开，回紧凑标题和 AX 摘录，默认关掉临时标签页。

预期结果：同样任务用更少工具调用完成；滚动查找和整表填写不需要逐步截图。

### 怎么选

- 只想验证「这套东西在我这儿能不能用起来」：选做法 A，成本最低。
- 团队已在用 dsh 桌面端、又需要模型真的去读和操作浏览器：选做法 B，并优先复刻它的权限与反馈设计（敏感字段打码、动手前批准开关、回环 id 白名单）和成对基准方法。
- 已有 agent，想让它先做一件有明确对错的事：选做法 C。
- 已有 agent 和一台可信安卓测试机，只做获授权设备与 App 的事：选做法 E，先跑只读任务，再跑「停在动作前」的边界任务。
- 需要完整桌面、隔离沙箱、本地 VM、或把本机接进来：选做法 D。
- 你在 macOS + Chrome + Node.js 20+，希望编码 agent 复用你已登录的 Chrome 后台标签页，且不抢焦点、不弹对话框：选做法 F。先在单机单 profile、非关键账号上试四步流程，并用 `chrome-relay audit` 复盘。
- 你要一个 pip 包和一次 `run_agent(...)` 同时覆盖真实桌面、你自己的 Chrome、真实终端和 iOS 手机，并且能在一台可控机器上先小范围验证：选做法 G。先核对 `model_list.txt`，再用低风险桌面任务试跑。
- 你在 Chrome/Edge 上、想用一句话让浏览器智能体在已登录站点跨站执行并产出带来源的报告，且接受自带模型 key 和先小范围核对来源：选做法 H。
- 你要 MCP 接入 Claude Code / Codex / OpenCode，让 agent 用无障碍树 + diff 操作浏览器，任务以表单填写、滚动查找、批量打开 URL 为主，并接受非商业许可和先与现有做法同任务对照：选做法 I。先跑 `doctor`，接一个宿主，用 3–5 个真实任务对照。
- 做法 I 与做法 B 的差异：B 绑定 dsh 桌面端，走自己的 MV3 扩展与文本快照，提供 17 个工具和成对基准；I 是零 npm 依赖的 MCP server，用 AX 树 + diff + 稳定引用，可接多种 MCP 宿主，有 `ax_fill`、`ax_scroll {until}`、`ax_open_many` 等省步骤工具，但基准为作者自报且统计口径有疑点，许可是非商业。需要成对基准和 dsh 生态选 B；需要 MCP 接入和 AX 树 + diff 选 I。
- 做法 I 与做法 H 的差异：H 是 Chrome/Edge 扩展，侧边栏人机同视，BYO 模型，可保存 Skill，可被编码 agent 通过 CLI/MCP 调用；I 是 MCP 浏览器/桌面操作 server，强调 AX 树 + diff，不靠截图循环，可复用登录态（bridge），但没有侧边栏式人机同视和 Skill 保存描述。需要一句话跨站任务并固化 Skill 选 H；需要 MCP 接入和稳定元素寻址选 I。
- 做法 I 与做法 F 的差异：F 仅 macOS + Google Chrome + 四类 agent 应用，用 Chrome Relay 复用真实登录态后台标签页，不附带模型配置；I 通过 bridge 复用已登录 Chrome/Edge，但需要手动 Load unpacked，宿主是 MCP 宿主，且非商业许可。需要后台标签页与 audit 选 F；需要 MCP + AX 树 + diff 选 I。
- 做法 I 与做法 G 的差异：G 是一个 pip 包和 `run_agent(...)`，覆盖桌面、自己的 Chrome、终端和 iOS；I 以浏览器任务为主，桌面控制只有 Windows 已验证，macOS 需 opt-in，Linux 无桌面驱动。要统一入口覆盖多界面选 G；浏览器表单/滚动/批量任务选 I。
- 已经装了旧包 `cuabot`（npm）：先停用并卸载，见「常见坑」。

## 怎么判断变好了

可观察的指标：
- 做法 A：Cua Bench 的 evaluator 对参考解返回 `1.0`；不需要 VM、Docker 或模型 API key 就能跑。
- 做法 B：`browser_snapshot` 能给出带编号的可操作控件清单和表单字段（含 masked/checked/required），模型用同一个编号就能点，不需要坐标；`browser_wait` 支持 `selector` / `text` 等待条件（等不到报 `timeout` 错误码）而不是固定延时；成对基准能分别跑出 `playwright` 与 `extension` 两个后端在同批任务上的数字。注意仓库 README 通篇没有给出基准实测结果，所以基准跑出来的数字才是你自己的证据。
- 做法 C：计算器里 6 × 7 的结果被验证为显示 42。
- 做法 D：Lume 创建并启动的 macOS Tahoe VM 能用 SSH 连上；`cua sb exec dev uname -a` 能返回结果；`cua sb screenshot dev` 能拿到截图。
- 做法 E：任务一次跑通的步骤数对比你手动操作的步数；人工接管次数（越少越好）；越界动作次数——未经授权的发送/购买/删除/安装/改设置次数应为 0，「停在发送前」这类约束是否 100% 被遵守；是否守住预算（动作数不超过 30、时长不超过 5 分钟，超预算时正确停止并报告）；不可验证/不可恢复时是否如约停止并报告；同一任务重复执行多次的成功率与结果一致性。
- 做法 F：四步流程（`chrome-relay url <你的邮箱>` → `open` → `snapshot -i` → `click @e5` → `close`）一次跑通的成功率；每条命令的实际耗时（对照作者称的 ~0.15s）；出现 `SIGN-IN NEEDED` 的次数（越少说明登录态复用越顺；频繁出现则调 `identities.json`）；运行过程中是否发生抢焦点、弹框、Chrome 弹远程调试确认框（按设计应为 0；工作期间 Chrome 会显示「Chrome Relay started debugging this browser」）；`chrome-relay audit` 里 blocked pages 的数量与原因，确认权限边界符合预期；对比基线：同样这些浏览器步骤之前靠人工切换窗口/手动登录花的时间。
- 做法 G：`pip install AutoCua` 成功；`python main.py` 后 agent 能按 `mode` 驱动对应界面；模型只从编号元素里选，未展示过的编号被拒绝；桌面输入走 OS 输入层而不打开调试端口；coder agent 的含逻辑改动在 `./.AutoCua_verify/` 下写一次性测试并运行、记录输出、退出前删除；`replace` 行号过期时报 mismatch at line X；`AutoCua_data/` 里能看到聊天、密钥、自定义技能、浏览器 profile；低风险桌面任务 `task="check the version of macOS."` 能跑通。作者视频示例声称：一次航班搜索 6.1 秒（fast 模式）；一次运行不足一分钟完成三件事——这些是作者主张，不是第三方实测。
- 做法 H：2–3 个真实的多源调研/登录态数据抽取任务能跑完；输出带来源链接；逐条核对来源后，未核实项被标注；跑通的流程能「Save this as a Skill」并用一句话再次触发；外部 agent 通过 `npx qz-browser-agent@latest create ... --stream` 或 MCP 能拿到结果；侧边栏每一步可见、可介入或停止。材料没有给出准确率、耗时、成功率；不要用 46 stars 或作者对比表当效果证据。
- 做法 I：`node src/cli.js doctor` 能完成一次快照；首次验证任务能找到 `https://example.com` 上的 "More information" 链接并给出目标地址；`ax_open` 拿全量快照后，后续动作只返回 diff；`ax_fill` 能一次设完整个表单（文本、下拉、复选、单选、开关、自定义下拉、自动补全）；`ax_observe {find:"text"}` 大页面只回匹配行；`ax_scroll {until:"text"}` 能滚到目标文本；`ax_upload` 遇到文件选择框会报出来而不是挂住；`ax_open_many` 有界打开 URL 并回紧凑标题和 AX 摘录；错误按 `retry` 字段处理（`reobserve` / `retry` / `never`），`action_sent` 能判断动作是否已发出。作者自报的基准（16 个服务端评分任务、同一 harness/模型）：axuse 28/28、Codex + Chrome 扩展 27/27、browser-use 0.13 27/27；中位每任务 17s / 26s / 56s；token 总量 4.7M / 9.8M / 8.8M；中位工具调用 5 / 7 / 12。注意称 16 个任务却给出 28/28，统计口径未解释；7 任务扩展只跑过一次；全部为作者自建自评，没有第三方复现——只能作为作者主张参考，不能当定论。

最小试用方式：
- 先只跑做法 A 的两条安装命令，建最小任务、跑参考解，确认 reward 为 `1.0`。这是「这套东西在我这儿能不能用起来」最便宜的入口。
- 若团队已在用 dsh 桌面端，做法 B 的最小试用是「装桥接插件 → 在 profile 里装一次扩展 → 让模型做一次快照与点击」。成对基准要等你自己的 dsh 命令行就位（`BENCHMARK_DSH_COMMAND`）再跑。
- 跑通后再做做法 C：只装 Driver，让现成 agent 在计算器里算 6 × 7 并确认显示 42。
- 做法 E 的最小试用顺序：① 准备一台可信测试机（非承载凭据的主力机），开启开发者选项与 USB 调试，解锁并确认 RSA 授权，`adb devices -l` 显示 `device`；② 按第 3～6 步装技能到对应宿主目录，重开会话或 `/reload`，确认技能能被发现并调用；③ 先只跑只读任务「打开系统设置首页，确认页面，不修改设置」；④ 再跑一条「停在动作前」的边界任务（测试联系人会话里输入草稿但明确不发送）；⑤ 最后跑一条有限列表任务（前 20 项，只记录名称与编号，到 20 个或预算用完即停）。指标稳定达标后再扩到真实业务设备；若出现越界动作或无法恢复的状态，停止使用并报告。
- 做法 F 的最小试用（一台 Mac，约需几分钟安装）：① `npm i -g agent-browser`，clone 仓库后跑 `bin/chrome-relay setup`；② 在一个 Chrome profile 里 Load unpacked 加载扩展，跑 `chrome-relay doctor` 确认；③ 选一个需要登录的内部站点，让 agent 走完 `chrome-relay url <你的邮箱>` → `open` → `snapshot -i` → `click @e5` → `close` 这条四步流程，中途不手动登录；④ 跑 `chrome-relay audit` 复盘这次会话记录是否完整。放量前的门槛：先只在单机单 profile、非关键账号上试；确认 audit 记录、权限拦截和登录跳转行为符合预期后，再考虑更多 profile 或更多 agent。
- 做法 G 的最小试用（一台可控机器，Python 3.10+）：① 先核对 `model_list.txt`，`pip install AutoCua`，写好 `.env` 或桌面 Settings 里的模型密钥；② 用低风险桌面任务 `task="check the version of macOS."` 试跑，确认「一行 mode 切换驱动对象」是否真的省事；③ 用 `run_agent(mode="web use", ...)` 让它驱动你自己的 Chrome 打开一个页面并停下，确认登录态复用和停止条件；④ 若要用桌面模式，先跑 `computer use` 做一个可判对错的小任务；⑤ 若要用 iOS，先跑 `device="simulation"` 的模拟器任务，确认 WebDriverAgent 克隆和 Xcode 环境；⑥ 观察 `AutoCua_data/` 数据落点，确认没有你不希望外发的数据。
- 做法 H 的最小试用：① 在个人 Chrome/Edge 装扩展并接一个自带 API key 的模型（或 ChatGPT 账号）；② 选一个已登录的真实站点，跑一个带来源要求的小任务，逐条核对来源；③ 再跑 1–2 个多源调研或登录态抽取任务；④ 只把跑通的流程说「Save this as a Skill」；⑤ 需要时再按第 6 步接外部 agent。放量前门槛：来源核对通过、未核实项有标注、Skill 复用一次成功；材料没有给出耗时，按 2–3 个任务的实际核对结果判断。
- 做法 I 的最小试用（半天内）：① 一台机器 clone 并跑通 `node src/cli.js doctor`；② 接到 Claude Code（或 Codex）的一个会话，把 `SKILL.md` 指给 skill 系统或系统提示；③ 用 3–5 个手上真实的浏览任务跑一遍，覆盖一个整表填写加提交、一个滚动查找、一个多 URL 批量（`ax_open_many` 或 `open-urls`）；④ 同一批任务用现有做法（截图式 agent 或你已在用的路线）做对照，记录通过数、中位耗时、总 token、中位工具调用数；⑤ 若要用 bridge，再跑 `node src/cli.js setup --browser chrome --harness codex` 和 `node src/cli.js bridge verify`。放量前门槛：同任务对照不差于现有做法，且 `ax_fill`/`ax_scroll`/`ax_open_many` 至少各成功一次；不要拿作者自报的 28/28 当定论。

试多久：
- 材料没有给出耗时或成功率的数字；以「参考解拿到 `1.0`」「快照能给出编号控件并且点得中」「只读任务不改动设置」「Chrome Relay 的 doctor 通过且四步流程一次跑通」「AutoCua 能驱动目标界面一次且模型只选编号元素」「qz 的 2–3 个真实任务来源核对通过且 Skill 一句话复用成功」「axuse 的 doctor 通过且 3–5 个真实任务与现有做法对照有结果」这类单点事实跑通为准，不要用 star 数或视频演示判定。
- AutoCua 材料同样没有给出耗时或成功率数字（6.1 秒、不足一分钟只是作者视频声称）；以「能驱动目标界面一次」「模型只选编号元素」「含逻辑改动真的跑过一次性测试」这类单点事实跑通为准。
- axuse 的基准数据是作者自报且统计口径有疑点；以你手上 3–5 个真实任务的同任务对照为准，不以 README 的 28/28 或 17s 为中位耗时定论。

## 常见坑

- 把关注度当可用性：28,641 stars、今日 +229 只说明有人看，原文没有给任何性能数字；dsh 方案 README 同样通篇没有基准实测结果；android-adb-control 标称 40 stars，也没有给出任何效果数据或真实案例结果。AutoCua 也只有作者自述的演示时长，没有第三方复现；qz 仓库仅 46 stars，同样没有独立评测；axuse 47 stars、单一公司维护，基准为作者自建自评且统计口径有疑点。
- 以为插件能替你装浏览器扩展：不能。命令行 `--load-extension` 只维持一个会话，关掉浏览器就没了；Chrome 137+ 的品牌版 Chrome/Edge 已忽略 `--load-extension`。必须在 profile 里正式装一次。
- 上架包传错：普通构建带 manifest `key`，Chrome Web Store 会拒收，要传 `-store` 包。
- 以为默认有人把关：`unrestrictedBrowserAccess` 出厂为开，新装不做询问；关掉才恢复动手前提示，而且它还会覆盖「读页面前先问」的选择。
- 把图像通道当默认能力：图像识别默认关，一旦开启你询问的那张图会离开本机交给所配模型；扩展直连的 endpoint、模型、密钥只存在扩展存储里，面板只显示 off / low / standard / enhanced 档位。
- 模型名写显示名：`visionModel` 必须是 API id（写 `deepseek-flash`，别写 `DeepSeek-V4.1-Flash`），否则 API 会 400。
- 把文本快照当能覆盖一切：`<canvas>` 明确不收集；CSS background-image 里类声明的走有界 computed-style 扫描，上限 1500 个元素或 20 张背景图；图片超过 `MAX_IMAGE_BYTES`（4 MB）就不内联、退回把 URL 交给桌面端。
- 以为装了技能就有人把关：android-adb-control 的规则不是技术沙箱，仍需宿主权限控制与人工监督；作者自述「本版本已做文档审查和静态检查，尚未完成修订版真机端到端验收」。
- 把「兼容四个宿主」当成「四个宿主都验收过」：原文的兼容只是格式与加载层面。
- 重复安装技能：用户级和项目级不要都装；从 `.agents/skills` 往 `.claude/skills` 建符号链接时注意 OpenCode 也扫描 `.claude/skills`。
- 以为云端会话能跑安卓路线：云端会话或远程容器不会自动获得本地 USB 设备。
- 拿主力机做实验、或把截图与 UI XML 往外发：截图和 UI XML 可能含私人内容；ADBKeyboard 优先用于可信测试设备，不用于凭据输入，用后恢复输入法状态。
- 把设备连接问题当技能问题：`unauthorized`、`offline`、Linux `no permissions` 先解决连接；多个设备时明确指定目标；不要将 ADB 端口暴露到公网。
- 以为技能会自己无限跑：默认预算是最多 30 个设备状态变更动作、5 分钟，发送状态不明时不会自动重发；原文也没有时间/事件触发的持续运行、无人值守监控或无限重试。
- 忽略成熟度：Cua Spaces 是 0.1.0，个人免费，Pro 和 Teams 标注为「即将推出」；CUA-S1 自述为早期源码研究发布；dsh 扩展在 Chrome / Firefox 均 not yet listed。
- 环境不满足硬装：Spaces 需 macOS 26+，Lume 需 Apple Silicon；dsh 需 Node ≥ 20、桌面版浏览器 ≥ 116/140；手机与平板不支持 dsh 方案；Windows 下只有 Cua Driver 有 PowerShell 安装脚本；AutoCua 需 Python 3.10+；axuse 需 Node.js 22+ 且机器上有 Chromium 系浏览器。
- 跑错已废弃包：`cuabot`（npm）有已知安全问题，原文明确写 Do not run it，应停用并卸载，改用 Cua Driver 或 `cua` CLI；`cua-computer`、`cua-computer-server`、`cua-agent`、`cua-som` 也已被替代。
- 以为后台投递一定成立：「不移动指针、不抢焦点」只在「app 和平台支持时」成立；原文也没有给出由时间、事件或状态触发并持续完成任务的机制。
- 商用许可踩坑：Spaces 之外的 SDK、CLI、Driver、Lume 是 MIT；Cua Spaces 是 FSL-1.1-MIT；`cua-som` 是 AGPL-3.0-or-later；`cua-perception` 打包了 AGPL-3.0-only 的 OmniParser 模型产物；android-adb-control 是 MIT；AutoCua 是 MIT，其 Windows Interception 驱动是 LGPL-3.0 非商业 / 付费商业双许可。做商用集成前必须逐目录查 LICENSING.md。axuse 是 PolyForm Noncommercial 1.0.0，免费仅限非商业（个人、研究、教育、慈善、公共机构），商业使用需向 CTOL Digital Solutions 单独授权。
- 以为 README 就是全部：Cua 的权限授予、平台支持边界、任务编写格式都在外链文档里；dsh 的安装确认要按仓库 `docs/INSTALL.md`；android-adb-control 的具体 ADB 命令、故障处理、真机验收清单在 references 和 docs/testing.md 里，本次材料只包含 README。
- 以为 Chrome Relay 能覆盖所有浏览器：仅 macOS + Google Chrome + Node.js 20+；只放行 Claude Code / Codex / Cursor / Paseo 四类 agent 应用。
- 以为 setup 会自动装扩展：不会。Chrome Relay 是 opt-in 的，需要每个希望 agent 使用的 Chrome profile 手动 Load unpacked。
- 把 Chrome Relay 当恶意软件安全边界：作者明确说它不是对「已以你身份运行的恶意软件」的安全边界。
- 忽略调试提示条：工作期间 Chrome 会显示「Chrome Relay started debugging this browser」。
- 把作者自述当实测：0.15s/命令、2 分钟 setup、30 分钟沉默清理都是作者自述，没有第三方基准或用户案例数据。
- 以为它会自动推进任务：原文的自动行为是清理而非任务推进；原文没有描述按时间/事件持续跑的自主任务循环。
- 凭据处理：Chrome Relay 的 agent 从不输入凭据；遇到密码、passkey、两步验证或未登录账号会停下并给 `SIGN-IN NEEDED`；频繁出现时调 `identities.json`。
- 忘记卸载：`chrome-relay uninstall` 后还要每个 profile 手动移除扩展。
- 把 AutoCua 的 `mobile use, android` 当成可用：尚不可用；iOS 模式仅 macOS 宿主，模拟器需要完整 Xcode，真机需要一次性配对和 Team ID 签名；给真机传 `app_build` 会直接报错停止。
- AutoCua 模型名写错或大小写不对：模型名来自 `model_list.txt`，区分大小写；不在清单里的名字会原样转发并返回 404。示例中的 `gemini-3.8-flash` 先核对再用。
- 在 Ubuntu/Debian 直接 `pip install AutoCua` 进系统 Python：会拒绝，需在存放 `main.py` 和 `.env` 的目录用发行版自带 python3（3.10–3.14）建 venv。
- Linux 首次 computer-use 没开 Allow Remote Interaction：GNOME 屏幕共享同意里默认关闭，不打开会导致远程交互失败。
- 把 Windows 的 `setup_windows.bat` 当自动运行：它先询问，答 N 则不下载不安装；Interception 驱动不能随 wheel 分发。不装它所有模式照样能用，只是丢掉 UAC 处理能力。
- 忽略 `AutoCua_data/` 的数据落点：代理保存的聊天、密钥、自定义技能、浏览器 profile 都落在运行 Python 目录下。
- 把 AutoCua 作者视频里的 6.1 秒、不足一分钟完成三件事当实测：原文是视频示例声称，没有第三方基准或用户案例数据。
- 以为 AutoCua 提供系统性效果度量：文档未提供，效果验证更多依赖用户自己定义的任务完成信号（`done`）。
- 以为 AutoCua 有事件/时间触发调度：材料里事件/时间触发式的调度细节未出现。
- 把 AutoCua 和 Cua 生态的命令混用：它们是不同项目、不同命令、不同许可。
- 把 qz 当 Firefox 可用：明确不支持。
- 把 qz 的 46 stars 当可用性：采用度低、社区反馈样本少。
- 把 qz 的 README 对比表当第三方基准：作者按公开文档自评，时间点为 2026 年 10 月；材料不含 `docs/benchmarks.md` 内容。
- 忽略 qz 的权限面：浏览器扩展能读取你所有已登录站点，材料只指向 `docs/permissions.md`，没有具体权限内容，使用前自行核查。
- 以为 qz 有定时/事件触发：README 没有给出定时调度、事件监听或状态触发；周期性任务仍需人或外部 agent 再次发起。
- qz 的模型不支持 tool calling 却硬接：这是前提。
- qz 的 Node 版本不够：外部 agent 桥接需 Node.js 22+；源码构建需 Node.js 24 LTS。
- qz 源码构建后忘记重新加载扩展/重开侧边栏；手动安装选错文件夹（要选解压出的 `qz-browser-agent-extension` 文件夹）。
- 把 qz 的 ChatGPT 账号登录和 API key 混在一起：选 OpenAI Codex 走设备码流程，无需 API key。
- 以为 qz 数据完全不出本机：按 README 声明，数据只发给你选的模型和你访问的网站；模型调用本身会把任务内容发给模型提供方，需自行确认数据与日志策略。
- 把 qz 和 dsh / Chrome Relay / AutoCua 的命令混用：不同项目、不同命令、不同许可。
- 把 axuse 的基准当定论：称 16 个服务端评分任务却给出 28/28、27/27、27/27，统计口径未解释；7 任务扩展只跑过一次；全部为作者自建自评，没有第三方复现。
- 把 axuse 用于商业用途而不看许可：PolyForm Noncommercial 1.0.0 免费仅限非商业，商业使用需向 CTOL Digital Solutions 单独授权。
- 忽略 axuse 的维护风险：47 stars、单一公司维护，长期维护需自行评估。
- 在 axuse 的 extension backend 下想进入 OOPIF 帧：只能列出、不能进入；CDP backend 可以。
- 以为 axuse 能绕过反爬：它不实现流量标注和反爬交接，指纹识别自动化的站点仍可能拦。
- 在 Linux 上找 axuse 桌面驱动：没有；浏览器工具仍可用。macOS 桌面控制需 `AXUSE_ENABLE_MACOS_CUA=1` 并授予 Accessibility 与 Screen Recording。
- axuse bridge 的 Edge native messaging host manifest 没写 `allowed_origins`：会连不上。
- 以为 axuse 的商业 CAPTCHA solver 默认可用：它是另外计费的插件，需装 `AXUSE_PLUGINS`。
- 把 axuse 的 `open-urls` 当无限批量：它是有界的一次性批处理，报告只含标题、访问状态和有界 AX 摘录。

## 证据与来源

- 做法 A 的两条安装命令、做法 D 的 `cua sb` 四条 CLI 命令、沙箱 Python 片段、Driver 与 Lume 安装命令：来自 trycua/cua README（本次整理的 Cua 调研材料）。
- 三个带验收标准的「first result」（Calculator 显示 42、Lume VM 能 SSH 连上、Cua Bench 参考解 reward=1.0）：来自同一份 Cua 调研。
- 做法 B 的安装/构建命令、17 个工具名、`cordis.patch.yml` 与 `chrome.storage.local` 配置片段、基准命令与 6 任务 × 5 种子 × 2 后端 = 60 次的规模：来自 youbaiyun/dsh-browser-crossplatform 仓库 README 与源码结构（本次整理的 dsh 调研材料）。
- 文本快照的覆盖范围、`MAX_IMAGE_BYTES` 4 MB、图像缓存 24 小时/200 条/两次重试、失败分类 `too-large`/`unsupported-url`/`fetch-failed`/`empty`：来自同一份 dsh 调研，属源码与文档描述，可核对但本次未独立实测。
- 敏感字段打码规则与「可访问名称绝不使用输入框当前值」：来自同一份 dsh 调研，仓库自述有单元测试强制，本次没有独立复现。
- `unrestrictedBrowserAccess` 出厂为开、`hello.ok` 在无法构建视觉客户端时上报 `imageRecognition: false`、特权网关方法对非回环远端一律拒绝：来自同一份 dsh 调研。
- 「浏览器路线更高效」目前只是主张：dsh README 通篇没有给出基准实测结果，所以基准命令只能证明方法可跑，不能证明更快或更准，需要你自己跑出数字。
- star 数 28,641、今日 +229 和两段视频说明：来自 Cua 调研，只能说明关注度，不说明可用性。
- 「后台投递、不移动指针不抢焦点」、`cua daemon` 常驻、Multiplayer 同桌面接手：来自 Cua 调研，但原文没有给出触发式持续完成任务的机制，属于作者主张而非可验证数据。
- 许可与成熟度（Spaces 0.1.0、CUA-S1 早期研究版、FSL-1.1-MIT、AGPL 相关风险）：来自 Cua 调研的「证据与局限」部分。
- 做法 E 的安装命令与目录、四宿主调用方式对照表、三条示例提示词、默认预算（30 个设备状态变更动作 / 5 分钟）、安全与授权清单、静态检查命令 `uv run --no-project python scripts/check_docs.py`、MIT 许可、40 stars、引用文档清单：来自 robbin/android-adb-control README（本次整理的调研材料）。
- 安卓路线的「观察—执行一步—验证—再决定下一步」循环、发送状态不明不自动重发、预算与检查点：来自同一份 README，属于方法描述而非实测数据。
- 安卓路线目前只是主张：作者自述本版本已做文档审查和静态检查，尚未完成修订版真机端到端验收；「兼容四个宿主」只是格式与加载层面的兼容声明；没有给出成功率、耗时、错误率或真实案例结果。
- 做法 F 的命令、架构图、路径、端口 127.0.0.1:9333、权限校验机制、四步用法、audit 字段、登录态处理、维护命令：来自 aindev/agent-chrome-relay README（本次整理的调研材料）。
- Chrome Relay 的 0.15s/命令、2 分钟 setup、30 分钟沉默清理只是作者自述；没有第三方基准或用户案例数据；仅 macOS + Google Chrome + Node.js 20+；只放行四类 agent 应用；作者明确它不是恶意软件安全边界。
- 做法 G 的 `pip install AutoCua`、`run_agent(...)` 示例、`mode` 表、平台依赖、Linux venv、GNOME 屏幕共享、Windows UAC、iOS 模拟器/真机差别、`setup_mac.sh` / `setup_windows.bat`、`model_list.txt`、`AutoCua_data/`、可选参数列表、子代理命令、`agent_capabilities.md`：来自 ComputerUseAgent/AutoCua README（本次整理的调研材料）。
- AutoCua 的元素树 + OCR 融合、编号框截图、未展示编号被拒绝、桌面输入走 `kCGHIDEventTap` / `SendInput` / Interception 内核驱动：来自同一份调研，属项目描述。
- AutoCua 的父子代理分工、长任务 handoff 摘要压缩、工具结果预算、跳过屏幕扫描、并行与钉标签页、`scrape` 模式、AppleScript 30 秒上限、`speed="fast"` 与 quality 模式：来自同一份 AutoCua 调研，属项目描述。
- AutoCua 的无遥测声明、coder agent 的 VERIFY 与 `./.AutoCua_verify/` 要求、`replace` 行号过期报错、多智能体层次与上下文压缩：来自同一份调研。
- AutoCua 的 6.1 秒航班搜索、不足一分钟完成三件事：来自同一份调研的作者视频示例声称，不是第三方基准或用户案例数据。
- AutoCua 的 MIT 许可、Interception 的 LGPL-3.0 双许可：来自同一份调研。
- 做法 H 的安装路径（商店安装 + 手动 Load unpacked）、模型接入（API key / OpenAI Codex 设备码）、三条任务示例、Skill 保存与复用示例、`npx skills add ...`、`connect`、`create ... --stream`、`mcp`、`npm install --global qz-browser-agent`、源码构建 `npm ci` / `npm run build` / `npm run dev` / `npm test` / `npm run verify`、provider 预设列表、Node.js 22+（桥接）/ Node.js 24 LTS（源码构建）、Chrome/Edge、Firefox 不支持、Apache-2.0、46 stars：来自 alibaba/qz-browser-agent README（本次整理的调研材料）。
- qz 的「通用 agent 会被登录墙、长点击序列、滚动加载打断，qz 能可靠执行」、并行/子任务避免卡死、对比表：属作者主张；README 没有成功率或案例数据；对比表是作者按公开文档自评，不是第三方基准；材料不含 `docs/benchmarks.md` 内容。
- qz 的权限细节：README 指向 `docs/permissions.md`，本次材料未包含其内容；使用前需自行核查。
- qz 没有给出定时调度、事件监听或状态触发；周期性任务仍需人或外部 agent 再次发起。
- qz 的 Skill 复用稳定性（跨站点改版、跨时间）未提及。
- 做法 I 的 clone、`node src/cli.js doctor`、MCP 接入命令（`codex mcp add` / `claude mcp add`）、`print-config --harness`、`SKILL.md`、`bridge setup` / `bridge verify`、环境变量、`open-urls`、自测命令、错误 JSON、工具面（`ax_fill` / `ax_observe {find}` / `ax_scroll {until}` / `ax_upload` / `ax_open_many`）：来自 ctoldigital/axuse README（本次整理的调研材料）。
- axuse 的基准数据（16 个服务端评分任务、axuse 28/28、Codex + Chrome 扩展 27/27、browser-use 0.13 27/27、中位每任务 17s/26s/56s、token 4.7M/9.8M/8.8M、中位工具调用 5/7/12；7 任务扩展 axuse 7/7，Codex+Chrome 2 个因停下等确认失败，browser-use 失败 1 个）：来自同一份 axuse README，属作者自建自评；称 16 个任务却给出 28/28，统计口径未解释；7 任务扩展只跑过一次；没有第三方复现。只能作为作者主张 + 自报数据，不能当作定论。
- axuse 的 PolyForm Noncommercial 1.0.0 许可、47 stars、单一公司维护、bridge 的 native messaging host 注册、extension backend 没有 Target domain、OOPIF 只能列出不能进入、CDP backend 可进入、不实现流量标注和反爬交接、macOS 桌面需 opt-in 且受 TCC 保护、Linux 无桌面驱动、商业 CAPTCHA solver 是另外计费的插件：来自同一份 axuse 调研。
- axuse 的「浏览器任务用 AX 树 + diff，截图只留给视觉或 canvas 校验」「动作触发的 JS 对话框与新标签页汇报」「`action_sent` / `side_effect`」「事件环形缓冲」：来自同一份调研，属项目描述，本次未独立实测。

## 依据的调研

- [trycua/cua](../research/radar/2026-10-08/1857-trycua-cua.md)：值得一试，可以把 Cua 当作一套「让 AI 真正操作电脑」的试验台小范围搭起来：先用 Cua Bench 的无 VM 模拟任务跑通「建任务→跑参考解→evaluator 返回 reward=1.0」，再装 cua-driver 做 Calculator 6×7 这类有明确验收标准的首个结果；理由是原文给了可复制的安装与 CLI 命令和明确的验收口径，但详细权限/平台支持步骤都在外链文档里，且 Spaces 仅 0.1.0、CUA-S1 为早期源码研究版，尚不足以直接写进手册当标准流程。
- [youbaiyun/dsh-browser-crossplatform](../research/radar/2026-10-08/2037-youbaiyun-dsh-browser-crossplatform.md)：值得一试，若团队已在用 dsh 桌面端、又需要让模型真的去读和操作浏览器，可以按仓库给出的安装/配置命令小范围试装，并优先复刻它的权限与反馈设计（敏感字段打码、动手前批准开关、回环 id 白名单）和成对基准方法；理由是安装命令、配置片段、工具面与验证指标都能直接照抄，但 README 通篇没有给出基准实测结果，且方案完全绑定 dsh 生态，不宜直接全量采用。
- [robbin/android-adb-control](../research/radar/2026-10-09/2231-robbin-android-adb-control.md)：值得一试，先把该技能装到一台可信测试机上，用最低风险任务（如“打开系统设置首页并只读确认”）跑通观察—一步操作—验证的闭环，再考虑扩大范围；README 给了可照做的安装路径、调用方式和安全预算，但作者自述本版本尚未完成真机端到端验收。
- [aindeev/agent-chrome-relay](../research/radar/2026-10-11/2456-aindeev-agent-chrome-relay.md)：值得一试，在一台 Mac 上按 README 的 setup 流程装 Chrome Relay，让 Claude Code/Codex/Cursor 这类编码 agent 借用你已登录的 Chrome 后台标签页做网页操作；它给出了可直接照做的命令、安装步骤和权限/审计机制，值得小范围试，但仅限 macOS、只放行四类 agent 应用，且作者自认不是恶意软件的边界，所以先试不要全量铺开。
- [AutoCua/AutoCua](../research/radar/2026-10-13/2911-autocua-autocua.md)：值得一试，可以把 AutoCua 当作"给代理开放真实桌面/浏览器/手机界面权限"的可试方案：它给出了完整的 pip 安装、各平台依赖清单、run_agent 调用示例和权限配置步骤，但需要在一台可控机器上小范围验证稳定性和安全边界后再进手册。
- [ComputerUseAgent/AutoCua](../research/radar/2026-10-13/2954-computeruseagent-autocua.md)：值得一试，可以按 README 的命令在 macOS 上装好并用一条低风险桌面任务（原文示例 `task="check the version of macOS."`）做小范围试跑，确认「一行 mode 切换驱动对象」这条用法是否真的省事；只给 try 不给 adopt，是因为原文只有作者自述的演示时长、没有第三方复现，且示例里的模型名与现有命名不符，需要先核对 model_list.txt 再投入生产流程。
- [alibaba/qz-browser-agent](../research/radar/2026-10-19/4769-alibaba-qz-browser-agent.md)：值得一试，先在个人 Chrome/Edge 上装扩展、接一个自带 API key 的模型，跑 2–3 个真实的多源调研与登录态数据抽取任务，逐条核对来源后再把跑通的流程存成 Skill 复用；理由是 README 给出了完整的安装、配模型、CLI/MCP 接入与源码构建步骤，可照做，但可靠性只有作者自述、没有独立评测，仓库采用度也低，还不宜直接 adopt。
- [ctoldigital/axuse](../research/radar/2026-10-20/5183-ctoldigital-axuse.md)：值得一试，建议先小范围试用：按 README 的步骤把 axuse 以 MCP 方式接入 Claude Code 或 Codex，只用于表单填写、滚动查找、批量打开 URL 这类浏览器任务，与现有做法做同任务对照。理由是安装、配置、错误处理约定和自测命令都可以直接复制，但它仅在非商业许可下免费使用，基准数据由作者自行报告且统计口径有疑点，桌面控制也只有 Windows 经过验证。
