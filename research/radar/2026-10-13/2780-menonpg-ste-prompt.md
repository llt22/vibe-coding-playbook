# menonpg/ste-prompt

- 结论：**值得一试**。先在 Claude Code 里装这个插件（或把 AGENTS.ste.md 追加进 AGENTS.md），拿一份真实的 runbook／操作步骤文档做改写对比，确认清晰度和误读率确有改善再推广到日常写作；理由是原文给出了可直接照抄的安装命令、文件路径和十条可执行规则，但只有作者主张、没有效果数据，且作者自己限定了不适用场景。
- 原文：https://github.com/menonpg/ste-prompt
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-12T20:12:22.012Z

## 是什么

STE-Prompt 是一套面向编码智能体（Claude Code、Codex 及其他读 AGENTS.md 约定的工具）的提示／插件供给，让 agent 用**简化技术英语（Simplified Technical English, ASD-STE100 风格）**写解释、runbook 和操作步骤。

它的核心主张：LLM 行文的歧义集中在两处——对冲式措辞（"this might potentially help"）和把三个主张塞进一句的复合句。STE 是规则化的文体，因此模型能真正遵循。

产出形态包含三部分：

- `/ste` 斜杠命令：按需改写一段文字；
- `simplified-technical-english` skill：agent 在你要求 STE／更清晰步骤时自动调用；
- 完整规则集与词典（`RULES.md`、`DICTIONARY.md`）作为参考。

作者明确划出适用边界：用于 procedures、runbooks、agent step logs、API how-tos；**不要**用于需要细微差别、风险讨论、研究综述的场合——那里"对冲"本身就是内容。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

### 路线 A：Claude Code 插件（作者推荐）

前提：使用 Claude Code，且其支持 plugin marketplace。

1. 从 GitHub 直接安装：

```
/plugin marketplace add menonpg/ste-prompt
/plugin install ste-prompt@menonlab
```

2. 安装后你会得到：`/ste` 斜杠命令、会自动触发的 `simplified-technical-english` skill、以及完整规则集与词典。

3. 使用：

```
/ste            rewrite the previous answer in Simplified Technical English
/ste <text>     rewrite the given text in STE
```

### 路线 B：Claude Code 手动安装（不用插件）

前提：已把仓库文件下载到本地。

1. 把 `claude/commands/ste.md` 复制到 `.claude/commands/`（项目级）或 `~/.claude/commands/`（全局），得到 `/ste` 命令。
2. 若要变成持续生效的写作风格：把 `claude/output-styles/ste.md` 复制到 `.claude/output-styles/`，然后用 `/output-style` 选中它。

### 路线 C：Codex / 其他 agent —— 方案 1，写进 AGENTS.md（推荐）

前提：仓库中的 `AGENTS.ste.md` 已存在；Codex 会自动读取仓库根目录的 `AGENTS.md`（以及全局的 `~/.codex/AGENTS.md`）。

1. 按项目生效：

```bash
# per-project
cat AGENTS.ste.md >> AGENTS.md
```

2. 或对所有 Codex 会话全局生效：

```bash
# or global, for every Codex session
mkdir -p ~/.codex && cat AGENTS.ste.md >> ~/.codex/AGENTS.md
```

3. 之后 agent 默认用简化技术英语写解释、runbook 和步骤；该行为随仓库走。

4. 同一份 `AGENTS.md` 追加方式适用于任何读取 `AGENTS.md` 约定的 agent：Cursor、Cline、Aider、Windsurf、OpenClaw 等。

### 路线 D：Codex / 其他 agent —— 方案 2，按需提示词

前提：无需安装。

1. 把 `AGENTS.ste.md`（或 `RULES.md`）粘贴进任意 Codex / ChatGPT / Gemini / Cursor 对话。
2. 加上指令：*"rewrite the above in Simplified Technical English using these rules."*

### 规则集（原文给出的精简版，共 10 条，直接照用）

1. 程序性句子控制在 **20 词以内**；描述性句子 **25 词以内**。
2. **一句一个指令。**
3. 使用**主动语态**。
4. 程序性内容用**现在时**。
5. 指令以**命令动词**开头（"Remove the bolt."）。
6. 使用**冠词**（"the file"，不是 "file"）。
7. 不要把**名词当动词**用。
8. 只用**批准词**——一词一义（见 `DICTIONARY.md`）。
9. **一段一个主题**，首句为主题句。
10. 超过三个条件或步骤时，用**纵向列表**。

完整规则见 `RULES.md`，批准动词替换见 `DICTIONARY.md`（原文未展开这两份文件的内容）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：AI 已经能做哪些还没想到交给它的工作**
把"把技术文本改写成受控语言"这件事交给 agent。原文点名的可交给它的活儿：解释（explanations）、runbook、agent 步骤日志（agent step logs）、API how-tos 的改写。这是多数人不会主动派给 AI 的一类"文体合规"工作。

**2. 任务匹配：什么工作适合怎样的模型、工具和协作方式**
- 适合：程序类文本（procedures、runbooks、agent step logs、API how-tos）。
- 不适合（作者明说）：需要细微差别、风险讨论、研究综述的场景。
- 工具匹配：Claude Code 走插件／命令／skill／output-style；Codex 及 Cursor、Cline、Aider、Windsurf、OpenClaw 等走 AGENTS.md 约定；任意聊天工具走粘贴提示词。
- 协作方式上原文还提到互补工具 agent-ste：STE-Prompt 负责"引导模型写成 STE"，agent-ste 负责"在写入前强制校验"（linter 会阻断写入并逐条报错，如 `Use "use", not "leverages"`、`Do not use a semicolon`、`This sentence has 30 words`），两者配对使用。

**3. 条件供给：需要提供哪些信息、工具、权限和反馈**
- 需要提供的信息：STE 规则集与批准词词典（`RULES.md`、`DICTIONARY.md`）；或直接提供 `AGENTS.ste.md` 内容。
- 需要的工具/权限：Claude Code 的插件安装能力；手动路线需写入 `.claude/commands/`、`.claude/output-styles/`、`AGENTS.md` 或 `~/.codex/AGENTS.md` 的文件写入权限。
- 反馈：原文只给了 `/ste` 手动改写这一即时校正回路，未描述自动化的质量反馈机制。

**4. 主动推进：哪些工作可由时间、事件或状态触发并持续完成**
AGENTS.md 方式让 STE 行为随仓库存在、默认生效，属于"状态／上下文触发"而非每次手动要求。原文未描述由时间或事件触发的持续任务。

**5. 效果验证：怎样判断确实改善了结果**
原文没有给出任何指标、评测或对比数据。仅有"可快速扫描、少误读"（scan fast and misread rarely）这一主张，以及第 1、7、8 条这类可机械检验的规则，可作为自建验证的依据。

## 与已有做法的关系（对照给出的清单条目）

- **Claude Code（adopt）**：直接相关。STE-Prompt 本身就是 Claude Code 的插件+单插件 marketplace，安装、`/ste` 命令、output-style 都在 Claude Code 内完成。
- **Cursor（watch）、Cline（watch）、OpenClaw（watch）**：原文明确说同一份 `AGENTS.md` 追加方式适用于这些读取 `AGENTS.md` 约定的 agent，属于间接适用，且原文未给出这些工具上的验证。
- 原文额外提到的 **agent-ste**（ctotheameron 的作品）不在给定清单中，作为互补的强制型 linter 出现。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**属于可照做的内容**（证据强度较高，因为就是仓库自身的安装说明）：
- 插件 marketplace 安装命令、`/ste` 用法；
- 各文件的落位路径：`claude/commands/ste.md`、`claude/output-styles/ste.md`、`AGENTS.ste.md`、`RULES.md`、`DICTIONARY.md`；
- Codex 的 `cat AGENTS.ste.md >> AGENTS.md` 与全局 `~/.codex/AGENTS.md` 写法；
- 十条精简规则。

**只是作者主张**：
- "STE 是规则化文体，模型能真正遵循"；
- STE 能机械地消除对冲措辞和复合句歧义；
- 结果是"可快速扫描、少误读"。
以上均无数据、案例或对照实验支撑。

**客观事实**：仓库 33 stars，MIT 许可。

**重要局限**：
- 项目自称**不复制** ASD-STE100 规范文本，只提供受该标准公开描述启发的原创指引，因此产出的"STE"未必等同于正式标准的合规文本。ASD-STE100 是 ASD 的商标。
- 作者已限定不适用于细微差别、风险讨论、研究综述——在这些场景强行套用会丢失信息。
- 本次只有仓库 README 可依据（source_note：依据仓库 README），`RULES.md`、`DICTIONARY.md` 的实际内容未提供，无法判断规则完整度与词典质量，也无法确认"批准词"是否覆盖常用技术动词。
- 除 stars 外无任何效果数据，因此不适合直接定为 adopt，宜先小范围试。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用（半天内可完成）**

1. 选一份真实的技术文档做样本：一份团队实际在用的运行手册或 API how-to，保留原始版本作为对照。
2. 在 Claude Code 里按路线 A 安装（或按路线 C 把 `AGENTS.ste.md` 追加进该仓库的 `AGENTS.md`）。
3. 让它重写该文档，或对已生成的解释执行 `/ste`。
4. 把改写稿与原文并排保存，供后续 A/B 对照。

**客观指标（可直接从文本计数，规则本身可机械检查）**

- 程序性句子是否 ≤20 词、描述性句子是否 ≤25 词；
- 每句是否只有一个指令；
- 主动语态句占比、被动句数量；
- 每段是否只有一个主题；
- 指令是否以命令动词开头；
- 是否出现非批准词、名词当动词、缺失冠词（对照 `DICTIONARY.md`）；
- 条件/步骤超过三条时是否已改为纵向列表。

**人评指标**

- 让没参与改写的同事按改写后的 runbook 实际执行，记录提问次数、误读次数、完成时间，与原文版本对比；
- 让同一个人分别读原文与改写稿，记录"需要回读的句子数"。

**可选加强验证**

按原文建议配一个写入前强制的 linter（如 agent-ste），把上述硬故障（超长句、分号、非批准词）变成客观报错计数，避免只靠人工判断。

**注意**：验证必须在原文允许的场景内做（程序类文本），不要拿风险讨论或研究综述当试验素材，否则"变清晰"与"丢信息"会混在一起无法判断。
