# ArtificialAnalysis/aa-agentperf-local

- 结论：**值得一试**。把 agentperf-local 作为本地/自建模型服务的「agent 负载压测」工具小范围试用：先用 aa-mini-v1 跑通环境，再用默认回放对候选模型或服务框架做一次可对比的吞吐与延迟基线，据此选型或做回归；它只测速度不测输出质量，所以只能作为任务匹配与效果验证的一环，不能替代对输出结果的评估。
- 原文：https://github.com/ArtificialAnalysis/aa-agentperf-local
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T22:26:54.852Z

## 是什么

agentperf-local 是 Artificial Analysis 开源的命令行工具（Apache-2.0，Python 3.12+，README 显示 66 stars），用来测量「你的机器以多快的速度服务一个 AI agent」。做法是：把录制好的 agent 对话逐轮回放给一个 OpenAI 兼容的模型服务，每个请求都带上截至该轮的完整对话（和真实 agent 一样），最后报告吞吐与延迟。

README 明确说明其边界：**只测速度，不测输出质量**。

它支持两种用法：benchmark 一个你已经跑着的 OpenAI 兼容服务；或让工具自己下载指定版本模型、启动服务、跑完再关掉（managed-run）。工具本身不安装推理框架。

关键组件：
- 默认回放 `agentperf-default-v1`：8 个录制的 agent 任务、168 个模型轮次，使用 `exact` 输出策略（每轮强制生成录制时的 token 数），这是「可对比」的那次运行。
- `--replay aa-mini-v1`：6 轮的合成回放，只用来做安装自检，结果不可对比。
- 附带的 recipe 是 `recipes/` 下按「模型 × 硬件」组织的 YAML，固定了框架与模型版本（llama.cpp / vLLM / SGLang / Apple Silicon 上的 Splash）。

## 具体做法

前提条件（README 所列）：
1. 需要 `uv`（没有 Python 3.12 时它会自己拉取）。Docker 和 Rust 可选。macOS、Linux、Windows 均支持；但 Windows 上的 managed 运行需要 NVIDIA GPU 且只能用 llama.cpp，vLLM 和 SGLang 只在 Linux 上跑。
2. 需要有一个 OpenAI 兼容 API 的模型服务（llama.cpp、LM Studio、vLLM、SGLang、Ollama），或者装好工具能代为启动的框架。工具不替你装框架。
3. 完整运行需要 65536 token 上下文、batch size 1。默认回放最大的单轮约需 58000 token，因此只能在完整 65536 下跑。

步骤：

1. 安装（三种方式任选）：

```console
uv tool install agentperf-local
agentperf-local
```

```console
uvx agentperf-local
```

```console
pipx install agentperf-local
```

从源码检出运行：

```console
git clone https://github.com/ArtificialAnalysis/aa-agentperf-local.git
cd aa-agentperf-local
uv sync
uv run agentperf-local
```

（下文示例用 `uv run agentperf-local`；若是已安装的工具，去掉 `uv run`。）

2. 先用 `doctor` 看本机硬件事实（不上报标识）：

```console
uv run agentperf-local doctor
```

3. 确认本机能用哪个框架服务某个 catalog profile：

```console
agentperf-local deployment-options --profile-id <id>
```

4. 走 TUI 交互向导（方向键移动、Enter 继续、Escape 返回、`?` 帮助、`q` 退出）：

```console
uv run agentperf-local tui
```

5. 不想用 TUI 时，用 managed-run 一步跑完（下载固定版本模型到 Hugging Face cache、逐文件校验 SHA-256、localhost 起服务、回放、停服务）：

```console
uv run agentperf-local managed-run \
  --profile-id qwen38-27b-q4-k-m \
  --framework llama-cpp \
  --output-dir results/qwen38-27b
```

6. 设备装不下完整上下文时，先用 mini 回放自检（需 8192）：

```console
uv run agentperf-local managed-run \
  --profile-id gemma4-12b-it-q4-0 \
  --framework llama-cpp \
  --replay aa-mini-v1 \
  --context-tokens 8192 \
  --output-dir results/gemma4-12b-mini
```

低于 65536 token 的运行会被标成 `reduced: true`，与完整上下文结果不可对比。

7. 对你已经在跑的服务做回放（attached server）：

```console
uv run agentperf-local run \
  --base-url http://127.0.0.1:8080/v1 \
  --model served-model \
  --output-dir results/my-server
```

各类服务通常的 base URL：llama.cpp `http://127.0.0.1:8080/v1`；LM Studio `http://127.0.0.1:1234/v1`；vLLM `http://127.0.0.1:8000/v1`；SGLang `http://127.0.0.1:30000/v1`。

8. 需要 API key 时，把 key 放进环境变量，只传变量名（没有接受字面 key 的参数）：

```console
--api-key-env <ENV_VAR_NAME>
```

9. 让工具时间也变真实（默认会跳过轮次之间的工具耗时）：

```console
--tool-mode fixed_delay   # 按录制的工具耗时 sleep
--tool-mode live          # 在 Docker 容器里真实执行录制的 shell 命令
```

live 模式需要 Docker 和预构建镜像，构建脚本在源码检出里（bash 脚本，Windows 上要用 Git Bash 或 WSL）：

```console
scripts/install-swebench-validation.sh   # 仅 arm64 主机，只需一次
scripts/build-default-containers.sh
```

```console
uv run agentperf-local run \
  --base-url http://127.0.0.1:8080/v1 \
  --model served-model \
  --output-dir results/live-tools \
  --tool-mode live
```

10. 可选：实验性 Rust 客户端（在 Python 之外记录计时，两者产出的指标相同）：

```console
uv sync --extra rust
uv run agentperf-local tui --client rust
```

（已安装的工具用 `uv tool install 'agentperf-local[rust]'`；普通 `uv sync` 会移除该扩展。）

11. 读结果。每次运行写出一个目录：

```text
results/my-server/
├── turns.jsonl
├── tasks.json
├── tools.json
├── failures.json
├── summary.json
└── measurement.json
```

`summary.json` 是头条数字：output tokens/s，以及首 token 时间和整轮时间的 median 与 p95。它最后写，所以崩掉的运行没有 summary。

12. 可选：提交结果（默认不上传，只有你主动 `submit` 才发）：`prepare-submission` 生成提交文件，`submit` 发送，`submission-status` 回读状态；对自己启动的服务需 `run --attached-server FILE`。

其他命令：`convert` 把一段 agent 录制转成 replay manifest；`python -m agentperf_local` 与主程序等价；`uv run agentperf-local <command> --help` 看全部选项。

## 对应的研究问题

**1. 能力发现**：无依据。README 只描述测量方法与命令，没有涉及「AI 还能做什么以前没想到的工作」。

**2. 任务匹配**：有直接依据。这是本工具的主用途之一——用真实 agent 负载形状（每轮携带完整对话、默认 168 轮）去对比不同模型、不同服务框架（llama.cpp / vLLM / SGLang / Splash / Ollama）和不同硬件上的吞吐与延迟，从而为「这类 agent 工作该配什么模型和服务栈」提供数据。`deployment-options` 专门回答「本机哪个框架能服务某个 profile」。

**3. 条件供给**：有部分依据，且是可照做的清单。要跑起来必须提供：一个 OpenAI 兼容端点（或让工具代为启动的框架）、65536 token 上下文（batch size 1）、服务端支持非标准参数 `ignore_eos`（`exact` 策略需要）、可选 API key（经环境变量传递）、live 工具模式还需要 Docker 与预构建镜像。工具会在回放前主动检查这些前提，不满足就停止并指出要改哪个开关。

**4. 主动推进**：无依据。工具本身由命令触发，README 未描述任何按时间、事件或状态自动持续运行的机制。

**5. 效果验证**：有部分依据，但有明确边界。它验证的是「服务变快/变慢了没有」——`summary.json` 给出 output tokens/s 和首 token、整轮时间的 median/p95，可用于同一机器上改动前后的回归对比。但它**不测输出质量**，所以不能用来判断「AI 干得更好没有」，只能作为验证链条里性能那一环。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

**原文给出的、比较硬的东西**：
- 默认回放的具体规模：8 个录制 agent 任务、168 个模型轮次。
- 上下文门槛：完整运行 65536 token、batch size 1；默认回放最大单轮约 58000 token；mini 回放需 8192。
- 输出策略的机制细节：`exact` 会发送 `ignore_eos`（不属于 OpenAI API），运行前会检查服务端是否遵守；Ollama 无法遵守，工具会在运行前检测并警告，改用 `recorded` 策略，其端到端延迟只是归一化估计，与 `exact` 运行不可直接比较。
- 哪些运行不可对比，工具自己做了标记：低于 65536 token 标 `reduced: true`；Splash 的 recipe 只跑 `recorded` 策略且 KV cache 恒为 8bit，因此与 `exact` 运行不可比。
- 结果文件结构与 `summary.json` 的字段含义。

**只是作者主张、没有数据支撑的部分**：README 通篇没有给出任何实际 benchmark 数值、性能对比表或案例；「测量规则」「证据边界」被指向 `docs/ARCHITECTURE.md`，但那份文档不在给出的材料里。仓库只有 66 stars，成熟度证据有限（作者 Artificial Analysis 在模型评测领域有一定知名度，但这是外部声誉而非本仓库的证据）。

**适用条件与限制**：
- 只测速度，不测质量——这是最大的限制，直接决定了它在「效果验证」里只能算半个证据。
- 平台限制明确：Windows 的 managed 运行需 NVIDIA GPU + llama.cpp；vLLM/SGLang 仅 Linux；Splash 仅 Apple Silicon（M3 或更新，macOS 26.4 或更新）。
- live 工具模式有多条安全警告：录制的命令属于不可信输入，Docker 降低但不构成安全边界；能访问 Docker daemon 在多数主机上等同于 root；容器默认无网络但 manifest 可要求联网（可用 `--live-network none` 强制断网）；任务工作区以读写方式挂载；脚本会拉取/构建第三方镜像并从 GitHub 克隆 SWE-bench harness。
- 隐私：结果目录可能包含路径、模型标签和错误信息；启动运行会把录制的 prompt 发给模型服务，因此用远端 URL 就等于把 prompt 送出本机。
- 工具不安装推理框架，也不替你解决模型下载以外的环境问题。

## 怎么试、怎么验证

**最小试用方式**（目标：在不改变现有服务的前提下拿到一条基线）

1. `uvx agentperf-local`（或 `uv tool install agentperf-local`）装好，跑 `agentperf-local doctor` 确认本机硬件可用。
2. 先对自己**已经在跑**的服务做一次 attached 回放，避免动环境：

```console
uv run agentperf-local run \
  --base-url <你的服务>/v1 \
  --model <服务报出的模型名> \
  --output-dir results/baseline
```

如果服务端不支持 `ignore_eos`（例如 Ollama），工具会警告并切到 `recorded` 策略，此时把结果只当作粗略参考，不要和 `exact` 结果放一起比。
3. 设备跑不动完整上下文时，先用 `--replay aa-mini-v1 --context-tokens 8192` 验证链路通不通，再换回默认回放拿正式数字。
4. 要换模型/换框架时，用 `deployment-options` 选可行的 framework，再用 `managed-run` 跑一次同 profile 的对照，注意保持输出策略和上下文一致（都用完整 65536 + `exact`），否则不可比。

**判断有没有改善的指标**
- 主指标：`summary.json` 里的 output tokens/s（吞吐）。
- 交互体感指标：首 token 时间的 median 与 p95；整轮时间的 median 与 p95。agent 场景下首 token 的 p95 往往比均值更能反映体验。
- 回归检查：任何改动（升级框架版本、改 KV cache 精度、换量化档位、换 GPU）前后各跑一次同配置，比较上述四个数；同时确认两次运行的 context 都 ≥65536 且输出策略一致，否则结果被标 `reduced: true` 或用了 `recorded`，不应直接比较。
- 需要注意：这四个数只说明「服务得更快」，不能证明「任务完成得更好」。要判断后者，仍需在同一模型上另做输出质量评估；工具本身明确不做这件事。
