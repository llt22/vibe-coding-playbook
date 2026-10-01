# anthropics/skills

- 结论：**建议采用**。直接照官方 README 走：在 Claude Code 里加 marketplace 装 example-skills 摸清形态，再照 SKILL.md 模板把一件自己反复做的工作打包成技能，用返工轮数和首稿可用率验证。理由是这个仓库给出了可原样复制的安装命令和技能的最小结构（文件夹 + 带 name/description 的 SKILL.md），是把指令、脚本、资源打包供给智能体的官方一手参照。
- 原文：https://github.com/anthropics/skills
- 来源：github-active，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T12:26:23.425Z

## 是什么
Anthropic 官方的 Claude Skills 实现仓库。按 README 定义，Skill 就是「指令、脚本和资源的文件夹」，由 Claude 在专门任务上动态加载，用来把某类任务的做法固定成可重复的方式——例如按公司品牌规范生成文档、按组织特定流程分析数据、自动化个人任务。仓库包含：

- `./skills`：示例技能集合，覆盖 Creative & Design、Development & Technical、Enterprise & Communication 以及 Document Skills
- `./spec`：Agent Skills 规范
- `./template`：技能模板
- `skills/docx`、`skills/pdf`、`skills/pptx`、`skills/xlsx`：Claude 文档能力背后实际在用的技能，source-available（非开源），官方定位是给开发者参考复杂技能怎么写

README 顶部注明：本仓库是 Anthropic 对 Claude 技能的实现；Agent Skills 标准见 agentskills.io。

## 具体做法（编号步骤）

### 路线 A：直接使用现成技能（Claude Code，前提：已装 Claude Code）
1. 在 Claude Code 中注册本仓库为插件市场：
```
/plugin marketplace add anthropics/skills
```
2. 安装某一组技能，二选一。
   - 交互式：选 `Browse and install plugins` → 选 `anthropic-agent-skills` → 选 `document-skills` 或 `example-skills` → 选 `Install now`
   - 直接安装：
```
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```
3. 安装后按名称调用技能，例如：
```
Use the PDF skill to extract the form fields from `path/to/some-file.pdf`
```

### 路线 B：Claude.ai（前提：付费计划）
1. 这些示例技能对付费计划已可直接使用，无需安装。
2. 要使用本仓库其他技能或上传自定义技能，按官方文档《Using skills in Claude》的步骤操作。

### 路线 C：Claude API
1. 使用 Anthropic 预置技能、上传自定义技能，见官方《Skills API Quickstart》（Creating a Skill 一节）。

### 路线 D：自己写一个技能
1. 建一个文件夹（一个技能 = 一个自包含文件夹）。
2. 在里面放 `SKILL.md`，用 YAML frontmatter + 正文。frontmatter 只有两个必填字段：`name`（唯一标识，小写、空格用连字符）、`description`（完整描述这个技能做什么、什么时候用）。正文写 Claude 在该技能激活时要遵循的指令、示例和准则。可直接照抄官方骨架：
```markdown
---
name: my-skill-name
description: A clear description of what this skill does and when to use it
---

# My Skill Name

[Add your instructions here that Claude will follow when this skill is active]

## Examples
- Example usage 1
- Example usage 2

## Guidelines
- Guideline 1
- Guideline 2
```
3. 起步可直接用仓库里的 `template-skill`（位于 `./template`）当起点。
4. 需要更复杂的能力（带脚本、资源）时，读 `skills/docx`、`skills/pdf`、`skills/pptx`、`skills/xlsx` 这几个生产级技能作参考。
5. 需要严格对齐标准时，读 `./spec` 的 Agent Skills 规范。
6. 关键任务前，务必在自己的环境里充分测试（README 明文要求）。

## 对应的研究问题
- **能力发现**：README 列举的技能范围本身就是一份「还能交给 AI 什么」的清单来源——从创意类（艺术、音乐、设计）到技术类（测试 web 应用、MCP server 生成）到企业工作流（通信、品牌）再到文档类（docx/pdf/pptx/xlsx）。可对照 `./skills` 目录逐类核对自家哪些工作还没交给 AI。
- **任务匹配**：技能是「针对专门任务、以可重复方式完成」的打包单位；文档四件套对应生产级文档任务，example-skills 对应模式学习与借鉴，API 路线对应把技能接到自有系统。原文未给出按任务类型选模型的建议。
- **条件供给**：这是原文最实的一环——要提供的正是「指令 + 脚本 + 资源」三类内容，装进一个文件夹由 Claude 动态加载；frontmatter 的 `description` 承担「什么时候用」的判定信息，正文承担「怎么做」的指令与准则。
- **主动推进**：原文只提到「动态加载」和「安装后按名称调用」，没有给出由时间、事件或状态触发并持续完成的机制。无依据。
- **效果验证**：原文没有给出任何验证方法或指标，只有一句免责声明要求「critical tasks 前必须充分自测」。无依据。

## 与已有做法的关系
- **Claude Code（adopt）**：本仓库正是 Claude Code 的技能扩展路径，README 给出的 marketplace add / plugin install 命令直接作用于 Claude Code。
- **Agent skills（concept, adopt）**：本仓库是 Anthropic 对 Agent Skills 的实现，规范在本仓库 `./spec`，标准站点为 agentskills.io，二者互补——标准看 agentskills.io/spec，实现看本仓库。
- **skills.sh（source, try）**：README 顶部挂有 skills.sh 的徽章链接（`https://skills.sh/b/anthropics/skills`），说明该来源与本仓库存在索引/展示关系。
- 清单中另有 Notion 合作技能（README「Partner Skills」一节），未列入给定清单条目，但可作为外部技能样例参考。

## 证据与局限
- **证据类型**：全部为官方一手说明与可执行命令、可复制模板，不涉及第三方转述。安装命令、SKILL.md 骨架、frontmatter 两个必填字段均为原文直接给出，可直接照做。
- **数据**：仅有 GitHub 星标数 179219（来自 metrics，README 正文中未出现），README 未给出任何效果数据、案例结果、耗时或质量提升数字。
- **局限一**：README 明确声明这些技能「仅供演示与教育用途」，且「你在 Claude 中得到的行为可能与这些技能所示不同」，作者自己要求关键任务前必须自测——这意味着采纳的是「打包技能的机制与格式」，不是「其效果已被验证」。
- **局限二**：README 是入口文档，真正复杂的技能内容（docx/pdf/pptx/xlsx 内部实现、spec 细节）不在给出的原文里，需要另行打开对应目录。
- **局限三**：docx/pdf/pptx/xlsx 为 source-available 而非开源，只可读作参考，不可按 Apache 2.0 自由再分发；仓库中其余技能才多为 Apache 2.0。
- **适用条件**：Claude Code 路线需要安装 Claude Code；Claude.ai 路线需要付费计划；API 路线需要能访问 Claude API 并按 Skills API 指南操作。

## 怎么试、怎么验证
**最小试用（半天内可完成）**
1. 在 Claude Code 执行 `/plugin marketplace add anthropics/skills`，再 `/plugin install example-skills@anthropic-agent-skills`，先用一个现成技能跑一件真实小任务（例如从 PDF 抽表单字段），确认链路通。
2. 选一件你自己每周都在重复、且有明文规范的工作（如按公司模板出一份文档）。照着模板建一个文件夹 + `SKILL.md`，`name` 用小写连字符，`description` 必须同时写清「做什么」和「什么时候用」，正文写步骤、示例、准则。
3. 做对照：同一任务、同一输入，分别在没有该技能和有该技能的条件下各跑 3 次，记录差异。
4. 复现性检验：换一个新会话，或让一位不了解背景的同事只凭 `description` 触发该技能，看能否得到同类结果。

**判断有没有改善的指标**
- 人工修改次数/返工轮数：有技能时是否下降。
- 首稿可用率：第一次输出即达到可交付标准的比例。
- 背景重述次数：每次任务是否还需要重新粘贴同样的规范与上下文——下降说明指令供给生效。
- 输出一致性：多次运行结果在格式与关键字段上是否稳定（方差变小）。
- 单次任务耗时：从提出到可交付的总时长变化。
- 反向指标：若加了技能后仍然每次都要口头纠正同一件事，说明 `description` 或正文指令没写到位，应先改 SKILL.md 而不是继续加提示。
