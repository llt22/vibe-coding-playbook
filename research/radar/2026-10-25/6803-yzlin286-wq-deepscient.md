# yzlin286-wq/Deepscient

- 结论：**值得一试**。若你正在做科研或需要可复现的分析写作流程，可以按 README 的桌面安装步骤小范围试装，重点借鉴它“12 阶段 + 55 个可判定门 + 证据链”的结构；不必照搬整套工具。理由是：原文给出了可直接执行的安装、配置和验收命令，但成熟度证据全部来自作者自述，且强依赖 DeepSeek Harness，只在 Windows 上验证过。
- 原文：https://github.com/yzlin286-wq/Deepscient
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-24T23:57:47.245Z

## 是什么

DeepScient 0.12.0 是运行在 DeepSeek Harness（dsh）运行时上的「科研工作台」。它把「选题 → 检索 → 实验 → 分析 → 作图 → 写作 → 投稿 → 审稿回应」拆成 12 个阶段、55 个可判定的门，配有 36 个科研工具、98 条技能（随包 17 条 + 第三方 81 条）和一套可审计的证据链。

仓库分两个可独立使用的包：

| 包 | 版本 | 作用 | 依赖 |
|---|---|---|---|
| `deepscient/` | 0.12.0 | 产品壳：启动器、Host API、Web 界面、调度层、技能与 MCP 装配、验收脚本 | dsh 运行时 + `dsh-science` |
| `dsh-science/` | 0.5.0 | 科研内核：工具、学科数据、流程定义、preset、调度 | 只需 dsh（`@deepseek-ai/cordis`） |

它有三条设计原则，也是本条目最可迁移的部分：

- **证据链**：每条结论要能追到数据，数据要能追到可重跑的实验；`science_*` 工具里没有「编一个数」的出口。
- **可复现**：实验记录、环境、版本、随机种子都保存到磁盘，换机器能重跑出同样的表。
- **人保留判断权**：系统算不出来的（构念效度、创新性、伦理取舍）只给检查清单，不替你下结论。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### A. 桌面版（Windows，最省事路径）

前提：Windows 10/11；不需要 clone 仓库，也不需要单独安装 DeepSeek Harness。

1. 下载 `DeepScient-desktop-v0.12.0.zip`（约 635 MB）。
2. 解压到短路径（如 `D:\DeepScient`，不要放在很深的目录里）。
3. 双击根目录 `DeepScient 启动.cmd`。
4. 等待首次启动自动装配桌面 profile（作者实测约 30–40 秒），点「登录 DeepScient」在浏览器完成授权，进入工作台。

数据写在 `%USERPROFILE%\.deepscient`，不写 `~/.dsh`。安装包内含 `deepscient` 0.12.0 与 `dsh-science` 0.5.0，带调度层（M7）：5 个工具（`science_org_chart`、`science_campaign_plan`、`science_campaign_run`、`science_campaign_status`、`science_campaign_report`）与 4 级 13 岗编制。

### B. 桌面版（macOS Apple Silicon）

前提：Apple Silicon Mac；不需要 Node.js、pnpm，也不需要单独安装 DeepSeek Harness。

1. 下载 `DeepScient-0.12.0-mac-arm64.dmg`（479 MB；同页也有 499 MB 的 `.zip`）。
2. 挂载后把 `DeepScient.app` 拖进 `Applications`。
3. 首次打开会被 Gatekeeper 拦一次（未签名构建），二选一放行：

```bash
xattr -dr com.apple.quarantine /Applications/DeepScient.app
```

或右键 →「打开」→「打开」。

4. 打开后首次启动自动装配桌面 profile（约 30–60 秒），点「登录 DeepScient」完成授权。

### C. 从源码构建（开发者形态，Windows）

前提：复用本机已装的 DeepSeek Harness 桌面壳。

```powershell
git clone https://github.com/yzlin286-wq/Deepscient.git
cd Deepscient
powershell -File deepscient/desktop/assemble-profile.ps1   # 装配 ~/.deepscient/profiles/desktop
powershell -File deepscient/desktop/build-desktop.ps1      # 派生独立应用（约 1.5 GB）
powershell -File deepscient/desktop/deepscient-desktop.ps1 -CreateShortcuts
```

### D. 从源码构建（macOS）

```bash
git clone https://github.com/yzlin286-wq/Deepscient.git
cd Deepscient
bash deepscient/desktop/build-desktop.sh --shell "/path/to/DeepSeek Harness.app"
bash deepscient/desktop/assemble-profile.sh
bash deepscient/desktop/deepscient-desktop.sh
```

### E. 以 Web 工作台形态运行

前提：Windows 10/11、Node ≥ 22.5、已装 DeepSeek Harness 桌面版。

```powershell
git clone https://github.com/yzlin286-wq/Deepscient.git
cd Deepscient

# 1) 把科研后端挂进一个独立 profile（只需一次）
#    在 dsh 会话里执行：
#      plugin_manager install_bundle <仓库根>\dsh-science
#    或打开 dsh 的 Plugins 页，安装本目录下的 dsh-science/

# 2) 从你现有 dsh profile 抽供应商层（不含密钥，只抽 apiKeyEnv 这类变量名）
node scripts/deepscient-sync-models.mjs

# 3) 起实例
deepscient\bin\deepscient.cmd
```

浏览器自动打开 `http://127.0.0.1:3081`（端口占用则顺延 3082–3099）。首次打开有六步引导。

### F. 可选：装第三方技能与 MCP 工具层

```powershell
# 装 81 条第三方科研技能（联网一次，pin 到 commit，可校验可卸载）
node deepscient/scripts/install-skills.mjs --plan     # 先看会装什么
node deepscient/scripts/install-skills.mjs --apply    # 真装

# 开 MCP 工具层（多源文献检索 + PubMed 全文）
$env:DSH_ENABLE_MCP = '1'
deepscient\bin\deepscient.cmd
```

### G. 用它的验收方式当自检清单

```powershell
# 打包面（零依赖，CI 与本地同一份）：语法、files 完整性、清单 pin、.ps1 BOM、隐私、文档链接
node tools/verify-packaging.mjs

# 活实例验收（需要实例在跑）：294 项 HTTP/文件断言
node deepscient/scripts/verify-deepscient.mjs --token <本次启动的 token>

# 端到端：真 key 真模型真回答 + 建课题 + 预设体检 + 技能与 MCP 装配
node deepscient/scripts/e2e-science-run.mjs --run --base http://127.0.0.1:3081

# 第三方技能安装器自检（10 项）与干跑
node deepscient/scripts/install-skills.mjs --self-test
node deepscient/scripts/install-skills.mjs --plan

# 运行时面的便携性检查（78 个文件：无提示词变量、无本机路径、无私有插件痕迹）
node dsh-science/scripts/verify-portability.mjs

# MCP 服务器单独握手（绕开 dsh，出错时把 npx 的报错打出来）
node deepscient/scripts/probe-mcp.mjs pubmed
```

### H. 工作时的用法约束

- 按 12 阶段推进，每道门对着库里的真实状态判定，不要凭模型「觉得可以了」就通过。
- 结论必须能追到数据、数据能追到可重跑的实验。
- 构念效度、创新性、伦理取舍这类系统算不出来的判断，由人看着检查清单决定。

注意：原文没有给出单道门的具体判定条件、36 个工具中除上述 5 + 3 个本地工具之外的名称与用法，也没有给出任何提示词模板，这些不能凭空补。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 能做哪些还没想到交给它的工作）**

- 调度层可以把长期多步科研任务交给 AI 编排：`science_campaign_plan` / `science_campaign_run` / `science_campaign_status` / `science_campaign_report`，配 4 级 13 岗编制。这说明「持续数天、多角色的任务编排」是一种可交付给 AI 的工作类型。
- 桌面版带三个本地科学计算工具：`local_compute_devices`（CUDA → MPS → CPU 后端探测）、`local_numeric`（numpy/scipy）、`local_symbolic`（sympy）。这说明数值/符号计算应该交给确定性计算工具，不要让模型估算。
- 5000+ 期刊的分区、周期、格式、投稿要求可用于选刊与排版，这是容易被忽略、但适合交给 AI 的检索与匹配类工作。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**

- 原文明确采用「阶段—工具绑定」：36 个工具中 23 个挂在具体阶段，13 个跨阶段（查历史、溯源、教练、期刊情报、前沿扫描）。这是可迁移的任务匹配原则：先划分阶段，再给每个阶段配最小工具集。
- 98 条技能分随包与第三方，第三方按仓库 pin 到 commit 安装，说明技能应按来源与版本分别管理。

**3. 条件供给（需要哪些信息、工具、权限和反馈）**

- 运行时依赖：dsh（`@deepseek-ai/cordis`）；桌面版则自包含。
- 供应商层通过 `node scripts/deepscient-sync-models.mjs` 从已有 dsh profile 抽取，且**只抽 `apiKeyEnv` 这类变量名，不含密钥**。这说明凭据应以环境变量名的形式引用。
- 数据隔离：写在 `~/.deepscient` 或 `%USERPROFILE%\.deepscient`，不写 `~/.dsh`；用独立 profile 和独立端口（3081–3099）。
- 外部工具层需要显式开关：`$env:DSH_ENABLE_MCP = '1'`；MCP 依赖 npx。
- 反馈回路：55 个门对着库里的真实状态判定，这是把「反馈」做成可判定检查，而不是让模型自评。

**4. 主动推进（时间/事件/状态触发、持续完成）**

- 只有间接依据：存在 `science_campaign_run` / `science_campaign_status` 这类长跑与状态查询工具，说明流程可以跨多次调用持续执行。
- 但原文没有说明触发器类型（定时、事件或状态变化）、重试策略或中断恢复机制，因此不能据此断言它具备自动触发推进的能力。

**5. 效果验证（怎么判断确实改善了结果）**

这是原文最扎实的部分：

- 流程层面：55 个门对库内真实状态判定，而非模型主观确认。
- 工程层面：`verify-packaging.mjs`（20 项）、`verify-deepscient.mjs`（294 项 HTTP/文件断言，不带 token 285 项）、`e2e-science-run.mjs`（端到端六段）、`install-skills.mjs --self-test`（10 项）、`verify-portability.mjs`（78 个文件）、`probe-mcp.mjs`。
- 结果层面：实验记录、环境、版本、随机种子都保存到磁盘，换机器可重跑出同样的表。
- 成本层面：计费页给 token 真值并按用户填的价目估算。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **DeepSeek Harness（状态 watch）**：本项目的运行时依赖与上层复用对象。README 说「组合层、preset、Host API、Web 界面全部复用它的插件体系」，桌面版也是复用其桌面壳。因此本条目会继承 Harness 作为 watch 条目的不确定性：如果运行时本身还不稳定，工作台也无法稳定。
- **DeepSeek（状态 try）**：作为模型/供应商层出现（通过 dsh profile 抽取供应商层、`apiKeyEnv` 环境变量引用）；原文没有给出具体模型名与参数。
- **arXiv（状态 try）**：列在 8 个内置文献源中（Crossref / OpenAlex / arXiv / PubMed / Semantic Scholar / Europe PMC 等），用于检索阶段。
- **Semble（状态 try）**：原文完全未提到，无依据说明二者关系。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的数字与事实（均为作者自述，未见独立复现）**

- 规模：12 阶段 / 55 门 / 36 工具（23 挂阶段 + 13 跨阶段）/ 55 门学科 / 98 条技能（17 + 81）/ 8 个内置文献源 / MCP 34 个工具（papers 23 + pubmed 11）/ 5000+ 期刊情报。
- 包体积：635 MB（Windows zip）、479 MB（macOS dmg）、499 MB（macOS zip）、约 1.5 GB（源码派生应用）。
- 首启装配耗时：Windows 约 30–40 秒，macOS 约 30–60 秒。
- 最近一次全绿记录：打包面 20 项、活实例 294 项（不带 token 285 项）、端到端六段 PASS、技能清单 81/81 pin 正确、MCP 开启后注册 34 个工具。
- 仓库 35 stars；许可 MIT；第三方技能 8 个 MIT 系仓库，按 commit 拉取并校验 sha256。

**只是作者主张、需要打折的部分**

- 「可复现」「换台机器能重跑出同样的表」——没有给出具体的跨机复现实验报告。
- 「55 个门可判定」——没有列出任一道门的判定条件，无法判断门是否足够严格。
- 全部验收数字都是仓库自带脚本的自测结果，属于同一作者自证。

**作者自列的边界（原文「已知边界」）**

- headless 不组合 agent preset，所以「会话里看到几条技能」只能在 Web 会话里验证，不能从命令行验证。
- MCP 只验到「工具已注册」，还没有一次「让模型真的调 `mcp__pubmed__*` 查到一篇」的完整往返记录。
- 界面没做截图回归，改动后靠人工看一眼。
- 只在 Windows 上验证过；启动器是 PowerShell，`bin/launch.ps1` 依赖 BOM，Linux/macOS 需要另写启动器。注意：这与同一份 README 里给出的 macOS 安装/构建步骤存在张力，说明 macOS 路径成熟度低于 Windows。

**其他适用条件**

- 领域限定在科研生产链（选题到审稿回应）；对一般事务性工作的直接迁移价值有限。
- 强依赖 DeepSeek Harness 运行时，换生态就要重写启动器。
- macOS 为未签名构建，需要 ad-hoc 重签并手动放行 Gatekeeper。
- 35 stars、单一维护者，社区验证几乎没有。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（约半天）**

1. Windows 机器按 A 节解压启动，走完六步引导，确认能进入工作台（先不改任何技能与 MCP）。
2. 挑一个你手上真实、规模可控、结果可核对的科研/分析任务，例如「用一份公开数据集做一次统计检验 + 出一张图 + 写 800 字结果段」。
3. 只走 12 阶段中与该任务相关的前若干个阶段，每道门被拦下时记录原因。
4. 跑一遍 `node deepscient/scripts/verify-deepscient.mjs --token <token>` 和 `node deepscient/scripts/e2e-science-run.mjs --run --base http://127.0.0.1:3081`，确认环境本身没坏。

**判断有没有改善的指标**

- **门的价值**：记录「模型自称完成但门判否」的次数与具体原因。如果这个数长期为 0，说明门没有起作用，只是形式化检查；如果它拦下的是真问题（缺数据溯源、缺随机种子、统计口径不符），说明结构有效。
- **溯源深度**：从最终报告里随机抽 3 条结论，看能否在 10 分钟内追到具体数据文件和可重跑脚本。这是它承诺的核心能力，也是最容易失效的地方。
- **跨机复现**：把实验记录换一台机器重跑，比对输出的表是否一致。
- **成本**：用「计费」页的 token 真值，和同样任务在纯对话方式下的消耗做对比。
- **时间**：记录从选题到可提交稿件的耗时，对比你现在的方式。

**放弃标准（建议事先约定）**

- 若装完跑通需要超过 2 小时仍未进入工作台；或 macOS 上需要反复重签仍无法启动。
- 若走完一遍后，门拦下的全是格式性问题、没有一次拦到实质错误，并且溯源抽查 3 条有 2 条追不到数据，那就只保留「阶段 + 可判定门 + 证据链」这个结构思路，不再使用这套工具。
