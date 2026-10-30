# mathew5612/mycel

- 结论：**值得一试**。值得小范围试：把 Mycel 克隆到项目外启动，用 Claude Code 插件把一张“活的项目地图”接成编码智能体的共享上下文，同时盯住 check/health/watch 这条维护闭环；理由是 README 给出的命令、各智能体接入方式和图上操作流程完整可照做，但项目仅 0.22、约 30 stars、无任何量化证据，收益必须自己量出来再决定是否写进手册。
- 原文：https://github.com/mathew5612/mycel
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T12:01:26.847Z

## 是什么

Mycel 是一个本地运行的 Web 应用（单个 Node.js 进程，无依赖、无构建步骤、无云、无 API Key），为人和 AI 编码智能体维护同一份“活的项目地图”：块（block）、便签、块内嵌套的子图、块之间的连线。智能体连上项目文件夹后自己读代码并把地图画出来——顶层是产品的各个部分，每个部分内部用平实语言写它怎么运作，再往下是技术细节和代码。地图之后持续存活：智能体显示当前在做什么、在改哪些块；文件变动的块被标为“可能过时”；测试跑起来时 check 把块染绿或染红；你在图上做的修改会在智能体下一步之前送达它。界面英文，可切俄文；地图本身用什么语言由你和智能体决定。项目处于 0.22 早期阶段，MIT 许可。

## 具体做法

前提：Node.js 22 或更新；一个你想接入的项目文件夹；一个受支持的智能体（Claude Code 的集成最完整）；Mycel 建议克隆在项目**外**（如 `~/mycel`），一个 Mycel 服务本机所有项目。

1. 安装并启动 Mycel

```bash
git clone https://github.com/mathew5612/mycel.git
cd mycel
node mycel.mjs open
```

后台启动并打开 http://127.0.0.1:4317。Windows 可双击 `Mycel.cmd`；macOS 先 `chmod +x Mycel.command` 再双击。若已有旧版本在跑同一份数据，`open` 会用新版本重启，`.mycel/` 里的地图不动；升级用 `git pull` 后再次 `node mycel.mjs open`。

2. 让智能体自举（在你的**项目文件夹**里执行）

```text
Read the Mycel guide and follow it: curl -s http://127.0.0.1:4317/agent
```

Windows PowerShell 把 `curl` 换成 `curl.exe`。智能体会连接文件夹、完成自我配置（Claude Code 下会安装 Mycel 插件并要求你开一个新会话），然后开始建图。对话始终在智能体自己的窗口里进行，Mycel 没有聊天功能。Mycel 首页顶部的 “For your agent” 一行可直接复制。

3. 按智能体类型选接入方式

| 智能体 | 接入方式 |
| --- | --- |
| Claude Code | `node <mycel>/mycel.mjs plugin --install`：MCP 工具、追踪被编辑文件的 hooks、把智能体任务列表显示为地图下方进度条、会话概览 |
| Codex、Cursor、Gemini / Antigravity、VS Code、Windsurf、Cline、Claude Desktop | `node <mycel>/mycel.mjs plugin --agent <name>` 打印 MCP 条目及应写入的位置 |
| 本地模型（Ollama、LM Studio、llama.cpp、vLLM） | `node <mycel>/mycel.mjs chat`：内置 agent，具备全部 Mycel 工具，对项目文件只读；客户端配置用 `plugin --agent lmstudio\|continue\|goose\|opencode\|jan\|openwebui` |
| 其他 | 在项目文件夹里跑 CLI（`node <mycel>/mycel.mjs <command>`）、函数定义（`mycel tools --format openai\|mcp`、`mycel call <tool> '<json>'`）或 HTTP API |

4. 智能体侧可用的具体命令（在项目文件夹内执行）

```bash
node mycel.mjs init              # 连接当前文件夹（同一文件夹=同一项目=同一张图）
node mycel.mjs context --brief   # 整张图导出为 Markdown，外加用户选了什么、做了什么
node mycel.mjs build map.json    # 按结构逐步画图，自动布局
node mycel.mjs apply ops.json    # 基于你读到的 revision 批量提交操作
node mycel.mjs wait              # 阻塞，直到人在 Mycel 里操作或别人改了图
node mycel.mjs doing 'reading server.mjs' --progress 40
node mycel.mjs mark cart passed  # plan | testing | passed | failed | none
node mycel.mjs check             # 跑各块配置的测试命令并实时染色
node mycel.mjs watch             # 文件一变就把对应块标为可能过时（不论谁改的）
node mycel.mjs health            # red/outdated/unchecked/planned；TODO 与疑似密钥字符串
```

全部命令见 `node mycel.mjs --help`。

5. 图上的人机协作规范

- 建：空白处右键建块或便签；在块上右键建它的子块。
- 连：从块的任一边缘拖到另一个块（Alt+拖可从块内任意位置起拖）。
- 导航：双击带子图的块进入，Esc 返回上层；底部滑杆按四档折叠（concept / mechanics / technique / code）。
- 交棒：点 “Finish edits” 把你所有改动作为一个事件整体发给智能体。
- 提案：智能体的建议以虚线高亮显示，可 Accept / Reject；你自己新增的块会成为智能体的计划。
- 复盘：History 列最近 200 条改动（含作者与原因）；Health 高亮需要处理的项。
- 指令要用“块”而不是“文件”：选中一个块，对它说“do this here”，智能体能看到你的选择。

6. 跨虚拟机（可选）

主机上 `node mycel.mjs remote on`；VM 内智能体执行 `curl -fsS http://<host address>:4317/install.sh | sh`（必要时装 Node.js 和一份 Mycel，然后要一个 4 位码申请接入）；你核对 4 位码后在 Mycel 里点 Allow，每台机器一个可随时吊销的 key。默认只在 `127.0.0.1` 监听，VM 访问不开不可用；经 API 写入需要 `.mycel/token` 里的令牌。

## 对应的研究问题

**1. 能力发现**：README 主张智能体能自己连文件夹、读代码、画出并持续维护项目地图；`check` 能按块跑测试命令并染色；`health` 能扫出 TODO 和疑似密钥字符串并只报文件与行号。这属于平时不会想到交给 AI 的“项目理解与文档维护”工作。注意：均为作者的设计主张，无实测。

**2. 任务匹配**：连接表把“什么智能体走什么接入面”写清楚了——Claude Code 走插件（MCP + hooks + 进度条 + 会话概览）；Cursor/Cline/goose/OpenCode/Codex/Gemini/VS Code/Windsurf/Claude Desktop 走 `plugin --agent <name>` 打印 MCP 条目；本地模型走 `mycel chat` 内置 agent 且对项目文件只读；其余走 CLI / OpenAI 或 MCP 函数定义 / HTTP API。四档层级本身也是一种匹配：concept 与 mechanics 面向不写代码的人，technique 与 code 面向开发者。

**3. 条件供给**：给出的条件相当具体——Node 22+、Mycel 在本机运行、把 `/agent` 指南 URL 交给智能体、注册 MCP 与追踪被编辑文件的 hooks、用 `context --brief` 把整张图连同“用户选中了什么、做了什么”以 Markdown 形式喂给智能体、选中块后用“do this here”下达指令、API 写入需 `.mycel/token`、本地模型 agent 对项目文件只读、扫描跳过 `.env`/密钥/证书。

**4. 主动推进**：有三类触发源。一是阻塞等待：`wait` 一直挂着，直到人在 Mycel 里操作或他人改图。二是文件变更事件：hooks 追踪被编辑文件，`watch` 把受影响的块标为可能过时，`check` 按块跑测试命令。三是状态：`health` 汇总 red / outdated / unchecked / planned；你的地图编辑会在智能体下一步之前送达；“Finish edits” 把一批改动作为一个事件推送。

**5. 效果验证**：有验证机制，但没有效果指标。机制层面：`check` 的绿/红、`health` 的四类状态与 TODO/密钥扫描、History 200 条带作者与原因的审计轨迹、提案的 accept/reject。README 没有给出任何前后对比数据、准确率或案例。

## 与已有做法的关系

- **Claude Code（adopt）**：Mycel 为它提供了专门的 `node <mycel>/mycel.mjs plugin --install`——装 MCP 工具、追踪被改文件的 hooks、把任务列表显示为地图下方进度条、给会话概览。属于在已采用的 Claude Code 之上叠加“共享项目地图”这一层上下文供给，不替代原有工作流。
- **Cline / Cursor / goose / OpenCode（均为 watch）**：都在 `plugin --agent <name>` 的支持列表里（含 cursor、cline、goose、opencode，以及 lmstudio、continue、jan、openwebui），接入方式是打印 MCP 条目并说明写到哪儿。Mycel 相当于给这几个尚在观察的工具补了一个可选的“项目上下文来源”。
- 清单中没有“项目地图 / 上下文文件维护”这类条目，Mycel 更像一个可本地部署的实现载体，而不是与现有条目重复的做法。

## 证据与局限

**能核实的**：命令清单、各智能体接入表、端口与地址（127.0.0.1:4317）、Node 22+ 要求、`.mycel/token` 写令牌、MIT 许可、测试命令 `node --test test/*.test.mjs`（UI 测试驱动 headless Chrome，找不到就跳过，可用 `MYCEL_CHROME` 指定路径；无构建步骤）。

**只是作者主张、未经核验的**：“地图保持存活”“智能体边看你边画图”“四档层级足以表达一个项目”“不往任何地方发送数据”（README 自称唯一出站请求是 `mycel chat` 调你指定的模型服务，以及 VM 安装脚本从 nodejs.org 下载 Node 并校验 SHA-256）、“不写入你的项目”。截图存在但内容无法核验。

**局限**：本次只有仓库 README，未看到 `docs/reference.md`、`src/agent-guide.md` 正文，也没有实际跑过；项目 0.22 早期、约 30 stars、单一作者，无生产使用案例；没有任何量化收益；地图质量取决于所用智能体能力与代码库规模，大仓库下 `context --brief` 的体量与 token 成本无数据；界面仅 EN/RU；README 说数据在“程序旁的 `.mycel/`”，同时又有 `init` 连接当前文件夹、令牌在 `.mycel/token`，两者关系需查 reference.md 确认后再决定把它放在哪、是否需要纳入版本控制。

**适用条件**：本机可跑 Node 22、项目在本地文件系统、愿意让智能体读代码；多人协作、云端或远程团队场景不明确。

## 怎么试、怎么验证

**最小试用（约半天启动，观察一到两周）**

1. 选一个 2 万至 10 万行、你自己有测试命令的中型仓库。
2. 把 Mycel 克隆到项目外，跑 `node mycel.mjs start`；在项目里对 Claude Code 执行 `plugin --install`，开新会话，让它按 `/agent` 指南建图，记录耗时与你被迫纠正的次数。
3. 把地图做到 concept + mechanics 两档就能讲清“这个产品有哪几部分、各自怎么运作”；给 3–5 个关键块配上测试命令，跑 `node mycel.mjs check`。
4. 之后正常开发一到两周，每天记录 `health` 里 red / outdated / unchecked / planned 的数量。

**判断有没有改善的指标**

- **项目理解成本（主指标）**：让一个没看过该项目的人或一个全新会话的智能体，只凭 `context --brief` 与地图回答同一组 10 个问题；对照组只给 README。比较正确率与用时。
- **上下文有效性**：用“选中块 + do this here”下达的任务，一次就改对文件的比例，对比只用文字描述任务的基线。
- **维护成本 vs 收益**：一周内被 `watch` 标为过时、由你手工修正的块数；如果修正成本高于节省的沟通成本，就退回 study，不写进手册。
- **验证闭环**：check 的通过率变化、失败的块被及时发现的次数。
- **上下文体量**：`context --brief` 输出的字符/token 数，以及有多少块真的被智能体引用或改动。
- **反向指标**：智能体被过时块误导的次数（改错文件、引用已删除的概念）。出现两次以上就说明先得治地图过期，再谈把它当上下文。

**停止条件**：两周后若地图维护成本明显大于收益，或 `context --brief` 的体积在目标代码库规模下已不可用，则降级为 study。
