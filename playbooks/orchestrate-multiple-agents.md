# 让多个编码代理各改各的工作树，别抢同一份代码

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：多个编码代理同时改同一个仓库时互相覆盖、冲突不断，你需要一条低成本的隔离办法，并知道它能不能真正降低整体合并成本。
> 先试这一步：挑一个不关键的 git 仓库，开两个 Claude Code 会话，都加 `claude --worktree` 启动，各派一个改动任务，人工记录冲突次数和合并回主线所花的时间。
> 最近修订：2026-10-17

## 解决什么问题

单个 AI 回答或单条串行 agent 会话，交付的往往是你没有验证过的结果。手册把「不满意就重问一次」升级成一套可执行流程：多子代理并行求解、独立裁判打分淘汰、worktree 隔离、项目记忆、提交前互评、gate + 独立 verifier、跨项目看板、daemon + dashboard、菜单栏就地回答、阶段成本检查、用并行 /loop 持续处理 issue 的 triage-github 流程、一个实验性开关：用环境变量尝试开启 Claude Code 内置 agent teams、一个服务端版本控制候选：用 git-ai/Graft 承载大量编码 agent 的并发落库与验证，以及一个待自测的并行协作用法：用 claude --worktree 给每个并行代理一份独立工作树副本。

做法 A–U 概览：

- A：把不满意的回答送进锦标赛（arena-skill）。
- B：并行子代理 + 测试合入闸门（clodfarm）。
- C：多 harness、多座位的统一编排与恢复（openrig）。
- D：在同一编码 agent 内用关键字升档（oh-my-openagent）。
- E：搭长时程子代理底座（deer-flow）。
- F：把多步任务固化成角色化流水线（crewAI）。
- G：把 issue → PR → 浏览器实测 → 合并做成一条自动链路（cubefarm）。
- H：worktree 隔离 + 项目记忆文件 + 提交前互评（Offrun 或手工照做）。
- I：用 cmux 把并行 agent 的等待变成可路由通知（macOS）。
- J：把「另一个 agent 在同一 commit 上验证通过才算完成」做成状态机（pullboard）。
- K：把多项目的派工、状态与评审关卡收进一个控制台（claude-console）。
- L：用一个终端 daemon + dashboard 管住并行 agent 的可见性与权限（nsq / neurosquad-cli）。
- M：主 Agent 编排 + 哑子 Agent 只生成（验证集中在主 Agent）。
- N：把商业决策交给一个可复现的专家委员会（roast-room）。
- O：把「代理在等我」变成菜单栏上可一键回答的提醒（Muster，macOS）。
- P：在 tmux 里跑一个有门禁、评审与清理的 Claude 会话团队（hivehouse）。
- Q：在进入下一阶段前先结一次账（/cost 阶段成本检查）。
- R：用并行 /loop 做持续 issue 复现与修复（magpie 工作流复刻）。
- S：用实验性环境变量尝试开启 Claude Code 内置 agent teams，先做基线对照再决定是否采用。
- T：用 git-ai/Graft 在服务端承载大量编码 agent 的并发落库、冲突解决、落库后验证与 agent 权限（先 quickstart，再 shadow 接入）。
- U：用 claude --worktree 给每个并行代理一份独立工作树副本（原文只有一句话加一个命令，先自测再决定是否采用）。

## 适用与不适用

**适用**

- 你对某个 AI 回答确实不满意，且这个任务值得为此多花 token（做法 A）。
- 可拆分、且能被测试验证的编码任务：每支子代理跑在自己的 git worktree/分支上，测试过了才合入 main（做法 B）。
- 你同时使用多套编码 harness，需要座位、拓扑、快照恢复层面的统一管理（做法 C）。
- 想在同一个会话内给难任务「升档」，用一个显式动作决定何时上多 agent、上贵模型（做法 D）。
- 想自建长时程子代理 + 沙箱 + 记忆的执行底座（做法 E）。
- 有稳定重复的多步分工（搜集资料 → 扩写成文），且愿意写一点 Python、改 JSONC 配置（做法 F）。
- 有一个低风险、已有测试基础、且托管在 GitHub 上的小仓库，想验证 issue → PR → 浏览器实测 → 合并这条自动链路（做法 G）。
- 想在一个已有 git 的仓库里，用轻量方式隔离多个 agent，并把项目记忆写成可提交的纯文件，让第二个 agent 在提交前读 diff 评审（做法 H）。
- 你在 macOS 上并行跑多个终端型 coding agent，需要一眼看出谁在等你，并可跳到具体 pane（做法 I）。
- 你想让「另一个智能体在同一 commit 上验证通过才算完成」成为硬约束（做法 J）。
- 你同时照看多个项目、每个项目里都有 agent 在跑，想在一屏里看到「谁在等我做决策 / 等我评审 / 正在跑 / 待同步」（做法 K）。
- 你在 macOS / Windows / Linux 上并行跑 Claude Code、Codex、OpenCode 或任意长驻命令，想在一个终端 dashboard 里看到谁在 working / 需要你 / 已完成（做法 L）。
- 你想在 Claude Code 里能拉起子 Agent，并愿意把验证环节留在主 Agent 这一侧（做法 M）。
- 你有一个真实、可逆、一周内能见效的商业/经营决策，想用多个专家视角压测它（做法 N）。
- 你在 macOS 14+ 上并行跑多个 Claude Code / Codex / Cursor 会话，人被卡在权限批准、多选题或计划批准上（做法 O）。
- 你想在 Claude Code 里跑有门禁、评审、清理与无人值守的 tmux 会话团队（做法 P）。
- 你跑多代理 / 分阶段的 agent 流程，能在进入下一阶段前读到阶段成本或运行 /cost（做法 Q）。
- 你有一个 GitHub 仓库，issue 可处理、有测试体系可写失败测试，并且能持续运行 Claude Code + Opus 的 /loop；想先只跑一个 triage-github loop 处理最近 3 天 issue（做法 R）。
- 你使用 Claude Code，愿意在非关键小仓库里做一次基线对照，并能接受实验特性随时失效、行为变化或额外 token 消耗，想验证内置 agent teams 是否真的开启多代理并行（做法 S）。
- 你同时运行大量编码智能体，愿意自托管一套服务端（数据库 + 对象存储），有 Linux 或 macOS 构建环境，能接 Go 1.26 / C 工具链 / Meson / Ninja，想验证「服务端落库 + 缓存 + 两个 agent + 一次 land」整条链路（做法 T）。
- 你在 git 仓库里用 Claude Code，确实有多个代理要同时改同一份代码，想先消除编辑期互相覆盖，再看整体合并成本是否真的下降（做法 U）。

**不适用**

- 任务描述本身就含糊：arena README 明确说 Vague task in, 100 flavours of vague out（做法 A）。
- 编码任务没有可执行的验证命令：不设 FARM_VERIFY_CMD 就等于没有质量门（做法 B）。
- 只想多问几次、不愿承担 token 成本（做法 A）。
- 原生 Windows：openrig 仅支持 macOS / Linux，WSL2 未测试（做法 C）。
- 不愿意写代码、配环境：crewAI 是需要写代码、配环境的开发框架（做法 F）。
- 项目只在本地、没有托管到 GitHub：cubefarm 的 issue 和 PR 是唯一协作媒介（做法 G）。
- 不是 Apple Silicon Mac 或系统低于 macOS 14：Offrun 本身用不了；做法 H 的三条流程可手工照做（做法 H）。
- 希望评审后自动合并：做法 H 默认 Nothing merges on its own（做法 H）。
- 不是 macOS，或不想用 GUI 终端：cmux 仅支持 macOS（做法 I）。
- 没有第三方性能与收益数据，不宜作为通用默认方案直接采用（做法 I）。
- 你想把 worktree 隔离当作安全边界：原文明确说 worktree 身份只在一台机器上有意义（做法 J）。
- 你的环境是原生 Windows：Pullboard 的 CI 只在 Linux 和 macOS 上跑（做法 J）。
- 不想维护项目注册表和每个项目的 STATUS 卡：面板的状态、同步与关卡都建立在这两样自建约定上（做法 K）。
- 你把它当成熟方案：nsq README 自标 0.1.0 preview（做法 L）。
- 任意命令 agent 没有 hooks，只有 working / finished，永远不会出现 needs you（做法 L）。
- 任务必须边写边跑测试才能写对：把 Build/Test/Typecheck 全部推迟到主 Agent，会把失败成本集中到下游（做法 M）。
- 决策不可逆、或你无法承担一次辩论的用量：一次完整委员会是 21 次 sub-agent 运行（做法 N）。
- 不是 macOS 14+；或主力是 Cursor（只能跳转、不能代答）（做法 O）。
- Claude Code 低于 2.1.291，或缺少 tmux / git / jq / perl / shasum；远程运行还缺 ssh / rsync（做法 P）。
- 你的流程无法分阶段，或读不到任何成本 / token 数据（做法 Q）。
- 原文正文被截断，/loop 的完整配置、提示词原文、第三个 loop 均未给出；watch-social 只写到「盯 X /」，具体监控范围和动作不完整（做法 R）。
- 只想直接复制 3 个 loop 的完整配置：材料不足，不能补写命令（做法 R）。
- 没有可写失败测试的仓库，或 issue 无法复现：triage-github 的核心顺序会落空（做法 R）。
- 把「跑了一天，效果很好」当效果证据：这是作者主张，不是对照实验（做法 R）。
- 需要稳定、可写进团队规范或生产流程：该环境变量含 EXPERIMENTAL，原文无 Anthropic 官方出处，可能随时改名、移除或行为变化（做法 S）。
- 不能接受额外 token 消耗、实验特性失效、或无法在非关键环境里做对照：不要用做法 S 替代已有验证流程（做法 S）。
- 只想复制完整 Opus 主导 + Haiku 并行配置：原文没有给出如何指定模型、如何并行、子代理任务、并发数或失败回收，不能补写（做法 S）。
- 只跑一两个 agent 的个人或小团队：为换取秒级并发落库而引入数据库 + 对象存储，收益未经验证（做法 T）。
- 不愿自托管服务端，或无法接受 0.1.0 接口在 1.0 前可能变动（做法 T）。
- 想找「用了它比传统 Git 快多少」的量化结论：README 没有给出与传统 Git 或其他方案的对比数字（做法 T）。
- 已知缺口未解决：LIMITATIONS.md 举例提到存储核心中 pack 的垃圾回收；构建要编译内置 Git，依赖较重（做法 T）。
- 单代理串行、或根本不在 git 仓库里：多个代理抢同一个工作树这件事不会发生，收益不明（做法 U）。
- 把 worktree 隔离当安全边界：worktree 身份只在一台机器上有意义，隔离的是编辑范围，不是权限（做法 U；同做法 J）。
- 想直接照抄成团队规范：原文只有一句话加一个命令，副本位置、合并回主线、清理方式和版本要求都没写，必须先自测再决定是否写进流程（做法 U）。

## 前置条件

- 共同前提：把任务写成独立、自包含的文件。子代理看不到你的聊天记录，任务文件是它唯一的信息源。
- 做法 A：Claude Code（需要 spawn 子 agent）+ Python 3.8 以上。
- 做法 B：Docker；Claude 订阅或 API key；一个可改的 git 仓库；一条验证命令。
- 做法 C：Node.js 22 或 24 + tmux，仅 macOS / Linux。
- 做法 D：可弃用的机器或容器；自己的小项目目录；至少一家模型订阅或 API key。
- 做法 E：git、Docker Desktop/Engine、Docker Compose v2.24+；仓库要求 Python 3.12+ / Node.js 22+。
- 做法 F：Python >= 3.10 且 < 3.14；uv；模型提供商 API key；若用网页搜索另需 Serper.dev key。
- 做法 G：Node.js 22+；git；已登录 GitHub CLI；编码 agent 订阅；Google Chrome；项目必须托管在 GitHub 上。
- 做法 H：项目在 git 下；至少一个 agent CLI 和账号，有第二个账号更好。若用 Offrun：Apple Silicon Mac、macOS 14 Sonoma 或更高。
- 做法 I：仅 macOS；会读取已有 Ghostty 配置。装 hooks 前 agent CLI binary 必须在 PATH 上。
- 做法 J：本机有 git 和 Node 22.13 或更新；在一个 git 仓库内；需要 SPEC.md、PRACTICE.md、pullboard.json。
- 做法 K：Windows 或 macOS；Claude Code 2.1.289 或更高且支持 mod；每个项目在注册表里有一项、并有 STATUS 文件。
- 做法 L：Node.js 22.13 或更新；native 部分预编译；要使用 Claude Code / Codex / OpenCode 之一需该 CLI 已登录。
- 做法 M：Claude Code，且能拉起子 Agent；能编辑子 Agent 收到的指令文本。
- 做法 N：Claude Code（Claude 套餐即可，不需要 API key）+ Node.js 20 或更新。
- 做法 O：macOS 14 或更高；安装后逐代理在 Settings → Answer prompts from Muster 开启；Codex 需先 /hooks 信任一次。
- 做法 P：tmux ≥ 3.2；git ≥ 2.31；bash；jq；perl；shasum；Claude Code ≥ 2.1.291；远程运行还需 ssh 和 rsync。
- 做法 Q：一个支持分阶段执行、且能显示成本或提供 /cost 的多代理 / 分阶段流程。
- 做法 R：Claude Code + Opus；一个 GitHub 仓库；能访问 issue 和 PR；有测试体系可先写会失败的测试；能持续运行 /loop 的会话或调度机制；若跑 watch-social 还需访问 X。原文没有给出具体权限配置、工具清单和反馈回路细节。
- 做法 S：已安装 Claude Code CLI，且能正常在终端里运行 claude 并完成一次普通对话；在同一个 shell 会话中操作，环境变量只对当前会话及其子进程生效；必须能接受实验特性失效、行为变化、以及可能的额外 token 消耗；不适合作为团队规范或生产流程的稳定依赖。
- 做法 T：Linux 或 macOS 机器，能联网拉依赖；Go 1.26；C 工具链；Meson；Ninja；构建过程会编译一份内置的 Git，缺任一项 make build 会失败。若接真实仓库：需要 config.toml（[graft] 段 + 可选 [graft.storage] 段）；数据库（SQLite 或 PostgreSQL）与对象存储（file/S3/GCS/Azure）；给每个 agent 的 token、RPC allowlist、branch policy；一个明确选定的冲突 resolver；存储迁移需要先 shadow 后 authoritative 的两段式操作窗口；要 Slack 汇报则需相应配置。版本 0.1.0，接口在 1.0 前可能变动。
- 做法 U：处在 git 仓库中（worktree 是 git 的概念）；已装 Claude Code 并且能正常在终端里运行 claude；确实有多个代理要同时改同一份代码。--worktree 在当前版本是否存在、有无版本或环境要求，原文未给，需自测确认。

## 操作步骤

先按你的处境选路径：

| 你的处境 | 用哪条路径 |
|---|---|
| 只有一个被你拒掉的回答，想确认多策略竞争是否真的更好 | 做法 A |
| 可拆分、有测试的编码任务，想并行落地 | 做法 B |
| 同时跑 Claude Code + Codex 等多套 harness，要座位与恢复 | 做法 C |
| 只想在同一会话里给难任务升档 | 做法 D（先做对照实验） |
| 想自建长时程子代理 + 沙箱 + 记忆的底座 | 做法 E |
| 有固定的多步分工（研究 → 成文），愿意写 Python / 改 JSONC | 做法 F |
| 有 GitHub 上的低风险小仓库，想验证 issue → PR → 浏览器实测 → 合并这条链 | 做法 G |
| 想在一个已有 git 的仓库里轻量隔离多个 agent、把项目记忆落成文件、提交前互评 | 做法 H |
| macOS 上并行跑多个终端型 coding agent，想一眼看到谁在等我 | 做法 I |
| 想让「另一个 agent 在同一 commit 上验证通过才算完成」变成硬约束 | 做法 J |
| 同时照看多个项目的 agent，想在一屏里看到状态、决策与评审关卡 | 做法 K |
| 跨平台并行跑多 CLI agent / 任意长驻命令，想用 daemon + dashboard 统一看状态、回权限、脚本化取成本 | 做法 L |
| 想让子 Agent 只写、验证全部集中在主 Agent | 做法 M（先做对照实验） |
| 有一个真实、可逆的商业/经营决策，想用多个专家视角压测它 | 做法 N（先跑 --quick） |
| macOS 14+ 上并行跑多个 Claude Code / Codex / Cursor，人被卡在审批与多选 | 做法 O |
| 想在 Claude Code 里跑有门禁、评审、清理与无人值守的 tmux 会话团队 | 做法 P（先 relay，后 delegate） |
| 跑多代理 / 分阶段流程，想进下一阶段前先结一次账 | 做法 Q（先跑 2–3 个阶段） |
| 想让 Claude Code 用 /loop 持续处理最近 3 天 issue，并按先复现、先写失败测试、再修的顺序做 | 做法 R（先只跑 triage-github） |
| 使用 Claude Code，想试内置 agent teams 是否真的开启多代理并行，并先确认成本与质量 | 做法 S（先做 30 分钟基线对照，不在关键仓库直接采用） |
| 同时运行大量编码智能体，想验证服务端落库、缓存、多个 agent、一次 land 的完整链路 | 做法 T（先跑 quickstart，再 shadow 接入） |
| 有多个 Claude Code 代理要同时改同一仓库，编辑期互相覆盖、想先隔离 | 做法 U（先自测，再决定是否写进流程） |

### 做法 A：把不满意的回答送进锦标赛（arena-skill）

1. 安装，三选一。直接粘给 Claude：

```text
https://github.com/Jakeschincariol/arena-skill
Install this skill, then confirm /arena works.
```

或手动复制到全局 skill 目录：

```bash
git clone https://github.com/Jakeschincariol/arena-skill.git
cp -r arena-skill/skills/arena ~/.claude/skills/
```

或作为插件安装：

```text
/plugin marketplace add Jakeschincariol/arena-skill
/plugin install arena-skill@arena-skill
```

2. 运行前把权限切到 accept-edits（Shift+Tab）。

3. 先算成本：

```bash
python3 skills/arena/bracket.py plan --agents 100
```

4. 把任务写具体，并检查 .arena/<run>/task.md。

5. 跑最小完整形态：

```text
/arena --quick --seed 7 <把任务写具体>
```

6. 需要手工操作时用 bracket.py，状态在 JSON 文件里。

7. 验证工具本身：

```bash
python3 -m unittest discover -s tests -v
```

8. 改规则看 strategies.json、rubric.md、SKILL.md。

### 做法 B：并行子代理 + 测试合入闸门（clodfarm）

1. 安装并启动：

```bash
curl -fsSL https://raw.githubusercontent.com/matank001/clodfarm/main/scripts/install.sh | sh
```

2. 或裸 Docker 启动：

```bash
docker run -d --name clodfarm --restart unless-stopped ghcr.io/matank001/clodfarm
docker exec -it clodfarm clodfarm login
```

3. 登录 Claude 账号：clodfarm login、claude setup-token、挂载已有 ~/.claude，或 ANTHROPIC_API_KEY + FARM_DAILY_BUDGET_USD。

4. 接真实仓库并设验证闸门：

```bash
FARM_REPO_URL=<你的仓库地址>
FARM_VERIFY_CMD='pytest -q'
```

5. 派任务：

```bash
docker exec clodfarm clodfarm spawn 'Add CSV export' --prompt 'Add CSV export to the report page, with tests.'
docker exec clodfarm clodfarm status
```

6. 从手机、Claude Code 远程 MCP、定时任务接入；用 FARM_MAX_WORKERS、FARM_WEEKLY_TARGET、FARM_FIVE_HOUR_CEILING 等节流。

### 做法 C：多 harness、多座位的统一编排与恢复（openrig）

1. 检查前置：

```bash
tmux -V
claude --version && claude auth status
codex --version && codex login status
```

2. 安装并预览：

```bash
npm install -g @openrig/cli
rig setup --dry-run
```

3. 选 starter：first-project / first-project-claude / first-project-mixed。

4. 启动两座位：

```bash
cd /path/to/your/repository
starter=first-project
rig specs preview '$starter' --kind rig
rig up '$starter' --cwd . --plan
rig up '$starter' --cwd .
rig tui --shared
```

5. 就绪检查：

```bash
rig ps --nodes --rig '$starter'
```

6. 给 owner 有界结果，并用 rig queue list 跟踪。

### 做法 D：在同一编码 agent 内用关键字升档（oh-my-openagent）

1. 安装：

```bash
curl -fsSL https://get.omo.dev/install.sh | bash
omo
```

2. 进入项目，难任务加 ultrawork 或 ulw；多智能体协作试 mass ulw。

3. 登录：/login；迁移先跑 omo setup、omo doctor。

4. 配置：~/.omo/omo.jsonc 或 <project>/.omo/omo.jsonc，就近优先。

### 做法 E：搭长时程子代理底座（deer-flow）

1. 最快路径：把下面这句话原样交给编码助手：

```text
Help me clone DeerFlow if needed, then bootstrap it for local development by following https://raw.githubusercontent.com/bytedance/deer-flow/main/Install.md
```

2. 手动路径：

```bash
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow
make setup
make doctor
```

3. 模型接入写 config.yaml 或 .env。

4. Docker 开发模式：make docker-init、make docker-start、make docker-logs。

### 做法 F：把多步任务固化成角色化流水线（crewAI）

1. 确认 Python >=3.10, <3.14。

2. 安装 uv。

3. 安装 CrewAI CLI：

```shell
uv tool install crewai
uv tool list
```

4. 创建项目：

```shell
crewai create crew <project_name>
```

5. 编辑 agents/*.jsonc、crew.jsonc，配 .env。

6. 运行：

```shell
crewai install
crewai run
```

### 做法 G：把 issue → PR → 浏览器实测 → 合并做成一条自动链路（cubefarm）

1. 体检：

```bash
npx cubefarm doctor
```

2. 登录：npx cubefarm login。

3. 先看 demo：npx cubefarm --demo。

4. 正式启动：npx cubefarm。

5. 建公司、搬入 GitHub 项目。

6. 让 CEO 规划，观察与介入。

7. 控制并发：session limit 先设 1–2。

8. 合并门禁：先关闭 auto-merge，人工确认每一份 QA 报告和 PR 差异。

### 做法 H：worktree 隔离 + 项目记忆文件 + 提交前互评（Offrun 或手工照做）

1. 每个 agent 一个 worktree：

```bash
git worktree add ../repo-agent1 -b agent1
git worktree add ../repo-agent2 -b agent2
```

2. 建项目记忆纯文件：

```text
conventions.md
plan.md
dead-ends.md
```

3. 让第二个 agent 在提交前读 diff 做评审，结论落到 chat 里由你判断，Nothing merges on its own。

4. 撞限额时切换登录；Build / Planner 模式按需切换。

### 做法 I：用 cmux 把并行 agent 的等待变成可路由通知（macOS）

1. 安装：brew tap manaflow-ai/cmux；brew install --cask cmux。

2. 接入 hooks：

```bash
cmux hooks setup
cmux hooks setup codex
```

3. 通知：OSC 9/99/777 触发 pane 蓝环、侧栏未读徽标、通知弹窗；⌘⇧U 跳最新未读，⌘I 打开通知面板。

4. 一键跑 Claude Code teammate：cmux claude-teams。

5. 远程：cmux ssh user@remote。

6. 可关闭自动恢复 agent：terminal.autoResumeAgentSessions=false。

### 做法 J：把「另一个 agent 在同一 commit 上验证通过才算完成」做成状态机（pullboard）

1. 看闭环：

```sh
npm i -g pullboard
pullboard tour
```

2. 初始化：pullboard init，提交它写出的文件。

3. 写 SPEC.md，一行一个需求。

4. 配 pullboard.json 的 gate 和 lanes。

5. 手工走：pullboard add、pullboard worktree、pullboard next、pullboard submit。

6. verifier 必须是另一个没参与构建的 agent，checkout 确切 commit，accept 给证据、reject 给理由。

### 做法 K：把多项目的派工、状态与评审关卡收进一个控制台（claude-console）

1. 安装：

```powershell
claude plugin marketplace add SaM-runtime/claude-console
claude plugin install console-status@claude-console
```

2. 先看 demo：/console demo；回真实状态：/console refresh。

3. 配注册表、STATUS 卡、dispatch.json；执行者解析顺序：面板覆盖 > 注册表 Executor 列 > 全局 executor。

4. 日常动作：v 验证、s 同步、c 继续、r 回覆、d 决定、g 关卡评审、o 打开 STATUS.md、p 打开 PR。

5. 护栏：commandGuard 默认 ask；loopGuard 默认 on。

### 做法 L：用一个终端 daemon + dashboard 管住并行 agent 的可见性与权限（nsq / neurosquad-cli）

1. 安装：

```sh
npm install -g neurosquad
npx neurosquad
```

2. 在 git 仓库里启动 agent：

```sh
cd ~/code/my-app
nsq run claude 'fix the flaky checkout test' --worktree
nsq run codex --name reviewer
nsq run -- npm run dev
nsq
```

3. dashboard：Enter 全屏，Ctrl+] 回网格，y/a/n 回答权限，s / S 发送提示，q 关闭而 agent 继续跑。

4. 恢复：nsq down、nsq up。

5. 脚本化：nsq ls --json、nsq send、nsq answer、nsq peek、nsq diff、nsq cost --since 7d。

### 做法 M：主 Agent 编排 + 哑子 Agent 只生成（验证集中在主 Agent）

1. 划清生成与验证边界。

2. 给生成型子 Agent 写入硬性禁止项：

```text
不 Build、不 Test、不 Typecheck，早提交早返回。
```

3. 子 Agent 返回后，由主 Agent 统一做验证。

4. 按正交方式拆解隔离；原文未给判据，需要自己设计。

### 做法 N：把商业决策交给一个可复现的专家委员会（roast-room）

1. 克隆并进入：

```bash
git clone https://github.com/nateherkai/roast-room.git
cd roast-room
```

2. 可选启动本地房间：npm start，打开 http://localhost:4730。

3. 在文件夹里打开 claude，输入：

```text
/roast-room <你的决策>
```

4. 给全六项信息：决策、选项、数字、限制、成功长什么样、你倾向哪一边。

5. 控成本：/roast-room --quick ...、--seats hormozi,buffett ...、ask hormozi ...。

6. 校验引用：

```bash
python .claude/skills/roast-room/scripts/check_quotes.py sessions/<session>
```

### 做法 O：把「代理在等我」变成菜单栏上可一键回答的提醒（Muster，macOS）

1. 安装：brew install --cask josefchen/tap/muster。

2. 逐个代理开启 Settings → Answer prompts from Muster。

3. 快捷键：⌥ Tab 切换会话；⌥ ↩ 允许；⌥ ⌫ 拒绝；⌥ 1–9 选择；⌃ ⌥ Space 看最近三小时 token 与成本。

### 做法 P：在 tmux 里跑一个有门禁、评审与清理的 Claude 会话团队（hivehouse）

1. 检查依赖：tmux ≥3.2、git ≥2.31、jq、perl、shasum、Claude Code ≥2.1.291。

2. 安装：

```text
claude plugin marketplace add Cleveland-RD/hivehouse
claude plugin install hivehouse@hivehouse
```

3. 默认 relay 模式，先只对一个项目运行 /hivehouse:start <task>。

4. delegate 模式仅在只有你能写的 root 文件允许时开启，最多 7 天，且仅在 permission_mode_local=auto 时才 bypassPermissions；push、deploy 和花费留给你。

### 做法 Q：在进入下一阶段前先结一次账（/cost 阶段成本检查）

1. 前提：流程可拆成至少 2–3 个阶段，能读到成本或提供 /cost。

2. 进入下一阶段前跑：

```text
/cost
```

3. 记录阶段成本、token、代理数与耗时。原文示例：5 个代理、20 秒、4.18 美元；工作 token 从 198,628 增加到 233,055。

4. 对无法定价的新代理保持警惕：估不出边际成本就先不加。

### 做法 R：用并行 /loop 做持续 issue 复现与修复（magpie 工作流复刻）

把这条路径当作小范围可试的候选：它给出了可照做的流程骨架——triage-github 处理最近 3 天 issue、先复现、先写会失败的测试、再修；但原文正文被截断，/loop 的完整配置、提示词原文、第三个 loop 均未给出，watch-social 也只写到「盯 X /」，不能补写命令。

1. 前提：准备 Claude Code，并使用 Opus 模型。原文写的是 Claude Code + Opus 5.5，但 5.5 这个版本号仅在本次上下文的原文中出现，需自行确认可用版本。

2. 前提：选定一个 GitHub 仓库。作者跑的是 readest/readest，并产出了 PR 6796。

3. 不要一上来跑 3 个 loop。最小试用只启动一个 loop：triage-github，处理最近 3 天的 issue。

4. 把处理顺序写死为：先复现问题；先写一个会失败的测试；再修。可把下面这行放进 loop 的指令：

```text
处理最近 3 天的 issue，先复现、先写一个会失败的测试，再修
```

5. 跑一天后检查产出的 PR 或提交。判断标准不是「效果很好」这句作者主张，而是最近 3 天 issue 中有多少被真正复现、有多少修复在改代码前存在会失败的测试、这些测试在修复后是否通过、产出的 PR 有多少被合并或至少进入人工 review。

6. 第一个 loop 稳定后，再考虑第二个 loop：watch-social，目标是盯 X /。原文在此截断，后续信号源和动作未知，不要照搬。

7. 第三个 loop：原文没有留下名称和职责，无法照搬。

8. 原文没有给出 /loop 的启动命令原文，只有「并行跑 3 个 /loop」这一描述；不要编造命令或配置。

**与已有做法的差异（照做前先读）**

- 做法 R 是持续型 loop，按时间窗口或外部事件触发；做法 A 是一次性锦标赛；做法 B/G/J 是合入门禁；做法 I/L/O 是注意力路由。
- 做法 R 的「先写会失败的测试再修」可以与做法 B 的 FARM_VERIFY_CMD、做法 J 的 gate + verifier 叠加：让 loop 产出的 PR 必须过你的测试命令和独立 verifier。
- 做法 R 不替代验证、记忆和合入门禁；它只把 issue 复现与修复变成一个持续运行的分工。

### 做法 S：用实验性开关尝试开启 Claude Code 内置 agent teams

把这条路径当作实验性候选，不要直接写进团队规范。原文只有一行环境变量加启动命令；没有效果数据、案例、截图、文档链接或 Anthropic 官方出处。

1. 前提：已安装 Claude Code CLI，且能正常在终端里运行 claude 并完成一次普通对话。

2. 前提：在同一个 shell 会话中操作，环境变量只对当前会话及其子进程生效。

3. 在终端设置环境变量（原文原样）：

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

4. 紧接着在同一个会话中启动（原文原样）：

```bash
claude
```

5. 原文到此为止。如何指定 Opus 主导、如何让 Haiku 并行、子代理各自拿什么任务、几个并行、失败如何回收——原文没有给出任何配置、命令、提示词或截图。这部分只能自行在 Claude Code 内探索，例如查看内置 agents/subagent 相关命令是否出现变化；原文未提供依据。

6. 若需要长期生效，需按自己所用 shell 的配置文件方式持久化该变量；原文未提及这一点，属于自行补充。

7. 最小试用建议 30 分钟内完成：选一个非关键小仓库，构造一个包含「多环节」的固定任务，例如「改一个函数 + 补一个测试 + 更新对应文档」。先在不设置环境变量的情况下跑一遍，记录基线：完成耗时、消耗的 token/额度（如能看到）、主模型上下文被占用程度、结果质量（测试是否通过、diff 是否需要大幅返工）、需要人工干预的次数。

8. 开一个新终端，执行第 3、4 步（export 后 claude），跑同一个任务。

9. 对比：开关是否生效（能否观察到多个 agent 被创建/并行工作；若有内置命令可列出 agents，用它确认）；成本（单位任务总开销是否下降，Opus 侧上下文占用是否明显减少）；质量（测试通过率、diff 规模、返工次数是否不劣于基线）；稳定性（是否报错、是否中途丢失上下文、是否出现重复劳动或互相覆盖改动）。

10. 判定：开关无效、或行为与基线无差别 → 降级为 watch，记录「该环境变量在当前版本无效/已移除」。有并行但质量或成本变差 → 不写入手册，或只作为「谨慎使用」的注记。并行确实存在、成本下降且质量不掉 → 可写入手册，作为 Claude Code 的「可选实验配置」，并注明实验性与验证日期。

**与已有做法的差异（照做前先读）**

- 做法 S 不是新工具，而是同一工具 Claude Code 的配置层补充：一个可能开启内置 agent teams 的实验性环境变量。
- 做法 D 是在同一编码 agent 内用显式关键字 ultrawork / ulw / mass ulw 升档；做法 S 是用环境变量尝试开启内置多代理，原文没有给出两者是否重叠、能否叠加。
- 做法 M 是主 Agent 编排 + 哑子 Agent 只生成，验证集中在主 Agent；做法 S 的概念相似，但原文没有给出任何编排规则、验证边界或失败回收，不能替代做法 M。
- 做法 S 若将来验证有效，也应与做法 B 的 FARM_VERIFY_CMD、做法 J 的 gate + verifier 叠加；不要因为开了多代理就跳过测试、评审和合入门禁。

### 做法 T：用 git-ai/Graft 在服务端承载大量编码 agent 的并发落库与验证

把这条路径当作 0.1.0 候选：它把「大量短生命周期 agent 在同一分支并发落库」的服务端方案做成了可跑的开源实现，但接口可能变、无与传统 Git 的量化对比，不宜直接上关键仓库。

1. 准备构建环境（前提：Linux 或 macOS 机器，能联网拉依赖）。README 明确要求 Go 1.26、C 工具链、Meson、Ninja，构建过程会编译一份内置的 Git。缺任一项 make build 会失败。

2. 克隆并构建（产出 server、CLI 和工具到 _build/bin）：

```shell
git clone https://github.com/feder-cr/git-ai.git
cd git-ai
make build
```

3. 跑官方最小端到端示例（前提：上一步构建成功）。这条脚本在临时目录里拉起一个 server、一个 cache daemon、两个 agent 和一次 land：

```shell
examples/graft/quickstart.sh
```

4. 查看 CLI 与可用命令：

```shell
./_build/bin/graft
```

5. 起自己的 server（前提：已按自己的环境改好配置）。README 的原文做法是改编示例配置后启动：

```text
To run your own server, adapt examples/graft/config.toml
and start it with _build/bin/gitaly serve config.toml.
```

即：编辑 examples/graft/config.toml，然后执行 _build/bin/gitaly serve config.toml。

6. 把仓库状态迁到数据库 + 对象存储（前提：先别直接切生产）。README 要求加一个 [graft.storage] 段，并且两阶段迁移：先以 shadow 模式启动、导入现有仓库，确认无误后再切到 authoritative 模式；细节在 doc/graft/STORAGE.md。

7. 选择冲突解决方式：为自动 conflict resolution 选一个 resolver——任意 LLM provider、确定性工具，或者干脆不解决（none），走的是版本化的、供应商无关协议。细节在 doc/graft/RESOLVE.md。最小试用建议先设为 none，先看清冲突都发生在哪里。

8. 开启落库后验证：用 graft-verify 测当前 tip，失败时 bisect 定位并 revert 掉引入问题的那个 change；细节在 doc/graft/VERIFY.md。

9. 给 agent 配权限（前提：团队要跑多个 agent）：用 per-agent token、RPC allowlist 和 branch policy 决定每个 agent 能做什么，细节在 doc/graft/AGENT-SECURITY.md。

10. 可选接监控与评审：让 agent 跟随 changeset 流、按组件汇报、也可发到 Slack（doc/graft/SUPERFAN.md、SUPERFAN-CHAT.md）；评审侧可配语义审批规则，例如纯注释改动所需的批准人数可以少于逻辑改动（doc/graft/REVIEW.md）。

11. 可选缓存层：graft-cache 在 daemon 层和区域层缓存不可变对象，并逐个对象校验。

12. 以上各步的深入配置分别写在 doc/graft/ 下的 QUICKSTART、CONFIGURATION、ARCHITECTURE、STORAGE、LAND-BATCHING、RESOLVE、DERIVED、REVIEW、SEARCH、VERIFY、SUPERFAN、AGENT-SECURITY、BENCH、FUZZING、LIMITATIONS 等文档中，README 只给了入口。

**与已有做法的差异（照做前先读）**

- 做法 T 不是替代做法 B/J/G 的合入门禁，而是服务端版本控制层：它改的是落库、历史计算、冲突解决和落库后验证，不是评审规则本身。
- 与做法 B 的 FARM_VERIFY_CMD、做法 J 的 gate + verifier 可以叠加：Graft 侧的 graft-verify 负责落库后测试、bisect、revert，你的合入门禁继续负责「是否接受这次变更」。
- 与做法 L 的 daemon + dashboard 不同：Graft 是仓库服务端，不解决人在终端里的注意力路由。
- 与做法 S 的内置 agent teams 不同：Graft 是自托管版本控制实现，不负责 agent 编排；原文没有给出两者能否协同。
- 只跑一两个 agent 的个人或小团队，引入数据库 + 对象存储的收益未经验证。

### 做法 U：给每个并行代理一份独立工作树副本（claude --worktree）

把这条路径当作待自测的候选，不要直接写进团队规范。原文只有一句话加一个命令：没有截图、命令输出、版本号，也没讲副本怎么合并回主线、什么时候清理。

1. 前提：你在一个 git 仓库里工作（worktree 是 git 的概念），并且确实有多个代理要同时改同一份代码。

2. 进入项目的 git 仓库目录。

3. 用下面的命令启动 Claude Code（原文原样）：

```bash
claude --worktree
```

4. 对每个要并行的代理重复第 3 步，让它们各自在自己的副本上编辑，而不是争抢同一个工作树。

5. 主工作树保持不变，由人掌握，代理不直接触碰它。原文的原话是，你的工作树不再是它们争夺的对象，因为它们完全不被允许触碰它。

6. 原文到此为止。以下环节原文都完全没有提及，需要自己实测确认后才能补进流程，不要照猜：--worktree 是否有版本或环境要求；副本创建在什么位置、是否需要预先配置；代理做完后如何合并回主线；副本何时、由谁清理；是否自动提交。

**与已有做法的差异（照做前先读）**

- 做法 H 是手工 `git worktree add ../repo-agent1 -b agent1`，并且另外附带项目记忆文件与提交前互评；做法 U 是 Claude Code 自带的启动参数，省掉了手工建 worktree 这一步，但材料没有说明它是否包含记忆或评审环节，两者不能互相替代。
- 做法 B 的 FARM_VERIFY_CMD、做法 J 的 gate + verifier 管的是「这次变更能不能被接受」；做法 U 只把编辑范围隔开，合入门禁照样要保留。
- 做法 I/L/O 解决的是注意力路由（谁在等我、在哪回答）；做法 U 解决不了这个问题，代理多了照样需要看板或通知。
- worktree 身份只在一台机器上有意义，不是安全边界（做法 J 原文明确说过）；做法 U 同理，不要拿它当权限隔离。
- 若 --worktree 在当前版本不存在、或行为与推文描述不符，降级为 watch/study，不要写进流程。

### 通用收尾：不管走哪条路径

- 开始前先固定「完成」的定义：哪条测试通过、谁来复核、在哪里看结果。
- 代码类任务一律把测试或 lint 作为合入门槛。
- 多步流水线要求产物落盘。
- 带自动合并能力的链路先用人工确认跑过 3–5 个真实 issue。
- 做法 J 的 verifier 必须是没参与构建该条目的另一个 agent，并在确切 commit 上给出证据。
- 做法 K/L/O 的看板、dashboard、菜单栏只解决可见性与权限路由，不替代验证、记忆和评审。
- 做法 M 的禁止项要原样写进子 Agent 拿到的指令；验证移到主 Agent，合入门禁仍然保留。
- 做法 N 的结论要落盘并在成功时限回看。
- 做法 Q 的阶段成本检查要落在阶段边界上。
- 做法 R：先只跑一个 triage-github loop；先写会失败的测试再修；跑一天后按可 review 的产出判断，而不是按「效果很好」判断。
- 做法 S：先做 30 分钟基线与开关后对照；开关无效或质量变差就只记录、不采用；即便并行生效，也要继续用测试、评审和合入门禁。
- 做法 T：先在临时目录跑通 examples/graft/quickstart.sh；再在非关键仓库以 shadow 模式只读导入并核对一致；确认无误后才切 authoritative；resolver 先设 none，稳定后再逐步打开自动 resolver、graft-verify 自动 revert、per-agent token 与 RPC allowlist。
- 做法 U：只在 git 仓库里、且确实有多个代理并行改同一份代码时用；主工作树留给人；副本位置、合并方式、清理时机、是否自动提交都要自己实测后写进流程；不要把它当安全边界，也不要用它替代测试、评审与合入门禁。

## 怎么判断变好了

**可观察的指标**

- 做法 A：最后那次与旧答案的盲评比分；冠军扛过的攻击里有多少条指向你原本没写进要求、但确实在意的缺口；你实际是否采用；实际 token 开销 vs plan --quick 的预估。
- 做法 B：合入 main 前的测试通过率；FARM_VERIFY_CMD 失败回注后子代理是否收敛；用量是否被节流在 5 小时窗口 85%、周窗口 80% 以内。
- 做法 C：手动切换终端和人工传话的次数是否下降；rig ps --nodes 是否还有未解决的认证、信任或权限提示。
- 做法 D：同一任务三轮对照（普通 prompt / 加 ulw / 加 mass ulw），记录返工次数与人工介入次数。
- 做法 E：make doctor 是否能无阻断跑完；最小任务是否能跑通。
- 做法 F：output/report.md 是否真的落盘、内容能不能直接用；context 是否真的接上；{placeholder} 是否按预期注入。
- 做法 G：QA 报告真阳性率；QA 通过的 PR 中人工复核后确实可用的比例；周期时间 vs 自己动手；每个 PR 你要动手改多少。
- 做法 H：并行任务时文件互相覆盖/冲突次数；第二个同类会话是否还要重复解释约定；同行评审有效比例和误报率。
- 做法 I：从 agent 等待输入到人响应的时间；漏掉通知导致空转的时长；通知环、侧栏未读徽标是否可靠触发。
- 做法 J：每条条目是否都有 gate 绿 + verifier 的 accept/reject receipt；越界提交是否被 lane 的 owns 授权拒绝；Needs you 里出现的是不是只有你能做的决定。
- 做法 K：● 待决策、◆ 待评审条目从出现到处理完的时间；你实际盯的窗口数 vs 只看面板；关卡是否真的拦住没清空的条目。
- 做法 L：从 agent 需要你到人响应的时间；关掉 dashboard 后 agent 是否继续跑；nsq up 后是否按各自 session 恢复；nsq cost 是否读得到 token。
- 做法 M：子 Agent 的平均轮次与工具调用次数是否下降；是否还会越修越乱；主 Agent 一次通过率、交接处返工是否变差。
- 做法 N：反方论点命中数；是否改变你的倾向；引用可核验率；成本对账；到期回看 verdict.md。
- 做法 O：从代理开始等待到人察觉的时间；从察觉到回答完成的时间；是否出现重复回答或冲突；关掉后设置文件是否精确还原。
- 做法 P：安装检查通过；团队是否按计划产出 diff/提交；gate 是否把每一步运行到日志并验证通过；cleanup 是否只移除 manifest 记录的内容。
- 做法 Q：进入下一阶段前是否真的能看到该阶段成本；实际总成本 vs 你设的预算；token 增长是否与任务复杂度匹配；新增代理前是否能估出边际成本。
- 做法 R：最近 3 天 issue 中有多少被真正复现；有多少修复在改代码前存在会失败的测试；这些测试在修复后是否通过；产出的 PR 有多少被合并或至少进入人工 review；人工需要返工的比例；是否产生误报、重复处理或无关改动；与人工处理同一批 issue 的时间、返工率对比。
- 做法 S：开关是否真的生效，能否观察到多个 agent 被创建/并行工作；单位任务总开销是否下降；Opus 侧上下文占用是否明显减少；测试通过率、diff 规模、返工次数是否不劣于基线；是否报错、中途丢失上下文、重复劳动或互相覆盖改动。
- 做法 T：单次 land 的端到端耗时（从 agent 想提交到引用更新完成）；同一分支上并发 land 的成功率与需要人工介入的冲突比例；自动冲突解决被接受、且后续没有被 revert 的比例（用来判断 resolver 是否可信）；graft-verify 捕获的回归数量、bisect 定位是否准确、自动 revert 是否误伤；权限控制是否真的挡住越权操作（构造几个越权请求做负向测试）；增加服务节点后横向扩展是否如预期（可测）。README 未给数值目标，需自建基线，与现有 merge queue / PR 流程对比。
- 做法 U：并行期间是否出现互相覆盖、需要人工解冲突的次数；把各自结果合并回主线所花的时间（对照组：不用 --worktree，两个代理直接在同一工作树里改同样的东西）；主工作树是否被代理污染、副本能否一键丢弃回退；副本目录是否按预期自动创建和清理，是否留下需要手动收拾的垃圾。

**最小试用**

- 做法 A：挑 1–2 个真实、不满意的任务，跑 /arena --quick --seed 7 并用 baseline 传入旧答案。
- 做法 B：单机 + 小仓库 + 一条已有测试命令，先验证 1–2 个编码任务。
- 做法 C：rig setup --dry-run + 两座位 starter，跑一个有界的实现 + 独立复核任务。
- 做法 D：半天内在可弃用机器上跑完三轮对照。
- 做法 E：先 make setup → make doctor → make docker-start。
- 做法 F：把手头一个多步资料整理 → 成文改写成 researcher + reporting_analyst 两个角色，看 output/report.md 能不能直接用。
- 做法 G：doctor → demo → 低风险小仓库，session limit 设 1–2，先关闭 auto-merge，跑 3–5 个真实 issue。
- 做法 H：半天到一天，一个仓库，只试隔离、记忆、提交前互评三件事。
- 做法 I：macOS 上装 cmux，跑 hooks setup，开 2–3 个终端型 agent，试通知与 ⌘⇧U、⌘I。
- 做法 J：先 pullboard tour；再选真实小仓库，写 1–3 行 approved SPEC.md，设真实 gate，配 1 条 builder lane + 1 条 review lane，用 2–3 个小条目走完整流程。
- 做法 K：装插件 → /console demo → /console refresh → 挑一两个可回滚项目建注册表和 STATUS 卡 → 走一遍派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审。
- 做法 L：装 neurosquad → 在 git 仓库跑 nsq run claude ... --worktree 和 nsq run codex --name reviewer → 打开 dashboard 试权限回答 → nsq up 恢复 → nsq ls/cost/diff/peek。
- 做法 M：挑一个中等规模编码任务，保留平时做法作对照，正交切成 2–3 块，子 Agent 指令写入禁止项，主 Agent 统一验证。
- 做法 N：挑一个真实、可逆、一周内能见效的决策，先跑 /roast-room --quick，再跑 check_quotes.py，到成功截止日回看 verdict.md。
- 做法 O：macOS 14+ 装 Muster，只对 Claude Code 开代答；开两个并行会话，制造权限请求和多选题，练 ⌥↓、⌥↩、⌥1–9。
- 做法 P：非关键项目、本地环境安装；先保持 relay，只对一个项目运行 /hivehouse:start <task>。
- 做法 Q：下一次多代理任务拆成 2–3 个阶段，每阶段开始前跑一次 /cost，记录成本、token、转移次数和耗时。
- 做法 R：只选一个自己熟悉的 GitHub 仓库，不要一上来跑 3 个 loop；只启动 triage-github 这一个 loop，处理最近 3 天 issue；强制遵守先复现、写一个会失败的测试、再修；跑一天后检查产出的 PR 或提交。第二个 loop 先不做 watch-social，或只做人工确认过的外部信号源，等第一个 loop 稳定后再加。
- 做法 S：选一个非关键小仓库，构造一个包含「多环节」的固定任务；先在不设置环境变量的情况下跑一遍记录基线；再开新终端执行 export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 后 claude，跑同一任务；30 分钟内完成对照。
- 做法 T：不改动现有仓库，先构建，然后跑 examples/graft/quickstart.sh，确认在临时目录里 server、cache daemon、两个 agent、一次 land 能完整走通；用 ./_build/bin/graft 逐个熟悉 land、changeset 列表/watch、verify 相关子命令；拿一个非关键真实仓库按 [graft.storage] 的 shadow 模式做只读导入，核对导入后的仓库状态与源仓库一致；确认无误后再切 authoritative；只让少量 agent 走这套流程，且暂时不开自动冲突解决（resolver 设为 none）；稳定后再逐步打开自动 resolver、graft-verify 的自动 revert、per-agent token 与 RPC allowlist。
- 做法 U：挑一个不关键的 git 仓库，开两个代理，都用 claude --worktree 启动，各派一个改动任务——先试改不同文件，再试改同一文件的不同区域，全程人工记录；对照组是不用 --worktree，两个代理直接在同一工作树里改同样的东西。

**试多久、什么时候升级**

- 做法 A：若 --quick 在 3 个以上任务上稳定优于 baseline，且攻击确实命中你没考虑到的地方，再升到 --agents 32。
- 做法 B/C/D/E：没有量化效果数据，先一到两个任务、可弃用环境为限。
- 做法 F：连跑 2–3 次同类任务；若每次都要大改 output/report.md，先退回单 agent 手改。
- 做法 G：以 3–5 个真实 issue 为最小样本；若 QA 真阳性率接近零，或人工介入次数没有下降，考虑退回不用。
- 做法 H：只在一个 repo、一两个任务上观察两周再决定是否推广。
- 做法 I：先在 1–2 个 agent、半天到一天内试用；若通知可靠、漏掉等待的时间下降，再扩大 agent 数。
- 做法 J：先在 2–3 个小条目上跑完整闭环，再决定是否固化成日常流程。
- 做法 K：先在一两个可回滚项目上跑一到两周，确认派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审真能减少人工盯盘。
- 做法 L：先在一个 git 仓库、一两个真实任务上试半天到一天，确认 daemon 恢复、通知、权限内联回答、nsq ls/cost/diff/peek 都可靠。
- 做法 M：先在 2–3 个中等任务上做对照；只有子 Agent 轮次下降且主 Agent 侧返工没有明显增加，才算成立。
- 做法 N：先在一个可逆决策上跑一次 --quick，看反方论点命中数是否大于 0、引用是否全过校验、结论是否只是附和你的倾向。
- 做法 O：先在 1–2 个并行会话、半天到一天内试用。
- 做法 P：先在非关键项目、本地环境用 relay 模式跑一个任务；确认无误后再考虑 overnight 或 delegate。
- 做法 Q：先在一两次任务上试 2–3 个阶段；只有当事前看见成本真的让你避免了一次异常增长或一次不必要的代理扩容时，才固定成流程里的固定步骤。
- 做法 R：跑一天后检查产出的 PR 或提交；如果拿不到可合并或可 review 的产出，或大量 PR 无法通过测试，说明该流程在当前仓库还不适合直接采用。第一个 loop 稳定后再加第二个；第三个 loop 原文缺失，不升级。
- 做法 S：只做一次 30 分钟对照不构成采用依据。若开关无效或行为与基线无差别，降级为 watch；若有并行但质量或成本变差，不写入手册或只作谨慎注记；只有并行确实存在、成本下降且质量不掉，才考虑作为可选实验配置，并注明实验性与验证日期。
- 做法 T：原文未给数值目标。先以「临时目录 quickstart 跑通 + 非关键仓库 shadow 只读导入 + 少量 agent 且 resolver none」为最小范围；确认单次 land 耗时、并发 land 成功率、人工介入冲突比例、graft-verify 误伤率可接受，再扩大到更多 agent；没有量化对比前不扩大到关键仓库。
- 做法 U：先在一个不关键仓库、两个代理、一两个任务上试半天到一天。如果编辑期冲突减少，但合并耗时和人工成本持平甚至更高，那只是把问题挪了个位置，不足以改进工作方式；只有在整体耗时或返工明显下降时，才值得写进手册。若 --worktree 在当前版本不存在、或行为与推文描述不符，则降级为 watch/study。

## 常见坑

- 做法 A：任务含糊，100 个 agent 会一起含糊；任务文件是唯一信息源；judge 也是 Claude，评分有偏差。
- 做法 B：不设 FARM_VERIFY_CMD 等于没有质量门；多机共用 farm 需要真实 DynamoDB 表 + 共享仓库。
- 做法 C：启动会写入 provider hooks 和 workspace trust 设置，先备份；原生 Windows 不支持。
- 做法 D：安装脚本是 curl | bash，只在可弃用环境试；mass ulw 的图如何定义、如何限制并行度、如何统计花费，材料里没有。
- 做法 E：抓到的原文在 Option 2 处被截断，skills / sub-agents / scheduled tasks / memory 只有标题。
- 做法 F：涉密场景先自己查文档再跑；这是开发框架，不是装完即用的工具。
- 做法 G：项目必须已托管在 GitHub 上；auto-merge 只有 README 描述，先关掉它。
- 做法 H：Offrun 仅 Apple Silicon Mac；同行评审发现落到 chat 里由你判断，不要自动合并。
- 做法 I：仅支持 macOS；装 hooks 前 agent CLI 必须在 PATH 上；本机 local-tmux 活不过 logout、重启、关机或断电。
- 做法 J：项目很小，部分功能仍是 planned；worktree 身份不是安全边界；没有设 gate 就没有 submit/push 前的门槛。
- 做法 K：强依赖环境与版本；状态和关卡建立在你自建的项目注册表和 STATUS 卡上；设置只影响下一次派工。
- 做法 L：0.1.0 preview；nsq run -- 的任意命令没有 hooks，永远不会出现 needs you；手机端链接携带 pairing token，当密码对待。
- 做法 M：原文在「2. 任务拆解：正交隔离」处被截断；只有作者主张、没有数据；不要用做法 M 替代合入门禁。
- 做法 N：顾问是模拟人格，不是本人；check_quotes.py 只验证引文是否在 brain 里且有来源，不验证来源是否被正确解释。
- 做法 O：仅 macOS 14+；只覆盖 Claude Code / Codex / Cursor；Cursor 只能跳转、不能代答。
- 做法 P：工作文件夹绝不能是项目本身；默认 relay 模式每次 start / wake / answer 都等你；delegate 模式涉及 bypassPermissions 和复制 secret 文件到远程的风险。
- 做法 Q：推文级材料；只有一组单次观测数据，没有基线、阈值或对照；阶段检查依赖你能读到阶段成本。
- 做法 R：正文被截断，/loop 的完整配置、提示词原文、第三个 loop 均未给出；watch-social 只写到「盯 X /」，不要照不完整片段猜。只有作者主张「跑了一天，效果很好」和一个 PR 链接；PR 6796 只能说明有产出，不能说明 loop 稳定、可迁移到其他仓库。适用条件至少包括：有 GitHub issue 可处理、有测试体系可写失败测试、有 X 访问能力、能长时间运行 Claude Code。先只跑一个 triage-github loop，不要一上来并行 3 个。
- 做法 S：原文只有一行环境变量加启动命令，没有任何效果数据、案例、截图、文档链接或 Anthropic 官方出处；互动量很低（61 赞、3 转发、6 回复），缺少社区验证。模型名 Opus 5.5 / Haiku 5.5 与常见版本号命名习惯不符，无法从材料确认存在该版本；环境变量名 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 未在原文之外得到验证，且含 EXPERIMENTAL，说明即使存在也是不稳定、可能随时改名或移除。不要把它当团队规范或生产流程的稳定依赖；不要补写如何指定模型、如何并行、并发数或失败回收；先做对照，再决定是否记录为可选实验配置。
- 做法 T：0.1.0，自称首个公开版本，接口在 1.0 前可能变动；构建要编译内置 Git，依赖较重；已知缺口写在 LIMITATIONS.md（README 举例提到存储核心中 pack 的垃圾回收）；README 未给出与传统 Git 或其他方案的对比数字；banner 图注里出现「50 agents on one branch retry and fail with push, rebase, retry」「100 against 200 changes landed」是配图说明，不是可核验的基准结果；自述有 unit、端到端、多节点、crash、fuzz 测试覆盖，但未给覆盖率或测试数量；只跑一两个 agent 的个人或小团队，引入数据库 + 对象存储的收益未经验证；存储迁移必须影子模式先导入、确认无误再切 authoritative；resolver 自动解决需评估后续 revert 比例；服务端本身不调用语言模型，冲突解决协议供应商无关；fork 自 Gitaly，保留上游 RPC，非 MIT 的 ee/ 目录未包含。
- 做法 U：原文只有一句话加一个命令，没有截图、命令输出、版本号；作者称方法来自 Anthropic 的分享但没有给出出处，本手册无法核对；「让三个代理可以同时编辑同一个代码库而不会冲突」是作者主张，「三个代理」是举例不是实测结论；只在多代理并行编辑时才有意义，单代理串行场景收益不明；原文未涉及合并成本，存在把冲突从「编辑时」推迟到「合并时」的可能——若编辑期冲突减少但合并耗时和人工成本持平甚至更高，那只是把问题挪了个位置；社交指标（101 赞、15 转发、8 回复）只反映传播度，不反映效果；不要拿它当安全边界，也不要补写原文没给的版本要求、副本位置、合并与清理方式。

## 证据与来源

- 做法 A 依据调研《Jakeschincariol/arena-skill》。可核对：成本表、bracket.py plan 输出、赛程表、rubric 权重、默认并发 10、覆盖完整锦标赛的单元测试、仓库 117 stars。属于作者主张：淘汰赛能产出更强答案，README 没有给出质量对比数据。
- 做法 B 依据调研《matank001/clodfarm》。可核对：一行安装脚本、裸 Docker 与 compose 启动命令、四种登录方式、环境变量默认值、多机部署与 clodfarm budget。原文未给出效果量化数据。
- 做法 C 依据调研《mvschwarz/openrig》。可核对：Node.js 22/24 与 tmux 要求、仅 macOS/Linux、npm 包名 @openrig/cli、三套 starter 与模型、rig ps / rig send / rig queue 等命令。原文明确工具仍处早期版本且没有量化效果数据。
- 做法 D 依据调研《code-yeongyu/oh-my-openagent》。可核对：安装脚本与渠道参数、包名 omo-ai、配置路径与就近优先、关键字 ultrawork / ulw / mass ulw、omo setup / omo doctor / omo update、许可证徽章 SUL-1.0。属于作者主张：研究一万个来源、一小时干完 Claude Code 七天的活等来自 README 自述或用户好评，没有基准。
- 做法 E 依据调研《bytedance/deer-flow》。可核对：make setup / make doctor / make support-bundle / make docker-start 等命令、模型配置 YAML 示例、部署规格起点表、MIT 协议、Python 3.12+ / Node.js 22+。重要限制：原文在 Option 2: Local Development 的 Prerequisit 处被截断，skills、sub-agents、scheduled tasks、memory 等小节只有标题、没有正文。
- 做法 F 依据调研《crewAIInc/crewAI》。可核对：MIT 许可、Python >=3.10 且 <3.14、uv 各平台安装命令、crewai create crew 生成的结构与 --classic 旧式结构、agents/*.jsonc 示例、crew.jsonc 里 context / output_file / markdown / process 的用法、CrewAI skills 的安装命令与四个 skill 分工。属于作者主张：多智能体角色分工能提升多步资料整理 → 成文的产出质量，README 没有给出基准。
- 做法 G 依据调研《leonvanzyl/cubefarm》。可核对：可执行命令、前提清单、五步上手流程、界面操作键、用 session limit 控制并发、QA 在真实浏览器里审查并发布带截图报告、合并门禁为 QA 通过且 GitHub checks 全绿。属于作者主张：办公室看起来在工作、QA 报告能起到把关作用、auto-merge 安全，没有成功率、误合并率、成本或周期时间的数字，唯一量化指标是 53 stars。
- 做法 H 依据调研《Show HN: Offrun – manage every coding agent from one workspace》。可核对：安装流程、每个 agent 一个 git worktree、三个记忆文件名与读写时机、同行评审示例输出、限额切换提示文案、数据边界表。属于作者主张、没有外部验证：50 runs in a row、41 of 50 → 50 of 50、免费无限/无服务器/不经手密钥等。本手册只采用其中可迁移的三条流程。
- 做法 I 依据调研《manaflow-ai/cmux》。可核对：仅 macOS、基于 Ghostty 渲染引擎、DMG 与 Homebrew 安装、cmux hooks setup 及受支持 agent 列表、OSC 9/99/777 与 cmux notify 通知路径、快捷键表、cmux claude-teams、cmux ssh、autoResumeAgentSessions 配置、cmux restore-session 的信任差异、cmux surface resume 信任规则、cmux local-tmux / local-zellij 生命周期边界。属于作者主张：通知驱动的注意力路由能改善并行 agent 工作流，但没有第三方性能与收益数据。
- 做法 J 依据调研《pullboard-dev/pullboard》。可核对：完整 CLI 命令、SPEC.md 格式、pullboard.json 配置与各栈 gate 表、tour 的端到端示例、条目状态机、PRACTICE.md doctrine、看板是放在 .git 里的 SQLite 文件、Node 22.13+、MIT 许可、41 stars。属于作者主张：这套方法论更好、返工比例可复现。原文自己声明的局限：worktree 身份只在一台机器上有意义、不是安全边界；CI 只在 Linux 和 macOS 上跑，Windows 未测试。
- 做法 K 依据调研《SaM-runtime/claude-console》。可核对：两条安装命令、/console demo 与 /console refresh、插件配置与全部配置键及默认值、注册表 + STATUS 卡格式、dispatch.json 结构与执行者解析顺序、sync 的模型/session 覆盖规则、动作键与数字键回答待决事项、commandGuard / loopGuard / activation / projectMode 的取值与默认、Git/PR/CI 探测行为与 gitProbe 三档。属于作者主张：一个控制台会话承担跨项目规格、监督与评审关卡、刷新只查本地文件和 CLI、不请求模型、减少盯盘。原文自己声明的局限：仓库仅 53 stars、版本 0.15.x、UI 为繁体中文。
- 做法 L 依据调研《glmn-ai/neurosquad-cli》。可核对：npm install -g neurosquad / npx neurosquad、nsq run claude ... --worktree 与分支名 nsq/<name>、nsq run codex --name reviewer、nsq run -- npm run dev、dashboard 按键、nsq down / nsq up、nsq ls --json / send / answer / peek / diff / cost、nsq openrouter set-key、nsq provider add、nsq phone、语音听写、nsq config set autoUpdate false、nsq doctor、数据目录 ~/.neurosquad-cli 与 NSQ_HOME、OS keyring。属于作者主张、没有外部验证：README 自标 0.1.0 preview，没有给出任何改善幅度的量化指标或基准。
- 做法 M 依据调研《@yanhua1010: 总结一下，推荐收藏》。可核对：原文明确给出的两条规则（子 Agent 不 Build、不 Test、不 Typecheck，早提交早返回；任务拆解正交隔离）、架构名称主 Agent + 哑子 Agent、原样引用的指令文本。属于作者主张：剥离验证环节可以防止越修越乱、把上下文消耗压到最低，原文没有给出测量方式或数据。重要限制：原文在「2. 任务拆解：正交隔离」处被截断。
- 做法 N 依据调研《nateherkai/roast-room》。可核对：克隆与进入命令、npm start 与 http://localhost:4730、/roast-room <你的决策>、--quick / --seats / ask 三个变体、六项输入清单、目录结构、check_quotes.py 用法、报告落盘路径、成本量级（完整委员会 21 次 sub-agent 运行、API 模式约 25 次调用）、仓库 114 stars。属于作者主张：七个顾问由公开作品构建、每个引用都有出处是设计声明；辩论能提升决策质量、打分加权能反映真实重要性，均无实测结果。
- 做法 O 依据调研《josefchen/muster》。可核对：macOS 14+、brew install --cask josefchen/tap/muster、逐代理 Settings → Answer prompts from Muster、Claude Code 支持权限/多选/计划批准、Codex 需 /hooks 信任一次、Cursor 只跳转、快捷键表、URL scheme、pricing.json、build.sh / test.sh / scripts/e2e.sh、.muster-original / .muster-backup、只读读取会话文件、2 MB 下载与十个代理约 0.4% CPU / 20 MB 内存、计价口径、MIT、73 stars。属于作者主张：通知不够用、要能就地回答、改善幅度；README 没有节省多少等待时间的对照数据。
- 做法 P 依据调研《Cleveland-RD/hivehouse》。可核对：安装命令、依赖版本、claude plugin list --json 检查、userConfig 键、hh-hub init 与 start、九条技能表与一个 docs-health-check 工作流、hh-slot status、delegate 模式规则、清理范围、tests/test_docs_health.sh、30 stars。属于作者主张：bin/ 中每个机械动作是经过测试的 bash 可执行文件；docs-health-check 工作流是 Unverified here；没有任务完成率、成本节约或质量提升数据。
- 做法 Q 依据调研《@Klonzu: 天哪。5 个代理，20 秒内 4.18 美元。别再添加你无法定价的代理了。》。可核对：作者主张别再添加你无法定价的代理、动作在下一个阶段开始前检查每个阶段的成本、可复制的检查 /cost，以及一组演示面板数据：5 个代理、20 秒、4.18 美元；M-01 到 M-05，最后一帧 19 次转移；工作 token 从 198,628 增加到 233,055。属于作者主张：这些数据来自一次演示面板，原文没有给基线、阈值或对照。
- 做法 R 依据调研《@hwangxin: 复刻了 magpie 工作流》。可核对：作者复刻 @yetone 的 magpie 工作流并用在 Readest 项目上跑了一天；核心做法是用 Claude Code + Opus 并行跑 3 个 /loop；可辨认的 loop 有 triage-github（处理最近 3 天 issue，先复现、先写一个会失败的测试，再修）和 watch-social（盯 X /，原文截断）；第三个 loop 原文没有给出；作者称跑了一天，效果很好，并附 readest/readest PR 6796；该推文有 60 likes、8 reposts、6 replies。属于作者主张：效果很好没有可核对的指标、案例细节或对照；PR 6796 只能说明有产出，不能说明该 loop 稳定、可迁移到其他仓库。重要限制：正文被截断，/loop 的完整命令、配置或提示词原文无法直接复制运行；适用条件至少包括有 GitHub issue 可处理、有测试体系可写失败测试、有 X 访问能力、能长时间运行 Claude Code。本手册只采用可见的 triage-github 流程骨架，不补写缺失配置。
- 做法 S 依据调研《@mirku21: 这是绝对他妈的黄金》。可核对：原文只有一行 export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 和 claude；互动量 61 赞、3 转发、6 回复；无效果数据、案例、截图、文档链接或 Anthropic 官方出处。属于作者主张：「每个任务都享有 Opus 级别的架构」「无需在常规轮次中消耗 Opus 上下文」；模型名 Opus 5.5 / Haiku 5.5 无法从材料确认；环境变量含 EXPERIMENTAL，可能随时改名或移除。本手册只把它列为实验性候选，先做 30 分钟基线与开关后对照，再决定是否记录为可选实验配置。
- 做法 T 依据调研《feder-cr/git-ai》。可核对：MIT 许可；fork 自 Gitaly（MIT，Copyright GitLab Inc.），上游 Gitaly RPC 全部保留，非 MIT 的 ee/ 目录未包含；版本 0.1.0，自称首个公开版本；构建依赖 Go 1.26、C 工具链、Meson、Ninja；源码里有 examples/graft/quickstart.sh 和 examples/graft/config.toml 这两个可操作入口；文档列表与文件路径在 README 中逐条列出。属于作者主张（未给数据）：传统 Git 托管对 agent 是瓶颈的论证（全量 clone、merge queue、客户端遍历历史）没有附带任何测量；自述有 unit、端到端、多节点、crash、fuzz 测试覆盖，未给覆盖率或测试数量；banner 图注里出现「50 agents on one branch retry and fail with push, rebase, retry」「100 against 200 changes landed」是配图说明，不是可核验的基准结果。明确的局限：接口在 1.0 前可能变动；已知缺口写在 LIMITATIONS.md（README 举例提到存储核心中 pack 的垃圾回收）；构建要编译内置 Git，依赖较重；README 未给出与传统 Git / 其他方案的对比数字。适用条件：适合同时运行大量编码智能体、且愿意自托管一套服务端（数据库 + 对象存储）的团队；对只跑一两个 agent 的个人或小团队，为换取秒级并发落库而引入这套基础设施的收益未经验证。
- 做法 U 依据调研《@thedelost: 这是绝对他妈的绝妙》。可核对：唯一给出的操作是启动命令 claude --worktree，以及社交指标 101 赞 / 15 转发 / 8 回复。属于作者主张、无佐证：「让三个代理可以同时编辑同一个代码库而不会冲突」「工作树不再是它们争夺的对象，因为它们完全不被允许触碰它」；其中「三个代理」是举例，不是实测结论。二手转述：作者称方法来自 Anthropic 的分享，但未给出出处，本手册无法核对；命令在当前版本是否存在也未经核实。适用条件：必须处在 git 仓库中；只在多代理并行编辑时才有意义，单代理串行场景收益不明；原文未涉及合并成本，存在把冲突从「编辑时」推迟到「合并时」的可能。本手册只把它列为待自测候选，先自测再决定是否写进流程；版本要求、副本位置、合并回主线与清理方式，材料里都没有，不补写。

## 依据的调研

- [Jakeschincariol/arena-skill](../research/radar/2026-10-01/13-jakeschincariol-arena-skill.md)：值得一试，先按 README 的安装方式之一装进 Claude Code，用 `/arena --quick`（16 个 agent）对你手头一两道确实不满意的真实任务跑一遍，并把被拒的旧答案作为 baseline 做盲评对比，确认输出确实更好再考虑加大 agent 数；步骤、参数、成本表和自测方式都写得可直接照做，但“更强答案”目前只是作者主张且 token 开销很大。
- [matank001/clodfarm](../research/radar/2026-10-01/14-matank001-clodfarm.md)：值得一试，可以小范围试：clodfarm 给出了一套可照做的 Claude Code 多子代理编排方案——子代理各占一个 git worktree/分支、测试通过才合入 main、按账户真实 5 小时与周用量节流并留 20% 余量；先用单机 + 小仓库 + 已有测试命令验证 1–2 个编码任务再决定是否铺开。
- [mvschwarz/openrig](../research/radar/2026-10-02/67-mvschwarz-openrig.md)：值得一试，建议在单独的实验仓库里小范围试：按 README 的引导路径安装 OpenRig，用两座位 starter（复用已有 Claude Code 或 Codex 账号）跑一个「实现 + 独立复核」的有界任务，看是否真的减少了手动切换终端和人工传话的成本。理由是原文给出了从安装、启动、就绪检查、下发任务到权限与回滚的完整可复制命令，具备照做的条件；但工具仍处早期版本、会改写 provider 信任与 hook 配置、不支持 Windows，且没有任何量化效果数据，因此不宜直接写成手册主推做法。
- [code-yeongyu/oh-my-openagent](../research/radar/2026-10-01/508-code-yeongyu-oh-my-openagent.md)：值得一试，建议在一个可弃用的环境里小范围试用 OmO：按 README 的一行命令安装，用同一个真实小任务分别跑普通 prompt、加 `ulw`、加 `mass ulw`，对比返工次数与人工介入次数。理由是可照做的安装与关键字工作流已经给出（`omo`、`ulw`、`mass ulw`、`omo setup/doctor`、两份 `omo.jsonc` 配置），但全部效果说明都只有作者主张和用户好评，没有可核对的指标。
- [bytedance/deer-flow](../research/radar/2026-10-01/544-bytedance-deer-flow.md)：值得一试，可以按官方 Quick Start 在本地或小团队环境跑通 DeerFlow 2.0（clone → make setup → make doctor → make docker-start），把它作为长时程子代理＋沙箱＋记忆的执行底座试点；理由是原文给出了可直接复制的安装、模型接入、部署选型和安全配置步骤，但 skills、sub-agents、scheduled tasks 等核心能力的用法在抓到的原文里只剩目录标题，需进一步查阅仓库文档才能照做。
- [crewAIInc/crewAI](../research/radar/2026-10-02/549-crewaiinc-crewai.md)：值得一试，建议小范围试：照着 README 的 "uv 安装 → crewai create crew → 改 agents/*.jsonc 与 crew.jsonc → crewai install/run" 链路，先把手头一个"多步资料整理→成文"的工作改成 researcher + reporting_analyst 两个角色的 Crew，并把产物落盘到 output/ 文件；因为原文给出了完整可复制的命令、目录结构和配置示例，可照做，但它本质是需要写代码、配环境的开发框架，效果只有作者主张、没有对比数据，先试一步再决定是否推广。
- [leonvanzyl/cubefarm](../research/radar/2026-10-02/725-leonvanzyl-cubefarm.md)：值得一试，用 npx cubefarm 在低风险仓库上小范围试跑 issue→PR→QA→合并 这条自动链路，重点验证 QA 环节的真实拦截能力；因为它把多 agent 分工、浏览器实测和 auto-merge 门禁写成了可执行流程，但只有 README 级证据（53 stars、无基准与案例数据），不足以直接采用。
- [Show HN: Offrun – manage every coding agent from one workspace](../research/radar/2026-10-04/1066-show-hn-offrun-manage-every-coding-agent-from-one-.md)：值得一试，先在单个有 git 的仓库上小范围试三条可迁移流程——每个 agent 一个 worktree、项目记忆落成 conventions.md/plan.md/dead-ends.md、第二个 agent 在提交前读 diff 做评审——再决定是否长期用 Offrun 本身；理由是这几条流程具体、可照做且不依赖工具存活，而 Offrun 自身的收益（限额自动切换、全 Mac 通知、免费无限）目前只有厂�自述，且限定 Apple Silicon Mac。
- [manaflow-ai/cmux](../research/radar/2026-10-08/1856-manaflow-ai-cmux.md)：值得一试，macOS 上并行跑多个终端型 coding agent 的人，可以照 README 的安装与 hooks 步骤小范围试一套「通知驱动的注意力路由」工作流：装 cmux、跑 `cmux hooks setup`、用 workspace 分屏跑 agent、靠通知环和 ⌘⇧U 跳转；理由是多 agent 并行时「哪个在等我」是可复制的痛点，而这份 README 给出了具体命令与配置键，但它只支持 macOS、性能与收益均无第三方数据，因此不宜作为通用默认方案直接采用。
- [pullboard-dev/pullboard](../research/radar/2026-10-08/2038-pullboard-dev-pullboard.md)：值得一试，建议在小范围试：先用 `pullboard tour` 看一遍闭环，再在一个真实小仓库里把「SPEC 行 → gate → 另一个智能体在同一 commit 上验证」跑通，然后决定是否固化成日常流程；理由是它把「第二个智能体验证通过才算完成」做成了可强制执行的状态机，并给出了可直接复制的命令与配置（MIT、本地运行、不调用模型），但项目很小（41 stars）、Windows 未测试、部分功能仍在 planned，适合先试验证收益。
- [SaM-runtime/claude-console](../research/radar/2026-10-09/2187-sam-runtime-claude-console.md)：值得一试，建议小范围试：先按 README 的两条命令装好插件、用 /console demo 跑通面板，再挑一两个可回滚的项目接入 registry + STATUS 卡，验证「派工 → 执行者完成 → autoSync 写回 CARD → 关卡评审」这条闭环是否真的减少了人工盯盘；理由是它给出了可直接照做的安装命令、配置键表、dispatch.json 结构、动作快捷键和状态卡格式，但仓库仅 53 stars、版本 0.15.x、强依赖特定 Claude Code 版本与自建的注册表/状态卡约定，成熟度还不够直接全量采用。
- [glmn-ai/neurosquad-cli](../research/radar/2026-10-10/2422-glmn-ai-neurosquad-cli.md)：值得一试，先在单个 git 仓库里用 npx neurosquad 跑一两个带 --worktree 的后台 agent，实测“关掉窗口后继续跑 + 状态/成本可观测 + 权限内联回答”是否成立，再决定是否纳入日常；README 给了可直接复制的安装、启动、回答与成本命令，但项目自标 0.1.0 preview、命令与配置在 1.0 前可能变化，不宜直接 adopt。
- [@yanhua1010: 总结一下，推荐收藏](../research/radar/2026-10-12/2630-item.md)：值得一试，建议在 Claude Code 里小范围试：让生成型子 Agent 只写代码、硬性禁止 Build/Test/Typecheck 并要求尽早提交返回，验证工作全部交给主 Agent 统一做；原文给出的这两条约束足够具体、可以直接照做，但原文被截断且只有作者主张、无任何数据。
- [nateherkai/roast-room](../research/radar/2026-10-13/2908-nateherkai-roast-room.md)：值得一试，可以照 README 的步骤在 Claude Code 里跑一次 `--quick` 版决策辩论，用真实但可逆的商业决策做小范围试；因为原文给了完整的安装命令、斜杠命令、输入清单和校验脚本，但没有任何关于结论质量的实测数据，且全量会议要消耗 21 次子代理调用，只适合先低成本验证。
- [josefchen/muster](../research/radar/2026-10-14/3134-josefchen-muster.md)：值得一试，建议小范围试用：在 macOS 14+ 上用 `brew install --cask josefchen/tap/muster` 装好，只对 Claude Code 开启「Answer prompts from Muster」，用「代理开始等待→人察觉→回答完成」的耗时和是否需要切换窗口来判断收益；理由是原文给出了可直接照做的安装命令、逐代理开关、Codex 信任 hook、快捷键与自测脚本，但它只覆盖 macOS 和 Claude Code/Codex/Cursor 三家，改善幅度是作者主张、没有对照数据。
- [Cleveland-RD/hivehouse](../research/radar/2026-10-14/3136-cleveland-rd-hivehouse.md)：值得一试，建议小范围试：在满足依赖的本地环境按 README 安装 hivehouse，先用默认 relay 模式对单个非关键项目运行一个任务，验证多代理编排、门禁、评审与清理流程，再考虑过夜或 delegate 模式；理由是它给出了可复制的安装、配置和权限边界步骤，但项目较新且部分工作流未在真实 Claude Code 会话验证，需控制风险。
- [@Klonzu: 天哪。5 个代理，20 秒内 4.18 美元。别再添加你无法定价的代理了。](../research/radar/2026-10-14/3143-5-20-4-18.md)：值得一试，建议在多代理、分阶段流程中尝试“进入下一阶段前运行 /cost 检查成本”的习惯；理由是原文给出了可照做的检查动作和一组成本/token 观测数据，但工具环境与完整流程不清晰，只适合小范围验证，不能直接 adopt。
- [@hwangxin: 复刻了 ](../research/radar/2026-10-15/3598-item.md)：值得一试，可以小范围试：在单个 GitHub 仓库用 Claude Code + Opus 并行跑两个可辨认的 /loop——一个按最近 3 天窗口做 issue 复现、先写会失败的测试再修，一个盯外部信号；理由是原文给出了可照做的流程骨架，但正文被截断，第三个 loop 和 /loop 的具体配置不完整，所以不宜直接 adopt。
- [@mirku21: 这是绝对他妈的黄金](../research/radar/2026-10-16/3966-item.md)：值得一试，先在一个小仓库里设置该环境变量跑一次同类任务，确认多代理并行是否真的生效、成本是否下降，再决定是否写进手册；理由是可照做的只有一行开关命令，价值可能真实但原文没有任何配置细节和效果证据。
- [feder-cr/git-ai](../research/radar/2026-10-17/4081-feder-cr-git-ai.md)：值得一试，先在临时目录跑通 `examples/graft/quickstart.sh` 验证「服务端落库 + 缓存 + 两个 agent + 一次 land」整条链路，再在非关键仓库以 shadow 模式接入数据库/对象存储做小范围试点；它把大量编码智能体并发落库、自动冲突解决、落库后验证、agent 权限这些协作痛点做成了可跑的开源实现，但仍是 0.1.0、接口可能变且有已知缺口，不宜直接上关键仓库。
- [@thedelost: 这是绝对他妈的绝妙](../research/radar/2026-10-17/4412-item.md)：值得一试，可以小范围试：在 git 仓库里用 `claude --worktree` 给每个并行代理开独立工作树，观察编辑期冲突是否消失、整体合并成本是否下降；理由是命令具体、风险低，但原文只有一句话加一个命令，副本位置、合并回主线、清理方式和版本要求都没写，必须先自测再决定是否写进手册。
