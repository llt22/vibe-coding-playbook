# strands-agents/box

- 结论：**值得一试**。可在 Apple silicon Mac 上小范围试：按 README 给的下载/构建命令装起 Strands Box，用 box.toml 控直接访问、policy.dw 写默认拒绝策略，安全地把执行、读写和网络能力放开给 agent；但它自述仍是 Preview、只支持 macOS Apple silicon，策略与配置的具体写法全在外链文档里，原文只提供了安装和构建命令，所以先当可行性验证而非标准做法。
- 原文：https://github.com/strands-agents/box
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-07T22:47:33.365Z

## 是什么

Strands Box 是一个面向 AI agent 的开源沙箱引擎，把操作系统隔离和用 [Dogwood](https://dogwood-policy.github.io/dogwood/) 写的语义策略结合起来，用来控制 agent 能访问什么、以及在什么条件下才能行动。

- **Harness-agnostic**：agent 程序/二进制由你自己选，访问权限写在 `box.toml`，策略写在 `policy.dw`。
- **两级执行**：`box.toml` 里的直接访问限制由宿主 OS 强制执行；Strands Shell、Monty for Python、出口网关（egress gateway）、MCP broker 处理的操作会送进内嵌的 Dogwood Local Engine，由 `policy.dw` 的规则判定。允许/拒绝的判断在 agent 进程之外完成。
- **默认拒绝**：Dogwood 用 `permit` / `forbid` 规则，经引擎检查的操作默认被拒；必须有匹配的 `permit` 才能放行，匹配的 `forbid` 优先级更高。
- **共享事件历史**：解释器和网关共享事件历史，规则可以依据早前的动作和已流逝时间决定下一步是否放行。README 举的例子是：一次经 Shell 或 Python 的文件读，可以导致网关随后拒绝一个出站 HTTP 请求。
- **凭证注入**：网关用配置好的 API 凭证或 AWS SigV4 给放行的请求做认证，agent 拿不到底层 secret。
- **决策记录**：策略决策以 OTLP JSON 记录，默认写到 `<box_dir>/private/telemetry/records.jsonl`。

注意一条边界：`box.toml` 里的直接文件系统授权由 OS 执行，**不产生单条 Dogwood 决策**；要让策略管到文件操作，必须走解释器，并把这些文件排除在直接授权之外。

**成熟度**：README 明确标注 Preview，当前只支持 macOS Apple silicon 上的本地执行。仓库 63 stars。

## 具体做法

前提（README 的 getting-started 要求）：Apple silicon 的 Mac、macOS 15 或更高、Homebrew 安装的 Node.js 22.21 或更高、能访问 `us-west-2` 上 Amazon Bedrock 的 Claude Opus 5。

1. 下载并验证可执行文件。下载脚本会校验 release checksum，把二进制解包到 `./box-core`，不改 `PATH`，也不动系统目录：

```sh
curl -fsSL https://raw.githubusercontent.com/strands-agents/box/main/download.sh | sh
./box-core/box --version
```

2. 保持下载下来的二进制都放在同一个 `./box-core` 目录里。

3. （替代路线）从源码构建。这是 Cargo workspace，`rust-toolchain.toml` 固定编译器，首次构建时由 rustup 安装：

```sh
git clone https://github.com/strands-agents/box.git
cd box
cargo build --release -p strands-box -p strands-box-containment
```

构建产物按 `./target/release/strands-box` 运行，helper 二进制要放在同一目录。常用任务走 `just`：

```sh
just build         # the CLI, the alias image, and the containment trampoline
just test          # workspace tests
just check         # pre-push gate: fmt-check + clippy + test
just test-all      # workspace tests and box example checks
```

完整测试套件是 `cargo test --workspace --all-features`；要加 `--all-features` 才会跑 `box_shell` 和 `box_credentials` 两套测试，它们依赖 `test-support` feature。

4. 按 `docs/user/getting-started.md` 的 getting-started 指南用 Box 跑 Strands CLI，写 `box.toml` 和 `policy.dw`，然后启动 box。（该指南本身是外链文档，原文没有给出其内容。）

5. 改权限时分清两个文件：`box.toml` 改 agent 的运行环境和直接访问授权；`policy.dw` 改 Box 经由解释器和网关检查的操作规则。原文没有给出这两个文件的字段或示例内容。

6. 需要写策略时，可以把策略编写 skill 交给你的编码 agent，让它帮你处理 Dogwood 语法和 Box 支持的动作：

```
https://raw.githubusercontent.com/strands-agents/box/main/.agents/skills/authoring-box-policy/SKILL.md
```

7. 记住第 1 节那条边界：直接文件系统授权由 OS 执行、不产生 Dogwood 决策；要让文件操作受策略约束，用解释器并把这些文件移出直接授权。细节见 `docs/user/security.md` 和 `docs/user/policy.md`。

8. 跑示例：`examples/strands-box/strands-sdk-agent/` 是一个小 agent，三个工具都走 Shell；`examples/README.md` 是示例索引，含依赖和运行说明。

9. 需要 agent 调外部 API 时，把凭证配在网关上（API 凭证或 AWS SigV4 签名），不要给 agent 本体。

10. 需要审计时去读决策记录：默认 `<box_dir>/private/telemetry/records.jsonl`，OTLP JSON 格式。

## 对应的研究问题

1. **能力发现**：Box 针对的是“因为风险而不敢交给 agent”的那类工作——执行命令/代码、读写文件、发网络请求、调本地 MCP 工具。默认拒绝加上可引用历史动作和时间的规则，使“读过某文件后就不许再发外网请求”这类跨步骤约束可以被表达出来，从而把这类工作安全地放出去。
2. **任务匹配**：Box 是 harness-agnostic 的，agent 程序由使用者选。对需要 shell、Python、本地 MCP、外网访问的任务，用法上要区分两条路：走解释器和网关才能被策略检查和记录；直接授权只受 OS 限制、不产生策略决策。外部程序（如 `git`、`cargo`）和本地 MCP server 会先被策略检查启动，然后在各自的沙箱里运行，其网络流量默认走 Box 的网关。
3. **条件供给**：这是 Box 最有依据的一块。权限来自 `box.toml` 的直接授权（OS 强制），规则来自 `policy.dw`（permit/forbid，默认拒绝），**凭证由网关注入而不交给 agent**——也就是给能力但不给秘密。反馈则通过 OTLP JSON 决策记录回传。
4. **主动推进**：共享事件历史加时序规则，让规则的判定可以依赖早前动作和已流逝时间，属于“状态依赖的自动约束”。但原文没有给基于时间或事件触发的调度、持续运行的机制。
5. **效果验证**：决策记录（OTLP JSON，默认路径已知）可用于事后审计每条被检查操作的结果。原文没有给任何效果指标或前后对照数据。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

**原文给出的事实/具体物**：
- 仓库 63 stars；README 自述为 Preview，当前只支持 macOS Apple silicon 本地执行。
- 下载脚本会校验 release checksum、解包到 `./box-core`、不改 `PATH` 和系统目录；`./box-core/box --version` 可自检。
- 构建路径完整：Cargo workspace、`rust-toolchain.toml` 固定编译器、两条 `cargo build --release` 的 `-p` 参数、`just` 的四个任务、`--all-features` 与 `test-support` 的关系。
- 两个配置文件的名字与分工（`box.toml` / `policy.dw`）、策略 skill 的原始 URL、决策记录默认路径、示例目录路径。
- 架构描述：Dogwood Local Engine 与执法组件跑在 agent 沙箱之外的独立进程里。

**只是作者主张、原文未展开的部分**：
- `box.toml` 的字段写法和 `policy.dw` 的规则示例都没有给出，getting-started、security、policy、architecture 全在外链 `docs/` 里，本次材料未包含。
- “默认拒绝”“permit 覆盖、forbid 优先”“文件读会影响后续 HTTP 放行”都是文字描述，没有附测试、日志或案例数据。
- “凭证注入让 agent 拿不到 secret”是设计声明，没有给出验证方式。

**适用条件**：Apple silicon Mac、macOS 15+、Node.js 22.21+（Homebrew）、可访问 us-west-2 的 Bedrock Claude Opus 5。非该硬件或不满足该模型访问条件的环境无法照做。Preview 阶段接口和文档可能变动。

## 怎么试、怎么验证

**最小试用方式**

1. 在一台满足前提的 Apple silicon Mac 上执行第 1 节的下载与 `--version`，确认二进制可运行。
2. 按 `docs/user/getting-started.md` 写出最小 `box.toml` 和 `policy.dw`，启动 box，跑 `examples/strands-box/strands-sdk-agent/` 这个三个工具都走 Shell 的示例，确认能跑通。
3. 只做一件事：把示例 agent 的一次操作从“直接授权”改成“经解释器 + 策略检查”，体会第 1 节那条边界的差别。
4. 拿不到 Apple silicon 机器或 Bedrock 模型访问时，不要强行套用，退回借鉴设计：默认拒绝、凭证注入、决策记录三件事本身是通用的。

**判断有没有改善的指标**

- **拒绝有效性**：让 agent 访问未授权路径或发未 `permit` 的请求，确认被实际拒绝（不是靠提示词约束）。
- **记录完整性**：`<box_dir>/private/telemetry/records.jsonl` 中对每次受检查操作都有 OTLP JSON 记录；把记录条数与 agent 实际发起的调用对照，看是否有漏记，尤其确认直接授权的文件操作确实不出现在 Dogwood 决策里。
- **凭证不外泄**：确认 agent 侧拿不到底层 secret，同时经网关签名的请求仍然成功。
- **时序规则生效**：复现 README 举的场景——一次文件读之后，网关拒绝后续出站 HTTP——看是否与描述一致。
- **工作方式改善**：挑一件原本因风险不做、需要人工逐步审批的 agent 任务，交给 Box 后比较是否能无人值守完成；出问题时能否从决策记录定位到是被哪条规则拒绝。

以上任一条在本机无法复现，就不宜按“可照做”写入手册，只保留其沙箱设计思路。
