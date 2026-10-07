# ostiums/fixkit

- 结论：**值得一试**。值得小范围试：按 README 的 Quick start 四步接入（marketplace 装 mod、加 Swift/npm 包、根视图加一行 .fixKitHost()、放开读 .fixkit/ 权限），先在仓库自带的 Tally 示例上跑通再用于自己项目的模拟器 UI 缺陷；理由是原文给出了完整可照做的命令、配置和失败/限制条件，而且它把「界面看着不对」这类难描述的反馈直接变成 agent 可执行任务，但版本 0.1.0、只支持 iOS 模拟器，适用面窄。
- 原文：https://github.com/ostiums/fixkit
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-07T22:48:16.061Z

## 是什么

FixKit 给 iOS / React Native 应用（模拟器）加一条调试反馈通道：在模拟器里**长按**出问题的界面元素，用一句话说哪里不对，报告会自动落到项目里正在运行的 Claude Code（或 Codex）会话中，附带元素定位、截图和你的原话；agent 改代码并重启应用，横幅跟着走 `queued → fixing → rebuilding → live`。

它分两半：**fixkit plugin** 负责接收（Claude Code 里是一个 mod，Codex 里是一组 hooks）；应用侧从 debug build 发送（SwiftUI/UIKit 用 FixKit Swift package，React Native 用 fixkit npm 包）。Release build 里不含这部分代码。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**
- Claude Code 2.1.287+ 与 Node.js 18.2+（走 Codex 则需 Codex CLI 0.159+）
- Xcode 与 iOS 17+ 模拟器（明确只在模拟器里工作）
- AXe：`brew install cameroncooke/axe/axe`（用来看触点落在哪个元素上）。没装也能收到报告，但只有截图和触点坐标
- 推荐装 XcodeBuildMCP，让 Claude 一次调用完成重建与重启
- React Native 路线额外需要 React Native 0.80+（React 19.1，新架构）

**1. 安装接收端（Claude Code）**

前提：已装 Claude Code 2.1.287+。

```bash
claude plugin marketplace add ostiums/fixkit
claude plugin install fixkit@fixkit
```

装完每个 Claude Code 会话都会加载它，会话打开期间在 `127.0.0.1:4747` 跑接收器。

**2. 加包**

Xcode：File › Add Package Dependencies › `https://github.com/ostiums/fixkit`；或写进 `Package.swift`：

```swift
.package(url: "https://github.com/ostiums/fixkit", from: "0.1.0")
```

React Native 应用改装 npm 包（见第 6 步）。

**3. 在应用里加一行**

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

**4. 跑起来**

1. 把 `.fixkit/` 加进 `.gitignore`（报告写在这里）。
2. 在项目的 Claude Code settings 里允许它读截图，免确认：

   ```json
   { "permissions": { "allow": ["Read(./.fixkit/**)"] } }
   ```

3. 在模拟器上跑 debug build，并在项目根目录启动 `claude`。
4. 长按一个元素、输入哪里不对、按 Return。

终端宽度 ≥144 列时自动开 Fix queue 面板，窄了用 `/fix-queue` 打开；Claude 忙时报告排在队列里。

**5.（可选）让报告指向更精确的代码**

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

规则：最内层标记生效（长按持卡人名报 `card.holderName`，卡片其他位置报 `home.walletCard`）；标记要放在**代码该改的那个 view** 上（改文案或颜色标 `Text`，改间距或布局标容器）；名字随你起，也可以带数据 `.fixable("transaction.amount.\(merchant)")`；`.fixScreen("Home")` 给每份报告标屏，TabView 里用 `.fixScreen(selectedTab.rawValue)` 保持同步。

UIKit 不用标记，按保存该 view 的属性名报，例如 `[fix r1] ProfileViewController.nameLabel · UILabel "Alex Morgan"`；outlet、`lazy var`、数组下标（`buttons[2]`）都能找到，最近的 owner 优先，要精确到行才加 `.fixable("checkout.pay")`。

**6.（可选）React Native**

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

**7.（可选）在自带示例上先验证**

```bash
./scripts/reset-demo.sh          # puts the bugs back, builds, installs and launches Tally
claude --plugin-dir ./mod        # the mod from this checkout
```

四个种子 bug 与说法：Home 的 Send 按钮说 `button is shifted`；Home 的 Top up 按钮说 `corners don't match the others`；Home 或 Cards 的持卡人名说 `name is cut off`；Home 或 Activity 里绿色分类的金额（如工资）说 `income should be green`。四个 bug 都是一行的小错，从 git tag `demo-start` 恢复；默认用 iPhone 18 Pro 模拟器，可用 `SIMULATOR` 换。

**8.（可选）Codex 路线**

```bash
codex plugin marketplace add ostiums/fixkit
codex plugin add fixkit@fixkit
```

1. `.fixkit/` 加进 `.gitignore`。
2. 项目根目录启动 `codex`，首次启动它会要求 review hooks，在那里（或之后在 `/hooks`）信任；不信任 hooks 不运行。
3. **第一次长按之前先给会话发一条消息**（hooks 从第一轮起跑，接收器随该轮启动）；想直接以长按开始就 `codex "FixKit"`；恢复的会话同理，接收器随下一条消息启动。
4. 跑 debug build，长按、输入、Return。

限制：需要 Codex 默认的共享 app-server（`codex --no-daemon` 自己起 server，`codex queue` 够不到）；只在有 Xcode 工程、`Package.swift` 或 RN `package.json` 的目录（向上到 git root）里生效；Codex 没有插件 UI，进度看应用横幅，接收器日志在 `$TMPDIR/fixkit-codex.log`；会话关闭后报告留在队列里等恢复。

**9.（可选）录屏时用脚本喂报告**

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

## 对应的研究问题

**1. 能力发现**：把「界面看着不对」这类过去只能靠口头描述或手动截图标注的问题变成一句自然语言任务；元素定位（accessibility tree、UIKit 属性名、RN 由 Metro source map 给出的 JSX 行号与使用处）也由工具自动补齐，不必人工告诉 agent 文件在哪一行。

**2. 任务匹配**：适合 iOS 模拟器里的一行级 UI 缺陷——按钮位置偏移、圆角不一致、文案被截断、分类颜色不对（示例里的四类）。工具链分工明确：Claude Code 走 mod 形态（会话内 4747 端口接收器 + Fix queue 面板），Codex 走 hooks 形态（`codex queue` 投递，只有应用横幅没有面板）。需要重建的 native 改动走 `xcodebuild`/`simctl` 或 XcodeBuildMCP，RN 的 JS 改动靠 Fast Refresh 不需要重建。明确不覆盖：Android、原生 Modal、原生呈现的页面、嵌套 `<FixKitHost>`。

**3. 条件供给**：要提供的有——元素定位（可选加 `.fixable`/`.fixScreen` 标记，标记越靠近该改的 view 越准）、截图与整棵 accessibility tree（`.fixkit/reports/<id>.png` 与 `<id>.ax.json`）、用户原话；对 Claude Code 需要放开 `Read(./.fixkit/**)` 权限，否则要逐次确认；对 Codex 需要信任 hooks 并在首轮前发一条消息；AXe 决定能否判断触点落在哪个元素；XcodeBuildMCP 决定能否一次调用完成重建重启；RN 需要 Metro 常驻。

**4. 主动推进**：触发方式是用户长按（0.5 秒，与应用自身手势并行）；agent 忙时报告进队列等待，会话关闭时报告留在该会话队列里直到恢复；修复进度由状态机自动推进 `queued → fixing → rebuilding → live`，应用轮询 `.fixkit/status.json` 显示横幅。Codex 侧 hook 只在会话开始/结束等待，其余后台运行，工具 hook 只对 `build_run_sim` 触发。

**5. 效果验证**：`live` 的判定是「agent 处理该报告期间应用重新启动过」（经 XcodeBuildMCP、xcodebuild+simctl 或 Xcode 的 Run）。可核对的具体证据：报告行形如 `[fix r1] ...` 是否指对元素/文件/行，`.fixkit/reports/` 下的截图与 ax.json，Tally 的四个已知 bug 可作验收用例，`scripts/test.sh` 跑插件校验、mod/接收器/Codex hooks、RN 包、Swift 包与 Tally 的 Debug/Release 构建。原文没有给修对率之类的量化指标。

## 与已有做法的关系

清单中有 **Claude Code（tool，adopt）**。FixKit 本身是 Claude Code 的插件：通过 `claude plugin marketplace add` / `claude plugin install` 安装，复用会话、插件机制和 settings 里的权限模型（`permissions.allow`），只是给会话补了一条「从模拟器界面直接投递带定位和截图的反馈」的通道；它是 Claude Code 用法的延伸而非替代品，同时提供等价的 Codex 实现。清单中没有其他相关条目。

## 证据与局限

原文给出的实证材料：完整安装命令、Swift/SwiftUI/UIKit/React Native 代码片段、settings JSON、两个演示（47 秒 MP4 与 RN gif）、可运行的 Tally 示例（四个已知一行 bug，附长按位置与说法）、`scripts/test.sh` 覆盖的测试范围、录屏脚本模式。

只是作者主张、未给数据的部分：安装是否在各类项目上都顺利、修复速度、修对率、是否引入回归，原文没有给出任何对照或统计。

适用条件与限制（原文明确写了的）：项目处于 0.1.0 阶段、约 50 stars，属早期项目；只在 iOS 模拟器工作，不支持 Android；同一 iOS 版本有多个模拟器启动时无法分辨是哪一个，报告不带截图；一次只服务一个会话，后启动的 Claude Code 或 Codex 会话会接管 4747 端口；RN 侧有若干未覆盖场景（native Modal、原生呈现页面、嵌套 FixKitHost、Android 只渲染 children），Fast Refresh 改过文件后行号可能偏几行，按下按钮期间部分手势被挂起，Gesture Handler 的原生按钮不在其列；Codex 侧只能用默认共享 app-server，`--no-daemon` 不可用，且非 app 项目里插件不启动任何东西。

## 怎么试、怎么验证

**最小试用**
1. 先不碰自己的项目：clone 仓库，跑 `./scripts/reset-demo.sh`，再 `claude --plugin-dir ./mod`，用 Tally 的四个已知 bug 逐一长按并照表输入那句话。
2. 记录每个 bug 从长按到横幅变 `live` 的时间，以及你是否额外补充过文件/行号说明。
3. 通过后，在自己一个 iOS 项目上按 Quick start 四步接入（装 mod、加包、根视图加 `.fixKitHost()`、放开 `Read(./.fixkit/**)`），挑 3–5 个已知的模拟器 UI 小缺陷重跑一遍；SwiftUI 项目另找一处加 `.fixable` 对比精度。
4. RN 项目按第 6 步接一次，只改 JS 观察是否完全不触发重建。

**判断有没有改善的指标**
- 每个缺陷从长按到 `live` 的耗时，与平时「截图 + 手打描述 + 告诉 agent 文件位置」的耗时对比。
- 需要人工补充描述的字数或轮数（报告里的元素名/文件/行号是否已经够 agent 直接动手）。
- 定位准确率：报告行与 `.fixkit/reports/*.ax.json`、截图是否一致，有没有指错元素（这是它相对手打的唯一核心增益，必须单独核对）。
- 一次修对率：需要人工纠正或补轮次的报告占比。
- 回归：原有测试与 `scripts/test.sh`、项目自身检查是否仍通过。
- 干扰成本：长按 0.5 秒是否与应用原有手势（滚动、长按菜单）冲突，composer 窗口是否遮住要看的内容。
- RN 专属：同一批修复中触发重建的次数（理想为 0，除非动了 native）。
