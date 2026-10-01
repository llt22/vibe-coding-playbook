# 让多个子代理竞争并过验证闸门：AI 交付前的质量升级流程

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：当单个 AI 回答或单条串行 agent 会话给出的结果你没法验证时，如何把同一任务交给多个子代理用不同策略竞争、对抗、盲评，并让代码类成果必须通过你自己的测试才能真正落地。
> 先试这一步：挑一个你确实不满意的真实任务（最好一个写文案类、一个代码类），装好 arena-skill 后把被你拒掉的旧答案用 --baseline-file 传进去，跑 `/arena --quick --seed 7 <把任务写具体>`，用它与旧答案的盲评比分判断值不值得继续。
> 最近修订：2026-10-02

## 解决什么问题

单个 AI 回答、单条串行的 agent 会话，交付的往往是你没有验证过的结果：看起来合理，但可能漏了你真正在意的约束。这篇手册把「不满意就重问一次」升级成一套可执行的流程——把同一个任务交给多个子代理用不同策略并行求解、互相对抗、由独立裁判按公开标准打分淘汰；代码类任务则必须通过你自己的验证命令才能合入。同时给出成本预估、可观察指标，以及「什么时候不值得这么做」的判断线。

## 适用与不适用

**适用**

- 你对某个 AI 回答确实不满意，且这个任务值得为此多花 token。
- 可拆分、且能被测试验证的编码任务：每支子代理跑在自己的 git worktree/分支上，测试过了才合入 main。
- 你同时使用多套编码 harness（如 Claude Code 与 Codex），需要座位、拓扑、快照恢复层面的统一管理。
- 想在同一个会话内给难任务「升档」，用一个显式动作决定何时上多 agent、上贵模型。
- 想自建长时程子代理 + 沙箱 + 记忆的执行底座。

**不适用**

- 任务描述本身就含糊：arena README 明确说「Vague task in, 100 flavours of vague out」，含糊任务上锦标赛只会得到 100 种含糊。
- 编码任务没有可执行的验证命令：不设 `FARM_VERIFY_CMD` 就等于没有质量门。
- 只想「多问几次」、不愿承担 token 成本：开销随 agent 数和任务体量线性增长。
- 原生 Windows：openrig 仅支持 macOS / Linux，WSL2 未测试。
- 非编码场景：OmO 的「做 deck、跨源研究」等只有一句话主张，没有可核对的案例。

## 前置条件

- 共同前提：把任务写成独立、自包含的文件。子代理看不到你的聊天记录，任务文件是它唯一的信息源。
- 做法 A（arena-skill）：Claude Code（需要 spawn 子 agent）+ Python 3.8 以上；`bracket.py` 只用标准库，不需要 pip 安装。
- 做法 B（clodfarm）：一台装了 Docker 的机器；一个 Claude 订阅账号或 API key；一个你愿意让它改的 git 仓库（建议先小仓库）；一条验证命令。
- 做法 C（openrig）：Node.js 22 或 24 + tmux，仅 macOS / Linux；启动会写入 provider hooks 和 workspace trust 设置，动手前先备份相关文件。
- 做法 D（oh-my-openagent）：一台可弃用的机器或容器（安装脚本是 `curl | bash`）；一个自己的小项目目录；至少一家模型订阅或 API key。
- 做法 E（deer-flow）：git、Docker Desktop/Engine、Docker Compose v2.24+（用 `docker compose version` 自检）；仓库自身要求 Python 3.12+ / Node.js 22+。

## 操作步骤

先按你的处境选路径：

| 你的处境 | 用哪条路径 |
|---|---|
| 只有一个被你拒掉的回答，想确认多策略竞争是否真的更好 | 做法 A |
| 可拆分、有测试的编码任务，想并行落地 | 做法 B |
| 同时跑 Claude Code + Codex 等多套 harness，要座位与恢复 | 做法 C |
| 只想在同一会话里给难任务升档 | 做法 D（先做对照实验） |
| 想自建长时程子代理 + 沙箱 + 记忆的底座 | 做法 E |

### 做法 A：把不满意的回答送进锦标赛（arena-skill）

1. 安装，三选一。

直接把下面内容粘给 Claude：

```
https://github.com/Jakeschincariol/arena-skill

Install this skill, then confirm /arena works.
```

或手动复制到全局 skill 目录：

```bash
git clone https://github.com/Jakeschincariol/arena-skill.git
cp -r arena-skill/skills/arena ~/.claude/skills/
```

或作为插件安装：

```
/plugin marketplace add Jakeschincariol/arena-skill
/plugin install arena-skill@arena-skill
```

预期结果：`/arena` 可用。注意以插件方式装会被命名空间化，命令变成 `/arena-skill:arena`；想只作用于某个仓库，把同一个 `skills/arena` 文件夹复制到该仓库的 `.claude/skills/` 下。

2. 运行前把权限切到 accept-edits（Shift+Tab）。否则每个子 agent 往 `.arena/` 写文件都会弹一次授权。

3. 先算成本再决定规模，`plan` 只打印、不写文件：

```bash
python3 skills/arena/bracket.py plan --agents 100
```

已知的赛程与开销（来自仓库）：100 个 agent = 7 轮 / 595 次子代理调用 / 70 个 wave；64 = 6 轮 / 379 / 49；32 = 5 轮 / 187 / 28；16（`--quick`）= 4 轮 / 91 / 16；8 = 3 轮 / 43 / 10。若带了要击败的旧答案，再加 1 次调用。作者建议：日常用 `--quick` 或 `--agents 16`，真重要的答案才上 100。

4. 把任务写具体，并检查任务文件。`.arena/<run>/task.md` 是这 100 个 agent 唯一知道的东西；任何要求没写进去，它们都会漏。

5. 跑最小完整形态，并把被拒的旧答案作为 baseline 传进去：

```
/arena --quick --seed 7 <把任务写具体>
```

常用变体：

```
/arena
/arena --quick write the headline for our pricing page
/arena --agents 32 fix the flaky test in tests/test_api.py
/arena --seed 7 plan my launch week, I have 6 hours a day
```

参数：`--agents N`（默认 100）、`--quick`（16 个，日常档）、`--seed S`（同 seed 给同样的卡和同样的赛程，默认随机但会记录）、`--wave W`（每波子 agent 数，默认 10，只有在调高了 Claude Code 并发上限时才需要加大）。预期结果：返回唯一幸存的那份答案，以及它扛过的攻击、它的策略卡和轮数。

6. 需要在锦标赛中途手工操作时，用 `bracket.py` 命令行（整个赛事状态存在一个 JSON 文件里）：

```bash
python3 bracket.py plan --agents 100
python3 bracket.py init --agents 100 --seed 7 --task-file task.md [--baseline-file old.md]
python3 bracket.py next
python3 bracket.py prompts attack
python3 bracket.py pairings
python3 bracket.py collect
python3 bracket.py record r3-m07 a042 --reason "..."
python3 bracket.py advance
python3 bracket.py status
python3 bracket.py winner
```

预期结果：主会话只跑循环、不读那几百份方案文件，上下文保持很轻；如果对话中途被压缩，用 `bracket.py next` 从 JSON 状态文件接着跑。

7. 验证工具本身：

```bash
python3 -m unittest discover -s tests -v
```

测试会用随机胜者跑完整 100 个 agent 的锦标赛，并检查最终恰好剩 1 个幸存者，还包括 16、7、1 个 agent 的情形、发牌保证，以及从 spawn 到终检的每个阶段。

8. 想改规则就改这三个文件：`skills/arena/strategies.json`（15 推理模式 × 12 工作流 × 12 策略，可自由编辑）、`skills/arena/rubric.md`（judge 的评分标准）、`skills/arena/SKILL.md`（编排步骤和每个子 agent 收到的确切 brief）。默认 rubric 权重：correctness 30、completeness against the task 25、robustness to the attacks raised 20、specificity 15、clarity 10。judge 看不到策略卡；总分高者晋级，且带「已核实致命缺陷」的方案不能赢过没有致命缺陷的方案。

### 做法 B：并行子代理 + 测试合入闸门（clodfarm）

1. 一行安装并启动（默认单容器、无数据库、无配置）：

```bash
curl -fsSL https://raw.githubusercontent.com/matank001/clodfarm/main/scripts/install.sh | sh
```

启动后打开登录流程：出现一个 URL，在任意设备上批准后把 code 粘回。UI 在 `http://localhost:8080`。

2. （替代方式）裸 Docker 启动：

```bash
docker run -d --name clodfarm --restart unless-stopped \
  -v clodfarm_claude-home:/home/farm/.claude -v clodfarm_workspace:/workspace \
  ghcr.io/matank001/clodfarm
docker exec -it clodfarm clodfarm login
```

或 clone 仓库后 `docker compose up -d`（`.env` 可选，从 `.env.example` 复制）。状态存在 workspace 卷里的 SQLite 文件。

3. 登录 Claude 账号，按场景选一种：A. `clodfarm login`（URL + 粘 code，服务器默认方式）；B. `claude setup-token` 得到 token，在 `.env` 设 `CLAUDE_CODE_OAUTH_TOKEN=...`（适合 headless worker / CI）；C. 挂载已有的 Linux `~/.claude`（macOS 存在 Keychain，不能用 C）；D. `ANTHROPIC_API_KEY` + `FARM_DAILY_BUDGET_USD`（团队、按 token 付费）。

4. 把它接到真实仓库并设验证闸门——这一步是整套流程的关键，不设就等于没有质量门：

```bash
FARM_REPO_URL=<你的仓库地址>
FARM_VERIFY_CMD="pytest -q"
```

预期结果：farm 克隆该仓库，每个子代理的成果只有在你的测试通过时才落到 `main`；失败输出会回注给该子代理续跑。

5. 派任务（命令行与 agent 内部用的是同一个命令）：

```bash
docker exec clodfarm clodfarm spawn "Add CSV export" --prompt "Add CSV export to the report page, with tests."
docker exec clodfarm clodfarm status
```

`--on NAME` 可把子代理钉在指定 Claude 的账户上；不指定时由 budget governor 决定谁能跑。

6. 从手机下指令：Claude app → Code → `[clodfarm] clodfarm`，直接说 "add CSV export to the report page"、"have gil's Claude review it"、"every morning at 9, triage new issues"。

7. 从笔记本上的 Claude Code 接进来（远程 MCP，OAuth 2.1 + PKCE）：

```bash
claude mcp add --transport http --scope user farm http://localhost:8080/mcp
```

然后在 Claude Code 里跑 `/mcp` 登录，就能问 "what's the farm doing?"；断开用 `clodfarm disconnect`。

8. 定时任务（cron / 固定间隔 / 一次性；每个 box 都会检查，触发时原子领取，只跑一次）：

```bash
clodfarm schedule add TITLE (--cron ... [--tz ...] | --every 2h | --at ...)
```

还有 `list` / `remove ID`。默认时区由 `FARM_TZ` 决定（默认 UTC）。

9. 配置节流与并发（全部是环境变量，`.env.example` 有全量说明；关键几项）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `FARM_MAX_WORKERS` | `3` | 单个 Claude 同时能跑的子代理数上限 |
| `FARM_WEEKLY_TARGET` | `0.80` | 到达周窗口 80% 就停 |
| `FARM_FIVE_HOUR_CEILING` | `0.85` | 5 小时窗口最多用到 85% |
| `FARM_USAGE_REFRESH` | `300` | 空闲 Claude 每隔这么多秒重新测一次用量（0 = 只按运行中测） |
| `FARM_DAILY_BUDGET_USD` | `0` | API key 模式下的每日上限（0 = 不限） |
| `FARM_MODEL` / `FARM_EFFORT` | `opus` / 默认 | 所有 agent 的模型与 effort |
| `FARM_CLAUDE_UPDATE` | `3600` | 每隔这么久把 Claude Code 升到最新版（0 = 从不） |
| `FARM_REPO_URL` / `FARM_VERIFY_CMD` | 空 | 工作仓库 / 落地前必须通过的检查 |

10. 需要多机 / 多 seat 时，让多台机器共用一个 farm：需要真实 DynamoDB 表 + 所有 box 都能 push 的共享仓库。

```bash
deploy/aws/deploy.sh up --workspace-repo git@github.com:you/repo.git && deploy/aws/deploy.sh login
STACK=farm-2 deploy/aws/deploy.sh up --table clodfarm --workspace-repo git@github.com:you/repo.git
clodfarm budget
```

预期结果：`clodfarm budget` 显示每个 seat 的用量条、它的机器、现在允许跑什么。

11. 观测与运维：`clodfarm status`（有哪些 Claude、预算、在跑的子代理）、`clodfarm agents`（每个 Claude 的用量百分比）、`clodfarm budget [--refresh]`、`clodfarm events [-f]`、`clodfarm pause [reason]` / `resume`、`clodfarm login / whoami / doctor`；所有命令都支持 `--json`。

### 做法 C：多 harness、多座位的统一编排与恢复（openrig）

1. 先备份并检查前置条件（原文要求先读「What OpenRig changes on your machine」一节并备份相关文件）：

```bash
tmux -V
claude --version && claude auth status
codex --version && codex login status
```

只检查你实际会用的那一家；需要时先 `claude auth login` 或 `codex login` 登录一次；不要安装或登录用不到的 provider。

2. 安装 CLI 并预览 setup：

```bash
npm install -g @openrig/cli
rig setup --dry-run
```

用 Bun 的话 `bun add -g @openrig/cli`，但仍需另装 Node.js 22（OpenRig 仍跑在 Node 上）。`rig setup --dry-run` 只预览 setup 计划，不会应用。

3. 选 starter（复用你已有的工作账号，不需要再买第二份订阅）：

| Team | Starter | Models |
| --- | --- | --- |
| Two Codex agents | `first-project` | Both `gpt-6-astra` (unchanged) |
| Two Claude agents | `first-project-claude` | Configured native Claude default |
| Claude owner + Codex checker | `first-project-mixed` | Claude default + `gpt-6-astra` |

三套用同样的 owner/checker 角色和任务；启动前应显示所选 runtime、配置的模型和命令，并确认账号支持该模型。

4. 一次性权限选择：启动前 agent 会问一次是否允许它无重复授权地运行 OpenRig 命令（Yes — recommended / No — keep prompts）。原文明确：这不是全局 YOLO，也不是允许 agent 自己发明工作；作用域默认是 personal project scope。撤销方式是对 agent 说："Undo the OpenRig command allowances added by this setup"。

5. 在一个仓库里启动两座位 starter：

```bash
cd /path/to/your/repository
starter=first-project  # or first-project-claude or first-project-mixed
rig specs preview "$starter" --kind rig
rig up "$starter" --cwd . --plan
rig up "$starter" --cwd .
rig tui --shared
```

`rig tui --shared` 打开共享看板；不停止看板而脱离，按 `Ctrl-b` 再按 `d`，回来仍用 `rig tui --shared`。关掉查看终端不等于要重启团队。

6. 下发任务前先做就绪检查：

```bash
rig ps --nodes --rig "$starter"
```

在分派工作前解决任何认证、信任或权限提示。

7. 给 owner 一个有界结果：

```bash
rig send "dev-owner@$starter" 'Implement <one useful change>. Track the task in the queue and return its ID. Keep it local, verify the behavior, ask dev-check in this rig to check the exact candidate, and record the result and how I can try it.'
rig queue list --destination "dev-owner@$starter" --limit 1000
```

关键提醒：发送消息本身不会创建队列项，是 owner 记录任务。然后读最终产物和针对「确切候选」的复核，再回到同一个 owner 做下一处改动。

8. 需要时再动这些开关：权限模式 `rig policy permissions list|show|current|apply`、`rig seat set-permissions <seat> --mode <mode> --reason <text>`（模式可为 `floor`、`full_bypass`、`inherit`）；保护手打座位 `rig seat set-typing-guard <seat> --enabled true --reason <text>`；更大 starter `rig up product-team`、`rig up conveyor`；运行中演进与恢复 `rig down --snapshot` + `rig up <name>`；诊断 `rig setup --full`、`rig doctor`（都支持 `--json`）。

### 做法 D：在同一编码 agent 内用关键字升档（oh-my-openagent）

把这条路径当作待验证的候选，而不是已验证的升级。

1. 安装（macOS / Linux）：

```bash
curl -fsSL https://get.omo.dev/install.sh | bash
omo
```

预期结果：原生 `omo` 二进制装到 `~/.local/bin`，用发布校验和校验，镜像不通时回落到 GitHub Releases。

2. Windows（PowerShell）：

```powershell
irm https://get.omo.dev/install.ps1 | iex
```

3. 或改用包管理器（包名是 `omo-ai`，npm 上那个无关的 `omo` 包是别人的）：

```bash
bun add -g omo-ai
# 或
npm i -g omo-ai
```

4. 进入项目目录运行，用自然语言描述任务：

```bash
cd /path/to/your/project
omo
```

5. 难任务加关键字：在 prompt 里加 `ultrawork`（或 `ulw`）。它承诺的行为序列是：先读代码库 → 计划 → 每步自证后再前进 → 在真实界面上检查结果 → 完成后停止。把这条当可验证的清单，而不是保证。

6. 需要多智能体协作时用 `mass ulw`（关键字和你的任务描述一起给）。注意：README 没有给出这张 agent 图如何定义、如何看图的配置写法。

7. 登录模型订阅：`/login`。从 OpenCode 版或 LazyCodex 迁移先跑：

```bash
omo setup
omo doctor
```

8. 配置：个人级 `~/.omo/omo.jsonc`，项目级 `<project>/.omo/omo.jsonc`，就近的文件优先；键值说明在 `docs/reference/configuration.md`（本次材料未给出，需自己去仓库或文档站取）。

9. 更新与卸载：二进制装法重跑安装命令即更新；包管理器装法 `omo update`；卸载 `rm ~/.local/bin/omo` + `bun remove -g omo-ai`（或 `npm uninstall -g omo-ai`）。

### 做法 E：搭长时程子代理底座（deer-flow）

先说清限制：本次抓到的原文在 "Option 2: Local Development" 的 "Prerequisit" 处被截断，skills、sub-agents、scheduled tasks、memory 等小节只有标题、没有正文。下面只写能照做的安装与配置部分。

1. 最快路径：把下面这句话原样交给编码助手：

```text
Help me clone DeerFlow if needed, then bootstrap it for local development by following https://raw.githubusercontent.com/bytedance/deer-flow/main/Install.md
```

预期行为：让它按需 clone 仓库、在可用时选 Docker，并在最后停下来给出准确的下一步命令和用户仍需提供的缺失配置。

2. 手动路径（前提：本机有 git、Docker Desktop/Engine、Docker Compose v2.24+）：

```bash
git clone https://github.com/bytedance/deer-flow.git
cd deer-flow
make setup
make doctor
```

`make setup` 是交互式向导（原文称约 2 分钟），引导选择 LLM provider、可选的 web search、以及执行/安全偏好（sandbox 模式、bash 访问、文件写入工具），生成最小 `config.yaml` 并把密钥写入 `.env`。`make doctor` 验证环境并给出可执行的修复提示。

3. 模型接入（写进 `config.yaml` 或 `.env`）：官方推荐 Doubao-Seed-2.0-Code、DeepSeek v3.2、Kimi 2.5。通用 OpenAI 兼容配置示例：

```yaml
models:
  - name: gpt-4o
    display_name: GPT-4o
    use: langchain_openai:ChatOpenAI
    model: gpt-4o
    api_key: $OPENAI_API_KEY
```

也可以复用已有编码 agent 的凭证：Codex CLI 读 `~/.codex/auth.json`；Claude Code 接受 `CLAUDE_CODE_OAUTH_TOKEN`、`ANTHROPIC_AUTH_TOKEN`、`CLAUDE_CODE_CREDENTIALS_PATH` 或 `~/.claude/.credentials.json`。

4. Docker 开发模式（热重载、源码挂载）：

```bash
make docker-init    # Pull sandbox image (only once or when image updates)
make docker-start   # Start services (auto-detects sandbox mode from config.yaml)
make docker-logs    # View logs
```

5. 出问题要提 issue 时：

```bash
make support-bundle
```

预期结果：写出 `*-issue-summary.md`、`*-issue-draft.md`，并可选在 `.deer-flow/support-bundles/` 下生成证据 zip；该 bundle 只含脱敏诊断和文件清单，不含 `.env`、原始对话消息、用户文件内容。

6. 部署规格起点（来自原文）：本地评测 / `make dev` 从 4 vCPU、8 GB RAM、20 GB SSD 起，推荐 8 vCPU、16 GB；Docker 开发 / `make docker-start` 从 4 vCPU、8 GB RAM、25 GB SSD 起；长跑服务 / `make up` 从 8 vCPU、16 GB RAM、40 GB SSD 起，推荐 16 vCPU、32 GB。

### 通用收尾：不管走哪条路径

- 开始前先固定「完成」的定义（哪条测试通过、谁来复核、在哪里看结果），不要只依赖 agent 的自证。
- 代码类任务一律把测试或 lint 作为合入门槛，而不是事后补检查。
- 保留可复现的随机种子或赛程记录，便于不同规模之间做对比。

## 怎么判断变好了

**可观察的指标**

- 做法 A：最后那次与旧答案的**盲评比分**（技能会直接报，包括旧答案赢的情况）；冠军「扛过的攻击」里有多少条 FATAL / MAJOR 指向你原本没写进要求、但确实在意的缺口；你实际是否采用了它的输出（采用 / 部分采用 / 弃用）以及用了多少修改；实际 token 开销 vs `bracket.py plan --quick` 的预估（91 次调用）；代码类任务另加客观项——应用 diff 后测试 / lint 是否通过。
- 做法 B：合入 `main` 前的测试通过率；`FARM_VERIFY_CMD` 失败回注后子代理是否收敛；`clodfarm agents` / `budget` 显示的用量是否被节流在 5 小时窗口 85%、周窗口 80% 以内（不烧穿配额）。
- 做法 C：手动切换终端和人工传话的次数是否真的下降；`rig ps --nodes` 是否还有未解决的认证、信任或权限提示；恢复后逐节点报告的 resumed / fresh / failed 是否符合预期。
- 做法 D：同一任务三轮对照（普通 prompt / 加 `ulw` / 加 `mass ulw`），每轮从同一个干净分支或干净工作区开始，记录返工次数与人工介入次数。注意这三轮本身才是证据，README 的好评不是。
- 做法 E：`make doctor` 是否能无阻断跑完；能否跑通一个最小任务（受限于原文截断，skills / sub-agents / scheduled tasks 的用法需自行查仓库文档）。

**最小试用**

- 做法 A：装好后挑 1–2 个你确实问过、确实不满意的真实任务（最好一个写文案类、一个代码类），跑 `/arena --quick --seed 7 <把任务写具体>`，并用 `--baseline-file` 把被拒的旧答案传进去。16 个 agent / 4 轮 / 91 次调用，是能承受的最小完整形态。
- 做法 B：单机 + 小仓库 + 一条已有的测试命令，先验证 1–2 个编码任务，再决定是否铺开。
- 做法 C：`rig setup --dry-run` + 一个仓库里的两座位 starter，只跑一个有界的「实现 + 独立复核」任务。
- 做法 D：半天内在一台可弃用机器上跑完三轮对照。
- 做法 E：先走 `make setup` → `make doctor` → `make docker-start`，确认能起来再谈能力面。

**试多久、什么时候升级**

- 做法 A 的决策规则（来自原文）：用 `--seed` 固定复现赛程；若 `--quick` 在 3 个以上任务上稳定优于 baseline，且攻击确实命中你没考虑到的地方，再升到 `--agents 32`；若比分持平、或只是措辞更漂亮，说明这类任务不值得这份开销，退回普通的「重问一次 + 自己改」。
- 做法 B/C/D/E 都没有量化效果数据，先以一到两个任务、可弃用环境为限；只有当人工介入次数或返工次数可观察地下降，才扩大范围。

## 常见坑

**做法 A（arena-skill）**

- 任务含糊，100 个 agent 会一起含糊。
- 子代理看不到你的对话，任务文件是唯一信息源；要求没进 `task.md` 就会被漏。
- 所谓「100 个 Claude」是你当前所跑模型的 100 个子 agent，不是 100 个不同模型；差异只来自策略卡。
- 同一 seed 只保证卡和赛程相同，不保证答案相同（模型非确定性）。
- judge 也是 Claude，评分本身有偏差；rubric 可改，也意味着结果依赖你改得好不好。
- README 自己声明：「最佳答案」只意味着「赢下所有对局的答案」，不是它正确的证明。
- token 消耗随 agent 数和任务体量线性增长；技能不碰你的项目文件，但会占用大量调用。
- 并发受 `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` 限制（默认 10），调高后要用 `--wave` 匹配。

**做法 B（clodfarm）**

- 不设 `FARM_VERIFY_CMD` 等于没有质量门。
- 多机共用 farm 需要真实 DynamoDB 表 + 所有 box 都能 push 的共享仓库，不是只改 `.env` 就行。
- 默认节流已经留了余量（周 80%、5 小时 85%），把这两个值拉满会烧穿配额。

**做法 C（openrig）**

- 启动会写入 provider hooks 和 workspace trust 设置，先备份。
- 原生 Windows 不支持，WSL2 未测试。
- 权限模式的显式选择不等于原生层面真的生效；`rig seat status` 只区分「期望选择」与「上次启动参数」。默认 YOLO 关闭。
- 默认托管启动给 Claude 用 `--permission-mode acceptEdits`，给 Codex 用 `-s workspace-write`；完全绕过要显式选择。
- 0.6.0 起只支持 Node.js 22 和 24，Node 20 的安装检查会直接拒绝；跨 0.5.9 布局边界要走随包附带的 `openrig-upgrade` skill。

**做法 D（oh-my-openagent）**

- 安装脚本是 `curl | bash`，需要信任 get.omo.dev 与发布产物；只在可弃用环境试。
- README 自述个人 side project、由 AI 助手维护；许可证徽章为 SUL-1.0，团队或商业环境先读许可证原文。
- `mass ulw` 的图如何定义、如何限制并行度、如何统计花费，材料里完全没有。
- 文档（configuration.md、migrating-from-opencode.md 等）本次都没给出，能照做的只到安装与关键字这一层。

**做法 E（deer-flow）**

- 抓到的原文在 Option 2 处被截断，skills / sub-agents / scheduled tasks / memory 只有标题，不要照标题猜用法。
- Compose 低于 v2.24 无法解析 `docker/docker-compose-dev.yaml` 里的 `env_file` 语法。
- UI 里的模型连接测试会发一次短流式 tool-call 请求，可能产生 provider 费用；它不保存草稿、也不验证图片支持。
- 不受信任的任务保持 `auto_approve_permissions: false`。
- `$DEER_FLOW_HOME/managed-models/` 要备份整个目录、限制文件系统访问，并在需要共享同一 catalog 的多个 Gateway worker 间同步。

**通用**

- 别把「工具很多」当成改善证据；没有验证命令或盲评对比，只是把不确定性放大了。
- 让 agent 自己声明「完成」不算完成；先把完成定义写成可执行检查。

## 证据与来源

- **做法 A** 依据调研《Jakeschincariol/arena-skill》。可核对的内容：成本表（100/64/32/16/8 对应的轮数、子 agent 调用数、wave 数）、`bracket.py plan` 输出的赛程表（100→50→25→13→7→4→2→1，总计 595 次调用 / 70 个 wave）、2160 张卡（15 推理模式 × 12 工作流 × 12 策略）、发牌保证（无两张相同卡；至多 144 个 agent 时没有两个 agent 共享三部分中的两部分）、rubric 权重、默认并发 10、覆盖完整锦标赛的单元测试、仓库 117 stars。属于作者主张、没有数据支撑的部分：淘汰赛能产出「更强答案」、「100 versions fight to the death」的质量提升幅度，README 没有给出任何质量对比数据或案例结果。
- **做法 B** 依据调研《matank001/clodfarm》。可核对的内容：一行安装脚本、裸 Docker 与 compose 启动命令、四种登录方式、环境变量默认值（`FARM_MAX_WORKERS=3`、`FARM_WEEKLY_TARGET=0.80`、`FARM_FIVE_HOUR_CEILING=0.85`、`FARM_USAGE_REFRESH=300` 等）、多机部署与 `clodfarm budget` 的用法、apps-role 的围栏规则。原文未给出效果量化数据；「并行 + 测试闸门更高效」属于方案设计，不是实测结论。
- **做法 C** 依据调研《mvschwarz/openrig》。可核对的内容：Node.js 22/24 与 tmux 要求、仅 macOS/Linux、npm 包名 `@openrig/cli`、三套 starter 与各自模型、`rig ps` / `rig send` / `rig queue` 等命令、0.6.0 的 Node 20 迁移说明。原文明确工具仍处早期版本且没有任何量化效果数据；「减少手动切换终端和人工传话成本」是调研给出的待验证假设。
- **做法 D** 依据调研《code-yeongyu/oh-my-openagent》。可核对的内容：安装脚本与渠道参数、包名 `omo-ai`、配置路径与「就近优先」、关键字 `ultrawork` / `ulw` / `mass ulw`、`omo setup` / `omo doctor` / `omo update`、stars ≈ 69701、许可证徽章 SUL-1.0。属于作者主张的部分：「研究一万个来源」「一小时干完 Claude Code 七天的活」等，全部来自 README 自述或用户好评，没有基准、数据集或对照实验。
- **做法 E** 依据调研《bytedance/deer-flow》。可核对的内容：`make setup` / `make doctor` / `make support-bundle` / `make docker-start` 等命令、模型配置 YAML 示例、CLI 后备 provider 的凭证来源、部署规格起点表、ACP agent 配置与 `auto_approve_permissions` 规则、MIT 协议、Python 3.12+ / Node.js 22+、83290 stars。重要限制：原文在「Option 2: Local Development」的 Prerequisit 处被截断，skills、sub-agents、scheduled tasks、memory 等小节只有标题、没有正文，因此本手册只写安装与配置，不写这些能力的具体用法。

## 依据的调研

- [Jakeschincariol/arena-skill](../research/radar/2026-10-01/13-jakeschincariol-arena-skill.md)：值得一试，先按 README 的安装方式之一装进 Claude Code，用 `/arena --quick`（16 个 agent）对你手头一两道确实不满意的真实任务跑一遍，并把被拒的旧答案作为 baseline 做盲评对比，确认输出确实更好再考虑加大 agent 数；步骤、参数、成本表和自测方式都写得可直接照做，但“更强答案”目前只是作者主张且 token 开销很大。
- [matank001/clodfarm](../research/radar/2026-10-01/14-matank001-clodfarm.md)：值得一试，可以小范围试：clodfarm 给出了一套可照做的 Claude Code 多子代理编排方案——子代理各占一个 git worktree/分支、测试通过才合入 main、按账户真实 5 小时与周用量节流并留 20% 余量；先用单机 + 小仓库 + 已有测试命令验证 1–2 个编码任务再决定是否铺开。
- [mvschwarz/openrig](../research/radar/2026-10-02/67-mvschwarz-openrig.md)：值得一试，建议在单独的实验仓库里小范围试：按 README 的引导路径安装 OpenRig，用两座位 starter（复用已有 Claude Code 或 Codex 账号）跑一个「实现 + 独立复核」的有界任务，看是否真的减少了手动切换终端和人工传话的成本。理由是原文给出了从安装、启动、就绪检查、下发任务到权限与回滚的完整可复制命令，具备照做的条件；但工具仍处早期版本、会改写 provider 信任与 hook 配置、不支持 Windows，且没有任何量化效果数据，因此不宜直接写成手册主推做法。
- [code-yeongyu/oh-my-openagent](../research/radar/2026-10-01/508-code-yeongyu-oh-my-openagent.md)：值得一试，建议在一个可弃用的环境里小范围试用 OmO：按 README 的一行命令安装，用同一个真实小任务分别跑普通 prompt、加 `ulw`、加 `mass ulw`，对比返工次数与人工介入次数。理由是可照做的安装与关键字工作流已经给出（`omo`、`ulw`、`mass ulw`、`omo setup/doctor`、两份 `omo.jsonc` 配置），但全部效果说明都只有作者主张和用户好评，没有可核对的指标。
- [bytedance/deer-flow](../research/radar/2026-10-01/544-bytedance-deer-flow.md)：值得一试，可以按官方 Quick Start 在本地或小团队环境跑通 DeerFlow 2.0（clone → make setup → make doctor → make docker-start），把它作为长时程子代理＋沙箱＋记忆的执行底座试点；理由是原文给出了可直接复制的安装、模型接入、部署选型和安全配置步骤，但 skills、sub-agents、scheduled tasks 等核心能力的用法在抓到的原文里只剩目录标题，需进一步查阅仓库文档才能照做。
