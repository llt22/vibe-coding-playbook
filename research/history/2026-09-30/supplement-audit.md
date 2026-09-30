# 第二轮补漏台账（2026-09-30）

本轮把检查范围从九月下旬扩展到本机可用的更早历史记录。对 Codex 普通与归档会话、Claude Code、OMP、Pi 共 1,710 个根会话文件进行程序筛选，获得 655 条主题或外链候选，再定点阅读相关正文，并与已有仓库文档对照。筛选排除了已识别的子代理目录和当前归档会话，但候选仍有噪声；数字表示检索规模，不表示逐条人工审计或完整覆盖全部聊天。

只收集与 AI 使用研究有关的内容。重复的报告、安装日志和无关业务开发对话未整体搬入。候选清单留在本机临时目录，不作为研究资料提交。历史记录中的工具调用和命令没有重放。

## 本轮新增归档

| 材料 | 补回内容 |
|---|---|
| [七份外部资料综合笔记](recovered/ai-native-engineering-reading-notes-2026-09-26.md) | 找到原来沉淀在 ProjectCore 项目的笔记，包含阿里、腾讯、Docker、O’Reilly、Anthropic 等资料的共识与分歧；原项目规则只保留为背景 |
| [OfficeCLI 与调研方法](recovered/officecli-and-research-method-2026-09-23.md) | 办公文件的真实交付、渲染检查、工具与方法分层 |
| [浏览器选型与用户纠正](recovered/browser-tools-and-scenario-correction-2026-09-17.md) | BrowserSkill / Playwright 比较，以及“结合我实际场景”的纠正 |
| [OpenCodeReview 原始评价](recovered/open-code-review-original-discussion-2026-09-25.md) | 补回后续雷达之前的介绍和“是否花架子”的讨论 |
| [Skill、规则与研发方法](recovered/skills-and-working-methods-2026-06-to-09.md) | TeamAI、Skill 评估、提示词删减、Matt Pocock、Spec Kit、Ponytail、Superpowers、SBA、Anthropic SDLC 等 |
| [持续工作与 Agent 配套环境](recovered/agent-harness-and-autonomy-2026-09.md) | Stencil、Clawith、StaffDeck、Octop、Microsoft Agent Framework 的历史比较 |
| [办公、工具与信息获取](recovered/tools-and-information-access-2026-05-to-09.md) | MiniMax Office、Qwen 多模态、Docker、Agent-Reach、PRAW、Semble、tgrep、SoL-Pi、ego、Paseo、OMP/Pi |
| [Paseo 插件与跨项目接力](recovered/paseo-plugins-and-cross-project-handoff-2026-09.md) | 补回最近一轮插件讨论、跨项目接力的真实需求，以及后续失效反馈 |
| [三个 Jev 工具评估](recovered/jev-tool-assessments-2026-09-18.md) | Review、浏览器操作、上下文压缩的原始分析 |
| [工程雷达方法快照](methods/ai-engineering-radar.md) | `~/skills/ai-engineering-radar/SKILL.md` 的正文快照 |
| [DeepSeek 实施方法快照](methods/deepseek-verified-implementation.md) | `~/skills/deepseek-verified-implementation/SKILL.md` 的正文快照 |
| [用户问题与研究方向](research-questions.md) | 补回验证盲区、规则失效、自动沉淀、渠道漏检、能力配套与触发等问题 |
| [O’Reilly 历史提取文本](sources/oreilly-scaling-ai-historical-text.txt) | PDF 原件缺失，但会话保留的提取文本已经完整拼回，见下文校验边界 |

方法快照没有安装或激活为 Skill，也没有改变个人正本。所有历史 AI 回答保留原来的判断，包括可能过时或夸大的地方；文件开头对明显的绝对化、数字和时间口径问题作了提示。这些材料不是当前推荐清单。

## 已在其他位置保存的资料

以下材料仍以原项目为正本，本轮建立来源入口，不复制整套实验、代码或全部文章版本。文件存在性和当前哈希已记录进 `provenance.json` 的 `referenced_assets`，不代表重跑实验或认可文中所有结论。

| 资料 | 本机入口 | 已有内容 / 本轮处理 |
|---|---|---|
| Jev 独立实验室 | `~/WebstormProjects/jev-lab/README.zh-CN.md` | 有原始数据、对照基线、负面结果和复现脚本；核对时仓库提交为 `c3da4d4`、工作区干净 |
| Jev 首轮验证 | `~/WebstormProjects/jev-lab/docs/jev-validation-2026-09-18.md` | 用实际延迟、成本、规则基线对照宣传；本轮仅索引，未复测 |
| Jev 后续研究 | `~/WebstormProjects/jev-lab/docs/jev-round11-2026-09-24.md` | 后续研究入口，相关原始证据在该仓库 `artifacts/round11-2026-09-24/` |
| JevTown 专题 | `~/WebstormProjects/jev-lab/docs/jev-jevtown-case-2026-09-24.md` | 实现审计、重放结果与作者宣称的区别 |
| Spec → Goal 实践 | `~/WebstormProjects/dev-sharing/docs/从 Spec 到 Goal：我如何用 AI 完成复杂需求开发.md` | 已有分享文章，保留原项目正本 |
| AI 时代的新敏捷 | `~/WebstormProjects/dev-sharing/docs/AI 时代的新敏捷：实现不再是瓶颈之后，研发流程怎么变？.md` | 定义、验证与研发流程的变化；另补回 Anthropic 原文讨论 |
| 工具、Skill 与工程实践分享 | `~/WebstormProjects/dev-sharing/docs/第三次分享-Vibe Coding 实用技巧：工具、Skill 与工程实践.md` | 工具链和飞书 CLI 等已有材料 |
| Tavily、OMP、浏览器等工具说明 | [playbook 工具文档](../../../tools/agent-tools.md) | 保留现有入口；不把重复安装讨论全量复制 |
| AI 工具雷达与流程沉淀 | [ai-tool-radar](../../../skills/ai-tool-radar/SKILL.md)、[workflow-learning](../../../skills/workflow-learning/SKILL.md) | 仓库已有方法正文，前一轮已对照个人正本，无需重复快照 |

## 另外找回的来源线索

下表表示“找到过这份资料/讨论”，不是“本次已深入核验”。对于直接服务其他项目的长篇比较，只保存来源入口；对于以安装、配置为主的会话，不复制运行环境信息。

| 线索 | 历史时间 | 处理与用途 |
|---|---|---|
| Tencent WeKnora：[README_CN.md](https://github.com/Tencent/WeKnora/blob/main/README_CN.md) | 2026-09-04 | 知识与检索能力；源会话的助手回答在第 62 行，以原会话保留，不复制整段 ProjectCore 竞品分析。 来源：`~/.codex/sessions/2026/09/04/rollout-2026-09-04T23-53-45-01a06d20-3fb3-77e2-be46-1bf74024c602.jsonl:43`。 |
| Agents API：[Agents API](https://openai.com/index/introducing-the-agents-api/) | 2026-09-11 | 持续执行环境与产品命名的讨论；助手原回答第 309 行，保留为待重验来源，不据历史回复说明当前产品能力。 来源：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-11T10-25-31-432Z_01a09000-4328-7294-91e9-f53e0ab6e4ef.jsonl:294`。 |
| Fastclaw：[fastclaw](https://github.com/fastclaw-ai/fastclaw) | 2026-09-08 | Agent 运行时线索；原回答第 551 行，主要针对当时平台选型。 来源：`~/.codex/sessions/2026/09/08/rollout-2026-09-08T00-10-51-01a07ca2-fd5a-7c41-b806-241cae1873b7.jsonl:536`。 |
| Pi 插件与缓存配置：[.pi](https://github.com/cap153/config/tree/main/pi/.pi)<br>[pi-web-access](https://github.com/nicobailon/pi-web-access)<br>[pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter)<br>[ida-pro-mcp](https://github.com/mrexodia/ida-pro-mcp)<br>[pi-powerline-footer](https://github.com/nicobailon/pi-powerline-footer)<br>[pi-cache-optimizer](https://github.com/jiangge/pi-cache-optimizer)<br>[plan-mode](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/plan-mode) | 2026-09-03 | 保存用户给出的项目列表；配置会话中曾把公开模板误当本机实际配置，不将初始结论当事实。 来源：`~/.pi/agent/sessions/--user-home-WebstormProjects-api-dash--/2026-09-03T00-37-03-318Z_01a064b2-a0d6-7eb5-bd79-cfb8888efc1c.jsonl:4`。 |
| Superset：[superset](https://github.com/superset-sh/superset) | 2026-09-17 | 主要是安装清理和 Skill 管理讨论，用户说明曾主动安装；不采信助手关于安装来源的猜测。 来源：`~/.claude/projects/-user-home-WebstormProjects-api-dash/c29e503a-992f-4d80-ab46-2b9a9bfa9ea6.jsonl:186`。 |
| Laya MLX：[laya-mlx](https://github.com/mizorewww/laya-mlx) | 2026-09-20 | 语音与本机模型能力线索；本轮只登记来源，未验证本机效果。 来源：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-20T06-38-57-619Z_01a0bd8a-1253-769d-8795-8f2f10a50606.jsonl:54`。 |
| Laya 模型：[laya](https://huggingface.co/convaiinnovations/laya) | 2026-09-20 | 与 Laya MLX 同一研究链，不按两个独立证据计算。 来源：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-20T06-38-57-619Z_01a0bd8a-1253-769d-8795-8f2f10a50606.jsonl:5`。 |
| RealReplicaBench：[RealReplicaBench](https://github.com/Accio-org/RealReplicaBench) | 2026-08-20 | 用户转来一篇讨论真实工作任务评测的文章；只登记基准入口，文内成绩未核验，避免把转述当原始数据。 来源：`~/.omp/agent/sessions/-WebstormProjects-blog-drafts/2026-08-20T08-26-00-496Z_01a01e46-efb0-7000-8dc5-e0e681e3946b.jsonl:23`。 |
| i-have-adhd：[README.zh-CN.md](https://github.com/ayghri/i-have-adhd/blob/main/.github/readme/README.zh-CN.md) | 2026-08-31 | 个人任务组织与界面参考线索；本轮只登记，不据此提出新产品方向。 来源：`~/.omp/agent/sessions/-WebstormProjects-project-ai/2026-08-31T06-14-42-226Z_01a05674-ad32-7402-8d5a-bc5998cfae0f.jsonl:6`。 |
| Tavily Skills：[skills](https://github.com/tavily-ai/skills) | 2026-07-01 | 工具方法分层与配置讨论；已有工具文档覆盖，原会话中途被打断，不包装成完整独立报告。 来源：`~/.codex/sessions/2026/06/30/rollout-2026-06-30T09-54-36-019f163c-438b-79d3-a86e-09f2a80f23ba.jsonl:630`。 |
| GPT-5.5 Prompt Guidance：[prompt-guidance?model=gpt-5.5](https://developers.openai.com/api/docs/guides/prompt-guidance?model=gpt-5.5) | 2026-06-16 | 历史提示词来源，助手回答第 1858 行；版本相关内容待使用时重新核验。 来源：`~/.codex/sessions/2026/06/15/rollout-2026-06-15T17-57-03-019ecab6-919f-7840-b421-441c0883a0d7.jsonl:1839`。 |
| 飞书 CLI：[README.zh.md](https://github.com/larksuite/cli/blob/main/README.zh.md) | 2026-06-04 | 已有 dev-sharing 文章覆盖；用户业务任务和消息操作不搬入研究归档。 来源：`~/.omp/agent/sessions/-WebstormProjects-portal-f/2026-06-04T06-42-49-746Z_019e915e-cd11-7000-afcd-2c922a25d5e4.jsonl:4`。 |

## O’Reilly 文本恢复与剩余缺口

- 用户给出的原始入口：[Scaling AI Adoption in Engineering PDF](https://github.com/lukeTheNeuromancer/-_Skill/blob/main/oreilly-scaling-ai-ebook.pdf)。历史版本为 Early Release，已读正文到第 4 章；后续部分只有目录，不能写成已读完整成书。
- 当时下载的 `/tmp/oreilly-scaling-ai-ebook.pdf` 与 `/tmp/oreilly-scaling-ai.txt` 现已不存在。本次公开 raw 入口请求 60 秒超时、未收到内容；另一下载请求未取得可验证产物。没有把重新下载伪称为找回原件。
- 原会话第 60、63、66、69 行的工具结果覆盖显示行 1—1501，重叠行 253、603、1003 完全一致。去掉工具行号后，拼接为 1,500 个换行，与当时第 57 行 `wc -l` 输出一致。入库时仅规范化行尾空白并移除末尾多余空行，归档文本保留 1,499 个换行；恢复前后哈希分别记录。
- 因此恢复了**当时会话可见的完整提取文本**，但没有原文件哈希可对照，不能声称与原 PDF 或 `pdftotext` 输出逐字节一致。提取文本不保留 PDF 的封面、图片和排版。
- 阅读分析已在 [七篇专题讨论](recovered/topic-discussions-2026-09-25-27.md) 中；原 PDF / 版式仍是明确缺口。

## 本轮未覆盖的部分

1. 本轮是按主题筛选后定点阅读，没有人工逐条审计全部历史；未恢复已物理删除且无日志记录的会话，也没有检查云端未同步的聊天。
2. 早期 `dev-sharing/model-bench` 本地目录已不存在。找到实验讨论不等于恢复实验结果，本轮不拿它证明模型强弱。
3. 阿里 PDF 原件已在前一轮归档；其他网页、GitHub 仓库和 X 帖子主要保留入口与历史分析，没有做全站离线镜像，也没有重新执行历史测试。
4. 日期多数沿用会话记录；个别会话的 UTC 时间与本机日期相差一天，应以具体来源记录核对。

下次补漏应从本台账的“来源线索 / 剩余缺口”继续，避免重新扫描全部会话。后续新研究先围绕 [研究问题](research-questions.md) 选择工作场景，再验证工具或方法能否改善该场景。
