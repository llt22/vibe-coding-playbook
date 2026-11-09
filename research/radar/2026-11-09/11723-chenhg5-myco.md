# chenhg5/myco

- 结论：**值得一试**。建议先在一台机器上起 hub，接入 2–3 个已登录的 Claude Code/Codex 会话，用 `myco message send --wait` 和 `broadcast send --selector` 替代手工复制 prompt，跑一两周看重投、超时和上下文保持情况再决定是否扩到多机；理由是 README 给出了可直接照抄的安装与派活命令、明确的消息投递语义（租约、重投、5 次失败）和权限档位，形态完整，但项目仅 32 stars、单作者、部分 harness 标注 experimental、Windows 未签名，成熟度不足以上手即采用。
- 原文：https://github.com/chenhg5/myco
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T00:59:27.462Z

## 是什么

myco 是一个单 Go 二进制程序，把一个「hub」（注册表 + 每个 agent 的收件箱，SQLite 存储）和若干「runner」（每台机器一个后台服务）组成一张网，让你把散落在笔记本、服务器、云端的 Claude Code、Codex、Cursor CLI、Gemini CLI、OpenCode、Kiro 等 CLI 会话当成网络节点来查看、分组、派活和互相转发任务。作者明确它「不是 agent，不替任何人思考，只负责连接和投递」。

它解决的问题是：多个 agent 之间现在靠人肉当消息总线——复制 prompt、等待、粘贴结果。myco 把这件事变成一条命令：消息进入目标 agent 的收件箱，runner 长轮询取走，用该消息 resume agent 自己的会话，再把最终输出作为回复投回。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：目标机器上已安装并登录了至少一个受支持的 CLI（Claude Code / Codex 为 native stable）；机器能出站访问 HTTPS（runner 和 session 只开outbound，不需要公网 IP 和开放端口）。

1. 起 hub。三种方式任选其一（README 原文）：

   在自己的 VPS 上（用 sslip.io 自动拿真 HTTPS，不需要域名）：
   ```bash
   curl -fsSLO https://raw.githubusercontent.com/chenhg5/myco/main/deploy/install-hub.sh && sudo bash install-hub.sh --domain auto
   ```
   在自己的电脑上，走 Cloudflare Tunnel：
   ```bash
   myco hub up --tunnel cloudflare --hostname hub.example.com
   ```
   或走 Tailscale Funnel：
   ```bash
   myco hub up --tunnel tailscale
   ```

   也可以直接用图形界面：打开 App 选 **Start on this computer**，或 **Connect an existing Hub** 粘贴 app link。

2. 装客户端 / 把机器加入网络。装 CLI：
   ```bash
   curl -fsSL https://raw.githubusercontent.com/chenhg5/myco/main/deploy/install-client.sh | bash
   ```
   加一台机器（`<link>` 由 hub 给出）：
   ```bash
   curl -fsSL https://<your-hub>/j/<link> | bash
   ```
   或者干脆让 agent 自己装——把下面这段原样粘进 Claude Code 或 Codex：
   ```text
   Read https://github.com/chenhg5/myco/blob/main/INSTALL.md
   Set up a myco hub for me and connect this session to it.
   ```

3. 把会话挂上网络。对另一台机器上的会话说一句 `join myco: https://<your-hub>/j/<link>`；本机会话可在 App 里点 **Add node → On this computer**，App 会列出最近的 Claude Code / Codex 会话，点一下即加入。需要在已连机器上新开会话时，用 App 选机器和文件夹启动。

4. 确认在线状态：
   ```bash
   myco agent list --online
   ```

5. 一对一派活并等结果（`--wait` 到期返回回复）：
   ```bash
   myco message send --to build-backend --body "Fix the failing tests in ./pkg/api" --wait 15m
   ```

6. 按标签广播派活（一对多，回复可逐个追踪）：
   ```bash
   myco broadcast send --selector "group=review" --body "Review PR #42" --wait 30m
   ```
   selector 支持 `group=`、`machine=` 等，如 `group=review,machine=vps`。

7. 需要远程执行 shell 而不是让 agent 干活时，用 exec 节点（类似 ssh，发件人需在 allow-list，命令有审计）：
   ```bash
   myco exec --to build-shell --cmd "df -h"
   ```

8. 配置权限与信任边界。每个 agent 有一份「谁可以给它派活」的 allow-list；`runner.access` 取 `readonly` / `workspace` / `full`，native harness 会把它映射到该 CLI 自己的权限 flag 上。加机器时的加入规则由那台机器自己的配置决定（谁能派、在哪个目录、什么权限）。

9. 需要带文件时用 `--attach`，只有收件方能下载，且逐个做 SHA-256 校验。

10. 让云端 / 外部 agent 也能被叫醒（它们不能被 runner spawn）：claude.ai 云会话用 `myco inbox wait` 等待任务；其余用 waker：`webhook`、`claude_routine`、`github_dispatch`、`github_issue`（细节在 docs/delivery.md）。

11. 接入不在预设里的 CLI：用 `--harness template` 声明命令行和输出格式；纯脚本用 `--harness shell`（prompt 走 stdin，stdout 作为回复）；`myco harness list` 可看某台机器上装了哪些。

12. 让 agent 自己调 myco 时依赖其 CLI 特性：JSON 输出、带 `suggestion` 字段的结构化错误、区分退出码、`--dry-run`、`myco schema` 自省。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 明确了三类「原本自己动手做、现在可交给网络」的事——在另一台已连机器上、任意文件夹里新开一个 Claude Code/Codex 会话；让某个 agent 自己发现别的 agent 并交接工作；用 exec 节点在远程机器上跑命令拿输出（「like ssh」）。另外 `myco schema`/JSON 输出意味着 agent 可以自己驱动这套派活机制，而不是只由人操作。
- **任务匹配**：README 给了明确的分派矩阵——Claude Code、Codex 是 native stable（有专用 adapter，会读会话记录，不会打断你正在输入的会话，并把 `runner.access` 映射到 CLI 自己的权限 flag）；Pi、Kiro 是 preset stable；Cursor、Gemini、OpenCode 是 preset experimental（按官方文档的输出格式适配，但「hasn't had long real-world use yet」）；任意 CLI 用 template；脚本用 shell；远程命令用 exec；云端会话用 `inbox wait`；外部事件驱动的用 waker。协作规模上，1:1 用 `message send --wait`，一对多用 `broadcast send --selector`。
- **条件供给**：需要 hub 可达（VPS 或本机 + Cloudflare Tunnel / Tailscale Funnel）、每台机器装 runner（一行 curl 完成安装、注册、起后台服务，无需复制 token）、join link、目标 CLI 已登录（Kiro 还需 `uv tool install kiro-acp-gateway` 且 `kiro-cli` 已登录）、allow-list 与 `runner.access` 权限档。反馈通道是 `--wait` 返回回复、任务运行中的 progress 更新、任务失败时通知发送方。
- **主动推进**：事件触发有支撑——webhook、Claude routine、GitHub dispatch / GitHub issue 可唤醒不在终端里的 agent；消息有租约，取走未确认（比如机器宕机）会过期重投，5 次后标记失败；agent 离线时发给它的任务会排队等它回来。但「按时间/状态调度」本身尚未落地：roadmap 里「Orchestrator templates and scheduling policies」还是未勾选状态，定时触发目前要靠外部 cron / GitHub Actions 自己接。
- **效果验证**：README **没有**给出任何效果指标或评测方法。可用的只有过程层面的可观测量：任务完成/失败、重投次数（5 次上限）、`--dry-run`、exec 命令的审计记录、`--wait` 是否超时。要判断「是否真的改善」必须自建指标（见下节）。

## 与已有做法的关系

清单中相关条目：

- **Claude Code（adopt）**：myco 直接驱动它——native adapter，运行 `claude`，把每条消息 resume 到同一个会话，所以 Claude Code 的上下文会累积而不是重置。可以理解为在已有的 Claude Code 单机用法上加了一层「跨机器编排 + 收件箱」。（README 只写 `claude` 命令与「Native: stable」，未说明具体的 resume 参数。）
- **Codex CLI（清单未列，但 README 中为 native stable）**：与 Claude Code 同档。
- **Cursor（watch）**：myco 通过 `cursor-agent` 作为 preset，标注 **experimental**。
- **OpenCode（watch）**：`opencode` preset，同样 **experimental**。

即：清单里已 adopt 的 Claude Code 是 myco 最稳的接入对象；清单里处于 watch 的两个工具，在 myco 里也仍是 experimental，属于「两个未成熟叠在一起」，不宜作为首个试点。

## 证据与局限

**原文给出的具体内容**（属于可核验的设计陈述，非效果数据）：消息状态机语义（长轮询 → 租约 → 未确认则过期重投 → 5 次失败标记；CLI 异常退出则任务失败并通知发送方）、幂等投递、per-agent allow-list、`runner.access` 三档权限映射、附件 SHA-256 校验、runner 只开 outbound HTTPS、单静态二进制 + SQLite + 无 cgo、原生 macOS 签名公证、Windows 为 preview 且未签名、MIT 协议。

**只是作者主张、无数据支撑的部分**：「No VPS required」「Delegation that scales」「Safe by default」「won't interrupt a session you are typing in」——这些都是设计意图的描述，README 里没有任何 benchmark、用户案例、任务成功率、延迟数据或对比实验。

**局限**：
- 成熟度：32 stars，单作者项目，Windows 客户端标注 preview 且未代码签名（首次运行需「More info → Run anyway」），Cursor/Gemini/OpenCode 三个 preset 自认 experimental、缺乏长期实战。
- 关键能力缺失：编排模板与调度策略、MCP endpoint、团队/角色、会话 fork 全在 roadmap 未完成项里——也就是说「多智能体分工协作的落地形态」目前只提供了**连接与投递**，没有提供**分工策略本身**。
- 依赖前提较多：必须有 hub 常驻；cloud session 无法被 spawn，只能靠 `inbox wait` 或 waker 兜底；Kiro 还要额外的 ACP 网关。
- 运维面：hub 是单点，README 未提及高可用、备份、SQLite 规模上限、并发上限。
- 本次材料只有 README，未读 INSTALL.md / architecture.md / delivery.md，具体配置项和边界条件需进一步核对。

**适用条件**：你已经同时使用 ≥2 个 agent CLI（且至少一个是 Claude Code 或 Codex），并且存在跨机器或跨会话的派活需求；如果你的场景只是单机单 agent，这套东西的收益接近于零。

## 怎么试、怎么验证

**最小试用（半天内可完成，不碰生产机器）**

1. 在**一台**开发机上用 `myco hub up --tunnel tailscale`（或 App 的 Start on this computer）起 hub，不引入 VPS。
2. 用 `curl -fsSL https://<your-hub>/j/<link> | bash` 把同一台机器或第二台机器加入。
3. 只接入 2 个 agent：一个 Claude Code（native stable）、一个 Codex（native stable）。**先不要接 Cursor / Gemini / OpenCode**，避免把 experimental 的不确定性混进结论。
4. 把 allow-list 收到最小：只允许你自己/编排 agent 派活，`runner.access` 先设 `workspace`。
5. 选一件你本周真做过的、原本要手工复制粘贴的跨会话任务，跑 1:1：
   ```bash
   myco message send --to build-backend --body "<你的真实任务>" --wait 15m
   ```
6. 再选一个天然一对多的任务（如「按同一份规范改三个模块」），用标签广播：
   ```bash
   myco broadcast send --selector "group=review" --body "<任务>" --wait 30m
   ```
7. 故意做一次故障演练：任务派给一个 agent 后立刻断掉它的机器，观察租约过期重投、以及 5 次失败后的失败通知是否符合预期。

**判断有没有改善的指标（README 未提供，需自建并记录基线）**

- 人工搬运次数：一周内手工复制/粘贴 prompt 与结果的次数，试用前后对比（目标：显著下降）。
- 上下文丢失次数：因为换会话/换机器导致 agent 需要重新交代背景的次数（myco 的卖点是 resume 原会话，若不降反升，说明收益不成立）。
- 投递可靠性：`--wait` 超时率、需要重投的任务占比、触发 5 次失败上限的任务数。
- 跨机器切换成本：远程起会话/跑命令从「ssh 过去手动操作」变成一条命令后，单次耗时与出错率。
- 中断副作用：你正在输入的会话被抢占的次数（README 声称 native adapter 通过读会话记录避免打断，这条要实测）。
- 停止条件：如果两周后「人工搬运次数」没有明显下降，或者投递超时/重投频繁到需要人盯着，就停在 try，不要扩到多机多 hub，也不要指望 roadmap 里的调度策略。

**扩展到多机/团队前必须补的核对**：读 INSTALL.md 确认 hub 的备份与升级（`myco upgrade`）路径；确认 allow-list 在多 hub 场景下的行为；评估 hub 单点故障的代价。
