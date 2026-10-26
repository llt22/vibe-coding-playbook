# 换模型和改服务前，先量出可对比的速度、成本与工具调用可靠性

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：换模型、改推理框架或调 effort 时，如何用可对比的基线判断快慢、成本、工具调用可靠性，而不是凭感觉。
> 先试这一步：先对已经在跑的服务做一次 attached 回放，拿到 summary.json 基线；如果服务的是 Kimi/DeepSeek 且工具调用常出错，固定 schema 和 harness 先测 K2VV ToolCall 基线。
> 最近修订：2026-10-26

## 解决什么问题
换模型、换推理框架、改服务配置或调 effort 时，缺一条可对比的基线，只能凭感觉判断快慢、贵贱和工具调用是否可靠。本手册给五条互补路径：agentperf-local 回放多轮 agent 对话量吞吐与延迟；Claude Code `/usage` 量一次真实任务的 turn、cache 与 token 成本；Janas 把内存装不下的大 MoE 权重留在磁盘、按 token 从 NVMe 流式读专家，用 `--cache` 限内存并与同机 llama.cpp 对照；Strata 上把 Qwen 3.8 Flash Next 当编码代理时调 `--prompt-cache` 减少重复重读；vLLM 0.31 上用 `--tool-strict-level` 开启约束解码，让 Kimi K2.6 / DeepSeek V4 Flash 的工具调用符合 schema，并用 K2VV ToolCall 对比。前四条覆盖性能、成本与等待时间，第五条覆盖工具调用的结构正确性；五条都不等于输出质量或任务完成度，必须另外评估。Strata 和 vLLM 两条分别来自单条推文和单一厂商部署经验，不能直接当普适结论。

## 适用与不适用
适用：
- 多轮 agent 负载对比模型、服务框架和硬件：agentperf-local 默认回放 8 个录制 agent 任务、168 个模型轮次，每轮携带完整对话。
- 同机改动前后的性能回归：看 summary.json 的 output tokens/s、首 token 时间和整轮时间的 median 与 p95。
- 回答本机哪个框架能服务某个 profile：用 deployment-options。
- 内存装不下的大 MoE 在本机跑起来：Janas 把权重留在磁盘、按 token 流式读专家；原文例子是 48.4 GB 的 Qwen3-Next-80B-A3B 在 32 GB 内存笔记本上跑。
- 把本机模型当服务：janas-server 提供 OpenAI 兼容 HTTP API，janas-mcp 把模型当工具给 Claude Code、编辑器和其他 MCP 客户端。
- 按任务形状选 Claude 模型、从 Sonnet 5 迁到 Sonnet 5.5、重跑 effort sweep、给真实任务建成本基线。
- 编码代理 + 多轮长对话 + 重复前缀：在 Strata 上检查并调整 `--prompt-cache`（原文把 0 改成 6）。
- 用 vLLM 0.31 服务 Kimi K2.6 或 DeepSeek V4 Flash，且 agent harness 依赖严格 tool schema（原文示例是 OpenCode 的 webfetch 工具）：开启 `--tool-strict-level` 做约束解码，用 K2VV ToolCall 验证后再上线。
不适用：
- 判断 AI 干得更好没有：agentperf-local、成本 playbook、Janas、Strata 和 vLLM 的 schema 约束都不判任务对错或输出质量；vLLM 只保证工具调用结构合法，不保证该调哪个工具、参数合理或任务被解决。
- 自动持续运行或监控：材料未描述按时间、事件或状态自动持续运行的机制。
- 测单次短 prompt 聊天：agentperf-local 默认回放是 agent 形状的多轮负载。
- 为 dense 模型引入 Janas：原文数据里优势很小（Qwen3-4B 193 vs 164 tok/s，Gemma-4-12B-it 65 vs 46），MoE 才是它占便宜的形状。
- 没有 NVMe、或机器不能独占时用 Janas：它会吃满空闲内存并以 O_DIRECT 全速读盘，余量不足可能被推进 swap、桌面变慢甚至无响应。
- 把 Janas 当产品依赖：作者自称实验而不是产品，API 和命令行每周都在变，稳定性标为 “Not verified”。
- 把原文的价格、省钱比例和 effort 档位收益当结论照抄：金额与 token 数要么是 list price，要么是作者声明的示意值。
- 环境不支持 `--prompt-cache`、或工作流里没有重复前缀时，改 Strata 不值得；原文没有模型权重版本、Strata 版本、量化方式、上下文长度和完整命令行，94.8 秒到 4.1 秒是单条推文转述的个案。
- 把 vLLM 的严格工具调用默认开到所有模型：原文限定 Kimi K2.6 / DeepSeek V4 Flash，其他模型如 gpt-oss-20b、Qwen 3.6、GLM 5.1 有开启后出问题的报告；原文也没有完整启动命令和 `--tool-strict-level` 取值，不能当部署手册照抄。

## 前置条件
agentperf-local：uv；一个 OpenAI 兼容模型服务（工具不安装推理框架）；完整运行需 65536 token 上下文、batch size 1，默认最大单轮约 58000 token；exact 策略需服务端支持 ignore_eos（Ollama 会改用 recorded）；API key 只放环境变量；live 工具模式需 Docker 和预构建镜像；Windows managed 运行需 NVIDIA GPU 且只能用 llama.cpp，vLLM/SGLang 仅 Linux，Splash 仅 Apple Silicon（M3 或更新，macOS 26.4 或更新）。
Janas：x86-64；Linux（Ubuntu 22.04、Debian 12+）或 Windows 10 1903+/11；一台可独占的空闲机器；NVMe（作者机器 1 TB、约 5.7 GB/s，跑 80B 时专家缓存约 19 GB）；.jns 格式版本 2 模型，或用 janas-get 下载/自己转 GGUF；GPU 需 Vulkan 驱动，JANAS_GPU=0 可不用；janas-server / janas-mcp 必须读 docs/serving.md、docs/code-completion.md、docs/chat.md。
Claude：Anthropic API key 和 anthropic SDK；用 between_tools 前确认 SDK 已定义该字段；按成本 playbook 对比 Opus 5 与 Opus 5.5 需 Claude Code v2.1.280 或更高；在 Bedrock、Google Cloud Agent Platform 或 Claude apps gateway 上改 effort 会清掉缓存会话。
Strata：已能在 Strata 上运行 Qwen 3.8 Flash Next 作为编码代理并能改启动参数；原文硬件是 RTX 5070 + RTX 5060；原文没有完整安装/启动命令、版本、量化方式和上下文长度设置。
vLLM：目标是 Kimi K2.6 或 DeepSeek V4 Flash，推理引擎用 vLLM 0.31（原文基线是 vLLM 0.28 服务 Kimi K2.6 时 schema 准确率 92%）；已定义 tool schema JSON，每个 function 含 name、description、parameters（JSON Schema）和 required，parameters 说明类型、enum、默认值和必填项；有 agent harness（原文示例 OpenCode）和 K2VV ToolCall 基准（2000 个请求，衡量 trigger similarity 和 schema accuracy）或同规模请求集；所选模型支持 constrained decoding，解析器能把模型特定 token 解析成 JSON tool_calls；原文没有完整启动命令和 flag 取值，必须按 vLLM 0.31 文档确认；这是 per-model 开关，要能按模型关闭或回退，并验证所有服务模型版本。
agentperf-local 会在回放前检查自己的前提；Janas 和 vLLM 不做这类检查，安全阀和回退要自己先设。

## 操作步骤
### 第一部分：量本机服务的 agent 负载基线（agentperf-local）
**1. 安装并检查**
前提：有 uv。预期：工具可用，输出本机硬件事实和某个 profile 的部署选项。
```console
uv tool install agentperf-local
agentperf-local
uv run agentperf-local doctor
agentperf-local deployment-options --profile-id <id>
```
也可用 `uvx agentperf-local` 或 `pipx install agentperf-local`。源码检出：
```console
git clone https://github.com/ArtificialAnalysis/aa-agentperf-local.git
cd aa-agentperf-local
uv sync
uv run agentperf-local
```
**2. 选做法 A 或做法 B 跑一次回放**
做法 A：对已在跑的服务做 attached 回放，适合先摸底、做回归，不动现有环境。
```console
uv run agentperf-local run --base-url http://127.0.0.1:8080/v1 --model served-model --output-dir results/my-server
```
常见 base URL：llama.cpp `http://127.0.0.1:8080/v1`；LM Studio `http://127.0.0.1:1234/v1`；vLLM `http://127.0.0.1:8000/v1`；SGLang `http://127.0.0.1:30000/v1`。
做法 B：managed-run 一步跑完，工具会下载固定版本模型、校验 SHA-256、起服务、回放、停服务，适合按 recipes 固定组合做可对比运行。
```console
uv run agentperf-local managed-run --profile-id qwen38-27b-q4-k-m --framework llama-cpp --output-dir results/qwen38-27b
```
怎么选：已有服务、想先拿不改变环境的基线，选 A；要对比 recipes 里的固定组合、或没有现成服务，选 B。也可用 `uv run agentperf-local tui`。
**3. 设备装不下完整上下文时，先用 mini 回放自检**
前提：设备只有 8192 上下文。预期：跑通安装与流程，但低于 65536 token 的运行会被标成 reduced: true，与完整上下文结果不可对比。
```console
uv run agentperf-local managed-run --profile-id gemma4-12b-it-q4-0 --framework llama-cpp --replay aa-mini-v1 --context-tokens 8192 --output-dir results/gemma4-12b-mini
```
`aa-mini-v1` 是 6 轮合成回放，只做安装自检；默认回放 `agentperf-default-v1` 是 8 个录制 agent 任务、168 个模型轮次，使用 exact 输出策略，这才是可对比的那次运行。
**4. 需要 API key、真实工具时间或 Rust 客户端**
前提：服务需要 key，或你想把轮次间工具耗时算进去。预期：key 只通过环境变量传入；fixed_delay 按录制耗时 sleep；live 在 Docker 里执行录制的 shell 命令。
```console
--api-key-env <ENV_VAR_NAME>
--tool-mode fixed_delay
--tool-mode live
uv sync --extra rust
uv run agentperf-local tui --client rust
```
live 需要 Docker 和预构建镜像，构建脚本在源码检出里（Windows 用 Git Bash 或 WSL）：
```console
scripts/install-swebench-validation.sh
scripts/build-default-containers.sh
```
**5. 读结果与可选提交**
预期：每次运行写出 turns.jsonl、tasks.json、tools.json、failures.json、summary.json、measurement.json。summary.json 是头条数字：output tokens/s，以及首 token 时间和整轮时间的 median 与 p95；它最后写，所以崩掉的运行没有 summary。默认不上传，只有主动 submit 才发；`prepare-submission` 生成提交文件，`submit` 发送，`submission-status` 回读状态；对自己启动的服务需 `run --attached-server FILE`。`convert` 把一段 agent 录制转成 replay manifest。

### 第二部分：把内存装不下的大 MoE 模型在本机跑起来（Janas）
前提统一是：x86-64、机器空闲、有 NVMe。
**6. 安装、试跑并先上安全阀**
Linux：
```sh
curl -LO https://github.com/prabanta-dev/janas/releases/latest/download/janas-linux-x86_64.tar.gz
tar xf janas-linux-x86_64.tar.gz && cd janas
./janas-chat
```
Windows：下载 janas-windows-x86_64.zip，解压，在 janas 目录里打开终端运行 `janas-chat`。预期：列出它认识的模型，选一个后自动下载并校验。源码构建：
```sh
sudo apt install build-essential
sudo apt install libvulkan-dev glslang-tools vulkan-tools
./build.sh
./build.sh release test
```
产物进 bin/x86_64-linux/。不确定内存余量时先设安全阀：
```sh
./janas-chat --cache <GiB>
JANAS_GPU=0 ./janas-chat
```
预期：内存被硬限制住；不用 GPU 时不碰显卡。Ctrl-C 中止一次回复，Ctrl-D 退出聊天。原文无 GPU 数据点：Qwen3-4B 读 85 tok/s、写 27。
**7. 取模型**
已转成 .jns（格式版本 2）的模型在 Hugging Face 的 prabanta-dev 账号下；也可用 janas-get 下载，或把自己的 GGUF 转换（见 docs/models.md）。.jns 是模型的衍生作品、不是 Janas 的衍生作品，分发时保留原模型自己的许可证。
**8. 量本机数字，并和同机 llama.cpp 对照**
前提：机器空闲。预期：拿到本机读写 tok/s，并能和同机、同模型、同参数的 llama.cpp 比。
```sh
janas-bench --prompt 1024 --gen 16
janas-bench --rounds 3
llama-bench -p 1024 -n 16 -ngl 99 -t 12
```
如果对照 48.4 GB 的 80B 模型，llama.cpp 常规构建会爆内存，需要不带 repack 的构建（GGML_CPU_REPACK=OFF）再加 `--no-host 1 -lm mmap`。原文用 Vulkan 后端、build 2b18470（2026-09-18）。64 token 一轮有 ±10% 噪声，首轮更慢，两边都取三轮均值。
**9. 接进现有工作流，或当作 agentperf-local 的目标服务**
前提：确认要把它当服务用。janas-server 提供 OpenAI 兼容 HTTP API（含 /v1/completions 的 suffix 和 llama.cpp 的 /infill），可用于编辑器光标处代码补全（VSCodium / VS Code，配合 llama.vscode 或 Continue）；janas-mcp 把模型当工具给 Claude Code、编辑器和其他 MCP 客户端。具体配置必须读 docs/serving.md、docs/code-completion.md、docs/chat.md（原文说代码补全每次提案 1.5–2.2 秒）。起好 janas-server 后，也可以拿第一部分的做法 A 回放：
```console
uv run agentperf-local run --base-url http://127.0.0.1:<port>/v1 --model <janas-server 报出的模型名> --output-dir results/janas
```
这一步是把两条路径接起来的做法，两份材料都没有明说，属于可自行验证的组合；端口号和模型名以 janas-server 实际输出为准。

### 第三部分：量一次真实任务的成本（Claude Code）
**10. 先建基线：查一次会话的真实用量**
前提：在 Claude Code 会话里。预期：拿到这次会话的真实用量。
```text
/usage
```
`/cost` 效果相同。Session 区块给出 input、output、cache 三项；prompt-cache 行说明有多少输入来自缓存。这个美元数字是在本机按 list price 算的，订阅制下它是你干了多少活的参照，不是账单。
**11. 用同一个真实任务跑两遍做对比**
前提：Claude Code v2.1.280 或更高（`claude update`）。从 backlog 挑一个真实任务，不要用玩具例子；用 `/model` 在 Opus 5 与 Opus 5.5 之间切换，各跑一次；记录每次的 turn 数、output token 数和成本；做三到四个任务再下结论。预期：得到同一任务在新旧模型上各花多少的对照。只看单价会得出错误结论——一个模型可能多读一轮、多试一次。

### 第四部分：按任务形状选模型与 effort
**12. 先按任务类型选模型**
| 你的活儿 | 起步用 |
|---|---|
| 范围清晰的日常编码：修 bug、快速迭代功能、对照需求验证 | Sonnet 5.5 |
| 高频日常开发 | Sonnet 5.5 |
| 打磨文档、幻灯片、表格，需要设计感 | Sonnet 5.5 |
| 明确定义、反复运行的 agent 任务：调查、评审、起草 | Sonnet 5.5 |
| 需要谨慎判断的复杂工作，包括长周期 agentic 编码和知识工作 | Opus 5.5 |
| 最难、最需要智力的问题 | Opus 5.5 |
原文判据：任务有清晰规格和可验证结果时用 Sonnet 5.5；最难的长周期工作用 Opus。
**13. 跑通最小调用**
前提：已装 anthropic SDK 并有 API key。预期：拿到文本输出。
```python
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model='claude-sonnet-5-5',
    max_tokens=4096,
    messages=[{'role': 'user', 'content': 'Analyze the trade-offs between microservices and monolithic architectures'}],
    output_config={'effort': 'medium'},
)
for block in response.content:
    if block.type == 'text':
        print(block.text)
```
关键点：Sonnet 5.5 默认开启 thinking，响应可能以 thinking block 开头，必须按 `block.type` 遍历读取；直接取 `content[0].text` 会崩。
**14. 设 effort：默认 medium，按任务形状升降**
前提：会话内可随时改，改动对下一个请求生效。预期：用 `/effort status` 确认当前档位。
```text
/effort medium
/effort status
```
日常范围清晰的工作用 medium（Opus 5.5 默认就是 medium，比 Opus 5 默认 high 低一级）；机械工作（重命名、跨文件套用已知模式）用 low；medium 卡住再升 high；xhigh 和 max 只留给已经量出收益的难题或单次会话。不要沿用为 Opus 5 选的等级：同一等级下 Opus 5.5 每轮思考更多。在 API key 或 Claude 订阅下改 effort 不清缓存；在 Bedrock、Google Cloud Agent Platform 或 Claude apps gateway 上改 effort 会清掉缓存会话。Sonnet 5.5 侧：除非工作负载是 agentic 或对延迟敏感，从 high 起步；agentic 编码和多步工具调用里，明确定义的任务从 medium 起步，更难更长的用 high；聊天和其他延迟敏感场景从 medium 或 low 起步；只在 eval 证明有质量提升时才用 xhigh 或 max。
**15. 优先给模型自检手段，而不是升 effort；再做模型分层**
前提：项目里能跑测试、构建，或有能调端点的脚本。原文规则：升 effort 之前先问模型有没有办法检查自己的产出。低 effort 下可加这段系统提示：
```text
When you change code that can be run, built, or type-checked, run a real
check that exercises the change before reporting it done: the project's
tests, type-checker, or build, or the changed command itself. A syntax-only
check, or a check command that failed to start, does not count; if all
that is missing is the project's declared dependencies, install them with
its own package manager and lockfile (e.g. npm install, pip install
-r requirements.txt), never via sudo or the system package manager,
unless told not to. Only if no real check can run here, say which one you
did not run and why instead of reporting the change as done.
```
预期：模型在报告完成前会真的跑一次测试、类型检查或构建。模型分层：Opus 5.5 当日常主力；查找类工作下沉到 Sonnet 或 Haiku，在 subagent 定义里写 `model: haiku` 或 `model: sonnet`，或设 `CLAUDE_CODE_SUBAGENT_MODEL`；大量文件机械编辑留在 Opus 5.5 并把 effort 设 low；上升到更大模型（文中是 Fable 5.1，list price $10/M input、$50/M output）用于无人监督的长跑、代码库里没有先例的问题、需要协调多个 subagent 的大改动，xhigh 下同一个问题撞两次就切，解决后切回，切换要在自然断点，先 `/compact` 或新开会话并写简短计划，因为缓存属于旧模型。用 `/model` 切换。判断权留在主模型；`opusplan` 别名是另一种分法，原文说这与上面的分工相反，变成默认前先自己量。

### 第五部分：迁移与提示词卫生
**16. 从 Sonnet 5 迁移到 Sonnet 5.5**
前提：现有项目跑在 claude-sonnet-5 上。先改 model ID，再处理 5 个破坏性变更和一个响应结构变更。可让 Claude Code 代劳：
```text
/claude-api migrate this project to claude-sonnet-5-5
```
- 用 `between_tools` 取代关闭 thinking。Sonnet 5.5 上 `thinking` 为 `disabled` 会返回 400：
```python
thinking={'type': 'between_tools'}
output_config={'effort': 'high'}
```
`between_tools` 只在 low/medium/high 有效，xhigh 或 max 会 400；不接受 display、budget_tokens、block_binding；effort 不能在对话中途变。它带来只在工具调用之间思考，总响应时间持平或更快。无工具、需要几步推演的请求，改用 adaptive thinking。
- 强制的 tool_choice 换成 auto + strict。`tool_choice` 为 `any` 或 `tool` 会 400（token counting 端点也一样）：
```python
tool_choice={'type': 'auto'}
# strict 工具要求每个 object 都带 additionalProperties: false，并在提示词里说明什么时候用这个工具
```
- 对话保持 append-only：Sonnet 5.5 的 thinking block 与模型和会话绑定；Sonnet 5.5 能读 Sonnet 5 的 thinking block，所以从 Sonnet 5 切过来的会话能保留推理，但其他模型读不了 Sonnet 5.5 的 block。
- computer use 改走 toolset：Claude API 和 Google Cloud 上只支持 `computer_toolset_20260801`，声明 `computer_20251124` 会 400。去掉 `anthropic-beta: computer-use-2025-11-24` 头、去掉 SDK 的 betas 参数、改用标准 client 调 Messages API，并更新 agent loop 以处理 member tool_use blocks、批量动作和结果上的 toolset_name。同时去掉 `fine-grained-tool-streaming-2025-05-14`（与 toolset 条目同用会 400），需要的话在每个工具上设 `eager_input_streaming: true`。Amazon Bedrock 仍接受 `computer_20251124`。
- 检查 advisor 配对：Sonnet 5.5 执行方会拒绝 Opus 4.8、Opus 4.7、Sonnet 5 作为 advisor；接受 Opus 5.5、Opus 5 和 Sonnet 5.5 自身。被接受 advisor 的建议以加密的 advisor_redacted_result block 返回，代码读不到建议正文。
- 从 thinking block 读工具调用之间的文本：这些进度笔记长于一两句时以 progress-update thinking block 返回，默认 display 下为空。用 adaptive thinking 时把 `thinking.display` 设为 `updates`（beta，需 `thinking-display-updates-2026-08-18` 头）或 `summarized`，并在随后的 tool_use block 之前渲染每个非空 thinking block。用 `between_tools` 时文本直接回来，不需要 display 设置：
```python
thinking={'type': 'adaptive', 'display': 'summarized'}
```
原文理由：要求模型把推理写进正文会触发 reasoning_extraction 拒答。面向用户的进度笔记用 `display: updates`（beta）；想在固定位置出笔记，在系统提示里写清楚。预期：迁移后按下一步重跑 eval，400 类报错消失只是前提，结论要靠 eval。
**17. 删掉为 Sonnet 5 写的 workaround，再重跑 eval**
原文点名：refusal steering、tool-call 重试垫片、do not be lazy 这类补丁都该删掉，删完先重跑 eval，再调别的。
**18. 审计迁移过来的提示词**
前提：你从旧模型迁到 Opus 5.5，或在 Claude Platform 上构建应用。预期：它检查 Claude Code 的 skills、CLAUDE.md 里的提示词反模式，也检查你构建的应用代码。
```text
/claude-api prompt-audit
```
原文案例：从 Opus 4.8 迁到 Opus 5.5，内部 44 张工单的客服基准上，低 effort 迁移把成本降了约 18%，跑 prompt-audit 再降 9%，合计比 Opus 4.8 起点低约 25%。被删掉的是让模型写更多、重复调工具的仪式性指令：强制六步流程、scratchpad 规则、verify-twice 规则、互相矛盾的指令。

### 第六部分：缓存、上下文与每轮重发的东西
**19. 管好缓存与会话形状**
前提：缓存只复用从头开始匹配的前缀。预期：把易变配置都在会话开始时设好。稳定会话每轮往对话末尾追加，命中率高；改工具定义会清掉整个缓存，改 system prompt 几乎清掉全部。预期会写缓存的时机：暂停超过缓存生命周期；在 Bedrock / Agent Platform / gateway 上改 effort；会话里第一次开 fast mode；连接或断开 MCP server；切换模型；对话被压缩。Claude 订阅缓存 1 小时；API key 或云服务商默认 5 分钟，订阅一旦动用 usage credits 也会降到 5 分钟；每次命中免费重置生命周期。120K 上下文下 5 分钟写缓存约 $0.60、读约 $0.02，一次写等于 25 次读。长会话每轮更贵：20K 上下文时一轮 cache read 约 $0.004，150K 时约 $0.03。Sonnet 5.5 侧：最小可缓存 prompt 从 1,024 降到 512 token，cache read 是 input 价格的十分之一；改顶层 effort 会让缓存失效，想某一轮用不同档位就用 per-message effort（beta）。
**20. 上下文清理**
```text
/clear
/compact keep the failing test names and the schema change
/rewind
/autocompact
```
`/clear` 清空对话、不花钱，换到不相关工作时用。`/compact` 保留连续性、花一次请求，可以在指令里说要保留什么；150K 时压缩约 $0.25，之后每轮省约 $0.025 的读，约十轮回本；快结束时压缩是亏的；它是有损的，要在自然断点做。缓存冷的时候别压缩：休息超过缓存生命周期后压缩，会把整个对话重读一遍再写回缓存。想丢掉走错的路，用 `/rewind` 回到更早的轮次；缓存热时它回到的正是已缓存的前缀。`/autocompact` 加一个 token 数可以改自动压缩的触发阈值。
**21. fast mode、每轮重发的东西与拒答**
fast mode 让 Opus 5.5 快最多 2.5 倍、价格翻倍（$8/M input、$40/M output）；订阅下走 usage credits 而非计划额度；开启后的第一次请求会为整个对话付 fast-mode input 价且不走缓存，所以要在会话开始开。CLAUDE.md 每个会话开始载入，每一行都会在每轮重发；成本文档建议控制在 200 行以内。MCP 工具定义是延迟加载的，开始时只载入工具名和 server 指令；用 `/mcp` 看连了哪些 server，关掉不用的。Sonnet 5.5 被拒请求返回 HTTP 200 + `stop_reason: refusal`，`stop_details` 给出五类之一：cyber、bio、frontier_llm、reasoning_extraction、general_harms。服务端回退 `fallbacks: default`（beta，Claude API）只对 cyber 和 frontier_llm 重试到 Sonnet 5，其余三类不重试；也可以自己写回退逻辑（原文在此处截断，未给出完整示例）。

### 第七部分：减少编码代理重复重读对话（Strata 的 --prompt-cache）
**22. 确认当前 --prompt-cache，改成 6，用同一段对话重跑**
前提：已经在 Strata 上能运行 Qwen 3.8 Flash Next 作为编码代理，并且能改启动参数。预期：找到当前启动命令，看到 `--prompt-cache` 的值。如果当前值为 0，且你希望优先验证长对话回合的等待时间，改成原文给出的取值：
```text
--prompt-cache 6
```
而不是：
```text
--prompt-cache 0
```
固定提示和对话历史，优先选约 14K 令牌的回合，记录总耗时和等待阶段。原文个案：同一 14K 令牌回合从 94.8 秒降到 6.9 秒，再到 4.1 秒（原文未说明中间步骤）。如果参数在你的 Strata 版本中不生效或性能反而变差，恢复原值。原文没有给出模型权重版本、Strata 版本、量化方式、上下文长度设置和完整命令行，不能直接当作完整部署手册。

### 第八部分：让 vLLM 的工具调用符合 schema（Kimi / DeepSeek）
**23. 固定一个窄范围部署、工具 schema 和 harness，先测基线**
前提：目标是 Kimi K2.6 或 DeepSeek V4 Flash，推理引擎使用 vLLM 0.31；已有 tool schema JSON 和 agent harness（原文示例 OpenCode）。预期：有可复现的请求集合和工具声明。schema 中每个 function 包含 name、description、parameters（JSON Schema）和 required；parameters 说明参数类型、enum、默认值和必填项。原文示例是 OpenCode 的 webfetch 工具，参数含 url、format 和 timeout。只有调用符合该 schema，harness 才能执行。先测基线，不要先开严格模式：用 K2VV ToolCall 基准（2000 个请求）或同规模代表性请求，记录 schema accuracy、trigger similarity、请求失败率、重试次数和 p95 延迟。原文基线：vLLM 0.28 服务 Kimi K2.6 时 schema 准确率 92%，即约 2/25 次工具调用失败；切换到 vLLM 上游 constrained decoding 后曾因默认关闭降到 91%；Ubicloud 开启 constrained decoding 并验证后达到 100%。
**24. 确认模型工具调用语法和解析器一致**
前提：开启严格模式前。预期：解析器能把模型特定 token 解析成 JSON tool_calls。Kimi K2.6 的工具调用语法原文为：
```text
# Kimi K2.6 tool call syntax:
# <|tool_call_begin|>{function.name}:{index}
# <|tool_call_argument_begin|>{arguments}
# <|tool_call_end|>
```
vLLM 使用 XGrammar 的 structural tags，在生成过程中按开始工具调用 → 工具名 → 调用序号 → 开始参数 → schema 约束 JSON → 结束工具调用的路径约束 token。解析器需要能把模型特定 token 解析成 JSON tool_calls。
**25. 在 vLLM 0.31 启动配置里加入严格工具调用开关**
前提：所选模型支持 constrained decoding，且推理服务能正确把模型工具调用格式翻译为语法约束。预期：服务端开启 tool-call strictness / constrained decoding。
```text
--tool-strict-level
```
原文没有给出这个 flag 的具体取值或完整命令行，不能凭空补全；实际使用前需按 vLLM 0.31 文档确认语法和取值。
**26. 用同一批请求重跑，和基线对比**
前提：不改 harness、schema 和请求集。预期：schema accuracy 明显提升（原文目标是 100%）；trigger similarity 不应变差；请求失败率和重试次数不应增加；p95 延迟不应出现不可接受回退。原文称 constrained decoding 的运行时开销可忽略，但没有给出量化延迟数据，试用时仍应监测延迟。验证所有服务的模型版本。
**27. 出问题按三类排查并回退，上线后继续监控**
前提：开启后出现请求失败或准确率下降。预期：按模型关闭或回退，不默认全开。三类已知问题：一般模型问题，部分模型的无约束输出与工具 schema 或工具调用格式差异过大；grammar translation bugs，vLLM 把工具 schema 或工具调用格式翻译成模型语法时出错；feature interaction bugs，例如 constrained decoding 与 speculative decoding 交互导致请求失败。其他模型如 gpt-oss-20b、Qwen 3.6、GLM 5.1 有开启后出问题的报告。验证通过后再部署，并监控 malformed tool calls、请求失败、重试次数和上下文污染情况。

## 怎么判断变好了
本机服务速度：看 summary.json 的 output tokens/s、首 token 时间的 median 与 p95、整轮时间的 median 与 p95。比较时必须同机、同一 replay（默认 agentperf-default-v1）、同一上下文条件（完整 65536）；低于 65536 token 标 reduced: true，不可对比；recorded 策略（如 Ollama、Splash）的端到端延迟只是归一化估计，与 exact 不可直接比较。最小试用：对已在跑的服务做一次 attached 回放，不动环境拿基线：
```console
uv run agentperf-local run --base-url <你的服务>/v1 --model <服务报出的模型名> --output-dir results/base
```
试多久：以一次完整默认回放（8 个录制 agent 任务、168 个模型轮次）跑完并写出 summary.json 为一次基线；做出改动后用同机同 replay 再跑一次做对照。
Janas：能不能跑起来；读写 tok/s 是否达到可用（原文 80B 上 24–37 tok/s），与同机、同模型、同参数 llama.cpp 相比是否明显更快；桌面是否被推进 swap 或变卡、是否出现驱动复位，加上 `--cache` 上限后是否稳定；同一个 prompt 下输出是否可用。采纳门槛（原文口径）：能跑起本来跑不动的模型和明显快于现有本地方案两者至少满足一个，且机器不失控，才写进日常工作流。最小试用：在空闲机器上先跑 `JANAS_GPU=0 ./janas-chat` 建无 GPU 基线，选一个和内存相当或略超的 MoE（先用 30B-A3B 级别，再试 48.4 GB 的 80B），问一个英文问题（原文用 explain how bread is made at home），再跑 `janas-bench --prompt 1024 --gen 16 --rounds 3` 并和同机同模型同参数 llama.cpp 对照；以三轮均值跑完为准，留出首轮更慢、±10% 噪声的余量。
一次真实任务的成本：打开 `/usage` 按三个比值读：cache 占比，长会话应该高，低就查长暂停、换模型、中途连 MCP、云环境改 effort；output 对 input 的比例，小改动却大量 output 说明 effort 过高或在重试；总 input 对会话大小的倍数，倍数大说明 turn 多，去读对话找重复循环。方法上：同一个真实任务在两个模型上各跑一次，做三到四个任务再下结论；团队层面用 Claude Code Analytics API 看每用户估算成本，用 Usage and Cost API 按模型和缓存/非缓存 token 拆分开支。原文参照基线：企业部署平均约 $13/开发者/活跃日，90% 用户在 $30/活跃日以下（作者数据，不是你的数字）。
Strata：同一回合总耗时是否明显下降，重点看从 94.8 秒量级降到秒级；等待时间中重读对话/重复前缀的占比是否下降；tok/s 或首 token 延迟是否改善；输出答案正确性和编码任务结果是否不变，若质量下降则不能采用；显存占用和稳定性是否可接受。最小试用：在已有可运行的 Strata 编码代理上，选一个多轮、历史较长、接近 14K 令牌的任务，固定提示和对话历史，分别用 `--prompt-cache 0` 和 `--prompt-cache 6` 跑同一回合；原文未给时长，以同一回合对比跑完为准。
vLLM：schema accuracy 原文 92% 到 100%，至少应明显提升且接近 100%；trigger similarity 不应变差；请求失败率和重试次数不应增加；p95 延迟不应出现不可接受回退；生产日志里 malformed tool calls、解析失败、重试和上下文污染是否下降。所有服务的模型版本都要验证。最小试用：选一个 Kimi K2.6 或 DeepSeek V4 Flash 的 vLLM 0.31 部署，固定 harness 和 tool schema，先用 K2VV ToolCall 或同规模代表性请求测基线，记录指标；确认 `--tool-strict-level` 的正确用法后启用，重跑同一批请求。试多久：以跑完一轮 K2VV ToolCall（2000 个请求）基线和同批重跑为准；原文未给时长。若出现 grammar translation 或 speculative decoding 交互问题，针对该模型关闭严格模式并回退。
这些路径只说明服务变快/变慢了没有、任务变便宜了没有、模型跑得起来没有、长对话回合是否不再反复重读、工具调用结构是否合法；不能说明 AI 干得更好没有。要判断效果，仍需另外评估输出质量。

## 常见坑
- 只测速度，不测输出质量。这是 agentperf-local 最大的限制，也适用于 Janas（模型相同，差异只在速度），直接决定了它们只能算半个证据；成本 playbook 同样不判对错；vLLM 的 schema accuracy 也不判任务对错。
- 低于 65536 token 的运行会被标 reduced: true，与完整上下文结果不可对比。
- Ollama 无法遵守 ignore_eos，工具会在运行前检测并警告，改用 recorded 策略，其端到端延迟只是归一化估计，与 exact 运行不可直接比较。
- Splash 的 recipe 只跑 recorded 策略且 KV cache 恒为 8bit，因此与 exact 运行不可比。
- 默认会跳过轮次之间的工具耗时；要真实工具时间需设 `--tool-mode fixed_delay` 或 `--tool-mode live`。
- live 工具模式有多条安全警告：录制的命令属于不可信输入，Docker 降低但不构成安全边界；能访问 Docker daemon 在多数主机上等同于 root；容器默认无网络但 manifest 可要求联网（可用 `--live-network none` 强制断网）；任务工作区以读写方式挂载；脚本会拉取/构建第三方镜像并从 GitHub 克隆 SWE-bench harness。
- 隐私：结果目录可能包含路径、模型标签和错误信息；启动运行会把录制的 prompt 发给模型服务，因此用远端 URL 就等于把 prompt 送出本机。成本侧同理，prompt 会发给模型服务。
- 工具不安装推理框架，也不替你解决模型下载以外的环境问题；Janas 自带引擎，但它只解决装不下这一类问题，不是通用服务框架替代品。
- 崩掉的运行没有 summary.json，因为它最后写。
- 平台限制：Windows 的 managed 运行需 NVIDIA GPU + llama.cpp；vLLM/SGLang 仅 Linux；Splash 仅 Apple Silicon（M3 或更新，macOS 26.4 或更新）。
- Janas 会刻意吃满空闲内存并以 O_DIRECT 全速读盘：余量不足的机器可能被推进 swap、桌面变慢甚至无响应，用 GPU 还曾导致一次驱动复位。先在空闲机器上跑，先设 `--cache` 上限，必要时 `JANAS_GPU=0`。
- Janas 的对照测法并不完全相同：llama-bench 写之前没有 prompt，janas-bench 是在 1024 token 之后；两边都是单机数据，64 token 一轮有 ±10% 噪声、首轮更慢。别把单次运行的差值当结论。
- 把 Janas 当产品依赖：作者自称实验品，API 与命令行每周都在变，稳定性标为 “Not verified”，且全部开发与测量只在一台机器上完成。
- janas-server / janas-mcp 的配置 README 没有可复制片段，不看 docs/serving.md、docs/code-completion.md 就接不进工作流。
- .jns 是模型的衍生作品、不是 Janas 的衍生作品，发布或分发时要保留原模型自己的许可证。
- 迁移后不重跑 eval，也不重跑 effort sweep。旧档位不可迁移，同一等级下 Opus 5.5 每轮思考更多。
- 直接取 content[0].text 会崩：Sonnet 5.5 默认开 thinking，响应可能以 thinking block 开头，必须按 block.type 遍历。
- thinking 为 disabled 在 Sonnet 5.5 上返回 400；tool_choice 为 any 或 tool 也会 400（token counting 端点一样）。
- between_tools 只在 low/medium/high 有效，xhigh 或 max 会 400；不接受 display、budget_tokens、block_binding；effort 不能在对话中途变。
- 改顶层 effort 会让缓存失效；在 Bedrock / Agent Platform / gateway 上改 effort 会清掉缓存会话。这些都在会话开始时设好。
- 缓存冷的时候别 /compact：休息超过缓存生命周期后压缩，会把整个对话重读一遍再写回缓存。
- 改工具定义会清掉整个缓存，改 system prompt 几乎清掉全部。
- fast mode 跑到一半开，第一次请求要为整个对话付 fast-mode input 价且不走缓存。
- 为旧模型写的 workaround（refusal steering、tool-call 重试垫片、do not be lazy 补丁）不删掉，会把新模型的收益吃掉；原文案例里 prompt-audit 再省的那 9% 就来自删这类仪式性指令。
- 把原文的示意金额、降价比例、effort 档位收益当结论照抄。作者明说大量 token 数是示意值、省钱比例是团队估计，必须自己量。
- Strata 的 --prompt-cache 改动来自单条推文：未给出完整命令、版本、模型标识、并发设置、显存占用、输出质量对比和可复现实验脚本。94.8 秒到 4.1 秒是作者转述的个案，不能保证在其他环境复现。环境不支持该参数或没有重复前缀时，不值得改；若质量下降，则不能采用。
- 把 vLLM 的 constrained decoding 默认开到所有模型：原文强调这是 per-model，其他模型有回归报告；只在 Kimi/DeepSeek 小范围试用。
- 没有完整 vLLM 启动命令和 `--tool-strict-level` 取值就照抄：原文没给，必须按 vLLM 0.31 文档确认。
- 只测 schema accuracy 不看 trigger similarity、失败率、重试和延迟：可能把工具调用改成合法但触发变差或延迟回退。
- constrained decoding 与 speculative decoding 交互可能导致请求失败；grammar translation bug 会让 schema/格式翻译错；出现就对该模型关闭或回退。
- 验证时只测一个服务模型版本：原文要求验证所有服务的模型版本。
- 工具调用 schema 错误会污染 agent 多轮上下文；修复后仍要监控 malformed tool calls、解析失败、重试和上下文污染。
- 运行时开销原文称可忽略但无量化延迟数据，不要当结论；vLLM 这条是单一厂商部署经验，无独立复现或延迟数据。

## 证据与来源
本手册做法来自本次调研报告《ArtificialAnalysis/aa-agentperf-local》《Building with Claude Sonnet 5.5》《What a task costs on Opus 5.5》《Janas: Run LLMs larger than RAM by streaming experts from SSD》《@VRAMCalculator: 在 Strata 上运行 Qwen 3.8 Flash Next 作为编码代理？在你追逐 tok/s 之前，先检查提示缓存。》以及本次新增的《Fixing Tool-Call Accuracy in vLLM》。第一篇描述的命令、参数与边界来自该工具 README；Claude 两篇来自 claude.dev，作者 Addy Osmani（分别发布于 2026-09-28 与 2026-09-25）；Janas 一篇描述的命令、开关与基准表来自该项目 README；Strata 一篇是单条推文转述，来源是 @murasametech 的发现；vLLM 一篇来自 Ubicloud 的部署经验。
有具体依据的部分：
- agentperf-local 的默认回放 agentperf-default-v1 规模：8 个录制 agent 任务、168 个模型轮次；aa-mini-v1 是 6 轮合成回放。
- 上下文门槛：完整运行 65536 token、batch size 1；默认回放最大单轮约 58000 token；aa-mini-v1 需 8192。
- exact 输出策略会发送 ignore_eos（不属于 OpenAI API），运行前会检查服务端是否遵守；Ollama 无法遵守时改用 recorded 策略。
- 哪些运行不可对比由工具自己标记：低于 65536 token 标 reduced: true；Splash 的 recipe 只跑 recorded 策略且 KV cache 恒为 8bit。
- 结果文件结构，以及 summary.json 中 output tokens/s、首 token 时间、整轮时间的 median 与 p95 字段含义。
- 平台限制与 live 模式安全警告。
- Janas 的安装命令、--cache 与 JANAS_GPU=0 开关、Ctrl-C / Ctrl-D 行为、.jns 格式版本 2 与许可证说明、平台与硬件前提（x86-64；Ubuntu 22.04、Debian 12+ 或 Windows 10 1903+/11；Vulkan 驱动可选）。
- Janas 的两张基准表：同机同文件对比 llama.cpp（build 2b18470，2026-09-18，Vulkan 后端），测量日期 2026-10-09~11；方法为 llama-bench -p 1024 -n 16 -ngl 99 -t 12 对 janas-bench --prompt 1024 --gen 16，多数模型两边各三轮取均值。数字：80B（Qwen3-Next-80B-A3B，48.4 GB）Janas-LLM 不加任何选项、专家缓存约 19 GB，读写 62 / 24 tok/s；llama.cpp 需 GGML_CPU_REPACK=OFF 的构建加 --no-host 1 -lm mmap，读写 16 / 2.8 tok/s。dense：Qwen3-4B 193 vs 164，Gemma-4-12B-it 65 vs 46。Windows 11 上 Qwen3-4B 写 25.6 / 读 346。带自带回溯块的模型在聊天里更快（80B 从 24 提到 37 tok/s）。无 GPU 时 Qwen3-4B 读 85 / 写 27。64 token 的一轮有 ±10% 噪声，首轮更慢。
- Sonnet 5.5 的任务-模型对照表、模型 ID、between_tools / strict tool_choice / computer use toolset / advisor 配对这几条破坏性变更，以及最小调用示例、低 effort 的真实检查系统提示词、拒答五分类与 fallbacks: default 的重试范围。
- 成本侧的 list price：Opus 5.5 $4/M input、$20/M output、$0.20/M cache read；Fable 5.1 $10/M input、$50/M output；fast mode $8/M input、$40/M output；cache write 为 input 价 1.25 倍（5 分钟）/ 2 倍（1 小时）；Opus 5.5 的 cache read 是 input 价的二十分之一（Opus 5 是十分之一）。
- 成本侧命令与规则：/usage、/cost、/effort、/model、/clear、/compact、/rewind、/autocompact、/mcp、/claude-api prompt-audit、claude update、CLAUDE_CODE_SUBAGENT_MODEL、subagent 定义里的 model: 字段、CLAUDE.md 控制在 200 行以内、Opus 5.5 需 Claude Code v2.1.280 或更高。
- Strata 的 --prompt-cache 从 0 改为 6 后，同一 14K 令牌回合从 94.8 秒降到 6.9 秒，再到 4.1 秒；原文说 94% 等待时间用于重读对话；硬件配置为 RTX 5070 + RTX 5060。
- vLLM 0.31 的 server-side flag --tool-strict-level 开启 constrained decoding，借助 XGrammar 在生成时屏蔽不符合 tool schema 的 token；vLLM 0.28 服务 Kimi K2.6 时 schema 准确率 92%，上游 constrained decoding 默认关闭时曾降到 91%，Ubicloud 开启并验证后达到 100%；K2VV ToolCall 基准包含 2000 个请求，衡量 trigger similarity 和 schema accuracy；Kimi K2.6 工具调用语法和 XGrammar structural tags 的约束路径；适用模型是 Kimi K2.6 / DeepSeek V4 Flash，其他模型 gpt-oss-20b、Qwen 3.6、GLM 5.1 有开启后问题报告；三类问题为 general model issues、grammar translation bugs、feature interaction bugs（例如 constrained decoding 与 speculative decoding 交互）。原文没有给出完整启动命令和 flag 取值，且称运行时开销可忽略但没有量化延迟数据。
只是作者主张、没有数据支撑的部分：
- agentperf-local 的 README 通篇没有给出任何实际 benchmark 数值、性能对比表或案例；其测量规则、证据边界被指向 docs/ARCHITECTURE.md，但该文档不在给出的材料里；仓库只有 66 stars，成熟度证据有限。
- Janas 的全部开发与测量只在一台机器上完成（Debian 13、Intel Core Ultra 9 185H、集成 Arc GPU、32 GB DDR5、1 TB NVMe 约 5.7 GB/s）；作者自称这是实验而不是产品，API 和命令行每周都在变、稳定性 “Not verified”；另一台机器会得到另一组数字；两套工具的测量方式并不完全相同，且都是单机数据；用 GPU 曾导致一次驱动复位。因此第 9 步里把 janas-server 交给 agentperf-local 回放只是把两条材料接起来的组合，两边都没有明说，需要你自行验证。
- 成本 playbook 里大量 token 数是作者自己声明的示意值；Opus 5.5 比 Opus 5 便宜 40% 是作者团队的估计，建立在默认设置下每任务用更少 token 这个假设上，不是 token 单价降 40%；Opus 5.5 每任务用更多还是更少 token，作者明说要自己量。
- 44 张工单客服基准的 -18% / -9% / 合计 -25%、示意会话省下的 $242/月、企业平均 $13/开发者/活跃日、90% 低于 $30，这些数字都出自原文，属于作者方数据。
- Sonnet 5.5 篇的 effort 档位被重新校准、删掉 workaround 再重跑 eval 是作者建议，没有给出对照数据。
- Strata 那条是单条推文，未给出完整命令、版本、模型标识、并发设置、显存占用、输出质量对比和可复现实验脚本；94.8 秒到 4.1 秒是转述个案，不能保证在其他环境复现。
- vLLM 这条来自 Ubicloud 单一部署经验，没有独立复现或延迟数据；上下文污染、模型性能下降和重试成本增加属于作者主张，未给出量化；flag 取值和完整命令缺失；其他模型回归是报告而非本手册验证。

## 依据的调研

- [ArtificialAnalysis/aa-agentperf-local](../research/radar/2026-10-02/51-artificialanalysis-aa-agentperf-local.md)：值得一试，把 agentperf-local 作为本地/自建模型服务的「agent 负载压测」工具小范围试用：先用 aa-mini-v1 跑通环境，再用默认回放对候选模型或服务框架做一次可对比的吞吐与延迟基线，据此选型或做回归；它只测速度不测输出质量，所以只能作为任务匹配与效果验证的一环，不能替代对输出结果的评估。
- [Building with Claude Sonnet 5.5](../research/radar/2026-10-02/390-building-with-claude-sonnet-5-5.md)：值得一试，把这篇当作 Sonnet 5.5 的选型与迁移操作手册来小范围试用：先按任务类型选模型、再按原文步骤迁移和调 effort，因为原文给了可直接照做的代码、参数和提示词；但所有档位和收益都需要用自己的 eval 重新验证，不能直接照抄当结论。
- [What a task costs on Opus 5.5](../research/radar/2026-10-02/392-what-a-task-costs-on-opus-5-5.md)：值得一试，按文章给的方法（用 /usage 建基线 → 默认 medium effort → 优先给模型自检手段 → 模型分层 → 管好缓存与压缩）在自己的真实任务上小范围试验，并用同一任务跑两遍对比每任务成本与 turn 数；因为其中的命令和判断规则可以直接照做，但文章反复声明所有金额与 token 数都是示意值，只有你自己 /usage 出来的数才算。
- [Janas: Run LLMs larger than RAM by streaming experts from SSD](../research/radar/2026-10-13/2847-janas-run-llms-larger-than-ram-by-streaming-expert.md)：值得一试，在一台空闲的 x86-64 机器上用官方预编译包跑 `janas-chat`，先用 `--cache` 限制内存、必要时 `JANAS_GPU=0`，再用 `janas-bench` 记录本机数字并和同机 llama.cpp 对比后再决定是否纳入工作流；理由是它给出了可复制的安装命令、安全开关和测速工具，并把“内存装不下的大 MoE 模型”变成能跑（48.4 GB 模型在 32 GB 笔记本上读写 62/24 tok/s，对照 llama.cpp 的 16/2.8），但项目自称实验品、只在一台机器上验证过，所以只能小范围试。
- [@VRAMCalculator: 在 Strata 上运行 Qwen 3.8 Flash Next 作为编码代理？在你追逐 tok/s 之前，先检查提示缓存。](../research/radar/2026-10-15/3533-strata-qwen-3-8-flash-next-tok-s.md)：值得一试，建议小范围试：在 Strata 编码代理中把 --prompt-cache 从 0 改为 6，优先验证长对话回合的等待时间是否大幅下降；原文给出了这一具体参数和 14K 令牌耗时对比，但缺少完整命令和版本条件，不能直接全量采用。
- [Fixing Tool-Call Accuracy in vLLM](../research/radar/2026-10-26/7251-fixing-tool-call-accuracy-in-vllm.md)：值得一试，建议在 Kimi/DeepSeek 的 vLLM 0.31 服务上小范围试用：启用 `--tool-strict-level` 开启约束解码，并用 K2VV ToolCall 基准对比 schema accuracy 后再上线；原文给出了 92% 到 100% 的案例和验证流程，但没有完整启动命令或参数值，且对其他模型可能引入回归。
