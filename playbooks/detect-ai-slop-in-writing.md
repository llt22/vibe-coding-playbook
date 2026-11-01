# AI 稿子交付前，先过一遍可复现的文风检查

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：AI 起草的稿子读着假却说不清哪里假，这篇手册给出一条可照着做的路径：先用确定性检查器定位能量化的特征，再用模式清单逐条抓措辞套路，只改被点名的地方并按固定轮次停下。
> 先试这一步：挑一篇最近的 AI 稿，跑 `npx humanizer-lint --file draft.md --lang auto --json`，只改 violations 里点名的那几句，再重跑看退出码是否从 1 变成 0。
> 最近修订：2026-11-02

## 解决什么问题
AI 起草的稿子常有“读着有点假但说不出哪里假”的问题，靠人通读既慢又主观。这篇手册把它拆成两道可执行的关：先用 humanizer-lint 做确定性检查（句长方差、相邻句长度差、词汇多样性、套话词表、段落对称等，输出 0–100 分、违规位置和 `fixInstruction`），再用 FeedHive/ai-slop-detector 的 120 条模式清单让 agent 逐条挑措辞和结构套路。两层都只改被点名的地方，并按固定轮次停下。

## 适用与不适用
适用：
- 你或同事用 AI 起草了稿子，想抓措辞与形式上的“AI 味”，并且希望检查结果可复现。
- 你要在 PR / CI 里卡一道文风关，或者给 agent 工作流加一个出稿后的验证环节。
- 适合的文体：文案、博客、SEO 文章、技术文档、Markdown 校对、学术散文、翻译润色。
- 你有 Claude Code（或 Cursor、Windsurf、Cline、Codex、Gemini CLI），希望把检查装成 skill 随时调用。
- 你只在聊天应用里工作，可以贴清单 + 草稿做检查。
- 你有自己的产品/工具链，想用 patterns.json 结构化数据维护清单。

不适用：
- 不要用它判断文本是人写还是 AI 写。humanizer-lint 明确不是 AI 内容检测器，不估 perplexity、不判作者身份；ai-slop-detector 作者也明确划了边界：它不判断作者归属，人也这么写，模型也可以被要求避开。
- 不要单条命中就判死刑。作者的口径是：一条模式在人类写作里很正常，一段里出现好几条才是 AI 味。
- 不要用它做需要语义正确性判断的编辑决策。两个工具都只诊断形式，不改写、不判定事实对错。
- ai-slop-detector 的英文清单直接套中文会大批误报。清单是英文写作导向；中文优先用 humanizer-lint 的 `zh` 包，清单则要自建中英映射表。
- 社媒/LinkedIn 那一类（15 条）适用面窄，写邮件、写文档的人大部分用不上。
- “内容实质”类（C-01 到 C-12）本质上要求写作者给出事实和数字，工具只能指出缺失，填不了内容。
- 原文没有对照实验、没有 A/B、没有前后对比；不能把它当成已验证的效果工具。
- ai-slop-detector 没有定时、事件或状态触发，也没有持续运行、后台检查或编辑器/CI 集成；能接事件触发和退出码分支的是 humanizer-lint。

## 前置条件
- Node.js >= 18.3（humanizer-lint 原文徽章声明）。零运行时依赖，生产代码不含 `fetch`/`child_process`/`eval`，文本不上传外部服务；只有安装阶段需要网络。
- 一份完整成稿：文档 < 20 词或 < 3 句会返回 `SKIP`（词汇违规仍报告）；少于 8 句会跳过节奏统计门。
- 可选：Claude Code / Codex 之类能读仓库、写文件、执行本地命令的 agent，用来装 skill 和跑闭环。
- 中文写作：humanizer-lint 有 `zh` 词表包，可直接 `--lang zh` 或用 auto；但原文只列出 8 个语种有包、其余走 universal 且“阈值未经校准”，zh 的实际阈值同样要在自己稿件上小范围试。ai-slop-detector 的清单是英文导向，中文仍需自建映射表。
- 浏览器版快速体检：文本不涉密、可以贴到外部网页。
- 手动装 ai-slop-detector：确认 `~/.claude/skills/` 是你 Claude Code 的 skills 目录，否则换成实际路径。

## 操作步骤

### 做法 A：先跑确定性 linter（第一道关）

1. 不安装，先跑一次。前提：Node >= 18.3，`draft.md` 是完整成稿。命令：
```sh
npx humanizer-lint --file draft.md --lang auto
```
预期结果：终端给出 0–100 分、违规类型与位置、一条可直接照着改的 `fixInstruction`；退出码 `0` = PASS 或 SKIP，`1` = 分析完成且 FAIL，`2` = 参数非法、文件不可读或 profile 损坏。中文稿可先用 `--lang zh`。

2. 取机器可读结果。前提同上。命令：
```sh
humanizer-lint --file draft.md --lang auto --json
```
```sh
cat draft.md | humanizer-lint --stdin --lang auto --json
```
预期结果：JSON 含 `status`、`score`、`language`、`metrics`（`wordCount`、`sentenceCount`、`burstinessCV`、`adjacentDelta`、`mattr`）和 `violations`（`type`、`location`、`actual`、`target`、`fixInstruction`）。注意 `sourceScope` 为 `sentence-range` / `document-excerpt` 时是诊断上下文，不是要机械替换的文本。

3. 只改被点名的句子。逐条读 violations，按 `fixInstruction` 做最小必要修改。硬性约束：保留功能性代码、标识符、命令、结构化数据、法律条款、引文、事实与数字；若继续修改会扭曲含义或语域，就停下来说明这条未解决的诊断，不要硬改。预期结果：得到 v2。

4. 重跑，最多三轮。原文给出的闭环可逐字照做：
```text
1. 在支持的语言里起草或编辑，不改动事实。
2. 对完整成稿跑分析器。
3. 逐条读违规，只改被点名的散文或整篇检查项。
4. 重跑，三次迭代后停止。
5. 只有 PASS，或如实标注的短文本 SKIP（且无未决词汇违规）才算过。
```

5. 设通过门槛。前提：你希望 CI 或脚本能直接判过/不过。命令：
```sh
humanizer-lint --file draft.md --lang auto --min-score 80
```
预期结果：低于阈值或 `FAIL` 即退出 1。原文的判定线是：正常长度文档需 `score` ≥ 80、无 `SLOP_PHRASE`/`DEFINITIONAL_OPENING`、burstiness 与 adjacent-delta 门通过、句长范围达标。扣分上限：节奏/句长范围最多 −25，单调节奏窗 −20，词汇与结构套话 −30，印尼语形态 −15，词汇多样性+熵+profile 偏差合计 −10。其它可用参数：`--domain auto|prose|copywriting|code|ui`（按扩展名路由）、`--no-domain-lint`、`--allow "短语1,短语2"`（大小写不敏感的精确豁免）。

6. 对确有必要的句子加豁免。前提：你确认这一句是功能性文本，改了就失真。写法：
```text
<!-- humanizer-ignore -->
```
单独一行抑制下一非空行；文件级用 `<!-- humanizer-ignore-file -->`。注意：围栏代码块内的指令不生效；含反引号的 JS/TS 文件里指令会被保守禁用（有 warning）。

7. （可选）用个人文风 profile 做参照。前提：`--input` 指向一个文件，或一个目录里最多 5 个 `.md`/`.txt` 样本。命令：
```sh
humanizer-fingerprint \
  --input writing-samples \
  --output profiles/custom-voice.json \
  --name editorial-voice \
  --lang en
```
```sh
humanizer-lint --file draft.md --lang en --profile profiles/custom-voice.json --json
```
预期结果：profile 记录平均句长、标准差、burstiness、adjacent delta、MATTR、平均段落句数、标点率；平均句长偏离超过 30% 触发 5 分扣分（在 10 分的词汇+熵上限内）。

8. 接进 CI，让每次 PR 都跑。前提：仓库的 PR 会改动 `**/*.md`、`**/*.txt`。原文 YAML 原样：
```yaml
name: prose-check

on:
  pull_request:
    paths:
      - "**/*.md"
      - "**/*.txt"

jobs:
  lint-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: yanstd888/humanizer-lint
          path: .humanizer-lint
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: node .humanizer-lint/scripts/analyze.mjs --file README.md --lang auto --json
```
注意：一次只接受一个文件，多文档要循环调用。这一步与旧版“只能手动调用”不同——humanizer-lint 有稳定退出码，可以直接当流程分支条件。

9. 装成 agent skill，让 agent 自己跑闭环。前提：agent 能执行本地命令、读 exit code 和 JSON。命令：
```sh
npx skills add yanstd888/humanizer-lint
```
预期结果：在 Claude Code / Cursor / Windsurf / Cline / Codex / Gemini CLI 里，可以让 agent 执行“跑 → 只改被点名处 → 重跑（最多三轮）”。

### 做法 B：用清单抓措辞与结构套路（第二道关）

10. 把 ai-slop-detector 装成 agent 技能。前提：agent 能访问 GitHub。提示词原样：
```text
Install the AI Slop Detector skill from https://github.com/FeedHive/ai-slop-detector
```
预期结果：skill 被装到你的 skills 目录，之后可以在对话里调用。

11. 或者手动装。前提：`~/.claude/skills/` 是你的实际 skills 目录。命令：
```sh
git clone https://github.com/FeedHive/ai-slop-detector.git
cp -r ai-slop-detector/skills/ai-slop-detector ~/.claude/skills/
```
预期结果：skill 出现在 Claude Code 的 skills 目录中。

12. 不装 skill，在聊天里贴清单。前提：你能拿到清单文本、草稿可以贴进对话。适用：聊天应用形态，或只想先试一次。做法：把 README（或 skill）和草稿一起贴进对话。

13. 写前约束。在让 AI 起草前，把清单交给它，要求“写的时候避开里面每一条模式”。前提：你已经拿到清单。预期结果：生成时少产生 AI 味，而不是事后返工。

14. 写后检查（最实用的一步）。把 README（或 skill）和草稿一起贴进对话，要求它逐条列出命中的模式，并给出命中所在的那一行。原文对这一步的说法是 ask for every pattern it finds, with the line it found it in——要求带行号是关键，否则模型只会给一堆泛泛评价。前提：草稿全文已提供。预期结果：得到一份带行号的命中清单。

15. 按 Bad→Better 的对照改写。清单每条都给了替换方向，规律大致三类：
- 把抽象名词换成具体数字/对象：V-04 `plays a pivotal role in growth` → `drives 40% of signups`；
- 把装饰动词换成事实陈述：V-05 `The results underscore the importance of testing` → `Testing caught three bugs before launch`；
- 把元话语（告诉读者这段多重要）整段删掉：C-08 `Surprisingly, the simple version won` → `The simple version got twice the clicks`。
前提：你已经拿到命中清单。预期结果：得到改写后的 v2。

16. 只做快速体检。用浏览器版：把草稿粘贴到 README 里给出的免费工具页面。前提：文本不涉密、可以贴到外部网页。预期结果：快速看命中情况，不装任何东西。

17. 接进自己的工具链。前提：本机有 Node。命令：
```sh
# 编辑 patterns.json（增删/改写模式）
node scripts/build.mjs   # 重新生成 README 和 skill
```
许可为 MIT，可以改、可以塞进自己的产品。预期结果：你改过的模式会重新生成到 README 和 skill。

18. 中文写作的前置动作。humanizer-lint 的 `zh` 包能覆盖一部分词表，但 ai-slop-detector 的清单仍是英文导向。做法：自己建一张中英映射表，例如把「深入探讨/赋能/抓手/闭环/值得注意/在当今快速变化的时代」对应到 V-01、V-07、V-15、V-20 一类；映射表也放进 `patterns.json`，用同一套 build 流程维护。前提：你做中文写作，且愿意维护映射。预期结果：中文命中数不会被英文清单的误报淹没。

19. 检查用的分类总表（可直接当核对表），数字来自原文：
```text
Vocabulary                       20
Stock phrases                    15
Sentence patterns                22
Structure and rhythm             12
Imagery and metaphor              6
Substance                        12
Formatting and punctuation       10
Chatbot residue                   8
Social media and LinkedIn        15
```

### 怎么选、怎么排
- 只想看一眼、文本不涉密：走第 16 步浏览器版，零安装。
- 要在 PR/CI 里卡住、要可复现的数字：走做法 A。
- 要抓“套话、元话语、结构对称”之外的写作套路、需要解释为什么改：走做法 B；linter 的 `fixInstruction` 只针对被量化的特征。
- 推荐组合顺序：B 写前约束 → 出稿 → A 跑第一轮并只改被点名处 → B 逐条列命中并改 → A 复跑确认没退化（三轮内停）。
- 只有聊天应用、装不了 Node：只做 B，并接受它没有确定性指标。
- 你有自己的产品/工具链：走 patterns.json + `node scripts/build.mjs`。

## 怎么判断变好了
最小试用方式（半天内可完成）：
1. 挑一篇最近由 AI 起草、你觉得“读着有点假但说不出哪里假”的稿子，留一份原文做 baseline。
2. 跑 A，记下：`status`、`score`、violations 条数、分项 `burstinessCV`/`adjacentDelta`/`mattr`（有 profile 时再加 `voiceProfileDeviation`）。
3. 跑 B，记下：命中模式总数、集中在哪几类、有没有同一段里命中多条（即“同段 ≥2 条”的段数）。
4. 只改被指出来的地方（A 按 `fixInstruction`，B 按 Better 那列的方向：换具体数字/名字/动作，或直接删掉整句），得到 v2。
5. 用同样的命令和同样的提示词复跑 A、B，对比两组数。
6. 盲评：把 baseline 和 v2 去掉标题后，自己隔一天再看，或让没参与改写的同事二选一——哪一版更像人写的。

判断有没有改善的指标：
- 主指标（A）：`score` 是否上升、violations 条数是否下降、退出码是否从 1 变 0；分项看 `burstinessCV`、`adjacentDelta`、`mattr`、`compressionRatio`、`shortSentenceRatio`、`longSentenceRatio`。
- 主指标（B）：单位文本（如每 300 字/每段）命中的模式数，以及“同一段内命中 ≥2 条”的段数——这是原文自己给的口径，最好用。
- 次指标：改写后文本中出现具体数字、专有名词、可核实动作的句子占比。
- 主观校验：盲评“更像人写的”版本胜率；注意不要由做改写的人来当评审。
- 中文场景：要么用 `zh` 包，要么先建映射表再计数，否则命中数会被误报淹没，指标失去意义。

这些值是**指标不是机械配额**，`voiceProfileDeviation` 不是作者概率。

试多久：
- 先跑两三篇。humanizer-lint 的基准只有 20 条合成样本，作者本人声明它不衡量真实准确率；ai-slop-detector 原文也没有任何效果数据、A/B 或前后对比。

什么时候该停：
- 跑了两三篇之后发现主要命中的都是“内容实质”类（C-01 到 C-12）：问题其实是没写事实，清单填不了内容。
- linter 分低但违规全在节奏类，而再改会扭曲含义或语域：按原文约束停下来说明这条未解决，不要为过阈值硬改。

## 常见坑
- 把它当“是不是 AI 写的”检测器。humanizer-lint 明确不是 AI 内容检测器，不估 perplexity、不判作者身份；ai-slop-detector 作者也明确说它不判断作者归属。
- 把 score 当硬性标准。基准只有 20 条合成样本，作者声明不衡量真实准确率；它是验证关卡，不是验收线。
- 用短文本跑。文档 < 20 词或 < 3 句返回 `SKIP`，少于 8 句跳过节奏门，得到的数字没有意义。
- 为过阈值改坏事实、代码、标识符、引文。原文明确要求保留这些内容，改不动就停下说明。
- 无限迭代。原文闭环是三次迭代后停止。
- 只看分数不看 violations。真正要改的是被点名的位置，`fixInstruction` 是给你照着改的，不是让你重写全文。
- 在 CI 里一次传多个文件。该工具一次只接受一个文件，多文档要循环调用。
- 豁免指令放错位置。围栏代码块内不生效；含反引号的 JS/TS 文件里会被保守禁用。
- 把 Markdown 预处理当完整语法树。它只做确定性清洗：去 frontmatter、围栏代码块、标题、表格；HTML 块与任意 MDX 组件不特殊处理——所以把文档写成“代码块里放代码”能天然避免误判。
- 中文直接套英文清单。ai-slop-detector 的清单是英文写作导向，直接套会大批误报；中文优先用 humanizer-lint 的 `zh` 包，清单则要自建映射表。
- 单条命中就判死刑。作者说一条模式在人类写作里很正常，一段里出现好几条才是 AI 味。
- 只改措辞不补事实。“内容实质”类只能指出缺失，填不了内容。
- 以为 ai-slop-detector 会自动持续跑。原文没有定时、事件或状态触发，也没有编辑器/CI 集成；能接事件触发和退出码分支的是 humanizer-lint。
- 在写邮件、写文档时套用社媒/LinkedIn 那 15 条，大部分用不上。
- 手动装 ai-slop-detector 时没确认 `~/.claude/skills/` 是实际 skills 目录。

## 证据与来源
做法 A（第 1–9 步）来自 yanstd888/humanizer-lint 调研报告。该报告转述 README 的事实包括：Node.js >= 18.3、零运行时依赖、生产代码不含 `fetch`/`child_process`/`eval`；8 个语种词表与形态规则包（`en`、`id`、`es`、`ms`、`fr`、`de`、`pt`、`zh`），其余语言走 universal 通用节奏分析且阈值未经校准；0–100 分、违规类型与位置、`fixInstruction`、JSON 结构与示例；退出码 0/1/2；`--min-score`、`--domain`、`--no-domain-lint`、`--allow` 参数；扣分上限；忽略指令规则与围栏代码块/反引号限制；Markdown 预处理范围；GitHub Actions YAML；`npx skills add yanstd888/humanizer-lint` 与五步闭环；`humanizer-fingerprint` 参数、1–5 个样本、平均句长偏离 30% 扣 5 分。该报告同时记录作者的边界声明：不改写文本、不是 AI 内容检测器、不判作者身份、不扫目录、无 SARIF 输出。
做法 B（第 10–19 步）来自 FeedHive/ai-slop-detector 调研报告。原文给出的数据与结构：120 条模式、9 个类别、各类条数（Vocabulary 20、Stock phrases 15、Sentence patterns 22、Structure and rhythm 12、Imagery and metaphor 6、Substance 12、Formatting and punctuation 10、Chatbot residue 8、Social media and LinkedIn 15）；每条模式都带一个 Bad/Better 对照例子；仓库许可 MIT；线索给出的仓库指标 34 stars。安装命令、维护命令 `node scripts/build.mjs`、带行号检查的做法均出自该报告。
效果证据：两份材料都没有对照实验。humanizer-lint 作者自述基准只有 20 条合成样本、不衡量真实准确率、不判作者身份；ai-slop-detector 原文没有效果数据、A/B 或案例，34 stars 只是线索指标，不是效果证据。
属于作者主张、未经验证的部分：模型可以被要求避开这些模式；这些模式读起来像 AI 味；用清单或检查器能改善写作结果；“这些值是指标不是机械配额”。
适用边界来自两份原文：启发式清单与确定性检查器都不判作者归属；单条命中不算问题；清单是英文写作导向，中文需映射；社媒/LinkedIn 类适用面窄；“内容实质”类只能指出缺失；humanizer-lint 只诊断不改写。
新旧做法的差异需要保留：旧版依据 ai-slop-detector 原文写“没有定时/事件触发、只能按需手动调用”；humanizer-lint 原文提供了 `pull_request` 触发、退出码分支和三轮闭环，所以本版把“可自动化”限定到做法 A，ai-slop-detector 仍按手动调用描述。

## 依据的调研

- [FeedHive/ai-slop-detector](../research/radar/2026-10-13/2779-feedhive-ai-slop-detector.md)：值得一试，把 FeedHive 的 ai-slop-detector 作为 Claude Code 技能装上，在 AI 起草后做一道「AI 味」清单检查，再按它每条 Bad→Better 的对照改写成具体事实；安装命令和清单都是现成可照做的，但原文只有作者主张、没有任何效果数据，且清单是英文写作导向，所以先小范围试、自己量命中数再决定是否长期用。
- [yanstd888/humanizer-lint](../research/radar/2026-11-02/9340-yanstd888-humanizer-lint.md)：值得一试，可以把 humanizer-lint 小范围试成“AI 出稿之后的确定性文风验证环节”：装好后跑 `npx humanizer-lint --file draft.md --lang auto --json`，只修改被明确指出位置的句子，最多迭代三轮，再看 exit code。理由是原文给出了完整命令、参数、退出码、评分规则和 CI 配方，可按原样执行；但基准只有 20 条合成样本，作者本人声明它不衡量真实准确率，也不判定作者身份，所以只能先作为验证关卡试用，不宜当作硬性标准。
