# pullboard-dev/pullboard

- 结论：**值得一试**。建议在小范围试：先用 `pullboard tour` 看一遍闭环，再在一个真实小仓库里把「SPEC 行 → gate → 另一个智能体在同一 commit 上验证」跑通，然后决定是否固化成日常流程；理由是它把「第二个智能体验证通过才算完成」做成了可强制执行的状态机，并给出了可直接复制的命令与配置（MIT、本地运行、不调用模型），但项目很小（41 stars）、Windows 未测试、部分功能仍在 planned，适合先试验证收益。
- 原文：https://github.com/pullboard-dev/pullboard
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-08T10:54:02.819Z

## 是什么
Pullboard 是一个跑在本机、存放在你 git 仓库里的编码智能体协调看板。核心闭环是：你批准 `SPEC.md` 里的需求行 → 智能体在各自 lane（独立 worktree）里认领并构建 → 提交必须通过 gate（如 `npm test`）→ 一个没有参与构建的第二智能体在同一个 commit 上验证 → 验证通过才合并。按 README 原文它「lives in your git repo · no account · no dependencies · never calls a model」，只做协调队列与状态机。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）
前提：本机有 git 和 Node 22.13 或更新版本（README 原文："You need git and Node 22.13 or newer"）；在一个 git 仓库内操作；MIT 许可。

1. 先看一遍闭环（在一次性/临时仓库上跑）。前提：已装 Node。
```sh
npm i -g pullboard
pullboard tour
```
tour 里你会批准一条规则（空名字按 "world" 问候）：coordinator 建条目 → builder 构建 → verifier 试空名字并驳回 → builder 修复并加测试 → verifier 故意破坏修复、看到测试失败、然后接受 → coordinator 带 receipt 合并。

2. 在自己的仓库初始化。`init` 会写入 spec、doctrine、agent 指令，并安装 hooks 和看板。
```sh
pullboard init
git add -A && git commit -m "chore(repo): set up pullboard"
```
提交它写出来的文件后，在该目录打开一个 Claude Code 会话并说明要构建什么；这个 agent 就成为 coordinator（与你一起定 spec、规划 lanes 和 items、每条 lane 跑一个 builder，另跑一个没参与构建的 verifier，只合并已验证的工作）。

3. 写 `SPEC.md`，一行一个需求，格式固定：
```
- <id> [<status>, <priority>] <what must be true> | gate: <what proves it>
```
例：
```markdown
- G1 [approved, must] A shopper can pay by card in one step. | gate: test/checkout.test.js
- G2 [draft, aim] Saved carts follow a shopper across devices. | serves: G1
```
id 是「段字母 + 数字」；行在你批准前是 draft，只有 approved 的行算数；agent 认领该工作时这一行的验收标准会被冻结（frozen）。

4. 配置 gate 和 lanes（`pullboard.json`）。gate 是任何能证明你代码的命令，在每次 submit 和 push 前运行；每条 lane 拥有若干路径和 spec 段，提交超出自己 lane 的路径会被拒绝。
```json
{
  "gate": "npm test",
  "lanes": {
    "web": { "owns": ["apps/web/"], "specs": ["G"] },
    "review": { "owns": [] }
  }
}
```
按技术栈选 gate（可用 `&&` 串起来，如 `ruff check . && pytest`）：

| 技术栈 | Gate |
| --- | --- |
| JavaScript, TypeScript | `npm test` |
| Python | `pytest` |
| Go | `go test ./...` |
| Rust | `cargo test` |
| Java | `mvn test` 或 `gradle test` |
| Ruby | `bundle exec rspec` |
| C#, .NET | `dotnet test` |

5. 手工走一遍（不依赖 agent，coordinator 做的每一步你都能自己做）。先建条目：
```sh
pullboard add web "Checkout" --specs G1 --criterion "card payment takes one step"
```

6. builder 侧认领并提交。前提：每条 lane 一个 worktree。
```sh
pullboard worktree web
cd ../myapp-web-1
pullboard next
pullboard submit 1
```
builder 认领条目、提交时在 commit message 里引用需求行（如 `feat(web): pay by card [G1]`），并在 gate 绿的情况下提交。

7. verifier 侧验证。必须是另一个 agent，且它没有构建过这个条目；它 checkout 到那个确切的 commit。
```sh
pullboard worktree review
cd ../myapp-review-1
pullboard next --verify
pullboard verify 1 accept --note "paid in one step; without the fix the test fails"
```
接受时要给证据（“没有这个修复测试就会失败”），驳回要给理由。

8. 看板查看与人机接口。
```sh
pullboard view
```
"Needs you" 只显示只有你能做的决定（上升上来的决策、待批准的行、被 hold 的 lane）；Timeline 显示每个条目的 claim / submit / verdict 和驳回理由；Actions 可加条目、回答决策、shout 到某条 lane、hold 一条 lane；它跑在 local API v1 上，你自己的脚本也能用；`view --export` 写出静态可回放快照。

9. 与 agent 协作的常用命令：`pullboard worktree`（建 lane worktree 并打印给子 agent 的首条指令）、`pullboard resume`（agent 重启后回到它的 claim、消息和下一步）、`pullboard next`（认领下一个空闲条目，绝不抢别人已持有的）、`pullboard run`（让更轻的模型无人值守构建简单条目）、`pullboard prompt <role>`。Claude Code 会获得 skills；Codex 及其他 agent 读 `AGENTS.md` 或 `pullboard prompt <role>`。

10. 建议的协作方式（README 写成 recommended best practice）：只和一个 agent（你的 coordinator）深度工作，由它把工作扇出到各 lane 并写下你的偏好，这样你不需要解释两次；始终让一个 agent 领导其他 agent。

11. doctrine 与数据位置：doctrine 写在 `PRACTICE.md`（“我们怎么构建”，例："We do not store credit cards."），每个 repo 从 Pullboard 标准 doctrine 开始，可以追加、覆盖或拒绝任何一条；机器能检查的由 hooks 强制。`SPEC.md`、`PRACTICE.md`、`pullboard.json`、`AGENTS.md` 和 git hooks 在主检出里；看板是放在 `.git` 里的一个 SQLite 文件，被所有 worktree 共享、从不提交；已提交的工作在 git 里 pin 住；`pullboard export` 备份整个看板。

12. 条目状态机（决定「什么时候算完成」）：每条从 open 开始 → 被认领则 claimed（agent 沉默则重新 open）→ 提交后 submitted → verifier 接受变 verified，驳回则回到 open；只有 coordinator 能 withdraw；声明（`src/machine.js`）不允许的动作看板会拒绝。

## 对应的研究问题
- **能力发现**：可以交给 AI 的比“写代码”更多——由 coordinator agent 与你一起定 spec、规划 lanes 和 items、回答下级 agent 的提问并只把你该拍的决策送到你面前；builder 在各自 worktree 里认领和提交；`pullboard run` 让更轻的模型无人值守构建简单条目；验证也由另一个 agent 完成（不是人）。
- **任务匹配**：角色与模型分层是明确写出的——一个 coordinator（与你深度协作）、每条 lane 一个 builder、一个 verifier（必须没参与构建该条目），简单条目可用更轻的模型跑（`pullboard run`）。协作方式的核心是把“构建”和“验证”分给不同 agent，并在 commit 级别对齐。
- **条件供给**：需要提供的是已批准的 SPEC.md 行（验收标准，认领时冻结）、PRACTICE.md 的 doctrine、pullboard.json 里的 gate 命令与每条 lane 的路径/spec 段授权（越界提交被拒）、git hooks、git + Node 22.13+ 运行环境。反馈渠道是 shouts（提问沿链上升，只有你的决策到你这）、receipt（accept/reject 及理由）、Activity（每次 claim/submit/reject/accept 按序记录，不做记录外的事）。
- **主动推进**：推进由状态和事件驱动——认领触发验收标准冻结、agent 沉默触发条目重新 open、submit 前必须 gate 绿、只有 verifier 的判决能让条目进 verified（或退回 open）、`pullboard resume` 让重启后的 agent 回到它的 claim 继续；条目之间也支持依赖等待（"items can wait on others"）。
- **效果验证**：gate 是“任何能证明你代码的命令”，在每次 submit 和 push 前运行；验证由没构建过该条目的第二个 agent 在确切的 commit 上做，接受要给证据、驳回要给理由；tour 示范的验证强度是“故意破坏修复、看到测试失败”后才接受；receipt 把整段过程留痕（含具体测试行为与失败信息）。

## 与已有做法的关系
- 清单中的 **Claude Code**（adopt）：Pullboard 可以直接与它配合——`pullboard init` 会安装 hooks 和看板，Claude Code 会获得 skills；初始化后在该目录开一个 Claude Code 会话，这个 agent 就成为 coordinator。README 也提到 Codex 及其他 agent 读 `AGENTS.md` 或 `pullboard prompt <role>`，所以它是跨 agent 的编排层，而不是替代某个 agent。
- 清单中的 **Cline**（watch）、**Laya**（watch）：原文没有提及，无法对照。
- 相对“直接让 agent 写代码”的默认做法，Pullboard 把两件事固化成流程：一是 lane 隔离（每个 agent 自己的 worktree，认领是原子的、越界提交被拒），二是“另一个 agent 在同一 commit 上验证通过才算完成”。

## 证据与局限
原文给出的具体证据：完整的 CLI 命令、`SPEC.md` 格式、`pullboard.json` 配置和各栈 gate 表（可直接照抄）；tour 的端到端示例（含故意破坏修复再看测试失败）；一个真实的 reject/accept receipt 样例，并称 "nearly one in three items goes back"（自家开发 Pullboard 的返工比例）。外部指标：GitHub 41 stars。

属于作者主张而非验证过的结论：这套方法论“更好”、返工比例可复现、多 agent 更连贯。

原文自己声明的局限：worktree 身份只在一台机器上有意义，不是安全边界；可以用 `--no-verify` 跳过 hook（靠 pre-push gate 和 verifier 兜底）；CI 只在 Linux 和 macOS 上跑，Windows 未测试；relay（在手机/其他机器上看板）和 Pullboard View 里的 roadmap 仍是 planned。

适用条件：单人或多 agent 在 git 仓库内做长期构建；愿意把需求写成一行一行可验收的 SPEC.md，并接受“未经第二 agent 验证不算完成”。

## 怎么试、怎么验证
最小试用（半天内可完成）：
1. 在一次性仓库跑 `npm i -g pullboard && pullboard tour`，确认你理解“提交—驳回—修复—复验—合并”的节奏。
2. 选一个真实小仓库，`pullboard init` 并提交它写出的文件；只写 1–3 行 approved 的 SPEC.md，设一个真实的 gate（如 `pytest` 或 `npm test`），配 1 条 builder lane + 1 条 review lane。
3. 用 2–3 个小条目走完整流程：`add` → builder `worktree/next/submit` → 另一个 agent `next --verify` + `verify ... accept/reject`。验证者必须是没构建过该条目的 agent。

判断有没有改善的指标（与不用这套流程的同类任务对比）：
- 驳回率与驳回原因分布（原文自报近 1/3 条目被退回；重点看 reject 理由是否集中在“漏掉边界条件/行为不符”这类真实缺陷上）。
- “说完成了但没完成”的返工次数（gate 未绿就提交、合并后才发现问题）。
- gate 在提交/推送时的失败率与失败类型。
- 人类被打断的次数（理想情况只有必须你拍的决策进入 "Needs you"；如果 coordinator 把太多决定往上抛，说明 spec/doctrine 写得不够）。
- 每个条目从 open 到 verified 的时长，以及多 agent 并行时是否出现“两个 agent 改同一个文件”的冲突。

如果试用后上述指标没有一项改善、或维护 SPEC/doctrine 的开销明显大于收益，就退回原来的做法，只保留“另一智能体验证同一 commit”这一个习惯。
