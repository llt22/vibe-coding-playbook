# AI 使用研究：历史会话补查与恢复索引

整理日期：2026-09-30。目的：为 vibe-coding-playbook 升级为覆盖各种工作场景的 AI 使用研究项目，补回尚未稳定沉淀的历史资料、用户判断与研究线索。

首轮检索本机 Codex 会话及归档、Claude Code、OMP 和 Pi 会话，重点阅读 2026-09-22—29 的相关讨论；第二轮扩展到更早记录，对 1,710 个根会话文件进行筛选，再定点阅读相关材料，并与 dev-sharing、vibe-coding-playbook、jev-lab 及个人方法文件对照。这是按主题进行的补查，不是全部历史会话的逐条审计，也未重新联网验证历史报告中的产品数据和结论。

第二轮新增材料与明确缺口见 [补漏台账](supplement-audit.md)。想先看这项研究要解决什么问题，可直接读 [用户问题与研究方向](research-questions.md)。

## 阅读方式与证据边界

- 下文引用的用户原话可作为当时偏好、问题和纠正的证据。
- `recovered/` 是历史 AI 回答或报告的恢复副本。保留原表述，包括当时使用的“已核验”“推荐”等措辞；这些措辞不代表本次再次确认。
- 同一主题的多份报告可能相互继承，不能按报告数量算作独立证据。
- 外部资料链接是后续研究入口；只有重新检查来源或完成适用场景的验证后，才适合晋升为当前推荐。
- 原始会话保留在本地；本目录只归档研究材料、整理索引与来源定位。以 `~/` 开头的会话路径供原机器追溯，不是仓库内文件。
- `methods/` 只保存个人方法正文的历史快照，不安装或激活 Skill；原项目的架构、审批与执行规则也不因归档而成为本项目规则。

## 1. 找回的研究起点与用户纠正

### 2026-09-22：问题起点是“明明关注很多，却仍然漏掉好工具”

用户原话：

> 我已经非常关注这个 AI 相关的信息了，可是这个 ego lite 这个浏览器，我才前几天才发现，为什么

随后用户补充，实际发现路径是：先看到腾讯浏览器工具引发关注，再从 X 上试用者的比较反馈中发现 ego。

来源：提问：`~/.claude/projects/-user-home-WebstormProjects-project-rebuild/122cfdf4-9b14-4c49-8979-19f51983ce03.jsonl:3`、用户补充真实发现路径：`~/.claude/projects/-user-home-WebstormProjects-project-rebuild/122cfdf4-9b14-4c49-8979-19f51983ce03.jsonl:87`。

对新项目的启发：发现渠道需要覆盖比较、替代品、迁移和实际使用反馈，不能只依赖新品公告与榜单。历史 AI 对仓库年龄、传播原因等解释仍需核验。

### 2026-09-23：阿里手册的独立阅读与评价

用户提供了《AI Native 研发范式实践手册》PDF，先要求阅读，再追问“内容是水文吗”“核心是讲 vibe coding 还是讲 agent 怎么开发”；另一个会话要求阅读全文并讨论启发。

初次归档只包含综合报告中的阿里摘要，遗漏了原 PDF 和独立阅读记录。本次已补回[原 PDF](sources/alibaba-ai-native-handbook.pdf)及[四段历史阅读分析](recovered/alibaba-ai-native-handbook-reading-2026-09-23.md)。原件共 68 页，与用户当时上传的文件逐字节一致；历史分析仍保留其原有证据边界。

### 2026-09-23：明确要求历史补漏，调研方法才被做成 skill

这次会话承接了“只看今天会漏掉以前”的讨论，用户要求“那从今年 3 月开始扫”。之后又澄清，想沉淀的是“我们今天找 AI 相关的东西的这个事情”，不是只研究 OfficeCLI。

当时用户明确要求 `ai-tool-radar` 需要手动触发，并纠正了 skill 正本与跨工具注册方式。该规则描述的是这个已有 skill 的使用偏好；2026-09-30 提出的自动研究项目是新的项目方向，设计时应明确两者的职责。

来源：历史补漏要求：`~/.codex/sessions/2026/09/23/rollout-2026-09-23T09-46-57-01a0cbf1-d06c-7331-a4a2-46ec9798bdca.jsonl:9`、调研范围澄清：`~/.codex/sessions/2026/09/23/rollout-2026-09-23T09-46-57-01a0cbf1-d06c-7331-a4a2-46ec9798bdca.jsonl:166`、手动触发要求：`~/.codex/sessions/2026/09/23/rollout-2026-09-23T09-46-57-01a0cbf1-d06c-7331-a4a2-46ec9798bdca.jsonl:182`。

### 2026-09-25—27：兴趣范围已经超过代码生成

同一会话依次讨论了企业研发实践、沙箱、Software Factory、知识提取、组织采用 AI、代码现代化、办公文档工具和 Agent 组织管理，随后提出“我需要你写个 skill 去发现这类信息”，形成 `ai-engineering-radar`。

来源：创建发现方法的要求：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-25T02-05-09-112Z_01a0d64f-3078-7408-ac35-006bfd60ae42.jsonl:90`。七篇专题回答已汇集在[专题讨论恢复](recovered/topic-discussions-2026-09-25-27.md)。

### 2026-09-27：用户纠正了调研实现的过度复杂化

用户先要求“去 x 上检索”“用 ego 呀”。另一次会话里，用户明确纠正：

> 不是你写这么多干什么？……你就告诉他用 ego 打开 x 就完了嘛……

历史 AI 随后报告撤掉约 500 行专用抓取脚本，将研究方法交回 skill，浏览器操作交给现有 ego-browser。这里可靠的证据是用户的纠正及当时回复；本次没有复核所有已删除脚本的历史状态。

来源：指定 X 与 ego：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-27T03-11-41-180Z_01a0e0d8-d27c-774c-b1b5-5400e9290a2b.jsonl:232`、反对过度脚本化：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-27T03-20-50-340Z_01a0e0e1-33a4-718c-b231-484d192f743c.jsonl:390`。

对新项目的约束：先复用现有研究方法和浏览器能力。持续触发、状态记录与去重如确有需要，再增加最少的支撑，避免为每个信源重复实现工具。

### 2026-09-25—28：关注“是否真的有效”，不只关注介绍

围绕阿里 OpenCodeReview，用户明确问：

> 你帮我评价一下这个东西，它是真的能发挥作用呢，还是花架子

来源：评价要求：`~/.omp/agent/sessions/-WebstormProjects-project-rebuild/2026-09-25T02-03-18-957Z_01a0d64d-822d-7454-9c5b-8b89f6cae13e.jsonl:12`。09-28 的后续调研生成了代码审查工具比较报告。

对新项目的启发：要记录方法解决什么失败、依赖哪些条件、有没有独立或本地证据，不仅记录工具的功能说明。

## 2. 已恢复的材料

| 日期 | 文件 | 内容与用途 |
|---|---|---|
| 09-23 | [阿里《AI Native 研发范式实践手册》原 PDF](sources/alibaba-ai-native-handbook.pdf) | 用户提供的 68 页原件，保留完整文档 |
| 09-23 | [阿里手册独立阅读记录](recovered/alibaba-ai-native-handbook-reading-2026-09-23.md) | 内容梳理、可信度评价、定位澄清及阅读启发，含原文入口与会话定位 |
| 09-23 | [三月至九月历史回溯](recovered/ai-tool-historical-scan-2026-09-23.md) | Codex 返回的历史补漏结果，包含 OfficeCLI 等工具线索 |
| 09-23 | [OMP 工具雷达](recovered/ai-tool-radar-2026-09-23-omp.md) | 当期信号、历史回捞、采用证据与渠道缺口 |
| 09-24 | [Claude Code 工具雷达](recovered/ai-tool-radar-2026-09-24.md) | 另一轮工具清单与分类；与其他报告有重叠 |
| 09-25—27 | [七篇专题讨论](recovered/topic-discussions-2026-09-25-27.md) | 企业实践、知识提取、组织采用、办公文档与持续运行 |
| 09-27 | [Anthropic 与 Uber 早期研判](recovered/engineering-anthropic-uber-2026-09-27.md) | 长任务执行、反馈与运行环境 |
| 09-27 | [Uber 与 ASDLC 早期研判](recovered/engineering-uber-asdlc-2026-09-27.md) | 企业实践与方法框架；作为历史线索保存 |
| 09-27 | [X 层工程实践雷达](recovered/x-engineering-radar-2026-09-27.md) | 从 X 发现的观点、案例、论文及历史核验标注 |
| 09-28 | [代码审查工具雷达](recovered/code-review-radar-2026-09-28.md) | OpenCodeReview、PR-Agent、ast-grep、Greptile 等比较线索 |
| 09-29 | [工程研究综合报告](recovered/ai-engineering-radar-2026-09-29.md) | 11 个二级章节，涵盖编排、上下文、验证、环境、组织、工具协议、噪声与落地问题 |

第二轮补回的资料：

| 文件 | 补齐的内容 |
|---|---|
| [七份外部资料综合笔记](recovered/ai-native-engineering-reading-notes-2026-09-26.md) | 之前保存在另一项目中的跨资料梳理，含腾讯知乎入口 |
| [OfficeCLI 与研究方法](recovered/officecli-and-research-method-2026-09-23.md) | 办公交付场景、工具与方法分层 |
| [浏览器选型与用户纠正](recovered/browser-tools-and-scenario-correction-2026-09-17.md) | 依据真实使用场景比较，区分文档能力与本机实测 |
| [OpenCodeReview 原始讨论](recovered/open-code-review-original-discussion-2026-09-25.md) | 最初介绍和价值评价，补齐后续雷达之前的讨论 |
| [Skill、规则与研发方法](recovered/skills-and-working-methods-2026-06-to-09.md) | 团队配置、规则删减、评估，以及多个方法库的历史取舍 |
| [Agent 环境与持续工作](recovered/agent-harness-and-autonomy-2026-09.md) | Clawith、StaffDeck、Octop、Stencil、Microsoft Agent Framework |
| [办公工具与信息获取](recovered/tools-and-information-access-2026-05-to-09.md) | 办公、多模态、沙箱、检索、信源接入和工具成本 |
| [PageIndex 仓库线索](recovered/pageindex-source-lead-2026-09.md) | 从历史工具结果补回文档索引与检索来源，尚未独立研读或实测 |
| [Paseo 插件与跨项目接力](recovered/paseo-plugins-and-cross-project-handoff-2026-09.md) | 补回最近一轮插件讨论、跨项目接力的真实需求，以及后续失效反馈 |
| [Jev 工具评估](recovered/jev-tool-assessments-2026-09-18.md) | 代码评分、浏览器执行、上下文压缩；独立实验另有来源索引 |
| [工程雷达](methods/ai-engineering-radar.md)、[DeepSeek 实施方法](methods/deepseek-verified-implementation.md) | 两份个人方法的正文快照 |
| [O’Reilly 历史提取文本](sources/oreilly-scaling-ai-historical-text.txt) | 从四段工具结果恢复完整可见文本；原 PDF 与版式仍缺失 |

以上材料的会话来源、原文行号与归档校验值均在 [provenance.json](provenance.json) 中。其他已保存文档及仅登记来源的线索见 [补漏台账](supplement-audit.md)。

七篇专题对应的用户提供资料：

| 资料 | 原始入口 | 可研究的工作问题 |
|---|---|---|
| 腾讯工程实践 | [BestBlogs 文章入口](https://www.bestblogs.dev/article/217da0f037) | 如何组织复杂任务、保留上下文并验证效果 |
| Docker Sandbox Kit 与 Software Factory | [Docker 博客](https://www.docker.com/blog/docker-sandbox-kit-spec/)、[AI Coding Dictionary](https://www.aicodingdictionary.com/?term=software-factory) | 如何提供运行环境、触发和持续执行条件 |
| Hyper-Extract | [GitHub](https://github.com/yifanfeng97/Hyper-Extract/blob/main/README_ZH.md) | 文档资料如何变成可检索、可使用的知识 |
| Scaling AI Adoption in Engineering | [用户提供的 PDF 链接](https://github.com/lukeTheNeuromancer/-_Skill/blob/main/oreilly-scaling-ai-ebook.pdf) · [恢复的历史提取文本](sources/oreilly-scaling-ai-historical-text.txt) | 怎样让个人和组织实际采用 AI，并评估收益；历史版本正文到第 4 章 |
| Anthropic 代码现代化准备 | [原始文章入口](https://claude.com/blog/how-to-prepare-for-ai-driven-code-modernization-projects) | 执行前要明确什么，怎样建立独立验证条件 |
| GenOffice | [GitHub](https://github.com/genspark-ai/genoffice) | 怎样让 AI 交付可继续编辑和使用的办公文件 |
| Paperclip | [GitHub](https://github.com/paperclipai/paperclip) | 如何让 Agent 围绕职责和任务持续工作 |

## 3. 归档前与现有沉淀的对照

| 状态 | 内容 |
|---|---|
| 已有方法沉淀 | `ai-tool-radar` 和 `workflow-learning` 在 playbook 有副本，与本机个人正本内容一致 |
| 归档前仅个人 skill 有完整定义 | `ai-engineering-radar`、`deepseek-verified-implementation` 的正本在 `~/skills`；第二轮已补入 `methods/` 文本快照，未安装为仓库 Skill |
| 已有实践文章 | dev-sharing 的 Spec／Goal、验证闭环、工具搭建与分享文章 |
| 本次补回的具体成果 | 上表报告、阅读笔记与阿里手册原件；归档前，两个仓库的 Markdown 未检索到这些报告及所列具体专题的对应条目；现已收入本目录 |
| 已归并的偏好与问题 | 发现渠道、历史补漏、对花架子的怀疑、反对为搜索重复造脚本等，现见本索引及 [研究问题](research-questions.md) |

上述检索结论描述本次归档前的状态，不等于全电脑没有副本，也不表示 Git 历史从未保存。额外发现六月的 `dev-sharing/model-bench` 实验会话，当前目录已不存在；本轮未复核实验结果，不把它作为模型能力比较证据。

## 4. 综合报告恢复校验

原报告路径 `/tmp/ai-engineering-radar-2026-09-29.md` 在本次检查时不存在。

从原会话中的一次 `write`、28 次有成功结果的 `edit` 及两次确定性文本去重记录重建正文。三个失败的编辑没有计入。恢复过程没有执行历史 shell 命令。

恢复结果为 123,955 字节、606 个换行符、36 个标题，与会话最后的检查输出一致。该一致性及每次替换的唯一匹配支持恢复完整性，但不等于对文中外部事实的核验，也不是与一个另存原件进行哈希比对。

所有文件的来源会话、行号和恢复文件 SHA-256 见 [provenance.json](provenance.json)。

## 5. 对项目升级的直接输入

从这些会话可提取以下待研究问题，而不必让用户重新回忆：

1. 如何发现不在新闻流和榜单里的成熟能力？
2. 如何同时追踪新变化、历史遗漏与已有方法失效？
3. 哪些任务可以交给 AI，但因信息、工具、环境或反馈不足而没有发挥？
4. 如何让调研和其他持续工作获得可靠触发，并减少用户反复接力？
5. 哪些配置、skill 和编排确实有效，哪些只是增加维护成本？
6. 怎样把外部线索转成小范围试验，再转成可复用方法？

2026-09-30 的最新范围选择是：从一开始覆盖工作中使用 AI 的各种方式。编码材料作为已有样本，不应成为新项目的全部边界。
