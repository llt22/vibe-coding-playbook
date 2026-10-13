# tpscloud/charmedimsure

- 结论：**值得一试**。可以在 Go 终端 UI 相关的编码代理工作中小范围试用：按 README 给出的 skills CLI 命令把 Charm 生态技能包装进 Claude Code/Codex，再对比装上前后代理写 Bubble Tea/Lip Gloss 代码的返工情况。之所以只给 try 而不是 adopt，是因为原文的安装和运行步骤确实可照做，但全部效果主张（技能质量高、能改善代理表现）都没有对照数据支撑，且适用范围局限在 Go + Charm 生态。
- 原文：https://github.com/tpscloud/charmedimsure
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T08:35:46.181Z

## 是什么

charmedimsure 是一个第三方（非 Charm 官方）技能包仓库，把 Charm 生态各库的用法整理成 AI 编码代理可加载的 skills，供 Claude Code、Codex 等代理使用。覆盖的库与主题共 9 个技能：

- `charmed-bubbletea`：程序循环、消息、命令、视图
- `charmed-bubbles`：列表、表格、输入、spinner 等组件
- `charmed-lipgloss`：样式、颜色、布局、表格、树
- `charmed-huh`：表单与提示
- `charmed-log`：结构化带样式日志
- `charmed-glamour`：终端渲染 Markdown
- `charmed-gum`（CLI）：交互式 shell 脚本
- `charmed-vhs`（CLI）：录制终端演示
- `charmed-ecosystem`：选库、组合使用、迁移到 v2

所有 Go 示例放在仓库根的 `examples/`（含 `examples/go.mod`），在 CI 中按固定的模块版本编译并测试，作者称这样代码片段不会漂移。Go 库使用 v2 的 `charm.land` 导入路径。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **用 skills CLI 安装（作者推荐的路径）。** 前提：本机有 Node/npx，目标代理是 Claude Code、Codex 或其他被 skills CLI 支持的代理。

```sh
npx skills add tpscloud/charmedimsure
```

   该命令会询问安装哪些技能、装给哪些代理；一份共享副本可同时装进 Claude Code、Codex 等多个代理，可装在项目内（随代码提交）或装到用户级。后续用 `npx skills update` 拉新版本。

2. **非交互地指定技能和代理（可选）。** 前提同上。

```sh
npx skills add tpscloud/charmedimsure --skill charmed-bubbletea
npx skills add tpscloud/charmedimsure -a claude-code
npx skills add tpscloud/charmedimsure -a codex -g
npx skills add tpscloud/charmedimsure --list
```

   `--skill` 可重复指定；`-a claude-code` / `-a codex` 指定代理；`-g` 表示装给当前用户而不是当前项目；`--list` 只列出技能、不安装。

3. **从本地 checkout 临时加载（作为 Claude Code 插件，仅一个会话）。** 前提：已 clone 该仓库，把下面路径换成仓库绝对路径。技能名形如 `/charmedimsure:charmed-gum`。

```sh
claude --plugin-dir /path/to/charmedimsure
```

4. **把技能持久安装为个人技能（符号链接方式）。** 前提：已 clone 仓库，且 checkout 需要保留在原位（符号链接跟随 checkout）。装完要开新会话。

```sh
# Claude Code
mkdir -p "$HOME/.claude/skills"
ln -s /path/to/charmedimsure/skills/charmed-* "$HOME/.claude/skills/"

# Codex
mkdir -p "$HOME/.agents/skills"
ln -s /path/to/charmedimsure/skills/charmed-* "$HOME/.agents/skills/"
```

5. **跑示例验证可用性。** 前提：本机有 Go 环境，且已 clone 仓库。在 `examples/` 目录下运行，例如：

```sh
go run ./charmed-bubbletea/counter
```

   安装后的技能会在 GitHub 上链接到这些示例；要真正跑起来必须 clone 仓库。

6. **（可选）自己改技能时做校验。** 编辑规则见仓库 `AGENTS.md`；CI 使用 Skillforge，提交前运行：

```sh
skillforge validate .
skillforge check .
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：把“让 AI 写 Go 终端 UI”这类原先需要人翻 Charm 文档才敢交出去的工作，变成有技能包支撑的常规任务；技能覆盖组件（列表/表格/输入/spinner）、程序循环、样式布局、表单、日志、终端录屏。
- **任务匹配**：面向编码代理（Claude Code、Codex 等），按库粒度拆分技能（一个库一份 `SKILL.md`），另设 `charmed-ecosystem` 负责选库、组合与 v2 迁移，属于“知识按领域切块供给”的匹配方式。
- **条件供给**：供给形式是 `SKILL.md` + `examples/`；分发方式是 skills CLI 的一条命令；安装范围可按项目级或用户级（`-g`）；可选的临时加载方式是 `--plugin-dir` 或符号链接。原文未讨论需要授予什么额外权限或如何收集反馈。
- **主动推进**：原文只提到 `npx skills update` 可以拉取新版本，没有描述由时间、事件或状态触发并持续完成的工作流。
- **效果验证**：仓库层面的验证有——`examples/` 在 CI 中按 pinned 模块版本构建与测试（防片段漂移）、skill-quality workflow、以及挂在 skills.sh 上的 Gen Agent Trust Hub / Socket / Snyk 审计与 Tessl 质量评审徽章（各技能 Tessl 100/100）。这些都是“技能包自身质量”的证据，不是“装上去之后工作变好”的证据。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Claude Code（adopt）**：本仓库是直接为 Claude Code 提供技能的，安装路径包括 `-a claude-code`、`claude --plugin-dir /path/to/charmedimsure`、以及 `~/.claude/skills` 符号링크。
- **skills.sh（try）**：安装走 skills.sh 的 skills CLI（`npx skills add`），各技能的独立审计报告也托管在 skills.sh；原文把这条路径标为“recommended route”。
- 清单中其余条目未被原文提及。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

原文实际给出的、可核查的信息：

- 完整安装命令与全部选项（`--skill`、`-a`、`-g`、`--list`、`npx skills update`）。
- 两种本地加载方式的路径（Claude Code `~/.claude/skills`、Codex `~/.agents/skills`）。
- 示例位置与运行方式（`examples/`、`go run ./charmed-bubbletea/counter`）。
- CI 行为：示例按 pinned 模块版本构建与测试。
- 徽章数值：各技能 Tessl 100/100、三项审计 pass；原文注明徽章记录的是 2026-10-12 的结果，且自行声明徽章由项目维护、不构成服务商背书。
- 项目状态：38 stars、MIT、与 Charm 官方无关联。

只是作者主张、没有数据支撑的部分：

- “技能质量高”“因为经过 CI 所以片段不会漂移”——后者有 CI 机制描述，但没有给出实际失败率或不漂移的验证数据。
- 没有任何“装上技能前后代理表现”的对照数据：没有任务成功率、首次可编译率、返工轮次、token 或时间节省的任何数字。徽章衡量的是技能包本身，不是使用效果。

适用条件与局限：

- 只对 Go + Charm 生态的终端 UI 开发有用，换到别的语言或框架完全不可迁移（可迁移的只是“把领域库用法做成 skills 分发”这个模式）。
- skills CLI 安装需要 Node/npx；符号链接方式要求 checkout 常驻，删掉仓库链接即失效。
- 第三方项目，非 Charm 官方；`charm.land` v2 导入路径意味着它绑定在 v2 API 上，v1 项目直接用会不匹配。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天内可完成）**

1. 选一个已有的小型 Go TUI 任务作为对照组，例如“给某个 CLI 加一个可滚动列表 + spinner”或“用 huh 做一个交互式表单”。先让代理在未安装技能的情况下完成，记录过程数据。
2. 安装技能（项目级，便于随代码一起提交和回滚）：

```sh
npx skills add tpscloud/charmedimsure --skill charmed-bubbletea --skill charmed-bubbles --skill charmed-huh -a claude-code
```

3. 开新会话，做同类但不同的任务，记录同样数据。
4. 前置检查：clone 仓库后 `go run ./charmed-bubbletea/counter` 跑通示例，确认技能里引用的代码在本机可编译，避免把“环境问题”误判成“技能没用”。

**判断有没有改善的指标（仓库未提供任何指标，需自行采集）**

- 首次编译/测试通过率；
- API 用错次数（典型：仍用 v1 导入路径、引用不存在的组件或方法）；
- 达到可运行状态所需的人机往返轮次；
- 人工纠正次数与纠正内容类型（导入路径、组件选择、布局/样式写法）；
- 是否主动用对了 `charmed-ecosystem` 的选型建议（例如该用 bubbles 组件还是自己写）。

**止损条件**：如果同类任务在装上技能后首次通过率和返工轮次没有改善，或代理频繁引用与本地版本不一致的 API，就说明这个技能包对当前项目价值有限——此时值得保留的是“用 skills CLI 给代理补领域知识 + 用 CI 固定示例版本”这个模式，而不是这个具体技能包。
