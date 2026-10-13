# vakandi/opencode-rust

- 结论：**值得一试**。用 npm 装一份、配好有余额的 provider key，在一个小仓库上用 `opr run` 和 TUI 各跑同一个任务，与现有编码代理对比后再决定是否迁移——它的安装、配置路径、代理池格式和 run 的后台等待语义都是可直接照做的具体内容，但作者自认 `run` 的端到端链路尚未在有过余额的 provider 上验证过，因此只适合小范围试。
- 原文：https://github.com/vakandi/opencode-rust
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T08:36:10.235Z

## 是什么

`opencode-rust` 是 OpenCode 的 Rust 重实现（作者声明与 OpenCode 团队无关，MIT 许可，仓库 35 stars）。它把原本用 TypeScript 写的本地 AI 编码代理引擎换成 Rust，对外提供三种使用面：交互式 TUI（`opr`）、单次执行（`opr run "…"`）、HTTP 服务（`opr serve --port 3000`），另有 Web 和 ACP。能力面包括 22 个内置工具、MCP（stdio + HTTP）、LSP、TypeScript 插件桥（Node 子进程）、SQLite 存储、按路径的权限控制。

README 的主体其实是工程修复记录（TUI 渲染宽度、`/` 弹窗锚定、SSE 流式、`run` 不再丢弃工具调用、MCP 三个独立缺陷、代理池），这些对「怎么把 AI 用在工作里」本身没有直接指导；但安装、配置、运行语义和代理池格式等部分是可照做的。

## 具体做法

前提：Node 18+（引擎要用 Node 跑插件桥、用 npx 启动 MCP 服务器，无论怎么装都需要），以及一个可用的 provider key。

1. 安装。三条路，行为**不完全等价**。

npm（Linux/macOS/Windows）：
```bash
npm install -g opencode-rust
```
安装过程不编译，npm 只拉取对应平台的预编译包（darwin-arm64/x64、linux-x64-gnu、linux-arm64-gnu、linux-x64-musl、win32-x64-msvc）。没有匹配平台时安装器打印可选方案后干净退出，不会让安装失败，也不会强制装 Rust 工具链。

Homebrew（macOS/Linux）：
```bash
brew install vakandi/tap/opencode-rust
```
这个 formula 从源码构建，首次安装会把 Rust 工具链作为构建依赖拉下来。

源码：
```bash
git clone https://github.com/vakandi/opencode-rust.git
cd opencode-rust
./install.sh          # 构建 release 二进制并安装 `opr`
```
`install.sh` 会对每个 `.rs` 文件和 `Cargo.toml`/`Cargo.lock` 做指纹，代码没变时重复执行会跳过重建，`--force` 强制重建。它还会为每个 agent 安装一个快捷命令。

2. 首次运行前配置 provider key：
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

3. 按安装方式使用正确的命令形式。`opr` 在不同安装下行为不同：npm 装的是分发脚本，`opr --some-flag` 会被转成 `opencode tui --some-flag`；Homebrew 装的是普通符号链接，同样写法会变成 `opencode --some-flag` 并被拒绝，必须显式写子命令（`opr tui --some-flag`）。

4. 三种运行方式：
```bash
opr                                   # 交互式 TUI
opr run "check this repo for risks"    # 单次 prompt，跑到完成
opr serve --port 3000                 # HTTP 服务
```

5. TUI 里用 `Tab` 在内置 agent 间切换：`build`（默认，全权，开发工作）、`plan`（只读，分析和代码探索）。更多 agent 在配置里定义。

6. 命名 agent 快捷命令（由 `install.sh` 安装，每个 agent 一条，等价于 `--agent <slug>`）：
```bash
gilfoyle  "fix this failing test"     # --agent gilfoyle
setbon    "write 5 ad hooks"          # --agent setbon
googlebot "audit my meta tags"        # --agent googlebot
```
不给 prompt 时打印 usage 到 stderr 并以退出码 2 结束。

7. 配置文件解析（向上搜索并合并）：
- `opencode.jsonc` · `opencode.json` · `.opencode/opencode.jsonc` · `.opencode/opencode.json`
- 全局默认：`~/.config/opencode/opencode.json[c]`
- agent 定义另外从 `~/.omo/omo.jsonc` 和 `~/.config/omo/omo.jsonc` 读取（oh-my-opencode 实际存放 agent 的文件）

运行期解析路径：
```bash
opr db path
opr debug paths
```

8. 需要 MCP 时在配置里声明服务器（stdio 或 HTTP）。stdio 传输是换行分隔 JSON；服务器并行启动，上限 90 秒。原文实测修复后「3 servers start in ~4 s and 77 tools are exposed to agents」。

9. 无人值守跑长任务时用 `run` 并设置后台等待上限：
```bash
opr run --wait-background-timeout 300 "…"
```
默认 120 秒。`run` 在本轮结束后继续持有进程，依次等待：本轮工具执行与 awaited 子 agent 完成、`session.idle` 通知、子 agent/团队成员（记录在 omo 自己的 SQLite 里）、`.omo/run-continuation/<session>.json` 的后台任务账本（带过期保护）。drain 逻辑 fail-open：没有数据库就当作没有子任务，账本缺失或 JSON 损坏就当作空闲，不会挂死。

10. 代理池（需要多出口 IP 时）。文件位置：
- macOS — `~/Library/Application Support/opencode/proxy-pool.txt`
- Linux — `~/.local/share/opencode/proxy-pool.txt`
- Windows — `%LOCALAPPDATA%\opencode\proxy-pool.txt`
- 若设置了 `OPENCODE_PATHS_ROOT`，文件为 `$OPENCODE_PATHS_ROOT/opencode/proxy-pool.txt`（同一开关也移动数据库和凭据）

格式为每行一条，前两个冒号分隔字段必填（host、大于 0 的 port）：
```text
198.51.100.10:8080
203.0.113.24:1080

198.51.100.31:3128:myuser:mypass

203.0.113.77:8000 | note:rotates hourly
```
`|` 之后是按键解析的元数据（`last:`、`dur:`），不是按位置解析。没有注释语法，`#` 开头的行只是解析失败被丢弃并记一条 debug 日志。

关键约束：代理必须通过 `opencode_proxy::start()` 启用，**不要**自己 export 代理环境变量——`reqwest` 在构建客户端时就快照了代理环境，export 必须早于 provider 注册表构建。池为空或不可读时 `start()` 返回错误，而不是起一个对所有请求回 502 的监听器。同目录下还会自动维护 `proxy-quarantine.json`（探测失败的候选）和 `proxy-claims.json`（会话与上游的归属）。

11. 自检/开发：
```bash
cargo test --workspace          # 571 tests
cargo build --release --bin opencode
cargo clippy --workspace --all-targets
```

## 对应的研究问题

1. 能力发现：原文给出的扩展入口是 MCP 和插件桥——把外部工具以 MCP 服务器形式接进来后「Tools reach the model *and* execute」，即工具既注册给模型也能在同一轮的 `ToolRegistry` 里被解析执行；修复后实测 3 个 server、77 个工具暴露给 agent。插件是 Node 子进程，支持反向通知通道（TS 侧 `sendNotification`，Rust 侧按 `params.requestId` 关联），可用于观察进行中的进度。这是「把没想到交给 AI 的工具接进 agent」的具体机制，但原文没有给出各类具体工具的使用范例。

2. 任务匹配：`build`（全权、开发）与 `plan`（只读、分析探索）对应两类任务；`run` 适合一条 prompt 跑完的单次任务，TUI 适合交互式长会话，`serve`/`web`/`acp` 适合把引擎当服务挂到别的前端。`run` 的 flag 列表（`--agent`、`--fork`、`--thinking`、`--variant`、`--format` 等）给了按任务调节的入口。原文没有做模型之间的对比评测。

3. 条件供给：Node 18+ 和 provider key 是硬前提；权限是 per-path scoping 且「最后匹配的规则生效」；工具与上下文来自配置文件（多路径合并）和 `~/.omo/omo.jsonc`；MCP 服务器提供外部工具；插件以子进程提供扩展；代理池提供网络出口。这是一份「要提供什么才能让它干活」的具体清单。

4. 主动推进：`run` 的等待语义是这一块最有价值的部分——一轮结束后进程不退出，按四个阶段持续等待直到它启动的工作真正完成，并可用 `--wait-background-timeout <SECONDS>`（默认 120 秒）封顶；等待失败时 fail-open 而不是挂死。代理池按时间触发：每 120 秒重选最久未使用的上游，候选需先通过真实 CONNECT 探测才生效，被拒绝的进入隔离而非无限重试。MCP 服务器并行启动并有 90 秒上限。

5. 效果验证：原文给的是工程自检数据（571 tests passing、21 crates、MCP 3 servers ~4 s / 77 tools、22 个内置工具），以及作者叙述的动机数据（5 队 × 5 agent 在 MacBook Pro M5 上把 CPU 打到 99%、机器不可用）。这些验证的是工具自身是否按预期工作，不是面向用户工作的效果指标。原文还明确说明 `run` 尚未在有过余额的 provider 上做端到端验证。因此这一问在本材料里只能得到工具可用性的验证方式，拿不到工作产出改善的判断标准。

## 与已有做法的关系

清单中已有 `OpenCode`（tool，watch）：本仓库明确是 OpenCode 的 Rust 重实现，README 末句写明 "Not affiliated with the OpenCode team"。它可直接作为 OpenCode 的另一实现做对比或迁移对象，配置文件名（`opencode.json` 等）、`opencode` 二进制名、agent/会话概念都沿用同一套命名；作者给出的迁移理由集中在资源占用（会话历史落 SQLite、请求体流式、工具 schema 按 `(model, tool-set)` 缓存、实例状态按配置哈希池化并做 LRU+TTL 驱逐、不需要容器运行时）。

清单中已有 `Atlas`（tool，watch）：原文提到 oh-my-opencode（omo）把 agent 存在 `~/.omo/omo.jsonc`，且插件用显示名注册 agent（举例为 `Atlas - Plan Executor`），而配置文件用 slug（`atlas`）作为键，两者不一致会导致按精确键查找失败、配置的模型落不到 agent 上；原文把默认 agent 定为 `gilfoyle`。这里只能确认「Atlas 这个名字在该生态里作为 agent 显示名出现过」，不能据此断定与清单中的 Atlas 是同一条目。

## 证据与局限

原文给的数据：21 crates、571 tests passing、22 个内置工具、MCP 修复后 3 个 server 约 4 秒启动并暴露 77 个工具、MCP 启动并行上限 90 秒、`run` 后台等待默认 120 秒、代理每 120 秒轮换、5 队 × 5 agent 在 MacBook Pro M5 上 CPU 99%。其中测试数、工具数、MCP 实测数字属于工具自身行为数据；CPU 99% 那段是作者对旧 TypeScript 引擎的叙述，没有基准对比表。

属于作者主张的部分：Rust 版在内存与 CPU 上更好的整体结论（原文只描述机制——SQLite 落盘、schema 缓存、状态池化 + LRU/TTL、无容器——没有给出与 TypeScript 版的对照测量）；代理池对「长 agent 跑不烧穿单个出口 IP」的效果；插件反向通道的实际用途。

原文自己声明的关键局限：`run` 是针对真实 `bash` 工具、经真实 session 引擎验证的，但**没有**在有过余额的 provider 上跑通端到端——免费 OpenRouter 模型拒绝 tool schema，付费模型没额度时返回 402。也就是说 `run` 的完整链路（真实模型 → 工具执行 → 后台等待）在本材料里没有被证明。

适用条件：Node 18+ 必须；必须有可用 provider key；npm 路线覆盖 Linux/macOS/Windows，Homebrew 路线覆盖 macOS/Linux，源码路线需 Rust 工具链；仓库 35 stars，成熟度和社区验证都偏低。另外 `opr` 的行为随安装方式变化，这一点会直接影响照着抄命令是否成功。

## 怎么试、怎么验证

最小试用（半小时内可完成）：
1. 确认 Node 18+ 和一个有余额的 provider key（不要用免费 OpenRouter 模型）。
2. `npm install -g opencode-rust`，然后 `export ANTHROPIC_API_KEY=…`。
3. 选一个小仓库，用同一条 prompt 分别跑单次模式和交互模式：
```bash
opr run "check this repo for risks"
opr    # 在 TUI 里输入同一条 prompt，Tab 切到 plan agent 再试一次
```

判断有没有改善的指标（都要和自己现有 agent 方案在同一任务、同一模型上比）：
- 工具是否真的执行：原文说修复前 `run` 只会打印 `[Calling tool: …]` 然后进程退出、把工作带走。试用时直接看有没有真实的工具调用结果落到工作目录或会话里。
- 启动的子任务是否被等完：发起一个会 spawn 子 agent 或后台任务的 prompt，观察进程是否在 `--wait-background-timeout`（先试默认 120 秒，再试 300 秒）内保持存活并等到子任务停止，同时确认不会超过上限挂死。
- MCP 是否真的可用：接 1–2 个 MCP server，看启动耗时和暴露给 agent 的工具数，再让 agent 实际调用其中一个工具，确认「注册了」和「能执行」同时成立。
- 会话与状态：用 `opr session` / `opr stats` / `opr db path` 查看会话记录和落盘位置，确认历史落到 SQLite，且跨进程用 `--continue`/`--session` 能接上。
- 资源占用：原文的动机是资源瓶颈，试用时在跑一批并发 agent 的同时看 CPU/内存，与现有方案对比，判断「不用容器」在你机器上是否站得住。

不建议直接替换生产流程：原文自认 `run` 的端到端未经验证，先当并行方案试，验证通过再考虑迁移。若只是想了解「本地编码代理有哪些可选实现」，这条线索更适合作为对比对象使用。
