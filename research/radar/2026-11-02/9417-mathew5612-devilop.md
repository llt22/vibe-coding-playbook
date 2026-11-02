# mathew5612/devilop

- 结论：**值得一试**。把 devilop 当作“给编码代理供结构与界面上下文”的交接层来小范围试：用一张可分级阅读的产品地图承载上下文，用 Requests/Finish edits 把界面改动打包回当前对话，并用 check/health/watch 把“是否真做完”变成可查状态；理由是命令与客户端差异都写得很具体、可直接照做，但版本仅 0.26.1（40 stars），除 Codex 同对话投递外多数投递路径作者自认未验证，暂不宜直接采用。
- 原文：https://github.com/mathew5612/devilop
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T00:38:24.756Z

## 是什么

devilop 是一个本地运行的产品开发应用（Node.js 22+，单进程，无运行时依赖、无构建步骤、无需云账号），核心工作区是一张“地图”：块、笔记、嵌套子图与连线表达产品结构和用户流程。底部滑块在四个层级间切换：*Concept*、*Mechanics*（自然语言）、*Technical*（源码引用）、*Code*（用自然语言描述每个方法的具体行为）。

编码代理（Codex、Claude Code、Cursor、Gemini、本地模型等）连接项目文件夹，读源码并在人观看时建图；人可以选中块说“在这里做这个”，代理能看到选区。带 app binding 的块能打开真实本地应用页面/区域/状态，人在那里改文本、外观或同级顺序形成草稿，再由“Finish edits”打包成不可变包投递给**当前已有的对话**。数据存放在项目下 `.devilop/`，服务只听 `127.0.0.1`。

## 具体做法

**前提**：Node.js 22+；一个已有项目文件夹；一个已安装并登录的编码代理客户端（Codex / Claude Code / Cursor 等）。以下命令均在**项目文件夹**内执行，`<devilop>` 指 devilop 安装目录。

1. 检查 Node 版本：
```bash
node --version
```

2. 启动 devilop（源码检出方式；官网另有版本化安装包，README 称公开仓库可能落后于该包）：
```bash
git clone https://github.com/mathew5612/mycel.git devilop
cd devilop
node devilop.mjs open
```
启动后在后台运行并打开 http://127.0.0.1:4317。Windows 可双击 `devilop.cmd`；macOS 双击 `devilop.command`（先 `chmod +x devilop.command`）。

3. 在**你的项目文件夹**里打开代理，给它这一行（“Connect project”会连同后续指令一起复制）：
```text
Read the devilop guide and follow it: curl -s http://127.0.0.1:4317/agent
```
Windows PowerShell 把 `curl` 换成 `curl.exe`。代理在同一次对话里连上文件夹并建图，用 CLI 或已有 MCP 工具，安静完成安装与浏览器检查。

4. 建立“回传到当前对话”的通道（不同客户端方式不同，不能靠通用 MCP 连接代替）：
```bash
node <devilop>/devilop.mjs current connect --client codex
```
Claude Code 与 Cursor 用其 MCP 连接上的 `devilop_connect`。Claude 还需会话级 channel 同意与组织策略许可；若原会话启动时未支持 channel，只能交互式恢复该确切会话：
```bash
claude --resume <exact-session-id> --dangerously-load-development-channels server:devilop
```
不要为绕过同意另开第二个对话。

5. 连接项目并建图（代理侧常用命令）：
```bash
node devilop.mjs init              # 连接当前文件夹
node devilop.mjs context --brief   # 整张地图转 Markdown，附人选了什么、做了什么
node devilop.mjs build map.json    # 逐步画结构，自动布局
node devilop.mjs apply ops.json    # 在读取到的 revision 之上批量操作
node devilop.mjs wait              # 阻塞直到人在 devilop 里操作或地图被他人修改
```

6. 手工编辑地图：空白处右键建块/笔记，块上右键建子块；从块任意边缘拖连线（Alt+拖可从块内任意位置起）；双击带子图的块下钻，Esc 返回；底部滑块按层级折叠地图。

7. 绑定并编辑真实界面：选中带 app binding 的块，视图显示相关页面、区域与预置状态（不是整个应用的通用浏览器）；切到 Edit，选元素改文本、受支持的外观或同级顺序。草稿留在地图上，直到 Finish edits 才交给代理应用到源码并检查。界面尚未建好的块保持 `planned`。

8. 用 Requests 字段把需求写进批次：在块的 Requests 里写期望行为、约束与示例，Save 后留在批次中直到 Finish edits；你后续的新编辑与 Requests 不会被代理覆盖。

9. Finish edits 交付：保存为一个版本化不可变包，唤醒已连接的代理（忙则排队到下一轮）。你可以立刻继续编辑。代理若提出改动，以虚线高亮覆盖层显示，由你 Accept / Reject。

10. 让代理汇报进度、跑检查（这是“可验证”的关键）：
```bash
node devilop.mjs doing 'reading server.mjs' --progress 40
node devilop.mjs mark cart passed   # plan | testing | passed | failed | none
node devilop.mjs check              # 跑各块的测试命令并实时着色
node devilop.mjs watch              # 文件被谁改了就把对应块标记为可能过期
node devilop.mjs health             # failed / outdated / unchecked / planned，以及 TODO 和疑似密钥
node devilop.mjs current status     # 真实投递与执行状态
```

11. 可选：独立受管代理（不是你当前对话，需要显式选择），在已连接的项目文件夹内保持进程运行：
```bash
node <devilop>/devilop.mjs run --client codex --bind
# 装了 ACP 版 CLI 的 Cursor：
node <devilop>/devilop.mjs run --client cursor --bind
```
客户端须已安装并登录；不在 PATH 上加 `--executable <path>`；其他 ACP 客户端用 `--client acp --executable <path> --args '["acp"]'`。不带 `--bind` 需先在头像窗口选中已注册会话。Ctrl+C 停止。

12. 其他客户端接入：
```bash
node <devilop>/devilop.mjs setup --agent codex|claude|cursor --install --hooks  # 合并项目本地 MCP 设置与可选 hooks
node <devilop>/devilop.mjs setup --agent <name>   # Gemini/Antigravity、VS Code、Windsurf、Cline、goose、opencode、lmstudio、continue、jan、openwebui 等打印 MCP 条目及位置
node <devilop>/devilop.mjs chat                   # 内置只读地图助手，供 Ollama/LM Studio/llama.cpp/vLLM 等本地模型
node devilop tools --format openai|mcp            # 取出工具定义
node devilop call <tool> '<json>'                  # 直接调工具
```
`chat` 只读项目文件，当前对话执行、批次变更、长时间等待类工具会被过滤掉，**不做源码修改**。

13. 虚拟机（VMware/VirtualBox/Hyper-V/WSL）里的代理用主机上的 devilop：主机执行 `node devilop.mjs remote on`；VM 内执行
```bash
curl -fsS http://<host address>:4317/install.sh | sh
```
会按需装 Node.js 与一份 devilop，并申请 4 位码；主机核对后在 devilop 里点 Allow。每台机器一个可随时吊销的 key。

14. 自测与更新：`node --test test/*.test.mjs`（UI 测试需 headless Chrome，找不到会跳过，可用 `DEVILOP_CHROME` 指定）；源码检出用 `git pull` 后 `node devilop.mjs open`，旧版本同数据运行时会自动重启，`.devilop/` 不受影响。

**安全前提**：API 写入需 `.devilop/token`；VM 访问默认关闭，仅在虚拟网络地址上、按机器 key 授权后可用；扫描与本地助手跳过 `.env`、密钥与证书，风险报告只显示文件与行号。

## 对应的研究问题

**能力发现（还有哪些活可以交给 AI）**
- 让代理读源码并自动产出“产品如何运作”的四层解释（概念/机制/技术位置/方法行为），这是通常不会派给代理的结构梳理工作。
- 把“改一处界面文案或同级顺序”这类原本必须人进 IDE 的微改动，改成在地图对应的真实页面上改草稿、由代理落到源码并跑检查。
- 主动巡检：`health` 把过期描述、缺失检查、失败测试、遗留 `TODO`、疑似密钥字符串一起标出来，属于可交给代理持续做的脏活。

**任务匹配（什么工作配什么模型/工具/协作方式）**
- 原文给了明确的客户端能力差异表：Codex 走原生共享队列投递到**确切已存在线程**，需已加载线程，可能约十秒，queued 不等于 received；Claude Code 走 opt-in MCP channel 通知同一运行中的 CLI 会话，需兼容版本与显式同意；Cursor 靠有界 receive 调用，调用结束即不在监听，**空闲 IDE 聊天无法外部投递**。
- 本地模型（Ollama/LM Studio/llama.cpp/vLLM）配 `chat` 只读地图助手，明确不执行源码改动——即“小模型做理解、不做改码”。
- 无受支持执行适配器的客户端仍可用 `batches` 读同一批包，即只读协作。

**条件供给（需要给什么信息、工具、权限、反馈）**
- 信息：项目文件夹、`context --brief` 输出的整图 Markdown 加“人选了什么、做了什么”、块上的 Requests（期望行为/约束/示例）。
- 工具：Node 22+、项目本地 MCP 配置（`setup --agent ... --install --hooks`，合并而不覆盖既有设置）、可选 hooks、app binding 及代理添加的小型应用集成。
- 权限：`.devilop/token`、Claude channel 的会话同意与组织策略、原生审批需人确认、VM 按机器 key 授权。
- 反馈：`doing --progress N`、`mark <block> passed|failed|testing|plan|none`、`check` 实时着色、`watch` 标过期、`health` 汇总、头像窗口的 waiting/queued/received/working 四态与历史提示。

**主动推进（时间/事件/状态触发）**
- `wait` 阻塞直到人在 devilop 操作或地图被他人修改——由“人的动作”触发代理继续。
- Finish edits 生成不可变包即唤醒已连接 runner；runner 忙则包排队等下一轮，期间人可继续编辑。
- `watch` 按文件变更事件把对应块标为可能过期（不论是谁改的）。
- `check` 按块配置的测试命令执行并实时回传通过/失败。
- 源码执行保持有序且单写者：忙碌回执会点名更早的包，不取消也不跳过。

**效果验证（怎么判断真改善了）**
- 代理“只在真实检查之后”才标记完成；verified completion 只更新仍然适用的描述与检查结果，只删除未被改动的已应用草稿版本；你的 Requests 原样保留。
- 明确的反例约束：离线包保持排队；**读一个包或结束一轮模型输出都不算完成**；通过 MCP/CLI/HTTP 读取不会把包标成完成；通用 MCP 连接不能唤醒空闲客户端。
- History 列出最近 200 条变更，含作者与原因；`health` 给出 failed/outdated/unchecked/planned 四类计数。

## 与已有做法的关系

清单中相关条目：Claude Code（adopt）、Cursor（watch）、Cline（watch）、goose（watch）、OpenCode（watch）。

devilop 不替代这些客户端，而是它们**外侧的上下文与交接层**：代理仍是原客户端里的那个代理（README 明确“This uses the client's supplied identity and does not create a second agent”“devilop has no chat”），devilop 只提供地图数据、真实界面草稿与投递通道。README 的 `setup --agent` 列表直接覆盖 claude、cursor、cline（作为通用 `<name>` 打印 MCP 条目）、goose、opencode，说明与清单条目是配合关系。

清单中没有“产品结构地图 / 架构可视化→代理交接”“把界面草稿打包回当前对话”这类条目，属于新增能力面。

## 证据与局限

**原文给出的具体物（可直接照做）**：完整启动命令、`/agent` 引导行、`current connect` 各客户端差异、14 条 CLI 命令及其用途、`setup --agent` 的客户端分支表、VM 三步接入、`node --test test/*.test.mjs`、MIT 许可、`.devilop/` 本地存储与 token 机制。

**作者自认未验证的部分（必须打折）**：
- “Real Codex delivery into the same chat has been verified in this checkout; source modification and checked completion through that real client remain unverified.”
- “Claude and Cursor native acceptance also remain unverified.”
- “Queue receipts, the controlled demo and isolated tests do not establish a complete real-client workflow.”
- Codex MCP 可能不继承原生线程身份，需代理用当前对话 shell 严格执行通知里的 CLI 命令。

**成熟度**：版本 0.26.1，README 自称 “remains at an early stage”，且“版本号不代表公开下载已发布”；仓库 40 stars；源码检出用 `git clone .../mycel.git devilop`（仓库名与项目名不一致，README 自承公开仓库可能落后于官网版本化包）。界面语言仅 EN/RU。

**只是主张、无数据支撑的**：四层地图让人“看得懂产品怎么运作”、面向 hackathon/vibe coder/独立开发者的提效、`watch` 标“可能过期”的准确性、`health` 对疑似密钥的覆盖度。README 没有任何量化指标、用户案例或对照数据。

**适用条件**：单机本地开发；有可用的编码代理客户端并允许其读项目；接受“云端代理不算离线工作流”；地图与界面编辑的价值依赖 app binding 与小型应用集成是否被正确建立（由代理在分析或开发时添加，README 未给这块的具体判定标准）。不适用于：无本地项目文件夹、只用网页版模型、或需要多人同时改同一张图的团队协作场景（原文只提到单写者与 200 条 History，没有并发协作设计）。

## 怎么试、怎么验证

**最小试用（半天，建议单客户端）**
1. 选一个**已有**项目（不要新建），先只用 Codex——因为这是 README 唯一声称在真实 checkout 中验证过投递的路径。
2. 装好并 `node devilop.mjs open`，在项目文件夹里用第 3 步的两行文本让代理接入，`current status` 确认状态链路可见。
3. 手工建 5–10 个块覆盖一条主用户流程，只给其中 1–2 个块做 app binding（控制集成成本）。
4. 走一次完整闭环：块上写 Requests（含 1 条约束 + 1 个示例）→ Finish edits → 代理改源码 → `check` / `health` 看结果 → 人 Accept/Reject 覆盖层提案。
5. 再故意制造一次“代理想跳过检查”的机会（例如让它改一个没有测试命令的块），看它会不会把 `mark` 直接置 passed。

**判断有没有改善的指标**（对照“直接在客户端里让代理改”的同一任务）
- 从提出界面微改到源码落地的墙钟时间与人工步骤数（地图路径 vs 纯对话路径）。
- 代理首次改对的块比例、需返工的轮次。
- `health` 中 failed / outdated / unchecked 的数量随试用推进是否下降或稳定；`watch` 标出的过期块是否被真实遗忘（漏报/误报各记一笔）。
- “未检查即报完成”的次数，目标为 0（这是本项目最该验证的一条纪律是否被工具强制）。
- 投递可靠性：`current status` 中 queued 但长期未 received 的次数；Codex 队列“约十秒”延迟是否可接受。

**止损与降级**：若出现 uncertain partial source changes 且需人工逐文件复核、或投递通道频繁不可用，就降级为“只用地图做上下文”（`context --brief` + 手工把包内容贴进对话），放弃自动回传；若地图维护成本高于收益（块很快过期、`watch` 噪声大），判定为 `study`——只借“结构化地图 + Requests + 检查状态机”这个思路，不引入该工具。
