# whyashthakker/awesome-claude-code-mods

- 结论：**值得一试**。可以小范围试：先注册 marketplace，再挑 1–2 个 Session 观测类 mod（Context Meter、Tool Timing、Error Inbox）在现有项目里跑一两周，用它们的计数指标做开启前后对比；理由是 README 给出了可直接复制的安装命令与明确版本前提，且观测类 mod 恰好产出「效果验证」需要的量化数据，但这是第三方未审计的插件集合、截图也非原生捕获，不适合整体照单全收。
- 原文：https://github.com/whyashthakker/awesome-claude-code-mods
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-09T05:46:39.617Z

## 是什么

`whyashthakker/awesome-claude-code-mods` 是一个 Claude Code 插件（mod）集合仓库，README 自称包含 **70 个独立、MIT 许可的打包插件**：50 个通用 + 20 个 Claude Desktop 专用，另有社区部分收录 14 个外部项目。

目录按用途分了 7 类：

- **Session（8）**：Context Meter 看上下文窗口占用与剩余 token、Quota Watch 看配额窗口与重置时间、Cache Inspector 按请求统计 cache 读/写/未缓存输入、Tool Timing 统计工具延迟/调用数/失败、Error Inbox 汇总最近 30 次失败或被拒的工具调用、Edit Heatmap 按路径统计成功的 Edit/Write、Turn Timeline 每轮时长/ token/ 中断状态、Agent Board 查看子 agent。
- **Git（8）**：分支/上游/脏文件、暂存 diff 审阅、最近 20 条提交、stash、worktree、冲突标记计数、blame 前 80 行、ignore 规则解释。
- **Repository（10）**：文件树、npm scripts、依赖表、TODO/FIXME/HACK 查找、Markdown 标题大纲、JSON 键摘要、CSV 预览、小日志尾 60 行、env 示例变量、两文件逐行对比。
- **Workspace（8）**：Scratchpad、Task Board、Decision Log、Snippet Shelf、Link Shelf、Prompt Shelf、Release Checklist、Handoff Notes。
- **Utilities（10）**：正则测试、JSON 格式化、URL 拆解、Base64、时间戳转换、哈希、颜色对比度、UUID、文本计数、ASCII 动画。
- **Workflow（6）**：25 分钟专注倒计时、秒表、测试/构建命令台账、最近 40 条 Bash 命令历史、越出指定路径前缀时告警的 Scope Watch、可开关的只读模式守卫（拒绝内置改动型工具和 Bash）。
- **Desktop（20）**：把上面的观测项做成图表/面板，如 Desktop Usage Strip（配额、重置倒计时、token、成本）、Desktop Context Map、Desktop Cost Watch、Desktop Review Desk、Desktop Prompt Builder（按目标/约束/验收标准搭提示词）、Desktop Session Brief、Desktop Checklist Desk 等。

README 明确说明：这些是**可执行的 mod，不是提示词或 skill 清单**；每个带可运行源码、原生 Claude Code 测试、安装说明、访问权限说明和截图。

## 具体做法

**前提（README 明示）**：
- Claude Code **2.1.287+**，作者在 **2.1.288** 上测试过。
- mod 默认启用，不需要早期的 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` 之类环境变量开关。
- 支持 CLI 和 Desktop 的 **Code** tab。
- **VS Code 聊天面板和 `claude -p` 会执行 hooks，但不显示 mod 面板。**
- 无需运行时依赖、无需构建步骤。Git 类工具要求 Git 在 PATH 上；包类查看器要求项目里有 `package.json`，或你手动指定路径。

1. **注册 marketplace 并装第一个 mod**（README「Start in under a minute」原命令）：

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install task-board@awesome-claude-code-mods
```

2. **会话已开着的话先重载插件，再打开面板**：

```text
/reload-plugins
/task-board
```

3. **使用 Task Board 的交互**：输入任务，按 Enter 保存；用 task 按钮标记完成。键盘：Tab 在控件间移动，Esc 关闭面板，Ctrl+X 再按 Tab 把键盘焦点送回面板。

4. **不装 marketplace，直接从源码试单个 mod**（适合先评估再决定装不装）：

```sh
git clone https://github.com/whyashthakker/awesome-claude-code-mods.git
cd awesome-claude-code-mods
claude --plugin-dir ./mods/context-meter
```

然后运行 `/context-meter`。把 `context-meter` 换成目录里的任意 mod 名即可；可以独立安装多个，命令里用各自 mod 名。

5. **Desktop 版起步**：

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install desktop-usage-strip@awesome-claude-code-mods
```

在 Claude Desktop 里打开本地 Code 会话，必要时 `/reload-plugins`，再 `/desktop-usage-strip`。若 marketplace 已注册，先更新：

```text
claude plugin marketplace update awesome-claude-code-mods
```

该 strip 显示配额/重置、上下文、观测到的 token 总量和上报的会话 USD，带隐藏/显示控件；缺失的数字会标注；**成本不等于订阅账单**。

6. **按需选型**：从上面 7 个分类里挑；每行名字链到该 mod 的 README、用法、访问权限说明和源码，截图可点开全分辨率。

7. **社区 mod 单独装**：从各作者的 marketplace 安装，例如 README 给出的示例：

```text
/plugin marketplace add jarrodwatts/claude-image-view
/plugin install image-view
```

## 对应的研究问题

**1. 能力发现**
这份目录本身就是一张「还可以交给 AI 做这些」的索引：上下文/配额/缓存/工具延迟的实时观测、Git 暂存前审阅与冲突计数、TODO 扫描、Markdown 大纲、以及一批纯本地小工具（正则、JSON、URL、Base64、时间戳、哈希、颜色对比度、UUID、文本计数）。这些都是平时容易想不起来让 AI 顺手做的杂活。

**2. 任务匹配**
- 适合：需要**持续可见的状态**、可交互切换、零运行时依赖的辅助任务——观测面板、清单、货架类、本地小工具。
- 不适合：无头场景（`claude -p` 不显示面板）、VS Code 聊天面板。这是明确的使用边界。
- 依赖前提决定匹配：Git 类要 PATH 上有 Git；包类查看器要有 `package.json`；社区里的图像类 mod 要 kitty 图形协议终端（macOS/Linux）。

**3. 条件供给**
需要提供：Claude Code ≥2.1.287、Git on PATH、`package.json` 或指定路径、可读的本地文件（日志、env 示例）、按需的终端图形能力。权限方面 README 给了两条线索：安装插件即意味着让第三方代码在你的会话里跑；而 `read-only-mode` 这个 mod 提供了反向控制——一个可以拒绝内置改动型工具和 Bash 的提醒守卫。

**4. 主动推进**
README 里时间/事件驱动的成分主要在两处，且都偏弱：
- 社区条目 `cc-pr-tracker`：把 PR URL 当整条提示词粘贴，mod 消耗该提示词、不产生模型轮次，**每分钟刷新**，状态变化时告警。
- 社区条目 `claude-queue`：用 `/q <text>` 排队后续提示，在当前轮和跟踪中的后台任务结束后**自动提交**，也可跑排队的 slash 命令。
- 计时类（Focus Clock 25 分钟、Stopwatch、Desktop Break Bell）是给人用的计时器，不是 AI 自动推进。

注意这三条都在「未安装、未运行、未审计」的社区部分。

**5. 效果验证**
这是本仓库最直接可用的部分。它提供了可采集的量化指标：上下文占用与剩余 token、按请求的 cache 读/写/未缓存输入、工具延迟与调用数、工具失败次数、最近 30 次被拒/失败的调用、按路径的成功 Edit/Write 次数、每轮时长与 token 与中断状态。这正好可以作为「AI 用得好不好」的前后对比底座。

## 与已有做法的关系

清单中相关条目：**Claude Code（adopt）**、**Claude Code Mods（study）**。

这个仓库是 Claude Code Mods 这一概念的一个具体实现集合和索引，把「mods 能干什么」从概念变成一份可安装清单。README 自己说明：其研究链接用于记录生态，仓库里的 70 个实现是原创的，**部分用例与既有 mod 有重叠**。所以它不改变 Claude Code 的基本用法，而是在其上叠加观测面板和本地小工具层。

## 证据与局限

**原文给出的、可核的东西**
- 仓库 33 stars（来自线索元数据）。
- README 声称 70 个 MIT 打包插件，每个带源码、原生测试、安装说明、访问说明、截图。
- 社区部分 14 个条目在 **2026-10-03** 对照作者文档核查过。
- 截图出处的明确声明：截图是 Claude Code 测试套件用 fixture 数据捕获的 mod 渲染树，在浏览器预览里绘制，**不是 Claude Code 原生 app 截图**。
- 社区条目的明确声明：README 里的描述和命令是**文档审查**，作者**没有安装、没有运行、没有做安全审计**。
- 版本边界：社区部分建议 2.1.287+，并指出 Anthropic 当前文档称 mods 默认启用、旧 flag 被忽略；标注 **early-access documentation** 的条目描述的是旧构建，与当前 API 的兼容性未验证。

**只是作者主张、未经第三方验证**
- 「70 个都能用」「1 分钟上手」「原生测试」的具体结果与可靠性。
- 各 mod 的准确性——例如 cctop 的 README 自己说部分 forecast 和 token 计算是估算；Desktop Usage Strip 的 USD 不是订阅账单。
- 观测数据的口径依赖本地会话数据，缺失值会被标注而非补全。

**适用条件**
- 必须在 Claude Code CLI 或 Desktop 的 Code tab 里用。
- VS Code 聊天面板、`claude -p` 不显示面板。
- 部分社区 mod 需要特定终端（kitty graphics、Unicode placeholders 等）、macOS/Linux、`gh` 认证、浏览器二进制、甚至特定硬件（claude-doom 为 Apple Silicon alpha）。
- 安全上：装 mod 等于在会话内执行第三方代码，社区部分作者自己声明未做安全审计。

## 怎么试、怎么验证

**最小试用（1 周内可完成）**
1. 在一个**非敏感、小体量**的现有项目里注册 marketplace（步骤 1 的命令）。
2. 只装 1–2 个观测类 mod，建议 `context-meter` + `tool-timing`（或 `error-inbox`）：

```sh
claude plugin install context-meter@awesome-claude-code-mods
claude plugin install tool-timing@awesome-claude-code-mods
```

3. 会话内 `/reload-plugins`，然后分别开面板。
4. 正常干一周活，记下这些数字：

| 指标 | 取自 | 看什么 |
| --- | --- | --- |
| 工具失败/被拒调用次数 | Error Inbox / Tool Timing | 是否比试用前少，或能否提前发现 |
| 单次工具延迟 | Tool Timing | 是否有异常慢的工具拖住整轮 |
| 上下文占用与剩余 token | Context Meter | 是否频繁逼近上限、被迫重述 |
| 每轮时长/token/中断 | Turn Timeline | 中断次数是否下降 |
| cache 读/写/未缓存输入 | Cache Inspector | 是否反复重建上下文 |

5. 想做前后对比就先用一周不用这些 mod，再开一周用，比较同一类任务上的失败次数、平均延迟、上下文溢出/压缩次数。Desktop 用户可用 Desktop Usage Strip / Desktop Token Flow / Desktop Tool Pulse 直接看图，但**成本数字只作参考，不是账单**。

**判断有没有改善**
- 客观：工具失败次数、平均延迟、中断次数、上下文重述次数在同类任务上是否下降；单位任务的 token 是否更可预测。
- 主观：是否更早发现 AI 走偏（Error Inbox 提前暴露失败调用）、是否减少「又要重讲一遍上下文」的情况。

**风险控制**
- 不要一次性全装 70 个；先装 1–2 个，确认无副作用再扩。
- 社区部分未审计，若要用，优先在脱敏环境里试，必要时配合 `read-only-mode` 或 `secret-redactor`（后者只做会话内存内可逆替换，重启即失效，且 README 明确它不保证覆盖所有敏感值）。
- 遇到问题先 `/reload-plugins`；marketplace 更新用 `claude plugin marketplace update awesome-claude-code-mods`。
