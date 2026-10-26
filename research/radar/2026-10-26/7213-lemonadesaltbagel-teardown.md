# lemonadesaltbagel/teardown

- 结论：**值得一试**。建议小范围试：先用 `teardown demo` 加一个自家小型工具跑通「observer → gate → cleanroom → verdict」全链路，重点借它的三件套——行为 spec、抽象 pass/fail 反馈、coverage 门禁。理由是命令、配置和提示词都能照抄且隐藏测试分数扎实；但工具仅 0.2、依赖 Docker/Chromium/模型 token，且大应用（Flipt 9/55）与模型记忆污染会明显削弱效果。
- 原文：https://github.com/lemonadesaltbagel/teardown
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-26T11:55:18.345Z

## 是什么

Teardown（lemonadesaltbagel/teardown，Apache-2.0，0.2 早期版，38 stars）是一个基于 MCP 的 Python 工具，用两个 agent 分工做「净室重写」：

- **observer（脏侧）**：只通过 Teardown 的驱动以黑盒方式观察目标——CLI 的退出码/stdout/诊断信息/文件效果，Web 的可访问性树 + API 方法/路径/状态 + 公开契约选择器，Android 的可访问性树与系统对话框。观察被 mapper 转成与措辞无关的紧凑符号（Web 侧为 `web.aria/v9`），再由 observer 归纳成可证伪的规则，逐条回原系统校验为 corroborated 或 falsified。
- **gate**：检查 spec 是否含复制表达（与所有观察到的内容和摄入文档做逐字/近逐字比对）和真实名称（转成代号）；strict 模式下每条发现需人在终端审批。
- **clean implementer（净侧）**：容器里只挂载 kit（已发布 spec + build/verify 脚手架），只能向 gate 请求验证，拿回的只有抽象 pass/fail 符号，看不到原系统文本或证据。

两个容器都是「enforced 而非 instructed」：observer room 里 agent 无法触达目标文件/包/互联网，只有 Teardown 工具；clean room 的唯一网络对端是放行 gate 与模型 API 的出口代理。每次跨越都过 gate 并记入签名的哈希链审计日志。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**1. 安装**（前提：Python 3.12+；Web 目标需后续装 Chromium；CLI 目标与 enforced rooms 需 Docker；Android 需 Android SDK + 通过 `adb` 可达的模拟器或真机）

```bash
uv tool install "teardown[web] @ git+https://github.com/lemonadesaltbagel/teardown"   # Python 3.12+
teardown install-browser                   # Chromium for web targets
teardown demo                              # observe -> gate -> clean -> verdict on a built-in example
```

`pip install "teardown[web] @ git+https://github.com/lemonadesaltbagel/teardown"` 等价。若想改 Teardown 自身：`git clone ...` 后 `uv sync`、`uv run teardown ...`。

**2. 把 observe server 注册给任意 MCP 客户端**（示例为 Claude Code；HTTP 模式可用 `teardown observe --port`）

```bash
claude mcp add teardown-observe -- uv run --directory /path/to/teardown teardown observe --project /path/to/project
```

**3. 用 playbook 驱动观察**（原文给的原样提示词；`observe_target` 是作为 MCP prompt 提供的 playbook，细节见 `docs/observer-playbook.md`、`docs/observer-guide.md`）

```text
Open web:http://localhost:3000/ as a research target and follow the observe_target playbook:
discover the UI, probe every field, inject API faults, state rules, close the coverage gaps
and release the spec.
```

观察循环的实质动作（第 3 步的可执行内核）：UI discovery 爬遍每个屏幕 → 按等价类和边界探测每个字段 → 注入故障（5xx、网络失败、超时、畸形 body、挂起请求；CLI 侧为关闭/写满 stdio、不可读文件、只读目录；Android 侧为飞行模式）→ 用自己的话陈述规则 → 每条规则回原系统校验并记录真伪 → 直到 coverage 清单（每个控件、字段、端点×故障、数据状态与实时输出、登录/未登录的每条路由、各状态的记录页）全部被演练或解释，否则拒绝 release。

**4. 审查、审批、发布、导出 kit**（strict 模式下每条 release 需在终端人工审批；observer 的工具不能自我审批）

```bash
teardown review  --project P --feature F           # gate findings by class, coverage gaps
teardown approve --project P --feature F --by you@example.com --class expected-output --reason test-oracle
teardown release --project P --feature F
teardown export-clean --project P --out KIT        # the kit: released spec + build/verify scaffolding
```

实操上每次 release 只需几个类别级决策：批准克隆必须复现的应用文本、批准动作名、确认 observer 已解释的 coverage 缺口（见 `docs/strict-gate.md`）。

**5. 在净室重建**

```bash
teardown cleanroom up    --project P --kit KIT --claude-token-file ~/.config/teardown-claude-token
teardown cleanroom check --project P               # isolation probes, run from inside the container
teardown cleanroom shell --project P -- claude     # the implementer sees only /kit; `verify` asks the gate
teardown cleanroom down  --project P
```

**6.（可选）对称地约束观察侧**

```bash
teardown observerroom
```

**贯穿前提**：intake 时必须声明分析目的，并自负法律评估；工具硬性拒绝绕过 CAPTCHA、bot 防护、证书固定、root/attestation 检查、FLAG_SECURE，拒绝翻转 Electron fuse 或重签二进制，拒绝假账号与超速率限制，拒绝采集实现层数据（代码体、反编译、栈回溯）。这些拒绝不可配置。

## 对应的研究问题

**1. 能力发现**：给出一个容易忽略的 AI 用法——把「读懂实现再重写」换成「只观察行为、归纳可证伪规则、再重写」。原文没有列「还能交给 AI 的活儿」清单，但给出了可迁移的岗位划分（观察者 / 实现者 / 裁判），以及「把它当成黑盒」这个动作本身，可套到遗留系统文档化、竞品功能对齐、无源码资产的规格还原。

**2. 任务匹配**：模型/工具/协作方式的分工写得很实——observer 配浏览器（Playwright Chromium）、Docker 隔离 runner、adb；implementer 配 Claude Code 在只挂 kit 的容器里；验证由 gate 用同一套测试跑原版与克隆。适配条件是：目标有可观察的界面或接口，且能拿到一套原版自己也要跑的测试。表格明确标注 macOS/Windows/iOS「Not started」、Linux 桌面「Experimental」、Web「Working」、CLI「Stable」。

**3. 条件供给**：需要 Docker、Chromium、Android SDK/adb、Claude token 文件、MCP server 注册、把 playbook 作为 MCP prompt 供给、strict-gate 的类别级人工审批、coverage 清单、以及一份「kit」作为净侧唯一输入。反馈供给的关键设计是**抽象化**：净侧只拿 pass/fail 符号，意外错误返回泛化信息，防止脏侧细节从错误信息泄漏。

**4. 主动推进**：原文没有时间或事件触发的调度设计。唯一接近的是状态驱动：coverage 缺口未清零则拒绝 release，实现者可以反复向 gate 请求 `verify`。这属于「状态门禁」而非「主动巡跑」，可借用但需自己补触发层。

**5. 效果验证**：方法明确——用 observer 从未见过的隐藏测试套件，对克隆与原版跑同一 harness 计分；报告实现者是否「认出了目标」以标记模型记忆污染；审计日志记录每次审批。原文给了具体分数（见下节），也给了评估方法的文档位置 `docs/evaluation.md`。

## 与已有做法的关系

- **Claude Code（清单中，adopt）**：Teardown 的 enforced clean room 直接内置 Claude Code 容器并只注册房间内的 Teardown server；也可换任何能在容器里跑并走代理的 agent。Teardown 补上了 Claude Code 单机使用时缺的两件事：隔离边界与「只回抽象判定」的反馈通道。
- **Playwright Test（清单中，try）**：Web 观察层刻意对齐「用户可见的 Playwright locator/assertion 能区分的差异」（`web.aria/v9` 用「必须不同 / 必须相同」的页面对做审计），gate 也用同一测试同时跑原版与克隆。可以理解为把 Playwright 从「写断言」升级为「当裁判」。
- 清单中没有与「净室 / 行为 spec 门禁 / 抽象 verdict」直接对应的条目。

## 证据与局限

**原文给出的数据（均为隐藏套件，observer 未见过，且与原版在同一 harness 下对照）**：

| 目标 | 结果 |
|---|---|
| 无模型见过的 CLI 工具 | 397/397（仅凭 spec） |
| 三个 held-out Web 应用 | 129/130、126/130、125/127（README 另称 96.9–99.2%） |
| 无模型见过的 Android 应用 | 113/118；100/119（第二个完全无验证反馈） |
| RealWorld "Conduit" Web 前端（工具对其调过） | 99/101 |
| Flipt v1.61.0 真实开源 Web 应用，跑它自己的套件 | 9/55 |

**作者的解读（属主张，非独立证据）**：克隆忠实复现了 spec，隐藏套件抓到的是 spec 里没有的东西；Web 抽象「基于原则」；strict-gate 每 release 只需几个类别决策。

**已暴露的局限**：

- 版本 0.2，自述 early software；目标矩阵里桌面端 experimental、macOS/Windows/iOS 未开始。
- **模型记忆是闭环外的漏洞**：作者承认没有容器能堵住，只能事后询问实现者是否认出目标；并自陈在 `jq` 上无 spec 与有 spec 表现相同，因此基准多用「为评测专门写的应用」。这意味着上面的高分不能直接外推到知名开源项目。
- **规模一大就崩**：Flipt 只有 9/55，作者归因于应用体量大且测试部分耦合自身 markup。
- 法律风险不解决：净室只针对表达的复制，不覆盖专利、商标、商业外观；jurisdiction 与目标条款自负。
- 适用条件：必须有可跑的测试或可判定的行为契约来当 oracle；必须有权限做黑盒观察；需要 Docker 与模型 token，成本不低。

## 怎么试、怎么验证

**最小试用**（半天量级，不碰外部产品）：

1. 跑 `teardown demo`，确认 observe → gate → clean → verdict 整条链路在本机可用。
2. 选一个自家的小目标：一个子命令不多的内部 CLI，或一个路由/表单不多的内部 Web 页，前提是它已有自己的测试套件（这套测试就充当隐藏套件）。
3. 按第 2–4 步注册 observe server、下第 3 步的提示词（把 URL 换成本地地址），观察一个 feature。
4. `teardown review` 看 coverage 缺口清单长什么样、需要你做几类别决策；`export-clean` 出 kit。
5. `cleanroom up` / `check` / `shell -- claude`，让实现者只凭 kit 重建，用原测试同时跑原版与克隆。
6. 对照组：把原实现直接丢给同一个模型重写（不做净室），用同一套测试打分，并人工比对近似复制程度。

**判断有没有改善的指标**：

- 主指标：克隆通过率 ÷ 原版通过率（同 harness），以及相对「直接给代码重写」组的差值。
- 质量指标：因 spec 未覆盖而失败的用例数（衡量观察是否到位）、coverage 缺口数与 release 被拒次数、gate 的复制表达命中数（应趋近 0）。
- 成本指标：每 feature 的人工审批次数与总耗时、容器与 token 开销。
- 有效性校验：实现者是否报告「认出了目标」（若认出，该轮结果不能算净室能力）；`cleanroom check` 的隔离探针是否全过。

**结论门槛建议**：只有当「通过率不低于直接重写组」且「复制表达命中为 0」且「人工审批控制在每 feature 个位数」三条同时成立，才值得把流程固化进手册；否则退回到只借「coverage 门禁 + 抽象 pass/fail 反馈」这两个不依赖本工具的做法。
