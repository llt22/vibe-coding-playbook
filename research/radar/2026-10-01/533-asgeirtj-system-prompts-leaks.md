# asgeirtj/system_prompts_leaks

- 结论：**值得研读**。把这份仓库当成“生产环境 system prompt 的对照样本库”：先定位与你正在用的工具同名的那份文件，逐段对照改写自己的角色设定、约束与工具说明，而不是直接照抄；本次抓取到的原文只有索引目录、没有任何一份提示词的正文，因此提炼不出可直接执行的步骤，只能作为深挖入口。
- 原文：https://github.com/asgeirtj/system_prompts_leaks
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T11:26:10.839Z

## 是什么

这是一个 GitHub 仓库（asgeirtj/system_prompts_leaks，抓取时 68689 stars），自述收录“世界上最流行的聊天机器人背后的完整逐字 system prompt”，按厂商分目录组织：

- Anthropic（Claude.ai 各版本、Claude Code 各形态、Claude Projects / Design / Cowork / Science、Microsoft 365 集成、Chrome 扩展、iOS）
- OpenAI（ChatGPT 各版本、Codex、API 注入提示词、记忆/人格/语音模式、旧模型与废弃工具）
- Google（Gemini 各版本、Antigravity CLI、Gemini CLI、NotebookLM、Jules、AI Studio Build、Workspace）
- xAI Grok、Perplexity、Microsoft Copilot、Cursor、Meta AI / Muse Code、Mistral、Kimi、DeepSeek、GLM、OpenCode、Pi、Notion AI、Qwen，以及一个 Misc 目录（Amp Code、Warp、Zed、Docker Gordon、ElevenLabs 等）

README 顶部有一张“Most recent additions/changes”表，列出条目、日期和文件路径（最新到 2026-09-30 的 Claude Code on the web）。仓库还标注了 `PRs Welcome`，并自述被 The Washington Post（2026-05-11）和 CEPS' AI World（2026-07-10）用作报道和看板的数据来源。

**关键限制：本次抓取到的原文只有这份 README 索引，全部内容都是指向具体 .md 文件的链接，没有任何一份 system prompt 的正文。** 因此本报告只能评估“这份索引值不值得顺着挖”，无法评估提示词内容本身。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提说明：README 本身不含任何命令或可复制配置，下面步骤是“如何使用这份索引”的操作流程，命令为通用 git 操作，非原文内容。

1. **取回仓库**（需要 git 和网络访问）：
   ```bash
   git clone https://github.com/asgeirtj/system_prompts_leaks
   cd system_prompts_leaks
   ```
   也可以直接在 GitHub 网页上点开对应 .md 文件阅读。

2. **先按你正在用的工具定位，不要按厂商乱翻。** README 表格里可直接读到的路径映射：
   - 用 Claude Code：`Anthropic/claude-code/claude-code-opus-5.5.md`、`claude-code-fable-5.1.md`、`claude-code-desktop-fable-5.1.md`、`claude-code-cloud-fable-5.1.md`、`claude-code-headless-fable-5.1.md`，以及 `agents/`（subagents）、`skills/`、`commands/`（slash 命令）、`prompts/advisor-tool.md`
   - 用 Codex：`OpenAI/Codex/gpt-6.1-sol.md`、`gpt-6-astra.md`、`gpt-5.6.md`、`gpt-5.5.md`、`codex-full.md`、`plan_mode.md`、`codex-auto-review.md`、`computer-use.md`、`control-chrome.md`、`control-in-app-browser.md`
   - 用 Cursor / OpenCode / Copilot / Gemini CLI：`Cursor/cursor.md`、`OpenCode/opencode.md`、`Microsoft/github-copilot.md` 与 `Microsoft/vscode-copilot-agent.md`、`Google/gemini-cli.md`
   - 做通用助手：`Anthropic/claude-sonnet-5.5.md`、`OpenAI/gpt-5.5-thinking.md`、`Google/gemini-3.8-flash.md` 等

3. **用“最近更新表”筛时效性。** 表里每行都带日期和链接，优先读接近当前日期的条目，避免把已废弃版本的写法当成现状（README 另设了 `Old/` 和折叠区专放旧模型、旧工具、旧策略）。

4. **做同类对照，而不是单点阅读。** README 的结构本身提供了几组天然对照组：
   - 同一模型的有工具 / 无工具版本：`claude-opus-4.6.md` vs `claude-opus-4.6-no-tools.md`、`claude-sonnet-4.6.md` vs `claude-sonnet-4.6-no-tools.md`
   - 同一模型不同人格：`OpenAI/Codex/personality_friendly.md` vs `personality_pragmatic.md`
   - 同一模型不同运行形态：Claude Code 的 web / desktop / headless 三份
   - 不同模式：`plan_mode.md`、`codex-auto-review.md`
   读这几组时，重点看“差异段落写了什么、删了什么”，这是索引结构能直接支撑的做法。

5. **把对照结论落到自己的配置里**（这一步依赖你打开文件后的实际内容，本次原文未提供，无法给出具体提示词）。初筛理由建议的迁移方向是“角色设定、约束、编码智能体工具说明”，但这属于待验证假设，需打开文件确认是否真有可迁移结构。

6. **发现与官方实际不一致或拿到新版本时，按 README 说明提 PR**（仓库标注 `PRs Welcome`，并提供维护者 X 账号和邮箱）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现（弱相关，但有线索）**：从 README 的文件名与目录名可以直接读出“厂商已经把哪些工作交给 AI”，例如 Codex 的 `computer-use.md`（计算机操作）、`control-chrome.md` / `control-in-app-browser.md`（浏览器控制）、`plan_mode.md`（先规划）、`codex-auto-review.md`（自动复审），Claude Code 的 `agents/`（子智能体）、`skills/`、`prompts/advisor-tool.md`（顾问工具）。这些是可核查的条目名，不是内容推断，可作为“还有哪些工作可以交出去”的搜索清单。

- **任务匹配（有间接依据）**：同一模型存在多份不同形态的提示词（Claude Code 的 web / desktop / headless / cloud 四份，Codex 的多种 persona 与模式文件），说明厂商自己就认为同一模型在不同任务形态下需要不同的指令配置。具体差异内容需打开文件才能判断。

- **条件供给（最相关）**：system prompt 的本质就是“给模型提供哪些信息、工具、权限和约束”的文本。这份仓库如果内容可信，等于提供了一批生产环境真实的供给样例，覆盖工具说明、权限边界、身份设定等。但本次原文没有任何一份正文，无法进一步提炼。

- **主动推进（有线索，证据不足）**：`plan_mode.md`、`codex-auto-review.md`、`Anthropic/claude-cowork/claude-cowork-dispatch.md` 这些条目名暗示存在计划—执行—复审、任务派发这类流程化 / 触发式设计，但原文未给出任何内容，只能作为待查方向。

- **效果验证（无依据）**：仓库里没有任何评测数据、对比实验或改善指标。唯一相关的是 README 自述被 Washington Post 和 CEPS' AI World 用作分析素材，这属于“被引用”，不是“被验证有效”。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中的条目在这份 README 里几乎都有对应文件，可作为它们的“配置对照素材”：

- **Claude Code（adopt）**：对应条目最多，`Anthropic/claude-code/` 下含各模型版本、web/desktop/headless/cloud 形态、`agents/`、`skills/`、`commands/`、`prompts/advisor-tool.md`。清单中已 adopt，这份仓库可作为复核其默认设定的参考。
- **Atlas（watch）**：`OpenAI/chatgpt-atlas.md`。
- **Cursor（watch）**：`Cursor/cursor.md`。
- **DeepSeek（try）**：`DeepSeek/deepseek-chat.md`（chat.deepseek.com）。
- **GitHub Copilot（drop）**：仓库中仍有 `Microsoft/github-copilot.md`、`Microsoft/vscode-copilot-agent.md`、`Microsoft/copilot-cli.md`；清单已 drop，此处仅作记录。
- **Hermes（watch）**：`Misc/hermes.md`。
- **OpenCode（watch）**：`OpenCode/opencode.md` 和 `Misc/opencode.md`（May 2026 capture），说明同一工具有不同时间的抓取版本，可做版本对照。
- **Trendshift（watch，来源类）**：README 底部嵌入了 Trendshift 的仓库徽章（repositories/14577）。

此外，仓库中还有清单未收录但可能相关的条目：GLM（`GLM/README.md`，标注“GLM serves no system prompt — verified & documented”，是一个“确实没有 system prompt”的反向证据）、Amp Code、Warp、Zed、Docker Gordon、Windsurf 之外的 t3 Code、CommandCode CLI、Devin CLI 等。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**可核查的事实**：仓库存在、按厂商分目录、有具体文件路径和更新日期（README 表格明确列出，最新到 2026-09-30）；有 68689 stars（抓取时指标）；有“Most recent additions/changes”维护记录，说明仍在更新；README 明确写了 `PRs Welcome` 并给出联系方式。

**属于作者主张、未经独立验证**：
- “The full verbatim system prompts behind the most popular chatbots in the world. Carefully curated and complete.” —— “逐字”“完整”“精心整理”都是自述，本次材料无法验证。
- 被 The Washington Post 和 CEPS' AI World 引用 —— 来自 README 自述，本次未核实原文。
- 所列模型名称（如 GPT-6.1-Sol、Claude Fable 5.1、Grok 4.7、Gemini 3.8 Flash）无法通过本次材料独立核实。

**最关键的局限**：本次抓取的原文**只包含 README 索引，没有任何一份提示词正文**。因此无法从材料中提炼出任何可照抄的提示词、配置或步骤，也无法判断内容质量、是否与官方实际一致、是否存在法律或合规问题。

**适用条件**：即便内容可信，这些也是面向特定产品（含厂商私有工具契约、安全策略、UI 交互）写的系统提示词，直接照搬到自己的场景通常不成立。合理用法是当作“结构与约束写法的参考”，迁移的是思路而非原文。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式**（半天以内）：
1. 只挑一个你日常在用的工具（例如 Claude Code 或 Cursor），打开仓库中与它同名的对应文件。
2. 找一条你已经在用的自定义指令 / 项目规则（如 AGENTS.md、.cursorrules 之类），选定一个你每周都会重复做的固定任务作为基准任务。
3. 用第 2 步的基准任务，先跑 3 次“现有指令”，再跑 3 次“参照该文件结构调整过的指令”，其余条件（模型、任务输入、工具权限）保持不变。
4. 如果读到的是有工具 / 无工具对照版本，额外再跑一组，观察“把工具说明删掉”会让行为退化到哪里，从而判断自己的工具说明是否必要。

**判断有没有改善的指标**（仓库本身不提供任何指标，以下为自建）：
- 一次通过率：不加追问就能完成任务的比例
- 澄清轮次：完成任务前需要追加说明的平均轮数
- 约束违反次数：越权改文件、擅自安装依赖、跑到授权范围之外的操作
- 输出结构一致性：同类任务产出格式的稳定程度
- 回归项：原来能做对的任务有没有被新指令搞坏

**注意**：如果打开文件后发现内容与你的工具版本明显对不上（模型名、工具名、产品形态不符），应放弃照搬，只记录结构性观察，不要写入生产配置。
