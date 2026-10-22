# 先在一个真实 SRE 任务上试用技能包，再人工核对产出

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：如何把 SRE 技能包小范围接入现有 agent 工作流，用真实任务验证产出是否完整、可执行、可复核，而不是直接相信技能包宣传。
> 先试这一步：先选一个真实 SRE 任务（例如用团队 4 周指标让 SLO 技能产出草稿），只安装需要的技能，跑通一次后按 README 产出项人工核对。
> 最近修订：2026-10-23

## 解决什么问题

SRE 技能包看起来可以直接安装、点名调用，但当前材料只能看到 README：技能正文质量、步骤是否完整、能否改善实际工作都还没有独立验证。本手册给出一套小范围试用方法：只选一个真实 SRE 任务，用真实数据让 agent 产出可评审草稿，再按明确的产出项人工核对，最后用小样本对比决定是否继续用。

## 适用与不适用

适用：
- 团队做 SRE、生产运维、可靠性工程，手头有真实运维数据或事件材料。
- 已使用 Claude Code 或其他兼容 Agent Skills 的智能体，想验证 SRE 技能包在具体任务上的产出质量。
- 愿意把 agent 产出当草稿，安排人工复核后再落地。

不适用：
- 没有运维数据、事件报告或 SLO 目标，只想让 agent 凭空写文档。
- 非 SRE 任务。
- 还没人工核对，就打算把产出直接用于生产变更、对外承诺或大规模推广。
- 期待技能包已经证明能提升可靠性结果；当前没有这类独立数据。

## 前置条件

- 已安装 Claude Code，或使用支持 Agent Skills 的智能体。
- 能按所选方式安装技能：能运行 `npx skills`，或能访问 GitHub 并写入 `~/.claude/skills`。
- 准备一个具体任务和一个团队，不要一次铺开多个任务。
- 准备真实输入：SLO 任务需要提供 4 周请求量、非 5xx 比例、p90/p99 延迟；postmortem 任务需要真实事件报告；告警任务需要明确 SLO 目标。
- 跑 burn-rate 计算器需要本机有 `python3`。
- 指定人工核对人，并约定“未核对不落地”。

## 操作步骤

1. 选一个具体任务和一个团队，写清试用边界。
前提：有真实输入。
预期结果：只针对一个任务试用，例如：
- 用 `sre-slos-and-error-budgets` 给 checkout API 提 SLO 草稿；
- 用 `sre-postmortem` 评审一次真实事件报告；
- 用 `sre-monitoring-and-alerting` 把 99.9% SLO 转成 Prometheus 告警。
不要一次铺开 README 声称的 8 个技能。

2. 安装技能。
前提：已安装 Claude Code 或兼容 Agent Skills 的智能体；能运行 `npx skills`。

做法 A：全量安装，适合先看覆盖面：
```bash
npx skills add paulip114/sre-practice-skills
```

做法 B：只装一个技能到 Claude Code，适合最小试点：
```bash
npx skills add paulip114/sre-practice-skills --skill sre-postmortem -a claude-code
```

如果要全局安装到所有项目：
```bash
npx skills add paulip114/sre-practice-skills -g
```

也可以手动安装（前提：能访问 GitHub，能写入 `~/.claude/skills`）：
```bash
git clone https://github.com/paulip114/sre-practice-skills
mkdir -p ~/.claude/skills && cp -r sre-practice-skills/sre-* ~/.claude/skills/
```

怎么选：第一次试用优先做法 B，只装当前任务需要的技能；只有要横向评估多个 SRE 任务时才用做法 A 或全局安装。
预期结果：技能安装完成。README 说技能可由描述自动加载，也可明确点名；自动加载目前只是 README 主张，建议点名调用验证。

3. 明确点名技能，给任务和真实输入。
前提：技能已安装，输入材料已准备。
可直接用 README 的调用示例：
```text
Use sre-slos-and-error-budgets to propose SLOs for our checkout API.
Use sre-postmortem to review this incident write-up.
Use sre-monitoring-and-alerting to turn a 99.9% SLO into Prometheus alerts.
```
预期结果：得到一份草稿或评审意见。把真实事件报告、SLO 目标或指标数据一起给 agent；不要只给技能名让它自由发挥。

4. 如果选 SLO 任务，用真实 4 周指标跑一次。
前提：能提供团队真实 4 周请求量、非 5xx 比例、p90/p99 延迟。
README 给出的示例提示词如下，使用时把数字换成团队真实数据：
```text
Use sre-slos-and-error-budgets to propose starter SLOs for our checkout API.
Last 4 weeks: 3.2M requests, 99.62% non-5xx, p90 latency 380 ms, p99 1.1 s.
```
预期结果：README 声称该技能会引导 agent 产出 SLI、测量位置、初始 SLO、每 4 周允许的错误数、目标依据、测量盲点、4 周滚动窗口、填好的 SLO 文档、产品/开发/运维确认步骤，以及错误预算政策和 burn-rate 告警的下一步建议。注意：README 的示例表被标为节录、仅作示意，不能当真实效果数据。

5. 如果涉及告警，用 burn-rate 计算器做一次可运行性核对。
前提：已克隆仓库并进入仓库目录，本机有 `python3`。
```bash
git clone https://github.com/paulip114/sre-practice-skills
cd sre-practice-skills
python3 sre-monitoring-and-alerting/scripts/burn_rate.py --slo 99.9 --period-days 30
```
README 给出的实际输出：
```console
SLO 99.9% over 30 days -> error budget 0.1%
A 100% outage exhausts the budget in 43.2m

severity  budget    long   short    burn   threshold
page          2%    1.0h    5.0m    14.4       1.44%
page          5%    6.0h   30.0m       6        0.6%
ticket       10%    3.0d    6.0h       1        0.1%
```
预期结果：脚本能跑通，输出可与 README 示例对照。这个步骤只验证计算器本身，不验证技能正文质量。

6. 打开并核对模板和参考文件，再让 agent 使用。
前提：已克隆仓库。
README 列出的路径包括：
```text
sre-slos-and-error-budgets/references/        SLI 清单、SLO 文档模板、错误预算政策模板
sre-monitoring-and-alerting/references/prometheus-rules.md
sre-incident-response/references/             实时事件状态文档模板
sre-postmortem/references/                    postmortem 模板
sre-release-and-launch/references/            上线检查清单、生产最佳实践审计清单
sre-capacity-and-system-design/references/    粗略估算速查表
```
预期结果：确认模板正文存在、字段可用。README 没有展示这些文件的正文，不能只凭路径相信内容；使用前打开文件核对。

7. 人工按产出项核对。
前提：agent 已给出草稿。
核对清单：
- SLO 任务：是否包含 SLI、测量位置、目标依据、测量盲点、4 周滚动窗口、产品/开发/运维确认步骤、错误预算政策、burn-rate 告警下一步建议。
- postmortem 任务：是否覆盖无责复盘、行动项和审查清单。
- 其他任务：按对应模板和检查项核对。
预期结果：记录缺失项、错误项和需要返工的地方。未通过人工核对，不进入生产变更或对外承诺。

8. 与团队原有做法做小样本对比。
前提：至少完成 2–3 个同类任务。
记录每次的产出完整度、人工返工次数和修改量、任务耗时、可执行性、准确性、采用意愿。
预期结果：有对比数据再决定是否继续用、缩小到某个任务，还是停止。没有独立效果数据前，试用目标应定为“验证产出质量和可执行性”，不要直接宣称改善了可靠性结果。

## 怎么判断变好了

最小试用方式：
- 选一个任务、一个团队，用真实输入跑一次。
- 至少完成 2–3 个同类任务，与团队原有做法做小样本对比。
- 试多久：材料没有给出固定天数或周数；以 2–3 个同类任务为一个最小试用批次，完成一轮对比后复盘，不要用一次产出下结论。

观察指标：
- 产出完整度：SLO 任务是否覆盖 README 列出的字段；postmortem 任务是否覆盖无责复盘、行动项和审查清单。
- 人工返工次数和修改量：与团队原有做法对比，是否下降。
- 任务耗时：从给出输入到形成可评审草稿的时间是否缩短。
- 可执行性：是否产出了可指派的行动项、可确认的 SLO 文档或可用的告警规则。
- 准确性：SLO 目标、错误预算和 burn-rate 阈值是否经人工复核无误；若有错误，记录错误类型和严重程度。
- 采用意愿：产品、开发和运维是否愿意按产出的文档继续确认和落地。

判断方式：如果完整度和准确性没有提高、返工次数没有下降，或者产出不可执行，就不要扩大使用；如果只在某个任务上稳定，就保留这个任务，不要直接推广到全部技能。

## 常见坑

- 只看 README 就相信技能质量：当前只能看到 README，无法审查各 `SKILL.md` 的实际正文与质量，步骤是否完整、可执行、是否有错误都未知。
- 把 README 的 SLO 示例表当效果数据：该表被明确标为节录、仅作示意。
- 把 burn-rate 输出当技能效果验证：它只能验证计算器本身。
- 假设技能一定会自动加载：README 说会按请求描述自动加载，但没有独立验证；用点名调用更稳。
- 一次铺开 8 个技能：应先选一个具体任务和一个团队做小范围试用。
- 没有真实指标或事件材料就试用：SLO 示例要求提供 4 周请求量、非 5xx 比例、p90/p99 延迟；postmortem 需要真实事件报告。
- 忽略许可边界：项目为 Apache-2.0，README 声明该许可只覆盖仓库原创内容，不重新授权 Google 原书。
- 不打开 references 正文就使用模板：README 没有展示这些文件的正文，使用前应打开核对。
- 把草稿直接用于生产变更或对外承诺：当前没有独立效果数据，必须人工核对。
- 期待技能包主动推进：README 没有依据说明它会由时间、事件或状态触发并持续完成工作。
- 忽略权限问题：README 未说明需要哪些权限，试用前应向团队确认。

## 证据与来源

本手册的操作步骤均来自调研报告《paulip114/sre-practice-skills》对 README 的转述；该报告只看到 README，没有看到各 `SKILL.md` 正文，也没有独立效果数据。

- 仓库与安装方式：调研报告记录了 `npx skills add paulip114/sre-practice-skills`、单技能安装、全局安装和手动安装命令；这些来自 README。项目为非官方项目，采用 Apache-2.0，README 声明许可只覆盖仓库原创内容，不重新授权 Google 原书。初筛信息显示仓库有 49 stars。
- 技能范围：README 声称提供 8 个技能，覆盖 SLO、burn-rate 告警、事件处理、postmortem 评审、值班与 toil 治理、发布与上线检查、容量估算、数据可靠性。这是作者主张，未独立验证。
- SLO 产出项：SLI、测量位置、初始 SLO、每 4 周允许错误数、目标依据、测量盲点、4 周滚动窗口、填好的 SLO 文档、产品/开发/运维确认步骤、错误预算政策、burn-rate 告警下一步建议，均来自 README 说明，是作者主张；README 的示例表被标为节录、仅作示意，不能当效果数据。
- burn-rate 计算器：README 给出了实际输出，本手册引用了该输出；但调研报告指出这只验证计算器本身，不验证技能正文质量。
- 自动加载：README 声称技能会在请求匹配时自动加载，但没有独立验证；本手册因此要求点名调用并人工核对。
- 效果验证：调研报告没有找到案例研究、用户反馈、准确率或效率提升数据。产出完整度、返工次数、耗时、可执行性、准确性、采用意愿是本手册建议的观察指标，不是该仓库已证明的结果。
- 适用条件：适合 SRE、生产运维、可靠性工程；需要 Claude Code 或兼容 Agent Skills 的智能体；需要真实指标、事件报告或 SLO 目标。不适合没有运维数据或非 SRE 任务。

## 依据的调研

- [paulip114/sre-practice-skills](../research/radar/2026-10-23/6004-paulip114-sre-practice-skills.md)：值得一试，建议作为 SRE 场景的 Agent Skills 小范围试用：按 README 的安装命令装好技能，先选一个具体任务用真实数据跑通，再人工核对产出。理由是安装、调用提示词和烧录率计算器都可直接照做，但目前只有 README，技能正文质量与改善效果尚未验证。
