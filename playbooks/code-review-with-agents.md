# 让 AI 写的代码在合并前被审查、验证并真正理解

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 写得比人读得快，这篇手册给出九条可叠加的做法，让 AI 生成的代码在合并前经过机器审查、分层验证和提交者本人的理解确认。
> 先试这一步：下一次让 agent 写功能时，先让它写测试，你亲眼看到测试失败，再让它写实现。
> 最近修订：2026-10-20

## 解决什么问题

代码评审有六个常见缺口：评审者通常只拿到 diff，系统结构怎么变、数据怎么流要靠脑补；push 前又缺少一遍可核对的自动评审，扫描告警是否落在改动行、每条告警是否被处理、每个改动行是否送到 reviewer 面前，容易漏；常规评审是被动等告警，缺少主动的对抗性漏洞寻找；AI 生成的 TypeScript 代码常出现低证据、低信号模式，人工评审容易放过，也缺少确定性的 lint 门；如果你已经在用 Claude Code，它内置了 `/code-review`（别名 `/review`）这类专门审代码的命令，但这条来源是个人推文且正文截断，参数拼接语法、权限和配置都需要先对照官方 Commands 文档确认；即使有了 AI 评审，如果只按 PR velocity 看速度，agent 可以轻易造出大量没有业务影响的 PR。Uber 内部把这几点当成流程问题处理：PR 按 `feature`、`bugfix`、`maintenance`、`testing`、`docs` 打标，简单检查前移到 agent 开 PR 之前，AI 花费走额度加经理例外审批，评审前先跑 AI 评审并附风险分和截图。

Claude Code 团队公开的代码审查流程补上了另一条线索：不要问有没有人读过这段代码，要问这个变更可能出什么问题、哪一层检查最适合抓它。审查从路尽头的关卡变成写代码时的拼写检查，大多数变更在人类看之前已被 Claude 至少审过并修过一轮；目标状态是大多数 PR 至多一个人类在环，且回滚率和事故率不上升。原文给出的背景数据是：Claude 写了约 90% 的 Claude Code 自身代码；2026 年 6 月到 9 月，合并进 Claude Code 代码库的 PR 翻了一倍多，而被回滚的比例下降超过 40%；Anthropic monorepo 每天落地的变更从 5 月约 2,500 涨到 9 月超过 30,000。

还有一个更靠前的缺口：agent 写得越来越快，但 push 之前没有人确认提交者本人是否真的读懂了这份改动。Sphinx 把这件事做成一个 Git hook——在 agent 生成的代码被 push（尤其是受保护分支）之前，它读 diff，向你提一个关于「这段改动的某个部分在出问题时会发生什么」的问题，答对才放行 push，答错会解释原因并换一个场景重试。它补的是「提交者是否理解」这一层，而不是「代码是否正确」这一层。

即使审查和扫描都到位，还有一个更根本的缺口：AI 写得比人读得快，逐行检查不现实，团队可能交付自己不完全理解的系统。Ask HN 讨论里，一派主张「逐行审查不可持续，应转向测试和验证」，另一派坚持「必须完全理解才能交付生产代码」。可操作的交集是：先让 AI 写测试并亲眼看到失败，用特性设计文档和 RCA 做人工门禁，再用静态分析、SAST、fuzzing、mutation testing 和多架构 gate 分层验证，把逐行阅读集中在生产代码和高风险改动上。

## 适用与不适用

适用：

- 想让评审者在读 diff 前先看到系统结构和数据流变化。
- 有 GitHub、GitLab、Bitbucket 之一，或愿意在本地终端先看图。
- 想在 push 前先让 AI 做一遍评审，减少漏检、遗漏 suppression 注释和被改动的 scanner 配置。
- 有 macOS、Linux（Windows 用 WSL）、Node 22+、git，且已登录 Claude Code 或 Codex。
- 愿意用小范围试点验证收益，而不是直接全仓库推开或直接当默认门禁。
- 想让编码代理主动找漏洞，而不是只等扫描器出告警；所用工具支持子代理或子任务机制；愿意人工逐条复核代理核验过的问题列表。
- 已经在用 Claude Code，且有代码或 PR 需要审查：可以直接试内置的 `/code-review`（别名 `/review`）。
- 项目使用 TypeScript，并且已经使用 Oxlint，且运行环境支持 oxlint JS 插件（Bun、Deno 或 Node.js）。
- 有代码托管平台，PR 系统支持标签，能按标签统计。
- 能在仓库里提供一条本地校验命令（lint + build + 格式或模板检查的聚合脚本），且这些检查能在本地几分钟内跑完。
- 可选：能按用户统计 AI 编码工具的 token 花费；有平台或基础设施团队才考虑模型网关与多 harness 封装。
- 已有 Claude Code 可用，仓库里有测试、构建、截图等可执行验证手段。
- 能写简短的 `CLAUDE.md`，能配置 hooks 自动跑 formatter 和 linter。
- 有 CI、分支保护、CODEOWNERS，能加阻断性检查和安全审查。
- 具备 merge queue、feature flag、分阶段发布和一键回滚能力。
- 能收集过去引发事故的 PR 连同修复和回滚，供熟悉代码的工程师逐条确认后做 eval 集。
- Claude Code Team 和 Enterprise 计划已 GA 的 Code Review for Claude Code，可按仓库设 Quick、Standard、Deep。
- 新增：想让「提交者本人是否读懂这份 agent 写的改动」变成 push 前必须回答的问题，而不只是确认代码对不对。
- 新增：有一个能设置受保护分支的 Git 仓库，运行环境是 macOS、Linux 或 WSL，Node 22.19+。
- 新增：愿意先在一个非关键的个人仓库或小团队非主干分支上试一个新项目，能接受它长期维护状况未知。
- 新增：想让 AI 先写测试、你亲眼看到失败再让它实现，用测试而不是逐行阅读建立信心。
- 新增：团队愿意为新功能写特性设计文档和实现计划、为修复写 RCA，并把这些文档设为 AI 动代码前的人工检查点。
- 新增：有 CI 和多架构测试能力，愿意在发布前跑耗时 gate，并保持提交小而集中。
- 新增：想用 fuzzing、chaos、mutation testing 提高对测试本身的信心。
- 新增：想区分生产代码和一次性工具的审查强度。
- 新增：想在不逐行读代码的前提下，让 AI 解释关键部分并由你自己核实。

不适用或要谨慎：

- 关键仓库、合规要求高的仓库：几个调研都只建议先在非关键仓库试点。OpenQodex 仍用 Claude Code 或 Codex 作为 reviewer，数据边界要按你对这些 agent 的既有合规判断处理；Claude Code 内置 `/code-review` 同样是在 Claude Code 里跑，代码内容会进入该会话的上下文。
- 需要 PR 评论随 push 更新和复选框切换视图：PR Lens 只有 GitHub App 版本支持，Action、GitLab、Bitbucket 做不到或受限。
- Bitbucket 上 fork 来的 PR：PR Lens pipeline 不会触发。
- 不想把 diff 发给模型 provider：PR Lens CLI 只把 diff 发给所选的 provider，但仍然是外发。OpenQodex 除 Claude Code 或 Codex 外不需要别的 key、账号或服务器，但 reviewer 本身是这两个 agent。Sphinx 也需要选一个审查模型，diff 会进入该模型的上下文。
- 没装 Claude Code 或 Codex：OpenQodex 只能跑 `openqodex scan` 或 `review --agent`。不使用 Claude Code 的人也无法用 `/code-review`。
- 想用 Cursor 或 Cline 当 OpenQodex reviewer：原文明确 No Cursor reviewer，理由是 `cursor-agent` 无法把工具限制到只读，也无法跳过你的规则和设置；Cline 也没有被列为 reviewer。
- OpenQodex 项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1 到 3 分钟且消费你自己的 Claude Code 或 Codex 额度，还不够格直接当默认门禁。
- Claude Code `/code-review` 的来源是个人推文，不是 Anthropic 官方文档；互动数据为 likes 24、reposts 3、replies 2，属于小范围传播，不能作为功能有效性的证据。
- `/code-review` 正文在审代码这一段后就截断了，缺参数拼接语法、缺档位全名、缺权限与配置说明、缺适用版本。实际使用前必须对照官方 Commands 页面确认。
- `/code-review` 的专找正确性 bug 和走云端深度审查是作者对行为的概括，未附任何案例、命中率或对比数据。
- 如果 `/code-review` 的误报率高到需要逐条反驳，或没有明显优于纯人工，就只保留在知道有这条路的层面。
- 对抗审查依赖所用编码代理支持子代理或子任务机制；不支持的话，这条提示词会退化成普通的找漏洞指令。
- 双重检查由同一个模型完成，存在自我确认偏差的可能；人工抽检或全检是必要的。
- 非 TypeScript 项目，或没有 Oxlint 和 JS 插件运行时的项目，不适用 ai-deslop。
- 团队不接受规则直接拒绝已接受的写法，如 `no-object-parameters`、`no-unknown-parameters`、`no-module-mocking`，不要全量启用 ai-deslop 的 recommended。
- ai-deslop 部分标准规则需要 type-aware linting；部分规则没有 fixer，修复需要人工。
- Uber 路线素材是节目页的 11 条要点，不是完整文字稿；没有任何可复制的配置、提示词或命令；唯一出现的 `afx validate` 是 Uber 内部命令。
- 所有 Uber 系统，包括 Model Gateway、AIFX、MCP Gateway、Code Review、CostCheck、Minion、Slate，都是 Uber 内部实现，未给出开源地址或架构细节。
- Uber 的城市作为一等原语、按城市分片数据库、每城市绑定云区域并可随时故障转移等前提，一般组织不具备，直接照搬会失真。
- Claude Code 团队流程是团队级做法，不是零成本开关；没有 CI、分支保护、merge queue、feature flag 和一键回滚时，只能做其中一部分。
- `REVIEW.md` 要由 code owners 写，不是普通文档；如果没人维护，审查者会继续按自己的默认标准判断。
- 风险分级和只让 trusted list 作者走轻路径会改变团队权限结构，需要先写下来并从严开始。
- agent 的审批永远不能算作人类审批，也不能填补一个要求人类的槽位。
- 审批只覆盖某一个具体 commit；有系统无法担保的新 commit 落地时，审批必须重新给。
- 原文明确还没有在回滚或事故指标变动时自动收紧审批的 circuit breaker；在更多代码走向零人工合并之前，这是一个已知缺口。
- 审查噪声对 agent 作者代价更高。人能几秒钟摆手放掉一个 nit，agent 会去修，意味着又一个 commit、又一轮审查。
- 新增：Sphinx 是刚在 Show HN 发布的新项目（FOSS、Free），长期维护与稳定性未知；只适合小范围试，不建议直接接到团队主干仓库或当成默认门禁。
- 新增：Sphinx 原文只有产品页级说明；文中那段 Sphinx 与用户的对话被明确标注为 \"An illustrative exchange. Real questions come from your diff.\"，即举例是虚构的，不能当作实测案例。
- 新增：Sphinx 只对「提交者本人是否理解」有效，无法验证代码本身的正确性；它不是 `/code-review`、OpenQodex 这类 bug 审查的替代品。
- 新增：`sphinx yolo` 是全局逃生阀，存在被习惯性使用而架空检查的风险；原文说会记录日志，但没说日志是否强制可见或告警。
- 新增：Sphinx 需要 Node 22.19+，原文未提 Windows 原生；提问质量和 token 消耗都只有作者自述，没有评测数据。
- 新增：Ask HN 路线是评论集合，不是教程；没有可直接复制的命令、配置或提示词，所有步骤要按项目自行设计。
- 新增：样本偏有经验的工程师，缺少对照实验；「测试先失败后通过」「mutation testing 提高信心」都是实践者经验，不是严格对照实验。
- 新增：没有测试基础设施、文档习惯、CI 和审查时间的项目，只能做其中一部分。
- 新增：团队不接受文档开销时，不要上特性设计文档和 RCA 门禁。
- 新增：多架构 gate 跑数小时，CI 预算不够就只能选关键架构。
- 新增：AI 解释可能不准确，必须自己研究核实；没有核实时间就不要用这条。
- 新增：形式化验证/设计合同是长期方向，不是可立即落地的流程。
- 新增：认为「必须完全理解每一行才能交付生产代码」的团队，这条路线的前提与你们的要求冲突——它用测试和文档门禁替代逐行阅读，而不是替代理解责任。

## 前置条件

Claude Code 内置 `/code-review` 路线：

- 已在工作环境里装好并登录 Claude Code。
- 有需要审查的代码或 PR。
- 原文未说明所需权限与配置。`--comment` 需要能把结果发到 PR；`ultra` 走云端。这两条是推断，使用前请对照官方文档确认。
- 官方 Commands 页面，用于确认合法档位、参数拼接语法、权限和适用版本。

PR Lens 路线：

- 目标平台有安装权限或 CI 配置权限。
- 路线 A（GitHub App）：能在目标仓库安装 GitHub App。
- 路线 B 和 C（编码代理）：本机有可用的编码代理，以及 `gh` CLI。
- 自托管 CI 路线 D、E、F：准备模型 key；示例默认 provider 是 Gemini，所以示例用 `GEMINI_API_KEY`。
- 本地 CLI 路线 G、H：Node 20.11+；key 从环境变量读，不走命令行参数。

OpenQodex 路线：

- Node 22 或更新加 git；macOS 或 Linux（Windows 用 WSL）。
- 装好并登录 Claude Code 或 Codex。reviewer 只能是这两个。
- 要跑 brakeman 或 rubocop 需要 Ruby 2.7 或更新，golangci-lint 需要 Go。OpenQodex 不替你装语言运行时。
- 首次运行要下载扫描器；osv-scanner 需要能访问 osv.dev。semgrep 每次运行从 registry 拉规则包。
- 默认 `auto` 的 reviewer 挑选顺序是：你运行命令时所在的 agent、Claude Code、Codex。
- 关掉 reviewer 的联网工具：在 `~/.openqodex/config.yaml` 里写 `reviewer_web: off`。
- 自定义扫描器必须经 `npx openqodex trust` 批准。

对抗审查路线：

- 一个代码完整、能运行或至少能被代理读全的仓库。
- 一个支持子代理或子任务机制的编码代理工具。
- 确认上下文窗口足够装下项目的主要代码结构。
- 代理需要读全项目的权限、允许自行派生多个子代理，以及一个可持久化的问题列表。

ai-deslop 路线：

- 项目使用 TypeScript。
- 项目已经使用 Oxlint。
- 运行环境支持 oxlint JS 插件（Bun、Deno 或 Node.js）。
- 安装为开发依赖：`npm install --save-dev ai-deslop`；`@oxlint/plugins` 会作为运行时依赖一起装上，保持与 oxlint 版本同步。
- 项目有 Oxlint 配置入口。
- 部分标准规则需要 type-aware linting；opt-in 规则的完整配置在 `docs/*.md`。

Uber 内部流程的可迁移部分：

- PR 系统支持标签，能按标签做统计。
- 仓库里能提供一条本地校验命令（lint + build + 格式或模板检查的聚合脚本），且能在本地几分钟内跑完。
- 可选：能按用户统计 AI 编码工具的 token 花费。
- 可选：已有 AI 代码评审能力，能对 diff 打风险分，能在适用时附功能截图或录屏。
- 可选：有平台或基础设施团队，才考虑模型网关、AIFX 这类多 harness 封装。

Claude Code 团队流程路线：

- 已有 Claude Code 可用。
- 仓库里有测试、构建、截图等可执行验证手段，agent 可以自己跑并展示输出。
- 能写简短的 `CLAUDE.md`，并配置 hooks 自动跑 formatter 和 linter。
- 有 CI、分支保护、CODEOWNERS，能加阻断性安全审查和常规阻断检查。
- 有 PR 模板，能加 `Testing`、`Risk`、`How to revert` 三个字段。
- 具备 merge queue、feature flag、分阶段发布和一键回滚能力。
- 能收集过去引发事故的 PR 连同修复和回滚，请熟悉那段代码的工程师逐条确认是什么 bug、在哪里。
- Claude Code Team 和 Enterprise 计划已 GA 的 Code Review for Claude Code，可按仓库设 Quick、Standard、Deep。

Sphinx 路线：

- Node 22.19+；macOS、Linux 或 WSL（原文未提 Windows 原生）。
- 一个 Git 仓库，且能对目标分支设置保护。
- 在 `sphinx install` 时选定一个审查模型：可以复用你现有的编码 agent，也可以走 OpenRouter 或任何 OpenAI 兼容端点。
- 愿意先在一个非关键仓库试，不接团队主干。

路线八（先失败测试、文档门禁、分层验证）：

- 项目有可运行的测试框架和明确验收标准。
- 能搭建端到端测试环境。
- 团队接受文档开销，并设置人工审查批准检查点。
- 有文档维护习惯，能维护全局高层架构文档和子组件设计文档。
- 有 CI 和多环境/多架构测试能力。
- 工具链已配置：编译、静态分析、SAST、linters、风格检查、测试。
- 可选：fuzzing、chaos、mutation testing 工具和运行预算。
- 能明确代码影响范围，区分生产代码和一次性工具。
- 保留人工验证 AI 解释的时间。

## 操作步骤

先选路线：

- 已经在用 Claude Code，想先试最省事的内置审查：走路线零，做法 S。
- 只想最省事、不需要自己的模型 key，或想让 PR 评审者先看懂结构和数据流：走 PR Lens，做法 A 到 I。
- 想在 push 前先跑可核对的 AI 评审：走 OpenQodex，做法 J 到 Q。
- 想让编码代理主动对抗性找漏洞、并先做二次核验：走对抗审查路线，做法 R。
- 想在 AI 生成的 TypeScript 进入评审前先过一道确定性 lint 门：走 ai-deslop，做法 T。
- 想在流程层面把简单检查前移、按类型度量 PR、控制 AI 花费：走路线五，做法 U。
- 想按 Claude Code 团队公开的团队级流程，把读 diff 交给机器、人只做关键决策：走路线六，做法 V。
- 想在 push 前确认自己真的读懂了 agent 写的改动，而不只是确认代码对不对：走路线七，做法 W。
- 想在不逐行读代码的前提下，靠先失败测试、设计文档门禁和分层验证建立可验证的信心：走路线八，做法 X。
- 九者可叠加，阶段不同。若只能选一个，先按你的主要缺口选。

### 路线零：用 Claude Code 内置的 `/code-review`（做法 S，最省事，如果已在用 Claude Code）

前提：已在工作环境里装好并登录 Claude Code；有需要审查的代码或 PR。原文未说明所需权限与配置；`--comment` 需要能把结果发到 PR，`ultra` 走云端，这两条是推断，使用前先查官方 Commands 页面。

1. 在需要审查的代码上打开 Claude Code 会话。
2. 输入审查命令：

```text
/code-review
```

原文标明它的定位是专找正确性 bug，别名是 `/review`，两者等价。
3. 选择审查强度：原文只给出区间 low 到 max，未列出完整档位名称，也未给出传参写法。使用前先在官方 Commands 文档里确认合法档位与写法，不要照猜。
4. 想让 AI 直接改代码时加上 `--fix`。
5. 想让结果发布到 PR 时加上 `--comment`。
6. 需要更深的审查时用 `ultra`，原文说明它走云端深度审查。原文未给 `ultra` 的调用写法，需查文档。
7. 其余内置命令与完整参数，去原文链接的 Commands 页面查。

预期结果：Claude Code 会针对正确性 bug 给出审查结果；若加了 `--fix`，它会直接改；若加了 `--comment`，结果会发到 PR。但强度档位、`ultra` 写法、权限和配置因原文截断无法确认。

### 路线一：让评审者看懂改动（PR Lens）

先选路线：

- 只想最省事、不需要自己的模型 key：做法 A。
- 想让编码 agent 画图并挂到 PR：做法 B；想连整套安装也让 agent 做：做法 C。
- 要用自己的 CI 和 key：做法 D（GitHub Action）、做法 E（GitLab CI/CD 组件）、做法 F（Bitbucket pipe）。
- 想在 PR 之前先在终端看图：做法 H，配合做法 G 的 CLI。
- 图里名字错了要持续修正：做法 I。

#### 做法 A：装 GitHub App

在任意仓库安装 App，安装地址 `https://github.com/apps/coldtea-pr-lens`；开一个 pull request，图出现，并在每次 push 时更新同一条评论。原文称对开源免费。只有 App 版本支持评论里的复选框。

#### 做法 B：让编码代理画图并挂到 PR 上

前提：本机有可用的编码代理，以及 `gh` CLI。

```bash
npx skills add coldteadotai/pr-lens
```

然后对代理说：

```text
Diagram the change you just made with PR Lens and attach it to the pull request.
```

代理会读 diff、写图文件，反复跑下面这条直到全部检查通过，再用 `gh pr create --attach` 把图附加到 PR 描述里：

```bash
npx @coldtea/pr-lens-cli validate
```

关键约定：图里名字错了不要改生成的 SVG，改 `.github/pr-lens.yml`。

#### 做法 C：想让代理把整套装好

原文给出的整段提示词：

```text
Set up PR Lens for me. It draws code changes as moving diagrams of the system and how data flows through it.

1. Install the agent skill: `npx skills add coldteadotai/pr-lens`.

2. Help me install the GitHub App at https://github.com/apps/coldtea-pr-lens on every repository where I review pull requests. It posts one comment per pull request and updates that comment on every push. It does not need a model key from me.

3. If I'd rather run it from CI with my own model key, offer the Action instead: `.github/workflows/pr-lens.yml` using `coldteadotai/pr-lens/packages/action@v0`, with the key saved as a repository secret. It works with any service that speaks `/chat/completions`, such as OpenAI or Gemini.

4. Then test it: diagram the latest change in this repository and show me the SVGs or the canvas.
```

#### 做法 D：GitHub Action

提交下面这个文件为 `.github/workflows/pr-lens.yml`：

```yaml
name: PR Lens

on:
  pull_request:

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: pr-lens-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  lens:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: coldteadotai/pr-lens/packages/action@v0
        with:
          api-key: ${{ secrets.GEMINI_API_KEY }}
```

已知限制：Action 在两次运行之间不保留状态，所以评论发出后不会更新，复选框只在 App 里可用。

#### 做法 E：GitLab CI/CD 组件

前提：添加两个 masked 变量：模型 key，以及一个带 `api` scope 的 project access token，`CI_JOB_TOKEN` 不能发评论。另外 `workflow: rules` 必须写在**你自己的** `.gitlab-ci.yml` 里。

```yaml
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

include:
  - component: gitlab.com/coldteadotai/pr-lens/pr-lens@0.1.0
```

注意：GitLab.com 上 project access token 需要 Premium 或 Ultimate；Free 档可用带 `api` scope 的 personal access token，但评论会显示你的名字而不是机器人。SVG 以附件形式上传到项目：私有项目里任何拿到附件链接的人都能看到图；若项目开启 Require authentication to view media files，图不会加载。

#### 做法 F：Bitbucket pipe

```yaml
clone:
  depth: full

pipelines:
  pull-requests:
    "**":
      - step:
          name: PR Lens
          script:
            - pipe: docker://ghcr.io/coldteadotai/pr-lens-pipe:0.1.0
              variables:
                GEMINI_API_KEY: $GEMINI_API_KEY
                PR_LENS_TOKEN: $PR_LENS_TOKEN
```

已知限制：Bitbucket 评论是纯 Markdown，没有折叠段、没有明暗成对图；fork 来的 PR 不会触发 pipeline。

#### 做法 G：本地 CLI 一步步来

前提：Node 20.11+；key 从环境变量读，不走命令行参数。

```bash
export GEMINI_API_KEY=…

npx @coldtea/pr-lens-cli analyze --base origin/main
npx @coldtea/pr-lens-cli render .pr-lens/graph.json
npx @coldtea/pr-lens-cli comment --graph .pr-lens/<drawing>/drawn.graph.json --manifest .pr-lens/<drawing>/manifest.json --asset-base-url https://raw.githubusercontent.com/owner/repo/pr-lens/42
npx @coldtea/pr-lens-cli validate .pr-lens/graph.json .github/pr-lens.yml
npx @coldtea/pr-lens-cli export .pr-lens/graph.json -o .github/pr-lens.map.json
```

要点：产物都落在 `.pr-lens/`，CLI 首次写入会自动把它加进 `.gitignore`；唯一值得提交的是 `export` 写出的 map 文件。`--out` 可改输出位置；`comment --target gitlab` 或 `--target bitbucket` 可产出对应平台能显示的评论；`analyze` 会从 git remote 自动判断平台。接 Ollama、DeepSeek、OpenRouter 等任何说 `/chat/completions` 的服务用 `--provider openai-compatible --base-url <url>`。

#### 做法 H：PR 之前先在终端看图

```bash
npx @coldtea/pr-lens-cli analyze --base origin/main
npx @coldtea/pr-lens-cli render .pr-lens/graph.json
open .pr-lens/*-dark-*.svg
```

这条用来审 agent 刚写的代码：让写代码的 agent 把改动画出来，自己对着 diff 看图，比 PR 上出现同一张图早几分钟。

#### 做法 I：用配置文件做持续修正

路径：GitHub 用 `.github/pr-lens.yml`；GitLab 和 Bitbucket 用 `.gitlab/pr-lens.yml`，具体键名以官方为准。图里名字错了不要改生成的 SVG，改这个配置文件。

### 路线二：在 push 前做可核对的 AI 评审（OpenQodex）

#### 做法 J：先看 demo，再给当前机器安装

```bash
npx openqodex demo
npx openqodex init
```

它会建一个小仓库、种入已知 bug 并扫描。安装后可以直接评审你当前的改动，或在没有改动时问你要评审什么。之后可以对 agent 说 review my change with openqodex，或自己跑 `openqodex review`。

#### 做法 K：给 agent 装 OpenQodex skill

```bash
npx skills add openqodex/openqodex
```

或把这段提示词粘进 agent：

```text
Install the OpenQodex skill with `npx skills add openqodex/openqodex`.
Then review my current change with openqodex and tell me the verdict and the findings.
```

#### 做法 L：日常评审与选择 reviewer

```bash
openqodex review
openqodex review --all
openqodex review <branch>
openqodex review '#42'
openqodex review --reviewer codex
```

`--all` 评审整个仓库；`<branch>` 和 `'#42'` 评审不是当前工作的分支或 PR，OpenQodex 会自己 fetch、checkout 到临时目录，只评审它离开 base 之后新增的内容。

选 reviewer：默认 `auto` 的挑选顺序是：你运行命令时所在的 agent、Claude Code、Codex。两个 reviewer 的隔离方式不同：

- Claude Code（`claude -p`）：只给 read、search、list 工具，在改动副本内运行，不带你的 settings、hooks、plugins、memory 或 instruction 文件；它的事件流记录每次读取，所以报告会列出它读过哪些文件。
- Codex（`codex exec`）：在只读沙箱里启动，读权限限制在改动副本和系统目录，命令无网络，不带你的 config、plugins、hooks 或仓库的 instruction 文件；但它仍会加载全局 `~/.codex/AGENTS.md`，而且事件流不显示每条命令，报告会注明读取未被记录。

关掉 reviewer 的联网工具：在 `~/.openqodex/config.yaml` 里写 `reviewer_web: off`。

#### 做法 M：读报告，并检查完整性

报告打在终端，同时写 `report.md`、`report.json`、`report.sarif`。判定评审完成的条件是三条同时成立：每个阶段都跑了、每条扫描告警都被提升或带理由丢弃、每一行改动都送到了 reviewer 面前。任何一条不满足就打 Review incomplete 并列出缺什么，退出码为 2。注意：只删除代码的改动也可能带告警，删除处相邻的行算作改动行。

#### 做法 N：接门禁与 CI

- push gate（Claude Code 和 Codex 各一套）加可选的 git pre-push hook：两者都只去找正好是这次要推送的内容的评审；默认 warn，只有 `.openqodex/config.yaml` 里设了 `review.block_on_severity` 才 block。
- GitHub Action：workflow 给了 Anthropic API key 时对 PR 跑完整评审，没给就只跑 `openqodex scan`。
- pre-commit hook：只跑扫描器，不是一次评审。

#### 做法 O：加自定义扫描器

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

改过这条配置就要重新批准。

#### 做法 P：扫描器安装与管理

首次使用会把扫描器下到 `~/.openqodex/tools/`，只下你这次改动需要的。单个安装超过 45 秒会转后台继续，报告里把它标为 installing，下次运行才加入。要一次装齐：

```bash
npx openqodex doctor --install
```

关掉 brakeman：`scanners.disable: [brakeman]`。

#### 做法 Q：离线与自动更新控制

`--offline` 会跳过 osv-scanner 和 semgrep，并关掉扫描器下载、版本检查、以及分支和 PR 评审的 fetch 和 `gh` 调用。自动更新用 `openqodex update --off`、`~/.openqodex/config.yaml` 里的 `update: off` 或环境变量 `OPENQODEX_AUTO_UPDATE=0` 关闭；`openqodex update --rollback` 回退。用 `npx openqodex guide <topic>` 可离线看文档页。

### 路线三：让代理做对抗性漏洞审查（做法 R）

前提：准备一个代码完整、能运行或至少能被代理读全的仓库；使用一个支持子代理或子任务机制的编码代理工具；确认该工具的子代理功能已打开；确认上下文窗口足够装下项目的主要代码结构。

1. 在代理会话中**原样粘贴**下面这条提示词：

```text
彻底检查这个项目，寻找漏洞。将它视为对抗性审查，使用你想要的任意多子代理。当一个问题返回时，双重检查它是否正确，并将已检查的问题添加到列表中。
```

2. 允许代理自行决定子代理数量。
3. 要求代理对每条问题做二次核验。
4. 把通过核验的问题写入列表。原文没有说明这个列表是什么载体，需要你自己指定输出位置，例如让代理写入仓库根目录下的一个 Markdown 文件。
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

3. 用项目现有方式运行 Oxlint。重点观察 recommended 规则报告的问题。recommended 覆盖三类：类型安全与证据（`no-chained-type-assertions`、`no-unknown-parameters`、`no-unknown-returns`、`require-safety-comment-for-type-assertion`）、代码质量与 API（`no-array-filter-map`、`no-reduce-accumulator-copy`、`no-reflect-apply`、`no-reflect-get`）、测试（`no-call-only-assertions`、`no-module-mocking`、`no-poor-substring-tests`、`no-repeated-expect-call`）。同时 recommended 还启用若干标准规则：`typescript/no-deprecated`、`typescript/no-require-imports`、`typescript/no-floating-promises`、`typescript/no-unnecessary-condition`、`no-unreachable`；其中部分规则需要 type-aware linting。
4. 如需更强检查，再按文档启用 opt-in 规则：`no-duplicate-consts`、`no-duplicate-types`、`no-renamed-imports`、`canonical-class-names`。注意 `no-repeated-expect-call` 和 `no-duplicate-types` 没有 fixer；`no-renamed-imports` 和 `canonical-class-names` 是 Fix 类规则。
5. 根据项目风格决定是否保留全部 recommended。

### 路线五：把简单检查前移、按类型度量 PR、控制 AI 花费（Uber 内部流程的可迁移部分，做法 U）

#### 做法 U1：PR 按工作类型打标，用结构占比替代速度指标

1. 给所有 PR 加五个标签：`feature`、`bugfix`、`maintenance`、`testing`、`docs`。
2. 先跑两周收集基线，再做趋势对比。
3. Uber 的观察方向是：feature PR 占比上升，maintenance PR 占比下降。过去度量 PR velocity 在有 agent 后失效，因为可以轻易造出几十上百个 PR，其中很多对产品没有业务影响。
4. 原文没有给出阈值、基线或改善的判定标准，需要自己先建基线。

#### 做法 U2：把 lint、build、模板规则这类简单 CI 任务搬到 agent 的 inner loop

1. 在仓库里提供一条本地校验命令（lint + build + 格式或模板检查的聚合脚本）。原文只给出 Uber 内部命令形态：

```text
afx validate
```

这是内部命令，不能直接照抄；等价形态是你自己的聚合校验脚本。

2. 在 agent 的工作约定里要求开 PR 前先跑这条命令。
3. 背景：Uber 今年为 CI 系统内部宣布过 code red，因为 12 个月内 CI 任务量翻倍以上。目标是把简单任务从 CI 排队里移走。

#### 做法 U3（可选）：AI 花费走额度加例外审批

1. 给工程师分配 spend tier。
2. 达到上限后，经理可以签批当月追加。
3. 对合适类型的工作不设上限，但避免无意识烧 token。
4. Uber 配套一个跨会话插件 CostCheck，提示工程师如何改善自己的成本画像。原文没有给出 tier 数值、上限或审批阈值。

#### 做法 U4（可选）：评审前先跑 AI 评审，附风险分和截图

1. 所有 PR 仍由工程师评审。
2. 工程师开始评审时，AI 代码评审已经跑完，功能截图或视频已附上，风险分已给出。
3. 人据此决定花多少时间。
4. Uday 承认代码评审已成公司内部的大瓶颈，但没有给出量化。这意味着 AI 预评审不是万能，可能把瓶颈转移到评审环节。

#### 做法 U5（方向，低可迁移性）：模型网关与多 harness 封装

1. 把所有 AI 能力收敛到一个模型网关后面。Uber 2023 年定下原则：所有 AI 功能必须与模型和 harness 解耦，于是建了 Model Gateway，支持在 Anthropic、OpenAI、其他厂商模型以及自托管开源模型之间切换。可挂的中间件包括 AI Guard、Spend tracking、Visibility。
2. 在多个 CLI agent 之上做一层统一封装，Uber 的 AIFX 是 Claude Code、Codex、OpenCode 等 harness 之上的一层 wrapper，工程师切换 harness 时，settings、skills、plugins 跟着一起迁移。
3. 认知：Uber 的 AI 工具看起来像一年建成，实际建在十年开发者工具投入之上。先确认你有哪些既有注册表、追踪、环境隔离能力可复用，不要指望从零搭出同等 agent 工具链。

### 路线六：Claude Code 团队流程，把读 diff 交给机器、人只做关键决策（做法 V）

前提：已有 Claude Code 可用；仓库里有测试、构建、截图等可执行验证手段；能写简短的 `CLAUDE.md`，并配置 hooks 自动跑 formatter 和 linter；有 CI、分支保护、CODEOWNERS；具备 merge queue、feature flag、分阶段发布和一键回滚能力；能收集事故和回滚做 eval。原文强调：不要问有没有人读过这段代码，要问这个变更可能出什么问题、哪一层检查最适合抓它。

#### 做法 V1：开 PR 之前，先给 Claude 一个它能自己跑的验证方式

1. 给 Claude 一个它能自己跑的验证方式，并要求它展示输出，而不是说做完了。原文举例：跑 bash 命令、跑测试套件、在浏览器或手机模拟器里试应用、拿截图和设计稿对比。
2. 写一份简短的 `CLAUDE.md`，说明项目是什么：技术栈、约定、目标和非目标。大代码库里要短，并指向其他文档；每次审查都会加载它。审查者还会标记违反其中约定的代码，以及让其中某一句话过时的改动。
3. 在 `CLAUDE.md` 之外配置 hooks，自动跑 formatter 和 linter。
4. 在本地跑轻量审查，或让一个全新上下文的 subagent 审 diff：

```text
/code-review
/security-review
```

前提：`/code-review` 是本地较轻的版本；`/security-review` 对应开源的 security review GitHub Action 的同等能力。

5. 加一份 `REVIEW.md`，由 code owners 写，告诉审查者在这块代码里什么才算重要。按原文，好的 `REVIEW.md` 要：说明该部分代码里失败长什么样，对文档是它在说谎，对配置是它错误路由；限制 nit 的数量；列出应跳过的路径；要求以文件和行号作为证据，而不是凭名字猜；要求摘要以数量开头，并且没什么可修时直说。还要单独检查审查者是否真的遵守了它。
6. 把重复出现的审查评论搬进 `REVIEW.md`；如果某类问题被反复标记，就在源头修：改 skill、加 lint 规则，或更新指令文件。
7. 开 PR 前跑内部 skill：一个找 bug，一个简化 diff，一个做端到端行为检查；UI 变更还要对照设计规范检查。原文只描述这三类 skill 的作用，未给出其内容。

#### 做法 V2：每个 PR 上，先让 Claude 审查，再让 agent 验证发现

1. 每个 PR 在人类看之前先过一次 Claude 审查：读 diff，对照整个仓库和 PR 声明的意图，问这个改动是否解决了它的问题、是否契合系统、是否破坏了别的东西；对 bug 修复还要看根因。
2. 让发现结果先由其他 agent 验证再给人看：多个 agent 同时找 bug，另一组对每条发现投票，足够多同意才发布；只涉及风格、诊断或清理的发现直接丢掉。这些过滤规则在团队自己的 PR 上做过 A/B 测试才保留。留下的按严重度排序为行内评论，并标记 `Important`、`Nit` 或 `Pre-existing`，后者用于区分不是这个 PR 引入的 bug。
3. 每条发现都必须被回应：要么修，要么用理由 resolve 掉这个 thread。经常由 agent 在夜间接手修复，作者第二天回来时 PR 已经又过了一轮。
4. 加自动化安全审查，并且让它能阻断合并：bug 审查或安全审查只要有未关闭的发现，PR 就不能合并；修掉或写一句简短理由关闭 thread，这是清除误报的方式；后续 commit 修好了，发现会自动清除。
5. 上常规阻断性检查：lint、类型检查、所有平台的测试、构建。原文称一个典型 CLI PR 在有人看之前可能跑几十个检查。
6. 在 PR 模板里加三个字段，Claude 可以代填，但提出变更的人要签字确认：

```text
## Testing
## Risk
## How to revert
```

#### 做法 V3：审批用风险分级，先严后松

1. 用变更本身而不是作者来定风险等级，由分类器读变更后选择层级；再用第二个分类器判断即使层级说不需要，这个变更是否还需要另一个人。原文的分级表：

| 风险 | 例子 | 需要的人类审批 |
| --- | --- | --- |
| 低 | 文档、文案、仅内部功能、flag 后面的增量变更 | 自动审查和安全检查全绿后不需要 |
| 中 | 普通产品变更，以及缓存、auto-updater、system prompt 等敏感区域的变更 | 一人 |
| 高 | 最高风险的代码，加上一小批始终需要两人的路径 | 两人 |

2. 有些路径永远需要人：owners 列为敏感的路径，以及任何 CI workflow 文件。用 CODEOWNERS 和分支保护把 auth、billing、CI 和发布流程、安装器固定为始终需要一个人。
3. 只有仓库 trusted list 上的作者，主要是拥有该仓库的团队，能走轻路径，其他人都需要第二个人审批。agent 的审批永远不能算作人类审批，也不能填补一个要求人类的槽位。
4. 谁提示了变更，谁就计入必需审查人：agent 写的 PR，指挥 agent 的人算一个审查人，和亲手写代码一样。
5. 审批只覆盖某一个具体 commit：如果有系统无法担保的新 commit 落地，比如 agent push，或有人手工解的合并，审批必须重新给。
6. 先严后松：起始从严，有证据再放宽。

#### 做法 V4：合并与之后，用 merge queue、flag、回滚和 eval 收尾

1. 用 merge queue 把每个检查对着 main 重跑一遍，避免两个各自通过的 PR 合起来弄坏 main。
2. 新行为先放在 flag 后面只发给内部人员使用，公开版本先进 latest channel，stable channel 滞后。
3. 留最后一层快速发现、快速回滚：flag 不用部署就能关；保持每周 on-call 轮换；事故复盘要问哪一层本该抓到它。原文明确说他们还没有在回滚或事故指标变动时自动收紧审批的 circuit breaker，工程师希望在更多代码走向零人工合并之前有这个东西。
4. 把事故和回滚变成 eval 集：收集过去引发事故的 PR 连同它们的修复和回滚，请熟悉那段代码的工程师逐条确认是什么 bug、在哪里，然后让审查者每天跑这个集合；审查者的 prompt、工具或模型一变，就用整套 eval 重新打分。
5. 测噪声，而不是只测召回：把审查者留下的每条评论按当事人的反应分类，他修了、他说这条错了、他说这是有意为之、他觉得不重要；另外在已知干净的 PR 上跑审查者，统计有多少报告会引导人做出有害改动。原文写下的优先级是：先抓真 bug，其次才是减少审查轮次。注意噪声对 agent 作者代价更高，人能几秒钟摆手放掉一个 nit，agent 会去修，意味着又一个 commit、又一轮审查。
6. 让审查收敛：轮次上限，超过三轮后审查者要求作者退一步重新考虑方案；前几轮之后只复审新 diff；标记 bug 的类别，让作者修掉所有实例而不是一行；不重复已经贴过的发现。
7. 让审查 agent 每晚在存量代码上跑，在旧 bug 冒出来之前先抓到。

#### 做法 V5：人留在五类决策上

1. 把人力集中在五类决策上，其余交给检查：是否该做这件事，包括方向、品味、范围；高风险代码，包括 billing、auto-updater、CI workflows；会被别人复制的架构模式；读证据，包括测试输出、跑过的命令及其返回、截图、审查者的发现；对结果负责。
2. 让 Claude 写指定代码切片的解释，需要的话让它生成一个可视化该部分代码的小工具，用来替代靠逐行读同事的 diff 来学代码。原文明确说他们没有正式流程，也没人脑子里装着完整模型。
3. 采纳你落地、你负责：小到中等变更出问题通常由落地者修，前提是变更小、一切可逆、爆炸半径决定审查门槛、回归能通过遥测和内部使用快速浮现，且事故复盘看系统不追责。原文补充：所有权也是共享的，团队大量在开放 Slack 频道工作。

### 路线七：push 前先确认你真的读懂了 agent 写的代码（Sphinx，做法 W）

前提：Node 22.19+；macOS、Linux 或 WSL（原文未提 Windows 原生）；一个 Git 仓库，且能对目标分支设置保护；在 `sphinx install` 时选定一个审查模型——可以复用你现有的编码 agent，也可以走 OpenRouter 或任何 OpenAI 兼容端点。先在一个非关键仓库试，不要接团队主干。

这条路线和前面几条不冲突：`/code-review`、OpenQodex 回答的是「代码对不对」，Sphinx 回答的是「提交的人有没有读懂」。要理解一个改动在出错时会怎样，两者都需要。

#### 做法 W1：装好并接上 Git

1. 全局安装：

```bash
npm install -g sphinx-understand
```

2. 在仓库里初始化，连接 Git 与你的编码 agent（会问你要用哪个模型来审查）：

```bash
sphinx install
```

预期结果：Sphinx 接上这个仓库的 Git hook，并记住你选的审查模型。

#### 做法 W2：正常 push，回答提问

1. 正常推送，在被保护的分支上 Git 会暂停：

```bash
git push
```

2. 回答 Sphinx 的提问。原文流程是三步：01 你（或你的 agent）push；02 Sphinx 读 diff 并针对「改动出错时会发生什么」提问；03 你回答——答错它会解释为什么，然后换一个新场景再问；答对 push 继续。它的口号是 \"Outsource your thinking, not your understanding.\"。

预期结果：答对才放行 push；答错会换场景重问。审题者由一个从没看过你聊天记录的审查者充当，提问用的模型可以从你现有的编码 agent、OpenRouter 或任何 OpenAI 兼容端点来，原文称 built to run on minimal tokens。

#### 做法 W3：应急放行

原文给出的逃生阀，每次跳过都会记录日志：

```bash
sphinx yolo
```

它适合真的赶时间、且你准备好在事后回看日志的场景；不要把它当日常路径，否则这条检查会被架空。

#### 做法 W4：边界与后端选择

1. 模型后端可选：你的现有编码 agent、OpenRouter，或任何 OpenAI 兼容端点。原文声称兼容 Codex、Claude Code、Cursor、OpenCode、Pi，或纯 Git。
2. 隐私边界（原文明确声明）：你的回答不会传给编码 agent；`.env` 文件和密钥 never opened。更多配置原文指向其文档（\"Read the docs for everything else\"），输入材料未提供。

### 路线八：先写失败测试、用文档门禁和分层验证建立对 AI 代码的可验证信心（做法 X）

前提：项目有可运行的测试框架和明确验收标准；能搭建端到端测试环境；团队接受文档开销；有 CI 和多架构测试能力；工具链已配置编译、静态分析、SAST、linters、风格检查、测试；可选 fuzzing、chaos、mutation testing。原文没有提供可直接复制的命令或提示词，以下步骤需按项目自行设计。

先选做法：

- 只有一个功能要交付，想最快看到效果：做法 X1 到 X3。
- 想在实现前把边界情况和测试用例想清楚：做法 X4。
- 想让文档成为 AI 动代码前的人工检查点：做法 X5。
- 想提高对测试本身的信心：做法 X6。
- 想在发布前跨架构兜底、并控制提交粒度：做法 X7。
- 看不懂 AI 写的某段代码：做法 X8。
- 想决定哪些代码值得逐行读：做法 X9。

#### 做法 X1：先让 AI 写测试，并亲眼看到测试失败

1. 给 agent 明确的验收标准。
2. 让 agent 先写测试，不写实现。
3. 在本地运行测试，确认它失败；保留失败输出。
4. 预期结果：你先看到红。评论者 cadamsdotcom 强调，关键是在开始写实现之前亲眼见证测试失败。

#### 做法 X2：让 AI 实现到测试通过

1. 在失败测试存在后，让 agent 写实现。
2. 跑同一套测试直到通过。
3. 预期：测试代码和生产代码倾向互相镜像，审查更容易，能看到更完整的图景（cadamsdotcom）。

#### 做法 X3：先写覆盖整体工作的端到端测试

1. 在实现前，让 agent 构建覆盖将要完成工作的端到端测试。
2. 该测试变绿后，工作即可视为完成；之后可以清理。
3. 前提：能搭建端到端测试环境。

#### 做法 X4：长规划会话，先设计测试用例再让 AI 执行

1. 与 AI 进行长时间规划，深入细节、推演边界情况、设计测试用例。
2. 规划完成后再让 AI 过夜执行主要生产功能（spacedcowboy）。
3. 预期：第二天拿到可运行的初版，人工把精力放在规划和审查上。

#### 做法 X5：文档门禁——人工批准设计文档后才让 AI 编辑代码

1. 新功能：写 Feature Design document 和 Implementation Plan。
2. 修复：写 RCA document 和 fix Implementation Doc。
3. 人工审查、修改、批准这些文档，批准后才让 AI 编辑代码（lp92）。
4. 维护全局高层架构文档和子组件设计文档；功能或修复完成后同步，并把同步列为实现计划的一步。
5. 预期：在 AI 改代码前发现误解并对齐；代价是文档开销。

#### 做法 X6：标准检查链加 fuzzing、chaos、mutation testing

1. 先跑标准检查链：能编译吗？静态分析说什么？SAST、linters、风格检查通过吗？测试跑了吗？（webarchitect）
2. 再加入故障注入（fuzzing、chaos）和 mutation testing，提高对测试和代码的信心。
3. 前提：有相应工具和运行预算。

#### 做法 X7：发布前多架构 gate，提交保持小而集中

1. 发布前 gate 在多个不同架构上运行数小时；spacedcowboy 的例子是 5 个架构。
2. 保持 check-in 小而集中，便于审查。
3. 预期：跨架构问题在发布前暴露；小步提交让审查可读。

#### 做法 X8：让 AI 解释你看不懂的代码，并自行核实解释

1. 请 AI 解释看不懂的部分。
2. 自己查资料、做实验，核实解释是否准确（lp92）。
3. 预期：理解成本下降，但准确性由你负责。

#### 做法 X9：区分生产代码和一次性工具

1. 进入生产环境的代码逐行审查。
2. `~/.local/bin` 里的一次性小工具快速功能测试后即可合并，不读每一行（matltc）。
3. 前提：明确代码的影响范围。

#### 做法 X10（方向，不可立即落地）：设计合同与形式化验证

评论者 gavinray 认为逐行审查在经济上不划算，可行方向是让代码/语言适应转变，使程序可形式化验证。原文没有给出落地步骤，不要把它当现行流程。

#### 与已有路线的关系

- 路线三（对抗审查）也用 AI 找漏洞，但路线八的 X6 是用 fuzzing、chaos、mutation testing 验证测试本身，不依赖子代理。
- 路线六是团队级 Claude Code 流程，覆盖 `CLAUDE.md`、`REVIEW.md`、风险分级、merge queue 和 eval 集；路线八更靠前，管的是实现前先有失败测试和设计文档。
- 路线七（Sphinx）判「提交的人有没有读懂」；路线八用测试、文档门禁和分层验证建立「代码可验证」的信心。两者不替代：一个管人，一个管证据。
- 路线二（OpenQodex）判 push 前漏检；路线八的检查链是它之前的更早关卡。

## 怎么判断变好了

九条路线都只建议小范围试点，没有给出统一的建议时长，也没有给出检出率、误报率、返工时间等量化效果数据。可以按下面方式自己量。

Claude Code `/code-review` 最小试用方式：
1. 选一个已完成、你本来就要人工 review 的真实 PR 或一次提交作为对照样本。
2. 先原样跑一次 `/code-review`，不带任何参数，记录它报出的问题清单。
3. 对照你自己的人工 review 结论，标记：真 bug、误报、漏掉但人工发现的 bug。
4. 再对同一处跑一次带 `--fix` 的版本，看它给出的修改是否可以直接采纳，先不提交，只做 diff 对比。
5. 只有在上面两步结果可接受时，才试 `--comment` 发到 PR。
6. 强度档位和 `ultra` 的对比，建议在同一个 PR 上分别跑一次，比较命中数与耗时。原文未给档位写法，需先查文档。

PR Lens 最小试用方式：选一个非关键仓库，挑一批中等规模 PR，用 CLI 或 GitHub App 把改动画成架构或数据流图再进入评审。

OpenQodex 最小试用方式：在一台 macOS 或 Linux 机器上先跑 `npx openqodex demo`，再在一个非关键仓库跑 `npx openqodex init`，按三点验收：报告是否退出码 2、每条扫描告警是否有理由、每个改动行是否送到 reviewer 面前。

对抗审查最小试用方式：挑一个中等规模、你比较熟悉的代码仓库，用支持子代理的编码代理原样粘贴那条提示词，让它把通过核验的问题写入一个指定文件；人工逐条判定每个入列问题是真缺陷、误报、已知问题还是风格偏好，记录数量和时间。作为对照，用同一工具、同一条提示词但不启用子代理跑一次。

ai-deslop 最小试用方式：选一个使用 TypeScript 和 Oxlint 的包，安装 `ai-deslop`，只启用 README 中的 recommended 配置；先跑当前代码库，观察噪音，再跑一段 AI 生成的 diff。

路线五最小试用方式：不依赖 Uber 基础设施，5 到 15 人团队两周可做。
1. PR 类型打标加占比基线：加五个标签，先跑两周收集基线。
2. 把简单检查前移：在仓库里提供一条本地校验命令，并在 agent 的工作约定里要求开 PR 前先跑这条命令。
3. 可选：AI 花费额度加例外审批，按人统计 token 花费，设月度额度，超限需负责人签批；对明确类型的任务不设上限。
4. 可选：评审前信息打包，让 AI 评审先跑、把结果作为评论附在 PR 上，再让人评审。

路线六最小试用方式：先在一个仓库用简短的 `CLAUDE.md`、`REVIEW.md` 和 agent 可运行的检查打底，再接入 AI 审查、用风险分级控制人工审批数量，并以回滚率和事故率作为护栏。原文给出的背景数据是：Claude 写了约 90% 的 Claude Code 自身代码；2026 年 6 月到 9 月，合并进 Claude Code 代码库的 PR 翻了一倍多，而被回滚的比例下降超过 40%；Anthropic monorepo 每天落地的变更从 5 月约 2,500 涨到 9 月超过 30,000。

Sphinx 最小试用方式（约几分钟）：挑一个非关键的个人仓库，走完一次安装 → `sphinx install` → 让某个 agent（如 Claude Code）改一小段逻辑 → 在有保护的分支上 `git push` → 完整回答一次提问。先不要开 `sphinx yolo`，也不要接到团队主干仓库上。

路线八最小试用方式：选一个中等复杂度、验收标准明确的功能，按一轮完整流程执行：
1. 写特性设计文档，人工审查批准；
2. 让 AI 先写端到端测试和单元测试，确认测试失败；
3. 让 AI 实现到测试通过；
4. 跑静态分析、SAST、linters；
5. 小步提交人工审查；
6. 发布前跑多环境 gate。

可观察指标：
- Claude Code `/code-review`：真实 bug 命中数除以总报出数；漏检的真实 bug 数；审阅耗时变化；`--fix` 采纳比例；`--comment` 被回应或采纳比例；各强度档位准确率与耗时或成本。
- PR Lens：命名修正条数；`validate` 通过率；评审中的理解性问题数量。
- OpenQodex：报告是否退出码 2；每条扫描告警是否有理由；每个改动行是否送到 reviewer 面前；是否同时输出终端和 `report.md`、`report.json`、`report.sarif`。
- 对抗审查：真阳性数；误报率；重复或已知问题占比；核验有效性，即被剔除的问题里有没有本应保留的真缺陷；人工成本；与单次扫描、无子代理、无二次核验的对比。
- ai-deslop：按规则统计违规数量与类型；人工判断真正需要修的比例；修复耗时；启用前后同类问题在评审或 CI 中是否减少。
- 路线五：各类型 PR 占比变化，feature 升、maintenance 降；CI 排队时长、CI 任务量、失败率；每个 PR 的人工评审时长、评审意见条数、从开 PR 到合并的时长；按人 token 花费、单位功能 PR 的平均花费，而不是总花费；质量侧回归缺陷数、线上事故数、回滚次数。原文没有给出这些指标的目标值或基线，需要自己先建基线再判断。
- 路线六：每个 PR 的人类审批数，看中位数和 95 分位；人类评论数；PR 等人等待的时长。护栏指标是回滚率和事故率，原文明确如果它们上升，就没有省下人力时间，只是把它挪走了。审查者质量用历史事故 PR 连同修复和回滚构成的 eval 集每天跑；噪声用当事人的反应分类，以及在已知干净 PR 上统计会误导人做有害改动的报告数。收敛把 rounds-to-pass 和召回率一起追踪。原文给出的一次诊断：对审查者反复标记的内容跑 git blame，约 59% 是审查者第一轮时就已经存在的代码，它在每轮多翻出几个老 bug，而不是在找新 bug。一次对照：研究预览上线后，内部 PR 获得实质性审查评论的比例从 16% 升到 54%；超过 1,000 行的 PR 大多能查出问题，小 PR 大多干净返回。
- 路线七（Sphinx，全部为自测指标，原文没有任何效果数据）：有效拦截率，即这次提问是否指向了 diff 里你原本没意识到的行为，每次 push 记 0/1，连续记两周；提问质量，把 Sphinx 的问题和你的回答人工打分 1 到 5，看它问的是「出问题时会发生什么」这类真问题还是流于表面；跳过率，`sphinx yolo` 次数除以总 push 次数，长期偏高说明阻力大于价值；时间成本，每次 push 平均多花的分钟数；误判，出现「你答对了却被判错」或「问题本身有误」的次数；模型开销，审查模型的实际 token 花费，用来验证作者 minimal tokens 的说法。
- 路线八：测试先失败后通过的比例；端到端测试通过率；静态检查、SAST、linters 发现的问题数；人工审查发现的问题数；实现后两周内生产缺陷数；审查耗时；让 AI 解释关键模块后人工验证的准确率。与上一轮类似功能（传统方式或纯 AI 方式）对比。改善不只看速度：缺陷率不升高时审查时间下降，或审查时间不变但缺陷率下降，都算改善；缺陷率上升说明验证链还不完整。

试多久：Claude Code `/code-review`、PR Lens、OpenQodex、ai-deslop 原文都没给建议时长；至少覆盖一批中等规模 PR 或改动的完整评审周期后再判断，不要只看一个 PR 或一次审查。对抗审查建议连续两三个仓库跑下来。路线五建议先跑两周收集基线，再判断趋势。路线六应先严后松，用回滚率和事故率做护栏，在护栏不上升的前提下再放宽审批。路线七建议先在一个个人仓库连续记两周的有效拦截率、跳过率和时间成本，只有有效拦截率稳定命中、时间成本和误判都可接受，才扩到小团队的一个非主干分支。路线八原文没给建议时长；至少覆盖一个完整功能的实现到上线周期，并与上一轮类似功能对比。

## 常见坑

- Claude Code `/code-review` 来源是个人推文，不是 Anthropic 官方文档；互动数据 likes 24、reposts 3、replies 2。
- `/code-review` 原文在审代码这一段后就截断了；缺参数拼接语法、缺档位全名、缺权限与配置说明、缺适用版本。不要照猜语法，先查官方 Commands 页面。
- `/code-review` 的专找正确性 bug 和走云端深度审查是作者对行为的概括，未附任何案例、命中率或对比数据。
- `--comment` 需要 PR 访问路径、`ultra` 需要云端算力，这两条是推断，原文没有明确说明。
- 收益主张没有量化数据：PR Lens README 给出的安装、CI 配置、CLI 命令和修正文件格式可照做，但所有省事、更好理解的收益都只是作者自述。OpenQodex 也没有给出检出率、误报率、返工时间等效果数据。
- OpenQodex 成熟度：项目自述仍在 1.0 之前，仓库仅 30 stars，单次评审 1 到 3 分钟且消耗你自己的 Claude Code 或 Codex 额度；还不够格直接当默认门禁。
- PR Lens 评论不更新：GitHub Action 在两次运行之间不保留状态，评论发出后不会更新；需要随 push 更新的评论和复选框，只有 GitHub App 版本支持。
- PR Lens 改错地方：图里名字错了不要改生成的 SVG，改 `.github/pr-lens.yml`。
- PR Lens GitLab 权限：`CI_JOB_TOKEN` 不能发评论，要带 `api` scope 的 token；GitLab.com 上 project access token 需要 Premium 或 Ultimate；Free 档用 personal access token 会让评论显示你的名字。
- PR Lens GitLab 媒体文件：私有项目里任何拿到附件链接的人都能看到图；项目开启 Require authentication to view media files 后评论里的图不会加载。
- PR Lens Bitbucket fork PR：fork 来的 PR 不会触发 pipeline。
- PR Lens 提交错产物：`.pr-lens/` 是临时目录，CLI 首次写入会自动加进 `.gitignore`；唯一值得提交的是 `export` 写出的 map 文件。
- PR Lens key 外发：key 只通过环境变量传给 CLI，不上命令行；diff 只发给所选的 provider。
- PR Lens 默认 provider：示例默认 Gemini，所以示例 secret 名是 `GEMINI_API_KEY`；换 OpenAI 或 `openai-compatible` 时按文档改 `provider`、`base-url`、`model`。
- OpenQodex 缺 reviewer：没装 Claude Code 或 Codex 时只能跑 `openqodex scan` 或 `review --agent`；Cursor 不能当 reviewer，Cline 也未列为 reviewer。
- OpenQodex 运行时和网络：OpenQodex 不替你装语言运行时；缺了会在报告里列为未安装并给出原因。首次下载扫描器需要网络；osv-scanner 需要访问 osv.dev；semgrep 每次运行从 registry 拉规则包。
- OpenQodex Codex 验证缺口：Codex 侧事件流不显示每条命令，报告会注明读取未被记录；它仍会加载全局 `~/.codex/AGENTS.md`。
- OpenQodex 自定义扫描器：必须经 `npx openqodex trust` 批准；改过配置就要重新批准。
- OpenQodex 删除改动：只删除代码的改动也可能带告警，删除处相邻的行算作改动行。
- OpenQodex 门禁默认：push gate 和 pre-push hook 默认 warn，只有 `.openqodex/config.yaml` 里设了 `review.block_on_severity` 才 block；pre-commit hook 只跑扫描器；GitHub Action 没给 Anthropic API key 时只跑 `openqodex scan`。
- OpenQodex 离线：`--offline` 会跳过 osv-scanner 和 semgrep，并关掉扫描器下载、版本检查、以及分支和 PR 评审的 fetch 和 `gh` 调用。
- OpenQodex 自动更新：默认可能每天最多一次后台找新版本并自动更新，且只在 release 至少 24 小时、其 npm provenance 显示由本仓库 release workflow 构建时才装；可用 `openqodex update --off`、`~/.openqodex/config.yaml` 的 `update: off` 或 `OPENQODEX_AUTO_UPDATE=0` 关闭，`openqodex update --rollback` 回退。
- 对抗审查原文截断：编号 2 的提示词完全丢失；不要凭猜测补写。
- 对抗审查无参数：原文没有说明项目规模、语言、模型配置、子代理数量、运行耗时、成本。
- 对抗审查列表载体未说明：需要你自己指定输出位置。
- 对抗审查自证偏差：双重检查由同一个模型完成，存在自我确认偏差的可能，必须人工抽检或全检。
- 对抗审查能力依赖：仅适合已经有可读代码库、且所用代理工具支持子代理或子任务机制的场景。
- 对抗审查的 Ultra、Astra 6 未解释：无法核实，也无法复用其配置；互动数据约 402 赞、18 次转发、26 条回复，只能说明关注度。
- 对抗审查的收益表述只是作者主张：让我震惊、一些真正令人惊叹的作品，没有输出样例、缺陷清单、修复前后对比或数据支撑。
- ai-deslop 原文是仓库 README，没有给出具体代码违规示例、基准数据、误报率或用户案例。
- ai-deslop 拒绝低证据、低信号、AI-slop 代码模式是作者的目标主张，不是已被数据验证的结论。
- ai-deslop 规则较 opinionated：例如 `no-object-parameters`、`no-unknown-parameters`、`no-module-mocking` 等会直接拒绝一类写法。
- ai-deslop 部分标准规则需要 type-aware linting；部分规则没有 fixer；opt-in 规则的完整配置在文档中，输入材料只给了链接。
- ai-deslop 来源页显示 HN 31 points、7 comments，但没有评论内容或外部验证数据。
- ai-deslop 适用条件：TypeScript 加 Oxlint 加可运行 JS 插件的运行时，Bun、Deno、Node.js。许可证 MIT。
- Uber 路线素材是节目页的 11 条要点，不是完整文字稿；大量工具只有名字和时间戳。
- 没有任何可复制的配置、提示词或命令；唯一出现的 `afx validate` 是 Uber 内部命令。
- 所有系统，包括 Model Gateway、AIFX、MCP Gateway、Code Review、CostCheck、Minion、Slate，都是 Uber 内部实现，未给出开源地址或架构细节。
- Uber 的城市作为一等原语、按城市分片数据库、每城市绑定云区域并可随时故障转移等前提，一般组织不具备，直接照搬会失真。
- 度量口径不完整：知道他们按用户算 token 花费、按类型算 PR 占比，但不知道具体阈值、基线、以及改善的判定标准。
- token 成本近几个月降低约 50% 是嘉宾口述，非可复核的公开数据。
- PR velocity 在有 agent 后失效，因为可以轻易造出几十上百个 PR，其中很多对产品没有业务影响；不要再用单一速度指标。
- AI 预评审加风险分加截图是流程做法，但 Uday 承认代码评审已成公司内部的大瓶颈，且没有量化；它可能只是把瓶颈转移到评审环节。
- 多 harness 并存时，如果没有 AIFX 这类 wrapper，settings、skills、plugins 不跟着人走；但搭建这层封装需要平台或基础设施团队。
- AI 花费额度需要按用户统计 token 花费；做不到就只做 PR 类型打标和本地校验前移。
- Claude Code 团队流程的 `CLAUDE.md` 在大代码库里要短，并指向其他文档；太长会每次审查都加载。
- `REVIEW.md` 要由 code owners 写；它不是普通文档，而是告诉审查者在这块代码里什么才算重要。
- 审查噪声对 agent 作者代价更高。人能几秒钟摆手放掉一个 nit，agent 会去修，意味着又一个 commit、又一轮审查。
- agent 的审批永远不能算作人类审批，也不能填补一个要求人类的槽位。
- 审批只覆盖某一个具体 commit；有系统无法担保的新 commit 落地时，审批必须重新给。
- 原文明确还没有在回滚或事故指标变动时自动收紧审批的 circuit breaker；在更多代码走向零人工合并之前，这是一个已知缺口。
- merge queue 是必要的，否则两个各自通过的 PR 合起来可能弄坏 main。
- eval 集要请熟悉那段代码的工程师逐条确认是什么 bug、在哪里，不能只把事故 PR 丢进去。
- 约 59% 是审查者第一轮时就已经存在的代码，说明审查者在多轮里多翻出老 bug，而不是在找新 bug；要把 rounds-to-pass 和召回率一起追踪。
- 不要把有没有人读过这段代码当成唯一判据；要问这个变更可能出什么问题、哪一层检查最适合抓它。
- 新增：Sphinx 是刚在 Show HN 发布的新项目（FOSS、Free），长期维护与稳定性未知；先别接团队主干，也别当默认门禁。
- 新增：Sphinx 原文里的示例对话被明确标注为 \"An illustrative exchange. Real questions come from your diff.\"，即举例是虚构的，不能当作实测案例；\"minimal tokens\" 和提问质量也没有任何数字或评测。
- 新增：Sphinx 只对「你自己是否理解」有效，无法验证代码本身的正确性；不要拿它替掉 bug 审查和扫描。
- 新增：`sphinx yolo` 是全局逃生阀，有被习惯性使用而架空检查的风险；原文说会记录日志，但没说日志是否强制可见或告警。
- 新增：Sphinx 需要 Node 22.19+，原文未提 Windows 原生；模型后端要另选一个，diff 会进入该模型上下文。
- 新增：Ask HN 原文是评论集合，不是教程；没有可直接复制的命令、配置或提示词，所有步骤需按项目自行设计。
- 新增：Ask HN 样本偏有经验的工程师，缺少对照实验；测试先失败后通过、mutation testing 提高信心等都是实践者经验，不是严格对照实验。
- 新增：「逐行审查不可持续」和「必须完全理解才能交付」是两派主张，都没有量化对比；选哪派要先写下来。
- 新增：SimianSci 的反例：一位熟悉嵌入式和系统级开发的开发者，用 AI 把含多个凭证的工作目录 rsync 到绑定公网 IP 的 VM；AI 不会主动做架构层面的「为什么」思考。测试通过不等于部署安全。
- 新增：asimovDev 的反例：反复迭代 AI 审查意见导致疲惫；这条路线的审查成本可能很高。
- 新增：文档门禁会增加开销；没人维护架构文档时，门禁会退化成形式。
- 新增：多架构 gate 跑数小时，CI 预算不够就只选关键架构。
- 新增：AI 解释可能不准确，必须自己研究核实。
- 新增：形式化验证是长期方向，不是可立即落地的流程，不要拿它当拖延测试的理由。
- 新增：区分生产代码和一次性工具的前提是你能判断影响范围；判断错了两边都受损。

## 证据与来源

- 做法 S 依据调研报告 `@riba2534` 推文。报告给出的可照做内容包括：命令名 `/code-review`（别名 `/review`）、可选强度 low 到 max、`--fix` 直接修、`--comment` 发到 PR、`ultra` 走云端深度审查，以及原文附的 Commands 页面链接卡片。该推文报告明确指出的限制：来源是个人推文，不是 Anthropic 官方文档；互动数据为 likes 24、reposts 3、replies 2；正文在审代码这一段后就截断了；缺参数拼接语法、缺档位全名、缺权限与配置说明、缺适用版本；Commands 页面在材料中只有链接卡片，未抓取到正文。专找正确性 bug、走云端深度审查是作者对行为的概括，未附任何案例、命中率或对比数据；`--comment` 需要 PR 访问路径、`ultra` 需要云端算力属于推断。
- 做法 A 到 I 依据调研报告 `coldteadotai/pr-lens`。报告给出了可直接照做的安装、CI 配置、CLI 命令和修正文件格式：GitHub App 安装地址、`npx skills add coldteadotai/pr-lens`、`.github/workflows/pr-lens.yml` 的 Action 配置、GitLab CI/CD 组件、Bitbucket pipe、CLI 的 `analyze`、`render`、`comment`、`validate`、`export` 命令、`.pr-lens/` 产物约定、`.github/pr-lens.yml` 改名修正。PR Lens 报告也给出了限制：Action 不保留状态、GitLab token 与媒体文件限制、Bitbucket fork PR 不触发、`.pr-lens/` 是临时目录只提交 map。README 中对开源免费、省事、更好理解改动等收益表述均为作者自述，报告没有给出对比或量化效果数据；抓取元数据显示仓库 1821 stars，来自抓取 metrics，非原文内容，只能说明关注度。
- 做法 J 到 Q 依据调研报告 `openqodex/openqodex`。报告给出的可照做内容包括：`npx openqodex demo`、`npx openqodex init`、`npx skills add openqodex/openqodex`、`openqodex review`、`--all`、`<branch>`、`'#42'`、`openqodex review --reviewer codex`、`~/.openqodex/config.yaml` 的 `reviewer:` 与 `reviewer_web: off`、`report.md`、`report.json`、`report.sarif`、`.openqodex/config.yaml` 自定义扫描器、`npx openqodex trust`、`npx openqodex doctor --install`、`scanners.disable: [brakeman]`、`--offline`、`openqodex update --off`、`--rollback`、`OPENQODEX_AUTO_UPDATE=0`、`npx openqodex guide <topic>`。报告给出的数据：13 个内置扫描器各自的版本、触发条件、下载体积，Apple Silicon 与 Linux x64 两列，例如 gitleaks 2.9 MB 对 3.0 MB，osv-scanner 31.8 MB 对 32.1 MB，hadolint 102.6 MB 对 55.7 MB；首次运行实测条件是 Apple Silicon Mac、空工具目录、2 MB/s 带宽，但材料在此截断，未给出结果。限制：项目自述仍在 1.0 之前、仓库仅 30 stars、单次评审 1 到 3 分钟且消耗自己的 Claude Code 或 Codex 额度；没有检出率、误报率、返工时间等效果数据；Codex 侧读取未被记录；Cursor 不能当 reviewer；Cline 也未列为 reviewer。README 把它描述成给 Claude Code 和 Codex 用的开源 AI 代码评审工具，并给出一条 `openqodex review` 会怎么做的流程说明；这些流程可照做，但收益没有量化对比。OpenQodex 的验收标准是流程完整性，不是检出率。
- 做法 R 依据调研报告 `@twostraws` 推文。报告给出了一条完整的、可复制的提示词，编号 1，提示词中明确规定的两个动作：使用任意多子代理；对返回的问题做双重检查后加入列表。报告明确指出原文截断，编号 2 提示词丢失。让我震惊、一些真正令人惊叹的作品没有任何输出样例、缺陷清单、修复前后对比或数据支撑；在 Ultra 上释放了 Astra 6 未解释 Ultra 和 Astra 6 具体指什么；互动数据只能说明关注度。主要局限：没有说明项目规模、语言、模型配置、子代理数量、运行耗时、成本；没有说明列表的载体和后续处置方式；双重检查由同一个模型完成，存在自我确认偏差的可能；适用条件仅适合已经有可读代码库、且所用代理工具支持子代理或子任务机制的场景。
- 做法 T 依据调研报告 `ai-deslop`，Show HN: Deslop – Oxlint rules for AI-generated TypeScript。报告给出的可照做内容包括：安装命令 `npm install --save-dev ai-deslop`、Oxlint 配置示例、recommended 规则清单、opt-in 规则清单。限制：原文是仓库 README；没有给出具体代码违规示例、基准数据、误报率或用户案例；部分标准规则需要 type-aware linting；`no-repeated-expect-call` 和 `no-duplicate-types` 没有 fixer；opt-in 规则的完整配置在 `docs/*.md`，输入材料只给了链接；来源页显示 HN 31 points、7 comments，但没有评论内容或外部验证数据。拒绝低证据、低信号、AI-slop 代码模式是作者的目标主张，不是已被数据验证的结论；规则较 opinionated，可能不适合所有团队约定。
- 做法 U 依据调研报告 `Uber’s AI infra, from the inside`，The Pragmatic Engineer 播客节目页，嘉宾 Uday Kiran Medisetty，负责 Uber agentic AI 方向。报告给出的可迁移做法：PR 按 `feature`、`bugfix`、`maintenance`、`testing`、`docs` 打标；把 lint、build、模板规则这类简单 CI 任务移到 agent 的 inner loop，命令形态是内部命令 `afx validate`；AI 花费走额度加例外审批，配套 CostCheck 提示成本画像；所有 PR 仍由工程师评审，但评审前 AI 代码评审已跑完、功能截图或视频已附上、风险分已给出；模型网关 Model Gateway、AI Guard、Spend tracking、Visibility、AIFX 多 harness 封装。数字均为嘉宾口述，非可复核公开数据：token 成本近几个月降低约 50%；CI 12 个月内任务量翻倍以上，触发内部 code red；2015 年 2 个服务，2019 年数千个，2026 年与 2019 年大致相当而业务规模约为当时 10 倍；M3DB 每秒发出约 5 亿个指标；工程师日常使用 20 多个工具。限制：素材是节目页的 11 条要点，不是完整文字稿；没有任何可复制的配置、提示词或命令；唯一出现的 `afx validate` 是 Uber 内部命令；所有系统都是 Uber 内部实现，未给出开源地址或架构细节；Uber 的城市作为一等原语、按城市分片数据库等前提一般组织不具备；度量口径不完整，不知道具体阈值、基线、改善判定标准。多任务能力、context engineering、审查与验证输出的能力变得更重要，以及为工程师建的工具也让 agent 更好用，是因果判断，没有对照实验；代码评审成为大瓶颈是 Uday 的承认，但没有量化。
- 做法 V 依据调研报告 `How the Claude Code team does code review`。报告给出的可照做内容包括：开 PR 前的 `CLAUDE.md`、hooks、`/code-review`、`/security-review`、`REVIEW.md`、三类内部 skill；每个 PR 上的 Claude 审查、多 agent 投票验证、按严重度排序的行内评论与 `Important`、`Nit`、`Pre-existing` 标签、每条发现必须修或 resolve、自动化安全审查阻断合并、常规阻断检查、PR 模板的 `Testing`、`Risk`、`How to revert`；审批的分级表、永远需要人的路径、trusted list、agent 审批不算人类、谁提示谁计入审查人、审批只覆盖具体 commit、先严后松；合并与之后的 merge queue、flag、内部 latest、stable 滞后、快速发现快速回滚、事故复盘问哪一层本该抓到、把事故和回滚变成 eval 集、测噪声、让审查收敛、让审查 agent 每晚扫存量代码；人留在五类决策、让 Claude 写代码切片解释、你落地你负责。报告给出的数据：Claude 写了约 90% 的 Claude Code 自身代码；2026 年 6 月到 9 月，合并进 Claude Code 代码库的 PR 翻了一倍多，而被回滚的比例下降超过 40%；Anthropic monorepo 每天落地的变更从 5 月约 2,500 涨到 9 月超过 30,000；研究预览上线后，内部 PR 获得实质性审查评论的比例从 16% 升到 54%；超过 1,000 行的 PR 大多能查出问题，小 PR 大多干净返回；对审查者反复标记的内容跑 git blame，约 59% 是审查者第一轮时就已经存在的代码。限制与作者主张：目标状态是大多数 PR 至多一个人类在环且回滚率和事故率不上升，这是目标主张；原文明确还没有在回滚或事故指标变动时自动收紧审批的 circuit breaker；噪声对 agent 作者代价更高是原文判断；Claude Code Team 和 Enterprise 计划已 GA 的 Code Review for Claude Code、Quick、Standard、Deep 是产品能力描述，材料未给出各档位的准确率或成本数据。
- 做法 W 依据调研报告 `Show HN: Sphinx – A hook that quizzes you on your AI's code before shipping`。报告给出的可照做内容包括：`npm install -g sphinx-understand`、`sphinx install`、`git push`、`sphinx yolo`；运行前提 Node 22.19+、macOS/Linux/WSL；兼容列表 Codex、Claude Code、Cursor、OpenCode、Pi 或纯 Git，模型来源支持现有 agent、OpenRouter 或任意 OpenAI 兼容端点；隐私声明：答案不进入编码 agent，`.env` 与密钥不被打开；HN 热度 74 points、20 comments（评论正文未提供）。局限与作者主张：`minimal tokens` 没有具体消耗数字；「提问质量足够好、能逼出真正的理解」没有评测数据；没有误拦截率、漏检率、平均增加耗时、通过率等任何指标；文中那段 Sphinx 与用户的对话被明确标注为 \"An illustrative exchange. Real questions come from your diff.\"，是虚构举例，不能当实测案例；它是刚在 Show HN 发布的新项目（FOSS、Free），长期维护与稳定性未知；`sphinx yolo` 存在被习惯性使用而架空检查的风险，原文说会记录日志但没说是否强制可见或告警；它只对「你本人是否理解」有效，无法验证代码本身的正确性。
- 做法 X 依据调研报告 `Ask HN: How to deal with shipping AI-written code you don't understand?`。报告给出的可照做内容包括：先让 AI 写测试并亲眼看到失败、再让 AI 实现到通过、实现前先写端到端测试、长规划会话、特性设计文档和 RCA 文档门禁、架构文档同步、多架构发布前 gate 和小步提交、标准检查链、fuzzing/chaos/mutation testing、让 AI 解释并自行核实、区分生产代码和一次性工具。报告给出的案例：spacedcowboy 的自动向量化编译器项目，5 个架构发布前 gate，Mandelbrot 从 394,238 µs 降到 2,110 µs（约 187×），用 checksums 验证正确性；lp92 的 UAV 软件文档门禁流程；matltc 的生产代码与一次性工具区分；SimianSci 的凭证目录同步到公网 VM 反例；asimovDev 的审查疲劳反例。限制：原文是 HN 评论集合，不是教程；没有可直接复制的命令、配置或提示词；样本偏有经验的工程师，缺少对照实验；形式化验证没有落地步骤。
- 新旧做法差异：现有路线零（Claude Code 内置 `/code-review`）、路线一（PR Lens）、路线二（OpenQodex）、路线三（对抗审查）、路线四（ai-deslop）、路线五（Uber 内部流程的可迁移部分）、路线六（Claude Code 团队代码审查流程）、路线七（Sphinx）；本次新增路线八（先失败测试、文档门禁、分层验证）。九者阶段不同，可叠加；若只能选一个，先按你的主要缺口选：已经在用 Claude Code 且想快速跑一遍审查用 `/code-review`，看不懂改动用 PR Lens，怕 push 前漏检用 OpenQodex，AI 生成 TypeScript 模式多就用 ai-deslop，想主动找漏洞用对抗审查，想从流程层面减少 PR 数量和 CI 排队并控制 AI 花费就用路线五，想把读 diff 交给机器、人只做关键决策并用回滚率和事故率做护栏就用路线六，想确认提交的人自己读懂了改动就用路线七，想在不逐行读代码的前提下靠失败测试和文档门禁建立可验证信心就用路线八。路线零和路线六都涉及 Claude Code 代码审查：路线零来源是个人推文，信息不完整；路线六是团队公开流程，给出 `CLAUDE.md`、`REVIEW.md`、风险分级、merge queue 和 eval 集等更完整的配置与指标。路线七与路线零、路线二不是替代关系：后两者判代码对不对，路线七判人有没有读懂；路线八判的是「有没有可验证的证据」，它不替代路线二和路线三的 bug 审查，也不替代路线七的理解确认。

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
