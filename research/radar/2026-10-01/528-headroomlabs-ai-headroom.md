# headroomlabs-ai/headroom

- 结论：**值得一试**。建议在长会话、重工具输出的编码 agent 上小范围试用：装好后用 `headroom wrap <agent>` 包一层，先用 `headroom doctor` / `headroom savings` 读自己流量上的省量，并开 `HEADROOM_OUTPUT_HOLDOUT=0.1` 拿实测的输出节省，再决定是否长期保留。理由是原文给出了可直接照抄的安装、接入、量测、复现基准和回滚（`headroom unwrap`）步骤，但它是一个会接管你全部 LLM 流量的本地代理，收益随数据重复度剧烈变化、基准全部自报，不适合无条件全量铺开。
- 原文：https://github.com/headroomlabs-ai/headroom
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T10:29:01.885Z

## 是什么

Headroom 是一个本地运行的「上下文压缩层」：在 agent/应用把提示、工具输出、日志、RAG 结果、文件、对话历史送进 LLM 之前先压缩，目标是在答案不变的前提下少花 token。它提供四种接入形态：Python/TypeScript 库（`compress(messages)`）、本地代理（`headroom proxy --port 8787`，零代码改动）、一行命令包裹现有编码 agent（`headroom wrap claude|codex|grok|copilot|cursor|aider|opencode|cline|continue|goose|openhands|openclaw|vibe|omp|zcode`）、以及 MCP server（`headroom_compress` / `headroom_retrieve` / `headroom_stats`）。

内部管线是 CacheAligner → ContentRouter → CCR。ContentRouter 判断内容类型后分别交给 SmartCrusher（JSON）、CodeCompressor（AST，支持 Python、JS/TS、Go、Rust、Java、C/C++、C#、PHP）、Kompress-v2-base（散文，HuggingFace 模型）。压缩在本机完成，原文缓存在本地，模型需要全文时通过 CCR 调 `headroom_retrieve` 取回，所以是可逆的。此外还做了输出侧削减（verbosity steering、effort routing）、跨 agent 共享记忆和 `headroom learn` 失败挖掘。

## 具体做法（编号步骤）

前提：Python 3.10+；压缩在本地跑，需要能起本地进程。以下命令均照原文原样给出。

**1. 安装（三种方式任选）**

```bash
uv tool install --python 3.13 "headroom-ai[all]"  # CLI 装在隔离环境里，推荐
pip install "headroom-ai[all]"                    # Python，自带 headroom CLI
npm install headroom-ai                           # 只有 TypeScript SDK，没有 CLI
```

注意：`headroom` CLI 只在 PyPI 包里；npm 包是库（`import { compress } from 'headroom-ai'`），不提供命令行。macOS 上如果默认 `python3` 比当前 wheel 支持的新，加 `--python 3.13`。

**2. 选接入模式**

```bash
headroom deploy                # 一站式本地部署 + agent 配置
headroom wrap claude           # 包裹一个编码 agent
headroom proxy --port 8787     # 即插即用代理，零代码改动
```

内联用法（Python，可放进任意应用）：

```python
from headroom import compress
from openai import OpenAI

messages = [{"role": "user", "content": "Analyze these results"}]
result = compress(messages, model="gpt-4o")

client = OpenAI()
response = client.chat.completions.create(model="gpt-4o", messages=result.messages)
print(f"Saved {result.tokens_saved} tokens ({result.compression_ratio:.0%})")
```

`headroom wrap` 每次都要用它来启动会话才会生效：它会起本地代理、为语义代码导航装 Serena、再按「路由到 Headroom」的方式启动 agent。Claude Code 场景下 Serena 只注册到被包裹的那个项目（写进 `~/.claude.json` 的 `local`-scope MCP server）；要全局可用加 `--code-memory-scope user`，要跳过加 `--code-memory none`。撤销用 `headroom unwrap <tool>`（`claude`、`copilot`、`codex`、`grok`、`kimi`、`omp`、`opencode`、`openclaw`、`zcode`）。

**3. 自检与看省量**

```bash
headroom doctor    # 健康检查，确认路由生效
headroom perf
headroom dashboard # 实时省量（代理需在运行）
```

`headroom doctor --network` 可以看上游证书是谁签的、Headroom 是否信任、是否有网关拦截页。

**4. 打开输出 token 削减（默认关闭）**

```bash
export HEADROOM_OUTPUT_SHAPER=1     # off by default
headroom proxy --port 8787
```

两个机制：verbosity steering 在 system prompt 末尾追加一句「简洁点、别复述上下文」的说明（加在末尾是为了不破坏 prompt cache）；effort routing 在「模型只是接着工具结果往下走」的轮次（读文件、测试通过）下调思考强度，新问题和报错仍用满强度。两条路径都支持：Anthropic `/v1/messages`，以及 OpenAI 兼容的 `/v1/chat/completions` 和 `/v1/responses`；分别通过 OpenAI 的 `reasoning_effort` 和 Anthropic 的 `thinking.budget_tokens` / `output_config.effort` 实现。

已有一个在跑的代理时要注意：这些开关是每次请求实时读的，但 `headroom wrap` 复用（而非新建）的代理，其环境变量是启动时快照的。`headroom wrap` 会通过 loopback 的 `POST /admin/runtime-env` 把当前设置热同步给运行中的代理，不用重启、不丢请求。共享代理上这些覆盖是全局的，最后一个显式设置生效。

**5. 让工具自己学简洁度**

```bash
headroom learn --verbosity            # dry run — 先看它发现了什么
headroom learn --verbosity --apply    # 保存，代理会读取
```

**6. 量测输出节省**

```bash
headroom output-savings
# Reduction: 31.7%  (95% CI 27.7% … 35.7%)   [estimated]
```

想要实测数而不是估计数，留出 10% 会话作为未处理的对照组：

```bash
export HEADROOM_OUTPUT_HOLDOUT=0.1
```

之后 dashboard 的 **Output Tokens Saved** 卡片会显示 `measured` 并带区间。

**7. 自己复现官方基准**

```bash
uv run python benchmarks/index_proof_table.py --seed 20260902
python -m headroom.evals suite --tier 1
```

**8. MCP client 配置（Codex 等不继承交互式 shell PATH 的客户端）**

用 `command -v headroom` 拿到的绝对路径：

```toml
[mcp_servers.headroom]
command = "/Users/you/.local/bin/headroom"
args = ["mcp", "serve"]
```

`command = "headroom"` 只有在客户端启动时的 PATH 已包含 uv 工具目录时才行。MCP 原生客户端也可以直接 `headroom mcp install`。

**9. 失败挖掘与回滚**

```bash
headroom learn                        # 挖失败会话，默认写 CLAUDE.local.md（gitignored）
headroom learn --target CLAUDE.md     # 写团队共享文件，也可写 AGENTS.md / GEMINI.md / GROK.md
headroom unwrap <tool>                # 撤销持久化包裹
```

**10. 关闭遥测（如合规需要）**

```bash
export HEADROOM_BEACON=off   # 或用 DO_NOT_TRACK=1，或 --offline
```

匿名 beacon 默认开启，上报压缩比例、计数、provider 与 model ID、OS 与架构，不上报 prompt、补全、代码或文件路径。

**几个有前提的针对性开关**：Anthropic `/v1/messages` 路径上用 `--mode cache` 会跳过自动的 `--memory` 上下文注入，以保持 provider 前缀稳定；OpenAI chat/responses 和 Gemini 会把 memory 追加到 live-zone 尾部；需要在 Anthropic 路径上带自动 memory 上下文时改用 `--mode token`。Copilot CLI 订阅模式：

```bash
headroom copilot-auth login
headroom wrap copilot --subscription -- --model gpt-4o
```

GitHub Enterprise Server 或自定义域名部署，启动前设置其一（两个都设时 URL 优先）：

```bash
export GITHUB_COPILOT_ENTERPRISE_DOMAIN=ghe.example.com
export GITHUB_COPILOT_ENTERPRISE_URL=https://ghe.example.com
```

## 对应的研究问题

**1. 能力发现**
- 把「上下文压缩与按需检索」这件原先没人显式交给 AI 的活交给一个本地中间层：工具输出、日志、RAG 块、文件、对话历史在入模前压缩，原文缓存、需要时用 `headroom_retrieve` 取回。
- 跨 agent 记忆：Claude、Codex、Gemini、Grok 共用一个存储并自动去重；多 agent 流程用 `SharedContext().put / .get` 传递压缩后的上下文。
- 输出侧也交给它管：verbosity steering 与 effort routing 自动决定模型该写多啰嗦、该思考多深。
- `headroom learn` 自动从失败会话里挖出纠正，写进 `CLAUDE.local.md`（默认）或 `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `GROK.md`。

**2. 任务匹配**
- 适配对象是重度工具输出的长会话编码 agent：README 给了兼容表（Claude Code、Codex、Grok CLI、Aider、Copilot CLI、VS Code Copilot、OpenClaw、OpenCode、Cline、Continue、Goose、OpenHands、Mistral Vibe、Oh My Pi、Kimi CLI、ZCode 支持 `wrap`；Cursor 为手动设置并打印 base URL；Cortex Code 只有库模式）。
- 压缩器按内容类型分工：JSON → SmartCrusher（保留错误项、统计上超出正常范围的值、首尾边界，按字段方差统计选择而非关键词表）；源码 → CodeCompressor（AST）；散文 → Kompress-v2-base；图片 → 训练过的 ML router（40–90%）。
- 不适合的场景原文写了：只用单一 provider 的原生 compaction、不需要跨 agent 记忆，或沙箱里跑不了本地进程；短对话、散文、已经密集的载荷收益很小甚至为零；小于 `min_input_words` 的块原样返回。
- provider 路径选择：Anthropic `/v1/messages` 用 `--mode cache` 保 KV-cache 前缀稳定；OpenAI/Gemini 把 memory 追加到 live-zone 尾部。

**3. 条件供给**
- 运行条件：本机可起进程、一个本地代理端口（如 8787）、本地缓存原文（CCR，有配置的 TTL）。
- 检索工具：模型侧要能调 `headroom_retrieve`（MCP 或代理提供的 retrieval tool）才能拿回全文。
- 客户端配置：MCP 客户端需要绝对路径（`[mcp_servers.headroom]` 里的 `command`），Codex 等不继承交互式 PATH。
- 认证：Claude Code 的 Anthropic 认证与所选模型被保留；Copilot 需要 `headroom copilot-auth login`（存 Headroom 专用的 Copilot OAuth token，而不是通用的 GitHub/Copilot CLI token）；GitHub Enterprise Server 需设企业域名或 URL；Docker 与 CI 里传 `GITHUB_COPILOT_TOKEN` 或 `GITHUB_COPILOT_GITHUB_TOKEN`，不要依赖宿主机 keychain。
- 企业网络：SSL 检查环境可能需要 `HEADROOM_CA_BUNDLE=/path/to/root.pem`（`NODE_EXTRA_CA_CERTS` 也有效）；`cdn.pyke.io` 与 `huggingface.co` 两个下载源需预置（`ORT_STRATEGY=system` + `ORT_LIB_LOCATION`，`HF_HUB_OFFLINE=1` 或 `HF_ENDPOINT` 指向可信镜像）。
- 硬件：x86/x86_64 上 ONNX 相关能力（Magika 内容检测、embedding 相关性）需要 AVX2，没有则回退到 BM25 相关性与启发式检测而不是崩溃；arm64 与 Apple Silicon 不需要 AVX2。
- 反馈：`headroom learn` 依赖历史会话；输出侧的简洁度也是从过去会话里读出来的。

**4. 主动推进**
- 代理常驻，按请求触发压缩，不需要人工介入。
- live-zone 压缩：只压新字节（新的工具输出、最新一轮），冻结前缀保持逐字节一致，provider cache 存活，历史永不丢弃。
- CacheAligner 主动标记会破坏 provider KV-cache 前缀的易变内容（它本身不改写 prompt）。
- `headroom wrap` 通过 `POST /admin/runtime-env` 把运行时设置热同步给已在跑的代理，无需重启、不丢请求。
- `headroom learn --verbosity` 从历史会话推断该用多简洁，属于状态触发的自动配置。
- `headroom update` 自动识别 pip / pipx / uv tool 就地升级；代理启动时最多每天后台查一次 PyPI，不阻塞，`HEADROOM_UPDATE_CHECK=off` 可关。

**5. 效果验证**
- `headroom savings`：对自己真实流量报压缩数字（README 明确说只有这个数才适用于你）。
- `uv run python benchmarks/index_proof_table.py --seed 20260902`：seeded、离线，任何人可跑出同一组数字。
- `python -m headroom.evals suite --tier 1`：GSM8K / TruthfulQA / SQuAD v2 / BFCL 的准确率对照。
- 输出侧：`headroom output-savings` 给估计值和 95% 置信区间并标注 `[estimated]`；设 `HEADROOM_OUTPUT_HOLDOUT=0.1` 后 dashboard 卡片改为 `measured`。
- `headroom doctor` / `headroom doctor --network` 验证路由与证书链是否正常。

## 与已有做法的关系

- **Claude Code（adopt）**：README 把它作为主要适配对象，`headroom wrap claude` 支持，另有 `--memory`、`--code-graph`、`--1m`、`--tool-search` 开关；Serena 注册进 `~/.claude.json` 的 `local` scope。另有独立的 `headroom wrap vscode-claude` 和 `headroom wrap vscode`（VS Code 里的 Claude Code / Copilot）。
- **Cline（watch）、Cursor（watch）、Goose（watch）、OpenClaw（watch）、OpenCode（watch）**：都在兼容表里。Cline / Continue 是「起代理 + 注入配置」；Goose / OpenHands / OpenCode / OpenClaw 是起代理加启动（OpenClaw 作为 ContextEngine 插件安装）；Cursor 需要手动设置——起代理并打印 base URL 填进 Cursor 设置。
- **GitHub Copilot（drop）**：原文用大量篇幅讲 Copilot CLI 订阅模式和 VS Code Copilot（`headroom copilot-auth login` + `headroom wrap copilot --subscription -- --model gpt-4o` / `headroom wrap vscode`），与清单里 drop 的状态不一致，建议复核这条清单结论。
- **ZCode（avoid）**：兼容表里 ZCode 是支持状态，`headroom unwrap` 也列了 `zcode`，与 avoid 的状态不一致，同样建议复核。
- **Trendshift（watch）**：在原文里只作为 `#1 Repository Of The Day` 徽章出现，没有可提炼的做法。
- **Ponytail（study）、Graphify（watch）**：原文未提及。
- 清单中没有与「本地上下文压缩 / 可逆压缩（CCR）」直接对应的条目，这是本线索带来的增量。

## 证据与局限

**原文给出的数据（全部是项目自报，但给了可复现命令）**

四场景压缩表，用 provider tokenizer 和仓库里的 `compress()` 测量，seeded 且离线：

| 场景 | 前 | 后 | 节省 |
|---|---:|---:|---:|
| 代码搜索（100 条结果） | 17,199 | 13,597 | 21% |
| SRE 事故排查 | 55,957 | 24,340 | 57% |
| 代码库探索 | 58,801 | 33,895 | 42% |
| GitHub issue 分诊 | 46,067 | 32,429 | 30% |

- 延迟：10K token 的 JSON 搜索结果 p50 为 0.21 ms，100K token 时 1.4 ms，作者据此主张不体现在 agent 延迟上。
- 准确率（`python -m headroom.evals suite --tier 1`，各 N=100）：GSM8K 0.870 → 0.870（±0.000）；TruthfulQA 0.530 → 0.560（+0.030，作者自己说明 N=100 时 ±0.03 落在置信区间内，属于「测不出差异」而不是提升）；SQuAD v2 97%（在 19% 压缩下）；BFCL 97%（在 32% 压缩下）。
- 输出侧示例值：31.7%（95% CI 27.7% … 35.7%），原文明确标注为估计值。
- 其他数字：图片压缩 40–90%；Cortex Code 库模式 60–65%；重复 JSON 数组和日志行在 `benchmarks/bench_latency.py` 里能过 90%。
- 演示素材：hero 图 55,957 → 24,340；gif 10,144 → 1,260，且 `FATAL` 行逐字节保留。

**只是作者主张、缺独立验证的部分**

- 所有基准都是项目自己给的，原文没有第三方复现记录；输入指标里 stars 为 74,204，原文未提供可核实的独立评测来源。
- 「同样的答案、零头 token」是产品主张，能支撑它的只有上面那张小样本准确率表。
- 输出侧节省本身是反事实的（原文承认看不到模型本来会写什么），所以默认只报带区间的估计值。
- 「对延迟不可见」只在给定 token 量级的 p50 上测过，没有 p95/p99，也没有端到端 agent 耗时。

**适用条件与限制（原文自述）**

- 收益随载荷重复度大幅变化；散文和已密集输出几乎不压；小于 `min_input_words` 的块原样返回。
- 依赖本地进程和本地原文缓存（CCR 有配置的 TTL）；沙箱内不能跑本地进程就不适用。
- 遥测默认开启，需主动关闭。
- 平台：原生 wheel 覆盖 macOS Apple Silicon 与 Linux；Intel macOS 需走 Docker 安装，或 `brew install onnxruntime` 配 `ORT_STRATEGY=system`、`ORT_LIB_LOCATION`（必须指向 `lib/`）和 `ORT_PREFER_DYNAMIC_LINK=1`，运行时还要 `ORT_DYLIB_PATH`。
- 企业网络下的绕行有代价：`HEADROOM_TLS_STRICT=0` 会关掉 Python 3.13 默认的 `VERIFY_X509_STRICT`（原文说明链校验、签名、有效期、主机名检查仍保留）；Rust 核心的下载走 rustls + Mozilla 根证书，不受这些变量影响。
- Copilot 平台：Windows 上 Copilot CLI 1.0.81 不暴露 legacy Credential Manager schema，需单独跑 `headroom copilot-auth login`；Linux Secret Service / `secret-tool` 复用「已实现但尚未在真实桌面验证」。
- VS Code 里 Claude Code 的 1M 支持归 Claude Code 和 Anthropic 所有，本地测试只证明设置被持久化和还原，**不**证明实机会话真的拿到 1M 上下文。
- 团队级部署（共享常驻服务、集中配置与版本推送、组织级节省看板、SSO 与访问控制、VPC 和离线安装）不在开源范围内，需联系厂商；本仓库为 Apache 2.0。

## 怎么试、怎么验证

**最小试用（半天内可做）**

1. 选一个**重工具输出的长会话**场景做试点，例如日志排查或代码库探索——这是原文数据里收益最高的两类；不要选短问答或纯写作。
2. 装好后用 `headroom wrap <你把日常用的 agent>` 起会话，跑一个真实任务。先不开输出削减（`HEADROOM_OUTPUT_SHAPER` 默认关），把输入侧效果单独看清楚。
3. 跑 `headroom doctor` 确认路由生效，用 `headroom savings` 和 `headroom dashboard` 读**你自己流量**上的省量（原文明确说只有这个数适用于你）。
4. 想先验证工具本身可信不可信，先跑 `uv run python benchmarks/index_proof_table.py --seed 20260902`，看能否得到与 README 表一致的四个数。
5. 再开输出侧：`export HEADROOM_OUTPUT_SHAPER=1`，同时 `export HEADROOM_OUTPUT_HOLDOUT=0.1`，让 dashboard 给 `measured` 而不是 `estimated`。
6. 不满意就 `headroom unwrap <tool>` 回滚——这是它比「改自己代码」方案更安全的地方。

**判断有没有改善的指标**

- **省量**：压缩比 / 节省 token 数（`headroom savings`，针对自己的流量）；输出侧看 `headroom output-savings` 的估计值与区间，或开 holdout 后的实测值。
- **质量不退化**：同一批试点任务在压缩前后的通过率或人工验收结果对照。注意样本量——原文自己在 N=100 上承认 ±0.03 不可区分，所以小样本上「分数没掉」不等于没问题。
- **关键信息保真**：像原文演示的那样，对压缩后的载荷做人工抽查，确认错误行、`FATAL` 一类关键行还在；这也是 SmartCrusher「保留错误项与超范围值」设计的验收点。
- **可回退性**：抽查若干次，模型需要全文时 `headroom_retrieve` 能否按预期取回原文。
- **成本**：输入 + 输出 token 的计费变化；Opus 类模型输出价格是输入的 5 倍，输出侧要单独看。
- **延迟**：会话端到端耗时与 p50/p95（官方称压缩 <1 ms，但要在你自己的工作流里复核）。
