# 让编码 agent 在合并前拿出可执行证据：关键流程门禁、测试数据契约与本地自检

> **未经实测**：本手册由 ai-work-radar 根据自动调研合并生成并持续修订，步骤尚未有人实际跑过。服务修订时基于自己保存的上一版重写，直接改这个文件会被覆盖；实测过的做法请写到 experiences/。
>
> 解决的问题：在不全量信任 AI QA 平台或编码 agent 的前提下，用可执行的端到端测试、测试数据契约、本地自检环境和合并门禁，把关键流程回归与 agent 产出变成可审阅、可拦截的证据。
> 先试这一步：选一条关键流程，把它写成能进仓库、本地和 CI 都能跑的端到端测试，先非阻断运行并观察稳定性；如果 agent 已在写代码，再选一个只调用 1–2 个云服务的小模块写 3–5 个基于真实环境校准的 fidelity tests。
> 最近修订：2026-11-12

## 解决什么问题

关键用户流程的回归不能只靠手工点点点，也不能因为 AI QA 平台宣称能自动写测试、自动修复就直接全量上线；同样，当编码 agent 开始写产品代码时，只给它散文规格和口头要求，也无法判断它是否真的做对了。这篇手册给出一条可照做的小范围试用路径：先把一条关键流程写成可放进仓库、可在本地和 CI 运行的端到端测试（优先用测试数据表达），用退出码做门禁；为编码 agent 准备基于真实系统校准的本地自检环境和测试数据契约；失败时看截图/trace 分类，只接受人工审阅后的自动修复；合并门禁同时包含通用审查、安全审查和确定性检查；稳定后再考虑让编码 agent 通过 MCP 参与、固化 skills 或试自主 QA 会话。

## 适用与不适用

适用：有 Web 或移动端 UI、已有 CI、能提供测试账号/SSO 和关键流程、有人工审阅测试 YAML、测试数据和自动修复 diff 容量的团队；也适用于调用云服务、有公开 API 模型或行为描述、能访问真实服务作对照、能给编码 agent 搭本地运行环境的分布式系统小模块。适合重复性强的端到端回归、PR 验证、夜间运行、发布前检查，以及 agent 写代码后的合并前验证。

不适用：没有 CI、没有稳定测试数据或测试账号、不愿审阅自动修复或测试数据的团队。纯 API 服务不要直接套用做法 A 的 UI 端到端流程；如果只是服务层行为，走做法 B/C 的 fidelity tests 和测试数据契约。不要直接全量采用；不要把 auto-heal 当成应用缺陷修复；不要在没有稳定测试数据时先把退出码设为必过门禁；不要把本地 emulator 当成真实服务的完全等价物。

## 前置条件

- 已有可访问的测试或预览环境、测试账号/SSO、仓库写权限。
- 已有 CI，CI 能访问测试环境和所需密钥。
- 已按官方文档安装 Node 与 Momentic CLI、完成登录；浏览器、项目配置和与 Momentic 的连接需就绪。材料没有给安装命令，不要照猜。
- 先梳理产品术语、业务规则和期望行为，作为知识库输入。
- 有人工审阅测试 YAML、测试数据和自动修复 diff 的容量。
- 若要试 MCP 或自主 QA：需配置 Momentic MCP server、托管浏览器或移动设备、组织 MCP server 和 secrets；原文没有给配置片段。
- 做法 C 另需：目标服务有公开 API 模型/行为描述（原文为 Smithy），能访问真实服务作对照，能给编码 agent 搭运行脚手架和合并门禁。
- 做法 B 另需：能给测试数据加内部旁路（仅测试用可执行文件或不公开 API），且测试数据文件能进仓库。

## 操作步骤

先选做法：目标只是给现有 UI 关键流程加回归门禁，先做 A；编码 agent 已经在改产品代码，做 B 和 C，B 提供契约，C 提供本地自检和合并门禁；两者不互斥。A 的 CI 退出码可以作为 C 合并门禁的一部分。稳定后再做 D。

### 做法 A：关键用户流程门禁（先做）

1. 体检环境。前提：已有可访问的测试或预览环境、CI、仓库写权限，并安装 Node 与 Momentic CLI 且完成登录。运行：
```bash
momentic doctor
```
预期：检查 CLI 和 Node 版本、登录、浏览器、项目配置以及与 Momentic 的连接，能明确哪些项未就绪。页面还提到 `--fix` 可清理废弃选项，具体用法以文档为准。

2. 建立产品知识库。前提：先梳理产品术语、业务规则和期望行为。把术语、规则、预期结果写进 Knowledge base；AI 步骤运行时会查相关条目。对会话中产生的新建议先人工审阅，再决定是否加入知识库。预期：减少测试步骤和断言里的业务歧义。

3. 用纯英文 YAML 写关键用户流程。前提：准备测试 URL、测试账号，以及可复用的登录/填表模块文件。测试文件放进仓库，和代码一起评审。原文示例：
```yaml
fileType: momentic/test/v2
id: standard-user-checkout
url: https://shop.momentic.ai
description: End-to-end checkout flow
steps:
- module: ./log-in-username-password.module.yaml
- act: add the momentic backpack to the cart and go to checkout
- module: ./fill-out-personal-info.module.yaml
- assert: the item total matches the amount listed for each item
- click: Finish button
```
写法要点：步骤和断言用 plain English；重复流程抽成 module；断言写清期望结果。预期：测试可读、可复用，并能在仓库中评审。

4. 本地运行同一套测试。前提：项目配置和浏览器已就绪。运行：
```bash
momentic run
```
页面还给出两个可选能力：`momentic run --from-snapshot` 可回放测试快照；`--parallel auto` 可按主机 CPU 数自动设置并行度。预期：先在本地确认流程能跑通，并连续跑多轮观察稳定性。

5. 接入 CI，用退出码做门禁。前提：CI 能访问测试环境和所需密钥。在 CI job 里执行同一命令，把 CLI 退出码作为合并或部署前的 required check。原文没有给具体 CI YAML，不要照猜；先非阻断运行，稳定后再设为必过。
```bash
momentic run
```
预期：每次 PR 或部署前都留下同一套端到端测试的运行结果。

6. 失败后先看证据再分类。前提：拿到失败 run 的 ID 或 URL。检查失败步骤、截图和 trace，把失败分成应用 bug、测试不稳定、环境问题三类，再路由给对应处理人。可用：
```bash
momentic ai classify --interactive
```
预期：避免把应用 bug 当成 flake 直接重跑，也避免把环境问题误判为产品缺陷。

7. 只接受人工审阅后的自动修复。前提：确认失败是 UI 文案或控件变化导致，而不是应用 bug。运行：
```bash
momentic ai heal
```
它会提议测试文件修复；审阅 diff，应用后重跑验证。页面示例的改动是：
```diff
- click: Finish button
+ click: Place Order button
```
预期：只修测试选择器或文案变化，不掩盖真实缺陷。不要把 auto-heal 用来掩盖应用 bug。

### 做法 B：把客户测试写成数据，作为与编码 agent 的契约

前提与选择：适合输入、前置状态、期望输出能被文本表达的关键流程；不适合把有状态流程硬塞进表格。原文没有给可直接复制的 runner 命令，以下按文章描述整理；runner 由 agent 生成后必须人工审阅。

1. 识别现有测试里真正的“事实”。把测试名、输入、期望输出圈出来，其余视为样板。原文示例中，`defaultGreeting()` / `personalisedGreeting()` 两个 JUnit 测试里真正有信息量的只有测试名、输入 `/hello`、`/hello?name=Joe` 和期望输出 `Hello, world!`、`Hello, Joe!`。预期：知道哪些内容应该进测试数据，哪些是测试代码样板。

2. 先起草一小段你想要的测试 DSL 样例，不要先写 runner。只挑一个功能域。原文 YAML 样例可原样作为起点：
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
预期：领域专家能读懂，失败时能产生干净 diff。

3. 让 AI 为这段 DSL 写测试运行器。前提：DSL 格式已定。告诉 agent 把该数据文件解析成参数化测试用例并驱动真实系统。预期：runner 能把数据变成可执行测试；runner 本身要小、要人工审阅和保护。

4. 人和 AI 一起补用例，尤其是边界与错误用例。可原样追加到同一 YAML 的 `tests:` 下：
```yaml
 - name: "name must not be entirely whitespace"
   request:
     resource: "/hello"
     name: " "
   error: "Name must not be entirely whitespace"
```
预期：覆盖空白、错误等边界，而不是只覆盖 happy path。

5. 输入/输出是标量时，压缩成表格（CSV 或 Markdown 表）。原文 CSV：
```csv
test_name, resource, name, greeting, error
default greeting, /hello, null, "Hello, world!",
personalised greeting, /hello, Joe, "Hello, Joe!",
not whitespace, /hello, " ", null, Name must not be entirely whitespace
```
预期：一眼看清覆盖了哪些情况、可能缺哪些情况，加用例更容易。

6. 关键约束：表格里每一行必须是无状态操作，只写输入与期望输出。原文反面示例是“login as trader → go to admin page → login as admin”这种状态机，不要这样写。预期：表格不会变成难维护的脚本。

7. 单条 Gherkin 场景改写成覆盖多维组合的表格。原文访问控制表可原样作为范式：
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
预期：用一张表覆盖角色、会话状态、资源、期望结果的组合。

8. 输入是结构化数据（多行文本、程序、页面状态）时，改用结构化场景。原文给出三种形态：带光标标记的文本编辑场景；解释器/编译器的程序 + 期望输出；Web 应用 GIVEN model / WHEN user / THEN page / THEN model 四段式。Web 四段式示例：
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
预期：能表达表格装不下的结构化输入，并把 HTML 投影成可 diff 的文本。

9. 写两个 printer + 两个 parser。前提：应用有可读取/可设置的内部状态入口。printer 把 HTML/DOM 投影成可读、可 diff 的文本；第二个 printer 输出内部状态，因为改状态的操作不能只验 UI。parser 一个解析 `GIVEN model` 用来设置初始状态，一个解析 `WHEN user` 用来识别可施加的操作词汇表。预期：端到端测试不只验证页面文字，也验证持久状态确实变了。

10. 搭旁路（side channel）用于播种状态。可行形态：一个独立的可执行文件，复用应用代码仓库，以与应用一致的方式写状态，永不发布到生产；或一组不对外公开的 API。不要走 UI 播种：会增加准备时间、增加 flaky 概率，还可能为了测试硬加 UI 操作，扩大 UI 面并降低安全性。预期：测试准备更快、更稳。

11. 把上述机制组装进一个 agent 容易生成的 runner，并接进 CI。测试数据在 CI 里跑，所以这类 spec 不会过期。预期：每次变更都执行同一套客户测试。

12. 防篡改：把 test harness 与测试数据分开保护。测试写成文本文件，AI 改动时更容易被发现；runner 相对小，便于人工审查与保护。原文“Protecting the test harness”一节正文在抓取内容中缺失，具体手段无法转述。预期：agent 不能悄悄改弱断言或改测试数据。

如果考虑用现成 Gherkin/Cucumber：原文提醒格式相当自由，AI 写时须检查是否写了弱断言；step definition 容易繁殖，必须刻意保持步骤库小；自定义 DSL 的优势是可以强制结构（比如把“操作后必须比对系统状态”设为语法必填项）。

### 做法 C：为编码 agent 准备可自检的本地环境与 fidelity tests，并设合并门禁

前提：目标服务有公开 API 模型/行为描述，能访问真实服务作对照；先选一个只调用 1–2 个云服务的小模块，不要一上来覆盖整个系统。原文没有给出可直接复制的命令、配置或提示词，以下按原文描述整理，具体命令需按团队环境补齐。

1. 写“服务应如何行为”的描述，明确操作、输入、输出、错误。预期：agent 有可依据的 spec，而不是只靠散文计划。

2. 编写 fidelity tests：从公开 API 模型设计端到端客户场景（例：SQS 消息在 visibility timeout 前对其他读者隐藏）。先在真实 AWS 上运行并修正测试，直到测试通过，使测试记录真实行为。预期：测试是对真实系统校准过的，不是凭想象写的。

3. 让编码智能体依据描述构建本地 emulator/替身；用同一组 fidelity tests 驱动，智能体反复改到测试通过；仍失败的测试就是 emulator 的行为缺口。预期：本地环境逐步逼近真实行为，失败测试直接指向缺口。

4. 把本地 emulator 放进智能体编码循环：智能体写代码→运行→读结果→决定下一步；服务调用走本地替身，使其能自检。预期：agent 在提交前能自己发现一部分错误，而不是等人 review 才发现。

5. 设置 merge gate：每个变更必须通过自动化检查，包括通用代码审查、多个安全智能体从不同攻击面做对抗审查、确定性检查阻止智能体改不该改的代码。原文未给 merge gate 的具体实现和安全智能体设置，需按团队环境补齐。预期：测试通过只是门禁的一部分，安全与“不许改的文件”也被机器检查。

6. 工程师负责脚手架和边界：搭建运行智能体的脚手架，定义 spec、测试、门禁，决定“做什么”和“何时算正确”；不要只监督智能体写代码。预期：人的精力放在定义正确性和边界上，而不是逐行看 agent 写代码。

7. 维护缺口清单：记录智能体发现但尚未匹配真实 AWS 的行为（原文对应 things-that-do-not-work 文件夹），持续补测试和修 emulator。预期：本地模拟与真实服务的差距是可见的、在收敛的，而不是被忽略。

### 做法 D：稳定后可选

1. 让编码 agent 通过 MCP 参与测试。前提：配置 Momentic MCP server；原文没有给 MCP 配置片段，按官方文档配置。把变更后的流程交给编码 agent，让它通过 MCP 编写测试、在实时会话中检查，并把 YAML 和代码一起提交。页面提到 stdio MCP server 可启动/终止浏览器会话、拼接步骤、运行步骤区间；移动端 MCP 可从 Claude Code 或 Cursor 驱动模拟器。预期：agent 产出可评审测试，而不是自动放行。

2. 把反复出错的应用知识固化成 skills。前提：先观察 agent 在你们应用上反复犯什么错。把纠正规则提交到 `.momentic/skills`；页面说 explore、triage、result-classification agents 运行时会读取。预期：减少同类错误重复出现。

3. 可选：试自主 QA 会话。前提：有托管浏览器或移动设备，且组织 MCP server 和 secrets 可挂到会话。可从 coding agent、应用、PR 评论或 qa CLI 启动；按 low/medium/high/max 选投入，页面说大约从 15 分钟一个 PR 到 2 小时整个应用；单独 agent 会先复现每个功能 bug 再报告。预期：作为补充探索，报出的 bug 仍需人工复核，不替代做法 A 的门禁。

## 怎么判断变好了

最小试用：选一条关键流程，例如登录到结账或核心创建流程，写 1 个 YAML 测试并复用 1-2 个 module；本地连续跑多轮看稳定性；接入 CI 先非阻断，观察一段时间；只对稳定测试设 required check。同时开启失败分类，人工复核分类是否正确；开启自动修复，但只接受审阅后的 diff。如果 agent 已在写代码，再选一个只调用 1–2 个云服务的小模块：写 3–5 个端到端 fidelity tests 并在真实环境校准；搭本地 emulator 或等价 mock，让 agent 在“写—跑—读结果”循环中使用；合并前设门禁：测试全过、通用审查、安全审查、确定性文件限制。做法 B 的测试数据先在一个模块上试，让 agent 写 runner，人机共同补用例并接进 CI。

可观察指标：测试编写时间、CI 运行时长和并行效果、flake 率、误报率、自动修复接受率、每次 UI 变更后的维护时间、pre-merge/pre-deploy 捕获的真实 bug 数、缺陷逃逸率、发布频率；首次测试通过率、人工返工轮次、合并前发现的缺陷数、逃逸到真实环境的缺陷数、与真实服务行为差异条目数（缺口清单增减）、从任务到合并的时间、人工审查时间、安全审查发现数。

对照方法：同一流程保留原有测试或手工检查做基线；用历史已知 UI bug 回放看捕获率；人工复核 AI 报的 bug 是否真实、分类是否正确；对同类任务做前后或并行对照，记录是否因本地自测环境而减少返工。不要用生产敏感数据，先限制在非关键模块。

试多久：材料没有给出固定试用时长；按原文的“先非阻断观察一段时间”，至少覆盖多次代码变更和 UI 变更，直到能判断 flake 率、误报率和维护成本，再决定是否设为必过。若误报长期偏高、维护成本不低于原有测试，或自动修复开始掩盖真实缺陷，就不要把它设为门禁。做法 C 的本地 emulator 还要看缺口清单是否在收敛。

## 常见坑

- 把厂商页面、客户 quote 和自报 benchmark 当成独立第三方验证，直接向团队承诺同样的效果。
- 跳过小范围试用，直接全量采用或全量替换原有测试。
- 失败后不看失败步骤、截图和 trace，直接重跑或直接改测试。
- 用 auto-heal 掩盖应用缺陷，而不是只处理 UI 文案或控件变化。
- 误报长期偏高仍把退出码设为必过门禁，导致团队绕过或长期忽略红灯。
- 没有稳定测试数据、测试账号/SSO 或 CI 访问权限就上线门禁。
- 没有人工审阅测试 YAML、测试数据和修复 diff 的容量，却开启自动修复。
- 原文缺失安装、CI 和 MCP 配置细节时照猜命令或配置；应先查官方文档。
- 纯 API 服务、没有 UI 的场景直接套用 Momentic 的端到端流程；服务层行为应走 fidelity tests/测试数据。
- 只试自主 QA 会话的探索性发现，却没有做法 A 的稳定门禁和人工复核。
- 把散文规格当成与 agent 的契约；原文提醒“prose specs can't be executed; tests can.”，应给可执行测试数据。
- 把有状态流程塞进表格，或表格每一行不是无状态操作，导致测试数据变成难维护的脚本。
- 为了播种测试状态硬加 UI 操作，扩大 UI 面并降低安全性；应走旁路。
- 让 agent 写 runner 后不人工审阅、不保护 harness，agent 可能改弱断言或改测试数据。
- 本地 emulator 与真实服务有差距，却不维护缺口清单，把本地全绿当成真实等价。
- 合并门禁只跑测试，没有通用审查、安全审查和确定性文件限制。

## 证据与来源

以下依据本次合并的三篇调研。需要区分：哪些是原文明确给出的机制/命令，哪些是作者主张或本次调研建议，哪些只是厂商自报数据。

- 做法 A 第 1、3、4 步（环境体检、纯英文 YAML、本地运行）：Momentic 页面明确给出 `momentic doctor`、`momentic run`、`--from-snapshot`、`--parallel auto` 和 YAML 示例，并说明 CLI 可在本地和 CI 运行；安装命令和具体 CI YAML 原文未给。
- 做法 A 第 2、6、7 步（知识库、失败分类、自动修复）：页面列出 Knowledge base、失败分类和 auto-heal 机制，给出 `momentic ai classify --interactive`、`momentic ai heal` 命令及 heal diff 示例；分类与修复仍应人工复核。
- 做法 A 第 5 步（CI 退出码门禁）：页面说明用 CLI 退出码做合并或部署前检查；先非阻断、稳定后再设必过，是本次调研建议，不是页面验证结论。
- 做法 A 第 8-10 步（MCP、skills、自主 QA）：页面列出 stdio MCP server、移动端 MCP 从 Claude Code 或 Cursor 驱动、`.momentic/skills`、自主 QA 会话和 low/medium/high/max 投入档；MCP 具体配置片段原文未给，自主 QA 的时长和投入档是页面说法。
- 做法 B（测试数据契约、DSL、投影/旁路）：依据 martinfowler.com 上 Matteo Vaccari 的《Tests as data: ensuring AI-generated code does what we want》。原文给出 greetings YAML、CSV、访问控制表、文本编辑场景、BASIC 解释器 YAML 和 Web 四段式示例，可直接套用；原文明确说 AI 让写 DSL 解析器和 runner 变便宜、测试数据在 CI 里跑所以不会过期、表格每行必须无状态、旁路播种优于 UI 播种。局限：原文“Protecting the test harness”一节正文在抓取内容中缺失，具体保护手段无法转述；效果证据多为二手报告与访谈，不是对照实验；原文没有给可直接复制的 runner 命令。
- 做法 C（fidelity tests、本地 emulator、merge gate）：依据《AWS Emulator and the engineer's job when agents write the code》。原文给出 Alf 重建案例（没有检查手段时监督四晚无果，有 spec 和测试环境后约两小时完成；重建复制引擎从约四个月降到约两小时）、SQS 原型约 15 分钟、AWS Emulator 基于 400+ API 模型覆盖 200+ 服务、代码 CC0、内部版一个周末成形一个月内获采用；并明确 merge gate 包括通用代码审查、多个安全智能体对抗审查、确定性检查。局限：原文未给命令、配置、提示词、merge gate 具体实现和安全智能体设置；案例为 AWS 内部/Kiro 特定经验，耗时数据是轶事而非对照实验；本地模拟与真实 AWS 仍有差距，原文承认有 things-that-do-not-work；作者“智能体能自我检查后首次正确率更高”“工程师应建 spec、测试、merge gate”属于作者主张。
- Momentic 页面数据：77,813 个测试创建、70,607,819 次测试运行、339,166 次变更验证、80,290 个 PR 验证、8,932,104 次自动修复、117,010 个 bug 捕获；QA Bench 使用 1,396 个标注 bug，Mo 找到约 269 个标注 bug，次优 agent 约 86 个；客户 quote 数字包括 6.3x 并行、3x 写测试更快、110 个 prompt 14 分钟完成、每日测试执行从 7 小时降到 30 分钟、500+ 手工用例被替代、8x 发布频率、每月节省 40+ 工程小时、发布周期快 80%、测试生成时间降 75%、缺陷逃逸率降 89%、生产事故降 85%/30%、E2E 测试创建快 6x。这些是厂商页面、客户 quote 和自报 benchmark，不是独立第三方验证；累计计数没有统计口径，客户数字缺少方法和样本说明。
- Momentic 页面 bug 案例（新设备 2FA 被跳过、移动端建页流程断掉、司机 ETA 卡在 calculating、锁屏后计时器重置、结账时已存卡被丢弃、分页后筛选被清空、促销码在最后一步被拒、字幕语言错误、一天抓到 12 个 legacy API 问题）是案例叙述，不是可复现实验。
- 本次建议中小范围试用而非全量采用、先非阻断再设必过、最小试用与判断指标、不要把 auto-heal 用来掩盖真实缺陷、用测试数据作为 agent 契约、给 agent 本地自检环境和 merge gate，均属调研结论或作者主张，需要在你们环境中验证。

## 依据的调研

- [Launch HN: Momentic (YC W24) – Agents that catch bugs by using your app](../research/radar/2026-11-03/9675-launch-hn-momentic-yc-w24-agents-that-catch-bugs-b.md)：值得一试，建议在一条关键用户流程上小范围试用 Momentic 的“纯英文 YAML 测试 + CI 退出码门禁 + 人工审阅自动修复”流程，而不是直接全量采用；理由是该页给出了可照做的测试编写、运行、失败分类和修复步骤，但效果数据主要来自厂商自述，需先验证误报率和缺陷捕获率。
- [AWS Emulator and the engineer's job when agents write the code](../research/radar/2026-11-12/12632-aws-emulator-and-the-engineer-s-job-when-agents-wr.md)：值得一试，建议小范围试：为编码智能体准备基于真实系统校准的端到端测试和本地可运行环境，并设置包含安全审查与确定性检查的合并门禁；原文给出了这套流程和 AWS Emulator 案例，但缺少可直接复制的命令与配置，需自行搭建。
- [Tests as data: ensuring AI-generated code does what we want](../research/radar/2026-11-12/12639-tests-as-data-ensuring-ai-generated-code-does-what.md)：值得一试，把「客户测试」从测试代码里搬出来，写成人可读、可 diff 的测试数据（YAML/CSV/结构化场景），先在一个模块上让 AI 照着样例写 runner、人机共同补用例并接进 CI，以此作为与编码 agent 的契约。理由是原文给出了从 DSL 样例到 runner、到投影/旁路的具体做法和可直接套用的表格范式，但实现细节章节缺失、效果证据多为二手报告与访谈，尚不足以直接 adopt。
