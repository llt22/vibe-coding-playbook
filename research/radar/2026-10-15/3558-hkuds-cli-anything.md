# HKUDS/CLI-Anything

- 结论：**值得一试**。建议小范围试用：先用 `cli-hub` 装一个现成 harness 接进 agent 跑一条真实重复任务，确认真有用后再考虑用 `/cli-anything` 为内部工具生成新 CLI——它把“给 AI 提供工具入口”变成了可复制的命令与流程，但所有效果数据均为项目自述、无第三方复现，且大量 harness 依赖上游桌面软件。
- 原文：https://github.com/HKUDS/CLI-Anything
- 来源：github-trending，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-15T03:06:01.517Z

## 是什么

CLI-Anything（HKUDS）做的事情是：把软件（桌面软件、代码库、内部工具）包装成“agent-native CLI”，让 AI agent 能像人一样用命令行驱动这些软件。它提供两条路径：

- **消费者路径**：CLI-Hub 注册表 + 包管理器（`pip install cli-anything-hub`），浏览、搜索、安装社区已做好的 CLI harness，也可通过 `npx skills add ... -g -y` 把 meta-skill 装进支持 SKILL 的 agent，让 agent 自己去找并安装合适的 CLI。
- **生产者路径**：给 AI 编码 agent（Claude Code、Cursor、Pi、OpenClaw、OpenCode、Codex 等）装插件/skill，然后用一条命令 `/cli-anything <路径或仓库>` 触发 7 阶段流水线，自动分析源码、设计命令组、生成带 REPL/JSON 输出/undo-redo 的 Click CLI、写测试、写文档、打包发布。

7 阶段（README 原文）：分析（扫源码、把 GUI 动作映射到 API）→ 设计（命令组、状态模型、输出格式）→ 实现（Click CLI + REPL + JSON + undo/redo）→ 制定测试计划（TEST.md，unit + E2E）→ 写测试 → 文档 → 发布（生成 `setup.py`、装到 PATH）。

## 具体做法（编号步骤）

### A. 直接用现成 CLI（5 分钟路径）

前提：Python 3.10+；若所选 harness 包装的是真实软件（GIMP / Blender / LibreOffice 等），需先自行安装该上游软件。

1. 安装 CLI-Hub 包管理器：
   ```bash
   pip install cli-anything-hub
   ```
2. 浏览与搜索注册表：
   ```bash
   cli-hub list
   cli-hub search image
   ```
3. 查看某个 CLI 的详情：
   ```bash
   cli-hub info gimp
   ```
4. 安装：
   ```bash
   cli-hub install gimp
   ```
5. 启动试用：
   ```bash
   cli-hub launch gimp
   ```
6. 需要时更新/卸载：`cli-hub update <name>`、`cli-hub uninstall <name>`。

CLI-Hub 命令速查（README 原表）：`list` 浏览、`search <query>` 关键词搜索、`info <name>` 查看单个、`install <name>` 安装、`update <name>` 更新、`uninstall <name>` 卸载、`launch <name> [args...]` 运行。

### B. 让 agent 自己发现并安装 CLI

前提：使用支持 SKILL 的 agent（OpenClaw、Nanobot、Claude Code、Codex、Reasonix、Antigravity 等）。

1. 安装 meta-skill：
   ```bash
   npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
   ```
2. 用这句提示词把“选工具”交给 agent：
   ```text
   Find appropriate CLI software in CLI-Hub and complete the task: ...
   ```

### C. 用 Claude Code 生成一个新 CLI

前提：Python 3.10+；目标软件或源码在本机或可在线获取；已装 Claude Code。Windows 需先装 Git for Windows（含 `bash`/`cygpath`）或使用 WSL，否则会报 `cygpath: command not found`。

1. 添加 marketplace：
   ```bash
   /plugin marketplace add HKUDS/CLI-Anything
   ```
2. 安装插件：
   ```bash
   /plugin install cli-anything
   ```
3. 一条命令生成完整 CLI（跑完 7 阶段）：
   ```bash
   /cli-anything ./gimp
   ```
4. 迭代补全能力（可多次运行，增量且非破坏性）：
   ```bash
   /cli-anything:refine ./gimp
   /cli-anything:refine ./gimp "I want more CLIs on image batch processing and filters"
   ```
5. 排错顺序（README 明确给出）：先 `/reload-plugins`；再 `/help cli-anything` 确认插件已加载；必要时重装 marketplace 与插件；确认加载后再试入口命令。旧版本若不识别 `/cli-anything`，改用 `/cli-anything:cli-anything`；辅助命令保持 `:subcommand` 形式（如 `/cli-anything:refine`）。

### D. Cursor（生成器 + 消费者两条线）

前提：已装 Cursor，并已 clone 仓库。

1. 装生成器插件：
   ```bash
   git clone https://github.com/HKUDS/CLI-Anything.git
   bash CLI-Anything/cursor-plugin/scripts/install.sh
   ```
   Windows PowerShell：
   ```powershell
   .\CLI-Anything\cursor-plugin\scripts\install.ps1
   ```
   默认装到 `~/.cursor/plugins/local/cli-anything`（可用 `CURSOR_PLUGINS_HOME` 覆盖，指向名为 `plugins` 的目录）；升级用 `--force` / `-Force`。
2. 在 Cursor 里执行 **Developer: Reload Window**，然后：
   ```text
   /cli-anything ./gimp
   /cli-anything-refine ./shotcut "picture-in-picture workflows"
   /cli-anything-test ./libreoffice
   /cli-anything-validate ./libreoffice
   /cli-anything-list
   ```
3. 消费者侧（与生成器插件独立）：
   ```bash
   npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
   pip install cli-anything-hub
   ```

### E. 其他宿主的最小安装动作

- **Pi Coding Agent**：clone 后 `bash .pi-extension/cli-anything/install.sh`（卸载加 `--uninstall`），装到 `~/.pi/agent/extensions/cli-anything/`，`/reload` 或重启生效；命令有 `/cli-anything`、`/cli-anything:refine`、`/cli-anything:test`、`/cli-anything:validate`、`/cli-anything:list`。
- **OpenCode**：`cp CLI-Anything/opencode-commands/*.md ~/.config/opencode/commands/`，并把 `HARNESS.md` 复制到同目录（命令会引用它，必须在同一目录）；旧版目录名为 `command/`。
- **OpenClaw**：`mkdir -p ~/.openclaw/skills/cli-anything` 后把 `openclaw-skill/SKILL.md` 复制进去，会话里用 `@cli-anything build a CLI for ./gimp`。
- **Codex**：`bash CLI-Anything/codex-skill/scripts/install.sh`（Windows 用 `install.ps1`），装到 `$CODEX_HOME/skills/cli-anything`（未设置时 `~/.codex/skills/cli-anything`），安装器会把 `HARNESS.md`、命令规范、按需加载的指南与脚本一并放入 `references/`、`scripts/`。
- **Qodercli**：`bash CLI-Anything/qoder-plugin/setup-qodercli.sh` 注册到 `~/.qoder.json`，新开会话后用 `/cli-anything ./gimp`。

## 对应的研究问题

**1. 能力发现**：把此前只能人工点 GUI 的软件（GIMP、Blender、LibreOffice、QGIS、FreeCAD、Zotero、Obsidian、Zoom、n8n、Godot、RenderDoc、Calibre、Joplin、MuseScore、Krita、Slay the Spire II 等）变成 agent 可调用的命令，等于给“还没想到交给 AI 的工作”批量开出口。README 的 demos 声称能产出 CAD 模型、3D 场景、图表、游戏内容、字幕等真实产物。

**2. 任务匹配**：README 对“什么场景该用 CLI”给了明确主张：CLI 是人和 agent 的通用接口——结构化可组合（文本命令匹配 LLM 格式、可链式串联复杂流程）、轻量通用、自描述（`--help` 即自动文档，agent 可自行发现）、有成功先例（Claude Code 每天跑成千上万条真实工作流）、agent-first（结构化 JSON 输出去掉解析复杂度）、确定可靠（一致结果带来可预测行为）。匹配的是“要反复调用外部软件、需要可复现操作”的任务。

**3. 条件供给（本条目最大价值点）**：它直接回答“需要给 AI 什么”。要提供的是：(a) 可执行的操作入口（CLI harness）；(b) 自描述信息——`--help` 与每个 CLI 随附的 `SKILL.md`（Phase 6.5 起为生成物标配）；(c) 结构化 JSON 输出而非人类可读文本；(d) 一个注册表 + meta-skill，让 agent 自己搜索、安装、启动工具（`cli-hub search/install/launch` + `Find appropriate CLI software in CLI-Hub and complete the task`）；(e) 前置条件要显式声明（Python 3.10+、上游软件本机已装、Windows 需 bash/cygpath）。

**4. 主动推进**：有部分依据。CLI-Hub meta-skill 让 agent 自主发现并安装工具；README 提到生成物配合 preview、live preview 与 trajectory loops 产出真实 artifact；news 中 Unreal Insights 加入 `capture start/status/snapshot/stop` 后台捕获会话控制，属于状态/事件驱动的编排。但“由时间/事件触发持续完成”的完整机制，原文没有系统给出。

**5. 效果验证**：可借鉴的是流程内建验证——生成流水线包含 TEST.md（unit + E2E 测试计划）、写测试、用测试结果回填文档，并有 `/cli-anything:test`、`/cli-anything:validate` 两个校验入口；README 自报 2,461 个测试通过、pytest 100%、多语言/多 harness 的覆盖率。这是“工具先自带可执行验收”的思路，但对比性指标（用了 CLI 之后任务成功率/耗时变化）原文没有。

## 与已有做法的关系

- 清单中已有 **HKUDS/CLI-Anything**，状态 `watch`——本条目就是它本身，按本报告可从 `watch` 上调为 `try`（试用路径具体、成本低）。
- **Claude Code**（`adopt`）是它的一等公民宿主，README 的 Claude Code 路径最完整（marketplace + plugin + `/cli-anything`）。
- **Cursor**、**OpenClaw**、**OpenCode**、**goose**、**Hermes**（均 `watch`）都是它支持的宿主/同类接入点；其中 goose 走 CLI provider（如 Claude Code）复用对方命令格式。
- **GitHub Copilot**（`drop`）：本条目未给出 Copilot 的具体安装路径，只列在“More Platforms”一类，不足以改变其状态。
- **SkillHub**（`study`）：与 `npx skills add ... --skill <name> -g -y` 的 skill 分发方式相关，README 提到 meta-skill 也上架 ClawHub/SkillHub/SkillHub.cn。
- **GitHub Trending**（`try`）、**Trendshift**（`watch`）：本条线索的来源标注。
- **arXiv**（`try`）：对应其自称的技术报告（README 徽章指向 arXiv:2606.03854，无法核验）。
- **Obsidian**（`drop`）：CLI-Anything 有独立 Obsidian harness（走 Local REST API，48 unit + 7 E2E），若重新评估 Obsidian 接入方式，可参考该条目。

## 证据与局限

**原文给出的可核查材料**：可复制的安装命令（`pip install cli-anything-hub`、`npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y`）、CLI-Hub 完整命令表、7 阶段定义、各宿主插件/技能的确切安装路径与命令、`.pi-extension`、`cursor-plugin`、`codex-skill`、`qoder-plugin`、`openclaw-skill` 的具体脚本名；news 中给了 PR 号与自报测试数据（FreeCAD 258 命令/17 组、Obsidian 48 unit + 7 E2E、Openscreen 101 tests、Joplin 134-test baseline、Calibre 41 unit、仓库徽章 2,461 tests passing）；安全类改动有具体描述（Sketch token 文件防路径穿越与符号链接逃逸、XML/SVG/ODF/MLT/MusicXML/CSL 用 `defusedxml` 处理不可信输入、Rekordbox 强制写入前必须备份、Zoom token 权限收紧）。

**只是主张、没有验证的部分**：“让所有软件 agent 原生”“一条命令行让任何软件可被 agent 使用”“CLI-Anything 弥合 AI agent 与世界软件之间的鸿沟”；“Claude Code 每天跑成千上万真实工作流”是类比论据而非本项目数据；52,559 stars / 今日 103 的指标未经独立核实。

**明显的可靠性风险**：README 的 news 条目日期标注为 2026 年，徽章指向的 arXiv 编号（2606.03854）无法核验，整体呈现强烈的自宣传与快速堆叠特征，存在夸大或元数据不实的可能。

**适用条件与风险面**：(a) 需要 Python 3.10+ 与至少一个受支持的 AI 编码 agent；(b) 多数 harness 只是包装，仍需本机安装真实的上游软件（GIMP/Blender/LibreOffice 等），无 GUI 或无授权的环境不可用；(c) 从 CLI-Hub 安装社区 CLI 属于引入第三方供应链风险，README 自己的安全加固记录正说明存在 token 泄露、路径穿越、注入等攻击面；(d) 生成质量取决于宿主 agent 的能力，README 未给跨 agent 的质量对比；(e) HARNESS 方法论以渐进披露方式拆到 `guides/`，说明规范本身仍在演化（v0.2.0 刚重构）。

## 怎么试、怎么验证

**最小试用（建议半天内完成）**：选一个你本来每周都要重复做、且必须驱动外部软件的任务（例如批量图片处理、文档格式转换、把会议录音转写后归档）。

1. `pip install cli-anything-hub`，`cli-hub search <你的场景关键词>`，找到对应 harness（找不到就跳到第 5 步用 `/cli-anything` 生成）。
2. `cli-hub info <name>` 看清依赖，先把上游软件装好；`cli-hub install <name>`。
3. `cli-hub launch <name>` 手动跑一条真实命令，确认输出是结构化 JSON、`--help` 能自解释——这两点不成立，agent 协作价值就不成立，可直接终止试用。
4. 把该 CLI 作为工具交给你的 agent，用 `Find appropriate CLI software in CLI-Hub and complete the task: <你的任务>` 跑一次端到端。
5. 若注册表没有，改用 `/cli-anything <你的内部工具路径>` 生成，再 `/cli-anything:refine` 补你要的具体能力。

**判断有没有改善的指标**：

- 任务完成率：agent 端到端做完的比例（对照“必须你手动点 GUI 才能完成”的现状）。
- 人工介入次数：整个流程里你手动操作 GUI 或复制粘贴的次数，目标是接近 0。
- 耗时：同一任务，人工 GUI 做 N 次 vs agent + CLI 做 N 次，比较单次均值。
- 可复现性：同一条命令重跑是否得到一致结果（这是 README 声称 CLI 相对 GUI 的核心优势，也是最好验证的一条）。
- 自恢复能力：故意制造一次失败，看报错是否结构化、agent 能否读懂并自行纠正。
- 工具自带验收是否通过：`/cli-anything:test`、`/cli-anything:validate` 的结果；生成的 TEST.md 中 unit/E2E 用例数是否与覆盖的实际命令量相称。

**止损条件**：若第 3 步的 JSON 输出与 `--help` 自描述不达标，或安装一个 harness 就出现上游软件装不上/权限报错/需要你手工处理安全例外，则说明该路径在你们的运维条件下成本过高，退回人工或改用更成熟的单一工具集成。
