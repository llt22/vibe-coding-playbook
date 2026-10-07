# 把屏幕上的视觉信息变成 agent 能用的证据

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：工作流里的视觉信息经常卡在人看得到、模型或编码 agent 吃不到，本篇把图片、模拟器 UI 缺陷和长按反馈转成结构化证据，交给 text-only 模型或编码 agent。
> 先试这一步：如果你已经在 iOS 模拟器上用 Claude Code，先在 FixKit 自带 Tally 示例上跑通“长按 → 一句话 → agent 改代码”闭环；否则按痛点选路线 A（图片）或路线 B（模拟器批注）。
> 最近修订：2026-10-08

## 解决什么问题

工作流里的视觉信息经常卡在同一个地方：屏幕上看得到，模型吃不到。三种典型情形：

- 情形一：手上有图片（UI 截图、带数字的图表、幻灯片、推文截图），但模型没有视觉通道——原生 text-only 的 DeepSeek、GLM、MiMo Pro，或 Claude Code 里跑的纯文本配置。现在的替代做法是人先把图 OCR 或口述成文字，再喂给模型。
- 情形二：在 iOS 模拟器上走查 UI，看到哪里不对，却只能用自然语言描述，编码 agent 得自己猜是哪个文件、哪一行。
- 情形三：在 iOS / React Native 模拟器里长按出问题的界面元素，用一句话说哪里不对，希望报告自动落到项目里正在运行的 Claude Code（或 Codex）会话中，附带元素定位、截图和你的原话；agent 改代码并重启应用，横幅跟着走 queued → fixing → rebuilding → live。

本篇解决的是：把屏幕上的视觉信息转成结构化证据再交出去——图片走「全文转录 + 按阅读顺序的版面区域 + 实体与关系列表」；模拟器界面走「元素 accessibility 树信息 + 所在屏幕 + 可用于搜索源码的字符串 + 两张截图（整屏带红框、框选区特写）」；FixKit 走「长按元素 + 一句话 + accessibility tree / UIKit 属性名 / RN source map + 截图 + 原话」。前两条路线不改动 harness 配置（ModLens 无 hook、无 wrapper、无本地代理守护进程，卸载就是删一个文件夹）；FixKit 走插件/hooks，报告写进 `.fixkit/`，由会话内接收器消费。

## 适用与不适用

**适用**

路线 A（粘贴图片 → text-only 模型）

- 工作流里有图片，但手上的模型是 text-only。
- 已在用 Claude Code：ModLens 以 skill 形式装进 Claude Code，同时可以把 Claude Code 已登录的订阅当作 `claude-cli` 引擎复用，两者互为供给。
- 主要服务对象是 text-only 的 DeepSeek 模型，原文所有演示都跑在 DeepSeek-V4-Flash 上。

路线 B（模拟器 UI 批注 → 编码 agent）

- 项目是 iOS，开发机是 Apple Silicon 上的 macOS + Xcode 26（要 iPhone Duo 需 Xcode 27.1）。
- 客户端支持 MCP（Claude Code、Codex、Cursor 有现成插件路径），或至少能把批注 Markdown 粘进去。
- 你想让 agent 直接定位到文件与代码行，而不是自己读一堆截图描述。

路线 C（FixKit 长按反馈 → Claude Code/Codex）

- iOS / React Native 应用的模拟器 UI 缺陷，适合按钮位置偏移、圆角不一致、文案被截断、分类颜色不对这类一行级问题。
- 已在用 Claude Code 2.1.287+ 或 Codex CLI 0.159+，Node.js 18.2+。
- Xcode 与 iOS 17+ 模拟器；React Native 路线额外需要 React Native 0.80+（React 19.1，新架构）。
- 想要「长按 → 说哪里不对 → agent 改代码并重启 → 横幅跟状态」的闭环。

**不适用**

- 已经在用原生多模态模型的场景装 ModLens 没有收益；插件只在「元数据明确确认是 text-only」时才接管，未确认的一律不碰，原生视觉模型保持自己的粘贴路径。
- 不是 iOS、不是 Apple Silicon、Xcode 版本不满足的，路线 B 用不了：它依赖 Xcode 的私有框架，只支持单一开发环境，项目仅 34 stars，不适合直接定为团队标准流程。
- FixKit 只在 iOS 模拟器工作，不覆盖 Android、原生 Modal、原生呈现的页面、嵌套 `<FixKitHost>`；版本 0.1.0，适用面窄。
- 不要指望任何一条路线主动推进。ModLens 原文没有给出任何基于时间、事件或状态的持续触发机制，唯一沾边的是会话内「同一张图粘贴一次、后续追问不用再粘」以及引擎自动 failover；SimAgentation 是你在 Design Mode 里提了批注它才动；FixKit 触发方式是用户长按（0.5 秒，与应用自身手势并行）。

**风险与局限**

- 复用他人 CLI 登录会消耗对应账号的配额和额度，受各上游服务条款约束（ModLens 原文明确把上游条款责任交给使用者）。
- 图片内容被当作不可信输入处理（见 docs/security.md），远程 URL 的抓取行为也需要核对。
- ModLens 项目单人维护、不接受 PR，长期可持续性是一个未知数。
- ModLens README 里提到的多数文档（cli.md、output-schema.md、security.md、harness-setup.md）不在本次输入中，无法据以判断细节是否准确。
- ModLens 原文里出现的模型名和版本可能已过时，落地前需自行核实引擎当前是否可用。
- SimAgentation 原生侧使用 Xcode 的私有框架 CoreSimulator、SimulatorKit、AccessibilityPlatformTranslation，Xcode 新版可能使其失效直到项目跟进。
- SimAgentation 的 channel 模式是 Claude Code research preview，未被 Anthropic 加入 allowlist 前必须带 flag 并在启动时确认，不带 flag 推送会被丢弃（工具本身仍照常可用）。
- FixKit 版本 0.1.0，只支持 iOS 模拟器，适用面窄；Claude Code 需放开 `Read(./.fixkit/**)` 权限；Codex 需信任 hooks 并在首轮前发一条消息。
- FixKit 的 AXe 决定能否判断触点落在哪个元素；XcodeBuildMCP 决定能否一次调用完成重建重启；RN 需要 Metro 常驻。

## 前置条件

共用：Node.js。

**路线 A（ModLens）**

- 走 DeepSeek Harness（dsh）路线的话需要已有 dsh。
- 至少一个视觉引擎，三选一：免费 Gemini API key（Google AI Studio，约 3 分钟，不需要信用卡）；一个 OpenAI 兼容端点（key、baseUrl、模型名）；复用一个已登录且持有视觉模型的本地 CLI（Codex、OpenCode、Pi、Grok）。
- 对每个被复用的 CLI 做显式授权。
- 需要时配好代理。
- 可读文档：INSTALL.md、docs/cli.md、docs/output-schema.md、docs/security.md、docs/harness-setup.md。

引擎与 failover 的背景（来自 ModLens 原文）：视觉来源共十处——6 个内置 provider（gemini-api、openai、anthropic、antigravity-cli、claude-cli、kimi-cli）+ 4 个可复用登录的本地 CLI（Codex、OpenCode、Pi、Grok）。不指定 provider 时，所有已配置引擎串成一条 failover 链，快速 API 先试、agent CLI 兜底。速度分档：API 类 5-10 秒，agent CLI 类 15-45 秒（时间为作者主张，无基准数据）。

**路线 B（SimAgentation）**

- Apple Silicon 上的 macOS + Xcode 26（要 iPhone Duo 需 Xcode 27.1）。
- 从源码构建还需要 Node 和 pnpm。
- 一个支持 stdio MCP 的客户端；channel 模式需要 claude.ai 登录或 Console API key。

**路线 C（FixKit）**

- Claude Code 2.1.287+ 与 Node.js 18.2+（走 Codex 则需 Codex CLI 0.159+）。
- Xcode 与 iOS 17+ 模拟器（明确只在模拟器里工作）。
- AXe：`brew install cameroncooke/axe/axe`（用来看触点落在哪个元素上）。没装也能收到报告，但只有截图和触点坐标。
- 推荐装 XcodeBuildMCP，让 Claude 一次调用完成重建与重启。
- React Native 路线额外需要 React Native 0.80+（React 19.1，新架构）。

## 操作步骤

先选路线：你要解决的是「模型看不到粘贴进来的图片」，走路线 A；你要解决的是「模拟器上的 UI 问题说不清楚、agent 定位不到代码」，走路线 B；你要的是在模拟器里长按元素写一句话、报告自动落进 Claude Code/Codex 会话并让 agent 改代码，走路线 C。三条路线互不冲突，可以都装。

### 路线 A：把粘贴的图片变成结构化文字证据（ModLens）

1. 安装。三条路，按你的 harness 选一条。

**做法 A：DeepSeek Harness（dsh）上一行命令**

前提：已装 Node.js，已有 dsh。

```bash
npx -y @deepseek-ai/dsh plugin --profile web add @liustack/modlens@3.26.5
```

**做法 B：其他 harness（Claude Code、Codex、Pi、OpenCode）用 skills.sh 装到用户级**

```bash
npx -y skills add liustack/modlens --skill modlens --global
```

装完重启 harness，然后让 AI 去配置 modlens 并跑健康检查。

**做法 C：把安装整个交给 AI**

直接发这一句：

```
Install and configure the modlens skill following https://github.com/liustack/modlens/blob/main/INSTALL.md, then run the health check and tell me the result.
```

怎么选：dsh 用户走 A；其他 harness 走 B 或 C。C 的额外好处是安装会先盘点本机已有什么（Claude Code / Codex / OpenCode / Pi 的已有登录可能就够了），复用前会先问。

预期结果：不动任何 harness 配置，卸载就是删一个文件夹。

2. 跑健康检查。

```bash
modlens doctor
```

或让 AI 跑健康检查并汇报结果。记录结果。

预期：结果为空 → 进入第 3 步补一个引擎；已有可用引擎 → 直接跳到第 4 步之后按需配置。

3. 只有当健康检查为空，才配一个免费引擎。

**做法 A（可接受一次注册）：免费 Gemini API key**。在 Google AI Studio 取 key，约 3 分钟，不需要信用卡。原文称配好后每次读取 5-10 秒。

**做法 B（完全免注册）：装 Antigravity CLI 并登录**

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
agy                                                           # 登录，然后退出
```

怎么选：怕注册走 B；想快点、可接受一次注册走 A。

4. 可选：用 openai 兼容端点接任意视觉模型。

前提：拿到该平台的 key、baseUrl、模型名。

```bash
modlens config set openai.baseUrl https://dashscope.aliyuncs.com/compatible-mode/v1   # qwen-vl
modlens config set openai.apiKey  <key>
modlens config set openai.model   qwen3-vl-plus
```

同一组三个键对 GLM 开放平台、SiliconFlow、OpenRouter、自建 vLLM/Ollama 或自建网关通用。

`apiKey` 也接受逗号分隔的多 key 列表：认证、限流、配额类失败时轮换到下一个 key；网络、5xx、解析类失败则跳过剩余 key、保持 provider 级 failover。

5. 可选：复用本机已有的登录（零新 key，但每个都要显式授权）。

```bash
modlens config set reuse.codex true
modlens config set reuse.opencode true
modlens config set reuse.pi true
modlens config set reuse.grok true
```

前提：对应 CLI 已登录、且持有视觉模型。`modlens doctor` 会发现可复用的 CLI。

预期：每次复用读取都会在 `meta.warnings` 里标注消耗了谁的配额。

6. 可选：选路与网络。

```bash
modlens config set provider <name>     # 表达偏好，failover 链仍然兜底
modlens <命令> -p <name>               # 精确钉死一个，没有回退
modlens config set proxy <url>         # 或在环境里设 HTTPS_PROXY
modlens config set openai.proxy ""     # 内网端点退出代理
```

怎么选：想稳就用 `provider` 表达偏好、保留 failover 兜底；需要可复现的结果（例如做对比测试）才用 `-p` 钉死。

7. 日常使用。

直接粘贴图片或丢一个路径，正常提问，技能会自己触发。粘贴一次之后，针对同一张图的后续问题不需要重新粘贴。

在 dsh 里也可以先在模型选择器里选一个 `(modlens vision)` 条目（选择会被记住，选一次就够），再粘贴，这样缩略图会留在消息里；插件会自动为每条符合条件的路由（原生 text-only 的 DeepSeek / GLM / MiMo Pro）生成一个带 vision 的条目，原生多模态模型会被自动排除。

dsh 图形界面路线：Settings → Plugins → Plugin config，打开 ModLens 卡片，切换引擎、勾选 `auto` 模式可复用哪些本地 CLI，保存即生效（dsh 0.1.7 起在侧边栏 Plugins 页选 `@liustack/modlens`）。

原文演示过的任务类型，可以拿来对照自己能覆盖多少：UI 截图逐元素解读、推文截图（作者、文案、图片细节、时间戳、全部互动数据）、一次粘贴三张图并识别它们属于同一视觉家族、128 个 AI 模型的散点图（双轴、对数刻度、按 provider 的颜色编码、高亮区域、带虚线标记的每个 DeepSeek 模型）、幻灯片全文与版式。

### 路线 B：把模拟器 UI 批注变成结构化证据交给编码 agent（SimAgentation）

8. 安装。三条路，选一条。

**做法 A：让智能体自己装（最省事）**

在 Claude Code / Codex / Cursor 等编码智能体里粘贴 README 提供的提示词，让它按 SETUP.md 走完安装：

```
Set up SimAgentation for me by following https://github.com/lcandy2/sim-agentation/raw/refs/heads/main/SETUP.md
```

**做法 B：Homebrew 独立安装**

```sh
brew install lcandy2/tap/sim-agentation
sim-agentation serve --open
```

想让它常驻后台则改用：

```sh
brew services start sim-agentation
```

**做法 C：从源码构建**

前提：已装 Node 和 pnpm。在仓库目录执行（`pnpm build` 先把 UI 构建到 `app/web/dist`，再构建 Swift 二进制）：

```sh
pnpm install
pnpm build    # the UI into app/web/dist, then the Swift binary
pnpm start    # app/host/.build/debug/sim-agentation serve --open
```

开发时想在改动后免刷新，另开 `pnpm dev`：页面在 38470 加载 Vite dev server（38472）上的 UI。

怎么选：只想用就走 A 或 B；要改代码或免刷新调试走 C。

安装后可以参考的配置项（来自原文）：

| 变量 | 默认值 |
|---|---|
| `SIM_AGENTATION_PORT` | `38470` |
| `SIM_AGENTATION_HOME` | 临时目录下的 `sim-agentation`：批注及其截图，能跨 host 重启保留，但不跨 Mac 重启 |
| `SIM_AGENTATION_WEB` | 仓库的 `app/web/` 目录（UI） |
| `SIM_AGENTATION_SDK_URL` | `http://127.0.0.1:38471` |

渲染好的设备外壳缓存在 `~/Library/Caches/sim-agentation`。

9. 打开页面、选模拟器。

页面默认开在 http://localhost:38470。左侧选一个模拟器，未运行的会显示 **Start**，不按不会启动。

10. 提一条批注（Design Mode）。

- 按 `⇧⌘D` 进入 Design Mode，画面冻结、accessibility tree 加载。
- 悬停查看元素；`↑` 选父元素，`↓` 退回。
- 点击一个元素，或在任意区域拖框。按住 Shift 追加到选择集，一条批注覆盖全部。
- 写下应该改成什么，按 Return 提交（⇧Return 换行）。批注出现在右侧 inspector，在屏幕上显示编号；点编号可重新打开修改备注，或改绑到别的元素。
- 按 Esc 丢弃选择，再按一次回到实时画面。

预期：批注带上该元素的 accessibility 树信息、它所在的屏幕、可用于搜索源码的字符串，以及两张截图（整屏带红框、框选区特写）。被测 app 无需集成任何 SDK——信息全部来自模拟器的 accessibility tree，因此对任意已启动模拟器上的任意 app（包括 Apple 自带 app）都可用。

其余常用快捷键：`A`/`I` 切 Design Mode / Interact；`S` 对比 SDK 视图树与像素兜底；`⌘S`、`⌘R`、`⌃⌘C` 保存 / 录屏 / 复制屏幕；`⇧⌘H`、`⌘L` Home、锁屏；`⌘← ⌘→` 旋转；`⌘↑ ⌘↓` 音量；`⌘=`、`⌘-`、`⌘4` 放大、缩小、适应。Simulator.app 的其余快捷键（shake、appearance、文字大小、Face ID）同样可用。

11. 没有 MCP 的客户端：在批注标签页点 **Copy**，把所有待处理批注以 Markdown 复制到剪贴板，粘到任何地方。

12. 接上智能体。

**做法 A：用插件（Claude Code / Codex / Cursor；插件同时带来 MCP server 和两个 skill）**

```sh
# Claude Code
/plugin marketplace add lcandy2/sim-agentation
/plugin install sim-agentation@sim-agentation

# Codex
codex plugin marketplace add https://github.com/lcandy2/sim-agentation.git
codex plugin add sim-agentation@sim-agentation
```

Cursor 则按 Cursor 官方插件文档把该仓库作为插件添加。

预期：插件首次启动 MCP server 时会下载与插件版本匹配的 SimAgentation release（约 2 MB）、用 release 的 SHA-256 校验并缓存到 `~/Library/Caches/sim-agentation`；已装同版本（如 Homebrew 版）会直接复用，`SIM_AGENTATION_BIN` 可指向自建版本。server 未运行时也会把页面起在 38470。

**做法 B：用 skills CLI 单独装两个 skill**（`sim-agentation` 教它如何处理批注，`sim-agentation-sdk` 教它给 app 接 SDK）

```sh
npx skills add lcandy2/sim-agentation                          # both skills
npx skills add lcandy2/sim-agentation --skill sim-agentation   # one of them
npx skills add lcandy2/sim-agentation -a claude-code -a codex  # for these agents only
```

**做法 C：只装 MCP server（任何支持 stdio MCP 的客户端同理）**

```sh
claude mcp add sim-agentation -- sim-agentation mcp
codex mcp add sim-agentation -- sim-agentation mcp
```

源码构建时命令为 `/path/to/Sim-Agentation/app/host/.build/debug/sim-agentation mcp`。

怎么选：插件最省事；只想让它会读批注、不想让它动你的 app 代码，就装 skill 或只装 MCP server。

13. 可选：让批注「一发就落进会话」。

在 Claude Code 里把它作为 channel 加载（含空闲会话，不需要 `sim_watch` 轮询）：

```sh
claude --dangerously-load-development-channels server:sim-agentation
claude --resume <session> --dangerously-load-development-channels server:sim-agentation
```

前提：channels 是 Claude Code research preview，未被 Anthropic 加入 allowlist 前必须带这个 flag 并在启动时确认，且需要 claude.ai 登录或 Console API key；不带 flag 推送会被丢弃，工具仍照常可用。

预期：多个会话收到同一条批注时，最先 acknowledge 的接管，其余被告知让开。

14. 知道智能体手上有哪七个 MCP 工具，才知道它能干什么。

`sim_get_pending`（待处理批注，含元素信息和截图路径）、`sim_get_all`（含已完成）、`sim_watch`（等待你新增批注后返回待处理列表）、`sim_acknowledge`（标记为进行中，仅本会话可见）、`sim_resolve`（带摘要标记为已修复）、`sim_dismiss`（带理由拒绝）、`sim_reply`（在批注上留言）。状态变化和回复会显示在浏览器 inspector 里。

15. 可选：给自家 app 接 SDK，换取精确选中和源码文件/行号。

在 Xcode 选 **File > Add Package Dependencies**，输入 `https://github.com/lcandy2/sim-agentation`，把包内唯一库 SimAgentationPlus 加到 app target；或在 `Package.swift` 里：

```swift
.package(url: "https://github.com/lcandy2/sim-agentation", from: "0.2.1"),
// in your target's dependencies:
.product(name: "SimAgentationPlus", package: "sim-agentation"),
```

启动一次并标记想被找到的视图（Release 构建下全部编译掉）：

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

预期：接了 SDK 后父级来自真实 view/layer 树而非像素，背景与页面差异极小也能选中；每条批注还会带 bundle ID、`Source` 行（文件与行号）、所属 view controller、以及框选区周围 app 自定义的 view 类。批注时按 `S` 或点 **SDK** 可与纯像素兜底结果对比。

### 路线 C：在模拟器里长按出问题的元素，让 agent 直接改（FixKit）

16. 安装接收端（Claude Code）。前提：已装 Claude Code 2.1.287+。

```bash
claude plugin marketplace add ostiums/fixkit
claude plugin install fixkit@fixkit
```

装完每个 Claude Code 会话都会加载它，会话打开期间在 `127.0.0.1:4747` 跑接收器。

17. 加包。

Xcode：File › Add Package Dependencies › `https://github.com/ostiums/fixkit`；或写进 `Package.swift`：

```swift
.package(url: "https://github.com/ostiums/fixkit", from: "0.1.0")
```

React Native 应用改装 npm 包（见第 21 步）。

18. 在应用里加一行。

SwiftUI，加在根视图上：

```swift
import FixKit

WindowGroup {
    ContentView()
        .fixKitHost()
}
```

UIKit，在主 window 可见后加一次：

```swift
import FixKit

window.makeKeyAndVisible()
window.fixKitHost()
```

19. 跑起来。

1. 把 `.fixkit/` 加进 `.gitignore`（报告写在这里）。
2. 在项目的 Claude Code settings 里允许它读截图，免确认：

   ```json
   { "permissions": { "allow": ["Read(./.fixkit/**)"] } }
   ```

3. 在模拟器上跑 debug build，并在项目根目录启动 `claude`。
4. 长按一个元素、输入哪里不对、按 Return。

终端宽度 ≥144 列时自动开 Fix queue 面板，窄了用 `/fix-queue` 打开；Claude 忙时报告排在队列里。

20. 可选：让报告指向更精确的代码。

不标记也能用：接收器读模拟器的 accessibility tree，报出指下的元素和旁边文案，agent 拿这些字符串去源码里搜。

```
[fix r1] StaticText "+€4,650.00" near "Northwind GmbH", "Salary, September" · Activity screen · .fixkit/reports/r1.png
```

SwiftUI 加 `.fixable` 会连元素名、文件、行号一起发过来：

```swift
VStack(alignment: .leading) {
    Text(card.number)
        .fixable("card.number")
    Text(card.holderName)
        .fixable("card.holderName")
}
.fixable("home.walletCard")
```

```
[fix r2] card.holderName · Features/Home/WalletCardView.swift:7 · StaticText "Alex Morgan" · .fixkit/reports/r2.png
```

规则：最内层标记生效（长按持卡人名报 `card.holderName`，卡片其他位置报 `home.walletCard`）；标记要放在代码该改的那个 view 上（改文案或颜色标 `Text`，改间距或布局标容器）；名字随你起，也可以带数据 `.fixable("transaction.amount.\(merchant)")`；`.fixScreen("Home")` 给每份报告标屏，TabView 里用 `.fixScreen(selectedTab.rawValue)` 保持同步。

UIKit 不用标记，按保存该 view 的属性名报，例如 `[fix r1] ProfileViewController.nameLabel · UILabel "Alex Morgan"`；outlet、`lazy var`、数组下标（`buttons[2]`）都能找到，最近的 owner 优先，要精确到行才加 `.fixable("checkout.pay")`。

21. 可选：React Native。

```bash
npm install --save-dev fixkit
```

```tsx
import { FixKitHost } from 'fixkit'

export default function App() {
  return (
    <FixKitHost>
      <RootNavigator />
    </FixKitHost>
  )
}
```

运行方式按项目类型选：Expo 无自己的原生代码 `npx expo start --ios`；Expo 有 development build 先 `npx expo run:ios`，之后 `npx expo start --ios`；React Native CLI `npx react-native run-ios`。要点：在含应用 `package.json` 的目录里启动 `claude` 或 `codex`（插件据此判断是 RN 项目、`.fixkit/` 也放这里）；保持 Metro 常驻（Fast Refresh 把改动直接上屏，接收器从 Metro 提供的 source map 读源码行）；改 native 代码或 native 配置时由 agent 跑项目自己的命令，不需要 XcodeBuildMCP；Release bundle 里 Metro 会连同 `__DEV__` 一起丢掉。报告形如 `[fix r1] WalletCard › Text · src/WalletCard.tsx:11 · used at App.tsx:15`。

22. 可选：在自带示例上先验证。

```bash
./scripts/reset-demo.sh          # puts the bugs back, builds, installs and launches Tally
claude --plugin-dir ./mod        # the mod from this checkout
```

四个种子 bug 与说法：Home 的 Send 按钮说 `button is shifted`；Home 的 Top up 按钮说 `corners don't match the others`；Home 或 Cards 的持卡人名说 `name is cut off`；Home 或 Activity 里绿色分类的金额（如工资）说 `income should be green`。四个 bug 都是一行的小错，从 git tag `demo-start` 恢复；默认用 iPhone 18 Pro 模拟器，可用 `SIMULATOR` 换。

23. 可选：Codex 路线。

```bash
codex plugin marketplace add ostiums/fixkit
codex plugin add fixkit@fixkit
```

1. `.fixkit/` 加进 `.gitignore`。
2. 项目根目录启动 `codex`，首次启动它会要求 review hooks，在那里（或之后在 `/hooks`）信任；不信任 hooks 不运行。
3. 第一次长按之前先给会话发一条消息（hooks 从第一轮起跑，接收器随该轮启动）；想直接以长按开始就 `codex "FixKit"`；恢复的会话同理，接收器随下一条消息启动。
4. 跑 debug build，长按、输入、Return。

限制：需要 Codex 默认的共享 app-server（`codex --no-daemon` 自己起 server，`codex queue` 够不到）；只在有 Xcode 工程、`Package.swift` 或 RN `package.json` 的目录（向上到 git root）里生效；Codex 没有插件 UI，进度看应用横幅，接收器日志在 `$TMPDIR/fixkit-codex.log`；会话关闭后报告留在队列里等恢复。

24. 可选：录屏时用脚本喂报告。

```bash
xcrun simctl spawn booted defaults write <bundle id> FixKitDirector -bool YES
```

然后从 `http://127.0.0.1:4748/next` 逐步返回 JSON（每次一个对象，没有了返回 204）：

```json
{"press": "card.holderName", "text": "The name is cut off"}
{"at": [321, 686], "text": "Income should be green"}
{"scroll": 260}
{"defaults": {"selectedTab": "Activity"}}
```

`press` 会在 `.fixable` 元素或坐标点上打开 composer、输入文本并发送；`defaults` 存的值为应用下次启动准备。

## 怎么判断变好了

**最小试用（路线 A，约 15 分钟，先在一台机器上做）**

1. 在一台已经装了 Claude Code 的机器上执行 `npx -y skills add liustack/modlens --skill modlens --global`，重启 harness。
2. 让 AI 跑健康检查（或 `modlens doctor`），记录结果。若为空，配一个免费 Gemini key，再跑一次健康检查。
3. 挑 3 张真实工作图片：一张 UI 截图、一张带数字的图表、一张含文字的照片或扫描件。逐一粘贴提问，让模型把读到的内容和数字列出来。
4. 人工逐项核对：关键数字、标题文字、实体名称对不对；有没有把不确定的地方如实标出（原文提到过一次「对截断文件名的诚实不确定」）。
5. 对同一张图追问第二轮，确认不需要重新粘贴。
6. 卸载（删掉那个 skill 文件夹），确认 harness 回到原样。

**最小试用（路线 B，先在一个 iOS 项目上做）**

在 Apple Silicon Mac + Xcode 26 的项目上小范围试：先让编码智能体按 SETUP.md 装好，用 Design Mode 对运行中的模拟器提一批真实 UI 批注，经 MCP 交给 Claude Code，看它能否不经人工补充就定位到正确文件与代码行。

**最小试用（路线 C，先在自带 Tally 示例上做）**

1. 在仓库目录执行 `./scripts/reset-demo.sh`，再执行 `claude --plugin-dir ./mod`。
2. 对四个种子 bug 各长按一次，输入对应说法：`button is shifted`、`corners don't match the others`、`name is cut off`、`income should be green`。
3. 看 agent 是否按报告改代码并重启，横幅是否从 `queued` 推进到 `fixing`、`rebuilding`、`live`。
4. 用于自己项目前，先检查报告行 `[fix rn]` 是否指对元素/文件/行；不标记时看字符串能否搜到源码；加 `.fixable`/`.fixScreen` 后看是否带文件与行号；UIKit 看属性名；RN 看 Metro source map 给出的 JSX 行号与使用处。

**可观察的指标**

- 定位准确率（路线 B / C）：agent 能否不经人工补充就找到正确的文件与代码行。路线 B 没接 SDK 时只能靠批注里的字符串搜索源码；接了 SDK 后应能直接拿到文件与行号。路线 C 不标记时靠 accessibility tree 和旁边文案搜索源码，加 `.fixable`/`.fixScreen` 后应带文件与行号。
- 报告状态（路线 C）：横幅是否走完 `queued → fixing → rebuilding → live`；`live` 的判定是「agent 处理该报告期间应用重新启动过」。
- 读取延迟（路线 A）：与作者声称的 5-10 秒（API）/ 15-45 秒（CLI）区间比较，是否可接受。
- 准确率（路线 A）：关键数字和文字的逐项正确率，对比「人读完口述给模型」这条基线。
- 无回退率（路线 A）：`meta.attempts` 长度为 1 的比例，以及 `meta.warnings` 里出现配额复用告警的频率——回退是否在被记录。原文称 `meta.attempts` 记录每次尝试，使回退从不静默。
- 交互成本：从「截图 / 提批注 / 长按」到「模型或 agent 答出内容」需要几步人工操作；对比「手动 OCR 再贴文字」或「口述 UI 问题」的步骤数。
- 可逆性（路线 A）：卸载后 harness 是否确实恢复原状。
- 仲裁是否正常（路线 B，多会话时）：同一条批注是否只有最先 acknowledge 的会话接管，其余是否被告知让开。
- 队列与恢复（路线 C）：agent 忙时报告是否排队；会话关闭后报告是否留在队列里等恢复。

**试多久、什么时候升级**：三篇原文都没有给出时长门槛。ModLens 那篇给的判断标准是——上面几项都过得去、且确实替代了「手工把图片转成文字再喂给模型」这条现有工序，才考虑把它从 try 提升为写进手册的 adopt。路线 B 同理：先在一台 Apple Silicon Mac + Xcode 26 上小范围验证，看它能否稳定定位到文件与代码行，再决定是否推广；考虑到它依赖 Xcode 私有框架、只支持单一开发环境、项目仅 34 stars，不建议直接定为团队标准流程。路线 C 的调研结论是「值得小范围试」：先在仓库自带的 Tally 示例上跑通，再用于自己项目的模拟器 UI 缺陷；但版本 0.1.0、只支持 iOS 模拟器，适用面窄，也不建议直接定为团队标准流程。

## 常见坑

- 在已经用原生多模态模型的场景装 ModLens：没有收益。插件只在元数据明确确认 text-only 时才接管。
- 复用本地 CLI 登录会消耗对应账号的配额和额度，且受各上游服务条款约束。`meta.warnings` 会标注消耗了谁的配额，但要主动看才有用。
- ModLens 卸载是「删一个文件夹」——路线 A 试用第 6 步就是验证这一点，别跳过。
- ModLens 原文给的都是演示截图，没有基准数据、没有错误率、没有第三方复现；出现过的模型名和版本可能已过时，落地前先核实引擎当前是否可用。
- ModLens 项目单人维护、不接受 PR，长期可持续性未知。
- 图片内容按不可信输入处理（docs/security.md），远程 URL 抓取行为需要核对。
- 本次输入里读不到 cli.md、output-schema.md、security.md、harness-setup.md，细节准确性无法判断。
- 不要期待持续触发：ModLens 原文没有基于时间、事件或状态的持续触发机制；SimAgentation 也只在你提批注时才产生内容；FixKit 触发方式是用户长按（0.5 秒，与应用自身手势并行）。
- SimAgentation 依赖 Xcode 私有框架（CoreSimulator、SimulatorKit、AccessibilityPlatformTranslation），Xcode 升级可能让它失效直到项目跟进。
- 不满足 Apple Silicon + Xcode 26（iPhone Duo 要 27.1）就别指望路线 B；它只支持这一套开发环境。
- channel 模式不带 `--dangerously-load-development-channels` 时推送会被静默丢弃——工具还在，但批注不会自动落进会话；多会话同时在线时先 acknowledge 的接管，其余会话要让开。
- 没接 SDK 时 agent 只能靠批注里的字符串搜源码，命中率取决于字符串是否唯一；对结果有怀疑时按 `S` 对比 SDK 视图树与像素兜底。
- 批注默认存在临时目录（`SIM_AGENTATION_HOME`），能跨 host 重启保留但不跨 Mac 重启——重启前记得导出或复制 Markdown。
- FixKit 没放开 `Read(./.fixkit/**)` 权限时，Claude Code 每读一次截图都要确认。
- Codex 路线不信任 hooks 就不运行；第一次长按之前必须先给会话发一条消息，否则接收器还没起来。
- FixKit 没装 AXe 也能收到报告，但只有截图和触点坐标，判断触点落在哪个元素上会弱。
- FixKit 没装 XcodeBuildMCP，重建与重启不能一次调用完成；RN 的 JS 改动靠 Fast Refresh，不需要重建，但 Metro 必须常驻。
- FixKit 只在 iOS 模拟器工作，不覆盖 Android、原生 Modal、原生呈现的页面、嵌套 `<FixKitHost>`；版本 0.1.0，适用面窄。
- FixKit 录屏脚本要写 `FixKitDirector` defaults 并从 `http://127.0.0.1:4748/next` 喂 JSON；没有更多对象返回 204。

## 证据与来源

路线 A 的全部内容来自调研报告《liustack/modlens》，路线 B 的全部内容来自调研报告《lcandy2/sim-agentation》，路线 C 的全部内容来自调研报告《ostiums/fixkit》。

**可核对的事实（有原文、命令或仓库数据支撑）**

- 路线 A：仓库 4101 stars；npm 包 `@liustack/modlens` 版本号 3.26.5；MIT 许可；完整的安装命令、配置命令、provider 对照表、CLI 复用对照表；五组「未剪辑」演示截图（dsh 内粘贴、Codex 桌面读推文截图、三图批量、128 模型散点图、Claude Code 终端读幻灯片）。
- 路线 B：README 给出了可照抄的安装命令、MCP 接入命令、SDK 代码片段和配置项；项目 34 stars；原生侧使用 Xcode 私有框架；只支持单一开发环境（这几条同时构成「不适合直接定为团队标准流程」这一判断的依据，该判断出自调研者而非原文）。
- 路线 C：README 给出了 Quick start 四步接入（marketplace 装 mod、加 Swift/npm 包、根视图加 `.fixKitHost()`、放开读 `.fixkit/` 权限）；仓库自带 Tally 示例和四个种子 bug；报告落盘 `.fixkit/`，接收器在 `127.0.0.1:4747`；状态机 `queued → fixing → rebuilding → live`；版本 0.1.0，只支持 iOS 模拟器。

**只是作者主张、没有支撑的部分**

- 路线 A：「市场上最轻的接法」「最强大的 dsh 视觉插件」「验证过真机」等定性说法；每次读取 5-10 秒 / 15-45 秒 / 20-45 秒的耗时数字；「读取的是证据而非想象」；对模型家族（GLM-5.3、DeepSeek-V4、MiMo Pro）的现状描述。这些都没有基准测试、没有错误率、没有第三方复现。
- 路线 B：自称是「iOS 版的 Agentation」；其余描述基本对应 README 里的功能与命令，未见独立复现或性能数据。
- 路线 C：调研结论认为「值得小范围试」，理由是原文给出了完整可照做的命令、配置和失败/限制条件，且把「界面看着不对」变成 agent 可执行任务；但版本 0.1.0、只支持 iOS 模拟器，适用面窄。未见独立复现或性能数据。

**基本无依据的部分**

- 路线 A 的「主动推进」：原文没有给出任何基于时间、事件或状态的持续触发机制。
- 路线 B 的长期可用性：依赖 Xcode 私有框架这一点原文已明确风险，但何时会失效、项目是否会跟进，没有任何承诺或时间表。
- 路线 C 的长期可用性与推广价值：原文没有给出时长门槛；只支持 iOS 模拟器，版本 0.1.0，不宜直接定为团队标准流程。

## 依据的调研

- [liustack/modlens](../research/radar/2026-10-02/591-liustack-modlens.md)：值得一试，给纯文本模型（尤其已 adopt 的 Claude Code、try 的 DeepSeek 这类无视觉通道）装上 ModLens，按 README 的一条命令安装、配一个免费 Gemini key 或复用本机已登录的 CLI，就能把粘贴的截图/图表转成结构化文字证据再回答，值得在一台机器上小范围试；但全部效果只有作者自证的演示，没有基准数据，先小范围验证再决定是否写进手册。
- [lcandy2/sim-agentation](../research/radar/2026-10-07/1616-lcandy2-sim-agentation.md)：值得一试，在 Apple Silicon Mac + Xcode 26 的 iOS 项目上小范围试：先让编码智能体按 SETUP.md 装好，用 Design Mode 对运行中的模拟器提一批真实 UI 批注，经 MCP 交给 Claude Code，看它能否不经人工补充就定位到正确文件与代码行。README 给出了可照抄的安装命令、MCP 接入命令、SDK 代码片段和配置项，但依赖 Xcode 私有框架、只支持单一开发环境、项目仅 34 stars，不适合直接定为团队标准流程。
- [ostiums/fixkit](../research/radar/2026-10-08/1928-ostiums-fixkit.md)：值得一试，值得小范围试：按 README 的 Quick start 四步接入（marketplace 装 mod、加 Swift/npm 包、根视图加一行 .fixKitHost()、放开读 .fixkit/ 权限），先在仓库自带的 Tally 示例上跑通再用于自己项目的模拟器 UI 缺陷；理由是原文给出了完整可照做的命令、配置和失败/限制条件，而且它把「界面看着不对」这类难描述的反馈直接变成 agent 可执行任务，但版本 0.1.0、只支持 iOS 模拟器，适用面窄。
