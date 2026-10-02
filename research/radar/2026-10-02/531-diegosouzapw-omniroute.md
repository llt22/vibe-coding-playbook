# diegosouzapw/OmniRoute

- 结论：**值得一试**。可以小范围试：先把 OmniRoute 当作本地 OpenAI 兼容网关装起来（npm i -g omniroute → localhost:20128 → 用 model=auto 打通），再把一个编码工具指向它，用它验证「按任务选模型别名 + 配额耗尽自动回退」这一套是否真能减少中断；理由是原文给出了可照抄的安装与调用命令和模型别名清单，但节省比例、免费额度等数字都是项目自述，且原文截断、缺少配置细节，不宜直接采纳。
- 原文：https://github.com/diegosouzapw/OmniRoute
- 来源：github-active，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-02T05:28:26.387Z

## 是什么

OmniRoute 是一个自托管的本地 AI 网关：在你的机器上起一个 OpenAI 兼容端点（默认 `http://localhost:20128/v1`），把 Claude Code、Cursor、Cline 等工具统一指过来，由它在后端的上百个供应商/模型之间路由。README 强调三件事：

- 组合（combo）+ 自动回退：一条 combo 是一串候选模型，配额用尽、供应商失败或成本飙升时自动移到下一个健康目标；回退分四层（Subscription → API Key → Cheap → Free）。
- 任务导向的模型别名：不建 combo 也能用 `auto` 系列别名，按质量、延迟、成本、剩余配额等目标现算一条虚拟 combo。
- 压缩与配额管理：称用「RTK + Caveman」叠加压缩省 token，并有配额遥测（dashboard 显示已用/剩余）。

注意：给定原文是 README 的营销化开头，正文在 19 种路由策略表格第 12 行处被截断，安装方式（Docker/源码/pnpm/Arch）、MCP/A2A、guardrails、evals 等都只有名称没有步骤。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

前提：本机可安装 npm 全局包、并能长期运行一个本地服务。README 称全新安装无需任何凭证即可先用 `auto`（keyless 供应商 OpenCode Free 已预置进 `auto` combo）。

1. 安装并启动网关（前提：有 Node.js/npm 环境）

```bash
npm i -g omniroute
```

README 说明安装后服务在本机 `localhost:20128` 启动。同一份 README 还提到 Docker、源码、pnpm、Arch 等安装方式，但给定文本未给出对应命令，需要到仓库文档自查。

2. 零凭证验证连通（前提：上一步服务已在跑）

```bash
curl http://localhost:20128/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"auto","messages":[{"role":"user","content":"Hello!"}]}'
```

如果只想指定这个免费后端，可直接调 `oc/…`（OpenCode Free），跑通后再改用 `auto` 让它自己挑。

3. 把已有工具指向这个端点（前提：工具本身支持自定义 OpenAI 兼容 base URL）。把 base URL 设为 `http://localhost:20128/v1`，模型名填第 4 步的别名。README 点名的可接工具包括 Claude Code、Codex、Cursor、Cline、Copilot、Antigravity。

4. 按任务选模型别名（原文给出的映射，可直接用；这是最可照做的一步）

| 模型 ID | 用途 |
| --- | --- |
| `auto` | 均衡默认，粘住上次可用的好供应商（LKGP） |
| `auto/coding` | 代码生成，质量权重优先 |
| `auto/fast` | 最低延迟优先 |
| `auto/cheap` | 每 token 最便宜优先 |
| `auto/offline` | 剩余配额/限流余量最多优先 |
| `auto/smart` | 质量优先 + 10% 探索 |
| `auto/lkgp` | 显式「上次已知良好供应商」粘性 |
| `auto/chaos` | 并行发到一个模型面板（默认每供应商一个、共 5 个），返回一个答案 |

5. 需要更细控制时自建 combo，逐步选择路由策略。原文列出 19 种可混搭策略，给定文本只到第 12 种：

`priority`（按序先耗尽第一个再下一个）、`fill-first`（先把每个目标的配额填满）、`weighted`（按权重随机）、`round-robin`（轮转）、`p2c`（二选一随机负载均衡）、`least-used`（选当前负载最低）、`random`（均匀随机去重）、`strict-random`（随机且不去重）、`cost-optimized`（按实时目录价最小化成本）、`headroom`（选剩余配额最多）、`reset-window`（优先选配额窗口最快重置的）、`reset-aware`（按配额重置时间排序，短窗口优先）。

6. 看配额与用量：打开 `/dashboard/free-tiers` 看已用/剩余（README 称该页每两周对照实时目录重审）。README 还称 dashboard 有 usage、quota、savings、p95 延迟的实时分析，但没有给操作步骤。

7. 更「生产级」的能力（MCP 110 个工具、A2A、memory、guardrails、evals、TLS stealth、key pools 公平配额、AES-256-GCM 加密存 key）在给定材料里只有名词，没有配置步骤，属于需要另行查文档的部分。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

1. 能力发现：把一个平时没人专门干的工作——跨供应商的配额统计、失败切换、token 压缩——交给网关自动化。README 明确把这四类痛点列为可接管项（订阅配额到期未用完、编码中途被限流、工具输出烧 token、死 key 导致阻塞）。
2. 任务匹配：这是原文最实的一块。它把「什么任务用什么模型」参数化成模型别名（`auto/coding` 重质量、`auto/fast` 重延迟、`auto/cheap` 重成本、`auto/offline` 重余量），再往上用 19 种策略描述候选之间的选择规则（成本优先、余量优先、重置时间优先等）。
3. 条件供给：需要提供本机安装与服务运行权限、各供应商的 API key 或订阅凭证、把工具的 base URL 改指向本地端点；反馈来自配额遥测和 dashboard 的 used/remaining。README 声称 key 本地加密（AES-256-GCM）、本地优先。
4. 主动推进：有明确的事件/状态触发描述——配额耗尽、供应商失败、成本上升时自动回退到下一个可达的健康目标；`reset-window`/`reset-aware` 按配额窗口重置时间来调度；`auto/chaos` 是一次调用并行扇出到多个模型面板。这些是「无人工干预持续完成」的机制描述。
5. 效果验证：README 提到 dashboard 有 usage/quota/savings/p95 延迟指标、有 evals、以及「5,100+ 测试文件、39,000+ 静态测试声明、AI 校验的合并流水线」，但只给了指标名称和数量，没有可照做的验证方法，因此这一项在给定材料里最弱。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

- OmniRoute 本身不在清单中。它是横跨清单里多个工具的一层「接入/路由层」，而不是某个同类工具的替代品。
- 清单中标为 adopt 的 Claude Code、OpenAI Codex，以及 watch 状态的 Cline、Cursor，正是 README 点名可由它统一接入的工具；清单中 drop 的 GitHub Copilot 也在其兼容列表里被提及。
- 清单中的 OpenCode（watch）与 README 里作为 keyless 免费后端、预置进 `auto` 的「OpenCode Free」（`oc/…`）名称相近，但原文没有说明两者是否同一项目，不能确认。
- 清单中的 Trendshift（source, watch）在原文里只作为徽章出现，无实质关系。
- 清单中没有与「统一多供应商网关 + 配额感知回退」直接对应的条目，这一层目前是空白。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

原文给出的数字（均来自项目自述，非第三方验证）：357 家供应商、1,312 个唯一 chat 模型 ID、489 条免费额度条目/35 个可复用池键、~1.62B 免费 token/月（首月含注册额度最高 ~2.22B）、150+ 免费层、19 种路由策略、RTK+Caveman 省 token 15–95%（均值 ~89%）、MCP 110 个工具、39,000+ 静态测试声明/5,100+ 测试文件、67 种语言文档、600 位贡献者；仓库元数据另给 stars 71,844。

可以当证据的部分：安装命令、端点地址、`auto` 别名表、12 条策略的含义——这些是可照做的操作性内容。README 还自己声明免费额度数字每两周重新审计且「双向变化」，并披露有 13 家供应商因条款风险被标记为 avoid，这算是它少见的自我限制说明。

只是主张、不能当结论的部分：「省 15–95%（均值 89%）token」「~1.62B 免费 token/月」「永不停止编码」「TLS stealth」等，原文没有给出测量方法、测试集或对照实验；「AI 校验发布流水线」「生产级 guardrails/evals」也只有名词。全文大量 affiliate/推荐链接和赞助位，营销色彩重，README 也自称是「The Free AI Gateway」并引导点 star。

适用条件与风险：需要自托管、把多把第三方 key 交给一个本地服务，并逐一核对各免费供应商的条款（原文自己提示 13 家为 terms-risk）；原文被截断，MCP/A2A/guardrails/evals 的配置步骤、以及 Docker/pnpm 等安装方式都不在材料内，无法据此完整落地；有合规或数据敏感要求的场景，应先看清是否有请求经过第三方免费层。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

最小试用（1–2 天，仅限非敏感、非生产任务）：

1. 按上一节步骤 1–2 装好并跑通 `curl` + `model=auto`，确认本地端点可用、无需 key 就能返回。
2. 只接一个工具（建议先接清单里已在用的 Cline 或 Claude Code），base URL 指向 `http://localhost:20128/v1`。
3. 连续一周用 `auto/coding` 做日常编码任务，同时保留一条直连原供应商的对照路径。
4. 不启用来源不明的免费供应商；先用自有 key 或已知供应商验证回退逻辑是否按预期工作。

判断有没有改善的指标（都自己测，不采信 README 的百分比）：

- 中断次数：同一批任务下，因限流/配额耗尽导致的请求失败或人工切换次数，对照直连单供应商。
- 人工干预次数：一周内你手动换模型/换 key 的次数是否下降。
- 成本与 token：相同任务集在直连与经网关两条路径下的实际 token 数与账单金额；若要验证压缩效果，必须用同一提示词做 A/B，而不是引用 15–95%。
- 延迟：自己记录 p95，别只信 dashboard 的 savings 卡片。
- 配额真实性：把 `/dashboard/free-tiers` 显示的 used/remaining 与供应商后台账单对照，看它的配额计算是否准确——这直接决定「配额感知回退」是否可信。
- 质量不下降：用你既有的评测方式（或同一组任务的人工打分）确认换模型后结果没有变差；`auto/chaos` 并行面板会成倍消耗上游调用，试用时单独计费观察。

若三周后「中断次数 / 人工切换次数」没有下降，或配额显示与实际账单明显不符，就停用并把结论降为 study。
