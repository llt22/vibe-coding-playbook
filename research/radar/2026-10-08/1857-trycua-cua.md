# trycua/cua

- 结论：**值得一试**。可以把 Cua 当作一套「让 AI 真正操作电脑」的试验台小范围搭起来：先用 Cua Bench 的无 VM 模拟任务跑通「建任务→跑参考解→evaluator 返回 reward=1.0」，再装 cua-driver 做 Calculator 6×7 这类有明确验收标准的首个结果；理由是原文给了可复制的安装与 CLI 命令和明确的验收口径，但详细权限/平台支持步骤都在外链文档里，且 Spaces 仅 0.1.0、CUA-S1 为早期源码研究版，尚不足以直接写进手册当标准流程。
- 原文：https://github.com/trycua/cua
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-07T16:33:33.271Z

## 是什么

Cua（trycua/cua，28,641 stars，今日 +229）是一组让 AI agent 拥有并使用计算机的组件：

- **Cua Spaces**：给 agent 完整桌面的 macOS 桌面应用，每个桌面是一个 Space（本机 macOS VM，或 Linux/Omarchy 镜像），可跑在你的 Mac、你拥有的其他机器、或你自己的云账号（AWS / Google Cloud / Modal）。
- **Cua Driver**：在 macOS / Windows / Linux 上检查和操作原生桌面应用与浏览器，可通过 CLI、MCP 或 typed SDK 接入；支持时可在不移动指针、不抢焦点的情况下后台投递操作。
- **Lume**：在 Apple Silicon 上用 Apple Virtualization.Framework 创建并管理本地 macOS / Linux VM。
- **Cua SDK 和 CLI**：一个 SDK + 一个 `cua` 命令，管理本地 VM、容器，以及任何跑 cua-spacesd 的机器。
- **CUA-S1**：小型专用「System 1」模型族，做快速、有界的计算机使用决策（首个研究档位针对表单：从结构化界面元素和文档值打分，而非逐 token 生成）。
- **Cua Bench**：构建计算机使用任务、评测 agent、导出 trajectory 用于训练。

项目自述的核心概念是 **Computer-Use 2.0**：同一个任务里，agent 在代码、API 和图形界面之间来回切换。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**步骤 1：确认前置条件**，不对就别装。
- Cua Spaces 应用：macOS 26 或更高版本。
- Lume：Apple Silicon。
- Cua Bench 的模拟任务：Python 3.12 或 3.13，并安装 [uv]；该任务不需要 VM、Docker 或模型 API key。
- Windows 下只有 Driver 有 PowerShell 安装脚本，其余组件以 macOS / Linux 为主。

**步骤 2：装整套（macOS / Linux）**。前提：只想先看全貌，接受安装器会改动本机。

```sh
curl -fsSL https://cua.ai/install.sh | sh
```

脚本在终端显示一个短清单：`cua` CLI、Cua Spaces 应用（macOS 默认勾选）、给 agent 用的 cua-driver MCP 和 skill、以及把本机作为宿主。随后执行 `cua auth login` 登录，并询问是否把 cua skills 和 cua MCP server 装进你的 AI 编程 agent（Claude Code、Codex、Cursor 等）。

- 预选某几项：`sh -s -- --select cua-driver`
- 跳过清单：`--only cua-driver`

**步骤 3：只装驱动（已有自己的 agent 时最省事）**。

macOS / Linux：

```sh
/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"
```

Windows（PowerShell）：

```powershell
irm https://cua.ai/driver/install.ps1 | iex
```

**步骤 4：做第一个有验收标准的任务**。按原文的教程走平台设置、权限和 agent 连接；然后让你的 agent 在计算器里算 6 × 7，并**验证应用显示 42**。这一步的价值是把「安装是否真的通了」变成一个可判对错的结果。

**步骤 5：接进你现有的 agent**。原文明确点名 Claude Code、Codex、Cursor、OpenClaw 等，让 agent 通过 MCP / skill 接上 Cua Driver。

**步骤 6：用沙箱做隔离的批量操作**（前提：已装好 `cua` CLI）。

```sh
cua sb create ubuntu --name dev          # a gVisor container, set up on first use
cua sb exec dev uname -a
cua sb screenshot dev
cua sb rm dev
```

同一个沙箱的 Python 写法（`pip install cua`）：

```python
from cua_sandbox import Image, Sandbox

async with Sandbox.ephemeral(Image.linux(), local=True) as sb:
    print((await sb.shell.run("uname -a")).stdout)
```

要点：**沙箱内不需要装 agent**，就绪状态来自运行时和可选的端口探测；镜像若带 cua-spacesd（端口 3211），才额外提供进程、文件、截图、经 cua-driver 的输入，以及低延迟音视频流。

**步骤 7：把自己的机器接进来**（无需端口转发）：

```sh
cua host setup
```

**步骤 8：要本地 VM 时装 Lume**（前提：Apple Silicon）。

```bash
/bin/bash -c "$(curl -fsSL https://cua.ai/lume/install.sh)"
```

首个结果：从 Apple 恢复镜像创建一个干净的 macOS Tahoe VM、启动、用 SSH 连上。

**步骤 9：搭评测回路（最贴合「效果验证」的一步）**。前提：Python 3.12/3.13 + uv。

```bash
uv tool install 'cua-bench[browser]'
uv tool run --from 'cua-bench[browser]' playwright install chromium
```

首个结果：建一个小任务，跑它的参考解，确认评测器给出的 reward 为 `1.0`；然后你自己再手动做一遍同一任务。

**步骤 10：避开已废弃包**。`cuabot`（npm）有已知安全问题，原文明确写「Do not run it」，应停用并卸载，改用 Cua Driver 或 `cua` CLI；`cua-computer`、`cua-computer-server`、`cua-agent`、`cua-som` 也已被替代。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 把「操作图形界面」这一类通常不交给 AI 的工作列入 agent 范围——在计算器里算 6×7、在 LibreOffice Calc 里选择单元格、在 Inkscape 里选中对象。Computer-Use 2.0 的表述是：同一个任务中 agent 在代码、API 和 GUI 之间移动，这意味着可发现的新用法是「API 不通或没有 API 时改走界面」。CUA-S1 指向更细的能力切分：表单里「该填哪个值」「这个元素要不要动」这类有界判断可由小模型打分完成，而不是交给通用 agent 逐 token 生成。

**2. 任务匹配**：原文给出的分工是——通用 agent 做规划与推理，CUA-S1 做快速有界决策，**应用代码负责给动作排序**，Cua Driver 在显式动作边界内执行。接入方式给了三种：CLI、MCP、typed SDK，可按已有 agent（Claude Code / Codex / Cursor / OpenClaw）选择。执行环境的匹配也有指向：本机已登录的应用走 Spaces teleport（Chrome、Slack 带登录态进 Space）；需要隔离或批量的任务走 `cua sb`（gVisor 容器）或 Lume VM；跨机器走自己的云账号或 `cua host setup` 接 relay。

**3. 条件供给**：- 权限与平台：原文把「平台设置、权限、agent 连接」专门放在 Driver 教程里，并有一份 platform support 文档界定后台投递的边界。
- 凭证：teleport 的已登录会话存在 Cua Keyvault 里，在本机加密，只有你批准后才到达 Space。
- 运行时信息：镜像自带 cua-spacesd（端口 3211）时，agent 一开始就能拿到进程、文件、截图和输入能力，另有低延迟音视频流。
- 反馈：评测侧的反馈回路是 Cua Bench 的 evaluator reward；操作侧的反馈是「验证应用显示 42」这类对界面状态的确认。
- 人的介入：Multiplayer 里你和 agent 同在一个桌面、各有自己的光标，卡住时你接手做选择再把桌面交回去。

**4. 主动推进**：原文只提到 background delivery——支持的情况下 agent 干活时不移动指针、不抢焦点——以及 `cua daemon` 常驻和 Spaces 常驻菜单栏/刘海。**没有给出由时间、事件或状态触发并持续完成任务的机制**，这一条无依据，不在本报告结论内。

**5. 效果验证**：Cua Bench 是原文里最直接的答案：建任务 → 跑参考解 → evaluator 给出数值 reward（首个结果的门槛是 1.0）→ 导出 trajectory 用于训练。「先跑参考解确认评测器能打出 1.0，再让 agent 做同一任务」是一个可复用的验证范式。另有两个现成的验收点：Calculator 显示 42、Lume VM 能 SSH 连上。

## 与已有做法的关系

- **Claude Code（adopt）**：README 明确把它列为集成对象，cua-driver 以 MCP + skill 形式注入；安装器会主动询问是否装进这类 AI 编程 agent。
- **Cursor（watch）**：同上，属于 README 点名的「connect your agent」目标之一。
- **OpenClaw（watch）**：同上，出现在集成名单里。
- **gVisor（study）**：`cua sb create ubuntu` 原文注明创建的是 gVisor container，且首次使用时才做配置。
- **GitHub Trending（try）**：本条目的来源，metrics 为 28,641 stars、今日 +229。

## 证据与局限

**原文给出的硬信息**：可复制的安装命令（`cua.ai/install.sh`、`cua.ai/driver/install.sh`、`driver/install.ps1`、`cua.ai/lume/install.sh`）、`cua sb` 四条 CLI 命令与一段 Python 片段、Cua Bench 的两条 uv 命令、三个带验收标准的「first result」、以及 star 数。演示方面有两段视频说明：一个 50 秒的 Cua Driver 会话在 Omarchy 桌面上同时操作 LibreOffice Calc 和 Inkscape，终端保持在前台。

**只是主张、没有数据支撑的部分**：
- 「后台投递、不移动指针不抢焦点」只在「app 和平台支持时」成立，具体边界被外链到 platform support，正文没写。
- 没有任何性能数字：任务成功率、耗时、token 成本、对比人工基线的提升幅度，原文一概未给。
- Star 数只说明关注度，不说明可用性。

**成熟度与适用条件（重要）**：
- Cua Spaces 是 **0.1.0**，个人免费，Pro 和 Teams 标注为「即将推出」。
- CUA-S1 自述为「早期的、仅源码的研究发布」，权重另放 Hugging Face；原文还特意澄清「System 1」只是工程类比，不是严格的架构分类，也不替代通用 agent 的规划推理。
- 硬性环境限制：Spaces 需 macOS 26+，Lume 需 Apple Silicon。
- 许可不是单一的：Spaces 之外的 SDK、CLI、Driver、Lume 是 MIT；Cua Spaces（应用、cua-spacesd、Keyvault、teleport、cua-volume、流媒体客户端）是 FSL-1.1-MIT，免费自托管自建但不得做竞争性托管服务，每版发布两年后转 MIT。`cua-som` 是 AGPL-3.0-or-later，其 Ultralytics 依赖另有许可。可选扩展 `cua-perception` 打包了 AGPL-3.0-only 的 OmniParser 模型产物，**网络分发或托管可能触发 AGPL 源码义务**，原文明确说 Cua 无法为此重新授权。做商用集成前必须逐目录查 LICENSING.md。
- 具体操作细节（权限授予、平台支持边界、任务编写格式）都在外链文档里，本次材料只到 README 这一层，照着装可以，照着做完整流程需要再去读 quickstart。

## 怎么试、怎么验证

**最小试用（建议按此顺序，成本从低到高）**

1. **只跑评测回路，不碰桌面**。装 Python 3.12/3.13 + uv，执行「步骤 9」两条命令，建一个最小任务、跑参考解，确认 evaluator 报 `1.0`。这一步不需要 VM、Docker 或模型 API key，是验证「这套东西在我这儿能不能用起来」最便宜的入口。
2. **只装 Driver，做一个可判对错的任务**。按「步骤 3」装驱动，让现成 agent（Claude Code / Codex / Cursor 之一）在计算器里算 6 × 7 并确认显示 42。跑通再谈别的。
3. **挑一个你真实在做的、需要点界面的小任务**（例如在某个没有 API 的内部系统里填一条表单），用 Driver 让 agent 做一遍，记录它卡在哪。
4. **需要隔离或多机时**再上 `cua sb`（gVisor 容器）或 `cua host setup`。**Spaces 和 Lume 放到最后再装**——它们要 macOS 26+ / Apple Silicon，且 Spaces 还是 0.1.0。

**判断有没有改善的指标**（注意：仓库本身没给基线，需要你自己先测一遍人工耗时作为对照）

- **能否通过硬验收**：参考解 reward 是否 1.0；计算器是否显示 42；Lume VM 能否 SSH 连上。这是 0/1 门槛，不过就别往下做。
- **同一任务的 reward / 成功率**：用 Cua Bench 把你要自动化的那个真实任务写成可评测任务，记录 agent 的 reward 与方差；没有可自动评测的判据时，退化用「人工抽查 N 次里对几次」。
- **人工介入次数**：借助 Multiplayer 语义，统计一个完整任务里你不得不接手做选择的次数。这个数字下降，才叫「真的改善」。
- **是否绕路**：确认 agent 确实在用 GUI 完成，而不是恰好有捷径 API——否则你测到的不是计算机使用能力。
- **与人工基线的耗时/错误率对比**：同一任务，人工一遍 vs agent 一遍。仓库没有提供这类数据，必须自采。
- **可迁移性**：把同一任务换到另一个应用或另一台机器上重跑，看是否还需要重做配置——这直接检验「条件供给」是否可复用，是决定要不要写进手册的关键。
