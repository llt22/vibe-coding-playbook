# Zproger/ConceptLoom

- 结论：**值得一试**。建议小范围试：按 README 给出的命令把 Concept Loom 装进一个学习工作区（Codex/Claude Code/OpenCode），用自己真实要学的主题跑一遍 goal→knowledge frontier→learning map→one connection→check→transfer；理由是安装、调用、刷新、验证步骤都可直接复制照做，但具体教学提示词与效果证据都在未提供的文档里，无法据此直接采用。
- 原文：https://github.com/Zproger/ConceptLoom
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-04T23:38:48.934Z

## 是什么

Concept Loom 是一个可移植的 AI 学习工作流，适配 Codex、Claude Code、OpenCode 三个编码智能体。它把编码智能体改造成结构化的学习伙伴：不先给长篇解释，而是先帮你定义有用的目标，找到你当前理解的边界（knowledge frontier），给出一条短的依赖路径（learning map），一次只讲一个连接（one connection），然后检查（check）并把知识迁移走（transfer）。

流程链路：

```text
goal → knowledge frontier → learning map → one connection → check → transfer
```

版本 1.0.0，MIT 许可，要求 Node.js 20+，无运行时 npm 依赖。小结构用等宽文本图展示，较大的关系图以 Mermaid 块返回，终端可读、兼容 Markdown 查看器可渲染。既支持从零开始的主题，也支持喂入自己的书、课程、笔记、代码和转录稿。

## 具体做法

1. **前提**：Node.js 20+；已安装 Codex CLI（或 Claude Code / OpenCode）。选一个目录作为学习工作区（下文用 `/path/to/learning-workspace` 代替）。
2. **安装适配器并自动注册 MCP server（Codex）**：

```bash
# Install the adapter and register its MCP server automatically
node scripts/setup.mjs codex --target /path/to/learning-workspace
```

如果你只想写入工作区文件、不改动全局 Codex MCP 配置，加 `--skip-mcp`：

```text
Use `--skip-mcp` only if you want to install the workspace files without changing the global Codex MCP configuration.
```

3. **进入工作区并启动智能体**：

```bash
cd /path/to/learning-workspace
codex
```

4. **发起一次学习请求**（原样提示词，换成你自己的目标）：

```text
Use $concept-coach. I want to understand database transactions well enough
to choose the right isolation level for a small web application.
```

5. **换其他客户端**（同样的工作区参数）：

```bash
node scripts/setup.mjs claude-code --target /path/to/learning-workspace
node scripts/setup.mjs opencode --target /path/to/learning-workspace
```

6. **更新 Concept Loom 后刷新已安装的 skill**：

```bash
node scripts/setup.mjs codex --target /path/to/learning-workspace --refresh
```

7. **验证项目自身可用**（在 Concept Loom 仓库内执行）：

```bash
npm test
npm run check
```

8. **注意冲突**：安装器拒绝覆盖已有配置。当已有引导或 MCP 配置时，需要手动合并生成的 Concept Loom 文件。

## 对应的研究问题

- **能力发现**：把「系统学习并检验自己是否理解某个主题」这类通常自己做的任务交给智能体。README 给的示例目标是「理解数据库事务，能为一小型 Web 应用选对隔离级别」——即面向实用结果的学习，而非通览整个领域。仅此一例，属方向性依据。
- **任务匹配**：明确适配三个编码智能体（Codex、Claude Code、OpenCode），同一套工作流可跨客户端使用；输出形式为 Markdown 学习笔记与文本/Mermaid 图；教学粒度是「一次一个连接」，适合聚焦型学习，不适合整域综述。
- **条件供给**：需要 Node.js 20+、对应 CLI、一个指定的 learning workspace 目录；可注册 MCP server 以供给工具；可喂 PDF、EPUB、笔记、视频、代码、课程文件等原始材料（README 列出 learning with source materials 文档，但内容未提供）；反馈回路来自 concealed-answer checkpoints（隐藏答案的检查点）。
- **主动推进**：README 只提到「在会话之间保留简洁的 Markdown 学习笔记」（keep concise Markdown learning notes between sessions），可视为跨会话状态记忆的一点依据；未给出任何时间、事件或状态触发的机制细节。
- **效果验证**：工作流内建 `check`（隐藏答案检查）和 `transfer`（迁移）两个环节；项目自身用 `npm test`、`npm run check` 验证。但 README 没有给出任何衡量学习效果改善的数据或指标。

## 与已有做法的关系

清单中有 Claude Code（tool，adopt）与 OpenCode（tool，watch）。Concept Loom 正是为这两个（以及 Codex）提供适配器的上层工作流：Claude Code / OpenCode 是运行载体，Concept Loom 在其上加一层「目标—边界—路径—单点教学—检查—迁移」的学习协议和跨会话 Markdown 笔记。二者是叠加关系，不是替代关系。

## 证据与局限

- **原文给出的可照做内容**：安装命令（含 `--target`、`--skip-mcp`、`--refresh`）、三客户端各自的 setup 命令、启动方式、可直接复制的调用提示词、项目自检命令、以及「安装器不覆盖已有配置」的行为约束。这些是具体步骤，不依赖额外假设即可执行。
- **原文给出的数据**：54 stars、版本 1.0.0、MIT 许可、要求 Node.js 20+、无运行时 npm 依赖。没有效果数据、没有用户案例、没有对比实验。
- **仅是作者主张**：暴露知识缺口与误解、隐藏答案检查点能检验理解、跨会话笔记有帮助、能减少全领域综述式学习——这些在 README 中只有断言，没有证据。
- **关键内容缺失**：docs/en/how-it-works.md、learning-from-scratch.md、learning-with-source-materials.md 的具体方法，以及 `$concept-coach` skill 内部的提示词与教学步骤，均未出现在给出的文本中。因此本报告只能基于 README 判断，无法确认实际教学质量。
- **适用条件**：需 Node.js 20+ 与相应 CLI；已有 MCP 或引导配置时需手动合并；适配器默认会改动全局 Codex MCP 配置，不希望如此要显式加 `--skip-mcp`。

## 怎么试、怎么验证

- **最小试用**：在一个新的 learning workspace 里只装一个客户端（建议用清单中已 adopt 的 Claude Code，或 Codex），挑一个与当前工作直接相关的真实主题（不是泛泛的兴趣题），按 README 的调用方式跑一次完整流程，观察是否真的产出 knowledge frontier 与 learning map、是否一次只讲一个连接。
- **对照组**：同一个主题，用同一客户端直接问「给我讲讲 X」，比较两种方式的输出结构与篇幅。
- **可观察指标**：
  1. 是否明确说出「你已经会什么、边界在哪」，而不是从头讲一遍；
  2. check 环节是否出题并隐藏答案，能否真的答错（说明检查有效而非走过场）；
  3. 会话结束后工作区里是否有可复用的 Markdown 学习笔记，下次会话能否接上；
  4. 学完后能否完成一个具体动作（如为小项目选定隔离级别），即 transfer 是否成立；
  5. 相比直接提问，解释长度是否下降而可执行结论是否更明确。
- **工具自检**：如需确认工具本身无损坏，在仓库内运行 `npm test` 与 `npm run check`；升级后记得用 `--refresh` 刷新已安装 skill。
- **放弃信号**：若 check 环节不隐藏答案、不产生可验证的问答，或产出笔记与普通对话记录无差别，则说明只是普通提示词包装，降级为 study 即可，不必继续投入。
