# chinhkrb113/devflow-kit

- 结论：**值得一试**。建议先在一个真实小项目上照 README 的命令装一次，跑一条"新功能全流程"和一条"小改动"流程，重点验证它是否如实报告未执行的检查，再决定是否写进手册；理由是安装、调用提示词、验证与打包命令都到了可直接复制的程度，但效果证据只有仓库自述，没有独立数据。
- 原文：https://github.com/chinhkrb113/devflow-kit
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T14:35:02.795Z

## 是什么

DevFlow Kit（chinhkrb113/devflow-kit，v0.9.0，34 stars）是一个**可移植的 Agent Skills 技能包**：把 11 个互补技能打成一个 capsule，用 Python 安装器装进宿主（Codex / Claude Code / DeepSeek Harness / Trae / 通用 Agent Skills 宿主）的 skills 目录，通过单一入口 `$devflow` 做任务路由，按当前阶段加载所需指导，把"理解→规格→原型→实现→验证验收"串成一条工作流，并用项目工件（规格、架构图、mock、实现、验证证据）在阶段之间传递已批准的决策。

11 个技能及原文给出的定位：

| 技能 | 原文定位 |
|---|---|
| DevFlow | 需求、参考系统发现、生命周期路由、验收记录 |
| Frontend Design | 有意图的视觉方向与前端实现 |
| UI/UX Pro Max | UX 研究、设计数据、特定技术栈指导 |
| Taste | 艺术指导、设计批评、浏览器内检查 |
| UI Taste | Web/原生 UI 工艺与视觉证据流程 |
| Diagram Design | 架构/流程/时序/数据模型图，可编辑 HTML/SVG，可选 PNG |
| Open Code Review | 有界的 diff 评审，OCR 文件选择、规则、显式覆盖率 |
| Security Audit | 源码优先的信任边界分析、结构化发现、独立验证 |
| Superpowers | 15 个按需 profile：计划、调试、TDD、评审、验证 |
| Ponytail | 聚焦实现，只完成请求范围内的东西 |
| Caveman | 被要求时的极简沟通 |

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 步骤 1：准备前置条件
**前提**：本机已装 Python 3.12+ 与 Git；一个已存在的目标项目目录。
完整验证另需 Node.js 22+、Bash、Playwright/Chromium（浏览器类检查用）。原文明确要求"依赖放在技能安装之外"。

### 步骤 2：克隆并安装到项目
**前提**：目标项目目录已存在。

```bash
git clone https://github.com/chinhkrb113/devflow-kit.git
cd devflow-kit
python plugin/install.py --target codex --project "/path/to/project"
```

Windows 路径如 `D:/my-project` 可用。可先用 `--dry-run` 预览安装目标；`--scope user` 替代 `--project` 可做用户级安装。原文说明：安装器保留已有内容，遇到被修改过的安装会拒绝覆盖，升级/回滚见 `plugin/INSTALL.md`。

### 步骤 3：安装后自检

```bash
python plugin/install.py --target codex --project "/path/to/project" --check
```

原文强调：
- 安装器会在 `<skills-root>/devflow` 下创建含全部 11 个组件与支撑资源的目录；
- **复制文件、宿主能发现技能、能实际执行技能，是三件不同的事**；
- 宿主若没有 shell/浏览器工具，可以读指导，但不能声称跑过这些检查。

### 步骤 4：新会话走完整流程
**前提**：开一个全新的 agent 会话（Codex 里用 `$devflow`，其他宿主用其暴露的名字/命令）。

```text
$devflow Build a task management tool for a small team.
Clarify requirements, compare reference systems, write the specification
and acceptance criteria, draw the architecture, then create an interactive
mock to agree on behavior before implementation.
```

### 步骤 5：已有项目上的小改动（不重启全流程）
**前提**：项目已有既定品牌与技术栈。

```text
$devflow Fix keyboard focus in the existing modal. Preserve the approved
brand and stack. Check initial focus, Tab order, closing behavior and
focus return. Report the checks that actually ran.
```

原文的机制说明：小改动保留已批准的决策，聚焦的 UI 修复不重启整个设计流程；"Report the checks that actually ran"这类措辞是刻意要求区分"跑过"与"没跑"。

### 步骤 6：通过路由要一张架构图

```text
$devflow Inspect the current system and draw its architecture.
Show components, data flows and external dependencies. Separate observed
behavior from proposals. Reuse the project's visual style, deliver editable
HTML/SVG, and validate the diagram before reporting it complete.
```

原文边界：架构图只描述"现有证据支持的"系统，提议中的行为要显式标注；Diagram Design 只保证关系可读、检查生成的 HTML/SVG，**架构正确性仍取决于源证据与人工评审**。

### 步骤 7：有界代码评审

```text
$devflow Review the changes between main and this branch. Use Open Code
Review in host-model delegation mode when available. Account for every
selected file, verify findings against source and report coverage gaps.
Do not modify the code.
```

### 步骤 8：聚焦的安全审查

```text
$devflow Use Security Audit guidance to inspect authorization in this API.
Trace the relevant trust boundary and distinguish confirmed source evidence
from facts that still need validation. Keep this a focused source review.
```

原文边界：明确要求"全面审计"时才走完整的六阶段流程，它需要独立验证与适当隔离才能跑目标方控制的代码；**安装这个技能本身不提供这些能力**，缺失能力要留在结果里可见，不能拿"成功"顶替。

### 步骤 9：验证与打包

```bash
python plugin/verify_bundle.py --with-example --report .local/verification.json
python scripts/package_skill.py --output dist/devflow-kit-v0.9.0.zip
python scripts/package_skill.py --format plugin --output dist/devflow-kit-plugin-v0.9.0.zip
```

运行环境在默认路径之外时用 `--node` / `--playwright-module` 或 `NODE_BINARY` / `PLAYWRIGHT_MODULE` 环境变量。打包拒绝覆盖已有归档，并写 SHA-256 sidecar。

### 步骤 10：换宿主或通用宿主

| Harness | 安装目标 | 项目技能根目录 |
|---|---|---|
| Codex | `codex` | `.agents/skills` |
| Claude Code | `claude-code` | `.claude/skills` |
| DeepSeek Harness | `dsh` | `.dsh/skills` |
| Trae / Trae CN | `trae` / `trae-cn` | `.trae/skills` |
| 其他 Agent Skills 宿主 | `generic` | 显式 `--skills-root` |

```bash
python plugin/install.py --target generic --skills-root "/exact/skills/root"
```

把快速开始里的 `codex` 换成对应目标即可。原文提醒：某些宿主把它暴露为 `devflow-kit:<component>`，要用宿主返回的确切名字与路径，并保持整个 capsule 完整，否则同级策略与资源会丢失。

### 步骤 11：按需进入某一阶段
原文明确支持"不从头跑"：新产线走完整流程，已有项目从相关阶段进入；`devflow` 负责选工作流并加载支撑技能。

## 对应的研究问题（对照五个问题逐条说明，只写有依据的）

**1. 能力发现**
原文给出了一批"可以交给 agent"的具体工种，且都不是泛泛的写作/问答：需求澄清与成功标准、参考系统调研、规格与验收标准撰写、架构/流程/时序/数据模型图（产出可编辑 HTML/SVG 并自检）、可点击 mock、有界 diff 评审（带文件覆盖率核算）、源码优先的信任边界安全分析、TDD/调试/评审/验证的 15 个按需 profile。这一条是本文最有素材价值的部分——它给的是"工种清单 + 每个工种的产物形态"。

**2. 任务匹配**
- 按**阶段**匹配而非按话题：router 按当前任务加载所需指导，同一入口承担不同阶段。
- 按**改动规模**匹配：小改动保留已批准决策、不重启设计流程；新功能走全流程。
- 按**任务类型**匹配技能：UI 类共享一份 `ui-task-policy.md`；评审走 `review-security.md` 的协调规则；安全分"聚焦审查"与"显式要求的完整审计"两档。
- 按**宿主**匹配安装路径与运行时能力（见步骤 10 表）。
- 模型分工：Open Code Review 默认"host-model delegation"，其外部 `ocr` CLI 不随包安装。

**3. 条件供给**
- 宿主须提供：模型、文件访问、执行工具（shell/浏览器）；缺一项则相应检查不能被声称完成。
- 须提供安装位置：项目级 skills root 或用户级安装。
- 须提供项目工件作为跨阶段载体：规格、图、mock 接口、实现、验证证据。
- 须提供运行时：Python 3.12+、Node 22+、Git、Bash、Playwright/Chromium；路径非常规时用参数或环境变量指定。
- 须给出反馈口径：提示词里显式要求"报告实际跑过的检查"、"区分确认的源码证据与待验证事实"、"报告覆盖率缺口"。

**4. 主动推进**
原文**没有**给出基于时间、事件或状态持续触发的机制（无 cron、hook、watch、CI 集成说明）。仅有可重复执行的状态检查：`install.py --check` 与 `verify_bundle.py`。因此这一问在本材料中基本无据，不能据此写手册条目。

**5. 效果验证**
- 可执行的验证入口：`verify_bundle.py --with-example --report .local/verification.json`，把结果写成 JSON 报告。
- 证据分级思想：技术结果与人工验收要分开；验证器通过 ≠ 视觉检查 ≠ 内容评审；缺能力要显式留在结果里，不得用成功声明替代。
- 覆盖率核算：评审要"对每个被选中的文件都有交代"并报告覆盖缺口。
- 产物可追溯：打包写 SHA-256 sidecar；有 `docs/verification-0.9.0.md`、`0.7.1` 发布验证记录（原文只给了链接，未给内容）。

## 与已有做法的关系

- **Agent Skills（清单状态 adopt）**：本包就是该概念的一个具体发行形态——capsule + 安装器 + 按宿主映射 skills root，可作为"如何分发技能"的工程样本。
- **Claude Code（adopt）**：原文列为一等目标宿主，项目技能根为 `.claude/skills`，安装时 `--target claude-code`。若手册已按 Claude Code 写，这是可直接挂上去的扩展。
- **Ponytail（study）**：被原样收编为本包 11 个技能之一，定位"聚焦实现、只完成请求范围"。也就是说本包不是替代 Ponytail，而是给它加了上游（需求/规格）与下游（评审/验证）的框。
- **DeepSeek Harness（watch）/ DeepSeek（try）**：原文把 DeepSeek Harness 列为支持宿主（`--target dsh`，`.dsh/skills`），并强调"能读指导 ≠ 能跑检查"——这正好对应清单里该条 watch 状态的判断依据。
- 清单之外的补充：Open Code Review、Security Audit、Diagram Design、Superpowers 这几个在本包中首次以"带明确证据边界"的方式出现，可作为清单新增候选。

## 证据与局限

**原文给出的、可核对的东西**
- 可直接复制的命令：clone、`install.py`（含 `--check` / `--dry-run` / `--scope user` / `--skills-root`）、`verify_bundle.py`、`package_skill.py`。
- 可复制的提示词模板 5 条（全流程、小改动、架构图、代码评审、安全审查）。
- 宿主→路径映射表；运行时依赖清单；仓库目录结构。
- 明确的自我限制声明：验证器通过与视觉/内容评审分离；架构正确性依赖源证据与评审；完整安全审计需独立验证与隔离，安装技能不提供；缺能力要可见。

**只是主张、未经材料佐证的部分**
- "11 个互补技能能带来更好结果"——无对照实验、无用户案例、无效率/缺陷率数据；34 stars 也说明社区验证有限。
- 各技能的实际质量（表格里只有一句话定位），本材料无法判断其提示词与流程的真实强度。
- 原文引用的 `docs/verification-0.9.0.md`、`HARNESS-COMPATIBILITY.md`、`ui-acceptance.md` 等均只给链接，**内容未提供**，因此"验证记录存在"本身不能当作已通过验证的证据。
- 版本号 v0.9.0（未到 1.0）、无 release 历史与 issue 情况，成熟度未知。

**适用条件**
- 适合：有明确"需求→实现→验收"链路的软件项目；宿主支持文件读写 + shell + 浏览器；团队愿意遵守"报告实际跑过的检查"这种纪律。
- 不适合：无代码执行环境的纯文本宿主（只能读指导）；需要自动化定时/事件驱动的场景（本包不覆盖）；想靠它直接拿到安全审计隔离能力（原文自己否认）。

## 怎么试、怎么验证

**最小试用（半天量级）**
1. 选一个一周内要做的小型真实需求 + 一个已有项目上的小 bug（如键盘焦点修复）。
2. 按步骤 2–3 安装到该项目，先跑 `--dry-run` 确认落点，再 `--check`；顺手记录安装器是否真的没覆盖已有文件。
3. 新会话用步骤 5 的"小改动"提示词跑一遍，再用步骤 4 的全流程提示词跑一遍。
4. 分别用步骤 7、8 的提示词各跑一次评审与安全审查。
5. 跑 `verify_bundle.py --with-example --report`，保留 JSON。
6. 对照组：同样的两个任务，用你当前不用本包的方式做一遍。

**判断有没有改善的指标（都可人工计分）**
- **诚实度**：agent 报告里"实际执行的检查"与"声称完成但无证据"的比例。这是本包最该被验证的点——它自己反复强调这一点，若实测仍出现"没跑却说跑过"，价值大打折扣。
- **返工轮次**：进入实现前，规格/验收标准是否一次谈清；实现后因需求误解的返工次数是否下降。
- **评审覆盖率**：评审是否对每个被选文件都有交代、是否显式列出覆盖缺口。
- **验证可追溯性**：`verification.json` 是否可复现、打包产物是否有 SHA-256 sidecar。
- **小改动成本**：小 bug 是否真的没有触发整套设计流程（看对话轮次与 token 消耗）。

**升级为 adopt 的门槛**：上述诚实度与返工轮次在至少 2 个真实任务上稳定优于对照组，且 `--check` / `verify_bundle` 在目标宿主上确实跑通（而非只被"读"到）。在拿到这个证据前，本文只建议 try。
