# UditAkhourii/quicksilver

- 结论：**值得一试**。建议小范围试：按 README 给出的命令把 Quicksilver 装进 Claude Code，让它把「读很多、只判断一点」的批量筛选/分类交给 Jev，Claude 只处理被标 `?` 的边界项；理由是安装与使用步骤可直接照做、12 项可复现基准显示中位省 82% token，但部分任务准确率明显下降且依赖第三方 API，需自己用少量标注核对后才敢扩大使用。
- 原文：https://github.com/UditAkhourii/quicksilver
- 来源：github-search，初筛相关度 2，依据仓库 README
- 调研：自动，模型 deepseek-v4.1-flash，2026-10-01T05:26:02.728Z

## 是什么

Quicksilver 是一个 Claude Code 的 skill（也可作为插件安装），把「读大量内容只为做一个判断」的工作外包给 Jev（TypeSafe 的 System One 模型）。Jev 返回带类型的判定（yes/no、标签、分数），Claude 只拿回一个 shortlist，把上下文和 token 留给真正需要推理的部分。

README 的定位句是 "Stop paying Claude to skim."，举例场景：187 个文件里哪几个处理 auth、3000 行日志里哪些是真失败、200 张工单里哪些是退款请求。典型链路是：

```
you ─▶ Claude ──"which files handle auth?"──▶ quicksilver ──▶ Jev (187 files, parallel)
                                                   │
       Claude ◀──── 4 file paths + confidence ─────┘       ~2.4k tokens instead of ~26k
```

项目为独立开源项目（MIT，91 stars），README 明确声明与 Anthropic、TypeSafe AI 均无隶属关系。

## 具体做法（编号步骤；可直接复制的命令、配置、提示词原样放进代码块；写清每步的前提）

1. **准备前提**：Claude Code 已安装；Node 18+；到 `console.typesafe.ai` 申请一个 Jev key。内容会被发送到 TypeSafe 的 API（`api.typesafe.ai`），所以不要拿它去处理不能给第三方的数据。

2. **交互式安装**（会复制 skill 到 `~/.claude/skills/quicksilver`，并只问一次 Jev key）：

```bash
npx github:UditAkhourii/quicksilver
```

装完**重启 Claude Code**。之后 Claude 在任务看起来像「读很多来判断一点」时会自行调用这个 skill。

3. **非交互安装**（CI、dotfiles 场景），或用环境变量传 key（`JEV_API_KEY` 或 `TYPESAFE_API_KEY`）：

```bash
# pass the key non-interactively (CI, dotfiles)
npx github:UditAkhourii/quicksilver install --key YOUR_JEV_KEY
```

4. **作为 Claude Code 插件安装**（替代方式）：

```bash
/plugin marketplace add UditAkhourii/quicksilver
/plugin install quicksilver@quicksilver
```

5. **从克隆安装**：

```bash
git clone https://github.com/UditAkhourii/quicksilver && cd quicksilver && ./install.sh   # or .\install.ps1
```

6. **在会话里直接下指令**（六类命令，按任务形态选）：

```bash
qs filter   "Does this file handle user sessions?" src           # which files matter
qs filter   "Does this line report a failure?" app.log --lines    # log triage, repeats collapsed
qs classify --labels "bug,feature,question" --items issues.jsonl # bulk routing
qs rank     "where do we issue refunds?" src --top 5              # relevance ranking
qs find     "the retry backoff logic" huge_module.py              # locate lines in huge files
qs ask      "Does this contract allow termination without notice?" --state @contract.txt
qs status                                                          # key check + lifetime tokens saved
```

7. **大扫描时加 `--fast`**：把条目打包处理，在「明显是针」的场景下约快 10 倍（README 原文：`Add --fast to pack items and go about 10× faster on obvious needles.`）。

8. **按 skill 的要求改写提问方式**（这部分是免费的提示工程收益）：一次只问**一个窄的、带类型的判断**——一个 yes/no 条件、一组封闭标签，或一个评分标准；写清确切的边界情况；给一个兜底标签；不做算术、不涉及日期。把问题变成一个可复用、可测试的单元，而不是一种「感觉」。

9. **读回执判断这次调用值不值**：每次运行结束都会打印回执，格式如下：

```
— 3000 scanned · 6 matched · 0 borderline · 64.2s · jev 1.0M tok ($0.0436) · ~56k Claude tokens not read
```

10. **安全边界（由工具自身执行，但要知道它做了什么）**：不会发送 `.env*`、私钥、证书、凭据文件；遵守 `.gitignore`；跳过二进制文件和大于 2 MB 的文件。key 保存在 `~/.quicksilver/config.json`（仅用户权限）。删除 key：

```bash
npx github:UditAkhourii/quicksilver setup --remove
```

11. **明确不要用它做的事**：写作、编辑、多步推理，以及任何 `grep` 能精确回答的问题。

## 对应的研究问题（对照上面五个问题逐条说明，只写有依据的）

**1. 能力发现——AI 已经能做哪些还没想到交给它的工作**

README 把一类被普遍忽略的工作显式命名出来：**skim（略读以决定是否重要）**。典型例子包括「187 个文件里哪几个处理 auth」「3000 行日志里哪些是真失败」「200 张工单里哪些是退款请求」。这类工作的特征是「读很多、判断很少」，平时默认交给主模型硬读，成本高且污染上下文。基准第 6 项就是这个场景（Hono 代码库 187 个文件做 codebase discovery，F1 100%）。

**2. 任务匹配——什么工作适合怎样的模型、工具和协作方式**

- 适合交给 Jev（小模型、批量判定）：在大输入里找针（3000 行日志找真实失败、187 个文件里找 4 个 auth 文件、17k 行文件里找对函数），README 称这三类都到了 100% 且省 91–95% token；标签清晰的批量路由（支持意图、CI 失败原因、情感），准确率 96–100%，比 Claude 逐条读快约 10–15 倍；代码库里的「X 在哪」检索（top-3 命中 10/10，省 91% token）。
- 适合「当 shortlist 用，由 Claude 复查」：长得像的代码（安全审查里所有有漏洞的文件都抓到了，但也把安全的孪生文件标了出来，p≈0.5–0.65，这些正是被标 `?` 交给 Claude 的项）；主观或团队风格类标签（commit 类型 `perf` vs `refactor`，Quicksilver 76% vs Claude 83%）；编码了「没写下来的政策」的标签（BGL 超算日志的 alert 标签把很多 FATAL 行标成正常，Claude 单独只有 54% F1，Quicksilver 只有 23%）。
- 不适合：写作、编辑、多步推理、`grep` 能精确回答的问题。超大扫描（几千次 Jev 调用）墙钟时间和 Claude 差不多——那里赢的是 token 和上下文，不是速度。

**3. 条件供给——需要提供哪些信息、工具、权限和反馈**

- 需要：Claude Code、Node 18+、一个 Jev API key（一次性配置进 `~/.quicksilver/config.json`）、待扫描的输入（目录、日志文件、`.jsonl` 条目、`@file` 状态文件）。
- 工具/权限：skill 需要能把内容发到 `api.typesafe.ai`；内置的排除规则（`.env*`、私钥、证书、凭据、`.gitignore` 命中项、二进制、>2 MB）是不可绕过的边界。
- 需要人给的信息质量：一个窄的、带类型的判断条件 + 明确边界 + 兜底标签。这是决定成败的输入。
- 反馈回路：每个 borderline 项被标 `?` 交回 Claude 复核；每次运行末尾的回执给出扫描数、命中数、borderline 数、耗时、Jev token 与成本，以及「约多少 Claude token 没被读」。`qs status` 可看 key 状态和累计节省的 token。

**4. 主动推进——哪些工作可由时间、事件或状态触发并持续完成**

README 描述的是 **Claude 在任务形态匹配时自动调用该 skill**（"Claude uses the skill on its own whenever a task looks like 'read a lot to decide a little'"），即由任务形态/状态触发，而不是人工记得手动去调。原文没有提供基于时间或事件的定时/持续运行机制。

**5. 效果验证——怎样判断确实改善了结果**

README 给出的验证方式是双轨的，可作为方法参考：

- **离线基准**：12 个编码 agent 真会碰到的任务，其中 8 个用真实公开数据（一台超算的日志、Banking77、UCI SMS Spam、SST-2、Hono 代码库及其 git 历史、lodash）。每个任务分别由「按常规方式工作的 Claude Code subagent（Read/Grep/Glob）」和「Claude + Quicksilver」完成，两者都对照**隐藏的 ground truth** 打分。指标是 F1 / accuracy / hit@k。
- **在线回执**：每次运行输出 token 未读数、耗时和 Jev 成本；`qs status` 累积统计。Claude 侧 token 已扣除用对照任务测出的固定 subagent 开销，并把 Quicksilver 每次任务加载 SKILL.md、每条命令、Claude 读回的每个字节都计入成本。基准可复现（`bench/`）。

## 与已有做法的关系（对照给出的清单条目；没有就写“清单中没有相关条目”）

清单中相关条目：**Claude Code（tool，status: adopt）**。Quicksilver 不是替代 Claude Code，而是叠在它之上的一层：把「略读式批量判断」从 Claude 的上下文里剥离出来。README 的 FAQ 直接回答了边界（"Does this replace Claude?" — No. Jev can't write, reason, or edit.）。因此它的定位是在已 adopt 的 Claude Code 工作流里做成本优化和上下文优化，而不是新增一个独立工具链。

清单中没有专门对应「用小模型做批量 typed 判定」的条目。

## 证据与局限（原文给了哪些数据或案例，哪些只是作者主张，适用条件是什么）

**给出的数据（作者称是实测，且可复现，仓库内有 `bench/`）**

12 任务基准的关键读数：

| 任务 | 指标 | Claude 单独 | + Quicksilver | Claude token | 节约 | 耗时 | Jev 成本 |
|---|---|---|---|---|---|---|---|
| 1 真实日志 triage（BGL，2k 行） | F1 | 54% | 23% | 84.4k → 12.5k | −85% | 105s → 44s | $0.033 |
| 2 噪声服务日志找针（3k 行） | F1 | 100% | 100% | 53.5k → 2.5k | −95% | 56s → 64s | $0.044 |
| 3 工单路由（Banking77，8 意图） | acc | 100% | 99% | 15.0k → 2.7k | −82% | 60s → 6s | $0.003 |
| 4 垃圾短信（UCI SMS） | F1 | 97% | 92% | 20.4k → 4.3k | −79% | 61s → 8s | $0.004 |
| 5 评论情感（SST-2） | acc | 97% | 96% | 19.5k → 3.0k | −85% | 85s → 6s | $0.003 |
| 6 代码库发现（Hono，187 文件） | F1 | 100% | 100% | 26.4k → 2.4k | −91% | 43s → 6s | $0.013 |
| 7 安全审查 shortlist（40 文件） | F1 | 100% | 89% | 9.5k → 2.5k | −74% | 48s → 3s | $0.001 |
| 8 CI 失败 triage（80 日志） | acc | 100% | 100% | 9.1k → 2.5k | −72% | 30s → 3s | $0.002 |
| 9 lodash.js 语义检索（17k 行） | hit@5 | 100% | 100% | 9.0k → 4.1k | −55% | 39s → 39s | $0.213 |
| 10 仓库内「X 在哪」排序 | hit@3 | 100% | 100% | 39.4k → 3.4k | −91% | 60s → 56s | $0.134 |
| 11 commit 分类（181 个真实 commit） | acc | 83% | 76% | 17.5k → 3.2k | −82% | 106s → 5s | $0.003 |
| 12 数值阈值压力测试 | F1 | 100% | 100% | 10.2k → 2.4k | −76% | 19s → 6s | $0.003 |

（粗体在原文中表示「与 Claude 单独相差 2 个百分点以内」；上表照抄原文数值。）

作者的汇总主张：批量判断类工作省 **86%** token（中位 82%）；在 12 个真实任务中有 **8 个**准确率与 Claude 持平；快最多 **20×**；每任务 Jev 成本中位 **$0.004**；12 任务基准总共花掉 **$0.45** 的 Jev。Jev 定价为 **$0.042 / 百万输入 token，输出免费**。

**哪些只是作者主张**

- 上述数字全部来自项目自己的 README 与自建基准。原文称「measured, not estimated」且可复现（`bench/`），但本次材料未包含 `bench/` 的实现、样本划分或 ground truth 构造细节，无法独立核验。
- 「TypeSafe states that Jev is not trained on customer data」是转述第三方声明，非本材料可验证的事实。
- 「Claude 会自动调用该 skill」是行为描述，取决于 Claude Code 的 skill 机制，本材料未给出触发条件的精确定义。

**明确的失败与适用条件**

- 任务 1（BGL 日志）：Claude 单独只有 54% F1，Quicksilver 只有 23%——**比不用更差**。原因是标签编码了没写下来的政策（把很多 FATAL 行标为正常）。
- 任务 11（commit 分类）：76% vs Claude 83%——主观/团队风格标签是弱项。
- 任务 7（安全审查）：89% vs 100%——会多标安全的孪生文件，需要 Claude 复核 `?` 项。
- 任务 2 和 9 墙钟时间没有变快（56s→64s、39s→39s），说明不是所有场景都快。
- 超大扫描（几千次 Jev 调用）墙钟时间与 Claude 相当，收益仅在 token 和上下文。

**其他局限**

- 依赖第三方 API 与 key，数据出域（内容发送至 `api.typesafe.ai`），适用条件受合规约束。
- 项目仅 91 stars，为独立项目、非官方，长期维护性未知。

## 怎么试、怎么验证（最小试用方式和判断有没有改善的指标）

**最小试用方式（不改变现有工作流，只做一次 A/B）**

1. 按上面第 2 步安装（`npx github:UditAkhourii/quicksilver`），配好 key，重启 Claude Code。先跑 `qs status` 确认 key 有效。
2. 选**一个**任务，最好满足 README 的强项条件：输入大、标签封闭清晰。建议从「CI 失败 triage（80 条日志）」或「代码库发现（某目录里哪些文件处理 X）」入手，避开 commit 类型、情感等主观/风格类标签，也避开你自己都说不清标签规则的数据（BGL 那种坑）。
3. 从数据里**人工标注 30–50 条**作为对照集（自己先不看两边结果，避免污染）。
4. 跑两次：一次让 Claude 按平常方式做（Read/Grep/Glob），一次让 Claude 用 Quicksilver（`qs filter` / `qs classify` / `qs find`）。
5. 记录每次的回执行（扫描数、命中数、borderline 数、耗时、Jev token 与成本、未读的 Claude token）。
6. 只有当你愿意逐条复核 `?` 项时，才把这个 skill 留在日常流程里。

**判断有没有改善的指标**

| 指标 | 怎么取 | 通过线（建议） |
|---|---|---|
| 准确率（F1 / accuracy / hit@k） | 用第 3 步的标注集对比两次结果 | 与 Claude 单独相差不超过几个百分点；**若低于基线就停用**（任务 1 式失败） |
| Claude token 消耗 | 回执里的 `~Nk Claude tokens not read` + 会话实际用量 | README 的中位是 −82%，你的任务至少应看到 −50% 才值当 |
| 墙钟时间 | 两次运行的耗时 | 不强求变快——README 中有的任务反而变慢 |
| Jev 成本 | 回执里的 `($0.xxxx)` | 按 $0.042/M 输入 token 估，对照它替你省下的主模型 token 成本 |
| 人工复核负担 | `?` borderline 项数量 | 应该远小于你自己读完整个输入的成本；否则退回 Claude 单独做更划算 |
| 安全性 | 确认扫描范围内没有 `.env*`、凭据、私钥；确认数据可以发给第三方 | 不满足就不部署 |

**放大或放弃的判据**：如果在一个标签清晰的批量任务上同时满足「省 token ≥50%」且「准确率与基线相差在几个百分点内」，就把对应的 `qs filter` / `qs classify` 命令固化成该任务的常规做法（这也顺带把你的问题改写成可复用、可测试的 typed judgment）；如果在主观标签或在编码了隐性政策的数据上出现明显掉分，就退回 Claude 单独处理，或只把 Quicksilver 当 shortlist 用。
