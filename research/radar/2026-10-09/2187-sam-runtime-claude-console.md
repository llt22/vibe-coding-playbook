# SaM-runtime/claude-console

- 结论：**值得一试**。建议小范围试：先按 README 的两条命令装好插件、用 /console demo 跑通面板，再挑一两个可回滚的项目接入 registry + STATUS 卡，验证「派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审」这条闭环是否真的减少了人工盯盘；理由是它给出了可直接照做的安装命令、配置键表、dispatch.json 结构、动作快捷键和状态卡格式，但仓库仅 53 stars、版本 0.15.x、强依赖特定 Claude Code 版本与自建的注册表/状态卡约定，成熟度还不够直接全量采用。
- 原文：https://github.com/SaM-runtime/claude-console
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-09T05:46:21.479Z

## 是什么

claude-console 是 Claude Code 的一个本地多项目控制台插件（console-status mod）。一个控制台会话统一承担多个已注册项目的规格、监督与评审关卡，操作者只负责做决策和最终发布审批。默认执行者是 Claude Code 原生后台 agent（不需要 Codex 账号），也可按项目切换成 Codex（Claude 额度紧张时用）。

面板把每个项目的状态（`●` 待决策、`◆` 待评审、`▶` 运行中、`↻` 待同步、`○` 空闲）、六步流水线（spec → build → sync → verify → review → release）、更新时间、Git 摘要、PR/CI、额度与提示词缓存倒计时收在一屏。当前 UI 是繁体中文；面板自身不执行发布或正式环境变更。

原文自述其定位：一个控制台会话拥有跨项目的规格、监督与评审关卡，刷新只查本地文件和 CLI、不请求模型，只有提交决策草稿时才花 Claude 额度。

## 具体做法（编号步骤）

**前提**：Windows 或 macOS；Claude Code 2.1.289 或更高且支持 mod；每个项目在注册表里有一项、并有一个 STATUS 文件。若要用 Codex 执行者，还需要 Node.js、Codex Companion 和一个 Codex 账号（Windows 探测需要 PowerShell 和 Codex 桌面应用，macOS 需要 PATH 上有 `codex` CLI）。

1. 安装（在 Claude Code 里执行；在本地 checkout 里安装则把第一行换成 `claude plugin marketplace add .`）：

```powershell
claude plugin marketplace add SaM-runtime/claude-console
claude plugin install console-status@claude-console
```

2. 先只看不接：任意 Claude Code 会话里运行 `/console demo` 看整块面板（不需要 registry），`/console refresh` 回到真实状态。

3. 配置插件。前提：先决定 `registryPath` 指向放项目注册表的 Markdown 文件（默认 `~/.claude/handoffs/projects-scope.md`）。值是单行字符串，未指定的保持原值，改完运行 `/reload-plugins` 或另开一个 Claude Code 会话：

```powershell
@'
{
  "registryPath": "C:\\Projects\\console\\projects-scope.md",
  "dispatchSettingsPath": "~/.claude/handoffs/dispatch.json",
  "claudeSessionsPath": "~/.claude/handoffs/claude-sessions.json",
  "executor": "claude",
  "codexFallback": "ask",
  "codexMinQuotaPercent": "10",
  "gitProbe": "on",
  "commandGuard": "ask",
  "loopGuard": "on",
  "autoSync": "on",
  "suggestNext": "on",
  "activation": "auto",
  "projectMode": "auto"
}
'@ | claude plugin configure console-status@claude-console --values-stdin
```

   其余可配置项（默认值）：`dispatchSettingsPath`、`claudeSessionsPath`、`executor=claude`、`defaultModel`/`defaultEffort` 空、`companionScript` 空（空或失效路径会自动解析到最新安装的 Codex 插件）、`companionStateDir`（系统 Temp 的 codex-companion）、`companionStateRoots`（插件 data 优先，其次旧 Temp）、`modelsCachePath=~/.codex/models_cache.json`、`codexFallback=ask`、`codexMinQuotaPercent=10`、`cacheHint=on`、`cacheTtl=auto`、`cacheWritePrice` 空。

4. 建注册表与 STATUS 卡。注册表是「名字 → STATUS 文件」的 Markdown 映射，可带一列 Executor（`claude`/`codex`/`manual`/留空）；仓库给了 `workflow/projects-scope.example.md` 作例子。每个 STATUS 文件里只有一个机器可读块，用 `<!-- CARD -->` 和 `<!-- /CARD -->` 包住、不超过十行，解析器识别模板里的繁体键：`更新`、`狀態`、`驗證`、`等使用者`、`下一步`、`關卡`。`關卡` 写 `無`、`spec：…`、`review：…` 或 `release：…`；未知的非空关卡文本也会阻止继续。Git 项目里可以放在 `.console/STATUS.md`，并在该项目的 `.git/info/exclude` 里排除，保持本地。

5. 设派工（全局 + 每项目）。文件是 `~/.claude/handoffs/dispatch.json`：

```json
{
  "executor": "claude", "model": "", "effort": "",
  "projects": {
    "D:/Projects/api": { "executor": "codex", "model": "", "effort": "high" },
    "D:/Projects/legacy-portal": { "executor": "manual" }
  }
}
```

   执行者解析顺序：面板覆盖（`projects["<root>"]`，Windows 盘符与 UNC 路径大小写不敏感）> 注册表 Executor 列 > 全局 `executor`。model 与 effort 同链条解析，但「执行者与全局不同的项目不继承全局 model/effort」。`manual` 表示面板永不派工：同步与继续按钮隐藏，卡片显示交接说明，但 CARD、验证、决策和关卡仍可用。0.1 版没有 `projects` 的平铺文件继续可用；`dispatch.json` 缺失时只读相邻的旧 `codex-dispatch.json`，写入一律进 `dispatch.json`。

6. 给同步配便宜模型（同步只写 CARD 和历史）：

```json
{
  "executor": "claude", "model": "opus", "effort": "high",
  "sync": { "claude": { "model": "haiku" }, "codex": { "model": "luna", "effort": "low" }, "session": "fresh" },
  "projects": { "D:/Work/Beta": { "sync": { "session": "resume" } } }
}
```

   模型名是自由文本，写你账号有的即可；空字段回落到普通派工的模型/effort，项目级 `sync` 覆盖全局。`session: fresh` 会开一个小会话，只读 STATUS.md、`git log`/`git status` 和执行者摘要，并被告知只写这些看到的内容；Claude 侧配了自己的同步模型时默认走 `fresh`，Codex 保持 `resume`。用了独立同步模型时界面会写明，例如 `（用 haiku・新 session）`。

7. 日常操作：右键或按 `m`（光标所在行）打开动作菜单，Esc 关闭。动作键：`v` 验证、`s` 同步 STATUS、`c` 继续下一步（仍需六秒内第二次按键）、`r` 回覆执行者、`d` 做決定、`g` 关卡评审/终审、`o` 打开 STATUS.md、`p` 打开 PR。菜单开着时数字键按顺序回答待决事项（先按 `2` 再按 `1` 会读作 `1B 2-1`），Backspace 撤销上一个选择；`✎ 填入決策` 把已选答案填进输入框，Enter 发送。

8. 回覆停下提问的执行者：菜单里选 `↩ 回覆執行者`，输入框会被填成 `/console reply <project> `，写上答复按 Enter，控制台用你的话作提示继续那个会话（不必 attach）。仍在等权限批准（`等待批准`）的执行者需要 attach 处理。

9. 命令速查：

```text
/console executor
/console executor claude
/console model
/console model <name>
/console effort <level>
/console sync-model [claude|codex] <name>
/console sync-effort [claude|codex] <level>
/console sync-session fresh|resume
/console project executor|model|effort <value|inherit> <project name>
/console project
/console update
```

   `/console model ""` 或 `/console effort ""` 恢复所选执行者的默认。Claude 侧模型按钮给别名 `fable`/`opus`/`sonnet`/`haiku`，effort 选项 `low`/`medium`/`high`/`xhigh`/`max`；置空则交给 Claude Code 决定。设置只影响下一次派工，正在跑的任务保持它请求的值。

10. 让手动派工的会话也遵守同一份设置，把下面这段贴进用户 `CLAUDE.md`：

```markdown
## Dispatch settings
Before dispatching to any executor, read ~/.claude/handoffs/dispatch.json
(if it is missing, read ~/.claude/handoffs/codex-dispatch.json; never write it).
- Global: "executor" (claude | codex), "model", "effort".
- Per project: "projects"["<project root>"] may set "executor"
  (claude | codex | manual), "model", "effort". Match the root case-insensitively
  on Windows. Precedence: projects entry > registry Executor column > global.
- Pass each nonempty model/effort as one --model / --effort argument; omit empty ones.
- "manual" means: never dispatch that project; prepare a handoff for the user instead.
```

11. 护栏：`commandGuard: ask`（默认）时不可撤销命令（`rm -r`、force push、`git reset --hard`、`DROP TABLE` 等）先问；`deny` 直接拒绝；`off` 关闭。`loopGuard` 默认 on：同一参数同一错误的工具调用失败两次后，模型被告知不要试第三次。

12. 控制台只在你要的地方生效：`activation: auto`（默认）下只有你运行过 `/console` 的会话（以及它 resume 后）运行控制台，其他会话只拿到命令护栏；在已注册项目目录里开的会话自动切到项目模式（`projectMode: auto`）。

13. 升级：页脚显示已装版本，有新版本时按 `⬆ 更新` 或运行 `/console update`。逐版本变更见仓库 `CHANGELOG.md`。

**Git/PR/CI（可选，`gitProbe` 默认 on）**：每次刷新在每个项目根跑 `git status --porcelain=v2 --branch --show-stash`（带 `--no-optional-locks`，不抢执行者需要的 index 锁）；装了 `gh` 并登录时，`gh pr view` 读当前分支 PR 与检查，每五分钟一次、检查还在跑时每分钟一次、强制刷新或分支变化时也读。设 `gitProbe: git` 跳过 GitHub，设 `off` 两者都跳过。冲突（`✕衝突n`）、CI 失败（`CI✕n`，状态带变红）、未提交（`●n`）、未推送（`↑n`）、落后上游（`↓n`）显示在 Git 列；`▸ 檔案`（菜单里 `f`）按 `git status` 的分组展开文件列表，每组最多 12 个。`提交` 字段显示最近三到五条提交；最后一次 `git fetch` 超过一天会提示 ahead/behind 可能过期。

## 对应的研究问题

- **能力发现**：可以把「多项目状态汇总、待决事项收集、按项目派工、Git/PR/CI 汇总、额度与提示词缓存提示、回覆中途提问的执行者」这类平时靠人切窗口盯的事，交给一个常驻面板。原文称刷新只查本地文件和 CLI、不请求模型，只有提交决策草稿才花额度；`autoSync` 会在执行者干完却没写回 CARD 时自己补一次同步——这属于「原本不会想到交给 AI」的元层工作。
- **任务匹配**：执行者按项目解析，可选 `claude` / `codex` / `manual`；model 与 effort 同链条，但执行者与全局不同的项目不继承全局 model/effort。原文明确给了分工判据：同步「只写 CARD 和历史」，所以可以用比活儿本身更便宜的模型（示例 haiku、luna+low），而且同步模型起不来时会立刻用正常模型重跑并告知。`manual` 项目只做交接、不派工。
- **条件供给**：需要 `registryPath` 的 Markdown 注册表（名字 → STATUS 文件，可选 Executor 列）、每个项目一份含 ≤10 行 CARD 的 STATUS.md（键：`更新`/`狀態`/`驗證`/`等使用者`/`下一步`/`關卡`）、`dispatch.json`（全局与每项目执行者/模型/effort，以及 sync 子配置）、`claudeSessionsPath` 里维护的项目–会话映射（每项目保留最近 20 条 job 记录）；要 PR/CI 需要装好并登录 `gh`；用 Codex 需要 `companionScript`、`models_cache.json`、Codex 账号与额度探测。反馈回路由 CARD 的 `更新` 时间和内容（可写 `· job <id>`）判定执行者有没有真的写回。
- **主动推进**：`autoSync` 默认 on，执行者结束后没写回就自动派一次同步，每个 job 一次、失败或什么都没写就不重试；同步过程显示 `● 派工 ─ ◉ 執行 ─ ○ 寫回 STATUS`（● 完成、◉ 进行中、○ 未到、✕ 停在此处）与耗时；Continue 必须六秒内二次确认才派工；`suggestNext` 默认 on，把下一步（决策、回复、关卡、同步、继续）作为暗色建议放在输入框，Tab 取用、Enter 发送；有 job 或同步在跑时刷新从每分钟改成每 20 秒；PR 检查每五分钟、检查运行时每分钟读一次；`▶ Run verification` 五分钟超时后在项目根执行。边界：面板不做发布，也不做正式环境变更。
- **效果验证**：`▶ Run verification` 提供本地验证入口（不花模型额度）；关卡（spec/review/release）需要证据，且发布评审不能执行发布；原文明确「派工被接受只代表 companion 收下了 job，完成与评审仍要看 STATUS 证据与本地配置的验证」；「写回」判定为 CARD 的 `更新` 在 job 开始那一分钟之后，或 `更新` 里命名了该 job，取 `更新` 与文件修改时间中较晚者；同步结束时 CARD 没变会显式报 `✕ 寫回 STATUS`，而不是悄悄留在待同步。

## 与已有做法的关系

清单中有 Claude Code（tool，adopt）和 Cursor（tool，watch）。本仓库本身不在清单中；它是 Claude Code 之上的编排层/插件，依赖 Claude Code 2.1.289+ 的插件（mod）支持与原生后台 agent 能力（`--bg`、`--resume`、会话管理、agent view 与 CLI 行为），并通过 `claude agents --json --all --cwd <project-root>`、`claude logs <id>` 读取执行者状态与输出。也就是说 Claude Code 的既有 adopt 做法可以原样保留，claude-console 是在其外再加一层跨项目调度、触发动作、额度视图与护栏。与 Cursor（watch）没有直接关系。

## 证据与局限

**原文给出的可核对内容**：两条安装命令；完整的配置键与默认值表；`dispatch.json` 结构与执行者解析优先级；sync 配置示例与 `fresh`/`resume` 的区别；动作与快捷键表；CARD 的包夹标记、键名与十行上限；「写回/待同步」的判定规则；Codex 回退表（`ask`/`claude`/`off`，阈值 `codexMinQuotaPercent` 默认 10，额度读数超过六小时视为未知且不单独触发回退）；Git/PR/CI 的读取命令与刷新频率；以及一段 45 秒演示视频（README 声明为真实 Claude Code 2.1.294 + console-status 0.15.0 的 tmux 逐帧抓取，字幕与鼠标指针是后加的）。

**只是作者主张**：整体架构定位（「一个控制台会话拥有规格、监督与评审关卡」）、「不切窗口就能掌握全局」这类体验描述，没有第三方评测或量化改善数据支撑。

**局限与适用条件**：仓库仅 53 stars，版本 0.15.x，UI 为繁体中文；强依赖具体 Claude Code 版本（要求 2.1.289+，截图 2.1.294）与其插件 mod 机制，上游一变就可能失效；Codex 路径依赖 Codex Companion、模型缓存与本地额度记录，原文自己也说额度「可能过期」；作者说明 `claudeSessions` 的写入只在单个 mod 进程内串行化，多进程同时写不保证原子，并建议只让一个控制台进程当写者；给出的原文在 Git 一节末尾被截断（停在 `A project` 处），该节之后的内容无法核对。适用前提还包括：Windows/macOS、愿意为每个项目维护一条注册表项和一份 STATUS 卡、项目里要有可执行的验证步骤（否则 `▶ Run verification` 没东西可跑）。

## 怎么试、怎么验证

**最小试用（不碰真实项目）**：在一台机器上执行第 1 步安装，运行 `/console demo` 看整块面板、`/console refresh` 切回真实状态，确认插件在你的 Claude Code 版本上装得上、面板能开、右键菜单与单键快捷键可用、`commandGuard` 对一条 `git reset --hard` 之类的命令确实先问。

**小范围试点（一两个可回滚、非正式环境的 Git 项目，建议 1–2 周）**：

1. 写 registry（可带 Executor 列）和每个项目的 `STATUS.md`，CARD 控制在十行内，把验证命令写进 `驗證`，关卡写 `無`。
2. 主任务用默认 `claude` 执行者；给同步单独配一个便宜模型（如示例的 haiku + `session: fresh`）。
3. 从面板派工一次，观察执行者完成一轮后 `autoSync` 有没有把 CARD 写回（同步行走完 `○ 寫回 STATUS` 还是停在 `✕`），`更新` 字段有没有变。
4. 故意留一个需要你决策的 `等使用者`，看菜单/数字键回答、`✎ 填入決策` 与 Continue 的六秒二次确认是否顺手、会不会误触。
5. 若同时有 Codex 可用，把某个项目切到 `codex`、`codexFallback: ask`，把额度压到阈值以下或让 broker 失效，验证是否停在 ask 并给出 `⇢ 改用 Claude 派工`。

**判断有没有改善的指标（都取自面板本身，便于前后对比）**：

- 待同步残留：结束后仍显示「待同步」的次数 / 派工次数；一次 `autoSync` 后 CARD 成功更新的比例。
- 反馈闭环：需要人工介入的 job 数（`等待批准`、`停在提問`、`等使用者`），以及这些被漏掉或延迟处理的次数与时长（可用「其他工作階段」列表核对）。
- 无效重试：同一参数同一错误被重复尝试的次数（`loopGuard` 是否真拦住第三次）。
- 额度与回退：Codex 回退到 Claude 的次数与原因、额度表预计耗尽时点与实际差异、提示词缓存命中率与冷启动重写成本。
- 人的开销：每天切窗口/手动记录状态的次数与耗时（对照基线），以及同步/继续/验证这些动作从按到看到结果的失败率。
- 结果验证：`▶ Run verification` 的通过率、关卡评审返工次数、发布前被关卡拦下的问题数。

若两周内上述指标相对「不用面板」的基线没有可见改善，或插件在版本升级后反复失效，就把采用度降回 study 级别，只借鉴它「注册表 + 状态卡 + 一键触发 + 自动写回校验」的结构。
