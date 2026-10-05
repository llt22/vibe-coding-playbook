# msitarzewski/agency-agents

- 结论：**值得一试**。建议小范围试：按 division 只装少量 agent（如 code-reviewer、frontend-developer）进你在用的 Claude Code 或 Cursor，用真实任务跟默认提示做对照。理由是原文给出了可直接照抄的安装、筛选和激活命令，但只给了角色目录，没给任何一个 agent 文件的内容，也没有任何效果证据，值不值得用只能自己验。
- 原文：https://github.com/msitarzewski/agency-agents
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-05T16:38:49.890Z

## 是什么

`msitarzewski/agency-agents` 是一个按职能组织的「AI 专业角色」Markdown 集合（The Agency）。每个 agent 是一个文件，原文声明其结构为：身份与性格、核心使命与工作流、带代码示例的技术交付出物、成功指标与沟通风格。

角色按 division 分组（材料中可见 Engineering、Design、Paid Media、Sales、Marketing 等），每个角色给两列信息：专长（Specialty）和何时使用（When to Use）。规模很大——仅 Engineering 一节就列了 60 个左右角色，从常规的前端、后端、SRE，到少见职能如 Section 508 无障碍专员、AEO/GEO 引用优化、隐私工程、FinOps、语音转写管线、知识图谱、i18n、支付与对账、数据库可靠性、WebAssembly 等。

交付形态有三层：
1. 一个原生桌面 app（macOS/Linux/Windows），一键把 agent 装进 Claude Code、Cursor、Codex、Gemini 等并自动更新；
2. 一套 `scripts/` 安装脚本，支持 Claude Code、Cursor、Codex、Gemini CLI、OpenCode、Copilot、Aider、Windsurf、Kimi、Osaurus、Hermes、Mistral Vibe、DeepSeek Harness、Antigravity、OpenClaw；
3. 纯参考模式：直接读/改 Markdown。

原文还提到 `strategy/runbooks.json` 里的 runbook 有 roster（一组 agent 组成的团队），可整队安装。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**第 1 步：拿到仓库**
前提：本地有 git 与 bash。原文的脚本都是仓库内相对路径 `./scripts/...`，所以先进入仓库根目录再执行（原文未给 clone 命令，仅说明脚本方式需本地有仓库；app 方式则「no clone, no scripts」）。

**第 2 步（最省事）：装桌面 app，一键写入你已在用的工具**
前提：macOS / Linux / Windows 桌面环境。
```bash
brew install --cask msitarzewski/agency-agents/agency-agents
```
或从 releases 页面下载：`https://github.com/msitarzewski/agency-agents-app/releases/latest`。app 会自动更新，省掉后续所有脚本步骤。

**第 3 步：用脚本装进 Claude Code**
前提：已安装 Claude Code，且本机存在 `~/.claude/agents/` 目录。
```bash
# 一次装全部 agent 到 Claude Code 目录
./scripts/install.sh --tool claude-code

# 或只手动复制一个 division
cp engineering/*.md ~/.claude/agents/
```

**第 4 步：在会话里激活某个角色**
前提：第 3 步已把对应 agent 文件放进工具目录。原文给的激活句式可直接套用，替换角色名和任务：
```text
Hey Claude, activate Frontend Developer mode and help me build a React component
```

**第 5 步：装到 Claude Code 以外的工具**
前提：目标工具已安装；`convert.sh` 在仓库内执行。
```bash
# Step 1 -- generate integration files for all supported tools
./scripts/convert.sh

# Step 2 -- install interactively (auto-detects what you have installed)
./scripts/install.sh
```
也可以直接指定工具：
```bash
./scripts/install.sh --tool antigravity
./scripts/install.sh --tool gemini-cli
./scripts/install.sh --tool opencode
./scripts/install.sh --tool copilot
./scripts/install.sh --tool openclaw
./scripts/install.sh --tool cursor
./scripts/install.sh --tool aider
./scripts/install.sh --tool windsurf
./scripts/install.sh --tool kimi
./scripts/install.sh --tool codex
./scripts/install.sh --tool osaurus
./scripts/install.sh --tool hermes
./scripts/install.sh --tool vibe
./scripts/install.sh --tool dsh
```

**第 6 步：只装需要的团队，先看再装**
前提：想控制上下文占用或工具容量时。
```bash
./scripts/install.sh                                    # interactive wizard: pick tools + teams
./scripts/install.sh --tool claude-code --division engineering,security
./scripts/install.sh --tool cursor --agent frontend-developer,ui-designer
./scripts/install.sh --list teams                       # see every team + agent count
./scripts/install.sh --tool opencode --division engineering --dry-run
```
说明（原文）：`--agent` / `--agents-file` 接受 agent 的 slug、显示名，或去掉 `.md` 的文件名，也就是 runbook roster 使用的 id。

**第 7 步：按 runbook 的名单整队安装**
前提：仓库内有 `strategy/runbooks.json`，本地有 python3。
```bash
python3 -c 'import json, sys
for r in json.load(open("strategy/runbooks.json"))["runbooks"]:
    if r["slug"] == sys.argv[1]: [print(a) for g in r["roster"] for a in g["agents"]]' startup-mvp > team.txt
./scripts/install.sh --tool claude-code --agents-file team.txt
```

**第 8 步（OpenCode 用户必看）：绕开运行时上限**
前提：用 OpenCode。原文提醒它当前只注册约 119 个 agent，超出的会被静默丢弃（附了上游 issue 链接），安装器会在选择超过上限时警告——用 `--division` 装子集即可保持在限制内。

**第 9 步：不想装，就当参考用**
前提：无。原文说明每个 agent 文件含身份/性格、使命与工作流、带代码示例的交付物、成功指标与沟通风格，可「浏览下面的 agents，复制/改编你需要的那些」。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：这是本材料最直接的价值。roster 本身就是一份「可以交给 AI 的工作」候选清单，而且是按职能而非按模型能力列的，包含大量不常被想到的条目：Section 508/WCAG 无障碍整改与 VPAT 撰写、AI 引用可见性（AEO/GEO）审计、隐私工程（PII 发现、DSAR/删除管线）、FinOps 云成本、语音转写管线（Whisper/ASR/说话人分离）、知识图谱抽取与图谱增强 RAG、i18n/RTL、支付幂等与对账、数据库可靠性（HA/故障切换/PITR）、WebAssembly、简历 ATS 可解析性校验等。每个条目都带一列「When to Use」，可当作派活时的触发场景。

**2. 任务匹配**：原文给出的匹配维度有三层——按 division 找职能域、按单个 agent 找具体角色、按 runbook 的 roster 找「一队 agent 组合」（可用于一个完整流程，如 startup-mvp）。也支持按目标工具选安装方式。但原文没有说明不同任务该配哪个模型、上下文窗口或协作模式，只有「角色—任务」的对应。

**3. 条件供给**：需要提供的是——目标工具本身（Claude Code / Cursor / Codex / Gemini CLI 等）、agent 文件落到工具的 agent 目录（如 `~/.claude/agents/`）、以及在会话中显式激活角色（原文句式）。agent 文件本身承载了使命、工作流、交付物与成功指标，相当于把「角色定义+流程」预先作为上下文供给。原文在「Use as Reference」一节明确说文件内含身份、使命与工作流、带示例的交付物、成功指标与沟通风格，并给出 `--division`/`--agent`/`--agents-file`/`--dry-run`/`--list` 这些选择与预演的开关。

**4. 主动推进**：基本无依据。原文只提到 runbook（把一组 agent 编成团队）和 app 的自动更新，没有任何关于时间触发、事件触发、状态触发或长时运行流程的说明。材料在 Marketing 表格中途被截断，不能排除后面有相关内容，但就现有材料无法支撑。

**5. 效果验证**：原文只有主张，没有方法。它称 agent 是「Deliverable-Focused」「可衡量的结果」「Production-Ready」「battle-tested workflows and success metrics」，并在文件结构里列出了「成功指标」这一项，但 README 没有给出任何指标定义、评测方法或对照数据，也没有示例成功指标长什么样。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中的条目多数直接出现在本仓库的支持列表里，本仓库相当于它们的**内容层/角色配置文件**，而不是替代品：

- Claude Code（adopt）：仓库的首推集成目标，有 `--tool claude-code` 与 `cp engineering/*.md ~/.claude/agents/` 两条路径，激活也以 Claude Code 为例。
- Cursor（watch）：支持 `--tool cursor`，可 `--agent frontend-developer,ui-designer` 定向安装。
- DeepSeek Harness（watch）：对应 `--tool dsh`。
- OpenClaw（watch）：对应 `--tool openclaw`。
- OpenCode（watch）：对应 `--tool opencode`，且原文专门提示了它约 119 个 agent 的注册上限与静默丢弃问题，这对已有 OpenCode 实践是一条可复核的风险点。
- Hermes（watch）：对应 `--tool hermes`。
- GitHub Copilot（drop）：清单中已判为 drop，但仓库仍提供 `--tool copilot`；是否值得回头调整清单判断，需要另行验证，本次材料不支持翻案。
- DeepSeek（try）：清单里的 DeepSeek 本身不是本仓库的安装目标，只有 DeepSeek Harness（dsh）在列表内，不要混为一谈。

## 证据与局限

**原文给出的可核实内容**：
- 可直接执行的安装/筛选/激活命令与参数（`--tool`、`--division`、`--agent`、`--agents-file`、`--list teams`、`--dry-run`）以及 `convert.sh` 的两步流程；还有一段按 runbook 生成 team.txt 的 python 片段。
- 角色目录：division 名称、agent 名称、专长、何时使用。
- 一个具体的工程约束：OpenCode 运行时约 119 个 agent 上限，超出会被静默丢弃，并附了上游 issue 链接；安装器在超限时会警告。
- 许可为 MIT。

**只是作者主张、没有证据的部分**：
- 「Production-Ready」「battle-tested workflows」「always deliver」「never sleep, never complain」等属于宣传语，README 未给任何效果数据、对比实验或用户案例。
- 「可衡量的结果」「成功指标」被列为文件结构的一项，但没有给出任何指标样例或定义。
- 仓库指标上的 star 数（157,073，今日 595）来自输入元数据而非 README 正文，且数值异常高，不宜作为质量证据引用。

**材料本身的局限（会直接影响判断强度）**：
- 提供的是 README，且在 Marketing 表格处被截断，无法看到完整 division 列表和后续章节。
- **没有展示任何一个 agent 文件的实际内容**——也就是看不到提示词、工作流步骤、交付物模板、成功指标具体怎么写。而手册真正要提炼的恰恰是这部分；目前能照抄的只有安装和激活流程。
- 没有任何成本、权限、数据安全或隐私方面的说明（agent 文件要装进本机工具的配置目录）。
- 原文未说明这些 agent 对模型/版本的要求，也未说明不同工具上行为是否一致。

**适用条件**：需要本地有仓库并能执行 bash 脚本（或装桌面 app）；目标工具已安装；选择 agent 数量时注意 OpenCode 上限；`brew` 命令仅限 macOS。

## 怎么试、怎么验证

**最小试用（建议 1–2 周，只在一两个职能上做）**
1. 先预演，不改本机配置：
```bash
./scripts/install.sh --list teams
./scripts/install.sh --tool claude-code --division engineering --dry-run
```
2. 再实际装一个小的子集，不要装全集，例如 `--agent code-reviewer,frontend-developer`（可按 `--list agents` 打印的 slug 指定）。
3. 选一个本周真实要做的任务，跑两次对照：
   - A 组：默认提示，直接让模型做；
   - B 组：用原文句式激活对应 agent（`Hey Claude, activate Code Reviewer mode and ...`）再做同一任务。
4. 再把同一任务换到另一个工具（如 Cursor）重复一次，看行为是否一致。

**判断有没有改善的指标**（原文没有给指标定义，下面这套需要自己先设基线）
- 交付物形态：输出里是否出现可运行代码/明确流程/结构化交付物，而不是泛泛建议——这是原文「Deliverable-Focused」主张最容易被证伪也最容易观察的一点。
- 返工与轮次：从下达到可用结果所需的澄清轮次数、人工修改时长、返工次数，A/B 组对比。
- 一次通过率：任务定义里的事先验收条件（如「代码能跑」「review 必须覆盖安全项」）第一次就满足的比例。
- 副作用：装了多角色后是否出现上下文占用上升、被错误角色「抢答」、或工具容量被占满（OpenCode 尤其要注意 119 上限）。

**如果这几项都没有改善**，那么本材料的价值就只剩「能力发现清单」——即拿它的 roster 当核对表，问自己「这些职能里哪些其实可以交给 AI」，而不必真去装它的 agent。
