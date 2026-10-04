# 让编码智能体按“目标→边界→路径→单点→检查→迁移”带你学一个真实主题

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：把“系统学习并检验自己是否理解某个主题”从直接要长篇解释，改成编码智能体按固定学习协议走完目标、知识边界、依赖路径、单点讲解、隐藏答案检查和迁移。
> 先试这一步：在一个新的 learning workspace 里只装一个客户端（Codex 或 Claude Code / OpenCode），挑一个与当前工作直接相关的真实主题，按 README 的调用方式跑一次完整流程。
> 最近修订：2026-10-05

## 解决什么问题
直接问编码智能体“给我讲讲 X”，它往往从头到尾讲一遍。Concept Loom 把编码智能体改造成结构化的学习伙伴：不先给长篇解释，而是先帮你定义有用的目标，找到你当前理解的边界（knowledge frontier），给出一条短的依赖路径（learning map），一次只讲一个连接（one connection），然后检查（check）并把知识迁移走（transfer）。流程链路：

```text
goal → knowledge frontier → learning map → one connection → check → transfer
```

输出为 Markdown 学习笔记与文本/Mermaid 图，终端可读、兼容 Markdown 查看器可渲染。适合聚焦型学习，不适合整域综述。

## 适用与不适用
**适用**：想系统学习并检验自己是否理解某个主题；从零开始的主题，或喂入自己的书、课程、笔记、代码和转录稿；面向实用结果的学习（README 示例目标是“理解数据库事务，能为一小型 Web 应用选对隔离级别”）；明确适配 Codex、Claude Code、OpenCode 三个编码智能体，同一套工作流可跨客户端使用。

**不适用**：整域综述。若需要确认实际教学质量，注意 docs/en/how-it-works.md、learning-from-scratch.md、learning-with-source-materials.md 的具体方法，以及 `$concept-coach` skill 内部的提示词与教学步骤，均未出现在给出的材料中，因此只能基于 README 判断。

## 前置条件
- Node.js 20+。
- 已安装 Codex CLI（或 Claude Code / OpenCode）。
- 选一个目录作为学习工作区；下文用 `/path/to/learning-workspace` 代替。
- 项目版本 1.0.0，MIT 许可，无运行时 npm 依赖。

## 操作步骤

1. 选一个学习工作区目录。
   前提：已满足 Node.js 20+ 与对应 CLI。
   预期：后续安装器和笔记都围绕这个目录。

2. 安装适配器并自动注册 MCP server。
   做法 A（Codex，默认注册 MCP）：

```bash
node scripts/setup.mjs codex --target /path/to/learning-workspace
```

   做法 B（只写入工作区文件，不改动全局 Codex MCP 配置）：

```bash
node scripts/setup.mjs codex --target /path/to/learning-workspace --skip-mcp
```

   报告原文对 `--skip-mcp` 的说明：

```text
Use `--skip-mcp` only if you want to install the workspace files without changing the global Codex MCP configuration.
```

   怎么选：希望工具链自动接上就用做法 A；只想要工作区文件、不想动全局配置用做法 B。
   前提：已有 MCP 或引导配置时，安装器拒绝覆盖，需要手动合并生成的 Concept Loom 文件。
   预期：适配器装入指定工作区；做法 A 会注册 MCP server，做法 B 跳过注册。

3. 进入工作区并启动智能体：

```bash
cd /path/to/learning-workspace
codex
```

   前提：Codex CLI 已安装。
   预期：在当前工作区里启动 Codex。

4. 发起一次学习请求（原样提示词，换成你自己的目标）：

```text
Use $concept-coach. I want to understand database transactions well enough
to choose the right isolation level for a small web application.
```

   前提：上一步的智能体已启动，工作区已装好适配器。
   预期：按 goal → knowledge frontier → learning map → one connection → check → transfer 走；一次只讲一个连接；check 环节出隐藏答案的检查点；transfer 要求把知识迁移到具体动作。

5. 换其他客户端（同样的工作区参数）：

```bash
node scripts/setup.mjs claude-code --target /path/to/learning-workspace
node scripts/setup.mjs opencode --target /path/to/learning-workspace
```

   前提：已安装对应 CLI。
   预期：同一套工作流可跨 Codex、Claude Code、OpenCode 使用。报告未给出 Claude Code / OpenCode 的启动命令，按各自 CLI 的正常方式进入工作区启动即可。

6. 更新 Concept Loom 后刷新已安装的 skill：

```bash
node scripts/setup.mjs codex --target /path/to/learning-workspace --refresh
```

   前提：已经安装过对应工作区的适配器。
   预期：已安装 skill 更新到新版本。

7. 验证项目自身可用（在 Concept Loom 仓库内执行）：

```bash
npm test
npm run check
```

   前提：在 Concept Loom 仓库内执行。
   预期：确认工具本身无损坏。

## 怎么判断变好了
- **最小试用**：在一个新的 learning workspace 里只装一个客户端（建议用 Codex，或清单中已 adopt 的 Claude Code），挑一个与当前工作直接相关的真实主题（不是泛泛的兴趣题），按上面的调用方式跑一次完整流程，观察是否真的产出 knowledge frontier 与 learning map、是否一次只讲一个连接。
- **对照组**：同一个主题，用同一客户端直接问「给我讲讲 X」，比较两种方式的输出结构与篇幅。
- **可观察指标**：
  1. 是否明确说出「你已经会什么、边界在哪」，而不是从头讲一遍；
  2. check 环节是否出题并隐藏答案，能否真的答错（说明检查有效而非走过场）；
  3. 会话结束后工作区里是否有可复用的 Markdown 学习笔记，下次会话能否接上；
  4. 学完后能否完成一个具体动作（如为小项目选定隔离级别），即 transfer 是否成立；
  5. 相比直接提问，解释长度是否下降而可执行结论是否更明确。
- **工具自检**：在仓库内运行 `npm test` 与 `npm run check`；升级后记得用 `--refresh` 刷新已安装 skill。
- **试多久**：报告没有给出衡量学习效果改善的数据或指标，也没有给出持续时间。最小试用就是跑一次完整流程；跑完后按上面的可观察指标判断是否继续。

## 常见坑
- 安装器拒绝覆盖已有配置。当已有引导或 MCP 配置时，需要手动合并生成的 Concept Loom 文件。
- 适配器默认会改动全局 Codex MCP 配置；不希望如此要显式加 `--skip-mcp`。
- 需要 Node.js 20+ 与相应 CLI。
- README 只提到「在会话之间保留简洁的 Markdown 学习笔记」作为跨会话状态记忆的一点依据，未给出任何时间、事件或状态触发的机制细节。
- README 没有给出衡量学习效果改善的数据或指标；暴露知识缺口与误解、隐藏答案检查点能检验理解、跨会话笔记有帮助、能减少全领域综述式学习，这些都只是作者主张。
- 关键内容缺失：docs/en/how-it-works.md、learning-from-scratch.md、learning-with-source-materials.md 的具体方法，以及 `$concept-coach` skill 内部的提示词与教学步骤，均未出现。
- 放弃信号：若 check 环节不隐藏答案、不产生可验证的问答，或产出笔记与普通对话记录无差别，则说明只是普通提示词包装，降级为 study 即可，不必继续投入。

## 证据与来源
- 本手册的操作步骤来自 Concept Loom 调研报告：README 给出的安装命令（含 `--target`、`--skip-mcp`、`--refresh`）、三客户端各自的 setup 命令、启动方式、可直接复制的调用提示词、项目自检命令，以及「安装器不覆盖已有配置」的行为约束。这些是具体步骤，不依赖额外假设即可执行。
- 原文给出的数据：54 stars、版本 1.0.0、MIT 许可、要求 Node.js 20+、无运行时 npm 依赖。没有效果数据、没有用户案例、没有对比实验。
- 仅是作者主张：暴露知识缺口与误解、隐藏答案检查点能检验理解、跨会话笔记有帮助、能减少全领域综述式学习——这些在 README 中只有断言，没有证据。
- 关键内容缺失：docs/en/how-it-works.md、learning-from-scratch.md、learning-with-source-materials.md 的具体方法，以及 `$concept-coach` skill 内部的提示词与教学步骤，均未出现在给出的文本中。因此只能基于 README 判断，无法确认实际教学质量。
- 与已有做法的关系：Claude Code 与 OpenCode 是运行载体，Concept Loom 在其上加一层「目标—边界—路径—单点教学—检查—迁移」的学习协议和跨会话 Markdown 笔记；二者是叠加关系，不是替代关系。
- 适用条件：需 Node.js 20+ 与相应 CLI；已有 MCP 或引导配置时需手动合并；适配器默认会改动全局 Codex MCP 配置，不希望如此要显式加 `--skip-mcp`。
- 报告结论是建议小范围试：按 README 给出的命令把 Concept Loom 装进一个学习工作区（Codex/Claude Code/OpenCode），用自己真实要学的主题跑一遍 goal→knowledge frontier→learning map→one connection→check→transfer；理由是安装、调用、刷新、验证步骤都可直接复制照做，但具体教学提示词与效果证据都在未提供的文档里，无法据此直接采用。

## 依据的调研

- [Zproger/ConceptLoom](../research/radar/2026-10-05/1273-zproger-conceptloom.md)：值得一试，建议小范围试：按 README 给出的命令把 Concept Loom 装进一个学习工作区（Codex/Claude Code/OpenCode），用自己真实要学的主题跑一遍 goal→knowledge frontier→learning map→one connection→check→transfer；理由是安装、调用、刷新、验证步骤都可直接复制照做，但具体教学提示词与效果证据都在未提供的文档里，无法据此直接采用。
