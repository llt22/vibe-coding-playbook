# 让长跑的编码 agent 跨上下文窗口交接不断线

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当 Claude Code 的编码任务跑得比一个上下文窗口更久时，如何让它在自动交接、定时等待和需要你拍板的地方都不掉线，并且你能看出它是不是真的减少了上下文溢出和人工盯守。
> 先试这一步：先用 claude --plugin-dir /path/to/project-sentinel/plugins/project-sentinel 在一个长任务会话里不安装地试跑，打开 Autopilot、状态栏和 Activity，用 Handoff Health 与跨交接的里程碑连续性判断它是否真的减少了上下文溢出和人工盯守。
> 最近修订：2026-10-11

## 解决什么问题

你已经在用 Claude Code 或 Cowork，但每次让 AI 做某个职能的活（写 SQL、准备客户通话、审合同、对账等），都要重新解释领域知识、反复交代公司上下文、手动把外部工具的数据贴进去，而且 AI 给出的流程往往是教科书做法，不是你团队实际的做法。另外两个常见缺口：AI 在会话中途问你的问题、顺手发现的 bug、失败的测试，过一会儿就淹没在对话里，要你自己翻回去捞；以及装完一堆插件后，你说不清「到底有没有变好」。第三个缺口在长任务上最扎眼：一个编码任务跑得比一个上下文窗口更久时，交接由谁做、交接后新上下文有没有接住前面的进度、你离开两小时后 run 怎么被唤醒、需要你拍板的选择会不会把整个 run 卡住——过去这些都靠人守着。

本手册用四层叠加来补：

- **职能层**：Anthropic 开源了 11 个知识工作插件（`anthropics/knowledge-work-plugins`），把某个职能需要的 **skills**（Claude 在相关时自动调用的领域知识、最佳实践、分步工作流）、**commands**（你显式触发的斜杠命令）、**connectors**（通过 MCP server 连接的外部工具）和 sub-agents 预先打包。
- **收口层**：`petekp/inbox` 把会话里散落的问题、任务、议题和机会收进一个与会话并排的面板，并在 Claude 声称测试通过、但上次运行失败或改动后没再跑过时叫停。
- **观测层**：Claude Code mod（`whyashthakker/awesome-claude-code-mods`）里的 Session 观测类 mod，能把上下文占用、工具失败次数、工具延迟、每轮时长变成会话里可对比的数字。
- **交接层**：`Arjun0014/project-sentinel`（1.4.0 前叫 Control Room，面板名和 `/cr` 命令保留）是「长时间 Claude Code 运行的任务控制台」。提示框上方的状态栏 HUD 用文字说清 run 在做什么或等什么；对话旁的 Control Room 面板分 Overview / Context / Behavior / Guardrails / Activity / Setup 六节；Autopilot 在上下文到阈值时自动交接（记录 run 的里程碑、更新项目文档、CLAUDE.md 只留持久指令、跑一次最小验证、用自己的话写 `NEXT_SESSION_PROMPT.md`，然后 `/clear` 并用里程碑和目标播种新上下文，Claude 自行继续）；Watchers 把 run 停到某个时间再唤醒；Mission Queue 投递「以后再做」的工作；Decision Inbox 收需要你拍板的选择；另有 Cache Guardian、Cold Resume Guard、Run Budget、Machine load 等护栏。

要解决的问题因此是四件事叠加：如何选一个职能插件、装好、跑通、按团队真实流程改一条；如何让 AI 把没收口的事交出来；如何用数字判断这次改造到底有没有效果；以及长跑任务跨上下文窗口时，如何让交接、等待和拍板都不掉线，并且你能看出它是不是真的少让你盯了。

## 适用与不适用

**适用**：
- 团队已用 Claude Code（有 `claude` CLI）或可用 claude.com/plugins 的 Cowork。
- 所需外部工具能通过 MCP 接入（或你已有 MCP server）。
- 有人愿意花时间读插件的 `skills/` 文件，并按本团队流程改写。
- 你希望把某个职能的领域知识、工具连接和固定动作预先打包，让团队复用。
- 你想让「有没有变好」有数字支撑，愿意多花一步装观测类 mod。用观测层的额外前提：Claude Code 2.1.287+（README 作者在 2.1.288 上测试过），且要在 CLI 或 Claude Desktop 的 Code tab 里用。
- 你希望 AI 在会话里抛出的问题、发现的 bug、失败的测试不会漏掉，并愿意接受每轮回复之后一次额外的小模型调用。用收口层的额外前提：Claude Code 2.1.292（作者构建并测试的版本）；PRs 标签页还需要已安装并登录的 `gh`。
- 你的编码任务会跑得比一个上下文窗口更久，需要跨交接保持进度，并且愿意接受一个建立在仍处 early access 的 function-hooks 插件 API 上的插件。用交接层的额外前提：Claude Code 2.1.289 或更新、且带 function-hooks 插件 API（mods）；运行面为终端 CLI，或 Claude Desktop 的 Code tab 本地会话；README 只在 Windows 11 和 Claude Code 2.1.289 / 2.1.293 / 2.1.295 上验证过。
- 你愿意先在一两个非敏感、小体量的现有项目上试，而不是全公司铺开。

**不适用**：
- 不具备上述条件时，只能停在「看看」。
- 期望开箱即用、不做任何定制就大幅改善。职能插件原文自称 these plugins are generic starting points，价值取决于你是否投入定制。
- 需要先看到官方效果数据、案例或 benchmark 才决定采用。职能插件原文只有「更好更一致」的主张；收口层原文只给了成本数据，没有「减少了多少遗漏」的效果数据；交接层原文只给了机制描述，没有「减少了多少上下文溢出和人工盯守」的量化数据。
- 无法确认 Cowork 的开放范围、价格、区域限制，或无法确认相关仓库许可协议，且要用于生产。
- 无头或非面板场景：VS Code 聊天面板和 `claude -p` 会执行 hooks，但**不显示 mod 面板**，观测层在这里用不了；交接层的运行面也只写了终端 CLI 和 Claude Desktop 的 Code tab 本地会话。
- 敏感项目上装第三方 mod：装 mod 等于让第三方代码在你的会话里跑；mods 仓库的社区部分作者明确声明没有安装、没有运行、没有做安全审计。收口层同样是单作者仓库、无第三方评测，按未审计的第三方代码对待。
- 会话很短、且你本来就很少漏事：收口层每轮一次的额外调用按比例摊得更重，收益可能抵不过成本。
- 任务在单个上下文窗口内就做完：交接层的状态栏和 Autopilot 阈值都用不上，反而多一层你不需要盯的东西。
- 用远程（云）会话：交接层 README 明示尚未测试。
- 机器不是 Windows 11、或 Claude Code 版本不在作者验证过的范围里：交接层先按「未在你的环境验证」对待，别直接定为团队标准。

## 前置条件

1. 能使用 Claude Code（有 `claude` CLI）或访问 claude.com/plugins 的 Cowork。原文未说明 Cowork 的开放范围、价格或区域限制。
2. 观测层要求 Claude Code 2.1.287+。README 说明 mod 默认启用，不需要早期的 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` 之类环境变量开关。
3. 收口层（inbox）用 Claude Code 2.1.292 构建和测试；PRs 标签页需要已安装并登录的 GitHub CLI `gh`；测试/构建要由 Claude 作为独立命令运行，插件才能拿到确切结果。
4. 交接层（Project Sentinel）要求 Claude Code **2.1.289 或更新**，且带 function-hooks 插件 API（mods）。用 `claude --version` 检查。运行面为终端 CLI，或 Claude Desktop 的 Code tab 本地会话；远程（云）会话尚未测试。当前版本 1.6.3，MIT 许可，无运行时依赖、无构建步骤（Claude Code 直接加载其 TypeScript）。
5. 自行确认仓库许可协议后再用于生产。knowledge-work-plugins 原文未说明许可协议；awesome-claude-code-mods 自称 70 个 MIT 打包插件，但社区条目属未审计的第三方项目。
6. 若要换 connector，需要知道自家工具栈的 MCP 接入方式，或已有 MCP server。
7. 能读懂 markdown 和 JSON 文件，愿意按团队真实流程改 skill 指令。
8. 准备一个非敏感、小体量的现有项目做试用。
9. 观测 mod 无需运行时依赖、无需构建步骤。若要装 Git 类 mod，Git 要在 PATH 上；包类查看器要求项目里有 `package.json`，或你手动指定路径。
10. 建议先记录 2–3 次基线（同一任务的完成时间、返工次数、补齐上下文的次数），再装插件对照；交接层另外记同类长任务的上下文溢出/被迫压缩次数，以及你手动守着 run 的次数。
11. 三层的版本口径是错开的：观测层 2.1.287+、收口层在 2.1.292 上构建、交接层 ≥2.1.289。同时用多层之前先 `claude --version` 核对；升级 Claude Code 之后先 `/reload-plugins`，确认各面板还在。
12. 从 1.4.0 之前的 Control Room 升上来时，先确认这两处行为变化：`Allow` 权限状态被移除（已保存的 Allow 读作 Default）；点 Kit 不再打开面板（改用状态栏上的按钮）。
13. 想用 Decision Inbox 那类「需要你拍板但不该停工」的机制，你要能在会话里看到 Claude Code 自己的对话框并作答；插件从不代你回答权限提示。

## 操作步骤

### 第 1 步：选一个与你当前工作最接近的职能插件

原文列出 11 个插件及各自声称的用途：productivity（任务/日历/日常流程/个人上下文）、sales（客户调研、通话准备、pipeline 复盘、外联起草、竞品 battlecard）、customer-support（工单分类、回复起草、升级打包、客户背景调研、把已解决问题转成知识库文章）、product-management（写 spec、路线图、用户研究综合、干系人同步、竞品跟踪）、marketing（内容起草、活动规划、品牌语气、竞品 brief、跨渠道效果汇报）、legal（合同审查、NDA 分类、合规、风险评估、会议准备、模板化回复）、finance（分录准备、对账、报表生成、差异分析、结账管理、审计支持）、data（写 SQL、统计分析、搭看板、分享前自检）、enterprise-search（跨邮件/聊天/文档/wiki 一次查询）、bio-research（临床前研究工具与数据库：文献检索、基因组分析、靶点优先级）、cowork-plugin-management（为组织定制或新建插件）。

**做法**：数据岗选 data，销售选 sales，法务选 legal，以此类推。只挑一个，不要一次装多个。

**预期结果**：你有一个明确的插件名（例如 `sales`），后面命令里会替换。

### 第 2 步：安装职能插件（做法 A / 做法 B）

**做法 A：用 Claude Code 安装**（前提：已安装 `claude` CLI 并能使用 Claude Code）

先添加 marketplace：

```bash
# Add the marketplace first
claude plugin marketplace add anthropics/knowledge-work-plugins
```

再安装具体插件（以 sales 为例）：

```bash
# Then install a specific plugin
claude plugin install sales@knowledge-work-plugins
```

把 `sales` 换成你第 1 步选的插件名。**预期结果**：原文称安装后插件自动激活——Skills fire when relevant, and slash commands are available in your session。

**做法 B：用 Cowork 安装**（前提：能访问 claude.com/plugins）

直接从 https://claude.com/plugins/ 安装，或在 GitHub 浏览完整集合。

**怎么选**：如果你已经在用 Claude Code，走做法 A；如果你用 Cowork，走做法 B。原文未说明 Cowork 的开放范围、价格或区域限制，选之前自行确认。

### 第 3 步：验证职能插件已激活

在会话里确认对应斜杠命令出现，例如 `/sales:call-prep`、`/data:write-query`、`/finance:reconciliation`、`/product-management:write-spec`。

**预期结果**：命令出现在会话中，并且能成功执行。**失败处理**：若命令不出现，说明插件未生效，先回到第 2 步检查 marketplace 是否添加成功，不要继续往下做。

### 第 4 步：读懂插件结构，按团队真实流程改一条

原文给出的统一结构：

```
plugin-name/
├── .claude-plugin/plugin.json   # Manifest
├── .mcp.json                    # Tool connections
├── commands/                    # Slash commands you invoke explicitly
└── skills/                      # Domain knowledge Claude draws on automatically
```

对应关系：
- `skills/` 放领域知识和工作流，Claude 在相关时自动取用。
- `commands/` 放你显式触发的动作（斜杠命令）。
- `connectors`（`.mcp.json`）通过 MCP server 接你职能依赖的外部工具。
- `plugin.json` 是清单。

原文给的四个定制方向：

1. **换 connector**：编辑 `.mcp.json`，指向你自己的工具栈。前提：知道自家工具栈的 MCP 接入方式或已有 MCP server。
2. **加公司上下文**：把你的术语、组织结构、流程写进 skill 文件，让 Claude 理解你的语境。
3. **调工作流**：改 skill 指令，让流程匹配你团队的实际做法，而不是教科书做法。
4. **建新插件**：用 `cowork-plugin-management` 插件，或直接照上面的目录结构为未覆盖的角色/流程新建。

**注意**：原文只给了总体步骤和目录结构，**没有**收录任何单个插件的具体 skill 内容、提示词全文或命令清单。要照做必须自己打开仓库对应目录去读。

**预期结果**：Claude 在相关交互中自动取用你改过的知识和流程；你用斜杠命令触发时，输出更贴近团队实际做法。这一步是价值所在——开箱插件只是通用起点。

### 第 5 步：加一层收口，让 AI 把没收口的事交出来（inbox）

职能层解决「知识复用」，观测层解决「有没有变好」，中间还夹着一个缺口：AI 在会话中途问你的问题、它顺手发现的 bug、失败的测试和构建、当前分支上等你处理的 PR review 评论——这些散在对话里，过一会儿就得你自己翻回去找。`petekp/inbox` 把这类内容收进一个和会话并排的面板。

**前提**：已安装并运行 Claude Code（作者在 2.1.292 上构建和测试）；想用 PRs 标签页还需要已安装并登录的 `gh`；测试/构建要作为独立命令运行，插件才能知道确切结果。

**安装**：在 Claude Code 会话内输入：

```text
/plugin install inbox --marketplace petekp/inbox
```

出现提示时回答 `y` 添加 marketplace，然后选择一个 scope。安装后在该会话即开始工作。

**先看 demo，再回自己的数据**：

```text
/inbox demo
```

再运行一次 `/inbox` 返回自己的数据。

**打开面板**：

```text
/inbox
```

面板三个标签页：

| 标签页 | 收什么 |
| --- | --- |
| Needs you | Claude 问你的问题、只有你能做的任务、失败的测试或构建 |
| Findings | Claude 在任务之外注意到的 bug、风险和想法 |
| PRs | 来自本会话和当前分支的 pull request、各自的阻塞项、等你处理的 review 评论 |

面板内快捷键：

```text
1 / 2 / 3   切换标签页
j / k       上下移动
动作字母     执行该动作
ctrl+x      在面板与会话之间切换
```

也可以鼠标点击。要回答某个问题，按答案旁的字母，答案会作为你的消息发给 Claude。当前标签页为空、而别处有新项到达时，面板会自动切过去。

**插件还会核对测试/构建状态**：Claude 把每个测试或构建作为独立命令运行，插件据此知道结果；如果 Claude 说某件事通过了，但上次运行失败、或改动后没再跑过，插件会要求 Claude 重跑，或声明该改动未经测试。

**空闲时自动摘要**：会话空闲 15 分钟，或恢复会话时，提示符上方那行会自动展开成一段简短的状态摘要。

**更新插件**（前提：已安装过）：

```text
claude plugin update inbox
```

然后在任何已打开的会话里运行 `/reload-plugins`。

**从克隆的源码开发/调试**：

```sh
claude --plugin-dir /path/to/inbox
```

改动文件后会话会自动重载该 mod。跑检查脚本：

```sh
./scripts/check.sh
```

该脚本依次运行 Prettier、`claude plugin validate`、类型检查和测试。类型检查依赖 Claude Code 第一次加载 mod 时写入 `.claude-plugin/types/` 的类型文件。

**成本预期**：原文给出的口径是——每次 Claude 回复后触发一次轻量（Sonnet）调用，3–4k 输入（其中约 2k 命中缓存）、100–250 输出，约 0.5¢/回复；空闲 5 分钟后约 1¢；插件自身的指令与工具约 1,350 token（缓存），每次请求不到 0.1¢。作者称一次较长的 Opus 会话中这部分约占总成本 1%，会话越短或越便宜占比越高；在 Claude 套餐下计入用量限额。

**预期结果**：`/inbox` 能打开面板，Needs you 里出现你本来会漏掉的待办或失败测试，Findings 里出现任务之外的问题记录。

**怎么选**：收口层是「别漏事」，观测层是「看数字」，交接层是「别掉线」。如果你在会话里经常被 AI 反问、经常要自己回头翻测试结果，先装这一层；如果你主要想知道改造后有没有变快变准，先装第 6 步的观测 mod；如果任务是长跑、要跨上下文窗口，先看第 7 步的交接层。

### 第 6 步：加一层观测 mod，把「有没有变好」变成数字（做法 A / 做法 B / 做法 C）

**前提**：Claude Code 2.1.287+（作者在 2.1.288 上测试过）；在一个非敏感、小体量的现有项目里做；在 CLI 或 Claude Desktop 的 Code tab 中使用（VS Code 聊天面板和 `claude -p` 不显示面板）。README 明确说明：这些是**可执行的 mod，不是提示词或 skill 清单**。

**做法 A：从 marketplace 装（长期用，推荐先装 1–2 个 Session 观测类）**

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install context-meter@awesome-claude-code-mods
claude plugin install tool-timing@awesome-claude-code-mods
```

会话已经开着的话，先重载插件再打开面板：

```text
/reload-plugins
/context-meter
```

把 `context-meter` 换成任意 mod 名（如 `error-inbox`）即可；可以独立安装多个，命令里用各自 mod 名。README 给的「不到一分钟起步」示例用的是 `task-board`：

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install task-board@awesome-claude-code-mods
```

```text
/reload-plugins
/task-board
```

**做法 B：不注册 marketplace，直接从源码试单个 mod（适合先评估再决定装不装）**

```sh
git clone https://github.com/whyashthakker/awesome-claude-code-mods.git
cd awesome-claude-code-mods
claude --plugin-dir ./mods/context-meter
```

然后运行 `/context-meter`。把 `context-meter` 换成目录里的任意 mod 名。

**做法 C：Claude Desktop 看图**

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install desktop-usage-strip@awesome-claude-code-mods
```

在 Claude Desktop 里打开本地 Code 会话，必要时 `/reload-plugins`，再 `/desktop-usage-strip`。若 marketplace 已注册，先更新：

```text
claude plugin marketplace update awesome-claude-code-mods
```

该 strip 显示配额/重置、上下文、观测到的 token 总量和上报的会话 USD，带隐藏/显示控件；缺失的数字会标注；**成本不等于订阅账单**。

**怎么选**：只想验证效果、不想污染环境 → 做法 B；已经决定要长期用 → 做法 A；用 Claude Desktop 想看图表 → 做法 C。只装 1–2 个观测类 mod，建议 `context-meter` 配 `tool-timing` 或 `error-inbox`。

**选型参考**：仓库 README 把 mod 分成 7 类——Session（8 个：Context Meter、Quota Watch、Cache Inspector、Tool Timing、Error Inbox、Edit Heatmap、Turn Timeline、Agent Board）、Git（8 个：分支/上游/脏文件、暂存 diff 审阅、最近 20 条提交、stash、worktree、冲突标记计数、blame 前 80 行、ignore 规则解释）、Repository（10 个：文件树、npm scripts、依赖表、TODO/FIXME/HACK 查找、Markdown 标题大纲、JSON 键摘要、CSV 预览、小日志尾 60 行、env 示例变量、两文件逐行对比）、Workspace（8 个：Scratchpad、Task Board、Decision Log、Snippet Shelf、Link Shelf、Prompt Shelf、Release Checklist、Handoff Notes）、Utilities（10 个：正则测试、JSON 格式化、URL 拆解、Base64、时间戳转换、哈希、颜色对比度、UUID、文本计数、ASCII 动画）、Workflow（6 个：25 分钟专注倒计时、秒表、测试/构建命令台账、最近 40 条 Bash 命令历史、越出指定路径前缀时告警的 Scope Watch、可开关的只读模式守卫）、Desktop（20 个：把观测项做成图表/面板，如 Desktop Usage Strip、Desktop Context Map、Desktop Cost Watch、Desktop Review Desk、Desktop Prompt Builder、Desktop Session Brief、Desktop Checklist Desk 等）。

**额外：社区 mod 要各自单独装（可选）**。从各作者的 marketplace 安装，例如 README 给出的示例：

```text
/plugin marketplace add jarrodwatts/claude-image-view
/plugin install image-view
```

注意：README 对社区 14 个条目只做了文档审查（2026-10-03 对照作者文档核查），作者没有安装、没有运行、没有做安全审计。部分社区 mod 需要特定终端（kitty 图形协议、Unicode placeholders 等）、macOS/Linux、`gh` 认证、浏览器二进制，甚至特定硬件。

**预期结果**：会话里能打开对应面板并看到数字。README 声明：截图是 Claude Code 测试套件用 fixture 数据捕获的 mod 渲染树，在浏览器预览里绘制，**不是 Claude Code 原生 app 截图**，所以面板长什么样以你本地实际为准。

### 第 7 步：长任务跨上下文时，加一层交接控制台（Project Sentinel，做法 A / 做法 B / 做法 C / 做法 D）

**前提**：Claude Code 2.1.289 或更新、且带 function-hooks 插件 API（见前置条件 4）；在一个非敏感的现有项目里试。

**做法 A：装到终端（决定长期用）**

```bash
claude plugin marketplace add Arjun0014/project-sentinel
```

```bash
claude plugin install project-sentinel@control-room
```

注意：marketplace 名仍是 `control-room`，里面的插件才是 `project-sentinel`。也可以在会话内一步完成（Claude Code 2.1.275 或更新）：

```text
/plugin install project-sentinel --marketplace Arjun0014/project-sentinel
```

**做法 B：从本地 clone 装（要改插件本身时）**

```bash
claude plugin marketplace add /path/to/project-sentinel
```

终端会直接从该文件夹读已安装的 folder marketplace，所以拉取改动后在会话里运行 `/reload-plugins` 即可。注意 Desktop 的 Code tab 可能加载安装时 Claude Code 复制的那一份，因此新版本后要 `claude plugin update project-sentinel@control-room`，再开新会话。

**做法 C：不安装地试一个会话（建议先做这一步）**

```bash
claude --plugin-dir /path/to/project-sentinel/plugins/project-sentinel
```

不安装任何东西，插件只对该会话生效，改动可热加载。这是本次调研结论建议的最小试用方式。

**做法 D：在 Claude Desktop（Code tab）加载工作副本**

把文件夹名写进 `~/.claude/settings.json` 的 `env` 块，Claude Code 会为 Desktop 启动的会话读取 `CLAUDE_CODE_PLUGIN_DIRS`：

```json
{
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/project-sentinel/plugins/project-sentinel" }
}
```

多个文件夹用平台的路径列表分隔符（Windows 用 `;`，其他平台用 `:`）。

**怎么选**：只想验证它到底有没有减少上下文溢出和人工盯守 → 做法 C；已经决定长期用 → 做法 A；要改插件本身 → 做法 B；在 Claude Desktop 里用 → 做法 D。

**从旧版 Control Room 迁移**（1.4.0 之前装成 `control-room@control-room`）：

```bash
claude plugin marketplace update control-room
```

marketplace 会把旧名映射到新名，更新会连带移动你的安装（含 `enabledPlugins` 项）；下次会话加载 Project Sentinel 时，它会一次性读取旧 store（多个时取最后写入的那个），把设置、运行、Quest log 和学到的提示缓存信息复制过去，旧文件保持原样。更新期间开着的会话继续用 Control Room，Project Sentinel 在旁边待命，两者不会同时动作。

**更新**：`claude plugin update project-sentinel@control-room`；或打开 `/plugin` 里的 **Marketplaces**，选中 `control-room`，选 **Enable auto-update**（对自行添加的 marketplace 默认关闭）。

**卸载**：

```bash
claude plugin uninstall project-sentinel@control-room
```

**预期结果**：命令执行成功后，该会话（或 Desktop 的本地 Code 会话）里能打开 `/cr` 面板。

### 第 8 步：打开 Control Room，先开 Autopilot

打开面板：

```text
/cr
```

六节：Overview / Context / Behavior / Guardrails / Activity / Setup。README 中出现的其它命令：

```text
/cr status
/cr cache
/cr decisions
/cr decide D-2
/cr diagnostics
```

终端里所有控件都能点击或用 Tab+Enter 操作，且没有会卡住的弹窗。

**开 Autopilot（默认 Off）**：在 Context 里设一个阈值（窗口的百分比，或 token 数；README 截图里出现过 70% 与 80% 的 handoff 刻度，那只是截图示例，不是推荐值）。到阈值时 Claude 先做完当前步骤，然后执行交接：记录 run 的里程碑、更新项目文档、CLAUDE.md 只留持久指令、跑一次最小验证、用自己的话写 `NEXT_SESSION_PROMPT.md`；Project Sentinel 接着运行 `/clear`，用 run 的里程碑和目标播种新上下文，Claude 自行继续。

三条要记住的边界：每一步都在下一轮开始或结束时推进，**绝不按定时器走**；交接轮结束时若它启动的后台工作（渲染、测试）还在跑，会等 Claude Code 报告的结果，把结果写进 notes，再清空并自行继续；靠近阈值启动的新上下文会先获得工作空间，之后才允许再次交接。压缩（compaction）是选项，或清空被拒时的兜底（Desktop 和其它 SDK 会话里以 `/compact` 执行）。交接中途重载插件会继续这次交接，不会起第二次。

**预期结果**：状态栏 HUD 能替你说清 run 现在在「工作 / 思考 / 跑检查 / 等你 / 等一个会自己来的结果 / 受阻 / 交接中 / 完成」中的哪个状态；交接后 Handoff Health 能告诉你交接留下了什么、新上下文接住了什么。

### 第 9 步：把等待、「以后再做」和需要拍板的事交出去

这一层补的是长跑任务里三种会打断你、或卡住 run 的事。

**Watchers：把 run 停到某个时间再唤醒**

```text
/cr watch in 2h S-002 result
```

也支持 `at 14:00`、`tomorrow at 9am`；含糊的 `at 2:30` 会被询问而不是猜。三种策略：*Keep warm* 用 Keep warm 保住对话缓存到唤醒点；*Fresh* 不花缓存钱，从交接 notes 在新上下文里唤醒；*Smart* 自己选并说明理由。若 run 在装了 watcher 之后已经移动过，watcher 不会清空它，而是提示 *Watcher due* 并给出 Check now / Reschedule / Dismiss。Fresh 唤醒需要健康的 resume 状态；Watchers 只在 Claude Code 运行时工作（不安装守护进程），关闭期间到点的 watcher 会在会话重开后等你。

**Mission Queue：投递「以后再做」的工作**

Activity → Operations 的 *Add work for later*（并指定何时投递），或：

```text
/cr queue <text>
```

每项只在边界投递：下一个安全边界（当前里程碑完成或本轮结束）、本轮之后、当前里程碑之后，或下一个新上下文。**绝不插进某一轮的推理中间**：轮中到点的项随下一批工具结果走，否则在本轮结束时作为独立提示。可编辑、重排、立刻投递、删除；跨 `/clear`、交接、重载和恢复会话与 run 一起保留，只投递一次。

**Decision Inbox：让需要你拍板的选择不阻塞工作**

插件给 Claude 一个 `decision_request` 工具（选择方案、是否删除生成文件、CI 过了是否发布）。它停在 Activity → Operations → *Needs review*，带选项和一个写自己话的输入框：

```text
/cr decisions
/cr decide D-2
```

`/cr decide` 用 Claude Code 自己的对话框提问。答复随 Claude 下一批工具结果送达；若 run 正等它，就作为独立提示；否则随你下一条消息。**Claude Code 自己的权限提示和确认永远不会被这里延后。**

**和 inbox 收口层怎么选**：两者都在收「本来要你自己翻回去捞的事」，但机制不同——inbox 是一个与会话并排的面板，每次 Claude 回复后触发一次轻量调用，并且会核对测试是不是真跑过、改动后有没有再跑；Decision Inbox 是插件给的 `decision_request` 工具，选项停在面板里、答复随工具结果回到 Claude，另外还带 Mission Queue 的边界投递和 Watchers 的定时唤醒。如果你最痛的是「Claude 谎报测试通过」，先上 inbox；如果最痛的是长跑任务里你被反复叫去拍板、或者要等到某个时间点才继续，先用交接层。**材料未说明两者同时装会不会互相干扰，先只用一个。**

**预期结果**：watcher 到点后 run 按你选的策略继续；Mission Queue 里的项在边界投递且只投一次；Needs review 里的选择你能在工作间隙答掉，run 不因此停住。

### 第 10 步：按需开关护栏、选 profile

以下默认值来自 README，都是按需项，建议一次只开一个并观察一段时间。

- **Run Budget（默认 Off）**：设成本、墙钟时间和交接次数上限，80% 时提示一次；到上限时可选只通知 / 自行开工前先问 / 让 Claude 做完当前里程碑再暂停。它**不会中断正在进行的工具调用或轮次**。命令示例：

```text
/cr budget $30
```

- **Machine load（默认 Off）**：给 CPU 和内存的建议上限（Low / Medium / High / Custom）。它不是 OS 配额，只能停 Claude 自己启动的后台任务。
- **Cache Guardian（默认 On）**：会在会重发 100k+ 热 token 的模型切换前先确认；热缓存（20k token 起）时模型路由不再降级对话；缓存热时设置变更以 notes 形式送达，而不是重写被缓存的系统提示。*Keep warm*（默认 Off）在你离开时于缓存过期前不久重发一次最后请求（transcript 看不到），上限由你设的闲置时长决定——这是明确的成本项，开之前先评估。
- **Cold Resume Guard（默认 On）**：向大上下文（默认 100k token）发送消息且缓存确定已失效时，Claude Code 自己的对话框先问：*Continue full session* / *Start fresh from resume state* / *Compact first* / *Cancel*。
- **权限策略**：按类别给 Default / Ask / Deny（包安装、网络、下载、项目内编辑、项目外编辑、删文件、commit、push、force push 与 reset、部署发布、危险命令）。Ask 即使在不会问的权限模式下也先问你；插件从不代你回答权限提示、从不放宽 deny、plan mode 或组织设置。
- **选 profile 而不是逐项配**：Normal、Frontier Max、Low Resource、Release / QA 和自定义；Setup 页显示相对所选 profile 究竟改了什么。Frontier Max 下模型路由不降级对话，模型 id 不硬编码。
- **Answer styles**：Standard / Brief / Plain technical（按 ASD-STE100 的简化技术英语规则）/ Mission control（GO、NO-GO、HOLD；GO 只给已验证的）/ Quest log。只影响对你说的话，不影响代码、文件或提交信息；你自己选的 Claude Code output style 优先级更高。

**预期结果**：Setup 页能说清你相对所选 profile 改了什么；护栏在你设定的边界上提醒你，而不是突然掐断正在跑的工作。

### 第 11 步：贡献回仓库（可选）

职能层原文说插件就是 markdown 文件，fork 后改，提 PR。交接层是 MIT、无构建步骤的 TypeScript，Claude Code 直接加载，所以按做法 B 在本地 clone 里改、用 `/reload-plugins` 热加载即可。

## 怎么判断变好了

先分清来源：职能插件原文**没有**给出任何验证方法或指标，只有 better and more consistent outcomes、spend less time enforcing processes 这类主张，属作者主张、无数据支撑；收口层原文只给了成本口径，同样没有效果数据；交接层原文只有机制描述，同样没有「减少了多少上下文溢出和人工盯守」的数据。下面第一组是职能插件层的自测指标，第二组是收口层的自测指标，第三组是观测 mod 能直接采集的数字，第四组是交接层要自己看的判据。

**可观察的指标（职能插件层，装插件前后各记一次）**：
- 同一任务的**完成时间**。
- **返工次数**：你需要手动修正、重写输出的次数是否下降。
- **补齐上下文的次数**：是否还需要你在对话里反复解释同样背景（原文的诉求正是「少重复自己」）。
- **命令是否真的可用**：`/xxx:yyy` 在会话中是否出现并成功执行——这是最硬的通过/不通过信号。

**可观察的指标（收口层，原文没有提供，需自测）**：
- 每个会话里被你**漏掉、事后才发现**的待办/问题数量是否下降。
- 你**手动追问 Claude**「刚才那个测试过了吗」的次数是否下降。
- 会话中途**切换窗口/翻记录**的次数是否下降。
- **成本侧**：对照 API 账单或用量限额，看每会话新增开销占比是否落在你可接受的范围内。作者给出的示例是长会话约占总成本 1%，会话越短或越便宜，占比越高。

**可采集的指标（观测 mod 层）**：

| 指标 | 取自 | 看什么 |
| --- | --- | --- |
| 工具失败/被拒调用次数 | Error Inbox / Tool Timing | 是否比试用前少，或能否提前发现 |
| 单次工具延迟 | Tool Timing | 是否有异常慢的工具拖住整轮 |
| 上下文占用与剩余 token | Context Meter | 是否频繁逼近上限、被迫重述 |
| 每轮时长/token/中断 | Turn Timeline | 中断次数是否下降 |
| cache 读/写/未缓存输入 | Cache Inspector | 是否反复重建上下文 |

**可观察的指标（交接层，原文没有提供，需自测；调研结论建议以 Handoff Health 与跨交接的里程碑连续性为判据）**：
- **Handoff Health**：交接留下了什么、新上下文接住了什么。
- **跨交接的里程碑连续性**：Autopilot 交接后，新上下文是否从 run 的里程碑和目标继续，而不是重来一遍。
- 上下文溢出、被迫压缩的次数，以及你手动 `/clear`、`/compact` 的次数是否下降。
- 你守着 run 的时间是否下降：状态栏 HUD 能不能替你说清它在干什么或等什么（工作 / 思考 / 跑检查 / 等你 / 等一个会自己来的结果 / 受阻 / 交接中 / 完成）。
- Activity 里「需要看的」东西（没人修好的失败并附上说明原因的那行输出、拒绝、慢调用）是否比试用前更早被你看到。
- Watchers 是否真的按时间唤醒 run 而不用你守着；Mission Queue 的项是否都在边界投递、只投递一次、没有插进某一轮推理中间。
- Decision Inbox：需要你拍板的选择是否不再阻塞 run（答复随下一批工具结果送达），同时你没有漏掉 Claude Code 自己的权限提示。

**最小试用方式（半天内可完成）**：
1. 选一个和你当前工作最贴近的职能插件，按第 2 步装上。
2. 只做两件事：跑一个对应斜杠命令（如 `/data:write-query`），以及观察一次技能是否在相关提问时自动触发。
3. 打开该插件的 `skills/` 目录读一遍，挑其中一条指令，改成你团队的真实流程（例如把「教科书式对账流程」换成你们实际用的审批链），再跑一次同样的任务。
4. 如果你常漏事：按第 5 步装上 inbox，先 `/inbox demo` 看面板行为，再在一个有测试/构建、且需要你中途做决定的任务里跑一次，看 Needs you / Findings 有没有抓到你本来会漏的东西。
5. 如果你的任务跑得比一个上下文窗口更久：按第 7 步做法 C，用 `claude --plugin-dir` 不安装地跑一个长任务会话，打开 `/cr`、设 Autopilot 阈值，看一次交接前后的 Handoff Health 与里程碑连续性。

**对照试用（建议一两周）**：先用一周不开观测 mod 正常干活，记下同类任务上的工具失败次数、平均延迟、上下文溢出/压缩次数；再开一周用面板（第 6 步做法 A 或 C），比较同一类任务上的同一批数字。收口层可以在同一周里对比：开着 inbox 的一周，漏掉的待办数和手动追问测试是否通过的次数是否比之前少。交接层在同一周里做同类长任务，比较交接前后的 Handoff Health、跨交接里程碑连续性，以及你手动守时/手动清理上下文的次数。

**判断**：若职能插件层指标没有可感知改善，说明开箱插件对你不合适，价值在定制，应把精力放到第 4 步而不是继续试更多插件。若观测数据里工具失败次数、平均延迟、中断次数、上下文重述次数在同类任务上下降，或单位任务的 token 更可预测，才算真的变好。收口层则看：如果几轮下来「漏掉的待办数」和「手动追问测试是否通过的次数」都没有改善，说明它带来的价值抵不过每轮一次的额外调用，直接卸载回到原生 Claude Code。交接层则看：如果几次交接后里程碑仍连续、Handoff Health 没有明显空洞，且你手动清理上下文和守时的次数下降，才算有价值；否则不装——尤其因为它建立在仍处 early access 的插件 API 上，不要先定为团队标准。主观上再看三点：是否更早发现 AI 走偏（Error Inbox 提前暴露失败调用；inbox 在 Claude 谎报测试通过时叫停；状态栏和 Activity 提前暴露受阻与慢调用），是否减少「又要重述一遍」，以及是否减少「守着它跑完」。

## 常见坑

- **职能插件原文只有 README**：不含任何单个插件的 skill 正文、提示词、命令清单，因此无法从这份材料判断实际质量，也无法照抄具体提示词。要照做必须自己打开仓库对应目录去读。
- **开箱效果有限**：原文自称 these plugins are generic starting points，价值取决于你是否投入定制（换 connector、补公司上下文、改工作流）。
- **没有官方效果数据**：职能插件原文只有「更好、更一致」「少花时间执行流程、多花时间改进流程」等主张，没有数据、案例、benchmark 或对比支撑；收口层原文只有成本表，没有遗漏率、误报漏报率或前后对比；交接层原文只有机制描述，没有「减少了多少上下文溢出和人工盯守」的量化数据。
- **命令不出现 = 未生效**：先回到第 2 步检查 marketplace，不要继续往下做。
- **可用性与许可未说明**：Cowork 的开放范围、价格、区域限制原文未说明；三个仓库的许可协议都要自行确认后再用于生产。
- **材料可能被截断**：各职能插件子目录的具体内容、sub-agents 的说明均未在材料中出现；交接层材料在 Lazy-exit guard（默认 Off，用于在 Claude 提前收工、把活推回给你时介入）的描述处被截断，未给出的行为不要照抄。
- **不要一次装多个职能插件**：先挑一个跑通、改一条，再考虑扩展。
- **观测面板有硬边界**：必须在 CLI 或 Claude Desktop 的 Code tab 里用；VS Code 聊天面板和 `claude -p` 会执行 hooks 但不显示面板。版本要在 2.1.287+，作者只在 2.1.288 上测试过。
- **装 mod = 在会话里跑第三方代码**：mods 仓库的社区部分作者自己声明未安装、未运行、未做安全审计；要装只从各作者自己的 marketplace 装，别把整个社区列表照单全收。inbox 同样是单作者仓库，只有 33 stars，无第三方评测、无用户案例；Project Sentinel 也是单作者插件，建立在仍处 early access 的 function-hooks 插件 API 上。
- **收口层每轮都要花钱**：每次 Claude 回复后触发一次轻量调用，短会话的额外开销占比会明显更高。如果几轮下来没减少遗漏，直接卸载回原生 Claude Code。
- **三层版本口径错开**：观测层 2.1.287+、收口层在 2.1.292 上构建、交接层 ≥2.1.289 且要带 function-hooks API。同时用多层前先 `claude --version` 核对；升级 Claude Code 后先跑 `/reload-plugins` 确认各面板还在。
- **交接层的验证范围很窄**：只在 Windows 11 和 Claude Code 2.1.289 / 2.1.293 / 2.1.295 上验证过，远程（云）会话尚未测试。它建立在 early access 的插件 API 上，不宜直接定为团队标准——先用 `claude --plugin-dir` 在单个长任务会话里试。
- **重命名迁移有副作用**：从 1.4.0 之前的 Control Room 升上来，`Allow` 权限状态被移除（已保存的 Allow 读作 Default），点 Kit 不再打开面板（改用状态栏按钮）。别以为是插件坏了。
- **Autopilot 不是定时器**：每一步都在下一轮开始或结束时推进；交接轮结束时若它启动的后台工作还在跑，会等 Claude Code 报告的结果再清空并继续。不要拿它当「到点必清」。
- **Watchers 只在 Claude Code 运行时工作**：不安装守护进程，关闭期间到点的 watcher 会在会话重开后等你——「停到某个时间再唤醒」不等于机器替你跑。
- **Keep warm 是成本项**：它会在你离开时于缓存过期前不久重发一次最后请求（transcript 看不到），上限由你设的闲置时长决定；不在意成本不要随手开。
- **Run Budget 和 Machine load 都不能掐断进行中的工作**：它们不会中断正在进行的工具调用或轮次；Machine load 也不是 OS 配额，只能停 Claude 自己启动的后台任务。
- **Decision Inbox 只管插件自己的决定请求**：Claude Code 自己的权限提示和确认永远不会被延后，插件也不代你回答权限提示、不放宽 deny、plan mode 或组织设置。
- **两个收口机制可能重叠**：inbox 的 Needs you 与交接层的 Decision Inbox 都在收「需要你的事」，material 未说明两者同时装会不会互相干扰，先只用一个。
- **数字口径要看清**：观测 mod 的截图不是原生 app 截图，而是测试套件用 fixture 数据捕获的渲染树；缺失值会被标注而非补全；Desktop Usage Strip 的 USD 不是订阅账单；部分 mod 的 forecast 和 token 计算是估算。Autopilot 阈值截图里的 70% / 80% 只是截图示例，不是推荐值。
- **别把观测当目标**：观测面板不改变 Claude Code 的基本用法，它只是在既有的插件层之上叠加一层「给你对比用的底座」。

## 证据与来源

**职能插件层（来自调研《anthropics/knowledge-work-plugins》所引原文 README）**
- 安装命令、统一目录结构、Making Them Yours 的四个定制方向：来自原文。原文给出两条 Claude Code 安装命令（`claude plugin marketplace add anthropics/knowledge-work-plugins`、`claude plugin install sales@knowledge-work-plugins`）。
- 11 个插件及用途：来自原文表格，逐一列名。
- 插件自动激活、Skills fire when relevant：原文主张，**仅为作者主张**，无数据支撑。
- Star 数据：原文 metrics 显示仓库 star 27360、今日 +309。可核信息，但只反映关注度，不反映实际工作效果。
- 效果主张（「更好、更一致」「少花时间执行流程」等）：原文作者主张，无数据、案例、benchmark 或对比支撑；调研报告明确指出本条无依据。
- 适用条件与局限（README 不含单个插件具体内容；Cowork 开放范围/价格/区域限制未说明；仓库许可未说明；原文自称通用起点；材料可能被截断）：来自调研报告对原文的解读。
- 与已有做法的关系：调研报告指出，本仓库与清单中的 Claude Code（kind: tool，status: adopt）是叠加关系，原文明确 also compatible with Claude Code。

**收口层（来自调研《petekp/inbox》所引原文 README）**
- 安装与更新命令（`/plugin install inbox --marketplace petekp/inbox`、`claude plugin update inbox`、`/reload-plugins`）、源码调试方式（`claude --plugin-dir /path/to/inbox`）、检查脚本（`./scripts/check.sh`）：来自原文，可直接照做。
- 三个标签页（Needs you / Findings / PRs）、面板快捷键、当前标签页为空时自动切换、空闲 15 分钟或恢复会话时的状态摘要：来自原文。
- 测试/构建核对行为（Claude 谎报通过时要求重跑或标注未测试）：来自原文描述，**实际可靠性没有数据支撑**。
- 成本表（每次回复后 Sonnet 调用 3–4k 输入，其中约 2k 命中缓存，100–250 输出，约 0.5¢/回复；空闲 5 分钟后约 1¢；插件指令与工具约 1,350 token 缓存、每次请求不到 0.1¢；作者称长 Opus 会话中约占总成本 1%，套餐下计入用量限额）：来自原文自述数字，未经第三方验证。
- 版本依赖（作者在 Claude Code 2.1.292 上构建和测试）、33 stars、单作者仓库：来自原文与调研报告。
- intelligently manages 属作者主张，原文没有说明分类准确率、误报漏报情况。

**观测 mod 层（来自调研《whyashthakker/awesome-claude-code-mods》所引原文 README）**
- 可执行命令（`claude plugin marketplace add whyashthakker/awesome-claude-code-mods`、`claude plugin install task-board@awesome-claude-code-mods`、`/reload-plugins`、`/task-board`、`claude --plugin-dir ./mods/context-meter`、`claude plugin marketplace update awesome-claude-code-mods`、社区示例 `/plugin marketplace add jarrodwatts/claude-image-view` 与 `/plugin install image-view`）：来自原文 README。
- 7 个分类与各类 mod 名单：来自原文 README 的目录结构。
- 版本前提 2.1.287+、作者在 2.1.288 测试、mod 默认启用、VS Code 聊天面板与 `claude -p` 不显示面板、无运行时依赖无构建步骤、Git 类与包类 mod 的依赖：来自原文 README 明示的前提。
- 可采集的量化指标（上下文占用与剩余 token、按请求的 cache 读/写/未缓存输入、工具延迟/调用数/失败、最近 30 次失败或被拒的工具调用、按路径的成功 Edit/Write、每轮时长/token/中断）：来自原文 README 的 Session 类 mod 说明。
- 仓库 33 stars、声称 70 个 MIT 打包插件（50 通用 + 20 Claude Desktop）、社区 14 条于 2026-10-03 对照作者文档核查、截图是测试套件用 fixture 数据捕获的渲染树而非原生 app 截图、社区条目未经安装运行与安全审计：来自原文 README 的可核声明与明确限制。
- 「70 个都能用」「1 分钟上手」「原生测试」的具体结果与可靠性、各 mod 的准确性（如 forecast 与 token 计算为估算、Desktop Usage Strip 的 USD 不是订阅账单、缺失值只标注不补全）：属作者主张或作者自认的局限，未经第三方验证。

**交接层（来自调研《Arjun0014/project-sentinel》所引原文 README 与调研结论）**
- 安装、会话内安装、本地 clone 安装、不安装试跑、Desktop 的 `CLAUDE_CODE_PLUGIN_DIRS` 配置、迁移、更新、卸载命令（`claude plugin marketplace add Arjun0014/project-sentinel`、`claude plugin install project-sentinel@control-room`、`/plugin install project-sentinel --marketplace Arjun0014/project-sentinel`、`claude plugin marketplace add /path/to/project-sentinel`、`claude --plugin-dir /path/to/project-sentinel/plugins/project-sentinel`、`claude plugin marketplace update control-room`、`claude plugin update project-sentinel@control-room`、`claude plugin uninstall project-sentinel@control-room`）与 `/cr` 系列命令：来自原文 README，可直接照做。
- 六节面板、状态栏 HUD 的状态字样、Activity 的排序规则、Handoff Health、Quest log 的可计数 XP 规则、`milestones` 工具、`decision_request` 工具、按类别的权限策略（Default / Ask / Deny）、Autopilot 的交接步骤、Watchers 的三种策略、Mission Queue 的边界投递规则、Run Budget / Machine load / Cache Guardian / Keep warm / Cold Resume Guard 的默认值与行为、profiles 与 Answer styles：来自原文 README。
- 版本 1.6.3、MIT、无运行时依赖无构建步骤、Claude Code 2.1.289 或更新且需 function-hooks 插件 API、只在 Windows 11 与 2.1.289 / 2.1.293 / 2.1.295 上验证过、远程会话未测试、1.4.0 更名与两处行为变化（Allow 读作 Default、点 Kit 不再打开面板）：来自原文 README 与调研结论。
- 「减少了多少上下文溢出和人工盯守」：**原文没有给出量化数据**，只有机制描述；调研结论因此建议先用 `claude --plugin-dir` 在单个长任务会话里试跑，用 Handoff Health 与跨交接的里程碑连续性作判据，不建议直接定为团队标准。
- Autopilot 阈值截图里的 70% / 80%：截图示例，不是推荐值。
- 材料在 Lazy-exit guard 处被截断，相关行为不完整，本手册只保留可见部分。

**属于本次调研作者建议、非原文数据**
- 职能插件层的自测指标（完成时间、返工次数、补齐上下文次数、命令可用性）：原文没有官方指标，这些是调研报告在「怎么试、怎么验证」中建议的自测方式。
- 收口层的自测指标（漏掉的待办数、手动追问测试是否通过的次数、切换窗口次数）与最小试用步骤：原文没有效果验证，这是调研报告建议的自测方式。
- 观测 mod 的最小试用路径（只装 1–2 个观测类 mod、先一周基线再一周开面板做同类任务对比、比较失败次数/平均延迟/上下文重述次数）：调研报告给出的试用与验证建议。
- 交接层的试用路径（不安装试跑、只在单个长任务会话里试、用 Handoff Health 与跨交接的里程碑连续性判断是否真的减少了上下文溢出和人工盯守）：来自调研结论，不是原文数据。

## 依据的调研

- [anthropics/knowledge-work-plugins](../research/radar/2026-10-09/2061-anthropics-knowledge-work-plugins.md)：值得一试，先挑一个与本职最接近的插件（如数据岗用 data、销售岗用 sales），按原文两条命令装好、跑通一个斜杠命令，再打开它的 skills/ 文件按团队真实流程改一条；因为原文给出了可直接复制的安装命令和明确的插件目录结构，属于可照做的最小动作，但 README 只有“更好更一致”的主张、没有任何效果数据，不足以直接 adopt。
- [whyashthakker/awesome-claude-code-mods](../research/radar/2026-10-09/2191-whyashthakker-awesome-claude-code-mods.md)：值得一试，可以小范围试：先注册 marketplace，再挑 1–2 个 Session 观测类 mod（Context Meter、Tool Timing、Error Inbox）在现有项目里跑一两周，用它们的计数指标做开启前后对比；理由是 README 给出了可直接复制的安装命令与明确版本前提，且观测类 mod 恰好产出「效果验证」需要的量化数据，但这是第三方未审计的插件集合、截图也非原生捕获，不适合整体照单全收。
- [petekp/inbox](../research/radar/2026-10-11/2454-petekp-inbox.md)：值得一试，可以小范围装上试：在 Claude Code 里用 `/plugin install inbox --marketplace petekp/inbox` 安装后跑 `/inbox demo` 观察它能否捕获你本来会漏的待办与失败测试，理由是原文给出了可直接照做的安装、更新、面板操作与成本数据，但除作者自述外没有任何效果验证，且每轮回复都会产生额外 Sonnet 调用成本。
- [Arjun0014/project-sentinel](../research/radar/2026-10-11/2568-arjun0014-project-sentinel.md)：值得一试，先用 `claude --plugin-dir` 不安装地在单个长任务会话里试跑，打开 Autopilot、状态栏和 Activity，用 Handoff Health 与跨交接的里程碑连续性判断是否真的减少了上下文溢出和人工盯守。理由是 README 给出了可直接复制的安装、Desktop 配置和斜杠命令，但它建立在仍处 early access 的 function-hooks 插件 API 上、只在 Windows 11 和 Claude Code 2.1.289/2.1.293/2.1.295 上验证过，不宜直接定为团队标准。
