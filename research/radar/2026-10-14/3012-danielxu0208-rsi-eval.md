# Danielxu0208/rsi_eval

- 结论：**值得一试**。值得小范围试：把它当作“AI 改动到底有没有变好”的评测脚手架来用——先用零成本的 preview 验证环境，再对单个任务跑 oracle 基线与候选对比；理由是它给出了可直接复制的安装、配置、运行、产物和恢复流程，但只覆盖 agent/基准评测场景，且没有任何实测数据佐证其可靠性。
- 原文：https://github.com/Danielxu0208/rsi_eval
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T20:47:51.776Z

## 是什么

RSI Eval 是一个轻量 Python SDK + CLI，用来在智能体基准（agent benchmarks）上评测“递归自我改进（RSI）”类方法。核心循环固定为：

```
candidate -> evaluate() -> task feedback -> your next candidate
```

分工很明确：候选生成、记忆、选择、停止规则、evolve/test 任务划分都由你自己的方法控制；工具只提供**评测边界**——跑基准、调 grader、返回统一结果。它不要求你继承某个 optimizer 基类，直接在自有循环里调 `evaluate()` 即可。

目录（catalog）包含 24 个评测配置和两个标记为 legacy 的子集，覆盖：

| 领域 | 打包的基准 |
| --- | --- |
| 终端与软件工程 | Terminal-Bench 2.0/2.1、SWE-bench Verified/Multilingual/Pro、Aider Polyglot |
| 代码生成 | LiveCodeBench |
| 推理与数学 | MMLU、GPQA、ARC-AGI、MGSM |
| 阅读理解 | DROP |
| MCE 任务 | FiNER、USPTO、Symptom2Disease、LawBench、AEGIS |
| 工程 | EngDesign-Open、Frontier-Eng |
| 领域工作流 | JobBench、Harvey LAB、APEX |

任务选择属于你的实验，catalog 不预设永久的 evolve/test 角色。另外提供 Meta-Harness、RRSI、AHE、HarnessX 四个可直接运行的方法集成；核心 SDK 无第三方运行时依赖，执行后端和方法依赖按需安装。许可证 Apache-2.0，第三方组件与基准资产各自保留许可。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Python 3.12+；Docker（Linux 上 Docker Engine + Compose + Buildx，macOS 上用 Docker Desktop 或 Colima Linux VM）；部分任务需要 NVIDIA GPU、原生 Linux amd64 或外部资产；JobBench、Harvey LAB、APEX 需要单独的 native judge 凭据；会消耗模型配额。

1. 克隆仓库、建虚拟环境、可编辑安装（不需要 Docker 和登录）：

```sh
git clone https://github.com/Danielxu0208/rsi_eval.git
cd rsi_eval
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
```

2. 先做零副作用预览。`preview` 只解析任务引用、候选哈希和运行设置，不需要 Docker、Harbor、登录或模型调用：

```sh
rsi-eval list
rsi-eval preview --config examples/evaluate.json
```

示例默认选 Terminal-Bench 2.0 的 `extract-elf` 任务和打包的 Codex 候选。

3. 要真正跑基准评测，在同一环境装 Harbor extra（会 pin 住 Harbor 0.18.0）。其可执行文件必须在 `PATH` 上，或在运行配置里用 `options.harbor_executable` 指定。非可编辑安装用 `python -m pip install '.[harbor]'`：

```sh
python -m pip install -e '.[harbor]'
```

4. 校验 Docker 可用（用实际跑评测的账号）：

```sh
docker info
docker compose version
docker buildx version
```

Apple Silicon 上如需独立的 Colima profile：

```sh
brew install colima docker docker-compose docker-buildx
colima start rsi-eval --cpus 6 --memory 12 --disk 120 \
  --vm-type vz --vz-rosetta --runtime docker --activate=false \
  --ssh-config=false --mount "$PWD:w"
source scripts/mac-env.sh
```

按机器情况调整资源；该 Colima 命令要求 Rosetta；x86-only 镜像在 Apple Silicon 上需要模拟。任务要求时设 `DOCKER_DEFAULT_PLATFORM=linux/amd64`，按任务选平台的配置则要清掉它。

5. 为实验建专用、file-backed 的 Codex 登录，并用 `configure` 生成 profile（`configure` 只探测并记录 Codex CLI 版本，不调用模型）：

```sh
mkdir -p "$HOME/.codex-rsi-eval"
chmod 700 "$HOME/.codex-rsi-eval"
CODEX_HOME="$HOME/.codex-rsi-eval" codex \
  -c 'cli_auth_credentials_store="file"' login

rsi-eval configure --model YOUR_MODEL \
  --auth-dir "$HOME/.codex-rsi-eval" --output profile.json
```

凭据必须放在候选产物和仓库之外。

6. 改 `examples/evaluate.json`（运行前必做三处）：`target.model` 设为你能访问的模型；`target.config.codex_auth_dir` 设为上一步的专用登录目录；`target.config.codex_version` 设为 `profile.json` 里记录的 `codex.expected_version` 精确版本。

7. 按“检查 → 参考解 → 候选”三段跑。`check` 不调用模型；`--oracle` 跑声明的参考解、不经过 Codex，但仍需要任务环境；最后一条才消耗模型配额：

```sh
rsi-eval check --config examples/evaluate.json
rsi-eval run --config examples/evaluate.json \
  --oracle --output runs/tb20-reference
rsi-eval run --config examples/evaluate.json \
  --output runs/tb20-candidate
```

路径规则：run JSON 里的路径相对配置文件解析，CLI `--output` 相对当前目录；每次新评测用新的输出目录。

8. 选基准与任务。选择可用显式 `task_ids`，或 `manifest`（含 JSON ID 列表，如 `["extract-elf"]`）；两者都不写就选整个配置。扩大运行前先看任务数和整个 job 的超时：

```sh
rsi-eval status --benchmark terminal-bench@2.0 --method rrsi
rsi-eval preview --config examples/benchmarks/mgsm.json
rsi-eval preview --config examples/benchmarks/frontier-eng.json
```

任务专属设置放 `options.benchmark_runtime`。想复用源下载，设 `RSI_EVAL_SOURCE_CACHE="$PWD/.runtime/source-cache"`。

9. 用 Python SDK（与 CLI 共用同一套 target、selection、options；打包的订阅版 Codex 目标要求 `concurrency=1`）：

```python
import json
from pathlib import Path
from rsi_eval import BenchmarkSelection, RunOptions, TargetSpec, evaluate

profile = json.loads(Path("profile.json").read_text())["codex"]
target = TargetSpec(
    artifact_dir=Path("templates/codex_agent"),
    entrypoint="rsi_eval.harbor_codex:Agent",
    model=profile["model"],
    config={
        "codex_auth_dir": profile["auth_dir"],
        "codex_version": profile["expected_version"],
        "reasoning_effort": profile["reasoning_effort"],
    },
)
result = evaluate(
    target=target,
    benchmark=BenchmarkSelection(
        "terminal-bench", "2.0", task_ids=("extract-elf",)
    ),
    options=RunOptions(repetitions=1, concurrency=1),
    output_dir=Path("runs/sdk-candidate"),
)
print(result.status)
for trial in result.trials:
    print(trial.task_id, trial.status, trial.reward)
print(result.report_path)
```

10. 跑一个打包方法（prepare 会建独立依赖环境、拉 pin 住的上游代码、冻结配置和 seed，不调用模型；run 起原生改进流程；test 独立评测其选定产物）：

```sh
rsi-eval method list
rsi-eval method prepare --method meta-harness \
  --profile profile.json --experiment runs/meta-example
rsi-eval method check --experiment runs/meta-example
rsi-eval method run --experiment runs/meta-example
rsi-eval method test --experiment runs/meta-example --output runs/meta-test
```

把 `--method` 换成 `rrsi`、`ahe`、`harnessx`；准备时用 `--config experiment.json` 选任务和方法设置。连续或异构奖励要先看各方法的目标要求，显式 score policy 可适配方法目标同时保留基准原始奖励。

11. 读结果。每次评测在输出目录下写这些产物：

| 路径 | 内容 |
| --- | --- |
| `result.json` | 统一状态、逐任务结果、指标与用量 |
| `resolved.json` | 选中任务、源引用、候选哈希与设置 |
| `candidate/` | 提交执行的候选快照 |
| `native/eval/` | Harbor trials、verifier 输出和可用轨迹 |
| `harbor.log` | 后端进程输出 |

`completed` 包含测得的零奖励；`partial` 和 `failed` 保留可用结果并说明缺失部分；基础设施与鉴权失败和判分结果分开；基准自己的汇总保持原有含义；未知 token 数保持未知。

12. 中断后显式恢复（core 恢复会重试未完成的任务重复、保留已完成测量和此前尝试；方法恢复按各方法自己的 checkpoint 与回滚行为，可能重复中断轮次里的调用）：

```sh
rsi-eval resume --output runs/tb20-candidate
rsi-eval method resume --experiment runs/meta-example
```

13. 接自己的 RSI 循环——在你需要候选反馈的地方调 `evaluate()`：

```python
from dataclasses import replace
from pathlib import Path
from rsi_eval import RunOptions, evaluate


def run_rsi(propose, select, *, target, benchmark, rounds, output_dir):
    history = []
    for index in range(rounds):
        candidate = Path(propose(history))
        result = evaluate(
            target=replace(target, artifact_dir=candidate),
            benchmark=benchmark,
            options=RunOptions(repetitions=1, concurrency=1),
            output_dir=Path(output_dir) / f"candidate-{index:03d}",
        )
        history.append({
            "candidate": result.resolved["target"]["snapshot_dir"],
            "feedback": result.to_dict(),
        })
        if result.status != "completed":
            raise RuntimeError(result.error or result.report_path)
    return select(history)
```

要点：`propose(history)` 返回候选目录，`select(history)` 决定保留哪个已测量的候选快照；需要时在独立 test selection 上评测选定产物；`evaluate()` 会自动快照每个候选；运行输出必须放在候选目录之外。

14. 换 Codex 候选：复制 `templates/codex_agent`，改 `agent.py`、`prompt.md` 或 `tools/`。必须实现的钩子是 `build_prompt(instruction, artifact_dir) -> str`。换别的 Harbor agent：设 `entrypoint="your_module:YourAgent"` 并让该模块在 Harbor 执行环境中可导入；若它加载候选文件，构造函数要接受 `artifact_dir` 参数，并在 `target.config` 里含这个键（SDK 会用记录的候选快照路径替换它）。注意边界：候选 Python 钩子在受信的 Harbor worker 里跑，传给任务环境的命令在其容器里跑。

15. 加自定义基准 / 任务：

```python
from copy import deepcopy
from rsi_eval import (
    BenchmarkSelection, TargetSpec, list_benchmarks, preview,
    register_benchmark,
)
from rsi_eval.resources import codex_template

base = next(
    spec for spec in list_benchmarks()
    if (spec["name"], spec["version"]) == ("terminal-bench", "2.0")
)
task = deepcopy(next(
    task for task in base["tasks"] if task["id"] == "extract-elf"
))
register_benchmark({
    "name": "my-terminal-suite",
    "version": "1",
    "dataset_ref": base["dataset_ref"],
    "tasks": [task],
})

selection = BenchmarkSelection("my-terminal-suite", "1")
plan = preview(
    target=TargetSpec(codex_template(), "oracle"),
    benchmark=selection,
    output_dir="runs/my-suite-preview",
)
print(plan["benchmark"]["task_ids"])
```

约束：`register_benchmark()` 只影响当前 Python 进程，另起的 CLI 不会继承；要跨 CLI 进程生效就打包到 `src/rsi_eval/data/catalog_*.json`。任务需按 Harbor 格式提供 instruction、`task.toml`、环境和 verifier，想要 oracle 执行还需参考解。每个注册任务需要 `id` 加一种源定义：Harbor 包要 `name` 和含不可变 `sha256:` 摘要的 `ref`；Git 仓库要 `git_url`、完整 40 位 `git_commit_id` 和仓库相对 `path`。规格还需要 `name`、`version`、`dataset_ref` 和非空 `tasks`。新数据集格式则在 `src/rsi_eval/materializers/` 加 materializer、在该包的 `MATERIALIZERS` 表注册、并把 pin 住的源/协议/任务记录加入 catalog。要求：参考解对候选保密、保持原生指标与评分规则、声明任何交互变更、只有基准自身定义了聚合才加聚合。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：弱。README 描述的是评测工具自身能力（跑基准、比对候选、复现结果），没有“AI 还能接手哪些工作”的证据。唯一可迁移的一点是第 2 步的 `preview`：不调用模型、不需要 Docker 和登录，就能解析出任务引用、候选哈希和运行设置——适合在投入资源前先探明某类任务到底需要什么。
- **任务匹配**：中等。catalog 按领域把基准分成终端/软件工程、代码生成、推理与数学、阅读理解、MCE、工程、领域工作流七类，可以作为“哪类工作用哪个基准衡量”的对照表；`rsi-eval list` 给出精确版本和任务数。支持换 Harbor agent（`entrypoint`）和各自的模型/鉴权；订阅版 Codex 目标强制 `concurrency=1`，说明不同接入方式有不同约束。但 README 不给“哪个模型适合哪类工作”的结论。
- **条件供给**：强，写得很具体。需要：Docker（Engine + Compose + Buildx / Desktop / Colima）、Harbor 0.18.0 且可执行文件在 `PATH` 或用 `options.harbor_executable` 指定、专用 Codex 登录目录（凭据不得进候选产物或仓库）、模型配额、部分任务需要 NVIDIA GPU / 原生 Linux amd64 / 外部资产、JobBench 与 Harvey LAB 与 APEX 需要单独 native judge 凭据、任务需 instruction + `task.toml` + 环境 + verifier（+ 可选参考解）。反馈供给方面：统一结果里给逐任务分数、执行状态、token 用量、verifier 输出和轨迹路径，`result.to_dict()` 可直接喂回你的下一轮。
- **主动推进**：部分。`candidate -> evaluate() -> task feedback -> your next candidate` 本身就是状态驱动的循环，且 `resume` 能从上次中断处继续：core 恢复重试未完成的任务重复、保留已完成测量和此前尝试。README 没有讲时间触发或长期后台运行，方法级恢复可能重复中断轮次中的调用。
- **效果验证**：强，这是该工具的主线。先跑 `--oracle` 拿参考解基线，再跑候选对比；逐任务保留原始 reward、task budget 和基准专有指标；`resolved.json` 记录选中任务、源引用、候选哈希和设置；`prepare` 冻结配置和 seed；`method test` 在独立 selection 上复测选定产物；基础设施/鉴权失败与判分结果分开报告；`completed` 包含测得的零分；未知 token 数保持未知；明确要求参考解对候选保密、保持原生评分规则。

## 与已有做法的关系

清单中已有两条相关条目：

- **Meta-Harness（concept，watch）**：本仓库把它从“概念”变成可执行流水线——`rsi-eval method prepare/check/run/test --method meta-harness`，工作流为候选搜索、smoke 评测、frontier 与历史反馈。如果要把清单里那条观察项落地，这是现成的执行路径。
- **Terminal-Bench 2.0（source，study）**：本仓库把它作为 pinned benchmark 直接可选（`examples/evaluate.json` 默认就是 Terminal-Bench 2.0 的 `extract-elf`，另有 Terminal-Bench 2.1），并负责下载校验过的源、在执行时准备 Harbor 任务，省掉自己实现执行与结果处理。

RRSI、AHE、HarnessX 三个集成方法在给定的清单条目中没有对应项。

## 证据与局限

**原文给出的可核查信息**：具体命令与代码（安装、Docker 校验、Colima 启动、Codex 登录、`check`/`run --oracle`/`run`、SDK、自定义循环、自定义基准、resume）；产物文件名与目录结构（`result.json`、`resolved.json`、`candidate/`、`native/eval/`、`harbor.log`）；固定版本（Harbor 0.18.0、Python 3.12+、Codex 版本需与 `profile.json` 的 `expected_version` 一致）；24 个评测配置和两个 legacy 子集；四个方法集成及其工作流描述；许可证 Apache-2.0。

**只是作者主张、没有数据支撑的**：`Get usable feedback`、`Reuse benchmark protocols`、`Record and resume experiments` 这类效果描述；方法工作流的实际有效性（如 Meta-Harness 的 frontier 反馈、RRSI 的约束选择、AHE 的延迟归因）；`preview` 能完整反映真实运行所需的一切。README 里**没有**任何基准分数、对比实验、案例或第三方验证。

**来源局限**：本次只依据仓库 README（`source_note` 明确为“依据仓库 README”），且为抓取文本，未能验证仓库实际代码、examples 文件内容与文档链接是否与描述一致。仓库 30 stars，属于小众项目。

**适用条件与风险**：需要 Docker 与足够资源的机器（Colima 示例给的是 6 CPU / 12 GB / 120 GB）；需要模型配额，部分任务需要 NVIDIA GPU 或原生 Linux amd64；JobBench、Harvey LAB、APEX 需要额外的 judge 凭据，APEX 明确仅发布用于评估、不得用于训练或参数拟合；选用数据进化时要查发布方使用条款；候选 Python 钩子在受信 Harbor worker 中执行，意味着候选代码的运行边界要自己想清楚；评测本身是否可靠（verifier 正确性、任务难度分布）README 未说明。它服务的是 agent / 改进循环的基准评测，不是日常办公任务的通用评测。

## 怎么试、怎么验证

**最小试用（按代价从低到高，任一步不通就地停）**

1. 零成本探路：装好 SDK（不需要 Docker、登录、模型调用）后跑 `rsi-eval list` 和 `rsi-eval preview --config examples/evaluate.json`，确认能列出配置、能解析出 `task_ids`、候选哈希和运行设置。这一步就能判断这个工具值不值得继续投入。
2. 只跑一个任务：固定 Terminal-Bench 2.0 的 `extract-elf`，先 `rsi-eval check`，再 `rsi-eval run --oracle`（参考解基线，不烧模型配额），最后才 `rsi-eval run` 跑候选。每次用新的输出目录。
3. 接自己的候选：复制 `templates/codex_agent` 改 `prompt.md`/`agent.py`，或直接照第 13 步的 `run_rsi` 循环换成自己的 `propose`/`select`；`concurrency=1`，输出目录放在候选目录之外。

**判断有没有改善的指标**

- 运行状态：`result.json` 的 `status` 是否 `completed`。若频繁 `partial`/`failed`，先分清是基础设施/鉴权失败还是任务本身失败——README 明确这两类分开报告。
- 分数：候选的逐任务 `reward` 相对 `--oracle` 基线、或相对上一版候选的变化方向和幅度。
- 稳定性：同一候选在 `repetitions>1` 下结果是否一致。若重复运行方差大于改动带来的差异，说明评测噪声盖过了改进，不能据此宣称改善。
- 可复现性：`resolved.json` 里的候选哈希、选中任务和设置是否与上次一致；`candidate/` 快照是否是你要评的那个版本。
- 计量完整性：token 用量是否被记录；未知的 token 数是否如实标为未知（不能被悄悄填成 0）。
- 恢复正确性：中途中断后 `resume`，检查是否只重跑未完成的任务重复、且保留了已完成测量和此前尝试。
- 独立性：如果要做结论性判断，用独立于改进过程的 test selection（`method test` 或另设 selection），而不是只报告用于搜索的那批任务。
