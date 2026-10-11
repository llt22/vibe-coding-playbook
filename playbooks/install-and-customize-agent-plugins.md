# 给一个职能装 AI 工作流：知识可复用、待办不漏掉、效果可对比

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：怎么选装一个职能插件、按团队真实流程改一条，再叠上待办收口面板与观测 mod，让 AI 少重复解释、不漏掉中途抛出的问题和失败测试，并且让“有没有变好”有数字支撑。
> 先试这一步：选一个和你当前工作最接近的职能插件装上，跑通一个斜杠命令（例如 `/data:write-query`），确认它真的出现在会话里——命令不出现就是没生效。
> 最近修订：2026-10-11

## 解决什么问题

你已经在用 Claude Code 或 Cowork，但每次让 AI 做某个职能的活（写 SQL、准备客户通话、审合同、对账等），都要重新解释领域知识、反复交代公司上下文、手动把外部工具的数据贴进去，而且 AI 给出的流程往往是教科书做法，不是你团队实际的做法。另外两个常见缺口：AI 在会话中途问你的问题、顺手发现的 bug、失败的测试，过一会儿就淹没在对话里，要你自己翻回去捞；以及装完一堆插件后，你说不清“到底有没有变好”。

本手册用三层叠加来补：

- **职能层**：Anthropic 开源了 11 个知识工作插件（`anthropics/knowledge-work-plugins`），把某个职能需要的 **skills**（Claude 在相关时自动调用的领域知识、最佳实践、分步工作流）、**commands**（你显式触发的斜杠命令）、**connectors**（通过 MCP server 连接的外部工具）和 sub-agents 预先打包。
- **收口层**：`petekp/inbox` 把会话里散落的问题、任务、议题和机会收进一个与会话并排的面板，并在 Claude 声称测试通过、但上次运行失败或改动后没再跑过时叫停。
- **观测层**：Claude Code mod（`whyashthakker/awesome-claude-code-mods`）里的 Session 观测类 mod，能把上下文占用、工具失败次数、工具延迟、每轮时长变成会话里可对比的数字。

要解决的问题因此是三件事叠加：如何选一个职能插件、装好、跑通、按团队真实流程改一条；如何让 AI 把没收口的事交出来；以及如何用数字判断这次改造到底有没有效果。

## 适用与不适用

**适用**：
- 团队已用 Claude Code（有 `claude` CLI）或可用 claude.com/plugins 的 Cowork。
- 所需外部工具能通过 MCP 接入（或你已有 MCP server）。
- 有人愿意花时间读插件的 `skills/` 文件，并按本团队流程改写。
- 你希望把某个职能的领域知识、工具连接和固定动作预先打包，让团队复用。
- 你想让“有没有变好”有数字支撑，愿意多花一步装观测类 mod。用观测层的额外前提：Claude Code 2.1.287+（README 作者在 2.1.288 上测试过），且要在 CLI 或 Claude Desktop 的 Code tab 里用。
- 你希望 AI 在会话里抛出的问题、发现的 bug、失败的测试不会漏掉，并愿意接受每轮回复之后一次额外的小模型调用。用收口层的额外前提：Claude Code 2.1.292（作者构建并测试的版本）；PRs 标签页还需要已安装并登录的 `gh`。
- 你愿意先在一两个非敏感、小体量的现有项目上试，而不是全公司铺开。

**不适用**：
- 不具备上述条件时，只能停在“看看”。
- 期望开箱即用、不做任何定制就大幅改善。原文自称 “these plugins are generic starting points”，价值取决于你是否投入定制。
- 需要先看到官方效果数据、案例或 benchmark 才决定采用。职能插件原文只有“更好更一致”的主张；收口层原文只给了成本数据，没有“减少了多少遗漏”的效果数据。
- 无法确认 Cowork 的开放范围、价格、区域限制，或无法确认相关仓库许可协议，且要用于生产。
- 无头或非面板场景：VS Code 聊天面板和 `claude -p` 会执行 hooks，但**不显示 mod 面板**，观测层在这里用不了。
- 敏感项目上装第三方 mod：装 mod 等于让第三方代码在你的会话里跑；mods 仓库的社区部分作者明确声明没有安装、没有运行、没有做安全审计。收口层同样是单作者仓库、无第三方评测，按未审计的第三方代码对待。
- 会话很短、且你本来就很少漏事：收口层每轮一次的额外调用按比例摊得更重，收益可能抵不过成本。

## 前置条件

1. 能使用 Claude Code（有 `claude` CLI）或访问 claude.com/plugins 的 Cowork。原文未说明 Cowork 的开放范围、价格或区域限制。
2. 观测层要求 Claude Code 2.1.287+。README 说明 mod 默认启用，不需要早期的 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` 之类环境变量开关。
3. 收口层（inbox）用 Claude Code 2.1.292 构建和测试；PRs 标签页需要已安装并登录的 GitHub CLI `gh`；测试/构建要由 Claude 作为独立命令运行，插件才能拿到确切结果。
4. 自行确认仓库许可协议后再用于生产。knowledge-work-plugins 原文未说明许可协议；awesome-claude-code-mods 自称 70 个 MIT 打包插件，但社区条目属未审计的第三方项目。
5. 若要换 connector，需要知道自家工具栈的 MCP 接入方式，或已有 MCP server。
6. 能读懂 markdown 和 JSON 文件，愿意按团队真实流程改 skill 指令。
7. 准备一个非敏感、小体量的现有项目做试用。
8. 观测 mod 无需运行时依赖、无需构建步骤。若要装 Git 类 mod，Git 要在 PATH 上；包类查看器要求项目里有 `package.json`，或你手动指定路径。
9. 建议先记录 2–3 次基线（同一任务的完成时间、返工次数、补齐上下文的次数），再装插件对照。

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

把 `sales` 换成你第 1 步选的插件名。**预期结果**：原文称安装后插件自动激活——“Skills fire when relevant, and slash commands are available in your session”。

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

职能层解决“知识复用”，观测层解决“有没有变好”，中间还夹着一个缺口：AI 在会话中途问你的问题、它顺手发现的 bug、失败的测试和构建、当前分支上等你处理的 PR review 评论——这些散在对话里，过一会儿就得你自己翻回去找。`petekp/inbox` 把这类内容收进一个和会话并排的面板。

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

**怎么选**：收口层是“别漏事”，观测层是“看数字”。如果你在会话里经常被 AI 反问、经常要自己回头翻测试结果，先装这一层；如果你主要想知道改造后有没有变快变准，先装第 6 步的观测 mod。

### 第 6 步：加一层观测 mod，把“有没有变好”变成数字（做法 A / 做法 B / 做法 C）

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

把 `context-meter` 换成任意 mod 名（如 `error-inbox`）即可；可以独立安装多个，命令里用各自 mod 名。README 给的“不到一分钟起步”示例用的是 `task-board`：

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

### 第 7 步：贡献回仓库（可选）

原文说插件就是 markdown 文件，fork 后改，提 PR。

## 怎么判断变好了

先分清来源：职能插件原文**没有**给出任何验证方法或指标，只有 “better and more consistent outcomes”“spend less time enforcing processes” 这类主张，属作者主张、无数据支撑；收口层原文只给了成本口径，同样没有效果数据。下面第一组是职能插件层的自测指标，第二组是收口层的自测指标，第三组是观测 mod 能直接采集的数字。

**可观察的指标（职能插件层，装插件前后各记一次）**：
- 同一任务的**完成时间**。
- **返工次数**：你需要手动修正、重写输出的次数是否下降。
- **补齐上下文的次数**：是否还需要你在对话里反复解释同样背景（原文的诉求正是“少重复自己”）。
- **命令是否真的可用**：`/xxx:yyy` 在会话中是否出现并成功执行——这是最硬的通过/不通过信号。

**可观察的指标（收口层，原文没有提供，需自测）**：
- 每个会话里被你**漏掉、事后才发现**的待办/问题数量是否下降。
- 你**手动追问 Claude**“刚才那个测试过了吗”的次数是否下降。
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

**最小试用方式（半天内可完成）**：
1. 选一个和你当前工作最贴近的职能插件，按第 2 步装上。
2. 只做两件事：跑一个对应斜杠命令（如 `/data:write-query`），以及观察一次技能是否在相关提问时自动触发。
3. 打开该插件的 `skills/` 目录读一遍，挑其中一条指令，改成你团队的真实流程（例如把“教科书式对账流程”换成你们实际用的审批链），再跑一次同样的任务。
4. 如果你常漏事：按第 5 步装上 inbox，先 `/inbox demo` 看面板行为，再在一个有测试/构建、且需要你中途做决定的任务里跑一次，看 Needs you / Findings 有没有抓到你本来会漏的东西。

**对照试用（建议一两周）**：先用一周不开观测 mod 正常干活，记下同类任务上的工具失败次数、平均延迟、上下文溢出/压缩次数；再开一周用面板（第 6 步做法 A 或 C），比较同一类任务上的同一批数字。收口层可以在同一周里对比：开着 inbox 的一周，漏掉的待办数和手动追问测试是否通过的次数是否比之前少。

**判断**：若职能插件层指标没有可感知改善，说明开箱插件对你不合适，价值在定制，应把精力放到第 4 步而不是继续试更多插件。若观测数据里工具失败次数、平均延迟、中断次数、上下文重述次数在同类任务上下降，或单位任务的 token 更可预测，才算真的变好。收口层则看：如果几轮下来“漏掉的待办数”和“手动追问测试是否通过的次数”都没有改善，说明它带来的价值抵不过每轮一次的额外调用，直接卸载回到原生 Claude Code。主观上再看两点：是否更早发现 AI 走偏（Error Inbox 提前暴露失败调用；inbox 在 Claude 谎报测试通过时叫停），是否减少“又要重述一遍”。

## 常见坑

- **职能插件原文只有 README**：不含任何单个插件的 skill 正文、提示词、命令清单，因此无法从这份材料判断实际质量，也无法照抄具体提示词。要照做必须自己打开仓库对应目录去读。
- **开箱效果有限**：原文自称 “these plugins are generic starting points”，价值取决于你是否投入定制（换 connector、补公司上下文、改工作流）。
- **没有官方效果数据**：职能插件原文只有“更好、更一致”“少花时间执行流程、多花时间改进流程”等主张，没有数据、案例、benchmark 或对比支撑；收口层原文只有成本表，没有遗漏率、误报漏报率或前后对比。
- **命令不出现 = 未生效**：先回到第 2 步检查 marketplace，不要继续往下做。
- **可用性与许可未说明**：Cowork 的开放范围、价格、区域限制原文未说明；两个仓库的许可协议都要自行确认后再用于生产。
- **材料可能被截断**：各插件子目录的具体内容、sub-agents 的说明均未在材料中出现；相关判断仅基于所给 README 文本。
- **不要一次装多个职能插件**：先挑一个跑通、改一条，再考虑扩展。
- **观测面板有硬边界**：必须在 CLI 或 Claude Desktop 的 Code tab 里用；VS Code 聊天面板和 `claude -p` 会执行 hooks 但不显示面板。版本要在 2.1.287+，作者只在 2.1.288 上测试过。
- **装 mod = 在会话里跑第三方代码**：mods 仓库的社区部分作者自己声明未安装、未运行、未做安全审计；要装只从各作者自己的 marketplace 装，别把整个社区列表照单全收。inbox 同样是单作者仓库，只有 33 stars，无第三方评测、无用户案例。
- **收口层每轮都要花钱**：每次 Claude 回复后触发一次轻量调用，短会话的额外开销占比会明显更高。如果几轮下来没减少遗漏，直接卸载回原生 Claude Code。
- **收口层与具体版本耦合**：inbox 用 Claude Code 2.1.292 构建和测试，存在维护和兼容风险；升级 Claude Code 后先跑 `/reload-plugins` 确认面板还在。
- **测试/构建必须是独立命令**：Claude 把每个测试或构建作为独立命令运行时，插件才知道确切结果。如果结果被合并进一条复合命令，插件无法据此判断“上次到底过没过”。
- **PRs 标签页需要 `gh` 登录**：没装或没登录 GitHub CLI 时，这一页不会有内容，不要以为是插件坏了。
- **数字口径要看清**：截图不是原生 app 截图，而是测试套件用 fixture 数据捕获的渲染树；缺失值会被标注而非补全；Desktop Usage Strip 的 USD 不是订阅账单；部分 mod 的 forecast 和 token 计算是估算。
- **别把观测当目标**：观测面板不改变 Claude Code 的基本用法，它只是在既有的插件层之上叠加一层“给你对比用的底座”。

## 证据与来源

**职能插件层（来自调研《anthropics/knowledge-work-plugins》所引原文 README）**
- 安装命令、统一目录结构、“Making Them Yours”的四个定制方向：来自原文。原文给出两条 Claude Code 安装命令（`claude plugin marketplace add anthropics/knowledge-work-plugins`、`claude plugin install sales@knowledge-work-plugins`）。
- 11 个插件及用途：来自原文表格，逐一列名。
- 插件自动激活、“Skills fire when relevant”：原文主张，**仅为作者主张**，无数据支撑。
- Star 数据：原文 metrics 显示仓库 star 27360、今日 +309。可核信息，但只反映关注度，不反映实际工作效果。
- 效果主张（“更好、更一致”“少花时间执行流程”等）：原文作者主张，无数据、案例、benchmark 或对比支撑；调研报告明确指出本条无依据。
- 适用条件与局限（README 不含单个插件具体内容；Cowork 开放范围/价格/区域限制未说明；仓库许可未说明；原文自称通用起点；材料可能被截断）：来自调研报告对原文的解读。
- 与已有做法的关系：调研报告指出，本仓库与清单中的 Claude Code（kind: tool，status: adopt）是叠加关系，原文明确“also compatible with Claude Code”。

**收口层（来自调研《petekp/inbox》所引原文 README）**
- 安装与更新命令（`/plugin install inbox --marketplace petekp/inbox`、`claude plugin update inbox`、`/reload-plugins`）、源码调试方式（`claude --plugin-dir /path/to/inbox`）、检查脚本（`./scripts/check.sh`）：来自原文，可直接照做。
- 三个标签页（Needs you / Findings / PRs）、面板快捷键、当前标签页为空时自动切换、空闲 15 分钟或恢复会话时的状态摘要：来自原文。
- 测试/构建核对行为（Claude 谎报通过时要求重跑或标注未测试）：来自原文描述，**实际可靠性没有数据支撑**。
- 成本表（每次回复后 Sonnet 调用 3–4k 输入，其中约 2k 命中缓存，100–250 输出，约 0.5¢/回复；空闲 5 分钟后约 1¢；插件指令与工具约 1,350 token 缓存、每次请求不到 0.1¢；作者称长 Opus 会话中约占总成本 1%，套餐下计入用量限额）：来自原文自述数字，未经第三方验证。
- 版本依赖（作者在 Claude Code 2.1.292 上构建和测试）、33 stars、单作者仓库：来自原文与调研报告。
- “intelligently manages”属作者主张，原文没有说明分类准确率、误报漏报情况。

**观测 mod 层（来自调研《whyashthakker/awesome-claude-code-mods》所引原文 README）**
- 可执行命令（`claude plugin marketplace add whyashthakker/awesome-claude-code-mods`、`claude plugin install task-board@awesome-claude-code-mods`、`/reload-plugins`、`/task-board`、`claude --plugin-dir ./mods/context-meter`、`claude plugin marketplace update awesome-claude-code-mods`、社区示例 `/plugin marketplace add jarrodwatts/claude-image-view` 与 `/plugin install image-view`）：来自原文 README。
- 7 个分类与各类 mod 名单：来自原文 README 的目录结构。
- 版本前提 2.1.287+、作者在 2.1.288 测试、mod 默认启用、VS Code 聊天面板与 `claude -p` 不显示面板、无运行时依赖无构建步骤、Git 类与包类 mod 的依赖：来自原文 README 明示的前提。
- 可采集的量化指标（上下文占用与剩余 token、按请求的 cache 读/写/未缓存输入、工具延迟/调用数/失败、最近 30 次失败或被拒的工具调用、按路径的成功 Edit/Write、每轮时长/token/中断）：来自原文 README 的 Session 类 mod 说明。
- 仓库 33 stars、声称 70 个 MIT 打包插件（50 通用 + 20 Claude Desktop）、社区 14 条于 2026-10-03 对照作者文档核查、截图是测试套件用 fixture 数据捕获的渲染树而非原生 app 截图、社区条目未经安装运行与安全审计：来自原文 README 的可核声明与明确限制。
- “70 个都能用”“1 分钟上手”“原生测试”的具体结果与可靠性、各 mod 的准确性（如 forecast 与 token 计算为估算、Desktop Usage Strip 的 USD 不是订阅账单、缺失值只标注不补全）：属作者主张或作者自认的局限，未经第三方验证。

**属于本次调研作者建议、非原文数据**
- 职能插件层的自测指标（完成时间、返工次数、补齐上下文次数、命令可用性）：原文没有官方指标，这些是调研报告在“怎么试、怎么验证”中建议的自测方式。
- 收口层的自测指标（漏掉的待办数、手动追问测试是否通过的次数、切换窗口次数）与最小试用步骤：原文没有效果验证，这是调研报告建议的自测方式。
- 观测 mod 的最小试用路径（只装 1–2 个观测类 mod、先一周基线再一周开面板做同类任务对比、比较失败次数/平均延迟/上下文重述次数）：调研报告给出的试用与验证建议。

## 依据的调研

- [anthropics/knowledge-work-plugins](../research/radar/2026-10-09/2061-anthropics-knowledge-work-plugins.md)：值得一试，先挑一个与本职最接近的插件（如数据岗用 data、销售岗用 sales），按原文两条命令装好、跑通一个斜杠命令，再打开它的 skills/ 文件按团队真实流程改一条；因为原文给出了可直接复制的安装命令和明确的插件目录结构，属于可照做的最小动作，但 README 只有“更好更一致”的主张、没有任何效果数据，不足以直接 adopt。
- [whyashthakker/awesome-claude-code-mods](../research/radar/2026-10-09/2191-whyashthakker-awesome-claude-code-mods.md)：值得一试，可以小范围试：先注册 marketplace，再挑 1–2 个 Session 观测类 mod（Context Meter、Tool Timing、Error Inbox）在现有项目里跑一两周，用它们的计数指标做开启前后对比；理由是 README 给出了可直接复制的安装命令与明确版本前提，且观测类 mod 恰好产出「效果验证」需要的量化数据，但这是第三方未审计的插件集合、截图也非原生捕获，不适合整体照单全收。
- [petekp/inbox](../research/radar/2026-10-11/2454-petekp-inbox.md)：值得一试，可以小范围装上试：在 Claude Code 里用 `/plugin install inbox --marketplace petekp/inbox` 安装后跑 `/inbox demo` 观察它能否捕获你本来会漏的待办与失败测试，理由是原文给出了可直接照做的安装、更新、面板操作与成本数据，但除作者自述外没有任何效果验证，且每轮回复都会产生额外 Sonnet 调用成本。
