# Over9rowth/O9-RD-MAO-Governance

- 结论：**值得一试**。建议小范围试用：该仓库提供了可直接复制的规则文件、零依赖 CLI 和 G0–G7 流程，能对多智能体编码工作流施加可验证的治理约束；但项目较新、缺少实际案例，需在团队内先做小规模验证。
- 原文：https://github.com/Over9rowth/O9-RD-MAO-Governance
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-03T18:21:58.608Z

## 是什么

O9-RD-MAO-Governance 是一个面向多智能体编码工作流的“可验证明最小控制平面 + 软件工程治理框架”。它针对“野生”多智能体编码（把 LLM 当群聊）在生产中容易出现的需求幻觉、互相奉承、奖励黑客（如删除测试断言、写 TODO 桩、偷偷降低验收标准）等问题，给出了一套带状态机（G0–G7）、规则模板和 CLI 工具的治理方案。仓库包含：

- `gate_runner.py`：纯 Python 3 标准库实现的确定性控制平面 CLI（init / freeze / approve / close-bug / check / trust-reset）。
- `.cursorrules` / `CLAUDE.md`：可直接放入项目根目录的治理规则，用于 Cursor / Claude Code 等 AI IDE。
- `templates/`：四件套模板（JSON/YAML/MD）。
- `prompts/`：交互式 Agile MAO Coach 元提示词（英/中）。
- `docs/`：控制实现矩阵、威胁模型、英文 SOP、中文 SOP 与教材。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 前提
- 已安装 Python 3（只用标准库，无第三方依赖）。
- 项目根目录可写入，且准备好一个至少 16 字符的签名密钥，通过环境变量 `O9_APPROVAL_SECRET` 或 `--key` 传入；未配置时操作会 fail-closed。
- 若使用 Cursor / Claude Code，需将对应规则文件复制到项目根目录。

### 选项 A：放入 AI IDE 规则（最快）
1. 将仓库中的 `.cursorrules` 复制到 Cursor 项目根目录；或将 `CLAUDE.md` 复制到 Claude Code 项目根目录。
2. 之后 AI 代理在生成代码时会受到 G0.5 确认、反桩代码、黑盒验证等规则约束。

### 选项 B：运行确定性控制平面 CLI
1. 初始化工作区（会复制完整四件套模板，并写入 `.o9_project_id` 与本地 `index.tsv` 注册表）：
   ```bash
   python gate_runner.py init
   ```
2. 冻结 G3 基线（会阻止空规格或缺少 `AC-xxx` 表格行；签署 `spec_sha256` 与复合 `manifest_sha256`）：
   ```bash
   O9_APPROVAL_SECRET="my-super-secret-key-16" python gate_runner.py freeze
   ```
3. 绑定分离式人工审批（同时绑定规格和 manifest 哈希；如果冻结后基线被改动会拒绝）：
   ```bash
   O9_APPROVAL_SECRET="my-super-secret-key-16" python gate_runner.py approve station_master
   ```
4. 对缺陷关闭做密码学签名（缺陷必须先在 YAML 中存在；条目键顺序不限）：
   ```bash
   O9_APPROVAL_SECRET="my-super-secret-key-16" python gate_runner.py close-bug BUG-001 qa_lead
   ```
5. 运行 fail-closed 的 G5 验证（校验 HMAC 信任根、manifest、仓库内证据、按 `recorded_at` 选择最新 QA 运行）：
   ```bash
   O9_APPROVAL_SECRET="my-super-secret-key-16" python gate_runner.py check ./src --gate=G5 --require-approval
   ```
6. 仅在外部信任锚丢失/损坏时恢复信任（会归档旧锚和账本）：
   ```bash
   O9_APPROVAL_SECRET="my-super-secret-key-16" python gate_runner.py trust-reset PRJ-2026-001
   ```
7. 注意：接口契约文件放在 `o9_workspace/contracts/` 下会自动纳入 G3 的 `manifest_sha256`，冻结后任何修改都会在 `approve` 和 `check` 时触发熔断。

### 选项 C：使用交互式工作流定制器（元提示词）
1. 打开 `prompts/MAO-Workflow-Coach-en.md`，将全文粘贴到 Claude 或 ChatGPT。
2. 回答 4 个关于技术栈的简短问题，它会为你的仓库生成定制化的、规模合适的多智能体工作流。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

### 1. 能力发现：AI 已经能做哪些还没想到交给它的工作
- 原文展示了 AI 代理可承担的多智能体编码治理任务：规格完整性检查（G1 要求结构化 `AC-xxx` 表格行）、基线冻结与哈希锁定（G3）、分离式审批绑定、缺陷关闭签名（`close-bug`）、黑盒 QA（G5 中 QA 代理在干净会话中运行，不读 `src/`）、RTM 追溯审计（G6）、签核检查（G7）。
- 这些能力不是让 AI 直接写业务代码，而是让 AI 参与“防止 AI 作弊”的治理流程。

### 2. 任务匹配：什么工作适合怎样的模型、工具和协作方式
- 原文按风险等级给出 S / M / L 三条轨道：
  - `S` 轨道：适合 UI/文案修改，2 个接触点快速通道。
  - `M` 轨道：适合功能开发，需要完整契约审查。
  - `L` 轨道：适合 Auth / Billing / DB 操作，需要严格沙箱 + 模糊测试。
- 协作方式上区分了 Coder、QA lead、Station master 等角色，并规定 QA 代理先黑盒测试（无 `src/` 读权限），再白盒检查。
- 原文没有给出具体“哪个模型配哪个任务”的模型选型矩阵，只给出了流程和角色匹配。

### 3. 条件供给：需要提供哪些信息、工具、权限和反馈
- 需要提供：
  - 至少 16 字符的签名密钥（`O9_APPROVAL_SECRET` 或 `--key`），用于 HMAC 信任根和审批签名。
  - 项目根目录写权限，以及 `~/.o9-trust/` 外部信任锚（密钥指纹固定、单调序列）。
  - 规格文件与 `o9_workspace/contracts/` 下的接口契约文件，且规格中必须包含 `AC-xxx` 表格行。
  - 缺陷 YAML 记录（`close-bug` 前缺陷必须已存在）。
  - 若使用 AI IDE，需要把 `.cursorrules` 或 `CLAUDE.md` 放入项目根目录。
- 工具：Python 3 标准库即可运行 `gate_runner.py`，无需第三方依赖。
- 反馈：`check` 会按 `recorded_at` 选择最新 QA 运行，并要求证据限制在仓库根目录内；不满足条件会 fail-closed。

### 4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成
- 原文的推进主要靠显式 CLI 命令触发：`init` → `freeze` → `approve` → `close-bug` → `check`，以及 `trust-reset` 恢复路径。
- G0–G7 状态机描述了阶段流转，G5 发现缺陷可回到 G4（Bug 且 Coder != Close）。
- 原文没有描述基于时间或事件自动触发的持续运行机制；主动推进目前是“命令驱动 + 状态机约束”。

### 5. 效果验证：怎样判断确实改善了结果
- 可通过以下检查判断：
  - `freeze` 是否阻止空规格 / 缺少 `AC-xxx` 行。
  - `approve` 与 `check` 是否在基线被冻结后修改时熔断。
  - `check --gate=G5` 是否通过 HMAC 信任根、manifest、仓库内证据和最新 QA 运行校验。
  - `close-bug` 是否要求缺陷先存在，并生成 HMAC BUG_CLOSE 记录。
  - G6 是否通过结构化 RTM 表验证；G7 是否通过 3 决策签核检查。
- 原文还提到 `docs/CONTROL-MATRIX.md` 区分了 tool-enforced / tool-validated / manual-verified / infra-boundary，且每个 `tool-enforced` 行由 `tests/test_v16_controls.py` 覆盖。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中有 `Claude Code`（status: adopt）和 `Cursor`（status: watch）。本仓库直接提供 `.cursorrules` 和 `CLAUDE.md` 两个规则文件，可分别用于 Cursor 和 Claude Code 的项目根目录，作为 AI 编码代理的治理规则层；同时 `gate_runner.py` 可作为独立 CLI 对多智能体编码流程做基线冻结、审批绑定和验证。因此它与已有做法的关系是：可作为 Claude Code / Cursor 的上层治理补充，而不是替代它们。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

### 证据
- 原文给出了具体 CLI 命令、参数、环境变量、文件路径和状态机流程，可照做。
- 给出了版本号 `v1.6.4`，并声明 `tests/test_v16_controls.py` 覆盖每个 `tool-enforced` 行。
- 给出了 `docs/CONTROL-MATRIX.md` 作为控制实现矩阵和威胁模型文档。
- 仓库有 34 stars，说明有一定关注但不算广泛验证。

### 作者主张（原文未给出量化数据或案例）
- 声称能解决“野生”多智能体编码中的需求幻觉、互相奉承、奖励黑客等问题。
- 声称 G5 黑盒测试可防止代理改考试卷；G3 哈希锁定可防止代理偷偷改验收标准。
- 这些效果没有在原文中给出实际项目的前后对比数据或用户案例。

### 局限与适用条件
- 项目较新（v1.6.4），生态和长期稳定性未知。
- 原文明确说明同 UID 威胁模型限制；G2 语义同行评审、容器级 E2 沙箱、针对同 UID 代理的秘密保管、生产发布执行仍由 SOP 协议、IDE 规则和 CI 保管负责，不是本 CLI 完全覆盖。
- 需要团队愿意管理签名密钥、外部信任锚和证据目录；对个人小项目可能偏重。
- 适用于使用多智能体编码工作流、且需要可追溯性和防篡改的团队场景。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

### 最小试用方式
1. 在一个小型项目或分支中，先采用选项 A：把 `.cursorrules` 或 `CLAUDE.md` 复制到项目根目录，观察 AI 代理是否按 G0.5 确认、反桩代码、黑盒验证规则工作。
2. 再采用选项 B：运行 `init` 和 `freeze`，建立最小规格与契约，然后让一个编码代理在 M 轨道完成一个小功能，按 `approve` → 编码 → `check --gate=G5` 走一遍。
3. 如果想快速生成定制流程，可用选项 C 的元提示词，回答 4 个问题得到适配自己技术栈的工作流。

### 判断有没有改善的指标（可观察的通过/失败）
- `freeze` 是否成功阻止空规格或缺少 `AC-xxx` 行的规格。
- 冻结后修改 `spec_and_contracts.md` 或 `o9_workspace/contracts/` 下文件，`approve` / `check` 是否如预期熔断。
- `close-bug` 是否在没有对应缺陷 YAML 时拒绝签名；有缺陷时是否生成可验证的 HMAC 记录。
- `check --gate=G5` 是否在证据不在仓库根目录、或 QA 运行不是最新 `recorded_at` 时失败。
- G6 的 RTM 表是否完整；G7 的 3 决策签核是否齐全。
- 对比使用前后：规格被代理擅自修改的次数、缺陷被未授权关闭的次数、测试被删除/写桩的次数是否下降。

注意：原文没有给出这些指标的量化基线，试用时应自行记录通过/失败次数和人工审查耗时。
