# leter/zh-tech-writing

- 结论：**建议采用**。直接装上这个 Agent Skill，把中文技术文档的写作与审稿交给它执行，因为 README 给出了可复制的安装命令、调用提示词和一套五步写作流程；配套的 autocorrect 负责中英文空格与全角标点，属于无需模型的确定性修正。
- 原文：https://github.com/leter/zh-tech-writing
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T22:27:08.960Z

## 是什么

`leter/zh-tech-writing` 是一个专门写中文技术文档的 Agent Skill，用于 README、设计文档、接口说明和教程。它把两样东西封装成可加载的 skill：

1. 阮一峰《中文技术文档的写作规范》整理出的句子、语气、结构、排版规则；
2. 项目新增的「AI 腔清单」（共 14 条）和「用事实代替形容词」的写作流程。

适用 Claude Code，以及其他支持 Agent Skills 的工具。目标产出是「读起来像工程师写的、没有 AI 腔」的文档。目录结构：

```
skills/zh-tech-writing/
├── SKILL.md                     主文件：流程、核心规则、AI 腔清单
└── references/
    ├── typography.md            数字、标点、英文缩写的细则
    └── manual-structure.md      产品手册的目录结构和文件命名
```

`references/` 按需加载，例如文档里出现数字范围时才读 `typography.md`。

## 具体做法

**前提**：使用 Claude Code 或支持 Agent Skills 的工具；方式一需要可用的 `npx`，方式二需要 `git`。

**第 1 步：安装 skill（二选一）**

用 skills 命令行工具装到全局：

```bash
npx skills add leter/zh-tech-writing -g
```

手动安装：把 `skills/zh-tech-writing` 复制到 `~/.claude/skills/` 下。

```bash
git clone https://github.com/leter/zh-tech-writing.git
cp -r zh-tech-writing/skills/zh-tech-writing ~/.claude/skills/
```

**第 2 步：安装 autocorrect（推荐，非必需）**

它是独立命令行工具，负责在中英文之间补空格、把中文句子里的半角标点改成全角。装了，AI 写完文档后会按 skill 要求跑一遍；没装就跳过这一步。

```bash
# macOS
brew install autocorrect

# Linux：从 Releases 页面下载二进制文件，放到 PATH 里的任意目录
# https://github.com/huacnlee/autocorrect/releases

# 已经装了 Rust 工具链
cargo install autocorrect
```

验证安装：

```bash
autocorrect -V
```

能看到版本号即成功。

**第 3 步：让它写或改文档**

写 / 改中文技术文档时 skill 通常自动加载：

```
帮我给这个项目写一份 README
把 docs/deploy.md 改得更易读一些
```

也可手动调用：

```
/zh-tech-writing 改一下 docs/api.md
```

只要修改意见、不改文件时明确说出来：

```
/zh-tech-writing 检查 docs/api.md，只列问题，不要改
```

此时它会按「原句 → 改后 → 原因」的格式列问题。

**第 4 步：对照它内置的五步写作流程验收**（也可自己按这套流程做人工检查）

1. 先确定读者是谁，读完要能做成什么事。
2. 按规则写：句子、语气、段落与结构、排版。
3. 用「AI 腔清单」逐条检查全文，命中的地方全部改掉。
4. 运行 `autocorrect --fix`，修正空格和标点。
5. 手动检查 autocorrect 不管的引号、省略号和破折号。

**第 5 步：写 / 审稿时对照核心规则**

- 句子：逗号隔开的每一截尽量在 20 字以内；多用肯定句和主动语态；直接用动词，不套「进行」「做出」。
- 语气：像给同事讲清楚一件事；用数字、命令和报错原文代替形容词。
- 结构：每段第一句说重点；标题不跳级；少用四级标题；加粗和列表都不滥用。
- AI 腔清单（14 条）：包括开场和结尾套话、「不是 A，而是 B」句式、硬凑三个排比、宣传腔形容词、黑话、破折号和翻译腔。
- 关键约束：事实必须来自你的项目。skill 找不到事实时，会删掉空话，或者直接问你。这意味着要让它读到代码、配置和真实报错。

**第 6 步：按需读取 references**

涉及数字与标点细则时读 `typography.md`；写产品手册、要定目录结构和文件命名时读 `manual-structure.md`。

## 对应的研究问题

**1. 能力发现**：除了「写文档」，这里还暴露了两类可以交给 AI 的工作——一是审稿并输出「原句 → 改后 → 原因」的结构化评审意见（只用列出、不动文件）；二是识别并清除固定的文风毛病（14 条 AI 腔清单）。另外，纯格式修正（中英文空格、半角标点）完全可以交给 autocorrect 这个非模型工具，不必让模型做。

**2. 任务匹配**：写作与改写交给支持 Agent Skills 的编码代理（原文点名 Claude Code）；格式化交给 autocorrect CLI；规则细节不塞进主提示词，而是放在 `references/` 里按需加载，只在相关场景（如出现数字范围）才读取。

**3. 条件供给**：需要装好 skill 文件（SKILL.md + references）；需要 autocorrect 可执行文件，没有则第 4 步跳过；最关键的供给是「项目事实」——README 明确说事实要来自项目，找不到事实时它会删空话或反问，所以用之前要让它能读到代码、配置和报错原文。

**4. 主动推进**：原文只提到「写或修改中文技术文档时，skill 通常会自动加载」，即按任务类型自动触发。没有给出由时间、事件或状态触发并持续运行的机制，这部分无可依据内容。

**5. 效果验证**：原文给出一组前后对比，并把改动归为三类可检查的验收点——删掉开场套话和感叹号；去掉「不仅……更……」句式和破折号；用具体事实替换「强大」「无缝」这类形容词。这三条可以直接当人工验收清单，但原文没有给量化指标。

## 与已有做法的关系

清单中有 **Claude Code**（tool，adopt）和 **Agent skills**（concept，adopt）。这个仓库是「Agent skills」在中文技术写作上的一个具体实例，直接挂在 Claude Code 的 `~/.claude/skills/` 下即可用；它的组织方式（主 SKILL.md 放流程与规则、细粒度规范拆到 references 按需读、外部确定性工具交给 CLI）可以作为清单里 Agent skills 条目的落地样例。除此之外清单中没有其他相关条目。

## 证据与局限

**原文给出的内容**
- 可复制的安装命令（npx skills / git clone + cp）、autocorrect 的三种安装方式与 `autocorrect -V` 验证方式。
- 三个可直接使用的调用提示词示例，以及「只列问题、不改」的审稿模式。
- 五步写作流程、四类核心规则要点、14 条 AI 腔清单的类别说明。
- 一组前后对比文本，展示改动方式。
- 规则来源：阮一峰《中文技术文档的写作规范》（public domain），并参考华为《产品手册中文写作规范》、LeanCloud《文档风格指南》、《中文文案排版指北》、Google Developer Documentation Style Guide、GB/T 15835-2011；autocorrect 为 MIT 许可。项目自身为 MIT。作者对原规范做了三处调整：破折号统一为 `——`、省略号统一为 `……`；数字与中文之间统一定为加空格以与 autocorrect 一致；把「不使用非正式语言」放宽为「可口语化但不用网络流行语」。

**只是作者主张、未经验证的部分**
- 「效果」一节是单个作者挑选的示例，属于主张，不是评测结果。
- 「skill 找不到事实时，会删掉空话，或者直接问你」是作者对行为的描述，输入材料中无法验证。
- 312 stars 只说明关注度，不说明文档质量提升幅度。

**适用条件与未知**
- 只针对中文技术文档（README、设计文档、接口说明、教程）；英文文档不适用。
- 依赖具体工具对 Agent Skills 的支持；不支持的工具上无法自动加载。
- 未安装 autocorrect 时第 4 步会被跳过，空格与标点需人工处理。
- 本次输入只有 README，`SKILL.md` 与两个 references 的完整内容未提供，14 条 AI 腔清单只给了类别、没有逐条文本；因此上面第 5 步的规则要点以 README 摘要为准，具体执行细节需打开仓库文件确认。

## 怎么试、怎么验证

**最小试用方式**

1. 挑一篇已有的中文文档（项目 README，或 `docs/api.md` 这类），先建分支或备份。
2. 先只审不改，观察它列出的问题是否成立：

```
/zh-tech-writing 检查 docs/api.md，只列问题，不要改
```

3. 再让它改一版，逐条 diff 审阅，重点看有没有「删了空话却没补事实」导致信息丢失——按 README 说法，缺事实时它应该反问，检查它是否真的问了。
4. 装上 autocorrect 后跑 `autocorrect --fix`，人工确认引号、省略号、破折号这些它不管的部分。

**判断有没有改善的指标**

- 它列出的问题里，你认可并采纳的比例（越高越好）。
- 修改后的事实密度：是否把「强大」「无缝」这类形容词换成了数字、命令或报错原文。
- 修改后是否仍有 AI 腔清单里的类别残留（开场结尾套话、「不是 A 而是 B」、硬凑三排比、破折号、翻译腔）。
- 读者侧验证：让没参与写作的同事只读成稿，看能否说出「读完能做成什么事」——这正是 skill 第 1 步设定的目标。
- 对照组：让同一个模型在不加载 skill 的情况下改同一篇文档，比较两版的事实密度和问题条数。

注意：原 README 只提到 `autocorrect --fix`，其他 autocorrect 子命令是否存在请自行查该工具文档后再用。
