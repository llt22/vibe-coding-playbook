# Cleveland-RD/hivehouse

- 结论：**值得一试**。建议小范围试：在满足依赖的本地环境按 README 安装 hivehouse，先用默认 relay 模式对单个非关键项目运行一个任务，验证多代理编排、门禁、评审与清理流程，再考虑过夜或 delegate 模式；理由是它给出了可复制的安装、配置和权限边界步骤，但项目较新且部分工作流未在真实 Claude Code 会话验证，需控制风险。
- 原文：https://github.com/Cleveland-RD/hivehouse
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-14T10:01:27.019Z

## 是什么
hivehouse 是一个 Claude Code 插件，在 tmux 中运行一个 Claude 会话团队来完成软件任务：一个 orchestrator、任务所需的 agents、任何东西落地前的评审和门禁、上下文轮换、无人值守过夜运行以及事后清理。工作文件夹中的 hub session 把每个任务交给其项目的 orchestrator，并双向传递你的话。技能是指令；每个机械动作是 `bin/` 中经过测试的 bash 可执行文件。

默认是 relay 模式：每次 start、wake 和 answer 都等你。delegate 模式是 hub 在你离开时运行的模式：它决定项目内部工作并保持团队运行，但把 push、deploy 和花费留给你；仅在只有你能写的文件允许时开启，最多 7 天。

要求：tmux ≥ 3.2；git ≥ 2.31（`hh-gate-verify commits` 需 ≥ 2.38）；bash（macOS 3.2 足够）；jq；perl；shasum（macOS 自带）；ssh 和 rsync（远程运行）；Claude Code ≥ 2.1.291。

## 具体做法
1. 检查依赖。前提：有 shell。运行以下并对照 Requirements：
```
tmux -V
git --version
jq --version
perl -v
shasum --version
claude --version
```
要求：tmux ≥ 3.2；git ≥ 2.31，`hh-gate-verify commits` 需 ≥ 2.38；bash（macOS 3.2 足够）；jq；perl；shasum（macOS 自带）；ssh 和 rsync（远程运行需要）；Claude Code ≥ 2.1.291。缺失或过旧时告诉用户，macOS 可 `brew install tmux jq`。安装任何东西前先问用户。

2. 安装插件。前提：Claude Code 可用。
```
claude plugin marketplace add Cleveland-RD/hivehouse
claude plugin install hivehouse@hivehouse
```
检查：
```
claude plugin list --json | jq '.[] | select(.id == "hivehouse@hivehouse") | {version, enabled}'
```
必须打印 `.claude-plugin/plugin.json` 中的版本和 `"enabled": true`。

3. 设置（可选）。前提：插件已安装。插件设置是 `.claude-plugin/plugin.json` 中的 `userConfig`（models、efforts、permission mode、files per commit、rotation level、overnight ceiling、`hub_auto_start`）；每项都有默认值，所以什么都不设也能用。问用户是否要改；Claude Code 的 `/plugin` 菜单可改。安装后 Claude Code 可能提示 `"N userConfig options not yet set"`，无需操作，默认值在使用。

4. 设置 hub（可选）。前提：用户同意，并指定一个工作文件夹（存放项目的文件夹，绝不能是项目本身）。得到同意后：
```
cd <folder> && <installPath>/bin/hh-hub init
```
其中 `<installPath>` 是 `claude plugin list --json` 为 `hivehouse@hivehouse` 显示的 installPath（在仓库内会拒绝）。然后让用户在该文件夹运行：
```
<installPath>/bin/hh-hub start
```
它会在名为 `hub` 的 tmux 会话中打开 hub，并提议把文件夹分组为 projects。你不能替用户启动该会话。

5. 上手使用。前提：安装完成。告知用户：`/hivehouse:start <task>` 在项目内对任务运行团队；在工作文件夹运行 `<installPath>/bin/hh-hub start` 打开 hub。在他们要求之前什么都不运行。

可用技能（由不同角色运行）：
- `/hivehouse:hub`：owner；hub，把任务交给各项目 orchestrator，唤醒它们，回报（在 hub 文件夹中自行启动）
- `/hivehouse:start`：owner；计划、批准并运行团队执行任务
- `/hivehouse:overnight`：owner；排队并无人值守运行，本地或远程主机
- `/hivehouse:gate`：orchestrator、builders；运行门禁到日志并验证每一步
- `/hivehouse:bubble-review`：reviewer；按深度评审 diff，九个 bubble 类别
- `/hivehouse:handoff`：任何 agent；写 handoff 和 START HERE block
- `/hivehouse:cleanup`：owner；移除 manifest 记录的内容
- `/hivehouse:review-plan`、`/hivehouse:doc-updater`：任何；移入的技能
- `/hivehouse:docs-health-check`：owner；当前项目的文档扫描，默认报告模式（是 workflow，不是 skill）

手工运行 hh-* 可执行文件：前提：知道 installPath。例如：
```
<installPath>/bin/hh-slot status
```

delegate 模式配置：前提：你离开，且愿意用 root 文件开启。默认 relay 模式。delegate 模式仅在只有你能写的文件允许时开启，最多 7 天；它决定项目内部工作并保持团队运行，但 push、deploy 和花费留给你。仅当 hivehouse 的 `permission_mode_local` 选项为 auto 时，hub 才以 `--permission-mode bypassPermissions` 启动和唤醒团队会话；这些会话中的 hook 拒绝 push、发布、上传和更改 Claude Code 的设置与 hooks。默认 relay 模式和远程主机上，hivehouse 不以 bypass 启动任何东西。具体见 `docs/away-mode.md`。

## 对应的研究问题
1. 能力发现：hivehouse 展示了可交给 AI 团队的跨项目任务委托、orchestrator 管理 agents、评审与门禁、上下文轮换、无人值守过夜运行、清理、git worktree 管理，以及推送和远程同步（需许可）。这些是可能未想到交给 AI 的工作。
2. 任务匹配：材料给出团队角色（orchestrator、builders、reviewer）和对应技能（`/hivehouse:gate` 由 orchestrator、builders 运行；`/hivehouse:bubble-review` 由 reviewer 运行；`/hivehouse:handoff` 任何 agent 可运行）。模型、efforts、权限模式等可在 `userConfig` 设置。工具包括 tmux、git worktree、bash 可执行文件、Claude Code 插件。协作方式有 hub session 与项目 orchestrator 双向传递，以及 relay/delegate 两种模式。
3. 条件供给：需要依赖（tmux、git、jq、perl、shasum、Claude Code ≥2.1.291，远程需 ssh/rsync）。权限：默认 relay 模式每次开始、唤醒、回答都等用户；delegate 模式需要只有你能写的 root 文件开启，最多 7 天，且 `permission_mode_local=auto` 才会用 `--permission-mode bypassPermissions`；hook 拒绝 push、发布、上传和改设置；`hh-push` 只按用户指令运行，fast-forward only，不在 delegate 模式运行；ssh/scp/rsync 每次请求许可，delegate 模式拒绝。需要提供工作文件夹、项目、任务描述、允许的 MCP 服务器配置（默认无）、远程主机列表 `remote_hosts`、要同步的 git 分支、项目文件、Claude 记忆文件、一个 secret 文件。反馈通过 hub 对话、dialog 选项、Resume/Continue 进行。
4. 主动推进：`/hivehouse:overnight` 可排队并无人值守运行；delegate 模式在离开时决定内部工作并保持团队运行，最多 7 天；`hub_auto_start` 默认开启，在 hub 文件夹启动普通 `claude` 会重命名会话并打开 hub；`hooks/hub.tsx` 每 20 秒运行 `status` 和 `tasks`，对话框等待时运行 `dialog`，按 Resume/Continue 时运行 `wake`/`continue`，选择选项时运行 `answer`。
5. 效果验证：`/hivehouse:gate` 运行门禁到日志并验证每一步；`/hivehouse:bubble-review` 按深度评审 diff，分九个 bubble 类别；`hh-push` 先读远程（`git ls-remote`、`git fetch`）且 fast-forward only；`hh-gate-verify commits` 可精确计算 merge 自身文件（需 git ≥2.38）；`bin/` 中每个机械动作是经过测试的 bash 可执行文件，并有 `tests/test_docs_health.sh`。这些可作为判断改善的检查点。

## 与已有做法的关系
清单中有 Claude Code（tool，adopt）和 i-have-adhd（tool，watch）。hivehouse 是 Claude Code 插件，依赖并扩展 Claude Code 的插件、技能、hooks、会话和权限机制；它把 Claude Code 从单会话使用扩展到 tmux 中的多会话团队、跨项目 hub 和门禁流程。原文明确说“安装可选的 i-have-adhd 插件”是 Never 事项之一，除非用户要求；所以两者是可选搭配，不是必需。清单中没有其他同类“多代理编排枢纽”条目。

## 证据与局限
原文给出：安装命令、依赖版本、技能表、hook 行为、权限边界、delegate 模式规则、清理范围、推送规则、远程同步规则。声明 `bin/` 中每个机械动作是经过测试的 bash 可执行文件。但 `docs-health-check` 工作流“Unverified here”：尚未通过真实 Claude Code 会话运行，只通过 stand-in 工作流运行时（`tests/test_docs_health.sh`）测试。没有给出实际任务完成率、成本节约或质量提升的数据。给定 metrics 显示 stars 为 30，说明使用面可能较小。适用条件：需要 Claude Code ≥2.1.291、tmux、git 等；idle check 依赖 Claude Code 终端 UI 文本，版本更新可能需改 `HH_DIALOG_TEXT` 和 `hh_pane_idle_text`；`hh-*` 可执行文件只在启用插件的 Claude 会话中在 PATH 上；delegate 模式涉及 bypassPermissions 和复制 secret 文件到远程的风险，应谨慎。作者主张多于独立验证。

## 怎么试、怎么验证
最小试用：在非关键项目、本地环境按上述步骤安装；先保持默认 relay 模式，只对一个项目运行 `/hivehouse:start <task>`，观察 hub、团队、门禁、评审和清理；确认无误后再考虑 `/hivehouse:overnight` 或 delegate 模式。验证指标：
- 安装检查通过：版本满足，插件 `enabled: true`。
- 任务完成：团队是否按计划产出 diff/提交，orchestrator 是否按规则运行。
- 门禁：`/hivehouse:gate` 是否把每一步运行到日志并验证通过。
- 评审：`/hivehouse:bubble-review` 是否按深度给出可操作意见。
- 清理：`/hivehouse:cleanup` 是否只移除 manifest 记录的临时文件夹、移入 `.hivehouse/trash` 的文件、它启动的进程和窗格。
- 安全边界：默认 relay 模式下不出现未授权推送；`hh-push` 只按你的指令运行，fast-forward only，先读远程；delete guard 阻止 `rm`、`find`、`rsync` 删除受保护文件夹。
- 若试 delegate：确认 root 文件控制、最多 7 天、`permission_mode_local=auto`、hook 拒绝 push/publish/upload/改设置；远程同步每次请求许可，delegate 模式拒绝。
- 如果这些指标中任何一项不改善或出现意外删除/推送，就停止采用。
