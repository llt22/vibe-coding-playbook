# theRizwan/community-claude-code

- 结论：**值得一试**。按 Quick Start 装好 CCC，先用 ccc-claude 接一个已有 key 的 provider 在同一小任务上跑通，再配 Fallback Models 与 Proxy Authentication 做对比测试；这是材料中唯一给出“把 Claude Code 这类编码智能体接到任意 OpenAI 兼容模型、同时保留流式/工具调用/思考”的完整可照做步骤的方案，但项目仅 42 star、部分模型 id 与“Claude Code 全部模型免费用”的主张可疑，需先小范围自测再决定是否进手册。
- 原文：https://github.com/theRizwan/community-claude-code
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T20:51:03.257Z

## 是什么

Community Claude Code（CCC）是一个本地运行的代理/路由层（Python 3.14、uv、AGPL-3.0-only、独立项目，与 Anthropic 无隶属关系）。它把各类编码智能体（Claude Code、Codex、Pi、OpenCode 2、Cline、Hermes、DeepSeek Harness Web、Grok Build、Muse Code、Aider、Antigravity CLI）接到任意受支持的模型提供方，宣称保留原生流式、工具调用与 interleaved thinking，并提供自动重试、可配置限流、并发控制、模型/提供方自动回退、多 API key 回退、思考强度分级与 Claude Code 档位路由。除终端外，还支持桌面应用、VS Code/JetBrains、Discord/Telegram（含语音笔记转写）与浏览器原生 Code session。对调研的价值在于它是“同一 agent 换模型/换入口”的可操作编排层，而不是新模型。

## 具体做法

前提：一台 macOS/Linux/Windows 开发机，至少一个模型提供方的 API key（或 OAuth 账号），本地已能正常运行 Claude Code 等任一编码 agent。

1. 安装（会提示至少选一个编码 agent，可选启用 RTK + Headroom token 优化）。

```bash
curl -fsSL "https://raw.githubusercontent.com/theRizwan/community-claude-code/main/scripts/install.sh" | sh
```

```powershell
irm "https://raw.githubusercontent.com/theRizwan/community-claude-code/main/scripts/install.ps1" | iex
```

2. 启动 CCC（启动后自动打开 Admin UI；Windows/macOS 用托盘/菜单栏图标打开 Admin、重启、退出；用 `ccc-server` 时需保持终端不关）。

```bash
ccc-server
```

3. 配置第一个 provider（README 以 NVIDIA NIM 为例）：
   1. 在 build.nvidia.com/settings/api-keys 创建 key；
   2. 打开服务器日志里的 Admin UI 地址；
   3. Providers → NVIDIA NIM → Add key → 粘贴 → Save；
   4. `MODEL` 保持默认 `nvidia_nim/nvidia/nemotron-3-ultra-550b-a55b`，或在下拉里搜索换模型；
   5. 点 Apply 保存模型选择。

4. 给本地代理加鉴权：在 Admin 中启用 **Proxy Authentication**，之后客户端用该 token 作为 API key。

5. 用对应命令启动 agent（命令即客户端适配层，无需改 agent 本身）。

```bash
ccc-claude
ccc-codex
ccc-pi
ccc-opencode
ccc-cline
ccc-hermes
ccc-dsh
ccc-grok
ccc-muse
ccc-aider
ccc-agy   # 需先在 Integrations 页面连接
```

6. 其他 OpenAI 兼容客户端：把 base URL 指向 `http://127.0.0.1:8082/v1`（默认），模型名选 CCC 侧的名字（如 `gemini/models/gemini-3.5-flash-lite`）；若已开 Proxy Authentication，用其 token 当 API key。流式与 JSON 回复均支持。

7. 配置回退（**Model Config → Fallback Models**，按顺序尝试，对所有已连接客户端生效）：
   - 每条 fallback 可选自己的 reasoning effort（Inherit / Off / From client / Low / Medium / High / X-High / Max）与 API key 序号（Key 1、Key 2…对应 provider 设置里的编号 key，可拖动排序、就地编辑、红色垃圾桶删除）；
   - 注意原文明确警告：失败的请求可能先后触达并消耗多个 provider 的额度。

8. 配置 Claude Code 档位路由：`MODEL` 是所有请求的兜底；为 `MODEL_FABLE`、`MODEL_OPUS`、`MODEL_SONNET`、`MODEL_HAIKU` 各选一个模型即可覆盖单个档位，选 None 则回落到 `MODEL`。

9. 配置思考强度（Admin UI → Model Config → Model Routing，每个模型旁选 effort）：
   - Default Effort 初始为 From client；Fable/Opus/Sonnet/Haiku 初始为 Inherit；
   - From client = 用 agent 发来的 effort，没发就用 provider 默认；Off = 请求关闭推理；Low…Max = 覆盖客户端；Inherit = 档位覆盖用 Default Effort，fallback 保留原请求已解析的 effort。

10. 接自定义/自建端点：Providers → Custom providers → Add provider，填 API base URL、可选 keys、API 格式；Model IDs 留空则自动发现，或每行填一个上游模型 id；保存后在 Model Config 选模型。

11. 接本地模型（启动时自动发现正在跑的本地服务；后启动的点 Admin 里 Refresh models；卡片会显示探测到的 endpoint、响应时间与不可用提示，可点 Test 重刷）：
    - LM Studio：启动本地 server、加载 tool-capable 模型，用 `lmstudio/` 前缀，默认 `http://localhost:1234/v1`；
    - llama.cpp：启动带 OpenAI 兼容 Chat Completions 且上下文足够的 llama-server，用 `llamacpp/` 前缀，`LLAMACPP_BASE_URL` 默认 `http://localhost:8080/v1`；
    - Ollama：`ollama pull llama3.1 && ollama serve`，用 `ollama list` 显示的 tag 加 `ollama/` 前缀，`OLLAMA_BASE_URL` 默认 `http://localhost:11434`。

12. 接消息入口（Admin UI → Messaging → Apply）：
    - Discord：Developer Portal 建 bot，开启 Message Content Intent，邀请时给读/发/历史/Manage Messages 权限（供 `/clear` 删用户消息），填 Bot Token、Allowed Discord Channels、**绝对路径**的 Allowed Directory；
    - Telegram：@BotFather 建 bot，@userinfobot 取数字 user ID，群里给删消息权限，填 Bot Token、Allowed Telegram User ID、绝对路径 Allowed Directory；
    - 语音笔记：默认含 NVIDIA NIM 转写（在 Providers 配 key）；本地 Whisper 需重跑安装器加参数：

```bash
curl -fsSL "https://raw.githubusercontent.com/theRizwan/community-claude-code/main/scripts/install.sh" | sh -s -- --voice-local
curl -fsSL "https://raw.githubusercontent.com/theRizwan/community-claude-code/main/scripts/install.sh" | sh -s -- --voice-local --torch-backend cu130
```

```powershell
& ([scriptblock]::Create((irm "https://raw.githubusercontent.com/theRizwan/community-claude-code/main/scripts/install.ps1"))) -VoiceLocal
& ([scriptblock]::Create((irm "https://raw.githubusercontent.com/theRizwan/community-claude-code/main/scripts/install.ps1"))) -VoiceLocal -TorchBackend cu130
```

装完重启 `ccc-server`，在 Messaging → Voice 选 cpu/cuda 与 Whisper 模型；受 gate 的模型需 `HUGGINGFACE_API_KEY`。

13. 会话控制命令（Discord/Telegram）：`/stats` 查看会话状态；单独 `/stop` 取消全部工作，回复某条消息用 `/stop` 只取消该请求；单独 `/clear` 清空该聊天全部会话与消息，回复式 `/clear` 只删该消息及其回复链。

14. 运维：`ccc-server --version` 只查版本不启动；更新需先停掉所有 CCC 命令再 `ccc-update`（失败则重跑安装命令）；出问题运行 `ccc-doctor` 并把输出贴进 issue。

```bash
ccc-update
ccc-doctor
```

## 对应的研究问题

- **能力发现（Q1）**：材料展示的是“入口扩展”而非新任务能力——同一个编码 agent 可从 Discord、Telegram（含语音笔记）、浏览器原生 session、IDE 插件触发，任务可跨终端/手机发起。这提示可纳入的候选工作是“碎片时间用消息入口把编码任务丢给已在跑的环境”，但原文没有给出除编码之外的用法示例。
- **任务匹配（Q2）**：这是最实的一块。可按 Claude Code 的 Fable/Opus/Sonnet/Haiku 四档分别映射到不同上游模型（`MODEL_*` 环境/设置），并给每个模型或每条 fallback 单独设 reasoning effort（From client / Off / Low…Max / Inherit），即“同一 agent、按任务档位选模型+推理强度”。另有两条明确的选择准则：优先选 tool-capable 模型；本地模型上下文要够装下 agent 的 system prompt 和工具定义。
- **条件供给（Q3）**：给出了清单式前置条件——provider 的 API key 或 OAuth 登录（OpenAI/ChatGPT、GitHub Copilot 走 OAuth，连接后需重启已运行的 agent）、Azure 需 `AZURE_OPENAI_BASE_URL` 完整 v1 endpoint、Vertex 用 ADC（本地 `gcloud auth application-default login`）、Bedrock 需与 key 同区域的 `BEDROCK_BASE_URL`、Alibaba 需 key 与 endpoint 同区域、Cloudflare 需 token + account ID；消息入口需 Allowed Channels / User ID 与**绝对路径** Allowed Directory；跨机/共享场景需开启 Proxy Authentication 并分发 token。
- **主动推进（Q4）**：材料只覆盖“失败后的自动推进”——自动重试、可配置限流与并发、模型/提供方回退、多 key 回退；没有基于时间、事件或状态触发的任务编排说明。
- **效果验证（Q5）**：只有间接手段——provider 卡片显示探测到的 endpoint 与响应时间、`ccc-doctor` 做安装诊断、`/stats` 看会话状态；token 节省只有“up to 90%”的主张，未给评测方法与数据。

## 与已有做法的关系

- **Claude Code（adopt）**：材料里最直接相关。CCC 把 Claude Code 当作被路由的客户端（`ccc-claude`），并专门提供 `MODEL_FABLE/OPUS/SONNET/HAIKU` 档位覆盖与 `/model` 原生选择器接入。若采用，等于给已 adopt 的 Claude Code 增加“换模型/换 provider/带回退”的一层。
- **Cline（watch）、OpenCode（watch）、Hermes（watch）、DeepSeek Harness（watch）**：README 分别给出 `ccc-cline`、`ccc-opencode`、`ccc-hermes`、`ccc-dsh` 启动命令，是把这些 watch 条目实际跑起来的一条现成路径，可作为它们升到 try 的试验载体。
- **DeepSeek（try）**：作为 provider 出现（`DEEPSEEK_API_KEY`，示例模型 `deepseek/deepseek-chat`），可把已有的 DeepSeek 试用接到 Claude Code/Cline 等 agent 上。
- **GitHub Copilot（drop）**：README 把 Copilot 列为 OAuth provider（需 Copilot CLI 1.0.83 在 PATH，模型与配额取决于订阅与组织策略）；与清单中 drop 的状态存在冲突，若试用需重新评估。
- **Orca（try）、Atlas（watch）**：清单中无对应，材料未提及。

## 证据与局限

原文给出的可核查内容：完整的安装/启动/更新/卸载/诊断命令；一张覆盖数十个 provider 的设置项、环境变量与示例模型 id 对照表；回退列表、tier 路由、reasoning effort 的 UI 操作语义（含 Inherit/From client 的精确定义）；消息命令行为表；本地 provider 的默认端口与前缀。这些是“可照做”的部分，也是本条被判为 try 的依据。

仅属作者主张、无数据支撑：“up to 90% lower token usage”（归因于 RTK 与 Headroom，未给基准）；“state-of-the-art reliability”；“For Claude Code, All Models are free to use”。最后一条与同一段落中“CCC follows provider TOS”的说法张力很大——把 Claude Code 指向非 Anthropic 模型很可能触及 Anthropic 或上游服务商的条款，原文未给合规依据，落地前需自行做法务判断。

可信度与适用条件上的风险：（1）仓库仅 42 star 的独立个人项目，AGPL-3.0-only，长期维护性未知；（2）README 中大量模型 id 无法从材料判断真伪或可用性（如 `gpt-5.6-sol`、`gemini-3.5-flash-lite`、`nvidia/nemotron-3-ultra-550b-a55b`、`grok-4.5`、`claude-sonnet-4-6`），可能是占位示例或超前命名，选模型前必须自行验证；（3）回退会跨 provider 消耗额度，原文自己就提示了这一点，成本不可控；（4）原文存在截断（`## ` 空标题后直接接 `## Optional Integrations`，疑似缺章），因此本报告只能覆盖所见部分；（5）安全边界未完整说明：本地代理默认似乎无鉴权（需手动开 Proxy Authentication），消息 bot 的 Allowed Directory 如何约束文件访问范围未展开。

## 怎么试、怎么验证

最小试用（半天，单机单仓库）：
1. 按 Quick Start 安装，只勾选 Claude Code 一个 agent，不启用 RTK/Headroom（避免混入变量）；
2. 只配 1 个已有 key 的 provider（NVIDIA NIM / DeepSeek / OpenRouter 任一），`MODEL` 选一个明确标注 tool-capable 的模型；
3. 选一个已知答案的小任务（例如“修掉这个 lint 错误并跑通测试”），先用原生 Claude Code 跑一遍记录基线；
4. `ccc-claude` 用同一提示词跑 3 次；
5. 再开启 Proxy Authentication，加 2 条 Fallback Models，重复第 4 步的 3 次。

观察指标（对比基线）：任务是否一次跑通；工具调用是否被正确转发（有无工具调用格式错误、agent 抱怨工具不可用）；往返轮数与人工介入次数；墙钟耗时；实际计费 token（用 provider 后台对账，不看 CCC 自报）；`ccc-doctor` 输出是否干净；provider 卡片的响应时间是否稳定。

回退专项验证：故意把主 provider 的 key 改错或停掉，看 fallback 是否自动接管、接管耗时多少、以及是否如原文警告那样产生了多份计费。

建议放弃或降级到 study 的判据：出现工具调用不兼容或“静默降质”（看似跑通但产出质量明显低于基线、且无提示）；回退造成的重复计费不可控；或使用方式触及上游条款而无法取得合规确认。若仅是想了解“agent 与模型解耦”这一思路，读其 provider 目录与 tier 路由设计即可，不必安装。
