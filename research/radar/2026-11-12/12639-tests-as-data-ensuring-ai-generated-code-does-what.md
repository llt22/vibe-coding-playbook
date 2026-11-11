# Tests as data: ensuring AI-generated code does what we want

- 结论：**值得一试**。把「客户测试」从测试代码里搬出来，写成人可读、可 diff 的测试数据（YAML/CSV/结构化场景），先在一个模块上让 AI 照着样例写 runner、人机共同补用例并接进 CI，以此作为与编码 agent 的契约。理由是原文给出了从 DSL 样例到 runner、到投影/旁路的具体做法和可直接套用的表格范式，但实现细节章节缺失、效果证据多为二手报告与访谈，尚不足以直接 adopt。
- 原文：https://martinfowler.com/articles/tests-as-data.html
- 来源：rss:src-martin-fowler，初筛相关度 3，依据原文
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-11T21:06:15.756Z

## 是什么

Matteo Vaccari（Thoughtworks 意大利 Technical Principal）在 martinfowler.com 上发表的文章，主张：当 AI 同时写产品代码和测试代码时，开发者实际上变成了代码的「客户」，因此应当以**客户测试（customer tests）而非开发者测试**作为人与 AI 之间的主要契约；而把这份契约放进**测试数据**而不是测试代码里，可以更容易地防止编码 agent 意外改动它。

四条核心技法：

1. **Customer tests**：用客户的语言写测试，描述软件该做什么。
2. **Black box**：从外部测试系统或组件，不提及实现细节。
3. **Tests-as-data**：测试只捕获事实——输入、期望输出或副作用、测试前置状态，不含实现细节代码。
4. **Test DSL**：用领域专家能看懂、失败时能产生干净 diff 的文本表示输入、输出和系统状态。

作者把三条目标属性作为验收标准：测试要能**预测生产中的成功**、要**抗重构**、要**尽可能易读**。

关键前提判断（作者的三个主张）：AI 写代码时开发者成为客户；因此客户测试成为主要契约；把契约移到测试数据里更易保护。作者还指出，过去写 DSL 解析器和自定义测试运行器成本高，现在 AI 让这件事变便宜了。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

> 前提：已有可运行的被测系统（示例是 HTTP 服务 `/hello`），有一个能写代码的 agent，且测试能进 CI。

**第 1 步：识别现有测试里真正的「事实」在哪。**

把测试名、输入、期望输出三者圈出来，其余视为样板。原文示例中，`defaultGreeting()` / `personalisedGreeting()` 两个 JUnit 测试里真正有信息量的只有：

- 测试名：`default greeting` / `personalised greeting`
- 输入：`/hello`、`/hello?name=Joe`
- 期望输出：`Hello, world!`、`Hello, Joe!`

**第 2 步：起草一小段你想要的测试 DSL 样例（不要先写 runner）。**

前提：只挑一个功能域（原文是 greetings）。原文给出的 YAML 样例可原样作为起点：

```yaml
suite: greetings
tests:
 - name: "default greeting"
   request:
     resource: "/hello"
     name: null
   greeting: "Hello, world!"
 - name: "personalised greeting"
   request:
     resource: "/hello"
     name: "Joe"
   greeting: "Hello, Joe!"
```

**第 3 步：让 AI 为这段 DSL 写测试运行器。**

前提：DSL 格式已定；告诉 agent 目标是把该数据文件解析成参数化测试用例并驱动真实系统。原文的判断是「让 AI 写 runner 很容易」，且这是整篇文章的可行性支点。

**第 4 步：人和 AI 一起补测试用例，尤其是边界与错误用例。**

原文给出的追加用例（可原样追加到同一 YAML 的 `tests:` 下）：

```yaml
 - name: "name must not be entirely whitespace"
   request:
     resource: "/hello"
     name: " "
   error: "Name must not be entirely whitespace"
```

**第 5 步：输入/输出是标量时，压缩成表格（CSV 或 Markdown 表）。**

原文的 CSV 版本（字段：test_name, resource, name, greeting, error）：

```csv
test_name, resource, name, greeting, error
default greeting, /hello, null, "Hello, world!",
personalised greeting, /hello, Joe, "Hello, Joe!",
not whitespace, /hello, " ", null, Name must not be entirely whitespace
```

表格的好处（原文明确列出）：一眼看清覆盖了哪些情况、可能缺哪些情况，加用例更容易。

**第 6 步（关键约束）：表格里每一行必须是**无状态**操作，只写输入与期望输出。**

原文反面示例，不要这样写状态机：

```
| action | result |
| login as trader | ok |
| go to admin page | forbidden |
| login as admin | ok |
| go to admin page | ok |
```

**第 7 步：把单条 Gherkin 场景改写成覆盖多维组合的表格。**

原文给出的访问控制表（可原样作为表格范式）：

```
| admin_dashboard_access_control |
| role | session_state | resource | expected_result | logged |
--------------------------------------------------------------------------
| trader | valid | admin dashboard | denied | yes |
| trader | valid | admin API | forbidden | yes |
| admin | valid | admin dashboard | allowed | no |
| admin | valid | admin API | allowed | no |
| viewer | valid | admin dashboard | denied | yes |
| support | valid | admin dashboard | denied | yes |
| guest | none | admin dashboard | login required | yes |
| trader | expired | admin dashboard | login required | yes |
| trader | tampered | admin API | unauthorized | yes |
| trader | valid | admin direct URL | denied | yes |
```

**第 8 步：输入是结构化数据（多行文本、程序、页面状态）时，改用结构化场景。**

原文三种可直接照抄的场景形态：

(a) 带光标标记的文本编辑场景（源自 Ron Jeffries）：

```
---- before ----
<p>Fo|o</p>
<p>Bar</p>
----------------
* press enter
---- after ----
<p>Foo</p>
<p>|</p>
<p>Bar</p>
----------------
```

(b) 解释器/编译器的程序 + 期望输出（BASIC 解释器实验，原文给出了简化版 YAML）：

```yaml
tests:
 - name: "LEN function basic tests"
   program: |
     10 PRINT LEN("HELLO WORLD")
     20 PRINT LEN("")
     30 PRINT LEN("A")
     40 END
   expected:
     - "11\n"
     - "0\n"
     - "1\n"
```

原文同时给出了 `LEFT$` 的同类用例（`LEFT$("HELLO WORLD", 5)` → `HELLO`、`LEFT$("HI", 10)` → `HI`、`LEFT$("TEST", 0)` → 空行、`LEFT$("HELLO", 3)` → `HEL`）。

(c) Web 应用：GIVEN model / WHEN user / THEN page / THEN model 四段式，把 HTML 投影成可 diff 的文本：

```
## Unchecking a completed todo reactivates it
GIVEN model:
 [x] buy milk
 [ ] walk the dog
WHEN user:
 click toggle of "buy milk"
THEN page:
 > ""
 [ ] buy milk
 [ ] walk the dog
 -- **2** items left
THEN model:
 [ ] buy milk
 [ ] walk the dog
```

**第 9 步：写两个 printer + 两个 parser。**

前提：应用有可读取/可设置的内部状态入口。

- printer：把 HTML/DOM 投影成上面那种可读、可 diff 的文本（原文引 Esko Luontola 的做法）；第二个 printer 输出内部状态（上例 `THEN model`），因为改状态的操作不能只验 UI，还要验持久状态确实变了。
- parser：一个解析 `GIVEN model` 用来**设置**初始状态；一个解析 `WHEN user` 用来识别可施加的操作词汇表。
- 这两个机制要能访问和操作应用状态本身——通过**旁路（side channel）**实现。

**第 10 步：搭旁路（side channel）用于播种状态。**

原文给的可行形态：

- 一个独立的可执行文件，复用应用代码仓库，以与应用一致的方式写状态，**永不发布到生产**；
- 或一组不对外公开的 API（引 Toby Clemson 的 internal resources 说法）。

为什么不走 UI 播种：会增加准备时间、增加 flaky 概率，还可能为了测试硬加 UI 操作，扩大 UI 面并降低安全性。

**第 11 步：把上述机制组装进一个 agent 容易生成的 runner，并接进 CI。**

作者强调：测试数据在 CI 里跑，所以这类 spec「不会过期」（cannot go stale）。

**第 12 步（防篡改）：把 test harness 与测试数据分开保护。**

原文的原则是：测试写成文本文件，AI 改动时就更容易被发现；runner 相对小，便于人工审查与保护（原文「Protecting the test harness」一节标题存在，但正文在抓取内容中缺失，具体手段无法转述）。

**若考虑用现成的 Gherkin/Cucumber**，原文提醒三点：格式相当自由，AI 写时须检查是否写了弱断言；step definition 容易繁殖，必须刻意保持步骤库小；自定义 DSL 相对标准 given-when-then 的优势是可以**强制结构**（比如把「操作后必须比对系统状态」设为语法必填项，并决定比对要多完整）。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现（AI 能做但还没交给它的事）**
原文直接指出：过去 DSL 解析器和自定义测试运行器「写起来和维护起来都贵」，现在 **AI 让它们变便宜**。也就是可以把「为自家领域写一个专用测试 DSL + runner + printer」这类过去不划算的工程，交给 agent 做。此外 agent 还能承担用例扩写（原文流程第 3 步「Both human and AI integrate any other useful test cases」）。

**2. 任务匹配（什么工作适合什么方式）**
- 输入、前置状态、期望输出都是**单个标量**→ 表格（CSV/Markdown）。
- 输入是**结构化数据**（多行文本、程序、页面状态）→ 结构化场景 + printer/parser。
- **不能**把有状态流程塞进表格；表格每行必须是 stateless 操作。
- 端到端客户测试慢且易碎 → 用投影（把 HTML 压成文本）和旁路（不走 UI 播种）来缓解。
- 单元测试/开发者测试仍可有用，但**不作为行为的首要真相来源**。
- 关于 TDD 与 agent：让 AI 严格遵循 canon TDD 不容易，AI 往往先写一大堆代码再写测试；而 agent 在「只告诉它要什么和怎么验证」时表现更好，额外教它「怎么实现」反而更差。这些技法正是提供那个「怎么验证」。

**3. 条件供给（要给什么信息、工具、权限、反馈）**
- 给 agent 一段**DSL 样例**（而不是一段散文规格），由它写 runner。
- 给 agent **可执行的验证方式**（测试数据 + runner），而非 Markdown 散文计划。原文批评 SDD 的散文 spec：量大读不完、完成后难维护、LLM 不遵守全部细节、自然语言有歧义——「prose specs can't be executed; tests can.」
- 需要**旁路权限**：内部 API 或仅测试用的可执行文件，能直接读写应用状态。
- 需要 **CI** 持续执行。
- 需要**反馈可见性**：失败时产生干净的 diff（这是 test DSL 的设计要求之一）。

**4. 主动推进（时间/事件/状态触发）**
仅在「CI 中运行」这一层有依据：作者称这些可执行 spec「cannot go stale, because they run in CI」——即提交触发、持续校验，防止 AI 悄悄改坏契约。原文没有更细的触发或调度设计。

**5. 效果验证（怎么判断真的改善了）**
- 三条目标属性即判据：能预测生产成功、抗重构、尽可能易读。
- 抗重构的机制性论证：黑盒 + 不含实现细节 → 重构不应打破测试；反之 mock/stub 重的测试会在无害重构时误报。
- 可审查性：测试变成文本数据后，「AI 改测试」这件事更容易被发现（diff 小且集中）。
- 原文有「Validating the tests」小节标题，但正文在给出的材料中**缺失**，具体如何验证测试本身无法转述。

## 与已有做法的关系（对照给出的清单条目）

- **Cline（tool, watch）/ Cursor（tool, watch）**：原文通篇针对「AI coding agents」这一类工具，但**未点名** Cline 或 Cursor，也未给这两个工具的具体配置。可直接借用的是定位关系：把本文的测试数据 + runner 当作这些 agent 的验证层与契约层。
- **Mutation testing（method, try）**：原文可见部分**未提及**变异测试；它只在「Validating the tests」一节标题上与之目标相近，但正文缺失，不能据此建立关联。
- **ThoughtWorks Technology Radar（source, adopt）**：作者身份为 Thoughtworks Technical Principal，文章内容带有 Thoughtworks 的实践视角（开篇即以该组织 26 名开发者的访谈为证据起点），可作为该来源条的补充读物。
- **Martin Fowler（source, adopt）**：文章发表于 martinfowler.com，且明确承接 Fowler 2004 年的「Specification by Example」文章与 XP/Fit/Go 表格测试/approval testing 传统，属于该来源脉络下的新作。
- 清单中**没有**直接对应「测试即数据 / 客户测试 DSL / 自建测试 runner」的条目。

## 证据与局限

**原文给出的数据与案例**

- 2026 年初对某重度使用 AI coding agents 的组织中 **26 名开发者**的访谈。问「你信任我们的测试吗？」，回答普遍是不太信任：即便初次生成时审查过，后续 AI 会同时重构代码和测试，因此不再确信测试仍在保证正确行为。
- 三份二手报告引用：Faros AI Engineering Report 2026（每个 PR 的 bug 数 +28.7%，每开发者 bug 数 +54%）；DX《AI-assisted engineering: Q1 impact》报告（部分公司缺陷增加 50%）；CloudBees《State of Code Abundance 2026》（213 名企业技术负责人中 **81%** 报告生产问题增加；**70%** 认为测试套件维护比写代码本身负担更重）。
- 案例：Ron Jeffries 2004 年书中的 XML 编辑器客户测试；Bugzilla 查询表达式语言测试（Max Kanat-Alexander 所述，20 个操作符 × 50 个字段，2011 年写成 Perl 哈希表，至今仍在代码库）；BASIC 解释器实验；todo-list 的四段式场景；Go `fmt` 包的表格测试。

**哪些只是作者主张**

- 「AI 让 DSL 解析器和测试 runner 变便宜」——作者主张，**无成本或工时数据**。
- 「外部质量下降的原因可能是自动化功能测试质量下降」——作者自己写明「I don't know for certain what the causes are of this widely reported decrease in external quality」，属推测，非因果结论。
- 「让 agent 只告诉它要什么和怎么验证、不教它怎么做会更好」——作者基于经验的判断，原文未给实验数据。
- 「AI 生成的测试往往只是在确认当前实现（包括其中的 bug）」——来自访谈与作者经验，未给统计。

**适用条件与已知反证**

- 前提是你能维护一份自定义 DSL 与 runner。历史上这条路的失败案例原文自己写了：James Shore 早期采用并维护 Fit 实现，后来 disillusioned——客户并不想写测试表，最终变成他自己写；Fit/Gherkin 后来普遍被下放给 QA 做事后测试，违背了「促进与客户对话」的初衷。作者的反駁是「现在开发者就是客户、agent 写 runner 很便宜」，但这仍是论证而非证据。
- Gherkin/Cucumber 的具体坑原文点名：格式自由导致弱断言；step definition 繁殖。
- 客户测试尤其是端到端形态**慢且易碎**，原文承认，并只用投影与旁路做了部分缓解。
- 表格化只适用于标量与单状态；复杂行为要另设机制。
- **材料本身的局限**：抓取文本在 Go `fmt` 测试示例处截断，且「Implementation hints」（Not always end-to-end、Customer tests for the UI、Dealing with external systems、Protecting the test harness、Validating the tests、Beyond example-based tests、Limits of applicability）这些最接近「可照做细节」的小节**只有标题、没有正文**。因此本报告只能覆盖到核心技法与示例层面，实施细节（尤其是如何验证测试本身、如何保护 harness）无法提炼，verdict 相应从 adopt 降到 try。

## 怎么试、怎么验证

**最小试用（建议 1–2 周，单模块）**

1. 选**一个**功能域、**一个**已存在的用户故事，最好是当前由 agent 写、你已经开始不信任其测试的那块。
2. 人工写出 3–5 行 DSL 样例（YAML 或 CSV 均可，直接照抄本文的 greetings 结构改字段名）。
3. 让 agent 依据样例写 runner，并跑通这 3–5 个用例。
4. 人机共同补到 8–12 个用例，必须包含至少 2 个错误/边界用例（如本文的「name 不能全是空白」）。
5. 接入 CI，作为该模块的合并门槛。
6. 保留原有单元测试，但明确记录：行为争议以客户测试数据为准。

**判断有没有改善的指标（都可从仓库与 CI 直接取）**

| 维度 | 指标 | 期望方向 |
|---|---|---|
| 可读性 | 表达同一批用例的「数据行数 vs 测试代码行数」比值 | 数据占比显著高 |
| 抗重构 | 做一次纯重构（不改行为）后，测试文件的改动行数 | 接近 0；对比原有单测的改动量 |
| 防篡改 | agent 提交中修改测试数据文件的 diff 是否小到可人工逐行读完 | 可读完（这是本文的核心卖点） |
| 失败可诊断 | 一次故意注入 bug 后，失败输出是否给出清晰的 before/after diff | 是 |
| 有效性 | 注入 3–5 个真实语义 bug，看客户测试能抓到几个 | 抓到的比例；抓不到的用例反推 DSL 缺了什么字段 |
| 生产结果 | 该模块上线后的功能缺陷数、回归数 | 下降或不升 |
| 成本 | 维护 runner + DSL 的工时；test suite 维护占总工时比例（对照 CloudBees 的 70% 基线） | 不高于原有测试方式 |

**明确的止损条件**：如果 3 周内 runner 的维护成本持续高于所替代的测试代码，或团队/agent 反复把状态逻辑塞进表格导致用例脆弱，则退回「用代码写测试 + 静态分析规则约束」的路线（原文也记录 Max Kanat-Alexander 的偏好：他通常更愿意让 agent 用代码写测试，以便用静态分析对测试施加规则）。

**若要进一步验证「测试本身是否有效」**，原文对应小节缺失，需自行补齐手段；不要假设文中给出了方法。
