# @AntonMartyniuk: Microsoft quietly published 99 ready-made .NET skills for AI Agents.

- 结论：**值得研读**。建议先把它作为“可复用技能包/插件分组”的案例研读，不直接写入手册操作流程；推文只给出插件清单和选择原则，缺少可复制的安装命令、skill 文件结构和完整配置，需拿到 dotnet/skills 仓库或原文后再考虑升级为 try。
- 原文：https://x.com/AntonMartyniuk/status/2120859198988632457
- 来源：ingest:x，初筛相关度 3，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T18:12:00.469Z

## 是什么

这条材料介绍微软在 `dotnet/skills` 仓库中发布的 .NET 智能体技能包：推文称为 14 个插件、99 个 skills，官方且开源，可在 Claude Code、Codex、GitHub Copilot、Cursor 中使用。作者把 skill 描述为“一个带指令的文件夹”，智能体只在任务需要时加载；插件是一组相关 skills，安装插件会一次获得该组 skills。

推文重点推荐 5 个插件，并给出安装顺序：

```text
dotnet-upgrade
dotnet-data
dotnet-aspnet
dotnet-test
dotnet-ai
```

其中 `dotnet-data` 里的 `optimizing-ef-core-queries` 用于发现 N+1 查询、选择 tracking mode、移除常见 EF Core 性能陷阱；`dotnet-test` 被称为最大的插件，含 22 个测试相关 skills；`dotnet-ai` 面向用 C# SDK 构建、调试和测试 MCP servers。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

原文没有给出可直接执行的安装命令、配置文件或完整 skill 文件结构，以下只能整理推文中明确给出的原则性动作，不能当作完整安装手册。

1. 前提：你使用 Claude Code、Codex、GitHub Copilot 或 Cursor 之一，并且做 .NET 开发。推文声称这些 skills 可在这四类工具中工作。
2. 按技术栈选择插件，不要安装全部 99 个。原文理由是每个 skill 都会把描述加入智能体上下文，装得越多上下文负担越大。优先从与当前任务匹配的插件开始，例如升级项目看 `dotnet-upgrade`，EF Core 性能看 `dotnet-data`，测试看 `dotnet-test`。
3. 安装插件而不是逐个挑 skill。原文说明插件是一组相关 skills，安装一个插件会一次获得该组全部 skills。具体安装方式原文未给出，需要查 `dotnet/skills` 仓库。
4. 在提示词中显式点名要用的 skill，不要让智能体自己猜。原文明确建议“Name the skill in your prompt instead of letting the agent guess which one to use”，但没有给出提示词模板。
5. 为项目自有规范另写 skills，与微软通用 skills 并用。前提：你愿意把项目约定写成 skill/instructions。原文指出微软 skills 不知道你的实体放在哪里、你是否不用 repositories、你的 handlers 是否返回 `Result<T>`，所以通用 .NET 任务交给微软 skills，内部约定交给自己的 skills。
6. 原文提到可用 Skill Creator 把自己的真实代码文件打包进 skill，但只给了这一句，未给出操作步骤。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- 能力发现：推文给出了可交给智能体的 .NET 任务样例，包括从 .NET 8 升级到 10 并开启 nullable reference types、优化 EF Core 查询、用 Minimal APIs 建 Web API 和文件上传端点、运行和筛选测试、构建调试测试 MCP servers。这些是“可能没想到交给 AI”的具体任务类型，但均为作者概述，未展示执行结果。
- 任务匹配：原文按插件和 skill 对任务分组，并声称兼容 Claude Code、Codex、GitHub Copilot、Cursor。它强调通用 .NET 技能与项目自有技能分工：微软 skills 处理通用任务，自建 skills 处理团队约定。还建议在提示词中点名 skill，以改善触发匹配。
- 条件供给：需要提供智能体可加载的 skill 文件夹/指令；需要选择与栈匹配的插件，避免全量安装造成上下文膨胀；需要把项目约定显式写成自有 skills，因为微软 skills 不知道实体位置、repository 使用习惯和 `Result<T>` 等内部约定。Skill Creator 可打包真实代码文件，但细节缺失。
- 主动推进：原文只说明 skill 会在任务需要时被加载，没有说明可由时间、事件或状态触发并持续完成工作。没有直接依据。
- 效果验证：原文没有给出数据、案例或验证指标，只主张“写一次步骤，智能体每次都照做”。这不能作为效果已被验证的依据。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- Claude Code：清单状态为 adopt。推文声称这些 skills 可在 Claude Code 中使用，与本项目已有的 Claude Code 做法直接相关，可把“外部技能包按需加载”作为扩展思路。
- Cursor：清单状态为 watch。推文声称兼容 Cursor，但未给出 Cursor 中的具体配置或验证案例。
- GitHub Copilot：清单状态为 drop。推文声称兼容 GitHub Copilot，但没有提供足够证据改变清单中的 drop 判断。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

- 原文给出的可核查信息主要是：仓库名 `dotnet/skills`、14 个插件、99 个 skills、5 个推荐插件及其用途、四类工具兼容性、两条安装前建议。
- 原文没有给出安装命令、skill 文件夹示例、完整描述写法、Skill Creator 操作步骤、实际项目前后对比、性能数据或测试通过率。文中提到的完整四步安装指南在外部文章链接里，但本次材料未包含文章正文。
- “这些 skills 知道 .NET，但不知道你的项目”“每个 skill 都会把描述加入上下文”“智能体每次都会照做”等属于作者主张，未附证据。
- 适用条件：主要是 .NET 开发者，且使用支持 skills 的智能体工具；是否真的兼容、安装成本、上下文开销和任务改善幅度，都需要以仓库文档和本地试用为准。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

在能访问 `dotnet/skills` 仓库并读到安装说明的前提下，做一个最小试用：只选一个与当前工作最匹配的插件，例如测试任务选 `dotnet-test`，升级任务选 `dotnet-upgrade`；不要一次装 99 个 skills。选一个真实但范围可控的任务，记录不用 skill 时的基线，再在提示词中显式点名对应 skill 执行同一类任务。另做一个项目自有 skill，只写一条团队约定，例如实体位置、是否使用 repository、handler 返回类型，观察通用 skill 与自有 skill 并用时是否减少返工。

判断指标建议：任务是否一次完成、人工修改次数、耗时、测试是否通过、是否引入新的编译/运行错误、智能体是否在不需要时加载了 skill、上下文或 token 消耗是否明显增加。由于原文没有给出官方指标，以上只作为试用验证方案，不能当作原文结论。
