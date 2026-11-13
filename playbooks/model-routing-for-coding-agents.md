# 把编码任务拆给对的模型：写、审、探路各用其长

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在多模型、多工具环境下，如何把写代码、评审、探索、验收分给合适的模型与角色，减少配额浪费、审批等待和返工，并用可观察证据判断分工是否真的变好。
> 先试这一步：先挑一个中等规模任务，让另一个厂商的模型只做一轮评审、不代写代码，同时把代码探索交给廉价子代理，记录返工与等待时间。
> 最近修订：2026-11-13

## 解决什么问题

编码中常见的浪费与中断有：订阅配额到期没用完、编码到一半被限流、某个 key 死掉导致整条流程卡住、工具输出烧 token；另一类浪费是模型分工：要么所有任务都用最重最贵的模型，要么靠手动切换。贵模型把大量 token 花在样板代码、写测试、跨文件改代码上，而这些活本可以交给廉价模型，只要贵模型先把任务写清楚，并用测试当裁判。

在 Claude Code 内，除了“Sonnet 主跑、Opus 做顾问”这类单条命令，还可以把分工落到用户级配置文件：主会话负责写代码和跑测试，advisor 只出主意，checker 子代理只测试和挑错，Explore 子代理负责检索与查文档。目标不是堆模型，而是让每类工作由合适角色承担，并用可观察证据判断是否真的变好。

新增的一类分工是跨厂商协作：主力模型写代码，另一个厂商的模型只做评审，廉价快速子 Agent 先探索代码，只读命令走白名单减少云端审批等待。原文来自 Antigravity + Gemini 的重度使用经验，工具绑定较强，做法要小范围试，不能直接当团队默认流程。

## 适用与不适用

适用：

- 你手上有多个供应商或多把订阅/API key，经常因配额耗尽、限流或失败中断工作；愿意在本机跑一个本地服务，且工具支持自定义 OpenAI 兼容 base URL。
- 你使用 Codex，愿意在 Codex 内装本地插件，用 `$adaptive-route` 跑日常任务。
- 你想用一个面板集中管“哪个工具接哪个模型”，或想在同一终端框架里并排开多个 coding agent 会话，为每次会话选 harness/model/effort。
- 你想先在 Python 代码里用同一个函数调不同供应商，再决定要不要上网关。
- 你使用 Claude Code，版本支持 `/advisor` 或 `--advisor`，或账号允许在 Sonnet、Opus、Haiku 等模型之间切换，想对成本敏感的代码编辑任务做 A/B。
- 你想在 Claude Code 内按窗口/别名路由，遇到 Anthropic 429 用量上限时自动转到备用 provider 并钉住会话。
- 你已在 Claude Code、Codex、Cursor 或 Gemini 之间分配工作，想把“哪类工作交给哪个 agent/模型/effort”写成规则，并先只做 pick + verdict。
- 日常用 Claude Code，任务中等规模、项目有可运行测试，想让 Opus 只做规划和决策、廉价模型写码。
- 你同时推进多个互不干扰的任务，愿意按“改动是否涉及架构”给任务打标签，并在长上下文换模型前先 `/compact`。
- 你想在 Claude Code 里把分工落到用户级配置：`~/.claude/settings.json`、`~/.claude/agents/*.md`、`~/.claude/CLAUDE.md`，并接受先备份、看 diff、再应用。
- 你使用 Antigravity 搭配 Gemini，能同时用到 Gemini、GPT、Claude 等多个模型，想按任务类型分配模型、用另一家模型交叉评审、用廉价子 Agent 探索代码、用只读白名单减少审批等待。
- 你愿意先打开 agy-fast-io 与 oil-dev-skills 仓库核对白名单和规则正文，并接受非官方插件。

不适用或需要谨慎：

- 项目没有可运行测试或测试覆盖不足：依赖测试裁判的做法不要用。
- 极小任务（几行代码、从零写一个小应用）：材料称没有收益；最难一档 bug 作者自报可能略差。
- 合规或数据敏感：廉价模型方案会把代码发给第三方 provider；网关接入前也要看清请求是否会经过第三方免费层。
- 期望工具自动 commit/push：Cheap Agent 从不 commit 或 push，改动以未提交形式落地，必须人工审 diff。
- 想把网关当无单点风险的生产网关：网关是单点，它挂了所有客户端一起挂。
- 想把 README 的效果数字直接当结论：多数项目数字没有可复现测量方法或第三方复核。
- 想照抄未确认的 Claude Code 命令、参数、环境变量或模型名：`/advisor`、`--advisor`、`--subagents`、`CLAUDE_CODE_SUBAGENT_MODEL` 及 Sonnet/Fable/Opus/Haiku 版本名在材料里无法核实，执行前必须用 `claude --help`、`/help` 或官方文档确认。
- 想把 F1–F4 混着抄或与网关自动叠加：材料未说明可集成，先分开试。
- 想把 K 当成单条启动命令：K 是用户级配置，会影响你所有项目；不想改全局配置就退回单会话/单命令做法。
- 不能接受 `/compact` 丢失上下文细节：压缩前把关键约束写到文件或消息里。
- 没有多模型条件，或只能用一个模型：做法 L 的“跨厂商评审、按任务分模型”无法完整执行。
- 不能接受非官方插件、或仓库内容无法访问/与当前版本不兼容：不要照做白名单和 swarm 规则。
- 想把 Orchestrator 计划模式直接当稳定方案：作者自认测试不够，只简单项目试过；纯读文件、问问题不会加速。
- 想配好白名单前就用 Turbo 模式跑复杂任务：原文称会反复触发 1–3 秒云端审核，复杂任务几十次。
- 想把只读白名单扩大到写操作：先只放列目录、读文件、搜索，写操作保留人工审批，观察是否误放行。

## 前置条件

- 通用：先记录原配置，能回滚；非敏感、非生产任务先试。
- OmniRoute：本机可安装 npm 全局包或可用 Docker 镜像 `diegosouzapw/omniroute`；默认监听 20128；至少一个你有权使用的 provider 账号或 key；客户端支持自定义 OpenAI 兼容 base URL；从 Dashboard → Endpoints 取 key。安装/首次运行章节在材料中被截断，执行前回 README 补齐。
- agent-smith：Python 部分只用标准库；路由执行需要已有 Codex 登录；Float 仅 macOS 14+；以下命令在克隆后的仓库根目录执行。
- FlagshipRouter：Node.js 20.9+（README 建议 22）；端口 20128 空闲——与 OmniRoute 默认端口相同，不能按默认端口同时启动；不想注册时可先只用 OpenCode Free 的免注册模型。
- Gluon：至少一个受支持编程智能体的 API key 或订阅；Linux、macOS、WSL 或 Windows；在本地 git 仓库目录中操作。
- LiteLLM：Python 环境 + uv；同一环境只能装 `litellm` 或 `litellm-core` 之一；起网关用 `uv tool install 'litellm[proxy]'`，本机 4000 端口可用。
- Claude Code 顾问/子代理做法：先核对版本与命令存在；账号/额度能访问相应模型；能读到会话总 token/费用与耗时。
- model-relay：Node.js 20+；Claude Code 2.1.287+；至少一个备用 Anthropic 兼容端点；接受这是单人本机守护进程；默认端口 8950。
- cedr：Linux 需要 glibc 2.34+ 或使用对应平台发布包；写 `~/.config/cedr/routes.toml`；使用 Claude Code 时要挂 statusLine；cedr 处于 preview，1.0 前命令与文件格式仍可能变。
- Cheap Agent：已安装 Claude Code；Node.js 20+；一个充值了几美元的 API key；项目里有能跑、能覆盖改动的测试套件；每个项目执行一次 `/cheapag:allow` 授权。
- 做法 K：已安装并可正常登录 Claude Code；能修改 `~/.claude/settings.json`、`~/.claude/agents/`、`~/.claude/CLAUDE.md`；先备份这些文件；先读三页官方文档确认字段与模型标识符：advisor、sub-agents、model-config；原文称顾问模型需要 v2.1.321 或更高，实际门槛以文档为准；某些套餐下 advisor 需要一次性 `/model fable` 接受额度后再 `/model sonnet` 切回。
- 做法 L：有 Antigravity 使用权限；能同时使用 Gemini、GPT、Claude 等多个模型（作者用 200 美元档订阅，额度条件按你的套餐核对）；能修改项目级规则文件；能打开并核对 agy-fast-io（https://github.com/oil-oil/agy-fast-io）与 oil-dev-skills（https://github.com/oil-oil/oil-dev-skills）仓库；接受非官方插件；至少一个中等规模仓库和两个真实任务（一个 bug 修复、一个小功能）。原文没有给出白名单正文、提示词正文和 swarm 规则正文，执行前必须打开仓库补齐。

## 操作步骤

**做法 A：本机 OpenAI 兼容网关，按任务选模型并自动回退（OmniRoute）**

1. 安装并启动网关。材料能确认的 npm 命令是 `npm i -g omniroute`；Docker 镜像名是 `diegosouzapw/omniroute`。安装/首次运行章节被截断，执行前回 README 补齐。预期：默认监听 localhost:20128。

```bash
npm i -g omniroute
```

2. 在 Dashboard 连接 2–3 个 provider（1 个付费主力 + 1 个免费备用）；被标记 `tos: avoid` 的 provider 默认排除在自动路由之外。

3. Dashboard → Endpoints 复制 OmniRoute key。新调研的 README 明确要 Authorization 头，且全新安装可能没有可用 keyless 目标。

4. 验证端点：

```bash
curl http://localhost:20128/v1/chat/completions -H "Authorization: Bearer YOUR_OMNIROUTE_KEY" -H "Content-Type: application/json" -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'
```

5. 只把一个工具指向 `http://localhost:20128/v1`，模型先用 `auto`、`auto/coding`；有预算红线用 `auto/subscription` 跑一天，确认失败即停且不产生账单；`auto/thrifty` 是先套餐后最便宜付费；`auto/chaos` 会成倍消耗上游调用。

6. 做 A/B：同一批非敏感任务一半走网关、一半直连，记录中断次数、人工切换次数、单位任务 token 成本、p95 延迟、返工率。

**做法 B：在 Codex 内按难度路由并保留证据验收（agent-smith）**

1. 注册本地 marketplace 并安装插件：

```sh
codex plugin marketplace add .
codex plugin add adaptive-router@agent-smith
```

2. 不调用模型，先检查：

```sh
python3 router/scripts/router.py --help
python3 router/scripts/model_registry.py show
```

3. 在新 Codex 任务里启用：

```text
Use $adaptive-route for this task: …
```

预期：按本地 1.0–10.0 难度启发式选模型；验收用 accepted / rejected / unknown，最好自己写确定性检查（测试通过、编译成功、断言满足）。

4. 可选：macOS 构建 Float：

```sh
cd float
sh scripts/build.sh
open "build/Codex Float.app"
```

5. 离线验证：

```sh
python3 -m unittest discover -s router/tests -q
python3 router/benchmarks/benchmark.py demo --run-dir /tmp/agent-smith-demo
python3 router/benchmarks/benchmark.py report --run-dir /tmp/agent-smith-demo --output /tmp/agent-smith-demo-report
```

**做法 C：带面板的本地网关，用一张模型表统一给工具改配置（FlagshipRouter）**

前提：Node.js 20.9+；端口 20128 空闲；与做法 A 默认端口相同，只跑其中一个。

1. 克隆并启动，首次构建要几分钟：

```bash
git clone https://github.com/theRizwan/FlagshipRouter.git
cd FlagshipRouter
npm run launch -- --host 127.0.0.1
```

2. 打开面板后先把默认密码 123456 改掉；在 Endpoint & Key 创建 key；在 Models 选一个标为 Ready 的模型（OpenCode Free 的模型不需要注册即可用）；把工具指向 `http://localhost:20128/v1`，或直接用 CLI Tools 页面写入配置。写入前记录原配置。

3. 验证连通时，README 示例模型名 `gpt-6-astra` 不是真实可用模型，必须换成你实际 Ready 的那个。

**做法 D：为每个会话选 harness/model/effort，并看成本与上下文（Gluon）**

1. 安装最新 release：

```sh
curl -fsSL https://github.com/fidipro/gluon/releases/latest/download/install.sh | sh
```

2. 进入仓库并启动：

```sh
cd your-repo && gluon
```

3. 首次运行按引导连接 agent；描述会话目标，intake agent 读取仓库并推荐 agent/model/effort 与 spec；按 Enter 在该 agent 自己的 UI 中启动，会话运行在 Gluon 的 frame 内。

4. 用 Gluon 查看各会话成本与上下文可观测性；routing 规则查文档，不要照抄本文。

**做法 E：用 LiteLLM 统一多供应商，并按项目看成本（LiteLLM）**

先做 E1，需要虚拟密钥、多租户成本追踪、管理后台再上 E2。

1. 安装 SDK：

```shell
uv add litellm
```

注意：同一环境只能装 `litellm` 或 `litellm-core` 之一。

2. 用同一个函数调不同模型：

```python
import os
os.environ['OPENAI_API_KEY'] = 'your-openai-key'
os.environ['ANTHROPIC_API_KEY'] = 'your-anthropic-key'
from litellm import completion
response = completion(model='openai/gpt-4o', messages=[{'role': 'user', 'content': 'Hello!'}])
```

3. 起本地 AI Gateway：

```shell
uv tool install 'litellm[proxy]'
litellm --model gpt-4o
```

预期：默认监听 4000 端口；用标准 OpenAI SDK 把 `base_url` 指向 `http://0.0.0.0:4000`。生产环境要提供 ACM 证书；没有证书则 `allow_plaintext_alb = true` 按 README 只限 dev/trial。

**做法 F：在 Claude Code 里做多模型分层——先确认命令，再小范围 A/B**

五个变体都只动会话、启动参数或环境变量，不碰网关；模型名与命令语法在材料里无法核实。执行前先确认你的版本确实存在相应命令、参数或环境变量，否则不要照抄。

- F1：会话内先 `/model fable`（某些计划下接受计费确认），再 `/advisor fable`，主模型继续工作；做同任务开/不开顾问的 A/B。
- F2a：会话内尝试 `/model sonnet`、`/advisor opus`；原文是箭头写法 `claude -> model sonnet -> advisor opus`，不要当 shell 命令抄。
- F2b：启动参数两种写法：`claude --model sonnet --advisor opus` 与 `claude --model sonnet --advisor`。先用 `claude --help` 确认 `--advisor` 是“可带模型名”还是“只当开关”；两者不要默认等价。
- F3：用环境变量把子代理固定为 Haiku：`CLAUDE_CODE_SUBAGENT_MODEL=haiku claude`。原文只给这一条，不能等同于完整三模型协作。
- F4：启动参数同时指定顾问和子代理：`claude --advisor opus --subagents haiku`。原文称 Sonnet 主持会话并写代码、Opus 做顾问、Haiku 承接子代理，但在“Haiku 5.5 …”处截断；主模型未在命令中显式指定，advisor 触发时机、子代理派发规则、并发限制都没有给出。先确认 `--advisor` 与 `--subagents` 都存在。

F1–F4 怎么选：目标是别浪费闲置配额，先 F1；目标是让贵模型只出现在判断点，先试 F2b，`--advisor` 不存在再试 F2a；只想让子任务用更轻模型，试 F3；想让 Opus 做顾问、Haiku 做子代理，试 F4。不要混着抄，也不要假设它们能自动叠加。

**做法 G：在 Claude Code 内按窗口/别名路由，并把 429 故障转移钉住（model-relay）**

1. 先把 API key 设成永久环境变量并开新终端：

```sh
export BACKUP_API_KEY="your-api-key"
```

2. 安装插件：

```sh
claude plugin marketplace add cablate/model-relay
claude plugin install model-relay@model-relay
```

3. 让 Claude 陪你配置：`/provider setup`，或 `/provider setup use deepseek for haiku`。手动路径先 `/provider init`，再在插件安装目录执行 `node tools/setup.mjs add <name> --preset <preset> --model <model id> --token env:<VAR>`。

4. 自检：`/provider doctor --ping`，期望看到 `Config OK` 和 `Upstream ping ✓`。

5. 只开一个别名：`node tools/setup.mjs alias haiku backup`。不加 alias，haiku 及所有请求默认留在 Claude，不会外流。

6. 配 429 故障转移链：

```bash
node tools/setup.mjs set failover.chain backup,local
node tools/setup.mjs set providers.local.fallback none
```

429 时只把请求转给 `failover.chain` 第一个 provider，并把这个会话钉住；默认 cooldown 600000 毫秒、retry.attempts 3。不要把 proxy 模式当无感隧道：Claude Code 跑的命令也会走 relay，router 挂了 git/curl/gh 会失败。

**做法 H：按工作类型路由并固定 skill/MCP 版本，先用 verdict 记录结果（cedr）**

前提：cedr 处于 preview；先只准备 2 个 harness、2 条 route，不铺开。

1. 安装 CLI（Linux x86_64 示例）：

```sh
curl -fsSL https://github.com/Sheernox/cedr/releases/latest/download/cedr-x86_64-unknown-linux-gnu.tar.gz | tar -xz
install -m 755 cedr-x86_64-unknown-linux-gnu/cedr ~/.local/bin/cedr
cedr --version
```

2. 写 `~/.config/cedr/routes.toml`，先定义 orchestrator、两个 harness、两条 readings 和一条 route；具体样例按材料中的 `review.code` 结构写。

3. 把 Claude Code 状态行接上：

```json
{ "statusLine": { "type": "command", "command": "cedr route statusline" } }
```

4. 第一周只用 pick + verdict：

```console
$ cedr route pick review.code
$ cedr route verdict p-979e77351990 accepted
```

`cedr route stats` 看每类工作上哪个模型表现最好；verdict 取 accepted、reworked、redone、rejected。

5. 需要固定 skill/MCP 时用 `cedr lint`、`cedr lock`、`cedr verify`；注意 `cedr lock` 只有传 `--introspect` 时才真正运行 MCP server。默认不要开 `cedr route sync`。

**做法 I：贵模型规划、廉价模型写码、测试当裁判（Cheap Agent）**

前提：已安装 Claude Code；Node.js 20+；一个充值了几美元的 API key；项目有能跑、能覆盖改动的测试套件；未执行 `/cheapag:allow` 前不会外发代码。

1. 最省事路径是把下面这段原样贴进 Claude Code：

```text
Set up Cheap Agent (npm: cheap-agent) for me.
1. Ask me: which provider (OpenRouter recommended, DeepSeek or OpenCode Go), and which models (balanced is the default; cheapest, strongest, or my own provider/model).
2. Check that node is 20+ and the claude CLI is installed.
3. If I picked my own model, save {"models":{"implement":"<model>"}} in ~/.config/cheapag/config.json, keeping what else is there.
4. Give me the command to run in my terminal: npx cheap-agent login --preset <my choice, or custom>, and which number to pick for my provider.
5. When I say done, check `claude mcp list` shows cheapag, then tell me to run /cheapag:allow in a new Claude Code session in my project.
```

2. 或手动安装 `npx cheap-agent`，然后在每个项目执行一次 `/cheapag:allow`。

3. 项目级可放 `cheapag.json`：`takeover` 默认 `"sonnet"`，`limits.max_turns` 默认 25，`models` 用安装时的选择。常用命令：`/cheapag:status`、`/cheapag:hook on`、`/cheapag:clean`。

4. 照平常方式提需求；完成后人工审 diff 并自行提交。工具从不 commit 或 push。

**做法 J：按“是否动架构”选模型，长途换模型前先 `/compact`**

前提：已安装并登录 Claude Code CLI；有 2 个以上可并行推进的编码任务；确认你的环境里存在原文所称的 Fable、Opus 或等价模型；确认 `/compact` 与 `/model` 存在；Herdr 的安装与命令原文未给，需查文档。

1. 把编码工作集中到 Claude Code 一个入口，用 Herdr 把并行任务拆成多个 session。
2. 动手前给任务打标签：会改变模块边界、接口、数据流 → `动架构`；否则 → `不动架构`。
3. 按标签派模型：原文规则是涉及架构的改动用 Fable，与架构无关的动作用 Opus；模型名先在你的环境里核对。
4. 中途换模型：上下文已经很长 → 先 `/compact` 再 `/model`；上下文还短 → 直接 `/model`。
5. 做 1–2 周最小试用，记录中途换模型次数、换模型后重新交代背景次数、单任务墙钟时间、返工轮次、架构类改动的事后返工率。

**做法 K：把 Claude Code 配成四模型团队，落到三个用户级文件**

目标：主会话写代码、跑测试；advisor 只出主意；checker 子代理只测试和挑错、不编辑；Explore 子代理负责检索与查文档，并顶替内置 Explore。价值在于把分工落到 `~/.claude/settings.json`、`~/.claude/agents/*.md`、`~/.claude/CLAUDE.md` 三个文件，并给出重启后的验收判据。注意：这是用户级改动，会影响你所有项目。

0. 先核对官方文档，不可跳过。原文引用的模型名与版本号在本材料中无法核实；先确认 `advisorModel`、`CLAUDE_CODE_SUBAGENT_MODEL`、agents 文件格式、子代理 `model`/`tools` 字段当前是否存在、模型标识符怎么写：

```text
https://code.claude.com/docs/en/advisor
https://code.claude.com/docs/en/sub-agents
https://code.claude.com/docs/en/model-config
```

文档与下面内容冲突时，按文档改，并记录改了什么。

1. 备份所有将被修改的文件：`~/.claude/settings.json`、`~/.claude/CLAUDE.md`，以及 `~/.claude/agents/` 下已有的 `checker.md`、`Explore.md`（若存在）。要求：所有改动合并成一个 diff 展示，得到确认后才应用；`settings.json` 只许合并、不许删除已有配置。

2. 检查版本。原文称 advisor 所用模型需要 v2.1.321 或更高；低于此版本执行 `claude update`。实际门槛以第 0 步文档为准。

3. 改 `~/.claude/settings.json`（合并写入）。原文要落实三件事：主模型设为 sonnet、顾问模型设为 fable（字段名 `advisorModel`）、环境变量 `CLAUDE_CODE_SUBAGENT_MODEL` 设为 haiku。并做一条诊断：如果现有配置把主模型 effort 调到默认值以下，要提示你——原文说法是“effort 更低时，主模型咨询顾问的次数会少得多”。

4. 创建 `~/.claude/agents/checker.md`。模型设为 opus（按文档替换为实际标识符）；职责：跑测试、读 diff、试边界用例；永不编辑代码；每个真实问题都要报告文件名、行号或命令、以及实际观察到的现象。

5. 创建 `~/.claude/agents/Explore.md`。字段 `name: Explore`、模型 haiku（按文档替换）、工具只给只读（不得有 Write、Edit）。原文给出的关键机制：用户级同名 `Explore` 子代理会顶替内置 Explore；否则内置 Explore 跑在主模型上、且忽略 `CLAUDE_CODE_SUBAGENT_MODEL`。职责：找文件、grep、读文档、返回简短结构化结果。

6. 往 `~/.claude/CLAUDE.md` 追加行为规则（原文逐字，可直接放入）：

```text
Consult the advisor before you commit to an approach, when the same error comes back twice, and before you say a task is done. Run the checker before you call any task done. Send search and docs lookup to Explore. If a subagent must write code, give it model sonnet, never haiku. For a small task that fits in this session, skip subagents and do it yourself.
```

要点：顾问在“定方案前 / 同一错误第二次出现 / 宣布完成前”触发；checker 在“宣布任何任务完成前”必跑；检索交给 Explore；需要写代码的子代理给 sonnet、绝不给 haiku；小任务不用子代理。

7. advisor 的一次性授权。某些套餐下，顾问模型需要一次性同意使用额度；若你的账号属于这种，原文要求先 `/model fable` 接受一次，再 `/model sonnet` 切回。

8. 完整 prompt 原文（作为交给 Claude Code 执行的整段指令）：

```text
Set up my Claude Code as a 4-model team, at user level so it works in every project:
- Sonnet 5.5 = main session. It builds: writes code, runs tests.
- Fable 5.2 = advisor, the brain. It only advises, never writes code.
- Opus 5.5 = checker subagent. It tests finished work and tries to break it, never edits.
- Haiku 5.5 = search and research. It replaces the built-in Explore agent and is the default for other subagents.

Before you change anything, read Anthropic's official docs:
https://code.claude.com/docs/en/advisor
https://code.claude.com/docs/en/sub-agents
https://code.claude.com/docs/en/model-config
Use only the settings, fields and file formats those pages describe. If something below doesn't match the docs, follow the docs and tell me what you changed.

Steps:
1. Check my Claude Code version. Fable 5.2 needs v2.1.321 or later. If it's older, run claude update, or tell me to.
2. In ~/.claude/settings.json: main model sonnet, advisorModel fable, env CLAUDE_CODE_SUBAGENT_MODEL haiku. Merge, never delete my settings. If my settings lower the main model's effort below its default, tell me: at lower effort the main model consults the advisor far less.
3. Create ~/.claude/agents/checker.md with model opus. It runs the tests, reads the diff and tries edge cases. It never edits code. It reports each real problem with the file, the line or command, and what it saw.
4. Create ~/.claude/agents/Explore.md with name Explore, model haiku and read-only tools (no Write, no Edit). A user subagent named Explore replaces the built-in one, which otherwise runs on my main model and ignores CLAUDE_CODE_SUBAGENT_MODEL. It finds files, greps, reads docs and returns short structured results.
5. Add to ~/.claude/CLAUDE.md:
"Consult the advisor before you commit to an approach, when the same error comes back twice, and before you say a task is done. Run the checker before you call any task done. Send search and docs lookup to Explore. If a subagent must write code, give it model sonnet, never haiku. For a small task that fits in this session, skip subagents and do it yourself."
6. Fable as advisor needs a one-time usage-credit consent on some plans. If mine needs it, stop and tell me: run /model fable once, accept, then switch back with /model sonnet.

Back up every file before you edit it. Show me all changes as one diff and apply them only after my yes.

Done means: after a restart, Claude Code starts on Sonnet, /advisor shows fable, and /agents lists checker (opus) and Explore (haiku).
End with three headings: Changed, Needs me, How to check it works. Under the last one tell me: an "Advising" line appears when Fable is consulted, Ctrl+O shows its advice, and /usage shows what it cost.
```

原文模型名为 Sonnet 5.5 / Fable 5.2 / Opus 5.5 / Haiku 5.5，版本号 v2.1.321；这些标识在本次材料中无法核实，替换成文档里真实存在的模型名再执行。

9. 重启并验收：Claude Code 以 Sonnet 启动；`/advisor` 显示 fable；`/agents` 列出 checker（opus）与 Explore（haiku）。运行时观察：顾问被调用时出现 `Advising` 行；`Ctrl+O` 能看到顾问建议；`/usage` 能看到成本。若字段或显示项不存在，按第 0 步文档修正，不要硬套。

**做法 L：跨厂商交叉评审、廉价子代理探路、只读白名单减少审批等待（Antigravity/Gemini）**

前提：有 Antigravity 使用权限，能同时用到 Gemini、GPT、Claude 等多个模型；至少一个中等规模仓库和两个真实任务；能修改项目级规则文件；能打开并核对作者的两个仓库。原文只给仓库链接，白名单内容、提示词正文和 swarm 规则正文未出现在材料里，执行前必须打开仓库确认与当前版本兼容。

1. 按任务类型分配模型（原文判断，不是自动配置）：
   - 复杂仓库的分支管理和版本管理、希望模型主动告诉你当前存在什么问题 → Claude；
   - 主力开发 → Gemini 4 Carbon（作者称效果优于 Argon、消耗相近；未独立核实）；
   - 写课程、视频脚本、需要交流感和文案 → Gemini；
   - 方案与代码 → 让 GPT 做一轮交叉评审，只指出问题，不代写代码。作者理由是 Gemini 系列比较自信，方案和代码经常缺胳膊少腿却自认为不错。
   预期：每个角色只做自己那一段，不让一个模型既写又审。

2. 减少云端审核等待。安装作者的非官方插件 agy-fast-io（https://github.com/oil-oil/agy-fast-io），按仓库说明把纯只读命令（列目录、读文件、搜索）加入免审白名单；写操作保留人工审批。材料没有给出白名单正文和提示词正文，必须打开仓库后照做。在配好白名单之前，不要用 Turbo 模式跑复杂任务；原文称单次云端审核约 1–3 秒，复杂任务会触发几十次，累计几分钟。

3. 加速代码探索。原文称 Antigravity 原生子 Agent 只支持 inherit / flash_lite / flash / pro 四档，不含 Gemini 4 系列；但内部有一个 swarm Skill，相当于多 Agent 协作系统，可派发任意模型（包括 Antigravity 内的 Claude）的子 Agent。做法是把一条项目规则配进去：需要探索代码时走 swarm + Gemini 4 Hydrogen (Low)。作者把这条规则做进了 oil-dev-skills 套件的 oil-explore（https://github.com/oil-oil/oil-dev-skills）；新项目开新话题时靠这条规则加速代码探索。材料没有给出规则正文，需打开仓库后照做。

4. Orchestrator（计划模式）只作为待验证项。机制是用能力强的模型先探索代码、写方案，再让较便宜的模型（如 Gemini 4 Hydrogen）按方案执行。作者只简单项目试过、自认测试不够，不下结论；原文还指出它对单纯读文件、问问题没有加速，因为读代码全在第一阶段、跑的还是最慢的规划模型。不要直接写进团队默认流程。

5. 最小试用。挑一个中等规模仓库，选两个真实任务（一个 bug 修复、一个小功能）。A 组：单模型 Gemini 直接做；B 组：Gemini 写 + GPT 只做一轮评审（只指出问题、不代写代码）+ 探索阶段先用廉价子 Agent 跑一遍。各跑 2–3 次。记录任务总耗时、人工或云端审批次数与累计等待秒数、评审指出的问题数与被采纳数、返工轮次、每任务额度消耗、一周额度是否够用。

选择提示：如果你同时有 Gemini、GPT、Claude 多模型，且痛点是主力模型又写又审、读文件慢、审批等待多，先试 L；只读白名单从小开始，Orchestrator 先别上。L 与 A–K 不假设能自动叠加，先分开试。

**做法 A–L 怎么选（短表）**

- 跨供应商配额、限流、死 key、工具输出烧 token：先 A。预算红线用 `auto/subscription`；想先榨套餐再降最便宜付费用 `auto/thrifty`；`auto/chaos` 会成倍消耗上游调用。
- 已在用 Codex、想让常规任务别总调最重模型，并用确定性 grader 验收：先 B。
- 想让多个工具从一个面板统一改配置、先拿免注册免费模型打通：做 C。
- 痛点是不知任务该交给哪个 harness/模型/effort，或想按会话看成本与上下文：先 D。
- 想先在 Python 代码里收敛多 provider 调用，或需要按项目/用户成本追踪：做 E；E1 只动代码，E2 起网关后才碰端口和密钥。
- 日常用 Claude Code、另有闲置模型配额：先 F1。
- 日常用 Claude Code、对成本敏感、想让贵模型只出现在判断点：先 F2b，`--advisor` 不存在再试 F2a。
- 只想让子任务用更轻模型：先 F3。
- 想让 Opus 做顾问、Haiku 做子代理：先 F4，先确认 `--advisor` 与 `--subagents` 都存在。
- 模型设置全局绑定所有窗口，或遇 429 限流且你有备用 Anthropic 兼容端点：试 G。
- 已在 Claude Code、Codex、Cursor 或 Gemini 之间分配工作，想把规则写成 route：先试 H 的 pick + verdict。
- 任务中等规模、项目有可运行测试，想让 Opus 只做规划和决策、廉价模型写码：先做 I。
- 同时推进多个互不干扰任务，想按是否动架构选模型并管理换模型上下文：试 J。
- 你已经在 Claude Code 里，愿意改用户级配置，并接受先备份、看 diff、再应用：先试 K。K 与 F1–F4 不同：K 不是单条启动命令，而是三个文件的用户级配置；材料未说明它能与 F1–F4 或 A–J 自动叠加，先分开试。
- 同时有 Gemini、GPT、Claude 多模型，想按任务类型分模型、用另一家模型交叉评审、用廉价子 Agent 探路、用只读白名单减少审批等待：先试 L。白名单只放只读命令，Turbo 模式先别跑复杂任务；Orchestrator 只当待验证项。
- A 和 C 默认都用 20128，先选一个跑通；E 默认 4000，model-relay 默认 8950，不撞端口不代表能自动叠加。

## 怎么判断变好了

通用要求：同一批真实任务、同一提示词、同一代码库快照；至少保留默认配置作基线；记录是否完成、人工返工次数、token 或费用、端到端耗时、是否一次通过。

- OmniRoute：先 1–2 天跑通并确认 `auto/subscription` 真的失败即停，再连续 1–2 周对照；记录中断次数、人工切换次数、单位任务成本、p95 延迟、返工率。若中断或人工切换没有下降，或配额显示与实际账单明显不符，或压缩导致答案质量下降，或网关本身成为新的不稳定源，就停用。
- agent-smith：先跑离线 demo/report；再选 5–10 个日常任务，一组用 `$adaptive-route`，一组固定用平时最重的模型；成功标准是接受率不下降且参考成本或实际 token 明显下降；unknown 比例过高先检查判分与计量。
- FlagshipRouter：半天内跑通：clone + `npm run launch -- --host 127.0.0.1`，先改默认密码；用 curl 打通一条请求；只给一个当前已在用的工具写配置并记录原配置。出现“模型连通但结果明显变差”或“配置互相覆盖且难回滚”就停止推广。
- Gluon：选一个边界清晰的小任务，让 intake agent 推荐 agent/model/effort，再手动用第二个 harness 做同一任务比较；看单位任务成本、上下文占用、选择成本与补问次数、任务完成质量。材料没给试用时长，只建议小范围试。
- LiteLLM：SDK 最小验证半天内做完，网关最小验证再半天；先用同一个 `completion()` 调两个 provider，再用 OpenAI SDK 指向 4000 打通一条请求；只接 1–2 个模型，连续几天看成本追踪与失败率。两天内说不清省了几步、成本数字是否可信，就停在 SDK 层。
- F1–F4：先 `claude --help` 或 `/help` 确认命令/参数/环境变量存在。F2b 用 2–3 个有明确对错标准的任务跑三组：`claude --model sonnet`（基线）、`claude --model sonnet --advisor opus`（若 help 只显示开关则用 `--advisor`）、`claude --model opus`（可选对照）。F4 用 3–5 个任务覆盖单文件小改、跨多文件改造、先调研再动手，默认单模型 vs `claude --advisor opus --subagents haiku` 各跑一次。记录 `/cost` 或等价用量、是否一次通过、返工次数、耗时、顾问是否实际介入、子代理被派发什么任务、子任务输出被人工重写比例。只有返工下降且总成本不升，或同成本明显少返工，才纳入默认；命令不存在或质量下降且成本未降就停。
- model-relay：先只接一个备用 provider、只开 haiku alias，至少覆盖一次真实 429 或配额耗尽；看 429 中断与自动故障转移、按窗口切换是否隔离、别名路由是否精确、重试与最终成功率、proxy 模式副作用。
- cedr：1 人 × 2 周，只配 2 个 harness 和 2 条 route；第一天确认 `cedr route pools` 能读到真实剩余量，读不到就停；第一周只用 pick + verdict，每类工作积累 15–20 次后用 `cedr route stats` 看分布；默认不开 sync。
- Cheap Agent：选一个中等规模真实任务（新功能或真实 bug，跨几个文件），先记录纯 Claude Code 基线：Opus token、轮数、最终测试通过数；再执行 `/cheapag:allow`，保持默认 `takeover="sonnet"`、`limits.max_turns=25`，用同一提示词重跑；记录 `/cheapag:status` 里的廉价模型花费；再开 `/cheapag:hook on` 跑一轮。若测试跑不起来、质量下降、Opus token 不降、廉价模型花费反而更高、或合规不允许代码外发，就停用。
- J：选 5–8 个真实编码任务，动手前各打 `动架构`/`不动架构` 标签；记录中途换模型次数、换模型后重新交代背景次数、单任务墙钟时间、返工轮次、架构类改动事后返工率。1–2 周后没有改善，或 `/compact` 导致的重复解释代价大于收益，就降级为只保留“按架构相关性选模型”的思路。
- K：先只做验收，不做效果承诺：重启后确认 Claude Code 以 Sonnet 启动、`/advisor` 显示 fable、`/agents` 列出 checker（opus）与 Explore（haiku）；跑一个日常任务，确认顾问被调用时出现 `Advising` 行、`Ctrl+O` 能看到建议、`/usage` 能读到成本。然后选 3–5 个真实任务，默认单模型 vs K 各跑一次，记录返工次数、总 token/费用、端到端耗时、顾问实际介入次数、checker 是否发现真实问题、Explore 是否减少主模型检索 token。只有质量不降且成本下降，或返工明显减少且成本可接受，才保留；若字段/显示项不存在、顾问几乎不介入、checker 只复述构建结果、或成本上升而返工未减少，就回滚。
- L：先只读白名单从小开始，只放列目录、读文件、搜索；写操作保留人工审批，观察是否误放行。用两个真实任务各跑 2–3 次：A 组单模型 Gemini 直接做；B 组 Gemini 写 + GPT 只做一轮评审 + 探索阶段先用廉价子 Agent。记录任务总耗时、审批次数与累计等待秒数、评审指出的问题数与被采纳数、返工轮次、每任务额度消耗、一周额度是否够用。判断：审批等待明显下降且返工轮次不上升，才算通过；若 GPT 评审采纳率很低、问题重复已知，就降级为仅思路参考；Orchestrator 先在玩具项目上对比同一任务的耗时与失败率，再决定是否进入正式流程。

## 常见坑

- 把 `--advisor` 不带模型名当成与 `--advisor opus` 等价。材料没有说明不带模型名时代替的是哪个顾问、何时触发、如何配置；两种写法先分开对照。
- 把推文里的“Sonnet builds, Haiku swarms, Opus advises”或“输出更好、token 花得更少”当成完整方案。两条推文都只给了命令和主张，没有配置、数据或对比；Haiku swarms 没有命令或触发方式。
- 把 F4 的 `claude --advisor opus --subagents haiku` 当成完整三模型方案。原文只给一条启动命令，Haiku 职责在“Haiku 5.5 …”处截断，advisor 触发时机与子代理派发规则都没有。
- 把 F4 与 F2b 混同。F4 没有显式 `--model sonnet`，多了 `--subagents haiku`；F2b 显式设主模型并只挂 advisor。先分开试。
- 在未确认 `--subagents` 存在时照抄 F4。先 `claude --help` 或 `/help` 确认参数；不存在就停。
- 把 Cheat Agent 当“装上就省钱”。它依赖可运行测试和书面短任务；无测试、极小任务、最难 bug 可能无收益或略差。
- 未执行 `/cheapag:allow` 就以为代码已外发，或反过来没注意已经授权。不要把 API key 粘到聊天里；用 `npx cheap-agent login` 在终端输入。
- 以为 Cheap Agent 会 commit/push。它从不 commit 或 push，改动未提交，必须人工审 diff。
- 把 OmniRoute 当零凭证必然可通。新调研的 README 要 Authorization 头，且全新安装可能没有可用 keyless 目标。安装/首次运行章节被截断，执行前回 README Quick Start 补齐。
- 照抄 OmniRoute 的 combo 策略表。本次原文在策略表第 3 条处被截断，round-robin 及后续策略语义不完整。
- 把 `auto/subscription` 和 `auto/thrifty` 混用；有预算红线就用 subscription。把 `auto/chaos` 当故障注入也不对，它是并行 fan-out，会成倍消耗配额。
- 忘记 OmniRoute 是单点：它挂了所有客户端一起挂；保留直连回退路径。只信 dashboard 也不行，savings 卡片不等于你自己的 p95 和账单。
- 端口撞车：OmniRoute 与 FlagshipRouter 默认都监听 localhost:20128；LiteLLM 默认 4000，model-relay 默认 8950。
- FlagshipRouter 默认面板密码是 123456；建议先用 `--host 127.0.0.1` 只本地监听，并先改密码。README 自陈测试套件带已知失败，不要当自己装坏了。
- 拿 README 的示例模型名当真实模型：FlagshipRouter 的 `gpt-6-astra` 只是示例。CLI Tools 页面会代替你写工具配置，可能覆盖原配置，先记录原配置。
- 照抄 Gluon 的路由配置；给定材料只是 README landing page，细节在 docs。Gluon 安装方式是用管道执行远端脚本，材料没有给出校验步骤；先在非关键、已纳入版本控制的仓库里试。
- LiteLLM 的 `litellm` 与 `litellm-core` 不能同环境同装。MCP OAuth 可能需要预注册 OAuth app 并配置 credentials；生产部署别用明文，`allow_plaintext_alb = true` 按 README 只限 dev/trial。
- 把 Claude Code 的 `/advisor` 当必然存在；执行前先确认版本支持。不要照抄 `/advisor fable`、`/model fable` 或 F2a/F2b/F3/F4 里的模型名；Sonnet、Opus、Fable、Haiku 版本名都无法从材料核实。
- 以为挂上顾问就会自动介入。必须观察它是否真的给出可读建议；忘记记 `/cost` 和耗时会漏掉顾问与子代理的额外开销。
- 把 `CLAUDE_CODE_SUBAGENT_MODEL=haiku claude` 当成完整三模型协作方案，或以为设置子代理模型就等于“只读 Haiku”。它只指定子代理用哪个模型，不规定只读权限。
- 把 F1–F4 写进团队默认流程。原文被截断、没有文档链接和版本号，先在个人、单项目、单会话里试；也不要默认它们能与 A–J 的网关/路由自动集成。
- 以为装了 model-relay 就自动把请求导出去。不加 alias，haiku 及所有请求默认留在 Claude；在已经跑着 Claude Code 的 shell 里 export key 也不一定生效，要写成永久变量并开新终端。
- 在任意目录直接跑 `node tools/setup.mjs`。手动路径要在插件安装目录里跑。
- 拿只会 OpenAI Chat Completions 的端点直接接 model-relay；它要求 provider 能接 Anthropic `/v1/messages`。
- 把 429 故障转移理解成“全局切换”。429 时只把请求转给 `failover.chain` 第一个 provider，并把这个会话钉住。
- 把 proxy 模式当无感隧道。Claude Code 跑的命令也会走 relay 当盲隧道，router 挂了它们就失败。
- 从 0.6 及更早版本升级只更新插件。0.7+ 只读 `"format": 2`，要迁移。
- 把 cedr 当稳定标准。它处于 preview；用量接入只具体说明 claude-statusline 与 codex 两种 kind；Council 的报告格式、quorum 默认值、merge 输入形态需读 docs；`cedr route sync` 会外发数据，默认不要开；`cedr lock` 只有传 `--introspect` 时才真正运行 MCP server。示例输出里的百分比是演示样例，不是实测结论。
- 换模型前无脑 `/compact`。`/compact` 会丢细节；压缩前把接口签名、报错、决策理由写到文件或消息里。
- 把 K 当成单条命令或完整效果方案。K 的价值是三个文件的配置和验收方式；材料没有给出任何效果数据。模型名 Sonnet 5.5 / Fable 5.2 / Opus 5.5 / Haiku 5.5 与 v2.1.321 都无法核实，必须按官方文档替换。
- 不备份就改用户级配置。K 会影响所有项目；必须先备份、把所有改动合成一个 diff、得到确认后再应用，`settings.json` 只许合并、不许删除已有配置。
- 忽略 effort 与顾问咨询的耦合。原文说法是“effort 更低时，主模型咨询顾问的次数会少得多”；把主模型 effort 调低可能让顾问形同虚设。
- 以为用户级 Explore 一定生效。原文给出的机制是：用户级同名 `Explore` 子代理会顶替内置 Explore；否则内置 Explore 跑在主模型上、且忽略 `CLAUDE_CODE_SUBAGENT_MODEL`。需要写代码的子代理要给 sonnet、绝不给 haiku；小任务不用子代理。
- 不验收就宣布完成。K 的验收要看重启后 `/advisor`、`/agents`、`Advising`、`Ctrl+O`、`/usage` 是否真实存在；不存在就按文档修正，不要硬套。
- 把 Antigravity 的 Turbo 模式当默认加速。原文称工具调用要走 1–3 秒云端审核，复杂任务会触发几十次；白名单没配好前不要用 Turbo 跑复杂任务。
- 把只读白名单配成“什么都免审”。先只放列目录、读文件、搜索，写操作保留人工审批，观察是否误放行。
- 以为原生子 Agent 能用 Gemini 4。原文称只有 inherit / flash_lite / flash / pro 四档，不含 Gemini 4 系列；要用 swarm Skill 派发，规则正文在仓库里，材料未给出。
- 照抄 Orchestrator 计划模式。作者自认测试不够，只简单项目试过；纯读文件、问问题不会加速，因为读代码全在第一阶段、跑的还是最慢的规划模型。
- 把跨厂商评审当自动质量保证。原文没有量化数据；GPT 评审若采纳率低、问题重复已知，就降级为仅思路参考，不要当强制门禁。
- 忽略订阅条件。作者用 200 美元档订阅，重度开发 + Codex review 下周额度最后一两天仍需额外做点重活才用得完；你的套餐额度不同，不能照搬。

## 证据与来源

本节区分可照做的操作、项目自述数据和材料边界。所有效果数字都需要自测；本手册只把可复制的命令、配置和提示词当作操作依据，把项目自述数字和作者主张当作待验证信息。

- Cheap Agent：可照做的有 npm 包 cheap-agent、`npx cheap-agent`、Claude Code 代为安装的提示词、`/cheapag:allow`、`/cheapag:status`、`/cheapag:hook on`、`cheapag.json` 的 takeover/limits.max_turns/models、更新与卸载命令。作者自报但无第三方复核的数据：demo 同一提示下纯 Claude Code 233k Opus token，加 Cheap Agent 132k，廉价模型花费 $0.007；同一功能纯 Claude Code 154k / 5 轮，加 Cheap Agent 57k / 2 轮，均通过全部测试；SWE-bench Verified 日常 7 个 bug 1.6M→655k，双方 7/7；最难 9 个 3.0M→1.3M，6/9 对 7/9。作者承认最难一档略逊、极小任务没有收益、Windows 为 beta、所有数字都是单方单次运行，没有样本量/重复次数/随机性控制；本次材料只有 README，未查看源码。
- OmniRoute：可照做的有 npm 包 omniroute、Docker 镜像、默认端点 `http://localhost:20128/v1`、Dashboard → Endpoints 取 key、auto 别名表、`/dashboard/free-tiers`、`tos: avoid` 默认排除。项目自述但未验证的有 375 个 provider、1475 个 chat 模型 ID、MCP 110 工具、压缩省 15–95% 等；材料在策略表第 3 条处截断，安装/首次运行、combo 完整策略和压缩配置不完整。
- agent-smith：可照做的有 `codex plugin marketplace add .`、`codex plugin add adaptive-router@agent-smith`、`Use $adaptive-route for this task: …`、离线 benchmark demo/report、unittest 命令、Float 构建。原文给出 6 个公开合成任务 × 三种策略 × 单次尝试的表：Fixed Astra 102,162 token / $1.237460；Fixed 6.1 Sol 105,285 / $0.1921092；Local router 101,392 / $0.1621807。作者称相对 Fixed Astra 参考成本少 86.89%、实际 token 少 0.75%，但这是单次选择器实验，USD 是冻结参考价，不是 Codex 订阅账单。
- FlagshipRouter：可照做的有 `git clone`、`npm run launch`、`--host 127.0.0.1`、Endpoint & Key、Models、CLI Tools、providers 策略 JSON、测试命令。只有仓库元信息，没有性能、成本、质量或用户案例数据；测试套件带已知失败，示例模型名不是真实可用模型。
- Gluon：可照做的有 install.sh/install.ps1、`cd your-repo && gluon`、intake agent 生成 agent/model/effort 与 spec、多会话人工切换。给定文本是 README landing page，routing.yaml、权限、工具供给、安全隐私、成本分析示例、故障排查都在 docs；没有效果数据。
- LiteLLM：可照做的有 `uv add litellm`、`completion(model=…)`、`uv tool install 'litellm[proxy]'`、`litellm --model gpt-4o`、OpenAI SDK 指向 4000、MCP 的 tools type mcp 请求体。100+ 提供商、虚拟密钥、多租户成本追踪等是项目自述；Terraform 输出段、A2A 与 MCP Bridge 在材料中截断。
- F1：可照做的有 `/model fable`（某些计划下接受计费确认）与 `/advisor fable`；原文称 Opus 5.5 继续工作、Fable 5.1 作为顾问，但正文在关键处中断，顾问何时介入未给出；模型名与文档地址无法核实。
- F2a：可照做的原文配置行是 `claude -> model sonnet -> advisor opus`；按箭头还原的尝试形态是 `claude`、`/model sonnet`、`/advisor opus`，确切语法待核对；Haiku 那一环在“Haiku 5.5”处截断。
- F2b：可照做的原文有两种写法：`claude --model sonnet --advisor opus` 与 `claude --model sonnet --advisor`；前者明确顾问模型，后者只打开顾问。执行前必须用 `claude --help` 或 `/help` 确认 `--advisor` 存在并看清是否接受模型名；原文没有版本号。“不为不需要 Opus 的工作付 Opus 的价格”是作者主张。
- F3：可照做的原文命令是 `CLAUDE_CODE_SUBAGENT_MODEL=haiku claude`；原文声称同时运行 Sonnet 5.5、Haiku 5.5、Opus 5.5，但只给子代理模型这一个配置，没有主模型设置、任务划分和子代理触发方式。“更好的输出，消耗的 token 少得多”是作者主张。
- F4：可照做的原文命令是 `claude --advisor opus --subagents haiku`；原文分工为 Sonnet 主持会话并写代码、Opus 作为 advisor、Haiku 作为 subagent；在“Haiku 5.5 …”处截断，Haiku 承担哪类子任务、advisor 触发时机、子代理派发规则、并发或深度限制均未给出。没有版本号、文档链接、量化数据；“输出更好、token 花得更少”只是作者主张；信息为二手转述，可核实互动量只有 21 赞、3 次转发、11 条回复。
- model-relay：可照做的有安装插件、`/provider setup`、`/provider init`、`node tools/setup.mjs add`、`/provider doctor --ping`、alias 命令、429 failover.chain 与默认值、statusline、proxy enable/disable、0.6 升级迁移。定位是单人本地守护进程；provider 必须能接 Anthropic `/v1/messages`；给定调研正文在“对应研究问题”处截断，没有成本、质量、稳定性或用户案例数据。
- cedr：可核对的操作性内容有安装命令与平台矩阵、routes.toml 样例、statusLine JSON、`cedr route pick/verdict`、`cedr route stats/pools/list`、`cedr council plan/merge`、`cedr lint/lock/verify` 与 `--introspect` 警告。只是作者主张、没有证据的是：路由“挑得对”、Council 能提高评审质量、锁文件能防住真实风险；原文没有效果数据、案例研究或对比实验，仓库仅 42 stars、单一组织维护、preview 阶段，示例输出里的百分比是演示样例。
- J：可照做的有把编码收敛到 Claude Code 一个入口、用 Herdr 管多个 session（原文未给 Herdr 命令）、按“动架构/不动架构”打标签、动架构用 Fable、不动架构用 Opus、长途换模型前先 `/compact` 再 `/model`。原文在“- 不用”处截断，第 5 条缺失；Fable/Opus 的名称、版本、可用性无法核实；只有作者个人几个月的工作习惯陈述，推文 69 赞、8 回复，没有指标、对比或结果数据。
- K（@0xCodila）：可照做的是一条完整配置 prompt，要求把 Claude Code 配成用户级四模型团队，并落到 `~/.claude/settings.json`（主模型 sonnet、`advisorModel` fable、env `CLAUDE_CODE_SUBAGENT_MODEL` haiku）、`~/.claude/agents/checker.md`（model opus，只测试/挑错、不编辑）、`~/.claude/agents/Explore.md`（name Explore、model haiku、只读工具、顶替内置 Explore）、`~/.claude/CLAUDE.md`（顾问/检查/检索/写代码子代理/小任务的行为规则）。原文还给出验收方式：重启后 Claude Code 以 Sonnet 启动、`/advisor` 显示 fable、`/agents` 列出 checker 与 Explore；顾问被调用时出现 `Advising` 行、`Ctrl+O` 看建议、`/usage` 看成本。材料边界：它引用的 Sonnet 5.5 / Fable 5.2 / Opus 5.5 / Haiku 5.5 与版本号 v2.1.321 无法核实；作者没有给出任何效果数据；字段、文件格式、模型标识符必须以官方 advisor / sub-agents / model-config 三页为准；这是用户级改动，会影响所有项目，必须备份、合成 diff、确认后应用。
- L（@I_am_oil_oil）：可照做的有按任务类型分配模型（Gemini 写、GPT 评审、Claude 管复杂分支和版本）、安装 agy-fast-io 并整理只读白名单、用 swarm + Gemini 4 Hydrogen (Low) 做代码探索、oil-explore 规则；原文给出的等待数据是单次云端审核约 1–3 秒、复杂任务可能几十次、累计几分钟；原生子 Agent 只有 inherit / flash_lite / flash / pro 四档且不含 Gemini 4 系列；作者用 200 美元档订阅，重度开发 + Codex review 下周额度最后一两天仍需额外做点重活才用得完。仅为作者主张、无验证的是 Carbon 优于 Argon 且消耗相近、Claude 更缜密、Hydrogen 能解决读文件慢、GPT 评审搭配效果好。材料边界：强绑定 Antigravity 和特定订阅；模型名按作者叫法（Gemini 4 Argon/Carbon/Hydrogen、Claude Opus 5.5）无法独立核对；两个仓库的白名单、提示词和 swarm 规则正文未出现在材料中；Orchestrator 作者自认测试不足；没有量化指标，需自行设计验证。
- 材料边界：这些项目、F3 推文、J 推文、@0xVeyyro 推文、@wanerfu 推文、@0xCodila 推文、@I_am_oil_oil 推文以及各 Claude Code 扩展的材料都未说明可以互相集成；同时安装或叠加配置时不要假设请求一定经过你以为的那一层。

## 依据的调研

- [diegosouzapw/OmniRoute](../research/radar/2026-10-02/531-diegosouzapw-omniroute.md)：值得一试，可以小范围试：先把 OmniRoute 当作本地 OpenAI 兼容网关装起来（npm i -g omniroute → localhost:20128 → 用 model=auto 打通），再把一个编码工具指向它，用它验证「按任务选模型别名 + 配额耗尽自动回退」这一套是否真能减少中断；理由是原文给出了可照抄的安装与调用命令和模型别名清单，但节省比例、免费额度等数字都是项目自述，且原文截断、缺少配置细节，不宜直接采纳。
- [Chengjun023/agent-smith](../research/radar/2026-10-05/1229-chengjun023-agent-smith.md)：值得一试，可以小范围试：按 README 给出的命令装上 Codex 插件、用 $adaptive-route 跑日常任务，并先用离线 benchmark demo 验证流程，理由是全套安装/运行/评测步骤可照抄，但其实证只有 6 个合成任务、单次尝试的小规模试点，路由效果是否在你的任务上成立必须自己复现。
- [theRizwan/FlagshipRouter](../research/radar/2026-10-07/1614-therizwan-flagshiprouter.md)：值得一试，可以小范围试：在本地用 FlagshipRouter 起一个 OpenAI 兼容网关，把 Claude Code、Cline 等已在用的编程工具统一接到一个模型入口、按任务切换模型；但原文只是接线层的 README，没有质量或收益数据，且有已知测试失败和默认密码风险，先局部验证再决定是否写进手册。
- [fidipro/gluon](../research/radar/2026-10-09/2068-fidipro-gluon.md)：值得一试，建议小范围试：在非关键仓库按 README 的安装命令安装，然后 cd your-repo && gluon 启动，让 intake agent 为同一任务推荐并对比不同 harness/model/effort，同时记录成本与上下文。理由是原文给出了可照做的安装与启动流程，并把任务匹配和成本/上下文可观测做成了产品能力，但 README 未展开 routing.yaml、权限配置和效果数据，需要自行验证。
- [BerriAI/litellm](../research/radar/2026-10-10/2267-berriai-litellm.md)：值得一试，值得小范围试：照 README 给的命令先在本地起一个 LiteLLM 网关（uv tool install 'litellm[proxy]' + litellm --model gpt-4o），把 1–2 个模型统一成 OpenAI 格式并开启花费追踪，用自己的成本和失败率数据决定是否推广；它给出了可复制的安装与调用步骤，但整体是特性索引+宣传，实际收益需自测。
- [@polydao: Claude Code 提示：一旦 Opus 5.5 成为你的主要模型，就别让你的 Fable 5.1 配额白白浪费了](../research/radar/2026-10-12/2641-claude-code-opus-5-5-fable-5-1.md)：值得一试，可以小范围试：在支持 /advisor 的 Claude Code 里先用 /model fable 接受计费、再 /advisor fable 把次要模型挂成顾问，让主模型继续干活；理由是原文给了可照抄的命令，但正文在关键处被截断、模型名与文档地址都无法核实，只能先自测确认命令真实存在再考虑写进手册。
- [@rvaniaaaa: 这太他妈的棒了。Anthropic 的文档描述了运行 Opus 最聪明的方法之一](../research/radar/2026-10-14/3029-anthropic-opus.md)：值得一试，建议在 Claude Code 里小范围试一遍「Sonnet 主跑 + Opus 顾问」的分工，用成本和质量双指标对比后再常规化；理由是原文给出了可直接照做的模型分工配置思路，但推文被截断、命令确切语法和 Haiku 那一环都没写全，不足以直接采纳。
- [@sector_sol: 停止支付 opus 来做 haiku 的家庭作业。这个 claude 代码设置简直是黄金。](../research/radar/2026-10-16/3761-opus-haiku-claude.md)：值得一试，先在本地确认 Claude Code 是否支持 --advisor，再用 `claude --model sonnet --advisor opus` 做一次分层对照（sonnet 主会话、opus 只在决策点介入、haiku 承担只读杂活），验证成本与返工率是否改善；思路明确可试，但原文只有一条命令加几句分工、正文还被截断，没有任何成本或质量数据，参数与模型名也无法从材料内核实。
- [@skunzu: 这是一个真正他妈的金矿](../research/radar/2026-10-22/5773-item.md)：值得一试，可小范围试：用 CLAUDE_CODE_SUBAGENT_MODEL=haiku 启动 Claude Code，把子代理固定为 Haiku，并对比 token 消耗与输出质量；但原文只给了一条环境变量，没有给出 Sonnet、Opus、Haiku 的完整分工和触发方式，不能当作完整多模型方案照搬。
- [cheaper-inference/OmniRoute](../research/radar/2026-10-22/5842-cheaper-inference-omniroute.md)：值得一试，建议小范围试：在本地启动 OmniRoute，把 Claude Code 或 Cursor 的 base URL 指向 http://localhost:20128/v1，模型用 auto/subscription 或 auto/coding 跑一到两周，对比中断次数、单位任务 token 成本和 p95 延迟，再决定是否常态化。理由是它给出了可照做的接入方式与回退/路由配置，但省 token、免费额度等关键数字均为项目自述，且依赖第三方 provider 条款，必须先自测。
- [cablate/model-relay](../research/radar/2026-10-23/6217-cablate-model-relay.md)：值得一试，如果你长期在 Claude Code 里工作，可以小范围试用：先只把 haiku 这类子任务和 429 故障转移接到一个备用 provider，用 /provider doctor --ping 确认链路通，再按窗口逐步放开。理由是 README 给出了可直接复制的安装、配置和自检命令，并有默认保守的开关；但它仍是单人用的本地守护进程，缺少效果数据，先小范围试、别急着全量替换。
- [Sheernox/cedr](../research/radar/2026-10-30/8398-sheernox-cedr.md)：值得一试，可以用小范围试点的方式接入 cedr：先只做“按工作类型路由、记录结果”和“把 skill/MCP 版本固定进锁文件”两件事，再考虑多厂商评审门禁；理由是 README 给出了可直接照做的安装命令、routes.toml 样例、statusline 配置和完整命令表，但项目处于 preview 阶段、缺少任何效果数据，暂不宜直接定为团队标准。
- [muaaz9329/cheap-ag](../research/radar/2026-10-31/8887-muaaz9329-cheap-ag.md)：值得一试，可以在有一个中等规模任务、并且已有可运行测试套件的项目里小范围试：用 npx cheap-agent 接入 Claude Code，让 Claude 只负责规划、廉价模型负责写码、测试充当裁判；理由是该仓库 README 给出了完整的安装、授权、配置和回退流程，并且用测试结果作为唯一验收标准，但所有效果数据均为作者自报，且在最难任务和极小任务上没有收益甚至略有倒退。
- [@aliez_ren: 最近几个月我是这样用 AI 写代码的：](../research/radar/2026-11-03/9706-ai.md)：值得一试，可以小范围照做的是“按任务是否涉及架构改动来选模型 + 长途切换模型前先 /compact”这套分工与切换规则，因为它给出了可直接执行的操作顺序；但原文被截断、只有个人经验无数据，Herdr 与具体模型名需自行核对后再落地。
- [@HeLi8866: 这真的是一座金矿！](../research/radar/2026-11-06/10642-item.md)：值得一试，把 `claude --model sonnet --advisor` 作为一个小范围对照实验来跑：让便宜的 Sonnet 承担主循环，只在需要时让更强的模型介入，再用同样的任务对比效果和 token 消耗。推文只给了一行启动命令，没有任何机制说明或数据，所以不能直接采用（adopt），但它给出了一条可照抄的具体配置，值得试用。
- [@0xVeyyro: THIS IS AN ACTUAL F*CKING GOLDMINE](../research/radar/2026-11-06/10741-this-is-an-actual-f-cking-goldmine.md)：值得一试，建议小范围试：在 Claude Code 中用 Sonnet 主跑、Opus 顾问的命令做对照，记录成本与返工；原因是原文只给出一条具体命令且正文截断，不足以直接采纳为完整流程。
- [@wanerfu: Anthropic 刚分享了 Claude Code 的一个超好用技巧。](../research/radar/2026-11-09/11772-anthropic-claude-code.md)：值得一试，先把 `claude --advisor opus --subagents haiku` 作为实验组，与只用单个模型的会话做同任务对照，记录 token 消耗和返工次数，再决定是否把它定为固定启动方式。因为原文只提供了一条启动命令和“输出更好、更省 token”的主张，正文被截断，量化数据、成本边界和适用条件都缺失，不足以直接采用。
- [@0xCodila: Antrhopic's cheat code:](../research/radar/2026-11-13/12937-antrhopic-s-cheat-code.md)：值得一试，把这条 prompt 当作模板，而不是逐字照抄的脚本：先到 Anthropic 官方 advisor / sub-agents / model-config 三页核对字段与当前可用模型名，把四个角色（构建、顾问、检查、检索）替换成你账号里真实存在的模型，再在一个非关键项目里按同一条 prompt 的流程装配一遍。理由是它给出了可直接复制的三件套（settings.json 字段、~/.claude/agents/*.md、CLAUDE.md 触发规则）和验收方式，但模型名与版本号无法从材料核实，且作者没有给出任何效果数据。
- [@I_am_oil_oil: 最近非常高强度地使用了 Antigravity 和 Gemini 模型，说说自己的感受和一些实用技巧：](../research/radar/2026-11-13/13154-antigravity-gemini.md)：值得一试，可以把“用不同厂商的模型交叉评审、用便宜快速的子 Agent 先探索代码、把只读命令加入白名单、减少审批等待”这组做法小范围试起来；但插件与提示词的具体内容只在链接里，原文没有给出，所以只能按粗流程试，细则需要打开仓库后再补。
