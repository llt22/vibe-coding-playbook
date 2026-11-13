# joydle/borg

- 结论：**值得一试**。如果你用 Rust 构建长时、多步、可恢复的智能体流水线，建议小范围试：照 README 的依赖和 DSL 示例搭一个带预算、检查点和人工暂停的最小流水线，再验证崩溃恢复与取消隔离。理由是其取消、隔离、重试、预算和恢复机制写得很具体，但目前只有 README、42 stars，且没有真实 provider 客户端与效果数据，不适合直接 adopt。
- 原文：https://github.com/joydle/borg
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-13T01:57:23.105Z

## 是什么
borg 是一个 Rust 的受监督智能体运行时：把 LLM 调用组合成流水线，支持干净取消、panic 隔离、可重试错误重试、预算控制、崩溃后续跑。它不内置模型供应商客户端，需要自己实现 `AgentLlmClient`；示例默认用 `FakeLlmClient`，因此无 API key 也能跑。依赖从 GitHub 安装，不在 crates.io；要求 Rust 1.88+、Tokio。

## 具体做法
1. **前置条件**：Rust 1.88+、Tokio 项目。在 Cargo 项目中加入依赖，注意 `borg` 在 crates.io 上是无关 crate，必须从 GitHub 固定 release tag 安装：
```toml
[dependencies]
borg = { git = "https://github.com/joydle/borg.git", tag = "v1.0.0" }
async-trait = "0.1"  # derive 宏会展开为 #[async_trait]
```
2. **先跑无 API key 示例**：在仓库工作区运行 README 给出的示例，确认运行时和 DSL 能工作：
```bash
cargo run -p borg --example dogfood --features testing
cargo run -p borg-loop --example streaming_session
```
前提是已取得仓库代码；示例使用 `FakeLlmClient`，不需要真实模型 key。
3. **接入真实模型**：为所用 API 实现一次 `AgentLlmClient`。README 明确说 borg 不附带 provider client，因此这是接入真实 LLM 的必要工程步骤；原文没有给出具体供应商配置，需结合 API 文档实现。
4. **定义单个 agent**：用 derive 宏声明 agent，并从上下文取用户提示：
```rust
use borg::prelude::*;

#[derive(BorgAgentDerive)]
#[borg(id = "reviewer", model = "anthropic/claude-haiku-5-5",
       max_tokens = 800, system = "Review code quality.")]
struct Reviewer;

impl Reviewer {
    fn user_prompt(&self, ctx: &AgentContext) -> Option<String> {
        ctx.handoff.get_as("code")
    }
}

let suggestions: Vec<Suggestion> =
    run_one_typed("review", Reviewer, ctx, handoff).await?;
```
前提是已实现 `AgentLlmClient`，或先用 `FakeLlmClient` 做本地测试。
5. **组合流水线**：用 `seq`、`par`、`repeat` 等原语编排“计划→并行工作→构建修复循环→评审”：
```rust
use borg::prelude::*;

let pipeline = seq([
    step(Planner),
    par([step(Coder), step(TestWriter), step(DocWriter)]),
    repeat(8, |v: &Verdict| v.token == "PASS", || seq([
        step(Builder),
        step(BuildFixer),
    ])),
    step(Reviewer),
]);
```
该例表示：先规划，再并行三个 worker，然后最多 8 轮执行 build→fix 直到 `PASS`，最后评审。README 说明取消会停止所有嵌套 agent 和进行中的 LLM 调用；某个子任务 panic 不会拖垮兄弟任务。
6. **加可靠性控制**：按 README 在 agent 循环边界配置 guardrails（`Warn` / `Throttle` / `Halt`），在每次 dispatch 前做预算准入并设子预算；使用 restart backoff/jitter、restart-storm meltdown、滑动窗口 circuit breaker 和跨模型 fallback ladder。具体 API 需查项目文档，README 只列能力，没有完整配置代码。
7. **加断点续跑与人工暂停**：用 `execute_resumable` 把运行快照写入 `CheckpointStore`；默认每个循环迭代或每步快照。崩溃后同一调用会跳过已完成工作，并拒绝形状不同的流水线快照。store 只需实现三个方法，可接任意数据库。需要人工决策时，agent 请求决策，运行挂起并持久化，之后带 `Decision`（approve、reject、edit）恢复；参考 `human_in_the_loop` 示例。长生命周期会话用 `borg-loop`，`run_session_loop` 让会话持续到 park，并支持 checkpoint/resume；参考 `streaming_session` 示例。
8. **安全边界**：README 明确说 borg 让模型获得子进程和文件访问很容易，但 sandboxing 由使用者负责。涉及子进程/文件操作时，应结合 `borg-sandbox`、`borg-tools` 的 sandbox/approval 机制，不要直接暴露高权限工具。
9. **观测与测试**：启用 `testing` feature 可使用 `FakeLlmClient`、`ScriptedAgent` 和 eval harness；运行时提供 `tracing` span 树（session → composition → step → turn → tool）和 JSONL 事件记录。提交前可按 README 跑检查：
```bash
cargo fmt --all
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
```

## 对应的研究问题
- **能力发现**：borg 不增加模型本身能力，但把“多步流水线、并行 worker、构建修复循环、人工审批、崩溃后续跑”做成可工程化的运行时，适合发现可交给 AI 的长时受监督任务。
- **任务匹配**：适合 Rust/Tokio 工程团队，以及编码、评审、构建、测试、文档等多步骤工作流；支持跨模型 fallback ladder。不适合非 Rust 团队，也不适合没有工程接入能力的个人。
- **条件供给**：需要 Rust 1.88+、Tokio、实现 `AgentLlmClient`、可接数据库的 `CheckpointStore`、MCP 工具/stdio server、sandbox 权限控制，以及人工 `Decision` 通道。
- **主动推进**：README 支持长生命周期会话、heartbeat、`Deferred`、检查点续跑和人工暂停恢复；但没有明确给出时间/事件触发器或调度器，不能据此声称它自带定时触发。
- **效果验证**：提供 `FakeLlmClient`、`ScriptedAgent`、eval harness、tracing span 树和 JSONL 事件记录，可用于验证流程与行为；但原文没有基准测试或生产效果数据。

## 与已有做法的关系
清单中没有相关条目（catalog_related 为空），无法对照。按原文，它不是提示词模板或现成工作流 SOP，而是 Rust 智能体运行时，定位在工程可靠性层。

## 证据与局限
原文是 GitHub README，给出了依赖片段、agent 定义、流水线 DSL、示例命令和可靠性能力清单，这些是可照做的部分。数据方面只有 42 stars、MIT OR Apache-2.0、MSRV Rust 1.88+、release tag `v1.0.0` 等信息；没有 benchmark、生产案例或第三方评测。取消、panic 隔离、重试、预算、断点续跑、guardrails、MCP、视觉、长会话等均为作者主张，本报告未独立验证。重要局限：不内置 provider client，真实接入需自行实现 `AgentLlmClient`；示例默认 FakeLlmClient；不在 crates.io；sandboxing 由使用者负责；README 未展开 `execute_resumable`、预算和 guardrails 的完整 API。

## 怎么试、怎么验证
最小试用：先跑 `dogfood` 和 `streaming_session` 示例；再用 `FakeLlmClient` 搭一个“规划→并行 worker→评审”的小流水线，注入一次子任务 panic 和一次取消，观察是否隔离与干净停止；然后加 `execute_resumable` 和简单 `CheckpointStore`，在中间步骤后模拟重启，看是否跳过已完成步骤；最后接真实 `AgentLlmClient`，加预算和 guardrails 跑一个低风险任务。

验证指标：取消后嵌套 agent 和进行中调用是否全部停止；panic 是否不拖垮兄弟任务；重启后已完成步骤是否被跳过、重复执行次数是否下降；可重试错误的重试成功率与重试次数；是否出现预算超支；人工介入次数；端到端时延和成本；用 `ScriptedAgent` 或 eval harness 对比输出质量。没有原文阈值，建议先记录基线再判断改善。
