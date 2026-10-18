# BijectiveLabs/trading-research-agents

- 结论：**值得一试**。建议先照 README 的六步在沙箱里跑一遍（免费 groq key + `tra init` / `tra check` / `tra run --every 15m`），把它的“模型只提议、系统算数并执行、每次拒绝都指名背后的数字”这套结构抽出来复用；理由是这个仓库把该结构的每一步都写成了可复制的命令、配置和角色分工表，但项目处于 alpha、真实资金路径作者自己没跑过，且强绑定永续合约交易场景，所以只适合小范围试。
- 原文：https://github.com/BijectiveLabs/trading-research-agents
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-18T11:08:40.163Z

## 是什么

`BijectiveLabs/trading-research-agents` 是一个开源（MIT，PyPI 包，README 标注 **Status: alpha**）的自主交易研究框架，核心主张一句话：**“The agents propose; the system decides.”**

分工是硬性的：

- 模型只负责“读数据、给判断”——方向、setup、信心、时间尺度、止损/目标位置。
- 系统（固定规则、无模型参与）负责取数、算每一个数字、给往返成本定价、套用你的限额、定仓位，然后要么把决定写下来，要么发一张带止损止盈的单。
- 每个决定和每次拒绝都连同理由落盘，事后可查“发生了什么、为什么”。

README 自己的说法：语言模型擅长读市场并说它怎么想，但不擅长算术、不知道一笔交易的成本、会无视你设的限额，所以只用它做第一部分。当前可用范围是永续合约（USDT/USDC 保证金），四类分析师 + 最多三个验证者 + 只能收紧的风控 + 两个审计。

## 具体做法（编号步骤；前提逐条标出）

以下全部来自 README 的 “Get started”，命令原样可复制。

1. **安装**。前提：Python 3.11+。

```bash
uv tool install 'trading-research-agents[ccxt,openai,anthropic,google,data]'
```

没有 uv 就在虚拟环境里 `pip install 'trading-research-agents[ccxt,openai,anthropic,google,data]'`。升级并确认版本：

```bash
uv tool upgrade trading-research-agents      # 或 pip install -U '…'
tra --version
```

README 特别提醒：GitHub 的 `develop` 分支是下一个版本的开发处，那里的 commit **不是** release，要用 PyPI 上的 release。

2. **建一个 desk**（一个装着你的设置和所有 agent 决定的文件夹）。前提：有下面某一个 provider 的 key。

```bash
tra init my-desk --profile autonomous --agent groq
cd my-desk
```

| `--agent` | 写入 `.env` 的 key | 不指定模型时的默认模型 |
|---|---|---|
| `groq` | `GROQ_API_KEY`（免费档） | `openai/gpt-oss-120b` |
| `google` | `GEMINI_API_KEY` | `gemini-flash-latest` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-opus-5-5` |
| `openai`, `deepseek`, `xai`, `openrouter`, … | 见 “Models and providers” | 用 `--model` 指定；`tra models <provider>` 可列出 |

加 `--venue okx`（或任何 ccxt id）可换成非默认的 Bybit。

3. **放 key**。前提：每个命令只在 `strategy.toml` 旁边的 `.env` 里找 key。

```bash
cp .env.example .env        # 然后在 .env 里设 GROQ_API_KEY=...
```

4. **自检**。`tra check` 会把所有设置互相对照，并指出下一步唯一要修的那件事。就绪时输出：

```
ok    provider groq: ready
ready to run `tra run`
```

5. **跑**。`tra run` 用实时行情决策一次，在沙箱里，什么都不发出去；`tra run --every 15m` 按 15 分钟 bar 的时钟持续决策。只敲 `tra` 会进控制台（接受同样的命令）。脚本/cron 用 `tra -c "run --now"`。

```bash
tra run
tra run --every 15m
```

6. **想发真单时**（先在交易所的练习账户，不要上 mainnet）：把练习账户的 key 放进 `.env`；用 `tra mandate` 读授权书，`tra mandate --sign "Your Name"` 签名（签名不会打开任何开关，落成 `MANDATE.md`）；在 `strategy.toml` 的 `[execution]` 里设 `mode = "venue"`、`leverage`、`max_notional`（单笔订单上限）。`tra check` 会列出还缺什么。

**新 desk 在你不改任何东西时的默认值**（可当 checklist 读）：

| 项目 | 默认 | 改哪里 |
|---|---|---|
| 下单 | 不发单，沙箱把每个决定写下来 | `[execution].mode` |
| 交易什么 | Bybit 上的 BTCUSDT，taker | `[run].instrument`、`[universe]`、`--venue` |
| 周期 | 15 分钟 bar 决策，读 1h/4h 作上下文 | `[run].bar_interval_s`、`context_intervals` |
| 策略 | 不固定，分析师在测得的 regime 支持时选 setup，否则空仓 | `[agents].mechanism` |
| 止损/目标 | 分析师提，止损被夹在 0.2%–3% 且不在一根 ATR 内，目标为止损的 1.5x–4x | `[exit]` |
| 单笔风险 | 在止损处损失 equity 的 0.5%（与止损距离无关） | `[controls].max_risk_per_trade_bps` |
| 坏日子 | 当日亏 3% 或从峰值跌 10% 后不再开新仓 | `[controls]` |
| 时间限制 | 持仓 4 小时后平 | `[exit].timeout_bars` |
| 值不值得做 | edge 至少是往返成本的 2 倍，一半交易能打平或更好，一天最多 6 笔 | `[targets]` |
| 监督 | 一个只能 cut/pause/halt 的风控；两个只汇报的审计 | `[audit]` |

**真正可迁移到别的工作的，是这套架构约束**（README 用 “What it solves” 表 + cycle 流程图 + 角色表写死了）：

- 数据与算术全在系统侧：模型引用的每一个数字都要对着发给它的 brief 校验，**连值一起校验**。
- 成本先算：fee、spread、impact、funding、slippage 组成往返成本，在订单存在之前就定价，声称的 edge 覆盖不了就直接拒。
- 每个角色只看它工作需要的数字：brief 由系统按角色写。
- 模型回答先过闭 schema 再给人读，所以只支持 JSON mode 的 provider 也被约束成同样的形状。
- 验证者（pro / contra / neutral）只能 support/oppose/abstain 并引用被给到的数字，**引用不到数字的 claim 直接丢弃**；投票本身永远不决定结果，只按你给的权重（`[conviction].validator_weight`）去移动 conviction。
- conviction 是算术：每个分析师的观点按其读数相对你画的阈值折算成 -1..1 的分数，一致就放大、反对按比例缩小，只有反对压过支持才中止交易（README 例：0.70 信心的空头，对上一堆勉强看多的宏观和情绪得 0.56、半仓；对上强烈看多的背景得 0、不做）。
- 风控只能让 desk 更保守：continue / cut / pause / halt，各自带声明的小时数，**不能放松你设的限额，也不能加仓**。
- 每一次拒绝都要指名它背后的那个数字。
- 全部不重写地落盘：每轮的 snapshot、briefs、answers、intent、venue 回复。
- 止损止盈随入场单一起发到交易所，这样它们能在本进程死掉后仍然存在。
- 模型不能下单、撤单、改仓位、读项目外的文件、改配置。

**可直接抄的配置样例**（原文给的 TOML）：

```toml
[agents]
provider = "groq"
model = "openai/gpt-oss-120b"
effort = "medium"                    # minimal | low | medium | high | xhigh | max，vendor 支持时生效；不写用 vendor 默认
fallback = ["google:gemini-flash-latest", "anthropic:claude-opus-5-5"]

[agents.roles.sentiment_analyst]     # 只做打标的角色可以跑更便宜的模型
model = "a-cheaper-model"
effort = "low"
```

```toml
[execution]
mode = "venue"
environment = "demo"             # demo | testnet | mainnet
leverage = 3                     # 你选；它永远不会把一笔交易变大
max_notional = 400               # 单笔订单最大名义价值（计价货币）
margin_mode = "isolated"         # isolated | cross
hold_limit = "timeout"           # 按 [exit].timeout_bars 到时平；或 horizon，或 none
```

**换交易所/换数据源的两条命令**：

```bash
tra venues okx            # 它能做什么、用哪些 key 签名
tra venues okx --setup    # 要粘进 envelope.toml、data.toml、strategy.toml 和 .env 的块
```

tra sources show` 列出每个数据系列的来源和最后一个值的年龄；超过其 `max_age` 的值显示为 stale 且永不计入。

**想用固定脚本策略而不是 agent**：`tra data get BTCUSDT 2025-01-01` 取交易所归档、`tra backtest` 净成本回放一天、`tra paper --minutes 30` 在实时行情上空跑、`tra live` 是硬上限下的小型 canary。

## 对应的研究问题（对照五个问题逐条）

**1. 能力发现（哪些还想不到交给 AI 的工作）**
README 把边界划得很具体：模型适合“读市场并说出观点”——输出方向、固定列表里的 setup、信心、时间尺度、止损/目标位置；不适合算术、成本估算、遵守限额。它给出了四个分析师角色（技术：方向/信心/时间尺度/止损目标；宏观：risk-on / risk-off / neutral，且**永远不能提方向**；链上：accumulation / distribution / neutral；情绪：negative / neutral / positive 或 not declared，且**不能编造没有数字支持的 mood**），外加市场筛选器（只能从系统已纳入的标的里挑并引用其数字）、验证者、风险经理、两个审计（只能出 findings 和 proposed changes，**不能改任何东西**）。这张表就是一份“什么交给模型、什么绝对不交给模型”的岗位说明书。

**2. 任务匹配（什么工作配什么模型/工具/协作方式）**
- 按角色分配模型与 effort：只做打标的角色用更便宜的模型 + `effort = "low"`。
- `fallback = [...]` 按顺序在限流或宕机时顶上，**用同一份 brief**。
- 免费档按模型单独计量，所以同一 provider 的两个模型可以各留各的额度；`tra check` 按模型判断负载过重。
- provider 表给出结构化输出能力的差异：`groq`（JSON schema，退到 JSON mode，由系统校验）、`google`（JSON schema）、`anthropic`/`openai`（JSON schema，openai 为 strict）、`deepseek`/`xai`/`openrouter`/`qwen`/`ollama`/`local`/`9router`（JSON mode）。README 强调：**无论哪个 provider，回答都先由系统对着闭 schema 解析**，所以只会 JSON mode 的模型和 strict schema 的模型被约束成同一形状。
- 协作方式：多个分析师**同时被问**（round1 并行），验证者在成本定价和止损目标检查之后、且“数量由你声明”；分析师允许互相不同意，分歧通过加权分数体现，而不是投票。
- 本地/自托管路径：`ollama`（无需 key、本地 server）、`local`（任何 OpenAI 兼容 server，传 `--base-url`）、`9router`（本地 router）；自建 provider 约三十行。

**3. 条件供给（需要给哪些信息、工具、权限、反馈）**
- **凭据**：`.env` 里各 provider 的 key；`tra keys --probe` 能在不发 prompt 的情况下验证每个 key 可用。
- **数据**：`sources/` 下声明日期化的系列，可以是自己维护的文件，也可以是 desk 自己刷新的 feed（FRED、Crypto Fear & Greed Index，或任何以 https 返回 JSON 的付费厂商）。每个系列有 `max_age`，过期值显示 stale 且不计入。
- **你自己的判断阈值就是供给的一部分**：`[regime]` 的界线、宏观阈值、conviction ladder、`[exit]` 的止损目标边界、`[targets]` 的 edge 倍数与每日笔数上限。
- **权限**：agent 能碰到的东西被 README 的表格写死；模型不能下单/撤单/改仓/读项目外文件/改配置。真实下单前还必须签名 mandate（`tra mandate --sign`），且签名不会自动打开任何开关。
- **反馈**：`usage.jsonl` 记录每次调用的 token 与延迟（除非你声明上限，否则没有任何花费封顶）；`tra check` 把“下一步唯一要修的一件事”说出来；每次拒绝指出背后的数字。

**4. 主动推进（时间/事件/状态触发、持续完成）**
- 时间触发：`tra run --every 15m` 按 bar 的时钟持续决策；控制台会显示 `next pass at 14:30:00 UTC, in 10m 57s` 并倒计时。
- 状态触发：cycle 的第一个判断是 “has anything moved since the last look?”，没有变化就 `held`——**只拉一次数据，不花 token**。
- 分层推进：系统先发现 universe 并逐个测量、筛选器挑标的并引用各自数字、被选中的才跑完整 cycle。
- 事件触发：审计员被 alarm 唤醒（有自己的 spinner）。
- 持续照看：每个 pass 开始时对照交易所核对持仓；超过 hold limit 的用 reduce-only 平仓；止损止盈挂在交易所而不是进程里，所以进程死掉也不裸奔；Ctrl-C 或服务停止会在进程退出前撤掉挂单。

**5. 效果验证（怎么判断确实改善）**
- 结构上强制可审计：每轮保留 snapshot、briefs、answers、intent 和 venue 的说法，**不重写**。
- 每个拒绝都指名背后的数字（例：claimed edge 1.94x，desk 声明要 2.0x）。
- `positions.jsonl` 记录每一次平仓，`round_trips.jsonl` 记录每一笔完成的交易，venue 的止损/止盈平掉的仓会带上真实手续费和 funding 写进去。
- 两个审计（technology、quant）读本 desk 的记录，出 findings 和 proposed changes——但改不了任何东西。
- 回测/回放不以好看为准：示例里 `tra data get` + `tra backtest` 的回放打印 `net -294.19 bps`，README 明说“照原样显示：只报喜的回测没人该信”。

## 与已有做法的关系

清单中相关条目：**DeepSeek（tool，状态 try）**。

原文的 provider 预设表里包含 `deepseek`：`DEEPSEEK_API_KEY`，用 `openai` 库安装，结构化输出为 **JSON mode**，实测栏标的是 **preset only**（即只有预设，未见 live 测试）。也就是说它可以作为 `[agents].provider = "deepseek"` 使用，或放进 `fallback` 列表；由于回答仍要过系统闭 schema 校验，JSON mode 的 provider 与 strict schema 的 provider 被约束成同一形状。

其余清单条目在本材料中没有对应。

## 证据与局限

**原文给出的数据与案例（可作为证据）**

- 一段真实运行的 plain-text cycle 记录（BTCUSDT）：agents 用了 5.344s、validators 用了 15.042s；funding / ohlcv / orderbook 三个数据源的 age 分别为 4.267s、32.746s、7.544s；validator contra 反对并引用 2 个数字、pro 支持并引用 3 个；conviction 0.800/1.0（macro 1.0、sentiment 0.5、technical 1.300）；risk 8.29 bps of equity 于止损处，对照声明的 50 bps，size 0.010；cost 12.87 bps round trip（其中 2.00 是估算）；gate：声称的 25.0000 bps 越过 12.8723 bps 成本 + 0.0000 margin。**这笔交易最终被拒**，理由是声称的 edge 是往返成本的 1.94 倍而 desk 声明要 2.0 倍——“成本是确定的，edge 不是”。
- 交易所落地情况：Bybit（默认）与 OKX 已被作者**在 demo 上端到端跑完**（真实订单、出场随单附带、撤掉一张挂单 / 由交易所自身出场平掉）；Bitget、BingX、KuCoin Futures、Hyperliquid 标 “ready for its run”，缺公开报告；Binance、Deribit、HTX、Gate、MEXC 只支持下单但你得自己带止损（`exits = "none"`）；Kraken、Kraken Futures、Phemex 目前只有数据（ccxt 不报持仓，系统不会把单发进一个看不到的仓位）。
- provider 实测情况：`groq` 的 `openai/gpt-oss-120b` 与 `openai/gpt-oss-20b`、`google` 的 `gemini-flash-latest` 标 “测试过 live”；`anthropic`、`openai` 只做了 unit test；其余多数是 preset only。
- 回放示例：`net -294.19 bps`（示例 core，净成本）。
- 安全机制清单：订单只发到你声明的环境；已有持仓或挂单会拒绝第二笔入场；尺寸不合交易所 step 就拒绝而不是四舍五入；时钟与交易所差超过一秒在签名之前就拒绝；Ctrl-C 或服务停止先撤挂单。

**只是作者主张、本材料未提供独立验证的部分**：四分析师 + 验证者的分数加权方案能带来更好的交易结果；“风控只能收紧”足以防止灾难；把止损止盈挂在交易所就能覆盖进程死亡的全部风险；审计员提出的 findings 有用。这些是设计论证，不是业绩证据。

**适用条件与局限**

- **alpha 状态**，README 自己说设置会在版本之间变化；GitHub `develop` 上的 commit 不是 release。
- **真实资金路径作者没跑过**：README 明确 “Step 3 has not been run by us; treat it as yours to verify, small, first.”
- 市场类型受限：目前是线性永续（USDT/USDC 保证金）；现货已建但仅多头全额；股票永续、代币化股票、预测市场走同一路径；期限合约、反向合约、期权在实现其成本模型/出场规则/测试之前，venue 模式会在每一单上检查类型并拒绝。
- 持仓照看有时序缺口：README 末尾（原文在此被截断）说的是持仓检查只在 `tra run --every` 的每次 pass 开始时跑，“没有 desk 在跑时，一个开着的仓位……”——**原文到此处截断**，这一句没有说完。
- 本材料是仓库 README，`## Watching a desk, and what is kept`、`## Command line`、`## What it guarantees, and what is not built yet`、`## Where it is going`、`## Documentation` 等小节的内容**没有拿到**，因此关于“保证了什么、还没建什么”只能从 README 前文拼出。
- 30 stars，属于社区验证很少的早期项目；非交易场景的迁移完全是我方推断，原文没有任何非交易用例。

## 怎么试、怎么验证

**最小试用（沙箱，零资金，约十几分钟）**

1. 用一个免费档 provider（`groq`）的 key。
2. `uv tool install 'trading-research-agents[ccxt,openai,anthropic,google,data]'`
3. `tra init my-desk --profile autonomous --agent groq && cd my-desk`
4. `cp .env.example .env` 并填入 `GROQ_API_KEY`。
5. `tra check` —— 判定标准很硬：看到 `ok    provider groq: ready` 和 `ready to run \`tra run\``。
6. `tra run` 跑一次；再 `tra run --every 15m` 或进 `tra` 控制台连看几轮（沙箱不发单）。

**要看的指标（判断它是否真在按它声称的方式工作）**

- 每一轮是否至少出现带具体数字的 refuse，而不是含糊的“不适合”。
- 模型引用的数字能否逐一对回系统发给它的 brief（这一条是“系统算数、模型不碰数字”的直接可观察证据）。
- 有没有出现 `held`（无变化时不花 token），以及 `usage.jsonl` 里每轮的 token 与延迟（agents 段 vs validators 段的耗时可以对照它给出的 5.344s / 15.042s）。
- `tra sources show` 里是否有值被判为 stale 且确实没被计入。
- 故意把 `[targets]` 或 `[exit]` 的阈值调严，看拒绝是否随之变多、理由是否仍然指名数字——这是验证“你的阈值在决定，而不是模型在决定”的最快办法。

**要试 venue 路径（仍不上真钱）**

用交易所练习账户（demo/testnet）：放练习 key → `tra mandate` 读 → `tra mandate --sign "..."` → 在 `[execution]` 设 `mode = "venue"`、`environment = "demo"`、`leverage`、`max_notional` → `tra check` → 跑几轮。验证：发出去的订单是否**带着止损止盈**、Ctrl-C 是否先把挂单撤掉、已有持仓时是否拒绝第二笔入场、`positions.jsonl` / `round_trips.jsonl` 是否如实写入。**不要直接上 mainnet**，作者自己也没跑过那一步。

**如果把结构迁移到非交易工作**（这是本项目的主要价值），把验证指标换成：模型的每个数字断言是否都有系统侧来源；被拒的提议是否都带理由落盘且不可改写；是否能在事后仅凭记录重放“当时看到了什么、为什么拒绝”。做不到这三条，就还只是“让模型直接做决定”，不是这套架构。
