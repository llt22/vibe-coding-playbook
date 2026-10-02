# callstackincubator/codex-mobile-dev-plugin

- 结论：**值得一试**。在符合条件的 Apple Silicon Mac 上按原文两条命令装上 Mobile Dev 小范围试用：把 iOS/Android 模拟器与真机画面、控制、日志和性能面板接进 Codex 聊天，让 Codex 直接读日志、检查元素、录制并对比性能；理由是原文给出了完整可照做的安装命令、平台依赖表和起步指令，但目前仓库为私有、只支持 Apple Silicon Mac + Codex desktop，且没有任何效果数据，所以先试不宜直接采用。
- 原文：https://github.com/callstackincubator/codex-mobile-dev-plugin
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T23:38:11.871Z

## 是什么

Mobile Dev 是给 Codex 桌面版用的插件（callstackincubator/codex-mobile-dev-plugin），把 iOS 模拟器、Android 模拟器以及已连接的 iPhone/iPad/Android 真机的画面放到 Codex 聊天旁边，并让 Codex 通过 MCP 工具检查可访问性元素、控制 App、读取日志、录制性能。支持 Expo、React Native、SwiftUI 以及其他原生移动项目。

插件自带设备面板、检查、日志和性能工具；App 的构建、安装、启动仍然由项目自己的工具链完成，这是一个明确的分工。

## 具体做法

1. **确认前提**（不满足则无法安装/运行）：
   - Codex desktop，运行在 Apple Silicon Mac 上；
   - 使用 Codex 自带的 Node runtime（来自其 workspace dependency cache），**不需要**插件构建或 `npm install`；
   - 仓库当前为 private，安装需要 GitHub 读权限且本机 Git 认证可用。

2. **安装预构建插件**（在终端执行）：
   ```sh
   codex plugin marketplace add https://github.com/callstackincubator/codex-mobile-dev-plugin.git --ref release/latest
   codex plugin add mobile-dev@mobile-dev
   ```
   安装后**新开一个 chat**。

3. **更新已有安装**：
   ```sh
   codex plugin marketplace upgrade mobile-dev
   ```
   更新后同样要新开一个 chat。

4. **按用到的平台准备工具**（来自原文需求表）：
   - iOS 模拟器：Xcode 26 或更高，且已安装 simulator runtime。
   - 物理 iPhone/iPad：Xcode 27 或更高、已配对并开启 Developer Mode 的设备、USB 或 Wi-Fi 连接；屏幕镜像需要宿主支持 HEVC WebCodecs。
   - Android：Android SDK platform-tools 与 emulator，以及已授权的 USB/无线调试的 AVD 或真机；屏幕串流需要宿主支持 H.264 WebCodecs。
   - Metro 日志与 React Native 检查：需要一个已在本地运行的 Metro server，且 App 有兼容的 inspector target。
   - 物理 iOS 的 CPU/内存：iOS 17.4 或更高、运行 development-signed 且带 `get-task-allow` 的 App、已挂载 developer disk image、Xcode/LLDB 处于 detached 状态。
   - Display FPS：Android 12 或更高（需 FrameTimeline 支持），或运行 iOS 17.4+ 的物理 iOS 设备；iOS 模拟器不支持 Display FPS。

5. **启动**：从 Codex 侧边栏打开 Mobile Dev，或直接让 Codex 在聊天旁边打开模拟器。在工具栏选设备——选中一个已停止的模拟器或 AVD 会自动启动它。用 iOS / Android 开关选择只显示某一端或两端并排显示。

6. **让 Codex 干活**（原文给出的示例指令，可直接复制）：
   ```
   Build and run my Expo app in the simulator beside this chat.
   Read the app logs and help me fix this error.
   Record CPU and memory for 30 seconds while I scroll checkout.
   Compare these two performance recordings.
   ```

7. **用面板做检查**：打开 Logs 或 Performance 查看所选设备；用 Screenshot 把截图附到下一条消息；用 Select 标注某个元素或屏幕区域并留一条指令（在可用时会带上 React Native 组件与源码信息）。日志区可同时读 iOS unified logs、Android logcat 和 Metro console，可跟随前台 App、搜索过滤，并把一个错误及其堆栈发进聊天。注意物理 iOS 只支持点击和拖拽，键盘和硬件按键控制不可用。

8. **按需关闭遥测**（插件会向 Sentry 上报插件错误、崩溃和聚合性能指标；App 日志、截图、输入内容、工具载荷、设备性能录制被排除）：在 MCP 启动环境里设置
   ```sh
   MOBILE_DEV_TELEMETRY=off
   ```

## 对应的研究问题

1. **能力发现**：原文明确把几件原本在 IDE/模拟器里手工做的事交给 Codex——通过 MCP 工具检查可访问性元素并控制 App、读取 iOS unified logs / Android logcat / Metro console 并让 Codex 处理报错堆栈、让 Codex 录制一段交互、在聊天里查看交互式图表、比较两次录制并分析选定区间。这些都是“还没想到交给 AI”的具体候选。
2. **任务匹配**：定位是 Codex 桌面聊天式协作 + 移动端本地开发调试（Expo / React Native / SwiftUI / 原生）。工具形态是 Codex 插件 + MCP 工具，适合把“看设备、看日志、看性能”这类观测与诊断工作交给模型，而构建/安装/启动留给项目自己的工具链。
3. **条件供给**：需要提供的信息与权限包括——Apple Silicon Mac 与 Codex desktop、Xcode 26+（真机 27+）与模拟器 runtime、Android SDK platform-tools 与 emulator、已运行的本地 Metro server、宿主 WebCodecs（HEVC / H.264）支持、GitHub 读权限与可用的 Git 认证；部分性能能力还要 iOS 17.4+/Android 12+、development-signed 且 `get-task-allow`、developer disk image 已挂载、Xcode/LLDB detached。反馈方式是选设备、发日志/堆栈、截图、在元素或区域上写标注指令。
4. **主动推进**：原文没有给出由时间、事件或状态触发并持续执行的机制，只有按需手动的触发方式（例如“滚动 checkout 时录制 30 秒 CPU 和内存”）。这一条暂无依据。
5. **效果验证**：原文提供了可观测的指标面——App CPU、内存、单线程图表、支持设备上的整机 Display FPS，Android 录制还包含 display frame pacing 和 jank 统计，以及“比较两次性能录制”“分析选定区间”。这些可以作为改善与否的度量入口，但原文没有给任何基准数值。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

- **原文给出的可照做内容**：安装与更新命令、平台/功能需求表、起步流程、4 条可直接复制的示例指令、隐私与遥测开关说明。属于操作说明而非资讯转述。
- **只是产品说明/作者主张**：所有功能描述（并排显示设备、元素检查、日志聚合、性能图表）都没有配套数据、案例或评测；README 未给出任何性能提升数字或对比基准。
- **适用条件与硬性限制**：仅限 Apple Silicon Mac 上的 Codex desktop；仓库当前为 private，安装需要 GitHub 读权限和可用的 Git 认证，外部用户可能根本装不上；Xcode 版本要求较高（26/27）；物理 iOS 不支持键盘与硬件按键控制；iOS 模拟器不支持 Display FPS；物理 iOS 的 CPU/内存监控有一串前置条件（iOS 17.4+、development-signed + `get-task-allow`、developer disk image 已挂载、Xcode/LLDB detached）。
- **成熟度信号**：star 数 64，属早期项目；README 只覆盖单机开发者视角，未提及团队权限、CI 或多人协作场景。

## 怎么试、怎么验证

**最小试用方式**：在一台 Apple Silicon Mac 上装好 Xcode 26+ 与一个模拟器 runtime，确认能访问该私有仓库后执行上面两条安装命令，新开 chat，从侧边栏打开 Mobile Dev，选一个模拟器让它启动，然后让 Codex 执行 `Build and run my Expo app in the simulator beside this chat.`，再打开 Logs 确认能读到 iOS unified logs / Android logcat / Metro console。建议先拿一个 RN/Expo 或 SwiftUI 的小项目试，不要直接上主力项目；若拿不到仓库访问权或没有 Apple Silicon Mac，就跳过。

**判断有没有改善的指标**（尽量记录试用前的手工基线）：
- 从“描述问题”到“Codex 指到具体元素或堆栈”的耗时；
- 从提出修错请求到拿到可用修复的轮次/耗时；
- 在模拟器、IDE 与终端之间切换的次数；
- 用 Performance 面板记录的 CPU、内存、Display FPS、Android jank 统计在改动前后的对比——录制场景和时长保持一致（例如固定“滚动 checkout 30 秒”），并用“比较两次录制”复核；
- 插件自身的稳定性（崩溃/报错频率，可用遥测或直接观察）。
