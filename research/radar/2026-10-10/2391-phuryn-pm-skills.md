# phuryn/pm-skills

- 结论：**值得一试**。建议小范围试：按 README 给出的 CLI 命令装 1–2 个插件（如 pm-product-discovery），用 /discover 跑一个真实想法，检验产出是否是结构化流程而非泛泛文本；理由是安装步骤与命令示例可直接照抄，但原文只有宣传性主张、没有 skill 内容和任何效果数据，不足以直接采用。
- 原文：https://github.com/phuryn/pm-skills
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-10T07:05:04.662Z

## 是什么

phuryn/pm-skills（PM Skills Marketplace，MIT 许可，README 显示 26,862 stars）是一个面向产品经理的 AI 插件市场。按 README 的说法，它由 **9 个插件、69 个 skills、42 条链式命令（commands）** 组成，覆盖从发现、策略、执行、上市、增长到「交付 AI 写的代码」的全流程，主要面向 Claude Code 和 Claude Cowork，skills 兼容其它 AI 助手。

三层概念（README 定义）：

- **Skills**：市场的构建块。每个 skill 给 Claude 提供某个 PM 任务的领域知识、分析框架或引导式工作流；有些 skill 是可复用的底座，被多个命令共用。**相关时自动加载，不需要显式调用**；如需强制加载可用 `/plugin-name:skill-name` 或 `/skill-name`。
- **Commands**：用户用 `/command-name` 触发的端到端流程，内部串联一个或多个 skill。README 举例：`/discover` 串联 brainstorm-ideas → identify-assumptions → prioritize-assumptions → brainstorm-experiments。
- **Plugins**：把相关 skills 和 commands 打包成可安装单元，每个插件对应一个 PM 领域。装整个市场即一次拿到 9 个插件。命令之间设计成可以相互衔接，每条命令跑完会提示相关的下一条命令。

9 个插件与规模（README 明细合计 69 skills / 42 commands，与标题数字一致）：

| 插件 | 领域 | skills | commands |
|---|---|---|---|
| pm-product-discovery | 构思、实验、假设、OST、访谈 | 13 | 5 |
| pm-product-strategy | 愿景、商业模式、定价、竞争格局 | 12 | 5 |
| pm-execution | PRD、OKR、路线图、sprint、retro、发布说明、干系人 | 16 | 11 |
| pm-market-research | 画像、分群、旅程图、市场规模、竞品 | 7 | 3 |
| pm-data-analytics | SQL、同期群、A/B 测试 | 3 | 3 |
| pm-go-to-market | 滩头市场、ICP、信息、增长循环、战卡 | 6 | 3 |
| pm-marketing-growth | 营销点子、定位、价值主张、命名、北极星 | 5 | 2 |
| pm-toolkit | 简历、NDA、隐私政策、校对 | 4 | 5 |
| pm-ai-shipping | 给 AI 写的代码补文档、查文档与实现的偏差、测试覆盖、静态安全/性能审计 | 3（正文实际列 2 个） | 5 |

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：能访问 GitHub。走 Cowork 路线需要桌面端 Claude；走 Claude Code / Codex 路线需要先装好对应 CLI 并登录；其它助手路线只需文件系统访问权限。

**第 1 步：选入口。** 非开发者用 Cowork（README 推荐）；开发者用 Claude Code CLI；OpenAI 侧用 Codex CLI；Gemini CLI / OpenCode / Cursor / Kiro 只能拿 skills，没有 slash 命令。

**第 2 步（Cowork，推荐非开发者）：**

1. 打开左下角 **Customize**
2. 进入 **Browse plugins → Personal → +**
3. 选择 **Add marketplace from GitHub**
4. 输入：`phuryn/pm-skills`

9 个插件会自动全部安装，commands（`/discover`、`/strategy` 等）和 skills 都有。

**第 3 步（Claude Code CLI）：**

```bash
# Step 1: Add the marketplace
claude plugin marketplace add phuryn/pm-skills

# Step 2: Install individual plugins
claude plugin install pm-toolkit@pm-skills
claude plugin install pm-product-strategy@pm-skills
claude plugin install pm-product-discovery@pm-skills 
claude plugin install pm-market-research@pm-skills 
claude plugin install pm-data-analytics@pm-skills
claude plugin install pm-marketing-growth@pm-skills
claude plugin install pm-go-to-market@pm-skills
claude plugin install pm-execution@pm-skills
claude plugin install pm-ai-shipping@pm-skills
```

**第 4 步（Codex CLI）：** README 称 Codex 读同一份 plugin marketplace 文件，可直接原生安装，无需转换或拷贝文件。

```bash
# Step 1: Add the marketplace
codex plugin marketplace add phuryn/pm-skills

# Step 2: Install the plugins you want
codex plugin add pm-toolkit@pm-skills
codex plugin add pm-product-strategy@pm-skills
codex plugin add pm-product-discovery@pm-skills
codex plugin add pm-market-research@pm-skills
codex plugin add pm-data-analytics@pm-skills
codex plugin add pm-marketing-growth@pm-skills
codex plugin add pm-go-to-market@pm-skills
codex plugin add pm-execution@pm-skills
codex plugin add pm-ai-shipping@pm-skills
```

注意两点差异：① README 建议**装整个插件而不是挑单个 skill**，因为一个工作流通常依赖同一插件里一起发布的多个 skill；② 在 Codex 上 **`/slash` 命令装得上但跑不起来**（Codex 插件不暴露 commands），要跑工作流就用自然语言把步骤描述出来，例如：

> Run product discovery on *[your idea]*: brainstorm options, map assumptions, prioritize the risky ones, then design experiments — pause between each step.

如果想让 Codex 也拿到引导式工作流，README 给的临时办法是让 Codex 把命令文件改写成 skill：

> Read the command files in the pm-execution plugin and create equivalent Codex skills for the workflows I use most often.

README 明确说这是「尽力而为、模型驱动」的转换，部分 Claude 专有命令语法无法翻译。

**第 5 步（其它助手，仅 skills）：** 把 `skills/*/SKILL.md` 目录拷到对应位置，README 声称这些文件遵循通用 skill 格式。

```bash
# Example: copy all skills for OpenCode (project-level)
for plugin in pm-*/; do
  mkdir -p .opencode/skills/
  cp -r "$plugin/skills/"* .opencode/skills/ 2>/dev/null
done

# Example: copy all skills for Gemini CLI (global)
for plugin in pm-*/; do
  cp -r "$plugin/skills/"* ~/.gemini/skills/ 2>/dev/null
done
```

| 工具 | 用法 | 可用范围 |
|------|------|------|
| Gemini CLI | 拷 skill 目录到 `.gemini/skills/` | 仅 skills |
| OpenCode | 拷到 `.opencode/skills/` | 仅 skills |
| Cursor | 拷到 `.cursor/skills/` | 仅 skills |
| Kiro | 拷到 `.kiro/skills/` | 仅 skills |

**第 6 步：按 PM 工作流的入口选起始命令。** README 的 Start Here 对照表：

- 新想法 → `/discover`
- 需要策略清晰度 → `/strategy`
- 写 PRD → `/write-prd`
- 规划发布 → `/plan-launch`
- 定义指标 → `/north-star`

跑完任何命令后跟着它的提示走，进入下一条命令。

**第 7 步：需要压过模型通用知识时强制加载某个 skill。** 用 `/plugin-name:skill-name` 或 `/skill-name`（Claude 会自动补前缀）。

**第 8 步：可直接照抄的示例提示词（README 原文，用于快速验证安装是否生效）。**

- `/discover AI-powered meeting summarizer for remote teams`
- `/write-prd Smart notification system that reduces alert fatigue`
- `/write-query Show me monthly active users by country for Q4 2025 (BigQuery)`
- `/ship-check the payments service`
- `What are the riskiest assumptions for our AI writing assistant idea?`
- `/analyze-test Here are the results from our checkout flow A/B test [attach CSV]`

**第 9 步（Windows 上 Cowork 不稳定时的绕过方案，原文照抄）：**

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command `"if ((Get-Service CoworkVMService).Status -ne 'Running') { Start-Service CoworkVMService }`""

$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 1) -Once -At (Get-Date)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName "CoworkVMServiceMonitor" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -RunLevel Highest `
  -User "SYSTEM"
```

README 称这能解决 Windows 上 90% 的问题；剩下 10% 手动打开 services.msc 启动 "Claude" 服务。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现——AI 已经能做哪些还没想到交给它的工作**

这份 README 本身就是一个「可交给 AI 的 PM 工作清单」，且颗粒度到命令级，是它最大的价值。可直接搬运的类别：

- 发现：`/discover` 一次跑完构思 → 假设映射 → 优先级 → 实验设计；`/brainstorm` 做多视角构思（PM/设计师/工程师）；`/triage-requests` 批量分类排序功能请求；`/interview prep|summarize` 准备访谈脚本或把转录稿压成 JTBD + 满意度信号 + 行动项。
- 策略与商业：`/strategy` 出 9 段式产品策略画布；`/business-model lean|full|startup|value-prop|all`；`/value-proposition`；`/market-scan` 把 SWOT+PESTLE+波特五力+安索夫合起来做；`/pricing`。
- 执行：`/write-prd`、`/plan-okrs`、`/transform-roadmap`（把功能清单改写成结果导向路线图）、`/sprint plan|retro|release`、`/pre-mortem`、`/red-team-prd`（对抗式压测方案，按「最便宜的验证」排序风险假设）、`/meeting-notes`、`/stakeholder-map`、`/write-stories user|job|wwa`、`/test-scenarios`、`/generate-data`（造 CSV/JSON/SQL/Python 假数据）。
- 研究与分析：`/research-users`、`/competitive-analysis`、`/analyze-feedback`、`/write-query`（自然语言转 SQL，声明支持 BigQuery/PostgreSQL/MySQL）、`/analyze-cohorts`、`/analyze-test`（显著性、样本量校验、ship/extend/stop 建议）。
- 上市与增长：`/plan-launch`、`/growth-strategy`、`/battlecard`、`/market-product`、`/north-star`。
- 事务性：`/review-resume`、`/tailor-resume`、`/draft-nda`、`/privacy-policy`、`/proofread`。
- 最不常见、最值得单独关注的一类（pm-ai-shipping）：面向「AI 写了代码但没留意图记录」的场景——`/document-app` 把代码库反推成架构/用户与权限流/权限/变量与密钥/测试覆盖图等文档，`/derive-tests` 从「有文档的意图」推出测试覆盖图、区分已有测试/建议测试/未验证缺口，`/security-audit-static` 划信任边界并自我反驳每条发现、只保留有证据的风险，`/performance-audit-static` 找 N+1、请求瀑布、过度取数和缓存机会，`/ship-check` 把上述合成一份「可评审的交付包」。

**2. 任务匹配——什么工作适合怎样的模型、工具和协作方式**

README 给出了明确的分工信息：

- **Claude Code / Cowork**：skills + commands 全功能，命令链式衔接，一条命令跑完会推荐下一条，匹配 PM 工作流的顺序。
- **Codex CLI**：能装同一份 marketplace、能拿到全部 skills 并按名调用，但 **commands 不可作为 slash 命令运行**，需要「用自然语言描述步骤」或「让模型把命令文件改写成 skill」。README 还强调一个协作惯例：跑多步工作流时 **pause between each step**（每步之间暂停），而不是一口气跑完。
- **其它助手（Gemini CLI/OpenCode/Cursor/Kiro）**：只有 skills，没有命令编排。
- **选装策略**：装整包插件而非挑单个 skill，因为工作流依赖同包内多个 skill。
- 自动 vs 手动：skills 自动按上下文加载；commands 必须用户手动触发。

**3. 条件供给——需要提供哪些信息、工具、权限和反馈**

- 工具/权限：需要安装插件（Cowork 走 Customize，Claude Code/Codex 走 CLI）；Windows 上可能要给 CoworkVMService 起定时任务。
- 输入素材：从示例看，很多命令吃附件或粘贴内容——`[attach CSV]`、`[attach file]`（200 条 NPS）、`[attach PDF]`（简历）、访谈转录稿、竞品名、job description。
- 上下文供给：`/strategy B2B project management tool for agencies` 这类命令后面直接跟一段业务描述作为参数。
- 反馈回路：README 只说到「命令会建议下一步、跟着提示走」，以及可以强制加载 skill 来压过模型通用知识。**没有**说明权限范围、数据留存、评审流程等。
- 一个相邻的配套做法（README 提到但属于另一个仓库 phuryn/pm-brain）：把纯 markdown 文件放在本地文件夹当「第二大脑」，Claude 回答前先读、回答后写入、每周五清扫一遍，不用向量库、不上云。这是「给 AI 稳定上下文」的一种供给方式。

**4. 主动推进——哪些工作可由时间、事件或状态触发并持续完成**

这份材料在这条上依据很弱，需要如实说明：

- **唯一明确的时间触发**是 README 里那个 Windows 计划任务：每分钟检查一次，`CoworkVMService` 没跑就把它拉起来。这是运维性触发，不是业务工作流的自动推进。
- 另一个接近的例子是 **PM Brain 的「每周五清扫」**（原文：sweeps them every Friday），但那是配套仓库而非本仓库。
- 除此之外，本仓库的命令都是**用户手动触发**（`/command-name`）。README 没有提到任何由状态或事件自动触发的机制。

**5. 效果验证——怎样判断确实改善了结果**

README 对这一条只有主张、没有方法：它说「Generic AI gives you text. PM Skills Marketplace gives you structure.」「结果是更好的产品决策，而不只是更快的文档」，并称每个 skill 内嵌了 Torres / Cagan / Savoia 等人的成熟 PM 框架。**没有给出任何指标、基准、前后对比或客户案例**。可间接用于验证的只有产物本身的完整性（下面「怎么试」一节给出的是本报告的补充建议，不是原文内容）。

## 与已有做法的关系

清单中有相关条目：

- **Claude Code（adopt）**：本仓库就是 Claude Code 的插件市场，第 3 步的两条命令直接作用在它上面，属于对已有工具的**内容层扩充**，不改动 Claude Code 本身的用法。
- **Cursor（watch）**：README 明确说 Cursor 只能「拷 skill 文件夹到 `.cursor/skills/`，仅 skills 可用」，也就是拿不到命令编排这一层。可用来判断该条目成熟度：本仓库把 Cursor 归为「只读 skills」的降级用法。
- **OpenCode（watch）**：同上，README 给了 `.opencode/skills/` 的复制命令，同样是 skills only。

此外 README 还声明兼容 Gemini CLI 和 Kiro（清单中未列出），两者同样只支持 skills。

## 证据与局限

**原文给出的证据**：

- 仓库指标：26,862 stars；MIT 许可；有 Tests workflow 和 PRs Welcome 徽章；配套仓库 pm-brain、burnstop、claude-usage。
- 结构可核对：README 标题称 69 skills / 42 commands / 9 plugins，各插件明细逐项相加正好是 69 和 42，内部自洽。
- 安装与使用方式写到了可执行级别：Cowork 的四步点击路径、Claude Code 与 Codex 的完整 CLI 命令、四种工具的 skills 目录、`/discover` 等 42 条命令名、约二十条示例提示词、Windows 计划任务脚本。
- 框架来源可追溯：列出的作者为 Teresa Torres、Marty Cagan、Alberto Savoia、Dan Olsen、Roger L. Martin、Ash Maurya、Strategyzer、Christina Wodtke、Anthony Ulwick、Croll & Yoskovitz、Sean Ellis、Maja Voje。

**只是作者主张、没有依据的部分**：

- 「更好的产品决策，而不只是更快的文档」——无任何数据、对比或案例支撑。
- 「每个 skill 内嵌了一套被验证过的 PM 框架」——只有 skill 名称和一行描述，没有框架细节可核。
- Windows 脚本「解决 90% 的问题」——未说明测试范围。
- Codex 上的命令转 skill 是作者自认的 best-effort、模型驱动转换，可靠性未知。

**局限与适用条件**：

- 本次抓取**只有 README**，没有任何 `SKILL.md` 的正文。因此可以判断「装什么、怎么装、有哪些命令」，**无法判断每个 skill 的提示词写得多具体、输出质量如何**——这直接决定 verdict 只能给 try 而不能给 adopt。
- 命令编排是 Claude 专有；迁到 Codex 或其它助手会掉一层能力。
- 有一处内部不一致：pm-ai-shipping 小节标题写「3 skills」，正文只列出 2 个（`shipping-artifacts`、`intended-vs-implemented`），实际内容以正文为准。
- 适用对象偏 PM / 创始人 / 与产品决策相关的人；纯工程或非产品岗的可迁移部分主要是 pm-ai-shipping 与 pm-toolkit 两类。
- 部分 skill（NDA、隐私政策）产出涉及法律文本，README 未提示需要法务复核。

## 怎么试、怎么验证

**最小试用（1 台机器、半天内可完成）**

1. 只装**一个**插件，别一次装 9 个。建议 `pm-product-discovery`（命令最多、最独立）：

```bash
claude plugin marketplace add phuryn/pm-skills
claude plugin install pm-product-discovery@pm-skills
```

2. 拿一个**真实在手**的想法（不要用示例里的「AI 会议纪要器」），跑：

```
/discover <你的真实想法>
```

3. 同一个想法、同一个模型，另开一个会话用裸提示词跑一遍做对照，比如「帮我分析这个产品想法并设计验证实验」。

4. 再挑一条与你日常工作最贴近的命令做第二次验证，例如写文档类用 `/write-prd`，分析类用 `/analyze-feedback`（附一份真实反馈文件），代码相关用 `/ship-check <你的仓库>`。

5. 若在 Codex 上试：命令不可用，改用 README 给出的自然语言写法，并**逐步暂停**：

> Run product discovery on *[your idea]*: brainstorm options, map assumptions, prioritize the risky ones, then design experiments — pause between each step.

**判断有没有改善的观察点**（以下为本报告提出的建议，原文未给出任何指标）

- **结构 vs 文本**：输出是否明显带出分节框架（例如假设清单分了 Value/Usability/Viability/Feasibility 四类），而不是通用建议。这是 README 自称的核心差异点，直接对着它验。
- **可执行性**：产出的假设、实验、PRD 是否能直接进你的评审或排期，需要人工重写的比例有多少。
- **步骤完整性**：`/discover` 是否真的走完「构思→假设→排序→实验」四段并在每段之间停下来等你确认。
- **是否被自动调用**：在没打命令的情况下提一个 PM 问题时，相关 skill 有没有被自动加载（README 称会自动加载）。
- **省时口径**：同一产物与手工/裸提示词相比的实际耗时。

**停止条件（建议）**

- 如果输出与裸提示词没有结构差异，或每条命令都需要大幅返工，则不写入手册，降为 study。
- 如果在你的场景下命令不可用（只有 Codex 或 Cursor），只能拿到 skills 一层，价值明显缩水，同样降级处理。
