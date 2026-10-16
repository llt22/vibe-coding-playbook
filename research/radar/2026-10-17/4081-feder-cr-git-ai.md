# feder-cr/git-ai

- 结论：**值得一试**。先在临时目录跑通 `examples/graft/quickstart.sh` 验证「服务端落库 + 缓存 + 两个 agent + 一次 land」整条链路，再在非关键仓库以 shadow 模式接入数据库/对象存储做小范围试点；它把大量编码智能体并发落库、自动冲突解决、落库后验证、agent 权限这些协作痛点做成了可跑的开源实现，但仍是 0.1.0、接口可能变且有已知缺口，不宜直接上关键仓库。
- 原文：https://github.com/feder-cr/git-ai
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-16T17:03:48.509Z

## 是什么

gitai（仓库名 feder-cr/git-ai，README 中代码内部扩展名为 **Graft**）是一个面向 AI 编码智能体的版本控制系统开源实现。它明确说自己是在复刻 Anthropic 内部系统 **Scion** 的公开设计（Anthropic 文章《Redesigning source control》描述的服务端为中心、为数百个并发读写代码的 agent 而建的系统），Scion 不对外，gitai 是可自托管、MIT 许可、社区维护的独立实现，与 Anthropic 无隶属关系。它 fork 自 GitLab 的 Gitaly，保留全部上游 RPC，底层仍是普通 Git 仓库。

核心设计主张（README 的说法）：传统 Git 托管假设「人 clone 一次、干几小时、push 一次」，而编码智能体是「成千上万个短生命周期任务、每个只碰几个文件、想在几秒内落库、且都在同一分支上」，于是全量 clone、merge queue、客户端遍历历史都成了瓶颈。gitai 的对应做法是：

- 客户端常在线，只取需要的对象/稀疏树（`ObjectService`、`graft clone`、`graft sparse`）；
- 历史类问题（blame、路径历史、ancestry、代码搜索）在服务端算并作为派生数据按 commit 记忆化；
- 不用 merge queue，落库走 compare-and-swap，同分支并发落库合并成一次引用更新；
- 冲突由可插拔 resolver 解决（任意 LLM 供应商 / 确定性工具 / 不解决），协议与供应商无关，服务端本身不调用语言模型；
- 每次被接受的引用更新都记入有序的 changeset log，客户端可列表或实时 watch；
- 状态放在 SQLite/PostgreSQL 的 changeset WAL + 对象存储（file/S3/GCS/Azure），服务节点是无状态缓存，可加节点横向扩展；
- 落库后测试，失败就 bisect 并 revert 肇事改动（`graft-verify`）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **准备构建环境**（前提：Linux 或 macOS 机器，能联网拉依赖）。README 明确要求 Go 1.26、C 工具链、Meson、Ninja，构建过程会编译一份内置的 Git。缺任一项 `make build` 会失败。
2. **克隆并构建**（产出 server、CLI 和工具到 `_build/bin`）：

```shell
git clone https://github.com/feder-cr/git-ai.git
cd git-ai
make build                         # server, CLI and tools into _build/bin
```

3. **跑官方最小端到端示例**（前提：上一步构建成功）。这条脚本在临时目录里拉起一个 server、一个 cache daemon、两个 agent 和一次 land：

```shell
examples/graft/quickstart.sh       # a server, a cache daemon, two agents and a land, in a temporary directory
```

4. **查看 CLI 与可用命令**：

```shell
./_build/bin/graft                 # the CLI and its commands
```

5. **起自己的 server**（前提：已按自己的环境改好配置）。README 的原文做法是改编示例配置后启动：

```
To run your own server, adapt `examples/graft/config.toml`
and start it with `_build/bin/gitaly serve config.toml`.
```

即：编辑 `examples/graft/config.toml`，然后执行 `_build/bin/gitaly serve config.toml`。
6. **把仓库状态迁到数据库 + 对象存储**（前提：先别直接切生产）。README 要求加一个 `[graft.storage]` 段，并且两阶段迁移：先以 `shadow` 模式启动、导入现有仓库，确认无误后再切到 `authoritative` 模式；细节在 `doc/graft/STORAGE.md`。
7. **选择冲突解决方式**：为自动 conflict resolution 选一个 resolver —— 任意 LLM provider、确定性工具，或者干脆不解决（none），走的是版本化的、供应商无关协议。细节在 `doc/graft/RESOLVE.md`。
8. **开启落库后验证**：用 `graft-verify` 测当前 tip，失败时 bisect 定位并 revert 掉引入问题的那个 change；细节在 `doc/graft/VERIFY.md`。
9. **给 agent 配权限**（前提：团队要跑多个 agent）：用 per-agent token、RPC allowlist 和 branch policy 决定每个 agent 能做什么，细节在 `doc/graft/AGENT-SECURITY.md`。
10. **（可选）接监控与评审**：让 agent 跟随 changeset 流、按组件汇报、也可发到 Slack（`doc/graft/SUPERFAN.md`、`SUPERFAN-CHAT.md`）；评审侧可配语义审批规则，例如纯注释改动所需的批准人数可以少于逻辑改动（`doc/graft/REVIEW.md`）。
11. **缓存层（可选）**：`graft-cache` 在 daemon 层和区域层缓存不可变对象，并逐个对象校验。

以上各步的深入配置分别写在 `doc/graft/` 下的 QUICKSTART、CONFIGURATION、ARCHITECTURE、STORAGE、LAND-BATCHING、RESOLVE、DERIVED、REVIEW、SEARCH、VERIFY、SUPERFAN、AGENT-SECURITY、BENCH、FUZZING、LIMITATIONS 等文档中，README 只给了入口。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**
README 直接点出几类通常不会想到交给自动化/AI 的活：冲突解决本身可以自动化且可插拔（LLM / 确定性工具 / 不解决）；落库后的测试—bisect—revert 闭环可以交给系统而不是人；有专门的「superfan」agent 盯着 changeset 流，按组件汇报「什么是重要的」，并可发到 Slack；评审规则可以按改动语义分级（注释类改动的审批要求低于逻辑改动）；blame、路径历史、ancestry、代码搜索这类历史查询被重新定义为服务端可缓存的计算。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
README 给出的是明确的匹配逻辑而非泛泛而谈：短生命周期、只碰少数文件、要求秒级落库、且大量并发在同一分支的编码任务 → 服务端为中心、compare-and-swap 落库、批处理并发 land；历史查询 → 服务端计算并按 commit 记忆化；冲突 → 按需选 resolver，且「服务端永不调用语言模型」，AI 能力可选任意供应商或完全不用；验证 → 交给 `graft-verify` 的 bisect 流程。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
需要提供：Go 1.26 + C 工具链 + Meson + Ninja 的构建环境；`config.toml`（[graft] 段 + 可选 [graft.storage] 段）；数据库（SQLite 或 PostgreSQL）与对象存储（file/S3/GCS/Azure）；给每个 agent 的 token、RPC allowlist、branch policy；一个明确选定的冲突 resolver；存储迁移需要先 shadow 后 authoritative 的两段式操作窗口；要 Slack 汇报则需相应配置。反馈来自 changeset log 的实时流和 `graft-verify` 的结果。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
changeset log 可以「list 或 watch live」，是被动+事件驱动的更新源；superfan agent 持续跟随 changeset 流并汇报，属于事件触发的常驻工作；`graft-verify` 在 land 之后测试 tip、失败则 bisect 并 revert，属于状态/事件触发的自动收尾。

**5. 效果验证：怎样判断确实改善了结果**
README 提到的机制性验证手段：`graft-verify`（测 tip、bisect、revert 肇事 change）、`graft-cache` 对每个对象做校验、以及仓库整体声称有 unit / end-to-end / 多节点 / crash / fuzz 测试覆盖；另有一份 BENCH.md 基准文档（README 未给出具体数字）。原文没有给出任何可用来判断「用了它比传统 Git 快多少」的量化结论。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中有一条 **Graft**（kind: tool，status: watch）。README 明确说明「在代码里这些扩展就叫 Graft：`[graft]` 配置段、`graft` CLI、`internal/graft`、`doc/graft`」，因此这条线索很可能就是清单里那个 Graft 条目的本体。若确认同一物，本报告可作为把该条目从 watch 向前推进的落地材料；同时它是 Gitaly 的 fork 且上游 RPC 全部保留，与既有 GitLab 生态存在兼容路径，迁移摩擦点主要在存储核心（shadow→authoritative）。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- **可核验的事实性内容**：MIT 许可；fork 自 Gitaly（MIT，Copyright GitLab Inc.），上游 Gitaly RPC 全部保留，非 MIT 的 `ee/` 目录未包含；版本 0.1.0，自称首个公开版本；构建依赖 Go 1.26、C 工具链、Meson、Ninja；源码里有 `examples/graft/quickstart.sh` 和 `examples/graft/config.toml` 这两个可操作入口；文档列表与文件路径在 README 中逐条列出。
- **作者主张（未给数据）**：传统 Git 托管对 agent 是瓶颈的论证（全量 clone、merge queue、客户端遍历历史）没有附带任何测量；「以上全部已实现并有 unit、端到端、多节点、crash、fuzz 测试覆盖」是自述，未给覆盖率或测试数量；banner 图注里出现「50 agents on one branch retry and fail with push, rebase, retry」「100 against 200 changes landed」是配图说明，不是可核验的基准结果。
- **明确的局限**：接口在 1.0 前可能变动；已知缺口写在 LIMITATIONS.md（README 举例提到存储核心中 pack 的垃圾回收）；构建要编译内置 Git，依赖较重；README 未给出与传统 Git / 其他方案的对比数字。
- **适用条件**：适合同时运行大量编码智能体、且愿意自托管一套服务端（数据库 + 对象存储）的团队；对只跑一两个 agent 的个人或小团队，为换取秒级并发落库而引入这套基础设施的收益未经验证。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（不改动现有仓库，风险最低）**
1. 按上面步骤 1–2 构建，然后直接跑 `examples/graft/quickstart.sh`，确认在临时目录里 server、cache daemon、两个 agent、一次 land 能完整走通。这一步不需要接任何外部数据库或对象存储。
2. 用 `./_build/bin/graft` 逐个熟悉 land、changeset 列表/watch、verify 相关子命令。
3. 拿一个非关键的真实仓库，按 `[graft.storage]` 的 `shadow` 模式做只读导入，核对导入后的仓库状态与源仓库一致；确认无误后再切 `authoritative`。
4. 只让少量 agent 走这套流程，且暂时不开自动冲突解决（resolver 设为 none），先看清楚冲突都发生在哪里。
5. 稳定后再逐步打开：自动 resolver、`graft-verify` 的自动 revert、per-agent token 与 RPC allowlist。

**判断有没有改善的指标（README 未给数值目标，需自建基线，与现有 merge queue / PR 流程对比）**
- 单次 land 的端到端耗时（从 agent 想提交到引用更新完成）。
- 同一分支上并发 land 的成功率与需要人工介入的冲突比例。
- 自动冲突解决被接受、且后续没有被 revert 的比例（用来判断 resolver 是否可信）。
- `graft-verify` 捕获的回归数量、bisect 定位是否准确、自动 revert 是否误伤。
- 权限控制是否真的挡住越权操作（构造几个越权请求做负向测试）。
- 增加服务节点后吞吐是否随之提升、以及缓存层校验是否出现对象不一致。

**退出条件**：若试点期间出现需要人工修复的仓库状态不一致、或自动 revert 造成误伤，应先退回 `shadow` 模式并只把它当作只读历史服务使用，直到上游把 LIMITATIONS.md 中的缺口关掉。
