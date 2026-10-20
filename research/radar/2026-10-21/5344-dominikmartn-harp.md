# dominikmartn/harp

- 结论：**值得一试**。值得在 macOS 上小范围试用 Harp，把多个 Claude Code / Codex 长任务并排跑，并用侧栏状态提示减少“哪个会话在等我”的切换成本；但它是非官方 Warp 分支、登录未测试、指标全靠自建，所以先按最小验证跑一轮再决定是否长期使用。
- 原文：https://github.com/dominikmartn/harp
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-20T16:40:20.238Z

## 是什么

Harp 是开源终端 Warp 的非官方 fork（AGPL-3.0，仅 macOS），把 Warp 的标签栏换成一条为“长时间运行的编码 agent”设计的侧栏，其余部分保持上游不变。核心增量是：

- **会话状态一览**：每一行显示对应的 Claude Code / Codex 会话是 working、waiting for you 还是 done，未读有标记；圆点表示后台任务仍在跑，月亮表示被你搁置的标签页；Cmd+R 重命名。
- **固定分组**：标签可放进命名分组；开启 tmux 集成后，分组与顺序存在 tmux 会话上，重启后仍在，其他 tmux 客户端看到同一布局。
- **额度环**：页脚每个 provider 两个环（5 小时窗口 + 周额度），数字来自一个本地 JSON 文件，由你自己的工具维护，Harp 不主动抓取。
- **手机友好的 tmux**：附着到 tmux 的标签跟随会话（名字、分组、已读、inactive 标志）；别处（例如手机 ssh）启动的会话可用命令请求一个标签页。

它自己不加服务器；上游 Warp 的 AI / 云功能（agents、Warp Drive、会话分享、登录）仍按原样连 Warp 的服务器。README 明确说“通过 Harp 登录未经测试”。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **安装（前提：macOS）。** 从 Releases 下载最新 `Harp-<version>.dmg`，拖进 Applications。它有独立 bundle id（`com.dominikmartn.Harp`）、URL scheme（`harp://`）和设置目录（`~/.harp`），可与原版 Warp 并存、不共享数据。

2. **或从源码构建（前提：macOS + `rust-toolchain.toml` 指定的 Rust 工具链）。**

```sh
./script/bootstrap   # one-time: toolchain and build dependencies
./script/run         # builds target/debug/bundle/osx/Harp.app and launches it
```

   说明：`script/macos/run` 会用钥匙串里第一个 “Apple Development” 身份签名，失败则退回 ad-hoc 签名；可公证的发布 DMG 由 `script/release_macos` 产出（见 `--help`）。提交改动前跑 `./script/presubmit`（format、clippy、tests）。

3. **打开扩展（前提：已安装并能启动 Harp）。** 扩展默认关闭，在 `~/.harp/settings.toml` 中开启，文件变化时应用会自动重载：

```toml
[integrations.limit_rings]
enabled = true
file = "~/.cache/limit-rings.json"

[integrations.tmux]
enabled = true
```

4. **喂额度数据（可选，前提：你有办法定期生成该 JSON）。** 按 `docs/limit-rings.md` 的格式写 `integrations.limit_rings.file` 指向的文件；Harp 只读不抓。相关默认值：`enabled=false`、`file=""`（`~` 指家目录）。

5. **接入 tmux（可选）。** 开启 `integrations.tmux.enabled` 后启用 tmux 同步（名字、分组、顺序、标志、接管会话）和 tmux 内的 agent 检测；**每 10 秒轮询一次**。若想自定义改名/分组逻辑，可配置 `integrations.tmux.session_script`，它会被这样调用：

```text
<script> rename <shell_pid> <group> <title>
<script> group <session_id> <old_group> <new_group>
```

6. **从别处接管会话（可选，前提：该会话跑在 tmux 里）。** 在异地的 tmux 会话中执行：

```sh
tmux set-option @warp_adopt 1
```

7. **上报 Claude Code 后台任务（可选）。** 使用仓库内 `integrations/claude-code` 提供的 Claude Code hook，把后台任务状态报给侧栏（按其 README 配置）。注意：`agents.third_party.should_render_cli_agent_toolbar` 默认 `false`，关掉后需通过 Claude Code 的 plugin marketplace 更新 Warp 的 Claude Code 插件。

8. **调整菜单密度（可选）。** `appearance.vertical_tabs.full_tab_menu = false` 把标签/分组菜单精简到只留必要项（也可在 Settings > Appearance > Tabs 改）。

9. **做状态准确性核查（可选，开发开关）。** 启动时设置环境变量：

```sh
WARPOSS_STATUS_TRACE=1
```

   每一行显示状态的每次变化都会以 `[status-check]` 行写进 `~/Library/Logs/harp.log`，可用于对照 agent 的 transcript 做回归检查。另有 `WARPOSS_SKIP_LOGIN=1`（测试用户启动、所有认证请求失败，供无登录自动化跑）和 `WARP_DATA_PROFILE=<name>`（debug 构建，数据放 `~/.harp-<name>`）。

10. **被故意移除的东西**（避免误以为是 bug）：侧栏布局下标签栏的搜索框、视图选项、标签配置按钮（新标签来自 Cmd+T、双击或侧栏空白处右键），侧栏分隔条选项，标题栏面板开关。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**
原文没有给任务清单或能力边界，只给了一个前提性判断：编码 agent 已经会“长时间运行”，因此需要按状态而非按标签页来管理。可提炼的能力线索是“并行跑多个 CLI agent”本身——但哪些任务值得并行、并行后质量如何，原文没有依据。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
有间接依据：侧栏把会话分为 working / waiting for you / done / 后台运行 / 搁置，说明它针对的是**耗时长、中间需要人确认、且可多路并行**的编码任务；tmux 集成针对“会跨终端、跨设备延续”的会话。模型层面只区分 Claude Code 与 Codex 两个 provider，并给两者分别显示额度环——即按额度/限流来分配并行度。没有关于任务类型如何匹配模型的论述。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
- 系统条件：仅 macOS；源码构建需指定 Rust 工具链。
- 配置条件：必须在 `~/.harp/settings.toml` 显式打开各集成（默认全关）。
- 数据条件：额度环依赖外部工具维护的本地 JSON，Harp 不代抓。
- 反馈条件：Claude Code hook 负责把后台任务状态回传侧栏；tmux 每 10 秒轮询一次作为状态同步节奏。
- 账号条件：上游 Warp 的登录、AI、云功能照旧走 Warp 服务器，且**登录路径未测试**——这是使用前必须接受的风险。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
只有“状态驱动”的展示，没有“状态驱动的自动执行”。具体依据：agent 会话状态变化会更新侧栏（可被 `WARPOSS_STATUS_TRACE=1` 记录）；tmux 集成按 10 秒轮询保持名字/分组/顺序/标志同步；后台任务用圆点表示仍在运行。原文没有提到定时触发、事件触发重跑、失败自动重试或任务队列调度，因此不能把 Harp 当作自动化编排器。

**5. 效果验证：怎样判断确实改善了结果**
原文没有给出任何效果指标或案例。可用的只有工程侧的核查手段：`WARPOSS_STATUS_TRACE=1` 把每次状态变化写入 `~/Library/Logs/harp.log` 的 `[status-check]` 行，供与 agent transcript 对照做回归检查；以及可复现构建（`./script/presubmit`、`script/release_macos`）。业务效果需自行定义指标。

## 与已有做法的关系

清单中相关条目只有 **Claude Code（tool，状态 adopt）**。Harp 不替代 Claude Code，也不改它的能力：它是在 Claude Code / Codex 之上加的一层**多会话编排与人机接管界面**——把“我现在开着一堆终端标签、不知道哪个在等我”变成一条按状态排序的侧栏。对已 adopt Claude Code 的人，Harp 属于可选的外围工具，价值在并行度提升后的注意力调度，而非模型或提示词层面。除 Claude Code 外，清单中没有其他相关条目（tmux、Warp 均未在清单中）。

## 证据与局限

**原文给了什么**
- 功能与交互细节：状态类别（working / waiting for you / done / 后台 / 搁置 / 未读）、Cmd+R 重命名、分组随 tmux 持久化、额度环的双窗口（5 小时 + 周）、tmux 轮询 10 秒。
- 可照做的配置项与默认值表（`integrations.limit_rings.enabled/file`、`integrations.tmux.enabled/session_script`、`appearance.vertical_tabs.full_tab_menu`、`agents.third_party.should_render_cli_agent_toolbar`）。
- 安装与构建脚本、签名与发布路径、开发调试开关、贡献者须知。

**哪些只是作者主张**
- “one calm sidebar that tells you which one needs you” 是产品定位，没有给出任何误报率、节省时间、并行任务数提升的数据。
- 状态判定是否准确（尤其 tmux 场景下 10 秒轮询带来的延迟与竞态）原文未给验证结果，只给了排查日志开关。
- 没有用户案例、benchmark、issue 统计；仓库仅 157 stars。

**适用条件与风险**
- 平台锁定 macOS；AGPL-3.0（若改后通过网络提供给别人，需提供源码）。
- 非官方 fork，明确不受 Warp（Denver Technologies）制作、背书或支持；问题需报给 Harp 而非 Warp。
- 上游云功能依赖 Warp 服务器，**通过 Harp 登录未测试**——可能直接卡在第一步。
- 额度环需要你自建数据管道，否则该功能形同虚设。
- 内部命名仍沿用 Warp（`warp-oss` 二进制、`WARPOSS_*` 开关、`@warp_*` tmux 选项），与其他 tmux 客户端共享这些选项，需注意别名冲突。

## 怎么试、怎么验证

**最小试用（半天，单机）**
1. 装 dmg，与现有 Warp 并存，先不动任何配置，确认能起终端、能登录（若登录失败即止步，记为阻塞）。
2. 在 `~/.harp/settings.toml` 只开 tmux 集成，开 2 个 tmux 会话：一个跑长任务（如大范围重构/长测试），一个跑需要中途确认的任务。
3. 把窗口切走去做别的事，只用侧栏判断何时该回来；记录每次“侧栏说 waiting for you”是否真的在等你。
4. 想更严格时加 `WARPOSS_STATUS_TRACE=1`，事后把 `~/Library/Logs/harp.log` 里的 `[status-check]` 行与各会话的 agent transcript 逐条对齐，数误报/漏报。
5. 若要从手机接管，在异地会话里 `tmux set-option @warp_adopt 1`，看标签是否按预期出现、名字与分组是否随会话走。
6. 额度环留到最后：先手工写一份符合 `docs/limit-rings.md` 的 JSON 验证渲染，再决定是否值得写生成脚本。

**判断有没有改善的指标（自定，原文未给）**
- 状态准确率：`[status-check]` 记录与 transcript 对照，waiting for you 的误报/漏报次数；目标先定“误报 ≤ 1 次/小时”。
- 接管延迟：从 agent 进入 waiting 到你实际回到该会话的秒数（对照不用侧栏时的基线）。
- 并行度：同时推进且不互相踩踏的会话数（试用前后各记一周）。
- 空转率：切到某标签后发现“其实没在等我”的比例——这是 Harp 最该压下去的浪费。
- 稳定性：一周内因 Harp 本身（非 agent）导致的中断次数；tmux 轮询 10 秒是否造成可见滞后。

**止损条件**：登录不通、状态误报频繁且无法用 hook/脚本修正、或并行度提升带来的注意力收益抵不过维护 `~/.harp` 配置与额度 JSON 的成本——则退回原版 Warp + 手工 tmux 布局，把结论降级为 study。

> 说明：本次输入为仓库 README 正文（非完整文档），`docs/limit-rings.md`、`integrations/claude-code/README.md` 与 Releases 内容未提供，相关步骤需按仓库内文档补全后才能照做。
