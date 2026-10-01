# 换模型或推理框架前，先给 agent 负载跑一条可对比基线

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：换模型、换推理框架或改服务配置时，缺少一条同机可对比的 agent 负载基线，只能凭感觉判断快慢。
> 先试这一步：先装好 agentperf-local 并对你已经在跑的服务做一次 attached 回放，不动现有环境拿到第一条基线。
> 最近修订：2026-10-02

## 解决什么问题

换模型、换推理框架或改服务配置时，缺少一条同机可对比的 agent 负载基线，只能凭感觉判断快慢。agentperf-local 把录制好的 agent 对话逐轮回放给一个 OpenAI 兼容的模型服务，每个请求都带上截至该轮的完整对话（和真实 agent 一样），最后报告吞吐与延迟。README 明确说明其边界：只测速度，不测输出质量。

## 适用与不适用

适用：

- 为「多轮 agent 负载」做任务匹配：用真实 agent 负载形状（每轮携带完整对话、默认 168 个模型轮次）对比不同模型、不同服务框架（llama.cpp / vLLM / SGLang / Splash / Ollama）和不同硬件上的吞吐与延迟。
- 同一台机器上改动前后的性能回归：summary.json 给出 output tokens/s 和首 token 时间、整轮时间的 median 与 p95，可用于判断「服务变快/变慢了没有」。
- 回答「本机哪个框架能服务某个 profile」：用 deployment-options。

不适用：

- 判断「AI 干得更好没有」：它不测输出质量，不能替代对输出结果的评估，只能作为验证链条里性能那一环。
- 判断任务完成度、正确性、输出质量。
- 自动持续运行或监控：材料未描述任何按时间、事件或状态自动持续运行的机制，工具由命令触发。
- 测单次短 prompt 聊天：默认回放是 agent 形状的多轮负载。

## 前置条件

- uv（没有 Python 3.12 时它会自己拉取）。Docker 和 Rust 可选。
- 一个 OpenAI 兼容 API 的模型服务（llama.cpp、LM Studio、vLLM、SGLang、Ollama），或者让工具代为启动的框架。工具本身不安装推理框架。
- 完整运行需要 65536 token 上下文、batch size 1。默认回放最大的单轮约需 58000 token，因此只能在完整 65536 下跑。
- 服务端需要支持非标准参数 ignore_eos（exact 策略需要）。Ollama 无法遵守，工具会在运行前检测并警告，改用 recorded 策略。
- 可选 API key：放进环境变量，只传变量名，没有接受字面 key 的参数。
- live 工具模式还需要 Docker 和预构建镜像。
- 平台限制：macOS、Linux、Windows 均支持；但 Windows 上的 managed 运行需要 NVIDIA GPU 且只能用 llama.cpp，vLLM 和 SGLang 只在 Linux 上跑；Splash 仅 Apple Silicon（M3 或更新，macOS 26.4 或更新）。

工具会在回放前主动检查这些前提，不满足就停止并指出要改哪个开关。

## 操作步骤

以下示例若用已安装的工具，去掉 `uv run`。完整选项用 `uv run agentperf-local <command> --help` 查看。

### 1. 安装

三种方式任选：

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

预期结果：命令行工具可用。

### 2. 看本机硬件事实

前提：已安装。预期结果：输出本机硬件事实，不上报标识。

```console
uv run agentperf-local doctor
```

### 3. 确认本机哪个框架能服务某个 catalog profile

前提：已安装。预期结果：给出该 profile 可用的部署选项，用于下面的做法 B 选型。

```console
agentperf-local deployment-options --profile-id <id>
```

### 4. 选做法 A 或做法 B 跑一次回放

做法 A：对你已经在跑的服务做 attached 回放。适合先摸底、做回归，不动现有环境。

```console
uv run agentperf-local run \
  --base-url http://127.0.0.1:8080/v1 \
  --model served-model \
  --output-dir results/my-server
```

各类服务通常的 base URL：llama.cpp `http://127.0.0.1:8080/v1`；LM Studio `http://127.0.0.1:1234/v1`；vLLM `http://127.0.0.1:8000/v1`；SGLang `http://127.0.0.1:30000/v1`。

做法 B：managed-run 一步跑完。工具会下载固定版本模型到 Hugging Face cache、逐文件校验 SHA-256、在 localhost 起服务、回放、停服务。适合按 recipes 里固定的「模型 × 硬件」组合做可对比运行。

```console
uv run agentperf-local managed-run \
  --profile-id qwen38-27b-q4-k-m \
  --framework llama-cpp \
  --output-dir results/qwen38-27b
```

怎么选：已有服务、想先拿一条不改变环境的基线，选做法 A；要对比 recipes 里的固定组合、或没有现成服务，选做法 B。也可以先用 TUI 交互向导（方向键移动、Enter 继续、Escape 返回、`?` 帮助、`q` 退出）：

```console
uv run agentperf-local tui
```

### 5. 设备装不下完整上下文时，先用 mini 回放自检

前提：设备只有 8192 上下文。预期结果：跑通安装与流程，但低于 65536 token 的运行会被标成 `reduced: true`，与完整上下文结果不可对比。

```console
uv run agentperf-local managed-run \
  --profile-id gemma4-12b-it-q4-0 \
  --framework llama-cpp \
  --replay aa-mini-v1 \
  --context-tokens 8192 \
  --output-dir results/gemma4-12b-mini
```

`--replay aa-mini-v1` 是 6 轮的合成回放，只用来做安装自检，结果不可对比。默认回放 `agentperf-default-v1` 是 8 个录制的 agent 任务、168 个模型轮次，使用 `exact` 输出策略（每轮强制生成录制时的 token 数），这才是「可对比」的那次运行。

### 6. 需要 API key 时

把 key 放进环境变量，只传变量名：

```console
--api-key-env <ENV_VAR_NAME>
```

### 7. 让工具时间也变真实

默认会跳过轮次之间的工具耗时。要按录制的工具耗时 sleep：

```console
--tool-mode fixed_delay
```

要在 Docker 容器里真实执行录制的 shell 命令：

```console
--tool-mode live
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

### 8. 可选：实验性 Rust 客户端

在 Python 之外记录计时，两者产出的指标相同：

```console
uv sync --extra rust
uv run agentperf-local tui --client rust
```

已安装的工具用 `uv tool install 'agentperf-local[rust]'`；普通 `uv sync` 会移除该扩展。

### 9. 读结果

每次运行写出一个目录：

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

### 10. 可选：提交结果

默认不上传，只有你主动 `submit` 才发。`prepare-submission` 生成提交文件，`submit` 发送，`submission-status` 回读状态；对自己启动的服务需 `run --attached-server FILE`。

其他命令：`convert` 把一段 agent 录制转成 replay manifest；`python -m agentperf_local` 与主程序等价。

## 怎么判断变好了

可观察指标：

- `summary.json` 的 output tokens/s。
- 首 token 时间的 median 与 p95。
- 整轮时间的 median 与 p95。

比较时必须同机、同一 replay（默认用 `agentperf-default-v1`）、同一上下文条件（完整 65536）。低于 65536 token 的运行标 `reduced: true`，不可与完整上下文结果对比。`recorded` 策略（如 Ollama、Splash）的端到端延迟只是归一化估计，与 `exact` 运行不可直接比较。

最小试用方式：先对自己已经在跑的服务做一次 attached 回放，不动环境拿到基线：

```console
uv run agentperf-local run \
  --base-url <你的服务>/v1 \
  --model <服务报出的模型名> \
  --output-dir results/base
```

试多久：材料未给时长。以一次完整默认回放（8 个录制 agent 任务、168 个模型轮次）跑完并写出 `summary.json` 为一次基线；做出改动后用同机同 replay 再跑一次做对照。它只说明「服务变快/变慢了没有」，不能说明「AI 干得更好没有」；要判断效果，仍需另外评估输出质量。

## 常见坑

- 只测速度，不测输出质量。这是最大的限制，直接决定了它在效果验证里只能算半个证据。
- 低于 65536 token 的运行会被标 `reduced: true`，与完整上下文结果不可对比。
- Ollama 无法遵守 `ignore_eos`，工具会在运行前检测并警告，改用 `recorded` 策略，其端到端延迟只是归一化估计，与 `exact` 运行不可直接比较。
- Splash 的 recipe 只跑 `recorded` 策略且 KV cache 恒为 8bit，因此与 `exact` 运行不可比。
- 默认会跳过轮次之间的工具耗时；要真实工具时间需设 `--tool-mode fixed_delay` 或 `--tool-mode live`。
- live 工具模式有多条安全警告：录制的命令属于不可信输入，Docker 降低但不构成安全边界；能访问 Docker daemon 在多数主机上等同于 root；容器默认无网络但 manifest 可要求联网（可用 `--live-network none` 强制断网）；任务工作区以读写方式挂载；脚本会拉取/构建第三方镜像并从 GitHub 克隆 SWE-bench harness。
- 隐私：结果目录可能包含路径、模型标签和错误信息；启动运行会把录制的 prompt 发给模型服务，因此用远端 URL 就等于把 prompt 送出本机。
- 工具不安装推理框架，也不替你解决模型下载以外的环境问题。
- 崩掉的运行没有 `summary.json`，因为它最后写。
- 平台限制：Windows 的 managed 运行需 NVIDIA GPU + llama.cpp；vLLM/SGLang 仅 Linux；Splash 仅 Apple Silicon（M3 或更新，macOS 26.4 或更新）。

## 证据与来源

本手册做法来自本次调研报告《ArtificialAnalysis/aa-agentperf-local》，其中描述的命令、参数与边界均来自该工具的 README。

有具体依据的部分：

- 默认回放 `agentperf-default-v1` 的规模：8 个录制 agent 任务、168 个模型轮次。
- 上下文门槛：完整运行 65536 token、batch size 1；默认回放最大单轮约 58000 token；`aa-mini-v1` 需 8192。
- `exact` 输出策略会发送 `ignore_eos`（不属于 OpenAI API），运行前会检查服务端是否遵守；Ollama 无法遵守时改用 `recorded` 策略。
- 哪些运行不可对比由工具自己标记：低于 65536 token 标 `reduced: true`；Splash 的 recipe 只跑 `recorded` 策略且 KV cache 恒为 8bit。
- 结果文件结构，以及 `summary.json` 中 output tokens/s、首 token 时间、整轮时间的 median 与 p95 字段含义。
- 平台限制与 live 模式安全警告。

只是作者主张、没有数据支撑的部分：

- README 通篇没有给出任何实际 benchmark 数值、性能对比表或案例。
- 「测量规则」「证据边界」被指向 `docs/ARCHITECTURE.md`，但该文档不在给出的材料里。
- 仓库只有 66 stars，成熟度证据有限；作者 Artificial Analysis 在模型评测领域有一定知名度，但这是外部声誉而非本仓库的证据。

## 依据的调研

- [ArtificialAnalysis/aa-agentperf-local](../research/radar/2026-10-02/51-artificialanalysis-aa-agentperf-local.md)：值得一试，把 agentperf-local 作为本地/自建模型服务的「agent 负载压测」工具小范围试用：先用 aa-mini-v1 跑通环境，再用默认回放对候选模型或服务框架做一次可对比的吞吐与延迟基线，据此选型或做回归；它只测速度不测输出质量，所以只能作为任务匹配与效果验证的一环，不能替代对输出结果的评估。
