# 让 AI 代码评审从“看一眼 diff”变成可复核、可回灌的门禁

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：解决 AI 代码评审中结构看不懂、检查不可核对、风险与证据缺失、每轮改动没有闭环的问题，让评审在合并前真正能挡住问题。
> 先试这一步：先在一个非关键 PR 上，新开一个会话把“独立审查者”两条规则交给 agent 审 diff，再人工逐条复核它标为 block 的意见。
> 最近修订：2026-11-04

## 解决什么问题

AI 代码评审有十一个常见缺口。第一，评审者通常只拿到 diff，系统结构怎么变、数据怎么流要靠脑补。第二，push 前缺少一遍可核对的自动评审：扫描告警是否落在改动行、每条告警是否被处理、每个改动行是否送到 reviewer 面前。第三，常规评审被动等告警，缺少主动的对抗性漏洞寻找。第四，AI 生成的 TypeScript 代码常出现低证据、低信号模式，人工评审容易放过，也缺少确定性的 lint 门。第五，如果只按 PR velocity 看速度，agent 可以轻易造出大量没有业务影响的 PR。第六，agent 写得越来越快，push 之前没有人确认提交者本人是否真的读懂了这份改动。第七，即使有人审、有 agent 审，接受一个 AI 改动时往往没有一份能复核的记录：这个改动由哪些功能块组成、每块的输入输出和源位置在哪、对照哪些验收项、哪些结论有运行证据、哪些只是静态阅读。第八，即使 AI 评审跑完，审批者拿到的仍是 diff 和一堆评论，缺少一张“这次合并有多危险、危险集中在哪里”的风险地图。第九，即使评审发现了问题，发现本身和合并门禁也可能没有可审计的证据链：每条 finding 凭什么成立、门禁为什么阻断、报告事实能不能从机器可读记录重新推导，都不清楚。第十，agent 每一轮回复到底改了什么、人有没有在具体行上留下评论、评论有没有随下一条消息回灌给 agent，常常没有自动闭环。第十一，AI 评审者容易被上一轮上下文带偏，缺少“每次都是独立审查者”的约束；安全审查要么缺位，要么过度拦截，极端边界 case 没有明确的放行判断。

Uber 内部把前五点当成流程问题处理：PR 按 `feature`、`bugfix`、`maintenance`、`testing`、`docs` 打标，简单检查前移到 agent 开 PR 之前，AI 花费走额度加经理例外审批，评审前先跑 AI 评审并附风险分和截图。

Claude Code 团队公开的代码审查流程补上了另一条线索：不要问有没有人读过这段代码，要问这个变更可能出什么问题、哪一层检查最适合抓它。审查从路尽头的关卡变成写代码时的拼写检查，大多数变更在人类看之前已被 Claude 至少审过并修过一轮；目标状态是大多数 PR 至多一个人类在环，且回滚率和事故率不上升。原文给出的背景数据是：Claude 写了约 90% 的 Claude Code 自身代码；2026 年 6 月到 9 月，合并进 Claude Code 代码库的 PR 翻了一倍多，而被回滚的比例下降超过 40%；Anthropic monorepo 每天落地的变更从 5 月约 2,500 涨到 9 月超过 30,000。

Sphinx 把“提交者是否理解”做成一个 Git hook：在 agent 生成的代码被 push 之前，它读 diff，向你提一个关于这段改动在出问题时会发生什么的问题，答对才放行 push，答错会解释原因并换一个场景重试。它补的是理解层，不是代码正确性层。

Ask HN 讨论里，一派主张逐行审查不可持续，应转向测试和验证；另一派坚持必须完全理解才能交付生产代码。可操作的交集是：先让 AI 写测试并亲眼看到失败，用特性设计文档和 RCA 做人工门禁，再用静态分析、SAST、fuzzing、mutation testing 和多架构 gate 分层验证，把逐行阅读集中在生产代码和高风险改动上。

Simple Reviewer 补的是记录层：按职责把改动拆成功能块，说明每块的作用、输入输出、源文件/符号/行号，并对照验收项记录运行证据，生成 `code-breakdown.html`、`code-breakdown.md`，需要完整审查时生成 `report.html`、`report.md`、`review.effective.json`。它明确说生成器只校验和渲染审查记录，不执行记录内命令，也不自行发现语义缺陷；实际检查由审查代理读取代码、运行适当检查并记录结果。

Farol 补的是审批前的风险聚焦层：它不评论 diff 里的某一行，而是回答审批者真正要判断的问题——这次合并有多危险、危险集中在哪里。做法是用静态分析在 base 和 head 两棵代码树上建立“哪个声明用了哪个声明”的图，再把 diff 里的改动回溯到所有会执行到它的入口点，最后综合触达范围、diff 覆盖率、安全发现、契约破坏、依赖变更，给出 0–100 风险分和三档结论，并列出先读哪些文件、手工测哪些页面、哪些契约变更要找客户端确认。三个关键设计：`analyze` 从不执行被分析的代码、从不上网；确定性，同一 PR 每次给同样的报告，每条结论都带调用链，读不懂的地方标 `unknown` 并要求 careful review；Shadow mode，只提示，从不批准、从不 request changes、从不 fail check。

kyy-logs/code-review-skill 补的是可审计层：它把代码评审拆成四路独立探查，`behavior-review`、`test-coverage`、`repo-guard` 为必需，`impact-analysis` 可选；每个发现必须带位置、摘要、证据和严重级别，最后由 JSON 派生报告事实和合并门禁。它静态优先，不要求构建、跑测试或覆盖率报告，也不修改被评审代码；干净报告不保证改动正确，不能替代测试、CI 或人工评审。当前为 `v0.1.0-beta.3` 测试版。

rexmod 补的是逐轮复核层：它把 Rex 变成编码智能体的 harness，用一次性 git index 在每次发消息时和 agent 结束时各打一次快照，两次快照之差就是这一轮的 Last Turn；面板里点文件在 Neovim 中打开到改动行，`Space r` 写行级评论，评论存在 `.git/rexmod/`，随下一条消息以“`file:line` + 代码 + 批注”的短列表回灌给 agent。它补的是“每一轮到底改了什么、人有没有在具体行上表态、表态有没有回到 agent”的闭环，不替代测试、CI、人工审批和风险地图。

一条更轻的做法补的是评审者角色层：每次 review 都新开会话，把 agent 当成独立审查者，不让上一轮上下文影响判断；安全审查必要但不过度，极端边界 case 由 agent 自己判断是否不作为 block，再由人复核。它只给两条规则，不是完整流程，适合普通代码 review 的小成本试跑，不能用于安全关键系统的最终把关。

## 适用与不适用

适用：想让评审者在读 diff 前先看到系统结构和数据流变化，有 GitHub、GitLab、Bitbucket 之一，或愿意在本地终端先看图；想在 push 前先让 AI 做一遍评审，减少漏检、遗漏 suppression 注释和被改动的 scanner 配置，有 macOS、Linux（Windows 用 WSL）、Node 22+、git，且已登录 Claude Code 或 Codex；想让编码代理主动找漏洞，所用工具支持子代理或子任务机制，愿意人工逐条复核代理核验过的问题列表；已经在用 Claude Code，且有代码或 PR 需要审查，可以直接试内置的 `/code-review`（别名 `/review`）；项目使用 TypeScript，已经使用 Oxlint，运行环境支持 oxlint JS 插件；有代码托管平台，PR 系统支持标签，能按标签统计，能在仓库里提供一条本地校验命令；想让提交者本人是否读懂 agent 写的改动变成 push 前必须回答的问题，有一个能设置受保护分支的 Git 仓库，运行环境是 macOS、Linux 或 WSL，Node 22.19+；想让 AI 先写测试、你亲眼看到失败再让它实现，团队愿意为新功能写特性设计文档和实现计划、为修复写 RCA，并把这些文档设为人工检查点；想用 fuzzing、chaos、mutation testing 提高对测试本身的信心，想区分生产代码和一次性工具的审查强度；使用 Codex，愿意把 AI 写代码后的审阅和验收做成一份可复核记录，有 Python 3，能跑仓库里的报告生成脚本；已经有人工审批，但审批者拿到 AI 评审意见后仍缺少风险地图，使用 TypeScript/React、Go 或 Python 服务，能写出 `farol.config.json` 的一行配置；使用 Claude Code 或 Codex，并支持 Agent Skills / 自定义 agent，需要 Bash、Git、awk、grep、sed、Python 3.9+，想在不跑构建和覆盖率的前提下让每条评审发现都带可审计证据；使用 Apple silicon Mac、macOS 15+、已安装并打开过一次 Rex，有 Homebrew，使用 Claude Code、Codex、OpenCode 或 Pi，想让每一轮 agent 回复后的 Last Turn 自动出现并在 diff 行上写评论回灌；想在普通代码 review 里用最小成本让 agent 每次都以独立审查者身份审 diff、并有人工复核它的 block 意见和边界判断，手上有 issue 描述和本次 diff。

不适用或要谨慎：关键仓库、合规要求高的仓库只建议先在非关键仓库试点；PR Lens、OpenQodex、Sphinx、kyy-logs/code-review-skill、rexmod 都会把 diff 或代码送进所选模型或 agent 的上下文，数据边界要按既有合规判断处理；需要 PR 评论随 push 更新和复选框切换视图时，PR Lens 只有 GitHub App 版本支持，Action、GitLab、Bitbucket 做不到或受限，Bitbucket 上 fork 来的 PR 不会触发 pipeline；不想把 diff 发给模型 provider 的团队不要直接用这些外发路线；OpenQodex 项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1 到 3 分钟且消费你自己的 Claude Code 或 Codex 额度，还不够格直接当默认门禁；Claude Code `/code-review` 的来源是个人推文，不是 Anthropic 官方文档，原文在审代码这一段后就截断了，缺参数拼接语法、缺档位全名、缺权限与配置说明、缺适用版本；对抗审查依赖所用编码代理支持子代理或子任务机制，不支持的话提示词会退化成普通找漏洞指令，双重检查由同一个模型完成，存在自我确认偏差；非 TypeScript 项目，或没有 Oxlint 和 JS 插件运行时的项目，不适用 ai-deslop，团队不接受规则直接拒绝已接受的写法时不要全量启用 recommended；Uber 路线素材是节目页的 11 条要点，不是完整文字稿，没有可复制的配置、提示词或命令；Claude Code 团队流程是团队级做法，不是零成本开关，没有 CI、分支保护、merge queue、feature flag 和一键回滚时只能做其中一部分，agent 的审批永远不能算作人类审批；Sphinx 是刚在 Show HN 发布的新项目，长期维护与稳定性未知，只适合小范围试，且只对提交者本人是否理解有效；Ask HN 路线是评论集合，不是教程，没有可直接复制的命令或提示词；Simple Reviewer 是 Codex skill，不是跨工具通用能力，生成器只校验和渲染记录，不执行记录内命令，也不自行发现语义缺陷，仓库当前未附开源许可证；Farol 的评分和 verdict 阈值是启发式、只在少数仓库上查过，必须先用自己的历史校准，它用 shadow mode，只提示，从不批准、从不 request changes、从不 fail check；kyy-logs/code-review-skill 是 beta，probe contract、report schema、gate behavior 在 1.0 前可能变化，干净报告不保证改动正确，不是覆盖率工具，也不是修复器；rexmod 是非官方二进制 patch，单作者、仓库仅 30 stars，平台与宿主 app 双重绑定，只支持 Apple silicon Mac 和 macOS 15+，评论只回灌给 Rex 内绑定的 agent pane，Rex 外的 agent 收不到，同一仓库开两个 Codex pane 时无法判定评论归属，原文没有任何效果数据，demo 是加速播放，先小范围试，不要当默认门禁；路线十三只有两条 prompt 规则，没有完整流程和验证数据，不能作为唯一审查，也不能用于安全关键系统的最终把关，第 2 条把边界 case 判断交给 agent，原文未给判断标准，存在漏掉真实风险的可能。

## 前置条件

路线零：已装好并登录 Claude Code；有需要审查的代码或 PR。`--comment` 需要能把结果发到 PR，`ultra` 走云端，这两条是推断，使用前请对照官方 Commands 页面确认。

路线一（PR Lens）：目标平台有安装权限或 CI 配置权限；路线 A 能在目标仓库安装 GitHub App；路线 B 和 C 本机有可用的编码代理以及 `gh` CLI；自托管 CI 路线 D、E、F 需准备模型 key，示例默认 provider 是 Gemini；本地 CLI 路线 G、H 需要 Node 20.11+，key 从环境变量读，不走命令行参数。

路线二（OpenQodex）：Node 22 或更新加 git；macOS 或 Linux（Windows 用 WSL）；装好并登录 Claude Code 或 Codex，reviewer 只能是这两个。要跑 brakeman 或 rubocop 需要 Ruby 2.7 或更新，golangci-lint 需要 Go；OpenQodex 不替你装语言运行时。首次运行要下载扫描器；osv-scanner 需要能访问 osv.dev；semgrep 每次运行从 registry 拉规则包。默认 `auto` 的 reviewer 挑选顺序是：你运行命令时所在的 agent、Claude Code、Codex。

路线三（对抗审查）：一个代码完整、能运行或至少能被代理读全的仓库；一个支持子代理或子任务机制的编码代理工具；确认上下文窗口足够装下项目的主要代码结构；代理需要读全项目的权限、允许自行派生多个子代理，以及一个可持久化的问题列表。

路线四（ai-deslop）：项目使用 TypeScript；已经使用 Oxlint；运行环境支持 oxlint JS 插件（Bun、Deno 或 Node.js）；有 Oxlint 配置入口；部分标准规则需要 type-aware linting。

路线五（Uber 可迁移部分）：PR 系统支持标签，能按标签统计；仓库里能提供一条本地校验命令，且能在本地几分钟内跑完；可选能按用户统计 AI 编码工具的 token 花费；可选已有 AI 代码评审能力。

路线六（Claude Code 团队流程）：已有 Claude Code 可用；仓库里有测试、构建、截图等可执行验证手段；能写简短的 `CLAUDE.md`，并配置 hooks 自动跑 formatter 和 linter；有 CI、分支保护、CODEOWNERS；具备 merge queue、feature flag、分阶段发布和一键回滚能力。

路线七（Sphinx）：Node 22.19+；macOS、Linux 或 WSL；一个 Git 仓库，且能对目标分支设置保护；在 `sphinx install` 时选定一个审查模型，可以复用现有编码 agent，也可以走 OpenRouter 或任何 OpenAI 兼容端点。

路线八（先失败测试、文档门禁、分层验证）：项目有可运行的测试框架和明确验收标准；能搭建端到端测试环境；团队接受文档开销；有 CI 和多环境/多架构测试能力；工具链已配置编译、静态分析、SAST、linters、风格检查、测试；可选 fuzzing、chaos、mutation testing 工具和运行预算。

路线九（Simple Reviewer）：Codex 环境；Python 3；可选 Node.js 和 Playwright；已确认许可证，原文写明当前版本未附开源许可证；准备代码和希望实现的目标。

路线十（Farol）：Node.js 22+ 与 `git`；Go 项目另需 `go`，Python 项目另需 `python3` 3.11+；无需安装，用 `npx` 即可；仓库根目录可写 `farol.config.json`；可选准备 CI 报告和 Datadog 配置。

路线十一（kyy-logs/code-review-skill）：项目使用 Claude Code 或 Codex，并支持 Agent Skills / 自定义 agent；需要 Bash、Git、awk、grep、sed、Python 3.9+；`npx skills` 安装入口需要 Node.js 22.20+；覆盖率是可选项；项目规则可以放在 `.code-review/rules/`，也可以用环境变量指向；当前为 `v0.1.0-beta.3` 测试版。

路线十二（rexmod）：Apple silicon Mac、macOS 15+、已安装并打开过一次 Rex、有 Homebrew；git 工作树；Neovim（若没有配置，安装器会装自带 LazyVim 配置，已有 lazy.nvim 只追加插件 spec，其它配置装到 `~/.config/rexmod-nvim` 不动你的）；各 agent 的 hook 权限；Codex 装完必须执行一次 `/hooks` 信任，OpenCode 装完必须退出一次；可选 `--update-rex`、`--no-patch`、`--no-hooks`。

路线十三（独立审查者提示词）：有 issue 内容和本次代码改动 diff；能让 agent 每次 review 新开会话或清空历史；有人工复核所有 block 意见和边界 case 判断；团队接受由 agent 自判边界，但安全关键系统不在此列。

## 操作步骤

先选路线：

- 已经在用 Claude Code，想先试最省事的内置审查：走路线零，做法 S。
- 只想最省事、不需要自己的模型 key，或想让 PR 评审者先看懂结构和数据流：走 PR Lens，做法 A 到 I。
- 想在 push 前先跑可核对的 AI 评审：走 OpenQodex，做法 J 到 Q。
- 想让编码代理主动对抗性找漏洞、并先做二次核验：走对抗审查路线，做法 R。
- 想在 AI 生成的 TypeScript 进入评审前先过一道确定性 lint 门：走 ai-deslop，做法 T。
- 想在流程层面把简单检查前移、按类型度量 PR、控制 AI 花费：走路线五，做法 U。
- 想按 Claude Code 团队公开的团队级流程，把读 diff 交给机器、人只做关键决策：走路线六，做法 V。
- 想在 push 前确认自己真的读懂了 agent 写的改动：走路线七，做法 W。
- 想在不逐行读代码的前提下，靠先失败测试、设计文档门禁和分层验证建立可验证的信心：走路线八，做法 X。
- 想在接受一个 AI 改动前拿到一份可复核的功能块拆解、验收项和证据状态记录：走路线九，做法 Y。
- 想在 AI 评审之后、人点 Merge 之前拿到这次合并的风险分、危险集中在哪里、先读哪些文件、手工测哪些页面、哪些契约变更要找客户端确认：走路线十，做法 Z1 到 Z10。先 shadow mode，不接门禁。
- 想在静态优先、不跑构建和覆盖率的前提下，让每条评审发现都带可审计证据、并让合并门禁只从 JSON 重新推导：走路线十一，做法 AA1 到 AA5。先小范围验证，不直接 adopt。
- 想让每一轮 agent 回复后自动出现 Last Turn，在 diff 行上写评论并随下一条消息回灌：走路线十二，做法 AB1 到 AB7。仅 Apple silicon Mac + Rex + 四种 agent 小范围试。
- 想在普通代码 review 里用最小成本让 agent 每次都以独立审查者身份审 diff、并让人复核它的 block 意见：走路线十三，做法 AC1 到 AC3。先小范围试，不要用于安全关键系统的最终把关。
- 十四条路线阶段不同，可叠加。若只能选一个，先按你的主要缺口选。

### 路线零：用 Claude Code 内置的 `/code-review`（做法 S）

前提：已在工作环境里装好并登录 Claude Code；有需要审查的代码或 PR。原文未说明所需权限与配置；`--comment` 需要能把结果发到 PR，`ultra` 走云端，这两条是推断，使用前先查官方 Commands 页面。

1. 在需要审查的代码上打开 Claude Code 会话。
2. 输入审查命令：

```text
/code-review
```

3. 选择审查强度。原文只给出区间 low 到 max，未列出完整档位名称，也未给出传参写法，使用前先在官方 Commands 文档里确认。
4. 想让 AI 直接改代码时加上 `--fix`。
5. 想让结果发布到 PR 时加上 `--comment`。
6. 需要更深的审查时用 `ultra`，原文说明它走云端深度审查，但未给调用写法，需查文档。

预期结果：Claude Code 会针对正确性 bug 给出审查结果；若加了 `--fix`，它会直接改；若加了 `--comment`，结果会发到 PR。强度档位、`ultra` 写法、权限和配置因原文截断无法确认。

### 路线一：让评审者看懂改动（PR Lens，做法 A 到 I）

- 做法 A：在任意仓库安装 GitHub App，地址 `https://github.com/apps/coldtea-pr-lens`；开一个 pull request，图出现，并在每次 push 时更新同一条评论。只有 App 版本支持评论里的复选框。
- 做法 B：本机有编码代理和 `gh` CLI，运行 `npx skills add coldteadotai/pr-lens`，然后对代理说：

```text
Diagram the change you just made with PR Lens and attach it to the pull request.
```

代理会读 diff、写图文件，反复跑 `npx @coldtea/pr-lens-cli validate` 直到全部检查通过，再用 `gh pr create --attach` 把图附加到 PR 描述里。图里名字错了不要改生成的 SVG，改 `.github/pr-lens.yml`。
- 做法 C：让代理把整套装好，可原样使用原文提示词：

```text
Set up PR Lens for me. It draws code changes as moving diagrams of the system and how data flows through it.

1. Install the agent skill: `npx skills add coldteadotai/pr-lens`.

2. Help me install the GitHub App at https://github.com/apps/coldtea-pr-lens on every repository where I review pull requests. It posts one comment per pull request and updates that comment on every push. It does not need a model key from me.

3. If I'd rather run it from CI with my own model key, offer the Action instead: `.github/workflows/pr-lens.yml` using `coldteadotai/pr-lens/packages/action@v0`, with the key saved as a repository secret. It works with any service that speaks `/chat/completions`, such as OpenAI or Gemini.

4. Then test it: diagram the latest change in this repository and show me the SVGs or the canvas.
```

- 做法 D：GitHub Action。提交 `.github/workflows/pr-lens.yml`，使用 `coldteadotai/pr-lens/packages/action@v0`，`api-key` 用 `secrets.GEMINI_API_KEY`。Action 在两次运行之间不保留状态，评论发出后不会更新。
- 做法 E：GitLab CI/CD 组件。添加模型 key 和带 `api` scope 的 project access token，`CI_JOB_TOKEN` 不能发评论；`workflow: rules` 必须写在你的 `.gitlab-ci.yml` 里；include `gitlab.com/coldteadotai/pr-lens/pr-lens@0.1.0`。
- 做法 F：Bitbucket pipe。使用 `docker://ghcr.io/coldteadotai/pr-lens-pipe:0.1.0`，变量 `GEMINI_API_KEY` 和 `PR_LENS_TOKEN`。Bitbucket 评论是纯 Markdown，fork 来的 PR 不会触发 pipeline。
- 做法 G：本地 CLI。Node 20.11+；key 从环境变量读：

```bash
export GEMINI_API_KEY=…

npx @coldtea/pr-lens-cli analyze --base origin/main
npx @coldtea/pr-lens-cli render .pr-lens/graph.json
npx @coldtea/pr-lens-cli comment --graph .pr-lens/<drawing>/drawn.graph.json --manifest .pr-lens/<drawing>/manifest.json --asset-base-url https://raw.githubusercontent.com/owner/repo/pr-lens/42
npx @coldtea/pr-lens-cli validate .pr-lens/graph.json .github/pr-lens.yml
npx @coldtea/pr-lens-cli export .pr-lens/graph.json -o .github/pr-lens.map.json
```

产物落在 `.pr-lens/`，CLI 首次写入会自动把它加进 `.gitignore`；唯一值得提交的是 `export` 写出的 map 文件。接 Ollama、DeepSeek、OpenRouter 等任何说 `/chat/completions` 的服务用 `--provider openai-compatible --base-url <url>`。
- 做法 H：PR 之前先在终端看图：

```bash
npx @coldtea/pr-lens-cli analyze --base origin/main
npx @coldtea/pr-lens-cli render .pr-lens/graph.json
open .pr-lens/*-dark-*.svg
```

- 做法 I：GitHub 用 `.github/pr-lens.yml`；GitLab 和 Bitbucket 用 `.gitlab/pr-lens.yml`，具体键名以官方为准。

### 路线二：在 push 前做可核对的 AI 评审（OpenQodex，做法 J 到 Q）

1. 先看 demo，再给当前机器安装：

```bash
npx openqodex demo
npx openqodex init
```

2. 给 agent 装 OpenQodex skill：

```bash
npx skills add openqodex/openqodex
```

或把这段提示词粘进 agent：

```text
Install the OpenQodex skill with `npx skills add openqodex/openqodex`.
Then review my current change with openqodex and tell me the verdict and the findings.
```

3. 日常评审：

```bash
openqodex review
openqodex review --all
openqodex review <branch>
openqodex review '#42'
openqodex review --reviewer codex
```

`--all` 评审整个仓库；`<branch>` 和 `'#42'` 评审不是当前工作的分支或 PR。默认 `auto` 的挑选顺序是：你运行命令时所在的 agent、Claude Code、Codex。

4. 读报告：报告打在终端，同时写 `report.md`、`report.json`、`report.sarif`。判定评审完成的条件是三条同时成立：每个阶段都跑了、每条扫描告警都被提升或带理由丢弃、每一行改动都送到了 reviewer 面前。任何一条不满足就打 Review incomplete 并列出缺什么，退出码为 2。

5. 接门禁与 CI：push gate 加可选的 git pre-push hook；默认 warn，只有 `.openqodex/config.yaml` 里设了 `review.block_on_severity` 才 block。GitHub Action 给了 Anthropic API key 时对 PR 跑完整评审，没给就只跑 `openqodex scan`。

6. 加自定义扫描器：

```yaml
scanners:
  custom:
    - source: https://github.com/aquasecurity/trivy
      run: trivy config --format sarif --output {report} {target}
```

然后必须批准才会跑：

```bash
npx openqodex trust
```

7. 扫描器管理：首次使用会把扫描器下到 `~/.openqodex/tools/`；要一次装齐用 `npx openqodex doctor --install`；关掉 brakeman 用 `scanners.disable: [brakeman]`。

8. 离线与自动更新：`--offline` 会跳过 osv-scanner 和 semgrep，并关掉扫描器下载、版本检查、以及分支和 PR 评审的 fetch 和 `gh` 调用。自动更新可用 `openqodex update --off`、`~/.openqodex/config.yaml` 里的 `update: off` 或环境变量 `OPENQODEX_AUTO_UPDATE=0` 关闭；`openqodex update --rollback` 回退。

### 路线三：让代理做对抗性漏洞审查（做法 R）

前提：代码完整、能运行或至少能被代理读全；编码代理支持子代理或子任务机制，并已打开；上下文窗口足够装下项目的主要代码结构。

1. 在代理会话中原样粘贴下面这条提示词：

```text
彻底检查这个项目，寻找漏洞。将它视为对抗性审查，使用你想要的任意多子代理。当一个问题返回时，双重检查它是否正确，并将已检查的问题添加到列表中。
```

2. 允许代理自行决定子代理数量。
3. 要求代理对每条问题做二次核验。
4. 把通过核验的问题写入列表。原文没有说明列表载体，需要你自己指定输出位置，例如让代理写入仓库根目录下的一个 Markdown 文件。
5. 人工复核列表并修复。逐条判定每个入列问题是真缺陷、误报、已知问题还是风格偏好，记录数量和时间。
6. 原文中编号 2 的提示词因截断无法还原，不要凭猜测补写。

### 路线四：用 Oxlint 规则包拦截 AI 生成的 TypeScript 模式（ai-deslop，做法 T）

1. 安装为开发依赖：

```bash
npm install --save-dev ai-deslop
```

2. 在 Oxlint 配置入口加入 JS 插件和 recommended 配置：

```ts
import { defineConfig } from 'oxlint';
import { configs as deslopConfigs } from 'ai-deslop';

export default defineConfig({
  jsPlugins: ['ai-deslop'],
  options: deslopConfigs.recommended.options,
  rules: deslopConfigs.recommended.rules
});
```

3. 用项目现有方式运行 Oxlint，重点观察 recommended 规则报告的问题。recommended 覆盖类型安全与证据、代码质量与 API、测试三类，并启用若干标准规则；部分规则需要 type-aware linting。
4. 如需更强检查，再按文档启用 opt-in 规则：`no-duplicate-consts`、`no-duplicate-types`、`no-renamed-imports`、`canonical-class-names`。注意 `no-repeated-expect-call` 和 `no-duplicate-types` 没有 fixer。
5. 根据项目风格决定是否保留全部 recommended。

### 路线五：把简单检查前移、按类型度量 PR、控制 AI 花费（Uber 可迁移部分，做法 U）

1. PR 按工作类型打标：给所有 PR 加五个标签 `feature`、`bugfix`、`maintenance`、`testing`、`docs`。先跑两周收集基线，再做趋势对比。Uber 的观察方向是 feature PR 占比上升，maintenance PR 占比下降；不要再用单一 PR velocity。
2. 把 lint、build、模板规则这类简单 CI 任务搬到 agent 的 inner loop：在仓库里提供一条本地校验命令，在 agent 的工作约定里要求开 PR 前先跑这条命令。原文只给出 Uber 内部命令形态 `afx validate`，不能直接照抄，等价形态是你自己的聚合校验脚本。
3. 可选：AI 花费走额度加例外审批。给工程师分配 spend tier，达到上限后经理可以签批当月追加；对合适类型的工作不设上限，但避免无意识烧 token。
4. 可选：评审前先跑 AI 评审，附风险分和截图；所有 PR 仍由工程师评审，人据此决定花多少时间。
5. 方向、低可迁移性：模型网关与多 harness 封装。先确认你有哪些既有注册表、追踪、环境隔离能力可复用，不要指望从零搭出同等 agent 工具链。

### 路线六：Claude Code 团队流程，把读 diff 交给机器、人只做关键决策（做法 V）

1. 开 PR 之前，先给 Claude 一个它能自己跑的验证方式，并要求它展示输出，而不是说做完了。写一份简短的 `CLAUDE.md`，说明项目是什么：技术栈、约定、目标和非目标；大代码库里要短，并指向其他文档。在 `CLAUDE.md` 之外配置 hooks，自动跑 formatter 和 linter。
2. 在本地跑轻量审查，或让一个全新上下文的 subagent 审 diff：

```text
/code-review
/security-review
```

3. 加一份 `REVIEW.md`，由 code owners 写，告诉审查者在这块代码里什么才算重要：失败长什么样、限制 nit 数量、列出应跳过的路径、要求以文件和行号作为证据、要求摘要以数量开头。把重复出现的审查评论搬进 `REVIEW.md`。
4. 每个 PR 在人类看之前先过一次 Claude 审查；让发现结果先由其他 agent 验证再给人看；每条发现都必须被回应：要么修，要么用理由 resolve 掉这个 thread。加自动化安全审查，并且让它能阻断合并；上常规阻断性检查。
5. 在 PR 模板里加三个字段，Claude 可以代填，但提出变更的人要签字确认：

```text
## Testing
## Risk
## How to revert
```

6. 审批用风险分级，先严后松：

| 风险 | 例子 | 需要的人类审批 |
| --- | --- | --- |
| 低 | 文档、文案、仅内部功能、flag 后面的增量变更 | 自动审查和安全检查全绿后不需要 |
| 中 | 普通产品变更，以及缓存、auto-updater、system prompt 等敏感区域的变更 | 一人 |
| 高 | 最高风险的代码，加上一小批始终需要两人的路径 | 两人 |

有些路径永远需要人：owners 列为敏感的路径，以及任何 CI workflow 文件。只有仓库 trusted list 上的作者能走轻路径。agent 的审批永远不能算作人类审批，也不能填补一个要求人类的槽位。审批只覆盖某一个具体 commit。
7. 合并与之后：用 merge queue 把每个检查对着 main 重跑一遍；新行为先放在 flag 后面；留快速发现、快速回滚；把事故和回滚变成 eval 集；测噪声，而不是只测召回；让审查收敛；让审查 agent 每晚在存量代码上跑。
8. 人留在五类决策上：是否该做这件事、高风险代码、会被别人复制的架构模式、读证据、对结果负责。

### 路线七：push 前先确认你真的读懂了 agent 写的代码（Sphinx，做法 W）

前提：Node 22.19+；macOS、Linux 或 WSL；一个 Git 仓库，且能对目标分支设置保护；在 `sphinx install` 时选定一个审查模型。先在一个非关键仓库试，不要接团队主干。

1. 安装并接上 Git：

```bash
npm install -g sphinx-understand
sphinx install
```

2. 正常 push：

```bash
git push
```

Sphinx 读 diff 并针对改动出错时会发生什么提问；答对才放行 push，答错会解释原因并换一个场景重问。
3. 应急放行：

```bash
sphinx yolo
```

不要把它当日常路径，否则检查会被架空。原文说每次跳过都会记录日志。
4. 模型后端可选：你的现有编码 agent、OpenRouter，或任何 OpenAI 兼容端点。隐私边界：你的回答不会传给编码 agent；`.env` 文件和密钥 never opened。

### 路线八：先写失败测试、用文档门禁和分层验证建立可验证信心（做法 X）

前提：项目有可运行的测试框架和明确验收标准；能搭建端到端测试环境；团队接受文档开销；有 CI 和多架构测试能力；工具链已配置编译、静态分析、SAST、linters、风格检查、测试。原文没有提供可直接复制的命令或提示词，以下步骤需按项目自行设计。

1. 先让 AI 写测试，并亲眼看到测试失败：给 agent 明确的验收标准；让 agent 先写测试，不写实现；在本地运行测试，确认它失败；保留失败输出。
2. 让 AI 实现到测试通过：在失败测试存在后，让 agent 写实现；跑同一套测试直到通过。
3. 先写覆盖整体工作的端到端测试：在实现前，让 agent 构建覆盖将要完成工作的端到端测试；该测试变绿后，工作即可视为完成。
4. 长规划会话：与 AI 进行长时间规划，深入细节、推演边界情况、设计测试用例；规划完成后再让 AI 过夜执行主要生产功能。
5. 文档门禁：新功能写 Feature Design document 和 Implementation Plan；修复写 RCA document 和 fix Implementation Doc；人工审查、修改、批准这些文档，批准后才让 AI 编辑代码；维护全局高层架构文档和子组件设计文档。
6. 标准检查链加 fuzzing、chaos、mutation testing：先跑编译、静态分析、SAST、linters、风格检查、测试；再加入故障注入和 mutation testing。
7. 发布前多架构 gate，提交保持小而集中；原文的例子是 5 个架构。
8. 让 AI 解释你看不懂的代码，并自行核实解释是否准确。
9. 区分生产代码和一次性工具：进入生产环境的代码逐行审查；`~/.local/bin` 里的一次性小工具快速功能测试后即可合并。
10. 方向、不可立即落地：设计合同与形式化验证。原文没有给出落地步骤，不要把它当现行流程。

### 路线九：在接受 AI 改动前拿到可复核的拆解与证据（Simple Reviewer，做法 Y）

前提：Codex 环境；Python 3；可选 Node.js 和 Playwright；已确认许可证；准备代码和希望实现的目标。

1. 复制完整 `simple-reviewer-v1` 目录到 Codex 个人 skills 目录，不要只更新单个 `SKILL.md`。Windows 默认路径为：

```text
%USERPROFILE%\.codex\skills\simple-reviewer-v1
```

安装后在 Codex 中新开会话或刷新 skill 列表。
2. 先写验收项，再让代理只审不改。可原样使用中文提示词：

```text
$simple-reviewer-v1 检查刚刚的代码，并单独生成代码拆解文件。
```

也可使用带验收要求的英文提示词：

```text
$simple-reviewer-v1 Review the code we just changed. Explain each functional block, identify its source locations, verify whether it meets my goals, and generate an HTML breakdown with a Markdown companion. Review only; do not change the code.
```

3. 跑测试、校验示例记录并生成报告：

```text
python -B scripts/test_reviewer_report.py
python -B scripts/reviewer_report.py validate assets/review.example.json
python -B scripts/reviewer_report.py breakdown assets/review.example.json --out review-output
python -B scripts/reviewer_report.py render assets/review.example.json --out review-output
```

4. 用内置示例做负向测试：

```text
python -B assets/order-export/build_example.py
```

该示例故意保留“复用列表分页导致超过 20 条时导出不完整”的缺陷，可重建可复现证据。
5. 可选浏览器自检：

```text
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium
node scripts/test_breakdown_browser.cjs review-output/code-breakdown.html review-output/browser
```

6. 按状态读报告，不按“生成了报告”判断：绿色是在所记录范围内实际验证通过；红色是有证据确认的问题；黄色是待核实；灰色是尚未验证。静态阅读不算运行通过；缺少运行条件要明确记录为未验证。源文件或证据日志被改动后，SHA-256 快照会使旧证据过期，需要重新验证。
7. 更新已安装的 skill：

```text
powershell -NoProfile -File scripts/sync-installed-skill.ps1
```

### 路线十：在 AI 评审之后、人 Merge 之前拿到风险地图（Farol，做法 Z1 到 Z10）

前提：Node.js 22+ 与 `git`；Go 项目另需 `go`，Python 项目另需 `python3` 3.11+；无需安装，用 `npx` 即可；仓库根目录可写 `farol.config.json`。先在一个真实仓库用纯 CLI 模式试跑，不改 CI、不阻塞合并。

1. 写最小 `farol.config.json`：

```json
{ "routes": { "file": "src/routes.tsx" } }
```

Next.js 用 `routes.adapter` 为 `next`；TanStack Router 用 `routes.adapter` 为 `tanstack-router`、`routes.dir` 为 `src/routes`；TypeScript API 用 `surface` 为 `backend`；Go 用 `language` 为 `go`、`surface` 为 `backend`；Python 用 `language` 为 `python`、`surface` 为 `backend`。
2. 确认它看懂了你的项目：

```sh
npx @winninjs/farol routes
npx @winninjs/farol impact <file>
```

3. 本地分析一个分支并打开报告：

```sh
npx @winninjs/farol analyze --base origin/main --head HEAD --out farol.json
npx @winninjs/farol html --in farol.json --out farol.html && open farol.html
```

Linux 用 `xdg-open farol.html`。
4. 把 CI 里已有的报告喂给它，不要重复跑一遍。TypeScript/React 用 Vitest、ESLint、npm audit 的报告；Go 用 `go test -coverprofile`、`golangci-lint`、`govulncheck`；Python 用 `pytest --cov`、`ruff`、`pip-audit`。没给某份报告时，报告里显示 `not verified`，而不是显示通过。
5. 可选接成 GitHub Action：抄 `examples/workflow.yml`（Go 用 `examples/workflow-go.yml`，Python 用 `examples/workflow-python.yml`）到 `.github/workflows/farol.yml`。`tests` job 运行 PR 代码，不挂 secret、只有只读 token；`farol` job 从不运行 PR 代码；草稿 PR 跳过；fork PR 不发评论；所有 farol 步骤设 `continue-on-error`。
6. 按固定顺序读报告：先看 Verdict 和分数；按 Start here 从高风险文件读，读完勾 Mark as reviewed；看 Pages/Operations 的爆炸半径；看 Contracts 的 breaking 变更；看 Security/Dependencies/Coverage 的证据层；按 Test plan 手工验证；最后把 Markdown 记录 Copy as Markdown 贴回 PR。对未上线功能用 Behind a feature flag 标注入口点。
7. 第二轮评审用增量：

```sh
npx @winninjs/farol analyze --since <sha> ...
```

8. 可选接入 Datadog 流量与线上错误，只作参考信息，从不改变分数；CI 里用单独的 `farol-usage` job，一天读一次，永远不接触 PR 的代码。
9. 用你自己的历史校准阈值：

```sh
farol calibrate
```

完整参数见仓库 `docs/reference.md#calibrating-the-score-on-your-history`。
10. 非 GitHub 平台：`analyze`、`html`、`report` 与平台无关，只有 `comment` 是 GitHub 专属；把 `npx @winninjs/farol report` 的输出用你自己平台的 API 发出去。monorepo 用 `--cwd` 指向子应用。

### 路线十一：让每条评审发现和合并门禁都能从 JSON 重新推导（kyy-logs/code-review-skill，做法 AA1 到 AA5）

前提：项目使用 Claude Code 或 Codex，并支持 Agent Skills / 自定义 agent；需要 Bash、Git、awk、grep、sed、Python 3.9+；`npx skills` 安装入口需要 Node.js 22.20+；当前为 `v0.1.0-beta.3` 测试版。先在一个非关键仓库或历史提交上小范围试用，暂不 adopt。

#### 做法 AA1：安装 skill

在项目根目录执行：

```bash
npx -y skills add kyy-logs/code-review-skill --agent codex --skill code-review --yes
```

Codex 会安装到 `.agents/skills/code-review/`；Claude Code 把 `--agent codex` 换成 `--agent claude-code`，安装到 `.claude/skills/code-review/`。该命令只安装 skill，不再安装独立 reviewer adapter。

预期结果：项目内出现对应 skill 目录，宿主能识别 `code-review` skill。

#### 做法 AA2：用 worktree 模式评审当前未提交改动

前提：已安装 skill，并且当前仓库有未提交改动或指定 commit 区间。在 Claude Code 中运行：

```text
Review these changes with code-review.
```

也可以直接调用：

```text
/code-review
```

`worktree` 模式评审当前 `HEAD` 下的 staged、unstaged 和 untracked 改动。预期结果：评审结果写到 `docs/work/active/{slug}/code-review.md`，并在 `probes/` 下生成 `behavior-review.json`、`test-coverage.json`、`repo-guard.json`，可选 `impact-analysis.json`。

#### 做法 AA3：用 commits 模式评审固定提交区间

前提：知道 `base..head` 的 commit ID。运行：

```text
Use code-review on commits abc123..def456
```

`commits` 模式评审固定的 `base..head` 区间。预期结果与 worktree 模式相同：人读报告、机器读 probe JSON。

#### 做法 AA4：按证据契约检查每条发现

输出结构是：

```text
docs/work/active/{slug}/
├── code-review.md      # human report
└── probes/
    ├── behavior-review.json
    ├── test-coverage.json
    ├── repo-guard.json
    └── impact-analysis.json
```

每个 finding 必须记录：`location`（`path:line`，或带理由的文件级）、`summary`（具体什么问题，不是“建议改进”）、`evidence`（契约、代码路径、测试输出或规则 ID）、`severity`（`high` / `medium` / `low`）、`status`（`open` / `reconciled` / `wontfix` / `false-positive`）。High 级发现必须引用实际方法签名及其违反的契约，或具体代码路径；没有核对证据的猜测最高只能标 `medium`。

预期结果：high 发现不是泛泛而谈，而是能定位、能复核、能解释为什么阻断。

#### 做法 AA5：理解执行流程和门禁，不把它当测试替代品

执行流程是 `scope → probes → sync → reconcile → report → gate`：先确定 `worktree` 或 `commits`，记录 base/head；再分派四个独立 agent，各自写 probe JSON；用 `collect-metrics` 校验 JSON 并派生计数；高严重度发现必须关闭或被 probe 标为误报；报告的事实部分从 JSON 渲染并校验；最后按 required-probe 失败和未关闭 high findings 阻断合并。README 没有给出 `collect-metrics` 的具体调用命令，试用时按仓库脚本说明执行，不要假设参数。

按需配置探查和项目规则：`references/probes.yaml` 控制 probe registry；项目规则可以放在 `.code-review/rules/`，也可以用环境变量指向：

```bash
export CODE_REVIEW_RULES_DIR=/path/to/rules
```

注意：项目规则包会替换内置规则包，不是与内置规则合并。

边界：它不是测试、CI 或人工评审的替代品；干净报告不保证改动正确；不是覆盖率工具，覆盖率有数据时才用；不是修复器，不修改被评审代码。

### 路线十二：让每一轮 agent 改动都出现 Last Turn 并回灌行级评论（rexmod，做法 AB1 到 AB7）

前提：Apple silicon Mac、macOS 15+、已安装并打开过一次 Rex、有 Homebrew；git 工作树；Neovim；各 agent 的 hook 权限。rexmod 是非官方 mod，只建议先在个人或非关键仓库试。

#### 做法 AB1：安装并重启 Rex

```sh
brew trust --tap alpcanaydin/rexmod
brew install alpcanaydin/rexmod/rexmod
rexmod-setup
```

或者一行装：

```sh
curl -fsSL https://raw.githubusercontent.com/alpcanaydin/rexmod/main/install.sh | sh
```

然后 `⌘Q` 退出 Rex 再打开。README 明确说本机不编译任何东西。`brew upgrade rexmod` 之后需再跑一次 `rexmod-setup`。

#### 做法 AB2：知道安装器动了什么

安装器会把 rexmod 拷到 `~/Library/Application Support/rexmod`，软链 `~/.local/bin/rexmod`；下载 Flow Icons 图标包；编辑器方面，若没有 `~/.config/nvim`，把自带的 LazyVim 配置装进去，若已有 lazy.nvim 配置只追加一个插件 spec（`lua/plugins/rexmod.lua`），若是其它配置则把自带配置装到 `~/.config/rexmod-nvim`，不动你的；在 `~/.config/rex/init.lua` 里用一个 managed block 加 `⌘P`；给每个检测到的 agent 装 hooks 和 `rexmod` skill，JSON 文件先备份；备份官方 Rex → patch → 加一个 LaunchAgent，Rex 更新后自动重打补丁。可选参数：`--update-rex`（先装最新官方 Rex）、`--no-patch`（不装面板）、`--no-hooks`（不接 agent）。

#### 做法 AB3：装完必做两个动作，否则 Last Turn 为空

- Codex：启动 Codex 后执行一次 `/hooks` 信任新 hooks；
- OpenCode：插件在后台 server 启动时加载，装完要退出 OpenCode 一次。

验证面板是否打上：

```sh
~/Library/Application\ Support/rexmod/scripts/patch.sh --check
```

#### 做法 AB4：用键位完成一轮四步循环

| 位置 | 键 | 作用 |
|---|---|---|
| Rex | `⌘⇧E` | 显示/隐藏面板 |
| Rex | `⌘P` | 在 agent 的仓库里找文件 |
| 面板 | 点文件 | 在编辑器面板打开 |
| 编辑器 | `Space r` | 对当前行/可视选区写评论 |
| 评论框 | `Ctrl+S` / `Esc` | 保存 / 取消 |
| 编辑器（有评论的行上） | `E` / `D` | 编辑 / 删除该条评论 |
| 编辑器 | `]r` / `[r` | 下一条 / 上一条评论 |
| 编辑器 | `Space R` | 汇总本仓库所有评论：`Ctrl+S` 发送待发项，`Ctrl+X` 删除 |

四步循环：1）Prompt：照常跟 agent 说话，发送瞬间用一次性 git index 快照工作树；2）Change：等 agent 干活，面板填出 Last Turn；3）Review：点文件 → Neovim 打开在改动行 → `Space r` 逐条落评论；4）Feedback：评论随下一条消息（或点面板徽标立即发）回给 agent，agent 回复，回到第 2 步。评论默认不立即发送，会以“`file:line` + 代码 + 你的批注”的短列表形式随你下一条消息带给 agent。

#### 做法 AB5：让 agent 主动把文件推到你编辑器

rexmod 附带一个 `rexmod` skill 和 CLI。agent 可以主动执行 `rexmod open file:line`，在它指向某处时把文件直接推到你编辑器面板。也可以在一个 tab 里开多个 agent，面板/Last Turn/评论跟随你最后聚焦的那个 agent pane；面板底部的 agent 名是切换菜单。agent 在编辑器或终端里干活不会改变当前跟随哪个 pane 的判定。

#### 做法 AB6：排障

面板不出现：确认补丁（见 AB3）；Rex 刚更新就等重打补丁通知后重开；日志在 `~/Library/Logs/rexmod-panel.log`；想不带面板启动用：

```sh
REXMOD_PANEL_DISABLE=1
```

Last Turn 一直空：hooks 没跑起来，重跑：

```sh
~/Library/Application\ Support/rexmod/scripts/install-hooks.sh
```

再按 AB3 处理 Codex / OpenCode。面板调试（Darwin notification）：

```sh
notifyutil -p dev.rexmod.toggle
```

还有 `.refresh`、`.snapshot`、`.dumpviews`、`.dumpchrome`、`.dumpheader`、`.dumpsidebar`，输出落到 `~/Library/Caches/rexmod/`。

#### 做法 AB7：更新与卸载

```sh
brew upgrade rexmod && rexmod-setup
```

Rex 自身：Sparkle 无法更新被打过补丁的 Rex，rexmod 关掉它的检查，改由 LaunchAgent 每小时下载官方包、校验签名/Team ID/公证、打补丁并提示重开。立即执行：

```sh
~/Library/Application\ Support/rexmod/scripts/update.sh
```

卸载（恢复官方 Rex，移除 hooks、`⌘P` block 和文件）：

```sh
~/Library/Application\ Support/rexmod/scripts/uninstall.sh
```

### 路线十三：用“独立审查者”提示词做一轮轻量对抗审查（做法 AC1 到 AC3）

前提：有 issue 内容和本次代码改动 diff；每次 review 新开会话或清空历史；有人工复核。原文只给两条规则，不是完整流程或工具配置。

#### 做法 AC1：新开会话，切断上下文

为每次 review 新开会话或清空历史，确保 agent 不被上一轮上下文影响。原文要求“独立审查者、不被上下文影响”，新会话是落实方式。

#### 做法 AC2：原样放入两条规则

```text
1. 对这个 issue 中的代码改动做一轮 review，你每次 review 应该都当成一个独立的审查者，不要被上下文所影响；
2. 安全相关的审查是必要的，但是不应该过度审查，不需要做航天级别的防护，一些非常边界 case（你自己来判断）可以不作为 block
```

预期结果：agent 按这两条规则审 diff，并把意见区分为“block”和“不作为 block”两类。原文只规定“边界 case 可以不作为 block”，未给输出模板；这个分类是试用时为复核补的最小格式。

#### 做法 AC3：人工复核，不把安全判断外包

逐条复核所有 block 意见和边界 case 判断，尤其是安全相关意见。前提是团队接受由 agent 自判边界；安全关键系统不应只靠这两条规则放行。原文未给判断标准，也没有示例 diff、审查输出、误报或漏报数据。

与路线三的区别：路线三要求编码代理支持子代理或子任务机制，让 agent 自行派生多个子代理、对每条问题做二次核验，适合主动找漏洞；路线十三不要求子代理，只给两条角色约束，成本更低，但证据更薄，不能替代路线三，也不能替代测试、CI 和人工评审。两条可以叠加：先用路线十三做一轮独立审查，再用路线三对高风险模块做对抗性深挖。

## 怎么判断变好了

十四条路线都只建议小范围试点，没有统一的建议时长，也没有统一的检出率、误报率、返工时间等量化效果数据。可以按下面方式自己量。

- Claude Code `/code-review`：选一个已完成、本来就要人工 review 的真实 PR 或一次提交作为对照样本；先原样跑一次 `/code-review`，记录问题清单；对照人工 review 结论，标记真 bug、误报、漏掉但人工发现的 bug；再试 `--fix`，只做 diff 对比，先不提交；结果可接受再试 `--comment`。指标：真实 bug 命中数除以总报出数、漏检数、审阅耗时、`--fix` 采纳比例、`--comment` 被回应或采纳比例。
- PR Lens：选一个非关键仓库，挑一批中等规模 PR，用 CLI 或 GitHub App 把改动画成架构或数据流图再进入评审。指标：命名修正条数、`validate` 通过率、评审中的理解性问题数量。
- OpenQodex：先跑 `npx openqodex demo`，再在非关键仓库跑 `npx openqodex init`。指标：报告是否退出码 2、每条扫描告警是否有理由、每个改动行是否送到 reviewer 面前、是否同时输出终端和 `report.md`、`report.json`、`report.sarif`。
- 对抗审查：挑一个中等规模、你比较熟悉的代码仓库，用支持子代理的编码代理原样粘贴提示词，让它把通过核验的问题写入指定文件；人工逐条判定真缺陷、误报、已知问题、风格偏好，记录数量和时间；作为对照，用同一工具、同一条提示词但不启用子代理跑一次。指标：真阳性数、误报率、重复或已知问题占比、核验有效性、人工成本。
- ai-deslop：选一个使用 TypeScript 和 Oxlint 的包，只启用 recommended 配置；先跑当前代码库观察噪音，再跑一段 AI 生成的 diff。指标：按规则统计违规数量与类型、人工判断真正需要修的比例、修复耗时、启用前后同类问题是否减少。
- 路线五：5 到 15 人团队两周可做。给 PR 加五个标签，先跑两周收集基线；在仓库里提供一条本地校验命令；可选 AI 花费额度和例外审批；可选评审前信息打包。指标：各类型 PR 占比变化、CI 排队时长、CI 任务量、失败率、每个 PR 的人工评审时长、从开 PR 到合并的时长、按人 token 花费、回归缺陷数、线上事故数、回滚次数。
- 路线六：先在一个仓库用简短的 `CLAUDE.md`、`REVIEW.md` 和 agent 可运行的检查打底，再接入 AI 审查、用风险分级控制人工审批数量，并以回滚率和事故率作为护栏。指标：每个 PR 的人类审批数、人类评论数、PR 等人等待的时长；护栏是回滚率和事故率；审查者质量用历史事故 PR 连同修复和回滚构成的 eval 集每天跑；噪声用当事人的反应分类。
- Sphinx：挑一个非关键的个人仓库，走完一次安装 → `sphinx install` → 让某个 agent 改一小段逻辑 → 在有保护的分支上 `git push` → 完整回答一次提问。指标：有效拦截率、提问质量、跳过率、每次 push 平均多花的分钟数、误判次数、审查模型实际 token 花费。先不要开 `sphinx yolo`。
- 路线八：选一个中等复杂度、验收标准明确的功能，按一轮完整流程执行。指标：测试先失败后通过的比例、端到端测试通过率、静态检查和 SAST/linters 发现的问题数、人工审查发现的问题数、实现后两周内生产缺陷数、审查耗时、AI 解释后人工验证的准确率。
- 路线九：选一个 1 到 2 个文件的小改动，先写 3 到 5 条可观察的验收标准；安装完整技能，用提示词要求只审不改；运行测试、`validate`、`breakdown`、`render`，打开 `code-breakdown.html`，检查每个功能块是否有职责、文件/符号/行号、源码片段、证据和限制；做负向测试，故意放入一个可复现的小缺陷，观察是否标红并提供证据。指标：验收项覆盖比例、绿色状态是否都有可复核证据、确认问题数、未验证项是否被明确写出。
- 路线十：在一个真实仓库用纯 CLI 模式试跑，不改 CI、不阻塞合并；先写 `farol.config.json`，跑 `routes` 确认识别结果，再跑 `analyze` 和 `html`；把 verdict/score 与人工判断对照。指标：风险分与人工判断的一致性、Start here 是否确实是最该先读的文件、Pages/Operations 的爆炸半径判断是否准确、Contracts 是否漏掉 breaking 变更、Security/Dependencies/Coverage 的 `not verified` 比例、Test plan 手工验证发现的问题数、第二轮增量报告是否只包含新提交、误报/漏报、评审耗时。
- 路线十一：选一个非关键仓库和一小批改动：一批未提交 `worktree` 改动，加一段有已知问题或已修复问题的历史 `commits` 区间；同时准备至少一个干净对照或已修复对照。分别用 `Review these changes with code-review.` 和 `Use code-review on commits abc123..def456` 跑通两种模式，保留 `code-review.md` 和四个 probe JSON，用仓库自带的 `collect-metrics` 校验 JSON 并核对报告事实是否与 JSON 一致。指标：必需 probe 是否都产出记录、JSON 字段是否完整、high finding 是否都带方法签名/契约或具体代码路径、gate 决策能否只从 JSON 重新推导并与 `code-review.md` 的事实部分一致、在干净或已修复对照上是否出现误阻断、在小样本历史缺陷上是否命中已知问题同时记录漏报、人工确认一条可行动发现所需时间、误报导致的复核时间。不要把少量样例当成召回率；速度/token 节省需要单独测量，因为 README 明确说未验证。
- 路线十二（rexmod）：选 3–5 个真实小任务，每个任务完整跑一轮 Prompt → Change → Review → Feedback。指标：Last Turn 是否每轮都出现、空置率、每轮评论数、评论随下条消息回灌比例、agent 下一轮是否针对评论改、返工轮数、单轮复核分钟数、双 Codex pane 时评论 pending 次数、跳过或不用面板的次数。原文没有给任何效果数据，这些指标由本手册提出，不是原文验证。
- 路线十三：选少量近期已有真人 review 的 issue 或 PR，复制其 diff 与 issue 描述，在新会话中只放原文两条规则，让 agent 输出 block 与不作为 block 的意见；由不知情的 reviewer 对照真人意见复核。不要首次就在高风险仓库试用。指标：block 意见被人工确认有效的比例、误 block 比例、人工 reviewer 已发现但 agent 漏掉的高严重问题、复核耗时。原文无基线，需自己记录试用前后或与真人 review 对照；仅“意见更多”不算改善。

试多久：Claude Code `/code-review`、PR Lens、OpenQodex、ai-deslop 原文都没给建议时长；至少覆盖一批中等规模 PR 或改动的完整评审周期后再判断。对抗审查建议连续两三个仓库跑下来。路线五建议先跑两周收集基线。路线六应先严后松，用回滚率和事故率做护栏。路线七建议先在一个个人仓库连续记两周。路线八至少覆盖一个完整功能的实现到上线周期。路线九至少做一次正向审阅、一次负向测试、一次证据过期重验。路线十至少覆盖一批中等规模 PR 的完整评审周期，并用自己的历史校准后再判断。路线十一原文没给建议时长；至少跑通一次 worktree、一次 commits、一次干净对照或已修复对照，再决定是否扩大范围。路线十二原文没给建议时长；至少跑完 3–5 个真实小任务，确认 Last Turn 和评论回灌稳定后再扩大范围。路线十三原文没给建议时长；至少覆盖一小批已有真人 review 的 issue/PR，并保留一次与真人意见的对照，再决定是否扩大范围。

## 常见坑

- Claude Code `/code-review` 来源是个人推文，不是 Anthropic 官方文档；原文在审代码这一段后就截断了；缺参数拼接语法、缺档位全名、缺权限与配置说明、缺适用版本。不要照猜语法。
- PR Lens 收益主张没有量化数据；GitHub Action 在两次运行之间不保留状态，评论发出后不会更新；需要随 push 更新的评论和复选框，只有 GitHub App 版本支持。图里名字错了不要改生成的 SVG，改 `.github/pr-lens.yml`。GitLab 上 `CI_JOB_TOKEN` 不能发评论；Bitbucket 上 fork 来的 PR 不会触发 pipeline；`.pr-lens/` 是临时目录，唯一值得提交的是 `export` 写出的 map 文件。
- OpenQodex 仍在 1.0 之前、仓库仅 30 stars、单次评审 1 到 3 分钟且消耗自己的额度；还不够格直接当默认门禁。Cursor 不能当 reviewer，Cline 也未列为 reviewer。自定义扫描器必须经 `npx openqodex trust` 批准；只删除代码的改动也可能带告警。push gate 和 pre-push hook 默认 warn，只有设了 `review.block_on_severity` 才 block；pre-commit hook 只跑扫描器。
- 对抗审查原文截断：编号 2 的提示词完全丢失；不要凭猜测补写。列表载体未说明，需要你自己指定输出位置。双重检查由同一个模型完成，存在自我确认偏差，必须人工抽检或全检。
- ai-deslop 原文是仓库 README，没有给出具体代码违规示例、基准数据、误报率或用户案例；规则较 opinionated，可能直接拒绝一类写法；部分标准规则需要 type-aware linting；部分规则没有 fixer。
- Uber 路线素材是节目页要点，不是完整文字稿；没有任何可复制的配置、提示词或命令；所有系统都是内部实现；度量口径不完整，不知道具体阈值、基线、改善判定标准。不要再用单一 PR velocity 指标。
- Claude Code 团队流程的 `CLAUDE.md` 在大代码库里要短，并指向其他文档；`REVIEW.md` 要由 code owners 写；审查噪声对 agent 作者代价更高；agent 的审批永远不能算作人类审批；审批只覆盖某一个具体 commit；原文明确还没有在回滚或事故指标变动时自动收紧审批的 circuit breaker；merge queue 是必要的；eval 集要请熟悉那段代码的工程师逐条确认。
- Sphinx 是刚在 Show HN 发布的新项目，长期维护与稳定性未知；示例对话被明确标注为虚构，不能当实测案例。`sphinx yolo` 是全局逃生阀，有被习惯性使用而架空检查的风险。它只对提交者本人是否理解有效，无法验证代码本身正确性。
- Ask HN 原文是评论集合，不是教程；没有可直接复制的命令、配置或提示词；样本偏有经验的工程师，缺少对照实验；测试先失败后通过、mutation testing 提高信心都是实践者经验。文档门禁会增加开销；没人维护架构文档时，门禁会退化成形式。AI 解释可能不准确，必须自己研究核实。
- Simple Reviewer 是 Codex skill，不是通用工具；生成器只校验和渲染记录，不执行记录内命令，也不自行发现语义缺陷；生成报告不等于验证通过。颜色只代表所记录范围内的状态；缺少运行条件时必须保留未验证，不能标绿；静态阅读不算运行通过。仓库未附开源许可证；报告可能含源码和本地路径；默认简体中文。
- Farol 评分和 verdict 阈值是启发式、只在少数仓库上查过；不要直接当门禁，先用 `farol calibrate` 在历史上校准。`analyze` 不执行代码、不上网；`comment` 调 GitHub API、`usage` 调 Datadog API 会联网。fork PR 不发评论；草稿 PR 跳过；所有 farol 步骤设 `continue-on-error`。没给报告时显示 `not verified`，不是通过。Go 离线读模块，base 和 head 都要先 `go mod download`。Next.js 路由目录不在默认位置要设 `dir`；monorepo 里 tsconfig `extends` workspace 包需先装依赖再分析；monorepo 用 `--cwd`。Datadog 只作参考，从不改变分数；CI 用单独 job，不接触 PR 代码。不要把 Farol 当成 bug 审查替代。
- 路线十一：当前是 `v0.1.0-beta.3` 测试版，probe contract、report schema、gate behavior 在 1.0 前可能变化；严重级别从四级改为三级，旧记录中的 `critical` 不兼容，`collect-metrics` 会拒绝。项目规则包会替换内置规则包，不是与内置规则合并。四个 probe 仍使用同一模型，属于职责分离，不是独立人类裁决；干净报告不保证改动正确；不是覆盖率工具；不是修复器；不能替代测试、CI 或人工评审。实际速度和 token 节省明确写为未验证；并发缺陷检测未验证；评估 harness 和原始报告未放在公开仓库，外部无法复核完整评测过程。不要把 11 例和 9 例合并成 20/20 的结论。
- 路线十二（rexmod）：非官方二进制 patch，单作者、仓库仅 30 stars，平台与宿主 app 双重绑定；只支持 Apple silicon Mac 和 macOS 15+，别的平台不要照抄。Codex 装完必须 `/hooks` 信任，OpenCode 装完必须退出一次，否则 Last Turn 为空。评论存在工作树的 `.git/rexmod/`，每条绑定写它时的 agent pane；Rex 之外的 agent（别的终端或 app）不会收到。同一仓库开两个 Codex pane 时，Codex 的 hooks 跑在后台 server 里，rexmod 无法判断是哪个 pane 发的消息，于是不猜——评论留在 pending，turn 记录不带 pane；此时要用面板的评论徽标直接粘进面板跟随的 pane。Claude Code / OpenCode / Pi 没有这个限制。Sparkle 更新不了打过补丁的 Rex，需靠 LaunchAgent 每小时检查并重打补丁；`brew upgrade rexmod` 后要再跑一次 `rexmod-setup`。原文没有任何效果数据，demo 视频是加速播放的一分钟，不能当实测耗时；不要把它当默认门禁。
- 路线十三：原文只有两条 prompt 规则，不是完整流程或工具配置；给出的文本只到第 2 条，可能被截断，无法确认是否有后续规则；没有示例 diff、审查输出、误报或漏报数据，也没有指定模型、工具或协作平台；“对抗式”没有定义；第 2 条把边界 case 判断交给 agent，存在漏掉真实风险的可能，原文未给判断标准；安全关键系统不应只靠这两条规则放行，也不能作为唯一审查。互动数据点赞 25、转发 1、回复 8 不能当效果证据。

## 证据与来源

路线零来自调研报告 `@riba2534` 推文。可照做内容包括命令名 `/code-review`（别名 `/review`）、可选强度 low 到 max、`--fix`、`--comment`、`ultra` 走云端深度审查。限制：来源是个人推文，不是 Anthropic 官方文档；互动数据为 likes 24、reposts 3、replies 2；正文截断，缺参数拼接语法、档位全名、权限与配置说明、适用版本；`--comment` 需要 PR 访问路径、`ultra` 需要云端算力属于推断。

路线一来自 `coldteadotai/pr-lens`。可照做内容包括 GitHub App 安装地址、`npx skills add coldteadotai/pr-lens`、Action 配置、GitLab CI/CD 组件、Bitbucket pipe、CLI 的 `analyze`、`render`、`comment`、`validate`、`export` 命令、`.pr-lens/` 产物约定、`.github/pr-lens.yml` 改名修正。限制：Action 不保留状态、GitLab token 与媒体文件限制、Bitbucket fork PR 不触发、`.pr-lens/` 是临时目录只提交 map。收益表述为作者自述，没有对比或量化效果数据；仓库 1821 stars 只能说明关注度。

路线二来自 `openqodex/openqodex`。可照做内容包括 `npx openqodex demo`、`init`、`npx skills add openqodex/openqodex`、`openqodex review`、`--all`、`<branch>`、`'#42'`、`--reviewer codex`、`reviewer_web: off`、`report.md/json/sarif`、自定义扫描器、`npx openqodex trust`、`doctor --install`、`scanners.disable: [brakeman]`、`--offline`、`openqodex update --off`、`--rollback`、`OPENQODEX_AUTO_UPDATE=0`、`npx openqodex guide <topic>`。数据包括 13 个内置扫描器版本、触发条件、下载体积等；首次运行实测条件在材料中截断，未给出结果。限制：项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1 到 3 分钟且消耗自己的额度；没有检出率、误报率、返工时间等效果数据；Codex 侧读取未被记录；Cursor 不能当 reviewer。

路线三来自 `@twostraws` 推文。报告给出一条完整可复制的提示词，明确两个动作：使用任意多子代理；对返回的问题做双重检查后加入列表。原文截断，编号 2 提示词丢失；没有说明项目规模、语言、模型配置、子代理数量、运行耗时、成本；没有说明列表载体和后续处置方式；双重检查由同一个模型完成；互动数据只能说明关注度。

路线四来自 `ai-deslop`。可照做内容包括 `npm install --save-dev ai-deslop`、Oxlint 配置示例、recommended 和 opt-in 规则清单。限制：原文是仓库 README；没有具体代码违规示例、基准数据、误报率或用户案例；部分标准规则需要 type-aware linting；`no-repeated-expect-call` 和 `no-duplicate-types` 没有 fixer；来源页 HN 31 points、7 comments，但没有评论内容或外部验证数据；拒绝低证据、低信号、AI-slop 代码模式是作者目标主张。

路线五来自 `Uber’s AI infra, from the inside`，The Pragmatic Engineer 播客节目页，嘉宾 Uday Kiran Medisetty。可迁移做法：PR 按 `feature`、`bugfix`、`maintenance`、`testing`、`docs` 打标；把 lint、build、模板规则移到 agent 的 inner loop；AI 花费走额度加例外审批；评审前 AI 评审已跑完并附风险分和截图；Model Gateway、AIFX 多 harness 封装。数字均为嘉宾口述，非可复核公开数据：token 成本近几个月降低约 50%；CI 12 个月内任务量翻倍以上；2015 年 2 个服务，2019 年数千个，2026 年与 2019 年大致相当而业务规模约为当时 10 倍；M3DB 每秒发出约 5 亿个指标；工程师日常使用 20 多个工具。限制：素材是节目页 11 条要点，不是完整文字稿；没有可复制配置、提示词或命令；所有系统都是内部实现；度量口径不完整。

路线六来自 `How the Claude Code team does code review`。可照做内容包括 `CLAUDE.md`、hooks、`/code-review`、`/security-review`、`REVIEW.md`、三类内部 skill；Claude 审查、多 agent 投票验证、行内评论与 `Important`、`Nit`、`Pre-existing` 标签、每条发现必须修或 resolve、安全审查阻断合并、常规阻断检查、PR 模板三个字段；风险分级表、永远需要人的路径、trusted list、agent 审批不算人类、审批只覆盖具体 commit、先严后松；merge queue、flag、快速回滚、事故 eval 集、测噪声、让审查收敛。数据：Claude 写了约 90% 的 Claude Code 自身代码；2026 年 6 月到 9 月，合并进 Claude Code 代码库的 PR 翻了一倍多，被回滚比例下降超过 40%；Anthropic monorepo 每天落地变更从 5 月约 2,500 涨到 9 月超过 30,000；研究预览上线后，内部 PR 获得实质性审查评论的比例从 16% 升到 54%；超过 1,000 行的 PR 大多能查出问题，小 PR 大多干净返回；对审查者反复标记的内容跑 git blame，约 59% 是审查者第一轮时就已经存在的代码。限制：目标状态是大多数 PR 至多一个人类在环且回滚率和事故率不上升，这是目标主张；原文明确还没有自动收紧审批的 circuit breaker；噪声对 agent 作者代价更高是原文判断。

路线七来自 `Show HN: Sphinx – A hook that quizzes you on your AI's code before shipping`。可照做内容包括 `npm install -g sphinx-understand`、`sphinx install`、`git push`、`sphinx yolo`；前提 Node 22.19+、macOS/Linux/WSL；兼容 Codex、Claude Code、Cursor、OpenCode、Pi 或纯 Git；模型来源支持现有 agent、OpenRouter 或任意 OpenAI 兼容端点；隐私声明：答案不进入编码 agent，`.env` 与密钥不被打开；HN 热度 74 points、20 comments。限制：`minimal tokens` 没有具体消耗数字；提问质量没有评测数据；没有误拦截率、漏检率、平均增加耗时、通过率等指标；示例对话是虚构举例；新项目长期维护未知；`sphinx yolo` 有被习惯性使用而架空检查的风险。

路线八来自 `Ask HN: How to deal with shipping AI-written code you don't understand?`。可照做内容包括先让 AI 写测试并亲眼看到失败、再让 AI 实现到通过、实现前先写端到端测试、长规划会话、特性设计文档和 RCA 文档门禁、架构文档同步、多架构发布前 gate 和小步提交、标准检查链、fuzzing/chaos/mutation testing、让 AI 解释并自行核实、区分生产代码和一次性工具。案例：spacedcowboy 的自动向量化编译器项目，5 个架构发布前 gate，Mandelbrot 从 394,238 µs 降到 2,110 µs（约 187×），用 checksums 验证正确性；lp92 的 UAV 软件文档门禁流程；matltc 的生产代码与一次性工具区分；SimianSci 的凭证目录同步到公网 VM 反例；asimovDev 的审查疲劳反例。限制：原文是 HN 评论集合，不是教程；没有可直接复制的命令、配置或提示词；样本偏有经验的工程师，缺少对照实验；形式化验证没有落地步骤。

路线九来自 `Monopoly0024/simple-reviewer-v1`。可照做内容包括完整 skill 目录安装路径、中文和英文调用提示词、`python -B scripts/test_reviewer_report.py`、`validate`、`breakdown`、`render`、`python -B assets/order-export/build_example.py` 示例、Playwright 浏览器自检命令、`powershell -NoProfile -File scripts/sync-installed-skill.ps1` 更新脚本、`code-breakdown.html/md` 与完整报告文件清单、四色状态含义、SHA-256 快照过期重验机制。数据：版本 1.1.0；仓库 129 stars；CI 在 Windows/Linux 运行 Python 测试，并在 Chromium 检查报告；内置订单导出示例故意保留“复用列表分页导致超过 20 条时导出不完整”的缺陷。限制：主要是 README 自述，没有独立评测或实际改善效果数据；生成器只校验和渲染记录，不执行记录内命令，也不自行发现语义缺陷；颜色只代表所记录范围内的状态；内置示例不是自己项目的证据；仓库未附开源许可证；报告可能含源码和本地路径。

路线十来自 `Show HN: Farol – A risk map of a pull request for the person who approves it`。可照做内容包括 `farol.config.json` 配置表、`npx @winninjs/farol routes`、`impact <file>`、`analyze --base origin/main --head HEAD --out farol.json`、`html --in farol.json --out farol.html`、TypeScript/Go/Python 三套把 CI 报告喂给 Farol 的命令、GitHub Action 三个 job 形状、`analyze --since <sha>`、Datadog `usage` 与配置、`farol calibrate`、非 GitHub 平台用 `report`。设计主张：`analyze` 从不执行被分析代码、从不上网；确定性，同一 PR 每次同样报告，每条结论带调用链；读不懂标 `unknown` 并要求 careful review，fail closed；Shadow mode 只提示，从不批准、从不 request changes、从不 fail check。限制：评分和 verdict 阈值是启发式、只在少数仓库上查过；输入材料在“对应的研究问题”处截断，后续能力发现、限制、效果数据未提供；没有准确率、误报率、节省时间等量化数据。仓库 MIT 许可。

路线十一来自 `kyy-logs/code-review-skill`。可照做内容包括安装命令、worktree 和 commits 两种模式、输出目录与四个 probe JSON、证据契约字段、`references/probes.yaml`、`CODE_REVIEW_RULES_DIR`、`scope → probes → sync → reconcile → report → gate` 流程、required-probe 失败和未关闭 high findings 阻断合并。数据：52 个离线 pipeline、NEWS 和安装测试；11 例历史 Java 回归（2026-10-29）11/11 完成，静态评审，原始行为目标 5/5 命中，加上两个独立确认的边界案例后为 5/7 必需目标，干净和修复对照 4/4 通过且未误阻断，33 条原始发现（8 high、20 medium、5 low），0 条确认误报，未验证项仍 open，完整 merge gate 没有运行；两个确认漏报是 Keycloak 的合法 `tileVisible` 字符串写法绕过校验，以及 Kestra 的 JSON render/parse round-trip 破坏含引号、反斜杠或换行的命令值。9 例扩展（2026-10-30）独立运行，9/9 完成，36/36 probe records，0 probe 错误或跳过，正向目标 4/6，修复对照 3/3 不再报告，22 条原始发现（7 high、13 medium、2 low）；该旧运行使用了 reviewer（5 run / 4 skip），而当前 skill 已没有独立 reviewer，作者明确说不要把两批合并成 20/20 的结论；确认漏报包括 x01 的合法 `d` flag 和 x04 的取消/加载生命周期。作者主张：`no self-grading`、`separation of duties`、`auditable output`、`machine-checkable gate` 有架构描述支撑，但四个 probe 仍使用同一模型，属于职责分离，不是独立人类裁决；实际速度和 token 节省明确写为未验证；并发缺陷检测未验证；不是通用召回率声明；评估 harness 和原始报告未放在公开仓库；当前是 beta，schema 和 gate behavior 在 1.0 前可能变化，严重级别从四级改为三级，旧记录中的 `critical` 不兼容。

路线十二来自 `alpcanaydin/rexmod`。可照做内容包括完整安装/更新/卸载命令、安装器逐条副作用清单、键位表、排障命令与日志路径、四步循环、评论落盘位置 `.git/rexmod/`、Last Turn 用一次性 git index 写两次快照且不影响你的 index、`rexmod open file:line` 主动把文件推到编辑器、Codex `/hooks` 信任和 OpenCode 退出一次的前置动作。限制：单作者、仓库仅 30 stars；非官方二进制 patch；平台与宿主 app 双重绑定（Apple silicon Mac + Rex）；没有效果数据、评审提效数字、返工率、用户案例或对照；demo 视频是加速播放的一分钟；两个 Codex pane 同仓库时无法判定归属，评论留 pending 而不是猜；评论不会发给 Rex 外的 agent；Sparkle 更新不了打过补丁的 Rex，需自建更新通道。这些结构细节可信度较高，但效果主张和体验描述只是作者主张。

路线十三来自 `@jiayuan_jy` 推文。可照做内容包括两条 prompt 规则：每次 review 都当成独立审查者、不被上下文影响；安全审查必要但不过度，极端边界 case 由 agent 判断可不作为 block。前提是 issue 内容、代码 diff、新会话和人工复核。限制：原文只有规则，不是完整流程或工具配置；没有示例 diff、审查输出、误报或漏报数据、模型信息；“对抗式”没有定义；文本只到第 2 条，可能被截断；第 2 条把边界判断交给 agent 有漏掉真实风险的可能；安全关键系统不适用；互动数据点赞 25、转发 1、回复 8 只能说明关注度。

新旧做法差异：原有路线零到十二保留；本次新增路线十三。十四条路线阶段不同，可叠加；若只能选一个，先按你的主要缺口选。路线十三补的是评审者角色约束，不替代路线三的对抗性深挖，也不替代测试、CI、人工审批、理解确认、记录层、风险地图和可审计证据链。

## 依据的调研

- [coldteadotai/pr-lens](../research/radar/2026-10-02/601-coldteadotai-pr-lens.md)：值得一试，建议选一个非关键仓库和一批中等规模 PR 做小范围试点：用 CLI 或 GitHub App 把改动画成架构/数据流图再进入评审，并用“命名修正条数、validate 通过率、评审中的理解性问题数量”判断是否真的省事。理由是该 README 给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式，但全部收益主张都只是作者自述，没有任何对比或量化效果数据。
- [openqodex/openqodex](../research/radar/2026-10-07/1814-openqodex-openqodex.md)：值得一试，可以在一台 macOS/Linux 机器上用 `npx openqodex demo` 加一个非关键仓库的 `npx openqodex init` 做小范围试用，按“报告是否退出码 2、每条扫描告警是否有理由、每个改动行是否送到 reviewer 面前”三点验收；理由是它把“确定性扫描器 + 独立 LLM 评审逐条核对 + 完整性断言”做成了一条命令的流程，可复制的命令和配置原文都给全了，但项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1–3 分钟且消耗你自己的 Claude Code/Codex 额度，还不够格直接当默认门禁。
- [@twostraws: 在当前的 Codex 重置狂热中，我在 Ultra 上释放了 Astra 6，它用一些真正令人惊叹的作品让我震惊。使用这些提示：](../research/radar/2026-10-09/2116-codex-ultra-astra-6.md)：值得一试，把这条“对抗性审查 + 子代理 + 双重核验后入列”的提示词直接拿到一个中小型代码仓库上试跑一遍，用真实缺陷命中率和误报率判断是否值得固化进审查流程；理由是原文给了一条可原样复制的提示词且内置了二次核验环节，但整条线索被截断、没有任何结果数据，只能小范围验证。
- [@riba2534: #claudecode Claude Code 里面内置了很多有用的功能，我以为是人人都知道,但好像很多人不知道。](../research/radar/2026-10-11/2564-claudecode-claude-code.md)：值得一试，下次在 Claude Code 里审代码时，直接用内置的 /code-review（别名 /review）并按其强度档位和 --fix/--comment 开关跑一遍，先小范围试，因为原文给出了可照输入的命令与参数，但正文被截断、具体拼接语法和前置条件缺失，需对照官方文档确认后再正式写入手册。
- [Show HN: Deslop – Oxlint rules for AI-generated TypeScript](../research/radar/2026-10-14/3159-show-hn-deslop-oxlint-rules-for-ai-generated-types.md)：值得一试，建议在 TypeScript + Oxlint 项目中接入 ai-deslop 的 recommended 配置做小范围试用，用真实 AI 生成 diff 验证命中率和误报；README 给出了可直接复制的安装与配置、规则清单，但没有效果数据，且规则较主观，只有适配的团队才应保留。
- [Uber’s AI infra, from the inside](../research/radar/2026-10-15/3452-uber-s-ai-infra-from-the-inside.md)：值得一试，建议小范围试其中能脱离 Uber 基础设施复现的流程性做法——给 PR 按类型（feature/bugfix/maintenance/testing/docs）打标以替代速度指标、把 lint/build 等简单检查前移到 agent 开 PR 之前、对 AI 花费设额度加经理例外审批；理由是原文只给出 Uber 内部系统的一句话级描述，没有可复制的配置、命令或提示词，但这几条流程本身可以照做，且有方向性结果（token 成本近几个月降约 50%、feature PR 占比上升、maintenance 占比下降）。
- [How the Claude Code team does code review](../research/radar/2026-10-16/3934-how-the-claude-code-team-does-code-review.md)：建议采用，按原文「How you can adopt this process」的分阶段清单落地：先在一个仓库用简短的 CLAUDE.md、REVIEW.md 和 agent 可运行的检查打底，再接入 AI 审查、用风险分级控制人工审批数量，并以回滚率和事故率作为护栏；因为这是已在实际团队跑通、给出了具体配置项、命令和度量指标的流程，而不是泛泛观点。
- [Show HN: Sphinx – A hook that quizzes you on your AI's code before shipping](../research/radar/2026-10-18/4593-show-hn-sphinx-a-hook-that-quizzes-you-on-your-ai-.md)：值得一试，可以在非关键的 Git 仓库里安装 Sphinx 跑一遍完整流程（npm install -g sphinx-understand → sphinx install → git push 并在被保护分支上回答提问），因为它把「提交前是否真的理解 agent 写的代码」做成了一个有安装命令和明确触发点的可执行检查；但原文只有产品页级说明、示例对话还自标为虚构，且是刚发布的 Show HN 项目，所以只适合小范围试，不建议直接写进手册。
- [Ask HN: How to deal with shipping AI-written code you don't understand?](../research/radar/2026-10-20/5062-ask-hn-how-to-deal-with-shipping-ai-written-code-y.md)：值得一试，建议把 AI 生成代码纳入“先写失败测试、设计文档门禁、多层自动化验证、小步审查”的流程中小范围试用；理由是多位实践者用类似做法在真实项目中运行数月，能在不逐行审查的情况下建立可验证的信心。
- [Monopoly0024/simple-reviewer-v1](../research/radar/2026-10-23/6312-monopoly0024-simple-reviewer-v1.md)：值得一试，建议把它作为 Codex 编码代理的“先审阅、后验收”环节小范围试用：按 README 安装完整技能，用目标定义验收项并声明只审不改，再运行报告生成与示例校验。理由是它给出了可复制的安装、调用、报告生成和证据快照流程，但生成器只校验记录、不执行检查，且仓库未附开源许可证，采用前需确认授权并用自有代码验证效果。
- [Show HN: Farol – A risk map of a pull request for the person who approves it](../research/radar/2026-10-26/7024-show-hn-farol-a-risk-map-of-a-pull-request-for-the.md)：值得一试，在一个真实仓库上用纯 CLI 模式试跑 farol（不改 CI、不阻塞合并），把它给出的 verdict/score 与你人工判断的风险做对照，跑通后再接成 GitHub Action；理由是原文给出了可直接照抄的配置、命令和三语言 CI 接法，属于确定性静态分析、定位清晰（AI 评审之后的风险聚焦层），但评分阈值只在极少数仓库上校准过，必须先用自己的历史验证。
- [kyy-logs/code-review-skill](../research/radar/2026-10-31/8971-kyy-logs-code-review-skill.md)：值得一试，建议在非关键仓库或历史提交上小范围试用：先按 README 安装，并用 worktree 和 commits 两种模式跑通，验证四路探查、证据契约和 JSON 门禁是否真正可审计。暂不 adopt，因为它是 beta，现有验证只是回归样例，未证明通用召回率，并发缺陷检测也未验证。
- [alpcanaydin/rexmod](../research/radar/2026-11-02/9579-alpcanaydin-rexmod.md)：值得一试，在 Apple silicon Mac + Rex + Claude Code/OpenCode 的组合下，照 README 的三条命令装好后，用 3–5 个真实小任务跑「每轮看 Last Turn → 行级评论 → 评论随下条消息回灌」的闭环，验证是否真的减少返工；理由是它把人工复核智能体产出这件事落到了具体键位、具体存储（.git/rexmod/）和具体 hook 接法上，可照做，但属于非官方二进制 patch、单作者 30 stars、平台与宿主 app 双重绑定且有已知 Codex 多 pane 缺陷，先小范围试。
- [@jiayuan_jy: 让 Agent 做对抗式 code review 的 prompt：](../research/radar/2026-11-04/10211-agent-code-review-prompt.md)：值得一试，把这两条规则作为“独立审查者”提示词，先小范围用于普通代码 review，并保留人工复核边界与安全判断；原因是原文给出了可直接照搬的规则，但只有两条、无完整流程和验证数据，还不足以直接全面采用。
