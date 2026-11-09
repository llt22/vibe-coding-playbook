# How Stanford Teaches AI-Native Engineering — Mihail Eric, Monaco

- 结论：**值得研读**。建议作为课程与团队训练的设计参考来研读：最可借用的是“在真实仓库提补丁、由真实维护者 review”的训练/上岗方式，以及“让 agent 自测自己写的 diff”的理解门槛；但原文是播客文字稿，只在主题层面列出十周大纲，没有可直接照抄的命令、配置或提示词，且在第 9–10 周处截断，因此不进入手册的 adopt/try。
- 原文：https://latent.space/p/cs146s/
- 来源：rss:src-latent-space，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-09T02:00:04.055Z

## 是什么

Latent Space 的一期访谈（文字稿），嘉宾 Mihail Eric 是 Stanford CS146S《The Modern Software Developer》讲师，同时在 Monaco 负责 AI。内容分两块：一是这门课第二版的设计变化与十周大纲（从“写一个 coding agent”到“软件工厂”）；二是他在 Monaco 的工程实践——买 Devin 做 code review、自建 agent workspace、内部 agent Hal、code review 成为新瓶颈、后台 agent 与团队级基础设施。

注意：原文是自动转录的播客稿，在第十周“80–90% 的代码可以交给 agent 之后人还剩下什么”处被截断，课程材料、explain-diff 的实现、Monaco workspace 的细节都只在外部链接里，本文没有给出。

## 具体做法

原文没有命令、配置或提示词，下面是从叙述中可提炼的做法，每条注明前提与原文给出的颗粒度。

1. **把训练/上岗作业换成真实开源贡献**
   - 前提：能找到愿意配合的仓库维护者；参与者已有基本编程基础（作者明确说这门课不是入门课，算法等传统课程是前置）。
   - 做法：让学员向真实仓库提交补丁，由维护者本人 review，而不是在玩具仓库上跑一遍工具。作者的理由：agent 能在一下午实现一个 feature，但“维护者是否想要这个改动、代码为何这样行为、补丁还会破坏什么”仍要人来做，这正是初级工程师向资深工程师学习的过程。
   - 背景：第一轮课程的九个作业（如用 AI code review 工具对一个 repo 发 review 再评估反馈质量）被认为可以“one-shot”，因此第二轮改掉了。

2. **给 agent 写的补丁加一道“理解 diff”自测**
   - 做法：把改动转成可视化走查，然后对自己提问；“凡是需要重新打开代码才能回答的问题，就是你没理解的地方”。作者建议直接拿 agent 刚写的补丁试。
   - 前提与限制：原文只说这是 Geoffrey Litt 的 explain-diff skill，未给出提示词或实现细节，需要自行补。

3. **让代码库对 agent 友好（对应第 5 周）**
   - 关注点：服务边界的设计取舍、文档、可验证性。原文只到主题级，没有检查清单。

4. **用 harness 的定制面约束 agent（对应第 4 周）**
   - 原文点名的机制：AGENTS.md / CLAUDE.md 这类配置文件、hooks、sub-agents。同样只有主题，没有示例配置。

5. **把 agent 挂到 IDE 之外（对应第 8 周，后台 agent）**
   - 做法：在 CI/CD、代码库事件触发、SRE 类机器人里运行 agent；给它一个能跑起产品、复现故障、测试补丁的环境。Monaco 因自身云环境特殊，选择自建 agent workspace 而不是买现成的。
   - 参照案例（原文提到、细节在别处）：Ramp Inspect、Spotify 的自建版本、Stripe Minions。

6. **同一个 agent 系统对不同角色输出不同形态**
   - Monaco 的 Hal：工程师问“什么坏了”，得到的是可 review 的 PR；销售问“产品怎么工作”，得到的是能给客户讲的解释。作者的原话大意：给两个人同一堵调试日志，只服务了其中一个人。

7. **采购原则：“买来学，自建来留”**
   - Monaco 的实际选择：code review 产品评估后继续用 Devin；agent workspace 自建。可作为“哪些买、哪些自建”的判断启发，但原文未给出判断标准。

8. **团队级基础设施（对应第 9 周）**
   - 原文点名：LLM Gateway、MCP Portal（即 MCP 的规模化接入）。只有名词，没有部署方式。

9. **安全（对应第 7 周）**
   - 主张：自主 agent 带来新的攻击面（文中举了 Vercel、LLM gateway 被攻破的例子），需要专门讨论缓解手段；原文未展开具体手段。

## 对应的研究问题

- **能力发现**：把 agent 用在真实仓库的特征开发、故障调查并直接开 PR（Hal），以及让同一系统回答销售侧的产品问题；后台 agent 承担 CI/CD 与 SRE 类事件处理。
- **任务匹配**：明确划线——实现细节可以更多交给 agent，“这个改动该不该进项目、为什么这样写、会破坏什么”留给人（含维护者）。工具侧只提到学生普遍使用 coding agent、学校与厂商提供 license 和额外额度，没有模型/工具选择的具体对比。
- **条件供给**：agent 需要一个能运行产品、复现失败、测试补丁的工作区（Monaco 为此自建）；需要 agent-ready 的代码库（文档、可验证性、服务边界）；需要 AGENTS.md/hooks/sub-agents 等定制面；团队层面需要 LLM gateway 与 MCP portal。另有一个关键缺口：agent 只看得到当前代码，看不到“六个月前这个改动为什么被拒”，需要 Authority Map 式的意图/决策来源（原文引了 Basis 的 Authority Map，但未给实现）。
- **主动推进**：第 8 周整节讲事件/触发式后台 agent（代码库事件、CI/CD、SRE bot），并有 Ramp / Spotify / Stripe 的生产案例被点名——这是原文最直接对应“可持续自动推进”的部分，但只有案例名，没有架构细节。
- **效果验证**：Faros 研究——高 AI 采用团队合并的 PR 多 98%，同时 PR review 时间长 91%，说明吞吐上去后瓶颈会转移到 review；应对方向是可验证性设计与 agentic code review（第 6 周）。学员侧的自然验证是维护者是否接受补丁。

## 与已有做法的关系

- **Claude Code（adopt）**：第 1 周让学生从零写一个 Claude Code 克隆以理解 harness；CLAUDE.md 作为第 4 周的定制面之一被点名。
- **Harness Engineering（study）**：第 1 周的 harness 内部结构与工具循环，与该概念直接对应。
- **Context engineering（study）**：第 2 周讲大规模代码库下超出 vanilla prompting 的上下文工程。
- **Agent skills（adopt）**：第 3 周讲 skills——从简单工具扩展到“过程/流程”（procedures）。与清单条目同向，但本文只给主题名。
- **Cursor（watch）**：仅在“学生可能默认已有 Cursor license”一句中出现，无实质内容。
- **OpenClaw**：原文未提及。
- **Latent Space（adopt）**：本文即该来源，属于同一来源的常规产出。

## 证据与局限

**原文给出的数据与案例**：课程已开两轮，第二轮大纲有较大改动；第一轮是九个作业加一个 capstone；Faros 的 98% / 91% 两个数字；Monaco 评估后继续用 Devin、自建 agent workspace；Hal 的工程师/销售两种用法；Stripe Minions、Ramp Inspect、Spotify 内部系统作为生产案例被点名（细节不在这篇文章）。

**只是主张**：作者在课堂上做的一次举手式调查（“被问到的 Stanford 大二/大三学生都在用 agent”，他自己也说还没系统调查工具份额）；“维护者 review 比玩具作业更有教学价值”是教学判断；“买来学、自建来留”是经验法则；对初级工程师就业前景的判断是观点；十周大纲大部分只有标题。

**局限**：转录稿在第十周截断；课程大纲、作业细节、explain-diff 的提示词、Monaco workspace 的搭建方式都在外链中，本文无法据以复现。适用条件：面向已有编程基础的团队或课程，需要真实仓库与愿意配合的维护者；对大代码库、有 CI/CD 与 SRE 流程的组织更适用。

## 怎么试、怎么验证

最小试用（两周内可完成，不需要改课程）：

1. 选 1–2 个真实仓库和一个真实需求，让一名成员用 agent 完成补丁，交给自己团队里真实的 code owner review（不是自己 review 自己）。若没有内部仓库可试，可找一个熟悉的开源项目走一次真实的 issue/PR 流程。
2. 在提交前加一道“diff 自测”：不看代码回答三个问题——改了什么、为什么这么改、可能破坏什么。记录哪几个问题必须回看代码才能答上来。
3. 选一个仓库加一份 AGENTS.md（写明构建/测试/边界约定），再加一条 CI 触发或失败触发的后台 agent 任务（例如失败日志初筛），权限限定为只读加开 issue 或草稿 PR。

判断是否改善的指标：

- 补丁被接受率与返工轮次（对照试用前的同类任务）；
- “必须回看代码才能回答”的问题数随时间下降，说明理解在跟上产出；
- PR 从提交到合并的时长，以及其中的 review 等待时长——按 Faros 的提示，重点看 review 时间是否随产出上升而进一步恶化；
- 后台 agent 触发的任务里被人工采纳的比例（避免“看起来在跑”的自动化和噪声；如失败日志初筛被点击查看并定位到真问题的比例）。
