# 先在一台一次性环境里验收 agent 技能，再让它碰生产运维

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：面对只有 README 或作者自测的运维类 agent 技能包，如何用一次性环境和外部验收标准，小范围验证它真的能安全执行，而不是凭宣传直接上生产。
> 先试这一步：选一台一次性 VPS 或一个真实 SRE 任务，先让 agent 只读审计或出草稿、不改任何东西，并确认它确实加载了技能。
> 最近修订：2026-10-27

## 解决什么问题

运维类 agent 技能包常常看起来能直接安装、点名调用，但材料里往往只有 README 或作者自测：技能正文质量、步骤是否完整、能否改善实际工作都没有独立验证。更危险的是会改服务器的技能——如果它没加载、没有回滚机制，一次 SSH 或防火墙改动就可能把你锁在外面。

本手册给出一套小范围试用方法：只选一个真实任务和一个团队或一台一次性机器，先只读审计或出草稿，再单独验证回滚或计算机制，然后用真实输入放开改动，按外部可观察的产出项人工核对，最后用小样本对比决定是否继续用。目标是把 agent 产出当可评审草稿，而不是直接上生产。

## 适用与不适用

适用：
- 团队做 SRE、生产运维、可靠性工程，手头有真实运维数据或事件材料。
- 要给一台新 VPS 做上线、加固或审计，目标机是 Debian 12/13 或 Ubuntu 22.04/24.04/26.04，x86 或 ARM。
- 已使用 Claude Code 或其他兼容 Agent Skills 的智能体，想验证技能包在具体任务上的产出质量或执行安全性。
- 愿意使用一次性环境，安排人工复核后再落地。

不适用：
- 没有运维数据、事件报告、SLO 目标，或没有一次性机器、快照和控制台，只想让 agent 凭空写文档或直接改生产。
- 非 SRE、非服务器运维任务。
- 还没人工核对，就打算把产出直接用于生产变更、对外承诺或大规模推广。
- 期待技能包已经证明能提升可靠性结果；当前没有这类独立数据。
- 目标机是 RHEL 系：vps-forge 未支持。

## 前置条件

- 已安装 Claude Code，或使用支持 Agent Skills 的智能体；vps-forge 还要求智能体能执行 shell 命令。
- 能按所选方式安装技能：能运行 `npx skills`，或能访问 GitHub 并写入技能目录；走 `npx` 安装 vps-forge 需要 Node.js 22.20 或以上。
- 服务器加固类：准备一台一次性 VPS；动手前在服务商面板打快照，并找到 Web 控制台（VNC 或串口）入口。
- 纯聊天应用走 script mode 时，需要 Mac、Linux 或 WSL 终端做外部检查；智能体只看到你贴回去的内容。
- SRE 分析类：准备一个具体任务和一个团队，不要一次铺开多个任务；准备真实输入：SLO 任务需要 4 周请求量、非 5xx 比例、p90/p99 延迟；postmortem 任务需要真实事件报告；告警任务需要明确 SLO 目标。
- 跑 burn-rate 计算器需要本机有 `python3`。
- 指定人工核对人，并约定“未核对不落地”；服务器改动还要约定谁能在锁死后通过控制台恢复。

## 操作步骤

1. 选一个具体任务和一个环境，写清试用边界。
前提：有真实输入或一次性机器。
预期结果：只针对一个任务试用，例如：
- 用 `sre-slos-and-error-budgets` 给 checkout API 提 SLO 草稿；
- 用 `sre-postmortem` 评审一次真实事件报告；
- 用 `sre-monitoring-and-alerting` 把 99.9% SLO 转成 Prometheus 告警；
- 用 vps-forge 给一台一次性 VPS 做只读审计和一次加固。
不要一次铺开 README 声称的 8 个 SRE 技能，也不要在第一台机器上直接动生产。

2. 安装技能，只装当前任务需要的。
做法 A：服务器加固类（vps-forge）。一条命令覆盖大多数智能体：
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
智能体完全不支持 skills 时，直接让它读 `skills/vps-forge/SKILL.md` 并照做。Claude.ai / Claude Desktop：从 latest release 下载 `vps-forge-skill.zip`，Settings → Capabilities → Skills → "Upload skill" 上传，且必须开启 code execution。

做法 B：SRE 分析类。只装一个技能到 Claude Code，适合最小试点：
```bash
npx skills add paulip114/sre-practice-skills --skill sre-postmortem -a claude-code
```
全量安装，适合先看覆盖面：
```bash
npx skills add paulip114/sre-practice-skills
```
全局安装到所有项目：
```bash
npx skills add paulip114/sre-practice-skills -g
```
手动安装（前提：能访问 GitHub，能写入 `~/.claude/skills`）：
```bash
git clone https://github.com/paulip114/sre-practice-skills
mkdir -p ~/.claude/skills && cp -r sre-practice-skills/sre-* ~/.claude/skills/
```
怎么选：第一次试用优先做法 B 的单技能安装或做法 A 的一次性机器安装；只有要横向评估多个 SRE 任务时才用全量安装或全局安装。
预期结果：技能安装完成。README 说技能可由描述自动加载，也可明确点名；自动加载目前只是 README 主张，建议点名调用验证。

3. 确认技能真的加载了。
前提：安装完成，会话是在安装之后新开的。
预期结果：问智能体「which skills do you have?」，列表里有当前技能。
- vps-forge 的运行期唯一硬信号：在做任何 SSH 或防火墙改动前，它必须执行 `vps-forge-deadman arm`。如果它没 arm 就改了 SSH 或防火墙，立刻停掉——说明技能没加载，此时没有死人开关。
- 没加载的常见原因：装到了别的项目（没加 `-g`）；会话在安装之前就开始了（智能体只在会话启动时读技能列表，开新会话）；Claude Code 插件没启用；请求听起来不像服务器工作（直接点名：「use the vps-forge skill to harden 203.0.113.10」）。
- SRE 技能：用点名调用更稳，例如 `Use sre-postmortem to review this incident write-up.`

4. 先只读审计或出草稿，不改任何东西。
前提：技能已加载，真实材料已准备。
服务器加固类，对智能体说：
```text
Audit my server. Change nothing.
```
预期结果：它给出一份按严重度排序的只读报告和一份计划。在已有生产机上，技能本身也规定「read before write」：先审计，你不批准就不动。这一步用来在真机上零风险地验证技能是否加载、报告是否靠谱。
SRE 分析类，用真实数据点名调用：
```text
Use sre-slos-and-error-budgets to propose starter SLOs for our checkout API.
Last 4 weeks: 3.2M requests, 99.62% non-5xx, p90 latency 380 ms, p99 1.1 s.
```
使用时把数字换成团队真实数据。预期结果：得到一份 SLO 草稿或评审意见，包含 SLI、测量位置、初始 SLO、每 4 周允许的错误数、目标依据、测量盲点、4 周滚动窗口、填好的 SLO 文档、产品/开发/运维确认步骤、错误预算政策、burn-rate 告警下一步建议。注意：README 的示例表被标为节录、仅作示意，不能当真实效果数据。

5. 单独验证回滚或计算机制，不依赖 agent。
做法 A：会改服务器的技能，先验证 dead-man switch。在一台一次性服务器上，用有 sudo 的用户登录，保持这个会话开着：
```bash
curl -fsSLO https://raw.githubusercontent.com/mountain-beaver/vps-forge/v1.1.1/skills/vps-forge/scripts/deadman.sh
less deadman.sh                                                       # read it before running it as root
sudo install -m 755 deadman.sh /usr/local/sbin/vps-forge-deadman
sudo vps-forge-deadman arm 1                                          # roll back in one minute
echo 'AllowUsers deploy' | sudo tee /etc/ssh/sshd_config.d/50-users.conf   # you aren't "deploy"
sudo sshd -t && sudo systemctl reload ssh                             # valid config, so it's applied
```
然后从你自己的机器用一条新连接登录：
```bash
ssh -o ControlPath=none you@server
```
预期结果：新连接应当被拒；等一分钟，在仍开着的会话里执行 `sudo vps-forge-deadman status`，应显示 `ROLLED BACK`，`50-users.conf` 消失，新连接恢复可用。没有备用服务器时，`make deadman-systemd` 会在 podman 容器里跑这套以及更多场景（坏掉的防火墙、armed 状态下重启、ufw 与 fail2ban）。
做法 B：只做分析的技能，跑一次计算器或打开 references 核对。前提：已克隆仓库并进入仓库目录，本机有 `python3`。
```bash
git clone https://github.com/paulip114/sre-practice-skills
cd sre-practice-skills
python3 sre-monitoring-and-alerting/scripts/burn_rate.py --slo 99.9 --period-days 30
```
README 给出的实际输出：
```console
SLO 99.9% over 30 days -> error budget 0.1%
A 100% outage exhausts the budget in 43.2m

severity  budget    long   short    burn   threshold
page          2%    1.0h    5.0m    14.4       1.44%
page          5%    6.0h   30.0m       6        0.6%
ticket       10%    3.0d    6.0h       1        0.1%
```
预期结果：脚本能跑通，输出可与 README 示例对照。这个步骤只验证计算器本身，不验证技能正文质量。还要打开并核对模板和参考文件，再让 agent 使用；README 列出的路径包括：
```text
sre-slos-and-error-budgets/references/        SLI 清单、SLO 文档模板、错误预算政策模板
sre-monitoring-and-alerting/references/prometheus-rules.md
sre-incident-response/references/             实时事件状态文档模板
sre-postmortem/references/                    postmortem 模板
sre-release-and-launch/references/            上线检查清单、生产最佳实践审计清单
sre-capacity-and-system-design/references/    粗略估算速查表
```
README 没有展示这些文件的正文，不能只凭路径相信内容；使用前打开文件核对。

6. 正式交给 agent 执行或产出。
服务器加固类，提示词可直接用：
```text
I just bought a VPS at 203.0.113.10, I log in as root. Make it a proper production server for my Docker app on app.example.com, with backups and alerts to my phone.
```
不需要特殊措辞。预期结果：智能体会加载技能，问最多四个简短问题，给出计划，然后分阶段执行：用它你自己的 SSH key 登录（它不持有自己的 key），创建一个只含这把 key 的管理员用户，等新登录验证通过之后才关 root 登录。
其他可用的口语化请求（README 给了「你说什么 → 它做什么」对照）：
- 「Move SSH to 2222 and add fail2ban. Nothing else.」→ 自 1.1.0 起只做被要求的，附一行「其余要不要做」的提议。
- 「Send alerts to my phone.」→ ntfy / Telegram / webhook，覆盖登录、失败、磁盘满、备份异常。
- 「SSH only through Tailscale.」→ 先证明 VPN 登录可用，才关公网 SSH。
- 「Is my server hacked?」→ 失陷排查，发现迹象就停下并引导重建。
- 「Get this VPS ready for Coolify.」→ 同样加固，但保留 root 的 key 登录给面板、其代理占用 80/443、域名通了之后关掉面板端口；Dokploy / CapRover / Kamal / Dokku 同理。
如果目标是服务器加固，先确认加固级别与 profile：默认 `hardened`；`baseline` = 仅密钥、关 root、默认拒绝防火墙、fail2ban；`paranoid` = 再加 FIDO2/TOTP、SSH 只走 VPN、Cloudflare-only web、CrowdSec、第二份异地备份仓库。Profile 可与任意级别组合：`web`、`docker`、`vpn`、`db`、`worker`、`game`。几个需要你拍板的点：sudo 要不要密码（免密更简单，但 key 被偷即等于 root；要密码时技能用一个 4 小时后自动过期、跨重启仍有效的临时免密授权，并在最后一步自行撤销）；改 SSH 端口、关密码登录、开启自动重启前它默认会问，除非你让它自己决定。
SRE 分析类，继续用点名调用和真实输入：
```text
Use sre-postmortem to review this incident write-up.
Use sre-monitoring-and-alerting to turn a 99.9% SLO into Prometheus alerts.
```
预期结果：得到一份可评审的草稿、评审意见或告警规则；不要只给技能名让它自由发挥。

7. 执行过程中按检查点停。
前提：agent 已开始执行服务器改动。
检查点：
- 每次 SSH / 防火墙 / sudo / PAM 改动前：`deadman.sh arm` 快照配置并起定时器（5 分钟，长改动 10 分钟）。
- 改动后先做语法校验：`sshd -t`、`visudo -c`、`nft -c`。
- 再用不能复用旧连接的新连接登录验证。
- 只有登录成功才 disarm。
- 服务商面板上的防火墙（Hetzner / DigitalOcean / AWS 安全组）和网络层改动不在回滚范围内：这类改动它先加新规则、证明新登录可用、再删旧规则，让错误表现为多开一条规则而不是把你锁在外面。
- 所有回滚都写进 journal（标记 `vps-forge-deadman`），配好手机告警后还会推一条高优先级「Deadman fired」。
SRE 分析类则按产出项核对：SLO 任务看是否包含 SLI、测量位置、目标依据、测量盲点、4 周滚动窗口、产品/开发/运维确认步骤、错误预算政策、burn-rate 告警下一步建议；postmortem 任务看是否覆盖无责复盘、行动项和审查清单；其他任务按对应模板和检查项核对。
预期结果：记录缺失项、错误项和需要返工的地方。未通过人工核对，不进入生产变更或对外承诺。

8. 收尾验收。
服务器加固类，完成的机器上应当有：只含你 key 的管理员用户、root 与密码登录关闭、`AllowGroups` 已设、SSH 加密算法版本感知且能过 `ssh-audit`；ufw 或 nftables 默认拒绝且 IPv4/IPv6 对齐、Docker 发布端口也被覆盖、你自己的 IP 优先放行；fail2ban 用 systemd backend + recidive，且启动前你的 IP 已在 ignore 列表；无人值守安全更新（含它添加的第三方仓库）加 needrestart；Docker 绑 localhost、Caddy/nginx 带 TLS 与安全头；restic 备份到第二块盘或对象存储并跑过恢复测试（Postgres/MySQL/SQLite 先 dump 再备，绝不直接拷活文件）；SSH 登录与健康异常的手机告警带去重与心跳；状态 motd、`/etc` 用 etckeeper 进 git、`SERVER.md` 解释每个开放端口；cloud-init 导出可让下一台机器长得一样。若它从云沙箱而不是你的机器上运行，结束时还会把自己的 IP 从防火墙、fail2ban、sshd 白名单里删掉；`audit.sh` 会标出任何残留。
SRE 分析类，按第 7 步的核对清单验收，记录缺失项和返工量。
预期结果：形成可评审的机器状态或文档草稿，而不是直接对外承诺。

9. 与团队原有做法做小样本对比。
前提：至少完成 2–3 个同类任务；服务器加固类至少在一台一次性机器上完整跑通一轮只读审计加一次放开改动。
记录每次的产出完整度、人工返工次数和修改量、任务耗时、可执行性、准确性、采用意愿；服务器改动还要记录是否发生 lockout、deadman 是否按预期回滚、告警是否到达、备份是否恢复成功。
预期结果：有对比数据再决定是否继续用、缩小到某个任务，还是停止。没有独立效果数据前，试用目标应定为“验证产出质量和可执行性”，不要直接宣称改善了可靠性结果。

## 怎么判断变好了

最小试用方式：
- 服务器加固类：选一台一次性 VPS，先只读审计，再单独验证 deadman，再放开一次加固；完成一轮后复盘。
- SRE 分析类：选一个任务、一个团队，用真实输入跑一次；至少完成 2–3 个同类任务，与团队原有做法做小样本对比。
- 试多久：材料没有给出固定天数或周数；以一轮“只读审计 + 放开改动或产出 + 人工核对 + 对比”为一个最小试用批次，不要用一次产出下结论。

观察指标：
- 安全性：vps-forge 在改动前是否执行 `arm`；deadman 测试能否在 1 分钟后显示 `ROLLED BACK` 并恢复登录；是否发生 lockout（lockout 在外部判分里直接记 0 分）；手机告警是否到达；restic 备份能否恢复出应用数据。
- 产出完整度：SLO 任务是否覆盖 README 列出的字段；postmortem 任务是否覆盖无责复盘、行动项和审查清单；vps-forge 是否通过外部检查（sshd 提供哪些认证方式、root 能否登录、`ssh-audit` 结果、哪些端口应答、暴力破解源是否真被封）。
- 人工返工次数和修改量：与团队原有做法对比，是否下降。
- 任务耗时：从给出输入到形成可评审草稿或完成加固的时间是否缩短。
- 可执行性：是否产出了可指派的行动项、可确认的 SLO 文档、可用的告警规则或一台可复现的机器。
- 准确性：SLO 目标、错误预算和 burn-rate 阈值是否经人工复核无误；服务器配置是否经语法校验和新连接验证；若有错误，记录错误类型和严重程度。
- 采用意愿：产品、开发和运维是否愿意按产出的文档继续确认和落地。

判断方式：如果完整度和准确性没有提高、返工次数没有下降，或者 deadman 不触发、告警不到、备份恢复失败，就不要扩大使用；如果只在某个任务上稳定，就保留这个任务，不要直接推广到全部技能或全部机器。

## 常见坑

- 只看 README 就相信技能质量：SRE 技能包当前只能看到 README，无法审查各 `SKILL.md` 的实际正文与质量；vps-forge 的基准测试用的是预发布版本、判分器由作者自写、样本小且场景已被针对性修订过，直接上生产风险不对等。
- 没确认加载就改 SSH 或防火墙：vps-forge 的运行期硬信号是改动前必须 `arm`；没 arm 就改，说明技能没加载，此时没有死人开关。
- 把 README 的 SLO 示例表当效果数据：该表被明确标为节录、仅作示意。
- 把 burn-rate 输出当技能效果验证：它只能验证计算器本身。
- 把 vps-forge 的基准分数当生产保证：材料没有给出可外推的独立效果数据。
- 假设技能一定会自动加载：README 说会按请求描述自动加载，但没有独立验证；用点名调用更稳。
- 一次铺开 8 个 SRE 技能或第一台机器就上生产：应先选一个具体任务和一台一次性机器做小范围试用。
- 没有真实指标或事件材料就试用：SLO 示例要求提供 4 周请求量、非 5xx 比例、p90/p99 延迟；postmortem 需要真实事件报告。
- 不打开 references 正文就使用模板：README 没有展示这些文件的正文，使用前应打开核对。
- 把草稿直接用于生产变更或对外承诺：当前没有独立效果数据，必须人工核对。
- 忽略权限和许可：SRE 项目为 Apache-2.0，README 声明该许可只覆盖仓库原创内容，不重新授权 Google 原书；vps-forge 需要 sudo/SSH 权限，试用前应向团队确认。
- 忘记服务商面板防火墙不在回滚范围：deadman 只回滚配置，网络层改动要用“先加新规则、证明新登录可用、再删旧规则”的方式做。
- 用旧连接验证新配置：必须用 `ssh -o ControlPath=none` 这样的新连接；旧连接成功不代表新配置可用。
- 在 armed 状态下重启：会在 boot 时回滚，这是设计，不是故障；要知道怎么从服务商控制台执行 `vps-forge-deadman restore`，或回退 `/etc` 里最后一次 etckeeper 提交。
- 纯聊天模式看不到服务器：script mode 下智能体只看到你贴回去的内容，外部检查需要 Mac、Linux 或 WSL 终端。
- 忽略 sudo 密码选择：免密更简单，但 key 被偷即等于 root；要密码时技能用 4 小时后自动过期、跨重启仍有效的临时免密授权，并在最后一步自行撤销。
- 期待技能包主动推进：README 没有依据说明它会由时间、事件或状态触发并持续完成工作。

## 证据与来源

- SRE 技能包：操作步骤来自调研报告《paulip114/sre-practice-skills》对 README 的转述；该报告只看到 README，没有看到各 `SKILL.md` 正文，也没有独立效果数据。仓库与安装方式、8 个技能范围、SLO 产出项、burn-rate 计算器输出、自动加载说法均来自 README，是作者主张；README 的 SLO 示例表被标为节录、仅作示意，不能当效果数据。项目为非官方项目，采用 Apache-2.0，README 声明许可只覆盖仓库原创内容，不重新授权 Google 原书；初筛信息显示仓库有 49 stars。
- vps-forge：安装命令、dead-man switch 的 arm/disarm 流程、5 分钟/10 分钟回滚、语法校验、服务商面板防火墙不在回滚范围、收尾验收清单、锁死后恢复路径，均来自调研报告《mountain-beaver/vps-forge》对技能 `SKILL.md`/README 的转述。该报告认为它值得试的理由是给了可照抄的安装命令、逐步执行协议和一套外部验收口径，而不只是清单；但基准测试用的是预发布版本、判分器由作者自写、样本小且场景已被针对性修订过，因此不能把基准分数当生产保证。
- 本手册建议的观察指标（产出完整度、返工次数、耗时、可执行性、准确性、采用意愿、lockout 次数、告警到达、备份恢复）是试用方法，不是上述仓库已证明的结果。
- 适用条件：SRE 分析类适合 SRE、生产运维、可靠性工程，需要 Claude Code 或兼容 Agent Skills 的智能体，需要真实指标、事件报告或 SLO 目标；服务器加固类适合 Debian 12/13 或 Ubuntu 22.04/24.04/26.04 的 VPS，需要一次性机器、快照和控制台入口，RHEL 系未支持。

## 依据的调研

- [paulip114/sre-practice-skills](../research/radar/2026-10-23/6004-paulip114-sre-practice-skills.md)：值得一试，建议作为 SRE 场景的 Agent Skills 小范围试用：按 README 的安装命令装好技能，先选一个具体任务用真实数据跑通，再人工核对产出。理由是安装、调用提示词和烧录率计算器都可直接照做，但目前只有 README，技能正文质量与改善效果尚未验证。
- [mountain-beaver/vps-forge](../research/radar/2026-10-27/7409-mountain-beaver-vps-forge.md)：值得一试，先在一台一次性 VPS 上照它的安装命令和 dead-man switch 流程跑一遍（先只做只读审计，再放开改动），确认能自动回滚、告警能到、备份能恢复之后，再考虑用到真机；值得试的理由是它给的是可照抄的安装命令、逐步执行协议和一套外部验收口径，而不只是清单，但基准测试用的是预发布版本、判分器由作者自写、样本小且场景已被针对性修订过，直接上生产风险不对等。
