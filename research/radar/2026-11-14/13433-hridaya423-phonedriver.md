# hridaya423/phonedriver

- 结论：**值得一试**。建议小范围试：用 phonedriver 把“真机手机操作”这类工作交给编码智能体，适合移动端回归、竞品/自有 App 走查、设备设置类杂活；因为它给出了可直接复制的安装、MCP 配置、读屏-按编号点击的稳定交互，以及付款前的人工审批闸门，但项目处于 0.1.x、性能数据来自作者自建测试集，需自己复测后再决定是否写进手册主流程。
- 原文：https://github.com/hridaya423/phonedriver
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-14T09:55:16.608Z

## 是什么

phonedriver 是一个标准 MCP server（stdio）兼 CLI，让 Claude Code、Codex、Cursor、VS Code 等任意 MCP 客户端“拿到一台手机”：可以读取 Android 手机/模拟器或 iPhone/iPad/iOS 模拟器的屏幕，并按元素编号点击、输入、滑动、启动 App。

关键设计有三点：

1. **屏幕以文本编号列表给模型**，模型按 `@eN` 点击，不需要看图也不需要猜坐标；点击后只回传变化行（`+` 新增、`-` 消失、`~` 变化），且自动等屏幕“停止变化”后再返回，模型不必轮询或猜加载时间。
2. **敏感动作有人工闸门**：当点击落在 Pay / Buy now / Buy with GPay / Place order / Start subscription / Transfer / Delete account 这类按钮上时，phonedriver 会挂起这次点击，在客户端自己的提示框里问你，模型看不到这个问题也答不了。
3. **密码/验证码字段禁止明文输入**：模型对密码框或一次性验证码框直接 type 会报错，必须走 `secret` 通道，内容不进日志与 trace。

实现上：Android 通过 adb 推一个 Java helper（走 UiAutomation 读无障碍树，并用 H.264 流判断画面是否稳定），iOS 通过一个 XCTest runner 做同样的事；本机有个常驻 daemon 维护连接并记住 `@e` 编号与元素的对应关系，MCP server 与 CLI 都是它的瘦客户端。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**第 1 步：注册 MCP server（前提：本机有 Node/npx）**

Claude Code：

```sh
claude mcp add phonedriver -- npx -y phonedriver mcp
```

或用 Homebrew 装二进制再注册：

```sh
brew install hridaya423/tap/phonedriver
claude mcp add phonedriver -- phonedriver mcp
```

或以插件方式安装（插件同时装 server 和它的 skill）：

```sh
claude plugin marketplace add hridaya423/phonedriver && claude plugin install phonedriver@phonedriver   # Claude Code
codex plugin marketplace add hridaya423/phonedriver && codex plugin add phonedriver@phonedriver         # Codex
```

⚠️ 原文明确：插件方式和 `mcp add` 二选一，否则工具会被列两遍。

其他客户端用同一条 MCP 配置项：

```sh
codex mcp add phonedriver -- npx -y phonedriver mcp      # Codex
code --add-mcp '{"name":"phonedriver","command":"npx","args":["-y","phonedriver","mcp"]}'   # VS Code
```

```json
{
  "mcpServers": {
    "phonedriver": { "command": "npx", "args": ["-y", "phonedriver", "mcp"] }
  }
}
```

**第 2 步：准备设备（前提：按机型选一种）**

| 手机 | 需要什么 |
|---|---|
| Android 模拟器 | adb |
| Android 手机/平板 | adb + 打开 USB 调试 |
| iOS 模拟器 | 一台装了 Xcode 的 Mac |
| iPhone/iPad | Mac + Xcode + Apple 开发证书 |

Android 侧不用装 App，连接时 phonedriver 自己经 adb 推 helper。真机 iPhone 插线后：

```sh
phonedriver ios setup
```

它从证书里读签名 team、检查手机、编译并安装、启动 runner，不需要你去查 team ID。

**第 3 步：自检（前提：设备已连接）**

```sh
phonedriver doctor
```

检查 adb、Xcode 和每一台设备，并告诉你该修什么。然后用 `phonedriver devices` 列出设备 id。

**第 4 步：多设备时锁定目标设备**（在 MCP 配置里加 env）

```json
{ "env": { "PHONEDRIVER_DEVICE": "android:emulator-5554" } }
```

**第 5 步：先跑只读观察，确认读屏质量**

```sh
phonedriver snapshot
```

输出形如：

```console
app com.android.settings (Settings) · keyboard hidden · settled in 0ms
@e1 button "Search Settings"
@e2 group scrollable↓
  @e3 button "Google" "Services & preferences"
  @e4 button "Network & internet" "Mobile, Wi‑Fi, hotspot"
  @e5 button "Connected devices" "Bluetooth, pairing"
  ...
  @e10 button "Display & touch" "Dark theme, font size, touch"
```

**第 6 步：按编号操作，并读差分回执**

```sh
phonedriver tap @e24
```

```console
ok tapped @e24 "Dark theme" at 353,532 · settled in 2034ms
~ @e23 button "Dark theme" "Will turn on when Bedtime starts" → "Will never turn off automatically"
~ @e24 switch "Dark theme" off → on
```

**第 7 步：教模型一次点整条路径**（模型默认一步一步点，必须显式要求）

```sh
phonedriver skill
```

把打印出来的 skill 给 agent，让它改用路径式点击：

```json
tap {"target":"More options","then":["Settings","Dark theme"]}
```

**第 8 步：配置审批范围（前提：想放开或收紧闸门）**

默认只问“付款”和“删除账户”。要扩大询问范围：

```
PHONEDRIVER_ASK=send,delete
```

可选值：`send`（Send/Reply/Post/Share）、`delete`（Delete/Remove/Clear all）、`install`（Install/Uninstall）。完全关闭检查：

```
PHONEDRIVER_GUARD=off
```

或让 agent 在自己指令里声明 `autonomous: true` 自主运行。

**第 9 步（Android 13+）：让 agent 在隐藏的第二屏上干活，不占你的屏幕**

```
PHONEDRIVER_DISPLAY=hidden
```

或 CLI 加 `--display hidden`。注意：往 App 自己的输入框里打字在你屏幕上不留痕；往网页里打字会弹系统剪贴板提示，之后剪贴板会被还原。

**第 10 步：长时间任务用无线，摆脱线缆**

```sh
phonedriver ios wifi on     # iPhone，之后可拔线，同一 Wi‑Fi 下仍在 phonedriver devices 里
phonedriver pair            # Android
phonedriver untether
```

**第 11 步：交给 agent 的任务写法（原文给的三条示例，可直接改）**

> Order me a large pepperoni pizza from the Domino's nearest Leicester Square, for collection.

> Open my app, sign up with a new account, and tell me every bug you find on the way. Give me steps to reproduce each one.

> Go through my app's onboarding in dark mode and in light mode, and show me every screen where the text is hard to read.

**可用工具清单（14 个）**：`devices`、`apps`、`snapshot`、`screenshot`、`tap`、`type`、`swipe`、`scroll`、`press`、`launch`、`wait`、`batch`、`clipboard`、`shell`。其中 `snapshot`、`screenshot`、`wait` 标记为只读，客户端可以不弹权限提示直接跑。CLI 命令与之一一对应，适合脚本或偏好 shell 的 agent。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**

原文用九个“只有手机能做的事”划出了边界，其中几个明显是多数人不会想到交给 agent 的：改 Chrome 的搜索引擎、裁剪照片、置顶和归档 Messages 会话、找出让手机一直不睡的应用、跑注册流程并记录植入的 bug。这些都是原本必须人用手指在真机上完成的操作。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**

- 客户端：Claude Code（作者主力测试环境）、Codex、Cursor、VS Code、GitHub Copilot、Gemini CLI、Windsurf、Zed、Cline、opencode 均被列为可用（多为徽章级声明，具体步骤只给了 Claude Code / Codex / VS Code / 通用 JSON）。
- 交互形态匹配：读屏优先用文本快照，只有真需要看画面才 `screenshot`；点击优先路径式而非逐步式（需给 skill）；脚本化场景走 CLI 而非 MCP。
- 权限匹配：只读工具（snapshot/screenshot/wait）免提示，写操作走客户端权限流。
- 安全匹配：密码/验证码强制走 `secret` 而非 `type`；支付/删除类点击强制回人。
- 隐私匹配：Android 13+ 可用隐藏屏，agent 干活不占用户屏幕。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**

- 工具/环境：adb（Android）、Xcode + Apple 开发证书（iOS 真机）、Node/npx 或 Homebrew。
- 权限：Android 的 USB 调试开关；iOS 的签名 team（`phonedriver ios setup` 自动读取）。
- 配置：MCP 注册项、`PHONEDRIVER_DEVICE`（多设备）、`PHONEDRIVER_DISPLAY`、`PHONEDRIVER_ASK`、`PHONEDRIVER_GUARD`。
- 反馈闭环：每次操作后自动返回“已稳定”的时间戳与屏幕差分，这正是 agent 判断下一步所需的最小反馈；30 秒空闲后设备从终端会话移交给 agent。
- 网络条件不足时自动降级：远距离/隧道/移动网络下发送更小的屏幕流和压缩的屏幕树（3G 整形链路上模拟器点击中位数 1.4s，原为 2.8s）。
- 无遥测：首次从 GitHub 下载后只连你自己的设备，测试里整个工具跑在阻断其他连接的沙箱中。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**

原文提供的“持续完成”机制是**状态触发**而非时间触发：`tap` 后自动等 `settled`（示例中 2034ms）才算完成，`wait` 工具可等待某个状态，`batch` 可批量下发，一次调用可点整条路径（`then: [...]`）。这支持“跑完一整条多步流程不用人管”。原文**没有**提供 cron/定时/外部事件触发的调度能力，也没有长驻任务队列，这部分不能过度解读。

**5. 效果验证：怎样判断确实改善了结果**

原文最关键的方法论是：**用脚本检查手机自身的数据，而不是读模型的自述报告**。九任务基准的通过率、token、耗时都是这么统计的，且每个任务跑两次、版本与检查项公开在 `docs/bench/jobs.md`。速度对比用中位数 50 次。这为“怎么验证”提供了一个可照搬的范式：断言落在设备/系统的真实状态上。

## 与已有做法的关系

清单中相关条目：Claude Code（adopt）、Cline（watch）、Cursor（watch）、GitHub Copilot（drop）、OpenCode（watch）。

- phonedriver 与这些**不是替代关系，而是扩展关系**：它是 MCP server，接入上述客户端后为其增加“操作手机”这一能力面。原文主力验证环境就是 Claude Code（demo 用 Claude Code + Opus 跑 dominos.co.uk 下单）。
- Cursor、Cline、opencode 在 README 中被列为支持（徽章 + 通用 MCP JSON 配置），可照通用配置接入。
- GitHub Copilot 在清单中为 drop，README 里仅出现在支持徽章中、未给单独步骤，不构成重新评估该条目的依据。
- 与清单中通用 MCP 客户端相比，phonedriver 补的是“设备侧执行”这一类工作，而不是再一个代码助手。

## 证据与局限

**原文给出的数据/案例**

- 九任务基准（2026-11-10，同一台 Android 模拟器，Claude Sonnet 5.5）：phonedriver 27/27 通过、658k token、5.1 分钟；mobile-mcp 17/18、4.6M token、8.7 分钟；phone-harness 14/18、1.1M token、22.7 分钟。宣称 token 少 6.9x。
- 速度（2026-11-11，phonedriver 0.1.1，Android 17 模拟器，50 次中位数，对比 `adb shell uiautomator dump`/`screencap`/`input`）：读屏 13ms vs 2164ms（170x）；截图 9ms vs 291ms（32x）；输入 100 字符 158ms vs 3638ms（23x）；点击+看变化 514ms vs 2477ms（4.8x）。真机 HONOR X8（Android 13）：读屏 78.5ms vs 2507ms，截图 16ms vs 1006ms。
- 单次点击本身：Android 模拟器 29–39ms，真机 iPhone 450–530ms（与 514ms 的口径差异原文已说明）。
- Demo：一次真实的 Claude Code 会话在 Android 模拟器上走 dominos.co.uk，找店、填购物车和访客结账、点 Buy with GPay，被闸门拦下、人拒绝、未产生订单；全程 6.5 分钟。
- 3G 整形链路：模拟器点击中位数从 2.8s 降到 1.4s。

**哪些只是作者主张**

- “6.9x fewer tokens” 是作者自建测试集（原文自述 “This is my own test set”），单一模拟器、单一模型、每任务 2 次，样本小；作者公开了方法并欢迎对手开 issue 要求重跑，但这仍是自评。
- 速度倍数是与 adb 原始命令的对比，不代表与所有同类 MCP 方案的对比。
- README 中的日期（2026 年）与模型名（Opus 5.5 / Sonnet 5.5）与常见版本序列不一致，引用这些数字时应标注来源为 README 原文，不宜当作已复核事实。

**适用条件与已知局限（原文自陈）**

- 测试覆盖：Android 模拟器 API 26 与 37、HONOR X8（Android 13）、iOS 模拟器、iPhone 13 Pro Max、iPhone 14 Plus、iPad Pro；其他 Android 机型“走同一条路径”，属推断。
- 版本很早期（0.1.1–0.1.3），单维护者，45 stars；0.1.3 需手动把自动锁屏设为 Never。
- 审批闸门只认 11 种语言的按钮文案（英、西、葡、法、德、意、荷、日、中简、韩、印地），**纯图标按钮和未覆盖语言会漏检**。
- 无法输入锁屏密码，也无法通过 Face ID / 指纹；锁屏状态命令直接停下。
- 部分银行类防截屏应用截图全黑（文本仍可读）。
- 模型在手机上能做到你能用手指做到的任何事——无人值守必须用模拟器或备用机。
- iOS 真机依赖 Mac + Xcode + 开发证书，Windows/Linux 只能走 Android。
- 许可证 AGPL-3.0：自用自由，但改造后作为网络服务提供给他人必须公开改动；二进制用自编译 OpenH264，**不附带 H.264 专利许可**（Cisco 的专利许可只覆盖 Cisco 分发的二进制），商用分发前需法务确认。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 起一台 Android 模拟器（API 26+），开 adb。**用模拟器或备用机，不要用主力机**。
2. `claude mcp add phonedriver -- npx -y phonedriver mcp`，然后 `phonedriver doctor` 跑到全绿。
3. 跑一个纯只读任务验证读屏质量：让 agent“打开设置，报告深色模式当前状态，并截图”。看它是否需要猜坐标、是否误读控件。
4. 跑一个多步任务：你自己装一个测试 App，让它走一遍 onboarding（浅色 + 深色各一次），列出文字对比度不足的页面。
5. 加 `PHONEDRIVER_ASK=send,delete`，故意让它触发一次发送/删除动作，确认闸门真的挡住、模型真的不知道你在提示框里选了什么。
6. 可选：对比一次路径式点击（给 skill）与逐步点击的 token 与耗时差异，验证 skill 是否值得常驻。

**判断有没有改善的指标**

| 指标 | 怎么量 | 基线 |
|---|---|---|
| 任务成功率 | 同一任务跑 3 次，用脚本检查手机自身状态（而非模型自述）判定通过 | 手工做的耗时/是否漏检 |
| token 消耗 | 客户端 usage 统计 | 同任务手工指引 + adb 脚本 |
| 端到端耗时 | 从下指令到设备状态达成 | 人工操作计时 |
| 人工干预次数 | 除审批弹窗外的打断次数 | 越少越好；但审批次数不应为 0 |
| 越权/误触 | 闸门拦截次数 vs 实际危险操作次数 | 必须相等 |
| 差分信息充分性 | agent 是否因信息不足而额外截图/重试 | 重试率下降 |

**红线**：先在模拟器/备用机上跑；接入真实支付、真实账号前先确认 `PHONEDRIVER_GUARD` 未被关掉、`PHONEDRIVER_ASK` 至少含 `send,delete`；不要把生产密码交给它，密码/验证码只走 `secret` 通道。

**决定是否升级为 adopt 的条件**：在你们自己的机型与 App 上复现出接近原文的通过率与 token 优势，且闸门在目标语言/图标按钮场景下不漏拦——满足这两条再写进手册主流程，否则保留为 try 并注明“仅限模拟器 + 只读/低风险任务”。
