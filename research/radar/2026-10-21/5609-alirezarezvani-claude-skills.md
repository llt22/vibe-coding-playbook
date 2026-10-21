# alirezarezvani/claude-skills

- 结论：**值得一试**。先只装一个域、并在安装前用仓库自带的 skill-security-auditor 扫一遍，再挑两个真实任务与“不装 skill”的基线对比返工轮数；值得试的理由是它把领域流程固化成 SKILL.md＋脚本＋参考文档的可复制结构，但 README 全是目录与宣传、没有任何效果数据，规模数字还自相矛盾，不能直接 adopt。
- 原文：https://github.com/alirezarezvani/claude-skills
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-21T10:05:53.713Z

## 是什么

一个 MIT 许可的开源仓库，把“让编码智能体具备某个领域的专业能力”这件事打包成可安装的 skill 集合。README 自称包含 392 个 skill、120 个 agent、151 个命令、7 个 persona，覆盖 20 个领域（工程、DevOps/可靠性、安全与合规、营销、产品、项目管理、C-level 顾问、生产力、学术研究、企业研究运营、财务、商业运营等），并可转换给 13 种编码工具使用（Claude Code、OpenAI Codex、Gemini CLI、Cursor、Aider、Windsurf、Kilo Code、OpenCode、Augment、OpenClaw、Hermes Agent、Mistral Vibe、Antigravity）。

单个 skill 的结构（这是全篇最有复用价值的部分）：

- `SKILL.md`：frontmatter + 结构化指令、工作流、决策框架
- `scripts/`：Python CLI 工具，README 称全部只用标准库、零 pip 安装
- `references/`：模板、检查清单、领域知识文件
- `assets/`（可选）

仓库还给了三层分工：**Skills** 定义“怎么执行任务”，**Agents** 定义“做什么任务”，**Personas** 定义“谁在想（跨领域的身份与优先级）”，以及一套轻量编排协议把三者组合起来。

## 具体做法（编号步骤；可直接复制的命令）

**步骤 0｜前提**：本地有 git 与 Python 3；已装 Claude Code，或 Codex / Cursor / Aider 等任一编码智能体。Windows 用户必须用 `git clone -c core.symlinks=true`（并开启开发者模式），否则 `.gemini/`、`.codex/`、`.vibe/`、`.hermes/` 镜像目录会变成单行指针文本；同时设 `PYTHONUTF8=1`，否则打印 Unicode 的脚本会在旧代码页控制台崩溃。

**步骤 1｜先克隆到本地（用于后续审计与转换）**

```bash
git clone https://github.com/alirezarezvani/claude-skills.git
cd claude-skills
```

**步骤 2｜安装前做安全审计（不要跳过）**

仓库自己提供了扫描器，README 明确说要在安装前扫描 skill 的恶意代码风险，返回 PASS / WARN / FAIL：

```bash
python3 engineering/skill-security-auditor/scripts/skill_security_auditor.py /path/to/skill/
```

前提：目标 skill 目录已在本地（步骤 1 已完成）。审计覆盖命令注入、代码执行、数据外泄、提示注入、依赖供应链风险、权限提升。

**步骤 3｜在 Claude Code 里按“单个域”安装（不要一次全装）**

```bash
# 添加 marketplace
/plugin marketplace add alirezarezvani/claude-skills

# 只装一个域（示例：核心工程 24 个）
/plugin install engineering-skills@claude-code-skills

# 或只装单个 skill（示例：安全扫描器）
/plugin install skill-security-auditor@claude-code-skills
```

前提：在 Claude Code 会话内执行；斜杠命令不是 shell 命令。README 给出的其他域包名包括 `product-skills`、`marketing-skills`、`pm-skills`、`c-level-skills`、`finance-skills`、`business-growth-skills`、`ra-qm-skills`、`engineering-advanced-skills`。

**步骤 4｜在 Codex / 其他工具里安装或转换**

```bash
# OpenAI Codex
npx agent-skills-cli add alirezarezvani/claude-skills --agent codex

# 或克隆后跑安装脚本
./scripts/codex-install.sh

# 全量转换到所有工具（README 称约 15 秒）
./scripts/convert.sh --tool all

# 装进指定项目（带确认；--force 跳过确认）
./scripts/install.sh --tool cursor --target /path/to/project
```

各工具的目标目录：Cursor → `.cursor/rules/*.mdc`；Aider → `CONVENTIONS.md`；Kilo Code → `.kilocode/rules/`；Windsurf → `.windsurf/skills/`；OpenCode → `.opencode/skills/`；Augment → `.augment/rules/`；Antigravity → `~/.gemini/antigravity/skills/`；Hermes → `python scripts/sync-hermes-skills.py --verbose` 装到 `~/.hermes/skills/`；Mistral Vibe → `./scripts/vibe-install.sh` 装到 `~/.vibe/skills/`。

**步骤 5｜校验安装结果**

```bash
find .cursor/rules -name "*.mdc" | wc -l
```

前提：上一步的目标是 Cursor。README 在此处写的期望值是 346，而同一页其他地方写 345 和 392，说明数字不可全信，以实际 `find` 结果为准。

**步骤 6｜直接调用随包的 Python 工具（不经过智能体也能用）**

```bash
# SaaS 健康度
python3 finance/saas-metrics-coach/scripts/metrics_calculator.py --mrr 80000 --customers 200 --churned 3 --json

# 品牌语气分析
python3 marketing-skill/content-production/scripts/brand_voice_analyzer.py article.txt

# 技术债打分
python3 c-level-advisor/cto-advisor/scripts/tech_debt_analyzer.py /path/to/codebase

# RICE 优先级排序
python3 product-team/product-manager-toolkit/scripts/rice_prioritizer.py features.csv
```

前提：README 称这些工具只用标准库、无需 pip 安装；但工具数量在文中出现 580 / 706 / 746 三种说法，具体某个脚本是否存在需自行 `ls` 确认。

**步骤 7｜用统一的调用句式触发 skill**

```
Using the senior-architect skill, review our microservices architecture
and identify the top 3 scalability risks.
```

即固定为“Using the <skill-name> skill, <任务>”，让智能体显式加载对应 SKILL.md。

**步骤 8｜按四种编排模式组合（跨域工作时用）**

| 模式 | 做法 | 适用 |
|---|---|---|
| Solo Sprint | 按项目阶段切换 persona | 单人项目、MVP |
| Domain Deep-Dive | 一个 persona + 叠加多个 skill | 架构评审、合规审计 |
| Multi-Agent Handoff | persona 互相评审对方产出 | 高风险决策、发布就绪检查 |
| Skill Chain | 纯顺序串 skill，不用 persona | 内容流水线、可重复清单 |

README 给的 6 周产品发布示例：第 1–2 周 `startup-cto` + `aws-solution-architect` + `senior-frontend`（构建）；第 3–4 周 `growth-marketer` + `launch-strategy` + `copywriting` + `seo-audit`（准备）；第 5–6 周 `solo-founder` + `email-sequence` + `analytics-tracking`（上线迭代）。完整协议在 `orchestration/ORCHESTRATION.md`。

**步骤 9｜要用 persona 就拷到对应目录**

```bash
cp agents/personas/startup-cto.md ~/.claude/agents/
```

自建时参照 `agents/personas/TEMPLATE.md`；自建 skill 参照仓库外的 Skills & Agents Factory（README 指向 `alirezarezvani/claude-code-skills-agents-factory`）。

## 对应的研究问题

**1. 能力发现**：仓库本身就是一份“可以交给 AI 的任务候选清单”，而且列到了不少团队没想到的项：`codebase-onboarding`（从代码库自动生成入职文档）、`runbook-generator`（代码库→带命令的运维手册）、`tech-debt-tracker`（技术债扫描与趋势看板）、`changelog-generator`（conventional commits → 结构化 changelog）、`interview-mapper`（访谈转录编码并核验引文）、`aeo`（跨 5 个 LLM 的引用追踪与 E-E-A-T 审计）、`agent-decision-receipts`（带签名的动作回执）。但都只有名称与一句话描述，没有任务样例或效果。

**2. 任务匹配**：给出了明确的匹配规则——Skills（怎么做）/ Agents（做什么）/ Personas（谁在想）三分法，加上四种编排模式与“按域安装”的粒度建议，可以作为“什么工作配什么上下文与协作方式”的映射表原型。README 还区分了不同工具的接入格式（rules 文件 vs CONVENTIONS.md vs SKILL.md），说明同一能力在不同工具里的落地方式不同。

**3. 条件供给**：这是最有依据的一块。skill 目录结构本身就是“需要提供哪些信息”的模板：指令（SKILL.md）＋可执行工具（stdlib Python 脚本）＋参考文档与模板（references）。安装动作等价于授予命令与工具权限。此外 README 提到 `human-gate`（把人工评审做成结构化产物并设置阻塞闸门）、`agent-memory`（L0–L3 四级记忆，跨会话复发才升级，未经人工 adopt 不进 CLAUDE.md）、`security-guidance` 的 PreToolUse hook——这些是权限与反馈回路层面的供给，但只有一句话，没有配置细节。

**4. 主动推进**：有明确组件但缺配置。`agent-launcher` 域声称能“建/启动/评分/定时”托管 agent，含 `run-without-you`（cron 部署循环）与 `grade-iterate`（有界的结果迭代循环）；`loop-library` 用于发现、审计、修复、设计有界循环；`skillopt-sleep` 声称从真实 Claude Code 会话做夜间带闸门的自演化；`autoresearch-agent`、`deep-research` 也是长跑型任务。触发条件与持续机制的具体写法 README 未给。

**5. 效果验证**：最薄弱。只有 `skill-doctor`（按真实会话历史给 agent 配置打分，评分标准判定＋确定性闸门＋可追溯证据）和 `self-eval`、以及一个 SkillCheck 徽章。没有任何前后对比数据、用户案例或基准测试。手册若要写“怎么判断确实改善了结果”，只能借鉴其“从真实会话取证 + 闸门”的思路，不能引用其结论。

## 与已有做法的关系

- **Claude Code（adopt）**：README 的首选安装路径就是 Claude Code 的 plugin marketplace，`/plugin marketplace add` + `/plugin install`，本条目是该工具生态下最直接可用的外部能力包。
- **Agent skills（adopt）**：整个仓库是 agentskills.io SKILL.md 标准的规模化实现，可作为“skill 应该长什么样”的参考实现（frontmatter + 指令 + scripts + references + assets），也是跨工具同一套 skill 复用的现成样本。
- **OpenAI Codex（adopt）**：给出 `npx agent-skills-cli add ... --agent codex` 与 `./scripts/codex-install.sh` 两条路径，并声称 SKILL.md 无需格式转换。
- **Cursor / OpenCode / OpenClaw / Hermes（均为 watch）**：分别给出 `.cursor/rules` 转换、`.opencode/skills/` 安装、一键 curl 脚本、`sync-hermes-skills.py` 同步命令，可以作为把这些 watch 项往前推一格的验证入口。
- **Playwright Test（try）**：`playwright-pro` 覆盖测试生成、flaky 修复、迁移，是本仓库里与已有条目最直接对口的能力；但 README 只说“toolkit”，没给具体用法。
- **Atlas（watch）**：清单中没有对应的仓库内容。

## 证据与局限

**原文给出的（可核对的）**：安装/转换/校验的确切命令、各工具的目标目录、skill 的目录结构、四种编排模式与 6 周示例、可直接运行的 Python 脚本调用行、安全扫描器的用法与返回等级。这些是真实可照做的部分。

**只是作者主张的**：
- “production-ready”“最全面”——无第三方验证，无任务前后对比、无用户案例、无基准测试、无失败案例。
- “全部 Python 工具零依赖、`--help` 已验证”——自述，且工具数量在正文 580、正文另一处 706、FAQ 746 之间不一致；skill 数量在 392 / 345 / 346 之间不一致。
- 星标数据自相矛盾：抓取指标为 28,469 stars，README 正文却写“5,200+ GitHub stars”。徽章数字与正文并存说明部分内容长期未同步，任何数字都需自行核验。
- 声称遵循语义化版本、patch 版本不破坏兼容——无版本号与 CHANGELOG 内容可对照。

**风险与适用条件**：
- 规模本身就是风险：392 个 skill 的质量方差未知；一次全量安装会挤占上下文并引入互相冲突的指令，必须按单域/单 skill 装。
- 供应链与提示注入：README 自己要求装前跑 `skill-security-auditor`，这等于承认第三方 skill 存在执行风险；装 skill 等于给智能体新增可执行脚本与指令，需按引入依赖的标准流程对待。
- 平台坑：Windows 无符号链接/开发者模式会导致镜像树变成指针文本；控制台编码需 `PYTHONUTF8=1`。
- 适用对象：已在使用 Claude Code / Codex / Cursor 等编码智能体的个人或团队；对不使用编码智能体的岗位，价值主要退化为“借鉴 SKILL.md 的封装结构”。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 选一个域，不要多。建议 `engineering-skills`（任务容易找到对照组），或 `productivity`（`weekly-review`、`meetings`、`handoff` 这类有明确输入输出的）。
2. clone 后先跑 `python3 engineering/skill-security-auditor/scripts/skill_security_auditor.py <目标 skill 目录>`，只接受 PASS；WARN 要人工读一遍脚本；FAIL 直接放弃该 skill。
3. 装单域，用 2 个真实任务跑通，例如：对现有仓库跑 `codebase-onboarding` 生成入职文档；对最近 20 个 commit 跑 `changelog-generator`。
4. 同一批任务、同一模型、不装 skill 再跑一遍作为基线（顺序与提示词保持一致）。
5. 记录下面的指标，两天后再看有没有第二次使用。

**判断有没有改善的指标**

- 返工轮数：人工修改次数/评论轮数（主指标，最贴近“是否真的省事”）
- 可直接采用比例：产出内容未修改即被合并/发出的占比（如 changelog 条目未经编辑直接发布的比例）
- 任务完成时间：首次可用产出的耗时
- 上下文成本：加载 skill 后单次会话的提示长度/ token 增量，以及是否挤压了其他上下文
- 重复使用率：两周内该 skill 被主动调用的次数（只用一次通常说明价值不足）
- 安全结果：审计器的 PASS/WARN/FAIL 记录

**判定规则（建议事先写死）**：两个任务中至少一个在“返工轮数”或“完成时间”上改善约 30% 以上，且安全审计无 WARN 以上问题，才扩到第二个域；若两个任务都无改善或上下文成本明显上升，把结论降级为 study——只借鉴其 SKILL.md＋scripts＋references 的封装结构与编排模式，不再安装具体 skill。
