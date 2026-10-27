# daveebbelaar/bama

- 结论：**值得一试**。在一台满足 macOS 26+/Xcode 26+ 的机器上，按单一安装路线装 BAMA，用 specs/ 里最小的 build plan 跑到 milestone 1，验证"一个故事一个 commit + 每页亮暗快照 + 可勾选验收标准"这套循环是否真能减少人工干预；它的价值在于把逆向复刻、设计还原、回归验证拆成可调用的 skill 并给了可复制的安装与提示词，但目前只有 README 证据、无任何产出数据。
- 原文：https://github.com/daveebbelaar/bama
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-27T00:57:53.256Z

## 是什么

BAMA（Build Any Mac App）是一套 21 个 agent skills 的集合，目标是把一个原生 macOS 应用从想法做到 Dock：Swift + SwiftUI、本地数据、全程不打开 Xcode GUI。安装方式是 Claude Code / Codex plugin 或 `npx skills`，用 `/bama` 作为路由器。

它的核心流程是三段：

1. **Clone** — agent 打开你喜欢的那个 app，给每个界面截屏，写出一份 screen index。
2. **Plan** — 把界面转成带可勾选验收标准的用户故事，按里程碑分组。
3. **Build** — 每个 commit 实现一个故事；每次 commit 前对每个页面做亮色/暗色两套快照并跑测试。

技能按 Start / Plan / Code / Design / Ship 五个阶段组织（app-brief、new-mac-app、research、clone、user-stories、swift-swiftui、os-integrations、performance、improve-architecture、agent-cli、ux-design、mac-design、design-system、layout-grid、design-kit、design-from-app、app-icon、build-and-verify、test-mac-app、improve-loop、bama）。另附 `specs/` 里 12 份小型 Mac 应用 build plan（窗口吸附、窗口切换器、启动器、剪贴板历史、截图、录屏等），来自作者自己的菜单栏应用 Onyx。

## 具体做法（编号步骤）

**前提（缺一不可）**：macOS 26 或更高；Xcode 26 或更高（只为 Swift 6.2 工具链，全程不打开）；一个支持 skills 的 agent（Claude Code、Codex、Cursor、Gemini CLI）；若要用 `clone` 抓原生应用界面，需要 computer use（Claude Pro 或 Max）。

1. **安装，每个 agent 只选一条路线**（README 明确说两条路线并用会把每个 skill 装两遍）。

   通用：
   ```bash
   npx skills@latest add daveebbelaar/bama
   ```

   Claude Code：
   ```text
   /plugin marketplace add daveebbelaar/bama
   /plugin install bama@bama
   ```

   Codex：
   ```bash
   codex plugin marketplace add daveebbelaar/bama
   codex plugin add bama@bama
   ```

   其他 agent（Cursor、Gemini CLI、Copilot 等），可全装或只装一个 skill：
   ```bash
   npx skills@latest add daveebbelaar/bama -a <agent>
   npx skills@latest add daveebbelaar/bama --skill=clone
   ```

   手工方式（把每个 skill 链接进 ~/.claude/skills 和 ~/.agents/skills）：
   ```bash
   git clone https://github.com/daveebbelaar/bama.git
   bama/scripts/link-skills.sh
   ```

2. **不确定从哪开始就输入 `/bama`**：路由器会看你的项目状态，挑出下一个该用的 skill。

3. **起点二选一**：`app-brief` 把想法压成一页 brief；或 `new-mac-app` 从模板起一个能跑的工程（Swift package、SwiftData、build script、snapshot mode、git）。

4. **逆向你想要的产品**：用 `clone` skill，靠 computer use 或浏览器给目标 app 每个界面截屏，产出 screen index。可以直接下这种指令：
   ```text
   Clone my to-do app as a native Mac app.
   Screenshot every screen, write the user stories, and build milestone 1.
   ```

5. **规划**：`research` 并行起 market / users / features / design / macOS APIs 几个研究者；`user-stories` 产出带可勾选验收标准、按里程碑分组的 backlog。

6. **设计放在写码之前**：先用 `ux-design` 定命名、流程、每个功能在哪里打开（inline / popover / sheet / window）、文案、可访问性；再用 `mac-design` 处理 Liquid Glass、布局、工具栏、菜单、键盘、字体、暗色模式。要自有视觉体系时用 `design-system`（设置里可选强调色 + 一套 token + 一页规则）和 `design-kit`（三层 token、字体、图标集、每个部件的每个状态、自定义窗口 chrome、部件画廊）。

7. **把对齐变成可失败的检查**：`layout-grid` 用 4 pt 网格配三道检查——代码 lint、snapshot mode 里的布局探针、网格叠加层，错位时直接失败。

8. **照着截图还原外观**：`design-from-app` 从截图量尺寸、字号、颜色，然后逐像素比对直到吻合；`app-icon` 用 Icon Composer 文件写 Liquid Glass 图标，在每种外观下检查。

9. **逐故事实现**：`swift-swiftui` 管 Swift 6 并发、状态、SwiftData、AppKit 桥接、编译错误；`os-integrations` 管全局快捷键、菜单栏、浮动面板、窗口控制、截屏、Shortcuts、URL scheme、CLI、权限；`performance` 坚持"先测量再修"（主线程、GPU 合成、图像、命令行 Instruments）。

10. **每个 commit 的固定循环**：`build-and-verify` 构建、安装、对每个页面做亮/暗快照并实际看图；`test-mac-app` 上 Swift Testing + app 内自测 + 一个 agent 能驱动的 debug bridge；`improve-loop` 按 backlog 一个故事一个 commit 往前推，直到里程碑完成。架构随规模变化时用 `improve-architecture`：找热点，一次一步重构，用行为不变来证明。

11. **可选：让 app 自己被驱动**。`agent-cli` 给你的 app 加命令行和 MCP server，让 Claude Code、Codex 或脚本直接驱动它。

12. **没有想做的 app 就先抄作业**：从 `specs/` 挑一份 build plan 拷进空文件夹，然后：
    ```text
    Build the app in window-snapper.md with BAMA.
    ```

## 对应的研究问题

- **能力发现**：把"截屏目标应用 → 写界面索引 → 转用户故事 → 逐故事构建 → 快照回归"这条原本靠人手动做的逆向复刻流程整体交给 agent；此外还有设计还原（逐像素比对）、图标生成、架构重构、给 app 自建 CLI/MCP 接口这几项通常不会想到交给 AI 的工作。
- **任务匹配**：明确按阶段（Start / Plan / Code / Design / Ship）把不同工作分派给不同 skill；不绑定单一模型厂商（Claude Code、Codex、Cursor、Gemini CLI 均可）；开发走 Swift package + 命令行，避开 Xcode GUI；snapshot mode 与 debug bridge 是专门为 agent 设计的操作接口。
- **条件供给**：环境侧需要 macOS 26+、Xcode 26+、支持 skills 的 agent，`clone` 还需要 computer use 权限。给 agent 的信息与工具包括：可运行模板工程、specs 文档、可勾选验收标准、screen index、snapshot mode、debug bridge、测试套件、可选的 CLI/MCP。
- **主动推进**：`improve-loop` 按 backlog 一个故事一个 commit 持续推进直到里程碑完成；`bama` 路由器根据项目当前状态决定下一步调哪个 skill。原文未涉及由时间或外部事件触发的机制。
- **效果验证**：可勾选验收标准；每个 commit 前对全部页面做亮/暗快照并由 agent 亲自看图；Swift Testing + app 内自测；布局 lint 在错位时失败；设计还原做逐像素比对；重构以"行为不变"为通过条件。

## 与已有做法的关系

- **Claude Code（adopt）**：BAMA 直接以 Claude Code plugin 形式分发，`/plugin marketplace add`、`/plugin install`、`/bama` 都是 Claude Code 的用法。
- **Agent skills（adopt）**：BAMA 本身就是 21 个 skill 的集合，是这个概念的一个完整、按阶段编排的实例。
- **mattpocock/skills（study）**：README 明确说 skill 格式与写作规则沿用 Matt Pocock 的 `skills` 和其中的 `writing-for-agents` skill，属于方法论来源而非功能重叠。
- **skills.sh（try）**：作为"其他 agent"的通用安装通道（`npx skills@latest add ... -a <agent>` / `--skill=`）。
- **Cursor（watch）**：只在"Any other agent"里被列为可安装目标，没有专门验证或说明。

## 证据与局限

- **材料只到 README**：21 个 SKILL.md 的具体内容、脚本、模板、`snapshot mode` 与 debug bridge 的实现都没有出现在材料里。上面步骤是照 README 的描述整理的可执行骨架，未能核实 skill 内部是否真按此执行。
- **没有任何产出数据**：README 未给出构建成功率、耗时对比、生成 app 的质量评估或使用案例，只有"21 skills""12 build plans"这类数量声明。
- **门槛与适用范围硬**：macOS 26+、Xcode 26+、Swift 6.2；`clone` 原生应用需 computer use（意味着付费的 Claude Pro/Max）；只覆盖 macOS 原生应用开发这一个窄领域，跨领域迁移需要自己重写 skill。
- **存在推广内容**：README 中插入作者自家产品 Glaido 的推广，作者自述"we are biased"，这部分应按宣传处理。
- **属于作者主张而非证据**："一个故事一个 commit""每次 commit 前全页快照"能提升质量，是设计理念，无对照实验支撑；`/bama` 路由器能否准确判断项目状态亦无验证。
- 仓库 41 stars，属早期项目，接口与 skill 划分可能变动。

## 怎么试、怎么验证

**最小试用（1–2 天）**：一台满足 macOS 26+/Xcode 26+ 的机器，装 Claude Code，只用一条路线安装 BAMA；从 `specs/` 挑最小的那份 build plan（如 window-snapper）拷进空文件夹，让 agent 跑到 milestone 1。若不想做新 app，退一步只跑 `clone` + `user-stories` 两段，看 screen index 和验收标准是否可直接用。注意不要两条安装路线并用。

**判断是否改善的指标**：

- milestone 1 内每个故事是否一次通过它自己的验收标准（返工次数）。
- commit 前快照是否稳定生成、是否真的抓到过视觉回归（记录抓到的次数，0 次说明这道检查可能是形式）。
- agent 能否自己跑通构建—安装—快照—测试这条链，需要人介入的次数与原因分布。
- 从空文件夹到 milestone 1 的总时长与人工投入小时数。
- `improve-architecture` 重构后"行为不变"是否可被既有测试与快照证实。

**对照方式**：同一需求用 BAMA 和不用 BAMA 各做一遍（或与团队现有做法对比），比较人工介入次数、返工次数、视觉回归数量、总时长。若 BAMA 组的介入次数没有下降，说明这套 skill 在当前团队/项目上不成立，降级为 study 只借鉴"验收标准 + 每 commit 全页快照 + 一故事一 commit"的流程骨架即可。
