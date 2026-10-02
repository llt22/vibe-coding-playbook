# facebookresearch/swe-sweep

- 结论：**值得一试**。建议小范围试用：按 Quickstart 装好并跑通 `sweep eval` 的单任务评测，更值得借用的是它「回归守门 + 隐藏测试 + 部分得分」的验证协议，可直接套到自己团队的 AI 改码流程上；但仓库尚未公开任何实测分数（官网/论文链接仍是占位符），所以只能当作验证方法模板，不能当作能力结论的依据。
- 原文：https://github.com/facebookresearch/swe-sweep
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T18:28:10.518Z

## 是什么

SWE-sweep 是 facebookresearch 发布的一个基准（README 中标注为 2026 preprint），用来回答「LM 在大型代码库中能发现并修复多少 bug」。设定是：给定一个真实仓库，智能体必须在**没有任何 bug 类型或位置提示**的情况下，自主发现并修复尽可能多的 bug。

仓库本身只是 [Harbor](https://www.harborframework.com/) 框架的「薄封装」（thin wrapper），提供三件事：安装与自检命令、对单个任务跑评测的命令、以及对多份评测结果汇总算分的命令；另外用伪代码公开了它的评测协议。

需要注意的前置限制（原文明确警告）：

- **Harbor 版本**：Harbor 0.23 还不支持这些任务所用的「独立 verifier 环境」和 collect hooks，因此项目暂时 pin 了 Harbor 源码仓库中一个兼容 revision，直到 Harbor 0.24 发布。
- **最终分数**：是对已解决 bug 做 micro-average（等价于各任务得分的加权平均）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **准备环境并安装**。前提：本机有 git 与 Python 环境（README 推荐用 uv 管理 Python 环境）。

   ```bash
   git clone https://github.com/facebookresearch/swe-sweep.git
   cd swe-sweep
   uv sync   # or pip install .
   ```

2. **验证安装是否正确**。前提：上一步已成功。

   ```bash
   sweep infra doctor
   ```

3. **（可选）开发模式安装**——只在你要改这个仓库、跑它的测试与 lint 时用。原文说明 CI 在 Python 3.12 和 3.13 上测试。

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

4. **评测单个任务**。前提：你需要准备一个**针对该任务 base commit 的 unified diff**（也就是待评的模型 patch）。命令是「任务名 + diff 路径」：

   ```bash
   sweep eval <task> <path/to/submission.diff>  # see raw harbor command below
   ```

   它底层等价于下面这条原始 Harbor 命令（原文给出的例子用的是 `tasks/pandora-bench__dateutil` 这个任务路径）：

   ```bash
   uv run harbor run \
   --path tasks/pandora-bench__dateutil \
   --agent swesweep.patch_agent:PatchAgent \
   --agent-kwarg "patch_path=$(realpath /path/to/model.patch)" \
   --jobs-dir jobs \
   --n-concurrent 1 \
   --yes
   ```

   这条命令会用一个「小的打补丁 agent」跑对应的 Harbor 任务，Harbor 随后在任务独立的 verifier 环境中评测打补丁后的 checkout。结果默认写到 `jobs/` 目录下。

5. **理解（并复用）它的评测协议**。原文给出的伪代码就是完整的评分流程，可直接抄成自己流程的模板：

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

   要点有三条：先重置到 base commit 再打 agent 的补丁；把测试文件重置回原状（防止改测试作弊）；只要相对基线出现任何**新的失败**，整个任务直接判 0 分，否则按通过的隐藏子任务比例给部分分。

6. **汇总多份结果算总分**。前提：你已有若干目录存放已评分的 Harbor trials。基准总分定义为：

   ```
   total number of bugs solved across tasks / total number of bugs =
       = mean(number of bugs in task * task score)
   ```

   对应命令：

   ```bash
   sweep info path/to/graded-solutions --per-task
   sweep info path/to/graded-solutions --json
   ```

## 对应的研究问题

- **能力发现**：这是该基准的核心设计目标——在**不给 bug 类型、不给位置提示**的条件下，测智能体能自主发现并修复多少 bug，等于给「编程智能体自主找 bug」这一能力画一条可量化的边界线。
- **任务匹配**：基准明确区分了任务形态——智能体面对的是「自主发现 + 修复」，而不是「已知位置后的修复」；原文强调「不给任何提示」，这提示了两类任务需要不同的智能体配置与能力。
- **条件供给**：从评测侧规定了要提供什么——base commit、可见测试套件（visible suite）、需要时才 build、独立的 verifier 环境、每个子任务的 hidden tests 与 test_patch；同时明确**不**提供 bug 类型和位置提示。
- **主动推进**：原文没有涉及由时间/事件/状态触发并持续完成的内容。
- **效果验证**：这是最直接可复用的部分——回归守门（出现任何新失败即判 0）、隐藏测试、子任务级部分得分、跨任务 micro-average 汇总。

## 与已有做法的关系

清单中没有相关条目（本次给出的 `catalog_related` 为空）。

## 证据与局限

**原文给出的具体内容（可核验的部分）**：

- 完整的安装与自检命令、单任务评测命令、原始 Harbor 命令及其 `--agent swesweep.patch_agent:PatchAgent`、`--jobs-dir`、`--n-concurrent 1` 等参数。
- 一段可直接照抄的评测伪代码，以及明确的评分公式与两条汇总命令。
- 引用信息：作者为 Kilian Lieret、Jeffrey Jian Ma、Rahul Kindi、Yuxiang Wei、Jeremy Ma、Sten Sootla、Parth Thakkar、Chao Beyond Zhou、Pengcheng Yin、Rui Hou、Ofir Press、John Yang，2026 年 preprint。
- 已知的环境约束：Harbor 0.23 不支持所需特性，需 pin 兼容 revision，等 0.24；CI 在 Python 3.12/3.13 上测试。

**只是作者主张、缺乏数据支撑的部分**：

- 标题设问「How many bugs can LMs find & fix in large codebases?」在 README 中**没有给出任何答案**——没有任何模型名、分数、bug 数量或案例结果。
- 官网（https://swesweep.com）与论文（https://swesweep.com/paper）链接在 README 中仍是占位符（原文注释写明 `TODO: fill in the public links once available`），因此无法从这份材料核实结论，也无法判断该基准相对同类基准（如 SWE-bench 一类）的差异——原文没有做任何对比。

**适用条件**：

- 必须能使用 Harbor 框架，并能拉到它指定的源码 revision。
- 需要能构建目标仓库、且任务自带 base commit、可见测试与隐藏测试。
- README 只提到了一个具体任务路径 `tasks/pandora-bench__dateutil`，没有给出任务清单，任务总量未知（36 stars，规模有限）。

## 怎么试、怎么验证

**最小试用（约半天）**：

1. `git clone` + `uv sync`，跑 `sweep infra doctor` 确认环境可用。
2. 用原文给出的那一个任务跑一次完整流程：把某个模型生成的 patch 存成 diff，执行 `sweep eval <task> <path/to/submission.diff>`（或上面那条原始 harbor 命令），再 `sweep info path/to/graded-solutions --per-task` 看分。
3. 同时故意做两个对照：一个 patch 顺带改动了测试文件，一个 patch 引入了新的失败用例——确认二者都被判 0 分，以此验证「回归守门」确实生效。

**更轻量、也更值得推广的试用**：不引入这套工具，只把第 5 步的伪代码搬进自己团队现有的 AI 改码流程——重置到基线 → 打 AI 的补丁 → 还原测试文件 → 跑一遍原有测试套件记录基线 → 跑隐藏/追加测试 → 有任何新失败就拒收，否则按通过比例给分。

**判断有没有改善的指标**：

- 任务得分（通过的 subtask 数 / subtask 总数）是否上升。
- 「新引入的失败用例数」——应恒为 0；这个指标最能直接判断 AI 改动是否可接受。
- 多次运行的总分（micro-average：平均每个任务的 bug 数 × 任务得分）用来横向比较不同模型/配置。
- 注意：由于原文没有任何实测基线分数，第一次跑出来的数字**只能作为自己前后的对照**，不能与论文或其他团队的数字比较。
