# josefchen/muster

- 结论：**值得一试**。建议小范围试用：在 macOS 14+ 上用 `brew install --cask josefchen/tap/muster` 装好，只对 Claude Code 开启「Answer prompts from Muster」，用「代理开始等待→人察觉→回答完成」的耗时和是否需要切换窗口来判断收益；理由是原文给出了可直接照做的安装命令、逐代理开关、Codex 信任 hook、快捷键与自测脚本，但它只覆盖 macOS 和 Claude Code/Codex/Cursor 三家，改善幅度是作者主张、没有对照数据。
- 原文：https://github.com/josefchen/muster
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-14T10:01:45.367Z

## 是什么

Muster 是一个免费开源的 macOS 菜单栏应用，用来盯住同时运行的多个编码代理会话（Claude Code、Codex、Cursor）：某个代理开始等你时，屏幕顶部出现一条提醒并一直停留到被回答；你可以不切换窗口直接批准命令、选择选项、批准计划。它读取各代理自己已经写下的会话文件（只读），不改动代理本体；开启代答时会往代理自己的设置里加一个 hook，关闭时精确移除这一条。MIT 许可，独立于 Anthropic、OpenAI、Anysphere。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. 前提：一台 macOS 14 或更高版本的机器（Apple silicon 或 Intel）。菜单栏的 Liquid Glass 外观需要 macOS 26。
2. 安装，二选一。终端方式：

```bash
brew install --cask josefchen/tap/muster
```

或从 releases 下载 `Muster.dmg` 拖进 Applications。

3. 逐个代理开启「代答」能力：打开 **Settings → Answer prompts from Muster**。它会给该代理自己的设置文件加一个 hook，关闭时会精确移除同一条。各代理能回答的内容不同：
   - **Claude Code**：权限请求、多选题、计划批准。
   - **Codex**：审批请求；需先在 Codex 里用 `/hooks` 信任一次。
   - **Cursor**：不代答，只把提示在 Cursor 里打开。
4. 记住默认快捷键（两个开关都能在 Settings 里改）：
   - ⌥ Tab：切换会话，最紧急的在前；轻点步进、松手落入它的窗口或它所在的终端，也可以点某一行。
   - ⌥ ↩ 允许 · ⌥ ⌫ 拒绝 · ⌥ 1–9：回答提醒或切换器里的那个提示。
   - ⌥ ↓ 展开提醒详情（原因、完整命令、每个选项及其备注）· ⌥ ↑ 收起。
   - ⌃ ⌥ Space：搜索所有会话，默认覆盖最近三小时，并显示每个会话的 token 与 API 费率成本。
   这些键只在屏幕上有提示或切换器时被接管，你在别的应用打字时会放开，所以在编辑器里照常可用。
5. 可选，用脚本或自动化触发（URL scheme）：

```text
muster://search
muster://next
muster://settings
muster://welcome
muster://whats-new
```

6. 可选，使用自己的价格：**Settings → Use my own prices…**，会写这个文件：

```text
~/Library/Application Support/Muster/pricing.json
```

   默认内置的是标准 API 层的公开牌价并在 Settings 里标注日期；Claude 按消息计价（含子代理），5 分钟与 1 小时缓存写入分开计算；Codex 按其运行总量计价，未套用 OpenAI 的长上下文档位，所以数字是下限；Cursor 不在磁盘上记录 token 数。
7. 可选，自己构建与自测（前提：已装 Xcode 命令行工具等构建环境，README 只说按 `CONTRIBUTING.md`）：

```bash
git clone https://github.com/josefchen/muster.git && cd muster
./build.sh            # build, install to ~/Applications, launch
./test.sh             # reader tests against fixture files
scripts/e2e.sh        # end-to-end: the real app against a fake home folder
```

   `scripts/e2e.sh` 用假 home 目录驱动真实应用（转录、hook 请求、切换器、deck、提醒），不碰你自己的代理和设置；加 `--soak [minutes]` 压测 CPU 与内存，加 `--ui` 会回放真实按键和点击（运行期间会接管键盘）。

安全与回退前提（README 明确写了这几条）：hook 会保留文件旁的 `.muster-original`（Muster 第一次改动前的原文件）和 `.muster-backup`（最近一次改动前的文件）；被符号链接的设置文件仍保持为链接；Muster 解析不了的文件不动。Claude 的原生对话框与 Muster 同时可用，先回答的那个生效。Muster 没运行时，代理照常询问。Hooks 通过 `127.0.0.1` 与 Muster 通信，带每安装一份的 token。所有文件读取都是只读的。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：把「代理在等你」从需要人自己去翻窗口，变成系统主动报出来，并能在菜单栏就地完成权限批准、多选题作答、计划批准；⌃⌥Space 还能按会话回看最近三小时的 token 与 API 费率成本，这是多数人不会主动去翻的会话账本。Cursor 只支持跳到提示，不算代答。
2. **任务匹配**：适合「一次并行跑多个编码代理、人被卡在审批环节」的协作方式。三家支持深度不同：Claude Code 最全（权限/多选/计划批准），Codex 次之（审批），Cursor 只打开提示。不适合单会话、非 macOS、或本来就不需要人工介入的流水线。
3. **条件供给**：需要 macOS 14+；安装后逐代理在 Settings 里开启；Codex 需先在 Codex 里 `/hooks` 信任一次；读取来源是 `~/.claude/projects` 的转录与 Claude 会话列表、`~/.codex/state_*.sqlite` 的线程与 rollout 日志、Cursor 的 Agents 窗口聊天列表与代理转录——全部只读；自定义价格写到 `~/Library/Application Support/Muster/pricing.json`。反馈闭环是「提醒 → ⌥↓ 看原因/完整命令/各选项备注 → 一键回答」，答案直接回传给代理。
4. **主动推进**：由文件系统事件触发重扫，最多每秒一次；转录增量读取，只读上次之后新增的字节。代理一旦等待，提醒出现并停留到被回答。这属于「状态触发人」的持续机制，不是让代理自己继续干活。
5. **效果验证**：README 给了可核对的资源口径——2 MB 下载、十个代理同时在忙时约 0.4% CPU 与 20 MB 内存；成本估算按标准 API 公开牌价（Claude 按消息含子代理并区分 5 分钟/1 小时缓存写入，Codex 为下限，Cursor 无 token 数据）。这些可用来核对自身开销与成本，但 README 没有给出「节省了多少等待时间」的量化数据。

## 与已有做法的关系（对照给出的清单条目）

清单中有 **Claude Code（tool，adopt）** 和 **Cursor（tool，watch）**。Muster 是这两者的外围增强，而不是替代：它不改动代理，只往其设置里加一个 hook（关闭即精确移除，并留有 `.muster-original` / `.muster-backup`），因此对已有 Claude Code 工作流是叠加。对 Cursor 只是「把提示在 Cursor 里打开」，价值有限。

README 自己对比了「为什么不用系统通知」：Claude Code 在某些终端本身能通知，几行设置就能加声音或横幅；但通知只告诉你出了事，多会话下仍要自己判断是哪一个、找到它的窗口、再把答案打进去。这是作者主张，不是实测结论。

## 证据与局限

- README 给出的硬数据：2 MB 下载；十个代理忙时约 0.4% CPU、20 MB 内存；重扫最多每秒一次、转录增量读取；成本计价口径（Codex 为下限、Cursor 无 token 记录）。这些都是作者自述，仓库未附第三方基准。
- 「通知不够用、要能就地回答」是作者主张，没有对照实验。
- 隐私声明（无账号、无分析、唯一网络请求是点击检查更新或开启每日检查时向 GitHub 问最新版本；提示服务器只监听 `127.0.0.1` 且需要 token）无法从 README 独立验证。
- 适用条件：仅 macOS 14+；仅覆盖 Claude Code / Codex / Cursor 三家；Cursor 只能跳转不能代答；hook 机制依赖代理自身的 hook 能力，Codex 需要手动信任一次。
- 项目规模小（73 stars），迭代快，URL scheme、快捷键与设置项可能变化。原文是仓库 README，不是实测报告。

## 怎么试、怎么验证

最小试用：在一台 macOS 14+ 机器上 `brew install --cask josefchen/tap/muster`，只对 Claude Code 打开 **Settings → Answer prompts from Muster**；开两个并行的 Claude Code 会话，制造一个权限请求和一个多选题，练 ⌥↓ 展开、⌥↩ 允许、⌥1–9 选选项。

可自己测、不依赖 README 数字的指标：

- 从代理开始等待到人察觉的时间（试用前后各记几次）。
- 从察觉到回答完成的时间，以及期间是否切换过窗口或终端。
- 是否出现重复回答或冲突（Claude 原生对话框与 Muster 并存时「先回答的生效」）。
- 关掉开关后，代理设置文件是否精确还原（对照 `.muster-original`），符号链接是否仍是链接。
- 用 ⌃⌥Space 的 token/成本视图，看多会话时段的成本是否可见、量级是否与账单吻合（Codex 按作者说明是下限，Cursor 无数据）。
- 若在乎资源占用，跑 `scripts/e2e.sh --soak [minutes]`，看十个代理下 CPU 与内存是否仍在约 0.4% / 20 MB 量级。

判断改善：若「察觉—回答」耗时明显缩短、回答时不再需要离开当前窗口、且关闭后设置文件干净还原，就值得纳入多代理流程；若你通常只跑一个会话、不用 macOS，或以 Cursor 为主（只能跳转），收益有限。
