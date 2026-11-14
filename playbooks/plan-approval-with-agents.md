# 把智能体的计划摊成可批注页面，批完再让它开工

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决智能体用长文本计划要人逐条找、空框或沉默被当同意、批注不能结构化回传、未获明确开工令就动手的问题。
> 先试这一步：先在单个仓库、单个编码 agent 上跑通一次闭环：计划出现→在页面逐项批注（用做法 A 时故意留一个空框验证它不等于同意）→回传后看改了什么或为什么没改→你明确下令才开工。
> 最近修订：2026-11-14

## 解决什么问题

智能体带计划来时，常把一堵嵌套列表丢进聊天，末尾问“这几项你怎么定”。人要在长文本里逐条找、逐条回，容易漏、容易烦；更危险的是，智能体可能把“没回答”当成“同意”，或者你刚在计划上点了头，它就擅自开工。这篇手册把流程固定为：让智能体把计划生成为一个本地可批注页面，你逐项批注；它按轮次读取回答、回显改了什么或为什么没改；只有你明确下令，它才动手。做法 A 用 visual-review-page 的逐项回答框；做法 B 用 Plannotator 的计划/代码评审界面和结构化反馈回传。两者都把“人批注”放在“智能体开工”之前。

## 适用与不适用

适用：

- 中等规模、有多个决策点的计划任务。A 原文点名的例子包括 bot、网站、自动化、视频剪辑；B 适合计划评审、spec/Markdown/HTML 产物批注、代码与 PR diff 评审。
- 你已经在用 Claude Code、Codex 或其他受支持 agent，并愿意多一步“看页面、写批注”的往返。
- 你需要把“人批注”和“智能体开工”分开：A 适合保留最强控制；B 适合自动拦截计划和代码 diff、用结构化反馈回传。

不适用：

- 普通提问、短计划。A 原文明确不适用；B 未给出短计划边界，按是否需要多个决策点自行判断，别为短任务增加无谓开销。
- 未支持的环境。A 仅 Claude Code / Codex；B 支持 Claude Code、Codex、Copilot CLI、Gemini CLI、OpenCode、Kiro、Droid、Amp、DeepSeek Harness、Pi 等，但 Droid 只有命令、暂无计划拦截，Windows 上 Codex 的 hook 属实验性。
- 你希望页面上的任何回答都不触发起工：选 A。B 的 approve 会让 agent 继续，approve 本身就是开工令。
- 远程不可信网络：B 远程模式监听 0.0.0.0 且无登录，只对可信网络开放。

## 前置条件

- 一个浏览器；一个受支持的编码 agent；能接受多一步“看页面、写批注”的往返。
- 做法 A：Claude Code 和/或 Codex；Python 3.7 或更新；本地服务器只用标准库；Windows 需在 WSL 里执行命令；知道 skill 安装目录：Claude Code 是 `~/.claude/skills`，Codex 是 `~/.agents/skills`，Codex 也读旧的 `~/.codex/skills/`；项目内则是对应项目下的 `.claude/skills/` 或 `.agents/skills/`。
- 做法 B：macOS/Linux/WSL 或 Windows；Claude Code 走插件需 2.1.287 以上才有“不阻塞会话”模式；Windows 上 Codex 的 hook 属实验性，安装器会打印手动步骤；本地数据目录默认 `~/.plannotator`，可用 `PLANNOTATOR_DATA_DIR` 改；远程需能转发端口。
- 同一任务只选一套页面接管，避免双页面、双反馈。

## 操作步骤

1. 先选做法，并约定开工令在哪里。

做法 A：visual-review-page。适合你只要“计划逐项回答框”，并且想保留最强控制：页面作答只表示同意或修改条目，起工必须由人显式下令。安装和触发都在本地，页面文件夹里有 `answers.json`。

做法 B：Plannotator。适合你希望计划一出现就自动弹评审、需要代码/PR diff 批注、多 agent 并行时用 Inbox 收口。它的 approve 会让 agent 继续，deny 会把结构化反馈发回 agent，计划 diff 显示改了什么。

差异要写清：A 的页面作答永远不触发起工；B 的 approve 就是开工许可。用 B 时，把 approve 当“明确下令”；用 A 时，不要以为答完就会开工。两套不要同时接管同一计划。

预期结果：你明确本次用 A 还是 B，以及“谁在什么时候算下令开工”。

2. 做法 A：取回仓库。

前提：本机已装 git，当前目录可写。

```bash
git clone https://github.com/pavel-molyanov/visual-review-page.git
```

预期结果：得到 `visual-review-page/` 目录，里面还有一层同名文件夹，那一层才含 `SKILL.md`。

3. 做法 A：安装。日常多个项目都用选全局；只想在单个项目试选项目内。选一种，装完重启智能体会话。

做法 A1：Claude Code 全局安装

```bash
mkdir -p ~/.claude/skills && cp -R visual-review-page/visual-review-page ~/.claude/skills/
```

做法 A2：Codex 全局安装

```bash
mkdir -p ~/.agents/skills && cp -R visual-review-page/visual-review-page ~/.agents/skills/
```

项目内安装：把内层 `visual-review-page/`（含 `SKILL.md` 的那层）拷进该项目 `.claude/skills/` 或 `.agents/skills/`。ZIP 下载的，解包后同样拷内层文件夹。

预期结果：skills 目录下出现 `visual-review-page/SKILL.md`；skill 与你自己的 skill 并列，只有你要求“可视化展示计划”时才启用。

4. 做法 A：重启会话并确认加载。

前提：上一步已拷贝完成。

预期结果：重启后能在 `/skills` 或等价入口里看到它。看不到就检查是不是拷了外层文件夹、是不是忘了重启。

5. 做法 A：触发页面，逐项批注。

前提：任务是中等规模、有多个决策点的计划，不是普通提问或短计划。对智能体说原文给的任意一句：

```text
show it visually
```

```text
pack it into a page
```

```text
present the solution
```

预期结果：智能体在项目某个文件夹里生成页面，起一个小本地服务器，并用内置浏览器打开；若智能体没有浏览器，你自己打开它打印的 `http://127.0.0.1:<port>/`。

在各条目下的回答框里写答复，边打字边保存。关键约束：空框表示“未回答”，绝不等于“同意”。有意见就写，没意见也要明确表态。预期回答写入页面文件夹的 `answers.json`，智能体像读聊天消息一样读取，其余不外传。

6. 做法 A：回聊天说“答完了”，检查回显与轮次。

用任意说法告诉智能体你答完了。

预期结果：它读回答、改页面，并在每条回答上方显示改了什么或为什么没改；已同意的条目折叠，回答框清空进入下一轮；上一轮回答保留为 `answers-<round>.json`。检查这三件事是否都发生。

7. 做法 A：只在明确下令后开工；更新先删再拷。

前提：你已经看完修订后的页面，确认可以动手。

预期结果：页面上的回答只表示同意或修改条目，永远不触发起工；你显式下开工指令后，它才开始工作。若它在你下令前动手，记为一次起工纪律失败。

更新时先删再拷，避免旧版本残留文件：

```bash
git -C visual-review-page pull
rm -rf ~/.claude/skills/visual-review-page && cp -R visual-review-page/visual-review-page ~/.claude/skills/
```

Codex 用户把第二行 `~/.claude/skills` 换成 `~/.agents/skills`。预期结果：skills 目录里只剩新版本文件，不出现旧版残留。

8. 做法 B：安装 Plannotator 二进制并接上你的 agent。

前提：有浏览器；已装好至少一个受支持的编码 agent；macOS/Linux/WSL 或 Windows；Claude Code 走插件需 2.1.287 以上才有“不阻塞会话”模式；Windows 上 Codex 的 hook 属实验性，安装器会打印手动步骤。

装二进制并自动配置各 agent 的 hook/skill/斜杠命令（会联网下载二进制、解析 release、可选拉 npm 包）：

```bash
# macOS / Linux / WSL
curl -fsSL https://plannotator.ai/install.sh | bash
```

```powershell
# Windows PowerShell
irm https://plannotator.ai/install.ps1 | iex
```

只想先拿一个二进制、不改任何 agent 配置（装到 `~/.local/bin`）：

```bash
curl -fsSL https://plannotator.ai/install.sh | bash -s -- --minimal
```

按你的 agent 补最后一步（安装器会自动探测已装 agent）：

- Claude Code：`/plugin marketplace add backnotprop/plannotator`，再 `/plugin install plannotator@plannotator`，重启 Claude Code。
- Codex：无需操作，计划评审通过其实验性 `Stop` hook 自动启用；已有 `$plannotator-review`、`$plannotator-annotate`、`$plannotator-last` skills。Codex 上斜杠命令要换成 `!plannotator …` 形式。
- OpenCode：在 `opencode.json` 加 `"plugin": ["@plannotator/opencode@latest"]`，重启。
- Pi：`pi install npm:@plannotator/pi-extension`，用 `--plan` 启动或 `/plannotator-plan-mode` 切换（不需要装 CLI）。
- Copilot CLI：`/plugin marketplace add backnotprop/plannotator`，再 `/plugin install plannotator-copilot@plannotator`，重启，计划模式下 `Shift+Tab` 触发。
- Amp：把 `plannotator.ts` 复制进 `~/.config/amp/plugins/`，`plugins: reload`。
- Droid：`droid plugin marketplace add https://github.com/backnotprop/plannotator`，再 `droid plugin install plannotator@plannotator`（只有命令，暂无计划拦截）。
- DeepSeek Harness：`dsh plugin --profile <profile> add @plannotator/dsh`。
- Gemini CLI / Kiro CLI：无需操作，hook/策略/斜杠命令或 skills 自动配好（Gemini 需 0.36.0+）。

预期结果：至少一个 agent 的接线完成；Claude Code 插件装好并重启；Codex 的 skills/hook 可用；其他 agent 按对应命令生效。

9. 做法 B：不用插件系统时，手写 Claude Code hook，让计划一出现就弹评审。

前提：Claude Code 未用插件自动接线，或你要手动修复。写入 `~/.claude/settings.json`：

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

预期结果：agent 调 `ExitPlanMode` → `PermissionRequest` hook 触发 → 本地服务从 hook 输入读计划 → 浏览器打开评审 UI → 你批注并 approve/deny → approve 则 agent 继续；deny 则把结构化反馈发回 agent → agent 修改，计划 diff 显示改了什么。这条“deny 必写结构化反馈 + 看 diff”的循环是本手册最该保留的做法。

10. 做法 B：五分钟自检批注→回传通路。

前提：安装完成，agent 会话已重启。执行：

```text
/plannotator-last                   # 批注 agent 的上一条回复
/plannotator-review                 # 按 PR 方式评审当前 diff
/plannotator-annotate report.html   # 批注任意文件、目录或 URL
```

其他批注姿势：

```text
/plannotator-annotate README.md                  # 本地 markdown
/plannotator-annotate src/                       # 浏览并批注目录内文件
/plannotator-annotate https://docs.rs/…          # 抓取并批注任意 URL
/plannotator-annotate report.html --render-html  # 按原样渲染 HTML，而非转换
```

预期结果：三条自检至少各跑通一次，批注能回到发起会话；Codex 上把斜杠命令换成 `!plannotator …`。

11. 做法 B：用同一套界面评审代码/PR diff。

```text
/plannotator-review                    # 评审未提交改动
/plannotator-review <github-pr-url>    # 评审 GitHub PR
/plannotator-review <gitlab-mr-url>    # 评审 GitLab MR
plannotator review --gitbutler         # 评审进行中的 GitButler 工作区
plannotator review --patch-file reading.diff # 评审静态 diff 文件
```

流程：`git diff` 取改动（或按 URL 拉 PR）→ 浏览器打开 diff 视图 → 逐行批注、stage/unstage → 发送反馈回 agent 会话 → 认可则发 “LGTM”。

预期结果：反馈以批注形式回到 agent，而不是另开一段聊天重述。

12. 做法 B：多 agent 并行时用 Inbox 收口。

```text
plannotator inbox
```

Claude Code / Pi / OpenCode 通过插件接入，回复直接成为其下一轮 turn；其他 agent 走 MCP：

```text
plannotator inbox mcp
plannotator inbox --help
```

预期结果：agent 把问题、文件、待审内容留在本地窗口里继续干活，你有空再答，回复作为该会话的下一轮输入；不会每个会话都把你按住。

13. 做法 B：远程/SSH/devcontainer 与隐私、网络收敛。

前提：能转发端口；注意远程模式监听 `0.0.0.0` 且无登录，只对可信网络开放。

```bash
export PLANNOTATOR_REMOTE=1
export PLANNOTATOR_PORT=9999  # forward this port
```

```text
Host your-server
    LocalForward 19432 localhost:19432
```

按需收敛网络与隐私（默认无遥测，计划/diff/批注/历史/配置本地存放；但每次界面加载会向 GitHub 查最新版本，且没有开关；本地 Git 评审会 `git ls-remote` 查默认分支）：

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

预期结果：远程通过转发端口访问；能接受或关闭版本检查与 Git 远端检查；分享功能按需关闭。

14. 做法 B：回看、归档、卸载。

```text
plannotator sessions                   # 列出活跃会话
plannotator sessions --open 1          # 在浏览器重开某次会话
plannotator archive                    # 只读浏览历史计划决策
```

```bash
plannotator uninstall
plannotator uninstall --purge   # 彻底删除，需手输 purge
```

预期结果：评审记录可回看，历史决策可复盘；卸载默认保留本地计划、历史、草稿，只有 `--purge` 才彻底删除。

15. 两套都适用的开工纪律。

开工前检查：A 的每个条目要么有回答要么明确表态，空框不算同意；B 不要用沉默代替 approve/deny，deny 必须写结构化反馈，并在下一轮看计划 diff。把本轮回答、批注、diff 留档；确认没有“未回答被当同意”“未下令就开工”。只有你明确下令（A 的开工指令，或 B 的 approve）后，才让 agent 动手。

预期结果：起工纪律失败为 0；每次修改都能追溯到具体批注。

## 怎么判断变好了

最小试用方式，先半天跑通，再用 3–5 次同类任务对比：

1. 选一个真实的中等规模计划任务，例如包含 3–5 个决策点的改动方案，先照常用聊天方式让智能体给计划，记下往返轮数、追问重述条数、返工决策点数，作为基线。
2. 做法 A：按步骤 2–7 装好并重启，用 `pack it into a page` 触发页面，逐项批注，故意留一个空框，验证空框不被当成同意；回聊天说“答完了”，检查回显、折叠、清空、`answers-<round>.json`。
3. 做法 B：先在单个仓库、单个 agent 上按步骤 8–10 装好，用 `/plannotator-last` 跑通一次批注回传；再让 agent 进入计划模式触发 `ExitPlanMode`，故意 deny 一次并写结构化反馈，检查计划 diff 是否显示改了什么；再对一个小 diff 跑 `/plannotator-review`。
4. 只在你确认后再显式下开工指令，观察它是否在你下令前不动手。
5. 换同类任务重复 3–5 次，和基线对比。

可观察指标。这些是按调研报告建议自定的试用指标，原文未提供：

- 往返轮数：从“智能体首次给计划”到“人可以开工”之间的消息轮数，与聊天基线对比。
- 澄清成本：同一任务中聊天里追问、重述的条数。
- 误改率：最终交付中因理解偏差需要返工的决策点数。
- 遗漏率：你实际有意见但未被处理的条目数；页面模式下应接近 0，因为每项都有框或批注位。
- 作答完成度：已回答框除以总条目数，以及“空框被误判为同意”的次数，后者应恒为 0。
- 起工纪律：在你未显式下令前智能体擅自开工的次数，应为 0；B 还要看 approve/deny 是否按预期生效。
- 评审轮次与返工次数：同一类任务改造前后的评审轮次、返工次数；B 的 deny 后计划 diff 是否出现、结构化反馈是否进入下一轮。
- 可追溯性：能否用 `plannotator archive` 或 A 的 `answers-<round>.json` 回看当轮决策。

判断：若 3–5 次试用后往返轮数与返工率没有下降，或页面生成质量不稳定、经常退回文字墙，把它的采用状态下调为 study，继续观察，不要继续硬推。B 的 hook 没触发时先修接线再判断，不要把“没弹页面”当成方法无效。

## 常见坑

- 对普通提问和短计划也触发页面。A 原文明确不适用，会增加无谓开销；B 未给短计划边界，但短任务也不值得增加评审往返。
- 把空回答框当成同意。A 的空框只表示“未回答”，不是默许；要么写意见，要么明确表态。B 也不要用沉默代替 approve/deny。
- 以为在页面上答完就会自动开工。A 的页面作答只做同意或修改，起工必须由人显式下令；B 的 approve 才会让 agent 继续，别把两者混用。
- 同一计划同时开 A 和 B，出现双页面、双反馈，智能体不知道读哪一份。一个任务只选一套接管。
- 拷错文件夹。A 要拷的是内层含 `SKILL.md` 的那层，不是仓库最外层。
- 装完不重启会话，导致 skill 或插件没加载。
- Windows 不在 WSL 里执行 A 的命令；B 在 Windows 上 Codex 的 hook 属实验性，要按安装器打印的手动步骤做。
- 更新 A 时只拷不删，旧版本残留文件继续生效。
- 页面文件夹散落在项目里，长期使用需要自己做 `.gitignore` 与清理约定；A 原文只提到智能体默认不把页面文件夹提交进版本库，若你习惯全量提交，要自己加进 `.gitignore`。
- 页面质量取决于智能体是否遵守 `SKILL.md`，A 原文没有给出失败模式的兜底；遇到经常退回文字墙，按上面的判断标准降级。
- B 没装 hook 或插件，却以为计划会自动弹评审；只有命令、没有接线时，计划不会自动出现。
- 手写 Claude Code hook 时 `matcher`、`PermissionRequest`、`timeout` 写错，或没重启；先按五分钟自检确认批注→回传通路。
- Codex 上继续用 `/plannotator-…` 斜杠形式；材料明确要换成 `!plannotator …`。
- Droid 只有命令、暂无计划拦截；Gemini CLI 需 0.36.0+；Claude Code 旧流程可用 `PLANNOTATOR_CLAUDE_MOD=0` 回退，别把不同 agent 的接入方式混在一起。
- B 远程模式监听 `0.0.0.0` 且无登录，只对可信网络开放；不要在不可信网络直接暴露。
- 把 B 的隐私承诺当成已经审计过的结论。README 说默认无遥测、计划/diff/批注/历史/配置本地存放，但每次界面加载会向 GitHub 查最新版本且没有开关，本地 Git 评审会 `git ls-remote`；可用命令、环境变量、`~/.plannotator/config.json` 收敛。A 的隐私说明是仅监听 `127.0.0.1`、校验 Host 头、回答只写本地 `answers.json`，属于作者声明加代码实现，材料未提供代码审计结论。
- 卸载 B 时以为会清空数据；默认保留本地计划、历史、草稿，只有 `plannotator uninstall --purge` 才彻底删除。

## 证据与来源

- 做法 A 的流程、安装与更新命令、三条触发提示词、文件构成、五条页面设计原则，来自调研报告 `pavel-molyanov/visual-review-page`；该报告依据项目 README 与仓库文件 `SKILL.md`、`assets/page.html`、`scripts/serve.py`。五条页面原则各配“之前/之后”对比图：`docs/images/problem-en.png`、`plain-words-en.png`、`show-not-tell-en.png`、`one-place-en.png`、`short-en.png`、`comments-en.png`。
- 做法 B 的安装脚本、minimal 安装、各 agent 接入命令、Claude Code hook JSON、`ExitPlanMode` 触发计划评审、approve/deny 与计划 diff、代码/PR diff 评审入口、Inbox、远程端口转发、隐私与网络开关、sessions/archive、uninstall，来自调研报告 `backnotprop/plannotator`；该报告依据项目 README。支持 agent 列表、Claude Code 2.1.287+、Gemini 0.36.0+、Windows Codex hook 实验性、Droid 暂无计划拦截、远程监听 `0.0.0.0` 且无登录、版本检查无开关、分享加密 7 天过期，均来自该 README 的整理。
- “省很多神经”“比一堵文字墙更好懂”“适用于任何带计划的任务”等说法只是 visual-review-page 作者主张，没有量化结果、对照组、第三方评测或用户案例数据；仓库 30 stars，属早期小项目。Plannotator 的 README 也没有给出“效果变好”的度量或数据；本手册把它当可试用流程，不当已验证结论。
- 本手册“怎么判断变好了”里的往返轮数、澄清成本、误改率、遗漏率、作答完成度、起工纪律、评审轮次与返工次数等指标，是按两份报告建议自定的试用指标，不是原文数据。
- 适用边界：A 仅 Claude Code、Codex，需要 Python 3.7+ 与浏览器，Windows 要 WSL，短计划不适用；B 的支持范围与接入差异见上，模型选择方面原文无依据。A 的隐私承诺属于作者声明加代码实现，材料未提供代码审计结论；B 的隐私与网络行为来自 README，也未提供代码审计结论。

## 依据的调研

- [pavel-molyanov/visual-review-page](../research/radar/2026-11-01/9276-pavel-molyanov-visual-review-page.md)：值得一试，先在一两个真实的"需要逐项确认的计划"任务上安装这个 skill 试跑，用它替代聊天里的长列表计划；它把"智能体出方案—人逐项批注—按轮次留存回答—只在明确指令后才开工"固化成可直接照做的流程，但依据只有作者自述和前后对比图，没有量化证据，因此只宜小范围试用。
- [backnotprop/plannotator](../research/radar/2026-11-14/13395-backnotprop-plannotator.md)：值得一试，先在单个仓库、单个 agent 上装 Plannotator，把“计划评审/代码评审→批注→结构化反馈回 agent”这条闭环跑通，再用评审轮次和返工次数与改造前对比；README 给了完整可照做的安装、hook、命令和配置，但只有作者自述、没有效果数据，所以先小范围试而不是直接全面采用。
