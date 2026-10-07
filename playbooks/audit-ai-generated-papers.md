# 论文交稿前：把引用和 AI 痕迹核到可复查

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：这篇手册解决论文交稿前参考文献不可溯源、AI 参与痕迹无人负责、审稿分诊缺少可核查证据的问题。
> 先试这一步：先在一篇在写的论文上跑 `uvx paper-preflight check <项目> --lang zh --details`，逐条人工复核误报，再决定是否接入流程。
> 最近修订：2026-10-08

## 解决什么问题

论文由 AI 参与产出、却没有任何人真正负责时，问题往往不在语言好不好看，而在三类“缺席”：没人润色（写作层 L）、没人掌舵（研究层 R）、没人核对（痕迹 / 引用层 P、R）。absent-author 把语言痕迹与研究 / 事实核验分开评分；paper-preflight 则把参考文献拉到真实学术记录里逐条核对，说不清时明说“cannot determine”。两者合起来，把“引用能不能溯源、AI 痕迹能不能定位、作者能不能回答”变成交稿前可复查的候选清单，最终判断仍交回给人。

## 适用与不适用

适用：

- 学术论文与审稿流程：投稿前的作者自查、稿件到达时的审稿人 / AC 分诊。
- 交稿前的参考文献事实核验：存在性、元数据一致性、撤稿、预印本是否已正式发表。
- 确定性 lint 可脱离 agent，在命令行或 CI 独立运行，输出 lint.md；paper-preflight 也可用命令行、pre-commit、GitHub Actions 或 MCP 接入。

不适用：

- 两个工具都面向学术论文写作与审稿流程，不能直接外推到一般工作产出。
- absent-author 不得用于公开指控。审稿只陈述可核查缺陷，来源疑问以问题形式交给 AC。
- paper-preflight 只做记录层面核验，不替你判断研究贡献或作者责任。
- 不适用于同事投诉、学生纪律、招聘晋升等场景。
- absent-author 不能当作洗稿工具：仓库明说清单可能被这样滥用，且最多只能把 D 洗到 C。
- 语言痕迹对非母语写作者与首篇论文易误报（“Junior is not absent”），只允许在与研究或产物证据同现时计入。
- paper-preflight 自述仍是 v0.4 早期版本，有已知误报与漏检；不能把退出码 0 当成“论文绝对干净”，也不能把未确认引用当成“引用错误”。

## 前置条件

- 本机有 git 与 Python 3.9+（absent-author lint 无其他依赖）。
- 要跑 absent-author skill，需要有能读取 SKILL.md 的 agent（Claude Code、Codex 或同类），并能访问论文路径或全文。
- 要跑 paper-preflight，本机有 Python 3.11–3.14；除 `--offline` 外需要能访问 Crossref、dblp、arXiv、DataCite、PubMed、OpenAlex 等学术 API；要有论文源文件，或参考文献文本 / PDF / arXiv ID。
- 作者侧需要“有一个能回答问题的人类”；否则进入 audit-only 模式，并拒绝润色一篇无人掌舵的论文（否则只是把 D 变成 C）。
- 审稿侧需先确认所在 venue 的审稿 LLM 政策允许。README 明确提示：ICML 2026 因审稿人违反自选的 no-LLM 政策而桌拒了 497 篇；该 skill 会先要求确认这一点。
- 两个 absent-author skill 共享同一份 references/evidence-catalog.md（由 EVIDENCE.md 同步）。

## 操作步骤

（共同准备）

1. 克隆 absent-author 仓库并安装两个 skill。前提：本机有 git。预期结果：得到本地仓库，paper-author-pass 与 paper-slop-screen 两个 skill 可用。小范围试用建议用 `--project`，避免污染全局环境。

```bash
git clone https://github.com/THUROI0787/absent-author.git && cd absent-author
./install.sh --project
```

2. 确认 paper-preflight 可用。前提：本机有 Python 3.11–3.14。预期结果：能跑 check 与 doctor；用 uvx 无需安装，或安装到本机。

```bash
pip install paper-preflight
paper-preflight doctor
```

3. 不依赖 agent，先跑 absent-author 确定性 lint，产出可人工核对的候选清单（每处命中带文件、行号和片段）。前提：论文放在 paper/ 目录，或把路径换成你的目录。预期结果：生成 lint.md。注意：lint 命中只是“候选”，一份干净的 lint 报告不能证明任何事。

```bash
python tools/slop_lint.py paper/ --source -o lint.md
```

（做法 A：交稿前作者自查）适合你本人是作者、且能回答 skill 提出的问题。先核引用，再核 AI 痕迹与作者责任。

4. 用 paper-preflight 做参考文献事实核验。前提：有论文源文件、参考文献文本、PDF 或 arXiv ID。预期结果：每条引用会给出存在性、是否与文中写法一致、是否已被撤稿、预印本是否已正式发表等发现；说不清时输出 REF090 并附原因。

```bash
uvx paper-preflight check path/to/paper --lang zh --details
```

没有 `.bib` 的 arXiv 源码项目会从编译出的 `.bbl` 读取。材料形式不同时换输入：

```bash
uvx paper-preflight check references.txt
pbpaste | uvx paper-preflight check -
uvx paper-preflight check arxiv:2607.06922
uvx --from 'paper-preflight[pdf]' paper-preflight check paper.pdf
```

常用选项：`--format json` / `--format sarif` 输出机器可读结果；`--offline` 只用本地缓存；`--refresh` 忽略缓存重问；`--fail-on warning` 让 warning 也失败；`--details` 列出每一条发现；`--lang zh` 中文消息。

退出码要读懂，尤其 2：0 表示没有达到 `--fail-on` 门槛的发现；1 表示有阻断性发现；2 表示没有阻断性发现，但某个源不可用且没有别的源顶上，所以这篇论文还不能说干净；3 表示用法错误。2 不等于通过。

5. 逐条看规则，而不是只看“有没有 error”。前提：已经跑过一次完整联网检查。预期结果：知道每条发现对应什么可核查缺陷。

```bash
paper-preflight explain REF003
```

常见规则：REF001 DOI 或 arXiv ID 指向另一篇论文；REF002 DOI 或 arXiv ID 不存在；REF003 所有源都答“没有”；REF004/REF005 被撤稿或有 expression of concern / 更正；REF010–REF014 作者、标题、年份或会议与真实记录不一致；REF015 引用的预印本已正式发表；REF016 注册库有 DOI 而条目缺；REF017 标识符写法导致链接失效；CIT001–CIT008 引用键未定义、重复、未被引用、近似重复、`.bib` 语法错误；REF090 无法判定并附原因。

6. 条目不要凭记忆写：用 `bib fetch` 取已验证条目。前提：有 DOI、arXiv ID 或标题。预期结果：每个字段来自注册库记录，条目上方注释注明来源。

```bash
paper-preflight bib fetch 1810.04805
```

```bibtex
% Verified with paper-preflight against dblp (conf/naacl/DevlinCLT19), 2026-10-03
@inproceedings{devlin2019bert,
  title         = {{BERT:} Pre-training of Deep Bidirectional Transformers for Language Understanding},
  author        = {Devlin, Jacob and Chang, Ming-Wei and Lee, Kenton and Toutanova, Kristina},
  booktitle     = {NAACL-HLT (1)},
  year          = {2019},
  doi           = {10.18653/v1/n19-1423},
  eprint        = {1810.04805},
  archivePrefix = {arXiv},
}
```

预印本：已正式发表的 arXiv 预印本会返回正式发表版本，并保留 `eprint` 字段（要预印本本身用 `--prefer preprint`）。标题检索用 `--title`（必要时配 `--author`/`--year`），多篇匹配时列出候选而不替你选。撤稿作品会带警告。给脚本 / agent 用 `--format json`。

7. 让工具改 `.bib`，但先只看 diff。前提：已发现需要修复的标识符或元数据。预期结果：它打印 diff，只有加 `--apply` 才会写文件。默认 `--level safe` 只修不会改变“引的是哪一篇”的东西：写法导致链接失效的标识符，以及注册库有而条目缺的 DOI。`--level unsafe` 还会按记录改写作者、标题、年份、会议，并删掉指向另一篇作品的标识符，先看 diff。

```bash
paper-preflight bib fix path/to/paper --level safe
paper-preflight bib fix path/to/paper --level unsafe
paper-preflight bib fix path/to/paper --level unsafe --apply
```

只改受影响的字段；注释、格式、行尾、编码保留。谁都找不到的文献永远不会被“修”——只有你知道原意。

8. 已核实过的告警就地静音。前提：你已人工确认某条告警是误报且有原因。预期结果：判定仍留在 JSON 报告里，只是这条 finding 被丢弃。没静音任何东西的抑制会报为 CFG001（info），避免过期注释堆积。

```bibtex
% preflight: ignore[REF003] reason="internal technical report, not indexed anywhere"
@techreport{lab2024internal,
  ...
}
```

参考文献规则只在一次完整联网运行后才判定，因为离线答案和源中断可能让规则没跑。

9. 在 agent 里用作者侧 skill 自查。前提：论文放在 paper/ 目录，且你本人能回答 skill 提出的问题。预期结果：产出作者决策问题、claim–evidence 映射、修改记录；你会得到“你能回答”和“你答不上来”两类问题清单。

```text
Use paper-author-pass on paper/ in audit mode. I'll answer your questions.
```

10. 签署前回答三个问题，skill 不替你回答：你是否彻底理解它？你是否能面对面为它辩护？你是否愿意把名字署在它后面？

11. 可选：把 paper-preflight 装进 coding agent，让它在“收尾”时自动检查。前提：使用 Claude Code、Codex、Gemini CLI、Copilot、Cursor 等 agent。预期结果：Claude 在宣布论文完成前检查参考文献、只修有证据的错误、绝不编造参考文献。

```bash
claude plugin marketplace add amos689/paper-preflight
claude plugin install paper-preflight@paper-preflight
```

```bash
npx skills add amos689/paper-preflight
gh skill install amos689/paper-preflight paper-preflight
```

MCP 客户端：

```bash
paper-preflight mcp
```

12. 可选：挂到提交 / 推送时机上。前提：已有版本控制与 CI。预期结果：pre-commit 每次提交在几秒内检查引用键和缓存判定；GitHub Actions 每次 push 检查，报告进 job summary，可选 code-scanning 告警。

```yaml
uses: amos689/paper-preflight@main
```

13. 可选：设免费凭证让结果更快更全。前提：不设账号也能用。预期结果：Crossref polite pool 更快更可靠；OpenAlex 额度更大，用于撤稿检查；Semantic Scholar 作为兜底源。值不会被打印或记录日志。

```text
PAPER_PREFLIGHT_EMAIL   Crossref polite pool：更快更可靠
OPENALEX_API_KEY        更大的 OpenAlex 额度，用于撤稿检查
S2_API_KEY              把 Semantic Scholar 作为“别人都没找到”时的兜底源
paper-preflight doctor
```

14. 实验性：找出每条引用背后的原文段落。前提：先装 extra。预期结果：输出只有“confirmed”（逐字引用段落）或“could not confirm”（附原因：无全文、只有摘要、没有足够接近的段落）。它从不说某条引用是错的。

```bash
pip install "paper-preflight[support]"
paper-preflight support path/to/paper --download-model --all
```

（做法 B：审稿人 / AC 对可疑稿件分诊）适合稿件已到你手上、且 venue 政策允许。

15. 先确认所在 venue 的审稿 LLM 政策允许。预期结果：确认可以继续；不允许就不要用该 skill。

16. 在 agent 里用审稿侧 skill 对可疑稿件分级。前提：已确认政策允许。预期结果：输出 W / R / Q 三级评分与 A–D 四象限；其中 R 层每条 flag 应是能用算术或引用存在性验证的事实。

```text
Use paper-slop-screen to triage this arXiv preprint: <path or id>
```

17. 如稿件有源文件或参考文献列表，可用 paper-preflight 做引用存在性 / 撤稿核验，只作为可核查缺陷，不用于公开指控。预期结果：得到可定位到具体条目的引用问题。

```bash
uvx paper-preflight check path/to/suspicious-paper --lang zh --details
```

（仓库维护侧）

18. 维护 absent-author 证据清单时，中英两份文件要一起改，再同步并靠 CI 校验 ID 覆盖。

```bash
python tools/sync_evidence.py
```

怎么选：自己写的东西投稿前用做法 A；别人稿件到手用做法 B。两种做法都可以先跑 absent-author lint 和 paper-preflight；lint 与 preflight 输出只给候选，判断始终由人做。引用核验优先用 paper-preflight，AI 痕迹与作者责任优先用 absent-author。

## 怎么判断变好了

最小试用方式（先小范围试用，不要直接采用）：

1. 用 `./install.sh --project` 装到项目内，避免污染全局环境。
2. 取 2–3 篇自己写过的论文，跑 `python tools/slop_lint.py` 与 `paper-author-pass`（audit 模式），看是否产出“你能回答”和“你答不上来”两类问题清单。
3. 同时用 `uvx paper-preflight check <项目> --lang zh --details` 跑同一批论文，逐条人工复核引用发现，记录真命中 / 误报；再用 `bib fetch` 替换掉凭记忆写的条目。
4. 取 3–6 篇已知标签的论文（至少 1 篇纯人类、1 篇已知 AI 生成，最好含 1 篇 2026 年 pipeline 产物）跑 `paper-slop-screen`，把输出象限与已知标签对照。

可观察指标：

- paper-preflight：每 100 条引用的误报次数（原文最新一批真实论文约 1.3 次，仍要人工复核）；退出码 2 的比例（源不可用导致不能判干净）；引用存在性、元数据一致、撤稿、预印本已发表等发现是否都能定位到具体条目；`bib fetch` 取回的条目是否替换掉凭记忆写的条目。
- absent-author lint：每处命中是否都能定位到具体文件、行号和可读片段；你人工复核后的真命中 / 误报比例。
- screen 的 R 层 flag 是否全部是可独立验证的事实（跨节数字不一致、引用查不到、承诺未做的分析），其中有多少被证明是你自己的误读。
- 诚实人类论文被判 C / D 的比例（误报率）——原文把误报列为最需要上报的类别。
- author-pass 结束后，“彻底理解 / 当面辩护 / 署名”三问中原本答不上来的问题数量是否下降。
- 对作者而言最硬的指标：修改后论文中“承诺但缺失的分析”“文本与表格不一致的数字”“无法溯源的引用”是否清零。

试多久：absent-author 调研没有给出建议时长；它给出的前提是校准样本小且为 in-sample，作者自己也指出 2026 年 pipeline 论文几乎不触发这些语言痕迹。paper-preflight 自述是 v0.4 早期版本，有已知误报与漏检，作者把误报列为最希望收到的反馈。因此先用上面的对照结果决定是否扩大使用，而不是先定一个采用期限。

## 常见坑

- 把 lint 命中当结论。命中只是“候选”，一份干净的 lint 报告不能证明任何事。
- 把语言层结果当对外判断依据。规则是：语言证据只计入写作轴，永远不能提升研究等级；象限与 flag 只用于内部决定“下一步去核对什么”。
- 忽视 absent-author 校准的时代混杂。校准集为 59 篇 ChatGPT 之前的随机 arXiv 论文对 20 篇 AI 生成论文，作者自己也指出两篇 2026 年 Claude pipeline 论文几乎不触发这些语言痕迹。
- 误伤非母语作者与首篇论文（“Junior is not absent”）。语言痕迹只在与研究或产物证据同现时才允许计入。
- 审稿侧没确认 venue 的 LLM 政策就动手。
- 作者侧没有能回答问题的人类还硬跑：skill 会进入 audit-only 模式，并拒绝润色一篇无人掌舵的论文，否则只是把 D 变成 C。
- 证据清单中英两份只改一份，ID 覆盖对不上。
- 把它当洗稿工具，或用于公开指控、同事投诉、学生纪律、招聘晋升。
- 把 paper-preflight 退出码 0 当“论文干净”。2 表示没有阻断性发现，但某个源不可用且没有别的源顶上，所以这篇论文还不能说干净。
- 不看 diff 就让 `bib fix --apply`，尤其 `--level unsafe` 会改作者、标题、年份、会议并删标识符。
- 把 paper-preflight 当 LLM 判定。它明确“判决里没有 LLM”，但它仍是 v0.4 早期，有误报与漏检，必须人工复核。
- 把 `support` 的“could not confirm”当成“引用错误”。298 条金标引用上，93% 的确认是对的 [95% CI 82%, 98%]，但只确认了大约六分之一的真实引用，低分指向错误引用的情况不到一半。
- 离线答案和源中断可能让参考文献规则没跑；规则只在一次完整联网运行后才判定。
- 静音注释乱堆。没静音任何东西的抑制会报为 CFG001（info），避免过期注释堆积。

## 证据与来源

本手册中的命令与数字来自 THUROI0787/absent-author（MIT，41 stars）与 amos689/paper-preflight（MIT，v0.4 早期版本）的调研报告。

有数据支撑的部分：

- absent-author：83 条证据 ID（74 条四层证据 + 9 条“作者在场”迹象）；28 项 lint 检查。
- absent-author lint 校准集：59 篇 ChatGPT 之前的随机 arXiv 论文对 20 篇 AI 生成论文，其中尾随 -ing 从句 AUC 0.96、2024 年前后 AI 词汇 0.93、“not X but Y” 0.48、生造词候选 0.40。
- absent-author 一份 6 篇文档的盲测：人类 ACL 2018 论文判 A·W0 R0；非母语作者人类 2021 论文判 A·W0 R1；AI Scientist v2 及 v1 披露论文判 D·W2 R3；2026 自主 agent 论文判 D·W3 R3；2026 全自动 pipeline 论文判 C·W1 R3，并靠算术不一致与 2409.XXXXX 式引用被发现。
- absent-author 阅读 12 个开源自动研究 pipeline 推导指纹。
- absent-author 外部事件与文献：ICLR 2026（Pangram 估计 21% 审稿完全由 AI 生成、约 9% 投稿超过一半为 AI 文本）、COLM 2026 命名的 theoryslop 与 slopterpretability、TMLR 桌拒率从约 6% 升到约 53%、ICML 2026 因审稿 LLM 政策违规桌拒 497 篇、Liang et al. 2023 显示 AI 检测器把约 61% 非母语 TOEFL 作文误判为 AI 写。
- paper-preflight：Python 3.11–3.14，PyPI 包，MIT；判决里没有 LLM；向 Crossref、dblp、arXiv、DataCite、PubMed、OpenAlex 询问，配 key 时再加 Semantic Scholar；最新一批真实论文误报约每 100 条引用 1.3 次。
- paper-preflight 的 `support` 实验：298 条金标引用上，93% 的确认是对的 [95% CI 82%, 98%]，但只确认了大约六分之一的真实引用，低分指向错误引用的情况不到一半；100 条金标引用上，Claude agent 确认了 39% 的真实引用（HHEM 为 9%），且每个确认至少部分有支撑；`--download-model` 下载 HHEM-2.1-open，0.4 GB。
- paper-preflight 退出码：0 没有达到门槛的发现；1 有阻断性发现；2 没有阻断性发现但源不可用且没有别的源顶上，所以还不能说干净；3 用法错误。规则示例 REF001–REF017、CIT001–CIT008、REF090 来自仓库文档。

属于作者主张而非实证：

- absent-author：把“缺席”分为没人润色 / 没人掌舵 / 没人核对的三分法、四象限及 B（可救）与 D（AI 浪费）的区分方式；“语言证据不得降低研究等级”的评分约定；“文本证明力递减、评估将转向披露的 AI 使用、可核查产物与当面辩护”的判断。
- paper-preflight：作者把它定位为补上 AI 写作最容易出问题的一环；把误报列为最希望收到的反馈；自述 v0.4 早期发布版，有已知误报与漏检。这些是作者主张，不是实证。
- 报告中给出的可复用判据示例：R01 失败方法改标签为 “audit / diagnostic” 且方法骨架仍在、R07 文中承诺却从未出现的分析、R09 跨节漂移的数字（“+16%” 实为 6.7%）、S02 每节都放在审稿人会攻击位置上的“忏悔式” caveat、S06 通不过替换检验的生造词、P03 编造作者列表或形如 arXiv:2409.XXXXX 的引用、H06 日志 / 代码 / 版本历史 / 带时间戳的预注册可作为反证。

## 依据的调研

- [THUROI0787/absent-author](../research/radar/2026-10-06/1579-thuroi0787-absent-author.md)：值得一试，建议小范围试用这套“AI 产出审核”组合：先克隆仓库、用 --project 安装两个 agent skill，对自有或公开论文跑确定性 lint（slop_lint.py）与作者侧 paper-author-pass，再用若干篇已知标签的论文跑审稿侧 paper-slop-screen 做校准。理由是原文给出了可直接执行的安装命令、运行命令和提示词，并把语言痕迹与研究/事实核验分开评分、要求每条命中可定位可核对；但校准样本小且 in-sample、2026 年 pipeline 论文几乎不留语言痕迹，效果尚不足以保证直接采用。
- [amos689/paper-preflight](../research/radar/2026-10-08/1930-amos689-paper-preflight.md)：值得一试，把 paper-preflight 作为「交稿前的参考文献事实核验关卡」小范围试用：先用 `uvx paper-preflight check <项目> --lang zh --details` 跑一篇在写的论文并逐条人工复核误报，再用 `bib fix --level safe` 看 diff 决定是否落盘，并用 `bib fetch` 取代凭记忆写条目。理由是原文给出了可直接复制的命令、规则清单、agent 接入方式和量化评测数据（最新一批真实论文误报约每 100 条引用 1.3 次），但它自述仍是 v0.4 早期版本、有已知误报与漏检，必须先人工复核再进流程。
