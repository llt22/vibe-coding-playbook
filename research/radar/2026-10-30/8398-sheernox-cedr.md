# Sheernox/cedr

- 结论：**值得一试**。可以用小范围试点的方式接入 cedr：先只做“按工作类型路由、记录结果”和“把 skill/MCP 版本固定进锁文件”两件事，再考虑多厂商评审门禁；理由是 README 给出了可直接照做的安装命令、routes.toml 样例、statusline 配置和完整命令表，但项目处于 preview 阶段、缺少任何效果数据，暂不宜直接定为团队标准。
- 原文：https://github.com/Sheernox/cedr
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-29T23:56:15.471Z

## 是什么

`cedr` 是一个 Rust 编写的开源 CLI（Apache-2.0，官方标注为 preview，1.0 前命令与文件格式仍可能变），它把三件事打包在一个工具里：

- **Route**：按 `routes.toml` 为“某一类工作”挑出 agent、模型和 effort；同样合适时优先给剩余额度最多的计划，接近上限的计划被跳过。
- **Council**：每个厂商起一个 reviewer，合并各家报告，把指向同一处的发现归组，并做出放行或阻断的决定；任何 P0 或 P1 都阻断，报告数量不足时不会静默放行。
- **Guard**（preview）：检查仓库的 agent 配置，把每个 skill 和 MCP server 固定进 `cedr.lock`，锁定后若某个 server 的工具、描述或网络主机发生变化，在 CI 中失败。

它可配合 Claude Code、Codex、Cursor、Gemini 使用，也可被任何支持 MCP 的 agent 直接调用（`cedr mcp`）。

## 具体做法

### 1. 安装 CLI

前提：选好对应平台的发布包；Linux 需要 glibc 2.34 或更新（Ubuntu 22.04、Debian 12、RHEL 9 及以上）。

```sh
curl -fsSL https://github.com/Sheernox/cedr/releases/latest/download/cedr-x86_64-unknown-linux-gnu.tar.gz | tar -xz
install -m 755 cedr-x86_64-unknown-linux-gnu/cedr ~/.local/bin/cedr
cedr --version
```

其他平台对应 `cedr-aarch64-unknown-linux-gnu.tar.gz`、`cedr-aarch64-apple-darwin.tar.gz`、`cedr-x86_64-apple-darwin.tar.gz`、`cedr-x86_64-pc-windows-msvc.zip`。

前提：需要溯源校验时，每个 release 带 `SHA256SUMS` 和签名的构建来源，可用 `gh attestation verify <archive> --repo Sheernox/cedr` 检查。

前提：不想用二进制、本机有较新的稳定版 Rust 工具链（rustup）：

```sh
cargo install --locked --git https://github.com/Sheernox/cedr cedr
```

### 2. 描述“计划”和“路由”

前提：先明确你手上有哪几个 harness（如 claude、codex）、各自用量读数从哪来。写入 `~/.config/cedr/routes.toml`（README 提到 cedr.dev 的 Route 页面可生成此文件）：

```toml
version = 1

[orchestrator]                  # the agent you work in; it keeps work no one else should take
harness = "claude"
model = "opus"

[harnesses.claude]
expect = ["five_hour", "seven_day"]
effort_option = "effort"

[harnesses.codex]
expect = ["primary"]
effort_option = "reasoningEffort"

[[readings]]                    # where plan usage comes from
kind = "claude-statusline"
harness = "claude"

[[readings]]
kind = "codex"
harness = "codex"

[routes."review.code"]
work = "Independent review"
role = "review"
candidates = [
  { target = "codex/sol", effort = "high", tier = 1 },
  { target = "claude/sonnet", effort = "high", tier = 1 },
  { target = "self" },
]
```

要点：`work` 描述这类工作是什么，`role` 是角色，`candidates` 按 `tier` 列出候选 target 与 effort，`self` 表示留给你正在用的 orchestrator。

### 3. 让 cedr 读到 Claude Code 的计划用量

前提：使用 Claude Code。把 cedr 设为状态行，写入 `~/.claude/settings.json`：

```json
{ "statusLine": { "type": "command", "command": "cedr route statusline" } }
```

前提：已有自定义状态行要保留，就在命令后追加 `-- <your command>`。

### 4. 选取，并回填结果

```console
$ cedr route pick review.code
[route review.code -> codex/gpt-6.1-sol high | balanced:31%<claude=64% | codex s22% w31%; claude s64% w48% | rules 770517e | pick p-979e77351990]
  codex/gpt-6.1-sol role=review

$ cedr route verdict p-979e77351990 accepted
```

`cedr route stats` 会显示每类工作上哪个模型表现最好。`verdict` 取值为 accepted、reworked、redone、rejected（来自命令表说明）。辅助命令：`cedr route pools` 看各计划剩余空间与 cedr 会用哪些，`cedr route list` 列出路由与每个路由会尝试的模型。

### 5. 多厂商评审门禁

```sh
cedr council plan <route>     # 指定每个厂商起一个 reviewer，以及 quorum
cedr council merge <reports>...  # 合并报告并决定是否放行
```

前提：每个厂商的 reviewer 需要能产出报告；README 未给出报告格式细节，只指向 `docs/council.md`。

### 6. 固定技能与 MCP server

```sh
cedr lint      # 找仓库 agent 配置里的问题
cedr lock      # 把每个 skill 和 MCP server 钉进 cedr.lock
cedr verify    # 配置不再匹配 cedr.lock 时失败（离线）
```

前提：`cedr lock` 只有在传 `--introspect` 时才会真正运行 MCP server，运行前会先警告——若不允许执行第三方 server，就不要加这个参数。

### 7. 从 agent 里直接调用

```sh
claude mcp add cedr -- cedr mcp
codex mcp add cedr -- cedr mcp
```

前提：agent 支持 MCP。`cedr mcp` 通过 stdio 暴露 Route 与 Council 工具。

### 8. 凭据与数据边界（采用前必须确认）

README 声明：cedr 不读 agent 凭据、不代你调用厂商 API；用量来自 agent 自己的状态行与 CLI，或你指定的 feed；pick、verdict、stats 留在本机，只有加了 `[sync]` 段和 cedr.dev API key 后 `cedr route sync` 才上传。

## 对应的研究问题

**1. 能力发现**：README 明确把它自己承担的工作限定为三件——选 agent/模型/effort、合并多厂商评审、固定 agent 加载的 skill 与 MCP。这提示一类容易被忽略的可委派工作：**元层面的选择与门禁判断**（谁来做、放不放行、加载了什么都交给工具记录），而不是再做一遍具体编码。除此之外，原文没有给出更多“还没想到交给 AI 的工作”的清单。

**2. 任务匹配**：这是 cedr 的主功能。匹配单位是 `route`（一类工作，如 `review.code`），匹配依据是 `work`/`role`/`candidates`（target + effort + tier），并叠加额度约束（“同样合适的工作给剩余空间最多的计划，接近上限的计划跳过”）；`verdict` 回填后 `route stats` 才给出“哪个模型在这类工作上更好”的经验数据。也就是说匹配是“先声明候选 + 用结果校正”，不是一次性静态指定。

**3. 条件供给**：需要的输入写得很具体——`routes.toml` 的 harness 声明（`expect`、`effort_option`）、用量读数来源（`[[readings]]`，kind 为 `claude-statusline` 或 `codex`）、Claude Code 的 statusLine 挂载、MCP 注册、`cedr.lock` 作为可复现的基线。缺任一项，路由或校验就失去依据。

**4. 主动推进**：部分支持。`route pick` 在每次调用时触发并自动做额度均衡；`verify` 设计为“配置漂移时失败”，适合挂到 CI 做状态触发检查。原文没有描述定时或事件驱动的自主循环编排。

**5. 效果验证**：给了两条可操作的度量路径。其一，`cedr route verdict <pick> <accepted|reworked|redone|rejected>` + `cedr route stats`，按 route × model 统计选取与结果；其二，Council 的门禁规则是显式的——P0/P1 阻断、报告过少不静默通过，加上 `verify` 的退出码可作为 CI 判定。

## 与已有做法的关系

清单中有 **Claude Code（adopt）** 和 **Cursor（watch）**。cedr 不是替代它们，而是叠在上面的一层编排与门禁工具：它需要 Claude Code 的状态行/CLI 提供用量读数，`[orchestrator]` 示例也直接把 claude 当作你工作的主 agent。Cursor 在 README 中被列为支持的 harness，但没有给出任何 Cursor 侧的具体配置或读数接入步骤，因此对 Cursor 只能算“声称支持”，无法照做。与清单中 Claude Code 的 adopt 状态相比，cedr 属于跨 harness 的横向扩展，是否引入取决于你是否真的在多厂商/多计划之间分配工作。

## 证据与局限

**原文给出的可核对内容**：安装命令与平台矩阵、glibc 版本要求、`routes.toml` 完整样例、Claude Code statusLine 的 JSON、Quick start 的真实命令与示例输出、13 条命令的职责表、Council 的判定规则（P0/P1 阻断、quorum 不足不静默通过）、Guard 的行为（`--introspect` 才运行 server 且先警告）、供应链材料（`SHA256SUMS`、`gh attestation verify`）、以及指向 `docs/route.md`、`docs/council.md`、`docs/design.md` 的“每个配置字段、输出形状和退出码都有规格”。

**只是作者主张、没有证据的**：路由“挑得对”、Council 能提高评审质量、锁文件能防住真实风险——原文没有任何效果数据、案例研究、对比实验或用户反馈。仓库仅 42 stars，单一组织（Sheernox）维护，preview 阶段。示例输出里的 `balanced:31%<claude=64%`、`codex s22% w31%` 等百分比是演示用的输出样例，不是实测结论。

**适用条件与风险**：
- 命令与文件格式在 1.0 前可能变，写进团队流程会有迁移成本。
- 用量接入方式在原文中只具体说明了 claude-statusline 与 codex 两种 kind，其他 harness 如何提供读数未说明。
- Council 的 reviewer 报告格式、quorum 默认值、merge 的输入形态原文未给，需读 `docs/council.md` 才能落地。
- `cedr route sync` 会把历史与路由上传到 cedr.dev，涉及数据外发，默认应不开。
- 免费开源，但跨机器/团队共享路由属于付费计划功能。

## 怎么试、怎么验证

**最小试用（建议 1 人 × 2 周，不铺开）**
1. 只装 CLI，只配 2 个 harness（Claude + Codex），只定义 2 条 route：一条 `review.code`，一条你日常最重复的实现类工作。
2. 用 1 天完成 statusline 接入，确认 `cedr route pools` 能显示出真实的计划剩余量；如果读不到数，直接停，不要继续。
3. 第一周只用 `pick` + `verdict`，不启用 Council、不加 sync。每类工作至少积累 15–20 次 pick 与 verdict 再看得出的分布。
4. 第二周在 2–3 个真实 PR 上跑 `cedr lint` / `cedr lock` / `cedr verify`，`lock` 不加 `--introspect`；确认 `verify` 在人为改动某个 MCP 配置后确实失败。
5. 若前四步顺利，再挑 3 个 PR 对比“单模型评审 vs `council plan/merge`”的产出差异。

**判断有没有改善的指标**
- 按 route × model 的 `accepted` 占比，以及 `reworked` / `redone` 占比；对照基线是“同一类工作固定用一个模型”的历史数据。若两周后 `route stats` 里看不出任何稳定偏好，说明路由没带来选择价值。
- 撞额度上限被迫等待的次数（结合 `route pools` 观察），路由声称的均衡效果应体现为这类中断减少。
- Council 判为 P0/P1 的发现中，人工复核确认为真问题的比例（准确率）；以及人工复核发现而 Council 漏掉的严重问题数（漏报）。门禁的价值在准确率可接受前提下的漏报下降。
- `verify` 在 CI 中的失败里，属于“真实配置漂移”的比例；误报过多会让人直接绕过门禁。
- 运维成本：配置文件需要多久维护一次、preview 版本升级是否破坏过 `routes.toml` 或 `cedr.lock`。

**止损条件**：试用期内若出现 (a) 升级导致配置必须重写、(b) `verify` 误报导致 CI 被绕过、(c) `route stats` 样本不足以下判断，就停在“study”，只借鉴它的三件式结构（路由 / 多厂商门禁 / 锁文件），不引入这个具体工具。
