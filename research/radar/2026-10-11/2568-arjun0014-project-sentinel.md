# Arjun0014/project-sentinel

- 结论：**值得一试**。先用 `claude --plugin-dir` 不安装地在单个长任务会话里试跑，打开 Autopilot、状态栏和 Activity，用 Handoff Health 与跨交接的里程碑连续性判断是否真的减少了上下文溢出和人工盯守。理由是 README 给出了可直接复制的安装、Desktop 配置和斜杠命令，但它建立在仍处 early access 的 function-hooks 插件 API 上、只在 Windows 11 和 Claude Code 2.1.289/2.1.293/2.1.295 上验证过，不宜直接定为团队标准。
- 原文：https://github.com/Arjun0014/project-sentinel
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-11T14:12:19.511Z

## 是什么

Project Sentinel（1.4.0 前叫 Control Room，面板名和 `/cr` 命令保留）是一个 Claude Code 插件，定位是「长时间 Claude Code 运行的任务控制台」：提示框上方的状态栏 HUD、对话旁的 Control Room 面板、Autopilot（上下文自动交接）、Cache Guardian（提示缓存守护）、跨交接的 run progress、Operations（Mission Queue / Decision Inbox / Watchers / Cold Resume Guard / Agent Command Center / Run Budget）、Answer styles 与 Quest log、策略与 profiles，以及状态栏上的小角色 Kit。支持终端 CLI 和 Claude Desktop 的 Code tab（本地会话）。当前版本 1.6.3，MIT 许可，无运行时依赖、无构建步骤（Claude Code 直接加载其 TypeScript）。

## 具体做法

以下步骤全部来自 README，命令原样保留。

1. **对齐前置条件**：Claude Code **2.1.289 或更新**，且带 function-hooks 插件 API（mods）。用 `claude --version` 检查。运行面为终端 CLI，或 Claude Desktop 的 Code tab 本地会话。除此之外不需要别的东西（无运行时依赖、无构建步骤）。

2. **安装（终端与 Desktop 通用）**：
```bash
claude plugin marketplace add Arjun0014/project-sentinel
```
```bash
claude plugin install project-sentinel@control-room
```
marketplace 名仍是 `control-room`，里面的插件是 `project-sentinel`。也可以在会话内一步完成（Claude Code 2.1.275 或更新）：`/plugin install project-sentinel --marketplace Arjun0014/project-sentinel`。

3. **用本地 clone 安装**：`claude plugin marketplace add /path/to/project-sentinel`。终端会直接从该文件夹读已安装的 folder marketplace，所以拉取改动后在会话里运行 `/reload-plugins`。Desktop 的 Code tab 可能加载安装时 Claude Code 复制的那一份，因此新版本后要 `claude plugin update project-sentinel@control-room`，再开新会话。

4. **不安装地试一个会话**（最小试用方式）：
```bash
claude --plugin-dir /path/to/project-sentinel/plugins/project-sentinel
```
不安装任何东西，插件只对该会话生效，改动可热加载。

5. **在 Claude Desktop（Code tab）加载工作副本**：把文件夹名写进 `~/.claude/settings.json` 的 `env` 块，Claude Code 会为 Desktop 启动的会话读取 `CLAUDE_CODE_PLUGIN_DIRS`：
```json
{
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/project-sentinel/plugins/project-sentinel" }
}
```
多个文件夹用平台的路径列表分隔符（Windows 用 `;`，其他平台用 `:`）。远程（云）会话尚未测试。

6. **从旧版 Control Room 迁移**（1.4.0 之前装成 `control-room@control-room`）：
```bash
claude plugin marketplace update control-room
```
marketplace 会把旧名映射到新名，更新会连带移动你的安装（含 `enabledPlugins` 项）；下次会话加载 Project Sentinel 时，它会一次性读取旧 store（多个时取最后写入的那个），把设置、运行、Quest log 和学到的提示缓存信息复制过去，旧文件保持原样。更新期间开着的会话继续用 Control Room，Project Sentinel 在旁边待命，两者不会同时动作。行为有两处变化：`Allow` 权限状态被移除（已保存的 Allow 读作 Default），点 Kit 不再打开面板（改用状态栏上的按钮）。

7. **更新**：`claude plugin update project-sentinel@control-room`；或打开 `/plugin` 里的 **Marketplaces**，选中 `control-room`，选 **Enable auto-update**（对自行添加的 marketplace 默认关闭）。

8. **卸载**：`claude plugin uninstall project-sentinel@control-room`。

9. **打开面板并熟悉命令**：`/cr` 打开 Control Room（Overview / Context / Behavior / Guardrails / Activity / Setup 六节）。README 中出现的其它命令：`/cr status`、`/cr cache`、`/cr decisions`、`/cr decide D-2`、`/cr diagnostics`，以及示例 `/cr queue --handoff`、`/cr watch in 2h … --fresh`、`/cr budget $30`。终端里所有控件都能点击或用 Tab+Enter 操作，且没有会卡住的弹窗。

10. **开 Autopilot（默认 Off）**：在 Context 里设一个阈值（窗口的百分比，或 token 数；截图中出现过 70% 与 80% 的 handoff 刻度）。到阈值时 Claude 先做完当前步骤，然后执行交接：记录 run 的里程碑、更新项目文档、CLAUDE.md 只留持久指令、跑一次最小验证、用自己的话写 `NEXT_SESSION_PROMPT.md`；Project Sentinel 接着运行 `/clear`，用 run 的里程碑和目标播种新上下文，Claude 自行继续。每一步都在下一轮开始或结束时推进，绝不按定时器走。交接轮结束时若它启动的后台工作（渲染、测试）还在跑，会等 Claude Code 报告的结果，把结果写进 notes，再清空并自行继续。靠近阈值启动的新上下文会先获得工作空间，之后才允许再次交接。压缩（compaction）是选项，或清空被拒时的兜底（Desktop 和其它 SDK 会话里以 `/compact` 执行）。交接中途重载插件会继续这次交接，不会起第二次。

11. **用 Watchers 把 run 停到某个时间再唤醒**（Operations → *Watchers* 或 `/cr watch in 2h S-002 result`，也支持 `at 14:00`、`tomorrow at 9am`；含糊的 `at 2:30` 会被询问而不是猜）。三种策略：*Keep warm* 用 Keep warm 保住对话缓存到唤醒点；*Fresh* 不花缓存钱，从交接 notes 在新上下文里唤醒；*Smart* 自己选并说明理由。若 run 在装了 watcher 之后已经移动过，watcher 不会清空它，而是提示 *Watcher due* 并给出 Check now / Reschedule / Dismiss。Fresh 唤醒需要健康的 resume 状态。Watchers 只在 Claude Code 运行时工作（不安装守护进程），关闭期间到点的 watcher 会在会话重开后等你。

12. **用 Mission Queue 投递「以后再做」的工作**：Activity → Operations 的 *Add work for later*（并指定何时投递），或 `/cr queue <text>`。每项只在边界投递：下一个安全边界（当前里程碑完成或本轮结束）、本轮之后、当前里程碑之后，或下一个新上下文。绝不插进某一轮的推理中间：轮中到点的项随下一批工具结果走，否则在本轮结束时作为独立提示。可编辑、重排、立刻投递、删除；跨 `/clear`、交接、重载和恢复会话与 run 一起保留，只投递一次。

13. **让需要你拍板的选择不阻塞工作**：插件给 Claude 一个 `decision_request` 工具（选择方案、是否删除生成文件、CI 过了是否发布）。它停在 Activity → Operations → *Needs review*，带选项和一个写自己话的输入框；`/cr decisions` 列出，`/cr decide D-2` 用 Claude Code 自己的对话框提问。答复随 Claude 下一批工具结果送达；若 run 正等它，就作为独立提示；否则随你下一条消息。Claude Code 自己的权限提示和确认永远不会被这里延后。

14. **按需开启成本/资源相关的护栏**：Run Budget（默认 Off）设成本、墙钟时间和交接次数上限，80% 时提示一次，到上限时可选只通知 / 自行开工前先问 / 让 Claude 做完当前里程碑再暂停，但不会中断正在进行的工具调用或轮次。Machine load（默认 Off）给 CPU 和内存的建议上限（Low/Medium/High/Custom），它不是 OS 配额，只能停 Claude 自己启动的后台任务。Cache Guardian 默认 On：会在会重发 100k+ 热 token 的模型切换前先确认，热缓存（20k token 起）时模型路由不再降级对话，缓存热时设置变更以 notes 形式送达而不是重写被缓存的系统提示；*Keep warm*（默认 Off）在你离开时于缓存过期前不久重发一次最后请求（transcript 看不到），上限由你设的闲置时长决定。Cold Resume Guard 默认 On：向大上下文（默认 100k token）发送消息且缓存确定已失效时，Claude Code 自己的对话框先问：*Continue full session* / *Start fresh from resume state* / *Compact first* / *Cancel*。

15. **选 profile 而不是逐项配**：Normal、Frontier Max、Low Resource、Release / QA 和自定义；Setup 页显示相对所选 profile 究竟改了什么。Answer styles 可选 Standard / Brief / Plain technical（按 ASD-STE100 的简化技术英语规则）/ Mission control（GO、NO-GO、HOLD；GO 只给已验证的）/ Quest log；只影响对你说的话，不影响代码、文件或提交信息，你自己选的 Claude Code output style 优先级更高。

## 对应的研究问题

**1. 能力发现**：README 把几类过去靠人盯的工作交给了插件——状态栏用文字说清 run 在做什么或等什么（工作、思考、跑检查、等你、等一个会自己来的结果、受阻、交接中、完成）；Activity 把「需要看的」放在前面（没人修好的失败并附上说明原因的那行输出、拒绝、慢调用）；Handoff Health 检查交接留下了什么、新上下文接住了什么；Quest log 只给可被计数核验的进展发 XP，绝不按行数或工具调用发。

**2. 任务匹配**：明确针对「长时间运行、会跨多个上下文窗口的编码任务」。同一类等待场景给了三种资源取舍（Watchers 的 Keep warm / Fresh / Smart）；交接用「写 notes + `/clear` + 播种」，压缩只作选项或清空被拒时的兜底；模型路由与 Frontier Max 的关系有明确约束（Frontier Max 下不降级；模型 id 不硬编码）。

**3. 条件供给**：需要 Claude Code ≥2.1.289 与 mods API；当 Claude Code 不提供 task list 时（其任务工具在 2.1.29x 默认关闭），插件给 Claude 一个小的 `milestones` 工具来维持里程碑；`decision_request` 工具把「属于你但不该停工」的选择交给你；CLAUDE.md 只留给持久指令；权限策略按类别给 Default / Ask / Deny（包安装、网络、下载、项目内编辑、项目外编辑、删文件、commit、push、force push 与 reset、部署发布、危险命令），Ask 即使在不会问的权限模式下也先问你，且从不代你回答权限提示、从不放宽 deny、plan mode 或组织设置。

**4. 主动推进**：Autopilot 到阈值自动交接并继续；Watchers 按时间把 run 停住再唤醒（`in 2h`、`at 14:00`、`tomorrow at 9am`）；Mission Queue 在边界投递（含「下一个新上下文」）；Decision Inbox 让你工作时答复随工具结果回到 Claude；Keep warm 在你离开时保持缓存；Lazy-exit guard（默认 Off）在 Claude 提前收工（把活推回给你、可做而未做的 next steps、未验证的断言）时继续这一轮。注意 Autopilot 每步由轮次开始/结束驱动、不靠定时器；Watchers 依赖 Claude Code 进程运行，无守护进程。

**5. 效果验证**：Handoff Health 与 Continuity 逐项检查交接结果（run state saved、进行中的里程碑、notes、docs updated、validation recorded；以及 notes read、run state restored、milestone picked up、docs read、work resumed），并且「从工具调用计数，绝不算 Claude 说的话」；run progress 的里程碑计数跨交接持续，所以上下文条重置时工作条继续上升；Keep warm 的刷新会被对话自己的下一次请求核查，*VERIFIED*（过期后它确实读了缓存）或 *FAILED*（在无变化的情况下重建，随即暂停 Keep warm），网络抖动导致的必要重试不计入；Activity 里每个 check 每次运行是一个点，每个变更文件按 code/tests/docs/config 分组并带 diffstat 和 diff；成本只按 Claude Code 报告显示，`—` 表示未报告，缓存过期、命中率和原因都从报告的 token 数推导，不做估算。

## 与已有做法的关系

清单中有 **Claude Code**（状态 adopt）：Project Sentinel 是它的插件，强依赖 Claude Code ≥2.1.289 的 function-hooks 插件 API，属于「平台 + 扩展」关系，本身不替代 Claude Code。清单中还有 **Semble**（状态 try），但材料里没有给出 Semble 的任何说明，无法判断二者关系，也不做猜测。因此只能确认：与 Claude Code 是直接前置依赖，与其余条目关系不明。

## 证据与局限

**原文给出的证据**：完整的安装、迁移、更新、卸载命令；Desktop 的 `settings.json` 配置片段；一批斜杠命令示例（`/cr queue --handoff`、`/cr watch in 2h … --fresh`、`/cr budget $30` 等）；一张覆盖 30 余个系统的功能表，逐项写明「做什么」和默认值（On/Off/打开方式）；兼容性声明（在 Claude Code 2.1.289、2.1.293、2.1.295 上、Windows 11 验证）；MIT 许可与 CI badge；以及截图和它们各自的注释。

**属于作者主张、原文未给实测数据的部分**：所有「改善监控和干预」的价值陈述都没有任务级前后对比；仓库只有 34 stars；没有任何性能、成本节约或成功率的量化结果。

**必须注意的证据陷阱**：截图中出现的具体数字（例如 context 48%/51%、handoff 刻度 80%、`CACHE rebuilt 446k`、`86% read from the cache`、run 29）来自 README 自己说明的**开发用 demo driver 驱动的脚本化轮次**——工具调用是真的（一个先失败后修好的测试、带测试的新代码、一个不存在的 lint 脚本），但**没有模型写那些文字，token 数是脚本化的，其中还包含一次模型切换**，因此 Claude Code 不报告成本，界面显示 `$0.00`。这些数字不能当作收益证据。Desktop 的 Operations 截图是用 `tools/desktop-preview` 按插件在 `desktop` 表面画的树绘制的预览，字体和颜色是接近的猜测，Operations 尚未在应用内拍照；Desktop 上 1.0.1 之后新增的功能（两行状态栏、Activity 图表、answer styles、Cache 卡、Kit）都还没有 Desktop 实拍。

**适用条件与风险**：项目建立在仍属 early access、可能随 Claude Code 版本变化的 function-hooks 插件 API 上；只在 Windows 11 上验证；远程云会话未测试；Desktop 的 Git 条是应用自己的，插件不能绘制、隐藏或移动它。原文在 Configuration 一节被截断（止于「Settings and run history live in Claude Code's per-plugin store」），所以安装之外的具体配置项、缓存生命周期如何被学习、profiles 的逐项内容等，本次只能依据 README 正文与表格判断。

## 怎么试、怎么验证

**最小试用**：不要先全量安装。用 `claude --plugin-dir /path/to/project-sentinel/plugins/project-sentinel` 在**一个真实的长任务**上跑一个会话；若在 Desktop，用 `CLAUDE_CODE_PLUGIN_DIRS` 指向工作副本。开启状态栏（默认 On），把 Autopilot 的阈值设得比默认更容易触发（便于在有限时间里观察到交接），Activity 设为常用视图。全程保留卸载退路：`claude plugin uninstall project-sentinel@control-room`。

**判断有没有改善的指标**（都用界面/日志里可核验的项，不信叙述）：

- **交接完整性**：每次交接后看 Context → *Last handoff*，五个「留下」项（run state saved、milestone under way、notes、docs updated、validation recorded）和新上下文首轮结束后的五个「接住」项是否成立；缺项就是交接在丢状态。
- **进度连续性**：跨交接的里程碑计数（WORK n/N）是否持续上升，是否出现里程碑长期停在 *verifying* 或 *blocked* 以及卡在什么上。
- **缓存行为**：rebuild 的次数与原因分类，是否与你自己做过的事（模型切换、策略变更、新工具、压缩、闲置超期）对得上；模型切换确认是否拦下了会重发 100k+ 热 token 的操作；Keep warm 的 *VERIFIED* / *FAILED* 比例，出现 FAILED 后是否如设计那样暂停。
- **恢复决策**：在大上下文（>100k token）恢复时，Cold Resume Guard 给出的失效原因和将重处理的 token 数是否合理，`~$` 是否按 Claude Code 自己的估算下限理解。
- **定时唤醒**：`/cr watch in 2h …` 到点是否按时唤醒；run 期间已推进时，是否出现 *Watcher due* 而不是直接清空。
- **不阻塞**：decision_request 抛给你的问题是否真的没有停住 Claude 的工作，答复是否随下一批工具结果或下一条消息送达。
- **横向对比**：选两三个同类长任务，一个开 Project Sentinel、一个不开，比较会话数、交接次数、每次会话的峰值上下文与总成本（全部取 Claude Code 报告值），以及人工介入次数。
- **反例检查**：开了 Lazy-exit guard 后是否误拦真正完成的工作、真实阻塞或你已决定的选项；Answer styles 是否越界改动了代码、文件或提交信息（README 说不会）。
- **兼容性哨兵**：升级 Claude Code 后先在单个会话里 `/cr diagnostics` 与 `/cr status` 走一遍，确认插件仍加载、状态栏仍出数；因 API 属 early access，升级前记录当前 `claude --version` 便于回退定位。
