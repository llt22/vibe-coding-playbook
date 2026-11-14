# 让 AI 干长活时上下文、成本和待办都有人管

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：你在用 Claude Code、Cowork 或 Pi 终端 agent 做职能工作时，总要重复解释上下文、漏掉中途发现的问题、说不清插件有没有变好，长任务还会跨上下文丢线索。
> 先试这一步：先记录 2–3 次基线，再只上一个最小层：Claude Code 用户先装一个职能插件，Pi 用户先装模型配置、状态栏、联网三件套，一周后对照。
> 最近修订：2026-11-14

## 解决什么问题

你已经在用 Claude Code、Cowork 或 Pi 终端 agent，但每让 AI 做某个职能的活（写 SQL、准备客户通话、审合同、对账、做 3D 资产、写 PRD、画论文示意图等），都要重新解释领域知识、公司上下文，手动贴外部工具数据；AI 给出的往往是教科书流程，不是你团队实际做法。还有几个常见缺口：AI 在会话中途问你的问题、顺手发现的 bug、失败的测试，过一会儿就淹没在对话里；装完一堆插件后，你说不清到底有没有变好；任务跑得比一个上下文窗口更久时，交接、唤醒和拍板都靠人守着；真正做一次中大型编码变更时，单个会话往往一口气写到底，没有计划、没有独立审查、landing 之前没人核对；长会话还会遇到自动压缩按 token 阈值切、不知道哪些消息属于同一个工作单元的问题；每个新会话还会从零重解同一个问题：搜索、尝试、失败、再找一遍。

本手册用多层叠加来补：官方插件市场层、职能层（官方职能插件、独立 Agent Skills、按域技能包与编码变更编排）、会话模式层（work-mode 控制自主推进、批处理委派和收口）、收口层、观测层（广/深）、交接层与上下文压缩层、跨会话经验层，以及 Pi 终端 agent 的最小插件三件套。原则是：一次只上一个新层，用真实任务和基线对照，没有可感知改善就卸载，并记为“该插件无实质增益”，而不是“插件机制无效”。

## 适用与不适用

- **官方插件市场**：适用——本机已安装并运行 Claude Code、能访问该 marketplace；想先浏览再决定装哪个；想按官方规范打包团队能力；愿意安装前检查插件主页和来源。不适用——没在用 Claude Code；需要先看到具体插件名单、评价或效果数据；期望 Anthropic 替你审核插件行为；不能接受插件访问文件与外部服务。原文明确 Anthropic 不控制插件里的 MCP server、文件或其他软件，也无法验证它们会按预期工作或不会变化。
- **职能插件与独立 Agent Skills**：适用前提是团队已用 Claude Code 或 Cowork；所需外部工具能通过 MCP 接入；有人愿意读插件的 `skills/` 并按本团队流程改写；你希望把某职能的领域知识、工具连接和固定动作预打包复用。Blender 需要 Blender 5.2 LTS+ 并支持 Agent Skills；PM 需要能读结构化 Markdown 的代理；科研示意图需要 Node.js 22+ 与 Chromium。不适用——只看 README 就指望复现技能内部的提示词、脚本或 QA 规则；期望开箱即用、不做定制就大幅改善；需要先看到官方效果数据才采用。
- **claude-skills 按域技能包**：适用——现有 11 个职能插件没有覆盖你的域，或你想拿一个可复制的 `SKILL.md`＋`scripts/`＋`references/` 结构做团队模板；需要同一套 skill 跨 Claude Code、Codex、Cursor 等工具复用；愿意在安装前跑安全审计并按域隔离安装。不适用——只看 README 就想复现技能内部提示词、脚本或 QA；需要前后对比数据或用户案例才采用；不愿做安装前审计；想一次全装。前提是本地有 git 与 Python 3，已装 Claude Code 或任一编码智能体；Windows 需用 `git clone -c core.symlinks=true` 并开启开发者模式，同时设置 `PYTHONUTF8=1`。
- **subagent-studio**：适用——中大型代码库、复杂变更：每次改多个文件、有真实用户、代码要维护多年；或无人值守的定时运行；能用 git 和 worktree、能定义 check commands。不适用——小而明确的工作；需要先看到结果证据才采用；不能接受每个变更的数倍 token；无法确认 `docs/evidence.md` 里的证据细节。
- **superlite**：适用——已安装 Claude Code、git、Python 3.10+、bash（Windows 上用 Git Bash），`uv` 可选；有一个 spec 清晰的中小型功能；愿意先用人工审批计划模式跑一轮，并用 `.superlite/metrics.jsonl` 和测试通过率自行复核。不适用——需要独立效果证据才采用；不能接受它与 superpowers 技能名冲突、不能在同一会话同时启用；高风险变更需要你逐步把关时直接上 AI 编排；没有 git 或 Python 3.10+ 的环境。
- **work-mode**：适用——Claude Code 2.1.314+ 且支持 function-hook plugins；你希望 AI 不因内部、可逆步骤停下来询问（本地文件、本地提交、测试），把对外发送消息、安装、密钥、不可恢复删除、付款、权限变更、生产变更等硬停项集中到最后报告；你希望把抽取、分类、摘要、评审等可由 checker 或 spot check 验证的批处理交给后台 subagent 或外部 CLI；你希望收口时不开新分支、完成已打开事项、只列新增或变化的决策并带 label 和 recommendation。不适用——Claude Code 低于 2.1.314 或不支持 function-hook plugins；需要量化效果证据才采用；不能接受 gate 直接 deny 带来的摩擦；会把密钥、force push、部署等真正的硬停项错误转换；需要插件替你按时间、事件或状态自动调度任务（材料没有提供这种机制）。
- **收口层、观测层、交接层**：收口层适合经常被 AI 反问、经常要回头翻测试结果的人；观测层适合想把“有没有变好”变成数字的人，但面板只在 CLI 或 Claude Desktop 的 Code tab 显示；交接层的 Project Sentinel 适合任务跨上下文窗口、需要定时唤醒和拍板不阻塞的人，但只在 Windows 11 和作者验证过的 Claude Code 版本上验证过，远程会话未测试。
- **block-ptc（DSH PTC 专用）**：适用——你在用 DeepSeek Harness（DSH）>=0.2.1-rc.2 和 PTC 模式；一个会话里有多个相对独立子任务、需要跨任务交接；你愿意让模型自己写交接摘要并遵守 `content` 写作规范；你需要完整 transcript 保留和确定性回放。不适用——单块连续、信息强耦合、需要逐字回溯原始对话的任务；不在 DSH 上；期望它自动跑或替代 DSH 内置自动压缩引擎；不愿接受“被省略的信息在后续请求里就不存在”；需要先看到量化收益才采用——作者自己声明节省 token、降低成本等收益尚未验证。
- **billion-context**：适用——长跑型编码会话（小时级到天级、单会话上千次调用）；上下文经常被撑爆，或宿主内置压缩把有用细节切掉；客户端有插件缝（pi、omp、opencode、dsh、kimi、hermes、zcode）或有可用启动器；你愿意每个会话用 `/acp-cache` 核对前缀缓存命中率。不适用——短任务，收益不明；不能用 npm 全局安装；用 Claude Desktop 的 Code 标签页（会绕过代理）；需要 Remote Control 等账号绑定功能；闭源客户端既不支持 baseURL 改写、也不能信任代理 CA；不愿接受“被压缩的区间在还原前只剩摘要”。
- **maxagent 跨会话经验层**：适用——本机装好 Node.js 18+，至少装一个受支持 agent（Claude Code、Codex、Antigravity、OpenClaw）；你受够了每个新会话从零重解同一个问题，愿意让工具修改 agent 的全局规则文件并先备份；偏个人/单机试用，想先看“已验证做法能不能在命令前被拦住”。不适用——需要团队协作或多人共享工作区（材料没有说明）；需要先看到基准、用户案例或前后对比数据才采用；不愿接受共享经验包是“他人编写的、会被注入 agent 上下文的指令文本”；不能接受 `adopt` 会把共享 atom 提升为可阻断命令的本地条目。
- **Pi 终端 agent 插件组合**：适用——已在本地安装并可运行 Pi 终端 agent；能用 npm 安装全局包；有可用模型 API（第三方中转或官方均可）；想让 token、费用、context 占用常驻可见；需要联网读 GitHub 仓库、PDF；愿意只先装作者建议的三件套。不适用——不用 Pi；插件不能直接迁移到 Claude Code、Cursor 等；不愿让插件以你的用户权限运行；需要先看到 Pi 比 Claude Code 更省钱或正确率更高的证据（材料没有，作者主张无数据）；想一次装 11 个。

## 前置条件

1. 能使用 Claude Code（有 `claude` CLI）或访问 claude.com/plugins 的 Cowork。
2. 版本口径：观测层（广）Claude Code 2.1.287+；收口层在 2.1.292 上构建；交接层 >=2.1.289 且带 function-hooks 插件 API；subagent-studio 的 `roles` 配置需要 v2.1.292+；观测层（深）本地开发需要 Node 22.19.0 或更高。
3. 独立技能：Blender 5.2 LTS+；PM 可选 Python 环境；schematic-figure 需要 Node.js 22+ 与 Chromium，导出 TIFF/EPS/PowerPoint 还要 Python 3 加 Pillow、python-pptx、lxml 并安装 `pdftops` 或 Ghostscript。
4. superlite 需要 git、Python 3.10+、bash；`uv` 可选；被构建的项目可以是任何语言。
5. subagent-studio 需要 Claude Code 构建支持 plugin 和 marketplace；要用七步流程需能建分支和 `git worktree`，并先定义好 check commands。
6. 收口层 PRs 标签页需要已安装并登录的 `gh`；测试/构建要由 Claude 作为独立命令运行。
7. 交接层运行面为终端 CLI 或 Claude Desktop 的 Code tab 本地会话；远程云会话未测试。
8. 自行确认仓库许可：Blender 是 MIT；PM 是 CC BY-NC-SA 4.0；schematic-figure 代码是 MIT，内置 Latin Modern 字体是 GUST 字体许可；superlite、subagent-studio 和 claude-skills 也按各自仓库许可确认后再用于生产；maxagent 是 MIT。
9. 准备一个非敏感、小体量的现有项目做试用，并先记录 2–3 次基线：同一任务的完成时间、返工次数、补齐上下文的次数。
10. 同时用多层前先 `claude --version` 核对；升级 Claude Code 后先 `/reload-plugins`。
11. claude-skills 需要 git 与 Python 3；Windows 用 `git clone -c core.symlinks=true` 并开启开发者模式，设 `PYTHONUTF8=1`；安装前能运行其 `skill_security_auditor.py`，并把 PASS 作为继续安装的门槛，WARN/FAIL 先人工检查或放弃。
12. block-ptc 需要 DSH >=0.2.1-rc.2，随附 Cordis >=4.0.5；插件零运行时依赖（仅 `node:crypto`）；安装后必须重启一次；新建会话时选 Block PTC preset。本次发布只用 DSH 0.2.1-rc.2 做过 live 验证；peer 依赖只声明下限、无上限，新宿主只是“允许加载”，事件语义与 preset 配置仍需重新验证。
13. billion-context 需要 Node/npm；Linux/macOS 建议用用户级 prefix `--prefix=~/.local`，Windows 默认 npm prefix 可写；需要能全局安装 npm 包的权限；端口 8787（`bili start` 手动模式）与 18787 起的管理区可用。
14. billion-context 原生插件支持的客户端：pi、omp、opencode 1.x/2.x、dsh、kimi（Kimi Code ≥ 2.0.0）、hermes、zcode；启动器还支持 codex、claude、gemini、qwen、aider、goose。
15. Claude Desktop 的 Code 标签页会自设 `ANTHROPIC_BASE_URL` 绕过代理，而 `DISABLE_AUTO_COMPACT=1` 仍生效——既没压缩也没原生自动压缩；终端会话不受影响。走自定义 baseURL 会让 Claude Code 把会话当作第三方/API-key，Remote Control 等账号绑定功能会消失。
16. work-mode 主插件需要 Claude Code 2.1.314+ 且支持 function-hook plugins；gates 还需要 `bash`、`jq`、`git`、`python3`。模式按 session 生效，新会话要重新切换模式。
17. maxagent 需要本机装好 Node.js 18+；至少装一个受支持 agent；愿意让工具修改 agent 的全局规则文件（有备份）；首次试用只勾工作区加规则钩子，共享经验包与浏览器桥先不装。
18. Pi 终端 agent 已安装并可运行；能用 npm 安装全局包；有可用模型 API（第三方中转或官方均可）。Pi 插件以你的用户权限运行，装前看 README；Pi 插件是 Pi 生态专属，不能直接迁移到 Claude Code、Cursor 等，MCP 配置可经 pi-mcp-adapter 互相导入。首试只装 `pi-thirdparty-model-settings`、`pi-powerline-footer`、`pi-web-access` 三个，不要一次装 11 个。`pi-autoresearch` 必须在单独分支跑，并在 `.auto/config.json` 设 `maxIterations` 上限；它会自动 commit。`pi-purge` 的 strict 模式会不加载 `AGENTS.md` 和 skills。`pi-mcp-adapter` 装上后会自动关闭 Pi 自带 MCP，卸载后要手动打开。
19. 准备非敏感小项目，先记录 2–3 次基线：完成时间、返工次数、补齐上下文次数、确认提示次数、是否误提交或多写文档、最终决策是否完整；用 maxagent 时另记重复错误拦截次数与断点续做补充条数；用 Pi 三件套时另记 token、费用、context 占用百分比。

## 操作步骤

先选运行时：Claude Code/Cowork 走第 0–10 步；Pi 终端 agent 走第 4 步之六，不要在同一任务上同时叠两套。

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

3. 安装前检查插件主页和来源，确认你信任它包含的 MCP server 和文件访问。

**预期结果**：插件安装成功，可在低风险任务上试用。**失败处理**：若安装后调用失败，先检查插件主页和来源；若一周内没有任何指标变好，卸载，并记为“该插件无实质增益”。

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

原文列出 11 个插件：productivity、sales、customer-support、product-management、marketing、legal、finance、data、enterprise-search、bio-research、cowork-plugin-management。数据岗选 data，销售选 sales，法务选 legal，以此类推。只挑一个，不要一次装多个。如果你的职能不在上面，或需要跨运行时使用，去看第 4 步之二的独立 Agent Skills；如果现有 11 个职能插件仍不覆盖你的域，或你想拿一个可复制的 skill 结构做团队模板，看第 4 步之五的 claude-skills。如果你要动的是中大型代码库上的一次变更，看第 4 步之三的 subagent-studio，或第 4 步之四的 superlite。如果你不用 Claude Code 而用 Pi 终端 agent，直接看第 4 步之六。

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

`skills/` 放领域知识和工作流，Claude 在相关时自动取用；`commands/` 放你显式触发的动作；`.mcp.json` 通过 MCP server 接外部工具；`plugin.json` 是清单。四个定制方向：换 connector、加公司上下文、调工作流、建新插件。原文只给了总体步骤和目录结构，没有收录任何单个插件的具体 skill 内容、提示词全文或命令清单，要照做必须自己打开仓库对应目录去读。**预期结果**：Claude 在相关交互中自动取用你改过的知识和流程；用斜杠命令触发时，输出更贴近团队实际做法。开箱插件只是通用起点。

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

`review_guard.sh audit` 读取这两个 range，检查 merge 是否恰好带入了它们覆盖的内容；guard 拒绝把未审查工作 push 到 main；可选 hook 自动运行 guard。**配置**：`core.review.reviewed_paths` 把 scratch 目录和一次性脚本排除，避免多付 review 成本；`core.review.land` 默认 `merge-no-ff`，团队让人类合并则设 `core.review.land: pr`，合并必须用保留 trailers 的 merge commit；`roles.<role>` 设置模型或 effort 需要 Claude Code v2.1.292+，老版本留空由 agent 文件 frontmatter 决定。

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

5. 盯运行痕迹：项目下 `.superlite/` 里，`progress.md` 含 rulings 与日志，`test-summary.json` 是最新测试结果，`metrics.jsonl` 与运行历史记录每个 agent 的耗时与成本。这是判断跑得好不好的第一手材料。

6. 按需调计划粒度：`writing-plans` 会在计划头部写 `**Detail:** contracts | tests | full`，单个任务可覆盖。`contracts` 只给文件、签名、具名测试与精确值；`tests`（默认）额外给逐字测试代码；`full` 连实现代码一起给，用于刁钻算法。无人值守时由 `brainstorming` 自己选默认。

7. 让后续修复轮复用历史：implementer 的 frontmatter 设了 1 小时 prompt cache TTL，等价做法是设环境变量：

```text
CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h
```

**做法 B：AI 编排（无人驾驶）**

说：

```text
Build X. I am away, decide yourself
```

计划、lint、分发全都自动，需要决策的事项记录为 rulings，而不会打断你询问。协调者以 medium effort 运行；最终审查是一个全新的 Opus `final-reviewer` 以 high effort 跑单轮，只报发现不改代码，读由日志拼成的 review packet，目标 30 秒内完成。**怎么选**：要先把计划和成本看住、再放它跑，用做法 A；已经信任这类流程、要长时间无人值守，用做法 B。第一次用不要直接上 AI 编排。**与 subagent-studio 怎么选**：要计划、worktree、每步 check、两轮 review、带 trailers 的 landing 和 audit 链，用 subagent-studio；要更轻的 spec 到代码、模型分层路由、无人驾驶 rulings 和内置 benchmark harness，用 superlite。两者都做多代理，材料未说明同时装会不会互相干扰，先只在一个任务上用一套。

### 第 4 步之五：用 claude-skills 按域补一个领域的专业能力（做法 A / 做法 B / 做法 C）

**什么时候用**：现有 11 个职能插件没有覆盖你的域；你想拿一个可复制的 `SKILL.md`＋`scripts/`＋`references/` 结构做团队模板；需要同一套 skill 跨 Claude Code、Codex、Cursor 等工具复用。**什么时候跳过**：只看 README 就指望复现技能内部提示词、脚本或 QA；需要前后对比数据或用户案例才采用；不愿做安装前审计；想一次全装。一次只装一个域或一个技能，不要与已有职能插件一次叠多个。

**做法 A：在 Claude Code 里按域安装，先审计再装**

1. 克隆到本地：

```bash
git clone https://github.com/alirezarezvani/claude-skills.git
cd claude-skills
```

Windows 必须用：

```bash
git clone -c core.symlinks=true https://github.com/alirezarezvani/claude-skills.git
```

并开启开发者模式，否则 `.gemini/`、`.codex/`、`.vibe/`、`.hermes/` 镜像目录会变成单行指针文本；同时设置环境变量 `PYTHONUTF8=1`，否则打印 Unicode 的脚本会在旧代码页控制台崩溃。

2. 安装前审计目标 skill：

```bash
python3 engineering/skill-security-auditor/scripts/skill_security_auditor.py /path/to/skill/
```

前提：目标 skill 目录已在本地。审计覆盖命令注入、代码执行、数据外泄、提示注入、依赖供应链风险和权限提升，返回 PASS / WARN / FAIL。把 PASS 作为继续安装的门槛；WARN/FAIL 先人工检查或放弃，不要直接装。

3. 添加 marketplace，只装一个域或单个 skill：

```text
/plugin marketplace add alirezarezvani/claude-skills
/plugin install engineering-skills@claude-code-skills
/plugin install skill-security-auditor@claude-code-skills
```

其他域包名包括 `product-skills`、`marketing-skills`、`pm-skills`、`c-level-skills`、`finance-skills`、`business-growth-skills`、`ra-qm-skills`、`engineering-advanced-skills`。示例只装核心工程 24 个：`/plugin install engineering-skills@claude-code-skills`。**预期结果**：安装后能在会话里按固定句式调用该 skill；不出现就回查 marketplace 与包名，不要继续叠装。

**做法 B：在其他工具里安装或转换**

```bash
npx agent-skills-cli add alirezarezvani/claude-skills --agent codex
./scripts/codex-install.sh
./scripts/convert.sh --tool all
./scripts/install.sh --tool cursor --target /path/to/project
```

README 称全量转换约 15 秒；`--force` 可跳过确认。各工具目标目录不同：Cursor → `.cursor/rules/*.mdc`；Aider → `CONVENTIONS.md`；Kilo Code → `.kilocode/rules/`；Windsurf → `.windsurf/skills/`；OpenCode → `.opencode/skills/`；Augment → `.augment/rules/`；Antigravity → `~/.gemini/antigravity/skills/`；Hermes → `python scripts/sync-hermes-skills.py --verbose` 装到 `~/.hermes/skills/`；Mistral Vibe → `./scripts/vibe-install.sh` 装到 `~/.vibe/skills/`。校验示例：

```bash
find .cursor/rules -name *.mdc | wc -l
```

README 在期望值处写 346，同一页其他地方写 345 和 392，说明数字不可全信，以实际 `find` 结果为准。

**做法 C：调用、组合与自建**

固定调用句式：

```text
Using the senior-architect skill, review our microservices architecture and identify the top 3 scalability risks.
```

即“Using the <skill-name> skill, <任务>”，让智能体显式加载对应 `SKILL.md`。随包 Python 工具可直接调用，不经过智能体也能用，例如：

```bash
python3 finance/saas-metrics-coach/scripts/metrics_calculator.py --mrr 80000 --customers 200 --churned 3 --json
python3 marketing-skill/content-production/scripts/brand_voice_analyzer.py article.txt
python3 c-level-advisor/cto-advisor/scripts/tech_debt_analyzer.py /path/to/codebase
python3 product-team/product-manager-toolkit/scripts/rice_prioritizer.py features.csv
```

前提：README 称这些工具只用标准库、无需 pip 安装；但工具数量在文中出现 580 / 706 / 746 三种说法，具体某个脚本是否存在需自行 `ls` 确认。跨域工作时按四种编排模式组合：Solo Sprint（按项目阶段切换 persona，适合单人项目、MVP）、Domain Deep-Dive（一个 persona + 叠加多个 skill，适合架构评审、合规审计）、Multi-Agent Handoff（persona 互相评审对方产出，适合高风险决策、发布就绪检查）、Skill Chain（纯顺序串 skill，不用 persona，适合内容流水线、可重复清单）。要用 persona 就拷到对应目录：

```bash
cp agents/personas/startup-cto.md ~/.claude/agents/
```

自建时参照 `agents/personas/TEMPLATE.md`；自建 skill 参照 README 指向的 `alirezarezvani/claude-code-skills-agents-factory`。**怎么选**：官方职能插件是开箱通用起点；claude-skills 覆盖更广、可按域装、可跨工具转换；独立技能包是单点。先只装一个域或一个技能，用真实任务与“不装 skill”的基线比返工轮数，再决定是否保留。

### 第 4 步之六：在 Pi 终端 agent 上先配模型、状态栏、联网三件套（做法 A / 做法 B）

**什么时候用**：已在本地安装并可运行 Pi 终端 agent；能用 npm 安装全局包；有可用模型 API（第三方中转或官方均可）；想让 token、费用、context 占用常驻可见；需要联网读 GitHub 仓库、PDF。**什么时候跳过**：不用 Pi；不愿让插件以你的用户权限运行；需要先看到 Pi 比 Claude Code 更省钱或正确率更高的证据（材料没有）；想一次装 11 个。

**做法 A：先只装作者建议的三件套**

1. 装模型配置插件（前提：使用中转/第三方 API，不想手改 models.json）：

```text
pi install npm:pi-thirdparty-model-settings
```

运行 `/dsf-config` 打开本地网页，填 Base URL、API Key、模型名，保存后 `/model` 里立即可见，不用重启。支持四种协议：OpenAI 兼容、Responses、Anthropic、Gemini。可从 `/models` 接口拉取模型列表，点选添加。先只配一个主力模型，不要一次配多家。

2. 装状态栏插件（前提：想让 context 占用和费用常驻可见）：

```text
pi install npm:pi-powerline-footer
```

提供模型、思考档位、git 分支、context 占用、token 与费用；context 超 70% 变黄、超 90% 变红；`Alt+S` 暂存输入；常驻 bash 模式；`/vibe` 自定义加载文案。**注意**：这是作者推荐，材料没有对比证据；只作为成本可见性试用，不要写成“一定比 Claude Code 好”。

3. 装联网插件（前提：无；不配置也能用）：

```text
pi install npm:pi-web-access
```

提供 `web_search` 和 `fetch_content` 两个工具；默认走 Exa MCP；可接 Brave、Tavily、Kimi、博查等几十家搜索服务，需各自凭据；GitHub 链接会直接 clone 到本地；能解析 PDF；配了 Gemini 还能看 YouTube 视频。

**预期结果**：`/model` 能看到配置的模型；状态栏显示 context、token、费用；联网工具可调用。**失败处理**：命令不生效先查 Pi 是否安装、npm 全局权限、插件 README；不要继续叠装。

**做法 B：第一批用顺后，按最痛的点只加一个**

- context 占用排查：装 `pi-context-view` 后，`/context` 用图展示 context 被哪些内容占用；`/context injections` 能看到平时看不到的 system prompt、工具定义和其他插件注入的内容。作者称插件本身不占 context。
- 子 agent 派活：装 `pi-subagents`，内置 scout（读代码）、reviewer（审代码）、oracle（给第二意见）、worker（写代码）。用法是自然语言，例如“用 reviewer 审一下这个 diff”；支持并行和后台运行。作者建议一开始只用 reviewer 和 oracle。
- 计划批注：装 `plannotator`（包名是 `@plannotator/pi-extension`，包名和仓库名不一样）：

```text
pi install npm:@plannotator/pi-extension
```

Agent 出计划时自动在浏览器打开，可像批 PR 一样逐行批注，再一键把意见发回 Agent；也能 review 本地 diff 和 GitHub PR。启动时加 `--plan`，或用 `/plannotator-plan-mode` 切换。

- MCP 省 token：装 `pi-mcp-adapter`，把几百个工具定义收成一个约 200 token 的 mcp 代理工具，server 用到时才启动、闲置 10 分钟自动关闭；Cursor、Claude Code、Codex 里配好的 MCP 可一键导入。**副作用**：装上后会自动关闭 Pi 自带的 MCP，卸载后要手动打开。
- 暂不急的四个：
  - `pi-lens`：Agent 每次写入或修改文件时实时跑 LSP、linter、formatter 和结构规则检查，把问题直接反馈给 Agent，还能拦下“没读过文件就动手改”的操作。比较重，依赖各语言的 LSP 和 linter。
  - `pi-intercom`：同一台机器上多个 Pi 会话互发消息（`Alt+M`），例如研究会话把结论交给执行会话；`/handover` 会把当前会话总结后交接给另一个会话。只在多开会话时有用。
  - `pi-autoresearch`：自动实验循环——改代码、跑 benchmark，结果变好就保留，变差就回滚，一直循环。适合测试速度、包体积、构建时间这类有明确指标的优化。建议在 `.auto/config.json` 里设置 `maxIterations` 上限，并在单独的分支里跑，因为它会自动 commit。
  - `pi-purge`：`/purge` 替换 Pi 内置的 system prompt，可只用你自己的提示词运行，适合做 prompt 实验和对比。注意 strict 模式下连 `AGENTS.md` 和 skills 都不加载。

**怎么选**：先只装三件套，一周后只按最痛的点加一个；不要一次装 11 个。不用的一定要卸载。Pi 插件是 Pi 生态专属，不能直接迁移到 Claude Code、Cursor 等；能迁移的只有 MCP 配置可经 pi-mcp-adapter 互相导入。不要把 Pi 三件套和 Claude Code 的观测层、收口层同时叠在同一任务上；材料没有说明会不会互相干扰。

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

三个标签页：Needs you（Claude 问你的问题、只有你能做的任务、失败的测试或构建）、Findings（任务之外注意到的 bug、风险和想法）、PRs（本会话和当前分支的 pull request、阻塞项、等你处理的 review 评论）。快捷键：`1 / 2 / 3` 切换标签页，`j / k` 上下移动，动作字母执行，`ctrl+x` 在面板与会话之间切换。插件会核对测试/构建状态：Claude 把每个测试或构建作为独立命令运行；如果 Claude 说某件事通过了，但上次运行失败、或改动后没再跑过，插件会要求重跑或声明未测试。会话空闲 15 分钟或恢复会话时，提示符上方会自动展开简短状态摘要。成本口径：每次 Claude 回复后触发一次轻量 Sonnet 调用，3–4k 输入（约 2k 命中缓存）、100–250 输出，约 0.5¢/回复；空闲 5 分钟后约 1¢；插件自身指令与工具约 1,350 token。作者称一次较长 Opus 会话中约占 1%，会话越短占比越高。

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

第二个集合 `YeonwooSung/my-claude-code-mods` 建立在官方 Mods 机制之上。6 个 mod：`agent-profiler` 看会话时间去向并可导出 OTLP trace；`context-inspector` 看上下文浪费；`time-machine` 用 shadow-git 快照记录每一次工具调用；`loop-detective` 检测重复失败和 edit/retry 循环；`pin-memo` 固定备忘和 todo；`model-effort-band` 显示模型与 effort。先只装一个：反复同类失败选 `loop-detective`；上下文经常被塞满选 `context-inspector`；想知道时间花在哪选 `agent-profiler`；要定位哪次编辑弄坏了测试选 `time-machine`。安装机制按官方文档使用 `plugin@marketplace`；具体安装命令和配置项进各自 README 读，不要照抄看起来像的命令。量 mod 自身开销用四配置对照：一次性大型代表性仓库固定在一个 commit；同一工作负载跑无 mod、仅 profiler、仅 Time Machine、三个全上；用 `--plugin-dir` 显式加载并禁用其他插件；计时区间外重置文件和 recorder 存储；每种配置 warm-up 并至少 5 次测量，交替顺序；记录 wall time、tool-call 数量、model tokens、snapshot 平均值；按 median/p95 报告，把模型延迟与 snapshot/hook 时间分开。原文没有给出四配置的性能结果，别拿单元测试通过当作性能可接受。

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

只想验证有没有减少上下文溢出和人工盯守，先做这一步；决定长期用再正式安装。在 Claude Desktop 的 Code tab 用工作副本，把文件夹名写进 `~/.claude/settings.json` 的 `env` 块 `CLAUDE_CODE_PLUGIN_DIRS`。打开 Control Room：

```text
/cr
```

六节：Overview / Context / Behavior / Guardrails / Activity / Setup。其它命令：`/cr status`、`/cr cache`、`/cr decisions`、`/cr decide D-2`、`/cr diagnostics`。Autopilot 默认 Off。在 Context 里设阈值（窗口百分比或 token 数；README 截图里的 70% 与 80% 只是截图示例，不是推荐值）。到阈值时 Claude 先做完当前步骤，然后记录里程碑、更新项目文档、CLAUDE.md 只留持久指令、跑一次最小验证、写 `NEXT_SESSION_PROMPT.md`；Project Sentinel 运行 `/clear`，用里程碑和目标播种新上下文，Claude 自行继续。每一步都在下一轮开始或结束时推进，绝不按定时器走。Watchers：

```text
/cr watch in 2h S-002 result
```

支持 `at 14:00`、`tomorrow at 9am`；三种策略 Keep warm / Fresh / Smart。Fresh 唤醒需要健康的 resume 状态；Watchers 只在 Claude Code 运行时工作。Mission Queue：

```text
/cr queue <text>
```

每项只在边界投递：下一个安全边界、本轮之后、当前里程碑之后，或下一个新上下文。绝不插进某一轮推理中间；跨 `/clear`、交接、重载和恢复会话与 run 一起保留，只投递一次。Decision Inbox：

```text
/cr decisions
/cr decide D-2
```

插件给 Claude 一个 `decision_request` 工具，选择停在 Activity → Operations → Needs review；答复随 Claude 下一批工具结果送达。Claude Code 自己的权限提示和确认永远不会被这里延后，插件也不代你回答权限提示。Run Budget 默认 Off：

```text
/cr budget $30
```

设成本、墙钟时间和交接次数上限，80% 时提示一次；到上限时可选只通知 / 自行开工前先问 / 让 Claude 做完当前里程碑再暂停。它不会中断正在进行的工具调用或轮次。Machine load 默认 Off：给 CPU 和内存建议上限（Low / Medium / High / Custom），不是 OS 配额。Cache Guardian 默认 On：会在会重发 100k+ 热 token 的模型切换前先确认；Keep warm 默认 Off，会在你离开时于缓存过期前不久重发一次最后请求，是明确的成本项。Cold Resume Guard 默认 On：向大上下文发送消息且缓存确定已失效时，先问 Continue full session / Start fresh from resume state / Compact first / Cancel。权限策略按类别给 Default / Ask / Deny（包安装、网络、下载、项目内编辑、项目外编辑、删文件、commit、push、force push 与 reset、部署发布、危险命令）。选 profile 而不是逐项配：Normal、Frontier Max、Low Resource、Release / QA 和自定义。Answer styles 只影响对你说的话，不影响代码、文件或提交信息。和 inbox 怎么选：最痛的是 Claude 谎报测试通过，先上 inbox；最痛的是长跑任务里被反复叫去拍板、或要等到某个时间点才继续，先用交接层。材料未说明两者同时装会不会互相干扰，先只用一个。

### 第 7 步之二：让模型按工作单元划上下文块并自己写交接摘要（DSH PTC 专用，做法 A / 做法 B）

**什么时候用**：你在用 DeepSeek Harness（DSH）>=0.2.1-rc.2 和 PTC 模式；一个会话里有多个相对独立子任务，需要在任务之间交接；你能接受“被省略的信息在后续请求里就不存在”，因此要求模型把用户要求、纠正和约束完整写进摘要。**什么时候跳过**：单块连续、信息强耦合、需要逐字回溯原始对话的任务；不在 DSH 上；期望插件自动跑或替代 DSH 内置自动压缩引擎；需要先看到量化收益才采用。

**做法 A：在 DSH 里安装 block-ptc**

1. 安装 bundle。在 Harness Plugin Manager 里找 `dsh-block-ptc`，或让启用了 Plugin Manager 工具的 agent 执行：

```text
plugin_manager  install_bundle  dsh-block-ptc
```

本地 checkout：

```sh
git clone https://github.com/mengwEX/dsh-block-ptc.git
```

```text
plugin_manager  install_bundle  /absolute/path/to/dsh-block-ptc
```

手工安装等价做法：编辑 `~/.dsh/profiles/<profile>/package.json`，把依赖和 bundle 加进去；只保留需要新增的两处，不要改原有 `ptc` preset：在 `dependencies` 加 `dsh-block-ptc`，在 `dsh.profile.bundles` 加 `dsh-block-ptc`。在该目录下运行 `pnpm`。

2. 重启一次应用。loader 按解析后的 URL 缓存插件模块，安装 bundle 改变组合后不重启会继续跑旧模块。

3. 新建会话时在 preset 选择器里选 **Block PTC**。看不到 preset 时先查 `dsh.profile.bundles` 和 `plugin_manager list_bundles`，再重启。

4. 每次直接调用 `run_code` 都带 header，guard 会强制；被拒的调用本身不会被打标签，带上 header 重试即可：

```text
run_code({ description: "[block: <ids>] <goal>", code })
```

header 规则：`[block: <ids>]` 必填、逗号分隔、非空、唯一，id 不得含逗号、方括号、换行；`<goal>` 必填，与 header 同一行。同一条 assistant 消息里多个调用的 id 取并集，并作用于整条消息（含其前的 thinking/text）及其工具结果。

5. 在程序内收尾一个块：

```text
await tools.block_compact({ ids, content })
```

`content` 照这个规范写：完整保留后续工作仍需的信息，细化到可以直接接着做；对不再需要的信息简要概括，删掉无关与重复内容；准确保留用户的要求、纠正和约束；记录已完成的工作、结果、未完成事项和下一步。

6. 掌握收尾时机：围绕相对独立的工作单元划分块，做同一件事时复用同一 id；只在“内容不再需要”或“结果已向用户汇报、要转向其他工作”时 compact。仅仅完成一个工作步骤，不构成 compact 的理由；后续执行、回复或讨论还要用的内容要留着。

7. 读返回值判断状态：成功返回 `{ replaced, tokensFreed, ids? }`；若工具结果或其他压缩仍在挂起，返回 `{ replaced: 0, tokensFreed: 0, pending: true, requestSeq, note }`，这只表示已排队，不代表已替换。

8. 自查安装：

```sh
npm run check
node tests/logic.test.mjs
```

9. 卸载或停用：

```text
plugin_manager  remove_bundle  dsh-block-ptc
```

停用而不删包：

```text
plugin_manager  set_bundle  dsh-block-ptc enabled=false
```

两者都需重启。

**做法 B：不装插件，只借机制**：不在 DSH 上，或不想引入社区插件时，保留三条做法——按相对独立的工作单元给会话分段；在转场时手写一份交接摘要，必须包含用户要求、纠正、约束、已完成、未完成和下一步；原始对话不要删，摘要只作为下一段工作的入口。代价是边界和摘要都靠人。**怎么选**：在 DSH PTC 上、且任务确实有多个独立子任务，用做法 A；否则用做法 B，或者先用第 7 步的 Project Sentinel 做跨会话交接。块级压缩、billion-context 和 Project Sentinel 都在动上下文边界，材料没有说明同时装会不会互相干扰，先只在一个任务上用一套。

### 第 7 步之三：把上下文压缩的时机交给模型（billion-context，做法 A / 做法 B / 做法 C）

**什么时候用**：长跑型编码会话（小时级到天级、单会话上千次调用）；上下文接近窗口时你只能手动 `/compact`，或宿主自动压缩把有用细节切掉；你希望压缩是增量、可逆、前缀缓存友好的，而不是硬截断。**什么时候跳过**：短任务，收益不明；只跑一两次的会话；不能用 npm 全局安装；用 Claude Desktop 的 Code 标签页；需要 Remote Control 等账号绑定功能。

**做法 A：原生插件（推荐先试 `bili plugin install opencode` 或 `bili claude`）**

1. 安装 npm 包（Linux / macOS 用户级 prefix，避免 sudo 与自更新权限问题）：

```bash
npm install -g billion-context --prefix=~/.local
```

把 `~/.local/bin` 加进 PATH：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

前提与失败处理：用 nvm / Homebrew Node 时默认 prefix 已属当前用户，可直接 `npm install -g billion-context`；Windows 默认 npm prefix 可写，直接装；旧 root-owned prefix 报 `EACCES` 时带 `--prefix=~/.local` 重装，不要用 `sudo`，今后每次重装该包都要再带一次。

2. 装原生插件（一次只装一个客户端）：

```bash
bili plugin install opencode
bili plugin install claude
bili plugin install pi
bili plugin install omp
bili plugin install dsh
bili plugin install kimi
bili plugin install hermes
bili plugin install zcode
```

前提：kimi 需 Kimi Code ≥ 2.0.0；dsh 走 npm 形式，粘贴 GitHub 地址会装到无 `dist/` 的源码导致加载失败。opencode 必须同时关掉原生自动压缩，否则双重压缩；先备份配置文件，再启用 billion-context 插件，并关闭自动压缩（`compaction.auto = false`）。claude 也可走插件市场：

```text
/plugin marketplace add ranxianglei/billion-context
/plugin install billion-context@billion-context
/billion-context:bili-setup
```

3. 照常启动客户端（插件模式无启动器命令、无固定端口、无 URL 改写）。**预期结果**：会话里出现四个上下文工具（`compress`、`decompress`、`search_context`、`acp_status`）。**失败处理**：工具不出现先回查客户端插件条目是否写入，再重启客户端；不要继续叠装第二种接入形态。

4. 每个会话做一次健康检查：

```text
/acp
/acp-cache
```

判定标准：健康会话的前缀缓存命中率保持 **95–97%**，压缩本身开销 **≤2%**。持续偏低时按顺序排查：上游缓存 TTL 过期 → 切换模型 → 插件 bug（应上报）→ 其他。

5. 让模型用起四个工具：接近窗口时用 `compress` 折叠较早区间；需要精确细节时用 `decompress` 还原；查旧信息先用 `search_context` 而不是重读全文；需要总览时调 `acp_status` 看哪些区间仍可压缩。这四个工具由模型自己决定何时、压缩哪一段，不是硬截断。

**做法 B：启动器（无配置改动）**

```bash
bili claude
bili codex
bili pi
bili omp
bili opencode
bili hermes
bili dsh
bili kimi
bili gemini
bili qwen
bili aider
bili goose
```

前提：启动器每次新起代理实例、不复用端口；对不支持 baseURL 改写的闭源客户端用证书 MITM，需要客户端信任代理 CA；`goose` 因 rustls 不信任 CA 文件，无法 MITM，只能走 baseURL 重定向。

**做法 C：URL 改写（最通用）**：把客户端 baseURL 前缀改成“代理 origin + `/bili/`”。适合有 baseURL 配置项、但没有插件缝的客户端。**Codex 的特殊前提**：`bili plugin install codex` 只写入一个 MCP 块（暴露四个 ACP 工具），不能让 codex 自身流量走代理；必须先有可用代理（`bili start` 或任一 lane 的代理，环境变量 `BILI_MCP_PROXY` 优先，其次活实例记录，最后 8787 默认）。要零配置完整效果就用 `bili codex` 启动器。**端口与常驻**：`bili start` 手动模式独占 8787；各 lane 自管理区从 18787 起，冲突则 +1 并各自记住漂移；升级重启时若旧构建仍在端口上排空，最多等 5s 后重绑同一端口。**避免双重压缩**：原生插件与本仓库的独立进程内扩展（`billion-context-pi`、`opencode-acp`）互斥，两者同时生效即双压；安装器会替换旧条目并把原配置快照为 `.bili-bak`，项目级安装不会被自动处理，需手工删除；pi 侧需要 `billion-context-pi` 0.1.72+ 才能靠 `BILLION_CONTEXT_NATIVE=<host>` 标记自动让位。**怎么选**：有插件缝的客户端用做法 A；闭源二进制无插件缝、或不想改配置用做法 B；只能改 baseURL 的用做法 C。不要在同一客户端上叠加两种形态。与第 7 步之二（block-ptc）的关系：两者都在动上下文边界，材料未说明同时装会不会互相干扰，先只在一个任务上用一套；block-ptc 是 DSH PTC 专用、按工作单元替换整段消息，billion-context 是跨客户端的代理、由模型自己选区间压缩并可还原。

### 第 8 步：用 maxagent 给多个 agent 加跨会话经验层（做法 A / 做法 B）

**什么时候用**：本机装好 Node.js 18+，至少装一个受支持 agent（Claude Code、Codex、Antigravity、OpenClaw）；你受够了每个新会话从零重解同一个问题：搜索、尝试、失败、再找一遍；你希望把工作中写下的短小已验证配方（atom）在“你发消息时 / 执行命令前 / 报错后”自动浮现；你愿意让工具修改 agent 的全局规则文件并先备份。**什么时候跳过**：需要团队协作或多人共享工作区（材料没有说明）；需要先看到基准、用户案例或前后对比数据才采用；不愿接受共享经验包是他人编写的、会被注入 agent 上下文的指令文本；不能接受 `adopt` 会把共享 atom 提升为可阻断命令的本地条目。

**做法 A：亲自跑安装向导（推荐）**

1. 前提：Node.js 18+；至少一个受支持 agent；接受工具写全局规则文件。首次只启用工作区加规则钩子，共享经验包与浏览器桥先不装。运行：

```text
npx maxagent init
```

向导会建工作区 `~/maxagent`（`AGENTS.md`、`experience/`、`projects/`、`sync.md`、`inbox/`），可选建私有 Git 仓库做同步；对它发现的每个 agent 写入带标记的规则块与钩子；就附加组件只问一个问题——全部安装 / 自选 / 都不装；最后输出总结。首次在自选项里只勾工作区加规则钩子。**预期结果**：`npx maxagent doctor` 能看到装了什么且健康；全局规则文件只多了带标记的块。**失败处理**：先比对备份或 `git diff`，确认没有覆盖你原有规则；不要继续装共享包。

2. 日常运维命令：

```text
npx maxagent setup          # 改设置，如 updates: false 可彻底关掉网络请求
npx maxagent doctor         # 查装了什么、健不健康
npx maxagent update         # 更新规则/钩子/agent 块，不动工作区
npx maxagent experience list | add <pack> | all | update | mute <pack> | adopt "<id>"
npx maxagent uninstall      # 从 agent 里移除块与钩子，工作区保留
```

3. 按两层规则使用：自己写的 atom 在 `experience/`，优先浮现，且可以拦住已知会失败的命令；共享 atom 从仓库下载的 pack 只做参考，仅在自己那层为空时显示、阈值更高、每条消息最多一条、只给标题加第一步、永不阻断命令。觉得有用的共享 atom 用 `npx maxagent experience adopt "<id>"` 复制进自己的层；噪音用 `npx maxagent experience mute <pack>`。

4. 隐私开关：在 `npx maxagent setup` 里设 `updates: false`，则完全无网络请求。

5. 以后想开浏览器桥时：

```text
npx maxagent bridge
```

扩展需手动加载：`chrome://extensions` → 打开开发者模式 → “加载已解压的扩展程序” → 选目录；向导会等到桥连上。它通过 Chrome 扩展（Native Messaging）驱动你自己的 Chrome，使用你自己的 profile 和登录态，不开端口，逐 agent 审批，有站点黑名单、动作日志和停止按钮。

6. 以后想开本地语义检索时：

```text
npx maxagent vectors
```

约 270 MB，模型 revision 固定并做 sha256 校验，Python 库落在 `~/.maxagent/vector`；无 Python 时向导会提议安装（Windows 走 winget，需另行确认）；没有它则只用词面搜索。

7. 以后想开共享经验包时：

```text
npx maxagent experience add all
```

共享包是挂在 GitHub Release 上的单个 JSON，客户端校验 sha256、文件名和文本内容（下载即执行命令、试图改写 agent 规则、外发密钥、破坏性命令、隐藏字符），命中任一项整包拒收。即便如此，也应先按不可信内容对待；先 `mute` 到只留少量，再逐个 `adopt`。

**注意**：atom 的具体书写格式由 `experience/_spec.md` 定义，该文件内容未出现在给出的材料中，因此“经验条目怎么写”这一步无法照抄，只能装完后读该文件。

**做法 B：让 agent 代跑交互式安装（可选）**：README 给了一段可直接复制的委派提示词，价值在于它同时约束了“问全、不替用户选、跳过任何一项”的交互纪律：

```text
Install maxagent: run `npx maxagent init`. Without a terminal it prints the questions: ask me all of them, choose nothing for me and skip nothing, then pass me its report.
```

**怎么选**：想先看清楚装了什么、只开最小功能，用做法 A；已经在用 agent 跑安装、想让提问不被代选，用做法 B。无论哪种，首次都只勾工作区加规则钩子；共享经验包和浏览器桥等两周验证后再开。

### 第 9 步：用 work-mode 控制自主推进、批处理委派和收口（做法 A / 做法 B）

**什么时候用**：你希望 AI 不因内部、可逆步骤停下来问（本地文件、本地提交、测试），把对外发送消息、安装、密钥、不可恢复删除、付款、权限变更、生产变更等硬停项集中到最后报告；或希望把抽取、分类、摘要、评审等可由 checker 或 spot check 验证的批处理交给后台 subagent 或外部 CLI；或希望收口时不开新分支、完成已打开事项、只列新增或变化的决策。**什么时候跳过**：Claude Code 低于 2.1.314 或不支持 function-hook plugins；需要量化效果证据才采用；不能接受 gate 直接 deny 带来的摩擦；真正的硬停项必须每次询问，不能被 auto 转换；需要插件替你按时间、事件或状态自动调度任务（材料没有提供这种机制）。

**做法 A：只装主插件，先用模式**

1. 安装：

```text
/plugin install work-mode --marketplace danyuchn/claude-work-mode
```

按提示回答 `y` 添加 marketplace，并选 scope。前提：Claude Code 2.1.314+ 且支持 function-hook plugins。

2. 切换模式：

```text
/work-mode auto
/work-mode wrap
/work-mode auto wrap
/work-mode
```

`auto` 不因内部、可逆步骤停下来询问；硬停项进入 pending list，最后统一报告；会弹确认提示的调用放到最后连续执行。`out` 把可由 checker 或 spot check 验证的批处理交给后台 subagent 或外部 CLI，主线程负责验证；主线程一轮读了大量原始输出却没委派时，触发一次性 nudge。`wrap` 收敛，不开新分支，完成已打开事项，只列新增或变化的决策，每项带 label 和 recommendation。`off` 恢复正常。模式按 session 生效，可组合；同时输入 `out` 和 `wrap` 时 `wrap` 优先。裸 `/work-mode` 打开多选 picker。

3. 预期结果：模式文本只在下次工具结果或 prompt 时送达模型一次，compaction 或 resume 后再送一次，不每轮膨胀上下文。新会话要重新切换模式。`auto wrap` 适合需要自主推进但最后必须收敛列决策的会话；批处理任务可用 `auto out`。不要把 `out` 和 `wrap` 同时当作两个目标使用。

4. 可选配置：默认无需配置。需要个性化时创建 `~/.config/work-mode/config.json`，或用 `WORK_MODE_CONFIG` 指向配置文件；字段可参考 `examples/config.example.json`。README 列出的字段包括 `locale`、`userName`、`pronouns`、`autonomous.extraRules`、`dispatch.pickerHint`、`dispatch.instructions`、`dispatch.commandPattern`、`dispatch.nudgeThresholdChars`、`dispatch.nudgeTemplate`、`dispatch.quotaFile` / `poolRouting`、`converge.sectionHeading`、`converge.decisionLabels` / `tradeoffLabel`、`converge.autoCloseCommand`。未配置时语言按 `WORK_MODE_LOCALE`、Claude Code `language` 设置、`LC_ALL` / `LANG` 顺序判断，否则英文。

**做法 B：加 work-mode-gates，把部分询问改成 deny 并继续**

1. 先确认 `bash`、`jq`、`git`、`python3` 齐全，再安装：

```text
/plugin install work-mode-gates --marketplace danyuchn/claude-work-mode
```

gates 会把模式写入 `~/.claude/state/tempo/<session_id>` 供 shell hooks 读取，并通过 `tempo-auto.sh` 提供 `tempo_auto_on "$INPUT"` 和 `tempo_deny "<reason>"`。

2. 三个 gate 的行为：`scratch-doc-guard.sh` 是 `PreToolUse Write`，正常会先询问是否新建 `SUMMARY*/REPORT*/NOTES*/FINDINGS*/ANALYSIS*.md`；在 `auto` 下改为 deny，并告诉模型更新已有文档、使用 scratch dir 或直接在回复中回答。`git-safe-commit-gate.sh` 是 `PreToolUse Bash`，正常会在带路径的 `git commit`（带或不带 `--`）以及 `git add <file>...` 但文件已有未暂存修改时询问；在 `auto` 下改为 deny，要求先用 `git add -p`，再执行普通 `git commit`。`decision-label-guard.py` 是 `Stop` 事件，阻止决策区存在未加 label 的条目，或 tradeoff 条目没有说明双方各得到什么；在 `auto` 下行为相同。

3. 只把希望被 `auto` 转换的检查放进 `tempo-auto.sh`；密钥、force push、部署等真正的硬停项保持每次询问，不要转换。先在隔离仓库或沙箱逐个启用 gate，记录拒绝是否合理、是否造成额外返工；频繁拒绝合理操作就调整配置或停用对应 gate。

**怎么选**：先只装主插件，用 `auto wrap` 跑本地可逆任务、用 `auto out` 跑可验证批处理，观察模式本身是否添乱；确认后再加 gates。不要在同一个会话里把 `out` 和 `wrap` 当两个目标用，`wrap` 会胜出。work-mode 与收口层 inbox、交接层 Project Sentinel 有部分重叠（都在处理打断、待办和决策）；材料没有说明同时装会不会互相干扰，先只在一个任务上用一套。

### 第 10 步：贡献回仓库（可选）

职能插件是 markdown 文件，fork 后改，提 PR。交接层是 MIT、无构建步骤的 TypeScript，按本地 clone 改、`/reload-plugins` 热加载即可。Blender 是 MIT，可 fork 后运行 `validate_skills.py` 和 `run_tests.py`；PM 是 CC BY-NC-SA 4.0，fork 和再分发要遵守许可，添加技能遵守 `## Input` 和不用 `$ARGUMENTS` 的约定；schematic-figure 代码是 MIT，内置 Latin Modern 字体是 GUST 字体许可。claude-skills 是 MIT，按仓库自带审计与贡献方式改；superlite 和 subagent-studio 按各自仓库的贡献方式和许可来。block-ptc 是 MIT，按仓库的测试与贡献方式改；它是社区插件，不是 DSH 官方组件。billion-context 和 work-mode 按仓库许可与贡献方式确认后再用于生产。maxagent 是 MIT；改之前先备份全局规则文件，按仓库说明跑 `npx maxagent update` 或 `npx maxagent uninstall`，工作区文件归用户所有、升级不覆盖。Pi 插件按各自仓库 README 的许可和贡献方式确认；它们是 Pi 生态社区插件，不是 Pi 官方组件。

## 怎么判断变好了

先分清来源：职能插件原文没有给出验证方法或指标；收口层只有成本口径；交接层只有机制描述；观测层（深）明确没有给出四配置性能结果；Blender、PM、示意图材料都只到 README；subagent-studio 只有作者单项目自述、仓库仅 30 星，关键证据在未包含的 `docs/evidence.md`；superlite 的 3.9 倍与 52% 是作者用自建 harness 单次或少量运行自测得出，材料未说明 52% 的具体口径，且鲁棒性探针低于对照组，不能当定论；claude-skills README 全是目录与宣传、没有效果数据、没有用户案例或基准测试，规模数字还自相矛盾；block-ptc 的作者明确说节省 token、降低成本等收益尚未验证；billion-context 的 ContextBench / LongMemEval-S / MemoryAgentBench 数字是作者自测或自建基准，短任务收益不明；work-mode 只有 README 和演示主张，没有量化数据、对照实验或案例结果；maxagent 全部来自仓库 README 自述，没有基准、用户案例、故障率或前后对比数据；Pi 插件组合来自一条低互动推文，作者称比 Claude Code 更省钱、正确率更高，但没有任务、样本、对比方法或任何数字。

**通用最小试用**：先记录 2–3 次基线（完成时间、返工次数、补齐上下文次数），装一个插件或技能包，跑一个真实任务，再对照同一类任务。试一两周；没有可感知改善就卸载，并记为“该插件无实质增益”。

**职能插件**：同一任务完成时间、返工次数、补齐上下文的次数是否下降；`/xxx:yyy` 是否出现并成功执行，这是最硬的通过/不通过信号。

**独立技能**：Blender 记录完成时间、人工干预次数、能否通过目标引擎导入检查、`blender-asset-qa` 是否报出 z-fighting、浮空部件、坏法线或权重问题；PM 用真实 PM 任务与裸提示对比，看完成时间、返工、输出能否直接使用；示意图看从需求到可用初稿的时间、人工调整轮次、SVG/PDF 能否逐处编辑、按 `standard` 口径复核每个计数/方向/连接时的漏检比例，以及字体授权是否满足投稿要求。

**claude-skills**：先只装一个域，安装前审计必须 PASS；挑两个真实任务与“不装 skill”的基线对比返工轮数、完成时间和人工补齐次数。看 `skill-doctor`、`self-eval` 或 SkillCheck 徽章能否从真实会话取证并过确定性闸门，但材料没有前后对比数据、用户案例或基准测试，不能引用其结论。若返工轮数没有下降，或审计 WARN/FAIL 未处理，卸载；若只想借鉴思路，就保留“从真实会话取证＋闸门”的检查方式，不要采信规模数字。

**subagent-studio**：在中大型代码库上只装 `studio-core`，跑 `studio-init`，再对一个中等以上变更执行 `Plan and build X with studio-core:plan-then-build`。看 landing commit 是否有 `Reviewed-by` / `Fixed-after-review` trailers、数字是否真实；`review_guard.sh audit` 是否判定 merge 恰好带入被审查内容、有没有漏掉的 landing；两轮 review 分别抓到了什么；token 用量相对单会话是否可接受。若第二遍独立 review 抓不到东西、guard/audit 从不拦停、trailers 记不出真实数字，说明数倍 token 没换来质量收益。

**superlite**：先在中小型、spec 清晰的功能上走人工审批计划模式，记录从提出需求到拿到已测试代码的时间、测试通过率、`.superlite/metrics.jsonl` 里每个 agent 的耗时与成本、最终审查抓到的问题数、你需要介入的次数。若这些指标不比单会话或 subagent-studio 好，或鲁棒性探针低于对照组，不要推广。需要更硬的对比时，用仓库自带 harness 跑 `superlite` 与 `superpowers` 两臂，并看 `mechanical_ab` 验证模型路由是否划算。

**Pi 三件套**：最小试用 1 周，1 个真实任务；只装第一批三个，只在一台机器、一个日常真实项目上试；`/dsf-config` 先只配一个主力模型，确认 `/model` 能看到且不用重启；挑一个必须查外部资料的任务（读一个 GitHub 仓库、读一份 PDF），记录联网前后各自的轮数、结论质量、token、费用、context 占用；状态栏看 context 超 70% 变黄、超 90% 变红；`/context injections` 看 system prompt、工具定义、插件注入。一周后若没有可感知改善就卸载。作者的“比 Claude Code 更省钱、正确率更高”没有任务、样本、对比方法或数字，不能当结论；互动量很低（点赞 28、转发 7、回复 17），属单人经验分享。后续插件逐个加，每次只加一个，记录是否减少轮数、返工、人工检查。

**Pi 后续插件**：`pi-mcp-adapter` 看工具定义 token 是否从几百个工具降到约 200 token 代理、MCP server 是否按需启动、闲置 10 分钟关闭；注意卸载后手动打开自带 MCP。`plannotator` 看计划批注后返工轮数、计划被采纳前的人工修改次数。`pi-lens` 看写入时 lint 反馈是否减少“没读文件就改”和提交前返工；依赖 LSP/linter，环境不齐会变重。`pi-subagents` 只用 reviewer/oracle 起步，看审查发现数和返工轮数，不把角色分工当效果证据。`pi-autoresearch` 只在有明确指标（测试速度、包体积、构建时间）时用；独立分支 + `maxIterations`，看 benchmark 是否稳定变好，否则回滚。

**收口层**：每个会话里被你漏掉、事后才发现的待办/问题数量是否下降；手动追问“刚才那个测试过了吗”的次数是否下降；切换窗口/翻记录的次数是否下降；成本侧看每会话新增开销占比是否可接受。

**观测层**：广层看工具失败/被拒调用次数、单次工具延迟、上下文占用、每轮时长/token/中断、cache 读/写；深层看会话时间去向、窗口占用构成、重复读取次数、重复失败与 edit/retry 循环、任意步骤的文件原貌。若这些数字在同类任务上没有改善，换一个或卸掉。

**交接层（Project Sentinel）**：看 Handoff Health、跨交接的里程碑连续性、上下文溢出/被迫压缩次数、你手动 `/clear` 或 `/compact` 的次数、你守着 run 的时间、Watchers 是否按时间唤醒、Mission Queue 是否只在边界投递且只投一次、Decision Inbox 是否让拍板不阻塞 run。几次交接后里程碑仍连续、Handoff Health 没有明显空洞，才算有价值。

**block-ptc（DSH PTC）**：最小试用是在一个 DSH 0.2.1-rc.2 实例上装 bundle、重启、新开 Block PTC 会话，选一个含 4–6 个相对独立子任务的真实任务（例：读仓库 → 讲 tokenizer → 讲 lexer → 写并跑测试），每个子任务一个 block id，转场时 compact 前一个块；同一任务再用默认 `ptc` preset 跑一遍作基线。看五项：同一任务每次请求的输入 token 曲线；provider 侧缓存命中与账单（必须实测，不能拿 `tokensFreed` 当结论）；后续步骤里是否还记得用户此前给出的要求、纠正与约束，记录“用户不得不重述”的次数；返工次数与完成时间；机制健康度（是否频繁 `pending: true`、guard 拒绝、`compaction/start` 无配对 `end` 导致压缩停摆）。判定规则：上下文占用与账单不上升，且重述次数/返工次数不增加、关键约束零丢失，则继续用；若 token 降了但账单或缓存命中变差、或出现关键信息丢失导致返工，结论降为 study——只借鉴“模型自写交接摘要 + 完整日志保留 + 确定性回放”这套设计，不绑这个插件。

**billion-context**：最小试用是在一个具体客户端上装原生插件（推荐先 `bili plugin install opencode` 或 `bili claude`），跑一个真实长会话；每个会话看 `/acp` 与 `/acp-cache`：健康会话前缀缓存命中率保持 95–97%，压缩本身开销 ≤2%；持续偏低按“上游缓存 TTL 过期 → 切换模型 → 插件 bug → 其他”顺序排查。再看上下文占用曲线、你手动 `/compact` 的次数、重述次数、返工次数与完成时间。作者的 ContextBench `0.3097` Utilized F1 且比 full 省 `-58.3%` 成本、LongMemEval-S `79.20%` 对最佳 RAG `62.60%`（+16.6%）、独立会话成本省 `-71.1%`、MemoryAgentBench 1.48M token TTL 上 100% 存活（full 199/199 失败）、稳态压缩 30×，都是作者自测或自建基准，需自行复现；短任务收益不明。

**work-mode**：在隔离仓库或沙箱中试用，准备两类任务：一类是本地可逆修改加测试，另一类是有 checker 的批处理（抽取、分类、摘要或评审）。先记录不用插件的基线：完成时间、确认提示次数、返工次数、是否出现误提交或多余文档、最终决策是否完整。安装 `work-mode`，对本地可逆任务使用 `/work-mode auto wrap`；对可验证批处理使用 `/work-mode auto out`。先不安装 gates，观察模式本身的行为；再逐个启用 gates：先在沙箱验证 `scratch-doc-guard.sh` 和 `git-safe-commit-gate.sh`，再验证 `decision-label-guard.py`。每启用一个 gate，记录它拒绝的请求是否合理、是否造成额外返工。判断改善时看任务结果和安全事件，不要只看提示次数：硬停项是否仍被正确报告、是否发生未授权操作、是否减少可逆步骤的打断、批处理是否被正确委派并由主线程验证、是否减少多余文档和需修复的提交、`wrap` 的决策列表是否完整且 label 正确。若 gate 频繁拒绝合理操作或导致返工，先调整配置或停用对应 gate；只有在任务结果不差于基线、硬停项没有被绕过时，才考虑扩大使用范围。

**maxagent**：最小试用两周。选一台非关键机器，只对一个 agent（建议 Claude Code）执行 `npx maxagent init`，附加项只勾工作区加规则钩子；`npx maxagent doctor` 确认状态，`git diff` 或备份比对确认全局规则文件只多了带标记的块；在 `npx maxagent setup` 里决定是否 `updates: false`；照常做 1–2 周真实工作，只记录指标，不额外干预；结束后读 `experience/_spec.md`，看自己写下的 atom 是否符合格式、是否被钩子真的调用过。指标：重复错误拦截次数——同一类错误第二次出现时是否被自己的 atom 在命令前拦住，两周内为 0 说明经验层没起作用；重新摸索成本——新会话从任务开始到第一条有效命令的轮数，与安装前同类任务对比；断点续做成本——靠 `projects/` 恢复任务时，用户需要额外补充的上下文条数是否下降；经验库活性——`experience/` 里新增 atom 数 vs 被实际引用的 atom 数，只增不引用比例过高说明钩子或格式不适配，应改写 atom 而非继续堆量；可控性——`npx maxagent uninstall` 后全局规则文件是否干净还原（diff 为空）。判定线：两周内若重复错误拦截次数与断点续做补充条数都没有可观察下降，判为对本工作流无改善，回退到 uninstall；只有在自建层跑通、且确实出现被拦住的重复错误之后，才考虑开共享包（先 `mute` 到只留少量，再逐个 `adopt`）和浏览器桥。

## 常见坑

- 官方市场原文没有收录任何具体插件，也没有效果数据；Anthropic 不控制也不验证插件内容，安装前必须自己检查插件主页和来源。
- marketplace 条目的 `name` 是不可变 slug；改名会让用户安装报 `plugin-not-found`；要改显示名改 `displayName`，必须改名时用 `renames` 映射。
- `strict: false` 声明 skill 包时路径相对于 `source.path`；每个路径指向包含 `SKILL.md` 的目录，注册为 `<plugin-name>:<skill-name>`。
- 仓库热度不是效果：39,182 stars、Blender 42 stars、PM 7421 stars、schematic-figure 31 stars、subagent-studio 30 stars、block-ptc 37 stars、maxagent 48 stars 都只反映关注度。
- 材料可能被截断：PM README 末尾截断在 “worth a bookmark if you work”；交接层材料截断在 Lazy-exit guard；subagent-studio 材料截断在 “每个 agent 文件在 frontmatter 里固定 model、”。未给出的行为不要照抄。
- 职能插件和三个独立技能包都只到 README，未展示技能内部提示词、脚本、配置或 QA 规则；开箱插件原文自称 general starting points，价值在定制。
- 命令不出现 = 未生效；先检查 marketplace，不要继续往下做。
- 不要一次装多个职能插件或技能；subagent-studio 先只装 `studio-core`；superlite 先只跑一个人工审批计划；claude-skills 先只装一个域或一个技能；maxagent 首次只开工作区加规则钩子；Pi 首次只装模型配置、状态栏、联网三个。
- 小而明确的编码工作不要上 subagent-studio：单会话更便宜，小变更上很少买到东西。
- subagent-studio 的七步流程有关键留白：plan 的固定 shape、`reviewer-prompt.md` 的检查项、占位符完整内容都要自己补；copy-in 会合并 hooks 并重写命名空间；`core.review.land: pr` 合并时必须保留 trailers；`review_guard.sh` 如果从不拦停，先怀疑配置没接上。
- superlite 不能与 superpowers 同时启用：二者共享 skill 名且都注入会话上下文，会冲突。
- superlite 的人工审批计划模式在 approve 之前不做 lint、分发或写文件；AI 编排模式把需要拍板的事项记成 rulings，不会打断你；高风险变更不要直接上 AI 编排。
- superlite 的 `Est. context` 系数只在一个项目上拟合过，只能当参考；最终审查只报发现不改代码；大代码库上装 Graphify 会先问你，push 必须经你确认。
- superlite 的作者自测数据不是独立证据：3.9 倍与 52% 来自自建 harness 的单次或少量运行，鲁棒性探针低于对照组；Codex 与 Grok 安装命令作者自标 Unverified。
- claude-skills 的 README 数字自相矛盾：392 / 346 / 345，工具数量 580 / 706 / 746；以实际 `find`、`ls` 结果为准，不能把规模数字当质量。
- claude-skills 安装前必须审计；Windows 不用 `core.symlinks=true` 会让镜像目录变成单行指针文本；旧代码页控制台打印 Unicode 需 `PYTHONUTF8=1`。
- claude-skills 的 `human-gate`、`agent-memory`、`security-guidance` 的 PreToolUse hook 等只有一句话，没有配置细节；`agent-launcher`、`run-without-you`、`grade-iterate`、`loop-library`、`skillopt-sleep`、`autoresearch-agent`、`deep-research` 等长跑/主动推进组件缺触发条件与持续机制配置，材料不足以照做。
- claude-skills 的 `skill-doctor`、`self-eval`、SkillCheck 徽章没有前后对比数据、用户案例或基准测试；只能借鉴“从真实会话取证＋闸门”的思路，不能引用其结论。
- claude-skills 随包 Python 工具数量说法冲突，具体脚本用 `ls` 确认；跨工具转换目标目录不同，Cursor 用 `.cursor/rules/*.mdc`，Aider 用 `CONVENTIONS.md`，不要混。
- 收口层每轮都要花钱，短会话额外开销占比更高；没减少遗漏就卸载。
- 观测面板有硬边界：必须在 CLI 或 Claude Desktop 的 Code tab 里用；VS Code 聊天面板和 `claude -p` 不显示面板；深层 mod 对引擎版本敏感，2.1.280 早期访问版下 Context Inspector 缺少 `session.append`、Time Machine 的 per-test 选项会被忽略。
- 观测层（深）的 README 只有概览，具体安装命令和配置项要进各自 README；原文对 marketplace 只给了 Add this marketplace once 的机制描述，没有命令行。
- 两个观测集合不要同类一起上：`context-meter` 与 `context-inspector`、`error-inbox` 与 `loop-detective` 都在看相近的东西；先只在一边装一个。
- 交接层只在 Windows 11 和 Claude Code 2.1.289 / 2.1.293 / 2.1.295 上验证过，远程会话未测试；它建立在 still early access 的 function-hooks API 上，不宜直接定为团队标准。
- 从 1.4.0 之前的 Control Room 升上来，`Allow` 权限状态被移除（已保存的 Allow 读作 Default），点 Kit 不再打开面板；Autopilot 不是定时器；Watchers 只在 Claude Code 运行时工作；Keep warm 是成本项；Run Budget 和 Machine load 都不能掐断进行中的工作。
- Decision Inbox 只管插件自己的决定请求，Claude Code 自己的权限提示不会被延后；inbox 的 Needs you 与 Decision Inbox 可能重叠，先只用一个。
- 数字口径要看清：观测 mod 截图不是原生 app 截图，而是测试套件用 fixture 数据捕获的渲染树；Desktop Usage Strip 的 USD 不是订阅账单；部分 forecast 和 token 计算是估算；Autopilot 阈值截图里的 70% / 80% 只是示例。
- Blender 需要 Blender 5.2 LTS+，MCP server 可用性自行确认；43 个 headless 测试是否全部通过无法从材料验证。PM 是 CC BY-NC-SA 4.0，添加技能必须有 `## Input` 且不能用 `$ARGUMENTS`。schematic-figure 不替代设计图的人，证据是作者自制五篇论文对比演示，没有量化评分或盲评；字体许可与代码许可不同。
- block-ptc 的 guard 会拒绝不带 header 的直接 `run_code` 调用；被拒的调用本身不会被打标签，带上 header 重试即可。
- block-ptc 一次摘要只能替换一个从最早到最晚的连续区间；区间内有受保护的 system/developer 消息则整段被拒，不会只替换前缀。
- block-ptc 被省略的信息在后续请求中就不存在；摘要必须自己写全，准确保留用户要求、纠正和约束。
- block-ptc 返回 `pending: true` 只表示已排队，不代表已替换；不要拿它当压缩成功。
- block-ptc 的 preset 不在列表，查 `dsh.profile.bundles` 与 `plugin_manager list_bundles` 后重启；报 `invalid config: $.mode expected native | ptc but got both`，是老 0.2.x bundle 装在 DSH 0.2.1+ 上，升级到 0.3.0 并重启。
- block-ptc 摘要报 `no current content for ids`，说明该 id 在当前界面从未出现在 `run_code` header 中，检查拼写；已摘要过的 id 是关闭态。块一直不压缩，说明从未用 `block_compact` 关闭，内容会留到自动压缩时被折进通用摘要。
- block-ptc 会话里压缩突然失效，先查是否存在没有配对 `compaction/end` 的 `compaction/start`（持久锁）；本插件每次失败都会自己闭合括号，旧版本遗留则新开会话。
- block-ptc 的 `tokensFreed` 不是 provider 的 cache-hit 度量；更小的上下文不等于更高缓存命中或更低账单，必须实测。
- block-ptc 本次只用 DSH 0.2.1-rc.2 做过 live 验证；peer 依赖只声明下限、无上限，新宿主只是“允许加载”，事件语义与 preset 配置仍需重新验证。块是 per-session 的，子代理各跑自己的上下文与块。
- billion-context 的 Claude Desktop Code 标签页会自设 `ANTHROPIC_BASE_URL` 绕过代理，而 `DISABLE_AUTO_COMPACT=1` 仍生效——既没压缩也没原生自动压缩；终端会话不受影响。
- 走自定义 baseURL 会让 Claude Code 把会话当作第三方/API-key，Remote Control 等账号绑定功能消失；需要这些功能时用不带 bili 的 plain `claude`，或 `bili plugin remove claude`。
- opencode 装了插件但没关自动压缩会双重压缩；项目级安装的旧条目不会被安装器自动清掉，要手工删。
- billion-context 健康会话前缀缓存命中率应保持 95–97%、压缩本身开销 ≤2%；持续偏低先查上游缓存 TTL 和模型切换，不要先怪插件。
- `bili plugin install codex` 只写 MCP 块，不让 codex 流量走代理；要完整效果用 `bili codex` 启动器。
- billion-context 的 ContextBench / LongMemEval-S / MemoryAgentBench 数字是作者自测或自建基准，短任务收益不明，需自行复现；不要把机制指标当成账单结论。
- work-mode 只有 README、没有源码、测试内容或 demo 文字转写；README 提到 60 秒演示视频，但输入中没有视频内容。
- work-mode 的效果主张主要是作者陈述：模式文本不会每轮膨胀上下文、三种模式会改变行为、gates 能把“询问”转成“deny 并继续”；没有量化数据、对照实验或案例结果。
- work-mode 的模式按 session 生效；新会话要重新切换。模式文本只在下次工具结果或 prompt 时送达模型一次，compaction 或 resume 后再送一次，不要假设它每轮都在提醒模型。
- `out` 和 `wrap` 同时输入时 `wrap` 优先；不要把二者当两个独立目标用。
- work-mode gates 会强制拒绝某些行为，可能带来摩擦：`scratch-doc-guard.sh` 可能拒绝合理的报告文件；`git-safe-commit-gate.sh` 会要求改用 `git add -p`；`decision-label-guard.py` 只检查 label 和 tradeoff 表述，不保证决策质量。
- 真正的硬停项（密钥、force push、部署等）不要放进 `tempo-auto.sh` 转换；只把希望被 `auto` 转换的检查放进去。
- gates 依赖 `bash`、`jq`、`git`、`python3`；版本不够或缺少 function-hook plugins 时只考虑主插件，不要装 gates。
- work-mode 与 inbox、Project Sentinel 有部分重叠；材料没有说明同时装会不会互相干扰，先只在一个任务上用一套。
- maxagent 全部来自仓库 README 自述，没有基准测试、用户案例、故障率或前后对比数据；仓库 48 stars、单作者项目，README 自承翻译未经母语者校对。
- maxagent 的 `experience/_spec.md` 未出现在材料中，atom 的实际书写格式无法照抄；不安装就无法复现“经验怎么写”，钩子的具体配置内容也未给出，无法手工复刻到别的 agent。
- maxagent 的共享经验包本质是“他人编写的、会被注入 agent 上下文的指令文本”，即便有 sha256 和内容扫描，也应先按不可信内容对待；`adopt` 会把共享 atom 提升为“可阻断命令”的本地条目，等于提升其权限。
- maxagent 的共享包安全属性（下载即执行、改写 agent 规则、外发密钥、破坏性命令、隐藏字符的扫描）和浏览器桥安全属性（无开放端口、逐 agent 审批）都是设计声明，材料中没有第三方审计或复现记录。
- maxagent 首次不要装共享经验包和浏览器桥；先只开工作区加规则钩子，用两周指标决定是否继续。`npx maxagent uninstall` 只从 agent 里移除块与钩子，工作区保留；改全局规则文件前先备份。
- maxagent 的 `vectors` 约 270 MB，模型 revision 固定并做 sha256 校验；无 Python 时向导会提议安装，Windows 走 winget 需另行确认。没有它则只用词面搜索。
- Pi 插件全部绑定 Pi 终端 agent，不能直接迁移到 Claude Code、Cursor 等；能迁移的只有 MCP 配置可经 pi-mcp-adapter 互相导入。
- Pi 插件以你的用户权限运行，装前看 README；不用的一定要卸载。
- 作者“比 Claude Code 更省钱、正确率更高”没有数据；互动量很低（点赞 28、转发 7、回复 17），是单人经验分享，不是可复现评测。
- Pi 第一批只装模型配置、状态栏、联网三个；不要一次装 11 个。状态栏 70% 黄 / 90% 红只是显示阈值，不是推荐阈值。
- pi-mcp-adapter 会自动关闭 Pi 自带 MCP，卸载后要手动打开；这是一条明确副作用。
- pi-lens 比较重，依赖各语言 LSP/linter；环境不齐会失效或变重。pi-purge 的 strict 模式连 `AGENTS.md` 和 skills 都不加载，等于放弃项目约定。
- pi-autoresearch 会自动 commit 且烧 token，必须在独立分支 + `maxIterations` 上限下跑。pi-intercom 只在多开会话时有用；`/handover` 是总结后交接，不是自动同步全部上下文。
- pi-subagents 的 scout/reviewer/oracle/worker 是角色分工，不是效果证据；一开始只用 reviewer 和 oracle。
- pi-context-view 的 `/context injections` 能看到 system prompt、工具定义和其他插件注入内容；作者称插件本身不占 context，材料未给测量方法。
- plannotator 的包名和仓库名不一样；启动加 `--plan` 或用 `/plannotator-plan-mode`。
- Pi 插件没有版本号、Pi 版本要求、插件间兼容性说明；材料只到推文和 README 指引。
- 不要把 Pi 三件套与 Claude Code 的观测层/收口层同时叠在同一任务；材料没有说明会不会互相干扰。

## 证据与来源

**官方插件市场**：安装与发现命令、统一目录结构、`strict: false` + 显式 `skills` 数组示例、路径相对 `source.path`、注册为 `<plugin-name>:<skill-name>`、`name` 不可变 slug、`displayName`、`renames` 映射均来自 `anthropics/claude-plugins-official` README；39,182 stars、当日 +307 来自抓取指标；没有收录具体插件、没有效果指标；Anthropic 不控制也不验证插件内容来自原文。

**职能插件层**：安装命令、目录结构、四个定制方向、11 个插件及用途来自 `anthropics/knowledge-work-plugins` README；插件自动激活、Skills fire when relevant 是原文主张；效果主张是作者主张，无数据、案例、benchmark 支撑；Cowork 开放范围、价格、区域限制和仓库许可未说明。

**独立 Agent Skills**：Blender 安装命令、支持代理、20 个技能、示例提示词、`validate_skills.py` 与 43 个 headless 测试来自 `EL4CTEO/blender-skills` README；42 stars 来自抓取指标；材料只到 README。PM 的安装命令、下载包、playground、技能结构、77 技能 + 6 工作流、`## Input` 约定、CC BY-NC-SA 4.0、7421 stars 来自 `deanpeters/Product-Manager-Skills` README；77 技能正文质量和效果数据无从验证。schematic-figure 的安装命令、提示词模板、look/size/depth 三旋钮、输出路径、Node 22+ 与 Chromium、可选 Blender/RDKit、字体许可见 `lgwrightlab/schematic-figure` README；证据只有作者自制五篇论文对比演示，属定性证据。

**claude-skills**：仓库 MIT；README 自称 392 个 skill、120 个 agent、151 个命令、7 个 persona、20 个领域、可转换给 13 种编码工具；单个 skill 的 `SKILL.md`＋`scripts/`＋`references/`＋可选 `assets/` 结构、Skills/Agents/Personas 三层分工、安装命令、按域包名、审计脚本与覆盖范围、Windows `core.symlinks=true` 与 `PYTHONUTF8=1`、Codex/Cursor 等安装与转换命令、目标目录、`find` 校验、随包 Python 工具示例、固定调用句式、四种编排模式、persona 拷贝与 TEMPLATE、`skill-doctor`/`self-eval`/SkillCheck 均来自 `alirezarezvani/claude-skills` README；README 无效果数据、无用户案例、无基准测试，规模数字自相矛盾；`human-gate`、`agent-memory`、`security-guidance`、`agent-launcher` 等只有一句话，缺配置细节；“先只装一个域、安装前审计、与不装基线比返工轮数”来自调研建议，不是原文效果数据。

**subagent-studio**：四个模块及 agents/skills/scripts、六条主张、三条安装命令、`studio-init` 行为、copy-in 行为、七步流程示例、landing trailers 示例、`review_guard.sh audit`、`reviewed_paths` / `land` / `roles` 配置、`roles` 需要 v2.1.292+、每个变更 agent 调用更多、一次 run 约 31 个 skill 中加载约 6 个、低于 50 行的严重 bug 发现率 9% 均来自 `priyanshujha/subagent-studio` README；仓库仅 30 星、作者自述约五周定时 Claude Code 会话、关键证据在未包含的 `docs/evidence.md`。

**superlite**：安装命令、本地 `--plugin-dir`、用 `Let's make a react todo list` 验证是否先触发 `brainstorming`、人工审批计划与 AI 编排两种模式、`.superlite/progress.md` / `test-summary.json` / `metrics.jsonl` / 运行历史、`Detail: contracts | tests | full`、`Est. context` 超 80k 拆分、可变部分小于固定前缀则合并、单任务约 3 分钟、最多 18 个 agent、计划 15k 字符以内、`CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h`、协调者 medium effort、最终 `final-reviewer` 用全新 Opus high effort 单轮只报发现、不能与 superpowers 同开、大代码库装 Graphify 先询问、push 需确认、`.superlite` 痕迹、bench harness 命令、`mechanical_ab` 验证模型路由，均来自 `iha2/superlite` README 与调研报告；作者自测的 3.9 倍与 52% 来自自建 harness 单次或少量运行，材料未说明 52% 的具体口径，鲁棒性探针低于对照组，属作者主张而非独立证据；`Est. context` 系数只在一个项目上拟合过；Codex 与 Grok 安装命令作者自标 Unverified。

**收口层**：安装与更新命令、三个标签页、快捷键、测试/构建核对、空闲摘要、成本表来自 `petekp/inbox` README；33 stars、单作者仓库来自原文与调研报告；分类准确率、误报漏报没有数据。

**观测层广**：命令、7 个分类与 mod 名单、2.1.287+、作者在 2.1.288 测试、mod 默认启用、VS Code 聊天面板与 `claude -p` 不显示面板、无运行时依赖来自 `whyashthakker/awesome-claude-code-mods` README；33 stars、声称 70 个 MIT 打包插件、社区 14 条于 2026-10-03 对照作者文档核查、截图是测试套件用 fixture 数据捕获的渲染树、社区条目未经安装运行与安全审计来自原文。

**观测层深**：6 个 mod 的名称与一句话用途、486 stars、官方 Mods 文档入口、`plugin@marketplace` 机制、各 mod README 路径、`npm test` 不模拟引擎事件、测试文件串行、CI 只跑独立核心测试、engine type declarations 本地生成、四配置对照方法、版本兼容对照来自 `YeonwooSung/my-claude-code-mods` README；原文明确没有给出四配置性能结果，20k span/item 测试只界定分析成本上限，UI 只验证 render trees 未验证 live pixels。

**交接层**：安装、会话内安装、本地 clone、`--plugin-dir` 试跑、Desktop 的 `CLAUDE_CODE_PLUGIN_DIRS`、迁移、更新、卸载、`/cr` 系列命令、六节面板、状态栏 HUD、Handoff Health、`milestones` 工具、`decision_request` 工具、权限策略、Autopilot 交接步骤、Watchers 三种策略、Mission Queue 边界投递、Run Budget / Machine load / Cache Guardian / Keep warm / Cold Resume Guard 默认值与行为、profiles 与 Answer styles 来自 `Arjun0014/project-sentinel` README；版本 1.6.3、MIT、无运行时依赖、2.1.289+ 且需 function-hooks、只在 Windows 11 与 2.1.289 / 2.1.293 / 2.1.295 验证过、远程会话未测试、1.4.0 更名与两处行为变化来自原文；减少上下文溢出和人工盯守没有量化数据。

**block-ptc**：v0.4.0、MIT、37 stars、DSH >=0.2.1-rc.2、Cordis >=4.0.5、零运行时依赖（仅 `node:crypto`）、安装/配置/工具调用/返回值/排错、`npm run check` 与 `tests/logic.test.mjs`、两个可选原生检查、快速上手样例 `{ replaced: 3, tokensFreed: 346 }` 均来自 `mengwEX/dsh-block-ptc` README；插件自己给出 `replaced` 与 `tokensFreed`，但原文明确 `tokensFreed` 不是 provider 的 cache-hit 度量，上下文变小不保证缓存命中率更高或账单更低；`docs/assets/context-comparison.en.png` 明确标注为机制示意、不是 API benchmark；“模型自己划线比自动压缩更好”是作者论证，不是实验；本次发布只用 DSH 0.2.1-rc.2 做过 live 验证，两个原生检查都离线、不跑模型，因此不验证实际块选择、压缩时机与信息保留质量。

**billion-context**：安装命令、三种接入形态、支持客户端清单、`bili plugin install/remove`、opencode 需手写插件条目与关闭自动压缩、kimi 需 Kimi Code ≥ 2.0.0、dsh 需 npm 形式、claude 插件市场命令、`/acp` 与 `/acp-cache`、95–97% 前缀缓存命中率与 ≤2% 压缩开销、排查顺序、Codex 只写 MCP 块且需先有代理、`BILI_MCP_PROXY` 优先级、8787 与 18787 端口规则、双重压缩互斥与 `.bili-bak`、项目级安装需手工删除、pi 需 `billion-context-pi` 0.1.72+、Claude Desktop Code 标签页绕过代理、自定义 baseURL 导致 Remote Control 等账号绑定功能消失、ContextBench `0.3097` Utilized F1 与省 `-58.3%` 成本、LongMemEval-S `79.20%` 对最佳 RAG `62.60%`（+16.6%）与省 `-71.1%`、MemoryAgentBench 1.48M token TTL 100% 存活与稳态压缩 30×，均来自 `ranxianglei/billion-context` README 与本次调研报告；效果数字是作者自测或自建基准，材料未给出独立复现，短任务收益不明。

**work-mode**：安装命令、`/work-mode auto|out|wrap|off`、模式可组合、`out` 与 `wrap` 同时出现时 `wrap` 优先、模式文本送达时机、gates 安装与三个 gate 行为、`tempo-auto.sh`、`~/.claude/state/tempo/<session_id>`、配置字段与语言判断均来自 `danyuchn/claude-work-mode` README；材料只有仓库 README，没有源码、测试内容或 demo 的文字转写，README 提到 60 秒演示视频，但输入中没有视频内容。效果主张主要是作者陈述：模式文本不会每轮膨胀上下文、三种模式会改变行为、gates 能把“询问”转成“deny 并继续”。没有量化数据、对照实验或案例结果。work-mode 的最小试用与判定（隔离仓库、两类任务、记录基线、先主插件后 gates、看任务结果和安全事件）来自本次调研报告的“怎么试、怎么验证”，不是原文效果数据。

**maxagent**：MIT、48 stars、单作者、Node.js 18+、受支持 agent（Claude Code、Codex、Antigravity、OpenClaw）、`npx maxagent init` 安装向导、工作区 `~/maxagent` 的 `AGENTS.md` / `experience/` / `projects/` / `sync.md` / `inbox/`、规则块加钩子、按“你发消息时 / 执行命令前 / 报错后”浮现 atom、自己的经验优先且可阻断命令、共享经验包只作参考且永不阻断、`adopt` / `mute`、`npx maxagent bridge`、`npx maxagent vectors`、`npx maxagent setup|doctor|update|uninstall`、`updates: false` 关闭网络请求、共享包 sha256 与内容审查、浏览器桥 Chrome 扩展 Native Messaging 与手动加载、`experience/_spec.md` 定义 atom 格式，均来自 `vzroslieigry/maxagent` README（本次调研）。材料明确：全部来自 README 自述，没有基准测试、用户案例、故障率或前后对比数据；仓库 48 stars、单作者项目、README 自承翻译未经母语者校对；`experience/_spec.md` 未提供，atom 实际格式无法照抄；共享包扫描与 CI 同检查的有效性、隐私清单（“只发公开文件的 GET 请求”）的完备性、浏览器桥安全属性（无开放端口、逐 agent 审批）都是设计声明，没有第三方审计或复现记录；“两周最小试用、重复错误拦截次数、重新摸索成本、断点续做补充条数、经验库活性、卸载后 diff 为空”的试用与判定来自本次调研报告建议，不是原文效果数据。

**Pi 插件组合**：11 个插件名称与仓库地址、4 条可复制安装命令（`pi install npm:pi-thirdparty-model-settings`、`pi install npm:pi-powerline-footer`、`pi install npm:pi-web-access`、`pi install npm:@plannotator/pi-extension`）、命令入口（`/dsf-config`、`/model`、`/context`、`/context injections`、`/vibe`、`Alt+S`、`Alt+M`、`/handover`、`/purge`、`--plan`、`/plannotator-plan-mode`）、配置项 `.auto/config.json` 的 `maxIterations`、具体数值（mcp 代理工具约 200 token、MCP 闲置 10 分钟关闭、context 70% 黄 / 90% 红）均来自 `@aehyok` 推文与本次调研报告。作者主张“又省钱、正确率还这么高、甚至高过了 Claude Code”，但没给任务、样本、对比方法或任何数字；“第一批装上就能感觉到变化”等排序是个人体感；互动量很低（点赞 28、转发 7、回复 17），属单人经验分享。插件以用户权限运行、装前看 README、不用要卸载来自作者原话。pi-lens 依赖各语言 LSP/linter；pi-purge 的 strict 模式不加载 `AGENTS.md` 和 skills；autoresearch 会自动 commit 且烧 token；pi-mcp-adapter 会自动关闭 Pi 自带 MCP、卸载后需手动打开；这些是原文给出的适用条件与风险。原文未提及版本号、Pi 版本要求、插件间兼容性问题。

**属于调研建议、非原文数据**：官方市场的最小试用路径（1–2 小时 + 一周观察、只挑一个、检查来源、低风险任务、记录完成时间/轮次/手工切换/失败比例/新任务，一周无改善则卸载）来自调研报告建议；职能插件与独立技能的自测指标来自调研报告建议；claude-skills 的“先只装一个域、安装前审计、与不装基线比返工轮数、没有改善就卸载”来自调研结论，不是原文效果数据；subagent-studio 的最小试用建议来自调研结论；superlite 的最小试用建议来自调研结论；block-ptc 的最小试用与判定规则来自调研报告的“怎么试、怎么验证”部分，不是原文效果数据；billion-context 的最小试用来自调研报告结论；收口层、观测层、交接层的最小试用与指标也来自各调研报告的“怎么试、怎么验证”部分；work-mode 的试用与判定同样来自调研报告建议；maxagent 的两周试用与指标来自本次调研报告建议；Pi 三件套的一周最小试用、只装三个、记录 token/费用/context/轮数、后续逐个加插件来自本次调研报告建议，不是原文效果数据。

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
- [alirezarezvani/claude-skills](../research/radar/2026-10-21/5609-alirezarezvani-claude-skills.md)：值得一试，先只装一个域、并在安装前用仓库自带的 skill-security-auditor 扫一遍，再挑两个真实任务与“不装 skill”的基线对比返工轮数；值得试的理由是它把领域流程固化成 SKILL.md＋脚本＋参考文档的可复制结构，但 README 全是目录与宣传、没有任何效果数据，规模数字还自相矛盾，不能直接 adopt。
- [mengwEX/dsh-block-ptc](../research/radar/2026-10-21/5616-mengwex-dsh-block-ptc.md)：值得一试，如果团队正在使用 DeepSeek Harness 的 PTC 模式，可以按 README 的安装步骤和 block 使用流程先做小范围试用，把模型自己写的交接摘要当作可控的上下文边界；如果不用这套宿主，就只借鉴它的机制。理由：安装、配置、工具调用和收尾规范都能照着做，但它只是有 37 个 star 的社区插件，只在一个宿主版本上做过实测，节省 token、降低成本等收益连作者自己都声明尚未验证。
- [ranxianglei/billion-context](../research/radar/2026-11-08/11533-ranxianglei-billion-context.md)：值得一试，值得在一个具体客户端上小范围试装（推荐先试 `bili plugin install opencode` 或 `bili claude` 启动器），用 `/acp`、`/acp-cache` 观察前缀缓存命中率与压缩收益，再决定是否推广；理由是安装、插件安装、启停和健康检查都给了可复制的命令和判定阈值，但省 token 与长会话效果主要是作者自测与自建基准，需自行复现。
- [danyuchn/claude-work-mode](../research/radar/2026-11-08/11590-danyuchn-claude-work-mode.md)：值得一试，建议小范围试用：在 Claude Code 中安装 work-mode，先用 `auto` + `wrap` 约束可逆自主步骤和收尾决策，视需要再加 gates；理由是它给出了可安装的模式、闸门和配置，但效果目前只有 README/演示主张、缺少量化验证。
- [vzroslieigry/maxagent](../research/radar/2026-11-10/12280-vzroslieigry-maxagent.md)：值得一试，先在一台非关键机器、只对一个 agent（如 Claude Code）跑 `npx maxagent init`，只启用工作区+规则钩子，暂不装共享经验包和浏览器桥，用两周观察“重复错误是否被拦住、断点续做是否更快”；它的安装与命令流程具体可照做，值得小范围试，但效果与安全全是作者自述、无任何数据或第三方验证。
- [@aehyok: 我没想到使用 Pi 又省钱，而且正确率还这么高，甚至高过了 Claude Code](../research/radar/2026-11-14/13343-pi-claude-code.md)：值得一试，按作者给出的顺序先装「模型配置+状态栏+联网」三个 Pi 插件并照着配置，再按需加装审查类插件；因为这三种做法都有明确的安装命令、命令入口和可见的量化指标（token/费用/context 占用），足以支持小范围试用，但作者「比 Claude Code 更省钱、正确率更高」的结论没有任何数据支撑，不能直接写进手册当结论。
