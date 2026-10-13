# AutoCua/AutoCua

- 结论：**值得一试**。可以把 AutoCua 当作"给代理开放真实桌面/浏览器/手机界面权限"的可试方案：它给出了完整的 pip 安装、各平台依赖清单、run_agent 调用示例和权限配置步骤，但需要在一台可控机器上小范围验证稳定性和安全边界后再进手册。
- 原文：https://github.com/AutoCua/AutoCua
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T08:35:30.683Z

## 是什么

AutoCua 是一个开源（MIT）的"电脑使用代理"框架（Computer Use Agent），由多智能体架构驱动。它用一个统一的 `run_agent(...)` 调用，让模型驱动以下界面：

- **桌面电脑使用**（computer use）：真实鼠标键盘事件操作任意桌面应用，覆盖 macOS、Windows、Linux；
- **浏览器使用**（web use）：驱动用户自己的 Chrome（通过 AutoCua 扩展），或无人模式通过调试端口；
- **终端使用**（shell use）：让编码代理进入真实终端；
- **手机使用**（mobile use）：iOS 模拟器或通过 USB 连接的真机（仅 macOS 宿主）。

核心机制：不靠"猜像素坐标"。模型看到的是一棵元素树（操作系统无障碍树 + OCR 融合）和一张打了编号框的截图，模型只能从编号元素里选，未展示过的编号会被拒绝。桌面输入走操作系统输入层（macOS 的 `kCGHIDEventTap`、Windows 的 `SendInput` / Interception 内核驱动），不打开调试端口。

作者声明：无遥测，除所选模型提供方和用户自连的 Telegram 外不发送数据。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 通用安装（前提：Python 3.10+）

1. 安装包：

   ```bash
   pip install AutoCua
   ```

2. 在 `main.py` 中写入调用（README 称为"整个 API"），四个关键参数决定驱动对象：

   ```python
   from AutoCua.agent_launcher import run_agent

   run_agent(mode="web use", provider="openrouter", model="gemini-3.8-flash",
             task="Open wikipedia.org and summarise today's featured article.")
   ```

   `mode` 取值与含义：

   | `mode` | 驱动对象 | 运行位置 |
   |---|---|---|
   | `"computer use"` | 桌面：点击、输入、快捷键、应用、AppleScript | macOS / Windows / Linux，自动检测 |
   | `"shell use"` | 编码代理，进入真实终端 | macOS / Windows / Linux |
   | `"web use"` | 通过 AutoCua 扩展驱动用户自己的 Chrome；无人模式用调试端口 | 任何装了 Chrome 的宿主，缺 Chrome 时自动安装 |
   | `"mobile use, ios"` | 默认 iOS 模拟器，或已配对的 iPhone/iPad | macOS 宿主 |
   | `"mobile use, android"` | 尚不可用 | |

3. 运行：

   ```bash
   python main.py
   ```

4. 配置模型密钥：写入 `.env` 文件，或在桌面应用的 Settings 里粘贴。模型名来自仓库的 `model_list.txt`，**区分大小写**；不在清单里的名字会原样转发并返回 404。

5. 首次运行注意：
   - 加 `ui=True` 可打开桌面应用；首次会询问是否下载 Electron（120–160 MB，一次），拒绝则在 pywebview 打开。
   - 代理保存的一切（聊天、密钥、自定义技能、浏览器 profile）落在运行 Python 目录下的 `AutoCua_data/`。

### 各平台的前置依赖（这些 pip 装不了）

6. **Windows 上处理 UAC 提权弹窗**（可选，不做也能用，只是遇到提权提示会停住）。前提：从源码检出目录运行。

   ```bat
   setup_windows.bat
   ```

   该脚本会先询问（答 N 则不下载不安装），然后下载固定版本、校验 SHA-256、安装、**只绑定内置键盘**（不外接键盘被过滤），重启前再询问。原因：Interception 驱动是 LGPL-3.0 非商业 / 付费商业双许可，不能随 wheel 分发。

7. **Linux 上安装发行版绑定**（前提：x86_64 + GNOME 桌面，Wayland 已测，X11 未测）：

   ```bash
   sudo apt install python3-gi python3-cairo python3-gi-cairo python3-venv gir1.2-atspi-2.0 gir1.2-gtk-3.0 \
                    gir1.2-webkit2-4.1 at-spi2-core xdg-desktop-portal xdg-desktop-portal-gnome \
                    gir1.2-gstreamer-1.0 gstreamer1.0-pipewire gstreamer1.0-plugins-base \
                    libglib2.0-bin libgtk-3-bin xdg-utils
   ```

   KDE 用户把 `xdg-desktop-portal-gnome` 换成 `xdg-desktop-portal-kde`。Fedora/Arch/openSUSE 包名不同，仓库里的 `setup_linux.sh` 列了对应名称。

8. **Linux 上用虚拟环境**（前提：Ubuntu/Debian 拒绝向系统 Python pip 安装；venv 必须建在存放 `main.py` 和 `.env` 的目录里，且用发行版自带 python3，版本 3.10–3.14，否则报 "cannot import gi"）：

   ```bash
   cd my-agent                         # the folder with your main.py and .env
   python3 -m venv .venv
   source .venv/bin/activate
   pip install AutoCua
   python main.py
   ```

9. **Linux 首次 computer-use 运行**：GNOME 会请求屏幕共享同意，点 Share 前务必打开 **Allow Remote Interaction**（GNOME 默认关闭）。选择会保存在 `AutoCua_data/`。首次扫描还会下载 PP-OCRv6 模型，用于读取桌面未公开的文本。

### 从源码运行

10. 
    ```bash
    git clone https://github.com/AutoCua/AutoCua.git
    cd AutoCua
    
    bash setup_mac.sh            # macOS
    setup_windows.bat            # Windows, 自行提权，安装内核驱动前会询问
    
    cp .env.example .env         # add your provider key
    python main.py
    ```

11. 常用可选参数直接写进 `run_agent(...)`：`ui`、`save_conversation`、`speed`、`external_terminal`、`headless`、`browser_port`、`browser_profile`、`extra_tasks`、`device`、`ios_version`、`sim_device`、`app_build`、`api_key`、`os`。完整的文档在仓库的 `agent_capabilities.md`。

### 分别单独调用子代理

12. 编码代理和只读侦察代理可以独立运行（注意：它们从自己的工作目录启动，处理已有项目时要给绝对路径）：

    ```bash
    python -m AutoCua.mac.agent.coder   --task "refactor the auth module in /Users/me/projects/api" --provider anthropic --model claude-sonnet-5
    python -m AutoCua.mac.agent.minions --task "where is _validate_token defined in /Users/me/projects/api and who calls it?" --provider anthropic --model claude-sonnet-5
    ```

### iOS 使用

13. 选择模拟器或真机：
    ```python
    run_agent(
        mode="mobile use, ios",
        provider="anthropic", model="claude-sonnet-5",
        device="simulation",        # or "hardware"
        ios_version=None,           # e.g. "26.5"; None picks the newest usable runtime
        sim_d
    ```
    - `device="simulation"`（默认）：跑在 Mac 上的 iOS 模拟器，用 `xcrun simctl` + 一次**未签名**的 `xcodebuild test`；需要完整 Xcode，**不需要 Apple ID、签名或配对**；可用 `app_build="MyApp-Simulator.ipa"` 预设安装自己的构建。
    - `device="hardware"`：已配对的 iPhone/iPad，通过 pymobiledevice3 + USB 转发 + XCUITest 启动；需要一次性配对和 Team ID 签名；**不支持** `app_build`，传了会直接报错停止。
    - 首次运行 `"mobile use, ios"` 会自动克隆 WebDriverAgent，需要完整 Xcode 和 git，无需手工操作。

## 对应的研究问题

**1. 能力发现**：README 展示了超出"聊天"的界面操作能力——真实桌面应用点击/输入/快捷键、AppleScript、终端编码代理、浏览器端到端购物与检索、iOS 手机点击滑动输入。视频示例声称：一次航班搜索 6.1 秒（fast 模式）；一次运行不足一分钟完成三件事（iPhone 18 Pro 加入 Apple 购物袋、保护壳加入 Amazon 购物车、Google Sheet 写 Meta 五年财务数据）。

**2. 任务匹配**：给出了明确的模式选择表（computer use / shell use / web use / mobile use），并说明不同模式的驱动方式与宿主要求。浏览器模式区分 fast 与 quality 两档。对编码类任务给出 coder agent + minions 的分工，minions 用于保持主代理上下文小。

**3. 条件供给**：文档写得很具体——模型 provider 与区分大小写的模型名清单、`.env` 密钥、Windows 内核驱动（UAC）、Linux 的 AT-SPI/GTK/portal 包、GNOME 屏幕共享同意（须手动打开 Allow Remote Interaction）、Xcode（iOS）、数据目录 `AutoCua_data/`。权限方面强调浏览器模式复用用户已登录的 Chrome profile，因此自带登录态；无人模式用按名字持久化的 profile。

**4. 主动推进**：具备多智能体层次结构（父代理、coder agent、只读 minions），父代理可委派后继续或阻塞等待结果；有 `todo_list` / `update_todo` / `scratchpad` / `wait` / `done` 等状态工具；有上下文压缩代理在运行中拼接交接摘要，避免长任务撞上下文上限死亡；支持并行运行任务（README 有 "Running tasks in parallel" 一节），并行代理固定在一个标签页时可获得 15 个工具。另有 Telegram 远程控制一节。事件/时间触发式的调度细节在截断文本中未出现。

**5. 效果验证**：coder agent 的操作流程内置 VERIFY，且要求"任何含逻辑的改动都要在 `./.AutoCua_verify/` 下写一次性测试并真正运行、记录输出、退出前删除"；`replace` 写入前后各校验一次，行号过期会报 "mismatch at line X"。除此之外，效果验证更多依赖用户自己定义的任务完成信号（`done`），文档未提供系统性的效果度量方法。

## 与已有做法的关系

清单中相关条目为 Cline（watch）与 Cursor（watch），二者都是编码/IDE 侧的代理工具。AutoCua 的差异在于：它把代理的操控面扩展到操作系统桌面、用户自己的浏览器和真实手机，同时包含一个走真实终端、带 EXPLORE/PLAN/EXECUTE/VERIFY 流程的编码代理（与 Cline、Cursor 的功能区间部分重叠）。因此它更适合作为"把编码代理之外的界面权限也交给代理"这一方向的参考实现，而不是替代 Cline/Cursor 的编码工具。

## 证据与局限

**原文给出的具体证据**：
- 安装与调用命令、平台依赖包清单、run_agent 参数表、子代理独立运行命令，均为可复制的具体步骤。
- 若干性能数字：macOS OCR 从 1x 逻辑分辨率识别把 2940 px 截图从 1.17 s 降到 0.78 s 且命中率无损；OCR 置信度下限 0.4；Windows UIA 一次缓存往返取 18 个属性；截图缩放至 1920×1080 以内，13 px 品红标签 + 2 px 黑边，4:4:4 JPEG quality 85；元素可见度低于 1% 丢弃；拖拽为 20 个 15 ms 插值移动事件；AppleScript 上限 30 秒；权限对话框检测 1 秒轮询、8 秒超时；浏览器结算等待 150 ms 静默、上限 3 秒；编号最多 300 个元素；工具结果预算 200 行 / 15,000 字符等。
- 示例耗时：航班搜索 6.1 秒；一次运行不到一分钟完成三个购物/数据任务。

**仅属作者主张、无独立验证**："No telemetry"、"No context wall"、"不在页面注入 JavaScript"（除 `run_script`/`scrape` 两个明确例外）、"普通应用看到的事件与真实鼠标相同"、稳定性与安全性声明。示例视频和耗时未提供可复现的实验方法。

**适用条件与风险**：
- Linux 仅测过 GNOME + Wayland（Ubuntu），X11 未测；需要发行版包而非 pip 能装的依赖。
- Windows UAC 处理需要手动安装第三方内核驱动，且涉及 LGPL/商业双许可；不装也能用，但遇提权会中断。
- iOS 真机模式需要签名与配对，且不支持 `app_build`。
- 浏览器模式会复用用户已登录的 Chrome，具备真实身份与权限——这既是优势也是风险；页面上的 "AutoCua started debugging this browser" 提示条可取消。
- 页面上的"agent 正在驱动"覆盖层（边缘辉光 + 光标）会被检测该痕迹的网站发现，作者自承这是产品取舍。
- `run_script` 与 `scrape` 是页内 JS 的两个入口，虽有 guardrails（仅网页、拒绝窃取与跨站发送、结果中剥离凭据形值），但仍是有意开放的例外。
- 原文被截断（iOS 配置段落在 `sim_d` 处中止），后文关于内存/vault/技能、并行运行、桌面应用、远程控制、Provider 与模型、限制与安全、项目布局、路线图等小节只有标题，内容不可见。因此上述涉及这些主题的判断仅依据目录标题和前言概述，未得到细则支持。
- 仓库 stars 约 100，属于小规模项目，成熟度与长期维护需自行评估。

## 怎么试、怎么验证

**最小试用方式（建议在一台专门的测试机上做，不要直接用主力机的主账号）**：

1. 选一个最窄的场景起步：只试 `"web use"`，任务设为一次性可核对的公开操作，例如 README 里的示例：
   ```python
   run_agent(mode="web use", provider="openrouter", model="gemini-3.8-flash",
             task="Open wikipedia.org and summarise today's featured article.")
   ```
   先用 fast 模式跑 5–10 次，记录是否每次都返回正确摘要。

2. 通过后再试 `"computer use"` 的单步任务（如 README 示例"检查 macOS 版本"），验证无障碍树读取、编号点击、权限对话框自动处理是否生效。

3. 再试一个多步端到端任务（如"搜索某航班并记录结果"），观察是否触发上下文压缩、是否中途卡在登录墙或权限弹窗。

4. 若有 Windows 环境，先不装 Interception 驱动跑一轮，确认"没有它一切模式仍可用，只是 UAC 处会停"这一说法；确认后再决定是否安装驱动。

5. 若试编码代理，用它给出的 coder 调用方式指向一个**副本**仓库（不要指向重要仓库），检查它是否真的按 VERIFY 流程生成并运行 `./.AutoCua_verify/` 下的测试。

**判断有没有改善的指标**：

- 任务成功率：同一任务重复 N 次（建议 ≥10），记录完成次数。
- 人工介入次数：每次运行中需要人接管（取消 chrome 提示条、点权限弹窗、纠正错误点击）的次数，越少越好。
- 耗时：对照 README 声称的量级（6.1 秒航班搜索、一分钟内三任务）看实际差多少；fast 与 quality 两档分别测。
- 错误类型分布：是选错元素、卡在登录墙、卡在权限弹窗，还是上下文超限中断——这四类分别计数，用来判断哪些步骤需要提前供给信息或权限。
- 数据外泄检查：在测试机上用抓包或防火墙确认除所选模型 provider 外没有出站流量，验证 "No telemetry" 主张；同时确认代理操作的是测试账号而非真实账号。
- 编码代理场景：统计它生成的验证测试是否被发现真问题（而非只做形式检查），以及 `replace` 是否出现过 "mismatch at line X" 从而避免了文件损坏。
