# 让 AI 操作界面前，先证明它看得见、做得对、退得回

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在把浏览器、桌面、终端、手机或电视交给 AI 操作前，用成本递增的小实验验证反馈回路、验收标准、安全边界和可回滚性，并用同批任务数字判断是否真的变好。
> 先试这一步：先做做法 A：只跑 Cua Bench 评测回路，确认参考解 reward 为 1.0，再决定接哪种界面。
> 最近修订：2026-11-09

## 解决什么问题

在把浏览器、桌面、终端、手机或电视界面交给 AI 操作之前，用成本递增的步骤先验证它的反馈回路、验收标准、安全边界和可回滚性，并把“高效”变成同批任务上的可比较数字，避免装完一堆组件却不知道能不能用。路线包括：A 评测回路；B dsh 文本快照；C Cua Driver；D 整套/沙箱/VM；E Android ADB 技能；F Chrome Relay；G AutoCua；H qz；I axuse；J Android TV 去臃肿；K agent-desktop；L Agent-VScreen Android 后台虚拟屏。

## 适用与不适用

**适用：**
- 你希望 agent 真的去读和操作浏览器标签页：dsh 桌面端 + MV3 扩展的文本快照路线。
- 你已有 Claude Code / Codex / Cursor / OpenClaw 等 agent，想通过 MCP 或 skill 接上界面操作能力。
- 你在 macOS + Google Chrome + Node.js 20+，希望编码 agent 借用你已登录的 Chrome 后台标签页做网页操作，且不抢焦点、不弹对话框：Chrome Relay。
- 你要在 macOS / Windows / Linux 上让 agent 操作真实桌面、自己的 Chrome、真实终端或 iOS 模拟器/已配对 iPhone/iPad：AutoCua 或 Cua 生态。
- 你已有能执行 shell 命令的 agent，想让它操作有 GUI 但没有 API/CLI 的桌面软件，且任务能靠结构化 ref 定位元素而不是像素匹配：agent-desktop。
- 你有安卓测试机，想用 ADB 做“观察—一步操作—验证”，并愿意先跑只读任务：做法 E。
- 你在 Chrome 或 Edge 上，希望用一句话让浏览器智能体跨站执行、翻页、滚动加载并抽取数据；要在已登录站点做多源调研、对比表、带来源的报告，且愿意自带模型 API key：qz。
- 你要 MCP 接入 Claude Code / Codex / OpenCode，让 agent 用无障碍树 + diff 操作浏览器，任务以表单填写、滚动查找、批量打开 URL 为主：axuse。
- 你有一台可弃用的旧安卓/Google TV，电视和电脑在同一 Wi-Fi，电脑已装 Claude Code，电视能打开开发者选项，愿意先记录基线、读仓库说明并只在一台设备上跑一轮：Android TV 去臃肿路线。
- 你在 Android 11+ arm64 手机上能运行 Shizuku、不需要 root，希望 agent 在一块不可见的虚拟后台屏上操作其他应用、主屏保持自用，且 Agent 能执行终端命令或走 MCP/HTTP：Agent-VScreen（做法 L）。

**不适用 / 先别用：**
- 团队不在用 dsh 桌面端：浏览器路线完全绑定 dsh 生态；手机或平板不支持 dsh 浏览器方案。
- 你要的是成熟稳定的 1.0 产品：Cua Spaces 为 0.1.0，Pro/Teams 标注“即将推出”；CUA-S1 是早期源码研究版；dsh 扩展在 Chrome / Firefox 均标注 not yet listed；android-adb-control 作者自述尚未完成修订版真机端到端验收；agent-desktop 是 Vercel Labs 早期项目；Agent-VScreen 为 1.1.7、32 stars，且无独立测试数据。
- 你的机器不满足硬性条件：Spaces 需 macOS 26+，Lume 需 Apple Silicon；dsh 需 Node ≥ 20、桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0；Chrome Relay 仅 macOS + Google Chrome + Node.js 20+；AutoCua 需 Python 3.10+；axuse 需 Node.js 22+ 且机器上装有 Chrome、Edge、Chromium 或 Chrome for Testing 之一；agent-desktop 需本机有 Node 环境，Linux 需图形会话和 at-spi2-core。
- 你要做对外托管或商用集成：Cua 的许可不是单一的；dsh README 通篇没有给出基准实测结果；Chrome Relay 的 0.15s/命令、2 分钟 setup 也只是作者自述；axuse 是 PolyForm Noncommercial 1.0.0，商业使用需单独授权。
- 你想用安卓路线绕过锁屏、验证码、支付验证或企业策略，或做无人值守监控、自动交易、无限重试：android-adb-control 明确排除这些用途；云端会话或远程容器不会自动获得本地 USB 设备。
- 你打算把手里的主力机（承载凭据的设备）当试验田：ADBKeyboard 的部分实现允许其他本地应用发送控制广播，应优先用于可信测试设备，不用于凭据输入；Agent-VScreen 的 token 等同手机控制权，也不应先在主力机上试。
- 你用 Firefox：qz 明确不支持。
- 你需要 qz 做定时调度、事件监听或状态触发：README 没有给出这些机制。
- 你需要独立评测或高采用度背书：qz 仓库仅 46 stars，README 没有准确率、耗时、成功率数据；axuse 47 stars、单一公司维护，基准为作者自建自评且统计口径有疑点；Agent-VScreen 32 stars，没有独立测试、成功率、延迟或长时稳定性数据。
- 你要把 axuse 用于商业用途：PolyForm Noncommercial 1.0.0 免费仅限非商业，商业使用需向 CTOL Digital Solutions 单独授权。
- 你主要在纯视觉判断（canvas、图表）或需要绕过反爬：axuse 不适用。
- 你要的是像素/视觉匹配或 Computer Use 模型：agent-desktop 明确不做像素匹配，决策循环留在你的 agent 里。
- 你要依赖“按住不放”的长按拖拽：key-down / key-up / mouse-down / mouse-up 在 daemon 能释放被按住的键或按钮之前会拒绝执行。
- 你要定时调度、事件订阅或常驻守护：agent-desktop README 没有给出这些机制；Agent-VScreen 虽有 watch/until，但也不是你要的通用定时任务平台，仍要按 README 的 API 能力使用。
- 你不能给 macOS 辅助功能权限，或 Linux 不在图形会话、没装 at-spi2-core；Wayland 下要用剪贴板还需 wl-clipboard。
- 你要把快照、剪贴板读取、截图、命令输出或调试产物直接进公共日志/上传：这些可能含私人桌面内容。
- 你照旧教程去 brew tap 装 agent-desktop：Homebrew 与 Scoop 官方包还在提交、默认源里拿不到，旧 tap/bucket 已不再维护。
- 你不接受手动 Load unpacked 扩展：Chrome Relay、axuse bridge 都需要这一步。
- 你要用 AutoCua 操作安卓手机：mobile use, android 尚不可用；iOS 模式仅 macOS 宿主。
- 电视去臃肿路线不适用于：主力电视、不愿意恢复出厂设置兜底的设备、无法打开开发者选项的设备、你还没读 cleanyourtv 仓库说明就想执行命令的情况。原文只保留了流程前两步，后续连接方式、去臃肿清单和执行命令均缺失；不要凭猜测执行 adb 或 pm 命令。
- Agent-VScreen 不适用于：Android 低于 11 或非 arm64；不能运行 Shizuku；希望应用自己调用模型（它不自带模型，由调用方 Agent 的模型判断屏幕含义）；需要公网直连（服务默认只监听 127.0.0.1:18765，只本机或自己的 Tailscale tailnet，不提供公网链接）；不能保护 token（token 等同手机控制权）；要求成熟稳定或独立评测背书。

## 前置条件

按路线分：

- 做法 A（Cua Bench）：Python 3.12 或 3.13，并安装 uv；该任务不需要 VM、Docker 或模型 API key。
- 做法 B（dsh）：dsh 桌面端；Node ≥ 20（开发构建用 Node 22 + pnpm 11）；桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0；手机与平板不支持。
- 做法 C（Cua Driver）：已有 Claude Code / Codex / Cursor / OpenClaw 等 agent；按原文 Driver 教程走平台设置、权限和 agent 连接。
- 做法 D（整套/沙箱/VM）：只想先看全貌，接受安装器会改动本机；macOS 26+ 才能用 Spaces；Lume 需 Apple Silicon；Windows 下只有 Driver 有 PowerShell 安装脚本。
- 做法 E（ADB 技能）：本机有 ADB 可执行权限；一台已解锁并确认 RSA 授权的安卓测试机（`adb devices -l` 显示 device）；正确的技能安装目录与调用方式；明确的授权边界；截图与 UI XML 的数据与日志策略；任务预算（默认 30 个状态变更动作 / 5 分钟）。
- 做法 F（Chrome Relay）：macOS、Google Chrome、Node.js 20+、agent-browser；每个希望 agent 使用的 Chrome profile 需手动加载扩展；`bin/chrome-relay setup` 会生成密钥、装后台服务、生成身份映射、把 chrome-relay 放进 PATH，并把 Claude Code skill 链进去；连接只放行 Claude Code、Codex、Cursor、Paseo 四类 agent 应用。
- 做法 G（AutoCua）：Python 3.10+；写 main.py 并安装 `pip install AutoCua`；模型密钥写 .env 文件或在桌面应用 Settings 里粘贴；模型名从仓库 model_list.txt 选且区分大小写；代理保存的一切落在运行 Python 目录下的 AutoCua_data/。
- 做法 H（qz）：Chrome 或 Edge；扩展已安装并打开侧边栏；一个支持 tool calling 的模型 provider 或兼容本地模型服务，或一个 ChatGPT 账号；外部 agent 桥接需 Node.js 22+；源码构建需 Node.js 24 LTS 与 npm；使用前核查 docs/permissions.md（材料只给链接，未给内容）。
- 做法 I（axuse）：Node.js 22+；机器上装有 Chrome、Edge、Chromium 或 Chrome for Testing 之一（浏览器不在默认位置时设 `AXUSE_BROWSER=/path/to/chrome`）；宿主 CLI（Codex / Claude Code / OpenCode 等）；bridge 模式需手动在 Chrome/Edge 开发者模式 Load unpacked 指向 bridge/extension，并注册 native messaging host。
- 做法 J（电视去臃肿）：同一局域网 + 电脑已装 Claude Code；电视能进入“设置 → 关于”，在“版本号 / Build”上连续按 7 次开启开发者选项；先读仓库 README，确认每条命令的作用；准备一台可弃用的旧电视，并记录改动前基线；保留恢复出厂设置这一兜底手段。
- 做法 K（agent-desktop）：本机有 Node 环境；macOS 需能授予“辅助功能”权限；Linux 需在用户的图形会话中且安装了 at-spi2-core，鼠标输入与窗口控制依赖 X11，截图在 Wayland 下走 xdg-desktop-portal，剪贴板在 Wayland 需要 wl-clipboard；Windows 下操作与终端同完整性级别的应用无需授权；若从 GitHub Releases 下对应平台的 native archive，helper 必须和可执行文件放在一起。
- 做法 L（Agent-VScreen）：Android 11+（推荐 Android 14+）、arm64 手机；安装 APK 并打开 Agent-VScreen；Shizuku 已运行；需要浮窗、通知、无障碍只读、电池优化和后台运行权限，部分手机还要允许自启动和后台活动；手机上的 Agent 能执行终端命令，或走 MCP/HTTP；token 要留在本机或自己的 tailnet；应用规则可完全阻止或只读，支付按钮需确认。

## 操作步骤

下面按路线分组。建议先做做法 A；如果团队已在用 dsh 桌面端，做法 B 是最短的一条“模型真的读浏览器”的路；如果你已有 agent 和一台可信安卓测试机，做法 E 是最短的一条“agent 真的操作手机”的路；如果你有一台可弃用旧电视并愿意先读仓库，做法 J 是最小风险的去臃肿试用路线；如果你已有 agent、只需要补一层桌面 GUI 执行接口，做法 K 是最小的一条；如果你要一个 pip 包同时覆盖桌面、Chrome、终端和 iOS，选做法 G；如果你要 MCP 接入和浏览器 AX 树 + diff，选做法 I；如果你要在 Android 后台虚拟屏上让 agent 操作应用、主屏保持自用，选做法 L。

### 做法 A：只跑评测回路，不碰界面（最便宜的入口）

前提：Python 3.12/3.13 + uv。预期结果：建一个小任务，跑它的参考解，确认评测器给出的 reward 为 1.0。

1. 安装 Cua Bench（带 browser 扩展）：

```bash
uv tool install 'cua-bench[browser]'
```

2. 安装 Chromium：

```bash
uv tool run --from 'cua-bench[browser]' playwright install chromium
```

3. 建一个小任务，跑它的参考解，确认 evaluator 返回 1.0。
4. 然后你自己再手动做一遍同一任务，作为对照。

### 做法 B：浏览器路线——用文本快照代替截图（dsh 生态）

前提：dsh 桌面端、Node ≥ 20；桌面版 Chrome/Chromium/Edge ≥ 116 或 Firefox ≥ 140.0。预期结果：模型拿到带编号的可操作控件清单，用同一个编号就能点，不需要坐标。

1. 装桥接插件：

```sh
dsh plugin --profile desktop add dsh-browser-crossplatform
git clone https://github.com/youbaiyun/dsh-browser-crossplatform
dsh plugin --profile desktop add link:<clone>/packages/bridge
```

2. 在 profile 里正式装一次浏览器扩展。插件不能替你装扩展；命令行 `--load-extension` 只维持一个会话，Chrome 137+ 品牌版已忽略。

3. 从源码构建（开发用）：

```sh
pnpm install
pnpm -r run typecheck
pnpm -r run test
pnpm --filter dsh-browser-extension run build
pnpm --filter dsh-browser-extension run build:store
pnpm --filter dsh-browser-crossplatform run build
```

上架要传 `-store` 包：普通构建带 manifest key，Chrome Web Store 会拒收。

4. 验证“模型真的看得到”：调用 `browser_snapshot`，页面以文本形式返回标题/URL/正文 + 编号交互清单（含 ARIA role 控件）+ 表单字段（含 masked/checked/required）。位置信息来自 DOM，所以模型不需要坐标。

5. 决定动手前是否询问：`unrestrictedBrowserAccess` 开关出厂为开（新装不做询问）；关掉才恢复动手前的提示，并支持 trusted origins、allow-once。

6. 收紧回环免鉴权（可选）：桥接默认用 bearer token，但来自扩展自身的回环连接可跳过；豁免不是“任何 `chrome-extension://` 来源”，而是与 extensionId 精确匹配。自建构建要把自己的 id 加进去，或设 `extensionId: ''` 让所有连接都要求 token。

7. 需要看图时再开图像识别（默认关；一旦开启，你询问的那张图会离开本机交给所配模型）。在桌面 profile 的 `cordis.patch.yml` 里给桥接插件加配置：

```yaml
- id: bridge-browser
  disabled: false
  config:
    visionApiKey: <key>
    visionModel: deepseek-flash
```

8. 跑成对基准，把“高效”变成数字：

```sh
pnpm --dir benchmark install-browser
node benchmark/run.mjs --dry-run --smoke
node benchmark/run.mjs --smoke
node benchmark/run.mjs
node benchmark/run.mjs --tasks order_lookup,contact_form --seeds 1-5 --trials 2
```

三个前提：有一个接受 `--profile web --patch … -- --no-open --port N` 的 dsh 命令行；Windows 上用 `pnpm.cmd`；用 Chrome for Testing 或 Chromium。基准里拿 playwright 对比 extension，比的是同一批任务而不是同一工具面。

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
4. 让你的 agent 在计算器里算 6 × 7，并验证应用显示 42。
5. 通过 MCP / skill 接上 Cua Driver。

### 做法 D：装整套 / 沙箱 / 本地 VM（接受安装器改动本机时再用）

前提：只想先看全貌，接受安装器会改动本机。

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

4. 用沙箱做隔离的批量操作（前提：已装好 cua CLI）：

```sh
cua sb create ubuntu --name dev
cua sb exec dev uname -a
cua sb screenshot dev
cua sb rm dev
```

同一个沙箱的 Python 写法（`pip install cua`）：

```python
from cua_sandbox import Image, Sandbox

async with Sandbox.ephemeral(Image.linux(), local=True) as sb:
    print((await sb.shell.run('uname -a')).stdout)
```

5. 把自己的机器接进来（无需端口转发）：

```sh
cua host setup
```

6. 要本地 VM 时装 Lume（前提：Apple Silicon）：

```bash
/bin/bash -c "$(curl -fsSL https://cua.ai/lume/install.sh)"
```

### 做法 E：安卓手机——用 ADB 技能做“观察—一步操作—验证”

这是一个 instruction-only 的 Agent Skill，不是独立程序、不是 MCP Server、不是后台服务。

前提：本机有 ADB；一台已解锁、已确认 RSA 授权的安卓测试机；技能装到对应宿主目录。预期结果：`adb devices -l` 显示 device，宿主能发现并调用该技能，并且只读任务能跑完而不改动任何设置。

1. 确认本机 ADB：

```bash
command -v adb
adb version
```

2. 缺失时安装 Android SDK Platform-Tools。macOS 可用：

```bash
brew install --cask android-platform-tools
```

3. 安装技能（先审阅仓库）。Pi、Codex、OpenCode 可共用一份：

```bash
mkdir -p "$HOME/.agents/skills"
git clone https://github.com/robbin/android-adb-control.git "$HOME/.agents/skills/android-adb-control"
```

4. 只用 Claude Code 时把目标目录改为 `~/.claude/skills/android-adb-control`；若已装共享版本，可建兼容链接：

```bash
mkdir -p "$HOME/.claude/skills"
ln -s "$HOME/.agents/skills/android-adb-control" "$HOME/.claude/skills/android-adb-control"
```

5. 连接手机：在手机上开启开发者选项和 USB 调试，用数据线连接，手动解锁并确认电脑的 RSA 授权，然后运行：

```bash
adb devices -l
```

设备应显示为 device。多个设备时明确指定目标；遇到 unauthorized、offline 或 Linux no permissions，先解决连接问题。不要将 ADB 端口暴露到公网。

6. 从低风险任务开始调用。例如 Pi：

```text
/skill:android-adb-control 打开系统设置首页，确认页面，不修改设置。
```

边界任务示例：

```text
使用 android-adb-control，在指定测试联系人会话里输入「我稍后回复」，
停在发送前。不要点击发送，也不要按可能触发发送的回车。
```

7. 遵守默认预算与安全约束：默认最多 30 个设备状态变更动作、5 分钟；发送、购买、删除、安装、导出个人资料及修改安全/网络设置需要明确授权；截图和 UI XML 可能含私人内容，交给云端模型前应确认数据与日志策略；ADBKeyboard 优先用于可信测试设备，不用于凭据输入；默认不改休眠时间、不切换 VPN、不安装辅助 App；无法验证或恢复时停止并报告。

8. 静态检查与更新（前提：需要 Bash、Git 和 uv；静态检查不连接手机）：

```bash
uv run --no-project python scripts/check_docs.py
```

### 做法 F：用 Chrome Relay 借用已登录的 Chrome 后台标签页（macOS + Chrome + 四类 agent）

前提：macOS、Google Chrome、Node.js 20+，以及 agent-browser。预期结果：`chrome-relay doctor` 自检通过；在单个 Chrome profile 加载扩展后，agent 能走完一个需登录站点的四步流程，中途不手动登录；`chrome-relay audit` 能复盘这次会话。

1. 安装 agent-browser：

```bash
npm i -g agent-browser
```

2. 克隆仓库并执行 setup：

```bash
git clone https://github.com/aindeev/agent-chrome-relay
cd agent-chrome-relay
bin/chrome-relay setup
```

3. 在每个希望 agent 使用的 Chrome profile 里加载扩展：打开 `chrome://extensions`，打开 Developer mode，点 Load unpacked，选中你 clone 下来的 extension 文件夹。

4. 自检：

```bash
chrome-relay doctor
```

5. 典型用法：

```bash
agent-browser --cdp "$(chrome-relay url you@company.com)" open https://app.example.com/
agent-browser snapshot -i
agent-browser click @e5
agent-browser close
```

6. 排查与审计：`chrome-relay logs`；`chrome-relay audit` 读 `~/.chrome-relay/audit/YYYY-MM-DD.jsonl`；`chrome-relay identities` 管身份映射。

### 做法 G：AutoCua——用一个 run_agent(...) 覆盖桌面、自己的 Chrome、真实终端和 iOS 手机

前提：Python 3.10+；一台可控机器；模型密钥；若要 iOS 则 macOS 宿主 + 完整 Xcode。预期结果：`pip install AutoCua` 成功，`python main.py` 能让 agent 按 mode 驱动对应界面，并且模型只从编号元素里选。

1. 安装包：

```bash
pip install AutoCua
```

2. 在 main.py 中写入调用：

```python
from AutoCua.agent_launcher import run_agent

run_agent(mode='web use', provider='openrouter', model='gemini-3.8-flash',
          task='Open wikipedia.org and summarise today\'s featured article.')
```

mode 取值：`computer use` 驱动桌面；`shell use` 让编码代理进入真实终端；`web use` 通过 AutoCua 扩展驱动用户自己的 Chrome；`mobile use, ios` 驱动 iOS 模拟器或已配对的 iPhone/iPad；`mobile use, android` 尚不可用。model 名必须来自仓库的 `model_list.txt`（大小写敏感），示例中的 `gemini-3.8-flash` 需要先核对。

3. 运行：

```bash
python main.py
```

4. 配置模型密钥：写入 `.env` 文件，或在桌面应用的 Settings 里粘贴。

5. Linux 上用虚拟环境（Ubuntu/Debian 会拒绝向系统 Python pip 安装；venv 必须建在存放 main.py 和 .env 的目录里）：

```bash
cd my-agent
python3 -m venv .venv
source .venv/bin/activate
pip install AutoCua
python main.py
```

6. Linux 首次 `computer-use` 运行：GNOME 会请求屏幕共享同意，点 Share 前务必打开 Allow Remote Interaction（GNOME 默认关闭）。

7. 验证 AutoCua 是否按设计工作：模型看到的是一棵元素树（操作系统无障碍树 + OCR 融合）和一张打了编号框的截图，模型只能从编号元素里选，未展示过的编号会被拒绝。

### 做法 H：本地优先的浏览器智能体——在个人 Chrome/Edge 里用 qz 跑真实登录态任务

前提：Chrome 或 Edge；已登录目标站点；模型支持 tool calling；有 API key 或 ChatGPT 账号。预期结果：侧边栏里用一句话跑完一个跨站任务，输出表格/文件/带来源的报告；跑通后可保存为 Skill。

1. 安装扩展（商店路径）。在 Chrome Web Store 点 Add to Chrome，点工具栏 qz 图标打开侧边栏。

2. 商店不可达时手动安装：从 latest release 下载 ZIP 并解压；打开 `chrome://extensions`，开启 Developer mode；点 Load unpacked，选择解压出的 `qz-browser-agent-extension` 文件夹。

3. 接入模型：打开 Settings，选择 provider（README 列出的预设包括 OpenAI Codex、OpenRouter、DeepSeek、Kimi For Coding、OpenCode Go、OpenCode Zen、Fireworks AI 等），粘贴 API key 并保存。若用 ChatGPT 账号：选择 OpenAI Codex，按 auth.openai.com 的设备码流程登录，回到 qz 选模型并保存，无需 API key。

4. 跑第一个任务：

```text
Find this year's Nobel Prize winners in every category and put them in a table with source links.
```

5. 把跑通的流程固化为 Skill。先跑通，然后对 qz 说“Save this as a Skill”；下次用一句话触发复用。

6. 可选：让外部 agent 把网页任务交给 qz。前提：Node.js 22 或更高；本机默认浏览器已装 qz。

```bash
npx skills add alibaba/qz-browser-agent -g
npx qz-browser-agent@latest connect
```

7. 最小试用顺序：先在个人 Chrome/Edge 上跑 2–3 个真实的多源调研与登录态数据抽取任务，逐条核对来源；只把跑通的流程存成 Skill；再考虑让外部 agent 调用或扩大使用范围。

### 做法 I：用 MCP + 无障碍树 + diff 做浏览器操作（axuse）

前提：Node.js 22+；机器上装有 Chrome、Edge、Chromium 或 Chrome for Testing 之一；宿主支持 MCP。预期结果：`node src/cli.js doctor` 找到浏览器、启动并做一次快照；宿主能调用 `ax_open` 拿全量快照，之后每个动作只返回 diff。

1. 准备环境并自检：

```bash
git clone https://github.com/ctoldigital/axuse.git
cd axuse
node src/cli.js doctor
```

浏览器不在默认位置时设 `AXUSE_BROWSER=/path/to/chrome`。

2. 接入宿主（把 `<path>` 换成 `src/cli.js` 的绝对路径）：

```bash
codex mcp add axuse -- node /abs/path/axuse/src/cli.js mcp
claude mcp add --scope user axuse -- node /abs/path/axuse/src/cli.js mcp
node src/cli.js print-config --harness opencode
```

3. 把仓库根目录的 `SKILL.md` 指向宿主的 skill 系统或系统提示。

4. 首次验证：

```text
Open https://example.com, find the "More information" link and tell me where it goes.
```

5. 要登录态或真实浏览器时用 bridge：

```bash
node src/cli.js setup --browser chrome --harness codex
node src/cli.js bridge verify
```

在扩展页 Load unpacked 指向 `bridge/extension`，然后用 `ax_open { url, backend: "extension" }`。

6. 优先用省步骤的工具：`ax_fill` 一次设完整个表单；`ax_observe {find:"text"}` 大页面只回匹配行；`ax_scroll {until:"text"}` 滚到目标文本；`ax_upload` 给文件输入设文件；`ax_open_many` 有界 URL 列表顺序打开。

### 做法 J：Android TV / Google TV 去臃肿——可弃用设备 + 基线 + 单轮 + 回归检查

前提：一台可弃用的旧安卓 / Google TV；同一 Wi-Fi；电脑已装 Claude Code；电视能进入“设置 → 关于”，在“版本号 / Build”上连续按 7 次开启开发者选项。预期结果：只在一台设备上跑一轮去臃肿，改动前后有基线对比，核心功能无回归，否则恢复出厂设置。

注意：原文只保留了流程前两步，后续连接方式、去臃肿清单和执行命令均缺失。不要凭猜测执行 `adb` 或 `pm` 命令；完整操作以 cleanyourtv 仓库 README 为准。

1. 记录基线（改动前）：可用存储空间、开机到可操作的时间、开机后后台进程数或内存占用、常用视频 App 从点击到出画面的时间、遥控器操作流畅度的 1–5 分主观评分、当前系统版本号。

2. 让电脑和电视连同一个 Wi-Fi，并在电脑上准备好 Claude Code。

3. 打开电视的开发者选项：进入 设置 → 关于，在“版本号 / Build”上连续按 7 次。

4. 读 cleanyourtv 仓库说明，确认每条命令的作用、是否会误删系统组件、是否需要 root、是否影响 OTA 和保修。原文没有给出连接与去臃肿的具体命令，此处不补齐。

5. 只在一台可弃用设备上跑一轮，逐条记录实际执行了什么、删除了哪些包，不做批量试错。

6. 回归检查（改动后当天与一周后各一次）：投屏、HDMI 输入、遥控配对、系统更新、应用商店安装与更新、常见视频 App 登录与播放是否正常。

7. 判断改善：可用存储增加、开机时间缩短、后台占用下降、App 启动变快、卡顿次数减少，同时崩溃/异常次数不上升、核心功能零回归。任一核心功能失效即判为失败并恢复出厂设置。

8. 推广门槛：一台设备观察 1–2 周无异常且体验指标确有改善，再考虑扩大到第二台不同厂商的设备，用于验证这套流程的可迁移性。

### 做法 K：用 agent-desktop 给已有 agent 补桌面 GUI 执行层（无障碍树 + ref + 复验）

前提：本机有 Node 环境；macOS 能授予辅助功能权限；Linux 在用户图形会话中且装 at-spi2-core；Windows 操作与终端同完整性级别的应用无需授权。预期结果：`agent-desktop version` 能跑；`permissions --guide` 通过；`list-apps` 能列出应用；`snapshot --app Finder -i` 返回 `ok:true`、`complete:true` 和带 `ref_id` 的 tree；对 ref 执行动作后再 snapshot 能看到预期 UI 变化。

1. 全局安装并确认版本：

```bash
npm install -g agent-desktop
agent-desktop version
```

Bun / Yarn / pnpm 可装同一个包；包里自带 x64 与 ARM64 的原生二进制和平台 helper。若不想走 JS 启动器，可从 GitHub Releases 下对应平台的 native archive，helper 必须和可执行文件放在一起。Homebrew 与 Scoop 官方包还在提交、默认源里拿不到，原来的自定义 tap/bucket 已不再维护。

2. macOS 上跑权限引导：

```bash
agent-desktop permissions --guide
```

3. Linux 上先确认会话与依赖：处于用户的图形会话中，且安装 at-spi2-core；鼠标输入与窗口控制依赖 X11，截图在 Wayland 下走 xdg-desktop-portal，剪贴板在 Wayland 需要 wl-clipboard。

4. 先把与版本匹配的说明书交给 agent：

```bash
agent-desktop skills get desktop
agent-desktop skills get platform
agent-desktop <command> --help
```

预期结果：agent 读到 loop、refs、验证与重试规则，以及当前 OS 的差异。

5. 把 skill 装进 agent harness，或往 AGENTS.md 加提示词：

```bash
npx skills add https://github.com/vercel-labs/agent-desktop --skill agent-desktop
```

```markdown
Use `agent-desktop` to see and operate desktop apps. Before the first use, run
`agent-desktop skills get desktop` and `agent-desktop skills get platform`, and follow them.
```

6. 列出可操作的应用名（`snapshot --app` 的取值来自这里）：

```bash
agent-desktop list-apps
```

7. 首次快照，只取可交互元素：

```bash
agent-desktop snapshot --app Finder -i
```

预期结果：返回 JSON envelope，含 `snapshot_id`、`ref_count`、`complete` 和带 `ref_id` 的 tree；ref 形如 `@s8f3k2p9:e8`。

8. 对 ref 执行动作：

```bash
agent-desktop click @s8f3k2p9:e8
```

9. 再快照一次验证：

```bash
agent-desktop snapshot --app Finder -i
```

预期结果：用新快照确认 UI 状态，而不是靠动作返回值自证。

10. 遵守 ref 与快照绑定：裸写 `@e8` 会被 `INVALID_ARGS` 拒绝；UI 变了会返回 `STALE_REF` 或 `AMBIGUOUS_TARGET`，此时重新快照换新 ref，不要重试旧 ref。每个命令输出一个 envelope，错误带 `code`、`disposition`，通常还有 `suggestion`；只有 `error.disposition.retry` 为 `safe` 时才重试。契约、错误码与退出码见 `docs/json-output.md`。

11. 多窗口直接操作会得到 `AMBIGUOUS_TARGET`；错误里 `error.details` 会列出候选 window id，用 `--window-id` 指定。

12. 元素很多的密集应用先出骨架图，再对某一区域下钻：

```bash
agent-desktop snapshot --skeleton --app Slack -i --compact
agent-desktop snapshot --root @s8f3k2p9:e3 -i --compact
```

13. 默认 headless：走无障碍 API，不移动指针、不抢焦点；确实需要物理输入才加全局 `--headed`。

14. PowerShell 必须给每个 ref 加引号（裸 `@token` 是 splatting 运算符）：

```powershell
agent-desktop click '@s8f3k2p9:e8'
```

15. 数据卫生：快照、剪贴板读取、截图、命令输出、调试产物都可能含私人桌面内容，不要进公共日志和上传；可选的 JEV helper 会把屏幕描述发给配置的模型提供方，它独立于原生 CLI，需单独评估。

16. 只有高频调用才考虑 FFI：每个 release 带 `libagent_desktop_ffi`，可进程内调用而不用每条命令起一次 CLI，入口、内存归属与线程规则见：

```bash
agent-desktop skills get ffi
```

17. 能力边界：共 60 个命令名、56 个可操作命令；`key-down` / `key-up` / `mouse-down` / `mouse-up` 这四个在“有 daemon 能释放被按住的键或按钮”之前会拒绝执行，所以“按住不放”的交互目前不可依赖。

### 做法 L：Android 后台虚拟屏——用 Agent-VScreen 让 agent 在主屏之外操作应用

前提：Android 11+（推荐 Android 14+）、arm64；安装 APK；Shizuku 已运行；需要浮窗、通知、无障碍只读、电池优化和后台运行权限；手机上 Agent 能执行终端命令或走 MCP/HTTP；接受 token 等同手机控制权。预期结果：`vscreen launch Settings` 能在虚拟屏打开设置；`vscreen act ...` 能执行并返回当前屏幕、可见文本、可点击元素和截图；主屏保持自用。

1. 安装 APK 并打开 Agent-VScreen。前提：Android 11+（推荐 14+）、arm64。

2. 在应用内点 **Grant Shizuku** 授权。前提：Shizuku 已运行；不需要 root。

3. 点 **One-tap setup**；在 Honor、Huawei、Xiaomi、OPPO、vivo 等手机上，再到 **System background management** 允许自启动和后台活动。前提：需要浮窗、通知、无障碍只读、电池优化和后台运行权限。

4. 进入 **Connect agent**，点 **Copy message for agent**，把消息原样发给 Agent；按 README，它会安装 `vscreen` 命令并把简短指南写入自己的长期记忆，首页会显示是否记住。然后跑冒烟命令：

```sh
vscreen launch Settings
vscreen act "tap Search; type About phone; key enter until text:About phone"
vscreen help all
```

预期结果：命令能在虚拟屏上打开设置、搜索并进入 About phone；每步返回当前屏幕、可见文本、可点击元素和截图。手机端不调用模型，由调用方 Agent 的模型判断屏幕含义。

5. 用 Operit 且走 MCP：推荐先试 ToolPkg：导入由 `integrations/operit` 构建的 `agent-vscreen.toolpkg`（Releases 中也有），把 token 发给 Operit 的 AI 保存；截图会直接给模型。也可用远程 MCP：完成首次设置并确保服务运行，在 **Connect an agent → MCP** 复制 token，在 Operit 的 MCP 管理页点 **Import/Connect → Connect remote**，填入：

   - Name (plugin ID): `vscreen`
   - URL: `http://127.0.0.1:18765/mcp`（18765 是默认端口，改过则用实际端口）
   - Connection type: `httpStream`
   - Bearer Token: 刚复制的 token

   保存并打开开关；远程插件不需要 “Deploy”，状态显示 active 即可。可在聊天里试：

```text
Use vscreen to open Settings on the virtual screen and tell me the system version.
```

   也可粘贴配置后点 **Merge config**：

```json
{
  "mcpServers": {
    "vscreen": {
      "url": "http://127.0.0.1:18765/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

   注意：Operit 与 Agent-VScreen 必须在同一台手机；若 Operit 在另一设备，URL 换成 Tailscale 地址。若要让 Agent 只操作后台屏，在角色提示词中加：

```text
Always use the vscreen tool to operate other apps; never touch the main screen.
```

   token 等同手机控制权，不要贴到公开角色卡、共享配置或截图中。

6. 需要从电脑或另一台手机调用，且接受 Tailscale：服务默认只监听 `127.0.0.1:18765`；在 **Connect an agent** 第 1 步选 **Another device (Tailscale)**，再选 **Built-in**，在应用内登录 Tailscale，只有自己 tailnet 的设备能访问；**Tailscale app** 模式和 SSH 端口转发也可用。应用不提供公网链接。

7. 更多 CLI、MCP、HTTP、会话、watch、浮窗、远程访问和已知限制见 `API.md`（中文）。动作后可加 `until` 条件（文本出现/消失、画面变化/静止、像素颜色、指定应用在前台）和时限；`--stop` 在整个区间被监视，`--watch` 在步骤结束后继续看，`--keep notify|wake` 在回合结束后继续监视并通知用户或唤醒 Agent。

8. 安全边界：应用规则可完全阻止或只读；支付按钮需确认；浮窗可随时接管或停止；每步会校验，`until` 未达成、文本不在框内、焦点不在点击位置等“错步”会停止该段、跳过剩余步骤并描述当前屏幕。README 没有成功率或延迟基准，先用备用机小范围试用。

### 怎么选

- 只想验证“这套东西在我这儿能不能用起来”：选做法 A，成本最低。
- 团队已在用 dsh 桌面端、又需要模型真的去读和操作浏览器：选做法 B。
- 已有 agent，想让它先做一件有明确对错的事：选做法 C。
- 需要完整桌面、隔离沙箱、本地 VM、或把本机接进来：选做法 D。
- 已有 agent 和一台可信安卓测试机：选做法 E，先跑只读任务，再跑“停在动作前”的边界任务。
- 你在 macOS + Chrome + Node.js 20+，希望编码 agent 复用已登录的 Chrome 后台标签页：选做法 F。
- 你要一个 pip 包和一次 `run_agent(...)` 同时覆盖真实桌面、自己的 Chrome、真实终端和 iOS 手机：选做法 G。
- 你在 Chrome/Edge 上、想用一句话在已登录站点跨站执行并产出带来源的报告：选做法 H。
- 你要 MCP 接入 Claude Code / Codex / OpenCode，让 agent 用无障碍树 + diff 操作浏览器：选做法 I。
- 你有一台可弃用旧安卓/Google TV，想试去臃肿但原文不完整：选做法 J，先记录基线、读仓库说明，只在一台设备上跑一轮。
- 你已有 agent，想让它操作有 GUI 但没有 API/CLI 的桌面软件，且任务能靠结构化 ref 定位而不是像素匹配：选做法 K。
- 你要在 Android 上用不可见的后台虚拟屏让 agent 操作其他 App、主屏保持自用，且能装 Shizuku、用终端/MCP/HTTP：选做法 L。
- 做法 K 与做法 C 的差异：C 是 Cua Driver + MCP/skill，装 Driver 后让 agent 做计算器 6 × 7=42；K 是 agent-desktop CLI/C 库，用无障碍树 snapshot + ref + 再 snapshot 复验，默认 headless，不附带模型，决策留在 agent。需要 Cua 生态/MCP 选 C；只要桌面执行层选 K。
- 做法 K 与做法 G 的差异：G 是 pip 包 `run_agent(...)`，覆盖桌面、自己的 Chrome、真实终端、iOS；K 只做桌面 GUI 执行层，不负责模型和跨端 mode。要一站式多端选 G；已有 agent 要轻量桌面层选 K。
- 做法 K 与做法 I 的差异：I 是 MCP 浏览器/桌面 server，强调 AX 树 + diff、可接 Claude Code/Codex/OpenCode；K 是 CLI + C 库的桌面无障碍树接口，用 ref + 再快照复验。浏览器任务选 I；桌面 GUI 选 K。
- 做法 K 与做法 D 的差异：D 装整套/沙箱/VM；K 不提供沙箱/VM，只是桌面执行接口。需要隔离沙箱选 D。
- 做法 I 与做法 B 的差异：B 绑定 dsh 桌面端，走自己的 MV3 扩展与文本快照，提供 17 个工具和成对基准；I 是零 npm 依赖的 MCP server，用 AX 树 + diff + 稳定引用，可接多种 MCP 宿主。需要成对基准和 dsh 生态选 B；需要 MCP 接入和 AX 树 + diff 选 I。
- 做法 I 与做法 H 的差异：H 是 Chrome/Edge 扩展，侧边栏人机同视，BYO 模型，可保存 Skill；I 是 MCP 浏览器/桌面操作 server，强调 AX 树 + diff，可复用登录态（bridge），但没有侧边栏式人机同视和 Skill 保存描述。
- 做法 I 与做法 F 的差异：F 仅 macOS + Google Chrome + 四类 agent 应用，用 Chrome Relay 复用真实登录态后台标签页，不附带模型配置；I 通过 bridge 复用已登录 Chrome/Edge，但需要手动 Load unpacked，宿主是 MCP 宿主，且非商业许可。
- 做法 I 与做法 G 的差异：G 是一个 pip 包和 `run_agent(...)`，覆盖桌面、自己的 Chrome、终端和 iOS；I 以浏览器任务为主，桌面控制只有 Windows 已验证，macOS 需 opt-in，Linux 无桌面驱动。
- 做法 L 与做法 E 的差异：E 是 ADB 技能，走 USB 调试/RSA，默认预算 30 个设备状态变更动作 / 5 分钟，适合已授权测试机上的“观察—一步操作—验证”；L 是手机端应用提供的后台虚拟屏，走 Shizuku + `vscreen` CLI/MCP/HTTP，主屏不被占用，但 token 等同手机控制权。要 ADB 指令级、明确预算选 E；要后台虚拟屏、主屏自用选 L。
- 做法 L 与做法 G 的差异：G 的 `mobile use, android` 尚不可用；L 是 Android 专用后台虚拟屏。要跨桌面/Chrome/终端/iOS 选 G；只要 Android 后台屏选 L。

## 怎么判断变好了

可观察的指标：
- 做法 A：Cua Bench 的 evaluator 对参考解返回 1.0；不需要 VM、Docker 或模型 API key 就能跑。
- 做法 B：`browser_snapshot` 能给出带编号的可操作控件清单和表单字段（含 masked/checked/required），模型用同一个编号就能点；成对基准能分别跑出 playwright 与 extension 两个后端在同批任务上的数字。注意 dsh README 通篇没有给出基准实测结果，所以基准跑出来的数字才是你自己的证据。
- 做法 C：计算器里 6 × 7 的结果被验证为显示 42。
- 做法 D：Lume 创建并启动的 macOS Tahoe VM 能用 SSH 连上；`cua sb exec dev uname -a` 能返回结果；`cua sb screenshot dev` 能拿到截图。
- 做法 E：任务一次跑通的步骤数对比你手动操作的步数；人工接管次数；越界动作次数——未经授权的发送/购买/删除/安装/改设置次数应为 0，“停在发送前”这类约束是否 100% 被遵守；是否守住预算（动作数不超过 30、时长不超过 5 分钟）；不可验证/不可恢复时是否如约停止并报告；同一任务重复执行多次的成功率与结果一致性。
- 做法 F：四步流程一次跑通的成功率；每条命令的实际耗时（对照作者称的 ~0.15s）；出现 SIGN-IN NEEDED 的次数；是否发生抢焦点、弹框；`chrome-relay audit` 里 blocked pages 的数量与原因；对比之前人工切换窗口/手动登录花的时间。
- 做法 G：`pip install AutoCua` 成功；`python main.py` 后 agent 能按 mode 驱动对应界面；模型只从编号元素里选，未展示过的编号被拒绝；`AutoCua_data/` 里能看到聊天、密钥、自定义技能、浏览器 profile；低风险桌面任务 `task='check the version of macOS.'` 能跑通。作者视频示例声称一次航班搜索 6.1 秒、一次运行不足一分钟完成三件事——这些是作者主张，不是第三方实测。
- 做法 H：2–3 个真实的多源调研/登录态数据抽取任务能跑完；输出带来源链接；逐条核对来源后，未核实项被标注；跑通的流程能“Save this as a Skill”并用一句话再次触发；外部 agent 通过 `npx qz-browser-agent@latest create ... --stream` 或 MCP 能拿到结果。材料没有给出准确率、耗时、成功率；不要用 46 stars 或作者对比表当效果证据。
- 做法 I：`node src/cli.js doctor` 能完成一次快照；首次验证任务能找到 https://example.com 上的 "More information" 链接并给出目标地址；`ax_open` 拿全量快照后，后续动作只返回 diff；`ax_fill` 能一次设完整个表单；`ax_observe {find:"text"}` 大页面只回匹配行；`ax_scroll {until:"text"}` 能滚到目标文本；`ax_upload` 遇到文件选择框会报出来而不是挂住；`ax_open_many` 有界打开 URL。作者自报的基准（16 个服务端评分任务、同一 harness/模型）：axuse 28/28、Codex + Chrome 扩展 27/27、browser-use 0.13 27/27；中位每任务 17s / 26s / 56s；token 总量 4.7M / 9.8M / 8.8M；中位工具调用 5 / 7 / 12。注意称 16 个任务却给出 28/28，统计口径未解释；全部为作者自建自评，不能当定论。
- 做法 J：改动后可用存储增加、开机时间缩短、后台占用下降、App 启动变快、卡顿次数减少；崩溃/异常次数不上升；核心功能零回归——投屏、HDMI 输入、遥控配对、系统更新、应用商店安装与更新、常见视频 App 登录与播放正常。任一核心功能失效即判为失败并恢复出厂设置。材料没有给出成功率、耗时或机型覆盖数据；单一个案不可外推。
- 做法 K：`agent-desktop version` 能跑；`permissions --guide` 通过；`list-apps` 能列出；`snapshot --app Finder -i` 返回 `ok:true`、`complete:true` 和 `ref_count`；click 一个 ref 后再次 snapshot 能看到预期 UI 变化；错误码能区分 `STALE_REF` / `AMBIGUOUS_TARGET` / `INVALID_ARGS`，且只在 `disposition.retry` 为 safe 时重试；`trace` / `session` 有执行记录。README 没有成功率、耗时或基准数据，指标要自己定：同一 GUI-only 任务手动做 vs agent 做，记录步骤数、人工接管次数、旧 ref 重试次数、私密内容是否进公共日志。
- 做法 L：`vscreen launch Settings` 能成功；`vscreen act` 的 `until` 条件能按预期命中；每步返回当前屏幕、可见文本、可点击元素和截图；`until` 未达成、文本不在框内、焦点不在点击位置等错步会被停止并描述当前屏幕；需要人工接管或点 “Stop AI” 的次数；用户主屏是否保持不被占用；token 是否只留在本机/可信 tailnet；应用规则和支付确认是否按预期拦截。README 没有成功率或延迟基准，指标自己定：同一任务手动做 vs agent 做，记录步骤数、接管次数、主屏被打断次数。

最小试用方式：
- 先只跑做法 A 的两条安装命令，建最小任务、跑参考解，确认 reward 为 1.0。
- 若团队已在用 dsh 桌面端，做法 B 的最小试用是“装桥接插件 → 在 profile 里装一次扩展 → 让模型做一次快照与点击”。
- 做法 E 的最小试用顺序：准备一台可信测试机，开启开发者选项与 USB 调试，解锁并确认 RSA 授权，`adb devices -l` 显示 device；装技能到对应宿主目录，重开会话或 `/reload`；先只跑只读任务“打开系统设置首页，确认页面，不修改设置”；再跑一条“停在动作前”的边界任务；最后跑一条有限列表任务。
- 做法 F 的最小试用：`npm i -g agent-browser`，clone 仓库后跑 `bin/chrome-relay setup`；在一个 Chrome profile 里 Load unpacked 加载扩展，跑 `chrome-relay doctor`；选一个需要登录的内部站点，让 agent 走完 `chrome-relay url <你的邮箱>` → open → snapshot -i → click @e5 → close，中途不手动登录；跑 `chrome-relay audit` 复盘。
- 做法 G 的最小试用：先核对 `model_list.txt`，`pip install AutoCua`，写好 `.env`；用低风险桌面任务 `task='check the version of macOS.'` 试跑；再用 `run_agent(mode='web use', ...)` 让它驱动你自己的 Chrome 打开一个页面并停下；若要用 iOS，先跑 `device='simulation'` 的模拟器任务。
- 做法 H 的最小试用：在个人 Chrome/Edge 装扩展并接一个自带 API key 的模型；选一个已登录的真实站点，跑一个带来源要求的小任务，逐条核对来源；再跑 1–2 个多源调研或登录态抽取任务；只把跑通的流程说“Save this as a Skill”。
- 做法 I 的最小试用（半天内）：一台机器 clone 并跑通 `node src/cli.js doctor`；接到 Claude Code 或 Codex 的一个会话，把 `SKILL.md` 指给 skill 系统或系统提示；用 3–5 个手上真实的浏览任务跑一遍，覆盖一个整表填写加提交、一个滚动查找、一个多 URL 批量；同一批任务用现有做法做对照，记录通过数、中位耗时、总 token、中位工具调用数。
- 做法 J 的最小试用：挑一台可以弃用的旧电视，先读仓库说明，再只在一台设备上跑一轮；改动前记录基线；改动后当天与一周后各做一次回归检查；一台设备观察 1–2 周无异常且体验指标确有改善，再考虑第二台不同厂商设备。
- 做法 K 的最小试用：`npm install -g agent-desktop` 并跑 `agent-desktop version`；macOS 跑 `permissions --guide`；跑 `skills get desktop` / `platform` 并把输出交给 agent；用 `list-apps` 找到 Finder；`snapshot --app Finder -i`，点一个 treeitem 的 ref，再 snapshot 一次确认变化；换一个 GUI-only、无风险的小任务，在隔离环境里重复一遍；密集应用先 `skeleton --compact` 再 `--root` 下钻；检查日志与上传路径，确认快照/剪贴板/截图没有外泄。
- 做法 L 的最小试用：用一台备用/测试 Android 手机按上述 1–4 步安装授权，连接一个可执行命令或 MCP 的 Agent；先跑 `vscreen launch Settings` 和 `vscreen act ...` 冒烟，再让它走一次 Operit MCP 提示词；观察主屏是否保持不被占用、错步是否被停止并给出当前屏幕、需要人工接管或点 Stop AI 的次数、token 是否只在本机/可信 tailnet、应用规则和支付确认是否按预期拦截。稳定后再扩大任务范围。

试多久：材料没有给出耗时或成功率的数字；以“参考解拿到 1.0”“快照能给出编号控件并且点得中”“只读任务不改动设置”“Chrome Relay 的 doctor 通过且四步流程一次跑通”“AutoCua 能驱动目标界面一次且模型只选编号元素”“qz 的 2–3 个真实任务来源核对通过且 Skill 一句话复用成功”“axuse 的 doctor 通过且 3–5 个真实任务与现有做法对照有结果”“电视去臃肿一台设备观察 1–2 周无核心功能回归”“agent-desktop 的 permissions 通过、Finder 快照 → ref 动作 → 再快照复验一次成功且错误码按 disposition 处理”“Agent-VScreen 的 Settings 冒烟与一次 MCP 提示词跑通、主屏未被占用”这类单点事实跑通为准，不要用 star 数或视频演示判定。

## 常见坑

- 把关注度当可用性：28,641 stars、今日 +229 只说明有人看；dsh README 没有基准实测结果；android-adb-control 标称 40 stars，也没有效果数据；AutoCua 只有作者自述的演示时长；qz 仅 46 stars；axuse 47 stars、单一公司维护，基准为作者自建自评且统计口径有疑点；agent-desktop 是 Vercel Labs 早期项目，README 没有成功率、耗时或基准数据；Agent-VScreen 32 stars、1.1.7，没有独立测试、成功率、延迟或长时稳定性数据。
- 把 Agent-VScreen 当自带模型：手机端不调用模型，由调用方 Agent 的模型判断屏幕含义。
- 把 Agent-VScreen 的 token 贴到公开角色卡、共享配置或截图：token 等同手机控制权。
- 以为 Agent-VScreen 有公网链接：服务默认只监听 `127.0.0.1:18765`，只本机或自己的 Tailscale tailnet，不提供公网链接；Operit 与 Agent-VScreen 不在同一台手机时，URL 要换成 Tailscale 地址。
- 没装 Shizuku 或没给浮窗/通知/无障碍只读/电池优化/后台运行权限：Agent-VScreen 需要这些权限，部分手机还要自启动和后台活动。
- 在主力机/凭据设备上试 Agent-VScreen：先用备用/测试机；支付确认和应用规则要保留。
- 以为插件能替你装浏览器扩展：不能。命令行 `--load-extension` 只维持一个会话，Chrome 137+ 品牌版已忽略；必须在 profile 里正式装一次。
- 上架包传错：普通构建带 manifest key，Chrome Web Store 会拒收，要传 `-store` 包。
- 以为默认有人把关：`unrestrictedBrowserAccess` 出厂为开，新装不做询问；关掉才恢复动手前提示，而且它还会覆盖“读页面前先问”的选择。
- 把图像通道当默认能力：图像识别默认关，一旦开启你询问的那张图会离开本机交给所配模型。
- 模型名写显示名：`visionModel` 必须是 API id（写 `deepseek-flash`，别写 `DeepSeek-V4.1-Flash`），否则 API 会 400。
- 把文本快照当能覆盖一切：`<canvas>` 明确不收集；图片超过 `MAX_IMAGE_BYTES`（4 MB）就不内联。
- 以为装了 ADB 技能就有人把关：android-adb-control 的规则不是技术沙箱，仍需宿主权限控制与人工监督。
- 拿主力机做实验、或把截图与 UI XML 往外发：截图和 UI XML 可能含私人内容；ADBKeyboard 优先用于可信测试设备，不用于凭据输入。
- 把设备连接问题当技能问题：unauthorized、offline、Linux no permissions 先解决连接；不要将 ADB 端口暴露到公网。
- 以为 ADB 技能会自己无限跑：默认预算是最多 30 个设备状态变更动作、5 分钟；原文没有时间/事件触发的持续运行、无人值守监控或无限重试。
- 忽略成熟度：Cua Spaces 是 0.1.0；CUA-S1 是早期源码研究版；dsh 扩展在 Chrome / Firefox 均 not yet listed；agent-desktop 是早期项目；Agent-VScreen 是 1.1.7 且无独立测试。
- 环境不满足硬装：Spaces 需 macOS 26+，Lume 需 Apple Silicon；dsh 需 Node ≥ 20；AutoCua 需 Python 3.10+；axuse 需 Node.js 22+ 且机器上有 Chromium 系浏览器；agent-desktop 需 Node 环境，Linux 需图形会话 + at-spi2-core；Agent-VScreen 需 Android 11+、arm64、Shizuku。
- 跑错已废弃包：cuabot（npm）有已知安全问题，原文明确写 Do not run it；应停用并卸载。
- 商用许可踩坑：Cua 的 SDK、CLI、Driver、Lume 是 MIT；Cua Spaces 是 FSL-1.1-MIT；cua-som 是 AGPL-3.0-or-later；android-adb-control 是 MIT；AutoCua 是 MIT，其 Windows Interception 驱动是 LGPL-3.0 非商业 / 付费商业双许可；axuse 是 PolyForm Noncommercial 1.0.0；agent-desktop 是 Apache-2.0。做商用集成前必须逐目录查 LICENSING.md。
- 以为 README 就是全部：Cua 的权限授予、平台支持边界、任务编写格式在外链文档里；dsh 的安装确认要按 `docs/INSTALL.md`；android-adb-control 的具体命令在 references 和 `docs/testing.md` 里；agent-desktop 的命令契约在 `docs/json-output.md`，使用规则要用 `skills get` 取；Agent-VScreen 的更多 CLI、MCP、HTTP、watch、浮窗和远程访问细节在 `API.md`。
- 以为 Chrome Relay 能覆盖所有浏览器：仅 macOS + Google Chrome + Node.js 20+；只放行 Claude Code / Codex / Cursor / Paseo 四类 agent 应用。
- 以为 setup 会自动装扩展：不会。每个希望 agent 使用的 Chrome profile 都要手动 Load unpacked。
- 把 Chrome Relay 当恶意软件安全边界：作者明确说它不是对“已以你身份运行的恶意软件”的安全边界。
- 凭据处理：Chrome Relay 的 agent 从不输入凭据；遇到密码、passkey、两步验证或未登录账号会停下并给 SIGN-IN NEEDED。
- 把 AutoCua 的 `mobile use, android` 当成可用：尚不可用；iOS 模式仅 macOS 宿主，模拟器需要完整 Xcode，真机需要一次性配对和 Team ID 签名。
- AutoCua 模型名写错或大小写不对：模型名来自 `model_list.txt`，区分大小写；不在清单里的名字会原样转发并返回 404。
- 在 Ubuntu/Debian 直接 `pip install AutoCua` 进系统 Python：会拒绝，需在存放 main.py 和 .env 的目录用发行版自带 `python3` 建 venv。
- Linux 首次 `computer-use` 没开 Allow Remote Interaction：会导致远程交互失败。
- 把 AutoCua 作者视频里的 6.1 秒、不足一分钟完成三件事当实测：原文是视频示例声称，没有第三方基准。
- 把 qz 当 Firefox 可用：明确不支持。
- 把 qz 的 README 对比表当第三方基准：作者按公开文档自评；材料不含 `docs/benchmarks.md` 内容。
- 忽略 qz 的权限面：浏览器扩展能读取你所有已登录站点，材料只指向 `docs/permissions.md`，没有具体权限内容，使用前自行核查。
- 以为 qz 有定时/事件触发：README 没有给出定时调度、事件监听或状态触发。
- 把 axuse 的基准当定论：称 16 个任务却给出 28/28，统计口径未解释；全部为作者自建自评，没有第三方复现。
- 在 axuse 的 extension backend 下想进入 OOPIF 帧：只能列出、不能进入；CDP backend 可以。
- 以为 axuse 能绕过反爬：它不实现流量标注和反爬交接。
- 在 Linux 上找 axuse 桌面驱动：没有；浏览器工具仍可用。
- 把 agent-desktop 当 Computer Use 模型：它不是，决策循环留在你的 agent 里；它只提供 observe/act 原语，明确不做像素匹配。
- 裸写 `@e8` 或重试旧 ref：ref 绑定 snapshot；裸写会被 `INVALID_ARGS` 拒绝，UI 变了会返回 `STALE_REF` 或 `AMBIGUOUS_TARGET`，必须重新快照换新 ref。
- 多窗口不指定 `--window-id`：会得到 `AMBIGUOUS_TARGET`；错误里的 `error.details` 会列候选 window id。
- 密集应用直接全量快照：先 `--skeleton --compact` 出骨架图，再 `--root` 下钻。
- 以为默认会移动指针：agent-desktop 默认 headless，不移动指针、不抢焦点；需要物理输入才加 `--headed`。
- PowerShell 里不给 ref 加引号：裸 `@token` 是 splatting 运算符，会出错；写成 `agent-desktop click '@s8f3k2p9:e8'`。
- 把快照、剪贴板、截图、命令输出、调试产物传公共日志：可能含私人桌面内容；可选的 JEV helper 会把屏幕描述发给配置的模型提供方，需单独评估。
- 以为 agent-desktop 有定时调度/常驻守护：README 没有给出这些机制；wait / session / trace / batch 和轮询只是基础件，时间触发需要外部编排。
- 依赖长按拖拽：`key-down` / `key-up` / `mouse-down` / `mouse-up` 在 daemon 能释放被按住的键或按钮之前会拒绝执行。
- 照旧教程 brew tap 装 agent-desktop：Homebrew 与 Scoop 官方包还在提交、默认源里拿不到；native archive 的 helper 必须和可执行文件放在一起。
- Linux 上直接跑 agent-desktop：需在用户图形会话中且装 at-spi2-core；鼠标输入与窗口控制依赖 X11，Wayland 剪贴板需 wl-clipboard。
- 电视去臃肿路线：原文截断，不要猜 `adb` / `pm` 命令；不要在没有读仓库说明、没有记录基线、没有恢复出厂设置兜底的情况下执行；不要拿主力电视试；不同厂商菜单命名和位置不同；非官方改造可能影响保修、OTA 和系统更新；单一个案不可外推。

## 证据与来源

- 做法 A 的安装命令、做法 D 的 `cua sb` 命令、Driver 与 Lume 安装命令、Calculator 显示 42、Lume VM 能 SSH 连上、Cua Bench 参考解 reward=1.0：来自 trycua/cua README（本次整理的 Cua 调研材料）。
- 做法 B 的安装/构建命令、17 个工具名、`cordis.patch.yml` 配置、基准命令与 6 任务 × 5 种子 × 2 后端 = 60 次的规模、文本快照覆盖范围、`MAX_IMAGE_BYTES` 4 MB、`unrestrictedBrowserAccess` 出厂为开：来自 youbaiyun/dsh-browser-crossplatform 仓库 README 与源码结构（本次整理的 dsh 调研材料）。dsh README 通篇没有给出基准实测结果，所以基准命令只能证明方法可跑，不能证明更快或更准。
- 做法 E 的安装命令与目录、四宿主调用方式、三条示例提示词、默认预算（30 个设备状态变更动作 / 5 分钟）、安全与授权清单、静态检查命令、MIT 许可、40 stars：来自 robbin/android-adb-control README（本次整理的调研材料）。作者自述本版本已做文档审查和静态检查，尚未完成修订版真机端到端验收；“兼容四个宿主”只是格式与加载层面的兼容声明。
- 做法 F 的命令、架构、端口 `127.0.0.1:9333`、权限校验机制、四步用法、audit 字段、登录态处理、维护命令：来自 aindev/agent-chrome-relay README（本次整理的调研材料）。0.15s/命令、2 分钟 setup、30 分钟沉默清理只是作者自述；作者明确它不是恶意软件安全边界。
- 做法 G 的 `pip install AutoCua`、`run_agent(...)` 示例、mode 表、平台依赖、Linux venv、GNOME 屏幕共享、Windows UAC、iOS 模拟器/真机差别、`model_list.txt`、`AutoCua_data/`、子代理命令、`agent_capabilities.md`：来自 ComputerUseAgent/AutoCua README（本次整理的调研材料）。6.1 秒航班搜索、不足一分钟完成三件事是作者视频示例声称，不是第三方实测。
- 做法 H 的安装路径、模型接入、任务示例、Skill 保存与复用示例、`npx skills add`、`connect`、`create --stream`、MCP、源码构建命令、provider 预设列表、Node.js 版本要求、Chrome/Edge、Firefox 不支持、Apache-2.0、46 stars：来自 alibaba/qz-browser-agent README（本次整理的调研材料）。README 没有成功率或案例数据；对比表是作者按公开文档自评。
- 做法 I 的 clone、`node src/cli.js doctor`、MCP 接入命令、`print-config`、`SKILL.md`、bridge setup/verify、环境变量、open-urls、自测命令、工具面（`ax_fill` / `ax_observe` / `ax_scroll` / `ax_upload` / `ax_open_many`）：来自 ctoldigital/axuse README（本次整理的调研材料）。基准数据（16 个服务端评分任务、axuse 28/28、Codex + Chrome 扩展 27/27、browser-use 0.13 27/27；中位每任务 17s/26s/56s；token 4.7M/9.8M/8.8M；中位工具调用 5/7/12）为作者自建自评，统计口径未解释；7 任务扩展只跑过一次；没有第三方复现。PolyForm Noncommercial 1.0.0 许可、47 stars、单一公司维护来自同一份调研。
- 做法 J 的来源：@yyyole 的 X 推文（采集时 205 赞 / 42 转 / 18 回复），附 GitHub 仓库卡片 Gathin23/cleanyourtv，描述为“Debloat any Android or Google TV over Wi-Fi...”。原文明确给出的只有：同一局域网 + 电脑已装 Claude Code；电视进入 设置 → 关于，在“版本号 / Build”上连续按 7 次开启开发者选项。原文在流程第 2 步中途被截断，后续连接方式、去臃肿清单和执行命令均缺失；“可以这么简单”“平替 Apple TV”是作者个人评价，没有对比测试、设备型号、Android 版本、失败案例或指标数据；仓库内容未提供，无法核实是否会误删系统组件、是否需要 root、是否影响 OTA 和保修。
- 做法 K 的安装命令、`permissions --guide`、`skills get desktop/platform`、`npx skills add`、AGENTS.md 提示词、snapshot/ref/click/再快照、错误码与 `disposition.retry`、多窗口 `--window-id`、skeleton/root、`--headed`、PowerShell 引号、数据卫生、FFI、60 个命令名/56 个可操作命令、`key-down/up/mouse-down/up` 未就绪：来自 vercel-labs/agent-desktop README（本次整理的调研材料）。Apache-2.0；Vercel Labs 早期项目；README 没有给出成功率、耗时或基准数据，也没有定时调度/事件订阅/常驻守护机制；JEV helper 会把屏幕描述发给配置的模型提供方，需单独评估。
- 做法 L 的来源：kilolonion/agent-vscreen README（本次整理的调研材料）。版本 1.1.7、Android 11+、arm64、仅需 Shizuku 不需要 root、`vscreen` CLI/MCP/HTTP 接入、默认端口 `127.0.0.1:18765`、安装与授权步骤、`vscreen launch Settings` / `vscreen act` 命令、Operit ToolPkg 与远程 MCP 配置、Tailscale 限制、应用规则与支付确认、watch/until 说明均来自该 README；`API.md` 未在输入中展开。32 stars；没有独立测试、成功率、延迟、长时稳定性或兼容性数据；功能多为作者主张。

## 依据的调研

- [trycua/cua](../research/radar/2026-10-08/1857-trycua-cua.md)：值得一试，可以把 Cua 当作一套「让 AI 真正操作电脑」的试验台小范围搭起来：先用 Cua Bench 的无 VM 模拟任务跑通「建任务→跑参考解→evaluator 返回 reward=1.0」，再装 cua-driver 做 Calculator 6×7 这类有明确验收标准的首个结果；理由是原文给了可复制的安装与 CLI 命令和明确的验收口径，但详细权限/平台支持步骤都在外链文档里，且 Spaces 仅 0.1.0、CUA-S1 为早期源码研究版，尚不足以直接写进手册当标准流程。
- [youbaiyun/dsh-browser-crossplatform](../research/radar/2026-10-08/2037-youbaiyun-dsh-browser-crossplatform.md)：值得一试，若团队已在用 dsh 桌面端、又需要让模型真的去读和操作浏览器，可以按仓库给出的安装/配置命令小范围试装，并优先复刻它的权限与反馈设计（敏感字段打码、动手前批准开关、回环 id 白名单）和成对基准方法；理由是安装命令、配置片段、工具面与验证指标都能直接照抄，但 README 通篇没有给出基准实测结果，且方案完全绑定 dsh 生态，不宜直接全量采用。
- [robbin/android-adb-control](../research/radar/2026-10-09/2231-robbin-android-adb-control.md)：值得一试，先把该技能装到一台可信测试机上，用最低风险任务（如“打开系统设置首页并只读确认”）跑通观察—一步操作—验证的闭环，再考虑扩大范围；README 给了可照做的安装路径、调用方式和安全预算，但作者自述本版本尚未完成真机端到端验收。
- [aindeev/agent-chrome-relay](../research/radar/2026-10-11/2456-aindeev-agent-chrome-relay.md)：值得一试，在一台 Mac 上按 README 的 setup 流程装 Chrome Relay，让 Claude Code/Codex/Cursor 这类编码 agent 借用你已登录的 Chrome 后台标签页做网页操作；它给出了可直接照做的命令、安装步骤和权限/审计机制，值得小范围试，但仅限 macOS、只放行四类 agent 应用，且作者自认不是恶意软件的边界，所以先试不要全量铺开。
- [AutoCua/AutoCua](../research/radar/2026-10-13/2911-autocua-autocua.md)：值得一试，可以把 AutoCua 当作"给代理开放真实桌面/浏览器/手机界面权限"的可试方案：它给出了完整的 pip 安装、各平台依赖清单、run_agent 调用示例和权限配置步骤，但需要在一台可控机器上小范围验证稳定性和安全边界后再进手册。
- [ComputerUseAgent/AutoCua](../research/radar/2026-10-13/2954-computeruseagent-autocua.md)：值得一试，可以按 README 的命令在 macOS 上装好并用一条低风险桌面任务（原文示例 `task="check the version of macOS."`）做小范围试跑，确认「一行 mode 切换驱动对象」这条用法是否真的省事；只给 try 不给 adopt，是因为原文只有作者自述的演示时长、没有第三方复现，且示例里的模型名与现有命名不符，需要先核对 model_list.txt 再投入生产流程。
- [alibaba/qz-browser-agent](../research/radar/2026-10-19/4769-alibaba-qz-browser-agent.md)：值得一试，先在个人 Chrome/Edge 上装扩展、接一个自带 API key 的模型，跑 2–3 个真实的多源调研与登录态数据抽取任务，逐条核对来源后再把跑通的流程存成 Skill 复用；理由是 README 给出了完整的安装、配模型、CLI/MCP 接入与源码构建步骤，可照做，但可靠性只有作者自述、没有独立评测，仓库采用度也低，还不宜直接 adopt。
- [ctoldigital/axuse](../research/radar/2026-10-20/5183-ctoldigital-axuse.md)：值得一试，建议先小范围试用：按 README 的步骤把 axuse 以 MCP 方式接入 Claude Code 或 Codex，只用于表单填写、滚动查找、批量打开 URL 这类浏览器任务，与现有做法做同任务对照。理由是安装、配置、错误处理约定和自测命令都可以直接复制，但它仅在非商业许可下免费使用，基准数据由作者自行报告且统计口径有疑点，桌面控制也只有 Windows 经过验证。
- [@yyyole: 今日最佳！](../research/radar/2026-10-21/5447-item.md)：值得一试，建议小范围试：照 cleanyourtv 仓库的说明，在一台可弃用的旧安卓电视上，先用 Wi-Fi 调试和 Claude Code 完整执行一轮去臃肿，确认无损后再推广；原文只保留了流程的前两步，具体命令必须以仓库为准，并且要先记录基线以便验证与回滚。
- [vercel-labs/agent-desktop](../research/radar/2026-11-03/9842-vercel-labs-agent-desktop.md)：值得一试，按 README 给出的“snapshot → 对 ref 执行动作 → 再 snapshot 复验”闭环，在非敏感桌面或隔离环境小范围试用 agent-desktop，并先把 `agent-desktop skills get desktop/platform` 的输出喂给智能体再让它上手。它能补上“只有 GUI、没有 API”的软件操作能力（能力发现与条件供给都有具体做法），但仍是 Vercel Labs 早期项目、需要系统辅助功能权限、快照中可能包含隐私内容，因此先试不直接上生产。
- [kilolonion/agent-vscreen](../research/radar/2026-11-09/11812-kilolonion-agent-vscreen.md)：值得一试，建议先在备用 Android 手机上按 README 安装授权，用 `vscreen` CLI/MCP 小范围试用后台虚拟屏操作，并保留浮窗接管、应用规则和支付确认；因为原文给出了可照做的安装、命令与 MCP 配置，但项目较新、缺少独立验证，且 token 等同手机控制权，不宜直接全面采用。
