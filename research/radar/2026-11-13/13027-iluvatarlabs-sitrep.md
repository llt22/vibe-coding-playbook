# IluvatarLabs/sitrep

- 结论：**值得一试**。建议在受信任局域网内小范围试用：先用内置模拟器跑通，再在一台常开服务器和 1–2 台开发机上安装，重点验证跨机器“待人/卡住”会话的发现与解锁效率。它给出了可复制的安装、自检和卸载命令，但项目较新、仅支持 macOS/Linux、使用明文 HTTP 且面向单人，暂不宜直接全面采用。
- 原文：https://github.com/IluvatarLabs/sitrep
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T01:56:17.526Z

## 是什么
SITREP 是一个自托管的跨机器会话看板，把多台机器上的 Claude Code 和 Codex 会话集中到一个实时视图中：显示哪些在工作、哪些在等人、哪些卡住或失败，并展示计划与当前步骤、agent、模型、effort、上下文占用、git 状态和成本。它允许在仪表盘上直接回答权限请求、问题和计划，也支持发消息、`/compact` 和 `/clear`。它还提供历史记录、墙视图和浏览器通知。Hermes 会话只展示、不能回答。按 README，它不控制终端，不启动、停止或重启会话，不存储 transcript。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
### 前提
- macOS 或 Linux，安装 git；README 说明未在 Windows 上运行过。
- 服务器需要 Node 24；其他机器需要 Node 22.15 或更高。
- Claude Code 2.1.287 或更高；Codex 0.162 或更高；回答 Codex 会话还需要该机器上的 Codex managed daemon。
- Hermes 需要 Docker，其 reporter 是 sidecar 容器。
- 面向受信任局域网中的单人使用；端口 7487 是明文 HTTP，能访问该端口的人可读取所有会话；回答需要 admin secret 登录。

### 1. 先用两分钟模拟器跑通
前提：已安装 git 和 Node 24。模拟器代替真实 agent。
```sh
git clone https://github.com/IluvatarLabs/sitrep ~/sitrep && cd ~/sitrep
npm ci
npm run dev        # the server on :7487, the dashboard on http://localhost:5173
```
在第二个终端：
```sh
cd ~/sitrep
npx tsx scripts/sim.ts --sessions 8 --codex 0.4 --machines 3 --chaos
```

### 2. 安装服务器
前提：选一台常开的 macOS/Linux 机器，安装 git、Node 24。先 dry run，确认打印出的文件和命令，再加 `--apply`。
```sh
git clone https://github.com/IluvatarLabs/sitrep ~/sitrep && cd ~/sitrep
npm ci && npm run build
npx tsx scripts/install.ts --server --bind 0.0.0.0            # dry run: prints every file and command
npx tsx scripts/install.ts --server --bind 0.0.0.0 --apply
```
安装后它以用户服务运行，并把 admin secret 写到 `~/.sitrep/server.env`。打开 `http://<server IP>:7487`；README 提醒用 IP 地址，主机名必须先列入 `SITREP_ALLOWED_HOSTS`。

### 3. 添加运行会话的机器
前提：在每台运行会话的机器上安装 git、Node 22.15 或更高；只在运行 Codex 的机器上构建 codex-reporter。仪表盘的 Machines → Add a machine 会给出填好服务器地址的命令。
```sh
git clone https://github.com/IluvatarLabs/sitrep ~/sitrep && cd ~/sitrep && npm ci
npm run build -w codex-reporter                               # only where Codex runs
npx tsx scripts/install.ts --claude --codex --url http://<server IP>:7487 --token-stdin --apply
```
粘贴 admin secret，然后按 Ctrl-D。未安装 Claude Code 或 Codex 时，省略 `--claude` 或 `--codex`。README 说明安装不会改动你自己的 hooks。

### 4. 自检与卸载
```sh
npx tsx scripts/doctor.ts
npx tsx scripts/uninstall.ts --claude --codex --server
```
`uninstall.ts` 默认列出将移除的内容，加 `--apply` 才真正移除。

### 5. 日常使用
- 先看 Needs you 和 Problems：待人项按等待时间从长到短排列；卡住、失败或文件冲突在 Problems 中。
- 在仪表盘回答权限、问题和计划，或发消息、`/compact`、`/clear`；终端和仪表盘谁先回答谁生效。
- 用卡片、列表或图视图，按机器、项目、状态或 harness 过滤；可开墙视图，并开启会话需要你、卡住、失败或计划窗口到 90% 时的浏览器通知。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
1. 能力发现：README 展示了可交给监控层的工作——跨机器汇总会话状态、计划与当前步骤、模型/effort、上下文占用、git 状态、成本、历史，以及把“待人/卡住/失败/文件冲突”集中呈现。这些是单看单个终端不容易获得的全局能力。
2. 任务匹配：适合一个人在 macOS/Linux 上同时运行 Claude Code 和 Codex，并可选接入 Hermes 的场景。Claude Code 和 Codex 可回答；Hermes 只展示。Codex 回答依赖 managed daemon；Windows 未支持。
3. 条件供给：需要常开服务器、各机器 Node 与 git、网络可达、admin secret、安装脚本接入 Claude/Codex 报告、Codex daemon，以及 Hermes 的 Docker sidecar。安全条件是受信任局域网和单人使用。
4. 主动推进：部分相关，但不是任务自动推进。它能在“待人、卡住、失败、计划窗口到 90%”等状态触发浏览器通知，并允许从看板解除阻塞；README 明确它不启动、停止或重启会话。
5. 效果验证：提供按会话、模型、机器估算成本，计划窗口余量，按天历史（模型、时长、成本、结束方式）和 Problems 视图；但没有给出对照实验或效果评估方法。

## 与已有做法的关系
- Claude Code（清单状态 adopt）：SITREP 不是替代 Claude Code，而是在其之上增加跨机器、跨会话的监督与解锁层；适合把“人在回路中监督多个 agent”的做法具体化。
- Hermes（清单状态 watch）：SITREP 可展示 Hermes 会话，但不能回答；接入需要 Docker sidecar。
- 清单中没有其他直接相关条目。

## 证据与局限
原文是 GitHub README，不是完整文档；更细的操作在 TUTORIAL、HOW-IT-WORKS、OPERATIONS 等链接中，但未提供正文。README 给出了安装命令、dry run、doctor、uninstall 和模拟器命令，说明可复制性较强；但没有给出用户研究、基准数据或案例效果。文中“最清晰”“最快”“最安全”等是作者主张，不是实测结论。局限包括：项目仅 45 stars，较新；仅支持 macOS/Linux；明文 HTTP，能访问 7487 的人可读所有会话；面向单人；Codex 回答需要 managed daemon；Hermes 只读。

## 怎么试、怎么验证
最小试用：先在单机跑模拟器，确认卡片/列表/图、Needs you、Problems、回答和成本展示符合预期；再在一台常开服务器和一台真实运行 Claude Code（如有 Codex 则一并）的开发机上安装，先 dry run 再用 `--apply`，运行 `doctor.ts` 排错。只在受信任局域网试用，不暴露到公网。

建议以试用前一周为基线，记录：会话从进入等待到被回答的时间；卡住/失败会话是由通知发现还是事后才发现；为找某个会话切换终端或机器的次数；能看到成本和计划窗口余量的会话比例；安装与排错耗时；是否出现未授权访问或误操作。若等待时间、漏掉的卡住会话和终端切换次数下降，且没有新增安全问题、运维负担可接受，再考虑扩大范围；否则停留在 study 或放弃。
