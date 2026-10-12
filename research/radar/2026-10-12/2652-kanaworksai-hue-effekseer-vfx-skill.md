# kanaworksai-hue/effekseer-vfx-skill

- 结论：**值得一试**。若团队做 Godot + Effekseer 实时特效，可按 README 给出的安装与 vfx doctor/setup/init/build/review 命令小范围试装；它的核心可迁移之处是把「生成 → 真实渲染验证 → 独立评审 → 证据绑定到具体构建」做成可复用闭环，即使不做特效也值得把这套结构搬到别的领域。
- 原文：https://github.com/kanaworksai-hue/effekseer-vfx-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-12T02:12:02.861Z

## 是什么

这是一个 Agent Skill 仓库（`kanaworksai-hue/effekseer-vfx-skill`，32 stars），把「让编码 Agent 用写代码的方式做实时游戏特效」封装成可在多种 Agent Skill 宿主（Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode 等）中安装的技能。它自称的循环是：

**design brief → textures → Python recipe → EffekseerCore build → real Godot filmstrip → look → fix one thing → repeat → independent review**

仓库包含两个技能：

- **`effekseer-vfx`**（创作技能）：特效制作规则、经核实的 Effekseer/Godot 引擎约定、约 30 个可组合的图层原语、静态 linter、官方 EffekseerCore 编译器（带保存/打开回读校验）、Godot Lab（把每个特效摆成两个假人之间的交换动作）、带像素标记的胶片条截帧、迭代历史，以及把评审绑定到「它所看到的那次确切构建」的防篡改证据。
- **`vfx-review`**（评审技能）：由**另一个** Agent 在看不到 recipe 的前提下按固定评分表给胶片条打分——因为作者不给自己打分。

另有 13 个完成态特效示例（火焰、冰、毒、暗四组远程「投射物 + 命中」，加上 hit、slash、charge、shield、heal 各一，以及三个带诊断的 before/after 案例）。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **确认能力与前提**（先做这步，不要跳过）。README 给出的模式与需求：
   - authoring（写 brief/recipe、lint、处理与测量贴图）：需要 Python 3.11+ 或 [uv](https://docs.astral.sh/uv/)，macOS/Linux/Windows 均可（macOS 自带 Python 3.9 太旧）。
   - build（用官方 EffekseerCore 编译 `.efkefc`/`.efk`）：需要 **macOS on Apple silicon** 或 **Windows x64**，首次 setup 需联网（约 250 MB 下载到 `~/.cache/effekseer-vfx`）。
   - render（Godot 胶片条评审、Lab、预览、打包）：在以上基础上还需要 PATH 中或 `GODOT` 环境变量指向的 [Godot 4](https://godotengine.org)（Forward+），以及用于参考片段和录制的 `ffmpeg`。
   - 已验证组合：macOS ARM64（Effekseer Core 1.80.7、EffekseerForGodot4 1.80.5.1、Godot 4.7、.NET 9）与 Windows 11 x64（同版本，Godot 4.7.2）。Windows ARM64 会由 setup 装上匹配的 .NET 运行时但**未验证**；Linux 只能跑 authoring，其 build 路径**未验证**。
   - Windows 上所有 `sh <skill>/scripts/...` 命令也可在 Git Bash（Claude Code 所用）里跑；在 cmd 或 PowerShell 里，`vfx` 改用 `<skill>\scripts\vfx.cmd`，`setup.sh` 改用 `powershell -NoProfile -ExecutionPolicy Bypass -File <skill>\scripts\setup.ps1`。

2. **安装技能**。README 说最简方式是把这个仓库 URL 交给你的编码 Agent 并让它安装；也可以自己装：

   Claude Code（在 Claude Code 中输入）：
   ```text
   /plugin marketplace add kanaworksai-hue/effekseer-vfx-skill
   /plugin install effekseer-vfx@effekseer-vfx
   ```

   Codex（在 Codex 会话中；技能落在 `~/.codex/skills` 或 `$CODEX_HOME/skills`，从下一轮或新会话生效）：
   ```text
   $skill-installer install https://github.com/kanaworksai-hue/effekseer-vfx-skill/tree/main/skills/effekseer-vfx
   $skill-installer install https://github.com/kanaworksai-hue/effekseer-vfx-skill/tree/main/skills/vfx-review
   ```

   其他 Agent（Cursor、Gemini CLI、Copilot、OpenCode 等）：
   ```sh
   npx skills add kanaworksai-hue/effekseer-vfx-skill
   ```

   或手动把 `skills/effekseer-vfx` 和 `skills/vfx-review` 拷进你 Agent 的 skills 目录（`~/.claude/skills/`、`.agents/skills/` 等），保持目录名不变。注意：**不要拷别的东西**，两个技能目录自带 `LICENSE`（`effekseer-vfx` 另有 `THIRD_PARTY_NOTICES.md`），运行时自包含且只读。

3. **加载并在游戏项目里查机器**。若技能列表里还没出现，让用户开个新会话。然后在**用户自己的游戏项目目录**下运行：
   ```sh
   sh <skill>/scripts/vfx doctor
   ```
   （Windows 非 Git Bash：`<skill>\scripts\vfx.cmd doctor`），并按其 `next` 提示操作。注意 `doctor` 里的 `render: true` 只表示「找到了 Godot」。

4. **下载前先征求同意**。`sh <skill>/scripts/setup.sh`（Windows 用 `setup.ps1`，确切命令在 `doctor` 的 `next` 里）会把工具链装进 `~/.cache/effekseer-vfx`（macOS ARM64 与 Windows x64 约 250 MB；其他平台用 `--authoring-only`），首次 `vfx init` 还会下载官方 Effekseer Godot 插件（约 34 MB）。setup 需要 Python 3.11+ 或 uv；若 `doctor` 报告两者都没有，先让用户装一个。**Godot 4 从不由它代装**：让用户自己装（或获得允许后代装），若不在 PATH 上则设置 `GODOT`。

5. **在沙箱外跑 Godot**。`vfx review`、`preview`、`showcase` 会在用户桌面打开 Godot 窗口；沙箱内的 Agent（例如 Codex 工作区沙箱）打不开，需用户批准后在沙箱外运行，或把确切命令交给用户在桌面终端里跑。若一次评审没有渲染出任何帧，约 90 秒后会以 "rendered no frame" 停止（多半是窗口没打开，检查它附带的 Godot 输出）。

6. **确认可用并跑通第一步**。再跑一次 `vfx doctor`（`modes` 应显示本机支持的能力），然后在游戏项目里对 Agent 说：*"Set up the effekseer-vfx skill here and show me the fire example."* 它会执行：
   ```sh
   sh <skill>/scripts/vfx doctor            # what this machine can do, and what to install
   sh <skill>/scripts/setup.sh              # macOS ARM64 / Windows x64; use --authoring-only elsewhere (asks you first)
   sh <skill>/scripts/vfx init              # creates vfx/ with the Godot Lab, materials and math textures
   sh <skill>/scripts/vfx examples add fire
   sh <skill>/scripts/vfx build --ids VFX_Projectile_Fire VFX_Fire_Explosion
   sh <skill>/scripts/vfx review --ids VFX_Projectile_Fire VFX_Fire_Explosion --note "baseline"
   sh <skill>/scripts/vfx showcase          # play the library in the Lab
   ```
   工具链默认在 `~/.cache/effekseer-vfx`，可用 `EFFEKSEER_VFX_HOME` 改位置（见 `skills/effekseer-vfx/references/cli.md`）。

7. **下一条自然语言需求触发完整循环**。例如对 Agent 说：
   ```text
   Make a lightning strike for a targeted spell, short and sharp, with a return stroke.
   ```
   技能会让 Agent 写 brief、向你的图像生成工具索取手绘贴图（或直接找你要）、写 recipe、构建、多轮评审胶片条，并在报告 `effect-verify` 通过之前交给独立评审者。**关键约束**：在独立评审被提交且 `vfx overview` 被重跑之前，即使特效渲染正确，`effect-verify` 也会显示 `verified: false`；此时 Agent 应说 "builds and renders" 而不是 "verified"。

8. **贴图来源规则**。复杂手绘形状（烟、斩击弧线、火、裂纹、冰、符号）**必须**来自图像生成模型，技能不会用代码伪造；若你的 Agent 有内置或对接的图像工具，它会用，并把提示词记录在 `vfx/texture_prompts.json`；否则它会明确告诉你该生成哪张图、存到哪里。数学形状（辉光、圆环、噪声、渐变、拖尾、畸变图）则程序化生成。

9. **在游戏里使用产出**。特效最终是 `.efk` 运行时导出与 `.efkefc` 源文件，外加 `vfx_manifest.json`；生成的 Godot 项目带一个小 API：
   ```gdscript
   var handle = Vfx.play("VFX_Fire_Explosion", position)
   var shot = Vfx.launch("VFX_Projectile_Fire", from, to)
   shot.arrived.connect(func(at): Vfx.play("VFX_Fire_Explosion", at))
   ```
   详见 `skills/effekseer-vfx/references/godot.md`。

10. **（可选）自测技能本身**。README 给开发者的跑法：
    ```sh
    sh skills/effekseer-vfx/scripts/setup.sh --authoring-only
    ~/.cache/effekseer-vfx/venv/bin/python -m pip install pytest
    ~/.cache/effekseer-vfx/venv/bin/python -m pytest -q tests
    ```
    Windows PowerShell：
    ```powershell
    powershell -NoProfile -ExecutionPolicy Bypass -File skills\effekseer-vfx\scripts\setup.ps1 --authoring-only
    ~\.cache\effekseer-vfx\venv\Scripts\python.exe -m pip install pytest   # a venv made by uv: uv pip install --python <that python.exe> pytest
    ~\.cache\effekseer-vfx\venv\Scripts\python.exe -X utf8 -m pytest -q tests
    ```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**——原文展示了一批「没想到交给 AI」的工作被显式交给 Agent：写特效设计 brief、向图像模型索取贴图、写 Python recipe、调用官方 EffekseerCore 编译、在真实 Godot 视口里截帧、看片、只改一处、重复、最后交由另一个 Agent 做独立评审。这些不是「生成一段代码就交付」，而是把美术迭代过程整体交给 Agent。

**2. 任务匹配**——给出了明确的角色/工具切分：创作与评审由**两个不同 Agent**承担（作者不给自己打分）；静态 linter 负责便宜的前置检查，编译与渲染是昂贵步骤；手绘类贴图交给图像生成模型，数学类形状程序化生成；宿主上支持 Claude Code（plugin marketplace）、Codex（skill-installer）、以及 Cursor/Gemini CLI/Copilot/OpenCode（`npx skills add`）。

**3. 条件供给**——原文列出了需要提供的具体条件：Python 3.11+ 或 uv；macOS Apple silicon 或 Windows x64（build/render 的已验证平台）；Godot 4（Forward+）在 PATH 或 `GODOT` 环境变量；`ffmpeg`；首次 setup 联网下载约 250 MB 到 `~/.cache/effekseer-vfx`；首次 `vfx init` 再下载约 34 MB 插件；图像生成工具或人工供图；以及允许在沙箱外打开 Godot 窗口的权限。工具链位置可用 `EFFEKSEER_VFX_HOME` 改写。

**4. 主动推进**——有「状态驱动的持续循环」：循环写死为 build → filmstrip → look → fix one thing → repeat，直到评审通过；`effect-verify` 是一个门禁状态，在独立评审提交且 `vfx overview` 重跑之前一直为 `verified: false`。原文**没有**给出由时间或事件触发的自动化（cron、CI、监听文件变更等），触发点仍是对 Agent 的一次自然语言请求。

**5. 效果验证**——这是原文最实的部分：独立评审 Agent 按固定评分表、在**看不到 recipe** 的条件下对胶片条打分；评审基于真实视口的像素启发式；有迭代历史；有「防篡改证据」把一次评审绑定到它所看到的那个确切构建；`effect-verify` 提供通过/未通过状态；13 个示例中 2 个被判为 `iterate`。同时原文自己声明了验证的局限（见下节）。

## 与已有做法的关系

对照给定的清单条目：

- **Agent skills（concept，adopt）**：本仓库正是 Agent Skills 的一个具体实现与示范，且给出了「一个技能负责生成、另一个技能负责独立评审」的分工写法，可直接作为该条目的实例素材。
- **Claude Code（tool，adopt）**：README 把 Claude Code 列为首选安装路径之一，给出 `/plugin marketplace add` 与 `/plugin install` 两条可直接复制的命令，是清单中该工具的具体用法样例。
- **Cursor（watch）、OpenCode（watch）**：README 在「Other agents」中把它们列为通过 `npx skills add` 支持的宿主，但未给出这两者上的专门配置或差异说明。
- **GitHub Copilot（drop）**：README 在 Agent Skills 宿主列表中包含 GitHub Copilot，但同样只提及而未给具体步骤；此处与清单中该条目的状态不一致，仅作事实记录，不改变清单结论。

## 证据与局限

**原文给出的可核实信息**：仓库有 32 stars；13 个完成态特效示例（火焰/冰/毒/暗四组「投射物 + 命中」共 4 对，加 hit、slash、charge、shield、heal 各一，再加 3 个带诊断的 before/after）；构建与渲染在 macOS ARM64（Effekseer Core 1.80.7、EffekseerForGodot4 1.80.5.1、Godot 4.7、.NET 9）和 Windows 11 x64（同版本、Godot 4.7.2）上验证过；示例评分中有 2/13 被判 `iterate`；`tests/` 是纯 Python 测试（不需要 Core 或 Godot）。

**原文自述的局限（直接引用要点）**：评审指标是真实视口上的像素启发式，**不是** GPU 或 overdraw 测量；评审工具驱动的是有窗口的 Godot，macOS 与 Windows 可用，**Linux 无头截帧尚不支持**；Windows 上截帧时 Godot 窗口会一直占据焦点（macOS 会把焦点交还）；Windows 上符号链接安全测试需要开发者模式（或管理员 shell），否则跳过；示例分数是对技能自身 capsule-Lab 渲染的独立评审，**依赖前应重新构建并评审**；`soft` 粒子在 Forward+ Lab 中未验证且未被使用。此外 Windows ARM64 未验证，Linux 的 build 路径未验证。

**属于作者主张、无外部数据支撑的部分**：「防篡改证据」「经核实的引擎约定」、以及这套流程能像 VFX 美术那样迭代——原文没有给出第三方基准、对比实验或用户研究数据，也没有给出迭代轮数、耗时或成本数字。

**本次判断的局限**：材料来自仓库 README（`source_note` 明确为「依据仓库 README」），没有检查技能源码、评分表具体条目或 craft 规则的实际质量，因此本报告只能确认「有可照做的安装与运行流程」，无法评估其内部规则是否可靠。适用条件也窄：只在 Godot 4 + Effekseer 的实时特效场景下可直接使用。

## 怎么试、怎么验证

**最小试用方式**（建议在一个临时 Godot 4 演示项目里做，不要动生产项目）：

1. 在一台已验证平台上（macOS Apple silicon 或 Windows x64）按上文第 2 步安装两个技能，确认它们出现在技能列表里。
2. 跑 `sh <skill>/scripts/vfx doctor`，记录它报告的 `modes` 与 `next`；与 README 声称的平台能力对照。
3. 依次跑 `setup.sh`、`vfx init`、`vfx examples add fire`、`vfx build --ids VFX_Projectile_Fire VFX_Fire_Explosion`、`vfx review --ids ... --note "baseline"`、`vfx showcase`，确认能编译、能出帧、能在 Lab 中播放。
4. 再用一次自然语言请求触发完整循环，例如原文那句：`Make a lightning strike for a targeted spell, short and sharp, with a return stroke.`

**判断有没有改善的指标**：

- `doctor` 报告的 `modes` 与实际能否 build/render 是否一致（尤其 `render: true` 只代表找到了 Godot，不代表能渲染）。
- 评审是否真的产出帧：若约 90 秒后以 "rendered no frame" 结束，说明窗口没打开，这一步没通过。
- **流程完整性信号（最重要）**：在独立评审提交且 `vfx overview` 重跑之前，`effect-verify` 是否稳定保持 `verified: false`，Agent 是否只说 "builds and renders" 而不僭称 "verified"。这直接检验「作者不打自己的分」是否被真正执行。
- 通过评审所需的迭代轮数、每轮是否只改一处（原文的 `fix one thing` 原则），以及评审给出的 pass/iterate 结论与分数。
- 贴图是否真的来自图像生成模型并记录进 `vfx/texture_prompts.json`，而不是被代码伪造。
- 一次性成本：setup 约 250 MB 下载、首次 init 约 34 MB，可据此估算团队铺开成本。

**对照基线**：与团队现有的手工特效制作（或完全没有 AI 介入）对比迭代轮数、从需求到可用特效的耗时、以及非美术人员能否产出可用特效。注意原文已声明示例分数是技能自身 capsule-Lab 渲染的自评结果，所以**不要直接采信示例分数**，必须在自己项目里重新构建与评审后再下结论。

**可迁移部分**（如果团队不做 Godot/Effekseer）：值得照搬的是这套结构——生成器与评审器分离、评审者看不到配方、评审绑定到确切构建的证据、以及一个在独立评审前恒为 false 的验证门禁状态；把这些套到你自己的领域（文档、数据管道、UI 生成等）比直接采用这个特效技能更有价值。
