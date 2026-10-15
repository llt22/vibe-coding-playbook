# yoanbernabeu/skillcrew

- 结论：**值得一试**。Skillcrew 用一条命令把团队的 SKILL.md 注册表分发到每个人、每种 AI 编程代理，并用 session 启动 hook + 每小时定时器做到无需人工更新，值得在一个小团队、一个私有 Git 仓库上小范围试；但它自述处于 early development（v1 前会有 breaking change），且多数 agent 的同步触发尚未实测，所以先试不建议直接采用。
- 原文：https://github.com/yoanbernabeu/skillcrew
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-15T16:02:21.497Z

## 是什么

Skillcrew 是一个命令行工具 + 注册表方案，用来把 Agent Skills（`SKILL.md`，遵循 agentskills.io）分发给组织里每个开发者，无论对方用哪个 AI 编程代理（Claude Code、Codex、GitHub Copilot、Cursor、Gemini CLI，以及任何读取 `~/.agents/skills` 的 agent），并让技能保持更新而开发者不需做任何操作。

它要解决的四类问题（README 自述）：

- **版本漂移**：手工复制的 skill 会各自分叉，修好的版本传不到所有人。
- **多 agent 团队**：每个 agent 从自己的目录读 skill。
- **没有治理**：无法保证每个人都装了安全审查 skill，也无法下架一个坏 skill。
- **手动更新**：其他工具需要有人记得跑 `update`。

工作机制：一个 Git 仓库作为注册表（Claude Code marketplace 布局 + `skillcrew.yaml`），`skillcrew sync` 由 agent 会话启动时的 hook 和每小时定时器触发，把技能分发到 `~/.agents/skills/<skill>`（真实拷贝，给 Codex、Copilot、Cursor、Gemini CLI 等）和 `~/.claude/skills/<skill>`（符号链接，给 Claude Code）。

项目自述状态：**early development，MVP 端到端可用，v1 之前预期有 breaking change**。

## 具体做法（编号步骤）

前提：macOS 或 Linux（Windows 走 WSL2）、已安装 `git`；`propose` 用到 `gh`（GitHub）或 `glab`（GitLab），装了才用得上。

### 1. 安装

```sh
brew install yoanbernabeu/tap/skillcrew
# or
curl -fsSL https://raw.githubusercontent.com/yoanbernabeu/skillcrew/main/install.sh | sh
# or
go install github.com/yoanbernabeu/skillcrew/cmd/skillcrew@latest   # Go 1.26 or later
```

可选：校验发布包（`install.sh` 在检测到 `cosign` 时会自动校验）。`checksums.txt` 由 release 工作流用 Sigstore cosign 做无密钥签名：

```sh
VERSION=v0.1.0
base=https://github.com/yoanbernabeu/skillcrew/releases/download/$VERSION
curl -fsSLO "$base/checksums.txt" -fsSLO "$base/checksums.txt.sigstore.json"
cosign verify-blob --bundle checksums.txt.sigstore.json \
  --certificate-identity "https://github.com/yoanbernabeu/skillcrew/.github/workflows/release.yml@refs/tags/$VERSION" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com checksums.txt
shasum -a 256 --ignore-missing -c checksums.txt   # then check your archive against it
```

### 2. 管理员：创建注册表

```sh
mkdir acme-skills && cd acme-skills && git init
skillcrew registry init --org acme        # or run it inside an existing Claude Code marketplace
```

`registry init` 会生成：一个带示例 plugin 和 skill 的 marketplace、一个 `skillcrew.yaml`、一份 CI 配置（默认 GitHub Actions，`--ci gitlab` 切 GitLab CI，`--ci none` 不要 CI），以及一份告诉 AI agent 如何改这个注册表的 `AGENTS.md`。也可以在一个已有的 Claude Code marketplace 目录里运行它做转换。

### 3. 逐个添加 skill

```sh
skillcrew skill new git:commit-message --status required \
  --description "Writes commit messages following the team convention. Use it whenever you create a git commit."
skillcrew skill new symfony:new-project --status required --team backend \
  --description "Creates a new Symfony project following the team standards. Use it when the user wants to start a new Symfony application."
```

前提与效果：`skill new` 会创建 `plugins/<plugin>/skills/<skill>/SKILL.md`；插件是新的时，会创建并在 `.claude-plugin/marketplace.json` 里登记该插件；并在 `skillcrew.yaml` 里设置状态。技能的具体指令要自己写进 `SKILL.md`，手写或让 agent 写都行。`--description` 建议写成「这个技能做什么 + 什么时候用它」，上面两条示例就是这个句式。

### 4. 在 `skillcrew.yaml` 里配状态和团队

```yaml
org: acme
default: available                 # status of skills not listed below

skills:
  example:hello-world: recommended # plugin:skill, as in Claude Code
  git:commit-message: required
  # misc:risky: blocked            # removed from every machine at the next sync

teams:
  backend:
    skills:
      symfony:new-project: required
```

可用状态共五种：`required`、`recommended`、`available`、`deprecated`、`blocked`；可分别按组织（`skills:`）和按团队（`teams:`）设置。`blocked` 是下架开关：下次同步会把它从每台机器移除。

### 5. 校验并发布

```sh
skillcrew validate
git add -A && git commit -m "Create the skills registry"
gh repo create acme/skills --private --source . --push
```

`skillcrew validate` 检查：每个 id 必须在 `plugins/` 下存在；skill 名不能冲突；pin 必须存在（且 `ref` 必须是 tag）；`marketplace.json` 里缺失的插件目录会被报告。生成的工作流会在每个 pull request 上跑这个校验。转换已有 marketplace 时，会为冲突的 skill 生成 `install_as` 别名、把校验失败的 skill 设为 blocked，并打印剩余待修项。

### 6. 开发者：加入组织

```sh
skillcrew init github.com/acme/skills --team backend   # "skillcrew team list" shows the teams
```

就这样。之后技能跟随注册表；开一个新的 agent 会话即可加载。`skillcrew status` 看自己有什么，`skillcrew list --available` 看能自行添加什么。注册表已有的团队可以用 `skillcrew team list` 先查。

### 7. 日常用到的命令

- `skillcrew sync`：立即同步（正常情况下 agent 和定时器会自动做）。
- `skillcrew status`：组织、团队、已安装技能及其状态。
- `skillcrew list [--available]`：注册表里的全部技能及其对你的状态。
- `skillcrew install` / `skillcrew remove <skill>`：对 `available` 的技能选择加入 / 退出。
- `skillcrew disable` / `skillcrew enable <skill>`：关掉 / 打开一个 `recommended` 或 `deprecated` 技能。
- `skillcrew propose <skill>`：用本地改动开一个 PR（个人技能用 `--plugin p`）。
- `skillcrew doctor`：检查 hooks、定时器、注册表和已安装技能。
- `skillcrew uninstall`：移除 Skillcrew 装的一切，并还原它替换掉的个人技能。

`<skill>` 可以是 `plugin:skill` 形式的 id，也可以是已安装名。`status`、`list`、`team list`、`sync`、`doctor`、`validate` 都支持 `--json`（便于接监控或脚本）。

### 8. 安全与治理（部署前必须做的部分）

- **把注册表当作生产代码保护**：默认分支要求 review；如果用 `ref` 固定版本，同时保护 tag。
- **pin 无法被劫持**：`sha` 必须是完整 commit id，`ref` 必须是 tag，两者都不会解析到分支；`skillcrew validate` 在 CI 里检查这两点。
- **Skillcrew 不执行注册表里的任何内容**，它只复制文件；但 skill 可能自带脚本，agent 使用该技能时会执行这些脚本，所以必须在 PR 里审查。
- **不存密钥**：Git 认证走你已有的 credential helper；内嵌密码的 URL 会被拒绝。
- **kill switch**：把技能设为 `blocked`，下次同步即从所有机器移除。

### 9. 处理本地改动与个人技能

- 对团队技能的本地改动会被备份到 `~/.skillcrew/backups/<skill>/`（保留最近 5 个版本），然后恢复团队版本；想改就改完跑 `skillcrew propose <skill>` 转成 PR。
- 如果本地已有同名个人技能，会被备份（且不会被清理）、被团队技能替换；`skillcrew uninstall` 会还原。想两者并存就把自己的改名。
- 注册表里两个技能重名：`validate` 会报出来，给其中一个在 `skillcrew.yaml` 配 `install_as` 别名。
- **项目级技能不要交给它**：提交在项目仓库里（`.agents/skills/`、`.claude/skills/`），Git 本身就能分发；Skillcrew 只管用户级技能。
- 卸载流程：`skillcrew uninstall` 会先列出要删除的内容，再移除 hooks、定时器、团队技能和 `~/.skillcrew`；被替换的个人技能在名字空出后还原，你本地改动的备份会保留。然后 `brew uninstall skillcrew` 或删掉二进制。

## 对应的研究问题

- **能力发现**：弱。它不是发现新能力的工具，而是把已有能力（`SKILL.md`）分发的管道。唯一相关的是 `skillcrew list --available` 能让成员看到组织当前提供哪些能力，本身不产生新能力。
- **任务匹配**：部分相关。它处理「同一个技能如何匹配到不同 agent」：Claude Code 读 `~/.claude/skills`（符号链接），OpenCode / Codex / Gemini CLI / Copilot / Cursor / Windsurf / Amp / Goose 读 `~/.agents/skills`（真实拷贝）。但「什么任务配什么模型」这一层没有依据，README 不涉及。
- **条件供给**：这是它的主场。它把「该给 AI 的上下文和能力」变成可分发的供给物：一个 Git 注册表、按组织和团队设 `required`/`recommended`/`available`/`deprecated`/`blocked`、session 启动 hook + 每小时定时器保证无需人工动作就能拿到最新版本，`blocked` 还能强制收回。安全模型规定了注册表作为信任根所需的前提（分支保护、tag 保护、PR 审查、不存密钥）。
- **主动推进**：有具体机制。触发源有两个——agent 会话启动的 hook，以及用户级定时器（launchd / systemd，无需 daemon、无需管理员权限）。hook 不会让 agent 等待：它立刻返回，若距上次同步超过一分钟就在后台启动同步。Claude Code 能实时拿到新技能，其他 agent 在下个 session 生效。
- **效果验证**：很弱。只有状态类检查——`skillcrew validate`（注册表合法性）、`skillcrew doctor`（hooks、定时器、注册表、已安装技能）、`skillcrew status --json`。没有任何衡量「用了之后工作结果是否变好」的指标。

## 与已有做法的关系

清单中的相关条目：**Agent skills**（concept，adopt）、**Claude Code**（tool，adopt）、**Cursor**（watch）、**GitHub Copilot**（drop）、**goose**（watch）、**OpenCode**（watch）。

- 与 **Agent skills** 直接咬合：Skillcrew 就是 `SKILL.md` 的分发与治理层，本身不定义技能格式。
- 与 **Claude Code** 是补充关系，不是替代：它把团队技能以符号链接装进 `~/.claude/skills`，并注册 `SessionStart` hook；同时能直接读 Claude Code marketplace 布局，`registry init` 可以在已有 marketplace 里原地跑。README 的对比表把「Claude Code marketplace」列为只能在 Claude Code 内工作、更新需要逐 marketplace 选择加入、且只能按组织（不能按团队）设必需技能。
- 对 **Cursor / GitHub Copilot / OpenCode / goose**（以及 Windsurf、Amp）走 `~/.agents/skills` 或各自的 `sessionStart` hook。需要注意：README 明确标注这些多为 **not tested yet**（Copilot、Cursor、Windsurf、Amp、Goose 全部未测试）。清单里 Copilot 的状态是 drop，而本仓库把它列为支持对象（尚未测试），这一点在采用时要打折扣。
- 清单中没有条目覆盖「跨 agent 的技能注册表 / 版本治理」这件事本身，Skillcrew 填的是这个空位。

## 证据与局限

**原文给出的事实与数据**：

- 仓库指标：30 stars。
- 状态自述：early development，MVP 端到端可用，v1 前会有 breaking change。
- 支持表标注「Tested on 2026-10-11 with real agents」，各 agent 的验证程度不同：Claude Code 的 skills 和 hook 均已验证；OpenCode 只验证了 skills；Codex CLI 验证了 skills、hook 尚未验证；Gemini CLI 验证了 skills、hook 未测试；GitHub Copilot CLI / VS Code、Cursor、Windsurf、Amp、Goose **全部未测试**。
- 本地改动的备份策略：`~/.skillcrew/backups/<skill>/` 保留最近 5 个版本。
- `validate` 的具体检查项、`sha`/`ref` 的 pin 规则、内嵌密码 URL 被拒绝等，都有明确描述。

**只是作者主张、没有第三方证据的部分**：

- 对比表里的「Works with every agent ✓」「Updates with no action ✓（hooks + timer）」是自家结论，没有外部评测。
- 「零操作」「原子更新」「离线仍能用最后拉取的注册表」「Skillcrew 不执行注册表内容」都是作者陈述，没有独立验证。
- 安全上要特别注意边界：「不执行注册表内容」只覆盖 Skillcrew 自己，skill 里附带的脚本仍会被 agent 在执行该技能时运行，作者也把审查责任放回 PR。

**适用条件**：需要 macOS / Linux（Windows 走 WSL2）和 `git`；需要一个 Git 托管（GitHub 或 GitLab）和愿意维护注册表的管理员；对单人开发者收益有限（README 的 FAQ 建议项目级技能直接用 Git 分发）。CI 校验依赖生成的工作流，所以需要团队本来就有 PR 流程。

**抓取说明**：本报告只依据仓库 README，未访问 `skillcrew.yoandev.co` 的完整文档，也未运行过任何命令；所有命令与配置均按原文照录。

## 怎么试、怎么验证

**最小试用方式**：

1. 选一个 2–3 人的小组，建一个私有 Git 仓库作为注册表。管理员按上面的步骤 2–5 走一遍，只放 1–2 个 `required` 技能（例如 `git:commit-message`），不要一次迁移全部技能。
2. 一名开发者跑 `skillcrew init <registry> --team <team>`，确认技能出现在 `~/.agents/skills/` 或 `~/.claude/skills/`。
3. 跑 `skillcrew doctor` 确认 hooks 和定时器就位，跑 `skillcrew list --available`、`skillcrew status --json` 确认状态与注册表一致。
4. 只在一个 agent 上先跑（优先 Claude Code，因为它是 README 里唯一 skills 与 hook 都已实测的组合）。
5. 试完用 `skillcrew uninstall` 清理，确认个人技能被还原。

**判断有没有改善的指标**（前几项可直接由工具输出判断，属于「机制是否生效」）：

- `skillcrew doctor` 全部检查通过（hooks、timer、registry、已安装技能）。
- 修改注册表里的 `SKILL.md` 并合并后，开发者不做任何动作，下一个 agent 会话里行为是否随之改变（Claude Code 应当实时生效，其他 agent 在下个 session）。
- kill switch 验证：把某个技能设为 `blocked` 并合并，下次同步后它是否从所有机器上消失。
- 本地改动团队技能后，`~/.skillcrew/backups/<skill>/` 是否出现备份、团队版本是否被恢复、`skillcrew propose` 能否按预期开出 PR。
- 定时器验证：在不动 agent 的情况下等一个同步周期，注册表变更是否自动到位。

**README 没有提供、需要团队自定的部分**：「结果是否真的变好」这一层没有任何内置指标，需要自己定义并对照试用前的基线。可考虑的方向（属于本报告的提议，不是原文内容）：团队规范类技能（如 commit message）的合规比例、同类问题被重复追问的次数、新成员上手到产出第一个符合规范提交的耗时。若这些指标在试用期内没有变化，说明机制生效但价值未体现，应停在 study 而不是扩大推广。

**不建议现在做的**：不要在一次试用里押注 Copilot、Cursor、Windsurf、Amp、Goose 这几条未测试路径；不要把 required 技能一口气铺给全组织，因为 v1 之前预期有 breaking change，回退成本会放大。
