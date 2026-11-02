# @SCR01111: This GitHub repo is a cheat code for people hunting for jobs. 📌

- 结论：**值得研读**。建议把这条线索当作“Claude Code 用 slash 命令与 skill 分层编排工作流”的案例研读，暂不直接采用；推文只列出 /setup、/scrape、/rank 和仓库路径，缺少可复制的配置、提示词与完整流程，无法据此落地。
- 原文：https://x.com/SCR01111/status/2117160001521234166
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-02T15:06:54.208Z

## 是什么

这是一条 X 推文，宣传一个名为 ai-job-search 的 GitHub 仓库：用 Claude Code 的 slash 命令和 skill 串起求职流水线。原文列出的入口包括：

- `/setup`：从简历建立职业档案
- `/scrape`：搜索 LinkedIn 和其他支持的招聘网站
- `/rank`：给职位评分（原文在此处截断，后续内容缺失）

从原文可确认的组织方式是“命令层 + 技能层”：命令文件放在 `.claude/commands/`，技能说明放在 `.claude/skills/`。但推文本身没有给出命令内容、技能配置、提示词或运行步骤，只能作为思路线索，不能作为可执行手册。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

原文没有给出可直接照做的完整步骤，因此不能整理出可靠的操作流程。只能确认以下命令名和仓库路径；在打开仓库核对前，不应直接照做。

1. 前提：需要能访问原文给出的 GitHub 仓库，并具备 Claude Code 使用环境（原文未说明具体版本或安装要求）。
2. 原文列出的命令入口如下：

```text
/setup – Builds your professional profile from your CV.
/scrape – Searches LinkedIn and other supported job portals for matching opportunities.
/rank – Scores jobs
```

3. 原文给出的配置文件路径如下（推文链接有换行，以下按原意拼接）：

```text
https://github.com/ai-job-search-dev/ai-job-search/blob/master/.claude/commands/setup.md
https://github.com/ai-job-search-dev/ai-job-search/blob/master/.claude/skills/job-scraper/SKILL.md
```

4. 上述路径只说明 `/setup` 由命令文件定义、抓取能力由 `job-scraper` 技能定义；具体如何调用、需要什么参数、输出什么格式、`/rank` 如何评分，原文均未展开。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. **能力发现**：原文显示 AI 可被用于从简历建立职业档案、搜索招聘网站、给职位评分。但这些只是命令名称和一句话说明，没有展示实际能力边界或效果。
2. **任务匹配**：原文体现了“slash 命令做流程入口、skill 做专门能力”的分层编排思路；`/setup` 对应简历建档，`/scrape` 对应职位抓取，`/rank` 对应职位评分。具体模型、工具参数和协作方式未给出。
3. **条件供给**：可确认需要简历作为输入，并涉及 LinkedIn 等招聘网站访问；还需要 Claude Code 的命令与技能配置。权限、登录、反爬、数据格式等条件原文未说明。
4. **主动推进**：原文没有证据表明该流程可由时间、事件或状态触发并持续运行；从命令形式看更像是手动逐步调用。
5. **效果验证**：原文只提到 `/rank` 会“Scores jobs”，没有给出评分标准、验证方法或改善指标。

## 与已有做法的关系

清单中没有相关条目。

## 证据与局限

- **证据**：推文给出了三个命令名、两个仓库文件路径，以及“从简历建档、搜索招聘网站、给职位评分”的流程轮廓。推文互动数据为 134 点赞、26 转发、2 回复。
- **局限**：原文在 `/rank – Scores jobs` 处截断，没有命令内容、技能配置、提示词、运行示例或结果数据。“cheat code”只是作者主张，未给出案例或量化效果。
- **适用条件**：需要能访问该仓库并具备 Claude Code 环境；招聘网站支持范围、账号权限、合规限制和评分可靠性均未知。

## 怎么试、怎么验证

最小试用方式：

1. 打开仓库，先阅读 `.claude/commands/setup.md` 和 `.claude/skills/job-scraper/SKILL.md`，确认实际命令、参数和依赖。
2. 用一份脱敏简历运行 `/setup`，检查生成的职业档案字段是否准确、是否遗漏关键经历。
3. 用少量关键词运行 `/scrape`，只在一个支持的招聘来源上测试，记录返回职位数量、相关职位比例和报错情况。
4. 取 10 个职位运行 `/rank`，先人工标注相关性，再对比自动评分排序与人工排序的一致性。

判断是否有改善的指标：

- 建档准确率：人工核对档案字段正确数 / 总字段数
- 抓取相关性：相关职位数 / 返回职位总数
- 评分一致性：自动排序前 N 个中人工认为相关的比例
- 时间节省：完成同样筛选任务所需时间对比
- 稳定性：运行失败次数、需要人工修正的次数
