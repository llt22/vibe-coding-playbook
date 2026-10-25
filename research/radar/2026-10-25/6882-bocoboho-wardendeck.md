# bocoboho/wardendeck

- 结论：**值得一试**。建议小范围试：按 README 的 init→project create→feishu setup→serve 跑通一遍，把 WardenDeck 当作 Claude Code 的“审批闸门 + 沙箱 + 审计链”控制面，验证离开终端时也能安全派活；因其自标 prototype、执行端只有 Claude Code、内核沙箱仅 macOS，暂不直接写进手册。
- 原文：https://github.com/bocoboho/wardendeck
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-25T07:12:16.777Z

## 是什么

WardenDeck 是一个**自托管控制面**（self-hosted control plane），把本机上的编码智能体（当前只有 Claude Code）放到飞书/Lark 消息后面：

- 手机发一句话即下发任务，执行卡片挂在原消息下方**原地更新**工具调用进度，完成时变绿；
- 每个工具调用可暂停等审批：允许一次 / 允许 30 分钟 / 拒绝，**只有发起任务的人能审批**；
- 消息、审批、agent 运行、附件写入**只追加的 SHA-256 哈希链**日志，可用命令校验完整性；
- macOS 上 Claude Code 及其派生的每个工具都跑在 `sandbox-exec` 下，由内核强制；
- 每 bot 分层的长期记忆（assistant / project / chat / user 作用域）、AES-256-GCM 加密凭据、本地 SQLite、控制台只监听 `127.0.0.1`。

作者自标 `status: prototype`，仓库 40 stars，MIT。执行链路是：飞书长连接投递 `im.message.receive_v1` → 匹配绑定并校验 `allowed_users` 与 @ 规则 → 按聊天入队 → 写入常驻的 Claude Code 进程（项目 `workdir`）→ 工具权限请求变审批卡 → 卡片补丁式更新 → 保存原生 session ID 供 `--resume` 复用。

## 具体做法

### 步骤 0：确认前提

- Node.js **>= 22.13**（依赖内置 `node:sqlite`）
- **macOS 或 Linux**；内核级沙箱仅 macOS 提供，Linux 需自行用专用用户或容器兜底
- **Claude Code 已安装并登录**，`claude` 在 `PATH` 上
- 一个飞书（或 Lark）账号，手机能打开授权链接

### 步骤 1：安装（前提：已装 git、Node ≥ 22.13）

```bash
git clone https://github.com/bocoboho/wardendeck.git
cd wardendeck
npm install && npm run build
npm link
```

`npm link` 把 `wardendeck` 放到 `PATH`；不执行则改用 `node dist/cli.js <command>`。

### 步骤 2：初始化并建一个项目（前提：`init` 会创建 `~/.wardendeck`，权限 0700）

```bash
wardendeck init --admin-email you@example.com
mkdir -p ~/code/demo
wardendeck project create --name demo --workdir ~/code/demo
```

`init` 生成 `master.key`、数据库和**一次性 Web 控制台 token**，并自动探测本地 agent。`--workdir` 决定 agent 实际能碰的目录，建议指向一个可丢弃的仓库副本。

### 步骤 3：备份密钥（前提：无此步则换机后凭据不可恢复）

把 `~/.wardendeck/master.key` **与数据库一起**备份——它是唯一能解密已存凭据的钥匙。

### 步骤 4：连接飞书（推荐路径：自动建应用）

```bash
wardendeck feishu setup --project demo
```

在手机上打开打印出的链接并授权。WardenDeck 会自动创建应用、把凭据存为 `feishu_demo`、并**自动绑定你的私聊**。

随后到飞书开放平台控制台确认两件事（缺一则不工作）：

1. **事件订阅 → 长连接**开启，并订阅 `im.message.receive_v1`；
2. 想要卡片按钮审批，添加 `card.action.trigger` 回调；没有它就在对话里回 `1 / 2 / 3` 审批。

**替代路径：复用已有飞书应用**（前提：已在该平台建好自建应用并发布版本）

1. 建**自建应用**（国际版用 `open.larksuite.com`）；
2. 开启**机器人**，申请 `im:message`、`im:message:send_as_bot`、`im:chat:readonly`；
3. 按上文的“长连接 + 事件订阅”设置，然后发布一个版本；
4. 存入凭据并绑定会话：

```bash
wardendeck secret set feishu_demo --value "cli_xxx
app_secret_xxx"

wardendeck platform bind --project demo --platform feishu \
  --credential feishu_demo --channel oc_xxx
```

第一行 App ID、第二行 App Secret；国际版再加第三行 `lark`。**不写 `--allowed-users` 时只允许应用所有者**，这是默认的安全边界。

### 步骤 5：绑定群聊（可选；前提：先把 bot 拉进群）

```bash
wardendeck feishu chats --credential feishu_demo
wardendeck platform bind --project demo --platform feishu \
  --credential feishu_demo --channel oc_xxx --allowed-users ou_aaa,ou_bbb
```

群里只有**@ 这个 bot** 才响应；务必用 `oc_...` 群 ID，不是个人 `ou_...` ID。

### 步骤 6：启动

```bash
wardendeck serve
```

Web 控制台在 <http://127.0.0.1:8787>（用 `init` 打印的 token 登录），不需要就 `wardendeck serve --no-web`。**笔记本休眠即离线**，常驻写法：

```bash
caffeinate -is wardendeck serve
```

或在常开主机/服务器上跑。

### 步骤 7：在聊天里派活与审批

发一句自然语言，例如：

> 你好，看一下这个目录里有什么

卡片会随工具调用原地刷新，遇到需要审批的调用会停下。可用指令：

| 指令 | 作用 |
|---|---|
| `1` / `允许` | 允许本次工具调用 |
| `2` / `允许30分钟` | 30 分钟内允许工具调用 |
| `3` / `拒绝` | 拒绝本次工具调用 |
| `/stop` | 停止当前任务并取消待审批 |
| `/remember <text>` | 存记忆（私聊→user 作用域，群→chat 作用域） |
| `/memory` | 列出可见的长期记忆 |
| `/forget <id>` | 删除当前作用域内某条记忆 |
| `AW_ATTACH: /path/image.png` | 在最终回答里回传本地图片 |

单条消息上限：**10 分钟无输出、30 分钟实际耗时、100 次工具调用**。

### 步骤 8：收紧权限模式与沙箱（前提：先在一个低风险目录试）

```bash
wardendeck project permission --name demo --mode default
```

可选模式：`default`、`acceptEdits`、`plan`、`dontAsk`、`auto`、`bypassPermissions`（危险）。环境变量：

| 变量 | 用途 |
|---|---|
| `WARDENDECK_DIR` | 数据目录（默认 `~/.wardendeck`） |
| `WARDENDECK_DENY_PATHS` | agent 不得读/执行的额外路径，按系统路径分隔符 |
| `WARDENDECK_SANDBOX=0` | 关闭 macOS 沙箱（不推荐） |
| `WARDENDECK_CLAUDE_AUTO_MEMORY=1` | 重新开启 Claude Code 内置自动记忆（默认关，避免事实跨 bot 泄漏） |

### 步骤 9：核对审计与自检

```bash
wardendeck status
wardendeck doctor
wardendeck audit list --limit 20
wardendeck audit verify
```

排查思路（原文给的顺序可直接照做）：bot 不回 → 看 `serve` 是否在跑 → `status` 看绑定 → 控制台确认长连接与 `im.message.receive_v1` → `audit list` 找 `message.inbound`：**没有**说明事件没到（查事件订阅）；**有**说明被 `allowed_users` 挡了（比对发送者 `open_id`）。

## 对应的研究问题

**1. 能力发现（AI 已能做、但还没想到交给它的事）**
原文给出的可迁移点子是把“IM 聊天窗口”当作 agent 的控制面，而不是只当作通知渠道：手机发任务 → 卡片原地刷新工具进度 → 卡上审批 → 最终回答里用 `AW_ATTACH:` 回传本地图片。这把“必须坐在终端前”这个隐性约束去掉了，属于把 agent 的**触发入口和观察入口**从 IDE/终端搬到随身设备。

**2. 任务匹配（什么工作适合什么模型、工具、协作方式）**
- 执行适配器**只有 Claude Code**（Codex 能探测到但没接通）；模型是可选配置，Claude Code 默认用自己的模型。
- 有硬性时长/次数上限（10 分钟无输出、30 分钟、100 次工具调用），因此**适合短到中等、可在一次会话内收束的任务**；长批处理必须拆成多条消息。
- 有按项目的权限模式分级（`default` → `plan` → `bypassPermissions`），说明作者预期的是“按任务风险换协作方式”，而不是一套模式打天下。
- 在“人不在场”的异步协作上提供了具体机制：审批挂起时 idle 计时暂停，等人决策。

**3. 条件供给（需要哪些信息、工具、权限和反馈）**
原文把供给条件写得很实：Node ≥ 22.13、Claude Code 已登录、`workdir` 指向项目目录、飞书应用的三项权限（`im:message`、`im:message:send_as_bot`、`im:chat:readonly`）、事件订阅长连接 + `im.message.receive_v1`、卡片审批还需 `card.action.trigger`、`allowed_users` 白名单、`master.key` 备份、`WARDENDECK_DENY_PATHS` 拒止路径、以及四个作用域的长期记忆（assistant / project / chat / user）。反馈供给的形式是“同一张卡片持续打补丁”，而不是另开一条消息流。

**4. 主动推进（时间/事件/状态触发并持续完成）**
有**事件触发**：飞书长连接事件驱动，按聊天入队，常驻 Claude Code 进程承接，原生 session ID 按聊天保存并用 `--resume` 复用（即跨消息保持上下文）；`/stop` 可中断并取消待审批。
但原文**没有给出任何时间触发（cron/定时）或状态触发的机制**——任务只能由人发消息启动，因此“主动推进”在这一版里只覆盖“事件驱动 + 会话续接”，不覆盖“无人值守的周期性推进”。另有一条硬约束：机器休眠即离线，必须 `caffeinate` 或常开主机。

**5. 效果验证（怎么判断确实改善了结果）**
提供了**过程可验证性**而不是质量可验证性：只追加的 SHA-256 哈希链日志 + `wardendeck audit verify` 校验完整性；`audit list` 里可查 `message.inbound` / `message.outbound` 是否成对；执行卡片的状态（暂停待审 / 变绿完成）；`wardendeck status`、`wardendeck doctor` 做健康自检。原文**未提供任何任务质量、成功率或效率的量化数据**。

## 与已有做法的关系

清单中相关条目：**Claude Code（状态 adopt）**。

WardenDeck 不替代 Claude Code，而是它外围的**授权与审计层**：Claude Code 仍是唯一的执行引擎（`src/claude.ts` 处理 stream-json 会话、权限、进程限制），WardenDeck 在其上补了四件清单里没有的东西——(a) 远程/移动触发入口（飞书长连接，无公网入站端口）；(b) 人在环的逐工具审批卡（一次 / 30 分钟 / 拒绝，且仅发起者可批）；(c) 内核级沙箱 + 拒止路径；(d) 哈希链审计与分层记忆。

因此它的正确用法是“给已有的 Claude Code 用法加闸门和账本”，而不是新建一套 agent 工作流；这也意味着凡是已经重度依赖 Claude Code 的场景，接入成本主要是飞书应用配置，而不是重写提示词。

## 证据与局限

**原文给出的硬证据（可照做层面）**
- 完整的安装、初始化、项目创建、飞书授权、凭据写入、绑定、启动命令，以及一份覆盖 init/serve/project/assistant/memory/secret/platform/feishu/user/model/audit 的 CLI 全量参考；
- 明确的权限范围与事件名（`im:message` 等三项 scope、`im.message.receive_v1`、`card.action.trigger`）；
- 明确的运行限额（10 分钟无输出 / 30 分钟 / 100 次工具调用）与四个环境变量的语义；
- 四段式排障路径（含用 `audit list` 的 `message.inbound` 有无来二分定位“事件没到”还是“白名单挡了”），属于可直接复用的诊断手法；
- 架构图与飞书执行卡截图作为存在性佐证。

**只是作者主张、无数据支撑的部分**
- “no data leaving your machine”“tamper-evident”的安全强度：只有机制描述（AES-256-GCM、SHA-256 链、`sandbox-exec`、0700/0600 权限），**没有任何第三方审计、渗透测试或攻击面分析**；
- 没有任何用户案例、任务成功率、审批误报率、时延或成本数据；仓库仅 40 stars，社区验证极少。

**适用条件与已知限制（原文自陈）**
- 状态是 **prototype**：数据库本身**未加密**，明确要求不要把 8787 端口暴露到公网；
- **Claude Code 是唯一执行适配器**，Codex 未接通；Slack 和 Telegram 只能测凭据和绑定，**尚不支持消息接入**；
- **内核沙箱仅 macOS**，Linux 需自带隔离（专用用户或容器）；
- 原生会话**不跨 agent 共享**，只有语义记忆共享；
- 模型可选但有默认；机器休眠即离线；
- 原文未说明“30 分钟实际耗时”是否包含人工审批的等待时间，这与“审批时 idle 计时暂停”存在潜在张力，需要实测确认。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 选一台 macOS 机器（或常开主机 + `caffeinate -is wardendeck serve`），确认 Node ≥ 22.13、`claude` 已登录；
2. `--workdir` 指向**一个可丢弃的仓库副本**，不要指向主力工作区；
3. `--permission-mode` 先用 `default`，只绑自己的私聊、不写 `--allowed-users`（默认仅 app owner）；
4. 先跑 3 个低风险任务：①“看一下这个目录里有什么”（验证只读链路与卡片刷新）；②“把 X 文件的日志级别从 info 改成 debug”（验证写操作触发审批）；③一个必须多轮交互的小 bug 修复（验证 `--resume` 会话续接）；
5. 中途刻意测三条边界：`/stop` 能否立刻中断并清空待审批；审批拖过 30 分钟看任务是否被判超时；让 agent 尝试读 `~/.wardendeck` 或 `WARDENDECK_DENY_PATHS` 内路径，应当被拒；
6. 收尾跑 `wardendeck doctor` 与 `wardendeck audit verify`。

**判断“有没有改善”的指标（全部可从事先约定的基线对比得出）**

| 维度 | 指标 | 基线 |
|---|---|---|
| 干预成本 | 每个任务的人工审批次数、被拒/超时次数 | 同任务在本地终端直接跑 Claude Code 的人工干预次数与耗时 |
| 可用性 | 从“想到一件事”到“任务真正开跑”的时间 | 走回电脑、开终端、输入提示词的耗时 |
| 可靠性 | 三个任务里 `message.inbound` 与 `message.outbound` 成对出现的比例；`audit verify` 是否通过 | 无审计时的“凭记忆确认” |
| 上下文连续性 | 多轮任务中是否需要重述背景 | 无 `--resume` 时每轮重述的成本 |
| 安全边界 | 拒止路径探测是否 100% 被拦；`allowed_users` 外账号是否零响应 | 无沙箱、无白名单时的暴露面 |
| 容量上限 | 任务因 10 分钟无输出 / 30 分钟 / 100 次调用被截断的比例 | —（用于判断哪些任务必须拆分） |

**明确的止损条件**：若试用期内出现「审批频繁打断导致实际耗时高于本地直跑」「常用任务稳定撞上 30 分钟上限」「需要 Linux 且无法提供等效隔离」中的任一情况，则退回 study——只借用它的**审批 + 审计 + 分层记忆**设计思路，不引入这个 prototype 本身。
