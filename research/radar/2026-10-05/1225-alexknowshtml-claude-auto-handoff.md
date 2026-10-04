# alexknowshtml/claude-auto-handoff

- 结论：**值得一试**。建议小范围试：先按 README 的安装步骤在支持 mods 的 Claude Code 构建上装好，用 AUTO_HANDOFF_TOKENS=60000 在一个长会话里跑一次交接，检查生成的简报是否准确、新会话能否续接；理由是它给出了完整可照做的安装、配置与模板改法，但依赖尚未普及的 mods 构建、版本仅 0.8.x 且只有作者自测数据，不足以直接 adopt。
- 原文：https://github.com/alexknowshtml/claude-auto-handoff
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-04T16:49:13.842Z

## 是什么

claude-auto-handoff 是 Claude Code 的一个 mod（插件），在会话上下文接近阈值时，不再使用内置的 auto-compact（原地压缩），而是让 Haiku 把当前会话写成一份**结构化交接简报**存到磁盘，然后执行 `/clear`，并用一行提示把新会话接上——新会话读简报后继续干活。简报包含：进行中的工作、决策、待验证的假设、死路、你的最后请求及是否已被回答、下一步。其中 files/commits/issues 等段落由代码直接从 transcript 提取，不依赖模型记忆。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **前提**：需要一个带 mods（function-hook plugins）的 Claude Code 构建。
2. **安装并加载**：
   ```sh
   git clone https://github.com/alexknowshtml/claude-auto-handoff.git ~/claude-auto-handoff
   claude --plugin-dir ~/claude-auto-handoff
   ```
3. **让每个会话都加载**（可选）：把插件目录写进 shell 环境变量，或写进 `~/.claude/settings.json` 的 `env` 块：
   ```json
   { "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-auto-handoff" } }
   ```
4. **配置**：所有设置是 `/config` 里 auto-handoff 下的行，存储在 `~/.claude/settings.json` 的 `pluginConfigs`。默认值与作用：

   | 设置 | 默认 | 作用 |
   |---|---|---|
   | `threshold` | `160000` | 触发交接的上下文 token 数（为 200k 窗口留出简报与当前回合的空间）。被种子化的会话至少要在自身起始大小之后 40k 才交接；设得更低时面板会告诉你实际阈值线在哪 |
   | `maxConsecutiveHandoffs` | `2` | 在你输入提示之前允许的连续交接次数，超过则暂停等待你输入 |
   | `briefTemplate` | `~/.claude/auto-handoff/brief.md` | Haiku 要写的章节模板 |
   | `instructionsTemplate` | `~/.claude/auto-handoff/instructions.md` | 新会话被告知要做什么 |
   | `ignoreFiles` | 空 | 正则，匹配要从简报中排除的已编辑文件（如缓存、同步状态） |
   | `viewer` | `tailscale:3846` | 简报页面的服务地址 `host:port`；host 为 `tailscale` 表示本机 Tailscale IP，未装 Tailscale 时用 `127.0.0.1`；留空则不启服务，链接为本地文件 |

   环境变量：
   - `AUTO_HANDOFF_TOKENS=60000` 为单次运行覆盖阈值，用于不填满 160k 也能观察一次交接（该 shell 内持续生效）。种子会话起始约 45k，低于约 85k 的取值会使其剩余空间不足 40k，此时改为 start + 40k 交接，面板显示 `threshold 60k (AUTO_HANDOFF_TOKENS) leaves 15k ...`。
   - `AUTO_HANDOFF_DISABLE=1` 对单个会话关闭该 mod（含 viewer 服务）。
   - `DISABLE_AUTO_COMPACT` 也会关闭它；当别的东西在管理上下文上限（如把会话管道化的 wrapper）时使用，否则 `/clear` 会破坏管道。viewer 服务仍会运行。
5. **改简报结构与规则**：默认模板在仓库 [`templates/`](templates/) 下。会话首次启动时，mod 会把 `templates/brief.md` 和 `templates/instructions.md` 复制到 `~/.claude/auto-handoff/`（若不存在）。**改这两个副本，不要改仓库里的**，这样 `git pull` 不会覆盖你的修改，下一次交接就用你的版本。想恢复默认就删掉副本，下次启动会重新复制；想放到别处就把 `briefTemplate` / `instructionsTemplate` 指过去。
   - 编辑 `brief.md`：增删、改名或重排 `## ` 章节，标题下的文字告诉 Haiku 该写什么。Haiku 回复中只要包含你的至少一个标题就算有效，否则回退到 facts-only 简报。**不要写 files 和 commits 段**，这两段由 mod 从 transcript 用代码添加。
   - 编辑 `instructions.md`：它有一个开关：
     ```md
     {{#priority}}Shown when the last request is not fully answered.{{/priority}}
     {{^priority}}Shown when it is.{{/priority}}
     ```
     该开关读取简报的 `## Last Request from the User` 段及其 `Status:` 行；想让开关生效，这两者都要保留在 `brief.md` 里。
6. **（可选）状态栏链接**：`statusline/handoff-link.sh` 包装你原有的状态栏命令，当会话来自交接时追加一行 `↪ <link>`。在 `~/.claude/settings.json` 里把它设为 `statusLine` 命令，原有命令放在它后面：
   ```json
   "statusLine": { "type": "command", "command": "~/claude-auto-handoff/statusline/handoff-link.sh ~/.claude/my-statusline.sh" }
   ```
   需要 `jq`。它从上一份简报的头部（`to:` 写本会话名、`viewer:` 写页面地址）里找链接。
7. **运行机制（了解即可，便于排障）**：① 阈值——每轮之后、每次模型请求之前检查上下文大小（含尚未计量的工具输出）；超过阈值后拒绝新的工具调用，避免一次批量读取撑爆窗口；未计量的工具输出是可能偏高的估计，所以真实大小有时低于阈值；被拒绝的调用仍会在下一次请求或回合结束时触发交接。② 简报——Haiku 依据 transcript 写；Haiku 失败时用仅事实的简报兜底；简报写到 `~/.claude/state/auto-handoff/<session-id>.md`。③ 清空并播种——mod 执行 `/clear`，给新会话发一行：读简报并按其 Instructions 段执行；纯 SSH 下终端通常不识别链接，若终端支持可设 `FORCE_HYPERLINK=1`，或用状态栏链接。④ 提示框上方有面板，显示每步的盲文 spinner，完成后读 `✓ handed off · 162k → 45k` 并带 `open brief` 链接，10 秒后收起；失败、循环守卫暂停、facts-only 简报、阈值过紧会一直停留到你按 Dismiss；自己输入 `/clear` 会关掉面板（正在交接时除外）；移动端 App 和 VS Code 不画面板，改以 toast 呈现。⑤ 查看器——每份简报在 `~/.claude/state/auto-handoff/pages/` 有可读页面，同一轮的所有交接按顺序互链，链接形如 `http://100.x.y.z:3846/1a2b3c4d`。
8. **（开发用）校验**：
   ```sh
   claude plugin validate .
   claude plugin test .
   ```
   以 `--plugin-dir` 加载时，保存文件会热重载。
9. **日志**：全部动作记录在 `~/.claude/state/auto-handoff/auto-handoff.log`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：把「长会话如何续接」这件事从模型自己原地压缩，改造成一个可编辑、可落盘的交接流程——即上下文管理本身可以交给一个流程性工具，而不是留给模型隐式总结。
- **任务匹配**：总结性、结构化的写简报交给便宜快速的 Haiku；主会话继续用主模型干活；files/commits/issues 这类确定性数据由代码从 transcript 提取，不交给模型记忆——对应「确定性信息用代码、模糊总结用模型」的分工。Haiku 失败时回退 facts-only 简报。
- **条件供给**：需要支持 mods 的 Claude Code 构建、插件目录、`~/.claude/state` 与 `~/.claude/auto-handoff/` 的写权限；可选 Tailscale（供跨设备看页面）、`jq`（状态栏脚本）、终端超链接支持（`FORCE_HYPERLINK=1`）。反馈渠道有：提示框上方面板、移动端/VS Code 的 toast、可选状态栏链接、日志文件。
- **主动推进**：由状态触发——每轮之后和每次模型请求前检查上下文大小，超过 `threshold` 即触发（拒绝新工具调用后也会在下一次请求或回合结束触发）；循环守卫限制连续交接次数（`maxConsecutiveHandoffs` 默认 2），并阻止刚启动就很大的新会话立刻再次交接；种子会话至少要在起始大小后 40k 才交接。
- **效果验证**：面板给出前后 token 对比（示例 `162k → 45k`）与 `open brief` 链接；日志记录全部动作；0.8.3 起简报必须写入真实数字（交接时 token、阈值及其来源、会话起始大小、无人输入时已运行几次交接），否则写 "unknown"，0.8.4 起不在 Handoff Numbers 里的 token 数字被标记 `[unverified: not in Handoff Numbers]` 并记日志。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中有 **Claude Code**（tool，状态 adopt）。本条目是 Claude Code 的插件/mod，属于对该工具能力边界的扩展，且明确以「替换内置 auto-compact」为定位。清单中没有其他相关条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- **给出的数据/案例**：一次 Haiku 上的实际运行，阈值设 80k——mod 在阈值处拒绝一次读取、写简报、清空，新会话约 **7 秒**后回到工作、处于 **31k**（附 demo.gif / demo.mp4）；面板文案示例 `✓ handed off · 162k → 45k`；changelog 中记录了 0.5.0 至 0.8.4 的具体行为变更与修复（如被拒调用必定导致交接、第二个会话遇到端口被占用时安静退出、真实数字与 `[unverified]` 标记）。
- **仅为作者主张**：为何不用 auto-compact——「原地压缩无法控制保留什么，而交接简报结构固定、可编辑」；「files/commits/issues 来自 transcript 的代码提取，不依赖模型记忆」。这些是设计论断，原文没有对照实验或质量评估数据。
- **适用条件与局限**：需要带 mods 的 Claude Code 构建（不一定人人可用）；仓库 39 stars、版本 0.8.x，属早期项目，自测为主；未计量工具输出是「可能偏高」的估计，真实大小有时低于阈值；`viewer` 默认只在 Tailscale 网内可达，否则退到 `127.0.0.1` 仅本机；与把会话管道化的 wrapper 不兼容（需 `DISABLE_AUTO_COMPACT`）；简报有效性的判定标准很宽松（含至少一个标题即算有效），否则回退 facts-only，可能损失信息。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用**：
1. `git clone` 到本地，用 `claude --plugin-dir ~/claude-auto-handoff` 在一个**不那么关键**的长会话里启动。
2. 设 `AUTO_HANDOFF_TOKENS=60000`（或更低）降低阈值，省去填满 160k 的等待。
3. 正常干活直到面板出现，观察四步：写简报 → 清空 → 起新会话 → 新会话恢复；顺手确认被拒绝的工具调用确实以交接收尾。
4. 打开 `~/.claude/state/auto-handoff/<session-id>.md`，逐条核对：工作进展、决策、待验证假设、死路、最后请求及 Status、下一步。
5. 查 `~/.claude/state/auto-handoff/auto-handoff.log` 有无失败与 facts-only 回退。
6. 觉得结构不合适就改 `~/.claude/auto-handoff/brief.md`（不加 files/commits 段）和 `instructions.md`，再跑第二次比较。

**判断有没有改善的指标**：
- 新会话能否直接续上——简报里的「下一步」是否可执行、是否需要你重新解释背景。
- 简报事实准确率：文件/提交等代码提取段是否与实际一致；Haiku 写的数字是否被标 `[unverified]`（标记越多说明它在编数字）。
- 交接前后的 token 变化（面板数字）与交接总耗时。
- 回退率：日志中 facts-only 简报、失败、循环守卫暂停的次数。
- 连续交接是否被 `maxConsecutiveHandoffs` 有效止住（不出现反复清空、原地打转）。
- 与不用该 mod、让 auto-compact 生效的同类长会话对比：你为恢复上下文花的返工时间是否下降。
