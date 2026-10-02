# 换模型或调配置前，先用同一个真实任务量出一条基线

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：换模型、换推理框架或调 effort 时，缺少一条同任务可对比的基线和明确的读法，只能凭感觉判断服务快慢与任务贵贱。
> 先试这一步：先拿一条不动环境的基线：对自己已经在跑的服务做一次 agentperf-local attached 回放拿到 summary.json，或在 Claude Code 里挑一个真实任务跑完敲一次 /usage 记下 turn 数与 token。
> 最近修订：2026-10-02

## 解决什么问题

换模型、换推理框架、改服务配置或调 effort 时，缺一条可对比的基线，只能凭感觉判断快慢和贵贱。本手册给两条互补的测量路径：agentperf-local 把录制好的 agent 对话逐轮回放给一个 OpenAI 兼容的模型服务，每个请求都带上截至该轮的完整对话（和真实 agent 一样），最后报告吞吐与延迟；Claude Code 的 `/usage` 给出一次真实任务的 turn 数、cache 占比与 token 成本。两条路径都只覆盖验证链条里的性能与成本那一环，输出质量必须另外评估。

## 适用与不适用

适用：

- 为「多轮 agent 负载」做任务匹配：用真实 agent 负载形状（每轮携带完整对话、默认 168 个模型轮次）对比不同模型、不同服务框架（llama.cpp / vLLM / SGLang / Splash / Ollama）和不同硬件上的吞吐与延迟。
- 同一台机器上改动前后的性能回归：summary.json 给出 output tokens/s 和首 token 时间、整轮时间的 median 与 p95。
- 回答「本机哪个框架能服务某个 profile」：用 deployment-options。
- 按任务类型选 Claude 模型：规格清晰、结果可验证的日常编码（修 bug、快速迭代功能、对照需求验证）、高频日常开发、文档/幻灯片/表格打磨、明确定义且反复运行的 agent 任务（调查、评审、起草）用 Sonnet 5.5；需要谨慎判断的复杂工作（含长周期 agentic 编码和知识工作）以及最难的问题用 Opus 5.5。
- 从 Sonnet 5 迁到 Sonnet 5.5：有 5 个破坏性变更和一个响应结构变更，原文给了前后对比代码。
- 调 effort / thinking：档位被重新校准，为旧模型选的等级不可迁移，需要重跑 sweep。
- 给一次真实任务建成本基线，用来判断该不该升 effort、该不该切模型、该不该压缩上下文。

不适用：

- 判断「AI 干得更好没有」：agentperf-local 不测输出质量；成本 playbook 也只算钱和 token，不判对错。两者都不能替代对输出结果的评估。
- 判断任务完成度、正确性、输出质量。
- 自动持续运行或监控：材料未描述任何按时间、事件或状态自动持续运行的机制，两边都由命令或人触发。
- 测单次短 prompt 聊天：agentperf-local 默认回放是 agent 形状的多轮负载。
- 把原文的价格、省钱比例和 effort 档位收益当结论照抄：所有金额与 token 数要么是 list price，要么是作者声明的示意值。

## 前置条件

本机服务速度（agentperf-local）：

- uv（没有 Python 3.12 时它会自己拉取）。Docker 和 Rust 可选。
- 一个 OpenAI 兼容 API 的模型服务（llama.cpp、LM Studio、vLLM、SGLang、Ollama），或者让工具代为启动的框架。工具本身不安装推理框架。
- 完整运行需要 65536 token 上下文、batch size 1。默认回放最大的单轮约需 58000 token，因此只能在完整 65536 下跑。
- 服务端需要支持非标准参数 ignore_eos（exact 策略需要）。Ollama 无法遵守，工具会在运行前检测并警告，改用 recorded 策略。
- 可选 API key：放进环境变量，只传变量名，没有接受字面 key 的参数。
- live 工具模式还需要 Docker 和预构建镜像。
- 平台限制：macOS、Linux、Windows 均支持；但 Windows 上的 managed 运行需要 NVIDIA GPU 且只能用 llama.cpp，vLLM 和 SGLang 只在 Linux 上跑；Splash 仅 Apple Silicon（M3 或更新，macOS 26.4 或更新）。

模型选型、迁移与成本（Claude）：

- Anthropic API key，装好 anthropic SDK；要用 `between_tools`，先确认 SDK 版本已定义该字段，否则先升级。
- 按成本 playbook 在 Opus 5 与 Opus 5.5 之间做对比，需要 Claude Code v2.1.280 或更高。
- 在 Amazon Bedrock、Google Cloud 的 Agent Platform 或 Claude apps gateway 上改 effort 会清掉缓存会话，下一次请求要为全部内容付 cache-write 价，这类环境只能在休息点改档位。

工具会在回放前主动检查这些前提，不满足就停止并指出要改哪个开关。

## 操作步骤

### 第一部分：量本机服务的 agent 负载基线（agentperf-local）

以下示例若用已安装的工具，去掉 `uv run`。完整选项用 `uv run agentperf-local <command> --help` 查看。

**1. 安装**

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

**2. 看本机硬件事实**

前提：已安装。预期结果：输出本机硬件事实，不上报标识。

```console
uv run agentperf-local doctor
```

**3. 确认本机哪个框架能服务某个 catalog profile**

前提：已安装。预期结果：给出该 profile 可用的部署选项，用于下面的做法 B 选型。

```console
agentperf-local deployment-options --profile-id <id>
```

**4. 选做法 A 或做法 B 跑一次回放**

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

**5. 设备装不下完整上下文时，先用 mini 回放自检**

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

**6. 需要 API key 时**

把 key 放进环境变量，只传变量名：

```console
--api-key-env <ENV_VAR_NAME>
```

**7. 让工具时间也变真实**

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

**8. 可选：实验性 Rust 客户端**

在 Python 之外记录计时，两者产出的指标相同：

```console
uv sync --extra rust
uv run agentperf-local tui --client rust
```

已安装的工具用 `uv tool install 'agentperf-local[rust]'`；普通 `uv sync` 会移除该扩展。

**9. 读结果**

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

**10. 可选：提交结果**

默认不上传，只有你主动 `submit` 才发。`prepare-submission` 生成提交文件，`submit` 发送，`submission-status` 回读状态；对自己启动的服务需 `run --attached-server FILE`。

其他命令：`convert` 把一段 agent 录制转成 replay manifest；`python -m agentperf_local` 与主程序等价。

### 第二部分：量一次真实任务的成本（Claude Code）

**11. 先建基线：查一次会话的真实用量**

前提：在 Claude Code 会话里，任务结束或中途都能看。预期结果：拿到这次会话的真实用量。

```text
/usage
```

`/cost` 效果相同。Session 区块给出 input、output、cache 三项；prompt-cache 行说明有多少输入来自缓存。在 Pro/Max/Team/Enterprise 计划上同一屏还显示计划用量条。注意：这个美元数字是在你本机按 list price 算的，订阅制下它是「你干了多少活」的参照，不是账单。

**12. 升级到支持 Opus 5.5 的版本**

前提：你要按成本 playbook 在 Opus 5 与 Opus 5.5 之间做对比。预期结果：Claude Code 为 v2.1.280 或更高。

```text
claude update
```

**13. 用同一个真实任务跑两遍做对比**

这是原文指定的验证方法：

- 从 backlog 里挑一个真实任务，不要用玩具例子。
- 用 `/model` 在 Opus 5 与 Opus 5.5 之间切换，各跑一次。
- 记录每次的 turn 数、output token 数和成本。
- 做三到四个任务再下结论。

预期结果：得到「同一任务在新旧模型上各花多少」的对照。只看单价会得出错误结论——一个模型可能多读一轮、多试一次。

### 第三部分：按任务形状选模型与 effort

**14. 先按任务类型选模型**

Sonnet 5.5 的起步分工（原文表格）：

| 你的活儿 | 起步用 |
|---|---|
| 范围清晰的日常编码：修 bug、快速迭代功能、对照需求验证 | Sonnet 5.5 |
| 高频日常开发 | Sonnet 5.5 |
| 打磨文档、幻灯片、表格（一页纸、图、摘要页、文档修改、表格整理），需要设计感 | Sonnet 5.5 |
| 明确定义、反复运行的 agent 任务：调查、评审、起草 | Sonnet 5.5 |
| 需要谨慎判断的复杂工作，包括长周期 agentic 编码和知识工作 | Opus 5.5 |
| 最难、最需要智力的问题 | Opus 5.5 |

原文判据：任务有清晰规格（spec）和可验证结果时用 Sonnet 5.5；最难的长周期工作用 Opus。

**15. 跑通最小调用**

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": "Analyze the trade-offs between microservices and monolithic architectures",
        }
    ],
    output_config={"effort": "medium"},
)

for block in response.content:
    if block.type == "text":
        print(block.text)
```

关键点：Sonnet 5.5 默认开启 thinking，响应可能以 thinking block 开头，必须按 `block.type` 遍历读取；直接取 `content[0].text` 会崩。

**16. 设 effort：默认 medium，按任务形状升降**

前提：会话内可随时改，改动对下一个请求生效。

```text
/effort medium
/effort status
```

- 日常范围清晰的工作用 medium（Opus 5.5 的默认就是 medium，比 Opus 5 的默认 high 低一级）。
- 机械工作（重命名、跨文件套用已知模式）用 low。
- medium 卡住再升 high。
- xhigh 和 max 只留给「你已经量出收益」的难题或单次会话。
- 不要沿用你为 Opus 5 选的等级：同一等级下 Opus 5.5 每轮思考更多。在 API key 或 Claude 订阅下改 effort 不清缓存；但在 Amazon Bedrock、Google Cloud 的 Agent Platform 或 Claude apps gateway 上改 effort 会清掉缓存会话，下一次请求要为全部内容付 cache-write 价，所以那类环境要在休息点改。
- Sonnet 5.5 侧的对应规则：除非工作负载是 agentic 或对延迟敏感，从 high 起步；agentic 编码和多步工具调用里，明确定义的任务从 medium 起步，更难更长的用 high；聊天和其他延迟敏感场景从 medium 或 low 起步；只在 eval 证明有质量提升时才用 xhigh 或 max。

预期结果：改完下一个请求就按新档位跑；用 `/effort status` 确认当前档位。

**17. 优先给模型「自检手段」，而不是升 effort**

前提：项目里能跑测试、构建，或有能调端点的脚本。原文的规则是：升 effort 之前先问模型有没有办法检查自己的产出。一个能跑通客户端测试的任务，会在写错的当轮就暴露字段没改全的问题；升 effort 会让每一轮都变贵，而一次测试只花一轮加其输出。

**18. 模型分层（省 token 最有效的一招）**

- Opus 5.5 当日常主力：跨几个文件的 feature 工作、调试、带后续修改的 code review——你盯着，循环短。
- 查找类工作下沉到 Sonnet 或 Haiku：搜索并总结的 subagent、读日志和测试输出、「这个定义在哪」这类问题。做法是在 subagent 定义里写：

```text
model: haiku
model: sonnet
```

- 要给所有 subagent 统一指定模型，设环境变量 `CLAUDE_CODE_SUBAGENT_MODEL`；subagent 定义里写的模型会覆盖这个变量；没写模型的 subagent 跑在主模型上（除非设了变量）。
- 大量文件的机械编辑不要下沉模型，留在 Opus 5.5 并把 effort 设 low。
- 上升到更大模型（文中是 Fable 5.1，list price $10/M input、$50/M output）：用于无人监督的长跑、代码库里没有先例的问题、需要协调多个 subagent 的大改动。切换规则：xhigh 下同一个问题撞两次就切，解决后切回。切换要在自然断点，先 `/compact` 或新开会话并写一份简短计划，因为缓存属于旧模型，新模型第一轮要为整个对话付写缓存价。用 `/model` 切换（它也会把选择存为新会话默认值）。
- 判断权留在主模型。`opusplan` 别名是另一种分法（Opus 在 plan mode 规划、Sonnet 执行），原文说这与你上面的分工相反，变成默认前先自己量。

**19. 低 effort 下补一段「真实检查」系统提示**

Sonnet 5.5 通常报告完成前会自检，但低 effort 时有时跳过真正跑一遍变更的检查。原文建议加这段：

```text
When you change code that can be run, built, or type-checked, run a real
check that exercises the change before reporting it done: the project's
tests, type-checker, or build, or the changed command itself. A syntax-only
check, or a check command that failed to start, does not count; if all
that is missing is the project's declared dependencies, install them with
its own package manager and lockfile (e.g. npm install, pip
install -r requirements.txt), never via sudo or the system package manager,
unless told not to. Only if no real check can run here, say which one you
did not run and why instead of reporting the change as done.
```

预期结果：模型在报告完成前会真的跑一次测试、类型检查或构建，而不是只做语法检查。

### 第四部分：迁移与提示词卫生

**20. 从 Sonnet 5 迁移到 Sonnet 5.5**

前提：现有项目跑在 `claude-sonnet-5` 上。先改 model ID，再处理 5 个破坏性变更和一个响应结构变更。

20.1 让 Claude Code 代劳：

```text
/claude-api migrate this project to claude-sonnet-5-5
```

20.2 用 `between_tools` 取代「关闭 thinking」。Sonnet 5.5 上 `thinking: {"type": "disabled"}` 会返回 400：

```python
# Before: Claude Sonnet 5
client.messages.create(
    model="claude-sonnet-5",
    max_tokens=16000,
    thinking={"type": "disabled"},
    output_config={"effort": "xhigh"},
    messages=[{"role": "user", "content": "..."}],
)

# After: Claude Sonnet 5.5
client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=16000,
    thinking={"type": "between_tools"},
    output_config={"effort": "high"},
    messages=[{"role": "user", "content": "..."}],
)
```

`between_tools` 的限制：只在 low/medium/high 有效，xhigh 或 max 会 400；不接受 display、budget_tokens、block_binding；effort 不能在对话中途变。它带来的是「只在工具调用之间思考」，总响应时间持平或更快。无工具、需要几步推演的请求，改用 adaptive thinking。

20.3 强制的 tool_choice 换成 auto + strict。`tool_choice` 为 `any` 或 `tool` 会 400（token counting 端点也一样）：

```python
weather_tool = {
    "name": "get_weather",
    "description": "Get the current weather in a given location",
    "input_schema": {
        "type": "object",
        "properties": {"location": {"type": "string"}},
        "required": ["location"],
        "additionalProperties": False,
    },
    "strict": True,
}

client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    tools=[weather_tool],
    tool_choice={"type": "auto"},  # was {"type": "tool", "name": "get_weather"}
    messages=[
        {"role": "user", "content": "What's the weather in Paris? Use the get_weather tool."}
    ],
)
```

strict 工具要求每个 object 都带 `additionalProperties: false`，并在提示词里说明什么时候用这个工具。

20.4 对话保持 append-only：Sonnet 5.5 的 thinking block 与模型和会话绑定；Sonnet 5.5 能读 Sonnet 5 的 thinking block，所以从 Sonnet 5 切过来的会话能保留推理，但其他模型读不了 Sonnet 5.5 的 block。

20.5 computer use 改走 toolset：Claude API 和 Google Cloud 上只支持 `{"type": "computer_toolset_20260801"}`，声明 `computer_20251124` 会 400。去掉 `anthropic-beta: computer-use-2025-11-24` 头、去掉 SDK 的 betas 参数、改用标准 client 调 Messages API，并更新 agent loop 以处理 member tool_use blocks、批量动作和结果上的 toolset_name。同时去掉 `fine-grained-tool-streaming-2025-05-14`（与 toolset 条目同用会 400），需要的话在每个工具上设 `eager_input_streaming: true`。Amazon Bedrock 仍接受 `computer_20251124`。

20.6 检查 advisor 配对：Sonnet 5.5 执行方会拒绝 Opus 4.8、Opus 4.7、Sonnet 5 作为 advisor；接受 Opus 5.5、Opus 5 和 Sonnet 5.5 自身。被接受 advisor 的建议以加密的 `advisor_redacted_result` block 返回，代码读不到建议正文。

20.7 从 thinking block 读工具调用之间的文本：这些进度笔记长于一两句时以 progress-update thinking block 返回，默认 display 下为空。用 adaptive thinking 时把 `thinking.display` 设为 `"updates"`（beta，需 `thinking-display-updates-2026-08-18` 头）或 `"summarized"`，并在随后的 tool_use block 之前渲染每个非空 thinking block。用 `between_tools` 时文本直接回来，不需要 display 设置。

```python
thinking={"type": "adaptive", "display": "summarized"}
```

原文理由：要求模型把推理写进正文（而不是用 display 取）会触发 `reasoning_extraction` 拒答。面向用户的进度笔记用 `display: "updates"`（beta）；想在固定位置出笔记（比如第一次工具调用前一行、结尾一段小结），在系统提示里写清楚。

预期结果：迁移后按第 21 步重跑 eval，400 类报错消失只是前提，结论要靠 eval。

**21. 删掉为 Sonnet 5 写的 workaround，再重跑 eval**

原文明确点名：refusal steering、tool-call 重试垫片、「do not be lazy」这类补丁都该删掉，删完先重跑 eval，再调别的。

**22. 审计迁移过来的提示词**

前提：你从旧模型迁到 Opus 5.5，或在 Claude Platform 上构建应用。预期结果：它检查 Claude Code 的 skills、CLAUDE.md 里的提示词反模式，也检查你构建的应用代码。

```text
/claude-api prompt-audit
```

原文案例：从 Opus 4.8 迁到 Opus 5.5，内部 44 张工单的客服基准上，低 effort 迁移把成本降了约 18%，跑 prompt-audit 再降 9%，合计比 Opus 4.8 起点低约 25%。被删掉的是让模型写更多、重复调工具的仪式性指令：强制六步流程、scratchpad 规则、verify-twice 规则、互相矛盾的指令。

### 第五部分：缓存、上下文与每轮重发的东西

**23. 管好缓存与会话形状**

前提：理解缓存只复用「从头开始匹配」的前缀。

- 稳定会话每轮往对话末尾追加，命中率高；改工具定义会清掉整个缓存，改 system prompt 会从那一处起清掉（几乎是全部）。
- 预期会写缓存的时机：暂停超过缓存生命周期；在 Bedrock / Agent Platform / gateway 上改 effort；会话里第一次开 fast mode；连接或断开 MCP server；切换模型；对话被压缩。所以这些都在会话开始时设好，运行中别动。
- cache 生命周期：Claude 订阅 1 小时；API key 或云服务商默认 5 分钟，订阅一旦动用 usage credits 也会降到 5 分钟。每次命中会免费重置生命周期。120K 上下文下 5 分钟写缓存约 $0.60、读约 $0.02，一次写等于 25 次读。
- 长会话每轮更贵：20K 上下文时一轮 cache read 约 $0.004，150K 时约 $0.03，30 轮就是 $0.90，而同样 30 轮在 20K 下约 $0.12。
- Sonnet 5.5 侧：最小可缓存 prompt 从 1,024 降到 512 token，短系统提示和工具定义现在也能缓存；cache read 是 input 价格的十分之一。改顶层 effort 会让缓存失效，想某一轮用不同档位就用 per-message effort（beta），缓存可保住。

**24. 上下文清理**

```text
/clear
/compact keep the failing test names and the schema change
/rewind
/autocompact
```

- `/clear` 清空对话、不花钱，换到不相关工作时用。
- `/compact` 保留连续性、花一次请求；可以在指令里说要保留什么（示例：保留失败的测试名和 schema 改动）。150K 时压缩约 $0.25，之后每轮省约 $0.025 的读，约十轮回本；快结束时压缩是亏的。它是有损的、会丢细节，要在自然断点做。
- 缓存冷的时候别压缩：休息超过缓存生命周期后压缩，会把整个对话重读一遍再写回缓存（150K、5 分钟缓存下光 input 就约 $0.75）。
- 想丢掉走错的路，用 `/rewind` 回到更早的轮次；缓存热时它回到的正是已缓存的前缀。
- `/autocompact` 加一个 token 数可以改自动压缩的触发阈值。

**25. fast mode 只在会话开头开**

fast mode 让 Opus 5.5 快最多 2.5 倍、价格翻倍（$8/M input、$40/M output）；订阅下走 usage credits 而非计划额度。开启后的第一次请求会为整个对话付 fast-mode input 价且不走缓存，所以要在会话开始开，不要跑到一半开。

**26. 控制每轮都会重发的东西**

- CLAUDE.md 在每个会话开始时载入，每一行都会在每轮重发；成本文档建议控制在 200 行以内。
- MCP 工具定义是延迟加载的，开始时只载入工具名和 server 指令；用 `/mcp` 看连了哪些 server，关掉不用的。

**27. 处理拒答与回退（Sonnet 5.5）**

- 被拒请求返回 HTTP 200 + `stop_reason: "refusal"`，`stop_details` 给出五类之一：cyber、bio、frontier_llm、reasoning_extraction、general_harms。
- 服务端回退 `fallbacks: "default"`（beta，Claude API）只对 cyber 和 frontier_llm 重试到 Sonnet 5，其余三类不重试；也可以自己写回退逻辑（原文在此处截断，未给出完整示例）。

## 怎么判断变好了

本机服务速度，可观察指标：

- `summary.json` 的 output tokens/s。
- 首 token 时间的 median 与 p95。
- 整轮时间的 median 与 p95。

比较时必须同机、同一 replay（默认用 `agentperf-default-v1`）、同一上下文条件（完整 65536）。低于 65536 token 的运行标 `reduced: true`，不可与完整上下文结果对比。`recorded` 策略（如 Ollama、Splash）的端到端延迟只是归一化估计，与 `exact` 运行不可直接比较。

一次真实任务的成本，打开 `/usage` 按三个比值读：

- cache 占比：长会话应该高；低就去查长暂停、换模型、中途连 MCP、云环境改 effort。
- output 对 input 的比例：小改动却大量 output，说明 effort 过高或在重试。
- 总 input 对会话大小的倍数：倍数大说明 turn 多，去读对话找重复的循环。

方法上：同一个真实任务在两个模型上各跑一次，做三到四个任务再下结论；团队层面用 Claude Code Analytics API 看每用户估算成本，用 Usage and Cost API 按模型和缓存/非缓存 token 拆分开支。原文给的参照基线是：企业部署平均约 $13/开发者/活跃日，90% 用户在 $30/活跃日以下（作者数据，不是你的数字）。

最小试用方式：先对自己已经在跑的服务做一次 attached 回放，不动环境拿到基线：

```console
uv run agentperf-local run \
  --base-url <你的服务>/v1 \
  --model <服务报出的模型名> \
  --output-dir results/base
```

或者在 Claude Code 里挑一个真实任务，跑完敲 `/usage` 记下三项数字，改一个设置（比如 effort）再用同一任务跑一次。

试多久：agentperf-local 材料未给时长，以一次完整默认回放（8 个录制 agent 任务、168 个模型轮次）跑完并写出 `summary.json` 为一次基线；做出改动后用同机同 replay 再跑一次做对照。成本对比按原文要求做三到四个真实任务。两条路径都只说明「服务变快/变慢了没有」「任务变便宜了没有」，不能说明「AI 干得更好没有」；要判断效果，仍需另外评估输出质量。

## 常见坑

- 只测速度，不测输出质量。这是 agentperf-local 最大的限制，直接决定了它在效果验证里只能算半个证据；成本 playbook 同样不判对错。
- 低于 65536 token 的运行会被标 `reduced: true`，与完整上下文结果不可对比。
- Ollama 无法遵守 `ignore_eos`，工具会在运行前检测并警告，改用 `recorded` 策略，其端到端延迟只是归一化估计，与 `exact` 运行不可直接比较。
- Splash 的 recipe 只跑 `recorded` 策略且 KV cache 恒为 8bit，因此与 `exact` 运行不可比。
- 默认会跳过轮次之间的工具耗时；要真实工具时间需设 `--tool-mode fixed_delay` 或 `--tool-mode live`。
- live 工具模式有多条安全警告：录制的命令属于不可信输入，Docker 降低但不构成安全边界；能访问 Docker daemon 在多数主机上等同于 root；容器默认无网络但 manifest 可要求联网（可用 `--live-network none` 强制断网）；任务工作区以读写方式挂载；脚本会拉取/构建第三方镜像并从 GitHub 克隆 SWE-bench harness。
- 隐私：结果目录可能包含路径、模型标签和错误信息；启动运行会把录制的 prompt 发给模型服务，因此用远端 URL 就等于把 prompt 送出本机。成本侧同理，prompt 会发给模型服务。
- 工具不安装推理框架，也不替你解决模型下载以外的环境问题。
- 崩掉的运行没有 `summary.json`，因为它最后写。
- 平台限制：Windows 的 managed 运行需 NVIDIA GPU + llama.cpp；vLLM/SGLang 仅 Linux；Splash 仅 Apple Silicon（M3 或更新，macOS 26.4 或更新）。
- 迁移后不重跑 eval，也不重跑 effort sweep。旧档位不可迁移，同一等级下 Opus 5.5 每轮思考更多。
- 直接取 `content[0].text` 会崩：Sonnet 5.5 默认开 thinking，响应可能以 thinking block 开头，必须按 `block.type` 遍历。
- `thinking: {"type": "disabled"}` 在 Sonnet 5.5 上返回 400；`tool_choice` 为 `any` 或 `tool` 也会 400（token counting 端点一样）。
- `between_tools` 只在 low/medium/high 有效，xhigh 或 max 会 400；不接受 display、budget_tokens、block_binding；effort 不能在对话中途变。
- 改顶层 effort 会让缓存失效；在 Bedrock / Agent Platform / gateway 上改 effort 会清掉缓存会话。这些都在会话开始时设好。
- 缓存冷的时候别 `/compact`：休息超过缓存生命周期后压缩，会把整个对话重读一遍再写回缓存。
- 改工具定义会清掉整个缓存，改 system prompt 几乎清掉全部。
- fast mode 跑到一半开，第一次请求要为整个对话付 fast-mode input 价且不走缓存。
- 为旧模型写的 workaround（refusal steering、tool-call 重试垫片、「do not be lazy」补丁）不删掉，会把新模型的收益吃掉；原文案例里 prompt-audit 再省的那 9% 就来自删这类仪式性指令。
- 把原文的示意金额、降价比例、effort 档位收益当结论照抄。作者明说大量 token 数是示意值、省钱比例是团队估计，必须自己量。

## 证据与来源

本手册做法来自本次调研报告《ArtificialAnalysis/aa-agentperf-local》《Building with Claude Sonnet 5.5》《What a task costs on Opus 5.5》。第一篇描述的命令、参数与边界来自该工具 README；后两篇来自 claude.dev，作者 Addy Osmani（分别发布于 2026-09-28 与 2026-09-25）。

有具体依据的部分：

- agentperf-local 的默认回放 `agentperf-default-v1` 规模：8 个录制 agent 任务、168 个模型轮次；`aa-mini-v1` 是 6 轮合成回放。
- 上下文门槛：完整运行 65536 token、batch size 1；默认回放最大单轮约 58000 token；`aa-mini-v1` 需 8192。
- `exact` 输出策略会发送 `ignore_eos`（不属于 OpenAI API），运行前会检查服务端是否遵守；Ollama 无法遵守时改用 `recorded` 策略。
- 哪些运行不可对比由工具自己标记：低于 65536 token 标 `reduced: true`；Splash 的 recipe 只跑 `recorded` 策略且 KV cache 恒为 8bit。
- 结果文件结构，以及 `summary.json` 中 output tokens/s、首 token 时间、整轮时间的 median 与 p95 字段含义。
- 平台限制与 live 模式安全警告。
- Sonnet 5.5 的任务-模型对照表、模型 ID、`between_tools` / strict tool_choice / computer use toolset / advisor 配对这几条破坏性变更，以及最小调用示例、低 effort 的「真实检查」系统提示词、拒答五分类与 `fallbacks: "default"` 的重试范围。
- 成本侧的 list price：Opus 5.5 $4/M input、$20/M output、$0.20/M cache read；Fable 5.1 $10/M input、$50/M output；fast mode $8/M input、$40/M output；cache write 为 input 价 1.25 倍（5 分钟）/ 2 倍（1 小时）；Opus 5.5 的 cache read 是 input 价的二十分之一（Opus 5 是十分之一）。
- 成本侧命令与规则：`/usage`、`/cost`、`/effort`、`/model`、`/clear`、`/compact`、`/rewind`、`/autocompact`、`/mcp`、`/claude-api prompt-audit`、`claude update`、`CLAUDE_CODE_SUBAGENT_MODEL`、subagent 定义里的 `model:` 字段、CLAUDE.md 控制在 200 行以内、Opus 5.5 需 Claude Code v2.1.280 或更高。

只是作者主张、没有数据支撑的部分：

- agentperf-local 的 README 通篇没有给出任何实际 benchmark 数值、性能对比表或案例；其「测量规则」「证据边界」被指向 `docs/ARCHITECTURE.md`，但该文档不在给出的材料里；仓库只有 66 stars，成熟度证据有限；作者 Artificial Analysis 在模型评测领域有一定知名度，但这是外部声誉而非本仓库的证据。
- 成本 playbook 里大量 token 数是作者自己声明的示意值；「Opus 5.5 比 Opus 5 便宜 40%」是作者团队的估计，建立在「默认设置下每任务用更少 token」这个假设上，不是 token 单价降 40%；Opus 5.5 每任务用更多还是更少 token，作者明说要自己量。
- 44 张工单客服基准的 −18% / −9% / 合计 −25%、示意会话省下的 $242/月、企业平均 $13/开发者/活跃日、90% 低于 $30，这些数字都出自原文，属于作者方数据。
- Sonnet 5.5 篇的「effort 档位被重新校准」「删掉 workaround 再重跑 eval」是作者建议，没有给出对照数据。

## 依据的调研

- [ArtificialAnalysis/aa-agentperf-local](../research/radar/2026-10-02/51-artificialanalysis-aa-agentperf-local.md)：值得一试，把 agentperf-local 作为本地/自建模型服务的「agent 负载压测」工具小范围试用：先用 aa-mini-v1 跑通环境，再用默认回放对候选模型或服务框架做一次可对比的吞吐与延迟基线，据此选型或做回归；它只测速度不测输出质量，所以只能作为任务匹配与效果验证的一环，不能替代对输出结果的评估。
- [Building with Claude Sonnet 5.5](../research/radar/2026-10-02/390-building-with-claude-sonnet-5-5.md)：值得一试，把这篇当作 Sonnet 5.5 的选型与迁移操作手册来小范围试用：先按任务类型选模型、再按原文步骤迁移和调 effort，因为原文给了可直接照做的代码、参数和提示词；但所有档位和收益都需要用自己的 eval 重新验证，不能直接照抄当结论。
- [What a task costs on Opus 5.5](../research/radar/2026-10-02/392-what-a-task-costs-on-opus-5-5.md)：值得一试，按文章给的方法（用 /usage 建基线 → 默认 medium effort → 优先给模型自检手段 → 模型分层 → 管好缓存与压缩）在自己的真实任务上小范围试验，并用同一任务跑两遍对比每任务成本与 turn 数；因为其中的命令和判断规则可以直接照做，但文章反复声明所有金额与 token 数都是示意值，只有你自己 /usage 出来的数才算。
