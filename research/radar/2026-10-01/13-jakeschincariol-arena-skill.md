# Jakeschincariol/arena-skill

- 结论：**值得一试**。先按 README 的安装方式之一装进 Claude Code，用 `/arena --quick`（16 个 agent）对你手头一两道确实不满意的真实任务跑一遍，并把被拒的旧答案作为 baseline 做盲评对比，确认输出确实更好再考虑加大 agent 数；步骤、参数、成本表和自测方式都写得可直接照做，但“更强答案”目前只是作者主张且 token 开销很大。
- 原文：https://github.com/Jakeschincariol/arena-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T05:25:16.610Z

## 是什么

一个 MIT 许可的 Claude Code skill（免费、无需注册、无需 API key）。当你对 Claude 的某个回答不满意时，`/arena` 会把同一个任务原文（逐字节相同，有测试校验）发给 N 个子 agent，每个子 agent 额外拿到一张不同的“策略卡”（15 种推理模式 × 12 种工作流 × 12 种策略 = 2160 张卡）。它们两两配对，互相攻击对方方案（最多 7 条攻击，标注 FATAL / MAJOR / MINOR），各自辩护并修订，再由独立的 judge 子 agent 按公开 rubric 打分，败者淘汰：100 → 50 → 25 → 13 → 7 → 4 → 2 → 1。返回的是唯一幸存的那份答案、它扛过的攻击、它的卡和轮数。所有写入都在 `.arena/` 内，不碰你的项目文件。

关键限定：所谓“100 个 Claude”是**你当前所跑模型的 100 个子 agent**，不是 100 个不同模型；让它们不同的只是策略卡。

## 具体做法

前提：需要 Claude Code（要 spawn 子 agent）和 Python 3.8 以上；`bracket.py` 只用标准库，不需要 pip 安装。

1. 安装，三选一：

   直接把下面内容粘给 Claude：
   ```
   https://github.com/Jakeschincariol/arena-skill

   Install this skill, then confirm /arena works.
   ```

   或手动复制到全局 skill 目录：
   ```bash
   git clone https://github.com/Jakeschincariol/arena-skill.git
   cp -r arena-skill/skills/arena ~/.claude/skills/
   ```

   或作为插件安装：
   ```
   /plugin marketplace add Jakeschincariol/arena-skill
   /plugin install arena-skill@arena-skill
   ```

   注意：以插件方式装会被命名空间化，命令是 `/arena-skill:arena`；想要短命令 `/arena` 就复制文件夹。想只作用于某个仓库，把同一个 `skills/arena` 文件夹复制到该仓库的 `.claude/skills/` 下。

2. 运行。单独 `/arena` 会把你的上一条请求当任务、把你刚才不满意的回答当“要打败的基线”。
   ```
   /arena
   /arena --quick write the headline for our pricing page
   /arena --agents 32 fix the flaky test in tests/test_api.py
   /arena --seed 7 plan my launch week, I have 6 hours a day
   ```
   参数：`--agents N`（默认 100）、`--quick`（16 个，日常档）、`--seed S`（同 seed 给同样的卡和同样的赛程，默认随机但会记录）、`--wave W`（每波子 agent 数，默认 10，只有在调高了 Claude Code 并发上限时才需要加大）。

3. 先算成本再决定规模。`plan` 只打印，不写任何文件：
   ```bash
   python3 skills/arena/bracket.py plan --agents 100
   ```
   已给的成本表：100 个 agent = 7 轮 / 595 次子 agent 调用 / 70 个 wave；64 = 6 轮 / 379 / 49；32 = 5 轮 / 187 / 28；16（`--quick`）= 4 轮 / 91 / 16；8 = 3 轮 / 43 / 10。若带了要击败的旧答案，再加 1 次调用。技能在启动前会把这些数字打给你。作者建议：日常用 `--quick` 或 `--agents 16`，真重要的答案才上 100。

4. 运行前把权限切到 accept-edits（Shift+Tab）。否则每个子 agent 往 `.arena/` 写文件都会弹一次授权。

5. 检查任务文件 `.arena/<run>/task.md`——这是 100 个 agent 唯一知道的东西。任何要求没进这个文件，100 个 agent 都会漏。README 明确说它修不好一个糟糕的任务：“Vague task in, 100 flavours of vague out”。

6. 需要在锦标赛中途手工操作时，用 `bracket.py` 的命令行（整个赛事状态存在一个 JSON 文件里）：
   ```bash
   python3 bracket.py plan --agents 100                          # 轮数/调用数/波数，不写文件
   python3 bracket.py init --agents 100 --seed 7 --task-file task.md [--baseline-file old.md]
   python3 bracket.py next                                       # 现在该做什么，含确切命令
   python3 bracket.py prompts attack                             # 生成所有子 agent brief，按波列出任务
   python3 bracket.py pairings                                   # 本轮对局（含轮空）
   python3 bracket.py collect                                    # 记录各 judge 的裁决
   python3 bracket.py record r3-m07 a042 --reason "..."           # 或手工记录一场
   python3 bracket.py advance                                    # 淘汰败者，给幸存者配对
   python3 bracket.py status                                     # 每轮存活/淘汰
   python3 bracket.py winner                                     # 幸存者、它扛过的攻击、轮数
   ```
   主 Claude 会话只跑循环、不读那几百份方案文件，所以上下文保持很轻；如果对话中途被压缩，用 `bracket.py next` 从 JSON 文件接着跑。

7. 拿结果：幸存答案 + 它击败的攻击 + 它的卡 + 轮数。如果起点是一个被你拒掉的答案，最后会有一个 judge 把冠军和它盲评对比并把分数告诉你——即使旧答案赢。

8. 验证工具本身：
   ```bash
   python3 -m unittest discover -s tests -v
   ```
   测试会用随机胜者跑完整 100 个 agent 的锦标赛，并检查最终恰好剩 1 个幸存者，还包括 16、7、1 个 agent 的情形、发牌保证，以及从 spawn 到终检的每个阶段。

9. 要改就改这几个文件：`skills/arena/strategies.json`（15 推理模式 / 12 工作流 / 12 策略，可自由编辑）、`skills/arena/rubric.md`（judge 的评分标准）、`skills/arena/SKILL.md`（编排步骤和每个子 agent 收到的确切 brief）。

评分 rubric（可改）：correctness 30、completeness against the task 25、robustness to the attacks raised 20、specificity 15、clarity 10。judge 看不到策略卡；`bracket.py` 负责算术：总分高者晋级，且带“已核实致命缺陷”的方案不能赢过没有致命缺陷的方案。

## 对应的研究问题

- 能力发现：给出了一种把“我对这个回答不满意”转成可批量执行任务的通用模式——让同一任务用不同推理路径并行求解再对抗筛选。README 只给了三类任务示例（写定价页标题、修 flaky test、用每天 6 小时排发布周），没有列举更多业务场景。
- 任务匹配：明确适合“Claude 给的答案不满意、且值得为此多花 token”的任务；不适合本身描述就含糊的任务。方案多样性来自策略卡而非不同模型。写代码类任务返回的是 diff 或完整文件，需你自己决定是否应用，技能会先问。
- 条件供给：需要 Claude Code 的 Agent 工具 + Python 3.8+；需要 accept-edits 权限（否则逐个文件弹窗）；需要把任务写成独立、自包含的 `task.md`（子 agent 看不到你的聊天）；并发受 `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` 限制（默认 10），调高后要用 `--wave` 匹配。
- 主动推进：这不是按时间/事件触发的持续工作，是用户手动发起的单次锦标赛。可被 Claude 自行调用（你说“that's a bad answer, make them compete”之类），但它会在花钱之前先问。中断续跑靠 `bracket.py next` + JSON 状态文件。
- 效果验证：有明确机制——judge 按仓库内公开 rubric 盲评（看不到策略卡）、致命缺陷不能晋级、与旧答案做最后一次盲评并报分、`--seed` 保证相同卡与相同赛程（但答案不同，模型非确定性）。同时 README 自己声明：“最佳答案”只意味着“赢下所有对局的答案”，不是它正确的证明。

## 与已有做法的关系

清单中有 **Claude Code**（tool，状态 adopt）。这个 skill 是搭在 Claude Code 之上的 skill/插件，依赖其 Agent 工具和并发设置（`CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`），并可按全局或按仓库安装。它是对现有工具的扩展用法，而不是替代品；清单中没有其他相关条目。

## 证据与局限

原文给出的可核查内容：成本表（100/64/32/16/8 对应的轮数、子 agent 调用数、wave 数）、`bracket.py plan` 输出的赛程表（100→50→25→13→7→4→2→1，总计 595 次调用 / 70 个 wave）、2160 张卡、15/12/12 的卡组合、发牌保证（无两张相同卡；至多 144 个 agent 时，没有两个 agent 共享三部分中的两部分）、rubric 权重、默认并发 10、以及一套覆盖完整锦标赛的单元测试。仓库 117 stars。

属于作者主张、没有数据支撑的部分：淘汰赛能产出“更强答案”；“100 versions fight to the death”的质量提升幅度。README 没有给出任何质量对比数据或案例结果。

适用条件与坑：需要 Claude Code + Python 3.8+；token 消耗随 agent 数和任务体量线性增长（每次调用都要读任务和一到两份方案）；子 agent 看不到你的对话，任务文件是全部信息源；绝不修改你的项目文件；同一 seed 只保证卡和赛程相同，不保证答案相同；任务本身含糊则 100 个 agent 一起含糊。另外“judge 也是 Claude”，评分本身也有偏差，rubric 可改但也意味着结果依赖你改得好不好。

## 怎么试、怎么验证

最小试用：装好后挑 1–2 个你确实问过、确实不满意的真实任务（最好一个写文案类、一个代码类，比如修一个 flaky test），跑
```
/arena --quick --seed 7 <把任务写具体>
```
并把被拒的旧答案通过 `--baseline-file` 传进去（多花 1 次调用）。16 个 agent / 4 轮 / 91 次调用，是能承受的最小完整形态。

判断有没有改善的指标：
- 最后那次与旧答案的**盲评比分**（技能会直接报，包括旧答案赢的情况）；
- 冠军“扛过的攻击”里有多少条 FATAL / MAJOR 指向你原本没写进要求、但确实在意的缺口；
- 你实际是否采用了它的输出（采用 / 部分采用 / 弃用），以及用了多少修改；
- 实际 token 开销 vs `bracket.py plan --quick` 的预估（91 次调用）；
- 代码类任务另加客观项：应用 diff 后测试 / lint 是否通过。

决策规则：若 `--quick` 在 3 个以上任务上稳定优于 baseline 且攻击确实命中你没考虑到的地方，再升到 `--agents 32`；若比分持平、或只是措辞更漂亮，说明这类任务不值得这份开销，退回普通的“重问一次 + 自己改”。先用 `--seed` 固定复现赛程，便于比较不同规模的效果。
