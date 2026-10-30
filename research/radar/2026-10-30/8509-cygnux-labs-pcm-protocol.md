# Cygnux-Labs/PCM-protocol

- 结论：**值得一试**。建议小范围试：按 README 跑通 tracekit pcm demo，并只在一条需要凭上游结论行动的 agent 链路上接入 PCM 的三值校验（proven/unproven/failed），同时自行补上证据新鲜度检查——因为 0.1 版 712 条谎话里唯一漏放的 10 条全是过期证据，协议本身仍是 0.1 草案、单机评测、参考实现内置 in-process executor。
- 原文：https://github.com/Cygnux-Labs/PCM-protocol
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-10-30T06:53:57.297Z

## 是什么

PCM（Proof-Carrying Messages）0.1 是一个 agent 之间的消息协议：消息里每条关于「发生了什么」的主张（claim）都可以携带证据，接收方**离线**核验。证据是来自「发送方 agent 无法写入的 append-only Merkle 日志」的记录，附 RFC 9162 包含证明（inclusion proof）和 checkpoint 签名；消息本身由「证明型签名器」（attesting signer，参考实现为 Tracekit）签名，agent 自己从不持有密钥（4.4）。

判定是三值的：每条 claim 得 `proven` / `unproven` / `failed`，整条消息得 `accept` / `accept-unproven` / `reject`；不能严格解析的文本得第四种 `bad-input`，在任何检查之前就被拒（3.3、13.2）。

最核心的一条规则：**只靠 agent 自己说法的主张永远是 `unproven`，绝不会是 `proven`**。记录只有在「agent 以外的第三方写入」时才构成证明——签名器（依据某个人的答复或观察者的报告）或实际执行了该调用的 attesting gateway/executor（T2）；agent 自己进程上报的结果（T1）只给 `unproven`，且 T2 标记只读签名器设置的字段，不读 agent 发来的数据（6.4、6.5）。

典型场景就是 README 开头那个：A 对 B 说「alice 批准了这笔 120 美元的退款」「测试通过了」「我从 api.example.com 取到了这笔订单」，B 今天只有 A 的一面之词。

## 具体做法

### 1. 装参考实现并跑通 demo（前提：有 Python 环境、能 pip 安装）

```sh
pip install tracekit-ai==1.5.0
tracekit pcm demo        # two agents, a refund request and a real signer: accepted, unproven and rejected messages
```

demo 会给出三类消息各一条：accepted、unproven、rejected。先把这三条输出和 `skipped` 字段看懂，再接自己的系统。

### 2. 让 agent 的工具调用走证明型签名器（前提：agent 不再持有密钥）

协议要求的三步（原文「The idea」）：

1. agent 的工具调用经过 attesting signer，签名器把每次调用记进 append-only Merkle 日志，agent 写不了这个日志；
2. agent 发消息时由签名器签名，消息携带支撑每条 claim 的日志记录与包含证明；
3. 接收方离线校验签名、证明、记录（对照自己 pin 住的 key），每条 claim 得 `proven`/`unproven`/`failed`。

关键前提：要拿到 `proven`，执行方必须是 attesting gateway 或 executor（T2），不能是 agent 自己回报。

### 3. 构造消息（JSON envelope）

- 签名器负责设置消息的 `id`、`ts`、`nonce`、`sig`（4.4）；
- **intent** 是 typed 的，按双方用哈希 pin 住的 schema 文档校验（5）；
- **claims** 目前是封闭词表四种类型：`tests_passed`、`reached_host`、`file_written`、`approved_by`；新增类型需要新 checker 和每种结果的测试向量（6.6、17.2）；
- **grants**：root grant 只有在「签名器配置里具名的人」批准了一个条款完全一致的 `pcm.grant` 调用后才存在——不能是 agent 批准、不能自批、不能是 grant 的主体；子 grant 只能收窄父 grant（按类型化 caveat 的固定蕴含表），每层都由签名器校验后签名，验证方再校验整条链，并绑定到发送方 tenant 与该消息的签名日志（7.3–7.6、14.18）；
- 传输层不替代：PCM 消息设计为装在 A2A / MCP 里，作为 `application/vnd.pcm+json` 类型的 part 或 embedded resource（11，draft）。

### 4. 接收方核验流程

对一条消息依次做：验签（对照自己 pin 的 log key）→ 每条记录的 `hash` 是否等于其 `event` 的哈希、`proof` 是否通向 checkpoint root → 记录是否是发送方 run 与 tenant 的合法事件（6.2）→ 按 id 把 approval 连到其 request、request 连到 decision（6.6）→ 若 claim 带 `covers: true` 且 decision 是 `pcm.grant`，走 grant 路径，校验 root grant 的 `issuer.approval_id`、`run`、`tenant` 与该 approval 一致 → 校验 grant 链的 caveat（例：`amount <= 20000`、`order == 81`）→ 校验 schema → 校验 replay。

### 5. 接收方纪律（可直接做成检查清单，原文「What a receiver does」）

- 以自己的身份作为 `me`，整个生命周期只维护一份 replay state（9）；同一身份的多个副本要么按发送方路由到同一副本，要么共享状态——一个接收身份对每条消息最多接受一次。`skipped` 非空的结果**只能用于审计**（8）。
- **绝不根据 `reject` 行动**；把 `unproven` 当作发送方的一面之词（8）。
- 需要「人的授权」时，在 schema 里列出 `approved_by`，这样只有带 `covers: true` 的 claim 才满足它（6.6）。注意：approval 是对**一次调用**的批准，不是对一条消息的批准；在 tool-and-args 路径上，它覆盖发往任何接收方、任意次数、同样的 tool + args 的每条消息。要一次性授权，就在 schema 里列一个该请求唯一的字段（如 `request_id`）并每个值只执行一次，或者要求 grant（其 caveats 与过期时间限定范围）（14.27）。
- `approved_by` 没有 `covers` 时，要读结果里的 `approved`（它的 `tool` 与 `args`），不能只看 `result`——claim 里的 call id 是 agent 自己起的名字，`approved` 才是那个人实际看到的（6.6）。
- `proven` 的 `tests_passed` 只证明「这条确切的命令行经由 attesting executor 退出码为 0」。测试 runner 可以带根本不跑测试的 flag，所以要拿 `suite` 与自己接受的 suite 集合比对（6.6）。
- `proven` 的 claim 只说「这次调用发生过」，不说「之后没变过」：检查证据年龄（两个 CLI 在 `proven` 的 `tests_passed` 或 `file_written` 之后都会打印），文件还要拿 digest 与手上的字节比对（14.13）。
- `grants.root` 要对照你自己接受的人：验证器只报告 root 那个人是谁，不判断该不该信他（7.6）。

### 6. 复现评测（可选，用于自评或改造）

在仓库根目录，Tracekit checkout 到 v1.5.0（`run` 另需 standalone verifier 的 `rfc8785` 与 `cryptography`）：

```sh
PYTHONPATH=<tracekit> python -m bench.lies run --verifier all   # results/{tracekit,standalone,baselines}.jsonl
python -m bench.lies report                                     # results/results.json, findings/, the tables
```

要造新数据集先跑 `gen`（会覆盖已提交的 `data/dataset.jsonl` 与 `data/meta.json`，另需 pytest、IPv6 loopback `::1`、以及像 macOS 那样解析 IPv4 写法的 resolver；seed 20261028 固定密钥与所有选择）：

```sh
PYTHONPATH=<tracekit> python -m bench.lies gen                  # data/dataset.jsonl, data/meta.json (~1 min)
```

### 7. 必须自己补的一块：新鲜度

0.1 的已知漏洞是「过期证据」：测试曾通过、代码改了、测试又失败，发送方引用那次通过；或文件写了两次，引用第一次写。两种都判 `proven`，因为 0.1 的 claim 只说「调用发生过」。原文给的缓解是检查证据年龄 + 文件 digest 比对，而「调用之后的运行状态」证据只是 Appendix B 第 5 问里 0.2 的设计方向。所以接入时要自己加：对关键决策重跑测试或把 suite 与 commit 绑定；对文件一律核 digest；对带时间窗的结论设最大证据年龄。

## 对应的研究问题

**1. 能力发现（AI 已能做、但还没想到交给它的事）**
PCM 把三类原本「只能凭对方一句话」的结论变成可离线核验的主张：「测试通过了」、「某人批准了这笔」、「我从某主机取到了数据」——对应四种 claim 类型。能力边界也很明确：只有这四类，新类型要新 checker + 各结果向量；而且证据必须由 agent 之外的一方写。所以能扩展的是「有外部副作用、下游要据此动手」的调用（退款、改文件、跑测试、拿授权），而不是所有 agent 输出。

**2. 任务匹配（什么工作适合什么模型/工具/协作方式）**
匹配规则很干脆——按「证据由谁写」分配工具：要证明测试，就让 attesting executor 真跑（示例判决：`call call-9 ran 'pytest -q tests/test_refund.py', run by mtls:spiffe://example/executor (T2)`）；要证明人的授权，就让人通过签名器批准 `pcm.grant`；agent 自己报的一律 `unproven`。协议不负责传输，消息内嵌在 A2A/MCP 里走。

**3. 条件供给（需要提供哪些信息、工具、权限、反馈）**
清单化：签名器持密钥、agent 不持密钥（4.4）；append-only Merkle 日志及其 checkpoint 签名 key；接收方 pin 住的 key 和 `trust.json`（威胁模型里接收方只有 message 与 `trust.json`）；双方按哈希 pin 的 schema 文档；接收方每个身份一份 replay state；能产出 T2 记录的 executor/gateway；root grant 必须由签名器配置里具名的人批准且不能自批。反馈方面：结果里明确写 `reasons`、`skipped`，以及对编码类问题的可操作提示（例：`its URL is not printable ASCII: send it ... with the host in xn-- form`）。

**4. 主动推进（时间/事件/状态触发并持续完成）**
只覆盖到「消息级门控」，没有长期自主编排：replay 规则会拒绝时钟窗外的、接收方启动前签的、nonce 见过的、at or below sender floor 的消息，且 eviction 会抬高 floor（9）；grant 有 caveats 与过期时间；`proven` 之后还要查证据年龄。这些是「状态触发」的检查点，不是任务调度。

**5. 效果验证（怎么判断确实改善了结果）**
这是全文最可直接借用的一块：假接受率、诚实主张 `proven` 率、两个独立验证器判决一致性、单条核验耗时、消息体积倍数。原文还给了具体的诚实性检查点：`proven` 的 `tests_passed` 要把 `suite` 与自己接受的 suite 比对；`reached_host` 在 4xx/5xx 上会被判 `failed`（诚实调用也可能因此被拒）。

## 与已有做法的关系

清单中只有 arXiv（kind: source，status: try），与 PCM 没有机制上的对应关系——**清单中没有相关条目**。

原文自述的先例（不是本清单条目，仅供定位）：proof-carrying code（Necula & Lee, OSDI 1996/POPL 1997，给了「生产者带证明、消费者用小程序检查」的形状，但 PCM 的证明是签名记录 + 包含证明，不是形式化证明，只在信任其签名器的范围内成立，14.25）；Certificate Transparency（RFC 6962/9162，Merkle 哈希、包含证明、checkpoint，C2SP signed-note / tlog-checkpoint / tlog-cosignature 格式）；capability token（Macaroons、Biscuit、UCAN——都能让持有者离线衰减，差别是 PCM 里 agent 不持密钥、每步由签名器校验后签名、root 必须来自人的批准、caveat 由 schema 类型化并用固定蕴含表比较而非通用逻辑）；JCS（RFC 8785，作为哈希与签名的规范形式，消息与 grant 各一个 tag）；A2A 与 MCP（承载消息）；in-toto。

## 证据与局限

**原文给出的数据**：预注册的谎话基准 926 条消息、712 条谎话（16 类 L1–L16），全部来自 Tracekit signer 的真实运行，标签取自实际发生了什么、绝不由 verifier 打。四条假设：H1 失败（接受 10/712 = 1.4%，95% CI 0.8–2.6%，全部为过期证据 L10.T.06–10 / L10.F.06–10）；H2 失败（83 条诚实消息中 81 条 proven，78 条主张中 76 条 = 97.4%，卡在 404 上限）；H3 通过（T1-only 主张 72/72 全 `unproven`）；H4 通过（两个验证器 926/926 一致）。PCM 对 712 条谎话的判决分布：626 reject、76 accept-unproven、10 accept。基线：plain A2A 712/712，仅验签 643/712（90.3%）。事后追加的六协议模型：A2A 1.0 + signed card 712、uAgents 702、RFC 9421 + replay 682、SCITT 550、Verifiable Intent 509、AP2 504，三者叠加仍接受 365（51.3%）。成本：消息中位体积 4.2 KB（tests_passed / reached_host）、4.4 KB（file_written）、6.1 KB（approved_by，p99 8.4 KB）、1.9 KB（仅 grant）、11.7 KB（三条 claim），相对 plain A2A 是 7.4x–16.2x；核验 p50/p99 为 1.2/2.4 ms（Tracekit）与 0.8/1.8 ms（standalone）。

**局限（原文自述 + 可从文中判断）**：
- 预注册写在运行之前，但**没有结果之前的公开时间戳**，是随结果一起提交的本地笔记，头部注明了与预注册的偏离处——预注册强度要打折。
- 单机（macOS 26.3 arm64、Python 3.11.15）；leading-zero IPv4 那条发现与平台相关；signer 与 executor 都是 in-process（是 Tracekit 的 custody 代码 + 进程内客户端，不是 HTTP executor 服务）；没有真实 DNS，名字由本地服务器给；Dataset 2 只生成一次（Dataset 1 生成三次，各格计数一致，只有一条被重新标注）。
- 10 条漏放是 0.1 的**文档化上限**（14.13），404 上限写在 SPEC 6.6，两者都只是 0.2 附录 B 的设计问题。
- 六个真实协议是「按其规范建的模型」，不是跑它们的 SDK；签名是真实 Ed25519，但用的是模型自己的字节布局，不是字面 JWS/SD-JWT/COSE；AP2 与 VI 各拒了 8 条诚实委派、8 条诚实批准（数据集未披露被批准的值），若把这些算作接受，AP2/VI 的上限分别是 567/573。
- 仓库成熟度：版本 0.1、37 stars、单一 lab 的两个仓库互相依赖（PCM ↔ Tracekit）。

**适用条件**：接收方愿意 pin key 与 schema、能接受 4–12 KB 的消息膨胀与约 1 ms 的核验开销、并且有 T2 通道（attesting executor/gateway）；缺任何一条，对应 claim 只会停在 `unproven`。

## 怎么试、怎么验证

**最小试用（半天量级）**

1. 一台机器 `pip install tracekit-ai==1.5.0` 并 `tracekit pcm demo`，确认能读懂 accepted / unproven / rejected 三种输出，以及 `skipped`、`reasons` 的语义。
2. 选**一条**「下游凭上游结论动手」的内部链路（例：agent 改完代码声称测试通过 → 另一个 agent 或流水线据此合并；或审批后付款）。只在这条链路上接 PCM；涉及人的授权就在 schema 里列 `approved_by`。
3. 用 `bench/lies` 的方法造 20–50 条自己的消息，其中一半是你能想到的谎（伪造事件、改一位十六进制哈希、引用别的 run、重放、放宽的 grant、编码差异），标签按实际发生的事写，**不要用 verifier 的输出当标签**。
4. 把 4 个指标记下来：假主张被接受数、诚实主张 `proven` 率、p50 核验耗时、消息字节数相对原文消息的倍数。

**判断有没有改善的指标（口径可直接照抄原文）**

- **假接受率**：原文基线是 plain A2A 100%、仅验签 90.3%，PCM 0.1 为 1.4%。如果你接入后假接受数还是两位数比例，说明签名器/T2 没真正接进去（还在走 T1），或者你的接收方没有执行 `reject`/`unproven` 纪律。
- **诚实 `proven` 率**：原文主张级 97.4%。明显更低，通常是 T2 通道没打通（executor 没接），或 `reached_host` 撞上 4xx/5xx 被判 `failed`（原文的两条诚实 404 就是这样被拒的）。
- **判决一致性**：Tracekit 内置 `pcm.verify` 与 standalone `pcm_verify` 应对同一消息给出同一判决与原因类（原文 926/926）。不一致说明你的消息构造或 loader 有问题。
- **新鲜度兜底是否生效**：统计「证据年龄超阈值」与「文件 digest 不匹配」被你自己拦下的次数——这正是 0.1 漏放的 10 条所在的位置。
- **`skipped` 拦截次数**：非空 `skipped` 的结果只能审计、不得据以行动；统计它被误用了几次。

**如果不想上完整协议**：最小可迁移的是它的判定纪律——三值 `proven` / `unproven` / `failed`、「`unproven` 不等于通过」、「`skipped` 非空的结果不得据以行动」、「proven 只说调用发生过，不说之后没变」——这几条不依赖 Tracekit，可以直接写进任何 agent 编排的验收步骤里。
