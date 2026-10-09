# twostraws/SwiftUI-Agent-Skill

- 结论：**值得一试**。如果你用 Claude Code、Codex、Cursor 等做 SwiftUI 开发，按 README 的 npx 或插件市场步骤安装 swiftui-pro，并在写/审 SwiftUI 代码时显式触发；更一般地，可借鉴其“领域技能包 + 按需触发 + 只写 LLM 边界知识”的模式为其他工作补上下文。理由是安装与触发步骤明确、可直接照做，但效果证据主要是作者经验，且适用范围限于 SwiftUI。
- 原文：https://github.com/twostraws/SwiftUI-Agent-Skill
- 来源：github-trending，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-09T16:33:20.302Z

## 是什么

- 这是一个面向 AI 编程助手的 SwiftUI 领域技能（Agent Skill），名为 SwiftUI Pro。
- 作用：帮助 Claude Code、Codex、Gemini、Cursor 等写“更聪明、更简单、更现代”的 SwiftUI，覆盖 API 用法、设计、性能、无障碍、导航、布局、动画、状态管理、VoiceOver、弃用 API 等。
- 格式：Agent Skills，兼容 Claude Code、Codex、Gemini、Cursor 等。
- 安装/触发：可用 npx 安装，也可在 Claude Code 中用插件市场安装；Claude Code 触发 `/swiftui-pro`，Codex 触发 `$swiftui-pro`，也可自然语言触发。
- 同类技能：SwiftData Pro、Swift Concurrency Pro、Swift Testing Pro，以及 Swift Agent Skills 集合。
- 许可：MIT。

## 具体做法

1. 前提：你使用支持 Agent Skills 的编程助手（Claude Code、Codex、Gemini、Cursor 等），并准备在 SwiftUI/iOS 项目中使用。安装需要 Node/npx；没有 npx 先装 Node。

```bash
npx skills add https://github.com/twostraws/swiftui-agent-skill --skill swiftui-pro
```

如果报 `npx: command not found`：

```bash
brew install node
```

如果 brew 也失败，先安装 Homebrew（README 给了链接 https://brew.sh）。

2. 安装时按提示选择：要装给哪些 agents、只对当前项目还是所有项目可用。

3. Claude Code 用户也可以用插件市场：

```
/plugin marketplace add twostraws/SwiftUI-Agent-Skill
/plugin install swiftui-pro@swiftui-agent-skill
```

4. 或者 clone 仓库自行安装（README 说可以 clone 整个仓库并按自己喜欢的方式安装）。

5. 使用触发。Claude Code：

```
/swiftui-pro
```

Codex：

```
$swiftui-pro
```

可限定部分审查：

```
/swiftui-pro Check for deprecated API
```

```
$swiftui-pro Focus on accessibility
```

自然语言：

```
Use the SwiftUI Pro skill to look for performance problems in this project.
```

6. 如果要自己写/贡献领域技能，遵循 README 贡献指南：
- Markdown 保持简洁，尤其 SKILL.md 有 token 成本，尊重用户 token 预算。
- 不重复 LLM 已经知道的内容，聚焦边界情况、意外情况、软弃用等。
- 所有工作用 MIT 许可。
- 贡献前还需遵守 Code of Conduct。

## 对应的研究问题

1. 能力发现：该技能把“写/审 SwiftUI 代码”作为 AI 可承担的工作，包括 API 使用、设计、性能、无障碍、导航、布局、动画、状态管理、VoiceOver、弃用 API 检查等。原文称 LLM 常犯按钮对 VoiceOver 不可见、常用弃用 API、写出意外性能问题，说明默认 AI 在这些方面能力不足，需要领域技能补足。

2. 任务匹配：匹配的模型/工具是支持 Agent Skills 的编程助手：Claude Code、Codex、Gemini、Cursor 等。协作方式：通过命令或自然语言让 agent 执行整体或部分审查（如只查 deprecated API、只关注 accessibility）。也可把技能安装到单项目或所有项目。

3. 条件供给：需要提供 Node/npx 环境（或 Homebrew），安装到指定 agent 和项目；安装时选择 agent 范围；使用时给出具体审查指令；如果要编写技能，需要控制 Markdown/SKILL.md 的 token 预算，只补充 LLM 不熟悉的边界知识。权限方面原文未展开，但安装到项目/所有项目属于作用范围选择。

4. 主动推进：原文只给了手动触发方式（斜杠命令、`$` 命令、自然语言），没有说可被时间、事件或状态自动触发并持续完成。因此当前依据只支持“在开发流程中按需触发审查”，不支持自动持续运行。

5. 效果验证：原文没有给指标或基准测试，只声称针对 LLM 常见错误。可自行设计验证（见下）。

## 与已有做法的关系

- 清单中有「Agent skills」（concept，adopt）：该仓库是 Agent Skills 格式的具体实现，直接相关。
- 清单中有「Claude Code」（tool，adopt）：README 明确支持 Claude Code，并给出插件市场安装与 `/swiftui-pro` 触发方式。
- 清单中有「Cursor」（tool，watch）：README 明确说兼容 Cursor。
- 清单中有「abide」（tool，watch）：原文未提及，暂未发现直接关系。

## 证据与局限

证据：
- GitHub 仓库，5300 stars，今日新增 88（输入 metrics）。
- README 给出完整安装命令（npx、Claude Code 插件市场）、触发命令、自然语言触发示例。
- 作者 Paul Hudson / Hacking with Swift，MIT 许可，并列出 SwiftData Pro、Swift Concurrency Pro、Swift Testing Pro 等同类技能。
- 贡献指南给出了编写技能的原则：简洁、控制 token、不重复 LLM 已知内容、聚焦边界情况。

局限：
- 原文是 README，没有基准测试、对照实验或具体项目效果数据。
- “built on thousands of hours”“targeting the mistakes LLMs actually make”“buttons invisible to VoiceOver、deprecated API、性能问题”是作者主张或经验描述，不是可量化证据。
- 只依据 README 与摘要，未读取 SKILL.md 的具体检查规则，未验证实际安装与运行效果。
- 适用条件：SwiftUI / Apple 平台开发，目标 iOS 26+、Swift 6.4+；使用支持 Agent Skills 的编程助手；需要 Node/npx 或 Claude Code 插件市场。其他领域不能直接套用该技能内容，只能借鉴技能包模式。

## 怎么试、怎么验证

最小试用：
1. 选一个已有 SwiftUI 项目或小 demo，包含导航、布局、动画、状态管理、VoiceOver/无障碍、可能弃用的 API。
2. 安装技能：`npx skills add https://github.com/twostraws/swiftui-agent-skill --skill swiftui-pro`，选择 Claude Code 或 Codex 等。
3. 先做基线：不用技能，直接让同一个 agent 审查同一段代码，例如“找出这个 SwiftUI 文件的问题并给修改建议”。记录问题列表。
4. 再用技能：Claude Code 用 `/swiftui-pro`，Codex 用 `$swiftui-pro`，或自然语言触发。对同一段代码做审查。记录问题列表。
5. 对比并人工判断：新增发现中，哪些是真实问题（弃用 API、VoiceOver 标签缺失、性能反模式、状态管理问题），哪些是误报。
6. 采纳修复后，重新编译和跑测试，观察是否减少编译器警告、是否通过无障碍检查、是否简化代码。

判断改善的指标：
- 弃用 API 检出数量/修复数量。
- VoiceOver/无障碍问题检出数量。
- 性能反模式检出数量。
- 人工确认的有效问题占比、误报率。
- 修复后编译通过率、测试通过率、代码复杂度或行数变化。
- 审查耗时与 token 消耗是否可接受。
- 跨工具一致性：在 Claude Code、Codex、Cursor 中触发是否都可用。
