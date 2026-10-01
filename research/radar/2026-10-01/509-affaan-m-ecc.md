# affaan-m/ECC

- 结论：**值得一试**。建议在单个非关键项目、单个 harness（优先 Claude Code）上按 README 的 guided setup 做小范围试装，只取 rules/common 加一个语言包和核心工作流，并保留一键回滚；理由是原文给出了可照抄的安装命令、settings.json 配置片段和安装校验命令，但组件规模极大、全部能力均为作者自述、没有任何效果数据，且 README 混有商业推广与供应链风险警告。
- 原文：https://github.com/affaan-m/ECC
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T10:27:43.944Z

## 是什么

ECC（仓库 `affaan-m/ECC`）自称是一套面向编码智能体的“agent harness operating system”：把一条固定的工程流程装进智能体，而不是在每个提示词里重复描述它——

```text
plan -> test -> implement -> review -> verify -> remember -> improve
```

仓库自述包含 68 个 agents（规划、评审、构建修复、安全、架构、领域工作）、293 个 skills（TDD、研究、安全、文档、前端、数据、ML、运维等）、94 个 command shims，外加 hooks、memory、continuous learning、instincts、按语言/项目选择性加载的 rules，以及 AgentShield 扫描（覆盖 prompts、hooks、MCP 配置、权限、密钥、agent 文件）。核心口号是“Optimize the context window. Persist everything else.”

许可与形态：MIT，开源部分永久免费；ECC Pro 是面向私有仓库的托管 GitHub App，私有仓库 $19/seat/mo。支持面：目前对 Claude Code 支持最好，Codex 有受支持的 sync 路径，Cursor、OpenCode、Gemini、Zed、Antigravity、Qwen、Hermes、OpenClaw、Kimi Code、CodeBuddy、JoyCode 等是“capability-limited adapters”，仓库要求先看 platform support matrix 再假设功能对等。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提（Claude Code 路径）**：Node.js 18 或更新；Claude Code 的插件方式还要求 Git 和 Claude Code 2.1+ 在 `PATH` 上。先自查：

```powershell
node --version
git --version
claude --version
```

任何一条找不到，先修好该前置再继续。

1. **引导式安装（推荐入口）**。前提：Node.js ≥18。任意现代包管理器均可：

```bash
npx ecc-universal@2.2.2 setup
```

```bash
pnpm dlx ecc-universal@2.2.2 setup
```

```bash
yarn dlx ecc-universal@2.2.2 setup
```

```bash
bunx ecc-universal@2.2.2 setup
```

注意原文的限定：Yarn Classic 1 没有 `yarn dlx`；版本号 pin 不等于安全审计或完整性校验，运行前应自行审查 release 源码与 registry 完整性；未发布改动请用审查过的 checkout。

2. **在向导里选定作用域与 hooks 档位**。典型个人配置选 **Global user** + **Standard** hooks，然后确认。向导会先清点官方 marketplace 和每个原生 Claude 安装作用域，再安装/更新/安全迁移 `ecc@ecc` 到你选的作用域；重跑同一命令即可更新、改作用域或改 hook 档位。

3. **验证安装**。前提：新开一个 Claude Code 会话。

```text
/plugin list
```

确认 `ecc@ecc` 处于启用状态。

4. **替代入口：Claude Code 原生插件命令**（与步骤 1-2 二选一，不要叠加）。在 Claude Code 内运行：

```text
/plugin marketplace add https://github.com/affaan-m/ECC
/plugin install ecc@ecc
```

原文明确：这两条命令由 Claude Code 自己解析并报错（marketplace/plugin/作用域冲突），ECC 无法拦截；若报已存在或作用域冲突，改用 2.2 guided setup 或先解决冲突，**不要**再叠一层手动安装。安装后再用 `/ecc:configure-ecc` 做重配置（仅在插件已装后可用，首次安装不能替代内置 `/plugin`）。

5. **声明式配置（偏好 settings.json 时）**。写入 `~/.claude/settings.json`，效果等同步骤 4 的两条命令：

```json
{
  "extraKnownMarketplaces": {
    "ecc": {
      "source": {
        "source": "github",
        "repo": "affaan-m/ECC"
      }
    }
  },
  "enabledPlugins": {
    "ecc@ecc": true
  }
}
```

6. **补 rules（插件不分发 rules）**。前提：已 clone 仓库。只加你真正要的规则包，从 `rules/common` 加一个你实际使用的语言/框架包开始：

```bash
git clone https://github.com/affaan-m/ECC.git
cd ECC
mkdir -p ~/.claude/rules/ecc
cp -R rules/common ~/.claude/rules/ecc/
cp -R rules/typescript ~/.claude/rules/ecc/  # replace with your stack
```

原文警告：若已装插件，**不要**再跑 `./install.sh --profile full`。复制 rules 时要复制整个语言目录（如 `rules/common`、`rules/golang`），不要只复制目录里的文件，否则相对引用会断、文件名会撞。

7. **多 harness 一次配置**。前提：想在一次受审流程里配置多个编码智能体：

```bash
npx ecc-universal@2.2.2 install --guided
```

它允许任选 Claude Code / Codex / Kimi Code 组合，展示每个安装渠道与目标位置，首次写入前对每个选择做预检，最后只问一次确认。自动化时可把每个 provider 选择写死：

```bash
npx ecc-universal@2.2.2 install --guided \
  --harness claude --harness codex --harness kimi \
  --claude-scope local --claude-hooks standard \
  --profile core --yes
```

对应行为：Claude Code 装原生 `ecc@ecc` 插件（`user`/`project`/`local` 三选一作用域 + ECC hook 档位）；Codex 走原生 marketplace/plugin 生命周期，hook 审查与信任归 Codex 管；Kimi Code 只写 `./.kimi-code` 下的托管项目文件，不配置 ECC hooks、模型/供应商设置与认证。

8. **写入前先 dry-run**。前提：想先确认原生 Codex 路径与托管 Kimi 路径：

```bash
npx ecc-universal@2.2.2 install --guided --harness codex --dry-run
npx ecc-universal@2.2.2 install --profile core --target kimi --dry-run
```

9. **只要一部分组件**。先用咨询命令问“我这类工作该用哪些组件”，它会返回匹配组件、相关 profile 和预览/安装命令，先预览文件计划再装：

```bash
node scripts/ecc.js consult "security reviews" --target claude
npx ecc-universal@2.2.2 consult "security reviews" --target claude
```

显式安装指定 skills 或 capability：

```bash
./install.sh --target claude --skills tdd-workflow,security-review
node scripts/ecc.js install --profile minimal --target claude --with capability:machine-learning
```

原文提醒：不要用 `npx ecc-install --profile minimal --target claude`——`ecc-install` 是 `ecc-universal` 内部的二进制名，不是单独发布的 npm 包。

10. **低上下文 / 无 hooks 安装**。前提：只要 rules、agents、commands、平台配置和核心工作流，不要运行时 hooks；该 profile 有意排除 `hooks-runtime`：

```bash
npx ecc-universal@2.2.2 install --profile minimal --target claude
```

源码 checkout 等价写法（Windows 用 `./install.ps1`）：

```bash
./install.sh --profile minimal --target claude
```

普通 core profile 关掉 hooks：

```bash
./install.sh --profile core --without baseline:hooks --target claude
./install.sh --profile core --no-hooks --target claude
```

之后再单独补 hooks 运行时：

```bash
./install.sh --target claude --modules hooks-runtime --enable-hooks
```

原文的关键约束：任何会落地 hook 运行时的 profile/module 都需要显式决定——没有 `--enable-hooks` 或 `--no-hooks`，安装器会打印 hooks 能做什么然后**在写入前停下**。

11. **hooks 必须用安装器写，不要手拷**。前提：走手动安装路径且要 hooks：

```bash
bash ./install.sh --target claude --modules hooks-runtime --enable-hooks
```

原文明确禁止把仓库里的 `hooks/hooks.json` 直接拷进 `~/.claude/settings.json` 或 `~/.claude/hooks/hooks.json`（那是插件/仓库导向的文件，需要安装器重写命令路径）。安装器会把 hooks 脚本装到 `~/.claude/` 并把解析后的条目注册进 `~/.claude/settings.json`，保留既有用户 settings 和 hooks，ECC 自有条目用稳定 ID 跟踪以便幂等更新和安全卸载。若你是用 `/plugin install` 装的，**不要**再把 hooks 拷进 `settings.json`——Claude Code v2.1+ 已自动加载插件 `hooks/hooks.json`，重复会导致重复执行和跨平台 hook 冲突。

12. **项目级 rules 而不是全局 rules**。前提：这套标准只应作用于某一个仓库：

```bash
cd your-project
mkdir -p .claude/rules/ecc
cp -R /path/to/ECC/rules/common .claude/rules/ecc/
cp -R /path/to/ECC/rules/typescript .claude/rules/ecc/
```

原文说明理由：rules 是始终加载的上下文，所以从 `common` 加一个你实际在用的栈开始。

13. **Codex 路径**。前提：当前 Codex 版本支持仓库级 marketplace 插件：

```bash
codex plugin marketplace add affaan-m/ECC
codex plugin add ecc@ecc
codex plugin list --json
node scripts/codex/check-plugin-cache.js
```

两条 add 命令幂等；后续刷新用 `codex plugin marketplace upgrade ecc` 然后 `codex plugin add ecc@ecc`。Codex 只在当前 `CODEX_HOME` 存一份启用状态，没有 Claude 的 user/project/local 作用域，其原生 hooks 需要显式信任决定，也不用 Claude 的四档 hook profile；在 Codex 内调用 `$configure-ecc` 走引导流。旧的 `scripts/sync-ecc-to-codex.sh` 是已弃用的兼容选项（先跑一次 Codex 让 `~/.codex/config.toml` 存在）：

```bash
git clone https://github.com/affaan-m/ECC.git
cd ECC
npm install
bash scripts/sync-ecc-to-codex.sh
```

排查/移除该 legacy 层而不动 Codex 会话和原生插件缓存：

```bash
node scripts/ecc.js uninstall --legacy-codex-sync --dry-run
node scripts/ecc.js uninstall --legacy-codex-sync
```

原文约束：**不要**把原生 marketplace 插件叠在 sync 流程上。

14. **其他 harness（Cursor、OpenCode、Gemini、Zed、Antigravity、Qwen、Hermes、OpenClaw、Kimi、CodeBuddy、JoyCode）**。前提：先 clone 一次再按目标安装，例如：

```bash
git clone https://github.com/affaan-m/ECC.git
cd ECC
./install.sh --profile minimal --target cursor
```

```bash
npm install && npm run build:opencode && ./install.sh --profile full --target opencode --enable-hooks
```

其余目标同理（`--target gemini|zed|antigravity|qwen|hermes|openclaw|kimi|codebuddy|joycode`）。Copilot 的支持已随仓库提供：`.github/copilot-instructions.md` 是指令层，`.github/prompts/` 里有可复用的 `/plan`、`/tdd`、`/security-review`、`/build-fix`、`/refactor` 提示词，`.vscode/settings.json` 打开 `chat.promptFiles`。没有原生适配器的 harness 走 `docs/MANUAL-ADAPTATION-GUIDE.md`，把少量 ECC skills 和工作流说明搬进聊天式工具，且不要假装有 hooks 或原生 skill 发现。

15. **更新、排障与卸载**。前提：本地 Claude 配置被清空/重置过（原文说明这**不需要**重新购买任何东西）：

```bash
node scripts/ecc.js list-installed
node scripts/ecc.js doctor
node scripts/ecc.js repair
```

原文强调的三条硬规则：每个 harness 只选一种安装方式；**不要叠加安装方式**（同一 harness 装两次会重复 skills/commands/hooks/配置，装到多个 harness 不冲突）；已经叠装乱了就直接走仓库的 Reset / Uninstall 章节。

16. **官方渠道约束（安装前必读）**：只从 GitHub 仓库 `github.com/affaan-m/ECC`、npm 包 `ecc-universal` 与 `ecc-agentshield`、GitHub App、插件 slug `ecc@ecc`、官网 `ecc.tools` 安装；第三方重新上传和非官方镜像我方不维护、不审查，可能含恶意代码。命名对应关系：源码仓库 `affaan-m/ECC`、Claude 插件标识 `ecc@ecc`、npm 包 `ecc-universal`，三者不可互换；npm 按版本 tag 发布（2.1、2.2…）而不是每次 push，要最新就用 git 装。

## 对应的研究问题

**1. 能力发现**：原文以清单方式给出了可以整包交给智能体的工作类型——agents 覆盖规划、评审、构建修复、安全、架构和领域工作；skills 覆盖 TDD、研究、安全、文档、前端、数据、ML、运维。更重要的是给出了“发现机制”本身：`consult "<你的工作描述>"` 会返回匹配的组件、相关 profile 和预览/安装命令（`node scripts/ecc.js consult "security reviews" --target claude`），这是把“我这件活该配什么”变成一条可执行查询的做法。

**2. 任务匹配**：原文明确分层——Claude Code 支持最好，Codex 有“supported sync path”，其余为 capability-limited adapters，且要求先看 support status matrix 再假设功能对等；Claude 原生插件 + Codex 原生插件可以共存，Claude 插件 + 完整 Claude 手动安装不可以叠加。安装层面还区分了作用域（user/project/local）与 hooks 档位，profile 可选 `minimal` / `core` / `full`，并能按 `--skills`、`--with capability:machine-learning` 粒度装配，这正好对应“不同工作配不同工具与协作方式”。

**3. 条件供给**：原文对“要喂什么”给了具体载体——rules（始终加载的标准，按语言/项目选择性加载）、skills、agents、hooks、memory、continuous learning、instincts；权限与信任方面，hooks 运行时必须显式决定（`--enable-hooks` / `--no-hooks`），Codex 原生 hooks 需要显式信任决定；反馈方面有 session summaries、continuous learning、instincts（README 只点名，未展开机制）。安全侧提供 AgentShield，扫描 prompts、hooks、MCP 配置、权限、密钥和 agent 文件。核心原则一句话：“优化上下文窗口，其余一切持久化”，并由此派生出低上下文/no-hooks 安装路径。

**4. 主动推进**：`hooks-runtime` 是 ECC 里承担自动触发的执行层（安装器会注册 hook 条目），continuous learning 与 instincts 指向“把重复的成功沉淀成可复用技能与工作流”这一持续回路，流程里的 `remember -> improve` 也是这个方向。但需要说明：原文在此处对“什么时间、什么事件、什么状态触发”（触发器定义、调度、运行产物）没有给出可抄的细节，且文本在 hooks-runtime 安装处被截断，这一条只能按“框架存在、机制未见”来记。

**5. 效果验证**：原文给出的是**安装与状态验证**，不是工作效果验证——`/plugin list` 确认 `ecc@ecc` 启用、`codex plugin list --json`、`node scripts/codex/check-plugin-cache.js`、`node scripts/ecc.js list-installed`、`doctor`、`repair`，以及写入前的 `--dry-run`。这些能判定“装对了没有、有没有重复/冲突、能否安全卸载”，但原文没有任何关于任务质量、返工率、耗时或成本的数据。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：直接相关且是 ECC 当前支持最好的宿主。ECC 是叠加在 Claude Code 之上的插件/安装体系（原生插件 `ecc@ecc`、`~/.claude/rules`、`~/.claude/skills`、`~/.claude/settings.json` 的 hooks 注册），不是替代品。
- **Cursor（watch）、OpenCode（watch）、Hermes（watch）、OpenClaw（watch）**：清单里这四个都处于观望，原文把它们列为 capability-limited 适配器，各有 `--target` 安装路径（Cursor 用 `--profile minimal --target cursor`，OpenCode 需先 `npm run build:opencode` 再 `--profile full --target opencode --enable-hooks`）。这为四个 watch 条目提供了“可实际试装”的入口，但原文同时提示 Cursor 的原生加载行为随版本变化、ECC 不往 `.cursor/` 装根 `AGENTS.md`。
- **GitHub Copilot（清单状态 drop）**：原文称 Copilot 支持已包含在仓库内（`.github/copilot-instructions.md`、`.github/prompts/` 的 `/plan`、`/tdd`、`/security-review`、`/build-fix`、`/refactor`、`.vscode/settings.json` 的 `chat.promptFiles`）。这与清单中 drop 的结论存在出入，可作为重新评估该条目的一个信号（但原文同样未给任何效果证据）。
- **Greptile（study）**：出现在赞助商/合作伙伴区域，属于商业关系，原文没有描述与 Greptile 的功能集成。
- **GitHub Trending（source，try）**：该仓库 README 内嵌了 Star History 的 “GitHub Trending Repository of the Day” 徽章与排名徽章；这是热度信号，不能当作采用依据。
- **Paperclip、Atlas**：清单中没有相关条目，原文也未提及。

## 证据与局限

**原文给的可核对信息**（属于可照做内容）：具体包名与版本 `ecc-universal@2.2.2`、安装/向导/预检/排障命令、插件 slug `ecc@ecc`、`settings.json` 配置片段、rules 与 skills 的目标目录约定（如 Claude 从 `~/.claude/skills/` 的直接子目录发现 skill，不要嵌到 `~/.claude/skills/ecc/`）、hooks 必须经安装器注册、Codex 的 marketplace/plugin 命令链、各 harness 的 `--target` 名称、三条标识符（仓库/插件/npm）的对应关系。

**只是作者主张、无外部证据**：68 agents / 293 skills / 94 commands 的规模、`plan -> test -> implement -> review -> verify -> remember -> improve` 能带来更好结果、“优化上下文窗口，其余持久化”、continuous learning / instincts 的实际效果、AgentShield 的检出能力。全篇没有任何基准测试、对比数据、真实案例或第三方评估。

**输入本身的局限**：
- 原文在 hooks-runtime 安装段落中途被截断（结尾停在 Windows 路径 `%USERPROFILE%\.claude` 处），因此 memory、continuous learning、AgentShield、platform support matrix、Reset/Uninstall 章节的具体做法均未出现在材料里，本报告不含这些部分的可执行步骤。
- 输入元数据标注 270311 stars，但 README 正文中并无该数字，无法从材料核实，不应作为采用依据。
- README 含大量商业内容（ECC Pro 私有仓库 $19/seat/mo、赞助商与联盟链接、Discord），且作者自行反复强调“只从官方渠道安装、第三方镜像可能含恶意代码”“版本 pin 不是安全审计或完整性校验”。这说明供应链风险由作者本人承认，采用前需要自行审查源码与 registry 完整性。
- 适用条件：主要面向 Claude Code（2.1+，需 Node.js 18+、Git）；其他 harness 功能不等价；同一 harness 严禁叠装多种安装方式；hook 运行时在未显式选择时安装器会在写入前停止。

## 怎么试、怎么验证

**最小试用方式（建议 1 个 harness、1 个非关键项目、1 到 2 周）**：

1. 先只做只读侦察，不写入任何东西：

```bash
npx ecc-universal@2.2.2 consult "<你手头最常做的那类工作>" --target claude
npx ecc-universal@2.2.2 install --guided --harness codex --dry-run
```

查看它推荐哪些组件和确切文件计划。
2. 在选定的单个 harness 上选**一种**安装方式（Claude Code 优先用 `npx ecc-universal@2.2.2 setup` 或 `--profile minimal`），并**明确选择 hooks 的取舍**：第一轮建议不加 hooks（`--no-hooks` / `minimal`），把变量压到最少。
3. 只补最小 rules：`rules/common` + 一个你实际在用的语言包（步骤 6 或 12）。不要一上来铺满 293 个 skills。
4. 在一个真实任务上跑一遍流程骨架：先让它 plan，再写测试，再实现，然后**新开上下文**做 review，最后 verify。这是原文主张的核心回路，也是可被观察的唯一对象。
5. 记录回滚路径（`node scripts/ecc.js list-installed` / `doctor` / `repair`，以及仓库的 Reset / Uninstall 章节），确保能一键撤掉。

**判断有没有改善的指标（分两层，因为原文没给效果指标，需要自己造对照）**：

- 安装正确性层（有现成命令）：`/plugin list` 中出现并启用 `ecc@ecc`；`node scripts/ecc.js doctor` 无报错；`node scripts/ecc.js list-installed` 与预期一致；无重复 skill/command/hook；`--dry-run` 计划与实际写入一致。任一项不通过就先修，不要进入效果评估。
- 工作效果层（需自建 A/B，建议同一类任务前后各做 5~10 次）：①人工纠正回合数（你需要在过程中打断并纠正几次）；②返工次数（提交后被退回重做的次数）；③review 阶段发现的缺陷数（同一次改动里）；④完成同一任务的时间；⑤上下文占用（会话长度或 token 消耗，对应它“优化上下文窗口”的主张）；⑥一次做对的比率（首次提交即通过）。
- 停止条件：若引入后人工纠正回合数或返工次数没有下降，或上下文占用明显上升，就退回“只留 rules + 少量 skills”、甚至 `study` 而非继续用；ECC 本身也提供了卸载与 repair 通道，回滚成本应当可控。
