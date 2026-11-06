# globalmpc/backendskills

- 结论：**值得一试**。建议小范围试：按 README 装的 `npx skills add globalmpc/backendskills`（或把 dist/AGENTS.md、dist/cursor 分别接入 Codex/Cursor），挑 2–3 个后端任务做“隐藏检查”对照实验，同时对比有无技能时的 critical mistake 数和团队约定遗漏数；理由是仓库给出了可直接执行的安装方式、三条具体到规则的技能定义（鉴权作用域、幂等键、expand-contract 迁移），以及可重跑的评测脚手架，但证据目前只有作者自测（15 任务、2 个模型、每任务 5 次），且原文自己指出 Haiku 在 webhook 乱序上仍失败、payment-webhook 一栏 1/5→2/5 出现反向波动，需自行复验。
- 原文：https://github.com/globalmpc/backendskills
- 来源：github-search，初筛相关度 3，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash:1017，2026-11-06T12:56:46.989Z

## 是什么

`globalmpc/backendskills`（GitHub，32 stars，MIT）是一组给编码智能体用的**后端工程质量 skill**，目标是让 Claude Code、Codex、Cursor 在默认状态下就按资深后端工程师的方式处理鉴权、数据、金额与 schema 变更，减少“演示能跑、上线就崩”的代码。

它包含三个技能：

| Skill | 装上后 agent 的默认行为 |
| --- | --- |
| `api-endpoint` | 每个查询都按调用者作用域过滤；坏输入转 4xx；登录和高成本路由限流 |
| `data-integrity` | read-then-write 用锁或条件更新；UNIQUE 约束；任何扣费或发送类操作加幂等键 |
| `db-migration` | expand then contract；并发建索引；lock timeout；批量回填；down migration |

每个技能末尾有 **Make it yours** 段落，用来填团队自己的选择（错误格式、API 文档约定）。

## 具体做法

**前提**：你有一个后端仓库，并使用 Claude Code、或读取 `AGENTS.md` 的 agent（Codex 等）、或 Cursor。

1. **Claude Code 安装**（在项目里执行）：
   ```sh
   npx skills add globalmpc/backendskills
   ```
2. **Codex 及其他 `AGENTS.md` 类 agent**：把仓库的 `dist/AGENTS.md` 追加到项目的 `AGENTS.md`。
   前提：agent 会读取 `AGENTS.md`；追加而非覆盖，避免清掉已有约定。
3. **Cursor**：把 `dist/cursor/` 下的内容复制到项目 `.cursor/rules/`。
   前提：这是 rules 适配，不是原生 skill 机制（原文只说“copy into .cursor/rules/”，未说明两者行为是否完全等价）。
4. **填团队约定**：打开每个技能（`skills/api-endpoint/SKILL.md` 等）末尾的 **Make it yours**，写明错误格式、API 文档要求。
   前提：不填时，agent 会“跟随仓库已有做法”（README 原话：Left as "not set", the agent follows what your repo already does），所以仓库本身若有既定风格，可以跳过。
5. **按技能默认行为验收代码**，把这三条当作 review 清单逐项检查：
   - `api-endpoint`：查询是否带调用者作用域？非法输入是否返回 4xx？登录/高成本路由是否限流？
   - `data-integrity`：read-then-write 是否用锁或条件更新？是否加了 UNIQUE 约束？扣费/发送类操作是否有幂等键？
   - `db-migration`：是否 expand-then-contract？是否并发建索引并设 lock timeout？回填是否分批？是否有 down migration？
6. **复现或自建评测**：仓库 `bench/` 下有任务集、每次运行的原始记录和重跑方法；结果表由脚本生成：
   ```sh
   node bench/summarize.mjs bench/results/<date>/runs.jsonl
   ```
   前提：需要按 `bench/` 的方式产出 `runs.jsonl`。
7. **改技能后重建分发产物**：编辑 `skills/` 下的文件，然后：
   ```sh
   node scripts/build-dist.mjs
   ```
8. **技能仍失效时反馈**：开 issue，附上原始 prompt 和 agent 产生的 diff（README 的 Contributing 约定），这也是收集自己团队失败样本的入口。

## 对应的研究问题

**1. 能力发现**：仓库把一类“平时不会想到交给 agent”的工作显式化——登录限流、查询按调用者作用域过滤、金额操作的幂等键、迁移的 expand-contract/并发索引/分批回填/down migration。这些属于“agent 默认不做、但可以要求它做”的后端安全默认值。

**2. 任务匹配**：按工具分了三种接入路径（Claude Code 原生 skill、`AGENTS.md` 类 agent、Cursor rules），说明同一套规则在不同 agent 上的供给形式不同。模型层面有直接依据：同一批任务上 Sonnet 从 13/75 降到 0/75，Haiku 从 12/75 降到 2/75，且 Haiku 在乱序 webhook 事件上仍未修复——同一 skill 对不同能力模型的收益不一致。

**3. 条件供给**：供给物是“技能文件 + 团队约定”。原文明确 Make it yours 用来补错误格式与 API 文档两项；未设置时回落到仓库既有约定，即供给可以很轻。另外要发挥效果，还需自备“隐藏检查”这类验证条件（见第 5 条）。

**4. 主动推进**：原文没有给出时间/事件/状态触发的机制，技能是随任务上下文被动生效的。唯一接近的是 `bench/` 的可重跑评测流程，但那是人工触发。此问题无充分依据。

**5. 效果验证**：这是原文最可借鉴的部分——设计了 agent 看不到的隐藏检查（20 个买家抢 5 件库存、用户读取他人订单、旧版本应用对新 schema 滚动部署），按任务统计“有 critical mistake 的运行次数 / 总运行次数”，并区分“是否遗漏团队约定（down migration、API 文档）”，同时保留每次运行的原始记录与重跑脚本。

## 与已有做法的关系

- **Claude Code（清单状态 adopt）**：README 的首选路径就是 `npx skills add globalmpc/backendskills`，属于原生 skill 分发方式，可直接挂到已采用的工具上。
- **Cursor（清单状态 watch）**：这里通过把 `dist/cursor/` 复制到 `.cursor/rules/` 适配，不是同一套 skill 机制，效果是否等价原文未说明，与清单里“watch”的判断一致。
- **Agent skills（清单状态 adopt）**：backendskills 是该概念在“后端安全默认值”上的一个具体实例，可作为写自有技能的模板——技能文件 + Make it yours 定制段 + `scripts/build-dist.mjs` 多端分发 + `bench/` 对照评测，这四件套比技能内容本身更可复用。
- 清单中没有关于“后端代码质量约束”或“隐藏检查评测法”的其它条目。

## 证据与局限

**原文给出的数据**：
- 15 个后端任务，Sonnet 5.5 与 Haiku 5.5 各跑 5 次/任务；
- critical mistake：无技能 25/150，有技能 2/150（Haiku 12/75 → 2/75，Sonnet 13/75 → 0/75，与 25/150、2/150 相加一致）；
- 遗漏团队约定（down migration、API 文档）：30 → 4；
- 分任务看，改善集中在 `login-rate-limit`（两模型均 5/5 → 0/5）和 `rename-column`（两模型均 5/5 → 0/5）；大量任务本来就是 0/5 → 0/5，对总量贡献为零；
- 原文自陈未修复项：Haiku 在乱序 webhook 事件上仍出错；`payment-webhook` 一栏 Haiku 出现 1/5 → 2/5 的反向波动。

**属于作者主张而非独立验证的**：标题与 gif 的“像资深工程师一样写后端代码”“password guessing is blocked”等表述；25 → 2 的对比来自作者自建任务与自建隐藏检查，无第三方复现；仓库仅 32 stars。

**适用条件与局限**：
- 任务集偏电商/支付域（checkout、order、refund、transfer、wallet-adjustments、product-*），且集中在鉴权、并发、迁移三类风险，其它类型后端工作（如批处理、搜索、缓存一致性）未覆盖；
- 每任务仅 5 次运行，样本小，单格 1→2 这类波动不足以判断方向；
- README 未说明评测所用语言/框架/数据库，迁移类建议能否迁移到你的技术栈未知；
- “critical mistake”的定义来自作者写的隐藏检查，换一套检查口径结论可能变化；
- 部分任务基线已是 0/5，说明技能并非对所有任务都有增量，收益高度依赖任务是否踩在这些风险点上。

## 怎么试、怎么验证

**最小试用（半天量级，思路沿用原文的对照法）**：
1. 在你自己的仓库里选 3 个任务，尽量踩中三类风险：①一个登录/高成本接口（是否限流）；②一个按 id 读取资源的接口（是否按调用者作用域过滤）；③一次列重命名迁移（是否 expand-contract、是否带 down migration）。
2. 为每个任务写一份 **agent 看不到的隐藏检查**：如并发下单是否超卖、A 用户能否读到 B 用户的订单、旧版本应用在新 schema 下是否报错。检查放在 agent 上下文之外，只在跑完后执行。
3. 同一 prompt 各跑 5 次：一次不装技能（基线），一次按上面步骤 1–4 装好技能并填完 Make it yours。
4. 逐次记录：是否触发 critical mistake、是否漏 down migration/API 文档。聚合方式可套用原文脚本格式（`runs.jsonl` + `node bench/summarize.mjs`）。
5. 若团队有既有代码规范，把错误格式与 API 文档要求填进 Make it yours 再跑一轮，看遗漏数是否下降。

**判断有无改善的指标**：
- 主指标：critical mistake 的运行占比（有技能 vs 无技能），按任务分别看，不要只看总和——原文里多数任务基线为 0，总和会掩盖差异；
- 次指标：团队约定遗漏数（down migration、API 文档覆盖率）；
- 成本侧：达到同一结果的对话轮数、token 或耗时，以及人工 review 提出的问题数、提交后回滚/返工次数；
- 反向信号：出现像 `payment-webhook` 那样的负向变化，或 agent 为满足规则写出过度复杂代码（如无条件加锁）时，记录并回退对应技能条款；
- 判定：若 3 个任务上 critical mistake 至少减半、且约定遗漏下降、成本无明显恶化，则纳入手册并考虑扩到更多任务；若仅在部分任务上有效，则按任务类型裁剪技能，只保留 `login-rate-limit`、`rename-column` 这类已被原文证明有增量的部分。
