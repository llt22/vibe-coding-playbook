# @danikkk_wqs: It's f*cking wild how many people still build their Claude + Obsidian setup by hand, when Obsidian's

- 结论：**继续观察**。先列为待验证线索：不要照推文直接搭环境；等拿到 kepano 的完整仓库与 README 后，在小范围 Obsidian 库中验证 Claude 生成 wikilinks、标签和链接的准确率，再决定是否采用。
- 原文：https://x.com/danikkk_wqs/status/2119405359362146622
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T09:01:03.440Z

## 是什么
这条推文称 Obsidian CEO kepano 已开源一套 “obsidian skills”，可让 Claude 不再写“坏 Markdown”，而是写符合 Obsidian 语法的内容，例如 wikilinks。原文只展示到第一项的第一句，随后截断；没有给出仓库地址、安装说明、技能文件内容或可复制的提示词。因此这里能确认的只是“有人在推 Claude + Obsidian 的现成 skills 方案”，不能确认具体工具形态和使用方法。

## 具体做法
原文没有给出可照做的步骤、命令、配置或提示词，无法整理成操作手册。可做的只有核验流程：
1. 前提：先找到推文所指的 kepano “obsidian skills”官方仓库/说明；原文未提供链接，不能凭推文直接安装。
2. 阅读 README，确认它支持的是 Claude Code、Claude 桌面端、API 还是其他形态，以及是否要求特定 Obsidian 版本。
3. 在 Obsidian 库的副本中试用，不要直接用于主库。
4. 用同一批笔记任务分别让 Claude 在“无 skills”和“有 skills”下生成内容，比较输出。
5. 只有完整说明和示例可复现后，才把安装步骤写入手册。

## 对应的研究问题
- 能力发现：推文主张 Claude 可通过 skills 生成 Obsidian 原生语法（如 wikilinks）；未提供样例验证。
- 任务匹配：只涉及 Claude + Obsidian 的笔记写作/整理场景；未说明适合哪个模型版本、工具组合或协作方式。
- 条件供给：暗示需要给 Claude 提供 Obsidian 相关 skills/工具说明；具体需要哪些文件、权限、反馈机制，原文未给出。
- 主动推进：无依据。
- 效果验证：无指标；只有“Claude stops writing broken Markdown”的作者主张，不能作为改善证据。

## 与已有做法的关系
清单中有 Obsidian（tool，状态 drop）。本条线索是 Claude 与 Obsidian 之间的 skills/输出规范方案，不是 Obsidian 软件本身；但已有条目已被评为 drop，说明除非本条能给出明确、可复现的增量做法，否则不应回补。清单中没有其他相关条目。

## 证据与局限
原文为 X 推文，互动数据为 853 likes、75 reposts、21 replies（采集数据）。作者称 kepano 开源了工具，并给出“obsidian skills · 51K stars”的说法，但这些数字和“CEO 开源”均未在材料内独立验证。原文在“wikilinks,”后截断，缺少仓库链接、安装步骤、技能内容、示例输出和对比数据。适用条件仅能推测为使用 Claude 处理 Obsidian 笔记的用户；在没有完整文档前，不能判断实际效果和兼容性。

## 怎么试、怎么验证
最小试用：拿到完整仓库说明后，在一个 Obsidian 测试库中，用同一组任务（新建笔记、添加 wikilink、标签、反向链接、整理标题层级）分别跑“普通 Claude”和“加载 obsidian skills 的 Claude”。判断指标：Obsidian 语法错误数、wikilink 可点击/可解析率、标签与链接是否符合库内规范、人工修正时间、一次通过率。若不能把错误率和修正时间明显降下来，就不应写入手册。
