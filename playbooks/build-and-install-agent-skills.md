# 把重复纠正固化成技能：给编码 agent 装工作流并对照验证

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：你反复用同一套提示词纠正编码 agent，却不确定装技能包是否真的减少了返工。
> 先试这一步：先在一个非关键项目里，用 Claude Code 装一个现成技能包，只跑通一个最痛的任务，并做有/无技能的对照。
> 最近修订：2026-10-02

## 解决什么问题

你已经在用编码 agent，但每次都要重复描述同一套工程规范，或者不确定装一个技能包是否真的减少了返工。这篇手册给出一个可照做的流程：先小范围试装一个现成技能包，用同一任务做有/无技能的对照，确认有效后再考虑把自己的重复工作写成 `SKILL.md`。

## 适用与不适用

适用：

- 你已经在用 Claude Code、Codex CLI 或类似编码 agent；
- 有一类反复出现、有明确规范的任务（需求澄清、写计划、TDD、代码审查、完成前验证、文档生成等）；
- 愿意在一个非关键项目上做一周对照。

不适用：

- 没有明确重复任务，只想“装个工具看看”；
- 不愿做对照验证，只凭安装成功就认为改善；
- 直接在生产关键项目上全量安装。

## 前置条件

- Node.js ≥ 18，npm/npx 可用；Claude Code 2.1+ 或 Codex CLI 已安装。
- Git 可用。
- 一个可回滚的非关键项目，不要在主仓库或用户主目录（`~`）下做项目级安装。
- 对目标技能目录有写权限（如 `~/.claude/skills/`、`~/.cursor/skills/`）。
- 走 MCP 时，配置文件里写绝对路径。
- 安装第三方技能前，先通读它的 `SKILL.md`，并跑运行时的 doctor/audit 工具。

## 操作步骤

### 做法 A：先用现成技能包做小范围试装（推荐先做）

1. 选定一个非关键项目和一类重复任务。前提：你已经在用 Claude Code 或 Codex CLI；项目不是生产关键。预期：明确一个可对照的任务，例如“从 PDF 抽表单字段”或“给用户模块加批量导出功能”。

2. 只选一个技能包，只装一个，不要全装。以下三选一：

   - 官方示例技能（Claude Code）：

     ```text
     /plugin marketplace add anthropics/skills
     /plugin install example-skills@anthropic-agent-skills
     ```

   - 中文编码工作流（Claude Code）：

     ```text
     claude plugin marketplace add jnMetaCode/superpowers-zh
     claude plugin install superpowers-zh@superpowers-zh
     ```

   - 自我纠正记忆与知识平面（Claude Code）：

     ```text
     /plugin marketplace add rohitg00/pro-workflow
     /plugin install pro-workflow@pro-workflow
     ```

   预期：插件安装成功。注意同一项目里不要同时用项目级安装和插件市场安装同一个技能包，否则 skills 会出现两份。

3. 验证安装。前提：新开一个 Claude Code 会话。

   ```text
   /plugin list
   ```

   应看到对应插件为 enabled。如果用的是 genspark-claw，则先体检再看清单：

   ```bash
   npx genspark-claw doctor
   npx genspark-claw list
   ```

   预期：环境体检通过，能看到内置技能列表。

4. 跑通一个最小动作。不要一次试用全部功能，只选一个你当前最痛的任务。

   - 官方示例技能：`Use the PDF skill to extract the form fields from path/to/some-file.pdf`
   - superpowers-zh：让它先问清需求再写计划，例如“给用户模块加个批量导出功能”，观察它是否先问“导出格式是 CSV 还是 Excel？数据量多大？需要异步吗？有权限要求吗？”并给出 2-3 个方案。
   - pro-workflow：先跑 `/doctor` 和 `/wrap-up`，确认 SQLite 存储、hooks、skills 能加载。

   预期：技能被触发，或在需要时以斜杠命令出现。

5. 做对照。同一任务、同一输入，分别在没有技能和有技能的条件下各跑 3 次，记录差异。试一周，或至少 5 个同类任务。预期：你能说清技能是否减少了返工，而不是只说“装上了”。

### 做法 B：把自己的重复工作写成 SKILL.md（验证有效后再做）

1. 选一件你每周都在重复、且有明文规范的工作。例如“按公司模板出文档”“按团队规范写单测”“代码审查”。前提：你已经确认现成技能包对你有帮助，或者你有一个特别明确的返工点。

2. 建一个自包含文件夹，放 `SKILL.md`。照官方模板：

   ```markdown
   ---
   name: my-skill-name
   description: A clear description of what this skill does and when to use it
   ---

   # My Skill Name

   [Add your instructions here that Claude will follow when this skill is active]

   ## Examples
   - Example usage 1
   - Example usage 2

   ## Guidelines
   - Guideline 1
   - Guideline 2
   ```

   关键：`description` 必须同时写清“做什么”和“什么时候用”；正文写步骤、示例、准则。

3. 校验技能。可以用 genspark-claw 的校验器：

   ```bash
   npx genspark-claw validate ./my-skills/
   ```

   预期：通过 schema 校验和安全审计，标记 `curl | bash`、base64 载荷和破坏性命令。如果没有通过，先改 `SKILL.md`，不要继续安装。

4. 安装到目标 host。以 Claude Code 为例：

   ```bash
   npx genspark-claw install all --target claude
   ```

   或者直接放到 `~/.claude/skills/`。注意：如果已经用插件市场装了同一个技能，不要再手动拷贝。

5. 验证技能可复现。换一个新会话，或让一位不了解背景的同事只凭 `description` 触发该技能，看能否得到同类结果。预期：不需要重新粘贴同样的规范与上下文，就能得到稳定输出。

### 做法 C：多来源知识打包（可选，适合需要领域知识时）

如果你需要把文档站点、GitHub 仓库、本地代码库、PDF 等转成智能体可用的知识资产，可以用 Skill Seekers：

```bash
pip install skill-seekers
skill-seekers create https://docs.djangoproject.com/
skill-seekers package output/django --target claude
skill-seekers install-agent output/react/ --agent cursor
```

预期：生成 `SKILL.md` 和参考文件，可安装到 Claude Code、Cursor 等。注意：README 给出质量门禁 `skill-seekers quality output/react/ --threshold 7`，但它没有与人工基线的对照实验，多数效果数字是作者主张，需要你自己验证。

## 怎么判断变好了

最小试用方式：

- 同一任务、同一输入，有技能和无技能各跑 3 次；
- 至少覆盖 5 个同类任务，或持续一周；
- 换一个新会话，让不了解背景的人只凭 `description` 触发，检查可复现性。

可观察的指标：

- 人工修改次数/返工轮数：有技能时是否下降。
- 首稿可用率：第一次输出即达到可交付标准的比例。
- 背景重述次数：每次任务是否还需要重新粘贴同样的规范与上下文。
- 输出一致性：多次运行结果在格式与关键字段上是否稳定。
- 单次任务耗时：从提出到可交付的总时长。
- 规则类返工次数：代码评审里关于风格、规范、命名的意见条数是否下降。

反向指标：

- 如果加了技能后仍然每次都要口头纠正同一件事，说明 `description` 或正文指令没写到位，应先改 `SKILL.md`，而不是继续加提示。
- 如果一周内没有任何一项指标变化，或安装的插件与仓库实际规范冲突导致返工增加，就回到“只借鉴组织方式、不装具体内容”的用法。

注意：`doctor`、`validate`、`npm test` 这类检查只能证明“技能装得上、格式合法、不带危险命令”，不能证明“产出更好”。效果必须自己对照。

## 常见坑

- 整体 adopt：一次装多个技能包，导致上下文过载或规则冲突。AAS 提到 Antigravity 会因监控的 skill 目录过载上下文，需要选择性激活。
- 重复安装：在同一个项目里同时用项目级安装和 Claude Code 插件市场装同一个技能包，skills 会出现两份。
- 手拷 hooks：把仓库里的 `hooks/hooks.json` 直接拷进 `~/.claude/settings.json` 或 `~/.claude/hooks/hooks.json`，会导致重复执行和跨平台 hook 冲突；hooks 必须用安装器写。
- 在用户主目录安装：项目级安装应在具体项目目录执行；v1.2.1 起 superpowers-zh 会拒绝在主目录安装，老版本会把 skills 写进 home 目录，污染所有项目。
- 只信 README：很多技能包的 README 没有贴出 `SKILL.md` 正文，质量无法核验；只有安装命令和自述，没有效果数据。
- 忽略安全：安装任何第三方技能前先通读它的 `SKILL.md`，并跑自己运行时的 doctor/audit 工具。`genspark-claw validate` 会标记 `curl | bash`、base64 载荷和破坏性命令。
- 规则全量加载：rules 是始终加载的上下文，从 `rules/common` 加一个你实际使用的语言/框架包开始，不要全抄。
- 技能描述没写清：`description` 只写“做什么”没写“什么时候用”，技能就不会在合适时机触发。

## 证据与来源

- “技能 = 文件夹 + `SKILL.md`，frontmatter 只需 `name` 和 `description`”来自 anthropics/skills 的官方 README 与模板；该仓库是 Anthropic 对 Claude 技能的官方实现，安装命令和模板可直接照抄，但 README 明确说技能“仅供演示与教育用途”，效果需自测。
- “先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查”来自 jnMetaCode/superpowers-zh 的 README；它给出了 `npx superpowers-zh` 和 Claude Code 插件市场的可复制命令，但没有 skill 正文和效果数据，实际改善需自己对照。
- “自我纠正记忆、`SessionStart` 自动加载、知识平面”来自 rohitg00/pro-workflow 的 README；给出了 `/learn-rule`、`/wrap-up`、`/wiki init` 等命令，但全文没有效果数据，且技能/命令数量在文档内自相矛盾，所以只建议先跑通三个动作。
- “先小范围试装，不要整体 adopt”来自 genspark-claw、ECC、AAS、awesome-copilot 等材料的共同结论；其中 genspark-claw 的 `doctor`/`validate` 能验证装得上、格式合法，ECC 和 AAS 的组件规模极大但均为作者自述，AAS 的 `stack validate` 只检查 manifest，不证明语义适配或运行安全。
- “做对照、看返工轮数和首稿可用率”来自 anthropics/skills 的验证建议和 awesome-copilot 的最小试用方式；这些是方法主张，不是经过对照实验的数据。
- “第三方技能有供应链风险，先审查”来自 genspark-claw 和 awesome-copilot 的 README 警告；awesome-copilot 明确要求安装任何 agent 前先检查它和它的文档。
- “多来源知识打包”来自 yusufkaraaslan/Skill_Seekers 的 README；给出了 `pip install skill-seekers`、`create`、`package`、`install-agent` 等命令，质量门禁 `--threshold` 可用，但缺少与人工基线的对照，多数效率数字为作者主张。
- 文中提到的 star 数（如 anthropics/skills 179219、awesome-copilot 39,568、pro-workflow 2.9k）来自 metrics，不构成有效性证据。

## 依据的调研

- [breakstageaxe61/genspark-claw](../research/radar/2026-10-02/39-breakstageaxe61-genspark-claw.md)：值得一试，先小范围试它这套打包方式——SKILL.md 约定 + 一行安装 + MCP 暴露 + validate 安全校验，是把技能批量供给智能体的现成骨架，可直接照做；但五个内置技能的 SKILL.md 正文原文一条都没贴出来，其质量无法核验，因此不建议整体 adopt，只建议试装并用真实任务对比后再取舍。
- [affaan-m/ECC](../research/radar/2026-10-01/509-affaan-m-ecc.md)：值得一试，建议在单个非关键项目、单个 harness（优先 Claude Code）上按 README 的 guided setup 做小范围试装，只取 rules/common 加一个语言包和核心工作流，并保留一键回滚；理由是原文给出了可照抄的安装命令、settings.json 配置片段和安装校验命令，但组件规模极大、全部能力均为作者自述、没有任何效果数据，且 README 混有商业推广与供应链风险警告。
- [sickn33/agentic-awesome-skills](../research/radar/2026-10-01/553-sickn33-agentic-awesome-skills.md)：值得一试，可以把 AAS Core 当作「按任务找现成 SKILL.md 并受控安装」的试用入口：先按 README 给出的命令在单一 host（Codex 或 Claude）上配置本地 MCP，让 agent 选出少量 skill ID，validate + plan 预览后再 dry-run 安装；之所以只建议试，是因为 README 只给出安装/预览级步骤，apply 与 recovery 仍属实验性，且 2610+ 技能库本身没有质量与语义适配的证据。
- [anthropics/skills](../research/radar/2026-10-01/557-anthropics-skills.md)：建议采用，直接照官方 README 走：在 Claude Code 里加 marketplace 装 example-skills 摸清形态，再照 SKILL.md 模板把一件自己反复做的工作打包成技能，用返工轮数和首稿可用率验证。理由是这个仓库给出了可原样复制的安装命令和技能的最小结构（文件夹 + 带 name/description 的 SKILL.md），是把指令、脚本、资源打包供给智能体的官方一手参照。
- [github/awesome-copilot](../research/radar/2026-10-01/567-github-awesome-copilot.md)：值得一试，如果你在用 GitHub Copilot，可以按 README 给出的两条命令注册 marketplace 并安装现成插件，用社区打包好的 agent/instruction/skill 给助手补上下文和工具；但抓到的只有 README 索引，具体插件内容与效果无法核实，所以先小范围试一个插件并对照验证，不必整体照搬。
- [jnMetaCode/superpowers-zh](../research/radar/2026-10-01/581-jnmetacode-superpowers-zh.md)：值得一试，可按 README 给出的 `npx superpowers-zh`（或 Claude Code 插件市场）命令，在一个非关键项目里装 superpowers-zh 试用，它把编码智能体的工作流固定为“先澄清需求→写计划→TDD→系统化调试→完成前验证→代码审查”。理由是安装/卸载/路径配置具体可复制、覆盖 26 款工具；但原文只有 README、没有 skill 正文和效果数据，实际改善需自己对照验证。
- [yusufkaraaslan/Skill_Seekers](../research/radar/2026-10-01/585-yusufkaraaslan-skill-seekers.md)：值得一试，建议小范围试用：用 Skill Seekers 把一份项目文档或本地代码库自动转成 Claude Skill/IDE 上下文，先验证质量门禁和在真实任务中的效果，再决定是否纳入手册。理由：README 给出了完整的 CLI 步骤（安装、create、package、install-agent、MCP），但质量与效率数据多为作者自述，需自行验证。
- [rohitg00/pro-workflow](../research/radar/2026-10-01/596-rohitg00-pro-workflow.md)：值得一试，先在单个项目上装 Claude Code 原生插件，只跑通 /doctor、/learn-rule、/wrap-up 三个动作，确认纠正能被持久化并在新会话自动加载后再考虑启用 wiki 与自动研究循环；理由是 README 给出了可直接复制的安装与命令流程、可把重复纠正转成可检索的持久规则，但全文没有任何效果数据，且技能/命令数量在文档内自相矛盾，不足以直接采用。
