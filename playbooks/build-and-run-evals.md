# 让 AI 的改动拿出证据：先建评测爬坡，再用回归闸门验收

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：别再靠感觉判断改动有没有变好：文本类改动（prompt、skill、参数）用自动评测加爬坡来改，代码改动用「重置基线 + 还原测试文件 + 有新失败即判 0 + 部分得分」的回归闸门来验收。
> 先试这一步：挑一个能反复跑的对象（system prompt、skill、工具描述，或一处分代码改动），只做一件事：要么先跑出带置信区间的 baseline，要么先把回归守门的评分伪代码抄进现有流程，并用两个对照 patch 确认「新出现的失败」真的会让改动被判 0。
> 最近修订：2026-10-03

## 解决什么问题

手工搭评测集、手工调 prompt 和参数、靠感觉判断「这次改动到底有没有变好」，都很费时而且容易自欺。这套做法分两条腿。

第一条腿针对可反复跑的文本类改进对象（system prompt、skill 或 instruction 文件、tool 描述、模型与参数）：让 Claude Code 里的 claude-api skill 先把评测建起来（从真实数据采样用例、选最便宜够用的 grader、跑 baseline 并做诊断检查），再对着这套评测做自动爬坡——一轮只改一处，用 train/test 拆分和置信区间判断增益是不是真的，并自动回滚过拟合或回退的改动。

第二条腿针对 AI 写的代码改动本身：用一套回归闸门来验收——先重置到 base commit 再打 AI 的补丁，把测试文件还原回原状，跑一遍原有测试套件记录基线，再跑隐藏/追加测试；只要相对基线出现任何**新的失败**，整个任务直接判 0 分，否则按通过的隐藏子任务比例给部分分。两条腿的共同点是：改动必须拿出可核验的证据，而不是「我觉得好多了」。

## 适用与不适用

**适用**

- 有一个能反复跑的文本类改进对象：system prompt、skill 或 instruction 文件、tool 描述、模型选择与 effort/API 参数。
- 手里有一点真实数据：生产转录、bug 报告、支持工单，或自己手写的 5–10 个用例。
- 目标是「提升性能」，或「性能持平下降低成本」（原文认为后者即使评测饱和也普遍好用）。
- 另一类适用对象是代码改动本身：AI 交来一个 patch，你需要一套能自动判分的验收协议，判断它到底该不该合。

**不适用或要谨慎**

- 对 agent harness 做开放式改动：可能牵涉大量代码改动，容易卡住；原文说内部和客户多数把爬坡集中在文本（prompt、skill）上，因为好改好回滚。
- 评测接近饱和（baseline ≥95%）：无法判断改动的影响，skill 会告警并建议把目标转向成本或延迟。
- 分数变化无法归因到你想改的那个面。
- 依赖 claude-api skill 的实际可用性，且原文案例全部来自作者内部基准，需要在自己的任务上验证后再推广。
- 回归守门协议不适用于：目标仓库不能构建、没有可见测试套件、拿不到 base commit 或没有可用的隐藏测试的场景；也不适合「只想要通过/不通过」的验收——它给的是部分分，前提是你能把任务拆成若干子任务。

## 前置条件

- Claude Code 中已装好 claude-api skill。
- 数据与权限：生产转录（skill 会先问保留策略和敏感数据问题）、bug 报告与支持工单、你手写的 5–10 个用例、代码库访问；案例里还给了文档与 SDK 的访问权，使 Claude 能自己发现错误并自我纠正。
- 约束条件：允许改动的面清单、优化目标、被测模型与 judge 模型的指定。
- 干净的环境：避免上一轮残留状态（文件、git 历史）把答案递给 agent；effort 等配置要一致应用。
- 人力：有人确认输入、抽样阅读打分 transcript、最后决定是否合并。
- 做代码验收时：目标仓库能构建、有 base commit、有可见测试套件；要用现成工具的话还需要能用 Harbor 框架并拉到它指定的源码 revision（注意 Harbor 0.23 不支持这些任务所用的「独立 verifier 环境」和 collect hooks，项目暂时 pin 了 Harbor 源码仓库中一个兼容 revision，直到 Harbor 0.24 发布）。只搬协议、不装工具的话，以上版本约束可以忽略。

## 操作步骤

A 组（第 1–7 步）先建评测，B 组（第 8–14 步）再对着它爬坡，C 组（第 15–20 步）给 AI 的代码改动加回归闸门；第 21–23 步是各阶段要对照的清单。

1. **建评测。** 前提：skill 已装好，并准备好能访问的生产数据或示例（原文说你可以「通过提供示例（如 traces）来引导它」）。在 Claude Code 里运行：

   ```
   /claude-api build-eval
   ```

2. **接受 Claude 的访谈。** 它会问生产数据的保留策略与敏感数据问题，然后按这个顺序采样输入：生产转录 → bug 报告与支持工单 → 你手写的 5–10 个用例 → 从代码库合成的用例。没有生产转录时，它会以你给的少量真实样本为锚点生成合成数据。
3. **人工确认输入。** skill 会生成一个简单页面列出每一个输入，等你确认后才继续。确认时对照：用例分布要反映你真正关心的生产任务，而不是「好生成」或「好判分」的任务。预期结果：输入确认通过，才进入 grader 环节。
4. **让 Claude 提出「够用的最便宜 grader」。** 原文给的选型规则：
   - 输出空间受约束（精确匹配、固定标签集、符合 schema 的 JSON、能通过的测试）→ 用代码化的程序化验证；
   - 输出开放、有效答案多但有明确质量标准 → 用 LLM-as-judge：rubric 要写成**可核查的断言**，不要用 1–5 分制；如果有 baseline，judge 应随机顺序同时读两份输入、不告诉它哪份是 baseline，然后选更好的那份；judge 模型由你选，且**不能是被测的那个模型**。
5. **抽样读打分记录，再决定信不信评测器。** Claude 会先给少量用例打分，并问你有没有哪条判分与你不同。原文强调「在相信评测器之前先读一部分已打分的 transcript」——判分错误是评测配错最常见的原因之一。
6. **确认 grader 后跑 baseline。** skill 会先告诉你评测规模（用例数 × 重复次数 × 模型，以及大致耗时）。跑完打印得分和**置信区间**。产出物：用例、grader、runner、每用例一行 JSON、每用例完整 transcript、一个列出每个用例得分并链到 transcript 的普通页面（想要图或别的视图，直接让它加一个页面；默认是本地打开的静态文件、不联网加载任何东西）。
7. **看诊断检查结果**（skill 在 baseline 阶段自动做）：
   - Grader：同一份输出跑两次 grader，报告判定是否变化；
   - Plumbing：检查超时、API 错误、被截断的回答，避免基础设施噪声被当成模型方差；
   - Headroom：baseline 已经 ≥95% 时会告警，并提示 hillclimb 应转向探索成本或延迟，而不是质量。
8. **开始爬坡。** 前提：已有一套可用的评测（通常是上一步的产物）。运行：

   ```
   /claude-api hillclimb
   ```

9. **指定允许它改动的面。** 原文给的可选范围：system prompt；skills 或 instruction 文件；tool 描述；模型选择、effort level 及其他 API 参数；harness 代码。
10. **说明优化目标**，例如「提升性能」或「性能持平下降低成本」。之后 Claude 会把评测集随机拆成 train / test。若目标是成本，它会先看几个常见成本驱动项：prompt caching、审计 prompt 与所选模型的兼容性、模型与 effort 设置的选择。案例中的实际操作顺序是：先审计 prompt（移除强制 tool-call 仪式、一个 scratchpad 步骤、相互矛盾的规则），再试模型与 effort 档位。
11. **第一轮之前先核对噪声。** Claude 检查「评测噪声（仅凭运气得分能移动的幅度）」是否小于「你愿意据以行动的最小改进」；如果不够小，它会直接说明并建议增加重复次数或用例数。
12. **按每轮机制走。** Claude 读上一轮 train 的 transcript，提出**一个** patch；改动要解决失败行为的根因（重写造成问题的那一节，或补一条缺失规则），而不是改词句。跑完评测后按这条规则决定：
    - train 升、test 平 → 怀疑过拟合，回滚该 patch；
    - 出现回退 → 回滚；
    - train 和 test 都升 → 保留。
13. **停滞时只分类、不编辑。** 连续 2–3 轮分数停滞时（或一开始就发现没有任何单个改动能超过噪声时），Claude 不再编辑，而是读每一条剩余 train 失败并按原因归类。这一步能抓出模糊用例、harness 错误和 run-to-run 方差；只有**合法失败**才进入后续爬坡轮次。
14. **收尾并决定是否合并。** Claude 把代码停在「在你的目标下 test 集表现最好」的版本，并报告相对 baseline 的带置信区间的 test 结果；如果增益落在噪声内，它会明说并建议不要合并。

### C 组：给 AI 的代码改动加回归闸门

15. **先决定：装工具跑一遍，还是只抄它的评分协议。** 原文自己的建议是后者更轻量、也更值得推广——不引入这套工具，只把第 17 步的伪代码搬进团队现有的 AI 改码流程。想先验证协议是否成立，再按 Quickstart 装：

    ```bash
    git clone https://github.com/facebookresearch/swe-sweep.git
    cd swe-sweep
    uv sync   # or pip install .
    ```

    ```bash
    sweep infra doctor
    ```

    预期结果：自检通过（前提：本机有 git 与 Python 环境）。
16. **跑单个任务，看协议在真实任务上怎么走。** 前提：准备一个针对该任务 base commit 的 unified diff（待评的模型 patch）；命令是「任务名 + diff 路径」。

    ```bash
    sweep eval <task> <path/to/submission.diff>  # see raw harbor command below
    ```

    它底层等价于下面这条原始 Harbor 命令（原文例子用的是 `tasks/pandora-bench__dateutil` 这个任务路径）：

    ```bash
    uv run harbor run \
    --path tasks/pandora-bench__dateutil \
    --agent swesweep.patch_agent:PatchAgent \
    --agent-kwarg "patch_path=$(realpath /path/to/model.patch)" \
    --jobs-dir jobs \
    --n-concurrent 1 \
    --yes
    ```

    预期结果：Harbor 在任务独立的 verifier 环境中评测打补丁后的 checkout，结果默认写到 `jobs/` 目录。
17. **把评分协议抄成自己流程的模板。** 原文给出的伪代码就是完整的评分流程，可直接照抄：

    ```python
    reset_to_base_commit()
    apply(agent_patch)
    reset(test_files)
    build_if_needed()
    base_commit_results = run_visible_suite()  # test -> pass/fail

    subtask_results = {}   # subtask -> {test -> pass/fail}
    for subtask in subtasks:
      apply(subtask.test_patch)
      subtask_results[subtask.id] = run(subtask.hidden_tests)
      revert(subtask.test_patch)

    if any_new_failures(base_commit_results):
      task_score = 0
    else:
      task_score = sum(passed_subtasks) / len(subtasks)
    ```

    要点三条：先重置到 base commit 再打 agent 的补丁；把测试文件重置回原状（防止改测试作弊）；只要相对基线出现任何**新失败**，整个任务直接判 0 分，否则按通过的隐藏子任务比例给部分分。
18. **故意做两个对照，确认回归守门真的生效。** 一个 patch 顺带改动了测试文件，一个 patch 引入了新的失败用例——预期结果：二者都被判 0 分。这是最便宜的一次「验证验证器」的动作。
19. **汇总多份结果算总分。** 前提：已有若干目录存放已评分的 Harbor trials。基准总分定义为「解掉的 bug 总数 / 总 bug 数」，等价于对每个任务的「bug 数 × 任务得分」取平均：

    ```bash
    sweep info path/to/graded-solutions --per-task
    sweep info path/to/graded-solutions --json
    ```

20. **要改这个仓库本身时才用开发模式。** 原文说明 CI 在 Python 3.12 和 3.13 上测试。

    ```bash
    git clone https://github.com/facebookresearch/swe-sweep.git
    cd swe-sweep
    uv sync --extra test
    ```

    ```bash
    uv run pytest
    ```

    ```bash
    uvx pre-commit run --all-files
    ```

### 各阶段对照清单

21. **建评测时逐条对照这份自查清单：**
    - 任务镜像生产：用例来自你真正关心的场景分布。
    - 更强模型/更高 effort 应该更好：如果没有，通常是任务模糊或 grader 失准。
    - 前沿模型要留有「可通过」的余量：最强模型 + 最高 effort 应明显低于 100%，否则无法判断改动的影响；但缺口不能由「不可能或模糊的任务」造成——一个好任务是两位领域专家会得出同一结论、且 grader 检查的每一项都在任务里写明。
    - 低 run-to-run 方差：方差常来自模糊任务或对同一输出给出不同结论的 grader，也可能藏在配置里（比如 effort 没有一致地应用）和环境里（上一轮残留状态，如文件、git 历史，会把答案递给 agent）。
    - 对抗采样要小心：不要因为「今天的模型在这些用例上失败」而选它们，那是在测单个模型能力面的低谷、测它的失败指纹；要按**人类判断难**来选，并能说出它难在哪。来自生产流量、bug 报告、工单的具体失败可以纳入，但不要盲信用户流量——用户常常只试他们预期能成的东西，纯流量分布可能偏简单。
22. **每次爬坡都确认反过拟合三件事：** 拆用例（hillclimber 可读 train，test 永不打开；train 升而 test 平就是常见过拟合信号）；绝不把失败内容粘进 prompt；把答案在结构上放到模型够不到的地方（模型有时会 reward hack，直接找出评测答案）。
23. **只挑符合三条标准的对象去爬坡：**廉价迭代（时间、成本、精力上改起来都便宜；文本类最好改好回滚，对 agent harness 做开放式修改可能牵涉大量代码改动）；可归因（评测分数变化要能归因到你在改的那个面，例如把爬坡集中在 skill 触发上时，触发率直接耦合于被修改的 skill description）；目标界定清楚（不要给「提升性能」这种开放式请求，也不要用笼统的「更新 harness」）。

## 怎么判断变好了

- baseline 与最终结果都带**置信区间**；最终报的是 **test 集（留出集）** 相对 baseline 的表现。
- 过拟合信号：train 升而 test 平。
- 噪声控制：先确认评测噪声小于你愿意据以行动的最小改进；增益落在噪声内就按「不建议合并」处理。
- 评测器质量：同一输出跑两次 grader 看判定是否变化；抽样读打分 transcript 人工校验；检查 plumbing（超时、API 错误、截断）。
- 无效信号：某个任务无论跑多少次都失败、且无法用「不可能或模糊」解释时，是任务或 grader 有问题的信号（案例中通过重写任务措辞、纠正 grader 与文档的矛盾来修复）。
- 代码验收侧：**「新引入的失败用例数」应恒为 0**——这个指标最能直接判断 AI 改动是否可接受；只要有新失败，任务分就是 0，而不是按比例扣分。
- 代码验收侧：任务得分（通过的 subtask 数 / subtask 总数）是否上升；跨模型或跨配置横向比较用 micro-average（平均每个任务的 bug 数 × 任务得分）。
- 重要限制：swe-sweep 原文没有给任何实测基线分数，所以第一次跑出来的数字**只能作为自己前后的对照**，不能与论文或其他团队的数字比较。
- 最小试用方式：文本侧，原文建议先在一个任务上小范围试，节奏是流程自身的收敛条件——先跑出 baseline，再让爬坡跑到收敛或连续 2–3 轮停滞为止（原文没有给固定的天数或轮数）。代码侧约半天：clone + `uv sync` + `sweep infra doctor`，再跑一个任务的完整流程，并加上第 18 步的两个对照。

## 常见坑

- 用例偏向「好生成」或「好判分」，而不是生产真正关心的任务。
- 不读打分 transcript 就相信 grader；判分错误是评测配错最常见的原因之一。
- grader 用 1–5 分制、judge 模型就是被测模型、有 baseline 却不做随机顺序的盲比。
- 噪声大于你愿意据以行动的最小改进，还继续拿分数差异当结论；该加重复次数或用例数。
- baseline 已经 ≥95% 还在追质量，而不是转向成本或延迟。
- 把失败内容粘进 prompt；把答案放在模型够得到的地方，被 reward hack。
- 把模糊用例、harness 错误、run-to-run 方差当成模型能力问题。
- 环境不干净：上一轮的残留文件、git 历史把答案递给 agent；effort 等配置没有一致应用。
- 对抗采样按「今天模型在这些用例上失败」来选用例，或盲信用户流量（用户常常只试他们预期能成的东西）。
- 给开放式目标（「提升性能」）或界定不清的面（笼统的「更新 harness」），导致爬坡卡住。
- 增益落在噪声内仍然合并。
- 把作者内部基准上的数字直接外推到自己的任务，或假定该 skill 一定可用。
- 代码验收省掉「重置测试文件」这一步，AI 改了测试就作弊通过；或者忘了先 reset 到 base commit 再打补丁，基线本身就是脏的。
- 把「引入了新失败」的任务当成「部分得分」处理——协议里它是直接判 0。
- 拿 swe-sweep 的数字当能力结论：它的 README 标题设问没有任何答案，没给模型名、分数、bug 数量或案例结果，官网与论文链接仍是占位符；它只能当验证方法模板。
- 忽略环境约束：Harbor 0.23 不支持这些任务所需的「独立 verifier 环境」和 collect hooks，需要 pin 指定 revision，直到 Harbor 0.24 发布。

## 证据与来源

- 主要依据（建评测与爬坡）：调研《Automating eval design and hillclimbing with Claude》（作者 Lance Martin，发布在 claude.dev 博客，原文标注日期 2026-09-28）。两个子命令、访谈与人工确认点、诊断检查项、保留/回滚规则、自查清单、反过拟合三件事与三条选择标准，都出自该文描述。
- 带数字的案例（客服 benchmark，均为作者内部基准）：44 张工单，30 张用于搜索、14 张留出；起点 Opus 4.8、default（high）effort，搜索集决策准确率 74.4%，每工单 token 成本 4.6 美分。先审计 prompt，再试 Opus 5.5 + low effort，达 87.8%、成本降到 1.9 美分/工单（不到起点一半）；部分节省来自 Opus 5.5 的定价——输入输出 token 比 Opus 4.8 便宜 20%，cache read 便宜 60%。因为达标，继续降一档：Sonnet 5 + low effort 约 88.9%、成本约 1 美分/工单。原文随后提到 routing rules 和「退款上限」，报告正文在此处截断，后续细节未能确认。
- 只是作者主张、没有对照实验支撑的部分（建评测与爬坡）：grader 选型规则、评测设计自查清单、反过拟合三件事、选择爬坡对象的三条标准，都是作者的经验规则；「内部和客户多数把爬坡集中在文本上」也是作者的观察，未给数据。
- 主要依据（代码改动验收）：调研《facebookresearch/swe-sweep》（README 标注为 2026 preprint，作者 Kilian Lieret、Jeffrey Jian Ma、Rahul Kindi、Yuxiang Wei、Jeremy Ma、Sten Sootla、Parth Thakkar、Chao Beyond Zhou、Pengcheng Yin、Rui Hou、Ofir Press、John Yang）。安装与自检命令、单任务评测命令、原始 Harbor 命令及其 `--agent swesweep.patch_agent:PatchAgent`、`--jobs-dir`、`--n-concurrent 1` 等参数、可照抄的评测伪代码、评分公式与两条汇总命令，都出自该报告。
- swe-sweep 缺数据的部分：标题设问「How many bugs can LMs find & fix in large codebases?」在 README 中没有任何答案——没有模型名、分数、bug 数量或案例结果；官网与论文链接仍是占位符（原文注释写明 `TODO: fill in the public links once available`），无法从这份材料核实结论，也没有和同类基准（如 SWE-bench 一类）做对比。因此它只能当验证方法模板，不能当能力结论的依据。
- swe-sweep 的适用条件：必须能使用 Harbor 框架并拉到它指定的源码 revision；需要能构建目标仓库、且任务自带 base commit、可见测试与隐藏测试；README 只提到一个具体任务路径 `tasks/pandora-bench__dateutil`，没有给出任务清单，任务总量未知（36 stars，规模有限）。
- 局限（两篇共通）：claude-api 流程依赖该 skill 的实际可用性，案例全部来自作者内部基准，未经第三方复现；两个做法都需要在自己的任务上验证后再推广。

## 依据的调研

- [Automating eval design and hillclimbing with Claude](../research/radar/2026-10-01/391-automating-eval-design-and-hillclimbing-with-claud.md)：值得一试，在 Claude Code 中装上 claude-api skill 后，用 `/claude-api build-eval` 生成评测集、再用 `/claude-api hillclimb` 对着它做单点改动的自动爬坡，值得先在一个任务上小范围试：原文给出了从采样用例、选 grader、诊断检查到 train/test 反过拟合的完整可照做流程和带数字的案例，但它依赖该 skill 的实际可用性、案例全部来自作者内部基准，需在自己的任务上验证后再推广。
- [facebookresearch/swe-sweep](../research/radar/2026-10-03/864-facebookresearch-swe-sweep.md)：值得一试，建议小范围试用：按 Quickstart 装好并跑通 `sweep eval` 的单任务评测，更值得借用的是它「回归守门 + 隐藏测试 + 部分得分」的验证协议，可直接套到自己团队的 AI 改码流程上；但仓库尚未公开任何实测分数（官网/论文链接仍是占位符），所以只能当作验证方法模板，不能当作能力结论的依据。
