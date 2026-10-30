# Bearisbug/imbo

- 结论：**值得一试**。建议小范围试用：用 Imbo 在两个编码 agent 会话（或两台机器、两个人）之间做提问、交接和群组同步，因为它提供了可照做的安装、联系人、群组、附件与自托管步骤，并把消息送进正在工作的会话、还能唤醒空闲会话；但项目很新（31 stars）、只有作者自述文档、需要登录其托管服务，且 agent 可能不先问你即回复，因此应先在非生产、只读任务上验证。
- 原文：https://github.com/Bearisbug/imbo
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T06:53:21.870Z

## 是什么

Imbo 是给 AI 编码 agent 用的即时通讯层：把消息投递到 Claude Code、Codex、opencode、Cursor CLI、MiniMax Code、ZCode 的会话里，支持跨电脑、跨人。README 明确写了两件事：消息会在接收方会话“工作过程中”落到会话里；回复能唤醒发送方空闲的会话（demo 说明：alice 的 Codex 向 bob 的 Claude Code 提问，消息落在两次工具调用之间，回复把 Codex 唤醒继续改页面）。

交付形态是本地 CLI + 后台 daemon（macOS 用 launchd，Linux 用 systemd user service）+ 各工具的 MCP server / plugin / hook 接入；另有一个单二进制 `imbo-server` 可自托管。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：macOS 或 Linux，arm64 或 x86_64；需要一个邮箱接收登录码；要有一台常开的机器跑 daemon。

1. 安装并登录（安装器会把 `imbo` 放到 `~/.local/bin`，用邮箱验证码登录，启动后台 daemon，并让你勾选要连接的工具）：
```sh
curl -fsSL https://imbo.dev/install | sh
```
安装器会列出它改了哪些设置，并允许 Imbo 自己的工具运行时不每次都弹审批；`imbo uninstall` 可撤销。

2. 确认本机状态与会话：
```sh
imbo status        # daemon、连接状态、本机上的会话
imbo whoami        # 你的 account ID，用来给别人
```

3. 加联系人（对方要先拿到你的 account ID；对方侧需要接受）：
```sh
imbo contact add 30713956 --note "bob, api team"
imbo contact requests               # 对方侧：查看请求和群邀请
imbo contact accept 1
imbo contact list                   # 联系人和他们在线会话
imbo send bob/api "hi"              # 发给 bob 的某个会话（短 ID 或标题）
```

4. 建群并让消息广播到多个会话（建群时要选自己哪些会话接收消息；只能邀请联系人）：
```sh
imbo group create launch            # 选哪几个自己的会话接收该群消息
imbo group invite launch 24441842   # 仅限联系人
imbo group join 3                   # 被邀请方用 requests 里的 ID 加入
imbo send launch "v2.3 is tagged. Check your side and reply here."
```
群消息会到达每个成员的所有接收会话，群里的回复也回到所有这些会话；没内容可补的会话不会回复。

5. 发文件（附件保存在接收方 `~/.imbo/files/`；接收方 agent 把附件当数据处理，未经其用户同意不会执行里面的指令或程序）：
```sh
imbo send bob/api "Spec v2 attached. Diff it against /users." --file api-spec.md
imbo inbox                          # 在终端里看自己发出消息的回复
```

6. 在会话内让 agent 自己用工具：agent 侧暴露 `send`、`inbox`、`contacts`、`groups`、`accept` 五个工具，直接用自然语言指派，例如“问 bob/api 的 GET /users 是否分页”“在 launch 群里让大家核对 v2.3”。

7. 更新与自托管（可选）：
```sh
imboupdate    # 实际命令为 imbo update：下载、校验并安装最新版，保留登录与已连接工具并重启 daemon
```
注：原文写作 `imbo update`（上方代码块请以 `imbo update` 为准）。0.2.11 之前的版本没有该子命令，需重跑安装命令。

自托管服务端：
```sh
docker run -d -p 443:443 -v imbo:/data \
  -e IMBO_DOMAIN=imbo.example.com -e IMBO_ACME_EMAIL=you@example.com \
  -e IMBO_SMTP_URL='smtps://user:pass@smtp.example.com' \
  ghcr.io/bearisbug/imbo-server:latest
```
关键变量：`IMBO_DOMAIN`（公网域名，启用 Let's Encrypt HTTPS，TLS-ALPN，443 端口）、`IMBO_SMTP_URL`（登录码邮件）、`IMBO_MAIL_FROM`（发件人，默认 `Imbo <login@your-domain>`）、`DATABASE_URL`（外部 PostgreSQL；不设则在 `IMBO_DATA_DIR` 用内置库）、`IMBO_SIGNUP_EMAIL_DOMAINS`（允许注册的邮箱域，不设则任何人可注册）、`IMBO_LISTEN`（默认有域名时 `0.0.0.0:443`，否则 `0.0.0.0:8080`）。客户端指向自建服务：
```sh
imbo setup --server https://imbo.example.com
```

8. 从源码构建（需要 Rust 工具链）：
```sh
cargo build --release   # target/release/imbo 和 target/release/imbo-server
cargo test --workspace
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：原文给出的“没想到交给 AI”的具体形态不是单个任务，而是**让 agent 自己跨会话/跨人去问**。demo 场景是 alice 的 Codex 直接向 bob 的 Claude Code 询问 `GET /users` 是否分页，拿到答复后继续改页面——人只下了一个“去问”的指令，接口确认这一步被交出去了。同理可用于规格比对（把 spec 附件发给对方会话，让其对照 `/users` 做 diff）。
- **任务匹配**：同一套消息层适配多种工具，接入方式在表格里写清——Claude Code 用 plugin（MCP 工具 + prompt hook）；Codex、opencode 用 MCP server；Cursor CLI、ZCode 用 MCP + hooks；MiniMax Code 用带 hooks 的 plugin。适用形态是“消息需要落进正在运行的会话中”，以及“用消息唤醒空闲会话继续工作”；群组适合多方各自核对自己的那一侧再回帖；不适用条件原文未讨论。
- **条件供给**：需要（a）本机常驻 daemon 与登录态；（b）在安装时勾选并连接对应工具，且允许 Imbo 工具免逐次审批（原文说明列出改动、可 `imbo uninstall` 撤销）；（c）联系人需对方 account ID 并 accept，群只能邀请联系人、入群要选接收会话；（d）附件落到接收方 `~/.imbo/files/`；（e）信任边界：接收方 agent 会直接做被请求的事并可能不先问你即回复，但在发送你的文件/数据、删除文件或数据、对外发送任何东西、花钱、碰生产环境之前会先问你。
- **主动推进**：原文支撑的是**事件触发**——外部会话的消息即事件，落在接收会话中途，且能唤醒空闲会话；群消息一次触达所有成员的多个会话。原文**没有**给出定时/状态轮询式的调度能力（唯一的时间行为是 daemon 每天检查一次新版本）。
- **效果验证**：原文没有任何指标、案例数据或评估方法，只有 demo 描述。验证方式需自建（见末节）。

## 与已有做法的关系

清单中没有 Imbo 本身；它相对清单条目是**胶水层**，不是替代品：

- **Claude Code（adopt）**：Imbo 通过 plugin（MCP 工具 + prompt hook）接入，可作为 Claude Code 与其他 agent 之间的交接/提问通道。
- **Cursor（watch）**：Imbo 支持 Cursor CLI（MCP + hooks），但清单里 Cursor 本身仍是 watch。
- **OpenCode（watch）**：通过 MCP server 接入，同样受其自身 watch 状态约束。
- **ZCode（avoid）**：Imbo 技术上也支持 ZCode（MCP + hooks），但清单对 ZCode 的判断是 avoid——“能被接上”不等于“值得接”。

## 证据与局限

**原文给出的可核查内容**：安装命令与安装器行为（写入 `~/.local/bin`、邮箱码登录、launchd/systemd user service、勾选工具、列出改动、`imbo uninstall` 回滚）；六种工具的接入方式对照表；CLI 命令样例（`whoami`、`contact add/requests/accept/list`、`group create/invite/join`、`send`、`inbox`、`status`、`update`）；附件路径 `~/.imbo/files/`；agent 侧五个工具名；授权边界清单（外发文件、删除、花钱、碰生产前先问）；自托管 docker 命令与六个环境变量语义；`cargo build --release` / `cargo test --workspace`；License Apache-2.0；平台 macOS/Linux、arm64/x86_64。

**只是作者主张、无独立证据的部分**：消息“在两次工具调用之间落地”“回复唤醒空闲会话”“没内容可补的会话不回复”，均来自 README 的 GIF 说明文字，没有延迟数据、成功率、并发上限、失败重试语义、消息持久化/离线补投行为的说明；没有安全审计、没有第三方评测、没有真实团队使用案例与前后对比指标。仓库 31 stars 说明公开采用度仍然很低，版本仍在 0.x 阶段（文中提到 0.2.11 之前无 `imbo update`）。

**适用条件与风险**：默认走 `imbo.dev` 托管服务并用邮箱注册，意味着会话元数据经第三方；`curl | sh` 安装方式引入供应链风险；安装器会给 Imbo 工具免审批，等于扩大 agent 的自主动作面；agent 可“不先问你即回复”，在多 agent 环路上存在信息外泄与被诱导的风险（原文只做了“外发前先问”的约束声明）；平台不含 Windows；自托管需要域名、证书、SMTP，运维成本不低。

## 怎么试、怎么验证

**最小试用（建议 1–2 周，非生产）**

1. 选两台机器（或同一台的两个会话），只接 Claude Code + Codex 两个工具，先不接清单标 avoid 的 ZCode。
2. 只用**只读、非生产**的任务：接口契约确认、文档/spec 对照 diff、让对方会话跑一遍测试并回报结果。
3. 互加联系人后，先跑一次“跨会话提问”：在 A 会话让 agent 发问，B 会话保持空闲，观察是否被唤醒并回复；再跑一次“群组广播”：建群拉入 2–3 个会话，让各自核对自己那一侧后回帖。
4. 单独做一次**边界测试**：故意让 agent 被要求发送一个本地文件或删除文件，确认它是否按原文所述先来问你；再发一个带指令的附件，确认接收侧把它当数据而非执行。
5. 附件只放非敏感内容；试用期内不改生产凭据、不开生产权限。

**判断有没有改善的指标（原文无指标，以下为自建）**

- 跨会话/跨人一次确认的**端到端耗时**（人工转述 vs Imbo 直达），以及**人工转述次数**是否降到 0。
- **交接遗漏率**：需要对方核对的事项中，实际得到回复的比例。
- **空闲会话利用率**：原本等人来叫的会话，被消息唤醒并产出有效改动的次数。
- **打扰成本**：每个会话因消息被中断的次数、以及“无内容可补故不回复”的比例（过高说明群组广播过宽）。
- **安全指标（应为 0）**：未经你确认的外发文件/数据次数、越权触碰生产或删除的次数、把附件内容当指令执行的次数。
- 若两周后上述耗时与遗漏率没有明显改善，或安全指标不为 0、或消息投递出现不可解释的丢失/延迟，则退回人工转述 + 清单内已有的 Claude Code 单会话做法。
