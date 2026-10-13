# ComputerUseAgent/AutoCua

- 结论：**值得一试**。可以按 README 的命令在 macOS 上装好并用一条低风险桌面任务（原文示例 `task="check the version of macOS."`）做小范围试跑，确认「一行 mode 切换驱动对象」这条用法是否真的省事；只给 try 不给 adopt，是因为原文只有作者自述的演示时长、没有第三方复现，且示例里的模型名与现有命名不符，需要先核对 model_list.txt 再投入生产流程。
- 原文：https://github.com/ComputerUseAgent/AutoCua
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T14:41:07.250Z

## 是什么

AutoCua 是一个跨平台的「计算机使用」智能体套件（README 自称 multi-agent harness engine）。它的核心设计是**一个 `mode` 字符串决定智能体驱动什么**，其余接口保持不变：

| `mode` | 驱动对象 | 运行位置 |
|---|---|---|
| `"computer use"` | 桌面：点击、输入、快捷键、应用、AppleScript | macOS / Windows / Linux，自动识别 |
| `"shell use"` | 真实终端里的编码智能体 | 三平台 |
| `"web use"` | 你自己的 Chrome，通过 AutoCua 扩展驱动；headless 走调试端口 | 有 Chrome 的主机，缺失时自动下载安装 |
| `"mobile use, ios"` | 默认 iOS 模拟器，或已配对的 iPhone/iPad | macOS 主机 |
| `"mobile use, android"` | 尚未支持 | — |

架构上是一个分层多智能体：父 agent 掌管屏幕、决定任务需要什么；需要写代码时委派给 coder agent（14 个工具，流程为 EXPLORE / PLAN / EXECUTE / VERIFY）；minions 是只读侦察兵（6 个工具，不可递归，一次可并行多个），存在的目的是压住 coder 的上下文。浏览器侧（agent loop、页面扫描器、控制器）整体是一个 Rust crate，编译成单个 Python 扩展模块。

对做手册最有价值的一点：它把「模型操作屏幕」这件抽象的事拆成了一串**可复制的工程决定**——怎么让模型不猜坐标（用编号元素而非像素）、怎么在真实软件上输入（走操作系统输入层而非调试端口）、长任务怎么不撞上下文墙（独立压缩 agent 中途注入 handoff 摘要）、每个模式有哪些冻结的工具白名单。

## 具体做法

**前提（第 1 步之前先确认）**：Python 3.10+；Windows 10/11、Linux（需 GNOME 桌面，README 说在 Ubuntu + Wayland 上测过，X11 未测）、macOS（Apple Silicon 或 Intel）；一个模型 provider 的 API key。

### 1. 安装包

```bash
pip install AutoCua
```

Linux 上先补一批发行版包（pip 装不了）：

```bash
sudo apt install python3-gi python3-cairo python3-gi-cairo python3-venv gir1.2-atspi-2.0 gir1.2-gtk-3.0 \
                 gir1.2-webkit2-4.1 at-spi2-core xdg-desktop-portal xdg-desktop-portal-gnome \
                 gir1.2-gstreamer-1.0 gstreamer1.0-pipewire gstreamer1.0-plugins-base \
                 libglib2.0-bin libgtk-3-bin xdg-utils
```

KDE 上把 `xdg-desktop-portal-gnome` 换成 `xdg-desktop-portal-kde`；Fedora / Arch / openSUSE 包名不同，仓库里的 `setup_linux.sh` 列了对应清单。

### 2. 写 `main.py`，这就是全部配置面

```python
from AutoCua.agent_launcher import run_agent

run_agent(mode="web use", provider="openrouter", model="gemini-3.8-flash",
          task="Open wikipedia.org and summarise today's featured article.")
```

```bash
python main.py
```

换驱动对象只改 `mode` 字符串。注意 `model` 名必须来自仓库的 `model_list.txt`（大小写敏感），不在清单里的名字会被原样转发、返回 404。

### 3. 放 key 和数据目录

把 provider key 写进 `.env` 文件，或在桌面 app 的 Settings 里粘贴。agent 保存的一切（对话、密钥、自定义 skills、浏览器 profile）都落在**你运行 Python 的那个目录**下新建的 `AutoCua_data/` 里。

### 4. Linux 额外要求：venv 必须建在发行版自带的 python3 上

Ubuntu / Debian 不允许往系统 Python 里 `pip install`。在放 `main.py` 和 `.env` 的目录里建 venv（agent 才找得到 `.env`）：

```bash
cd my-agent                         # 放着 main.py 和 .env 的目录
python3 -m venv .venv
source .venv/bin/activate
pip install AutoCua
python main.py
```

venv 必须建在**发行版自带的 python3**（3.10–3.14）上：AutoCua 只在 3.x 版本一致时才能从 venv 里加载系统 PyGObject，版本不一致会停在 `cannot import gi`。首次 computer-use 运行时 GNOME 会请求屏幕共享授权，**必须先把 Allow Remote Interaction 打开再点 Share**（GNOME 默认是关的），选择会存进 `AutoCua_data/`。首次扫描还会下载读屏幕文字的 PP-OCRv6 模型。

### 5. 首次运行的几个开关

- 加 `ui=True` 打开桌面 app，而不是在终端里跑任务。第一次会问是否下载 Electron（120–160 MB，一次），回复 `y`；`n` 表示不要且不再问；回车表示暂不。不下载就用 pywebview 打开同一个 app。也可以随时 `python -m AutoCua.utils.electron` 拉取，不需要 Node.js。
- 可选参数全部直接塞进 `run_agent(...)`：`ui`、`save_conversation`、`speed`、`external_terminal`、`headless`、`browser_port`、`browser_profile`、`extra_tasks`、`device`、`ios_version`、`sim_device`、`app_build`、`api_key`、`os`，文档在 `agent_capabilities.md`。

### 6.（可选）Windows 上让 agent 能应答 UAC 提权弹窗

Windows 用户态 `SendInput` 到不了 UAC 安全桌面，只有内核态能应答。需要单独装 Interception 驱动：

```bat
setup_windows.bat
```

它会先询问（回 `N` 则什么都不下载安装），然后下载锁定版本、校验 SHA-256、安装、**只绑定内置键盘**（外接键盘不会被过滤），最后再问一次是否重启。前提是知道：这个驱动 pip 装不了（wheel 只解包不执行、pip 不以提权身份运行、驱动只在开机时绑定输入槽），而且**不装它所有模式照样能用**，只是丢掉 UAC 处理能力，碰到提权弹窗的任务会停在那一屏。它不进 wheel 的原因是 LGPL-3.0 非商用 / 付费商用双许可。

### 7. 从源码跑

```bash
git clone https://github.com/AutoCua/AutoCua.git
cd AutoCua

bash setup_mac.sh            # macOS
setup_windows.bat            # Windows，会自我提权，装内核驱动前会先问

cp .env.example .env         # 填入 provider key
python main.py
```

### 8. 单独调用 coder agent 或 minions（不经过父 agent）

两者会从自己的工作区启动，所以处理已有项目时要给绝对路径：

```bash
python -m AutoCua.mac.agent.coder   --task "refactor the auth module in /Users/me/projects/api" --provider anthropic --model claude-sonnet-5
python -m AutoCua.mac.agent.minions --task "where is _validate_token defined in /Users/me/projects/api and who calls it?" --provider anthropic --model claude-sonnet-5
```

### 9. iOS 模式的两个参数

```python
run_agent(
    mode="mobile use, ios",
    provider="anthropic", model="claude-sonnet-5",
    device="simulation",        # 或 "hardware"
    ios_version=None,           # 例如 "26.5"；None 表示选最新的可用运行时
    sim_device=...,
)
```

`device="simulation"`（默认）跑在 Mac 上的 iOS 模拟器，靠 `xcrun simctl` 加一次**未签名**的 `xcodebuild test`，需要完整 Xcode，**不需要 Apple ID、签名或配对**；`device="hardware"` 驱动已配对的真机，靠 pymobiledevice3 + USB 转发 + XCUITest 启动，需要一次性配对和 Team ID 签名。`app_build="MyApp-Simulator.ipa"` 只在模拟器路径下支持，真机路径会直接报错停止。首次执行 iOS 任务会自动 clone WebDriverAgent，需要完整 Xcode 和 git。

## 对应的研究问题

### 1. 能力发现：AI 已经能做哪些还没想到交给它的工作

README 给的可迁移清单比一般的「编码助手」宽：

- **桌面 GUI 操作**：任意桌面应用，用真实鼠标键盘事件驱动（点击、输入、快捷键、滚动、拖拽、截图、`open_app`、`shell`）。
- **把 AppleScript 当一等工具**：模型给出完整的 `tell application` 块，运行时负责启动、前台化和 30 秒上限——这是把「脚本化 Mac 应用」正式交给模型，而不是当 bash 逃生口。
- **真实终端里的编码代理**：coder agent 有自己的 EXPLORE/PLAN/EXECUTE/VERIFY 流程和 14 个工具。
- **浏览器只读/抓取模式**：`scramble`（原文为 `scrape`）不接模型给的 CSS 选择器，而是自己按页面「形状」找记录，一次读三屏、约 8k token，索引存成 JSON；进入 scraping 模式后工具白名单收缩成 6 个。这条可以直接抄成「让 AI 抓网页数据而不被页面结构绑死」的做法。
- **iOS 模拟器 / 真机操作**，且**模型不知道自己在哪个目标上**（两条路径终点相同）。
- **长任务不撞上下文墙**：独立的压缩 agent 盯着 transcript，中途把 handoff 摘要拼进去。

### 2. 任务匹配：什么工作适合怎样的模型、工具和协作方式

- **按驱动面选 mode**：桌面杂活用 `computer use`，代码活 `shell use`，网页任务 `web use`，手机 `mobile use, ios`。
- **按速度/质量分档**：web agent 有 `speed="fast"`（README 称飞行搜索 6.1 秒）和 quality 模式（一次跑三个任务的演示不到一分钟）。
- **按上下文预算分工**：父 agent 管屏幕决策，coder agent 管代码改动，minions 做只读侦察、可并行、只回 `path:line` 锚定的结论。原文明确说 minions 存在的理由是「保持 coder 的上下文小」——这是一条可以直接写进手册的协作原则：**搜索/读代码这类会灌爆上下文的事，交给只读子代理做，主代理只收摘要**。
- **工具结果也要预算**：单次结果 200 行或 15,000 字符，`shell` 只留 50 行尾部，`view` 上限 2,000 行，`grep` 上限 8 MB。
- **该跳过的步骤就跳过**：只消化工具结果的那一步（web 查询之后、coder 回报之后）完全跳过屏幕扫描——不看屏幕就别截图，白烧 token。
- **并行**：有 `extra_tasks` 和「把并行 agent 钉到某个标签页」两种做法，钉住的 agent 只有 15 个工具（三个标签页生命周期工具被从注册表移除并在路由层拒绝）。

### 3. 条件供给：需要提供哪些信息、工具、权限和反馈

- **凭证**：`.env` 或 app Settings 里的 provider key；`api_key` 也是 `run_agent` 的参数。
- **模型名清单**：必须来自 `model_list.txt`（README 称 48 个模型、9 个 provider），大小写敏感。
- **系统权限**：macOS 首次操作会弹权限窗；Linux 需要 GNOME 的 screen-share 授权并**手动打开 Allow Remote Interaction**；Windows 提权弹窗需要内核驱动；iOS 模拟器路径需要完整 Xcode，真机路径需要配对 + Team ID 签名。
- **登录态**：窗口模式跑在**你自己的 Chrome** 里，agent 以你的身份登录；headless 用**按名字持久化的 profile**，cookie / localStorage / 登录都能跨运行保留。原文的结论是「已经登录着」比任何指纹调优都重要，因为登录墙正是 web agent 通常停下来地方。
- **反馈机制**：macOS 权限对话框有专门的 watcher——按结构识别（任何带 Don't Allow / Deny 按钮的窗口或 sheet），1 秒轮询，围绕每次 AppleScript 调用和每条 shell 命令；弹窗存在但点不动时 8 秒后以「权限相关错误」失败，而不是永久挂住。
- **安全护栏**：工具名是冻结白名单，模型自己发明的工具名只会返回错误、永不执行；`run_script` / `scrape` 两个后门由 `guardrails_check.rs` 筛查（只允许网页、拒绝窃取和跨站发送、结果里的凭证形状的值会被剔除），并且都被要求少用，因为反自动化机制可能注意到它们。

### 4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成

- 原文能支持的是**单次任务执行 + 中途自我保护**，不是通用的时间/事件调度：`wait`、`todo_list`/`update_todo`、`scratchpad`、`agent_wait` 都是 agent 自己循环里的状态工具。
- 最接近「持续推进」的三点：(a) 压缩 agent 在运行中途注入 handoff 摘要，让长任务跑完而不是死在上下文上限；(b) 权限对话框的 1 秒轮询 watcher 包住每个外部调用；(c) 页面冻结 5 秒或崩溃的标签页会被关掉并把页面在原地重开。
- **README 没有给出定时触发、事件订阅或常驻调度的做法**，所以这一条只能按「任务级自愈与续跑」来写手册，不能写成「可配置的自动化调度」。Telegram 远程控制只是入口，原文没展开触发语义。

### 5. 效果验证：怎样判断确实改善了结果

这一项原文最弱，但有两处**可以做进手册的验证习惯**，都来自 coder agent 的规矩：

- 「任何含逻辑的改动都要在 `./.AutoCua_verify/` 下写一个用完即弃的测试，**真的跑它**，记录输出，退出前删掉。」
- `replace` 写入前校验旧块、写入后再校验一次，行号过期时报 `mismatch at line X` 而不是把文件改坏。
- 另外 `scrape` 的索引会以 JSON 存到 `AutoCua_data/scrapes/<run>/<n>.json`，带编号和时间——这本身是一个可回查的执行记录。

除此之外，原文的「6.1 秒」「不到一分钟跑三个任务」是演示，不是可复现的评测指标。

## 与已有做法的关系

清单中相关条目：**Cline（watch）**、**Cursor（watch）**。

- AutoCua 的 coder agent 部分和它们功能重叠：都是编辑器/终端里的编码代理，有工具白名单、计划、验证循环。Cline、Cursor 是「在 IDE 里写代码」；AutoCua 的差异在于**驱动器是操作系统本身**（真实鼠标键盘事件、AppleScript、浏览器扩展、手机），coder agent 只是父 agent 的一个被委派的下属。
- 可以互相印证的做法：工具白名单冻结（模型编造的工具名一律拒）、只读子代理并行侦察、改前改后双向校验、一次性验证测试跑完即删。这些在 Cline/Cursor 那条线上也常见，AutoCua 把它们写得更明确（比如 minions 的六名白名单是**在调用路由层**强制的，不是提示词约定）。
- 清单中**没有**与桌面 GUI 自动化、iOS 真机/模拟器驱动、浏览器扩展内驱动 Chrome 直接对应的条目，这几块是新增能力。

## 证据与局限

**原文给出的（均为作者自述，无第三方复现）**：

- 结构上可核对的细节很多，说明不是纯宣传：macOS 侧用 `CGWindowListCopyWindowInfo` 定 z-order、`AXUIElementCreateApplication` 逐进程走树、`AXEnhancedUserInterface` 唤醒应用后等 0.3 秒、Apple Vision OCR 置信度下限 0.4、在 1x 逻辑分辨率下识别把 2940 px 的截图从 1.17 s 降到 0.78 s；元素用 20x20 采样点重测、可见度低于 1% 就丢弃；截图先降到 1920x1080 以内（不放大）、打 13 px 品红标签配 2 px 黑边、编成 **4:4:4 JPEG q85**（理由是默认色度抽样会把细品红数字糊掉，且只有 PNG 十分之一的字节）。
- Windows 侧：一次 UIA 缓存往返取 18 个属性，四线程并行跑 WinRT OCR / 任务栏 / Win32 / 开始菜单原始 UIA，结果 5 px 内去重合并；Chromium 用 `--force-renderer-accessibility` 启动；点击打在元素内容的像素质心而不是外框中心。
- 浏览器侧：不用 Playwright / Selenium / Puppeteer / chromedriver（原文称仓库里一处都没有），调试端口模式每帧两次 CDP 调用（`DOMSnapshot.captureSnapshot` + `Accessibility.getFullAXTree`），跨域 iframe 最多展平六层；**两种模式都不调用 `Runtime.enable`，编号框是画进 JPEG 的**（Rust 手写 3x5 位图字体），不写进 DOM。
- 页面模型：网络静默 150 ms 即算稳定、最多等 3 秒；编号按文档序、上限 300 个元素；YouTube 有 per-host 覆盖（关掉 pointer-cursor 检测、上限 200）。

**只是主张、需要打折看的部分**：

- 「6.1 秒完成一次航班搜索」「不到一分钟跑完三个任务」是演示视频的时长，没有任务集、没有重复次数、没有成功率。
- **示例里的模型名要当心**：README 用的 `gemini-3.8-flash`、`claude-sonnet-5` 与当前已知命名不符，可能是占位或虚构，进一步说明这份 README 不能当作可靠的状态说明。要用先打开 `model_list.txt` 核对真实可用名字。
- `"mobile use, android"` 明确标注未支持。
- 原文**在 iOS 一节被截断**（停在 `sim_d`），iOS 的完整参数、limits and safety、project layout、roadmap 等章节都看不到，所以关于安全性上限和 iOS 细节只能依据已见部分判断。
- 仓库热度只有 101 stars，属于早期项目；README 是官方自述，无独立评测。

**适用条件**：pip 走通的前提是平台对得上（Linux 仅 x86_64 + GNOME + Wayland、X11 未测；iOS 需 macOS + 完整 Xcode）；`"computer use"` 在 Linux 上依赖发行版包而非 pip；桌面 app 的 Electron 是可选的 120–160 MB 一次性下载。

## 怎么试、怎么验证

**最小试用（半天内可完成，建议在 macOS 上）**

1. 建一个干净目录，`pip install AutoCua`，写一个只含一行 `run_agent(...)` 的 `main.py`，`mode="computer use"`，任务就用原文那个零风险例子：

```python
run_agent(
    mode="computer use",
    provider="anthropic",
    model="claude-sonnet-5",           # 名字必须来自 model_list.txt
    task="check the version of macOS.",
)
```

2. 跑 5 次，记录成功率、是否卡在权限弹窗、要不要人工接管。
3. 换 `mode="web use"` 跑一个纯只读任务（原文示例：打开 wikipedia 总结当天特色条目），验证它是否真的复用了你已登录的 Chrome、以及 Chrome 上的「AutoCua started debugging this browser」提示条与 Cancel 按钮是否符合预期。
4. 单独跑一次只读的 minions，对比你自己手写 grep 找同一个符号的准确度和耗时：

```bash
python -m AutoCua.mac.agent.minions --task "where is _validate_token defined in /Users/me/projects/api and who calls it?" --provider anthropic --model claude-sonnet-5
```

**判断有没有改善的指标**

- **成功率**：同一任务 N 次里成功次数（分母写进手册，不要只写「能跑」）。
- **人工介入次数**：每任务平均需要你点几下（权限弹窗、Chrome Cancel、UAC）。这个数直接对应第 3 个研究问题的结论。
- **耗时对比基线**：同一任务你自己手动做一遍要多久，和 agent 端到端时间比。
- **上下文是否撑住**：长任务跑到底 vs 中途失败，对照它宣称的压缩 agent 是否真的起作用。
- **工具越界的次数**：模型是否经常调用白名单外的工具名（应全部被拒），以及 `run_script` / `scrape` 是否触发了护栏拒绝。
- **coder agent 的验证习惯是否值得抄**：观察它是否真的在 `./.AutoCua_verify/` 下写了并运行了临时测试、退出前是否删除——如果这条在实践中成立，这一条**独立于 AutoCua 本身**，可以直接写进手册。

**试用红线**：`web use` 窗口模式跑在你自己已登录的 Chrome 上，别拿主账号、生产后台或有支付/发布权限的页面做首轮测试；Windows 上如果装了 Interception 内核驱动，注意它只绑定内置键盘这一前提。
