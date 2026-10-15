# feder-cr/open_scion

- 结论：**继续观察**。先不要把它接入生产流程：在临时目录跑一遍 examples/graft/quickstart.sh，并精读其“变更集日志 + compare-and-swap 落地 + 落地后验证回滚”的设计，判断是否适配你们的多智能体并发改码场景；理由是项目仍为 0.1.0 首个公开版本、接口还可能变动且存在已知缺口，作为可依赖的协作基础设施尚不成熟。
- 原文：https://github.com/feder-cr/open_scion
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-15T16:03:04.644Z

## 是什么

open_scion 是一个开源的服务端版本控制系统，目标场景是“大量编程智能体同时读写同一批分支、每个任务只改几个文件、想在几秒内落地”的工作方式，而不是 Git 原本面向的“人克隆一次、干几小时、推一次”。

它的设计来源是 Anthropic 内部系统 Scion（据 README，Anthropic 在《Redesigning source control》一文中公开描述了该设计，但 Scion 本身不对外）。open_scion 是这一公开设计的独立实现，MIT 许可，作者声明与 Anthropic 无隶属或背书关系。README 明确写“服务器从不调用语言模型，所有 AI 功能可用任意供应商或完全不用”（厂商中立）。

它在代码内部把这些扩展叫 **Graft**：`[graft]` 配置段、`graft` CLI、`internal/graft`、`doc/graft`。底层是 Gitaly（GitLab 的 Git RPC 服务，MIT）的 fork，上游 Gitaly 的每个 RPC 仍然可用。

README 列出的核心设计点（对应实现）：客户端常在线、只拉需要的对象；历史/追溯/搜索在服务端算并缓存为派生数据；落地不用合并队列，而是 rebase 到当前 tip 后用 compare-and-swap 落地，同一分支的并发落地会批量合成一次引用更新；冲突由你选择的 resolver 解决（任意 LLM、确定性工具、或不用）；每次被接受的引用更新都记入有序 changeset log，客户端可列举或实时订阅；存储核心是 SQLite/PostgreSQL 的 write-ahead log 加对象存储（file/S3/GCS/Azure），服务节点是无状态缓存；落地后跑测试、二分定位失败并回滚肇事的那个变更；有“superfans”监控智能体跟踪变更流并汇报，也支持 Slack；审查带语义审批规则（只改注释的变更可以比逻辑变更要求更少的批准）；智能体是一等用户（按智能体的 token、RPC 白名单、分支策略）；`graft-cache` 分级缓存不可变对象并校验每个对象。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：Linux 或 macOS；Go 1.26；C 工具链；Meson 和 Ninja（构建会编译一份内置的 Git）。以下命令与路径均直接来自 README。

1. 克隆与构建（产出 server、CLI 和工具到 `_build/bin`）：

```shell
git clone https://github.com/feder-cr/open_scion.git
cd open_scion
make build                         # server, CLI and tools into _build/bin
```

2. 用官方 quickstart 在临时目录里跑通全链路（一个 server、一个 cache 守护进程、两个 agent，以及一次 land）。这是风险最低的试用方式：

```shell
examples/graft/quickstart.sh       # a server, a cache daemon, two agents and a land, in a temporary directory
```

3. 查看 CLI 可用命令：

```shell
./_build/bin/graft                 # the CLI and its commands
```

4. 起自己的服务器：复制并修改 `examples/graft/config.toml`，然后启动：

```shell
_build/bin/gitaly serve config.toml
```

5. 把仓库状态放进数据库和对象存储（README 指定了迁移顺序，不能直接切 authoritative）：先加一个 `[graft.storage]` 配置段，以 `shadow` 模式启动、导入你的仓库，再切换到 `authoritative`。细节在 `doc/graft/STORAGE.md`（本次材料中未给出该文件内容）。

6. 进一步阅读（README 指向的文档，本次未抓取到正文）：`doc/graft/QUICKSTART.md`、`CONFIGURATION.md`、`ARCHITECTURE.md`、`STORAGE.md`、`LAND-BATCHING.md`、`RESOLVE.md`、`DERIVED.md`、`REVIEW.md`、`SEARCH.md`、`VERIFY.md`、`SUPERFAN.md`、`SUPERFAN-CHAT.md`、`AGENT-SECURITY.md`、`BENCH.md`、`FUZZING.md`、`LIMITATIONS.md`，以及分阶段设计文档 `PLAN.md`–`PLAN6.md`。

7. 参与维护（README 的社区说明）：bug 和新想法开 issue；大的设计改动先开 discussion；PR 请附测试和一段简短的理由说明，因为设计文档 `doc/graft/PLAN*.md` 解释了现状为何如此。

> 注意：上面的步骤只保证“能装起来并跑通 demo”。README 没有给出把 open_scion 接入真实团队工作流（例如与现有 CI、代码审查制度对接）的完整步骤，这些内容在本次材料中不可见。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 主张一些过去不常交给 AI 的环节可以由 AI 承担——用 LLM 作为 resolver 自动解决落地冲突（也可换成确定性工具或不解决）；用“superfans”智能体持续跟踪变更流并向相关组件汇报（含 Slack）；按变更语义自动区分审查强度。这些是设计声称，本次材料没有给出成功率或案例数据。
- **任务匹配**：给出了按任务性质选工具的思路——冲突解决可以是“任意 LLM 供应商 / 确定性工具 / 不处理”三选一；审查强度按变更语义分流（仅注释的变更比逻辑变更要求更少批准）；服务端本身不绑定模型，任何 AI 功能对任意供应商或零供应商都可用。
- **条件供给**：要让智能体安全地参与，需要提供的是——按智能体的 token、RPC 白名单、分支策略（`AGENT-SECURITY.md`）；服务端侧的配置（`config.toml`）与存储（数据库 + 对象存储，`shadow` → `authoritative` 的迁移路径）；以及面向智能体的访问方式（gRPC、`graft` CLI / Go SDK、`graft clone` 与 `graft sparse` 只物化需要的路径）。反馈方面：变更集日志可以被客户端列举或实时订阅，落地后由 `graft-verify` 给出测试与回滚结果。
- **主动推进**：README 明确描述了由事件/状态驱动的持续行为——每次被接受的引用更新成为 changeset log 中的一条，客户端可以 `watch` 实时流；`graft-verify` 在落地后自动测试 tip、二分定位失败并回滚肇事变更；superfan 智能体跟随变更流并按组件汇报。
- **效果验证**：项目自身给出的验证手段是 `graft-verify`（落地后跑测试、定位并回滚）、`graft-cache` 对每个对象做校验（“verifying every object”），以及作者声称的单元、端到端、多节点、崩溃与模糊测试覆盖。README 提到 `BENCH.md` 但本次材料中没有给出任何基准数字。

## 与已有做法的关系

清单中有相关条目：**Graft**（tool，状态 watch）。README 说明 open_scion 内部的扩展就叫 Graft（`[graft]` 配置段、`graft` CLI、`internal/graft`、`doc/graft`），与本条清单高度对应，可以视作同一技术方向的具体实现。清单中该条状态为 watch，与本报告判断一致：有潜力，尚未成熟。

## 证据与局限

原文给出的可核实信息：

- 明确的安装前提与命令、官方 quickstart 脚本、服务启动命令、存储迁移顺序（shadow → authoritative）。
- 与 Anthropic Scion 公开设计逐条对照的实现表（对象服务/稀疏克隆、服务端历史与派生数据、CAS 落地与批量引用更新、冲突 resolver 可选择、changeset log、DB + 对象存储与无状态节点、落地后验证与回滚、superfan、语义审批、按智能体的权限、缓存分级）。
- 项目状态自述：版本 0.1.0，首个公开版本；“以上全部已实现并有单元、端到端、多节点、崩溃与模糊测试覆盖”；接口在 1.0 前仍可能变化；已知缺口（例如存储核心中 packs 的垃圾回收）列在 `LIMITATIONS.md`。
- 出身：Gitaly（GitLab，MIT）的 fork，上游 RPC 全部保留；不含上游非 MIT 的 `ee/` 目录。

只是作者主张、本次材料无法验证的部分：

- “已实现并被各种测试覆盖”“每个对象都校验”等，没有任何测试数量、覆盖率或基准数据；`BENCH.md` 只有链接。
- Scion 设计本身的性能优势（“全量克隆、合并队列和客户端历史遍历成为瓶颈”）是作者的判断，没有对比数据。
- Anthropic 的 Scion 只被“公开描述”过，open_scion 是独立实现；README 自称“独立实现、无隶属与背书”，因此不能把 Anthropic 的工程结果当作本项目的证据。

适用条件（据 README 可判断的）：需要 Linux/macOS、Go 1.26、C 工具链、Meson + Ninja；要自建服务端与存储（SQLite/PostgreSQL + 对象存储，file/S3/GCS/Azure）；收益场景是“成百上千个短生命周期的智能体任务落在同一批分支上”。对于并发智能体很少、或者只有单人使用编码助手的团队，README 描述的全部痛点（合并队列、克隆开销）都不成立，迁移成本与收益不成比例。此外 0.1.0 版本接口可能变动、存在已知缺口，不适合作为生产依赖。

## 怎么试、怎么验证

**最小试用方式**（不改动任何现有仓库）：

1. 按上面第 1、2 步构建并运行 `examples/graft/quickstart.sh`，它会在临时目录里起 server、cache 守护进程、两个 agent 并完成一次 land。观察 CLI（`_build/bin/graft`）暴露了哪些命令、一次“落地”实际发生了什么。
2. 若 demo 通过，再对**一份真实仓库的副本**配置 `[graft.storage]`，以 `shadow` 模式启动并导入，确认导入过程不影响原仓库，然后再考虑是否切 `authoritative`。
3. 阅读 README 指向的 `LIMITATIONS.md`、`RESOLVE.md`、`VERIFY.md`、`REVIEW.md`、`AGENT-SECURITY.md`，确认接口变动风险和已知缺口是否落在你的使用路径上（README 特别点出 packs 垃圾回收缺口）。
4. 不要在此阶段替换团队现有的 Git 托管或审查流程。

**判断有没有改善的指标**（指标口径来自 README 自己宣称的目标，可用你们自己的基线对比）：

- 落地时延：一个智能体任务从产生变更到落到共享分支的耗时，对比现有“分支 + 合并队列/PR”流程。
- 并发落地成功率：同一分支上多个变更并发落地时，有多少无需人工介入即被接受（项目用 compare-and-swap 与批量引用更新来针对这一点）。
- 冲突自动解决的有效率：由你选的 resolver 处理后的冲突，有多少不需要人工返工；同时对比“不用 resolver（none）”的基线，验证是否真的值得引入 LLM。
- 落地后验证的净收益：被 `graft-verify` 自动定位并回滚的失败变更数，以及因此省下的排查时间；同时记录误报/误回滚次数。
- 审查负担分布：启用语义审批规则后，仅注释类变更是否真的走到了更少的批准要求，以及是否出现该拦没拦的情况。
- 智能体权限边界是否被实际触发：per-agent token、RPC 白名单、分支策略在试用期内拦截了多少越界操作。

**放行标准**：只有当上述指标在你们自己的副本仓库上稳定优于现有流程、且 `LIMITATIONS.md` 中的缺口不影响你们的路径、接口变动风险可接受时，才考虑继续深入；否则本次调研的产出应停留在“研读其设计（changeset log、CAS 落地、落地后验证回滚、按智能体的权限与语义审批）”层面。
