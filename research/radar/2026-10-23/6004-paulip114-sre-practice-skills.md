# paulip114/sre-practice-skills

- 结论：**值得一试**。建议作为 SRE 场景的 Agent Skills 小范围试用：按 README 的安装命令装好技能，先选一个具体任务用真实数据跑通，再人工核对产出。理由是安装、调用提示词和烧录率计算器都可直接照做，但目前只有 README，技能正文质量与改善效果尚未验证。
- 原文：https://github.com/paulip114/sre-practice-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-22T18:34:46.568Z

## 是什么
这是一个把 Google SRE 实践封装成 Agent Skills 的仓库。README 声称提供 8 个技能，让 Claude Code 及其他兼容 Agent Skills 的智能体能够设置 SLO、编写 burn-rate 告警、处理事件、评审 postmortem、设计值班与 toil 治理、发布与上线检查、容量估算、数据可靠性等。项目为非官方项目，采用 Apache-2.0，技能是用作者自己的文字写成的步骤与清单，不复制原书内容。当前只能看到 README，无法审查各 SKILL.md 的实际正文与质量。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
1. 前提：已安装并使用 Claude Code，或使用支持 Agent Skills 的智能体；安装方式推荐 skills CLI。安装全部 8 个技能：
```bash
npx skills add paulip114/sre-practice-skills
```
2. 若只安装一个技能到 Claude Code，README 给出的示例是：
```bash
npx skills add paulip114/sre-practice-skills --skill sre-postmortem -a claude-code
```
3. 若要全局安装到所有项目：
```bash
npx skills add paulip114/sre-practice-skills -g
```
4. 也可手动安装。前提是能访问 GitHub，并且本机存在 `~/.claude/skills` 目标目录：
```bash
git clone https://github.com/paulip114/sre-practice-skills
mkdir -p ~/.claude/skills && cp -r sre-practice-skills/sre-* ~/.claude/skills/
```
5. 使用时可以由智能体按描述自动加载，也可以明确点名技能。README 给出的直接调用示例：
```text
Use sre-slos-and-error-budgets to propose SLOs for our checkout API.
Use sre-postmortem to review this incident write-up.
Use sre-monitoring-and-alerting to turn a 99.9% SLO into Prometheus alerts.
```
6. 跑 SLO 示例时，需要提供真实的历史指标。README 给出的示例提示词：
```text
Use sre-slos-and-error-budgets to propose starter SLOs for our checkout API.
Last 4 weeks: 3.2M requests, 99.62% non-5xx, p90 latency 380 ms, p99 1.1 s.
```
README 说明该技能会引导智能体产出 SLI、测量位置、初始 SLO、每 4 周允许的错误数、目标依据、测量盲点、4 周滚动窗口、填好的 SLO 文档、产品/开发/运维确认步骤，以及错误预算政策和 burn-rate 告警的下一步建议。注意 README 将此表标为节录、仅作示意。
7. 使用 burn-rate 计算器。前提是已克隆仓库并进入仓库目录，本机有 python3：
```bash
git clone https://github.com/paulip114/sre-practice-skills
cd sre-practice-skills
python3 sre-monitoring-and-alerting/scripts/burn_rate.py --slo 99.9 --period-days 30
```
README 给出的实际输出为：
```console
SLO 99.9% over 30 days -> error budget 0.1%
A 100% outage exhausts the budget in 43.2m

severity  budget    long   short    burn   threshold
page          2%    1.0h    5.0m    14.4       1.44%
page          5%    6.0h   30.0m       6        0.6%
ticket       10%    3.0d    6.0h       1        0.1%
```
8. 按任务读取 README 列出的模板和参考文件。README 给出的路径包括：`sre-slos-and-error-budgets/references/` 下的 SLI 清单、SLO 文档模板、错误预算政策模板；`sre-monitoring-and-alerting/references/prometheus-rules.md`；`sre-incident-response/references/` 的实时事件状态文档模板；`sre-postmortem/references/` 的 postmortem 模板；`sre-release-and-launch/references/` 的上线检查清单和生产最佳实践审计清单；`sre-capacity-and-system-design/references/` 的粗略估算速查表。README 没有展示这些文件的正文，使用前应打开文件核对。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）
- 能力发现：README 声称 AI 可以被指派做 SLO 设计、burn-rate 告警、事件响应、postmortem 评审、值班与 toil 治理、发布与上线检查、容量与系统设计、数据可靠性等任务。但这些是仓库的技能清单和示例，实际能力边界尚未验证。
- 任务匹配：该仓库面向 Claude Code 及兼容 Agent Skills 的智能体，可按请求描述自动加载，也可明确点名技能。README 示例覆盖 SLO、postmortem 评审、Prometheus 告警三类任务，并给出单技能安装和全量安装两种方式。
- 条件供给：需要先安装技能；需要向智能体提供任务背景和指标数据，SLO 示例要求提供 4 周请求量、非 5xx 比例、p90/p99 延迟；需要提供事件报告或 SLO 目标等输入；仓库还提供模板、Prometheus 规则文件和 burn-rate 计算脚本作为配套条件。README 未说明需要哪些权限。
- 主动推进：README 只说智能体会在请求匹配时自动加载技能，没有说明由时间、事件或状态触发并持续完成工作的机制，因此主动推进能力在原文中没有依据。
- 效果验证：README 提供了 burn-rate 计算器的实际输出示例，以及 SLO 产出的示意表。但没有给出与人工基线对比的改善数据，也没有独立案例或效果评估方法。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）
- Claude Code：清单中为 adopt。该仓库明确支持 Claude Code，安装方式包括 `-a claude-code` 和复制到 `~/.claude/skills`，是该工具上的技能包实例。
- Agent skills：清单中为 adopt。该仓库使用标准 `SKILL.md` 格式，声明可被其他支持 Agent Skills 的智能体使用，因此属于 Agent Skills 概念的具体实现。
- skills.sh：清单中为 try。README 推荐通过 `npx skills add` 安装，并链接到 skills.sh，属于该来源的安装方式示例。
- 清单中没有其他 SRE 专用技能包或运维流程条目。该仓库可视为 Agent Skills 在 SRE 场景的垂直封装，不替代上述工具或概念。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）
- 已有证据：README 列出 8 个技能及覆盖范围，给出安装命令、使用提示词、SLO 示例表、burn-rate 计算器的实际输出、模板与脚本路径。初筛信息显示仓库有 49 stars。License 为 Apache-2.0，且 README 声明该许可只覆盖仓库原创内容，不重新授权 Google 原书。
- 作者主张：技能把 Google SRE 书中的实践转成可自动加载的步骤、清单和模板；技能能在请求匹配时自动加载；SLO 示例能产出完整的 SLO 文档与确认步骤。这些目前只有 README 说明，没有独立验证。
- 局限：输入只包含 README，没有各 `SKILL.md` 正文，无法判断步骤是否完整、是否可执行、是否有错误。SLO 示例表被明确标为节录和示意，不能当作真实效果数据。burn-rate 输出虽被标为实际输出，但只验证了计算器本身。没有案例研究、用户反馈、准确率或效率提升数据。
- 适用条件：适合 SRE、生产运维、可靠性工程场景；需要 Claude Code 或兼容 Agent Skills 的智能体；需要准备真实指标、事件报告或 SLO 目标等输入。不适合没有运维数据或非 SRE 任务的场景。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）
最小试用方式：
1. 选一个具体任务和一个团队，不要一次铺开 8 个技能。先安装全部技能，或只安装 README 示例中的 `sre-postmortem`。
2. 用真实输入跑一次任务。例如用 README 的 SLO 提示词，替换成团队真实 4 周请求量、非 5xx 比例、p90/p99 延迟；或用真实事件报告让 `sre-postmortem` 评审。
3. 用 burn-rate 计算器跑一次 `--slo 99.9 --period-days 30`，核对输出是否与 README 示例一致，确认脚本可运行。
4. 人工按 README 列出的产出项做核对：SLO 任务是否包含 SLI、测量位置、目标依据、盲点、滚动窗口、确认步骤和错误预算政策；postmortem 任务是否覆盖无责复盘、行动项和审查清单。
5. 与团队原有做法做小样本对比，至少比较两到三个同类任务。

判断有没有改善的指标：
- 产出完整度：是否覆盖 README 声称的字段、模板和检查项。
- 人工返工次数：智能体产出被人工修改的次数和修改量是否下降。
- 任务耗时：从给出输入到形成可评审草稿的时间是否缩短。
- 可执行性：是否产出了可指派的行动项、可确认的 SLO 文档或可用的告警规则。
- 准确性：SLO 目标、错误预算和 burn-rate 阈值是否经人工复核无误；若有错误，记录错误类型和严重程度。
- 采用意愿：产品、开发和运维是否愿意按产出的文档继续确认和落地。

在没有独立效果数据前，应把试用目标定为“验证产出质量和可执行性”，而不是直接宣称改善了可靠性结果。
