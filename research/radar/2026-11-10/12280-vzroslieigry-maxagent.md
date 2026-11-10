# vzroslieigry/maxagent

- 结论：**值得一试**。先在一台非关键机器、只对一个 agent（如 Claude Code）跑 `npx maxagent init`，只启用工作区+规则钩子，暂不装共享经验包和浏览器桥，用两周观察“重复错误是否被拦住、断点续做是否更快”；它的安装与命令流程具体可照做，值得小范围试，但效果与安全全是作者自述、无任何数据或第三方验证。
- 原文：https://github.com/vzroslieigry/maxagent
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-10T15:27:50.328Z

## 是什么

maxagent 是一个 MIT 许可的开源工具包（仓库 48 stars），给本机所有 AI agent（Claude Code、Codex、Antigravity、OpenClaw）一套共享的“经验优先”运行机制，核心是三件事：

1. **一个共享工作区**（默认 `~/maxagent`）：`AGENTS.md`（规则）、`experience/`（由 agent 自己在工作中写下的短小“已验证配方”，称 atom）、`projects/`（记住每项工作停在哪）、`sync.md`、`inbox/`。工作区文件归用户所有，升级不覆盖。
2. **规则块 + 钩子**：在每个 agent 的全局规则文件里插入一小段带标记的块，并装钩子，在“你发消息时 / 执行命令前 / 报错后”自动浮现对应 atom，让 agent 按已知做法执行而不是重新试错。用户自己的规则与钩子不动，改前先备份。
3. **两个可选扩展**：`maxagent-bridge` 是一个 MCP server，通过 Chrome 扩展（Native Messaging）驱动**你自己的** Chrome——你自己的 profile 和登录态，不开端口，逐 agent 审批，有站点黑名单、动作日志和停止按钮；`vectors` 是本地语义检索（multilingual-e5-small，固定 revision + sha256 校验，约 270 MB，需要 Python）。

经验分两层：**自己的**（`experience/`，由你的 agent 写，优先浮现，且可以拦住已知会失败的命令）与**共享的**（从仓库下载的 pack，只做参考：仅在自己那层为空时显示、阈值更高、每条消息最多一条、只给标题+第一步、**永不阻断命令**）。觉得有用的共享 atom 可 `adopt` 复制进自己的层；噪音 pack 可 `mute`。pack 是挂在 GitHub Release 上的单个 JSON，客户端校验 sha256、文件名和文本内容（下载即执行命令、试图改写 agent 规则、外发密钥、破坏性命令、隐藏字符），命中任一项整包拒收。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：本机装好 Node.js 18+；至少装一个受支持的 agent；愿意让工具修改 agent 的全局规则文件（有备份）。

1. **（可选但推荐先看）让 agent 代跑交互式安装**。README 给了一段可直接复制的委派提示词，价值在于它同时约束了“问全、不替用户选、跳过任何一项”的交互纪律：

```
Install maxagent: run `npx maxagent init`. Without a terminal it prints the questions: ask me all of them, choose nothing for me and skip nothing, then pass me its report.
```

2. **亲自跑安装向导**：

```
npx maxagent init
```

向导会：① 建工作区 `~/maxagent`（`AGENTS.md`、`experience/`、`projects/`、`sync.md`、`inbox/`），可选建私有 Git 仓库做同步；② 对它发现的每个 agent 写入规则块与钩子；③ 就“附加组件”只问一个问题——**全部安装 / 自选 / 都不装**；④ 输出总结：开了什么、跳过了什么、以后怎么开。npm 安装阶段不执行任何脚本，重的东西只在你说 yes 后由向导下载。

3. **首次试用建议只在自选项里勾工作区 + 规则钩子**，共享经验包与浏览器桥先不装（理由见“怎么试”）。

4. **（以后想开时）浏览器桥**：

```
npx maxagent bridge
```

扩展目前需手动加载：`chrome://extensions` → 打开开发者模式 → “加载已解压的扩展程序” → 选目录（原文称“三次点击”），向导会等到桥连上。

5. **（以后想开时）本地语义检索**：

```
npx maxagent vectors
```

约 270 MB，模型 revision 固定并做 sha256 校验，Python 库落在 `~/.maxagent/vector`；无 Python 时向导会提议安装（Windows 走 winget，需另行确认）；没有它则只用词面搜索。

6. **（以后想开时）共享经验包**：

```
npx maxagent experience add all
```

7. **日常运维命令**（照抄即可）：

```
npx maxagent setup          # 改设置（如 updates: false 可彻底关掉网络请求）
npx maxagent doctor         # 查装了什么、健不健康
npx maxagent update         # 更新规则/钩子/agent 块，不动工作区
npx maxagent experience list | add <pack> | all | update | mute <pack> | adopt "<id>"
npx maxagent uninstall      # 从 agent 里移除块与钩子，工作区保留
```

8. **按两层规则使用**（这是最可直接迁移的流程约定）：自己写的 atom 优先、可阻断；共享 atom 只作参考、阈值更高、每条消息最多一条、只显示标题+第一步、永不阻断；帮上忙的共享 atom 用 `adopt "<id>"` 收编进自己的层；噪音用 `mute`。

9. **隐私开关**：在 `npx maxagent setup` 里设 `updates: false`，则完全无网络请求。

**注意**：atom 的具体书写格式由 `experience/_spec.md` 定义，该文件内容未出现在给出的材料中，因此“经验条目怎么写”这一步无法照抄，只能装完后读该文件。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：间接相关。它针对的现象是“agent 每个会话都从零重解同一个问题：搜索、尝试、失败、再找一遍”，做法是把已解决过的东西沉淀成 atom 复用。它加速的是“已发现能力”的复用，而非发现新的可交给 AI 的工作类型。
- **任务匹配**：有两点依据。其一，同一套规则/经验横跨 Claude Code、Codex、Antigravity、OpenClaw 四类 agent，说明作者主张“经验层与具体模型解耦、规则层各自适配”；其二，钩子按**事件类型**（用户消息时、命令执行前、报错后）决定浮现哪条经验，属于按情境做上下文匹配。浏览器桥则针对“需要真实登录态/真实浏览器”的网页任务这一特定工作类型。
- **条件供给**：最扎实的一条。给出了具体供给侧清单：工作区目录结构与文件职责；在 agent 全局规则文件里插入带标记的块（不碰用户原有内容、改前备份）；事件钩子；权限与安全边界（逐 agent 审批、站点黑名单、动作日志、停止按钮、不开端口、扩展只经 Native Messaging 与本地程序通信）；可选私有 Git 同步；共享包的 sha256 + 内容审查（下载即执行、改写 agent 规则、外发密钥、破坏性命令、隐藏字符）。
- **主动推进**：有依据。“每次对话轮次自动浮现经验”“命令前拦截已知会失败的命令”“报错后给出对应 atom”都是事件触发；`projects/` 记住工作停在哪里，属于状态触发以支持续做；每日后台检查更新（短超时、失败静默、可关）属于时间触发。
- **效果验证**：几乎没有。原文只说 atom 是“short, checked recipes”，没有任何指标、对照或数据；唯一可观测的设计是“自己的 atom 可以停掉一条已知会失败的命令”，但没给验证方法。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）**：maxagent 明确为它写全局规则块与钩子，是在 Claude Code 之上加一层“跨会话经验层”，不替代它；试用时两者共用同一份全局规则文件，需注意 maxagent 只加“带标记的块”并先备份。
- **OpenClaw（清单状态：watch）**：也被列为受支持的 agent 之一，同样通过规则块+钩子接入。
- 清单中的其它条目：无相关条目。

## 证据与局限

- **证据**：全部来自仓库 README 的自述，没有任何基准测试、用户案例、故障率或前后对比数据；仓库 48 stars，单作者项目，README 自承翻译未经母语者校对。
- **只是主张、未经验证的部分**：“hooks surface the right atom by themselves”的准确性；共享包内容扫描与 CI 同检查的有效性；隐私清单（“只发公开文件的 GET 请求”）的完备性；浏览器桥的安全属性（无开放端口、逐 agent 审批）——这些都是设计声明，材料中没有第三方审计或复现记录。
- **信息缺口**：`experience/_spec.md`（atom 的实际格式）未提供，因此不安装就无法复现“经验怎么写”；钩子的具体配置内容也未给出，无法手工复刻到别的 agent。
- **适用条件**：本机已装受支持 agent、接受 Node 18+、接受工具写入全局规则文件；偏个人/单机场景，材料中没有任何团队协作或多人共享工作区的说明。
- **风险**：共享经验包本质是“他人编写的、会被注入 agent 上下文的指令文本”，即便有扫描，也应先按不可信内容对待；`adopt` 会把共享 atom 提升为“可阻断命令”的本地条目，等于提升其权限。

## 怎么试、怎么验证

**最小试用（建议 2 周）**

1. 选一台非关键机器，只对一个 agent（建议 Claude Code）执行 `npx maxagent init`；附加项里**只勾工作区 + 规则钩子**，共享经验包与浏览器桥先不装。
2. `npx maxagent doctor` 确认状态；`git diff` 或备份比对，确认全局规则文件只多了带标记的块。
3. 在 `npx maxagent setup` 里决定是否 `updates: false`（若在意联网）。
4. 照常做 1–2 周真实工作，不额外干预，只记录下面的指标。
5. 结束后读 `experience/_spec.md`，看自己写下的 atom 是否符合格式、是否被钩子真的调用过。

**判断有没有改善的指标（都能从日志/工作区直接数出来）**

- **重复错误拦截次数**：同一类错误第二次出现时，是否被自己的 atom 在命令前拦住；两周内该计数若为 0，说明经验层没起作用。
- **重新摸索成本**：新会话从任务开始到第一条有效命令的轮数，与安装前同类任务对比。
- **断点续做成本**：靠 `projects/` 恢复任务时，用户需要额外补充的上下文条数是否下降。
- **经验库活性**：`experience/` 里新增 atom 数 vs 被实际引用的 atom 数；只增不引用的比例过高说明钩子或格式不适配（此时应改写 atom 而非继续堆量）。
- **可控性**：`npx maxagent uninstall` 后全局规则文件是否干净还原（diff 为空），作为“可回退”的门槛指标。

**判定线**：两周内若“重复错误拦截次数”与“断点续做补充条数”都没有可观察下降，判为对本工作流无改善，回退到 uninstall；只有在自建层跑通、且确实出现被拦住的重复错误之后，才考虑开共享包（先 `mute` 到只留少量，再逐个 `adopt`）和浏览器桥。
