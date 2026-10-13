# nateherkai/roast-room

- 结论：**值得一试**。可以照 README 的步骤在 Claude Code 里跑一次 `--quick` 版决策辩论，用真实但可逆的商业决策做小范围试；因为原文给了完整的安装命令、斜杠命令、输入清单和校验脚本，但没有任何关于结论质量的实测数据，且全量会议要消耗 21 次子代理调用，只适合先低成本验证。
- 原文：https://github.com/nateherkai/roast-room
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-13T08:34:45.631Z

## 是什么

Roast Room 是一个跑在 Claude Code 里的“专家委员会”工作流：你把一个商业决策丢进去，七个由公开资料编译成的顾问人格（Bezos、Paul Graham、Hormozi、Gary Vee、Dan Martell、Gino Wickman、Buffett）分两轮辩论、逐项打分，最后由 Chair（Claude Code 本身）产出带评分的结论和一份可下载的 PDF。

每个席位负责一类问题：

| 席位 | 领域 | 它负责的问题 |
|---|---|---|
| Jeff Bezos | 战略与决策 | 这是不是对的赌注，可逆性如何 |
| Paul Graham | 产品与创业 | 人们真的想要吗，在增长吗 |
| Alex Hormozi | 报价、定价、销售 | 会付钱吗、付多少、怎么成交 |
| Gary Vaynerchuk | 营销与注意力 | 注意力从哪来 |
| Dan Martell | 人、招聘、创始人时间 | 谁来做，占你多少日历 |
| Gino Wickman | 运营与规模化 | 没有你撑着，业务能跑吗 |
| Warren Buffett | 钱与资本 | 对现金、风险、长期价值的影响 |

架构上：每个席位是一个 Claude Code sub-agent（`.claude/agents/council-*.md`），读自己的“大脑”（`.claude/skills/roast-room/brains/<name>/`，含框架、原则、立场、故事、语气笔记）；Chair 负责跑轮次、记分、写结论（`.claude/skills/roast-room/SKILL.md`）。可选配一个本地 Web 界面把过程可视化回放，Web 端本身不发起任何 AI 调用，只是读 `sessions/` 里 Chair 写下的文件。

## 具体做法（可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

**前提**：有 Claude Code（Claude 套餐即可，不需要 API key），Node.js 20 或更新版本，除此之外无需安装其他东西。

1. 克隆仓库：

```bash
git clone https://github.com/nateherkai/roast-room.git
cd roast-room
```

也可以直接在任意位置的 Claude Code 里说：

```
Clone github.com/nateherkai/roast-room and start the room for me.
```

2. （可选）启动本地房间并保持打开——房间只是可视化，不启动也能跑委员会：

```bash
npm start
```

然后浏览器打开 http://localhost:4730。

3. 在同一个文件夹里打开 Claude Code：

```bash
claude
```

4. 输入斜杠命令加你的决策：

```
/roast-room <你的决策>
```

5. 回答 Chair 的追问，然后看委员会辩论。结论会同时在 Claude Code 里给出，完整报告落在 `sessions/<date>-<decision>/verdict.md`。
6. 在房间里点击 **Download PDF** 拿 PDF。

**提问时应该给的信息**（README 明确列出，缺项 Chair 会在开会前追问）：
- 一句话说清**决策**
- 你的**选项**，两到三个，“维持现状”也算一个
- 你的**数字**：营收、现金、团队规模
- 你的**限制**：截止时间、可用工时、预算
- **成功长什么样**，以及到什么时候
- 你**倾向哪一边、为什么**（委员会的任务是压测你的倾向，不是附和你）

README 给的完整示例提示词：

```
/roast-room I run a coaching business at $30k a month with 15 clients at $2,000 each.
Should I raise to $3,500 for everyone, raise for new clients only, or keep $2,000?
Close rate is about 50% and I have $40k in the bank. Success is $45k a month by March.
I'm leaning toward raising for everyone because I'm underpaid.
```

**降本 / 变体用法**（原样）：
- `/roast-room --quick ...`：只坐四个顾问、两轮，适合更小、可逆的决策，且“far less of your plan”。
- `/roast-room --seats hormozi,buffett ...`：只坐你点名的顾问。
- `/roast-room ask hormozi ...`：只从一个席位要一个回答。

**先看示例**：`npm start` 后打开 http://localhost:4730，点 **Past sessions**，仓库自带三个已完成的委员会，可以直接看过程并下载 PDF。

**可选：让房间自己发起委员会**（需要另外计费）：把 `.env.example` 复制成 `.env`，填入 `ANTHROPIC_API_KEY`，设置 `COUNCIL_RUNNER=api`，重启 `npm start`。该模式走你的 Anthropic API 账户计费（一次完整委员会约 25 次调用）。

**校验引用**（防止顾问“编造原话”）：

```bash
python .claude/skills/roast-room/scripts/check_quotes.py sessions/<session>
```

该脚本把一次委员会里的每一句引用拿去和 `brains/` 比对；每个 brain 的 `sources.md` 列出了它的构建来源。

**成本提示**：README 明说一次完整委员会是 21 次 sub-agent 运行，“takes a real bite out of your plan's usage”，小决策请用 `--quick`。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现**：原文展示了“把商业决策交给 AI 做结构化多视角压力测试”这一用法——不是让 AI 给一个答案，而是让七个不同框架的代理各自打分、互相反驳，最后交给一个 Chair 记分并封顶风险。原文还提到两个反直觉的机制：当某个席位标出“毁灭风险（ruin risk）”时，Chair 会封顶结论；当所有人过快达成一致时，Chair 会强制制造真实争论。这两条是可直接借用的编排规则。

**2. 任务匹配**：适合 Claude Code 生态（sub-agent + skill + slash command），面向商业/经营决策类问题。粒度分级明确：小且可逆的决策用 `--quick`（4 席 2 轮），只想听某方面意见用 `--seats`，单点提问用 `ask <seat>`，完整委员会 21 次 sub-agent 运行。成本差异被显式写出，可直接用于选择协作方式。

**3. 条件供给**：给出了完整的输入清单（决策、2–3 个选项、营收/现金/团队数字、截止时间/工时/预算、成功定义与时限、当前倾向及理由），并说明缺项时 Chair 会先追问。工具条件是 Claude Code + Node 20+，无需 API key；房间可选。

**4. 主动推进**：有“信息不全时 Chair 主动追问”这一触发式推进，以及每轮把进度写入 `sessions/`、房间实时回放回合、耗时和每个顾问在权衡什么。但原文没有给出基于时间或外部事件自动触发委员会持续运行的机制（API 模式只是把输入入口从 Claude Code 换成房间输入框），这一点不要外推。

**5. 效果验证**：原文提供了三类可核对的验证手段：每席位对每个选项打分并按该席位领域与决策的相关度加权；Chair 在 ruin risk 被标出时封顶结论、在过快一致时强制争论；`check_quotes.py` 逐条校验引用是否有出处。另外 `sessions/` 保留全部历史，可回放和对比。但原文没有给出任何“用了它决策结果变好”的量化证据。

## 与已有做法的关系

清单中的相关条目：**Claude Code（tool，状态 adopt）**。本项目是直接建立在 Claude Code 之上的具体应用范式，用到了它的 sub-agent（`.claude/agents/`）、skill（`.claude/skills/roast-room/`）和 slash command。可以把它当作“Claude Code 多代理编排”的一个现成参考实现：如何把领域知识拆成带来源的 brain、如何让一个主代理当 Chair 记分并写报告、如何把过程落盘给外部界面只读回放。

## 证据与局限

**原文给出的具体内容**：完整安装与运行命令、斜杠命令与参数、输入信息清单、示例提示词、目录结构表、成本量级（完整 21 次 sub-agent 运行，API 模式约 25 次调用）、引用校验脚本用法、三个自带示例 session。仓库有 114 stars。

**只是作者主张、没有数据支撑的部分**：七个顾问“由公开作品构建”“每个引用都有出处”属于设计声明，README 未给出编译方法或覆盖度评估；辩论能提升决策质量、打分加权能反映真实重要性，均无实测结果；`check_quotes.py` 只能验证“引文是否在 brain 里且有来源”，不能验证来源是否被正确解释。

**明确的适用条件与限制**：
- 顾问是**模拟人格**，不是本人，与本人无关联、未获背书；只在句子在 brain 中且有来源时才逐字引用。
- 一次完整委员会对 Claude 套餐用量消耗较大，README 自己建议小决策用 `--quick`。
- 房间（Web 界面）是可选的可视化层，不做任何 AI 调用；不启动不影响委员会结果。
- 本次材料来源是仓库 README（`source_note` 标注“依据仓库 README”），没有实际运行记录、没有第三方评测，因此不给出 adopt。

## 怎么试、怎么验证

**最小试用方式**：
1. 挑一个真实、**可逆**、一周内能见效的决策（例如某个报价调整或某个渠道是否加投），按上面的输入清单把数字和限制写全。
2. 先只跑低成本版本，控制用量：

```
/roast-room --quick <你的决策 + 选项 + 数字 + 限制 + 成功定义 + 你的倾向>
```

3. 如果只想验证某个维度，用 `--seats` 限定 2–3 个最相关的席位（例如定价问题用 `hormozi,buffett`），或先 `ask` 单个席位。
4. 跑完后执行引用校验，确认没有凭空引用：

```bash
python .claude/skills/roast-room/scripts/check_quotes.py sessions/<session>
```
5. 事后（按你写的成功截止日）回看 `sessions/<date>-<decision>/verdict.md`，对照实际结果。

**判断有没有改善的指标**（都是可数的）：
- **反方论点命中数**：报告里出现了几条你在开会前完全没想到的风险或反例。若为 0，说明这次没带来增量。
- **是否改变了你的倾向**：结论与你的初始倾向是否一致；若 Chair 因 ruin risk 封顶或强制争论，记录它给出的具体理由你是否认可。
- **引用可核验率**：`check_quotes.py` 的通过情况，作为“有没有编造”的硬指标。
- **成本对账**：本次实际 sub-agent 调用次数与产出价值是否匹配；`--quick` 与完整委员会在同一决策上结论差异有多大——若差异很小，以后就固定用 `--quick`。
- **决策后回看**：到了你设定的成功时限，实际结果与报告预测的关键假设是否吻合；连续两三次都不吻合，就下调对这个工作流的依赖。
