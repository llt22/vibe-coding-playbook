# gustavo-henriq/antislop-ui-ux-skill

- 结论：**值得一试**。建议在一个小型 UI 页面或原型上小范围试用：按 README 安装 skill，先填写项目的 gosto.md 和 receitas.md，再走“定位 slop 信号→提问并给灰度线框→实现→多层检查”的循环；理由是安装命令和流程较明确，但原文未提供检查清单/模板正文和效果数据，暂不宜直接 adopt。
- 原文：https://github.com/gustavo-henriq/antislop-ui-ux-skill
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-12T03:18:06.083Z

## 是什么
- 这是一个给 Claude Code、Codex、OpenCode 使用的 UI/UX skill，用于“去 AI 味”：改造已有屏幕，或从零构建不显 AI 生成的界面。
- README 把 AI slop 定义为“像不用产品的人拼出来的屏幕”：所有块视觉权重相同、用文字解释图、重复动作、把渐变/玻璃/发光当装饰；目标是每个元素存在都有用户能感受到的理由。
- README 列出的交付物包括：`SKILL.md`、审美清单、字体/玻璃/组件说明、参考源、项目模板、80+ 模式目录、20 组正反例画廊等。

## 具体做法
1. 前提：已有 Claude Code/Codex/OpenCode 项目，并确认项目的技能目录。把仓库中的 skill 文件夹复制到项目里。README 给出的 Claude Code 命令是：
```bash
cp -r skills/deslop my-app/.claude/skills/deslop
```
注意：README 的目录树显示根目录有 `deslop/`，但安装命令写的是 `skills/deslop`，执行前先确认仓库实际路径。

2. 前提：skill 已复制到项目。按 README 要求填写项目级的两个文件：`gosto.md`（项目品味：选择和拒绝）与 `receitas.md`（调色板、表面和组件）。原文说它们是模板，但本轮材料没有给出模板正文，需要从仓库中取得后填写。

3. 前提：选定一个已有屏幕或新屏幕。使用 skill 的两种模式：对已有屏幕做 de-slop（app、Figma 或刚做出的原型），或从零构建新屏幕。原文没有给出具体调用提示词，调用时使用宿主 agent 的技能调用方式，不要照抄不存在的提示词。

4. 前提：已确定屏幕和项目模板。按 README 描述的循环执行：先读 `gosto.md` 和 `receitas.md`；就地指出 slop 信号；先提问并给出灰度线框，之后才实现；产出 self-contained HTML 原型（base64 图片、真实状态）；最后做 double check、outside look、second pass，并报告发现了什么。

5. 前提：需要外部参考且有浏览/截图权限。可用便宜的子代理搜索 curated sources、截图，只返回大纲；主 agent 负责决定和应用。README 把这称为 anti-token protocol。

6. 前提：使用参考时。遵守 README 的 golden rule：参考只取概念（层级、节奏、隐喻），不复制调色板、字体或字面布局。

## 对应的研究问题
1. 能力发现：README 明确可交给 AI 做 UI slop 审计和改造、从零建屏、先提问澄清、提出灰度线框、用子代理检索参考、提出主题化效果、执行分层检查。
2. 任务匹配：适合 Claude Code/Codex/OpenCode 的 skill 形态；参考搜索交给便宜子代理并只返回大纲，主 agent 决策和实现，适合把“检索”与“决策/实现”分开；主要适用于 UI 屏幕设计、评审和原型，不是所有工作。
3. 条件供给：需要项目品味 `gosto.md`、规则 `receitas.md`、技能文件、参考源和截图能力、项目技能目录、真实状态与图片；还需要通过提问明确屏幕角色、视觉和优先级。
4. 主动推进：原文主要是任务内循环（先问再做、检查、二次 pass），没有描述由时间、事件或状态触发的持续任务；不能据此认定可自动推进。
5. 效果验证：原文列出 signal audit、aesthetic checklist、redundancy test、outside look、second pass 和报告发现；20 组正反例画廊可作为人工对照。但没有给出指标定义或量化结果。

## 与已有做法关系
- 清单中有 Claude Code（adopt）：本条目就是可安装到 Claude Code 的 skill，直接补充其技能配置方式。
- Semble（try）：原文未提及，未见直接关系。
- OpenCode（watch）：README 说支持 Codex/OpenCode，安装方式类似“放到 skills/deslop”，所以它是支持的宿主之一，但原文没有更多 OpenCode 细节。
- 与通用“让 AI 做 UI”相比，它把审美约束、检查清单和参考协议固化成 skill，并让每个项目只保留 `gosto.md` 与 `receitas.md`，避免重复维护。

## 证据与局限
- 证据：README 列出 20 组 slop×correction 对照、10 类 80+ 模式、12 信号清单、画廊 HTML 和 curated sources。但本轮材料只包含 README，未包含 `SKILL.md`、`estetica-ia.md`、`gosto.md`、`receitas.md` 的实际内容，因此只能依据 README 判断。34 stars 只是仓库指标，不是效果证据。
- 作者主张：ask before deciding 是主要差异化；便宜子代理和 anti-token protocol 能省 token；分层检查能提升质量。这些是作者主张，原文没有数据或案例验证。
- 局限：只面向 UI/UX 屏幕；没有量化前后对比、用户研究或失败案例；没有给出完整提示词和模板正文；安装路径在 README 中不完全一致。因此不能直接 adopt，需要先确认仓库实际内容。
- 适用条件：使用 Claude Code/Codex/OpenCode 做 UI 原型或界面评审的团队；愿意先填写项目品味与规则，并保留人工评审环节。

## 怎么试、怎么验证
- 最小试用：选一个低风险页面或原型。先做基线：用同一个 agent、不装 skill，生成或改造一版；再安装 skill、填写 `gosto.md`/`receitas.md`，按上述循环生成或改造第二版。保留前后截图和 agent 的检查报告。
- 判断指标：统计 signal audit 标记出的 slop 信号数量是否下降；重复动作和冗余区块是否减少；装饰性渐变/玻璃/发光是否减少；每个元素能否说出用户可感知的存在理由；请 1–2 名评审者在不知道版本来源的情况下选择更可用的一版；记录 outside look 之后的返工次数和耗时。
- 降级条件：如果仓库中实际没有 README 所说的检查清单、模板或技能内容，或安装后无法按循环执行，应把 verdict 降为 study，而不是写入手册作为可复制流程。
