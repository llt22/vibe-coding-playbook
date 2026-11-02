# alpcanaydin/rexmod

- 结论：**值得一试**。在 Apple silicon Mac + Rex + Claude Code/OpenCode 的组合下，照 README 的三条命令装好后，用 3–5 个真实小任务跑「每轮看 Last Turn → 行级评论 → 评论随下条消息回灌」的闭环，验证是否真的减少返工；理由是它把人工复核智能体产出这件事落到了具体键位、具体存储（.git/rexmod/）和具体 hook 接法上，可照做，但属于非官方二进制 patch、单作者 30 stars、平台与宿主 app 双重绑定且有已知 Codex 多 pane 缺陷，先小范围试。
- 原文：https://github.com/alpcanaydin/rexmod
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T14:02:10.546Z

## 是什么

rexmod 是 Rex（Superlogical 出品的 agent GUI 应用）的**非官方 mod**，作用是把 Rex 变成一个「编码智能体的 harness」：

1. 你发消息给 agent 时，它用一次性 git index 对工作树打快照（不动你自己的 index）；agent 结束时再打一次。两次快照之差 = **Last Turn**，即这一轮回复到底改了什么。
2. Changes 面板（Swift dylib，右侧）显示 Last Turn / Uncommitted / Branch / 文件树；点文件在**旁边的 Neovim 面板**打开，光标落在改动行，带 LSP、补全、实时诊断。
3. 在行或选区上 `Space r` 写评论，评论存在工作树的 `.git/rexmod/`，每条绑定到它写于的那个 agent pane。
4. 评论可以随你下一条消息一起发给 agent，也可以从面板徽标立即发送。agent 回复 → 进入下一轮。

支持 Claude Code、Codex、OpenCode、Pi 四种 agent，各自用不同机制接入（hooks / server plugin + TUI plugin / extension）。附赠一个 `rexmod` skill 和 CLI，让 agent 能主动执行 `rexmod open file:line` 把文件推到你编辑器里。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Apple silicon Mac、macOS 15+、已安装并**打开过一次** Rex、有 Homebrew。

### 1. 安装

```sh
brew trust --tap alpcanaydin/rexmod   # Homebrew asks you to trust third-party taps
brew install alpcanaydin/rexmod/rexmod
rexmod-setup
```

或者一行装：

```sh
curl -fsSL https://raw.githubusercontent.com/alpcanaydin/rexmod/main/install.sh | sh
```

然后 `⌘Q` 退出 Rex 再打开。README 明确说本机不编译任何东西。`brew upgrade rexmod` 之后需再跑一次 `rexmod-setup`。

### 2. 知道安装器动了什么（排查问题时要靠这个）

README 的 “What the installer does” 列出：

- 把 rexmod 拷到 `~/Library/Application Support/rexmod`，软链 `~/.local/bin/rexmod`；
- 下载 Flow Icons 图标包；
- 编辑器：若没有 `~/.config/nvim`，把自带的 LazyVim 配置装进去；若已有 lazy.nvim 配置，只追加一个插件 spec（`lua/plugins/rexmod.lua`）；若是其它配置，则把自带配置装到 `~/.config/rexmod-nvim`，**不动你的**；
- 在 `~/.config/rex/init.lua` 里用一个 managed block 加 `⌘P`；
- 给每个检测到的 agent 装 hooks 和 `rexmod` skill，JSON 文件先备份；
- 备份官方 Rex → patch → 加一个 LaunchAgent，Rex 更新后自动重打补丁。

可选参数：`--update-rex`（先装最新官方 Rex）、`--no-patch`（不装面板）、`--no-hooks`（不接 agent）。

### 3. 装完的两个必做动作（否则 Last Turn 为空）

- Codex：启动 Codex 后执行一次 `/hooks` 信任新 hooks；
- OpenCode：插件在后台 server 启动时加载，装完要**退出 OpenCode 一次**。

验证面板是否打上：

```sh
~/Library/Application\ Support/rexmod/scripts/patch.sh --check
```

### 4. 日常使用键位

| 位置 | 键 | 作用 |
|---|---|---|
| Rex | `⌘⇧E` | 显示/隐藏面板 |
| Rex | `⌘P` | 在 agent 的仓库里找文件 |
| 面板 | 点文件 | 在编辑器面板打开 |
| 编辑器 | `Space r` | 对当前行/可视选区写评论 |
| 评论框 | `Ctrl+S` / `Esc` | 保存 / 取消 |
| 编辑器（有评论的行上） | `E` / `D` | 编辑 / 删除该条评论 |
| 编辑器 | `]r` / `[r` | 下一条 / 上一条评论 |
| 编辑器 | `Space R` | 汇总本仓库所有评论：`Ctrl+S` 发送待发项，`Ctrl+X` 删除 |

评论默认不立即发送，会以「`file:line` + 代码 + 你的批注」的短列表形式随你下一条消息带给 agent；想立刻发就用面板标题栏的评论徽标。

### 5. 跑完一轮的四步循环（这是可迁移的核心流程）

1. **Prompt**：照常跟 agent 说话；发送瞬间快照工作树。
2. **Change**：等 agent 干活，面板填出 Last Turn。
3. **Review**：点文件 → Neovim 打开在改动行 → `Space r` 逐条落评论。
4. **Feedback**：评论随下一条消息（或立即）回给 agent；agent 回复，回到第 2 步。

### 6. 排障

面板不出现：确认补丁（见上）；Rex 刚更新就等重打补丁通知后重开；日志在 `~/Library/Logs/rexmod-panel.log`；想不带面板启动用

```sh
REXMOD_PANEL_DISABLE=1
```

Last Turn 一直空：hooks 没跑起来，重跑

```sh
~/Library/Application\ Support/rexmod/scripts/install-hooks.sh
```

再按第 3 步处理 Codex / OpenCode。

面板调试（Darwin notification）：

```sh
notifyutil -p dev.rexmod.toggle
# 还有 .refresh / .snapshot / .dumpviews / .dumpchrome / .dumpheader / .dumpsidebar
```

输出落到 `~/Library/Caches/rexmod/`。

### 7. 更新与卸载

```sh
brew upgrade rexmod && rexmod-setup
```

Rex 自身：Sparkle 无法更新被打过补丁的 Rex，rexmod 关掉它的检查，改由 LaunchAgent **每小时**下载官方包、校验签名/Team ID/公证、打补丁并提示重开。立即执行：

```sh
~/Library/Application\ Support/rexmod/scripts/update.sh
```

卸载（恢复官方 Rex，移除 hooks、`⌘P` block 和文件）：

```sh
~/Library/Application\ Support/rexmod/scripts/uninstall.sh
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**
- agent 侧有 `rexmod` skill，可主动执行 `rexmod open file:line`，在它指向某处时把文件直接推到你编辑器面板——即「agent 主动安排你看什么」，而不只是它说、你自己找。
- 一个 tab 里可以开多个 agent，面板/Last Turn/评论跟随你最后聚焦的那个 agent pane；面板底部的 agent 名是切换菜单。多 agent 并行时不需要切窗口。
- agent 在编辑器/终端里干活不会改变「当前跟随哪个 pane」的判定。

**2. 任务匹配**
- 明确适配的场景：**agent 产出代码 diff、且需要人逐行复核再决定下一步**。对「不需要人看 diff」的任务（纯问答、纯生成文档）没有增益。
- 四种 agent 的接入方式不同，要分别对待：Claude Code 用 `UserPromptSubmit` / `Stop` hooks；Codex 用同样 hooks（需 `/hooks` 信任一次）；OpenCode 用 server plugin + TUI plugin；Pi 用 extension。四种都支持 Last Turn 和「评论随下条消息」。
- 编辑器侧按需装环境：打开 Go/Rust/Python/Elixir 文件时用 Mason 现场装 tree-sitter parser 和 language server。

**3. 条件供给**
- 需要：git 工作树（快照靠一次性 git index）；Rex 的 server API（panes / splits / input）；Neovim；各 agent 的 hook 权限。
- 需要**显式授权**：Codex 必须 `/hooks` 信任一次，否则 hooks 不跑、Last Turn 为空。
- 需要**重启**：OpenCode 装完要退出一次。
- 反馈通道有明确边界：评论存在 `.git/rexmod/`，每条绑定写它时的 agent pane；**Rex 之外的 agent（别的终端或 app）不会收到**。
- 已知条件缺陷：同一仓库里开两个 Codex pane 时，Codex 的 hooks 跑在一个后台 server 里，rexmod 无法判断是哪個 pane 发的消息，于是**不猜**——评论留在 pending，turn 记录不带 pane；此时要用面板的评论徽标直接粘进面板跟随的 pane。Claude Code / OpenCode / Pi 没有这个限制。

**4. 主动推进**
- 工作流一侧是**事件触发**而非时间触发：`UserPromptSubmit` 快照、`Stop` 再快照，自动产出 Last Turn。人不需要记得手动 `git diff`。
- 工具自维护一侧是**时间触发**：LaunchAgent 每小时检查并重打 Rex 补丁。这属于工具自身可用性的主动推进，不是工作任务的主动推进。
- 原文没有「到点自动跑一轮 agent」之类的调度能力，别指望它做定时任务。

**5. 效果验证**
- 原文**没有给任何效果数据或指标**。可依据的只有结构：评论是 `file:line` + 代码 + 批注的短列表，且与后续消息同路发出，所以「agent 下一轮是否针对这条评论改」是可观察的。具体指标见最后一节（由本报告提出，非原文）。

## 与已有做法的关系

清单中相关条目：**Claude Code（adopt）**、**OpenCode（watch）**。

- rexmod 不替代它们，是**套在它们外面的复核壳**。它对 Claude Code 的接入点就是 `UserPromptSubmit` / `Stop` 两个 hook——也就是说，清单里已 adopt 的 Claude Code 是它的前置依赖，不是竞争项。
- 对 OpenCode：rexmod 已提供 server plugin + TUI plugin 的接入，且 README 把 OpenCode 与 Claude Code 并列为「Last Turn + 评论回灌」全支持。这可以作为 OpenCode 生态成熟度的一个正面信号，但一条第三方 mod 的支持不等于 OpenCode 本身达到 adopt 标准，**不改变清单里 watch 的判定**。
- 与本项目已关注方向的差别：常见的 agent 复核做法是「人肉 `git diff` + 在聊天里打字描述问题」。rexmod 的增量有三点可搬：① 按「一轮」切 diff（Last Turn），而不是按「当前全部未提交」；② 评论锚在 `file:line` 并带原代码，不是自然语言指代；③ 评论与消息走**同一条输入通道**回灌，agent 不需要额外去读一个文件。
- 清单中没有「diff 可视化 + 行级评论回灌」这一环的现成条目，rexmod 是目前看到的唯一具体实现。

## 证据与局限

**原文给出的具体内容（可信度较高，属于实现细节而非宣传）**
- 完整的安装/更新/卸载命令、安装器逐条副作用清单、键位表、排障命令与日志路径。
- Mermaid 架构图：panel(dylib) → CLI → Rex server API / git / editor socket。
- Last Turn 的实现说明：用一次性 git index 写两次快照，**你的 index 不受影响**。
- 评论落盘位置：工作树的 `.git/rexmod/`（turns · comments）。
- 主动写出的**自身缺陷**：两个 Codex pane 同仓库时无法判定归属，选择留 pending 而不是猜；评论不会发给 Rex 外的 agent；Sparkle 更新不了打过补丁的 Rex，需自建更新通道。愿意写这些的项目，其描述通常比纯宣传稿可信。

**只是作者主张、没有证据**
- 「looks native」「out of the way」「一分钟上手」这类体验性描述；demo 视频是**加速播放**的一分钟，看不出真实耗时。
- 没有任何数据：没有评审提效数字、没有返工率、没有用户案例、没有对照。
- 「agent knows the harness」只是说装了 skill，没说实际触发频率或效果。

**适用条件与风险（这些直接决定只给 try）**
- 硬性平台限制：**Apple silicon + macOS 15+ + 已安装 Rex + Homebrew**。Windows/Linux/Intel Mac 全部不适用。
- Rex 是第三方商业应用，rexmod 是**未关联官方的 mod**，做法是给 Rex 可执行文件加 weak load command 并 ad hoc 重签名，同时**关掉 Sparkle 自动更新**改用自己的每小时更新 + 重打补丁。这引入了「Rex 更新后可能失效」的持续维护成本，也意味着安全边界由这个 mod 承担。
- 单作者、30 stars，无第三方验证，无版本兼容矩阵。
- patch 与重签名在企业受管设备上可能直接被拦。

## 怎么试、怎么验证

**最小试用（建议 1–2 周，别一上来全组铺开）**
1. 选一台符合前提的 Mac、**一个真实仓库**（有 git、有测试可跑）。
2. 只装 Claude Code 一个 agent（`--no-hooks` 起步可先不接其它 agent），装完按第 3 步确认 `/hooks`、`patch.sh --check` 通过。
3. 挑 3–5 个**改动面 1–3 个文件**的真实小任务（修 bug、加小功能、重构一段），不要用玩具 demo。
4. 每个任务严格执行第 5 节的四步：先看 Last Turn 再看 Uncommitted，对每处可疑改动**至少留 1 条行级评论**（`Space r`），然后才发下一条消息。
5. 记录每轮数据（见下），跑满 3–5 个任务后再决定留不留。

**对照组**：同样类型的任务，用「原生 Rex / 终端 + 手工 `git diff` + 在聊天里文字描述」的方式做，其余条件（模型、仓库、任务规模）保持一致。

**判断有没有改善的指标（本报告提出，原文未给）**
- **回灌命中率**：发出的评论中，有多少条在 agent 下一轮被明确回应或改掉。低于一半说明格式或措辞有问题，不是工具问题。
- **从「agent 说完成」到「人确认可用」的时长**：与对照组比。
- **同一处返工次数**：同一 `file:line` 被反复改的次数，应下降。
- **漏看率**：事后完整 diff 里发现的、review 时没注意到的改动行数。这是 Last Turn 是否真的帮你看全的核心指标。
- **Last Turn 为空的比例**：hook 可靠性。若明显 >0，先修 hook 再谈效果。
- **harness 自身成本**：安装 + 排障 + Rex 更新后重打补丁花的时间。若两周内超过它省下的时间，退回 watch。

**升级到 adopt 的条件**：在多个真实仓库、至少两种 agent（如 Claude Code + OpenCode）、连续四周稳定运行，回灌命中率与漏看率相对对照组有明确改善，且 Rex 更新造成的中断可接受。任一不满足，维持 try。

**降级信号**：频繁出现 Last Turn 为空或归属错乱；Rex 每次更新都要手工救；团队里多数人不是 Apple silicon Mac——那就把结论改为 study，只保留「按轮切 diff + 行级评论 + 同通道回灌」这个模式，用现有工具自建等价流程（此句为迁移推断，原文未给出跨平台等价做法）。

> 说明：本次输入为仓库 README 全文（含架构图、安装脚本副作用清单、键位表、FAQ），不是抓取失败；但 README 属项目自述，除实现细节外无第三方验证数据，故结论停在 try。
