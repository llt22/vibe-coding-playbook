# sickn33/agentic-awesome-skills

- 结论：**值得一试**。可以把 AAS Core 当作「按任务找现成 SKILL.md 并受控安装」的试用入口：先按 README 给出的命令在单一 host（Codex 或 Claude）上配置本地 MCP，让 agent 选出少量 skill ID，validate + plan 预览后再 dry-run 安装；之所以只建议试，是因为 README 只给出安装/预览级步骤，apply 与 recovery 仍属实验性，且 2610+ 技能库本身没有质量与语义适配的证据。
- 原文：https://github.com/sickn33/agentic-awesome-skills
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T12:26:09.705Z

## 是什么

Agentic Awesome Skills（AAS Core）是一个包含 2,610+ 个可安装 `SKILL.md` playbook 的技能库，外加一个本地控制平面：

- 让 Codex 或 Claude **搜索完整本地目录**、**记录 agent 选中的技能**、在改动目标前**预览一份可审查的计划**。
- README 明确声明：**Core 不做排序、不做推荐**；`compose_stack` 是只读工具，只在内存中校验所选 ID 与结构。
- 当前发布版 **V18.11.0**；支持的是「本地目录检查 + agent 自主选择 + 栈校验 + 计划预览」，而 **apply 与 recovery 仍是实验性、需显式 opt-in，不在受支持预览路径内**。
- 官方仓库为准，另有两个伴生界面：托管目录 `aaskills.tech` 与浏览器本地 Workbench（在浏览器内存中审查 stack 与 plan，不访问文件系统）。
- 技能库本体在 `skills/`，机器可读索引为 `skills_index.json`（Stable Skills Manifest v1，schema 在 `schemas/skills-index.v1.schema.json`，另有镜像 `data/skills_index.json`），人读目录为 `CATALOG.md`。
- 这是独立社区项目，与 Google 无隶属或背书关系（README 明说）。

## 具体做法（编号步骤）

**前提**：本机有 npm/npx；已安装并配置好目标 host（Codex CLI 或 Claude Code）；准备好 config 文件与缓存目录的**绝对路径**；在可回退的项目/沙盒里操作。

1. 先看 Core 指南与信任边界（README 指向 `docs/users/aas-core.md` 的 v18.11.0 版本）与 host 指南（`docs/users/codex-cli-skills.md`、`docs/users/claude-code-skills.md`）。注意版本化指南描述的是已发布包，README 的 main 分支可能含未发布功能。

2. 配置本地 MCP。第一条配置命令会**先预览变更并返回 approval digest**（即需要你确认）：

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@18.11.0 -- aas mcp configure \
  --host codex \
  --scope user \
  --config /absolute/path/to/codex/config.toml \
  --cache-root /absolute/path/to/aas-cache
```

Claude 用 `--host claude` 并替换成它的配置路径。审批、重连、校验、规划的细节在 Core setup guide。

3. 让 agent（Codex 或 Claude）检查你的项目、比较相关技能、保存确切的技能选择。选择结果可落盘为 `aas-stack.json`，并可附上选择证据（selection evidence）。skill 清单的**技术上限是 128 个技能**。

4. 校验与预览计划：

```text
aas stack validate      # 校验 manifest
aas stack plan          # 写出不可变的预览计划，供你审查
```

5. 用 Workbench（`https://aaskills.tech/workbench`）在浏览器内存中审查 stack 与 plan 产物。README 特别提示：**结构合法与身份合法并不等于语义适配、兼容、配置正确、运行安全或可安全 apply**。

6. 如果要把已审查的 ID 交给直接安装器，用 `aas stack install-preview`；该命令**只准备 `--dry-run` 预览，不会应用 Core 计划**。

7. 已知道 ID 时，可直接预览一次定向安装：

```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@18.11.0 -- \
  agentic-awesome-skills --release 18.11.0 --path .agents/skills \
  --skills brainstorming,systematic-debugging --dry-run
```

检查预览输出，确认无误后**去掉 `--dry-run`** 再执行一次。注意：直接安装器不会消费或应用 Core 计划。

8. 按 host 选择安装路径（README 的选型表，均为可复制命令）：

```text
Cursor              npx agentic-awesome-skills --cursor
Gemini CLI          npx agentic-awesome-skills --gemini
Codex CLI           npx agentic-awesome-skills --codex   （或用 Core MCP 预览）
Autohand Code       npx agentic-awesome-skills --path ~/.autohand/skills   或 --path .autohand/skills
Antigravity IDE     npx agentic-awesome-skills --antigravity --skills <ids> --dry-run
Antigravity CLI     npx agentic-awesome-skills --agy
Kiro CLI            npx agentic-awesome-skills --kiro
Kiro IDE            npx agentic-awesome-skills --path ~/.kiro/skills
GitHub Copilot      gh skill install sickn33/agentic-awesome-skills skills/brainstorming/SKILL.md --agent github-copilot --scope user --pin v14.2.0   （preview）
OpenCode            npx agentic-awesome-skills --path .agents/skills --category development,backend --risk safe,none
AdaL CLI            npx agentic-awesome-skills --path .adal/skills
自定义              npx agentic-awesome-skills --path ./my-skills
```

各 host 的首次使用示例：Cursor 用 `@brainstorming help me plan a feature`，Gemini/Codex/Autohand/Kiro/Agy 用 `Use brainstorming to plan a feature` 一类说法。

9. Antigravity 特别注意：它监控的 skill 目录会**过载上下文**，因此默认目标要求给出选定集合、加 filter，或显式 `--all` 覆盖。若已装太多导致过载，按 `docs/users/agent-overload-recovery.md` 做选择性激活；其他 host 用安装器的 `--risk`、`--category`、`--tags` 过滤，先预览更小的定向安装。

10. 想按领域整包来，可装专用插件（Claude Code 与 Codex 可用，部分 bundle 有标准 Agent Plugins manifest），每个 8–10 个技能：Web App Builder、Product Design Studio、Security Engineer、Secure App Builder、Documents & Presentations、Data Analytics、Agent & MCP Builder、QA & Test Automation、DevOps & Cloud、Accessibility & Inclusive UX、API Platform Builder、SaaS Launch & Revenue、AI Product & Evaluation Ops。

11. 需要按角色/目标组织技能时看 `docs/users/bundles.md`（如 Web Wizard、Security Engineer、OSS Maintainer）；需要执行顺序时看 `docs/users/workflows.md`（planning / shipping / testing / auditing 的有序 playbook，另有机器可读的 `data/workflows.json`）。README 强调：bundle 与 workflow 只是选型与运行顺序的指引，**不是额外要安装的包**。

12. 出现问题时按 Troubleshooting 列表定位：Core 信任边界、安装与日常使用、Windows 上下文与截断恢复、Linux/macOS 过载与选择性激活、插件兼容性、安全与杀毒告警。

## 对应的研究问题

- **能力发现**：直接相关。2,610+ 个 `SKILL.md` 构成可搜索目录，另有人读 `CATALOG.md` 与机器可读 `skills_index.json`（含 v1 schema 与兼容镜像），托管目录与 Workbench 提供浏览/审查面；13 个领域插件清单本身也是一份「哪些工作可以交给 AI」的领域地图（文档与演示、数据分析、Agent/MCP 构建、QA 自动化、DevOps、无障碍审计、API 平台、SaaS 增长、AI 产品与评测等）。
- **任务匹配**：有依据。选型表把 host 与安装方式、首次使用提示对应起来；bundles 按角色/目标分组，workflows 给出有序 playbook 并提供 `data/workflows.json` 供集成。但 Core 明确**不排序、不推荐**，匹配决策由 agent 或你自己做——手册里应把它写成「发现与供给层」，而不是「自动匹配器」。
- **条件供给**：有依据但不完整。需要提供：本地 MCP、（Codex/Claude 的）config 路径与 cache-root、目标路径、明确的 skill ID 列表、可选的 `aas-stack.json` 与选择证据、以及按 risk/category/tags 的过滤条件；反馈面包括配置时的 approval digest、`stack validate` 结果、`stack plan` 的不可变预览、以及 dry-run 输出。
- **主动推进**：**没有可照做的依据**。原文只有 registry 的版本/技能数同步（`registry-sync` 注释里的 version/skills/updated_at）与发布版本号，没有时间、事件或状态触发的持续执行机制描述。
- **效果验证**：只有**结构与身份**层面的验证。README 明确：`stack validate` 检查 manifest，结构合法与身份合法**不证明**语义适配、兼容性、setup 正确性、运行安全或可安全 apply；`install-preview` 只准备 dry-run 预览。原文未给出任何任务效果指标。

## 与已有做法的关系

- **Agent skills（concept, adopt）**：核心同源概念。AAS 是这一概念的最大规模聚合目录之一，但注意其技能来自多方（README 的 Credits 列出 anthropics/skills、openai/skills、google-gemini/gemini-skills、microsoft/skills、vercel-labs/agent-skills 等官方来源，以及大量独立作者与**付费技能**如 Beatra 系列）。
- **Claude Code（adopt）、OpenAI Codex（adopt）**：正是 AAS Core 目前唯一支持 MCP 预览的两个 host，可直接对接手册中已采用的做法。
- **Cursor（watch）、OpenCode（watch）、GitHub Copilot（drop）**：README 给出它们各自的直接安装命令（Copilot 走 `gh skill install ... --pin`，标注 preview）。这意味着清单里对 Copilot 的 drop 判断与本文的可用路径有出入，值得复核。
- **addyosmani/agent-skills（try）、obra/superpowers（study）、mattpocock/skills（study）、andrej-karpathy-skills（adopt）**：同类技能集合/工具。AAS 不是它们的替代，而是可作它们的**发现与筛选层**（前提是这些技能确实被收录，README 未逐条确认）。
- **Playwright Test（try）**：被 QA & Test Automation 插件（测试套件、浏览器自动化、QA 稳定化）与 BrowserAct/Browserbase 类技能覆盖到，属功能重叠区间。
- **Atlas（watch）**：以 Atlas Cloud 的 `atlas-cloud-media` 技能（异步图像/视频生成）出现在 Credits 与赞助列表中。
- **Obsidian（drop）、goose（watch）、Hermes（watch）、OpenClaw（watch）、Orca（try）**：原文无对应内容。

## 证据与局限

原文给出的**数据**：2,610 个技能、版本 18.11.0（同步注释为 version=18.11.0）、stars 47,134（badge 写 47,000+，与初筛 47,135 一致）、manifest 技术上限 128 个技能、13 个插件各含 8–10 个技能、`gh skill install` 示例 pin 到 v14.2.0。这些来自 README 正文与注释，可信度较高。

原文给出的**流程与命令**：`aas mcp configure`（含 approval digest）、`aas stack validate`、`aas stack plan`、`aas stack install-preview`、直接安装器的 `--dry-run` 与各类 host 参数——这些是可照做的部分。

**明确的自述局限**（原文原话级）：
- apply 与 recovery 是实验性，需要 opt-in，且位于受支持预览之外。
- Core 不排序、不推荐候选，也不在受支持预览路径中安装技能。
- 结构与身份有效性**不等于**语义适配、兼容、配置正确、运行安全或可安全 apply。
- Antigravity 监控目录会过载上下文，是已知失败模式；Windows 有截断问题、Linux/macOS 有过载问题（各自有恢复文档）。

**只是作者主张、无证据的**：2610 个技能的**质量、覆盖度与实际可用性**没有任何数据支撑；「curated」的说法来自支持段落而非质量报告；每个 SKILL.md 的内容、风险等级、是否可运行都未在本文呈现。第三方付费技能（Beatra 系列，安装自 digest-pinned 归档、首次使用前禁用自更新）的存在说明目录内含商业内容，选型时需甄别。

**抓取局限**：原文在 Credits 的 Modellix 处被截断，因此插件后的部分（社区、贡献者、License 细节等）不可见；且正文指向的 `docs/users/*` 文档（Core 指南、host 指南、bundles/workflows、安全指南）**未包含在输入中**，所以 MCP 工具契约、能力边界、审批细节只能按 README 概述复述，未验证。

**适用条件**：用 Codex 或 Claude 做 host；有 npm；能接受在项目/沙盒中改动技能目录；能接受先预览后应用的谨慎流程。若你依赖 apply 自动化或需要稳定的持续运行，当前不适用。

## 怎么试、怎么验证

**最小试用（建议 30–60 分钟，沙盒项目）**

1. 选**一个** host（Codex 或 Claude），只在一台机器、一个临时项目里配置 `aas mcp configure`，走完 approval digest 确认。
2. 给 agent 一个**具体任务**（例如「为这个 Node 仓库排一次调试计划」），要求它从本地目录选出**不超过 5 个** skill ID，并落盘 `aas-stack.json`。
3. 跑 `aas stack validate` 与 `aas stack plan`，用 Workbench 审阅这份预览。
4. 用 `aas stack install-preview` 或直接安装器的 `--dry-run` 看将要写入的文件清单；确认后再去掉 `--dry-run` 执行一次。
5. 用同一任务再做一遍**不装任何技能**的对照运行。

**判断有没有改善的指标**（都能从上述过程直接观察到）

- **相关性**：agent 选出的 5 个 ID 与任务是否相关（人工评分，1–5）；这是 Core 明确不做的事，必须人工兜底。
- **可复现性**：`stack plan` 的预览是否稳定、可读、能交给别人照着装；`aas-stack.json` 能否原样复用到第二台机器。
- **预览准确性**：dry-run 输出的文件路径/数量与最终实际写入是否一致（不一致即视为流程不可信）。
- **收益**：装技能后 agent 是否减少澄清轮次与返工；对照无技能基线比较同一任务的轮次与返工次数。
- **成本/风险**：上下文占用是否上升（尤其在 Antigravity，或一次装十几个技能时）；安装前后是否触发安全/杀毒告警；`skills_index.json` 中的 risk 标签是否与实际一致。
- **红旗信号**：`validate` 通过但任务结果没有改善——正说明该流程只保证结构有效，不保证语义适配，此时应退回人工挑选技能 ID、缩小到 1–2 个再试，而不是扩大安装量。
