# 让编码 agent 少烧上下文，并在你离开时自动写下交接文档

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：编码 agent 在长会话里因工具输出、重复指令、上下文压缩和空闲后冷缓存重读而浪费 token 并丢失状态；本手册给出把工具输出挡在上下文外、持久记忆、磁盘计划和自动交接等可验证做法。
> 先试这一步：先用 /context 看清 token 去向，再挑一个最痛的点只加一个做法小范围试；如果痛点是长会话离开后重读太贵，先试做法 Q 的空闲自动交接。
> 最近修订：2026-10-05

## 解决什么问题

编码 agent 在真实任务里会调用大量工具：读文件、grep、跑 shell、抓网页、扫日志、翻工单。这些工具返回的原始数据直接进上下文窗口，很快就把上下文塞满；会话压缩时，之前的状态又可能丢失，agent 像失忆一样。还有一类更隐蔽的浪费：为了回答「哪些文件处理 auth」这种只需要一个小判断的问题，把 187 个文件全读进上下文。

还有一类浪费发生在机器层面：同一台机器上装了 Claude Code、Codex 等多个编码 agent，每个工具各维护一份自己的指令文件，同一条规则要写好几遍，而且两边行为还可能不一致。

还有一类浪费发生在上下文配置本身：写进 CLAUDE.md 或 skills 的旧提示习惯（“逐步思考”“仔细检查你的工作”）可能在较新的模型上变成不必要的拖累。一条推文称 Anthropic 的 Lance Martin 给出 `/claude-api prompt-audit` 来扫描 skills 和 CLAUDE.md，但原文在说明处截断，命令输出与判读方式未知，只能小范围试。

还有一类浪费发生在会话的 token 账本上：同一条消息里被反复重发的 CLAUDE.md、完整聊天记录、以及你从不调用的 MCP 工具定义，都在持续吃配额。一条推文把这三项点成「用量限制午饭前就耗尽」的主因，并给出先用 `/context` 看清 token 去向、再把自动压缩阈值从 95% 提前到 60%、再精简 MCP 的路径；原文同样在 `/mcp` 处截断，而且全文没有一个数字。

还有一类浪费发生在长会话的交接上：上下文快到窗口上限时，你要手动 `/clear`，再从头把背景、决策、当前进度重述一遍；同一个纠正，可能要说第四遍。有一份材料给出了 ctx-handoff 这个 Claude Code mod 的做法：上下文达到阈值（默认 600k，或窗口的 80%，取较低者）时自动写交接摘要、`/clear`、在新会话里提交；空闲 55 分钟时 fork 一个极小请求刷新 prompt cache 保活；缓存还热时把对话沉淀成 memory 和 rule 两类条目。作者自标 experimental，构建在 Claude Code 的 early-access function-hooks API 上。

还有一类浪费发生在会话撞上上下文上限的那一刻：内置的 auto-compact 在原地压缩，你没法控制它保留什么、丢掉什么；压完 agent 可能已经忘了当前任务的关键决策。有一份材料给出了 claude-auto-handoff 这个 Claude Code mod 的做法：接近阈值时不再原地压缩，而是让 Haiku 依据 transcript 写一份结构化交接简报落到磁盘——进行中的工作、决策、待验证的假设、死路、你的最后请求及是否已被回答、下一步；其中 files/commits/issues 等段落由代码直接从 transcript 提取、不依赖模型记忆；写完执行 `/clear`，再用一行提示把新会话接上，新会话读简报后继续干活。该项目定位明确：替换内置 auto-compact。它同样是作者自测的早期项目（0.8.x）。

新增一类浪费发生在「你离开会话之后」：Claude Code 把会话上下文放在提示缓存里，最后一次请求后一小时过期。一小时内发起的 turn 以很低的输入价格读回整段对话；超过一小时后，下一个 turn 要按全价重读全部内容，长会话下又慢又贵。有一份材料给出了 obie/auto-handoff 这个 Claude Code 插件：在你离开后、缓存失效前自动跑一次交接命令，把当前工作状态写成一个文件，供新会话恢复；默认空闲 50 分钟触发，写 `docs/handoffs/<timestamp>-<slug>.md`，内容覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions，不提交。

本手册把对应这几类浪费的做法合在一起：把工具输出挡在上下文窗口之外（Context Mode、headroom）、把「读很多、只判断一点」的略读外包给小模型（Quicksilver）、用持久记忆保住跨会话状态（claude-mem、mem0、cognee）、把执行计划写到磁盘并靠 hook 重注入（planning-with-files）、把团队 trace 固化成可复用技能（hivemind）、用录屏口述补上下文和反馈（blurt）、把 agent 规则集中成一份共享 AGENTS.MD 软链给同机多个工具共读（做法 L）、定期审查 CLAUDE.md / skills 里的过时指令（做法 M）、先给上下文预算做一次审计再逐项砍浪费（做法 N）、把长会话的自动交接与沉淀交给工具（做法 O、做法 P），以及在你离开会话后自动落盘交接文档（做法 Q）。核心要求是：不只看节省比例，要用任务侧指标验证结果有没有变好。

## 适用与不适用

适用：

- 你正在用编码代理（Claude Code、Codex、Cursor 等）做真实编码任务。
- 任务中本来就会产生大量工具输出（读多个文件、grep、shell、日志、web_fetch）。
- 你会经历会话压缩，或者需要跨会话继续同一个任务。
- 你有一类「读很多、只判断一点」的活：在 187 个文件里找处理 auth 的、在 3000 行日志里找真失败、在 200 张工单里找退款请求。
- 你有说不清、截图慢的界面问题，需要一个更自然的输入通道。
- 你要做长时编码任务，计划需要挺过 /clear、崩溃和 compaction。
- 你想让团队里多个 agent 复用已解决的问题，或想给 agent 加可编程的持久记忆。
- 你本机同时使用两个及以上支持「项目/全局指令文件」约定的编码 agent（如 Claude Code、Codex），希望同一套规则只维护一份、两边都遵守。
- 你在维护 CLAUDE.md 或 skills，里面还残留为旧模型写的提示习惯，想系统审查一遍再决定删不删。
- 你在用 Claude Code，有较长的 CLAUDE.md，接了多个 MCP 服务器而多数用不到，并且对用量/配额敏感。
- 你在 1M 上下文模型 + Claude 订阅（1 小时 prompt cache）上跑很长的 Claude Code 主会话，经常手动 /clear 再重述上下文，或者同一条纠正要重复交代。
- 你在 Claude Code 里跑长会话，经常撞上下文上限，想用一份结构固定、可编辑、落盘的交接简报替换内置 auto-compact，并且愿意接受一个 0.8.x 的早期 mod。
- 你在 Claude Code 里跑长会话，经常离开去做别的事，回来发现缓存已失效、重读又慢又贵，希望在离开后、缓存失效前自动把工作状态落成一份交接文档。
- 你愿意装 MCP server / 插件 / hook / 本地代理 / skill / mod，并接受一次小范围试用。

不适用：

- 你对商用许可敏感。Context Mode 是 ELv2 许可，对商用有限制；cognee 的单 Postgres 图存储和本地 GLiNER 抽取器是 demo，生产版是授权产品。
- 你不能把内容发给第三方。Quicksilver 会把待扫描内容发到 TypeSafe 的 API（api.typesafe.ai）；mem0 默认依赖 LLM 与 embedding 供应商；cognee 配 LLM 后会发起 provider 调用；hivemind 默认把全部会话 prompt 与工具输出写进团队共享 workspace。
- 你希望直接拿到第三方验证过的 98% 节省、100x 提升、~10x token 节省、mem0 托管高分、cognee BEAM 分数、planning-with-files 自测数据、hivemind 基准、ctx-handoff 的 94/94 测试、claude-auto-handoff 的 7 秒恢复。这些数字都是各自 README 或项目自述，调研没有找到第三方验证或实验数据。
- 你的任务很小、工具输出很少，装 hook / 代理 / 持久记忆 / mod 的开销可能不划算。headroom 原文也写了：短对话、散文、已经密集的载荷收益很小甚至为零，小于 min_input_words 的块原样返回。
- 你不想改配置、不想重启客户端，或者沙箱里跑不了本地进程（headroom 需要本机进程和端口）。
- 你的问题是纯后端、无界面、又拍不到。blurt 的前提是能看到问题或用手机拍到（终端、TUI、桌面应用可以）。
- 你只用单一 provider、也不需要跨 agent 记忆——headroom 的这部分收益对你不成立。
- 你只用单一 agent。做法 L 的收益建立在「多个工具共读一份规则」上，只有一个工具时这条不成立。
- 你的系统不支持符号链接。macOS / Linux 原生支持；Windows 需另想办法，做法 L 的原文没有给出 Windows 路径。
- 你想照抄一份现成的规则文本或仓库链接。这条材料是二手转述，原文没给开源仓库链接、没给具体路径，也没给规则内容，路径必须按各工具当前文档自行确认。
- 你不想引入 Postgres demo、Docker、Deeplake 账号或 600 MB 本地嵌入模型。
- 你用的不是 Claude Code：`/claude-api prompt-audit`、`/context`、`/compact`、`/mcp`、`/handoff` 都是 Claude Code 内的斜杠命令，材料没有说其他工具可用；做法 Q 也是 Claude Code 插件。
- 你希望命令自动帮你改写文件：prompt-audit 原文截断，没有说明会产生修改建议或自动改写，不要预设。
- 你对“旧指令拖累新模型”这个主张要求现成实验证据：目前只有一条推文的作者主张，没有对照实验、样本或指标。
- 你的 CLAUDE.md 很短、也不接 MCP：做法 N 几乎没有可操作空间，只剩「顺手看一眼 /context」的价值。
- 你希望做法 N 给出确定的节省数字：原文全文没有一个数字、截图或对比实验，只有「限制总是在午饭前耗尽」这句体感描述。
- 你用 5 分钟 prompt cache（API key、Bedrock、Vertex 用户，以及进入 usage credits 的订阅用户）。ctx-handoff 的空闲刷新在 5 分钟 TTL 下会发现缓存已失效，而每次刷新会重写整个上下文；mod 不检测 TTL，必须手动 `/handoff refresh off`。做法 Q 同样无法判断会话用的是哪种缓存；若已降级到 5 分钟缓存，必须把 `minutes` 调得小得多，否则交接会错过热缓存窗口。
- 你的 Claude Code build 不带 function hooks（mods）。ctx-handoff、claude-auto-handoff 和 obie/auto-handoff 都依赖它；ctx-handoff 作者开发测试版本为 2.1.287，obie/auto-handoff 在 2.1.289 上开发测试，且基于 early access 的 function hooks 插件 API，可能在版本间变化。
- 你要的是稳定、久经考验的方案。ctx-handoff 由作者自标 experimental，claude-auto-handoff 仓库 39 stars、版本 0.8.x、自测为主，obie/auto-handoff 仓库 35 stars、MIT、作者自测且无量化数据，三者的关键行为都尚未被第三方实测。
- 你希望交接能带上图片/附件：ctx-handoff 与 claude-auto-handoff 被暂扣的只有文本，图片/附件必须在交接后重新粘贴；做法 Q 的交接文件同样只写文本。
- 你把会话用 wrapper 管道化：claude-auto-handoff 与这种管道不兼容，需要设 `DISABLE_AUTO_COMPACT`，而那会关掉这个 mod（viewer 服务仍会运行）。
- 你希望交接简报页在公网或任意设备可达：claude-auto-handoff 的 `viewer` 默认只在 Tailscale 网内可达，未装 Tailscale 时退到 127.0.0.1 仅本机。
- 你希望由 mod 自己判断简报写得好不好：claude-auto-handoff 的有效性判定很宽松（Haiku 回复含至少一个标题即算有效），否则回退 facts-only 简报，可能损失信息。
- 你已经用做法 O 或做法 P 管同一个会话：做法 O、P 都是「到阈值就自动交接」，做法 Q 是「空闲到点就自动交接」；材料没有说明三者能否共用，同一条会话先只加一个，不要叠加。
- 你的工作目录不是 git 仓库，或者你不允许插件运行 `git status`：做法 Q 的默认交接 skill 依赖 `date` 和 `git status`。
- 你无法为自定义交接命令预批准工具，也不能把会话放在允许写入的权限模式下：做法 Q 无人值守时一旦调用未预批准的工具，这个 turn 会卡在权限提示上直到你回来。
- 你只想让交接文件自动提交：做法 Q 默认只写 `docs/handoffs/<timestamp>-<slug>.md`，不做任何提交。

## 前置条件

- 如果走 Claude Code：Claude Code v1.0.33+（Context Mode 要求），用 claude --version 确认。claude-mem 要求 Claude Code 最新版且支持插件。
- Node.js/npm 可用。Quicksilver 要 Node 18+；claude-mem 要 Node 20.0.0+，Bun 和 uv 缺失时会自动安装，SQLite 3 已捆绑；headroom 要 Python 3.10+；hivemind 要 Node >= 22.0.0；planning-with-files 安装走 npx skills。
- 一个真实编码任务，最好本来就有大量工具调用，能对比前后差异。不要用玩具任务，否则看不出节省。
- 做法 L 额外需要：本机确实同时使用两个及以上支持同类指令文件约定的编码 agent；系统支持符号链接（macOS / Linux 原生支持，Windows 需另想办法）。
- 做法 M 额外需要：本机已安装并可正常使用 Claude Code；目标项目里已有 CLAUDE.md 或 skills 配置文件，否则没有可审查的对象；先备份当前 CLAUDE.md。
- 做法 N 额外需要：本机已安装并可正常使用 Claude Code；有较长的 CLAUDE.md；接入了多个 MCP 服务器而其中多数用不到；对用量/配额敏感。做法 N 不需要装任何新工具，只需要在 Claude Code 设置里确认自动压缩阈值项的位置。
- 做法 O 额外需要：带 function hooks（mods）的 Claude Code build（作者在 2.1.287 上开发测试）；目标场景是 1M 上下文模型 + 1 小时 prompt cache 的订阅用户；能把 mod 克隆到本地并以 `--plugin-dir` 加载，或能改 `~/.claude/settings.json` 的 `env`。
- 做法 P 额外需要：带 mods（function-hook plugins）的 Claude Code 构建；能 clone 仓库并以 `--plugin-dir` 加载，或能改 `~/.claude/settings.json` 的 env；`~/.claude/state` 与 `~/.claude/auto-handoff/` 可写；可选 Tailscale（跨设备看简报页）、jq（状态栏链接脚本）、终端超链接支持（`FORCE_HYPERLINK=1`）。
- 做法 Q 额外需要：已安装并运行 Claude Code（原文在 Claude Code 2.1.289 上开发测试）；能安装插件并在下次会话启动时加载；工作目录是有 git 仓库的目录（默认交接 skill 会运行 `date` 和 `git status`）；能写入 `docs/handoffs/`；若自定义交接命令，必须给它 `allowed-tools` 预批准它会调用的工具，或把会话放在允许写入的权限模式下；该插件基于 early access 的 function hooks 插件 API，可能在版本间变化。
- 各自的凭据与许可：
  - Quicksilver：到 console.typesafe.ai 申请一个 Jev key。内容会被发送到 TypeSafe 的 API，所以不要拿它处理不能给第三方的数据。
  - claude-mem：标准安装会要求浏览器登录（邮箱 magic link，无需信用卡）；不想要账号交互就显式传 --provider、设 CLAUDE_MEM_ONLINE_OPTIN=false，或在 CI / 非交互 shell 里运行。
  - headroom：匿名 beacon 默认开启，上报压缩比例、计数、provider 与 model ID、OS 与架构，不上报 prompt、补全、代码或文件路径；合规需要时用 HEADROOM_BEACON=off。
  - mem0：默认依赖 OpenAI 的 gpt-5-mini 和 text-embedding-3-small；混合检索建议至少用 Qwen 600M 或同级别 embedding；自托管默认开启鉴权，旧版升级需设置 ADMIN_API_KEY、通过向导注册 admin，或仅在本地开发用 AUTH_DISABLED=true。
  - cognee：Python 3.10–3.14；无 LLM key 时可用本地 GLiNER 与本地 embedding 模型，首次使用会下载模型，CPU 可跑；要生成式回答需配置 LLM key。
  - planning-with-files：宿主需支持 hook/插件或 Agent Skills；状态标记必须保持英文字面量，例如 **Status:** complete。
  - hivemind：需要一个 Deeplake 账号以获得 token；安装器会探测机器上所有受支持 assistant，接好 hooks，弹同意提示后开浏览器登录；装完要重启 assistant。
  - obie/auto-handoff：MIT 许可；仓库 35 stars；安装走 `/plugin` 命令；默认 `minutes`=50、`command`=auto-handoff:handoff；交接文件写到 `docs/handoffs/<timestamp>-<slug>.md`。
- 知道 Context Mode 是 ELv2 许可，推广前确认商用合规。
- 如果走完整插件，能修改 ~/.claude/settings.json 并重启 Claude Code。

## 操作步骤

先选做法：

- 只想先省上下文、不想装 hook，且用 Claude Code → 做法 A（Context Mode MCP-only），推荐先做。
- 想让它自动拦截大输出、自动路由到沙箱 → 做法 B（Context Mode 完整插件）。
- 用 Cursor、插件未上架 → 做法 C。
- 主要痛点是「读很多、只判断一点」→ 做法 D（Quicksilver 做批量略读判断）。
- 主要痛点是「换会话就失忆、反复交代背景」→ 做法 E（claude-mem 持久记忆）、做法 H（mem0）、做法 I（cognee）三选一先试。
- 想在本地统一压缩所有经过 LLM 的流量，而且要求可逆 → 做法 F（headroom）。
- 痛点是不好描述、说不清复现步骤的界面问题 → 做法 G（blurt 录屏口述）。
- 长时编码任务、计划要挺过 /clear 或 compaction → 做法 J（planning-with-files）。
- 团队多 agent、想把重复模式固化成技能 → 做法 K（hivemind）。
- 需要可编程、按 user_id 隔离的持久记忆 → 做法 H（mem0）。
- 需要本地优先、知识图谱、无 LLM 也能检索 → 做法 I（cognee）。
- 同一台机器上同时用 Claude Code 和 Codex，规则要在多处维护、两边行为还不一致 → 做法 L（共享 AGENTS.MD + 软链）。这条按「值得小范围试」对待，不要一上来就铺到所有 repo。
- 主要痛点是 CLAUDE.md / skills 里堆着旧提示习惯，想先审一遍再决定删不删 → 做法 M（`/claude-api prompt-audit`，先只记录不改动）。
- 主要痛点是「配额/用量限制提前耗尽」，CLAUDE.md 很长、MCP 服务器一大堆 → 做法 N（先 `/context` 审计，再逐项砍）。这条不用装东西，成本最低，适合在做 A–Q 之前先做一遍。
- 长会话经常撞上下文上限、每次都要手动 /clear 再重述 → 做法 O（ctx-handoff mod，先只跑 `/handoff dry` 看一次交接成本）。这条只作用于主会话，且作者自标 experimental，先小范围试。
- 长会话经常撞上下文上限、你想用一份可编辑、可落盘的交接简报替换内置 auto-compact → 做法 P（claude-auto-handoff，先用 `AUTO_HANDOFF_TOKENS=60000` 跑一次交接）。做法 P 与做法 O 同属「阈值自动交接」，同一条会话里二选一，不要叠加。
- 长会话经常离开去做别的事，回来发现缓存已失效、重读又慢又贵，希望离开后自动落盘交接文档 → 做法 Q（obie/auto-handoff，先用默认 `minutes`=50 在一个有 git 仓库的真实长任务里试一次）。做法 Q 是「空闲到点就自动交接」，与做法 O、P 的「阈值触发」不同；材料没有说明三者能否共用，同一条会话先只加一个。

这些做法可以叠加，但一次只加一个，否则分不清是哪个起了作用。

### 做法 A：MCP-only 轻量试用（推荐先做）

1. 确认 Claude Code 版本。
   ```bash
   claude --version
   ```
   预期：版本不低于 v1.0.33。低于这个版本先升级。

2. 添加 MCP server。
   ```bash
   claude mcp add context-mode -- npx -y context-mode
   ```
   预期：注册 11 个 ctx_* 工具。这个方式没有 hook、没有自动路由，只有工具。

3. 重启 Claude Code，让 MCP server 生效。预期：在会话里能调用 ctx_* 工具。

4. 准备一个真实编码任务，任务里本来就会产生大量工具输出，例如读多个文件、grep、跑 shell。

5. 在任务开始前和结束后，输入 ctx stats 查看状态。预期：能看到按工具的节省明细、消耗 token、节省比例。

6. 手动提示模型使用 ctx_* 工具。因为 MCP-only 没有自动路由，模型不一定会自己用。可以在提示词里明确要求：批量读取、统计、聚合类工作先用 ctx_execute 写脚本完成，只输出结果。

7. 记录任务结果：正确率、人工纠正次数、交付时间。最好能和不用 Context Mode 的基线对比；没有基线就至少记录这次任务里上下文占用和工具输出的关系。

8. 根据结果决定是否上做法 B，或者是否推广到团队。

### 做法 B：完整插件（自动路由 + hook）

1. 前置：Claude Code v1.0.33+。

2. 添加 marketplace。
   ```
   /plugin marketplace add mksglu/context-mode
   ```

3. 安装插件。
   ```
   /plugin install context-mode@context-mode
   ```

4. 重启 Claude Code，或执行 /reload-plugins。然后用 /context-mode:ctx-doctor 验证。预期：所有检查为 [x]。

5. 可选：加状态栏。一次性编辑 ~/.claude/settings.json：
   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "context-mode statusline"
     }
   }
   ```
   重启后状态栏显示 $ saved this session · $ saved across sessions · % efficient。

6. 用斜杠命令查看状态：ctx-stats、ctx-doctor、ctx-index、ctx-search、ctx-upgrade、ctx-purge、ctx-insight。其他平台在聊天里输入 ctx stats 等，由模型自动调 MCP 工具。

7. 跑真实任务，对比结果。完整插件会通过 hook 自动拦截会产生大输出的工具，并自动路由到沙箱。

### 做法 C：其他平台（按 README 配置，先小范围试）

- Cursor 插件仍在审核中。可本地安装：macOS/Linux 用 ln -s "$PWD/context-mode" ~/.cursor/plugins/local/context-mode；Windows 用 robocopy。也可手动建 .cursor/mcp.json 和 .cursor/hooks.json，并拷 .cursor/rules/context-mode.mdc。注意项目 .cursor/hooks.json 会覆盖 ~/.cursor/hooks.json，旧残留会重复触发。
- Gemini CLI：npm install -g context-mode，在 ~/.gemini/settings.json 注册 mcpServers 与 BeforeTool、AfterTool、PreCompress、SessionStart 四个 hook；重启后 /mcp list 应显示 Connected。
- VS Code Copilot、JetBrains Copilot、GitHub Copilot CLI、OpenCode / KiloCode、OpenClaw / Pi Agent：按 README 注册 MCP 与 hook。注意 GitHub Copilot CLI 的 hook 调用全局 context-mode，旧版本 fail open；OpenCode 同时存在 plugin 与 mcp.context-mode 会注册 0 个 ctx_* 工具，需 context-mode upgrade；OpenClaw / Pi Agent 原文在安装步骤处被截断，照做前核对完整文档。

### 做法 D：把「略读型批量判断」外包给 Jev（Quicksilver）

适用形态：一个窄的、带类型的判断，作用在大量条目上。Jev 返回带类型的判定，Claude 只拿回一个 shortlist。

1. 前提：Claude Code 已安装；Node 18+；到 console.typesafe.ai 申请 Jev key。内容会被发送到 TypeSafe 的 API。

2. 交互式安装：
   ```bash
   npx github:UditAkhourii/quicksilver
   ```
   装完重启 Claude Code。之后 Claude 在任务看起来像「读很多来判断一点」时会自行调用这个 skill。

3. 非交互安装：
   ```bash
   npx github:UditAkhourii/quicksilver install --key YOUR_JEV_KEY
   ```

4. 作为 Claude Code 插件安装：
   ```
   /plugin marketplace add UditAkhourii/quicksilver
   /plugin install quicksilver@quicksilver
   ```

5. 常用命令：
   ```bash
   qs filter   "Does this file handle user sessions?" src
   qs filter   "Does this line report a failure?" app.log --lines
   qs classify --labels "bug,feature,question" --items issues.jsonl
   qs rank     "where do we issue refunds?" src --top 5
   qs find     "the retry backoff logic" huge_module.py
   qs ask      "Does this contract allow termination without notice?" --state @contract.txt
   qs status
   ```

6. 大扫描时加 --fast。README 原文：Add --fast to pack items and go about 10× faster on obvious needles。

7. 按 skill 的要求改写提问方式：一次只问一个窄的、带类型的判断——一个 yes/no 条件、一组封闭标签，或一个评分标准；写清确切的边界情况；给一个兜底标签；不做算术、不涉及日期。

8. 读回执判断这次调用值不值。每次运行结束都会打印回执，例如扫描数、命中数、borderline 数、耗时、Jev token 与成本、约多少 Claude token 没被读。

9. 安全边界：不会发送 .env*、私钥、证书、凭据文件；遵守 .gitignore；跳过二进制文件和大于 2 MB 的文件。key 保存在 ~/.quicksilver/config.json。删除 key：
   ```bash
   npx github:UditAkhourii/quicksilver setup --remove
   ```

10. 不要用它做写作、编辑、多步推理，以及任何 grep 能精确回答的问题。

### 做法 E：跨会话持久记忆（claude-mem）

1. 前提：Node.js 20.0.0+；Claude Code 最新版且支持插件；Bun 和 uv 缺失时会自动安装；SQLite 3 已捆绑。

2. 标准安装：
   ```bash
   npx claude-mem install
   ```
   安装器先完成部署，再要求浏览器登录 claude-mem（邮箱 magic link，无需信用卡）。

3. 想跳过登录/账号交互：显式传 --provider，或设置 CLAUDE_MEM_ONLINE_OPTIN=false，或在 CI / 非交互 shell 中运行。

4. 改用插件市场安装：
   ```
   /plugin marketplace add thedotmack/claude-mem
   /plugin install claude-mem
   ```

5. 安装到其他 harness：
   ```bash
   npx claude-mem install --ide opencode
   npx claude-mem install --ide antigravity
   npx claude-mem install --ide omp
   npx claude-mem install --ide grok-bot
   ```
   注意：Grok Bot 没有 host hook，改为监听 chat log 文件；默认用托管记忆 CMEM Pro，本地 observer 需显式 --provider host；装该插件不会顺带安装 Cursor。

6. OpenClaw 网关上安装：
   ```bash
   curl -fsSL https://install.cmem.ai/openclaw.sh | bash
   ```

7. 重启 Claude Code。此后新会话会自动出现此前会话的上下文。

8. 配置写在 ~/.claude-mem/settings.json。可配 AI 模型、worker 端口、数据目录、日志级别、上下文注入设置。设置工作流模式与语言：
   ```json
   {
     "CLAUDE_MEM_MODE": "code--zh"
   }
   ```
   改完需重启 Claude Code 生效。查看本地可用模式：
   ```bash
   ls ~/.claude/plugins/marketplaces/thedotmack/plugin/modes/
   ```

9. 让 SessionStart 上下文包含所有 harness 的观察：在 ~/.claude-mem/settings.json 中设 "CLAUDE_MEM_SESSION_START_INCLUDE_ALL_SOURCES": "true"，或在 viewer 设置里打开 Include all sources at session start。

10. 隐私控制：用 <private> 标签把敏感内容排除在存储之外。

11. 检索三层工作流（MCP 工具，先便宜后昂贵）：
    - search：全文检索索引，可按 type/date/project 过滤，约 50–100 tokens/结果。
    - timeline：某条 observation 或查询前后的时间线上下文。
    - get_observations：按 ID 批量取完整详情，约 500–1,000 tokens/结果，务必批量。

12. 注意：npm install -g claude-mem 只安装 SDK/库，不注册插件 hook、不搭建 worker 服务。装插件一律走 npx claude-mem install 或 /plugin 命令。

13. 出问题时：直接把问题描述给 Claude，troubleshoot skill 会自动诊断并给修复；也可生成完整 bug 报告：
    ```bash
    cd ~/.claude/plugins/marketplaces/thedotmack
    npm run bug-report
    ```

### 做法 F：本地代理压缩所有 LLM 流量（headroom）

1. 安装（三种方式任选）。前提：Python 3.10+，能起本地进程。
   ```bash
   uv tool install --python 3.13 "headroom-ai[all]"
   pip install "headroom-ai[all]"
   npm install headroom-ai
   ```
   注意：headroom CLI 只在 PyPI 包里；npm 包是库，不提供命令行。macOS 上如果默认 python3 比当前 wheel 支持的新，加 --python 3.13。

2. 选接入模式：
   ```bash
   headroom deploy
   headroom wrap claude
   headroom proxy --port 8787
   ```
   headroom wrap 每次都要用它来启动会话才会生效。撤销用 headroom unwrap <tool>。

3. 自检与看省量：
   ```bash
   headroom doctor
   headroom perf
   headroom dashboard
   ```

4. 打开输出 token 削减（默认关闭）：
   ```bash
   export HEADROOM_OUTPUT_SHAPER=1
   headroom proxy --port 8787
   ```
   两个机制：verbosity steering 在 system prompt 末尾追加简洁说明；effort routing 在模型只是接着工具结果往下走的轮次下调思考强度。

5. 让工具自己学简洁度：
   ```bash
   headroom learn --verbosity
   headroom learn --verbosity --apply
   ```

6. 量测输出节省：
   ```bash
   headroom output-savings
   ```
   想看实测而不是估计，留出 10% 会话作为未处理对照组：
   ```bash
   export HEADROOM_OUTPUT_HOLDOUT=0.1
   ```

7. 关闭遥测：
   ```bash
   export HEADROOM_BEACON=off
   ```
   或用 DO_NOT_TRACK=1，或 --offline。

8. 失败挖掘与回滚：
   ```bash
   headroom learn
   headroom learn --target CLAUDE.md
   headroom unwrap <tool>
   ```

### 做法 G：录屏 + 口述，把上下文和复现步骤一次性录进去（blurt）

1. 安装 skill：
   ```bash
   npx skills add AGIHunt/blurt
   ```
   Claude Code 也可以用：
   ```
   /plugin marketplace add AGIHunt/blurt
   ```

2. 在任意项目中让 agent 启动。触发语：
   ```
   "start blurt" / 「开始口喷」
   ```
   首次运行会自动为你的机器挑选语音模型，并安装 Blurt 菜单栏应用。

3. 划定录制区域：拖选一个区域、点选某个窗口，或全屏。

4. 倒计时 3-2-1 后开始口述。悬浮小条显示时间与麦克风电平，带暂停、重录、Finish。快捷键：⌥⇧P 暂停、⌥⇧S 完成。

5. 点 Finish 后回到工作，agent 在本地转写、写出条目、打开评审页。

6. 像刷信息流一样逐条分诊，全部为键盘操作：A 保留、X 丢弃、J/K 上一条/下一条、Z 撤销、G 列表、V 总览。然后导出，或对 agent 说 fix them。

7. 常驻用法：⌥⇧R 在任意位置开始录制，再按一次结束；⌥⇧B 打开菜单。录制默认写到工作区 ~/Blurt，也可以绑定到某个项目目录。

8. 后台自动处理：打开 After recording → Claude Code / Codex，此后每次录完都在后台被处理。

9. 团队协作：队友从 releases 页下载 Blurt for macOS，解压后第一次右键 → Open，按 ⌥⇧R 录制；然后用 Recent recordings → Copy video 把视频贴到 Slack/飞书里；或者绑定一个共享项目文件夹。

10. 语音模型与语言：默认本地 SenseVoice，约 240 MB；Apple Silicon 或 NVIDIA 上可用 Whisper；也可以自带 Groq、OpenAI 或 DashScope 的 key；默认情况下没有数据离开本机。录制对象不限于网页应用：终端、TUI、桌面应用同样可以；手机用自带录屏并把麦克风打开；硬件类用手机拍下来，然后交给 agent 说 process this video。

### 做法 H：mem0 可编程持久记忆

适用形态：你希望把「记住用户偏好与历史」从每次人工复述变成 agent 的默认动作，并且需要按 user_id 隔离、可自托管或走云平台。

前提：Mem0 依赖一个 LLM，默认 OpenAI 的 gpt-5-mini；默认 embedding 是 text-embedding-3-small；要用混合检索，README 建议至少用 Qwen 600M 或同级别 embedding 模型。

路线 A：CLI 最小验证（最快，先确认通路）。README 称 agent 可在 5 秒内自助拿到可用 API key，无需邮箱、控制台或 OTP：
```bash
npm install -g @mem0/cli      # or: pip install mem0-cli
mem0 init --agent --agent-caller claude-code
mem0 add "I am using mem0"
mem0 search "am I using mem0"
```
人类 owner 之后可用 mem0 init --email <their-email> 认领该账号。带用户隔离的常规用法：
```bash
mem0 init
mem0 add "Prefers dark mode and vim keybindings" --user-id alice
mem0 search "What does Alice prefer?" --user-id alice
```

路线 B：库方式接进自己的程序：
```bash
pip install mem0ai
```
需要 BM25 关键词匹配与实体抽取的增强混合检索时：
```bash
pip install mem0ai[nlp]
python -m spacy download en_core_web_sm
```
JS 版本：npm install mem0ai。README 给出的核心调用模式是「取记忆 → 拼进 system prompt → 生成回答 → 把整轮对话写回记忆」：用 memory.search(query=message, filters={"user_id": user_id}, top_k=3) 取回相关记忆；把记忆拼进 system prompt；生成回答后 memory.add(messages, user_id=user_id) 写回。

路线 C：自托管服务器：
```bash
cd server && make bootstrap
cd server && docker compose up -d    # http://localhost:3000
```
自托管默认开启鉴权。旧版本升级需设置 ADMIN_API_KEY、通过向导注册 admin，或仅在本地开发用 AUTH_DISABLED=true。

路线 D：给编码助手装 Agent Skills：
```bash
npx skills add https://github.com/mem0ai/mem0 --skill mem0
npx skills add https://github.com/mem0ai/mem0 --skill mem0-cli
npx skills add https://github.com/mem0ai/mem0 --skill mem0-vercel-ai-sdk
npx skills add https://github.com/mem0ai/mem0 --skill mem0-integrate
npx skills add https://github.com/mem0ai/mem0 --skill mem0-test-integration
npx skills add https://github.com/mem0ai/mem0 --skill mem0-oss-to-platform
```
在已有仓库里用 /mem0-integrate 以 test-first 流程接入 Mem0，再用 /mem0-test-integration 验证；要从 OSS 迁到托管平台用 /mem0-oss-to-platform。

路线选择：测试/原型用库（pip install mem0ai）；团队自建基础设施用自托管（docker compose up）；想要零运维生产直接用云平台（app.mem0.ai 注册）。旧版本升级见 https://docs.mem0.ai/migration/oss-v2-to-v3。

注意：README 的分数反映 Mem0 托管平台，包含开源 SDK 不具备的专有优化；开源用户应期待方向相似的增益，而不是相同数字。新增的 ADD-only 抽取意味着记忆只累积不覆盖，原文未说明如何清理错误记忆，需要自行设计删除路径。

### 做法 I：cognee 本地知识图谱记忆

适用形态：你要跨会话持久长期记忆，想把文档、代码、会话转成自托管知识图谱，并且希望无 LLM key 也能先跑通写入与检索。核心操作：remember、recall、improve、forget。

前提：Python 3.10–3.14。以下 1–2 步不需要任何 API key。

1. 安装：
```bash
uv pip install "cognee[gliner]"
```
gliner extra 提供未配置 LLM key 时使用的本地抽取模型。

2. 无 LLM 本地跑通「写入 + 检索」。保存为 quickstart.py 后运行：
```python
import asyncio
import cognee

async def main():
    await cognee.remember(
        "Marie Curie was born in Warsaw and worked at the University of Paris.",
        dataset_name="local_quickstart",
    )
    results = await cognee.recall(
        "Where was Marie Curie born?",
        datasets=["local_quickstart"],
    )
    for result in results:
        print(result)

if __name__ == "__main__":
    asyncio.run(main())
```
同一流程的 CLI 等价写法：
```bash
cognee-cli remember "Marie Curie was born in Warsaw." -d local_quickstart
cognee-cli recall "Where was Marie Curie born?" -d local_quickstart
```
注意：无 LLM 时 recall 返回的是匹配到的源文本片段，不生成答案。

3. 不下载模型，先看预置图谱 demo：
```bash
cognee-cli demo
```

4. 配置 LLM 以得到生成式回答：
```python
import os
os.environ["LLM_API_KEY"] = "YOUR OPENAI_API_KEY"
```
设了 key 之后，Cognee 默认用 OpenAI 做语言模型与 embedding。

5. 给已有 agent 接上记忆（Claude Code）：
```bash
claude plugin marketplace add topoteretes/cognee-integrations
claude plugin install cognee-memory@cognee
```
之后按插件配置指南选择本地或远程记忆。

6. 给已有 agent 接上记忆（Codex）：
```bash
codex features enable hooks
codex plugin marketplace add topoteretes/cognee-integrations --ref main
codex plugin add cognee@cognee
```
或改 ~/.codex/config.toml：
```toml
[features]
hooks = true
```

7. 本地 UI 查看安装：
```bash
cognee-cli -ui
```
前提：UI 启动器需要 Node.js/npm；其 MCP 服务需要 Docker。

8. Docker 跑 API demo：
```bash
docker run --rm -it -p 8000:8000 \
  -e LLM_API_KEY="sk-..." \
  -e ENABLE_BACKEND_ACCESS_CONTROL=false \
  -v cognee_storage:/cognee-storage \
  cognee/cognee:main
```
ENABLE_BACKEND_ACCESS_CONTROL=false 是单用户/本地姿态；不设它时 API 默认多租户。--rm 会在退出时丢弃容器内数据，-v cognee_storage:/cognee-storage 用于跨运行保存记忆。

9. 从源码跑 API + UI + MCP：
```bash
docker compose --profile ui --profile mcp up
```
默认端口：API 8000、UI 3000、MCP 8001。

10. 单 Postgres 承载整个记忆层：自 cognee 1.0 起，关系型元数据、PGVector、图状态可跑在一个 Postgres 实例里。但原文明确警告：用 Postgres 作图存储目前是 demo 特性，生产版本是授权产品。仅建议在 demo 场景验证。

### 做法 J：planning-with-files 磁盘计划

适用形态：长时运行编码智能体，计划需要挺过上下文丢失、/clear、崩溃和 compaction。核心是把计划状态从上下文窗口搬到磁盘上。

1. 确认前提：宿主支持 hook/插件或 Agent Skills 标准；本机有 Node/npx。

2. 一条命令安装（全局）：
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g
```
中文版：
```bash
npx skills add OthmanAdi/planning-with-files --skill planning-with-files-zh -g
```
注意：状态标记必须保持英文字面量，例如 **Status:** complete，check-complete.sh 用 grep -F 匹配它，翻译后会直接导致完成门槛失效。

3. 在项目里建立三文件结构：
```
your-project/
├── task_plan.md   ← phases + checkboxes; the resume point after /clear
├── findings.md    ← research notes and decisions, appended as you go
└── progress.md    ← session log and test results
```
并行任务不要抢同一套文件，改用隔离目录 .planning/YYYY-MM-DD-slug/，通过 .active_plan 指针选择。这些文件默认被 gitignore。

4. 与 Claude Code plan mode 衔接：plan mode 里设计并批准方案；接受方案后，让智能体把方案写成 task_plan.md 的 phases，然后在普通模式执行。

5. 依赖 hook 获得持续注入：每回合开始时 UserPromptSubmit hook 重新注入选中的 active-plan 上下文；/clear 或新会话后 skill 从磁盘重读项目文件。原生插件宿主自带每回合计划注入、写入后提醒、完成门槛、/pwf 命令、模型可调用工具；其他平台按各 IDE 的 hooks/配置指南注册。

6. 启用完成门槛：在 gated 模式下，完成门槛会持有智能体的停止动作，直到计划报告完成。

7. 命名计划与选择器：同一项目存在两个命名计划时必须显式给 PLAN_ID；可用 PWF_PLAN_ROOT 固定计划根、PLANNING_DISABLED 关闭；PWF_FAST_PATH=0 可强制回到 shell 链。

8. 查看与选择计划：--list 列出已保存的计划与阶段数。

9. 任务结束后处理计划文件：它们是工作记忆，不是交付物——默认 gitignore、不自动归档，下一个任务会覆盖根计划。值得保留的内容应显式提升到代码、提交或文档里。

### 做法 K：hivemind 团队 trace 技能化

适用形态：你想让所有 agent 共用一个大脑，把编码类 agent 每次会话的 prompt、工具调用、工具响应、助手回复捕获成结构化 trace，后台 worker 挖重复模式写成 SKILL.md，再注入团队里每个已接入 agent 的上下文。核心链路：Capture → Codify → Propagate → Compound。

前提：Node >= 22.0.0；走 npm 路径时需要可写的 npm 全局前缀；需要一个 Deeplake 账号以获得 token。安装器会探测机器上所有受支持的 assistant，接好 hooks，弹一行同意提示后开浏览器登录；装完要重启 assistant。

1. 安装（macOS / Linux）：
```bash
curl -fsSL https://deeplake.ai/hivemind.sh | sh
```
Windows（PowerShell）：
```powershell
irm https://deeplake.ai/hivemind.ps1 | iex
```
任何平台走 npm：
```bash
npm i -g @deeplake/hivemind && hivemind install
```

2. 授权登录。交互式走浏览器流程；无头 / CI 用 token：
```bash
HIVEMIND_TOKEN=<your-token> hivemind install
hivemind install --token <your-token>
```

3. 只给指定 assistant 安装（先小范围试）：
```bash
hivemind install --only claude
hivemind claude install
hivemind codex install
hivemind claw install
hivemind cursor install
hivemind hermes install
hivemind pi install
hivemind claude_cowork install
```

4. 检查接线状态：
```bash
hivemind status
```

5. 重启对应 assistant。注意：Codex 首次启动会弹 Hooks need review，必须选 2. Trust all and continue；Cursor 1.7+ 会接六个生命周期事件，装完重启；Claude Cowork 会注册共享 MCP server，必须完全退出并重开 Claude Desktop。

6. 可选：开语义检索。默认关闭，因为本地嵌入守护进程约 600 MB；不开就静默降级成 ILIKE 词法检索：
```bash
hivemind embeddings install
hivemind install --with-embeddings
```

7. 配置捕获范围与身份。关键环境变量：HIVEMIND_CAPTURE 默认 true；HIVEMIND_WORKSPACE_ID 默认 default；HIVEMIND_CAPTURE_ONLY_CLI 设 true 只捕获交互式 CLI；HIVEMIND_SKILLIFY_EVERY_N_TURNS 默认 20；HIVEMIND_SUMMARY_EVERY_N_MSGS 默认 50；HIVEMIND_SUMMARY_EVERY_HOURS 默认 2；HIVEMIND_WIKI_WORKER 设 1 完全关闭后台摘要 worker；HIVEMIND_GRAPH_ON_STOP 设 0 关闭 Stop / SessionEnd 时的代码图重建；HIVEMIND_DEBUG 设 1 输出 hook 调试日志。

8. 用 .hivemind 文件做按目录路由或退出。约定的 JSON 字段有 orgId、workspaceId、collect；.hivemind 可提交，.hivemind.local 不提交且优先于同目录 .hivemind。collect:false 作为 fail-safe 始终生效。优先级是 env > file > login。每次会话开始的 banner 会打印当前生效的 org/workspace。

9. 使用技能提炼（skillify）：worker 在 Stop / SessionEnd 触发，挖掘范围内最近会话，问 Haiku 值不值得留，然后把 SKILL.md 写到 <project>/.claude/skills/<name>/。命令：
```bash
hivemind skillify
hivemind skillify scope <me|team>
hivemind skillify pull
hivemind skillify unpull
```

10. 用自然语言搜索 trace 与技能，例如：What was Emanuele working on?；Search traces for authentication bugs we've solved；What did we decide about the API design?；Show me skills my team has codified for handling migrations。

11. 代码库图与代码文档：
```bash
hivemind docs sync
hivemind docs list
hivemind docs auto on|off
hivemind docs agent [name]
```
文档生成 shell 出去调宿主 agent 自己的 CLI，不需要另配 API key，后台运行。

12. 跨 agent 团队规则，SessionStart 注入每个会话：
```bash
hivemind rules add "no DROP TABLE on prod creds"
hivemind rules list
hivemind rules edit <rule-id> "<new text>"
hivemind rules done <rule-id>
```

13. 卸载：
```bash
hivemind uninstall
hivemind codex uninstall
```

### 做法 L：一份共享 AGENTS.MD，软链给多个 agent 共读

适用形态：同一台机器上同时使用 Claude Code 和 Codex（或其他支持同类指令文件约定的编码 agent），希望把规则集中成一份可维护的文件，再分发给各工具，而不是每个工具、每个 repo 各存一份。原文来自 @oliviscusAI 转述 Peter Steinberger（OpenClaw 作者）的设置，是二手转述且在「Every repo」处被截断，按「值得小范围试」对待，不要当 adopt。

原文只给出了机制层面的做法，没有给出任何命令、路径或规则文本。以下步骤严格对应原文所述机制，**涉及具体路径的地方必须自行按各工具当前文档确认**，不要照抄示意路径：

1. 前提确认：本机确实同时使用两个及以上支持「项目/全局指令文件」约定的编码 agent（如 Claude Code、Codex）；系统支持符号链接（macOS / Linux 原生支持；Windows 需另想办法）。

2. 建立一个单一的共享文件夹。原文强调「one shared folder that every agent on his machines reads」，即每台机器一个、所有 agent 都读它。

3. 在该文件夹里写一份 AGENTS.MD，把所有 agent 需要遵守的规则集中放在这一份文件里，而不是各工具各存一份。

4. 把这个 AGENTS.MD 软链到 Claude Code 和 Codex 各自期望读取指令文件的位置，让两个工具实际读到同一份内容。原文未给出路径，示意形式如下（**路径需按各工具文档确认，非原文内容**）：
   ```bash
   # 示意，非原文给出的命令
   ln -s /path/to/shared/AGENTS.md /path/to/claude-code/expected/location/AGENTS.md
   ln -s /path/to/shared/AGENTS.md /path/to/codex/expected/location/AGENTS.md
   ```
   预期：两个工具实际读到同一份内容，而不是各自读到一份副本。

5. 对每个 repo 做同样处理。原文在「Every repo」处截断，这一步的完整做法不可知，只能知道方向是「每个 repo 都要覆盖」。

6. **先验证链路通没通，再谈规则内容**。在里面放一条可明确观察是否生效的独特规则（例如「改动代码后必须先运行测试再汇报」，或一个特定的输出格式要求；最省事的做法是要求回复开头写某句固定的话）。然后用同一个日常任务分别在这两个工具里跑一遍。预期：两个工具都在输出里体现这条规则。若任一工具行为没有变化，说明软链路径写错了，agent 会静默地读不到规则。

7. 链路确认后再把正式规则写进去（例如「改动代码后必须先运行测试再汇报」），用同一个日常任务分别在这两个工具各跑一遍，观察正式规则是否被遵守。

8. 只在一个 repo 上跑一到两周，不铺开到所有 repo。记录下面「怎么判断变好了」里的几个指标，再决定是否扩大范围。

### 做法 M：审查 CLAUDE.md / skills 里的过时提示习惯（先只记录不改动）

适用形态：你已经在用 Claude Code，并且项目里有 CLAUDE.md 或 skills 配置；你想检查里面是否还留着为旧模型写的提示习惯（例如“逐步思考”“仔细检查你的工作”），再决定删不删。这条材料只有一条推文，原文在命令说明处截断，按 study / 小范围试对待，不要当 adopt。

1. 前提：本机已安装并可正常使用 Claude Code；目标项目里已经有 CLAUDE.md 或 skills 配置文件，否则没有可审查的对象。先保存当前 CLAUDE.md 的副本，方便回滚。

2. 在关心的那个项目目录下打开 Claude Code 会话。

3. 运行推文中给出的命令：
   ```
   /claude-api prompt-audit
   ```

4. 观察它对 CLAUDE.md 与 skills 的扫描结果。**注意**：原文在此截断，没有说明输出形式、是否给出修改建议、是否需要人工确认、是否真实存在、适用哪些模型版本。先只记录它指出的条目，不要预设它会自动改写文件。

5. 依据扫描结果，逐条复核 CLAUDE.md 中的旧式指令（如“逐步思考”“仔细检查你的工作”），判断保留、改写还是删除。第 4、5 步的具体内容属于对推文主张的合理延伸，原文并未给出，执行时需自行判断。

6. 做 A/B 小范围验证：把“逐步思考 / 自我检查”一类指令摘出，A 组保留原样，B 组删除或改写这些指令，用同一批 5–10 个真实任务各跑一遍。

7. 如果命令运行失败或不存在，本条的可用部分只剩“定期审查 CLAUDE.md 里的过时指令”这一原则，此时应降级为 study，不要当 adopt。

8. 与做法 L 的关系：做法 L 是把规则集中成一份共享 AGENTS.MD，再软链给多个工具；做法 M 是审查这份文件（以及各工具自己的 CLAUDE.md / skills）里的规则内容是否还适用于当前模型。两者可以组合：先集中，再审查；不要在审查清楚前急着铺开软链。

9. 与 Context Mode「不要加激进简洁提示词」的关系：那条反对的是加激进的简洁约束；做法 M 审查的是旧式的“逐步思考 / 仔细检查”习惯。两者不是同一类指令，不直接冲突，但共同说明：提示词的增减都要靠任务侧指标验证，不能凭感觉。

### 做法 N：先审计上下文预算，再一次只改一项

适用形态：你在用 Claude Code，配置了 CLAUDE.md，接了至少一个 MCP 服务器，并且感觉用量/配额提前耗尽。这条材料只有一条推文，原文在 `/mcp` 处被截断，全文没有任何数字或对比实验，按 study / 小范围试对待，不要当 adopt。它不用装任何新工具，成本最低，适合在 A–Q 之前先做一遍。

1. 前提确认：Claude Code 可用；有较长的 CLAUDE.md；接入了多个 MCP 服务器而其中多数用不到；对用量/配额敏感。如果 CLAUDE.md 很短、也不接 MCP，这条几乎没有可操作空间。

2. 测量现状。在 Claude Code 里打开一个常规会话，运行：
   ```
   /context
   ```
   原文的说法是「它会精确显示你的令牌都去了哪里」。预期：能看到 token 的去向。注意：原文没有给出输出各字段的含义解释，也没有说明基线多少算正常，需要自己判断 CLAUDE.md / 聊天记录 / MCP 工具这三类里哪一类占比异常。把关键数字记下来（截图或抄下来）作为基线。

3. 只改一项，先禁用当前会话里没有用到的 MCP 服务器。入口命令：
   ```
   /mcp
   ```
   **注意**：原文在此处截断，没有说明后续操作——是禁用整个服务器、还是只停用其中用不到的单个工具、是否需要重启会话，全部未知。这一步目前只能当排查入口用，实际精简动作需要自己在 `/mcp` 的输出里找。之所以选它先做，是因为这一步最确定不会丢信息。

4. 如果还想继续，再单独试「把压缩阈值调早」。原文写的是「`/compact` 设置为 60%，而不是 95%」：
   ```
   /compact
   ```
   **注意**：原文只给了结论性数字，没有说明这个阈值到底对应哪个具体设置项或命令参数，也没有说明是全局设置还是单会话设置。照做之前，先在 Claude Code 的设置里确认自动压缩（auto-compact）阈值项在哪、怎么改，不要凭空拼一条命令。

5. 只有前两项有效之后，最后再回头精简 CLAUDE.md。原文标题把 CLAUDE.md 点成主犯，但正文没有给出任何「怎么精简 CLAUDE.md」的具体做法，这一步属于缺口，需要自己判断哪些条目真的每条消息都需要。

6. 每改完一项，都用同一个类型的真实任务再跑一遍，并再记录一次 `/context`，把前后两次数值放在一起比。一次只改一项，否则分不清是哪个起了作用。

7. 记住权衡：更早压缩意味着更频繁丢失上下文细节，可能换来更多重述和返工。原文默认「越早压缩越好」，这是一个需要自己验证的假设，不是结论。

8. 与做法 M 的分工：做法 N 是看 CLAUDE.md 本身吃掉多少 token（体积问题），做法 M 是审 CLAUDE.md 里的指令内容还适不适用（内容问题）。两者可以叠加：先用 N 看清账本、砍掉用不到的 MCP，再用 M 逐条审指令。

### 做法 O：长会话自动交接与沉淀（ctx-handoff，experimental）

适用形态：你在 1M 上下文模型 + Claude 订阅（1 小时 prompt cache）上跑长时间 Claude Code 主会话。这个 mod 做三件事：主会话停止且上下文到阈值时自动交接（写交接摘要 → `/clear` → 新会话接着做）、空闲时刷新 prompt cache 保活、缓存还热时把对话沉淀成 memory / rule。只作用于主会话，子代理回合被忽略。作者自标 experimental，构建在 Claude Code 的 early-access function-hooks API 上，开发与测试版本为 2.1.287。

1. 前提：需要一个带 function hooks（mods）的 Claude Code build。这一步是整个做法能否跑起来的前提，版本不符时不要继续。

2. 克隆并首次加载：
   ```sh
   git clone https://github.com/cablate/ctx-handoff-mod ~/.claude/mods/ctx-handoff
   claude --plugin-dir ~/.claude/mods/ctx-handoff
   ```
   预期：会话里能调用 `/handoff`。

3. 跑 `/handoff` 自检。预期输出类似（模块消息为繁体中文）：
   ```
   [ctx-handoff] context 12034 / 門檻 600000（視窗 1000000）
   快取刷新 on，本次閒置已刷新 0/3，計時器未啟動
   ```
   能看到上下文用量、门槛、刷新计数，即可认为接线成功。看不到就把 build 或插件路径这条链路先查通。

4. 想让每个会话都加载，在 `~/.claude/settings.json` 的 `env` 里加绝对路径；多个文件夹 Windows 用 `;`，macOS/Linux 用 `:`：
   ```json
   "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/home/you/.claude/mods/ctx-handoff" }
   ```

5. 按需调参：数值是 `hooks/register.ts` 顶部的常量，改那里；若该文件夹被监听，改动会热重载。

   | 常量 | 默认 | 含义 |
   |---|---|---|
   | `THRESHOLD` | `600_000` | 触发交接的上下文 token 数 |
   | `WINDOW_RATIO` | `0.8` | 小窗口时阈值为 `window × ratio` |
   | `IDLE_MS` | 55 min | 触发刷新前的空闲时间（按 1 小时缓存调校） |
   | `MAX_REFRESH` | `3` | away handoff 前的刷新次数 |
   | `MIN_TOKENS` | `30_000` | 低于此值跳过刷新和 away handoff |

   作者对阈值的说明：社区反馈和 Anthropic 的 MRCR 数据提示质量大致在 200k–300k token 附近开始下滑；600k 是刻意选的、为了少交接。如果你发现模型在交接触发前就变差，就把它调低。这是作者引用的间接依据，不是本项目测量。

6. 如果你用 5 分钟缓存（API key、Bedrock、Vertex，或订阅已进入 usage credits），必须关掉刷新：
   ```
   /handoff refresh off
   ```
   原因：5 分钟 TTL 下，55 分钟时的刷新会发现缓存已失效，而每次刷新会重写整个上下文。mod 不检测 TTL，需要你手动关。关掉后空闲 55 分钟直接保存 away handoff。

7. 正式依赖它之前，先用 `/handoff dry` 看一次交接成本：它生成交接并显示成本，**不清空**会话。预期：能看到这次交接本身的成本。确认可接受，再让阈值触发的自动交接接管。

8. 日常不需要敲命令，需要时用唯一的 `/handoff` 及其子命令：

   | 命令 | 用途 |
   |---|---|
   | `/handoff` | 显示上下文用量、阈值、刷新与 distill 状态、待处理的 away handoff、用法 |
   | `/handoff now` | 立刻交接（会清空会话） |
   | `/handoff dry` | 生成交接并显示其成本，**不清空** |
   | `/handoff distill` | 立刻 distill 当前项目的 memory 和 rules |
   | `/handoff resume` | 使用 away handoff：先 `/clear` 再提交，外加被暂扣的那条消息 |
   | `/handoff continue` | 丢弃 away handoff，在老会话里发被暂扣的消息 |
   | `/handoff resend` | 重新提交没送达的交接（本进程记录，否则最近一次生成的）；不执行 `/clear` |
   | `/handoff refresh on\|off` | 开关空闲缓存刷新 |
   | `/handoff distill on\|off` | 开关后台 distill |

   最近 5 次交接保留在 mod 的 store 里。

9. 了解几条会影响使用的行为（照做时要知道）：
   - 交接到提交之间输入的消息会被暂扣并附到交接文本后面（只暂扣文本，图片/附件必须在交接后重新粘贴）；交接在 `/clear` 前失败则在老会话里重新提交。`/handoff dry` 和 away handoff 从不暂扣消息。
   - 后台 distill 结果乘在下一条真正进入会话的消息上；有变更时会有 toast 显示变更条目数和写入的每个 notes 文件全路径。
   - distill 输出是 JSONL，由程序校验并落盘：每行一个 action，位于 `=== ACTIONS ===` 与 `=== END ===` 之间（`add_memory`、`update_memory`、`delete_memory`、`add_rule`、`confirm_rule`、`update_rule`、`delete_rule`，以及一步完成跨项目移动的 `move_memory`/`move_rule`），始终用繁体中文（台湾），代码、命令、路径、报错保持原样。非法行被丢弃并计数，最多保留 3 个样本连同原因，由 `/handoff` 展示；任何含疑似密钥字段的 action 整条丢弃且不保留样本。
   - notes 按项目归档：会话从父目录启动但触碰多个 repo 时，按工具路径和 Bash 工作目录记录触碰的项目，取有 `.git` 的最近祖先；会话根是 `P1`（默认），Bash `cd` 到别的 repo 不会改变它；触碰的项目为 `P2`、`P3`……最多 8 个。
   - 失败可见可恢复：每次交接失败（写、`/clear`、提交）都被记录并由 `/handoff` 展示；3 分钟未应答的交接 fork 被放弃、暂扣消息回到老会话，distill fork 8 分钟放弃；阈值交接失败后等 3 条用户消息或 10 分钟再重试。
   - 推迟有硬上限：后台工作让交接一直等时，上下文达到 `min(90% of the window, threshold + 150k)` 就照常交接。

10. 开发/自检命令（可选）：
    ```sh
    claude plugin validate .
    claude plugin test .
    tsc -p .   # after the mod has loaded once, which writes .claude-plugin/types/
    ```

11. 先在单个会话、单个项目上验证：跑一次自动交接，确认新会话确实接上了；再跑一次 `/handoff distill`，打开项目里的 `ctx-handoff.md` 看 memory / rule 写对没有。确认之后再考虑让它常驻。

12. 与做法 P、做法 Q 的关系：三者都在做自动交接，但触发条件不同——做法 O 是「阈值触发 + 空闲缓存保活 + distill」，做法 P 是「阈值触发、明确替换内置 auto-compact」，做法 Q 是「空闲触发、写交接文档到 docs/handoffs/」。材料没有说明三者能否共用；同一条会话先只加一个，不要叠加。

### 做法 P：用结构化交接简报替换内置 auto-compact（claude-auto-handoff，先小范围试）

适用形态：你在 Claude Code 里跑长会话，接近上下文上限时不想让内置 auto-compact 原地压缩，而是希望得到一份结构固定、可编辑、落盘的交接简报，再由新会话读简报续接。这个 mod 做四步：写简报 → `/clear` → 起新会话 → 新会话恢复。简报里包含进行中的工作、决策、待验证的假设、死路、你的最后请求及是否已被回答、下一步；其中 files/commits/issues 等段落由代码直接从 transcript 提取，不依赖模型记忆。仓库 0.8.x、39 stars，作者自测，按 study / 小范围试对待。

1. 前提：需要一个带 mods（function-hook plugins）的 Claude Code 构建。版本不符时不要继续。

2. 克隆并以插件目录加载：
   ```sh
   git clone https://github.com/alexknowshtml/claude-auto-handoff.git ~/claude-auto-handoff
   claude --plugin-dir ~/claude-auto-handoff
   ```
   预期：mod 加载成功；以 `--plugin-dir` 加载时保存文件会热重载。

3. （可选）让每个会话都加载：把插件目录写进 shell 环境变量，或写进 `~/.claude/settings.json` 的 `env` 块：
   ```json
   { "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-auto-handoff" } }
   ```

4. 配置。所有设置是 `/config` 里 auto-handoff 下的行，存储在 `~/.claude/settings.json` 的 `pluginConfigs`。默认值与作用：

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

5. 改简报结构与规则。默认模板在仓库 `templates/` 下。会话首次启动时，mod 会把 `templates/brief.md` 和 `templates/instructions.md` 复制到 `~/.claude/auto-handoff/`（若不存在）。改这两个副本，不要改仓库里的，这样 `git pull` 不会覆盖你的修改，下一次交接就用你的版本。想恢复默认就删掉副本，下次启动会重新复制；想放到别处就把 `briefTemplate` / `instructionsTemplate` 指过去。
   - 编辑 `brief.md`：增删、改名或重排 `## ` 章节，标题下的文字告诉 Haiku 该写什么。Haiku 回复中只要包含你的至少一个标题就算有效，否则回退到 facts-only 简报。不要写 files 和 commits 段，这两段由 mod 从 transcript 用代码添加。
   - 编辑 `instructions.md`：它有一个开关：
     ```md
     {{#priority}}Shown when the last request is not fully answered.{{/priority}}
     {{^priority}}Shown when it is.{{/priority}}
     ```
     该开关读取简报的 `## Last Request from the User` 段及其 `Status:` 行；想让开关生效，这两者都要保留在 `brief.md` 里。

6. （可选）状态栏链接：`statusline/handoff-link.sh` 包装你原有的状态栏命令，当会话来自交接时追加一行 `↪ <link>`。在 `~/.claude/settings.json` 里把它设为 `statusLine` 命令，原有命令放在它后面：
   ```json
   "statusLine": { "type": "command", "command": "~/claude-auto-handoff/statusline/handoff-link.sh ~/.claude/my-statusline.sh" }
   ```
   需要 `jq`。它从上一份简报的头部（`to:` 写本会话名、`viewer:` 写页面地址）里找链接。

7. 运行机制（了解即可，便于排障）：
   - 阈值：每轮之后、每次模型请求之前检查上下文大小（含尚未计量的工具输出）；超过阈值后拒绝新的工具调用，避免一次批量读取撑爆窗口；未计量的工具输出是可能偏高的估计，所以真实大小有时低于阈值；被拒绝的调用仍会在下一次请求或回合结束时触发交接。
   - 简报：Haiku 依据 transcript 写；Haiku 失败时用仅事实的简报兜底；简报写到 `~/.claude/state/auto-handoff/<session-id>.md`。
   - 清空并播种：mod 执行 `/clear`，给新会话发一行——读简报并按其 Instructions 段执行；纯 SSH 下终端通常不识别链接，若终端支持可设 `FORCE_HYPERLINK=1`，或用状态栏链接。
   - 面板：提示框上方有面板，显示每步的盲文 spinner，完成后读 `✓ handed off · 162k → 45k` 并带 `open brief` 链接，10 秒后收起；失败、循环守卫暂停、facts-only 简报、阈值过紧会一直停留到你按 Dismiss；自己输入 `/clear` 会关掉面板（正在交接时除外）；移动端 App 和 VS Code 不画面板，改以 toast 呈现。
   - 查看器：每份简报在 `~/.claude/state/auto-handoff/pages/` 有可读页面，同一轮的所有交接按顺序互链，链接形如 `http://100.x.y.z:3846/1a2b3c4d`。

8. （开发用）校验：
   ```sh
   claude plugin validate .
   claude plugin test .
   ```

9. 日志：全部动作记录在 `~/.claude/state/auto-handoff/auto-handoff.log`。

10. 最小试用：在一个不那么关键的长会话里跑一次——设 `AUTO_HANDOFF_TOKENS=60000` 降低阈值，省去填满 160k 的等待；正常干活直到面板出现，观察四步：写简报 → 清空 → 起新会话 → 新会话恢复，顺手确认被拒绝的工具调用确实以交接收尾；打开 `~/.claude/state/auto-handoff/<session-id>.md` 逐条核对工作进展、决策、待验证假设、死路、最后请求及 Status、下一步；查 `~/.claude/state/auto-handoff/auto-handoff.log` 有无失败与 facts-only 回退；觉得结构不合适就改 `~/.claude/auto-handoff/brief.md`（不加 files/commits 段）和 `instructions.md`，再跑第二次比较。

11. 与做法 O、做法 Q 的关系见做法 O 第 12 步：三者都在做自动交接，触发条件不同；材料没有说明能否共用，同一条会话先只加一个。

### 做法 Q：空闲自动落盘交接（obie/auto-handoff，先小范围试）

适用形态：你在 Claude Code 里跑长时间、上下文成本高、需要跨会话续接的任务。你离开会话去做别的事，回来时缓存可能已经失效，下一个 turn 要按全价重读全部内容。这个插件盯住「最后一次请求后一小时」的缓存窗口，在缓存还热的时候自动跑一次交接命令，把工作状态写成一份文件，供新会话恢复。默认空闲 50 分钟触发，默认交接命令 `/auto-handoff:handoff` 写 `docs/handoffs/<timestamp>-<slug>.md`，内容覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions；它运行 `date` 和 `git status`，然后只写这一个文件，不做任何提交。该插件 MIT 许可、仓库 35 stars、在 Claude Code 2.1.289 上开发测试，基于 early access 的 function hooks 插件 API，按 study / 小范围试对待。

1. 前提：已安装并运行 Claude Code。该插件基于早期访问（early access）的 function hooks 插件 API，可能在版本间变化。

2. 在 Claude Code 内添加 marketplace 并安装插件：
   ```
   /plugin marketplace add obie/auto-handoff
   /plugin install auto-handoff@auto-handoff
   ```
   插件在下次会话启动时加载。

3. （可选）调整触发条件。默认 `minutes` 为 50，默认 `command` 为 `auto-handoff:handoff`（写命令时不含前导斜杠）。在 Claude Code 内配置：
   ```
   /plugin configure auto-handoff
   ```
   或在 shell 中直接写入配置值：
   ```
   echo '{"command": "my-plugin:my-handoff"}' | claude plugin configure auto-handoff@auto-handoff --values-stdin
   ```

4. 若换成自己的交接命令，必须让它能在无人值守下跑通：给它 `allowed-tools` 预批准它会调用的工具，或把会话放在允许写入的权限模式下。否则模型一旦调用未预批准的工具，这个 turn 会卡在权限提示上直到你回来。

5. 了解默认交接行为：默认命令 `/auto-handoff:handoff` 是插件自带的 skill，也可以手动运行。它会写 `docs/handoffs/<timestamp>-<slug>.md`，内容覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions；为此它会运行 `date` 和 `git status`，然后只写这一个文件，不做任何提交。由于运行时没人能回答权限提示，它通过 `allowed-tools` 为自己预批准这些工具，在默认权限模式下即可完成。

6. 了解触发与取消规则：空闲计时从主对话的一个 turn 结束开始，任何新 turn 都会重置计时（无论谁发起）；subagent 结束不影响计时。空闲达到 `minutes` 后，插件像你亲手输入一样执行 `command`，并弹出一条提示。每次离开只交接一次，之后直到你主动发提示或跑命令前都保持安静；后台任务回报或定时触发不会打断这份安静。`/clear` 会取消待执行的交接。笔记本休眠错过等待时间后，插件会发现计时器晚触发，从而跳过交接（因为那时执行要付它本要避免的全价）。

7. （可选，本地开发/试用改动）把仓库链到 skills 目录：
   ```
   git clone https://github.com/obie/auto-handoff ~/projects/auto-handoff
   ln -s ~/projects/auto-handoff ~/.claude/skills/auto-handoff
   ```
   Claude Code 下次会话启动时会把该文件夹加载为 `auto-handoff@skills-dir`，保存文件时重载 hooks 模块。校验与测试命令：
   ```
   claude plugin validate .
   claude plugin test .
   ```
   部件说明：`hooks/register.ts` 是 hooks 模块（在 `turn.complete` 武装空闲计时器，在 `turn.start` 取消）；`types/index.d.ts` 声明模块保存在 `$.state` 里的两个值；`skills/handoff/SKILL.md` 是自带交接 skill；`tests/` 在模拟时钟下用 `claude plugin test` 运行。

8. 最小试用：在一个真实的、有 git 仓库的长任务会话里安装插件，先用默认配置（`minutes`=50）。若不想等 50 分钟，可临时把 `minutes` 调小（原文未给出安全的短值，需你自己权衡；注意默认值是为匹配一小时缓存设计的）。做一段有明确目标和未完事项的工作，然后离开/停止交互，等待触发。检查 `docs/handoffs/` 下是否生成了 `<timestamp>-<slug>.md`，以及是否覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions。开一个新会话，只读这份 handoff，看能否在不重新浏览整段对话的情况下接着干。

9. 与做法 O、做法 P 的关系：三者都在做自动交接，但触发条件不同——做法 O 是「上下文到阈值触发 + 空闲缓存保活 + distill」，做法 P 是「上下文到阈值触发、明确替换内置 auto-compact」，做法 Q 是「空闲到点触发、写交接文档到 docs/handoffs/」。材料没有说明三者能否共用；同一条会话先只加一个，不要叠加。

### 核心用法：用代码思考（Think in Code）

不管用哪种做法，关键动作是：让模型写脚本做分析，只 console.log() 结果，而不是把 50 个文件读进上下文再数函数。示例：
```js
// Before: 47 × Read() = 700 KB.  After: 1 × ctx_execute() = 3.6 KB.
ctx_execute("javascript", `
  const files = fs.readdirSync('src').filter(f => f.endsWith('.ts'));
  files.forEach(f => console.log(f + ': ' + fs.readFileSync('src/'+f,'utf8').split('\n').length + ' lines'));
`);
```
注意：这里的 700 KB / 3.6 KB 和 47×Read() 是 README 里的说法，未经验证。

## 怎么判断变好了

要分两类指标看：工具侧（省了多少上下文/token）和任务侧（结果有没有变好）。调研报告特别提醒：这些项目的 README 普遍只给了上下文或成本指标，没有给任务结果质量指标，所以任务侧必须自己测。

工具侧指标：

- Context Mode：ctx_stats / ctx-stats（按工具的节省明细、消耗 token、节省比例）；状态栏 $ saved this session · $ saved across sessions · % efficient；ctx_doctor / ctx-doctor 检查运行时、hook、FTS5、注册、版本，所有检查应为 [x]。
- Quicksilver：每次运行末尾的回执（扫描数、命中数、borderline 数、耗时、Jev token 与成本、约多少 Claude token 没被读）；qs status 看 key 状态和累计节省 token。
- claude-mem：看新会话是否自动注入此前上下文，以及主动检索的命中率；README 只提出三层工作流可带来 ~10x token 节省，没有可复核的实验数据。
- headroom：headroom doctor、headroom perf、headroom dashboard；headroom output-savings 默认给估计值，想看实测就开 HEADROOM_OUTPUT_HOLDOUT=0.1，dashboard 的 Output Tokens Saved 卡片会显示 measured 并带区间。
- blurt：录制到评审页的端到端耗时；每次录制的 token 与实际花费（README 给的是 ~142k/19k、~$2 这一档）。
- mem0：CLI 四步先跑通；再用 search + add 嵌进一个固定 user_id 的重复性任务做 1–2 周小范围试。注意托管平台分数含专有优化，开源版无法复现同等数字。
- cognee：无 LLM 本地 remember / recall 先跑通；再通过 Claude Code 插件或 MCP 接进现有 agent 做 1–2 周对照试用，判断能否减少重复交代上下文。BEAM 分数是自报，不能直接当作「用了 Cognee 就更好」的证据。
- planning-with-files：在同一个长时编码任务上做 A/B，让智能体把 phases 写进 task_plan.md 并靠 hook 每轮重注入，观察 /clear 或 compaction 后的重新定位轮数是否下降。原文自测数据：基准 96.7% 断言通过（29/30）、3/3 盲测 A/B 获胜、磁盘计划把重新定位从 13.3 回合降到 5.0 回合、hook 单次触发优化后 289ms。这些需要自己复现。
- hivemind：先在一个仓库、一个 agent（如 Claude Code）上小范围试，用 .hivemind 限定捕获范围，再看 skillify 是否真的产出被复用的 SKILL.md。基准数据是作者自测。
- 做法 L：这条材料没有给出任何工具侧指标，也没有命令可以读回执。唯一能用的是行为观察——两个工具是否真的读到了同一份文件、是否遵守同一条规则。
- 做法 M：材料没有给出任何工具侧指标，也没有命令可以读回执；推文互动量（58 赞 / 2 转发 / 13 回复）只反映传播度，不是效果证据。
- 做法 N：唯一的工具侧反馈就是 `/context` 本身——看 CLAUDE.md、聊天记录、MCP 工具三类来源的 token 占比是否下降。这是最直接、最可比的指标。原文没有给任何基线或阈值。
- 做法 O：`/handoff` 一次显示上下文用量、阈值、刷新与 distill 状态、待处理的 away handoff、交接失败原因、非法 JSONL 样本与原因；distill 有变更时 toast 显示变更条目数和写入的每个 notes 文件全路径；`claude plugin test` 94/94 通过（覆盖 JSONL 校验与拒绝样本、跨项目移动、fork 超时、暂扣消息去重与附件、密钥不外泄等）。交接成本本身也能量：`/handoff dry` 会显示这次交接的成本。
- 做法 P：面板的 `✓ handed off · 162k → 45k` 前后 token 对比与 `open brief` 链接；`~/.claude/state/auto-handoff/auto-handoff.log` 记录全部动作、失败与 facts-only 回退；每份简报在 `~/.claude/state/auto-handoff/pages/` 有页面，同一轮交接按顺序互链。0.8.3 起简报必须写入真实数字（交接时 token、阈值及其来源、会话起始大小、无人输入时已运行几次交接），否则写 "unknown"；0.8.4 起不在 Handoff Numbers 里的 token 数字被标记 `[unverified: not in Handoff Numbers]` 并记日志。作者自测：阈值设 80k 时的一次运行，mod 在阈值处拒绝一次读取、写简报、清空，新会话约 7 秒后回到工作、处于 31k（附 demo.gif / demo.mp4）。
- 做法 Q：原文没有给出任何量化指标或对照实验，只主张长会话下重读「又慢又贵」。可自行观察：是否按预期只触发一次、且未在你离开期间被额外 turn 打断或反复触发；交接文件是否生成在 `docs/handoffs/` 下并覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions；新会话只读 handoff 能否接着干；交接 turn 的成本与新会话从冷缓存重读全部对话的成本对比（前者应为一次缓存读）；失败信号包括权限提示卡住、计时器因退出 Claude Code 而未触发、休眠迟到被跳过导致你回来时没有交接文件。

任务侧指标：

- 正确率：任务结果是否正确。Quicksilver 的基准里就出现过省 85% token 但 F1 从 54% 掉到 23% 的情况，所以不能只看省量。
- 人工纠正次数：你需要介入纠正 agent 的次数。
- 交付时间：完成任务花了多久。
- 会话连续性：会话压缩后，agent 是否还能检索到之前的状态和决策；/clear 或 compaction 后重新定位需要多少轮。
- 可工作轮数/时长（做法 N）：同样配额下能连续工作多久、完成多少轮，是否比基线明显增加。这是做法 N 唯一隐含的正向指标——原文只说了「限制能否撑过午饭前」。
- 重述需求次数（做法 N，反面指标）：同一任务里需要重述需求的次数是否上升。压缩过早会把上下文细节压没。
- 返工与纠正次数（做法 N，反面指标）：同一任务里的返工、纠正次数是否上升。MCP 砍太狠也会带来这类代价。
- 条目保留率（blurt）：按 A 保留的条数 / 总条数；以及保留条目里「不需要再补上下文就能直接开工」的比例、代码定位命中率。
- 团队复用率（hivemind）：skillify 产出的 SKILL.md 是否被其他会话或其他人的 agent 实际拉取并复用。
- 规则生效次数（做法 L）：同一条规则在两个工具里的生效次数，应从 0 变成生效。先用一眼可验的规则（如规定回复开头的话）确认「读到了没有」，再观察正式规则。
- 重复交代次数（做法 L）：需要重复向 agent 交代同一规则的次数，应下降。
- 行为不一致次数（做法 L）：两个工具在同一个任务上的输出/行为不一致次数，应下降。
- 维护成本（做法 L）：修改一条通用规则时需要改动的文件数，应从「有几个工具/几个 repo 就改几处」降到 1 处。
- 返工次数（做法 L）：因两个工具遵循不同规则而产生的返工次数，应下降。
- 一次通过率（做法 M）：不需要返工的比例。
- 人工纠正/追问次数（做法 M）：需要介入纠正或追问 agent 的次数。
- 输出长度与 token 消耗（做法 M）：旧指令被指“增加拖累”，这里应能看到差别。
- 反向校验（做法 M）：删掉检查步骤后错误率是否上升；若结果不变甚至更好，说明这些指令可能是冗余负担。
- 交接后重新定位轮数（做法 O）：自动交接后，新会话需要重新交代背景/决策的轮数是否下降。
- 同一纠正的重复次数（做法 O）：同一条纠正需要说几遍，应下降——这是这个 mod 想直接消掉的那件事。
- 交接与 distill 的成本（做法 O）：`/handoff dry` 显示的交接成本；原文实测 distill 在 476k 约 95 秒、800k 约 3 分钟，800k 时交接本身约 28 秒。这些数字只反映作者环境，需要自己测。
- 新会话能否直接续上（做法 P）：简报里的「下一步」是否可执行、是否需要你重新解释背景。
- 简报事实准确率（做法 P）：files/commits/issues 等代码提取段是否与实际一致；Haiku 写的 token 数字是否被标 `[unverified: not in Handoff Numbers]`。
- 新会话恢复时间与手动补充次数（做法 Q）：只读 `docs/handoffs/` 下生成的交接文件，看能否在不重新浏览整段对话的情况下接着干；你手动补充说明的次数应下降。
- 交接 turn 成本对比（做法 Q）：交接本身也是一个 turn，其中每个模型请求都付出一次对整段对话的缓存读，并让缓存再热一小时；把它与「什么都不做、一小时后冷缓存全价重读」的成本对比。

最小试用方式：

1. 按做法 A，在 Claude Code 上用 MCP-only 跑一个真实编码任务；任务前后用 ctx stats 记录上下文节省；同时记录任务侧指标，和不用 Context Mode 的基线对比；如果任务会触发会话压缩，观察压缩后是否还能检索到之前的状态。
2. Quicksilver：用少量你已标注的样本核对后再扩大。先跑一条 qs filter，读回执，再抽查几个被标 ? 的边界项，确认 Claude 复查后结果对不对。README 的 12 项基准里有部分任务准确率明显下降（日志 triage F1 54%→23%、安全审查 shortlist F1 100%→89%），所以必须用自己的数据核对。
3. claude-mem：1 台机器、1 个已有项目、1–2 天。跑 3–5 次带工具调用的会话（含一次 bug 修复），开一个新会话看是否自动注入此前项目上下文；再让模型用 search → get_observations 主动回查历史；最后用 <private> 包一段假敏感信息，验证它没有进入存储。
4. headroom：先跑 headroom doctor 确认路由生效，看 dashboard 在你自己的流量上省了多少；开 HEADROOM_OUTPUT_HOLDOUT=0.1 拿实测输出节省；不满意用 headroom unwrap <tool> 回滚。
5. blurt：选一个有真实小 bug 的 Web 项目，录一段 5–10 分钟走查，一边点页面一边口述，故意在中途跳一次话题、改一次口径，看拆分是否混乱；等评审页弹出后全程只用键盘 A/X/J/K 过一遍，记录保留与丢弃各多少；对保留的条目说 fix them，看 agent 是否照着复现步骤改对；第二段换一个不写代码的同事录，验证跨人交接这一环。
6. mem0：按 CLI 四步先跑通通路，再把 search + add 嵌进一个固定 user_id 的重复性任务，做 1–2 周小范围试。
7. cognee：按 Python/CLI 快速上手路径先跑通「跨会话长期记忆」，再通过 Claude Code 插件或 MCP 接进现有 agent 做 1–2 周对照试用。
8. planning-with-files：选一个跨多会话的真实长任务，在支持 hook 的宿主上执行，做 A/B，观察重新定位轮数。
9. hivemind：先只在一个仓库、一个 agent 上安装，用 .hivemind 限定范围，看 skillify 产出的 SKILL.md 是否被复用。
10. 做法 L：挑 1 个自己最常用的 repo，建一个共享文件夹，写一份 AGENTS.MD；里面先放一条可明确观察是否生效的独特规则（例如「改动代码后必须先运行测试再汇报」，或一个特定的输出格式要求）；按各工具文档把 AGENTS.MD 软链给 Claude Code 和 Codex；用同一个日常任务分别在这两个工具里跑一遍，先确认它们确实读到了这份文件，再观察正式规则是否被遵守；只在一个 repo 上跑一到两周，不铺开到所有 repo。
11. 做法 M：挑一个正在用的项目，保存当前 CLAUDE.md 的副本；运行 `/claude-api prompt-audit`，记录它指出的条目（原文没保证它会自动改，所以先只记录、不改动）；把 CLAUDE.md 里“逐步思考 / 自我检查”一类指令摘出，做 A/B：A 组保留原样，B 组删除或改写这些指令，用同一批任务（建议 5–10 个真实任务）各跑一遍。
12. 做法 N：挑一个你常做的、长度中等的真实任务，按平常方式跑一遍，中途运行 `/context`，记录 CLAUDE.md、聊天记录、MCP 工具三类的占比（截图或抄下关键数字）作为基线；然后只改**一项**——先禁用所有当前会话里没用到的 MCP 服务器（这一步最确定不会丢信息）——跑同样类型的任务，再记录一次 `/context`；如果还想继续，再单独把压缩阈值调早（60%），重复一次同类任务和 `/context`；如果这两项都有效，最后才回头精简 CLAUDE.md。
13. 做法 O：按 README Quick start 在**单个 Claude Code 会话**里小范围试——clone 后以 `--plugin-dir` 加载、跑 `/handoff` 验证状态，先用 `/handoff dry` 观察一次交接成本，再在长任务上启用自动交接与 distill。先确认 `/handoff` 自检能看到上下文用量与阈值，再看自动交接后新会话是否接上了上一段的进度。
14. 做法 P：clone 后以 `claude --plugin-dir ~/claude-auto-handoff` 在一个**不那么关键**的长会话里启动；设 `AUTO_HANDOFF_TOKENS=60000` 降低阈值，省去填满 160k 的等待；正常干活直到面板出现，观察四步（写简报 → 清空 → 起新会话 → 新会话恢复）；打开 `~/.claude/state/auto-handoff/<session-id>.md` 逐条核对工作进展、决策、待验证假设、死路、最后请求及 Status、下一步；查 `~/.claude/state/auto-handoff/auto-handoff.log` 有无失败与 facts-only 回退；觉得结构不合适就改 `~/.claude/auto-handoff/brief.md`（不加 files/commits 段）和 `instructions.md`，再跑第二次比较。
15. 做法 Q：在一个真实的、有 git 仓库的长任务会话里安装插件，先用默认配置（`minutes`=50）。若不想等 50 分钟，可临时把 `minutes` 调小（原文未给出安全的短值，需你自己权衡；注意默认值是为匹配一小时缓存设计的）。做一段有明确目标和未完事项的工作，然后离开/停止交互，等待触发。检查 `docs/handoffs/` 下是否生成了 `<timestamp>-<slug>.md`，以及是否覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions。开一个新会话，只读这份 handoff，看能否在不重新浏览整段对话的情况下接着干。

试多久：

- 调研没有给出统一固定时长。建议先做小范围试用，跑一个真实任务，对照工具侧节省与实际任务结果，再决定是否推广到团队。
- 要验证会话连续性，至少覆盖一次会话压缩和一次跨会话继续；claude-mem 建议 1–2 天、3–5 次会话。
- blurt 只要「条目保留率高 + 端到端时间明显短于原方式」，就值得固定成一种输入惯例；如果条目需要大量返工或代码定位经常错，先退回参考。
- headroom 在长会话、重工具输出的场景下试；短对话、散文类负载不用试，收益接近零。
- mem0 / cognee 这类持久记忆，先用 1–2 周小范围试，重点看是否减少重复交代上下文，而不是只看向量库或图谱是否漂亮。
- planning-with-files 至少覆盖一次 /clear 或 compaction，再比较重新定位轮数。
- hivemind 先在一个仓库一个 agent 上试，确认捕获范围和 skillify 质量后再扩展团队。
- 做法 L 只在一个 repo 上跑一到两周。失败信号很明确：软链后任一工具的行为没有变化，说明链路没接上，此时先用一条一眼可验的规则确认「读到了没有」，再谈效果。
- 做法 M 原文没有给时长，只能按任务数：建议 5–10 个真实任务做 A/B；如果命令运行失败或不存在，降级为定期审查原则。
- 做法 N 原文没有给时长，也没给任何数值目标。判定标准只有一条组合：只有当「可工作轮数/时长增加」且「质量与返工次数没有变差」同时成立时，才值得把这几步固化成习惯；如果只是 `/context` 占比降低但返工明显变多，说明该阈值不适合你的任务类型。一次只改一项，每项至少跑一个同类真实任务再下结论。
- 做法 O：至少覆盖一次自动交接触发，以及一次空闲 55 分钟后的刷新（或 away handoff）流程。作者自标 experimental，先只在一个会话、一个项目上试，确认交接后能接上、distill 写出的 memory / rule 确实有用，再考虑常驻。
- 做法 P：原文没有给建议时长，只给了一次 80k 阈值的运行案例。先按 `AUTO_HANDOFF_TOKENS=60000` 在单个会话、单个项目上跑一次完整交接，核对简报与日志；确认新会话能接上、简报事实没写错，再考虑调回 `threshold` 让它在真实长会话里常驻。
- 做法 Q：原文没有给出时长或量化目标。先在一个有 git 仓库的真实长任务里跑一次完整交接，核对 `docs/handoffs/` 下的文件是否覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions；再开新会话只读 handoff，看能否接着干。确认后再考虑常驻，并注意 5 分钟缓存场景要调小 `minutes`。

## 常见坑

Context Mode：

- README 的 98% 节省、100x 说法、企业 logo 墙都是自述，缺少第三方验证。不要把营销数字当成已证事实。
- ELv2 许可对商用有限制，推广到团队前要确认合规。
- MCP-only 没有 hook、没有自动路由，模型可能不会主动用 ctx_* 工具。需要手动提示，或者上完整插件。
- 不传 --continue 时，上一次会话数据会立即删除。需要跨会话连续性时注意这个参数。
- Cursor 项目 .cursor/hooks.json 会覆盖 ~/.cursor/hooks.json；旧安装残留条目会重复触发，doctor 会告警。
- OpenCode / KiloCode 同时存在 plugin 与 mcp.context-mode 会导致注册 0 个 ctx_* 工具，需 context-mode upgrade 清掉遗留 MCP 条目。
- GitHub Copilot CLI 的 hook 调用全局 context-mode，旧版本 hook 不生效但不会阻塞工具（fail open），需 npm install -g context-mode@latest。
- 不要加激进的「简洁」提示词。Context Mode 不强制写作风格；作者引用 Moonshot AI 在 kimi-k2.5 上的 issue，认为激进的「简洁」提示词会损害编码/推理 benchmark。
- OpenClaw / Pi Agent 的原文在安装步骤处被截断，照做前先核对完整文档。

Quicksilver：

- 准确率不是无条件变好。基准里日志 triage 的 F1 从 54% 掉到 23%，安全审查 shortlist 的 F1 从 100% 掉到 89%；这类结果只能当 shortlist 用，由 Claude 复查被标 ? 的边界项。
- 主观或团队风格类标签不适合外包：commit 类型 perf vs refactor，Quicksilver 76% vs Claude 83%；编码了「没写下来的政策」的标签更差。
- 内容是发到第三方 API 的；--fast 只在「明显是针」的场景下有意义；超大扫描墙钟时间和 Claude 差不多——那里赢的是 token 和上下文，不是速度。
- 不要用它做写作、编辑、多步推理，以及任何 grep 能精确回答的问题。

claude-mem：

- ~10x token savings、「get up to 100% more usage from your plan」、「seamlessly preserves context」、自动运行的可靠性，都只是作者主张，README 没有给基准或对照实验。
- 存在商业引导：安装后要求浏览器登录、签发 memory key、托管记忆 CMEM Pro 免费 14 天，到期后若不订阅会「自动回落到你的 Anthropic plan」。
- README 末节推广 CMEM 代币并给出 BASE 合约地址，与记忆功能无技术关联，是需要警惕的噪音。
- Grok Bot 的 awareness 推送被明确标注为 pilot，且声明不写 profile.md / user-memory / project memory。
- 环境门槛：Node 20+、Bun、uv、Windows 上的 PATH 问题；npm install -g claude-mem 只装 SDK，是常见踩坑点。

headroom：

- 它是一个会接管你全部 LLM 流量的本地代理，别无条件全量铺开；收益随数据重复度剧烈变化，基准全部自报。
- headroom wrap 每次都要用它启动会话才生效；输出压缩默认关闭，需要显式开 HEADROOM_OUTPUT_SHAPER=1。
- headroom wrap 复用（而非新建）的代理，环境变量是启动时快照的，虽然 wrap 会热同步；共享代理上的覆盖是全局的，最后一个显式设置生效。
- 匿名 beacon 默认开启（可用 HEADROOM_BEACON=off / DO_NOT_TRACK=1 / --offline 关）；MCP 客户端不继承交互式 shell PATH，需要写绝对路径。
- 短对话、散文、已经密集的载荷收益很小甚至为零；沙箱里跑不了本地进程就用不了。

blurt：

- 仓库 40 stars、成熟度低，只有 README 自述，没有第三方评测、没有基准数据。
- 录制端以 macOS 为主，Windows 只有 Tk + ffmpeg，路线图里的 Windows 托盘应用尚未完成。
- 前提是能看到问题或用手机拍到；纯后端/无界面的问题需要另想办法。
- 质量依赖带视觉的强模型，弱模型产出会明显下降。
- 成本不完全看录制时长：除条目数外，还取决于当前对话已有多长（缓存读取 ~4–5M tokens）。
- 首次运行要下载约 240 MB 模型，或自备 Groq/OpenAI/DashScope key。
- 路线图里「浏览器捕获（把 console 报错和网络失败对齐到视频）」还没做，目前拿不到浏览器内部错误。
- 团队用法要求无仓库的同事手动下载、解压、首次右键打开。

mem0：

- 托管平台分数包含开源 SDK 不具备的专有优化；开源用户应期待方向相似的增益，而不是相同数字。
- 所有数字均为厂商自报，材料中没有第三方复现结果。
- 未涉及成本、数据隐私/合规、多租户隔离、记忆删除与纠错流程的具体做法。
- 新增的 ADD-only 抽取意味着记忆只累积不覆盖，原文未说明如何清理错误记忆，实际使用需要自行设计删除路径。
- 本文只拿到仓库 README，未包含 docs.mem0.ai 与论文正文，配置细节需以官方文档为准。

cognee：

- 单 Postgres 图存储目前是 demo 特性，生产版本是授权产品；仅建议在 demo 场景验证。
- 内置 GLiNER 抽取器是小模型流水线的 demo，更高精度、更广标签覆盖的生产版需要联系厂商。
- 无 LLM 时 recall 返回匹配到的源文本片段，不生成答案；要生成式回答需配置 LLM。
- Docker 用 --rm 会在退出时丢弃容器内数据，跨运行保存记忆需要命名卷，例如 cognee_storage:/cognee-storage。
- 不设 ENABLE_BACKEND_ACCESS_CONTROL=false 时 API 默认多租户，每个 /api/v1 调用都需要已认证用户；想保留鉴权则设 DEFAULT_USER_PASSWORD。
- BEAM 两个分数用了不同会话、不同摄取模型、不同检索选型流程，比较前必须先读方法论、模型、局限与复现说明。

planning-with-files：

- 效果数字全部来自项目自述，指向 docs/evals.md，但本次材料未给出该文件，无法核对测试方法、样本量与对照设置。
- 完成门槛依赖英文状态标记（grep -F 匹配 **Status:** complete），本地化或改写标记会静默失效。
- 自动恢复只读项目文件，不读 agent transcript；跨项目记录被隔离，会话重放需要显式 CLI 模式。
- 计划文件默认 gitignore、不自动归档，任务结束会被下一个任务覆盖——需要人工把有价值内容提升为交付物。
- 需要宿主支持 hook/插件，或至少支持 Agent Skills 标准的发现路径；没有 hook 的宿主拿不到「每回合注入」这个关键机制。
- 原文大量篇幅是版本发布日志，其中相当比例是路径、指针竞态、Windows/PowerShell 兼容等工程细节，说明该方案在跨平台与并发场景上有持续维护负担。

hivemind：

- 默认把全部会话 prompt 与工具输出写进团队共享 workspace；务必先用 .hivemind / .hivemind.local 限定捕获范围。
- Node >= 22.0.0；走 npm 路径时需要可写的 npm 全局前缀。
- Codex 首次启动必须选 2. Trust all and continue，否则 hooks 不运行；Claude Cowork 必须完全退出并重开 Claude Desktop。
- 语义检索默认关闭，因为本地嵌入守护进程约 600 MB；不开就静默降级成 ILIKE 词法检索。
- 原文在 rules 一节的命令块未结束，后续 goals 等命令只有目录提及、没有正文；照做前核对完整文档。
- 基准数据是作者自测，需自己复现。

共享 AGENTS.MD（做法 L，多 agent 共读规则）：

- 来源是二手转述：@oliviscusAI 转述 Peter Steinberger 的设置，不是作者本人的原始帖，也没给出开源仓库链接。细节可能在转述中失真。
- 原文在「Every repo」处被截断，逐个 repo 的处理方式不可知；具体路径、规则内容也都没有，必须自行按各工具当前文档补全，不要照抄示意路径。
- 软链路径写错时，agent 会静默地读不到规则，不会报错。原文没有提醒这一点。所以必须先用一条一眼可验的规则（例如规定回复开头写某句话）确认「读到了没有」，再谈效果。
- 整条推文没有任何关于「这样做之后结果变好了」的数据或案例，只有主张。推文指标 78 赞、18 转、16 回复只说明关注度，不是效果证据。
- 需要系统支持符号链接；Windows 需另想办法，原文没有给出 Windows 路径。
- 原文完全没有说明这套设置与 OpenClaw 本身是什么关系（是给 OpenClaw 用的，还是只给 Claude Code / Codex 用的），不能假设。
- 适用条件是本机确实同时使用多个支持同类指令文件约定的编码 agent；只用单一 agent 时这条做法的收益不成立。
- 本手册把它按「值得小范围试」而非「采纳」对待：不要一上来就铺到所有 repo。

CLAUDE.md / prompt-audit 审查（做法 M）：

- 来源是单条推文转述，且原文在“它会扫描你的技能、CLAUDE.md”处截断；命令是否存在、输出形式、是否自动改写、适用模型版本均未确认。
- “Anthropic 的 Lance Martin 分享了这个方法”属转述，未附原始出处，无法核验。
- “像‘逐步思考’和‘仔细检查你的工作’这样的旧习惯，在新模型上可能会增加不必要的拖累”没有任何对照实验、样本或指标支撑。
- 推文互动量 58 赞 / 2 转发 / 13 回复只说明传播度，不是效果证据。
- 不要预设它会自动改写文件；先备份、只记录、再小范围 A/B。
- 适用范围仅使用 Claude Code 并维护 CLAUDE.md / skills 的用户；不涉及其他模型或工具链。
- 如果命令运行失败或不存在，只保留“定期审查 CLAUDE.md 里的过时指令”这一原则，降级为 study。

上下文预算审计（做法 N）：

- 来源是单条推文，传播量低（50 赞 / 2 转发 / 7 回复），不能当作交叉验证。
- 原文全文没有一个数字、截图或对比实验，只有「限制总是在午饭前耗尽」这句体感描述。没有量化「浪费了多少」，也没有量化「降到 60% 能省多少」。
- 原文在最关键的第 3 步（`/mcp` 之后怎么做）被截断；第 2 步（60% 对应哪个设置项）也没写清。照做前先自己确认设置项位置，不要凭空拼命令。
- 第 4 步「怎么精简 CLAUDE.md」原文完全没给，属于缺口，不要替作者补写。
- 「每条消息都会重新发送 CLAUDE.md + 整个聊天记录 + 从不调用的 MCP 工具」这个机制判断方向与 LLM 上下文的工作方式一致，但具体占比需要自己用 `/context` 看。
- 未讨论的权衡：更早压缩意味着更频繁丢失上下文细节，可能换来更多重述和返工。原文默认「越早压缩越好」，这是需要自己验证的假设，不是结论。
- 适用条件是「CLAUDE.md 长 + MCP 服务器多且多数用不到 + 对配额敏感」；如果本来就只有一个短 CLAUDE.md、不接 MCP，这条几乎没有可操作空间。
- 一次只改一项，否则分不清是哪个起了作用；先砍 MCP 再动压缩阈值，最后才精简 CLAUDE.md。

ctx-handoff（做法 O，长会话自动交接）：

- 作者自标 experimental，构建在 Claude Code 的 early-access function-hooks API 上，开发与测试版本为 2.1.287；换版本可能直接不可用。
- 只作用于主会话，子代理回合被忽略。指望它管住子代理的上下文是不成立的。
- 5 分钟缓存用户（API key、Bedrock、Vertex，或订阅已进入 usage credits）不关刷新，会反复重写整个上下文；mod 不检测 TTL，必须手动 `/handoff refresh off`。
- 交接只暂扣文本，图片/附件必须在交接后重新粘贴，通知里会说明这一点。
- 阈值 600k 的合理性依据是「社区反馈和 Anthropic MRCR 数据提示 200k–300k 开始下滑」，属于间接引用，不是本项目测量。
- distill 写出的 rule 需要出现 2 次及以上才注入新会话，按出现次数排序——不要期待一次纠正就被记住；memory 与 rule 落在每个项目自己的 ctx-handoff.md，纯 Markdown，手改会被保留。
- 失败路径虽然可恢复（3 分钟未应答的交接 fork 被放弃、distill fork 8 分钟放弃、阈值交接失败后等 3 条用户消息或 10 分钟重试），但都要你去看 `/handoff` 才知道，不会主动弹错。
- 空闲保活 / away handoff 的实测数据，本次材料没有单独给出；作者也说明空闲缓存刷新等关键行为尚未实测。
- 与 Context Mode 同属上下文管理方向，但材料没有说明两者能否共用，只能并列参考。
- 与做法 P、做法 Q 同属自动交接，触发条件不同；材料同样没有说明能否共用；同一条会话先只加一个，不要叠加。

claude-auto-handoff（做法 P，替换内置 auto-compact）：

- 需要带 mods（function-hook plugins）的 Claude Code 构建，不一定人人可用。
- 仓库 39 stars、版本 0.8.x，属早期项目，自测为主，没有第三方评测或对照实验。
- 未计量工具输出是「可能偏高」的估计，真实大小有时低于阈值，所以交接可能比你预期更早（或更晚）触发；被拒绝的工具调用仍会在下一次请求或回合结束时触发交接。
- `viewer` 默认只在 Tailscale 网内可达，否则退到 127.0.0.1 仅本机；纯 SSH 终端通常不识别简报链接，需要 `FORCE_HYPERLINK=1` 或用状态栏链接。
- 与把会话管道化的 wrapper 不兼容（需 `DISABLE_AUTO_COMPACT`，但那会关掉该 mod，viewer 服务仍运行）。
- 简报有效性的判定标准很宽松（Haiku 回复含至少一个标题即算有效），否则回退 facts-only 简报，可能损失信息。
- 不要改仓库里的模板；改 `~/.claude/auto-handoff/` 下的副本，否则 `git pull` 会覆盖你的修改。想恢复默认就删掉副本，下次启动会重新复制。
- 不要往 `brief.md` 里加 files 和 commits 段，那两段由 mod 从 transcript 用代码添加；也不要删掉 `## Last Request from the User` 及其 `Status:` 行，`instructions.md` 里的 priority 开关依赖它们。
- Haiku 失败时用 facts-only 简报兜底，这本身就是一条降级路径；看到 facts-only 出现在日志或面板时，要人工核对简报。
- 连续交接有守卫：`maxConsecutiveHandoffs` 默认 2，超过会暂停等你输入；新会话刚启动就很大时也会被阻止立刻再次交接。
- 0.8.3 起简报必须写入真实数字，否则写 "unknown"；0.8.4 起不在 Handoff Numbers 里的 token 数字被标 `[unverified: not in Handoff Numbers]` 并记日志——看到这类标记就说明这份简报的数字不可信。
- 与做法 O、做法 Q 同属自动交接，材料没有说明能否共用，同一条会话先只加一个。

obie/auto-handoff（做法 Q，空闲自动落盘交接）：

- 来源是 obie/auto-handoff README 调研；仓库 35 stars、MIT、版本未在材料中突出，作者自测为主，没有第三方评测或对照实验。
- 默认 50 分钟依赖一小时缓存。若会话已降级到五分钟缓存（原文提到发生在 usage overage 时），需要把 `minutes` 调得小得多；插件无法判断会话用的是哪种缓存。
- 交接本身也是一个 turn，其中每个模型请求都付出一次对整段对话的缓存读，并且这个 turn 会让缓存再热一小时。
- 计时器活在 Claude Code 进程里，退出 Claude Code 即停止。
- 若模型调用了命令未预批准的工具，该 turn 会停在权限提示上直到你回来。自定义交接命令必须配 `allowed-tools` 或放宽权限模式。
- 基于 early access 的 function hooks 插件 API，可能在 Claude Code 版本间变化；原文在 Claude Code 2.1.289 上开发测试。
- 默认交接 skill 依赖 `date` 和 `git status`，因此需要在有 git 仓库的目录下工作。
- 默认只写 `docs/handoffs/<timestamp>-<slug>.md`，不做任何提交；不要把「自动提交」当作它的行为。
- 原文没有给出任何量化指标或对照实验，只主张长会话下重读「又慢又贵」；50 分钟默认值的合理性、交接带来的实际收益都未给数据支撑。
- 触发与取消规则要记住：空闲计时从主对话 turn 结束开始，任何新 turn 重置；subagent 结束不影响；每次离开只交接一次；`/clear` 取消待执行；休眠迟到则跳过（因为那时执行要付全价）。
- 与做法 O、做法 P 同属自动交接，触发条件不同；材料没有说明能否共用，同一条会话先只加一个，不要叠加。

## 证据与来源

本手册合并了十五份材料：mksglu/context-mode、UditAkhourii/quicksilver、AGIHunt/blurt、thedotmack/claude-mem、headroomlabs-ai/headroom、mem0ai/mem0、topoteretes/cognee、OthmanAdi/planning-with-files、activeloopai/hivemind、cablate/ctx-handoff-mod、alexknowshtml/claude-auto-handoff、obie/auto-handoff，一条转述 Peter Steinberger（OpenClaw 作者）开源其个人 agent 配置的推文（@oliviscusAI）、一条关于 CLAUDE.md / prompt-audit 的推文（@RoundtableSpace），以及一条关于「CLAUDE.md 正在吞噬你的令牌限制」的推文（@thegreatest_sv）。以下逐条标注依据和性质。

Context Mode（来自 README 与调研报告）：

- 「把工具输出挡在上下文之外」和「会话连续性用 SQLite/FTS5 检索」来自 README 对 Context Mode 四块组成的说明。README 称 315 KB 变 5.4 KB，减少 98%。
- 「用代码思考」来自 README 的范式：让模型写脚本分析、只 console.log() 结果，而不是把 50 个文件读进上下文。示例里的「47 × Read() = 700 KB 变 1 × ctx_execute() = 3.6 KB」是 README 说法，未经验证。
- 安装命令、hook 配置、各平台差异来自 README 原文；ctx_stats、ctx_doctor、状态栏指标来自 README 对工具和状态栏的说明。
- 「先在 Claude Code（或 Cursor）上用 MCP-only 做小范围试用，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广」来自调研报告的结论。
- 「README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证」「ELv2 许可对商用有限制」来自调研报告的结论。
- 仓库指标 24,371 stars（当日 +88）、Hacker News 排名 #1、570+ points 来自调研报告，属于当时的公开指标，不是效果证据。
- 调研报告指出：工具侧有上下文占用指标，但 README 没有给出任务结果质量（正确率、人工纠正次数、交付时间）的衡量方式，因此任务侧指标需要自己测。
- Moonshot AI 在 kimi-k2.5 上的 issue 是作者引用，用于支持「不要用激进简洁提示词」的主张，不是本手册的实测结论。

Quicksilver（来自 README 调研）：

- 有数据的部分：12 任务基准，其中 8 个用真实公开数据（一台超算的日志、Banking77、UCI SMS Spam、SST-2、Hono 代码库及其 git 历史、lodash）；每个任务由「按常规方式工作的 Claude Code subagent（Read/Grep/Glob）」和「Claude + Quicksilver」分别完成，都对照隐藏 ground truth 打分，指标是 F1 / accuracy / hit@k，基准可复现（bench/）。关键读数：日志 triage F1 54%→23%、Claude token −85%；噪声日志找针 100%→100%、−95%；工单路由 100%→99%、−82%；垃圾短信 97%→92%、−79%；情感 97%→96%、−85%；代码库发现（Hono 187 文件）100%→100%、−91%；安全审查 shortlist 100%→89%、−74%。
- 在线回执（扫描数、命中数、borderline、耗时、Jev 成本、Claude 未读 token）来自 README 的实际输出格式；README 称 Claude 侧 token 已扣除用对照任务测出的固定 subagent 开销，并把每次任务加载 SKILL.md、每条命令、Claude 读回的每个字节都计入成本。
- 中位省 82% token 这一说法来自调研报告的结论。
- 只是作者主张或未验证的：「Claude 会自动调用该 skill」的触发可靠性、--fast 快 10 倍、安全排除规则的实际覆盖面。

claude-mem（来自 README 调研）：

- 事实性内容：版本 13.28.0；Apache-2.0；Node >= 20；系统依赖 Bun/uv/SQLite 3；5 个生命周期 hook + 6 个 hook 脚本；4 个 MCP 工具；三层检索工作流；设置文件 ~/.claude-mem/settings.json；code--zh 已内置；各 IDE 安装参数；仓库指标 95,042 stars（来源 metrics）。
- 只是作者主张、没有实验支撑的：~10x token savings、「get up to 100% more usage from your plan」、「seamlessly preserves context」、自动运行的可靠性。README 没有基准测试、对照实验或用户案例数据。
- 托管记忆、14 天试用后回落 Anthropic plan、代币推广、Grok Bot pilot，均来自调研报告对 README 的描述。
- 本材料仅来自仓库 README，未包含代码、issue 或第三方评测。

headroom（来自 README 调研）：

- 事实性内容：安装三种方式、接入形态、wrap/unwrap 命令、内容类型分工（JSON → SmartCrusher、源码 → CodeCompressor/AST、散文 → Kompress-v2-base）、CCR 可逆检索、输出侧两个机制及生效路径、HEADROOM_OUTPUT_HOLDOUT 与 measured 的对应关系、遥测字段范围、MCP 绝对路径要求。
- headroom output-savings 的示例输出 Reduction: 31.7% (95% CI 27.7% … 35.7%) [estimated] 来自 README。
- 基准全部自报，README 提供了复现命令，但没有第三方验证。

blurt（来自 README 调研）：

- 给出数据的部分：两段真实会话的测量——7.0 分钟录制 / 2.8 分钟语音 / 9 条 / 本地转写 4 秒 / 录制到评审页 ~4 分钟 / ~142k 输入 19k 输出 token / 按 API 价格 ~$2；8.6 分钟录制 / 5.0 分钟语音 / 20 条 / 转写 5 秒 / ~5 分钟 / ~150k、~20k / ~$2。两段会话用 Claude Code + Opus 5.5 + 生产 Web 应用。
- 只是作者主张、没有对应数据的：「原来两天、现在 30 分钟」；「能挑对每一帧并框准位置」；「能把跳跃、自我纠正的口述拆干净」；「条目里包含可能是哪段代码负责」的准确率。
- 其他事实性内容：默认本地识别、视频不入模、模型约 240 MB、音视频同步误差一帧以内、SenseVoice 覆盖 5 种语言、Whisper 覆盖 99 种语言。
- 仓库 40 stars、macOS 为主、路线图项未完成，均来自调研报告的局限说明。

mem0（来自 README 调研）：

- 事实性内容：Apache 2.0，README 标注 66k+ stars；四种使用形态（Python/JS 库、自托管服务器、云托管平台、CLI）；Agent Skills 接入；2026 年 4 月版记忆算法五个变化；默认 OpenAI gpt-5-mini 与 text-embedding-3-small；混合检索建议 Qwen 600M 或同级别 embedding；CLI 四步安装与用户隔离命令；库方式代码模式；自托管 make bootstrap / docker compose；Agent Skills 安装命令；路线选择。
- 厂商自报数据：LoCoMo 71.4→92.5、LongMemEval 67.8→94.4、BEAM (1M) 64.1、BEAM (10M) 48.6，tokens 约 6.7K–7.0K，latency p50 约 0.88s–1.09s；LongMemEval assistant memory recall 98.2。
- 关键局限：上述分数反映托管平台，包含开源 SDK 不具备的专有优化；开源用户应期待方向相似增益，而不是相同数字。所有数字均为厂商自报，没有第三方复现。未涉及成本、隐私/合规、多租户隔离、记忆删除与纠错。ADD-only 只累积不覆盖，未说明清理错误记忆。本文只拿到 README，未包含 docs 与论文正文。

cognee（来自 README 调研）：

- 事实性内容：Python 3.10–3.14；可无 LLM key 本地运行，用本地 GLiNER 抽取与本地 embedding，CPU；四个核心操作 remember / recall / improve / forget；安装 uv pip install "cognee[gliner]"；quickstart.py 与 CLI 等价命令；cognee-cli demo；LLM_API_KEY；Claude Code 与 Codex 插件命令；UI 与 Docker 命令；默认端口 API 8000 / UI 3000 / MCP 8001；单 Postgres 图存储是 demo，生产版是授权产品。
- 自报基准：BEAM 100K tokens 报告分数 0.79；BEAM 10M tokens 0.67（探索性结果）。原文声明两个设置用了不同会话、不同摄取模型、不同检索选型流程，比较前必须先读方法论、模型、局限与复现说明；10M 分布式摄取尚有复现差距。
- 只是作者主张或未验证的：更高精度、更广标签覆盖的生产版需要联系厂商；原文未给出时间/事件/状态触发的具体规则或调度配置。

planning-with-files（来自 README 调研）：

- 事实性内容：三文件模式 task_plan.md / findings.md / progress.md；安装命令 npx skills add OthmanAdi/planning-with-files --skill planning-with-files -g；中文版 skill planning-with-files-zh；状态标记必须保持英文字面量；hook 生命周期 UserPromptSubmit 每回合注入、PostToolUse 写入提醒、Stop gate 完成门槛；原生插件宿主；PLAN_ID / PWF_PLAN_ROOT / PLANNING_DISABLED / PWF_FAST_PATH；--list；计划文件默认 gitignore、不自动归档。
- 自测数据：基准 96.7% 断言通过（29/30）、3/3 盲测 A/B 获胜、磁盘计划把重新定位从 13.3 回合降到 5.0 回合、hook 单次触发优化后 289ms（此前 2.0–2.4 秒）、优化后每提示与每工具调用约 0.3s；GitHub stars 27216；Trendshift 2026-01-06 全语言日榜第 1。
- 只是作者主张：以上效果数字全部来自项目自述，指向 docs/evals.md，但该文件未在本次材料中给出；宣传性表述如「The planning skill your agent cannot ignore」「3 out of 3 blind A/B wins」。
- 本次材料局限：提供的是仓库 README，且在 v3.11.0 发布日志处被截断，未能读到 benchmark 章节、命令参考与 docs/evals.md 的具体内容。

hivemind（来自 README 调研）：

- 事实性内容：Node >= 22.0.0；安装脚本、npm 安装、token 登录、按 assistant 安装命令、hivemind status；重启注意事项；语义检索默认关闭、本地嵌入约 600 MB；环境变量表；.hivemind / .hivemind.local 路由与优先级；skillify 命令与 SKILL.md 写入路径；自然语言搜索示例；docs 命令；rules 命令；卸载命令。
- 数据落在 Deeplake 的 SQL 表：sessions 存逐事件捕获，memory 存摘要与虚拟文件系统；支持 BYOC。
- 只是作者主张或未验证的：基准数据是作者自测；原文在 rules 一节的命令块未结束，后续 goals 等命令只有目录提及、没有正文。
- 关键局限：默认把全部会话 prompt 与工具输出写进团队共享 workspace；需要 Deeplake 账号 token；Codex 要 Trust all，Claude Cowork 要完全退出重开。

共享 AGENTS.MD 软链给多个 agent（来自 @oliviscusAI 的转述推文）：

- 有依据的只有机制本身：一台机器一个共享文件夹、所有 agent 都读它；一份 AGENTS.MD 集中存放规则；把它软链进 Claude Code 和 Codex，使两个工具读到同一套指令；「每个 repo 都要覆盖」这个方向。这几点来自原文对 Peter Steinberger 设置的描述。
- 原文在「Every repo」处被截断，之后内容缺失，完整设置不可知；具体路径与规则内容原文都没有给出。本手册中的 ln -s 命令是为说明机制写的示意，已明确标注「非原文给出的命令」。
- 二手来源：@oliviscusAI 转述而非 Peter Steinberger 原帖，细节可能在转述中失真；没有给出开源仓库链接。
- 数据/案例：只有一个「某人这么做」的描述，没有前后对比；推文指标 78 赞、18 转、16 回复只反映关注度，不是效果证据。
- 只是作者/转述者主张的：整条推文没有任何关于「这样做之后结果变好了」的数据或案例。
- 本手册为这条材料补的判定指标（规则生效次数、重复交代次数、行为不一致次数、维护成本从多处降到 1 处、返工次数）、「先用一眼可验的规则确认链路」的步骤、「只在一个 repo 上跑一到两周」的试用范围，都是基于原文机制推导出的验证方式，不是原文给出的内容——原文没有给出任何验证方式或改善数据。
- 与 OpenClaw 的关系原文完全没有说明，本手册不做假设。

CLAUDE.md / prompt-audit（来自 @RoundtableSpace 的转述推文）：

- 事实性内容：推文提出旧提示习惯（“逐步思考”“仔细检查你的工作”）在新模型上可能变成拖累；称 Anthropic 的 Lance Martin 给了修复方法：在 Claude Code 运行 `/claude-api prompt-audit`，扫描 skills 和 CLAUDE.md。原文在“它会扫描你的技能、CLAUDE.md”处截断；命令是否存在、输出形式、是否自动改写、适用哪些模型版本，材料里都没有交代。推文互动量 58 赞 / 2 转发 / 13 回复。
- 只是作者/转述者主张：“像‘逐步思考’和‘仔细检查你的工作’这样的旧习惯，在新模型上可能会增加不必要的拖累”没有任何对照实验、样本或指标支撑；“Anthropic 的 Lance Martin 分享了这个方法”属转述，未附原始出处，无法核验。
- 本手册为其补的最小试用方式和指标（备份、只记录不改动、A/B 5–10 个真实任务、一次通过率、人工纠正/追问次数、输出长度与 token 消耗、反向校验）是基于推文主张推导出的验证方式，不是原文给出的内容。
- 适用条件：仅对使用 Claude Code 并维护 CLAUDE.md / skills 的用户有意义；不涉及其他模型或工具链。如果命令运行失败或不存在，则本条可用部分只剩“定期审查 CLAUDE.md 里的过时指令”这一原则，此时应降级为 study。

上下文预算审计（来自 @thegreatest_sv 的推文「你的 CLAUDE.md 正在他妈的吞噬你的令牌限制」）：

- 事实性内容（机制层面）：推文主张用量/令牌限制「午饭前就耗尽」，是因为三样东西在每条消息里被反复重发——CLAUDE.md、完整聊天记录、以及从不调用的 MCP 工具定义；给出的应对路径是先用 `/context` 看清令牌具体花在哪里，再修掉这几处泄漏（降低压缩触发阈值、精简 MCP）。推文给出的命令入口只有 `/context`、`/compact`、`/mcp` 三个，正文在 `/mcp` 之后被截断。
- 原文给出的数据或案例：没有。全文没有一个数字、截图或对比实验，只有「限制总是在午饭前耗尽」这句体感描述。「`/compact` 设置为 60%，而不是 95%」只是一个结论性数字，原文没有说明它对应哪个设置项或命令参数，也没有说明是全局还是单会话设置。
- 只是作者主张的部分：「每条消息都会重新发送 CLAUDE.md + 整个聊天记录 + 从不调用的 MCP 工具」这个机制判断方向与 LLM 上下文的工作方式一致，但具体浪费多少、降到 60% 能省多少，原文完全没有量化。50 个赞、2 次转发、7 条回复，传播量低，不能当作交叉验证。
- 原文截断：最关键的第 3 步（`/mcp` 之后怎么做）缺失；「怎么精简 CLAUDE.md」这一步原文完全没有，属于缺口。
- 本手册为这条材料补的最小试用方式、观察指标（`/context` 三类来源占比、同配额下可工作轮数/时长）与反面指标（重述需求次数、返工/纠正次数），以及「一次只改一项、先砍用不到的 MCP、最后才动 CLAUDE.md」的顺序，都是基于原文机制推导出的验证方式，不是原文给出的内容——原文没有给出任何验证方式、指标或改善数据。
- 适用条件：使用 Claude Code；有较长 CLAUDE.md；接入了多个 MCP 服务器而其中多数用不到；对用量/配额敏感。如果本来就只有一个短 CLAUDE.md、不接 MCP，这条几乎没有可操作空间。

ctx-handoff（来自 cablate/ctx-handoff-mod README 调研）：

- 事实性内容：mod 做三件事（自动交接、空闲保活 / away handoff、distill）；默认阈值 600k 或窗口 80% 取较低者；常量表 THRESHOLD / WINDOW_RATIO / IDLE_MS / MAX_REFRESH / MIN_TOKENS；`/handoff` 子命令表；安装与 `CLAUDE_CODE_PLUGIN_DIRS` 配置；distill 的 JSONL action 与繁体中文（台湾）输出约定；notes 按项目归档（P1..P8）；失败与推迟机制；`claude plugin test` 94/94。
- 原文实测数据：用探针 mod 现场验证「从 mod 里 `/clear` 后 `prompt.submit` 可用」；对一个 102k token 对话做 fork，输入 102,523 token 中 102,003 从缓存读取（约 99.5%）；distill 在 476k 约 95 秒、800k 约 3 分钟（800k 时交接本身约 28 秒），因此交接在 60 秒后不再等它；2026-10-04 现场确认若干行为。
- 只是作者主张或间接引用：阈值 600k 的合理性依据是「社区报告和 Anthropic MRCR 数据提示 200k–300k 开始下滑」，属于间接引用，不是本项目测量；作者自标 experimental；空闲缓存刷新等关键行为尚未实测。
- 本手册为这条材料补的最小试用方式（先 `/handoff dry`、单会话小范围试）和判定指标（交接后重新定位轮数、同一纠正重复次数、交接成本），是基于原文机制推导出的验证方式，不是原文给出的内容。
- 与 Context Mode 的关系：同属上下文管理方向，但给出的材料没有说明两者的具体关系或能否共用，只能并列参考。

claude-auto-handoff（来自 alexknowshtml/claude-auto-handoff README 调研）：

- 事实性内容：mod 定位为替换内置 auto-compact；四步流程（写简报 → `/clear` → 起新会话 → 新会话恢复）；简报章节（进行中的工作、决策、待验证的假设、死路、最后请求及是否已被回答、下一步）；files/commits/issues 由代码从 transcript 提取；安装与 `--plugin-dir`、`CLAUDE_CODE_PLUGIN_DIRS`；配置表（threshold / maxConsecutiveHandoffs / briefTemplate / instructionsTemplate / ignoreFiles / viewer）；三个环境变量（`AUTO_HANDOFF_TOKENS`、`AUTO_HANDOFF_DISABLE`、`DISABLE_AUTO_COMPACT`）；模板复制到 `~/.claude/auto-handoff/` 与 priority 开关；状态栏脚本与 jq；运行机制五步（阈值、简报、清空并播种、面板、查看器）；简报路径 `~/.claude/state/auto-handoff/<session-id>.md`、pages 路径、日志路径；`claude plugin validate .` / `claude plugin test .`；0.8.3 起简报必须写入真实数字、0.8.4 起 `[unverified: not in Handoff Numbers]` 标记。
- 给出的数据/案例：一次在 Haiku 上的实际运行，阈值设 80k——mod 在阈值处拒绝一次读取、写简报、清空，新会话约 7 秒后回到工作、处于 31k（附 demo.gif / demo.mp4）；面板文案示例 `✓ handed off · 162k → 45k`；changelog 记录 0.5.0–0.8.4 的具体行为变更与修复（如被拒调用必定导致交接、第二个会话遇到端口被占用时安静退出、真实数字与 `[unverified]` 标记）。
- 只是作者主张：为何不用 auto-compact——「原地压缩无法控制保留什么，而交接简报结构固定、可编辑」；「files/commits/issues 来自 transcript 的代码提取，不依赖模型记忆」。这些是设计论断，原文没有对照实验或质量评估数据。
- 适用条件与局限：需要带 mods 的 Claude Code 构建（不一定人人可用）；仓库 39 stars、版本 0.8.x，属早期项目，自测为主；未计量工具输出是「可能偏高」的估计，真实大小有时低于阈值；`viewer` 默认只在 Tailscale 网内可达，否则退到 127.0.0.1 仅本机；与把会话管道化的 wrapper 不兼容（需 `DISABLE_AUTO_COMPACT`）；简报有效性的判定标准很宽松（含至少一个标题即算有效），否则回退 facts-only，可能损失信息。
- 本手册为这条材料补的最小试用方式（先 `AUTO_HANDOFF_TOKENS=60000` 单会话跑一次）、判定指标（新会话能否直接续上、简报事实准确率、`[unverified]` 标记）、与做法 O、做法 Q 的关系说明，都是基于原文机制推导出的验证方式，不是原文给出的内容——原文没有给出任务侧质量指标或与其他做法的对照。

obie/auto-handoff（来自 obie/auto-handoff README 调研）：

- 事实性内容：它是一个 Claude Code 插件；当你在会话中离开后，它在提示缓存失效前自动跑一次交接命令，把当前工作状态写成一个文件，供新会话恢复；安装命令 `/plugin marketplace add obie/auto-handoff`、`/plugin install auto-handoff@auto-handoff`；默认 `minutes`=50、默认 `command`=auto-handoff:handoff；默认交接命令 `/auto-handoff:handoff` 是插件自带 skill，也可手动运行；写 `docs/handoffs/<timestamp>-<slug>.md`，内容覆盖 goal、status、decisions、dead ends、files、verification commands、next steps、open questions；运行 `date` 和 `git status`，只写这一个文件，不做任何提交；通过 `allowed-tools` 预批准这些工具；触发与取消规则（空闲计时从主对话 turn 结束开始，任何新 turn 重置，subagent 结束不影响，`/clear` 取消待执行，休眠迟到跳过，每次离开只交接一次）；开发测试于 Claude Code 2.1.289；MIT 许可；仓库 35 stars。
- 给出的数据/案例：没有量化数据或对照实验。
- 只是作者主张、未给数据支撑的部分：缓存过期后重读「又慢又贵」；50 分钟默认值的合理性；交接带来的实际收益。
- 明确的局限：默认 50 分钟依赖一小时缓存，若会话降级到五分钟缓存（原文提到发生在 usage overage 时），需要把 `minutes` 调得小得多，插件无法判断会话用的是哪种缓存；交接本身也是一个 turn，其中每个模型请求都付出一次对整段对话的缓存读，并让缓存再热一小时；计时器活在 Claude Code 进程里，退出即停止；若模型调用了命令未预批准的工具，该 turn 会停在权限提示上直到你回来；基于 early access 的 function hooks 插件 API，可能在 Claude Code 版本间变化。
- 本手册为这条材料补的最小试用方式（有 git 仓库的长任务、默认 50 分钟或临时调小 `minutes`、检查 `docs/handoffs/`、开新会话只读 handoff 续接）、判定指标（只触发一次、新会话恢复时间与手动补充次数、交接 turn 成本对比、交接文档可用性、失败信号），是基于原文机制推导出的验证方式，不是原文给出的内容——原文没有给出任何量化指标或对照实验。
- 与做法 O、做法 P 的关系：三者都在做自动交接，但触发条件不同；材料没有说明能否共用；本手册建议同一条会话先只加一个。

## 依据的调研

- [mksglu/context-mode](../research/radar/2026-10-01/68-mksglu-context-mode.md)：值得一试，建议先在 Claude Code（或 Cursor）上做小范围试用：用 MCP-only 方式跑一个真实编码任务，对照 ctx_stats 的上下文节省与实际任务结果，再决定是否推广到团队。理由是它直指“工具输出塞满上下文 + 会话压缩后失忆”这两个具体痛点，安装与回退成本低；但 README 的 98% 节省数字、100x 说法和企业 logo 墙均为自述，缺少第三方验证，且 ELv2 许可对商用有限制。
- [UditAkhourii/quicksilver](../research/radar/2026-10-01/15-uditakhourii-quicksilver.md)：值得一试，建议小范围试：按 README 给出的命令把 Quicksilver 装进 Claude Code，让它把「读很多、只判断一点」的批量筛选/分类交给 Jev，Claude 只处理被标 `?` 的边界项；理由是安装与使用步骤可直接照做、12 项可复现基准显示中位省 82% token，但部分任务准确率明显下降且依赖第三方 API，需自己用少量标注核对后才敢扩大使用。
- [AGIHunt/blurt](../research/radar/2026-10-01/26-agihunt-blurt.md)：值得一试，把「录屏+口述」当作给编码 agent 补上下文和反馈的固定通道来试：按 README 装好 skill，在一个真实项目里录一段 5–10 分钟走查，让 agent 拆条目、挑关键帧、写复现步骤，再用评审页逐条取舍。理由是这套流程有可照做的安装命令、快捷键、模型选择和实测成本，属于可落地的做法；但仓库仅 40 stars、以 macOS 为主、除 README 自述外没有可核实的评测，故先小范围验证而非直接采纳。
- [thedotmack/claude-mem](../research/radar/2026-10-01/522-thedotmack-claude-mem.md)：值得一试，可以在 Claude Code 上小范围试用：用 `npx claude-mem install` 装好后重启，让它在真实项目里自动捕获并注入跨会话记忆，再用检索命中率和重复交代背景的次数判断是否值得长期留下；理由是 README 给出了可直接照做的安装、配置和检索步骤，但效果数据（如 ~10x token 节省）只有作者主张，且夹带托管记忆与代币推广，需自行验证。
- [headroomlabs-ai/headroom](../research/radar/2026-10-01/528-headroomlabs-ai-headroom.md)：值得一试，建议在长会话、重工具输出的编码 agent 上小范围试用：装好后用 `headroom wrap <agent>` 包一层，先用 `headroom doctor` / `headroom savings` 读自己流量上的省量，并开 `HEADROOM_OUTPUT_HOLDOUT=0.1` 拿实测的输出节省，再决定是否长期保留。理由是原文给出了可直接照抄的安装、接入、量测、复现基准和回滚（`headroom unwrap`）步骤，但它是一个会接管你全部 LLM 流量的本地代理，收益随数据重复度剧烈变化、基准全部自报，不适合无条件全量铺开。
- [mem0ai/mem0](../research/radar/2026-10-01/547-mem0ai-mem0.md)：值得一试，按 README 的 CLI 四步（安装→agent 注册→add→search）先跑通通路，再把 search+add 嵌进一个固定 user_id 的重复性任务做 1–2 周小范围试；理由是原文给出了可直接复制的安装、CLI、SDK、自托管与 Agent Skills 接入步骤，但性能数字是托管平台自报、开源版明确无法复现同等数字，还不足以作为手册标准做法直接采用。
- [topoteretes/cognee](../research/radar/2026-10-01/570-topoteretes-cognee.md)：值得一试，可以小范围试：按 README 的 Python/CLI 快速上手路径先跑通「跨会话长期记忆」，再通过 Claude Code 插件或 MCP 接进现有 agent 做 1–2 周对照试用，判断能否减少重复交代上下文。理由：原文给出了可直接复制的安装、代码与插件命令，属于可照做的具体流程；但其效果数据为自报基准，且单 Postgres 图存储与本地 GLiNER 抽取器均明确标注为 demo，尚不足以直接写入手册作为推荐配置。
- [OthmanAdi/planning-with-files](../research/radar/2026-10-01/571-othmanadi-planning-with-files.md)：值得一试，先用一条安装命令把 planning-with-files 装进 Claude Code 或 Codex 这类支持 hook 的宿主，在同一个长时编码任务上做 A/B：让智能体把 phases 写进 task_plan.md 并靠 hook 每轮重注入，观察 /clear 或 compaction 后的重新定位轮数是否下降。理由是原文给出了可照做的安装命令、三文件模式与 hook 生命周期，但这些效果数字全部来自项目自测，需要自己复现验证。
- [activeloopai/hivemind](../research/radar/2026-10-01/604-activeloopai-hivemind.md)：值得一试，建议先在一个仓库、一个 agent（如 Claude Code）上小范围试：按 README 的安装命令接入、用 `.hivemind` 限定捕获范围、再看 skillify 是否真的产出被复用的 SKILL.md；它给出了可直接照做的安装/配置/触发步骤，但基准数据是作者自测，且默认把全部会话 prompt 与工具输出写进团队共享 workspace。
- [@oliviscusAI: Peter Steinberger, the creator of OpenClaw, open-sourced his entire agent setup.](../research/radar/2026-10-02/708-peter-steinberger-the-creator-of-openclaw-open-sou.md)：值得一试，值得小范围试：在一台同时使用 Claude Code 和 Codex 的机器上，把 agent 规则集中成一份 AGENTS.MD，软链给两个工具共读，先验证同一条规则能否被两边自动遵守；给 try 而非 adopt，是因为原文只是第三方转述、且在“Every repo”处截断，仓库链接、具体路径和规则内容都没有，需自行按各工具文档补全。
- [@RoundtableSpace: 你的 CLAUDE.md 实际上可能会让 Opus 5.5 变得更糟。](../research/radar/2026-10-04/1053-claude-md-opus-5-5.md)：值得一试，先在 Claude Code 里对现有 CLAUDE.md 与 skills 跑一遍 `/claude-api prompt-audit`，再逐条评估“逐步思考”“仔细检查你的工作”这类旧指令是否该删；因为推文主张这类旧习惯在新模型上反而增加拖累，且给出了一个可直接执行的审查命令，但原文被截断、命令行为与判读方式均未说明，只能小范围试。
- [@thegreatest_sv: 你的 CLAUDE.md 正在他妈的吞噬你的令牌限制。](../research/radar/2026-10-04/1081-claude-md.md)：值得一试，先在 Claude Code 会话里运行 /context 摸清 token 去向，然后一次只改一项——把自动压缩阈值从 95% 降到 60%、关掉从不调用的 MCP 服务器——再跑 /context 对比前后。原文只给了三个方向性命令、末尾还被截断，且没有任何数据支撑，所以适合小范围试而不是直接写进手册。
- [cablate/ctx-handoff-mod](../research/radar/2026-10-04/1185-cablate-ctx-handoff-mod.md)：值得一试，可以直接照 README 的 Quick start 在单个 Claude Code 会话里小范围试：clone 后以 --plugin-dir 加载、跑 /handoff 验证状态，先用 /handoff dry 观察交接成本，再在长任务上启用自动交接与 distill。理由是原文给出了可复制的安装/配置/命令与明确的触发条件，但作者自己标注为 experimental、依赖早期 function-hooks API，且空闲缓存刷新等关键行为尚未实测，所以只建议试不建议直接采用。
- [alexknowshtml/claude-auto-handoff](../research/radar/2026-10-05/1225-alexknowshtml-claude-auto-handoff.md)：值得一试，建议小范围试：先按 README 的安装步骤在支持 mods 的 Claude Code 构建上装好，用 AUTO_HANDOFF_TOKENS=60000 在一个长会话里跑一次交接，检查生成的简报是否准确、新会话能否续接；理由是它给出了完整可照做的安装、配置与模板改法，但依赖尚未普及的 mods 构建、版本仅 0.8.x 且只有作者自测数据，不足以直接 adopt。
- [obie/auto-handoff](../research/radar/2026-10-05/1315-obie-auto-handoff.md)：值得一试，可以在 Claude Code 长会话里小范围试装 auto-handoff，用默认 50 分钟空闲触发 `/auto-handoff:handoff` 把工作状态落成 `docs/handoffs/` 下的交接文件，让新会话能续接；它装法、配置、行为边界都写得很具体，但依赖早期访问的 hooks API、只有作者主张的成本收益，且无法识别会话用的是哪种缓存，所以先试不直接采用。
