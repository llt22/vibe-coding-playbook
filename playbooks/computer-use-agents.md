# 让会操作电脑的 agent 先通过一道能判对错的第一关

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在把桌面交给 AI 操作之前，用按成本递增的步骤先验证它的反馈回路和验收标准，避免装完一堆组件却不知道能不能用。
> 先试这一步：先只跑做法 A：装 Python 3.12/3.13 + uv，执行 Cua Bench 两条安装命令，建最小任务跑参考解，确认 evaluator 返回 reward=1.0。
> 最近修订：2026-10-08

## 解决什么问题

在把桌面交给 AI 操作之前，用按成本递增的步骤先验证它的反馈回路和验收标准，避免装完一堆组件却不知道能不能用。

## 适用与不适用

**适用：**
- 你希望 agent 能操作 GUI，或在 API 不通时改走界面。
- 你要给「计算机使用」类 agent 建评测、导出 trajectory。
- 你需要隔离的批量桌面操作（gVisor 容器沙箱）或本地 macOS/Linux VM。
- 你已有 Claude Code / Codex / Cursor / OpenClaw 等 agent，想通过 MCP 或 skill 接上桌面操作能力。

**不适用 / 先别用：**
- 你要的是成熟稳定的 1.0 产品：Cua Spaces 为 0.1.0，Pro/Teams 标注「即将推出」；CUA-S1 是早期源码研究版。
- 你的机器不满足硬性条件：Spaces 需 macOS 26+，Lume 需 Apple Silicon。
- 你只看了 README 就想跑完整流程：权限授予、平台支持边界、任务编写格式都在外链文档里，本次材料只到 README 这一层。
- 你要做对外托管或商用集成：许可不是单一的，见「常见坑」和「证据与来源」。
- 你在 Windows 且想装除 Driver 以外的组件：原文只提供 Windows 的 Driver PowerShell 安装脚本，其余以 macOS / Linux 为主。

## 前置条件

- Cua Spaces 应用：macOS 26 或更高版本。
- Lume：Apple Silicon。
- Cua Bench 的模拟任务：Python 3.12 或 3.13，并安装 uv；该任务不需要 VM、Docker 或模型 API key。
- Windows 下只有 Driver 有 PowerShell 安装脚本，其余组件以 macOS / Linux 为主。

## 操作步骤

下面按成本从低到高排。**建议先做做法 A**，跑通了再决定要不要做 B、C。

### 做法 A：只跑评测回路，不碰桌面（最便宜的入口）

前提：Python 3.12/3.13 + uv。预期结果：建一个小任务，跑它的参考解，确认评测器给出的 reward 为 `1.0`。

1. 安装 Cua Bench（带 browser 扩展）：

```bash
uv tool install 'cua-bench[browser]'
```

2. 安装 Chromium：

```bash
uv tool run --from 'cua-bench[browser]' playwright install chromium
```

3. 建一个小任务，跑它的参考解，确认 evaluator 返回 `1.0`。
4. 然后你自己再手动做一遍同一任务，作为对照。

做到这一步，你已经验证了「评测器能打出 1.0」这个反馈回路，而且不需要 VM、Docker 或模型 API key。

### 做法 B：只装 Driver，做一个可判对错的任务（已有自己的 agent 时最省事）

前提：已有 Claude Code / Codex / Cursor / OpenClaw 等 agent。预期结果：agent 在计算器里算出 6 × 7，并验证应用显示 42。

1. macOS / Linux 安装 Driver：

```sh
/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"
```

2. Windows（PowerShell）安装 Driver：

```powershell
irm https://cua.ai/driver/install.ps1 | iex
```

3. 按原文 Driver 教程走平台设置、权限和 agent 连接。
4. 让你的 agent 在计算器里算 6 × 7，并**验证应用显示 42**。
5. 接进你现有的 agent：通过 MCP / skill 接上 Cua Driver。原文点名 Claude Code、Codex、Cursor、OpenClaw 等。

### 做法 C：装整套 / 沙箱 / 本地 VM（接受安装器改动本机时再用）

前提：只想先看全貌，接受安装器会改动本机。预期结果：`cua` CLI、Cua Spaces 应用、cua-driver MCP 和 skill 就位，并能选择性地把本机作为宿主。

1. macOS / Linux 装整套：

```sh
curl -fsSL https://cua.ai/install.sh | sh
```

脚本会在终端显示一个短清单：`cua` CLI、Cua Spaces 应用（macOS 默认勾选）、给 agent 用的 cua-driver MCP 和 skill、以及把本机作为宿主。

2. 登录并决定是否把 cua skills 和 cua MCP server 装进你的 AI 编程 agent（Claude Code、Codex、Cursor 等）：

```sh
cua auth login
```

3. 只想预选某几项时：

```sh
sh -s -- --select cua-driver
```

跳过清单：

```sh
--only cua-driver
```

4. 用沙箱做隔离的批量操作（前提：已装好 `cua` CLI）：

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

要点：沙箱内不需要装 agent，就绪状态来自运行时和可选的端口探测；镜像若带 cua-spacesd（端口 3211），才额外提供进程、文件、截图、经 cua-driver 的输入，以及低延迟音视频流。

5. 把自己的机器接进来（无需端口转发）：

```sh
cua host setup
```

6. 要本地 VM 时装 Lume（前提：Apple Silicon）：

```bash
/bin/bash -c "$(curl -fsSL https://cua.ai/lume/install.sh)"
```

首个结果：从 Apple 恢复镜像创建一个干净的 macOS Tahoe VM、启动、用 SSH 连上。

### 怎么选

- 只想验证「这套东西在我这儿能不能用起来」：选做法 A，成本最低。
- 已有 agent，想让它先做一件有明确对错的事：选做法 B。
- 需要完整桌面、隔离沙箱、本地 VM、或把本机接进来：选做法 C。
- 已经装了旧包 `cuabot`（npm）：先停用并卸载，见「常见坑」。

## 怎么判断变好了

可观察的指标：
- 做法 A：Cua Bench 的 evaluator 对参考解返回 `1.0`；不需要 VM、Docker 或模型 API key 就能跑。
- 做法 B：计算器里 6 × 7 的结果被验证为显示 42。
- 做法 C：Lume 创建并启动的 macOS Tahoe VM 能用 SSH 连上；`cua sb exec dev uname -a` 能返回结果；`cua sb screenshot dev` 能拿到截图。

最小试用方式：
- 先只跑做法 A 的两条安装命令，建最小任务、跑参考解，确认 reward 为 `1.0`。这是「这套东西在我这儿能不能用起来」最便宜的入口。
- 跑通后再做做法 B：只装 Driver，让现成 agent 在计算器里算 6 × 7 并确认显示 42。

试多久：
- 材料没有给出耗时或成功率的数字；以「参考解拿到 `1.0`」这一件事跑通为准，不要用 star 数或视频演示判定。

## 常见坑

- 把关注度当可用性：28,641 stars、今日 +229 只说明有人看，原文没有给任何性能数字（任务成功率、耗时、token 成本、对比人工基线的提升幅度）。
- 忽略成熟度：Cua Spaces 是 0.1.0，个人免费，Pro 和 Teams 标注为「即将推出」；CUA-S1 自述为「早期的、仅源码的研究发布」，权重另放 Hugging Face，且「System 1」只是工程类比，不替代通用 agent 的规划推理。
- 环境不满足硬装：Spaces 需 macOS 26+，Lume 需 Apple Silicon；Windows 下只有 Driver 有 PowerShell 安装脚本。
- 跑错已废弃包：`cuabot`（npm）有已知安全问题，原文明确写「Do not run it」，应停用并卸载，改用 Cua Driver 或 `cua` CLI；`cua-computer`、`cua-computer-server`、`cua-agent`、`cua-som` 也已被替代。
- 以为后台投递一定成立：「不移动指针、不抢焦点」只在「app 和平台支持时」成立，具体边界被外链到 platform support，正文没写。
- 商用许可踩坑：Spaces 之外的 SDK、CLI、Driver、Lume 是 MIT；Cua Spaces（应用、cua-spacesd、Keyvault、teleport、cua-volume、流媒体客户端）是 FSL-1.1-MIT（免费自托管自建，但不得做竞争性托管服务，每版发布两年后转 MIT）；`cua-som` 是 AGPL-3.0-or-later，其 Ultralytics 依赖另有许可；可选扩展 `cua-perception` 打包了 AGPL-3.0-only 的 OmniParser 模型产物，网络分发或托管可能触发 AGPL 源码义务，原文明确说 Cua 无法为此重新授权。做商用集成前必须逐目录查 LICENSING.md。
- 以为 README 就是全部：权限授予、平台支持边界、任务编写格式都在外链文档里，照着装可以，照着做完整流程需要再去读 quickstart。
- 把「常驻」当「自动推进」：原文只提到 background delivery 和 `cua daemon` 常驻、Spaces 常驻菜单栏/刘海，没有给出由时间、事件或状态触发并持续完成任务的机制。

## 证据与来源

- 安装命令、Driver 命令、Lume 命令、`cua sb` 四条 CLI 命令、沙箱 Python 片段、Cua Bench 两条 uv 命令：来自 trycua/cua README（本报告整理的调研材料）。
- 三个带验收标准的「first result」（Calculator 显示 42、Lume VM 能 SSH 连上、Cua Bench 参考解 reward=1.0）：来自同一份调研。
- 分工与接入方式（通用 agent 做规划与推理、CUA-S1 做快速有界决策、应用代码给动作排序、Cua Driver 在显式动作边界内执行；CLI / MCP / typed SDK 三种接入）：来自同一份调研的「任务匹配」部分。
- star 数 28,641、今日 +229 和两段视频说明：来自同一份调研；只能说明关注度，不说明可用性。
- 「后台投递、不移动指针不抢焦点」、`cua daemon` 常驻、Multiplayer 同桌面接手：来自同一份调研，但原文没有给出触发式持续完成任务的机制，属于作者主张而非可验证数据。
- 许可与成熟度（Spaces 0.1.0、CUA-S1 早期研究版、FSL-1.1-MIT、AGPL 相关风险）：来自同一份调研的「证据与局限」部分。

## 依据的调研

- [trycua/cua](../research/radar/2026-10-08/1857-trycua-cua.md)：值得一试，可以把 Cua 当作一套「让 AI 真正操作电脑」的试验台小范围搭起来：先用 Cua Bench 的无 VM 模拟任务跑通「建任务→跑参考解→evaluator 返回 reward=1.0」，再装 cua-driver 做 Calculator 6×7 这类有明确验收标准的首个结果；理由是原文给了可复制的安装与 CLI 命令和明确的验收口径，但详细权限/平台支持步骤都在外链文档里，且 Spaces 仅 0.1.0、CUA-S1 为早期源码研究版，尚不足以直接写进手册当标准流程。
