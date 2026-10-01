# code-yeongyu/oh-my-openagent

- 结论：**值得一试**。建议在一个可弃用的环境里小范围试用 OmO：按 README 的一行命令安装，用同一个真实小任务分别跑普通 prompt、加 `ulw`、加 `mass ulw`，对比返工次数与人工介入次数。理由是可照做的安装与关键字工作流已经给出（`omo`、`ulw`、`mass ulw`、`omo setup/doctor`、两份 `omo.jsonc` 配置），但全部效果说明都只有作者主张和用户好评，没有可核对的指标。
- 原文：https://github.com/code-yeongyu/oh-my-openagent
- 来源：manual，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T10:26:15.263Z

## 是什么

OmO（oh-my-openagent）是一个命令行编码智能体：装好后运行一个 `omo` 命令，在项目目录里用自然语言描述任务，由它去做研究、写代码、验证并持续推进。README 自述它跑在 `senpi`（作者对 [pi](https://github.com/badlogic/pi-mono) 的 fork）之上。

它主打的几个机制：

- **关键字升档**：在 prompt 里加 `ultrawork`（或 `ulw`），智能体先读代码库、做计划、逐步自证、在真实界面上验收后再收手。
- **多智能体图编排**：prompt 里加 `mass ulw`，整个任务被拆成一张 agent 图，各部分并行、各用合适的模型、完成前逐个检查。
- **跨会话记忆（Kibitzer）**：记忆存放在一个由 markdown 文件组成的 git 仓库里；一个便宜的小模型陪在昂贵主模型旁边，读你以前做过的事，在主模型重犯错误前提醒它。
- **模型混用**：`/login` 支持 Claude、ChatGPT、Kimi、GLM 订阅；README 称每个模型都配了为它调过的系统提示词。
- **按需加载技能（skills）**：包含 browser use，只加载任务需要的那部分。

按输入中的抓取指标，仓库 star 数约 69701；许可证徽章显示为 SUL-1.0（非常见开源协议，用于公司环境前需自行确认）。README 内容整体偏宣传（赞助商、社区链接、用户好评、客户 logo），可照做的部分集中在安装、迁移和配置路径上。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：有一台可以随便折腾的机器或容器（因为安装脚本是 `curl | bash`）；有一个自己的小项目目录作为试验场；准备好至少一家模型的订阅或 API key（README 只提到 `/login` 支持 Claude / ChatGPT / Kimi / GLM 订阅）。

1. 安装（macOS / Linux）。README 说明脚本会把对应 OS 与 CPU 的原生 `omo` 二进制装到 `~/.local/bin`，用发布校验和校验，镜像不通时回落到 GitHub Releases：

```bash
curl -fsSL https://get.omo.dev/install.sh | bash
omo
```

2. Windows（PowerShell）用同一套逻辑的 PowerShell 脚本：

```powershell
irm https://get.omo.dev/install.ps1 | iex
```

3. 想装别的渠道/版本，在 `bash` 后面加参数（README 给的写法是 `-s -- beta` 或具体版本号）：

```bash
curl -fsSL https://get.omo.dev/install.sh | bash -s -- beta
curl -fsSL https://get.omo.dev/install.sh | bash -s -- 5.1.1
```

4. 如果你更习惯包管理器，可以改用 npm/bun 全局安装。注意包名是 `omo-ai`，README 明确提示 npm 上那个无关的 `omo` 包是别人的：

```bash
bun add -g omo-ai
# 或
npm i -g omo-ai
```

5. 进入你的项目目录，运行 `omo`，然后用自然语言描述任务。README 说这就是全部设置：

```bash
cd /path/to/your/project
omo
```

6. 感觉任务难时，在 prompt 里加上 `ultrawork` 或 `ulw`（README 的原话是 "add `ultrawork` (or `ulw`) to your prompt"）。它承诺的行为序列是：先读代码库 → 计划 → 每步自证后再前进 → 在真实界面上检查结果 → 完成后停止。把这条当作可验证的清单，而不是保证。

7. 需要多智能体协作时，在 prompt 里用 `mass ulw`。README 的原话是 "Just type \"mass ulw\" with your prompt"，即关键字和你的任务描述一起给。它承诺的是：整个任务变成 agent 图，各部分并行、各用合适的模型、完成前逐个检查。**注意**：README 没有给出这张图如何定义、如何看图的配置写法；可视化的右侧面板来自另一个项目 [omo-herdr-dag](https://github.com/jc01rho/omo-herdr-dag)。

8. 登录模型订阅（前提是你有对应订阅）：

```
/login
```

9. 如果你之前用过 OpenCode 版或 LazyCodex，先跑一次迁移，README 说它会把 provider keys、自定义 provider、MCP servers、skills 和模型选择带过来；随后用 `omo doctor` 查看你的 provider 能跑哪些任务类别、旧安装留下了什么：

```bash
omo setup
omo doctor
```

10. 配置：个人设置在 `~/.omo/omo.jsonc`，项目可以加自己的 `.omo/omo.jsonc`，**就近的文件优先**。README 说键值全在 `docs/reference/configuration.md`（该文件未随本次材料给出，需要自己去仓库/文档站取）：

```
~/.omo/omo.jsonc          # 用户级
<project>/.omo/omo.jsonc  # 项目级，优先
```

11. 更新与卸载（README 明确区分两种装法）：

```bash
# 二进制装法：重跑安装命令即更新
curl -fsSL https://get.omo.dev/install.sh | bash

# 包管理器装法
omo update

# 卸载
rm ~/.local/bin/omo
bun remove -g omo-ai        # 或 npm uninstall -g omo-ai
```

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：README 列出的“你可能没想到交给它”的活是跨源研究（自述 "research across ten thousand sources"）、做演示文稿、后端、前端、代码，以及 `mass ulw` 下的深度研究、完整机器学习流水线和迁移类任务。这些是主张，不是可核对的案例；真正可复用的是它的**提法**——用关键字给同一工具升档（`ulw` / `mass ulw`），把“这件事值不值得上多 agent、上贵模型”变成一个显式动作。

**2. 任务匹配**：README 给的匹配机制是——`mass ulw` 把任务拆成图后“每个部分跑在合适的模型上”；记忆中用一个便宜的小模型陪昂贵主模型；`/login` 覆盖 Claude / ChatGPT / Kimi / GLM 订阅；每个模型配了为它调过的系统提示词；skills 只加载任务需要的那部分。这对应“按任务环节分配模型与工具”的做法，但 README 没说明路由规则本身。

**3. 条件供给**：需要提供的是——项目目录 + 自然语言任务描述；模型接入（`/login` 或 provider key）；配置写在 `~/.omo/omo.jsonc` 或项目级 `.omo/omo.jsonc`（就近优先）；旧环境用 `omo setup` 迁移 provider keys、MCP servers、skills、模型选择。反馈侧给了两条具体机制：Kibitzer 把记忆存成 markdown 的 git 仓库并主动提醒主模型；长期任务保留“检查过什么”的记录，重启会话能接着跑。computer use 被标为 experimental。

**4. 主动推进**：README 提到的持续执行机制是——独立工具调用合并成一个小程序一起跑（“二十次读取是一趟往返”）；等待 build 或 deploy 是“订阅”而不是轮询；长期工作留下已检查记录，会话重启后从断点继续；配置、skills、提示词热重载。材料里**没有**给出按时间/事件/状态触发的调度配置（如 cron、webhook），所以这一条只能作为“会话内持续推进”的线索，不能当作可照做的自动化方案。

**5. 效果验证**：README 自述的验证方式是内建的——“先证明每一步再前进”、“在真实界面上检查结果”、“完成前逐个检查”。这属于自我验证流程，不是可对外的指标；材料里没有任何基准、对照实验或量化结果，只有用户好评（例如“它让我取消了 Cursor 订阅”、“Claude Code 干 7 天的活它 1 小时干完”）。要在手册里用，必须自己补外部验收指标（见下一节）。

## 与已有做法的关系

- **Claude Code（清单中：adopt）**：OmO 是同类定位的编码智能体，README 直接把自己放在对标位置上（用户评价里拿 Claude Code 做对比），并且 `/login` 支持 Claude 订阅。可用来做“同类工具横向对照”的候选，但它的优势目前只有主张和好评。
- **OpenCode（清单中：watch）**：有明确关系。README 专门写了从 OpenCode 版迁移的路径：跑一次 `omo setup` 带走 provider keys、自定义 provider、MCP servers、skills 和模型选择，并用 `omo doctor` 检查旧安装残留，文档指向 `docs/guide/migrating-from-opencode.md`。也就是说 OmO 把自己当作 OpenCode 路线的升级去向。
- **Herdr（清单中：try）**：README 顶部的示例截图指向 `omo-herdr-dag`，用于在 Herdr 侧栏实时查看 OmO 的工作流 DAG。两者是搭配关系：OmO 产出 agent 图，Herdr 侧栏观察图。
- **Cursor（清单中：watch）**：只有一条用户评价提到因 OmO 取消了 Cursor 订阅，不构成实质做法上的关系。
- 另外 README 自述 Ultragoal 与 UltraQA 的想法来自 [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex)，是为 OmO 重新实现的——清单中没有该条目，可作为后续线索。

## 证据与局限

**原文给出的可核对内容**：

- 安装方式与细节：脚本、Windows PowerShell 版本、渠道参数（`-s -- beta` / `-s -- 5.1.1`）、二进制落在 `~/.local/bin`、校验和校验、镜像不可达时回落 GitHub Releases；包名 `omo-ai`（并提醒 npm 上无关的 `omo` 是别人的）。
- 迁移与运维命令：`omo setup`、`omo doctor`、`omo update`、卸载命令。
- 配置位置与优先级：`~/.omo/omo.jsonc` 与项目级 `.omo/omo.jsonc`，就近优先。
- 关键字：`ultrawork` / `ulw` / `mass ulw`。
- 抓取指标：stars ≈ 69701；许可证徽章 SUL-1.0；提及 5.0 与版本号 5.1.1。

**只是作者主张、没有证据的部分**：

- “研究一万个来源”“一小时干完 Claude Code 七天/人类三个月的活”“写出的代码和老手写的一样”等，全部来自 README 自述或用户好评，无可核对的基准、数据集或对照实验。
- Kibitzer 记忆、tool call 合并、参数修复、等待 build/deploy 不轮询、断点续跑、热重载等机制，只有一句描述，没有配置样例或行为说明；`mass ulw` 的图如何定义、如何限制并行度、如何统计花费，材料里完全没有。
- 引用的文档（configuration.md、features.md、manifesto.md、computer-use.md、migrating-from-opencode.md）本次都没有随材料给出，所以“照做”只能到安装与关键字这一层。

**适用条件与风险**：

- 安装脚本是 `curl | bash` 形式，需要信任 get.omo.dev 与发布产物；建议只在可弃用环境/容器中试，不要直接装在生产或含敏感凭据的机器上。
- README 自述为“个人 side project”，且由 AI 助手维护；成熟度与长期维护需自行判断。
- 许可证徽章为 SUL-1.0，在商业或团队环境中使用前需要先读许可证原文。
- 它需要大量 token（“spends tokens when they buy real speed”），成本可控性未知；`omo doctor` 能看 provider 任务类别，可作为控制成本的起点。
- 面向的场景是编码与代码库相关任务；对非编码工作的适用性，材料里只有“做 deck”“做研究”这类一句话主张。

## 怎么试、怎么验证

**最小试用（半天内可完成）**

1. 在一台可弃用的机器或容器里，按上面第 1 步安装，跑 `omo` 确认能起来，必要时 `/login` 接入一家已有订阅。
2. 选一个你手上有明确验收标准的小任务（例如：给一个 200–500 行的仓库修一个已知 bug 并让测试通过，或写一个小功能的 PR）。
3. 同一任务跑三轮对照：
   - A 轮：普通 prompt（不加关键字）；
   - B 轮：prompt 加 `ulw`；
   - C 轮：prompt 加 `mass ulw`。
   每轮都从同一个干净分支/干净工作区开始，记录同一组指标。
4. 跑之前先固定“完成”的定义，交给一个不依赖智能体自述的判定器：仓库原有的测试/CI、lint、类型检查，或一条你手写的验收脚本。**不要**采纳智能体自己的“已完成”声明——README 说它会自证，但自证不是证据。
5. 观察 Kibitzer 记忆是否真的起作用：第二轮换一个相关但不同的任务，看它是否主动提起上一轮的错误或既有约定。检查记忆仓库里的 markdown 文件，确认记录内容是否准确、是否含有不该外传的信息。
6. 若想试多 agent 图，从 C 轮开始，并留意可视化那一侧需要另装 [omo-herdr-dag](https://github.com/jc01rho/omo-herdr-dag)（材料里只给了链接，没有安装步骤）。

**判断有没有改善的指标**

- 一次通过率：交付物在**不修改**的情况下通过既有测试/CI/lint 的比例。
- 人工介入次数：你需要手动接管、纠正或重写提示的次数（README 作者自己把“人接手”定义为系统失败，正好可以拿这条当指标）。
- 返工轮数：达到可合并/可交付状态所需的迭代次数。
- 成本与耗时：token 花费、挂钟时间，按 A/B/C 三轮分别记录，用来验证“贵模型只用在刀刃上”是否成立。
- 记忆有效性：跨会话是否需要重复解释同一件事的次数；Kibitzer 提醒中“有效提醒 / 噪音”的比例。
- 安全与合规：过程中是否试图访问试验目录以外的文件、是否把凭据写进记忆仓库。

**淘汰条件**：如果 C 轮（`mass ulw`）在通过率上不优于 A 轮，或人工介入次数没有下降，就只保留 `omo` + `ulw` 这一层用法，把多 agent 图编排降级为观察项；如果连安装与基本运行都出现凭据或权限风险，直接放弃。
