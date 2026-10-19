# alextnetto/res

- 结论：**值得一试**。建议小范围试一次：用 Claude Code 安装 RES 技能，在独立浏览器 profile 的试用账号上只研究一个特性，检查它产出的带证据知识库（含 `check-kb` 校验）和交接 zip 能否直接交给编码智能体开工。理由是原文给出了安装命令、提示词、七阶段流程、证据标注规则、沙箱分级和四个可直接运行的脚本，属于可照做的流程；但适用范围只限 Web 产品、方法仍在 0.4.x 迭代、且需要你自己拥有可研究的账号，因此先试再定。
- 原文：https://github.com/alextnetto/res
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-19T16:43:48.154Z

## 是什么

RES（Reverse Engineering SaaS）是一个 Claude Code 智能体技能：让智能体在**你控制的账号**上用真实浏览器研究一个 SaaS 产品，把屏幕与状态、业务规则、数据模型、API 形状、设计 token、上线障碍写成磁盘上的结构化知识库，最后产出两样东西——人读的 `REPORT.html` 和交给编码智能体的交接 zip（从 `BUILD.md` 开始）。

它由纯 Markdown 模板加少量零依赖 Node.js 脚本组成，不是平台。按 README 自述，它每次会话约增加 130 token，运行时约 4600 token（用 `claude plugin details` 测得）。

真正的价值不在“逆向竞品”这个用途，而在于它把一个常被当成不可委托的工作——“先摸清一个陌生系统，再产出别人能照着重建的结构化知识”——拆成了可执行、可校验、可交接的流程。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提：Node.js 22 或更高；一个能从磁盘读技能、能驱动浏览器、能在页面里执行 JavaScript 的智能体（Claude in Chrome / Playwright MCP / Chrome DevTools MCP）。**

1. 安装技能（Claude Code 内）：

```bash
claude plugin marketplace add alextnetto/res
```

```bash
claude plugin install res@res
```

安装后需新开一个会话。会话内的等价命令是 `/plugin marketplace add alextnetto/res` 和 `/plugin install res@res`。

2. 其他从磁盘读技能的智能体，直接拷贝技能目录：

```bash
git clone https://github.com/alextnetto/res.git && mkdir -p ~/.claude/skills && cp -R res/skills/reverse-engineering-saas ~/.claude/skills/
```

3. 准备安全环境（这一步不能跳过）：用自己持有的邮箱注册产品的**试用账号**，在**独立的 Chrome profile** 里登录，把智能体的浏览器工具连接到这个 profile。原文称这是最安全的配置，智能体即使出错也碰不到生产账号。

4. 分级授权（原文的 L1–L4 模型，先选定级别再开工）：

| 级别 | 环境 | 允许改什么 |
|---|---|---|
| L1 | 独立 browser profile 里的试用账号 | 除对外发送与不可逆动作外的一切 |
| L2 | 你登录状态下的新建空 workspace | 该 workspace 内的测试数据与配置 |
| L3 | 生产账号内的一个沙箱 list / project / pipeline | 仅该容器内的测试数据 |
| L4 | 生产环境 | 只观察，不改 |

所有级别一律禁止：发消息或邀请、指派或 @ 他人、碰账单、创建账号、输入密码。自动保存、已读回执、关闭横幅、持久的视图变更都算“写”。每次写之前要检查位置、受众、可撤销路径和账本。

5. 下指令（原文提示词，替换产品、市场、范围）：

```text
Study Pipedrive so my team can rebuild it for the Brazilian market.
Use the trial profile, and don't ask me anything until you're done.
```

智能体在其工作目录创建 `re-<product>/`，按下述七阶段推进，结束时交付 `REPORT.html` 与 `re-<product>-handoff-<date>.zip`。

6. 七阶段流程（这是方法的核心，可迁移到任何“摸清未知系统”的任务）：

| 阶段 | 做什么 |
|---|---|
| 1 Charter | 目标、范围、优先级、重建目标市场 |
| 2 Environment | 选最安全的环境；检查可能被触发的自动化、webhook、集成 |
| 3 Recon | 用 web fetch 读公开文档、API 参考、定价、集成清单和条款；首轮障碍扫描 |
| 4 Map | 全部屏幕与路由；技术栈与设计 token |
| 5 Deep dive | 一次一个特性：构造测试数据、状态、规则、持久化、网络，**写盘之后再进下一个特性** |
| 6 Synthesis | 数据模型、设计 token、障碍、PRD、parity 测试 |
| 7 Close | 还原改动、过 `check-kb`、发送 `REPORT.html` 与交接 zip |

7. 证据标注规则（每条陈述必须带标签，这是产出可信的关键）：

- `[obs]` 在产品里亲眼所见
- `[net]` 从网络请求捕获
- `[doc]` 来自公开文档
- `[inf]` 推断，并附一个开放问题

规则写成 Given/When/Then 并附证据 ID，例如：

```markdown
### R-014 Completing the last open activity prompts for the next one
- Given a deal with exactly one open activity
- When the user marks that activity done
- Then a "Schedule next activity" dialog opens; Cancel closes it and the deal shows a warning icon
- Evidence: [obs EV-031, EV-032]
```

上线障碍单独建档，带严重度、市场权重、前置时间和缓解方案：

```markdown
### BR-003 WhatsApp messages need Meta business verification
- Category: permissioned integration
- Blocks: F-014 (WhatsApp notifications)
- Gatekeeper: Meta, WhatsApp Business Platform
- Severity: blocks feature
- Market weight: required to sell
- Lead time and cost: [doc SRC-021]
- Mitigation: start verification in month one; launch with email notifications
- Evidence: [doc SRC-021]
```

8. 也可以不用智能体、直接跑脚本（用于检查或重新打包已有知识库；`--help` 看参数）：

```bash
node skills/reverse-engineering-saas/scripts/init-kb.mjs --product "Acme CRM" --git
```

```bash
node skills/reverse-engineering-saas/scripts/check-kb.mjs re-acme-crm
```

```bash
node skills/reverse-engineering-saas/scripts/build-report.mjs re-acme-crm
```

```bash
node skills/reverse-engineering-saas/scripts/pack-kb.mjs re-acme-crm
```

9. 长任务托管：明确告诉它“不要问我”，它会把需要人处理的事写进 `STATUS.md` 的 “Needs human” 段落，继续做其余部分，停下前先还原自己改过的东西。可以整夜跑。

10. 续跑与交付：在同一目录新开会话说 “Continue the Pipedrive study.”；交付时 `REPORT.html` 给人，zip 给编码智能体。zip 内不含 `sandbox/`、`log/`，只保留一份去掉了对象 ID、位置和 URL 的变更账本。`sandbox/ledger.csv` 里的每一条改动，结束时要么还原、要么删除、要么列出来给你处理。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现：** 原文把“研究一个在用产品的界面、规则、数据模型并产出可重建的结构化知识库”整体交给智能体，这是典型的原本不会想到委托的工作。它给出的产出规模可以作为能力边界的参照：ClickUp 一项研究产出 55 条规则、19 个组件、14 条上线障碍；Pipedrive 产出 46 条规则、8 个组件、15 条障碍。

**2. 任务匹配：** 适配条件写得很明确——智能体必须能读磁盘技能、能驱动浏览器、能在页面内执行 JS。已知可用的组合是 Claude Code + Claude in Chrome / Playwright MCP / Chrome DevTools MCP。不适配的也说明了：桌面与移动应用不行，因为需要 DOM 和网络；二进制和 Electron 内部要用 REA。任务形态上，它要求“一次一个特性、写盘后再下一个”，说明这类工作应拆成可落盘的长任务，不能当成一次对话完成。

**3. 条件供给：** 需要提供的东西都很具体：可控试用账号、独立浏览器 profile、Node.js 22+、浏览器工具连接、产品的公开文档、API 参考、定价、集成清单和条款（用 web fetch 读取），以及一个明确的写入范围（L1–L4 选一个）。反馈通道也是设计好的：不让它问时，需要人处理的事写入 `STATUS.md`；磁盘知识库就是智能体唯一的记忆，因此可以跨会话、扛住上下文上限。

**4. 主动推进：** 有三处可复用的机制：(a) 覆盖矩阵当作队列，自动驱动“下一个特性”；(b) 支持整夜无人运行，遇阻转 `STATUS.md` 继续做别的；(c) 跨会话续跑（同目录新会话 + 一句 “Continue …”），并且在 Close 阶段自动做还原与校验。

**5. 效果验证：** 有四层可检查的东西：脚本 `check-kb.mjs` 做知识库完整性校验；每条规则带证据标签，可追溯到 obs/net/doc/inf，`[inf]` 必须挂开放问题；规则用 Given/When/Then 写，原文说这些规则可直接派生为 parity tests；每次写入都进 `sandbox/ledger.csv`，可回滚、可清点。原文还交代了自测方式：方法用 subagent 做场景跑测，脚本在 Node.js 22 和 24 上有自动化测试。

## 与已有做法的关系

清单中有两个相关条目：

- **Claude Code（adopt）**：RES 就是一个 Claude Code 技能，通过 plugin marketplace 安装，按原文说法“为 Claude Code 而写”。它给出的是在 Claude Code 之上跑一套完整研究方法的具体形态。
- **Playwright MCP（try）**：原文把 Playwright MCP 列为三种受支持的浏览器驱动之一（另两个是 Claude in Chrome、Chrome DevTools MCP），并单独提供 `references/tools.md` 讲配置与独立 profile 的做法。

也就是说，RES 可以看作把清单里已有的“工具”组合成“工作流”的一个样例：技能负责方法与模板，MCP 负责浏览器执行，脚本负责校验与打包。

## 证据与局限

**原文给的数据与案例：** 两个端到端研究，均由 Claude Code + Claude in Chrome 无人值守跑完——ClickUp（L2，新建免费 workspace，55 规则 / 19 组件 / 14 障碍）和 Pipedrive（L3，生产账号内的沙箱 pipeline，结束即删除，46 规则 / 8 组件 / 15 障碍），两者的报告与解压后的知识库都在仓库 `examples/` 下可查。token 开销 130（常驻）/ 4600（运行），标注了测量方式。版本 0.4.0，明确写了 0.3.0 修复了 Pipedrive 研究暴露的缺口，而 ClickUp 研究的缺口仍挂在 issue #5 未解决。

**只是作者主张、需要自己核实的：** 安全性承诺（各级别都不碰生产、不输密码、不触账单、写入可全部还原）目前只有作者自述和设计文档，没有第三方复现；“可以整夜跑”同理。法律方面作者明确甩锅：是否允许逆向取决于产品条款与司法辖区，工具只记录相关条款、按行为重建而不复制素材、并把法律问题标记给法务，不提供法律建议。

**适用条件与硬限制：** 只适用于 Web 产品（要 DOM + 网络）；必须有你自己拥有或被授权研究的账号；很多产品条款禁止逆向工程或竞品用途，用之前要自己确认；32 stars，属于小规模早期项目，方法仍在逐版本补漏；重建产出是“行为等价的设计与规则”，不是代码，复制素材是被明确禁止的。

**本报告证据等级：** 只依据仓库 README（`source_note` 标注为“依据仓库 README”），未获取 `SKILL.md`、`references/safety.md`、`references/exploration.md` 等细节文件，也未复现任何一次研究；文中所有条数、token 数均为原文自述。

## 怎么试、怎么验证

**最小试用（半天量级，不要一上来研究整产品）：**

1. 选一个你有试用账号、且条款不禁止研究的 SaaS 产品。
2. 走 L1：独立 Chrome profile + 试用账号，浏览器工具只连这个 profile。
3. 限定范围到**一个特性**（例如只做“看板拖拽 + 自定义字段”），而不是全产品。
4. 用原文提示词启动，加上“don't ask me anything until you're done”。
5. 结束时先看 `sandbox/ledger.csv` 是否每条都已还原或列明，再看 `check-kb` 是否通过。
6. 把交接 zip 交给另一个编码智能体，看它能否只靠 `BUILD.md` 说出第一步要做什么。

**判断有没有改善的指标：**

- **可追溯率**：抽查若干条规则，逐条对照产品本身，看是否属实、`[obs]/[net]/[doc]` 证据能否落到具体 ID；`[inf]` 是否都配有开放问题。假阳性率是最关键的负向指标。
- **可交接性**：找一个没参与研究的人读 `REPORT.html`，看他能否说出产品做什么、有哪些决策待定；再让一个编码智能体从 `BUILD.md` 起步，看是否需要人补课。
- **越界写入**：ledger 之外有没有任何写动作，尤其是自动保存、已读回执、关闭横幅这类隐性写；对禁止动作（发消息、邀请、@ 人、账单）是否零触碰。
- **人工投入**：`STATUS.md` 的 “Needs human” 条目数量，以及每条是否真的必须由人处理——这是“主动推进”是否成立的直接度量。
- **跨会话一致性**：中断后再续跑一次，看它是否依赖磁盘知识库而非重新探一遍。

**对照基线：** 用同一个人工方式（自己点一遍 + 手写文档）做同样的单特性研究，比较耗时、规则条数、遗漏项。若 RES 的产出在可追溯率上不低于人工且耗时明显更低，再扩大到全产品；若假阳性率高或需要人反复纠正，则退回到只借用它的两个可独立复用的部分：证据标签体系和 `STATUS.md` 异步反馈机制。
