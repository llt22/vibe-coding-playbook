# modem-dev/boxery

- 结论：**值得一试**。可以在 macOS 或 Linux 上小范围试用：按 README 的步骤安装 boxery host，用 Lima 或 libvirt 启动 VM，通过 MCP 把 VM 工具交给现有编程智能体（如 Claude Code），用来运行不受信任的代码、执行桌面操作和并行尝试，真实密钥保留在 host 上而不进入 VM。原因是原文给出了可直接照抄的安装命令、MCP 工具清单和默认拒绝、按需授权的凭证模型，属于少见的“任务供给 + 权限边界”完整闭环；但项目自标早期实验阶段、多个后端尚为实验性，因此还不宜作为手册主线直接采用。
- 原文：https://github.com/modem-dev/boxery
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T12:22:09.506Z

## 是什么

boxery 是给编程智能体用的 VM 管理工具：智能体自己创建、分叉、快照、回滚和销毁 Linux VM，并在里面运行 shell、文件读写、后台任务、Chrome 与真实桌面操作。

三层结构：

- **智能体所在的机器**上运行 boxery MCP server（或 pi 扩展），向智能体暴露一组 `vm_*` 工具；
- **boxery host**：一台你自己运行的机器（可以是同一台 Mac、一台 Linux 服务器，或一台小型 VPS），持有真实密钥与授权，负责创建/分叉/销毁 VM，工具通过 ssh 访问它；
- **VM 本身被当作不可信**：可以运行任何东西，但只持有一个可撤销的 token，由 host 上的凭证代理换成真实密钥。

支持的 VM 后端：本地 Lima，libvirt 和 Cloud Hypervisor，云端 exe.dev 和 boat.dev；一个 MCP server 可以同时驱动多个 host，并保证每个 host 上工具一致。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：macOS 或 Linux（README 徽章只标 `macOS | Linux`，未提 Windows）；能安装 brew、jq、node；如果选 Lima 后端，需要能够在本机运行 VM。

1. **（可选）让智能体自己安装**。把这段原样发给智能体：

```text
Read github.com/modem-dev/boxery and set up boxery on this machine.
Then spin up a VM with `boxery new demo` and open its desktop.
```

2. **手工安装（Mac + Lima）**：

```bash
brew install lima jq node
npm install -g boxery-vm
boxery-host init --backend lima && boxery-host build-base
boxery setup local
```

   注意 `build-base` 会构建一次桌面镜像（原文称约 3 分钟）；**只需要 headless VM 时可以跳过这一步**。Linux 或云端请改看 `docs/install.md#choosing-a-backend`（原文未给出这部分具体命令）。

3. **把 MCP 接入智能体**（二选一或都装）：

```bash
npx add-mcp boxery-vm      # Claude Code、Codex、Cursor、VS Code、opencode、Zed 等
pi install npm:boxery-vm   # 或原生 pi 扩展
```

4. **用自然语言下达任务**。原文示例：

```text
Clone my repo in a VM, start the dev server, and screenshot the homepage in Chrome.
```

5. **按需授权，不要一次性全开**。VM 默认什么权限都没有（连 LLM 都没有），需要通过 `vm_grant` 或 `docs/grants.md` 的机制开放：LLM provider、GitHub 或 HTTPS API（密钥留在 host）、ssh-agent、环境变量、文件。原文没有给出 `vm_grant` 的参数细节，具体配置需要查阅 `docs/grants.md`。

6. **自己做人工干预**（不用智能体时）：

```bash
boxery attach demo
boxery desktop demo
```

7. **多智能体共享 VM 池时使用 lease**：`vm_lease` 支持从共享池租用 VM，避免多个智能体互相冲突（细节见 `docs/pool.md`）。

8. **需要长时间常驻任务时，把 host 放到服务器或云端**，智能体在本地，VM 在远端；关掉笔记本后任务继续运行。

## 对应的研究问题

- **能力发现（Q1）**：原文列出了五类可以交给 AI 的具体工作形态：每个项目或每个分支一台完整 Linux 开发机；让智能体安装任意软件并运行不受信任的代码；用 fork 并行尝试多个修复方案，只保留通过的那个；在真实桌面上运行 Chrome、点击和截图；常驻智能体和长任务。这些都是“可以放心交给 AI，因为运行环境可以丢弃”的工作类型。
- **任务匹配（Q2）**：原文给出了工具到任务的对应关系，可直接用于选型：shell、文件与后台任务 → `vm_bash` `vm_read` `vm_write` `vm_edit` `vm_jobs` `vm_copy`；计算机使用与 Playwright → `vm_screenshot` `vm_click` `vm_type` `vm_key` `vm_scroll` `vm_browser`；环境生命周期 → `vm_manage` `vm_info`；权限与配额 → `vm_grant` `vm_lease`。协作方式上支持 Claude Code、Codex、Cursor、opencode、pi 及任意 MCP 客户端；性能上，需要快速反馈的任务放在本地后端，需要长时间常驻的任务放在远端或云端后端。
- **条件供给（Q3）**：这是原文最充分的部分。信息方面，智能体只需知道 `vm_*` 工具，并通过 MCP 自动发现；工具方面，提供全套 shell、文件、桌面和浏览器能力；权限方面，提供默认拒绝的 grant 机制（LLM、GitHub/HTTPS、ssh-agent、环境变量、文件），只把可撤销的 token 放进 VM，真实密钥留在 host，VM 默认连 LLM 都没有；反馈方面，`vm_screenshot`、`vm_jobs`、`vm_info` 以及可以直接旁观的桌面提供了运行状态的观测通道。
- **主动推进（Q4）**：有部分依据。`vm_jobs` 提供后台任务；fork 和 snapshot、revert 支持分支式并行推进；host 放在服务器或云端时，长任务和常驻智能体可以在关掉笔记本后继续运行。但原文**没有描述基于时间、事件或状态触发的调度机制**，这一项不能过度外推。
- **效果验证（Q5）**：原文**基本没有依据**。只有速度方面的主张：libvirt 上完整桌面 VM 约 13 秒、运行中快照约 1 秒；没有给出任何正确性、成本或质量的验证方法。验证方案需要自行设计（见下文）。

## 与已有做法的关系

清单中的 Claude Code（adopt）、Cursor（watch）、OpenCode（watch）与 boxery 在**层级上互补**，并不构成替代关系：boxery 是供给层，给这些已有智能体补上“隔离运行环境 + 凭证边界”。`npx add-mcp boxery-vm` 的安装路径明确列出了 Claude Code、Codex、Cursor、opencode、Zed，即它可以直接把 VM 能力挂到清单里已在用的 Claude Code 上，把“允许智能体执行命令”的权限问题从本机移到一次性 VM 上。Cursor 和 OpenCode 在清单中仍是 watch 状态，boxery 不会改变它们本身的成熟度判断。

## 证据与局限

**原文给出的可核查内容**：完整安装命令序列、MCP 工具名清单、后端清单、默认拒绝的凭证代理架构、“VM 只持有可撤销 token”的安全模型说明，以及指向 grants/security/pool/hosts 等文档的链接。

**仅属于作者主张、无第三方验证的**：约 13 秒启动完整桌面 VM、约 1 秒快照、约 3 分钟构建基础镜像、`build-base` 可跳过等性能数字；这些都没有基准测试方法或环境说明。“密钥永不进入 VM”是设计声明，实际隔离强度需要读 `docs/security.md` 才能判断。

**成熟度风险（原文自述）**：README 顶部明确警告 “Early-stage, experimental software. Expect rough edges and breaking changes between releases.”；exe.dev、boat.dev、Cloud Hypervisor 三个后端标注为 experimental；仓库 38 stars。

**材料本身的局限**：本次只拿到 README，`docs/grants.md`、`docs/security.md`、`docs/pool.md`、`docs/cli.md`、`docs/install.md` 的正文均未获取。因此**授权的具体配置、CLI 参数、安全边界的细则无法照抄**，只能作为线索；如果要把这套方案写进手册，需要先把这几份文档补齐。

**适用条件**：仅 macOS / Linux；需要一台可运行 Lima 或 libvirt 的机器，以及一台可信 host；需要能接受 VM 内没有真实凭证、必须显式授权的工作流；Windows 环境不适用。

## 怎么试、怎么验证

**最小试用（半天以内）**：

1. 在一台 Mac 上只走 headless 路径（跳过 `build-base`），用 `--backend lima` 执行 `boxery-host init`，减少首次安装的变量；
2. 只接一个智能体（建议用清单中已经 adopt 的 Claude Code），不接多个智能体，避免干扰归因；
3. 选一个**本来就要在本机执行、且会安装依赖或运行外部代码**的真实任务作为样本，例如：克隆一个仓库 → 安装依赖 → 运行测试 → 输出失败用例；
4. 全程不授予任何 grant（不给 LLM、不给 GitHub token），观察智能体在“无凭证”状态下能否完成任务；跑不通时再逐个加授权，记录每一步实际加的是什么；
5. 重复同一任务 3 次，其中至少一次在任务中途执行 `vm_manage` 的 fork 或 snapshot/revert，验证回滚是否可用。

**判断有没有改善的指标**：

- **宿主机零污染**：任务完成后主机上是否新增了依赖、环境变量或残留进程（目标：无）；
- **凭证没有外泄**：检查 VM 内是否确实没有任何真实密钥，只有可撤销 token；
- **人工介入次数**：一次任务中需要人工执行 `vm_grant` 或手工操作的次数，这是衡量“条件供给是否设计得当”的直接指标；
- **可复现性**：同任务 3 次的结果是否一致；用 snapshot/revert 重放后结果是否收敛；
- **任务成功率与耗时**：与“直接在本机让智能体做”的基线对比；注意 README 中的 13 秒/1 秒是作者主张，必须用自己环境实测的启动、快照时延替换；
- **长任务持续能力**：把 host 放到远端，任务发起后关闭笔记本，回来检查任务是否完成，这是验证 Q4 的唯一可靠方式；
- **失败模式清单**：记录“破坏性变更、后端不稳、授权卡住”各出现几次，作为判断能否升级为 adopt 的依据。

**升级为 adopt 的条件（建议）**：上述试用在 2 周内稳定跑通，人工介入次数降到接近 0，且补齐 `docs/grants.md` 和 `docs/security.md` 中可照抄的配置后，再考虑写入手册主线；否则保留为 try，并在手册中作为“隔离执行环境”的可选方案列出。
