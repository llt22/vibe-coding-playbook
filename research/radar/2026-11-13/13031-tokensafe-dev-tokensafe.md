# tokensafe-dev/tokensafe

- 结论：**值得一试**。建议先在一个仓库、一个 agent 上小范围试用：只启用本地 AST 切片、命令净化和 guard 拦截，对比 token 消耗与一次通过率，再决定是否上团队缓存；理由是安装与 MCP 配置都有可直接照抄的命令，但效果数据来自作者自报的模拟基准，项目仅 30 stars，且团队级能力需付费 license。
- 原文：https://github.com/tokensafe-dev/tokensafe
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T01:56:50.635Z

## 是什么

TokenSafe 是一个本地优先（local-first）的编码智能体上下文控制层，以 MCP server + CLI 的形式分发。它主要做四件事：

1. **按需读代码**：读文件时做 AST 骨架化，只返回目标符号和 1 跳依赖（签名保留、函数体折叠），支持 11 种语言；OpenAPI/Prisma/GraphQL/SQL 文件可按 spec 路径、model、type、table 自动切片。
2. **压缩工具输出**：命令净化器剥掉 lockfile 噪声、把测试日志裁到失败断言与堆栈帧；把 JS 测试强制成单次运行（`CI=true`、`--watch=false`、`--forceExit`）；检测重复的相同工具调用并中断循环。
3. **执行前拦截风险**：用确定性规则在写入磁盘或进入 git 暂存区之前，拦下硬编码 fallback 密钥、私钥、`verify=False` / `rejectUnauthorized: false`、拼接 SQL、带凭据的 CORS 通配、`.env` 被 `git add .` 带进暂存区、破坏性删除、`curl -d @.env` 之类的外传管道。
4. **维持提示缓存**：用 Append-Only Epoch Governor 把历史前缀单调冻结到模型上下文窗口的 80%，PromptCacheNormalizer 剥离易变元数据、排序工具 schema、注入 provider 的 `cache_control` 断点与 `prompt_cache_key`；同时统计节省（区分 `measured` / `estimated`）。

安装器会探测本机已有的 agent，注册 MCP server、注入项目规则、挂 lifecycle hooks。开源核心为 MIT；团队缓存、托管蒸馏、按席位 ROI 报表等云功能需 `TS2.*` license。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：本地工作站；已装 Node（用 npx）或 Python 3.10+（用 pip）；已在用的编码 agent 在其支持列表内。

1. **一键安装并接入本机 agent**（三选一）：

```bash
# Option 1: Zero-Install via npx (recommended)
npx tokensafe

# Option 2: Python / PyPI
pip install tokensafe && tokensafe

# Option 3: Direct shell script (macOS / Linux)
curl -fsSL https://tokensafe.dev/install.sh | bash
```

安装器会自动探测本机已安装的 agent、注册 TokenSafe MCP server、注入项目规则，并在 agent 支持时挂上 lifecycle hooks。

2. **若不想用安装器，手动注册 MCP**（Claude Desktop / Cursor 等，写进对应 MCP 配置文件）：

```json
{
  "mcpServers": {
    "tokensafe": { "command": "npx", "args": ["-y", "tokensafe", "mcp"] }
  }
}
```

3. **按 agent 选择接入方式**（前提：该 agent 已安装）

| Agent | 集成方式 |
|---|---|
| Google Antigravity | Plugin symlink + hooks + skills + MCP（启动时自动加载） |
| Claude Code CLI | MCP + `SessionStart` / `UserPromptSubmit` / `PreToolUse` hooks |
| Cursor | MCP + `beforeShellExecution` / `beforeReadFile` hooks |
| Claude Desktop | MCP 注册（`claude_desktop_config.json`） |
| Windsurf | MCP 注册 + 全局规则 |
| OpenAI Codex | `~/.codex/config.toml` 中的 MCP（stdio + 云 HTTP） |
| Cline / Roo Code | MCP 注册（VS Code） |
| GitHub Copilot | MCP 注册 |
| Gemini CLI | MCP 注册 |
| ChatGPT | 云连接器，无需安装；四个公开工具无需 key，authentication 设为 **None** |

4. **（可选）接入团队/云端能力**：endpoint 为 `https://api.tokensafe.dev/mcp`，请求头 `Authorization: Bearer <TS2. license key>`。不接云端时，四个公开工具与全部本地功能照常可用。

5. **审计本机 agent 环境的上下文税**（前提：已安装完成）：

```bash
tokensafe doctor
```

6. **对仓库做递归安全与卫生审计**：

```bash
tokensafe guard audit
```

7. **预览提示压缩效果**（把真实任务描述换进去）：

```bash
tokensafe test "fix the validate_token method in src/auth.py to check jwt expiration"
```

8. **多文件改动前先出架构热点图**：

```bash
tokensafe graph
```

9. **关掉占上下文的重 MCP server**（不改 JSON）：

```bash
tokensafe mcp disable <server>
```

10. **看实时节省面板**：

```bash
tokensafe stats
```

输出示例（原文照录）：

```text
⚡ TOKENSAFE CONTEXT OPTIMIZER DASHBOARD
Total Tokens Saved:   4,524,156 tokens
Efficiency Gain:      [████████████████████████░░] 92.5%
Context Traffic:      4,889,255 raw → 370,574 optimized (2,132 events)

• Command Sanitizer (CLI)        :   727,300 tokens saved (263 events)
• Architecture Graph             :   758,256 tokens saved (13 events)
• Multi-turn History Fold        : 2,897,897 tokens saved (471 events)
• Prompt Compactor (local+cache) :    43,502 tokens saved (1,255 events)
```

11. **生成团队 ROI 周报**：

```bash
tokensafe digest
```

12. **激活 Team / Solo license**（前提：已购 key）：

```bash
tokensafe activate TS2.eyJlbWFpbCI6...
```

13. **关掉遥测同步**（保留全部本地功能）：

```bash
TOKENSAFE_TELEMETRY_DISABLED=1
```

14. **在 agent 对话中改用专用工具，而不是整文件读取**（13 个本地 MCP 工具，关键几个）：

| 工具 | 用法 |
|---|---|
| `smart_read_file` | 传目标符号，返回该符号 + 1 跳依赖的骨架；OpenAPI/Prisma/GraphQL/SQL 传 spec 路径 / model / type / table 作为 `symbol` |
| `smart_bundle` | 一次读 3–8 个跨文件相关符号，合并骨架、去重共享 import |
| `get_architecture_graph` | 多文件改动前先拿拓扑，目标 <250 tokens |
| `get_api_surface` | 导出接口的紧凑 markdown 地图 |
| `slice_diff` | 切 diff，剔除 lockfile、压缩上下文行 |
| `sanitize_command` | 分阶段重写 shell 命令并限输出 |
| `guard_inspect` | 命令或代码片段的执行前安全检查 |
| `context_budget` | 估算上下文窗口占用并给阈值建议 |
| `compress_prompt` | 把冗长提示压成紧凑 S 表达式 |
| `compact_conversation` | 把长对话折叠成状态账本 |
| `get_token_savings_metrics` | 累计 token / 成本节省 |

15. **缓存友好的写法（这是可迁移的原则，不必依赖本工具）**：历史前部保持字节稳定，不要在早期轮次里插入时间戳、随机 ID、重排的工具清单；系统提示与工具 schema 顺序固定；把易变内容追加到末尾而不是改写前缀。TokenSafe 的 governor 就是自动化这件事（冻结到上下文窗口 80%）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 已能做、但没被想到可以交给它的工作）**
- 读代码不必读整文件：`smart_read_file` 只给目标符号 + 1 跳依赖，11 种语言。
- 跨文件批量取符号：`smart_bundle` 一次合并 3–8 个符号，共享 import 去重，省掉链式读。
- 结构化数据文件切片：OpenAPI/Swagger、Prisma、GraphQL、SQL 可按 model/type/table 切片（原文举例：5,000 行 migration 从约 30k tokens 降到几百）。
- 架构探测：`get_architecture_graph` 给出 <250 tokens 的热点与依赖拓扑；`get_api_surface` 给导出接口地图。
- 输出侧处理：命令净化把测试日志裁到失败断言与堆栈帧，`slice_diff` 剔 lockfile。
- 提示与对话的「编译」：`compress_prompt` 压成 S 表达式，`compact_conversation` 折叠成状态账本。
- 这些都是「把上下文准备工作外包给工具」，属于容易被忽略的可托付工作。

**2. 任务匹配（什么工作适合什么模型、工具、协作方式）**
- 工具形态按 agent 能力分层：能挂 hooks 的（Claude Code、Cursor、Antigravity）走「MCP + hooks」深度集成；只能注册 MCP 的（Windsurf、Cline、Copilot、Gemini CLI）走注册；ChatGPT 走云连接器、零安装。
- Codex 走 `~/.codex/config.toml`（stdio + 云 HTTP 原生）。
- 本地小模型：原文提到会「修复小模型产生的畸形 JSON 工具参数」，说明对小模型做参数兜底是可匹配的做法。
- 缓存策略按模型计费档位区分：原文用 Claude Sonnet 4.5（缓存读 $0.30/M，0.10x）与 DeepSeek V3（$0.028/M，0.10x）分别算账。

**3. 条件供给（需要提供哪些信息、工具、权限和反馈）**
- 权限：MCP server 注册、hooks 执行权（`PreToolUse`、`beforeShellExecution`、`beforeReadFile`）——guard 要真正拦得住，必须在命令执行前和文件读取前有钩子。
- 信息：项目规则注入（安装器写）、目标符号名（`smart_read_file` 要传 `symbol`）、spec 路径/model/type/table。
- 反馈：`context_budget` HUD 给出窗口占用与工具/历史/提示的分项；`tokensafe doctor` 报 MCP 工具开销与 skills 税。
- 团队条件：共享 L3 缓存与 per-seat ROI 需 license + 云 endpoint；隐私可关（`TOKENSAFE_TELEMETRY_DISABLED=1`，云只收计数器不收源码与提示）。
- 原文声明所有 hook 适配器 fail-open：内部错误不会卡死 agent，只在本地记日志。

**4. 主动推进（可由时间、事件或状态触发并持续完成）**
- 事件触发：guard 在每次工具调用前自动审计（原文「Deterministic TokenSafe Guard on every tool call」），不靠 `.cursorrules` 里的静态规则。
- 事件触发：命令净化在 shell 命令执行时自动重写并限输出；测试守卫自动加 `CI=true`、`--watch=false`、`--forceExit`，并读 `<cwd>/package.json` 识别真实 runner。
- 状态触发：loop guard 检测到重复相同工具调用时中断循环；上下文窗口接近阈值时 `context_budget` 给建议。
- 时间触发：`tokensafe digest [--send]` 定时（周五）编译并可选派发团队 ROI 摘要；`tokensafe sync` 同步遥测；`tokensafe prune --days N` / `vacuum` 定期清理指标库。

**5. 效果验证（怎样判断确实改善了结果）**
- 工具自带：`tokensafe stats` 的分项节省（Command Sanitizer / Architecture Graph / Multi-turn History Fold / Prompt Compactor）、`metadata` 里 `measured` 与 `estimated` 强制分开标注、缺数据时显示 `—` 而不是编数字。
- 口径说明：`measured` = 模型实际收到更少字节；`estimated` = 对比建模基线；USD 是 `tokens × $1.5 / 1M` 的推算，不是厂商账单。
- 团队口径：周五 per-seat ROI digest，区分 measured/estimated，不活跃席位显示 `—`。
- 基准：`tokensafe benchmark`（原文明确标注为 simulated harness）。

## 与已有做法的关系

清单中的条目全都是 TokenSafe 的**接入对象**，不是它的替代品：

- **Claude Code（adopt）**：TokenSafe 提供 MCP + `SessionStart` / `UserPromptSubmit` / `PreToolUse` 三个 hook，是集成最深的一档。
- **OpenAI Codex（adopt）**：通过 `~/.codex/config.toml` 注册 MCP（stdio + 云 HTTP）。
- **Cursor（watch）**：MCP + `beforeShellExecution` / `beforeReadFile` hooks。
- **Cline（watch）**：MCP 注册（VS Code）。
- **Google Antigravity（watch）**：plugin symlink + hooks + skills + MCP，启动时自动加载。
- **DeepSeek（try）**：仅作为缓存计费对比对象出现（DeepSeek V3 缓存读 $0.028/M，账单 -96.9%），没有集成说明。
- **GitHub Copilot（drop）**：仅在支持表里出现「MCP 注册」一行，无更多细节。

即：TokenSafe 是架在这些 agent 之上的上下文与安全层，采用它不改变已选 agent，只改变 agent 看到什么、能做什么。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的数据**
- 10 个生产场景基准：基线 `169,761` tokens → `8,173` tokens，净降 **-95.2%**，单场景峰值 **-99.4%**，turn 延迟 **+30.6%**，准确率 **100%**。
- 20 轮多轮重放：KV 缓存前缀命中率 **90.8%**（535,491 / 589,846 输入 tokens），20 轮输入 token **-84.6%**（3,837,648 → 589,846），Claude Sonnet 4.5 总账单 **-96.6%**（$11.6779 → $0.4005），对比「朴素中途裁剪」**-84.6%**（$2.5984 → $0.4005），DeepSeek V3 总账单 **-96.9%**。
- 单个场景示例：SWE-06 架构发现 49,716 → 312（-99.4%，6→1 轮）；SWE-09 重复读指针去重 17,388 → 208（-98.8%）；SWE-07 图引导 AST 切片 26,023 → 1,194（-95.4%）。
- 案例：一个 1,420 行文件里改一个 helper，agent 收到 94 行目标逻辑与类型契约，而非整模块。
- 拦截提示词样例：
```text
🛡️ TokenSafe Guard: Blocked a hardcoded secret fallback in config.py.
   Leave the default empty or read from os.environ at runtime.
```

**哪些只是作者主张 / 需要打折**
- 原文自己承认：**benchmark 是 simulated harness**，压缩比与 20 轮 KV 前缀字节匹配是实测，**基线与 turn speedup 是建模常量**；输出 token 估算也是模型值。
- 「Reduce your AI bills by up to 99%」是乘性数学的结果，原文也给了边界：总账单通常落在 **80–97%**，因为新生成输出与首轮缓存写入从不打折。「最高 99%」只在图优先生、重复读、缓存已热的路径上成立。
- 「$29 席位 1–3 天回本」「首轮即干净代码」「零密钥泄漏」均为作者主张，无第三方复现或客户案例。
- USD 数字是 `tokens × $1.5 / 1M` 的推算，不是真实账单。
- 项目成熟度：**30 stars**，早期项目；核心团队能力（共享 L3 缓存、托管蒸馏、ROI digest、组织策略、SSO、审计日志导出）锁在付费/企业版后面。
- guard 是确定性规则（正则/模式匹配），不是语义理解：会有误报（合法测试代码写 fallback）与漏报（变形写法）。
- 依赖 hooks 的深度拦截只在支持 hooks 的 agent 上成立；只能注册 MCP 的 agent 拦截能力会弱一档。
- 语言覆盖 11 种，但 CSS 只保证 design tokens 保留；其他未列语言无 AST 支持。
- 隐私：云功能会收计数器（token 总量与事件类型），可 `TOKENSAFE_TELEMETRY_DISABLED=1` 关闭；但对强合规环境仍需评估。

**适用条件**
- 有真实代码仓库、且主力语言在 11 种支持列表内；
- 使用支持 MCP（最好支持 hooks）的编码 agent；
- 任务以「改一处函数 / 排查一次失败 / 跨 3–8 个符号的小改动」为主，而不是大规模重构；
- 愿意在本地装一个会拦截 shell 命令和写文件的中间层（这是权限层面的实质变化，需要安全评审）。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（一周、一个人、一个仓库、一个 agent）**

1. 选一个中等规模仓库和一个主力 agent（优先 Claude Code 或 Cursor，两者有 hooks，能验证拦截效果）。
2. 只装本地形态，关掉云：

```bash
npx tokensafe
export TOKENSAFE_TELEMETRY_DISABLED=1
tokensafe doctor
```

3. 先用 `tokensafe guard audit` 跑一遍仓库，确认基线期的密钥与风险命令分布。
4. 挑 5 个真实任务（建议覆盖：单函数修改、跨 3–8 符号的改动、CI 测试失败排查、依赖升级后的 diff 审视、多轮长会话里的连续修改）。每个任务先在**不开 TokenSafe** 的分支/会话里做一遍并记录，再在**开启 TokenSafe** 的会话里重做一遍。
5. 分阶段开关，把效果拆开看：先只开 guard（不改上下文），再开命令净化，最后开 AST 切片与缓存治理。

**判断有没有改善的指标（全部来自原文可观测项 + 自建对照）**

| 维度 | 指标 | 数据来源 | 通过阈值（建议） |
|---|---|---|---|
| 上下文成本 | 同一任务的输入 token、`tokensafe stats` 的分项节省 | agent 用量面板 / `tokensafe stats` | 输入 token 降 ≥50%，且 `measured` 部分占多数 |
| 轮次效率 | 完成任务所需 turn 数 | 会话记录 | 平均 turn 数下降，而非靠减少探索牺牲质量 |
| 结果质量 | 一次通过率、是否需要返工、是否引入相邻回归 | 人工判定 + 测试 | 一次通过率不降（原文基准主张 100% 保持，需自测） |
| 安全 | guard 拦截数、其中真实问题数 / 误报数、`.env` 是否被暂存 | guard 日志 | 真阳性 ≥1 起即有价值；误报率 <10%，否则会打断工作流 |
| 稳定性 | loop guard 触发次数、测试挂起次数、hook 报错次数 | 本地日志 | hook 报错不应中断 agent（原文称 fail-open，需实测） |
| 缓存 | KV 缓存命中率与缓存读占比 | 模型厂商账单/用量页 | 命中率显著上升，账单缓存读行出现（对照原文 90.8% 量级） |
| 团队 | per-seat ROI digest 中 measured/estimated 比例 | `tokensafe digest` | 先确认 measured 占比够高，再据此决定是否买席位 |

**停止条件**：若一周内出现（a）hook 导致 agent 卡死或静默跳过工具调用，（b）guard 误报率高到需要频繁绕过，（c）输入 token 降幅 <20%，则不宜继续投入，最多保留 guard 的只读审计模式（`tokensafe guard audit`）作为独立检查手段。
