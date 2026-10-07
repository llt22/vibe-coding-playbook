# amos689/paper-preflight

- 结论：**值得一试**。把 paper-preflight 作为「交稿前的参考文献事实核验关卡」小范围试用：先用 `uvx paper-preflight check <项目> --lang zh --details` 跑一篇在写的论文并逐条人工复核误报，再用 `bib fix --level safe` 看 diff 决定是否落盘，并用 `bib fetch` 取代凭记忆写条目。理由是原文给出了可直接复制的命令、规则清单、agent 接入方式和量化评测数据（最新一批真实论文误报约每 100 条引用 1.3 次），但它自述仍是 v0.4 早期版本、有已知误报与漏检，必须先人工复核再进流程。
- 原文：https://github.com/amos689/paper-preflight
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-07T22:49:27.685Z

## 是什么

paper-preflight 是一个 Python 命令行工具（PyPI 包，MIT，Python 3.11–3.14），在论文提交前把 LaTeX 项目里的每条参考文献拿到真实学术记录里核对一遍。它读 `.tex`、`.bib`、`.bbl`、纯文本参考文献列表、PDF 或 arXiv ID，向 Crossref、dblp、arXiv、DataCite、PubMed、OpenAlex（配了 key 时再加 Semantic Scholar）询问每一条被引文献：是否存在、是否与文中写法一致、是否已被撤稿、引用的预印本是否已正式发表。说不清的时候它明说「cannot determine」，而不是猜。

作者的定位是补上 AI 写作最容易出问题的一环：模型会编造参考文献，复制粘贴的 BibTeX 会带错年份、错作者和死 DOI。README 明确写着判决里没有任何 LLM（Design principles、`No LLM in the verdicts` 徽章）。仓库自述状态是 v0.4 早期发布版，作者把误报列为最希望收到的反馈。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：本机有 Python 3.11–3.14；除 `--offline` 外需要能访问上述学术 API；要有论文的源文件（或参考文献文本 / PDF / arXiv ID）。

### 1. 先跑一次检查（不安装也能跑）

用 uv，无需安装：

```bash
uvx paper-preflight check path/to/paper
```

或安装：

```bash
pip install paper-preflight
```

`path/to/paper` 可以是项目目录、主 `.tex` 文件，或单个 `.bib` 文件。

### 2. 按手里的材料选输入形式

没有 `.bib` 的 arXiv 源码项目会从编译出的 `.bbl` 读取（会被检查，但不会被改动）。

完全没有 LaTeX 时，纯文本参考文献列表也可以，支持常见样式（APA、IEEE、ACM、Nature、Vancouver、Springer、Elsevier、Chicago、MLA），一行、一段或编号一条：

```bash
uvx paper-preflight check references.txt
pbpaste | uvx paper-preflight check -      # or from stdin
```

直接给 arXiv 论文 ID（源会被下载到临时目录，检查后删除）：

```bash
uvx paper-preflight check arxiv:2607.06922
```

只有 PDF 时，读 PDF 里的参考文献列表，需要 `pdf` extra：

```bash
uvx --from 'paper-preflight[pdf]' paper-preflight check paper.pdf
```

### 3. 用命令行选项控制输出与判定门槛

| 选项 | 作用 |
|---|---|
| `--format json` / `--format sarif` | 机器可读输出（SARIF 可用于 GitHub code scanning） |
| `--offline` | 完全不联网，只用本地缓存里已有的答案 |
| `--refresh` | 忽略缓存、重新问每个源（例如某条更正之后） |
| `--fail-on warning` | 让 warning 也导致失败（默认只有 error 才失败） |
| `--details` | 列出每一条发现；默认把适用于多条目的建议（已发表的预印本、可补的 DOI）合并成一行 |
| `--lang zh` | 中文消息（也会按 locale 自动选择） |

退出码要读懂，尤其 2：

| 码 | 含义 |
|---|---|
| 0 | 没有达到 `--fail-on` 门槛的发现 |
| 1 | 有阻断性发现 |
| 2 | 没有阻断性发现，但某个源不可用且没有别的源顶上，所以这篇论文还不能说干净 |
| 3 | 用法错误 |

（这是「宁可弃权也不冤枉」的关键：2 不等于通过。）

### 4. 逐条看规则，而不是只看「有没有 error」

常见规则（`paper-preflight explain REF003` 可查任意规则）：

| 规则 | 发现 |
|---|---|
| REF001 | DOI 或 arXiv ID 指向另一篇论文 |
| REF002 | DOI 或 arXiv ID 不存在 |
| REF003 | 所有源都答了「没有」，任何源里都找不到 |
| REF004 · REF005 | 被撤稿，或有 expression of concern / 更正 |
| REF010–REF014 | 作者、标题、年份或会议与真实记录不一致 |
| REF015 | 引用的预印本已正式发表 |
| REF016 | 注册库有 DOI 而条目缺（作为安全修复提供） |
| REF017 | 标识符写法导致链接失效（如 `10.1162/tacl\_a\_00276`、`…v1`） |
| CIT001–CIT008 | 引用键未定义、重复、未被引用、近似重复；`.bib` 语法错误 |
| REF090 | 无法判定，并总是附上原因（源不可用、灰文献等） |

### 5. 条目不要凭记忆写：用 `bib fetch` 取已验证条目

每个字段来自注册库记录，条目上方注释注明来源：

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

- 预印本：已正式发表的 arXiv 预印本会返回正式发表版本，并保留 `eprint` 字段（要预印本本身用 `--prefer preprint`）。
- 标题检索：用 `--title`（必要时配 `--author`/`--year`），多篇匹配时列出候选而不替你选。
- 撤稿：撤稿的作品会带警告。
- 给脚本 / agent 用：`--format json`。

### 6. 让工具改 `.bib`，但先只看 diff

```bash
paper-preflight bib fix path/to/paper --level unsafe
```

它打印 diff，只有加 `--apply` 才会写文件。

- `--level safe`（默认）只修不会改变「引的是哪一篇」的东西：写法导致链接失效的标识符，以及注册库有而条目缺的 DOI。
- `--level unsafe` 还会按记录改写作者、标题、年份、会议，并删掉指向另一篇作品的标识符。先看 diff。
- 只改受影响的字段；注释、格式、行尾、编码保留。谁都找不到的文献永远不会被「修」——只有你知道原意。

### 7. 已核实过的告警就地静音

在条目正上方写注释，可附原因：

```bibtex
% preflight: ignore[REF003] reason="internal technical report, not indexed anywhere"
@techreport{lab2024internal,
  ...
}
```

判定仍留在 JSON 报告里，只是这条 finding 被丢弃。没静音任何东西的抑制会报为 CFG001（info），避免过期注释堆积。参考文献规则只在一次完整联网运行后才判定，因为离线答案和源中断可能让规则没跑。

### 8. 装进 coding agent，让它在「收尾」时自动检查

Claude Code（插件内含 MCP server 和一个 skill，让 Claude 在宣布论文完成前检查参考文献、只修有证据的错误、绝不编造参考文献）：

```bash
claude plugin marketplace add amos689/paper-preflight
```

```bash
claude plugin install paper-preflight@paper-preflight
```

Codex、Gemini CLI、Copilot、Cursor 等（装同一个 skill，没有配 MCP server 时它走 CLI）：

```bash
npx skills add amos689/paper-preflight
```

```bash
gh skill install amos689/paper-preflight paper-preflight
```

MCP 客户端（Codex、Cursor、VS Code 等）：

```bash
paper-preflight mcp
```

工具是只读的，且限定在你的工作区内（详见 docs/mcp.md）。

### 9. 挂到提交 / 推送时机上

- pre-commit：每次提交在几秒内检查引用键和缓存判定（docs/pre-commit.md）。
- GitHub Actions：`uses: amos689/paper-preflight@main`，每次 push 检查，报告进 job summary，可选 code-scanning 告警（docs/github-action.md）。

### 10. 可选：免费凭证让结果更快更全

不设账号也能用。这些环境变量可选，值不会被打印或记录日志：

| 变量 | 作用 |
|---|---|
| `PAPER_PREFLIGHT_EMAIL` | Crossref polite pool：更快更可靠 |
| `OPENALEX_API_KEY` | 更大的 OpenAlex 额度，用于撤稿检查 |
| `S2_API_KEY` | 把 Semantic Scholar 作为「别人都没找到」时的兜底源 |

`paper-preflight doctor` 显示设了哪些、以及每个源当前是否应答。

### 11. 实验性：找出每条引用背后的原文段落

先装 extra：

```bash
pip install "paper-preflight[support]"
```

```bash
paper-preflight support path/to/paper --download-model --all
```

`--download-model` 只下载一次本地小模型权重（HHEM-2.1-open，0.4 GB）。`--all` 还会列出已确认的引用及其引文；`arxiv:<id>` 也可作为目标。

- 输出只有「confirmed」（逐字引用段落）或「could not confirm」（附原因：无全文、只有摘要、没有足够接近的段落）。只点名所引作品标题的引用（如 `Adam \cite{...}`）在标题含该名字时算确认。
- 「它从不说某条引用是错的。」298 条金标引用上，93% 的确认是对的 [95% CI 82%, 98%]，但只确认了大约六分之一的真实引用，低分指向错误引用的情况不到一半。
- 也可以让 agent 判断：MCP 工具 `preflight_cited_passages` 返回每条论断与被引作品最相关的段落，交给 Claude、Codex 或其他 agent 按同样规则判断；不需要模型也不需要 `support` extra。100 条金标引用上，Claude agent 确认了 39% 的真实引用（HHEM 为 9%），且每个确认至少部分有支撑。
- 数据边界：论断在本地打分，只有被引作品的标识符会外发去取正文，正文随后留在本地缓存。

## 对应的研究问题

**1. 能力发现（AI 还能做哪些没想到交给它的工作）**
- 可以交给「工具 + 自动核验」的新工作：交稿前的参考文献事实核验（存在性、元数据一致性、撤稿、预印本已发表），以及「条目不要凭记忆写，按 DOI / arXiv ID / 标题取已验证条目」（`bib fetch`）。
- 可以交给 LLM agent 的新工作：判断某条引用的论断是否被被引作品支持（`preflight_cited_passages` 让 agent 自己判断）；以及在宣布论文完成前主动做引用检查（skill 的既定行为）。

**2. 任务匹配（什么工作适合怎样的模型、工具和协作方式）**
- 核验类、有确定答案来源的任务：适合确定性工具 + 多个权威注册库（Crossref / dblp / arXiv / DataCite / PubMed / OpenAlex / Semantic Scholar），作者把「判决里没有 LLM」当作设计原则；路由是「标识符优先」（DOI 走注册机构，arXiv ID 走 arXiv、DataCite 兜底，PMID/PMCID 走 PubMed，无标识符按标题查 dblp 和 Crossref），字段级匹配带守卫，只有足够一致且没有更合适的作品才采用搜索结果。
- 引用—论断匹配这类语义任务：适合 LLM。README 给了两条路径——本地小模型（HHEM）打分，或让 agent 读 `preflight_cited_passages` 返回的段落来判断，并给出两者在 100 条金标上的确认率对比（39% vs 9%）。
- 协作方式：以插件 / skill 形式嵌进编码 agent 的收尾流程；以 MCP 只读工具形式给 Codex / Cursor / VS Code 等；以 pre-commit / GitHub Actions 形式嵌进提交与 CI。

**3. 条件供给（需要提供什么信息、工具、权限和反馈）**
- 信息：论文项目目录 / 主 `.tex` / 单个 `.bib`；或 `.bbl`、纯文本参考文献列表（需符合常见样式）、PDF、arXiv ID。
- 工具与权限：Python 3.11–3.14 环境；联网（否则只能 `--offline` 用缓存），MCP 工具是只读且限定工作区；`bib fix` 默认只打印 diff，写文件要显式 `--apply`；`support` 需要下载 0.4 GB 本地模型。
- 可选凭证（提升速度与完整性）：`PAPER_PREFLIGHT_EMAIL`、`OPENALEX_API_KEY`、`S2_API_KEY`。
- 反馈：按条目的 finding（带文件名与行号）、每条引用的一个判定（verified / metadata mismatch / identifier conflict / not found / cannot determine）、退出码、`--format json`/`sarif`、`--details`、`--lang zh`；答案缓存在本地 SQLite，重跑快。
- 人工反馈通道：作者把误报当作最想收到的反馈，鼓励带可复现 `.bib` 条目开 issue。

**4. 主动推进（时间、事件或状态触发的持续执行）**
- 事件触发：pre-commit 在每次提交时检查引用键与缓存判定（秒级）；GitHub Actions 在每次 push 时检查并把报告写进 job summary、可选 code-scanning 告警。
- 状态触发：skill 让 agent 在「宣布论文完成前」检查参考文献（Claude Code 插件里就捆绑了这个 skill）。
- 成本条件：本地 SQLite 缓存让重复运行快，`--offline` 可完全离线复用已有答案；`--refresh` 用于在更正后重新问所有源。

**5. 效果验证（怎么判断确实改善了结果）**
- 直接可用的判定面：退出码（0/1/2/3，其中 2 表示还不能说干净）、每条引用的判定分布、按规则的 finding 类别、`--fail-on warning` 用于收紧门槛。
- README 给的量化基线（可直接当参照）：GPTZero 公布的 151 条混过同行评审的幻觉引用中，139 条（92%）被标记，0 条被判 verified；真实论文周评三批（962 / 780 / 975 条引用）误报为每 100 条引用 1.0 / 2.4 / 1.3 次，对应 41 / 81 / 31 个真实问题；与五个已发表工具在同一 104 条引用上的对比，paper-preflight precision 72.5%（其他工具 31.2%–50.9%），每 100 条正确引用 15.5 个误报（其他 28.2–74.6）；HALLMARK 公开基准 held-out 测试集 831 条：any issue precision 98.4%、recall 90.3%、FPR 1.9%。
- 已知测不出的部分：预印本上编造的会议 / 期刊（arXiv 记录无法反驳 venue）、作者列表只是漏人；fabrication 模式 recall 约 50%。

## 与已有做法的关系

清单中有三个相关条目：

- **Claude Code（status: adopt）**——README 给了两条直接可用的接入命令（`claude plugin marketplace add amos689/paper-preflight`、`claude plugin install paper-preflight@paper-preflight`）。插件捆绑 MCP server 和一个 skill，其行为定义是「在宣布论文完成前检查参考文献、只修有证据的错误、绝不编造参考文献」。这是把 Claude Code 从「写作助手」扩展成「写作 + 事实核验关卡」的具体做法。
- **Cursor（status: watch）**——README 把 Cursor 列在「装同一个 skill」的 agent（`npx skills add amos689/paper-preflight`）和「MCP 客户端」两类名单里，但没有给出 Cursor 专属的验证数据，所以只能说这条线索让 Cursor 更接近可用，而不是已证明。
- **arXiv（status: try）**——既作为输入（`paper-preflight check arxiv:<id>`，源下载到临时目录、检查后删除），也作为核验源之一（arXiv ID 走 arXiv，DataCite 兜底；标题匹配时会把早期 arXiv 版本标题纳入比较）。

清单中没有关于参考文献核验 / 引用幻觉检测的其他条目。

## 证据与局限

**原文给出的数据与案例**
- 一个可复现的官方 demo：`examples/demo-paper` 引用 11 篇作品，其中若干是故意写错的；README 贴出了真实运行的完整输出（未定义引用键 CIT001、DOI 指向另一篇论文 REF001、任何源都找不到 REF003、已被撤稿 REF004、重复条目键 CIT002，以及已发表预印本 REF015、重复作品 CIT004、年份不符 REF013、DOI 含 LaTeX 转义 REF017 等），文末汇总为 6 verified · 1 metadata mismatch · 1 identifier conflict · 1 not found · 2 cannot determine；5 error · 4 warning · 4 info。
- GPTZero 的 151 条幻觉引用：139（92%）被标记，12 条 cannot determine，0 条 verified；12 条未决原因逐条列出（网页 / 博客、无源索引的 workshop、真标题配假作者、被截断的真标题、太乱无法检索的条目）。
- 三批真实 arXiv 论文（cs、stat、q-bio、quant-ph、astro-ph 各 20 篇，机械选取，改动前固定列表，跑一次，所有告警人工复核）：误报每 100 条引用 1.0 / 2.4 / 1.3，真实问题 41 / 81 / 31；最新一批约「每篇半论文一次误报」，平均 49 条引用。之前七批用来找误报（0.1.0 起 4.5 → 0.4.0 的 1.2）。
- 与已发表工具的头对头（Badalova & Mayr, 2026，人工核对 104 条引用，用该研究的标签）：paper-preflight precision 72.5% [57.2%, 83.9%]，recall 87.9%，每 100 条正确引用 15.5 个误报；其他工具 precision 31.2%–50.9%，误报 28.2–74.6。样本小，区间宽。
- HALLMARK v1.2.3 两个公开 split 全量、用 0.5.2 在 2026-10-08 运行：`test_public`（831 条，开发中从未用过）any issue precision 98.4%、recall 90.3%、FPR 1.9%；fabrication precision 99.0%、recall 50.2%。`dev_public` 上被判 VALID 却被标记的 11 条经人工核查都不是正确引用，去掉后两种模式都到 100% precision / 0% FPR。
- `support` 的金标：298 条引用，确认中 93% 正确 [82%, 98%]；只确认约六分之一真实引用；低分指向错误引用不到一半；100 条金标上 Claude agent 从 `preflight_cited_passages` 判断确认了 39% 真实引用（HHEM 9%）。

**哪些只是作者主张**
- 设计原则（positive confirmation or abstain、中性措辞、local-first 无遥测）、「判决里没有 LLM」、「你的稿件从不离开你的机器」、skill 会让 agent「在宣布完成前检查、只修有证据的错误、绝不编造参考文献」——这些是作者的实现声明和意图描述，README 没有给出第三方对这些行为的独立验证。
- 「能抓什么」「永远不会做什么」两张清单也是作者自述。

**适用条件与已知局限（原文自己写的）**
- 版本状态是 v0.4 早期发布版，作者把误报列为最想收到的 bug 反馈。
- 仍会误报：最新一周约每 1.5 篇论文一次；来源包括双姓、把无源索引的作品标为期刊文章（法律评论、报告、博客）、workshop 版本 / 书籍在线日期 / 期刊卷期解释的年份，以及注册库自身记录有错、协作组名（如 MAGPI Team）、标题漏掉最后几个词。
- 仍有漏检：预印本上编造的会议 / 期刊（arXiv 记录无法反驳 venue）、作者列表只是漏人；fabrication 模式 recall 约 50%。
- 覆盖限制：非拉丁标题此前不支持（v0.5.2 起英文论文里引用的中文作品不再被误判为 not found）；灰文献（书、报告、软件、网页）无标识符只能 cannot determine；`support` 是实验性功能，金标标签由 AI 模型而非专家制作，只覆盖约六分之一真实引用。
- 运行条件：需要联网才能给出最终判定（离线只能复用缓存）；参考文献规则只在完整联网运行后判定；源不可用时退出码是 2 而非 0，不能当作通过。
- `bib fix --level unsafe` 会改作者 / 标题 / 年份 / 会议，必须人工看 diff；找不到的条目永远不会被自动「修」。

## 怎么试、怎么验证

**最小试用（半天内可完成，默认不改动原文件）**
1. 选一篇正在写、参考文献较多的论文（或它的 `.bib`），先不安装：`uvx paper-preflight check <项目目录> --lang zh --details`。
2. 人工逐条复核所有 error 和 warning，标出「真问题」与「误报」，记录两边数量。这一步必须做：作者自己的数据说明最新一批约每 1.5 篇论文就有一次误报。
3. 对同一个项目再跑一次 `--format json`，确认每条 finding 都带得出依据（文件、行号、来源）。
4. 用 `paper-preflight bib fix <项目> --level safe` 看 diff，确认无误后再考虑 `--apply`；`--level unsafe` 只在逐条看 diff 后使用。
5. 抽 3–5 条平时会凭记忆写的条目，改用 `paper-preflight bib fetch <DOI 或 arXiv ID>` 生成，对比手写版本。
6. 可选：`paper-preflight doctor` 检查各源是否可用；设 `PAPER_PREFLIGHT_EMAIL` 后重跑对比速度。
7. 若用 Claude Code：按 README 装插件，观察它是否在收尾时自动跑检查；若用其他 agent：`npx skills add amos689/paper-preflight` 或 `paper-preflight mcp`。

**判断有没有改善的指标（都取自原文机制，可自行计数）**
- 误报率：误报数 / 引用总数 × 100。作者给出的参照是每 100 条引用 1.0–1.3（最新周 1.3，历史目标是低于 1.5）。你自己的误报率明显高于此，说明规则与你的文献结构不匹配，需要先静音或换用方式。
- 真问题数：REF001 / REF002 / REF003 / REF004 / REF010–REF017 的触发数，尤其是「引用键未定义」「DOI 指向另一篇」「任何源找不到」「已撤稿」四类。交稿前的目标是这些归零，或每条都有明确处置（改写、讨论撤稿、静音并写原因）。
- 判定分布：verified / metadata mismatch / identifier conflict / not found / cannot determine 各自数量；cannot determine 过多说明需要补 DOI、补凭证或换输入形式。
- 退出码：连续运行是否稳定给出 0；如果经常是 2，说明源不稳，不能把「没有 error」当作干净。
- 复核成本：人工复核每条 finding 的平均时间；若误报把复核成本推高到不值得，就把门槛调回默认 `--fail-on error`，并只对关键章节做检查。
- 引用—论断支持（可选，实验性）：用 `paper-preflight support <项目> --download-model --all` 或 MCP 的 `preflight_cited_passages`，记录 confirmed 数与被你判定为「误确认」的比例。原文参照：HHEM 确认中 93% 正确但只覆盖约 1/6；agent 判断确认率 39%。它只能当筛查，不能当判错依据。
- 流程层面：把检查挂到 pre-commit / GitHub Actions 后，统计「已被拦住、否则会进投稿版的错误」数量，这是最直接的改善证据。
