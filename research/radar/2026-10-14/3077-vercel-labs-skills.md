# vercel-labs/skills

- 结论：**值得一试**。建议在一个真实代码仓库里小范围试：用 `npx skills add` 把 1–2 个技能按项目作用域安装到你实际使用的 agent（默认落到 `./.claude/skills/` 等目录），随仓库提交给团队共用。理由是 README 给出了完整可复制的命令、作用域/路径表、SKILL.md 模板与环境变量，能立刻照做；但文中没有任何效果数据，技能是否真的改善结果必须自己对照验证。
- 原文：https://github.com/vercel-labs/skills
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-14T02:12:45.322Z

## 是什么

`vercel-labs/skills` 是 Vercel Labs 出的一个 CLI（npm 包名 `skills`，MIT 许可），定位是「开放 agent skills 生态的安装/分发工具」。它把以 `SKILL.md` 为载体的可复用指令集，安装到各类编码代理的技能目录里。README 称支持 OpenCode、Claude Code、Codex、Cursor 以及另外 75 个 agent。

除了安装，它还提供不落地使用（`skills use`）、搜索（`skills find`）、列举/更新/卸载（`list`/`update`/`remove`）、新建模板（`init`）等命令，并指向技能目录站 skills.sh。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：本机有 Node.js 与 `npx`；若要安装到某个 agent，该 agent 需已安装（CLI 会自动探测，探测不到会让你选择）。

1. **先看仓库里有哪些技能，别急着装。**

```bash
npx skills add vercel-labs/agent-skills --list
```

2. **按项目作用域安装指定技能到指定 agent。** 默认作用域是项目（`./<agent>/skills/`），会随项目提交、可与团队共享。

```bash
# 安装特定技能
npx skills add vercel-labs/agent-skills --skill frontend-design --skill skill-creator

# 安装到特定 agent
npx skills add vercel-labs/agent-skills -a claude-code -a opencode

# 技能名含空格必须加引号
npx skills add owner/repo --skill "Convex Best Practices"
```

3. **CI/CD 或脚本里用非交互安装。**

```bash
npx skills add vercel-labs/agent-skills --skill frontend-design -g -a claude-code -y
```

4. **只想试一次、不想常驻安装，用 `skills use`。** 它把选中的技能文件写到临时目录，只把生成的提示词打到 stdout（除非给 `--agent`）。

```bash
npx skills use vercel-labs/agent-skills@web-design-guidelines | claude
npx skills use vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code
```

5. **从各种来源安装（同一套命令，来源格式不同）。**

```bash
# GitHub 简写（owner/repo）
npx skills add vercel-labs/agent-skills

# 完整 GitHub URL
npx skills add https://github.com/vercel-labs/agent-skills

# 仓库内某个技能的直接路径
npx skills add https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines

# GitLab URL
npx skills add https://gitlab.com/org/repo

# Azure Repos
npx skills add https://dev.azure.com/org/project/_git/repo
npx skills add https://dev.azure.com/org/project/_git/repo?path=/skills/web-design&version=GBmain

# 任意 git URL
npx skills add git@github.com:vercel-labs/agent-skills.git

# 本地路径
npx skills add ./my-local-skills

# 直接下载 URL（单个 SKILL.md 或 .zip/.tar/.tar.gz/.tgz 归档）
npx skills add https://example.com/download/my-skill
```

6. **私有仓库用同样的命令**，CLI 复用仓库 URL 上已配置好的认证。GitHub HTTPS 与简写来源会先试普通 Git 凭据，失败且 GitHub CLI 已登录时改试 `gh repo clone`，再退到 SSH；它不会执行 `gh auth token`，也不会把 GitHub CLI 存下的凭据复制进 Node 进程。

```bash
npx skills add acme/private-skills
npx skills add git@github.com:acme/private-skills.git
npx skills add ssh://git@git.example.com/acme/private-skills.git
npx skills add https://git.example.com/acme/private-skills.git
npx skills add https://dev.azure.com/org/project/_git/private-skills
```

也可显式设置 `GITHUB_TOKEN` 或 `GH_TOKEN` 供 GitHub API 使用（私有仓库下载与更新检查），已配好 Git / gh / SSH 时它们是可选的。

7. **安装时选作用域与方法。** 作用域：默认项目级 `./<agent>/skills/`（提交进项目、团队共享）；`-g` 全局 `~/<agent>/skills/`（跨项目可用）。安装方法：**Symlink（推荐）** 从各 agent 指向一份规范副本，单一来源、便于更新；**Copy**（`--copy`）为每个 agent 生成独立副本，用于不支持软链的情况。Claude Code 对应路径是 `.claude/skills/`（项目）与 `~/.claude/skills/`（全局），Cline/Codex/Cursor/OpenCode/Gemini CLI 等一批 agent 用通用路径 `.agents/skills/`。

8. **自己写一个技能。**

```bash
# 在当前目录创建 SKILL.md
npx skills init

# 在子目录新建技能
npx skills init my-skill
```

生成的 `SKILL.md` 形如：

```markdown
---
name: my-skill
description: What this skill does and when to use it
---

# My Skill

Instructions for the agent to follow when this skill is activated.

## When to Use

Describe the scenarios where this skill should be used.

## Steps

1. First, do this
2. Then, do that
```

必填字段是 `name`（小写、可含连字符）与 `description`。想隐藏未完成/仅内部使用的技能，加：

```markdown
---
name: my-internal-skill
description: An internal skill not shown by default
metadata:
  internal: true
---
```

然后 `INSTALL_INTERNAL_SKILLS=1` 时才会被看到和安装：

```bash
INSTALL_INTERNAL_SKILLS=1 npx skills add vercel-labs/agent-skills --list
```

9. **技能放哪儿能被发现。** CLI 在仓库的约定位置搜索 `SKILL.md`，每个技能容器目录向下最多走三层（支持 `skills/<name>/SKILL.md` 及带一、两级分类的目录）；更浅层发现的 `SKILL.md` 会遮蔽更深的同名项；`--full-depth` 可额外发现容器目录之外（如 `examples/`、`tests/`）的 `SKILL.md`。标准位置没找到时会做递归搜索。若仓库有 `.claude-plugin/marketplace.json` 或 `.claude-plugin/plugin.json`，其中声明的技能路径也会被发现。

10. **日常维护与隐私开关。**

```bash
npx skills list            # 项目已安装技能，类似 npm ls
npx skills ls -g           # 只看全局
npx skills ls -a claude-code -a cursor   # 按 agent 过滤

npx skills find            # 交互式搜索（fzf 风格）
npx skills find typescript
npx skills find react --owner vercel

npx skills update          # 更新全部（交互式选择作用域）
npx skills update -y       # 非交互，自动判断作用域

npx skills remove
npx skills remove web-design-guidelines
npx skills remove --all
```

```bash
# 关闭匿名遥测
DISABLE_TELEMETRY=1
DO_NOT_TRACK=1
```

若来源可信、需要放宽下载限制，可覆盖默认额度（下载 10 MiB、解压后 25 MiB、归档 1000 个文件）：`SKILLS_DOWNLOAD_MAX_BYTES`、`SKILLS_EXTRACT_MAX_BYTES`、`SKILLS_EXTRACT_MAX_FILES`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：`npx skills find`（可交互、可按关键词、可按 `--owner` 限定组织）与 skills.sh 目录，是「有哪些技能可交给代理做」的现成入口；README 举的技能例子包括「从 git 历史生成发布说明」「按团队约定创建 PR」「与外部工具（Linear、Notion 等）集成」。`--list` 可在安装前先看仓库里有什么。
- **任务匹配**：通过 `-a/--agent` 把技能装到具体 agent，路径表区分了各 agent 的项目/全局目录；兼容性表说明同一技能在不同 agent 上能力不同——`allowed-tools` 多数支持但 Kiro CLI、Zencoder 为 No；`context: fork` 仅 Claude Code 支持；Hooks 仅 Claude Code、Cline、Kiro CLI 支持。`skills use ... | claude` 则适合「只给这一次任务加技能、不常驻」的轻量场景。
- **条件供给**：技能本身就是「可复用的指令集」这一供给形态，`SKILL.md` 的 `name`/`description`（YAML frontmatter）是代理发现并判断何时启用的元数据，正文的 `## When to Use` 与 `## Steps` 是给代理的执行说明。仓库侧的前提包括：技能以约定目录被搜索（最多三层，浅层遮蔽深层）、私有仓库需可用认证（Git 凭据 / gh / SSH，或显式 `GITHUB_TOKEN`、`GH_TOKEN`）、目标目录需有写权限。
- **主动推进**：README 未给出任何时间、事件或状态触发的机制；相关命令（`update`、`remove`）都是手动执行的。这一项无依据。
- **效果验证**：README 未给任何基准、指标或前后对比数据。唯一涉及的「度量」是匿名使用遥测（GitHub 仓库与技能标识仅在确认为公开仓库时发送；可用 `DISABLE_TELEMETRY=1`/`DO_NOT_TRACK=1` 关闭），属于工具使用统计，不是效果验证。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- **Agent skills（concept，adopt）**：本工具是该规范落地的分发 CLI。README 明确技能遵循共享的 Agent Skills specification（agentskills.io），`SKILL.md` 是统一载体。
- **skills.sh（source，try）**：README 的「Discover skills at skills.sh」正是这个条目，且 README 的 badge 指向 `skills.sh/vercel-labs/skills`，两者同属一个生态；本仓库是工具侧，skills.sh 是目录侧。
- **Claude Code（tool，adopt）**：在支持列表中，项目路径 `.claude/skills/`、全局 `~/.claude/skills/`；也是唯一支持 `context: fork` 的 agent，并支持 Hooks。README 的示例大量使用 `claude-code`。
- 其余在支持列表中的清单条目：Cline（watch，支持 Hooks）、Cursor（watch）、ForgeCode（watch，`.forge/skills/`）、Goose（watch，`.goose/skills/`）、Hermes（watch，`.hermes/skills/`）、OpenClaw（watch，项目路径为 `skills/`）、OpenCode（watch，全局 `~/.config/opencode/skills/`），以及 **ZCode（avoid，`.zcode/skills/`）**——清单已将其标为 avoid，若采用本工具需在 `-a` 选择上避开它。**GitHub Copilot（drop）** 也在支持列表中（`.agents/skills/`、`~/.copilot/skills/`）。
- README 提到 Claude Code 插件市场（`.claude-plugin/marketplace.json`）声明技能的兼容发现，与 Claude Code 相关做法可衔接。
- MCP 相关条目：README 未提及 MCP 服务，清单中 MCPJam 仅作为受支持的 agent 名字出现。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**原文给出的可核对内容（属于工程事实而非效果）：** 各命令的子命令与选项表；安装作用域与路径表（项目 vs 全局）；受支持 agent 与其项目/全局路径的完整表格；兼容性表（哪些 agent 支持 Basic skills / `allowed-tools` / `context: fork` / Hooks）；技能发现位置清单与「最多三层、浅层遮蔽深层」的规则；`SKILL.md` 必填与可选字段；插件清单发现；下载限额默认值（10 MiB / 25 MiB / 1000 文件）及覆盖用的环境变量；环境变量表（`INSTALL_INTERNAL_SKILLS`、`DISABLE_TELEMETRY`、`DO_NOT_TRACK`、`GITHUB_TOKEN`、`GH_TOKEN`）；私有仓库的认证尝试顺序与「不执行 `gh auth token`、不复制凭据」的说明；遥测发送范围与关闭方式；Troubleshooting 三条（找不到技能、技能未加载、权限错误）。

**只是作者主张、无数据支撑：** 「Skills are generally compatible across agents」；「Symlink 推荐」的理由（单一来源、便于更新）；技能能带来的价值（生成发布说明、按约定建 PR、集成外部工具）只是举例，没有任何成功率、耗时或质量对比。初筛材料给的 stars 数与当日新增属于外部指标，不是 README 内容，只能说明关注度高，不能说明效果。

**适用条件与风险：** 目标是**编码代理的技能分发**，README 中所有技能示例都偏软件工程（PR、发布说明、前端设计规范）；对写作、运营、研究等非编码工作的适用性未涉及。技能装上去不等于被采纳——Troubleshooting 专门列了「技能未加载」，说明存在路径/前置不满足的失败模式。默认开启匿名遥测，团队使用前应确认是否需要关闭。下载/解压限额默认较紧，放宽需自行判断来源可信度。CLI 会自动探测本机已安装的 agent 并可能提示选择，脚本化场景要显式给 `-a` 和 `-y`。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（建议 1–2 人、1 个仓库、1 周）：**

1. 选一个你团队已经在用的 agent（清单里 Claude Code 已是 adopt，优先从它开始）。
2. 先只读清单：`npx skills add vercel-labs/agent-skills --list`，挑 1 个与当前痛点最贴近的技能（如按团队约定建 PR）。
3. 装到项目作用域并随仓库提交，让同事拿到同一份：

```bash
npx skills add vercel-labs/agent-skills --skill <技能名> -a claude-code
```

4. 做 A/B 对照：同一个任务（例如「从最近 20 个 commit 生成发布说明」或「开一个符合团队规范的 PR」）跑两次——一次带技能，一次用 `npx skills use vercel-labs/agent-skills --skill <技能名>` 之外的常规方式或不带技能。
5. 记录失败模式：用 `npx skills list` 确认技能是否真正装到位；对照 Troubleshooting 排查「未加载」。
6. 一周后决定：保留并推广 / 换成自写技能 / 卸载（`npx skills remove`）。

**判断有没有改善的指标（README 未提供任何指标，以下需自定并留底）：**

- 同一任务的人工返工次数、需人工改动的比例或行数；
- 产出是否符合既有检查清单（如 PR 是否满足团队约定项、发布说明是否含必需字段）；
- 单次任务耗时与需重复输入上下文的次数；
- 团队采纳度：安装了该技能的项目数/人数，以及更新是否跟得上（`npx skills update`）；
- 反向指标：技能是否引入无关步骤、是否因 agent 特性差异（`context: fork`、Hooks、`allowed-tools`）在部分 agent 上失效。

若一周内拿不到稳定的正向对照结果，应停在「try」级别、不要写进手册的主推流程。
