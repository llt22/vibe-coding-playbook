# cheaper-inference/OmniRoute

- 结论：**值得一试**。建议小范围试：在本地启动 OmniRoute，把 Claude Code 或 Cursor 的 base URL 指向 http://localhost:20128/v1，模型用 auto/subscription 或 auto/coding 跑一到两周，对比中断次数、单位任务 token 成本和 p95 延迟，再决定是否常态化。理由是它给出了可照做的接入方式与回退/路由配置，但省 token、免费额度等关键数字均为项目自述，且依赖第三方 provider 条款，必须先自测。
- 原文：https://github.com/cheaper-inference/OmniRoute
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-22T13:33:43.053Z

## 是什么

OmniRoute 是一个可自托管的 AI 网关（MIT，npm 包 `omniroute`，另有 Docker 镜像 `diegosouzapw/omniroute`）。它对外暴露一个 OpenAI 兼容端点 `http://localhost:20128/v1`（同时声称兼容 Claude、Gemini 与 Responses API），你把 Claude Code、Codex、Cursor、Cline、Copilot 等客户端指向它，由它在多个 provider、多个模型之间自动路由、按配额回退，并在链路上做 token 压缩（RTK + Caveman）、熔断、密钥池与用量统计。README 自述覆盖 375 个 provider、1475 个 chat 模型 ID、20 种路由策略、37 个 CLI/agent 集成。

核心概念是 **combo**：一条模型链，配额耗尽、provider 故障或成本飙升时自动切到下一个健康目标。不建 combo 也可以直接用 `auto` 系列虚拟 combo。

## 具体做法

> 说明：给出的原文在中途（策略表第 3 条）被截断，安装/首次运行章节的具体命令未完整抓到。下面只写原文能确认的步骤，安装细节需回仓库 README 的 Quick Start 补齐。

1. **准备前提**：一台可长期运行的机器（本地或服务器），Node 或 Docker 环境；以及至少一个你自己有权使用的 provider 账号或 API key。OmniRoute 不发放额度，免费额度是第三方 provider 的。
2. **安装并启动服务**：按 README Quick Start 安装 npm 包或拉 Docker 镜像后启动，默认监听 `20128` 端口。v3.8.53+ 支持无界面模式 `serve --headless`，适合放服务器常驻。（具体安装命令原文片段未包含，需回原文确认。）
3. **连接 provider**：在 Dashboard 里绑定自己的账号或 API key。注意：被标记 `tos: avoid` 的 provider（原文点名 Kiro）默认被排除在自动路由之外，即使连上账号也不会覆盖该设置；选 provider 前先看 Free Tiers Guide。
4. **取网关密钥**：Dashboard → Endpoints 复制 OmniRoute key。
5. **验证端点通不通**（原文示例，`model` 用 `auto`）：

```bash
# After connecting a provider, copy your OmniRoute key from Dashboard → Endpoints:
curl http://localhost:20128/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OMNIROUTE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'
```

   前提：`auto` 必须有可用路由；全新安装可能没有任何可用的 keyless 目标，某些 keyless provider 也会拒绝第三方客户端。
6. **改客户端配置**：把 Claude Code / Codex / Cursor / Cline 等的 base URL 改成 `http://localhost:20128/v1`，API key 填 OmniRoute key，模型名改成下面的别名之一。原文给出 Python、Node.js、PHP、cURL 的 quickstart 脚本在 `examples/quickstart/`。
7. **按场景选 `auto` 变体**（零配置，不用建 combo）：
   - `auto`：均衡默认，LKGP（粘住上次可用的好 provider）
   - `auto/coding`：代码生成，质量优先权重
   - `auto/fast`：最低延迟优先
   - `auto/cheap`：每 token 最便宜优先
   - `auto/subscription`：只用已付费的订阅额度，**失败即停，绝不回退到会产生账单的通道**（适合有预算红线的人）
   - `auto/thrifty`：先用套餐额度，再一级一级降到最便宜的付费选项，套餐重置后自动回到套餐
   - `auto/offline`：选配额/限流余量最大的
   - `auto/smart`：质量优先 + 10% 探索，用来发现更好的模型
   - `auto/lkgp`：显式粘住 last-known-good provider
   - `auto/chaos`：并行 fan-out 到一个模型面板（默认每个 provider 一个、共 5 个），返回一个答案；注意这是每个面板模型各发一次上游调用，不是故障注入
8. **需要精细控制时自建 combo**：在 combo 的每一步挑一种策略。原文列出 20 种，可见的前三条是 `priority`（按序逐个榨干）、`fill-first`（填满一个目标的配额再换下一个）、`round-robin`（原文此条被截断）……其余 `weighted / p2c / least-used / cost-optimized / headroom / reset-window / reset-aware / context-relay / context-optimized / auto / fusion / pipeline / cache-optimized / quota-weighted` 等需回原文策略表确认语义。
9. **看板与遥测**：用 `/dashboard/free-tiers` 看免费额度池的已用/剩余，用 live analytics 看用量、配额、节省额、p95 延迟；靠 circuit breaker、key cooldown、model lockout 三层机制处理死 key。

## 对应的研究问题

**1. 能力发现**
原文明确把“模型选择、配额管理、故障回退、成本控制”这类元工作从人身上拿掉，交给网关自动做——这是很多人还没交给 AI 工具链的一层。另外“工具输出烧 token”被单列为可自动压缩的对象（RTK + Caveman，宣称省 15–95%），提示可以把上下文压缩当成流水线的固定环节而非临时技巧。

**2. 任务匹配**
原文给了明确的任务—模型映射，可直接照抄：代码生成 → `auto/coding`；延迟敏感 → `auto/fast`；成本敏感 → `auto/cheap`；只准用订阅额度 → `auto/subscription`；想顺带发现更强模型 → `auto/smart`（10% 探索）；需要多模型交叉验证 → `auto/chaos`（5 路并行取一个答案）；配额快用完 → `auto/offline`。这是本项目里少见的、可直接落地到配置文件的匹配规则。

**3. 条件供给**
需要提供：provider 账号/API key、OmniRoute 网关 key、客户端可改 base URL 与模型名、可长期运行的进程/容器。需要给的反馈回路：用量、配额、节省额、p95 延迟的实时看板，以及配额重置窗口（`reset-window`/`reset-aware` 策略依赖它）。原文还提到密钥用 AES-256-GCM 本地加密、local-first，属于权限与隐私侧的前置条件。

**4. 主动推进**
有明确的事件/状态触发：配额耗尽、provider 失败、成本飙升 → 自动切下一个健康目标；key 冷却与 model lockout 按状态自动恢复；`reset-window`/`reset-aware` 按配额重置时间调度；`auto/thrifty` 在套餐重置后自动回到套餐。这些是“无需人盯”的持续行为。但原文没给出定时任务、长任务续跑之类的自主推进流程，持续完成整段工作的证据不足。

**5. 效果验证**
原文给了可观测项：`/dashboard/free-tiers` 的已用/剩余额度、live analytics 里的 usage / quota / savings / p95 latency；免费额度总额还有“池去重”的算法说明（467 条免费条目 → 34 个复用池 key → 其中 17 个有公开正月度预算的池 + 5 个 Groq 单模型上限）。但它没有给出“质量是否变好”的对照方法，节省与延迟是成本/性能指标，不是效果指标，质量验证要自己补。

## 与已有做法的关系

- **Claude Code（adopt）、OpenAI Codex（adopt）**：OmniRoute 不替代它们，而是垫在下面的一层。原文明确说 `auto/subscription` 是“只用你已经付费的订阅额度”，说明它就是给已有订阅用户做额度调度和回退的。对已 adopt 这两者的人是增益而非替换。
- **Cursor（watch）、Cline（watch）、OpenCode（watch）、goose（watch）、GitHub Copilot（drop）**：原文把 Cursor、Cline、Copilot 列为可通过同一份配置接入的客户端；Copilot 在清单里是 drop，不必为它单独接。
- **DeepSeek（try）**：属于可接入的 provider 之一，不冲突。
- **Trendshift（source，watch）**：原文把 Trendshift 徽章作为曝光来源，属资讯渠道。
- 清单中**没有同类的“多模型路由/配额回退网关”条目**，因此 OmniRoute 补的是一个尚未覆盖的层：客户端之下的路由与成本控制。
- 注意：原文有赞助位与 `aff=` 联盟链接（Kimi、Cheaper Inference、AgentRouter），“Open Source Friends”是商业合作关系，评估时应与产品能力分开看。

## 证据与局限

**原文给出的数字/案例**（均为项目自述或其自建看板的计算结果，未见第三方复现）：
- 375 个 provider、1475 个 chat 模型 ID、37 个 CLI/agent 集成、20 种路由策略、MCP 110 工具、A2A、56,000+ 静态测试声明（覆盖 7,800+ 测试文件）。
- 免费额度：467 条免费条目、34 个复用池 key，口径是“17 个有公开正月度预算的池 + 5 个 Groq 单模型上限”，按共享池去重后约 **1.62B tokens/月**，首月含注册赠送最高约 2.22B；需要区域身份验证的（如 ModelScope）单列、约 +6M，且不计入头条。原文自己也强调“这是第三方免费层级的估算汇总，不是 OmniRoute 发放的 token”。
- 压缩：RTK + Caveman 叠加，省 15–95%（平均约 89%）。
- 价格起点 $0；版本表显示 v3.8.50→v3.8.51→v3.8.53+ 的 provider/模型数增长。

**哪些只是主张**：89% 平均省 token、“永不撞限额”、“$0 起步”都缺可复现的测量方法（用什么任务、什么基线、怎么算 token）；免费额度数字依赖第三方条款，原文承认“每两周重新审计、会双向波动”；provider 数量与“可用”是两回事——原文提醒新装可能没有可用 keyless 目标。

**适用条件与风险**：
- 必须自带 provider 账号/密钥，且各 provider 的 ToS 自行承担；被标 `tos: avoid` 的（如 Kiro）默认排除。用免费额度做生产有封号/断供风险。
- 网关是单点：它挂了，所有客户端一起挂；需要评估是否值得为省成本引入这个依赖。
- 原文截断，安装命令、combo 完整策略语义、压缩的具体配置项都不在全文中，落地前必须回仓库读文档。
- README 含大量营销话术、联盟链接与赞助位，可信度需打折；`~1.62B` 与 `~89%` 这类数字不应直接写进对外材料。

## 怎么试、怎么验证

**最小试用（1–2 周，单人单机）**
1. 本地或一台小服务器起 OmniRoute（先试 Docker，便于回滚）。
2. 只接 2–3 个 provider：1 个付费主力（你本来就在用的）+ 1 个免费备用，避免一上来铺 375 个。
3. 只改一个客户端的 base URL（选你日均用得最多的那个，如 Claude Code），模型先用 `auto` 和 `auto/coding` 两个别名。
4. 有预算红线就用 `auto/subscription` 跑一天，确认它真的“失败即停”而不产生账单。
5. 跑同一批真实任务，一半走网关、一半直连原 provider，做对照。

**判断有没有改善的指标**
- 中断次数：一周内因 rate limit/额度耗尽导致的任务失败或等待次数（核心指标）。
- 单位任务成本：同一批任务的 token 数与花费，网关组 vs 直连组。
- p95 延迟：看板里的 p95 与实际体感；`auto/fast` 是否真的更快。
- 压缩收益：挑 3 个“工具输出很长”的典型任务，记录开启压缩前后的输入 token 数，验证 15–95% 的宣传在你这里落在哪个区间。
- 质量对照：同批任务两组的返工率/一次通过率，防止“省了钱但答案变差”。
- 稳定性：网关自身宕机时长、回退触发次数与回退后的成功率。

**判据建议**：若“中断次数显著下降 + 单位任务成本下降 + 质量不劣化”，可从 try 升为常用配置；若压缩导致答案质量下降、或免费 provider 出现条款风险、或网关本身成为新的不稳定源，则退回直连，只保留“多 provider 回退”这一条思路（这本身可单独写进手册）。
