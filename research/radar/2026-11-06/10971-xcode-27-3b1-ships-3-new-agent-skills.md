# @iosartem: Xcode 27.3b1 ships 3 new agent skills:

- 结论：**继续观察**。这条线索指向一个可能有用的可复用资产（Xcode 官方 agent skills 的第三方重打包仓库），但抓到的原文只有三个技能名称和一个 GitHub 链接，没有任何步骤、配置或提示词，暂时只能挂着，等拿到仓库内容再判断是否升级为 try。
- 原文：https://x.com/iosartem/status/2117706699486429516
- 来源：ingest:x，初筛相关度 2，依据推文正文（采集时保存）
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T15:02:10.948Z

## 是什么

原文是一条推文，称 Xcode 27.3b1 内置了 3 个新的 agent skills，并被「重打包给任意 agent 使用」：

- `macos-touch-gestures`：在 Mac app 中直接支持触控
- `siri-app-integration`：让 app 与 Siri 的模型协同工作
- `siri-evaluations`：测试 Siri 如何使用你的 App Intents

推文附带一个 GitHub 仓库卡片：`artemnovichkov/xcode-skills`（描述为「Agent skills from Xcode 27」）。

也就是说，本条的实际价值不在推文文本，而在于它指出「IDE/平台厂商开始以 agent skill 形式交付领域能力，且社区会把这些 skill 抽出来给任意 agent 复用」这一供给形态。**原文本身没有给出任何可照做的内容。**

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

原文未提供任何步骤、目录结构、SKILL 文件格式、安装命令或提示词，因此这里无法提炼可执行流程。以下是「为了拿到可执行内容需要先做的事」，属于调研动作而非原文内容：

1. **前提**：能访问 GitHub。打开推文中的仓库卡片指向的 `artemnovichkov/xcode-skills`。
2. 读取仓库 README，确认三个 skill 的目录组织方式（是否是 `skills/<name>/SKILL.md` 之类的约定）、以及它们是从 Xcode 安装包内抽取还是重写。
3. 逐个读 `macos-touch-gestures`、`siri-app-integration`、`siri-evaluations` 的 skill 正文，记录：触发条件（何时该用）、前置知识、给出的代码模板、验证方式。
4. 确认许可证与来源标注（是从 Xcode 内提取的官方内容还是作者原创），这决定能否直接纳入团队手册。
5. 若第 2–4 步能拿到具体 skill 文本，再回到本条目，把它升级为 try 并补齐「具体做法」小节。

在拿到上述内容前，任何关于「怎么用这三个 skill」的写法都会是编造。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

- **能力发现**：有线索但无细节。原文仅以名称表明三类任务已被 skill 化：Mac 触控手势接入、Siri/App Intents 集成、Siri 对 App Intents 使用方式的评估。这三类此前通常被视为「需要查文档、试错」的平台细节工作，现在被做成可交给 agent 的封装——但封装粒度与质量原文未说明。
- **任务匹配**：原文有一句关键主张「Repackaged for any agent」，即这些 skill 不绑定 Xcode 内的助手，可给任意 agent 用。至于换 agent 后是否需要改动、格式是否通用，原文无依据。
- **条件供给**：原文未提及任何信息、工具、权限、反馈要求。可合理推断的只有一点：`siri-evaluations` 这类技能必然需要可运行的 App Intents 工程和测试入口，但这属于推断，不是原文依据。
- **主动推进**：无依据。仅名称上 `siri-evaluations` 像是可反复执行的评估动作，但原文未说明是否可定时/事件触发。
- **效果验证**：无量化依据。`siri-evaluations` 的存在暗示「Siri 是否正确调用 App Intents」是可被自动检验的对象，但原文未给任何指标、通过标准或案例。

## 与已有做法的关系

清单中存在直接相关条目：**Agent skills（concept，状态 adopt）**。本条是该概念在 Apple/Xcode 生态中的一个具体实例，且额外提供了一个值得注意的形态——**厂商内置 skill 被第三方抽出、重打包为跨 agent 通用技能**。如果这个模式成立，它对清单中「条件供给」一栏有直接意义：能力可以以 skill 包的形式被分发和复用，而不必每个团队自己从头写。

清单中没有关于 Xcode、Siri、App Intents 或 macOS 开发的具体条目。

## 证据与局限

**原文给出的**：三个技能的名称与一句话功能描述；一句「Repackaged for any agent」；一个 GitHub 仓库链接卡片；互动数据（143 赞、8 转发、5 回复）。

**只是作者主张、未经验证的**：三个 skill 的实际能力边界、是否真的好用、跨 agent 复用是否需要改造、是否来自官方 Xcode 内容。推文没有任何演示、截图、代码或前后对比。

**局限**：抓取到的仅为推文正文，GitHub 仓库内容未获取；推文本身是典型的「新闻+链接」型内容，不含可操作信息。因此本条不能作为手册素材，只能作为待跟进线索。适用条件也未知——三个 skill 都强绑定 Apple 平台与 Xcode 27.3b1 这一 beta 版本，对非 Apple 技术栈的工作没有直接迁移价值（可迁移的是「skill 打包分发」这个模式，而非这三个 skill 本身）。

## 怎么试、怎么验证

**当前阶段的最小动作（信息侧）**：读完仓库中三个 skill 的正文，用一张表记录「触发条件 / 前置依赖 / 给出的模板或命令 / 是否含验证步骤」。若三个 skill 中有两个以上给出了可直接套用的代码模板或检查清单，即可把本条升级为 try。

**升级为 try 后的最小试用**：选一个已有 App Intents 的小工程，只用 `siri-evaluations` 一个 skill，让 agent 按 skill 内容生成并运行评估，人工不补充任何 skill 之外的信息，看它能否一次跑通。

**判断改善的指标**：

- 首次即跑通的比例（不追加人工提示的情况下）
- 需要人工纠正的轮次（对比不用 skill、直接让 agent 做的基线）
- 从「决定做这个功能」到「Siri 正确调用 App Intent」的耗时
- 换一个非 Xcode 内置的 agent 后，同一 skill 是否需要修改、修改量多大（这是验证「Repackaged for any agent」这一主张的关键实验）

若在无 skill 的情况下基线本就一次通过，则该 skill 无增量价值，应降级为 study 或 drop。
