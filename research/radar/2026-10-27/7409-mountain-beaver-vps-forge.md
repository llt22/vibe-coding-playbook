# mountain-beaver/vps-forge

- 结论：**值得一试**。先在一台一次性 VPS 上照它的安装命令和 dead-man switch 流程跑一遍（先只做只读审计，再放开改动），确认能自动回滚、告警能到、备份能恢复之后，再考虑用到真机；值得试的理由是它给的是可照抄的安装命令、逐步执行协议和一套外部验收口径，而不只是清单，但基准测试用的是预发布版本、判分器由作者自写、样本小且场景已被针对性修订过，直接上生产风险不对等。
- 原文：https://github.com/mountain-beaver/vps-forge
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T23:56:44.586Z

## 是什么

vps-forge 是一个面向 Debian 12/13 与 Ubuntu 22.04/24.04/26.04 VPS 的 Agent Skill（`skills/vps-forge/SKILL.md`，纯 Markdown + bash），让编码智能体按固定顺序完成「新机上线 / 加固 / 审计」：建只持有你 SSH key 的管理员用户、关掉 root 与密码登录、防火墙、fail2ban（paranoid 级别用 CrowdSec）、无人值守安全更新、Docker + Caddy/nginx TLS、restic 备份并强制做恢复演练、手机告警，最后在服务器上留 `SERVER.md`（解释每个开放端口为什么开）和 cloud-init 导出。

它区别于普通清单的地方是两条：

1. **每步有风险的改动都套在 dead-man switch 里**：改 sshd / 防火墙 / sudo / PAM 之前先 `arm`（快照配置 + 起 5 分钟 systemd 定时器，长改动 10 分钟），改完必须用一条**全新连接**登录成功才 `disarm`；登录失败就没人能 disarm，到点自动从快照回滚，重启也会在 boot 时回滚，并把 fail2ban 里的误封解开。
2. **验收是外部视角的**：判分器不看技能自己的脚本，从机器外面检查 sshd 提供哪些认证方式、root 能否登录、`ssh-audit` 结果、哪些端口应答、暴力破解源是否真被封、备份能否恢复出应用数据、告警是否到达；掉线（lockout）直接记 0 分。

## 具体做法

### 步骤 0：前提条件

- 目标机：Debian 12/13 或 Ubuntu 22.04/24.04/26.04，x86 或 ARM，任意厂商（Hetzner、DigitalOcean、Vultr、Linode、OVH、AWS EC2/Lightsail、Oracle Cloud、自建机）。RHEL 系未支持。
- **动手前先做两件事**：在服务商面板打快照；找到服务商的 Web 控制台（VNC 或串口）入口。技能会在第一次高风险操作前确认你知道控制台在哪。
- 第一次用**一次性机器**。
- 走 `npx` 安装路径需要 Node.js 22.20 或以上；没有 Node 就用 GitHub CLI 或 zip。
- 智能体必须能读 Agent Skills 并能执行 shell 命令（Claude Code、Codex、Cursor、GitHub Copilot、Gemini CLI、Antigravity、OpenCode、Windsurf、Cline、Amp、Roo Code 等）。纯聊天应用走 **script mode**：它只给你一段只读审计脚本让你跑完贴回，然后每个阶段给一小段脚本，每次改 SSH/防火墙前停下来要你从第二个终端登录验证，失败则服务器自己回滚；这种模式下智能体只看到你贴回去的内容，并且外部检查需要 Mac / Linux / WSL 终端。

### 步骤 1：安装技能

一条命令覆盖大多数智能体：

```bash
npx skills add mountain-beaver/vps-forge -g
```

`-g` 装到用户级（任意目录都能被智能体发现）；不加则只装进当前项目。安装时会问给哪些智能体装。

Claude Code 也可作为插件装：

```bash
claude plugin marketplace add mountain-beaver/vps-forge
claude plugin install vps-forge@vps-forge
```

后续更新：

```bash
claude plugin update vps-forge@vps-forge
```

一次只指定一个智能体时（`-a` 取值：`codex`、`cursor`、`github-copilot`、`gemini-cli`、`antigravity`、`opencode`、`windsurf`、`cline`、`amp`、`roo`）：

```bash
npx skills add mountain-beaver/vps-forge -g -a codex
```

用 GitHub CLI：

```bash
gh skill install mountain-beaver/vps-forge vps-forge --agent cursor --scope user
```

可用 `--pin v1.0.0` 锁版本。

手动拷贝（适用于任何其他智能体）：

```bash
git clone https://github.com/mountain-beaver/vps-forge
mkdir -p ~/.agents/skills && cp -r vps-forge/skills/vps-forge ~/.agents/skills/   # or your agent's skills folder
```

智能体完全不支持 skills 时，直接让它读 `skills/vps-forge/SKILL.md` 并照做。

Claude.ai / Claude Desktop：从 latest release 下载 `vps-forge-skill.zip`，Settings → Capabilities → Skills → "Upload skill" 上传，且必须开启 code execution。

### 步骤 2：确认技能真的加载了

问智能体「which skills do you have?」，看列表里有没有 `vps-forge`。

**运行期的唯一硬信号**：在做任何 SSH 或防火墙改动前，它必须执行 `vps-forge-deadman arm`。**如果它没 arm 就改了 SSH 或防火墙，立刻停掉——说明技能没加载，此时没有死人开关。**

没加载的常见原因：装到了别的项目（没加 `-g`）；会话在安装之前就开始了（智能体只在会话启动时读技能列表，开新会话）；Claude Code 插件没启用；请求听起来不像服务器工作（直接点名：「use the vps-forge skill to harden 203.0.113.10」）。

### 步骤 3：先只读审计，不改任何东西

对智能体说：

> Audit my server. Change nothing.

它给出一份按严重度排序的只读报告和一份计划。在已有生产机上，技能本身也规定「read before write」：先审计，你不批准就不动。这一步用来在真机上零风险地验证技能是否加载、报告是否靠谱。

### 步骤 4：单独验证死人开关（不依赖智能体）

在一台一次性服务器上，用有 sudo 的用户登录，**保持这个会话开着**：

```bash
curl -fsSLO https://raw.githubusercontent.com/mountain-beaver/vps-forge/v1.1.1/skills/vps-forge/scripts/deadman.sh
less deadman.sh                                                       # read it before running it as root
sudo install -m 755 deadman.sh /usr/local/sbin/vps-forge-deadman
sudo vps-forge-deadman arm 1                                          # roll back in one minute
echo 'AllowUsers deploy' | sudo tee /etc/ssh/sshd_config.d/50-users.conf   # you aren't "deploy"
sudo sshd -t && sudo systemctl reload ssh                             # valid config, so it's applied
```

然后从你自己的机器用一条新连接登录（`ssh -o ControlPath=none you@server`），应当被拒；等一分钟，在仍开着的会话里执行 `sudo vps-forge-deadman status`，应显示 `ROLLED BACK`，`50-users.conf` 消失，新连接恢复可用。没有备用服务器时，`make deadman-systemd` 会在 podman 容器里跑这套以及更多场景（坏掉的防火墙、armed 状态下重启、ufw 与 fail2ban）。

### 步骤 5：正式交给它做（提示词可直接用）

```
I just bought a VPS at 203.0.113.10, I log in as root. Make it a proper production server for my Docker app on app.example.com, with backups and alerts to my phone.
```

不需要特殊措辞。智能体会加载技能，问最多四个简短问题，给出计划，然后分阶段执行：用它**你自己的** SSH key 登录（它不持有自己的 key），创建一个只含这把 key 的管理员用户，**等新登录验证通过之后**才关 root 登录。

其他可用的口语化请求（README 给了「你说什么 → 它做什么」对照）：

- 「Move SSH to 2222 and add fail2ban. Nothing else.」→ 自 1.1.0 起只做被要求的，附一行「其余要不要做」的提议。
- 「Send alerts to my phone.」→ ntfy / Telegram / webhook，覆盖登录、失败、磁盘满、备份异常。
- 「SSH only through Tailscale.」→ 先证明 VPN 登录可用，才关公网 SSH。
- 「Is my server hacked?」→ 失陷排查，发现迹象就停下并引导重建。
- 「Get this VPS ready for Coolify.」→ 同样加固，但保留 root 的 key 登录给面板、其代理占用 80/443、域名通了之后关掉面板端口；Dokploy / CapRover / Kamal / Dokku 同理。

### 步骤 6：执行过程中的检查点

- 每次 SSH / 防火墙 / sudo / PAM 改动前：`deadman.sh arm` 快照配置并起定时器。
- 改动后先做语法校验：`sshd -t`、`visudo -c`、`nft -c`。
- 再用**不能复用旧连接的新连接**登录验证。
- 只有登录成功才 disarm。
- 服务商面板上的防火墙（Hetzner / DigitalOcean / AWS 安全组）和网络层改动**不在回滚范围内**：这类改动它先加新规则、证明新登录可用、再删旧规则，让错误表现为多开一条规则而不是把你锁在外面。
- 所有回滚都写进 journal（标记 `vps-forge-deadman`），配好手机告警后还会推一条高优先级「Deadman fired」。

### 步骤 7：选择加固级别与 profile

默认 `hardened`；`baseline` = 仅密钥、关 root、默认拒绝防火墙、fail2ban；`paranoid` = 再加 FIDO2/TOTP、SSH 只走 VPN、Cloudflare-only web、CrowdSec、第二份异地备份仓库。Profile 可与任意级别组合：`web`、`docker`、`vpn`、`db`、`worker`、`game`。

几个需要你拍板的点：sudo 要不要密码（免密更简单，但 key 被偷即等于 root；要密码时技能用一个 4 小时后自动过期、跨重启仍有效的临时免密授权，并在最后一步自行撤销）；改 SSH 端口、关密码登录、开启自动重启前它默认会问，除非你让它自己决定。

### 步骤 8：收尾验收

完成的机器上应当有：只含你 key 的管理员用户、root 与密码登录关闭、`AllowGroups` 已设、SSH 加密算法版本感知且能过 `ssh-audit`；ufw 或 nftables 默认拒绝且 IPv4/IPv6 对齐、Docker 发布端口也被覆盖、你自己的 IP 优先放行；fail2ban 用 systemd backend + recidive，且启动前你的 IP 已在 ignore 列表；无人值守安全更新（含它添加的第三方仓库）加 needrestart；Docker 绑 localhost、Caddy/nginx 带 TLS 与安全头；restic 备份到第二块盘或对象存储并跑过恢复测试（Postgres/MySQL/SQLite 先 dump 再备，绝不直接拷活文件）；SSH 登录与健康异常的手机告警带去重与心跳；状态 motd、`/etc` 用 etckeeper 进 git、`SERVER.md` 解释每个开放端口；cloud-init 导出可让下一台机器长得一样。

若它从云沙箱而不是你的机器上运行，结束时还会把自己的 IP 从防火墙、fail2ban、sshd 白名单里删掉；`audit.sh` 会标出任何残留。

### 步骤 9：真被锁在外面怎么办

1. 等定时器：armed 的开关会在 5 分钟（长改动 10 分钟）后自己回滚；重启过则在 boot 时回滚。
2. 从服务商控制台看 `vps-forge-deadman status` 确认时间。
3. 还进不去就检查服务商面板的防火墙（开关回滚不了它），再从 VNC/串口执行 `vps-forge-deadman restore`，或回退 `/etc` 里最后一次 etckeeper 提交。

### 技能内置的几条纪律（可迁移到别的工作）

- **Read before write**：运行中的服务器先审计，你不批准不改。
- **密钥不过聊天**：口令与 token 在服务器上生成、以 mode 600 存储、通过 stdin 传给工具，绝不作为命令行参数。
- **版本要查不要猜**：OpenSSH 算法、Ubuntu 24.04 的 socket-activated SSH、fail2ban backend 各版本都不同。
- **已知坑写进技能**：cloud-init 的 `50-cloud-init.conf` 会盖过 `99-` drop-in 重新打开密码登录（sshd 只读第一个值）；Debian 12+ 没有 `auth.log` 导致 fail2ban 找不到日志；Docker 发布端口直接绕过 ufw。

## 对应的研究问题

**1. 能力发现（AI 能做哪些还没想到交给它的活）**

- 整机上线 + 加固 + 备份 + 告警 + 文档，一次对话完成，而不是只「把应用跑起来」。README 明确点出智能体常规跳过的部分：过不了扫描的 SSH 加密、从未开启的防火墙、谁也没封的 fail2ban、有人登录却无告警。
- 只读安全审计并给按严重度排序的报告与计划。
- 失陷排查（发现迹象就停手转而引导重建）。
- 迁移式工作：把一台机器的配置导成 cloud-init，让下一台一模一样。
- 反例校准：基准里不带技能时 Opus 已经能拿 79–92 分（未加固的裸机是 25–42），说明「配服务器」本身已在能力圈内；技能补的是最后 8–20 分——而这 8–20 分恰好是最容易在几周后才咬人的部分。这条对「能力发现」的意义是：**不要问「AI 会不会做」，要问「它默认会漏掉哪几项」**。

**2. 任务匹配（什么工作适合什么模型、工具、协作方式）**

- 模型证据：完整基准只有 Claude Opus 5.5（120 次运行）；GLM-5.3 只做了 4 次手工点检（Debian 13、两个场景，在 ZCode 桌面应用里跑）。其他智能体与模型未测。
- 工具形态：任何能加载 Agent Skills 且能执行 shell 的智能体；技能本体是纯 Markdown + bash，无私有运行时。
- 协作方式分两档：本地智能体（从你的机器 SSH 过去，用你的 key，能自己做外部验证）vs 纯聊天 + script mode（你当执行器，它只看到你贴回的内容，外部检查还需要 Mac/Linux/WSL 终端）。README 明确说 script mode 是能力受限档。
- 任务粒度匹配：自 1.1.0 起「窄请求只做窄事 + 一行提议」，而基准测的是「窄请求也套完整基线」的旧行为——**你要的粒度决定你能不能引用那组分数**。

**3. 条件供给（需要给哪些信息、工具、权限、反馈）**

- 信息：IP、当前登录方式（是否 root）、应用形态（Docker/域名）、备份与告警的去向；智能体最多问四个简短问题。
- 工具：能 SSH 的 shell、`ssh-audit`、服务商快照与 Web 控制台（VNC/串口）——技能会在第一次高风险操作前确认你知道控制台在哪。
- 权限：你的 SSH key（它不持有自己的 key）；sudo 是否免密的决策；生产机上「先审计、你批准才改」的审批点。
- 反馈闭环：每次改动后必须用新连接登录验证才算成功——这是把「命令执行成功」和「服务真的还能进」区分开的关键设计。
- 密钥卫生：口令/token 在服务器上生成、mode 600、经 stdin 传递。

**4. 主动推进（时间/事件/状态触发并持续完成）**

这是该技能最强的一块，且全是可照搬的触发模式：

- **定时回滚（状态触发）**：arm 起 5 分钟（长改 10 分钟）systemd 定时器，没人 disarm 就回滚；重启后在 boot 阶段补做回滚。
- **定时任务**：restic 备份走 timer，每周做一次仓库检查；无人值守安全更新；可选重启窗口。
- **事件触发告警**：SSH 登录、健康异常、磁盘满、备份失败推手机，带去重与心跳（心跳缺失本身也是信号）。
- **顺序约束代替人工盯梢**：先加新规则、验证新登录、再删旧规则；先证明新用户能登录、再关 root——把「不能中断」编码成执行顺序。
- 技能里还有 `extend`（延长 armed 时长）等操作，说明这套协议考虑到了长任务的续期。

**5. 效果验证（怎么判断确实改善了结果）**

- 判分方式是**从机器外部、重启前后各查一遍**，且不使用技能自己的脚本：你的 key 能否登录、sshd 提供哪些认证方式、root 能否登录、`ssh-audit` 结果、哪些端口应答、暴力破解源是否真被 ban、备份能否恢复出应用数据、告警是否到达；**掉线记 0**。
- 明确的「不该发生」指标：智能体把自己的管理 IP 封掉（无技能 7/60，有技能 0/60）、管理员被锁在外面（两边都是 0/60）。
- 反面教材很有价值：Lynis 这类通用加固指数几乎不动（69 vs 71、72 vs 72、64 vs 72、73 vs 72），说明**通用评分测不出你关心的改善**；技能是针对具体检查项做的，而判分器也跑 `ssh-audit`——作者自己把这条列为局限（「技能瞄准判分器检查的东西」）。
- 还报了成本维度：中位耗时 5–8 分钟 vs 3–6 分钟，API 标价中位 $1.87 vs $0.62（约 3 倍）。
- 遗留物检查：`audit.sh` 标出技能自己留下的痕迹（临时 sudo 授权、白名单 IP）。

## 与已有做法的关系

- **Claude Code（adopt）**：vps-forge 提供 Claude Code 插件式安装（marketplace + plugin install + plugin update），并在 Claude Code 里有明确的加载校验方式（`/plugin` 里确认已启用）。可作为「把一套流程固化成 Claude Code 插件」的样例。
- **Agent skills（adopt）**：这是 Agent Skills 标准（`SKILL.md`）的一个完整实现，且示范了技能里应当放什么：不只放知识，还放**脚本 + 执行顺序 + 安全网 + 已知坑 + 验收口径**。对「怎么写一个好技能」比对这个具体工具更有参考价值。
- **Cline / Cursor / OpenCode（watch）**：三者都在技能的安装目标列表里（`-a cline` / `-a cursor` / `-a opencode`），但都**没有进入基准测试**，只有安装路径上的支持，没有效果证据。
- **GitHub Copilot（drop）**：技能列了 `-a github-copilot` 安装入口，但既无测试也无必要——按清单状态不必在这条线上投入。
- **ZCode（avoid）**：唯一的跨模型证据（GLM-5.3，4 次运行、79→100 与 67→100）恰恰是在 ZCode 里手工跑的，作者自己定性为「anecdote, not a benchmark」。清单中该项为 avoid，所以这条证据只能当作「可能可迁移」的弱信号，不能作为采用依据。

## 证据与局限

**原文给出的数据**（全部来自作者自述的基准）：

- 规模：120 次运行，Claude Opus 5.5，真实 QEMU 虚拟机，官方 cloud image（Debian 12/13、Ubuntu 22.04/24.04/26.04），每格重复 3 次，提示词声明用户离线、智能体自行决定。
- 总分（满分 100，外部检查通过率均值）：生产 Docker 机 79 → 99；新机到生产 88 → 100；SSH 改端口 88 → 100；带 sudo 用户的新机 92 → 100。
- 逐项：`ssh-audit` 无失败 4/60 → 60/60；新 SSH 登录告警 16/30 → 30/30；主机防火墙启用 46/60 → 60/60；暴力破解源真被封 50/60 → 60/60；root 无法登录 30/60 → 57/60；备份能恢复应用数据 30/30 → 30/30（本来就都对）；智能体自封 IP 7/60 → 0/60；掉线 0/60 → 0/60。
- 另有 18 项检查两边全过，未展示。
- 差异归因：约 70% 的分差来自技能自带的三个默认值（干净的 `ssh-audit`、关 root、每次 SSH 登录告警）；把这三项拿掉，新机场景是 100 vs 100、100 vs 100，生产机 91 vs 100，改端口 93 vs 100。真正在默认值之外的剩余差异是：生产机上 fail2ban 是否真能封人（无技能 6/15，有技能 15/15）、用户没要求的主机防火墙、以及不自封。
- 成本：中位耗时 5–8 分钟 vs 3–6 分钟；API 标价中位 $1.87 vs $0.62。
- 跨模型点检：GLM-5.3 在 ZCode 手工跑 4 次，新机 79 → 100、生产机 67 → 100，无掉线无自封；拿掉三个默认检查仍是 94 vs 100、77 vs 100。

**这些是作者主张，不是独立验证**：死人开关的设计保证「没有被基准证明」——两边都没人被锁在外面，因为「Opus 本身就够小心」。基准实际测到的只是近似事故：智能体把自己的 IP 封掉。

**适用条件与局限（作者自己列了大部分）**：

- 判分器由技能作者本人编写，且技能明确瞄准判分器会跑的 `ssh-audit`；虽然 harness 已公开可复现，但存在同源偏差。
- 每格 3 次、单一模型、单一判分器，样本小。
- **场景不是盲测**：早前版本在前三个场景上分别得 92、100、89，其中 45 次里有 12 次是智能体自己的测试登录触发了它刚设好的 fail2ban；技能正是针对这些失败改的，所以那三个场景已不再能盲测它。第四个场景（只带 sudo 用户的新机）是改版后才加的。
- 基准跑的是**预发布版技能**；1.0.1 只改文字，1.1.1 只改 README/图片/打包；1.1.0 改了基准没覆盖的行为（窄请求只做窄事、临时 sudo 授权加期限、恢复演练要检查应用数据、在 Kubernetes 节点和 hypervisor 宿主上停止），Unreleased 里的（部署面板、script mode、更安静的登录告警、`extend`）也没测。**所以「窄请求也拿 100」这条已不成立**。
- 「关 root 登录」是判断题：判分器把仍能用 key 登录 root 的机器判失败，而两个场景的提示词明说用户今天就是以 root 登录，保留 key-only root 是站得住的；去掉这一项，分数是无技能 85–93、有技能 100。
- **提问与审批流程从未被测过**：所有提示词都声明用户离线、智能体自行决定，所以技能的 intake 提问和审批步骤一次都没跑。而作者又说「那才是真实用户的常态模式」，这两句互相削弱。
- 适用面窄：只覆盖 Debian/Ubuntu VPS 加固这一类工作；RHEL 系在路线图上。

## 怎么试、怎么验证

**最小试用（建议 2–3 小时，一台一次性 VPS）**

1. 打快照、记下 Web 控制台入口。
2. 先做步骤 4 的手工 dead-man 验证（`arm 1` → 写坏 `AllowUsers` → 新连接被拒 → 等 1 分钟 → `status` 显示 `ROLLED BACK` → 新连接恢复）。**这一步过不了就别往下走。**
3. 装技能（`npx skills add mountain-beaver/vps-forge -g`），验证 `which skills` 里有它。
4. 先跑只读档：`Audit my server. Change nothing.`，看报告是否分严重度、是否说清每个开放端口的用途。
5. 再跑一次完整档：用步骤 5 的提示词，全程盯着「每次 SSH/防火墙改动前是否 `arm`」。没 arm 就停。
6. 同样任务再开一台裸机，不带技能跑一遍做对照。

**判断有没有改善的指标（按可观测性排序）**

- 硬信号：整个过程里智能体是否**每次都**在 SSH/防火墙改动前执行 `vps-forge-deadman arm`（漏一次就是技能没生效，其余指标无意义）。
- 从机器外检查（重启前后各一次）：`ssh-audit` 是否零失败；主机防火墙是否真的启用；root 是否无法用密码/key 登录（按你的策略判定）；只应有你需要的端口应答。
- 用一台测试源做暴力破解，确认它**真的**被封（这是基准里无技能时最不稳的一项：生产机上 15 次只有 6 次做到）。
- 备份演练：删掉应用数据，从 restic 恢复，确认**应用数据**回来（不是只确认仓库能 list）。
- 从一台新机器 SSH 登录，确认手机告警真的到达。
- 负面指标：智能体是否封掉自己的 IP；你是否被锁在外面；结束时用 `audit.sh` 看有没有残留的临时 sudo 授权或白名单 IP。
- 成本指标：耗时与 token 花费（对照基准的 5–8 分钟 vs 3–6 分钟、约 3 倍成本），判断这点加固对你的机器值不值。
- **不要**用 Lynis 之类的通用加固指数当验收标准——原文数据里它几乎不动。

**决定是否升级为 adopt 的门槛**：连续 2–3 台机器上，上述硬信号与外部检查全过、无自封无掉线、恢复演练成功、成本可接受，再考虑用到生产机；生产机第一轮仍应只跑只读审计，改动分批批准。
