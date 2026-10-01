# mvschwarz/openrig

- 结论：**值得一试**。建议在单独的实验仓库里小范围试：按 README 的引导路径安装 OpenRig，用两座位 starter（复用已有 Claude Code 或 Codex 账号）跑一个「实现 + 独立复核」的有界任务，看是否真的减少了手动切换终端和人工传话的成本。理由是原文给出了从安装、启动、就绪检查、下发任务到权限与回滚的完整可复制命令，具备照做的条件；但工具仍处早期版本、会改写 provider 信任与 hook 配置、不支持 Windows，且没有任何量化效果数据，因此不宜直接写成手册主推做法。
- 原文：https://github.com/mvschwarz/openrig
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T16:27:45.135Z

## 是什么

OpenRig 是一个开源的「多智能体 harness 管理框架」：单个 harness 包住一个模型，rig 包住你的多个 harness。它用 YAML（RigSpec）声明 agent 团队（pod、成员、连边、连续性策略），用一条命令启动，把 Claude Code 和 Codex 放进同一个 rig 里作为一套系统管理，把散落的一堆终端会话变成有组织、可恢复的团队。

架构：本地 daemon + CLI + TUI + MCP server，底层基于 tmux，存储用 SQLite。每个 agent 都跑在一个你可以 attach 的 tmux 会话里。许可证 Apache 2.0，npm 包 `@openrig/cli`。

关键概念（原文定义）：

- **RigSpec**：YAML 声明的多 agent 编排定义。
- **AgentSpec**：可复用的 agent 蓝图（skills、guidance、hooks、profiles、startup contracts）。
- **Seat**：rig 里稳定的角色和地址，如 `dev-owner@first-project`；占用它的会话可以更换，但身份和它写下的上下文保留。
- **Pod**：一组共享 guidance 和上下文的 seat（每个 agent 仍有自己的上下文窗口）。
- **Discovery / Adopt**：`rig discover` 指纹识别已有 tmux 会话，`rig adopt` 把它们纳入管理。
- **Snapshot / Restore**：`rig down --snapshot` 抓全量状态，`rig up <name>` 按名恢复，并逐节点报告 resumed / fresh / failed。
- **RigBundle**：带内置 AgentSpec 和 SHA-256 校验的可移植归档，用于跨机器分享拓扑。
- **Culture**：CULTURE.md 设定群体协作规范；研究类 rig 用探索型文化，实现类 rig 用保守的「trust-but-verify」文化。

核心交互模式：你对一个 lead agent 说出想要的结果，它协调跨团队的专家，把结果和需要你决策的事项带回来。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提与边界（先读再动手）**：需要 Node.js 22 或 24，以及 tmux，仅支持 macOS 或 Linux；原生 Windows 不支持，WSL2 未测试。在 Apple silicon 的 Mac 上用 Node.js 22（原文给出兼容性说明链接）。启动 rig 会写入 provider hooks 和 workspace trust 设置，**第一步先备份相关文件**。

### 1. 备份并检查前置条件

原文明确要求：执行下列命令前，先读「What OpenRig changes on your machine」一节并备份相关文件。

```bash
tmux -V
claude --version && claude auth status
codex --version && codex login status
```

只检查你实际会用的那一家：需要时先 `claude auth login` 或 `codex login` 登录一次；**不要安装或登录用不到的 provider**。

### 2. 安装 CLI 并预览 setup

```bash
npm install -g @openrig/cli
rig setup --dry-run
```

用 Bun 的话：`bun add -g @openrig/cli`，但仍需另装 Node.js 22（OpenRig 仍跑在 Node 上），且 Bun 可能阻止该包的 postinstall 脚本，导致 Node.js 和 SQLite 检查不在安装时运行。`rig setup --dry-run` 只预览 setup 计划，不会应用。

### 3. （可选）选工作账号

三套 starter 对应不同 provider 组合，**复用你已有的工作账号，不需要再买第二份订阅**：

| Team | Starter | Models |
| --- | --- | --- |
| Two Codex agents | `first-project` | Both `gpt-6-astra` (unchanged) |
| Two Claude agents | `first-project-claude` | Configured native Claude default |
| Claude owner + Codex checker | `first-project-mixed` | Claude default + `gpt-6-astra` |

三套用同样的 owner/checker 角色和任务。原文要求启动前显示所选 runtime、配置的模型和命令，并确认账号支持该模型，**而不是静默回退**。kernel 会自动启动，并独立于这两个项目 agent 从已认证的 provider 中选择；缺少用不到的 provider 不构成 setup 要求。

### 4. 一次性权限选择（原文的默认建议与风险）

启动前你的 agent 会问一次：

> **“Allow your agents to run OpenRig commands without repeated permission prompts?” Yes — recommended / No — keep prompts.**

选 Yes 会覆盖所有 `rig` 命令（包括启停 agent 和配置），作用域默认是 personal project scope（除非你显式选择 user-wide sessions）。原文明确：这**不是全局 YOLO，也不是允许 agent 自己发明工作**。选 Yes 时 agent 会添加并验证原生规则；选 No 或不回答则设置不变。已有明确选择会被复用。撤销方式为对 agent 说：“Undo the OpenRig command allowances added by this setup”。

### 5. 在一个仓库里启动两座位 starter

```bash
cd /path/to/your/repository
starter=first-project  # or first-project-claude or first-project-mixed
rig specs preview "$starter" --kind rig
rig up "$starter" --cwd . --plan
rig up "$starter" --cwd .
rig tui --shared
```

`rig tui --shared` 打开共享看板；不停止看板而脱离，按 `Ctrl-b` 再按 `d`，回来仍用 `rig tui --shared`。`rig tui`（不带 `--shared`）打开独立视图。原文提醒：关掉查看终端不等于要重启团队。

### 6. 就绪检查（下发任务前必做）

```bash
rig ps --nodes --rig "$starter"
```

在分派工作前解决任何认证、信任或权限提示。

### 7. 给 owner 一个有界结果（可直接复制的提示词）

```bash
rig send "dev-owner@$starter" 'Implement <one useful change>. Track the task in the queue and return its ID. Keep it local, verify the behavior, ask dev-check in this rig to check the exact candidate, and record the result and how I can try it.'
rig queue list --destination "dev-owner@$starter" --limit 1000
```

注意原文的关键提醒：**发送消息本身不会创建队列项，是 owner 记录任务**。然后读最终产物和针对「确切候选」的复核，再回到同一个 owner 做下一处改动——保持同一批地址，团队的工作和上下文就留在原处。

### 8. 权限模式的显式配置（可选、需审计）

```bash
rig policy permissions list|show|current|apply
rig seat set-permissions <seat> --mode <mode> --reason <text>
```

模式可为 `floor`、`full_bypass`、`inherit`（清除该 seat 覆盖）。原文强调：权限模式控制的是原生执行权限，工作姿态是另一回事（属项目 guidance）。这不会重启 seat，也不改变它当前的原生进程、历史、规则或 hooks；`rig seat status` 只区分「期望选择」与「上次启动参数」，两者都不证明原生层面真的生效。默认 **YOLO 关闭**；显式选择完全绕过才会用 Claude 的 `--dangerously-skip-permissions` 或 Codex 的 `-s danger-full-access -a never`。托管启动给 Claude 用 `--permission-mode acceptEdits`，给 Codex 用 `-s workspace-write`（除非有具名 profile）。

### 9. 保护你手打的 seat（可选）

```bash
rig seat set-typing-guard <seat> --enabled true --reason <text>
```

开启后自动消息和唤醒会被扣住，而不是直接打进该 seat（默认关闭）。

### 10. 更大的 starter 与专用 starter

```bash
rig specs preview product-team --kind rig
rig up product-team
```

`product-team`：两个 orchestrator、实现、QA、设计、两个独立 reviewer。

```bash
rig specs preview conveyor --kind rig
rig up conveyor
```

`conveyor`：四座位、Claude Code 与 Codex 混合，展示 intake → planning → build → review 的交接路径。还随附 `implementation-pair`、`adversarial-review`、`research-team`、`secrets-manager`（由专家 agent 管理的 HashiCorp Vault，需要 Docker）。浏览全部：`rig specs ls`。

### 11. 运行中演进与恢复拓扑

`rig grow`、`rig shrink`、`rig launch`、`rig remove` 演进运行中的拓扑；`rig down --snapshot` 抓取快照，`rig up <name>` 从最近快照恢复。

### 12. 终端工作区（可选）

```bash
rig terminal open first-project --provider herdr
```

cmux 则用 `--provider cmux`。TUI 中 rig 详情页有 `term ▸ rig <name>` 链接，可在默认终端 provider 里打开该 rig 所有在跑的 seat。

### 13. 诊断

```bash
rig setup --full     # 更广的操作员工作站准备（jq、gh）
rig doctor           # 检查系统健康、诊断问题
```

两个命令都支持 `--json`，供 agent 驱动的工作流使用。

### 14. agent 侧集成（MCP）

OpenRig 暴露 MCP 工具让 agent 管理自己的拓扑，例如 `rig_up`、`rig_ps`、`rig_send`、`rig_chatroom_send`。

### 15. 升级已有实例（含 Node 20 迁移）

0.6.0 只支持 Node.js 22 和 24（SQLite 绑定 better-sqlite3 13 要求 Node 22+），Node 20 的安装检查会直接拒绝。切换 Node 后在新 Node 下重装（版本管理器为每个 Node 维护独立的全局包集）：

```bash
nvm install 22          # or 24; fnm or your package manager work the same way
npm install -g @openrig/cli
rig --version
```

已有数据留在原地，daemon 用新绑定打开同一数据库并就地应用待办迁移。跨 0.5.9 布局边界时，原文要求走随包附带的 `openrig-upgrade` skill 做 **Agent-Operated Migration**，脚本分阶段执行且每阶段输出 JSON：

```bash
# SKILL_DIR is the installed openrig-upgrade skill directory.
node "$SKILL_DIR/scripts/migrate-telemetry-state-0.5.9.mjs" --help
node "$SKILL_DIR/scripts/migrate-telemetry-state-0.5.9.mjs" --home "$OPENRIG_HOME"
node "$SKILL_DIR/scripts/migrate-telemetry-state-0.5.9.mjs" --home "$OPENRIG_HOME" --apply-state --preimage /safe/path/layout-0.5.9-before
```

原文的硬性纪律：任何阶段出问题或回执不完整就停下，按其 `next` 动作处理；**不要从复制的遗留 telemetry 继续，也不要盲目重试部分变更**。helper 从不删除遗留 telemetry 或库；退役需要单独的稳定运行、写入、读取和恢复证明。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**

- 把「已经开着的 tmux 会话」变成受管团队：`rig discover` 指纹识别已有 Claude Code / Codex 会话，`rig adopt` 纳入管理——这类工作通常不会想到交给工具。
- 让 agent 管理自己的拓扑：MCP 工具 `rig_up`、`rig_ps`、`rig_send`、`rig_chatroom_send`，即 agent 自己扩缩、查状态、发消息。
- 把「软件本身」交给 agent 团队运营：`secrets-manager` starter 是由专家 agent 运维的 HashiCorp Vault 实例，`rig env status`、`rig send ... --verify` 是操作入口。

**2. 任务匹配**

- 按 provider 组合匹配角色：`first-project`（两个 Codex）、`first-project-claude`（两个 Claude）、`first-project-mixed`（Claude owner + Codex checker），三套共用 owner/checker 角色与任务——即「谁写、谁复核」可以用不同模型分工。
- 按流程复杂度匹配拓扑：`conveyor` 四座位演示 intake → planning → build → review 的交接；`product-team` 是更大的产品小队（两个 orchestrator、实现、QA、设计、两个独立 reviewer）；另有 `implementation-pair`、`adversarial-review`、`research-team`。
- 按角色绑定模型与权限：seat 级别可设模型、权限模式（`floor` / `full_bypass` / `inherit`）。
- 群体规范按任务性质切换：CULTURE.md，研究类 rig 用探索型文化，实现类 rig 用保守的 trust-but-verify 文化。

**3. 条件供给**

- 环境：Node 22/24、tmux、macOS/Linux、（可选）herdr 或 cmux、服务型 rig 需要 Docker。
- 账号与认证：至少一家 provider 已登录；缺失的用不到的 provider 不是 setup 必需项。
- 权限：一次性授权 agent 免重复确认执行 `rig` 命令（personal project scope，非全局 YOLO）；逐 seat 的原生权限模式；Claude 侧 `acceptEdits`、Codex 侧 `workspace-write` 沙箱；必要时给 Codex 追加 workspace 的 `.git` 与 pod 共享队列状态目录的可写权限（`--add-dir`，共享根来自 `OPENRIG_SHARED_DOCS_ROOT` 或 `~/.openrig/shared-docs`）。
- 信任与 hooks：托管启动会预信任 workspace，写 Claude 的 workspace trust 与 onboarding（`~/.claude.json`）、`.claude/settings.local.json`（context collector 的 `statusLine` 命令、活动 hooks）、`.mcp.json`，以及 Codex 的 `CODEX_HOME/config.toml`（hook、活动中继命令与信任哈希）。
- 反馈回路：任务必须先进队列并返回 ID；消息本身不建队列项。
- 上下文与工具资源：selected settings / MCP 资源可注入；共享设置资源会把 `permissions.defaultMode` 设为 `acceptEdits` 并启用 Exa/Context7 MCP；guidance、skills、plugins 会投影进 workspace。

**4. 主动推进**

- 常驻本地 daemon，负责实例状态与生命周期；`OPENRIG_HOME`（默认 `~/.openrig`）存数据库和托管插件资源。
- hook 活动中继按事件推送：向 daemon 的 `/api/activity/hooks` 发送事件类型/子类型、seat/runtime 身份、时间戳、原生会话身份（用 activity token）。原文明确该载荷**不含 prompt 文本和工具参数**。
- 状态/用量采集：Claude collector 把上下文/token 用量、会话与 transcript 路径元数据、可用 rate-limit 数据写入实例的 `state/context-usage` 与 `state/provider-usage`。
- 队列驱动的持续工作：owner 在队列里跟踪归属工作并返回 ID，可回到同一 owner 继续下一步。
- 断点恢复：`rig down --snapshot` + `rig up <name>`，恢复时逐节点报告 resumed / fresh / failed。
- 运行中演进：`rig grow`、`rig shrink`、`rig launch`、`rig remove`。
- 人工在环保护：`rig seat set-typing-guard` 让自动消息和唤醒先被扣住，而不是打进你正在手打的 seat。

**5. 效果验证**

- 验收动作写进任务本身：让 dev-check 复核「确切候选」（exact candidate），并记录结果和「我怎么试」。
- `rig send ... --verify` 提供带校验的发送路径（secrets-manager 示例中用到）。
- `rig queue list --destination ... --limit 1000` 查任务队列，验证任务是否真被记录、有 ID。
- 恢复结果的可核验输出：resumed / fresh / failed 逐节点报告。
- `rig seat status` 明确区分「期望选择」与「上次启动参数」，并声明两者都不证明原生层真的生效——这是一种刻意的诚实设计，可借鉴到验证思路里。
- 局限：原文没有给出任何量化效果指标（如缺陷率、返工率、节省时间）。

## 与已有做法的关系

- **Claude Code（清单状态：adopt）**：直接相关。OpenRig 不替代 Claude Code，而是把它作为 runtime 之一包起来（原文的比喻是 harness 之上再加一层 rig），并会写 Claude 侧的信任、statusLine、hooks、`.mcp.json` 与 selected MCP 资源。清单中已有 Claude Code 的做法可以保留，把 OpenRig 看作在其之上做多座位编排的候选。
- **Herdr（清单状态：try）**：相关且互补。原文把 herdr 和 cmux 列为可选终端工作区 provider，用 `rig terminal open first-project --provider herdr` 把 rig 的所有运行终端一起打开；底层会话仍是 tmux。也就是说 herdr 负责「看见终端」，OpenRig 负责「编排与状态」。
- **PRAW（清单状态：try）**：清单中没有相关条目，原文与本主题均未涉及。
- 另外原文有一节「Comparison with Claude Managed Agents」，自述 OpenRig 是开源自托管、Claude Code 与 Codex 同队，模型用量成本仍按所选 provider 计费；对比详情在作者自己的站点上，属作者主张。

## 证据与局限

**原文给出的可核验材料**：仓库为 Apache 2.0 开源、存在 npm 包 `@openrig/cli`；指标为 2823 stars、当日 622；给出了完整可复制的安装、启动、就绪检查、下发任务、权限、快照恢复、升级与迁移命令；对「会改动机器上什么」列了一张明确的表（npm 安装、`rig setup`、daemon 启动、rig/seat 启动与 attach、显式权限配置各自改什么）。

**只是作者主张、缺第三方证据的部分**：

- 「the open-source system behind my AI civilization experiments」是作者自述，无独立佐证。
- 与 Claude Managed Agents 的对比在作者官网，属自述。
- starter 表格里的模型名 `gpt-6-astra` 无法从材料中核实是真实模型、占位还是演示数据，照做时以启动前显示的「所选 runtime、配置模型、命令」为准。
- stars 数和 trending 位置只反映关注度，不反映效果。
- 全部依据仅来自 README（本次材料注明「依据仓库 README」），没有 issue、代码审查或第三方评测可交叉验证；文档与已发布 npm 包可能不一致，原文自己也提醒用 `rig --version` 核对。

**适用条件与风险**：

- 平台：仅 macOS / Linux；原生 Windows 不支持，WSL2 未测试。Node 只支持 22 和 24，20 不再支持，26 及其他版本未测试；Apple silicon Mac 建议 Node 22。
- 机器改动**不可轻视**：会写 provider 信任设置与**可执行 hooks**，包括 `~/.claude.json`、`.claude/settings.local.json`、`.mcp.json`、`~/.codex/config.toml`、`~/.tmux.conf`，以及 `~/.claude/skills`、`~/.agents/skills` 中的 discovery skill。原文承认：托管 hook 块只针对 OpenRig 自己的条目并保留无关 hook，但信任条目、selected resource 键和 Claude 现有 status-line 命令**可能被替换**；某些写入器会把不可读设置恢复成空对象，**这不是完整的保留或回滚保证**。daemon/bootstrap 的写入是自动的，没有逐项交互预览，`rig setup --dry-run` 也不预览后续所有启动效果。
- 早期版本：0.6.x，存在跨布局边界的迁移流程（0.5.9、0.5.14、0.5.15 均有专门说明），迁移脚本纪律要求严格，误操作风险实在。
- 安全默认值：YOLO 默认关闭；只有显式选择完全绕过才会用 `--dangerously-skip-permissions` 或 `-s danger-full-access -a never`。建议不要开。
- 数据流向：活动中继载荷不含 prompt 文本和工具参数；但 provider 和 selected MCP 连接各有自己的数据流，daemon 插件初始化还会访问 GitHub 上的 OpenRig 插件发布端点。

## 怎么试、怎么验证

**最小试用（建议半天以内）**

1. 选一个**可丢弃的实验仓库**，不要用主仓库。先备份 `~/.claude.json`、`~/.codex/config.toml`、`~/.tmux.conf` 与工作区内的 `.claude/settings.local.json`、`.mcp.json`，记录备份路径。
2. 只复用你**已经登录**的那一家 provider，另一家不装不登。
3. 先 `npm install -g @openrig/cli` + `rig setup --dry-run`，把 dry-run 的计划与第 1 步的备份路径对照，确认你会接受哪些写入；再决定是否 `rig setup`。
4. 选 `first-project`（若只有 Claude 账号则 `first-project-claude`，若两家都有则 `first-project-mixed`），执行：预览 → `--plan` → 正式 `rig up` → `rig tui --shared`。
5. `rig ps --nodes --rig "$starter"` 清掉所有认证/信任/权限提示。
6. 只下发**一个**有界改动，用原文给的提示词模板（含「Track the task in the queue and return its ID」「ask dev-check to check the exact candidate」「record the result and how I can try it」）。
7. 不启用 `full_bypass`；如需减少打断，用一次性 rig 命令授权（并记住撤销话术）。
8. 结束时 `rig down --snapshot`，再用 `rig up <name>` 验证恢复报告的 resumed / fresh / failed。

**判断有没有改善的指标（对照你原来的手工做法）**

- 从「下发任务」到「拿到可运行且已被独立复核的改动」的墙钟时间，与你自己开两个终端手动传话做同样改动对比。
- 你在整个过程中手动切换终端、复制粘贴上下文、当人肉传话筒的次数。
- 队列可核验性：`rig queue list` 里是否真有对应任务和 ID（注意发消息不等于建队列项），失败时说明编排有没有真的接住。
- 复核是否针对「确切候选」：checker 是否给出对具体候选的结论，而不是泛泛评价。
- 权限打断次数：一次授权后是否明显减少重复提示，同时没有意外的越权执行。
- 恢复能力：重启机器或用 `rig up <name>` 后，能否按 resumed 报告回到原状态。
- 可退回性：能否用备份还原 provider 配置；若还原过程出现需要手改的残留，这本身是重要负面信号。
- 平台符合度：确认你在受支持平台与 Node 版本上（Node 22/24，macOS/Linux），否则不要开始。

**建议的试用规模**：先用两座位 starter 跑 2–3 个有界改动，再决定是否上 `conveyor` 或 `product-team`。如果两座位阶段就出现需要反复手工修 provider 配置、或 check 环节拿不到对确切候选的结论，就退回 study/watch，不要把 OpenRig 写进手册的主推做法。
