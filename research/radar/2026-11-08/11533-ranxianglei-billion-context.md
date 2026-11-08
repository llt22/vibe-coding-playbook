# ranxianglei/billion-context

- 结论：**值得一试**。值得在一个具体客户端上小范围试装（推荐先试 `bili plugin install opencode` 或 `bili claude` 启动器），用 `/acp`、`/acp-cache` 观察前缀缓存命中率与压缩收益，再决定是否推广；理由是安装、插件安装、启停和健康检查都给了可复制的命令和判定阈值，但省 token 与长会话效果主要是作者自测与自建基准，需自行复现。
- 原文：https://github.com/ranxianglei/billion-context
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-08T06:10:59.807Z

## 是什么

`billion-context` 是一个插在「任意 Agent 客户端」和「模型 API」之间的上下文压缩代理（命令名 `bili`，`bili-proxy` 为别名，npm 包 `billion-context`）。它不改客户端的真实配置文件（插件模式除外），而是通过三种形态接管请求：

1. **原生插件**：`bili plugin install <client>`，代理运行在客户端内部，之后照常启动客户端，无启动器命令、无固定端口、无 URL 改写。官方声明当前支持 pi、omp、opencode(1.x/2.x)、dsh、kimi、hermes、zcode。
2. **启动器**：`bili <client>` 同时拉起代理与客户端，代理监听独立端口（自管理区从 18787 起，`bili start` 手动模式占用 8787），对支持代理/CA 环境变量的客户端用证书 MITM，不支持的用 `/bili/` 前缀改写 baseURL，真实配置文件只读不写。
3. **URL 改写**：把客户端 baseURL 前缀改成「代理地址 + `/bili/`」，最通用。

核心机制：代理向会话注入四个上下文管理工具，由**模型自己决定何时、压缩哪一段**（不是硬截断）：

- `compress` — 把一段消息折叠成详细摘要；
- `decompress` — 需要精确细节时还原被压缩的区间；
- `search_context` — 在已压缩摘要与可见消息中做关键词检索；
- `acp_status` — 上下文占用总览，以及哪些区间仍可压缩。

作者强调与宿主内置摘要器的差别是：增量、可逆、前缀缓存友好（小段写入摘要，缓存前缀保持完整）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提：已装 Node/npm；Linux/macOS 或 Windows；需要能全局安装 npm 包的权限（用用户级 prefix 则无需 sudo）。**

1. 安装（Linux / macOS，用户级 prefix，避免 sudo 与自更新权限问题）：

```bash
npm install -g billion-context --prefix=~/.local
```

   前提与收尾：`bili` 会落在 `~/.local/bin`；若不在 PATH，加入 shell 配置：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

   - 用 nvm / Homebrew Node 时默认 prefix 已属当前用户，可直接 `npm install -g billion-context`。
   - Windows 默认 prefix（`%APPDATA%\npm`）可写，直接 `npm install -g billion-context`。
   - 旧 root-owned prefix 报 `EACCES` 时，永久解法是带 `--prefix=~/.local` 重装（今后每次 npm 重装该包都要再带一次），不要用 `sudo`。

2. 选一条接入路径（三选一，不要叠加）：

   **A. 原生插件（最贴近原生，装一次后照常启动客户端）**：

```bash
bili plugin install pi          # 在 pi 的 settings 里注册 "billion-context" 条目
bili plugin install omp         # 在 omp 的 config.yml（~/.omp/agent/config.yml）注册 extensions 条目
bili plugin install opencode    # 注册插件并关闭 opencode 原生 auto-compaction
bili plugin install dsh         # 对每个已有 profile 执行 'dsh plugin --profile <name> add billion-context'
bili plugin install kimi        # 写入 $KIMI_CODE_HOME/plugins/managed/billion-context/kimi.plugin.json
bili plugin install hermes      # 复制 Python 插件到 ~/.hermes/plugins/billion-context/ 并启用
bili plugin install zcode       # 写 hooks.enabled + SessionStart hook + mcp.servers.bili
bili plugin remove <client>     # 撤销（配置快照到 .bili-bak）
```

   前提：kimi 需 Kimi Code ≥ 2.0.0；dsh 走 npm 形式，粘贴 GitHub 地址会安装到无 `dist/` 的源码导致加载失败。

   opencode 也可以完全不用 bili 命令、直接在真实配置里手写（**先备份配置文件**）：

```json
"plugin": ["billion-context"]
```

```json
"compaction": { "auto": false }
```

   第二条必须同时做，否则 OpenCode 原生自动压缩会与本插件双重压缩。

   claude 也可走插件市场：

```
/plugin marketplace add ranxianglei/billion-context
/plugin install billion-context@billion-context
/billion-context:bili-setup
```

   **B. 启动器（无配置改动）**：

```bash
bili pi
bili codex
bili claude
bili omp
bili opencode
bili hermes
bili dsh
bili kimi
bili gemini
bili qwen
bili aider
bili goose
```

   前提：启动器每次新起代理实例、不复用端口；对不支持 baseURL 改写的闭源客户端（qoder/trae/jcode/mcode/aider/copilot/amp/crush/zed 等）用证书 MITM，需要客户端信任代理 CA。

   **C. URL 改写（最通用）**：把客户端 baseURL 前缀改为「代理 origin + `/bili/`」。

3. 避免双重压缩（最容易踩的坑）：原生插件与本仓库的独立进程内扩展（`billion-context-pi`、`opencode-acp`）**互斥**，两者同时生效即双压。安装器会替换旧条目并把原配置快照为 `.bili-bak`；**项目级安装不会被自动处理，需手工删除**。pi 侧需要 `billion-context-pi` 0.1.72+ 才能靠 `BILLION_CONTEXT_NATIVE=<host>` 标记自动让位。

4. 每个会话做一次健康检查（关键判定阈值来自 README）：

```
/acp
/acp-cache
```

   判定标准：健康会话的前缀缓存命中率应保持 **95–97%**，压缩本身开销 **≤2%**。持续偏低时按顺序排查：上游缓存 TTL 过期 → 切换模型 → 插件 bug（应上报）→ 其他。

5. 让模型用起四个工具（提示词层面可直接沿用 README 的工具语义）：当上下文接近窗口时用 `compress` 折叠较早区间；需要精确细节时用 `decompress` 还原；查旧信息先用 `search_context` 而非重读全文；需要总览时调 `acp_status` 看哪些区间仍可压缩。

6. Codex 的特殊前提：`bili plugin install codex` 只写入一个 `[mcp_servers.bili]` 块（暴露四个 ACP 工具），**不能**让 codex 自身流量走代理；必须先有可用代理（`bili start` 或任一 lane 的代理，环境变量 `BILI_MCP_PROXY` 优先，其次活实例记录，最后 8787 默认）。要零配置完整效果就用 `bili codex` 启动器。

7. 端口与常驻：`bili start` 手动模式独占 8787；各 lane 自管理区从 18787 起，冲突则 +1 并各自记住漂移。升级重启时若旧构建仍在端口上排空，最多等 5s 后重绑同一端口。

8. 已知限制要先接受再上（Claude 侧）：Claude Desktop 的 Code 标签页会自设 `ANTHROPIC_BASE_URL`，绕过代理，而 `DISABLE_AUTO_COMPACT=1` 仍生效——既没压缩也没原生自动压缩；终端会话不受影响。由于走自定义 baseURL，Claude Code 会把会话当作第三方/API-key，**Remote Control 等账号绑定功能会消失**；需要这些功能时用不带 bili 的 plain `claude`，或 `bili plugin remove claude`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 还能接管哪些没想到的工作）**
- 把「记忆管理」本身交给模型：压缩时机与压缩对象由模型判断，而非固定截断策略，等于把一项元工作（管理自己的工作记忆）授权给模型。
- 新增一类可交给模型的动作：对历史做关键词检索（`search_context`）而不是重读全文；按需还原（`decompress`）。
- 顺带发现：pi 原生安装默认接入内置子代理工具（`acp_delegate` / `acp_delegate_wait` / `acp_delegate_cancel`），可按需关闭只保留压缩。

**2. 任务匹配（什么工作适合什么模型/工具/协作方式）**
- 长跑型编码会话（小时级到天级、单会话上千次调用）是它明确针对的场景；短任务收益不明。
- 客户端与接入方式强绑定：有插件缝的（pi/omp/opencode/dsh/kimi/hermes/zcode）用原生插件；闭源二进制无插件缝的（copilot、amp、jcode、mcode、aider、crush、zed）只能启动器/MITM；`goose` 因 rustls 不信任 CA 文件，无法 MITM，只能走 baseURL 重定向；`codex` 只能靠启动器获得完整姿态。

**3. 条件供给（需要给哪些信息、工具、权限、反馈）**
- 工具：npm 全局安装权（建议用户级 prefix）、客户端配置写权限（插件模式）、代理端口（8787 与 18787 段）可用、客户端对代理/CA 的信任（MITM 路线）。
- 信息：代理需要读到客户端的真实配置来发现上游 host 并加入白名单；插件模式需要客户端的插件/钩子缝（SessionStart hook、MCP server、provider store 等）。
- 反馈通道：`/acp`、`/acp-cache`、`bili doctor`、以及 claude lane 的 MCP shell 在会话中每 30s 探活、连续 3 次失败自杀重启（约 90s 内恢复），属于自动化的运行反馈。

**4. 主动推进（时间/事件/状态触发并持续完成）**
- 状态触发：上下文增长到阈值时由模型自主调用 `compress`，代理在服务端执行，折叠区间在历史中保持摘要态直到被 `decompress`。
- 事件触发：`SessionStart` hook 在每个 claude / zcode 会话重建托管 URL 到活实例 origin，端口漂移自愈；claude 的 MCP shell 在会话中探活并重生挂掉的 lane 代理。
- 明确**没有**时间驱动的定时压缩或定时整理机制。

**5. 效果验证（怎么判断真改善了）**
- 运行时可观测：前缀缓存命中率 95–97% 为健康，压缩开销 ≤2%；用 `/acp` 看上下文占用与可压缩区间。
- 作者给出的外部化指标：ContextBench `0.3097` Utilized F1 且比 full 省 `-58.3%` 成本；LongMemEval-S `79.20%` 对最佳 RAG `62.60%`（+16.6%），独立会话成本比 full 省 `-71.1%`；MemoryAgentBench 1.48M token TTL 上 100% 存活（`full` 199/199 失败），稳态压缩 30×。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：本条给出 Claude Code 的具体接入形态（`/plugin marketplace add` + `bili plugin install claude` 的托管设置块 + SessionStart hook + MCP shell，或 `bili claude` 启动器），以及两条会改变既有做法的限制：Desktop Code 标签页完全绕过代理；走自定义 baseURL 会禁用 Remote Control 等账号绑定功能。手册里若推荐 Claude Code，应把这两条写成前置条件。
- **DeepSeek（try）**：`dsh` 即 deepseek-harness，支持 `bili plugin install dsh` ≡ `dsh plugin --profile <name> add billion-context`，安装器会关闭 dsh 各处的自动压缩（宿主层通过 bundle patch，web profile 预设加载时关闭）。
- **GitHub Copilot（drop）**：清单结论是 drop；本条也只提供 launcher-only 路线（`bili copilot`，闭源 Go 二进制无插件缝 #1049），不构成改判理由。
- **goose（watch）**：仅启动器（#1049），且因 rustls 不信任 CA 文件**无法证书 MITM**，只能通过 `OPENAI_HOST`/`ANTHROPIC_HOST` 与重生成的 `GOOSE_PATH_ROOT` overlay 走明文 baseURL 重定向。保持 watch。
- **Hermes（watch）**：支持原生 Python 插件（#958）：`bili plugin install hermes` 复制到 `~/.hermes/plugins/billion-context/` 并通过 `hermes plugins enable` 启用，靠 `llm_request` 中间件逐请求盖头。可继续 watch 到有稳定性证据。
- **OpenCode（watch）**：支持原生插件（1.x/2.x），关键是必须同时关掉原生 auto-compaction，否则双压。
- **pi-subagents（drop）**：与本条有交叉但不构成改判——pi 原生安装默认会接入 `acp_delegate` / `acp_delegate_wait` / `acp_delegate_cancel` 子代理工具，README 给了保留压缩但关闭这些子代理的办法。
- **ZCode（avoid）**：本条提供原生姿态（#1145）：写 `hooks.enabled` + SessionStart hook + `mcp.servers.bili`，首次启动时把路由写进 bigmodel provider store。与清单 avoid 的结论存在张力，建议以清单现有判断为准，仅在需要时单独验证。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的数据/机制性事实（可核对但均为作者自述）**
- 生产级纵向研究：4.5 个月、三台主机、174,327 次模型调用、累计输入 18.76B token（全主机约 24.7B）、在 204,800-token 模型上零窗口违规、最长会话 8,584–12,049 次调用。
- 「第三方基准」1500 题跨基准（LongMemEval-S / ContextBench / MemoryAgentBench，版本 v0.1.202，对 full 与 bm25 / embedding / embedding-rerank 三条 RAG 臂，模型 DeepSeek V4.1 Flash、Qwen3-Embedding-8B、Qwen3-Reranker-4B、Pi Agent）：ContextBench 第一（0.3097 Utilized F1，成本 -58.3%）；LongMemEval-S 79.20% vs 最佳 RAG 62.60%（+16.6%），独立会话成本 -71.1%；MemoryAgentBench 1.48M-token TTL 100% 存活，30× 稳态压缩。
- 健康阈值：前缀缓存命中率 95–97%，压缩开销 ≤2%。
- 客户端兼容矩阵与各条限制（含 issue 编号）写得非常具体，这类工程细节比性能宣称更可信。

**只是作者主张、需要打折的部分**
- 「第三方基准」与论文都托管在同一仓库内（`benchmarks/third-party-1500`、`paper/`，论文自述为 living document，欢迎 PR 修改），不构成外部独立复现；标题里的「independent third-party」应理解为「与主程序分开的评测」，而非第三方机构验证。
- 「5× fewer tokens」「month-long single sessions」是仓库副标题的宣传语，README 正文只给了上述基准与纵向统计，没有给出与具体竞品（如各宿主内置 summarizer）的对照实验。
- 「高压缩质量」缺少对压缩导致的**信息丢失**的量化（除 `decompress` 能力本身）；也未给出压缩摘要出错的案例研究。
- 抓取到的 README 在 `bili qwen` 一段被截断，客户端支持矩阵、Docker 运行、FAQ、`/acp` 细节等后续内容无法核实，本文只覆盖到截断处。

**适用条件**
- 目标是长时间、多轮、上下文持续膨胀的编码型 Agent 会话；短会话或一次性问答不适用。
- 需要能接受证书 MITM 或 URL 改写的客户端；闭源二进制且无 baseURL 缝的客户端只能 MITM，`goose` 这类连 MITM 都做不到的只能明文重定向。
- 安全与合规前提：MITM 形态意味着代理能看到明文模型流量，仅应在自己可控的机器与账号内使用；作者也明确 Claude 侧会因自定义 baseURL 失去账号绑定功能。
- 版本敏感：基准跑的是 `v0.1.202`，行为随 issue 编号演进，落地时要记录实际安装版本。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（约半天，只碰一个客户端）**
1. 选一个已有明确接入缝、且日常真在用的客户端（首选 opencode 或 claude）：`npm install -g billion-context --prefix=~/.local`，然后 `bili plugin install opencode`（或 `bili claude`）。
2. 备份并确认没有双重压缩：检查原配置里是否还存在 `billion-context-pi` / `opencode-acp` 等旧条目，opencode 需确认 `"compaction": { "auto": false }` 已就位。
3. 准备一个**固定基线的长任务**：同一份仓库、同一个任务描述（例如「实现某模块 + 补齐测试」），分别在「不开 bili」和「开 bili」下各跑一遍；两次都从干净会话开始。
4. 跑的过程中每隔一段时间执行 `/acp` 与 `/acp-cache`，记录命中率与压缩开销。
5. 在中段插入一次「记忆探针」：让模型复述 100 轮之前才出现过的某个细节（API 名字、常量值、约束条件），观察是否需要 `decompress` / `search_context` 才能答对。

**判断有没有改善的指标（建议全部记录，不只看 token）**
- 成本侧：该任务总 token 消耗与花费（对比基线）；前缀缓存命中率是否稳定在 95–97% 区间、压缩开销是否 ≤2%（低于即异常，先排查 TTL/模型切换/插件 bug）。
- 稳定性：是否出现窗口溢出或会话中断；连续会话能撑多少次调用（对照作者的 8,584–12,049 次说法自行标定）。
- 质量侧：任务是否一次通过、返工轮数、记忆探针答对率（尤其是被压缩区间内的细节）、`decompress` 后原文是否与真实历史一致（抽查 3–5 处）。
- 操作成本：安装+接入耗时、是否需要反复修配置、出现故障时的恢复时间（对比作者声称的 ~90s 自动重生）。
- 判定规则建议：成本显著下降且质量不降 → 可升为 adopt 候选；成本下降但记忆探针明显变差 → 停留在 try 并只用于低精度长会话；命中率长期低于 95% 或配置反复出错 → 退回 drop。

**不建议一步到位的部分**：不要一上来就对全部客户端批量 `bili plugin install`（互斥条目与项目级安装残留会互相打架）；不要在没有备份、且未关闭宿主原生 auto-compaction 的情况下手工改配置。
