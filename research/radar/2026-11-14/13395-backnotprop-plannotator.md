# backnotprop/plannotator

- 结论：**值得一试**。先在单个仓库、单个 agent 上装 Plannotator，把“计划评审/代码评审→批注→结构化反馈回 agent”这条闭环跑通，再用评审轮次和返工次数与改造前对比；README 给了完整可照做的安装、hook、命令和配置，但只有作者自述、没有效果数据，所以先小范围试而不是直接全面采用。
- 原文：https://github.com/backnotprop/plannotator
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-14T06:54:36.565Z

## 是什么

Plannotator 是一个本地、浏览器里的「审阅界面」，专门夹在人和编码智能体之间：agent 提出计划/决策/HTML 产物或改完代码时，界面自动或手动打开，你在文档、diff 上做行内批注、评论、增删改建议，然后把反馈直接回传给 agent 作为它的下一轮输入。

README 描述的三块能力：

1. **文档/计划批注**：`/plannotator-annotate` 可批注本地 Markdown、整个目录、URL、渲染后的 HTML，以及 agent 的上一条回复（`/plannotator-last`）。
2. **代码评审**：`/plannotator-review` 评审未提交改动、GitHub PR、GitLab MR、GitButler 工作区或一个静态 diff 文件，可逐行批注、stage/unstage 文件，反馈回到 agent 会话。
3. **Inbox（异步收件箱）**：agent 把问题、文件、待审内容留在本地一个窗口里继续干活，你有空再答，回复作为该会话的下一轮输入；非插件 agent 通过 MCP 接入。

支持 Claude Code、Codex、Copilot CLI、Gemini CLI、OpenCode、Kiro、Droid、Amp、DeepSeek Harness、Pi；Inbox 还列了 Grok Bot、Muse、Hermes、OpenClaw 等个人助理。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：有浏览器；已装好至少一个受支持的编码 agent；macOS/Linux/WSL 或 Windows（Windows 上 Codex 的 hook 属实验性，安装器会打印手动步骤）；Claude Code 走插件需 2.1.287 以上才有“不阻塞会话”的模式。

1. **装二进制 + 自动配置各 agent 的 hook/skill/斜杠命令**（会联网下载二进制、解析 release、可选拉 npm 包）：
```bash
# macOS / Linux / WSL
curl -fsSL https://plannotator.ai/install.sh | bash
```
```powershell
# Windows PowerShell
irm https://plannotator.ai/install.ps1 | iex
```

2. **只想先拿一个二进制、不改任何 agent 配置**（装到 `~/.local/bin`）：
```bash
curl -fsSL https://plannotator.ai/install.sh | bash -s -- --minimal
```

3. **按你的 agent 补最后一步**（安装器会自动探测已装 agent）：
   - Claude Code：`/plugin marketplace add backnotprop/plannotator`，再 `/plugin install plannotator@plannotator`，重启 Claude Code。
   - Codex：无需操作，计划评审通过其实验性 `Stop` hook 自动启用；已有 `$plannotator-review`、`$plannotator-annotate`、`$plannotator-last` skills。Codex 上斜杠命令要换成 `!plannotator …` 形式。
   - OpenCode：在 `opencode.json` 加 `"plugin": ["@plannotator/opencode@latest"]`，重启。
   - Pi：`pi install npm:@plannotator/pi-extension`，用 `--plan` 启动或 `/plannotator-plan-mode` 切换（不需要装 CLI）。
   - Copilot CLI：`/plugin marketplace add backnotprop/plannotator`，再 `/plugin install plannotator-copilot@plannotator`，重启，计划模式下 `Shift+Tab` 触发。
   - Amp：把 `plannotator.ts` 复制进 `~/.config/amp/plugins/`，`plugins: reload`。
   - Droid：`droid plugin marketplace add https://github.com/backnotprop/plannotator`，再 `droid plugin install plannotator@plannotator`（只有命令，暂无计划拦截）。
   - DeepSeek Harness：`dsh plugin --profile <profile> add @plannotator/dsh`。
   - Gemini CLI / Kiro CLI：无需操作，hook/策略/斜杠命令或 skills 自动配好（Gemini 需 0.36.0+）。

4. **不用插件系统时，手写 Claude Code hook**（写入 `~/.claude/settings.json`，这是让“计划一出现就弹评审”的关键配置）：
```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "plannotator",
            "timeout": 345600
          }
        ]
      }
    ]
  }
}
```

5. **五分钟自检这三条命令**（确认批注→回传通路是通的）：
```
/plannotator-last                   # 批注 agent 的上一条回复
/plannotator-review                 # 按 PR 方式评审当前 diff
/plannotator-annotate report.html   # 批注任意文件、目录或 URL
```
其他批注姿势：
```
/plannotator-annotate README.md                  # 本地 markdown
/plannotator-annotate src/                       # 浏览并批注目录内文件
/plannotator-annotate https://docs.rs/…          # 抓取并批注任意 URL
/plannotator-annotate report.html --render-html  # 按原样渲染 HTML，而非转换
```

6. **把计划评审变成默认动作**：不需要任何命令。计划模式已通过各 harness 的 hook 接好，agent 每次产出计划，Markdown 评审界面自动打开。机制是：`Agent calls ExitPlanMode` → `PermissionRequest` hook 触发 → 本地服务从 hook 输入读计划 → 浏览器打开评审 UI → 你批注并 approve/deny → **approve 则 agent 继续；deny 则把结构化反馈发回 agent** → agent 修改，**计划 diff 显示改了什么**。这条“deny 必写结构化反馈 + 看 diff”的循环是整份材料里最可复用的做法。

7. **代码评审的几种入口**：
```
/plannotator-review                    # 评审未提交改动
/plannotator-review <github-pr-url>    # 评审 GitHub PR
/plannotator-review <gitlab-mr-url>    # 评审 GitLab MR
plannotator review --gitbutler         # 评审进行中的 GitButler 工作区
plannotator review --patch-file reading.diff # 评审静态 diff 文件
```
流程：`git diff` 取改动（或按 URL 拉 PR）→ 浏览器打开 diff 视图 → 逐行批注、stage/unstage → 发送反馈回 agent 会话 → 认可则发 “LGTM”。

8. **异步收件箱**（多 agent 并行时用它收口，避免每个会话都把你按住）：
```
plannotator inbox
```
Claude Code / Pi / OpenCode 通过插件接入，回复直接成为其下一轮 turn；其他 agent 走 MCP：
```
plannotator inbox mcp
plannotator inbox --help
```

9. **远程 / SSH / devcontainer**（前提：能转发端口；注意远程模式**监听 0.0.0.0 且无登录**，只对可信网络开放）：
```bash
export PLANNOTATOR_REMOTE=1
export PLANNOTATOR_PORT=9999  # forward this port
```
```
Host your-server
    LocalForward 19432 localhost:19432
```

10. **按需收敛网络与隐私**（默认无遥测，计划/diff/批注/历史/配置本地存放；但每次界面加载会向 GitHub 查最新版本，且**没有开关**；本地 Git 评审会 `git ls-remote` 查默认分支）：
```bash
plannotator review --no-git-remote-check
export PLANNOTATOR_GIT_REMOTE_CHECK=0
export PLANNOTATOR_SHARE=disabled
```
```json
// ~/.plannotator/config.json
{ "gitRemoteCheck": false }
```
分享大文件时才出网：AES-256-GCM 加密后上传，密钥放 URL fragment，托管粘贴 7 天过期。

11. **回看与复盘**（把评审记录当资产，而不是一次性对话）：
```
plannotator sessions                   # 列出活跃会话
plannotator sessions --open 1          # 在浏览器重开某次会话
plannotator archive                    # 只读浏览历史计划决策
```

12. **不用了怎么撤**（默认保留本地计划、历史、草稿）：
```bash
plannotator uninstall
plannotator uninstall --purge   # 彻底删除，需手输 purge
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：README 把“值得交给 AI 之前先让人批注”的载体扩到了计划/spec/Markdown/HTML 产物/agent 上一条消息/PR diff，而不只是代码；还提到可在评审界面里直接 “Ask AI” 提问，或让 AI review agent 把评论贴到 diff 上。这提示一类此前常被忽略的活：**让 AI 先产出候选计划或产物，人只做批注式决策**。
- **任务匹配**：计划评审、代码/PR 评审、文档与 HTML 产物批注、多 agent 并行时的问答收口（Inbox），各自对应不同入口和命令；不同 harness 的接入方式不同（有的自动 hook，有的要装插件，有的只有命令、暂无计划拦截），选型时要按 agent 对号入座。Claude Code 2.1.287+ 支持“不阻塞会话”模式，旧流程可用 `PLANNOTATOR_CLAUDE_MOD=0` 回退——同一工作流在阻塞/非阻塞两种协作方式间可切换。
- **条件供给**：需要给的三样东西很明确——① **权限/接线**：PermissionRequest hook 或插件，否则计划不会自动弹出；② **反馈通道**：批注必须能结构化回传到发起会话（deny 反馈、Inbox 回复成为下一轮 turn、MCP 接入）；③ **环境**：浏览器、本地数据目录 `~/.plannotator`（可用 `PLANNOTATOR_DATA_DIR` 改）、远程时端口转发。README 未提供提示词模板，反馈质量靠你写的批注本身。
- **主动推进**：**事件触发**是核心——agent 调 `ExitPlanMode` 即触发评审 UI，无需你记得去检查；Inbox 让 agent 把问题挂起后继续干活，回复晚到也不丢（“Nothing holds an agent session open while you do”），属于状态触发式的异步协作。README 未描述定时/轮询类触发。
- **效果验证**：工具自带两个可观测点——deny 后 **计划 diff 显示改了什么**；`plannotator archive` 只读回看历史计划决策。但 README 没有给出任何“效果变好”的度量或数据。

## 与已有做法的关系

- **Claude Code（adopt）**：Plannotator 以插件形式接入（`/plugin marketplace add …`），并给出不用插件时的手写 hook JSON；是这个工作流最主要的落地宿主。
- **Herdr（try）**：README 明确其终端版 Herdr Annotate 就是“把 Plannotator 式评审搬进终端”，`herdr plugin install plannotator/herdr-annotate`，批注存在 Plannotator 数据目录，可与 App 评审累积；也可单独用 `brew install plannotator/tap/plannotator-tui`。
- **Jina Reader（try）**：URL 批注默认走 Jina Reader，可用 `PLANNOTATOR_JINA=0` 关掉、`JINA_API_KEY` 提高限额——这是 Jina 在“读网页再批注”场景里的一个具体用法。
- **OpenCode（watch）/ DeepSeek Harness（watch）**：分别有插件与 `@plannotator/dsh` 接入，说明这两个 harness 已有可用的人机评审回路，但材料没给出它们的成熟度证据。
- **Hermes、OpenClaw（watch）**：README 只把它们列进 Inbox 可接入的“个人助理”名单，无实现细节，不改变其 watch 状态。
- **DeepSeek（try）**：仅在支持列表中以 DeepSeek Harness 形式出现，未见模型层结论。
- **Obsidian（drop）**：README 有 Obsidian 集成（批准的计划自动存进 vault，带 YAML frontmatter、按标题打 tag、反链），但这只是导出落点，不构成把 Obsidian 拉回清单的理由。

## 证据与局限

- **给出的数据**：只有仓库热度（10,559 stars，当日 +108），以及安装器/CLI/环境变量/命令的逐条说明；**没有任何效果数据**（没有评审提速百分比、缺陷拦截率、返工次数对比、用户研究）。
- **可核验的事实性内容**：命令、配置字段、hook 事件名、网络行为边界（无遥测、加载时查 GitHub release 且不可关、`git ls-remote` 可关、远程模式 0.0.0.0 无鉴权）、卸载与 `--purge` 的保留/删除规则、发布侧 SHA256 + SLSA provenance（v0.17.2 起）+ CycloneDX SBOM 及校验命令。这些是能照着做或照着查的部分。
- **只是作者主张**：Inbox 是“多 agent 工作缺失的评审层”、批注能让你“stay in the loop”、批注反馈会被 agent 有效执行——都是产品定位陈述，无对照实验。
- **适用条件**：① 你的 agent 在支持列表内，且愿意装 hook/插件（否则只剩手动命令）；② 工作流本来就是“agent 先出计划、人再批”的模式，Plannotator 才有插入点；③ 需要浏览器（纯终端场景要用 Herdr Annotate / TUI 变体）；④ 远程/容器下要接受端口与无鉴权的暴露风险；⑤ 团队共享方向已转向托管 Workspaces（waitlist），开源异步链接分享在 README 里被标为“deprecated 支持、未公布移除日期”，不要把团队协作方案压在链接分享上。
- **材料局限**：正文在 `PLANNOTATOR_DATA_DIR` 示例处被截断，其后的文档内容缺失，本报告只能依据已抓到的 README 部分。

## 怎么试、怎么验证

**最小试用（约半天）**：在一个真实仓库、一个 agent 上做，不要铺开。

1. 用 `--minimal` 或按第 1/3 步装好，跑通第 5 步三条命令，确认批注能回到 agent。
2. 选一个中等复杂度的任务，强制走“计划先评审”：看到自动弹出的计划后，**至少写 3 条具体批注再 deny**，观察 agent 修改后的计划 diff 是否回应了这 3 条。
3. 同一任务收尾时用 `/plannotator-review` 做一次 diff 评审，逐行批注后发回，看 agent 是否按批注改。
4. 多 agent 并行时试一次 `plannotator inbox`，确认回复能作为发起会话的下一轮输入。

**建议记录的指标（自己前后对比，不用外部基准）**：

- **计划返工轮次**：从首次出计划到 approve 之间，agent 修改了几轮；对比改造前同仓库同类任务（可从历史对话/提交回溯）。
- **批注采纳率**：发出的批注条数中，被后续 diff/计划实际改到的比例——这是判断“反馈是否被吃进去”最直接的一条。
- **合并前发现问题数**：同一仓库改造前后各取若干次改动，统计代码评审阶段（而非上线后）发现的问题数。
- **人工等待/切换成本**：你从 agent 提交计划到给出决策的时间，以及评审期间 agent 是否被迫空转（Claude Code 2.1.287+ 的非阻塞模式应显著降低这一项）。
- **中断次数**：多 agent 并行时，每小时被打断的次数（用 Inbox 前后对比）。

**判停条件**：若两三次任务后“批注采纳率”长期很低（agent 不按批注改），说明问题在反馈形态或 agent 能力而非界面，应退回在会话里直接写指令，或改用 `/plannotator-last` 对单条回复做最小批注，而不是继续加装集成。
