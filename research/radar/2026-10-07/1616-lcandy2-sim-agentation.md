# lcandy2/sim-agentation

- 结论：**值得一试**。在 Apple Silicon Mac + Xcode 26 的 iOS 项目上小范围试：先让编码智能体按 SETUP.md 装好，用 Design Mode 对运行中的模拟器提一批真实 UI 批注，经 MCP 交给 Claude Code，看它能否不经人工补充就定位到正确文件与代码行。README 给出了可照抄的安装命令、MCP 接入命令、SDK 代码片段和配置项，但依赖 Xcode 私有框架、只支持单一开发环境、项目仅 34 stars，不适合直接定为团队标准流程。
- 原文：https://github.com/lcandy2/sim-agentation
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T17:35:16.718Z

## 是什么

SimAgentation 是一个本地工具（单 Swift 二进制 + Svelte 网页 UI），把“在 iOS 模拟器上看 UI、口述问题”变成结构化批注：在浏览器里冻结模拟器画面，点击某个元素或框选一块区域，写下应该改成什么；编码智能体通过 MCP 拿到该元素的 accessibility 树信息、它所在的屏幕、可用于搜索源码的字符串，以及两张截图（整屏带红框、框选区特写）。

它自称是 iOS 版的 Agentation。被测 app 无需集成任何 SDK——信息全部来自模拟器的 accessibility tree，因此对任意已启动模拟器上的任意 app（包括 Apple 自带 app）都可用。可选 SDK `SimAgentationPlus` 用于自家 app，换取精确选中和源码文件/行号。

注意：原生侧使用 Xcode 的私有框架 CoreSimulator、SimulatorKit、AccessibilityPlatformTranslation，Xcode 新版可能使其失效直到项目跟进。

## 具体做法

前提：Apple Silicon 上的 macOS + Xcode 26（要 iPhone Duo 需 Xcode 27.1）。从源码构建还需要 Node 和 pnpm。

### 路径 A：让智能体自己装（最省事）

1. 在 Claude Code / Codex / Cursor 等编码智能体里粘贴 README 提供的提示词，让它按 SETUP.md 走完安装：

```
Set up SimAgentation for me by following https://github.com/lcandy2/sim-agentation/raw/refs/heads/main/SETUP.md
```

### 路径 B：Homebrew 独立安装

2. 安装并启动：

```sh
brew install lcandy2/tap/sim-agentation
sim-agentation serve --open
```

3. 想让它常驻后台则改用：

```sh
brew services start sim-agentation
```

### 路径 C：从源码构建

4. 在仓库目录执行（`pnpm build` 先构建 UI 到 `app/web/dist`，再构建 Swift 二进制）：

```sh
pnpm install
pnpm build    # the UI into app/web/dist, then the Swift binary
pnpm start    # app/host/.build/debug/sim-agentation serve --open
```

5. 开发时想在改动后免刷新，另开 `pnpm dev`：页面在 38470 加载 Vite dev server（38472）上的 UI。

6. 页面默认开在 http://localhost:38470。左侧选一个模拟器，未运行的会显示 **Start**，不按不会启动。

### 提一条批注（Design Mode）

7. 按 `⇧⌘D` 进入 Design Mode，画面冻结、accessibility tree 加载。
8. 悬停查看元素；`↑` 选父元素，`↓` 退回。
9. 点击一个元素，或在任意区域拖框。按住 Shift 追加到选择集，一条批注覆盖全部。
10. 写下应该改成什么，按 Return 提交（⇧Return 换行）。批注出现在右侧 inspector，在屏幕上显示编号；点编号可重新打开修改备注，或改绑到别的元素。
11. 按 Esc 丢弃选择，再按一次回到实时画面。
12. 没有 MCP 的智能体：在批注标签页点 **Copy**，把所有待处理批注以 Markdown 复制到剪贴板，粘到任何地方。

### 接上智能体

13. 用插件（Claude Code / Codex / Cursor；插件同时带来 MCP server 和两个 skill）：

```sh
# Claude Code
/plugin marketplace add lcandy2/sim-agentation
/plugin install sim-agentation@sim-agentation

# Codex
codex plugin marketplace add https://github.com/lcandy2/sim-agentation.git
codex plugin add sim-agentation@sim-agentation
```

Cursor 则按 Cursor 官方插件文档把该仓库作为插件添加。插件首次启动 MCP server 时会下载与插件版本匹配的 SimAgentation release（约 2 MB）、用 release 的 SHA-256 校验并缓存到 `~/Library/Caches/sim-agentation`；已装同版本（如 Homebrew 版）会直接复用，`SIM_AGENTATION_BIN` 可指向自建版本。server 未运行时也会把页面起在 38470。

14. 或用 skills CLI 单独装两个 skill（`sim-agentation` 教它如何处理批注，`sim-agentation-sdk` 教它给 app 接 SDK）：

```sh
npx skills add lcandy2/sim-agentation                          # both skills
npx skills add lcandy2/sim-agentation --skill sim-agentation   # one of them
npx skills add lcandy2/sim-agentation -a claude-code -a codex  # for these agents only
```

15. 只装 MCP server（任何支持 stdio MCP 的客户端同理）：

```sh
claude mcp add sim-agentation -- sim-agentation mcp
codex mcp add sim-agentation -- sim-agentation mcp
```

源码构建时命令为 `/path/to/Sim-Agentation/app/host/.build/debug/sim-agentation mcp`。

16. 想让批注“一发就落进会话”（含空闲会话，不需要 `sim_watch` 轮询），在 Claude Code 里把它作为 channel 加载：

```sh
claude --dangerously-load-development-channels server:sim-agentation
claude --resume <session> --dangerously-load-development-channels server:sim-agentation
```

前提：channels 是 Claude Code research preview，未被 Anthropic 加入 allowlist 前必须带这个 flag 并在启动时确认，且需要 claude.ai 登录或 Console API key；不带 flag 推送会被丢弃，工具仍照常可用。多个会话收到同一条批注时，最先 acknowledge 的接管，其余被告知让开。

17. 智能体可用的七个 MCP 工具：`sim_get_pending`（待处理批注，含元素信息和截图路径）、`sim_get_all`（含已完成）、`sim_watch`（等待你新增批注后返回待处理列表）、`sim_acknowledge`（标记为进行中，仅本会话可见）、`sim_resolve`（带摘要标记为已修复）、`sim_dismiss`（带理由拒绝）、`sim_reply`（在批注上留言）。状态变化和回复会显示在浏览器 inspector 里。

### 可选：给自家 app 接 SDK

18. 在 Xcode 选 **File > Add Package Dependencies**，输入 `https://github.com/lcandy2/sim-agentation`，把包内唯一库 SimAgentationPlus 加到 app target；或在 `Package.swift` 里：

```swift
.package(url: "https://github.com/lcandy2/sim-agentation", from: "0.2.1"),
// in your target's dependencies:
.product(name: "SimAgentationPlus", package: "sim-agentation"),
```

19. 启动一次并标记想被找到的视图（Release 构建下全部编译掉）：

```swift
import SimAgentationPlus

RootView()
    .simAgentation()      // starts a local inspector on 127.0.0.1:38471 (Debug only)

ShowRow(show: show)
    .simTag()             // selectable as ShowRow, from ContentView.swift:34
```

UIKit 无需标记也可按类名选中，标记后额外带源码位置：

```swift
let card = TicketCardView(show: show).simTag()   // TicketCardView, from TicketViewController.swift:21
```

接了 SDK 后父级来自真实 view/layer 树而非像素，背景与页面差异极小也能选中；每条批注还会带 bundle ID、`Source` 行（文件与行号）、所属 view controller、以及框选区周围 app 自定义的 view 类。批注时按 `S` 或点 **SDK** 可与纯像素兜底结果对比。

### 配置项

| 变量 | 默认值 |
|---|---|
| `SIM_AGENTATION_PORT` | `38470` |
| `SIM_AGENTATION_HOME` | 临时目录下的 `sim-agentation`：批注及其截图，能跨 host 重启保留，但不跨 Mac 重启 |
| `SIM_AGENTATION_WEB` | 仓库的 `app/web/` 目录（UI） |
| `SIM_AGENTATION_SDK_URL` | `http://127.0.0.1:38471` |

渲染好的设备外壳缓存在 `~/Library/Caches/sim-agentation`。

### 常用快捷键

| 按键 | 作用 |
|---|---|
| ⇧⌘D | 进出 Design Mode |
| `A`, `I` | Design Mode、Interact |
| ↑ ↓ | 父元素与退回（Design Mode） |
| ↩ | 添加备注（⇧↩ 换行） |
| Esc | 丢弃选择，再按离开 Design Mode |
| `S` | 对比 SDK 视图树与像素兜底 |
| ⌘S, ⌘R, ⌃⌘C | 保存 / 录屏 / 复制屏幕 |
| ⇧⌘H, ⌘L | Home、锁屏 |
| ⌘← ⌘→ | 左右旋转 |
| ⌘↑ ⌘↓ | 音量加减 |
| ⌘=, ⌘-, ⌘4 | 放大、缩小、适应 |

Simulator.app 其余快捷键（shake、appearance、文字大小、Face ID）同样可用。

## 对应的研究问题

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**
把“看截图、用自然语言描述 UI 哪里不对”这一步交给智能体：批注会附带元素 accessibility 信息、所在屏幕、可用于源码搜索的字符串和两张截图，智能体据此直接定位并修改源码。另外还覆盖了模拟器本身的运维动作（创建/启动/重命名/重置/删除、Home、锁屏、旋转、音量、录屏），这些原本不常被当成可托付给智能体的事。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
匹配的是“移动端 UI 走查 → 改代码”这条链路，且要求客户端支持 MCP（Claude Code、Codex、Cursor 有现成插件路径）或至少能接收粘贴的 Markdown。三种协作方式有明确分工：`sim_watch` 适合智能体主动取件；channel 适合“你一发批注就落进正在跑或空闲的会话”的推送式；无 MCP 时用 **Copy** 复制 Markdown 手工粘贴。多会话并发有先 ack 先得的仲裁规则。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
环境条件：Apple Silicon macOS + Xcode 26（iPhone Duo 需 27.1）。工具条件：MCP server + 两个 skill（一个教处理批注、一个教接 SDK）是让智能体干好活的关键供给；插件会自行下载并校验二进制，`SIM_AGENTATION_BIN` 可改指向。信息条件：无 SDK 时智能体只能靠批注里的字符串搜索源码；接 SDK 后可拿到 bundle ID、文件与行号、所属 view controller 和周边 view 类，`S` 键可校验。权限条件：channel 模式需要 claude.ai 登录或 Console API key，且未被 allowlist 时要带 flag 并确认。反馈回路：`sim_reply` / `sim_resolve` / `sim_dismiss` 会把状态和留言显示回浏览器 inspector。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
`sim_watch` 是事件触发：阻塞等待直到你新增批注，然后返回待处理列表。Claude Code 的 channel 更进一步，批注在你发送时直接推入运行中甚至空闲的会话，无需轮询。多会话场景下，第一条被 ack 的批注由该会话接手，其他会话被通知退出，避免重复劳动。README 未描述基于时间或状态持续巡检的能力。

**5. 效果验证：怎样判断确实改善了结果**
README 没有给出“用了以后开发效率/改动正确率提升多少”的任何数据，也没有验证方法。能用于间接校验的只有：批注时按 `S` 对比 SDK 视图树与像素兜底，确认选中的元素是否正确；`sim_resolve` / `sim_dismiss` 的状态流转可在 inspector 里回看。真正的工作改善指标需要自行建立（见末节）。文中给出的 60 fps、3–8 Mbit/s、JPEG 约 85 Mbit/s 等数字是流媒体性能，与工作结果改善无关。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：本文把它当作主要承载端，给出了 `claude mcp add sim-agentation -- sim-agentation mcp` 的接入命令，以及 research preview 的 channel 用法 `claude --dangerously-load-development-channels server:sim-agentation`。这是清单里 Claude Code 条目在“本地 GUI 工具 → 会话”方向上的一个新增用法。
- **Agent skills（清单状态 adopt）**：本文给出用 `npx skills add <repo> [--skill X] [-a claude-code -a codex]` 装两个 skill 的具体形态，可作为“给智能体补一段可复用流程”的实例参照。
- **Cursor（清单状态 watch）**：README 说 Cursor 也走插件方式，但只给了指向 Cursor 官方插件文档的链接，没有可复制命令。
- **Cline（清单状态 watch）**：README 全文未提及。

## 证据与局限

**原文给出的具体证据**
- 完整可复制的安装路径（Homebrew、源码构建）、agent 插件市场命令、`npx skills add` 命令、MCP 注册命令、channel 启动命令。
- 七个 MCP 工具的名称与职责表；Design Mode 的五步操作流程与完整快捷键表；四个配置环境变量及默认值；SDK 的 Swift 依赖声明与两段示例代码。
- 代码来源与许可证写明：`app/host/Sources/SimBridge` 改编自 tddworks 的 baguette（Apache 2.0），折叠屏支持同样来源；折叠屏 HID 事件与 guest helper 在 `app/host/Guest/HingeControl`；accessibility 子节点恢复改编自 LY Corporation 的 sim-use；stale accessibility bridge 重启参考 facebook/idb。项目本身 Apache 2.0。
- 仓库结构表说明了各目录职责，便于按需阅读源码。

**只是作者主张、无第三方验证**
- “对任意 app 都可用（因为数据来自 accessibility tree）”“Design Mode 在弯折屏幕上也能用”等表述是作者自述。
- 流媒体的 60 fps、3–8 Mbit/s、JPEG 约 85 Mbit/s、Auto 自适应策略（先降码率、再折半分辨率、再降到 30 fps，隐藏标签页 5 fps）等，README 未给测试方法或对比数据。
- 项目仅 34 stars，无用户案例、无效果数据。

**适用条件与硬限制**
- 只有 Apple Silicon 上的 macOS + Xcode 26（iPhone Duo 需 27.1）；其他平台/环境完全不可用。
- 原生侧依赖 Xcode 私有框架 CoreSimulator、SimulatorKit、AccessibilityPlatformTranslation，作者明说新 Xcode 发布可能使其失效直到更新。
- 无 SDK 时无法知道 view 来自哪个源文件，智能体只能拿标签和标识符去搜源码。
- 无 accessibility 数据的内容（如自绘 Canvas 或 Metal）只能框选。
- Claude Code channels 是 research preview，未进 allowlist 前需要危险 flag 加启动确认，且需要 claude.ai 登录或 Console API key。
- Homebrew 公式、插件、skill 都指向 `lcandy2` 个人命名空间，供应链信任需自行评估。

## 怎么试、怎么验证

**最小试用（半天内可完成）**
1. 在一台 Apple Silicon Mac + Xcode 26 上，让 Claude Code 按 README 顶部提示词走 SETUP.md 完成安装（或直接 `brew install lcandy2/tap/sim-agentation && sim-agentation serve --open`）。
2. 打开 http://localhost:38470，启动一个已有 iOS 项目对应的模拟器。
3. 用 `claude mcp add sim-agentation -- sim-agentation mcp` 接一个 Claude Code 会话；先不开 channel，用 `sim_watch` 这条保守路径。
4. 在该项目上真实走查，用 Design Mode 提 5–10 条批注（覆盖：一个明显需要改文案的元素、一个需要调排版的框选区、一个运行期拼出来的 label）。
5. 观察智能体能否不追问就找到正确文件；再试一次带 channel 的推送模式，对比体验差异。
6. 若命中率低，再花半天给 app 接 `SimAgentationPlus`（`.simAgentation()` + 关键视图 `.simTag()`）后重复第 4 步。

**判断有没有改善的指标**
- 定位命中率：批注中智能体定位到正确文件的比例，以及正确行号的比例（有 SDK 时可精确统计）。
- 往返轮次：从提交批注到改动落地，需要人工补充说明（截图、文字、指明文件）的次数。设基线为“人工截图 + 文字描述”的当前做法，比较轮次与耗时。
- 误改率：智能体改错位置或改错无关代码的比例。
- 闭环率：批注最终被 `sim_resolve` 而非 `sim_dismiss` / 一直 pending 的比例。
- 运行期字符串这类最难的批注（无 SDK 时只能靠搜索）单独统计命中情况。

**失败信号（出现即判定不适合当前团队）**
- 智能体频繁定位不到源码文件，必须人工补话，说明无 SDK 的字符串搜索路径在你的代码库里不够用。
- Xcode 升级后 `sim-agentation` 起不来或 Design Mode 无数据（私有框架被破坏）。
- 团队主力不是 Apple Silicon Mac + 新版 Xcode，或主力智能体不支持 MCP 且 Markdown 粘贴带来的收益不足以抵消操作成本。
