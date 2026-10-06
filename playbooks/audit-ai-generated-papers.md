# 在投稿与审稿前，用 AI 找出论文里没人掌舵、没人核对的痕迹

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：论文由 AI 参与产出却无人负责时，如何在投稿前自查、在审稿时分诊，并让每条命中都落到可定位、可核对的对象上。
> 先试这一步：克隆仓库后用 ./install.sh --project 把两个 skill 装到项目内，先对自己的 2–3 篇论文跑一遍 python tools/slop_lint.py paper/ --source -o lint.md 和 paper-author-pass（audit 模式），人工复核命中。
> 最近修订：2026-10-06

## 解决什么问题

论文由 AI 参与产出、却没有任何人真正负责时，问题往往不在语言好不好看，而在三类“缺席”：没人润色（写作层 L）、没人掌舵（研究层 R）、没人核对（痕迹 / 引用层 P、R）。absent-author 这套工具把语言痕迹与研究 / 事实核验分开评分，要求每条命中都可定位、可核对，最终把判断交回给人：投稿前自查，稿件到手时分诊。

## 适用与不适用

适用：

- 学术论文与审稿流程：投稿前的作者自查、稿件到达时的审稿人 / AC 分诊。
- 确定性 lint 可脱离 agent，在命令行或 CI 独立运行，输出 lint.md。

不适用：

- 工具面向学术论文与审稿流程，不能直接外推到一般工作产出。
- 不得用于公开指控。审稿只陈述可核查缺陷，来源疑问以问题形式交给 AC。
- 不适用于同事投诉、学生纪律、招聘晋升等场景。
- 不能当作洗稿工具：仓库明说清单可能被这样滥用，且最多只能把 D 洗到 C。
- 语言痕迹对非母语写作者与首篇论文易误报（“Junior is not absent”），只允许在与研究或产物证据同现时计入。

## 前置条件

- 本机有 git 与 Python 3.9+（lint 无其他依赖）。
- 要跑 skill，需要有能读取 SKILL.md 的 agent（Claude Code、Codex 或同类），并能访问论文路径或全文。
- 作者侧需要“有一个能回答问题的人类”；否则进入 audit-only 模式，并拒绝润色一篇无人掌舵的论文（否则只是把 D 变成 C）。
- 审稿侧需先确认所在 venue 的审稿 LLM 政策允许。README 明确提示：ICML 2026 因审稿人违反自选的 no-LLM 政策而桌拒了 497 篇；该 skill 会先要求确认这一点。
- 两个 skill 共享同一份 references/evidence-catalog.md（由 EVIDENCE.md 同步）。

## 操作步骤

（共同准备）

1. 克隆仓库。前提：本机有 git。预期结果：得到本地仓库。

```bash
git clone https://github.com/THUROI0787/absent-author.git && cd absent-author
```

2. 安装两个 skill。默认装到 ~/.claude/skills；只想装在当前项目加 --project，装到 Codex 用 --codex，也可用 --dest DIR 指定目录、--link 做链接安装。小范围试用建议用 --project，避免污染全局环境。预期结果：paper-author-pass 与 paper-slop-screen 两个 skill 可用。

```bash
./install.sh                # both skills -> ~/.claude/skills  (or --project, --codex, --dest DIR, --link)
```

3. 不依赖 agent，先跑确定性 lint，产出可人工核对的候选清单（每处命中带文件、行号和片段）。前提：论文放在 paper/ 目录，或把路径换成你的目录。预期结果：生成 lint.md。

```bash
python tools/slop_lint.py paper/ --source -o lint.md
```

注意：lint 命中只是“候选”，一份干净的 lint 报告不能证明任何事。

（做法 A：投稿前作者自查）适合你本人是作者、且能回答 skill 提出的问题。

4. 在 agent 里用作者侧 skill 自查。前提：论文放在 paper/ 目录，且你本人能回答 skill 提出的问题。预期结果：产出作者决策问题、claim–evidence 映射、修改记录；你会得到“你能回答”和“你答不上来”两类问题清单。

```text
Use paper-author-pass on paper/ in audit mode. I'll answer your questions.
```

5. 签署前回答三个问题，skill 不替你回答。

- 你是否彻底理解它？
- 你是否能面对面为它辩护？
- 你是否愿意把名字署在它后面？

（做法 B：审稿人 / AC 对可疑稿件分诊）适合稿件已到你手上、且 venue 政策允许。

6. 先确认所在 venue 的审稿 LLM 政策允许。预期结果：确认可以继续；不允许就不要用该 skill。

7. 在 agent 里用审稿侧 skill 对可疑稿件分级。前提：已确认政策允许。预期结果：输出 W / R / Q 三级评分与 A–D 四象限；其中 R 层每条 flag 应是能用算术或引用存在性验证的事实。

```text
Use paper-slop-screen to triage this arXiv preprint: <path or id>
```

（仓库维护侧）

8. 维护证据清单时，中英两份文件要一起改，再同步并靠 CI 校验 ID 覆盖。

```bash
python tools/sync_evidence.py
```

怎么选：自己写的东西投稿前用做法 A；别人稿件到手用做法 B。两种做法都可以先跑第 3 步的 lint；lint 只给候选，判断始终由人做。

## 怎么判断变好了

最小试用方式（先小范围试用，不要直接采用）：

1. 用 ./install.sh --project 装到项目内，避免污染全局环境；
2. 取 2–3 篇自己写过的论文，跑 python tools/slop_lint.py 与 paper-author-pass（audit 模式），看是否产出“你能回答”和“你答不上来”两类问题清单；
3. 取 3–6 篇已知标签的论文（至少 1 篇纯人类、1 篇已知 AI 生成，最好含 1 篇 2026 年 pipeline 产物）跑 paper-slop-screen，把输出象限与已知标签对照。

可观察指标：

- lint 每处命中是否都能定位到具体文件、行号和可读片段；你人工复核后的真命中 / 误报比例；
- screen 的 R 层 flag 是否全部是可独立验证的事实（跨节数字不一致、引用查不到、承诺未做的分析），其中有多少被证明是你自己的误读；
- 诚实人类论文被判 C / D 的比例（误报率）——原文把误报列为最需要上报的类别；
- author-pass 结束后，“彻底理解 / 当面辩护 / 署名”三问中原本答不上来的问题数量是否下降；
- 对作者而言最硬的指标：修改后论文中“承诺但缺失的分析”“文本与表格不一致的数字”“无法溯源的引用”是否清零。

试多久：调研没有给出建议时长；它给出的前提是校准样本小且为 in-sample，作者自己也指出 2026 年 pipeline 论文几乎不触发这些语言痕迹。因此先用上面的对照结果决定是否扩大使用，而不是先定一个采用期限。

## 常见坑

- 把 lint 命中当结论。命中只是“候选”，一份干净的 lint 报告不能证明任何事。
- 把语言层结果当对外判断依据。规则是：语言证据只计入写作轴，永远不能提升研究等级；象限与 flag 只用于内部决定“下一步去核对什么”。
- 忽视校准的时代混杂。校准集为 59 篇 ChatGPT 之前的随机 arXiv 论文对 20 篇 AI 生成论文，作者自己也指出两篇 2026 年 Claude pipeline 论文几乎不触发这些语言痕迹。
- 误伤非母语作者与首篇论文（“Junior is not absent”）。语言痕迹只在与研究或产物证据同现时才允许计入。
- 审稿侧没确认 venue 的 LLM 政策就动手。
- 作者侧没有能回答问题的人类还硬跑：skill 会进入 audit-only 模式，并拒绝润色一篇无人掌舵的论文，否则只是把 D 变成 C。
- 证据清单中英两份只改一份，ID 覆盖对不上。
- 把它当洗稿工具，或用于公开指控、同事投诉、学生纪律、招聘晋升。

## 证据与来源

以下命令、提示词与数字均来自 THUROI0787/absent-author（MIT，41 stars）仓库的调研报告。

有数据支撑的部分：

- 83 条证据 ID（74 条四层证据 + 9 条“作者在场”迹象）；28 项 lint 检查。
- lint 校准集：59 篇 ChatGPT 之前的随机 arXiv 论文对 20 篇 AI 生成论文，其中尾随 -ing 从句 AUC 0.96、2024 年前后 AI 词汇 0.93、“not X but Y” 0.48、生造词候选 0.40。
- 一份 6 篇文档的盲测：人类 ACL 2018 论文判 A·W0 R0；非母语作者人类 2021 论文判 A·W0 R1；AI Scientist v2 及 v1 披露论文判 D·W2 R3；2026 自主 agent 论文判 D·W3 R3；2026 全自动 pipeline 论文判 C·W1 R3，并靠算术不一致与 2409.XXXXX 式引用被发现。
- 阅读 12 个开源自动研究 pipeline 推导指纹。
- 外部事件与文献：ICLR 2026（Pangram 估计 21% 审稿完全由 AI 生成、约 9% 投稿超过一半为 AI 文本）、COLM 2026 命名的 theoryslop 与 slopterpretability、TMLR 桌拒率从约 6% 升到约 53%、ICML 2026 因审稿 LLM 政策违规桌拒 497 篇、Liang et al. 2023 显示 AI 检测器把约 61% 非母语 TOEFL 作文误判为 AI 写。

属于作者主张而非实证：

- 把“缺席”分为没人润色 / 没人掌舵 / 没人核对的三分法、四象限及 B（可救）与 D（AI 浪费）的区分方式；
- “语言证据不得降低研究等级”的评分约定；
- “文本证明力递减、评估将转向披露的 AI 使用、可核查产物与当面辩护”的判断。

报告中给出的可复用判据示例：R01 失败方法改标签为 “audit / diagnostic” 且方法骨架仍在、R07 文中承诺却从未出现的分析、R09 跨节漂移的数字（“+16%” 实为 6.7%）、S02 每节都放在审稿人会攻击位置上的“忏悔式” caveat、S06 通不过替换检验的生造词、P03 编造作者列表或形如 arXiv:2409.XXXXX 的引用、H06 日志 / 代码 / 版本历史 / 带时间戳的预注册可作为反证。

## 依据的调研

- [THUROI0787/absent-author](../research/radar/2026-10-06/1579-thuroi0787-absent-author.md)：值得一试，建议小范围试用这套“AI 产出审核”组合：先克隆仓库、用 --project 安装两个 agent skill，对自有或公开论文跑确定性 lint（slop_lint.py）与作者侧 paper-author-pass，再用若干篇已知标签的论文跑审稿侧 paper-slop-screen 做校准。理由是原文给出了可直接执行的安装命令、运行命令和提示词，并把语言痕迹与研究/事实核验分开评分、要求每条命中可定位可核对；但校准样本小且 in-sample、2026 年 pipeline 论文几乎不留语言痕迹，效果尚不足以保证直接采用。
