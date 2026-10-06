# THUROI0787/absent-author

- 结论：**值得一试**。建议小范围试用这套“AI 产出审核”组合：先克隆仓库、用 --project 安装两个 agent skill，对自有或公开论文跑确定性 lint（slop_lint.py）与作者侧 paper-author-pass，再用若干篇已知标签的论文跑审稿侧 paper-slop-screen 做校准。理由是原文给出了可直接执行的安装命令、运行命令和提示词，并把语言痕迹与研究/事实核验分开评分、要求每条命中可定位可核对；但校准样本小且 in-sample、2026 年 pipeline 论文几乎不留语言痕迹，效果尚不足以保证直接采用。
- 原文：https://github.com/THUROI0787/absent-author
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-06T11:43:19.867Z

## 是什么

Absent Author（THUROI0787/absent-author，MIT，41 stars）是面向“AI 产出、无人负责”的论文的识别与自查工具集，含三部分：一份 83 条证据清单（EVIDENCE.md 英文镜像 / EVIDENCE_CN.md 中文母本，其中 74 条四层证据 + 9 条“作者在场”迹象）、两个 agent skill（paper-author-pass 面向投稿作者，paper-slop-screen 面向审稿人 / AC），以及一个确定性表面痕迹 lint（tools/slop_lint.py，28 项检查，校准于 79 篇论文，Python 3.9+、无依赖）。

它的诊断框架把“作者缺席”分三类：没人润色（写作层 L）、没人掌舵（研究层 R）、没人核对（痕迹/引用层 P、R）。审稿侧输出 W / R / Q 三级评分与 A–D 四象限；作者侧输出作者决策问题、claim–evidence 映射、修改记录，以及签署前的三问。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：本机有 git 与 Python 3.9+；若要跑 skill，需要有能读取 SKILL.md 的 agent（Claude Code、Codex 或同类）。

1. 克隆仓库。

```bash
git clone https://github.com/THUROI0787/absent-author.git && cd absent-author
```

2. 安装两个 skill。默认装到 ~/.claude/skills；只想装在当前项目加 --project，装到 Codex 用 --codex，也可用 --dest DIR 指定目录、--link 做链接安装。

```bash
./install.sh                # both skills -> ~/.claude/skills  (or --project, --codex, --dest DIR, --link)
```

3. 不依赖 agent，先跑确定性 lint，产出可人工核对的候选清单（每处命中带文件、行号和片段）。前提：论文放在 paper/ 目录，或把路径换成你的目录。

```bash
python tools/slop_lint.py paper/ --source -o lint.md
```

注意：lint 命中只是“候选”，一份干净的 lint 报告不能证明任何事。

4. 在 agent 里用作者侧 skill 自查（适合投稿前）。前提：论文放在 paper/ 目录，且你本人能回答 skill 提出的问题。

```text
Use paper-author-pass on paper/ in audit mode. I'll answer your questions.
```

5. 在 agent 里用审稿侧 skill 对可疑稿件分级。前提：先确认所在 venue 的审稿 LLM 政策允许——README 明确提示，ICML 2026 因审稿人违反自选的 no-LLM 政策而桌拒了 497 篇；该 skill 会先要求确认这一点。

```text
Use paper-slop-screen to triage this arXiv preprint: <path or id>
```

6. 维护证据清单时，中英两份文件要一起改，再同步并靠 CI 校验 ID 覆盖。

```bash
python tools/sync_evidence.py
```

7. 作者侧 skill 的固定收尾：签署前回答三个问题，skill 不替你回答。
   - 你是否彻底理解它？
   - 你是否能面对面为它辩护？
   - 你是否愿意把名字署在它后面？

## 对应的研究问题

- 能力发现：把通常不交给 AI 的三类工作交给 AI——确定性文本痕迹扫描、审稿侧的结构化分级与证据表、作者侧的引用/数字核验与 claim–evidence 映射。原文还给出可复用的判据示例：R01 失败方法改标签为 “audit / diagnostic” 且方法骨架仍在、R07 文中承诺却从未出现的分析、R09 跨节漂移的数字（“+16%” 实为 6.7%）、S02 每节都放在审稿人会攻击位置上的“忏悔式” caveat、S06 通不过替换检验的生造词、P03 编造作者列表或形如 arXiv:2409.XXXXX 的引用、H06 日志/代码/版本历史/带时间戳的预注册可作为反证。
- 任务匹配：分层匹配——规则明确、需可复现的写作层痕迹交给无模型依赖的 lint（28 项，按每千词归一，对照人类 p50 / p90 / p99）；需要读全文、跨表比对、核验引用的研究/事实层交给 agent skill；需要人负责的判断交给“skill 问、人决定”的作者侧流程。校准数据支持这一分层：语言痕迹并不稳定，2026 年的 Claude pipeline 论文几乎不触发这些痕迹，因此硬规则是“语言证据只计入写作轴，永远不能提升研究等级”。
- 条件供给：agent 需要能读 SKILL.md、能访问论文路径或全文；两个 skill 共享同一份 references/evidence-catalog.md（由 EVIDENCE.md 同步）；作者侧需要“有一个能回答问题的人类”，否则进入 audit-only 模式且拒绝润色一篇无人掌舵的论文（否则只是把 D 变成 C）；审稿侧需要先确认 venue 的 LLM 政策；lint 只需 Python 3.9+，无其他依赖。
- 主动推进：触发点是事件而非持续监控——投稿前的 author pass、稿件到达时的 screen、lint 可在命令行 / CI 独立运行并输出 lint.md；sync_evidence.py 配合 CI 做 ID 一致性校验，属仓库维护侧的自动检查。原文没有给出基于时间或状态轮询的持续巡检机制。
- 效果验证：给出校准与盲测两套量化证据，并把判定落到可核对对象上——每条命中带文件/行/片段，每条 flag 是能用算术或引用存在性验证的事实；最终输出 W/R/Q 等级、象限与 auditability 评级，交由人工决定。

## 与已有做法的关系

清单中的相关条目：Claude Code（adopt）、Agent skills（adopt）、arXiv（try）。本仓库正是把 agent skills 用于论文审核与自查的具体实例，运行载体是 Claude Code、Codex 或任何能读 SKILL.md 的 agent，处理对象是 arXiv 预印本及投稿。README 还借鉴了不在清单中的多个仓库：Master-cai/Research-Paper-Writing-Skills（反向提纲与 Claim | Evidence | Status 映射，来自彭思达的公开写作笔记）、wanshuiyin/Anti-Autoresearch（“风格印象不携带判定权重”的规则与防御式对冲阈值）、wanshuiyin/HERO-Anti-OverDefense、Kiterlin/anti-defensive-writing、lensback940701/Evidence-Bound-Press-Conference-Revision-Skill、Orchestra-Research/AI-Research-SKILLs（证据类型匹配主张类型、不凭记忆写 BibTeX）、markrussinovich/refchecker（按作者重合查引用）等。

## 证据与局限

原文给出的数据 / 案例：83 条证据 ID（74 条四层证据 + 9 条在场迹象）；28 项 lint 检查；校准集为 59 篇 ChatGPT 之前的随机 arXiv 论文对 20 篇 AI 生成论文，其中尾随 -ing 从句 AUC 0.96、2024 年前后 AI 词汇 0.93、“not X but Y” 0.48、生造词候选 0.40；一份 6 篇文档的盲测（人类 ACL 2018 论文判 A·W0 R0，非母语作者人类 2021 论文判 A·W0 R1，AI Scientist v2 及 v1 披露论文判 D·W2 R3，2026 自主 agent 论文判 D·W3 R3，2026 全自动 pipeline 论文判 C·W1 R3 并靠算术不一致与 2409.XXXXX 式引用被发现）；阅读 12 个开源自动研究 pipeline 推导指纹；外部事件与文献包括 ICLR 2026（Pangram 估计 21% 审稿完全由 AI 生成、约 9% 投稿超过一半为 AI 文本）、COLM 2026 命名的 theoryslop 与 slopterpretability、TMLR 桌拒率从约 6% 升到约 53%、ICML 2026 因审稿 LLM 政策违规桌拒 497 篇、Liang et al. 2023 显示 AI 检测器把约 61% 非母语 TOEFL 作文误判为 AI 写。

属于作者主张而非实证的：把“缺席”分为没人润色 / 没人掌舵 / 没人核对的三分法、四象限及 B（可救）与 D（AI 浪费）的区分方式、“语言证据不得降低研究等级”的评分约定、以及“文本证明力递减、评估将转向披露的 AI 使用、可核查产物与当面辩护”的判断。

适用条件与局限：校准样本小、为 in-sample、且存在时代混杂，作者自己也指出两篇 2026 年 Claude pipeline 论文几乎不触发这些语言痕迹；lint 命中只是候选，干净报告不能证明什么；语言痕迹对非母语写作者与首篇论文易误报（“Junior is not absent”），只允许在与研究或产物证据同现时计入；工具面向学术论文与审稿流程，不能直接外推到一般工作产出；仓库明说清单可能被滥用为洗稿工具（只能把 D 洗到 C）；不得用于公开指控（审稿只陈述可核查缺陷，来源疑问以问题形式交给 AC），也不适用于同事投诉、学生纪律、招聘晋升等场景。

## 怎么试、怎么验证

最小试用方式：
1. 克隆后用 ./install.sh --project 装到项目内，避免污染全局环境；
2. 取 2–3 篇自己写过的论文，跑 python tools/slop_lint.py 与 paper-author-pass（audit 模式），看是否产出“你能回答”和“你答不上来”两类问题清单；
3. 取 3–6 篇已知标签的论文（至少 1 篇纯人类、1 篇已知 AI 生成，最好含 1 篇 2026 年 pipeline 产物）跑 paper-slop-screen，把输出象限与已知标签对照。

判断有没有改善的指标：
- lint 每处命中是否都能定位到具体文件、行号和可读片段；你人工复核后的真命中 / 误报比例；
- screen 的 R 层 flag 是否全部是可独立验证的事实（跨节数字不一致、引用查不到、承诺未做的分析），其中有多少被证明是你自己的误读；
- 诚实人类论文被判 C / D 的比例（误报率）——原文把误报列为最需要上报的类别；
- author-pass 结束后，“彻底理解 / 当面辩护 / 署名”三问中原本答不上来的问题数量是否下降；
- 对作者而言最硬的指标：修改后论文中“承诺但缺失的分析”“文本与表格不一致的数字”“无法溯源的引用”是否清零。

使用纪律：不要用语言层结果（L 层命中、象限中的写作轴）作为对外判断依据；象限与 flag 只用于内部决定“下一步去核对什么”。
