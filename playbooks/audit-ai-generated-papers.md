# 交稿前把 AI 参与过的文稿变成可复查的清单

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 参与产出但无人真正负责时，如何在交稿前把引用、AI 痕迹、作者责任和逐句可读性问题变成可复查、可定位的候选清单，而不是把工具输出当判决。
> 先试这一步：先用一份 3–5 页短稿或一节英文论文跑确定性候选脚本（absent-author lint、paper-preflight 或 academic-revision-checklist 的 flag_candidates.py），逐条人工复核后再决定是否扩大。
> 最近修订：2026-11-04

## 解决什么问题

论文或法律文稿由 AI 参与产出、却没有任何人真正负责时，问题往往不在语言好不好看，而在三类“缺席”：没人润色（写作层 L）、没人掌舵（研究层 R）、没人核对（痕迹 / 引用层 P、R）。在论文场景，absent-author 把语言痕迹与研究 / 事实核验分开评分；paper-preflight 把参考文献拉到真实学术记录里逐条核对，说不清时明说“cannot determine”。在法律 / 带脚注文稿场景，legal-research-skills 的 cite-check 把“读脚注→取源→比引文→记录核查状态→落报告”做成固定链路，报告分“需你注意”和“无法核实”，并在重跑时列出与上次相比的变化。academic-revision-checklist 补的是另一层：英文论文逐句可读性修订。它把“AI 痕迹”定义为第一次读就卡住、要回头再读的地方，而不是绕过 AI 检测器；用 16 条快速清单、66 条规则和一个候选脚本，把可疑句列出来，再由作者逐句判断。它明确要求研究问题、引文、没有数据支撑的数字和自己的反思段落不交给 AI 改，只报告、不改。三者共同的产物都不是“判决”，而是把“引用能不能溯源、AI 痕迹能不能定位、作者能不能回答、句子会不会让读者停下”变成交稿前可复查的候选清单，最终判断仍交回给人。

## 适用与不适用

适用：

- 学术论文与审稿流程：投稿前的作者自查、稿件到达时的审稿人 / AC 分诊。
- 交稿前的参考文献事实核验：存在性、元数据一致性、撤稿、预印本是否已正式发表。
- 确定性 lint 可脱离 agent，在命令行或 CI 独立运行，输出 lint.md；paper-preflight 也可用命令行、pre-commit、GitHub Actions 或 MCP 接入。
- 法律研究文稿与带脚注的 Word 短稿：逐条核对引文、引号内文字、脚注交叉引用；提示未更新后续历史（affirmed / reversed / cert. denied）的下级法院案例，以及被后续判决 overrule 或 limited 的案例；为某命题找已核实权威并给页码与脚注用语；校对；建 Zotero 文库；写带来源链接与局限披露的研究备忘录；准备最高法院案卷材料（仅 Claude 插件，需额外设置）。
- 可迁移模式：报告的数据引用、政策文件条款引用、代码注释里的出处引用等需要逐条对源的工作，可借鉴“读脚注→取源→比引文→记录→报告”的流程；但 legal-research-skills 本身只在法律研究场景验证，不能宣称其他场景已有同样效果。
- 英文论文逐句修订：作者本人能判断原文和数据的章节 / 节级试用；用 Claude Code skill、Claude 网页版 / 桌面版自定义 skill，或把 checklist 与 workflow 提示词贴进 ChatGPT、Gemini 等其他模型；用本地 Python 脚本先列候选，再由人逐句判断。
- 学术写作的可迁移模式：把“第一次读会不会停下”作为读者视角检查，把脚本候选与 16 条快速清单结合；但该仓库只在英文学术写作、尤其作者所在的人机交互方向有作者经验，不能宣称其他语言或文体已验证。

不适用：

- absent-author 与 paper-preflight 面向学术论文写作与审稿流程，不能直接外推到一般工作产出；legal-research-skills 面向法律研究，也不能直接外推到所有引用核查。
- absent-author 不得用于公开指控。审稿只陈述可核查缺陷，来源疑问以问题形式交给 AC。
- paper-preflight 只做记录层面核验，不替你判断研究贡献或作者责任。
- 不适用于同事投诉、学生纪律、招聘晋升等场景。
- absent-author 不能当作洗稿工具：仓库明说清单可能被这样滥用，且最多只能把 D 洗到 C。
- 语言痕迹对非母语写作者与首篇论文易误报（“Junior is not absent”），只允许在与研究或产物证据同现时计入。
- paper-preflight 自述仍是 v0.4 早期版本，有已知误报与漏检；不能把退出码 0 当成“论文绝对干净”，也不能把未确认引用当成“引用错误”。
- legal-research-skills 不能替代期刊 / 法院的正式 cite-check 或本人阅读；作者自述会漏报也会误报，正确用法是把它当补充，叠加自己的阅读和期刊的 cite-check。
- legal-research-skills 的 Codex 桌面按钮安装尚未在全新账号上端到端测试（只验证了在插件浏览器里能正确出现）；Codex ZIP 路线更新需手动，定时更新器不管 ZIP 安装；本次材料只有 README，没有准确率、召回率、耗时或成本数字。
- 付费墙 / 登录后的来源，工具访问不到；需要你提供有权限下载的 PDF，报告应标出访问不到的来源。不能把“无法核实”当“引文错误”。
- 一次完整 cite-check 可能消耗相当多套餐额度，不适合拿长稿直接开跑。
- 法律技能包不是“让 AI 帮你查资料”的通用聊天；它增加的是固定链路，结论仍由人负责。
- academic-revision-checklist 面向英文学术写作，不能直接外推到非英文、非学术写作或其他文体；材料没有不同模型间的效果比较。
- academic-revision-checklist 的“AI 痕迹”不是检测器指标，不能用于规避 AI 检测；它只指第一次读就卡住、要回头再读的地方。
- academic-revision-checklist 的脚本只列候选，误报需要人读判断；作者自己的例子是缩写检查标出 13 处、真正有问题 3 处。
- academic-revision-checklist 本次材料只有 README，未包含完整的 checklist.md、patterns.md、workflow.md、reading-protocols.md、lessons.md 和脚本源码；不能核验 66 条细则与脚本实现，也不能宣称已有量化效果。
- academic-revision-checklist 明确要求研究问题、引文、没有数据支撑的数字和自己的反思段落不交给 AI 改；把这几类内容交给模型整段重写，不属于它的正确用法。

## 前置条件

- 论文侧：本机有 git 与 Python 3.9+（absent-author lint 无其他依赖）。
- 要跑 absent-author skill，需要有能读取 SKILL.md 的 agent（Claude Code、Codex 或同类），并能访问论文路径或全文。
- 要跑 paper-preflight，本机有 Python 3.11–3.14；除 `--offline` 外需要能访问 Crossref、dblp、arXiv、DataCite、PubMed、OpenAlex 等学术 API；要有论文源文件，或参考文献文本 / PDF / arXiv ID。
- 作者侧需要“有一个能回答问题的人类”；否则进入 audit-only 模式，并拒绝润色一篇无人掌舵的论文（否则只是把 D 变成 C）。
- 审稿侧需先确认所在 venue 的审稿 LLM 政策允许。README 明确提示：ICML 2026 因审稿人违反自选的 no-LLM 政策而桌拒了 497 篇；该 skill 会先要求确认这一点。
- 两个 absent-author skill 共享同一份 references/evidence-catalog.md（由 EVIDENCE.md 同步）。
- 法律侧 Claude 桌面端路线：Mac 或 Windows；Claude 订阅需包含 Claude Code（Pro / Max，部分 Team、Enterprise 可用）；不需要开终端；准备一份几页纸、带脚注的 Word 文档；在 Code 标签选 Local 目录（Windows 不选 WSL 条目）；CourtListener 免费账号与 token（用于引注核查的判例库）；Zotero 可选，不用就在 setup 回答 skip；允许执行命令、联网、拆分给多个 AI 助手。
- 法律侧 Codex 桌面端路线：ChatGPT 桌面端可访问文件夹；下载 ZIP 并解压，保留外层 `legal-research-skills-main` 文件夹；不需要 Codex CLI、不需要 Claude；插件里的 setup 助手只处理更新，不能替代手动环境自检。
- 法律侧成本：一次完整 cite-check 可能消耗相当多套餐额度，先用短文档起步；登录 / 付费墙后的来源要自己提供有权限下载的 PDF。
- academic-revision-checklist：拿到仓库文件；本机有 Python 3（候选脚本不用装其他包）；Claude Code 需要本地文件权限，Claude 网页版 / 桌面版需要把整个文件夹打包成 zip 作为自定义 skill 上传，其他模型需要把 `references/checklist.md` 和需要的 `references/workflow.md` 提示词贴进对话；准备原文文件、用于核对的数据，以及“不交给 AI 改”的受保护段落清单。
- 所有侧共同前提：有一个能对结论负责的人；工具输出只给候选，判断由人做。

## 操作步骤

（一）论文侧共同准备

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

（做法 B：审稿人 / AC 对可疑稿件分诊）适合稿件已到你手上、且 venue 政策允许。

11. 先确认所在 venue 的审稿 LLM 政策允许。预期结果：确认可以继续；不允许就不要用该 skill。

12. 在 agent 里用审稿侧 skill 对可疑稿件分级。前提：已确认政策允许。预期结果：输出 W / R / Q 三级评分与 A–D 四象限；其中 R 层每条 flag 应是能用算术或引用存在性验证的事实。

```text
Use paper-slop-screen to triage this arXiv preprint: <path or id>
```

13. 如稿件有源文件或参考文献列表，可用 paper-preflight 做引用存在性 / 撤稿核验，只作为可核查缺陷，不用于公开指控。预期结果：得到可定位到具体条目的引用问题。

```bash
uvx paper-preflight check path/to/suspicious-paper --lang zh --details
```

（做法 C：法律 / 带脚注 Word 文稿的 cite-check，Claude 桌面端）

14. 安装并登录 Claude 桌面版，点顶部 Code 标签（名字叫 Code，但研究写作都用这个标签）。前提：Mac 或 Windows，Claude 订阅包含 Claude Code。预期结果：能进入 Code 标签并选择本地文件夹。

15. 准备一份几页纸、带脚注的 Word 文档，放在一个好找的文件夹里。消息框下方第一个控件选 Local 下的第一项（Windows 上不要选 WSL 条目，那里不支持插件）；再点旁边的文件夹控件 → Open folder… → 选中放文档的文件夹。预期结果：当前会话锁定到该文件夹。

16. 安装法律研究插件。前提：已进入 Code 标签并选好文件夹。预期结果：插件安装到当前账号，详情面板可选 Install for you。把下面整行粘进 Code 标签的消息框回车：

```text
/plugin install legal-research --marketplace danepps/legal-research-skills
```

提示添加来源 `danepps/legal-research-skills` 时确认；详情面板里选 Install for you（对所有文件夹可用）→ Install。

17. 在同一文件夹下新开一个会话，跑 setup。前提：插件已安装。预期结果：依赖检查完成，CourtListener token 已保存；Zotero 不用则 skip；自动更新可选，可事后用同一命令开关。

```text
/legal-research:setup
```

要点：CourtListener 按提示注册免费账号，从个人页复制 token（一串字母数字）粘进去；Zotero 不用就回答 skip，之后仍可做引注核查、校对、找引注、写备忘录。

18. 新开会话（同一文件夹）跑第一个任务，把文件名换成自己的。前提：setup 已完成；草稿是 .docx。预期结果：生成与草稿同目录、文件名以 `Cite Check.md` 结尾的报告，草稿不被改动。过程中它可能请求执行命令 / 联网、或把任务拆给多个 AI 助手，需逐次批准；拆给多助手再复审是作者经验，无对照证据。

```text
Cite-check "My Article.docx" in this folder. Leave the draft unchanged.
When you finish, show me the report and explain how to open it.
```

19. 读结果：先看 needs your attention 段，区分“已确认的问题”与“无法核实”项，用报告里引的原文词句和脚注号回 Word 定位。预期结果：每条要处理的问题都能落到具体引文或脚注；需要人判断的部分留在 advisory 段落而不是混进结论。

20. 安装快捷方式不被识别时的兜底（老版本 Claude Code 需要两条分开的快捷方式，逐条回车）。前提：上一条 `/plugin install ... --marketplace ...` 没被识别。预期结果：装好后回到 setup。

```text
/plugin marketplace add danepps/legal-research-skills
```

```text
/plugin install legal-research@danepps
```

详情面板选 Install for you → Install，再回第 17 步。

21. 环境类故障处理（README 明确给出）：Mac 弹“command line developer tools”点 Install 等待完成重试；Windows 装插件需要 Git for Windows，装完按提示重启 Claude；setup 快捷方式不出现则新开会话，或用消息框旁 + → Add plugins 确认已安装。出问题就用大白话描述看到的报错，通常能绕过去；卡住再走分步指南或邮件联系作者。

22. 企业账号被管理员限制插件源时，README 给了可直接转发管理员的原话：允许 Claude Code 设置中的插件市场 `danepps/legal-research-skills`（GitHub 仓库，作者 Daniel Epps，Washington University in St. Louis），以便安装 `legal-research` 插件；该插件只增加研究指令和脚本，不改变文件可见范围。被拒则改用下载文件夹在个人账号上跑的方案（见 TECHNICAL.md，本次未提供内容）。

23. 重跑同一份短稿，先看报告开头列出的与上次相比的变化。前提：已至少跑过一次并保留旧报告。预期结果：能看出哪些问题已修复、哪些仍在、哪些是新出现的；这是稳定性观察点，不是质量证明。

24. 遇到登录 / 付费墙后的来源，自己提供有权限下载的 PDF，并在报告里确认它被标为访问不到的来源。前提：你知道哪些来源需要登录。预期结果：报告不会把“无法核实”当成“引文错误”；拿不到 PDF 的条目留给人处理。

（做法 D：Codex 桌面端跑同一套法律技能）

25. 下载 ZIP 并解压，保留外层 `legal-research-skills-main` 文件夹（里面有告诉应用去哪里找插件的 catalog）。前提：ChatGPT 桌面端可用文件夹；不需要 Codex CLI、不需要 Claude。

26. 在桌面端把该文件夹选为本地项目（选外层目录），重启桌面端、重开该项目，打开 Plugins，选来源 Daniel Epps: Codex Research Skills → Legal Research Skills → 点安装（可能是 +）。前提：解压后外层目录还在。预期结果：插件出现在列表中；来源不出现就先确认选的是解压后的目录。

27. 手动做一次环境自检（注意：插件里的 setup 助手只处理更新，不能替代这步）。新开会话、选中草稿文件夹后问：

```text
Check what I need to use Legal Research Skills on this computer, including Python, web access, and CourtListener. Walk me through anything missing.
```

预期结果：缺什么会被逐项指出，包括 Python、联网能力、CourtListener。

28. 首个任务（换成真实文件名）：

```text
Cite-check My Article.docx. Leave the draft unchanged, and show me how to open the report.
```

预期结果：同 Claude 路线，生成报告、草稿不改。

29. 更新是手动的：重新下 ZIP、重做选目录与安装；仍显示旧版就在 Plugins 里先卸载再装；ZIP 安装不受可选定时更新器影响。工具文件夹与研究文档分开放。

（做法 E：英文论文逐句修订自查，academic-revision-checklist）适合作者本人能判断原文和数据、需要逐句改善英文可读性的章节 / 节级试用。

30. 先当清单读。前提：拿到仓库文件。从 `references/checklist.md` 开始；想知道某条规则为什么改、怎么改，就看 `references/patterns.md` 里同一编号。预期结果：知道 16 条快速清单和 66 条规则的结构；按“一个案例，一条规则，查全文”的方法使用。注意：本次材料只有 README，不能核验完整细则、workflow 提示词和脚本实现。

31. 装成 Claude Code 的 skill。前提：已使用 Claude Code。预期结果：Claude Code 能调用 `academic-revision-checklist`。

```bash
git clone https://github.com/JimmyRaoUF/academic-revision-checklist.git ~/.claude/skills/academic-revision-checklist
```

然后在 Claude Code 里说“用 academic-revision-checklist 检查 chapter3.tex”，或输入 `/academic-revision-checklist`。只想在一个项目里用，就放到该项目的 `.claude/skills/` 下面。

32. 在 Claude 网页版或桌面版里用。前提：能上传自定义 skill。把整个文件夹打包成 zip，作为自定义 skill 上传；文件夹名要和 skill 名一致。从 GitHub 点 Download ZIP 得到的文件夹叫 `academic-revision-checklist-main`，要先改回 `academic-revision-checklist` 再打包。也可以只把 `checklist.md` 和需要的 `patterns.md` 章节贴进对话。预期结果：skill 可被调用，或对话里已有清单可逐条问。

33. 在 ChatGPT、Gemini 等其他模型里用。前提：能把文本贴进对话。把 `references/checklist.md` 贴进去，再用 `references/workflow.md` 里的提示词模板。要求它逐句读、标出读者会停下的句子，不要让它整段重写；它给的每一条意见，都先拿原文和数据核对。预期结果：得到逐句停顿点与原因，而不是整段改写稿。

34. 跑候选脚本。前提：安装 Python 3，不用装其他包。预期结果：生成可疑候选清单；脚本只负责把可疑处列全，判断仍要靠人读。

```bash
python3 scripts/flag_candidates.py chapter3.tex --summary
python3 scripts/flag_candidates.py chapter3.tex chapter4.tex --md flags.md
python3 scripts/flag_candidates.py paper.md --max-para 150
```

脚本能读 `.tex`、`.md` 和 `.txt`，会跳过表格、图、公式和注释。

35. 改完一段，逐条问 16 条快速清单：

- 第一次读的人会在这一句停下吗？要读两遍的，写下原因。
- 一句话只报一个结果。
- 写了 more、higher，就写出和谁比。
- significant 只用在差异、关联或检验上，不用在比例或平均数上。
- this、these、the former、the name 这类词，指的东西在前一句之内吗？
- 一个名字只指一样东西，普通词别撞上自己定义的术语。
- 冒号只用来引出列表、引文、问题或定义。
- 少用先否定再肯定的铺垫，带内容的否定留下。
- 正文不用破折号连接分句。
- 连着几句长度差不多、开头一样的，改掉一处。
- 空的过渡词和段尾总结，能删就删，删不掉就换成具体内容。
- 用自己和这个领域会用的词，能用常用词就不用生僻词。
- 论文只写研究本身，不写论文是怎么改出来的。
- 研究问题、引文、数字、自己的反思，不交给 AI 改。
- 改完重读这一段和前一段，字数上限、段落长度这些硬指标再跑一遍。
- 别人和 AI 的意见，先拿原文和数据对过，成立的才改。

36. 每轮单列“不交给 AI 改”的内容：研究问题的措辞、引文原文、没有数据支撑的数字、自己写的反思段落；只报告，不改。前提：已识别这些内容。预期结果：受保护内容零改动；这些内容由作者自己改或保留。

37. 修改后做回归检查：重读当前段和前一段；重新跑字数上限、段落长度等硬指标；对 AI 或他人意见逐条用原文和数据核对，不成立就不改。预期结果：被采纳的修改能对应到某条规则，被拒绝的意见有原文或数据依据；受保护内容仍零改动。

（工程化与维护）

38. 可选：把 paper-preflight 装进 coding agent，让它在“收尾”时自动检查。前提：使用 Claude Code、Codex、Gemini CLI、Copilot、Cursor 等 agent。预期结果：Claude 在宣布论文完成前检查参考文献、只修有证据的错误、绝不编造参考文献。

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

39. 可选：挂到提交 / 推送时机上。前提：已有版本控制与 CI。预期结果：pre-commit 每次提交在几秒内检查引用键和缓存判定；GitHub Actions 每次 push 检查，报告进 job summary，可选 code-scanning 告警。

```yaml
uses: amos689/paper-preflight@main
```

40. 可选：设免费凭证让结果更快更全。前提：不设账号也能用。预期结果：Crossref polite pool 更快更可靠；OpenAlex 额度更大，用于撤稿检查；Semantic Scholar 作为兜底源。值不会被打印或记录日志。

```text
PAPER_PREFLIGHT_EMAIL   Crossref polite pool：更快更可靠
OPENALEX_API_KEY        更大的 OpenAlex 额度，用于撤稿检查
S2_API_KEY              把 Semantic Scholar 作为“别人都没找到”时的兜底源
paper-preflight doctor
```

41. 实验性：找出每条引用背后的原文段落。前提：先装 extra。预期结果：输出只有“confirmed”（逐字引用段落）或“could not confirm”（附原因：无全文、只有摘要、没有足够接近的段落）。它从不说某条引用是错的。

```bash
pip install "paper-preflight[support]"
paper-preflight support path/to/paper --download-model --all
```

42. 维护 absent-author 证据清单时，中英两份文件要一起改，再同步并靠 CI 校验 ID 覆盖。

```bash
python tools/sync_evidence.py
```

怎么选：自己写的东西投稿前用做法 A；别人稿件到手用做法 B；法律 / 带脚注 Word 文稿用做法 C（Claude 桌面端）或做法 D（Codex 桌面端）；英文论文逐句修订、可读性自查用做法 E。两种法律路线都先跑短稿；所有路线都可以先跑 absent-author lint 和 paper-preflight，lint 与 preflight 输出只给候选，判断始终由人做。引用核验优先用 paper-preflight（学术记录），法律引文 / 判例后续历史优先用 cite-check；AI 痕迹与作者责任优先用 absent-author；逐句可读性修订优先用 academic-revision-checklist。法律技能包、paper-preflight、absent-author 与 academic-revision-checklist 不互相替代。做法 E 不替代引用事实核验和作者责任审查；同一篇英文论文可以先用 paper-preflight 核引用、再用 absent-author 查作者责任、最后用 academic-revision-checklist 做逐句修订，但每一步都要人工复核。

## 怎么判断变好了

最小试用方式（先小范围试用，不要直接采用）：

1. 用 `./install.sh --project` 装到项目内，避免污染全局环境。
2. 取 2–3 篇自己写过的论文，跑 `python tools/slop_lint.py` 与 `paper-author-pass`（audit 模式），看是否产出“你能回答”和“你答不上来”两类问题清单。
3. 同时用 `uvx paper-preflight check <项目> --lang zh --details` 跑同一批论文，逐条人工复核引用发现，记录真命中 / 误报；再用 `bib fetch` 替换掉凭记忆写的条目。
4. 取 3–6 篇已知标签的论文（至少 1 篇纯人类、1 篇已知 AI 生成，最好含 1 篇 2026 年 pipeline 产物）跑 `paper-slop-screen`，把输出象限与已知标签对照。
5. 法律侧：用一份 3–5 页带脚注的短稿跑一遍 cite-check，把报告里的 needs your attention 项逐条回原文 / 来源抽查，分别记“真命中 / 无法核实 / 误报 / 漏报”；重跑一次看变化列表是否稳定。
6. 同一份短稿也可在普通对话里跑一次作对照，观察技能包多出来的“读脚注→取源→比引文→记录→报告”链路是否让定位更容易；这是试用方法，不是已有对照实验结论。
7. 英文论文侧：选一个英文学术章节或一节，先记录基线；把研究问题、引文、无数据支撑数字、反思段落单列保护；运行 `python3 scripts/flag_candidates.py` 保存候选清单；用 16 条快速清单或 Claude skill 逐句检查，要求只标出读者可能停下的句子并说明原因，不允许整段重写；由作者逐条接受或拒绝，拒绝时记录原因；改完重读当前段和前一段，并重跑字数与段落长度检查。

可观察指标：

- paper-preflight：每 100 条引用的误报次数（原文最新一批真实论文约 1.3 次，仍要人工复核）；退出码 2 的比例（源不可用导致不能判干净）；引用存在性、元数据一致、撤稿、预印本已发表等发现是否都能定位到具体条目；`bib fetch` 取回的条目是否替换掉凭记忆写的条目。
- absent-author lint：每处命中是否都能定位到具体文件、行号和可读片段；你人工复核后的真命中 / 误报比例。
- screen 的 R 层 flag 是否全部是可独立验证的事实（跨节数字不一致、引用查不到、承诺未做的分析），其中有多少被证明是你自己的误读。
- 诚实人类论文被判 C / D 的比例（误报率）——原文把误报列为最需要上报的类别。
- author-pass 结束后，“彻底理解 / 当面辩护 / 署名”三问中原本答不上来的问题数量是否下降。
- 对作者而言最硬的指标：修改后论文中“承诺但缺失的分析”“文本与表格不一致的数字”“无法溯源的引用”是否清零。
- 法律侧：报告是否落成 `Cite Check.md`；needs your attention 每条能否用引文词句和脚注号回原文；已确认问题与无法核实项是否分开；重跑差异是否可读；付费墙来源是否被标出；人工抽查的真命中 / 误报 / 漏报；一次短稿消耗的套餐额度（作者未给数字，只能自己记）。
- 法律侧：报告是否出现 advisory 段承载需人判断项，而不是混进结论。
- 英文论文侧：同一节在试用前后由第一次读的人标出的“停下 / 读两遍”句子数量是否下降；脚本候选中的真问题比例是否可接受（作者例子：缩写检查标出 13 处，真正有问题 3 处）；被采纳的修改是否都能对应到某条规则；被拒绝的 AI 意见是否多因与原文或数据不符；受保护内容是否保持零改动；字数上限和段落长度是否仍合规；每节修改耗时是否可接受。
- 代码注释等迁移场景只观察流程是否可复制，不能拿法律场景的结论当验证。

试多久：absent-author 调研没有给出建议时长；它给出的前提是校准样本小且为 in-sample，作者自己也指出 2026 年 pipeline 论文几乎不触发这些语言痕迹。paper-preflight 自述是 v0.4 早期版本，有已知误报与漏检，作者把误报列为最希望收到的反馈。legal-research-skills 的 README 没有给准确率、召回率、耗时或成本数字，只说会漏报也会误报；Codex 桌面安装路线尚未端到端验证。academic-revision-checklist 只有作者经验（英文博士论文五周、60 多轮修改）和单例（缩写检查标出 13 处、真正有问题 3 处），没有对照实验、错误率下降或节省时间的量化数据。因此先用上面的对照结果决定是否扩大使用，而不是先定一个采用期限。法律侧建议至少跑到：同一短稿重跑一次、人工抽查一批 needs your attention 项、确认付费墙来源被标出；做不到这三点就不要扩大。英文论文侧建议至少先在一节上完成一次“基线—候选脚本—逐句判断—回归检查”的完整循环，再决定是否扩大到整章。

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
- 把 cite-check 当替代期刊 / 法院的正式核查。它自述会漏报也会误报，应叠加本人阅读和期刊的 cite-check。
- 直接拿长稿跑完整 cite-check，消耗大量套餐额度；先用短文档。
- 付费墙 / 登录来源没提供 PDF，却把“无法核实”当“引文错误”；报告应标出访问不到的来源。
- Codex 桌面按钮安装未端到端验证；ZIP 路线更新手动；setup 助手只处理更新，不能替代环境自检。
- 把法律技能包外推到非法律场景并宣称已验证；它本身只在法律研究流程，其他场景只借鉴“读脚注→取源→比引文→记录→报告”模式。
- 重跑不看与上次的差异，无法判断稳定性。
- 让工具改草稿；提示词明确 Leave the draft unchanged，报告单独文件。
- 企业账号插件源被限制时硬装；按 README 给管理员原话或改个人账号下载文件夹方案。
- 没确认 CourtListener token 或 Zotero 是否 skip 就开跑；setup 会引导。
- 把“找支持性权威”当成自动写文献综述；它给页码和脚注用语，仍需人判断。
- 把 academic-revision-checklist 的“AI 痕迹”当检测器指标，用于绕过 AI 检测；这里指第一次读就卡住、要回头再读的地方。
- 让模型整段重写；正确要求是逐句读、标出读者会停下的句子、不要整段重写。
- 把 `flag_candidates.py` 的候选当错误清单；作者例子已显示候选多、真问题少，脚本只列候选，判断靠人。
- 忘记保护研究问题、引文、没有数据支撑的数字、自己的反思段落；这些内容不交给 AI 改，只报告。
- 安装 zip 时文件夹名不对；从 GitHub 下载的 `academic-revision-checklist-main` 要改回 `academic-revision-checklist` 再打包。
- 只拿到 README 就宣称 66 条规则、workflow 提示词或脚本实现已验证；本次材料无法核验完整规则、提示词和脚本实现。
- 把 academic-revision-checklist 的效果外推到非英文、非学术写作或其他模型比较；材料没有不同模型效果比较，适用对象是英文学术写作、尤其作者所在的人机交互方向。
- 把 16 条快速清单当机械规则，忽略领域和原文数据；每条 AI 或他人意见都要先拿原文和数据核对，成立的才改。

## 证据与来源

本手册中的命令与数字来自 THUROI0787/absent-author（MIT，41 stars）、amos689/paper-preflight（MIT，v0.4 早期版本）、danepps/legal-research-skills（MIT，本次仅有 README 可依据）与 JimmyRaoUF/academic-revision-checklist（本次仅有 README 可依据）的调研材料。

有数据支撑的部分：

- absent-author：83 条证据 ID（74 条四层证据 + 9 条“作者在场”迹象）；28 项 lint 检查。
- absent-author lint 校准集：59 篇 ChatGPT 之前的随机 arXiv 论文对 20 篇 AI 生成论文，其中尾随 -ing 从句 AUC 0.96、2024 年前后 AI 词汇 0.93、“not X but Y” 0.48、生造词候选 0.40。
- absent-author 一份 6 篇文档的盲测：人类 ACL 2018 论文判 A·W0 R0；非母语作者人类 2021 论文判 A·W0 R1；AI Scientist v2 及 v1 披露论文判 D·W2 R3；2026 自主 agent 论文判 D·W3 R3；2026 全自动 pipeline 论文判 C·W1 R3，并靠算术不一致与 2409.XXXXX 式引用被发现。
- absent-author 阅读 12 个开源自动研究 pipeline 推导指纹。
- absent-author 外部事件与文献：ICLR 2026（Pangram 估计 21% 审稿完全由 AI 生成、约 9% 投稿超过一半为 AI 文本）、COLM 2026 命名的 theoryslop 与 slopterpretability、TMLR 桌拒率从约 6% 升到约 53%、ICML 2026 因审稿 LLM 政策违规桌拒 497 篇、Liang et al. 2023 显示 AI 检测器把约 61% 非母语 TOEFL 作文误判为 AI 写。
- paper-preflight：Python 3.11–3.14，PyPI 包，MIT；判决里没有 LLM；向 Crossref、dblp、arXiv、DataCite、PubMed、OpenAlex 询问，配 key 时再加 Semantic Scholar；最新一批真实论文误报约每 100 条引用 1.3 次。
- paper-preflight 的 `support` 实验：298 条金标引用上，93% 的确认是对的 [95% CI 82%, 98%]，但只确认了大约六分之一的真实引用，低分指向错误引用的情况不到一半；100 条金标引用上，Claude agent 确认了 39% 的真实引用（HHEM 为 9%），且每个确认至少部分有支撑；`--download-model` 下载 HHEM-2.1-open，0.4 GB。
- paper-preflight 退出码：0 没有达到门槛的发现；1 有阻断性发现；2 没有阻断性发现但源不可用且没有别的源顶上，所以还不能说干净；3 用法错误。规则示例 REF001–REF017、CIT001–CIT008、REF090 来自仓库文档。
- legal-research-skills：Daniel Epps，Washington University in St. Louis 法学院教授，*Divided Argument* 播客联合主持，声明这些工具用于自己的学术写作；MIT 许可，“as-is”发布；README 自述六类能力（cite-check、找支持性权威、校对、建 Zotero 文库、写研究备忘录、准备最高法院案卷材料）；给出了 Claude 桌面端与 Codex 桌面端两条安装路线、命令、提示词、故障处理清单，以及“完整 cite-check 会消耗大量额度、先用短文档”的成本提醒；明确说“These tools can miss problems and raise false alarms.”；付费墙 / 登录来源需用户提供有权限的 PDF，报告应标出访问不到的来源；Codex 桌面按钮安装尚未在全新账号上端到端测试，只验证了在插件浏览器里能正确出现；Codex ZIP 路线更新需手动，定时更新器不管 ZIP 安装；Zotero 非必需。
- academic-revision-checklist：本次材料只有 README；仓库结构包括 16 条快速清单、66 条规则、`checklist.md`、`patterns.md`、`workflow.md`、`reading-protocols.md`、`lessons.md` 和一个列出可疑候选的 Python 脚本 `scripts/flag_candidates.py`；作者经验来自英文博士论文五周、60 多轮修改；作者举例说缩写检查标出 13 处，真正有问题 3 处；脚本能读 `.tex`、`.md`、`.txt`，跳过表格、图、公式和注释；材料没有对照实验，没有错误率下降或节省时间的量化数据，也没有不同模型间的效果比较。

属于作者主张而非实证：

- absent-author：把“缺席”分为没人润色 / 没人掌舵 / 没人核对的三分法、四象限及 B（可救）与 D（AI 浪费）的区分方式；“语言证据不得降低研究等级”的评分约定；“文本证明力递减、评估将转向披露的 AI 使用、可核查产物与当面辩护”的判断。
- paper-preflight：作者把它定位为补上 AI 写作最容易出问题的一环；把误报列为最希望收到的反馈；自述 v0.4 早期发布版，有已知误报与漏检。这些是作者主张，不是实证。
- legal-research-skills：作者主张“AI 自己装比任何书面说明都更能应付意外”，这是经验判断，无对照数据；README 未给任何案例、准确率、召回率、耗时或成本数字，因此“报告能有效区分确认问题与未核实项、能发现未更新后续历史 / 被 overrule 的案例”目前只是作者主张；拆给多个助手再复审能提升质量，也无证据；本次材料只有 README，Codex 安装路线与更新方式需按作者后续更新再核。
- academic-revision-checklist：16 条快速清单、66 条规则、“一个案例，一条规则，查全文”的方法，以及“AI 痕迹指第一次读就卡住、要回头再读的地方”的定义，都是作者从个人修改经验整理的主张；作者给出的 13 处候选 / 3 处真问题只是单例，不是错误率或召回率；本次材料只有 README，无法核验 66 条细则、workflow 提示词模板、patterns 例子和脚本实现，因此不能把它的效果当已证结论。
- 报告中给出的可复用判据示例：R01 失败方法改标签为 “audit / diagnostic” 且方法骨架仍在、R07 文中承诺却从未出现的分析、R09 跨节漂移的数字（“+16%” 实为 6.7%）、S02 每节都放在审稿人会攻击位置上的“忏悔式” caveat、S06 通不过替换检验的生造词、P03 编造作者列表或形如 arXiv:2409.XXXXX 的引用、H06 日志 / 代码 / 版本历史 / 带时间戳的预注册可作为反证。

## 依据的调研

- [THUROI0787/absent-author](../research/radar/2026-10-06/1579-thuroi0787-absent-author.md)：值得一试，建议小范围试用这套“AI 产出审核”组合：先克隆仓库、用 --project 安装两个 agent skill，对自有或公开论文跑确定性 lint（slop_lint.py）与作者侧 paper-author-pass，再用若干篇已知标签的论文跑审稿侧 paper-slop-screen 做校准。理由是原文给出了可直接执行的安装命令、运行命令和提示词，并把语言痕迹与研究/事实核验分开评分、要求每条命中可定位可核对；但校准样本小且 in-sample、2026 年 pipeline 论文几乎不留语言痕迹，效果尚不足以保证直接采用。
- [amos689/paper-preflight](../research/radar/2026-10-08/1930-amos689-paper-preflight.md)：值得一试，把 paper-preflight 作为「交稿前的参考文献事实核验关卡」小范围试用：先用 `uvx paper-preflight check <项目> --lang zh --details` 跑一篇在写的论文并逐条人工复核误报，再用 `bib fix --level safe` 看 diff 决定是否落盘，并用 `bib fetch` 取代凭记忆写条目。理由是原文给出了可直接复制的命令、规则清单、agent 接入方式和量化评测数据（最新一批真实论文误报约每 100 条引用 1.3 次），但它自述仍是 v0.4 早期版本、有已知误报与漏检，必须先人工复核再进流程。
- [danepps/legal-research-skills](../research/radar/2026-10-21/5563-danepps-legal-research-skills.md)：值得一试，建议小范围试：用一份 3–5 页带脚注的短稿跑一遍 cite-check，重点看报告是否能把「已确认问题 / 无法核实 / 误报」分开且能按引文定位；理由是该仓库把「引用可核查」做成了从安装、setup 到固定报告文件的完整可照做流程，但作者自述会漏报误报、Codex 桌面安装路线尚未端到端验证，且本次只有 README 可依据。
- [JimmyRaoUF/academic-revision-checklist](../research/radar/2026-11-04/10235-jimmyraouf-academic-revision-checklist.md)：值得一试，建议先在英文学术写作的小范围修订中试用：按 README 安装 Claude skill 或粘贴清单，先跑脚本列出候选，再由人按 16 条清单和 workflow 逐句核对，研究问题、引文、数字和反思不交给 AI。理由是它给出了可复制的安装、脚本命令和逐句检查流程，但可见材料只有 README，缺少完整规则、提示词和效果数据，暂不宜直接 adopt。
