# Leonxlnx/imagegen-skills

- 结论：**值得一试**。先把 imagegen-frontend-web 与 image-to-code 装进现有的 Claude Code 或 Codex 工作流，在真实落地页需求上按“先出图、审图、再按图建站”走一遍，再和“直接写代码”的基线比返工轮次；理由是安装与调用步骤在原文里给全了，且流水线思路明确，但技能内部提示词（SKILL.md）未提供，只能小范围试。
- 原文：https://github.com/Leonxlnx/imagegen-skills
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-23T23:58:52.361Z

## 是什么

imagegen-skills 是一个开源（MIT）技能仓库，把“让智能体产出值得照着做的设计图”拆成四个可安装技能。作者也是 taste-skill 的作者；这批技能原先放在 taste-skill 里，2026 年 10 月移到本仓库，让两个仓库各司一职：taste-skill 负责构建和检查真实前端，imagegen-skills 负责出图。

四个技能（README 技能表原意）：

| 技能 | 安装名 | 做什么 |
| --- | --- | --- |
| imagegen-frontend-web | `imagegen-frontend-web` | 网站分镜稿：落地页每个分区一张图，构图有变化、文字可读 |
| imagegen-frontend-mobile | `imagegen-frontend-mobile` | iOS / Android / 跨端的 App 界面与流程，成套之间保持一致 |
| brandkit | `brandkit` | 品牌规范板：logo 方向、符号系统、色板、字体与应用 |
| image-to-code | `image-to-code` | 整条流水线：先生成设计图 → 研究这些图 → 再照着建站 |

关键分工：前三个**只产出图片**，要配一个能出图的智能体（ChatGPT Images、Codex image mode 或其他可生成图片的 agent），再把图交给编程智能体；`image-to-code` 需要**既能出图又能写代码**的智能体。

## 具体做法

1. 前提：本机可用 `npx`（Node/npm 环境）。装单个技能，把 `--skill` 的值换成上表任一安装名：

```bash
npx skills add https://github.com/Leonxlnx/imagegen-skills --skill "imagegen-frontend-web"
```

   省略 `--skill` 则安装全部四个技能。

2. 用 Claude Code 的话，走插件市场方式：

```
/plugin marketplace add Leonxlnx/imagegen-skills
/plugin install imagegen-skills@imagegen-skills
```

3. 用 Codex 的话，走 Codex 插件命令：

```bash
codex plugin marketplace add Leonxlnx/imagegen-skills
codex plugin add imagegen-skills@imagegen-skills
```

   前提：装完**必须新开一个 Codex 会话**，技能才会被加载。

4. 如果以前是从 taste-skill 装的这批技能：改从本仓库安装即可，安装名没变，原有调用方式不用改。

5. 按目标选型（前提是智能体能力匹配）：只要设计图 → 选前三个之一，配一个能出图的智能体；要“图 → 代码”闭环 → 选 `image-to-code`，配一个既能出图又能写代码的智能体。

6. 跑流水线：先逐张生成设计图（web 按落地页分区，每区一张；mobile 按屏幕/流程成组生成，保证成套一致），人工看过图之后，再让编程智能体照图实现，而不是先写代码再补设计。

   注：第 6 步依据 README 对 `image-to-code` 的一句话描述（generate the design images, study them, then build the website to match）；仓库未提供 SKILL.md 正文，技能内部的具体提示词、参数与判定标准无法从本次材料中还原，需装好后自行读 `skills/*/SKILL.md`。

## 对应的研究问题

- **能力发现**：把“落地页分区视觉稿 / App 屏幕与流程 / 品牌规范板（logo 方向、符号系统、色板、字体、应用）”这类通常认为要设计师来做的前期产出交给智能体，并且强调“成套一致”与“文字可读”，是原文明确声称的能力边界。
- **任务匹配**：给出了明确的模型/工具搭配规则——纯出图的三个技能要配“能生成图片的智能体”，`image-to-code` 要配“能生成图片且能写代码的智能体”；并说明出图与写码可以拆给两个智能体，用图作为交接物。
- **条件供给**：需要的权限与工具是可验证的——`npx` 安装权限或插件市场安装权限、智能体的图像生成能力（image-to-code 还需代码能力）、Codex 下的会话重启（新会话才会加载技能）。至于给智能体什么设计规格信息、如何反馈，原文未展开。
- **主动推进**：无依据，原文没有涉及时间/事件/状态触发或持续执行。
- **效果验证**：无依据。原文只有质量取向的描述（“worth building from”、readable type、consistent across a set），没有给出任何度量方式或验证流程。

## 与已有做法的关系

清单中相关条目：**Claude Code（tool，状态 adopt）**。本仓库直接提供了 Claude Code 的插件安装路径（`/plugin marketplace add` + `/plugin install`），可以把这四个技能挂进已有的 Claude Code 工作流，不需要换工具；同时给了 Codex 的对应插件命令，说明它面向的是“编程智能体 + 技能包”这一已有形态，而不是新工具。

另需说明：与同作者的 taste-skill 是分工而非替代——taste-skill 管“建并检查真实前端”，本仓库管“出图”，两者以设计图为交接物衔接。清单中没有 taste-skill 条目，此处仅作定位说明。

## 证据与局限

- 原文给出的“证据”仅为仓库自述：四个技能的功能描述、安装命令、插件命令、MIT 许可、作者身份与拆分时间（2026 年 10 月）、迁移后安装名不变。
- 无第三方评测、无对比数据、无客户案例、无生成图示例；`worth building from`、`readable type`、`consistent across a set` 都是作者主张，不是测量结果。
- 仓库热度：30 stars（搜索元数据），属于小体量项目。
- 最大局限：本次只拿到 README，**未拿到 SKILL.md 正文**，因此“把设计任务拆成可复用技能”的具体拆法、提示词、评分/自检环节都无法核实，也无法判断它相对直接在对话里要求出图有什么实质差别。
- 适用条件：需要一个具备图像生成能力的智能体；`image-to-code` 还要求同一智能体能写代码。对设计质量要求高的场景，仍需要人工审图这一步作为闸门。

## 怎么试、怎么验证

最小试用（半天内可完成）：

1. 装 `imagegen-frontend-web`，拿一个真实的落地页需求（例如 5 个分区），让智能体逐区出图，共 5 张。
2. 装 `image-to-code`，对同一需求跑完整流水线：出图 → 读图 → 建站。
3. 设基线：同一需求、同一编程智能体，不用任何设计图直接建站。

判断有没有改善的指标：

- 审图通过率 = 可直接采用的图 / 生成的图（衡量出图质量与“值得照着做”的成色）；
- 从图到可运行页面的返工轮次（对照基线的“无图直接建站”返工轮次）；
- 分区之间的风格一致性（构图、字级、间距是否成套，对应原文的 consistent 主张）；
- 文字可读性硬问题数（换行溢出、对比度不足、字被裁切，对应原文的 readable type 主张）；
- 端到端总耗时（出图 + 审图 + 实现 vs 直接实现）。

品牌素材方向可加一个独立小测：用 `brandkit` 对同一品牌简报连出 3 组规范板，看 logo 方向、色板、字体、应用是否成套一致，以及人工挑选所需时间是否下降。如果 3 组都跑不出可用方向，说明该技能在此场景暂不值得纳入手册。
