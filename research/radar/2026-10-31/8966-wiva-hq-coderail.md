# wiva-hq/CodeRail

- 结论：**值得一试**。可小范围试点：在自己服务器上用 Docker 起一个实例，只接一台机器和一个非关键仓库，先跑通“手机审批→终端/文件/git 核查”闭环再决定是否扩大；理由是 README 给了可直接复制的部署与加机器步骤，但版本仅 0.0.1、没有任何效果数据，且服务端保存全部会话历史（非端到端加密）。
- 原文：https://github.com/wiva-hq/CodeRail
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-31T12:30:58.491Z

## 是什么

CodeRail 是一个自托管的“编码智能体远程控制台”：把每台电脑上运行的 `claude`（Claude Code）和 `codex` 通过 ACP 适配器接到一个自建服务器上，让用户在浏览器或手机里看会话、批准/拒绝命令、开终端、读写文件、做 git 操作（含 pull request），并且每个会话还带一个跑在那台电脑上的浏览器。

架构是两段式（README 的 mermaid 图）：

- **服务器端**：一个 Docker 容器，提供 Web 应用 + API + “每台电脑一个 hub”，负责按角色校验每个请求并保存历史。
- **每台电脑**：一个 `CodeRail bridge` 进程，**只主动向外连接**服务器（README 声称不需要开端口、不需要 VPN），负责跑 agent、终端、文件、git、浏览器。

关键定位：**CodeRail 不持有任何 AI 密钥**，每台电脑用自己的 `claude`/`codex` 登录；账号是邀请制；每个电脑可有 Owner / Operator / Viewer 角色，权限细分到目录和 agent；README 称每项变更都有审计。会话在浏览器全部关闭后继续运行，历史可离线阅读；Web 应用可安装到手机。

状态：`0.0.1 early`，49 stars，Apache 2.0，macOS + Linux（Windows 只在 `docs/windows.md` 提到 handoff），仓库明确不接受 PR。

## 具体做法

> 前提：以下命令与路径均来自 README；服务器域名、HTTPS、防火墙等细节它指向 docs.coderail.codes，本文不臆测。

1. **准备条件**。一台有 Docker 的服务器（镜像 `ghcr.io/wiva-hq/coderail`，amd64 / arm64 都有）＋一个域名，并把 HTTPS 反代到 8080 端口；目标工作机为 macOS 或 Linux，且已各自登录 `claude` / `codex`。前提：版本为 0.0.1 early，建议先放在非生产环境。

2. **起服务端**（在你自己的服务器上）：

```sh
git clone https://github.com/wiva-hq/CodeRail && cd CodeRail
cp .env.example .env            # set SETUP_TOKEN
docker compose up -d            # the image from ghcr.io; everything it keeps is in ./data
```

前提：`.env` 里必须设置 `SETUP_TOKEN`；所有持久化数据落在 `./data`，也就是说备份和磁盘加密要自己负责。

3. **创建第一个管理员**。访问 `https://your-site/setup`，用第 2 步的 `SETUP_TOKEN` 建号。前提：做完这一步后应视为该 token 已用掉，按安全常识轮换/清理（README 未写轮换流程）。

4. **接入一台电脑（bridge）**。macOS：在 `Machines → Download for Mac` 下载并“approve the code”；Linux：

```sh
curl -fsSL https://your-site/install.sh | sh
```

前提：`your-site` 换成你自己的域名；README 说明每次构建也在 Releases 上并附 checksums，涉及执行远程脚本时优先走 Releases 校验后再装。

5. **配角色与权限**。按 Owner / Operator / Viewer 分配，粒度可到文件夹和 agent；账号为邀请制，服务端与电脑端各校验一次权限。前提：先按最小权限给——试点阶段只给自己 Owner，别急着发 Operator。

6. **跑一次真实任务并走审批闭环**。在会话里让 agent 干活，出现命令审批时在浏览器点 allow/deny，或在手机推送里批；同时用同一屏的 git 变更、终端、文件面板核对它到底改了什么。前提：手机审批只是通道，**批之前必须看 diff**，README 没有提供审批策略模板。

7. **升级**：

```sh
git pull && docker compose pull && docker compose up -d
```

前提：早期版本升级可能带数据结构变化，升级前备份 `./data`。

8. **（可选）本地跑开发版验证行为**：

```sh
bun install
bun run dev:server     # server on :8787, data in ./data
bun run dev:web        # the web app on :5173, /api proxied to :8787
cd bridge && bun src/main.ts link http://localhost:8787 --no-service
```

前提：需要 Bun；`--no-service` 表示不注册为系统服务，适合先在本机摸清 bridge 行为再上生产机。

9. **上线前必读**：`docs.coderail.codes/reference/security` 的安全模型；README 明确写了“**不是端到端加密，历史存在你的服务器上**”，所以服务器本身的安全等级就是全部工作内容的安全等级。

## 对应的研究问题

- **1 能力发现（AI 还能接管哪些没想到的工作）**：有间接依据。它把“人必须守在电脑前点同意”这一隐含前提去掉了——会话在浏览器关闭后继续跑、历史可离线读、审批可在手机上完成，等于把“离场时段”也变成可推进的工作时间。属于工作方式层面的新能力，不是模型能力。
- **2 任务匹配**：依据有限。README 只说明支持 Claude Code 与 Codex 两个 agent、通过 ACP 暴露 plans / tool calls / models / modes / background tasks，并可按电脑、文件夹、agent 分配角色；对“什么任务配什么模型/模式”没有给任何映射建议。可确认的匹配结论只有一条：**编码类、且需要人审批与核查 diff 的任务**是它的目标场景（终端、文件、git、PR、浏览器齐备）。
- **3 条件供给（要给哪些信息、工具、权限、反馈）**：这是最有依据的一条。它给出的供给清单是：给 agent 一台已登录的电脑 + 真实终端 + 文件读写 + git/PR + 一个可共享、可被 agent 驱动的浏览器；给人一侧给的是浏览器/手机审批通道、按角色的最小权限、邀请制账号、逐项审计；反馈通道就是“审批 allow/deny + 旁边的 diff 与终端输出”。配置方式即上面第 2–5 步。
- **4 主动推进**：部分依据。会话不随浏览器关闭而停止、README 提到 background tasks、审批推送使“事件触发式继续”可行；但**没有**给出定时/事件/状态触发的配置方法，调度层要自己补。
- **5 效果验证**：弱依据。可用的只有“每项变更被审计 + 历史留存 + git 变更与终端并排可核对”，这是**审查面**而非**效果指标**；原文没有任何关于产出质量、节省时间的度量或数据。

## 与已有做法的关系

清单中相关条目：**Claude Code（状态 adopt）**。

CodeRail 不替代 Claude Code，也不改变模型能力，它是 Claude Code / Codex 外面的**远程控制与权限层**：把“在终端里守着权限提示”换成“跨机器、多角色、可审计、可在手机上批”。因此它与清单里的 adopt 条目是叠加关系——原本的 adopt 做法（在本机用 Claude Code）不变，新增的是离场可用性、团队角色与审计留痕。原文未与其他远程智能体控制台/自托管方案做任何对比，也没有给出与本清单其他条目的关系说明。

## 证据与局限

**原文给出的可核对内容**：完整部署命令（clone / `.env` + `SETUP_TOKEN` / `docker compose up -d`）、首次管理员入口 `/setup`、两种加机器方式（Mac 菜单栏应用、Linux `install.sh`）、升级命令、本地开发命令、镜像地址与架构（amd64/arm64）、许可证（Apache 2.0）、版本号（0.0.1 early）、平台（macOS/Linux，Windows 仅 handoff 文档）、仓库结构（server/bridge/web/mac/protocol/docs）。

**只是作者主张、无法从材料核实**："outbound only"、服务端与电脑端双重权限校验、Mac 构建已签名并公证、每次变更都被审计、会话在浏览器关闭后确实继续运行。

**明确的自承局限**：非端到端加密、服务器保存历史；服务器若被入侵，等于全部会话与代码上下文泄露。

**材料本身的局限**：没有任何使用案例、用户数、性能数据或对照实验；49 stars、`0.0.1 early`、不接受 PR，说明成熟度与维护模式都不确定（商业公司 Wiva, Inc. 主导）；README 未提供审批策略、密钥轮换、备份恢复、多用户冲突处理的具体做法；"background tasks" 与浏览器共享只提及功能名，无操作细节。

**适用条件**：有自控服务器与域名、能自己做 HTTPS 与备份；工作机是 macOS/Linux；团队规模小、可强制最小权限；能接受“服务器持有全部历史”这一风险。不适合：无法自托管、需要端到端加密、或需要 Windows 工作机的场景。

**额外风险（推论，非原文）**：手机一键审批把“看上下文”这一步压缩掉了，误批概率上升；README 未提供任何防护设计。

## 怎么试、怎么验证

**最小试用（建议 1–2 周）**：1 台闲置 VPS + 1 台工作机 + 1 个非关键仓库（禁止直连生产分支）+ 1 个真实但可回滚的任务（例如修一个 bug 或补一组测试）。只给自己一个 Owner 账号，先不邀请他人；给 Operator 的写权限不要落到主分支。同时在本地终端用 Claude Code 跑一个同类任务作对照。

**判断有没有改善的指标**：

1. **审批响应时延**：从审批请求出现到 allow/deny 的中位时间；以及“离开工位期间（会议、通勤）累计完成并被批准的动作数”。对比基线＝必须回到电脑才能批。
2. **误批率**：事后回看审计记录与 git diff，统计“当时批准但事后判定不该批准”的命令数。目标为 0；出现 1 次即停用复盘。
3. **会话连续性**：关掉浏览器后任务继续运行的比例、历史在离线状态下能否完整读到。
4. **人工干预次数与总时长**：同一任务对照本地终端跑，比较干预次数与端到端耗时，看“远程”是否真的省时而非增加核查成本。
5. **暴露面自检**：公网只开 443、`SETUP_TOKEN` 已轮换、账号全为邀请制、`./data` 有备份且磁盘加密。任一项不达标不上生产。

**升级到多机器/多人的门槛**：连续两周误批为 0、审批时延明显下降、且至少一个任务在完全离场的情况下被推进到可合并状态；否则维持单人单机，或降级为只读观察（Viewer）。
