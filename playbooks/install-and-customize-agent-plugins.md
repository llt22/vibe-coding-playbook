# 让 AI 按团队流程交付：装对插件、跑通变更、看住长任务

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：你已经在用 Claude Code，但每次做职能工作都要重讲领域知识，编码变更缺少计划和独立审查，长任务跨上下文会掉线，而且说不清改造有没有效果。
> 先试这一步：先选一个与你当前工作最贴近的职能插件或技能包，在非敏感小项目上跑通一个真实任务并记录基线；若你要做中大型编码变更，先只装 studio-core 跑一个变更，或用 superlite 的人工审批计划模式跑一个 spec 清晰的中小型功能。
> 最近修订：2026-10-20

## 解决什么问题

你已经在用 Claude Code 或 Cowork，但每次让 AI 做某个职能的活（写 SQL、准备客户通话、审合同、对账、做 3D 资产、写 PRD、画论文示意图等），都要重新解释领域知识、反复交代公司上下文、手动把外部工具的数据贴进去，而且 AI 给出的流程往往是教科书做法，不是你团队实际的做法。另外几个常见缺口：AI 在会话中途问你的问题、顺手发现的 bug、失败的测试，过一会儿就淹没在对话里；装完一堆插件后，你说不清到底有没有变好；任务跑得比一个上下文窗口更久时，交接、唤醒和拍板都靠人守着；真正做一次中大型编码变更时，单个会话往往一口气写到底，没有计划、没有独立审查、landing 之前没人核对。

本手册用五层叠加来补：官方插件市场层、职能层（含独立 Agent Skills 与编码变更编排）、收口层、观测层（广/深）、交接层。编码变更编排层现在有两个可选项：`priyanshujha/subagent-studio` 偏重计划、worktree、两轮 review 和可审计 landing；`iha2/superlite` 偏重把 spec 交给 agent、回来拿已完成且已测试的代码，支持人工审批计划和 AI 无人驾驶两种编排模式。两者都做多代理编排，但买的东西不同，先选一个跑通，不要在同一任务上叠。

## 适用与不适用

**官方插件市场**：适用——本机已安装并运行 Claude Code、能访问该 marketplace；想先浏览再决定装哪个；想按官方规范打包团队能力；愿意安装前检查插件主页和来源。不适用——没在用 Claude Code；需要先看到具体插件名单、评价或效果数据；期望 Anthropic 替你审核插件行为；不能接受插件访问文件与外部服务。

**职能插件与独立 Agent Skills**：适用前提是团队已用 Claude Code 或 Cowork；所需外部工具能通过 MCP 接入；有人愿意读插件的 `skills/` 并按本团队流程改写；你希望把某职能的领域知识、工具连接和固定动作预打包复用。Blender 需要 Blender 5.2 LTS+ 并支持 Agent Skills；PM 需要能读结构化 Markdown 的代理；科研示意图需要 Node.js 22+ 与 Chromium。不适用——只看 README 就指望复现技能内部的提示词、脚本或 QA 规则；期望开箱即用、不做定制就大幅改善；需要先看到官方效果数据才采用。

**subagent-studio**：适用——中大型代码库、复杂变更：每次改多个文件、有真实用户、代码要维护多年；或无人值守的定时运行；能用 git 和 worktree、能定义 check commands。不适用——小而明确的工作；需要先看到结果证据才采用；不能接受每个变更的数倍 token；无法确认 `docs/evidence.md` 里的证据细节。

**superlite**：适用——已安装 Claude Code、git、Python 3.10+、bash（Windows 上用 Git Bash），`uv` 可选；有一个 spec 清晰的中小型功能；愿意先用人工审批计划模式跑一轮，并用 `.superlite/metrics.jsonl` 和测试通过率自行复核。不适用——需要独立效果证据才采用；不能接受它与 superpowers 技能名冲突、不能在同一会话同时启用；高风险变更需要你逐步把关时直接上 AI 编排；没有 git 或 Python 3.10+ 的环境。

**收口层、观测层、交接层**：收口层适合经常被 AI 反问、经常要回头翻测试结果的人；观测层适合想把“有没有变好”变成数字的人，但面板只在 CLI 或 Claude Desktop 的 Code tab 显示；交接层适合任务跨上下文窗口、需要定时唤醒和拍板不阻塞的人，但只在 Windows 11 和作者验证过的 Claude Code 版本上验证过，远程会话未测试。

## 前置条件

1. 能使用 Claude Code（有 `claude` CLI）或访问 claude.com/plugins 的 Cowork。
2. 版本口径：观测层（广）Claude Code 2.1.287+；收口层在 2.1.292 上构建；交接层 ≥2.1.289 且带 function-hooks 插件 API；subagent-studio 的 `roles` 配置需要 v2.1.292+；观测层（深）本地开发需要 Node 22.19.0 或更高。
3. 独立技能：Blender 5.2 LTS+；PM 可选 Python 环境；schematic-figure 需要 Node.js 22+ 与 Chromium，导出 TIFF/EPS/PowerPoint 还要 Python 3 加 Pillow、python-pptx、lxml 并安装 `pdftops` 或 Ghostscript。
4. superlite 需要 git、Python 3.10+、bash；`uv` 可选；被构建的项目可以是任何语言。
5. subagent-studio 需要 Claude Code 构建支持 plugin 和 marketplace；要用七步流程需能建分支和 `git worktree`，并先定义好 check commands。
6. 收口层 PRs 标签页需要已安装并登录的 `gh`；测试/构建要由 Claude 作为独立命令运行。
7. 交接层运行面为终端 CLI 或 Claude Desktop 的 Code tab 本地会话；远程云会话未测试。
8. 自行确认仓库许可：Blender 是 MIT；PM 是 CC BY-NC-SA 4.0；schematic-figure 代码是 MIT，内置 Latin Modern 字体是 GUST 字体许可；superlite 和 subagent-studio 也按各自仓库许可确认后再用于生产。
9. 准备一个非敏感、小体量的现有项目做试用，并先记录 2–3 次基线：同一任务的完成时间、返工次数、补齐上下文的次数。
10. 同时用多层前先 `claude --version` 核对；升级 Claude Code 后先 `/reload-plugins`。

## 操作步骤

### 第 0 步：用官方插件市场发现并安装插件（做法 A / 做法 B）

**做法 A：作为使用者，先浏览再装**

1. 进入 Discover 页面挑选：

```text
/plugin > Discover
```

2. 用 marketplace 限定名安装：

```text
/plugin install {plugin-name}@claude-plugins-official
```

3. 安装前检查插件主页和来源，确认你信任它包含的 MCP server 和文件访问。原文明确 Anthropic 不控制插件里的 MCP server、文件或其他软件，也无法验证它们会按预期工作或不会变化。

**预期结果**：插件安装成功，可在低风险任务上试用。**失败处理**：若安装后调用失败，先检查插件主页和来源；若一周内没有任何指标变好，卸载，并记为“该插件无实质增益”，而不是“插件机制无效”。

**做法 B：作为插件作者，按标准结构组织**

```text
plugin-name/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json
├── commands/
├── agents/
├── skills/
└── README.md
```

如果源仓库只有 `SKILL.md`、没有 `.claude-plugin/plugin.json`，就在 marketplace 条目里用 `strict: false` + 显式 `skills` 数组声明；每个路径相对 `source.path`，指向包含 `SKILL.md` 的目录；注册为 `<plugin-name>:<skill-name>`。发布前定好 `name`，之后不要改——marketplace 条目的 `name` 是不可变 slug；要改 UI 显示名改 `displayName`；必须改名时在 `.claude-plugin/marketplace.json` 顶层加 `renames` 映射。

### 第 1 步：选一个与你当前工作最接近的职能插件

原文列出 11 个插件：productivity、sales、customer-support、product-management、marketing、legal、finance、data、enterprise-search、bio-research、cowork-plugin-management。数据岗选 data，销售选 sales，法务选 legal，以此类推。只挑一个，不要一次装多个。

如果你的职能不在上面，或需要跨运行时使用，去看第 4 步之二的独立 Agent Skills。如果你要动的是中大型代码库上的一次变更，看第 4 步之三的 subagent-studio，或第 4 步之四的 superlite。

### 第 2 步：安装职能插件（做法 A / 做法 B）

**做法 A：用 Claude Code 安装**

```bash
claude plugin marketplace add anthropics/knowledge-work-plugins
```

```bash
claude plugin install sales@knowledge-work-plugins
```

把 `sales` 换成第 1 步选的插件名。原文称安装后插件自动激活，Skills 在相关时触发，slash commands 在会话里可用。

**做法 B：用 Cowork 安装**：直接从 https://claude.com/plugins/ 安装，或在 GitHub 浏览完整集合。原文未说明 Cowork 的开放范围、价格或区域限制。

### 第 3 步：验证职能插件已激活

在会话里确认对应斜杠命令出现，例如 `/sales:call-prep`、`/data:write-query`、`/finance:reconciliation`、`/product-management:write-spec`。

**预期结果**：命令出现并能成功执行。**失败处理**：命令不出现说明插件未生效，先回到第 2 步检查 marketplace 是否添加成功，不要继续往下做。

### 第 4 步：读懂插件结构，按团队真实流程改一条

```text
plugin-name/
├── .claude-plugin/plugin.json
├── .mcp.json
├── commands/
└── skills/
```

`skills/` 放领域知识和工作流，Claude 在相关时自动取用；`commands/` 放你显式触发的动作；`.mcp.json` 通过 MCP server 接外部工具；`plugin.json` 是清单。四个定制方向：换 connector、加公司上下文、调工作流、建新插件。原文只给了总体步骤和目录结构，没有收录任何单个插件的具体 skill 内容、提示词全文或命令清单，要照做必须自己打开仓库对应目录去读。

**预期结果**：Claude 在相关交互中自动取用你改过的知识和流程；用斜杠命令触发时，输出更贴近团队实际做法。开箱插件只是通用起点。

### 第 4 步之二：用独立 Agent Skills 包落地一个具体职能（做法 A / 做法 B / 做法 C）

一次只装 1–2 个技能，不要一次装全部。

**做法 A：Blender 技能包**

```text
/plugin marketplace add EL4CTEO/blender-skills
/plugin install blender-agent-skills@blender-agent-skills
```

通用安装：

```bash
git clone https://github.com/EL4CTEO/blender-skills
./blender-skills/install/install.sh
```

Windows 用仓库里的 `install.ps1`。默认安装到 `~/.claude/skills` 和 `~/.agents/skills`；`.agents/skills` 可被 Codex、OpenCode、Gemini CLI、Copilot 和 Cursor 读取。可选配置 Blender MCP server；不配则代理在后台启动 Blender 运行。示例提示词：

```text
Make a game-ready crate for Unreal with baked normals and LODs.
```

```text
Rig this character with Rigify and export it to Unity with a walk cycle.
```

```text
Check this model for z-fighting and floating parts, then export it for Roblox.
```

开发与验证：

```bash
python tools/validate_skills.py
python tools/run_tests.py
```

**注意**：材料只到 README，未展示各技能内部提示词、脚本、配置或 QA 规则；42 stars 只反映关注度。

**做法 B：Product-Manager-Skills**

Claude Code 安装：

```text
/plugin marketplace add deanpeters/Product-Manager-Skills
/plugin install product-manager-skills@pm-skills
```

其他运行时可用 starter pack、codex 包或主题包；不确定时先用 starter pack。本地 playground：

```bash
pip install -r app/requirements.txt
streamlit run app/main.py
```

API key 只通过环境变量提供；支持 Anthropic、OpenAI、Ollama。第一句提示词可直接粘贴后替换细节，例如：

```text
Frame this problem: field sales reps don't use the CRM and leadership wants gamification.
```

```text
Build a PRD for self-serve workspace provisioning — here are my discovery notes and the OKR it ladders to.
```

```text
Which of these skills fits what's on my desk this week?
```

Interactive 技能走 Adaptive Decision Ladder：先问 3–5 个与你具体处境相关的问题，再给出编号推荐，每条带一个 use this when 的理由。往库里加自己的技能时，每个技能必须有 `## Input` 段落；不要用 `$ARGUMENTS` 模板，它跨运行时不可移植。

**做法 C：schematic-figure（科研论文示意图、专利附图）**

```bash
git clone https://github.com/lgwrightlab/schematic-figure.git
mkdir -p ~/.claude/skills
cp -r schematic-figure/.claude/skills/* ~/.claude/skills/
```

在项目文件夹里启动 agent；图写到 `figure/out/`，格式为 SVG、PDF、PNG。提示词模板：

```text
Use the schematic-figure skill to design Fig. 1 for our paper [attach technical description].
```

```text
Use the schematic-figure skill. Follow the colours and line weights of the attached figure from our last paper [attach example figure]. Draw our new device in the same style [attach technical description].
```

```text
Use the schematic-figure skill. Make three different designs of this figure with three parallel agents for our paper [attach technical description] and combine them in a single sheet to show me.
```

用三个旋钮控制出图：Look（`flat` / `in 3D` / `render it in Blender` / `photoreal`）、Size（`Width 89 mm` 单栏 / `Width 183 mm` 双栏）、Depth（`draft` / `standard` / `full`）。新概念必须给详细技术描述；给同风格样例图可对齐配色和线宽。**注意**：作者明确它不替代设计图的人，科学内容与细节仍需人工检查。

### 第 4 步之三：把一次中大型编码变更拆成多子代理流水线（subagent-studio，做法 A / 做法 B）

**什么时候用**：中大型代码库、复杂变更、每次改多个文件、有真实用户、代码要维护多年，或无人值守的定时运行。**什么时候跳过**：小而明确的工作，单个 Claude Code 会话更便宜；本套件每个变更要加 planner、builders、step checks 和两个 reviewer，token 是单会话的数倍，原文图里低于 50 行的严重 bug 发现率为 9%。

**做法 A：插件市场安装**

```text
/plugin marketplace add priyanshujha/subagent-studio
/plugin install studio-core@subagent-studio
/studio-core:studio-init
```

可选安装其他模块：

```text
/plugin install studio-context@subagent-studio
/plugin install studio-unattended@subagent-studio
/plugin install studio-research@subagent-studio
```

`studio-init` 会检测 check commands、提议 reviewed paths、询问 review passes、landing 和 push hook，写 `.claude/studio.json`，并向 `CLAUDE.md` 加一个短块。先接受它的检测结果再改配置。

**做法 B：copy-in**

```bash
git clone https://github.com/priyanshujha/subagent-studio && cd subagent-studio
./install.sh --modules core --target /path/to/project
```

`install.sh` 会把 agents 和 skills 复制进 `.claude/`，scripts 进 `scripts/studio/`，hooks 合并进 `.claude/settings.json`；它会重写命名空间名称，`studio-core:builder` 变成 `builder`，改完命令里的子代理名要跟着换。

**发起第一个任务**：

```text
Plan and build X with studio-core:plan-then-build
```

**按七步跑一个变更**（以 add CSV export 为例）：先由 `studio-core:planner` 写计划并提交；建 worktree；每一步用 fresh builder 构建、fresh reviewer 检查；按路径 commit 并记录 BASE 和 HEAD；`reviewer-pass-one` 做第一轮 review，fresh builder 修复；`reviewer` 做 landing 前审查，fresh builder 修掉 blocker 和 major 并各带一个测试；最后从 detached origin/main 做 `git merge --no-ff`，push HEAD:main，清理 worktree 和分支。原文未给出 plan 的固定 shape、`reviewer-prompt.md` 的具体检查项，也未给出占位符的完整内容，需要自己补。

Landing commit 的 trailers 示例：

```text
Reviewed-by: fresh reviewer agent, 3f1c2a9..8be04d1, 1 round (0 blocker, 1 major, 2 minor; 2 fixed, 1 queued)
Fixed-after-review: author, 8be04d1..c47e9f0, 2 fixes (major: empty file gave a header-only CSV; minor: column order)
```

`review_guard.sh audit` 读取这两个 range，检查 merge 是否恰好带入了它们覆盖的内容；guard 拒绝把未审查工作 push 到 main；可选 hook 自动运行 guard。

**配置**：`core.review.reviewed_paths` 把 scratch 目录和一次性脚本排除，避免多付 review 成本；`core.review.land` 默认 `merge-no-ff`，团队让人类合并则设 `core.review.land: pr`，合并必须用保留 trailers 的 merge commit；`roles.<role>` 设置模型或 effort 需要 Claude Code v2.1.292+，老版本留空由 agent 文件 frontmatter 决定。

### 第 4 步之四：用 superlite 从 spec 跑到可测试代码（做法 A / 做法 B）

**什么时候用**：你有一个 spec 清晰的中小型功能，希望 AI 先问清需求、写计划、并行分发、按任务难度路由模型，最后做包级审查加一次全新最终审查，回来时拿到已完成且已测试的代码。**什么时候跳过**：高风险变更需要你逐步把关；你需要独立效果证据才采用；你正在用 superpowers——二者技能名冲突，不能在同一会话同时启用。

**做法 A：人工审批计划（建议先做这一步）**

1. 安装：

```text
/plugin marketplace add iha2/superlite
/plugin install superlite@superlite-dev
```

本地 checkout 单会话加载：

```text
claude --plugin-dir <path-to-superlite>
```

2. 开全新会话验证是否生效：

```text
Let's make a react todo list
```

判断标准：工作正常时，会在写任何代码之前先触发 `brainstorming`。

3. 说：

```text
Build X. I will approve the plan
```

它会先产出 `.review.md`（约两页、带图、附粗略时间与成本）；在你回 approve 之前不做任何 lint、分发或写文件。你批准后，协调者才把它改写成 agent 格式（任务图、接口、示例、规模）并执行。

4. 用任务描述或 spec 文件发起，例如：

```text
Build me a static site generator from this spec
```

```text
Add CSV export with column widths to the existing app
```

```text
This test fails on leap days: find the root cause and fix it
```

```text
Rename build to render everywhere
```

在既有代码库上加功能会做新代码与旧代码之间的接缝检查；大代码库上会先询问是否安装 Graphify，未经你同意不装。收尾合并用：

```text
We are done: finish the branch
```

先验证，再给 merge 或 PR 选项，永不在你未确认时 push。

5. 盯运行痕迹：项目下 `.superlite/` 里，`progress.md` 含 rulings 与日志，`test-summary.json` 是最新测试结果，`metrics.jsonl` 与运行历史记录每个 agent 的耗时与成本。这是判断跑得好不好的第一手材料。

6. 按需调计划粒度：`writing-plans` 会在计划头部写 `**Detail:** contracts | tests | full`，单个任务可覆盖。`contracts` 只给文件、签名、具名测试与精确值；`tests`（默认）额外给逐字测试代码；`full` 连实现代码一起给，用于刁钻算法。无人值守时由 `brainstorming` 自己选默认。

7. 理解上下文预算切分：计划中每个任务带一行 `Est. context`，预测超过 80k 的任务被拆分，可变部分小于固定前缀的任务与邻居合并；任何任务预计不超过约 3 分钟；并行宽度由任务图决定，最多 18 个 agent；整份计划控制在 15k 字符以内。作者提醒系数只在一个项目上拟合过，只能当参考。

8. 让后续修复轮复用历史：implementer 的 frontmatter 设了 1 小时 prompt cache TTL，等价做法是设环境变量：

```text
CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h
```

**做法 B：AI 编排（无人驾驶）**

说：

```text
Build X. I am away, decide yourself
```

计划、lint、分发全都自动，需要决策的事项记录为 rulings，而不会打断你询问。协调者以 medium effort 运行；最终审查是一个全新的 Opus `final-reviewer` 以 high effort 跑单轮，只报发现不改代码，读由日志拼成的 review packet，目标 30 秒内完成。因为它不是 fork，所以不需要 `CLAUDE_CODE_FORK_SUBAGENT`。

**怎么选**：要先把计划和成本看住、再放它跑，用做法 A；已经信任这类流程、要长时间无人值守，用做法 B。第一次用不要直接上 AI 编排。

**自建对比评测**：仓库自带 head-to-head harness，两个插件在 Opus 上 headless 跑同一 9 模块项目，用隐藏的 89 测试打分：

```bash
uv run --no-project python bench/harness.py run <arm> <rep> [--smoke]
uv run --no-project python bench/harness.py score <arm> <rep>
uv run --no-project python bench/harness.py rescore-tasks <arm> <rep>
uv run --no-project python bench/harness.py report
```

arm 取 `superpowers` 或 `superlite`；`SUPERLITE_PLUGIN_DIR` 可把 superlite 臂指向别的插件目录。验证模型路由是否划算，用 `mechanical_ab` 把 `Kind: mechanical` 的任务在 Haiku 与 Sonnet implementer 上各跑一遍。

**与 subagent-studio 怎么选**：要计划、worktree、每步 check、两轮 review、带 trailers 的 landing 和 audit 链，用 subagent-studio；要更轻的 spec 到代码、模型分层路由、无人驾驶 rulings 和内置 benchmark harness，用 superlite。两者都做多代理，材料未说明同时装会不会互相干扰，先只在一个任务上用一套。

### 第 5 步：加一层收口，让 AI 把没收口的事交出来（inbox）

安装：

```text
/plugin install inbox --marketplace petekp/inbox
```

出现提示时回答 `y` 添加 marketplace，然后选一个 scope。先看 demo，再回自己的数据：

```text
/inbox demo
```

```text
/inbox
```

三个标签页：Needs you（Claude 问你的问题、只有你能做的任务、失败的测试或构建）、Findings（任务之外注意到的 bug、风险和想法）、PRs（本会话和当前分支的 pull request、阻塞项、等你处理的 review 评论）。快捷键：`1 / 2 / 3` 切换标签页，`j / k` 上下移动，动作字母执行，`ctrl+x` 在面板与会话之间切换。

插件会核对测试/构建状态：Claude 把每个测试或构建作为独立命令运行；如果 Claude 说某件事通过了，但上次运行失败、或改动后没再跑过，插件会要求重跑或声明未测试。会话空闲 15 分钟或恢复会话时，提示符上方会自动展开简短状态摘要。

成本口径：每次 Claude 回复后触发一次轻量 Sonnet 调用，3–4k 输入（约 2k 命中缓存）、100–250 输出，约 0.5¢/回复；空闲 5 分钟后约 1¢；插件自身指令与工具约 1,350 token。作者称一次较长 Opus 会话中约占 1%，会话越短占比越高。

### 第 6 步：加一层观测 mod（广），把有没有变好变成数字

```sh
claude plugin marketplace add whyashthakker/awesome-claude-code-mods
claude plugin install context-meter@awesome-claude-code-mods
claude plugin install tool-timing@awesome-claude-code-mods
```

```text
/reload-plugins
/context-meter
```

不想注册 marketplace 时，可直接从源码试单个 mod：

```sh
git clone https://github.com/whyashthakker/awesome-claude-code-mods.git
cd awesome-claude-code-mods
claude --plugin-dir ./mods/context-meter
```

只装 1–2 个观测类 mod，建议 `context-meter` 配 `tool-timing` 或 `error-inbox`。可采集：工具失败/被拒调用次数、单次工具延迟、上下文占用与剩余 token、每轮时长/token/中断、cache 读/写/未缓存输入。面板必须在 CLI 或 Claude Desktop 的 Code tab 里用；VS Code 聊天面板和 `claude -p` 会执行 hooks 但不显示面板。

### 第 6 步之二：加一层观测 mod（深）——时间去向、上下文浪费、编辑时间线

第二个集合 `YeonwooSung/my-claude-code-mods` 建立在官方 Mods 机制之上。6 个 mod：`agent-profiler` 看会话时间去向并可导出 OTLP trace；`context-inspector` 看上下文浪费；`time-machine` 用 shadow-git 快照记录每一次工具调用；`loop-detective` 检测重复失败和 edit/retry 循环；`pin-memo` 固定备忘和 todo；`model-effort-band` 显示模型与 effort。

先只装一个：反复同类失败选 `loop-detective`；上下文经常被塞满选 `context-inspector`；想知道时间花在哪选 `agent-profiler`；要定位哪次编辑弄坏了测试选 `time-machine`。安装机制按官方文档使用 `plugin@marketplace`；具体安装命令和配置项进各自 README 读，不要照抄看起来像的命令。

开发者本地测试：

```sh
npm ci --ignore-scripts
npm test
CLAUDE_BIN=/path/to/claude npm run test:adapters
npm run typecheck
```

量 mod 自身开销用四配置对照：一次性大型代表性仓库固定在一个 commit；同一工作负载跑无 mod、仅 profiler、仅 Time Machine、三个全上；用 `--plugin-dir` 显式加载并禁用其他插件；计时区间外重置文件和 recorder 存储；每种配置 warm-up 并至少 5 次测量，交替顺序；记录 wall time、tool-call 数量、model tokens、snapshot 平均值；按 median/p95 报告，把模型延迟与 snapshot/hook 时间分开。原文没有给出四配置的性能结果，别拿单元测试通过当作性能可接受。

### 第 7 步：长任务跨上下文时，加一层交接控制台（Project Sentinel）

安装：

```bash
claude plugin marketplace add Arjun0014/project-sentinel
claude plugin install project-sentinel@control-room
```

会话内一步完成：

```text
/plugin install project-sentinel --marketplace Arjun0014/project-sentinel
```

不安装地试一个会话：

```bash
claude --plugin-dir /path/to/project-sentinel/plugins/project-sentinel
```

只想验证有没有减少上下文溢出和人工盯守，先做这一步；决定长期用再正式安装。在 Claude Desktop 的 Code tab 用工作副本，把文件夹名写进 `~/.claude/settings.json` 的 `env` 块 `CLAUDE_CODE_PLUGIN_DIRS`。

### 第 8 步：打开 Control Room，先开 Autopilot

```text
/cr
```

六节：Overview / Context / Behavior / Guardrails / Activity / Setup。其它命令：`/cr status`、`/cr cache`、`/cr decisions`、`/cr decide D-2`、`/cr diagnostics`。

Autopilot 默认 Off。在 Context 里设阈值（窗口百分比或 token 数；README 截图里的 70% 与 80% 只是截图示例，不是推荐值）。到阈值时 Claude 先做完当前步骤，然后记录里程碑、更新项目文档、CLAUDE.md 只留持久指令、跑一次最小验证、写 `NEXT_SESSION_PROMPT.md`；Project Sentinel 运行 `/clear`，用里程碑和目标播种新上下文，Claude 自行继续。每一步都在下一轮开始或结束时推进，绝不按定时器走；交接轮结束时若后台工作还在跑，会等 Claude Code 报告结果再清空并继续。

### 第 9 步：把等待、以后再做和需要拍板的事交出去

Watchers：

```text
/cr watch in 2h S-002 result
```

支持 `at 14:00`、`tomorrow at 9am`；三种策略 Keep warm / Fresh / Smart。Fresh 唤醒需要健康的 resume 状态；Watchers 只在 Claude Code 运行时工作。

Mission Queue：

```text
/cr queue <text>
```

每项只在边界投递：下一个安全边界、本轮之后、当前里程碑之后，或下一个新上下文。绝不插进某一轮推理中间；跨 `/clear`、交接、重载和恢复会话与 run 一起保留，只投递一次。

Decision Inbox：

```text
/cr decisions
/cr decide D-2
```

插件给 Claude 一个 `decision_request` 工具，选择停在 Activity → Operations → Needs review；答复随 Claude 下一批工具结果送达。Claude Code 自己的权限提示和确认永远不会被这里延后，插件也不代你回答权限提示。

和 inbox 怎么选：最痛的是 Claude 谎报测试通过，先上 inbox；最痛的是长跑任务里被反复叫去拍板、或要等到某个时间点才继续，先用交接层。材料未说明两者同时装会不会互相干扰，先只用一个。

### 第 10 步：按需开关护栏、选 profile

Run Budget 默认 Off：

```text
/cr budget $30
```

设成本、墙钟时间和交接次数上限，80% 时提示一次；到上限时可选只通知 / 自行开工前先问 / 让 Claude 做完当前里程碑再暂停。它不会中断正在进行的工具调用或轮次。

Machine load 默认 Off：给 CPU 和内存建议上限（Low / Medium / High / Custom），不是 OS 配额。Cache Guardian 默认 On：会在会重发 100k+ 热 token 的模型切换前先确认；Keep warm 默认 Off，会在你离开时于缓存过期前不久重发一次最后请求，是明确的成本项。Cold Resume Guard 默认 On：向大上下文发送消息且缓存确定已失效时，先问 Continue full session / Start fresh from resume state / Compact first / Cancel。

权限策略按类别给 Default / Ask / Deny（包安装、网络、下载、项目内编辑、项目外编辑、删文件、commit、push、force push 与 reset、部署发布、危险命令）。选 profile 而不是逐项配：Normal、Frontier Max、Low Resource、Release / QA 和自定义。Answer styles 只影响对你说的话，不影响代码、文件或提交信息。

### 第 11 步：贡献回仓库（可选）

职能插件是 markdown 文件，fork 后改，提 PR。交接层是 MIT、无构建步骤的 TypeScript，按本地 clone 改、`/reload-plugins` 热加载即可。Blender 是 MIT，可 fork 后运行 `validate_skills.py` 和 `run_tests.py`；PM 是 CC BY-NC-SA 4.0，fork 和再分发要遵守许可，添加技能遵守 `## Input` 和不用 `$ARGUMENTS` 的约定；schematic-figure 代码是 MIT，内置 Latin Modern 字体是 GUST 字体许可。superlite 和 subagent-studio 按各自仓库的贡献方式和许可来。

## 怎么判断变好了

先分清来源：职能插件原文没有给出验证方法或指标；收口层只有成本口径；交接层只有机制描述；观测层（深）明确没有给出四配置性能结果；Blender、PM、示意图材料都只到 README；subagent-studio 只有作者单项目自述、仓库仅 30 星，关键证据在未包含的 `docs/evidence.md`；superlite 的 3.9 倍与 52% 是作者用自建 harness 单次或少量运行自测得出，材料未说明 52% 的具体口径，且鲁棒性探针低于对照组，不能当定论。

**通用最小试用**：先记录 2–3 次基线（完成时间、返工次数、补齐上下文次数），装一个插件或技能包，跑一个真实任务，再对照同一类任务。试一两周；没有可感知改善就卸载，并记为“该插件无实质增益”。

**职能插件**：同一任务完成时间、返工次数、补齐上下文的次数是否下降；`/xxx:yyy` 是否出现并成功执行，这是最硬的通过/不通过信号。

**独立技能**：Blender 记录完成时间、人工干预次数、能否通过目标引擎导入检查、`blender-asset-qa` 是否报出 z-fighting、浮空部件、坏法线或权重问题；PM 用真实 PM 任务与裸提示对照，看完成时间、返工、输出能否直接使用；示意图看从需求到可用初稿的时间、人工调整轮次、SVG/PDF 能否逐处编辑、按 `standard` 口径复核每个计数/方向/连接时的漏检比例，以及字体授权是否满足投稿要求。

**subagent-studio**：在中大型代码库上只装 `studio-core`，跑 `studio-init`，再对一个中等以上变更执行 `Plan and build X with studio-core:plan-then-build`。看 landing commit 是否有 `Reviewed-by` / `Fixed-after-review` trailers、数字是否真实；`review_guard.sh audit` 是否判定 merge 恰好带入被审查内容、有没有漏掉的 landing；两轮 review 分别抓到了什么；token 用量相对单会话是否可接受。若第二遍独立 review 抓不到东西、guard/audit 从不拦停、trailers 记不出真实数字，说明数倍 token 没换来质量收益。

**superlite**：先在中小型、spec 清晰的功能上走人工审批计划模式，记录从提出需求到拿到已测试代码的时间、测试通过率、`.superlite/metrics.jsonl` 里每个 agent 的耗时与成本、最终审查抓到的问题数、你需要介入的次数。若这些指标不比单会话或 subagent-studio 好，或鲁棒性探针低于对照组，不要推广。需要更硬的对比时，用仓库自带 harness 跑 `superlite` 与 `superpowers` 两臂，并看 `mechanical_ab` 验证模型路由是否划算。

**收口层**：每个会话里被你漏掉、事后才发现的待办/问题数量是否下降；手动追问“刚才那个测试过了吗”的次数是否下降；切换窗口/翻记录的次数是否下降；成本侧看每会话新增开销占比是否可接受。

**观测层**：广层看工具失败/被拒调用次数、单次工具延迟、上下文占用、每轮时长/token/中断、cache 读/写；深层看会话时间去向、窗口占用构成、重复读取次数、重复失败与 edit/retry 循环、任意步骤的文件原貌。若这些数字在同类任务上没有改善，换一个或卸掉。

**交接层**：看 Handoff Health、跨交接的里程碑连续性、上下文溢出/被迫压缩次数、你手动 `/clear` 或 `/compact` 的次数、你守着 run 的时间、Watchers 是否按时间唤醒、Mission Queue 是否只在边界投递且只投一次、Decision Inbox 是否让拍板不阻塞 run。几次交接后里程碑仍连续、Handoff Health 没有明显空洞，才算有价值。

## 常见坑

- 官方市场原文没有收录任何具体插件，也没有效果数据；Anthropic 不控制也不验证插件内容，安装前必须自己检查插件主页和来源。
- marketplace 条目的 `name` 是不可变 slug；改名会让用户安装报 `plugin-not-found`；要改显示名改 `displayName`，必须改名时用 `renames` 映射。
- `strict: false` 声明 skill 包时路径相对于 `source.path`；每个路径指向包含 `SKILL.md` 的目录，注册为 `<plugin-name>:<skill-name>`。
- 仓库热度不是效果：39,182 stars、Blender 42 stars、PM 7421 stars、schematic-figure 31 stars、subagent-studio 30 stars 都只反映关注度。
- 材料可能被截断：PM README 末尾截断在 “worth a bookmark if you work”；交接层材料截断在 Lazy-exit guard；subagent-studio 材料截断在 “每个 agent 文件在 frontmatter 里固定 model、”。未给出的行为不要照抄。
- 职能插件和三个独立技能包都只到 README，未展示技能内部提示词、脚本、配置或 QA 规则；开箱插件原文自称 general starting points，价值在定制。
- 命令不出现 = 未生效；先检查 marketplace，不要继续往下做。
- 不要一次装多个职能插件或技能；subagent-studio 先只装 `studio-core`；superlite 先只跑一个人工审批计划。
- 小而明确的编码工作不要上 subagent-studio：单会话更便宜，小变更上很少买到东西。
- subagent-studio 的七步流程有关键留白：plan 的固定 shape、`reviewer-prompt.md` 的检查项、占位符完整内容都要自己补；copy-in 会合并 hooks 并重写命名空间；`core.review.land: pr` 合并时必须保留 trailers；`review_guard.sh` 如果从不拦停，先怀疑配置没接上。
- superlite 不能与 superpowers 同时启用：二者共享 skill 名且都注入会话上下文，会冲突。
- superlite 的人工审批计划模式在 approve 之前不做 lint、分发或写文件；AI 编排模式把需要拍板的事项记成 rulings，不会打断你；高风险变更不要直接上 AI 编排。
- superlite 的 `Est. context` 系数只在一个项目上拟合过，只能当参考；最终审查只报发现不改代码；大代码库上装 Graphify 会先问你，push 必须经你确认。
- superlite 的作者自测数据不是独立证据：3.9 倍与 52% 来自自建 harness 的单次或少量运行，鲁棒性探针低于对照组；Codex 与 Grok 安装命令作者自标 Unverified。
- 收口层每轮都要花钱，短会话额外开销占比更高；没减少遗漏就卸载。
- 观测面板有硬边界：必须在 CLI 或 Claude Desktop 的 Code tab 里用；VS Code 聊天面板和 `claude -p` 不显示面板；深层 mod 对引擎版本敏感，2.1.280 早期访问版下 Context Inspector 缺少 `session.append`、Time Machine 的 per-test 选项会被忽略。
- 观测层（深）的 README 只有概览，具体安装命令和配置项要进各自 README；原文对 marketplace 只给了 Add this marketplace once 的机制描述，没有命令行。
- 两个观测集合不要同类一起上：`context-meter` 与 `context-inspector`、`error-inbox` 与 `loop-detective` 都在看相近的东西；先只在一边装一个。
- 交接层只在 Windows 11 和 Claude Code 2.1.289 / 2.1.293 / 2.1.295 上验证过，远程会话未测试；它建立在 still early access 的 function-hooks API 上，不宜直接定为团队标准。
- 从 1.4.0 之前的 Control Room 升上来，`Allow` 权限状态被移除（已保存的 Allow 读作 Default），点 Kit 不再打开面板；Autopilot 不是定时器；Watchers 只在 Claude Code 运行时工作；Keep warm 是成本项；Run Budget 和 Machine load 都不能掐断进行中的工作。
- Decision Inbox 只管插件自己的决定请求，Claude Code 自己的权限提示不会被延后；inbox 的 Needs you 与 Decision Inbox 可能重叠，先只用一个。
- 数字口径要看清：观测 mod 截图不是原生 app 截图，而是测试套件用 fixture 数据捕获的渲染树；Desktop Usage Strip 的 USD 不是订阅账单；部分 forecast 和 token 计算是估算；Autopilot 阈值截图里的 70% / 80% 只是示例。
- Blender 需要 Blender 5.2 LTS+，MCP server 可用性自行确认；43 个 headless 测试是否全部通过无法从材料验证。PM 是 CC BY-NC-SA 4.0，添加技能必须有 `## Input` 且不能用 `$ARGUMENTS`。schematic-figure 不替代设计图的人，证据是作者自制五篇论文对比演示，没有量化评分或盲评；字体许可与代码许可不同。

## 证据与来源

**官方插件市场**：安装与发现命令、统一目录结构、`strict: false` + 显式 `skills` 数组示例、路径相对 `source.path`、注册为 `<plugin-name>:<skill-name>`、`name` 不可变 slug、`displayName`、`renames` 映射均来自 `anthropics/claude-plugins-official` README；39,182 stars、当日 +307 来自抓取指标；第三方收录走 plugin directory submission form、外部插件需通过质量与安全标准审核来自原文，但标准内容、审核流程、通过率未给出；没有收录具体插件、没有效果指标，来自调研报告对原文的解读。

**职能插件层**：安装命令、目录结构、四个定制方向、11 个插件及用途来自 `anthropics/knowledge-work-plugins` README；插件自动激活、Skills fire when relevant 是原文主张；效果主张是作者主张，无数据、案例、benchmark 支撑；Cowork 开放范围、价格、区域限制和仓库许可未说明。

**独立 Agent Skills**：Blender 安装命令、支持代理、20 个技能、示例提示词、`validate_skills.py` 与 43 个 headless 测试来自 `EL4CTEO/blender-skills` README；42 stars 来自抓取指标；作者声称每个脚本在真实 Blender 测试过，但材料只到 README。PM 的安装命令、下载包、playground、技能结构、77 技能 + 6 工作流、`## Input` 约定、CC BY-NC-SA 4.0、7421 stars 来自 `deanpeters/Product-Manager-Skills` README；77 技能正文质量和效果数据无从验证，时长估计属作者主张。schematic-figure 的安装命令、四个提示词模板、look/size/depth 三旋钮、输出路径、Node 22+ 与 Chromium、可选 Blender/RDKit、字体许可见 `lgwrightlab/schematic-figure` README；证据只有作者自制五篇论文对比演示，属定性证据。

**subagent-studio**：四个模块及 agents/skills/scripts、六条主张、三条安装命令、`studio-init` 行为、copy-in 行为、七步流程示例、landing trailers 示例、`review_guard.sh audit`、`reviewed_paths` / `land` / `roles` 配置、`roles` 需要 v2.1.292+、每个变更 agent 调用更多、一次 run 约 31 个 skill 中加载约 6 个、低于 50 行的严重 bug 发现率 9% 均来自 `priyanshujha/subagent-studio` README；仓库仅 30 星、作者自述约五周定时 Claude Code 会话、关键证据在未包含的 `docs/evidence.md`，属可核声明与调研报告的局限说明。

**superlite**：安装命令、本地 `--plugin-dir`、用 `Let's make a react todo list` 验证是否先触发 `brainstorming`、人工审批计划与 AI 编排两种模式、`.superlite/progress.md` / `test-summary.json` / `metrics.jsonl` / 运行历史、`Detail: contracts | tests | full`、`Est. context` 超 80k 拆分、可变部分小于固定前缀则合并、单任务约 3 分钟、最多 18 个 agent、计划 15k 字符以内、`CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h`、协调者 medium effort、最终 `final-reviewer` 用全新 Opus high effort 单轮只报发现、不能与 superpowers 同开、大代码库装 Graphify 先询问、push 需确认、`.superlite` 痕迹、bench harness 命令、`mechanical_ab` 验证模型路由，均来自 `iha2/superlite` README 与调研报告；作者自测的 3.9 倍与 52% 来自自建 harness 单次或少量运行，材料未说明 52% 的具体口径，鲁棒性探针低于对照组，属作者主张而非独立证据；`Est. context` 系数只在一个项目上拟合过；Codex 与 Grok 安装命令作者自标 Unverified。

**收口层**：安装与更新命令、三个标签页、快捷键、测试/构建核对、空闲摘要、成本表来自 `petekp/inbox` README；33 stars、单作者仓库来自原文与调研报告；分类准确率、误报漏报没有数据。

**观测层广**：命令、7 个分类与 mod 名单、2.1.287+、作者在 2.1.288 测试、mod 默认启用、VS Code 聊天面板与 `claude -p` 不显示面板、无运行时依赖来自 `whyashthakker/awesome-claude-code-mods` README；33 stars、声称 70 个 MIT 打包插件、社区 14 条于 2026-10-03 对照作者文档核查、截图是测试套件用 fixture 数据捕获的渲染树、社区条目未经安装运行与安全审计来自原文。

**观测层深**：6 个 mod 的名称与一句话用途、486 stars、官方 Mods 文档入口、`plugin@marketplace` 机制、各 mod README 路径、`npm test` 不模拟引擎事件、测试文件串行、CI 只跑独立核心测试、engine type declarations 本地生成、四配置对照方法、版本兼容对照来自 `YeonwooSung/my-claude-code-mods` README；原文明确没有给出四配置性能结果，20k span/item 测试只界定分析成本上限，UI 只验证 render trees 未验证 live pixels。

**交接层**：安装、会话内安装、本地 clone、`--plugin-dir` 试跑、Desktop 的 `CLAUDE_CODE_PLUGIN_DIRS`、迁移、更新、卸载、`/cr` 系列命令、六节面板、状态栏 HUD、Handoff Health、`milestones` 工具、`decision_request` 工具、权限策略、Autopilot 交接步骤、Watchers 三种策略、Mission Queue 边界投递、Run Budget / Machine load / Cache Guardian / Keep warm / Cold Resume Guard 默认值与行为、profiles 与 Answer styles 来自 `Arjun0014/project-sentinel` README；版本 1.6.3、MIT、无运行时依赖、2.1.289+ 且需 function-hooks、只在 Windows 11 与 2.1.289 / 2.1.293 / 2.1.295 验证过、远程会话未测试、1.4.0 更名与两处行为变化来自原文；减少上下文溢出和人工盯守没有量化数据。

**属于调研建议、非原文数据**：官方市场的最小试用路径（1–2 小时 + 一周观察、只挑一个、检查来源、低风险任务、记录完成时间/轮次/手工切换/失败比例/新任务，一周无改善则卸载）来自调研报告建议；职能插件与独立技能的自测指标来自调研报告建议；subagent-studio 的最小试用建议（装 `studio-core`、跑 `studio-init`、用 plan-then-build 跑中等以上变更、验证第二遍 review 与 guard/audit）来自调研结论；superlite 的最小试用建议（先人工审批计划、记录 metrics.jsonl 与测试通过率、用内置 harness 自测、不要直接采信 3.9 倍与 52%）来自调研结论；收口层、观测层、交接层的最小试用与指标也来自各调研报告的“怎么试、怎么验证”部分，不是原文效果数据。

## 依据的调研

- [anthropics/knowledge-work-plugins](../research/radar/2026-10-09/2061-anthropics-knowledge-work-plugins.md)：值得一试，先挑一个与本职最接近的插件（如数据岗用 data、销售岗用 sales），按原文两条命令装好、跑通一个斜杠命令，再打开它的 skills/ 文件按团队真实流程改一条；因为原文给出了可直接复制的安装命令和明确的插件目录结构，属于可照做的最小动作，但 README 只有“更好更一致”的主张、没有任何效果数据，不足以直接 adopt。
- [whyashthakker/awesome-claude-code-mods](../research/radar/2026-10-09/2191-whyashthakker-awesome-claude-code-mods.md)：值得一试，可以小范围试：先注册 marketplace，再挑 1–2 个 Session 观测类 mod（Context Meter、Tool Timing、Error Inbox）在现有项目里跑一两周，用它们的计数指标做开启前后对比；理由是 README 给出了可直接复制的安装命令与明确版本前提，且观测类 mod 恰好产出「效果验证」需要的量化数据，但这是第三方未审计的插件集合、截图也非原生捕获，不适合整体照单全收。
- [petekp/inbox](../research/radar/2026-10-11/2454-petekp-inbox.md)：值得一试，可以小范围装上试：在 Claude Code 里用 `/plugin install inbox --marketplace petekp/inbox` 安装后跑 `/inbox demo` 观察它能否捕获你本来会漏的待办与失败测试，理由是原文给出了可直接照做的安装、更新、面板操作与成本数据，但除作者自述外没有任何效果验证，且每轮回复都会产生额外 Sonnet 调用成本。
- [Arjun0014/project-sentinel](../research/radar/2026-10-11/2568-arjun0014-project-sentinel.md)：值得一试，先用 `claude --plugin-dir` 不安装地在单个长任务会话里试跑，打开 Autopilot、状态栏和 Activity，用 Handoff Health 与跨交接的里程碑连续性判断是否真的减少了上下文溢出和人工盯守。理由是 README 给出了可直接复制的安装、Desktop 配置和斜杠命令，但它建立在仍处 early access 的 function-hooks 插件 API 上、只在 Windows 11 和 Claude Code 2.1.289/2.1.293/2.1.295 上验证过，不宜直接定为团队标准。
- [YeonwooSung/my-claude-code-mods](../research/radar/2026-10-14/3008-yeonwoosung-my-claude-code-mods.md)：值得一试，建议在 Claude Code 上小范围试装并验证，优先从单个 mod（如 loop-detective 或 context-inspector）入手，并用原文给出的四配置对照法测开销；理由是这份 README 给出了 6 个可安装的真实 mod、统一的安装路径（plugin@marketplace）和一套可照做的验证方法，但每个 mod 的具体安装与配置细节要进各自 README，且原文明确声明尚未给出多 mod 合并的性能结论。
- [anthropics/claude-plugins-official](../research/radar/2026-10-16/3896-anthropics-claude-plugins-official.md)：值得一试，把 Claude Code 的官方插件市场作为扩展 AI 能力的标准入口用起来——先用 `/plugin` 浏览并安装与当前工作直接相关的插件，理由是该仓库给出了可直接复制的安装命令和插件/marketplace 条目的完整声明结构，是目前少见的、可照做的扩展配置入口。
- [EL4CTEO/blender-skills](../research/radar/2026-10-16/3982-el4cteo-blender-skills.md)：值得一试，建议小范围试用：按 README 给出的安装步骤把 blender-skills 装到 Claude Code 或通用 agents 目录，用示例提示词驱动 Blender 任务，验证其 20 个技能是否真能减少手工步骤。理由是仓库提供了可复制的安装、调用和测试命令，但 README 未展示各技能内部的具体提示词、脚本和 QA 规则，需实测确认效果。
- [deanpeters/Product-Manager-Skills](../research/radar/2026-10-16/3987-deanpeters-product-manager-skills.md)：值得一试，按 README 给出的安装命令装入 1-2 个技能，用你自己手上的真实 PM 任务跑一遍并与裸提示做对照——仓库给出了可直接复制的安装命令、技能文件结构和按情境的可粘贴起始提示词，具备小范围试的条件；但材料只到 README，77 个技能正文的实际质量无从验证，所以先试不宜直接采用。
- [lgwrightlab/schematic-figure](../research/radar/2026-10-17/4172-lgwrightlab-schematic-figure.md)：值得一试，按 README 给出的安装命令和提示词模板，在自己论文里挑一张真实示意图小范围试用该技能（含 look/size/depth 参数与三 agent 并行出多版设计），因为它提供了可直接复制的安装步骤、提示模板和输出目录约定；但证据只有作者自制的对比演示、无量化评测，且原文明确仍需人工把关科学性与细节，故先试不直接采用。
- [priyanshujha/subagent-studio](../research/radar/2026-10-18/4433-priyanshujha-subagent-studio.md)：值得一试，建议小范围试：在中大型代码库上按 README 的 quickstart 安装 studio-core，并用 plan-then-build 跑一个中等以上变更，验证第二遍 review、guard/audit 是否真的带来质量收益；理由是原文给出了可直接复制的安装命令、七步落地流程、landing trailers 和审查守卫，具体到可以照做，但证据只有作者单项目自述、仓库仅 30 星，且关键证据细节在未包含的 docs/evidence.md 中。
- [iha2/superlite](../research/radar/2026-10-19/4923-iha2-superlite.md)：值得一试，可以在 Claude Code 中装上 superlite，先在一个 spec 清晰的中小型功能上采用“人工审批计划”模式跑一轮，同时用 metrics.jsonl 和测试通过率自行复核它的速度与质量，再决定是否推广。它把规划、并行分发、按任务难度路由到 Haiku、Sonnet、Opus 以及审查修复做成了一套可执行的插件流程；但 3.9 倍和 52% 的数据是作者用自建 harness 单次或少量运行自测得出的，鲁棒性探针还低于对照组，因此不宜直接当成定论采纳。
