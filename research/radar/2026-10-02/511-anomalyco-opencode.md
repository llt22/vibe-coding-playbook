# anomalyco/opencode

- 结论：**值得一试**。可先在一台开发机上按 README 给的 brew/npm 命令安装 OpenCode，用 Tab 在 build 与 plan 之间切换，把「读陌生代码库、出改动计划」固定交给只读的 plan agent，确认后再切到 build 执行。理由：README 直接给出了可复制的安装命令和 plan agent 的权限行为（默认拒绝文件编辑、执行 bash 前询问），这套「先只读规划、再放权编辑」的分工流程可以照做；但仓库内容只到入口层，配置细节与效果未给，需自行验证。
- 原文：https://github.com/anomalyco/opencode
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T04:27:14.615Z

## 是什么

OpenCode（仓库 `anomalyco/opencode`）是自称「The open source AI coding agent」的开源编码智能体，提供终端界面和桌面版（BETA）。README 给出的实质内容有三块：

- 多包管理器的安装方式与安装目录规则；
- 内置两种可切换的 agent：`build`（默认，开发工作，全权限）和 `plan`（只读，用于分析和代码探索）；
- 一个内部使用的 `general` 子代理，用于复杂搜索和多步任务，可用 `@general` 调用。

README 本身是入口文档，详细配置指向外部站点 `opencode.ai/docs`（本次未抓取到）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. 前提：先清理旧版本。README 明确提示「Remove versions older than 0.1.x before installing」。

2. 安装（任选一种，按平台和习惯选）：

```bash
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-bin               # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run nixpkgs#opencode           # or github:anomalyco/opencode for latest dev branch
```

3. 若需要指定安装位置（仅对安装脚本生效），按 README 给出的优先级选择，优先级顺序为：
   1. `$OPENCODE_INSTALL_DIR` — 自定义安装目录
   2. `$XDG_BIN_DIR` — 符合 XDG Base Directory 规范的路径
   3. `$HOME/bin` — 标准用户二进制目录（存在或可创建时）
   4. `$HOME/.opencode/bin` — 默认回退

```bash
# Examples
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

4. 启动后按 `Tab` 键在 `build` 与 `plan` 两个内置 agent 之间切换（前提：已完成安装）。

5. 把「读陌生代码库、规划改动」这一步固定交给 `plan` agent。README 对其行为的描述是：
   - 默认拒绝文件编辑；
   - 运行 bash 命令前会询问权限；
   - 适合探索不熟悉的代码库或规划改动。

6. 确认计划后切到 `build`（默认、full-access）执行实际开发改动。

7. 遇到复杂搜索和多步任务时，在消息中用 `@general` 调用 `general` 子代理（README 说明它主要供内部使用）。

8. 需要图形界面时安装桌面版（README 标注为 BETA）：

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

下载页：`https://github.com/anomalyco/opencode/releases` 或 `https://opencode.ai/download`。平台包名：`opencode-desktop-mac-arm64.dmg`、`opencode-desktop-mac-x64.dmg`、`opencode-desktop-windows-x64.exe`、Linux 用 `.deb` / `.rpm` / `.AppImage`。

9. 需要更细的配置（模型、协作方式等）时，按 README 指引访问 `https://opencode.ai/docs` 与其 agents 文档 `https://opencode.ai/docs/agents`——这些内容不在本次输入中。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：依据有限。README 只说明 agent 可承担「development work」（build）与「analysis and code exploration」「planning changes」（plan）。可据此把「读懂陌生代码库、评估改动范围、出改动计划」这类通常自己动手的读代码工作显式交给 AI，但 README 没有列举更多未被想到的能力。
- **任务匹配**：本线索给出了明确的一条匹配规则——探索陌生代码库 / 规划改动 → `plan`（只读、bash 需授权）；实际开发 → `build`；复杂搜索与多步任务 → `@general` 子代理。README 未涉及模型选择。
- **条件供给**：只写到权限层面——`plan` 默认拒绝文件编辑、执行 bash 前询问权限；`general` 用于复杂搜索和多步任务。README 没有说明需要提供哪些上下文信息、项目文件或反馈。
- **主动推进**：无依据。README 未提及任何时间、事件或状态触发的持续执行机制。
- **效果验证**：无依据。README 未给出任何指标、对照或验证方法。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中已有条目 **OpenCode**（kind: tool，status: watch）。本线索正是该工具的仓库 README，可作为把该条目从 `watch` 推进到 `try` 的依据：它补上了可复制的安装命令和 `build`/`plan` 权限分工。但 README 不含效果数据，不足以支撑 `adopt`，也不能据此判定它比其他 agent 工具更好。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的可照做内容（来自 README 正文）**：
- 完整安装命令列表（curl 脚本、npm/bun/pnpm/yarn、scoop、choco、brew tap 与官方 formula、pacman、paru、mise、nix）及「先卸载 0.1.x 之前版本」的提示；
- 安装脚本的目录优先级四档与两段示例命令；
- 内置 agent 列表、`Tab` 切换、`plan` 的默认权限行为、`@general` 调用方式；
- 桌面版下载平台与包名、两条安装命令。

**只是主张或无法在正文验证的内容**：
- 「The open source AI coding agent」是自我描述，README 未给许可证、代码规模或架构说明；
- 输入元数据给出 211212 stars，README 正文未提及该数字，且该量级明显异常，应自行到仓库页面核实；
- 「Ideal for exploring unfamiliar codebases or planning changes」是作者对 plan agent 适用场景的主张，没有案例或对比支撑。

**局限**：
- README 是入口文档，配置细节、模型接入、提示词、协作流程都在外部 `opencode.ai/docs`，本次未抓到，无法提炼；
- 没有任何基准、案例或效果数据；
- 桌面版明确标注 BETA；
- 适用条件：能使用包管理器（brew/npm/scoop 等）的 macOS / Linux / Windows 开发机；README 提示需先清掉 0.1.x 之前的旧版本。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式**（1 台机器、1 个仓库、1 次对照即可）：
1. 在个人开发机上按上文任一命令安装，先清掉 0.1.x 之前的旧版本。
2. 选一个自己**不熟悉**的中小型仓库，交给 `plan` agent 做同一件事：「定位 X 功能的实现位置，并给出改动计划」。全程不要切到 `build`。
3. 人工核对：它指出的文件/函数是否真的命中。
4. 确认计划后切到 `build` 执行同一改动。
5. 对照：另取一个同量级任务，跳过 `plan`，直接用 `build` 从零做，记录差异。

**判断有没有改善的指标**：
- plan 阶段定位准确率（人工核对命中/未命中）；
- 计划返工次数（需要你纠正几次才可用）；
- 从开始到「首个可运行的改动」的耗时；
- 误操作风险：`plan` 因默认拒绝编辑、bash 需授权而拦下的次数（拦得多说明放权前确实起到闸门作用）；
- build 阶段的回滚或重做次数（若比不用 plan 时更少，说明前置规划有价值）。

若上述指标没有改善，或 plan 的定位频繁失准，则应退回 `watch`，等看过官方 docs 后再判断。
