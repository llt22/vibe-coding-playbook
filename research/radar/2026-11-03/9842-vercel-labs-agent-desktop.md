# vercel-labs/agent-desktop

- 结论：**值得一试**。按 README 给出的“snapshot → 对 ref 执行动作 → 再 snapshot 复验”闭环，在非敏感桌面或隔离环境小范围试用 agent-desktop，并先把 `agent-desktop skills get desktop/platform` 的输出喂给智能体再让它上手。它能补上“只有 GUI、没有 API”的软件操作能力（能力发现与条件供给都有具体做法），但仍是 Vercel Labs 早期项目、需要系统辅助功能权限、快照中可能包含隐私内容，因此先试不直接上生产。
- 原文：https://github.com/vercel-labs/agent-desktop
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T05:51:50.894Z

## 是什么

`agent-desktop` 是 Vercel Labs 出的一个 CLI + C 库（Apache-2.0），让 AI 智能体通过操作系统的**无障碍树（accessibility tree）**读取并操作桌面应用，覆盖 macOS / Windows / Linux。

核心机制（原文明确）:

- 每次 `snapshot` 返回 JSON，树里每个可操作元素带一个 `ref`（形如 `@s8f3k2p9:e8`，`s8f3k2p9` 是 snapshot_id）。
- 智能体对 `ref` 执行动作，然后**再快照一次**验证结果——不做像素匹配，控制循环留在你自己的 agent 里。
- 每条 CLI 调用是独立进程，输出一个 JSON envelope（`ok` + `data` 或 `error`）。
- 默认 headless：走无障碍 API，不移动指针、不抢焦点；`--headed` 才允许物理输入。

定位上它不是“另一个 Computer Use 模型”，而是**给已有 agent 提供的一层桌面执行接口**：agent 负责决策，它负责看和点。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词放进代码块；写清每步的前提）

### A. 安装与授权

**前提**：本机有 Node 环境；macOS 需能授予“辅助功能”权限；Linux 需在用户的图形会话中且装了 `at-spi2-core`；Windows 下操作与终端同完整性级别的应用无需授权。

1) 全局安装并确认版本：

```bash
npm install -g agent-desktop
agent-desktop version
```

Bun / Yarn / pnpm 可装同一个包；包里自带 x64 与 ARM64 的原生二进制和平台 helper。若不想走 JS 启动器，可从 GitHub Releases 下对应平台的 native archive，**helper 必须和可执行文件放在一起**。注意 README 明确：Homebrew 与 Scoop 官方包“正在提交、默认源里还拿不到”，原来的自定义 tap/bucket 已不再维护——别照旧教程去 `brew tap`。

2) macOS 上跑权限引导：

```bash
agent-desktop permissions --guide
```

3) 若要在 Linux 上跑，先确认会话与依赖：处于用户的图形会话中，且安装 `at-spi2-core`；鼠标输入与窗口控制依赖 X11，截图在 Wayland 下走 xdg-desktop-portal，剪贴板在 Wayland 需要 `wl-clipboard`。

### B. 把“怎么用”交给智能体（这是原文最值得照抄的一段）

4) 二进制自带与版本匹配的文档，先让 agent 读：

```bash
agent-desktop skills get desktop      # loop、refs、验证与重试规则
agent-desktop skills get platform     # 当前 OS 上的差异
agent-desktop <command> --help        # 单个命令的旗标
```

5) 把 skill 装进 agent harness：

```bash
npx skills add https://github.com/vercel-labs/agent-desktop --skill agent-desktop
```

6) 或者往 `AGENTS.md` 里加这段提示词（原文原样）：

```markdown
Use `agent-desktop` to see and operate desktop apps. Before the first use, run
`agent-desktop skills get desktop` and `agent-desktop skills get platform`, and follow them.
```

### C. 最小操作闭环（observe → act → observe）

**前提**：已装好并授权；先用一个无风险应用（原文示例是 macOS 的 Finder）验证链路。

7) 列出可操作的应用名（`snapshot --app` 的取值来自这里）：

```bash
agent-desktop list-apps
```

8) 首次快照，只取可交互元素：

```bash
agent-desktop snapshot --app Finder -i
```

返回形如：

```json
{
  "version": "2.6",
  "ok": true,
  "command": "snapshot",
  "data": {
    "app": "Finder",
    "window": { "id": "w-204749", "title": "Downloads" },
    "snapshot_id": "s8f3k2p9",
    "ref_count": 59,
    "complete": true,
    "tree": {
      "role": "window",
      "name": "Downloads",
      "children": [
        { "role": "treeitem", "name": "Documents", "ref_id": "@s8f3k2p9:e8", "available_actions": ["Click"] }
      ]
    }
  }
}
```

9) 对 ref 执行动作：

```bash
agent-desktop click @s8f3k2p9:e8
```

10) 再快照一次验证：

```bash
agent-desktop snapshot --app Finder -i
```

### D. 原文给出的关键约束与避坑（照做能省很多调试）

11) **ref 绑定快照**：裸写 `@e8` 会被 `INVALID_ARGS` 拒绝；UI 变了会返回 `STALE_REF` 或 `AMBIGUOUS_TARGET`，此时**重新快照换新 ref**，不要重试旧 ref。
12) **多窗口**：直接操作会得到 `AMBIGUOUS_TARGET`，错误里 `error.details` 会列出候选 window id，用 `--window-id` 指定。
13) **元素很多的密集应用**（原文以 Slack 举例）：先出骨架图，再对某一区域下钻：

```bash
agent-desktop snapshot --skeleton --app Slack -i --compact
agent-desktop snapshot --root @s8f3k2p9:e3 -i --compact
```

14) **默认 headless**，不移动指针不抢焦点；确实需要物理输入才加全局 `--headed`。
15) **PowerShell 必须给每个 ref 加引号**（裸 `@token` 是 splatting 运算符）：

```powershell
agent-desktop click '@s8f3k2p9:e8'
```

16) **重试纪律**：每个命令输出一个 envelope，错误带 `code`、`disposition`，通常还有 `suggestion`；**只有 `error.disposition.retry` 为 `safe` 时才重试**。契约、错误码与退出码见 `docs/json-output.md`。
17) **数据卫生**：快照、剪贴板读取、截图、命令输出、调试产物都可能含私人桌面内容，**不要进公共日志和上传**；可选的 JEV helper（`skills/shot-desktop/SKILL.md`，原文写作 `skills/jev-desktop/SKILL.md`）会把屏幕描述发给配置的模型提供方，它独立于原生 CLI，需单独评估。
18) **高频调用**才考虑 FFI：每个 release 带 `libagent_desktop_ffi`，可进程内调用而不用每条命令起一次 CLI，入口、内存归属与线程规则见：

```bash
agent-desktop skills get ffi
```

19) **能力边界**：共 60 个命令名、56 个可操作命令；`key-down`/`key-up`/`mouse-down`/`mouse-up` 这四个在“有 daemon 能释放被按住的键或按钮”之前会拒绝执行——所以“按住不放”的交互（长按拖拽类）目前不可依赖。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**

有具体依据：凡是**有 GUI 但没有 API/CLI** 的桌面软件，都可以交给 agent 去“看树 + 点 ref”。原文给出的可操作面包括：读无障碍树、点击/双击/三击/右键、输入与设值、选择/勾选/展开折叠、滚动、键盘按键、悬停与拖拽、剪贴板读写、通知的列出与处理、应用启动关闭与窗口管理（移动/缩放/最小化/最大化/聚焦）、截图、等待。这打开的工作类型是“跨软件搬运与桥接”——比如把某个只有界面的老系统里的信息读出来写进别处、按通知逐条处理、批量整理窗口与文件。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**

有依据的部分：这套工具明确把**决策留在 agent 里**（“the loop stays in your agent”），它只提供 observe/act 原语，因此适合“能用结构化 ref 精确定位元素”的任务，而**不适合依赖像素/视觉匹配的任务**（原文明确 no pixel matching）。协作方式上原文给了三条分工规则：密集应用先 `--skeleton --compact` 出地图再 `--root` 下钻；默认 headless 避免抢用户焦点，需要物理输入才 `--headed`；高频循环改用 FFI 而不是每次起 CLI 进程。此外原文提供 `skills get desktop / platform` 让 agent 先加载与版本匹配的使用规则，属于“先给 agent 上说明书再派活”的匹配方式。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**

依据最充分的一节。权限：macOS 必须给辅助功能权限（`permissions --guide`）；Windows 需与终端同完整性级别；Linux 需图形会话 + `at-spi2-core`（Wayland 还需 `wl-clipboard` 才能用剪贴板）。信息：把 `skills get desktop` / `skills get platform` / `<command> --help` 的输出作为 agent 的前置知识，或用 `AGENTS.md` 里的那段提示词常驻。工具：CLI 或 FFI 二选一。反馈：每个命令返回统一 envelope，错误带 `code`/`disposition`/`suggestion`，agent 依据 `disposition.retry` 决定是否重试；动作后必须再快照验证。原文还给了一条容易被忽略的“反向条件”：**快照/剪贴板/截图可能含私密内容，必须约束日志与上传路径**，否则供给权限的同时就在制造泄露面。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**

只有部分依据，需谨慎。原文确实提供了 `wait`、`session`、`trace`、`batch` 这几组命令，以及“动作→再快照验证”的状态检查范式，这是“状态触发”的基础件；但 **README 没有给出任何定时调度、事件订阅或常驻守护的具体机制**（唯一提到的 daemon 是用于释放按住键/按钮的那个，且尚未就绪）。所以可写进手册的只有：可以用 `wait` + 轮询 `snapshot`/`is`/`find` 做状态驱动的小循环，**时间触发与长期常驻需要外部编排，原文未提供、不要编**。

**5. 效果验证：怎样判断确实改善了结果**

有依据：验证方式是**动作后重新快照，用新快照确认 UI 状态**（“observe again to verify”），而不是靠动作返回值自证。可判读的信号包括 envelope 的 `ok`、错误码 `STALE_REF` / `AMBIGUOUS_TARGET` / `INVALID_ARGS`、`error.disposition.retry` 是否 `safe`、`snapshot` 返回的 `complete` 与 `ref_count`、以及 `trace` / `session` 留下的执行记录。原文没有给任何成功率、耗时或基准数据，所以指标要自己定（见下节）。

## 与已有做法的关系（对照给出的清单条目）

- **skills.sh（status: try）**：直接相关且是正向衔接。README 明确给出 `npx skills add https://github.com/vercel-labs/agent-desktop --skill agent-desktop`，即本工具可以作为一个 skill 从 skills.sh 生态装进 agent harness——skills.sh 是分发与装载层，agent-desktop 是被装载的桌面执行能力。
- **Cursor（status: watch）**：同属“agent harness / 智能体工作台”这一类，但层级不同。Cursor 面向代码编辑场景，agent-desktop 补的是**桌面 GUI 操作**这一层，二者不是替代关系；若要组合，需要 Cursor 侧能执行 shell 命令并遵循 `AGENTS.md` 里的那段提示词——这一点原文只给了通用写法，没给 Cursor 专属配置，属于待验证。
- 清单中没有与“无障碍树驱动的桌面操作 CLI”直接同类的条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的可核查事实/规格**：安装与权限命令；Quick start 的三步命令与一份真实格式的 snapshot JSON（含 `version: 2.6`、`snapshot_id`、`ref_count: 59`、`complete: true`）；错误码语义（`INVALID_ARGS` / `STALE_REF` / `AMBIGUOUS_TARGET`）与 `disposition.retry` 的重试纪律；60 个命令名 / 56 个可操作命令的计数；三平台能力表（无障碍树、点击输入、鼠标、截图、剪贴板、窗口管理、通知、shell surface 逐项标注）；FFI 的 Python 调用片段；构建与测试的 cargo 命令。外部可见度：仓库 10604 stars、当日新增 2275（来自给定指标）。

**属于作者主张、无数据支撑的部分**：“no pixel matching 因而更稳”是设计主张，原文没有准确率或稳定性对比；“headless 不抢焦点”是行为声明，未给测试证据；没有任何基准、任务成功率、耗时、失败案例复盘。

**明确的局限（原文自述或可直接推出）**：

- 属 Vercel **Labs** 产品，版本号 2.6，Homebrew/Scoop 官方包尚未上架，分发渠道仍在变动。
- 四个按下/抬起类命令在 daemon 就绪前**拒绝执行**，长按拖拽类交互不可用。
- 完全依赖无障碍树 → **不暴露无障碍信息的应用**（自绘 UI、部分游戏、远程桌面画面、Canvas 类界面）大概率无法操作；原文未提任何视觉兜底方案。
- Linux 支持按 X11 / Wayland 分裂，剪贴板、截图、鼠标、窗口控制各有条件。
- 权限面与隐私面很大：辅助功能权限 + 快照含整窗内容 + 剪贴板读取 + 截图。可选的 JEV helper 还会把屏幕描述发给模型提供方。
- 本次输入**只有 README**，`docs/json-output.md`、`docs/install.md`、`docs/faq.md`、`CONCEPTS.md`、`docs/solutions/` 等正文均未提供，因此错误码全集、平台细节、失败案例都无法核实，报告中凡涉及这些只引用 README 的转述。

## 怎么试、怎么验证

**最小试用（建议 1–2 小时，限定在一次性/非敏感环境）**

1. 在一台可以“随便弄乱”的机器或独立用户账户上装好，跑 `agent-desktop version` 与 `agent-desktop permissions --guide`。
2. 打开日志隔离：先确认你打算记录的 envelope 字段（建议只留 `ok`、`command`、`error.code`、`error.disposition`），**不要把 `tree`、剪贴板内容、截图、命令输出落盘到会共享的位置**。
3. 选一个**有 GUI、无 API、且数据不重要**的真实小任务作为靶子（例如“在某文件管理器里把一批文件按规则改名/移动到子目录”或“逐条处理三个通知”），写清成功判据（目标状态可被快照观察到）。
4. 走一遍闭环：`list-apps` → `snapshot -i` → 动作 → 再 `snapshot -i` 验证；把 `skills get desktop` 与 `skills get platform` 的输出先塞进 agent 上下文，对比“塞”与“不塞”两种情况的差别。
5. 刻意制造两次失败：一次在动作后手动改变 UI 触发 `STALE_REF`，一次开两个窗口触发 `AMBIGUOUS_TARGET`，看 agent 是否按规则**重新快照 / 用 `--window-id`** 而不是盲目重试。
6. 若目标应用元素很多，改走 `--skeleton --compact` + `--root` 的下钻路径，比较 token 消耗与定位准确度。

**判断“有没有改善”的指标（原文档位，需自己采集）**

- **任务完成率**：同一任务重复 5–10 次，最终快照是否达到预定状态的比例。
- **步数效率**：达成目标所需的 snapshot/action 调用次数；对比“人工操作”的耗时基线。
- **错误码分布**：`STALE_REF`、`AMBIGUOUS_TARGET`、`INVALID_ARGS` 各出现几次——`STALE_REF` 高说明环境不稳定或快照时机不对，`AMBIGUOUS_TARGET` 高说明缺 `--window-id` 处理。
- **重试合规率**：只在 `disposition.retry == safe` 时重试的比例，以及无效重试次数。
- **人工接管次数**：一次任务中需要人介入的次数（这是“是否真的省事”的最直接指标）。
- **是否被迫回退 `--headed`**：回退次数越多，说明 headless 覆盖面越差、对用户干扰风险越高。
- **隐私合规**：抽查日志与上传物中是否出现窗口标题、剪贴板文本、截图路径等私密内容，应为 0。

**放行/放弃线建议**：若在上述非敏感任务上完成率稳定、重试合规、无需 `--headed`、且日志无泄露，可把“桌面 GUI 类任务交给 agent-desktop”写进手册作为 `try` 级做法，并强制附上权限与日志两条约束；若主要目标应用属自绘 UI 或需长按拖拽，则退回 `study`——思路（无障碍树 ref + 快照复验）值得学，但这个具体工具覆盖不到。
